package store

import (
	"context"
	"fmt"
	"time"
)

// DashboardSummary represents the top summary panel
type DashboardSummary struct {
	ActiveServices       uint64  `json:"active_services"`
	ActiveServicesChange float64 `json:"active_services_change"`
	ErrorRate            float64 `json:"error_rate"`
	ErrorRateChange      float64 `json:"error_rate_change"`
	AvgLatency           float64 `json:"avg_latency"`
	AvgLatencyChange     float64 `json:"avg_latency_change"`
	LogVolume            float64 `json:"log_volume"`
	LogVolumeChange      float64 `json:"log_volume_change"`
	Throughput           float64 `json:"throughput"`
	ThroughputChange     float64 `json:"throughput_change"`
	DataIngested         float64 `json:"data_ingested"`
	DataIngestedChange   float64 `json:"data_ingested_change"`
}

func (s *Store) GetDashboardSummary(ctx context.Context, accountId uint64, minutesAgo int) (*DashboardSummary, error) {
	query := `
		WITH
			now() - INTERVAL ? MINUTE as split_time,
			now() - INTERVAL ? * 2 MINUTE as start_time,
			
			-- Active Services
			uniqExactIf(ServiceName, Timestamp > split_time) as curr_active,
			uniqExactIf(ServiceName, Timestamp <= split_time AND Timestamp > start_time) as prev_active,
			
			-- Error Rate
			countIf(MetricName = 'container_http_requests_total' AND Labels['status'] = '500' AND Timestamp > split_time) / 
				nullIf(countIf(MetricName = 'container_http_requests_total' AND Timestamp > split_time), 0) as curr_error,
			countIf(MetricName = 'container_http_requests_total' AND Labels['status'] = '500' AND Timestamp <= split_time AND Timestamp > start_time) / 
				nullIf(countIf(MetricName = 'container_http_requests_total' AND Timestamp <= split_time AND Timestamp > start_time), 0) as prev_error,

			-- Avg Latency
			avgIf(Value, MetricName = 'container_http_requests_duration_seconds_total' AND Timestamp > split_time) * 1000 as curr_latency,
			avgIf(Value, MetricName = 'container_http_requests_duration_seconds_total' AND Timestamp <= split_time AND Timestamp > start_time) * 1000 as prev_latency,

			-- Log Volume
			sumIf(Value, MetricName = 'container_log_messages_total' AND Timestamp > split_time) as curr_logs,
			sumIf(Value, MetricName = 'container_log_messages_total' AND Timestamp <= split_time AND Timestamp > start_time) as prev_logs,

			-- Throughput
			sumIf(Value, MetricName = 'container_http_requests_total' AND Timestamp > split_time) as curr_throughput,
			sumIf(Value, MetricName = 'container_http_requests_total' AND Timestamp <= split_time AND Timestamp > start_time) as prev_throughput,

			-- Data Ingested
			sumIf(Bytes, Timestamp > split_time) / 1024 / 1024 / 1024 as curr_data,
			sumIf(Bytes, Timestamp <= split_time AND Timestamp > start_time) / 1024 / 1024 / 1024 as prev_data

		SELECT
			curr_active,
			if(prev_active = 0, 0, (curr_active - prev_active) / prev_active * 100),
			curr_error,
			if(prev_error = 0, 0, (curr_error - prev_error) / prev_error * 100),
			curr_latency,
			if(prev_latency = 0, 0, (curr_latency - prev_latency) / prev_latency * 100),
			curr_logs,
			if(prev_logs = 0, 0, (curr_logs - prev_logs) / prev_logs * 100),
			curr_throughput,
			if(prev_throughput = 0, 0, (curr_throughput - prev_throughput) / prev_throughput * 100),
			curr_data,
			if(prev_data = 0, 0, (curr_data - prev_data) / prev_data * 100)
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND Timestamp > start_time
	`

	var summary DashboardSummary
	err := s.conn.QueryRow(ctx, query, minutesAgo, minutesAgo, accountId).Scan(
		&summary.ActiveServices,
		&summary.ActiveServicesChange,
		&summary.ErrorRate,
		&summary.ErrorRateChange,
		&summary.AvgLatency,
		&summary.AvgLatencyChange,
		&summary.LogVolume,
		&summary.LogVolumeChange,
		&summary.Throughput,
		&summary.ThroughputChange,
		&summary.DataIngested,
		&summary.DataIngestedChange,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary: %w", err)
	}

	return &summary, nil
}

// InfraHealth represents a single pod's health status
type InfraHealth struct {
	Hostname    string  `json:"hostname"`
	CpuPressure float64 `json:"cpu_pressure"`
	MemPressure float64 `json:"mem_pressure"`
	OomKills    float64 `json:"oom_kills"`
	Status      string  `json:"status"` // GREEN, YELLOW, RED
}

