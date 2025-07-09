import { describe, it, expect } from 'vitest';
import { encodeBigInt, decodeBigInt, encodeBigInt32, decodeBigInt32 } from './bigint';

describe('encodeBigInt', () => {
    it('should encode zero correctly', () => {
        const result = encodeBigInt(0n);
        expect(result).toEqual(new Uint8Array([0]));
    });

    it('should encode positive numbers correctly', () => {
        // Test small positive number
        const result1 = encodeBigInt(255n);
        expect(result1).toEqual(new Uint8Array([255]));

        // Test larger positive number
        const result2 = encodeBigInt(256n);
        expect(result2).toEqual(new Uint8Array([1, 0]));

        // Test even larger number
        const result3 = encodeBigInt(65536n);
        expect(result3).toEqual(new Uint8Array([1, 0, 0]));
    });

    it('should throw error for negative numbers', () => {
        expect(() => encodeBigInt(-1n)).toThrow("Negative numbers not supported");
        expect(() => encodeBigInt(-255n)).toThrow("Negative numbers not supported");
        expect(() => encodeBigInt(-256n)).toThrow("Negative numbers not supported");
    });

    it('should encode very large numbers', () => {
        const largeNumber = 2n ** 256n - 1n;
        const result = encodeBigInt(largeNumber);
        expect(result.length).toBe(32);
        expect(result[0]).toBe(255);
        expect(result[31]).toBe(255);
    });

    it('should not include unnecessary leading zeros', () => {
        // These should produce minimal byte representations
        const result1 = encodeBigInt(255n);
        expect(result1).toEqual(new Uint8Array([255]));
        
        const result2 = encodeBigInt(256n);
        expect(result2).toEqual(new Uint8Array([1, 0]));
        
        const result3 = encodeBigInt(1n);
        expect(result3).toEqual(new Uint8Array([1]));
    });
});

describe('decodeBigInt', () => {
    it('should decode zero correctly', () => {
        const result = decodeBigInt(new Uint8Array([0]));
        expect(result).toBe(0n);
    });

    it('should decode empty array as zero', () => {
        const result = decodeBigInt(new Uint8Array([]));
        expect(result).toBe(0n);
    });

    it('should decode positive numbers correctly', () => {
        // Test small positive number
        const result1 = decodeBigInt(new Uint8Array([255]));
        expect(result1).toBe(255n);

        // Test larger positive number
        const result2 = decodeBigInt(new Uint8Array([1, 0]));
        expect(result2).toBe(256n);

        // Test even larger number
        const result3 = decodeBigInt(new Uint8Array([1, 0, 0]));
        expect(result3).toBe(65536n);
    });

    it('should decode very large numbers', () => {
        const bytes = new Uint8Array(32);
        bytes.fill(255);
        const result = decodeBigInt(bytes);
        expect(result).toBe(2n ** 256n - 1n);
    });

    it('should handle leading zeros correctly', () => {
        // Leading zeros should not affect the result
        const result1 = decodeBigInt(new Uint8Array([0, 255]));
        expect(result1).toBe(255n);
        
        const result2 = decodeBigInt(new Uint8Array([0, 0, 255]));
        expect(result2).toBe(255n);
        
        const result3 = decodeBigInt(new Uint8Array([0, 1, 0]));
        expect(result3).toBe(256n);
        
        // Multiple leading zeros
        const result4 = decodeBigInt(new Uint8Array([0, 0, 0, 1]));
        expect(result4).toBe(1n);
        
        // All zeros should be zero
        const result5 = decodeBigInt(new Uint8Array([0, 0, 0, 0]));
        expect(result5).toBe(0n);
    });

    it('should handle edge cases with leading zeros', () => {
        // Single leading zero
        const result1 = decodeBigInt(new Uint8Array([0, 1]));
        expect(result1).toBe(1n);
        
        // Leading zeros with larger numbers
        const result2 = decodeBigInt(new Uint8Array([0, 0, 1, 0, 0]));
        expect(result2).toBe(65536n);
    });
});

