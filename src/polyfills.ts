/**
 * Runtime polyfills for the older WKWebView shipped with macOS Big Sur
 * (Safari/WebKit < 15.4). esbuild down-levels syntax but does NOT add these
 * ES2022 runtime globals, so we provide minimal, spec-aligned fallbacks here.
 * This file MUST be imported before anything else (see src/main.tsx).
 */

/* Object.hasOwn — Safari 15.4+ */
if (typeof (Object as unknown as { hasOwn?: unknown }).hasOwn !== 'function') {
  Object.defineProperty(Object, 'hasOwn', {
    configurable: true,
    writable: true,
    value: function hasOwn(obj: unknown, prop: PropertyKey): boolean {
      if (obj == null) throw new TypeError('Cannot convert undefined or null to object');
      return Object.prototype.hasOwnProperty.call(Object(obj), prop as string | symbol);
    },
  });
}

/* Array.prototype.at / String.prototype.at — Safari 15.4+ */
function atImpl(this: { length: number } & Record<number, unknown>, n: number): unknown {
  let i = Math.trunc(n) || 0;
  const len = this.length;
  if (i < 0) i += len;
  if (i < 0 || i >= len) return undefined;
  return this[i];
}
if (typeof Array.prototype.at !== 'function') {
  Object.defineProperty(Array.prototype, 'at', { configurable: true, writable: true, value: atImpl });
}
if (typeof String.prototype.at !== 'function') {
  Object.defineProperty(String.prototype, 'at', {
    configurable: true,
    writable: true,
    value: function (this: string, n: number) {
      const r = atImpl.call(this as unknown as { length: number } & Record<number, unknown>, n);
      return r === undefined ? undefined : String(r);
    },
  });
}

/* Array.prototype.findLast / findLastIndex — Safari 15.4+ */
if (typeof Array.prototype.findLast !== 'function') {
  Object.defineProperty(Array.prototype, 'findLast', {
    configurable: true,
    writable: true,
    value: function <T>(this: T[], cb: (v: T, i: number, a: T[]) => boolean, thisArg?: unknown): T | undefined {
      for (let i = this.length - 1; i >= 0; i--) {
        if (cb.call(thisArg, this[i], i, this)) return this[i];
      }
      return undefined;
    },
  });
}
if (typeof Array.prototype.findLastIndex !== 'function') {
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    configurable: true,
    writable: true,
    value: function <T>(this: T[], cb: (v: T, i: number, a: T[]) => boolean, thisArg?: unknown): number {
      for (let i = this.length - 1; i >= 0; i--) {
        if (cb.call(thisArg, this[i], i, this)) return i;
      }
      return -1;
    },
  });
}

/* structuredClone — Safari 15.4+ (JSON fallback is sufficient for plain data) */
if (typeof (globalThis as { structuredClone?: unknown }).structuredClone !== 'function') {
  (globalThis as unknown as { structuredClone: (v: unknown) => unknown }).structuredClone = function (v: unknown) {
    return v === undefined ? v : JSON.parse(JSON.stringify(v));
  };
}

export {};
