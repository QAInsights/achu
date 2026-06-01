export async function checkOllamaHealth(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint}/api/tags`, {
      signal: AbortSignal.timeout(2000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchInstalledModels(endpoint: string): Promise<string[]> {
  try {
    const res = await fetch(`${endpoint}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    const models = data.models || [];
    
    // filter to vision-capable models only
    const visionModels = ['llava', 'moondream', 'llava-phi3', 'bakllava'];
    return models
      .map((m: { name: string }) => m.name)
      .filter((name: string) =>
        visionModels.some(v => name.toLowerCase().includes(v))
      );
  } catch {
    return [];
  }
}
