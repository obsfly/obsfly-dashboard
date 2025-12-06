'use client';

import { Pie, PieChart, ResponsiveContainer, Cell, Legend, Tooltip } from 'recharts';
import { SimpleChart } from '../Charts';

interface DataPoint {
    name: string;
    value: number;
    [key: string]: string | number;
}

interface AdvancedChartProps {
    data: DataPoint[] | DataPoint[][];  // Can be single series or multi-series
    chartType: 'pie' | 'gauge' | 'multi-line' | 'stacked-bar' | 'stacked-area' | 'line' | 'bar' | 'area';
    colors?: string[];
    title?: string;
    unit?: string;
    stacked?: boolean;
}

const DEFAULT_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

export function AdvancedChart({ data, chartType, colors = DEFAULT_COLORS, title, unit = '' }: AdvancedChartProps) {
    if (chartType === 'pie') {
        return <PieChartComponent data={data as DataPoint[]} colors={colors} title={title} />;
    }

    if (chartType === 'gauge') {
        return <GaugeChart data={data as DataPoint[]} colors={colors} title={title} unit={unit} />;
    }

    if (chartType === 'multi-line' && Array.isArray(data[0]) && Array.isArray(data)) {
        return <MultiSeriesLineChart data={data as DataPoint[][]} colors={colors} title={title} unit={unit} />;
    }

    if (chartType === 'stacked-bar') {
        return <StackedBarChart data={data as DataPoint[]} colors={colors} title={title} unit={unit} />;
    }

    if (chartType === 'stacked-area') {
        return <StackedAreaChart data={data as DataPoint[]} colors={colors} title={title} unit={unit} />;
    }

    // Handle basic types
    if (chartType === 'line' || chartType === 'bar' || chartType === 'area') {
        return <SimpleChart data={data as DataPoint[]} color={colors[0]} type={chartType} unit={unit} />;
    }

    // Fallback to simple chart
    return <SimpleChart data={data as DataPoint[]} color={colors[0]} type="line" unit={unit} />;
}

// Pie Chart Component
function PieChartComponent({ data, colors, title }: { data: DataPoint[]; colors: string[]; title?: string }) {
    return (
        <div className="w-full h-full">
            {title && <h3 className="text-sm font-medium text-gray-300 mb-2">{title}</h3>}
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
                                        <p className="text-gray-300 text-xs font-medium">{payload[0].name}</p>
                                        <p className="text-blue-400 text-sm font-bold">{payload[0].value}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

// Gauge Chart Component
function GaugeChart({ data, colors, title, unit }: { data: DataPoint[]; colors: string[]; title?: string; unit: string }) {
    const value = data[0]?.value || 0;
    const maxValue = 100; // Could be configurable
    const percentage = (value / maxValue) * 100;

    // Determine color based on thresholds
    let gaugeColor = colors[0];
    if (percentage > 80) gaugeColor = '#ef4444'; // Red
    else if (percentage > 60) gaugeColor = '#f59e0b'; // Orange
    else gaugeColor = '#10b981'; // Green

    return (
        <div className="w-full h-full flex flex-col items-center justify-center">
            {title && <h3 className="text-sm font-medium text-gray-300 mb-4">{title}</h3>}
            <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#374151"
                        strokeWidth="12"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth="12"
                        strokeDasharray={`${percentage * 2.51} 251`}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-200">{value.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">{unit}</span>
                </div>
            </div>
        </div>
    );
}

// Multi-series Line Chart
function MultiSeriesLineChart({ data, colors, title, unit }: { data: DataPoint[][]; colors: string[]; title?: string; unit: string }) {
    // Merge multiple series into one dataset with multiple value keys
    const mergedData: Record<string, string | number>[] = [];
    const seriesKeys: string[] = [];

    data.forEach((series, idx) => {
        seriesKeys.push(`series${idx}`);
        series.forEach((point, pointIdx) => {
            if (!mergedData[pointIdx]) {
                mergedData[pointIdx] = { name: point.name };
            }
            mergedData[pointIdx][`series${idx}`] = point.value;
        });
    });

    return (
        <div className="w-full h-full">
            {title && <h3 className="text-sm font-medium text-gray-300 mb-2">{title}</h3>}
            <ResponsiveContainer width="100%" height="100%">
                <SimpleChart data={mergedData as unknown as DataPoint[]} color={colors[0]} type="line" unit={unit} />
            </ResponsiveContainer>
        </div>
    );
}

// Stacked Bar Chart
function StackedBarChart({ data, colors, title, unit }: { data: DataPoint[]; colors: string[]; title?: string; unit: string }) {
    return (
        <div className="w-full h-full">
            {title && <h3 className="text-sm font-medium text-gray-300 mb-2">{title}</h3>}
            <ResponsiveContainer width="100%" height="100%">
                <SimpleChart data={data} color={colors[0]} type="bar" unit={unit} />
            </ResponsiveContainer>
        </div>
    );
}

// Stacked Area Chart
function StackedAreaChart({ data, colors, title, unit }: { data: DataPoint[]; colors: string[]; title?: string; unit: string }) {
    return (
        <div className="w-full h-full">
            {title && <h3 className="text-sm font-medium text-gray-300 mb-2">{title}</h3>}
            <ResponsiveContainer width="100%" height="100%">
                <SimpleChart data={data} color={colors[0]} type="area" unit={unit} />
            </ResponsiveContainer>
        </div>
    );
}
