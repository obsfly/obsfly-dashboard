package store

import (
	"context"
	"fmt"
	"time"
)

// ServiceListItem represents a service in the APM services list
type ServiceListItem struct {
	ServiceName    string                 `json:"service_name"`
	Language       string                 `json:"language"`
	Instances      int                    `json:"instances"`
	RequestRate    float64                `json:"request_rate"`
	ErrorRate      float64                `json:"error_rate"`
	P95Latency     float64                `json:"p95_latency"`
	Status         string                 `json:"status"`
	SLO            ServiceSLO             `json:"slo"`
	RuntimeMetrics map[string]interface{} `json:"runtime_metrics,omitempty"`
	Traces         TraceMetrics           `json:"traces"`
	LastSeen       time.Time              `json:"last_seen"`
}

// ServiceSLO represents SLO metrics for a service
type ServiceSLO struct {
	Availability      float64 `json:"availability"`
	SuccessRate       float64 `json:"success_rate"`
	LatencyCompliance float64 `json:"latency_compliance"`
	Status            string  `json:"status"` // meeting, warning, breaching
}

// TraceMetrics represents trace statistics
type TraceMetrics struct {
	TotalCount  int     `json:"total_count"`
	AvgDuration float64 `json:"avg_duration_ms"`
	ErrorCount  int     `json:"error_count"`
}

// ServicesListRequest represents filters for services list
type ServicesListRequest struct {
	AccountId     uint64
	TimeRangeMin  int
	Language      string
	Host          string
	Status        string
	SLOCompliance string // meeting, warning, breaching, all
	Search        string
	SortBy        string
	SortOrder     string // asc, desc
	Page          int
	PageSize      int
}

// ServicesListResponse represents paginated services list response
type ServicesListResponse struct {
	Services   []ServiceListItem `json:"services"`
	TotalCount int               `json:"total_count"`
	Page       int               `json:"page"`
	PageSize   int               `json:"page_size"`
}

