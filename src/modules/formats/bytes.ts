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