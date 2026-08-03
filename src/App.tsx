import { useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { AskScreen } from './components/AskScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AboutScreen } from './components/AboutScreen';
import { WelcomeDisclaimer } from './components/WelcomeDisclaimer';
import { eventsForDate } from './core/calendar/resolve';
import { todayIso } from './core/pregnancy/engine';
import {
  ensureNotificationSw,
  requestNotificationPermission,
  scheduleTodayTimers,
  showLocalNotification,
  subtractMinutesFromHm,
  type ReminderItem,
} from './core/notifications/local';
import {
  hasDisclaimerAck,
  saveDisclaimerAck,
} from './core/storage/store';
import { useAppState } from './hooks/useAppState';

export default function App() {
  const state = useAppState();
  const {
    tab,
    setTab,
    t,
    settings,
    updateSettings,
    events,
    profile,
    dataSummary,
  } = state;
  const [showWelcome, setShowWelcome] = useState(() => !hasDisclaimerAck());
  /** Bump when tab becomes visible so timers reschedule after phone sleep. */
  const [scheduleTick, setScheduleTick] = useState(0);

  // Re-show after full clean (disclaimer key wiped with babywise_v1_*)
  useEffect(() => {
    if (!hasDisclaimerAck()) setShowWelcome(true);
  }, [dataSummary.keyCount]);

  // Register SW early when notifications are enabled
  useEffect(() => {
    if (!settings.notificationsEnabled) return;
    void ensureNotificationSw();
  }, [settings.notificationsEnabled]);

  // Reschedule when app returns to foreground
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setScheduleTick((n) => n + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, []);

  // Local same-session reminders — items with clock time + notify flag
  useEffect(() => {
    if (!settings.notificationsEnabled) return;

    const today = eventsForDate(events, todayIso(), profile);
    const items: ReminderItem[] = [];

    for (const e of today) {
      const minsList = e.notifyMinutesBefore?.length
        ? e.notifyMinutesBefore
        : [];
      if (!minsList.length) continue;
      const times = (e.timesOfDay ?? []).map((tm) => tm.trim()).filter(Boolean);
      if (!times.length) continue;

      for (const eventTime of times) {
        for (const mins of minsList) {
          const fireTime = subtractMinutesFromHm(eventTime, mins);
          items.push({
            id: `${e.id}-${eventTime}-${mins}`,
            title: e.title,
            time: fireTime,
            eventTime,
          });
        }
      }
    }

    return scheduleTodayTimers(items, (item) => {
      const body = item.eventTime
        ? t('notify.reminderBody', { time: item.eventTime })
        : item.time;
      void showLocalNotification(item.title, body, {
        tag: `babywise-${item.id}`,
      });
    });
  }, [
    settings.notificationsEnabled,
    events,
    profile,
    scheduleTick,
    t,
  ]);

  const acceptWelcome = async (opts: { notificationsEnabled: boolean }) => {
    // Close UI first so permission prompt never freezes the welcome sheet
    saveDisclaimerAck();
    setShowWelcome(false);

    let notificationsEnabled = false;
    if (opts.notificationsEnabled) {
      const perm = await requestNotificationPermission();
      notificationsEnabled = perm === 'granted';
    }

    updateSettings({
      ...settings,
      notificationsEnabled,
    });
  };

  return (
    <div className="app-page">
      <div className="app-shell">
        <AppHeader tab={tab} onChange={setTab} t={t} />
        <main className="app-main">
          {tab === 'home' && <HomeScreen state={state} />}
          {tab === 'calendar' && <CalendarScreen state={state} />}
          {tab === 'ask' && <AskScreen state={state} />}
          {tab === 'settings' && <SettingsScreen state={state} />}
          {tab === 'about' && <AboutScreen state={state} />}
        </main>
        <BottomNav tab={tab} onChange={setTab} t={t} />
      </div>
      {showWelcome && <WelcomeDisclaimer t={t} onAccept={acceptWelcome} />}
    </div>
  );
}
