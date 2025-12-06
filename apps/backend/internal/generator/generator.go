package generator

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/namlabs/obsfly/backend/internal/store"
)

type DataGenerator struct {
	config *Config
	store  *store.Store
	nodes  []Node
}

func NewDataGenerator(cfg *Config, st *store.Store) *DataGenerator {
	return &DataGenerator{
		config: cfg,
		store:  st,
		nodes:  GenerateNodes(cfg),
	}
}

func (dg *DataGenerator) Start(ctx context.Context) {
	ticker := time.NewTicker(time.Duration(dg.config.Generation.IntervalSeconds) * time.Second)
	defer ticker.Stop()

	fmt.Printf("Starting data generator with %d nodes\n", len(dg.nodes))
	for _, node := range dg.nodes {
		fmt.Printf("  - %s (%s) with %d services\n", node.Hostname, node.Type, len(node.Services))
	}

	for {
		select {
		case <-ctx.Done():
			fmt.Println("Data generator shutting down")
			return
		case <-ticker.C:
			if err := dg.generateBatch(ctx); err != nil {
				fmt.Printf("Error generating data: %v\n", err)
			}
		}
	}
}

func (dg *DataGenerator) generateBatch(ctx context.Context) error {
	timestamp := time.Now()
	var metrics []store.Metric
	var logs []store.Log
	var traces []store.Trace
	var profiles []store.Profile

	for _, node := range dg.nodes {
		// Generate node-level metrics
		metrics = append(metrics, dg.generateNodeMetrics(node, timestamp)...)

		// Generate service-level data
		for _, service := range node.Services {
			metrics = append(metrics, dg.generateServiceMetrics(node, service, timestamp)...)
			logs = append(logs, dg.generateLogs(node, service, timestamp)...)
			traces = append(traces, dg.generateTraces(node, service, timestamp)...)
			profiles = append(profiles, dg.generateProfiles(node, service, timestamp)...)
		}
	}

	if err := dg.store.InsertMetrics(ctx, metrics); err != nil {
		return fmt.Errorf("failed to insert metrics: %w", err)
	}
	if len(logs) > 0 {
		if err := dg.store.InsertLogs(ctx, logs); err != nil {
			return fmt.Errorf("failed to insert logs: %w", err)
		}
	}
	if len(traces) > 0 {
		if err := dg.store.InsertTraces(ctx, traces); err != nil {
			return fmt.Errorf("failed to insert traces: %w", err)
		}
	}
	if len(profiles) > 0 {
		if err := dg.store.InsertProfiles(ctx, profiles); err != nil {
			return fmt.Errorf("failed to insert profiles: %w", err)
		}
	}

	fmt.Printf("[%s] Generated %d metrics, %d logs, %d traces, %d profiles for %d nodes\n",
		timestamp.Format("15:04:05"), len(metrics), len(logs), len(traces), len(profiles), len(dg.nodes))
	return nil
}

