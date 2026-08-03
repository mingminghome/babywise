/**
 * Local same-device reminders (no push server).
 *
 * Strategy:
 *  - Request Notification permission from a user gesture
 *  - Prefer ServiceWorkerRegistration.showNotification (works better on
 *    installed PWAs, including iOS 16.4+ home-screen apps)
 *  - Fall back to `new Notification(...)` when SW is unavailable
 *  - Schedule with setTimeout for remaining times today (session-based;
 *    reschedule when the app becomes visible again)
 */

export type NotificationCapability = {
  /** Browser exposes Notification API */
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  /** true when running as installed PWA / home-screen app */
  standalone: boolean;
  /** iOS / iPadOS (incl. iPadOS desktop UA) */
  isIos: boolean;
  /** Service worker registered and active (or waiting) */
  serviceWorkerReady: boolean;
  /** Can actually show a notification right now */
  canShow: boolean;
};

const SW_URL = '/sw.js';
const SW_SCOPE = '/';

let swRegisterPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS 13+ may report as MacIntel with touch
  const iPadOs =
    navigator.platform === 'MacIntel' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/i.test(ua) || iPadOs;
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Register (or reuse) the notification service worker. */
export async function ensureNotificationSw(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  if (!swRegisterPromise) {
    swRegisterPromise = (async () => {
      try {
        const reg = await navigator.serviceWorker.register(SW_URL, {
          scope: SW_SCOPE,
        });
        // Wait briefly for an active worker so showNotification is usable
        if (reg.installing) {
          await new Promise<void>((resolve) => {
            const sw = reg.installing;
            if (!sw) {
              resolve();
              return;
            }
            const done = () => {
              if (sw.state === 'activated' || sw.state === 'installed') {
                sw.removeEventListener('statechange', done);
                resolve();
              }
            };
            sw.addEventListener('statechange', done);
            window.setTimeout(resolve, 3000);
          });
        }
        await navigator.serviceWorker.ready.catch(() => null);
        return reg;
      } catch (e) {
        console.warn('BabyWise SW register failed:', e);
        return null;
      }
    })();
  }
  return swRegisterPromise;
}

export async function getNotificationCapability(): Promise<NotificationCapability> {
  const supported = notificationsSupported();
  const permission: NotificationPermission | 'unsupported' = supported
    ? Notification.permission
    : 'unsupported';
  const standalone = isStandaloneApp();
  const ios = isIosDevice();
  let serviceWorkerReady = false;
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ??
        (await ensureNotificationSw());
      serviceWorkerReady = Boolean(reg?.active || reg?.waiting || reg?.installing);
    } catch {
      serviceWorkerReady = false;
    }
  }
  const canShow = supported && permission === 'granted';
  return {
    supported,
    permission,
    standalone,
    isIos: ios,
    serviceWorkerReady,
    canShow,
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  // Warm up SW before the permission prompt when possible
  void ensureNotificationSw();
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Promise.race([
      Notification.requestPermission(),
      new Promise<NotificationPermission>((resolve) => {
        window.setTimeout(
          () => resolve(Notification.permission || 'default'),
          8000
        );
      }),
    ]);
    if (result === 'granted') {
      void ensureNotificationSw();
    }
    return result;
  } catch {
    return 'denied';
  }
}

export function canNotify(): boolean {
  return notificationsSupported() && Notification.permission === 'granted';
}

/**
 * Show a local notification via SW when possible, else Notification constructor.
 * Silent no-op if permission is not granted.
 */
export async function showLocalNotification(
  title: string,
  body: string,
  opts?: { tag?: string }
): Promise<boolean> {
  if (!canNotify()) return false;
  const tag = opts?.tag ?? `babywise-${Date.now()}`;
  const payload = {
    type: 'SHOW_NOTIFICATION' as const,
    title,
    body,
    icon: '/logo-120.png',
    tag,
    data: { url: '/' },
  };

  try {
    const reg = await ensureNotificationSw();
    if (reg) {
      // Prefer registration API (required path on many mobile browsers)
      if (reg.active) {
        reg.active.postMessage(payload);
        return true;
      }
      if (typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: '/logo-120.png',
          badge: '/logo-120.png',
          tag,
          data: { url: '/' },
        });
        return true;
      }
    }
  } catch (e) {
    console.warn('BabyWise SW notification failed, falling back:', e);
  }

  try {
    // Fallback: page-context Notification (desktop / some Android browsers)
    // eslint-disable-next-line no-new
    new Notification(title, {
      body,
      icon: '/logo-120.png',
      tag,
    });
    return true;
  } catch (e) {
    console.warn('BabyWise Notification constructor failed:', e);
    return false;
  }
}

/** Fire a one-off test alert (Settings). */
export async function sendTestNotification(title: string, body: string): Promise<boolean> {
  if (!canNotify()) {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') return false;
  }
  return showLocalNotification(title, body, { tag: 'babywise-test' });
}

function parseHm(time: string): { hh: number; mm: number } | null {
  const [hh, mm] = time.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return { hh, mm };
}

/** Subtract minutes from HH:mm (can roll before midnight → still same calendar day logic via Date). */
export function subtractMinutesFromHm(time: string, minutesBefore: number): string {
  const parsed = parseHm(time);
  if (!parsed) return time;
  const total = parsed.hh * 60 + parsed.mm - Math.max(0, minutesBefore);
  // Keep within day for display; scheduling uses Date math separately
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export type ReminderItem = {
  id: string;
  title: string;
  /** Clock time to fire (HH:mm), already adjusted for notifyMinutesBefore */
  time: string;
  /** Original scheduled clock time (for body text) */
  eventTime?: string;
};

/**
 * Best-effort same-session timers for remaining times today.
 * Returns a cleanup function that clears pending timers.
 */
export function scheduleTodayTimers(
  items: ReminderItem[],
  onFire: (item: ReminderItem) => void
): () => void {
  const timers: number[] = [];
  const now = Date.now();

  for (const item of items) {
    const parsed = parseHm(item.time);
    if (!parsed) continue;
    const when = new Date();
    when.setHours(parsed.hh, parsed.mm, 0, 0);
    const delay = when.getTime() - now;
    // Skip past times; allow up to ~24h ahead
    if (delay <= 0 || delay > 24 * 60 * 60 * 1000) continue;
    const id = window.setTimeout(() => {
      onFire(item);
    }, delay);
    timers.push(id);
  }

  return () => {
    for (const t of timers) window.clearTimeout(t);
  };
}
