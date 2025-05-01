import * as crypto from 'crypto';

/**
 * Generates a random UUID.
 * 
 * This function uses the `crypto` module to generate a random UUID.
 * 
 * @returns {string} A random UUID
 * 
 * @example
 * const uuid = randomUUID();
 * console.log(uuid);
 */
export function randomUUID(): string {
    return crypto.randomUUID();
}