func (dg *DataGenerator) generateNodeMetrics(node Node, timestamp time.Time) []store.Metric {
	var metrics []store.Metric
	accountID := uint64(dg.config.Generation.AccountID)

	// Common Resource Attributes
	resourceAttrs := map[string]string{
		"host.id":   node.ID,
		"host.name": node.Hostname,
		"host.type": node.Type,
	}

	// Node Info
	metrics = append(metrics, store.Metric{
		Timestamp:  timestamp,
		AccountId:  accountID,
		MetricName: "node_info",
		MetricType: "gauge",
		Value:      1,
		Labels: map[string]string{
			"hostname":       node.Hostname,
			"kernel_version": "5.15.0-1048-aws",
			"agent_version":  "1.2.3",
			"arch":           node.Arch,
		},
		ResourceAttributes: resourceAttrs,
	})

	// Cloud Info (Enhanced with all labels)
	providers := []string{"aws", "gcp", "azure", "on-prem"}
	provider := providers[rand.Intn(len(providers))]

	cloudLabels := map[string]string{
		"provider":             provider,
		"account_id":           "123456789012",
		"instance_id":          fmt.Sprintf("i-%s", node.ID[:8]),
		"instance_type":        node.Type,
		"instance_life_cycle":  "on-demand",
		"region":               "us-east-1",
		"availability_zone":    "us-east-1a",
		"availability_zone_id": "use1-az1",
		"local_ipv4":           node.IP,
		"public_ipv4":          fmt.Sprintf("54.%d.%d.%d", rand.Intn(256), rand.Intn(256), rand.Intn(256)),
	}

	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_cloud_info",
		MetricType:         "gauge",
		Value:              1,
		Labels:             cloudLabels,
		ResourceAttributes: resourceAttrs,
	})

	// Uptime
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_uptime_seconds",
		MetricType:         "gauge",
		Value:              float64(time.Since(timestamp.Add(-24 * time.Hour)).Seconds()),
		Labels:             map[string]string{},
		ResourceAttributes: resourceAttrs,
	})

	// --- CPU ---
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_cpu_usage_seconds_total",
		MetricType:         "counter",
		Value:              node.CPUUsage * 100, // Mock cumulative
		Labels:             map[string]string{"mode": "user"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_cpu_logical_cores",
		MetricType:         "gauge",
		Value:              4, // Mock 4 cores
		Labels:             map[string]string{},
		ResourceAttributes: resourceAttrs,
	})
	// Added percentage metric for easier querying
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_cpu_usage_percent",
		MetricType:         "gauge",
		Value:              node.CPUUsage,
		Labels:             map[string]string{},
		ResourceAttributes: resourceAttrs,
	})

	// --- Memory ---
	totalMem := 16 * 1024 * 1024 * 1024.0 // 16GB
	usedMem := totalMem * (node.MemoryUsage / 100.0)
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_memory_total_bytes",
		MetricType:         "gauge",
		Value:              totalMem,
		Labels:             map[string]string{},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_memory_free_bytes",
		MetricType:         "gauge",
		Value:              totalMem - usedMem,
		Labels:             map[string]string{},
		ResourceAttributes: resourceAttrs,
	})
	// Added percentage metric
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_memory_usage_percent",
		MetricType:         "gauge",
		Value:              node.MemoryUsage,
		Labels:             map[string]string{},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_memory_available_bytes",
		MetricType:         "gauge",
		Value:              (totalMem - usedMem) + (1024 * 1024 * 1024), // Free + Cache
		Labels:             map[string]string{},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_memory_cached_bytes",
		MetricType:         "gauge",
		Value:              1024 * 1024 * 1024, // 1GB Cache
		Labels:             map[string]string{},
		ResourceAttributes: resourceAttrs,
	})

	// --- Disk ---
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_disk_io_time_seconds_total",
		MetricType:         "counter",
		Value:              node.DiskUsage * 10,
		Labels:             map[string]string{"device": "nvme0n1"},
		ResourceAttributes: resourceAttrs,
	})
	// Added percentage metric
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_disk_usage_percent",
		MetricType:         "gauge",
		Value:              node.DiskUsage,
		Labels:             map[string]string{"device": "nvme0n1"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_disk_reads_total",
		MetricType:         "counter",
		Value:              node.DiskUsage * 100,
		Labels:             map[string]string{"device": "nvme0n1"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_disk_writes_total",
		MetricType:         "counter",
		Value:              node.DiskUsage * 50,
		Labels:             map[string]string{"device": "nvme0n1"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_disk_read_bytes_total",
		MetricType:         "counter",
		Value:              node.DiskUsage * 1024 * 1024,
		Labels:             map[string]string{"device": "nvme0n1"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_disk_written_bytes_total",
		MetricType:         "counter",
		Value:              node.DiskUsage * 512 * 1024,
		Labels:             map[string]string{"device": "nvme0n1"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_disk_read_time_seconds_total",
		MetricType:         "counter",
		Value:              node.DiskUsage * 0.5,
		Labels:             map[string]string{"device": "nvme0n1"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_resources_disk_write_time_seconds_total",
		MetricType:         "counter",
		Value:              node.DiskUsage * 0.2,
		Labels:             map[string]string{"device": "nvme0n1"},
		ResourceAttributes: resourceAttrs,
	})

	// --- Network ---
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_net_received_bytes_total",
		MetricType:         "counter",
		Value:              node.NetworkMB * 1024 * 1024,
		Labels:             map[string]string{"interface": "eth0"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_net_transmitted_bytes_total",
		MetricType:         "counter",
		Value:              node.NetworkMB * 1024 * 1024 * 0.8, // Slightly less transmit
		Labels:             map[string]string{"interface": "eth0"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_net_received_packets_total",
		MetricType:         "counter",
		Value:              node.NetworkMB * 1000,
		Labels:             map[string]string{"interface": "eth0"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_net_transmitted_packets_total",
		MetricType:         "counter",
		Value:              node.NetworkMB * 800,
		Labels:             map[string]string{"interface": "eth0"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_net_interface_up",
		MetricType:         "gauge",
		Value:              1,
		Labels:             map[string]string{"interface": "eth0"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		MetricName:         "node_net_interface_ip",
		MetricType:         "gauge",
		Value:              1,
		Labels:             map[string]string{"interface": "eth0", "ip": node.IP},
		ResourceAttributes: resourceAttrs,
	})

	// --- GPU (Mocked for some nodes with comprehensive metrics) ---
	if rand.Float64() < 0.2 { // 20% of nodes have GPU
		gpuUUID := fmt.Sprintf("GPU-%s", node.ID[:8])
		gpuMemTotal := 16 * 1024 * 1024 * 1024.0 // 16GB GPU memory
		gpuUtil := rand.Float64() * 100
		gpuMemUtil := rand.Float64() * 100
		gpuMemUsed := gpuMemTotal * (gpuMemUtil / 100.0)

		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			MetricName:         "node_gpu_info",
			MetricType:         "gauge",
			Value:              1,
			Labels:             map[string]string{"gpu_uuid": gpuUUID, "name": "NVIDIA Tesla T4"},
			ResourceAttributes: resourceAttrs,
		})
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			MetricName:         "node_resources_gpu_memory_total_bytes",
			MetricType:         "gauge",
			Value:              gpuMemTotal,
			Labels:             map[string]string{"gpu_uuid": gpuUUID},
			ResourceAttributes: resourceAttrs,
		})
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			MetricName:         "node_resources_gpu_memory_used_bytes",
			MetricType:         "gauge",
			Value:              gpuMemUsed,
			Labels:             map[string]string{"gpu_uuid": gpuUUID},
			ResourceAttributes: resourceAttrs,
		})
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			MetricName:         "node_resources_gpu_utilization_percent_avg",
			MetricType:         "gauge",
			Value:              gpuUtil,
			Labels:             map[string]string{"gpu_uuid": gpuUUID},
			ResourceAttributes: resourceAttrs,
		})
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			MetricName:         "node_resources_gpu_utilization_percent_peak",
			MetricType:         "gauge",
			Value:              gpuUtil + rand.Float64()*10, // Peak slightly higher
			Labels:             map[string]string{"gpu_uuid": gpuUUID},
			ResourceAttributes: resourceAttrs,
		})
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			MetricName:         "node_resources_gpu_memory_utilization_percent_avg",
			MetricType:         "gauge",
			Value:              gpuMemUtil,
			Labels:             map[string]string{"gpu_uuid": gpuUUID},
			ResourceAttributes: resourceAttrs,
		})
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			MetricName:         "node_resources_gpu_memory_utilization_percent_peak",
			MetricType:         "gauge",
			Value:              gpuMemUtil + rand.Float64()*10, // Peak slightly higher
			Labels:             map[string]string{"gpu_uuid": gpuUUID},
			ResourceAttributes: resourceAttrs,
		})
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			MetricName:         "node_resources_gpu_temperature_celsius",
			MetricType:         "gauge",
			Value:              60 + rand.Float64()*30, // 60-90°C
			Labels:             map[string]string{"gpu_uuid": gpuUUID},
			ResourceAttributes: resourceAttrs,
		})
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			MetricName:         "node_resources_gpu_power_usage_watts",
			MetricType:         "gauge",
			Value:              70 + rand.Float64()*100, // 70-170W
			Labels:             map[string]string{"gpu_uuid": gpuUUID},
			ResourceAttributes: resourceAttrs,
		})
	}

	return metrics
}

