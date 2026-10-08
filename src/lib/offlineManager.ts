/**
 * Client-Side Offline Cache Manager
 * Pre-caches scripts, styles, worker files and registers Service Worker
 */

export const CURRENT_CACHE_NAME = 'localpdf-offline-v2';

export async function checkOfflineCached(): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) return false;
  try {
    const hasCache = await caches.has(CURRENT_CACHE_NAME);
    return hasCache;
  } catch {
    return false;
  }
}

export async function saveAppToOfflineCache(
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { success: false, message: 'Browser Cache API is not supported in this browser.' };
  }

  try {
    if (onProgress) onProgress('Registering offline Service Worker...');

    // 1. Register Service Worker if supported
    if ('serviceWorker' in navigator) {
      const swUrl = new URL('./sw.js', window.location.href).href;
      const reg = await navigator.serviceWorker.register(swUrl, { scope: './' });
      await reg.update();
    }

    if (onProgress) onProgress('Opening offline cache storage...');
    const cache = await caches.open(CURRENT_CACHE_NAME);

    // Collect all active script, link, and static asset URLs currently on the page
    const urlsToCache = new Set<string>([
      window.location.href,
      new URL('./', window.location.href).href,
      new URL('./index.html', window.location.href).href,
      new URL('./favicon.svg', window.location.href).href,
      new URL('./pdf.worker.min.mjs', window.location.href).href,
    ]);

    // Add all script tags
    document.querySelectorAll('script[src]').forEach((el) => {
      const src = (el as HTMLScriptElement).src;
      if (src && src.startsWith(window.location.origin)) {
        urlsToCache.add(src);
      }
    });

    // Add all stylesheet links
    document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
      const href = (el as HTMLLinkElement).href;
      if (href && href.startsWith(window.location.origin)) {
        urlsToCache.add(href);
      }
    });

    if (onProgress) onProgress(`Caching ${urlsToCache.size} essential application assets...`);

    // Fetch and cache all URLs
    for (const url of urlsToCache) {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) {
          await cache.put(url, res);
        }
      } catch (err) {
        console.warn('Could not pre-cache URL:', url, err);
      }
    }

    if (onProgress) onProgress('App successfully saved to offline cache!');
    return {
      success: true,
      message: 'All application assets have been cached! You can now use LocalPDF completely offline.',
    };
  } catch (err) {
    console.error('Failed to save to offline cache:', err);
    return { success: false, message: 'Failed to cache application: ' + String(err) };
  }
}

/**
 * Force clear all browser caches, unregister service workers, and reload freshly from the server
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
    // Add cache-busting timestamp to reload directly from server
    const freshUrl = new URL(window.location.href);
    freshUrl.searchParams.set('_v', Date.now().toString());
    window.location.href = freshUrl.href;
  }
}
