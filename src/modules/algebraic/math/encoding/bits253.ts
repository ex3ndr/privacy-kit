import { Point } from '../point';
import { elligatorEncode, elligatorDecode } from './elligator';
import type { Bytes } from '../../../../types';

/**
 * Direct encoding of up to 253 bits as a Ristretto point
 * This is a simpler encoding that doesn't include the hash structure
 * 
 * @param data Up to 32 bytes of data
 * @returns A Point encoding the data
 */
export function encode253Bits(data: Bytes): Point {
    if (data.length > 32) {
        throw new Error('Maximum 32 bytes allowed for 253-bit encoding');
    }
    
    // Convert to field element (little-endian)
    let fe = 0n;
    for (let i = 0; i < data.length; i++) {
        fe |= BigInt(data[i]) << BigInt(8 * i);
    }
    
    // Ensure it's in valid range (< 2^253)
    if (fe >= (1n << 253n)) {
        throw new Error('Data exceeds 253 bits');
    }
    
    return elligatorEncode(fe);
}

/**
 * Direct decoding of a Ristretto point to recover up to 253 bits
 * Returns all possible decodings (up to 8)
 * 
 * @param point The Point to decode
 * @returns Array of possible decoded values and a mask indicating which are valid
 */
export function decode253Bits(point: Point): { mask: number, values: Bytes[] } {
    const preimages = elligatorDecode(point);
    const values: Bytes[] = [];
    let mask = 0;
    
    for (let i = 0; i < preimages.length; i++) {
        const preimage = preimages[i];
        
        // Convert field element to bytes (little-endian)
        const bytes = new Uint8Array(32);
        let fe = preimage.value;
        for (let j = 0; j < 32; j++) {
            bytes[j] = Number(fe & 0xFFn);
            fe >>= 8n;
        }
        
        values.push(bytes);
        
        if (preimage.isValid) {
            mask |= (1 << i);
        }
    }
    
    return { mask, values };
}
