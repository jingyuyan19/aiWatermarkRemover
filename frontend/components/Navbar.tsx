'use client';

import { useState } from 'react';
import NextImage from "next/image";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';

export function Navbar({ locale }: { locale: string }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <a href={`/${locale}`} className="flex items-center gap-3 font-bold text-xl text-white hover:text-primary transition-colors">
                    <div className="relative w-10 h-10">
                        <NextImage
                            src="/logo.png"
                            alt="Vanishly Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="hidden sm:inline">Vanishly</span>
                </a>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-4">
                    <a
                        href={`/${locale}/pricing`}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        {locale === 'zh-CN' ? '价格' : 'Pricing'}
                    </a>

                    <LanguageSwitcher locale={locale} />

                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors text-sm font-medium">
                                {locale === 'zh-CN' ? '登录' : 'Sign In'}
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <a
                            href={`/${locale}/dashboard`}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            {locale === 'zh-CN' ? '控制台' : 'Dashboard'}
                        </a>
                        <a
                            href={`/${locale}/history`}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            {locale === 'zh-CN' ? '历史' : 'History'}
                        </a>

                        <AdminLink locale={locale} />
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-10 h-10",
                                    userButtonPopoverCard: "bg-[#1a1a1a] border border-white/10",
                                    userButtonPopoverActionButton: "text-white hover:bg-white/10",
                                    userButtonPopoverActionButtonText: "text-white",
                                    userButtonPopoverActionButtonIcon: "text-gray-400",
                                    userButtonPopoverFooter: "hidden",
                                }
                            }}
                        />
                    </SignedIn>
                </div>

                {/* Mobile Menu Button */}
                <div className="flex md:hidden items-center gap-3">
                    <LanguageSwitcher locale={locale} compact />
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Drawer */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10">
                    <div className="container mx-auto px-4 py-4 space-y-3">
                        <a
                            href={`/${locale}/pricing`}
                            className="block px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {locale === 'zh-CN' ? '价格' : 'Pricing'}
                        </a>

                        <SignedOut>
                            <SignInButton mode="modal">
                                <button
                                    className="w-full px-4 py-3 rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {locale === 'zh-CN' ? '登录' : 'Sign In'}
                                </button>
                            </SignInButton>
                        </SignedOut>

                        <SignedIn>
                            <a
                                href={`/${locale}/dashboard`}
                                className="block px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {locale === 'zh-CN' ? '控制台' : 'Dashboard'}
                            </a>
                            <a
                                href={`/${locale}/history`}
                                className="block px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {locale === 'zh-CN' ? '历史' : 'History'}
                            </a>
                            <MobileAdminLink locale={locale} onClick={() => setMobileMenuOpen(false)} />
                            <div className="px-4 py-3 flex items-center gap-3">
                                <UserButton
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-10 h-10",
                                            userButtonPopoverCard: "bg-[#1a1a1a] border border-white/10",
                                            userButtonPopoverActionButton: "text-white hover:bg-white/10",
                                            userButtonPopoverActionButtonText: "text-white",
                                            userButtonPopoverActionButtonIcon: "text-gray-400",
                                            userButtonPopoverFooter: "hidden",
                                        }
                                    }}
                                />
                                <span className="text-gray-400 text-sm">{locale === 'zh-CN' ? '账户设置' : 'Account'}</span>
                            </div>
                        </SignedIn>
                    </div>
                </div>
            )}
        </nav>
    );
}

function LanguageSwitcher({ locale, compact }: { locale: string; compact?: boolean }) {
    if (compact) {
        return (
            <a
                href={locale === 'en' ? '/zh-CN' : '/en'}
                className="px-2 py-1 rounded-md text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
                {locale === 'en' ? '中文' : 'EN'}
            </a>
        );
    }

    return (
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <a
                href="/en"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${locale === 'en'
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white'
                    }`}
            >
                EN
            </a>
            <a
                href="/zh-CN"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${locale === 'zh-CN'
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white'
                    }`}
            >
                中文
            </a>
        </div>
    );
}

function AdminLink({ locale }: { locale: string }) {
    const { user } = useUser();

    if (!user || user.publicMetadata?.role !== 'admin') {
        return null;
    }

    return (
        <a
            href={`/${locale}/admin`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
        >
            {locale === 'zh-CN' ? '管理' : 'Admin'}
        </a>
    );
}

function MobileAdminLink({ locale, onClick }: { locale: string; onClick: () => void }) {
    const { user } = useUser();

    if (!user || user.publicMetadata?.role !== 'admin') {
        return null;
    }

    return (
        <a
            href={`/${locale}/admin`}
            className="block px-4 py-3 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
            onClick={onClick}
        >
            {locale === 'zh-CN' ? '管理' : 'Admin'}
        </a>
    );
}
