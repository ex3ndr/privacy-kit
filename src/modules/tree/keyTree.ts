import { concatBytes } from "../formats/bytes";
import { decodeUTF8, encodeUTF8 } from "../formats/text";
import { deriveSecretKeyTreeChild } from "../crypto/deriveKey";
import * as crypto from 'crypto';
import * as tweetnacl from 'tweetnacl';
import { hmac_sha512 } from "../crypto/hmac_sha512";

const PACKAGE_AES_BUFFER = 0;

export class KeyTree {

    #master: Uint8Array

    constructor(master: Uint8Array) {
        this.#master = master;
        Object.freeze(this);
    }

    //
    // Subtree
    //

    subtree(path: string[]): KeyTree {
        const key = this.#deriveSubtreeKey(path);
        return new KeyTree(key);
    }

    //
    // Derive keys
    //

    deriveSymmetricKey(path: string[]): Uint8Array {
        return this.#deriveKey('aes256', [...path]);
    }

    deriveCurve25519Key(path: string[]): { secret: Uint8Array, public: Uint8Array } {
        const seed = this.#deriveKey('nacl', path);
        const keypair = tweetnacl.box.keyPair.fromSecretKey(seed);
        return {
            secret: keypair.secretKey,
            public: keypair.publicKey
        };
    }

    //
    // Hashing
    //

    hash(path: string[], data: Uint8Array | string): Uint8Array {
        const key = this.#deriveKey('hmac_sha512', [...path]);
        return hmac_sha512(key, data);
    }

    //
    // Encryption
    //

    async symmetricEncrypt(path: string[], data: Uint8Array | string): Promise<Uint8Array> {
        const key = this.deriveSymmetricKey(path);
        const nonce = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
        const encrypted = cipher.update(typeof data === 'string' ? encodeUTF8(data) : data);
        const encryptedFinal = cipher.final();
        const authTag = cipher.getAuthTag();
        return concatBytes(
            Uint8Array.from([PACKAGE_AES_BUFFER]),
            nonce,
            encrypted,
            encryptedFinal,
            authTag
        );
    }

    async symmetricDecryptBuffer(path: string[], data: Uint8Array): Promise<Uint8Array> {
        if (data[0] !== PACKAGE_AES_BUFFER) {
            throw new Error('Invalid data');
        }
        const key = this.deriveSymmetricKey(path);
        const nonce = data.subarray(1, 1 + 12);
        const encrypted = data.subarray(13, data.length - 16);
        const authTag = data.subarray(data.length - 16, data.length);
        const cipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
        cipher.setAuthTag(authTag);

        const decrypted = cipher.update(encrypted);
        const decryptedFinal = cipher.final();
        return concatBytes(decrypted, decryptedFinal);
    }

    async symmetricDecryptString(path: string[], data: Uint8Array): Promise<string> {
        const decrypted = await this.symmetricDecryptBuffer(path, data);
        return decodeUTF8(decrypted);
    }

    #deriveKey(algo: string, path: string[]): Uint8Array {
        for (let p of path) {
            if (p.startsWith('#')) {
                throw new Error('Path element cannot start with #');
            }
        }
        let remaining = [...path, '#' + algo];
        let state = this.#master;
        while (true) {
            let index = remaining[0];
            remaining = remaining.slice(1);
            let ch = deriveSecretKeyTreeChild(state, index);
            if (remaining.length > 0) {
                state = ch.chainCode;
            } else {
                return ch.key;
            }
        }
    }

    #deriveSubtreeKey(path: string[]): Uint8Array {
        for (let p of path) {
            if (p.startsWith('#')) {
                throw new Error('Path element cannot start with #');
            }
        }
        let remaining = [...path];
        let state = this.#master;
        while (true) {
            let index = remaining[0];
            remaining = remaining.slice(1);
            let ch = deriveSecretKeyTreeChild(state, index);
            if (remaining.length > 0) {
                state = ch.chainCode;
            } else {
                return ch.chainCode;
            }
        }
    }
}