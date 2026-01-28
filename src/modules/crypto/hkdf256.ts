import { hkdf as nobleHkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import type { Bytes } from '../../types';

export function hkdf256(args: { ikm: Bytes, salt: Bytes, info: Bytes, bytes: number }): Bytes {
    return new Uint8Array(nobleHkdf(sha256, args.ikm, args.salt, args.info, args.bytes));
}
