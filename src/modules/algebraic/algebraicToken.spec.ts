import { describe, it, expect } from 'vitest';
import { createAlgebraicTokenRequest, createAlgebraicBlindedToken } from './algebraicToken';
import { Point } from './math/point';
import * as crypto from 'crypto';

describe('algebraicToken', () => {
    describe('createAlgebraicTokenRequest', () => {
        it('should create a token request with valid structure', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();

            const result = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            expect(result).toHaveProperty('commitment');
            expect(result).toHaveProperty('proof');
            expect(result).toHaveProperty('blindedAnonID');
            expect(result.commitment).toBeInstanceOf(Uint8Array);
            expect(result.proof).toBeInstanceOf(Uint8Array);
            expect(result.blindedAnonID).toBeInstanceOf(Uint8Array);
        });

        it('should return commitment of expected length', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();

            const result = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            // Point should be 32 bytes when serialized
            expect(result.commitment.length).toBe(32);
        });

        it('should return proof of expected length', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();

            const result = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            // Proof should be blinding commitment (32 bytes) + proof scalar (32 bytes)
            expect(result.proof.length).toBe(64);
        });

        it('should return blindedAnonID of expected length', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();

            const result = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            // BlindedAnonID should be 32 bytes when serialized
            expect(result.blindedAnonID.length).toBe(32);
        });

        it('should produce different results for different seeds', () => {
            const seed1 = crypto.randomBytes(32);
            const seed2 = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();

            const result1 = createAlgebraicTokenRequest({
                seed: seed1,
                service,
                challenge,
                publicKey
            });
            const result2 = createAlgebraicTokenRequest({
                seed: seed2,
                service,
                challenge,
                publicKey
            });

            expect(result1.commitment).not.toEqual(result2.commitment);
            expect(result1.proof).not.toEqual(result2.proof);
        });

        it('should produce different results for different services', () => {
            const seed = crypto.randomBytes(32);
            const service1 = 'test-service-1';
            const service2 = 'test-service-2';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();

            const result1 = createAlgebraicTokenRequest({
                seed,
                service: service1,
                challenge,
                publicKey
            });
            const result2 = createAlgebraicTokenRequest({
                seed,
                service: service2,
                challenge,
                publicKey
            });

            expect(result1.commitment).not.toEqual(result2.commitment);
            expect(result1.proof).not.toEqual(result2.proof);
        });

        it('should produce different results for different challenges', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge1 = crypto.randomBytes(32);
            const challenge2 = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();

            const result1 = createAlgebraicTokenRequest({
                seed,
                service,
                challenge: challenge1,
                publicKey
            });
            const result2 = createAlgebraicTokenRequest({
                seed,
                service,
                challenge: challenge2,
                publicKey
            });

            // Commitment should be the same (derived from seed and service)
            expect(result1.commitment).toEqual(result2.commitment);
            // But proof should be different (challenge affects the proof)
            expect(result1.proof).not.toEqual(result2.proof);
        });

        it('should produce different results for different public keys', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey1 = Point.fromHash('public-key-1', 'test').toBytes();
            const publicKey2 = Point.fromHash('public-key-2', 'test').toBytes();

            const result1 = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey: publicKey1
            });
            const result2 = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey: publicKey2
            });

            // Commitment should be the same (not affected by publicKey)
            expect(result1.commitment).toEqual(result2.commitment);
            // But blindedAnonID should be different (affected by publicKey)
            expect(result1.blindedAnonID).not.toEqual(result2.blindedAnonID);
        });

        it('should produce same commitment for same seed and service', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge1 = crypto.randomBytes(32);
            const challenge2 = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();

            const result1 = createAlgebraicTokenRequest({
                seed,
                service,
                challenge: challenge1,
                publicKey
            });
            const result2 = createAlgebraicTokenRequest({
                seed,
                service,
                challenge: challenge2,
                publicKey
            });

            // Commitment should be deterministic for same seed and service
            expect(result1.commitment).toEqual(result2.commitment);
        });

        it('should handle empty service name', () => {
            const seed = crypto.randomBytes(32);
            const service = '';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();

            expect(() => {
                createAlgebraicTokenRequest({
                    seed,
                    service,
                    challenge,
                    publicKey
                });
            }).not.toThrow();
        });

        it('should handle various input sizes', () => {
            const seed = new Uint8Array(32).fill(1);
            const service = 'a'.repeat(100); // Long service name
            const challenge = new Uint8Array(64).fill(2); // Different challenge size
            const publicKey = Point.fromHash('public-key', 'test').toBytes();

            expect(() => {
                createAlgebraicTokenRequest({
                    seed,
                    service,
                    challenge,
                    publicKey
                });
            }).not.toThrow();
        });
    });

    describe('createAlgebraicBlindedToken', () => {
        it('should create a token for valid request', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();
            const secretKey = crypto.randomBytes(32);

            const request = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            const token = createAlgebraicBlindedToken({
                commitment: request.commitment,
                proof: request.proof,
                service,
                blindedAnonID: request.blindedAnonID,
                challenge,
                publicKey,
                secretKey
            });

            expect(token).not.toBeNull();
            expect(token).toHaveProperty('signature');
            expect(token!.signature).toBeInstanceOf(Uint8Array);
        });

        it('should return signature of expected length', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();
            const secretKey = crypto.randomBytes(32);

            const request = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            const token = createAlgebraicBlindedToken({
                commitment: request.commitment,
                proof: request.proof,
                service,
                blindedAnonID: request.blindedAnonID,
                challenge,
                publicKey,
                secretKey
            });

            // Signature should be R (32 bytes) + sigma (32 bytes)
            expect(token!.signature.length).toBe(64);
        });

        it('should reject invalid proof', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();
            const secretKey = crypto.randomBytes(32);

            const request = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            // Tamper with proof
            const tamperedProof = new Uint8Array(request.proof);
            tamperedProof[tamperedProof.length - 1] ^= 1; // Flip last bit of scalar part

            const token = createAlgebraicBlindedToken({
                commitment: request.commitment,
                proof: tamperedProof,
                service,
                blindedAnonID: request.blindedAnonID,
                challenge,
                publicKey,
                secretKey
            });

            expect(token).toBeNull();
        });

        it('should reject wrong service', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const wrongService = 'wrong-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();
            const secretKey = crypto.randomBytes(32);

            const request = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            const token = createAlgebraicBlindedToken({
                commitment: request.commitment,
                proof: request.proof,
                service: wrongService,
                blindedAnonID: request.blindedAnonID,
                challenge,
                publicKey,
                secretKey
            });

            expect(token).toBeNull();
        });

        it('should reject wrong challenge', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const wrongChallenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();
            const secretKey = crypto.randomBytes(32);

            const request = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            const token = createAlgebraicBlindedToken({
                commitment: request.commitment,
                proof: request.proof,
                service,
                blindedAnonID: request.blindedAnonID,
                challenge: wrongChallenge,
                publicKey,
                secretKey
            });

            expect(token).toBeNull();
        });

        it('should handle invalid commitment length', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();
            const secretKey = crypto.randomBytes(32);

            const request = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            const invalidCommitment = new Uint8Array(16); // Wrong length

            expect(() => {
                createAlgebraicBlindedToken({
                    commitment: invalidCommitment,
                    proof: request.proof,
                    service,
                    blindedAnonID: request.blindedAnonID,
                    challenge,
                    publicKey,
                    secretKey
                });
            }).toThrow();
        });

        it('should handle invalid proof length', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();
            const secretKey = crypto.randomBytes(32);

            const request = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            const invalidProof = new Uint8Array(32); // Wrong length (should be 64)

            expect(() => {
                createAlgebraicBlindedToken({
                    commitment: request.commitment,
                    proof: invalidProof,
                    service,
                    blindedAnonID: request.blindedAnonID,
                    challenge,
                    publicKey,
                    secretKey
                });
            }).toThrow();
        });

        it('should create different tokens with different secret keys', () => {
            const seed = crypto.randomBytes(32);
            const service = 'test-service';
            const challenge = crypto.randomBytes(32);
            const publicKey = Point.fromHash('public-key', 'test').toBytes();
            const secretKey1 = crypto.randomBytes(32);
            const secretKey2 = crypto.randomBytes(32);

            const request = createAlgebraicTokenRequest({
                seed,
                service,
                challenge,
                publicKey
            });

            const token1 = createAlgebraicBlindedToken({
                commitment: request.commitment,
                proof: request.proof,
                service,
                blindedAnonID: request.blindedAnonID,
                challenge,
                publicKey,
                secretKey: secretKey1
            });

            const token2 = createAlgebraicBlindedToken({
                commitment: request.commitment,
                proof: request.proof,
                service,
                blindedAnonID: request.blindedAnonID,
                challenge,
                publicKey,
                secretKey: secretKey2
            });

            expect(token1).not.toBeNull();
            expect(token2).not.toBeNull();
            expect(token1!.signature).not.toEqual(token2!.signature);
        });
    });
}); 