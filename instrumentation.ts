// instrumentation.ts — Next.js 15 instrumentation hook
// Runs BEFORE any page rendering on the server

export async function register() {
  // Fix: Node.js 22+ has a built-in localStorage global, but when
  // --localstorage-file is provided without a valid path, the methods
  // (getItem, setItem, etc.) are not functions. This crashes SSR.
  // Provide a no-op polyfill if localStorage exists but is broken.
  if (typeof globalThis !== 'undefined') {
    const ls = (globalThis as any).localStorage;
    if (ls && typeof ls.getItem !== 'function') {
      const store = new Map<string, string>();
      (globalThis as any).localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, String(value)),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        get length() { return store.size; },
        key: (index: number) => [...store.keys()][index] ?? null,
      };
    }
  }

  // Patch React.cache if missing (React 18 + Next.js 15 compatibility)
  try {
    const React = require('react');
    if (typeof React.cache !== 'function') {
      React.cache = (fn: any) => fn;
    }
  } catch {}
}
