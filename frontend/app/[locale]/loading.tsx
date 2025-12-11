import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Loading() {
    const t = useTranslations('Pages.Loading');
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-gray-400">{t('text')}</p>
            </div>
        </div>
    );
}
