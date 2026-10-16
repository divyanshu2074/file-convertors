import React, { useEffect } from 'react';
import { BlogPost } from '../../types/blog';
import { BLOG_POSTS } from '../../data/blogs';
import { ArrowLeft, Clock, Calendar, User, ShieldCheck, Zap, ArrowRight, Share2, Check } from 'lucide-react';

interface BlogPostViewProps {
  post?: BlogPost | null;
  slug?: string | null;
  onBackToBlog: () => void;
  onOpenToolModal?: (toolId: string) => void;
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({
  post: propPost,
  slug,
  onBackToBlog,
  onOpenToolModal,
}) => {
  const [copied, setCopied] = React.useState(false);

  const post = React.useMemo(() => {
    if (propPost) return propPost;
    if (slug) return BLOG_POSTS.find((p) => p.slug === slug) || null;
    return null;
  }, [propPost, slug]);

  if (!post) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200 p-8 space-y-4">
        <h2 className="text-xl font-bold text-neutral-900">Article Not Found</h2>
        <p className="text-sm text-neutral-500">The requested article could not be located.</p>
        <button
          onClick={onBackToBlog}
          className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Return to Blog Hub
        </button>
      </div>
    );
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Inject dynamic JSON-LD article schema for rich SEO snippets
    const scriptId = 'json-ld-article-schema';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.metaDescription,
      author: {
        '@type': 'Person',
        name: post.author,
      },
      publisher: {
        '@type': 'Organization',
        name: 'DocuZenith',
        logo: {
          '@type': 'ImageObject',
          url: 'https://divyanshu2074.github.io/file-convertors/favicon.svg',
        },
      },
      datePublished: post.publishedDate,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': window.location.href,
      },
    };

    script.textContent = JSON.stringify(schemaData);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [post]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Simple Markdown formatting helper for structured text
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-xl sm:text-2xl font-bold text-neutral-900 mt-8 mb-4 tracking-tight">
            {trimmed.replace('## ', '')}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-base sm:text-lg font-semibold text-neutral-900 mt-6 mb-2">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('- ')) {
        return (
          <li key={idx} className="text-sm sm:text-base text-neutral-700 ml-4 list-disc my-1 leading-relaxed">
            {trimmed.replace('- ', '')}
          </li>
        );
      }
      if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ') || trimmed.startsWith('4. ')) {
        return (
          <li key={idx} className="text-sm sm:text-base text-neutral-700 ml-5 list-decimal my-1.5 leading-relaxed">
            {trimmed.replace(/^\d+\.\s+/, '')}
          </li>
        );
      }
      if (trimmed === '---') {
        return <hr key={idx} className="my-8 border-neutral-200" />;
      }
      if (!trimmed) {
        return <div key={idx} className="h-3" />;
      }
      return (
        <p key={idx} className="text-sm sm:text-base text-neutral-700 leading-relaxed my-3">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <article className="max-w-4xl mx-auto space-y-8 text-left animate-in fade-in duration-200 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <button
          onClick={onBackToBlog}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Articles</span>
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition-all cursor-pointer shadow-2xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-neutral-500" />}
          <span>{copied ? 'Link Copied!' : 'Share Guide'}</span>
        </button>
      </div>

      {/* Article Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            {post.categoryLabel}
          </span>
          <span className="text-neutral-400">•</span>
          <span className="text-neutral-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {post.readTimeMinutes} min read
          </span>
          <span className="text-neutral-400">•</span>
          <span className="text-neutral-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {post.publishedDate}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-950 leading-tight">
          {post.title}
        </h1>

        <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-normal bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
          <strong>TL;DR:</strong> {post.summary}
        </p>

        <div className="flex items-center gap-2 pt-1 text-xs text-neutral-500">
          <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px]">
            DG
          </div>
          <div>
            <span className="font-semibold text-neutral-900">{post.author}</span>
            <span className="text-neutral-400 ml-1.5">• Lead Architect at DocuZenith</span>
          </div>
        </div>
      </header>

      {/* Target Tool Action Banner (Top CTA) */}
      {post.targetToolId && onOpenToolModal && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-neutral-900 to-indigo-950 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Interactive In-Browser Tool</span>
            </div>
            <p className="text-sm font-bold text-white">
              Execute this workflow locally on your device now
            </p>
            <p className="text-xs text-neutral-300">
              100% Client-Side • Zero Cloud Uploads • No Signup Required
            </p>
          </div>

          <button
            onClick={() => onOpenToolModal(post.targetToolId!)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-neutral-900 hover:bg-neutral-100 transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{post.targetToolActionText || 'Launch Tool Now'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Article Body */}
      <div className="prose prose-neutral max-w-none">
        {renderFormattedContent(post.content)}
      </div>

      {/* Bottom Tool CTA */}
      {post.targetToolId && onOpenToolModal && (
        <div className="p-6 rounded-3xl bg-neutral-50 border border-neutral-200 text-center space-y-3 mt-10">
          <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
          <h3 className="text-lg font-bold text-neutral-900">
            Ready to Try It Privately in Your Browser?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">
            DocuZenith processes your files directly on your computer’s CPU and memory. No files are ever sent to external servers.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onOpenToolModal(post.targetToolId!)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition-all shadow-sm cursor-pointer"
            >
              <span>{post.targetToolActionText || 'Launch Tool'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Keywords / Tags Footer */}
      <div className="pt-6 border-t border-neutral-200 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-neutral-500 mr-1">Related Topics:</span>
        {post.keywords.map((kw, i) => (
          <span
            key={i}
            className="px-2.5 py-1 rounded-lg text-xs bg-neutral-100 text-neutral-600 border border-neutral-200/60"
          >
            #{kw}
          </span>
        ))}
      </div>
    </article>
  );
};
