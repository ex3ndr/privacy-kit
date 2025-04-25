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
exports.verifyNitroChain = verifyNitroChain;
exports.verifyNitroSignature = verifyNitroSignature;
exports.createSignedBundle = createSignedBundle;
const x509 = __importStar(require("@peculiar/x509"));
const nitro_ca_1 = require("./nitro_ca");
const base64_1 = require("../../formats/base64");
const hex_1 = require("../../formats/hex");
const p384_1 = require("@noble/curves/p384");
const sha2_1 = require("@noble/hashes/sha2");
const cbor_1 = require("./cbor");
async function verifyNitroChain(chain) {
    //
    // NOTE: We dont care about the timing attacks here, since we are verifying the public certificate
    //
    const certs = chain.map((b) => new x509.X509Certificate(b));
    // Check that first cert is the same as the root cert
    let root = new x509.X509Certificate((0, base64_1.decodeBase64)(nitro_ca_1.nitroCa));
    let first = certs[0];
    // Check that the thumbprints are the same
    const rootThumbprint = new Uint8Array(await root.getThumbprint({ name: 'SHA-256' }));
    const firstThumbprint = new Uint8Array(await first.getThumbprint({ name: 'SHA-256' }));
    const golden = (0, hex_1.decodeHex)('641A0321A3E244EFE456463195D606317ED7CDCC3C1756E09893F3C68F79BB5B');
    if (rootThumbprint.length !== golden.length || firstThumbprint.length !== golden.length) {
        throw new Error("Invalid chain (invalid thumbprint)");
    }
    for (let i = 0; i < rootThumbprint.length; i++) {
        if (rootThumbprint[i] !== golden[i]) {
            throw new Error("Invalid chain (invalid thumbprint)");
        }
        if (firstThumbprint[i] !== golden[i]) {
            throw new Error("Invalid chain (invalid thumbprint)");
        }
    }
    // Just in case check more things
    if (!root.publicKey.equal(first.publicKey)) {
        throw new Error("Invalid chain (invalid public key)");
    }
    if (root.notAfter.getTime() !== first.notAfter.getTime()) {
        throw new Error("Cert chain not valid");
    }
    if (root.notBefore.getTime() !== first.notBefore.getTime()) {
        throw new Error("Cert chain not valid");
    }
    if (root.notAfter.getTime() < new Date().getTime()) {
        throw new Error("Root cert expired");
    }
    if (root.notBefore.getTime() > new Date().getTime()) {
        throw new Error("Root cert not yet valid");
    }
    // Check if all certs have valid algorithms
    for (let i = 0; i < certs.length; i++) {
        if (certs[i].signatureAlgorithm.name !== 'ECDSA' || certs[i].signatureAlgorithm.hash.name !== 'SHA-384') {
            throw new Error("Invalid chain (invalid algorithm)");
        }
        if (certs[i].notAfter.getTime() < new Date().getTime()) {
            console.log(certs[i].notBefore.getTime() + ' - ' + certs[i].notAfter.getTime());
            throw new Error("Cert expired");
        }
        if (certs[i].notBefore.getTime() > new Date().getTime()) {
            console.log(certs[i].notBefore.getTime() + ' - ' + certs[i].notAfter.getTime());
            throw new Error("Cert not yet valid");
        }
    }
    // Check that the chain is valid
    for (let i = 1; i < certs.length; i++) {
        const current = certs[i];
        const previous = certs[i - 1];
        if (!await current.verify(previous)) {
            throw new Error("Invalid chain (invalid signature) " + i);
        }
    }
    // Return the public key
    const publicKey = new Uint8Array(certs[certs.length - 1].publicKey.rawData);
    return publicKey;
}
async function verifyNitroSignature(opts) {
    const data = (0, sha2_1.sha384)(opts.message);
    const sig = p384_1.p384.Signature.fromCompact(opts.signature);
    const result = p384_1.p384.verify(sig, data, opts.publicKey.slice(23));
    if (!result) {
        throw new Error("Invalid signature");
    }
}
function createSignedBundle(opts) {
    const signedData = (0, cbor_1.encodeCBOR)([
        "Signature1",
        opts.protectedHeader,
        new Uint8Array(0),
        opts.data
    ]);
    return signedData;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibml0cm9fdmVyaWZ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibml0cm9fdmVyaWZ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBUUEsNENBd0VDO0FBRUQsb0RBV0M7QUFFRCxnREFXQztBQTFHRCxxREFBdUM7QUFDdkMseUNBQXFDO0FBQ3JDLGlEQUFvRDtBQUNwRCwyQ0FBOEM7QUFDOUMsNkNBQTBDO0FBQzFDLDZDQUE0QztBQUM1QyxpQ0FBb0M7QUFFN0IsS0FBSyxVQUFVLGdCQUFnQixDQUFDLEtBQW1CO0lBRXRELEVBQUU7SUFDRixrR0FBa0c7SUFDbEcsRUFBRTtJQUVGLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTVELHFEQUFxRDtJQUNyRCxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBQSxxQkFBWSxFQUFDLGtCQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzNELElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVyQiwwQ0FBMEM7SUFDMUMsTUFBTSxjQUFjLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRixNQUFNLGVBQWUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZGLE1BQU0sTUFBTSxHQUFHLElBQUEsZUFBUyxFQUFDLGtFQUFrRSxDQUFDLENBQUM7SUFDN0YsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxNQUFN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RyxXQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDVixNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDekMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxJQUdsQztJQUNHLE1BQU0sVUFBVSxHQUFHLElBQUEsaUJBQVUsRUFBQztRQUMxQixZQUFZO1FBQ1osSUFBSSxDQUFDLGVBQWU7UUFDcEIsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJQUFJO0tBQ1osQ0FBQyxDQUFDO0lBQ0gsT0FBTyxVQUFVLENBQUM7QUFDdEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHg1MDkgZnJvbSBcIkBwZWN1bGlhci94NTA5XCI7XG5pbXBvcnQgeyBuaXRyb0NhIH0gZnJvbSBcIi4vbml0cm9fY2FcIjtcbmltcG9ydCB7IGRlY29kZUJhc2U2NCB9IGZyb20gXCIuLi8uLi9mb3JtYXRzL2Jhc2U2NFwiO1xuaW1wb3J0IHsgZGVjb2RlSGV4IH0gZnJvbSBcIi4uLy4uL2Zvcm1hdHMvaGV4XCI7XG5pbXBvcnQgeyBwMzg0IH0gZnJvbSAnQG5vYmxlL2N1cnZlcy9wMzg0JztcbmltcG9ydCB7IHNoYTM4NCB9IGZyb20gXCJAbm9ibGUvaGFzaGVzL3NoYTJcIjtcbmltcG9ydCB7IGVuY29kZUNCT1IgfSBmcm9tIFwiLi9jYm9yXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2ZXJpZnlOaXRyb0NoYWluKGNoYWluOiBVaW50OEFycmF5W10pIHtcblxuICAgIC8vXG4gICAgLy8gTk9URTogV2UgZG9udCBjYXJlIGFib3V0IHRoZSB0aW1pbmcgYXR0YWNrcyBoZXJlLCBzaW5jZSB3ZSBhcmUgdmVyaWZ5aW5nIHRoZSBwdWJsaWMgY2VydGlmaWNhdGVcbiAgICAvL1xuXG4gICAgY29uc3QgY2VydHMgPSBjaGFpbi5tYXAoKGIpID0+IG5ldyB4NTA5Llg1MDlDZXJ0aWZpY2F0ZShiKSk7XG5cbiAgICAvLyBDaGVjayB0aGF0IGZpcnN0IGNlcnQgaXMgdGhlIHNhbWUgYXMgdGhlIHJvb3QgY2VydFxuICAgIGxldCByb290ID0gbmV3IHg1MDkuWDUwOUNlcnRpZmljYXRlKGRlY29kZUJhc2U2NChuaXRyb0NhKSk7XG4gICAgbGV0IGZpcnN0ID0gY2VydHNbMF07XG5cbiAgICAvLyBDaGVjayB0aGF0IHRoZSB0aHVtYnByaW50cyBhcmUgdGhlIHNhbWVcbiAgICBjb25zdCByb290VGh1bWJwcmludCA9IG5ldyBVaW50OEFycmF5KGF3YWl0IHJvb3QuZ2V0VGh1bWJwcmludCh7IG5hbWU6ICdTSEEtMjU2JyB9KSk7XG4gICAgY29uc3QgZmlyc3RUaHVtYnByaW50ID0gbmV3IFVpbnQ4QXJyYXkoYXdhaXQgZmlyc3QuZ2V0VGh1bWJwcmludCh7IG5hbWU6ICdTSEEtMjU2JyB9KSk7XG4gICAgY29uc3QgZ29sZGVuID0gZGVjb2RlSGV4KCc2NDFBMDMyMUEzRTI0NEVGRTQ1NjQ2MzE5NUQ2MDYzMTdFRDdDRENDM0MxNzU2RTA5ODkzRjNDNjhGNzlCQjVCJyk7XG4gICAgaWYgKHJvb3RUaHVtYnByaW50Lmxlbmd0aCAhPT0gZ29sZGVuLmxlbmd0aCB8fCBmaXJzdFRodW1icHJpbnQubGVuZ3RoICE9PSBnb2xkZW4ubGVuZ3RoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgY2hhaW4gKGludmFsaWQgdGh1bWJwcmludClcIik7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm9vdFRodW1icHJpbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHJvb3RUaHVtYnByaW50W2ldICE9PSBnb2xkZW5baV0pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgY2hhaW4gKGludmFsaWQgdGh1bWJwcmludClcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpcnN0VGh1bWJwcmludFtpXSAhPT0gZ29sZGVuW2ldKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGNoYWluIChpbnZhbGlkIHRodW1icHJpbnQpXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gSnVzdCBpbiBjYXNlIGNoZWNrIG1vcmUgdGhpbmdzXG4gICAgaWYgKCFyb290LnB1YmxpY0tleS5lcXVhbChmaXJzdC5wdWJsaWNLZXkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgY2hhaW4gKGludmFsaWQgcHVibGljIGtleSlcIik7XG4gICAgfVxuICAgIGlmIChyb290Lm5vdEFmdGVyLmdldFRpbWUoKSAhPT0gZmlyc3Qubm90QWZ0ZXIuZ2V0VGltZSgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNlcnQgY2hhaW4gbm90IHZhbGlkXCIpO1xuICAgIH1cbiAgICBpZiAocm9vdC5ub3RCZWZvcmUuZ2V0VGltZSgpICE9PSBmaXJzdC5ub3RCZWZvcmUuZ2V0VGltZSgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNlcnQgY2hhaW4gbm90IHZhbGlkXCIpO1xuICAgIH1cbiAgICBpZiAocm9vdC5ub3RBZnRlci5nZXRUaW1lKCkgPCBuZXcgRGF0ZSgpLmdldFRpbWUoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJSb290IGNlcnQgZXhwaXJlZFwiKTtcbiAgICB9XG4gICAgaWYgKHJvb3Qubm90QmVmb3JlLmdldFRpbWUoKSA+IG5ldyBEYXRlKCkuZ2V0VGltZSgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlJvb3QgY2VydCBub3QgeWV0IHZhbGlkXCIpO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGFsbCBjZXJ0cyBoYXZlIHZhbGlkIGFsZ29yaXRobXNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNlcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChjZXJ0c1tpXS5zaWduYXR1cmVBbGdvcml0aG0ubmFtZSAhPT0gJ0VDRFNBJyB8fCBjZXJ0c1tpXS5zaWduYXR1cmVBbGdvcml0aG0uaGFzaC5uYW1lICE9PSAnU0hBLTM4NCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgY2hhaW4gKGludmFsaWQgYWxnb3JpdGhtKVwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2VydHNbaV0ubm90QWZ0ZXIuZ2V0VGltZSgpIDwgbmV3IERhdGUoKS5nZXRUaW1lKCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNlcnRzW2ldLm5vdEJlZm9yZS5nZXRUaW1lKCkgKyAnIC0gJyArIGNlcnRzW2ldLm5vdEFmdGVyLmdldFRpbWUoKSk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDZXJ0IGV4cGlyZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNlcnRzW2ldLm5vdEJlZm9yZS5nZXRUaW1lKCkgPiBuZXcgRGF0ZSgpLmdldFRpbWUoKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coY2VydHNbaV0ubm90QmVmb3JlLmdldFRpbWUoKSArICcgLSAnICsgY2VydHNbaV0ubm90QWZ0ZXIuZ2V0VGltZSgpKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNlcnQgbm90IHlldCB2YWxpZFwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIHRoYXQgdGhlIGNoYWluIGlzIHZhbGlkXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBjZXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBjdXJyZW50ID0gY2VydHNbaV07XG4gICAgICAgIGNvbnN0IHByZXZpb3VzID0gY2VydHNbaSAtIDFdO1xuICAgICAgICBpZiAoIWF3YWl0IGN1cnJlbnQudmVyaWZ5KHByZXZpb3VzKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBjaGFpbiAoaW52YWxpZCBzaWduYXR1cmUpIFwiICsgaSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIHB1YmxpYyBrZXlcbiAgICBjb25zdCBwdWJsaWNLZXkgPSBuZXcgVWludDhBcnJheShjZXJ0c1tjZXJ0cy5sZW5ndGggLSAxXS5wdWJsaWNLZXkucmF3RGF0YSk7XG4gICAgcmV0dXJuIHB1YmxpY0tleTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZlcmlmeU5pdHJvU2lnbmF0dXJlKG9wdHM6IHtcbiAgICBwdWJsaWNLZXk6IFVpbnQ4QXJyYXksXG4gICAgbWVzc2FnZTogVWludDhBcnJheSxcbiAgICBzaWduYXR1cmU6IFVpbnQ4QXJyYXlcbn0pIHtcbiAgICBjb25zdCBkYXRhID0gc2hhMzg0KG9wdHMubWVzc2FnZSk7XG4gICAgY29uc3Qgc2lnID0gcDM4NC5TaWduYXR1cmUuZnJvbUNvbXBhY3Qob3B0cy5zaWduYXR1cmUpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHAzODQudmVyaWZ5KHNpZywgZGF0YSwgb3B0cy5wdWJsaWNLZXkuc2xpY2UoMjMpKTtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNpZ25hdHVyZVwiKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTaWduZWRCdW5kbGUob3B0czoge1xuICAgIHByb3RlY3RlZEhlYWRlcjogVWludDhBcnJheSxcbiAgICBkYXRhOiBVaW50OEFycmF5XG59KSB7XG4gICAgY29uc3Qgc2lnbmVkRGF0YSA9IGVuY29kZUNCT1IoW1xuICAgICAgICBcIlNpZ25hdHVyZTFcIixcbiAgICAgICAgb3B0cy5wcm90ZWN0ZWRIZWFkZXIsXG4gICAgICAgIG5ldyBVaW50OEFycmF5KDApLFxuICAgICAgICBvcHRzLmRhdGFcbiAgICBdKTtcbiAgICByZXR1cm4gc2lnbmVkRGF0YTtcbn0iXX0=