'use client';

import { useState } from 'react';
import GridLayout from 'react-grid-layout';
import { Plus, Save, RotateCcw, Download } from 'lucide-react';
import { ChartWidget } from '../../components/widgets/ChartWidget';
import { MetricWidget } from '../../components/widgets/MetricWidget';
import { Server, Clock, Activity, Database } from 'lucide-react';
import 'react-grid-layout/css/styles.css';

interface Widget {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'chart' | 'metric';
    config: any;
}

const sampleChartData = [
    { name: 'Mon', value: 145 },
    { name: 'Tue', value: 152 },
    { name: 'Wed', value: 138 },
    { name: 'Thu', value: 165 },
    { name: 'Fri', value: 148 },
];

export default function CustomDashboard() {
    const [widgets, setWidgets] = useState<Widget[]>([
        {
            i: 'widget-1',
            x: 0,
            y: 0,
            w: 3,
            h: 2,
            type: 'chart',
            config: {
                title: 'API Latency',
                chartType: 'area',
                color: '#10b981',
                data: sampleChartData,
            },
        },
        {
            i: 'widget-2',
            x: 3,
            y: 0,
            w: 3,
            h: 2,
            type: 'chart',
            config: {
                title: 'Request Rate',
                chartType: 'bar',
                color: '#3b82f6',
                data: sampleChartData,
            },
        },
        {
            i: 'widget-3',
            x: 0,
            y: 2,
            w: 2,
            h: 1,
            type: 'metric',
            config: {
                title: 'Active Services',
                value: 12,
                icon: Server,
                change: '+5%',
                changeType: 'positive',
            },
        },
        {
            i: 'widget-4',
            x: 2,
            y: 2,
            w: 2,
            h: 1,
            type: 'metric',
            config: {
                title: 'Avg Latency',
                value: '145ms',
                icon: Clock,
                change: '-12ms',
                changeType: 'positive',
            },
        },
    ]);

    const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);

    const handleLayoutChange = (layout: any[]) => {
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
            y: Infinity, // Add to bottom
            w: type === 'chart' ? 3 : 2,
            h: type === 'chart' ? 2 : 1,
            type,
            config:
                type === 'chart'
                    ? {
                        title: 'New Chart',
                        chartType: 'line',
                        color: '#8b5cf6',
                        data: sampleChartData,
                    }
                    : {
                        title: 'New Metric',
                        value: '0',
                        icon: Activity,
                        change: '+0%',
                        changeType: 'positive',
                    },
        };
        setWidgets([...widgets, newWidget]);
        setShowWidgetLibrary(false);
    };

    const handleSaveDashboard = () => {
        localStorage.setItem('customDashboard', JSON.stringify(widgets));
        alert('Dashboard saved successfully!');
    };

    const handleResetDashboard = () => {
        if (confirm('Are you sure you want to reset the dashboard?')) {
            setWidgets([]);
        }
    };

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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Custom Dashboard</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Drag and drop widgets to customize your dashboard
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowWidgetLibrary(!showWidgetLibrary)}
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
                        onClick={handleResetDashboard}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset</span>
                    </button>
                </div>
            </div>

            {/* Widget Library */}
            {showWidgetLibrary && (
                <div className="mb-6 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Widget Library</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            onClick={() => handleAddWidget('chart')}
                            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                        >
                            <Activity className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Chart Widget</p>
                        </button>
                        <button
                            onClick={() => handleAddWidget('metric')}
                            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                        >
                            <Database className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Metric Widget</p>
                        </button>
                    </div>
                </div>
            )}

            {/* Grid Layout */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                {widgets.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">No widgets added yet</p>
                        <button
                            onClick={() => setShowWidgetLibrary(true)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
                            <div key={widget.i} className="drag-handle cursor-move">
                                {widget.type === 'chart' ? (
                                    <ChartWidget
                                        id={widget.i}
                                        title={widget.config.title}
                                        chartType={widget.config.chartType}
                                        color={widget.config.color}
                                        data={widget.config.data}
                                        onRemove={() => handleRemoveWidget(widget.i)}
                                    />
                                ) : (
                                    <MetricWidget
                                        id={widget.i}
                                        title={widget.config.title}
                                        value={widget.config.value}
                                        icon={widget.config.icon}
                                        change={widget.config.change}
                                        changeType={widget.config.changeType}
                                        onRemove={() => handleRemoveWidget(widget.i)}
                                    />
                                )}
                            </div>
                        ))}
                    </GridLayout>
                )}
            </div>
        </div>
    );
}
