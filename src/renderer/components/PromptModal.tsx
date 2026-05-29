import { useAppContext } from '../AppContext';

export default function PromptModal() {
  const { promptConfig, setPromptConfig } = useAppContext();

  if (!promptConfig) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(3, 7, 18, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: 'var(--bg-sidebar)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
        width: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-main)' }}>{promptConfig.message}</div>
        <input 
          type="text" 
          defaultValue={promptConfig.defaultValue}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              promptConfig.resolve(e.currentTarget.value);
              setPromptConfig(null);
            } else if (e.key === 'Escape') {
              promptConfig.resolve(null);
              setPromptConfig(null);
            }
          }}
          id="custom-prompt-input"
          style={{ width: '100%', marginBottom: '1.25rem' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              promptConfig.resolve(null);
              setPromptConfig(null);
            }}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              const input = document.getElementById('custom-prompt-input') as HTMLInputElement;
              promptConfig.resolve(input ? input.value : null);
              setPromptConfig(null);
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
