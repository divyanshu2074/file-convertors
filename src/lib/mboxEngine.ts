import * as XLSX from 'xlsx';

export interface ParsedEmail {
  id: number;
  date: string;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  messageId: string;
  hasAttachments: string;
  bodySnippet: string;
  startByte: number;
  endByte: number;
  fullBody?: string;
}

export interface MboxProgress {
  bytesProcessed: number;
  totalBytes: number;
  percent: number;
  emailsFound: number;
}

/**
 * Decode RFC 2047 MIME encoded-words e.g. =?UTF-8?B?....?= or =?UTF-8?Q?....?=
 */
export function decodeMimeWords(str: string): string {
  if (!str) return '';
  // Collapse whitespace between adjacent encoded words per RFC 2047
  let normalized = str;
  while (/(=\?[^?]+\?[BQbq]\?[^?]*\?=)\s+(=\?[^?]+\?[BQbq]\?[^?]*\?=)/.test(normalized)) {
    normalized = normalized.replace(/(=\?[^?]+\?[BQbq]\?[^?]*\?=)\s+(=\?[^?]+\?[BQbq]\?[^?]*\?=)/g, '$1$2');
  }

  return normalized.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_: string, charset: string, encoding: string, text: string) => {
    try {
      const enc = encoding.toUpperCase();
      if (enc === 'B') {
        const binary = atob(text.replace(/\s/g, ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder(charset).decode(bytes);
      } else if (enc === 'Q') {
        const unescaped = text.replace(/_/g, ' ').replace(/=([A-Fa-f0-9]{2})/g, (_match: string, hex: string) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        const bytes = new Uint8Array(unescaped.length);
        for (let i = 0; i < unescaped.length; i++) {
          bytes[i] = unescaped.charCodeAt(i);
        }
        return new TextDecoder(charset).decode(bytes);
      }
    } catch {
      return text;
    }
    return text;
  });
}

/**
 * Decode Quoted-Printable transfer encoding
 */
export function decodeQuotedPrintable(input: string): string {
  if (!input) return '';
  const clean = input.replace(/=\r?\n/g, '');
  return clean.replace(/=([A-Fa-f0-9]{2})/g, (_match: string, hex: string) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return _match;
    }
  });
}

/**
 * Clean up HTML tags and entities to extract legible plain text
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse headers from an email header block
 */
function parseHeaders(rawHeaders: string): Record<string, string> {
  const unfolded = rawHeaders.replace(/\r?\n[ \t]+/g, ' ');
  const lines = unfolded.split(/\r?\n/);
  const headers: Record<string, string> = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      if (!headers[key]) {
        headers[key] = val;
      } else {
        headers[key] += ', ' + val;
      }
    }
  }
  return headers;
}

/**
 * Parse a single message block (headers + snippet) with minimal memory footprint
 */
function processMessageBlock(
  messageText: string,
  index: number,
  startByte: number,
  endByte: number
): ParsedEmail {
  const headerEndMatch = messageText.match(/\r?\n\r?\n/);
  let rawHeaders = '';
  let rawBodySample = '';

  if (headerEndMatch && headerEndMatch.index !== undefined) {
    rawHeaders = messageText.slice(0, headerEndMatch.index);
    // Take at most 4KB sample for snippet and attachment detection
    rawBodySample = messageText.slice(
      headerEndMatch.index + headerEndMatch[0].length,
      headerEndMatch.index + headerEndMatch[0].length + 4096
    );
  } else {
    rawHeaders = messageText.slice(0, 4096);
  }

  const headers = parseHeaders(rawHeaders);
  const contentType = (headers['content-type'] || '').toLowerCase();
  const transferEncoding = (headers['content-transfer-encoding'] || '').toLowerCase();

  const subject = decodeMimeWords(headers['subject'] || '(No Subject)');
  const from = decodeMimeWords(headers['from'] || '(Unknown Sender)');
  const to = decodeMimeWords(headers['to'] || '');
  const cc = decodeMimeWords(headers['cc'] || '');
  const bcc = decodeMimeWords(headers['bcc'] || '');
  const dateRaw = headers['date'] || '';
  const messageId = headers['message-id'] || '';

  // Quick check for attachments in headers or early body
  const hasAttachments =
    /content-disposition:\s*attachment/i.test(messageText.slice(0, 10000)) ||
    /filename=/i.test(messageText.slice(0, 10000)) ||
    /name="?[^"\r\n]+\.(pdf|docx?|xlsx?|zip|png|jpe?g|csv|txt)"?/i.test(contentType)
      ? 'Yes'
      : 'No';

  // Decode body snippet
  let bodyText = rawBodySample;
  if (transferEncoding.includes('quoted-printable')) {
    bodyText = decodeQuotedPrintable(bodyText);
  } else if (transferEncoding.includes('base64')) {
    try {
      bodyText = atob(bodyText.replace(/\s/g, '').slice(0, 1000));
    } catch {
      // Keep raw
    }
  }

  if (contentType.includes('text/html') || bodyText.includes('<html') || bodyText.includes('<div') || bodyText.includes('<p>')) {
    bodyText = stripHtml(bodyText);
  }

  const snippet = bodyText
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 250);

  return {
    id: index,
    date: dateRaw,
    from,
    to,
    cc,
    bcc,
    subject,
    messageId,
    hasAttachments,
    bodySnippet: snippet,
    startByte,
    endByte,
  };
}

