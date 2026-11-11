package httpapi

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/fampep/anikitty/apps/dedicated-server/internal/security"
)

type commentBody struct {
	AnilistID int64  `json:"anilistId"`
	Episode   *int64 `json:"episode"`
	Body      string `json:"body"`
}

type profileBody struct {
	DisplayName string `json:"displayName"`
}

type favoriteBody struct {
	AnilistID     int64   `json:"anilistId"`
	Title         string  `json:"title"`
	CoverImageURL *string `json:"coverImageUrl"`
}

func (s *Server) handleMeGet(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	name, _ := s.Auth.DisplayName(r.Context(), claims.UserID)
	var favCount, commentCount int
	_ = s.DB.QueryRowContext(r.Context(), `SELECT COUNT(1) FROM favorites WHERE user_id = ?`, claims.UserID).Scan(&favCount)
	_ = s.DB.QueryRowContext(r.Context(), `SELECT COUNT(1) FROM comments WHERE user_id = ?`, claims.UserID).Scan(&commentCount)
	writeJSON(w, http.StatusOK, map[string]any{
		"userId":       claims.UserID,
		"username":     claims.Username,
		"displayName":  name,
		"favorites":    favCount,
		"comments":     commentCount,
	})
}

func (s *Server) handleMePatch(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	var body profileBody
	if err := readJSON(r, &body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := s.Auth.SetDisplayName(r.Context(), claims.UserID, body.DisplayName); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	name, _ := s.Auth.DisplayName(r.Context(), claims.UserID)
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":          true,
		"userId":      claims.UserID,
		"displayName": name,
	})
}

func (s *Server) handleCommentsGet(w http.ResponseWriter, r *http.Request) {
	anilistID, err := strconv.ParseInt(r.URL.Query().Get("anilistId"), 10, 64)
	if err != nil || anilistID <= 0 {
		writeErr(w, http.StatusBadRequest, "anilistId required")
		return
	}
	ep := strings.TrimSpace(r.URL.Query().Get("episode"))
	var rows *sql.Rows
	if ep == "" {
		rows, err = s.DB.QueryContext(r.Context(), `
SELECT c.id, c.user_id, COALESCE(u.display_name, ''), c.anilist_id, c.episode, c.body, c.created_at, c.updated_at
FROM comments c
LEFT JOIN users u ON u.id = c.user_id
WHERE c.anilist_id = ?
ORDER BY c.created_at DESC
LIMIT 100`, anilistID)
	} else {
		epNum, e2 := strconv.ParseInt(ep, 10, 64)
		if e2 != nil {
			writeErr(w, http.StatusBadRequest, "invalid episode")
			return
		}
		rows, err = s.DB.QueryContext(r.Context(), `
SELECT c.id, c.user_id, COALESCE(u.display_name, ''), c.anilist_id, c.episode, c.body, c.created_at, c.updated_at
FROM comments c
LEFT JOIN users u ON u.id = c.user_id
WHERE c.anilist_id = ? AND (c.episode = ? OR c.episode IS NULL)
ORDER BY c.created_at DESC
LIMIT 100`, anilistID, epNum)
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	items := make([]map[string]any, 0)
	for rows.Next() {
		var id, userID, displayName, body string
		var aid, created, updated int64
		var episode sql.NullInt64
		if err := rows.Scan(&id, &userID, &displayName, &aid, &episode, &body, &created, &updated); err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
		item := map[string]any{
			"id":               id,
			"userId":           userID,
			"displayName":      publicLabel(displayName, userID),
			"anilistId":        aid,
			"body":             body,
			"createdAtEpochMs": created,
			"updatedAtEpochMs": updated,
		}
		if episode.Valid {
			item["episode"] = episode.Int64
		}
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) handleCommentsPost(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	var body commentBody
	if err := readJSON(r, &body); err != nil || body.AnilistID <= 0 {
		writeErr(w, http.StatusBadRequest, "invalid comment")
		return
	}
	text := strings.TrimSpace(body.Body)
	if utf8.RuneCountInString(text) < 2 || utf8.RuneCountInString(text) > 500 {
		writeErr(w, http.StatusBadRequest, "comment must be 2–500 characters")
		return
	}
	if body.Episode != nil && *body.Episode <= 0 {
		writeErr(w, http.StatusBadRequest, "invalid episode")
		return
	}
	id, err := security.NewSessionID()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "id error")
		return
	}
	now := time.Now().UnixMilli()
	_, err = s.DB.ExecContext(r.Context(), `
INSERT INTO comments (id, user_id, anilist_id, episode, body, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)`, id, claims.UserID, body.AnilistID, body.Episode, text, now, now)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	name, _ := s.Auth.DisplayName(r.Context(), claims.UserID)
	item := map[string]any{
		"id":               id,
		"userId":           claims.UserID,
		"displayName":      publicLabel(name, claims.UserID),
		"anilistId":        body.AnilistID,
		"body":             text,
		"createdAtEpochMs": now,
		"updatedAtEpochMs": now,
	}
	if body.Episode != nil {
		item["episode"] = *body.Episode
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true, "item": item})
}

func (s *Server) handleCommentsDelete(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	id := r.PathValue("id")
	res, err := s.DB.ExecContext(r.Context(), `
DELETE FROM comments WHERE id = ? AND user_id = ?`, id, claims.UserID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeErr(w, http.StatusNotFound, "comment not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleFavoritesGet(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	rows, err := s.DB.QueryContext(r.Context(), `
SELECT anilist_id, title, cover_image_url, created_at
FROM favorites WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`, claims.UserID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	items := make([]map[string]any, 0)
	for rows.Next() {
		var aid, created int64
		var title string
		var cover sql.NullString
		if err := rows.Scan(&aid, &title, &cover, &created); err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
		item := map[string]any{
			"anilistId":        aid,
			"title":            title,
			"createdAtEpochMs": created,
		}
		if cover.Valid {
			item["coverImageUrl"] = cover.String
		}
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) handleFavoritesPut(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	var body favoriteBody
	if err := readJSON(r, &body); err != nil || body.AnilistID <= 0 || strings.TrimSpace(body.Title) == "" {
		writeErr(w, http.StatusBadRequest, "invalid favorite")
		return
	}
	now := time.Now().UnixMilli()
	_, err := s.DB.ExecContext(r.Context(), `
INSERT INTO favorites (user_id, anilist_id, title, cover_image_url, created_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(user_id, anilist_id) DO UPDATE SET
  title = excluded.title,
  cover_image_url = COALESCE(excluded.cover_image_url, favorites.cover_image_url)`,
		claims.UserID, body.AnilistID, strings.TrimSpace(body.Title), body.CoverImageURL, now)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleFavoritesDelete(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	id := r.PathValue("anilistId")
	_, err := s.DB.ExecContext(r.Context(), `
DELETE FROM favorites WHERE user_id = ? AND anilist_id = ?`, claims.UserID, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func publicLabel(displayName, userID string) string {
	if strings.TrimSpace(displayName) != "" {
		return strings.TrimSpace(displayName)
	}
	if len(userID) >= 6 {
		return "kitty-" + userID[len(userID)-6:]
	}
	return "kitty"
}
