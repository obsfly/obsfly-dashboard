import React from 'react';
import { Activity, Zap } from 'lucide-react';

interface GpuInfo {
    uuid: string;
    name: string;
}

interface GpuDetailsProps {
    gpuInfo: GpuInfo[];
    gpuData: {
        memoryTotal: Record<string, number>;
        memoryUsed: Record<string, number>;
        memoryUtilAvg: Record<string, number>;
        utilizationAvg: Record<string, number>;
        temperature: Record<string, number>;
        power: Record<string, number>;
    };
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export function GpuDetailsSection({ gpuInfo, gpuData }: GpuDetailsProps) {
    if (!gpuInfo || gpuInfo.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">GPU Details</h2>
            </div>
            <div className="space-y-4">
                {gpuInfo.map(gpu => (
                    <div key={gpu.uuid} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">{gpu.name}</div>
                                <div className="text-xs font-mono text-gray-500 dark:text-gray-400">{gpu.uuid}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {gpuData.power[gpu.uuid]?.toFixed(1) || 0}W
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Utilization</div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {gpuData.utilizationAvg[gpu.uuid]?.toFixed(1) || 0}%
                                    <span className="text-xs text-gray-500 ml-1">(avg)</span>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Memory Used</div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {formatBytes(gpuData.memoryUsed[gpu.uuid] || 0)} / {formatBytes(gpuData.memoryTotal[gpu.uuid] || 0)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mem Util</div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {gpuData.memoryUtilAvg[gpu.uuid]?.toFixed(1) || 0}%
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Temperature</div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {gpuData.temperature[gpu.uuid]?.toFixed(1) || 0}°C
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
