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
  fullBody: string;
}

/**
 * Decode RFC 2047 MIME encoded-words e.g. =?UTF-8?B?....?= or =?UTF-8?Q?....?=
 */
export function decodeMimeWords(str: string): string {
  if (!str) return '';
  return str.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, charset, encoding, text) => {
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
        const unescaped = text.replace(/_/g, ' ').replace(/=([A-Fa-f0-9]{2})/g, (_: string, hex: string) => {
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
  // Soft line breaks =\r\n or =\n
  const clean = input.replace(/=\r?\n/g, '');
  // Hex byte decode
  return clean.replace(/=([A-Fa-f0-9]{2})/g, (_: string, hex: string) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return _;
    }
  });
}

/**
 * Clean up HTML tags and entities to extract legible text
 */
function stripHtml(html: string): string {
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
 * Parse an MBOX string or buffer into structured email objects
 */
export function parseMbox(rawContent: string | ArrayBuffer): ParsedEmail[] {
  let text = '';
  if (typeof rawContent === 'string') {
    text = rawContent;
  } else {
    text = new TextDecoder('utf-8', { fatal: false }).decode(rawContent);
  }

  if (!text || !text.trim()) {
    return [];
  }

  // Split messages by MBOX separator line: "\nFrom " or beginning of file "From "
  // Handle both CRLF and LF
  const rawMessages: string[] = [];
  const lines = text.split(/\r?\n/);
  let currentMsgLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('From ') && (i === 0 || lines[i - 1] === '' || currentMsgLines.length > 5)) {
      if (currentMsgLines.length > 0) {
        rawMessages.push(currentMsgLines.join('\n'));
        currentMsgLines = [];
      }
    }
    currentMsgLines.push(line);
  }

  if (currentMsgLines.length > 0) {
    rawMessages.push(currentMsgLines.join('\n'));
  }

  const emails: ParsedEmail[] = [];

  for (let i = 0; i < rawMessages.length; i++) {
    const raw = rawMessages[i];
    if (!raw.trim()) continue;

    // Find the blank line separating headers from body
    const headerEndMatch = raw.match(/\r?\n\r?\n/);
    let rawHeaders = '';
    let rawBody = '';

    if (headerEndMatch && headerEndMatch.index !== undefined) {
      rawHeaders = raw.slice(0, headerEndMatch.index);
      rawBody = raw.slice(headerEndMatch.index + headerEndMatch[0].length);
    } else {
      rawHeaders = raw;
    }

    // Unfold multi-line headers (RFC 2822 / 5322: headers starting with whitespace continue previous line)
    const unfoldedHeaders = rawHeaders.replace(/\r?\n[ \t]+/g, ' ');
    const headerLines = unfoldedHeaders.split(/\r?\n/);
    const headers: Record<string, string> = {};

    for (const hLine of headerLines) {
      const colonIdx = hLine.indexOf(':');
      if (colonIdx > 0) {
        const key = hLine.slice(0, colonIdx).trim().toLowerCase();
        const value = hLine.slice(colonIdx + 1).trim();
        if (!headers[key]) {
          headers[key] = value;
        } else {
          // If already exists (e.g. Received, To), append with comma
          headers[key] += ', ' + value;
        }
      }
    }

    const contentType = headers['content-type'] || '';
    const transferEncoding = (headers['content-transfer-encoding'] || '').toLowerCase();

    // Decode subjects and addresses
    const subject = decodeMimeWords(headers['subject'] || '(No Subject)');
    const from = decodeMimeWords(headers['from'] || '(Unknown Sender)');
    const to = decodeMimeWords(headers['to'] || '');
    const cc = decodeMimeWords(headers['cc'] || '');
    const bcc = decodeMimeWords(headers['bcc'] || '');
    const dateRaw = headers['date'] || '';
    const messageId = headers['message-id'] || '';

    // Check attachments
    const hasAttachments =
      /content-disposition:\s*attachment/i.test(raw) ||
      /filename=/i.test(raw) ||
      /name="?[^"\r\n]+\.(pdf|docx?|xlsx?|zip|png|jpe?g|csv|txt)"?/i.test(contentType) ||
      /name="?[^"\r\n]+\.(pdf|docx?|xlsx?|zip|png|jpe?g|csv|txt)"?/i.test(raw)
        ? 'Yes'
        : 'No';

    // Parse Body
    let cleanBody = '';

    if (contentType.includes('multipart/')) {
      // Find boundary
      const boundaryMatch = contentType.match(/boundary="?([^";\r\n]+)"?/i);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const parts = rawBody.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

        // Look for plain text part first, then html
        let textPart = '';
        let htmlPart = '';

        for (const part of parts) {
          if (!part.trim() || part.trim() === '--') continue;
          const partHeaderEnd = part.match(/\r?\n\r?\n/);
          if (partHeaderEnd && partHeaderEnd.index !== undefined) {
            const pHeaders = part.slice(0, partHeaderEnd.index).toLowerCase();
            const pBody = part.slice(partHeaderEnd.index + partHeaderEnd[0].length);

            if (pHeaders.includes('text/plain') && !textPart) {
              if (pHeaders.includes('quoted-printable')) {
                textPart = decodeQuotedPrintable(pBody);
              } else if (pHeaders.includes('base64')) {
                try {
                  textPart = atob(pBody.replace(/\s/g, ''));
                } catch {
                  textPart = pBody;
                }
              } else {
                textPart = pBody;
              }
            } else if (pHeaders.includes('text/html') && !htmlPart) {
              if (pHeaders.includes('quoted-printable')) {
                htmlPart = decodeQuotedPrintable(pBody);
              } else if (pHeaders.includes('base64')) {
                try {
                  htmlPart = atob(pBody.replace(/\s/g, ''));
                } catch {
                  htmlPart = pBody;
                }
              } else {
                htmlPart = pBody;
              }
            }
          }
        }

        if (textPart) {
          cleanBody = textPart;
        } else if (htmlPart) {
          cleanBody = stripHtml(htmlPart);
        } else {
          cleanBody = stripHtml(rawBody.slice(0, 2000));
        }
      } else {
        cleanBody = stripHtml(rawBody.slice(0, 2000));
      }
    } else if (transferEncoding.includes('quoted-printable')) {
      const decoded = decodeQuotedPrintable(rawBody);
      cleanBody = contentType.includes('text/html') ? stripHtml(decoded) : decoded;
    } else if (transferEncoding.includes('base64')) {
      try {
        const decoded = atob(rawBody.replace(/\s/g, ''));
        cleanBody = contentType.includes('text/html') ? stripHtml(decoded) : decoded;
      } catch {
        cleanBody = rawBody;
      }
    } else if (contentType.includes('text/html')) {
      cleanBody = stripHtml(rawBody);
    } else {
      cleanBody = rawBody;
    }

    // Clean up excessive whitespace in cleanBody
    cleanBody = cleanBody.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const bodySnippet = cleanBody.slice(0, 250).replace(/\s+/g, ' ').trim();

    emails.push({
      id: i + 1,
      date: dateRaw,
      from,
      to,
      cc,
      bcc,
      subject,
      messageId,
      hasAttachments,
      bodySnippet,
      fullBody: cleanBody,
    });
  }

  return emails;
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
    fullBody: 'Full Body Text',
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
    fullBody: 'Full Body Text',
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

  // Set nice column widths
  const colWidths = selectedColumns.map((col) => {
    if (col === 'subject') return { wch: 40 };
    if (col === 'from' || col === 'to') return { wch: 30 };
    if (col === 'date') return { wch: 25 };
    if (col === 'bodySnippet') return { wch: 45 };
    if (col === 'fullBody') return { wch: 60 };
    return { wch: 15 };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Emails');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