/**
 * Memory-safe streaming MBOX parser for files of ANY size (100MB - 5GB+)
 * Reads chunk-by-chunk via File.slice, extracting headers and releasing memory.
 */
export async function parseMboxStream(
  file: File,
  onProgress?: (progress: MboxProgress) => void,
  signal?: AbortSignal
): Promise<ParsedEmail[]> {
  const CHUNK_SIZE = 1024 * 1024 * 2; // 2 MB chunks
  const totalBytes = file.size;
  let offset = 0;
  const emails: ParsedEmail[] = [];

  let lineBuffer = '';
  let currentMsgStartByte = 0;
  let currentMsgLines: string[] = [];
  let emailCount = 0;
  let lastProgressUpdate = Date.now();

  const decoder = new TextDecoder('utf-8', { fatal: false });

  while (offset < totalBytes) {
    if (signal?.aborted) {
      break;
    }

    const chunkEnd = Math.min(offset + CHUNK_SIZE, totalBytes);
    const blobSlice = file.slice(offset, chunkEnd);
    const arrayBuffer = await blobSlice.arrayBuffer();
    const chunkText = decoder.decode(arrayBuffer, { stream: chunkEnd < totalBytes });

    // Combine with leftover line buffer from previous chunk
    const fullChunk = lineBuffer + chunkText;
    const lines = fullChunk.split(/\r?\n/);

    // Keep the last incomplete line in lineBuffer
    lineBuffer = lines.pop() || '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Standard MBOX message separator: line starting with "From "
      if (line.startsWith('From ') && (emailCount === 0 || currentMsgLines.length > 2)) {
        if (currentMsgLines.length > 0) {
          emailCount++;
          const msgText = currentMsgLines.join('\n');
          const msgEndByte = offset + (i * 20); // Approximate byte boundary
          const email = processMessageBlock(msgText, emailCount, currentMsgStartByte, msgEndByte);
          emails.push(email);

          currentMsgLines = [];
          currentMsgStartByte = msgEndByte;
        }
      }

      // To keep memory minimal, don't store unbounded lines per message:
      // We need headers + first ~40 lines for snippet and attachment check
      if (currentMsgLines.length < 80) {
        currentMsgLines.push(line);
      }
    }

    offset = chunkEnd;

    // Report progress periodically and yield main thread so UI stays responsive
    const now = Date.now();
    if (now - lastProgressUpdate > 150 || offset >= totalBytes) {
      lastProgressUpdate = now;
      if (onProgress) {
        onProgress({
          bytesProcessed: offset,
          totalBytes,
          percent: Math.min(100, Math.round((offset / totalBytes) * 100)),
          emailsFound: emailCount,
        });
      }
      // Yield to event loop
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // Handle final message in buffer
  if (currentMsgLines.length > 0 || lineBuffer) {
    if (lineBuffer && currentMsgLines.length < 80) {
      currentMsgLines.push(lineBuffer);
    }
    emailCount++;
    const msgText = currentMsgLines.join('\n');
    const email = processMessageBlock(msgText, emailCount, currentMsgStartByte, totalBytes);
    emails.push(email);
  }

  if (onProgress) {
    onProgress({
      bytesProcessed: totalBytes,
      totalBytes,
      percent: 100,
      emailsFound: emails.length,
    });
  }

  return emails;
}

/**
 * Retrieve the full body of a specific email on demand by slicing the File
 */
export async function getEmailFullBody(file: File, email: ParsedEmail): Promise<string> {
  try {
    // Read up to 256KB of the message to prevent freezing on 50MB attachments
    const sliceLength = Math.min(256 * 1024, Math.max(1024, email.endByte - email.startByte));
    const slice = file.slice(email.startByte, email.startByte + sliceLength);
    const text = await slice.text();

    const headerEndMatch = text.match(/\r?\n\r?\n/);
    if (!headerEndMatch || headerEndMatch.index === undefined) {
      return text;
    }

    const rawHeaders = text.slice(0, headerEndMatch.index);
    const rawBody = text.slice(headerEndMatch.index + headerEndMatch[0].length);
    const headers = parseHeaders(rawHeaders);
    const contentType = (headers['content-type'] || '').toLowerCase();
    const transferEncoding = (headers['content-transfer-encoding'] || '').toLowerCase();

    let body = rawBody;

    if (contentType.includes('multipart/')) {
      const boundaryMatch = contentType.match(/boundary="?([^";\r\n]+)"?/i);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const parts = rawBody.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

        let textPart = '';
        let htmlPart = '';

        for (const part of parts) {
          if (!part.trim() || part.trim() === '--') continue;
          const pMatch = part.match(/\r?\n\r?\n/);
          if (pMatch && pMatch.index !== undefined) {
            const pHeaders = part.slice(0, pMatch.index).toLowerCase();
            const pBody = part.slice(pMatch.index + pMatch[0].length);

            if (pHeaders.includes('text/plain') && !textPart) {
              textPart = pHeaders.includes('quoted-printable')
                ? decodeQuotedPrintable(pBody)
                : pBody;
            } else if (pHeaders.includes('text/html') && !htmlPart) {
              htmlPart = pHeaders.includes('quoted-printable')
                ? decodeQuotedPrintable(pBody)
                : pBody;
            }
          }
        }

        if (textPart) body = textPart;
        else if (htmlPart) body = stripHtml(htmlPart);
      }
    } else if (transferEncoding.includes('quoted-printable')) {
      body = decodeQuotedPrintable(body);
    } else if (transferEncoding.includes('base64')) {
      try {
        body = atob(body.replace(/\s/g, ''));
      } catch {
        // Keep raw
      }
    }

    if (contentType.includes('text/html')) {
      body = stripHtml(body);
    }

    return body.trim();
  } catch (err) {
    console.error('Failed to extract full body:', err);
    return email.bodySnippet || '(Unable to load full body)';
  }
}

