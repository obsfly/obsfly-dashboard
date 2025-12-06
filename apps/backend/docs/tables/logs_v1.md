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
ORDER BY (AccountID, ServiceName, Timestamp)
TTL toDateTime(Timestamp) + toIntervalDay(RetentionDays)
SETTINGS index_granularity = 8192;
