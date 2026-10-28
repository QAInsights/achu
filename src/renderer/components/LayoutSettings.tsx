import { useAppContext } from '../AppContext';
import InspectorSection from './InspectorSection';
import RangeControl from './RangeControl';
import { Layout } from 'lucide-react';

export default function LayoutSettings() {
  const {
    padding, setPadding,
    rounded, setRounded,
    shadow, setShadow,
    shadowColor, setShadowColor,
    shadowEnabled, setShadowEnabled,
    inset, setInset,
    insetColor, setInsetColor,
    border, setBorder,
    borderColor, setBorderColor,
    scale, setScale,
    position, setPosition,
    showAdvancedInset, setShowAdvancedInset,
    showAdvancedShadow, setShowAdvancedShadow,
    showAdvancedBorder, setShowAdvancedBorder,
    getCurrentConfig, pushHistory
  } = useAppContext();

  return (
    <InspectorSection title="Layout" icon={<Layout className="w-3.5 h-3.5" />}>
      {/* Position Layout */}
      <div className="control-group">
        <label className="control-label" htmlFor="layout-position">Position</label>
        <select id="layout-position" value={position} onChange={(e) => {
          setPosition(e.target.value);
          pushHistory({ ...getCurrentConfig(), position: e.target.value });
        }}>
          <option>Middle center</option>
          <option>Top center</option>
          <option>Bottom center</option>
          <option>Middle left</option>
          <option>Middle right</option>
        </select>
      </div>

      {/* Padding */}
      <RangeControl label="Padding" value={padding} min={0} max={120}
        onChange={setPadding} onCommit={(value) => pushHistory({ ...getCurrentConfig(), padding: value })} />

      {/* Scale */}
      <RangeControl label="Scale" value={scale} min={20} max={100} unit="%"
        onChange={setScale} onCommit={(value) => pushHistory({ ...getCurrentConfig(), scale: value })} />

      {/* Inset Border (Inner Border) */}
      <RangeControl label="Inset Border" value={inset} min={0} max={20}
        onChange={setInset} onCommit={(value) => pushHistory({ ...getCurrentConfig(), inset: value })}
        action={<button type="button" className="control-link" aria-expanded={showAdvancedInset} onClick={() => setShowAdvancedInset(!showAdvancedInset)}>
            {showAdvancedInset ? 'Hide' : 'Advanced'}
          </button>}
      >
        {showAdvancedInset && (
          <div className="color-picker-row" style={{ marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Color:</span>
            <input 
              type="color" 
              value={insetColor.startsWith('rgba') ? '#ffffff' : insetColor} 
              onChange={(e) => {
                setInsetColor(e.target.value);
                pushHistory({ ...getCurrentConfig(), insetColor: e.target.value });
              }} 
              className="color-swatch-picker"
            />
            <input 
              type="text" 
              value={insetColor} 
              onChange={(e) => {
                setInsetColor(e.target.value);
                pushHistory({ ...getCurrentConfig(), insetColor: e.target.value });
              }} 
              className="input-sm"
              style={{ flex: 1 }}
            />
          </div>
        )}
      </RangeControl>

      {/* Drop Shadow */}
      <div className="control-group">
        <div className="switch-container">
          <label className="control-label" htmlFor="layout-shadow-enabled">Shadow Enabled</label>
          <label className="switch">
            <input id="layout-shadow-enabled" type="checkbox" checked={shadowEnabled} onChange={(e) => {
              setShadowEnabled(e.target.checked);
              pushHistory({ ...getCurrentConfig(), shadowEnabled: e.target.checked });
            }} />
            <span className="slider-switch"></span>
          </label>
        </div>
        <RangeControl label="Shadow" value={shadow} min={0} max={50} disabled={!shadowEnabled}
          onChange={setShadow} onCommit={(value) => pushHistory({ ...getCurrentConfig(), shadow: value })}
          action={<button type="button" className="control-link" aria-expanded={showAdvancedShadow} onClick={() => setShowAdvancedShadow(!showAdvancedShadow)}>
            {showAdvancedShadow ? 'Hide' : 'Advanced'}
          </button>}
        >
        {showAdvancedShadow && (
          <div className="color-picker-row" style={{ marginTop: '0.25rem', opacity: shadowEnabled ? 1 : 0.5 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Color:</span>
            <input 
              type="color" 
              value={shadowColor.startsWith('rgba') ? '#000000' : shadowColor} 
              disabled={!shadowEnabled}
              onChange={(e) => {
                setShadowColor(e.target.value);
                pushHistory({ ...getCurrentConfig(), shadowColor: e.target.value });
              }} 
              className="color-swatch-picker"
            />
            <input 
              type="text" 
              value={shadowColor} 
              disabled={!shadowEnabled}
              onChange={(e) => {
                setShadowColor(e.target.value);
                pushHistory({ ...getCurrentConfig(), shadowColor: e.target.value });
              }} 
              className="input-sm"
              style={{ flex: 1 }}
            />
          </div>
        )}
        </RangeControl>
      </div>

      {/* Rounded Corner */}
      <RangeControl label="Rounded Corners" value={rounded} min={0} max={40}
        onChange={setRounded} onCommit={(value) => pushHistory({ ...getCurrentConfig(), rounded: value })} />

      {/* Border (Outer) */}
      <RangeControl label="Outer Border" value={border} min={0} max={20}
        onChange={setBorder} onCommit={(value) => pushHistory({ ...getCurrentConfig(), border: value })}
        action={<button type="button" className="control-link" aria-expanded={showAdvancedBorder} onClick={() => setShowAdvancedBorder(!showAdvancedBorder)}>
            {showAdvancedBorder ? 'Hide' : 'Advanced'}
          </button>}
      >
        {showAdvancedBorder && (
          <div className="color-picker-row" style={{ marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Color:</span>
            <input 
              type="color" 
              value={borderColor} 
              onChange={(e) => {
                setBorderColor(e.target.value);
                pushHistory({ ...getCurrentConfig(), borderColor: e.target.value });
              }} 
              className="color-swatch-picker"
            />
            <input 
              type="text" 
              value={borderColor} 
              onChange={(e) => {
                setBorderColor(e.target.value);
                pushHistory({ ...getCurrentConfig(), borderColor: e.target.value });
              }} 
              className="input-sm"
              style={{ flex: 1 }}
            />
          </div>
        )}
      </RangeControl>
    </InspectorSection>
  );
}
