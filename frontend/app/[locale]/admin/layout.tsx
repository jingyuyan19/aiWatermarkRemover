'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import {
    LayoutDashboard,
    Ticket,
    Users,
    FileVideo,
    Menu,
    X,
    LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sidebarItems = [
    { key: 'dashboard', icon: LayoutDashboard, href: '/admin' },
    { key: 'codes', icon: Ticket, href: '/admin/codes' },
    { key: 'users', icon: Users, href: '/admin/users' },
    { key: 'jobs', icon: FileVideo, href: '/admin/jobs' },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const locale = useLocale();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push(`/${locale}`);
            return;
        }

        if (user) {
            const adminRole = user.publicMetadata?.role === 'admin';
            setIsAdmin(adminRole);

            if (!adminRole) {
                router.push(`/${locale}/dashboard`);
            }
        }
    }, [isLoaded, isSignedIn, user, router, locale]);

    if (!isLoaded || isAdmin === null) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Mobile Header Bar */}
            <div className="lg:hidden fixed top-16 left-0 right-0 z-30 bg-gray-900 border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Toggle menu"
                    >
                        {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
                    </button>
                    <h1 className="text-white font-semibold">Admin Panel</h1>
                </div>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-30 pt-16"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40
                w-64 bg-gray-900 border-r border-white/10
                transform transition-transform duration-200 ease-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                pt-16 lg:pt-20
            `}>
                <div className="p-4 border-b border-white/10 lg:border-b-0">
                    <h2 className="text-lg font-bold text-white mb-1">Admin Panel</h2>
                    <p className="text-sm text-gray-500">Manage your platform</p>
                </div>

                <nav className="mt-4 px-2">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <a
                                key={item.key}
                                href={`/${locale}${item.href}`}
                                onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <Icon className="w-5 h-5" />
                                <span className="capitalize">{item.key}</span>
                            </a>
                        );
                    })}
                </nav>

                <div className="absolute bottom-4 left-4 right-4">
                    <a href={`/${locale}/dashboard`}>
                        <Button variant="outline" className="w-full">
                            <LogOut className="w-4 h-4 mr-2" />
                            Exit Admin
                        </Button>
                    </a>
                </div>
            </aside>

            {/* Main content */}
            <main className="lg:ml-64 p-4 lg:p-8 pt-32 lg:pt-24">
                {children}
            </main>
        </div>
    );
}
