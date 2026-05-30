import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface InspectorSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function InspectorSection({ title, children, defaultOpen = true }: InspectorSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`inspector-section ${open ? 'open' : ''}`}>
      <div className="inspector-section-header" onClick={() => setOpen(!open)}>
        <span className="inspector-section-title">{title}</span>
        <ChevronDown className="inspector-section-chevron w-4 h-4" />
      </div>
      <div className="inspector-section-content">
        <div className="inspector-section-inner">
          <div className="inspector-section-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
