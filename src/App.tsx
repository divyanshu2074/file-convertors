import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { ToolCard } from './components/ToolCard';
import { OfflineCacheButton } from './components/OfflineCacheButton';
import { getLastServerUpdateTime } from './lib/offlineManager';
import { trackPageView, trackToolOpen } from './lib/analytics';
import { TOOLS, CATEGORIES } from './data/tools';
import { ToolDef } from './types';
import { ShieldCheck, Cpu, Zap, Lock, Sparkles, Wifi, WifiOff, Clock, User, BookOpen } from 'lucide-react';

const WorkspaceModal = lazy(() => import('./components/WorkspaceModal').then((m) => ({ default: m.WorkspaceModal })));
const ContactModal = lazy(() => import('./components/ContactModal').then((m) => ({ default: m.ContactModal })));
const BlogHub = lazy(() => import('./components/blog/BlogHub').then((m) => ({ default: m.BlogHub })));
const BlogPostView = lazy(() => import('./components/blog/BlogPostView').then((m) => ({ default: m.BlogPostView })));

export function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTool, setActiveTool] = useState<ToolDef | null>(null);
  const [showContact, setShowContact] = useState(false);

  // Router view state: 'tools' | 'blog' | 'blog-post'
  const [currentView, setCurrentView] = useState<'tools' | 'blog' | 'blog-post'>('tools');
  const [activeBlogSlug, setActiveBlogSlug] = useState<string | null>(null);

  // Online / Offline & Server update status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastServerUpdate, setLastServerUpdate] = useState('');

  // Handle client-side hash routing for zero-server SPA (#blog and #blog/:slug)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/blog/')) {
        const slug = hash.replace('#/blog/', '').trim();
        setActiveBlogSlug(slug);
        setCurrentView('blog-post');
      } else if (hash === '#/blog' || hash === '#blog') {
        setCurrentView('blog');
        setActiveBlogSlug(null);
      } else {
        setCurrentView('tools');
        setActiveBlogSlug(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToBlog = () => {
    window.location.hash = '#/blog';
  };

  const navigateToHome = () => {
    window.location.hash = '';
    setCurrentView('tools');
  };

  const navigateToPost = (slug: string) => {
    window.location.hash = `#/blog/${slug}`;
  };

  const handleOpenToolById = (toolId: string) => {
    if (toolId === 'all') {
      navigateToHome();
      return;
    }
    const found = TOOLS.find((t) => t.id === toolId);
    if (found) {
      handleSelectTool(found);
    } else {
      navigateToHome();
    }
  };

  useEffect(() => {
    setLastServerUpdate(getLastServerUpdateTime());

    // Track initial page visit
    trackPageView();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectTool = (tool: ToolDef) => {
    trackToolOpen(tool.id, tool.title);
    setActiveTool(tool);
  };

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
        currentView={currentView === 'tools' ? 'tools' : 'blog'}
        onNavigateBlog={navigateToBlog}
        onNavigateHome={navigateToHome}
        onOpenContact={() => setShowContact(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {currentView === 'blog' ? (
          <Suspense
            fallback={
              <div className="flex justify-center items-center py-24">
                <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <BlogHub
              onSelectPost={navigateToPost}
              onNavigateHome={navigateToHome}
              onOpenToolModal={handleOpenToolById}
            />
          </Suspense>
        ) : currentView === 'blog-post' ? (
          <Suspense
            fallback={
              <div className="flex justify-center items-center py-24">
                <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <BlogPostView
              slug={activeBlogSlug}
              onBackToBlog={navigateToBlog}
              onOpenToolModal={handleOpenToolById}
            />
          </Suspense>
        ) : (
          <>
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
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} onSelect={handleSelectTool} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Enhanced Footer with Status and Developer Information */}
      <footer className="border-t border-neutral-200 bg-white py-8 text-xs text-neutral-500 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-extrabold text-neutral-900">DocuZenith</span>
              <span>•</span>
              <span>The Peak of Secure In-Browser Document Productivity.</span>
              <span>•</span>
              <button
                onClick={navigateToBlog}
                className="text-indigo-600 hover:underline cursor-pointer font-medium"
              >
                SEO & Architecture Blog
              </button>
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
            </div>
          </div>
        </div>
      </footer>

      {/* Active Workspace Modal */}
      {activeTool && (
        <Suspense fallback={null}>
          <WorkspaceModal tool={activeTool} onClose={() => setActiveTool(null)} />
        </Suspense>
      )}

      {/* Contact Developer & Inquiries Modal */}
      {showContact && (
        <Suspense fallback={null}>
          <ContactModal onClose={() => setShowContact(false)} />
        </Suspense>
      )}
    </div>
  );
}

export default App;

