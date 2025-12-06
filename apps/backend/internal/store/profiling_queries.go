package store

import (
	"context"
	"fmt"
	"time"
)

// ProfileEntry represents a profiling session
type ProfileEntry struct {
	Timestamp      time.Time `json:"timestamp"`
	ServiceName    string    `json:"service_name"`
	ProfileType    string    `json:"profile_type"`
	Runtime        string    `json:"runtime"`
	RuntimeVersion string    `json:"runtime_version"`
	SampleCount    uint64    `json:"sample_count"`
	DurationMs     float64   `json:"duration_ms"`
	HostName       string    `json:"host_name"`
	Namespace      string    `json:"namespace"`
	Pod            string    `json:"pod"`
}

// FlamegraphNode represents a node in the flamegraph tree
type FlamegraphNode struct {
	Name     string            `json:"name"`
	Value    uint64            `json:"value"`
	Total    uint64            `json:"total"`
	Children []*FlamegraphNode `json:"children,omitempty"`
	File     string            `json:"file,omitempty"`
	Line     int64             `json:"line,omitempty"`
}

// CostEstimation represents profiling cost metrics
type CostEstimation struct {
	TotalStorageGB     float64            `json:"total_storage_gb"`
	DailyCostUSD       float64            `json:"daily_cost_usd"`
	RetentionCostUSD   float64            `json:"retention_cost_usd"`
	ProfileTypeCosts   map[string]float64 `json:"profile_type_costs"`
	SampleDistribution map[string]uint64  `json:"sample_distribution"`
}

// ProfilesListRequest represents filters for profiles list
type ProfilesListRequest struct {
	AccountId    uint64
	TimeRangeMin int
	ServiceName  string
	ProfileType  string
	Runtime      string
	HostName     string
	Page         int
	PageSize     int
}

// ProfilesListResponse represents paginated profiles response
type ProfilesListResponse struct {
	Profiles   []ProfileEntry `json:"profiles"`
	TotalCount int            `json:"total_count"`
	Page       int            `json:"page"`
	PageSize   int            `json:"page_size"`
}

func (s *Store) GetProfilesList(ctx context.Context, req ProfilesListRequest) (*ProfilesListResponse, error) {
	whereClause := "WHERE AccountId = ?"
	args := []interface{}{req.AccountId}

	if req.ServiceName != "" {
		whereClause += " AND ServiceName = ?"
		args = append(args, req.ServiceName)
	}

	if req.ProfileType != "" {
		whereClause += " AND ProfileType = ?"
		args = append(args, req.ProfileType)
	}

	if req.Runtime != "" {
		whereClause += " AND Runtime = ?"
		args = append(args, req.Runtime)
	}

	if req.HostName != "" {
		whereClause += " AND HostName = ?"
		args = append(args, req.HostName)
	}

	query := fmt.Sprintf(`
		SELECT
			Timestamp,
			ServiceName,
			ProfileType,
			Runtime,
			RuntimeVersion,
			sum(SampleCount) as TotalSamples,
			(max(EndTime) - min(StartTime)) * 1000 as DurationMs,
			any(HostName) as HostName,
			any(Namespace) as Namespace,
			any(Pod) as Pod
		FROM profiles.profiling_v1
		%s
		  AND Timestamp > now() - INTERVAL ? MINUTE
		GROUP BY Timestamp, ServiceName, ProfileType, Runtime, RuntimeVersion
		ORDER BY Timestamp DESC
		LIMIT ? OFFSET ?
	`, whereClause)

	args = append(args, req.TimeRangeMin)
	offset := (req.Page - 1) * req.PageSize
	args = append(args, req.PageSize, offset)

	rows, err := s.conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query profiles list: %w", err)
	}
	defer rows.Close()

	var profiles []ProfileEntry
	for rows.Next() {
		var profile ProfileEntry
		err := rows.Scan(
			&profile.Timestamp,
			&profile.ServiceName,
			&profile.ProfileType,
			&profile.Runtime,
			&profile.RuntimeVersion,
			&profile.SampleCount,
			&profile.DurationMs,
			&profile.HostName,
			&profile.Namespace,
			&profile.Pod,
		)
		if err != nil {
			return nil, err
		}
		profiles = append(profiles, profile)
	}

	// Get total count
	countQuery := fmt.Sprintf(`
		SELECT count(DISTINCT (Timestamp, ServiceName, ProfileType))
		FROM profiles.profiling_v1
		%s
		  AND Timestamp > now() - INTERVAL ? MINUTE
	`, whereClause)

	var totalCount int
	countArgs := append(args[:len(args)-2], req.TimeRangeMin)
	err = s.conn.QueryRow(ctx, countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	return &ProfilesListResponse{
		Profiles:   profiles,
		TotalCount: totalCount,
		Page:       req.Page,
		PageSize:   req.PageSize,
	}, nil
}

