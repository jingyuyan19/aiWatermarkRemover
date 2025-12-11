'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileVideo, X, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslations } from 'next-intl';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MultiFileUploadProps {
    onFilesChange: (files: File[]) => void;
    files: File[];
    maxFiles?: number;
    disabled?: boolean;
    className?: string;
}

export function MultiFileUpload({
    onFilesChange,
    files,
    maxFiles = 10,
    disabled = false,
    className
}: MultiFileUploadProps) {
    const t = useTranslations('Dashboard.upload.dropzone');
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, [disabled]);

    const addFiles = useCallback((newFiles: FileList | File[]) => {
        const validFiles = Array.from(newFiles).filter(f => f.type.startsWith('video/'));
        const combined = [...files, ...validFiles].slice(0, maxFiles);
        onFilesChange(combined);
    }, [files, maxFiles, onFilesChange]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    }, [addFiles, disabled]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
            // Reset input so same file can be added again
            e.target.value = '';
        }
    };

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        onFilesChange(newFiles);
    };

    const clearAll = () => {
        onFilesChange([]);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className={cn("w-full space-y-4 flex flex-col", className)}>
            {/* Drop Zone */}
            <label
                htmlFor="multi-file-upload"
                className={cn(
                    "relative group flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden",
                    files.length === 0 ? "flex-1 min-h-[12rem]" : "h-32",
                    disabled && "opacity-50 cursor-not-allowed",
                    dragActive
                        ? "border-primary bg-primary/10 scale-[1.01]"
                        : "border-white/10 hover:border-white/20 hover:bg-white/5"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center py-4 z-10">
                    <div className={cn(
                        "p-3 rounded-full bg-white/5 mb-3 transition-transform duration-300",
                        dragActive ? "scale-110 bg-primary/20" : "group-hover:scale-110"
                    )}>
                        {files.length === 0 ? (
                            <Upload className={cn(
                                "w-6 h-6 transition-colors",
                                dragActive ? "text-primary" : "text-gray-400 group-hover:text-white"
                            )} />
                        ) : (
                            <Plus className={cn(
                                "w-6 h-6 transition-colors",
                                dragActive ? "text-primary" : "text-gray-400 group-hover:text-white"
                            )} />
                        )}
                    </div>
                    <div className="text-sm text-gray-300 group-hover:text-white transition-colors text-center px-4 flex flex-col items-center gap-1">
                        {files.length === 0 ? (
                            <>
                                <div className="mb-2">
                                    <span className="font-semibold text-primary text-lg">{t('click')}</span>
                                    <span className="text-gray-400"> {t('drag')}</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary shadow-sm shadow-primary/5">
                                        {t('batch', { count: maxFiles })}
                                    </div>
                                    <span className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">{t('formats')}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <span className="font-semibold text-primary text-base">{t('addMore')}</span>
                                <span className="text-xs text-gray-400">
                                    {t('selectedCount', { count: files.length, total: maxFiles })}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <input
                    id="multi-file-upload"
                    type="file"
                    className="hidden"
                    accept="video/*"
                    multiple
                    onChange={handleChange}
                    disabled={disabled}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </label>

            {/* File List */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm text-gray-400">
                                {t(files.length === 1 ? 'fileSelected' : 'filesSelected', { count: files.length })}
                            </span>
                            <button
                                type="button"
                                onClick={clearAll}
                                disabled={disabled}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            >
                                {t('clearAll')}
                            </button>
                        </div>

                        {/* File Items */}
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                            {files.map((file, index) => (
                                <motion.div
                                    key={`${file.name}-${file.size}-${index}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl"
                                >
                                    <div className="p-2 bg-primary/20 rounded-lg">
                                        <FileVideo className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatSize(file.size)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        disabled={disabled}
                                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white disabled:opacity-50"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
