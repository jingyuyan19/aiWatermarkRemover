import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://vanishly.io';

    // Languages supported
    const locales = ['en', 'zh-CN'];

    const routes = locales.flatMap((locale) => {
        const prefix = locale === 'en' ? '' : `/${locale}`; // English is default at root often, but if strictly /en... 
        // Actually, if utilizing strict [locale] routing without a root rewrite, standard practice is strict paths.
        // Assuming /en is the default route or handled by middleware rewrite.
        // Let's list specific pages.

        return [
            '',
            '/pricing',
            '/contact',
            '/login',
            '/privacy',
            '/terms'
        ].map((route) => ({
            url: `${baseUrl}/${locale}${route}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: route === '' ? 1 : 0.8,
        }));
    });

    return routes;
}
