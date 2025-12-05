'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface RedeemResult {
    success: boolean;
    message: string;
    credits_added?: number;
    new_balance?: number;
}

export function RedeemCodeCard({ onSuccess }: { onSuccess?: (newBalance: number) => void }) {
    const { getToken } = useAuth();
    const t = useTranslations('Redeem');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<RedeemResult | null>(null);

    const handleRedeem = async () => {
        if (!code.trim()) {
            toast.error(t('enterCode'));
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const token = await getToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/codes/redeem`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ code: code.trim().toUpperCase() })
            });

            const data = await res.json();

            if (res.ok) {
                setResult({
                    success: true,
                    message: data.message,
                    credits_added: data.credits_added,
                    new_balance: data.new_balance
                });
                setCode('');
                toast.success(t('success'));
                onSuccess?.(data.new_balance);
            } else {
                setResult({
                    success: false,
                    message: data.detail || t('invalidCode')
                });
            }
        } catch (error) {
            setResult({
                success: false,
                message: t('error')
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{t('title')}</h3>
                        <p className="text-sm text-gray-400">{t('subtitle')}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder={t('placeholder')}
                        className="flex-1 px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white font-mono uppercase tracking-wider placeholder:text-gray-500 focus:outline-none focus:border-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                    />
                    <Button
                        variant="glow"
                        onClick={handleRedeem}
                        disabled={loading || !code.trim()}
                    >
                        {loading ? '...' : t('button')}
                    </Button>
                </div>

                <AnimatePresence mode="wait">
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${result.success
                                ? 'bg-green-500/10 border border-green-500/20'
                                : 'bg-red-500/10 border border-red-500/20'
                                }`}
                        >
                            {result.success ? (
                                <>
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-green-400 font-medium">{result.message}</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {t('newBalance')}: <span className="text-white font-bold">{result.new_balance}</span> {t('credits')}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-400">{result.message}</p>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
