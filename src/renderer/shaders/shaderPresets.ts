export type ShaderType = 'staticMesh' | 'grainGradient';

export type GrainGradientShape = 'wave' | 'dots' | 'truchet' | 'corners' | 'ripple';

export interface StaticMeshGradientParams {
  positions: number;
  waveX: number;
  waveXShift: number;
  waveY: number;
  waveYShift: number;
  mixing: number;
  grainMixer: number;
  grainOverlay: number;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
}

export interface GrainGradientParams {
  shape: GrainGradientShape;
  softness: number;
  intensity: number;
  noise: number;
}

export type ShaderParams = StaticMeshGradientParams | GrainGradientParams;

export interface ShaderPreset {
  id: string;
  name: string;
  type: ShaderType;
  colors: string[];
  params: ShaderParams;
}

export const DEFAULT_STATIC_MESH_PARAMS: StaticMeshGradientParams = {
  positions: 50,
  waveX: 0.3,
  waveXShift: 0.25,
  waveY: 0.3,
  waveYShift: 0.75,
  mixing: 0.5,
  grainMixer: 0,
  grainOverlay: 0,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
};

export const DEFAULT_GRAIN_GRADIENT_PARAMS: GrainGradientParams = {
  shape: 'wave',
  softness: 0.5,
  intensity: 0,
  noise: 0,
};

export const shaderPresets: ShaderPreset[] = [
  {
    id: 'aurora-mesh',
    name: 'Aurora Mesh',
    type: 'staticMesh',
    colors: ['#5100ff', '#00ff80', '#ffcc00', '#ea00ff'],
    params: { ...DEFAULT_STATIC_MESH_PARAMS, mixing: 0.6, waveX: 0.4, waveY: 0.4 },
  },
  {
    id: 'sunset-mesh',
    name: 'Sunset Mesh',
    type: 'staticMesh',
    colors: ['#ff5f6d', '#ffc371', '#ff0080', '#7928ca'],
    params: { ...DEFAULT_STATIC_MESH_PARAMS, positions: 30, mixing: 0.7 },
  },
  {
    id: 'ocean-mesh',
    name: 'Ocean Mesh',
    type: 'staticMesh',
    colors: ['#00c6ff', '#0072ff', '#00d2ff', '#3a7bd5'],
    params: { ...DEFAULT_STATIC_MESH_PARAMS, waveX: 0.5, waveY: 0.2 },
  },
  {
    id: 'neon-mesh',
    name: 'Neon Mesh',
    type: 'staticMesh',
    colors: ['#00f2fe', '#4facfe', '#f093fb', '#f5576c'],
    params: { ...DEFAULT_STATIC_MESH_PARAMS },
  },
  {
    id: 'forest-mesh',
    name: 'Forest Mesh',
    type: 'staticMesh',
    colors: ['#134e5e', '#71b280', '#56ab2f', '#a8e063'],
    params: { ...DEFAULT_STATIC_MESH_PARAMS, mixing: 0.4 },
  },
  {
    id: 'pastel-wave',
    name: 'Pastel Wave',
    type: 'grainGradient',
    colors: ['#ffecd2', '#fcb69f', '#a1c4fd', '#c2e9fb'],
    params: { ...DEFAULT_GRAIN_GRADIENT_PARAMS, shape: 'wave', softness: 0.6 },
  },
  {
    id: 'neon-grain',
    name: 'Neon Grain',
    type: 'grainGradient',
    colors: ['#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
    params: { ...DEFAULT_GRAIN_GRADIENT_PARAMS, shape: 'ripple' },
  },
  {
    id: 'ocean-ripple',
    name: 'Ocean Ripple',
    type: 'grainGradient',
    colors: ['#00c6ff', '#0072ff', '#00d2ff'],
    params: { ...DEFAULT_GRAIN_GRADIENT_PARAMS, shape: 'ripple', softness: 0.4 },
  },
  {
    id: 'warm-wave',
    name: 'Warm Wave',
    type: 'grainGradient',
    colors: ['#fa709a', '#fee140', '#ff9a9e', '#fad0c4'],
    params: { ...DEFAULT_GRAIN_GRADIENT_PARAMS, shape: 'wave' },
  },
  {
    id: 'cosmic-dots',
    name: 'Cosmic Dots',
    type: 'grainGradient',
    colors: ['#667eea', '#764ba2', '#f093fb'],
    params: { ...DEFAULT_GRAIN_GRADIENT_PARAMS, shape: 'dots', softness: 0.7 },
  },
];

export const SHAPE_LABELS: Record<GrainGradientShape, string> = {
  wave: 'Wave',
  dots: 'Dots',
  truchet: 'Truchet',
  corners: 'Corners',
  ripple: 'Ripple',
};

export const SHAPE_OPTIONS: GrainGradientShape[] = ['wave', 'dots', 'truchet', 'corners', 'ripple'];
