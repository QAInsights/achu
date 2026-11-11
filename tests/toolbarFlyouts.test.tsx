import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import WorkspaceToolbar from '../src/renderer/components/WorkspaceToolbar';

const state = vi.hoisted(() => ({ activeTool: 'text', cropActive: false, codeStudioActive: false, galleryVisible: false }));
vi.mock('../src/renderer/AppContext', () => ({ useAppContext: () => new Proxy({ ...state, history: [], systemFonts: [] }, { get: (target, key) => target[key as keyof typeof target] ?? vi.fn() }) }));
vi.mock('../src/renderer/contexts/GalleryContext', () => ({ useGalleryContext: () => state }));
vi.mock('../src/renderer/components/CropOverlay', () => ({ CropControls: () => null }));
afterEach(() => { cleanup(); Object.assign(state, { activeTool: 'text', cropActive: false, codeStudioActive: false, galleryVisible: false }); });

it('portals Text and Arrow options without a full-width toolbar row', () => {
  const { container, rerender } = render(<WorkspaceToolbar />);
  const fontRow = screen.getByRole('group', { name: 'Text font and size' });
  const styleRow = screen.getByRole('group', { name: 'Text style and colors' });
  expect(within(fontRow).getByTitle(/^Font Size:/)).toBeInTheDocument();
  const emphasis = within(styleRow).getByRole('group', { name: 'Text emphasis' });
  for (const title of ['Bold', 'Italic', 'Text Outline (toggle on/off)']) expect(within(emphasis).getByTitle(title)).toBeInTheDocument();
  expect(fontRow.nextElementSibling).toBe(styleRow);
  expect(screen.getByRole('group', { name: 'Text options' }).parentElement).toBe(document.body);
  expect(container.querySelector('.toolbar-context')).toBeNull();
  state.activeTool = 'arrow';
  rerender(<WorkspaceToolbar />);
  expect(screen.queryByRole('group', { name: 'Text options' })).toBeNull();
  expect(screen.getByRole('group', { name: 'Arrow options' }).parentElement).toBe(document.body);
});

it.each(['cropActive', 'galleryVisible', 'codeStudioActive'] as const)('suppresses options during %s', mode => {
  state[mode] = true;
  render(<WorkspaceToolbar />);
  expect(screen.queryByRole('group', { name: 'Text options' })).toBeNull();
});
