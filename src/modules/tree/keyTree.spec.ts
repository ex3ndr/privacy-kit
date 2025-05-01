import { describe, it, expect } from 'vitest';
import { KeyTree } from "./keyTree";

describe('keyTree', () => {
    it('should encrypt and decrypt', async () => {
        const keyTree = await KeyTree.create('test', 'testcase');
        const encrypted = await keyTree.symmetricEncrypt(['test'], 'test');
        const decrypted = await keyTree.symmetricDecryptString(['test'], encrypted);
        expect(decrypted).toEqual('test');
    });

    it('should detect tampering with encrypted data', async () => {
        const keyTree = await KeyTree.create('test', 'testcase');
        const encrypted = await keyTree.symmetricEncrypt(['test'], 'test');

        // Tamper with the encrypted data
        encrypted[20] = encrypted[20] ^ 1; // Flip one bit in the ciphertext

        await expect(async () => {
            await keyTree.symmetricDecryptString(['test'], encrypted);
        }).rejects.toThrow();
    });

    it('should reject invalid data format', async () => {
        const keyTree = await KeyTree.create('test', 'testcase');
        const invalidData = Buffer.from('invalid data');

        await expect(async () => {
            await keyTree.symmetricDecryptString(['test'], invalidData);
        }).rejects.toThrow('Invalid data');
    });

    it('should not decrypt with wrong key path', async () => {
        const keyTree = await KeyTree.create('test', 'testcase');
        const encrypted = await keyTree.symmetricEncrypt(['path1'], 'test');

        await expect(async () => {
            await keyTree.symmetricDecryptString(['wrong-path'], encrypted);
        }).rejects.toThrow();
    });

    it('should derive different keys for different paths', async () => {
        const keyTree = await KeyTree.create('test', 'testcase');
        const data = 'test';

        const encrypted1 = await keyTree.symmetricEncrypt(['path1'], data);
        const encrypted2 = await keyTree.symmetricEncrypt(['path2'], data);

        // Encrypted data should be different due to different keys and random nonce
        expect(encrypted1).not.toEqual(encrypted2);

        // But both should decrypt correctly with their respective paths
        const decrypted1 = await keyTree.symmetricDecryptString(['path1'], encrypted1);
        const decrypted2 = await keyTree.symmetricDecryptString(['path2'], encrypted2);

        expect(decrypted1).toEqual(data);
        expect(decrypted2).toEqual(data);
    });

    it('should produce different ciphertexts for same data and path', async () => {
        const keyTree = await KeyTree.create('test', 'testcase');
        const data = 'test';
        const path = ['test-path'];

        // Encrypt the same data multiple times
        const encrypted1 = await keyTree.symmetricEncrypt(path, data);
        const encrypted2 = await keyTree.symmetricEncrypt(path, data);
        const encrypted3 = await keyTree.symmetricEncrypt(path, data);

        // All encryptions should be different due to random nonce
        expect(encrypted1).not.toEqual(encrypted2);
        expect(encrypted2).not.toEqual(encrypted3);
        expect(encrypted1).not.toEqual(encrypted3);

        // But they should all decrypt to the same original data
        const decrypted1 = await keyTree.symmetricDecryptString(path, encrypted1);
        const decrypted2 = await keyTree.symmetricDecryptString(path, encrypted2);
        const decrypted3 = await keyTree.symmetricDecryptString(path, encrypted3);

        expect(decrypted1).toEqual(data);
        expect(decrypted2).toEqual(data);
        expect(decrypted3).toEqual(data);
    });

    it('should derive consistent symmetric keys for the same path', async () => {
        const keyTree1 = await KeyTree.create('test', 'testcase');
        const keyTree2 = await KeyTree.create('test', 'testcase');
        const path = ['test', 'path'];

        const key1 = keyTree1.deriveSymmetricKey(path);
        const key2 = keyTree2.deriveSymmetricKey(path);

        expect(key1).toEqual(key2);
        expect(key1).toMatchSnapshot();
    });

    it('should derive consistent Curve25519 keys for the same path', async () => {
        const keyTree1 = await KeyTree.create('test', 'testcase');
        const keyTree2 = await KeyTree.create('test', 'testcase');
        const path = ['test', 'path'];

        const keypair1 = keyTree1.deriveCurve25519Key(path);
        const keypair2 = keyTree2.deriveCurve25519Key(path);

        expect(keypair1.secret).toEqual(keypair2.secret);
        expect(keypair1.public).toEqual(keypair2.public);
        expect(keypair1).toMatchSnapshot();
    });

    it('should derive different keys for different usages', async () => {
        const keyTree1 = await KeyTree.create('test', 'usage1');
        const keyTree2 = await KeyTree.create('test', 'usage2');
        const path = ['test', 'path'];

        const key1 = keyTree1.deriveSymmetricKey(path);
        const key2 = keyTree2.deriveSymmetricKey(path);

        expect(key1).not.toEqual(key2);
    });
});