'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Film, Clock, CheckCircle, XCircle, Loader2,
    Zap, History, Plus, Upload, PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MultiFileUpload } from '@/components/ui/MultiFileUpload';
import { UploadQueue, QueueItem } from '@/components/ui/UploadQueue';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

import { Job } from '@/types/job';
import { getEffectiveJobStatus } from '@/utils/jobExpiration';

// Removed local Job interface

export default function DashboardPage() {
    const t = useTranslations('Dashboard');
    const locale = useLocale();
    const { isLoaded, userId, getToken } = useAuth();
    const router = useRouter();

    const [jobs, setJobs] = useState<Job[]>([]);
    const jobsRef = useRef<Job[]>([]);

    // Keep ref in sync
    useEffect(() => {
        jobsRef.current = jobs;
    }, [jobs]);
    const [credits, setCredits] = useState<number | null>(null);
    const [processedCount, setProcessedCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Multi-file upload state
    const [files, setFiles] = useState<File[]>([]);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [quality, setQuality] = useState<'lama' | 'e2fgvi_hq'>('lama');
    const [isProcessing, setIsProcessing] = useState(false);

    // Check for payment success
    const searchParams = useSearchParams();

    // Redirect unauthenticated users to home page
    useEffect(() => {
        if (isLoaded && !userId) {
            router.push(`/${locale}`);
        }
    }, [isLoaded, userId, router, locale]);

    useEffect(() => {
        if (searchParams.get('payment') === 'success') {
            const added = searchParams.get('credits');
            toast.success(t('payment.success'), {
                description: t('payment.creditsAdded', { amount: added || '' })
            });
            // Remove params to prevent double toast
            router.replace(`/${locale}/dashboard`);
            // Data will be refreshed by fetchData
        }
    }, [searchParams, router, locale, t]);

    const fetchData = async () => {
        const token = await getToken();

        // Fetch jobs (independent - don't let failure affect credits)
        try {
            const jobsRes = await fetch(`${API_URL}/api/jobs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (jobsRes.ok) {
                const jobsData = await jobsRes.json();
                // Handle both array (old) and object (new paginated) formats
                const jobsList = Array.isArray(jobsData) ? jobsData : (jobsData.jobs || []);
                setJobs(jobsList);

                // Use backend stats if available, otherwise fallback to current list count
                if (!Array.isArray(jobsData) && typeof jobsData.processed_count === 'number') {
                    setProcessedCount(jobsData.processed_count);
                } else {
                    setProcessedCount(jobsList.filter((j: Job) => j.status === 'completed').length);
                }
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }

        // Fetch credits (independent)
        try {
            const creditsRes = await fetch(`${API_URL}/api/codes/balance`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (creditsRes.ok) {
                const creditsData = await creditsRes.json();
                setCredits(creditsData.credits);
            }
        } catch (error) {
            console.error('Error fetching credits:', error);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (!userId) return;
        fetchData();

        // Poll for active jobs
        const interval = setInterval(async () => {
            const currentJobs = jobsRef.current;
            const activeJobs = currentJobs.filter(j =>
                j.status === 'processing' || j.status === 'pending'
            );

            if (activeJobs.length === 0) return;

            const token = await getToken();
            if (!token) return;

            await Promise.all(activeJobs.map(async (job) => {
                try {
                    const res = await fetch(`${API_URL}/api/jobs/${job.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const updatedJob = await res.json();

                        // Check if status or progress actually changed to avoid unnecessary renders
                        setJobs(prev => {
                            const match = prev.find(j => j.id === updatedJob.id);
                            if (match && match.status === updatedJob.status && match.progress === updatedJob.progress && match.output_url === updatedJob.output_url) {
                                return prev;
                            }
                            return prev.map(j => j.id === updatedJob.id ? updatedJob : j);
                        });

                        // If a job just completed, refresh the "processed count" too
                        if (updatedJob.status === 'completed' && job.status !== 'completed') {
                            fetchData(); // Refresh the main list/stats once to be safe
                        }
                    }
                } catch (err) {
                    console.error(`Error polling job ${job.id}:`, err);
                }
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, [userId, getToken]);

    // Generate unique ID for queue items
    const generateId = () => Math.random().toString(36).substring(2, 9);

    // Add files to queue
    const handleFilesChange = useCallback((newFiles: File[]) => {
        setFiles(newFiles);
    }, []);

    // Start processing all files in queue
    const handleProcessAll = async () => {
        if (files.length === 0 || !userId) return;

        // Check credits
        const totalCost = files.length * (quality === 'e2fgvi_hq' ? 2 : 1);
        if (credits === null) {
            toast.error('Loading credits...', {
                description: 'Please wait while we fetch your credit balance.',
            });
            return;
        }
        if (credits < totalCost) {
            toast.error(t('upload.insufficient_funds'), {
                description: `Need ${totalCost} credits, you have ${credits}`,
                action: {
                    label: t('upload.buy_credits'),
                    onClick: () => router.push(`/${locale}/pricing`)
                },
                duration: 5000,
            });
            return;
        }

        // Create queue items from files
        const queueItems: QueueItem[] = files.map(file => ({
            id: generateId(),
            file,
            status: 'pending' as const,
        }));
        setQueue(queueItems);
        setFiles([]); // Clear file picker
        setIsProcessing(true);

        const token = await getToken();
        const DIRECT_API = 'https://aiwatermarkremover-production.up.railway.app';
        let successCount = 0;
        let errorCount = 0;

        // Process each file sequentially
        for (let i = 0; i < queueItems.length; i++) {
            const item = queueItems[i];

            // Update status to uploading
            setQueue(prev => prev.map(q =>
                q.id === item.id ? { ...q, status: 'uploading' as const } : q
            ));

            try {
                // Upload file
                const formData = new FormData();
                formData.append('file', item.file);

                const uploadResponse = await fetch(`${DIRECT_API}/api/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    throw new Error('Upload failed');
                }
                const { key } = await uploadResponse.json();

                // Create job
                const jobResponse = await fetch(`${API_URL}/api/jobs?input_key=${encodeURIComponent(key)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ quality }),
                });

                if (!jobResponse.ok) {
                    if (jobResponse.status === 402) {
                        throw new Error('Insufficient credits');
                    }
                    throw new Error('Job creation failed');
                }

                const job = await jobResponse.json();

                // Update status to done
                setQueue(prev => prev.map(q =>
                    q.id === item.id ? { ...q, status: 'done' as const, jobId: job.id } : q
                ));
                successCount++;

                // Update credits display
                setCredits(prev => prev !== null ? prev - (quality === 'e2fgvi_hq' ? 2 : 1) : 0);

            } catch (error) {
                console.error('Error processing file:', item.file.name, error);
                setQueue(prev => prev.map(q =>
                    q.id === item.id ? {
                        ...q,
                        status: 'error' as const,
                        error: error instanceof Error ? error.message : 'Failed'
                    } : q
                ));
                errorCount++;
            }
        }

        setIsProcessing(false);

        // Show result toast
        if (successCount > 0 && errorCount === 0) {
            toast.success(`${successCount} video${successCount > 1 ? 's' : ''} queued for processing!`, {
                action: {
                    label: 'View History',
                    onClick: () => router.push(`/${locale}/history`)
                }
            });
        } else if (successCount > 0 && errorCount > 0) {
            toast.warning(`${successCount} succeeded, ${errorCount} failed`);
        } else if (errorCount > 0) {
            toast.error(`All ${errorCount} uploads failed`);
        }

        // Refresh data
        fetchData();
    };

    // Remove item from queue
    const handleRemoveFromQueue = (id: string) => {
        setQueue(prev => prev.filter(q => q.id !== id));
    };

    // Clear completed items from queue
    const handleClearCompleted = () => {
        setQueue(prev => prev.filter(q => q.status !== 'done'));
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'processing':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-yellow-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return t('status.completed');
            case 'processing': return t('status.processing');
            case 'failed': return t('status.failed');
            default: return t('status.pending');
        }
    };

    if (!isLoaded) return null;

    const recentJobs = jobs.slice(0, 5);

    return (
        <main className="min-h-screen relative bg-black text-white">
            <AuroraBackground />

            <div className="relative z-10 pt-24 pb-16 px-4">
                <div className="container max-w-6xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
                        <p className="text-gray-400">{t('subtitle')}</p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Upload */}
                        <div className="lg:col-span-2">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="h-full"
                            >
                                <Card className="bg-white/5 border-white/10 overflow-hidden h-full">
                                    <CardContent className="p-8 h-full flex flex-col">
                                        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                                            <Upload className="w-6 h-6 text-primary" />
                                            {t('upload.title')}
                                        </h2>

                                        <div className="space-y-6 flex-1 flex flex-col">
                                            {/* File Upload Zone */}
                                            <MultiFileUpload
                                                onFilesChange={handleFilesChange}
                                                files={files}
                                                maxFiles={10}
                                                disabled={isProcessing}
                                                className={files.length === 0 ? "flex-1" : ""}
                                            />

                                            {/* Upload Queue (shows during/after processing) */}
                                            {queue.length > 0 && (
                                                <UploadQueue
                                                    items={queue}
                                                    onRemove={handleRemoveFromQueue}
                                                    onClearCompleted={handleClearCompleted}
                                                    isProcessing={isProcessing}
                                                />
                                            )}

                                            {/* Quality Selection */}
                                            {files.length > 0 && (
                                                <>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setQuality('lama')}
                                                            disabled={isProcessing}
                                                            className={`p-4 rounded-xl border transition-all text-left ${quality === 'lama'
                                                                ? 'bg-primary/10 border-primary/50'
                                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                                } disabled:opacity-50`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${quality === 'lama' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-400'
                                                                    }`}>
                                                                    <Zap className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className={`font-semibold ${quality === 'lama' ? 'text-white' : 'text-gray-300'}`}>
                                                                        {t('upload.quality.fast.title')}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">{t('upload.quality.fast.description')}</div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setQuality('e2fgvi_hq')}
                                                            disabled={isProcessing}
                                                            className={`p-4 rounded-xl border transition-all text-left ${quality === 'e2fgvi_hq'
                                                                ? 'bg-accent/10 border-accent/50'
                                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                                } disabled:opacity-50`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${quality === 'e2fgvi_hq' ? 'bg-accent/20 text-accent' : 'bg-white/10 text-gray-400'
                                                                    }`}>
                                                                    <Clock className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className={`font-semibold ${quality === 'e2fgvi_hq' ? 'text-white' : 'text-gray-300'}`}>
                                                                        {t('upload.quality.hq.title')}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">{t('upload.quality.hq.description')}</div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </div>

                                                    {/* Cost Preview */}
                                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-sm">
                                                        <span className="text-gray-400">
                                                            {files.length} video{files.length > 1 ? 's' : ''} × {quality === 'e2fgvi_hq' ? '2' : '1'} credit{quality === 'e2fgvi_hq' ? 's' : ''}
                                                        </span>
                                                        <span className="font-semibold text-white">
                                                            Total: {files.length * (quality === 'e2fgvi_hq' ? 2 : 1)} credits
                                                        </span>
                                                    </div>

                                                    {/* Process Button */}
                                                    <Button
                                                        type="button"
                                                        onClick={handleProcessAll}
                                                        className="w-full h-14 text-lg rounded-xl font-semibold"
                                                        variant="glow"
                                                        disabled={files.length === 0 || isProcessing}
                                                    >
                                                        <PlayCircle className="w-5 h-5 mr-2" />
                                                        {isProcessing ? (
                                                            <span className="flex items-center gap-3">
                                                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                {t('upload.processing')}
                                                            </span>
                                                        ) : (
                                                            `Process ${files.length} Video${files.length > 1 ? 's' : ''}`
                                                        )}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Right Column: Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6 lg:space-y-0">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="col-span-1"
                            >
                                <Card className="bg-white/5 border-white/10 h-full">
                                    <CardContent className="p-4 lg:p-6">
                                        <div className="flex items-center gap-3 lg:gap-4">
                                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                                                <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs lg:text-sm text-gray-400 truncate">{t('stats.credits')}</p>
                                                {credits === null ? (
                                                    <Skeleton className="h-6 w-12 lg:h-9 lg:w-16 mt-1" />
                                                ) : (
                                                    <p className="text-xl lg:text-3xl font-bold mt-0.5 lg:mt-0 leading-none">{credits}</p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="col-span-1"
                            >
                                <Card className="bg-white/5 border-white/10 h-full">
                                    <CardContent className="p-4 lg:p-6">
                                        <div className="flex items-center gap-3 lg:gap-4">
                                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                                                <Film className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs lg:text-sm text-gray-400 truncate">{t('stats.processed')}</p>
                                                <p className="text-xl lg:text-3xl font-bold mt-0.5 lg:mt-0 leading-none">{processedCount}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="col-span-2 lg:col-span-1"
                            >
                                <Link href={`/${locale}/pricing`}>
                                    <Card className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors h-full">
                                        <CardContent className="p-4 lg:p-6">
                                            <div className="flex items-center gap-3 lg:gap-4">
                                                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                                                    <Plus className="w-5 h-5 lg:w-6 lg:h-6 text-accent" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs lg:text-sm text-gray-400 truncate">{t('stats.buyCredits')}</p>
                                                    <p className="text-base lg:text-lg font-semibold text-accent mt-0.5 lg:mt-0 leading-none truncate">{t('stats.topUp')}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </motion.div>
                        </div>
                    </div>

                    {/* Recent Jobs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <History className="w-5 h-5" />
                                {t('recentJobs.title')}
                            </h2>
                            <Link href={`/${locale}/history`}>
                                <Button variant="ghost" size="sm">
                                    {t('recentJobs.viewAll')}
                                </Button>
                            </Link>
                        </div>

                        <Card className="bg-white/5 border-white/10">
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="divide-y divide-white/5">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="flex items-center justify-between p-4">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <Skeleton className="w-5 h-5 rounded-full" />
                                                    <div className="flex-1 max-w-md space-y-2">
                                                        <Skeleton className="h-4 w-24" />
                                                        <Skeleton className="h-3 w-16" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-6 w-12 rounded-full" />
                                            </div>
                                        ))}
                                    </div>
                                ) : recentJobs.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Film className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                                        <p className="text-gray-400">{t('recentJobs.empty')}</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {recentJobs.map((job) => {
                                            const status = getEffectiveJobStatus(job);
                                            return (
                                                <Link
                                                    key={job.id}
                                                    href={`/${locale}/job/${job.id}`}
                                                    className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3 flex-1">
                                                        {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-400" />}
                                                        {status === 'processing' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                                                        {status === 'pending' && <Clock className="w-5 h-5 text-yellow-400" />}
                                                        {status === 'failed' && <XCircle className="w-5 h-5 text-red-400" />}
                                                        {status === 'expired' && <Clock className="w-5 h-5 text-gray-500" />}
                                                        <div className="flex-1 max-w-md">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className={`text-sm font-medium ${status === 'expired' ? 'text-gray-500' : ''}`}>
                                                                    {status === 'expired' ? t('status.expired') : getStatusText(status)}
                                                                </span>
                                                                {(job.status === 'processing' || job.status === 'pending') && (
                                                                    <span className="text-xs text-primary font-medium">{job.progress}%</span>
                                                                )}
                                                            </div>

                                                            {(job.status === 'processing' || job.status === 'pending') ? (
                                                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                                                                    <div
                                                                        className="h-full bg-primary transition-all duration-500 rounded-full"
                                                                        style={{ width: `${job.progress}%` }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-500 truncate">
                                                                    {new Date(job.created_at).toLocaleDateString()} • {job.quality === 'e2fgvi_hq' ? 'High Quality' : 'Fast'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
