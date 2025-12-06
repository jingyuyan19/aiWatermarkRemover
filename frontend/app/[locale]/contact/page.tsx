'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export default function ContactPage() {
    const t = useTranslations('Contact');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);

        // Simulate sending (in production, this would call an API)
        await new Promise(resolve => setTimeout(resolve, 1000));

        setSending(false);
        setSent(true);
        toast.success(t('successMessage'));

        // Reset form
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    return (
        <main className="min-h-screen bg-black text-white pt-24 pb-16 px-4">
            <div className="container max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('title')}</h1>
                    <p className="text-xl text-gray-400">{t('subtitle')}</p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Contact Info Cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-4"
                    >
                        <Card className="bg-gray-900 border-white/10">
                            <CardContent className="p-6">
                                <Mail className="w-8 h-8 text-primary mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">{t('email.title')}</h3>
                                <a href="mailto:support@vanishly.io" className="text-gray-400 hover:text-primary transition-colors">
                                    support@vanishly.io
                                </a>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-900 border-white/10">
                            <CardContent className="p-6">
                                <Clock className="w-8 h-8 text-primary mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">{t('response.title')}</h3>
                                <p className="text-gray-400">{t('response.time')}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-900 border-white/10">
                            <CardContent className="p-6">
                                <MessageSquare className="w-8 h-8 text-primary mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">{t('faq.title')}</h3>
                                <a href="/#faq" className="text-gray-400 hover:text-primary transition-colors">
                                    {t('faq.link')}
                                </a>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="md:col-span-2"
                    >
                        <Card className="bg-gray-900 border-white/10">
                            <CardContent className="p-6">
                                {sent ? (
                                    <div className="text-center py-12">
                                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                        <h3 className="text-2xl font-semibold text-white mb-2">{t('successTitle')}</h3>
                                        <p className="text-gray-400">{t('successMessage')}</p>
                                        <Button
                                            onClick={() => setSent(false)}
                                            variant="outline"
                                            className="mt-6"
                                        >
                                            {t('sendAnother')}
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                                    {t('form.name')}
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder={t('form.namePlaceholder')}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                                    {t('form.email')}
                                                </label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder={t('form.emailPlaceholder')}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                                {t('form.subject')}
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.subject}
                                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder={t('form.subjectPlaceholder')}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                                {t('form.message')}
                                            </label>
                                            <textarea
                                                required
                                                rows={5}
                                                value={formData.message}
                                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                                placeholder={t('form.messagePlaceholder')}
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            variant="glow"
                                            size="lg"
                                            className="w-full"
                                            disabled={sending}
                                        >
                                            {sending ? (
                                                <>{t('sending')}</>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4 mr-2" />
                                                    {t('form.submit')}
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
