/**
 * Client-Side Offline Cache Manager
 * Deletes old caches, forces re-fetch from server, and records update metadata
 */

export const CURRENT_CACHE_NAME = 'localpdf-offline-v4';
export const LAST_SERVER_UPDATE_KEY = 'localpdf_last_server_update';

export function getLastServerUpdateTime(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(LAST_SERVER_UPDATE_KEY);
  if (stored) return stored;
  // Fallback to document.lastModified or current time
  const fallback = document.lastModified ? new Date(document.lastModified).toLocaleString() : new Date().toLocaleString();
  return fallback;
}

export function setLastServerUpdateTime(timeStr: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_SERVER_UPDATE_KEY, timeStr);
}

export async function checkOfflineCached(): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) return false;
  try {
    const hasCache = await caches.has(CURRENT_CACHE_NAME);
    return hasCache;
  } catch {
    return false;
  }
}

/**
 * Rebuild Offline Cache from scratch:
 * 1. Purges all existing caches in CacheStorage
 * 2. Unregisters and updates Service Worker
 * 3. Freshly fetches all assets directly from the server with cache-busting
 * 4. Stores them in the new cache
 * 5. Records timestamp
 */
export async function rebuildOfflineCacheFromServer(
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { success: false, message: 'Browser Cache API is not supported in this browser.' };
  }

  try {
    if (onProgress) onProgress('Clearing old caches...');

    // 1. Purge all existing caches
    const keys = await caches.keys();
    for (const key of keys) {
      await caches.delete(key);
    }

    if (onProgress) onProgress('Updating Service Worker...');

    // 2. Register and update Service Worker
    if ('serviceWorker' in navigator) {
      const swUrl = new URL('./sw.js', window.location.href).href;
      const reg = await navigator.serviceWorker.register(swUrl, { scope: './' });
      await reg.update();
      if (reg.active) {
        reg.active.postMessage('SKIP_WAITING');
      }
    }

    if (onProgress) onProgress('Fetching fresh assets from server...');

    const cache = await caches.open(CURRENT_CACHE_NAME);

    // Build URL list with cache-busting timestamp to guarantee freshness
    const bustTimestamp = Date.now().toString();
    const urlsToCache = new Set<string>([
      window.location.href.split('?')[0],
      new URL('./', window.location.href).href,
      new URL('./index.html', window.location.href).href,
      new URL('./favicon.svg', window.location.href).href,
      new URL('./pdf.worker.min.mjs', window.location.href).href,
    ]);

    // Gather scripts
    document.querySelectorAll('script[src]').forEach((el) => {
      const src = (el as HTMLScriptElement).src;
      if (src && src.startsWith(window.location.origin)) {
        urlsToCache.add(src);
      }
    });

    // Gather stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
      const href = (el as HTMLLinkElement).href;
      if (href && href.startsWith(window.location.origin)) {
        urlsToCache.add(href);
      }
    });

    let count = 0;
    for (const url of urlsToCache) {
      try {
        count++;
        if (onProgress) onProgress(`Caching fresh assets (${count}/${urlsToCache.size})...`);
        const bustUrl = new URL(url);
        bustUrl.searchParams.set('_v', bustTimestamp);
        const res = await fetch(bustUrl.href, { cache: 'reload' });
        if (res.ok) {
          // Store against both canonical URL and query-busted URL
          await cache.put(url, res.clone());
          await cache.put(bustUrl.href, res);
        }
      } catch (err) {
        console.warn('Could not cache URL:', url, err);
      }
    }

    const nowFormatted = new Date().toLocaleString();
    setLastServerUpdateTime(nowFormatted);

    if (onProgress) onProgress('Offline cache successfully rebuilt!');
    return {
      success: true,
      message: `Offline cache successfully refreshed from server on ${nowFormatted}!`,
    };
  } catch (err) {
    console.error('Failed to rebuild offline cache:', err);
    return { success: false, message: 'Failed to cache application: ' + String(err) };
  }
}

/**
 * Force clear all browser caches, unregister service workers, and reload freshly from server
 */
export async function clearAppCacheAndRefresh(
  onProgress?: (msg: string) => void
): Promise<void> {
  try {
    if (onProgress) onProgress('Unregistering Service Workers...');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.active) {
          reg.active.postMessage('CLEAR_CACHE');
        }
        await reg.unregister();
      }
    }

    if (onProgress) onProgress('Clearing browser cache storage...');
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }

    if (onProgress) onProgress('Reloading latest version from server...');
  } catch (err) {
    console.warn('Error clearing caches:', err);
  } finally {
    const freshUrl = new URL(window.location.href);
    freshUrl.searchParams.set('_v', Date.now().toString());
    window.location.href = freshUrl.href;
  }
}
