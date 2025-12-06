'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { Plus, Save, RotateCcw, Download, Settings, List } from 'lucide-react';
import { AdvancedChart } from '../../components/dashboard/AdvancedCharts';
import { WidgetConfigurator } from '../../components/dashboard/WidgetConfigurator';
import { MetricWidget } from '../../components/widgets/MetricWidget';
import { queryMetrics, saveDashboard, listDashboards, getDashboard, type MetricQueryRequest, type MetricSeries } from '../../lib/dashboardApi';
import 'react-grid-layout/css/styles.css';

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

interface Widget {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'chart' | 'metric';
    config: WidgetConfig;
    data?: MetricSeries[];
}

const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
    title: 'New Widget',
    metricName: '',
    aggregation: 'avg',
    groupBy: [],
    filters: {},
    chartType: 'line',
    colors: ['#3b82f6'],
    unit: '',
    timeRange: '15m',
    refreshInterval: '1m',
    decimals: 2,
};

const parseRefreshInterval = (interval: string): number => {
    const match = interval.match(/(\d+)([smh])/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        default: return 0;
    }
};

export default function CustomDashboard() {
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [configuringWidget, setConfiguringWidget] = useState<string | null>(null);
    const [showDashboardList, setShowDashboardList] = useState(false);
    const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
    const [currentDashboardName, setCurrentDashboardName] = useState('Unnamed Dashboard');

    // Load dashboard from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('customDashboard');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setWidgets(parsed);
                fetchWidgetData(parsed);
            } catch (e) {
                console.error('Failed to load dashboard:', e);
            }
        }
    }, []);

    // Fetch data for all widgets
    const fetchWidgetData = async (widgetsToFetch: Widget[]) => {
        const updates = await Promise.all(
            widgetsToFetch.map(async (widget) => {
                if (widget.config.metricName) {
                    try {
                        const request: MetricQueryRequest = {
                            metrics: [{
                                metric_name: widget.config.metricName,
                                aggregation: widget.config.aggregation,
                                group_by: widget.config.groupBy,
                                filters: widget.config.filters,
                                alias: widget.config.title,
                            }],
                            time_range: widget.config.timeRange,
                            interval: '1m',
                        };
                        const response = await queryMetrics(request);
                        return { ...widget, data: response.series };
                    } catch (error) {
                        console.error('Failed to fetch widget data:', error);
                        return widget;
                    }
                }
                return widget;
            })
        );

        setWidgets(prevWidgets => prevWidgets.map(w => {
            const update = updates.find(u => u.i === w.i);
            return update ? update : w;
        }));
    };

    // Auto-refresh widgets
    useEffect(() => {
        const intervals: NodeJS.Timeout[] = [];

        widgets.forEach((widget) => {
            if (widget.config.refreshInterval && widget.config.refreshInterval !== 'off') {
                const ms = parseRefreshInterval(widget.config.refreshInterval);
                if (ms > 0) {
                    const interval = setInterval(() => {
                        // Pass the current widget config to fetch
                        fetchWidgetData([widget]);
                    }, ms);
                    intervals.push(interval);
                }
            }
        });

        return () => {
            intervals.forEach(clearInterval);
        };
        // Only re-run if widget IDs or refresh intervals change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(widgets.map(w => ({ i: w.i, interval: w.config.refreshInterval })))]);



    const handleLayoutChange = (layout: Layout[]) => {
        setWidgets((prevWidgets) =>
            prevWidgets.map((widget) => {
                const layoutItem = layout.find((l) => l.i === widget.i);
                if (layoutItem) {
                    return {
                        ...widget,
                        x: layoutItem.x,
                        y: layoutItem.y,
                        w: layoutItem.w,
                        h: layoutItem.h,
                    };
                }
                return widget;
            })
        );
    };

    const handleRemoveWidget = (id: string) => {
        setWidgets((prevWidgets) => prevWidgets.filter((w) => w.i !== id));
    };

    const handleAddWidget = (type: 'chart' | 'metric') => {
        const newWidget: Widget = {
            i: `widget-${Date.now()}`,
            x: 0,
            y: Infinity,
            w: type === 'chart' ? 3 : 2,
            h: type === 'chart' ? 2 : 1,
            type,
            config: { ...DEFAULT_WIDGET_CONFIG },
        };
        setWidgets([...widgets, newWidget]);
        setConfiguringWidget(newWidget.i);
    };

    const handleConfigureWidget = (widgetId: string) => {
        setConfiguringWidget(widgetId);
    };

    const handleConfigChange = (widgetId: string, newConfig: WidgetConfig) => {
        setWidgets((prevWidgets) =>
            prevWidgets.map((w) =>
                w.i === widgetId ? { ...w, config: newConfig } : w
            )
        );
        // Fetch new data for the updated widget
        const updatedWidget = widgets.find(w => w.i === widgetId);
        if (updatedWidget) {
            fetchWidgetData([{ ...updatedWidget, config: newConfig }]);
        }
    };

    const handleSaveDashboard = async () => {
        const config = JSON.stringify(widgets);

        if (currentDashboardId) {
            // Update existing dashboard (implementation needed)
            localStorage.setItem('customDashboard', config);
            alert('Dashboard saved successfully!');
        } else {
            // Save new dashboard
            const name = prompt('Enter dashboard name:', currentDashboardName);
            if (name) {
                try {
                    const dashboard = await saveDashboard({
                        name,
                        description: '',
                        config,
                    });
                    setCurrentDashboardId(dashboard.dashboard_id);
                    setCurrentDashboardName(name);
                    localStorage.setItem('customDashboard', config);
                    alert('Dashboard saved successfully!');
                } catch (error) {
                    console.error('Failed to save dashboard:', error);
                    alert('Failed to save dashboard to server. Saved locally instead.');
                    localStorage.setItem('customDashboard', config);
                }
            }
        }
    };

    const handleResetDashboard = () => {
        if (confirm('Are you sure you want to reset the dashboard?')) {
            setWidgets([]);
            setCurrentDashboardId(null);
            setCurrentDashboardName('Unnamed Dashboard');
            localStorage.removeItem('customDashboard');
        }
    };

    const handleExportDashboard = () => {
        const dataStr = JSON.stringify(widgets, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-${currentDashboardName.replace(/\s+/g, '-')}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const configuringWidgetData = widgets.find(w => w.i === configuringWidget);

    const layout = widgets.map((w) => ({
        i: w.i,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
    }));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentDashboardName}</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Build and customize your metrics dashboard
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowDashboardList(!showDashboardList)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                        <List className="w-4 h-4" />
                        <span>Dashboards</span>
                    </button>
                    <button
                        onClick={() => handleAddWidget('chart')}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Widget</span>
                    </button>
                    <button
                        onClick={handleSaveDashboard}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                    </button>
                    <button
                        onClick={handleExportDashboard}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={handleResetDashboard}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset</span>
                    </button>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                {widgets.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 dark:text-gray-400 mb-4 text-lg">No widgets added yet</p>
                        <p className="text-gray-400 dark:text-gray-500 mb-6">
                            Start building your dashboard by adding widgets with real metrics from your ClickHouse database
                        </p>
                        <button
                            onClick={() => handleAddWidget('chart')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        >
                            Add Your First Widget
                        </button>
                    </div>
                ) : (
                    <GridLayout
                        className="layout"
                        layout={layout}
                        cols={6}
                        rowHeight={150}
                        width={1200}
                        onLayoutChange={handleLayoutChange}
                        draggableHandle=".drag-handle"
                        isDraggable={true}
                        isResizable={true}
                        compactType="vertical"
                    >
                        {widgets.map((widget) => (
                            <div key={widget.i} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                                <div className="drag-handle cursor-move bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                                    <h3 className="text-sm font-medium text-gray-200">{widget.config.title}</h3>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleConfigureWidget(widget.i)}
                                            className="text-gray-400 hover:text-blue-400 transition-colors"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveWidget(widget.i)}
                                            className="text-gray-400 hover:text-red-400 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 h-[calc(100%-48px)]">
                                    {widget.data && widget.data.length > 0 ? (
                                        <AdvancedChart
                                            data={widget.data[0].data_points.map(dp => ({
                                                name: new Date(dp.timestamp).toLocaleTimeString(),
                                                value: dp.value,
                                            }))}
                                            chartType={widget.config.chartType as 'pie' | 'gauge' | 'multi-line' | 'stacked-bar' | 'stacked-area' | 'line' | 'bar' | 'area'}
                                            colors={widget.config.colors}
                                            unit={widget.config.unit}
                                        />
                                    ) : widget.config.metricName ? (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            Loading data...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            Configure widget to see data
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </GridLayout>
                )}
            </div>

            {/* Widget Configurator Modal */}
            {configuringWidget && configuringWidgetData && (
                <WidgetConfigurator
                    config={configuringWidgetData.config}
                    onConfigChange={(newConfig) => handleConfigChange(configuringWidget, newConfig)}
                    onClose={() => setConfiguringWidget(null)}
                />
            )}
        </div>
    );
}
