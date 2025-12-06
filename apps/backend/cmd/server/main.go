package main

import (
	"context"
	"fmt"
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
	// Configuration from environment
	chHost := os.Getenv("CLICKHOUSE_HOST")
	if chHost == "" {
		chHost = "localhost"
	}
	chPort := os.Getenv("CLICKHOUSE_PORT")
	if chPort == "" {
		chPort = "9000"
	}
	chAddr := fmt.Sprintf("%s:%s", chHost, chPort)

	chUser := os.Getenv("CLICKHOUSE_USER")
	if chUser == "" {
		chUser = "default"
	}
	chPassword := os.Getenv("CLICKHOUSE_PASSWORD")
	chDB := os.Getenv("CLICKHOUSE_DB")
	if chDB == "" {
		chDB = "default"
	}

	// Connect to ClickHouse
	// Retry logic for startup
	var s *store.Store
	var err error
	for i := 0; i < 10; i++ {
		s, err = store.NewStore(chAddr, chDB, chUser, chPassword)
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

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start Embedded Data Generator (if enabled and in dev mode)
	env := os.Getenv("ENV")
	if env == "" {
		env = "dev" // Default to dev if not set
	}

	enableGenerator := os.Getenv("ENABLE_DATA_GENERATOR")
	if enableGenerator == "" {
		enableGenerator = "true"
	}

	if (env == "dev" || env == "development") && enableGenerator == "true" {
		log.Println("Starting embedded data generator (dev mode)...")

		configPath := os.Getenv("DATA_CONFIG_PATH")
		if configPath == "" {
			configPath = "./configs/data-config.yaml"
		}

		cfg, err := generator.LoadConfig(configPath)
		if err != nil {
			log.Printf("Warning: Could not load data config: %v. Using defaults.", err)
			// Create minimal default config
			cfg = &generator.Config{}
			cfg.Nodes.Total = 100
			cfg.Nodes.AwsEc2Count = 50
			cfg.Nodes.AwsCloudCount = 50
			cfg.Services.MinPerNode = 4
			cfg.Services.MaxPerNode = 10
			cfg.Services.Languages = []string{"go", "python", "nodejs", "java", "rust", "dotnet", "ruby", "php"}
			cfg.Generation.IntervalSeconds = 10
			cfg.Generation.AccountID = 1
			cfg.Metrics.CPURange = [2]int{10, 90}
			cfg.Metrics.MemoryRange = [2]int{20, 80}
			cfg.Metrics.DiskRange = [2]int{10, 70}
			cfg.Metrics.NetworkRange = [2]int{1, 100}
			cfg.Traces.ErrorRate = 0.05
			cfg.Traces.SlowThresholdMs = 500
		}

		dataGen := generator.NewDataGenerator(cfg, s)
		go dataGen.Start(ctx)
	} else {
		log.Printf("Data generator disabled (ENV=%s, ENABLE_DATA_GENERATOR=%s)", env, enableGenerator)
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
