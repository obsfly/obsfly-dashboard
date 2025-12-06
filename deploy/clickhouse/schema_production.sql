-- Production Schema for ObsFly
-- Creates all databases and tables with full column structures

-- Create databases
CREATE DATABASE IF NOT EXISTS logs;
CREATE DATABASE IF NOT EXISTS metrics;
CREATE DATABASE IF NOT EXISTS profiles;
CREATE DATABASE IF NOT EXISTS traces;

-- ============================================
-- LOGS DATABASE
-- ============================================

CREATE TABLE IF NOT EXISTS logs.logs_v1 (
    -- Core Metadata
    Timestamp           DateTime64(9) CODEC(Delta, ZSTD(3)),
    AccountId           UInt64 CODEC(ZSTD(3)),
    RetentionDays       UInt16 DEFAULT 14 CODEC(ZSTD(3)),

    -- Host / Infrastructure Identity
    HostId              LowCardinality(String),
    HostName            LowCardinality(String),
    HostIP              LowCardinality(String),
    HostArch            LowCardinality(String),
    NodeName            LowCardinality(String),
    ClusterName         LowCardinality(String),

    -- Agent Metadata
    AgentName           LowCardinality(String),
    AgentVersion        LowCardinality(String),

    -- Application / Service Context
    Env                 LowCardinality(String),
    ServiceName         LowCardinality(String),
    ServiceVersion      LowCardinality(String),

    -- Kubernetes Context
    Namespace           LowCardinality(String),
    Pod                 LowCardinality(String),
    Container           LowCardinality(String),
    ContainerId         String,

    -- Log Event Fields
    Source              LowCardinality(String),
    SeverityNumber      Int32,
    SeverityText        LowCardinality(String),
    Body                String,
    TraceId             String,
    SpanId              String,
    TraceFlags          UInt64,

    -- Attributes / Metadata
    LogAttributes       Map(LowCardinality(String), String),
    ResourceAttributes  Map(LowCardinality(String), String),

    -- Pattern & Deduplication
    PatternHash         String DEFAULT '',
    BodyHash            String DEFAULT '',

    -- Cost / Usage
    Bytes               UInt64 CODEC(ZSTD(3))
)
ENGINE = MergeTree
PARTITION BY toDate(Timestamp)
ORDER BY (AccountId, ServiceName, Timestamp)
TTL toDateTime(Timestamp) + toIntervalDay(RetentionDays)
SETTINGS index_granularity = 8192;

-- ============================================
-- METRICS DATABASE
-- ============================================

CREATE TABLE IF NOT EXISTS metrics.metrics_v1
(
    -- Core Metadata
    Timestamp          DateTime64(9) CODEC(Delta, ZSTD(1)),
    AccountId          UInt64 CODEC(ZSTD(1)),
    RetentionDays      UInt16 DEFAULT 30 CODEC(ZSTD(1)),

    -- Host / Infrastructure Identity
    HostId            LowCardinality(String),
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
    MetricType         LowCardinality(String) CODEC(ZSTD(1)),
    Value              Float64 CODEC(ZSTD(1)),
    Count              UInt64 DEFAULT 1 CODEC(ZSTD(1)),
    Sum                Float64 DEFAULT 0 CODEC(ZSTD(1)),

    -- Labels / Dimensions
    Labels             Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    DroppedLabelsCount UInt32 DEFAULT 0 CODEC(ZSTD(1)),

    -- Resource-level attributes
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),

    -- Cost / Usage
    Bytes              UInt64 CODEC(ZSTD(3)),

    -- Indexes
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
SETTINGS
    index_granularity = 8192,
    ttl_only_drop_parts = 1;

-- ============================================
-- PROFILES DATABASE
-- ============================================

