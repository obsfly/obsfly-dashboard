import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ChangeIndicatorProps {
    change: number;
    threshold?: number;
}

export function ChangeIndicator({ change, threshold = 0.1 }: ChangeIndicatorProps) {
    if (Math.abs(change) < threshold) return null;

    const isPositive = change > 0;

    return (
        <span className={`text-xs flex items-center ${isPositive ? 'text-red-500' : 'text-green-500'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change).toFixed(1)}%
        </span>
    );
}
