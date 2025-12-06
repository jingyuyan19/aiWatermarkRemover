'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useLocale } from 'next-intl';
import {
    LayoutDashboard,
    Ticket,
    Users,
    FileVideo,
    Menu,
    X,
    LogOut,
    ChevronRight
} from 'lucide-react';

const sidebarItems = [
    { key: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { key: 'Codes', icon: Ticket, href: '/admin/codes' },
    { key: 'Users', icon: Users, href: '/admin/users' },
    { key: 'Jobs', icon: FileVideo, href: '/admin/jobs' },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const pathname = usePathname();
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

    // Close sidebar when route changes
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [sidebarOpen]);

    if (!isLoaded || isAdmin === null) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    const isActiveRoute = (href: string) => {
        const fullPath = `/${locale}${href}`;
        if (href === '/admin') {
            return pathname === fullPath;
        }
        return pathname?.startsWith(fullPath);
    };

    return (
        <div className="min-h-screen bg-gray-950 pt-16">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/70 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-16 bottom-0 left-0 z-50
                    w-64 bg-gray-900/95 backdrop-blur-xl
                    border-r border-white/10
                    transform transition-transform duration-300 ease-out
                    lg:translate-x-0
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white">Admin Panel</h2>
                            <p className="text-xs text-gray-500">Manage your platform</p>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Close sidebar"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-3 space-y-1">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isActiveRoute(item.href);
                        return (
                            <a
                                key={item.key}
                                href={`/${locale}${item.href}`}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-lg
                                    transition-all duration-200
                                    ${isActive
                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                                <span className="font-medium">{item.key}</span>
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                            </a>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-gray-900">
                    <a
                        href={`/${locale}/dashboard`}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Exit Admin</span>
                    </a>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:ml-64 min-h-[calc(100vh-4rem)]">
                {/* Mobile Header */}
                <header className="lg:hidden sticky top-16 z-30 bg-gray-900/95 backdrop-blur-xl border-b border-white/10">
                    <div className="flex items-center gap-4 px-4 py-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Open sidebar"
                        >
                            <Menu className="w-5 h-5 text-white" />
                        </button>
                        <h1 className="text-white font-semibold">Admin Panel</h1>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
