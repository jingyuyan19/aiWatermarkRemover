'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function AnimationTestPage() {
    const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('processing');
    const [progress, setProgress] = useState(0);
    const [showBeauty, setShowBeauty] = useState(true);
    const [speed, setSpeed] = useState(4);

    // New Controls
    const [showVideo, setShowVideo] = useState(true);
    const [blurLevel, setBlurLevel] = useState(60);
    const [overlayOpacity, setOverlayOpacity] = useState(50); // Default 50%
    const [saturation, setSaturation] = useState(0); // Default 0% (B&W)
    const [blendMode, setBlendMode] = useState<any>('normal');

    const blendModes = ['normal', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'];

    // Smart Progress Simulation for 'processing' state
    useEffect(() => {
        if (status !== 'processing') {
            if (status === 'completed' || status === 'failed') setProgress(100);
            if (status === 'pending') setProgress(0);
            return;
        }

        // Reset progress when switching to processing
        setProgress(0);

        const startTime = Date.now();
        const duration = 10000; // 10 seconds for test loop

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            let p = (elapsed / duration) * 90;

            if (p > 90) p = 90 + (elapsed - duration) * 0.05; // Slow crawl
            if (p > 95) p = 95;

            setProgress(Math.min(95, p));
        }, 100);

        return () => clearInterval(interval);
    }, [status]);

    return (
        <main className="min-h-screen bg-[#0a0a1a] text-white p-8 font-sans">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
            <div className="fixed inset-0 bg-gradient-to-b from-blue-900/10 via-purple-900/10 to-transparent pointer-events-none"></div>

            <div className="max-w-4xl mx-auto relative z-10">

                {/* Controls */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-12 backdrop-blur-md">
                    <div className="flex flex-col gap-8">

                        {/* Top Row: Status & Toggles */}
                        <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
                            {/* Status Controls */}
                            <div>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <span>🎛️</span> State
                                    {/**/}
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {(['pending', 'processing', 'completed', 'failed'] as const).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setStatus(s)}
                                            className={`px-3 py-1.5 rounded-lg capitalize transition-all text-sm ${status === s
                                                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                                                : 'bg-white/10 hover:bg-white/20 text-gray-300'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="bg-black/20 p-4 rounded-lg flex flex-col gap-3 min-w-[250px]">
                                <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Toggles</h3>

                                {/* Beauty Toggle */}
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm group-hover:text-blue-300 transition-colors">✨ Beauty Mode</span>
                                    <button
                                        onClick={() => setShowBeauty(!showBeauty)}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors ${showBeauty ? 'bg-blue-600' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${showBeauty ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </label>

                                {/* Video Toggle */}
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm group-hover:text-blue-300 transition-colors">🎥 Show Video</span>
                                    <button
                                        onClick={() => setShowVideo(!showVideo)}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors ${showVideo ? 'bg-green-600' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${showVideo ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </label>
                            </div>
                        </div>

                        {/* Bottom Row: Sliders & Selects */}
                        <div className="grid md:grid-cols-4 gap-6 bg-black/20 p-4 rounded-lg">
                            {/* Speed Control */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                                    <span>Speed</span>
                                    <span className="text-blue-300 font-mono">{speed.toFixed(1)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="5"
                                    step="0.1"
                                    value={speed}
                                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Blur Control */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                                    <span>Blur</span>
                                    <span className="text-blue-300 font-mono">{blurLevel}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="150"
                                    step="1"
                                    value={blurLevel}
                                    onChange={(e) => setBlurLevel(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Saturation Control */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                                    <span>Saturation</span>
                                    <span className="text-blue-300 font-mono">{saturation}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    step="10"
                                    value={saturation}
                                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Overlay Opacity Control */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                                    <span>Bg Opacity</span>
                                    <span className="text-blue-300 font-mono">{overlayOpacity}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={overlayOpacity}
                                    onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Blend Mode Control */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                                    <span>Blend Mode</span>
                                </div>
                                <select
                                    value={blendMode}
                                    onChange={(e) => setBlendMode(e.target.value)}
                                    className="w-full bg-gray-800 text-white text-sm rounded-lg p-2 border border-white/10 focus:border-blue-500 outline-none"
                                >
                                    {blendModes.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Display Area (Replicating JobPage Layout) */}
                <div className="grid lg:grid-cols-2 gap-12 items-start">

                    {/* Left: Preview / Fluid Light Container */}
                    <div className="aspect-video bg-black rounded-2xl relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
                        {/* 1. Underlying Video Layer */}
                        <div className="absolute inset-0 z-0 bg-black">
                            {showVideo && (
                                <video
                                    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                                    className={`w-full h-full object-cover transition-all duration-500 ${showBeauty ? 'contrast-125' : 'opacity-100 grayscale-0'}`}
                                    style={{
                                        opacity: showBeauty ? 0.5 : 1,
                                        filter: showBeauty ? `grayscale(${100 - (saturation > 100 ? 100 : saturation)}%) saturate(${saturation}%)` : 'none'
                                    }}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                />
                            )}
                            {/* Darkening overlay for text readability */}
                            <div className="absolute inset-0 bg-[#0a0a1a]/60 backdrop-blur-[2px]"></div>
                        </div>

                        {/* 2. Fluid Light Effect (Only when processing/pending) */}
                        {(status === 'processing' || status === 'pending') && (
                            <>
                                {/* Overlay controlled by slider */}
                                {showBeauty && (
                                    <div
                                        className="absolute inset-0 z-10 bg-black transition-opacity duration-300"
                                        style={{ opacity: overlayOpacity / 100 }}
                                    ></div>
                                )}

                                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden" style={{ mixBlendMode: showBeauty ? blendMode : 'normal' }}>
                                    {/* Blob 1 - Deep Blue/Indigo */}
                                    <div
                                        className={`absolute w-[80%] h-[80%] rounded-full transition-all duration-500 ${showBeauty
                                            ? 'bg-blue-600/80'
                                            : 'bg-blue-600 border-4 border-blue-300 opacity-80'
                                            }`}
                                        style={{
                                            top: '-10%',
                                            left: '-10%',
                                            filter: showBeauty ? `blur(${blurLevel}px)` : 'none',
                                            animation: `fluid1 ${18 / speed}s infinite ease-in-out`
                                        }}
                                    ></div>
                                    {/* Blob 2 - Rich Violet */}
                                    <div
                                        className={`absolute w-[80%] h-[80%] rounded-full transition-all duration-500 ${showBeauty
                                            ? 'bg-violet-600/80'
                                            : 'bg-violet-600 border-4 border-violet-300 opacity-80'
                                            }`}
                                        style={{
                                            bottom: '-10%',
                                            right: '-10%',
                                            filter: showBeauty ? `blur(${blurLevel}px)` : 'none',
                                            animation: `fluid2 ${23 / speed}s infinite ease-in-out`
                                        }}
                                    ></div>
                                    {/* Blob 3 - Cyan Highlight */}
                                    <div
                                        className={`absolute w-[60%] h-[60%] rounded-full transition-all duration-500 ${showBeauty
                                            ? 'bg-cyan-500/80'
                                            : 'bg-cyan-500 border-4 border-cyan-3300 opacity-80'
                                            }`}
                                        style={{
                                            top: '20%',
                                            right: '20%',
                                            filter: showBeauty ? `blur(${blurLevel * 0.8}px)` : 'none',
                                            animation: `fluid3 ${21 / speed}s infinite ease-in-out`
                                        }}
                                    ></div>
                                </div>
                            </>
                        )}

                        {/* 3. Content Layer */}
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
                            {status === 'completed' ? (
                                <div className="animate-in fade-in zoom-in duration-500">
                                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto border border-white/20 backdrop-blur-md mb-4 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-white font-medium text-lg tracking-wide drop-shadow-lg">Processing Complete</h3>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Minimalist Status */}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex gap-2 items-center">
                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                                        </div>
                                        <h3 className="text-2xl font-light text-white tracking-[0.2em] uppercase opacity-90 drop-shadow-md">
                                            {status === 'pending' ? 'Queued' : 'Processing'}
                                        </h3>
                                        <p className="text-white/50 text-xs font-mono tracking-widest uppercase">
                                            AI Restoration in Progress
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Status Panel (Simplified for Modern Look) */}
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                            <h2 className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-6">Details</h2>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Status</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                        status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
                                            status === 'failed' ? 'bg-red-500/20 text-red-300' :
                                                'bg-yellow-500/20 text-yellow-300'
                                        }`}>
                                        {status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Model</span>
                                    <span className="text-white">LaMa-Inpaint v2</span>
                                </div>
                            </div>

                            {/* Dynamic Log Line */}
                            <div className="mt-8 pt-6 border-t border-white/5">
                                <p className="font-mono text-xs text-blue-200/60 animate-pulse">
                                    {status === 'pending' && '> Waiting for worker node...'}
                                    {status === 'processing' && '> Neural network active. Analyzing frames...'}
                                    {status === 'completed' && '> Output uploaded to R2 bucket.'}
                                    {status === 'failed' && '> Process terminated.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-gray-500 text-sm">
                    Animation Test Playground • <a href="/" className="hover:text-white underline">Back home</a>
                </div>
            </div>

            <style jsx global>{`
                @keyframes fluid1 {
                    0% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(20%, -10%) scale(1.1); }
                    50% { transform: translate(10%, 15%) scale(0.9); }
                    75% { transform: translate(-15%, 25%) scale(1.05); }
                    100% { transform: translate(0, 0) scale(1); }
                }
                @keyframes fluid2 {
                    0% { transform: translate(0, 0) scale(1.1); }
                    30% { transform: translate(-25%, -15%) scale(0.9); }
                    60% { transform: translate(-10%, 20%) scale(1.2); }
                    100% { transform: translate(0, 0) scale(1.1); }
                }
                @keyframes fluid3 {
                    0% { transform: translate(0, 0) scale(0.9); }
                    40% { transform: translate(25%, 25%) scale(1.1); }
                    70% { transform: translate(5%, -20%) scale(0.85); }
                    100% { transform: translate(0, 0) scale(0.9); }
                }
            `}</style>
        </main>
    );
}
