import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type SelectOption = { value: string; label: string };

type Props = {
  id?: string;
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

type MenuPos = { top: number; left: number; width: number; maxHeight: number };

/**
 * Custom dropdown (no native &lt;select&gt;) matching BabyWise form chrome.
 */
export function StyledSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: Props) {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const labelId = `${triggerId}-label`;
  const listId = `${triggerId}-list`;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [highlight, setHighlight] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? value;

  const updatePos = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - r.bottom - gap - 12;
    const spaceAbove = r.top - gap - 12;
    const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(280, Math.max(120, preferBelow ? spaceBelow : spaceAbove));
    const top = preferBelow
      ? r.bottom + gap
      : Math.max(12, r.top - gap - maxHeight);
    setPos({
      top,
      left: r.left,
      width: r.width,
      maxHeight,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    const idx = options.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
  }, [open, value, options]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePos();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(options.length - 1, h + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setHighlight(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        setHighlight(options.length - 1);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const opt = options[highlight];
        if (opt) {
          onChange(opt.value);
          setOpen(false);
          triggerRef.current?.focus();
        }
      }
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open, options, highlight, onChange]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const item = menuRef.current.querySelector<HTMLElement>(
      `[data-idx="${highlight}"]`
    );
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const menu =
    open && pos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            className="ui-select-menu"
            role="listbox"
            aria-labelledby={label ? labelId : undefined}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
          >
            {options.map((o, i) => {
              const on = o.value === value;
              const hi = i === highlight;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  data-idx={i}
                  aria-selected={on}
                  className={[
                    'ui-select-option',
                    on ? 'is-selected' : '',
                    hi ? 'is-highlight' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(o.value)}
                >
                  <span className="ui-select-option-label">{o.label}</span>
                  {on && (
                    <Check size={16} strokeWidth={2.5} className="ui-select-check" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="field">
      {label && (
        <label id={labelId} htmlFor={triggerId}>
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={`ui-select-trigger ${open ? 'is-open' : ''}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={label ? labelId : undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) setOpen(true);
          }
        }}
      >
        <span className="ui-select-value">{display}</span>
        <ChevronDown
          size={18}
          className={`ui-select-icon ${open ? 'is-open' : ''}`}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}
