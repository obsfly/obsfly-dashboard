'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Cpu, MemoryStick, HardDrive, Network, Zap, RefreshCw, Activity, ChevronLeft, ChevronRight, Search, Filter, Server, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SimpleChart } from '../../components/Charts';
import { MetricCard } from '../../components/MetricCard';
import { HoneycombGrid } from '../../components/Honeycomb';
import { Skeleton } from '../../components/ui/skeleton';
import { api, NodeSummary, NodeMetrics } from '../../lib/api';

type SortField = 'hostname' | 'status' | 'uptime' | 'cpu_usage' | 'memory_usage_percent' | 'disk_usage_percent';
type SortDirection = 'asc' | 'desc';

function InfrastructureContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const nodeFilter = searchParams.get('node');
    const pageParam = searchParams.get('page');

    const [loading, setLoading] = useState(true);
    const [allNodes, setAllNodes] = useState<NodeSummary[]>([]);
    const [filteredNodes, setFilteredNodes] = useState<NodeSummary[]>([]);
    const [selectedNode, setSelectedNode] = useState<NodeSummary | null>(null);
    const [selectedNodeMetrics, setSelectedNodeMetrics] = useState<NodeMetrics | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED'>('ALL');
    const [currentPage, setCurrentPage] = useState(parseInt(pageParam || '1'));
    const [sortField, setSortField] = useState<SortField>('hostname');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const itemsPerPage = 20;

    const fetchData = useCallback(async () => {
        try {
            if (allNodes.length === 0) {
                setLoading(true);
            }

            // Fetch both infrastructure health (for honeycomb) and detailed nodes (for table)
            const [, nodes] = await Promise.all([
                api.getInfraHealth(15), // Use 15 minutes default
                api.getNodes()
            ]);

            setAllNodes(nodes);

            // If a node is filtered, get its details
            if (nodeFilter) {
                const node = nodes.find(n => n.id === nodeFilter || n.hostname === nodeFilter);
                setSelectedNode(node || null);

                if (node) {
                    const metrics = await api.getNodeMetrics(nodeFilter);
                    setSelectedNodeMetrics(metrics);
                }
            } else {
                setSelectedNode(null);
                setSelectedNodeMetrics(null);
            }
        } catch (error) {
            console.error('Failed to fetch infrastructure data:', error);
        } finally {
            setLoading(false);
        }
    }, [nodeFilter, allNodes.length]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Sort nodes
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
        return sortDirection === 'asc' ?
            <ArrowUp className="w-3 h-3" /> :
            <ArrowDown className="w-3 h-3" />;
    };

    // Filter and sort nodes
    useEffect(() => {
        let filtered = allNodes;

        if (searchQuery) {
            filtered = filtered.filter(node =>
                node.hostname.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(node => node.status === statusFilter);
        }

        // Sort filtered nodes
        filtered.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];

            // Handle string comparison
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                const aStr = aVal.toLowerCase();
                const bStr = bVal.toLowerCase();
                if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
                if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            }

            // Handle number comparison
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            }

            return 0;
        });

        setFilteredNodes(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    }, [allNodes, searchQuery, statusFilter, sortField, sortDirection]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredNodes.length / itemsPerPage);
    const paginatedNodes = filteredNodes.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Optional: update URL if you want deep linking for pages
        // router.push(`/infrastructure?page=${page}`); 
    };

    const handleNodeClick = (nodeId: string) => {
        router.push(`/infrastructure?node=${encodeURIComponent(nodeId)}`);
    };

    // Helper to generate time series data for charts
    const generateTimeSeriesData = (baseValue: number, variance: number, points: number) => {
        return Array.from({ length: points }, (_, i) => ({
            name: `${i}`,
            value: Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * variance))
        }));
    };

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

    const getStatusBadge = (status: string) => {
        const colors = {
            'GREEN': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
            'YELLOW': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
            'RED': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        };
        return colors[status as keyof typeof colors] || colors.GREEN;
    };

    // Prepare honeycomb cells - show up to 1000 nodes
    const honeycombCells = allNodes.slice(0, 1000).map(node => ({
        id: node.id,
        label: node.hostname,  // Show full hostname
        status: node.status,
        tooltip: `${node.hostname}\nCPU: ${node.cpu_usage}%\nMemory: ${node.memory_usage_percent}%`
    }));

    // Calculate Aggregate Metrics
    const totalCpu = allNodes.reduce((acc, node) => acc + node.cpu_usage, 0) / (allNodes.length || 1);
    const totalMem = allNodes.reduce((acc, node) => acc + node.memory_usage_percent, 0) / (allNodes.length || 1);
    const totalDisk = allNodes.reduce((acc, node) => acc + node.disk_usage_percent, 0) / (allNodes.length || 1);

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
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <MetricCard
                            title="Total Nodes"
                            value={allNodes.length}
                            icon={Server}
                            loading={loading}
                        />
                        <MetricCard
                            title="Avg CPU Usage"
                            value={`${totalCpu.toFixed(1)}%`}
                            icon={Cpu}
                            loading={loading}
                        />
                        <MetricCard
                            title="Avg Memory Usage"
                            value={`${totalMem.toFixed(1)}%`}
                            icon={MemoryStick}
                            loading={loading}
                        />
                        <MetricCard
                            title="Avg Disk Usage"
                            value={`${totalDisk.toFixed(1)}%`}
                            icon={HardDrive}
                            loading={loading}
                        />
                    </div>

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

                    {/* Filters and Search */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by hostname or IP..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
                            <Filter className="w-4 h-4 text-gray-500 mr-2" />
                            {['ALL', 'GREEN', 'YELLOW', 'RED'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status as 'ALL' | 'GREEN' | 'YELLOW' | 'RED')}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === status
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* All Nodes Table */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-200">
                                All Infrastructure Nodes
                            </h2>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredNodes.length)} of {filteredNodes.length.toLocaleString()}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="text-gray-600 dark:text-gray-500 uppercase text-xs border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left">
                                            <button onClick={() => handleSort('hostname')} className="flex items-center space-x-1 hover:text-gray-900 dark:hover:text-gray-300 transition-colors">
                                                <span>Hostname</span>
                                                {getSortIcon('hostname')}
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-center">
                                            <button onClick={() => handleSort('status')} className="flex items-center justify-center space-x-1 hover:text-gray-900 dark:hover:text-gray-300 transition-colors w-full">
                                                <span>Status</span>
                                                {getSortIcon('status')}
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            <button onClick={() => handleSort('uptime')} className="flex items-center justify-end space-x-1 hover:text-gray-900 dark:hover:text-gray-300 transition-colors w-full">
                                                <span>Uptime</span>
                                                {getSortIcon('uptime')}
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            <button onClick={() => handleSort('cpu_usage')} className="flex items-center justify-end space-x-1 hover:text-gray-900 dark:hover:text-gray-300 transition-colors w-full">
                                                <span>CPU</span>
                                                {getSortIcon('cpu_usage')}
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            <button onClick={() => handleSort('memory_usage_percent')} className="flex items-center justify-end space-x-1 hover:text-gray-900 dark:hover:text-gray-300 transition-colors w-full">
                                                <span>Memory</span>
                                                {getSortIcon('memory_usage_percent')}
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            <button onClick={() => handleSort('disk_usage_percent')} className="flex items-center justify-end space-x-1 hover:text-gray-900 dark:hover:text-gray-300 transition-colors w-full">
                                                <span>Disk</span>
                                                {getSortIcon('disk_usage_percent')}
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-center">Network</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {loading && filteredNodes.length === 0 ? (
                                        Array.from({ length: 10 }).map((_, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2"><Skeleton className="h-4 w-32" /></td>
                                                <td className="px-3 py-2 text-center"><Skeleton className="h-4 w-12 mx-auto" /></td>
                                                <td className="px-3 py-2 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                                                <td className="px-3 py-2 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                                                <td className="px-3 py-2 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                                                <td className="px-3 py-2 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                                                <td className="px-3 py-2 text-center"><Skeleton className="h-2 w-2 rounded-full mx-auto" /></td>
                                            </tr>
                                        ))
                                    ) : (
                                        paginatedNodes.map((node) => (
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
                                        ))
                                    )}
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
                <main className="space-y-4">
                    {/* CPU Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-200">
                            <Cpu className="w-5 h-5 mr-2 text-blue-500" />
                            CPU Metrics
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                            <div className="lg:col-span-2 h-[250px]">
                                <h3 className="text-sm font-medium text-gray-500 mb-2">CPU Usage Trend</h3>
                                <SimpleChart
                                    data={generateTimeSeriesData(selectedNodeMetrics.cpu_usage, 15, 20)}
                                    type="area"
                                    color="#3b82f6"
                                    unit="%"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3 content-start">
                                <MetricCard title="Usage" value={`${selectedNodeMetrics.cpu_usage.toFixed(1)}%`} icon={Cpu} changeType={selectedNodeMetrics.cpu_usage < 70 ? 'positive' : 'negative'} />
                                <MetricCard title="Cores" value={selectedNodeMetrics.cpu_cores} icon={Cpu} changeType="neutral" />
                                <MetricCard title="Throttled" value="0s" icon={Activity} changeType="positive" />
                                <MetricCard title="Pressure" value="0.1s" icon={Activity} changeType="positive" />
                            </div>
                        </div>
                    </div>

                    {/* Memory Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-200">
                            <MemoryStick className="w-5 h-5 mr-2 text-purple-500" />
                            Memory Metrics
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                            <div className="lg:col-span-2 h-[250px]">
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Memory Usage Trend</h3>
                                <SimpleChart
                                    data={generateTimeSeriesData((1 - selectedNodeMetrics.memory_free / selectedNodeMetrics.memory_total) * 100, 10, 20)}
                                    type="area"
                                    color="#8b5cf6"
                                    unit="%"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3 content-start">
                                <MetricCard title="Total" value={formatBytes(selectedNodeMetrics.memory_total)} icon={MemoryStick} changeType="neutral" />
                                <MetricCard title="Free" value={formatBytes(selectedNodeMetrics.memory_free)} icon={MemoryStick} changeType="positive" />
                                <MetricCard title="Cached" value={formatBytes(selectedNodeMetrics.memory_cached)} icon={MemoryStick} changeType="neutral" />
                                <MetricCard title="OOM Kills" value="0" icon={Activity} changeType="positive" />
                            </div>
                        </div>
                    </div>

                    {/* Disk Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-200">
                            <HardDrive className="w-5 h-5 mr-2 text-green-500" />
                            Disk Metrics
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                            <div className="h-[200px]">
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Disk I/O (MB/s)</h3>
                                <SimpleChart
                                    data={generateTimeSeriesData(50, 30, 20)}
                                    type="area"
                                    color="#10b981"
                                    unit=" MB/s"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard title="Read Latency" value="2ms" icon={Activity} changeType="positive" />
                                <MetricCard title="Write Latency" value="5ms" icon={Activity} changeType="positive" />
                                <MetricCard title="IO Pressure" value="0.2s" icon={Activity} changeType="neutral" />
                                <MetricCard title="Disk Used" value="45%" icon={HardDrive} changeType="neutral" />
                            </div>
                        </div>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full">
                                <thead className="text-gray-600 dark:text-gray-500 uppercase text-xs border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Device</th>
                                        <th className="px-3 py-2 text-right">Reads</th>
                                        <th className="px-3 py-2 text-right">Writes</th>
                                        <th className="px-3 py-2 text-right">Read Bytes</th>
                                        <th className="px-3 py-2 text-right">Written Bytes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {Object.keys(selectedNodeMetrics.disk_reads).map((device) => (
                                        <tr key={device} className="hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                            <td className="px-3 py-2 font-mono text-xs">{device}</td>
                                            <td className="px-3 py-2 text-right text-xs">{selectedNodeMetrics.disk_reads[device]?.toLocaleString() || 0}</td>
                                            <td className="px-3 py-2 text-right text-xs">{selectedNodeMetrics.disk_writes[device]?.toLocaleString() || 0}</td>
                                            <td className="px-3 py-2 text-right text-xs">{formatBytes(selectedNodeMetrics.disk_read_bytes[device] || 0)}</td>
                                            <td className="px-3 py-2 text-right text-xs">{formatBytes(selectedNodeMetrics.disk_written_bytes[device] || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Network Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-200">
                            <Network className="w-5 h-5 mr-2 text-cyan-500" />
                            Network Metrics
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                            <div className="h-[200px]">
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Network Traffic (Mbps)</h3>
                                <SimpleChart
                                    data={generateTimeSeriesData(100, 50, 20)}
                                    type="area"
                                    color="#06b6d4"
                                    unit=" Mbps"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard title="Active Conn" value="1,234" icon={Activity} changeType="neutral" />
                                <MetricCard title="Failed Conn" value="12" icon={Activity} changeType="negative" />
                                <MetricCard title="Retransmits" value="0.1%" icon={Activity} changeType="positive" />
                                <MetricCard title="Latency" value="15ms" icon={Activity} changeType="neutral" />
                            </div>
                        </div>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full">
                                <thead className="text-gray-600 dark:text-gray-500 uppercase text-xs border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Interface</th>
                                        <th className="px-3 py-2 text-center">Status</th>
                                        <th className="px-3 py-2 text-right">Received</th>
                                        <th className="px-3 py-2 text-right">Transmitted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {Object.keys(selectedNodeMetrics.net_received_bytes || {}).map((iface) => (
                                        <tr key={iface} className="hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                            <td className="px-3 py-2 font-mono text-xs">{iface}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs ${selectedNodeMetrics.net_interface_up?.[iface] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {selectedNodeMetrics.net_interface_up?.[iface] ? 'UP' : 'DOWN'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-xs">{formatBytes(selectedNodeMetrics.net_received_bytes[iface] || 0)}</td>
                                            <td className="px-3 py-2 text-right text-xs">{formatBytes(selectedNodeMetrics.net_transmitted_bytes[iface] || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* GPU Metrics */}
                    {selectedNodeMetrics.gpu_info && selectedNodeMetrics.gpu_info.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                            <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-200">
                                <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                                GPU Metrics
                            </h2>
                            <div className="space-y-4">
                                {selectedNodeMetrics.gpu_info.map((gpu) => (
                                    <div key={gpu.uuid} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{gpu.name}</h3>
                                            <span className="text-xs font-mono text-gray-500">{gpu.uuid}</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <MetricCard
                                                title="Utilization"
                                                value={`${selectedNodeMetrics.gpu_utilization[gpu.uuid]?.toFixed(1)}%`}
                                                icon={Zap}
                                                changeType="neutral"
                                            />
                                            <MetricCard
                                                title="Memory"
                                                value={`${(selectedNodeMetrics.gpu_memory_used[gpu.uuid] / 1024).toFixed(1)} GB`}
                                                icon={MemoryStick}
                                                changeType="neutral"
                                            />
                                            <MetricCard
                                                title="Temp"
                                                value={`${selectedNodeMetrics.gpu_temperature[gpu.uuid]}°C`}
                                                icon={Activity}
                                                changeType={selectedNodeMetrics.gpu_temperature[gpu.uuid] > 80 ? 'negative' : 'positive'}
                                            />
                                            <MetricCard
                                                title="Power"
                                                value={`${selectedNodeMetrics.gpu_power[gpu.uuid]}W`}
                                                icon={Zap}
                                                changeType="neutral"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            ) : null}
        </div>
    );
}

export default function InfrastructurePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading infrastructure...</div>}>
            <InfrastructureContent />
        </Suspense>
    );
}
