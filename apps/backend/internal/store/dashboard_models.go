package store

import (
	"time"
)

// Dashboard represents a saved dashboard configuration
type Dashboard struct {
	DashboardId string    `json:"dashboard_id"`
	AccountId   uint64    `json:"account_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Config      string    `json:"config"` // JSON-encoded widget layout
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// DashboardWidget represents a widget configuration
type DashboardWidget struct {
	WidgetId      string              `json:"widget_id"`
	WidgetType    string              `json:"widget_type"` // chart, metric, table
	Title         string              `json:"title"`
	Queries       []MetricQuery       `json:"queries"`
	Visualization VisualizationConfig `json:"visualization"`
	Layout        WidgetLayout        `json:"layout"`
	TimeConfig    TimeConfig          `json:"time_config"`
}

// MetricQuery represents a metric query configuration
type MetricQuery struct {
	MetricName  string            `json:"metric_name"`
	Aggregation string            `json:"aggregation"` // avg, sum, min, max, count, p50, p95, p99
	GroupBy     []string          `json:"group_by"`    // label keys to group by
	Filters     map[string]string `json:"filters"`     // label filters
	Formula     string            `json:"formula"`     // optional formula expression
	Alias       string            `json:"alias"`       // display name
}

// VisualizationConfig contains chart/visualization settings
type VisualizationConfig struct {
	ChartType    string                 `json:"chart_type"`    // line, bar, area, pie, scatter, heatmap, gauge
	Colors       []string               `json:"colors"`        // custom colors
	ColorPalette string                 `json:"color_palette"` // preset palette name
	Stacked      bool                   `json:"stacked"`
	ShowLegend   bool                   `json:"show_legend"`
	Unit         string                 `json:"unit"`
	Decimals     int                    `json:"decimals"`
	Thresholds   []Threshold            `json:"thresholds"`
	CustomConfig map[string]interface{} `json:"custom_config"` // chart-specific options
}

// Threshold for gauge/alert coloring
type Threshold struct {
	Value float64 `json:"value"`
	Color string  `json:"color"`
}

// WidgetLayout for grid positioning
type WidgetLayout struct {
	X int `json:"x"`
	Y int `json:"y"`
	W int `json:"w"`
	H int `json:"h"`
}

// TimeConfig for time range settings
type TimeConfig struct {
	TimeRange       string `json:"time_range"`       // e.g., "15m", "1h", "24h", "7d"
	RefreshInterval string `json:"refresh_interval"` // e.g., "30s", "1m", "5m"
}

// MetricDiscovery results
type MetricName struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Description string `json:"description,omitempty"`
	SampleCount uint64 `json:"sample_count"`
}

type MetricLabel struct {
	Key          string   `json:"key"`
	ValueCount   uint64   `json:"value_count"`
	SampleValues []string `json:"sample_values"` // first few values as examples
}

type LabelValue struct {
	Value string `json:"value"`
	Count uint64 `json:"count"`
}

// MetricQueryRequest for flexible querying
type MetricQueryRequest struct {
	Metrics   []MetricQuery `json:"metrics"`
	TimeRange string        `json:"time_range"` // e.g., "15m", "1h"
	Interval  string        `json:"interval"`   // e.g., "1m", "5m" for bucketing
	AccountId uint64        `json:"account_id"`
}

// MetricQueryResponse contains time-series data
type MetricQueryResponse struct {
	Series []MetricSeries `json:"series"`
}

// MetricSeries represents a single time series
type MetricSeries struct {
	Name       string            `json:"name"`
	Labels     map[string]string `json:"labels"`
	DataPoints []DataPoint       `json:"data_points"`
	Stats      SeriesStats       `json:"stats"`
}

// DataPoint represents a single point in time
type DataPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
}

// SeriesStats contains aggregated statistics
type SeriesStats struct {
	Avg   float64 `json:"avg"`
	Min   float64 `json:"min"`
	Max   float64 `json:"max"`
	Sum   float64 `json:"sum"`
	Count uint64  `json:"count"`
}
