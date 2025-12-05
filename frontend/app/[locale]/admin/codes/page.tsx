'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, Copy, Check, Download, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

interface Code {
    code: string;
    credits: number;
    created_at: string;
    redeemed_by: string | null;
    redeemed_at: string | null;
}

interface PaginatedResponse {
    codes: Code[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export default function CodesPage() {
    const { getToken } = useAuth();
    const [codes, setCodes] = useState<Code[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Modal state for generated codes
    const [showModal, setShowModal] = useState(false);
    const [generatedCodes, setGeneratedCodes] = useState<Code[]>([]);

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filter state
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'redeemed'>('all');
    const [creditsFilter, setCreditsFilter] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Generator options
    const [credits, setCredits] = useState(10);
    const [count, setCount] = useState(1);
    const [prefix, setPrefix] = useState('TB-');

    const fetchCodes = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });

            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            if (creditsFilter) {
                params.append('credits', creditsFilter.toString());
            }
            if (searchQuery) {
                params.append('search', searchQuery);
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/codes?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data: PaginatedResponse = await res.json();
                setCodes(data.codes);
                setTotal(data.total);
                setTotalPages(data.total_pages);
            }
        } catch (error) {
            console.error('Failed to fetch codes:', error);
        } finally {
            setLoading(false);
        }
    }, [getToken, page, pageSize, statusFilter, creditsFilter, searchQuery]);

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes]);

    const generateCodes = async () => {
        setGenerating(true);
        try {
            const token = await getToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/codes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ credits, count, prefix })
            });
            if (res.ok) {
                const newCodes = await res.json();
                setGeneratedCodes(newCodes);
                setShowModal(true);
                toast.success(`Generated ${newCodes.length} code(s)!`);

                // Refresh the list
                setPage(1);
                fetchCodes();
            } else {
                toast.error('Failed to generate codes');
            }
        } catch (error) {
            toast.error('Failed to generate codes');
        } finally {
            setGenerating(false);
        }
    };

    const downloadGeneratedCodes = () => {
        if (generatedCodes.length === 0) return;

        // Create meaningful filename
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const prefixStr = prefix ? prefix.replace(/[^a-zA-Z0-9]/g, '') : 'VANISHLY';
        const codeCredits = generatedCodes[0]?.credits || credits;
        const filename = `${prefixStr}_${codeCredits}credits_x${generatedCodes.length}_${dateStr}_${timeStr}.csv`;

        // Just codes, no header
        const csvContent = generatedCodes.map(c => c.code).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('CSV downloaded!');
    };

    const copyAllCodes = () => {
        const allCodes = generatedCodes.map(c => c.code).join('\n');
        navigator.clipboard.writeText(allCodes);
        toast.success('All codes copied!');
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
        toast.success('Code copied!');
    };

    const exportCodes = async () => {
        // Fetch all pending codes for export
        try {
            const token = await getToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/codes?status=pending&page_size=1000`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const text = data.codes.map((c: Code) => `${c.code} (${c.credits} credits)`).join('\n');
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vanishly-codes-${new Date().toISOString().split('T')[0]}.txt`;
                a.click();
                toast.success(`Exported ${data.codes.length} unredeemed codes`);
            }
        } catch (error) {
            toast.error('Failed to export codes');
        }
    };

    const handleSearch = () => {
        setSearchQuery(searchInput);
        setPage(1);
    };

    const clearFilters = () => {
        setStatusFilter('all');
        setCreditsFilter(null);
        setSearchQuery('');
        setSearchInput('');
        setPage(1);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">Redemption Codes</h1>
                <Button variant="outline" onClick={exportCodes}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Unredeemed
                </Button>
            </div>

            {/* Generator */}
            <Card className="bg-gray-900 border-white/10 mb-8">
                <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-white mb-6">Generate Codes</h2>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Credits per code</label>
                            <select
                                value={credits}
                                onChange={(e) => setCredits(Number(e.target.value))}
                                className="w-full px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white"
                            >
                                <option value={10}>10 (Starter - $4.99)</option>
                                <option value={50}>50 (Pro - $19.99)</option>
                                <option value={200}>200 (Business - $59.99)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Number of codes</label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                                className="w-full px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Prefix</label>
                            <input
                                type="text"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value)}
                                placeholder="e.g., TB-"
                                className="w-full px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="glow"
                                className="w-full"
                                onClick={generateCodes}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Generate'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <Card className="bg-gray-900 border-white/10 mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Search codes..."
                                    className="flex-1 px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white placeholder:text-gray-500"
                                />
                                <Button variant="outline" onClick={handleSearch}>
                                    <Search className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value as 'all' | 'pending' | 'redeemed');
                                    setPage(1);
                                }}
                                className="px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="redeemed">Redeemed</option>
                            </select>
                        </div>

                        {/* Credits Filter */}
                        <div>
                            <select
                                value={creditsFilter || ''}
                                onChange={(e) => {
                                    setCreditsFilter(e.target.value ? Number(e.target.value) : null);
                                    setPage(1);
                                }}
                                className="px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white"
                            >
                                <option value="">All Credits</option>
                                <option value="10">10 Credits</option>
                                <option value="50">50 Credits</option>
                                <option value="200">200 Credits</option>
                            </select>
                        </div>

                        {/* Clear Filters */}
                        {(statusFilter !== 'all' || creditsFilter || searchQuery) && (
                            <Button variant="ghost" onClick={clearFilters} className="text-gray-400">
                                Clear filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Codes List */}
            <Card className="bg-gray-900 border-white/10">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">
                            Codes <span className="text-gray-500 text-base">({total} total)</span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : codes.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No codes found</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {codes.map((code, index) => (
                                    <motion.div
                                        key={code.code}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`flex items-center justify-between p-4 rounded-lg ${code.redeemed_by
                                            ? 'bg-gray-800/50'
                                            : 'bg-gray-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-6">
                                            <code className="font-mono text-lg text-white min-w-[140px]">{code.code}</code>
                                            <span className="text-sm text-primary font-medium min-w-[80px]">
                                                {code.credits} credits
                                            </span>
                                            <span className={`text-sm px-2 py-0.5 rounded-full ${code.redeemed_by
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {code.redeemed_by ? 'Redeemed' : 'Pending'}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {new Date(code.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {!code.redeemed_by && (
                                                <button
                                                    onClick={() => copyCode(code.code)}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    {copiedCode === code.code ? (
                                                        <Check className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
                                    <p className="text-sm text-gray-400">
                                        Page {page} of {totalPages}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            Next
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Generated Codes Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Generated Codes</h2>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {generatedCodes.length} code{generatedCodes.length > 1 ? 's' : ''} • {generatedCodes[0]?.credits} credits each
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            {/* Codes List */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-2">
                                    {generatedCodes.map((code, index) => (
                                        <motion.div
                                            key={code.code}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                                        >
                                            <code className="font-mono text-white">{code.code}</code>
                                            <button
                                                onClick={() => copyCode(code.code)}
                                                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                            >
                                                {copiedCode === code.code ? (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center gap-3 p-6 border-t border-white/10">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={copyAllCodes}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy All
                                </Button>
                                <Button
                                    variant="glow"
                                    className="flex-1"
                                    onClick={downloadGeneratedCodes}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download CSV
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
