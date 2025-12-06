'use client';

import { SimpleChart } from '../Charts';
import { X, Settings } from 'lucide-react';

interface ChartWidgetProps {
    id: string;
    title: string;
    chartType: 'line' | 'bar' | 'area';
    color: string;
    data: Array<{ name: string; value: number }>;
    onRemove?: () => void;
    onConfigure?: () => void;
}

export function ChartWidget({
    title,
    chartType,
    color,
    data,
    onRemove,
    onConfigure,
}: ChartWidgetProps) {
    return (
        <div className="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">{title}</h3>
                <div className="flex items-center space-x-1">
                    {onConfigure && (
                        <button
                            onClick={onConfigure}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            title="Configure"
                        >
                            <Settings className="w-4 h-4 text-gray-500" />
                        </button>
                    )}
                    {onRemove && (
                        <button
                            onClick={onRemove}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Remove"
                        >
                            <X className="w-4 h-4 text-red-500" />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <SimpleChart data={data} type={chartType} color={color} />
            </div>
        </div>
    );
}
