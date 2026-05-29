import { useAppContext } from '../AppContext';

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
    getCurrentConfig, pushHistory, handleSliderRelease
  } = useAppContext();

  return (
    <>
      {/* Position Layout */}
      <div className="control-group">
        <span className="control-label">Position</span>
        <select value={position} onChange={(e) => {
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
      <div className="control-group">
        <div className="control-label-container">
          <span className="control-label">Padding</span>
          <span className="control-value">{padding}px</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="120" 
          value={padding} 
          onChange={(e) => setPadding(parseInt(e.target.value, 10))}
          onMouseUp={handleSliderRelease}
        />
      </div>

      {/* Scale */}
      <div className="control-group">
        <div className="control-label-container">
          <span className="control-label">Scale</span>
          <span className="control-value">{scale}%</span>
        </div>
        <input 
          type="range" 
          min="20" 
          max="100" 
          value={scale} 
          onChange={(e) => setScale(parseInt(e.target.value, 10))}
          onMouseUp={handleSliderRelease}
        />
      </div>

      {/* Inset Border (Inner Border) */}
      <div className="control-group">
        <div className="control-label-container">
          <span className="control-label">Inset Border</span>
          <span className="control-link" onClick={() => setShowAdvancedInset(!showAdvancedInset)}>
            {showAdvancedInset ? 'Hide' : 'Advanced'}
          </span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="20" 
          value={inset} 
          onChange={(e) => setInset(parseInt(e.target.value, 10))}
          onMouseUp={handleSliderRelease}
        />
        {showAdvancedInset && (
          <div className="color-picker-row" style={{ marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Color:</span>
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
              style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
            />
          </div>
        )}
      </div>

      {/* Drop Shadow */}
      <div className="control-group">
        <div className="control-label-container">
          <span className="control-label">Shadow</span>
          <span className="control-link" onClick={() => setShowAdvancedShadow(!showAdvancedShadow)}>
            {showAdvancedShadow ? 'Hide' : 'Advanced'}
          </span>
        </div>
        <div className="switch-container" style={{ marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Shadow Enabled</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={shadowEnabled} 
              onChange={(e) => {
                setShadowEnabled(e.target.checked);
                pushHistory({ ...getCurrentConfig(), shadowEnabled: e.target.checked });
              }} 
            />
            <span className="slider-switch"></span>
          </label>
        </div>
        <input 
          type="range" 
          min="0" 
          max="50" 
          value={shadow} 
          disabled={!shadowEnabled}
          onChange={(e) => setShadow(parseInt(e.target.value, 10))}
          onMouseUp={handleSliderRelease}
        />
        {showAdvancedShadow && shadowEnabled && (
          <div className="color-picker-row" style={{ marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Color:</span>
            <input 
              type="color" 
              value={shadowColor.startsWith('rgba') ? '#000000' : shadowColor} 
              onChange={(e) => {
                setShadowColor(e.target.value);
                pushHistory({ ...getCurrentConfig(), shadowColor: e.target.value });
              }} 
              className="color-swatch-picker"
            />
            <input 
              type="text" 
              value={shadowColor} 
              onChange={(e) => {
                setShadowColor(e.target.value);
                pushHistory({ ...getCurrentConfig(), shadowColor: e.target.value });
              }} 
              style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
            />
          </div>
        )}
      </div>

      {/* Rounded Corner */}
      <div className="control-group">
        <div className="control-label-container">
          <span className="control-label">Rounded Corners</span>
          <span className="control-value">{rounded}px</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="40" 
          value={rounded} 
          onChange={(e) => setRounded(parseInt(e.target.value, 10))}
          onMouseUp={handleSliderRelease}
        />
      </div>

      {/* Border (Outer) */}
      <div className="control-group">
        <div className="control-label-container">
          <span className="control-label">Outer Border</span>
          <span className="control-link" onClick={() => setShowAdvancedBorder(!showAdvancedBorder)}>
            {showAdvancedBorder ? 'Hide' : 'Advanced'}
          </span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="20" 
          value={border} 
          onChange={(e) => setBorder(parseInt(e.target.value, 10))}
          onMouseUp={handleSliderRelease}
        />
        {showAdvancedBorder && (
          <div className="color-picker-row" style={{ marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Color:</span>
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
              style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
            />
          </div>
        )}
      </div>
    </>
  );
}
