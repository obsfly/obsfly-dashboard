import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TimeSeriesPoint {
    timestamp: string;
    value: number;
}

interface MetricChartProps {
    title: string;
    data: TimeSeriesPoint[];
    dataKey?: string;
    color?: string;
    yAxisLabel?: string;
    formatValue?: (value: number) => string;
}

export function MetricChart({
    title,
    data,
    dataKey = 'value',
    color = '#3b82f6',
    yAxisLabel,
    formatValue = (v) => v.toFixed(2)
}: MetricChartProps) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis
                        dataKey="timestamp"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        fontSize={12}
                        label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#9ca3af' } } : undefined}
                        tickFormatter={formatValue}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '0.5rem',
                            color: '#fff'
                        }}
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [formatValue(value), title]}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        name={title}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

interface MultiSeriesChartProps {
    title: string;
    series: Array<{
        name: string;
        data: TimeSeriesPoint[];
        color: string;
    }>;
    yAxisLabel?: string;
    formatValue?: (value: number) => string;
}

export function MultiSeriesChart({
    title,
    series,
    yAxisLabel,
    formatValue = (v) => v.toFixed(2)
}: MultiSeriesChartProps) {
    // Merge all series data by timestamp
    const mergedData = series.reduce<Record<string, string | number>[]>((acc, s) => {
        s.data.forEach(point => {
            const existing = acc.find(p => p.timestamp === point.timestamp);
            if (existing) {
                existing[s.name] = point.value;
            } else {
                acc.push({ timestamp: point.timestamp, [s.name]: point.value });
            }
        });
        return acc;
    }, []);

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mergedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis
                        dataKey="timestamp"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        fontSize={12}
                        label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#9ca3af' } } : undefined}
                        tickFormatter={formatValue}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '0.5rem',
                            color: '#fff'
                        }}
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [formatValue(value), '']}
                    />
                    <Legend />
                    {series.map(s => (
                        <Line
                            key={s.name}
                            type="monotone"
                            dataKey={s.name}
                            stroke={s.color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