func (dg *DataGenerator) generateServiceMetrics(node Node, service Service, timestamp time.Time) []store.Metric {
	var metrics []store.Metric
	accountID := uint64(dg.config.Generation.AccountID)

	containerID := fmt.Sprintf("container-%s-%s", node.Hostname, service.Name)

	// Common Resource Attributes
	resourceAttrs := map[string]string{
		"service.name":    service.Name,
		"service.version": service.Version,
		"host.id":         node.ID,
		"host.name":       node.Hostname,
		"container.id":    containerID,
		"k8s.pod.name":    fmt.Sprintf("%s-pod", service.Name),
		"k8s.namespace":   "default",
	}

	// Determine load factor (higher CPU = higher load)
	loadFactor := node.CPUUsage / 100.0

	// Request rate
	baseRPS := 10 + rand.Float64()*90
	requestRate := baseRPS * (1 + loadFactor)

	// Error rate
	errorRate := dg.config.Traces.ErrorRate
	if loadFactor > 0.8 {
		errorRate *= 2 // Double errors under high load
	}
	errorCount := requestRate * errorRate

	// --- Application Metrics (HTTP) ---
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_http_requests_total",
		MetricType:         "counter",
		Value:              requestRate,
		Labels:             map[string]string{"status": "200", "method": "GET", "container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})

	if errorCount > 0 {
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			ServiceName:        service.Name,
			MetricName:         "container_http_requests_total",
			MetricType:         "counter",
			Value:              errorCount,
			Labels:             map[string]string{"status": "500", "method": "GET", "container_id": containerID},
			ResourceAttributes: resourceAttrs,
		})
	}

	// Latency
	baseLatency := 100.0                           // ms
	p95Latency := baseLatency * (1 + loadFactor*2) // Higher latency under load
	if rand.Float64() < 0.05 {
		p95Latency += 500 // Occasional spikes
	}

	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "http_request_duration_ms_p95",
		MetricType:         "gauge",
		Value:              p95Latency,
		Labels:             map[string]string{"container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})

	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_http_requests_duration_seconds_total",
		MetricType:         "counter",
		Value:              p95Latency / 1000 * requestRate,
		Labels:             map[string]string{"container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})

	// --- Container Resources ---

	// CPU
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_resources_cpu_usage_seconds_total",
		MetricType:         "counter",
		Value:              node.CPUUsage / 100.0 * 0.1,
		Labels:             map[string]string{"container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_resources_cpu_limit_cores",
		MetricType:         "gauge",
		Value:              2.0,
		Labels:             map[string]string{"container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_resources_cpu_throttled_seconds_total",
		MetricType:         "counter",
		Value:              node.CPUUsage * 0.01,
		Labels:             map[string]string{"container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})

	// Memory
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_resources_memory_rss_bytes",
		MetricType:         "gauge",
		Value:              node.MemoryUsage * 1024 * 1024,
		Labels:             map[string]string{"container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_resources_memory_limit_bytes",
		MetricType:         "gauge",
		Value:              512 * 1024 * 1024, // 512MB Limit
		Labels:             map[string]string{"container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_resources_memory_cache_bytes",
		MetricType:         "gauge",
		Value:              128 * 1024 * 1024,
		Labels:             map[string]string{"container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})

	// Disk
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_resources_disk_read_bytes_total",
		MetricType:         "counter",
		Value:              node.DiskUsage * 1024,
		Labels:             map[string]string{"container_id": containerID, "device": "sda"},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_resources_disk_written_bytes_total",
		MetricType:         "counter",
		Value:              node.DiskUsage * 512,
		Labels:             map[string]string{"container_id": containerID, "device": "sda"},
		ResourceAttributes: resourceAttrs,
	})

	// Network
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_net_tcp_successful_connects_total",
		MetricType:         "counter",
		Value:              requestRate,
		Labels:             map[string]string{"container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_net_tcp_active_connections",
		MetricType:         "gauge",
		Value:              requestRate / 10,
		Labels:             map[string]string{"container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})

	// --- Runtime Metrics ---
	if service.Language == "java" {
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			ServiceName:        service.Name,
			MetricName:         "container_jvm_heap_used_bytes",
			MetricType:         "gauge",
			Value:              node.MemoryUsage * 1024 * 1024 * 0.8,
			Labels:             map[string]string{"container_id": containerID, "jvm": "openjdk"},
			ResourceAttributes: resourceAttrs,
		})
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			ServiceName:        service.Name,
			MetricName:         "container_jvm_gc_time_seconds",
			MetricType:         "counter",
			Value:              node.CPUUsage * 0.05,
			Labels:             map[string]string{"container_id": containerID, "gc": "G1"},
			ResourceAttributes: resourceAttrs,
		})
	} else if service.Language == "nodejs" {
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			ServiceName:        service.Name,
			MetricName:         "container_nodejs_event_loop_blocked_time_seconds_total",
			MetricType:         "counter",
			Value:              node.CPUUsage * 0.02,
			Labels:             map[string]string{"container_id": containerID},
			ResourceAttributes: resourceAttrs,
		})
	}

	// --- Logs ---
	logVolume := requestRate * 0.8
	metrics = append(metrics, store.Metric{
		Timestamp:          timestamp,
		AccountId:          accountID,
		ServiceName:        service.Name,
		MetricName:         "container_log_messages_total",
		MetricType:         "counter",
		Value:              logVolume,
		Labels:             map[string]string{"level": "INFO", "source": "stdout", "container_id": containerID},
		ResourceAttributes: resourceAttrs,
	})

	if errorCount > 0 {
		metrics = append(metrics, store.Metric{
			Timestamp:          timestamp,
			AccountId:          accountID,
			ServiceName:        service.Name,
			MetricName:         "container_log_messages_total",
			MetricType:         "counter",
			Value:              errorCount,
			Labels:             map[string]string{"level": "ERROR", "source": "stderr", "container_id": containerID},
			ResourceAttributes: resourceAttrs,
		})
	}

	return metrics
}

func (dg *DataGenerator) generateLogs(node Node, service Service, timestamp time.Time) []store.Log {
	var logs []store.Log
	accountID := uint64(dg.config.Generation.AccountID)
	containerID := fmt.Sprintf("container-%s-%s", node.Hostname, service.Name)

	// Determine load factor
	loadFactor := node.CPUUsage / 100.0
	baseRPS := 10 + rand.Float64()*90
	requestRate := baseRPS * (1 + loadFactor)

	// Generate some logs based on request rate (scaled down)
	logCount := int(requestRate * 0.1)
	if logCount < 1 {
		logCount = 1
	}

	for i := 0; i < logCount; i++ {
		severity := "INFO"
		body := fmt.Sprintf("Request processed successfully for %s", service.Name)
		if rand.Float64() < 0.05 { // 5% error rate
			severity = "ERROR"
			body = fmt.Sprintf("Failed to process request: timeout connecting to database")
		} else if rand.Float64() < 0.1 {
			severity = "WARN"
			body = "Response time above threshold"
		}

		logs = append(logs, store.Log{
			Timestamp:      timestamp,
			AccountId:      accountID,
			HostName:       node.Hostname,
			HostIP:         node.IP,
			HostArch:       node.Arch,
			NodeName:       node.Hostname,
			ClusterName:    node.Cluster,
			ServiceName:    service.Name,
			ServiceVersion: service.Version,
			ContainerId:    containerID,
			Source:         "stdout",
			SeverityText:   severity,
			Body:           body,
			TraceId:        fmt.Sprintf("%032x", rand.Int63()),
			SpanId:         fmt.Sprintf("%016x", rand.Int63()),
			LogAttributes: map[string]string{
				"http.method": "GET",
				"http.path":   "/api/v1/resource",
			},
			ResourceAttributes: map[string]string{
				"service.name": service.Name,
				"host.name":    node.Hostname,
			},
		})
	}
	return logs
}

func (dg *DataGenerator) generateTraces(node Node, service Service, timestamp time.Time) []store.Trace {
	var traces []store.Trace
	accountID := uint64(dg.config.Generation.AccountID)
	containerID := fmt.Sprintf("container-%s-%s", node.Hostname, service.Name)

	// Generate a few traces per batch
	traceCount := 2 + rand.Intn(3) // 2-4 traces
	for i := 0; i < traceCount; i++ {
		traceID := fmt.Sprintf("%032x", rand.Int63())
		spanID := fmt.Sprintf("%016x", rand.Int63())

		// Determine duration and status
		var duration time.Duration
		statusCode := uint32(1) // OK
		statusMessage := "OK"
		httpStatus := "200"

		randVal := rand.Float64()
		if randVal < 0.05 { // 5% very slow traces (> 1s)
			duration = time.Duration(1000+rand.Intn(2000)) * time.Millisecond
		} else if randVal < 0.15 { // 10% slow traces (500ms - 1s)
			duration = time.Duration(500+rand.Intn(500)) * time.Millisecond
		} else { // Normal traces
			duration = time.Duration(10+rand.Intn(200)) * time.Millisecond
		}

		// Occasional errors
		if rand.Float64() < 0.05 {
			statusCode = 2 // Error
			statusMessage = "Internal Server Error"
			httpStatus = "500"
		}

		traces = append(traces, store.Trace{
			Timestamp:         timestamp,
			AccountId:         accountID,
			HostName:          node.Hostname,
			ServiceName:       service.Name,
			ServiceVersion:    service.Version,
			ContainerID:       containerID,
			TraceId:           traceID,
			SpanId:            spanID,
			Name:              fmt.Sprintf("HTTP GET /api/%s", service.Name),
			Kind:              1, // Server
			StartTimeUnixNano: uint64(timestamp.UnixNano()),
			EndTimeUnixNano:   uint64(timestamp.Add(duration).UnixNano()),
			StatusCode:        statusCode,
			StatusMessage:     statusMessage,
			Attributes: map[string]string{
				"http.method":      "GET",
				"http.status_code": httpStatus,
				"http.target":      fmt.Sprintf("/api/%s/resource", service.Name),
			},
			ResourceAttributes: map[string]string{
				"service.name": service.Name,
				"host.name":    node.Hostname,
			},
		})
	}
	return traces
}

func (dg *DataGenerator) generateProfiles(node Node, service Service, timestamp time.Time) []store.Profile {
	var profiles []store.Profile
	accountID := uint64(dg.config.Generation.AccountID)
	containerID := fmt.Sprintf("container-%s-%s", node.Hostname, service.Name)

	// Generate CPU profile sample
	if rand.Float64() < 0.2 { // 20% chance per batch
		profiles = append(profiles, store.Profile{
			Timestamp:      timestamp,
			AccountId:      accountID,
			HostName:       node.Hostname,
			ServiceName:    service.Name,
			ServiceVersion: service.Version,
			ContainerID:    containerID,
			ProfileType:    "cpu",
			ProcessID:      "1234",
			Runtime:        service.Language,
			SampleValue:    uint64(rand.Intn(1000000)),
			SampleCount:    1,
			StartTime:      timestamp.Add(-10 * time.Second),
			EndTime:        timestamp,
			StackFrames:    []string{"main", "handler", "db_query"},
			FunctionNames:  []string{"main", "handler", "db_query"},
			FunctionFiles:  []string{"main.go", "handler.go", "db.go"},
			FunctionLines:  []int64{10, 25, 50},
			Labels:         map[string]string{"thread": "1"},
		})
	}
	return profiles
}
