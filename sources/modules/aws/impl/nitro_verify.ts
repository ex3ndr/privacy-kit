import * as x509 from "@peculiar/x509";
import { nitroCa } from "./nitro_ca";
import { decodeBase64, encodeBase64 } from "../../formats/base64";
import { decodeHex } from "../../formats/hex";
import { p384 } from '@noble/curves/p384';
import { sha384 } from "@noble/hashes/sha2";
import { encodeCBOR } from "./cbor";
import * as crypto from 'crypto';

export async function verifyNitroChain(chain: Uint8Array[]) {

    //
    // NOTE: We dont care about the timing attacks here, since we are verifying the public certificate
    //

    const certs = chain.map((b) => new x509.X509Certificate(b));

    // Check that first cert is the same as the root cert
    let root = new x509.X509Certificate(decodeBase64(nitroCa));
    let first = certs[0];

    // Check that the thumbprints are the same
    const rootThumbprint = new Uint8Array(await root.getThumbprint({ name: 'SHA-256' }));
    const firstThumbprint = new Uint8Array(await first.getThumbprint({ name: 'SHA-256' }));
    const golden = decodeHex('641A0321A3E244EFE456463195D606317ED7CDCC3C1756E09893F3C68F79BB5B');
    if (rootThumbprint.length !== golden.length || firstThumbprint.length !== golden.length) {
        throw new Error("Invalid chain (invalid thumbprint)");
    }
    for (let i = 0; i < rootThumbprint.length; i++) {
        if (rootThumbprint[i] !== golden[i]) {
            throw new Error("Invalid chain (invalid thumbprint)");
        }
        if (firstThumbprint[i] !== golden[i]) {
            throw new Error("Invalid chain (invalid thumbprint)");
        }
    }

    // Just in case check more things
    if (!root.publicKey.equal(first.publicKey)) {
        throw new Error("Invalid chain (invalid public key)");
    }
    if (root.notAfter.getTime() !== first.notAfter.getTime()) {
        throw new Error("Cert chain not valid");
    }
    if (root.notBefore.getTime() !== first.notBefore.getTime()) {
        throw new Error("Cert chain not valid");
    }
    if (root.notAfter.getTime() < new Date().getTime()) {
        throw new Error("Root cert expired");
    }
    if (root.notBefore.getTime() > new Date().getTime()) {
        throw new Error("Root cert not yet valid");
    }

    // Check if all certs have valid algorithms
    for (let i = 0; i < certs.length; i++) {
        if (certs[i].signatureAlgorithm.name !== 'ECDSA' || certs[i].signatureAlgorithm.hash.name !== 'SHA-384') {
            throw new Error("Invalid chain (invalid algorithm)");
        }
        if (certs[i].notAfter.getTime() < new Date().getTime()) {
            console.log(certs[i].notBefore.getTime() + ' - ' + certs[i].notAfter.getTime());
            throw new Error("Cert expired");
        }
        if (certs[i].notBefore.getTime() > new Date().getTime()) {
            console.log(certs[i].notBefore.getTime() + ' - ' + certs[i].notAfter.getTime());
            throw new Error("Cert not yet valid");
        }
    }

    // Check that the chain is valid
    for (let i = 1; i < certs.length; i++) {
        const current = certs[i];
        const previous = certs[i - 1];
        if (!await current.verify(previous)) {
            throw new Error("Invalid chain (invalid signature) " + i);
        }
    }

    // Return the public key
    const publicKey = new Uint8Array(certs[certs.length - 1].publicKey.rawData);
    return publicKey;
}

export async function verifyNitroSignature(opts: {
    publicKey: Uint8Array,
    message: Uint8Array,
    signature: Uint8Array
}) {
    const data = sha384(opts.message);
    const sig = p384.Signature.fromCompact(opts.signature);
    const result = p384.verify(sig, data, opts.publicKey.slice(23));
    if (!result) {
        throw new Error("Invalid signature");
    }
}

export function createSignedBundle(opts: {
    protectedHeader: Uint8Array,
    data: Uint8Array
}) {
    const signedData = encodeCBOR([
        "Signature1",
        opts.protectedHeader,
        new Uint8Array(0),
        opts.data
    ]);
    return signedData;
}