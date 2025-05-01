import { concatBytes } from "../formats/bytes";
import { encodeUTF8 } from "../formats/utf8";
import { hmac_sha512 } from "./hmac_sha512";

export type KeyTreeState = {
    key: Uint8Array,
    chainCode: Uint8Array
};

export function deriveSecretKeyTreeRoot(seed: string | Uint8Array | Buffer, usage: string): KeyTreeState {
    const I = hmac_sha512(usage + ' Master Seed', seed);
    return {
        key: I.slice(0, 32),
        chainCode: I.slice(32)
    };
}

export function deriveSecretKeyTreeChild(state: KeyTreeState, index: string): KeyTreeState {

    // Prepare data
    const data = concatBytes(new Uint8Array([0x0]), encodeUTF8(index)); // prepend 0x00 for separator

    // Derive key
    const I = hmac_sha512(state.chainCode, data);
    const IL = I.subarray(32);
    const IR = I.subarray(0, 32);
    return {
        key: IL,
        chainCode: IR,
    };
}

export function deriveKey(master: Uint8Array, usage: string, path: string[]): Uint8Array {
    let state = deriveSecretKeyTreeRoot(master, usage);
    let remaining = [...path];
    while (remaining.length > 0) {
        let index = remaining[0];
        remaining = remaining.slice(1);
        state = deriveSecretKeyTreeChild(state, index);
    }
    return state.key;
}