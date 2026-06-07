import { useAppContext } from '../AppContext';
import InspectorSection from './InspectorSection';
import { Sparkles } from 'lucide-react';
import FontSelector from './FontSelector';

export default function ExtraSettings() {
  const {
    chromeStyle, setChromeStyle,
    chromeTheme, setChromeTheme,
    annotationColor, setAnnotationColor,
    annotationStrokeWidth, setAnnotationStrokeWidth,
    annotations, setAnnotations,
    watermarkEnabled, setWatermarkEnabled,
    watermarkText, setWatermarkText,
    watermarkSize, setWatermarkSize,
    watermarkPosition, setWatermarkPosition,
    watermarkOpacity, setWatermarkOpacity,
    watermarkFont = 'sans-serif', setWatermarkFont,
    watermarkBold = false, setWatermarkBold,
    watermarkItalic = false, setWatermarkItalic,
    annotationFont = 'sans-serif', setAnnotationFont,
    annotationFontSize = 24, setAnnotationFontSize,
    annotationBold = true, setAnnotationBold,
    annotationItalic = false, setAnnotationItalic,
    systemFonts = [],
    getCurrentConfig, pushHistory, handleSliderRelease
  } = useAppContext();

  return (
    <InspectorSection title="Extras" icon={<Sparkles className="w-3.5 h-3.5" />}>
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
                color: chromeTheme === 'dark' ? 'var(--on-accent)' : 'var(--text-secondary)',
                height: '28px',
                padding: 0,
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
                color: chromeTheme === 'light' ? 'var(--on-accent)' : 'var(--text-secondary)',
                height: '28px',
                padding: 0,
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
            className="input-sm"
            style={{ flex: 1 }}
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

        {/* Font style controls for text tool */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span className="control-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Font Family</span>
            <FontSelector
              value={annotationFont}
              onChange={(val) => {
                setAnnotationFont(val);
                pushHistory({ ...getCurrentConfig(), annotationFont: val });
              }}
              systemFonts={systemFonts}
              styleType="sidebar"
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <div className="control-label-container">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Font Size</span>
                <span className="control-value">{annotationFontSize}px</span>
              </div>
              <input 
                type="range" 
                min="12" 
                max="72" 
                value={annotationFontSize} 
                onChange={(e) => {
                  setAnnotationFontSize(parseInt(e.target.value, 10));
                }}
                onMouseUp={handleSliderRelease}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '4px', alignSelf: 'flex-end', height: '28px' }}>
              <button
                className={`btn btn-secondary ${annotationBold ? 'active' : ''}`}
                style={{
                  padding: '0 8px',
                  fontWeight: 'bold',
                  backgroundColor: annotationBold ? 'var(--accent)' : 'var(--surface-2)',
                  color: annotationBold ? 'var(--on-accent)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '4px',
                }}
                onClick={() => {
                  setAnnotationBold(!annotationBold);
                  pushHistory({ ...getCurrentConfig(), annotationBold: !annotationBold });
                }}
                title="Bold"
              >
                B
              </button>
              <button
                className={`btn btn-secondary ${annotationItalic ? 'active' : ''}`}
                style={{
                  padding: '0 8px',
                  fontStyle: 'italic',
                  backgroundColor: annotationItalic ? 'var(--accent)' : 'var(--surface-2)',
                  color: annotationItalic ? 'var(--on-accent)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '4px',
                }}
                onClick={() => {
                  setAnnotationItalic(!annotationItalic);
                  pushHistory({ ...getCurrentConfig(), annotationItalic: !annotationItalic });
                }}
                title="Italic"
              >
                I
              </button>
            </div>
          </div>
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
          <>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
              <span className="control-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Font Family</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <select 
                  value={watermarkFont} 
                  onChange={(e) => {
                    setWatermarkFont(e.target.value);
                    pushHistory({ ...getCurrentConfig(), watermarkFont: e.target.value });
                  }}
                  style={{ flex: 1 }}
                >
                  {systemFonts.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <button
                  className={`btn btn-secondary ${watermarkBold ? 'active' : ''}`}
                  style={{
                    padding: '0 8px',
                    fontWeight: 'bold',
                    backgroundColor: watermarkBold ? 'var(--accent)' : 'var(--surface-2)',
                    color: watermarkBold ? 'var(--on-accent)' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '4px',
                    height: '28px',
                  }}
                  onClick={() => {
                    setWatermarkBold(!watermarkBold);
                    pushHistory({ ...getCurrentConfig(), watermarkBold: !watermarkBold });
                  }}
                  title="Bold"
                >
                  B
                </button>
                <button
                  className={`btn btn-secondary ${watermarkItalic ? 'active' : ''}`}
                  style={{
                    padding: '0 8px',
                    fontStyle: 'italic',
                    backgroundColor: watermarkItalic ? 'var(--accent)' : 'var(--surface-2)',
                    color: watermarkItalic ? 'var(--on-accent)' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '4px',
                    height: '28px',
                  }}
                  onClick={() => {
                    setWatermarkItalic(!watermarkItalic);
                    pushHistory({ ...getCurrentConfig(), watermarkItalic: !watermarkItalic });
                  }}
                  title="Italic"
                >
                  I
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
              <span className="control-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Position</span>
              <select 
                value={watermarkPosition} 
                onChange={(e) => {
                  const val = e.target.value as any;
                  setWatermarkPosition(val);
                  pushHistory({ ...getCurrentConfig(), watermarkPosition: val });
                }}
              >
                <option value="left">Bottom Left</option>
                <option value="middle">Bottom Center</option>
                <option value="right">Bottom Right</option>
                <option value="top left">Top Left</option>
                <option value="top middle">Top Center</option>
                <option value="top right">Top Right</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
              <div className="control-label-container">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Font Size</span>
                <span className="control-value">{watermarkSize}px</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="40" 
                value={watermarkSize} 
                onChange={(e) => setWatermarkSize(parseInt(e.target.value, 10))}
                onMouseUp={handleSliderRelease}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
              <div className="control-label-container">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Opacity</span>
                <span className="control-value">{Math.round(watermarkOpacity * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={Math.round(watermarkOpacity * 100)} 
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value) / 100)}
                onMouseUp={handleSliderRelease}
              />
            </div>
          </>
        )}
      </div>
    </InspectorSection>
  );
}
