import createMiddleware from 'next-intl/middleware';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default clerkMiddleware(async (auth, req) => {
    // Skip intl middleware for API routes
    if (req.nextUrl.pathname.startsWith('/api')) {
        return;
    }

    return intlMiddleware(req);
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
