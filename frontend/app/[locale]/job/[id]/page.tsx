'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface Job {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    input_url?: string;
    output_url?: string;
    created_at: string;
}

export default function JobPage() {
    const t = useTranslations('JobPage');
    const params = useParams();
    const router = useRouter();
    const jobId = params.id as string;
    const { isLoaded, userId, getToken } = useAuth();
    // Smart Progress Logic
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!job) return;

        if (job.status === 'completed') {
            setProgress(100);
            return;
        }

        if (job.status === 'failed') {
            setProgress(100); // Or 0?
            return;
        }

        // Calculate progress based on time elapsed since creation
        // Average job takes ~45 seconds
        const calculateProgress = () => {
            const now = new Date().getTime();
            const created = new Date(job.created_at).getTime();
            const elapsed = (now - created) / 1000; // seconds

            // Expected duration in seconds
            const expectedDuration = 45;

            // Logarithmic-ish curve that slows down as it approaches 90%
            // 90% is the max "fake" progress until completion
            let calculated = (elapsed / expectedDuration) * 90;

            if (calculated > 90) calculated = 90 + ((elapsed - expectedDuration) * 0.1); // Very slow crawl after 90%
            if (calculated > 95) calculated = 95; // Hard cap at 95%

            setProgress(Math.max(5, Math.min(Math.floor(calculated), 95)));
        };

        calculateProgress(); // Initial calc
        const timer = setInterval(calculateProgress, 1000); // Update every second

        return () => clearInterval(timer);
    }, [job?.status, job?.created_at]);

    if (error) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-8 max-w-md text-center backdrop-blur-md">
                    <div className="text-red-500 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-red-200 text-lg font-medium">{error}</p>
                    <Link href="/" className="mt-6 inline-block text-white/50 hover:text-white transition-colors">
                        {t('backToHome')}
                    </Link>
                </div>
            </main>
        );
    }

    if (!job) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-blue-400 animate-pulse">{t('loading', { defaultMessage: 'Initializing Interface...' })}</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#0a0a1a] text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-purple-900/10 to-transparent pointer-events-none"></div>

            <div className="container mx-auto px-4 py-12 relative z-10">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-12">
                        <Link href="/" className="flex items-center text-gray-400 hover:text-white transition-colors group">
                            <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {t('backToHome')}
                        </Link>
                        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-gray-400">
                            ID: {job.id.slice(0, 8)}...
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-start">
                        {/* Left Column: Result / Preview */}
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group">
                            {/* Scanning Line Effect for Processing */}
                            {(job.status === 'processing' || job.status === 'pending') && (
                                <div className="absolute inset-0 z-0 pointer-events-none">
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-[50%] animate-[scan_3s_linear_infinite]"></div>
                                </div>
                            )}

                            {job.status === 'completed' && job.output_url ? (
                                <div className="space-y-6">
                                    <div className="relative rounded-xl overflow-hidden border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                                        <video src={job.output_url} controls className="w-full" autoPlay loop muted />
                                    </div>
                                    <h3 className="text-center text-green-400 font-medium flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {t('messages.completed')}
                                    </h3>
                                </div>
                            ) : (
                                <div className="aspect-video bg-black/60 rounded-xl flex items-center justify-center border border-white/5 relative">
                                    {/* Central Loader */}
                                    <div className="text-center relative z-10">
                                        <div className="w-20 h-20 mx-auto mb-6 relative">
                                            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            {/* Pulse Core */}
                                            <div className="absolute inset-4 bg-blue-500/20 rounded-full animate-pulse"></div>
                                        </div>
                                        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                            {job.status === 'pending' ? 'Queued' : 'Removing Watermark'}
                                        </h3>
                                        <p className="text-gray-400 mt-2 text-sm">{job.status === 'pending' ? 'Waiting for GPU worker...' : 'AI Neural Network Active'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Status & Actions */}
                        <div className="space-y-8">
                            {/* Status Card */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Status</h2>
                                        <div className="text-3xl font-bold text-white flex items-center gap-3">
                                            {progress}%
                                            <span className="text-sm font-normal text-gray-500 py-1.5 px-3 rounded-md bg-white/5 border border-white/5">
                                                {job.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-5xl ${job.status === 'completed' ? 'text-green-500 grayscale-0' : 'text-blue-500 grayscale'} transition-all duration-500`}>
                                        {job.status === 'completed' ? '✓' : '⚡'}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden mb-6 shadow-inner">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 transition-all duration-1000 ease-out flex items-center justify-end pr-1"
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="w-full h-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full"></div>
                                    </div>
                                </div>

                                {/* Dynamic Messages */}
                                <div className="h-16 flex items-center">
                                    {job.status === 'pending' && <p className="text-yellow-200/80 animate-pulse">⏳ Allocating dedicated GPU processor...</p>}
                                    {job.status === 'processing' && (
                                        <div className="space-y-1">
                                            <p className="text-blue-200/90 font-medium">✨ AI Processing in progress...</p>
                                            <p className="text-xs text-blue-300/50">Analyzing frames • Inpainting textures • Upscaling</p>
                                        </div>
                                    )}
                                    {job.status === 'completed' && <p className="text-green-400 font-bold text-lg">🎉 Your video is ready!</p>}
                                    {job.status === 'failed' && <p className="text-red-400">❌ Error: Processing failed. Please try again.</p>}
                                </div>
                            </div>

                            {/* Actions */}
                            {job.status === 'completed' && job.output_url && (
                                <a
                                    href={job.output_url}
                                    download
                                    className="block w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-[1px] shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:shadow-[0_0_60px_rgba(59,130,246,0.7)] transition-all transform hover:-translate-y-1"
                                >
                                    <div className="relative bg-black/50 group-hover:bg-transparent transition-colors rounded-xl px-8 py-4 flex items-center justify-center gap-3">
                                        <span className="text-xl">⬇️</span>
                                        <span className="font-bold text-lg">Download Unwatermarked Video</span>
                                    </div>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0% { top: -50%; }
                    100% { top: 150%; }
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </main>
    );
}
