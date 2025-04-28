import * as nacl from "tweetnacl";
import { decodeUTF8, encodeUTF8 } from "../formats/utf8";
import * as z from "zod";

export async function encodeRequest<T>(body: T) {
    const data = encodeUTF8(JSON.stringify(body));
    const keypair = nacl.box.keyPair();
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    return {
        data: new Uint8Array([0, ...nonce, ...keypair.publicKey, ...data]),
        nonce,
        secretKey: keypair.secretKey,
    }
}

export async function decodeRequest<T>(data: Uint8Array, schema: z.ZodSchema<T>) {
    if (data[0] !== 0) {
        return null;
    }
    const nonce = data.slice(1, 1 + nacl.box.nonceLength);
    const publicKey = data.slice(1 + nacl.box.nonceLength, 1 + nacl.box.nonceLength + nacl.box.publicKeyLength);
    const rawBody = data.slice(1 + nacl.box.nonceLength + nacl.box.publicKeyLength);
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

export async function encryptResponse<T>(body: T, nonce: Uint8Array, publicKey: Uint8Array) {
    const data = encodeUTF8(JSON.stringify(body));
    const keypair = nacl.box.keyPair();
    const encrypted = nacl.box(data, nonce, publicKey, keypair.secretKey);
    return new Uint8Array([1, ...keypair.publicKey, ...encrypted]);
}

export async function decryptResponse<T>(data: Uint8Array, nonce: Uint8Array, secretKey: Uint8Array, schema: z.ZodSchema<T>) {
    if (data[0] !== 1) {
        return null;
    }
    const senderPublicKey = data.slice(1, 1 + nacl.box.publicKeyLength);
    const encrypted = data.slice(1 + nacl.box.publicKeyLength);
    const decrypted = nacl.box.open(encrypted, nonce, senderPublicKey, secretKey);
    if (!decrypted) {
        return null;
    }
    let body: any
    try {
        body = JSON.parse(decodeUTF8(decrypted));
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