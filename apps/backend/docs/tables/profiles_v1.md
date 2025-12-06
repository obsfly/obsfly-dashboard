-- version: 5
-- description: production-ready profiling table with runtime, process, and improved indexes
-- checksum: prod-ready

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
    ProfileType         LowCardinality(String) CODEC(ZSTD(3)),   -- cpu, heap, goroutine, allocs, etc.
    ProcessID           String CODEC(ZSTD(3)),                   -- OS process id
    Runtime             LowCardinality(String) CODEC(ZSTD(3)),   -- go, node, python, java, etc.
    RuntimeVersion      LowCardinality(String) CODEC(ZSTD(3)),   -- e.g., go1.22.1, node v20.8.0

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

    -- Last seen timestamp (used for TTL & incremental ingestion)
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
