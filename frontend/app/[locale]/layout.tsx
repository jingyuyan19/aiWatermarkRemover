
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/ui/Footer";
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { Navbar } from "@/components/Navbar";
import "../globals.css";

// Force dynamic rendering - Clerk requires runtime env vars
export const dynamic = 'force-dynamic';

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

type Props = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const messages = await getMessages({ locale });
    const metadata = messages.Metadata as { title: string; description: string };

    return {
        title: metadata?.title || "Vanishly",
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
                        <div className="pt-16 min-h-screen">
                            {children}
                        </div>
                        <Footer />
                        <Toaster />
                    </NextIntlClientProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}

