export function monotonicNow(): number {
    
    // Browser (or Deno) environment
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }

    // Node.js environment (lazy loaded to keep this file isomorphic)
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { performance: nodePerf } = require('perf_hooks') as typeof import('perf_hooks');
        if (typeof nodePerf?.now === 'function') {
            return nodePerf.now();
        }
    } catch (_) {
        /* noop */
    }

    // Fallback – high-resolution real time from Node.js
    if (typeof process !== 'undefined' && typeof process.hrtime === 'function') {
        const [secs, nanos] = process.hrtime();
        return secs * 1_000 + nanos / 1_000_000; // convert to milliseconds
    }

    // Unable to determine monotonic time
    throw new Error('monotonicNow is not supported in this environment');
}