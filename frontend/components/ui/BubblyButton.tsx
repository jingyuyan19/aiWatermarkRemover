'use client';

import React, { useState } from 'react';
import './../../app/bubbly-button.css';

interface BubblyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

export function BubblyButton({ children, className, onClick, ...props }: BubblyButtonProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Reset animation
        setIsAnimating(false);
        // Trigger reflow/repaint to restart animation if needed (React rendering usually handles this via state toggle but distinct true/false is cleaner)
        setTimeout(() => setIsAnimating(true), 10);

        if (onClick) onClick(e);

        // Remove class after animation completes
        setTimeout(() => setIsAnimating(false), 750);
    };

    return (
        <button
            className={`bubbly-button ${isAnimating ? 'animate' : ''} ${className || ''}`}
            onClick={handleClick}
            {...props}
        >
            {children}
        </button>
    );
}
