import { Point } from "./point";

export class KeyPair {
    publicKey: Point;
    secretKey: bigint;

    constructor(publicKey: Point, secretKey: bigint) {
        this.publicKey = publicKey;
        this.secretKey = secretKey;
        Object.freeze(this);
    }
}