import { createHash } from 'crypto';
import type { Bytes } from '../../types';

/**
 * Computes the SHA-512 hash of the provided input.
 * 
 * This function uses the SHA-512 cryptographic hash function to generate
 * a 64-byte (512-bit) hash of the input data.
 * 
 * @param {string | Buffer | Bytes} input - The data to hash
 * @returns {Bytes} A 64-byte byte array containing the SHA-512 hash
 * 
 * @example
 * const hash = sha512('Hello, World!');
 * console.log(hash.toString('hex'));
 */
export function sha512(input: string | Buffer | Bytes): Bytes {
    return Uint8Array.from(createHash('sha512').update(input).digest());
}
