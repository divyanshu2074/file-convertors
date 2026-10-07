import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, DownloadCloud, CheckCircle2, Loader2 } from 'lucide-react';
import { checkOfflineCached, saveAppToOfflineCache } from '../lib/offlineManager';
import confetti from 'canvas-confetti';

interface OfflineCacheButtonProps {
  variant?: 'compact' | 'full';
}

export const OfflineCacheButton: React.FC<OfflineCacheButtonProps> = ({ variant = 'compact' }) => {
  const [isCached, setIsCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    checkOfflineCached().then((cached) => setIsCached(cached));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSaveToCache = async () => {
    try {
      setLoading(true);
      const res = await saveAppToOfflineCache((msg) => setStatusText(msg));
      if (res.success) {
        setIsCached(true);
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.9 } });
        alert(res.message);
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error caching app: ' + String(err));
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleSaveToCache}
        disabled={loading}
        title={isCached ? 'App is cached for offline use!' : 'Save page into browser cache for offline use'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
          isCached
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 shadow-2xs'
        }`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-600" />
        ) : isCached ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <DownloadCloud className="w-3.5 h-3.5 text-neutral-500" />
        )}
        <span>{loading ? statusText || 'Caching...' : isCached ? 'Offline Ready' : 'Save for Offline'}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          isCached ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
        }`}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-900">
            {isCached ? 'Offline Cache Active' : 'Offline Access Available'}
          </p>
          <p className="text-[11px] text-neutral-500">
            {isCached
              ? 'All tools, scripts, and fonts are stored in browser memory. Works with no internet!'
              : 'Save this entire suite into browser cache so you can use it without internet anytime.'}
          </p>
        </div>
      </div>

      <button
        onClick={handleSaveToCache}
        disabled={loading}
        className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
          isCached
            ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm'
        }`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isCached ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <DownloadCloud className="w-3.5 h-3.5" />
        )}
        <span>{loading ? 'Caching...' : isCached ? 'Update Cache' : 'Save for Offline'}</span>
      </button>
    </div>
  );
};
