import { createContext, useContext } from 'react';
import { useAppContext } from '../AppContext';
import { useGallery } from '../hooks/useGallery';

type GalleryContextType = ReturnType<typeof useGallery>;

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export function GalleryProvider({ children }: { children: React.ReactNode }) {
  const { openGalleryImage } = useAppContext();
  const gallery = useGallery(openGalleryImage);

  return (
    <GalleryContext.Provider value={gallery}>
      {children}
    </GalleryContext.Provider>
  );
}

export function useGalleryContext(): GalleryContextType {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGalleryContext must be used within a GalleryProvider');
  }
  return context;
}