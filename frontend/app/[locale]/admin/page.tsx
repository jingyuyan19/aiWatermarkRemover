'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Users, FileVideo, Ticket, CheckCircle } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface Stats {
    total_users: number;
    total_jobs: number;
    completed_jobs: number;
    pending_codes: number;
    redeemed_codes: number;
}

export default function AdminDashboard() {
    const { getToken } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const token = await getToken();
                const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
                const res = await fetch(`${API_URL}/api/admin/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    setStats(await res.json());
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [getToken]);

    const statCards = [
        { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users, color: 'from-blue-500 to-cyan-500' },
        { label: 'Total Jobs', value: stats?.total_jobs ?? 0, icon: FileVideo, color: 'from-purple-500 to-pink-500' },
        { label: 'Completed Jobs', value: stats?.completed_jobs ?? 0, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
        { label: 'Pending Codes', value: stats?.pending_codes ?? 0, icon: Ticket, color: 'from-orange-500 to-yellow-500' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="bg-gray-900 border-white/10">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                                <Icon className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                                        <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Quick Stats */}
            {stats && (
                <div className="mt-8 p-6 bg-gray-900 rounded-xl border border-white/10">
                    <h2 className="text-xl font-semibold text-white mb-4">Code Redemption</h2>
                    <div className="flex items-center gap-8">
                        <div>
                            <p className="text-2xl font-bold text-green-400">{stats.redeemed_codes}</p>
                            <p className="text-sm text-gray-500">Redeemed</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange-400">{stats.pending_codes}</p>
                            <p className="text-sm text-gray-500">Pending</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.pending_codes + stats.redeemed_codes}</p>
                            <p className="text-sm text-gray-500">Total Generated</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
