'use client';

import { LucideIcon, X } from 'lucide-react';

interface MetricWidgetProps {
    id: string;
    title: string;
    value: string | number;
    icon: LucideIcon;
    change?: string;
    changeType?: 'positive' | 'negative';
    onRemove?: () => void;
}

export function MetricWidget({
    title,
    value,
    icon: Icon,
    change,
    changeType,
    onRemove,
}: MetricWidgetProps) {
    return (
        <div className="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 flex flex-col justify-between">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>
                {onRemove && (
                    <button
                        onClick={onRemove}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Remove"
                    >
                        <X className="w-3 h-3 text-red-500" />
                    </button>
                )}
            </div>
            <div className="mt-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                {change && (
                    <p
                        className={`text-xs mt-1 ${changeType === 'positive'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                            }`}
                    >
                        {change}
                    </p>
                )}
            </div>
        </div>
    );
}
