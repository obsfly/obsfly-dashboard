'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface HoneycombCell {
    id: string;
    label: string;
    status: 'GREEN' | 'YELLOW' | 'RED';
    tooltip?: string;
}

interface HoneycombGridProps {
    cells: HoneycombCell[];
    onCellClick?: (cell: HoneycombCell) => void;
}

export function HoneycombGrid({ cells, onCellClick }: HoneycombGridProps) {
    const router = useRouter();
    const svgRef = useRef<SVGSVGElement>(null);

    // Pan and zoom state
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'GREEN': return 'fill-green-500/20 stroke-green-500';
            case 'YELLOW': return 'fill-yellow-500/20 stroke-yellow-500';
            case 'RED': return 'fill-red-500/20 stroke-red-500';
            default: return 'fill-gray-500/20 stroke-gray-500';
        }
    };

    const handleCellClick = (cell: HoneycombCell, event: React.MouseEvent) => {
        // Only trigger click if not dragging
        if (isDragging) return;

        event.stopPropagation();
        if (onCellClick) {
            onCellClick(cell);
        } else {
            router.push(`/infrastructure?node=${encodeURIComponent(cell.id)}`);
        }
    };

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.min(Math.max(0.5, prev + delta), 3));
    }, []);

    // Mouse drag start
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button === 0) { // Left mouse button
            setIsDragging(true);
            setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        }
    }, [panOffset]);

    // Mouse drag move
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging) {
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;
            setPanOffset({ x: newX, y: newY });
        }
    }, [isDragging, dragStart]);

    // Mouse drag end
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Zoom controls
    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
    const handleZoomReset = () => {
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
    };

    // Calculate grid dimensions
    const cols = Math.ceil(Math.sqrt(cells.length * 1.5));
    const rows = Math.ceil(cells.length / cols);
    const hexSize = 35;
    const hexWidth = hexSize * 2;
    const hexHeight = hexSize * Math.sqrt(3);
    const horizontalSpacing = hexWidth * 0.75;
    const verticalSpacing = hexHeight;

    const viewBoxWidth = cols * horizontalSpacing + hexSize * 2;
    const viewBoxHeight = rows * verticalSpacing + hexSize * 2;

    return (
        <div className="relative w-full h-full">
            {/* Zoom Controls */}
            <div className="absolute top-2 right-2 z-10 flex flex-col space-y-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1">
                <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button
                    onClick={handleZoomReset}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Reset View"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>

            {/* Zoom Level Indicator */}
            <div className="absolute bottom-2 right-2 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-1">
                <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                    {Math.round(zoom * 100)}%
                </span>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-2 left-2 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                    🖱️ Drag to pan • Scroll to zoom
                </span>
            </div>

            {/* SVG Container */}
            <div
                className="w-full h-full overflow-hidden"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                    className="w-full h-full"
                    style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                        transformOrigin: 'center',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                >
                    {cells.map((cell, i) => {
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        const x = col * horizontalSpacing + hexSize * 1.5;
                        const y = row * verticalSpacing + hexSize * 1.5 + (col % 2 === 1 ? verticalSpacing / 2 : 0);

                        const points = Array.from({ length: 6 }, (_, j) => {
                            const angle = (Math.PI / 3) * j;
                            return `${x + hexSize * Math.cos(angle)},${y + hexSize * Math.sin(angle)}`;
                        }).join(' ');

                        return (
                            <g
                                key={cell.id}
                                onClick={(e) => handleCellClick(cell, e)}
                                style={{ cursor: 'pointer' }}
                            >
                                <polygon
                                    points={points}
                                    className={`${getStatusColor(cell.status)} transition-all hover:opacity-60`}
                                    strokeWidth="2"
                                >
                                    <title>{cell.tooltip || cell.label}</title>
                                </polygon>
                                <text
                                    x={x}
                                    y={y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-[8px] fill-gray-700 dark:fill-gray-300 font-mono pointer-events-none select-none"
                                >
                                    {cell.label.length > 8 ? cell.label.substring(0, 8) + '...' : cell.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
