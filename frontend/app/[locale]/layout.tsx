
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/ui/Footer";
import { ClerkProvider } from '@clerk/nextjs';
import { zhCN } from '@clerk/localizations';
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
        title: {
            template: '%s | Vanishly',
            default: metadata?.title || "Vanishly - AI Video Watermark Remover"
        },
        description: metadata?.description || "Remove watermarks, subtitles, and logos from videos instantly using advanced AI. Supports Sora, Runway, Pika, and more.",
        keywords: ["ai watermark remover", "video eraser", "remove logo from video", "cleanup video", "inpainting"],
        openGraph: {
            title: "Vanishly - AI Video Watermark Remover",
            description: "Remove watermarks, subtitles, and logos from videos instantly using advanced AI.",
            url: 'https://vanishly.io',
            siteName: 'Vanishly',
            images: [
                {
                    url: 'https://vanishly.io/og-image.jpg', // You need to upload this
                    width: 1200,
                    height: 630,
                    alt: 'Vanishly Dashboard Preview',
                },
            ],
            locale: locale,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: "Vanishly - AI Video Watermark Remover",
            description: "Remove watermarks from any video with AI.",
            creator: "@vanishly_app", // Replace if you have one
        },
        metadataBase: new URL('https://vanishly.io'),
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

    // Clerk localization map
    // We map our next-intl locale to Clerk's localization object
    const clerkLocaleMap: Record<string, any> = {
        'zh-CN': zhCN,
        'en': undefined // English is default
    };

    return (
        <ClerkProvider
            key={locale}
            localization={clerkLocaleMap[locale]}
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
                    socialButtonsBlockButtonText: 'text-white',
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
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "SoftwareApplication",
                                "name": "Vanishly",
                                "applicationCategory": "MultimediaApplication",
                                "operatingSystem": "Web",
                                "offers": {
                                    "@type": "Offer",
                                    "price": "4.99",
                                    "priceCurrency": "USD"
                                },
                                "description": "Remove watermarks from videos instantly using AI.",
                                "aggregateRating": {
                                    "@type": "AggregateRating",
                                    "ratingValue": "4.8",
                                    "ratingCount": "124"
                                }
                            })
                        }}
                    />
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

