'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Sparkles, Zap, Clock, Shield, Upload, Download,
    Cpu, Cloud, Check, ChevronDown, ChevronUp,
    ArrowRight, Play, Layers, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { useTranslations, useLocale } from 'next-intl';

export default function Home() {
    const t = useTranslations();
    const locale = useLocale();
    const { isLoaded, userId } = useAuth();
    const [openFaq, setOpenFaq] = useState<string | null>(null);
    const [activeVideo, setActiveVideo] = useState(0);
    const router = useRouter();

    // Auto-rotate videos every 8 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveVideo((prev) => (prev + 1) % 3);
        }, 8000);
        return () => clearInterval(timer);
    }, []);

    // Redirect logged-in users to dashboard
    useEffect(() => {
        if (isLoaded && userId) {
            router.push(`/${locale}/dashboard`);
        }
    }, [isLoaded, userId, locale, router]);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    if (!isLoaded || userId) return null; // Hide while redirecting

    const features = [
        { key: 'ai', icon: Wand2, colSpan: 'md:col-span-2' },
        { key: 'fast', icon: Zap, colSpan: 'md:col-span-1' },
        { key: 'privacy', icon: Shield, colSpan: 'md:col-span-1' },
        { key: 'formats', icon: Layers, colSpan: 'md:col-span-2' },
        { key: 'noWatermark', icon: Check, colSpan: 'md:col-span-1' },
        { key: 'cloud', icon: Cloud, colSpan: 'md:col-span-1' },
    ];

    const steps = [
        { key: 'upload', icon: Upload, color: 'from-blue-500 to-cyan-500' },
        { key: 'process', icon: Cpu, color: 'from-purple-500 to-pink-500' },
        { key: 'download', icon: Download, color: 'from-green-500 to-emerald-500' },
    ];

    const faqKeys = ['quality', 'types', 'time', 'privacy', 'legal'];
    const aiPlatforms = [
        { name: 'Sora', subtitle: 'by OpenAI' },
        { name: 'Google Veo', subtitle: 'by Google' },
        { name: 'Runway', subtitle: 'Gen-3' },
        { name: 'Pika', subtitle: 'Labs' },
        { name: 'Kling', subtitle: 'by Kuaishou' },
        { name: 'Hailuo', subtitle: 'MiniMax' },
        { name: 'Luma', subtitle: 'Dream Machine' },
    ];

    return (
        <main className="min-h-screen relative overflow-hidden bg-black text-white selection:bg-primary/30">
            <AuroraBackground />

            {/* ===== HERO SECTION ===== */}
            <section className="pt-32 pb-20 px-4 relative z-10">
                <div className="container max-w-6xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-12"
                    >
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary mb-8 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-default">
                            <Sparkles className="w-3 h-3" />
                            <span>{t('HomePage.badge')}</span>
                        </span>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50">
                            {t('HomePage.title')} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-accent">
                                {t('HomePage.titleHighlight')}
                            </span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
                            {t('HomePage.subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
                            <SignInButton mode="modal">
                                <Button size="lg" variant="glow" className="text-lg px-8 h-12 rounded-full">
                                    {t('HomePage.cta')}
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </SignInButton>
                            <Button size="lg" variant="ghost" onClick={() => scrollToSection('how-it-works')} className="text-lg px-8 h-12 rounded-full hover:bg-white/5">
                                <Play className="mr-2 w-5 h-5" />
                                {t('HomePage.ctaSecondary')}
                            </Button>
                        </div>
                    </motion.div>

                    {/* App Preview Mockup - Video Carousel */}
                    <motion.div
                        initial={{ opacity: 0, y: 40, rotateX: 20 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{ duration: 1, delay: 0.2, type: "spring" }}
                        className="relative mx-auto max-w-5xl perspective-1000"
                    >
                        <div className="relative rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl shadow-primary/20 overflow-hidden transform-gpu">
                            <div className="absolute top-0 left-0 right-0 h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2 z-30">
                                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                                <div className="w-3 h-3 rounded-full bg-green-500/20" />
                                <div className="ml-4 text-xs text-gray-500 font-mono">
                                    {['sample_vid.mp4', 'sample_2.mp4', 'sample_3.mp4'][activeVideo]}
                                </div>
                                {/* Video Indicators */}
                                <div className="ml-auto flex gap-2">
                                    {[0, 1, 2].map((idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveVideo(idx)}
                                            className={`w-2 h-2 rounded-full transition-all duration-300 ${activeVideo === idx
                                                ? 'bg-primary w-6'
                                                : 'bg-white/30 hover:bg-white/50'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="pt-10 bg-black relative aspect-video">
                                {/* Video Carousel with Crossfade */}
                                {['/sample_vid.mp4', '/sample_2.mp4', '/sample_3.mp4'].map((videoSrc, idx) => (
                                    <video
                                        key={videoSrc}
                                        src={videoSrc}
                                        className={`w-full h-full object-contain transition-opacity duration-1000 ${idx === 0 ? '' : 'absolute inset-0 pt-10'
                                            } ${activeVideo === idx ? 'opacity-100' : 'opacity-0'}`}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="absolute -inset-4 bg-gradient-to-r from-primary to-accent opacity-20 blur-3xl -z-10 rounded-[3rem]" />
                    </motion.div>
                </div>
            </section>

            {/* ===== SUPPORTED PLATFORMS ===== */}
            <section className="py-16 border-y border-white/5 bg-gradient-to-b from-black to-gray-950">
                <div className="container max-w-6xl mx-auto text-center px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <p className="text-sm font-medium text-primary mb-3 uppercase tracking-wider">✨ AI Video Support</p>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Works with All Major AI Video Platforms</h3>
                        <p className="text-gray-400 mb-10 max-w-2xl mx-auto">Remove watermarks from videos generated by the leading AI platforms</p>
                    </motion.div>
                    <div className="flex flex-wrap justify-center gap-4">
                        {aiPlatforms.map((platform, idx) => (
                            <motion.div
                                key={platform.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.05 }}
                                className="group relative p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] md:w-[140px]"
                            >
                                <div className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                                    {platform.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {platform.subtitle}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== BENTO GRID FEATURES ===== */}
            <section id="features" className="py-32 px-4 relative z-10">
                <div className="container max-w-6xl mx-auto">
                    <motion.div
                        className="text-center mb-20"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">{t('Features.title')}</h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">{t('Features.subtitle')}</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {features.map(({ key, icon: Icon, colSpan }, index) => (
                            <motion.div
                                key={key}
                                className={`${colSpan} group`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="h-full bg-white/[0.03] border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/[0.06] overflow-hidden relative">
                                    <CardContent className="p-8 h-full flex flex-col">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:border-primary/50 group-hover:bg-primary/10">
                                            <Icon className="w-6 h-6 text-gray-300 group-hover:text-primary transition-colors" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-3">
                                            {t(`Features.items.${key}.title`)}
                                        </h3>
                                        <p className="text-gray-400 leading-relaxed">
                                            {t(`Features.items.${key}.description`)}
                                        </p>
                                        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent blur-3xl rounded-full group-hover:opacity-100 opacity-0 transition-opacity duration-500" />
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>



            {/* ===== HOW IT WORKS SECTION ===== */}
            <section id="how-it-works" className="py-32 px-4 relative z-10">
                <div className="container max-w-6xl mx-auto">
                    <motion.div
                        className="text-center mb-20"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('HowItWorks.title')}</h2>
                        <p className="text-xl text-gray-400">{t('HowItWorks.subtitle')}</p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-12 relative">
                        <div className="absolute top-12 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent hidden md:block" />

                        {steps.map(({ key, icon: Icon, color }, index) => (
                            <motion.div
                                key={key}
                                className="relative"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                            >
                                <div className="text-center relative z-10">
                                    <div className={`w-24 h-24 mx-auto rounded-2xl bg-black border border-white/10 flex items-center justify-center mb-8 shadow-2xl relative group`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10 group-hover:opacity-20 transition-opacity rounded-2xl`} />
                                        <Icon className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-3">
                                        {t(`HowItWorks.steps.${key}.title`)}
                                    </h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        {t(`HowItWorks.steps.${key}.description`)}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>



            {/* ===== FAQ SECTION ===== */}
            <section id="faq" className="py-32 px-4 relative z-10 bg-white/[0.02]">
                <div className="container max-w-3xl mx-auto">
                    <motion.div
                        className="text-center mb-20"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('FAQ.title')}</h2>
                    </motion.div>

                    <div className="space-y-4">
                        {faqKeys.map((key) => (
                            <motion.div
                                key={key}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === key ? null : key)}
                                    className="w-full text-left p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-medium text-white group-hover:text-primary transition-colors">{t(`FAQ.items.${key}.question`)}</span>
                                        {openFaq === key ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    {openFaq === key && (
                                        <motion.p
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-4 text-gray-400 leading-relaxed"
                                        >
                                            {t(`FAQ.items.${key}.answer`)}
                                        </motion.p>
                                    )}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
