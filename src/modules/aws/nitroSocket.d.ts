import * as https from "https";
export declare function fetchAttestation(host: string, port: number): Promise<import("./nitro").NitroEnclaveAttestation>;
export declare function createNitroHttpAgent(opts: {
    trusted: {
        pcr1: string;
        pcr2: string;
    }[];
}): https.Agent;
