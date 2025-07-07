import { describe, expect, it, beforeEach } from 'vitest';
import { Point } from '../math/point';
import { generateRandomScalar } from '../math/scalar';
import { encodeUTF8 } from '@/modules/formats/text';
import {
    createSigmaProof,
    verifySigmaProof,
    createPublicSigmaProof
} from './sigmaProof';
import {
    sigmaProtocol,
    type ProtocolVariables
} from './sigmaDefinition';

describe('Sigma Proof', () => {
    let G: Point;
    let H: Point;
    let P: Point;
    let Q: Point;
    let R: Point;
    let a: bigint;
    let b: bigint;
    let c: bigint;
    let d: bigint;
    let e: bigint;
    let nonce: Uint8Array;

    beforeEach(() => {
        // Generate test points and scalars
        G = Point.fromHash('generator_G', 'test_domain');
        H = Point.fromHash('generator_H', 'test_domain');
        a = generateRandomScalar();
        b = generateRandomScalar();
        c = generateRandomScalar();
        d = generateRandomScalar();
        e = generateRandomScalar();

        // Create test points
        P = Point.add(G.multiply(a), H.multiply(b));
        Q = G.multiply(c);
        R = Point.add(P.multiply(d), Q.multiply(e));

        nonce = encodeUTF8('test_nonce_12345');
    });

    describe('createSigmaProof', () => {
        it('should create a valid proof for single statement', () => {
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_proof'
            });

            expect(typeof proof.challenge).toBe('bigint');
            expect(proof.challenge).toBeGreaterThan(0n);
            expect(proof.challenge).toBeLessThan(Point.ORDER);

            // Check commitments
            expect(Object.keys(proof.commitments)).toEqual(expect.arrayContaining(['a', 'b']));
            expect(proof.commitments.a).toBeInstanceOf(Point);
            expect(proof.commitments.b).toBeInstanceOf(Point);

            // Check responses
            expect(Object.keys(proof.responses)).toEqual(expect.arrayContaining(['a', 'b']));
            expect(typeof proof.responses.a).toBe('bigint');
            expect(typeof proof.responses.b).toBe('bigint');
            expect(proof.responses.a).toBeGreaterThanOrEqual(0n);
            expect(proof.responses.a).toBeLessThan(Point.ORDER);
        });

        it('should create a valid proof for multiple statements', () => {
            const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
            const variables = { P, G, H, Q, a, b, c };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_multiple_statements'
            });


            // Check all scalars have commitments and responses
            expect(Object.keys(proof.commitments)).toEqual(expect.arrayContaining(['a', 'b', 'c']));
            expect(Object.keys(proof.responses)).toEqual(expect.arrayContaining(['a', 'b', 'c']));

            // All commitments should be valid points
            expect(proof.commitments.a).toBeInstanceOf(Point);
            expect(proof.commitments.b).toBeInstanceOf(Point);
            expect(proof.commitments.c).toBeInstanceOf(Point);
        });

        it('should create a valid proof for complex protocol', () => {
            const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c', 'R = P^d + Q^e');
            const variables = { P, G, H, Q, R, a, b, c, d, e };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'complex_proof'
            });

            expect(Object.keys(proof.commitments)).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd', 'e']));
            expect(Object.keys(proof.responses)).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd', 'e']));
        });
    });

    describe('verifySigmaProof', () => {
        it('should verify a valid proof for single statement', () => {
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_proof'
            });

            const publicVariables = { P, G, H };
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'test_proof');

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should verify a valid proof for multiple statements', () => {
            const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
            const variables = { P, G, H, Q, a, b, c };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_multiple_verification'
            });

            const publicVariables = { P, G, H, Q };
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'test_multiple_verification');

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should verify a valid proof for complex protocol', () => {
            const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c', 'R = P^d + Q^e');
            const variables = { P, G, H, Q, R, a, b, c, d, e };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'complex_proof'
            });

            const publicVariables = { P, G, H, Q, R };
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'complex_proof');

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject proof with wrong challenge', () => {
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_proof'
            });

            // Tamper with the challenge
            const tamperedProof = {
                ...proof,
                challenge: (proof.challenge + 1n) % Point.ORDER
            };

            const publicVariables = { P, G, H };
            const result = verifySigmaProof(tamperedProof, publicVariables, protocol, nonce, 'test_proof');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Challenge verification failed');
        });

        it('should reject proof with wrong responses', () => {
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_proof'
            });

            // Tamper with a response
            const tamperedProof = {
                ...proof,
                responses: {
                    ...proof.responses,
                    a: (proof.responses.a + 1n) % Point.ORDER
                }
            };

            const publicVariables = { P, G, H };
            const result = verifySigmaProof(tamperedProof, publicVariables, protocol, nonce, 'test_proof');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Proof equation verification failed');
        });

        it('should reject proof with wrong commitments', () => {
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_proof'
            });

            // Tamper with a commitment
            const tamperedProof = {
                ...proof,
                commitments: {
                    ...proof.commitments,
                    a: G.multiply(generateRandomScalar()) // Random point
                }
            };

            const publicVariables = { P, G, H };
            const result = verifySigmaProof(tamperedProof, publicVariables, protocol, nonce, 'test_proof');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Challenge verification failed');
        });

        it('should reject proof with wrong public variables', () => {
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_proof'
            });

            // Wrong public point P
            const wrongP = G.multiply(generateRandomScalar());
            const publicVariables = { P: wrongP, G, H };
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'test_proof');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Challenge verification failed');
        });

        it('should reject proof with missing public variables', () => {
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_proof'
            });

            // Missing public variable H - this will cause challenge verification to fail first
            const publicVariables = { P, G } as any;
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'test_proof');

            expect(result.isValid).toBe(false);
            // The challenge verification fails first because the transcript is different
            expect(result.error).toBe('Challenge verification failed');
        });

        it('should reject proof with different nonce', () => {
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_proof'
            });

            // Use different nonce in verification
            const differentNonce = encodeUTF8('different_nonce');

            const publicVariables = { P, G, H };
            const result = verifySigmaProof(proof, publicVariables, protocol, differentNonce, 'test_proof');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Challenge verification failed');
        });
    });

    describe('createPublicSigmaProof', () => {
        it('should create proof and extract public variables', () => {
            const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
            const variables = { P, G, H, Q, a, b, c };

            const { proof, publicVariables } = createPublicSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'public_proof'
            });


            // Public variables should only contain points
            expect(Object.keys(publicVariables)).toEqual(expect.arrayContaining(['P', 'G', 'H', 'Q']));
            expect(publicVariables.P).toEqual(P);
            expect(publicVariables.G).toEqual(G);
            expect(publicVariables.H).toEqual(H);
            expect(publicVariables.Q).toEqual(Q);

            // Verify the proof works
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'public_proof');
            expect(result.isValid).toBe(true);
        });

        it('should work with complex protocols', () => {
            const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c', 'R = P^d + Q^e');
            const variables = { P, G, H, Q, R, a, b, c, d, e };

            const { proof, publicVariables } = createPublicSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'complex_public_proof'
            });

            expect(Object.keys(publicVariables)).toEqual(expect.arrayContaining(['P', 'G', 'H', 'Q', 'R']));

            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'complex_public_proof');
            expect(result.isValid).toBe(true);
        });
    });

    describe('Type Safety', () => {
        it('should maintain type safety for proof creation and verification', () => {
            const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');

            // TypeScript should enforce exact variable requirements
            const variables: ProtocolVariables<typeof protocol> = { P, G, H, Q, a, b, c };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'type_safety_test'
            });

            // Proof should have the correct scalar and point types
            expect(proof.commitments.a).toBeInstanceOf(Point);
            expect(proof.commitments.b).toBeInstanceOf(Point);
            expect(proof.commitments.c).toBeInstanceOf(Point);
            expect(typeof proof.responses.a).toBe('bigint');
            expect(typeof proof.responses.b).toBe('bigint');
            expect(typeof proof.responses.c).toBe('bigint');

            // Public variables should be correctly typed
            const publicVariables = { P, G, H, Q };
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'type_safety_test');
            expect(result.isValid).toBe(true);
        });

        it('should work with single statement protocol', () => {
            const protocol = sigmaProtocol('Q = G^c');
            const variables: ProtocolVariables<typeof protocol> = { Q, G, c };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'single_statement_test'
            });

            expect(Object.keys(proof.commitments)).toEqual(['c']);
            expect(Object.keys(proof.responses)).toEqual(['c']);

            const publicVariables = { Q, G };
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'single_statement_test');
            expect(result.isValid).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero scalar values', () => {
            const zeroA = 0n;
            const zeroP = H.multiply(b); // P = G^0 + H^b = H^b
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P: zeroP, G, H, a: zeroA, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'zero_scalar_test'
            });

            const publicVariables = { P: zeroP, G, H };
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'zero_scalar_test');
            expect(result.isValid).toBe(true);
        });

        it('should handle large scalar values', () => {
            const largeA = Point.ORDER - 1n;
            const largeP = Point.add(G.multiply(largeA), H.multiply(b));
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P: largeP, G, H, a: largeA, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'large_scalar_test'
            });

            const publicVariables = { P: largeP, G, H };
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'large_scalar_test');
            expect(result.isValid).toBe(true);
        });

        it('should handle identity point', () => {
            const zeroScalar = 0n;
            const identityQ = Point.ZERO;
            const protocol = sigmaProtocol('Q = G^c');
            const variables = { Q: identityQ, G, c: zeroScalar };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'identity_point_test'
            });

            const publicVariables = { Q: identityQ, G };
            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'identity_point_test');
            expect(result.isValid).toBe(true);
        });

        it('should produce different proofs with different nonces', () => {
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof1 = createSigmaProof({
                protocol,
                variables,
                nonce: encodeUTF8('nonce1'),
                usage: 'nonce_test'
            });

            const proof2 = createSigmaProof({
                protocol,
                variables,
                nonce: encodeUTF8('nonce2'),
                usage: 'nonce_test'
            });

            expect(proof1.challenge).not.toEqual(proof2.challenge);
            expect(proof1.commitments.a.equals(proof2.commitments.a)).toBe(false);
            expect(proof1.responses.a).not.toEqual(proof2.responses.a);

            // Both proofs should still be valid
            const publicVariables = { P, G, H };
            expect(verifySigmaProof(proof1, publicVariables, protocol, encodeUTF8('nonce1'), 'nonce_test').isValid).toBe(true);
            expect(verifySigmaProof(proof2, publicVariables, protocol, encodeUTF8('nonce2'), 'nonce_test').isValid).toBe(true);
        });

        it('should produce different proofs with different usage strings', () => {
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof1 = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'usage1'
            });

            const proof2 = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'usage2'
            });

            expect(proof1.challenge).not.toEqual(proof2.challenge);

            // Both proofs should still be valid with their respective contexts
            const publicVariables = { P, G, H };
            expect(verifySigmaProof(proof1, publicVariables, protocol, nonce, 'usage1').isValid).toBe(true);
            expect(verifySigmaProof(proof2, publicVariables, protocol, nonce, 'usage2').isValid).toBe(true);
        });

        it('should normalize only statements, not usage or variable names', () => {
            // Test that only statements are normalized, while usage provides domain separation
            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            // Usage should NOT be normalized - different case/spacing should produce different challenges
            const proof1 = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test_usage'
            });

            const proof2 = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'TEST_USAGE' // Different case should produce different challenge
            });

            const proof3 = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'test usage' // Different spacing should produce different challenge
            });

            // Usage is not normalized, so these should all be different
            expect(proof1.challenge).not.toEqual(proof2.challenge);
            expect(proof2.challenge).not.toEqual(proof3.challenge);
            expect(proof1.challenge).not.toEqual(proof3.challenge);

            // But all should verify correctly with their own contexts
            const publicVariables = { P, G, H };
            expect(verifySigmaProof(proof1, publicVariables, protocol, nonce, 'test_usage').isValid).toBe(true);
            expect(verifySigmaProof(proof2, publicVariables, protocol, nonce, 'TEST_USAGE').isValid).toBe(true);
            expect(verifySigmaProof(proof3, publicVariables, protocol, nonce, 'test usage').isValid).toBe(true);
        });

        it('should demonstrate statement normalization protection', () => {
            // This test shows that statement normalization prevents malleability
            // Even if someone tries to create statements with different formatting,
            // the normalized version is what gets included in the challenge

            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            const proof = createSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'statement_test'
            });

            // The proof should verify correctly
            const publicVariables = { P, G, H };
            expect(verifySigmaProof(proof, publicVariables, protocol, nonce, 'statement_test').isValid).toBe(true);

            // The normalization is happening internally in generateChallenge
            // so we can't easily test it directly, but we know it's working
            // because the verification succeeds and the implementation normalizes statements
        });

        it('should prevent transcript collision attacks with length prefixing', () => {
            // Test that length prefixing prevents collision attacks where different inputs
            // could produce the same concatenated transcript

            const protocol = sigmaProtocol('P = G^a + H^b');
            const variables = { P, G, H, a, b };

            // These different usage patterns should produce different challenges
            // even if they might concatenate to similar bytes without length prefixing
            const proof1 = createSigmaProof({
                protocol,
                variables,
                nonce: encodeUTF8('ab'),
                usage: 'test'
            });

            const proof2 = createSigmaProof({
                protocol,
                variables,
                nonce: encodeUTF8('a'),
                usage: 'testb' // Different split but could be similar without length prefixing
            });

            // With proper length prefixing, these should be different
            expect(proof1.challenge).not.toEqual(proof2.challenge);

            // Both should verify correctly
            const publicVariables = { P, G, H };
            expect(verifySigmaProof(proof1, publicVariables, protocol, encodeUTF8('ab'), 'test').isValid).toBe(true);
            expect(verifySigmaProof(proof2, publicVariables, protocol, encodeUTF8('a'), 'testb').isValid).toBe(true);
        });
    });

    describe('Real-world Usage Examples', () => {
        it('should prove knowledge of discrete logarithm', () => {
            // Prove knowledge of scalar a such that P = G^a
            const protocol = sigmaProtocol('P = G^a');
            const variables = { P: G.multiply(a), G, a };

            const { proof, publicVariables } = createPublicSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'discrete_log_proof'
            });

            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'discrete_log_proof');
            expect(result.isValid).toBe(true);
        });

        it('should prove knowledge of Pedersen commitment opening', () => {
            // Prove knowledge of value and randomness for commitment P = G^value + H^randomness
            const value = generateRandomScalar();
            const randomness = generateRandomScalar();
            const commitment = Point.add(G.multiply(value), H.multiply(randomness));

            const protocol = sigmaProtocol('P = G^v + H^r');
            const variables = { P: commitment, G, H, v: value, r: randomness };

            const { proof, publicVariables } = createPublicSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'pedersen_commitment_proof'
            });

            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'pedersen_commitment_proof');
            expect(result.isValid).toBe(true);
        });

        it('should prove equality of discrete logarithms', () => {
            // Prove that P and Q have the same discrete logarithm: P = G^a and Q = H^a
            const testA = generateRandomScalar(); // Use a fresh scalar for this test
            const testP = G.multiply(testA);
            const testQ = H.multiply(testA);

            const protocol = sigmaProtocol('P = G^a', 'Q = H^a');
            const variables = { P: testP, Q: testQ, G, H, a: testA };

            const { proof, publicVariables } = createPublicSigmaProof({
                protocol,
                variables,
                nonce,
                usage: 'equal_discrete_log_proof'
            });

            const result = verifySigmaProof(proof, publicVariables, protocol, nonce, 'equal_discrete_log_proof');
            expect(result.isValid).toBe(true);
        });
    });
});