import {
    derivePrivateKey,
    Evaluation,
    EvaluationRequest,
    FinalizeData,
    generatePublicKey,
    Oprf, OPRFClient,
    OPRFServer,
    POPRFClient,
    POPRFServer,
    randomPrivateKey,
    VOPRFClient,
    VOPRFServer,
} from '@cloudflare/voprf-ts';
import { encodeUTF8 } from '../formats/text';

const cryptoProvider = require('@cloudflare/voprf-ts/crypto-noble').CryptoNoble;

//
// OPRF
//

export function oprfClient(algo: 'ristretto255' | 'p256') {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const client = new OPRFClient(suite, cryptoProvider);
    let state: FinalizeData | null = null;
    return {
        blind: async (input: Uint8Array | string) => {
            const data = typeof input === 'string' ? encodeUTF8(input) : input;
            const [finalizeData, evaluation] = await client.blind([data]);
            const e = evaluation.serialize();
            state = finalizeData;
            return e;
        },
        resolve: async (answer: Uint8Array) => {
            if (!state) {
                throw new Error('No state');
            }
            const evaluation = Evaluation.deserialize(suite, answer, cryptoProvider);
            const result = await client.finalize(state, evaluation);
            return result[0];
        }
    }
}

export function oprfServer(algo: 'ristretto255' | 'p256', secretKey: Uint8Array) {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const server = new OPRFServer(suite, secretKey, cryptoProvider);
    return {
        async calculate(input: Uint8Array) {
            let request = EvaluationRequest.deserialize(suite, input, cryptoProvider);
            let response = await server.blindEvaluate(request);
            return response.serialize();
        }
    }
}


//
// VOPRF
//

export function voprfClient(algo: 'ristretto255' | 'p256', publicKey: Uint8Array) {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const client = new VOPRFClient(suite, publicKey, cryptoProvider);
    let state: FinalizeData | null = null;
    return {
        blind: async (input: Uint8Array | string) => {
            const data = typeof input === 'string' ? encodeUTF8(input) : input;
            const [finalizeData, evaluation] = await client.blind([data]);
            const e = evaluation.serialize();
            state = finalizeData;
            return e;
        },
        resolve: async (answer: Uint8Array) => {
            if (!state) {
                throw new Error('No state');
            }
            const evaluation = Evaluation.deserialize(suite, answer, cryptoProvider);
            const result = await client.finalize(state, evaluation);
            return result[0];
        }
    }
}

export function voprfServer(algo: 'ristretto255' | 'p256', secretKey: Uint8Array) {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const server = new VOPRFServer(suite, secretKey, cryptoProvider);
    return {
        async calculate(input: Uint8Array) {
            let request = EvaluationRequest.deserialize(suite, input, cryptoProvider);
            let response = await server.blindEvaluate(request);
            return response.serialize();
        }
    }
}

//
// POPRF
//

export function poprfClient(algo: 'ristretto255' | 'p256', publicKey: Uint8Array) {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const client = new POPRFClient(suite, publicKey, cryptoProvider);
    let state: FinalizeData | null = null;
    return {
        blind: async (input: Uint8Array | string) => {
            const data = typeof input === 'string' ? encodeUTF8(input) : input;
            const [finalizeData, evaluation] = await client.blind([data]);
            const e = evaluation.serialize();
            state = finalizeData;
            return e;
        },
        resolve: async (answer: Uint8Array, info: Uint8Array) => {
            if (!state) {
                throw new Error('No state');
            }
            const evaluation = Evaluation.deserialize(suite, answer, cryptoProvider);
            const result = await client.finalize(state, evaluation, info);
            return result[0];
        }
    }
}

export function poprfServer(algo: 'ristretto255' | 'p256', secretKey: Uint8Array) {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const server = new POPRFServer(suite, secretKey, cryptoProvider);
    return {
        async calculate(input: Uint8Array, info: Uint8Array) {
            let request = EvaluationRequest.deserialize(suite, input, cryptoProvider);
            let response = await server.blindEvaluate(request, info);
            return response.serialize();
        }
    }
}

//
// Key Generation
//

export async function oprfDeriveKeyPair(algo: 'ristretto255' | 'p256', seed: Uint8Array) {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const privateKey = await derivePrivateKey(Oprf.Mode.OPRF, suite, seed, encodeUTF8('OPRF Derivation'), cryptoProvider);
    const publicKey = generatePublicKey(suite, privateKey, cryptoProvider);
    return {
        privateKey,
        publicKey
    }
}

export async function voprfDeriveKeyPair(algo: 'ristretto255' | 'p256', seed: Uint8Array) {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const privateKey = await derivePrivateKey(Oprf.Mode.VOPRF, suite, seed, encodeUTF8('VOPRF Derivation'), cryptoProvider);
    const publicKey = generatePublicKey(suite, privateKey, cryptoProvider);
    return {
        privateKey,
        publicKey
    }
}

export async function poprfDeriveKeyPair(algo: 'ristretto255' | 'p256', seed: Uint8Array) {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const privateKey = await derivePrivateKey(Oprf.Mode.POPRF, suite, seed, encodeUTF8('POPRF Derivation'), cryptoProvider);
    const publicKey = generatePublicKey(suite, privateKey, cryptoProvider);
    return {
        privateKey,
        publicKey
    }
}

export async function oprfGenerateKeyPair(algo: 'ristretto255' | 'p256') {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const privateKey = await randomPrivateKey(suite, cryptoProvider);
    const publicKey = generatePublicKey(suite, privateKey, cryptoProvider);
    return {
        privateKey,
        publicKey
    }
}

export async function voprfGenerateKeyPair(algo: 'ristretto255' | 'p256') {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const privateKey = await randomPrivateKey(suite, cryptoProvider);
    const publicKey = generatePublicKey(suite, privateKey, cryptoProvider);
    return {
        privateKey,
        publicKey
    }
}

export async function poprfGenerateKeyPair(algo: 'ristretto255' | 'p256') {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    const privateKey = await randomPrivateKey(suite, cryptoProvider);
    const publicKey = generatePublicKey(suite, privateKey, cryptoProvider);
    return {
        privateKey,
        publicKey
    }
}