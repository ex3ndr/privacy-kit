import { describe, it, expect } from "vitest";
import { oprfClient, oprfServer, poprfClient, poprfServer, voprfClient, voprfServer } from "./oprf";
import { decodeHex, encodeHex } from "../formats/hex";
import { generatePublicKey, Oprf } from "@cloudflare/voprf-ts";
import { decodeUTF8, encodeUTF8 } from "../formats/text";

describe('oprf', () => {
    it('should be able to blind and finalize', async () => {
        const secret = decodeHex('4DE2C594A99D1E3EA223BA375222D181963750C47953097F519DFECB256DAF0D'); // await oprfServerPrivateKey();
        const client = oprfClient('ristretto255');
        const server = oprfServer('ristretto255', secret);

        const input = decodeHex('97345D4D1B33C327FF1BD8CA08070A9B5DBD6A445AAEF6477AAAD237F2CBE415'); // randomBytes(32);
        const blinded = await client.blind(input);
        const response = await server.calculate(blinded);
        const result = await client.resolve(response);
        expect(encodeHex(result)).toEqual('E08C31835057F1AE5F737CBC494DC6E9C055A00ADE67FAF78C02FA7DE1FD93815D29A7C1CDFFC70370808CEFB9774FB60A853893AFCAEEEEF9F48BBB97434EBE');
    })
    it('should be able to blind and finalize voprf  ', async () => {
        const secret = decodeHex('4DE2C594A99D1E3EA223BA375222D181963750C47953097F519DFECB256DAF0D'); // await oprfServerPrivateKey();
        const publicKey = generatePublicKey(Oprf.Suite.RISTRETTO255_SHA512, secret, require('@cloudflare/voprf-ts/crypto-noble').CryptoNoble);
        const server = voprfServer('ristretto255', secret);
        const client = voprfClient('ristretto255', publicKey);


        const input = decodeHex('97345D4D1B33C327FF1BD8CA08070A9B5DBD6A445AAEF6477AAAD237F2CBE415'); // randomBytes(32);
        const blinded = await client.blind(input);
        const response = await server.calculate(blinded);
        const result = await client.resolve(response);
        expect(encodeHex(result)).toEqual('E6D10478AF1A10DB761F2123584A2BBF4B12632734EA6BF32CD2A57D9910422809A9953C4BDABA78D21754B3A3E1F9C0CA4CE6B65E3425373D448D864F684A11');
    });
    it('should be able to blind and finalize poprf', async () => {
        const secret = decodeHex('4DE2C594A99D1E3EA223BA375222D181963750C47953097F519DFECB256DAF0D'); // await oprfServerPrivateKey();
        const publicKey = generatePublicKey(Oprf.Suite.RISTRETTO255_SHA512, secret, require('@cloudflare/voprf-ts/crypto-noble').CryptoNoble);
        const server = poprfServer('ristretto255', secret);
        const client = poprfClient('ristretto255', publicKey);

        const input = decodeHex('97345D4D1B33C327FF1BD8CA08070A9B5DBD6A445AAEF6477AAAD237F2CBE415'); // randomBytes(32);
        const info = encodeUTF8('hello world');
        const blinded = await client.blind(input);
        const response = await server.calculate(blinded, info);
        const result = await client.resolve(response, info);
        expect(encodeHex(result)).toEqual('4E854C6639107E8AB8265B963648052313BD588B74D8C8D0FD69E416DB8673A0A0A0CC5A0DBC1AE192F07DC4742CDCA0167A977FAACD1B70FE25F1B57DAC0F96');
    });
});