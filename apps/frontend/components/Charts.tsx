'use client';

import { Bar, BarChart, Line, LineChart, Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
    name: string;
    value: number;
    [key: string]: any;
}

interface ChartProps {
    data: DataPoint[];
    color?: string;
    type?: 'line' | 'bar' | 'area';
    onItemClick?: (item: DataPoint) => void;
    unit?: string; // Add unit parameter for proper tooltip formatting
}

export function SimpleChart({ data, color = '#8b5cf6', type = 'bar', onItemClick, unit = '' }: ChartProps) {
    const handleClick = (data: any) => {
        if (onItemClick && data && data.activePayload && data.activePayload[0]) {
            onItemClick(data.activePayload[0].payload);
        }
    };

    const chartConfig = {
        margin: { top: 5, right: 5, left: -20, bottom: 5 },
    };

    // Format value with unit
    const formatValue = (value: number) => {
        if (!unit) return value.toFixed(1);
        return `${value.toFixed(1)}${unit}`;
    };

    if (type === 'bar') {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} {...chartConfig} onClick={handleClick}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#9ca3af"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => formatValue(value)}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
                                        <p className="text-gray-300 text-xs font-medium">{payload[0].payload.name}</p>
                                        <p className="text-blue-400 text-sm font-bold">{formatValue(payload[0].value as number)}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar
                        dataKey="value"
                        fill={color}
                        radius={[4, 4, 0, 0]}
                        className="cursor-pointer"
                    />
                </BarChart>
            </ResponsiveContainer>
        );
    }

    if (type === 'line') {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} {...chartConfig}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#9ca3af"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => formatValue(value)}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
                                        <p className="text-gray-300 text-xs font-medium">{payload[0].payload.name}</p>
                                        <p className="text-purple-400 text-sm font-bold">{formatValue(payload[0].value as number)}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: color }}
                    />
                </LineChart>
            </ResponsiveContainer>
        );
    }

    // Area chart (default)
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} {...chartConfig}>
                <defs>
                    <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" vertical={false} />
                <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatValue(value)}
                />
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
                                    <p className="text-gray-300 text-xs font-medium">{payload[0].payload.name}</p>
                                    <p className="text-emerald-400 text-sm font-bold">{formatValue(payload[0].value as number)}</p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#gradient-${color.replace('#', '')})`}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

const handleClick = (data: any) => {
    if (onItemClick && data && data.activePayload && data.activePayload[0]) {
        onItemClick(data.activePayload[0].payload);
    }
};

const chartConfig = {
    margin: { top: 5, right: 5, left: -20, bottom: 5 },
};

if (type === 'bar') {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} {...chartConfig} onClick={handleClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" vertical={false} />
                <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}ms`}
                />
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
                                    <p className="text-gray-300 text-xs font-medium">{payload[0].payload.name}</p>
                                    <p className="text-blue-400 text-sm font-bold">{payload[0].value}ms</p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Bar
                    dataKey="value"
                    fill={color}
                    radius={[6, 6, 0, 0]}
                    className={onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

if (type === 'area') {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} {...chartConfig}>
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" vertical={false} />
                <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}ms`}
                />
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
                                    <p className="text-gray-300 text-xs font-medium">{payload[0].payload.name}</p>
                                    <p className="text-green-400 text-sm font-bold">{payload[0].value}ms</p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#gradient-${color})`}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// Default line chart
return (
    <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} {...chartConfig}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" vertical={false} />
            <XAxis
                dataKey="name"
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
            />
            <YAxis
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
            />
            <Tooltip
                content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                        return (
                            <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-gray-300 text-xs font-medium">{payload[0].payload.name}</p>
                                <p className="text-blue-400 text-sm font-bold">{payload[0].value}ms</p>
                            </div>
                        );
                    }
                    return null;
                }}
            />
            <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, r: 4 }}
            />
        </LineChart>
    </ResponsiveContainer>
);
}
