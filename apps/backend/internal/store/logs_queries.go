package store

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// LogEntry represents a log entry
type LogEntry struct {
	Timestamp          time.Time         `json:"timestamp"`
	AccountId          uint64            `json:"account_id"`
	HostId             string            `json:"host_id"`
	HostName           string            `json:"host_name"`
	HostIP             string            `json:"host_ip"`
	HostArch           string            `json:"host_arch"`
	NodeName           string            `json:"node_name"`
	ClusterName        string            `json:"cluster_name"`
	AgentName          string            `json:"agent_name"`
	AgentVersion       string            `json:"agent_version"`
	Env                string            `json:"env"`
	ServiceName        string            `json:"service_name"`
	ServiceVersion     string            `json:"service_version"`
	Namespace          string            `json:"namespace"`
	Pod                string            `json:"pod"`
	Container          string            `json:"container"`
	ContainerId        string            `json:"container_id"`
	Source             string            `json:"source"`
	SeverityNumber     int32             `json:"severity_number"`
	SeverityText       string            `json:"severity_text"`
	Body               string            `json:"body"`
	TraceId            string            `json:"trace_id"`
	SpanId             string            `json:"span_id"`
	TraceFlags         uint64            `json:"trace_flags"`
	LogAttributes      map[string]string `json:"log_attributes"`
	ResourceAttributes map[string]string `json:"resource_attributes"`
	PatternHash        string            `json:"pattern_hash"`
	BodyHash           string            `json:"body_hash"`
	Bytes              uint64            `json:"bytes"`
}

// LogsListRequest represents filters for logs list
type LogsListRequest struct {
	AccountId    uint64
	TimeRangeMin int
	ServiceName  string
	HostName     string
	Severity     string // INFO, WARN, ERROR, DEBUG
	Environment  string
	Namespace    string
	Pod          string
	Search       string // search in body
	TraceId      string
	Page         int
	PageSize     int
}

// LogsListResponse represents paginated logs response
type LogsListResponse struct {
	Logs       []LogEntry `json:"logs"`
	TotalCount int        `json:"total_count"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
}

func (s *Store) GetLogsList(ctx context.Context, req LogsListRequest) (*LogsListResponse, error) {
	// Build WHERE clause based on filters
	whereClause := "WHERE AccountId = ?"
	args := []interface{}{req.AccountId}

	if req.ServiceName != "" {
		whereClause += " AND ServiceName = ?"
		args = append(args, req.ServiceName)
	}

	if req.HostName != "" {
		whereClause += " AND HostName = ?"
		args = append(args, req.HostName)
	}

	if req.Severity != "" {
		whereClause += " AND SeverityText = ?"
		args = append(args, strings.ToUpper(req.Severity))
	}

	if req.Environment != "" {
		whereClause += " AND Env = ?"
		args = append(args, req.Environment)
	}

	if req.Namespace != "" {
		whereClause += " AND Namespace = ?"
		args = append(args, req.Namespace)
	}

	if req.Pod != "" {
		whereClause += " AND Pod = ?"
		args = append(args, req.Pod)
	}

	if req.TraceId != "" {
		whereClause += " AND TraceId = ?"
		args = append(args, req.TraceId)
	}

	if req.Search != "" {
		whereClause += " AND positionCaseInsensitive(Body, ?) > 0"
		args = append(args, req.Search)
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT
			Timestamp,
			AccountId,
			HostName,
			ServiceName,
			Namespace,
			Pod,
			SeverityText,
			substring(Body, 1, 200) as BodyPreview,
			TraceId,
			SpanId
		FROM logs.logs_v1
		%s
		  AND Timestamp > now() - INTERVAL ? MINUTE
		ORDER BY Timestamp DESC
		LIMIT ? OFFSET ?
	`, whereClause)

	args = append(args, req.TimeRangeMin)
	offset := (req.Page - 1) * req.PageSize
	args = append(args, req.PageSize, offset)

	rows, err := s.conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query logs list: %w", err)
	}
	defer rows.Close()

	var logs []LogEntry
	for rows.Next() {
		var log LogEntry
		err := rows.Scan(
			&log.Timestamp,
			&log.AccountId,
			&log.HostName,
			&log.ServiceName,
			&log.Namespace,
			&log.Pod,
			&log.SeverityText,
			&log.Body, // Using BodyPreview
			&log.TraceId,
			&log.SpanId,
		)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	// Get total count
	countQuery := fmt.Sprintf(`
		SELECT count()
		FROM logs.logs_v1
		%s
		  AND Timestamp > now() - INTERVAL ? MINUTE
	`, whereClause)

	var totalCount int
	countArgs := append(args[:len(args)-2], req.TimeRangeMin)
	err = s.conn.QueryRow(ctx, countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	return &LogsListResponse{
		Logs:       logs,
		TotalCount: totalCount,
		Page:       req.Page,
		PageSize:   req.PageSize,
	}, nil
}

func (s *Store) GetLogDetail(ctx context.Context, accountId uint64, timestamp time.Time, serviceName string) (*LogEntry, error) {
	query := `
		SELECT
			Timestamp,
			AccountId,
			HostId,
			HostName,
			HostIP,
			HostArch,
			NodeName,
			ClusterName,
			AgentName,
			AgentVersion,
			Env,
			ServiceName,
			ServiceVersion,
			Namespace,
			Pod,
			Container,
			ContainerId,
			Source,
			SeverityNumber,
			SeverityText,
			Body,
			TraceId,
			SpanId,
			TraceFlags,
			LogAttributes,
			ResourceAttributes,
			PatternHash,
			BodyHash,
			Bytes
		FROM logs.logs_v1
		WHERE AccountId = ?
		  AND ServiceName = ?
		  AND Timestamp = ?
		LIMIT 1
	`

	var log LogEntry
	err := s.conn.QueryRow(ctx, query, accountId, serviceName, timestamp).Scan(
		&log.Timestamp,
		&log.AccountId,
		&log.HostId,
		&log.HostName,
		&log.HostIP,
		&log.HostArch,
		&log.NodeName,
		&log.ClusterName,
		&log.AgentName,
		&log.AgentVersion,
		&log.Env,
		&log.ServiceName,
		&log.ServiceVersion,
		&log.Namespace,
		&log.Pod,
		&log.Container,
		&log.ContainerId,
		&log.Source,
		&log.SeverityNumber,
		&log.SeverityText,
		&log.Body,
		&log.TraceId,
		&log.SpanId,
		&log.TraceFlags,
		&log.LogAttributes,
		&log.ResourceAttributes,
		&log.PatternHash,
		&log.BodyHash,
		&log.Bytes,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get log detail: %w", err)
	}

	return &log, nil
}
