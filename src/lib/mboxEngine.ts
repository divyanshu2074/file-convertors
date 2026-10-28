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
        // Quoted-Printable within MIME word
        const unescaped = text.replace(/_/g, ' ');
        const bytes: number[] = [];
        for (let i = 0; i < unescaped.length; i++) {
          if (unescaped[i] === '=' && i + 2 < unescaped.length) {
            const hex = unescaped.slice(i + 1, i + 3);
            if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
              bytes.push(parseInt(hex, 16));
              i += 2;
              continue;
            }
          }
          bytes.push(unescaped.charCodeAt(i));
        }
        return new TextDecoder(charset).decode(new Uint8Array(bytes));
      }
    } catch {
      return text;
    }
    return text;
  });
}

/**
 * Decode Quoted-Printable transfer encoding with UTF-8 multibyte safety
 */
export function decodeQuotedPrintable(input: string): string {
  if (!input) return '';
  // Remove soft line breaks: =\r\n or =\n
  const withoutSoftBreaks = input.replace(/=\r?\n/g, '');
  const bytes: number[] = [];

  for (let i = 0; i < withoutSoftBreaks.length; i++) {
    const char = withoutSoftBreaks[i];
    if (char === '=' && i + 2 < withoutSoftBreaks.length) {
      const hex = withoutSoftBreaks.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(withoutSoftBreaks.charCodeAt(i));
  }

  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  } catch {
    return withoutSoftBreaks;
  }
}

/**
 * Clean up HTML tags, CSS blocks, and HTML entities to extract legible plain text
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/@import\s+url\([^)]+\);?/gi, ' ')
    .replace(/body\s*\{[^}]*\}/gi, ' ')
    .replace(/\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean up redundant double quotes around email display names
 */
export function cleanAddress(str: string): string {
  if (!str) return '';
  // Normalize multiple consecutive quotes e.g. ""Name"" -> Name
  let cleaned = str.replace(/"+/g, '"').trim();
  cleaned = cleaned.replace(/^"([^"]+)"\s*(<[^>]+>)/, '$1 $2');
  return cleaned;
}

/**
 * Detect attachments from headers and raw message content
 */
export function detectHasAttachments(rawHeaders: string, rawBody: string): string {
  const combined = (rawHeaders + '\n' + rawBody.slice(0, 8192)).toLowerCase();
  const hasAttachment =
    combined.includes('content-disposition: attachment') ||
    combined.includes('content-disposition: inline; filename=') ||
    /filename\s*=\s*"?[^"\r\n]+\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|png|jpe?g|gif|webp|csv|txt)"?/i.test(combined) ||
    /name\s*=\s*"?[^"\r\n]+\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|png|jpe?g|gif|webp|csv|txt)"?/i.test(combined) ||
    combined.includes('application/pdf') ||
    combined.includes('application/zip') ||
    combined.includes('application/octet-stream') ||
    combined.includes('application/vnd.openxmlformats') ||
    combined.includes('application/msword');

  return hasAttachment ? 'Yes' : 'No';
}

/**
 * Parse headers from an email header block into an object
 */
