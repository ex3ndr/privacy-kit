import { createHash } from 'crypto';

/**
 * Computes the SHA-512 hash of the provided input.
 * 
 * This function uses the SHA-512 cryptographic hash function to generate
 * a 64-byte (512-bit) hash of the input data.
 * 
 * @param {string | Buffer | Uint8Array} input - The data to hash
 * @returns {Uint8Array} A 64-byte Uint8Array containing the SHA-512 hash
 * 
 * @example
 * const hash = sha512('Hello, World!');
 * console.log(hash.toString('hex'));
 */
export function sha512(input: string | Buffer | Uint8Array): Uint8Array {
    return Uint8Array.from(createHash('sha512').update(input).digest());
}