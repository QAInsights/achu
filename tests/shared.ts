import { RenderConfig } from '../src/renderer/canvasRenderer';

export const baseConfig: RenderConfig = {
  padding: 38,
  rounded: 20,
  shadow: 30,
  shadowColor: 'rgba(0, 0, 0, 0.4)',
  shadowEnabled: true,
  inset: 0,
  insetColor: 'rgba(255, 255, 255, 0.2)',
  border: 0,
  borderColor: '#ffffff',
  scale: 100,
  backgroundType: 'gradient',
  backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  aspectRatio: 'Auto',
  canvasWidth: 800,
  canvasHeight: 600,
  paddingMode: 'fit',
  chromeStyle: 'mac',
  watermarkEnabled: false,
  watermarkText: 'Achu',
  position: 'Middle center',
};

export function makeMockCtx(): CanvasRenderingContext2D {
  const calls: string[] = [];
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === 'calls') return calls;
      return (..._args: unknown[]) => {
        calls.push(String(prop));
      };
    },
    set() { return true; },
  };
  return new Proxy({} as CanvasRenderingContext2D, handler);
}

export function makeArrowAnnotation(
  arrowStyle: 'classic' | 'dashed' | 'tapered' | 'curved' = 'classic'
) {
  return {
    id: 'test',
    type: 'arrow' as const,
    x: 0.1, y: 0.1, w: 0.4, h: 0.3,
    color: '#ff0000',
    strokeWidth: 4,
    arrowStyle,
  };
}
