import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { RenderConfig, Annotation, drawMeshGradient, RedactionItem, renderCanvas } from './canvasRenderer';
import { useHistory } from './hooks/useHistory';
import { useExport } from './hooks/useExport';
import { usePresets } from './hooks/usePresets';
import { useConnectionPoll } from './hooks/useConnectionPoll';
import { getZoomStyle as getZoomStyleUtil } from './utils/layoutUtils';
import { getUserDefault, updateUserDefault } from './utils/storageUtils';
import { createWorker } from 'tesseract.js';
import { processOcrResults, downsampleImageForOcr } from './utils/privacyGuardUtils';
import { VibePalette, extractPalette } from './utils/colorExtractor';
import { generateVibeConfigs } from './utils/vibeUtils';
import { WordBoundingBox, GitHubIssuePayload, generateIssueFromScreenshot, buildMarkdown, safeParseJSON } from './utils/githubAgentUtils';
import { checkOllamaHealth } from './utils/ollamaUtils';
import { fetchUserRepos, pushToGitHub } from './utils/githubApiUtils';
import { fetchAndParseModels, DEFAULT_OPENAI_MODELS, DEFAULT_GEMINI_MODELS, DEFAULT_CLAUDE_MODELS } from './utils/modelsDevUtils';


// TypeScript declarations for secure Electron IPC bridge
declare global {
  interface Window {
    snapFrameAPI: any;
  }
}

interface AppContextType {
  // Config state
  padding: number; setPadding: React.Dispatch<React.SetStateAction<number>>;
  rounded: number; setRounded: React.Dispatch<React.SetStateAction<number>>;
  shadow: number; setShadow: React.Dispatch<React.SetStateAction<number>>;
  shadowColor: string; setShadowColor: React.Dispatch<React.SetStateAction<string>>;
  shadowEnabled: boolean; setShadowEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  inset: number; setInset: React.Dispatch<React.SetStateAction<number>>;
  insetColor: string; setInsetColor: React.Dispatch<React.SetStateAction<string>>;
  border: number; setBorder: React.Dispatch<React.SetStateAction<number>>;
  borderColor: string; setBorderColor: React.Dispatch<React.SetStateAction<string>>;
  scale: number; setScale: React.Dispatch<React.SetStateAction<number>>;
  backgroundType: 'gradient' | 'color' | 'blur' | 'mesh'; setBackgroundType: React.Dispatch<React.SetStateAction<'gradient' | 'color' | 'blur' | 'mesh'>>;
  backgroundValue: string; setBackgroundValue: React.Dispatch<React.SetStateAction<string>>;
  bgGrain: number; setBgGrain: React.Dispatch<React.SetStateAction<number>>;
  lightRaysStyle: 'none' | 'diagonal' | 'spotlight' | 'aurora'; setLightRaysStyle: React.Dispatch<React.SetStateAction<'none' | 'diagonal' | 'spotlight' | 'aurora'>>;
  lightRaysOpacity: number; setLightRaysOpacity: React.Dispatch<React.SetStateAction<number>>;
  lightRaysAngle: number; setLightRaysAngle: React.Dispatch<React.SetStateAction<number>>;
  lightRaysCount: number; setLightRaysCount: React.Dispatch<React.SetStateAction<number>>;
  lightRaysSourceX: number; setLightRaysSourceX: React.Dispatch<React.SetStateAction<number>>;
  lightRaysSourceY: number; setLightRaysSourceY: React.Dispatch<React.SetStateAction<number>>;
  aspectRatio: string; setAspectRatio: React.Dispatch<React.SetStateAction<string>>;
  canvasWidth: number; setCanvasWidth: React.Dispatch<React.SetStateAction<number>>;
  canvasHeight: number; setCanvasHeight: React.Dispatch<React.SetStateAction<number>>;
  selectedPreset: string; setSelectedPreset: React.Dispatch<React.SetStateAction<string>>;
  showSafeZone: boolean; setShowSafeZone: React.Dispatch<React.SetStateAction<boolean>>;
  paddingMode: 'fit' | 'fill'; setPaddingMode: React.Dispatch<React.SetStateAction<'fit' | 'fill'>>;
  chromeStyle: 'mac' | 'windows' | 'none'; setChromeStyle: React.Dispatch<React.SetStateAction<'mac' | 'windows' | 'none'>>;
  chromeTheme: 'dark' | 'light'; setChromeTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;
  blurDensity: number; setBlurDensity: React.Dispatch<React.SetStateAction<number>>;
  noImageMode: boolean; setNoImageMode: React.Dispatch<React.SetStateAction<boolean>>;
  meshPoints: Array<{ id: string; color: string; x: number; y: number; radius: number }>; setMeshPoints: React.Dispatch<React.SetStateAction<Array<{ id: string; color: string; x: number; y: number; radius: number }>>>;
  meshBlur: number; setMeshBlur: React.Dispatch<React.SetStateAction<number>>;
  meshGrain: number; setMeshGrain: React.Dispatch<React.SetStateAction<number>>;
  meshOpacity: number; setMeshOpacity: React.Dispatch<React.SetStateAction<number>>;
  meshSpread: number; setMeshSpread: React.Dispatch<React.SetStateAction<number>>;
  meshDataUrl: string; setMeshDataUrl: React.Dispatch<React.SetStateAction<string>>;
  activePointIdx: number; setActivePointIdx: React.Dispatch<React.SetStateAction<number>>;
  watermarkEnabled: boolean; setWatermarkEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  watermarkText: string; setWatermarkText: React.Dispatch<React.SetStateAction<string>>;
  watermarkSize: number; setWatermarkSize: React.Dispatch<React.SetStateAction<number>>;
  watermarkPosition: 'left' | 'middle' | 'right' | 'top left' | 'top middle' | 'top right'; setWatermarkPosition: React.Dispatch<React.SetStateAction<'left' | 'middle' | 'right' | 'top left' | 'top middle' | 'top right'>>;
  watermarkOpacity: number; setWatermarkOpacity: React.Dispatch<React.SetStateAction<number>>;
  position: string; setPosition: React.Dispatch<React.SetStateAction<string>>;
  activeTool: 'pointer' | 'rect' | 'filled-rect' | 'circle' | 'filled-circle' | 'line' | 'arrow' | 'text' | 'pen' | 'emoji'; setActiveTool: React.Dispatch<React.SetStateAction<'pointer' | 'rect' | 'filled-rect' | 'circle' | 'filled-circle' | 'line' | 'arrow' | 'text' | 'pen' | 'emoji'>>;
  arrowStyle: 'classic' | 'dashed' | 'tapered' | 'curved'; setArrowStyle: React.Dispatch<React.SetStateAction<'classic' | 'dashed' | 'tapered' | 'curved'>>;
  annotations: Annotation[]; setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  annotationColor: string; setAnnotationColor: React.Dispatch<React.SetStateAction<string>>;
  annotationStrokeWidth: number; setAnnotationStrokeWidth: React.Dispatch<React.SetStateAction<number>>;
  redactions: RedactionItem[]; setRedactions: React.Dispatch<React.SetStateAction<RedactionItem[]>>;
  isScanningSecrets: boolean; setIsScanningSecrets: React.Dispatch<React.SetStateAction<boolean>>;
  scanProgress: number; setScanProgress: React.Dispatch<React.SetStateAction<number>>;
  hoveredRedactionId: string | null; setHoveredRedactionId: React.Dispatch<React.SetStateAction<string | null>>;
  redactionStyle: 'blur' | 'solid'; setRedactionStyle: React.Dispatch<React.SetStateAction<'blur' | 'solid'>>;
  promptConfig: { message: string; defaultValue: string; resolve: (val: string | null) => void } | null; setPromptConfig: React.Dispatch<React.SetStateAction<{ message: string; defaultValue: string; resolve: (val: string | null) => void } | null>>;
  sidebarVisible: boolean; setSidebarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  settingsVisible: boolean; setSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  helpVisible: boolean; setHelpVisible: React.Dispatch<React.SetStateAction<boolean>>;
  imageSrc: string | null; setImageSrc: React.Dispatch<React.SetStateAction<string | null>>;
  isDragging: boolean; setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  customPresets: any[]; setCustomPresets: React.Dispatch<React.SetStateAction<any[]>>;
  newPresetName: string; setNewPresetName: React.Dispatch<React.SetStateAction<string>>;
  showAdvancedInset: boolean; setShowAdvancedInset: React.Dispatch<React.SetStateAction<boolean>>;
  showAdvancedShadow: boolean; setShowAdvancedShadow: React.Dispatch<React.SetStateAction<boolean>>;
  showAdvancedBorder: boolean; setShowAdvancedBorder: React.Dispatch<React.SetStateAction<boolean>>;
  exportFormat: 'png' | 'jpeg'; setExportFormat: React.Dispatch<React.SetStateAction<'png' | 'jpeg'>>;
  jpegQuality: number; setJpegQuality: React.Dispatch<React.SetStateAction<number>>;
  zoomLevel: string; setZoomLevel: React.Dispatch<React.SetStateAction<string>>;
  history: any[]; setHistory: React.Dispatch<React.SetStateAction<any[]>>;
  historyIndex: number; setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  showHollywoodPalettes: boolean; setShowHollywoodPalettes: React.Dispatch<React.SetStateAction<boolean>>;
  selectedGradientCategory: 'classic' | 'disney' | 'marvel' | 'hollywood'; setSelectedGradientCategory: React.Dispatch<React.SetStateAction<'classic' | 'disney' | 'marvel' | 'hollywood'>>;
  showHollywoodMeshPalettes: boolean; setShowHollywoodMeshPalettes: React.Dispatch<React.SetStateAction<boolean>>;
  appTheme: 'dark' | 'light'; setAppTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;
  sidebarPosition: 'left' | 'right'; setSidebarPosition: React.Dispatch<React.SetStateAction<'left' | 'right'>>;
  vibePalette: VibePalette | null;
  vibeVariantIndex: number;
  vibeUpdateDrawColor: boolean; setVibeUpdateDrawColor: React.Dispatch<React.SetStateAction<boolean>>;
  applyAutoVibe: () => Promise<void>;


  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  colorInputRef: React.RefObject<HTMLInputElement | null>;

