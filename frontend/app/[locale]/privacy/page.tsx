'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
    const t = useTranslations('Privacy');

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
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.intro.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.intro.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.dataCollection.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.dataCollection.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.dataUsage.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.dataUsage.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.dataStorage.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.dataStorage.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.thirdParty.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.thirdParty.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">{t('sections.contact.title')}</h2>
                            <p className="text-gray-300 leading-relaxed">{t('sections.contact.content')}</p>
                        </section>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
