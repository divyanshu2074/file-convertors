import saveAs from 'file-saver';
import JSZip from 'jszip';

export function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename);
}

export function downloadUint8Array(data: Uint8Array, filename: string, mimeType = 'application/pdf') {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
  saveAs(blob, filename);
}

export async function downloadZip(
  files: { name: string; data: Uint8Array | Blob | string }[],
  zipFilename: string
) {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file.data);
  }
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, zipFilename);
}
