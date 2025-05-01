import * as crypto from 'crypto';

/**
 * Derives a key using PBKDF2 with SHA-512.
 * 
 * This function implements the Password-Based Key Derivation Function 2 (PBKDF2)
 * using SHA-512 as the underlying hash function. PBKDF2 is designed to be
 * computationally intensive, making it resistant to brute-force attacks.
 * 
 * @param {string | Buffer | Uint8Array} key - The password or key to derive from
 * @param {string | Buffer | Uint8Array} salt - A random value that makes the output unique
 * @param {number} iterations - The number of iterations (higher is more secure but slower)
 * @param {number} keyLen - The desired length of the derived key in bytes
 * @returns {Promise<Uint8Array>} A promise that resolves to the derived key
 * 
 * @example
 * const derivedKey = await pbkdf2_sha512('myPassword', 'randomSalt', 10000, 32);
 * console.log(derivedKey.toString('hex'));
 */
export function pbkdf2_sha512(key: string | Buffer | Uint8Array, salt: string | Buffer | Uint8Array, iterations: number, keyLen: number): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => crypto.pbkdf2(key, salt, iterations, keyLen, 'sha512', (error, derivedKey) => {
        if (error) {
            reject(error);
        } else {
            resolve(Uint8Array.from(derivedKey));
        }
    }));
}