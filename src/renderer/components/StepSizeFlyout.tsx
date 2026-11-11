import { type RefObject } from 'react';
import { ToolOptionsFlyout } from './ToolOptionsFlyout';

interface StepSizeFlyoutProps {
  anchorRef: RefObject<HTMLElement>;
  size: number;
  onChange: (size: number) => void;
}


export default function StepSizeFlyout({ anchorRef, size, onChange }: StepSizeFlyoutProps) {
  return <ToolOptionsFlyout anchorRef={anchorRef} label="Step options" className="step-size-flyout">
      {[{ label: 'S', diameter: 32 }, { label: 'M', diameter: 40 }, { label: 'L', diameter: 56 }].map(({ label, diameter }) => (
        <button
          key={label}
          type="button"
          className={`tool-btn ${size === diameter ? 'active' : ''}`}
          aria-label={`Step size ${label}`}
          aria-pressed={size === diameter}
          onClick={() => onChange(diameter)}
        >
          {label}
        </button>
      ))}
  </ToolOptionsFlyout>;
}
