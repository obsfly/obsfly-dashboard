'use client';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface DataPoint {
    name: string;
    value: number;
    [key: string]: any;
}

interface ChartProps {
    data: DataPoint[];
    color?: string;
    type?: 'line' | 'bar' | 'area';
}

export function SimpleChart({ data, color = '#3b82f6', type = 'bar' }: ChartProps) {
    // Prepare data for Chart.js
    const labels = data.map(d => d.name);
    const values = data.map(d => d.value);

    // Create gradient colors for bars
    const gradientColors = [
        '#8b5cf6', // purple-500
        '#a78bfa', // purple-400
        '#c4b5fd', // purple-300
        '#ddd6fe', // purple-200
        '#ede9fe', // purple-100
    ];

    if (type === 'bar') {
        const chartData = {
            labels,
            datasets: [
                {
                    label: 'Latency',
                    data: values,
                    backgroundColor: data.map((_, index) => gradientColors[index % gradientColors.length]),
                    borderRadius: 6,
                    borderSkipped: false,
                },
            ],
        };

        const barOptions: ChartOptions<'bar'> = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#e5e7eb',
                    bodyColor: '#60a5fa',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            const value = context.parsed.y;
                            if (value === null) return '';
                            return `Latency: ${value.toFixed(2)}ms`;
                        }
                    }
                },
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(55, 65, 81, 0.3)',
                        drawTicks: false,
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            size: 11,
                        },
                        maxRotation: 45,
                        minRotation: 45,
                    },
                    border: {
                        display: false,
                    },
                },
                y: {
                    grid: {
                        display: true,
                        color: 'rgba(55, 65, 81, 0.3)',
                        drawTicks: false,
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            size: 11,
                        },
                    },
                    border: {
                        display: false,
                    },
                    title: {
                        display: true,
                        text: 'Latency (ms)',
                        color: '#9ca3af',
                        font: {
                            size: 11,
                        },
                    },
                },
            },
        };

        return <Bar data={chartData} options={barOptions} />;
    }

    if (type === 'area' || type === 'line') {
        const chartData = {
            labels,
            datasets: [
                {
                    label: 'Value',
                    data: values,
                    borderColor: color,
                    backgroundColor: type === 'area'
                        ? (context: any) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                            gradient.addColorStop(0, `${color}CC`);
                            gradient.addColorStop(1, `${color}1A`);
                            return gradient;
                        }
                        : 'transparent',
                    borderWidth: 3,
                    fill: type === 'area',
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: color,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: color,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                },
            ],
        };

        const lineOptions: ChartOptions<'line'> = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#e5e7eb',
                    bodyColor: '#60a5fa',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            const value = context.parsed.y;
                            if (value === null) return '';
                            return `Value: ${value.toFixed(2)}ms`;
                        }
                    }
                },
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(55, 65, 81, 0.3)',
                        drawTicks: false,
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            size: 11,
                        },
                    },
                    border: {
                        display: false,
                    },
                },
                y: {
                    grid: {
                        display: true,
                        color: 'rgba(55, 65, 81, 0.3)',
                        drawTicks: false,
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            size: 11,
                        },
                    },
                    border: {
                        display: false,
                    },
                },
            },
        };

        return <Line data={chartData} options={lineOptions} />;
    }

    // Default to bar chart
    const defaultData = {
        labels,
        datasets: [
            {
                label: 'Value',
                data: values,
                backgroundColor: color,
                borderRadius: 6,
            },
        ],
    };

    const defaultOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
    };

    return <Bar data={defaultData} options={defaultOptions} />;
}
