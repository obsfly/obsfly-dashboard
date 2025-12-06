-- version: 2
-- description: production-ready append-only metrics table with TTL and optimized indexes
-- checksum: prod-ready

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
    MetricType         LowCardinality(String) CODEC(ZSTD(1)),   -- e.g. gauge, counter, histogram
    Value              Float64 CODEC(ZSTD(1)),
    Count              UInt64 DEFAULT 1 CODEC(ZSTD(1)),          -- optional for aggregated metrics
    Sum                Float64 DEFAULT 0 CODEC(ZSTD(1)),         -- useful for histogram/sum metrics

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