func (s *Store) GetServicesList(ctx context.Context, req ServicesListRequest) (*ServicesListResponse, error) {
	// Build WHERE clause based on filters
	whereClause := "WHERE AccountId = ?"
	args := []interface{}{req.AccountId}

	if req.Language != "" {
		whereClause += " AND Language = ?"
		args = append(args, req.Language)
	}

	if req.Host != "" {
		whereClause += " AND HostName = ?"
		args = append(args, req.Host)
	}

	if req.Search != "" {
		whereClause += " AND ServiceName LIKE ?"
		args = append(args, "%"+req.Search+"%")
	}

	// Main query to get services with aggregated metrics
	query := fmt.Sprintf(`
		WITH service_metrics AS (
			SELECT
				ServiceName,
				any(Labels['language']) as Language,
				uniqExact(Pod) as Instances,
				sumIf(Value, MetricName = 'container_http_requests_total') / (? * 60) as RequestRate,
				countIf(MetricName = 'container_http_requests_total' AND Labels['status'] >= '400') / 
					nullIf(countIf(MetricName = 'container_http_requests_total'), 0) * 100 as ErrorRate,
				quantileIf(0.95)(Value * 1000, MetricName = 'container_http_requests_duration_seconds_total') as P95Latency,
				max(Timestamp) as LastSeen,
				-- JVM metrics
				avgIf(Value / nullIf(anyIf(Value, MetricName = 'container_jvm_heap_size_bytes'), 0) * 100,
					MetricName = 'container_jvm_heap_used_bytes') as JvmHeapUsagePercent,
				sumIf(Value * 1000, MetricName = 'container_jvm_gc_time_seconds') as JvmGcTimeMs,
				-- Node.js metrics
				avgIf(Value * 1000, MetricName = 'container_nodejs_event_loop_blocked_time_seconds_total') as NodejsEventLoopLag,
				-- Python metrics
				avgIf(Value * 1000, MetricName = 'container_python_thread_lock_wait_time_seconds') as PythonThreadLockWait,
				-- .NET metrics
				sumIf(Value, MetricName = 'container_dotnet_exceptions_total') / (? * 60) as DotnetExceptionRate,
				avgIf(Value, MetricName = 'container_dotnet_heap_fragmentation_percent') as DotnetHeapFragmentation
			FROM metrics.metrics_v1
			%s
			  AND Timestamp > now() - INTERVAL ? MINUTE
			GROUP BY ServiceName
		),
		trace_metrics AS (
			SELECT
				ServiceName,
				count() as TotalTraces,
				avg((EndTimeUnixNano - StartTimeUnixNano) / 1000000) as AvgDurationMs,
				countIf(StatusCode != 1) as ErrorTraces
			FROM traces.traces_v1
			WHERE AccountId = ?
			  AND Timestamp > now() - INTERVAL ? MINUTE
			GROUP BY ServiceName
		)
		SELECT
			sm.ServiceName,
			sm.Language,
			sm.Instances,
			sm.RequestRate,
			sm.ErrorRate,
			sm.P95Latency,
			sm.LastSeen,
			sm.JvmHeapUsagePercent,
			sm.JvmGcTimeMs,
			sm.NodejsEventLoopLag,
			sm.PythonThreadLockWait,
			sm.DotnetExceptionRate,
			sm.DotnetHeapFragmentation,
			COALESCE(tm.TotalTraces, 0) as TotalTraces,
			COALESCE(tm.AvgDurationMs, 0) as AvgDurationMs,
			COALESCE(tm.ErrorTraces, 0) as ErrorTraces
		FROM service_metrics sm
		LEFT JOIN trace_metrics tm ON sm.ServiceName = tm.ServiceName
		ORDER BY %s %s
		LIMIT ? OFFSET ?
	`, whereClause, getSortColumn(req.SortBy), req.SortOrder)

	args = append(args, req.TimeRangeMin, req.TimeRangeMin, req.TimeRangeMin)
	args = append(args, req.AccountId, req.TimeRangeMin)

	offset := (req.Page - 1) * req.PageSize
	args = append(args, req.PageSize, offset)

	rows, err := s.conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query services list: %w", err)
	}
	defer rows.Close()

	var services []ServiceListItem
	for rows.Next() {
		var svc ServiceListItem
		var jvmHeap, jvmGc, nodeEventLoop, pyThreadLock, dotnetExc, dotnetFrag *float64
		var totalTraces, errorTraces int
		var avgTraceDuration float64

		err := rows.Scan(
			&svc.ServiceName,
			&svc.Language,
			&svc.Instances,
			&svc.RequestRate,
			&svc.ErrorRate,
			&svc.P95Latency,
			&svc.LastSeen,
			&jvmHeap,
			&jvmGc,
			&nodeEventLoop,
			&pyThreadLock,
			&dotnetExc,
			&dotnetFrag,
			&totalTraces,
			&avgTraceDuration,
			&errorTraces,
		)
		if err != nil {
			return nil, err
		}

		// Calculate status
		svc.Status = calculateServiceStatus(svc.ErrorRate, svc.P95Latency)

		// Calculate SLO
		svc.SLO = calculateSLO(svc.ErrorRate, svc.P95Latency, svc.RequestRate)

		// Add runtime-specific metrics
		svc.RuntimeMetrics = make(map[string]interface{})
		if jvmHeap != nil && *jvmHeap > 0 {
			svc.RuntimeMetrics["jvm_heap_usage_percent"] = *jvmHeap
		}
		if jvmGc != nil && *jvmGc > 0 {
			svc.RuntimeMetrics["jvm_gc_time_ms"] = *jvmGc
		}
		if nodeEventLoop != nil && *nodeEventLoop > 0 {
			svc.RuntimeMetrics["nodejs_event_loop_lag_ms"] = *nodeEventLoop
		}
		if pyThreadLock != nil && *pyThreadLock > 0 {
			svc.RuntimeMetrics["python_thread_lock_wait_ms"] = *pyThreadLock
		}
		if dotnetExc != nil {
			svc.RuntimeMetrics["dotnet_exception_rate"] = *dotnetExc
		}
		if dotnetFrag != nil {
			svc.RuntimeMetrics["dotnet_heap_fragmentation"] = *dotnetFrag
		}

		// Add trace metrics
		svc.Traces = TraceMetrics{
			TotalCount:  totalTraces,
			AvgDuration: avgTraceDuration,
			ErrorCount:  errorTraces,
		}

		// Apply SLO filter if specified
		if req.SLOCompliance != "" && req.SLOCompliance != "all" {
			if svc.SLO.Status != req.SLOCompliance {
				continue
			}
		}

		services = append(services, svc)
	}

	// Get total count
	countQuery := fmt.Sprintf(`
		SELECT count(DISTINCT ServiceName)
		FROM metrics.metrics_v1
		%s
		  AND Timestamp > now() - INTERVAL ? MINUTE
	`, whereClause)

	var totalCount int
	countArgs := append([]interface{}{req.AccountId}, args[1:len(args)-2]...)
	err = s.conn.QueryRow(ctx, countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	return &ServicesListResponse{
		Services:   services,
		TotalCount: totalCount,
		Page:       req.Page,
		PageSize:   req.PageSize,
	}, nil
}

func getSortColumn(sortBy string) string {
	switch sortBy {
	case "name":
		return "sm.ServiceName"
	case "language":
		return "sm.Language"
	case "instances":
		return "sm.Instances"
	case "request_rate":
		return "sm.RequestRate"
	case "error_rate":
		return "sm.ErrorRate"
	case "p95_latency":
		return "sm.P95Latency"
	case "last_seen":
		return "sm.LastSeen"
	default:
		return "sm.ServiceName"
	}
}

func calculateServiceStatus(errorRate, p95Latency float64) string {
	if errorRate > 5 || p95Latency > 1000 {
		return "critical"
	} else if errorRate > 1 || p95Latency > 500 {
		return "warning"
	}
	return "healthy"
}

func calculateSLO(errorRate, p95Latency, requestRate float64) ServiceSLO {
	// Calculate success rate (inverse of error rate)
	successRate := 100 - errorRate

	// Calculate availability (simplified: based on request rate)
	availability := 99.9
	if requestRate == 0 {
		availability = 0
	}

	// Calculate latency compliance (percentage of requests under 500ms threshold)
	latencyCompliance := 100.0
	if p95Latency > 500 {
		latencyCompliance = 95.0
	}
	if p95Latency > 1000 {
		latencyCompliance = 85.0
	}

	// Determine overall SLO status
	sloStatus := "meeting"
	if successRate < 99 || availability < 99 || latencyCompliance < 95 {
		sloStatus = "warning"
	}
	if successRate < 95 || availability < 95 || latencyCompliance < 90 {
		sloStatus = "breaching"
	}

	return ServiceSLO{
		Availability:      availability,
		SuccessRate:       successRate,
		LatencyCompliance: latencyCompliance,
		Status:            sloStatus,
	}
}
