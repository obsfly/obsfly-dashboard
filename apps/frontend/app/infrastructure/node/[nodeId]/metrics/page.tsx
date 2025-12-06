'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Maximize2, Minimize2, Clock } from 'lucide-react';
import { MetricChart, MultiSeriesChart } from '../../../../../components/MetricChart';

interface TimeSeriesPoint {
    timestamp: string;
    value: number;
}

interface NodeMetricsTimeSeries {
    metric_name: string;
    series: TimeSeriesPoint[];
    labels: Record<string, string>;
}

const TIME_RANGES = [
    { label: '15m', value: 15 },
    { label: '1h', value: 60 },
    { label: '6h', value: 360 },
    { label: '24h', value: 1440 },
    { label: '7d', value: 10080 },
];

const COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
];

export default function NodeMetricsGraphPage() {
    const params = useParams();
    const router = useRouter();
    const nodeId = params.nodeId as string;

    const [timeRange, setTimeRange] = useState(60);
    const [groupBy, setGroupBy] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [metricsData, setMetricsData] = useState<NodeMetricsTimeSeries[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();
    }, [nodeId, timeRange, groupBy]);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const url = `http://localhost:8080/api/infrastructure/node/${nodeId}/metrics/timeseries?minutes=${timeRange}${groupBy ? `&group_by=${groupBy}` : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            setMetricsData(data || []);
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
        setIsFullscreen(!isFullscreen);
    };

    const formatBytes = (value: number) => {
        if (value === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(value) / Math.log(k));
        return `${(value / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    const formatPercent = (value: number) => `${value.toFixed(1)}%`;
    const formatTemp = (value: number) => `${value.toFixed(1)}°C`;
    const formatWatts = (value: number) => `${value.toFixed(1)}W`;

    // Group metrics by category
    const cpuMetrics = metricsData.filter(m => m.metric_name === 'node_cpu_usage_percent');
    const memoryMetrics = metricsData.filter(m => m.metric_name === 'node_memory_usage_percent');
    const diskMetrics = metricsData.filter(m => m.metric_name === 'node_disk_usage_percent');
    const networkRxMetrics = metricsData.filter(m => m.metric_name === 'node_net_received_bytes_total');
    const networkTxMetrics = metricsData.filter(m => m.metric_name === 'node_net_transmitted_bytes_total');
    const gpuUtilMetrics = metricsData.filter(m => m.metric_name === 'node_resources_gpu_utilization_percent_avg');
    const gpuMemMetrics = metricsData.filter(m => m.metric_name === 'node_resources_gpu_memory_utilization_percent_avg');
    const gpuTempMetrics = metricsData.filter(m => m.metric_name === 'node_resources_gpu_temperature_celsius');

    return (
        <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 p-6 ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''}`}>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Node Metrics</h1>
                    </div>
                    <button
                        onClick={toggleFullscreen}
                        className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                    </button>
                </div>

                {/* Controls */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Time Range Selector */}
                        <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Time Range:</span>
                            <div className="flex space-x-1">
                                {TIME_RANGES.map(range => (
                                    <button
                                        key={range.value}
                                        onClick={() => setTimeRange(range.value)}
                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeRange === range.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Group By Selector */}
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Group By:</span>
                            <select
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value)}
                                className="px-3 py-1 rounded text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">None</option>
                                <option value="device">Device</option>
                                <option value="interface">Interface</option>
                                <option value="gpu_uuid">GPU UUID</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading metrics...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* CPU Usage */}
                        {cpuMetrics.length > 0 && (
                            cpuMetrics.length === 1 ? (
                                <MetricChart
                                    title="CPU Usage"
                                    data={cpuMetrics[0].series}
                                    color={COLORS[0]}
                                    yAxisLabel="Percentage"
                                    formatValue={formatPercent}
                                />
                            ) : (
                                <MultiSeriesChart
                                    title="CPU Usage"
                                    series={cpuMetrics.map((m, i) => ({
                                        name: Object.values(m.labels)[0] || `CPU ${i + 1}`,
                                        data: m.series,
                                        color: COLORS[i % COLORS.length]
                                    }))}
                                    yAxisLabel="Percentage"
                                    formatValue={formatPercent}
                                />
                            )
                        )}

                        {/* Memory Usage */}
                        {memoryMetrics.length > 0 && (
                            <MetricChart
                                title="Memory Usage"
                                data={memoryMetrics[0].series}
                                color={COLORS[1]}
                                yAxisLabel="Percentage"
                                formatValue={formatPercent}
                            />
                        )}

                        {/* Disk Usage */}
                        {diskMetrics.length > 0 && (
                            diskMetrics.length === 1 ? (
                                <MetricChart
                                    title="Disk Usage"
                                    data={diskMetrics[0].series}
                                    color={COLORS[2]}
                                    yAxisLabel="Percentage"
                                    formatValue={formatPercent}
                                />
                            ) : (
                                <MultiSeriesChart
                                    title="Disk Usage by Device"
                                    series={diskMetrics.map((m, i) => ({
                                        name: m.labels.device || `Disk ${i + 1}`,
                                        data: m.series,
                                        color: COLORS[i % COLORS.length]
                                    }))}
                                    yAxisLabel="Percentage"
                                    formatValue={formatPercent}
                                />
                            )
                        )}

                        {/* Network Received */}
                        {networkRxMetrics.length > 0 && (
                            networkRxMetrics.length === 1 ? (
                                <MetricChart
                                    title="Network Received"
                                    data={networkRxMetrics[0].series}
                                    color={COLORS[3]}
                                    yAxisLabel="Bytes"
                                    formatValue={formatBytes}
                                />
                            ) : (
                                <MultiSeriesChart
                                    title="Network Received by Interface"
                                    series={networkRxMetrics.map((m, i) => ({
                                        name: m.labels.interface || `Interface ${i + 1}`,
                                        data: m.series,
                                        color: COLORS[i % COLORS.length]
                                    }))}
                                    yAxisLabel="Bytes"
                                    formatValue={formatBytes}
                                />
                            )
                        )}

                        {/* Network Transmitted */}
                        {networkTxMetrics.length > 0 && (
                            networkTxMetrics.length === 1 ? (
                                <MetricChart
                                    title="Network Transmitted"
                                    data={networkTxMetrics[0].series}
                                    color={COLORS[4]}
                                    yAxisLabel="Bytes"
                                    formatValue={formatBytes}
                                />
                            ) : (
                                <MultiSeriesChart
                                    title="Network Transmitted by Interface"
                                    series={networkTxMetrics.map((m, i) => ({
                                        name: m.labels.interface || `Interface ${i + 1}`,
                                        data: m.series,
                                        color: COLORS[i % COLORS.length]
                                    }))}
                                    yAxisLabel="Bytes"
                                    formatValue={formatBytes}
                                />
                            )
                        )}

                        {/* GPU Utilization */}
                        {gpuUtilMetrics.length > 0 && (
                            gpuUtilMetrics.length === 1 ? (
                                <MetricChart
                                    title="GPU Utilization"
                                    data={gpuUtilMetrics[0].series}
                                    color={COLORS[5]}
                                    yAxisLabel="Percentage"
                                    formatValue={formatPercent}
                                />
                            ) : (
                                <MultiSeriesChart
                                    title="GPU Utilization"
                                    series={gpuUtilMetrics.map((m, i) => ({
                                        name: m.labels.gpu_uuid?.substring(0, 8) || `GPU ${i + 1}`,
                                        data: m.series,
                                        color: COLORS[i % COLORS.length]
                                    }))}
                                    yAxisLabel="Percentage"
                                    formatValue={formatPercent}
                                />
                            )
                        )}

                        {/* GPU Memory */}
                        {gpuMemMetrics.length > 0 && (
                            gpuMemMetrics.length === 1 ? (
                                <MetricChart
                                    title="GPU Memory Utilization"
                                    data={gpuMemMetrics[0].series}
                                    color={COLORS[6]}
                                    yAxisLabel="Percentage"
                                    formatValue={formatPercent}
                                />
                            ) : (
                                <MultiSeriesChart
                                    title="GPU Memory Utilization"
                                    series={gpuMemMetrics.map((m, i) => ({
                                        name: m.labels.gpu_uuid?.substring(0, 8) || `GPU ${i + 1}`,
                                        data: m.series,
                                        color: COLORS[i % COLORS.length]
                                    }))}
                                    yAxisLabel="Percentage"
                                    formatValue={formatPercent}
                                />
                            )
                        )}

                        {/* GPU Temperature */}
                        {gpuTempMetrics.length > 0 && (
                            gpuTempMetrics.length === 1 ? (
                                <MetricChart
                                    title="GPU Temperature"
                                    data={gpuTempMetrics[0].series}
                                    color={COLORS[7]}
                                    yAxisLabel="Temperature"
                                    formatValue={formatTemp}
                                />
                            ) : (
                                <MultiSeriesChart
                                    title="GPU Temperature"
                                    series={gpuTempMetrics.map((m, i) => ({
                                        name: m.labels.gpu_uuid?.substring(0, 8) || `GPU ${i + 1}`,
                                        data: m.series,
                                        color: COLORS[i % COLORS.length]
                                    }))}
                                    yAxisLabel="Temperature"
                                    formatValue={formatTemp}
                                />
                            )
                        )}
                    </div>
                )}

                {!loading && metricsData.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-600 dark:text-gray-400">No metrics data available</p>
                    </div>
                )}
            </div>
        </div>
    );
}
