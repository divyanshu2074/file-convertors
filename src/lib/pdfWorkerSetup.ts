// Polyfill Uint8Array.prototype.toHex if not natively present (TC39 stage 3 / Node / older browsers)
if (typeof Uint8Array !== 'undefined' && !('toHex' in Uint8Array.prototype)) {
  Object.defineProperty(Uint8Array.prototype, 'toHex', {
    value: function () {
      return Array.from(this as any)
        .map((b: any) => Number(b).toString(16).padStart(2, '0'))
        .join('');
    },
    configurable: true,
    writable: true,
  });
}

import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker to use local public static worker with relative base
if (typeof window !== 'undefined') {
  const base = (import.meta as any).env?.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : base + '/';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${cleanBase}pdf.worker.min.mjs`;
}

export { pdfjsLib };

