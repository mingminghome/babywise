import { useRef, useState } from 'react';
import { Download, FileUp, Share2 } from 'lucide-react';
import {
  defaultBackupFilename,
  downloadBackupFile,
  parseBackup,
  shareOrDownloadBackup,
  type BackupImportMode,
} from '../core/storage/backup';
import type { TFunction } from '../core/i18n';
import type { AppState } from '../hooks/useAppState';

/**
 * Export / import local BabyWise data as JSON (device-to-device backup).
 * Complements day share/copy — full diary portability.
 */
export function DataBackupPanel({
  t,
  exportBackup,
  importBackup,
}: {
  t: TFunction;
  exportBackup: AppState['exportBackup'];
  importBackup: AppState['importBackup'];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<BackupImportMode>('replace');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 4000);
  };

  const onExportDownload = () => {
    try {
      const backup = exportBackup();
      downloadBackupFile(defaultBackupFilename(), backup);
      flash(t('settings.backupExportDone'));
    } catch {
      flash(t('settings.backupExportFailed'));
    }
  };

  const onExportShare = async () => {
    setBusy(true);
    try {
      const backup = exportBackup();
      const via = await shareOrDownloadBackup(backup);
      flash(
        via === 'share'
          ? t('settings.backupShareDone')
          : t('settings.backupExportDone')
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // cancelled
      } else {
        flash(t('settings.backupExportFailed'));
      }
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (file: File | null | undefined) => {
    if (!file) return;
    setPendingFile(file);
    setConfirmImport(true);
    setMsg(null);
  };

  const runImport = async () => {
    if (!pendingFile) return;
    setBusy(true);
    try {
      const text = await pendingFile.text();
      const preview = parseBackup(text);
      if (!preview) {
        flash(t('settings.backupImportInvalid'));
        setConfirmImport(false);
        setPendingFile(null);
        return;
      }
      const result = importBackup(preview, mode);
      if (!result.ok) {
        flash(
          result.reason === 'empty'
            ? t('settings.backupImportEmpty')
            : t('settings.backupImportInvalid')
        );
      } else {
        flash(
          t('settings.backupImportDone', {
            n: result.events,
            mode:
              mode === 'replace'
                ? t('settings.backupModeReplace')
                : t('settings.backupModeMerge'),
          })
        );
      }
    } catch {
      flash(t('settings.backupImportInvalid'));
    } finally {
      setBusy(false);
      setConfirmImport(false);
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="card span-2 backup-panel">
      <h2 className="section-title">
        <Share2 size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
        {t('settings.backupTitle')}
      </h2>
      <p className="muted backup-hint">{t('settings.backupHint')}</p>

      <div className="backup-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={onExportDownload}
        >
          <Download size={16} />
          {t('settings.backupExport')}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => void onExportShare()}
        >
          <Share2 size={16} />
          {t('settings.backupShare')}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <FileUp size={16} />
          {t('settings.backupImport')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => onPickFile(e.target.files?.[0])}
        />
      </div>

      <div className="field backup-mode" style={{ marginTop: 12, marginBottom: 0 }}>
        <label>{t('settings.backupImportMode')}</label>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${mode === 'replace' ? 'active' : ''}`}
            onClick={() => setMode('replace')}
          >
            {t('settings.backupModeReplace')}
          </button>
          <button
            type="button"
            className={`chip ${mode === 'mergeEvents' ? 'active' : ''}`}
            onClick={() => setMode('mergeEvents')}
          >
            {t('settings.backupModeMerge')}
          </button>
        </div>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 6 }}>
          {mode === 'replace'
            ? t('settings.backupModeReplaceHint')
            : t('settings.backupModeMergeHint')}
        </p>
      </div>

      {confirmImport && pendingFile ? (
        <div className="backup-confirm stack" style={{ marginTop: 12 }}>
          <p className="muted">
            {t('settings.backupImportConfirm', {
              name: pendingFile.name,
              mode:
                mode === 'replace'
                  ? t('settings.backupModeReplace')
                  : t('settings.backupModeMerge'),
            })}
          </p>
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                setConfirmImport(false);
                setPendingFile(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
            >
              {t('settings.cleanCancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void runImport()}
            >
              {t('settings.backupImportConfirmBtn')}
            </button>
          </div>
        </div>
      ) : null}

      {msg ? (
        <div className="clean-result" role="status" style={{ marginTop: 10 }}>
          {msg}
        </div>
      ) : null}
    </section>
  );
}
