import * as nacl from "tweetnacl";
import { decodeUTF8, encodeUTF8 } from "../formats/text";
import * as z from "zod";
import { decodeUInt32, encodeUInt32 } from "../formats/bytes";
import type { Bytes } from "../../types";

export async function encodeRequest<T>(body: T) {
    const data = encodeUTF8(JSON.stringify(body));
    const keypair = nacl.box.keyPair();
    const nonce = new Uint8Array([...nacl.randomBytes(nacl.box.nonceLength - 4), ...encodeUInt32(Math.floor(Date.now() / 1000) + 5 * 60)]); // 5 minutes
    return {
        data: new Uint8Array([0, ...nonce, ...keypair.publicKey, ...data]),
        nonce,
        secretKey: keypair.secretKey,
        publicKey: keypair.publicKey
    }
}

export async function decodeRequest<T>(data: Bytes, schema: z.ZodSchema<T>) {
    if (data[0] !== 0) {
        return null;
    }
    const nonce = data.slice(1, 1 + nacl.box.nonceLength);
    const expires = decodeUInt32(nonce.slice(nacl.box.nonceLength - 4, nacl.box.nonceLength));
    const publicKey = data.slice(1 + nacl.box.nonceLength, 1 + nacl.box.nonceLength + nacl.box.publicKeyLength);
    const rawBody = data.slice(1 + nacl.box.nonceLength + nacl.box.publicKeyLength);
    if (expires < Math.floor(Date.now() / 1000)) {
        return null;
    }
    let body: any
    try {
        body = JSON.parse(decodeUTF8(rawBody));
    } catch (e) {
        return null;
    }
    const result = schema.safeParse(body);
    if (!result.success) {
        return null;
    }
    return {
        body: result.data,
        nonce,
        publicKey
    }
}

export async function encryptResponse<T>(body: T, nonce: Bytes, publicKey: Bytes) {
    const data = encodeUTF8(JSON.stringify(body));
    const keypair = nacl.box.keyPair();
    const expires = Math.floor(Date.now() / 1000) + 5 * 60; // 5 minutes
    const encrypted = nacl.box(new Uint8Array([...encodeUInt32(expires), ...data]), nonce, publicKey, keypair.secretKey);
    return new Uint8Array([1, ...keypair.publicKey, ...encrypted]);
}

export async function decryptResponse<T>(data: Bytes, nonce: Bytes, secretKey: Bytes, schema: z.ZodSchema<T>) {
    if (data[0] !== 1) {
        return null;
    }
    const senderPublicKey = data.slice(1, 1 + nacl.box.publicKeyLength);
    const encrypted = data.slice(1 + nacl.box.publicKeyLength);

    const decrypted = nacl.box.open(encrypted, nonce, senderPublicKey, secretKey);
    if (!decrypted) {
        return null;
    }
    const expires = decodeUInt32(decrypted.slice(0, 4));
    if (expires < Math.floor(Date.now() / 1000)) {
        return null;
    }
    let body: any
    try {
        body = JSON.parse(decodeUTF8(decrypted.slice(4)));
    } catch (e) {
        return null;
    }
    const result = schema.safeParse(body);
    if (!result.success) {
        return null;
    }
    return result.data;
}

export const request = {
    encodeRequest,
    decodeRequest,
    encryptResponse,
    decryptResponse
}
