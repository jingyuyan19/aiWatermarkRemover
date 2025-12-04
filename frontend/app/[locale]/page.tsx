'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Sparkles, Zap, Clock, Lock, Shield, Upload, Download,
    Cpu, Cloud, Film, Check, ChevronDown, ChevronUp,
    ArrowRight, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/FileUpload';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { toast } from 'sonner';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Animation variants
const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
};

const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } }
};

export default function Home() {
    const t = useTranslations();
    const { isLoaded, userId, getToken } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [quality, setQuality] = useState<'lama' | 'e2fgvi_hq'>('lama');
    const [uploading, setUploading] = useState(false);
    const [openFaq, setOpenFaq] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !userId) return;

        setUploading(true);
        try {
            const token = await getToken();

            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!uploadResponse.ok) throw new Error('Upload failed');
            const { key } = await uploadResponse.json();

            const jobResponse = await fetch(`${API_URL}/api/jobs?input_key=${encodeURIComponent(key)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ quality }),
            });

            if (!jobResponse.ok) throw new Error('Job creation failed');
            const job = await jobResponse.json();

            toast.success('Video uploaded successfully!');
            router.push(`/job/${job.id}`);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to upload video. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    if (!isLoaded) return null;

    const features = [
        { key: 'ai', icon: Cpu },
        { key: 'fast', icon: Zap },
        { key: 'privacy', icon: Shield },
        { key: 'formats', icon: Film },
        { key: 'noWatermark', icon: Check },
        { key: 'cloud', icon: Cloud },
    ];

    const steps = [
        { key: 'upload', icon: Upload, color: 'from-blue-500 to-cyan-500' },
        { key: 'process', icon: Cpu, color: 'from-purple-500 to-pink-500' },
        { key: 'download', icon: Download, color: 'from-green-500 to-emerald-500' },
    ];

    const faqKeys = ['quality', 'types', 'time', 'privacy', 'legal'];

    return (
        <main className="min-h-screen relative overflow-hidden">
            <ParticleBackground />

            {/* ===== HERO SECTION ===== */}
            <section className="min-h-screen flex flex-col items-center justify-center py-20 px-4 relative z-10">
                <div className="container max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <motion.div {...fadeInUp}>
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-8 backdrop-blur-sm">
                                <Sparkles className="w-4 h-4 text-accent" />
                                <span>{t('HomePage.badge')}</span>
                            </span>
                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight">
                                {t('HomePage.title')} <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-accent">
                                    {t('HomePage.titleHighlight')}
                                </span>
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-10">
                                {t('HomePage.subtitle')}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                {userId ? (
                                    <Button size="lg" variant="glow" onClick={() => scrollToSection('upload')} className="text-lg px-8">
                                        {t('HomePage.cta')}
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                ) : (
                                    <SignInButton mode="modal">
                                        <Button size="lg" variant="glow" className="text-lg px-8">
                                            {t('HomePage.cta')}
                                            <ArrowRight className="ml-2 w-5 h-5" />
                                        </Button>
                                    </SignInButton>
                                )}
                                <Button size="lg" variant="outline" onClick={() => scrollToSection('how-it-works')} className="text-lg px-8 border-white/20 hover:bg-white/5">
                                    <Play className="mr-2 w-5 h-5" />
                                    {t('HomePage.ctaSecondary')}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    className="absolute bottom-10 left-1/2 -translate-x-1/2"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <ChevronDown className="w-8 h-8 text-gray-500" />
                </motion.div>
            </section>

            {/* ===== FEATURES SECTION ===== */}
            <section id="features" className="py-24 px-4 relative z-10">
                <div className="container max-w-6xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('Features.title')}</h2>
                        <p className="text-xl text-gray-400">{t('Features.subtitle')}</p>
                    </motion.div>

                    <motion.div
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                    >
                        {features.map(({ key, icon: Icon }) => (
                            <motion.div key={key} variants={fadeInUp}>
                                <Card className="h-full bg-white/5 border-white/10 hover:border-primary/50 transition-all duration-300 hover:bg-white/10">
                                    <CardContent className="p-6">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                                            <Icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-2">
                                            {t(`Features.items.${key}.title`)}
                                        </h3>
                                        <p className="text-gray-400">
                                            {t(`Features.items.${key}.description`)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ===== HOW IT WORKS SECTION ===== */}
            <section id="how-it-works" className="py-24 px-4 relative z-10 bg-gradient-to-b from-transparent via-white/5 to-transparent">
                <div className="container max-w-6xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('HowItWorks.title')}</h2>
                        <p className="text-xl text-gray-400">{t('HowItWorks.subtitle')}</p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {steps.map(({ key, icon: Icon, color }, index) => (
                            <motion.div
                                key={key}
                                className="relative"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                            >
                                <div className="text-center">
                                    <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-6 shadow-lg`}>
                                        <Icon className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent -z-10 hidden md:block" />
                                    <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-sm text-gray-400 mb-4">
                                        Step {index + 1}
                                    </span>
                                    <h3 className="text-xl font-semibold text-white mb-2">
                                        {t(`HowItWorks.steps.${key}.title`)}
                                    </h3>
                                    <p className="text-gray-400">
                                        {t(`HowItWorks.steps.${key}.description`)}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== UPLOAD SECTION ===== */}
            <section id="upload" className="py-24 px-4 relative z-10">
                <div className="container max-w-2xl mx-auto">
                    <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                        <CardContent className="p-8">
                            {!userId ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Lock className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-4">{t('HomePage.signInPrompt.title')}</h3>
                                    <p className="text-gray-400 mb-8">{t('HomePage.signInPrompt.description')}</p>
                                    <SignInButton mode="modal">
                                        <Button size="lg" variant="glow">{t('HomePage.signInPrompt.button')}</Button>
                                    </SignInButton>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <FileUpload onFileSelect={setFile} selectedFile={file} onClear={() => setFile(null)} />

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setQuality('lama')}
                                            className={`p-4 rounded-xl border transition-all text-left ${quality === 'lama' ? 'bg-primary/10 border-primary/50' : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Zap className={`w-5 h-5 ${quality === 'lama' ? 'text-primary' : 'text-gray-400'}`} />
                                                <div>
                                                    <div className={`font-medium ${quality === 'lama' ? 'text-white' : 'text-gray-300'}`}>
                                                        {t('HomePage.quality.fast.title')}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{t('HomePage.quality.fast.description')}</div>
                                                </div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuality('e2fgvi_hq')}
                                            className={`p-4 rounded-xl border transition-all text-left ${quality === 'e2fgvi_hq' ? 'bg-accent/10 border-accent/50' : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Clock className={`w-5 h-5 ${quality === 'e2fgvi_hq' ? 'text-accent' : 'text-gray-400'}`} />
                                                <div>
                                                    <div className={`font-medium ${quality === 'e2fgvi_hq' ? 'text-white' : 'text-gray-300'}`}>
                                                        {t('HomePage.quality.hq.title')}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{t('HomePage.quality.hq.description')}</div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>

                                    <Button type="submit" className="w-full h-14 text-lg" variant="glow" disabled={!file || uploading}>
                                        {uploading ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                {t('HomePage.processing')}
                                            </span>
                                        ) : t('HomePage.submitButton')}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* ===== PRICING SECTION ===== */}
            <section id="pricing" className="py-24 px-4 relative z-10">
                <div className="container max-w-6xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('Pricing.title')}</h2>
                        <p className="text-xl text-gray-400">{t('Pricing.subtitle')}</p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {['free', 'pro', 'enterprise'].map((plan, index) => (
                            <motion.div
                                key={plan}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className={`h-full ${plan === 'pro' ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'} relative overflow-hidden`}>
                                    {plan === 'pro' && (
                                        <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                            {t('Pricing.pro.badge')}
                                        </div>
                                    )}
                                    <CardContent className="p-8">
                                        <h3 className="text-xl font-bold text-white mb-2">{t(`Pricing.${plan}.name`)}</h3>
                                        <div className="mb-6">
                                            <span className="text-4xl font-bold text-white">{t(`Pricing.${plan}.price`)}</span>
                                            <span className="text-gray-400 ml-2">{t(`Pricing.${plan}.period`)}</span>
                                        </div>
                                        <ul className="space-y-3 mb-8">
                                            {(t.raw(`Pricing.${plan}.features`) as string[]).map((feature: string, i: number) => (
                                                <li key={i} className="flex items-center gap-2 text-gray-300">
                                                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            className="w-full"
                                            variant={plan === 'pro' ? 'glow' : 'outline'}
                                        >
                                            {t(`Pricing.${plan}.cta`)}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== FAQ SECTION ===== */}
            <section id="faq" className="py-24 px-4 relative z-10">
                <div className="container max-w-3xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('FAQ.title')}</h2>
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
                                    className="w-full text-left p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-medium text-white">{t(`FAQ.items.${key}.question`)}</span>
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
                                            className="mt-4 text-gray-400"
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

            {/* ===== FOOTER ===== */}
            <footer className="py-16 px-4 border-t border-white/10 relative z-10">
                <div className="container max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <h4 className="text-xl font-bold text-white mb-4">{t('Navbar.brand')}</h4>
                            <p className="text-gray-400">{t('Footer.tagline')}</p>
                        </div>
                        <div>
                            <h5 className="font-semibold text-white mb-4">{t('Footer.product.title')}</h5>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="#features" className="hover:text-white transition">{t('Footer.product.features')}</a></li>
                                <li><a href="#pricing" className="hover:text-white transition">{t('Footer.product.pricing')}</a></li>
                                <li><a href="#" className="hover:text-white transition">{t('Footer.product.api')}</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-semibold text-white mb-4">{t('Footer.company.title')}</h5>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="#" className="hover:text-white transition">{t('Footer.company.about')}</a></li>
                                <li><a href="#" className="hover:text-white transition">{t('Footer.company.contact')}</a></li>
                                <li><a href="#" className="hover:text-white transition">{t('Footer.company.careers')}</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-semibold text-white mb-4">{t('Footer.legal.title')}</h5>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="#" className="hover:text-white transition">{t('Footer.legal.privacy')}</a></li>
                                <li><a href="#" className="hover:text-white transition">{t('Footer.legal.terms')}</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-white/10 text-center text-gray-500">
                        {t('Footer.copyright')}
                    </div>
                </div>
            </footer>
        </main>
    );
}
