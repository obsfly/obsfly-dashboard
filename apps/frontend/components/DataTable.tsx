'use client';

import React, { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: string;
    sortable?: boolean;
    render?: (value: unknown, row: T) => ReactNode;
    className?: string;
}

export interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    pagination?: {
        page: number;
        pageSize: number;
        totalCount: number;
        onPageChange: (page: number) => void;
    };
    sorting?: {
        sortBy: string;
        sortOrder: 'asc' | 'desc';
        onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
    };
}

export function DataTable<T>({
    columns,
    data,
    loading = false,
    emptyMessage = 'No data available',
    onRowClick,
    pagination,
    sorting,
}: DataTableProps<T>) {
    const handleSort = (columnKey: string) => {
        if (!sorting) return;

        const newOrder = sorting.sortBy === columnKey && sorting.sortOrder === 'asc' ? 'desc' : 'asc';
        sorting.onSortChange(columnKey, newOrder);
    };

    const getSortIcon = (columnKey: string) => {
        if (!sorting) return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;

        if (sorting.sortBy !== columnKey) {
            return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
        }

        return sorting.sortOrder === 'asc'
            ? <ChevronUp className="w-4 h-4 text-blue-500" />
            : <ChevronDown className="w-4 h-4 text-blue-500" />;
    };

    const renderPagination = () => {
        if (!pagination) return null;

        const { page, pageSize, totalCount, onPageChange } = pagination;
        const totalPages = Math.ceil(totalCount / pageSize);
        const startItem = (page - 1) * pageSize + 1;
        const endItem = Math.min(page * pageSize, totalCount);

        return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <div className="text-sm text-gray-700 dark:text-gray-400">
                    Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{' '}
                    <span className="font-medium">{totalCount}</span> results
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="animate-pulse">
                    {
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="flex space-x-4 p-4 border-b border-gray-200 dark:border-gray-800">
                                {
                                    columns.map((col, j) => (
                                        <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                                    ))
                                }
                            </div>
                        ))
                    }
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            {
                                columns.map((column) => (
                                    <th
                                        key={column.key}
                                        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800' : ''
                                            } ${column.className || ''}`}
                                        onClick={() => column.sortable && handleSort(column.key)}
                                    >
                                        <div className="flex items-center space-x-1">
                                            <span>{column.header}</span>
                                            {column.sortable && getSortIcon(column.key)}
                                        </div>
                                    </th>
                                ))
                            }
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {
                            data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        {emptyMessage}
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, rowIndex) => (
                                    <tr
                                        key={rowIndex}
                                        onClick={() => onRowClick?.(row)}
                                        className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors' : ''
                                            }`}
                                    >
                                        {columns.map((column) => (
                                            <td
                                                key={column.key}
                                                className={`px-4 py-3 text-sm text-gray-900 dark:text-gray-100 ${column.className || ''}`}
                                            >
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {column.render ? column.render((row as any)[column.key], row) : ((row as any)[column.key] as ReactNode)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )
                        }
                    </tbody>
                </table>
            </div>
            {renderPagination()}
        </div>
    );
}
