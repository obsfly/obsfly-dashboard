'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { getMetricNames, getMetricLabels, getLabelValues, type MetricName, type MetricLabel } from '../../lib/dashboardApi';

interface MetricSelectorProps {
    selectedMetric: string;
    onMetricChange: (metric: string) => void;
    selectedLabels?: Record<string, string>;
    onLabelsChange?: (labels: Record<string, string>) => void;
    selectedGroupBy?: string[];
    onGroupByChange?: (groupBy: string[]) => void;
}

export function MetricSelector({
    selectedMetric,
    onMetricChange,
    selectedLabels = {},
    onLabelsChange,
    selectedGroupBy = [],
    onGroupByChange,
}: MetricSelectorProps) {
    const [metrics, setMetrics] = useState<MetricName[]>([]);
    const [labels, setLabels] = useState<MetricLabel[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    // Load all metrics on mount
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        getMetricNames()
            .then(setMetrics)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Load labels when metric is selected
    useEffect(() => {
        if (selectedMetric) {
            getMetricLabels(selectedMetric)
                .then(setLabels)
                .catch(console.error);
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLabels([]);
        }
    }, [selectedMetric]);

    const filteredMetrics = metrics.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMetricSelect = (metricName: string) => {
        onMetricChange(metricName);
        setShowDropdown(false);
        setSearchTerm('');
    };

    const handleLabelFilterChange = async (labelKey: string, value: string) => {
        const newLabels = { ...selectedLabels, [labelKey]: value };
        onLabelsChange?.(newLabels);
    };

    const handleGroupByToggle = (labelKey: string) => {
        const newGroupBy = selectedGroupBy.includes(labelKey)
            ? selectedGroupBy.filter(k => k !== labelKey)
            : [...selectedGroupBy, labelKey];
        onGroupByChange?.(newGroupBy);
    };

    return (
        <div className="space-y-4">
            {/* Metric Selector */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Metric
                </label>
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-left flex items-center justify-between hover:bg-gray-750 transition-colors"
                    >
                        <span className="text-gray-200">
                            {selectedMetric || 'Choose a metric...'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {showDropdown && (
                        <div className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-hidden">
                            {/* Search Box */}
                            <div className="p-2 border-b border-gray-700">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search metrics..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Metric List */}
                            <div className="max-h-80 overflow-y-auto">
                                {loading ? (
                                    <div className="p-4 text-center text-gray-400">Loading...</div>
                                ) : filteredMetrics.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400">No metrics found</div>
                                ) : (
                                    filteredMetrics.map((metric) => (
                                        <button
                                            key={metric.name}
                                            onClick={() => handleMetricSelect(metric.name)}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-800 last:border-b-0"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="text-gray-200 font-medium">{metric.name}</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Type: {metric.type} • {metric.sample_count.toLocaleString()} samples
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Label Filters and Group By */}
            {selectedMetric && labels.length > 0 && (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-300">
                        Labels & Grouping
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {labels.map((label) => (
                            <LabelControl
                                key={label.key}
                                label={label}
                                metricName={selectedMetric}
                                selectedValue={selectedLabels[label.key]}
                                onValueChange={(value) => handleLabelFilterChange(label.key, value)}
                                isGrouped={selectedGroupBy.includes(label.key)}
                                onGroupByToggle={() => handleGroupByToggle(label.key)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface LabelControlProps {
    label: MetricLabel;
    metricName: string;
    selectedValue?: string;
    onValueChange: (value: string) => void;
    isGrouped: boolean;
    onGroupByToggle: () => void;
}

function LabelControl({ label, metricName, selectedValue, onValueChange, isGrouped, onGroupByToggle }: LabelControlProps) {
    const [values, setValues] = useState<Array<{ value: string; count: number }>>([]);
    const [showValues, setShowValues] = useState(false);

    useEffect(() => {
        if (showValues && values.length === 0) {
            getLabelValues(metricName, label.key)
                .then(setValues)
                .catch(console.error);
        }
    }, [showValues, metricName, label.key, values.length]);

    return (
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-300">{label.key}</span>
                    <span className="text-xs text-gray-500">({label.value_count} values)</span>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isGrouped}
                            onChange={onGroupByToggle}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-400">Group By</span>
                    </label>
                </div>
            </div>

            {/* Sample Values */}
            {label.sample_values && label.sample_values.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {label.sample_values.slice(0, 3).map((val, idx) => (
                        <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-gray-900 rounded text-gray-400"
                        >
                            {val}
                        </span>
                    ))}
                    {label.sample_values.length > 3 && (
                        <span className="text-xs px-2 py-1 text-gray-500">
                            +{label.sample_values.length - 3} more
                        </span>
                    )}
                </div>
            )}

            {/* Filter Dropdown */}
            <button
                onClick={() => setShowValues(!showValues)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-left flex items-center justify-between hover:bg-gray-850 transition-colors"
            >
                <span className="text-gray-300">
                    {selectedValue || 'Filter by value...'}
                </span>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showValues ? 'rotate-180' : ''}`} />
            </button>

            {showValues && (
                <div className="mt-2 max-h-40 overflow-y-auto bg-gray-900 border border-gray-700 rounded">
                    <button
                        onClick={() => {
                            onValueChange('');
                            setShowValues(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 border-b border-gray-800 text-gray-400"
                    >
                        (All values)
                    </button>
                    {values.map((val) => (
                        <button
                            key={val.value}
                            onClick={() => {
                                onValueChange(val.value);
                                setShowValues(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 border-b border-gray-800 last:border-b-0 flex items-center justify-between"
                        >
                            <span className="text-gray-200">{val.value}</span>
                            <span className="text-xs text-gray-500">{val.count}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
