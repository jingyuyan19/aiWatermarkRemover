'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileVideo, Upload, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

type DemoPhase = 'idle' | 'dragging' | 'uploading' | 'processing' | 'complete';

export function HowItWorksDemo() {
    const t = useTranslations('Demo');
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
        <div className="relative max-w-4xl mx-auto px-2 sm:px-0">
            {/* Fake App Window */}
            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden shadow-2xl">
                {/* Window Header - hidden on very small screens */}
                <div className="hidden sm:flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    <span className="ml-4 text-xs text-gray-500 font-mono">vanishly.app/dashboard</span>
                </div>

                {/* Mobile header */}
                <div className="sm:hidden flex items-center justify-center py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-gray-400 font-medium">{t('liveDemo')}</span>
                </div>

                {/* App Content - responsive padding and height */}
                <div className="p-4 sm:p-6 md:p-8 min-h-[280px] sm:min-h-[350px] md:min-h-[400px] relative">
                    {/* Upload Zone - responsive padding */}
                    <motion.div
                        className={`border-2 border-dashed rounded-lg sm:rounded-xl p-6 sm:p-8 md:p-12 text-center transition-colors duration-300 ${phase === 'dragging'
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
                                    className="space-y-2 sm:space-y-4"
                                >
                                    <Upload className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-gray-500" />
                                    <p className="text-sm sm:text-base text-gray-400">{t('dropVideo')}</p>
                                    <p className="text-xs text-gray-600">{t('formats')}</p>
                                </motion.div>
                            )}

                            {phase === 'dragging' && (
                                <motion.div
                                    key="dragging"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-3 sm:space-y-4"
                                >
                                    <motion.div
                                        className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-4 rounded-lg sm:rounded-xl bg-primary/20 border border-primary/30"
                                        initial={{ x: -100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ type: "spring", damping: 15 }}
                                    >
                                        <FileVideo className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                                        <div className="text-left">
                                            <p className="text-sm sm:text-base text-white font-medium">{t('sampleFile')}</p>
                                            <p className="text-xs text-gray-400">{t('fileSize')}</p>
                                        </div>
                                    </motion.div>
                                    <p className="text-sm sm:text-base text-primary font-medium">{t('dropToUpload')}</p>
                                </motion.div>
                            )}

                            {(phase === 'uploading' || phase === 'processing' || phase === 'complete') && (
                                <motion.div
                                    key="queue"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-4 sm:space-y-6"
                                >
                                    {/* Queue Item - mobile-optimized layout */}
                                    <div className="bg-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/10">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                                            {/* File info row */}
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                    <FileVideo className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm sm:text-base text-white font-medium truncate">{t('sampleFile')}</p>
                                                    {/* Status on mobile - inline with filename */}
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {phase === 'uploading' && (
                                                            <>
                                                                <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                                                                <span className="text-xs text-gray-400">{t('uploading')}</span>
                                                            </>
                                                        )}
                                                        {phase === 'complete' && (
                                                            <>
                                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                                <span className="text-xs text-green-500">{t('complete')}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress bar - full width on mobile */}
                                            {phase === 'processing' && (
                                                <div className="flex items-center gap-2 w-full sm:flex-1">
                                                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full bg-gradient-to-r from-primary to-purple-500"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-primary font-mono w-10 text-right">{progress}%</span>
                                                </div>
                                            )}

                                            {/* Download button */}
                                            <AnimatePresence>
                                                {phase === 'complete' && (
                                                    <motion.button
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        {t('download')}
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
                                                className="text-xs sm:text-sm text-gray-400 text-center"
                                            >
                                                {t('processing')}
                                            </motion.p>
                                        )}
                                        {phase === 'complete' && (
                                            <motion.p
                                                key="complete-msg"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-xs sm:text-sm text-green-400 text-center"
                                            >
                                                {t('success')}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Step Indicators - simplified on mobile */}
                    <div className="flex justify-center gap-3 sm:gap-8 mt-4 sm:mt-8">
                        {[
                            { key: 'upload', active: phase === 'dragging' || phase === 'uploading' },
                            { key: 'process', active: phase === 'processing' },
                            { key: 'download', active: phase === 'complete' },
                        ].map((step, i) => (
                            <div key={step.key} className="flex items-center gap-1.5 sm:gap-2">
                                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-colors ${step.active
                                        ? 'bg-primary text-white'
                                        : 'bg-white/10 text-gray-500'
                                    }`}>
                                    {i + 1}
                                </div>
                                <span className={`text-xs sm:text-sm transition-colors ${step.active ? 'text-white' : 'text-gray-500'
                                    }`}>
                                    {t(`steps.${step.key}`)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Glow effect - slightly reduced on mobile */}
            <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-2xl sm:blur-3xl -z-10 opacity-40 sm:opacity-50" />
        </div>
    );
}
