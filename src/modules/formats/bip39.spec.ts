import { describe, expect, it, } from "vitest";
import { decodeBip39 } from "./bip39";
import { encodeBip39 } from "./bip39";
import { decodeHex, encodeHex } from "./hex";

describe('bip39', () => {
    it('should encode and decode a secret key', () => {
        const vectors = [
            // 12 words
            [
                "00000000000000000000000000000000",
                "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
            ],
            [
                "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f",
                "legal winner thank year wave sausage worth useful legal winner thank yellow",
            ],
            [
                "80808080808080808080808080808080",
                "letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
            ],
            [
                "ffffffffffffffffffffffffffffffff",
                "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong",
            ],
            [
                "77c2b00716cec7213839159e404db50d",
                "jelly better achieve collect unaware mountain thought cargo oxygen act hood bridge"
            ],
            [
                "0460ef47585604c5660618db2e6a7e7f",
                "afford alter spike radar gate glance object seek swamp infant panel yellow",
            ],
            [
                "eaebabb2383351fd31d703840b32e9e2",
                "turtle front uncle idea crush write shrug there lottery flower risk shell",
            ],
            [
                "18ab19a9f54a9274f03e5209a2ac8a91",
                "board flee heavy tunnel powder denial science ski answer betray cargo cat",
            ],

            // 24 Words
            [
                "0000000000000000000000000000000000000000000000000000000000000000",
                "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
            ],
            [
                "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f",
                "legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title",
            ],
            [
                "8080808080808080808080808080808080808080808080808080808080808080",
                "letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic bless",
            ],
            [
                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
                "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote",
            ],
            [
                "3e141609b97933b66a060dcddc71fad1d91677db872031e85f4c015c5e7e8982",
                "dignity pass list indicate nasty swamp pool script soccer toe leaf photo multiply desk host tomato cradle drill spread actor shine dismiss champion exotic",
            ],
            [
                "2c85efc7f24ee4573d2b81a6ec66cee209b2dcbd09d8eddc51e0215b0b68e416",
                "clutch control vehicle tonight unusual clog visa ice plunge glimpse recipe series open hour vintage deposit universe tip job dress radar refuse motion taste",
            ],
            [
                "4fa1a8bc3e6d80ee1316050e862c1812031493212b7ec3f3bb1b08f168cabeef",
                "exile ask congress lamp submit jacket era scheme attend cousin alcohol catch course end lucky hurt sentence oven short ball bird grab wing top",
            ],
            [
                "15da872c95a13dd738fbf50e427583ad61f18fd99f628c417a61cf8343c90419",
                "beyond stage sleep clip because twist token leaf atom beauty genius food business side grid unable middle armed observe pair crouch tonight away coconut",
            ]
        ];

        for (const vector of vectors) {
            const [secret, mnemonic] = vector;

            // Check decoding
            const decoded = decodeBip39(mnemonic);
            expect(encodeHex(decoded)).toEqual(secret.toUpperCase());

            // Check encoding
            const encoded = encodeBip39(decodeHex(secret));
            expect(encoded.join(' ')).toEqual(mnemonic);
        }
    });
});