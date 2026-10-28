import React, { useState, useEffect, useMemo } from 'react';
import { parseMbox, emailsToCsv, emailsToExcelBlob, ParsedEmail } from '../../lib/mboxEngine';
import { downloadBlob } from '../../lib/downloadHelper';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Mail,
  Paperclip,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Eye,
  X,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MboxWorkspaceProps {
  file?: File;
  arrayBuffer: ArrayBuffer;
  fileName: string;
}

const AVAILABLE_COLUMNS: { id: keyof ParsedEmail; label: string; defaultSelected: boolean }[] = [
  { id: 'id', label: 'ID', defaultSelected: true },
  { id: 'date', label: 'Date', defaultSelected: true },
  { id: 'from', label: 'From', defaultSelected: true },
  { id: 'to', label: 'To', defaultSelected: true },
  { id: 'subject', label: 'Subject', defaultSelected: true },
  { id: 'hasAttachments', label: 'Attachments', defaultSelected: true },
  { id: 'bodySnippet', label: 'Body Snippet', defaultSelected: true },
  { id: 'cc', label: 'Cc', defaultSelected: false },
  { id: 'bcc', label: 'Bcc', defaultSelected: false },
  { id: 'fullBody', label: 'Full Body Text', defaultSelected: false },
  { id: 'messageId', label: 'Message ID', defaultSelected: false },
];

