'use client';

import { useState } from 'react';

interface ColorPickerProps {
    selectedColor: string;
    onColorChange: (color: string) => void;
    label?: string;
}

const PRESET_PALETTES = {
    default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
    cool: ['#06b6d4', '#3b82f6', '#8b5cf6', '#6366f1', '#0ea5e9', '#14b8a6', '#10b981', '#84cc16'],
    warm: ['#ef4444', '#f59e0b', '#f97316', '#ec4899', '#fb923c', '#fbbf24', '#fca5a5', '#fdba74'],
    monochrome: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'],
    vibrant: ['#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316', '#ef4444'],
};

const COMMON_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#6366f1', // Indigo
    '#f43f5e', // Rose
];

export function ColorPicker({ selectedColor, onColorChange, label = 'Chart Color' }: ColorPickerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [selectedPalette, setSelectedPalette] = useState<keyof typeof PRESET_PALETTES>('default');

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">{label}</label>

            <div className="flex items-center space-x-2">
                {/* Current Color Display */}
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 transition-colors"
                >
                    <div
                        className="w-6 h-6 rounded border-2 border-gray-600"
                        style={{ backgroundColor: selectedColor }}
                    />
                    <span className="text-sm text-gray-300">{selectedColor}</span>
                </button>

                {/* Custom Color Input */}
                <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer bg-gray-800 border border-gray-700"
                />
            </div>

            {/* Color Picker Dropdown */}
            {showPicker && (
                <div className="mt-2 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                    {/* Palette Selector */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-400 mb-2">Preset Palettes</label>
                        <div className="flex space-x-2">
                            {(Object.keys(PRESET_PALETTES) as Array<keyof typeof PRESET_PALETTES>).map((paletteName) => (
                                <button
                                    key={paletteName}
                                    onClick={() => setSelectedPalette(paletteName)}
                                    className={`px-3 py-1 rounded text-xs capitalize transition-colors ${selectedPalette === paletteName
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {paletteName}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Palette Colors */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                            {selectedPalette.charAt(0).toUpperCase() + selectedPalette.slice(1)} Palette
                        </label>
                        <div className="grid grid-cols-8 gap-2">
                            {PRESET_PALETTES[selectedPalette].map((color) => (
                                <button
                                    key={color}
                                    onClick={() => {
                                        onColorChange(color);
                                        setShowPicker(false);
                                    }}
                                    className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-white' : 'border-gray-600'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Common Colors */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Common Colors</label>
                        <div className="grid grid-cols-8 gap-2">
                            {COMMON_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => {
                                        onColorChange(color);
                                        setShowPicker(false);
                                    }}
                                    className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-white' : 'border-gray-600'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Multi-Color Picker for series
interface MultiColorPickerProps {
    colors: string[];
    onColorsChange: (colors: string[]) => void;
    seriesCount: number;
}

export function MultiColorPicker({ colors, onColorsChange, seriesCount }: MultiColorPickerProps) {
    const handleColorChange = (index: number, color: string) => {
        const newColors = [...colors];
        newColors[index] = color;
        onColorsChange(newColors);
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Series Colors</label>
            {Array.from({ length: seriesCount }).map((_, index) => (
                <ColorPicker
                    key={index}
                    label={`Series ${index + 1}`}
                    selectedColor={colors[index] || COMMON_COLORS[index % COMMON_COLORS.length]}
                    onColorChange={(color) => handleColorChange(index, color)}
                />
            ))}
        </div>
    );
}
