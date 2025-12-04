'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileUpload } from '../components/ui/FileUpload';
import { toast } from 'sonner';
import { useAuth, SignInButton } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const { isLoaded, userId, getToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<'lama' | 'e2fgvi_hq'>('lama');
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !userId) return;

    setUploading(true);
    try {
      const token = await getToken();

      // Step 1: Upload file to backend
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');
      const { key } = await uploadResponse.json();

      // Step 2: Create job
      const jobResponse = await fetch(`${API_URL}/api/jobs?input_key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ quality }),
      });

      if (!jobResponse.ok) throw new Error('Job creation failed');
      const job = await jobResponse.json();

      toast.success('Video uploaded successfully!');
      router.push(`/job/${job.id}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center py-20 px-4">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-accent/10 rounded-full blur-[100px] -z-10 opacity-30 pointer-events-none" />

      <div className="container max-w-4xl mx-auto relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-6 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>AI-Powered Video Magic</span>
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Remove Watermarks <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-accent glow-text">
                in Seconds
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Professional-grade watermark removal powered by advanced AI.
              Upload your video and let our neural networks do the magic.
            </p>
          </motion.div>
        </div>

        {/* Main Interaction Card */}
        <Card className="max-w-2xl mx-auto border-white/10 hover:border-primary/30 transition-colors duration-300">
          <CardContent className="pt-6">
            {!userId ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Sign in to Start</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Create a free account to upload videos and track your watermark removal history.
                </p>
                <SignInButton mode="modal">
                  <Button size="lg" variant="glow" className="min-w-[200px]">
                    Get Started
                  </Button>
                </SignInButton>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <FileUpload
                  onFileSelect={setFile}
                  selectedFile={file}
                  onClear={() => setFile(null)}
                />

                {/* Quality Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setQuality('lama')}
                    className={`relative p-4 rounded-xl border transition-all duration-300 text-left group ${quality === 'lama'
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${quality === 'lama' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-400'}`}>
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className={`font-semibold mb-1 ${quality === 'lama' ? 'text-white' : 'text-gray-300'}`}>Fast Mode</h3>
                        <p className="text-sm text-gray-500">LaMa Model • 1-2 min</p>
                      </div>
                    </div>
                    {quality === 'lama' && (
                      <motion.div
                        layoutId="active-ring"
                        className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuality('e2fgvi_hq')}
                    className={`relative p-4 rounded-xl border transition-all duration-300 text-left group ${quality === 'e2fgvi_hq'
                        ? 'bg-accent/10 border-accent/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${quality === 'e2fgvi_hq' ? 'bg-accent/20 text-accent' : 'bg-white/10 text-gray-400'}`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className={`font-semibold mb-1 ${quality === 'e2fgvi_hq' ? 'text-white' : 'text-gray-300'}`}>High Quality</h3>
                        <p className="text-sm text-gray-500">E2FGVI Model • 5-10 min</p>
                      </div>
                    </div>
                    {quality === 'e2fgvi_hq' && (
                      <motion.div
                        layoutId="active-ring"
                        className="absolute inset-0 border-2 border-accent rounded-xl pointer-events-none"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full text-lg h-14"
                  variant="glow"
                  disabled={!file || uploading}
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Processing Video...</span>
                    </div>
                  ) : (
                    'Start Removal Magic'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Legal Notice */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-gray-600 mt-8 max-w-lg mx-auto"
        >
          By using this service, you confirm you have the right to modify the uploaded content.
          This tool is intended for personal use on content you own.
        </motion.p>
      </div>
    </main>
  );
}
