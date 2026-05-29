import { AppProvider, useAppContext } from './AppContext';
import Sidebar from './components/Sidebar';
import WorkspaceToolbar from './components/WorkspaceToolbar';
import CanvasPreview from './components/CanvasPreview';
import WorkspaceFooter from './components/WorkspaceFooter';
import PromptModal from './components/PromptModal';

function AppContent() {
  const { handleDragOver, handleDragLeave, handleDrop } = useAppContext();
  return (
    <div className="app-container" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Sidebar />
      <div className="workspace">
        <WorkspaceToolbar />
        <CanvasPreview />
        <WorkspaceFooter />
      </div>
      <PromptModal />
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
