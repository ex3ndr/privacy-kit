/**
 * CBOR (Concise Binary Object Representation) implementation
 * Ported from JavaScript to TypeScript
 * 
 * Original MIT License notice:
 * The MIT License (MIT)
 * Copyright (c) 2014-2016 Patrick Gansterer <paroga@paroga.com>
 */

const POW_2_24: number = 5.960464477539063e-8;
const POW_2_32: number = 4294967296;
const POW_2_53: number = 9007199254740992;

type TagFunction = (value: any, tag: number) => any;
type SimpleValueFunction = (value: number) => any;

export function encodeCBOR(value: any): Uint8Array {
    let data = new Uint8Array(256);
    let dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let lastLength: number;
    let offset = 0;

    function prepareWrite(length: number): DataView {
        let newByteLength = data.byteLength;
        let requiredLength = offset + length;
        while (newByteLength < requiredLength)
            newByteLength <<= 1;
        if (newByteLength !== data.byteLength) {
            const oldDataView = dataView;
            data = new Uint8Array(newByteLength);
            dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
            const uint32count = (offset + 3) >> 2;
            for (let i = 0; i < uint32count; ++i)
                dataView.setUint32(i << 2, oldDataView.getUint32(i << 2));
        }

        lastLength = length;
        return dataView;
    }

    function commitWrite(): void {
        offset += lastLength;
    }

    function writeFloat64(value: number): void {
        const dv = prepareWrite(8);
        dv.setFloat64(offset, value);
        commitWrite();
    }

    function writeUint8(value: number): void {
        const dv = prepareWrite(1);
        dv.setUint8(offset, value);
        commitWrite();
    }

    function writeUint8Array(value: Uint8Array): void {
        const dataView = prepareWrite(value.length);
        for (let i = 0; i < value.length; ++i)
            dataView.setUint8(offset + i, value[i]);
        commitWrite();
    }

    function writeUint16(value: number): void {
        const dv = prepareWrite(2);
        dv.setUint16(offset, value);
        commitWrite();
    }

    function writeUint32(value: number): void {
        const dv = prepareWrite(4);
        dv.setUint32(offset, value);
        commitWrite();
    }

    function writeUint64(value: number): void {
        const low = value % POW_2_32;
        const high = (value - low) / POW_2_32;
        const dataView = prepareWrite(8);
        dataView.setUint32(offset, high);
        dataView.setUint32(offset + 4, low);
        commitWrite();
    }

    function writeTypeAndLength(type: number, length: number): void {
        if (length < 24) {
            writeUint8(type << 5 | length);
        } else if (length < 0x100) {
            writeUint8(type << 5 | 24);
            writeUint8(length);
        } else if (length < 0x10000) {
            writeUint8(type << 5 | 25);
            writeUint16(length);
        } else if (length < 0x100000000) {
            writeUint8(type << 5 | 26);
            writeUint32(length);
        } else {
            writeUint8(type << 5 | 27);
            writeUint64(length);
        }
    }

    function encodeItem(value: any): void {
        let i: number;

        if (value === false)
            return writeUint8(0xf4);
        if (value === true)
            return writeUint8(0xf5);
        if (value === null)
            return writeUint8(0xf6);
        if (value === undefined)
            return writeUint8(0xf7);

        switch (typeof value) {
            case "number":
                if (Math.floor(value) === value) {
                    if (0 <= value && value <= POW_2_53)
                        return writeTypeAndLength(0, value);
                    if (-POW_2_53 <= value && value < 0)
                        return writeTypeAndLength(1, -(value + 1));
                }
                writeUint8(0xfb);
                return writeFloat64(value);

            case "string": {
                const utf8data: number[] = [];
                for (i = 0; i < value.length; ++i) {
                    let charCode = value.charCodeAt(i);
                    if (charCode < 0x80) {
                        utf8data.push(charCode);
                    } else if (charCode < 0x800) {
                        utf8data.push(0xc0 | charCode >> 6);
                        utf8data.push(0x80 | charCode & 0x3f);
                    } else if (charCode < 0xd800) {
                        utf8data.push(0xe0 | charCode >> 12);
                        utf8data.push(0x80 | (charCode >> 6) & 0x3f);
                        utf8data.push(0x80 | charCode & 0x3f);
                    } else {
                        charCode = (charCode & 0x3ff) << 10;
                        charCode |= value.charCodeAt(++i) & 0x3ff;
                        charCode += 0x10000;

                        utf8data.push(0xf0 | charCode >> 18);
                        utf8data.push(0x80 | (charCode >> 12) & 0x3f);
                        utf8data.push(0x80 | (charCode >> 6) & 0x3f);
                        utf8data.push(0x80 | charCode & 0x3f);
                    }
                }

                writeTypeAndLength(3, utf8data.length);
                return writeUint8Array(new Uint8Array(utf8data));
            }

            default: {
                let length: number;
                if (Array.isArray(value)) {
                    length = value.length;
                    writeTypeAndLength(4, length);
                    for (i = 0; i < length; ++i)
                        encodeItem(value[i]);
                } else if (value instanceof Uint8Array) {
                    writeTypeAndLength(2, value.length);
                    writeUint8Array(value);
                } else {
                    const keys = Object.keys(value);
                    length = keys.length;
                    writeTypeAndLength(5, length);
                    for (i = 0; i < length; ++i) {
                        const key = keys[i];
                        encodeItem(key);
                        encodeItem(value[key]);
                    }
                }
            }
        }
    }

    encodeItem(value);

    if ("slice" in data)
        return data.slice(0, offset);

    const ret = new Uint8Array(offset);
    const retView = new DataView(ret.buffer, ret.byteOffset, ret.byteLength);
    for (let i = 0; i < offset; ++i)
        retView.setUint8(i, dataView.getUint8(i));
    return ret;
}

