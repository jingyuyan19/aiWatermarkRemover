'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Minus, Search, Filter } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

interface User {
    id: string;
    email: string;
    credits: number;
    is_admin: number;
    created_at: string;
    total_jobs: number;
    completed_jobs: number;
}

export default function UsersPage() {
    const { getToken } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [adjustingUser, setAdjustingUser] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const params = new URLSearchParams();
            if (searchQuery) params.set('search', searchQuery);
            if (roleFilter) params.set('role', roleFilter);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [getToken, roleFilter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const adjustCredits = async (userId: string, currentCredits: number, delta: number) => {
        const newCredits = Math.max(0, currentCredits + delta);
        setAdjustingUser(userId);

        try {
            const token = await getToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/credits`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ credits: newCredits })
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, credits: newCredits } : u));
                toast.success(`Credits updated to ${newCredits}`);
            } else {
                toast.error('Failed to update credits');
            }
        } catch (error) {
            toast.error('Failed to update credits');
        } finally {
            setAdjustingUser(null);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">User Management</h1>

            <Card className="bg-gray-900 border-white/10">
                <CardContent className="p-6">
                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">All Roles</option>
                            <option value="admin">Admins</option>
                            <option value="user">Users</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">All Users ({users.length})</h2>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No users found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Email</th>
                                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Credits</th>
                                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Role</th>
                                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Jobs</th>
                                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Joined</th>
                                        <th className="text-right py-3 px-4 text-sm text-gray-400 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user, index) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="border-b border-white/5 hover:bg-white/5"
                                        >
                                            <td className="py-4 px-4">
                                                <span className="text-white">{user.email || 'No email'}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-primary font-semibold">{user.credits}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                {user.is_admin ? (
                                                    <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">Admin</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">User</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-green-400">{user.completed_jobs}</span>
                                                <span className="text-gray-500">/{user.total_jobs}</span>
                                            </td>
                                            <td className="py-4 px-4 text-gray-400 text-sm">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => adjustCredits(user.id, user.credits, -10)}
                                                        disabled={adjustingUser === user.id || user.credits < 10}
                                                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        <Minus className="w-4 h-4 text-red-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => adjustCredits(user.id, user.credits, 10)}
                                                        disabled={adjustingUser === user.id}
                                                        className="p-2 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        <Plus className="w-4 h-4 text-green-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
