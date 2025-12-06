'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Film, Clock, CheckCircle, XCircle, Loader2,
    Download, History as HistoryIcon, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';
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

interface PaginatedResponse {
    jobs: Job[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export default function HistoryPage() {
    const t = useTranslations('History');
    const locale = useLocale();
    const { isLoaded, userId, getToken } = useAuth();
    const [data, setData] = useState<PaginatedResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchJobs = async (page: number = currentPage) => {
        if (!userId) return;
        try {
            setLoading(true);
            const token = await getToken();
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('page_size', pageSize.toString());
            if (filter !== 'all') params.set('status', filter);

            const res = await fetch(`${API_URL}/api/jobs?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setData(await res.json());
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            setCurrentPage(1);
            fetchJobs(1);
        }
    }, [userId, getToken, filter]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchJobs(page);
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

    const jobs = data?.jobs || [];

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
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                            <HistoryIcon className="w-8 md:w-10 h-8 md:h-10 text-primary" />
                            {t('title')}
                        </h1>
                        <p className="text-gray-400">{t('subtitle')}</p>
                    </motion.div>

                    {/* Filter & Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex gap-2 flex-wrap">
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
                        {data && data.total > 0 && (
                            <PaginationInfo
                                currentPage={currentPage}
                                pageSize={pageSize}
                                total={data.total}
                            />
                        )}
                    </div>

                    {/* Job Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
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
                                        <p className="text-gray-400 mb-4">{t('empty')}</p>
                                        <Link href={`/${locale}/dashboard`}>
                                            <Button variant="outline">{t('goToDashboard')}</Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[500px]">
                                                <thead className="bg-white/5 border-b border-white/10">
                                                    <tr>
                                                        <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-gray-400">{t('table.status')}</th>
                                                        <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-gray-400">{t('table.quality')}</th>
                                                        <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-gray-400">{t('table.date')}</th>
                                                        <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-gray-400">{t('table.actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {jobs.map((job) => (
                                                        <tr key={job.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-4 md:px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    {getStatusIcon(job.status)}
                                                                    <span className="capitalize text-sm">{getStatusText(job.status)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 md:px-6 py-4">
                                                                <span className={`px-2 py-1 rounded-full text-xs ${job.quality === 'e2fgvi_hq'
                                                                    ? 'bg-purple-500/20 text-purple-400'
                                                                    : 'bg-blue-500/20 text-blue-400'
                                                                    }`}>
                                                                    {job.quality === 'e2fgvi_hq' ? 'HQ' : 'Fast'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 md:px-6 py-4 text-gray-400 text-sm">
                                                                {new Date(job.created_at).toLocaleString()}
                                                            </td>
                                                            <td className="px-4 md:px-6 py-4">
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

                                        {/* Pagination */}
                                        {data && data.total_pages > 1 && (
                                            <div className="p-4 border-t border-white/10">
                                                <Pagination
                                                    currentPage={currentPage}
                                                    totalPages={data.total_pages}
                                                    onPageChange={handlePageChange}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
