import {
    Evaluation,
    EvaluationRequest,
    FinalizeData,
    Oprf, OPRFClient,
    OPRFServer,
    randomPrivateKey
} from '@cloudflare/voprf-ts';
import { encodeUTF8 } from '../formats/text';

const cryptoProvider = require('@cloudflare/voprf-ts/crypto-noble').CryptoNoble;

//
// OPRF
//

export function oprfClient(algo: 'ristretto255' | 'p256' = 'ristretto255') {
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

export async function oprfServerPrivateKey(algo: 'ristretto255' | 'p256' = 'ristretto255') {
    const suite = algo === 'ristretto255' ? Oprf.Suite.RISTRETTO255_SHA512 : Oprf.Suite.P256_SHA256;
    return await randomPrivateKey(suite, cryptoProvider);
}

export function oprfServer(secretKey: Uint8Array, algo: 'ristretto255' | 'p256' = 'ristretto255') {
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