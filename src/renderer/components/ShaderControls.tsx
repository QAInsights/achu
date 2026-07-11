import { useAppContext } from '../AppContext';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import Tooltip from './Tooltip';
import {
  shaderPresets,
  SHAPE_LABELS,
  SHAPE_OPTIONS,
  DEFAULT_STATIC_MESH_PARAMS,
  DEFAULT_GRAIN_GRADIENT_PARAMS,
  type StaticMeshGradientParams,
  type GrainGradientParams,
} from '../shaders/shaderPresets';

export default function ShaderControls() {
  const {
    shaderType, setShaderType,
    shaderColors, setShaderColors,
    shaderParams, setShaderParams,
    getCurrentConfig, pushHistory,
    handleSliderRelease,
  } = useAppContext();

  const applyPreset = (preset: typeof shaderPresets[0]) => {
    setShaderType(preset.type);
    setShaderColors(preset.colors);
    setShaderParams(preset.params);
    pushHistory({ ...getCurrentConfig(), shaderType: preset.type, shaderColors: preset.colors, shaderParams: preset.params });
  };

  const randomizeColors = () => {
    const colors = [
      '#ff5f6d', '#ffc371', '#00c6ff', '#7209b7',
      '#f43f5e', '#3b82f6', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    ];
    const shuffled = [...colors].sort(() => Math.random() - 0.5);
    const count = 3 + Math.floor(Math.random() * 3);
    setShaderColors(shuffled.slice(0, count));
    pushHistory({ ...getCurrentConfig(), shaderColors: shuffled.slice(0, count) });
  };

  const addColor = () => {
    if (shaderColors.length >= 10) return;
    const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    const updated = [...shaderColors, hex];
    setShaderColors(updated);
    pushHistory({ ...getCurrentConfig(), shaderColors: updated });
  };

  const removeColor = (idx: number) => {
    if (shaderColors.length <= 2) return;
    const updated = shaderColors.filter((_, i) => i !== idx);
    setShaderColors(updated);
    pushHistory({ ...getCurrentConfig(), shaderColors: updated });
  };

  const updateColor = (idx: number, color: string) => {
    const updated = [...shaderColors];
    updated[idx] = color;
    setShaderColors(updated);
  };

  const updateStaticMeshParam = <K extends keyof StaticMeshGradientParams>(
    key: K,
    value: StaticMeshGradientParams[K]
  ) => {
    if (shaderType !== 'staticMesh') return;
    const params = shaderParams as StaticMeshGradientParams;
    const updated = { ...params, [key]: value };
    setShaderParams(updated);
  };

  const updateGrainGradientParam = <K extends keyof GrainGradientParams>(
    key: K,
    value: GrainGradientParams[K]
  ) => {
    if (shaderType !== 'grainGradient') return;
    const params = shaderParams as GrainGradientParams;
    const updated = { ...params, [key]: value };
    setShaderParams(updated);
  };

  return (
    <>
      {/* Shader Type Selector */}
      <div className="control-group">
        <span className="control-label">Shader Style</span>
        <div className="btn-group">
          <button
            className={`btn-group-item ${shaderType === 'staticMesh' ? 'active' : ''}`}
            onClick={() => {
              setShaderType('staticMesh');
              setShaderParams(DEFAULT_STATIC_MESH_PARAMS);
              pushHistory({ ...getCurrentConfig(), shaderType: 'staticMesh', shaderParams: DEFAULT_STATIC_MESH_PARAMS });
            }}
          >
            Mesh
          </button>
          <button
            className={`btn-group-item ${shaderType === 'grainGradient' ? 'active' : ''}`}
            onClick={() => {
              setShaderType('grainGradient');
              setShaderParams(DEFAULT_GRAIN_GRADIENT_PARAMS);
              pushHistory({ ...getCurrentConfig(), shaderType: 'grainGradient', shaderParams: DEFAULT_GRAIN_GRADIENT_PARAMS });
            }}
          >
            Grain
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="control-group">
        <span className="control-label">Presets</span>
        <div className="preset-grid">
          {shaderPresets
            .filter((p) => p.type === shaderType)
            .map((preset) => (
              <Tooltip key={preset.id} position="top">
                <div
                  className="preset-swatch"
                  style={{
                    background: `linear-gradient(135deg, ${preset.colors.join(', ')})`,
                  }}
                  onClick={() => applyPreset(preset)}
                  title={preset.name}
                />
              </Tooltip>
            ))}
        </div>
      </div>

      {/* Colors */}
      <div className="control-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span className="control-label">Colors ({shaderColors.length})</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <Tooltip position="top">
              <button
                className="btn btn-secondary btn-sm"
                onClick={randomizeColors}
                title="Randomize colors"
              >
                <Sparkles width={14} height={14} style={{ color: 'var(--accent)' }} />
              </button>
            </Tooltip>
            <Tooltip position="top">
              <button
                className="btn btn-secondary btn-sm"
                onClick={addColor}
                disabled={shaderColors.length >= 10}
                title="Add color"
              >
                <Plus width={14} height={14} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {shaderColors.map((color, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(idx, e.target.value)}
                onMouseUp={handleSliderRelease}
                className="color-swatch-picker"
                style={{ width: '32px', height: '32px', cursor: 'pointer' }}
              />
              {shaderColors.length > 2 && (
                <button
                  onClick={() => removeColor(idx)}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <Trash2 width={10} height={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Static Mesh Params */}
      {shaderType === 'staticMesh' && (
        <>
          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Positions</span>
              <span className="control-value">{(shaderParams as StaticMeshGradientParams).positions.toFixed(0)}</span>
            </div>
            <input
              type="range" min="0" max="100" step="1"
              value={(shaderParams as StaticMeshGradientParams).positions}
              onChange={(e) => updateStaticMeshParam('positions', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Wave X</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).waveX * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={(shaderParams as StaticMeshGradientParams).waveX}
              onChange={(e) => updateStaticMeshParam('waveX', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Wave X Shift</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).waveXShift ?? 0).toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={(shaderParams as StaticMeshGradientParams).waveXShift ?? 0}
              onChange={(e) => updateStaticMeshParam('waveXShift', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Wave Y</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).waveY * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={(shaderParams as StaticMeshGradientParams).waveY}
              onChange={(e) => updateStaticMeshParam('waveY', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Wave Y Shift</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).waveYShift ?? 0).toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={(shaderParams as StaticMeshGradientParams).waveYShift ?? 0}
              onChange={(e) => updateStaticMeshParam('waveYShift', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Mixing</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).mixing * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={(shaderParams as StaticMeshGradientParams).mixing}
              onChange={(e) => updateStaticMeshParam('mixing', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Grain Edge</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).grainMixer * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={(shaderParams as StaticMeshGradientParams).grainMixer}
              onChange={(e) => updateStaticMeshParam('grainMixer', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Grain Overlay</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).grainOverlay * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={(shaderParams as StaticMeshGradientParams).grainOverlay}
              onChange={(e) => updateStaticMeshParam('grainOverlay', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Scale</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).scale ?? 1).toFixed(2)}</span>
            </div>
            <input
              type="range" min="0.01" max="4" step="0.01"
              value={(shaderParams as StaticMeshGradientParams).scale ?? 1}
              onChange={(e) => updateStaticMeshParam('scale', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Rotation</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).rotation ?? 0).toFixed(0)}°</span>
            </div>
            <input
              type="range" min="0" max="360" step="1"
              value={(shaderParams as StaticMeshGradientParams).rotation ?? 0}
              onChange={(e) => updateStaticMeshParam('rotation', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Offset X</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).offsetX ?? 0).toFixed(2)}</span>
            </div>
            <input
              type="range" min="-1" max="1" step="0.01"
              value={(shaderParams as StaticMeshGradientParams).offsetX ?? 0}
              onChange={(e) => updateStaticMeshParam('offsetX', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Offset Y</span>
              <span className="control-value">{((shaderParams as StaticMeshGradientParams).offsetY ?? 0).toFixed(2)}</span>
            </div>
            <input
              type="range" min="-1" max="1" step="0.01"
              value={(shaderParams as StaticMeshGradientParams).offsetY ?? 0}
              onChange={(e) => updateStaticMeshParam('offsetY', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>
        </>
      )}

      {/* Grain Gradient Params */}
      {shaderType === 'grainGradient' && (
        <>
          <div className="control-group">
            <span className="control-label">Shape</span>
            <div className="btn-group" style={{ flexWrap: 'wrap' }}>
              {SHAPE_OPTIONS.map((s) => (
                <button
                  key={s}
                  className={`btn-group-item ${(shaderParams as GrainGradientParams).shape === s ? 'active' : ''}`}
                  onClick={() => {
                    updateGrainGradientParam('shape', s);
                    pushHistory({ ...getCurrentConfig(), shaderParams: { ...(shaderParams as GrainGradientParams), shape: s } });
                  }}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                >
                  {SHAPE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Softness</span>
              <span className="control-value">{((shaderParams as GrainGradientParams).softness * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={(shaderParams as GrainGradientParams).softness}
              onChange={(e) => updateGrainGradientParam('softness', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Intensity</span>
              <span className="control-value">{((shaderParams as GrainGradientParams).intensity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={(shaderParams as GrainGradientParams).intensity}
              onChange={(e) => updateGrainGradientParam('intensity', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Noise</span>
              <span className="control-value">{((shaderParams as GrainGradientParams).noise * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={(shaderParams as GrainGradientParams).noise}
              onChange={(e) => updateGrainGradientParam('noise', parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
            />
          </div>
        </>
      )}
    </>
  );
}
