import { AppProvider, useAppContext } from './AppContext';
import Sidebar from './components/Sidebar';
import WorkspaceToolbar from './components/WorkspaceToolbar';
import CanvasPreview from './components/CanvasPreview';
import WorkspaceFooter from './components/WorkspaceFooter';
import PromptModal from './components/PromptModal';
import SettingsModal from './components/SettingsModal';

function AppContent() {
  const { handleDragOver, handleDragLeave, handleDrop } = useAppContext();
  const isFrameless = window.snapFrameAPI && (window.snapFrameAPI.platform === 'win32' || window.snapFrameAPI.platform === 'darwin');
  const platformClass = window.snapFrameAPI ? `platform-${window.snapFrameAPI.platform}` : '';

  return (
    <div className={`app-container app-load ${platformClass}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Sidebar />
      <div className="workspace">
        {isFrameless && <div className="workspace-drag-handle" />}
        <WorkspaceToolbar />
        <CanvasPreview />
        <WorkspaceFooter />
      </div>
      <PromptModal />
      <SettingsModal />
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
