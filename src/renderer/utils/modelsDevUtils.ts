export interface ModelOption {
  value: string;
  label: string;
}

export interface DynamicModelsResult {
  openai: ModelOption[];
  google: ModelOption[];
  claude: ModelOption[];
}

export const DEFAULT_OPENAI_MODELS: ModelOption[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Default)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'o1-mini', label: 'o1 Mini' },
  { value: 'o3-mini', label: 'o3 Mini' }
];

export const DEFAULT_GEMINI_MODELS: ModelOption[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Default)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
];

export const DEFAULT_CLAUDE_MODELS: ModelOption[] = [
  { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet (Default)' },
  { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
  { value: 'claude-3-5-opus-latest', label: 'Claude 3.5 Opus' }
];

export async function fetchAndParseModels(): Promise<DynamicModelsResult> {
  let cachedData: any = null;
  try {
    const cacheStr = localStorage.getItem('snapframe-models-dev-cache');
    if (cacheStr) {
      const cacheObj = JSON.parse(cacheStr);
      if (Date.now() - cacheObj.timestamp < 86400000) {
        cachedData = cacheObj.data;
      }
    }
  } catch (e) {
    console.error('Failed to read models cache:', e);
  }

  let apiData = cachedData;

  if (!apiData) {
    try {
      const res = await fetch('https://models.dev/api.json', {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        apiData = data;
        localStorage.setItem('snapframe-models-dev-cache', JSON.stringify({
          timestamp: Date.now(),
          data
        }));
      }
    } catch (e) {
      console.error('Failed to fetch from models.dev:', e);
      try {
        const cacheStr = localStorage.getItem('snapframe-models-dev-cache');
        if (cacheStr) {
          apiData = JSON.parse(cacheStr).data;
        }
      } catch (e2) {}
    }
  }

  const result: DynamicModelsResult = {
    openai: DEFAULT_OPENAI_MODELS,
    google: DEFAULT_GEMINI_MODELS,
    claude: DEFAULT_CLAUDE_MODELS
  };

  if (apiData) {
    const parseModels = (providerKey: string): ModelOption[] | null => {
      const provider = apiData[providerKey];
      if (!provider || !provider.models) return null;
      const list: ModelOption[] = [];
      Object.keys(provider.models).forEach((modelId) => {
        const m = provider.models[modelId];
        const inputModalities = m.modalities?.input || [];
        if (inputModalities.includes('image')) {
          list.push({
            value: modelId,
            label: m.name || modelId
          });
        }
      });
      return list.length > 0 ? list : null;
    };

    const oai = parseModels('openai');
    const google = parseModels('google');
    const anthropic = parseModels('anthropic');

    if (oai) result.openai = oai;
    if (google) result.google = google;
    if (anthropic) result.claude = anthropic;
  }

  return result;
}
