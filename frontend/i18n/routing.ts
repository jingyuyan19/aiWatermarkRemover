import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    // List of all supported locales
    locales: ['en', 'zh-CN'],

    // Default locale when no locale is specified
    defaultLocale: 'en',

    // Don't add locale prefix for default locale
    localePrefix: 'as-needed'
});
