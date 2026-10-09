import saveAs from 'file-saver';
import JSZip from 'jszip';
import { recordDownloadActivity } from './analytics';

export function downloadBlob(blob: Blob, filename: string) {
  recordDownloadActivity(filename, blob.size);
  saveAs(blob, filename);
}

export function downloadUint8Array(data: Uint8Array, filename: string, mimeType = 'application/pdf') {
  recordDownloadActivity(filename, data.byteLength);
  const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
  saveAs(blob, filename);
}

export async function downloadZip(
  files: { name: string; data: Uint8Array | Blob | string }[],
  zipFilename: string
) {
  const zip = new JSZip();
  let totalBytes = 0;
  for (const file of files) {
    zip.file(file.name, file.data);
    if (typeof file.data === 'string') totalBytes += file.data.length;
    else if (file.data instanceof Blob) totalBytes += file.data.size;
    else if (file.data instanceof Uint8Array) totalBytes += file.data.byteLength;
  }
  recordDownloadActivity(zipFilename, totalBytes);
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, zipFilename);
}