function parseHeaders(rawHeaders: string): Record<string, string> {
  // Unfold multi-line headers (RFC 2822: lines starting with space or tab continue the previous header)
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
 * Extract clean, human-readable text from an email body without any MIME boundaries, headers, or Base64 garbage
 */
export function extractCleanBody(rawBody: string, mainContentType: string, mainTransferEncoding: string): string {
  if (!rawBody) return '';

  // 1. Look for text/plain part in multipart messages
  const plainMatch = rawBody.match(/Content-Type:\s*text\/plain[^\r\n]*([\s\S]*?)(?=\r?\n--|\r?\nFrom\s+|$)/i);
  if (plainMatch) {
    const block = plainMatch[1];
    const headerEnd = block.match(/\r?\n\r?\n/);
    if (headerEnd && headerEnd.index !== undefined) {
      const partHeaders = block.slice(0, headerEnd.index).toLowerCase();
      let partContent = block.slice(headerEnd.index + headerEnd[0].length);
      partContent = partContent.split(/\r?\n--/)[0];

      if (partHeaders.includes('quoted-printable') || mainTransferEncoding.includes('quoted-printable')) {
        partContent = decodeQuotedPrintable(partContent);
      } else if (partHeaders.includes('base64') || mainTransferEncoding.includes('base64')) {
        try {
          partContent = atob(partContent.replace(/[\s\r\n]/g, ''));
        } catch {
          // ignore
        }
      }
      const clean = partContent.replace(/\r?\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      if (clean.length > 0) return clean;
    }
  }

  // 2. Look for text/html part
  const htmlMatch = rawBody.match(/Content-Type:\s*text\/html[^\r\n]*([\s\S]*?)(?=\r?\n--|\r?\nFrom\s+|$)/i);
  if (htmlMatch) {
    const block = htmlMatch[1];
    const headerEnd = block.match(/\r?\n\r?\n/);
    if (headerEnd && headerEnd.index !== undefined) {
      const partHeaders = block.slice(0, headerEnd.index).toLowerCase();
      let partContent = block.slice(headerEnd.index + headerEnd[0].length);
      partContent = partContent.split(/\r?\n--/)[0];

      if (partHeaders.includes('base64') || mainTransferEncoding.includes('base64')) {
        try {
          partContent = atob(partContent.replace(/[\s\r\n]/g, ''));
        } catch {
          // ignore
        }
      } else if (partHeaders.includes('quoted-printable') || mainTransferEncoding.includes('quoted-printable')) {
        partContent = decodeQuotedPrintable(partContent);
      }
      const clean = stripHtml(partContent);
      if (clean.length > 0) return clean;
    }
  }

  // 3. Simple body fallback: strip boundary lines and headers
  let fallback = rawBody;
  if (fallback.includes('--')) {
    fallback = fallback
      .replace(/^--[A-Za-z0-9=_+-]+.*$/gm, '')
      .replace(/^(?:Content-Type|Content-Transfer-Encoding|Content-Disposition|MIME-Version):.*$/gmi, '');
  }

  if (mainTransferEncoding.includes('quoted-printable')) {
    fallback = decodeQuotedPrintable(fallback);
  } else if (mainTransferEncoding.includes('base64')) {
    try {
      fallback = atob(fallback.replace(/[\s\r\n]/g, ''));
    } catch {
      // ignore
    }
  }

  if (mainContentType.includes('text/html') || fallback.includes('<html') || fallback.includes('<div') || fallback.includes('<p>')) {
    fallback = stripHtml(fallback);
  }

  return fallback.replace(/\r?\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Validate whether a line is an authentic MBOX message separator
 */
function isMboxSeparatorLine(line: string, prevLineWasEmpty: boolean, isStartOfFile: boolean): boolean {
  if (!line.startsWith('From ')) return false;
  // In MBOX standard, every From_ line must be preceded by a blank line or start of file
  if (!prevLineWasEmpty && !isStartOfFile) return false;

  // Must have a sender token and a timestamp or dash e.g.:
  // "From 1792401739270@xxx Tue Oct 27 07:17:13 2026"
  // "From ???@??? Tue Oct 27 07:17:13 2026"
  // "From MAILER-DAEMON Mon Jan 01 00:00:00 2001"
  // "From - Mon Jan 01 00:00:00 2001"
  // "From user@example.com Wed Jun 24 13:56:32 2026"
  return (
    /^From\s+[^\s\r\n]+(?:\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b|\s+.*?\d{4})/i.test(line) ||
    /^From\s+-\s+/i.test(line)
  );
}

/**
 * Process a single raw message block into a clean ParsedEmail object.
 * Returns null if the block is not a valid email (e.g. spurious ghost split).
 */
function processMessageBlock(
  messageText: string,
  index: number,
  startByte: number,
  endByte: number
): ParsedEmail | null {
  if (!messageText || messageText.length < 15) return null;

  const headerEndMatch = messageText.match(/\r?\n\r?\n/);
  let rawHeaders = '';
  let rawBody = '';

  if (headerEndMatch && headerEndMatch.index !== undefined) {
    rawHeaders = messageText.slice(0, headerEndMatch.index);
    rawBody = messageText.slice(headerEndMatch.index + headerEndMatch[0].length);
  } else {
    rawHeaders = messageText;
  }

  const headers = parseHeaders(rawHeaders);

  // Validate that this block actually has standard email headers
  const hasDateHeader = !!headers['date'];
  const hasFromHeader = !!headers['from'];
  const hasSubjectHeader = !!headers['subject'];
  const hasMessageId = !!headers['message-id'];
  const hasToHeader = !!headers['to'];

  // GHOST ROW FILTER: If a block has NO date, NO from, NO subject, and NO message-id,
  // it is simply plain text or body lines that contained "From ", NOT an email!
  if (!hasDateHeader && !hasFromHeader && !hasSubjectHeader && !hasMessageId && !hasToHeader) {
    return null;
  }

  const contentType = (headers['content-type'] || '').toLowerCase();
  const transferEncoding = (headers['content-transfer-encoding'] || '').toLowerCase();

  const subject = decodeMimeWords(headers['subject'] || '(No Subject)');
  const from = cleanAddress(decodeMimeWords(headers['from'] || '(Unknown Sender)'));
  const to = cleanAddress(decodeMimeWords(headers['to'] || ''));
  const cc = cleanAddress(decodeMimeWords(headers['cc'] || ''));
  const bcc = cleanAddress(decodeMimeWords(headers['bcc'] || ''));
  const dateRaw = headers['date'] || '';
  const messageId = headers['message-id'] || '';

  // If both from and subject are default unknown/empty, and date is empty, skip ghost
  if (from === '(Unknown Sender)' && subject === '(No Subject)' && !dateRaw) {
    return null;
  }

  const hasAttachments = detectHasAttachments(rawHeaders, rawBody);

  // Clean body snippet: extract real text, strip boundaries, CSS, and base64
  const cleanBodyText = extractCleanBody(rawBody, contentType, transferEncoding);
  const snippet = cleanBodyText.replace(/\s+/g, ' ').trim().slice(0, 250);

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
  let isStartOfFile = true;
  let prevLineWasEmpty = true;
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
      const lineEmpty = line.trim().length === 0;

      // Check if line is a genuine MBOX message separator
      if (isMboxSeparatorLine(line, prevLineWasEmpty, isStartOfFile)) {
        if (currentMsgLines.length > 0) {
          const msgText = currentMsgLines.join('\n');
          const msgEndByte = offset + (i * 25);
          const email = processMessageBlock(msgText, emails.length + 1, currentMsgStartByte, msgEndByte);
          if (email) {
            emails.push(email);
          }
          currentMsgLines = [];
          currentMsgStartByte = msgEndByte;
        }
      }

      // Buffer lines for the message:
      // We need headers + first ~200 lines for clean snippet and attachment detection
      if (currentMsgLines.length < 200) {
        currentMsgLines.push(line);
      }

      prevLineWasEmpty = lineEmpty;
      isStartOfFile = false;
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
          emailsFound: emails.length,
        });
      }
      // Yield to event loop
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // Handle final message in buffer
  if (lineBuffer && currentMsgLines.length < 200) {
    currentMsgLines.push(lineBuffer);
  }

  if (currentMsgLines.length > 0) {
    const msgText = currentMsgLines.join('\n');
    const email = processMessageBlock(msgText, emails.length + 1, currentMsgStartByte, totalBytes);
    if (email) {
      emails.push(email);
    }
  }

  // Re-number IDs sequentially 1..N to guarantee strict ordering
  for (let i = 0; i < emails.length; i++) {
    emails[i].id = i + 1;
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
    // Read up to 512KB of the message to prevent freezing on 50MB attachments
    const sliceLength = Math.min(512 * 1024, Math.max(1024, email.endByte - email.startByte));
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

    return extractCleanBody(rawBody, contentType, transferEncoding);
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