/**
 * Convert parsed emails to RFC 4180 compliant CSV string
 */
export function emailsToCsv(emails: ParsedEmail[], selectedColumns: (keyof ParsedEmail)[]): string {
  const columnLabels: Record<string, string> = {
    id: 'ID',
    date: 'Date',
    from: 'From',
    to: 'To',
    cc: 'Cc',
    bcc: 'Bcc',
    subject: 'Subject',
    hasAttachments: 'Has Attachments',
    bodySnippet: 'Body Snippet',
    messageId: 'Message ID',
  };

  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = selectedColumns.map((col) => escapeCell(columnLabels[col] || col)).join(',');
  const dataRows = emails.map((email) => {
    return selectedColumns.map((col) => escapeCell(email[col])).join(',');
  });

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Convert parsed emails to Excel .xlsx Blob
 */
export function emailsToExcelBlob(emails: ParsedEmail[], selectedColumns: (keyof ParsedEmail)[]): Blob {
  const columnLabels: Record<string, string> = {
    id: 'ID',
    date: 'Date',
    from: 'From',
    to: 'To',
    cc: 'Cc',
    bcc: 'Bcc',
    subject: 'Subject',
    hasAttachments: 'Has Attachments',
    bodySnippet: 'Body Snippet',
    messageId: 'Message ID',
  };

  const rows = emails.map((email) => {
    const rowObj: Record<string, any> = {};
    for (const col of selectedColumns) {
      rowObj[columnLabels[col] || col] = email[col];
    }
    return rowObj;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = selectedColumns.map((col) => {
    if (col === 'subject') return { wch: 40 };
    if (col === 'from' || col === 'to') return { wch: 30 };
    if (col === 'date') return { wch: 25 };
    if (col === 'bodySnippet') return { wch: 45 };
    return { wch: 15 };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Emails');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
