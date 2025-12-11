'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { FileVideo, Clock, CheckCircle, XCircle, Loader, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@clerk/nextjs';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Job {
    id: string;
    user_id: string;
    user_email?: string;
    status: string;
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

const statusConfig: Record<string, { icon: any; color: string; labelKey: string }> = {
    pending: { icon: Clock, color: 'text-yellow-500', labelKey: 'pending' },
    processing: { icon: Loader, color: 'text-blue-500', labelKey: 'processing' },
    completed: { icon: CheckCircle, color: 'text-green-500', labelKey: 'completed' },
    failed: { icon: XCircle, color: 'text-red-500', labelKey: 'failed' },
};

export default function JobsPage() {
    const t = useTranslations('Admin.Jobs');
    const { getToken } = useAuth();
    const [data, setData] = useState<PaginatedResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [qualityFilter, setQualityFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const fetchJobs = async (page: number = currentPage) => {
        try {
            setLoading(true);
            const token = await getToken();
            const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('page_size', pageSize.toString());

            if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
            if (qualityFilter && qualityFilter !== 'all') params.set('quality', qualityFilter);
            if (searchQuery) params.set('search', searchQuery);

            const res = await fetch(`${API_URL}/api/admin/jobs?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setData(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs(1);
    }, [getToken, statusFilter, qualityFilter, searchQuery]);

    const handleSearch = () => {
        setSearchQuery(searchInput);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setStatusFilter('all');
        setQualityFilter('all');
        setSearchQuery('');
        setSearchInput('');
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchJobs(page);
    };

    const jobs = data?.jobs || [];

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">{t('title')}</h1>

            <Card className="bg-gray-900 border-white/10">
                <CardContent className="p-4 md:p-6">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder={t('filters.searchPlaceholder')}
                                    className="flex-1 px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <button
                                    onClick={handleSearch}
                                    className="px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    <Search className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="min-w-[140px]">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="all">{t('filters.allStatus')}</option>
                                <option value="pending">{t('status.pending')}</option>
                                <option value="processing">{t('status.processing')}</option>
                                <option value="completed">{t('status.completed')}</option>
                                <option value="failed">{t('status.failed')}</option>
                            </select>
                        </div>

                        {/* Quality Filter */}
                        <div className="min-w-[140px]">
                            <select
                                value={qualityFilter}
                                onChange={(e) => {
                                    setQualityFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="all">{t('filters.allModels')}</option>
                                <option value="lama">{t('models.lama')}</option>
                                <option value="E2FGVI_HQ">{t('models.e2fgvi_hq')}</option>
                            </select>
                        </div>

                        {/* Clear Filters */}
                        {(statusFilter !== 'all' || qualityFilter !== 'all' || searchQuery) && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                {t('filters.clear')}
                            </button>
                        )}
                    </div>

                    {/* Header with count */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">
                            {t('historyTitle')} {data && <span className="text-gray-500">({data.total})</span>}
                        </h2>
                        {data && data.total > 0 && (
                            <PaginationInfo
                                currentPage={currentPage}
                                pageSize={pageSize}
                                total={data.total}
                            />
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full" />
                            ))}
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileVideo className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>{t('noJobs')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto -mx-4 md:mx-0">
                                <table className="w-full min-w-[600px]">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">{t('table.id')}</th>
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">{t('table.user')}</th>
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">{t('table.status')}</th>
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">{t('table.quality')}</th>
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">{t('table.cost')}</th>
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">{t('table.created')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobs.map((job, index) => {
                                            const status = statusConfig[job.status] || statusConfig.pending;
                                            const StatusIcon = status.icon;

                                            return (
                                                <motion.tr
                                                    key={job.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.02 }}
                                                    className="border-b border-white/5 hover:bg-white/5"
                                                >
                                                    <td className="py-3 px-4">
                                                        <code
                                                            className="text-xs text-gray-400 font-mono cursor-pointer hover:text-white transition-colors"
                                                            title={t('table.idCopied')}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(job.id);
                                                                toast.success(t('table.idCopied'));
                                                            }}
                                                        >
                                                            {job.id.substring(0, 8)}...
                                                        </code>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-col">
                                                            {job.user_email ? (
                                                                <span className="text-sm text-gray-300" title={job.user_email}>
                                                                    {job.user_email}
                                                                </span>
                                                            ) : (
                                                                <span className="text-sm text-gray-500 italic">{t('table.noEmail')}</span>
                                                            )}
                                                            <code className="text-xs text-gray-600 font-mono" title={job.user_id}>
                                                                {job.user_id ? `${job.user_id.substring(0, 12)}...` : 'N/A'}
                                                            </code>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <StatusIcon className={`w-4 h-4 ${status.color} ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                                                            <span className={`text-sm ${status.color}`}>{t(`status.${status.labelKey}`)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full uppercase">
                                                            {job.quality || 'lama'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-white text-sm">
                                                        {t('table.costValue', { cost: job.cost ?? 1 })}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-400 text-sm">
                                                        {new Date(job.created_at).toLocaleString()}
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {data && data.total_pages > 1 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={data.total_pages}
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
