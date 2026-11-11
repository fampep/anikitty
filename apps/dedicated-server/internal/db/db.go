package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func Open(dsn string) (*sql.DB, error) {
	if dsn == "" {
		dsn = "file:./data/anikitty.db?_fk=1&_journal_mode=WAL"
	}
	if path, ok := filePathFromDSN(dsn); ok {
		if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
			return nil, err
		}
	}
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetConnMaxLifetime(time.Hour)
	if err := migrate(db); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func filePathFromDSN(dsn string) (string, bool) {
	if len(dsn) >= 5 && dsn[:5] == "file:" {
		rest := dsn[5:]
		for i, c := range rest {
			if c == '?' {
				return rest[:i], true
			}
		}
		return rest, true
	}
	return "", false
}

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  banned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  user_agent TEXT,
  ip TEXT
);

CREATE TABLE IF NOT EXISTS watch_history (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anilist_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  cover_image_url TEXT,
  episode INTEGER NOT NULL DEFAULT 1,
  position_ms INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, anilist_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user_updated ON watch_history(user_id, updated_at DESC);
`)
	if err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	return nil
}
