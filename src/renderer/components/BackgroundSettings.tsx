import { useAppContext } from '../AppContext';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import InspectorSection from './InspectorSection';
import Tooltip from './Tooltip';
import { 
  disneyHollywoodGradients, 
  disneyHollywoodMeshPalettes, 
  defaultGradients, 
  curatedMeshPalettes, 
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
    meshPoints, setMeshPoints,
    meshBlur, setMeshBlur,
    meshGrain, setMeshGrain,
    meshOpacity, setMeshOpacity,
    meshSpread, setMeshSpread,
    activePointIdx, setActivePointIdx,
    showHollywoodPalettes, setShowHollywoodPalettes,
    selectedGradientCategory, setSelectedGradientCategory,
    showHollywoodMeshPalettes, setShowHollywoodMeshPalettes,
    getCurrentConfig, pushHistory, selectBackgroundPreset,
    handleSliderRelease, applyMeshPalette, generateRandomPalette
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
        <>
          {/* Mesh Palettes & Points Management */}
          <div className="control-group">
            <span className="control-label">Better Gradient Designer</span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Curated Palettes:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {curatedMeshPalettes.map((pal: any) => (
                  <button
                    key={pal.name}
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => applyMeshPalette(pal.colors)}
                  >
                    {pal.name}
                  </button>
                ))}
                <button
                  className="btn btn-ghost"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => setShowHollywoodMeshPalettes(!showHollywoodMeshPalettes)}
                >
                  {showHollywoodMeshPalettes ? 'Hide Movie' : '+ Movie Palettes'}
                </button>
                {showHollywoodMeshPalettes && disneyHollywoodMeshPalettes.map((pal: any) => (
                  <Tooltip key={pal.name} position="top">
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => applyMeshPalette(pal.colors)}
                      title={`${pal.category.toUpperCase()}: ${pal.colors.join(', ')}`}
                    >
                      {pal.name}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Color Spots</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                   <Tooltip position="top">
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flexShrink: 0 }}
                      onClick={generateRandomPalette}
                      title="Randomize points position and colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" style={{ marginRight: '0.2rem' }} /> Randomize
                    </button>
                  </Tooltip>
                  <Tooltip position="top">
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '28px', padding: 0, flexShrink: 0 }}
                      onClick={() => {
                        if (meshPoints.length >= 10) return;
                        const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                        const randomColor = colors[Math.floor(Math.random() * colors.length)];
                        const newPt = {
                          id: `mesh-${Date.now()}`,
                          color: randomColor,
                          x: 0.2 + Math.random() * 0.6,
                          y: 0.2 + Math.random() * 0.6,
                          radius: 200
                        };
                        const updated = [...meshPoints, newPt];
                        setMeshPoints(updated);
                        setActivePointIdx(meshPoints.length);
                        pushHistory({ ...getCurrentConfig(), meshPoints: updated });
                      }}
                      disabled={meshPoints.length >= 10}
                      title="Add spot"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip position="top">
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '28px', padding: 0, flexShrink: 0 }}
                      onClick={() => {
                        if (meshPoints.length <= 2) return;
                        const filtered = meshPoints.filter((_, idx) => idx !== activePointIdx);
                        setMeshPoints(filtered);
                        setActivePointIdx(Math.max(0, activePointIdx - 1));
                        pushHistory({ ...getCurrentConfig(), meshPoints: filtered });
                      }}
                      disabled={meshPoints.length <= 2}
                      title="Remove active spot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {meshPoints.map((pt, idx) => (
                  <Tooltip key={pt.id} position="top">
                    <button
                      onClick={() => setActivePointIdx(idx)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: pt.color,
                        border: idx === activePointIdx ? '2.5px solid #ffffff' : '1px solid var(--border)',
                        boxShadow: idx === activePointIdx ? '0 0 0 2px var(--accent)' : 'none',
                        cursor: 'pointer',
                      }}
                      title={`Point ${idx + 1}`}
                    />
                  </Tooltip>
                ))}
              </div>

              {meshPoints[activePointIdx] && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px' }}>
                  <div className="color-picker-row">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Color:</span>
                    <input
                      type="color"
                      value={meshPoints[activePointIdx].color}
                      onChange={(e) => {
                        const updated = [...meshPoints];
                        updated[activePointIdx] = { ...updated[activePointIdx], color: e.target.value };
                        setMeshPoints(updated);
                      }}
                      onBlur={() => pushHistory(getCurrentConfig())}
                      className="color-swatch-picker"
                    />
                    <input
                      type="text"
                      value={meshPoints[activePointIdx].color}
                      onChange={(e) => {
                        const updated = [...meshPoints];
                        updated[activePointIdx] = { ...updated[activePointIdx], color: e.target.value };
                        setMeshPoints(updated);
                      }}
                      onBlur={() => pushHistory(getCurrentConfig())}
                      className="input-sm"
                      style={{ flex: 1 }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="control-label-container">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Spot Radius</span>
                      <span className="control-value">{meshPoints[activePointIdx].radius}px</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="400"
                      value={meshPoints[activePointIdx].radius}
                      onChange={(e) => {
                        const updated = [...meshPoints];
                        updated[activePointIdx] = { ...updated[activePointIdx], radius: parseInt(e.target.value, 10) };
                        setMeshPoints(updated);
                      }}
                      onMouseUp={handleSliderRelease}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="control-label-container">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Position X</span>
                      <span className="control-value">{Math.round(meshPoints[activePointIdx].x * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(meshPoints[activePointIdx].x * 100)}
                      onChange={(e) => {
                        const updated = [...meshPoints];
                        updated[activePointIdx] = { ...updated[activePointIdx], x: parseInt(e.target.value, 10) / 100 };
                        setMeshPoints(updated);
                      }}
                      onMouseUp={handleSliderRelease}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="control-label-container">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Position Y</span>
                      <span className="control-value">{Math.round(meshPoints[activePointIdx].y * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(meshPoints[activePointIdx].y * 100)}
                      onChange={(e) => {
                        const updated = [...meshPoints];
                        updated[activePointIdx] = { ...updated[activePointIdx], y: parseInt(e.target.value, 10) / 100 };
                        setMeshPoints(updated);
                      }}
                      onMouseUp={handleSliderRelease}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          <div className="control-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="control-label">Filters</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => {
                  setMeshBlur(60);
                  setMeshGrain(15);
                  setMeshOpacity(100);
                  setMeshSpread(100);
                  pushHistory({ ...getCurrentConfig(), meshBlur: 60, meshGrain: 15, meshOpacity: 100, meshSpread: 100 });
                }}
              >
                Reset Filters
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div className="control-label-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Blur (Blending)</span>
                  <span className="control-value">{meshBlur}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={meshBlur}
                  onChange={(e) => setMeshBlur(parseInt(e.target.value, 10))}
                  onMouseUp={handleSliderRelease}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div className="control-label-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Grain (Noise)</span>
                  <span className="control-value">{meshGrain}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={meshGrain}
                  onChange={(e) => setMeshGrain(parseInt(e.target.value, 10))}
                  onMouseUp={handleSliderRelease}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div className="control-label-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Opacity</span>
                  <span className="control-value">{meshOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={meshOpacity}
                  onChange={(e) => setMeshOpacity(parseInt(e.target.value, 10))}
                  onMouseUp={handleSliderRelease}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div className="control-label-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Spread (Radius)</span>
                  <span className="control-value">{meshSpread}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={meshSpread}
                  onChange={(e) => setMeshSpread(parseInt(e.target.value, 10))}
                  onMouseUp={handleSliderRelease}
                />
              </div>
            </div>
          </div>
        </>
      )}

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
                pushHistory({ ...getCurrentConfig(), aspectRatio: ratio });
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
                setCanvasWidth(parseInt(e.target.value, 10) || 800);
                pushHistory({ ...getCurrentConfig(), canvasWidth: parseInt(e.target.value, 10) || 800 });
              }} 
              style={{ textAlign: 'center' }} 
            />
            <span style={{ color: 'var(--text-secondary)' }}>×</span>
            <input 
              type="number" 
              placeholder="Height" 
              value={canvasHeight} 
              onChange={(e) => {
                setCanvasHeight(parseInt(e.target.value, 10) || 600);
                pushHistory({ ...getCurrentConfig(), canvasHeight: parseInt(e.target.value, 10) || 600 });
              }} 
              style={{ textAlign: 'center' }} 
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
