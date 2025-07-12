import { describe, it, expect } from 'vitest';
import { encode253Bits, decode253Bits } from './bits253';
import { Point } from '../point';

describe('253-bit Encoding', () => {
    describe('encode253Bits', () => {
        it('should encode small values correctly', () => {
            const testCases = [
                { data: new Uint8Array([0]), expectZero: true },
                { data: new Uint8Array([1]), expectZero: false },
                { data: new Uint8Array([255]), expectZero: false },
                { data: new Uint8Array([0, 1]), expectZero: false },
                { data: new Uint8Array([255, 255]), expectZero: false },
                { data: new Uint8Array([1, 2, 3, 4, 5]), expectZero: false },
            ];
            
            for (const testCase of testCases) {
                const point = encode253Bits(testCase.data);
                expect(point).toBeInstanceOf(Point);
                if (testCase.expectZero) {
                    expect(point.equals(Point.ZERO)).toBe(true);
                } else {
                    expect(point.equals(Point.ZERO)).toBe(false);
                }
            }
        });
        
        it('should encode up to 32 bytes', () => {
            const data32 = new Uint8Array(32);
            for (let i = 0; i < 32; i++) {
                data32[i] = i;
            }
            // Make sure it's less than 2^253
            data32[31] = 0x1F; // Clear top 3 bits
            
            const point = encode253Bits(data32);
            expect(point).toBeInstanceOf(Point);
        });
        
        it('should reject data larger than 32 bytes', () => {
            const data33 = new Uint8Array(33);
            expect(() => encode253Bits(data33)).toThrow('Maximum 32 bytes allowed');
        });
        
        it('should reject data that exceeds 253 bits', () => {
            const data = new Uint8Array(32);
            data.fill(0xFF); // All bits set
            expect(() => encode253Bits(data)).toThrow('Data exceeds 253 bits');
        });
        
        it('should produce different points for different data', () => {
            const data1 = new Uint8Array([1, 2, 3]);
            const data2 = new Uint8Array([4, 5, 6]);
            
            const point1 = encode253Bits(data1);
            const point2 = encode253Bits(data2);
            
            expect(point1.equals(point2)).toBe(false);
        });
    });
    
    describe('decode253Bits', () => {
        it('should decode encoded values', () => {
            const testData = [
                new Uint8Array([42]),
                new Uint8Array([1, 2, 3]),
                new Uint8Array([255, 254, 253, 252, 251]),
            ];
            
            // Since encode253Bits uses elligatorEncode and decode253Bits uses elligatorDecode,
            // we know that the decode function returns up to 8 possible preimages.
            // We should verify that at least one of these valid preimages, when re-encoded,
            // produces the same point.
            
            for (const data of testData) {
                const point = encode253Bits(data);
                const { mask, values } = decode253Bits(point);
                
                expect(values).toBeInstanceOf(Array);
                expect(values.length).toBe(8); // Always 8 results from elligatorDecode
                expect(typeof mask).toBe('number');
                
                // Count valid preimages
                let validCount = 0;
                for (let i = 0; i < 8; i++) {
                    if (mask & (1 << i)) {
                        validCount++;
                    }
                }
                expect(validCount).toBeGreaterThan(0);
                
                // The decode253Bits function returns raw preimages from elligatorDecode.
                // These are field elements that, when passed through elligatorEncode,
                // should produce the same point. However, not all preimages will match
                // our original input data - they're just valid field elements that
                // encode to the same point.
                
                // For this test, we just verify that we get valid results back
                // and that the mask correctly indicates which values are valid.
                // The actual round-trip test (encoding data and getting it back)
                // is not the purpose of encode253Bits/decode253Bits - that's what
                // lizardEncode/lizardDecode are for.
            }
        });
        
        it('should return consistent results for the same point', () => {
            const data = new Uint8Array([10, 20, 30]);
            const point = encode253Bits(data);
            
            const result1 = decode253Bits(point);
            const result2 = decode253Bits(point);
            
            expect(result1.mask).toBe(result2.mask);
            expect(result1.values.length).toBe(result2.values.length);
            
            for (let i = 0; i < result1.values.length; i++) {
                expect(Array.from(result1.values[i])).toEqual(Array.from(result2.values[i]));
            }
        });
        
        it('should handle zero encoding', () => {
            const zeroData = new Uint8Array([0]);
            const point = encode253Bits(zeroData);
            const { mask, values } = decode253Bits(point);
            
            expect(values.length).toBeGreaterThan(0);
            
            // At least one valid decoding should exist
            const validCount = values.reduce((count, _, i) => 
                count + ((mask & (1 << i)) ? 1 : 0), 0);
            expect(validCount).toBeGreaterThan(0);
        });
        
        it('should handle maximum valid 253-bit values', () => {
            // Create a value just under 2^253
            const maxData = new Uint8Array(32);
            maxData.fill(0xFF);
            maxData[31] = 0x1F; // Clear top 3 bits to stay under 2^253
            
            const point = encode253Bits(maxData);
            const { mask, values } = decode253Bits(point);
            
            expect(values.length).toBeGreaterThan(0);
            const validCount = values.reduce((count, _, i) => 
                count + ((mask & (1 << i)) ? 1 : 0), 0);
            expect(validCount).toBeGreaterThan(0);
        });
    });
    
    describe('Round-trip verification', () => {
        it('should verify that valid preimages encode back to the same point', () => {
            const testData = [
                new Uint8Array([7, 8, 9]),
                new Uint8Array([100, 200]),
                new Uint8Array([0, 0, 0, 1]),
            ];
            
            for (const data of testData) {
                const originalPoint = encode253Bits(data);
                const { mask, values } = decode253Bits(originalPoint);
                
                // Check that at least one valid preimage encodes back to the same point
                let foundMatch = false;
                for (let i = 0; i < values.length; i++) {
                    if (mask & (1 << i)) {
                        try {
                            const reencoded = encode253Bits(values[i]);
                            if (reencoded.equals(originalPoint)) {
                                foundMatch = true;
                                break;
                            }
                        } catch (e) {
                            // Some preimages might exceed 253 bits
                        }
                    }
                }
                
                expect(foundMatch).toBe(true);
            }
        });
    });
});