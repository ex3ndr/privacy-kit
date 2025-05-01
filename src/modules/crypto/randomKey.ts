import * as crypto from 'crypto';

/**
 * Generates a random key with a specified prefix.
 * 
 * This function generates a random key by creating a buffer of random bytes,
 * converting it to a base64 string, and then normalizing it to remove any non-alphanumeric characters.
 * 
 * @param {string} prefix - The prefix to add to the random key
 * @param {number} length - The length of the random key
 * @returns {string} A random key with the specified prefix
 * 
 * @example
 * const key = randomKey('myKey', 24);
 * console.log(key);
 */
export function randomKey(prefix: string, length: number = 24): string {
    while (true) {
        const randomBytesBuffer = crypto.randomBytes(length * 2);
        const normalized = randomBytesBuffer.toString('base64').replace(/[^a-zA-Z0-9]/g, '');
        if (normalized.length < length) {
            continue;
        }
        const base64String = normalized.slice(0, length);
        return `${prefix}_${base64String}`;
    }
}