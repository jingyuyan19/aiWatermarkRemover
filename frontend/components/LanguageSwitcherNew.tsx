'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Language {
    code: string;
    label: string; // Native name
    englishLabel: string; // English name (optional context)
}

const languages: Language[] = [
    { code: 'en', label: 'English', englishLabel: 'English' },
    { code: 'zh-CN', label: '中文', englishLabel: 'Chinese' },
    // Adding others from the screenshot simulation for visualization, 
    // though functionality relies on routing setup.
    // { code: 'ja', label: '日本語', englishLabel: 'Japanese' },
    // { code: 'de', label: 'Deutsch', englishLabel: 'German' },
    // { code: 'fr', label: 'Français', englishLabel: 'French' },
    // { code: 'ko', label: '한국어', englishLabel: 'Korean' },
];

export function LanguageSwitcherNew({ locale }: { locale: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('Navbar');

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLang = languages.find(l => l.code === locale) || languages[0];

    // Helper to switch language with path preservation
    const switchLanguage = (newLocale: string) => {
        let newPath = pathname;

        // Handle "as-needed" routing (where default locale 'en' has no prefix)
        if (pathname.startsWith(`/${locale}`)) {
            // If current path has the locale prefix, replace it
            newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
        } else {
            // If current path has NO locale prefix (it's the default locale)
            // We prepend the new locale
            newPath = `/${newLocale}${pathname}`;
        }

        // Clean up double slashes (e.g. if pathname was just /)
        newPath = newPath.replace('//', '/');

        // Handling switching TO default locale (en) from a prefixed one is handled by the middleware
        // which typically redirects /en/foo -> /foo.

        window.location.href = newPath;
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                    border border-white/10
                    ${isOpen ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'}
                `}
                aria-label="Select Language"
            >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">{currentLang.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        {t('selectLanguage')}
                    </div>
                    {languages.map((lang) => {
                        const isSelected = lang.code === locale;
                        return (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setIsOpen(false);
                                    switchLanguage(lang.code);
                                }}
                                className={`
                                    w-full px-4 py-2 text-left flex items-center justify-between text-sm transition-colors
                                    ${isSelected
                                        ? 'text-primary bg-primary/10 font-medium'
                                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }
                                `}
                            >
                                <span className="flex flex-col">
                                    <span>{lang.label}</span>
                                    {/* Optional: Show English name as subtitle if needed, but screenshot implies clean list */}
                                </span>
                                {isSelected && <Check className="w-4 h-4" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
