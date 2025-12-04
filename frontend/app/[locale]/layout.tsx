import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import "../globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

type Props = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const messages = await getMessages({ locale });
    const metadata = messages.Metadata as { title: string; description: string };

    return {
        title: metadata?.title || "AI Watermark Remover",
        description: metadata?.description || "Remove watermarks from your videos instantly.",
    };
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    // Validate locale
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    setRequestLocale(locale);
    const messages = await getMessages();

    return (
        <ClerkProvider
            appearance={{
                variables: {
                    colorPrimary: '#3B82F6',
                    colorBackground: '#0a0a0a',
                    colorText: '#ededed',
                    colorInputBackground: '#1a1a1a',
                    colorInputText: '#ededed',
                },
                elements: {
                    formButtonPrimary: 'bg-primary hover:bg-blue-600',
                    card: 'bg-[#0a0a0a] border border-white/10',
                    headerTitle: 'text-white',
                    headerSubtitle: 'text-gray-400',
                    socialButtonsBlockButton: 'bg-white/5 border-white/10 text-white hover:bg-white/10',
                    formFieldLabel: 'text-gray-300',
                    formFieldInput: 'bg-[#1a1a1a] border-white/10 text-white',
                    footerActionLink: 'text-primary hover:text-blue-400',
                }
            }}
        >
            <html lang={locale} className="dark" suppressHydrationWarning>
                <body
                    className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                    suppressHydrationWarning
                >
                    <NextIntlClientProvider messages={messages}>
                        <Navbar locale={locale} />
                        <div className="pt-16">
                            {children}
                        </div>
                        <Toaster />
                    </NextIntlClientProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}

function Navbar({ locale }: { locale: string }) {
    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <a href={`/${locale}`} className="font-bold text-xl text-white hover:text-primary transition-colors">
                    {locale === 'zh-CN' ? 'AI去水印工具' : 'AI Watermark Remover'}
                </a>
                <div className="flex items-center gap-4">
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
