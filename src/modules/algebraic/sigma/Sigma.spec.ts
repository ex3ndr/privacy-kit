import { describe, expect, it, beforeEach } from 'vitest';
import { Point } from '../math/point';
import { generateRandomScalar } from '../math/scalar';
import { encodeUTF8 } from '@/modules/formats/text';
import { Sigma } from './Sigma';

describe('Sigma Class', () => {
    let H: Point;
    let a: bigint;
    let b: bigint;
    let c: bigint;
    let nonce: Uint8Array;

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
            const { proof: proof1 } = sigma.prove({ a }, nonce);
            
            // Create another sigma with default usage and compare
            const sigmaDefault = Sigma.create('P = G^a');
            const { proof: proof2 } = sigmaDefault.prove({ a }, nonce);
            
            // Proofs should be different due to different usage
            expect(proof1.challenge).not.toEqual(proof2.challenge);
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
            
            const { proof, commitments } = sigma.prove({ a }, nonce);
            
            expect(commitments.P).toBeInstanceOf(Point);
            expect(proof.challenge).toBeGreaterThan(0n);
            
            const isValid = sigma.verify(proof, commitments, nonce);
            expect(isValid).toBe(true);
        });

        it('should create and verify a valid proof for multiple statements', () => {
            const sigma = Sigma.create('P = G^a + H^b', 'Q = G^c');
            
            const { proof, commitments } = sigma.prove({ H, a, b, c }, nonce);
            
            expect(commitments.P).toBeInstanceOf(Point);
            expect(commitments.Q).toBeInstanceOf(Point);
            
            const isValid = sigma.verify(proof, { H, ...commitments }, nonce);
            expect(isValid).toBe(true);
        });

        it('should create and verify a proof for complex protocol', () => {
            const sigma = Sigma.create('P = G^a + H^b', 'Q = G^c', 'R = P^d + Q^e');
            const d = generateRandomScalar();
            const e = generateRandomScalar();
            
            const { proof, commitments } = sigma.prove({ H, a, b, c, d, e }, nonce);
            
            expect(commitments.P).toBeInstanceOf(Point);
            expect(commitments.Q).toBeInstanceOf(Point);
            expect(commitments.R).toBeInstanceOf(Point);
            
            const isValid = sigma.verify(proof, { H, ...commitments }, nonce);
            expect(isValid).toBe(true);
        });

        it('should fail verification with wrong public variables', () => {
            const sigma = Sigma.create('P = G^a');
            
            const { proof } = sigma.prove({ a }, nonce);
            const wrongP = Point.fromHash('wrong_point', 'test');
            
            const isValid = sigma.verify(proof, { P: wrongP }, nonce);
            expect(isValid).toBe(false);
        });

        it('should fail verification with wrong nonce', () => {
            const sigma = Sigma.create('P = G^a');
            
            const { proof, commitments } = sigma.prove({ a }, nonce);
            const wrongNonce = encodeUTF8('wrong_nonce');
            
            const isValid = sigma.verify(proof, commitments, wrongNonce);
            expect(isValid).toBe(false);
        });

        it('should respect custom usage in prove and verify', () => {
            const sigma1 = Sigma.create('P = G^a').withUsage('custom_usage');
            const sigma2 = Sigma.create('P = G^a');
            
            const { proof: proof1, commitments: commitments1 } = sigma1.prove({ a }, nonce);
            const { proof: proof2, commitments: commitments2 } = sigma2.prove({ a }, nonce);
            
            // Should succeed with matching sigma
            const isValid1 = sigma1.verify(proof1, commitments1, nonce);
            expect(isValid1).toBe(true);
            
            // Should succeed with default sigma
            const isValid2 = sigma2.verify(proof2, commitments2, nonce);
            expect(isValid2).toBe(true);
            
            // Different usage should produce different proofs
            expect(proof1.challenge).not.toEqual(proof2.challenge);
        });
    });

    describe('withUsage', () => {
        it('should create a new instance with different usage', () => {
            const sigma1 = Sigma.create('P = G^a').withUsage('usage1');
            const sigma2 = sigma1.withUsage('usage2');
            
            // But different usage affects proofs
            const { proof: proof1 } = sigma1.prove({ a }, nonce);
            const { proof: proof2 } = sigma2.prove({ a }, nonce);
            
            expect(proof1.challenge).not.toEqual(proof2.challenge);
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
            
            const { proof, commitments } = sigma.prove({ secret }, nonce);
            
            // Verify the commitment is correct
            const expectedP = Point.BASE.multiply(secret);
            expect(commitments.P.equals(expectedP)).toBe(true);
            
            // Verify the proof
            const isValid = sigma.verify(proof, commitments, nonce);
            expect(isValid).toBe(true);
        });

        it('should prove knowledge of Pedersen commitment opening', () => {
            const sigma = Sigma.pedersenCommitment();
            const value = generateRandomScalar();
            const blinding = generateRandomScalar();
            
            const { proof, commitments } = sigma.prove({ H, value, blinding }, nonce);
            
            // Verify the commitment is correct
            const expectedCom = Point.BASE.multiply(value).add(H.multiply(blinding));
            expect(commitments.C.equals(expectedCom)).toBe(true);
            
            // Verify the proof
            const isValid = sigma.verify(proof, { H, ...commitments }, nonce);
            expect(isValid).toBe(true);
        });

        it('should prove equality of discrete logarithms', () => {
            const sigma = Sigma.equalDiscreteLog();
            const x = generateRandomScalar();
            
            const { proof, commitments } = sigma.prove({ H, x }, nonce);
            
            // Verify both commitments use the same discrete log
            const expectedP = Point.BASE.multiply(x);
            const expectedQ = H.multiply(x);
            expect(commitments.P.equals(expectedP)).toBe(true);
            expect(commitments.Q.equals(expectedQ)).toBe(true);
            
            // Verify the proof
            const isValid = sigma.verify(proof, { H, ...commitments }, nonce);
            expect(isValid).toBe(true);
        });
    });
});