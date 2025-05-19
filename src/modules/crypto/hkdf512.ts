import { hkdf as nobleHkdf } from '@noble/hashes/hkdf';
import { sha512 } from '@noble/hashes/sha2';

export function hkdf512(args: { ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, bytes: number }):Uint8Array {
    return new Uint8Array(nobleHkdf(sha512, args.ikm, args.salt, args.info, args.bytes));
}