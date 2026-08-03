/**
 * Export / import BabyWise local data as a JSON backup file.
 * Complements day share/copy — full diary portable between devices/browsers.
 */

import { APP_VERSION } from '../../version';
import type {
  AppSettings,
  AskHistoryItem,
  CalendarEvent,
  PregnancyProfile,
} from '../types';
import {
  getAskHistory,
  getDefaultSettings,
  getEvents,
  getProfile,
  getSettings,
  hasDisclaimerAck,
  saveAskHistory,
  saveEvents,
  saveProfile,
  saveSettings,
  STORAGE_KEYS,
} from './store';

export const BACKUP_FORMAT = 'babywise-backup' as const;
export const BACKUP_VERSION = 1 as const;

export type BackupData = {
  profile: PregnancyProfile | null;
  events: CalendarEvent[];
  settings: AppSettings | null;
  askHistory: AskHistoryItem[];
  /** ISO string if disclaimer was accepted on source device */
  disclaimerAck: string | null;
};

export type BabywiseBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  appVersion: string;
  data: BackupData;
};

export type BackupImportMode = 'replace' | 'mergeEvents';

export type BackupImportResult =
  | {
      ok: true;
      mode: BackupImportMode;
      profile: boolean;
      events: number;
      settings: boolean;
      askHistory: number;
    }
  | { ok: false; reason: 'invalid' | 'unsupported' | 'empty' | 'parse' };

function readDisclaimerAck(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.disclaimerAck);
  } catch {
    return null;
  }
}

function writeDisclaimerAck(iso: string | null): void {
  try {
    if (iso) localStorage.setItem(STORAGE_KEYS.disclaimerAck, iso);
    else localStorage.removeItem(STORAGE_KEYS.disclaimerAck);
  } catch {
    /* ignore */
  }
}

/** Build a portable snapshot of all BabyWise local stores. */
export function buildBackup(): BabywiseBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {
      profile: getProfile(),
      events: getEvents(),
      settings: getSettings(),
      askHistory: getAskHistory(),
      disclaimerAck: readDisclaimerAck() ?? (hasDisclaimerAck() ? new Date().toISOString() : null),
    },
  };
}

export function backupToJson(backup: BabywiseBackup = buildBackup()): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function defaultBackupFilename(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `babywise-backup-${y}${m}${day}.json`;
}

/** Download JSON file via browser download. */
export function downloadBackupFile(
  filename = defaultBackupFilename(),
  backup: BabywiseBackup = buildBackup()
): void {
  const blob = new Blob([backupToJson(backup)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Try OS share sheet with a file; falls back to download. */
export async function shareOrDownloadBackup(
  backup: BabywiseBackup = buildBackup()
): Promise<'share' | 'download'> {
  const filename = defaultBackupFilename();
  const json = backupToJson(backup);
  const file = new File([json], filename, {
    type: 'application/json',
  });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'BabyWise backup',
          text: 'BabyWise local data backup',
        });
        return 'share';
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // User cancelled — still offer nothing further
        throw e;
      }
      // Fall through to download
    }
  }

  downloadBackupFile(filename, backup);
  return 'download';
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asEvents(raw: unknown): CalendarEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is CalendarEvent =>
      isObject(e) && typeof e.id === 'string' && typeof e.title === 'string'
  ) as CalendarEvent[];
}

function asAskHistory(raw: unknown): AskHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is AskHistoryItem =>
      isObject(e) &&
      typeof e.id === 'string' &&
      typeof e.query === 'string' &&
      isObject(e.result)
  ) as AskHistoryItem[];
}

function asProfile(raw: unknown): PregnancyProfile | null {
  if (!isObject(raw)) return null;
  if (raw.method !== 'lmp' && raw.method !== 'due_date') return null;
  return raw as unknown as PregnancyProfile;
}

function asSettings(raw: unknown): AppSettings | null {
  if (!isObject(raw)) return null;
  const base = getDefaultSettings();
  return {
    ...base,
    ...(raw as Partial<AppSettings>),
    ai: {
      ...base.ai,
      ...(isObject(raw.ai) ? (raw.ai as AppSettings['ai']) : {}),
    },
  };
}

/** Parse and validate a backup JSON string or object. */
export function parseBackup(raw: unknown): BabywiseBackup | null {
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isObject(obj)) return null;
  if (obj.format !== BACKUP_FORMAT) return null;
  if (obj.version !== 1 && obj.version !== BACKUP_VERSION) return null;
  if (!isObject(obj.data)) return null;

  const data = obj.data;
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt:
      typeof obj.exportedAt === 'string'
        ? obj.exportedAt
        : new Date().toISOString(),
    appVersion:
      typeof obj.appVersion === 'string' ? obj.appVersion : APP_VERSION,
    data: {
      profile: asProfile(data.profile),
      events: asEvents(data.events),
      settings: asSettings(data.settings),
      askHistory: asAskHistory(data.askHistory),
      disclaimerAck:
        typeof data.disclaimerAck === 'string' ? data.disclaimerAck : null,
    },
  };
}

/**
 * Apply a validated backup into localStorage.
 * - replace: overwrite profile, events, settings, ask history
 * - mergeEvents: keep profile/settings; union events + ask history by id
 */
export function applyBackup(
  backup: BabywiseBackup,
  mode: BackupImportMode = 'replace'
): BackupImportResult {
  const { data } = backup;
  const hasAnything =
    data.profile ||
    data.events.length > 0 ||
    data.settings ||
    data.askHistory.length > 0;
  if (!hasAnything) {
    return { ok: false, reason: 'empty' };
  }

  if (mode === 'replace') {
    if (data.profile) saveProfile(data.profile);
    saveEvents(data.events);
    if (data.settings) saveSettings(data.settings);
    saveAskHistory(data.askHistory);
    if (data.disclaimerAck) writeDisclaimerAck(data.disclaimerAck);
  } else {
    // mergeEvents: append events / history that don't collide on id
    const existing = getEvents();
    const ids = new Set(existing.map((e) => e.id));
    const merged = [...existing];
    for (const e of data.events) {
      if (!ids.has(e.id)) {
        merged.push(e);
        ids.add(e.id);
      } else {
        // Same id — keep imported (newer backup often intended)
        const idx = merged.findIndex((x) => x.id === e.id);
        if (idx >= 0) merged[idx] = e;
      }
    }
    saveEvents(merged);

    const hist = getAskHistory();
    const hIds = new Set(hist.map((h) => h.id));
    const mergedHist = [...hist];
    for (const h of data.askHistory) {
      if (!hIds.has(h.id)) {
        mergedHist.push(h);
        hIds.add(h.id);
      }
    }
    saveAskHistory(mergedHist.slice(0, 30));

    // Optionally fill missing profile from backup
    if (data.profile && !getProfile()) {
      saveProfile(data.profile);
    }
  }

  return {
    ok: true,
    mode,
    profile: Boolean(data.profile),
    events: data.events.length,
    settings: Boolean(data.settings),
    askHistory: data.askHistory.length,
  };
}

export async function readBackupFile(file: File): Promise<BackupImportResult | { ok: false; reason: 'parse' } | { ok: true; preview: BabywiseBackup }> {
  try {
    const text = await file.text();
    const backup = parseBackup(text);
    if (!backup) return { ok: false, reason: 'parse' };
    return { ok: true, preview: backup };
  } catch {
    return { ok: false, reason: 'parse' };
  }
}
