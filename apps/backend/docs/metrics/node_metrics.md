## ✅ **Node Resource Metrics (Aligned Format)**

### **CPU**

```
node_resources_cpu_usage_seconds_total
Type: Counter
Labels: mode

node_resources_cpu_logical_cores
Type: Counter
Labels: -
```

### **Memory**

```
node_resources_memory_total_bytes
Type: Gauge
Labels: -

node_resources_memory_free_bytes
Type: Gauge
Labels: -

node_resources_memory_available_bytes
Type: Gauge
Labels: -

node_resources_memory_cached_bytes
Type: Gauge
Labels: -
```

### **Disk**

```
node_resources_disk_reads_total
Type: Counter
Labels: device

node_resources_disk_writes_total
Type: Counter
Labels: device

node_resources_disk_read_bytes_total
Type: Counter
Labels: device

node_resources_disk_written_bytes_total
Type: Counter
Labels: device

node_resources_disk_read_time_seconds_total
Type: Counter
Labels: device

node_resources_disk_write_time_seconds_total
Type: Counter
Labels: device

node_resources_disk_io_time_seconds_total
Type: Counter
Labels: device
```

### **Network**

```
node_net_received_bytes_total
Type: Counter
Labels: interface

node_net_received_packets_total
Type: Counter
Labels: interface

node_net_transmitted_bytes_total
Type: Counter
Labels: interface

node_net_transmitted_packets_total
Type: Counter
Labels: interface

node_net_interface_up
Type: Gauge
Labels: interface

node_net_interface_ip
Type: Gauge
Labels: interface, ip
```

### **GPU**

```
node_gpu_info
Type: Gauge
Labels: gpu_uuid, name

node_resources_gpu_memory_total_bytes
Type: Gauge
Labels: gpu_uuid

node_resources_gpu_memory_used_bytes
Type: Gauge
Labels: gpu_uuid

node_resources_gpu_memory_utilization_percent_avg
Type: Gauge
Labels: gpu_uuid

node_resources_gpu_memory_utilization_percent_peak
Type: Gauge
Labels: gpu_uuid

node_resources_gpu_utilization_percent_avg
Type: Gauge
Labels: gpu_uuid

node_resources_gpu_utilization_percent_peak
Type: Gauge
Labels: gpu_uuid

node_resources_gpu_temperature_celsius
Type: Gauge
Labels: gpu_uuid

node_resources_gpu_power_usage_watts
Type: Gauge
Labels: gpu_uuid
```

### **Node Meta**

```
node_uptime_seconds
Type: Gauge
Labels: -

node_info
Type: Gauge
Labels: hostname, kernel_version, agent_version

node_cloud_info
Type: Gauge
Labels:
  provider,
  account_id,
  instance_id,
  instance_type,
  instance_life_cycle,
  region,
  availability_zone,
  availability_zone_id,
  local_ipv4,
  public_ipv4
```

