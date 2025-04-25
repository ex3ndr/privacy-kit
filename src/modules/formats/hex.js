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
exports.decodeHex = decodeHex;
exports.encodeHex = encodeHex;
const hex = __importStar(require("@stablelib/hex"));
function decodeHex(hexString, format = 'normal') {
    if (format === 'mac') {
        const encoded = hexString.replace(/:/g, '');
        return hex.decode(encoded);
    }
    return hex.decode(hexString);
}
function encodeHex(buffer, format = 'normal') {
    if (format === 'mac') {
        const encoded = hex.encode(buffer);
        return encoded.match(/.{2}/g)?.join(':') || '';
    }
    return hex.encode(buffer);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGV4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsOEJBTUM7QUFFRCw4QkFNQztBQWhCRCxvREFBc0M7QUFFdEMsU0FBZ0IsU0FBUyxDQUFDLFNBQWlCLEVBQUUsU0FBMkIsUUFBUTtJQUM1RSxJQUFJLE1BQU0sS0FBSyxLQUFLLEVBQUUsQ0FBQztRQUNuQixNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUNELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNqQyxDQUFDO0FBRUQsU0FBZ0IsU0FBUyxDQUFDLE1BQWtCLEVBQUUsU0FBMkIsUUFBUTtJQUM3RSxJQUFJLE1BQU0sS0FBSyxLQUFLLEVBQUUsQ0FBQztRQUNuQixNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ25ELENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGhleCBmcm9tICdAc3RhYmxlbGliL2hleCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGVIZXgoaGV4U3RyaW5nOiBzdHJpbmcsIGZvcm1hdDogJ25vcm1hbCcgfCAnbWFjJyA9ICdub3JtYWwnKTogVWludDhBcnJheSB7XG4gICAgaWYgKGZvcm1hdCA9PT0gJ21hYycpIHtcbiAgICAgICAgY29uc3QgZW5jb2RlZCA9IGhleFN0cmluZy5yZXBsYWNlKC86L2csICcnKTtcbiAgICAgICAgcmV0dXJuIGhleC5kZWNvZGUoZW5jb2RlZCk7XG4gICAgfVxuICAgIHJldHVybiBoZXguZGVjb2RlKGhleFN0cmluZyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGVIZXgoYnVmZmVyOiBVaW50OEFycmF5LCBmb3JtYXQ6ICdub3JtYWwnIHwgJ21hYycgPSAnbm9ybWFsJyk6IHN0cmluZyB7XG4gICAgaWYgKGZvcm1hdCA9PT0gJ21hYycpIHtcbiAgICAgICAgY29uc3QgZW5jb2RlZCA9IGhleC5lbmNvZGUoYnVmZmVyKTtcbiAgICAgICAgcmV0dXJuIGVuY29kZWQubWF0Y2goLy57Mn0vZyk/LmpvaW4oJzonKSB8fCAnJztcbiAgICB9XG4gICAgcmV0dXJuIGhleC5lbmNvZGUoYnVmZmVyKTtcbn0iXX0=