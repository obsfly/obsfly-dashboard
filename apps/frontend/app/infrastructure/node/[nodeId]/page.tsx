'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Server, Cloud, Clock, MapPin, Cpu, MemoryStick, Network } from 'lucide-react';
import { NetworkInterfaceSection } from '../../../../components/NetworkInterfaceSection';
import { GpuDetailsSection } from '../../../../components/GpuDetailsSection';
import { ChangeIndicator } from '../../../../components/ChangeIndicator';
import { formatUptime } from '../../../../lib/formatters';

interface GpuInfo {
    uuid: string;
    name: string;
}

interface NodeDetails {
    hostname: string;
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
    disk_read_time: Record<string, number>;
    disk_write_time: Record<string, number>;
    disk_io_time: Record<string, number>;
    net_received_bytes: Record<string, number>;
    net_transmitted_bytes: Record<string, number>;
    net_received_packets: Record<string, number>;
    net_transmitted_packets: Record<string, number>;
    net_interface_up: Record<string, boolean>;
    net_interface_ips: Record<string, string[]>;
    gpu_info: GpuInfo[];
    gpu_memory_total: Record<string, number>;
    gpu_memory_used: Record<string, number>;
    gpu_memory_util_avg: Record<string, number>;
    gpu_memory_util_peak: Record<string, number>;
    gpu_utilization_avg: Record<string, number>;
    gpu_utilization_peak: Record<string, number>;
    gpu_temperature: Record<string, number>;
    gpu_power: Record<string, number>;
    uptime: number;
    kernel_version: string;
    agent_version: string;
    cloud_provider: string;
    account_id: string;
    instance_id: string;
    instance_type: string;
    instance_life_cycle: string;
    region: string;
    availability_zone: string;
    availability_zone_id: string;
    local_ipv4: string;
    public_ipv4: string;
}

interface ChangePercentage {
    cpu_usage_change: number;
    memory_usage_change: number;
    disk_usage_change: number;
    network_receive_change: number;
    network_transmit_change: number;
}

export default function NodeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const nodeId = params.nodeId as string;

    const [node, setNode] = useState<NodeDetails | null>(null);
    const [changePercentage, setChangePercentage] = useState<ChangePercentage | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNodeDetails = async () => {
            try {
                const [nodeData, changeData] = await Promise.all([
                    fetch(`http://localhost:8080/api/infrastructure/node/${nodeId}`).then(r => r.json()),
                    fetch(`http://localhost:8080/api/infrastructure/node/${nodeId}/metrics/change`).then(r => r.json())
                ]);
                setNode(nodeData);
                setChangePercentage(changeData);
            } catch (error) {
                console.error('Failed to fetch node details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNodeDetails();
    }, [nodeId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-6"></div>
                        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!node) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </button>
                    <div className="text-center text-gray-500 py-12">Node not found</div>
                </div>
            </div>
        );
    }

    const memoryUsagePercent = ((node.memory_total - node.memory_free) / node.memory_total) * 100;

    // Prepare network interfaces data for the component
    interface NetworkInterfaceData {
        up: boolean;
        ips?: string[];
        rxBytes?: number;
        txBytes?: number;
        rxPackets?: number;
        txPackets?: number;
    }

    const networkInterfaces = Object.keys(node.net_interface_up).reduce<Record<string, NetworkInterfaceData>>((acc, iface) => {
        acc[iface] = {
            up: node.net_interface_up[iface],
            ips: node.net_interface_ips[iface],
            rxBytes: node.net_received_bytes[iface],
            txBytes: node.net_transmitted_bytes[iface],
            rxPackets: node.net_received_packets[iface],
            txPackets: node.net_transmitted_packets[iface],
        };
        return acc;
    }, {});

    // Prepare GPU data for the component
    const gpuData = {
        memoryTotal: node.gpu_memory_total,
        memoryUsed: node.gpu_memory_used,
        memoryUtilAvg: node.gpu_memory_util_avg,
        utilizationAvg: node.gpu_utilization_avg,
        temperature: node.gpu_temperature,
        power: node.gpu_power,
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
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
                        <div className="flex items-center space-x-3">
                            <Server className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{node.hostname}</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push(`/infrastructure/node/${nodeId}/metrics`)}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span>See Graphs</span>
                    </button>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</span>
                            <Cpu className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex items-baseline space-x-2">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{node.cpu_usage.toFixed(1)}%</div>
                            {changePercentage && <ChangeIndicator change={changePercentage.cpu_usage_change} />}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</span>
                            <MemoryStick className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="flex items-baseline space-x-2">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{memoryUsagePercent.toFixed(1)}%</div>
                            {changePercentage && <ChangeIndicator change={changePercentage.memory_usage_change} />}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Network</span>
                            <Network className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-baseline space-x-2">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {Object.keys(node.net_interface_up).filter(k => node.net_interface_up[k]).length}
                            </div>
                            <span className="text-xs text-gray-500">interfaces up</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                            <Clock className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatUptime(node.uptime)}</div>
                    </div>
                </div>

                {/* Network Interfaces - Using Reusable Component */}
                <NetworkInterfaceSection interfaces={networkInterfaces} />

                {/* GPU Details - Using Reusable Component */}
                <GpuDetailsSection gpuInfo={node.gpu_info} gpuData={gpuData} />

                {/* Node Meta & Cloud Information */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center space-x-2 mb-4">
                        <Cloud className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Node Information</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kernel Version</div>
                            <div className="text-sm font-mono text-gray-900 dark:text-white">{node.kernel_version}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Agent Version</div>
                            <div className="text-sm font-mono text-gray-900 dark:text-white">{node.agent_version}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">CPU Cores</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{node.cpu_cores}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Provider</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white uppercase">{node.cloud_provider}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Instance ID</div>
                            <div className="text-sm font-mono text-gray-900 dark:text-white">{node.instance_id}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Instance Type</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{node.instance_type}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lifecycle</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">{node.instance_life_cycle}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                Region
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{node.region}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Availability Zone</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{node.availability_zone}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Local IPv4</div>
                            <div className="text-sm font-mono text-gray-900 dark:text-white">{node.local_ipv4}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Public IPv4</div>
                            <div className="text-sm font-mono text-gray-900 dark:text-white">{node.public_ipv4}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
