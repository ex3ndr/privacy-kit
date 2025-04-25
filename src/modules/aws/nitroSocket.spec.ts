import { describe, it } from "vitest";
import { createNitroHttpAgent, fetchAttestation } from "./nitroSocket";
import * as axios from "axios";

describe('nitroSocket', () => {
    it('should connect', async () => {
        // const attestation = await fetchAttestation('localhost', 55109);
        const agent = createNitroHttpAgent({
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