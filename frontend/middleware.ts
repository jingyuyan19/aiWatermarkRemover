import createMiddleware from 'next-intl/middleware';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Define which routes require authentication (none for now - auth is handled in components)
const isPublicRoute = createRouteMatcher([
    '/',
    '/:locale',
    '/:locale/job/:id',
    '/job/:id',
    '/sign-in(.*)',
    '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    // Run intl middleware for all requests
    return intlMiddleware(req);
});

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
