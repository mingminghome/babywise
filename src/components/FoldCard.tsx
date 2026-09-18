import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { STORAGE_PREFIX } from '../core/storage/keys';
import type { TFunction } from '../core/i18n';

type Props = {
  foldId: string;
  title: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
  defaultOpen?: boolean;
  t: TFunction;
};

function readFold(id: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}fold_${id}`);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function FoldCard({
  foldId,
  title,
  headerExtra,
  children,
  className = 'card span-2',
  titleClassName = 'section-title',
  defaultOpen = true,
  t,
}: Props) {
  const [open, setOpen] = useState(() => readFold(foldId, defaultOpen));

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`${STORAGE_PREFIX}fold_${foldId}`, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <section className={`fold-card ${className}`.trim()}>
      <div className="fold-card-head">
        <h2 className={titleClassName}>{title}</h2>
        <div className="fold-card-tools">
          {open ? headerExtra : null}
          <button
            type="button"
            className="fold-card-toggle"
            onClick={toggle}
            aria-expanded={open}
            title={open ? t('common.fold') : t('common.unfold')}
            aria-label={open ? t('common.fold') : t('common.unfold')}
          >
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>
      {open ? <div className="fold-card-body">{children}</div> : null}
    </section>
  );
}
