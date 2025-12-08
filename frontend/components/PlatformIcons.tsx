'use client';

import Image from 'next/image';

// Platform icons using actual SVG files
interface PlatformIconProps {
    name: string;
    className?: string;
}

// Map platform names to their icon files
const iconMap: Record<string, string> = {
    'Sora': '/icons/platforms/sora.svg',
    'Google Veo': '/icons/platforms/veo.svg',
    'Runway': '/icons/platforms/runway.svg',
    'Pika': '/icons/platforms/pika.svg',
    'Kling': '/icons/platforms/kling.svg',
    'Hailuo': '/icons/platforms/hailuo.svg',
    'Luma': '/icons/platforms/luma.svg',
};

export function PlatformIcon({ name, className = "w-8 h-8" }: PlatformIconProps) {
    const iconPath = iconMap[name];

    if (!iconPath) {
        // Fallback for unknown platforms
        return (
            <div className={`${className} rounded-lg bg-gray-700 flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">{name.charAt(0)}</span>
            </div>
        );
    }

    return (
        <Image
            src={iconPath}
            alt={`${name} logo`}
            width={40}
            height={40}
            className={className}
        />
    );
}
