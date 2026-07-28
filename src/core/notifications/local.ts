export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    // Some browsers never resolve requestPermission in odd contexts — don't hang the UI
    const result = await Promise.race([
      Notification.requestPermission(),
      new Promise<NotificationPermission>((resolve) => {
        window.setTimeout(() => resolve(Notification.permission || 'default'), 4000);
      }),
    ]);
    return result;
  } catch {
    return 'denied';
  }
}

export function canNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function showLocalNotification(title: string, body: string): void {
  if (!canNotify()) return;
  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag: 'babywise-reminder',
    });
  } catch {
    // ignore
  }
}

/** Best-effort same-session timers for today's times (HH:mm). */
export function scheduleTodayTimers(
  items: Array<{ id: string; title: string; time: string }>,
  onFire: (item: { id: string; title: string; time: string }) => void
): () => void {
  const timers: number[] = [];
  const now = new Date();

  for (const item of items) {
    const [hh, mm] = item.time.split(':').map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
    const when = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hh,
      mm,
      0,
      0
    );
    const delay = when.getTime() - now.getTime();
    if (delay <= 0 || delay > 24 * 60 * 60 * 1000) continue;
    const id = window.setTimeout(() => onFire(item), delay);
    timers.push(id);
  }

  return () => timers.forEach((t) => clearTimeout(t));
}
