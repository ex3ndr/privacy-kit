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
    return a.every((value, index) => value === b[index]);
}
