'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { GripVertical } from 'lucide-react';

interface ComparisonSliderProps {
    imageSrc?: string;
    videoSrcBefore?: string;
    videoSrcAfter?: string;
    beforeLabel?: string;
    afterLabel?: string;
    type?: 'image' | 'video';
}

export function ComparisonSlider({
    imageSrc,
    videoSrcBefore,
    videoSrcAfter,
    beforeLabel = 'Original',
    afterLabel = 'Removed',
    type = 'image',
}: ComparisonSliderProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const beforeVideoRef = useRef<HTMLVideoElement>(null);
    const afterVideoRef = useRef<HTMLVideoElement>(null);

    const handleMove = useCallback((event: MouseEvent | TouchEvent) => {
        if (!isDragging || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;

        const position = ((clientX - containerRect.left) / containerRect.width) * 100;
        setSliderPosition(Math.min(Math.max(position, 0), 100));
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('touchend', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [handleMove, handleMouseUp]);

    // Sync videos
    useEffect(() => {
        if (type === 'video' && beforeVideoRef.current && afterVideoRef.current) {
            const before = beforeVideoRef.current;
            const after = afterVideoRef.current;

            const syncVideos = () => {
                if (Math.abs(before.currentTime - after.currentTime) > 0.1) {
                    after.currentTime = before.currentTime;
                }
            };

            const playBoth = () => {
                before.play().catch(() => { });
                after.play().catch(() => { });
            };

            before.addEventListener('timeupdate', syncVideos);
            before.addEventListener('play', playBoth);
            after.addEventListener('play', playBoth);

            return () => {
                before.removeEventListener('timeupdate', syncVideos);
                before.removeEventListener('play', playBoth);
                after.removeEventListener('play', playBoth);
            };
        }
    }, [type]);

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-[9/16] md:aspect-video select-none overflow-hidden rounded-xl border border-white/10 shadow-2xl cursor-ew-resize group bg-black"
            onMouseDown={() => setIsDragging(true)}
            onTouchStart={() => setIsDragging(true)}
        >
            {/* After Content (Background - Clean) */}
            <div className="absolute inset-0">
                {type === 'video' && videoSrcAfter ? (
                    <video
                        ref={afterVideoRef}
                        src={videoSrcAfter}
                        className="w-full h-full object-cover pointer-events-none"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : (
                    <Image
                        src={imageSrc || ''}
                        alt="After"
                        fill
                        className="object-cover pointer-events-none"
                        priority
                    />
                )}
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded border border-white/10 z-10">
                    {afterLabel}
                </div>
            </div>

            {/* Before Content (Foreground - Watermarked) */}
            <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                {type === 'video' && videoSrcBefore ? (
                    <video
                        ref={beforeVideoRef}
                        src={videoSrcBefore}
                        className="w-full h-full object-cover pointer-events-none"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : (
                    <>
                        <Image
                            src={imageSrc || ''}
                            alt="Before"
                            fill
                            className="object-cover"
                            priority
                        />

                        {/* Simulated Watermark Overlay for Images */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                            <div className="transform -rotate-12 border-4 border-white/30 px-8 py-4 rounded-xl backdrop-blur-[2px]">
                                <span className="text-5xl md:text-7xl font-black text-white/40 tracking-widest uppercase drop-shadow-lg">
                                    WATERMARK
                                </span>
                            </div>
                            {/* Repeating pattern for realism */}
                            <div className="absolute inset-0 opacity-20"
                                style={{
                                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(255,255,255,0.1) 100px, rgba(255,255,255,0.1) 200px)'
                                }}
                            />
                        </div>
                    </>
                )}

                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded border border-white/10">
                    {beforeLabel}
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                style={{ left: `${sliderPosition}%` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                    <GripVertical size={20} />
                </div>
            </div>
        </div>
    );
}
