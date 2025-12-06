'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '../../components/DataTable';
import { Activity, Search, Filter, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';


export const runtime = 'nodejs';

interface ServiceListItem {
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

export default function APMServicesPage() {
    const router = useRouter();
    const [services, setServices] = useState<ServiceListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [timeRange, setTimeRange] = useState(15);
    const [language, setLanguage] = useState('');
    const [status, setStatus] = useState('');
    const [sloCompliance, setSloCompliance] = useState('');
    const [search, setSearch] = useState('');

    // Sorting & Pagination
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const { apmAPI } = await import('../../lib/api');

            const data = await apmAPI.getServicesList({
                minutes: timeRange,
                language,
                status,
                slo_compliance: sloCompliance,
                search,
                sort_by: sortBy,
                sort_order: sortOrder,
                page,
                page_size: pageSize,
            });

            setServices(data.services as unknown as ServiceListItem[]);
            setTotalCount(data.total_count);
        } catch (error) {
            console.error('Failed to fetch services:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
        const interval = setInterval(fetchServices, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [timeRange, language, status, sloCompliance, search, sortBy, sortOrder, page]);

    const columns: Column<ServiceListItem>[] = [
        {
            key: 'service_name',
            header: 'Service Name',
            sortable: true,
            render: (value: unknown, row: ServiceListItem) => (
                <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0">
                        {getLanguageIcon(row.language)}
                    </div>
                    <span className="font-medium">{value as string}</span>
                </div>
            ),
        },
        {
            key: 'language',
            header: 'Language',
            sortable: true,
            render: (value: unknown) => (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium">
                    {(value as string) || 'Unknown'}
                </span>
            ),
        },
        {
            key: 'instances',
            header: 'Instances',
            sortable: true,
            render: (value: unknown) => <span className="font-mono">{value as number}</span>,
        },
        {
            key: 'request_rate',
            header: 'Req/s',
            sortable: true,
            render: (value: unknown) => <span className="font-mono">{(value as number).toFixed(1)}</span>,
        },
        {
            key: 'error_rate',
            header: 'Error Rate',
            sortable: true,
            render: (value: unknown) => (
                <span className={`font-mono ${(value as number) > 5 ? 'text-red-500' : (value as number) > 1 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {(value as number).toFixed(2)}%
                </span>
            ),
        },
        {
            key: 'p95_latency',
            header: 'P95 Latency',
            sortable: true,
            render: (value: unknown) => (
                <span className={`font-mono ${(value as number) > 1000 ? 'text-red-500' : (value as number) > 500 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {(value as number).toFixed(0)}ms
                </span>
            ),
        },
        {
            key: 'slo',
            header: 'SLO',
            sortable: false,
            render: (_: unknown, row: ServiceListItem) => {
                const { status } = row.slo;
                return (
                    <div className="flex items-center space-x-1">
                        {
                            status === 'meeting' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {
                            status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                        {
                            status === 'breaching' && <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-xs capitalize">{status}</span>
                    </div>
                );
            },
        },
        {
            key: 'traces',
            header: 'Traces',
            sortable: false,
            render: (value: unknown) => {
                const traces = value as { total_count: number; error_count: number };
                return (
                    <div className="text-xs">
                        <div className="font-mono">{traces.total_count}</div>
                        <div className="text-gray-500">{traces.error_count} errors</div>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white p-4">
            <header className="mb-6 bg-white dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <h1 className="text-2xl font-bold mb-4">APM Services</h1>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search services..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)
                            }
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
                    </select>

                    <select
                        value={sloCompliance}
                        onChange={(e) => setSloCompliance(e.target.value)}
                        className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                    >
                        <option value="">All SLO Status</option>
                        <option value="meeting">Meeting SLO</option>
                        <option value="warning">Warning</option>
                        <option value="breaching">Breaching</option>
                    </select>

                    <button
                        onClick={fetchServices}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    >
                        <Activity className="w-4 h-4" />
                        <span>Refresh</span>
                    </button>
                </div>
            </header>

            <DataTable
                columns={columns}
                data={services}
                loading={loading}
                emptyMessage="No services found"
                onRowClick={(row) => router.push(`/apm/${encodeURIComponent(row.service_name)}`)
                }
                pagination={{
                    page,
                    pageSize,
                    totalCount,
                    onPageChange: setPage,
                }
                }
                sorting={{
                    sortBy,
                    sortOrder,
                    onSortChange: (newSortBy, newSortOrder) => {
                        setSortBy(newSortBy);
                        setSortOrder(newSortOrder);
                    },
                }}
            />
        </div>
    );
}

function getLanguageIcon(language: string) {
    const iconClass = "w-5 h-5";
    switch (language?.toLowerCase()) {
        case 'java':
            return <div className={`${iconClass} bg-red-500 rounded flex items-center justify-center text-white text-xs font-bold`}>J</div>;
        case 'nodejs':
        case 'node':
            return <div className={`${iconClass} bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold`}>N</div>;
        case 'python':
            return <div className={`${iconClass} bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold`}>P</div>;
        case 'dotnet':
        case '.net':
            return <div className={`${iconClass} bg-purple-500 rounded flex items-center justify-center text-white text-xs font-bold`}>.N</div>;
        case 'go':
            return <div className={`${iconClass} bg-cyan-500 rounded flex items-center justify-center text-white text-xs font-bold`}>G</div>;
        default:
            return <div className={`${iconClass} bg-gray-500 rounded flex items-center justify-center text-white text-xs font-bold`}>?</div>;
    }
}
