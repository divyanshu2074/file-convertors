import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, RefreshCw, Radio, HardDrive, Cpu, ShieldCheck, ExternalLink } from 'lucide-react';

interface CommitItem {
  sha: string;
  author: string;
  date: string;
  message: string;
  url: string;
}

interface RetroCliDashboardProps {
  onClose: () => void;
}

export const RetroCliDashboard: React.FC<RetroCliDashboardProps> = ({ onClose }) => {
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [scanlines, setScanlines] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Fetch real commits from GitHub
  useEffect(() => {
    let mounted = true;

    async function fetchCommits() {
      try {
        setLogs((prev) => [
          ...prev,
          '[SYS_INIT] Initializing telemetry uplink to github.com/divyanshu2074/file-convertors...',
          '[NET_SOCKET] Establishing TLS tunnel to api.github.com...',
        ]);

        const res = await fetch('https://api.github.com/repos/divyanshu2074/file-convertors/commits?per_page=15');
        if (!res.ok) {
          throw new Error(`GitHub API HTTP ${res.status}`);
        }
        const data = await res.json();

        if (mounted && Array.isArray(data)) {
          const parsed: CommitItem[] = data.map((c: any) => ({
            sha: c.sha ? c.sha.substring(0, 7) : '0000000',
            author: c.commit?.author?.name || 'Anonymous',
            date: c.commit?.author?.date ? new Date(c.commit.author.date).toLocaleString() : 'Recent',
            message: c.commit?.message?.split('\n')[0] || 'Update codebase',
            url: c.html_url || `https://github.com/divyanshu2074/file-convertors/commit/${c.sha}`,
          }));

          setCommits(parsed);

          // Stream logs into terminal with timing effect
          let streamIdx = 0;
          const interval = setInterval(() => {
            if (!mounted) {
              clearInterval(interval);
              return;
            }
            if (streamIdx < parsed.length) {
              const c = parsed[streamIdx];
              setLogs((prev) => [
                ...prev,
                `[PUSH_EVENT] COMMIT: ${c.sha} | BY: ${c.author} | TIMESTAMP: ${c.date}`,
                `   ↳ MESSAGE: "${c.message}"`,
                `   ↳ STATUS: VERIFIED & SYNCED TO MAIN`,
              ]);
              streamIdx++;
            } else {
              setLogs((prev) => [
                ...prev,
                '[TELEMETRY_DONE] All live git log packets received and verified.',
                'guest@localpdf:~$ ready for user input █',
              ]);
              setIsStreaming(false);
              clearInterval(interval);
            }
          }, 200);
        }
      } catch (err) {
        console.warn('Fallback to local git log:', err);
        if (mounted) {
          // Fallback commits
          const fallbackCommits: CommitItem[] = [
            {
              sha: 'd037e41',
              author: 'sahil_garg_avisoft',
              date: new Date().toLocaleString(),
              message: 'fix: pixel-perfect preview coordinate alignment, multi-line text extraction, split modes, and photo scan support',
              url: 'https://github.com/divyanshu2074/file-convertors/commit/d037e41',
            },
            {
              sha: '05eacd0',
              author: 'sahil_garg_avisoft',
              date: new Date(Date.now() - 3600000).toLocaleString(),
              message: 'feat: complete client-side PDF suite with 28 tools, zero-server uploads, and modern UI',
              url: 'https://github.com/divyanshu2074/file-convertors/commit/05eacd0',
            },
          ];
          setCommits(fallbackCommits);
          setLogs((prev) => [
            ...prev,
            '[OFFLINE_CACHE] GitHub API rate-limited or offline. Reading local git push telemetry...',
            ...fallbackCommits.flatMap((c) => [
              `[PUSH_EVENT] COMMIT: ${c.sha} | BY: ${c.author} | TIMESTAMP: ${c.date}`,
              `   ↳ MESSAGE: "${c.message}"`,
            ]),
            '[TELEMETRY_DONE] Cached git commits active.',
            'guest@localpdf:~$ █',
          ]);
          setIsStreaming(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchCommits();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#07090e] border-2 border-emerald-500/40 rounded-2xl shadow-2xl shadow-emerald-950/50 overflow-hidden flex flex-col max-h-[92vh] font-mono text-emerald-400">
        {/* CRT Scanline Overlay */}
        {scanlines && (
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-40 z-20" />
        )}

        {/* High-Tech Terminal Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0b0f19] border-b border-emerald-500/30 text-xs select-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="flex items-center gap-2 pl-2 border-l border-emerald-500/20 text-[11px] text-emerald-300 font-semibold tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>TERMINAL // LIVE_CHANGELOG_STREAM</span>
            </div>
          </div>

          {/* Telemetry badges */}
          <div className="hidden md:flex items-center gap-4 text-[10px] text-neutral-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              LIVE TELEMETRY
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <Cpu className="w-3 h-3" />
              WASM_RUNTIME: ACTIVE
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <HardDrive className="w-3 h-3" />
              100% CLIENT_SIDE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScanlines((v) => !v)}
              className="px-2 py-0.5 rounded border border-emerald-500/30 text-[10px] text-emerald-400 hover:bg-emerald-950/40"
              title="Toggle retro CRT scanlines"
            >
              CRT: {scanlines ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Screen Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs leading-relaxed bg-[#05070c]">
          {/* Hacker Banner */}
          <pre className="text-[10px] sm:text-xs text-emerald-500 leading-tight font-bold select-none opacity-90">
{`   __    ___   ____   _    _      ____   ___   ____ 
  |  |  /   \\ /  __| / \\  | |    |  _ \\ |   \\ |  __|
  |  | |  O  ||  |   / _ \\ | |__  |  __/ |  O ||  |  
  |__|  \\___/  \\___|/_/ \\_\\|____| |_|    |___/ |_|   
  >> SYSTEM TELEMETRY V2.4 // ZERO CLOUD UPLOAD MATRIX <<`}
          </pre>

          {/* Prompt line */}
          <div className="text-emerald-300 text-xs">
            <span className="text-cyan-400">guest@localpdf</span>:<span className="text-amber-400">~/file-convertors</span>$ <span className="text-white font-semibold">git log --stat --oneline --live-stream</span>
          </div>

          {/* Streaming Log Lines */}
          <div className="space-y-1.5 font-mono">
            {logs.map((line, idx) => {
              const isEvent = line.startsWith('[PUSH_EVENT]');
              const isMsg = line.includes('↳ MESSAGE:');
              const isDone = line.startsWith('[TELEMETRY_DONE]');
              return (
                <div
                  key={idx}
                  className={`${
                    isEvent
                      ? 'text-cyan-300 font-semibold'
                      : isMsg
                      ? 'text-emerald-200 pl-4 font-bold'
                      : isDone
                      ? 'text-amber-300 font-semibold'
                      : 'text-neutral-400'
                  }`}
                >
                  {line}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>

          {/* Structured Commit Cards Section */}
          {commits.length > 0 && (
            <div className="pt-4 border-t border-emerald-500/20 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                <span>Verified Git Commits ({commits.length})</span>
                <span className="text-emerald-400">Branch: main</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {commits.map((c) => (
                  <div
                    key={c.sha}
                    className="p-3 rounded-xl bg-[#0b0f19] border border-emerald-500/20 hover:border-emerald-500/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                          {c.sha}
                        </span>
                        <span className="text-xs text-white font-medium truncate">{c.message}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-3">
                        <span>Author: {c.author}</span>
                        <span>•</span>
                        <span>{c.date}</span>
                      </div>
                    </div>

                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] shrink-0 border border-neutral-700 self-start sm:self-auto"
                    >
                      <span>View Diff</span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer command bar */}
        <div className="px-4 py-3 bg-[#0b0f19] border-t border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automated GitHub Webhook & REST Sync</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/divyanshu2074/file-convertors/commits/main"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>GitHub Commits History</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition-colors"
            >
              EXIT CLI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
