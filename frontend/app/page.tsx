'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<'lama' | 'e2fgvi_hq'>('lama');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const router = useRouter();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('video/')) {
        setFile(droppedFile);
      } else {
        alert('Please upload a video file');
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      // Step 1: Get presigned URL
      const urlResponse = await fetch(
        `${API_URL}/api/upload-url?filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(file.type)}`,
        { method: 'POST' }
      );
      const { upload_url, key } = await urlResponse.json();

      // Step 2: Upload file directly to S3/R2
      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      // Step 3: Create job
      const jobResponse = await fetch(`${API_URL}/api/jobs?input_key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quality }),
      });

      const job = await jobResponse.json();
      router.push(`/job/${job.id}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">
            AI Watermark Remover
          </h1>
          <p className="text-xl text-gray-300">
            Remove watermarks from your AI-generated videos in seconds
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Legal Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <p className="text-yellow-200 text-sm">
              ⚠️ This tool must only be used on videos you generated yourself. By using this service, you confirm you have the right to remove the watermark.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive
                ? 'border-blue-400 bg-blue-400/10'
                : 'border-gray-400 hover:border-gray-300'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                accept="video/*"
                onChange={handleChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="text-white">
                    <svg className="w-16 h-16 mx-auto mb-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-lg font-semibold">{file.name}</p>
                    <p className="text-sm text-gray-300 mt-2">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-white">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-lg font-semibold mb-2">
                      Drag & drop your video here
                    </p>
                    <p className="text-sm text-gray-300">
                      or click to browse
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Quality Selection */}
            <div className="mt-6">
              <label className="block text-white font-semibold mb-3">
                Processing Quality
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setQuality('lama')}
                  className={`p-4 rounded-lg border-2 transition-all ${quality === 'lama'
                    ? 'border-blue-400 bg-blue-400/20'
                    : 'border-gray-400 bg-white/5 hover:border-gray-300'
                    }`}
                >
                  <div className="text-white">
                    <p className="font-semibold">Fast</p>
                    <p className="text-sm text-gray-300">LaMa (1-2 min)</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setQuality('e2fgvi_hq')}
                  className={`p-4 rounded-lg border-2 transition-all ${quality === 'e2fgvi_hq'
                    ? 'border-blue-400 bg-blue-400/20'
                    : 'border-gray-400 bg-white/5 hover:border-gray-300'
                    }`}
                >
                  <div className="text-white">
                    <p className="font-semibold">High Quality</p>
                    <p className="text-sm text-gray-300">E2FGVI (5-10 min)</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full mt-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105"
            >
              {uploading ? 'Uploading...' : 'Remove Watermark'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
