"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const promises_1 = __importDefault(require("fs/promises"));
const nitro_1 = require("./nitro");
(0, vitest_1.describe)('nitro', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.useFakeTimers();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.it)('should parse nitro enclave attestation', async () => {
        const data1 = await promises_1.default.readFile(__dirname + '/__testdata__/nitro_release.txt', 'utf-8');
        vitest_1.vi.setSystemTime(1745546650000);
        (0, vitest_1.expect)((await (0, nitro_1.parseNitroEnclaveAttestation)(data1)).document).toMatchSnapshot();
        const data2 = await promises_1.default.readFile(__dirname + '/__testdata__/nitro_debug.txt', 'utf-8');
        vitest_1.vi.setSystemTime(1745522460500);
        (0, vitest_1.expect)((await (0, nitro_1.parseNitroEnclaveAttestation)(data2)).document).toMatchSnapshot();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibml0cm8uc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5pdHJvLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxtQ0FBeUU7QUFDekUsMkRBQTZCO0FBQzdCLG1DQUF1RDtBQUV2RCxJQUFBLGlCQUFRLEVBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtJQUNuQixJQUFBLG1CQUFVLEVBQUMsR0FBRyxFQUFFO1FBQ1osV0FBRSxDQUFDLGFBQWEsRUFBRSxDQUFBO0lBQ3RCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBQSxrQkFBUyxFQUFDLEdBQUcsRUFBRTtRQUNYLFdBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtJQUN0QixDQUFDLENBQUMsQ0FBQztJQUNILElBQUEsV0FBRSxFQUFDLHdDQUF3QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BELE1BQU0sS0FBSyxHQUFHLE1BQU0sa0JBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLGlDQUFpQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hGLFdBQUUsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDaEMsSUFBQSxlQUFNLEVBQUMsQ0FBQyxNQUFNLElBQUEsb0NBQTRCLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUMvRSxNQUFNLEtBQUssR0FBRyxNQUFNLGtCQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRywrQkFBK0IsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RixXQUFFLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2hDLElBQUEsZUFBTSxFQUFDLENBQUMsTUFBTSxJQUFBLG9DQUE0QixFQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDbkYsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRlc2NyaWJlLCBpdCwgZXhwZWN0LCB2aSwgYmVmb3JlRWFjaCwgYWZ0ZXJFYWNoIH0gZnJvbSAndml0ZXN0JztcbmltcG9ydCBmcyBmcm9tICdmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBwYXJzZU5pdHJvRW5jbGF2ZUF0dGVzdGF0aW9uIH0gZnJvbSAnLi9uaXRybyc7XG5cbmRlc2NyaWJlKCduaXRybycsICgpID0+IHtcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgICAgdmkudXNlRmFrZVRpbWVycygpXG4gICAgfSk7XG4gICAgYWZ0ZXJFYWNoKCgpID0+IHtcbiAgICAgICAgdmkudXNlUmVhbFRpbWVycygpXG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBwYXJzZSBuaXRybyBlbmNsYXZlIGF0dGVzdGF0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRhMSA9IGF3YWl0IGZzLnJlYWRGaWxlKF9fZGlybmFtZSArICcvX190ZXN0ZGF0YV9fL25pdHJvX3JlbGVhc2UudHh0JywgJ3V0Zi04Jyk7XG4gICAgICAgIHZpLnNldFN5c3RlbVRpbWUoMTc0NTU0NjY1MDAwMCk7XG4gICAgICAgIGV4cGVjdCgoYXdhaXQgcGFyc2VOaXRyb0VuY2xhdmVBdHRlc3RhdGlvbihkYXRhMSkpLmRvY3VtZW50KS50b01hdGNoU25hcHNob3QoKTtcbiAgICAgICAgY29uc3QgZGF0YTIgPSBhd2FpdCBmcy5yZWFkRmlsZShfX2Rpcm5hbWUgKyAnL19fdGVzdGRhdGFfXy9uaXRyb19kZWJ1Zy50eHQnLCAndXRmLTgnKTtcbiAgICAgICAgdmkuc2V0U3lzdGVtVGltZSgxNzQ1NTIyNDYwNTAwKTtcbiAgICAgICAgZXhwZWN0KChhd2FpdCBwYXJzZU5pdHJvRW5jbGF2ZUF0dGVzdGF0aW9uKGRhdGEyKSkuZG9jdW1lbnQpLnRvTWF0Y2hTbmFwc2hvdCgpO1xuICAgIH0pO1xufSk7ICJdfQ==