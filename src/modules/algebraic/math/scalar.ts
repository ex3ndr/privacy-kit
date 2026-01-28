import * as crypto from 'crypto';
import { Point } from './point';
import { concatBytes } from '@/modules/formats/bytes';
import { deriveKey } from '@/modules/crypto/deriveKey';
import { decodeBigInt } from '../../formats/bigint';
import type { Bytes } from '../../../types';

/**
 * Generates a cryptographically secure random scalar with a specified modulus.
 * 
 * This function generates a random scalar by creating random bytes and reducing
 * modulo the specified value. It generates extra bytes to ensure uniform distribution
 * across the modular range, following cryptographic best practices.
 * 
 * @param {bigint} [modulus] - The modulus for the scalar. Defaults to the Ed25519 curve order.
 * @returns {bigint} A random scalar in the range [0, modulus)
 * 
 * @example
 * // Generate random scalar with default Ed25519 curve order
 * const scalar1 = generateRandomScalar();
 * 
 * // Generate random scalar with custom modulus
 * const scalar2 = generateRandomScalar(2n ** 256n);
 */
export function generateRandomScalar(modulus?: bigint): bigint {
    const mod = modulus ?? Point.ORDER;

    if (mod <= 0n) {
        throw new Error("Modulus must be positive");
    }

    // Calculate the number of bits needed for the modulus
    const modulusBits = mod.toString(2).length;

    // Generate extra bytes to ensure uniform distribution
    // We need at least 128 extra bits to ensure cryptographically negligible bias (2^-128)
    // This is based on the principle that bias ≈ 1/2^(n-log₂(modulus)) where n is total bits
    const extraBits = 128;
    const totalBits = modulusBits + extraBits;
    const totalBytes = Math.ceil(totalBits / 8);

    // Generate random bytes and convert to bigint using rejection sampling
    // for perfect uniform distribution
    const maxValue = (1n << BigInt(totalBits)) - 1n;
    const threshold = maxValue - (maxValue % mod);
    
    while (true) {
        const randomBytes = crypto.randomBytes(totalBytes);
        let randomValue = 0n;

        // Convert bytes to bigint (big-endian)
        for (let i = 0; i < randomBytes.length; i++) {
            randomValue = randomValue * 256n + BigInt(randomBytes[i]);
        }

        // Only accept values that don't introduce bias
        if (randomValue < threshold) {
            return randomValue % mod;
        }
        // Otherwise retry - this ensures perfect uniform distribution
    }
}

export function isValidScalar(scalar: bigint, modulus: bigint): boolean {
    return scalar >= 0n && scalar < modulus;
}

export function deriveScalar(seed: Bytes, usage: string, modulus?: bigint) {
    const idEntropy = concatBytes(
        deriveKey(seed, 'Scalar Derive For ' + usage, ['0']),
        deriveKey(seed, 'Scalar Derive For ' + usage, ['1'])
    );
    return decodeBigInt(idEntropy) % (modulus ?? Point.ORDER);
}
