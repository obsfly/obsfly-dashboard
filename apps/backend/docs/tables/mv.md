# Materialized Views for ObsFly Production

This document contains all materialized views that should be created in production for optimal query performance.

## Dashboard Summary Aggregations

### Hourly Metrics Rollup
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics.metrics_hourly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour_bucket)
ORDER BY (AccountId, ServiceName, MetricName, hour_bucket)
AS SELECT
    AccountId,
    ServiceName,
    MetricName,
    toStartOfHour(Timestamp) as hour_bucket,
    count() as sample_count,
    avg(Value) as avg_value,
    min(Value) as min_value,
    max(Value) as max_value,
    sum(Value) as sum_value,
    quantile(0.50)(Value) as p50_value,
    quantile(0.95)(Value) as p95_value,
    quantile(0.99)(Value) as p99_value,
    sum(Bytes) as total_bytes
FROM metrics.metrics_v1
GROUP BY AccountId, ServiceName, MetricName, hour_bucket;
```

### Service Performance Summary
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics.service_performance_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(time_bucket)
ORDER BY (AccountId, ServiceName, time_bucket)
AS SELECT
    AccountId,
    ServiceName,
    toStartOfMinute(Timestamp) as time_bucket,
    uniqState(Pod) as unique_pods,
    countState() as request_count,
    avgState(Value) as avg_latency,
    quantileState(0.95)(Value) as p95_latency,
    sumState(CASE WHEN Labels['status'] >= '400' THEN 1 ELSE 0 END) as error_count
FROM metrics.metrics_v1
WHERE MetricName = 'container_http_requests_duration_seconds_total'
GROUP BY AccountId, ServiceName, time_bucket;
```

## Log Aggregations

### Log Volume by Service and Level
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS logs.log_volume_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(time_bucket)
ORDER BY (AccountId, ServiceName, SeverityText, time_bucket)
AS SELECT
    AccountId,
    ServiceName,
    SeverityText,
    toStartOfMinute(Timestamp) as time_bucket,
    count() as log_count,
    sum(Bytes) as total_bytes
FROM logs.logs_v1
GROUP BY AccountId, ServiceName, SeverityText, time_bucket;
```

### Log Patterns
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS logs.log_patterns_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(time_bucket)
ORDER BY (AccountId, ServiceName, BodyHash, time_bucket)
AS SELECT
    AccountId,
    ServiceName,
    BodyHash,
    PatternHash,
    toStartOfHour(Timestamp) as time_bucket,
    any(Body) as sample_body,
    any(SeverityText) as severity,
    count() as occurrence_count
FROM logs.logs_v1
WHERE BodyHash != ''
GROUP BY AccountId, ServiceName, BodyHash, PatternHash, time_bucket;
```

## Trace Aggregations

### Trace Latency Percentiles
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS traces.trace_latency_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(time_bucket)
ORDER BY (AccountId, ServiceName, Name, time_bucket)
AS SELECT
    AccountId,
    ServiceName,
    Name as operation_name,
    toStartOfMinute(Timestamp) as time_bucket,
    countState() as span_count,
    avgState((EndTimeUnixNano - StartTimeUnixNano) / 1000000) as avg_duration_ms,
    quantileState(0.50)((EndTimeUnixNano - StartTimeUnixNano) / 1000000) as p50_duration_ms,
    quantileState(0.95)((EndTimeUnixNano - StartTimeUnixNano) / 1000000) as p95_duration_ms,
    quantileState(0.99)((EndTimeUnixNano - StartTimeUnixNano) / 1000000) as p99_duration_ms,
    sumState(CASE WHEN StatusCode = 2 THEN 1 ELSE 0 END) as error_count
FROM traces.traces_v1
GROUP BY AccountId, ServiceName, operation_name, time_bucket;
```

### Service Dependency Map
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS traces.service_dependencies_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(time_bucket)
ORDER BY (AccountId, from_service, to_service, time_bucket)
AS SELECT
    AccountId,
    ServiceName as from_service,
    Attributes['peer.service'] as to_service,
    toStartOfHour(Timestamp) as time_bucket,
    countState() as call_count,
    avgState((EndTimeUnixNano - StartTimeUnixNano) / 1000000) as avg_latency_ms,
    sumState(CASE WHEN StatusCode = 2 THEN 1 ELSE 0 END) as error_count
FROM traces.traces_v1
WHERE mapContains(Attributes, 'peer.service')
GROUP BY AccountId, from_service, to_service, time_bucket;
```

