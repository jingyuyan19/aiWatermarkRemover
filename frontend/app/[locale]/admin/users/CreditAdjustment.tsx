'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Pencil, Plus, Minus, MoveRight, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';

interface CreditAdjustmentProps {
    userId: string;
    currentCredits: number;
    onUpdate: (newCredits: number) => void;
}

type AdjustmentMode = 'add' | 'remove' | 'set';

export function CreditAdjustment({ userId, currentCredits, onUpdate }: CreditAdjustmentProps) {
    const t = useTranslations('Admin.Users.Adjustment');
    const { getToken } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<AdjustmentMode>('add');
    const [amount, setAmount] = useState<string>('');

    const calculateNewBalance = () => {
        const val = parseInt(amount) || 0;
        if (mode === 'add') return currentCredits + val;
        if (mode === 'remove') return Math.max(0, currentCredits - val);
        if (mode === 'set') return val;
        return currentCredits;
    };

    const handleUpdate = async () => {
        if (!amount || isNaN(parseInt(amount))) return;

        setLoading(true);
        const newCredits = calculateNewBalance();

        try {
            const token = await getToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/credits`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ credits: newCredits })
            });

            if (res.ok) {
                onUpdate(newCredits);
                setOpen(false);
                setAmount('');
                toast.success(t('success', { credits: newCredits }));
            } else {
                toast.error(t('error'));
            }
        } catch (error) {
            toast.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="flex items-center justify-end gap-2 group cursor-pointer hover:bg-white/5 p-1 rounded-md transition-colors">
                    <span className="text-primary font-semibold min-w-[3ch] text-right">{currentCredits}</span>
                    <Pencil className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-gray-900 border-white/10 text-white p-4">
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="font-medium text-sm">{t('title')}</h4>
                        <span className="text-xs text-gray-400">{t('current')}: {currentCredits}</span>
                    </div>

                    {/* Mode Selection */}
                    <div className="grid grid-cols-3 gap-1 bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => setMode('add')}
                            className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${mode === 'add' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Plus className="w-3 h-3" /> {t('add')}
                        </button>
                        <button
                            onClick={() => setMode('remove')}
                            className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${mode === 'remove' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Minus className="w-3 h-3" /> {t('remove')}
                        </button>
                        <button
                            onClick={() => setMode('set')}
                            className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${mode === 'set' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            <MoveRight className="w-3 h-3" /> {t('set')}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className="bg-black/50 border-white/10 text-white placeholder-gray-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                        />
                        <div className="flex justify-between text-xs px-1">
                            <span className="text-gray-500">{t('newBalance')}:</span>
                            <span className={`font-semibold ${mode === 'remove' ? 'text-red-400' : 'text-green-400'}`}>
                                {calculateNewBalance()}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs bg-transparent border-white/10 hover:bg-white/5 hover:text-white"
                            onClick={() => setOpen(false)}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            variant={mode === 'remove' ? 'destructive' : 'glow'}
                            onClick={handleUpdate}
                            disabled={loading || !amount}
                        >
                            {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            {t('confirm')}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
