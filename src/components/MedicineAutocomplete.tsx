import { useMemo, useState } from 'react';
import { suggestMedicines } from '../core/medicine/suggest';
import type { Locale, MedicineEntry } from '../core/types';

type Props = {
  value: string;
  locale: Locale;
  placeholder?: string;
  onChange: (value: string, medicine?: MedicineEntry) => void;
};

export function MedicineAutocomplete({ value, locale, placeholder, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(
    () => (open ? suggestMedicines(value, locale) : []),
    [value, locale, open]
  );

  return (
    <div className="autocomplete">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // allow click on suggestion
          window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && suggestions.length > 0 && (
        <div className="autocomplete-list" role="listbox">
          {suggestions.map((s) => (
            <button
              key={s.key}
              type="button"
              role="option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s.label, s);
                setOpen(false);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
