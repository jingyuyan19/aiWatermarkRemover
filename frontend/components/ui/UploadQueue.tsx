'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileVideo, CheckCircle, XCircle, Loader2, Clock, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface QueueItem {
    id: string;
    file: File;
    status: 'pending' | 'uploading' | 'done' | 'error';
    jobId?: string;
    error?: string;
    progress?: number;
}

interface UploadQueueProps {
    items: QueueItem[];
    onRemove: (id: string) => void;
    onClearCompleted: () => void;
    isProcessing: boolean;
}

export function UploadQueue({ items, onRemove, onClearCompleted, isProcessing }: UploadQueueProps) {
    const t = useTranslations('Dashboard.upload.queue');
    const completedCount = items.filter(i => i.status === 'done').length;
    const errorCount = items.filter(i => i.status === 'error').length;
    const pendingCount = items.filter(i => i.status === 'pending').length;
    const uploadingItem = items.find(i => i.status === 'uploading');

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getStatusIcon = (status: QueueItem['status']) => {
        switch (status) {
            case 'done':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'uploading':
                return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusText = (item: QueueItem) => {
        switch (item.status) {
            case 'done':
                return t('status.queued');
            case 'error':
                return item.error || t('status.failed');
            case 'uploading':
                return t('status.uploading');
            default:
                return t('status.waiting');
        }
    };

    if (items.length === 0) return null;

    return (
        <div className="space-y-4">
            {/* Summary Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                    {isProcessing && (
                        <span className="flex items-center gap-1.5 text-primary">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('processing', { current: completedCount + 1, total: items.length })}
                        </span>
                    )}
                    {!isProcessing && completedCount > 0 && (
                        <span className="text-green-400">
                            {t('completedCount', { count: completedCount })}
                        </span>
                    )}
                    {errorCount > 0 && (
                        <span className="text-red-400">
                            {t('failedCount', { count: errorCount })}
                        </span>
                    )}
                    {pendingCount > 0 && !isProcessing && (
                        <span className="text-gray-400">
                            {t('pendingCount', { count: pendingCount })}
                        </span>
                    )}
                </div>
                {completedCount > 0 && !isProcessing && (
                    <button
                        type="button"
                        onClick={onClearCompleted}
                        className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                        <Trash2 className="w-3 h-3" />
                        {t('clearCompleted')}
                    </button>
                )}
            </div>

            {/* Queue Items */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                <AnimatePresence>
                    {items.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.status === 'uploading'
                                ? 'bg-primary/10 border-primary/30'
                                : item.status === 'done'
                                    ? 'bg-green-500/5 border-green-500/20'
                                    : item.status === 'error'
                                        ? 'bg-red-500/5 border-red-500/20'
                                        : 'bg-white/5 border-white/10'
                                }`}
                        >
                            {/* Icon */}
                            <div className={`p-2 rounded-lg ${item.status === 'uploading' ? 'bg-primary/20' :
                                item.status === 'done' ? 'bg-green-500/20' :
                                    item.status === 'error' ? 'bg-red-500/20' :
                                        'bg-white/10'
                                }`}>
                                <FileVideo className={`w-4 h-4 ${item.status === 'uploading' ? 'text-primary' :
                                    item.status === 'done' ? 'text-green-500' :
                                        item.status === 'error' ? 'text-red-500' :
                                            'text-gray-400'
                                    }`} />
                            </div>

                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {item.file.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-gray-500">{formatSize(item.file.size)}</span>
                                    <span className={
                                        item.status === 'done' ? 'text-green-400' :
                                            item.status === 'error' ? 'text-red-400' :
                                                item.status === 'uploading' ? 'text-primary' :
                                                    'text-gray-500'
                                    }>
                                        {getStatusText(item)}
                                    </span>
                                </div>
                            </div>

                            {/* Status Icon / Remove Button */}
                            <div className="flex items-center">
                                {item.status === 'pending' && !isProcessing ? (
                                    <button
                                        type="button"
                                        onClick={() => onRemove(item.id)}
                                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                ) : (
                                    getStatusIcon(item.status)
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
