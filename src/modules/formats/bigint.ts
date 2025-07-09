export function encodeBigInt(value: bigint | number): Uint8Array {
    if (value < 0n) {
        throw new Error("Negative numbers not supported");
    }

    if (value === 0n || value === 0) {
        return new Uint8Array([0]);
    }

    // Two code paths for bigint and number for speed
    if (typeof value === 'number') {
        const bytes: number[] = [];
        let temp = value;
        while (temp > 0) {
            bytes.unshift(temp & 0xff);
            temp = temp >> 8;
        }
        return new Uint8Array(bytes);
    } else {
        const bytes: number[] = [];
        let temp = value;
        while (temp > 0n) {
            bytes.unshift(Number(temp & 0xffn));
            temp = temp >> 8n;
        }
        return new Uint8Array(bytes);
    }
}

export function decodeBigInt(value: Uint8Array): bigint {
    if (value.length === 0) {
        return 0n;
    }

    // Convert bytes to bigint (big-endian)
    let result = 0n;
    for (let i = 0; i < value.length; i++) {
        result = result * 256n + BigInt(value[i]);
    }

    return result;
}

export function encodeBigInt32(value: bigint | number): Uint8Array {
    if (value < 0n) {
        throw new Error("Negative numbers not supported");
    }

    // Start with the minimal encoding
    const minimalBytes = encodeBigInt(value);

    // Create a 32-byte array with zero padding
    const result = new Uint8Array(32);

    // Copy the minimal bytes to the end (right-aligned, big-endian)
    const offset = 32 - minimalBytes.length;
    result.set(minimalBytes, offset);

    return result;
}

export function decodeBigInt32(value: Uint8Array): bigint {
    if (value.length !== 32) {
        throw new Error("importBigInt expects exactly 32 bytes");
    }

    // Convert the 32-byte array to bigint (big-endian)
    return decodeBigInt(value);
}