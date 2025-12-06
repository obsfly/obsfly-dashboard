import { LucideIcon } from 'lucide-react';

import { Skeleton } from './ui/skeleton';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    loading?: boolean;
}

export function MetricCard({ title, value, icon: Icon, change, changeType, loading }: MetricCardProps) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">{title}</span>
                <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="flex items-baseline justify-between">
                {loading ? (
                    <Skeleton className="h-8 w-24" />
                ) : (
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
                )}
                {change && !loading && (
                    <span className={`text-xs font-medium ${changeType === 'positive' ? 'text-green-500' :
                        changeType === 'negative' ? 'text-red-500' :
                            'text-gray-500'
                        }`}>
                        {change}
                    </span>
                )}
            </div>
        </div>
    );
}
