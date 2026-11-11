package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/fampep/anikitty/apps/dedicated-server/internal/auth"
	"github.com/fampep/anikitty/apps/dedicated-server/internal/security"
	"golang.org/x/time/rate"
)

type Server struct {
	Auth   *auth.Store
	DB     *sql.DB
	mux    *http.ServeMux
	limiters sync.Map // ip -> *rate.Limiter
}

func New(store *auth.Store, db *sql.DB) *Server {
	s := &Server{Auth: store, DB: db, mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Cache-Control", "no-store")
		// Dedicated APK API only — no scrape/stream routes on this host.
		s.mux.ServeHTTP(w, r)
	})
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /health", s.handleHealth)
	s.mux.HandleFunc("POST /api/v1/auth/signup", s.limit(s.handleSignup))
	s.mux.HandleFunc("POST /api/v1/auth/login", s.limit(s.handleLogin))
	s.mux.HandleFunc("POST /api/v1/auth/logout", s.auth(s.handleLogout))
	s.mux.HandleFunc("GET /api/v1/auth/me", s.auth(s.handleMe))
	s.mux.HandleFunc("GET /api/v1/history", s.auth(s.handleHistoryGet))
	s.mux.HandleFunc("PUT /api/v1/history", s.auth(s.handleHistoryPut))
	s.mux.HandleFunc("DELETE /api/v1/history/{anilistId}", s.auth(s.handleHistoryDelete))
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"service": "anikitty-dedicated",
		"mode":    "auth-only",
		"note":    "Streaming/scraping runs on the Android client, not this server.",
	})
}

type credBody struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (s *Server) handleSignup(w http.ResponseWriter, r *http.Request) {
	var body credBody
	if err := readJSON(r, &body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, token, _, err := s.Auth.Signup(r.Context(), body.Username, body.Password)
	if err != nil {
		mapAuthErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"token":    token,
		"userId":   user.ID,
		"username": user.Username,
	})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var body credBody
	if err := readJSON(r, &body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, token, _, err := s.Auth.Login(r.Context(), body.Username, body.Password, r.UserAgent(), clientIP(r))
	if err != nil {
		// Constant-ish delay on failure to slow stuffing.
		time.Sleep(200 * time.Millisecond)
		mapAuthErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"token":    token,
		"userId":   user.ID,
		"username": user.Username,
	})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	_ = s.Auth.Logout(r.Context(), claims.SessionID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{
		"userId":   claims.UserID,
		"username": claims.Username,
	})
}

func (s *Server) handleHistoryGet(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	rows, err := s.DB.QueryContext(r.Context(), `
SELECT anilist_id, title, cover_image_url, episode, position_ms, duration_ms, updated_at
FROM watch_history WHERE user_id = ? ORDER BY updated_at DESC`, claims.UserID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	items := make([]map[string]any, 0)
	for rows.Next() {
		var anilistID, episode, pos, dur, updated int64
		var title string
		var cover sql.NullString
		if err := rows.Scan(&anilistID, &title, &cover, &episode, &pos, &dur, &updated); err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
		item := map[string]any{
			"anilistId":         anilistID,
			"title":             title,
			"episode":           episode,
			"positionMs":        pos,
			"durationMs":        dur,
			"updatedAtEpochMs":  updated,
		}
		if cover.Valid {
			item["coverImageUrl"] = cover.String
		}
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type historyBody struct {
	AnilistID        int64   `json:"anilistId"`
	Title            string  `json:"title"`
	CoverImageURL    *string `json:"coverImageUrl"`
	Episode          int64   `json:"episode"`
	PositionMs       int64   `json:"positionMs"`
	DurationMs       int64   `json:"durationMs"`
	UpdatedAtEpochMs int64   `json:"updatedAtEpochMs"`
}

func (s *Server) handleHistoryPut(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	var body historyBody
	if err := readJSON(r, &body); err != nil || body.AnilistID <= 0 || strings.TrimSpace(body.Title) == "" {
		writeErr(w, http.StatusBadRequest, "invalid history payload")
		return
	}
	if body.UpdatedAtEpochMs <= 0 {
		body.UpdatedAtEpochMs = time.Now().UnixMilli()
	}
	_, err := s.DB.ExecContext(r.Context(), `
INSERT INTO watch_history (user_id, anilist_id, title, cover_image_url, episode, position_ms, duration_ms, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(user_id, anilist_id) DO UPDATE SET
  title = excluded.title,
  cover_image_url = COALESCE(excluded.cover_image_url, watch_history.cover_image_url),
  episode = excluded.episode,
  position_ms = excluded.position_ms,
  duration_ms = excluded.duration_ms,
  updated_at = excluded.updated_at
`, claims.UserID, body.AnilistID, body.Title, body.CoverImageURL, body.Episode, body.PositionMs, body.DurationMs, body.UpdatedAtEpochMs)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleHistoryDelete(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	id := r.PathValue("anilistId")
	_, err := s.DB.ExecContext(r.Context(), `DELETE FROM watch_history WHERE user_id = ? AND anilist_id = ?`, claims.UserID, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type ctxKey int

const claimsKey ctxKey = 1

func claimsFrom(ctx context.Context) *security.Claims {
	return ctx.Value(claimsKey).(*security.Claims)
}

func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			writeErr(w, http.StatusUnauthorized, "missing bearer token")
			return
		}
		claims, err := security.ParseAccessToken(strings.TrimSpace(strings.TrimPrefix(h, "Bearer ")))
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "invalid token")
			return
		}
		if err := s.Auth.ValidateSession(r.Context(), claims); err != nil {
			writeErr(w, http.StatusUnauthorized, "session revoked or expired")
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next(w, r.WithContext(ctx))
	}
}

func (s *Server) limit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)
		v, _ := s.limiters.LoadOrStore(ip, rate.NewLimiter(rate.Every(3*time.Second), 5))
		if !v.(*rate.Limiter).Allow() {
			writeErr(w, http.StatusTooManyRequests, "too many requests")
			return
		}
		next(w, r)
	}
}

func mapAuthErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, auth.ErrInvalidCredentials):
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
	case errors.Is(err, auth.ErrUsernameTaken):
		writeErr(w, http.StatusConflict, "username taken")
	case errors.Is(err, auth.ErrBanned):
		writeErr(w, http.StatusForbidden, "account banned")
	case errors.Is(err, auth.ErrWeakPassword):
		writeErr(w, http.StatusBadRequest, "password must be at least 10 characters")
	case errors.Is(err, auth.ErrBadUsername):
		writeErr(w, http.StatusBadRequest, "username must be 3-32 chars [a-zA-Z0-9_]")
	default:
		writeErr(w, http.StatusInternalServerError, "server error")
	}
}

// clientIP uses the TCP peer only. Do not trust X-Forwarded-For here — clients
// can spoof it and blow out the limiter map. Put a reverse proxy in front if
// you need real client IPs behind NAT.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func readJSON(r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]any{"error": msg})
}
