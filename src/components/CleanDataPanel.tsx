import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { StyledRadioGroup } from './ui/StyledRadioGroup';
import type { DataCategory } from '../core/types';
import type { TFunction } from '../core/i18n';

type Summary = {
  hasProfile: boolean;
  eventCount: number;
  askCount: number;
  hasCustomSettings: boolean;
  keyCount: number;
};

type Props = {
  t: TFunction;
  summary: Summary;
  onClean: (category: DataCategory) => void;
  /** Called after a successful clean (e.g. navigate home when “all”). */
  onCleaned?: (category: DataCategory) => void;
};

const OPTIONS: Array<{ id: DataCategory; labelKey: string }> = [
  { id: 'all', labelKey: 'settings.cleanAll' },
  { id: 'profile', labelKey: 'settings.cleanProfile' },
  { id: 'events', labelKey: 'settings.cleanEvents' },
  { id: 'askHistory', labelKey: 'settings.cleanAsk' },
  { id: 'settings', labelKey: 'settings.cleanSettings' },
];

export function CleanDataPanel({ t, summary, onClean, onCleaned }: Props) {
  const [category, setCategory] = useState<DataCategory>('all');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleClean = () => {
    onClean(category);
    setConfirming(false);

    const msg =
      category === 'all'
        ? t('settings.cleanDoneAll')
        : category === 'profile'
          ? t('settings.cleanDoneProfile')
          : category === 'events'
            ? t('settings.cleanDoneEvents')
            : category === 'askHistory'
              ? t('settings.cleanDoneAsk')
              : t('settings.cleanDoneSettings');

    setResult(msg);
    onCleaned?.(category);

    window.setTimeout(() => setResult(null), 3500);
  };

  return (
    <div className="clean-panel">
      <h3>
        <Trash2 size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
        {t('settings.cleanData')}
      </h3>
      <p className="muted">{t('settings.cleanDataHint')}</p>

      <div className="card-soft" style={{ marginTop: '0.75rem' }}>
        <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>
          {t('settings.dataSummary')}
        </div>
        {summary.keyCount === 0 ? (
          <p className="muted">{t('settings.dataNone')}</p>
        ) : (
          <ul className="muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
            <li>
              {t('settings.dataProfile')}:{' '}
              {summary.hasProfile ? t('common.present') : t('common.missing')}
            </li>
            <li>{t('settings.dataEvents', { n: summary.eventCount })}</li>
            <li>{t('settings.dataAsk', { n: summary.askCount })}</li>
            <li>
              {t('settings.dataSettings')}:{' '}
              {summary.hasCustomSettings ? t('common.present') : t('common.missing')}
            </li>
          </ul>
        )}
      </div>

      <div className="clean-options">
        <StyledRadioGroup
          name="clean-category"
          aria-label={t('settings.cleanData')}
          value={category}
          onChange={(v) => {
            setCategory(v as DataCategory);
            setConfirming(false);
          }}
          options={OPTIONS.map((opt) => ({
            value: opt.id,
            label: t(opt.labelKey),
          }))}
        />
      </div>

      {!confirming ? (
        <button
          type="button"
          className="btn btn-danger btn-block"
          disabled={summary.keyCount === 0}
          onClick={() => setConfirming(true)}
        >
          <Trash2 size={16} />
          {t('settings.cleanData')}
        </button>
      ) : (
        <div className="stack">
          <p className="muted">
            {category === 'all'
              ? t('settings.cleanConfirmAll')
              : t('settings.cleanConfirmBody')}
          </p>
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirming(false)}
            >
              {t('settings.cleanCancel')}
            </button>
            <button type="button" className="btn btn-danger" onClick={handleClean}>
              {t('settings.cleanConfirm')}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="clean-result" role="status">
          {result}
        </div>
      )}
    </div>
  );
}