export const MboxWorkspace: React.FC<MboxWorkspaceProps> = ({ arrayBuffer, fileName }) => {
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<ParsedEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCols, setSelectedCols] = useState<(keyof ParsedEmail)[]>(
    AVAILABLE_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id)
  );
  const [activePreviewEmail, setActivePreviewEmail] = useState<ParsedEmail | null>(null);
  const [showColOptions, setShowColOptions] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // Allow UI to render loading state first
    const timer = setTimeout(() => {
      try {
        const parsed = parseMbox(arrayBuffer);
        setEmails(parsed);
      } catch (err) {
        console.error('Failed to parse MBOX:', err);
      } finally {
        setLoading(false);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [arrayBuffer]);

  // Filtered emails based on search query
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails;
    const q = searchQuery.toLowerCase().trim();
    return emails.filter(
      (e) =>
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        e.to.toLowerCase().includes(q) ||
        e.bodySnippet.toLowerCase().includes(q) ||
        e.date.toLowerCase().includes(q)
    );
  }, [emails, searchQuery]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  // Paginated emails
  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmails.slice(start, start + pageSize);
  }, [filteredEmails, currentPage, pageSize]);

  // Stats
  const attachmentCount = useMemo(() => {
    return emails.filter((e) => e.hasAttachments === 'Yes').length;
  }, [emails]);

  const handleToggleCol = (colId: keyof ParsedEmail) => {
    setSelectedCols((prev) => {
      if (prev.includes(colId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((c) => c !== colId);
      }
      return [...prev, colId];
    });
  };

  const handleDownloadCsv = () => {
    if (emails.length === 0) return;
    const csvContent = emailsToCsv(filteredEmails, selectedCols);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const outputName = fileName.replace(/\.[^/.]+$/, '') + '_emails.csv';
    downloadBlob(blob, outputName);
    confetti({ particleCount: 75, spread: 70, origin: { y: 0.8 } });
    setDownloadSuccess('CSV Downloaded!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadExcel = () => {
    if (emails.length === 0) return;
    const xlsxBlob = emailsToExcelBlob(filteredEmails, selectedCols);
    const outputName = fileName.replace(/\.[^/.]+$/, '') + '_emails.xlsx';
    downloadBlob(xlsxBlob, outputName);
    confetti({ particleCount: 75, spread: 70, origin: { y: 0.8 } });
    setDownloadSuccess('Excel Downloaded!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Parsing MBOX File Locally</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            Scanning email headers, MIME boundaries, and message bodies in your browser RAM...
          </p>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 space-y-3">
        <Mail className="w-12 h-12 text-neutral-300 mx-auto" />
        <h3 className="text-base font-semibold text-neutral-800">No Emails Detected</h3>
        <p className="text-xs text-neutral-500 max-w-md mx-auto">
          The selected file could not be parsed as a standard MBOX mailbox archive. Please ensure this is a valid export from Google Takeout, Thunderbird, or Apple Mail.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-neutral-900 truncate">{fileName}</h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-800">{emails.length.toLocaleString()}</span> emails found
              <span>•</span>
              <span>{attachmentCount.toLocaleString()} with attachments</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium text-[10px]">
                <ShieldCheck className="w-3 h-3" /> 100% In-Memory
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowColOptions(!showColOptions)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Columns ({selectedCols.length})</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {downloadSuccess?.includes('CSV') ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export CSV (.csv)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {downloadSuccess?.includes('Excel') ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel (.xlsx)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Column Customizer Panel */}
      {showColOptions && (
        <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-xs space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between font-semibold text-neutral-800">
            <span>Select CSV & Excel Export Columns:</span>
            <button
              onClick={() => setShowColOptions(false)}
              className="text-neutral-400 hover:text-neutral-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {AVAILABLE_COLUMNS.map((col) => {
              const isChecked = selectedCols.includes(col.id);
              return (
                <label
                  key={col.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCol(col.id)}
                    className="hidden"
                  />
                  <span>{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search emails by sender, subject, recipient, date, or keywords..."
            className="w-full pl-10 pr-4 py-2.5 bg-white text-xs rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900 shadow-2xs"
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-neutral-500 whitespace-nowrap">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table Preview */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 min-w-[140px]">Date</th>
                <th className="py-3 px-3 min-w-[160px]">From</th>
                <th className="py-3 px-3 min-w-[220px]">Subject</th>
                <th className="py-3 px-3 w-20 text-center">Attach</th>
                <th className="py-3 px-3 min-w-[200px]">Snippet</th>
                <th className="py-3 px-3 w-16 text-center">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {paginatedEmails.map((email) => (
                <tr
                  key={email.id}
                  onClick={() => setActivePreviewEmail(email)}
                  className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-3 text-center text-neutral-400 font-mono text-[11px]">
                    {email.id}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-600 truncate max-w-[150px]">
                    {email.date || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-neutral-900 truncate max-w-[180px]">
                    {email.from}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-800 font-medium truncate max-w-[250px]">
                    {email.subject}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {email.hasAttachments === 'Yes' ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                        <Paperclip className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-500 truncate max-w-[220px]">
                    {email.bodySnippet || '(No content)'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      className="p-1 rounded-md text-neutral-400 group-hover:text-neutral-900 hover:bg-neutral-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-600">
          <span>
            Showing {Math.min(filteredEmails.length, (currentPage - 1) * pageSize + 1)}–
            {Math.min(filteredEmails.length, currentPage * pageSize)} of {filteredEmails.length.toLocaleString()}{' '}
            emails {searchQuery && `(filtered from ${emails.length.toLocaleString()})`}
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-neutral-800">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Email Detail Modal */}
      {activePreviewEmail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="min-w-0 pr-4">
                <h4 className="text-sm font-bold text-neutral-900 truncate">
                  {activePreviewEmail.subject}
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  From: {activePreviewEmail.from}
                </p>
              </div>
              <button
                onClick={() => setActivePreviewEmail(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <div>
                  <span className="font-semibold text-neutral-600">Date:</span>{' '}
                  <span className="text-neutral-900">{activePreviewEmail.date || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-neutral-600">Attachments:</span>{' '}
                  <span className="text-neutral-900">{activePreviewEmail.hasAttachments}</span>
                </div>
                {activePreviewEmail.to && (
                  <div className="sm:col-span-2 truncate">
                    <span className="font-semibold text-neutral-600">To:</span>{' '}
                    <span className="text-neutral-900">{activePreviewEmail.to}</span>
                  </div>
                )}
                {activePreviewEmail.cc && (
                  <div className="sm:col-span-2 truncate">
                    <span className="font-semibold text-neutral-600">Cc:</span>{' '}
                    <span className="text-neutral-900">{activePreviewEmail.cc}</span>
                  </div>
                )}
              </div>

              <div>
                <h5 className="font-semibold text-neutral-700 uppercase tracking-wider text-[10px] mb-2">
                  Message Body
                </h5>
                <pre className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 font-sans text-xs text-neutral-800 whitespace-pre-wrap break-words leading-relaxed max-h-96 overflow-y-auto">
                  {activePreviewEmail.fullBody || activePreviewEmail.bodySnippet || '(Empty body)'}
                </pre>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
              <button
                onClick={() => setActivePreviewEmail(null)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
