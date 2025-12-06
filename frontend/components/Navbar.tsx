'use client';

import NextImage from "next/image";
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export function Navbar({ locale }: { locale: string }) {
    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <a href={`/${locale}`} className="flex items-center gap-3 font-bold text-xl text-white hover:text-primary transition-colors">
                    <div className="relative w-10 h-10">
                        <NextImage
                            src="/logo.png"
                            alt="Vanishly Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    Vanishly
                </a>
                <div className="flex items-center gap-4">
                    {/* Global Links */}
                    <a
                        href={`/${locale}/pricing`}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        {locale === 'zh-CN' ? '价格' : 'Pricing'}
                    </a>

                    {/* Language Switcher */}
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
            </div>
        </nav>
    );
}

function LanguageSwitcher({ locale }: { locale: string }) {
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
    return (
        <a
            href={`/${locale}/admin`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
        >
            {locale === 'zh-CN' ? '管理' : 'Admin'}
        </a>
    );
}
