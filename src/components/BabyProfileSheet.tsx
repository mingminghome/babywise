import { useState } from 'react';
import { createPortal } from 'react-dom';
import { StyledDateField } from './ui/StyledDateField';
import { X } from 'lucide-react';
import { todayIso } from '../core/pregnancy/engine';
import type { TFunction } from '../core/i18n';
import { HAIR_SWATCH, SKIN_SWATCH } from '../core/baby/mascot';
import type {
  BabyHairColor,
  BabyProfile,
  BabySex,
  BabySkinTone,
  FeedMethod,
  Locale,
} from '../core/types';
import { BABY_HAIR_COLORS, BABY_SKIN_TONES } from '../core/types';

type Props = {
  t: TFunction;
  locale: Locale;
  editing?: BabyProfile | null;
  onClose: () => void;
  onSave: (
    input: Omit<BabyProfile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => void;
  onDelete?: (id: string) => void;
  fromPregnancy?: boolean;
};

const SEX: BabySex[] = ['girl', 'boy', 'unspecified'];

export function BabyProfileSheet({
  t,
  locale: _locale,
  editing,
  onClose,
  onSave,
  onDelete,
  fromPregnancy = false,
}: Props) {
  const [name, setName] = useState(editing?.name ?? '');
  const [birthDate, setBirthDate] = useState(editing?.birthDate ?? todayIso());
  const [birthTime, setBirthTime] = useState(editing?.birthTime ?? '');
  const [sex, setSex] = useState<BabySex>(editing?.sex ?? 'unspecified');
  const [skinTone, setSkinTone] = useState<BabySkinTone>(
    editing?.skinTone ?? 'light'
  );
  const [hairColor, setHairColor] = useState<BabyHairColor>(
    editing?.hairColor ?? 'brown'
  );
  const [birthWeightKg, setBirthWeightKg] = useState(
    editing?.birthWeightKg != null ? String(editing.birthWeightKg) : ''
  );
  const [birthLengthCm, setBirthLengthCm] = useState(
    editing?.birthLengthCm != null ? String(editing.birthLengthCm) : ''
  );
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [gestWeek, setGestWeek] = useState(
    editing?.gestationalWeeksAtBirth != null
      ? String(editing.gestationalWeeksAtBirth)
      : ''
  );
  const [defaultFeedMethod, setDefaultFeedMethod] = useState<FeedMethod>(
    editing?.defaultFeedMethod ?? 'breast'
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = name.trim().length > 0 && Boolean(birthDate);

  const handleSave = () => {
    if (!canSave) return;
    const w = Number(birthWeightKg);
    const len = Number(birthLengthCm);
    onSave({
      id: editing?.id,
      name: name.trim(),
      birthDate,
      birthTime: birthTime.trim() || undefined,
      sex,
      skinTone,
      hairColor,
      birthWeightKg: birthWeightKg !== '' && Number.isFinite(w) ? w : undefined,
      birthLengthCm:
        birthLengthCm !== '' && Number.isFinite(len) ? len : undefined,
      gestationalWeeksAtBirth: (() => {
        const n = Number(gestWeek);
        if (gestWeek === '' || !Number.isFinite(n)) return undefined;
        return Math.min(42, Math.max(22, Math.round(n)));
      })(),
      defaultFeedMethod,
      notes: notes.trim() || undefined,
    });
  };

  return createPortal(
    <div
      className="sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-header-copy">
            <h2 className="sheet-title">
              {editing ? t('baby.edit') : t('baby.add')}
            </h2>
            {fromPregnancy && !editing ? (
              <p className="sheet-subtitle">
                {t('baby.fromPregnancyHint')}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            aria-label={t('calendar.cancel')}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="field-group">
          <div className="field-group-title">{t('baby.name')}</div>
          <div className="field">
            <label>{t('baby.name')}</label>
            <input
              type="text"
              value={name}
              placeholder={t('baby.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              autoFocus={!editing}
            />
          </div>

          <StyledDateField
            label={t('baby.birthDate')}
            value={birthDate}
            onChange={setBirthDate}
            max={todayIso()}
          />

          <div className="field">
            <label>{t('baby.birthTime')}</label>
            <input
              type="time"
              className="ui-time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            />
          </div>

          <div className="field">
            <label>{t('baby.sex')}</label>
            <div className="chip-row">
              {SEX.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`chip ${sex === id ? 'active' : ''}`}
                  onClick={() => setSex(id)}
                >
                  {id === 'girl'
                    ? t('baby.sexGirl')
                    : id === 'boy'
                      ? t('baby.sexBoy')
                      : t('baby.sexUnspecified')}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>{t('baby.defaultFeedMethod')}</label>
            <div className="chip-row">
              {(['breast', 'bottle', 'formula'] as FeedMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`chip ${defaultFeedMethod === m ? 'active' : ''}`}
                  onClick={() => setDefaultFeedMethod(m)}
                >
                  {m === 'breast'
                    ? t('baby.methodBreast')
                    : m === 'bottle'
                      ? t('baby.methodBottle')
                      : t('baby.methodFormula')}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
              {t('baby.defaultFeedMethodHint')}
            </p>
          </div>
        </div>

        <div className="field-group">
          <div className="field-group-title">{t('baby.skinTone')} & {t('baby.hairColor')}</div>
          <div className="field">
            <label>{t('baby.skinTone')}</label>
            <div className="swatch-row" role="radiogroup" aria-label={t('baby.skinTone')}>
              {BABY_SKIN_TONES.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={skinTone === id}
                  className={`swatch ${skinTone === id ? 'is-on' : ''}`}
                  style={{ backgroundColor: SKIN_SWATCH[id] }}
                  title={t(`baby.skin.${id}`)}
                  onClick={() => setSkinTone(id)}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label>{t('baby.hairColor')}</label>
            <div className="swatch-row" role="radiogroup" aria-label={t('baby.hairColor')}>
              {BABY_HAIR_COLORS.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={hairColor === id}
                  className={`swatch ${hairColor === id ? 'is-on' : ''}`}
                  style={{ backgroundColor: HAIR_SWATCH[id] }}
                  title={t(`baby.hair.${id}`)}
                  onClick={() => setHairColor(id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="field-group">
          <div className="field-group-title">{t('baby.bornAtWeek')} & {t('baby.notes')}</div>
          <div className="field">
            <label>{t('baby.birthWeight')}</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={birthWeightKg}
              onChange={(e) => setBirthWeightKg(e.target.value)}
            />
          </div>

          <div className="field">
            <label>{t('baby.birthLength')}</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={birthLengthCm}
              onChange={(e) => setBirthLengthCm(e.target.value)}
            />
          </div>

          <div className="field">
            <label>{t('baby.bornAtWeek')}</label>
            <input
              type="number"
              inputMode="numeric"
              min={22}
              max={42}
              placeholder="40"
              value={gestWeek}
              onChange={(e) => setGestWeek(e.target.value)}
            />
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
              {t('baby.bornAtWeekHint')}
            </p>
          </div>

          <div className="field">
            <label>{t('baby.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="sheet-actions-sticky">
          <div className="sheet-actions-row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('calendar.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSave}
              onClick={handleSave}
            >
              {t('baby.save')}
            </button>
          </div>

          {editing && onDelete && (
            <div className="baby-delete-row">
              {!confirmDelete ? (
                <button
                  type="button"
                  className="baby-delete-trigger"
                  onClick={() => setConfirmDelete(true)}
                >
                  {t('baby.delete')}
                </button>
              ) : (
                <div className="baby-delete-confirm">
                  <span className="baby-delete-confirm-text">
                    {t('baby.deleteConfirm', { name: editing.name })}
                  </span>
                  <div className="baby-delete-confirm-actions">
                    <button
                      type="button"
                      className="baby-delete-cancel"
                      onClick={() => setConfirmDelete(false)}
                    >
                      {t('calendar.cancel')}
                    </button>
                    <button
                      type="button"
                      className="baby-delete-confirm-btn"
                      onClick={() => onDelete(editing.id)}
                    >
                      {t('baby.delete')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
