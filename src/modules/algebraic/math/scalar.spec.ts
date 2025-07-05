import { describe, it, expect } from 'vitest';
import { generateRandomScalar } from './scalar';
import { Point } from './point';

describe('generateRandomScalar', () => {
    it('should generate scalars within the default modulus range', () => {
        const defaultModulus = Point.ORDER;
        
        for (let i = 0; i < 100; i++) {
            const scalar = generateRandomScalar();
            expect(scalar).toBeGreaterThanOrEqual(0n);
            expect(scalar).toBeLessThan(defaultModulus);
        }
    });

    it('should generate scalars within custom modulus range', () => {
        const customModulus = 1000n;
        
        for (let i = 0; i < 100; i++) {
            const scalar = generateRandomScalar(customModulus);
            expect(scalar).toBeGreaterThanOrEqual(0n);
            expect(scalar).toBeLessThan(customModulus);
        }
    });

    it('should handle small moduli correctly', () => {
        const smallModulus = 2n;
        
        for (let i = 0; i < 50; i++) {
            const scalar = generateRandomScalar(smallModulus);
            expect(scalar).toBeGreaterThanOrEqual(0n);
            expect(scalar).toBeLessThan(smallModulus);
            expect([0n, 1n]).toContain(scalar);
        }
    });

    it('should handle large moduli correctly', () => {
        const largeModulus = 2n ** 256n;
        
        for (let i = 0; i < 10; i++) {
            const scalar = generateRandomScalar(largeModulus);
            expect(scalar).toBeGreaterThanOrEqual(0n);
            expect(scalar).toBeLessThan(largeModulus);
        }
    });

    it('should throw error for zero modulus', () => {
        expect(() => generateRandomScalar(0n)).toThrow('Modulus must be positive');
    });

    it('should throw error for negative modulus', () => {
        expect(() => generateRandomScalar(-1n)).toThrow('Modulus must be positive');
        expect(() => generateRandomScalar(-100n)).toThrow('Modulus must be positive');
    });

    it('should generate different values on consecutive calls', () => {
        const results = new Set<bigint>();
        
        // Generate multiple scalars and check they're not all the same
        for (let i = 0; i < 50; i++) {
            results.add(generateRandomScalar());
        }
        
        // With a large modulus (Ed25519 curve order), we should get many different values
        expect(results.size).toBeGreaterThan(40); // Allow some duplicates due to randomness
    });

    it('should work with modulus of 1', () => {
        for (let i = 0; i < 10; i++) {
            const scalar = generateRandomScalar(1n);
            expect(scalar).toBe(0n);
        }
    });

    it('should distribute values across the range for small modulus', () => {
        const modulus = 10n;
        const counts = new Map<bigint, number>();
        const iterations = 1000;
        
        // Initialize counts
        for (let i = 0n; i < modulus; i++) {
            counts.set(i, 0);
        }
        
        // Generate many samples
        for (let i = 0; i < iterations; i++) {
            const scalar = generateRandomScalar(modulus);
            const currentCount = counts.get(scalar) || 0;
            counts.set(scalar, currentCount + 1);
        }
        
        // Check that all values appeared at least once (with high probability)
        const allValues = Array.from(counts.values());
        const minCount = Math.min(...allValues);
        const maxCount = Math.max(...allValues);
        
        // With uniform distribution, each value should appear ~100 times
        // Allow significant variance but ensure no value is completely missing
        expect(minCount).toBeGreaterThan(0);
        expect(maxCount).toBeLessThan(iterations * 0.5); // Not too skewed
    });

    it('should be deterministically different from previous calls', () => {
        // This test ensures we're not accidentally returning the same value
        const results: bigint[] = [];
        
        for (let i = 0; i < 10; i++) {
            results.push(generateRandomScalar());
        }
        
        // Check that not all results are identical
        const uniqueResults = new Set(results);
        expect(uniqueResults.size).toBeGreaterThan(1);
    });

    it('should handle Ed25519 curve order correctly', () => {
        const curveOrder = Point.ORDER;
        
        for (let i = 0; i < 10; i++) {
            const scalar = generateRandomScalar(curveOrder);
            expect(scalar).toBeGreaterThanOrEqual(0n);
            expect(scalar).toBeLessThan(curveOrder);
        }
        
        // Also test the default parameter
        for (let i = 0; i < 10; i++) {
            const scalar = generateRandomScalar();
            expect(scalar).toBeGreaterThanOrEqual(0n);
            expect(scalar).toBeLessThan(curveOrder);
        }
    });
}); 