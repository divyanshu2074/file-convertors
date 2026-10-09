import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { ToolCard } from './components/ToolCard';
import { WorkspaceModal } from './components/WorkspaceModal';
import { RetroCliDashboard } from './components/RetroCliDashboard';
import { OfflineCacheButton } from './components/OfflineCacheButton';
import { ContactModal } from './components/ContactModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { getLastServerUpdateTime } from './lib/offlineManager';
import { TOOLS, CATEGORIES } from './data/tools';
import { ToolDef } from './types';
import { ShieldCheck, Cpu, Zap, Lock, Sparkles, Terminal, Wifi, WifiOff, Clock, User } from 'lucide-react';

export function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTool, setActiveTool] = useState<ToolDef | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Online / Offline & Server update status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastServerUpdate, setLastServerUpdate] = useState('');

  useEffect(() => {
    setLastServerUpdate(getLastServerUpdateTime());

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter tools based on category and search query
  const filteredTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tool.title.toLowerCase().includes(q) ||
        tool.shortDesc.toLowerCase().includes(q) ||
        tool.id.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={CATEGORIES}
        onOpenChangelog={() => setShowChangelog(true)}
        onOpenContact={() => setShowContact(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* Minimal Hero */}
        {!searchQuery && selectedCategory === 'all' && (
          <div className="text-center space-y-4 max-w-2xl mx-auto pt-4 pb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              100% In-Browser Document Processing
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-950 leading-tight">
              Every PDF tool you need.{' '}
              <span className="text-neutral-400 font-normal">Zero server uploads.</span>
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-xl mx-auto">
              Merge, edit, split, convert, sign, and redact documents directly on your machine. Fast, private, and secure.
            </p>

            {/* Privacy Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" /> Complete Data Privacy
              </span>
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" /> WebAssembly & Web Workers
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Instant In-Memory Speeds
              </span>
            </div>
          </div>
        )}

        {/* Offline Cache Banner */}
        <OfflineCacheButton variant="full" />

        {/* Tools Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">
            <span>
              Available Tools ({filteredTools.length} of {TOOLS.length})
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-neutral-700 hover:text-neutral-950 underline cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>

          {filteredTools.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-neutral-200/80 p-8 space-y-3">
              <p className="text-sm font-semibold text-neutral-800">No matching tools found for "{searchQuery}"</p>
              <p className="text-xs text-neutral-500">Try searching for "word", "merge", "sign", or clear filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onSelect={(t) => setActiveTool(t)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Enhanced Footer with Status and Developer Information */}
      <footer className="border-t border-neutral-200 bg-white py-8 text-xs text-neutral-500 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-neutral-800">LocalPDF</span>
              <span>•</span>
              <span>All document operations run 100% locally in your web browser.</span>
            </div>

            {/* Live Status Indicators */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Online / Offline Cache Source Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
                title={
                  isOnline
                    ? 'Page is connected to network (loaded directly or verified against server)'
                    : 'Page is operating completely offline from browser local cache'
                }
              >
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Status: Online (Connected to Server)</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    <span>Status: Offline (Loaded from Cache)</span>
                  </>
                )}
              </div>

              {/* Last Server Update Timestamp */}
              {lastServerUpdate && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-neutral-100 text-neutral-700 border border-neutral-200"
                  title="Date and time when the application assets were last updated from the server"
                >
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Last Server Update: {lastServerUpdate}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-400">
            <div className="flex items-center gap-2">
              <span>Developer: <strong>Divyanshu Gupta</strong></span>
              <span>•</span>
              <button
                onClick={() => setShowContact(true)}
                className="text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
              >
                Contact & Raise Queries
              </button>
              <span>•</span>
              <a
                href="https://www.linkedin.com/in/divyanshu-gupta-dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                LinkedIn
              </a>
              <span>•</span>
              <button
                onClick={() => setShowAdmin(true)}
                className="text-neutral-600 hover:text-indigo-600 cursor-pointer"
              >
                Admin Desk
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowChangelog(true)}
                className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Changelog (CLI Stream)</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Active Workspace Modal */}
      {activeTool && <WorkspaceModal tool={activeTool} onClose={() => setActiveTool(null)} />}

      {/* Retro CLI Live Changelog Dashboard Modal */}
      {showChangelog && <RetroCliDashboard onClose={() => setShowChangelog(false)} />}

      {/* Contact Developer & Inquiries Modal */}
      {showContact && (
        <ContactModal
          onClose={() => setShowContact(false)}
          onOpenAdmin={() => {
            setShowContact(false);
            setShowAdmin(true);
          }}
        />
      )}

      {/* Admin Resolution Panel Modal */}
      {showAdmin && <AdminPanelModal onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

export default App;