CREATE TABLE IF NOT EXISTS profiles.profiling_v1
(
    -- Core metadata
    Timestamp           DateTime64(9) CODEC(Delta, LZ4HC(1)),
    AccountId           UInt64 CODEC(ZSTD(3)),
    RetentionDays       UInt16 DEFAULT 30 CODEC(ZSTD(3)),

    -- Host / Infrastructure Identity
    HostID              LowCardinality(String),
    HostName            LowCardinality(String),
    HostIP              LowCardinality(String),
    HostArch            LowCardinality(String),
    NodeName            LowCardinality(String),
    ClusterName         LowCardinality(String),

    -- Agent Metadata
    AgentName           LowCardinality(String),
    AgentVersion        LowCardinality(String),

    -- Application / Service Context
    Env                 LowCardinality(String),
    ServiceName         LowCardinality(String),
    ServiceVersion      LowCardinality(String),

    -- Kubernetes Context
    Namespace           LowCardinality(String),
    Pod                 LowCardinality(String),
    Container           LowCardinality(String),
    ContainerID         String,

    -- Profiling Metadata
    ProfileType         LowCardinality(String) CODEC(ZSTD(3)),
    ProcessID           String CODEC(ZSTD(3)),
    Runtime             LowCardinality(String) CODEC(ZSTD(3)),
    RuntimeVersion      LowCardinality(String) CODEC(ZSTD(3)),

    -- Sample Information
    SampleValue         UInt64 CODEC(ZSTD(3)),
    SampleCount         UInt64 CODEC(ZSTD(3)),

    -- Profiling Time Range
    StartTime           DateTime64(9) CODEC(Delta, LZ4HC(1)),
    EndTime             DateTime64(9) CODEC(Delta, LZ4HC(1)),

    -- Stack / Function Details
    StackHash           UInt64 CODEC(ZSTD(3)),
    StackFrames         Array(String) CODEC(LZ4HC(1)),
    FunctionNames       Array(String) CODEC(LZ4HC(1)),
    FunctionFiles       Array(String) CODEC(LZ4HC(1)),
    FunctionLines       Array(Int64) CODEC(ZSTD(3)),
    FunctionCount       UInt16 CODEC(ZSTD(3)),

    -- Labels / Attributes
    Labels              Map(LowCardinality(String), String) CODEC(ZSTD(3)),
    ProfilingLabels     Map(LowCardinality(String), String) CODEC(ZSTD(3)),
    ProfilingNumLabels  Map(LowCardinality(String), Int64) CODEC(ZSTD(3)),

    -- Last seen timestamp
    LastSeen            DateTime64(9) CODEC(Delta, LZ4HC(1)),

    -- Cost / Usage
    Bytes               UInt64 CODEC(ZSTD(3)),

    -- Indexes
    INDEX idx_profile_type      ProfileType TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_service_name      ServiceName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_host_name         HostName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_runtime           Runtime TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_label_keys        mapKeys(Labels) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_label_values      mapValues(Labels) TYPE bloom_filter(0.01) GRANULARITY 1
)
ENGINE = MergeTree
PARTITION BY (toDate(LastSeen), AccountId)
ORDER BY (AccountId, ServiceName, ProfileType, Timestamp)
TTL toDateTime(LastSeen) + toIntervalDay(RetentionDays)
SETTINGS
    index_granularity = 8192,
    ttl_only_drop_parts = 1;

-- ============================================
-- TRACES DATABASE
-- ============================================

CREATE TABLE IF NOT EXISTS traces.traces_v1
(
    -- Core metadata
    Timestamp          DateTime64(9) CODEC(Delta, ZSTD(1)),
    AccountId          UInt64 CODEC(ZSTD(1)),
    RetentionDays      UInt16 DEFAULT 30 CODEC(ZSTD(1)),

    -- Host / Infrastructure Identity
    HostID             LowCardinality(String),
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
    ContainerID        String,

    -- Trace identifiers
    TraceId            String CODEC(ZSTD(1)),
    SpanId             String CODEC(ZSTD(1)),
    ParentSpanId       String CODEC(ZSTD(1)),
    TraceState         LowCardinality(String) CODEC(ZSTD(1)),
    TraceFlags         UInt32 CODEC(ZSTD(1)),

    -- Span info
    Name               LowCardinality(String) CODEC(ZSTD(1)),
    Kind               UInt8 CODEC(ZSTD(1)),
    StartTimeUnixNano  UInt64 CODEC(Delta, ZSTD(1)),
    EndTimeUnixNano    UInt64 CODEC(Delta, ZSTD(1)),

    -- Span attributes
    Attributes         Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    DroppedAttributesCount UInt32 CODEC(ZSTD(1)),

    -- Span events
    Events             Array(Map(String, String)) CODEC(ZSTD(1)),
    DroppedEventsCount UInt32 CODEC(ZSTD(1)),

    -- Span links
    Links              Array(Map(String, String)) CODEC(ZSTD(1)),
    DroppedLinksCount  UInt32 CODEC(ZSTD(1)),

    -- Status
    StatusCode         UInt32 CODEC(ZSTD(1)),
    StatusMessage      String CODEC(ZSTD(1)),

    -- Resource and agent info
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),

    -- Cost / Usage
    Bytes              UInt64 CODEC(ZSTD(3)),

    -- Indexes
    INDEX idx_trace_id      TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_service_name  ServiceName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_attr_key      mapKeys(Attributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_attr_value    mapValues(Attributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_agent_name    AgentName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_env           Env TYPE bloom_filter(0.01) GRANULARITY 1
)
ENGINE = MergeTree
PARTITION BY (toDate(Timestamp), AccountId)
ORDER BY (AccountId, ServiceName, Timestamp)
TTL toDateTime(Timestamp) + toIntervalDay(RetentionDays)
SETTINGS
    index_granularity = 8192,
    ttl_only_drop_parts = 1;
