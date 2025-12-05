'use client';

import { useLocale, useTranslations } from 'next-intl';

export function Footer() {
    const locale = useLocale();
    const t = useTranslations('Footer');
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="container max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <a href={`/${locale}`} className="font-bold text-xl text-white">
                            Vanishly
                        </a>
                        <p className="mt-4 text-sm text-gray-500">
                            {t('tagline')}
                        </p>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">{t('product.title')}</h4>
                        <ul className="space-y-3">
                            <li>
                                <a href={`/${locale}#features`} className="text-sm text-gray-400 hover:text-white transition-colors">
                                    {t('product.features')}
                                </a>
                            </li>
                            <li>
                                <a href={`/${locale}/pricing`} className="text-sm text-gray-400 hover:text-white transition-colors">
                                    {t('product.pricing')}
                                </a>
                            </li>
                            <li>
                                <a href={`/${locale}#faq`} className="text-sm text-gray-400 hover:text-white transition-colors">
                                    FAQ
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">{t('legal.title')}</h4>
                        <ul className="space-y-3">
                            <li>
                                <a href={`/${locale}/privacy`} className="text-sm text-gray-400 hover:text-white transition-colors">
                                    {t('legal.privacy')}
                                </a>
                            </li>
                            <li>
                                <a href={`/${locale}/terms`} className="text-sm text-gray-400 hover:text-white transition-colors">
                                    {t('legal.terms')}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">{t('contact.title')}</h4>
                        <ul className="space-y-3">
                            <li>
                                <a
                                    href="mailto:support@vanishly.io"
                                    className="text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    support@vanishly.io
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-12 pt-8 border-t border-white/10 text-center">
                    <p className="text-sm text-gray-500">
                        {t('copyright', { year: currentYear })}
                    </p>
                </div>
            </div>
        </footer>
    );
}
