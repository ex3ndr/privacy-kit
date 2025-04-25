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
exports.fetchAttestation = fetchAttestation;
exports.createNitroHttpAgent = createNitroHttpAgent;
const https = __importStar(require("https"));
const tls = __importStar(require("tls"));
const crypto_1 = require("crypto");
const nitro_1 = require("./nitro");
const hex_1 = require("../formats/hex");
async function fetchAttestation(host, port) {
    // Generate a random nonce for the attestation request
    const nonce = (0, crypto_1.randomBytes)(40).toString('hex');
    // Return a promise that resolves with the attestation data
    const raw = (await new Promise((resolve, reject) => {
        const request = https.request({
            host: host,
            port: port,
            path: `/enclave/attestation?nonce=${nonce}`,
            method: 'GET',
            rejectUnauthorized: false
        }, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                resolve(data);
            });
        });
        request.on('error', (error) => {
            reject(error);
        });
        request.end();
    })).trim();
    // Parse the attestation
    return await (0, nitro_1.parseNitroEnclaveAttestation)(raw);
}
async function createNitroConnection(host, port, trusted) {
    // Create TLS socket
    const socket = await new Promise((resolve, reject) => {
        const socket = tls.connect({
            host: host,
            port: port,
            rejectUnauthorized: false,
        });
        socket.once('secureConnect', () => {
            resolve(socket);
        });
        socket.once('error', (err) => {
            reject(err);
        });
    });
    // Get certificate
    const cert = socket.getPeerCertificate();
    if (!cert) {
        throw new Error('No certificate');
    }
    // Fetch attestation data
    const attestation = await fetchAttestation(host, port);
    try {
        const userData = attestation.document.userData;
        if (!userData) {
            throw new Error('No user data');
        }
        // Verify user data
        const certificateHash = new Uint8Array([...(0, hex_1.decodeHex)('73:68:61:32:35:36:3A', 'mac'), ...(0, hex_1.decodeHex)(cert.fingerprint256, 'mac')]);
        if (userData.length < certificateHash.length) {
            throw new Error('Invalid user data');
        }
        for (let i = 0; i < certificateHash.length; i++) {
            if (userData[i] !== certificateHash[i]) {
                throw new Error('Invalid user data');
            }
        }
        // Verify kernels
        let found = false;
        for (const t of trusted) {
            const pcr1 = attestation.document.pcrs[1];
            const pcr2 = attestation.document.pcrs[2];
            if (!pcr1 || !pcr2) {
                throw new Error('No PCR');
            }
            if (pcr1.toLowerCase() === t.pcr1.toLowerCase() && pcr2.toLowerCase() === t.pcr2.toLowerCase()) {
                found = true;
                break;
            }
        }
        if (!found) {
            throw new Error('Untrusted');
        }
    }
    catch (e) {
        socket.destroy();
        throw e;
    }
    return socket;
}
function createNitroHttpAgent(opts) {
    const agent = new https.Agent({
        rejectUnauthorized: false,
    });
    agent.createConnection = function (options, oncreate) {
        createNitroConnection(options.host, options.port, opts.trusted).then((result) => {
            oncreate(null, result);
        }).catch((err) => {
            oncreate(err);
        });
    };
    return agent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibml0cm9Tb2NrZXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJuaXRyb1NvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQU9BLDRDQWdDQztBQXVFRCxvREFrQkM7QUFoSUQsNkNBQStCO0FBQy9CLHlDQUEyQjtBQUMzQixtQ0FBcUM7QUFFckMsbUNBQXVEO0FBQ3ZELHdDQUEyQztBQUVwQyxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsSUFBWSxFQUFFLElBQVk7SUFFN0Qsc0RBQXNEO0lBQ3RELE1BQU0sS0FBSyxHQUFHLElBQUEsb0JBQVcsRUFBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFOUMsMkRBQTJEO0lBQzNELE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN2RCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO1lBQzFCLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsOEJBQThCLEtBQUssRUFBRTtZQUMzQyxNQUFNLEVBQUUsS0FBSztZQUNiLGtCQUFrQixFQUFFLEtBQUs7U0FDNUIsRUFBRSxDQUFDLFFBQXlCLEVBQUUsRUFBRTtZQUM3QixJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7WUFDZCxRQUFRLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUMxQixJQUFJLElBQUksS0FBSyxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO2dCQUNwQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEIsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztRQUVILE9B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QUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDO0lBQ0YsT0FBTyxLQUFLLENBQUM7QUFDakIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGh0dHBzIGZyb20gXCJodHRwc1wiO1xuaW1wb3J0ICogYXMgdGxzIGZyb20gJ3Rscyc7XG5pbXBvcnQgeyByYW5kb21CeXRlcyB9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgeyBJbmNvbWluZ01lc3NhZ2UgfSBmcm9tICdodHRwJztcbmltcG9ydCB7IHBhcnNlTml0cm9FbmNsYXZlQXR0ZXN0YXRpb24gfSBmcm9tIFwiLi9uaXRyb1wiO1xuaW1wb3J0IHsgZGVjb2RlSGV4IH0gZnJvbSBcIi4uL2Zvcm1hdHMvaGV4XCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaEF0dGVzdGF0aW9uKGhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyKSB7XG5cbiAgICAvLyBHZW5lcmF0ZSBhIHJhbmRvbSBub25jZSBmb3IgdGhlIGF0dGVzdGF0aW9uIHJlcXVlc3RcbiAgICBjb25zdCBub25jZSA9IHJhbmRvbUJ5dGVzKDQwKS50b1N0cmluZygnaGV4Jyk7XG5cbiAgICAvLyBSZXR1cm4gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCB0aGUgYXR0ZXN0YXRpb24gZGF0YVxuICAgIGNvbnN0IHJhdyA9IChhd2FpdCBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IGh0dHBzLnJlcXVlc3Qoe1xuICAgICAgICAgICAgaG9zdDogaG9zdCxcbiAgICAgICAgICAgIHBvcnQ6IHBvcnQsXG4gICAgICAgICAgICBwYXRoOiBgL2VuY2xhdmUvYXR0ZXN0YXRpb24/bm9uY2U9JHtub25jZX1gLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2VcbiAgICAgICAgfSwgKHJlc3BvbnNlOiBJbmNvbWluZ01lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGxldCBkYXRhID0gJyc7XG4gICAgICAgICAgICByZXNwb25zZS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgICAgICAgICAgIGRhdGEgKz0gY2h1bms7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlc3BvbnNlLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXF1ZXN0Lm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmVxdWVzdC5lbmQoKTtcbiAgICB9KSkudHJpbSgpO1xuXG4gICAgLy8gUGFyc2UgdGhlIGF0dGVzdGF0aW9uXG4gICAgcmV0dXJuIGF3YWl0IHBhcnNlTml0cm9FbmNsYXZlQXR0ZXN0YXRpb24ocmF3KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlTml0cm9Db25uZWN0aW9uKGhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyLCB0cnVzdGVkOiB7XG4gICAgcGNyMTogc3RyaW5nLFxuICAgIHBjcjI6IHN0cmluZ1xufVtdKSB7XG5cbiAgICAvLyBDcmVhdGUgVExTIHNvY2tldFxuICAgIGNvbnN0IHNvY2tldCA9IGF3YWl0IG5ldyBQcm9taXNlPHRscy5UTFNTb2NrZXQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3Qgc29ja2V0ID0gdGxzLmNvbm5lY3Qoe1xuICAgICAgICAgICAgaG9zdDogaG9zdCxcbiAgICAgICAgICAgIHBvcnQ6IHBvcnQsXG4gICAgICAgICAgICByZWplY3RVbmF1dGhvcml6ZWQ6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgc29ja2V0Lm9uY2UoJ3NlY3VyZUNvbm5lY3QnLCAoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKHNvY2tldCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzb2NrZXQub25jZSgnZXJyb3InLCAoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIEdldCBjZXJ0aWZpY2F0ZVxuICAgIGNvbnN0IGNlcnQgPSBzb2NrZXQuZ2V0UGVlckNlcnRpZmljYXRlKCk7XG4gICAgaWYgKCFjZXJ0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gY2VydGlmaWNhdGUnKTtcbiAgICB9XG5cbiAgICAvLyBGZXRjaCBhdHRlc3RhdGlvbiBkYXRhXG4gICAgY29uc3QgYXR0ZXN0YXRpb24gPSBhd2FpdCBmZXRjaEF0dGVzdGF0aW9uKGhvc3QsIHBvcnQpO1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHVzZXJEYXRhID0gYXR0ZXN0YXRpb24uZG9jdW1lbnQudXNlckRhdGE7XG4gICAgICAgIGlmICghdXNlckRhdGEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gdXNlciBkYXRhJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWZXJpZnkgdXNlciBkYXRhXG4gICAgICAgIGNvbnN0IGNlcnRpZmljYXRlSGFzaCA9IG5ldyBVaW50OEFycmF5KFsuLi5kZWNvZGVIZXgoJzczOjY4OjYxOjMyOjM1OjM2OjNBJywgJ21hYycpLCAuLi5kZWNvZGVIZXgoY2VydC5maW5nZXJwcmludDI1NiEsICdtYWMnKV0pO1xuICAgICAgICBpZiAodXNlckRhdGEubGVuZ3RoIDwgY2VydGlmaWNhdGVIYXNoLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHVzZXIgZGF0YScpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2VydGlmaWNhdGVIYXNoLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodXNlckRhdGFbaV0gIT09IGNlcnRpZmljYXRlSGFzaFtpXSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB1c2VyIGRhdGEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFZlcmlmeSBrZXJuZWxzXG4gICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgdHJ1c3RlZCkge1xuICAgICAgICAgICAgY29uc3QgcGNyMSA9IGF0dGVzdGF0aW9uLmRvY3VtZW50LnBjcnNbMV07XG4gICAgICAgICAgICBjb25zdCBwY3IyID0gYXR0ZXN0YXRpb24uZG9jdW1lbnQucGNyc1syXTtcbiAgICAgICAgICAgIGlmICghcGNyMSB8fCAhcGNyMikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gUENSJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGNyMS50b0xvd2VyQ2FzZSgpID09PSB0LnBjcjEudG9Mb3dlckNhc2UoKSAmJiBwY3IyLnRvTG93ZXJDYXNlKCkgPT09IHQucGNyMi50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW50cnVzdGVkJyk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNvY2tldDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU5pdHJvSHR0cEFnZW50KG9wdHM6IHtcbiAgICB0cnVzdGVkOiB7XG4gICAgICAgIHBjcjE6IHN0cmluZyxcbiAgICAgICAgcGNyMjogc3RyaW5nXG4gICAgfVtdXG59KSB7XG5cbiAgICBjb25zdCBhZ2VudCA9IG5ldyBodHRwcy5BZ2VudCh7XG4gICAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsXG4gICAgfSk7XG4gICAgKGFnZW50IGFzIGFueSkuY3JlYXRlQ29ubmVjdGlvbiA9IGZ1bmN0aW9uIChvcHRpb25zOiBhbnksIG9uY3JlYXRlOiBhbnkpIHtcbiAgICAgICAgY3JlYXRlTml0cm9Db25uZWN0aW9uKG9wdGlvbnMuaG9zdCwgb3B0aW9ucy5wb3J0LCBvcHRzLnRydXN0ZWQpLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgb25jcmVhdGUobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgb25jcmVhdGUoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4gYWdlbnQ7XG59XG4iXX0=