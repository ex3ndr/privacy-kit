import { Point } from '../point';
import { elligatorEncode, elligatorDecode } from './elligator';
import { sha256 } from '@/modules/crypto/sha256';

/**
 * Lizard encoding - encode 16 bytes of data into a Ristretto point
 * 
 * The Lizard method works by:
 * 1. Creating a 32-byte field element from the 16-byte data and its hash
 * 2. Encoding this field element as a point using Elligator
 * 3. The encoding is designed so that the original 16 bytes can be recovered
 * 
 * @param data 16 bytes of data to encode
 * @returns A Point encoding the data
 */
export function lizardEncode(data: Uint8Array): Point {
    if (data.length !== 16) {
        throw new Error('Lizard encoding requires exactly 16 bytes of data');
    }
    
    // Create a 32-byte buffer
    const feBytes = new Uint8Array(32);
    
    // Compute hash of the data
    const digest = sha256(data);
    
    // Copy hash to the buffer
    feBytes.set(digest);
    
    // Overwrite bytes 8-23 with the original data
    feBytes.set(data, 8);
    
    // Clear bits to ensure proper range
    feBytes[0] &= 254; // make positive since Elligator on r and -r is the same
    feBytes[31] &= 63; // ensure < 2^254
    
    // Convert to field element
    let fe = 0n;
    for (let i = 0; i < 32; i++) {
        fe |= BigInt(feBytes[i]) << BigInt(8 * i);
    }
    
    // Encode using Elligator
    return elligatorEncode(fe);
}

/**
 * Lizard decoding - recover 16 bytes of data from a Ristretto point
 * 
 * This tries all possible Elligator preimages and finds the one that
 * satisfies the Lizard encoding structure (where bytes 8-23 match the hash)
 * 
 * @param point The Point to decode
 * @returns The original 16 bytes of data, or null if decoding fails
 */
export function lizardDecode(point: Point): Uint8Array | null {
    // Get all possible Elligator preimages
    const preimages = elligatorDecode(point);
    
    let result: Uint8Array | null = null;
    let nFound = 0;
    
    for (const preimage of preimages) {
        if (!preimage.isValid) {
            continue;
        }
        
        // Convert field element to bytes (little-endian)
        const feBytes = new Uint8Array(32);
        let fe = preimage.value;
        for (let i = 0; i < 32; i++) {
            feBytes[i] = Number(fe & 0xFFn);
            fe >>= 8n;
        }
        
        // Extract the potential data (bytes 8-23)
        const potentialData = feBytes.slice(8, 24);
        
        // Compute what the hash should be
        const computedDigest = sha256(potentialData);
        
        // Create expected field element bytes
        const expectedFeBytes = new Uint8Array(32);
        expectedFeBytes.set(computedDigest);
        expectedFeBytes.set(potentialData, 8);
        expectedFeBytes[0] &= 254;
        expectedFeBytes[31] &= 63;
        
        // Check if this matches our field element
        let matches = true;
        for (let i = 0; i < 32; i++) {
            if (expectedFeBytes[i] !== feBytes[i]) {
                matches = false;
                break;
            }
        }
        
        if (matches) {
            result = potentialData;
            nFound++;
        }
    }
    
    // Should find exactly one valid preimage
    return nFound === 1 ? result : null;
}