'use client';

import { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { MetricSelector } from './MetricSelector';
import { ColorPicker } from './ColorPicker';

interface WidgetConfig {
    title: string;
    metricName: string;
    aggregation: string;
    groupBy: string[];
    filters: Record<string, string>;
    chartType: string;
    colors: string[];
    unit: string;
    timeRange: string;
    refreshInterval: string;
    decimals: number;
}

interface WidgetConfiguratorProps {
    config: WidgetConfig;
    onConfigChange: (config: WidgetConfig) => void;
    onClose: () => void;
}

const CHART_TYPES = [
    { value: 'line', label: 'Line Chart' },
    { value: 'bar', label: 'Bar Chart' },
    { value: 'area', label: 'Area Chart' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'gauge', label: 'Gauge' },
];

const AGGREGATIONS = [
    { value: 'avg', label: 'Average' },
    { value: 'sum', label: 'Sum' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
    { value: 'count', label: 'Count' },
    { value: 'p50', label: 'P50 (Median)' },
    { value: 'p95', label: 'P95' },
    { value: 'p99', label: 'P99' },
];

const TIME_RANGES = [
    { value: '5m', label: 'Last 5 minutes' },
    { value: '15m', label: 'Last 15 minutes' },
    { value: '30m', label: 'Last 30 minutes' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '3h', label: 'Last 3 hours' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '12h', label: 'Last 12 hours' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
];

const REFRESH_INTERVALS = [
    { value: 'off', label: 'Off' },
    { value: '10s', label: 'Every 10 seconds' },
    { value: '30s', label: 'Every 30 seconds' },
    { value: '1m', label: 'Every minute' },
    { value: '5m', label: 'Every 5 minutes' },
    { value: '15m', label: 'Every 15 minutes' },
];

export function WidgetConfigurator({ config, onConfigChange, onClose }: WidgetConfiguratorProps) {
    const [activeTab, setActiveTab] = useState<'data' | 'visual' | 'display' | 'time'>('data');
    const [localConfig, setLocalConfig] = useState(config);

    const handleChange = (field: keyof WidgetConfig, value: unknown) => {
        setLocalConfig({ ...localConfig, [field]: value });
    };

    const handleSave = () => {
        onConfigChange(localConfig);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center space-x-2">
                        <Settings className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-white">Configure Widget</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    {[
                        { id: 'data', label: 'Data' },
                        { id: 'visual', label: 'Visualization' },
                        { id: 'display', label: 'Display' },
                        { id: 'time', label: 'Time' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'data' | 'visual' | 'display' | 'time')}
                            className={`px-6 py-3 font-medium transition-colors ${activeTab === tab.id
                                ? 'text-blue-500 border-b-2 border-blue-500'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'data' && (
                        <div className="space-y-6">
                            <MetricSelector
                                selectedMetric={localConfig.metricName}
                                onMetricChange={(metric) => handleChange('metricName', metric)}
                                selectedLabels={localConfig.filters}
                                onLabelsChange={(labels) => handleChange('filters', labels)}
                                selectedGroupBy={localConfig.groupBy}
                                onGroupByChange={(groupBy) => handleChange('groupBy', groupBy)}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Aggregation Function
                                </label>
                                <select
                                    value={localConfig.aggregation}
                                    onChange={(e) => handleChange('aggregation', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
                                >
                                    {AGGREGATIONS.map((agg) => (
                                        <option key={agg.value} value={agg.value}>
                                            {agg.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'visual' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Chart Type
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {CHART_TYPES.map((type) => (
                                        <button
                                            key={type.value}
                                            onClick={() => handleChange('chartType', type.value)}
                                            className={`p-4 rounded-lg border-2 transition-colors ${localConfig.chartType === type.value
                                                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                                : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                                                }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <ColorPicker
                                selectedColor={localConfig.colors[0] || '#3b82f6'}
                                onColorChange={(color) => handleChange('colors', [color])}
                                label="Primary Color"
                            />
                        </div>
                    )}

                    {activeTab === 'display' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Widget Title
                                </label>
                                <input
                                    type="text"
                                    value={localConfig.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    placeholder="Enter widget title..."
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Unit
                                </label>
                                <input
                                    type="text"
                                    value={localConfig.unit}
                                    onChange={(e) => handleChange('unit', e.target.value)}
                                    placeholder="e.g., ms, %, GB..."
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Decimal Places
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="4"
                                    value={localConfig.decimals}
                                    onChange={(e) => handleChange('decimals', parseInt(e.target.value))}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'time' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Time Range
                                </label>
                                <select
                                    value={localConfig.timeRange}
                                    onChange={(e) => handleChange('timeRange', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
                                >
                                    {TIME_RANGES.map((range) => (
                                        <option key={range.value} value={range.value}>
                                            {range.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Auto Refresh
                                </label>
                                <select
                                    value={localConfig.refreshInterval}
                                    onChange={(e) => handleChange('refreshInterval', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
                                >
                                    {REFRESH_INTERVALS.map((interval) => (
                                        <option key={interval.value} value={interval.value}>
                                            {interval.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
