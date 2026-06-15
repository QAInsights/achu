import { AppProvider, useAppContext } from './AppContext';
import { GalleryProvider, useGalleryContext } from './contexts/GalleryContext';
import Sidebar from './components/Sidebar';
import SecondarySidebar from './components/SecondarySidebar';
import WorkspaceToolbar from './components/WorkspaceToolbar';
import CanvasPreview from './components/CanvasPreview';
import WorkspaceFooter from './components/WorkspaceFooter';
import GalleryView from './components/GalleryView';
import PromptModal from './components/PromptModal';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import logoUrl from '../../assets/logo.svg';

function AppContent() {
  const { handleDragOver, handleDragLeave, handleDrop, sidebarVisible, fileInputRef, handleHTMLFileInput, sidebarPosition, secondarySidebarVisible, secondarySidebarPosition, documentName } = useAppContext();
  const { galleryVisible } = useGalleryContext();
  const isFrameless = window.snapFrameAPI && (window.snapFrameAPI.platform === 'win32' || window.snapFrameAPI.platform === 'darwin');
  const platformClass = window.snapFrameAPI ? `platform-${window.snapFrameAPI.platform}` : '';
  const collapsedClass = (!sidebarVisible && !secondarySidebarVisible) ? 'sidebar-collapsed' : '';
  const positionClass = sidebarPosition === 'right' ? 'sidebar-right-aligned' : 'sidebar-left-aligned';

  return (
    <div className={`app-container app-load ${platformClass} ${collapsedClass} ${positionClass}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {secondarySidebarPosition === 'left' && <SecondarySidebar />}
      {sidebarPosition === 'left' && <Sidebar />}
      <div className="workspace">
        {isFrameless && (
          <div className="workspace-titlebar">
            <div className="workspace-titlebar-brand">
              <img src={logoUrl} alt="achu" className="workspace-titlebar-logo" />
              <span>achu</span>
              {documentName && (
                <span className="workspace-titlebar-document" title={documentName}>
                  · {documentName}
                </span>
              )}
            </div>
          </div>
        )}
        <WorkspaceToolbar />
        {galleryVisible ? (
          <GalleryView />
        ) : (
          <>
            <CanvasPreview />
            <WorkspaceFooter />
          </>
        )}
      </div>
      {sidebarPosition === 'right' && <Sidebar />}
      {secondarySidebarPosition === 'right' && <SecondarySidebar />}
      <PromptModal />
      <SettingsModal />
      <HelpModal />
      <input
        type="file"
        ref={fileInputRef as any}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleHTMLFileInput}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <GalleryProvider>
        <AppContent />
      </GalleryProvider>
    </AppProvider>
  );
}
