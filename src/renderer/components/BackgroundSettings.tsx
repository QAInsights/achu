import { useAppContext } from '../AppContext';
import { Sparkles } from 'lucide-react';
import InspectorSection from './InspectorSection';
import Tooltip from './Tooltip';
import PresetSelector from './PresetSelector';
import MeshGradientControls from './MeshGradientControls';
import { 
  disneyHollywoodGradients, 
  defaultGradients, 
  solidPresets 
} from '../presetsData';

export default function BackgroundSettings() {
  const {
    backgroundType, setBackgroundType,
    backgroundValue, setBackgroundValue,
    aspectRatio, setAspectRatio,
    canvasWidth, setCanvasWidth,
    canvasHeight, setCanvasHeight,
    paddingMode, setPaddingMode,
    blurDensity, setBlurDensity,
    showHollywoodPalettes, setShowHollywoodPalettes,
    selectedGradientCategory, setSelectedGradientCategory,
    selectedPreset, setSelectedPreset,
    showSafeZone, setShowSafeZone,
    getCurrentConfig, pushHistory, selectBackgroundPreset,
    handleSliderRelease
  } = useAppContext();

  return (
    <InspectorSection title="Background">
      {/* Background Mode Selector */}
      <div className="control-group">
        <span className="control-label">Background Mode</span>
        <div className="btn-group">
          {(['color', 'gradient', 'blur', 'mesh'] as const).map((type) => (
            <button
              key={type}
              className={`btn-group-item ${backgroundType === type ? 'active' : ''}`}
              onClick={() => {
                setBackgroundType(type);
                pushHistory({ ...getCurrentConfig(), backgroundType: type });
              }}
            >
              {type === 'color' ? 'Solid' : type === 'gradient' ? 'Preset' : type === 'blur' ? 'Blurred' : 'Mesh'}
            </button>
          ))}
        </div>
      </div>

      {/* Background Presets / Blur Density / Mesh Aurora Gradient Controls */}
      {backgroundType === 'blur' && (
        <div className="control-group">
          <div className="control-label-container">
            <span className="control-label">Blur Density</span>
            <span className="control-value">{blurDensity}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={blurDensity}
            onChange={(e) => setBlurDensity(parseInt(e.target.value, 10))}
            onMouseUp={handleSliderRelease}
          />
        </div>
      )}

      {(backgroundType === 'color' || backgroundType === 'gradient') && (
        <div className="control-group">
          <div className="control-label-container">
            <span className="control-label">Background Colors</span>
          </div>
          
          {backgroundType === 'color' && (
            <div className="color-picker-row" style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Custom:</span>
              <input 
                type="color" 
                value={backgroundValue.startsWith('linear') ? '#ffffff' : backgroundValue} 
                onChange={(e) => {
                  setBackgroundValue(e.target.value);
                  pushHistory({ ...getCurrentConfig(), backgroundValue: e.target.value });
                }} 
                className="color-swatch-picker"
              />
              <input 
                type="text" 
                value={backgroundValue} 
                onChange={(e) => {
                  setBackgroundValue(e.target.value);
                  pushHistory({ ...getCurrentConfig(), backgroundValue: e.target.value });
                }} 
                className="input-sm"
                style={{ flex: 1 }}
              />
            </div>
          )}

          {backgroundType === 'gradient' && showHollywoodPalettes && (
            <div className="btn-group" style={{ marginBottom: '0.5rem', gap: '0.2rem' }}>
              {(['classic', 'disney', 'marvel', 'hollywood'] as const).map((cat) => (
                <button
                  key={cat}
                  className={`btn-group-item ${selectedGradientCategory === cat ? 'active' : ''}`}
                  style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', textTransform: 'capitalize' }}
                  onClick={() => setSelectedGradientCategory(cat)}
                >
                  {cat === 'classic' ? 'Classic' : cat === 'disney' ? 'Disney' : cat === 'marvel' ? 'Marvel' : 'Hollywood'}
                </button>
              ))}
            </div>
          )}

          <div className="preset-grid">
            {backgroundType === 'gradient' && (
              !showHollywoodPalettes || selectedGradientCategory === 'classic' ? (
                defaultGradients.map((g: any) => (
                  <Tooltip key={g.id} position="top">
                    <div 
                      className={`preset-swatch ${backgroundType === 'gradient' && backgroundValue === g.gradient ? 'active' : ''}`}
                      style={{ background: g.gradient }}
                      onClick={() => selectBackgroundPreset(g)}
                      title={g.name}
                    />
                  </Tooltip>
                ))
              ) : (
                disneyHollywoodGradients
                  .filter((g) => g.category === selectedGradientCategory)
                  .map((g) => (
                    <Tooltip key={g.id} position="top">
                      <div 
                        className={`preset-swatch ${backgroundType === 'gradient' && backgroundValue === g.gradient ? 'active' : ''}`}
                        style={{ background: g.gradient }}
                        onClick={() => selectBackgroundPreset(g)}
                        title={g.name}
                      />
                    </Tooltip>
                  ))
              )
            )}
            {(!showHollywoodPalettes || selectedGradientCategory === 'classic') && solidPresets.map((s: any) => (
              <Tooltip key={s.id} position="top">
                <div 
                  className={`preset-swatch ${backgroundType === 'color' && backgroundValue === s.color ? 'active' : ''}`}
                  style={{ backgroundColor: s.color }}
                  onClick={() => selectBackgroundPreset(s)}
                  title={s.name}
                />
              </Tooltip>
            ))}
          </div>

          {backgroundType === 'gradient' && (
            <button
              className="btn btn-ghost"
              style={{ marginTop: '0.5rem', width: '100%' }}
              onClick={() => {
                const nextVal = !showHollywoodPalettes;
                setShowHollywoodPalettes(nextVal);
                if (nextVal) {
                  setSelectedGradientCategory('disney');
                } else {
                  setSelectedGradientCategory('classic');
                }
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {showHollywoodPalettes ? 'Hide Movie Palettes' : 'Load Hollywood Palettes'}
            </button>
          )}
        </div>
      )}

      {backgroundType === 'mesh' && (
        <MeshGradientControls />
      )}

      {/* Platform Presets */}
      <div className="control-group">
        <span className="control-label">Platform Preset</span>
        <PresetSelector />
        
        {selectedPreset && (
          <div className="switch-container" style={{ marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Show Safe Zone</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={showSafeZone} 
                onChange={(e) => {
                  setShowSafeZone(e.target.checked);
                  pushHistory({ ...getCurrentConfig(), showSafeZone: e.target.checked });
                }} 
              />
              <span className="slider-switch"></span>
            </label>
          </div>
        )}
      </div>

      {/* Aspect Ratio */}
      <div className="control-group">
        <span className="control-label">Aspect Ratio</span>
        <div className="btn-group">
          {['Auto', '1:1', '4:3', '16:9', '3:2', 'Custom'].map((ratio) => (
            <button 
              key={ratio} 
              className={`btn-group-item ${aspectRatio === ratio ? 'active' : ''}`}
              onClick={() => {
                setAspectRatio(ratio);
                setSelectedPreset('');
                pushHistory({ ...getCurrentConfig(), aspectRatio: ratio, selectedPreset: '' });
              }}
            >
              {ratio}
            </button>
          ))}
        </div>
        {aspectRatio === 'Custom' && (
          <div className="color-picker-row" style={{ marginTop: '0.5rem' }}>
            <input 
              type="number" 
              placeholder="Width" 
              value={canvasWidth} 
              onChange={(e) => {
                const w = parseInt(e.target.value, 10) || 800;
                setCanvasWidth(w);
                setSelectedPreset('');
                pushHistory({ ...getCurrentConfig(), canvasWidth: w, selectedPreset: '' });
              }} 
              style={{ textAlign: 'center', flex: 1, minWidth: 0 }} 
            />
            <span style={{ color: 'var(--text-secondary)' }}>×</span>
            <input 
              type="number" 
              placeholder="Height" 
              value={canvasHeight} 
              onChange={(e) => {
                const h = parseInt(e.target.value, 10) || 600;
                setCanvasHeight(h);
                setSelectedPreset('');
                pushHistory({ ...getCurrentConfig(), canvasHeight: h, selectedPreset: '' });
              }} 
              style={{ textAlign: 'center', flex: 1, minWidth: 0 }} 
            />
          </div>
        )}
        {aspectRatio !== 'Auto' && (
          <div className="switch-container" style={{ marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Padding Mode</span>
            <select 
              value={paddingMode} 
              onChange={(e) => {
                setPaddingMode(e.target.value as 'fit' | 'fill');
                pushHistory({ ...getCurrentConfig(), paddingMode: e.target.value as 'fit' | 'fill' });
              }}
              className="input-sm"
              style={{ width: '100px' }}
            >
              <option value="fit">Fit</option>
              <option value="fill">Fill</option>
            </select>
          </div>
        )}
      </div>
    </InspectorSection>
  );
}
