'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface Job {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    input_url?: string;
    output_url?: string;
    created_at: string;
    progress?: number;
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

    // Activity Log Simulation
    const [activityStep, setActivityStep] = useState(0);
    const activitySteps = t.raw('activity') as string[];

    // Activity Step Timer
    useEffect(() => {
        if (!job || job.status === 'completed') return;

        const interval = setInterval(() => {
            setActivityStep(prev => (prev + 1) % activitySteps.length);
        }, 2500);

        return () => clearInterval(interval);
    }, [job?.status, activitySteps.length]);

    // Data Fetching
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
                        console.error('Failed to fetch job');
                    }
                    return;
                }

                const data = await res.json();
                if (isMounted) {
                    setJob(data);
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
                            <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
                            {t('backToHome')}
                        </Link>

                        <div
                            onClick={() => {
                                navigator.clipboard.writeText(job.id);
                                toast.success('Job ID copied to clipboard');
                            }}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer transition-colors group/copy"
                        >
                            <span>ID: {job.id.slice(0, 8)}...</span>
                            <Copy className="w-3 h-3 opacity-50 group-hover/copy:opacity-100 transition-opacity" />
                        </div>
                    </div>

                    {/* Main Content - Centered Single Column */}
                    <div className="max-w-4xl mx-auto space-y-8">

                        {/* Video / Result Area */}
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
                                    <div
                                        className="absolute inset-0 z-10 bg-black transition-opacity duration-300"
                                        style={{ opacity: 0.5 }}
                                    ></div>

                                    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden" style={{ mixBlendMode: 'normal' }}>
                                        <div
                                            className="absolute w-[80%] h-[80%] rounded-full bg-blue-600/80 transition-all duration-500"
                                            style={{
                                                top: '-10%', left: '-10%', filter: 'blur(60px)',
                                                animation: 'fluid1 4.5s infinite ease-in-out'
                                            }}
                                        ></div>
                                        <div
                                            className="absolute w-[80%] h-[80%] rounded-full bg-violet-600/80 transition-all duration-500"
                                            style={{
                                                bottom: '-10%', right: '-10%', filter: 'blur(60px)',
                                                animation: 'fluid2 5.75s infinite ease-in-out'
                                            }}
                                        ></div>
                                        <div
                                            className="absolute w-[60%] h-[60%] rounded-full bg-cyan-500/80 transition-all duration-500"
                                            style={{
                                                top: '20%', right: '20%', filter: 'blur(48px)',
                                                animation: 'fluid3 5.25s infinite ease-in-out'
                                            }}
                                        ></div>
                                    </div>
                                </>
                            )}

                            {/* 3. Content status Layer */}
                            {job.status !== 'completed' && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
                                    <div className="space-y-6">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="flex gap-2 items-center mb-2">
                                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
                                            </div>

                                            <h3 className="text-3xl font-light text-white tracking-[0.2em] uppercase opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-pulse">
                                                {job.status === 'pending' ? 'Preparing' : 'Processing'}
                                            </h3>

                                            <div className="h-8 overflow-hidden relative w-full flex justify-center">
                                                <p key={activityStep} className="text-blue-200/80 text-sm font-mono tracking-widest uppercase animate-[slideUp_0.5s_ease-out]">
                                                    {activitySteps[activityStep]}
                                                </p>
                                            </div>
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

                        {/* Footer Note - Processing State only */}
                        {job.status !== 'completed' && job.status !== 'failed' && (
                            <div className="text-center animate-in fade-in duration-1000 delay-500 max-w-lg mx-auto w-full px-4">
                                {/* Modern Progress Bar */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between items-end px-1">
                                        <span className="text-[10px] uppercase tracking-[0.2em] text-blue-300/60 font-semibold">
                                            PROCESSING
                                        </span>
                                        <span className="text-sm font-mono font-medium text-blue-300">
                                            {job.progress || 0}%
                                        </span>
                                    </div>

                                    <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 ring-1 ring-black/20">
                                        {/* Main Progress Logic Container */}
                                        <div
                                            className="absolute top-0 bottom-0 left-0 transition-all duration-700 ease-out rounded-full"
                                            style={{ width: `${Math.max(2, job.progress || 0)}%` }}
                                        >
                                            {/* 1. Inner Container: Content that MUST be clipped (Gradient + Shimmer) */}
                                            <div className="absolute inset-0 rounded-full overflow-hidden">
                                                {/* Gradient Background */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500"></div>

                                                {/* Shimmer Overlay - Now strictly contained */}
                                                <div className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] animate-[shimmer-slow_2.5s_infinite]"></div>
                                            </div>

                                            {/* 2. Outer Effects: Allowed to bleed (Glows/Shadows) */}
                                            {/* Main Bar Glow (Box Shadow equivalent) */}
                                            <div className="absolute inset-0 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>

                                            {/* Leading Edge Glow Tip */}
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white/40 blur-[4px] rounded-full shadow-[0_0_10px_white] translate-x-1/2"></div>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-white/30 text-xs font-light tracking-wide">
                                    You can safely leave this page. Your video will be saved in your <Link href="/dashboard" className="text-white/50 hover:text-white underline decoration-white/20 transition-colors">Dashboard</Link>.
                                </p>
                            </div>
                        )}

                        {/* Actions Area */}
                        {job.status === 'completed' && job.output_url && (
                            <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <a
                                    href={job.output_url}
                                    download
                                    className="group relative overflow-hidden rounded-full bg-white text-black px-12 py-4 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all transform hover:-translate-y-1 hover:scale-105"
                                >
                                    <div className="relative font-bold text-lg flex items-center gap-3">
                                        <span>Download Video</span>
                                        <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </div>
                                </a>
                            </div>
                        )}
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
                @keyframes shimmer-slow {
                    0% { transform: translateX(-150%); }
                    100% { transform: translateX(150%); }
                }
                @keyframes slideUp {
                    0% { transform: translateY(100%); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </main>
    );
}
