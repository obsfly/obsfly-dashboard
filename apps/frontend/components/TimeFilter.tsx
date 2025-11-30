'use client';

import { useState } from 'react';
import { Clock, Calendar, ChevronDown } from 'lucide-react';

export interface TimeRange {
    label: string;
    minutes: number;
    isCustom?: boolean;
}

const PRESET_RANGES: TimeRange[] = [
    { label: '1 min', minutes: 1 },
    { label: '5 min', minutes: 5 },
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '4 hours', minutes: 240 },
    { label: '1 day', minutes: 1440 },
];

interface TimeFilterProps {
    selectedMinutes: number;
    onTimeRangeChange: (minutes: number) => void;
}

export function TimeFilter({ selectedMinutes, onTimeRangeChange }: TimeFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const [customHours, setCustomHours] = useState('');
    const [customMinutes, setCustomMinutes] = useState('');

    const currentRange = PRESET_RANGES.find(r => r.minutes === selectedMinutes);

    // Format display label for custom ranges
    const formatCustomLabel = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (mins === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
        return `${hours}h ${mins}m`;
    };

    const displayLabel = currentRange?.label || formatCustomLabel(selectedMinutes);

    const handlePresetSelect = (minutes: number) => {
        onTimeRangeChange(minutes);
        setIsOpen(false);
        setShowCustom(false);
    };

    const handleCustomApply = () => {
        const hours = parseInt(customHours) || 0;
        const mins = parseInt(customMinutes) || 0;
        const totalMinutes = hours * 60 + mins;

        if (totalMinutes > 0) {
            onTimeRangeChange(totalMinutes);
            setIsOpen(false);
            setShowCustom(false);
            setCustomHours('');
            setCustomMinutes('');
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
                <Clock className="w-4 h-4" />
                <span>{displayLabel}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                            setIsOpen(false);
                            setShowCustom(false);
                        }}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                        {!showCustom ? (
                            <>
                                <div className="p-2 space-y-1">
                                    {PRESET_RANGES.map((range) => (
                                        <button
                                            key={range.minutes}
                                            onClick={() => handlePresetSelect(range.minutes)}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedMinutes === range.minutes
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {range.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                                    <button
                                        onClick={() => setShowCustom(true)}
                                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                    >
                                        <Calendar className="w-4 h-4" />
                                        <span>Custom Range</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="p-4">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Custom Time Range</h3>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Hours</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="720"
                                            value={customHours}
                                            onChange={(e) => setCustomHours(e.target.value)}
                                            placeholder="0"
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Minutes</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={customMinutes}
                                            onChange={(e) => setCustomMinutes(e.target.value)}
                                            placeholder="0"
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-2 mt-4">
                                    <button
                                        onClick={() => setShowCustom(false)}
                                        className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleCustomApply}
                                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
