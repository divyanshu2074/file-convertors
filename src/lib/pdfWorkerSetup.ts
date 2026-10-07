import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker to use local public static worker with relative base
if (typeof window !== 'undefined') {
  const base = import.meta.env.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : base + '/';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${cleanBase}pdf.worker.min.mjs`;
}

export { pdfjsLib };
