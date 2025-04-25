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
exports.decodeBase64 = decodeBase64;
exports.encodeBase64 = encodeBase64;
const b64 = __importStar(require("@stablelib/base64"));
function decodeBase64(base64, encoding = 'base64') {
    if (encoding === 'base64url') {
        return b64.decodeURLSafe(base64);
    }
    return b64.decode(base64);
}
function encodeBase64(buffer, encoding = 'base64') {
    if (encoding === 'base64url') {
        return b64.encodeURLSafe(buffer);
    }
    return b64.encode(buffer);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZTY0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYmFzZTY0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsb0NBS0M7QUFFRCxvQ0FLQztBQWRELHVEQUF5QztBQUV6QyxTQUFnQixZQUFZLENBQUMsTUFBYyxFQUFFLFdBQW1DLFFBQVE7SUFDcEYsSUFBSSxRQUFRLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDM0IsT0FBTyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVELFNBQWdCLFlBQVksQ0FBQyxNQUFrQixFQUFFLFdBQW1DLFFBQVE7SUFDeEYsSUFBSSxRQUFRLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDM0IsT0FBTyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGI2NCBmcm9tICdAc3RhYmxlbGliL2Jhc2U2NCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGVCYXNlNjQoYmFzZTY0OiBzdHJpbmcsIGVuY29kaW5nOiAnYmFzZTY0JyB8ICdiYXNlNjR1cmwnID0gJ2Jhc2U2NCcpOiBVaW50OEFycmF5IHtcbiAgICBpZiAoZW5jb2RpbmcgPT09ICdiYXNlNjR1cmwnKSB7XG4gICAgICAgIHJldHVybiBiNjQuZGVjb2RlVVJMU2FmZShiYXNlNjQpO1xuICAgIH1cbiAgICByZXR1cm4gYjY0LmRlY29kZShiYXNlNjQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlQmFzZTY0KGJ1ZmZlcjogVWludDhBcnJheSwgZW5jb2Rpbmc6ICdiYXNlNjQnIHwgJ2Jhc2U2NHVybCcgPSAnYmFzZTY0Jyk6IHN0cmluZyB7XG4gICAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0dXJsJykge1xuICAgICAgICByZXR1cm4gYjY0LmVuY29kZVVSTFNhZmUoYnVmZmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGI2NC5lbmNvZGUoYnVmZmVyKTtcbn0iXX0=