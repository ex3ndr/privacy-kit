import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { parseNitroEnclaveAttestation } from './nitro';

describe('nitro', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    });
    afterEach(() => {
        vi.useRealTimers()
    });
    it('should parse nitro enclave attestation', async () => {
        const data1 = await fs.readFile(__dirname + '/__testdata__/nitro_release.txt', 'utf-8');
        vi.setSystemTime(1745546650000);
        expect((await parseNitroEnclaveAttestation(data1)).document).toMatchSnapshot();
        const data2 = await fs.readFile(__dirname + '/__testdata__/nitro_debug.txt', 'utf-8');
        vi.setSystemTime(1745522460500);
        expect((await parseNitroEnclaveAttestation(data2)).document).toMatchSnapshot();
    });
}); 