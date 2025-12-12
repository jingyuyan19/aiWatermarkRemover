// Basic cost calculation
export const calculateCost = (duration: number, width: number, height: number, quality: string) => {
    const { total } = getCostFactors(duration, width, height, quality);
    return total;
};

// Detailed breakdown for UI
export const getCostFactors = (duration: number, width: number, height: number, quality: string) => {
    // 1. Durations (0.5s Buffer, 5s Blocks)
    const adjustedDuration = Math.max(0, duration - 0.5);
    const durationBlocks = Math.max(1, Math.ceil(adjustedDuration / 5));

    // 2. Multipliers
    const qualityMult = quality === 'e2fgvi_hq' ? 2 : 1;
    const resolutionMult = Math.max(width, height) > 1920 ? 2 : 1;

    return {
        base: durationBlocks,
        quality: qualityMult,
        resolution: resolutionMult,
        total: durationBlocks * qualityMult * resolutionMult,
        isLong: durationBlocks > 1,
        isHQ: qualityMult > 1,
        is4K: resolutionMult > 1
    };
};
