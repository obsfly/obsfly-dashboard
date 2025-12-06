'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback } from 'react';
import { DataTable, Column } from '../../components/DataTable';
import { LogDetailPanel } from '../../components/LogDetailPanel';
import { Activity, Search } from 'lucide-react';



interface LogEntry {
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

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

    // Filters
    const [timeRange, setTimeRange] = useState(60);
    const [service, setService] = useState('');
    const [host, setHost] = useState('');
    const [severity, setSeverity] = useState('');
    const [environment] = useState('');
    const [namespace, setNamespace] = useState('');
    const [pod, setPod] = useState('');
    const [search, setSearch] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const { logsAPI } = await import('../../lib/api');

            const data = await logsAPI.getLogsList({
                minutes: timeRange,
                service,
                host,
                severity,
                env: environment,
                namespace,
                pod,
                search,
                page,
                page_size: pageSize,
            });

            setLogs(data.logs as unknown as LogEntry[]);
            setTotalCount(data.total_count);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    }, [timeRange, service, host, severity, environment, namespace, pod, search, page, pageSize]);

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [fetchLogs]);

    const columns: Column<LogEntry>[] = [
        {
            key: 'timestamp',
            header: 'Timestamp',
            sortable: false,
            render: (value: unknown) => (
                <span className="font-mono text-xs">
                    {new Date(value as string).toLocaleString()}
                </span>
            ),
        },
        {
            key: 'service_name',
            header: 'Service',
            sortable: false,
            render: (value: unknown) => (
                <span className="font-medium text-sm">{(value as string) || '-'}</span>
            ),
        },
        {
            key: 'severity_text',
            header: 'Severity',
            sortable: false,
            render: (value: unknown) => {
                const colors = {
                    ERROR: 'text-red-500 bg-red-100 dark:bg-red-900/30',
                    WARN: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
                    WARNING: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
                    INFO: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
                    DEBUG: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
                };
                const color = colors[value as keyof typeof colors] || colors.DEBUG;

                return (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
                        {(value as string) || 'UNKNOWN'}
                    </span>
                );
            },
        },
        {
            key: 'body',
            header: 'Message',
            sortable: false,
            render: (value: unknown) => (
                <span className="text-sm line-clamp-2">{value as string}</span>
            ),
        },
        {
            key: 'trace_id',
            header: 'Trace',
            sortable: false,
            render: (value: unknown) => (
                value ? (
                    <span className="font-mono text-xs text-blue-500">{(value as string).substring(0, 8)}...</span>
                ) : (
                    <span className="text-gray-400">-</span>
                )
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white p-4">
            <header className="mb-6 bg-white dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <h1 className="text-2xl font-bold mb-4">Logs</h1>

                {/* Filters */}
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search in messages..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm w-full"
                            />
                        </div>

                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(Number(e.target.value))}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                        >
                            <option value={15}>Last 15 min</option>
                            <option value={60}>Last 1 hour</option>
                            <option value={360}>Last 6 hours</option>
                            <option value={1440}>Last 24 hours</option>
                            <option value={10080}>Last 7 days</option>
                        </select>

                        <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                        >
                            <option value="">All Severities</option>
                            <option value="DEBUG">DEBUG</option>
                            <option value="INFO">INFO</option>
                            <option value="WARN">WARN</option>
                            <option value="ERROR">ERROR</option>
                        </select>

                        <button
                            onClick={fetchLogs}
                            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                        >
                            <Activity className="w-4 h-4" />
                            <span>Refresh</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                            type="text"
                            placeholder="Service name..."
                            value={service}
                            onChange={(e) => setService(e.target.value)}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                        />

                        <input
                            type="text"
                            placeholder="Hostname..."
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                        />

                        <input
                            type="text"
                            placeholder="Namespace..."
                            value={namespace}
                            onChange={(e) => setNamespace(e.target.value)}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                        />

                        <input
                            type="text"
                            placeholder="Pod..."
                            value={pod}
                            onChange={(e) => setPod(e.target.value)}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                        />
                    </div>
                </div>
            </header>

            <DataTable
                columns={columns}
                data={logs}
                loading={loading}
                emptyMessage="No logs found"
                onRowClick={(row) => setSelectedLog(row)}
                pagination={{
                    page,
                    pageSize,
                    totalCount,
                    onPageChange: setPage,
                }}
            />

            {/* Detail Panel */}
            {
                selectedLog && (
                    <LogDetailPanel
                        log={selectedLog}
                        onClose={() => setSelectedLog(null)}
                    />
                )
            }
        </div>
    );
}
