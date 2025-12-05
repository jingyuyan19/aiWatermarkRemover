import createMiddleware from 'next-intl/middleware';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';

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
    try {
        // Skip intl middleware for API routes and static files
        if (
            req.nextUrl.pathname.startsWith('/api') ||
            req.nextUrl.pathname.startsWith('/_next') ||
            req.nextUrl.pathname.includes('.')
        ) {
            return NextResponse.next();
        }

        // Run intl middleware for all other requests
        return intlMiddleware(req);
    } catch (error) {
        console.error('Middleware error:', error);
        return NextResponse.next();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
