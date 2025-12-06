'use client';

import { X, Maximize2 } from 'lucide-react';
import { useState, ReactNode } from 'react';

interface FullScreenChartProps {
    title?: string;
    children: ReactNode;
    trigger?: ReactNode;
}

export function FullScreenChart({ title = 'Chart', children, trigger }: FullScreenChartProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} className="cursor-pointer inline-block">
                {trigger || (
                    <div className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <Maximize2 className="w-4 h-4" />
                    </div>
                )}
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div
                        className="bg-white dark:bg-gray-900 w-full h-full max-w-[90vw] max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 p-6 min-h-0">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
