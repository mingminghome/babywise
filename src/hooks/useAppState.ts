import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listEvents,
  upsertEvent,
  deleteEvent,
  setEventCompletion,
} from '../core/calendar/store';
import { createT, localeTag } from '../core/i18n';
import { getGestationalAge, normalizeProfile } from '../core/pregnancy/engine';
import { loadDemoData } from '../core/storage/demoData';
import {
  clearLocalData,
  getAskHistory,
  getProfile,
  getSettings,
  saveAskHistory,
  saveProfile,
  saveSettings,
  summarizeLocalData,
} from '../core/storage/store';
import type {
  AppSettings,
  AskHistoryItem,
  CalendarEvent,
  CompletionKind,
  DataCategory,
  PregnancyProfile,
} from '../core/types';

export type TabId = 'home' | 'calendar' | 'ask' | 'settings' | 'about';

export function useAppState() {
  const [tab, setTab] = useState<TabId>('home');
  const [profile, setProfile] = useState<PregnancyProfile | null>(() => getProfile());
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [events, setEvents] = useState<CalendarEvent[]>(() => listEvents());
  const [askHistory, setAskHistory] = useState<AskHistoryItem[]>(() => getAskHistory());
  const [tick, setTick] = useState(0);

  const t = useMemo(() => createT(settings.locale), [settings.locale]);
  const ga = useMemo(() => getGestationalAge(profile), [profile, tick]);

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
  }, []);

  /** Load random sample profile + calendar (overwrites those two stores). */
  const loadSampleData = useCallback(() => {
    const result = loadDemoData();
    setProfile(result.profile);
    setEvents(listEvents());
    return result;
  }, []);

  const dataSummary = useMemo(() => summarizeLocalData(), [profile, events, askHistory, settings, tick]);

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
    cleanData,
    loadSampleData,
    dataSummary,
    t,
    ga,
  };
}

export type AppState = ReturnType<typeof useAppState>;
