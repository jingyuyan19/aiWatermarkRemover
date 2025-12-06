'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { FileVideo, Clock, CheckCircle, XCircle, Loader, Search } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';

interface Job {
    id: string;
    user_id: string;
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

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
    processing: { icon: Loader, color: 'text-blue-500', label: 'Processing' },
    completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
};

export default function JobsPage() {
    const { getToken } = useAuth();
    const [data, setData] = useState<PaginatedResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
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
            if (statusFilter) params.set('status', statusFilter);

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
        setCurrentPage(1);
        fetchJobs(1);
    }, [getToken, statusFilter]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchJobs(page);
    };

    const jobs = data?.jobs || [];

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">All Jobs</h1>

            <Card className="bg-gray-900 border-white/10">
                <CardContent className="p-4 md:p-6">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    {/* Header with count */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">
                            Processing History {data && <span className="text-gray-500">({data.total})</span>}
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
                                <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileVideo className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No jobs found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto -mx-4 md:mx-0">
                                <table className="w-full min-w-[600px]">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Job ID</th>
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">User ID</th>
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Status</th>
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Quality</th>
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Cost</th>
                                            <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Created</th>
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
                                                        <code className="text-xs text-gray-400 font-mono">
                                                            {job.id.substring(0, 8)}...
                                                        </code>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <code className="text-xs text-gray-400 font-mono">
                                                            {job.user_id ? `${job.user_id.substring(0, 12)}...` : 'N/A'}
                                                        </code>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <StatusIcon className={`w-4 h-4 ${status.color} ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                                                            <span className={`text-sm ${status.color}`}>{status.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full uppercase">
                                                            {job.quality || 'lama'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-white text-sm">
                                                        {job.cost ?? 1} credit{(job.cost ?? 1) !== 1 ? 's' : ''}
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
