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

    // State
    const [job, setJob] = useState<Job | null>(null);
    const [error, setError] = useState<string>('');

    // Fetch Job Data
    useEffect(() => {
        let isMounted = true;

        const fetchJob = async () => {
            if (!isLoaded || !userId || !jobId) return;

            try {
                const token = await getToken();
                if (!token) return;

                const res = await fetch(`${API_URL}/api/jobs/${jobId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    if (res.status === 404) {
                        if (isMounted) setError('Job not found');
                    } else {
                        // Don't set error immediately on transient failures, maybe retry?
                        // For now, simple error setting if it persists or is critical
                        console.error('Failed to fetch job');
                    }
                    return;
                }

                const data = await res.json();
                if (isMounted) {
                    setJob(data);
                    // Stop polling if completed/failed? 
                    // The interval will run regardless, but that's fine for now, 
                    // or we could clear it if status is terminal.
                }

            } catch (err) {
                console.error(err);
                if (isMounted) setError('An error occurred while fetching job details');
            }
        };

        // Initial fetch
        if (isLoaded && userId) {
            fetchJob();
        }

        // Poll every 3 seconds
        const interval = setInterval(() => {
            if (isLoaded && userId) fetchJob();
        }, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [isLoaded, userId, jobId, getToken]);



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
                        <div className="bg-black rounded-2xl relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 aspect-video">
                            {/* 1. Underlying Video Layer */}
                            <div className="absolute inset-0 z-0 bg-black">
                                {(job.input_url || job.output_url) && (
                                    <video
                                        src={job.output_url || job.input_url}
                                        controls={job.status === 'completed'}
                                        className={`w-full h-full transition-all duration-500 ${job.status === 'completed' ? 'object-contain' : 'object-cover contrast-125'}`}
                                        style={{
                                            opacity: job.status !== 'completed' ? 0.5 : 1,
                                            filter: job.status !== 'completed' ? 'grayscale(100%) saturate(0%)' : 'none'
                                        }}
                                        autoPlay
                                        loop
                                        muted={job.status !== 'completed'}
                                        playsInline
                                    />
                                )}
                                {/* Darkening overlay for text readability during processing */}
                                {job.status !== 'completed' && (
                                    <div className="absolute inset-0 bg-[#0a0a1a]/60 backdrop-blur-[2px]"></div>
                                )}
                            </div>

                            {/* 2. Fluid Light Effect (Only when processing/pending) */}
                            {(job.status === 'processing' || job.status === 'pending') && (
                                <>
                                    {/* Overlay controlled by opacity (50% default) */}
                                    <div
                                        className="absolute inset-0 z-10 bg-black transition-opacity duration-300"
                                        style={{ opacity: 0.5 }} // User requested 50% opacity
                                    ></div>

                                    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden" style={{ mixBlendMode: 'normal' }}>
                                        {/* Blob 1 - Deep Blue/Indigo */}
                                        <div
                                            className="absolute w-[80%] h-[80%] rounded-full bg-blue-600/80 transition-all duration-500"
                                            style={{
                                                top: '-10%',
                                                left: '-10%',
                                                filter: 'blur(60px)',
                                                animation: 'fluid1 4.5s infinite ease-in-out' // Speed 4x (18/4)
                                            }}
                                        ></div>
                                        {/* Blob 2 - Rich Violet */}
                                        <div
                                            className="absolute w-[80%] h-[80%] rounded-full bg-violet-600/80 transition-all duration-500"
                                            style={{
                                                bottom: '-10%',
                                                right: '-10%',
                                                filter: 'blur(60px)',
                                                animation: 'fluid2 5.75s infinite ease-in-out' // Speed 4x (23/4)
                                            }}
                                        ></div>
                                        {/* Blob 3 - Cyan Highlight */}
                                        <div
                                            className="absolute w-[60%] h-[60%] rounded-full bg-cyan-500/80 transition-all duration-500"
                                            style={{
                                                top: '20%',
                                                right: '20%',
                                                filter: 'blur(48px)', // 60 * 0.8
                                                animation: 'fluid3 5.25s infinite ease-in-out' // Speed 4x (21/4)
                                            }}
                                        ></div>
                                    </div>
                                </>
                            )}

                            {/* 3. Content status Layer */}
                            {job.status !== 'completed' && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
                                    <div className="space-y-6">
                                        {/* Minimalist Status */}
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex gap-2 items-center">
                                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                                            </div>
                                            <h3 className="text-2xl font-light text-white tracking-[0.2em] uppercase opacity-90 drop-shadow-md">
                                                {job.status === 'pending' ? 'Queued' : 'Processing'}
                                            </h3>
                                            <p className="text-white/50 text-xs font-mono tracking-widest uppercase">
                                                AI Restoration in Progress
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {job.status === 'completed' && job.output_url && (
                                <div className="absolute bottom-6 left-0 right-0 text-center z-20 pointer-events-none">
                                    <h3 className="inline-block px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-green-400 font-medium text-sm border border-green-500/30">
                                        {t('messages.completed')}
                                    </h3>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Status & Actions */}
                        <div className="space-y-8">
                            {/* Status Card */}
                            {/* Status Card */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Status</h2>
                                        <div className="flex items-center gap-3">
                                            {job.status === 'processing' && (
                                                <span className="relative flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                                </span>
                                            )}
                                            <span className="text-2xl font-bold text-white capitalize">
                                                {job.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-4xl ${job.status === 'completed' ? 'text-green-500 grayscale-0' : 'text-blue-500/50 grayscale'} transition-all duration-500`}>
                                        {job.status === 'completed' ? '✓' : job.status === 'failed' ? '❌' : '⚡'}
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
                @keyframes fluid1 {
                    0% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(20%, -10%) scale(1.1); }
                    50% { transform: translate(10%, 15%) scale(0.9); }
                    75% { transform: translate(-15%, 25%) scale(1.05); }
                    100% { transform: translate(0, 0) scale(1); }
                }
                @keyframes fluid2 {
                    0% { transform: translate(0, 0) scale(1.1); }
                    30% { transform: translate(-25%, -15%) scale(0.9); }
                    60% { transform: translate(-10%, 20%) scale(1.2); }
                    100% { transform: translate(0, 0) scale(1.1); }
                }
                @keyframes fluid3 {
                    0% { transform: translate(0, 0) scale(0.9); }
                    40% { transform: translate(25%, 25%) scale(1.1); }
                    70% { transform: translate(5%, -20%) scale(0.85); }
                    100% { transform: translate(0, 0) scale(0.9); }
                }
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
