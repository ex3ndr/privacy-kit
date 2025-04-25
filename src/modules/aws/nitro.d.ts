export type NitroEnclaveAttestation = {
    raw: {
        headerProtected: Uint8Array;
        headerUnprotected: any;
        message: Uint8Array;
        signature: Uint8Array;
    };
    document: {
        moduleId: string;
        timestamp: number;
        pcrs: Record<number, string>;
        nonce: Uint8Array | null;
        userData: Uint8Array | null;
        publicKey: Uint8Array | null;
    };
};
export declare function parseNitroEnclaveAttestation(body: string): Promise<NitroEnclaveAttestation>;
