import * as x509 from "@peculiar/x509";
import { p384 } from '@noble/curves/p384';
import { sha384 } from "@noble/hashes/sha2";
import { amdMilanCa } from "./amd_ca";
import { concatBytes } from "../../../formats/bytes";

export async function verifyAMD(data: Uint8Array, signature: Uint8Array, certificate: Uint8Array) {

    // Load CA
    let chain = amdMilanCa.map((b) => new x509.X509Certificate(b)).reverse();
    chain.push(new x509.X509Certificate(certificate));

    // Check that all certs are valid
    for (let c of chain) {
        if (c.notAfter.getTime() < new Date().getTime()) {
            console.log(c.notBefore.getTime() + ' - ' + c.notAfter.getTime());
            throw new Error("Cert expired");
        }
        if (c.notBefore.getTime() > new Date().getTime()) {
            console.log(c.notBefore.getTime() + ' - ' + c.notAfter.getTime());
            throw new Error("Cert not yet valid");
        }
    }

    // Check that the chain is valid
    for (let i = 1; i < chain.length; i++) {
        const current = chain[i];
        const previous = chain[i - 1];
        if (!await current.verify(previous)) {
            throw new Error("Invalid chain (invalid signature) " + i);
        }
    }

    // Check algorithm
    if (!chain[chain.length - 1].publicKey || chain[chain.length - 1].publicKey.algorithm.name !== 'ECDSA') {
        throw new Error("Invalid chain (invalid algorithm)");
    }

    // Check signature
    const publicKey = new Uint8Array(chain[chain.length - 1].publicKey!.rawData);
    const msg = sha384(data);
    const sig = p384.Signature.fromCompact(concatBytes(signature.slice(0, 48).reverse(), signature.slice(72, 72 + 48).reverse()));
    return p384.verify(sig, msg, publicKey.slice(23));
}