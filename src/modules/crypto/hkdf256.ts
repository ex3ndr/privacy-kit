import { hkdf as nobleHkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';

export function hkdf256(args: { ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, bits: number }):Uint8Array {
    if (args.bits % 8 !== 0) {
        throw new Error('bits must be a multiple of 8');
    }
    return new Uint8Array(nobleHkdf(sha256, args.ikm, args.salt, args.info, args.bits / 8));
}