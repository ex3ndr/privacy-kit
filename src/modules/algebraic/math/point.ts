import { encodeBigInt } from "@/modules/algebraic/encoding/bigint";
import { padBytes } from "@/modules/formats/bytes";
import { encodeUTF8 } from "@/modules/formats/text";
import { ed25519, hashToRistretto255, RistrettoPoint } from "@noble/curves/ed25519";

type IntPoint = typeof RistrettoPoint.BASE;

export class Point {

    static ORDER = ed25519.CURVE.n;
    static ZERO = new Point(RistrettoPoint.ZERO);

    static add(...points: Point[]) {
        let r = points[0];
        for (let i = 1; i < points.length; i++) {
            r = r.add(points[i]);
        }
        return r;
    }

    static fromHash(src: Uint8Array | string | number | bigint, dst: string) {
        let v: Uint8Array;
        if (typeof src === 'string') {
            v = encodeUTF8(src);
        } else if (typeof src === 'number') {
            v = encodeBigInt(BigInt(src));
        } else if (typeof src === 'bigint') {
            v = encodeBigInt(src);
        } else {
            v = src;
        }
        return new Point(hashToRistretto255(v, { DST: dst }));
    }

    static encodeScalar(scalar: bigint) {
        return new Point(RistrettoPoint.hashToCurve(padBytes(encodeBigInt(scalar), 64)));
    }

    static fromBytes(bytes: Uint8Array) {
        return new Point(RistrettoPoint.fromHex(bytes));
    }

    #point: IntPoint;

    private constructor(point: IntPoint) {
        this.#point = point;
    }

    multiply(scalar: bigint) {
        return new Point(this.#point.multiply(scalar));
    }

    add(other: Point) {
        return new Point(this.#point.add(other.#point));
    }

    subtract(other: Point) {
        return new Point(this.#point.subtract(other.#point));
    }

    toBytes() {
        return this.#point.toRawBytes();
    }

    equals(other: Point) {
        return this.#point.equals(other.#point);
    }
}