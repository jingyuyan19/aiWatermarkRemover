export interface Job {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'; // Added 'expired' for frontend logic
    input_url: string | null;
    output_url: string | null;
    quality: string;
    cost: number;
    created_at: string;
    progress?: number; // Optional as not all endpoints return it
    error_message?: string;
    thumbnail_url?: string;
}
