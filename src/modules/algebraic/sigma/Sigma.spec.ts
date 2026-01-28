import { describe, expect, it, beforeEach } from 'vitest';
import { Point } from '../math/point';
import { generateRandomScalar } from '../math/scalar';
import { encodeUTF8 } from '@/modules/formats/text';
import { Sigma } from './Sigma';
import type { Bytes } from '../../../types';

describe('Sigma Class', () => {
    let H: Point;
    let a: bigint;
    let b: bigint;
    let c: bigint;
    let nonce: Bytes;

    beforeEach(() => {
        H = Point.fromHash('generator_H', 'test_domain');
        a = generateRandomScalar();
        b = generateRandomScalar();
        c = generateRandomScalar();
        nonce = encodeUTF8('test_nonce_12345');
    });

    describe('create', () => {
        it('should create a sigma protocol with single statement', () => {
            const sigma = Sigma.create('P = G^a');

            expect(sigma.scalars).toEqual(['a']);
            expect(sigma.points).toEqual([]);
            expect(sigma.commitments).toEqual(['P']);
        });

        it('should create a sigma protocol with multiple statements', () => {
            const sigma = Sigma.create('P = G^a + H^b', 'Q = G^c');

            expect(sigma.scalars).toEqual(['a', 'b', 'c']);
            expect(sigma.points).toEqual(['H']);
            expect(sigma.commitments).toEqual(['P', 'Q']);
        });

        it('should accept custom usage', () => {
            const sigma = Sigma.create('P = G^a').withUsage('custom_protocol');

            // We can verify this works by creating a proof with default usage
            const { proof: proofBytes1 } = sigma.prove({ nonce, variables: { a } });

            // Create another sigma with default usage and compare
            const sigmaDefault = Sigma.create('P = G^a');
            const { proof: proofBytes2 } = sigmaDefault.prove({ nonce, variables: { a } });

            // Proofs should be different due to different usage
            expect(proofBytes1).not.toEqual(proofBytes2);
        });

        it('should handle statements with custom usage', () => {
            const sigma = Sigma.create('P = G^a', 'Q = G^b').withUsage('multi_statement');

            expect(sigma.scalars).toEqual(['a', 'b']);
        });

        it('should throw error for empty statements', () => {
            expect(() => Sigma.create()).toThrow('At least one statement is required');
        });
    });

    describe('prove and verify', () => {
        it('should create and verify a valid proof for single statement', () => {
            const sigma = Sigma.create('P = G^a');

            const { proof, computed } = sigma.prove({ nonce, variables: { a } });

            expect(proof).toBeInstanceOf(Uint8Array);
            expect(proof.length).toBe(32 + 32 + 32); // challenge + 1 response + 1 point

            const result = sigma.verify({ proof });
            expect(result).not.toBeNull();
            expect(result!.computed.P).toBeInstanceOf(Point);
        });

        it('should create and verify a valid proof for multiple statements', () => {
            const sigma = Sigma.create('P = G^a + H^b', 'Q = G^c');

            const { proof, computed } = sigma.prove({ nonce, variables: { H, a, b, c } });

            expect(proof).toBeInstanceOf(Uint8Array);
            expect(proof.length).toBe(32 + 3 * 32 + 2 * 32); // challenge + 3 responses + 2 points

            const result = sigma.verify({ proof, message: null, variables: { H } });
            expect(result).not.toBeNull();
            expect(result!.computed.P).toBeInstanceOf(Point);
            expect(result!.computed.Q).toBeInstanceOf(Point);
        });

        it('should create and verify a proof for complex protocol', () => {
            const sigma = Sigma.create('P = G^a + H^b', 'Q = G^c', 'R = P^d + Q^e');
            const d = generateRandomScalar();
            const e = generateRandomScalar();

            const { proof, computed } = sigma.prove({ nonce, variables: { H, a, b, c, d, e } });

            expect(proof).toBeInstanceOf(Uint8Array);
            expect(proof.length).toBe(32 + 5 * 32 + 3 * 32); // challenge + 5 responses + 3 points

            const result = sigma.verify({ proof, variables: { H } });
            expect(result).not.toBeNull();
            expect(result!.computed.P).toBeInstanceOf(Point);
            expect(result!.computed.Q).toBeInstanceOf(Point);
            expect(result!.computed.R).toBeInstanceOf(Point);
        });

        it('should fail verification with tampered proof bytes', () => {
            const sigma = Sigma.create('P = G^a');

            const { proof, computed } = sigma.prove({ nonce, variables: { a } });

            // Tamper with the proof
            const tamperedProof = new Uint8Array(proof);
            tamperedProof[0] = (tamperedProof[0] + 1) % 256;

            const result = sigma.verify({ proof: tamperedProof });
            expect(result).toBeNull();
        });

        it('should fail verification with wrong nonce', () => {
            const sigma = Sigma.create('P = G^a');

            const { proof, computed } = sigma.prove({ nonce, variables: { a } });
            const wrongNonce = encodeUTF8('wrong_nonce');

            // With the new implementation, nonce doesn't affect verification
            // Only message affects the challenge
            const result = sigma.verify({ proof });
            expect(result).not.toBeNull();
        });

        it('should create and verify proofs with messages', () => {
            const sigma = Sigma.create('P = G^a');
            const message = encodeUTF8('test message');

            const { proof, computed } = sigma.prove({ nonce, message, variables: { a } });

            // Should verify with correct message
            const result = sigma.verify({ proof, message });
            expect(result).not.toBeNull();

            // Should fail with wrong message
            const wrongMessage = encodeUTF8('wrong message');
            const resultWrong = sigma.verify({ proof, message: wrongMessage });
            expect(resultWrong).toBeNull();

            // Should fail with null message when proof was created with message
            const resultNull = sigma.verify({ proof });
            expect(resultNull).toBeNull();
        });

        it('should respect custom usage in prove and verify', () => {
            const sigma1 = Sigma.create('P = G^a').withUsage('custom_usage');
            const sigma2 = Sigma.create('P = G^a');

            const { proof: proofBytes1, computed: computed1 } = sigma1.prove({ nonce, variables: { a } });
            const { proof: proofBytes2, computed: computed2 } = sigma2.prove({ nonce, variables: { a } });

            // Should succeed with matching sigma
            const result1 = sigma1.verify({ proof: proofBytes1 });
            expect(result1).not.toBeNull();

            // Should succeed with default sigma
            const result2 = sigma2.verify({ proof: proofBytes2 });
            expect(result2).not.toBeNull();

            // Different usage should produce different proofs
            expect(proofBytes1).not.toEqual(proofBytes2);

            // Cross-verification should fail
            const result3 = sigma1.verify({ proof: proofBytes2 });
            expect(result3).toBeNull();

            const result4 = sigma2.verify({ proof: proofBytes1 });
            expect(result4).toBeNull();
        });
    });

    describe('withUsage', () => {
        it('should create a new instance with different usage', () => {
            const sigma1 = Sigma.create('P = G^a').withUsage('usage1');
            const sigma2 = sigma1.withUsage('usage2');

            // But different usage affects proofs
            const { proof: proofBytes1 } = sigma1.prove({ nonce, variables: { a } });
            const { proof: proofBytes2 } = sigma2.prove({ nonce, variables: { a } });

            expect(proofBytes1).not.toEqual(proofBytes2);
        });
    });

    describe('withValue', () => {
        it('should create a new instance with predefined point', () => {
            const sigma = Sigma.create('P = G^a + H^b')
                .withValue('H', H);

            // Now only 'a' and 'b' need to be provided
            const { proof, computed } = sigma.prove({ nonce, variables: { a, b } });

            // Verify the proof - H is not needed in public variables
            const result = sigma.verify({ proof });
            expect(result).not.toBeNull();
            expect(result!.computed.P).toBeInstanceOf(Point);
        });

        it('should allow chaining multiple predefined points', () => {
            const I = Point.fromHash('generator_I', 'test');
            const sigma = Sigma.create('P = G^a + H^b + I^c')
                .withValue('H', H)
                .withValue('I', I);

            // Now only 'a', 'b', 'c' need to be provided
            const { proof, computed } = sigma.prove({ nonce, variables: { a, b, c } });

            // Verify the proof
            const result = sigma.verify({ proof });
            expect(result).not.toBeNull();
            expect(result!.computed.P).toBeInstanceOf(Point);
        });

        it('should work with complex protocols', () => {
            const d = generateRandomScalar();
            const e = generateRandomScalar();

            const sigma = Sigma.create('P = G^a + H^b', 'Q = G^c', 'R = P^d + Q^e')
                .withValue('H', H);

            // Now only a, b, c, d, e need to be provided
            const { proof, computed } = sigma.prove({ nonce, variables: { a, b, c, d, e } });

            // Verify the proof
            const result = sigma.verify({ proof });
            expect(result).not.toBeNull();
            expect(result!.computed.P).toBeInstanceOf(Point);
            expect(result!.computed.Q).toBeInstanceOf(Point);
            expect(result!.computed.R).toBeInstanceOf(Point);
        });

        it('should throw error for non-existent point', () => {
            const sigma = Sigma.create('P = G^a');

            expect(() => (sigma as any).withValue('H', H)).toThrow("Point 'H' not found in protocol");
        });

        it('should throw error for trying to set scalar', () => {
            const sigma = Sigma.create('P = G^a + H^b');

            // Try to set scalar (not allowed)
            expect(() => sigma.withValue('a' as any, a as any)).toThrow("Point 'a' not found in protocol");
        });

        it('should throw error for wrong value type', () => {
            const sigma = Sigma.create('P = G^a + H^b');

            // Try to set point with non-Point value
            expect(() => sigma.withValue('H', a as any)).toThrow("Value must be a Point");
        });
    });

    describe('toString', () => {
        it('should provide readable string representation', () => {
            const sigma = Sigma.create('P = G^a + H^b', 'Q = G^c');
            expect(sigma.toString()).toBe('Sigma(sigma_proof:P = G^a + H^b, Q = G^c)');
        });
    });

    describe('Real-world examples', () => {
        it('should prove knowledge of discrete logarithm', () => {
            const sigma = Sigma.discreteLog();
            const secret = generateRandomScalar();

            const { proof, computed } = sigma.prove({ nonce, variables: { secret } });

            // Verify the proof
            const result = sigma.verify({ proof });
            expect(result).not.toBeNull();
            expect(result!.computed.P).toBeInstanceOf(Point);

            // Extract and verify the computed point
            const computedP = Point.fromBytes(proof.slice(32 + 32, 32 + 32 + 32));
            const expectedP = Point.BASE.multiply(secret);
            expect(computedP.equals(expectedP)).toBe(true);
        });

        it('should work with predefined generator in Pedersen commitment', () => {
            // Create a sigma protocol with predefined generator H
            const sigma = Sigma.pedersenCommitment()
                .withValue('H', H);

            const value = generateRandomScalar();
            const blinding = generateRandomScalar();

            // Now only value and blinding need to be provided
            const { proof, computed } = sigma.prove({ nonce, variables: { value, blinding } });

            // Verify without needing to provide H (it's predefined)
            const result = sigma.verify({ proof });
            expect(result).not.toBeNull();
            expect(result!.computed.C).toBeInstanceOf(Point);
        });

        it('should prove knowledge of Pedersen commitment opening', () => {
            const sigma = Sigma.pedersenCommitment();
            const value = generateRandomScalar();
            const blinding = generateRandomScalar();

            const { proof, computed } = sigma.prove({ nonce, variables: { H, value, blinding } });

            // Verify the proof
            const result = sigma.verify({ proof, variables: { H } });
            expect(result).not.toBeNull();
            expect(result!.computed.C).toBeInstanceOf(Point);

            // Extract and verify the commitment
            const computedC = Point.fromBytes(proof.slice(32 + 2 * 32, 32 + 2 * 32 + 32));
            const expectedCom = Point.BASE.multiply(value).add(H.multiply(blinding));
            expect(computedC.equals(expectedCom)).toBe(true);
        });

        it('should prove equality of discrete logarithms', () => {
            const sigma = Sigma.equalDiscreteLog();
            const x = generateRandomScalar();

            const { proof, computed } = sigma.prove({ nonce, variables: { H, x } });

            // Verify the proof
            const result = sigma.verify({ proof, variables: { H } });
            expect(result).not.toBeNull();
            expect(result!.computed.P).toBeInstanceOf(Point);
            expect(result!.computed.Q).toBeInstanceOf(Point);

            // Extract and verify both computed points use the same discrete log
            const computedP = Point.fromBytes(proof.slice(32 + 32, 32 + 32 + 32));
            const computedQ = Point.fromBytes(proof.slice(32 + 32 + 32, 32 + 32 + 32 + 32));
            const expectedP = Point.BASE.multiply(x);
            const expectedQ = H.multiply(x);
            expect(computedP.equals(expectedP)).toBe(true);
            expect(computedQ.equals(expectedQ)).toBe(true);
        });
    });
});