func (s *Store) GetInfraHealth(ctx context.Context, accountId uint64, minutesAgo int) ([]InfraHealth, error) {
	query := `
		SELECT
			HostName,
			avgIf(Value, MetricName = 'node_cpu_usage_percent') as cpu_pressure,
			avgIf(Value, MetricName = 'node_memory_usage_percent') as mem_pressure,
			toFloat64(0) as oom_kills
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		  AND HostName != ''
		GROUP BY HostName
		ORDER BY HostName
		LIMIT 1000
	`

	rows, err := s.conn.Query(ctx, query, accountId, minutesAgo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []InfraHealth
	for rows.Next() {
		var h InfraHealth
		if err := rows.Scan(&h.Hostname, &h.CpuPressure, &h.MemPressure, &h.OomKills); err != nil {
			return nil, err
		}

		// Determine Status based on CPU and Memory usage
		if h.MemPressure > 95 || h.CpuPressure > 90 {
			h.Status = "RED"
		} else if h.MemPressure > 80 || h.CpuPressure > 70 {
			h.Status = "YELLOW"
		} else {
			h.Status = "GREEN"
		}

		results = append(results, h)
	}
	return results, nil
}

// ServicePerformance represents latency trends
type ServicePerformance struct {
	ServiceName string  `json:"service_name"`
	P95Latency  float64 `json:"p95_latency"`
}

func (s *Store) GetServicePerformance(ctx context.Context, accountId uint64, minutesAgo int) ([]ServicePerformance, error) {
	query := `
		SELECT
			ServiceName,
			avg(Value) as p95
		FROM metrics.metrics_v1
		WHERE MetricName = 'http_request_duration_ms_p95'
		  AND AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		GROUP BY ServiceName
		ORDER BY p95 DESC
		LIMIT 10
	`
	rows, err := s.conn.Query(ctx, query, accountId, minutesAgo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ServicePerformance
	for rows.Next() {
		var p ServicePerformance
		if err := rows.Scan(&p.ServiceName, &p.P95Latency); err != nil {
			return nil, err
		}
		results = append(results, p)
	}
	return results, nil
}

// LogVolume represents log counts by severity
type LogVolume struct {
	Level string `json:"level"`
	Count uint64 `json:"count"`
}

func (s *Store) GetLogVolume(ctx context.Context, accountId uint64, minutesAgo int) ([]LogVolume, error) {
	query := `
		SELECT
			SeverityText as level,
			count() as count
		FROM logs.logs_v1
		WHERE AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		GROUP BY level
	`
	rows, err := s.conn.Query(ctx, query, accountId, minutesAgo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []LogVolume
	for rows.Next() {
		var v LogVolume
		if err := rows.Scan(&v.Level, &v.Count); err != nil {
			return nil, err
		}
		results = append(results, v)
	}
	return results, nil
}

// SlowTrace represents a slow request trace
type SlowTrace struct {
	ServiceName string  `json:"service_name"`
	Operation   string  `json:"operation"`
	TraceId     string  `json:"trace_id"`
	Duration    float64 `json:"duration"`
}

func (s *Store) GetSlowTraces(ctx context.Context, accountId uint64, minutesAgo int) ([]SlowTrace, error) {
	query := `
		SELECT
			ServiceName,
			Name as Operation,
			TraceId,
			(EndTimeUnixNano - StartTimeUnixNano) / 1e9 as duration
		FROM traces.traces_v1
		WHERE AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		  AND duration > 0.5
		ORDER BY duration DESC
		LIMIT 10
	`
	rows, err := s.conn.Query(ctx, query, accountId, minutesAgo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SlowTrace
	for rows.Next() {
		var t SlowTrace
		if err := rows.Scan(&t.ServiceName, &t.Operation, &t.TraceId, &t.Duration); err != nil {
			return nil, err
		}
		results = append(results, t)
	}
	return results, nil
}

// LogPattern represents frequent log patterns
type LogPattern struct {
	Sample string `json:"sample"`
	Level  string `json:"level"`
	Count  uint64 `json:"count"`
}

func (s *Store) GetLogPatterns(ctx context.Context, accountId uint64, minutesAgo int) ([]LogPattern, error) {
	query := `
		SELECT
			substring(Body, 1, 50) as sample,
			SeverityText as level,
			count() as count
		FROM logs.logs_v1
		WHERE AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		GROUP BY sample, level
		ORDER BY count DESC
		LIMIT 5
	`
	rows, err := s.conn.Query(ctx, query, accountId, minutesAgo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []LogPattern
	for rows.Next() {
		var p LogPattern
		if err := rows.Scan(&p.Sample, &p.Level, &p.Count); err != nil {
			return nil, err
		}
		results = append(results, p)
	}
	return results, nil
}

// InfraHotspot represents top resource consumers
type InfraHotspot struct {
	Hostname string  `json:"hostname"`
	Resource string  `json:"resource"` // CPU, MEM, DISK
	Value    float64 `json:"value"`
	Metric   string  `json:"metric"`
	Change   float64 `json:"change"` // percentage change
}

func (s *Store) GetInfraHotspots(ctx context.Context, accountId uint64, minutesAgo int) ([]InfraHotspot, error) {
	var results []InfraHotspot

	// CPU Hotspots with change percentage
	rows, err := s.conn.Query(ctx, `
		WITH
			now() - INTERVAL ? MINUTE as split_time,
			now() - INTERVAL ? * 2 MINUTE as start_time
		SELECT 
			HostName, 
			'CPU',
			maxIf(Value, Timestamp > split_time) as curr_val,
			maxIf(Value, Timestamp <= split_time AND Timestamp > start_time) as prev_val,
			if(prev_val = 0, 0, (curr_val - prev_val) / prev_val * 100) as change_pct
		FROM metrics.metrics_v1
		WHERE MetricName = 'node_cpu_usage_percent' 
		  AND AccountId = ? 
		  AND Timestamp > start_time
		GROUP BY HostName 
		ORDER BY curr_val DESC 
		LIMIT 2
	`, minutesAgo, minutesAgo, accountId)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var h InfraHotspot
			var prevVal float64
			rows.Scan(&h.Hostname, &h.Resource, &h.Value, &prevVal, &h.Change)
			h.Metric = "CPU Usage"
			results = append(results, h)
		}
	}

	// Memory Hotspots with change percentage
	rowsMem, err := s.conn.Query(ctx, `
		WITH
			now() - INTERVAL ? MINUTE as split_time,
			now() - INTERVAL ? * 2 MINUTE as start_time
		SELECT 
			HostName, 
			'MEM',
			maxIf(Value, Timestamp > split_time) as curr_val,
			maxIf(Value, Timestamp <= split_time AND Timestamp > start_time) as prev_val,
			if(prev_val = 0, 0, (curr_val - prev_val) / prev_val * 100) as change_pct
		FROM metrics.metrics_v1
		WHERE MetricName = 'node_memory_usage_percent' 
		  AND AccountId = ? 
		  AND Timestamp > start_time
		GROUP BY HostName 
		ORDER BY curr_val DESC 
		LIMIT 2
	`, minutesAgo, minutesAgo, accountId)
	if err == nil {
		defer rowsMem.Close()
		for rowsMem.Next() {
			var h InfraHotspot
			var prevVal float64
			rowsMem.Scan(&h.Hostname, &h.Resource, &h.Value, &prevVal, &h.Change)
			h.Metric = "Memory Usage"
			results = append(results, h)
		}
	}

	// Disk Hotspots with change percentage
	rowsDisk, err := s.conn.Query(ctx, `
		WITH
			now() - INTERVAL ? MINUTE as split_time,
			now() - INTERVAL ? * 2 MINUTE as start_time
		SELECT 
			HostName, 
			'DISK',
			maxIf(Value, Timestamp > split_time) as curr_val,
			maxIf(Value, Timestamp <= split_time AND Timestamp > start_time) as prev_val,
			if(prev_val = 0, 0, (curr_val - prev_val) / prev_val * 100) as change_pct
		FROM metrics.metrics_v1
		WHERE MetricName = 'node_disk_usage_percent' 
		  AND AccountId = ? 
		  AND Timestamp > start_time
		GROUP BY HostName 
		ORDER BY curr_val DESC 
		LIMIT 2
	`, minutesAgo, minutesAgo, accountId)
	if err == nil {
		defer rowsDisk.Close()
		for rowsDisk.Next() {
			var h InfraHotspot
			var prevVal float64
			rowsDisk.Scan(&h.Hostname, &h.Resource, &h.Value, &prevVal, &h.Change)
			h.Metric = "Disk Usage"
			results = append(results, h)
		}
	}

	// Network Hotspots (based on total bytes transferred)
	rowsNet, err := s.conn.Query(ctx, `
		WITH
			now() - INTERVAL ? MINUTE as split_time,
			now() - INTERVAL ? * 2 MINUTE as start_time
		SELECT 
			HostName, 
			'NET',
			sumIf(Value, (MetricName = 'node_net_received_bytes_total' OR MetricName = 'node_net_transmitted_bytes_total') AND Timestamp > split_time) / 1024 / 1024 as curr_val,
			sumIf(Value, (MetricName = 'node_net_received_bytes_total' OR MetricName = 'node_net_transmitted_bytes_total') AND Timestamp <= split_time AND Timestamp > start_time) / 1024 / 1024 as prev_val,
			if(prev_val = 0, 0, (curr_val - prev_val) / prev_val * 100) as change_pct
		FROM metrics.metrics_v1
		WHERE (MetricName = 'node_net_received_bytes_total' OR MetricName = 'node_net_transmitted_bytes_total')
		  AND AccountId = ? 
		  AND Timestamp > start_time
		GROUP BY HostName 
		ORDER BY curr_val DESC 
		LIMIT 2
	`, minutesAgo, minutesAgo, accountId)
	if err == nil {
		defer rowsNet.Close()
		for rowsNet.Next() {
			var h InfraHotspot
			var prevVal float64
			rowsNet.Scan(&h.Hostname, &h.Resource, &h.Value, &prevVal, &h.Change)
			h.Metric = "Network I/O"
			results = append(results, h)
		}
	}

	// GPU Hotspots (based on utilization)
	rowsGPU, err := s.conn.Query(ctx, `
		WITH
			now() - INTERVAL ? MINUTE as split_time,
			now() - INTERVAL ? * 2 MINUTE as start_time
		SELECT 
			HostName, 
			'GPU',
			maxIf(Value, Timestamp > split_time) as curr_val,
			maxIf(Value, Timestamp <= split_time AND Timestamp > start_time) as prev_val,
			if(prev_val = 0, 0, (curr_val - prev_val) / prev_val * 100) as change_pct
		FROM metrics.metrics_v1
		WHERE MetricName = 'node_resources_gpu_utilization_percent_avg' 
		  AND AccountId = ? 
		  AND Timestamp > start_time
		GROUP BY HostName 
		ORDER BY curr_val DESC 
		LIMIT 2
	`, minutesAgo, minutesAgo, accountId)
	if err == nil {
		defer rowsGPU.Close()
		for rowsGPU.Next() {
			var h InfraHotspot
			var prevVal float64
			rowsGPU.Scan(&h.Hostname, &h.Resource, &h.Value, &prevVal, &h.Change)
			h.Metric = "GPU Usage"
			results = append(results, h)
		}
	}

	return results, nil
}

// SystemPerformance represents aggregated system metrics
type SystemPerformance struct {
	CpuUsage          float64 `json:"cpu_usage"`           // percentage
	CpuUsageChange    float64 `json:"cpu_usage_change"`    // percentage change
	MemoryUsage       float64 `json:"memory_usage"`        // in GB
	MemoryUsageChange float64 `json:"memory_usage_change"` // percentage change
	NetworkIO         float64 `json:"network_io"`          // in MB/s
	NetworkIOChange   float64 `json:"network_io_change"`   // percentage change
	DiskUsage         float64 `json:"disk_usage"`          // percentage
	DiskUsageChange   float64 `json:"disk_usage_change"`   // percentage change
}

func (s *Store) GetSystemPerformance(ctx context.Context, accountId uint64, minutesAgo int) (*SystemPerformance, error) {
	query := `
		WITH
			now() - INTERVAL ? MINUTE as split_time,
			now() - INTERVAL ? * 2 MINUTE as start_time,
			
			-- Current period metrics
			avgIf(Value, MetricName = 'node_cpu_usage_percent' AND Timestamp > split_time) as curr_cpu,
			avgIf(Value, MetricName = 'node_memory_usage_percent' AND Timestamp > split_time) as curr_mem,
			sumIf(Value, (MetricName = 'node_net_received_bytes_total' OR MetricName = 'node_net_transmitted_bytes_total') AND Timestamp > split_time) / 1024 / 1024 / (? * 60) as curr_net,
			avgIf(Value, MetricName = 'node_disk_usage_percent' AND Timestamp > split_time) as curr_disk,
			
			-- Previous period metrics
			avgIf(Value, MetricName = 'node_cpu_usage_percent' AND Timestamp <= split_time AND Timestamp > start_time) as prev_cpu,
			avgIf(Value, MetricName = 'node_memory_usage_percent' AND Timestamp <= split_time AND Timestamp > start_time) as prev_mem,
			sumIf(Value, (MetricName = 'node_net_received_bytes_total' OR MetricName = 'node_net_transmitted_bytes_total') AND Timestamp <= split_time AND Timestamp > start_time) / 1024 / 1024 / (? * 60) as prev_net,
			avgIf(Value, MetricName = 'node_disk_usage_percent' AND Timestamp <= split_time AND Timestamp > start_time) as prev_disk
			
		SELECT
			curr_cpu,
			if(prev_cpu = 0, 0, (curr_cpu - prev_cpu) / prev_cpu * 100),
			curr_mem,
			if(prev_mem = 0, 0, (curr_mem - prev_mem) / prev_mem * 100),
			curr_net,
			if(prev_net = 0, 0, (curr_net - prev_net) / prev_net * 100),
			curr_disk,
			if(prev_disk = 0, 0, (curr_disk - prev_disk) / prev_disk * 100)
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND Timestamp > start_time
	`

	var perf SystemPerformance
	err := s.conn.QueryRow(ctx, query, minutesAgo, minutesAgo, minutesAgo, minutesAgo, accountId).Scan(
		&perf.CpuUsage,
		&perf.CpuUsageChange,
		&perf.MemoryUsage,
		&perf.MemoryUsageChange,
		&perf.NetworkIO,
		&perf.NetworkIOChange,
		&perf.DiskUsage,
		&perf.DiskUsageChange,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get system performance: %w", err)
	}
	return &perf, nil
}

// LatencyTrendPoint represents a point in the latency trend chart
type LatencyTrendPoint struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"value"`
}

func (s *Store) GetLatencyTrend(ctx context.Context, accountId uint64, minutesAgo int) ([]LatencyTrendPoint, error) {
	query := `
		SELECT
			toStartOfInterval(Timestamp, INTERVAL 1 MINUTE) as time_bucket,
			avg(Value) as avg_latency
		FROM metrics.metrics_v1
		WHERE MetricName = 'http_request_duration_ms_p95'
		  AND AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		GROUP BY time_bucket
		ORDER BY time_bucket
	`

	rows, err := s.conn.Query(ctx, query, accountId, minutesAgo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []LatencyTrendPoint
	for rows.Next() {
		var p LatencyTrendPoint
		var ts time.Time
		if err := rows.Scan(&ts, &p.Value); err != nil {
			return nil, err
		}
		p.Timestamp = ts.Format("15:04")
		results = append(results, p)
	}
	return results, nil
}

// ServiceMetrics represents detailed metrics for a specific service
type ServiceMetrics struct {
	AvgResponseTime float64 `json:"avg_response_time"` // in milliseconds
	RequestRate     float64 `json:"request_rate"`      // requests per minute
	ErrorRate       float64 `json:"error_rate"`        // percentage
	Throughput      float64 `json:"throughput"`        // requests per second
	Status          string  `json:"status"`            // Healthy, Warning, Critical
	Instances       uint64  `json:"instances"`
	Version         string  `json:"version"`
	Uptime          float64 `json:"uptime"`       // in hours
	MemoryUsage     float64 `json:"memory_usage"` // in MB
}

func (s *Store) GetServiceMetrics(ctx context.Context, accountId uint64, serviceName string, minutesAgo int) (*ServiceMetrics, error) {
	query := `
		SELECT
			avgIf(Value * 1000, MetricName = 'container_http_requests_duration_seconds_total') as avg_response_time,
			sumIf(Value, MetricName = 'container_http_requests_total') / ? as request_rate,
			countIf(MetricName = 'container_http_requests_total' AND Labels['status'] >= '400') / 
				nullIf(countIf(MetricName = 'container_http_requests_total'), 0) * 100 as error_rate,
			sumIf(Value, MetricName = 'container_http_requests_total') / (? * 60) as throughput,
			uniqExact(Pod) as instances,
			anyIf(Labels['version'], MetricName = 'container_info' AND mapContains(Labels, 'version')) as version,
			maxIf(Value, MetricName = 'container_uptime_seconds') / 3600 as uptime,
			maxIf(Value, MetricName = 'container_resources_memory_rss_bytes') / 1024 / 1024 as memory_usage
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND ServiceName = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
	`

	var metrics ServiceMetrics
	err := s.conn.QueryRow(ctx, query, minutesAgo, minutesAgo, accountId, serviceName, minutesAgo).Scan(
		&metrics.AvgResponseTime,
		&metrics.RequestRate,
		&metrics.ErrorRate,
		&metrics.Throughput,
		&metrics.Instances,
		&metrics.Version,
		&metrics.Uptime,
		&metrics.MemoryUsage,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get service metrics: %w", err)
	}

	// Determine status based on metrics
	if metrics.ErrorRate > 5 || metrics.AvgResponseTime > 1000 {
		metrics.Status = "Critical"
	} else if metrics.ErrorRate > 1 || metrics.AvgResponseTime > 500 {
		metrics.Status = "Warning"
	} else {
		metrics.Status = "Healthy"
	}

	// Handle empty version
	if metrics.Version == "" {
		metrics.Version = "unknown"
	}

	return &metrics, nil
}

// ServiceTrace represents a trace for a specific service
type ServiceTrace struct {
	TraceId    string  `json:"trace_id"`
	Operation  string  `json:"operation"`
	Duration   float64 `json:"duration"` // in seconds
	StatusCode string  `json:"status_code"`
	Timestamp  string  `json:"timestamp"`
}

func (s *Store) GetServiceTraces(ctx context.Context, accountId uint64, serviceName string, minutesAgo int) ([]ServiceTrace, error) {
	query := `
		SELECT
			TraceId as trace_id,
			Name as operation,
			(EndTimeUnixNano - StartTimeUnixNano) / 1000000000 as duration,
			toString(StatusCode) as status_code,
			toString(Timestamp) as timestamp
		FROM traces.traces_v1
		WHERE AccountId = ?
		  AND ServiceName = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		ORDER BY duration DESC
		LIMIT 10
	`

	rows, err := s.conn.Query(ctx, query, accountId, serviceName, minutesAgo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ServiceTrace
	for rows.Next() {
		var t ServiceTrace
		if err := rows.Scan(&t.TraceId, &t.Operation, &t.Duration, &t.StatusCode, &t.Timestamp); err != nil {
			return nil, err
		}
		results = append(results, t)
	}
	return results, nil
}

// ========== METRIC DISCOVERY ENDPOINTS ==========

// GetMetricNames returns all unique metric names with metadata
func (s *Store) GetMetricNames(ctx context.Context, accountId uint64) ([]MetricName, error) {
	query := `
		SELECT
			MetricName as name,
			any(MetricType) as type,
			count() as sample_count
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND Timestamp > now() - INTERVAL 24 HOUR
		GROUP BY MetricName
		ORDER BY MetricName
	`
	rows, err := s.conn.Query(ctx, query, accountId)
	if err != nil {
		return nil, fmt.Errorf("failed to get metric names: %w", err)
	}
	defer rows.Close()

	var results []MetricName
	for rows.Next() {
		var m MetricName
		if err := rows.Scan(&m.Name, &m.Type, &m.SampleCount); err != nil {
			return nil, err
		}
		results = append(results, m)
	}
	return results, nil
}

// GetMetricLabels returns all label keys for a specific metric
func (s *Store) GetMetricLabels(ctx context.Context, accountId uint64, metricName string) ([]MetricLabel, error) {
	query := `
		SELECT
			arrayJoin(mapKeys(Labels)) as key,
			count() as value_count
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND MetricName = ?
		  AND Timestamp > now() - INTERVAL 24 HOUR
		GROUP BY key
		ORDER BY value_count DESC
	`
	rows, err := s.conn.Query(ctx, query, accountId, metricName)
	if err != nil {
		return nil, fmt.Errorf("failed to get metric labels: %w", err)
	}
	defer rows.Close()

	var results []MetricLabel
	for rows.Next() {
		var m MetricLabel
		if err := rows.Scan(&m.Key, &m.ValueCount); err != nil {
			return nil, err
		}

		// Get sample values for this label
		sampleQuery := `
			SELECT DISTINCT Labels[?] as value
			FROM metrics.metrics_v1
			WHERE AccountId = ?
			  AND MetricName = ?
			  AND mapContains(Labels, ?)
			  AND Timestamp > now() - INTERVAL 24 HOUR
			LIMIT 10
		`
		sampleRows, err := s.conn.Query(ctx, sampleQuery, m.Key, accountId, metricName, m.Key)
		if err == nil {
			defer sampleRows.Close()
			var samples []string
			for sampleRows.Next() {
				var val string
				if err := sampleRows.Scan(&val); err == nil && val != "" {
					samples = append(samples, val)
				}
			}
			m.SampleValues = samples
		}

		results = append(results, m)
	}
	return results, nil
}

// GetLabelValues returns all distinct values for a specific label key
func (s *Store) GetLabelValues(ctx context.Context, accountId uint64, metricName, labelKey string) ([]LabelValue, error) {
	query := `
		SELECT
			Labels[?] as value,
			count() as count
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND MetricName = ?
		  AND mapContains(Labels, ?)
		  AND Timestamp > now() - INTERVAL 24 HOUR
		GROUP BY value
		HAVING value != ''
		ORDER BY count DESC
		LIMIT 100
	`
	rows, err := s.conn.Query(ctx, query, labelKey, accountId, metricName, labelKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get label values: %w", err)
	}
	defer rows.Close()

	var results []LabelValue
	for rows.Next() {
		var v LabelValue
		if err := rows.Scan(&v.Value, &v.Count); err != nil {
			return nil, err
		}
		results = append(results, v)
	}
	return results, nil
}

// QueryMetrics executes a flexible metric query with grouping and aggregation
func (s *Store) QueryMetrics(ctx context.Context, req MetricQueryRequest) (*MetricQueryResponse, error) {
	if len(req.Metrics) == 0 {
		return nil, fmt.Errorf("no metrics specified")
	}

	// Parse time range
	minutesAgo := parseTimeRange(req.TimeRange)
	interval := parseInterval(req.Interval)

	var allSeries []MetricSeries

	for _, metricQuery := range req.Metrics {
		// Build aggregation function
		aggFunc := buildAggregationFunc(metricQuery.Aggregation, "Value")

		// Build group by clause
		groupByClause := ""
		selectLabels := ""
		if len(metricQuery.GroupBy) > 0 {
			var groupByCols []string
			var selectCols []string
			for _, labelKey := range metricQuery.GroupBy {
				groupByCols = append(groupByCols, fmt.Sprintf("Labels['%s']", labelKey))
				selectCols = append(selectCols, fmt.Sprintf("Labels['%s'] as label_%s", labelKey, labelKey))
			}
			groupByClause = ", " + joinStrings(groupByCols, ", ")
			selectLabels = ", " + joinStrings(selectCols, ", ")
		}

		// Build filter clause
		filterClause := ""
		if len(metricQuery.Filters) > 0 {
			var filters []string
			for key, value := range metricQuery.Filters {
				filters = append(filters, fmt.Sprintf("Labels['%s'] = '%s'", key, value))
			}
			filterClause = " AND " + joinStrings(filters, " AND ")
		}

		// Build time bucket
		timeBucket := fmt.Sprintf("toStartOfInterval(Timestamp, INTERVAL %d SECOND)", interval)

		query := fmt.Sprintf(`
			SELECT
				%s as time_bucket,
				%s as value
				%s
			FROM metrics.metrics_v1
			WHERE AccountId = ?
			  AND MetricName = ?
			  AND Timestamp > now() - INTERVAL %d MINUTE
			  %s
			GROUP BY time_bucket%s
			ORDER BY time_bucket
		`, timeBucket, aggFunc, selectLabels, minutesAgo, filterClause, groupByClause)

		rows, err := s.conn.Query(ctx, query, req.AccountId, metricQuery.MetricName)
		if err != nil {
			return nil, fmt.Errorf("failed to query metric %s: %w", metricQuery.MetricName, err)
		}
		defer rows.Close()

		// Group by label combinations
		seriesMap := make(map[string]*MetricSeries)

		for rows.Next() {
			var timestamp time.Time
			var value float64

			// Prepare scan destinations
			scanDest := []interface{}{&timestamp, &value}
			labels := make(map[string]string)

			if len(metricQuery.GroupBy) > 0 {
				for _, labelKey := range metricQuery.GroupBy {
					var labelValue string
					scanDest = append(scanDest, &labelValue)
					labels[labelKey] = labelValue
				}
			}

			if err := rows.Scan(scanDest...); err != nil {
				return nil, err
			}

			// Create series key from labels
			seriesKey := metricQuery.MetricName
			if len(labels) > 0 {
				seriesKey = fmt.Sprintf("%s{%v}", metricQuery.MetricName, labels)
			}

			series, exists := seriesMap[seriesKey]
			if !exists {
				name := metricQuery.MetricName
				if metricQuery.Alias != "" {
					name = metricQuery.Alias
				}
				series = &MetricSeries{
					Name:       name,
					Labels:     labels,
					DataPoints: []DataPoint{},
					Stats:      SeriesStats{},
				}
				seriesMap[seriesKey] = series
			}

			series.DataPoints = append(series.DataPoints, DataPoint{
				Timestamp: timestamp,
				Value:     value,
			})
		}

		// Calculate stats and add to results
		for _, series := range seriesMap {
			calculateStats(series)
			allSeries = append(allSeries, *series)
		}
	}

	return &MetricQueryResponse{
		Series: allSeries,
	}, nil
}

// ========== DASHBOARD CRUD OPERATIONS ==========

// SaveDashboard saves or updates a dashboard configuration
func (s *Store) SaveDashboard(ctx context.Context, dashboard *Dashboard) error {
	query := `
		INSERT INTO metrics.dashboards
		(DashboardId, AccountId, Name, Description, Config, CreatedAt, UpdatedAt)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	if dashboard.CreatedAt.IsZero() {
		dashboard.CreatedAt = time.Now()
	}
	dashboard.UpdatedAt = time.Now()

	err := s.conn.Exec(ctx, query,
		dashboard.DashboardId,
		dashboard.AccountId,
		dashboard.Name,
		dashboard.Description,
		dashboard.Config,
		dashboard.CreatedAt,
		dashboard.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to save dashboard: %w", err)
	}
	return nil
}

// GetDashboard retrieves a dashboard by ID
func (s *Store) GetDashboard(ctx context.Context, accountId uint64, dashboardId string) (*Dashboard, error) {
	query := `
		SELECT DashboardId, AccountId, Name, Description, Config, CreatedAt, UpdatedAt
		FROM metrics.dashboards
		WHERE AccountId = ? AND DashboardId = ?
		ORDER BY UpdatedAt DESC
		LIMIT 1
	`

	var dashboard Dashboard
	err := s.conn.QueryRow(ctx, query, accountId, dashboardId).Scan(
		&dashboard.DashboardId,
		&dashboard.AccountId,
		&dashboard.Name,
		&dashboard.Description,
		&dashboard.Config,
		&dashboard.CreatedAt,
		&dashboard.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard: %w", err)
	}
	return &dashboard, nil
}

// ListDashboards returns all dashboards for an account
func (s *Store) ListDashboards(ctx context.Context, accountId uint64) ([]Dashboard, error) {
	query := `
		SELECT DashboardId, AccountId, Name, Description, Config, CreatedAt, UpdatedAt
		FROM metrics.dashboards
		WHERE AccountId = ?
		ORDER BY UpdatedAt DESC
	`

	rows, err := s.conn.Query(ctx, query, accountId)
	if err != nil {
		return nil, fmt.Errorf("failed to list dashboards: %w", err)
	}
	defer rows.Close()

	var dashboards []Dashboard
	for rows.Next() {
		var d Dashboard
		if err := rows.Scan(&d.DashboardId, &d.AccountId, &d.Name, &d.Description, &d.Config, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		dashboards = append(dashboards, d)
	}
	return dashboards, nil
}

// DeleteDashboard deletes a dashboard
func (s *Store) DeleteDashboard(ctx context.Context, accountId uint64, dashboardId string) error {
	query := `
		ALTER TABLE metrics.dashboards
		DELETE WHERE AccountId = ? AND DashboardId = ?
	`

	err := s.conn.Exec(ctx, query, accountId, dashboardId)
	if err != nil {
		return fmt.Errorf("failed to delete dashboard: %w", err)
	}
	return nil
}

// ========== HELPER FUNCTIONS ==========

func parseTimeRange(timeRange string) int {
	// Simple parser for time ranges like "15m", "1h", "24h", "7d"
	if timeRange == "" {
		return 15 // default 15 minutes
	}

	var value int
	var unit string
	fmt.Sscanf(timeRange, "%d%s", &value, &unit)

	switch unit {
	case "m":
		return value
	case "h":
		return value * 60
	case "d":
		return value * 60 * 24
	default:
		return 15
	}
}

func parseInterval(interval string) int {
	// Parse interval to seconds
	if interval == "" {
		return 60 // default 1 minute
	}

	var value int
	var unit string
	fmt.Sscanf(interval, "%d%s", &value, &unit)

	switch unit {
	case "s":
		return value
	case "m":
		return value * 60
	case "h":
		return value * 3600
	default:
		return 60
	}
}

func buildAggregationFunc(agg, column string) string {
	switch agg {
	case "avg":
		return fmt.Sprintf("avg(%s)", column)
	case "sum":
		return fmt.Sprintf("sum(%s)", column)
	case "min":
		return fmt.Sprintf("min(%s)", column)
	case "max":
		return fmt.Sprintf("max(%s)", column)
	case "count":
		return "count()"
	case "p50":
		return fmt.Sprintf("quantile(0.50)(%s)", column)
	case "p95":
		return fmt.Sprintf("quantile(0.95)(%s)", column)
	case "p99":
		return fmt.Sprintf("quantile(0.99)(%s)", column)
	default:
		return fmt.Sprintf("avg(%s)", column) // default to avg
	}
}

func joinStrings(strs []string, separator string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += separator
		}
		result += s
	}
	return result
}

func calculateStats(series *MetricSeries) {
	if len(series.DataPoints) == 0 {
		return
	}

	var sum float64
	min := series.DataPoints[0].Value
	max := series.DataPoints[0].Value

	for _, dp := range series.DataPoints {
		sum += dp.Value
		if dp.Value < min {
			min = dp.Value
		}
		if dp.Value > max {
			max = dp.Value
		}
	}

	series.Stats = SeriesStats{
		Avg:   sum / float64(len(series.DataPoints)),
		Min:   min,
		Max:   max,
		Sum:   sum,
		Count: uint64(len(series.DataPoints)),
	}
}

// NodeDetailedMetrics represents detailed metrics for a specific node
type NodeDetailedMetrics struct {
	CpuUsage              float64             `json:"cpu_usage"`
	CpuCores              float64             `json:"cpu_cores"`
	MemoryTotal           float64             `json:"memory_total"`
	MemoryFree            float64             `json:"memory_free"`
	MemoryAvailable       float64             `json:"memory_available"`
	MemoryCached          float64             `json:"memory_cached"`
	DiskReads             map[string]float64  `json:"disk_reads"`
	DiskWrites            map[string]float64  `json:"disk_writes"`
	DiskReadBytes         map[string]float64  `json:"disk_read_bytes"`
	DiskWrittenBytes      map[string]float64  `json:"disk_written_bytes"`
	DiskReadTime          map[string]float64  `json:"disk_read_time"`
	DiskWriteTime         map[string]float64  `json:"disk_write_time"`
	DiskIOTime            map[string]float64  `json:"disk_io_time"`
	NetReceivedBytes      map[string]float64  `json:"net_received_bytes"`
	NetTransmittedBytes   map[string]float64  `json:"net_transmitted_bytes"`
	NetReceivedPackets    map[string]float64  `json:"net_received_packets"`
	NetTransmittedPackets map[string]float64  `json:"net_transmitted_packets"`
	NetInterfaceUp        map[string]bool     `json:"net_interface_up"`
	NetInterfaceIPs       map[string][]string `json:"net_interface_ips"`
	GpuInfo               []GpuInfo           `json:"gpu_info"`
	GpuMemoryTotal        map[string]float64  `json:"gpu_memory_total"`
	GpuMemoryUsed         map[string]float64  `json:"gpu_memory_used"`
	GpuMemoryUtilAvg      map[string]float64  `json:"gpu_memory_util_avg"`
	GpuMemoryUtilPeak     map[string]float64  `json:"gpu_memory_util_peak"`
	GpuUtilizationAvg     map[string]float64  `json:"gpu_utilization_avg"`
	GpuUtilizationPeak    map[string]float64  `json:"gpu_utilization_peak"`
	GpuTemperature        map[string]float64  `json:"gpu_temperature"`
	GpuPower              map[string]float64  `json:"gpu_power"`
	Uptime                float64             `json:"uptime"`
	Hostname              string              `json:"hostname"`
	KernelVersion         string              `json:"kernel_version"`
	AgentVersion          string              `json:"agent_version"`
	CloudProvider         string              `json:"cloud_provider"`
	AccountID             string              `json:"account_id"`
	InstanceID            string              `json:"instance_id"`
	InstanceType          string              `json:"instance_type"`
	InstanceLifeCycle     string              `json:"instance_life_cycle"`
	Region                string              `json:"region"`
	AvailabilityZone      string              `json:"availability_zone"`
	AvailabilityZoneID    string              `json:"availability_zone_id"`
	LocalIPv4             string              `json:"local_ipv4"`
	PublicIPv4            string              `json:"public_ipv4"`
}

type GpuInfo struct {
	Uuid string `json:"uuid"`
	Name string `json:"name"`
}

// NodeSummary represents a high-level view of a node (for infrastructure listing)
type NodeSummary struct {
	ID                 string  `json:"id"`
	Hostname           string  `json:"hostname"`
	IP                 string  `json:"ip"`
	Status             string  `json:"status"` // GREEN, YELLOW, RED
	CpuUsage           float64 `json:"cpu_usage"`
	MemoryTotal        float64 `json:"memory_total"`
	MemoryFree         float64 `json:"memory_free"`
	MemoryUsagePercent float64 `json:"memory_usage_percent"`
	DiskUsagePercent   float64 `json:"disk_usage_percent"`
	NetworkTransmit    float64 `json:"network_transmit"`
	NetworkReceive     float64 `json:"network_receive"`
	Uptime             float64 `json:"uptime"`
	NetworkUp          bool    `json:"network_up"`
}

func (s *Store) GetInfrastructureNodes(ctx context.Context, accountId uint64) ([]NodeSummary, error) {
	query := `
		SELECT
			HostId as id,
			any(HostName) as hostname,
			any(HostIP) as ip,
			avgIf(Value, MetricName = 'node_cpu_usage_percent') as cpu_usage,
			maxIf(Value, MetricName = 'node_resources_memory_total_bytes') as memory_total,
			avgIf(Value, MetricName = 'node_resources_memory_free_bytes') as memory_free,
			avgIf(Value, MetricName = 'node_memory_usage_percent') as memory_usage_percent,
			avgIf(Value, MetricName = 'node_disk_usage_percent') as disk_usage_percent,
			sumIf(Value, MetricName = 'node_net_transmitted_bytes_total') as network_transmit,
			sumIf(Value, MetricName = 'node_net_received_bytes_total') as network_receive,
			maxIf(Value, MetricName = 'node_uptime_seconds') as uptime
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND Timestamp > now() - INTERVAL 5 MINUTE
		  AND HostId != ''
		GROUP BY HostId
		ORDER BY hostname
		LIMIT 1000
	`

	rows, err := s.conn.Query(ctx, query, accountId)
	if err != nil {
		return nil, fmt.Errorf("failed to get infrastructure nodes: %w", err)
	}
	defer rows.Close()

	var results []NodeSummary
	for rows.Next() {
		var n NodeSummary
		if err := rows.Scan(
			&n.ID, &n.Hostname, &n.IP,
			&n.CpuUsage, &n.MemoryTotal, &n.MemoryFree,
			&n.MemoryUsagePercent, &n.DiskUsagePercent,
			&n.NetworkTransmit, &n.NetworkReceive, &n.Uptime,
		); err != nil {
			return nil, err
		}

		// Determine status based on metrics
		if n.CpuUsage > 90 || n.MemoryUsagePercent > 95 || n.DiskUsagePercent > 95 {
			n.Status = "RED"
		} else if n.CpuUsage > 70 || n.MemoryUsagePercent > 80 || n.DiskUsagePercent > 80 {
			n.Status = "YELLOW"
		} else {
			n.Status = "GREEN"
		}

		// Network status (simplified)
		n.NetworkUp = true
		if n.NetworkTransmit == 0 && n.NetworkReceive == 0 {
			n.NetworkUp = false
		}

		results = append(results, n)
	}
	return results, nil
}

func (s *Store) GetNodeMetrics(ctx context.Context, accountId uint64, hostId string) (*NodeDetailedMetrics, error) {
	// Fetch all relevant metrics for this host in the last 5 minutes
	query := `
		SELECT
			MetricName,
			argMax(Value, Timestamp) as val,
			Labels
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND HostId = ?
		  AND Timestamp > now() - INTERVAL 5 MINUTE
		GROUP BY MetricName, Labels
	`

	rows, err := s.conn.Query(ctx, query, accountId, hostId)
	if err != nil {
		return nil, fmt.Errorf("failed to query node metrics: %w", err)
	}
	defer rows.Close()

	metrics := &NodeDetailedMetrics{
		DiskReads:             make(map[string]float64),
		DiskWrites:            make(map[string]float64),
		DiskReadBytes:         make(map[string]float64),
		DiskWrittenBytes:      make(map[string]float64),
		DiskReadTime:          make(map[string]float64),
		DiskWriteTime:         make(map[string]float64),
		DiskIOTime:            make(map[string]float64),
		NetReceivedBytes:      make(map[string]float64),
		NetTransmittedBytes:   make(map[string]float64),
		NetReceivedPackets:    make(map[string]float64),
		NetTransmittedPackets: make(map[string]float64),
		NetInterfaceUp:        make(map[string]bool),
		NetInterfaceIPs:       make(map[string][]string),
		GpuMemoryTotal:        make(map[string]float64),
		GpuMemoryUsed:         make(map[string]float64),
		GpuMemoryUtilAvg:      make(map[string]float64),
		GpuMemoryUtilPeak:     make(map[string]float64),
		GpuUtilizationAvg:     make(map[string]float64),
		GpuUtilizationPeak:    make(map[string]float64),
		GpuTemperature:        make(map[string]float64),
		GpuPower:              make(map[string]float64),
	}

	gpuSet := make(map[string]bool)

	for rows.Next() {
		var name string
		var val float64
		var labels map[string]string

		if err := rows.Scan(&name, &val, &labels); err != nil {
			continue
		}

		// Extract node meta information from labels
		if metrics.Hostname == "" && labels["hostname"] != "" {
			metrics.Hostname = labels["hostname"]
		}

		switch name {
		// CPU Metrics
		case "node_cpu_usage_percent":
			metrics.CpuUsage = val
		case "node_resources_cpu_logical_cores":
			metrics.CpuCores = val

		// Memory Metrics
		case "node_resources_memory_total_bytes":
			metrics.MemoryTotal = val
		case "node_resources_memory_free_bytes":
			metrics.MemoryFree = val
		case "node_resources_memory_available_bytes":
			metrics.MemoryAvailable = val
		case "node_resources_memory_cached_bytes":
			metrics.MemoryCached = val

		// Disk Metrics
		case "node_resources_disk_reads_total":
			if dev, ok := labels["device"]; ok {
				metrics.DiskReads[dev] = val
			}
		case "node_resources_disk_writes_total":
			if dev, ok := labels["device"]; ok {
				metrics.DiskWrites[dev] = val
			}
		case "node_resources_disk_read_bytes_total":
			if dev, ok := labels["device"]; ok {
				metrics.DiskReadBytes[dev] = val
			}
		case "node_resources_disk_written_bytes_total":
			if dev, ok := labels["device"]; ok {
				metrics.DiskWrittenBytes[dev] = val
			}
		case "node_resources_disk_read_time_seconds_total":
			if dev, ok := labels["device"]; ok {
				metrics.DiskReadTime[dev] = val
			}
		case "node_resources_disk_write_time_seconds_total":
			if dev, ok := labels["device"]; ok {
				metrics.DiskWriteTime[dev] = val
			}
		case "node_resources_disk_io_time_seconds_total":
			if dev, ok := labels["device"]; ok {
				metrics.DiskIOTime[dev] = val
			}

		// Network Metrics
		case "node_net_received_bytes_total":
			if iface, ok := labels["interface"]; ok {
				metrics.NetReceivedBytes[iface] = val
			}
		case "node_net_transmitted_bytes_total":
			if iface, ok := labels["interface"]; ok {
				metrics.NetTransmittedBytes[iface] = val
			}
		case "node_net_received_packets_total":
			if iface, ok := labels["interface"]; ok {
				metrics.NetReceivedPackets[iface] = val
			}
		case "node_net_transmitted_packets_total":
			if iface, ok := labels["interface"]; ok {
				metrics.NetTransmittedPackets[iface] = val
			}
		case "node_net_interface_up":
			if iface, ok := labels["interface"]; ok {
				metrics.NetInterfaceUp[iface] = val == 1
			}
		case "node_net_interface_ip":
			if iface, ok := labels["interface"]; ok {
				if ip, ok := labels["ip"]; ok {
					metrics.NetInterfaceIPs[iface] = append(metrics.NetInterfaceIPs[iface], ip)
				}
			}

		// GPU Metrics
		case "node_gpu_info":
			if uuid, ok := labels["gpu_uuid"]; ok {
				if !gpuSet[uuid] {
					name := "Unknown GPU"
					if gpuName, ok := labels["name"]; ok {
						name = gpuName
					}
					metrics.GpuInfo = append(metrics.GpuInfo, GpuInfo{Uuid: uuid, Name: name})
					gpuSet[uuid] = true
				}
			}
		case "node_resources_gpu_memory_total_bytes":
			if uuid, ok := labels["gpu_uuid"]; ok {
				metrics.GpuMemoryTotal[uuid] = val
			}
		case "node_resources_gpu_memory_used_bytes":
			if uuid, ok := labels["gpu_uuid"]; ok {
				metrics.GpuMemoryUsed[uuid] = val
			}
		case "node_resources_gpu_memory_utilization_percent_avg":
			if uuid, ok := labels["gpu_uuid"]; ok {
				metrics.GpuMemoryUtilAvg[uuid] = val
			}
		case "node_resources_gpu_memory_utilization_percent_peak":
			if uuid, ok := labels["gpu_uuid"]; ok {
				metrics.GpuMemoryUtilPeak[uuid] = val
			}
		case "node_resources_gpu_utilization_percent_avg":
			if uuid, ok := labels["gpu_uuid"]; ok {
				metrics.GpuUtilizationAvg[uuid] = val
			}
		case "node_resources_gpu_utilization_percent_peak":
			if uuid, ok := labels["gpu_uuid"]; ok {
				metrics.GpuUtilizationPeak[uuid] = val
			}
		case "node_resources_gpu_temperature_celsius":
			if uuid, ok := labels["gpu_uuid"]; ok {
				metrics.GpuTemperature[uuid] = val
			}
		case "node_resources_gpu_power_usage_watts":
			if uuid, ok := labels["gpu_uuid"]; ok {
				metrics.GpuPower[uuid] = val
			}

		// Node Meta
		case "node_uptime_seconds":
			metrics.Uptime = val
		case "node_info":
			if hostname, ok := labels["hostname"]; ok {
				metrics.Hostname = hostname
			}
			if kernel, ok := labels["kernel_version"]; ok {
				metrics.KernelVersion = kernel
			}
			if agent, ok := labels["agent_version"]; ok {
				metrics.AgentVersion = agent
			}
		case "node_cloud_info":
			if provider, ok := labels["provider"]; ok {
				metrics.CloudProvider = provider
			}
			if accountID, ok := labels["account_id"]; ok {
				metrics.AccountID = accountID
			}
			if instanceID, ok := labels["instance_id"]; ok {
				metrics.InstanceID = instanceID
			}
			if instanceType, ok := labels["instance_type"]; ok {
				metrics.InstanceType = instanceType
			}
			if lifeCycle, ok := labels["instance_life_cycle"]; ok {
				metrics.InstanceLifeCycle = lifeCycle
			}
			if region, ok := labels["region"]; ok {
				metrics.Region = region
			}
			if az, ok := labels["availability_zone"]; ok {
				metrics.AvailabilityZone = az
			}
			if azID, ok := labels["availability_zone_id"]; ok {
				metrics.AvailabilityZoneID = azID
			}
			if localIP, ok := labels["local_ipv4"]; ok {
				metrics.LocalIPv4 = localIP
			}
			if publicIP, ok := labels["public_ipv4"]; ok {
				metrics.PublicIPv4 = publicIP
			}
		}
	}

	// Fill in some defaults if missing
	if metrics.KernelVersion == "" {
		metrics.KernelVersion = "5.15.0-generic"
	}
	if metrics.AgentVersion == "" {
		metrics.AgentVersion = "1.0.0"
	}
	if metrics.CloudProvider == "" {
		metrics.CloudProvider = "unknown"
	}
	if metrics.InstanceType == "" {
		metrics.InstanceType = "unknown"
	}

	return metrics, nil
}
