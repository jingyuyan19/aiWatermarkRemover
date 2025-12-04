'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Film, Clock, CheckCircle, XCircle, Loader2,
    Download, History as HistoryIcon, ArrowLeft, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { useAuth } from '@clerk/nextjs';
import { useTranslations, useLocale } from 'next-intl';
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

export default function HistoryPage() {
    const t = useTranslations('History');
    const locale = useLocale();
    const { isLoaded, userId, getToken } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            try {
                const token = await getToken();

                const jobsRes = await fetch(`${API_URL}/api/jobs`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (jobsRes.ok) {
                    const jobsData = await jobsRes.json();
                    setJobs(jobsData);
                }
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

    const filteredJobs = filter === 'all'
        ? jobs
        : jobs.filter(j => j.status === filter);

    const stats = {
        total: jobs.length,
        completed: jobs.filter(j => j.status === 'completed').length,
        processing: jobs.filter(j => j.status === 'processing' || j.status === 'pending').length,
        failed: jobs.filter(j => j.status === 'failed').length,
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
                        className="mb-8"
                    >
                        <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {t('backToDashboard')}
                        </Link>
                        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                            <HistoryIcon className="w-10 h-10 text-primary" />
                            {t('title')}
                        </h1>
                        <p className="text-gray-400">{t('subtitle')}</p>
                    </motion.div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: t('stats.total'), value: stats.total, color: 'text-white' },
                            { label: t('stats.completed'), value: stats.completed, color: 'text-green-500' },
                            { label: t('stats.processing'), value: stats.processing, color: 'text-blue-500' },
                            { label: t('stats.failed'), value: stats.failed, color: 'text-red-500' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="bg-white/5 border-white/10">
                                    <CardContent className="p-4 text-center">
                                        <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                                        <p className="text-sm text-gray-400">{stat.label}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Filter */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {['all', 'completed', 'processing', 'pending', 'failed'].map((f) => (
                            <Button
                                key={f}
                                variant={filter === f ? 'glow' : 'ghost'}
                                size="sm"
                                onClick={() => setFilter(f)}
                                className="capitalize"
                            >
                                {f === 'all' ? t('filter.all') : t(`status.${f}`)}
                            </Button>
                        ))}
                    </div>

                    {/* Job Table */}
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
                                ) : filteredJobs.length === 0 ? (
                                    <div className="text-center py-20">
                                        <Film className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                                        <p className="text-gray-400 mb-4">{t('empty')}</p>
                                        <Link href={`/${locale}/dashboard`}>
                                            <Button variant="outline">{t('goToDashboard')}</Button>
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
                                                {filteredJobs.map((job) => (
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
                                                            {new Date(job.created_at).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2">
                                                                <Link href={`/${locale}/job/${job.id}`}>
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
