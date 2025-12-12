export const calculateCost = (duration: number, width: number, height: number, quality: string) => {
    // 1. Grace Period Buffer (5.1s -> 5s)
    const adjustedDuration = Math.max(0, duration - 0.5);

    // 2. Base Duration Score (1 point per 5s, ceiling)
    let baseCredits = Math.ceil(adjustedDuration / 5);
    baseCredits = Math.max(1, baseCredits);

    // 3. Multipliers
    const qualityMult = quality === 'e2fgvi_hq' ? 2 : 1;
    const resolutionMult = Math.max(width, height) > 1920 ? 2 : 1;

    return baseCredits * qualityMult * resolutionMult;
};
