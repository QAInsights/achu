import { useEffect, useId, useRef, useState } from 'react';

interface RangeControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  disabled?: boolean;
  action?: React.ReactNode;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  children?: React.ReactNode;
}

export default function RangeControl({
  label, value, min, max, unit = 'px', disabled = false,
  action, onChange, onCommit, children,
}: RangeControlProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const pending = useRef<number | null>(null);

  useEffect(() => { setDraft(String(value)); }, [value]);

  const commitSlider = () => {
    if (pending.current === null) return;
    const next = pending.current;
    pending.current = null;
    onCommit(next);
  };

  const commitNumber = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = Math.max(min, Math.min(max, Math.round(parsed)));
    setDraft(String(next));
    if (next !== value) {
      onChange(next);
      onCommit(next);
    }
  };

  return (
    <div className={`control-group range-control ${disabled ? 'is-disabled' : ''}`}>
      <div className="control-label-container">
        <label className="control-label" htmlFor={id}>{label}</label>
        <div className="range-control-actions">
          {action}
          <div className="range-number-field">
            <input
              type="number"
              aria-label={`${label} value`}
              min={min}
              max={max}
              step={1}
              value={draft}
              disabled={disabled}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitNumber}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitNumber();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setDraft(String(value));
                }
              }}
            />
            <span aria-hidden="true">{unit}</span>
          </div>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        aria-valuetext={`${value}${unit}`}
        onChange={(e) => {
          const next = Number(e.target.value);
          pending.current = next;
          onChange(next);
        }}
        onPointerUp={commitSlider}
        onPointerCancel={commitSlider}
        onKeyUp={commitSlider}
        onBlur={commitSlider}
      />
      {children}
    </div>
  );
}
