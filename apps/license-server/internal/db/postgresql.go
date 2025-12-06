package db

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

type Database struct {
	conn *sql.DB
}

// NewDatabase creates a new PostgreSQL connection
func NewDatabase(host, port, user, password, dbname string) (*Database, error) {
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname,
	)

	conn, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	conn.SetMaxOpenConns(25)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)

	return &Database{conn: conn}, nil
}

// Close closes the database connection
func (db *Database) Close() error {
	return db.conn.Close()
}

// GetConn returns the underlying SQL connection
func (db *Database) GetConn() *sql.DB {
	return db.conn
}

// Exec executes a query without returning rows
func (db *Database) Exec(query string, args ...interface{}) error {
	_, err := db.conn.Exec(query, args...)
	return err
}

// QueryRow executes a query that returns a single row
func (db *Database) QueryRow(query string, args ...interface{}) *sql.Row {
	return db.conn.QueryRow(query, args...)
}

// Query executes a query that returns multiple rows
func (db *Database) Query(query string, args ...interface{}) (*sql.Rows, error) {
	return db.conn.Query(query, args...)
}

// BeginTx starts a transaction
func (db *Database) BeginTx() (*sql.Tx, error) {
	return db.conn.Begin()
}
