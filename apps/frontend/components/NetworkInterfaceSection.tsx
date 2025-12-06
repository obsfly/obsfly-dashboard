import React from 'react';
import { Wifi } from 'lucide-react';

interface NetworkInterfaceProps {
    interfaces: Record<string, {
        up: boolean;
        ips?: string[];
        rxBytes?: number;
        txBytes?: number;
        rxPackets?: number;
        txPackets?: number;
    }>;
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export function NetworkInterfaceSection({ interfaces }: NetworkInterfaceProps) {
    const interfaceNames = Object.keys(interfaces);

    if (interfaceNames.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2 mb-4">
                <Wifi className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Network Interfaces</h2>
            </div>
            <div className="space-y-4">
                {interfaceNames.map(iface => {
                    const data = interfaces[iface];
                    return (
                        <div key={iface} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{iface}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${data.up
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {data.up ? 'UP' : 'DOWN'}
                                    </span>
                                </div>
                                {data.ips && data.ips.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {data.ips.map(ip => (
                                            <span key={ip} className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                {ip}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">RX Bytes</div>
                                    <div className="font-medium text-gray-900 dark:text-white">{formatBytes(data.rxBytes || 0)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">TX Bytes</div>
                                    <div className="font-medium text-gray-900 dark:text-white">{formatBytes(data.txBytes || 0)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">RX Packets</div>
                                    <div className="font-medium text-gray-900 dark:text-white">{(data.rxPackets || 0).toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">TX Packets</div>
                                    <div className="font-medium text-gray-900 dark:text-white">{(data.txPackets || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
