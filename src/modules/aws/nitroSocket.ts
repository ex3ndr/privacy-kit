import * as https from "https";
import * as tls from 'tls';
import { randomBytes } from 'crypto';
import { IncomingMessage } from 'http';
import { NitroEnclaveAttestation, parseNitroEnclaveAttestation } from "./nitro";
import { decodeHex } from "../formats/hex";

export async function fetchAttestation(host: string, port: number) {

    // Generate a random nonce for the attestation request
    const nonce = randomBytes(40).toString('hex');

    // Return a promise that resolves with the attestation data
    const raw = (await new Promise<string>((resolve, reject) => {
        const request = https.request({
            host: host,
            port: port,
            path: `/enclave/attestation?nonce=${nonce}`,
            method: 'GET',
            rejectUnauthorized: false
        }, (response: IncomingMessage) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                resolve(data);
            });
        });

        request.on('error', (error) => {
            reject(error);
        });

        request.end();
    })).trim();

    // Parse the attestation
    return await parseNitroEnclaveAttestation(raw);
}

async function createNitroConnection(host: string, port: number, trusted: {
    pcr1: string,
    pcr2: string
}[] | ((document: NitroEnclaveAttestation) => Promise<boolean>)) {

    // Create TLS socket
    const socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const socket = tls.connect({
            host: host,
            port: port,
            rejectUnauthorized: false,
        });
        socket.once('secureConnect', () => {
            resolve(socket);
        });
        socket.once('error', (err: any) => {
            reject(err);
        });
    });

    // Get certificate
    const cert = socket.getPeerCertificate();
    if (!cert) {
        throw new Error('No certificate');
    }

    // Fetch attestation data
    const attestation = await fetchAttestation(host, port);
    try {
        const userData = attestation.document.userData;
        if (!userData) {
            throw new Error('No user data');
        }

        // Verify user data
        const certificateHash = new Uint8Array([...decodeHex('73:68:61:32:35:36:3A', 'mac'), ...decodeHex(cert.fingerprint256!, 'mac')]);
        if (userData.length < certificateHash.length) {
            throw new Error('Invalid user data');
        }
        for (let i = 0; i < certificateHash.length; i++) {
            if (userData[i] !== certificateHash[i]) {
                throw new Error('Invalid user data');
            }
        }

        // Verify kernels
        let found = false;
        if (Array.isArray(trusted)) {
            for (const t of trusted) {
                const pcr1 = attestation.document.pcrs[1];
                const pcr2 = attestation.document.pcrs[2];
                if (!pcr1 || !pcr2) {
                    throw new Error('No PCR');
                }
                if (pcr1.toLowerCase() === t.pcr1.toLowerCase() && pcr2.toLowerCase() === t.pcr2.toLowerCase()) {
                    found = true;
                    break;
                }
            }
        } else {
            found = await trusted(attestation);
        }
        if (!found) {
            throw new Error('Untrusted');
        }
    } catch (e) {
        socket.destroy();
        throw e;
    }

    return socket;
}

export function createNitroHttpAgent(opts: {
    trusted: {
        pcr1: string,
        pcr2: string
    }[] | ((document: NitroEnclaveAttestation) => Promise<boolean>)
}) {

    const agent = new https.Agent({
        rejectUnauthorized: false,
    });
    (agent as any).createConnection = function (options: any, oncreate: any) {
        createNitroConnection(options.host, options.port, opts.trusted).then((result) => {
            oncreate(null, result);
        }).catch((err) => {
            oncreate(err);
        });
    };
    return agent;
}
