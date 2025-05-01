import { encodeHex } from '../formats/hex';
import { hkdf256 } from './hkdf256';
import { expect, describe, it } from 'vitest';

describe('hkdf256', () => {
    it('should derive hdkf', async () => {
        let res = hkdf256({
            ikm: Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex'),
            salt: Buffer.from('000102030405060708090a0b0c', 'hex'),
            info: Buffer.from('f0f1f2f3f4f5f6f7f8f9', 'hex'),
            bits: 42 * 8
        });
        expect(encodeHex(res)).toBe('3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865'.toUpperCase());
    });
});