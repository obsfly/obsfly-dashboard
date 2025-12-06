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
	// Use provided credentials or defaults
	if user == "" {
		user = "default"
	}
	if db == "" {
		db = "default"
	}

	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{addr},
		Auth: clickhouse.Auth{
			Database: db,
			Username: user,
			Password: password,
		},
		DialTimeout: 5 * time.Second,
		Debug:       false,
	})
	if err != nil {
		return nil, err
	}

	if err := conn.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping clickhouse: %w", err)
	}

	// Create Databases
	databases := []string{"metrics", "traces", "logs", "profiles"}
	for _, dbName := range databases {
		err = conn.Exec(context.Background(), fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s", dbName))
		if err != nil {
			return nil, fmt.Errorf("failed to create database %s: %w", dbName, err)
		}
	}

	// Create Metrics Table
	metricsSchema := `
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
	err = conn.Exec(context.Background(), metricsSchema)
	if err != nil {
		return nil, fmt.Errorf("failed to create metrics table: %w", err)
	}

	// Create Dashboards Table
	dashboardSchema := `
	CREATE TABLE IF NOT EXISTS metrics.dashboards
	(
		DashboardId        UUID CODEC(ZSTD(1)),
		AccountId          UInt64 CODEC(ZSTD(1)),
		Name               String CODEC(ZSTD(1)),
		Description        String CODEC(ZSTD(1)),
		Config             String CODEC(ZSTD(1)),
		CreatedAt          DateTime64(3) CODEC(Delta, ZSTD(1)),
		UpdatedAt          DateTime64(3) CODEC(Delta, ZSTD(1))
	)
	ENGINE = MergeTree
	PARTITION BY AccountId
	ORDER BY (AccountId, DashboardId)
	SETTINGS index_granularity = 8192;
	`
	err = conn.Exec(context.Background(), dashboardSchema)
	if err != nil {
		return nil, fmt.Errorf("failed to create dashboards table: %w", err)
	}

	// Create Traces Table (with Array(Map) for Events and Links)
	tracesSchema := `
	CREATE TABLE IF NOT EXISTS traces.traces_v1
	(
		Timestamp          DateTime64(9) CODEC(Delta, ZSTD(1)),
		AccountId          UInt64 CODEC(ZSTD(1)),
		RetentionDays      UInt16 DEFAULT 30 CODEC(ZSTD(1)),
		HostID             LowCardinality(String),
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
		ContainerID        String,
		TraceId            String CODEC(ZSTD(1)),
		SpanId             String CODEC(ZSTD(1)),
		ParentSpanId       String CODEC(ZSTD(1)),
		TraceState         LowCardinality(String) CODEC(ZSTD(1)),
		TraceFlags         UInt32 CODEC(ZSTD(1)),
		Name               LowCardinality(String) CODEC(ZSTD(1)),
		Kind               UInt8 CODEC(ZSTD(1)),
		StartTimeUnixNano  UInt64 CODEC(Delta, ZSTD(1)),
		EndTimeUnixNano    UInt64 CODEC(Delta, ZSTD(1)),
		Attributes         Map(LowCardinality(String), String) CODEC(ZSTD(1)),
		DroppedAttributesCount UInt32 CODEC(ZSTD(1)),
		Events             Array(Map(String, String)) CODEC(ZSTD(1)),
		DroppedEventsCount UInt32 CODEC(ZSTD(1)),
		Links              Array(Map(String, String)) CODEC(ZSTD(1)),
		DroppedLinksCount  UInt32 CODEC(ZSTD(1)),
		StatusCode         UInt32 CODEC(ZSTD(1)),
		StatusMessage      String CODEC(ZSTD(1)),
		ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
		Bytes              UInt64 CODEC(ZSTD(3)),
		INDEX idx_trace_id      TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
		INDEX idx_service_name  ResourceAttributes['service.name'] TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_attr_key      mapKeys(Attributes) TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_attr_value    mapValues(Attributes) TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_agent_name    AgentName TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_env           Env TYPE bloom_filter(0.01) GRANULARITY 1
	)
	ENGINE = MergeTree
	PARTITION BY (toDate(Timestamp), AccountId)
	ORDER BY (AccountId, ServiceName, Timestamp)
	TTL toDateTime(Timestamp) + toIntervalDay(RetentionDays)
	SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
	`
	err = conn.Exec(context.Background(), tracesSchema)
	if err != nil {
		return nil, fmt.Errorf("failed to create traces table: %w", err)
	}

	// Create Logs Table
	logsSchema := `
	CREATE TABLE IF NOT EXISTS logs.logs_v1
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
		Source             LowCardinality(String),
		SeverityNumber     Int32,
		SeverityText       LowCardinality(String),
		Body               String CODEC(ZSTD(1)),
		TraceId            String,
		SpanId             String,
		TraceFlags         UInt64,
		LogAttributes      Map(String, String) CODEC(ZSTD(1)),
		ResourceAttributes Map(String, String) CODEC(ZSTD(1)),
		PatternHash        String,
		BodyHash           String,
		Bytes              UInt64 CODEC(ZSTD(1)),
		INDEX idx_trace_id TraceId TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_service  ServiceName TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_body     Body TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1
	)
	ENGINE = MergeTree
	PARTITION BY (toDate(Timestamp), AccountId)
	ORDER BY (AccountId, ServiceName, Timestamp)
	TTL toDateTime(Timestamp) + toIntervalDay(RetentionDays)
	SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
	`
	err = conn.Exec(context.Background(), logsSchema)
	if err != nil {
		return nil, fmt.Errorf("failed to create logs table: %w", err)
	}

	// Create Profiles Table
	profilesSchema := `
	CREATE TABLE IF NOT EXISTS profiles.profiling_v1
	(
		Timestamp          DateTime64(9) CODEC(Delta, ZSTD(1)),
		AccountId          UInt64 CODEC(ZSTD(1)),
		RetentionDays      UInt16 DEFAULT 30 CODEC(ZSTD(1)),
		HostID             LowCardinality(String),
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
		ContainerID        String,
		ProfileType        LowCardinality(String),
		ProcessID          String,
		Runtime            LowCardinality(String),
		RuntimeVersion     LowCardinality(String),
		SampleValue        UInt64,
		SampleCount        UInt64,
		StartTime          DateTime64(9),
		EndTime            DateTime64(9),
		StackHash          UInt64,
		StackFrames        Array(String) CODEC(ZSTD(1)),
		FunctionNames      Array(String) CODEC(ZSTD(1)),
		FunctionFiles      Array(String) CODEC(ZSTD(1)),
		FunctionLines      Array(Int64) CODEC(ZSTD(1)),
		FunctionCount      UInt16,
		Labels             Map(String, String) CODEC(ZSTD(1)),
		ProfilingLabels    Map(String, String) CODEC(ZSTD(1)),
		ProfilingNumLabels Map(String, Int64) CODEC(ZSTD(1)),
		LastSeen           DateTime64(9),
		Bytes              UInt64 CODEC(ZSTD(1)),
		INDEX idx_service  ServiceName TYPE bloom_filter(0.01) GRANULARITY 1,
		INDEX idx_profile_type ProfileType TYPE bloom_filter(0.01) GRANULARITY 1
	)
	ENGINE = MergeTree
	PARTITION BY (toDate(Timestamp), AccountId)
	ORDER BY (AccountId, ServiceName, ProfileType, Timestamp)
	TTL toDateTime(Timestamp) + toIntervalDay(RetentionDays)
	SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
	`
	err = conn.Exec(context.Background(), profilesSchema)
	if err != nil {
		return nil, fmt.Errorf("failed to create profiles table: %w", err)
	}

	return &Store{conn: conn}, nil
}

// Metric represents a single data point
type Metric struct {
	Timestamp          time.Time
	AccountId          uint64
	ServiceName        string
	Pod                string
	MetricName         string
	MetricType         string
	Value              float64
	Labels             map[string]string
	ResourceAttributes map[string]string
}

func (s *Store) InsertMetrics(ctx context.Context, metrics []Metric) error {
	batch, err := s.conn.PrepareBatch(ctx, "INSERT INTO metrics.metrics_v1")
	if err != nil {
		return err
	}

	for _, m := range metrics {
		// Extract metadata from ResourceAttributes
		res := m.ResourceAttributes
		if res == nil {
			res = make(map[string]string)
		}

		hostId := res["host.id"]
		hostName := res["host.name"]
		hostIP := res["host.ip"]
		hostArch := res["host.arch"]
		if hostArch == "" {
			hostArch = res["arch"]
		}
		nodeName := res["host.name"]
		clusterName := res["cluster"]
		if clusterName == "" {
			clusterName = res["k8s.cluster.name"]
		}
		agentName := "obsfly-agent"
		agentVersion := res["agent_version"]
		env := res["deployment.environment"]
		if env == "" {
			env = "production"
		}
		serviceVersion := res["service.version"]
		namespace := res["k8s.namespace"]
		pod := res["k8s.pod.name"]
		containerId := res["container.id"]
		container := res["container.name"]

		err := batch.Append(
			m.Timestamp,
			m.AccountId,
			uint64(0),  // SubAccountId
			uint16(30), // RetentionDays
			hostId,
			hostName,
			hostIP,
			hostArch,
			nodeName,
			clusterName,
			agentName,
			agentVersion,
			env,
			m.ServiceName,
			serviceVersion,
			namespace,
			pod,
			container,
			containerId,
			m.MetricName,
			m.MetricType,
			m.Value,
			uint64(1), // Count
			m.Value,   // Sum
			m.Labels,
			uint32(0), // DroppedLabelsCount
			m.ResourceAttributes,
			uint64(len(m.MetricName)+len(m.MetricType)+8+8), // Bytes (approx: name + type + value + timestamp)
		)
		if err != nil {
			return err
		}
	}

	return batch.Send()
}

// Log represents a log entry
type Log struct {
	Timestamp          time.Time
	AccountId          uint64
	HostId             string
	HostName           string
	HostIP             string
	HostArch           string
	NodeName           string
	ClusterName        string
	AgentName          string
	AgentVersion       string
	Env                string
	ServiceName        string
	ServiceVersion     string
	Namespace          string
	Pod                string
	Container          string
	ContainerId        string
	Source             string
	SeverityNumber     int32
	SeverityText       string
	Body               string
	TraceId            string
	SpanId             string
	TraceFlags         uint64
	LogAttributes      map[string]string
	ResourceAttributes map[string]string
	PatternHash        string
	BodyHash           string
	Bytes              uint64
}

func (s *Store) InsertLogs(ctx context.Context, logs []Log) error {
	batch, err := s.conn.PrepareBatch(ctx, "INSERT INTO logs.logs_v1")
	if err != nil {
		return err
	}

	for _, l := range logs {
		err := batch.Append(
			l.Timestamp,
			l.AccountId,
			uint16(14), // RetentionDays - default 14
			l.HostId,
			l.HostName,
			l.HostIP,
			l.HostArch,
			l.NodeName,
			l.ClusterName,
			l.AgentName,
			l.AgentVersion,
			l.Env,
			l.ServiceName,
			l.ServiceVersion,
			l.Namespace,
			l.Pod,
			l.Container,
			l.ContainerId,
			l.Source,
			l.SeverityNumber,
			l.SeverityText,
			l.Body,
			l.TraceId,
			l.SpanId,
			l.TraceFlags,
			l.LogAttributes,
			l.ResourceAttributes,
			l.PatternHash,
			l.BodyHash,
			func() uint64 {
				if l.Bytes > 0 {
					return l.Bytes
				}
				return uint64(len(l.Body) + len(l.ServiceName) + len(l.SeverityText) + 100)
			}(),
		)
		if err != nil {
			return err
		}
	}

	return batch.Send()
}

// Trace represents a trace span
type Trace struct {
	Timestamp              time.Time
	AccountId              uint64
	HostID                 string
	HostName               string
	HostIP                 string
	HostArch               string
	NodeName               string
	ClusterName            string
	AgentName              string
	AgentVersion           string
	Env                    string
	ServiceName            string
	ServiceVersion         string
	Namespace              string
	Pod                    string
	Container              string
	ContainerID            string
	TraceId                string
	SpanId                 string
	ParentSpanId           string
	TraceState             string
	TraceFlags             uint32
	Name                   string
	Kind                   uint8
	StartTimeUnixNano      uint64
	EndTimeUnixNano        uint64
	Attributes             map[string]string
	DroppedAttributesCount uint32
	Events                 []map[string]string
	DroppedEventsCount     uint32
	Links                  []map[string]string
	DroppedLinksCount      uint32
	StatusCode             uint32
	StatusMessage          string
	ResourceAttributes     map[string]string
	Bytes                  uint64
}

func (s *Store) InsertTraces(ctx context.Context, traces []Trace) error {
	batch, err := s.conn.PrepareBatch(ctx, "INSERT INTO traces.traces_v1")
	if err != nil {
		return err
	}

	for _, t := range traces {
		// Events and Links are now Array(Map(String, String)) - pass directly
		err := batch.Append(
			t.Timestamp,
			t.AccountId,
			uint16(30), // RetentionDays - default 30
			t.HostID,
			t.HostName,
			t.HostIP,
			t.HostArch,
			t.NodeName,
			t.ClusterName,
			t.AgentName,
			t.AgentVersion,
			t.Env,
			t.ServiceName,
			t.ServiceVersion,
			t.Namespace,
			t.Pod,
			t.Container,
			t.ContainerID,
			t.TraceId,
			t.SpanId,
			t.ParentSpanId,
			t.TraceState,
			t.TraceFlags,
			t.Name,
			t.Kind,
			t.StartTimeUnixNano,
			t.EndTimeUnixNano,
			t.Attributes,
			t.DroppedAttributesCount,
			t.Events,
			t.DroppedEventsCount,
			t.Links,
			t.DroppedLinksCount,
			t.StatusCode,
			t.StatusMessage,
			t.ResourceAttributes,
			func() uint64 {
				if t.Bytes > 0 {
					return t.Bytes
				}
				// Calculate size based on trace data
				size := uint64(len(t.Name) + len(t.TraceId) + len(t.SpanId) + 100)
				for _, event := range t.Events {
					for k, v := range event {
						size += uint64(len(k) + len(v))
					}
				}
				for _, link := range t.Links {
					for k, v := range link {
						size += uint64(len(k) + len(v))
					}
				}
				return size
			}(),
		)
		if err != nil {
			return err
		}
	}

	return batch.Send()
}

// Profile represents a profile sample
type Profile struct {
	Timestamp          time.Time
	AccountId          uint64
	HostID             string
	HostName           string
	HostIP             string
	HostArch           string
	NodeName           string
	ClusterName        string
	AgentName          string
	AgentVersion       string
	Env                string
	ServiceName        string
	ServiceVersion     string
	Namespace          string
	Pod                string
	Container          string
	ContainerID        string
	ProfileType        string
	ProcessID          string
	Runtime            string
	RuntimeVersion     string
	SampleValue        uint64
	SampleCount        uint64
	StartTime          time.Time
	EndTime            time.Time
	StackHash          uint64
	StackFrames        []string
	FunctionNames      []string
	FunctionFiles      []string
	FunctionLines      []int64
	FunctionCount      uint16
	Labels             map[string]string
	ProfilingLabels    map[string]string
	ProfilingNumLabels map[string]int64
	LastSeen           time.Time
	Bytes              uint64
}

func (s *Store) InsertProfiles(ctx context.Context, profiles []Profile) error {
	batch, err := s.conn.PrepareBatch(ctx, "INSERT INTO profiles.profiling_v1")
	if err != nil {
		return err
	}

	for _, p := range profiles {
		// Set defaults for missing fields
		if p.HostID == "" {
			p.HostID = p.HostName // Fallback
		}
		if p.LastSeen.IsZero() {
			p.LastSeen = p.Timestamp
		}
		if p.Bytes == 0 {
			p.Bytes = 1024 // Mock size
		}
		if p.Env == "" {
			p.Env = "production"
		}
		if p.AgentName == "" {
			p.AgentName = "obsfly-agent"
		}

		err := batch.Append(
			p.Timestamp,
			p.AccountId,
			uint16(30), // RetentionDays
			p.HostID,
			p.HostName,
			p.HostIP,
			p.HostArch,
			p.NodeName,
			p.ClusterName,
			p.AgentName,
			p.AgentVersion,
			p.Env,
			p.ServiceName,
			p.ServiceVersion,
			p.Namespace,
			p.Pod,
			p.Container,
			p.ContainerID,
			p.ProfileType,
			p.ProcessID,
			p.Runtime,
			p.RuntimeVersion,
			p.SampleValue,
			p.SampleCount,
			p.StartTime,
			p.EndTime,
			p.StackHash,
			p.StackFrames,
			p.FunctionNames,
			p.FunctionFiles,
			p.FunctionLines,
			p.FunctionCount,
			p.Labels,
			p.ProfilingLabels,
			p.ProfilingNumLabels,
			p.LastSeen,
			func() uint64 {
				if p.Bytes > 0 {
					return p.Bytes
				}
				// Approx size: stack frames + function names + labels
				size := uint64(100)
				for _, f := range p.StackFrames {
					size += uint64(len(f))
				}
				for _, f := range p.FunctionNames {
					size += uint64(len(f))
				}
				return size
			}(),
		)
		if err != nil {
			return err
		}
	}

	return batch.Send()
}
