// app/providers/progressRef.ts
export const progressRef: {
    start?: () => void;
    done?: () => void;
    pulse?: (ms?: number) => void;
} = {};
