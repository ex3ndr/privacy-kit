import { monotonicNow } from "../time/monotonicNow";

/**
 * An in-memory key-value store that automatically removes entries after the
 * specified "time-to-live" (TTL).
 *
 * The implementation is intentionally lightweight and does not spawn any
 * background timers.  Expired entries are purged lazily during interaction
 * with the map (get/has/iteration).  All time calculations use *monotonic*
 * timestamps obtained from monitonicNow, so changes to the system
 * clock will not break expiration logic.
 *
 * @typeParam K - Key type (same constraints as the built-in `Map`)
 * @typeParam V - Value type
 */
export class ExpirableMap<K, V> implements Iterable<[K, V]> {

    private readonly _defaultTTL: number;   // milliseconds
    private readonly _store: Map<K, { value: V; expiresAt: number | null }>; // null == no expiration

    /**
     * @param defaultTTL  Default TTL applied by {@link set} when one is not
     *                    provided explicitly (milliseconds).  Set to
     *                    `Infinity` or `0` for entries that never expire.
     */
    constructor(defaultTTL: number = Infinity) {
        if (defaultTTL < 0) {
            throw new Error('defaultTTL must be non-negative');
        }
        this._defaultTTL = defaultTTL === 0 ? Infinity : defaultTTL;
        this._store = new Map();
    }

    /**
     * Stores a value under `key` and returns the map instance for chaining.
     * Passing `ttl` overrides the default TTL for this particular entry.
     *
     * @param key  Entry key
     * @param value  Entry value
     * @param ttl  Time-to-live in milliseconds
     */
    public set(key: K, value: V, ttl?: number): this {
        const _ttl = ttl ?? this._defaultTTL;
        const expiresAt = _ttl === Infinity ? null : monotonicNow() + _ttl;
        this._store.set(key, { value, expiresAt });
        return this;
    }

    /**
     * Retrieves a value or `undefined` if the key is missing or the entry has
     * expired.  Expired entries are pruned as a side-effect.
     */
    public get(key: K): V | undefined {
        const record = this._store.get(key);
        if (!record) {
            return undefined;
        }
        if (this._isExpired(record)) {
            this._store.delete(key);
            return undefined;
        }
        return record.value;
    }

    /**
     * Checks whether `key` exists and the entry is still valid.
     */
    public has(key: K): boolean {
        const record = this._store.get(key);
        if (!record) {
            return false;
        }
        if (this._isExpired(record)) {
            this._store.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Removes `key` from the map and returns `true` if the entry existed.
     */
    public delete(key: K): boolean {
        return this._store.delete(key);
    }

    /**
     * Removes all entries from the map.
     */
    public clear(): void {
        this._store.clear();
    }

    /**
     * Lazily removes all expired entries and returns the amount of *live*
     * entries.
     */
    public get size(): number {
        this._cleanupExpired();
        return this._store.size;
    }

    /**
     * Returns an iterator producing `[key, value]` pairs for live entries only.
     * Expired items encountered during iteration are removed transparently.
     */
    public *entries(): IterableIterator<[K, V]> {
        for (const [k, record] of this._store.entries()) {
            if (this._isExpired(record)) {
                this._store.delete(k);
                continue;
            }
            yield [k, record.value];
        }
    }

    /** `for…of` support (same as {@link entries}). */
    public [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    /** Returns an iterator over live keys. */
    public *keys(): IterableIterator<K> {
        for (const [k] of this.entries()) {
            yield k;
        }
    }

    /** Returns an iterator over live values. */
    public *values(): IterableIterator<V> {
        for (const [, v] of this.entries()) {
            yield v;
        }
    }

    /**
     * Executes `callback` for each live entry.
     */
    public forEach(callback: (value: V, key: K, map: this) => void): void {
        for (const [k, v] of this.entries()) {
            callback(v, k, this);
        }
    }

    /** Immediately removes all expired items. */
    public purgeExpired(): void {
        this._cleanupExpired();
    }

    // --------------------------------------------------------
    //                      Internals
    // --------------------------------------------------------

    private _isExpired(record: { expiresAt: number | null }): boolean {
        return record.expiresAt !== null && record.expiresAt <= monotonicNow();
    }

    private _cleanupExpired(): void {
        const now = monotonicNow();
        for (const [k, record] of this._store) {
            if (record.expiresAt !== null && record.expiresAt <= now) {
                this._store.delete(k);
            }
        }
    }
}
