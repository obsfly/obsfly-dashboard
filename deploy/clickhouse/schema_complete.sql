-- ==================================================================
-- ObsFly Metrics Platform - ClickHouse Schema
-- Version: 2.0
-- Features: Metrics storage, Custom dashboards, Usage tracking
-- ==================================================================

-- ===========================================
-- METRICS STORAGE
-- ===========================================

-- Main metrics table (production-ready with TTL and optimization)
CREATE TABLE IF NOT EXISTS metrics.metrics_v1
(
    -- Core Metadata
    Timestamp          DateTime64(9) CODEC(Delta, ZSTD(1)),
    AccountId          UInt64 CODEC(ZSTD(1)),
    SubAccountId       UInt64 DEFAULT 0 CODEC(ZSTD(1)),
    RetentionDays      UInt16 DEFAULT 30 CODEC(ZSTD(1)),

    -- Host / Infrastructure Identity
    HostId             LowCardinality(String),
    HostName           LowCardinality(String),
    HostIP             LowCardinality(String),
    HostArch           LowCardinality(String),
    NodeName           LowCardinality(String),
    ClusterName        LowCardinality(String),

    -- Agent Metadata
    AgentName          LowCardinality(String),
    AgentVersion       LowCardinality(String),

    -- Application / Service Context
    Env                LowCardinality(String),
    ServiceName        LowCardinality(String),
    ServiceVersion     LowCardinality(String),

    -- Kubernetes Context
    Namespace          LowCardinality(String),
    Pod                LowCardinality(String),
    Container          LowCardinality(String),
    ContainerId        String,

    -- Metric Data
    MetricName         LowCardinality(String) CODEC(ZSTD(1)),
    MetricType         LowCardinality(String) CODEC(ZSTD(1)),   -- gauge, counter, histogram, summary
    Value              Float64 CODEC(ZSTD(1)),
    Count              UInt64 DEFAULT 1 CODEC(ZSTD(1)),
    Sum                Float64 DEFAULT 0 CODEC(ZSTD(1)),

    -- Labels / Dimensions
    Labels             Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    DroppedLabelsCount UInt32 DEFAULT 0 CODEC(ZSTD(1)),

    -- Resource-level attributes
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),

    -- Cost / Usage tracking
    Bytes              UInt64 CODEC(ZSTD(3)),

    -- Indexes for faster queries
    INDEX idx_metric_name     MetricName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_service_name    ServiceName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_label_keys      mapKeys(Labels) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_label_values    mapValues(Labels) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_host            HostName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_env             Env TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_namespace       Namespace TYPE bloom_filter(0.01) GRANULARITY 1
)
ENGINE = MergeTree
PARTITION BY (toDate(Timestamp), AccountId)
ORDER BY (AccountId, SubAccountId, ServiceName, MetricName, Timestamp)
TTL toDateTime(Timestamp) + toIntervalDay(RetentionDays)
SETTINGS
    index_granularity = 8192,
    ttl_only_drop_parts = 1;

-- ===========================================
-- CUSTOM DASHBOARDS
-- ===========================================

-- Dashboard configuration storage
CREATE TABLE IF NOT EXISTS metrics.dashboards
(
    DashboardId        UUID CODEC(ZSTD(1)),
    AccountId          UInt64 CODEC(ZSTD(1)),
    SubAccountId       UInt64 DEFAULT 0 CODEC(ZSTD(1)),
    UserId             UInt64 CODEC(ZSTD(1)),
    
    -- Dashboard details
    Name               String CODEC(ZSTD(1)),
    Description        String CODEC(ZSTD(1)),
    
    -- Configuration (JSON with widgets, layout, etc.)
    Config             String CODEC(ZSTD(1)),
    
    -- Sharing
    IsPublic           UInt8 DEFAULT 0,
    SharedWith         Array(UInt64) DEFAULT [],  -- User IDs
    
    -- Timestamps
    CreatedAt          DateTime64(3) CODEC(Delta, ZSTD(1)),
    UpdatedAt          DateTime64(3) CODEC(Delta, ZSTD(1)),
    
    -- Metadata
    Tags               Array(String) DEFAULT [],
    Version            UInt32 DEFAULT 1
)
ENGINE = MergeTree
PARTITION BY AccountId
ORDER BY (AccountId, DashboardId, UpdatedAt)
SETTINGS index_granularity = 8192;

-- Dashboard access logs
CREATE TABLE IF NOT EXISTS metrics.dashboard_access_log
(
    DashboardId        UUID,
    UserId             UInt64,
    AccountId          UInt64,
    AccessedAt         DateTime64(3) DEFAULT now64(3),
    IPAddress          IPv4,
    UserAgent          String
)
ENGINE = MergeTree
PARTITION BY toDate(AccessedAt)
ORDER BY (DashboardId, UserId, AccessedAt)
TTL toDateTime(AccessedAt) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- ===========================================
-- LOGS STORAGE (if needed)
-- ===========================================

