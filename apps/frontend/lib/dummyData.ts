// Centralized dummy data generation and storage
// This ensures all pages show consistent data

export interface NodeSummary {
    id: string;
    hostname: string;
    status: 'GREEN' | 'YELLOW' | 'RED';
    uptime: number;
    cpu_usage: number;
    memory_usage_percent: number;
    disk_usage_percent: number;
    network_up: boolean;
}

export interface ServicePerformance {
    service_name: string;
    p95_latency: number; // in milliseconds
}

export interface SlowTrace {
    service_name: string;
    trace_id: string;
    duration: number; // in milliseconds
}

// Singleton class for centralized data
class DummyDataService {
    private static instance: DummyDataService;
    private nodes: NodeSummary[] = [];
    private services: ServicePerformance[] = [];
    private traces: SlowTrace[] = [];

    private constructor() {
        this.generateAllData();
    }

    public static getInstance(): DummyDataService {
        if (!DummyDataService.instance) {
            DummyDataService.instance = new DummyDataService();
        }
        return DummyDataService.instance;
    }

    private generateAllData() {
        this.nodes = this.generateNodes(1000);
        this.services = this.generateServices();
        this.traces = this.generateTraces();
    }

    private generateNodes(count: number): NodeSummary[] {
        const nodes: NodeSummary[] = [];
        const types = ['web', 'db', 'cache', 'worker', 'api', 'queue', 'kafka', 'redis', 'nginx', 'app'];
        const envs = ['prod', 'staging', 'dev'];

        for (let i = 1; i <= count; i++) {
            const type = types[i % types.length];
            const env = envs[i % envs.length];

            // Determine status based on weighted distribution
            const rand = Math.random() * 100;
            let status: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
            if (rand > 92) status = 'RED';      // 8% red
            else if (rand > 75) status = 'YELLOW'; // 17% yellow

            // Correlate metrics with status
            let cpuBase = 30, memBase = 40, diskBase = 35;
            if (status === 'RED') {
                cpuBase = 85;
                memBase = 90;
                diskBase = 85;
            } else if (status === 'YELLOW') {
                cpuBase = 65;
                memBase = 70;
                diskBase = 65;
            }

            nodes.push({
                id: `${env}-${type}-${String(i).padStart(4, '0')}`,
                hostname: `${env}-${type}-${String(i).padStart(4, '0')}`,
                status,
                uptime: Math.floor(Math.random() * 60 * 24 * 3600), // 0-60 days in seconds
                cpu_usage: Math.floor(cpuBase + (Math.random() - 0.5) * 20),
                memory_usage_percent: Math.floor(memBase + (Math.random() - 0.5) * 20),
                disk_usage_percent: Math.floor(diskBase + (Math.random() - 0.5) * 20),
                network_up: status !== 'RED' || Math.random() > 0.5
            });
        }

        return nodes;
    }

    private generateServices(): ServicePerformance[] {
        const services = [
            'frontend-service',
            'backend-api',
            'auth-service',
            'payment-service',
            'notification-service',
            'analytics-service',
            'search-service',
            'recommendation-engine'
        ];

        return services.map(service => ({
            service_name: service,
            p95_latency: Math.floor(50 + Math.random() * 300) // 50-350ms
        }));
    }

    private generateTraces(): SlowTrace[] {
        const services = [
            'frontend-service',
            'backend-api',
            'auth-service',
            'payment-service',
            'notification-service'
        ];

        return services.map((service, i) => ({
            service_name: service,
            trace_id: `trace-${Math.random().toString(36).substring(2, 15)}`,
            duration: Math.floor(500 + Math.random() * 2000) // 500-2500ms
        }));
    }

    // Generate time-series data for charts
    public generateTimeSeriesData(baseValue: number, variance: number = 10, points: number = 12): Array<{ name: string; value: number }> {
        const data = [];
        const labels = ['12m', '11m', '10m', '9m', '8m', '7m', '6m', '5m', '4m', '3m', '2m', '1m', 'now'];

        for (let i = 0; i < points; i++) {
            data.push({
                name: labels[labels.length - points + i] || `${points - i}m`,
                value: Math.max(0, baseValue + (Math.random() - 0.5) * variance)
            });
        }

        return data;
    }

    // Public getters
    public getNodes(): NodeSummary[] {
        return this.nodes;
    }

    public getNodeById(id: string): NodeSummary | undefined {
        return this.nodes.find(node => node.id === id);
    }

    public getServices(): ServicePerformance[] {
        return this.services;
    }

    public getTraces(): SlowTrace[] {
        return this.traces;
    }

    // Summary metrics
    public getSummary() {
        const unhealthyNodes = this.nodes.filter(n => n.status === 'RED' || n.status === 'YELLOW').length;
        const totalRequests = this.nodes.filter(n => n.status === 'GREEN').length * 100;
        const errorRequests = this.nodes.filter(n => n.status === 'RED').length * 10;

        return {
            active_services: this.services.length,
            error_rate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
            avg_latency: this.services.reduce((sum, s) => sum + s.p95_latency, 0) / this.services.length,
            log_volume: Math.floor(Math.random() * 50000) + 10000 // 10k-60k
        };
    }

    // Refresh data (for simulate real-time updates)
    public refresh() {
        this.generateAllData();
    }
}

// Export singleton instance
export const dummyDataService = DummyDataService.getInstance();
