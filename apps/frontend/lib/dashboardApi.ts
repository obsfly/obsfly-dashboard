// API client for dashboard operations

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface MetricName {
    name: string;
    type: string;
    description?: string;
    sample_count: number;
}

export interface MetricLabel {
    key: string;
    value_count: number;
    sample_values: string[];
}

export interface LabelValue {
    value: string;
    count: number;
}

export interface MetricQuery {
    metric_name: string;
    aggregation: string; // avg, sum, min, max, count, p50, p95, p99
    group_by: string[];
    filters: Record<string, string>;
    formula?: string;
    alias?: string;
}

export interface MetricQueryRequest {
    metrics: MetricQuery[];
    time_range: string; // e.g., "15m", "1h", "24h"
    interval: string; // e.g., "1m", "5m"
    account_id?: number;
}

export interface DataPoint {
    timestamp: string;
    value: number;
}

export interface MetricSeries {
    name: string;
    labels: Record<string, string>;
    data_points: DataPoint[];
    stats: {
        avg: number;
        min: number;
        max: number;
        sum: number;
        count: number;
    };
}

export interface MetricQueryResponse {
    series: MetricSeries[];
}

export interface Dashboard {
    dashboard_id: string;
    account_id: number;
    name: string;
    description: string;
    config: string; // JSON-encoded widget layout
    created_at: string;
    updated_at: string;
}

// Metric Discovery APIs
export async function getMetricNames(): Promise<MetricName[]> {
    const response = await fetch(`${API_BASE}/api/metrics/names`);
    if (!response.ok) throw new Error('Failed to fetch metric names');
    return response.json();
}

export async function getMetricLabels(metricName: string): Promise<MetricLabel[]> {
    const response = await fetch(`${API_BASE}/api/metrics/${encodeURIComponent(metricName)}/labels`);
    if (!response.ok) throw new Error('Failed to fetch metric labels');
    return response.json();
}

export async function getLabelValues(metricName: string, labelKey: string): Promise<LabelValue[]> {
    const response = await fetch(
        `${API_BASE}/api/metrics/${encodeURIComponent(metricName)}/labels/${encodeURIComponent(labelKey)}/values`
    );
    if (!response.ok) throw new Error('Failed to fetch label values');
    return response.json();
}

export async function queryMetrics(request: MetricQueryRequest): Promise<MetricQueryResponse> {
    const response = await fetch(`${API_BASE}/api/metrics/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to query metrics');
    return response.json();
}

// Dashboard Management APIs
export async function listDashboards(): Promise<Dashboard[]> {
    const response = await fetch(`${API_BASE}/api/dashboards`);
    if (!response.ok) throw new Error('Failed to fetch dashboards');
    return response.json();
}

export async function getDashboard(dashboardId: string): Promise<Dashboard> {
    const response = await fetch(`${API_BASE}/api/dashboards/${dashboardId}`);
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    return response.json();
}

export async function saveDashboard(dashboard: Partial<Dashboard>): Promise<Dashboard> {
    const response = await fetch(`${API_BASE}/api/dashboards`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dashboard),
    });
    if (!response.ok) throw new Error('Failed to save dashboard');
    return response.json();
}

export async function updateDashboard(dashboardId: string, dashboard: Partial<Dashboard>): Promise<Dashboard> {
    const response = await fetch(`${API_BASE}/api/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dashboard),
    });
    if (!response.ok) throw new Error('Failed to update dashboard');
    return response.json();
}

export async function deleteDashboard(dashboardId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/dashboards/${dashboardId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete dashboard');
}