  // Functions
  getCurrentConfig: () => RenderConfig;
  pushHistory: (config: any) => void;
  applyConfig: (config: RenderConfig) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  selectFile: () => Promise<void>;
  handleHTMLFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pasteFromClipboard: () => Promise<void>;
  saveCustomPreset: () => void;
  deleteCustomPreset: (id: string, e: React.MouseEvent) => void;
  copyBeautifiedImage: () => Promise<void>;
  triggerExport: () => void;
  selectBackgroundPreset: (preset: any) => void;
  handleSliderRelease: () => void;
  getZoomStyle: () => React.CSSProperties;
  applyMeshPalette: (colors: string[]) => void;
  generateRandomPalette: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  customPrompt: (message: string, defaultValue?: string) => Promise<string | null>;
  handlePointerDown: (e: React.PointerEvent, idx: number) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  scanForSecrets: () => Promise<void>;
  toggleRedaction: (id: string) => void;
  redactAll: () => void;
  revealAll: () => void;
  resetStyles: () => void;
  clearWorkspace: () => void;

  // Issue Agent states & config
  issuePayload: GitHubIssuePayload | null; setIssuePayload: React.Dispatch<React.SetStateAction<GitHubIssuePayload | null>>;
  isGeneratingIssue: boolean; setIsGeneratingIssue: React.Dispatch<React.SetStateAction<boolean>>;
  issueError: string | null; setIssueError: React.Dispatch<React.SetStateAction<string | null>>;
  aiProvider: 'ollama' | 'openai' | 'google' | 'claude'; setAiProvider: (provider: 'ollama' | 'openai' | 'google' | 'claude') => void;
  ollamaEndpoint: string; setOllamaEndpoint: (endpoint: string) => void;
  ollamaModel: string; setOllamaModel: (model: string) => void;
  openaiModel: string; setOpenaiModel: (model: string) => void;
  googleModel: string; setGoogleModel: (model: string) => void;
  claudeModel: string; setClaudeModel: (model: string) => void;
  openaiModelsList: { value: string; label: string }[];
  googleModelsList: { value: string; label: string }[];
  claudeModelsList: { value: string; label: string }[];
  ollamaAvailable: boolean; setOllamaAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  githubRepo: string; setGithubRepo: (repo: string) => void;
  githubRepoList: string[]; setGithubRepoList: React.Dispatch<React.SetStateAction<string[]>>;
  showComponentHighlights: boolean; setShowComponentHighlights: (show: boolean) => void;
  burnHighlights: boolean; setBurnHighlights: (burn: boolean) => void;
  appendAttribution: boolean; setAppendAttribution: (append: boolean) => void;
  cachedOcrResult: { text: string; words: WordBoundingBox[] } | null; setCachedOcrResult: React.Dispatch<React.SetStateAction<{ text: string; words: WordBoundingBox[] } | null>>;
  highlightedComponents: string[]; setHighlightedComponents: React.Dispatch<React.SetStateAction<string[]>>;
  localFallbackAvailable: boolean; setLocalFallbackAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  userInstruction: string; setUserInstruction: React.Dispatch<React.SetStateAction<string>>;