describe('encode/decode roundtrip', () => {
    it('should maintain integrity for positive numbers', () => {
        const testValues = [0n, 1n, 255n, 256n, 65535n, 65536n, 2n ** 64n - 1n];
        
        for (const value of testValues) {
            const encoded = encodeBigInt(value);
            const decoded = decodeBigInt(encoded);
            expect(decoded).toBe(value);
        }
    });

    it('should handle very large numbers correctly', () => {
        const largePositive = 2n ** 256n - 1n;
        
        expect(decodeBigInt(encodeBigInt(largePositive))).toBe(largePositive);
    });

    it('should maintain integrity when decoding arrays with leading zeros', () => {
        // Even if we decode from arrays with leading zeros, 
        // re-encoding should produce the canonical form
        const withLeadingZeros = new Uint8Array([0, 0, 1, 0]);
        const decoded = decodeBigInt(withLeadingZeros);
        const reencoded = encodeBigInt(decoded);
        
        expect(decoded).toBe(256n);
        expect(reencoded).toEqual(new Uint8Array([1, 0])); // No leading zeros
        
        // Should decode correctly again
        expect(decodeBigInt(reencoded)).toBe(256n);
    });
});

describe('exportBigInt', () => {
    it('should export zero as 32-byte array', () => {
        const result = encodeBigInt32(0n);
        expect(result.length).toBe(32);
        expect(result[31]).toBe(0);
        expect(result.every(byte => byte === 0)).toBe(true);
    });

    it('should export small numbers with proper padding', () => {
        const result = encodeBigInt32(255n);
        expect(result.length).toBe(32);
        expect(result[31]).toBe(255);
        expect(result[30]).toBe(0);
        // Check that all leading bytes are zero
        for (let i = 0; i < 31; i++) {
            expect(result[i]).toBe(0);
        }
    });

    it('should export larger numbers with proper padding', () => {
        const result = encodeBigInt32(256n);
        expect(result.length).toBe(32);
        expect(result[31]).toBe(0);
        expect(result[30]).toBe(1);
        // Check that all leading bytes are zero
        for (let i = 0; i < 30; i++) {
            expect(result[i]).toBe(0);
        }
    });

    it('should export very large numbers correctly', () => {
        // Test with a number that takes exactly 32 bytes
        const largeNumber = 2n ** 256n - 1n;
        const result = encodeBigInt32(largeNumber);
        expect(result.length).toBe(32);
        expect(result[0]).toBe(255);
        expect(result[31]).toBe(255);
        expect(result.every(byte => byte === 255)).toBe(true);
    });

    it('should throw error for negative numbers', () => {
        expect(() => encodeBigInt32(-1n)).toThrow("Negative numbers not supported");
        expect(() => encodeBigInt32(-255n)).toThrow("Negative numbers not supported");
    });

    it('should handle edge cases', () => {
        // Test with 1
        const result1 = encodeBigInt32(1n);
        expect(result1.length).toBe(32);
        expect(result1[31]).toBe(1);
        for (let i = 0; i < 31; i++) {
            expect(result1[i]).toBe(0);
        }

        // Test with max value for one byte
        const result2 = encodeBigInt32(255n);
        expect(result2.length).toBe(32);
        expect(result2[31]).toBe(255);
        for (let i = 0; i < 31; i++) {
            expect(result2[i]).toBe(0);
        }
    });

    it('should be compatible with decodeBigInt', () => {
        const testValues = [0n, 1n, 255n, 256n, 65535n, 65536n, 2n ** 64n - 1n, 2n ** 128n - 1n];
        
        for (const value of testValues) {
            const exported = encodeBigInt32(value);
            const decoded = decodeBigInt(exported);
            expect(decoded).toBe(value);
        }
    });

    it('should handle numbers that require different byte lengths', () => {
        // Test numbers that would normally require 1, 2, 4, 8, 16, 32 bytes
        const testCases = [
            { value: 0xffn, expectedLastByte: 0xff },
            { value: 0xffffn, expectedSecondLastByte: 0xff, expectedLastByte: 0xff },
            { value: 0xffffffffn, expectedAt: 28, expectedValue: 0xff },
            { value: 2n ** 64n - 1n, expectedAt: 24, expectedValue: 0xff },
            { value: 2n ** 128n - 1n, expectedAt: 16, expectedValue: 0xff },
        ];

        for (const testCase of testCases) {
            const result = encodeBigInt32(testCase.value);
            expect(result.length).toBe(32);
            expect(result[31]).toBe(testCase.expectedLastByte || 0xff);
            
            if (testCase.expectedSecondLastByte !== undefined) {
                expect(result[30]).toBe(testCase.expectedSecondLastByte);
            }
            
            if (testCase.expectedAt !== undefined) {
                expect(result[testCase.expectedAt]).toBe(testCase.expectedValue);
            }
        }
    });

    it('should produce consistent results', () => {
        // Same input should always produce same output
        const value = 12345n;
        const result1 = encodeBigInt32(value);
        const result2 = encodeBigInt32(value);
        
        expect(result1).toEqual(result2);
        expect(result1.length).toBe(32);
        expect(result2.length).toBe(32);
    });
});