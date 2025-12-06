
*(Every metric implicitly includes `container_id` label.)*

---

## **CPU**

```
container_resources_cpu_limit_cores
Type: Gauge
Labels: container_id

container_resources_cpu_usage_seconds_total
Type: Counter
Labels: container_id

container_resources_cpu_throttled_seconds_total
Type: Counter
Labels: container_id

container_resources_cpu_delay_seconds_total
Type: Counter
Labels: container_id

container_resources_cpu_pressure_waiting_seconds_total
Type: Counter
Labels: container_id, kind
```

---

## **Memory**

```
container_resources_memory_limit_bytes
Type: Gauge
Labels: container_id

container_resources_memory_rss_bytes
Type: Gauge
Labels: container_id

container_resources_memory_cache_bytes
Type: Gauge
Labels: container_id

container_oom_kills_total
Type: Counter
Labels: container_id

container_resources_memory_pressure_waiting_seconds_total
Type: Counter
Labels: container_id, kind
```

---

## **Disk & I/O**

```
container_resources_disk_delay_seconds_total
Type: Counter
Labels: container_id

container_resources_io_pressure_waiting_seconds_total
Type: Counter
Labels: container_id, kind

container_resources_disk_size_bytes
Type: Gauge
Labels: container_id, mount_point, device, volume

container_resources_disk_used_bytes
Type: Gauge
Labels: container_id, mount_point, device, volume

container_resources_disk_reads_total
Type: Counter
Labels: container_id, mount_point, device, volume

container_resources_disk_writes_total
Type: Counter
Labels: container_id, mount_point, device, volume

container_resources_disk_read_bytes_total
Type: Counter
Labels: container_id, mount_point, device, volume

container_resources_disk_written_bytes_total
Type: Counter
Labels: container_id, mount_point, device, volume
```

---

## **GPU**

```
container_resources_gpu_usage_percent
Type: Gauge
Labels: container_id, gpu_uuid

container_resources_gpu_memory_usage_percent
Type: Gauge
Labels: container_id, gpu_uuid
```

---

## **Network**

```
container_net_tcp_listen_info
Type: Gauge
Labels: container_id, listen_addr, proxy

container_net_tcp_successful_connects_total
Type: Counter
Labels: container_id, destination, actual_destination

container_net_tcp_retransmits_total
Type: Counter
Labels: container_id, destination, actual_destination

container_net_tcp_failed_connects_total
Type: Counter
Labels: container_id, destination

container_net_tcp_active_connections
Type: Gauge
Labels: container_id, destination, actual_destination

container_net_latency_seconds
Type: Gauge
Labels: container_id, destination_ip
```

---

# **Application Layer Protocol Metrics**

## **HTTP**

```
container_http_requests_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_http_requests_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

## **Postgres**

```
container_postgres_queries_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_postgres_queries_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

## **Redis**

```
container_redis_queries_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_redis_queries_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

## **Memcached**

```
container_memcached_queries_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_memcached_queries_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

## **MySQL**

```
container_mysql_queries_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_mysql_queries_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

## **MongoDB**

```
container_mongo_queries_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_mongo_queries_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

## **Kafka**

```
container_kafka_requests_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_kafka_requests_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

## **Cassandra**

```
container_cassandra_queries_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_cassandra_queries_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

## **RabbitMQ**

```
container_rabbitmq_messages_total
Type: Counter
Labels: container_id, destination, actual_destination, status, method
```

---

## **NATS**

```
container_nats_messages_total
Type: Counter
Labels: container_id, destination, actual_destination, method
```

---

## **Dubbo**

```
container_dubbo_requests_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_dubbo_requests_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

## **DNS**

```
container_dns_requests_total
Type: Counter
Labels: container_id, domain, request_type, status

container_dns_requests_duration_seconds_total
Type: Counter
Labels: container_id, le
```

---

## **ClickHouse**

```
container_clickhouse_requests_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_clickhouse_requests_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

## **ZooKeeper**

```
container_zookeeper_requests_total
Type: Counter
Labels: container_id, destination, actual_destination, status

container_zookeeper_requests_duration_seconds_total
Type: Counter
Labels: container_id, destination, actual_destination, le
```

---

# **JVM Metrics**

*(Each metric includes `container_id` + JVM labels.)*

```
container_jvm_info
Type: Gauge
Labels: container_id, jvm, java_version

container_jvm_heap_size_bytes
Type: Gauge
Labels: container_id, jvm

container_jvm_heap_used_bytes
Type: Gauge
Labels: container_id, jvm

container_jvm_gc_time_seconds
Type: Counter
Labels: container_id, jvm, gc

container_jvm_safepoint_time_seconds
Type: Counter
Labels: container_id, jvm

container_jvm_safepoint_sync_time_seconds
Type: Counter
Labels: container_id, jvm
```

---

# **Node.js Runtime**

```
container_nodejs_event_loop_blocked_time_seconds_total
Type: Counter
Labels: container_id
```

---

# **Python Runtime**

```
container_python_thread_lock_wait_time_seconds
Type: Counter
Labels: container_id
```

---

# **.NET Runtime**

*(Each metric includes `container_id` + application labels.)*

```
container_dotnet_info
Type: Gauge
Labels: container_id, application, runtime_version

container_dotnet_memory_allocated_bytes_total
Type: Counter
Labels: container_id, application

container_dotnet_exceptions_total
Type: Counter
Labels: container_id, application

container_dotnet_memory_heap_size_bytes
Type: Gauge
Labels: container_id, application, generation

container_dotnet_gc_count_total
Type: Counter
Labels: container_id, application, generation

container_dotnet_heap_fragmentation_percent
Type: Gauge
Labels: container_id, application

container_dotnet_monitor_lock_contentions_total
Type: Gauge
Labels: container_id, application

container_dotnet_thread_pool_completed_items_total
Type: Counter
Labels: container_id, application

container_dotnet_thread_pool_queue_length
Type: Gauge
Labels: container_id, application

container_dotnet_thread_pool_size
Type: Gauge
Labels: container_id, application
```

---

# **Other Container Metrics**

```
container_info
Type: Gauge
Labels: container_id, image

container_restarts_total
Type: Counter
Labels: container_id

container_application_type
Type: Gauge
Labels: container_id, application_type
```

---

# **Logs**

```
container_log_messages_total
Type: Counter
Labels: container_id, source, level, pattern_hash, sample
```