  // Issue Agent actions
  generateIssue: () => Promise<void>;
  generateIssueOffline: () => void;
  pushIssueToGitHub: () => Promise<void>;
  resetIssue: () => void;
  exportBeautifiedScreenshot: (burnHighlights?: boolean) => Promise<string>;
  triggerAiHealthCheck: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Config state
  const [padding, setPadding] = useState<number>(() => getUserDefault('padding', 38));
  const [rounded, setRounded] = useState<number>(() => getUserDefault('rounded', 20));
  const [shadow, setShadow] = useState<number>(() => getUserDefault('shadow', 30));
  const [shadowColor, setShadowColor] = useState<string>('rgba(0, 0, 0, 0.45)');
  const [shadowEnabled, setShadowEnabled] = useState<boolean>(true);
  const [inset, setInset] = useState<number>(0);
  const [insetColor, setInsetColor] = useState<string>('rgba(255, 255, 255, 0.25)');
  const [border, setBorder] = useState<number>(0);
  const [borderColor, setBorderColor] = useState<string>('#ffffff');
  const [scale, setScale] = useState<number>(100);
  const [backgroundType, setBackgroundType] = useState<'gradient' | 'color' | 'blur' | 'mesh'>('gradient');
  const [backgroundValue, setBackgroundValue] = useState<string>('linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)');
  const [bgGrain, setBgGrain] = useState<number>(() => getUserDefault('bgGrain', 0));
  const [lightRaysStyle, setLightRaysStyle] = useState<'none' | 'diagonal' | 'spotlight' | 'aurora'>(() => getUserDefault('lightRaysStyle', 'none') as any);
  const [lightRaysOpacity, setLightRaysOpacity] = useState<number>(() => getUserDefault('lightRaysOpacity', 30));
  const [lightRaysAngle, setLightRaysAngle] = useState<number>(() => getUserDefault('lightRaysAngle', 135));
  const [lightRaysCount, setLightRaysCount] = useState<number>(() => getUserDefault('lightRaysCount', 4));
  const [lightRaysSourceX, setLightRaysSourceX] = useState<number>(() => getUserDefault('lightRaysSourceX', 50));
  const [lightRaysSourceY, setLightRaysSourceY] = useState<number>(() => getUserDefault('lightRaysSourceY', 0));
  const [aspectRatio, setAspectRatio] = useState<string>('Auto');
  const [canvasWidth, setCanvasWidth] = useState<number>(800);
  const [canvasHeight, setCanvasHeight] = useState<number>(600);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showSafeZone, setShowSafeZone] = useState<boolean>(true);
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

  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(() => getUserDefault('watermarkEnabled', false));
  const [watermarkText, setWatermarkText] = useState<string>(() => getUserDefault('watermarkText', 'achu'));
  const [watermarkSize, setWatermarkSize] = useState<number>(() => getUserDefault('watermarkSize', 20));
  const [watermarkPosition, setWatermarkPosition] = useState<'left' | 'middle' | 'right' | 'top left' | 'top middle' | 'top right'>(() => getUserDefault('watermarkPosition', 'middle') as any);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(() => getUserDefault('watermarkOpacity', 0.45));
  const [position, setPosition] = useState<string>('Middle center');
  const [activeTool, setActiveTool] = useState<'pointer' | 'rect' | 'filled-rect' | 'circle' | 'filled-circle' | 'line' | 'arrow' | 'text' | 'pen' | 'emoji'>('pointer');
  const [arrowStyle, setArrowStyle] = useState<'classic' | 'dashed' | 'tapered' | 'curved'>('classic');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationColor, setAnnotationColor] = useState<string>('#f43f5e');
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState<number>(4);
  const [redactions, setRedactions] = useState<RedactionItem[]>([]);
  const [isScanningSecrets, setIsScanningSecrets] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [hoveredRedactionId, setHoveredRedactionId] = useState<string | null>(null);
  const [redactionStyle, setRedactionStyle] = useState<'blur' | 'solid'>(() => getUserDefault('redactionStyle', 'solid'));

  // Issue Agent states
  const [issuePayload, setIssuePayload] = useState<GitHubIssuePayload | null>(null);
  const [isGeneratingIssue, setIsGeneratingIssue] = useState<boolean>(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [aiProvider, setAiProviderState] = useState<'ollama' | 'openai' | 'google' | 'claude'>(() => getUserDefault('aiProvider', 'ollama') as any);
  const [ollamaEndpoint, setOllamaEndpointState] = useState<string>(() => getUserDefault('ollamaEndpoint', 'http://localhost:11434'));
  const [ollamaModel, setOllamaModelState] = useState<string>(() => getUserDefault('ollamaModel', 'llava-phi3'));
  const [openaiModel, setOpenaiModelState] = useState<string>(() => getUserDefault('openaiModel', 'gpt-4o-mini'));
  const [googleModel, setGoogleModelState] = useState<string>(() => getUserDefault('googleModel', 'gemini-2.5-flash'));
  const [claudeModel, setClaudeModelState] = useState<string>(() => getUserDefault('claudeModel', 'claude-3-5-sonnet-latest'));
  
  const [aiCheckTrigger, setAiCheckTrigger] = useState(0);
  const triggerAiHealthCheck = useCallback(() => {
    setAiCheckTrigger(prev => prev + 1);
  }, []);

  const checkAI = useCallback(async () => {
    if (window.snapFrameAPI && typeof window.snapFrameAPI.checkAIHealth === 'function') {
      const endpoint = aiProvider === 'ollama' ? ollamaEndpoint : '';
      return await window.snapFrameAPI.checkAIHealth(aiProvider, endpoint);
    }
    return false;
  }, [aiProvider, ollamaEndpoint]);

  const pollInterval = aiProvider === 'ollama' ? 10000 : 0; // 10s for local Ollama, no background polling timer for cloud providers
  const [ollamaAvailable, setOllamaAvailable] = useConnectionPoll(checkAI, `${aiProvider}-${ollamaEndpoint}-${aiCheckTrigger}`, pollInterval);
  const [githubRepo, setGithubRepoState] = useState<string>(() => getUserDefault('githubRepo', ''));
  const [githubRepoList, setGithubRepoList] = useState<string[]>([]);
  const [showComponentHighlights, setShowComponentHighlightsState] = useState<boolean>(() => getUserDefault('showComponentHighlights', true));
  const [burnHighlights, setBurnHighlightsState] = useState<boolean>(() => getUserDefault('burnHighlights', true));
  const [appendAttribution, setAppendAttributionState] = useState<boolean>(() => getUserDefault('appendAttribution', true));
  const [cachedOcrResult, setCachedOcrResult] = useState<{ text: string; words: WordBoundingBox[] } | null>(null);
  const [highlightedComponents, setHighlightedComponents] = useState<string[]>([]);
  const [openaiModelsList, setOpenaiModelsList] = useState<{ value: string; label: string }[]>(DEFAULT_OPENAI_MODELS);
  const [googleModelsList, setGoogleModelsList] = useState<{ value: string; label: string }[]>(DEFAULT_GEMINI_MODELS);
  const [claudeModelsList, setClaudeModelsList] = useState<{ value: string; label: string }[]>(DEFAULT_CLAUDE_MODELS);
  const [localFallbackAvailable, setLocalFallbackAvailable] = useState<boolean>(false);
  const [userInstruction, setUserInstruction] = useState<string>('');

  // Wrapper setters to sync defaults automatically
  const setAiProvider = (val: 'ollama' | 'openai' | 'google' | 'claude') => {
    setAiProviderState(val);
    updateUserDefault('aiProvider', val);
  };
  const setOllamaEndpoint = (val: string) => {
    setOllamaEndpointState(val);
    updateUserDefault('ollamaEndpoint', val);
  };
  const setOllamaModel = (val: string) => {
    setOllamaModelState(val);
    updateUserDefault('ollamaModel', val);
  };
  const setOpenaiModel = (val: string) => {
    setOpenaiModelState(val);
    updateUserDefault('openaiModel', val);
  };
  const setGoogleModel = (val: string) => {
    setGoogleModelState(val);
    updateUserDefault('googleModel', val);
  };
  const setClaudeModel = (val: string) => {
    setClaudeModelState(val);
    updateUserDefault('claudeModel', val);
  };
  const setGithubRepo = (val: string) => {
    setGithubRepoState(val);
    updateUserDefault('githubRepo', val);
  };
  const setShowComponentHighlights = (val: boolean) => {
    setShowComponentHighlightsState(val);
    updateUserDefault('showComponentHighlights', val);
  };
  const setBurnHighlights = (val: boolean) => {
    setBurnHighlightsState(val);
    updateUserDefault('burnHighlights', val);
  };
  const setAppendAttribution = (val: string | boolean) => {
    const boolVal = typeof val === 'string' ? val === 'true' : val;
    setAppendAttributionState(boolVal);
    updateUserDefault('appendAttribution', boolVal);
  };

  const [promptConfig, setPromptConfig] = useState<{ message: string; defaultValue: string; resolve: (val: string | null) => void } | null>(null);

  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [helpVisible, setHelpVisible] = useState<boolean>(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showAdvancedInset, setShowAdvancedInset] = useState<boolean>(false);
  const [showAdvancedShadow, setShowAdvancedShadow] = useState<boolean>(false);
  const [showAdvancedBorder, setShowAdvancedBorder] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<string>('Zoom to fit');

  const [showHollywoodPalettes, setShowHollywoodPalettes] = useState<boolean>(false);
  const [selectedGradientCategory, setSelectedGradientCategory] = useState<'classic' | 'disney' | 'marvel' | 'hollywood'>('classic');
  const [showHollywoodMeshPalettes, setShowHollywoodMeshPalettes] = useState<boolean>(false);

  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const [appTheme, setAppTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('snapframe-app-theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => getUserDefault('sidebarPosition', 'left'));

  // Auto-Vibe state
  const [vibePalette, setVibePalette] = useState<VibePalette | null>(null);
  const [vibeVariantIndex, setVibeVariantIndex] = useState<number>(-1);
  const [vibeUpdateDrawColor, setVibeUpdateDrawColor] = useState<boolean>(true);

  const getCurrentConfig = (): RenderConfig => ({
    padding, rounded, shadow, shadowColor, shadowEnabled,
    inset, insetColor, border, borderColor, scale,
    backgroundType, backgroundValue, aspectRatio, canvasWidth, canvasHeight,
    paddingMode, chromeStyle, chromeTheme, blurDensity, watermarkEnabled, watermarkText, watermarkSize,
    watermarkPosition, watermarkOpacity,
    position, annotations, meshPoints, meshBlur, meshGrain, meshOpacity, meshSpread,
    noImage: noImageMode,
    selectedPreset,
    showSafeZone,
    redactions,
    redactionStyle,
    issuePayload,
    exportFormat,
    jpegQuality,
    sidebarPosition,
    bgGrain,
    lightRaysStyle,
    lightRaysOpacity,
    lightRaysAngle,
    lightRaysCount,
    lightRaysSourceX,
    lightRaysSourceY,
  });

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
    setBgGrain(config.bgGrain ?? 0);
    setLightRaysStyle(config.lightRaysStyle ?? 'none');
    setLightRaysOpacity(config.lightRaysOpacity ?? 30);
    setLightRaysAngle(config.lightRaysAngle ?? 135);
    setLightRaysCount(config.lightRaysCount ?? 4);
    setLightRaysSourceX(config.lightRaysSourceX ?? 50);
    setLightRaysSourceY(config.lightRaysSourceY ?? 0);
    setAspectRatio(config.aspectRatio ?? 'Auto');
    setCanvasWidth(config.canvasWidth ?? 800);
    setCanvasHeight(config.canvasHeight ?? 600);
    setSelectedPreset(config.selectedPreset ?? '');
    setShowSafeZone(config.showSafeZone ?? true);
    setPaddingMode(config.paddingMode ?? 'fit');
    setChromeStyle(config.chromeStyle ?? 'mac');
    setChromeTheme(config.chromeTheme ?? 'dark');
    setBlurDensity(config.blurDensity ?? 40);
    setWatermarkEnabled(config.watermarkEnabled ?? false);
    setWatermarkText(config.watermarkText ?? 'achu');
    setWatermarkSize(config.watermarkSize ?? 20);
    setWatermarkPosition(config.watermarkPosition ?? 'middle');
    setWatermarkOpacity(config.watermarkOpacity ?? 0.45);
    setPosition(config.position ?? 'Middle center');
    setAnnotations(config.annotations ?? []);
    setRedactions(config.redactions ?? []);
    setRedactionStyle(config.redactionStyle ?? 'solid');
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
    
    // Restore Issue Agent payload
    setIssuePayload(config.issuePayload ?? null);
    setHighlightedComponents(config.issuePayload?.components ?? []);

    if (config.exportFormat) setExportFormat(config.exportFormat);
    if (config.jpegQuality !== undefined) setJpegQuality(config.jpegQuality);
    if (config.sidebarPosition) setSidebarPosition(config.sidebarPosition);
  };

  // 1. History Hook
  const {
    history, setHistory,
    historyIndex, setHistoryIndex,
    pushHistory, handleUndo, handleRedo
  } = useHistory(applyConfig);

  // 2. Presets Hook
  const {
    customPresets, setCustomPresets,
    newPresetName, setNewPresetName,
    fileInputRef, onImageLoaded, selectFile,
    handleHTMLFileInput, pasteFromClipboard,
    saveCustomPreset, deleteCustomPreset, selectBackgroundPreset
  } = usePresets(
    setImageSrc, setNoImageMode, setAnnotations,
    backgroundType, setBackgroundType, backgroundValue, setBackgroundValue,
    getCurrentConfig, pushHistory, setRedactions,
    setBgGrain, setLightRaysStyle, setLightRaysOpacity,
    setLightRaysAngle, setLightRaysCount, setLightRaysSourceX, setLightRaysSourceY
  );

  // 3. Export Hook
  const {
    exportFormat, setExportFormat,
    jpegQuality, setJpegQuality,
    copyBeautifiedImage, triggerExport
  } = useExport(imageSrc, noImageMode, getCurrentConfig);

  const handleSliderRelease = () => { pushHistory(getCurrentConfig()); };

  const getZoomStyle = (): React.CSSProperties => getZoomStyleUtil(zoomLevel);


  const applyMeshPalette = (colors: string[]) => {
    setMeshPoints((prev) => prev.map((pt, idx) => ({ ...pt, color: colors[idx % colors.length] })));
    pushHistory(getCurrentConfig());
  };

  const generateRandomPalette = () => {
    const randomHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    setMeshPoints((prev) => prev.map((pt) => ({
      ...pt, color: randomHex(),
      x: Math.random() * 0.8 + 0.1, y: Math.random() * 0.8 + 0.1
    })));
    pushHistory(getCurrentConfig());
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) onImageLoaded(event.target.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const customPrompt = (message: string, defaultValue: string = ''): Promise<string | null> => {
    return new Promise((resolve) => { setPromptConfig({ message, defaultValue, resolve }); });
  };

  const runOCR = async (src: string, progressCallback?: (progress: number) => void) => {
    const { dataUrl, width, height } = await downsampleImageForOcr(src, 1600);

    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && progressCallback) {
          progressCallback(Math.round(m.progress * 100));
        }
      },
    });

    try {
      const { data } = await worker.recognize(dataUrl, {}, { blocks: true });
      const blocks = data.blocks || [];
      const lines = blocks
        .flatMap((block: any) => block.paragraphs || [])
        .flatMap((para: any) => para.lines || []);

      const ocrWords: WordBoundingBox[] = [];
      lines.forEach((line: any) => {
        const words = line.words || [];
        words.forEach((word: any) => {
          ocrWords.push({
            text: word.text,
            x: Math.max(0, word.bbox.x0 / width),
            y: Math.max(0, word.bbox.y0 / height),
            w: Math.min(1 - Math.max(0, word.bbox.x0 / width), (word.bbox.x1 - word.bbox.x0) / width),
            h: Math.min(1 - Math.max(0, word.bbox.y0 / height), (word.bbox.y1 - word.bbox.y0) / height)
          });
        });
      });

      return {
        text: data.text || '',
        words: ocrWords,
        lines,
        width,
        height
      };
    } finally {
      await worker.terminate();
    }
  };

  const scanForSecrets = async () => {
    if (!imageSrc) return;
    setIsScanningSecrets(true);
    setScanProgress(0);

    try {
      const ocrResult = await runOCR(imageSrc, setScanProgress);
      const detected = processOcrResults(ocrResult.lines as any, ocrResult.width, ocrResult.height);

      setRedactions(detected);
      setCachedOcrResult({ text: ocrResult.text, words: ocrResult.words });
      const newConfig = {
        ...getCurrentConfig(),
        redactions: detected,
      };
      pushHistory(newConfig);
    } catch (e) {
      console.error('OCR Scanning failed:', e);
      alert('Failed to scan screenshot: ' + (e as Error).message);
    } finally {
      setIsScanningSecrets(false);
    }
  };

  const generateIssue = async () => {
    if (!imageSrc) return;
    setIsGeneratingIssue(true);
    setIssueError(null);
    setLocalFallbackAvailable(false);

    try {
      // Use cached OCR result if available, otherwise default to empty
      const ocrResult = cachedOcrResult || { text: '', words: [] };

      // Determine model based on provider
      let activeModel = ollamaModel;
      if (aiProvider === 'openai') activeModel = openaiModel;
      else if (aiProvider === 'google') activeModel = googleModel;
      else if (aiProvider === 'claude') activeModel = claudeModel;

      // Downsample for cloud providers
      let finalImg = imageSrc;
      if (aiProvider !== 'ollama') {
        const downsampled = await downsampleImageForOcr(imageSrc, 1024);
        finalImg = downsampled.dataUrl;
      }

      // Format prompt
      let prompt = `
You are analyzing a software bug screenshot.
OCR text extracted from the screenshot: "${ocrResult.text}"

Reply with ONLY this JSON object, no explanation, no markdown:
{
  "title": "concise bug title under 72 characters",
  "severity": "critical or high or medium or low",
  "severityReason": "one sentence explanation",
  "reproSteps": ["step 1", "step 2", "step 3"],
  "expected": "what should have happened",
  "actual": "what actually happened",
  "components": ["UI component names visible in screenshot"],
  "labels": ["bug", "suggested-github-label"]
}

Severity rules:
- critical: data loss, security issue, app crash, broken auth
- high: core feature broken, no workaround
- medium: feature partially broken, workaround exists  
- low: cosmetic or minor UX issue
`;

      if (userInstruction && userInstruction.trim()) {
        prompt += `\nAdditional user instruction/context to consider: "${userInstruction.trim()}"\n`;
      }

      const base64Image = finalImg.split(',')[1];
      
      let rawResponse = '';
      if (window.snapFrameAPI && typeof window.snapFrameAPI.generateAIResponse === 'function') {
        rawResponse = await window.snapFrameAPI.generateAIResponse({
          provider: aiProvider,
          model: activeModel,
          prompt,
          imageBase64: base64Image,
          endpoint: ollamaEndpoint
        });
      } else {
        throw new Error('LLM Service API not available in this environment');
      }

      const parsed = safeParseJSON(rawResponse);
      
      // Build final issue payload
      const title = typeof parsed?.title === 'string' ? parsed.title : 'Untitled Bug';
      let severity: GitHubIssuePayload['severity'] = 'medium';
      if (['critical', 'high', 'medium', 'low'].includes(parsed?.severity)) {
        severity = parsed.severity;
      }
      const severityReason = typeof parsed?.severityReason === 'string' ? parsed.severityReason : '';
      const reproSteps = Array.isArray(parsed?.reproSteps) ? parsed.reproSteps.map(String) : [];
      const expected = typeof parsed?.expected === 'string' ? parsed.expected : '';
      const actual = typeof parsed?.actual === 'string' ? parsed.actual : '';
      const components = Array.isArray(parsed?.components) ? parsed.components.map(String) : [];
      const labels = Array.isArray(parsed?.labels) ? parsed.labels.map(String) : ['bug'];

      const payload: GitHubIssuePayload = {
        title,
        severity,
        severityReason,
        reproSteps,
        expected,
        actual,
        components,
        labels,
        markdownBody: ''
      };

      const markdownSuffix = appendAttribution 
        ? '\n\n---\n*Generated by [achu](https://achu.design) · Screenshot Agent*' 
        : '';
      
      payload.markdownBody = buildMarkdown(payload) + markdownSuffix;
      setIssuePayload(payload);
      setHighlightedComponents(payload.components);
      pushHistory({ ...getCurrentConfig(), issuePayload: payload });
    } catch (err: any) {
      console.error('Issue generation failed:', err);
      setIssueError(err.message || 'Generation failed.');
      setLocalFallbackAvailable(true);
    } finally {
      setIsGeneratingIssue(false);
    }
  };

  const generateIssueOffline = () => {
    if (!cachedOcrResult) return;
    const text = cachedOcrResult.text;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0] ? `OCR Fallback: ${lines[0].slice(0, 50)}...` : 'OCR Generated Bug Report';
    
    const payload: GitHubIssuePayload = {
      title,
      severity: 'medium',
      severityReason: 'Offline template generated directly from OCR raw text.',
      reproSteps: lines.slice(1, 6),
      expected: 'Refer to OCR text below.',
      actual: text,
      components: [],
      labels: ['bug', 'ocr-fallback'],
      markdownBody: ''
    };
    
    const markdownSuffix = appendAttribution 
      ? '\n\n---\n*Generated by [achu](https://achu.design) · OCR Fallback Template*' 
      : '';
      
    payload.markdownBody = buildMarkdown(payload) + markdownSuffix;
    setIssuePayload(payload);
    setHighlightedComponents([]);
    setLocalFallbackAvailable(false);
  };

  const pushIssueToGitHub = async () => {
    if (!issuePayload) return;
    try {
      const token = await window.snapFrameAPI?.getGitHubToken?.();
      if (!token) {
        throw new Error('GitHub Personal Access Token (PAT) is missing. Add it in settings.');
      }
      if (!githubRepo || !githubRepo.includes('/')) {
        throw new Error('Invalid repository specified. Format: owner/repo');
      }

      const screenshotBase64 = await exportBeautifiedScreenshot(burnHighlights);
      const [owner, repo] = githubRepo.split('/');
      const issueUrl = await pushToGitHub(token, owner, repo, issuePayload, screenshotBase64);
      
      if (window.snapFrameAPI) {
        window.snapFrameAPI.openURL(issueUrl);
      } else {
        window.open(issueUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Push to GitHub failed:', err);
      alert('GitHub Publish Failed: ' + err.message);
    }
  };

  const resetIssue = () => {
    setIssuePayload(null);
    setHighlightedComponents([]);
    setIssueError(null);
  };

  const exportBeautifiedScreenshot = async (burn = false): Promise<string> => {
    return new Promise((resolve, reject) => {
      const runExport = (img: HTMLImageElement | null) => {
        try {
          const canvas = document.createElement('canvas');
          const config = getCurrentConfig();
          if (burn) {
            (config as any).showComponentHighlights = true;
            (config as any).highlightedComponents = highlightedComponents;
            (config as any).ocrWords = cachedOcrResult?.words || [];
          }
          renderCanvas(canvas, img, config);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        }
      };

      if (noImageMode || !imageSrc) {
        runExport(null);
      } else {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => runExport(img);
        img.onerror = () => reject(new Error('Failed to load image for export'));
      }
    });
  };

  const toggleRedaction = (id: string) => {
    const updated: RedactionItem[] = redactions.map((r) =>
      r.id === id ? { ...r, status: r.status === 'redacted' ? 'visible' : 'redacted' } : r
    );
    setRedactions(updated);
    pushHistory({ ...getCurrentConfig(), redactions: updated });
  };

  const redactAll = () => {
    const updated: RedactionItem[] = redactions.map((r) => ({ ...r, status: 'redacted' }));
    setRedactions(updated);
    pushHistory({ ...getCurrentConfig(), redactions: updated });
  };

  const revealAll = () => {
    const updated: RedactionItem[] = redactions.map((r) => ({ ...r, status: 'visible' }));
    setRedactions(updated);
    pushHistory({ ...getCurrentConfig(), redactions: updated });
  };

  const resetStyles = () => {
    setPadding(38);
    setRounded(10);
    setShadow(30);
    setShadowColor('rgba(0, 0, 0, 0.45)');
    setShadowEnabled(true);
    setInset(0);
    setInsetColor('rgba(255, 255, 255, 0.25)');
    setBorder(0);
    setBorderColor('#ffffff');
    setScale(100);
    setBackgroundType('gradient');
    setBackgroundValue('linear-gradient(135deg, #0575e6 0%, #00f260 100%)');
    setBgGrain(0);
    setLightRaysStyle('none');
    setLightRaysOpacity(30);
    setLightRaysAngle(135);
    setLightRaysCount(4);
    setLightRaysSourceX(50);
    setLightRaysSourceY(0);
    setAspectRatio('Auto');
    setSelectedPreset('');
    setShowSafeZone(true);
    setPaddingMode('fit');
    setChromeStyle('mac');
    setChromeTheme('dark');
    setBlurDensity(40);
    setWatermarkEnabled(false);
    setWatermarkText('achu');
    setWatermarkSize(14);
    setWatermarkPosition('middle');
    setWatermarkOpacity(0.45);
    setPosition('Middle center');
    setRedactions([]);
    setRedactionStyle('solid');
    setMeshPoints([
      { id: '1', color: '#ff5f6d', x: 0.2, y: 0.2, radius: 180 },
      { id: '2', color: '#ffc371', x: 0.8, y: 0.2, radius: 220 },
      { id: '3', color: '#00c6ff', x: 0.2, y: 0.8, radius: 200 },
      { id: '4', color: '#7209b7', x: 0.8, y: 0.8, radius: 240 },
    ]);
    setMeshBlur(60);
    setMeshGrain(15);
    setMeshOpacity(100);
    setMeshSpread(100);

    pushHistory({
      ...getCurrentConfig(),
      padding: 38,
      rounded: 20,
      shadow: 30,
      shadowColor: 'rgba(0, 0, 0, 0.45)',
      shadowEnabled: true,
      inset: 0,
      insetColor: 'rgba(255, 255, 255, 0.25)',
      border: 0,
      borderColor: '#ffffff',
      scale: 100,
      backgroundType: 'gradient',
      backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      bgGrain: 0,
      lightRaysStyle: 'none',
      lightRaysOpacity: 30,
      lightRaysAngle: 135,
      lightRaysCount: 4,
      lightRaysSourceX: 50,
      lightRaysSourceY: 0,
      aspectRatio: 'Auto',
      selectedPreset: '',
      showSafeZone: true,
      paddingMode: 'fit',
      chromeStyle: 'mac',
      chromeTheme: 'dark',
      blurDensity: 40,
      watermarkEnabled: false,
      watermarkText: 'achu',
      watermarkSize: 20,
      watermarkPosition: 'middle',
      watermarkOpacity: 0.45,
      position: 'Middle center',
      meshPoints: [
        { id: '1', color: '#ff5f6d', x: 0.2, y: 0.2, radius: 180 },
        { id: '2', color: '#ffc371', x: 0.8, y: 0.2, radius: 220 },
        { id: '3', color: '#00c6ff', x: 0.2, y: 0.8, radius: 200 },
        { id: '4', color: '#7209b7', x: 0.8, y: 0.8, radius: 240 },
      ],
      meshBlur: 60,
      meshGrain: 15,
      meshOpacity: 100,
      meshSpread: 100,
      redactions: [],
      redactionStyle: 'solid',
    });
  };

  const clearWorkspace = () => {
    setImageSrc(null);
    setHistory([]);
    setHistoryIndex(-1);
    setAnnotations([]);
    setRedactions([]);
    setVibePalette(null);
    setVibeVariantIndex(-1);
    resetIssue();
    setCachedOcrResult(null);
  };

  const applyAutoVibe = useCallback(async () => {
    if (!imageSrc) return;
    let palette = vibePalette;
    if (!palette) {
      palette = await extractPalette(imageSrc);
      setVibePalette(palette);
    }
    const nextIdx = (vibeVariantIndex + 1) % 4;
    setVibeVariantIndex(nextIdx);
    const variant = generateVibeConfigs(palette)[nextIdx];
    const base = getCurrentConfig();
    const update: Partial<RenderConfig> = {
      backgroundType: variant.backgroundType,
      shadowColor: variant.shadowColor,
      chromeTheme: variant.chromeTheme,
    };
    if (variant.backgroundType === 'mesh' && variant.meshColors) {
      setMeshPoints((prev) => prev.map((pt, i) => ({ ...pt, color: variant.meshColors![i % 4] })));
    } else if (variant.backgroundValue) {
      update.backgroundValue = variant.backgroundValue;
      setBackgroundValue(variant.backgroundValue);
    }
    if (vibeUpdateDrawColor) {
      setAnnotationColor(variant.annotationColor);
    }
    setBackgroundType(variant.backgroundType);
    setShadowColor(variant.shadowColor);
    setChromeTheme(variant.chromeTheme);
    pushHistory({ ...base, ...update });
  }, [imageSrc, vibePalette, vibeVariantIndex, vibeUpdateDrawColor]);

  // Reset vibe when a new image is loaded
  const prevImageSrc = useRef<string | null>(null);
  useEffect(() => {
    if (imageSrc && imageSrc !== prevImageSrc.current) {
      setVibePalette(null);
      setVibeVariantIndex(-1);
      
      // Clear issue agent state on new image load
      resetIssue();
      setCachedOcrResult(null);
      
      prevImageSrc.current = imageSrc;
    }
  }, [imageSrc]);

  const onImageLoadedRef = useRef(onImageLoaded);
  useEffect(() => { onImageLoadedRef.current = onImageLoaded; }, [onImageLoaded]);

  // Sync settings
  useEffect(() => {
    const initApp = async () => {
      if (window.snapFrameAPI) {
        try {
          const settings = await window.snapFrameAPI.getSettings();
          if (settings.lastConfig) applyConfig(settings.lastConfig);
          if (settings.presets) setCustomPresets(settings.presets);
        } catch (e) { console.error('Failed to read settings:', e); }
      }
    };
    initApp();
  }, []);

  // Load dynamic models from models.dev with localStorage caching
  useEffect(() => {
    const loadDynamicModels = async () => {
      try {
        const res = await fetchAndParseModels();
        setOpenaiModelsList(res.openai);
        setGoogleModelsList(res.google);
        setClaudeModelsList(res.claude);
      } catch (err) {
        console.error('Failed to load dynamic models:', err);
      }
    };
    loadDynamicModels();
  }, []);

  // Sync appTheme to localStorage and toggle body class
  useEffect(() => {
    localStorage.setItem('snapframe-app-theme', appTheme);
    if (appTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    if (window.snapFrameAPI && typeof window.snapFrameAPI.setTheme === 'function') {
      window.snapFrameAPI.setTheme(appTheme);
    }
  }, [appTheme]);


  // Synchronize exportFormat, jpegQuality, and sidebarPosition to localStorage
  useEffect(() => {
    updateUserDefault('exportFormat', exportFormat);
  }, [exportFormat]);

  useEffect(() => {
    updateUserDefault('jpegQuality', jpegQuality);
  }, [jpegQuality]);

  useEffect(() => {
    updateUserDefault('sidebarPosition', sidebarPosition);
  }, [sidebarPosition]);

  useEffect(() => {
    updateUserDefault('bgGrain', bgGrain);
  }, [bgGrain]);

  useEffect(() => {
    updateUserDefault('lightRaysStyle', lightRaysStyle);
  }, [lightRaysStyle]);

  useEffect(() => {
    updateUserDefault('lightRaysOpacity', lightRaysOpacity);
  }, [lightRaysOpacity]);

  useEffect(() => {
    updateUserDefault('lightRaysAngle', lightRaysAngle);
  }, [lightRaysAngle]);

  useEffect(() => {
    updateUserDefault('lightRaysCount', lightRaysCount);
  }, [lightRaysCount]);

  useEffect(() => {
    updateUserDefault('lightRaysSourceX', lightRaysSourceX);
  }, [lightRaysSourceX]);

  useEffect(() => {
    updateUserDefault('lightRaysSourceY', lightRaysSourceY);
  }, [lightRaysSourceY]);

  // Settings sync effect
  useEffect(() => {
    const saveSettingsToMain = async () => {
      if (window.snapFrameAPI) {
        const config = getCurrentConfig();
        const settings = { windowBounds: {}, lastConfig: { ...config, annotations: [], redactions: [] }, presets: customPresets };
        await window.snapFrameAPI.saveSettings(settings);
      }
    };
    const timer = setTimeout(saveSettingsToMain, 1000);
    return () => clearTimeout(timer);
  }, [
    padding, rounded, shadow, shadowColor, shadowEnabled, inset, insetColor, border,
    borderColor, scale, backgroundType, backgroundValue, aspectRatio, canvasWidth,
    canvasHeight, paddingMode, chromeStyle, chromeTheme, blurDensity, watermarkEnabled,
    watermarkText, watermarkSize, watermarkPosition, watermarkOpacity, position, customPresets, meshPoints, meshBlur, meshGrain, meshOpacity,
    meshSpread, noImageMode, redactions, redactionStyle, exportFormat, jpegQuality, sidebarPosition,
    bgGrain, lightRaysStyle, lightRaysOpacity, lightRaysAngle, lightRaysCount, lightRaysSourceX, lightRaysSourceY
  ]);


  // Global hotkeys
  useEffect(() => {
    if (window.snapFrameAPI) {
      const unsubscribe = window.snapFrameAPI.onGlobalHotkeyTriggered((imageUrl: string) => {
        onImageLoadedRef.current(imageUrl);
      });
      return () => unsubscribe();
    }
    return;
  }, []);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (window.snapFrameAPI) {
        const dataUrl = await window.snapFrameAPI.readImageFromClipboard();
        if (dataUrl) { onImageLoadedRef.current(dataUrl); return; }
      }
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) onImageLoadedRef.current(event.target.result as string);
              };
              reader.readAsDataURL(blob); break;
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); clearWorkspace(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault(); triggerExport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, imageSrc, padding, rounded, shadow, shadowColor, shadowEnabled, inset, insetColor, border, borderColor, scale, backgroundType, backgroundValue, aspectRatio, canvasWidth, canvasHeight, paddingMode, chromeStyle, chromeTheme, blurDensity, watermarkEnabled, watermarkText, watermarkSize, position, exportFormat, jpegQuality, annotations, meshPoints, meshBlur, meshGrain, meshOpacity, meshSpread, noImageMode]);

  // Mesh gradient background rendering
  useEffect(() => {
    if (backgroundType !== 'mesh') return;
    const canvas = document.createElement('canvas');
    const baseW = 800;
    let ratio = 16 / 9;
    if (aspectRatio === '1:1') ratio = 1;
    else if (aspectRatio === '4:3') ratio = 4 / 3;
    else if (aspectRatio === '16:9') ratio = 16 / 9;
    else if (aspectRatio === '3:2') ratio = 3 / 2;
    else if (aspectRatio === 'Custom') ratio = canvasWidth / canvasHeight;

    canvas.width = baseW;
    canvas.height = Math.round(baseW / ratio);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawMeshGradient(ctx, canvas.width, canvas.height, meshPoints, meshBlur, meshGrain, meshOpacity, meshSpread);
      setMeshDataUrl(canvas.toDataURL());
    }
  }, [backgroundType, meshPoints, meshBlur, meshGrain, meshOpacity, meshSpread, aspectRatio, canvasWidth, canvasHeight]);

  const dragStartRef = useRef<{ idx: number; rect: DOMRect } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, idx: number) => {
    e.preventDefault(); setActivePointIdx(idx);
    const handle = e.currentTarget as HTMLDivElement;
    const container = handle.parentElement;
    if (container) {
      dragStartRef.current = { idx, rect: container.getBoundingClientRect() };
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const { idx, rect } = dragStartRef.current;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setMeshPoints((prev) => {
      const copy = [...prev]; copy[idx] = { ...copy[idx], x, y }; return copy;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartRef.current) {
      const handle = e.currentTarget as HTMLDivElement;
      try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
      dragStartRef.current = null; pushHistory(getCurrentConfig());
    }
  };

  return (
    <AppContext.Provider value={{
      padding, setPadding, rounded, setRounded, shadow, setShadow, shadowColor, setShadowColor,
      shadowEnabled, setShadowEnabled, inset, setInset, insetColor, setInsetColor, border, setBorder,
      borderColor, setBorderColor, scale, setScale, backgroundType, setBackgroundType,
      backgroundValue, setBackgroundValue, bgGrain, setBgGrain, lightRaysStyle, setLightRaysStyle,
      lightRaysOpacity, setLightRaysOpacity,
      lightRaysAngle, setLightRaysAngle,
      lightRaysCount, setLightRaysCount,
      lightRaysSourceX, setLightRaysSourceX,
      lightRaysSourceY, setLightRaysSourceY,
      aspectRatio, setAspectRatio, canvasWidth, setCanvasWidth,
      canvasHeight, setCanvasHeight, selectedPreset, setSelectedPreset, showSafeZone, setShowSafeZone,
      paddingMode, setPaddingMode, chromeStyle, setChromeStyle,
      chromeTheme, setChromeTheme, blurDensity, setBlurDensity, noImageMode, setNoImageMode,
      meshPoints, setMeshPoints, meshBlur, setMeshBlur, meshGrain, setMeshGrain, meshOpacity, setMeshOpacity,
      meshSpread, setMeshSpread, meshDataUrl, setMeshDataUrl, activePointIdx, setActivePointIdx,
      watermarkEnabled, setWatermarkEnabled, watermarkText, setWatermarkText, watermarkSize, setWatermarkSize,
      watermarkPosition, setWatermarkPosition, watermarkOpacity, setWatermarkOpacity, position, setPosition,
      activeTool, setActiveTool, arrowStyle, setArrowStyle, annotations, setAnnotations, annotationColor, setAnnotationColor,
      annotationStrokeWidth, setAnnotationStrokeWidth, promptConfig, setPromptConfig, sidebarVisible, setSidebarVisible,
      settingsVisible, setSettingsVisible,
      helpVisible, setHelpVisible,
      imageSrc, setImageSrc, isDragging, setIsDragging, customPresets, setCustomPresets, newPresetName, setNewPresetName,
      showAdvancedInset, setShowAdvancedInset, showAdvancedShadow, setShowAdvancedShadow, showAdvancedBorder, setShowAdvancedBorder,
      exportFormat, setExportFormat, jpegQuality, setJpegQuality, zoomLevel, setZoomLevel, history, setHistory,
      historyIndex, setHistoryIndex, showHollywoodPalettes, setShowHollywoodPalettes, selectedGradientCategory, setSelectedGradientCategory,
      showHollywoodMeshPalettes, setShowHollywoodMeshPalettes,
      appTheme, setAppTheme,
      sidebarPosition, setSidebarPosition,
      vibePalette, vibeVariantIndex, vibeUpdateDrawColor, setVibeUpdateDrawColor,
      fileInputRef, colorInputRef,
      redactions, setRedactions,
      isScanningSecrets, setIsScanningSecrets,
      scanProgress, setScanProgress,
      hoveredRedactionId, setHoveredRedactionId,
      redactionStyle, setRedactionStyle,
      scanForSecrets, toggleRedaction, redactAll, revealAll,
      getCurrentConfig, pushHistory, applyConfig, handleUndo, handleRedo, selectFile, handleHTMLFileInput,
      pasteFromClipboard, saveCustomPreset, deleteCustomPreset, copyBeautifiedImage, triggerExport,
      selectBackgroundPreset, handleSliderRelease, getZoomStyle, applyMeshPalette, generateRandomPalette,
      handleDragOver, handleDragLeave, handleDrop, customPrompt, handlePointerDown, handlePointerMove, handlePointerUp,
      resetStyles,
      clearWorkspace,
      applyAutoVibe,

      // Issue Agent states & functions
      issuePayload, setIssuePayload,
      isGeneratingIssue, setIsGeneratingIssue,
      issueError, setIssueError,
      aiProvider, setAiProvider,
      ollamaEndpoint, setOllamaEndpoint,
      ollamaModel, setOllamaModel,
      openaiModel, setOpenaiModel,
      googleModel, setGoogleModel,
      claudeModel, setClaudeModel,
      openaiModelsList, googleModelsList, claudeModelsList,
      ollamaAvailable, setOllamaAvailable,
      githubRepo, setGithubRepo,
      githubRepoList, setGithubRepoList,
      showComponentHighlights, setShowComponentHighlights,
      burnHighlights, setBurnHighlights,
      appendAttribution, setAppendAttribution,
      cachedOcrResult, setCachedOcrResult,
      highlightedComponents, setHighlightedComponents,
      localFallbackAvailable, setLocalFallbackAvailable,
      userInstruction, setUserInstruction,
      generateIssue, generateIssueOffline, pushIssueToGitHub, resetIssue, exportBeautifiedScreenshot,
      triggerAiHealthCheck
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
