import React, { useState, useMemo } from 'react';
import { BlogPost } from '../../types/blog';
import { Search, BookOpen, Clock, Calendar, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

interface BlogHubProps {
  posts: BlogPost[];
  onSelectPost: (slug: string) => void;
  onNavigateHome: () => void;
  onOpenToolModal?: (toolId: string) => void;
}

export const BlogHub: React.FC<BlogHubProps> = ({
  posts,
  onSelectPost,
  onNavigateHome,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    return [
      { id: 'all', label: 'All Articles' },
      { id: 'security', label: 'Security & Privacy' },
      { id: 'tutorials', label: 'How-To Guides' },
      { id: 'conversions', label: 'File Conversions' },
      { id: 'compliance', label: 'Compliance & Legal' },
      { id: 'tech', label: 'Engineering Architecture' },
    ];
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.keywords.some((k) => k.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  // Featured post (first post)
  const featuredPost = posts[0];

  return (
    <div className="space-y-10 animate-in fade-in duration-200">
      {/* Blog Hub Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
          <BookOpen className="w-3.5 h-3.5" />
          DocuZenith Knowledge Base & Tech Guides
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-950 leading-tight">
          Master Document Security,{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Privacy & Productivity
          </span>
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-2xl mx-auto">
          In-depth architectural analyses, workflow tutorials, and compliance strategies for handling PDFs and confidential documents 100% locally on your machine.
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative pt-2">
          <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides (e.g. merge, redaction, ocr, word, hipaa)..."
            className="w-full pl-11 pr-4 py-3 bg-white text-sm rounded-2xl border border-neutral-200 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-neutral-800 placeholder-neutral-400"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Article (When on 'all' and no active search) */}
      {!searchQuery && selectedCategory === 'all' && featuredPost && (
        <div
          onClick={() => onSelectPost(featuredPost.slug)}
          className="group relative bg-gradient-to-br from-neutral-900 via-neutral-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-neutral-800 overflow-hidden cursor-pointer hover:border-neutral-700 transition-all"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4 text-left">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Featured Guide
              </span>
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {featuredPost.readTimeMinutes} min read
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
              {featuredPost.title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {featuredPost.summary}
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-indigo-300 group-hover:translate-x-1 transition-transform">
              <span>Read Full Architectural Guide</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Post Grid */}
      <div className="space-y-4 text-left">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            <span>Showing {filteredPosts.length} Articles</span>
          </h2>
          <button
            onClick={onNavigateHome}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
          >
            ← Back to Tool Suite
          </button>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200 space-y-2">
            <p className="text-neutral-500 text-sm">No articles found matching "{searchQuery}".</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs text-indigo-600 font-semibold underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPosts.map((post) => (
              <article
                key={post.slug}
                onClick={() => onSelectPost(post.slug)}
                className="group flex flex-col justify-between bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer text-left"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="px-2 py-0.5 rounded-md font-medium bg-neutral-100 text-neutral-700">
                      {post.categoryLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTimeMinutes} min
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">
                    {post.summary}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-700 group-hover:text-indigo-600">
                  <span className="text-[11px] font-normal text-neutral-400">{post.publishedDate}</span>
                  <span className="flex items-center gap-1">
                    Read article <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
