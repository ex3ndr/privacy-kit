import { hkdf as nobleHkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';

export function hkdf256(args: { ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, bytes: number }):Uint8Array {
    return new Uint8Array(nobleHkdf(sha256, args.ikm, args.salt, args.info, args.bytes));
}