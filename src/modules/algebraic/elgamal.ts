import { randomBytes } from "../crypto/randomKey";
import { Point } from "./math/point";
import { deriveScalar } from "./math/scalar";

//
// ElGamal encryption
// 

export function elgamalGenerateKeyPair() {
    const seed = randomBytes(64);
    return elgamalDeriveKeyPair(seed);
}

export function elgamalDeriveKeyPair(seed: Uint8Array) {
    const sk = deriveScalar(seed, 'elgamal');
    const pk = Point.BASE.multiply(sk);
    return { sk, pk };
}

export function elgamalEncrypt(pk: Point, message: Uint8Array) {
    const r = deriveScalar(randomBytes(64), 'elgamal');
    const c1 = Point.BASE.multiply(r);
    const c2 = pk.add(Point.encodeBytesToPoint(message)).multiply(r);
    return { c1, c2 };
}

export function elgamalDecrypt(sk: bigint, c1: Point, c2: Point) {
    const r = c1.multiply(sk);
    return Point.decodePointToBytes(c2.subtract(r));
}