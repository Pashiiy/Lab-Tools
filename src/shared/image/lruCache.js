/**
 * Simple LRU cache backed by Map insertion order.
 */
export class LruCache {
  /**
   * @param {number} maxSize
   */
  constructor(maxSize = 8) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  has(key) {
    return this.map.has(key);
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  /**
   * @returns {string|null} evicted key, if any
   */
  set(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    let evicted = null;
    while (this.map.size >= this.maxSize) {
      evicted = this.map.keys().next().value;
      this.map.delete(evicted);
    }
    this.map.set(key, value);
    return evicted;
  }

  delete(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  deleteByPrefix(prefix) {
    for (const key of [...this.map.keys()]) {
      if (String(key).startsWith(prefix)) {
        this.map.delete(key);
      }
    }
  }
}
