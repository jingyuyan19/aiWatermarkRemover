'use client';

import { motion } from 'framer-motion';

export function AuroraBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-[#050505]">
            <div className="absolute inset-0 opacity-30">
                <motion.div
                    animate={{
                        transform: [
                            'translate(0%, 0%) scale(1)',
                            'translate(10%, -10%) scale(1.1)',
                            'translate(-5%, 5%) scale(0.9)',
                            'translate(0%, 0%) scale(1)',
                        ],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]"
                />
                <motion.div
                    animate={{
                        transform: [
                            'translate(0%, 0%) scale(1)',
                            'translate(-10%, 10%) scale(1.1)',
                            'translate(5%, -5%) scale(0.9)',
                            'translate(0%, 0%) scale(1)',
                        ],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-accent/20 blur-[120px]"
                />
                <motion.div
                    animate={{
                        transform: [
                            'translate(0%, 0%) scale(1)',
                            'translate(10%, 10%) scale(1.1)',
                            'translate(-10%, -5%) scale(0.9)',
                            'translate(0%, 0%) scale(1)',
                        ],
                    }}
                    transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]"
                />
            </div>
            <div
                className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />
        </div>
    );
}
