'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Building2, Sparkles, Loader2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RedeemCodeCard } from '@/components/ui/RedeemCodeCard';
import { SignInButton, useAuth } from '@clerk/nextjs';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';

export default function PricingPage() {
    const t = useTranslations('Pricing');
    const locale = useLocale();
    const { isSignedIn, getToken } = useAuth();
    const [loadingPack, setLoadingPack] = useState<string | null>(null);

    const plans = [
        {
            key: 'starter',
            icon: Zap,
            credits: 10,
            priceUSD: 4.99,
            priceCNY: 29,
            popular: false,
            color: 'from-blue-500 to-cyan-500',
        },
        {
            key: 'pro',
            icon: Crown,
            credits: 50,
            priceUSD: 19.99,
            priceCNY: 128,
            popular: true,
            color: 'from-primary to-accent',
        },
        {
            key: 'business',
            icon: Building2,
            credits: 200,
            priceUSD: 59.99,
            priceCNY: 398,
            popular: false,
            color: 'from-purple-500 to-pink-500',
        },
    ];

    const isChinese = locale === 'zh-CN';

    const handleCheckout = async (pack: string) => {
        setLoadingPack(pack);
        try {
            const token = await getToken();
            const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
            const res = await fetch(`${API_URL}/api/checkout/creem`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ pack })
            });

            if (res.ok) {
                const data = await res.json();
                // Redirect to Creem checkout
                window.location.href = data.checkout_url;
            } else {
                const error = await res.json();
                toast.error(error.detail || 'Failed to create checkout');
            }
        } catch (error) {
            toast.error('Payment service unavailable');
        } finally {
            setLoadingPack(null);
        }
    };

    return (
        <main className="min-h-screen pt-24 pb-20 px-4 bg-black text-white">
            <div className="container max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm text-primary font-medium">{t('badge')}</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        {t('title')}
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        {t('subtitle')}
                    </p>
                </motion.div>

                {/* Free Credits Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-12 p-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center"
                >
                    <p className="text-lg">
                        <span className="text-green-400 font-semibold">🎁 {t('freeCredits')}</span>
                    </p>
                </motion.div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8">
                    {plans.map((plan, index) => {
                        const Icon = plan.icon;
                        const displayPrice = isChinese ? `¥${plan.priceCNY}` : `$${plan.priceUSD}`;
                        const perCredit = isChinese
                            ? `¥${(plan.priceCNY / plan.credits).toFixed(1)}`
                            : `$${(plan.priceUSD / plan.credits).toFixed(2)}`;

                        return (
                            <motion.div
                                key={plan.key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 + 0.2 }}
                                className="relative"
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                                        <span className="bg-gradient-to-r from-primary to-accent text-white text-xs font-bold px-4 py-1 rounded-full">
                                            {t('mostPopular')}
                                        </span>
                                    </div>
                                )}
                                <Card className={`h-full ${plan.popular ? 'border-primary/50 shadow-lg shadow-primary/20' : 'border-white/10'} bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-colors`}>
                                    <CardContent className="p-8 h-full flex flex-col">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${plan.color}`}>
                                                    <Icon className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-white">{t(`plans.${plan.key}.name`)}</h3>
                                                    <p className="text-sm text-gray-500">{plan.credits} {t('credits')}</p>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <span className="text-5xl font-bold text-white">{displayPrice}</span>
                                                <span className="text-gray-500 ml-2">{t('oneTime')}</span>
                                            </div>

                                            <p className="text-sm text-gray-400 mb-6">
                                                {t('perCredit')}: <span className="text-white font-medium">{perCredit}</span>
                                            </p>

                                            <ul className="space-y-4 mb-8">
                                                <li className="flex items-center gap-3 text-gray-300">
                                                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    <span>{plan.credits} {t('videoCredits')}</span>
                                                </li>
                                                <li className="flex items-center gap-3 text-gray-300">
                                                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    <span>{t('features.noExpiry')}</span>
                                                </li>
                                                <li className="flex items-center gap-3 text-gray-300">
                                                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    <span>{t('features.allModes')}</span>
                                                </li>
                                                {plan.credits >= 50 && (
                                                    <li className="flex items-center gap-3 text-gray-300">
                                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                        <span>{t('features.priority')}</span>
                                                    </li>
                                                )}
                                            </ul>
                                        </div>

                                        {isSignedIn ? (
                                            <Button
                                                variant={plan.popular ? 'glow' : 'outline'}
                                                className="w-full"
                                                disabled={loadingPack !== null}
                                                onClick={() => handleCheckout(plan.key)}
                                            >
                                                {loadingPack === plan.key ? (
                                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('processing')}</>
                                                ) : (
                                                    t('buyNow')
                                                )}
                                            </Button>
                                        ) : (
                                            <SignInButton mode="modal">
                                                <Button variant={plan.popular ? 'glow' : 'outline'} className="w-full">
                                                    {t('getStarted')}
                                                </Button>
                                            </SignInButton>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Redeem Code Section - Only for logged-in users */}
                {isSignedIn && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-16 max-w-lg mx-auto"
                    >
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
                                <Gift className="w-6 h-6 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">{t('redeemTitle')}</h2>
                            <p className="text-gray-400 mt-2">{t('redeemSubtitle')}</p>
                        </div>

                        <RedeemCodeCard />
                    </motion.div>
                )}

                {/* Credit Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-16 text-center"
                >
                    <div className="inline-block p-6 rounded-2xl bg-white/5 border border-white/10">
                        <h3 className="text-lg font-semibold mb-4">{t('howCreditsWork')}</h3>
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <span className="text-primary font-bold">1</span> {t('creditInfo.fast')}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-primary font-bold">2</span> {t('creditInfo.hq')}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* FAQ Link */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center mt-12"
                >
                    <p className="text-gray-500">
                        {t('questions')}{' '}
                        <a href={`/${locale}#faq`} className="text-primary hover:underline">
                            {t('faqLink')}
                        </a>
                    </p>
                </motion.div>
            </div>
        </main>
    );
}
