export function encodeBigInt(value: bigint): Uint8Array {
    if (value < 0n) {
        throw new Error("Negative numbers not supported");
    }
    
    if (value === 0n) {
        return new Uint8Array([0]);
    }
    
    // Convert bigint to bytes (big-endian)
    const bytes: number[] = [];
    let temp = value;
    while (temp > 0n) {
        bytes.unshift(Number(temp & 0xffn));
        temp = temp >> 8n;
    }
    
    return new Uint8Array(bytes);
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