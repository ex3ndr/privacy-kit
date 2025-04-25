"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNitroEnclaveAttestation = parseNitroEnclaveAttestation;
const base64_1 = require("../formats/base64");
const cbor_1 = require("./impl/cbor");
const z = __importStar(require("zod"));
const nitro_verify_1 = require("./impl/nitro_verify");
const hex_1 = require("../formats/hex");
//
// Parsing
// Docs: https://aws.amazon.com/blogs/compute/validating-attestation-documents-produced-by-aws-nitro-enclaves/
//
const pkgSchema = z.tuple([
    z.instanceof(Uint8Array),
    z.record(z.any(), z.any()), // Not used
    z.instanceof(Uint8Array),
    z.instanceof(Uint8Array)
]);
const documentSchema = z.object({
    module_id: z.string(),
    digest: z.literal('SHA384'),
    timestamp: z.number(),
    pcrs: z.record(z.string(), z.instanceof(Uint8Array)),
    certificate: z.instanceof(Uint8Array),
    cabundle: z.array(z.instanceof(Uint8Array)),
    public_key: z.instanceof(Uint8Array).nullable(),
    user_data: z.instanceof(Uint8Array).nullable(),
    nonce: z.instanceof(Uint8Array).nullable(),
});
async function parseNitroEnclaveAttestation(body) {
    // Decode the package
    const decoded = (0, cbor_1.decodeCBOR)((0, base64_1.decodeBase64)(body));
    const d = pkgSchema.safeParse(decoded);
    if (!d.success) {
        throw new Error('Invalid attestation');
    }
    const [headerProtected, headerUnprotected, message, signature] = d.data;
    if (headerProtected[0] !== 0xA1 || headerProtected[1] !== 0x01 || headerProtected[2] !== 0x38 || headerProtected[3] !== 0x22) {
        throw new Error('Invalid attestation');
    }
    if (signature.length !== 96) {
        throw new Error('Invalid attestation');
    }
    // console.log(encodeBase64(message));
    // Decode the attestation documemnt
    const document = (0, cbor_1.decodeCBOR)(message);
    const d2 = documentSchema.safeParse(document);
    if (!d2.success) {
        throw new Error('Invalid attestation');
    }
    const attestation = d2.data;
    // Check the chain
    const chain = [...attestation.cabundle, attestation.certificate];
    const publicKey = await (0, nitro_verify_1.verifyNitroChain)(chain);
    // Check the signature
    const signedData = (0, nitro_verify_1.createSignedBundle)({
        protectedHeader: headerProtected,
        data: message
    });
    await (0, nitro_verify_1.verifyNitroSignature)({
        publicKey,
        message: signedData,
        signature
    });
    // Return the attestation
    const pcrs = {};
    for (const [key, value] of Object.entries(attestation.pcrs)) {
        pcrs[parseInt(key)] = (0, hex_1.encodeHex)(value, 'mac');
    }
    return {
        raw: {
            headerProtected,
            headerUnprotected,
            message,
            signature
        },
        document: {
            moduleId: attestation.module_id,
            timestamp: attestation.timestamp,
            pcrs,
            nonce: attestation.nonce,
            userData: attestation.user_data,
            publicKey: attestation.public_key
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibml0cm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJuaXRyby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQStDQSxvRUFnRUM7QUEvR0QsOENBQStEO0FBQy9ELHNDQUFxRDtBQUNyRCx1Q0FBeUI7QUFDekIsc0RBQWlHO0FBQ2pHLHdDQUEyQztBQW1CM0MsRUFBRTtBQUNGLFVBQVU7QUFDViw4R0FBOEc7QUFDOUcsRUFBRTtBQUVGLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDdEIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsV0FBVztJQUN2QyxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztJQUN4QixDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztDQUMzQixDQUFDLENBQUM7QUFFSCxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQzVCLFNBQVMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFO0lBQ3JCLE1BQU0sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztJQUMzQixTQUFTLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRTtJQUNyQixJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNwRCxXQUFXLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDckMsUUFBUSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFVB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QVMsRUFBRSxXQUFXLENBQUMsU0FBUztZQUNoQyxJQUFJO1lBQ0osS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLO1lBQ3hCLFFBQVEsRUFBRSxXQUFXLENBQUMsU0FBUztZQUMvQixTQUFTLEVBQUUsV0FBVyxDQUFDLFVBQVU7U0FDcEM7S0FDSixDQUFBO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRlY29kZUJhc2U2NCwgZW5jb2RlQmFzZTY0IH0gZnJvbSBcIi4uL2Zvcm1hdHMvYmFzZTY0XCI7XG5pbXBvcnQgeyBkZWNvZGVDQk9SLCBlbmNvZGVDQk9SIH0gZnJvbSBcIi4vaW1wbC9jYm9yXCI7XG5pbXBvcnQgKiBhcyB6IGZyb20gJ3pvZCc7XG5pbXBvcnQgeyBjcmVhdGVTaWduZWRCdW5kbGUsIHZlcmlmeU5pdHJvQ2hhaW4sIHZlcmlmeU5pdHJvU2lnbmF0dXJlIH0gZnJvbSBcIi4vaW1wbC9uaXRyb192ZXJpZnlcIjtcbmltcG9ydCB7IGVuY29kZUhleCB9IGZyb20gXCIuLi9mb3JtYXRzL2hleFwiO1xuXG5leHBvcnQgdHlwZSBOaXRyb0VuY2xhdmVBdHRlc3RhdGlvbiA9IHtcbiAgICByYXc6IHtcbiAgICAgICAgaGVhZGVyUHJvdGVjdGVkOiBVaW50OEFycmF5O1xuICAgICAgICBoZWFkZXJVbnByb3RlY3RlZDogYW55O1xuICAgICAgICBtZXNzYWdlOiBVaW50OEFycmF5O1xuICAgICAgICBzaWduYXR1cmU6IFVpbnQ4QXJyYXk7XG4gICAgfSxcbiAgICBkb2N1bWVudDoge1xuICAgICAgICBtb2R1bGVJZDogc3RyaW5nXG4gICAgICAgIHRpbWVzdGFtcDogbnVtYmVyLFxuICAgICAgICBwY3JzOiBSZWNvcmQ8bnVtYmVyLCBzdHJpbmc+LFxuICAgICAgICBub25jZTogVWludDhBcnJheSB8IG51bGwsXG4gICAgICAgIHVzZXJEYXRhOiBVaW50OEFycmF5IHwgbnVsbCxcbiAgICAgICAgcHVibGljS2V5OiBVaW50OEFycmF5IHwgbnVsbCxcbiAgICB9XG59XG5cbi8vXG4vLyBQYXJzaW5nXG4vLyBEb2NzOiBodHRwczovL2F3cy5hbWF6b24uY29tL2Jsb2dzL2NvbXB1dGUvdmFsaWRhdGluZy1hdHRlc3RhdGlvbi1kb2N1bWVudHMtcHJvZHVjZWQtYnktYXdzLW5pdHJvLWVuY2xhdmVzL1xuLy9cblxuY29uc3QgcGtnU2NoZW1hID0gei50dXBsZShbXG4gICAgei5pbnN0YW5jZW9mKFVpbnQ4QXJyYXkpLFxuICAgIHoucmVjb3JkKHouYW55KCksIHouYW55KCkpLCAvLyBOb3QgdXNlZFxuICAgIHouaW5zdGFuY2VvZihVaW50OEFycmF5KSxcbiAgICB6Lmluc3RhbmNlb2YoVWludDhBcnJheSlcbl0pO1xuXG5jb25zdCBkb2N1bWVudFNjaGVtYSA9IHoub2JqZWN0KHtcbiAgICBtb2R1bGVfaWQ6IHouc3RyaW5nKCksXG4gICAgZGlnZXN0OiB6LmxpdGVyYWwoJ1NIQTM4NCcpLFxuICAgIHRpbWVzdGFtcDogei5udW1iZXIoKSxcbiAgICBwY3JzOiB6LnJlY29yZCh6LnN0cmluZygpLCB6Lmluc3RhbmNlb2YoVWludDhBcnJheSkpLFxuICAgIGNlcnRpZmljYXRlOiB6Lmluc3RhbmNlb2YoVWludDhBcnJheSksXG4gICAgY2FidW5kbGU6IHouYXJyYXkoei5pbnN0YW5jZW9mKFVpbnQ4QXJyYXkpKSxcbiAgICBwdWJsaWNfa2V5OiB6Lmluc3RhbmNlb2YoVWludDhBcnJheSkubnVsbGFibGUoKSxcbiAgICB1c2VyX2RhdGE6IHouaW5zdGFuY2VvZihVaW50OEFycmF5KS5udWxsYWJsZSgpLFxuICAgIG5vbmNlOiB6Lmluc3RhbmNlb2YoVWludDhBcnJheSkubnVsbGFibGUoKSxcbn0pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VOaXRyb0VuY2xhdmVBdHRlc3RhdGlvbihib2R5OiBzdHJpbmcpOiBQcm9taXNlPE5pdHJvRW5jbGF2ZUF0dGVzdGF0aW9uPiB7XG5cbiAgICAvLyBEZWNvZGUgdGhlIHBhY2thZ2VcbiAgICBjb25zdCBkZWNvZGVkID0gZGVjb2RlQ0JPUihkZWNvZGVCYXNlNjQoYm9keSkpO1xuICAgIGNvbnN0IGQgPSBwa2dTY2hlbWEuc2FmZVBhcnNlKGRlY29kZWQpO1xuICAgIGlmICghZC5zdWNjZXNzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBhdHRlc3RhdGlvbicpO1xuICAgIH1cbiAgICBjb25zdCBbaGVhZGVyUHJvdGVjdGVkLCBoZWFkZXJVbnByb3RlY3RlZCwgbWVzc2FnZSwgc2lnbmF0dXJlXSA9IGQuZGF0YTtcbiAgICBpZiAoaGVhZGVyUHJvdGVjdGVkWzBdICE9PSAweEExIHx8IGhlYWRlclByb3RlY3RlZFsxXSAhPT0gMHgwMSB8fCBoZWFkZXJQcm90ZWN0ZWRbMl0gIT09IDB4MzggfHwgaGVhZGVyUHJvdGVjdGVkWzNdICE9PSAweDIyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBhdHRlc3RhdGlvbicpO1xuICAgIH1cbiAgICBpZiAoc2lnbmF0dXJlLmxlbmd0aCAhPT0gOTYpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGF0dGVzdGF0aW9uJyk7XG4gICAgfVxuXG4gICAgLy8gY29uc29sZS5sb2coZW5jb2RlQmFzZTY0KG1lc3NhZ2UpKTtcblxuICAgIC8vIERlY29kZSB0aGUgYXR0ZXN0YXRpb24gZG9jdW1lbW50XG4gICAgY29uc3QgZG9jdW1lbnQgPSBkZWNvZGVDQk9SKG1lc3NhZ2UpO1xuICAgIGNvbnN0IGQyID0gZG9jdW1lbnRTY2hlbWEuc2FmZVBhcnNlKGRvY3VtZW50KTtcbiAgICBpZiAoIWQyLnN1Y2Nlc3MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGF0dGVzdGF0aW9uJyk7XG4gICAgfVxuICAgIGNvbnN0IGF0dGVzdGF0aW9uID0gZDIuZGF0YTtcbiAgICBcbiAgICAvLyBDaGVjayB0aGUgY2hhaW5cbiAgICBjb25zdCBjaGFpbiA9IFsuLi5hdHRlc3RhdGlvbi5jYWJ1bmRsZSwgYXR0ZXN0YXRpb24uY2VydGlmaWNhdGVdO1xuICAgIGNvbnN0IHB1YmxpY0tleSA9IGF3YWl0IHZlcmlmeU5pdHJvQ2hhaW4oY2hhaW4pO1xuXG4gICAgLy8gQ2hlY2sgdGhlIHNpZ25hdHVyZVxuICAgIGNvbnN0IHNpZ25lZERhdGEgPSBjcmVhdGVTaWduZWRCdW5kbGUoe1xuICAgICAgICBwcm90ZWN0ZWRIZWFkZXI6IGhlYWRlclByb3RlY3RlZCxcbiAgICAgICAgZGF0YTogbWVzc2FnZVxuICAgIH0pXG4gICAgYXdhaXQgdmVyaWZ5Tml0cm9TaWduYXR1cmUoe1xuICAgICAgICBwdWJsaWNLZXksXG4gICAgICAgIG1lc3NhZ2U6IHNpZ25lZERhdGEsXG4gICAgICAgIHNpZ25hdHVyZVxuICAgIH0pO1xuXG4gICAgLy8gUmV0dXJuIHRoZSBhdHRlc3RhdGlvblxuXG4gICAgY29uc3QgcGNyczogUmVjb3JkPG51bWJlciwgc3RyaW5nPiA9IHt9O1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGF0dGVzdGF0aW9uLnBjcnMpKSB7XG4gICAgICAgIHBjcnNbcGFyc2VJbnQoa2V5KV0gPSBlbmNvZGVIZXgodmFsdWUsICdtYWMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByYXc6IHtcbiAgICAgICAgICAgIGhlYWRlclByb3RlY3RlZCxcbiAgICAgICAgICAgIGhlYWRlclVucHJvdGVjdGVkLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIHNpZ25hdHVyZVxuICAgICAgICB9LFxuICAgICAgICBkb2N1bWVudDoge1xuICAgICAgICAgICAgbW9kdWxlSWQ6IGF0dGVzdGF0aW9uLm1vZHVsZV9pZCxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogYXR0ZXN0YXRpb24udGltZXN0YW1wLFxuICAgICAgICAgICAgcGNycyxcbiAgICAgICAgICAgIG5vbmNlOiBhdHRlc3RhdGlvbi5ub25jZSxcbiAgICAgICAgICAgIHVzZXJEYXRhOiBhdHRlc3RhdGlvbi51c2VyX2RhdGEsXG4gICAgICAgICAgICBwdWJsaWNLZXk6IGF0dGVzdGF0aW9uLnB1YmxpY19rZXlcbiAgICAgICAgfVxuICAgIH1cbn0iXX0=