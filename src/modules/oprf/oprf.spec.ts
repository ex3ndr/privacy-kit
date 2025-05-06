import { describe, it, expect } from "vitest";
import { oprfClient } from "./oprf";
import { oprfServer } from "./oprf";
import { decodeHex, encodeHex } from "../formats/hex";

describe('oprf', () => {
    it('should be able to blind and finalize', async () => {
        const secret = decodeHex('4DE2C594A99D1E3EA223BA375222D181963750C47953097F519DFECB256DAF0D'); // await oprfServerPrivateKey();
        const client = oprfClient();
        const server = oprfServer(secret);

        const input = decodeHex('97345D4D1B33C327FF1BD8CA08070A9B5DBD6A445AAEF6477AAAD237F2CBE415'); // randomBytes(32);
        const blinded = await client.blind(input);
        const response = await server.calculate(blinded);
        const result = await client.resolve(response);
        expect(encodeHex(result)).toEqual('E08C31835057F1AE5F737CBC494DC6E9C055A00ADE67FAF78C02FA7DE1FD93815D29A7C1CDFFC70370808CEFB9774FB60A853893AFCAEEEEF9F48BBB97434EBE');
    })
});