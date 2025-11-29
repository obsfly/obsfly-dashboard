package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/namlabs/obsfly/backend/internal/api"
	"github.com/namlabs/obsfly/backend/internal/generator"
	"github.com/namlabs/obsfly/backend/internal/store"
)

func main() {
	// Configuration (should be env vars)
	chAddr := os.Getenv("CLICKHOUSE_ADDR")
	if chAddr == "" {
		chAddr = "localhost:9000"
	}
	chUser := os.Getenv("CLICKHOUSE_USER")
	if chUser == "" {
		chUser = "default"
	}
	chPassword := os.Getenv("CLICKHOUSE_PASSWORD")

	// Connect to ClickHouse
	// Retry logic for startup
	var s *store.Store
	var err error
	for i := 0; i < 10; i++ {
		s, err = store.NewStore(chAddr, "default", chUser, chPassword)
		if err == nil {
			break
		}
		log.Printf("Failed to connect to ClickHouse: %v. Retrying...", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Could not connect to ClickHouse after retries: %v", err)
	}
	log.Println("Connected to ClickHouse")

	// Start Data Generator (only in dev mode)
	env := os.Getenv("ENV")
	if env == "" {
		env = "dev"
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if env == "dev" {
		log.Println("Starting data generator (dev mode)")
		go generator.StartGenerating(ctx, s)
	} else {
		log.Println("Skipping data generator (production mode)")
	}

	// Setup API
	r := chi.NewRouter()
	h := api.NewHandler(s)
	h.RegisterRoutes(r)

	// Start Server
	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	go func() {
		log.Println("Starting server on :8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Graceful Shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Println("Shutting down...")
	srv.Shutdown(context.Background())
}
