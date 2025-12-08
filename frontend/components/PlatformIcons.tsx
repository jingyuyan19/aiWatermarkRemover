'use client';

// Stylized icons for AI video platforms
// These are custom icons inspired by each platform's brand identity

interface PlatformIconProps {
    name: string;
    className?: string;
}

export function PlatformIcon({ name, className = "w-8 h-8" }: PlatformIconProps) {
    switch (name) {
        case 'Sora':
            // OpenAI-inspired: Abstract "S" shape
            return (
                <svg viewBox="0 0 32 32" className={className} fill="none">
                    <circle cx="16" cy="16" r="14" fill="url(#sora-gradient)" />
                    <path d="M10 12C10 10 12 8 16 8C20 8 22 10 22 12C22 14 20 15 16 16C12 17 10 18 10 20C10 22 12 24 16 24C20 24 22 22 22 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    <defs>
                        <linearGradient id="sora-gradient" x1="0" y1="0" x2="32" y2="32">
                            <stop stopColor="#10A37F" />
                            <stop offset="1" stopColor="#1A7F64" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'Google Veo':
            // Google-inspired: Multi-color abstract V
            return (
                <svg viewBox="0 0 32 32" className={className} fill="none">
                    <path d="M6 8L16 24L26 8" stroke="url(#veo-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="16" cy="24" r="3" fill="#4285F4" />
                    <defs>
                        <linearGradient id="veo-gradient" x1="6" y1="8" x2="26" y2="8">
                            <stop stopColor="#EA4335" />
                            <stop offset="0.33" stopColor="#FBBC05" />
                            <stop offset="0.66" stopColor="#34A853" />
                            <stop offset="1" stopColor="#4285F4" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'Runway':
            // Runway-inspired: Abstract play/motion
            return (
                <svg viewBox="0 0 32 32" className={className} fill="none">
                    <rect x="4" y="4" width="24" height="24" rx="6" fill="url(#runway-gradient)" />
                    <polygon points="13,10 23,16 13,22" fill="white" />
                    <defs>
                        <linearGradient id="runway-gradient" x1="4" y1="4" x2="28" y2="28">
                            <stop stopColor="#FF4D4D" />
                            <stop offset="1" stopColor="#F9CB28" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'Pika':
            // Pika-inspired: Lightning/energy bolt
            return (
                <svg viewBox="0 0 32 32" className={className} fill="none">
                    <circle cx="16" cy="16" r="14" fill="url(#pika-gradient)" />
                    <path d="M18 6L10 18H16L14 26L22 14H16L18 6Z" fill="white" />
                    <defs>
                        <linearGradient id="pika-gradient" x1="0" y1="0" x2="32" y2="32">
                            <stop stopColor="#7C3AED" />
                            <stop offset="1" stopColor="#EC4899" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'Kling':
            // Kling-inspired: Abstract wave/flow
            return (
                <svg viewBox="0 0 32 32" className={className} fill="none">
                    <rect x="4" y="4" width="24" height="24" rx="6" fill="url(#kling-gradient)" />
                    <path d="M8 16C10 12 14 12 16 16C18 20 22 20 24 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M8 20C10 16 14 16 16 20C18 24 22 24 24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
                    <defs>
                        <linearGradient id="kling-gradient" x1="4" y1="4" x2="28" y2="28">
                            <stop stopColor="#F97316" />
                            <stop offset="1" stopColor="#EF4444" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'Hailuo':
            // Hailuo/MiniMax-inspired: Abstract AI brain
            return (
                <svg viewBox="0 0 32 32" className={className} fill="none">
                    <circle cx="16" cy="16" r="14" fill="url(#hailuo-gradient)" />
                    <circle cx="12" cy="13" r="2" fill="white" />
                    <circle cx="20" cy="13" r="2" fill="white" />
                    <circle cx="16" cy="19" r="2" fill="white" />
                    <path d="M12 13L16 19M20 13L16 19M12 13L20 13" stroke="white" strokeWidth="1.5" />
                    <defs>
                        <linearGradient id="hailuo-gradient" x1="0" y1="0" x2="32" y2="32">
                            <stop stopColor="#3B82F6" />
                            <stop offset="1" stopColor="#06B6D4" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'Luma':
            // Luma-inspired: Dream/sparkle
            return (
                <svg viewBox="0 0 32 32" className={className} fill="none">
                    <circle cx="16" cy="16" r="14" fill="url(#luma-gradient)" />
                    <path d="M16 6L18 14L26 16L18 18L16 26L14 18L6 16L14 14L16 6Z" fill="white" />
                    <defs>
                        <linearGradient id="luma-gradient" x1="0" y1="0" x2="32" y2="32">
                            <stop stopColor="#A855F7" />
                            <stop offset="1" stopColor="#3B82F6" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        default:
            // Default video icon
            return (
                <svg viewBox="0 0 32 32" className={className} fill="none">
                    <rect x="4" y="6" width="24" height="20" rx="3" fill="#374151" />
                    <polygon points="14,11 14,21 22,16" fill="white" />
                </svg>
            );
    }
}
