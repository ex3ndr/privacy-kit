import { hkdf as nobleHkdf } from '@noble/hashes/hkdf';
import { sha512 } from '@noble/hashes/sha2';
import type { Bytes } from '../../types';

export function hkdf512(args: { ikm: Bytes, salt: Bytes, info: Bytes, bytes: number }): Bytes {
    return new Uint8Array(nobleHkdf(sha512, args.ikm, args.salt, args.info, args.bytes));
}
