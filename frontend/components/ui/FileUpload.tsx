import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileVideo, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    selectedFile: File | null;
    onClear: () => void;
}

export function FileUpload({ onFileSelect, selectedFile, onClear }: FileUploadProps) {
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type.startsWith('video/')) {
                onFileSelect(droppedFile);
            }
        }
    }, [onFileSelect]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {!selectedFile ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key="upload-zone"
                    >
                        <label
                            htmlFor="file-upload"
                            className={cn(
                                "relative group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden",
                                dragActive
                                    ? "border-primary bg-primary/10 scale-[1.02]"
                                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
                            )}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
                                <div className={cn(
                                    "p-4 rounded-full bg-white/5 mb-4 transition-transform duration-300",
                                    dragActive ? "scale-110 bg-primary/20" : "group-hover:scale-110"
                                )}>
                                    <Upload className={cn(
                                        "w-8 h-8 transition-colors",
                                        dragActive ? "text-primary" : "text-gray-400 group-hover:text-white"
                                    )} />
                                </div>
                                <p className="mb-2 text-lg font-medium text-gray-300 group-hover:text-white transition-colors">
                                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-sm text-gray-500">MP4, MOV, AVI (max 100MB)</p>
                            </div>
                            <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                accept="video/*"
                                onChange={handleChange}
                            />

                            {/* Background Glow */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </label>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        key="file-selected"
                        className="relative w-full p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/20 rounded-xl">
                                <FileVideo className="w-8 h-8 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg font-medium text-white truncate">
                                    {selectedFile.name}
                                </p>
                                <p className="text-sm text-gray-400">
                                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    onClear();
                                }}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
