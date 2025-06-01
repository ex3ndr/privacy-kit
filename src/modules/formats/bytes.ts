import { decodeUTF8 } from "./text";

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
    let length = 0;
    for (const arr of arrays) {
        length += arr.length;
    }
    const result = new Uint8Array(length);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a[i] ^ b[i];
    }
    return result === 0;
}

export function encodeUInt32(value: number): Uint8Array {
    return new Uint8Array([
        (value >> 24) & 0xff,
        (value >> 16) & 0xff,
        (value >> 8) & 0xff,
        value & 0xff
    ]);
}

export function decodeUInt32(value: Uint8Array): number {
    return (value[0] << 24) | (value[1] << 16) | (value[2] << 8) | value[3];
}

//
// Byte Reader and Writer
//

export class ByteReader {
    #offset = 0;
    #bytes: Uint8Array;

    constructor(bytes: Uint8Array) {
        this.#bytes = bytes;
    }

    get offset(): number {
        return this.#offset;
    }

    readByte(): number {
        if (this.#offset >= this.#bytes.length) {
            throw new Error('EOF');
        }
        const value = this.#bytes[this.#offset];
        this.#offset++;
        return value;
    }

    readUInt32BE(): number {
        if (this.#offset + 4 > this.#bytes.length) {
            throw new Error('EOF');
        }
        const value = decodeUInt32(this.#bytes.slice(this.#offset, this.#offset + 4));
        this.#offset += 4;
        return value;
    }

    readUInt32LE(): number {
        if (this.#offset + 4 > this.#bytes.length) {
            throw new Error('EOF');
        }
        const value = decodeUInt32(this.#bytes.slice(this.#offset, this.#offset + 4).reverse());
        this.#offset += 4;
        return value;
    }

    readBytes(length: number): Uint8Array {
        if (this.#offset + length > this.#bytes.length) {
            throw new Error('EOF');
        }
        const value = this.#bytes.slice(this.#offset, this.#offset + length);
        this.#offset += length;
        return value;
    }

    readString(length: number): string {
        if (this.#offset + length > this.#bytes.length) {
            throw new Error('EOF');
        }
        return decodeUTF8(this.readBytes(length));
    }

    skip(length: number): void {
        if (this.#offset + length > this.#bytes.length) {
            throw new Error('EOF');
        }
        this.#offset += length;
    }
}