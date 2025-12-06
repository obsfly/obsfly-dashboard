
import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082';

export interface Summary {
    active_services: number;
    active_services_change: number;
    error_rate: number;
    error_rate_change: number;
    avg_latency: number;
    avg_latency_change: number;
    log_volume: number;
    log_volume_change: number;
    throughput: number;
    throughput_change: number;
    data_ingested: number;
    data_ingested_change: number;
}

export interface InfraHealth {
    hostname: string;
    cpu_pressure: number;
    mem_pressure: number;
    oom_kills: number;
    status: 'GREEN' | 'YELLOW' | 'RED';
}

export interface ServicePerformance {
    service_name: string;
    p95_latency: number;
}

export interface LogVolume {
    level: string;
    count: number;
}

export interface SlowTrace {
    service_name: string;
    operation: string;
    trace_id: string;
    duration: number;
}

export interface LogPattern {
    sample: string;
    count: number;
    level: string;
}

export interface SystemPerformance {
    cpu_usage: number;
    cpu_usage_change: number;
    memory_usage: number;
    memory_usage_change: number;
    disk_usage: number;
    disk_usage_change: number;
    network_io: number;
    network_io_change: number;
}

export interface Hotspot {
    hostname: string;
    resource: string;
    value: number;
    metric: string;
    change: number;
}

export interface NodeSummary {
    id: string;
    hostname: string;
    ip: string;
    status: 'GREEN' | 'YELLOW' | 'RED';
    cpu_usage: number;
    memory_total: number;
    memory_free: number;
    memory_usage_percent: number;
    disk_usage_percent: number;
    network_transmit: number;
    network_receive: number;
    uptime: number;
    network_up: boolean;
}

export interface NodeMetrics {
    cpu_usage: number;
    cpu_cores: number;
    memory_total: number;
    memory_free: number;
    memory_available: number;
    memory_cached: number;
    disk_reads: Record<string, number>;
    disk_writes: Record<string, number>;
    disk_read_bytes: Record<string, number>;
    disk_written_bytes: Record<string, number>;
    net_received_bytes: Record<string, number>;
    net_transmitted_bytes: Record<string, number>;
    net_interface_up: Record<string, boolean>;
    gpu_info: Array<{ uuid: string; name: string }>;
    gpu_memory_total: Record<string, number>;
    gpu_memory_used: Record<string, number>;
    gpu_utilization: Record<string, number>;
    gpu_temperature: Record<string, number>;
    gpu_power: Record<string, number>;
    uptime: number;
    hostname: string;
    kernel_version: string;
    cloud_provider?: string;
    instance_type?: string;
    region?: string;
}

async function fetchAPI<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    const url = new URL(`${API_URL}${endpoint} `);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
    });

    try {
        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`API call failed: ${res.status} ${res.statusText} `);
        }
        return res.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}: `, error);
        throw error;
    }
}

export interface ServiceListItem {
    service_name: string;
    language: string;
    instances: number;
    request_rate: number;
    error_rate: number;
    p95_latency: number;
    status: 'healthy' | 'warning' | 'critical';
    slo: {
        availability: number;
        success_rate: number;
        latency_compliance: number;
        status: 'meeting' | 'warning' | 'breaching';
    };
    runtime_metrics?: Record<string, number>;
    traces: {
        total_count: number;
        avg_duration_ms: number;
        error_count: number;
    };
    last_seen: string;
}

export interface ServiceListParams {
    minutes?: number;
    language?: string;
    status?: string;
    slo_compliance?: string;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    page_size?: number;
}

export interface LogEntry {
    timestamp: string;
    service_name: string;
    host_name: string;
    namespace: string;
    pod: string;
    severity_text: string;
    body: string;
    trace_id: string;
    span_id: string;
}

export interface LogListParams {
    minutes?: number;
    service?: string;
    host?: string;
    severity?: string;
    env?: string;
    namespace?: string;
    pod?: string;
    search?: string;
    page?: number;
    page_size?: number;
}

export const api = {
    getSummary: (minutes: number) => fetchAPI<Summary>('/api/dashboard/summary', { minutes }),
    getInfraHealth: (minutes: number) => fetchAPI<InfraHealth[]>('/api/dashboard/health', { minutes }),
    getServicePerformance: (minutes: number) => fetchAPI<ServicePerformance[]>('/api/dashboard/performance', { minutes }),
    getLogVolume: (minutes: number) => fetchAPI<LogVolume[]>('/api/dashboard/logs', { minutes }),
    getSlowTraces: (minutes: number) => fetchAPI<SlowTrace[]>('/api/dashboard/traces', { minutes }),
    getLogPatterns: (minutes: number) => fetchAPI<LogPattern[]>('/api/dashboard/patterns', { minutes }),
    getSystemPerformance: (minutes: number) => fetchAPI<SystemPerformance>('/api/dashboard/system', { minutes }),
    getHotspots: (minutes: number) => fetchAPI<Hotspot[]>('/api/dashboard/hotspots', { minutes }),

    // Infrastructure Page APIs
    getNodes: () => fetchAPI<NodeSummary[]>('/api/infrastructure/nodes'),
    getInfrastructureNodes: () => fetchAPI<NodeSummary[]>('/api/infrastructure/nodes'), // Alias for consistency
    getNodeMetrics: (nodeId: string) => fetchAPI<NodeMetrics>(`/api/infrastructure/node/${nodeId}`),

    // APM Page APIs
    getServicesList: (params: ServiceListParams) => fetchAPI<{ services: ServiceListItem[], total_count: number }>('/api/apm/services', params as unknown as Record<string, string | number>),

    // Logs Page APIs
    getLogsList: (params: LogListParams) => fetchAPI<{ logs: LogEntry[], total_count: number }>('/api/logs/list', params as unknown as Record<string, string | number>),
};

// Backward compatibility for APM and Logs pages
export const apmAPI = api;
export const logsAPI = api;
