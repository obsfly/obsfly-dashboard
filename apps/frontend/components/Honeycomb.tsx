interface HoneycombCell {
    id: string;
    label: string;
    status: 'GREEN' | 'YELLOW' | 'RED';
    tooltip?: string;
}

interface HoneycombGridProps {
    cells: HoneycombCell[];
}

export function HoneycombGrid({ cells }: HoneycombGridProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'GREEN': return 'fill-green-500/20 stroke-green-500';
            case 'YELLOW': return 'fill-yellow-500/20 stroke-yellow-500';
            case 'RED': return 'fill-red-500/20 stroke-red-500';
            default: return 'fill-gray-500/20 stroke-gray-500';
        }
    };

    // Calculate grid dimensions
    const cols = Math.ceil(Math.sqrt(cells.length * 1.5));
    const rows = Math.ceil(cells.length / cols);
    const hexSize = 35;
    const hexWidth = hexSize * 2;
    const hexHeight = hexSize * Math.sqrt(3);
    const horizontalSpacing = hexWidth * 0.75;
    const verticalSpacing = hexHeight;

    return (
        <svg
            viewBox={`0 0 ${cols * horizontalSpacing + hexSize} ${rows * verticalSpacing + hexSize}`}
            className="w-full h-full"
            style={{ maxHeight: '400px' }}
        >
            {cells.map((cell, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = col * horizontalSpacing + hexSize;
                const y = row * verticalSpacing + hexSize + (col % 2 === 1 ? verticalSpacing / 2 : 0);

                const points = Array.from({ length: 6 }, (_, j) => {
                    const angle = (Math.PI / 3) * j;
                    return `${x + hexSize * Math.cos(angle)},${y + hexSize * Math.sin(angle)}`;
                }).join(' ');

                return (
                    <g key={cell.id}>
                        <polygon
                            points={points}
                            className={`${getStatusColor(cell.status)} transition-all hover:opacity-80 cursor-pointer`}
                            strokeWidth="2"
                        >
                            <title>{cell.tooltip || cell.label}</title>
                        </polygon>
                        <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[8px] fill-gray-300 dark:fill-gray-300 light:fill-gray-700 font-mono pointer-events-none"
                        >
                            {cell.label.length > 8 ? cell.label.substring(0, 8) + '...' : cell.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}
