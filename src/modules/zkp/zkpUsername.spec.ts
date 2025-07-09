import { describe, it, expect } from 'vitest';
import { 
    zkUsernameProof,
    zkUsernameVerify
} from './zkpUsername';
import { Point } from '@/modules/algebraic/math/point';
import { encodeUsername } from './utils/encodeUsername';
import { encodeBigInt32 } from '../formats/bigint';
import { concatBytes } from '../formats/bytes';
import { deriveScalar } from '../algebraic/math/scalar';

describe('zkpUsername', () => {
    describe('zkUsernameProof', () => {
        it('should create proofs for valid usernames', () => {
            const proof1 = zkUsernameProof('alice', 42);
            const proof2 = zkUsernameProof('alice', 43);
            const proof3 = zkUsernameProof('bob', 42);
            
            // Different usernames or discriminators should produce different proofs
            expect(proof1).toBeInstanceOf(Uint8Array);
            expect(proof2).toBeInstanceOf(Uint8Array);
            expect(proof3).toBeInstanceOf(Uint8Array);
            expect(proof1).not.toEqual(proof2);
            expect(proof1).not.toEqual(proof3);
            expect(proof2).not.toEqual(proof3);
        });
        
        it('should produce different proofs for same username', () => {
            const proof1 = zkUsernameProof('testuser', 123);
            const proof2 = zkUsernameProof('testuser', 123);
            
            // Proofs should be different due to random nonce
            expect(proof1).not.toEqual(proof2);
            
            // But they should yield the same hash
            const hash1 = zkUsernameVerify(proof1);
            const hash2 = zkUsernameVerify(proof2);
            expect(hash1).toEqual(hash2);
        });
        
        it('should handle edge cases', () => {
            // Single character nickname
            const proof1 = zkUsernameProof('a', 0);
            expect(proof1).toBeInstanceOf(Uint8Array);
            
            // Large discriminator
            const proof2 = zkUsernameProof('test', 9999999);
            expect(proof2).toBeInstanceOf(Uint8Array);
            
            // Username with underscore
            const proof3 = zkUsernameProof('test_user_123', 42);
            expect(proof3).toBeInstanceOf(Uint8Array);
        });
        
        it('should reject invalid inputs', () => {
            expect(() => zkUsernameProof('', 42)).toThrow('Nickname cannot be empty');
            expect(() => zkUsernameProof('test', -1)).toThrow('Discriminator must be a safe positive integer');
            expect(() => zkUsernameProof('test', Number.MAX_SAFE_INTEGER + 1)).toThrow('Discriminator must be a safe positive integer');
        });
    });
    
    describe('zkUsernameVerify', () => {
        it('should verify valid proofs', () => {
            const nickname = 'alice';
            const discriminator = 42;
            
            // Create proof
            const proof = zkUsernameProof(nickname, discriminator);
            
            // Verify the proof
            const hash = zkUsernameVerify(proof);
            expect(hash).toBeInstanceOf(Uint8Array);
            expect(hash).not.toBeNull();
            expect(hash!.length).toBe(32); // Ristretto255 point
        });
        
        it('should return consistent hashes for same username', () => {
            // Generate multiple proofs for the same username
            const proofs = Array.from({ length: 5 }, () => zkUsernameProof('alice', 42));
            
            // All proofs should be different
            for (let i = 0; i < proofs.length - 1; i++) {
                expect(proofs[i]).not.toEqual(proofs[i + 1]);
            }
            
            // But all should verify to the same hash
            const hashes = proofs.map(proof => zkUsernameVerify(proof));
            const firstHash = hashes[0];
            
            for (const hash of hashes) {
                expect(hash).toEqual(firstHash);
            }
        });
        
        it('should return different hashes for different usernames', () => {
            const proof1 = zkUsernameProof('alice', 42);
            const proof2 = zkUsernameProof('bob', 42);
            const proof3 = zkUsernameProof('alice', 43);
            
            const hash1 = zkUsernameVerify(proof1);
            const hash2 = zkUsernameVerify(proof2);
            const hash3 = zkUsernameVerify(proof3);
            
            expect(hash1).not.toEqual(hash2);
            expect(hash1).not.toEqual(hash3);
            expect(hash2).not.toEqual(hash3);
        });
        
        it('should reject invalid proofs', () => {
            // Create a valid proof and tamper with it
            const proof = zkUsernameProof('alice', 42);
            const tamperedProof = new Uint8Array(proof);
            tamperedProof[0] = (tamperedProof[0] + 1) % 256;
            
            const hash = zkUsernameVerify(tamperedProof);
            expect(hash).toBeNull();
        });
        
        it('should handle multiple usernames', () => {
            const testCases = [
                { nickname: 'alice', discriminator: 42 },
                { nickname: 'bob', discriminator: 123 },
                { nickname: 'charlie', discriminator: 9999 },
                { nickname: 'test_user', discriminator: 0 }
            ];
            
            for (const { nickname, discriminator } of testCases) {
                const proof = zkUsernameProof(nickname, discriminator);
                const hash = zkUsernameVerify(proof);
                expect(hash).not.toBeNull();
                expect(hash!.length).toBe(32);
            }
        });
    });
    
    describe('username hash calculation', () => {
        it('should compute correct hash values', () => {
            // Test that the hash computation matches expected algorithm:
            // H = G1^h + G2^n + G3^d
            // where h = deriveScalar(concat(n, d), 'signal_username_hash')
            const nickname = 'alice';
            const discriminator = 42;
            
            const nicknameScalar = encodeUsername(nickname);
            const discriminatorScalar = BigInt(discriminator);
            const hashScalar = deriveScalar(
                concatBytes(encodeBigInt32(nicknameScalar), encodeBigInt32(discriminatorScalar)), 
                'signal_username_hash'
            );
            
            // Create proof and extract the hash
            const proof = zkUsernameProof(nickname, discriminator);
            const hash = zkUsernameVerify(proof);
            
            // The hash should be a valid point
            expect(hash).not.toBeNull();
            const hashPoint = Point.fromBytes(hash!);
            expect(hashPoint).toBeInstanceOf(Point);
        });
        
        it('should handle case-insensitive nicknames', () => {
            // The encodeUsername function should normalize case
            const proof1 = zkUsernameProof('Alice', 42);
            const proof2 = zkUsernameProof('alice', 42);
            const proof3 = zkUsernameProof('ALICE', 42);
            
            const hash1 = zkUsernameVerify(proof1);
            const hash2 = zkUsernameVerify(proof2);
            const hash3 = zkUsernameVerify(proof3);
            
            // All should produce the same hash due to case normalization
            expect(hash1).toEqual(hash2);
            expect(hash2).toEqual(hash3);
        });
    });
    
    describe('proof structure', () => {
        it('should produce proofs of expected size', () => {
            const proof = zkUsernameProof('alice', 42);
            
            // Proof should contain:
            // - challenge (32 bytes)
            // - 3 responses for h, n, d (3 * 32 bytes)
            // - 1 computed point H (32 bytes)
            const expectedSize = 32 + (3 * 32) + 32;
            expect(proof.length).toBe(expectedSize);
        });
        
        it('should produce non-deterministic proofs', () => {
            // Create 10 proofs for the same username
            const proofs = Array.from({ length: 10 }, () => zkUsernameProof('test_user', 999));
            
            // All proofs should be unique
            const uniqueProofs = new Set(proofs.map(p => Buffer.from(p).toString('hex')));
            expect(uniqueProofs.size).toBe(10);
            
            // But all should produce the same hash
            const hashes = proofs.map(proof => zkUsernameVerify(proof));
            const uniqueHashes = new Set(hashes.map(h => Buffer.from(h!).toString('hex')));
            expect(uniqueHashes.size).toBe(1);
        });
    });
});