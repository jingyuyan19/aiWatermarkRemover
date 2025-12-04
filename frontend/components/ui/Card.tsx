import { HTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, hoverEffect = false, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={cn(
                    "bg-card-bg border border-card-border backdrop-blur-xl rounded-2xl p-6",
                    hoverEffect && "hover:border-primary/30 hover:bg-white/5 transition-colors duration-300",
                    className
                )}
                {...(props as any)}
            >
                {children}
            </motion.div>
        );
    }
);

Card.displayName = 'Card';

export { Card };
