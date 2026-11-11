package auth

import (
	"context"
	"database/sql"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/fampep/anikitty/apps/dedicated-server/internal/security"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUsernameTaken      = errors.New("username taken")
	ErrBanned             = errors.New("account banned")
	ErrWeakPassword       = errors.New("password too weak")
	ErrBadUsername        = errors.New("invalid username")
)

var usernameRE = regexp.MustCompile(`^[a-zA-Z0-9_]{3,32}$`)

type User struct {
	ID           string
	Username     string
	PasswordHash string
	Banned       bool
}

type Store struct {
	DB *sql.DB
}

func (s *Store) Signup(ctx context.Context, username, password string) (*User, string, string, error) {
	username = strings.TrimSpace(username)
	if !usernameRE.MatchString(username) {
		return nil, "", "", ErrBadUsername
	}
	if len(password) < 10 {
		return nil, "", "", ErrWeakPassword
	}
	hash, err := security.HashPassword(password)
	if err != nil {
		return nil, "", "", err
	}
	id, err := security.NewUserID()
	if err != nil {
		return nil, "", "", err
	}
	now := time.Now().Unix()
	_, err = s.DB.ExecContext(ctx, `
INSERT INTO users (id, username, password_hash, created_at, updated_at, banned)
VALUES (?, ?, ?, ?, ?, 0)`, id, username, hash, now, now)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil, "", "", ErrUsernameTaken
		}
		return nil, "", "", err
	}
	user := &User{ID: id, Username: username, PasswordHash: hash}
	token, sid, err := s.createSession(ctx, user, "", "")
	if err != nil {
		return nil, "", "", err
	}
	return user, token, sid, nil
}

func (s *Store) Login(ctx context.Context, username, password, ua, ip string) (*User, string, string, error) {
	username = strings.TrimSpace(username)
	row := s.DB.QueryRowContext(ctx, `
SELECT id, username, password_hash, banned FROM users WHERE username = ? COLLATE NOCASE`, username)
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
