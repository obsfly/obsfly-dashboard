package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/namlabs/obsfly/license-server/internal/api"
	"github.com/namlabs/obsfly/license-server/internal/db"
)

func main() {
	// Database configuration from environment
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "obsfly_license")

	// Connect to database
	database, err := db.NewDatabase(dbHost, dbPort, dbUser, dbPassword, dbName)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	log.Println("Connected to PostgreSQL successfully")

	// Initialize handlers
	accountHandler := api.NewAccountHandler(database)
	licenseHandler := api.NewLicenseHandler(database)
	usageHandler := api.NewUsageHandler(database)

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Account management routes
	r.Route("/api/accounts", func(r chi.Router) {
		r.Post("/", accountHandler.CreateAccount)
		r.Get("/{accountId}", accountHandler.GetAccount)
		r.Post("/{accountId}/sub-accounts", accountHandler.CreateSubAccount)
		r.Get("/{accountId}/sub-accounts", accountHandler.ListSubAccounts)
	})

	// License validation routes
	r.Route("/api/licenses", func(r chi.Router) {
		r.Post("/validate", licenseHandler.ValidateLicense)
		r.Get("/status", licenseHandler.GetLicenseStatus)
	})

	// Usage tracking routes
	r.Route("/api/usage", func(r chi.Router) {
		r.Post("/ingest", usageHandler.IngestUsage)
		r.Get("/{accountId}/current", usageHandler.GetCurrentUsage)
		r.Get("/{accountId}/history", usageHandler.GetUsageHistory)
	})

	// Start server
	port := getEnv("PORT", "8081")
	log.Printf("License server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
