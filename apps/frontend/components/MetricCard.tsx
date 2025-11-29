import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    change?: string;
    changeType?: 'positive' | 'negative';
}

export function MetricCard({ title, value, icon: Icon, change, changeType }: MetricCardProps) {
    return (
        <div className="bg-gray-900 dark:bg-gray-900 light:bg-white rounded-lg p-4 border border-gray-800 dark:border-gray-800 light:border-gray-200">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-600 uppercase tracking-wide">{title}</span>
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-500 light:text-gray-400" />
            </div>
            <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white dark:text-white light:text-gray-900">{value}</span>
                {change && (
                    <span className={`text-xs font-medium ${changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                        }`}>
                        {change}
                    </span>
                )}
            </div>
        </div>
    );
}
