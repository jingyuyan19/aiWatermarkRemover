
import type { Metadata } from "next";
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import AppLayout from "@/components/AppLayout";
import "../globals.css";

// Force dynamic rendering - Clerk requires runtime env vars
export const dynamic = 'force-dynamic';

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
        <AppLayout locale={locale} messages={messages}>
            {children}
        </AppLayout>
    );
}

