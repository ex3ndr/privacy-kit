import { encodeHex } from '../formats/hex';
import { hkdf512 } from './hkdf512';
import { expect, describe, it } from 'vitest';

describe('hkdf512', () => {
    it('should derive hdkf', async () => {
        let res = hkdf512({
            ikm: Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex'),
            salt: Buffer.from('000102030405060708090a0b0c', 'hex'),
            info: Buffer.from('f0f1f2f3f4f5f6f7f8f9', 'hex'),
            bytes: 42
        });
        expect(encodeHex(res)).toBe('832390086cda71fb47625bb5ceb168e4c8e26a1a16ed34d9fc7fe92c1481579338da362cb8d9f925d7cb'.toUpperCase());

        res = hkdf512({
            ikm: Buffer.from('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f', 'hex'),
            salt: Buffer.from('606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeaf', 'hex'),
            info: Buffer.from('b0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff', 'hex'),
            bytes: 82
        });
        expect(encodeHex(res)).toBe('ce6c97192805b346e6161e821ed165673b84f400a2b514b2fe23d84cd189ddf1b695b48cbd1c8388441137b3ce28f16aa64ba33ba466b24df6cfcb021ecff235f6a2056ce3af1de44d572097a8505d9e7a93'.toUpperCase());

        res = hkdf512({
            ikm: Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex'),
            salt: Buffer.from('', 'hex'),
            info: Buffer.from('', 'hex'),
            bytes: 42
        });
        expect(encodeHex(res)).toBe('f5fa02b18298a72a8c23898a8703472c6eb179dc204c03425c970e3b164bf90fff22d04836d0e2343bac'.toUpperCase());
    });
});