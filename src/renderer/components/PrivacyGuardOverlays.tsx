import { RedactionItem } from '../canvasRenderer';

interface PrivacyGuardOverlaysProps {
  redactions: RedactionItem[];
  redactionStyle: 'blur' | 'solid';
  imageSrc: string | null;
  hoveredRedactionId: string | null;
  setHoveredRedactionId: (id: string | null) => void;
  toggleRedaction: (id: string) => void;
}

export default function PrivacyGuardOverlays({
  redactions,
  redactionStyle,
  imageSrc,
  hoveredRedactionId,
  setHoveredRedactionId,
  toggleRedaction,
}: PrivacyGuardOverlaysProps) {
  if (!redactions || redactions.length === 0 || !redactions.some((r) => r.status === 'redacted')) {
    return null;
  }

  return (
    <>
      {/* SVG Blur Overlay for Privacy Guard when style is blur */}
      {redactionStyle === 'blur' && (
        <svg
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 15,
          }}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="privacy-guard-blur">
              <feGaussianBlur stdDeviation="15" />
            </filter>
            <clipPath id="privacy-guard-clip">
              {redactions
                .filter((item) => item.status === 'redacted')
                .map((item) => (
                  <rect
                    key={item.id}
                    x={item.x * 1000}
                    y={item.y * 1000}
                    width={item.w * 1000}
                    height={item.h * 1000}
                  />
                ))}
            </clipPath>
          </defs>
          <image
            href={imageSrc || ''}
            width="1000"
            height="1000"
            preserveAspectRatio="none"
            clipPath="url(#privacy-guard-clip)"
            filter="url(#privacy-guard-blur)"
          />
        </svg>
      )}

      {/* SVG Solid Block Overlay for Privacy Guard */}
      {redactionStyle === 'solid' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 15,
          }}
        >
          {redactions
            .filter((item) => item.status === 'redacted')
            .map((item) => (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  left: `${item.x * 100}%`,
                  top: `${item.y * 100}%`,
                  width: `${item.w * 100}%`,
                  height: `${item.h * 100}%`,
                  backgroundColor: '#000000',
                  border: hoveredRedactionId === item.id ? '2px dashed #3b82f6' : 'none',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRedaction(item.id);
                }}
                onMouseEnter={() => setHoveredRedactionId(item.id)}
                onMouseLeave={() => setHoveredRedactionId(null)}
              />
            ))}
        </div>
      )}
    </>
  );
}
