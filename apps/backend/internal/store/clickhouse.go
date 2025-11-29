package store

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type Store struct {
	conn driver.Conn
}

func NewStore(addr string, db string, user string, password string) (*Store, error) {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{addr},
		Auth: clickhouse.Auth{
			Database: db,
			Username: user,
			Password: password,
		},
		Debug: true,
	})
	if err != nil {
		return nil, err
	}

	if err := conn.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping clickhouse: %w", err)
	}

	// Create Database
	err = conn.Exec(context.Background(), `CREATE DATABASE IF NOT EXISTS metrics`)
	if err != nil {
		return nil, fmt.Errorf("failed to create database: %w", err)
	}

	// Create Table
	schema := `
	CREATE TABLE IF NOT EXISTS metrics.metrics_v1
	(
		Timestamp          DateTime64(9) CODEC(Delta, ZSTD(1)),
		AccountId          UInt64 CODEC(ZSTD(1)),
		RetentionDays      UInt16 DEFAULT 30 CODEC(ZSTD(1)),
		HostId             LowCardinality(String),
		HostName           LowCardinality(String),
		HostIP             LowCardinality(String),
		HostArch           LowCardinality(String),
		NodeName           LowCardinality(String),
		ClusterName        LowCardinality(String),
		AgentName          LowCardinality(String),
		AgentVersion       LowCardinality(String),
		Env                LowCardinality(String),
		ServiceName        LowCardinality(String),
		ServiceVersion     LowCardinality(String),
		Namespace          LowCardinality(String),
		Pod                LowCardinality(String),
		Container          LowCardinality(String),
		ContainerId        String,
		MetricName         LowCardinality(String) CODEC(ZSTD(1)),
		MetricType         LowCardinality(String) CODEC(ZSTD(1)),
		Value              Float64 CODEC(ZSTD(1)),
		Count              UInt64 DEFAULT 1 CODEC(ZSTD(1)),
		Sum                Float64 DEFAULT 0 CODEC(ZSTD(1)),
		Labels             Map(LowCardinality(String), String) CODEC(ZSTD(1)),
		DroppedLabelsCount UInt32 DEFAULT 0 CODEC(ZSTD(1)),
		ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
		Bytes              UInt64 CODEC(ZSTD(3)),
		INDEX idx_metric_name     MetricName TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_service_name    ServiceName TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_label_keys      mapKeys(Labels) TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_label_values    mapValues(Labels) TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_host            HostName TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_env             Env TYPE bloom_filter(0.01) GRANULARITY 1
	)
	ENGINE = MergeTree
	PARTITION BY (toDate(Timestamp), AccountId)
	ORDER BY (AccountId, ServiceName, MetricName, Timestamp)
	TTL toDateTime(Timestamp) + toIntervalDay(RetentionDays)
	SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
	`
	err = conn.Exec(context.Background(), schema)
	if err != nil {
		return nil, fmt.Errorf("failed to create table: %w", err)
	}

	return &Store{conn: conn}, nil
}

// Metric represents a single data point
type Metric struct {
	Timestamp   time.Time
	AccountId   uint64
	ServiceName string
	Pod         string
	MetricName  string
	MetricType  string
	Value       float64
	Labels      map[string]string
}

func (s *Store) InsertMetrics(ctx context.Context, metrics []Metric) error {
	batch, err := s.conn.PrepareBatch(ctx, "INSERT INTO metrics.metrics_v1 (Timestamp, AccountId, ServiceName, Pod, MetricName, MetricType, Value, Labels)")
	if err != nil {
		return err
	}

	for _, m := range metrics {
		err := batch.Append(
			m.Timestamp,
			m.AccountId,
			m.ServiceName,
			m.Pod,
			m.MetricName,
			m.MetricType,
			m.Value,
			m.Labels,
		)
		if err != nil {
			return err
		}
	}

	return batch.Send()
}
