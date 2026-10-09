import { GOOGLE_SHEET_WEBHOOK_URL } from './sheetWebhook';

export interface AnalyticsEvent {
  eventId: string;
  timestamp: string;
  date: string;
  visitorId: string;
  sessionId: string;
  eventType: 'PAGE_VIEW' | 'TOOL_OPEN' | 'TOOL_USE';
  toolId: string;
  toolName: string;
  device: string;
  os: string;
  browser: string;
  timezone: string;
  language: string;
  screenResolution: string;
  referrer: string;
  fileCount: number;
  fileSizeKb: number;
  durationMs: number;
  status: 'success' | 'failure';
}

const LOCAL_STORAGE_KEY = 'localpdf_analytics_logs';
const VISITOR_ID_KEY = 'localpdf_visitor_id';
const SESSION_ID_KEY = 'localpdf_session_id';

function getVisitorId(): string {
  try {
    let vid = localStorage.getItem(VISITOR_ID_KEY);
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-4);
      localStorage.setItem(VISITOR_ID_KEY, vid);
    }
    return vid;
  } catch {
    return 'anon_visitor';
  }
}

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = 's_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-4);
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return 'anon_session';
  }
}

function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'Desktop';
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function detectOS(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  return 'Other';
}

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function getLanguage(): string {
  return (typeof navigator !== 'undefined' && navigator.language) || 'en';
}

function getScreenResolution(): string {
  if (typeof window === 'undefined' || !window.screen) return 'unknown';
  return `${window.screen.width}x${window.screen.height}`;
}

function getReferrer(): string {
  if (typeof document === 'undefined' || !document.referrer) return 'Direct';
  try {
    const url = new URL(document.referrer);
    return url.hostname;
  } catch {
    return 'Direct';
  }
}

function saveEventLocally(event: AnalyticsEvent) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const logs: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];
    logs.unshift(event);
    if (logs.length > 100) logs.length = 100;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Ignore storage quota errors
  }
}

async function sendToSheetWebhook(event: AnalyticsEvent) {
  if (!GOOGLE_SHEET_WEBHOOK_URL) return;

  const payload = {
    type: 'ANALYTICS_EVENT',
    ...event,
  };

  try {
    // Prefer sendBeacon for non-blocking background dispatch
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain;charset=utf-8' });
      const sent = navigator.sendBeacon(GOOGLE_SHEET_WEBHOOK_URL, blob);
      if (sent) return;
    }

    await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.debug('[Analytics] Background dispatch note:', err);
  }
}

function dispatchAnalytics(eventData: Partial<AnalyticsEvent> & { eventType: AnalyticsEvent['eventType'] }) {
  const now = new Date();
  const event: AnalyticsEvent = {
    eventId: 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    timestamp: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    eventType: eventData.eventType,
    toolId: eventData.toolId || 'home',
    toolName: eventData.toolName || 'Website Landing',
    device: detectDevice(),
    os: detectOS(),
    browser: detectBrowser(),
    timezone: getTimezone(),
    language: getLanguage(),
    screenResolution: getScreenResolution(),
    referrer: getReferrer(),
    fileCount: eventData.fileCount || 0,
    fileSizeKb: eventData.fileSizeKb || 0,
    durationMs: eventData.durationMs || 0,
    status: eventData.status || 'success',
  };

  saveEventLocally(event);
  sendToSheetWebhook(event);
}

/**
 * Track user landing or navigating to page
 */
export function trackPageView() {
  dispatchAnalytics({
    eventType: 'PAGE_VIEW',
    toolId: 'overview',
    toolName: 'Home Catalog',
  });
}

/**
 * Track user selecting / opening a tool modal
 */
export function trackToolOpen(toolId: string, toolTitle: string) {
  dispatchAnalytics({
    eventType: 'TOOL_OPEN',
    toolId,
    toolName: toolTitle,
  });
}

/**
 * Track user completing / downloading a tool operation
 */
export function trackToolUse(
  toolId: string,
  toolTitle: string,
  options?: {
    fileCount?: number;
    totalSizeBytes?: number;
    durationMs?: number;
    status?: 'success' | 'failure';
  }
) {
  const sizeKb = options?.totalSizeBytes ? Math.round(options.totalSizeBytes / 1024) : 0;
  dispatchAnalytics({
    eventType: 'TOOL_USE',
    toolId,
    toolName: toolTitle,
    fileCount: options?.fileCount || 1,
    fileSizeKb: sizeKb,
    durationMs: options?.durationMs || 0,
    status: options?.status || 'success',
  });
}

let currentActiveTool: { id: string; title: string } | null = null;
let lastTrackedToolUseTime = 0;
let lastTrackedToolUseId = '';

export function setActiveTrackingTool(tool: { id: string; title: string } | null) {
  currentActiveTool = tool;
}

export function getActiveTrackingTool() {
  return currentActiveTool;
}

/**
 * Automatically records tool execution when a download finishes
 */
export function recordDownloadActivity(_filename: string, sizeBytes?: number) {
  if (!currentActiveTool) return;
  const now = Date.now();
  if (currentActiveTool.id === lastTrackedToolUseId && now - lastTrackedToolUseTime < 1500) {
    return;
  }
  lastTrackedToolUseTime = now;
  lastTrackedToolUseId = currentActiveTool.id;

  trackToolUse(currentActiveTool.id, currentActiveTool.title, {
    fileCount: 1,
    totalSizeBytes: sizeBytes,
    status: 'success',
  });
}

/**
 * Retrieve local event logs stored in localStorage
 */
export function getLocalAnalyticsLogs(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
