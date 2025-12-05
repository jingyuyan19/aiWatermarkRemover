'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function TermsPage() {
    const t = useTranslations('Terms');

    return (
        <main className="min-h-screen pt-24 pb-20 px-4 bg-black text-white">
            <div className="container max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>
                    <p className="text-gray-400 mb-8">{t('lastUpdated')}: December 5, 2024</p>

                    <div className="prose prose-invert max-w-none space-y-8">
                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.acceptance.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.acceptance.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.service.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.service.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.accounts.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.accounts.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.content.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.content.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.payment.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.payment.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.liability.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.liability.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.changes.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.changes.content')}</p>
                        </section>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
