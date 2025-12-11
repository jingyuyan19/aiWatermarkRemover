'use client';

import { useState } from 'react';
import NextImage from "next/image";
import { Button } from '@/components/ui/button';
import { BubblyButton } from '@/components/ui/BubblyButton';
import { useAuth, UserButton, SignInButton, SignUpButton, SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcherNew } from './LanguageSwitcherNew';

export function Navbar({ locale }: { locale: string }) {
    const t = useTranslations('Navbar');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <a href={`/${locale}`} className="flex items-center gap-3 font-bold text-xl text-white hover:text-primary transition-colors">
                    <div className="relative w-12 h-12">
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
                            {t('pricing')}
                        </a>
                    </SignedOut>

                    <LanguageSwitcherNew locale={locale} />

                    <SignedOut>
                        <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                            <BubblyButton rainbow className="text-sm !px-5 !py-2 font-bold contrast-fix">
                                <span className="mr-2">🎁</span>
                                {t('freeCredits')}
                            </BubblyButton>
                        </SignUpButton>
                        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                            <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                                {t('signIn')}
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <a
                            href={`/${locale}/dashboard`}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            {t('dashboard')}
                        </a>
                        <a
                            href={`/${locale}/history`}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            {t('history')}
                        </a>
                        <a
                            href={`/${locale}/pricing`}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors"
                        >
                            {t('buyCredits')}
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
                {/* Mobile Menu Button & CTA */}
                <div className="flex md:hidden items-center gap-3">
                    <SignedOut>
                        <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-xs font-bold text-white shadow-lg hover:brightness-110 transition-all">
                                <span>🎁</span>
                                <span>{t('freeCredits')}</span>
                            </button>
                        </SignUpButton>
                    </SignedOut>

                    <LanguageSwitcherNew locale={locale} />
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
                                {t('pricing')}
                            </a>
                        </SignedOut>



                        <SignedOut>
                            <SignedOut>
                                <SignInButton mode="modal" forceRedirectUrl={`/${locale}/dashboard`}>
                                    <button
                                        className="w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 transition-colors font-medium border-t border-white/5"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {t('signIn')}
                                    </button>
                                </SignInButton>
                            </SignedOut>
                        </SignedOut>

                        <SignedIn>
                            <a
                                href={`/${locale}/dashboard`}
                                className="block px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {t('dashboard')}
                            </a>
                            <a
                                href={`/${locale}/history`}
                                className="block px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {t('history')}
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
                                <span className="text-gray-400 text-sm">{t('account')}</span>
                            </div>
                        </SignedIn>
                    </div>
                </div>
            )}
        </nav>
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