## Infrastructure Aggregations

### Node Resource Usage
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics.node_resources_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(time_bucket)
ORDER BY (AccountId, HostId, time_bucket)
AS SELECT
    AccountId,
    HostId,
    any(HostName) as hostname,
    any(HostIP) as ip,
    toStartOfMinute(Timestamp) as time_bucket,
    avgStateIf(Value, MetricName = 'node_resources_cpu_usage_seconds_total') as avg_cpu,
    maxStateIf(Value, MetricName = 'node_resources_memory_total_bytes') as max_memory_total,
    avgStateIf(Value, MetricName = 'node_resources_memory_free_bytes') as avg_memory_free,
    avgStateIf(Value, MetricName = 'node_resources_disk_io_time_seconds_total') as avg_disk_io,
    sumStateIf(Value, MetricName = 'node_net_received_bytes_total') as sum_net_rx,
    sumStateIf(Value, MetricName = 'node_net_transmitted_bytes_total') as sum_net_tx
FROM metrics.metrics_v1
WHERE MetricName LIKE 'node_%'
GROUP BY AccountId, HostId, time_bucket;
```

## Profile Aggregations

### Profile Sample Aggregation
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS profiles.profile_samples_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(time_bucket)
ORDER BY (AccountId, ServiceName, ProfileType, StackHash, time_bucket)
AS SELECT
    AccountId,
    ServiceName,
    ProfileType,
    Runtime,
    StackHash,
    toStartOfHour(Timestamp) as time_bucket,
    any(FunctionNames) as function_names,
    any(FunctionFiles) as function_files,
    sum(SampleValue) as total_value,
    sum(SampleCount) as total_samples
FROM profiles.profiling_v1
GROUP BY AccountId, ServiceName, ProfileType, Runtime, StackHash, time_bucket;
```

## Usage Tracking

### Data Ingestion by Account
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics.data_ingestion_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day_bucket)
ORDER BY (AccountId, data_type, day_bucket)
AS
SELECT AccountId, 'metrics' as data_type, toDate(Timestamp) as day_bucket, count() as record_count, sum(Bytes) as total_bytes
FROM metrics.metrics_v1
GROUP BY AccountId, day_bucket
UNION ALL
SELECT AccountId, 'logs' as data_type, toDate(Timestamp) as day_bucket, count() as record_count, sum(Bytes) as total_bytes
FROM logs.logs_v1
GROUP BY AccountId, day_bucket
UNION ALL
SELECT AccountId, 'traces' as data_type, toDate(Timestamp) as day_bucket, count() as record_count, sum(Bytes) as total_bytes
FROM traces.traces_v1
GROUP BY AccountId, day_bucket
UNION ALL
SELECT AccountId, 'profiles' as data_type, toDate(Timestamp) as day_bucket, count() as record_count, sum(Bytes) as total_bytes
FROM profiles.profiling_v1
GROUP BY AccountId, day_bucket;
```

## Deployment Instructions

1. **Create all databases first** (if not already done):
   ```sql
   CREATE DATABASE IF NOT EXISTS logs;
   CREATE DATABASE IF NOT EXISTS metrics;
   CREATE DATABASE IF NOT EXISTS profiles;
   CREATE DATABASE IF NOT EXISTS traces;
   ```

2. **Create base tables** using the production schema

3. **Create materialized views** in order:
   - Start with simple aggregations (hourly rollups)
   - Then create dependent views
   - Monitor disk usage as MVs are populated

4. **Verify MV population**:
   ```sql
   SELECT database, name, total_rows 
   FROM system.tables 
   WHERE name LIKE '%_mv' 
   ORDER BY database, name;
   ```

5. **Monitor MV performance**:
   ```sql
   SELECT 
       database,
       table,
       formatReadableSize(sum(bytes)) as size,
       sum(rows) as rows
   FROM system.parts
   WHERE table LIKE '%_mv'
   GROUP BY database, table
   ORDER BY sum(bytes) DESC;
   ```

## Notes

- All MVs use appropriate partitioning by month for efficient data management
- TTL is inherited from source tables
- MVs automatically update as new data arrives
- For production, consider creating MVs with `POPULATE` keyword to backfill historical data
- Monitor query performance and adjust MV granularity as needed
