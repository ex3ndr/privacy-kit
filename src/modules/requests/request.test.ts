import { describe, it, expect, vi } from 'vitest';
import { encodeRequest, decodeRequest, encryptResponse, decryptResponse } from './request';
import * as nacl from "tweetnacl";
import * as z from "zod";

describe('Request Module', () => {
  describe('encodeRequest', () => {
    it('should encode a request with valid data', async () => {
      const testData = { message: 'Hello, World!' };
      const result = await encodeRequest(testData);

      // Check that the result has the expected properties
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('secretKey');

      // Check that data is a Uint8Array
      expect(result.data).toBeInstanceOf(Uint8Array);

      // Check that the first byte is 0 (as per the implementation)
      expect(result.data[0]).toBe(0);

      // Check that nonce and secretKey are Uint8Arrays
      expect(result.nonce).toBeInstanceOf(Uint8Array);
      expect(result.secretKey).toBeInstanceOf(Uint8Array);
    });
  });

  describe('decodeRequest', () => {
    it('should decode a valid encoded request', async () => {
      const originalData = { message: 'Hello, World!' };
      const encoded = await encodeRequest(originalData);
      const schema = z.object({
        message: z.string(),
      });
      const decoded = await decodeRequest(encoded.data, schema);

      // Check that the decoded data matches the original
      expect(decoded?.body).toEqual(originalData);

      // Check that nonce and publicKey are Uint8Arrays
      expect(decoded?.nonce).toBeInstanceOf(Uint8Array);
      expect(decoded?.publicKey).toBeInstanceOf(Uint8Array);
    });

    it('should throw an error for invalid request format', async () => {
      const invalidData = new Uint8Array([1, 2, 3]); // First byte is not 0
      const schema = z.object({
        message: z.string(),
      });
      const result = await decodeRequest(invalidData, schema);
      expect(result).toBeNull();
    });

    it('should return null for expired requests', async () => {
      const originalData = { message: 'Hello, World!' };
      const encoded = await encodeRequest(originalData);
      const schema = z.object({
        message: z.string(),
      });

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      const mockNow = vi.spyOn(Date, 'now');
      
      // Set time to 5 minutes and 1 second in the future
      mockNow.mockImplementation(() => originalNow() + (5 * 60 * 1000) + 1000);

      const decoded = await decodeRequest(encoded.data, schema);
      expect(decoded).toBeNull();

      // Restore original Date.now
      mockNow.mockRestore();
    });
  });

  describe('encryptResponse', () => {
    it('should encrypt a response with valid data', async () => {
      const testData = { status: 'success', message: 'Operation completed' };
      const nonce = new Uint8Array(24); // nacl.box.nonceLength is 24
      const publicKey = new Uint8Array(32); // nacl.box.publicKeyLength is 32

      const result = await encryptResponse(testData, nonce, publicKey);

      // Check that the result is a Uint8Array
      expect(result).toBeInstanceOf(Uint8Array);

      // Check that the first byte is 1 (as per the implementation)
      expect(result[0]).toBe(1);
    });
  });

  describe('decryptResponse', () => {
    it('should decrypt a valid encrypted response', async () => {
      const originalData = { status: 'success', message: 'Operation completed' };
      const schema = z.object({
        status: z.string(),
        message: z.string(),
      });
      const nonce = new Uint8Array(24);

      // Create a keypair for the recipient
      const recipientKeypair = nacl.box.keyPair();

      // Encrypt the data using the recipient's public key
      const encrypted = await encryptResponse(originalData, nonce, recipientKeypair.publicKey);

      // Decrypt the data using the recipient's secret key
      const decrypted = await decryptResponse(encrypted, nonce, recipientKeypair.secretKey, schema);

      // Check that the decrypted data matches the original
      expect(decrypted).toEqual(originalData);
    });

    it('should return null for invalid response format', async () => {
      const invalidData = new Uint8Array([0, 1, 2, 3]); // First byte is not 1
      const nonce = new Uint8Array(24);
      const secretKey = new Uint8Array(32);
      const schema = z.object({
        status: z.string(),
        message: z.string(),
      });

      const result = await decryptResponse(invalidData, nonce, secretKey, schema);
      expect(result).toBeNull();
    });

    it('should return null for expired responses', async () => {
      const originalData = { status: 'success', message: 'Operation completed' };
      const schema = z.object({
        status: z.string(),
        message: z.string(),
      });
      const nonce = new Uint8Array(24);

      // Create a keypair for the recipient
      const recipientKeypair = nacl.box.keyPair();

      // Encrypt the data using the recipient's public key
      const encrypted = await encryptResponse(originalData, nonce, recipientKeypair.publicKey);

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      const mockNow = vi.spyOn(Date, 'now');
      
      // Set time to 5 minutes and 1 second in the future
      mockNow.mockImplementation(() => originalNow() + (5 * 60 * 1000) + 1000);

      const decrypted = await decryptResponse(encrypted, nonce, recipientKeypair.secretKey, schema);
      expect(decrypted).toBeNull();

      // Restore original Date.now
      mockNow.mockRestore();
    });
  });

  describe('End-to-end flow', () => {
    it('should successfully encode, decode, encrypt, and decrypt data', async () => {
      // Original request data
      const requestData = { action: 'getData', id: 123 };
      const requestSchema = z.object({
        action: z.string(),
        id: z.number(),
      });

      // Encode the request
      const encoded = await encodeRequest(requestData);

      // Decode the request
      const decoded = await decodeRequest(encoded.data, requestSchema);
      expect(decoded).not.toBeNull();
      if (!decoded) throw new Error('Decoded request is null');

      // Verify decoded data matches original
      expect(decoded.body).toEqual(requestData);

      // Create a response
      const responseData = { status: 'success', data: { id: 123, value: 'test' } };
      const responseSchema = z.object({
        status: z.string(),
        data: z.object({
          id: z.number(),
          value: z.string(),
        }),
      });

      // Encrypt the response
      const encrypted = await encryptResponse(responseData, decoded.nonce, decoded.publicKey);

      // Decrypt the response
      const decrypted = await decryptResponse(encrypted, decoded.nonce, encoded.secretKey, responseSchema);

      // Verify decrypted response matches original
      expect(decrypted).toEqual(responseData);
    });
  });
}); 