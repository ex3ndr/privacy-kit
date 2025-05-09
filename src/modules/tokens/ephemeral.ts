import * as jose from 'jose';
import { SignJWT } from 'jose';
import { deriveSecureKey } from '../crypto/deriveSecureKey';
import { ed25519 } from '@noble/curves/ed25519';
import { encodeBase64 } from '../formats/base64';

export async function createEphemeralTokenGenerator(opts: {
    service: string,
    seed: string,
    ttl: number
}) {

    // Derive key
    const privateKey = (await deriveSecureKey({
        key: opts.seed,
        usage: opts.service + ' Ephemeral Token'
    })).subarray(0, 32);
    const publicKey = ed25519.getPublicKey(privateKey);

    // Import key
    const key = await jose.importJWK({
        kty: 'OKP',
        crv: 'Ed25519',
        d: encodeBase64(privateKey),
        x: encodeBase64(publicKey),
        alg: 'EdDSA'
    }, 'EdDSA');

    // Create token
    return {
        new: async (d: {
            user?: string, 
            extras?: Record<string, unknown>
        }) => {
            const signed = await new SignJWT({ sub: d.user, ...d.extras })
                .setProtectedHeader({ alg: 'EdDSA' })
                .setIssuedAt()
                .setNotBefore('0s')
                .setExpirationTime(Math.floor((Date.now() + opts.ttl) / 1000))
                .setIssuer(opts.service)
                .setJti(crypto.randomUUID())
                .sign(key);
            return signed;
        },
        publicKey: publicKey
    };
}

export async function createEphemeralTokenVerifier(opts: {
    service: string,
    publicKey: Uint8Array
}) {

    const key = await jose.importJWK({
        kty: 'OKP',
        crv: 'Ed25519',
        x: encodeBase64(opts.publicKey, 'base64url'),
        alg: 'EdDSA'
    }, 'EdDSA');

    return {
        verify: async (token: string) => {
            try {
                const { payload } = await jose.jwtVerify(token, key);
                if (payload.iss !== opts.service) {
                    return null;
                }
                const { iss, sub, aud, jti, nbf, exp, iat, ...extras } = payload;
                return {
                    user: sub ?? null,
                    uuid: jti ?? null,
                    extras: extras ?? {}
                }
            } catch (e) {
                return null;
            }
        }
    }
}

export const ephemeralToken = {
    generator: createEphemeralTokenGenerator,
    verifier: createEphemeralTokenVerifier
}