"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAttestation = exports.createNitroHttpAgent = exports.encodeHex = exports.decodeHex = exports.encodeBase64 = exports.decodeBase64 = void 0;
var base64_1 = require("./modules/formats/base64");
Object.defineProperty(exports, "decodeBase64", { enumerable: true, get: function () { return base64_1.decodeBase64; } });
Object.defineProperty(exports, "encodeBase64", { enumerable: true, get: function () { return base64_1.encodeBase64; } });
var hex_1 = require("./modules/formats/hex");
Object.defineProperty(exports, "decodeHex", { enumerable: true, get: function () { return hex_1.decodeHex; } });
Object.defineProperty(exports, "encodeHex", { enumerable: true, get: function () { return hex_1.encodeHex; } });
var nitroSocket_1 = require("./modules/aws/nitroSocket");
Object.defineProperty(exports, "createNitroHttpAgent", { enumerable: true, get: function () { return nitroSocket_1.createNitroHttpAgent; } });
Object.defineProperty(exports, "fetchAttestation", { enumerable: true, get: function () { return nitroSocket_1.fetchAttestation; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFHa0M7QUFGOUIsc0dBQUEsWUFBWSxPQUFBO0FBQ1osc0dBQUEsWUFBWSxPQUFBO0FBRWhCLDZDQUcrQjtBQUYzQixnR0FBQSxTQUFTLE9BQUE7QUFDVCxnR0FBQSxTQUFTLE9BQUE7QUFFYix5REFHbUM7QUFGL0IsbUhBQUEsb0JBQW9CLE9BQUE7QUFDcEIsK0dBQUEsZ0JBQWdCLE9BQUEiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQge1xuICAgIGRlY29kZUJhc2U2NCxcbiAgICBlbmNvZGVCYXNlNjRcbn0gZnJvbSAnLi9tb2R1bGVzL2Zvcm1hdHMvYmFzZTY0JztcbmV4cG9ydCB7XG4gICAgZGVjb2RlSGV4LFxuICAgIGVuY29kZUhleFxufSBmcm9tICcuL21vZHVsZXMvZm9ybWF0cy9oZXgnO1xuZXhwb3J0IHtcbiAgICBjcmVhdGVOaXRyb0h0dHBBZ2VudCxcbiAgICBmZXRjaEF0dGVzdGF0aW9uXG59IGZyb20gJy4vbW9kdWxlcy9hd3Mvbml0cm9Tb2NrZXQnO1xuZXhwb3J0IHR5cGUge1xuICAgIE5pdHJvRW5jbGF2ZUF0dGVzdGF0aW9uXG59IGZyb20gJy4vbW9kdWxlcy9hd3Mvbml0cm8nO1xuIl19