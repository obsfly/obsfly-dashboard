'use client';

import React from 'react';
import { X, Copy, ExternalLink, Check } from 'lucide-react';
import { useState } from 'react';

interface LogEntry {
    timestamp: string;
    service_name: string;
    host_name: string;
    namespace?: string;
    pod?: string;
    container?: string;
    severity_text: string;
    body: string;
    trace_id?: string;
    span_id?: string;
    log_attributes?: Record<string, unknown>;
    resource_attributes?: Record<string, unknown>;
    source?: string;
    env?: string;
    agent_name?: string;
    agent_version?: string;
}

interface LogDetailPanelProps {
    log: LogEntry | null;
    onClose: () => void;
}

export function LogDetailPanel({ log, onClose }: LogDetailPanelProps) {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!log) return null;

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const getSeverityColor = (severity: string) => {
        switch (severity?.toUpperCase()) {
            case 'ERROR':
                return 'text-red-500 bg-red-100 dark:bg-red-900/30';
            case 'WARN':
            case 'WARNING':
                return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30';
            case 'INFO':
                return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
            case 'DEBUG':
                return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
            default:
                return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Log Details</h2>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Severity Badge */}
                <div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(log.severity_text)}`}>
                        {log.severity_text || 'UNKNOWN'}
                    </span>
                </div>

                {/* Timestamp */}
                <DetailField
                    label="Timestamp"
                    value={new Date(log.timestamp).toLocaleString()}
                    onCopy={() => copyToClipboard(log.timestamp, 'timestamp')
                    }
                    copied={copiedField === 'timestamp'}
                />

                {/* Service Info */}
                <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Service" value={log.service_name} />
                    <DetailField label="Host" value={log.host_name} />
                </div>

                {/* Kubernetes Context */}
                {
                    (log.namespace || log.pod || log.container) && (
                        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                            <h3 className="text-sm font-semibold mb-2">Kubernetes</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {
                                    log.namespace && <DetailField label="Namespace" value={log.namespace} />}
                                {
                                    log.pod && <DetailField label="Pod" value={log.pod} />}
                                {
                                    log.container && <DetailField label="Container" value={log.container} />}
                            </div>
                        </div>
                    )
                }

                {/* Trace Correlation */}
                {
                    (log.trace_id || log.span_id) && (
                        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                            <h3 className="text-sm font-semibold mb-2">Trace Correlation</h3>
                            <DetailField
                                label="Trace ID"
                                value={log.trace_id}
                                onCopy={() => copyToClipboard(log.trace_id || '', 'trace_id')
                                }
                                copied={copiedField === 'trace_id'
                                }
                                link={`/traces?trace_id=${log.trace_id}`
                                }
                            />
                            {
                                log.span_id && (
                                    <DetailField
                                        label="Span ID"
                                        value={log.span_id}
                                        onCopy={() => copyToClipboard(log.span_id || '', 'span_id')
                                        }
                                        copied={copiedField === 'span_id'
                                        }
                                        className="mt-2"
                                    />
                                )}
                        </div>
                    )}

                {/* Log Message */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">Message</h3>
                        <button
                            onClick={() => copyToClipboard(log.body, 'body')}
                            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center space-x-1"
                        >
                            {copiedField === 'body' ? (
                                <><Check className="w-3 h-3" /> <span>Copied!</span></>
                            ) : (
                                <><Copy className="w-3 h-3" /> <span>Copy</span></>
                            )}
                        </button>
                    </div>
                    <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap break-words">
                        {log.body}
                    </pre>
                </div>

                {/* Log Attributes */}
                {
                    log.log_attributes && Object.keys(log.log_attributes).length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                            <h3 className="text-sm font-semibold mb-2">Log Attributes</h3>
                            <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs overflow-x-auto">
                                {JSON.stringify(log.log_attributes, null, 2)}
                            </pre>
                        </div>
                    )
                }

                {/* Resource Attributes */}
                {
                    log.resource_attributes && Object.keys(log.resource_attributes).length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                            <h3 className="text-sm font-semibold mb-2">Resource Attributes</h3>
                            <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs overflow-x-auto">
                                {JSON.stringify(log.resource_attributes, null, 2)}
                            </pre>
                        </div>
                    )
                }

                {/* Additional Info */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                    <h3 className="text-sm font-semibold mb-2">Additional Info</h3>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <DetailField label="Source" value={log.source} />
                        <DetailField label="Environment" value={log.env} />
                        {
                            log.agent_name && <DetailField label="Agent" value={`${log.agent_name} ${log.agent_version || ''}`} />}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailField({
    label,
    value,
    onCopy,
    copied,
    link,
    className = '',
}: {
    label: string;
    value?: string;
    onCopy?: () => void;
    copied?: boolean;
    link?: string;
    className?: string;
}) {
    if (!value) return null;

    return (
        <div className={className}>
            <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</dt>
            <dd className="flex items-center space-x-2">
                <span className="text-sm font-mono break-all">{value}</span>
                {
                    onCopy && (
                        <button
                            onClick={onCopy}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            {
                                copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                    )
                }
                {
                    link && (
                        <a href={link} className="text-blue-500 hover:text-blue-600">
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    )
                }
            </dd>
        </div>
    );
}
