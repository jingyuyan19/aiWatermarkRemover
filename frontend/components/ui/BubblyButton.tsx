'use client';

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './../../app/bubbly-button.css';

interface BubblyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    rainbow?: boolean;
}

export function BubblyButton({ children, className, onClick, rainbow = false, ...props }: BubblyButtonProps) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);

    useEffect(() => {
        // ... (GSAP logic remains unchanged) ...
        if (!containerRef.current) return;

        const mainButton = containerRef.current.querySelector('.button--bubble');
        const circlesTopLeft = containerRef.current.querySelectorAll('.circle.top-left');
        const circlesBottomRight = containerRef.current.querySelectorAll('.circle.bottom-right');
        const effectButton = containerRef.current.querySelector('.effect-button');

        const tl = gsap.timeline();
        const tl2 = gsap.timeline();
        const btTl = gsap.timeline({ paused: true });

        // Helper for GSAP 3 syntax (CodePen used GSAP 2)
        // Top Left Circles
        tl.to(circlesTopLeft, { duration: 1.2, x: -25, y: -25, scaleY: 2, ease: "slow(0.1, 0.7, false)" });
        tl.to(circlesTopLeft[0], { duration: 0.1, scale: 0.2, x: '+=6', y: '-=2' }, "-=1.2"); // Overlap adjusted for GSAP 3
        tl.to(circlesTopLeft[1], { duration: 0.1, scaleX: 1, scaleY: 0.8, x: '-=10', y: '-=7' }, "-=0.1");
        tl.to(circlesTopLeft[2], { duration: 0.1, scale: 0.2, x: '-=15', y: '+=6' }, "-=0.1");
        tl.to(circlesTopLeft[0], { duration: 1, scale: 0, x: '-=5', y: '-=15', opacity: 0 });
        tl.to(circlesTopLeft[1], { duration: 1, scaleX: 0.4, scaleY: 0.4, x: '-=10', y: '-=10', opacity: 0 }, "-=1");
        tl.to(circlesTopLeft[2], { duration: 1, scale: 0, x: '-=15', y: '+=5', opacity: 0 }, "-=1");

        // Bottom Right Circles
        const tlBt1 = gsap.timeline();
        const tlBt2 = gsap.timeline();

        tlBt1.set(circlesTopLeft, { x: 0, y: 0, rotation: -45 });
        tlBt1.add(tl);

        tl2.set(circlesBottomRight, { x: 0, y: 0 });
        tl2.to(circlesBottomRight, { duration: 1.1, x: 30, y: 30, ease: "slow(0.1, 0.7, false)" });
        tl2.to(circlesBottomRight[0], { duration: 0.1, scale: 0.2, x: '-=6', y: '+=3' }, "-=1.1");
        tl2.to(circlesBottomRight[1], { duration: 0.1, scale: 0.8, x: '+=7', y: '+=3' }, "-=0.1");
        tl2.to(circlesBottomRight[2], { duration: 0.1, scale: 0.2, x: '+=15', y: '-=6' }, "-=0.2");
        tl2.to(circlesBottomRight[0], { duration: 1, scale: 0, x: '+=5', y: '+=15', opacity: 0 });
        tl2.to(circlesBottomRight[1], { duration: 1, scale: 0.4, x: '+=7', y: '+=7', opacity: 0 }, "-=1");
        tl2.to(circlesBottomRight[2], { duration: 1, scale: 0, x: '+=15', y: '-=5', opacity: 0 }, "-=1");

        tlBt2.set(circlesBottomRight, { x: 0, y: 0, rotation: 45 });
        tlBt2.add(tl2);

        // Main Button Timeline
        btTl.add(tlBt1);
        btTl.to(effectButton, { duration: 0.8, scaleY: 1.1 }, 0.1);
        btTl.add(tlBt2, 0.2);
        btTl.to(effectButton, { duration: 1.8, scale: 1, ease: "elastic.out(1.2, 0.4)" }, 1.2);

        btTl.timeScale(2.6);
        timelineRef.current = btTl;

        // Hover Effect
        const handleMouseEnter = () => {
            // GSAP restart logic
            btTl.restart();
        };

        mainButton?.addEventListener('mouseenter', handleMouseEnter);

        // Cleanup
        return () => {
            mainButton?.removeEventListener('mouseenter', handleMouseEnter);
            btTl.kill();
        };
        // ...
    }, []);

    const buttonContent = (
        <span className="button--bubble__container relative inline-block" ref={containerRef}>
            <button
                className={`button button--bubble ${className || ''}`}
                onClick={onClick}
                {...props}
            >
                {children}
            </button>
            <span className="button--bubble__effect-container">
                <span className="circle top-left"></span>
                <span className="circle top-left"></span>
                <span className="circle top-left"></span>

                <span className="button effect-button"></span>

                <span className="circle bottom-right"></span>
                <span className="circle bottom-right"></span>
                <span className="circle bottom-right"></span>
            </span>
        </span>
    );

    if (rainbow) {
        return <div className="demo-container">{buttonContent}</div>;
    }

    return buttonContent;
}
