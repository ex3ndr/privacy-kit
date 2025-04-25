export declare function verifyNitroChain(chain: Uint8Array[]): Promise<Uint8Array<ArrayBuffer>>;
export declare function verifyNitroSignature(opts: {
    publicKey: Uint8Array;
    message: Uint8Array;
    signature: Uint8Array;
}): Promise<void>;
export declare function createSignedBundle(opts: {
    protectedHeader: Uint8Array;
    data: Uint8Array;
}): Uint8Array<ArrayBufferLike>;
