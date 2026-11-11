package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fampep/anikitty/apps/dedicated-server/internal/auth"
	"github.com/fampep/anikitty/apps/dedicated-server/internal/db"
	"github.com/fampep/anikitty/apps/dedicated-server/internal/httpapi"
	"github.com/fampep/anikitty/apps/dedicated-server/internal/security"
)

func main() {
	if _, err := security.JWTSecret(); err != nil {
		log.Fatalf("refusing to start: %v (set a long random JWT_SECRET)", err)
	}

	dsn := env("DATABASE_URL", "file:./data/anikitty.db?_fk=1&_journal_mode=WAL")
	sqlDB, err := db.Open(dsn)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer sqlDB.Close()

	store := &auth.Store{DB: sqlDB}
	api := httpapi.New(store, sqlDB)

	addr := env("LISTEN_ADDR", ":8788")
	srv := &http.Server{
		Addr:              addr,
		Handler:           api.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	go func() {
		log.Printf("AniKitty dedicated server (auth/history only) on %s", addr)
		log.Printf("No scrape/stream routes — those run on the Android APK")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
