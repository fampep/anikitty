package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/fampep/anikitty/apps/dedicated-server/internal/security"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrPasswordTaken      = errors.New("password already in use")
	ErrBanned             = errors.New("account banned")
	ErrWeakPassword       = errors.New("password too weak")
)

type User struct {
	ID           string
	Username     string // internal label only (not chosen by user)
	PasswordHash string
	Banned       bool
}

type Store struct {
	DB *sql.DB
}

// SignupPasswordOnly creates an account from a password alone (no username).
func (s *Store) SignupPasswordOnly(ctx context.Context, password string) (*User, string, string, error) {
	password = strings.TrimSpace(password)
	if len(password) < 10 {
		return nil, "", "", ErrWeakPassword
	}
	lookup := security.PasswordLookupKey(password)
	hash, err := security.HashPassword(password)
	if err != nil {
		return nil, "", "", err
	}
	id, err := security.NewUserID()
	if err != nil {
		return nil, "", "", err
	}
	// Internal handle for JWT/claims — not shown as a login field.
	label := "u" + id
	if len(label) > 32 {
		label = label[:32]
	}
	now := time.Now().Unix()
	_, err = s.DB.ExecContext(ctx, `
INSERT INTO users (id, username, password_hash, password_lookup, created_at, updated_at, banned)
VALUES (?, ?, ?, ?, ?, ?, 0)`, id, label, hash, lookup, now, now)
	if err != nil {
		low := strings.ToLower(err.Error())
		if strings.Contains(low, "unique") {
			return nil, "", "", ErrPasswordTaken
		}
		return nil, "", "", err
	}
	user := &User{ID: id, Username: label, PasswordHash: hash}
	token, sid, err := s.createSession(ctx, user, "", "")
	if err != nil {
		return nil, "", "", err
	}
	return user, token, sid, nil
}

// LoginPasswordOnly signs in with password only.
func (s *Store) LoginPasswordOnly(ctx context.Context, password, ua, ip string) (*User, string, string, error) {
	password = strings.TrimSpace(password)
	if len(password) < 10 {
		return nil, "", "", ErrInvalidCredentials
	}
	lookup := security.PasswordLookupKey(password)
	row := s.DB.QueryRowContext(ctx, `
SELECT id, username, password_hash, banned FROM users WHERE password_lookup = ?`, lookup)
	var u User
	var banned int
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &banned); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, "", "", ErrInvalidCredentials
		}
		return nil, "", "", err
	}
	if banned != 0 {
		return nil, "", "", ErrBanned
	}
	ok, err := security.VerifyPassword(u.PasswordHash, password)
	if err != nil || !ok {
		return nil, "", "", ErrInvalidCredentials
	}
	token, sid, err := s.createSession(ctx, &u, ua, ip)
	if err != nil {
		return nil, "", "", err
	}
	return &u, token, sid, nil
}

func (s *Store) createSession(ctx context.Context, u *User, ua, ip string) (string, string, error) {
	sid, err := security.NewSessionID()
	if err != nil {
		return "", "", err
	}
	now := time.Now()
	expires := now.Add(30 * 24 * time.Hour)
	_, err = s.DB.ExecContext(ctx, `
INSERT INTO sessions (id, user_id, created_at, expires_at, revoked, user_agent, ip)
VALUES (?, ?, ?, ?, 0, ?, ?)`, sid, u.ID, now.Unix(), expires.Unix(), ua, ip)
	if err != nil {
		return "", "", err
	}
	token, err := security.SignAccessToken(u.ID, u.Username, sid, 30*24*time.Hour)
	if err != nil {
		return "", "", err
	}
	return token, sid, nil
}

func (s *Store) ValidateSession(ctx context.Context, claims *security.Claims) error {
	var revoked int
	var expires int64
	err := s.DB.QueryRowContext(ctx, `
SELECT revoked, expires_at FROM sessions WHERE id = ? AND user_id = ?`, claims.SessionID, claims.UserID).
		Scan(&revoked, &expires)
	if err != nil {
		return ErrInvalidCredentials
	}
	if revoked != 0 || time.Now().Unix() > expires {
		return ErrInvalidCredentials
	}
	var banned int
	_ = s.DB.QueryRowContext(ctx, `SELECT banned FROM users WHERE id = ?`, claims.UserID).Scan(&banned)
	if banned != 0 {
		return ErrBanned
	}
	return nil
}

func (s *Store) Logout(ctx context.Context, sessionID string) error {
	_, err := s.DB.ExecContext(ctx, `UPDATE sessions SET revoked = 1 WHERE id = ?`, sessionID)
	return err
}

// HasPasskeys reports whether the user enrolled any device passkeys (future HTTPS).
func (s *Store) HasPasskeys(ctx context.Context, userID string) (bool, error) {
	var n int
	err := s.DB.QueryRowContext(ctx, `SELECT COUNT(1) FROM passkeys WHERE user_id = ?`, userID).Scan(&n)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func (s *Store) PasskeyUnavailable() error {
	return fmt.Errorf("passkeys require HTTPS hostname — use password for now, add passkey after TLS")
}

// DisplayName returns the optional public label for comments / account.
func (s *Store) DisplayName(ctx context.Context, userID string) (string, error) {
	var name sql.NullString
	err := s.DB.QueryRowContext(ctx, `SELECT display_name FROM users WHERE id = ?`, userID).Scan(&name)
	if err != nil {
		return "", err
	}
	if name.Valid {
		return strings.TrimSpace(name.String), nil
	}
	return "", nil
}

// SetDisplayName updates the optional public label (2–24 chars).
func (s *Store) SetDisplayName(ctx context.Context, userID, name string) error {
	name = strings.TrimSpace(name)
	if name != "" && (len(name) < 2 || len(name) > 24) {
		return fmt.Errorf("display name must be 2–24 characters")
	}
	_, err := s.DB.ExecContext(ctx, `
UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?`,
		nullIfEmpty(name), time.Now().Unix(), userID)
	return err
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
