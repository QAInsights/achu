import { AppProvider, useAppContext } from './AppContext';
import Sidebar from './components/Sidebar';
import WorkspaceToolbar from './components/WorkspaceToolbar';
import CanvasPreview from './components/CanvasPreview';
import WorkspaceFooter from './components/WorkspaceFooter';
import PromptModal from './components/PromptModal';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import logoUrl from '../../assets/logo.svg';

function AppContent() {
  const { handleDragOver, handleDragLeave, handleDrop, sidebarVisible } = useAppContext();
  const isFrameless = window.snapFrameAPI && (window.snapFrameAPI.platform === 'win32' || window.snapFrameAPI.platform === 'darwin');
  const platformClass = window.snapFrameAPI ? `platform-${window.snapFrameAPI.platform}` : '';
  const collapsedClass = !sidebarVisible ? 'sidebar-collapsed' : '';

  return (
    <div className={`app-container app-load ${platformClass} ${collapsedClass}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Sidebar />
      <div className="workspace">
        {isFrameless && (
          <div className="workspace-titlebar">
            <div className="workspace-titlebar-brand">
              <img src={logoUrl} alt="Achu" className="workspace-titlebar-logo" />
              <span>Achu</span>
            </div>
          </div>
        )}
        <WorkspaceToolbar />
        <CanvasPreview />
        <WorkspaceFooter />
      </div>
      <PromptModal />
      <SettingsModal />
      <HelpModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
