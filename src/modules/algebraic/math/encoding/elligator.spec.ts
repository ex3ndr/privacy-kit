import { describe, it, expect } from 'vitest';
import { elligatorDecode, elligatorEncode } from './elligator';
import { generateRandomScalar } from '../scalar';
import { decodeBigInt32 } from '@/modules/formats/bigint';

function arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

describe('elligator', () => {
    it('should match dalek elligator_vs_ristretto_sage test vectors', () => {
        // Test vectors from curve25519-dalek elligator_vs_ristretto_sage test
        const testVectors = [
            {
                input: [
                    184, 249, 135, 49, 253, 123, 89, 113, 67, 160, 6, 239, 7, 105, 211, 41, 192, 249,
                    185, 57, 9, 102, 70, 198, 15, 127, 7, 26, 160, 102, 134, 71,
                ],
                expected: [
                    176, 157, 237, 97, 66, 29, 140, 166, 168, 94, 26, 157, 212, 216, 229, 160, 195,
                    246, 232, 239, 169, 112, 63, 193, 64, 32, 152, 69, 11, 190, 246, 86,
                ]
            },
            {
                input: [
                    229, 14, 241, 227, 75, 9, 118, 60, 128, 153, 226, 21, 183, 217, 91, 136, 98, 0,
                    231, 156, 124, 77, 82, 139, 142, 134, 164, 169, 169, 62, 250, 52,
                ],
                expected: [
                    234, 141, 77, 203, 181, 225, 250, 74, 171, 62, 15, 118, 78, 212, 150, 19, 131, 14,
                    188, 238, 194, 244, 141, 138, 166, 162, 83, 122, 228, 201, 19, 26,
                ]
            },
            {
                input: [
                    115, 109, 36, 220, 180, 223, 99, 6, 204, 169, 19, 29, 169, 68, 84, 23, 21, 109,
                    189, 149, 127, 205, 91, 102, 172, 35, 112, 35, 134, 69, 186, 34,
                ],
                expected: [
                    232, 231, 51, 92, 5, 168, 80, 36, 173, 179, 104, 68, 186, 149, 68, 40, 140, 170,
                    27, 103, 99, 140, 21, 242, 43, 62, 250, 134, 208, 255, 61, 89,
                ]
            },
            {
                input: [
                    16, 49, 96, 107, 171, 199, 164, 9, 129, 16, 64, 62, 241, 63, 132, 173, 209, 160,
                    112, 215, 105, 50, 157, 81, 253, 105, 1, 154, 229, 25, 120, 83,
                ],
                expected: [
                    208, 120, 140, 129, 177, 179, 237, 159, 252, 160, 28, 13, 206, 5, 211, 241, 192,
                    218, 1, 97, 130, 241, 20, 169, 119, 46, 246, 29, 79, 80, 77, 84,
                ]
            },
            {
                input: [
                    156, 131, 161, 162, 236, 251, 5, 187, 167, 171, 17, 178, 148, 210, 90, 207, 86, 21,
                    79, 161, 167, 215, 234, 1, 136, 242, 182, 248, 38, 85, 79, 86,
                ],
                expected: [
                    202, 11, 236, 145, 58, 12, 181, 157, 209, 6, 213, 88, 75, 147, 11, 119, 191, 139,
                    47, 142, 33, 36, 153, 193, 223, 183, 178, 8, 205, 120, 248, 110,
                ]
            },
            {
                input: [
                    251, 177, 124, 54, 18, 101, 75, 235, 245, 186, 19, 46, 133, 157, 229, 64, 10, 136,
                    181, 185, 78, 144, 254, 167, 137, 49, 107, 10, 61, 10, 21, 25,
                ],
                expected: [
                    26, 66, 231, 67, 203, 175, 116, 130, 32, 136, 62, 253, 215, 46, 5, 214, 166, 248,
                    108, 237, 216, 71, 244, 173, 72, 133, 82, 6, 143, 240, 104, 41,
                ]
            },
            {
                input: [
                    232, 193, 20, 68, 240, 77, 186, 77, 183, 40, 44, 86, 150, 31, 198, 212, 76, 81, 3,
                    217, 197, 8, 126, 128, 126, 152, 164, 208, 153, 44, 189, 77,
                ],
                expected: [
                    40, 157, 102, 96, 201, 223, 200, 197, 150, 181, 106, 83, 103, 126, 143, 33, 145,
                    230, 78, 6, 171, 146, 210, 143, 112, 5, 245, 23, 183, 138, 18, 120,
                ]
            },
            {
                input: [
                    173, 229, 149, 177, 37, 230, 30, 69, 61, 56, 172, 190, 219, 115, 167, 194, 71, 134,
                    59, 75, 28, 244, 118, 26, 162, 97, 64, 16, 15, 189, 30, 64,
                ],
                expected: [
                    220, 37, 27, 203, 239, 196, 176, 131, 37, 66, 188, 243, 185, 250, 113, 23, 167,
                    211, 154, 243, 168, 215, 54, 171, 159, 36, 195, 81, 13, 150, 43, 43,
                ]
            },
            {
                input: [
                    106, 71, 61, 107, 250, 117, 42, 151, 91, 202, 212, 100, 52, 188, 190, 21, 125, 218,
                    31, 18, 253, 241, 160, 133, 57, 242, 3, 164, 189, 68, 111, 75,
                ],
                expected: [
                    232, 121, 176, 222, 183, 196, 159, 90, 238, 193, 105, 52, 101, 167, 244, 170, 121,
                    114, 196, 6, 67, 152, 80, 185, 221, 7, 83, 105, 176, 208, 224, 121,
                ]
            },
            {
                input: [
                    112, 204, 182, 90, 220, 198, 120, 73, 173, 107, 193, 17, 227, 40, 162, 36, 150,
                    141, 235, 55, 172, 183, 12, 39, 194, 136, 43, 153, 244, 118, 91, 89,
                ],
                expected: [
                    226, 181, 183, 52, 241, 163, 61, 179, 221, 207, 220, 73, 245, 242, 25, 236, 67, 84,
                    179, 222, 167, 62, 167, 182, 32, 9, 92, 30, 165, 127, 204, 68,
                ]
            },
            {
                input: [
                    111, 24, 203, 123, 254, 189, 11, 162, 51, 196, 163, 136, 204, 143, 10, 222, 33,
                    112, 81, 205, 34, 35, 8, 66, 90, 6, 164, 58, 170, 177, 34, 25,
                ],
                expected: [
                    226, 119, 16, 242, 200, 139, 240, 87, 11, 222, 92, 146, 156, 243, 46, 119, 65, 59,
                    1, 248, 92, 183, 50, 175, 87, 40, 206, 53, 208, 220, 148, 13,
                ]
            },
            {
                input: [
                    225, 183, 30, 52, 236, 82, 6, 183, 109, 25, 227, 181, 25, 82, 41, 193, 80, 77, 161,
                    80, 242, 203, 79, 204, 136, 245, 131, 110, 237, 106, 3, 58,
                ],
                expected: [
                    70, 240, 79, 112, 54, 157, 228, 146, 74, 122, 216, 88, 232, 62, 158, 13, 14, 146,
                    115, 117, 176, 222, 90, 225, 244, 23, 94, 190, 150, 7, 136, 96,
                ]
            },
            {
                input: [
                    207, 246, 38, 56, 30, 86, 176, 90, 27, 200, 61, 42, 221, 27, 56, 210, 79, 178, 189,
                    120, 68, 193, 120, 167, 77, 185, 53, 197, 124, 128, 191, 126,
                ],
                expected: [
                    22, 71, 241, 103, 45, 193, 195, 144, 183, 101, 154, 50, 39, 68, 49, 110, 51, 44,
                    62, 0, 229, 113, 72, 81, 168, 29, 73, 106, 102, 40, 132, 24,
                ]
            },
            {
                input: [
                    1, 136, 215, 80, 240, 46, 63, 147, 16, 244, 230, 207, 82, 189, 74, 50, 106, 169,
                    138, 86, 30, 131, 214, 202, 166, 125, 251, 228, 98, 24, 36, 21,
                ],
                expected: [
                    196, 133, 107, 11, 130, 105, 74, 33, 204, 171, 133, 221, 174, 193, 241, 36, 38,
                    179, 196, 107, 219, 185, 181, 253, 228, 47, 155, 42, 231, 73, 41, 78,
                ]
            },
            {
                input: [
                    210, 207, 228, 56, 155, 116, 207, 54, 84, 195, 251, 215, 249, 199, 116, 75, 109,
                    239, 196, 251, 194, 246, 252, 228, 70, 146, 156, 35, 25, 39, 241, 4,
                ],
                expected: [
                    58, 255, 225, 197, 115, 208, 160, 143, 39, 197, 82, 69, 143, 235, 92, 170, 74, 40,
                    57, 11, 171, 227, 26, 185, 217, 207, 90, 185, 197, 190, 35, 60,
                ]
            },
            {
                input: [
                    34, 116, 123, 9, 8, 40, 93, 189, 9, 103, 57, 103, 66, 227, 3, 2, 157, 107, 134,
                    219, 202, 74, 230, 154, 78, 107, 219, 195, 214, 14, 84, 80,
                ],
                expected: [
                    88, 43, 92, 118, 223, 136, 105, 145, 238, 186, 115, 8, 214, 112, 153, 253, 38, 108,
                    205, 230, 157, 130, 11, 66, 101, 85, 253, 110, 110, 14, 148, 112,
                ]
            }
        ];

        // First check which tests pass
        const results = [];

        for (let idx = 0; idx < testVectors.length; idx++) {
            const { input, expected } = testVectors[idx];

            // Convert input bytes to bigint (little-endian)
            let r0 = 0n;
            for (let i = 0; i < 32; i++) {
                r0 += (BigInt(input[i]) << BigInt(8 * i));
            }

            // Encode using elligator
            const point = elligatorEncode(r0);

            // Get compressed bytes
            const compressed = point.toBytes();
            const actual = Array.from(compressed);

            const passed = arraysEqual(actual, expected);
            results.push({ idx, passed });

            if (idx === 0 || idx === 1) {
                console.log(`Test ${idx}: ${passed ? 'PASS' : 'FAIL'}`);
                if (!passed) {
                    console.log('  Expected first 4:', expected.slice(0, 4));
                    console.log('  Got first 4:', actual.slice(0, 4));
                }
            }
        }

        const passCount = results.filter(r => r.passed).length;
        const failCount = results.filter(r => !r.passed).length;

        console.log(`\nResults: ${passCount} passed, ${failCount} failed out of ${testVectors.length} tests`);

        // Still run the assertions
        for (let idx = 0; idx < testVectors.length; idx++) {
            const { input, expected } = testVectors[idx];
            let r0 = 0n;
            for (let i = 0; i < 32; i++) {
                r0 += (BigInt(input[i]) << BigInt(8 * i));
            }
            const point = elligatorEncode(r0);
            const compressed = point.toBytes();
            expect(Array.from(compressed)).toEqual(expected);
        }
    });

    it('should decode encoded points back to field elements', () => {
        // Test with some known field elements
        const testValues = [0n, 1n, 2n, 42n, 1337n];

        for (const r0 of testValues) {
            // Encode to get a point
            const point = elligatorEncode(r0);

            // Decode to get possible preimages
            const preimages = elligatorDecode(point);

            // Check that we get up to 8 results
            expect(preimages.length).toBeLessThanOrEqual(8);
            expect(preimages.length).toBeGreaterThan(0);

            // Check if any of the valid preimages encode back to the same point
            let foundMatch = false;
            for (const preimage of preimages) {
                if (preimage.isValid) {
                    try {
                        const reencoded = elligatorEncode(preimage.value);
                        if (point.equals(reencoded)) {
                            foundMatch = true;
                            break;
                        }
                    } catch (e) {
                        // Some preimages might not be valid for encoding
                    }
                }
            }

            // We should find at least one matching preimage
            expect(foundMatch).toBe(true);
        }
    });


    it('should handle random points', () => {
        for (let i = 0; i < 1000; i++) {
            // Generate a random scalar
            const r0 = generateRandomScalar();

            // Encode to get a point
            const point = elligatorEncode(r0);

            // Decode to get possible preimages
            const preimages = elligatorDecode(point);

            // Should get some results
            expect(preimages.length).toBeGreaterThan(0);
            expect(preimages.length).toBeLessThanOrEqual(8);

            // Count valid preimages
            const validCount = preimages.filter(p => p.isValid).length;
            console.log(`Test ${i}: Found ${validCount} valid preimages out of ${preimages.length}`);
        }
    });

    it('should return consistent results for the same point', () => {
        const r0 = 12345n;
        const point = elligatorEncode(r0);

        // Decode multiple times
        const results1 = elligatorDecode(point);
        const results2 = elligatorDecode(point);

        // Should get the same number of results
        expect(results1.length).toBe(results2.length);

        // Results should be the same
        for (let i = 0; i < results1.length; i++) {
            expect(results1[i].value).toBe(results2[i].value);
            expect(results1[i].isValid).toBe(results2[i].isValid);
        }
    });

    it('should handle edge cases', () => {
        // Test with the identity point
        const identity = elligatorEncode(0n);
        const identityPreimages = elligatorDecode(identity);

        expect(identityPreimages.length).toBeGreaterThan(0);

        // Test with a point from a large field element
        const largeValue = decodeBigInt32(new Uint8Array([
            168, 27, 92, 74, 203, 42, 48, 117, 170, 109, 234, 14, 45, 169, 188, 205, 21,
            110, 235, 115, 153, 84, 52, 117, 151, 235, 123, 244, 88, 85, 179, 5,
        ]));
        const largePoint = elligatorEncode(largeValue);
        const largePreimages = elligatorDecode(largePoint);

        expect(largePreimages.length).toBeGreaterThan(0);
    });
});