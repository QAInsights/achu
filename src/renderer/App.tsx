import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, 
  Copy, 
  Download, 
  Undo2, 
  Redo2, 
  Maximize2, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Type, 
  Image as ImageIcon,
  MousePointer,
  Square,
  Circle,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Minimize2,
  Share2,
  Slash,
  Pencil,
  Smile,
  Palette,
  ArrowUpRight,
  PanelLeft,
  PanelLeftClose
} from 'lucide-react';
import { renderCanvas, RenderConfig, Annotation, drawMeshGradient } from './canvasRenderer';
import gradientPresetsImport from '../../assets/presets.json';
import AnnotationsLayer from './AnnotationsLayer';
import { disneyHollywoodGradients, disneyHollywoodMeshPalettes } from './presetsData';

// TypeScript declarations for secure Electron IPC bridge
declare global {
  interface Window {
    snapFrameAPI: {
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<boolean>;
      openFile: () => Promise<string | null>;
      saveFile: (base64Data: string, type: 'png' | 'jpeg', quality?: number) => Promise<boolean>;
      copyImageToClipboard: (base64Data: string) => Promise<boolean>;
      readImageFromClipboard: () => Promise<string | null>;
      onGlobalHotkeyTriggered: (callback: (imageUrl: string) => void) => () => void;
    };
  }
}

interface GradientPreset {
  id: string;
  name: string;
  gradient: string;
  type: 'gradient' | 'color';
}

const defaultGradients: GradientPreset[] = gradientPresetsImport as GradientPreset[];

// Curated mesh palettes
const curatedMeshPalettes = [
  {
    name: 'Sunset',
    colors: ['#ff5f6d', '#ffc371', '#ff7e5f', '#feb47b']
  },
  {
    name: 'Ocean',
    colors: ['#00c6ff', '#0072ff', '#0a2540', '#00d2ff']
  },
  {
    name: 'Neon',
    colors: ['#f72585', '#7209b7', '#3f37c9', '#4cc9f0']
  },
  {
    name: 'Forest',
    colors: ['#11998e', '#38ef7d', '#134e5e', '#71b280']
  },
  {
    name: 'Aurora',
    colors: ['#0575e6', '#00f260', '#0f2027', '#203a43']
  }
];

// Tailwind colors swatches for Solid Presets
const solidPresets = [
  { id: 'white', name: 'White', color: '#ffffff', type: 'color' },
  { id: 'black', name: 'Black', color: '#090d16', type: 'color' },
  { id: 'slate', name: 'Slate', color: '#475569', type: 'color' },
  { id: 'indigo', name: 'Indigo', color: '#6366f1', type: 'color' },
  { id: 'emerald', name: 'Emerald', color: '#10b981', type: 'color' },
  { id: 'rose', name: 'Rose', color: '#f43f5e', type: 'color' },
  { id: 'amber', name: 'Amber', color: '#f59e0b', type: 'color' },
  { id: 'sky', name: 'Sky', color: '#0ea5e9', type: 'color' },
];

