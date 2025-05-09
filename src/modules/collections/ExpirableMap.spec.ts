import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExpirableMap } from './ExpirableMap';

// Enable modern fake timers so we can control the monotonic clock
beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('ExpirableMap', () => {

    it('stores and retrieves values before expiration', () => {
        const map = new ExpirableMap<string, number>(1000); // default TTL 1s
        map.set('a', 123);
        expect(map.get('a')).toBe(123);
        expect(map.has('a')).toBe(true);
        expect(map.size).toBe(1);
    });

    it('expires entries after the default TTL', () => {
        const map = new ExpirableMap<string, number>(1000); // 1s TTL
        map.set('x', 42);

        vi.advanceTimersByTime(999);
        // Not yet expired
        expect(map.get('x')).toBe(42);
        expect(map.has('x')).toBe(true);

        vi.advanceTimersByTime(2); // total 1001ms passed
        // Should be expired now
        expect(map.get('x')).toBeUndefined();
        expect(map.has('x')).toBe(false);
        expect(map.size).toBe(0);
    });

    it('allows per-entry TTL override', () => {
        const map = new ExpirableMap<string, number>(1000); // default 1s
        map.set('short', 1, 100);   // custom TTL 100ms
        map.set('long', 2, 2000);   // custom TTL 2s

        vi.advanceTimersByTime(150);
        // 'short' expired, 'long' alive
        expect(map.get('short')).toBeUndefined();
        expect(map.get('long')).toBe(2);

        vi.advanceTimersByTime(1900); // total 2050ms
        // 'long' now expired
        expect(map.has('long')).toBe(false);
        expect([...map.entries()].length).toBe(0);
    });

    it('supports non-expiring entries with Infinity TTL', () => {
        const map = new ExpirableMap<string, number>(Infinity);
        map.set('persist', 777);

        vi.advanceTimersByTime(10_000);
        expect(map.get('persist')).toBe(777);
        expect(map.size).toBe(1);
    });

    it('purgeExpired removes outdated entries eagerly', () => {
        const map = new ExpirableMap<string, number>(100);
        map.set('tmp', 999);

        vi.advanceTimersByTime(150);
        map.purgeExpired();
        expect(map.size).toBe(0);
    });

}); 