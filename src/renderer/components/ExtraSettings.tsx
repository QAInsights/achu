import { useAppContext } from '../AppContext';
import InspectorSection from './InspectorSection';

export default function ExtraSettings() {
  const {
    chromeStyle, setChromeStyle,
    chromeTheme, setChromeTheme,
    annotationColor, setAnnotationColor,
    annotationStrokeWidth, setAnnotationStrokeWidth,
    annotations, setAnnotations,
    watermarkEnabled, setWatermarkEnabled,
    watermarkText, setWatermarkText,
    getCurrentConfig, pushHistory
  } = useAppContext();

  return (
    <InspectorSection title="Extras">
      {/* Browser Chrome Overlay */}
      <div className="control-group">
        <span className="control-label">Browser Mockup</span>
        <select value={chromeStyle} onChange={(e) => {
          setChromeStyle(e.target.value as any);
          pushHistory({ ...getCurrentConfig(), chromeStyle: e.target.value as any });
        }}>
          <option value="none">None</option>
          <option value="mac">macOS Style</option>
          <option value="windows">Windows Style</option>
        </select>

        {chromeStyle !== 'none' && (
          <div style={{ display: 'flex', gap: '1px', background: 'var(--border)', borderRadius: '6px', overflow: 'hidden', marginTop: '0.5rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ 
                flex: 1, 
                border: 'none', 
                borderRadius: '0', 
                backgroundColor: chromeTheme === 'dark' ? 'var(--accent)' : 'var(--surface-2)',
                color: chromeTheme === 'dark' ? 'white' : 'var(--text-secondary)',
                padding: '0.3rem',
                fontSize: '0.8rem'
              }}
              onClick={() => {
                setChromeTheme('dark');
                pushHistory({ ...getCurrentConfig(), chromeTheme: 'dark' });
              }}
            >
              Dark Theme
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ 
                flex: 1, 
                border: 'none', 
                borderRadius: '0', 
                backgroundColor: chromeTheme === 'light' ? 'var(--accent)' : 'var(--surface-2)',
                color: chromeTheme === 'light' ? 'white' : 'var(--text-secondary)',
                padding: '0.3rem',
                fontSize: '0.8rem'
              }}
              onClick={() => {
                setChromeTheme('light');
                pushHistory({ ...getCurrentConfig(), chromeTheme: 'light' });
              }}
            >
              Light Theme
            </button>
          </div>
        )}
      </div>

      {/* Annotation Tools settings */}
      <div className="control-group">
        <span className="control-label">Annotation Style</span>
        <div className="color-picker-row">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Color:</span>
          <input 
            type="color" 
            value={annotationColor} 
            onChange={(e) => setAnnotationColor(e.target.value)} 
            className="color-swatch-picker"
          />
          <input 
            type="text" 
            value={annotationColor} 
            onChange={(e) => setAnnotationColor(e.target.value)} 
            style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div className="control-label-container">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Size</span>
            <span className="control-value">{annotationStrokeWidth}px</span>
          </div>
          <input 
            type="range" 
            min="2" 
            max="16" 
            value={annotationStrokeWidth} 
            onChange={(e) => setAnnotationStrokeWidth(parseInt(e.target.value, 10))}
          />
        </div>
        {annotations.length > 0 && (
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem', fontSize: '0.8rem', marginTop: '0.25rem' }} 
            onClick={() => {
              setAnnotations([]);
              pushHistory({ ...getCurrentConfig(), annotations: [] });
            }}
          >
            Clear Annotations
          </button>
        )}
      </div>

      {/* Watermark Section */}
      <div className="control-group" style={{ paddingBottom: '2rem' }}>
        <div className="switch-container">
          <span className="control-label">Watermark</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={watermarkEnabled} 
              onChange={(e) => {
                setWatermarkEnabled(e.target.checked);
                pushHistory({ ...getCurrentConfig(), watermarkEnabled: e.target.checked });
              }} 
            />
            <span className="slider-switch"></span>
          </label>
        </div>
        {watermarkEnabled && (
          <input 
            type="text" 
            placeholder="Watermark text..." 
            value={watermarkText} 
            onChange={(e) => {
              setWatermarkText(e.target.value);
            }}
            onBlur={() => pushHistory(getCurrentConfig())}
            style={{ marginTop: '0.5rem' }}
          />
        )}
      </div>
    </InspectorSection>
  );
}
