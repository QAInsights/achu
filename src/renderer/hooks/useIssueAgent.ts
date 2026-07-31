import { useState, useEffect, useCallback } from 'react';
import type { RenderConfig } from '../canvasRenderer';
import { renderCanvas, preloadBgImage } from '../canvasRenderer';
import { useConnectionPoll } from './useConnectionPoll';
import { getUserDefault, updateUserDefault } from '../utils/storageUtils';
import type { WordBoundingBox, GitHubIssuePayload } from '../utils/githubAgentUtils';
import { buildMarkdown, safeParseJSON } from '../utils/githubAgentUtils';
import { pushToGitHub } from '../utils/githubApiUtils';
import { fetchAndParseModels, DEFAULT_OPENAI_MODELS, DEFAULT_GEMINI_MODELS, DEFAULT_CLAUDE_MODELS } from '../utils/modelsDevUtils';
import { downsampleImageForOcr } from '../utils/privacyGuardUtils';

export function useIssueAgent(
  imageSrc: string | null,
  noImageMode: boolean,
  getCurrentConfig: () => RenderConfig,
  pushHistory: (config: any) => void,
) {
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

  const pollInterval = aiProvider === 'ollama' ? 10000 : 0;
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

  const generateIssue = async () => {
    if (!imageSrc) return;
    setIsGeneratingIssue(true);
    setIssueError(null);
    setLocalFallbackAvailable(false);

    try {
      const ocrResult = cachedOcrResult || { text: '', words: [] };

      let activeModel = ollamaModel;
      if (aiProvider === 'openai') activeModel = openaiModel;
      else if (aiProvider === 'google') activeModel = googleModel;
      else if (aiProvider === 'claude') activeModel = claudeModel;

      let finalImg = imageSrc;
      if (aiProvider !== 'ollama') {
        const downsampled = await downsampleImageForOcr(imageSrc, 1024);
        finalImg = downsampled.dataUrl;
      }

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

  const exportBeautifiedScreenshot = async (burn = false): Promise<string> => {
    return new Promise((resolve, reject) => {
      const config = getCurrentConfig();
      const bgVal = config.backgroundValue || '';

      const runExport = (img: HTMLImageElement | null) => {
        try {
          const canvas = document.createElement('canvas');
          const configToRender = getCurrentConfig();
          if (burn) {
            (configToRender as any).showComponentHighlights = true;
            (configToRender as any).highlightedComponents = highlightedComponents;
            (configToRender as any).ocrWords = cachedOcrResult?.words || [];
          }
          renderCanvas(canvas, img, configToRender);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        }
      };

      let pending = 0;
      let screenshotImg: HTMLImageElement | null = null;
      let called = false;

      const checkDone = () => {
        if (pending === 0 && !called) {
          called = true;
          runExport(screenshotImg);
        }
      };

      if (!noImageMode && imageSrc) {
        pending++;
        screenshotImg = new Image();
        screenshotImg.src = imageSrc;
        screenshotImg.onload = () => {
          pending--;
          checkDone();
        };
        screenshotImg.onerror = () => reject(new Error('Failed to load image for export'));
      }

      if (config.backgroundType === 'gradient') {
        const urlPattern = /url\(['"]?([^'"()]+)['"]?\)/g;
        let urlMatch;
        while ((urlMatch = urlPattern.exec(bgVal)) !== null) {
          const imgUrl = urlMatch[1];
          pending++;
          preloadBgImage(imgUrl, () => {
            pending--;
            checkDone();
          });
        }
      }

      if (config.annotations) {
        config.annotations.forEach((ann) => {
          if (ann.type === 'image' && ann.imageSrc) {
            pending++;
            preloadBgImage(ann.imageSrc, () => {
              pending--;
              checkDone();
            });
          }
        });
      }

      checkDone();
    });
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

  return {
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
    triggerAiHealthCheck,
  };
}
