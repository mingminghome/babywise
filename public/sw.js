/**
 * BabyWise service worker — local notifications (no push server).
 * Receives SHOW_NOTIFICATION messages from the app and shows OS alerts
 * so reminders can fire more reliably on installed PWAs (incl. iOS 16.4+).
 */
/* eslint-disable no-undef */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SHOW_NOTIFICATION') return;

  const title = typeof data.title === 'string' ? data.title : 'BabyWise';
  const body = typeof data.body === 'string' ? data.body : '';
  const tag =
    typeof data.tag === 'string' && data.tag ? data.tag : 'babywise-reminder';
  const icon =
    typeof data.icon === 'string' && data.icon ? data.icon : '/logo-120.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/logo-120.png',
      tag,
      renotify: true,
      data: data.data && typeof data.data === 'object' ? data.data : { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification.data;
  const url =
    raw && typeof raw === 'object' && typeof raw.url === 'string'
      ? raw.url
      : '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client && typeof client.navigate === 'function') {
              try {
                client.navigate(url);
              } catch {
                /* ignore */
              }
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
        return undefined;
      })
  );
});
