import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listEvents,
  upsertEvent,
  deleteEvent,
  setEventCompletion,
} from '../core/calendar/store';
import { createT, localeTag } from '../core/i18n';
import { getGestationalAge, normalizeProfile } from '../core/pregnancy/engine';
import {
  applyBackup,
  buildBackup,
  parseBackup,
  type BabywiseBackup,
  type BackupImportMode,
  type BackupImportResult,
} from '../core/storage/backup';
import { loadDemoData } from '../core/storage/demoData';
import { isBabyTabVisible } from '../core/baby/logs';
import { resolveLaborRule } from '../core/labor/engine';
import {
  clearLocalData,
  getAskHistory,
  getBabies,
  getEvents,
  getLaborSessions,
  getProfile,
  getSettings,
  saveAskHistory,
  saveBabies,
  saveEvents,
  saveLaborSessions,
  saveProfile,
  saveSettings,
  summarizeLocalData,
} from '../core/storage/store';
import type {
  AppSettings,
  AskHistoryItem,
  BabyProfile,
  CalendarEvent,
  CompletionKind,
  DataCategory,
  LaborSession,
  PregnancyProfile,
  HomeMode,
} from '../core/types';

export type TabId =
  | 'home'
  | 'calendar'
  | 'baby'
  | 'ask'
  | 'settings'
  | 'about'
  | 'tools';

export type PendingAsk = {
  question: string;
  autoSubmit?: boolean;
};

