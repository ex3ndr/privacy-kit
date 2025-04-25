import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSignedBundle, verifyNitroChain } from './nitro_verify';
import { decodeBase64 } from '../../formats/base64';
import { decodeCBOR, encodeCBOR } from './cbor';

describe('nitro_verify', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(1745540050000);
    });
    afterEach(() => {
        vi.useRealTimers()
    });
    it('should verify the nitro signature', async () => {

        const chain = [
            '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'
        ].map((v) => decodeBase64(v));

        await verifyNitroChain(chain);
    });

    it('should crash on invalid root', async () => {

        const chain = [
            // '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'
        ].map((v) => decodeBase64(v));

        await expect(verifyNitroChain(chain)).rejects.toThrow();
    });
    it('should crash on invalid chain', async () => {

        const chain = [
            'MIICETCCAZagAwIBAgIRAPkxdWgbkK/hHUbMtOTn+FYwCgYIKoZIzj0EAwMwSTELMAkGA1UEBhMCVVMxDzANBgNVBAoMBkFtYXpvbjEMMAoGA1UECwwDQVdTMRswGQYDVQQDDBJhd3Mubml0cm8tZW5jbGF2ZXMwHhcNMTkxMDI4MTMyODA1WhcNNDkxMDI4MTQyODA1WjBJMQswCQYDVQQGEwJVUzEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANBV1MxGzAZBgNVBAMMEmF3cy5uaXRyby1lbmNsYXZlczB2MBAGByqGSM49AgEGBSuBBAAiA2IABPwCVOumCMHzaHDimtqQvkY4MpJzbolL//Zy2YlES1BR5TSksfbb48C8WBoyt7F2Bw7eEtaaP+ohG2bnUs990d0JX28TcPQXCEPZ3BABIeTPYwEoCWZEh8l5YoQwTcU/9KNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUkCW1DdkFR+eWw5b6cp3PmanfS5YwDgYDVR0PAQH/BAQDAgGGMAoGCCqGSM49BAMDA2kAMGYCMQCjfy+Rocm9Xue4YnwWmNJVA44fA0P5W2OpYow9OYCVRaEevL8uO1XYru5xtMPWrfMCMQCi85sWBbJwKKXdS6BptQFuZbT73o/gBh1qUxl/nNr12UO8Yfwr6wPLb+6NIwLz3/Y=',
            'MIICvzCCAkWgAwIBAgIRALaFjYtiFjdI+UJzjKmJgE4wCgYIKoZIzj0EAwMwSTELMAkGA1UEBhMCVVMxDzANBgNVBAoMBkFtYXpvbjEMMAoGA1UECwwDQVdTMRswGQYDVQQDDBJhd3Mubml0cm8tZW5jbGF2ZXMwHhcNMjUwNDIxMTUzMjU1WhcNMjUwNTExMTYzMjU1WjBkMQswCQYDVQQGEwJVUzEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANBV1MxNjA0BgNVBAMMLTRlZDhhMmU2YmQzMzBlMzYudXMtZWFzdC0xLmF3cy5uaXRyby1lbmNsYXZlczB2MBAGByqGSM49AgEGBSuBBAAiA2IABPseCeA1FNx8+ScOChtgidzeVRLNeQLUF1iR48+zRV5VtnJOYQBGl1K0TcElpgxub7eVK/2pWMq0qWYmU4PNMXfPu8oD9SXIjsrP1/UmXRQlj0eYs0+iipqESE19kAlL7aOB1TCB0jASBgNVHRMBAf8ECDAGAQH/AgECMB8GA1UdIwQYMBaAFJAltQ3ZBUfnlsOW+nKdz5mp30uWMB0GA1UdDgQWBBRNo+lYOwYA+8ia1WTsamdrjDdneTAOBgNVHQ8BAf8EBAMCAYYwbAYDVR0fBGUwYzBhoF+gXYZbaHR0cDovL2F3cy1uaXRyby1lbmNsYXZlcy1jcmwuczMuYW1hem9uYXdzLmNvbS9jcmwvYWI0OTYwY2MtN2Q2My00MmJkLTllOWYtNTkzMzhjYjY3Zjg0LmNybDAKBggqhkjOPQQDAwNoADBlAjEAjKbvI7HXd4jsuUoB8dlPYUepUI1he0uOaVXq5m3fwUvSfSa7W5oM+PhSmjavNbd+AjB6TqJcS3EAOIk8TzhD5bXqfYG5CTo7IWC26/7I5KocqMbkKM9LMnv0dDgUmjGDOrU=',
            // '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'
        ].map((v) => decodeBase64(v));

        await expect(verifyNitroChain(chain)).rejects.toThrow();
    });
    it('should create a correctly formatted COSE_Sign1 structure', () => {
        // Create sample inputs
        const protectedHeader = new TextEncoder().encode('test-header');
        const data = new TextEncoder().encode('test-data');

        // Call the function
        const result = createSignedBundle({
            protectedHeader,
            data
        });

        // Decode the CBOR to verify the structure
        const decoded = decodeCBOR(result);

        // Verify the structure follows COSE_Sign1 format
        expect(decoded).toBeInstanceOf(Array);
        expect(decoded).toHaveLength(4);
        expect(decoded[0]).toBe('Signature1');
        expect(new Uint8Array(decoded[1])).toEqual(protectedHeader);
        expect(new Uint8Array(decoded[2])).toEqual(new Uint8Array(0));
        expect(new Uint8Array(decoded[3])).toEqual(data);

        // Verify the encoding directly
        const expectedEncoding = encodeCBOR([
            'Signature1',
            protectedHeader,
            new Uint8Array(0),
            data
        ]);
        expect(result).toEqual(expectedEncoding);
    });

    it('should handle empty data correctly', () => {
        const protectedHeader = new TextEncoder().encode('test-header');
        const data = new Uint8Array(0);

        const result = createSignedBundle({
            protectedHeader,
            data
        });

        const decoded = decodeCBOR(result);
        expect(decoded[0]).toBe('Signature1');
        expect(new Uint8Array(decoded[1])).toEqual(protectedHeader);
        expect(new Uint8Array(decoded[2])).toEqual(new Uint8Array(0));
        expect(new Uint8Array(decoded[3])).toEqual(data);
    });

    it('should match COSE Sign1 structure format as defined in RFC 8152', () => {
        // According to RFC 8152, the COSE_Sign1 structure is:
        // COSE_Sign1 = [
        //   protected : bstr,
        //   unprotected : map,
        //   payload : bstr / nil,
        //   signature : bstr
        // ]

        // For the Sig_structure, it's:
        // Sig_structure = [
        //   context : "Signature1",
        //   body_protected : bstr,
        //   sign_protected : bstr,
        //   external_aad : bstr,
        //   payload : bstr
        // ]

        // Our function creates the Sig_structure with empty sign_protected (represented as Uint8Array(0))

        const protectedHeader = new TextEncoder().encode('test-protected');
        const data = new TextEncoder().encode('test-payload');

        const result = createSignedBundle({
            protectedHeader,
            data
        });

        const decoded = decodeCBOR(result);

        expect(decoded[0]).toBe('Signature1'); // context
        expect(new Uint8Array(decoded[1])).toEqual(protectedHeader); // body_protected
        expect(new Uint8Array(decoded[2])).toEqual(new Uint8Array(0)); // sign_protected/external_aad
        expect(new Uint8Array(decoded[3])).toEqual(data); // payload
    });

    it('should match golden byte array for known inputs', () => {
        // Create deterministic inputs
        const protectedHeader = new Uint8Array([0xA1, 0x01, 0x26]); // Protected header: {1: -7} (ECDSA with SHA-384)
        const data = new TextEncoder().encode('test-payload');

        // Generate the signed bundle
        const result = createSignedBundle({
            protectedHeader,
            data
        });

        // Golden byte array representation of the expected CBOR encoding
        // This is the CBOR encoding of:
        // [
        //   "Signature1",
        //   h'A10126' (Protected header),
        //   h'' (Empty external AAD),
        //   h'746573742D7061796C6F6164' ("test-payload")
        // ]
        const goldenBytes = new Uint8Array([
            0x84, // Array of 4 items
            0x6A, // Text string of length 10
            0x53, 0x69, 0x67, 0x6E, 0x61, 0x74, 0x75, 0x72, 0x65, 0x31, // "Signature1"
            0x43, // Byte string of length 3
            0xA1, 0x01, 0x26, // Protected header {1: -7}
            0x40, // Empty byte string
            0x4C, // Byte string of length 12
            0x74, 0x65, 0x73, 0x74, 0x2D, 0x70, 0x61, 0x79, 0x6C, 0x6F, 0x61, 0x64 // "test-payload"
        ]);

        // Compare against the golden byte array
        expect(result).toEqual(goldenBytes);

        // Just to be sure, decode both and compare the structures
        const resultDecoded = decodeCBOR(result);
        const goldenDecoded = decodeCBOR(goldenBytes);
        expect(resultDecoded).toEqual(goldenDecoded);
    });
});