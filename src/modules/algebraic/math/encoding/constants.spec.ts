import { describe, expect, it } from "vitest";
import { encodingConstants } from "./constants";
import { ed25519 } from "@noble/curves/ed25519";

describe('encoding constants', () => {
    it('should be defined', () => {
        const fp = ed25519.CURVE.Fp;
        expect(encodingConstants.SQRT_M1).toEqual(fp.neg(fp.sqrt(fp.neg(1n))));
    });
});