import Link from 'next/link';
import { Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
                <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>
                <p className="text-gray-400 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link href="/">
                        <Button variant="glow" className="gap-2">
                            <Home className="w-4 h-4" />
                            Go Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
