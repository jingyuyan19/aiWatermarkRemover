'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Film, Clock, CheckCircle, XCircle, Loader2,
    Zap, History, Plus, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/FileUpload';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface Job {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    input_url: string | null;
    output_url: string | null;
    quality: string;
    cost: number;
    created_at: string;
}

export default function DashboardPage() {
    const t = useTranslations('Dashboard');
    const locale = useLocale();
    const { isLoaded, userId, getToken } = useAuth();
    const router = useRouter();

    const [jobs, setJobs] = useState<Job[]>([]);
    const [credits, setCredits] = useState<number>(3);
    const [loading, setLoading] = useState(true);

    // Upload state
    const [file, setFile] = useState<File | null>(null);
    const [quality, setQuality] = useState<'lama' | 'e2fgvi_hq'>('lama');
    const [uploading, setUploading] = useState(false);

    // Check for payment success
    const searchParams = useSearchParams();

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
                setJobs(jobsData);
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
    }, [userId, getToken]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !userId) return;

        setUploading(true);
        try {
            const token = await getToken();

            const formData = new FormData();
            formData.append('file', file);

            // Use Direct Railway URL to bypass Vercel 4.5MB limit
            const DIRECT_API = 'https://aiwatermarkremover-production.up.railway.app';

            const uploadResponse = await fetch(`${DIRECT_API}/api/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error("Upload failed details:", errorText);
                throw new Error(`Upload failed: ${errorText}`);
            }
            const { key } = await uploadResponse.json();

            const jobResponse = await fetch(`${API_URL}/api/jobs?input_key=${encodeURIComponent(key)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ quality }),
            });

            if (!jobResponse.ok) throw new Error('Job creation failed');
            const job = await jobResponse.json();

            toast.success(t('upload.success'));
            router.push(`/${locale}/job/${job.id}`);
        } catch (error) {
            console.error('Error:', error);
            toast.error(t('upload.error'));
        } finally {
            setUploading(false);
        }
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
                            >
                                <Card className="bg-white/5 border-white/10 overflow-hidden">
                                    <CardContent className="p-8">
                                        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                                            <Upload className="w-6 h-6 text-primary" />
                                            {t('upload.title')}
                                        </h2>

                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <FileUpload
                                                onFileSelect={setFile}
                                                selectedFile={file}
                                                onClear={() => setFile(null)}
                                            />

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setQuality('lama')}
                                                    className={`p-4 rounded-xl border transition-all text-left ${quality === 'lama'
                                                        ? 'bg-primary/10 border-primary/50'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                        }`}
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
                                                    className={`p-4 rounded-xl border transition-all text-left ${quality === 'e2fgvi_hq'
                                                        ? 'bg-accent/10 border-accent/50'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                        }`}
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

                                            <Button
                                                type="submit"
                                                className="w-full h-14 text-lg rounded-xl font-semibold"
                                                variant="glow"
                                                disabled={!file || uploading}
                                            >
                                                {uploading ? (
                                                    <span className="flex items-center gap-3">
                                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        {t('upload.processing')}
                                                    </span>
                                                ) : t('upload.submit')}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Right Column: Stats */}
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card className="bg-white/5 border-white/10">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                                <Zap className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-400">{t('stats.credits')}</p>
                                                <p className="text-3xl font-bold">{credits}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="bg-white/5 border-white/10">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                                <Film className="w-6 h-6 text-green-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-400">{t('stats.processed')}</p>
                                                <p className="text-3xl font-bold">{jobs.filter(j => j.status === 'completed').length}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Link href={`/${locale}/pricing`}>
                                    <Card className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                                                    <Plus className="w-6 h-6 text-accent" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-400">{t('stats.buyCredits')}</p>
                                                    <p className="text-lg font-semibold text-accent">{t('stats.topUp')}</p>
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
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : recentJobs.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Film className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                                        <p className="text-gray-400">{t('recentJobs.empty')}</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {recentJobs.map((job) => (
                                            <Link
                                                key={job.id}
                                                href={`/${locale}/job/${job.id}`}
                                                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getStatusIcon(job.status)}
                                                    <div>
                                                        <span className="text-sm font-medium">{getStatusText(job.status)}</span>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(job.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs ${job.quality === 'e2fgvi_hq'
                                                    ? 'bg-purple-500/20 text-purple-400'
                                                    : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {job.quality === 'e2fgvi_hq' ? 'HQ' : 'Fast'}
                                                </span>
                                            </Link>
                                        ))}
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
