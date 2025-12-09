'use client';

import React from 'react';
import { BubblyButton } from '@/components/ui/BubblyButton';
import './../../bubbly-button.css'; // Ensure CSS is loaded

export default function ButtonTestPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 gap-10">
            <h1 className="text-white text-3xl mb-10 font-bold">Bubbly Button "Exact" Replication Test</h1>

            {/* 1. The button inside a container that simulates the CodePen's hue-rotating div */}
            <div className="demo-container">
                <BubblyButton className="text-lg font-bold contrast-fix">
                    Hover Me (Rainbow)
                </BubblyButton>
            </div>

            {/* 2. Control (No Rainbow) */}
            <div>
                <BubblyButton className="text-lg font-bold contrast-fix">
                    Hover Me (Static Green)
                </BubblyButton>
            </div>

            <p className="text-gray-400 mt-20 max-w-md text-center">
                The top button is wrapped in a container with <code>animation: hue-rotate 10s linear infinite</code>, matching the CodePen 'div' style.
            </p>
        </div>
    );
}
