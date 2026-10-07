import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker to use local public static worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export { pdfjsLib };
