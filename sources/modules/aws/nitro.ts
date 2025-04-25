import { decodeBase64, encodeBase64 } from "../formats/base64";
import { decodeCBOR, encodeCBOR } from "./impl/cbor";
import * as z from 'zod';
import { createSignedBundle, verifyNitroChain, verifyNitroSignature } from "./impl/nitro_verify";
import { encodeHex } from "../formats/hex";

export type NitroEnclaveAttestation = {
    raw: {
        headerProtected: Uint8Array;
        headerUnprotected: any;
        message: Uint8Array;
        signature: Uint8Array;
    },
    document: {
        moduleId: string
        timestamp: number,
        pcrs: Record<number, string>,
        nonce: Uint8Array | null,
        userData: Uint8Array | null,
        publicKey: Uint8Array | null,
    }
}

//
// Parsing
// Docs: https://aws.amazon.com/blogs/compute/validating-attestation-documents-produced-by-aws-nitro-enclaves/
//

const pkgSchema = z.tuple([
    z.instanceof(Uint8Array),
    z.record(z.any(), z.any()), // Not used
    z.instanceof(Uint8Array),
    z.instanceof(Uint8Array)
]);

const documentSchema = z.object({
    module_id: z.string(),
    digest: z.literal('SHA384'),
    timestamp: z.number(),
    pcrs: z.record(z.string(), z.instanceof(Uint8Array)),
    certificate: z.instanceof(Uint8Array),
    cabundle: z.array(z.instanceof(Uint8Array)),
    public_key: z.instanceof(Uint8Array).nullable(),
    user_data: z.instanceof(Uint8Array).nullable(),
    nonce: z.instanceof(Uint8Array).nullable(),
});

export async function parseNitroEnclaveAttestation(body: string): Promise<NitroEnclaveAttestation> {

    // Decode the package
    const decoded = decodeCBOR(decodeBase64(body));
    const d = pkgSchema.safeParse(decoded);
    if (!d.success) {
        throw new Error('Invalid attestation');
    }
    const [headerProtected, headerUnprotected, message, signature] = d.data;
    if (headerProtected[0] !== 0xA1 || headerProtected[1] !== 0x01 || headerProtected[2] !== 0x38 || headerProtected[3] !== 0x22) {
        throw new Error('Invalid attestation');
    }
    if (signature.length !== 96) {
        throw new Error('Invalid attestation');
    }

    // console.log(encodeBase64(message));

    // Decode the attestation documemnt
    const document = decodeCBOR(message);
    const d2 = documentSchema.safeParse(document);
    if (!d2.success) {
        throw new Error('Invalid attestation');
    }
    const attestation = d2.data;
    
    // Check the chain
    const chain = [...attestation.cabundle, attestation.certificate];
    const publicKey = await verifyNitroChain(chain);

    // Check the signature
    const signedData = createSignedBundle({
        protectedHeader: headerProtected,
        data: message
    })
    await verifyNitroSignature({
        publicKey,
        message: signedData,
        signature
    });

    // Return the attestation

    const pcrs: Record<number, string> = {};
    for (const [key, value] of Object.entries(attestation.pcrs)) {
        pcrs[parseInt(key)] = encodeHex(value, 'mac');
    }

    return {
        raw: {
            headerProtected,
            headerUnprotected,
            message,
            signature
        },
        document: {
            moduleId: attestation.module_id,
            timestamp: attestation.timestamp,
            pcrs,
            nonce: attestation.nonce,
            userData: attestation.user_data,
            publicKey: attestation.public_key
        }
    }
}