export function useAppState() {
  const [tab, setTab] = useState<TabId>('home');
  const [profile, setProfile] = useState<PregnancyProfile | null>(() => getProfile());
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [events, setEvents] = useState<CalendarEvent[]>(() => listEvents());
  const [askHistory, setAskHistory] = useState<AskHistoryItem[]>(() => getAskHistory());
  const [babies, setBabies] = useState<BabyProfile[]>(() => getBabies());
  const [laborSessions, setLaborSessions] = useState<LaborSession[]>(() =>
    getLaborSessions()
  );
  const [pendingAsk, setPendingAsk] = useState<PendingAsk | null>(null);
  const [tick, setTick] = useState(0);

  const t = useMemo(() => createT(settings.locale), [settings.locale]);
  const ga = useMemo(() => getGestationalAge(profile), [profile, tick]);
  const homeMode: HomeMode =
    settings.homeMode ?? (settings.hidePregnancy ? 'baby' : 'pregnancy');
  const showBabyTab = isBabyTabVisible(settings, babies);
  const laborRule = useMemo(() => resolveLaborRule(settings), [settings]);

  useEffect(() => {
    if (tab === 'baby' && !showBabyTab) setTab('home');
    if (tab === 'tools' && homeMode === 'baby') setTab('home');
  }, [tab, showBabyTab, homeMode]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    let theme = settings.theme;
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'warm-dark'
        : 'warm-light';
    }
    root.setAttribute('data-theme', theme === 'warm-dark' ? 'dark' : 'light');
    document.documentElement.lang = localeTag(settings.locale);
  }, [settings.theme, settings.locale]);

  const refreshEvents = useCallback(() => {
    setEvents(listEvents());
  }, []);

  const updateProfile = useCallback((next: PregnancyProfile) => {
    const normalized = normalizeProfile({
      ...next,
      updatedAt: new Date().toISOString(),
    });
    saveProfile(normalized);
    setProfile(normalized);
  }, []);

  const updateSettings = useCallback((next: AppSettings) => {
    saveSettings(next);
    setSettings(next);
  }, []);

  const saveEvent = useCallback(
    (input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      upsertEvent(input);
      refreshEvents();
    },
    [refreshEvents]
  );

  const removeEvent = useCallback(
    (id: string) => {
      deleteEvent(id);
      refreshEvents();
    },
    [refreshEvents]
  );

  const markComplete = useCallback(
    (id: string, dateIso: string, kind: CompletionKind | null) => {
      setEventCompletion(id, dateIso, kind);
      refreshEvents();
    },
    [refreshEvents]
  );

  const pushAskHistory = useCallback((item: AskHistoryItem) => {
    setAskHistory((prev) => {
      const next = [item, ...prev].slice(0, 30);
      saveAskHistory(next);
      return next;
    });
  }, []);

  const removeAskHistory = useCallback((id: string) => {
    setAskHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveAskHistory(next);
      return next;
    });
  }, []);

  const saveBaby = useCallback(
    (
      input: Omit<BabyProfile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): BabyProfile => {
      const now = new Date().toISOString();
      const list = getBabies();
      let saved: BabyProfile;
      if (input.id) {
        const idx = list.findIndex((b) => b.id === input.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...input, id: input.id, updatedAt: now };
          list[idx] = saved;
        } else {
          saved = {
            ...input,
            id: input.id,
            createdAt: now,
            updatedAt: now,
          };
          list.push(saved);
        }
      } else {
        saved = {
          ...input,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        list.push(saved);
      }
      saveBabies(list);
      setBabies(list);
      const s = getSettings();
      saveSettings({
        ...s,
        babyCareEnabled: true,
        activeBabyId: saved.id,
      });
      setSettings(getSettings());
      return saved;
    },
    []
  );

  const removeBaby = useCallback((id: string) => {
    const nextBabies = getBabies().filter((b) => b.id !== id);
    saveBabies(nextBabies);
    setBabies(nextBabies);
    const remaining = getEvents().filter((e) => e.babyId !== id);
    saveEvents(remaining);
    setEvents(listEvents());
    const s = getSettings();
    const nextActive =
      s.activeBabyId === id ? nextBabies[0]?.id : s.activeBabyId;
    saveSettings({ ...s, activeBabyId: nextActive });
    setSettings(getSettings());
  }, []);

  const setActiveBabyId = useCallback((id: string) => {
    const s = getSettings();
    saveSettings({ ...s, activeBabyId: id });
    setSettings(getSettings());
  }, []);

  const saveLaborSession = useCallback(
    (
      input: Omit<LaborSession, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): LaborSession => {
      const now = new Date().toISOString();
      const list = getLaborSessions();
      let saved: LaborSession;
      if (input.id) {
        const idx = list.findIndex((s) => s.id === input.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...input, id: input.id, updatedAt: now };
          list[idx] = saved;
        } else {
          saved = { ...input, id: input.id, createdAt: now, updatedAt: now };
          list.push(saved);
        }
      } else {
        saved = {
          ...input,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        list.push(saved);
      }
      saveLaborSessions(list);
      setLaborSessions(list);
      return saved;
    },
    []
  );

  const removeLaborSession = useCallback((id: string) => {
    const next = getLaborSessions().filter((s) => s.id !== id);
    saveLaborSessions(next);
    setLaborSessions(next);
  }, []);

  const clearPendingAsk = useCallback(() => setPendingAsk(null), []);

  const cleanData = useCallback((category: DataCategory = 'all') => {
    clearLocalData(category);
    if (category === 'all' || category === 'profile') {
      setProfile(getProfile());
    }
    if (category === 'all' || category === 'events') {
      setEvents(listEvents());
    }
    if (category === 'all' || category === 'settings') {
      setSettings(getSettings());
    }
    if (category === 'all' || category === 'askHistory') {
      setAskHistory(getAskHistory());
    }
    if (category === 'all' || category === 'babies') {
      setBabies(getBabies());
    }
    if (category === 'all' || category === 'labor') {
      setLaborSessions(getLaborSessions());
    }
  }, []);

  /** Load random sample pregnancy, babies, labor, and calendar. */
  const loadSampleData = useCallback(() => {
    const result = loadDemoData();
    setProfile(result.profile);
    setEvents(listEvents());
    setBabies(getBabies());
    setLaborSessions(getLaborSessions());
    setSettings(getSettings());
    return result;
  }, []);

  /** Reload all local stores into React state (after import). */
  const reloadFromStorage = useCallback(() => {
    setProfile(getProfile());
    setSettings(getSettings());
    setEvents(listEvents());
    setAskHistory(getAskHistory());
    setBabies(getBabies());
    setLaborSessions(getLaborSessions());
    setTick((n) => n + 1);
  }, []);

  const exportBackup = useCallback((): BabywiseBackup => buildBackup(), []);

  const importBackup = useCallback(
    (
      raw: unknown,
      mode: BackupImportMode = 'replace'
    ): BackupImportResult => {
      const backup = parseBackup(raw);
      if (!backup) return { ok: false, reason: 'parse' };
      const result = applyBackup(backup, mode);
      if (result.ok) reloadFromStorage();
      return result;
    },
    [reloadFromStorage]
  );

  const dataSummary = useMemo(
    () => summarizeLocalData(),
    [profile, events, askHistory, settings, babies, laborSessions, tick]
  );

  return {
    tab,
    setTab,
    profile,
    updateProfile,
    settings,
    updateSettings,
    events,
    saveEvent,
    removeEvent,
    markComplete,
    askHistory,
    pushAskHistory,
    removeAskHistory,
    babies,
    saveBaby,
    removeBaby,
    setActiveBabyId,
    homeMode,
    showBabyTab,
    laborSessions,
    saveLaborSession,
    removeLaborSession,
    laborRule,
    pendingAsk,
    setPendingAsk,
    clearPendingAsk,
    cleanData,
    loadSampleData,
    exportBackup,
    importBackup,
    reloadFromStorage,
    dataSummary,
    t,
    ga,
  };
}

export type AppState = ReturnType<typeof useAppState>;