export default function App() {
  // Config state
  const [padding, setPadding] = useState<number>(38);
  const [rounded, setRounded] = useState<number>(20);
  const [shadow, setShadow] = useState<number>(30);
  const [shadowColor, setShadowColor] = useState<string>('rgba(0, 0, 0, 0.45)');
  const [shadowEnabled, setShadowEnabled] = useState<boolean>(true);
  const [inset, setInset] = useState<number>(0);
  const [insetColor, setInsetColor] = useState<string>('rgba(255, 255, 255, 0.25)');
  const [border, setBorder] = useState<number>(0);
  const [borderColor, setBorderColor] = useState<string>('#ffffff');
  const [scale, setScale] = useState<number>(100);
  
  const [backgroundType, setBackgroundType] = useState<'gradient' | 'color' | 'blur' | 'mesh'>('gradient');
  const [backgroundValue, setBackgroundValue] = useState<string>('linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)');
  const [aspectRatio, setAspectRatio] = useState<string>('Auto');
  const [canvasWidth, setCanvasWidth] = useState<number>(800);
  const [canvasHeight, setCanvasHeight] = useState<number>(600);
  const [paddingMode, setPaddingMode] = useState<'fit' | 'fill'>('fit');
  const [chromeStyle, setChromeStyle] = useState<'mac' | 'windows' | 'none'>('mac');
  const [chromeTheme, setChromeTheme] = useState<'dark' | 'light'>('dark');
  const [blurDensity, setBlurDensity] = useState<number>(40);
  
  // Better Gradient States
  const [noImageMode, setNoImageMode] = useState<boolean>(false);
  const [meshPoints, setMeshPoints] = useState<Array<{ id: string; color: string; x: number; y: number; radius: number }>>([
    { id: '1', color: '#ff5f6d', x: 0.2, y: 0.2, radius: 180 },
    { id: '2', color: '#ffc371', x: 0.8, y: 0.2, radius: 220 },
    { id: '3', color: '#00c6ff', x: 0.2, y: 0.8, radius: 200 },
    { id: '4', color: '#7209b7', x: 0.8, y: 0.8, radius: 240 },
  ]);
  const [meshBlur, setMeshBlur] = useState<number>(60);
  const [meshGrain, setMeshGrain] = useState<number>(15);
  const [meshOpacity, setMeshOpacity] = useState<number>(100);
  const [meshSpread, setMeshSpread] = useState<number>(100);
  const [meshDataUrl, setMeshDataUrl] = useState<string>('');
  const [activePointIdx, setActivePointIdx] = useState<number>(0);

  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('SnapFrame.app');
  const [position, setPosition] = useState<string>('Middle center');
  const [activeTool, setActiveTool] = useState<'pointer' | 'rect' | 'filled-rect' | 'circle' | 'filled-circle' | 'line' | 'arrow' | 'text' | 'pen' | 'emoji'>('pointer');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationColor, setAnnotationColor] = useState<string>('#f43f5e');
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState<number>(4);

  // Custom Promise-based Prompt Modal State
  const [promptConfig, setPromptConfig] = useState<{ message: string; defaultValue: string; resolve: (val: string | null) => void } | null>(null);

  const customPrompt = (message: string, defaultValue: string = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptConfig({ message, defaultValue, resolve });
    });
  };

  // App UI State
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [customPresets, setCustomPresets] = useState<any[]>([]);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [showAdvancedInset, setShowAdvancedInset] = useState<boolean>(false);
  const [showAdvancedShadow, setShowAdvancedShadow] = useState<boolean>(false);
  const [showAdvancedBorder, setShowAdvancedBorder] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [jpegQuality, setJpegQuality] = useState<number>(90);
  const [zoomLevel, setZoomLevel] = useState<string>('Zoom to fit');

  // Hollywood & Disney Color Palettes State
  const [showHollywoodPalettes, setShowHollywoodPalettes] = useState<boolean>(false);
  const [selectedGradientCategory, setSelectedGradientCategory] = useState<'classic' | 'disney' | 'marvel' | 'hollywood'>('classic');
  const [showHollywoodMeshPalettes, setShowHollywoodMeshPalettes] = useState<boolean>(false);

  // History State for Undo/Redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  // Capture current state configuration
  const getCurrentConfig = (): RenderConfig => ({
    padding,
    rounded,
    shadow,
    shadowColor,
    shadowEnabled,
    inset,
    insetColor,
    border,
    borderColor,
    scale,
    backgroundType,
    backgroundValue,
    aspectRatio,
    canvasWidth,
    canvasHeight,
    paddingMode,
    chromeStyle,
    chromeTheme,
    blurDensity,
    watermarkEnabled,
    watermarkText,
    position,
    annotations,
    meshPoints,
    meshBlur,
    meshGrain,
    meshOpacity,
    meshSpread,
    noImage: noImageMode,
  });

  // Push to history when configurations change
  const pushHistory = (config: any) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(config)));
    
    // Cap history length at 50 to conserve memory
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const applyConfig = (config: RenderConfig) => {
    if (!config) return;
    setPadding(config.padding ?? 38);
    setRounded(config.rounded ?? 20);
    setShadow(config.shadow ?? 30);
    setShadowColor(config.shadowColor ?? 'rgba(0, 0, 0, 0.45)');
    setShadowEnabled(config.shadowEnabled ?? true);
    setInset(config.inset ?? 0);
    setInsetColor(config.insetColor ?? 'rgba(255, 255, 255, 0.25)');
    setBorder(config.border ?? 0);
    setBorderColor(config.borderColor ?? '#ffffff');
    setScale(config.scale ?? 100);
    setBackgroundType(config.backgroundType ?? 'gradient');
    setBackgroundValue(config.backgroundValue ?? 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)');
    setAspectRatio(config.aspectRatio ?? 'Auto');
    setCanvasWidth(config.canvasWidth ?? 800);
    setCanvasHeight(config.canvasHeight ?? 600);
    setPaddingMode(config.paddingMode ?? 'fit');
    setChromeStyle(config.chromeStyle ?? 'mac');
    setChromeTheme(config.chromeTheme ?? 'dark');
    setBlurDensity(config.blurDensity ?? 40);
    setWatermarkEnabled(config.watermarkEnabled ?? false);
    setWatermarkText(config.watermarkText ?? 'SnapFrame.app');
    setPosition(config.position ?? 'Middle center');
    setAnnotations(config.annotations ?? []);
    setMeshPoints(config.meshPoints ?? [
      { id: '1', color: '#ff5f6d', x: 0.2, y: 0.2, radius: 180 },
      { id: '2', color: '#ffc371', x: 0.8, y: 0.2, radius: 220 },
      { id: '3', color: '#00c6ff', x: 0.2, y: 0.8, radius: 200 },
      { id: '4', color: '#7209b7', x: 0.8, y: 0.8, radius: 240 },
    ]);
    setMeshBlur(config.meshBlur ?? 60);
    setMeshGrain(config.meshGrain ?? 15);
    setMeshOpacity(config.meshOpacity ?? 100);
    setMeshSpread(config.meshSpread ?? 100);
    setNoImageMode(config.noImage ?? false);
  };

  // Setup undo / redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      applyConfig(history[newIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      applyConfig(history[newIdx]);
    }
  };

  // Settings sync
  useEffect(() => {
    const initApp = async () => {
      if (window.snapFrameAPI) {
        try {
          const settings = await window.snapFrameAPI.getSettings();
          if (settings.lastConfig) {
            applyConfig(settings.lastConfig);
          }
          if (settings.presets) {
            setCustomPresets(settings.presets);
          }
        } catch (e) {
          console.error('Failed to read settings:', e);
        }
      }
    };
    initApp();
  }, []);

  // Sync settings when state changes (excluding annotations from persistent settings)
  useEffect(() => {
    const saveSettingsToMain = async () => {
      if (window.snapFrameAPI) {
        const config = getCurrentConfig();
        const settings = {
          windowBounds: {}, // main handles window size autonomously
          lastConfig: {
            ...config,
            annotations: [], // do not persist annotations across app launches
          },
          presets: customPresets,
        };
        await window.snapFrameAPI.saveSettings(settings);
      }
    };

    const timer = setTimeout(saveSettingsToMain, 1000); // Debounce saves
    return () => clearTimeout(timer);
  }, [
    padding, rounded, shadow, shadowColor, shadowEnabled, 
    inset, insetColor, border, borderColor, scale, 
    backgroundType, backgroundValue, aspectRatio, canvasWidth, 
    canvasHeight, paddingMode, chromeStyle, chromeTheme, blurDensity,
    watermarkEnabled, watermarkText, position, customPresets,
    meshPoints, meshBlur, meshGrain, meshOpacity, meshSpread, noImageMode
  ]);

  // Handle global hotkey and clipboard pasting
  useEffect(() => {
    if (window.snapFrameAPI) {
      const unsubscribe = window.snapFrameAPI.onGlobalHotkeyTriggered((imageUrl) => {
        onImageLoadedRef.current(imageUrl);
      });
      return () => unsubscribe();
    }
  }, []);

  // Listen to paste events in the app (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (window.snapFrameAPI) {
        const dataUrl = await window.snapFrameAPI.readImageFromClipboard();
        if (dataUrl) {
          onImageLoadedRef.current(dataUrl);
          return;
        }
      }

      // Fallback for browser-only testing
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  onImageLoadedRef.current(event.target.result as string);
                }
              };
              reader.readAsDataURL(blob);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Global keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y (Redo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl+Shift+S (Export)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerExport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, imageSrc, padding, rounded, shadow, shadowColor, shadowEnabled, inset, insetColor, border, borderColor, scale, backgroundType, backgroundValue, aspectRatio, canvasWidth, canvasHeight, paddingMode, chromeStyle, chromeTheme, blurDensity, watermarkEnabled, watermarkText, position, exportFormat, jpegQuality, annotations, meshPoints, meshBlur, meshGrain, meshOpacity, meshSpread, noImageMode]);

  // Image load & tracking history triggers
  const onImageLoaded = (src: string) => {
    setImageSrc(src);
    setNoImageMode(false); // Reset to normal screenshot mode
    setAnnotations([]); // clear annotations when opening a new image
    // Push the current config to history as a baseline
    pushHistory({
      ...getCurrentConfig(),
      annotations: [],
      noImage: false,
    });
  };

  const onImageLoadedRef = useRef(onImageLoaded);
  useEffect(() => {
    onImageLoadedRef.current = onImageLoaded;
  }, [onImageLoaded]);

  // Mesh gradient background rendering Effect
  useEffect(() => {
    if (backgroundType !== 'mesh') return;

    const canvas = document.createElement('canvas');
    const baseW = 800;
    let ratio = 16 / 9;
    if (aspectRatio === '1:1') ratio = 1;
    else if (aspectRatio === '4:3') ratio = 4 / 3;
    else if (aspectRatio === '16:9') ratio = 16 / 9;
    else if (aspectRatio === '3:2') ratio = 3 / 2;
    else if (aspectRatio === 'Custom') {
      ratio = canvasWidth / canvasHeight;
    }
    
    canvas.width = baseW;
    canvas.height = Math.round(baseW / ratio);
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawMeshGradient(
        ctx, 
        canvas.width, 
        canvas.height, 
        meshPoints, 
        meshBlur, 
        meshGrain, 
        meshOpacity, 
        meshSpread
      );
      setMeshDataUrl(canvas.toDataURL());
    }
  }, [backgroundType, meshPoints, meshBlur, meshGrain, meshOpacity, meshSpread, aspectRatio, canvasWidth, canvasHeight]);

  // Dragging handlers for mesh points
  const dragStartRef = useRef<{ idx: number; rect: DOMRect } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    setActivePointIdx(idx);
    const container = e.currentTarget.parentElement;
    if (container) {
      dragStartRef.current = {
        idx,
        rect: container.getBoundingClientRect()
      };
      container.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const { idx, rect } = dragStartRef.current;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    setMeshPoints((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], x, y };
      return copy;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartRef.current) {
      const container = e.currentTarget as HTMLDivElement;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch (err) {}
      dragStartRef.current = null;
      pushHistory(getCurrentConfig());
    }
  };

  const applyMeshPalette = (colors: string[]) => {
    setMeshPoints((prev) => {
      return prev.map((pt, idx) => {
        const color = colors[idx % colors.length];
        return { ...pt, color };
      });
    });
    pushHistory(getCurrentConfig());
  };

  const generateRandomPalette = () => {
    const randomHex = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    setMeshPoints((prev) => {
      return prev.map((pt) => ({
        ...pt,
        color: randomHex(),
        x: Math.random() * 0.8 + 0.1,
        y: Math.random() * 0.8 + 0.1
      }));
    });
    pushHistory(getCurrentConfig());
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            onImageLoaded(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const selectFile = async () => {
    if (window.snapFrameAPI) {
      const imgData = await window.snapFrameAPI.openFile();
      if (imgData) {
        onImageLoaded(imgData);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleHTMLFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageLoaded(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Clipboard paste trigger (UI button)
  const pasteFromClipboard = async () => {
    if (window.snapFrameAPI) {
      const dataUrl = await window.snapFrameAPI.readImageFromClipboard();
      if (dataUrl) {
        onImageLoaded(dataUrl);
      } else {
        alert('No image found in clipboard.');
      }
    }
  };

  // Add custom background preset
  const saveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName,
      gradient: backgroundType === 'gradient' ? backgroundValue : undefined,
      color: backgroundType === 'color' ? backgroundValue : undefined,
      type: backgroundType === 'gradient' ? 'gradient' : 'color',
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    setNewPresetName('');
  };

  const deleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
  };

  // Copy to clipboard
  const copyBeautifiedImage = async () => {
    if (!noImageMode && !imageSrc) return;

    const runCopy = (img: HTMLImageElement | null) => {
      const canvas = document.createElement('canvas');
      renderCanvas(canvas, img, getCurrentConfig());
      const base64Data = canvas.toDataURL('image/png');
      
      if (window.snapFrameAPI) {
        window.snapFrameAPI.copyImageToClipboard(base64Data).then((success) => {
          if (success) {
            alert('Beautified image copied to clipboard!');
          } else {
            alert('Failed to copy to clipboard.');
          }
        });
      } else {
        // Fallback for browser-only testing
        canvas.toBlob((blob) => {
          if (blob) {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]).then(() => alert('Copied to clipboard (Browser)!'));
          }
        }, 'image/png');
      }
    };

    if (noImageMode || !imageSrc) {
      runCopy(null);
    } else {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => runCopy(img);
    }
  };

  // Export as PNG or JPG file
  const triggerExport = () => {
    if (!noImageMode && !imageSrc) return;

    const runExport = (img: HTMLImageElement | null) => {
      const canvas = document.createElement('canvas');
      renderCanvas(canvas, img, getCurrentConfig());
      
      const mime = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const base64Data = canvas.toDataURL(mime, jpegQuality / 100);

      if (window.snapFrameAPI) {
        window.snapFrameAPI.saveFile(
          base64Data, 
          exportFormat, 
          jpegQuality
        ).then((success) => {
          if (success) {
            console.log('Saved successfully');
          }
        });
      } else {
        // Fallback in web browser
        const link = document.createElement('a');
        link.download = `snapframe-export.${exportFormat === 'jpeg' ? 'jpg' : 'png'}`;
        link.href = base64Data;
        link.click();
      }
    };

    if (noImageMode || !imageSrc) {
      runExport(null);
    } else {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => runExport(img);
    }
  };

  // Background values change
  const selectBackgroundPreset = (preset: any) => {
    setBackgroundType(preset.type);
    setBackgroundValue(preset.gradient || preset.color);
    pushHistory({
      ...getCurrentConfig(),
      backgroundType: preset.type,
      backgroundValue: preset.gradient || preset.color,
    });
  };

  // Track slider releases to save history states
  const handleSliderRelease = () => {
    pushHistory(getCurrentConfig());
  };

  // Zoom logic
  const getZoomStyle = (): React.CSSProperties => {
    if (zoomLevel === '50%') return { transform: 'scale(0.5)' };
    if (zoomLevel === '100%') return { transform: 'scale(1)' };
    if (zoomLevel === '200%') return { transform: 'scale(2)' };
    // Zoom to fit calculates size in viewport
    return {};
  };

  return (
    <div className="app-container" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      
      {/* 1. Left Sidebar - Control Panel */}
      <div 
        className="sidebar"
        style={{
          width: sidebarVisible ? 'var(--sidebar-width)' : '0px',
          minWidth: sidebarVisible ? 'var(--sidebar-width)' : '0px',
          opacity: sidebarVisible ? 1 : 0,
          pointerEvents: sidebarVisible ? 'auto' : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRight: sidebarVisible ? '1px solid var(--border-color)' : 'none',
          boxShadow: sidebarVisible ? '4px 0 24px rgba(0, 0, 0, 0.35)' : 'none',
        }}
      >
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>SnapFrame</span>
          </div>
          <button className="preset-delete-btn" onClick={() => {
            setImageSrc(null);
            setHistory([]);
            setHistoryIndex(-1);
          }}>
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="sidebar-content">
          
          {/* Snap / Change Actions */}
          <div className="btn-group">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={selectFile}>
              <Plus className="w-4 h-4" /> New snap
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={pasteFromClipboard}>
              <Copy className="w-4 h-4" /> Paste
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*" 
            onChange={handleHTMLFileInput} 
          />

          {/* User Presets */}
          <div className="control-group">
            <div className="presets-header">
              <span className="control-label">User Presets</span>
            </div>
            
            <div className="color-picker-row">
              <input 
                type="text" 
                placeholder="Preset name..." 
                value={newPresetName} 
                onChange={(e) => setNewPresetName(e.target.value)} 
                style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
              />
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={saveCustomPreset} title="Save current background">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {customPresets.length > 0 && (
              <div className="presets-list">
                {customPresets.map((p) => (
                  <div key={p.id} className="preset-item" onClick={() => selectBackgroundPreset(p)}>
                    <span>{p.name}</span>
                    <button className="preset-delete-btn" onClick={(e) => deleteCustomPreset(p.id, e)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Position Layout */}
          <div className="control-group">
            <span className="control-label">Position</span>
            <select value={position} onChange={(e) => {
              setPosition(e.target.value);
              pushHistory({ ...getCurrentConfig(), position: e.target.value });
            }}>
              <option>Middle center</option>
              <option>Top center</option>
              <option>Bottom center</option>
              <option>Middle left</option>
              <option>Middle right</option>
            </select>
          </div>

          {/* Padding */}
          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Padding</span>
              <span className="control-value">{padding}px</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="120" 
              value={padding} 
              onChange={(e) => setPadding(parseInt(e.target.value, 10))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          {/* Scale */}
          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Scale</span>
              <span className="control-value">{scale}%</span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="100" 
              value={scale} 
              onChange={(e) => setScale(parseInt(e.target.value, 10))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          {/* Inset Border (Inner Border) */}
          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Inset Border</span>
              <span className="control-link" onClick={() => setShowAdvancedInset(!showAdvancedInset)}>
                {showAdvancedInset ? 'Hide' : 'Advanced'}
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="20" 
              value={inset} 
              onChange={(e) => setInset(parseInt(e.target.value, 10))}
              onMouseUp={handleSliderRelease}
            />
            {showAdvancedInset && (
              <div className="color-picker-row" style={{ marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Color:</span>
                <input 
                  type="color" 
                  value={insetColor.startsWith('rgba') ? '#ffffff' : insetColor} 
                  onChange={(e) => {
                    setInsetColor(e.target.value);
                    pushHistory({ ...getCurrentConfig(), insetColor: e.target.value });
                  }} 
                  className="color-swatch-picker"
                />
                <input 
                  type="text" 
                  value={insetColor} 
                  onChange={(e) => {
                    setInsetColor(e.target.value);
                    pushHistory({ ...getCurrentConfig(), insetColor: e.target.value });
                  }} 
                  style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                />
              </div>
            )}
          </div>

          {/* Drop Shadow */}
          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Shadow</span>
              <span className="control-link" onClick={() => setShowAdvancedShadow(!showAdvancedShadow)}>
                {showAdvancedShadow ? 'Hide' : 'Advanced'}
              </span>
            </div>
            <div className="switch-container" style={{ marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Shadow Enabled</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={shadowEnabled} 
                  onChange={(e) => {
                    setShadowEnabled(e.target.checked);
                    pushHistory({ ...getCurrentConfig(), shadowEnabled: e.target.checked });
                  }} 
                />
                <span className="slider-switch"></span>
              </label>
            </div>
            <input 
              type="range" 
              min="0" 
              max="50" 
              value={shadow} 
              disabled={!shadowEnabled}
              onChange={(e) => setShadow(parseInt(e.target.value, 10))}
              onMouseUp={handleSliderRelease}
            />
            {showAdvancedShadow && shadowEnabled && (
              <div className="color-picker-row" style={{ marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Color:</span>
                <input 
                  type="color" 
                  value={shadowColor.startsWith('rgba') ? '#000000' : shadowColor} 
                  onChange={(e) => {
                    setShadowColor(e.target.value);
                    pushHistory({ ...getCurrentConfig(), shadowColor: e.target.value });
                  }} 
                  className="color-swatch-picker"
                />
                <input 
                  type="text" 
                  value={shadowColor} 
                  onChange={(e) => {
                    setShadowColor(e.target.value);
                    pushHistory({ ...getCurrentConfig(), shadowColor: e.target.value });
                  }} 
                  style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                />
              </div>
            )}
          </div>

          {/* Rounded Corner */}
          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Rounded Corners</span>
              <span className="control-value">{rounded}px</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="40" 
              value={rounded} 
              onChange={(e) => setRounded(parseInt(e.target.value, 10))}
              onMouseUp={handleSliderRelease}
            />
          </div>

          {/* Border (Outer) */}
          <div className="control-group">
            <div className="control-label-container">
              <span className="control-label">Outer Border</span>
              <span className="control-link" onClick={() => setShowAdvancedBorder(!showAdvancedBorder)}>
                {showAdvancedBorder ? 'Hide' : 'Advanced'}
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="20" 
              value={border} 
              onChange={(e) => setBorder(parseInt(e.target.value, 10))}
              onMouseUp={handleSliderRelease}
            />
            {showAdvancedBorder && (
              <div className="color-picker-row" style={{ marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Color:</span>
                <input 
                  type="color" 
                  value={borderColor} 
                  onChange={(e) => {
                    setBorderColor(e.target.value);
                    pushHistory({ ...getCurrentConfig(), borderColor: e.target.value });
                  }} 
                  className="color-swatch-picker"
                />
                <input 
                  type="text" 
                  value={borderColor} 
                  onChange={(e) => {
                    setBorderColor(e.target.value);
                    pushHistory({ ...getCurrentConfig(), borderColor: e.target.value });
                  }} 
                  style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                />
              </div>
            )}
          </div>

          {/* Background Mode Selector */}
          <div className="control-group">
            <span className="control-label">Background Mode</span>
            <div className="btn-group">
              {(['color', 'gradient', 'blur', 'mesh'] as const).map((type) => (
                <button
                  key={type}
                  className={`btn-group-item ${backgroundType === type ? 'active' : ''}`}
                  onClick={() => {
                    setBackgroundType(type);
                    pushHistory({ ...getCurrentConfig(), backgroundType: type });
                  }}
                >
                  {type === 'color' ? 'Solid' : type === 'gradient' ? 'Preset' : type === 'blur' ? 'Blurred' : 'Mesh'}
                </button>
              ))}
            </div>
          </div>

          {/* Background Presets / Blur Density / Mesh Aurora Gradient Controls */}
          {backgroundType === 'blur' && (
            <div className="control-group">
              <div className="control-label-container">
                <span className="control-label">Blur Density</span>
                <span className="control-value">{blurDensity}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={blurDensity}
                onChange={(e) => setBlurDensity(parseInt(e.target.value, 10))}
                onMouseUp={handleSliderRelease}
              />
            </div>
          )}

          {(backgroundType === 'color' || backgroundType === 'gradient') && (
            <div className="control-group">
              <div className="control-label-container">
                <span className="control-label">Background Colors</span>
              </div>
              
              {backgroundType === 'color' && (
                <div className="color-picker-row" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Custom:</span>
                  <input 
                    type="color" 
                    value={backgroundValue.startsWith('linear') ? '#ffffff' : backgroundValue} 
                    onChange={(e) => {
                      setBackgroundValue(e.target.value);
                      pushHistory({ ...getCurrentConfig(), backgroundValue: e.target.value });
                    }} 
                    className="color-swatch-picker"
                  />
                  <input 
                    type="text" 
                    value={backgroundValue} 
                    onChange={(e) => {
                      setBackgroundValue(e.target.value);
                      pushHistory({ ...getCurrentConfig(), backgroundValue: e.target.value });
                    }} 
                    style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                  />
                </div>
              )}

              {backgroundType === 'gradient' && showHollywoodPalettes && (
                <div className="btn-group" style={{ marginBottom: '0.5rem', gap: '0.2rem' }}>
                  {(['classic', 'disney', 'marvel', 'hollywood'] as const).map((cat) => (
                    <button
                      key={cat}
                      className={`btn-group-item ${selectedGradientCategory === cat ? 'active' : ''}`}
                      style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', textTransform: 'capitalize' }}
                      onClick={() => setSelectedGradientCategory(cat)}
                    >
                      {cat === 'classic' ? 'Classic' : cat === 'disney' ? 'Disney' : cat === 'marvel' ? 'Marvel' : 'Hollywood'}
                    </button>
                  ))}
                </div>
              )}

              <div className="preset-grid">
                {backgroundType === 'gradient' && (
                  !showHollywoodPalettes || selectedGradientCategory === 'classic' ? (
                    defaultGradients.map((g) => (
                      <div 
                        key={g.id} 
                        className={`preset-swatch ${backgroundType === 'gradient' && backgroundValue === g.gradient ? 'active' : ''}`}
                        style={{ background: g.gradient }}
                        onClick={() => selectBackgroundPreset(g)}
                        title={g.name}
                      />
                    ))
                  ) : (
                    disneyHollywoodGradients
                      .filter((g) => g.category === selectedGradientCategory)
                      .map((g) => (
                        <div 
                          key={g.id} 
                          className={`preset-swatch ${backgroundType === 'gradient' && backgroundValue === g.gradient ? 'active' : ''}`}
                          style={{ background: g.gradient }}
                          onClick={() => selectBackgroundPreset(g)}
                          title={g.name}
                        />
                      ))
                  )
                )}
                {(!showHollywoodPalettes || selectedGradientCategory === 'classic') && solidPresets.map((s) => (
                  <div 
                    key={s.id} 
                    className={`preset-swatch ${backgroundType === 'color' && backgroundValue === s.color ? 'active' : ''}`}
                    style={{ backgroundColor: s.color }}
                    onClick={() => selectBackgroundPreset(s)}
                    title={s.name}
                  />
                ))}
              </div>

              {backgroundType === 'gradient' && (
                <button
                  className="btn btn-secondary"
                  style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    padding: '0.4rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                  onClick={() => {
                    const nextVal = !showHollywoodPalettes;
                    setShowHollywoodPalettes(nextVal);
                    if (nextVal) {
                      setSelectedGradientCategory('disney');
                    } else {
                      setSelectedGradientCategory('classic');
                    }
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  {showHollywoodPalettes ? 'Hide Movie Palettes' : '✨ Load Hollywood & Disney Palettes'}
                </button>
              )}
            </div>
          )}

          {backgroundType === 'mesh' && (
            <>
              {/* Mesh Palettes & Points Management */}
              <div className="control-group">
                <span className="control-label">Better Gradient Designer</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Curated Palettes:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {curatedMeshPalettes.map((pal) => (
                      <button
                        key={pal.name}
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => applyMeshPalette(pal.colors)}
                      >
                        {pal.name}
                      </button>
                    ))}
                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                        borderColor: 'var(--border-color)',
                      }}
                      onClick={() => setShowHollywoodMeshPalettes(!showHollywoodMeshPalettes)}
                    >
                      {showHollywoodMeshPalettes ? 'Hide Movie' : '✨ + Movie Palettes'}
                    </button>
                    {showHollywoodMeshPalettes && disneyHollywoodMeshPalettes.map((pal) => (
                      <button
                        key={pal.name}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                          borderColor: 'rgba(139, 92, 246, 0.4)',
                        }}
                        onClick={() => applyMeshPalette(pal.colors)}
                        title={`${pal.category.toUpperCase()}: ${pal.colors.join(', ')}`}
                      >
                        🎬 {pal.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Color Spots</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        onClick={generateRandomPalette}
                        title="Randomize points position and colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" style={{ marginRight: '0.2rem' }} /> Randomize
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.4rem' }}
                        onClick={() => {
                          if (meshPoints.length >= 10) return;
                          const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                          const randomColor = colors[Math.floor(Math.random() * colors.length)];
                          const newPt = {
                            id: `mesh-${Date.now()}`,
                            color: randomColor,
                            x: 0.2 + Math.random() * 0.6,
                            y: 0.2 + Math.random() * 0.6,
                            radius: 200
                          };
                          const updated = [...meshPoints, newPt];
                          setMeshPoints(updated);
                          setActivePointIdx(meshPoints.length);
                          pushHistory({ ...getCurrentConfig(), meshPoints: updated });
                        }}
                        disabled={meshPoints.length >= 10}
                        title="Add spot"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.4rem' }}
                        onClick={() => {
                          if (meshPoints.length <= 2) return;
                          const filtered = meshPoints.filter((_, idx) => idx !== activePointIdx);
                          setMeshPoints(filtered);
                          setActivePointIdx(Math.max(0, activePointIdx - 1));
                          pushHistory({ ...getCurrentConfig(), meshPoints: filtered });
                        }}
                        disabled={meshPoints.length <= 2}
                        title="Remove active spot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {meshPoints.map((pt, idx) => (
                      <button
                        key={pt.id}
                        onClick={() => setActivePointIdx(idx)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: pt.color,
                          border: idx === activePointIdx ? '2.5px solid #ffffff' : '1px solid var(--border-color)',
                          boxShadow: idx === activePointIdx ? '0 0 0 2px var(--color-primary)' : 'none',
                          cursor: 'pointer',
                        }}
                        title={`Point ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {meshPoints[activePointIdx] && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px' }}>
                      <div className="color-picker-row">
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Color:</span>
                        <input
                          type="color"
                          value={meshPoints[activePointIdx].color}
                          onChange={(e) => {
                            const updated = [...meshPoints];
                            updated[activePointIdx] = { ...updated[activePointIdx], color: e.target.value };
                            setMeshPoints(updated);
                          }}
                          onBlur={() => pushHistory(getCurrentConfig())}
                          className="color-swatch-picker"
                        />
                        <input
                          type="text"
                          value={meshPoints[activePointIdx].color}
                          onChange={(e) => {
                            const updated = [...meshPoints];
                            updated[activePointIdx] = { ...updated[activePointIdx], color: e.target.value };
                            setMeshPoints(updated);
                          }}
                          onBlur={() => pushHistory(getCurrentConfig())}
                          style={{ flex: 1, padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div className="control-label-container">
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Spot Radius</span>
                          <span className="control-value">{meshPoints[activePointIdx].radius}px</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="400"
                          value={meshPoints[activePointIdx].radius}
                          onChange={(e) => {
                            const updated = [...meshPoints];
                            updated[activePointIdx] = { ...updated[activePointIdx], radius: parseInt(e.target.value, 10) };
                            setMeshPoints(updated);
                          }}
                          onMouseUp={handleSliderRelease}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div className="control-label-container">
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Position X</span>
                          <span className="control-value">{Math.round(meshPoints[activePointIdx].x * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(meshPoints[activePointIdx].x * 100)}
                          onChange={(e) => {
                            const updated = [...meshPoints];
                            updated[activePointIdx] = { ...updated[activePointIdx], x: parseInt(e.target.value, 10) / 100 };
                            setMeshPoints(updated);
                          }}
                          onMouseUp={handleSliderRelease}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div className="control-label-container">
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Position Y</span>
                          <span className="control-value">{Math.round(meshPoints[activePointIdx].y * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(meshPoints[activePointIdx].y * 100)}
                          onChange={(e) => {
                            const updated = [...meshPoints];
                            updated[activePointIdx] = { ...updated[activePointIdx], y: parseInt(e.target.value, 10) / 100 };
                            setMeshPoints(updated);
                          }}
                          onMouseUp={handleSliderRelease}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Filters Panel */}
              <div className="control-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="control-label">Filters</span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => {
                      setMeshBlur(60);
                      setMeshGrain(15);
                      setMeshOpacity(100);
                      setMeshSpread(100);
                      pushHistory({ ...getCurrentConfig(), meshBlur: 60, meshGrain: 15, meshOpacity: 100, meshSpread: 100 });
                    }}
                  >
                    Reset Filters
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="control-label-container">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Blur (Blending)</span>
                      <span className="control-value">{meshBlur}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={meshBlur}
                      onChange={(e) => setMeshBlur(parseInt(e.target.value, 10))}
                      onMouseUp={handleSliderRelease}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="control-label-container">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Grain (Noise)</span>
                      <span className="control-value">{meshGrain}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={meshGrain}
                      onChange={(e) => setMeshGrain(parseInt(e.target.value, 10))}
                      onMouseUp={handleSliderRelease}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="control-label-container">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Opacity</span>
                      <span className="control-value">{meshOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={meshOpacity}
                      onChange={(e) => setMeshOpacity(parseInt(e.target.value, 10))}
                      onMouseUp={handleSliderRelease}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="control-label-container">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Spread (Radius)</span>
                      <span className="control-value">{meshSpread}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={meshSpread}
                      onChange={(e) => setMeshSpread(parseInt(e.target.value, 10))}
                      onMouseUp={handleSliderRelease}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Aspect Ratio */}
          <div className="control-group">
            <span className="control-label">Aspect Ratio</span>
            <div className="btn-group">
              {['Auto', '1:1', '4:3', '16:9', '3:2', 'Custom'].map((ratio) => (
                <button 
                  key={ratio} 
                  className={`btn-group-item ${aspectRatio === ratio ? 'active' : ''}`}
                  onClick={() => {
                    setAspectRatio(ratio);
                    pushHistory({ ...getCurrentConfig(), aspectRatio: ratio });
                  }}
                >
                  {ratio}
                </button>
              ))}
            </div>
            {aspectRatio === 'Custom' && (
              <div className="color-picker-row" style={{ marginTop: '0.5rem' }}>
                <input 
                  type="number" 
                  placeholder="Width" 
                  value={canvasWidth} 
                  onChange={(e) => {
                    setCanvasWidth(parseInt(e.target.value, 10) || 800);
                    pushHistory({ ...getCurrentConfig(), canvasWidth: parseInt(e.target.value, 10) || 800 });
                  }} 
                  style={{ padding: '0.4rem', textAlign: 'center' }} 
                />
                <span style={{ color: 'var(--text-muted)' }}>×</span>
                <input 
                  type="number" 
                  placeholder="Height" 
                  value={canvasHeight} 
                  onChange={(e) => {
                    setCanvasHeight(parseInt(e.target.value, 10) || 600);
                    pushHistory({ ...getCurrentConfig(), canvasHeight: parseInt(e.target.value, 10) || 600 });
                  }} 
                  style={{ padding: '0.4rem', textAlign: 'center' }} 
                />
              </div>
            )}
            {aspectRatio !== 'Auto' && (
              <div className="switch-container" style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Padding Mode</span>
                <select 
                  value={paddingMode} 
                  onChange={(e) => {
                    setPaddingMode(e.target.value as 'fit' | 'fill');
                    pushHistory({ ...getCurrentConfig(), paddingMode: e.target.value as 'fit' | 'fill' });
                  }}
                  style={{ width: '100px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                >
                  <option value="fit">Fit</option>
                  <option value="fill">Fill</option>
                </select>
              </div>
            )}
          </div>

          {/* Browser Chrome Overlay */}
          <div className="control-group">
            <span className="control-label">Browser Mockup</span>
            <select value={chromeStyle} onChange={(e) => {
              setChromeStyle(e.target.value as any);
              pushHistory({ ...getCurrentConfig(), chromeStyle: e.target.value as any });
            }}>
              <option value="none">None</option>
              <option value="mac">macOS Style</option>
              <option value="windows">Windows Style</option>
            </select>

            {chromeStyle !== 'none' && (
              <div style={{ display: 'flex', gap: '1px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden', marginTop: '0.5rem' }}>
                <button 
                  className={`btn btn-secondary`} 
                  style={{ 
                    flex: 1, 
                    border: 'none', 
                    borderRadius: '0', 
                    backgroundColor: chromeTheme === 'dark' ? 'var(--color-primary)' : 'var(--bg-card)',
                    color: chromeTheme === 'dark' ? 'white' : 'var(--text-muted)',
                    padding: '0.3rem',
                    fontSize: '0.8rem'
                  }}
                  onClick={() => {
                    setChromeTheme('dark');
                    pushHistory({ ...getCurrentConfig(), chromeTheme: 'dark' });
                  }}
                >
                  Dark Theme
                </button>
                <button 
                  className={`btn btn-secondary`} 
                  style={{ 
                    flex: 1, 
                    border: 'none', 
                    borderRadius: '0', 
                    backgroundColor: chromeTheme === 'light' ? 'var(--color-primary)' : 'var(--bg-card)',
                    color: chromeTheme === 'light' ? 'white' : 'var(--text-muted)',
                    padding: '0.3rem',
                    fontSize: '0.8rem'
                  }}
                  onClick={() => {
                    setChromeTheme('light');
                    pushHistory({ ...getCurrentConfig(), chromeTheme: 'light' });
                  }}
                >
                  Light Theme
                </button>
              </div>
            )}
          </div>

          {/* Annotation Tools settings */}
          <div className="control-group">
            <span className="control-label">Annotation Style</span>
            <div className="color-picker-row">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Color:</span>
              <input 
                type="color" 
                value={annotationColor} 
                onChange={(e) => setAnnotationColor(e.target.value)} 
                className="color-swatch-picker"
              />
              <input 
                type="text" 
                value={annotationColor} 
                onChange={(e) => setAnnotationColor(e.target.value)} 
                style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div className="control-label-container">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Size</span>
                <span className="control-value">{annotationStrokeWidth}px</span>
              </div>
              <input 
                type="range" 
                min="2" 
                max="16" 
                value={annotationStrokeWidth} 
                onChange={(e) => setAnnotationStrokeWidth(parseInt(e.target.value, 10))}
              />
            </div>
            {annotations.length > 0 && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem', fontSize: '0.8rem', marginTop: '0.25rem' }} 
                onClick={() => {
                  setAnnotations([]);
                  pushHistory({ ...getCurrentConfig(), annotations: [] });
                }}
              >
                Clear Annotations
              </button>
            )}
          </div>

          {/* Watermark Section */}
          <div className="control-group" style={{ paddingBottom: '2rem' }}>
            <div className="switch-container">
              <span className="control-label">Watermark</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={watermarkEnabled} 
                  onChange={(e) => {
                    setWatermarkEnabled(e.target.checked);
                    pushHistory({ ...getCurrentConfig(), watermarkEnabled: e.target.checked });
                  }} 
                />
                <span className="slider-switch"></span>
              </label>
            </div>
            {watermarkEnabled && (
              <input 
                type="text" 
                placeholder="Watermark text..." 
                value={watermarkText} 
                onChange={(e) => {
                  setWatermarkText(e.target.value);
                }}
                onBlur={() => pushHistory(getCurrentConfig())}
                style={{ marginTop: '0.5rem' }}
              />
            )}
          </div>

        </div>
      </div>

      {/* 2. Workspace - Live canvas preview panel */}
      <div className="workspace">
        
        {/* Workspace Toolbar Header */}
        <div className="workspace-header">
          {/* Undo/Redo tools */}
          <div className="workspace-actions">
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.6rem', marginRight: '0.25rem' }} 
              onClick={() => setSidebarVisible(prev => !prev)} 
              title={sidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
            >
              {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
            
            <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.5rem 0 0.25rem' }}></div>

            {noImageMode && (
              <>
                <button
                  className="btn btn-secondary text-indigo-400"
                  style={{ padding: '0.4rem 0.6rem', marginRight: '0.25rem', display: 'flex', alignItems: 'center' }}
                  onClick={selectFile}
                  title="Upload Screenshot"
                >
                  <ImageIcon className="w-4 h-4" style={{ marginRight: '0.25rem' }} /> Add Image
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.6rem', marginRight: '0.25rem', color: 'var(--color-danger)' }}
                  onClick={() => {
                    setNoImageMode(false);
                    setImageSrc(null);
                    pushHistory({
                      ...getCurrentConfig(),
                      noImage: false,
                    });
                  }}
                  title="Exit Gradient Mode"
                >
                  Exit Gradient
                </button>
                <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', marginRight: '0.5rem' }}></div>
              </>
            )}

            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={handleUndo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
              <Undo2 className="w-4 h-4" />
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)">
              <Redo2 className="w-4 h-4" />
            </button>
            
            {/* Divider */}
            <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
            
            {/* Visual Drawing Toolbar Match */}
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', backgroundColor: activeTool === 'pointer' ? 'var(--color-primary)' : undefined, color: activeTool === 'pointer' ? 'white' : undefined }} 
              onClick={() => setActiveTool('pointer')} 
              title="Select / Move"
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', backgroundColor: activeTool === 'rect' ? 'var(--color-primary)' : undefined, color: activeTool === 'rect' ? 'white' : undefined }} 
              onClick={() => setActiveTool('rect')} 
              title="Rectangle Outline"
            >
              <Square className="w-4 h-4" />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', backgroundColor: activeTool === 'filled-rect' ? 'var(--color-primary)' : undefined, color: activeTool === 'filled-rect' ? 'white' : undefined }} 
              onClick={() => setActiveTool('filled-rect')} 
              title="Rectangle Filled"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="4" />
              </svg>
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', backgroundColor: activeTool === 'circle' ? 'var(--color-primary)' : undefined, color: activeTool === 'circle' ? 'white' : undefined }} 
              onClick={() => setActiveTool('circle')} 
              title="Circle Outline"
            >
              <Circle className="w-4 h-4" />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', backgroundColor: activeTool === 'filled-circle' ? 'var(--color-primary)' : undefined, color: activeTool === 'filled-circle' ? 'white' : undefined }} 
              onClick={() => setActiveTool('filled-circle')} 
              title="Circle Filled"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', backgroundColor: activeTool === 'line' ? 'var(--color-primary)' : undefined, color: activeTool === 'line' ? 'white' : undefined }} 
              onClick={() => setActiveTool('line')} 
              title="Straight Line"
            >
              <Slash className="w-4 h-4" />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', backgroundColor: activeTool === 'arrow' ? 'var(--color-primary)' : undefined, color: activeTool === 'arrow' ? 'white' : undefined }} 
              onClick={() => setActiveTool('arrow')} 
              title="Draw Arrow"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', backgroundColor: activeTool === 'text' ? 'var(--color-primary)' : undefined, color: activeTool === 'text' ? 'white' : undefined }} 
              onClick={() => setActiveTool('text')} 
              title="Draw Text"
            >
              <Type className="w-4 h-4" />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', backgroundColor: activeTool === 'pen' ? 'var(--color-primary)' : undefined, color: activeTool === 'pen' ? 'white' : undefined }} 
              onClick={() => setActiveTool('pen')} 
              title="Freehand Draw"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', backgroundColor: activeTool === 'emoji' ? 'var(--color-primary)' : undefined, color: activeTool === 'emoji' ? 'white' : undefined }} 
              onClick={() => setActiveTool('emoji')} 
              title="Add Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            
            <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
            
            {/* Color Palette Picker */}
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', border: `1px solid ${annotationColor}` }} 
              onClick={() => colorInputRef.current?.click()} 
              title="Annotation Color"
            >
              <Palette className="w-4 h-4" style={{ color: annotationColor }} />
            </button>
            <input 
              type="color" 
              ref={colorInputRef} 
              value={annotationColor} 
              onChange={(e) => setAnnotationColor(e.target.value)} 
              style={{ display: 'none' }} 
            />

            {/* Stroke Width Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Size:</span>
              <input 
                type="range" 
                min="2" 
                max="16" 
                value={annotationStrokeWidth} 
                onChange={(e) => setAnnotationStrokeWidth(parseInt(e.target.value, 10))}
                style={{ width: '70px', height: '4px', padding: 0 }}
                title={`Stroke Width: ${annotationStrokeWidth}px`}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '24px' }}>{annotationStrokeWidth}px</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="workspace-actions">
            <select 
              value={zoomLevel} 
              onChange={(e) => setZoomLevel(e.target.value)}
              style={{ width: '130px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option>Zoom to fit</option>
              <option>50%</option>
              <option>100%</option>
              <option>200%</option>
            </select>
            <button className="btn btn-secondary" style={{ padding: '0.4rem' }}>
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Core Live Preview Render View */}
        <div className={`workspace-canvas-container workspace-grid`}>
          {(imageSrc || noImageMode) ? (
            <div className="preview-card-wrapper" style={getZoomStyle()}>
              
              {/* Output Preview Container Card */}
              <div 
                className="preview-background-card"
                style={{
                  padding: `${padding}px`,
                  background: backgroundType === 'gradient' ? backgroundValue : undefined,
                  backgroundColor: backgroundType === 'color' ? backgroundValue : undefined,
                  backgroundImage: backgroundType === 'blur' && imageSrc ? `url(${imageSrc})` : backgroundType === 'mesh' ? `url(${meshDataUrl})` : undefined,
                  alignItems: (position || 'Middle center').includes('Top') ? 'flex-start' : (position || 'Middle center').includes('Bottom') ? 'flex-end' : 'center',
                  justifyContent: (position || 'Middle center').includes('left') ? 'flex-start' : (position || 'Middle center').includes('right') ? 'flex-end' : 'center',
                  borderRadius: '12px',
                  // Fixed sizes mapping
                  width: aspectRatio === '1:1' ? '600px' : aspectRatio === '16:9' ? '800px' : aspectRatio === '4:3' ? '700px' : aspectRatio === '3:2' ? '750px' : aspectRatio === 'Custom' ? `${canvasWidth}px` : 'auto',
                  height: aspectRatio === '1:1' ? '600px' : aspectRatio === '16:9' ? '450px' : aspectRatio === '4:3' ? '525px' : aspectRatio === '3:2' ? '500px' : aspectRatio === 'Custom' ? `${canvasHeight}px` : 'auto',
                }}
              >
                
                {/* Embedded Blurred overlay if blur background */}
                {backgroundType === 'blur' && imageSrc && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backdropFilter: `blur(${blurDensity}px) saturate(1.4)`,
                    backgroundColor: 'rgba(15, 23, 42, 0.45)',
                    zIndex: 0
                  }} />
                )}

                {/* Draggable Point Handles for Mesh Gradient */}
                {backgroundType === 'mesh' && (
                  <div 
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'auto', zIndex: 10 }}
                  >
                    {meshPoints.map((pt, idx) => (
                      <div
                        key={pt.id}
                        onPointerDown={(e) => handlePointerDown(e, idx)}
                        style={{
                          position: 'absolute',
                          left: `${pt.x * 100}%`,
                          top: `${pt.y * 100}%`,
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: pt.color,
                          border: idx === activePointIdx ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.8)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          transform: 'translate(-50%, -50%)',
                          cursor: 'move',
                          zIndex: idx === activePointIdx ? 12 : 11,
                        }}
                        title={`Point ${idx + 1}`}
                      >
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          margin: '6px auto 0 auto',
                        }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Main Screenshot card box */}
                {!noImageMode && imageSrc && (
                  <div 
                    className="preview-container-box"
                    style={{
                      borderRadius: `${rounded}px`,
                      boxShadow: shadowEnabled ? `0 ${shadow * 0.8}px ${shadow * 1.5}px ${shadowColor}` : 'none',
                      border: border > 0 ? `${border}px solid ${borderColor}` : 'none',
                      outline: inset > 0 ? `${inset}px solid ${insetColor}` : 'none',
                      outlineOffset: `-${inset}px`,
                      width: scale === 100 ? '100%' : `${scale}%`,
                      maxWidth: '100%',
                      zIndex: 1,
                    }}
                  >
                    
                    {/* macOS Title Bar Mockup */}
                    {chromeStyle === 'mac' && (
                      <div 
                        className="preview-chrome-mac"
                        style={{
                          backgroundColor: chromeTheme === 'light' ? '#f3f3f3' : '#21252b',
                          borderBottom: chromeTheme === 'light' ? '1px solid #e1e1e1' : 'none'
                        }}
                      >
                        <div className="dot dot-red" />
                        <div className="dot dot-yellow" />
                        <div className="dot dot-green" />
                      </div>
                    )}

                    {/* Windows Title Bar Mockup */}
                    {chromeStyle === 'windows' && (
                      <div 
                        className="preview-chrome-win"
                        style={{
                          backgroundColor: chromeTheme === 'light' ? '#ffffff' : '#1e1e1e',
                          borderBottom: chromeTheme === 'light' ? '1px solid #e5e5e5' : 'none',
                          ['--win-icon-color' as any]: chromeTheme === 'light' ? '#333333' : '#cccccc'
                        }}
                      >
                        <div className="win-min" />
                        <div className="win-icon" />
                        <div className="win-close" />
                      </div>
                    )}

                    {/* Image render element with Annotations layer */}
                    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: aspectRatio === 'Auto' ? '65vh' : '100%' }}>
                      <img 
                        src={imageSrc} 
                        alt="Screenshot" 
                        className="preview-screenshot-img" 
                        style={{
                          maxHeight: '100%',
                          maxWidth: '100%',
                          width: 'auto',
                          height: 'auto',
                          display: 'block',
                        }}
                      />
                      <AnnotationsLayer
                        annotations={annotations}
                        setAnnotations={setAnnotations}
                        activeTool={activeTool}
                        setActiveTool={setActiveTool}
                        color={annotationColor}
                        strokeWidth={annotationStrokeWidth}
                        onSaveHistory={() => pushHistory(getCurrentConfig())}
                        customPrompt={customPrompt}
                      />
                    </div>
                  </div>
                )}

                {/* Floating Watermark text */}
                {watermarkEnabled && watermarkText && (
                  <div className="preview-watermark" style={{ zIndex: 2 }}>
                    {watermarkText}
                  </div>
                )}

              </div>
            </div>
          ) : (
            
            /* File Dropzone Empty State */
            <div className="empty-state">
              <div onClick={selectFile} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ImageIcon className="empty-state-icon" />
                <h3 className="empty-state-title">Drag & Drop screenshot here</h3>
                <p className="empty-state-subtitle">Or click to select an image, or copy-paste directly (Ctrl+V)</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '1.2rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>— OR —</div>
                <button
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoImageMode(true);
                    setBackgroundType('mesh');
                    setImageSrc(null);
                    pushHistory({
                      ...getCurrentConfig(),
                      noImage: true,
                      backgroundType: 'mesh',
                    });
                  }}
                >
                  <Sparkles className="w-4 h-4" /> Create Blank Gradient
                </button>
              </div>

              <div className="empty-state-hotkey" style={{ marginTop: '1.5rem' }}>
                Hotkey: <code>Ctrl + Alt + V</code> to snap from clipboard instantly
              </div>
            </div>
          )}
        </div>

        {/* Footer actions bar */}
        <div className="workspace-footer">
          {(imageSrc || noImageMode) && (
            <>
              {/* Select Export Options */}
              <div style={{ display: 'flex', gap: '1px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                <button 
                  className={`btn btn-secondary`} 
                  style={{ 
                    border: 'none', 
                    borderRadius: '0', 
                    backgroundColor: exportFormat === 'png' ? 'var(--color-primary)' : 'var(--bg-card)',
                    color: exportFormat === 'png' ? 'white' : 'var(--text-muted)'
                  }}
                  onClick={() => setExportFormat('png')}
                >
                  PNG
                </button>
                <button 
                  className={`btn btn-secondary`} 
                  style={{ 
                    border: 'none', 
                    borderRadius: '0', 
                    backgroundColor: exportFormat === 'jpeg' ? 'var(--color-primary)' : 'var(--bg-card)',
                    color: exportFormat === 'jpeg' ? 'white' : 'var(--text-muted)'
                  }}
                  onClick={() => setExportFormat('jpeg')}
                >
                  JPG
                </button>
              </div>

              {exportFormat === 'jpeg' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quality:</span>
                  <input 
                    type="range" 
                    min="30" 
                    max="100" 
                    value={jpegQuality} 
                    onChange={(e) => setJpegQuality(parseInt(e.target.value, 10))}
                    style={{ width: '70px', height: '4px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{jpegQuality}%</span>
                </div>
              )}

              <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>

              <button className="btn btn-primary" onClick={triggerExport}>
                <Download className="w-4 h-4" /> Save Image
              </button>
              
              <button className="btn btn-secondary" onClick={copyBeautifiedImage}>
                <Copy className="w-4 h-4" /> Copy to Clipboard
              </button>

              <button className="btn btn-secondary" onClick={() => {
                alert('Shared link placeholder triggered! Image copied to clipboard as share item.');
                copyBeautifiedImage();
              }}>
                <Share2 className="w-4 h-4" /> Share
              </button>
            </>
          )}
        </div>
      </div>

      {promptConfig && (
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
      )}
    </div>
  );
}
