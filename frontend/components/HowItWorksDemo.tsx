'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileVideo, Upload, CheckCircle2, Download, Loader2 } from 'lucide-react';

type DemoPhase = 'idle' | 'dragging' | 'uploading' | 'processing' | 'complete';

export function HowItWorksDemo() {
    const [phase, setPhase] = useState<DemoPhase>('idle');
    const [progress, setProgress] = useState(0);

    // Animation loop
    useEffect(() => {
        const runDemo = async () => {
            // Phase 1: Idle (show empty state)
            setPhase('idle');
            setProgress(0);
            await delay(1500);

            // Phase 2: Dragging file in
            setPhase('dragging');
            await delay(2000);

            // Phase 3: File dropped, uploading
            setPhase('uploading');
            await delay(1500);

            // Phase 4: Processing with progress
            setPhase('processing');
            for (let i = 0; i <= 100; i += 2) {
                setProgress(i);
                await delay(80);
            }
            await delay(500);

            // Phase 5: Complete
            setPhase('complete');
            await delay(3000);

            // Restart
            runDemo();
        };

        runDemo();
    }, []);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    return (
        <div className="relative max-w-4xl mx-auto">
            {/* Fake App Window */}
            <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden shadow-2xl">
                {/* Window Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    <span className="ml-4 text-xs text-gray-500 font-mono">vanishly.app/dashboard</span>
                </div>

                {/* App Content */}
                <div className="p-8 min-h-[400px] relative">
                    {/* Upload Zone */}
                    <motion.div
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors duration-300 ${phase === 'dragging'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/20 bg-white/5'
                            }`}
                        animate={{
                            scale: phase === 'dragging' ? 1.02 : 1,
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {phase === 'idle' && (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    <Upload className="w-12 h-12 mx-auto text-gray-500" />
                                    <p className="text-gray-400">Drop your video here</p>
                                    <p className="text-xs text-gray-600">MP4, MOV, AVI up to 100MB</p>
                                </motion.div>
                            )}

                            {phase === 'dragging' && (
                                <motion.div
                                    key="dragging"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-4"
                                >
                                    <motion.div
                                        className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-primary/20 border border-primary/30"
                                        initial={{ x: -200, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ type: "spring", damping: 15 }}
                                    >
                                        <FileVideo className="w-8 h-8 text-primary" />
                                        <div className="text-left">
                                            <p className="text-white font-medium">sample_video.mp4</p>
                                            <p className="text-xs text-gray-400">2.8 MB</p>
                                        </div>
                                    </motion.div>
                                    <p className="text-primary font-medium">Drop to upload</p>
                                </motion.div>
                            )}

                            {(phase === 'uploading' || phase === 'processing' || phase === 'complete') && (
                                <motion.div
                                    key="queue"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Queue Item */}
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                                                <FileVideo className="w-6 h-6 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium truncate">sample_video.mp4</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {phase === 'uploading' && (
                                                        <>
                                                            <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                                                            <span className="text-xs text-gray-400">Uploading...</span>
                                                        </>
                                                    )}
                                                    {phase === 'processing' && (
                                                        <>
                                                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    className="h-full bg-gradient-to-r from-primary to-purple-500"
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-primary font-mono w-10 text-right">{progress}%</span>
                                                        </>
                                                    )}
                                                    {phase === 'complete' && (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                            <span className="text-xs text-green-500">Complete!</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <AnimatePresence>
                                                {phase === 'complete' && (
                                                    <motion.button
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="px-4 py-2 rounded-lg bg-primary text-white font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download
                                                    </motion.button>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Status Message */}
                                    <AnimatePresence mode="wait">
                                        {phase === 'processing' && (
                                            <motion.p
                                                key="processing-msg"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="text-sm text-gray-400 text-center"
                                            >
                                                🪄 AI is removing watermarks...
                                            </motion.p>
                                        )}
                                        {phase === 'complete' && (
                                            <motion.p
                                                key="complete-msg"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-sm text-green-400 text-center"
                                            >
                                                ✨ Watermark removed successfully!
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Step Indicators */}
                    <div className="flex justify-center gap-8 mt-8">
                        {[
                            { label: 'Upload', active: phase === 'dragging' || phase === 'uploading' },
                            { label: 'Process', active: phase === 'processing' },
                            { label: 'Download', active: phase === 'complete' },
                        ].map((step, i) => (
                            <div key={step.label} className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step.active
                                        ? 'bg-primary text-white'
                                        : 'bg-white/10 text-gray-500'
                                    }`}>
                                    {i + 1}
                                </div>
                                <span className={`text-sm transition-colors ${step.active ? 'text-white' : 'text-gray-500'
                                    }`}>
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl -z-10 opacity-50" />
        </div>
    );
}
