import { createHash } from 'crypto';

/**
 * Computes the SHA-256 hash of the provided input.
 * 
 * This function uses the SHA-256 cryptographic hash function to generate
 * a 32-byte (256-bit) hash of the input data.
 * 
 * @param {string | Buffer | Uint8Array} input - The data to hash
 * @returns {Uint8Array} A 32-byte Uint8Array containing the SHA-256 hash
 * 
 * @example
 * const hash = sha256('Hello, World!');
 * console.log(hash.toString('hex'));
 */
export function sha256(input: string | Buffer | Uint8Array): Uint8Array {
    return Uint8Array.from(createHash('sha256').update(input).digest());
}