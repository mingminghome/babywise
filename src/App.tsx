import { useEffect, useState } from 'react';
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
  requestNotificationPermission,
  scheduleTodayTimers,
  showLocalNotification,
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

  // Re-show after full clean (disclaimer key wiped with babywise_v1_*)
  useEffect(() => {
    if (!hasDisclaimerAck()) setShowWelcome(true);
  }, [dataSummary.keyCount]);

  // Local same-session reminders — only items with a clock time + notify flag
  useEffect(() => {
    if (!settings.notificationsEnabled) return;
    const today = eventsForDate(events, todayIso(), profile);
    const items: Array<{ id: string; title: string; time: string }> = [];
    for (const e of today) {
      if (!e.notifyMinutesBefore?.length) continue;
      const times = (e.timesOfDay ?? []).map((tm) => tm.trim()).filter(Boolean);
      if (!times.length) continue;
      for (const time of times) {
        items.push({ id: e.id, title: e.title, time });
      }
    }
    return scheduleTodayTimers(items, (item) => {
      showLocalNotification(item.title, item.time);
    });
  }, [settings.notificationsEnabled, events, profile]);

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