CREATE TABLE IF NOT EXISTS metrics.logs_v1
(
    Timestamp          DateTime64(9) CODEC(Delta, ZSTD(1)),
    AccountId          UInt64 CODEC(ZSTD(1)),
    SubAccountId       UInt64 DEFAULT 0 CODEC(ZSTD(1)),
    
    -- Log details
    Severity           LowCardinality(String), -- debug, info, warn, error, fatal
    Message            String CODEC(ZSTD(3)),
    
    -- Source
    ServiceName        LowCardinality(String),
    HostName           LowCardinality(String),
    Pod                LowCardinality(String),
    Container          LowCardinality(String),
    
    -- Additional context
    TraceId            String,
    SpanId             String,
    Attributes         Map(String, String) CODEC(ZSTD(1)),
    
    -- Usage
    Bytes              UInt64,
    
    -- Indexes
    INDEX idx_severity    Severity TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_service     ServiceName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_trace       TraceId TYPE bloom_filter(0.01) GRANULARITY 1
)
ENGINE = MergeTree
PARTITION BY (toDate(Timestamp), AccountId)
ORDER BY (AccountId, SubAccountId, ServiceName, Timestamp)
TTL toDateTime(Timestamp) + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;

-- ===========================================
-- TRACES STORAGE (if needed)
-- ===========================================

CREATE TABLE IF NOT EXISTS traces.traces_v1
(
    Timestamp          DateTime64(9) CODEC(Delta, ZSTD(1)),
    AccountId          UInt64 CODEC(ZSTD(1)),
    SubAccountId       UInt64 DEFAULT 0 CODEC(ZSTD(1)),
    
    -- Trace identifiers
    TraceId            String CODEC(ZSTD(1)),
    SpanId             String CODEC(ZSTD(1)),
    ParentSpanId       String CODEC(ZSTD(1)),
    
    -- Span details
    ServiceName        LowCardinality(String),
    OperationName      LowCardinality(String),
    SpanKind           LowCardinality(String), -- client, server, producer, consumer, internal
    
    -- Timing
    StartTime          DateTime64(9),
    EndTime            DateTime64(9),
    Duration           UInt64, -- nanoseconds
    
    -- Status
    StatusCode         LowCardinality(String), -- ok, error, unset
    StatusMessage      String,
    
    -- Additional data
    Attributes         Map(String, String) CODEC(ZSTD(1)),
    Events             String CODEC(ZSTD(3)), -- JSON array
    Links              String CODEC(ZSTD(3)), -- JSON array
    
    -- Usage
    Bytes              UInt64,
    
    -- Indexes
    INDEX idx_trace_id    TraceId TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_span_id     SpanId TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_service     ServiceName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_operation   OperationName TYPE bloom_filter(0.01) GRANULARITY 1
)
ENGINE = MergeTree
PARTITION BY (toDate(Timestamp), AccountId)
ORDER BY (AccountId, SubAccountId, TraceId, SpanId, Timestamp)
TTL toDateTime(Timestamp) + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;

-- ===========================================
-- USAGE AGGREGATION VIEWS
-- ===========================================

-- Materialized view for hourly metrics usage
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics.metrics_usage_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour_bucket)
ORDER BY (AccountId, SubAccountId, hour_bucket)
AS SELECT
    AccountId,
    SubAccountId,
    toStartOfHour(Timestamp) as hour_bucket,
    count() as metric_count,
    sum(Bytes) as total_bytes
FROM metrics.metrics_v1
GROUP BY AccountId, SubAccountId, hour_bucket;

-- Materialized view for hourly logs usage
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics.logs_usage_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour_bucket)
ORDER BY (AccountId, SubAccountId, hour_bucket)
AS SELECT
    AccountId,
    SubAccountId,
    toStartOfHour(Timestamp) as hour_bucket,
    count() as log_count,
    sum(Bytes) as total_bytes
FROM metrics.logs_v1
GROUP BY AccountId, SubAccountId, hour_bucket;

-- Materialized view for hourly traces usage
CREATE MATERIALIZED VIEW IF NOT EXISTS traces.traces_usage_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour_bucket)
ORDER BY (AccountId, SubAccountId, hour_bucket)
AS SELECT
    AccountId,
    SubAccountId,
    toStartOfHour(Timestamp) as hour_bucket,
    count() as span_count,
    sum(Bytes) as total_bytes
FROM traces.traces_v1
GROUP BY AccountId, SubAccountId, hour_bucket;

-- ===========================================
-- QUERY HELPERS
-- ===========================================

-- View for latest metric values (useful for dashboards)
CREATE VIEW IF NOT EXISTS metrics.latest_metrics AS
SELECT
    AccountId,
    SubAccountId,
    ServiceName,
    MetricName,
    argMax(Value, Timestamp) as LatestValue,
    max(Timestamp) as LastUpdated
FROM metrics.metrics_v1
WHERE Timestamp > now() - INTERVAL 1 HOUR
GROUP BY AccountId, SubAccountId, ServiceName, MetricName;

-- ===========================================
-- COMMENTS
-- ===========================================

-- Table comments (ClickHouse 23.x+)
ALTER TABLE metrics.metrics_v1 COMMENT 'Main metrics storage with multi-tenant support';
ALTER TABLE metrics.dashboards COMMENT 'Custom dashboard configurations';
ALTER TABLE metrics.logs_v1 COMMENT 'Log storage with trace correlation';
ALTER TABLE metrics.traces_v1 COMMENT 'Distributed tracing spans';
