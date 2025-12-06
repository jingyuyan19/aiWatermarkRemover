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
                <SignedOut>
                    <a
                        href={`/${locale}/pricing`}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        {locale === 'zh-CN' ? '价格' : 'Pricing'}
                    </a>
                </SignedOut>

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
                        <a
                            href={`/${locale}/pricing`}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors"
                        >
                            {locale === 'zh-CN' ? '购买额度' : 'Buy Credits'}
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
                        <SignedOut>
                            <a
                                href={`/${locale}/pricing`}
                                className="block px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {locale === 'zh-CN' ? '价格' : 'Pricing'}
                            </a>
                        </SignedOut>

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
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
    ];

    const currentLang = languages.find(l => l.code === locale) || languages[0];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${isOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
            >
                <span className="text-base">{currentLang.flag}</span>
                {!compact && <span>{currentLang.code === 'en' ? 'EN' : '中文'}</span>}
                <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 py-1 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-50 min-w-[140px]">
                        {languages.map((lang) => (
                            <a
                                key={lang.code}
                                href={`/${lang.code}`}
                                className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${lang.code === locale
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                onClick={() => setIsOpen(false)}
                            >
                                <span>{lang.flag}</span>
                                <span>{lang.label}</span>
                                {lang.code === locale && (
                                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </a>
                        ))}
                    </div>
                </>
            )}
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
