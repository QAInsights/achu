import { useState, useEffect } from 'react';
import { X, Layers, FolderOpen } from 'lucide-react';
import { useBurstPackContext } from '../../contexts/BurstPackContext';
import { useGalleryContext } from '../../contexts/GalleryContext';
import { useAppContext } from '../../AppContext';
import { resolvePresetKeys } from '../../../shared/burstPacks';
import BurstPackPackList from './BurstPackPackList';
import BurstPackProgress from './BurstPackProgress';
import './BurstPack.css';

export default function BurstPackModal() {
  const { modalOpen, closeModal, phase, progress, saveBurstPack } = useBurstPackContext();
  const { galleryFolder } = useGalleryContext();
  const { documentName } = useAppContext();
  const [selectedPackId, setSelectedPackId] = useState<string | null>('launch-kit');
  const [customKeys, setCustomKeys] = useState<string[]>([]);
  const busy = phase === 'rendering' || phase === 'saving';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) closeModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeModal, busy]);

  if (!modalOpen) return null;

  const presetCount = resolvePresetKeys(selectedPackId, customKeys).length;

  const handleToggleCustom = (presetKey: string) => {
    setSelectedPackId(null);
    setCustomKeys((prev) =>
      prev.includes(presetKey) ? prev.filter((k) => k !== presetKey) : [...prev, presetKey]
    );
  };

  const handleSave = async () => {
    await saveBurstPack(selectedPackId, customKeys);
  };

  return (
    <div className="burst-pack-overlay" data-testid="burst-pack-modal">
      <div className="burst-pack-dialog">
        <div className="burst-pack-header">
          <div className="burst-pack-title-row">
            <Layers className="w-4 h-4" />
            <h2>Platform Burst Pack</h2>
          </div>
          <button type="button" className="burst-pack-close" onClick={closeModal} disabled={busy}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="burst-pack-subtitle">
          Export one edit into multiple platform-ready sizes with safe-zone-aware reframing.
        </p>

        <BurstPackPackList
          selectedPackId={selectedPackId}
          customKeys={customKeys}
          onSelectPack={(id) => {
            setSelectedPackId(id);
            if (id) setCustomKeys([]);
          }}
          onToggleCustom={handleToggleCustom}
        />

        <div className="burst-pack-save-dest">
          <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
          <div>
            Saves to your <strong>Gallery</strong> as a bundle folder with all variants, a manifest, and
            the master project file so you can re-open and edit later.
            <span className="burst-pack-save-dest-path">
              {galleryFolder
                ? `${[galleryFolder, documentName || '{document-name}'].join('/')}/`
                : 'Gallery folder (set in Settings)'}
            </span>
          </div>
        </div>

        <BurstPackProgress phase={phase} current={progress.current} total={progress.total} />

        <div className="burst-pack-footer">
          <span className="burst-pack-footer-hint">
            {presetCount > 0
              ? `${presetCount} variant${presetCount === 1 ? '' : 's'} will be saved to Gallery`
              : 'Select a pack or custom presets'}
          </span>
          <div className="burst-pack-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={busy || presetCount === 0}
            >
              Save Burst Pack
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}