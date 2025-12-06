package store

import (
	"context"
	"fmt"
	"time"
)

// NodeMetricsTimeSeries represents time-series data for node metrics
type NodeMetricsTimeSeries struct {
	MetricName string            `json:"metric_name"`
	Series     []TimeSeriesPoint `json:"series"`
	Labels     map[string]string `json:"labels"`
}

type TimeSeriesPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
}

// NodeMetricsChangePercentage represents change percentages for node metrics
type NodeMetricsChangePercentage struct {
	CpuUsageChange        float64 `json:"cpu_usage_change"`
	MemoryUsageChange     float64 `json:"memory_usage_change"`
	DiskUsageChange       float64 `json:"disk_usage_change"`
	NetworkReceiveChange  float64 `json:"network_receive_change"`
	NetworkTransmitChange float64 `json:"network_transmit_change"`
}

// GetNodeMetricsTimeSeries returns time-series data for all metrics of a specific node
func (s *Store) GetNodeMetricsTimeSeries(ctx context.Context, accountId uint64, hostId string, minutesAgo int, groupBy string) ([]NodeMetricsTimeSeries, error) {
	// Define the metrics we want to fetch
	metricNames := []string{
		"node_cpu_usage_percent",
		"node_memory_usage_percent",
		"node_disk_usage_percent",
		"node_net_received_bytes_total",
		"node_net_transmitted_bytes_total",
		"node_resources_gpu_utilization_percent_avg",
		"node_resources_gpu_memory_utilization_percent_avg",
		"node_resources_gpu_temperature_celsius",
	}

	var allSeries []NodeMetricsTimeSeries

	for _, metricName := range metricNames {
		query := `
			SELECT
				toStartOfInterval(Timestamp, INTERVAL 1 MINUTE) as time_bucket,
				avg(Value) as value,
				Labels
			FROM metrics.metrics_v1
			WHERE AccountId = ?
			  AND HostId = ?
			  AND MetricName = ?
			  AND Timestamp > now() - INTERVAL ? MINUTE
			GROUP BY time_bucket, Labels
			ORDER BY time_bucket
		`

		rows, err := s.conn.Query(ctx, query, accountId, hostId, metricName, minutesAgo)
		if err != nil {
			continue // Skip metrics that fail
		}
		defer rows.Close()

		// Group by label combinations
		seriesMap := make(map[string]*NodeMetricsTimeSeries)

		for rows.Next() {
			var timestamp time.Time
			var value float64
			var labels map[string]string

			if err := rows.Scan(&timestamp, &value, &labels); err != nil {
				continue
			}

			// Create series key based on groupBy parameter
			seriesKey := metricName
			seriesLabels := make(map[string]string)

			if groupBy != "" && labels[groupBy] != "" {
				seriesKey = fmt.Sprintf("%s{%s=%s}", metricName, groupBy, labels[groupBy])
				seriesLabels[groupBy] = labels[groupBy]
			}

			series, exists := seriesMap[seriesKey]
			if !exists {
				series = &NodeMetricsTimeSeries{
					MetricName: metricName,
					Labels:     seriesLabels,
					Series:     []TimeSeriesPoint{},
				}
				seriesMap[seriesKey] = series
			}

			series.Series = append(series.Series, TimeSeriesPoint{
				Timestamp: timestamp,
				Value:     value,
			})
		}

		// Add all series for this metric
		for _, series := range seriesMap {
			allSeries = append(allSeries, *series)
		}
	}

	return allSeries, nil
}

// GetNodeMetricsChangePercentage calculates change percentages for key metrics
func (s *Store) GetNodeMetricsChangePercentage(ctx context.Context, accountId uint64, hostId string) (*NodeMetricsChangePercentage, error) {
	// Get current period (last 5 minutes)
	currentQuery := `
		SELECT
			avgIf(Value, MetricName = 'node_cpu_usage_percent') as cpu_usage,
			avgIf(Value, MetricName = 'node_memory_usage_percent') as memory_usage,
			avgIf(Value, MetricName = 'node_disk_usage_percent') as disk_usage,
			sumIf(Value, MetricName = 'node_net_received_bytes_total') as network_receive,
			sumIf(Value, MetricName = 'node_net_transmitted_bytes_total') as network_transmit
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND HostId = ?
		  AND Timestamp > now() - INTERVAL 5 MINUTE
	`

	var currentCpu, currentMem, currentDisk, currentNetRx, currentNetTx float64
	err := s.conn.QueryRow(ctx, currentQuery, accountId, hostId).Scan(
		&currentCpu, &currentMem, &currentDisk, &currentNetRx, &currentNetTx,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get current metrics: %w", err)
	}

	// Get previous period (5-10 minutes ago)
	previousQuery := `
		SELECT
			avgIf(Value, MetricName = 'node_cpu_usage_percent') as cpu_usage,
			avgIf(Value, MetricName = 'node_memory_usage_percent') as memory_usage,
			avgIf(Value, MetricName = 'node_disk_usage_percent') as disk_usage,
			sumIf(Value, MetricName = 'node_net_received_bytes_total') as network_receive,
			sumIf(Value, MetricName = 'node_net_transmitted_bytes_total') as network_transmit
		FROM metrics.metrics_v1
		WHERE AccountId = ?
		  AND HostId = ?
		  AND Timestamp > now() - INTERVAL 10 MINUTE
		  AND Timestamp <= now() - INTERVAL 5 MINUTE
	`

	var prevCpu, prevMem, prevDisk, prevNetRx, prevNetTx float64
	err = s.conn.QueryRow(ctx, previousQuery, accountId, hostId).Scan(
		&prevCpu, &prevMem, &prevDisk, &prevNetRx, &prevNetTx,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get previous metrics: %w", err)
	}

	// Calculate percentage changes
	calculateChange := func(current, previous float64) float64 {
		if previous == 0 {
			return 0
		}
		return ((current - previous) / previous) * 100
	}

	return &NodeMetricsChangePercentage{
		CpuUsageChange:        calculateChange(currentCpu, prevCpu),
		MemoryUsageChange:     calculateChange(currentMem, prevMem),
		DiskUsageChange:       calculateChange(currentDisk, prevDisk),
		NetworkReceiveChange:  calculateChange(currentNetRx, prevNetRx),
		NetworkTransmitChange: calculateChange(currentNetTx, prevNetTx),
	}, nil
}
