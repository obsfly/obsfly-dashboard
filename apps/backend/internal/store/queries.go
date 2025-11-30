package store

import (
	"context"
	"fmt"
)

// DashboardSummary represents the top summary panel
type DashboardSummary struct {
	ActiveServices uint64  `json:"active_services"`
	ErrorRate      float64 `json:"error_rate"`
	AvgLatency     float64 `json:"avg_latency"`
	LogVolume      float64 `json:"log_volume"`
}

func (s *Store) GetDashboardSummary(ctx context.Context, accountId uint64, minutesAgo int) (*DashboardSummary, error) {
	query := `
		SELECT
			uniqExact(ServiceName) as active_services,
			countIf(MetricName = 'container_http_requests_total' AND Labels['status'] = '500') / 
				nullIf(countIf(MetricName = 'container_http_requests_total'), 0) as error_rate,
			avgIf(Value, MetricName = 'container_http_requests_duration_seconds_total') * 1000 as avg_latency_ms,
			sumIf(Value, MetricName = 'container_log_messages_total') as log_volume
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		  AND MetricName IN ('container_info', 'container_http_requests_total', 
		                     'container_http_requests_duration_seconds_total', 
		                     'container_log_messages_total')
	`

	var summary DashboardSummary
	err := s.conn.QueryRow(ctx, query, accountId, minutesAgo).Scan(
		&summary.ActiveServices,
		&summary.ErrorRate,
		&summary.AvgLatency,
		&summary.LogVolume,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary: %w", err)
	}

	return &summary, nil
}

// InfraHealth represents a single pod's health status
type InfraHealth struct {
	Pod         string  `json:"pod"`
	CpuPressure float64 `json:"cpu_pressure"`
	MemPressure float64 `json:"mem_pressure"`
	OomKills    float64 `json:"oom_kills"`
	Status      string  `json:"status"` // GREEN, YELLOW, RED
}

func (s *Store) GetInfraHealth(ctx context.Context, accountId uint64, minutesAgo int) ([]InfraHealth, error) {
	query := `
		SELECT
			Pod,
			avgIf(Value, MetricName = 'container_resources_cpu_pressure_waiting_seconds_total') as cpu_pressure,
			avgIf(Value, MetricName = 'container_resources_memory_pressure_waiting_seconds_total') as mem_pressure,
			sumIf(Value, MetricName = 'container_oom_kills_total') as oom_kills
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		GROUP BY Pod
		ORDER BY Pod
	`

	rows, err := s.conn.Query(ctx, query, accountId, minutesAgo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []InfraHealth
	for rows.Next() {
		var h InfraHealth
		if err := rows.Scan(&h.Pod, &h.CpuPressure, &h.MemPressure, &h.OomKills); err != nil {
			return nil, err
		}

		// Determine Status
		if h.OomKills > 0 || h.CpuPressure > 5 || h.MemPressure > 5 {
			h.Status = "RED"
		} else if h.CpuPressure > 1 || h.MemPressure > 1 {
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
			quantile(0.95)(Value) as p95
		FROM metrics.metrics_v1
		WHERE MetricName = 'container_http_requests_duration_seconds_total'
		  AND AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		GROUP BY ServiceName
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
			Labels['level'] as level,
			sum(Value) as count
		FROM metrics.metrics_v1
		WHERE MetricName = 'container_log_messages_total'
		  AND AccountId = ?
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
	TraceId     string  `json:"trace_id"`
	Duration    float64 `json:"duration"`
}

func (s *Store) GetSlowTraces(ctx context.Context, accountId uint64, minutesAgo int) ([]SlowTrace, error) {
	query := `
		SELECT
			ServiceName,
			Labels['trace_id'] as trace_id,
			max(Value) as duration
		FROM metrics.metrics_v1
		WHERE MetricName = 'container_http_requests_duration_seconds_total'
		  AND AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		  AND mapContains(Labels, 'trace_id')
		GROUP BY ServiceName, trace_id
		ORDER BY duration DESC
		LIMIT 5
	`
	rows, err := s.conn.Query(ctx, query, accountId, minutesAgo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SlowTrace
	for rows.Next() {
		var t SlowTrace
		if err := rows.Scan(&t.ServiceName, &t.TraceId, &t.Duration); err != nil {
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
			Labels['sample'] as sample,
			Labels['level'] as level,
			count() as count
		FROM metrics.metrics_v1
		WHERE MetricName = 'container_log_messages_total'
		  AND AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		  AND mapContains(Labels, 'sample')
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
	Pod      string  `json:"pod"`
	Metric   string  `json:"metric"`
	Value    float64 `json:"value"`
	Resource string  `json:"resource"` // CPU, MEM, DISK
}

func (s *Store) GetInfraHotspots(ctx context.Context, accountId uint64, minutesAgo int) ([]InfraHotspot, error) {
	// We'll combine 3 queries for simplicity in this demo
	var results []InfraHotspot

	// CPU
	rows, err := s.conn.Query(ctx, `
		SELECT Pod, 'CPU', max(Value) as val
		FROM metrics.metrics_v1
		WHERE MetricName = 'container_resources_cpu_usage_seconds_total' 
		  AND AccountId = ? 
		  AND Timestamp > now() - INTERVAL ? MINUTE
		GROUP BY Pod ORDER BY val DESC LIMIT 3
	`, accountId, minutesAgo)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var h InfraHotspot
			rows.Scan(&h.Pod, &h.Resource, &h.Value)
			h.Metric = "CPU Usage"
			results = append(results, h)
		}
	}

	// Memory
	rowsMem, err := s.conn.Query(ctx, `
		SELECT Pod, 'MEM', max(Value) as val
		FROM metrics.metrics_v1
		WHERE MetricName = 'container_resources_memory_rss_bytes' 
		  AND AccountId = ? 
		  AND Timestamp > now() - INTERVAL ? MINUTE
		GROUP BY Pod ORDER BY val DESC LIMIT 3
	`, accountId, minutesAgo)
	if err == nil {
		defer rowsMem.Close()
		for rowsMem.Next() {
			var h InfraHotspot
			rowsMem.Scan(&h.Pod, &h.Resource, &h.Value)
			h.Metric = "Memory RSS"
			results = append(results, h)
		}
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
			Labels['trace_id'] as trace_id,
			Labels['operation'] as operation,
			max(Value) as duration,
			Labels['status'] as status_code,
			toString(max(Timestamp)) as timestamp
		FROM metrics.metrics_v1
		WHERE MetricName = 'container_http_requests_duration_seconds_total'
		  AND AccountId = ?
		  AND ServiceName = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		  AND mapContains(Labels, 'trace_id')
		GROUP BY trace_id, operation, status_code
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
