import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
};

function parseIso(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 12, 0, 0, 0);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Monday-first index 0..6 for a date */
function mondayIndex(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDisplay(iso: string, locale: string): string {
  const d = parseIso(iso);
  if (!d) return '';
  try {
    return d.toLocaleDateString(locale.startsWith('zh') ? 'zh-Hant' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return iso;
  }
}

/**
 * Large custom calendar picker (no native type=date overlap issues).
 * Value is ISO YYYY-MM-DD. Picker portals to document.body so placement
 * matches everywhere (home profile, calendar add/edit).
 */
export function StyledDateField({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(selected ?? new Date())
  );

  const locale =
    typeof document !== 'undefined'
      ? document.documentElement.lang || 'en'
      : 'en';

  const minD = min ? parseIso(min) : null;
  const maxD = max ? parseIso(max) : null;

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const lead = mondayIndex(first);
    const total = daysInMonth(viewMonth);
    const out: Array<{ date: Date; inMonth: boolean } | null> = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let day = 1; day <= total; day++) {
      out.push({
        date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day, 12),
        inMonth: true,
      });
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewMonth]);

  const monthTitle = viewMonth.toLocaleDateString(
    locale.startsWith('zh') ? 'zh-Hant' : 'en',
    { month: 'long', year: 'numeric' }
  );

  const weekdays = locale.startsWith('zh')
    ? ['一', '二', '三', '四', '五', '六', '日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const isDisabled = (d: Date) => {
    const t = d.getTime();
    if (minD && t < minD.getTime()) return true;
    if (maxD && t > maxD.getTime()) return true;
    return false;
  };

  const isSelected = (d: Date) =>
    selected != null &&
    d.getFullYear() === selected.getFullYear() &&
    d.getMonth() === selected.getMonth() &&
    d.getDate() === selected.getDate();

  const isToday = (d: Date) => {
    const n = new Date();
    return (
      d.getFullYear() === n.getFullYear() &&
      d.getMonth() === n.getMonth() &&
      d.getDate() === n.getDate()
    );
  };

  const openPicker = () => {
    setViewMonth(startOfMonth(selected ?? new Date()));
    setOpen(true);
  };

  const pick = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(toIso(d));
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const display = value
    ? formatDisplay(value, locale)
    : locale.startsWith('zh')
      ? '選擇日期'
      : 'Choose a date';

  const picker =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="date-picker-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              className="date-picker-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={label || 'Date'}
            >
              <div className="date-picker-handle" />
              <div className="date-picker-nav">
                <button
                  type="button"
                  className="date-picker-nav-btn"
                  aria-label="Previous month"
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="date-picker-month-title">{monthTitle}</div>
                <button
                  type="button"
                  className="date-picker-nav-btn"
                  aria-label="Next month"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight size={22} />
                </button>
              </div>

              <div className="date-picker-weekdays">
                {weekdays.map((w) => (
                  <div key={w} className="date-picker-wd">
                    {w}
                  </div>
                ))}
              </div>

              <div className="date-picker-grid">
                {cells.map((cell, i) => {
                  if (!cell) {
                    return (
                      <div key={`e-${i}`} className="date-picker-cell is-empty" />
                    );
                  }
                  const disabled = isDisabled(cell.date);
                  const selectedDay = isSelected(cell.date);
                  const today = isToday(cell.date);
                  return (
                    <button
                      key={toIso(cell.date)}
                      type="button"
                      disabled={disabled}
                      className={[
                        'date-picker-cell',
                        selectedDay ? 'is-selected' : '',
                        today ? 'is-today' : '',
                        disabled ? 'is-disabled' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => pick(cell.date)}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="date-picker-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const t = new Date();
                    if (!isDisabled(t)) {
                      onChange(toIso(t));
                      setViewMonth(startOfMonth(t));
                    }
                    setOpen(false);
                  }}
                >
                  {locale.startsWith('zh') ? '今天' : 'Today'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setOpen(false)}
                >
                  {locale.startsWith('zh') ? '完成' : 'Done'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="field">
      {label && (
        <label htmlFor={id} id={id ? `${id}-label` : undefined}>
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        className="ui-date-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={id && label ? `${id}-label` : undefined}
        onClick={openPicker}
      >
        <Calendar size={20} className="ui-date-trigger-icon" aria-hidden />
        <span className={`ui-date-trigger-text ${value ? '' : 'is-empty'}`}>
          {display}
        </span>
      </button>
      {picker}
    </div>
  );
}
