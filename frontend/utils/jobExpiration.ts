import { Job } from '@/types/job';

/**
 * Checks if a job is older than 24 hours.
 * @param job The job object
 * @returns boolean true if expired
 */
export const isJobExpired = (job: Job): boolean => {
    if (!job.created_at) return false;

    // Safety check: if backend already says expired, trust it (future proofing)
    if (job.status === 'expired') return true;

    const createdAt = new Date(job.created_at);
    // Handle invalid dates
    if (isNaN(createdAt.getTime())) return false;

    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    return hours >= 24;
};

/**
 * Returns the effective status of a job, considering local expiration rules.
 * @param job The job object
 * @returns 'expired' | job.status
 */
export const getEffectiveJobStatus = (job: Job) => {
    if (job.status === 'completed' && isJobExpired(job)) {
        return 'expired';
    }
    return job.status;
};