export function decodeCBOR(
    data: Uint8Array,
    tagger: TagFunction = (value) => value,
    simpleValue: SimpleValueFunction = () => undefined
): any {
    const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 0;

    function commitRead(length: number, value: any): any {
        offset += length;
        return value;
    }

    function readArrayBuffer(length: number): Uint8Array {
        return commitRead(length, data.slice(offset, offset + length));
    }

    function readFloat16(): number {
        const tempArrayBuffer = new ArrayBuffer(4);
        const tempDataView = new DataView(tempArrayBuffer);
        const value = readUint16();

        const sign = value & 0x8000;
        let exponent = value & 0x7c00;
        const fraction = value & 0x03ff;

        if (exponent === 0x7c00)
            exponent = 0xff << 10;
        else if (exponent !== 0)
            exponent += (127 - 15) << 10;
        else if (fraction !== 0)
            return (sign ? -1 : 1) * fraction * POW_2_24;

        tempDataView.setUint32(0, sign << 16 | exponent << 13 | fraction << 13);
        return tempDataView.getFloat32(0);
    }

    function readFloat32(): number {
        return commitRead(4, dataView.getFloat32(offset));
    }

    function readFloat64(): number {
        return commitRead(8, dataView.getFloat64(offset));
    }

    function readUint8(): number {
        return commitRead(1, dataView.getUint8(offset));
    }

    function readUint16(): number {
        return commitRead(2, dataView.getUint16(offset));
    }

    function readUint32(): number {
        return commitRead(4, dataView.getUint32(offset));
    }

    function readUint64(): number {
        return readUint32() * POW_2_32 + readUint32();
    }

    function readBreak(): boolean {
        if (dataView.getUint8(offset) !== 0xff)
            return false;
        offset += 1;
        return true;
    }

    function readLength(additionalInformation: number): number {
        if (additionalInformation < 24)
            return additionalInformation;
        if (additionalInformation === 24)
            return readUint8();
        if (additionalInformation === 25)
            return readUint16();
        if (additionalInformation === 26)
            return readUint32();
        if (additionalInformation === 27)
            return readUint64();
        if (additionalInformation === 31)
            return -1;
        throw new Error("Invalid length encoding");
    }

    function readIndefiniteStringLength(majorType: number): number {
        const initialByte = readUint8();
        if (initialByte === 0xff)
            return -1;
        const length = readLength(initialByte & 0x1f);
        if (length < 0 || (initialByte >> 5) !== majorType)
            throw new Error("Invalid indefinite length element");
        return length;
    }

    function appendUtf16Data(utf16data: number[], length: number): void {
        for (let i = 0; i < length; ++i) {
            let value = readUint8();
            if (value & 0x80) {
                if (value < 0xe0) {
                    value = (value & 0x1f) << 6
                        | (readUint8() & 0x3f);
                    length -= 1;
                } else if (value < 0xf0) {
                    value = (value & 0x0f) << 12
                        | (readUint8() & 0x3f) << 6
                        | (readUint8() & 0x3f);
                    length -= 2;
                } else {
                    value = (value & 0x0f) << 18
                        | (readUint8() & 0x3f) << 12
                        | (readUint8() & 0x3f) << 6
                        | (readUint8() & 0x3f);
                    length -= 3;
                }
            }

            if (value < 0x10000) {
                utf16data.push(value);
            } else {
                value -= 0x10000;
                utf16data.push(0xd800 | (value >> 10));
                utf16data.push(0xdc00 | (value & 0x3ff));
            }
        }
    }

    function decodeItem(): any {
        const initialByte = readUint8();
        const majorType = initialByte >> 5;
        const additionalInformation = initialByte & 0x1f;
        let i: number;
        let length: number;

        if (majorType === 7) {
            switch (additionalInformation) {
                case 25:
                    return readFloat16();
                case 26:
                    return readFloat32();
                case 27:
                    return readFloat64();
            }
        }

        length = readLength(additionalInformation);
        if (length < 0 && (majorType < 2 || 6 < majorType))
            throw new Error("Invalid length");

        switch (majorType) {
            case 0:
                return length;
            case 1:
                return -1 - length;
            case 2:
                if (length < 0) {
                    const elements: Uint8Array[] = [];
                    let fullArrayLength = 0;
                    while ((length = readIndefiniteStringLength(majorType)) >= 0) {
                        fullArrayLength += length;
                        elements.push(readArrayBuffer(length));
                    }
                    const fullArray = new Uint8Array(fullArrayLength);
                    let fullArrayOffset = 0;
                    for (i = 0; i < elements.length; ++i) {
                        fullArray.set(elements[i], fullArrayOffset);
                        fullArrayOffset += elements[i].length;
                    }
                    return fullArray;
                }
                return readArrayBuffer(length);
            case 3:
                const utf16data: number[] = [];
                if (length < 0) {
                    while ((length = readIndefiniteStringLength(majorType)) >= 0)
                        appendUtf16Data(utf16data, length);
                } else
                    appendUtf16Data(utf16data, length);
                return String.fromCharCode.apply(null, utf16data);
            case 4:
                let retArray: any[];
                if (length < 0) {
                    retArray = [];
                    while (!readBreak())
                        retArray.push(decodeItem());
                } else {
                    retArray = new Array(length);
                    for (i = 0; i < length; ++i)
                        retArray[i] = decodeItem();
                }
                return retArray;
            case 5:
                const retObject: Record<string, any> = {};
                for (i = 0; i < length || length < 0 && !readBreak(); ++i) {
                    const key = decodeItem();
                    retObject[key] = decodeItem();
                }
                return retObject;
            case 6:
                return tagger(decodeItem(), length);
            case 7:
                switch (length) {
                    case 20:
                        return false;
                    case 21:
                        return true;
                    case 22:
                        return null;
                    case 23:
                        return undefined;
                    default:
                        return simpleValue(length);
                }
        }
    }

    const ret = decodeItem();
    if (offset !== data.byteLength)
        throw new Error("Remaining bytes");
    return ret;
}
