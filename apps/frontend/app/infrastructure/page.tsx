'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Cpu, MemoryStick, HardDrive, Network, Zap, Info, RefreshCw, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { SimpleChart } from '../../components/Charts';
import { MetricCard } from '../../components/MetricCard';
import { HoneycombGrid } from '../../components/Honeycomb';
import { dummyDataService, type NodeSummary } from '../../lib/dummyData';

interface NodeMetrics {
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

export default function InfrastructurePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const nodeFilter = searchParams.get('node');
    const pageParam = searchParams.get('page');

    const [allNodes, setAllNodes] = useState<NodeSummary[]>([]);
    const [selectedNode, setSelectedNode] = useState<NodeSummary | null>(null);
    const [selectedNodeMetrics, setSelectedNodeMetrics] = useState<NodeMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(parseInt(pageParam || '1'));
    const [itemsPerPage] = useState(20);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Use centralized dummy data
            const nodes = dummyDataService.getNodes();
            setAllNodes(nodes);

            // If a node is filtered, get its details
            if (nodeFilter) {
                const node = dummyDataService.getNodeById(nodeFilter);
                setSelectedNode(node || null);

                // Generate detailed metrics for the selected node
                if (node) {
                    const mockDetailedMetrics: NodeMetrics = {
                        cpu_usage: node.cpu_usage,
                        cpu_cores: 8,
                        memory_total: 16 * 1024 * 1024 * 1024,
                        memory_free: (100 - node.memory_usage_percent) * 0.16 * 1024 * 1024 * 1024,
                        memory_available: (100 - node.memory_usage_percent) * 0.16 * 1024 * 1024 * 1024,
                        memory_cached: 3 * 1024 * 1024 * 1024,
                        disk_reads: { 'sda': 1234, 'sdb': 567 },
                        disk_writes: { 'sda': 890, 'sdb': 234 },
                        disk_read_bytes: { 'sda': 1234567890, 'sdb': 567890123 },
                        disk_written_bytes: { 'sda': 890123456, 'sdb': 234567890 },
                        net_received_bytes: { 'eth0': 1234567890, 'eth1': 567890 },
                        net_transmitted_bytes: { 'eth0': 987654321, 'eth1': 123456 },
                        net_interface_up: { 'eth0': node.network_up, 'eth1': false },
                        gpu_info: node.status === 'GREEN' ? [] : [{ uuid: 'GPU-abc123', name: 'NVIDIA A100' }],
                        gpu_memory_total: { 'GPU-abc123': 40960 },
                        gpu_memory_used: { 'GPU-abc123': 15360 },
                        gpu_utilization: { 'GPU-abc123': 67 },
                        gpu_temperature: { 'GPU-abc123': 65 },
                        gpu_power: { 'GPU-abc123': 250 },
                        uptime: node.uptime,
                        hostname: node.hostname,
                        kernel_version: '5.15.0-89-generic',
                        cloud_provider: 'AWS',
                        instance_type: 'm5.2xlarge',
                        region: 'us-east-1'
                    };
                    setSelectedNodeMetrics(mockDetailedMetrics);
                }
            } else {
                setSelectedNode(null);
                setSelectedNodeMetrics(null);
            }

        } catch (error) {
            console.error('Failed to fetch infrastructure data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [nodeFilter]);

    useEffect(() => {
        setCurrentPage(parseInt(pageParam || '1'));
    }, [pageParam]);

    const formatBytes = (bytes: number) => {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        return `${days}d ${hours}h`;
    };

    const handleNodeClick = (nodeId: string) => {
        router.push(`/infrastructure?node=${encodeURIComponent(nodeId)}`);
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            'GREEN': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
            'YELLOW': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
            'RED': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        };
        return colors[status as keyof typeof colors] || colors.GREEN;
    };

    // Pagination logic
    const totalPages = Math.ceil(allNodes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentNodes = allNodes.slice(startIndex, endIndex);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        router.push(`/infrastructure?page=${page}`);
    };

    // Prepare honeycomb cells - show up to 1000 nodes
    const honeycombCells = allNodes.slice(0, 1000).map(node => ({
        id: node.id,
        label: node.id.length > 12 ? node.id.substring(0, 12) : node.id,
        status: node.status,
        tooltip: `${node.hostname}\nCPU: ${node.cpu_usage}% | Mem: ${node.memory_usage_percent}% | Disk: ${node.disk_usage_percent}%`
    }));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white p-4">
            <header className="mb-3 bg-white dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">Infrastructure Monitoring</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {allNodes.length.toLocaleString()} nodes total
                                {nodeFilter && (
                                    <>
                                        {' • '}Viewing: <span className="font-mono font-semibold">{nodeFilter}</span>
                                        <button
                                            onClick={() => router.push('/infrastructure')}
                                            className="ml-2 text-blue-500 hover:text-blue-600 text-xs underline"
                                        >
                                            Clear filter
                                        </button>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    <button onClick={fetchData} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {loading && allNodes.length === 0 ? (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-500">Loading infrastructure...</p>
                </div>
            ) : !nodeFilter ? (
                <main className="space-y-3">
                    {/* Infrastructure Health Honeycomb */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
                            <Activity className="w-4 h-4 mr-2 text-blue-500" />
                            Infrastructure Health Map (Up to 1000 Nodes)
                        </h2>
                        <div className="flex items-center justify-center min-h-[400px] p-4">
                            <HoneycombGrid cells={honeycombCells} />
                        </div>
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                            Click any cell to view detailed metrics • Showing {Math.min(allNodes.length, 1000)} of {allNodes.length.toLocaleString()} nodes
                        </p>
                    </div>

                    {/* All Nodes Table */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-200">
                                All Infrastructure Nodes
                            </h2>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Showing {startIndex + 1}-{Math.min(endIndex, allNodes.length)} of {allNodes.length.toLocaleString()}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="text-gray-600 dark:text-gray-500 uppercase text-xs border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Hostname</th>
                                        <th className="px-3 py-2 text-center">Status</th>
                                        <th className="px-3 py-2 text-right">Uptime</th>
                                        <th className="px-3 py-2 text-right">CPU</th>
                                        <th className="px-3 py-2 text-right">Memory</th>
                                        <th className="px-3 py-2 text-right">Disk</th>
                                        <th className="px-3 py-2 text-center">Network</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {currentNodes.map((node) => (
                                        <tr
                                            key={node.id}
                                            onClick={() => handleNodeClick(node.id)}
                                            className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300 font-semibold">{node.hostname}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(node.status)}`}>
                                                    {node.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-xs">{formatUptime(node.uptime)}</td>
                                            <td className="px-3 py-2 text-right text-xs">
                                                <span className={node.cpu_usage > 80 ? 'text-red-500 font-semibold' : node.cpu_usage > 60 ? 'text-yellow-500' : 'text-gray-700 dark:text-gray-300'}>
                                                    {node.cpu_usage}%
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-xs">
                                                <span className={node.memory_usage_percent > 80 ? 'text-red-500 font-semibold' : node.memory_usage_percent > 60 ? 'text-yellow-500' : 'text-gray-700 dark:text-gray-300'}>
                                                    {node.memory_usage_percent}%
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-xs">
                                                <span className={node.disk_usage_percent > 80 ? 'text-red-500 font-semibold' : node.disk_usage_percent > 60 ? 'text-yellow-500' : 'text-gray-700 dark:text-gray-300'}>
                                                    {node.disk_usage_percent}%
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`w-2 h-2 rounded-full inline-block ${node.network_up ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Previous</span>
                                </button>

                                <div className="flex items-center space-x-2">
                                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${currentPage === pageNum
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    {totalPages > 5 && currentPage < totalPages - 2 && (
                                        <>
                                            <span className="text-gray-500">...</span>
                                            <button
                                                onClick={() => handlePageChange(totalPages)}
                                                className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {totalPages}
                                            </button>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            ) : selectedNode && selectedNodeMetrics ? (
                // Detailed Node Metrics View with Charts
                <main className="space-y-3">
                    {/* Metric Trends Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">CPU Usage Trend (%)</h2>
                            <div className="h-[200px]">
                                <SimpleChart
                                    data={dummyDataService.generateTimeSeriesData(selectedNode.cpu_usage, 15, 12)}
                                    type="area"
                                    color="#3b82f6"
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Memory Usage Trend (%)</h2>
                            <div className="h-[200px]">
                                <SimpleChart
                                    data={dummyDataService.generateTimeSeriesData(selectedNode.memory_usage_percent, 12, 12)}
                                    type="area"
                                    color="#8b5cf6"
                                />
                            </div>
                        </div>
                    </div>

                    {/* CPU Metrics */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
                            <Cpu className="w-4 h-4 mr-2 text-blue-500" />
                            CPU Metrics
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <MetricCard
                                title="CPU Usage"
                                value={`${selectedNodeMetrics.cpu_usage.toFixed(1)}%`}
                                icon={Cpu}
                                change={selectedNodeMetrics.cpu_usage < 70 ? 'Normal' : 'High'}
                                changeType={selectedNodeMetrics.cpu_usage < 70 ? 'positive' : 'negative'}
                            />
                            <MetricCard
                                title="Logical Cores"
                                value={selectedNodeMetrics.cpu_cores}
                                icon={Cpu}
                                change="--"
                                changeType="positive"
                            />
                        </div>
                    </div>

                    {/* Memory Metrics */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
                            <MemoryStick className="w-4 h-4 mr-2 text-purple-500" />
                            Memory Metrics
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <MetricCard
                                title="Total Memory"
                                value={formatBytes(selectedNodeMetrics.memory_total)}
                                icon={MemoryStick}
                                change="--"
                                changeType="positive"
                            />
                            <MetricCard
                                title="Free Memory"
                                value={formatBytes(selectedNodeMetrics.memory_free)}
                                icon={MemoryStick}
                                change="--"
                                changeType="positive"
                            />
                            <MetricCard
                                title="Available Memory"
                                value={formatBytes(selectedNodeMetrics.memory_available)}
                                icon={MemoryStick}
                                change="--"
                                changeType="positive"
                            />
                            <MetricCard
                                title="Cached Memory"
                                value={formatBytes(selectedNodeMetrics.memory_cached)}
                                icon={MemoryStick}
                                change="--"
                                changeType="positive"
                            />
                        </div>
                    </div>

                    {/* Disk & Network Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Disk I/O (MB/s)</h2>
                            <div className="h-[200px]">
                                <SimpleChart
                                    data={dummyDataService.generateTimeSeriesData(selectedNode.disk_usage_percent * 2, 40, 12)}
                                    type="area"
                                    color="#10b981"
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Network Traffic (Mbps)</h2>
                            <div className="h-[200px]">
                                <SimpleChart
                                    data={dummyDataService.generateTimeSeriesData(450, 150, 12)}
                                    type="area"
                                    color="#06b6d4"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Disk Metrics */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
                            <HardDrive className="w-4 h-4 mr-2 text-green-500" />
                            Disk Metrics
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="text-gray-600 dark:text-gray-500 uppercase text-xs border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Device</th>
                                        <th className="px-3 py-2 text-right">Reads (ops)</th>
                                        <th className="px-3 py-2 text-right">Writes (ops)</th>
                                        <th className="px-3 py-2 text-right">Read (bytes)</th>
                                        <th className="px-3 py-2 text-right">Written (bytes)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {Object.keys(selectedNodeMetrics.disk_reads).map((device) => (
                                        <tr key={device} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{device}</td>
                                            <td className="px-3 py-2 text-right text-xs">{selectedNodeMetrics.disk_reads[device].toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right text-xs">{selectedNodeMetrics.disk_writes[device].toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right text-xs">{formatBytes(selectedNodeMetrics.disk_read_bytes[device])}</td>
                                            <td className="px-3 py-2 text-right text-xs">{formatBytes(selectedNodeMetrics.disk_written_bytes[device])}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Network Metrics */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
                            <Network className="w-4 h-4 mr-2 text-cyan-500" />
                            Network Metrics
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="text-gray-600 dark:text-gray-500 uppercase text-xs border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Interface</th>
                                        <th className="px-3 py-2 text-center">Status</th>
                                        <th className="px-3 py-2 text-right">Received (bytes)</th>
                                        <th className="px-3 py-2 text-right">Transmitted (bytes)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {Object.keys(selectedNodeMetrics.net_received_bytes).map((iface) => (
                                        <tr key={iface} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{iface}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs ${selectedNodeMetrics.net_interface_up[iface]
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                    }`}>
                                                    {selectedNodeMetrics.net_interface_up[iface] ? 'UP' : 'DOWN'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-xs">{formatBytes(selectedNodeMetrics.net_received_bytes[iface])}</td>
                                            <td className="px-3 py-2 text-right text-xs">{formatBytes(selectedNodeMetrics.net_transmitted_bytes[iface])}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* GPU Metrics */}
                    {selectedNodeMetrics.gpu_info.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                            <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
                                <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                                GPU Metrics
                            </h2>
                            <div className="space-y-3">
                                {selectedNodeMetrics.gpu_info.map((gpu) => (
                                    <div key={gpu.uuid} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                        <h3 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">{gpu.name}</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                            <div className="bg-gray-50 dark:bg-gray-800/30 p-2 rounded">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Memory Used</p>
                                                <p className="text-sm font-semibold">
                                                    {selectedNodeMetrics.gpu_memory_used[gpu.uuid]} / {selectedNodeMetrics.gpu_memory_total[gpu.uuid]} MB
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/30 p-2 rounded">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Utilization</p>
                                                <p className="text-sm font-semibold">{selectedNodeMetrics.gpu_utilization[gpu.uuid]}%</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/30 p-2 rounded">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Temperature</p>
                                                <p className="text-sm font-semibold">{selectedNodeMetrics.gpu_temperature[gpu.uuid]}°C</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/30 p-2 rounded">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Power Usage</p>
                                                <p className="text-sm font-semibold">{selectedNodeMetrics.gpu_power[gpu.uuid]}W</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/30 p-2 rounded">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">UUID</p>
                                                <p className="text-xs font-mono">{gpu.uuid.substring(0, 12)}...</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* System Info */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
                            <Info className="w-4 h-4 mr-2 text-gray-500" />
                            System Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Hostname</span>
                                    <span className="text-sm font-semibold font-mono">{selectedNodeMetrics.hostname}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                                    <span className="text-sm font-semibold">{formatUptime(selectedNodeMetrics.uptime)}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Kernel Version</span>
                                    <span className="text-sm font-semibold font-mono">{selectedNodeMetrics.kernel_version}</span>
                                </div>
                            </div>
                            {selectedNodeMetrics.cloud_provider && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Cloud Provider</span>
                                        <span className="text-sm font-semibold">{selectedNodeMetrics.cloud_provider}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Instance Type</span>
                                        <span className="text-sm font-semibold font-mono">{selectedNodeMetrics.instance_type}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Region</span>
                                        <span className="text-sm font-semibold">{selectedNodeMetrics.region}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            ) : null}
        </div>
    );
}
