import { expect, describe, it } from "vitest";
import { sha512 } from "./sha512";
import { decodeHex } from "../formats/hex";
import { encodeUTF8 } from "../formats/utf8";

// https://www.di-mgt.com.au/sha_testvectors.html
const VECTORS = [
    { value: 'abc', output: 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f' },
    { value: '', output: 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e' },
    { value: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', output: '204a8fc6dda82f0a0ced7beb8e08a41657c16ef468b228a8279be331a703c33596fd15c13b1b07f9aa1d3bea57789ca031ad85c7a71dd70354ec631238ca3445' }
];

describe('sha512', () => {
    it('should process test vectors', async () => {
        for (let vec of VECTORS) {
            let expected = decodeHex(vec.output);
            let res = sha512(vec.value);
            expect(res).toEqual(expected);
            res = sha512(encodeUTF8(vec.value));
            expect(res).toEqual(expected);
        }
    });
})