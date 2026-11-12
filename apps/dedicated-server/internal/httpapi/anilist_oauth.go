package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const anilistTokenURL = "https://anilist.co/api/v2/oauth/token"

// handleAniListCallback receives AniList's authorization code on the VPS,
// exchanges it with the client secret, and sends the phone back to the app.
func (s *Server) handleAniListCallback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	state := q.Get("state")
	if errName := strings.TrimSpace(q.Get("error")); errName != "" {
		desc := strings.TrimSpace(q.Get("error_description"))
		if desc == "" {
			desc = errName
		}
		redirectAniListApp(w, r, "", state, desc)
		return
	}
	code := strings.TrimSpace(q.Get("code"))
	if code == "" {
		redirectAniListApp(w, r, "", state, "AniList did not finish sign-in")
		return
	}
	token, err := exchangeAniListCode(r.Context(), code)
	if err != nil {
		redirectAniListApp(w, r, "", state, err.Error())
		return
	}
	redirectAniListApp(w, r, token, state, "")
}

func redirectAniListApp(w http.ResponseWriter, r *http.Request, token, state, errMsg string) {
	frag := url.Values{}
	if token != "" {
		frag.Set("access_token", token)
		frag.Set("token_type", "Bearer")
	}
	if state != "" {
		frag.Set("state", state)
	}
	if errMsg != "" {
		frag.Set("error", "anilist")
		frag.Set("error_description", errMsg)
	}
	dest := url.URL{Scheme: "anikitty", Host: "anilist", Fragment: frag.Encode()}
	http.Redirect(w, r, dest.String(), http.StatusFound)
}

func exchangeAniListCode(ctx context.Context, code string) (string, error) {
	clientID := strings.TrimSpace(os.Getenv("ANILIST_CLIENT_ID"))
	if clientID == "" {
		clientID = "56768"
	}
	secret := strings.TrimSpace(os.Getenv("ANILIST_CLIENT_SECRET"))
	if secret == "" {
		return "", errAniList("AniList is not configured on the server")
	}
	redirectURI := strings.TrimSpace(os.Getenv("ANILIST_REDIRECT_URI"))
	if redirectURI == "" {
		redirectURI = "http://198.50.123.153:8788/api/v1/anilist/callback"
	}
	payload, err := json.Marshal(map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     clientID,
		"client_secret": secret,
		"redirect_uri":  redirectURI,
		"code":          code,
	})
	if err != nil {
		return "", errAniList("AniList sign-in failed")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, anilistTokenURL, bytes.NewReader(payload))
	if err != nil {
		return "", errAniList("AniList sign-in failed")
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", errAniList("AniList sign-in failed")
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var parsed struct {
		AccessToken string `json:"access_token"`
		Message     string `json:"message"`
		Hint        string `json:"hint"`
		Error       string `json:"error"`
	}
	_ = json.Unmarshal(body, &parsed)
	if resp.StatusCode != http.StatusOK || parsed.AccessToken == "" {
		msg := parsed.Message
		if msg == "" {
			msg = parsed.Hint
		}
		if msg == "" {
			msg = parsed.Error
		}
		if msg == "" {
			msg = "AniList sign-in failed"
		}
		return "", errAniList(msg)
	}
	return parsed.AccessToken, nil
}

type anilistErr string

func (e anilistErr) Error() string { return string(e) }

func errAniList(msg string) error { return anilistErr(msg) }
