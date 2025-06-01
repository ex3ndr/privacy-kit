import { SNPAttestationDocument } from "./amd/snp";
import { NitroEnclaveAttestationDocument } from "./aws/nitro";

export type Attestation = {
    type: 'amd-snp',
    document: SNPAttestationDocument
} | {
    type: 'aws-nitro',
    document: NitroEnclaveAttestationDocument
};