func (s *Store) GetFlamegraphData(ctx context.Context, accountId uint64, serviceName, profileType string, minutesAgo int) (*FlamegraphNode, error) {
	query := `
		SELECT
			FunctionNames,
			SampleValue
		FROM profiles.profiling_v1
		WHERE AccountId = ?
		  AND ServiceName = ?
		  AND ProfileType = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		ORDER BY Timestamp DESC
		LIMIT 10000
	`

	rows, err := s.conn.Query(ctx, query, accountId, serviceName, profileType, minutesAgo)
	if err != nil {
		return nil, fmt.Errorf("failed to query flamegraph data: %w", err)
	}
	defer rows.Close()

	// Build flamegraph tree
	root := &FlamegraphNode{
		Name:     "root",
		Value:    0,
		Total:    0,
		Children: []*FlamegraphNode{},
	}

	for rows.Next() {
		var functionNames []string
		var sampleValue uint64

		err := rows.Scan(&functionNames, &sampleValue)
		if err != nil {
			return nil, err
		}

		// Build tree path from function names
		current := root
		for _, funcName := range functionNames {
			// Find or create child
			var child *FlamegraphNode
			for _, c := range current.Children {
				if c.Name == funcName {
					child = c
					break
				}
			}

			if child == nil {
				child = &FlamegraphNode{
					Name:     funcName,
					Value:    0,
					Total:    0,
					Children: []*FlamegraphNode{},
				}
				current.Children = append(current.Children, child)
			}

			child.Total += sampleValue
			current = child
		}

		// Leaf node gets the value
		if current != root {
			current.Value += sampleValue
		}
	}

	return root, nil
}

func (s *Store) GetCostEstimation(ctx context.Context, accountId uint64, minutesAgo int) (*CostEstimation, error) {
	query := `
		SELECT
			ProfileType,
			sum(Bytes) / 1024 / 1024 / 1024 as StorageGB,
			sum(SampleCount) as TotalSamples
		FROM profiles.profiling_v1
		WHERE AccountId = ?
		  AND Timestamp > now() - INTERVAL ? MINUTE
		GROUP BY ProfileType
	`

	rows, err := s.conn.Query(ctx, query, accountId, minutesAgo)
	if err != nil {
		return nil, fmt.Errorf("failed to query cost estimation: %w", err)
	}
	defer rows.Close()

	profileTypeCosts := make(map[string]float64)
	sampleDistribution := make(map[string]uint64)
	var totalStorageGB float64

	for rows.Next() {
		var profileType string
		var storageGB float64
		var samples uint64

		err := rows.Scan(&profileType, &storageGB, &samples)
		if err != nil {
			return nil, err
		}

		profileTypeCosts[profileType] = storageGB
		sampleDistribution[profileType] = samples
		totalStorageGB += storageGB
	}

	// Simple cost calculation: $0.10 per GB per month
	dailyCostUSD := totalStorageGB * 0.10 / 30
	retentionCostUSD := totalStorageGB * 0.10

	return &CostEstimation{
		TotalStorageGB:     totalStorageGB,
		DailyCostUSD:       dailyCostUSD,
		RetentionCostUSD:   retentionCostUSD,
		ProfileTypeCosts:   profileTypeCosts,
		SampleDistribution: sampleDistribution,
	}, nil
}
