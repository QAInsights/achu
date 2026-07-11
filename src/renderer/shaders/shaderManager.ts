import type { ShaderType, ShaderParams } from './shaderPresets';
import type { StaticMeshGradientParams } from './shaderPresets';
import type { GrainGradientParams } from './shaderPresets';
import { drawStaticMeshGradient2D, drawGrainGradient2D } from './shaderFallback';
import { renderGrainGradientWebGL, renderStaticMeshWebGL } from './shaderWebGL';

/** Try WebGL first, fall back to Canvas 2D if unavailable */
export function renderShaderToCanvas(
  type: ShaderType,
  colors: string[],
  params: ShaderParams,
  width: number,
  height: number
): HTMLCanvasElement | null {
  // Attempt real WebGL rendering
  const webglCanvas = renderShaderWebGLCanvas(type, colors, params, width, height);
  if (webglCanvas) return webglCanvas;

  // Fall back to Canvas 2D approximation
  return renderShader2DFallback(type, colors, params, width, height);
}

function renderShaderWebGLCanvas(
  type: ShaderType,
  colors: string[],
  params: ShaderParams,
  width: number,
  height: number
): HTMLCanvasElement | null {
  if (type === 'staticMesh') {
    const p = params as StaticMeshGradientParams;
    return renderStaticMeshWebGL(width, height, colors, p.positions, p.waveX, p.waveXShift, p.waveY, p.waveYShift, p.mixing, p.grainMixer, p.grainOverlay);
  }
  const p = params as GrainGradientParams;
  return renderGrainGradientWebGL(width, height, colors, p.shape, p.softness, p.intensity, p.noise);
}

function renderShader2DFallback(
  type: ShaderType,
  colors: string[],
  params: ShaderParams,
  width: number,
  height: number
): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (type === 'staticMesh') {
    const p = params as StaticMeshGradientParams;
    drawStaticMeshGradient2D(ctx, width, height, colors, p.positions, p.waveX, p.waveXShift, p.waveY, p.waveYShift, p.mixing, p.grainMixer, p.grainOverlay);
  } else {
    const p = params as GrainGradientParams;
    drawGrainGradient2D(ctx, width, height, colors, p.shape, p.softness, p.intensity, p.noise);
  }

  return canvas;
}

export function shaderToDataUrl(
  type: ShaderType,
  colors: string[],
  params: ShaderParams,
  width: number,
  height: number
): string {
  const canvas = renderShaderToCanvas(type, colors, params, width, height);
  return canvas ? canvas.toDataURL('image/png') : '';
}

export function drawShaderOnCanvas(
  type: ShaderType,
  colors: string[],
  params: ShaderParams,
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const shaderCanvas = renderShaderToCanvas(type, colors, params, width, height);
  if (shaderCanvas) {
    targetCtx.drawImage(shaderCanvas, 0, 0, width, height);
  }
}
