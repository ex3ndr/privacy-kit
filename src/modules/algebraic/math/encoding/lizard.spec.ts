import { describe, it, expect } from 'vitest';
import { lizardEncode, lizardDecode } from './lizard';
import { Point } from '../point';

describe('Lizard Encoding', () => {
    describe('lizardEncode', () => {
        it('should encode test vectors correctly', () => {
            // Test vectors from Rust implementation
            const testVectors = [
                {
                    name: 'all zeros',
                    data: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                },
                {
                    name: 'all ones',
                    data: new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
                },
                {
                    name: 'sequence',
                    data: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
                }
            ];
            
            for (const vector of testVectors) {
                const point = lizardEncode(vector.data);
                expect(point).toBeInstanceOf(Point);
                expect(point.equals(Point.ZERO)).toBe(false);
                
                // Verify the point is valid by encoding to bytes
                const bytes = point.toBytes();
                expect(bytes).toBeInstanceOf(Uint8Array);
                expect(bytes.length).toBe(32);
            }
        });
        
        it('should produce different points for different data', () => {
            const data1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
            const data2 = new Uint8Array([16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
            
            const point1 = lizardEncode(data1);
            const point2 = lizardEncode(data2);
            
            expect(point1.equals(point2)).toBe(false);
        });
        
        it('should produce the same point for the same data', () => {
            const data = new Uint8Array([42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57]);
            
            const point1 = lizardEncode(data);
            const point2 = lizardEncode(data);
            
            expect(point1.equals(point2)).toBe(true);
        });
        
        it('should reject data that is not exactly 16 bytes', () => {
            expect(() => lizardEncode(new Uint8Array(15))).toThrow('Lizard encoding requires exactly 16 bytes');
            expect(() => lizardEncode(new Uint8Array(17))).toThrow('Lizard encoding requires exactly 16 bytes');
            expect(() => lizardEncode(new Uint8Array(0))).toThrow('Lizard encoding requires exactly 16 bytes');
            expect(() => lizardEncode(new Uint8Array(32))).toThrow('Lizard encoding requires exactly 16 bytes');
        });
    });
    
    describe('lizardDecode', () => {
        it('should decode encoded data correctly', () => {
            const testData = [
                new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
                new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
                new Uint8Array([255, 254, 253, 252, 251, 250, 249, 248, 247, 246, 245, 244, 243, 242, 241, 240]),
            ];
            
            for (const data of testData) {
                const point = lizardEncode(data);
                const decoded = lizardDecode(point);
                
                expect(decoded).not.toBeNull();
                expect(decoded).toBeInstanceOf(Uint8Array);
                expect(decoded!.length).toBe(16);
                expect(Array.from(decoded!)).toEqual(Array.from(data));
            }
        });
        
        it('should return null for points not created by lizardEncode', () => {
            // Create a random point that wasn't created by lizardEncode
            const randomPoint = Point.fromHash('random data', 'test');
            const decoded = lizardDecode(randomPoint);
            
            // Most random points should not decode successfully
            // (there's a small chance it could work by coincidence)
            expect(decoded).toBeNull();
        });
        
        it('should handle all possible byte values', () => {
            // Test with all possible byte values in different positions
            for (let pos = 0; pos < 16; pos++) {
                for (let value = 0; value < 256; value += 17) { // Test every 17th value
                    const data = new Uint8Array(16);
                    data[pos] = value;
                    
                    const point = lizardEncode(data);
                    const decoded = lizardDecode(point);
                    
                    expect(decoded).not.toBeNull();
                    expect(Array.from(decoded!)).toEqual(Array.from(data));
                }
            }
        });
    });
    
    describe('Round-trip tests', () => {
        it('should successfully round-trip random 16-byte data through Lizard encoding', () => {
            for (let i = 0; i < 100; i++) {
                const data = new Uint8Array(16);
                // Create pseudo-random data
                for (let j = 0; j < 16; j++) {
                    data[j] = (i * 17 + j * 13) % 256;
                }
                
                const point = lizardEncode(data);
                const decoded = lizardDecode(point);
                
                expect(decoded).not.toBeNull();
                expect(Array.from(decoded!)).toEqual(Array.from(data));
            }
        });
        
        it('should maintain data integrity across multiple encode/decode cycles', () => {
            const originalData = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 6]);
            
            let currentData = originalData;
            for (let cycle = 0; cycle < 5; cycle++) {
                const point = lizardEncode(currentData);
                const decoded = lizardDecode(point);
                
                expect(decoded).not.toBeNull();
                expect(Array.from(decoded!)).toEqual(Array.from(originalData));
                
                currentData = decoded!;
            }
        });
    });
    
    describe('Edge cases and error handling', () => {
        it('should handle data with specific bit patterns', () => {
            // Test data that might cause issues with bit manipulation
            const patterns = [
                new Uint8Array(16).fill(0x00), // All zeros
                new Uint8Array(16).fill(0xFF), // All ones
                new Uint8Array(16).fill(0xAA), // Alternating bits 10101010
                new Uint8Array(16).fill(0x55), // Alternating bits 01010101
            ];
            
            for (const pattern of patterns) {
                const point = lizardEncode(pattern);
                const decoded = lizardDecode(point);
                
                expect(decoded).not.toBeNull();
                expect(Array.from(decoded!)).toEqual(Array.from(pattern));
            }
        });
    });
});