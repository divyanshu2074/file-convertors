import React from 'react';
import { ShieldCheck, Search, Zap, FileSpreadsheet } from 'lucide-react';
import { OfflineCacheButton } from './OfflineCacheButton';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: any) => void;
  categories: readonly { id: string; label: string }[];
  onOpenChangelog?: () => void;
  onOpenContact?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  onOpenChangelog,
  onOpenContact,
}) => {
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-neutral-900">LocalPDF</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Client-Side
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 hidden sm:block">Zero Server Uploads • Private & Fast</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search all 28 tools (e.g. merge, word, sign, ocr, split)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100/80 hover:bg-neutral-100 focus:bg-white text-sm rounded-xl border border-transparent focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all text-neutral-800 placeholder-neutral-400"
            />
          </div>

          {/* Right Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Offline Cache: Hidden on mobile header to prevent crowding */}
            <div className="hidden sm:block">
              <OfflineCacheButton variant="compact" />
            </div>

            {onOpenContact && (
              <button
                onClick={onOpenContact}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors border border-neutral-200 cursor-pointer"
                title="Contact Developer & Support"
              >
                <span>Contact</span>
              </button>
            )}

            {onOpenChangelog && (
              <button
                onClick={onOpenChangelog}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200/60 cursor-pointer"
                title="Open live retro CLI changelog"
              >
                <span>CLI_LOG</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search */}
        <div className="py-2 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 text-sm rounded-xl border border-transparent focus:outline-none focus:bg-white text-neutral-800"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar text-xs -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
