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
SETTINGS
    index_granularity = 8192,
    ttl_only_drop_parts = 1;
