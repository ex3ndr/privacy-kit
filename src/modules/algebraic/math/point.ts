import { encodeBigInt32 } from "@/modules/formats/bigint";
import { encodeUTF8 } from "@/modules/formats/text";
import { ed25519, hashToRistretto255, RistrettoPoint } from "@noble/curves/ed25519";
import { lizardDecode, lizardEncode } from "./encoding/lizard";

type IntPoint = typeof RistrettoPoint.BASE;

export class Point {

    static ORDER = ed25519.CURVE.n;
    static ZERO = new Point(RistrettoPoint.ZERO);
    static BASE = new Point(RistrettoPoint.BASE);

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
            v = encodeBigInt32(src);
        } else if (typeof src === 'bigint') {
            v = encodeBigInt32(src);
        } else {
            v = src;
        }
        return new Point(hashToRistretto255(v, { DST: dst }));
    }

    static encodeBytesToPoint(data: Uint8Array) {
        if (data.length !== 16) {
            throw new Error('Must be 16 bytes');
        }
        return lizardEncode(data);
    }

    static decodePointToBytes(point: Point) {  
        return lizardDecode(point);
    }

    static fromBytes(bytes: Uint8Array) {
        return new Point(RistrettoPoint.fromHex(bytes));
    }

    static fromAffine(point: { x: bigint, y: bigint }) {
        return new Point(RistrettoPoint.fromAffine(point));
    }

    static fromExtended(point: { X: bigint, Y: bigint, Z: bigint, T: bigint }) {
        return new Point(new RistrettoPoint(new ed25519.ExtendedPoint(point.X, point.Y, point.Z, point.T)));
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

    toAffine() {
        return (this.#point as any).ep.toAffine() as { x: bigint, y: bigint };
    }

    toExtended() {
        const ep = (this.#point as any).ep;
        return {
            X: ep.ex,
            Y: ep.ey,
            Z: ep.ez,
            T: ep.et
        };
    }
}