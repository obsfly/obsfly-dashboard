'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Activity, Clock, TrendingUp, Zap } from 'lucide-react';
import { MetricCard } from '../../../components/MetricCard';

interface ServiceMetrics {
    avg_response_time: number;
    request_rate: number;
    error_rate: number;
    throughput: number;
    status: string;
    instances: number;
    version: string;
    uptime: number;
    memory_usage: number;
}

interface ServiceTrace {
    trace_id: string;
    operation: string;
    duration: number;
    status_code: string;
    timestamp: string;
}

export default function ServiceAPMPage() {
    const params = useParams();
    const serviceName = decodeURIComponent(params.service as string);
    const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);
    const [traces, setTraces] = useState<ServiceTrace[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRangeMinutes, setTimeRangeMinutes] = useState(15);

    const fetchData = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
            const timeParam = `?minutes=${timeRangeMinutes}`;

            const [metricsRes, tracesRes] = await Promise.all([
                fetch(`${apiUrl}/api/service/${encodeURIComponent(serviceName)}/metrics${timeParam}`),
                fetch(`${apiUrl}/api/service/${encodeURIComponent(serviceName)}/traces${timeParam}`)
            ]);

            if (metricsRes.ok) setMetrics(await metricsRes.json());
            if (tracesRes.ok) setTraces(await tracesRes.json());
        } catch (error) {
            console.error('Failed to fetch service data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [serviceName, timeRangeMinutes]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Healthy':
                return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
            case 'Warning':
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
            case 'Critical':
                return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
            default:
                return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
        }
    };

    const formatUptime = (hours: number) => {
        const days = Math.floor(hours / 24);
        const remainingHours = Math.floor(hours % 24);
        return `${days}d ${remainingHours}h`;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white p-4">
            <header className="mb-3 bg-white dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/"
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">{serviceName}</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Application Performance Monitoring</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {loading ? (
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 rounded-full text-xs font-medium">
                                Loading...
                            </span>
                        ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics?.status || 'Unknown')}`}>
                                {metrics?.status || 'Unknown'}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <main className="space-y-3">
                {/* Service Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard
                        title="Avg Response Time"
                        value={loading ? '...' : `${metrics?.avg_response_time?.toFixed(0) || 0}ms`}
                        icon={Clock}
                        change={metrics && metrics.avg_response_time < 200 ? 'Good' : 'High'}
                        changeType={metrics && metrics.avg_response_time < 200 ? 'positive' : 'negative'}
                    />
                    <MetricCard
                        title="Request Rate"
                        value={loading ? '...' : `${(metrics?.request_rate || 0).toFixed(1)}/min`}
                        icon={Activity}
                        change="--"
                        changeType="positive"
                    />
                    <MetricCard
                        title="Error Rate"
                        value={loading ? '...' : `${(metrics?.error_rate || 0).toFixed(2)}%`}
                        icon={Zap}
                        change={metrics && metrics.error_rate < 1 ? 'Good' : 'High'}
                        changeType={metrics && metrics.error_rate < 1 ? 'positive' : 'negative'}
                    />
                    <MetricCard
                        title="Throughput"
                        value={loading ? '...' : `${(metrics?.throughput || 0).toFixed(1)} req/s`}
                        icon={TrendingUp}
                        change="--"
                        changeType="positive"
                    />
                </div>

                {/* Service Information */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                    <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Service Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Service Name</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{serviceName}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                                <span className={`text-sm font-semibold ${metrics?.status === 'Healthy' ? 'text-green-600 dark:text-green-400' :
                                        metrics?.status === 'Warning' ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-red-600 dark:text-red-400'
                                    }`}>
                                    {loading ? 'Loading...' : metrics?.status || 'Unknown'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Instances</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {loading ? '...' : metrics?.instances || 0}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Version</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {loading ? '...' : metrics?.version || 'unknown'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {loading ? '...' : formatUptime(metrics?.uptime || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {loading ? '...' : `${(metrics?.memory_usage || 0).toFixed(0)} MB`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Traces */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                    <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Recent Traces</h2>
                    {loading ? (
                        <div className="text-center text-gray-500 text-sm py-8">Loading traces...</div>
                    ) : traces.length === 0 ? (
                        <div className="text-center text-gray-500 text-sm py-8">
                            No trace data available for this service in the selected time range.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="text-gray-600 dark:text-gray-500 uppercase text-xs border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Trace ID</th>
                                        <th className="px-3 py-2 text-left">Operation</th>
                                        <th className="px-3 py-2 text-center">Status</th>
                                        <th className="px-3 py-2 text-right">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {traces.map((t, i) => (
                                        <tr key={i} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-3 py-2 font-mono text-xs text-gray-500">{t.trace_id.substring(0, 12)}...</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300 text-xs">{t.operation || 'Unknown'}</td>
                                            <td className="px-3 py-2 text-center text-xs">
                                                <span className={`px-2 py-1 rounded-full ${t.status_code.startsWith('2') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                                        t.status_code.startsWith('4') ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                    }`}>
                                                    {t.status_code}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium text-amber-500 text-xs">
                                                {(t.duration * 1000).toFixed(0)}ms
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
