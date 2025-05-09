import { describe, expect, it } from 'vitest';

import { monotonicNow } from './monotonicNow';

// A small helper to pause execution for the given milliseconds.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('monotonicNow', () => {
    it('returns a numeric timestamp', () => {
        const now = monotonicNow();
        expect(typeof now).toBe('number');
        expect(Number.isNaN(now)).toBe(false);
    });

    it('is monotonically non-decreasing over time', async () => {
        const t1 = monotonicNow();
        await sleep(5); // wait a few milliseconds
        const t2 = monotonicNow();
        expect(t2).toBeGreaterThanOrEqual(t1);
    });

    it('does not decrease in a tight loop of calls', () => {
        const samples = Array.from({ length: 500 }, () => monotonicNow());
        for (let i = 1; i < samples.length; i++) {
            expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
        }
    });

    it('returns values in milliseconds scale', async () => {
        const start = monotonicNow();
        await sleep(100);
        const end = monotonicNow();
        const diff = end - start;
        // We slept for ~100ms, allow some leeway for timer inaccuracy and scheduler delays.
        expect(diff).toBeGreaterThan(50);
        expect(diff).toBeLessThan(200);
    });
}); 