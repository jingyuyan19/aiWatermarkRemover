'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Job {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    input_url?: string;
    output_url?: string;
    created_at: string;
}

export default function JobPage() {
    const params = useParams();
    const router = useRouter();
    const jobId = params.id as string;
    const { isLoaded, userId, getToken } = useAuth();
    const [job, setJob] = useState<Job | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (!isLoaded) return;

        if (!userId) {
            router.push('/');
            return;
        }

        const fetchStatus = async () => {
            try {
                const token = await getToken();
                const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                });
                if (!response.ok) {
                    throw new Error('Job not found');
                }
                const data = await response.json();
                setJob(data);
            } catch (err) {
                setError('Failed to fetch job status');
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, [jobId, isLoaded, userId, getToken, router]);


    if (error) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 max-w-md">
                    <p className="text-red-200 text-center">{error}</p>
                </div>
            </main>
        );
    }

    if (!job) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Loading...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto">
                    <Link href="/" className="text-blue-300 hover:text-blue-200 mb-8 inline-block">
                        ← Back to Home
                    </Link>

                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
                        <h1 className="text-3xl font-bold text-white mb-6">
                            Job Status
                        </h1>

                        {/* Status Indicator */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-300">Status:</span>
                                <span className={`px-4 py-2 rounded-full font-semibold ${job.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                    job.status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
                                        job.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                                            'bg-yellow-500/20 text-yellow-300'
                                    }`}>
                                    {job.status.toUpperCase()}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            {(job.status === 'pending' || job.status === 'processing') && (
                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full animate-pulse"
                                        style={{ width: job.status === 'processing' ? '75%' : '25%' }}></div>
                                </div>
                            )}
                        </div>

                        {/* Messages */}
                        {job.status === 'pending' && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                                <p className="text-yellow-200">
                                    ⏳ Your video is in the queue. Processing will begin shortly...
                                </p>
                            </div>
                        )}

                        {job.status === 'processing' && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                                <p className="text-blue-200">
                                    🎬 Processing your video... This may take a few minutes.
                                </p>
                            </div>
                        )}

                        {job.status === 'failed' && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                                <p className="text-red-200">
                                    ❌ Processing failed. Please try again or contact support.
                                </p>
                            </div>
                        )}

                        {/* Result */}
                        {job.status === 'completed' && job.output_url && (
                            <div>
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                                    <p className="text-green-200">
                                        ✅ Your video has been processed successfully!
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Original */}
                                    {job.input_url && (
                                        <div>
                                            <h3 className="text-white font-semibold mb-2">Original</h3>
                                            <video
                                                src={job.input_url}
                                                controls
                                                className="w-full rounded-lg"
                                            />
                                        </div>
                                    )}

                                    {/* Processed */}
                                    <div>
                                        <h3 className="text-white font-semibold mb-2">Processed</h3>
                                        <video
                                            src={job.output_url}
                                            controls
                                            className="w-full rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Download Button */}
                                <a
                                    href={job.output_url}
                                    download
                                    className="mt-6 inline-block w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-8 rounded-lg text-center hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105"
                                >
                                    Download Processed Video
                                </a>
                            </div>
                        )}

                        {/* Job Details */}
                        <div className="mt-8 border-t border-gray-600 pt-6">
                            <p className="text-gray-400 text-sm">
                                Job ID: <span className="text-gray-300 font-mono">{job.id}</span>
                            </p>
                            <p className="text-gray-400 text-sm mt-2">
                                Created: <span className="text-gray-300">{new Date(job.created_at).toLocaleString()}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
