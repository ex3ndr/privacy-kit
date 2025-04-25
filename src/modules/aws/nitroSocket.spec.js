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
const vitest_1 = require("vitest");
const nitroSocket_1 = require("./nitroSocket");
const axios = __importStar(require("axios"));
(0, vitest_1.describe)('nitroSocket', () => {
    (0, vitest_1.it)('should connect', async () => {
        // const attestation = await fetchAttestation('localhost', 55109);
        const agent = (0, nitroSocket_1.createNitroHttpAgent)({
            trusted: [{
                    pcr1: '4B:4D:5B:36:61:B3:EF:C1:29:20:90:0C:80:E1:26:E4:CE:78:3C:52:2D:E6:C0:2A:2A:5B:F7:AF:3A:2B:93:27:B8:67:76:F1:88:E4:BE:1C:1C:40:4A:12:9D:BD:A4:93',
                    pcr2: '7F:63:62:CD:21:3C:52:AE:DA:29:29:82:A6:D7:0B:35:41:3C:BE:F0:37:C5:4F:DD:3D:D4:97:A4:FE:D2:5D:2F:5F:28:36:FB:FD:27:EA:0B:EA:29:89:55:AD:B3:26:02'
                }]
        });
        const client = new axios.Axios({
            httpsAgent: agent,
        });
        const response = await client.get('https://localhost:55109/');
        console.log(response.data);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibml0cm9Tb2NrZXQuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5pdHJvU29ja2V0LnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBc0M7QUFDdEMsK0NBQXVFO0FBQ3ZFLDZDQUErQjtBQUUvQixJQUFBLGlCQUFRLEVBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUN6QixJQUFBLFdBQUUsRUFBQyxnQkFBZ0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1QixrRUFBa0U7UUFDbEUsTUFBTSxLQUFLLEdBQUcsSUFBQSxrQ0FBb0IsRUFBQztZQUMvQixPQUFPLEVBQUUsQ0FBQztvQkFDTixJQUFJLEVBQUUsaUpBQWlKO29CQUN2SixJQUFJLEVBQUUsaUpBQWlKO2lCQUMxSixDQUFDO1NBQ0wsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQzNCLFVBQVUsRUFBRSxLQUFLO1NBQ3BCLENBQUMsQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkZXNjcmliZSwgaXQgfSBmcm9tIFwidml0ZXN0XCI7XG5pbXBvcnQgeyBjcmVhdGVOaXRyb0h0dHBBZ2VudCwgZmV0Y2hBdHRlc3RhdGlvbiB9IGZyb20gXCIuL25pdHJvU29ja2V0XCI7XG5pbXBvcnQgKiBhcyBheGlvcyBmcm9tIFwiYXhpb3NcIjtcblxuZGVzY3JpYmUoJ25pdHJvU29ja2V0JywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgY29ubmVjdCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgLy8gY29uc3QgYXR0ZXN0YXRpb24gPSBhd2FpdCBmZXRjaEF0dGVzdGF0aW9uKCdsb2NhbGhvc3QnLCA1NTEwOSk7XG4gICAgICAgIGNvbnN0IGFnZW50ID0gY3JlYXRlTml0cm9IdHRwQWdlbnQoe1xuICAgICAgICAgICAgdHJ1c3RlZDogW3tcbiAgICAgICAgICAgICAgICBwY3IxOiAnNEI6NEQ6NUI6MzY6NjE6QjM6RUY6QzE6Mjk6MjA6OTA6MEM6ODA6RTE6MjY6RTQ6Q0U6Nzg6M0M6NTI6MkQ6RTY6QzA6MkE6MkE6NUI6Rjc6QUY6M0E6MkI6OTM6Mjc6Qjg6Njc6NzY6RjE6ODg6RTQ6QkU6MUM6MUM6NDA6NEE6MTI6OUQ6QkQ6QTQ6OTMnLFxuICAgICAgICAgICAgICAgIHBjcjI6ICc3Rjo2Mzo2MjpDRDoyMTozQzo1MjpBRTpEQToyOToyOTo4MjpBNjpENzowQjozNTo0MTozQzpCRTpGMDozNzpDNTo0RjpERDozRDpENDo5NzpBNDpGRTpEMjo1RDoyRjo1RjoyODozNjpGQjpGRDoyNzpFQTowQjpFQToyOTo4OTo1NTpBRDpCMzoyNjowMidcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBjbGllbnQgPSBuZXcgYXhpb3MuQXhpb3Moe1xuICAgICAgICAgICAgaHR0cHNBZ2VudDogYWdlbnQsXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNsaWVudC5nZXQoJ2h0dHBzOi8vbG9jYWxob3N0OjU1MTA5LycpO1xuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZS5kYXRhKTtcbiAgICB9KTtcbn0pOyJdfQ==