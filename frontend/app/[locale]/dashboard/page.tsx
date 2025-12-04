'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Film, Clock, CheckCircle, XCircle, Loader2,
    Download, CreditCard, Zap, History, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    const { isLoaded, userId, getToken } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [credits, setCredits] = useState<number>(3);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            try {
                const token = await getToken();

                // Fetch jobs
                const jobsRes = await fetch(`${API_URL}/api/jobs`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (jobsRes.ok) {
                    const jobsData = await jobsRes.json();
                    setJobs(jobsData);
                }

                // Fetch user credits (placeholder - will be implemented with backend)
                // For now, use default
                setCredits(3);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, getToken]);

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

    return (
        <main className="min-h-screen relative bg-black text-white">
            <AuroraBackground />

            <div className="relative z-10 pt-24 pb-16 px-4">
                <div className="container max-w-6xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
                        <p className="text-gray-400">{t('subtitle')}</p>
                    </motion.div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
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
                            transition={{ delay: 0.2 }}
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
                            transition={{ delay: 0.3 }}
                        >
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
                        </motion.div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-semibold flex items-center gap-2">
                            <History className="w-6 h-6" />
                            {t('history.title')}
                        </h2>
                        <Link href="/">
                            <Button variant="glow">
                                <Plus className="w-4 h-4 mr-2" />
                                {t('history.newVideo')}
                            </Button>
                        </Link>
                    </div>

                    {/* Job History Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="bg-white/5 border-white/10 overflow-hidden">
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : jobs.length === 0 ? (
                                    <div className="text-center py-20">
                                        <Film className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                                        <p className="text-gray-400 mb-4">{t('history.empty')}</p>
                                        <Link href="/">
                                            <Button variant="outline">{t('history.uploadFirst')}</Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-white/5 border-b border-white/10">
                                                <tr>
                                                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('table.status')}</th>
                                                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('table.quality')}</th>
                                                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('table.date')}</th>
                                                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('table.actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {jobs.map((job) => (
                                                    <tr key={job.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                {getStatusIcon(job.status)}
                                                                <span className="capitalize">{getStatusText(job.status)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${job.quality === 'e2fgvi_hq'
                                                                    ? 'bg-purple-500/20 text-purple-400'
                                                                    : 'bg-blue-500/20 text-blue-400'
                                                                }`}>
                                                                {job.quality === 'e2fgvi_hq' ? 'HQ' : 'Fast'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-400 text-sm">
                                                            {new Date(job.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2">
                                                                <Link href={`/job/${job.id}`}>
                                                                    <Button size="sm" variant="ghost">{t('table.view')}</Button>
                                                                </Link>
                                                                {job.status === 'completed' && job.output_url && (
                                                                    <a href={job.output_url} download>
                                                                        <Button size="sm" variant="outline">
                                                                            <Download className="w-4 h-4 mr-1" />
                                                                            {t('table.download')}
                                                                        </Button>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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
