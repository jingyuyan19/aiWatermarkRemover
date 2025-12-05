'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { FileVideo, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface Job {
    id: string;
    user_id: string;
    status: string;
    quality: string;
    cost: number;
    created_at: string;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
    processing: { icon: Loader, color: 'text-blue-500', label: 'Processing' },
    completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
};

export default function JobsPage() {
    const { getToken } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchJobs() {
            try {
                const token = await getToken();
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/jobs?limit=100`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    setJobs(await res.json());
                }
            } catch (error) {
                console.error('Failed to fetch jobs:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchJobs();
    }, [getToken]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">All Jobs</h1>

            <Card className="bg-gray-900 border-white/10">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">Processing History ({jobs.length})</h2>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileVideo className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No jobs yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
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
                                                <td className="py-4 px-4">
                                                    <code className="text-xs text-gray-400 font-mono">
                                                        {job.id.substring(0, 8)}...
                                                    </code>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <code className="text-xs text-gray-400 font-mono">
                                                        {job.user_id ? `${job.user_id.substring(0, 12)}...` : 'N/A'}
                                                    </code>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <StatusIcon className={`w-4 h-4 ${status.color} ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                                                        <span className={status.color}>{status.label}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full uppercase">
                                                        {job.quality || 'lama'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-white">
                                                    {job.cost ?? 1} credit{(job.cost ?? 1) !== 1 ? 's' : ''}
                                                </td>
                                                <td className="py-4 px-4 text-gray-400 text-sm">
                                                    {new Date(job.created_at).toLocaleString()}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
