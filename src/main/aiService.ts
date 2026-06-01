import { safeStorage } from 'electron';

export async function checkAIHealth(provider: string, endpoint: string, apiKey: string): Promise<boolean> {
  if (provider === 'ollama') {
    try {
      const res = await fetch(`${endpoint}/api/tags`, {
        signal: AbortSignal.timeout(2000)
      });
      return res.ok;
    } catch (err) {
      console.error('[checkAIHealth] Ollama health check failed with error:', err);
      return false;
    }
  }

  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    console.warn(`[checkAIHealth] Aborting health check for ${provider} because API key is empty/missing.`);
    return false;
  }

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${trimmedKey}` },
        signal: AbortSignal.timeout(10000)
      });
      return res.ok;
    }

    if (provider === 'google') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`, {
        signal: AbortSignal.timeout(10000)
      });
      return res.ok;
    }

    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': trimmedKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Ping' }]
        }),
        signal: AbortSignal.timeout(10000)
      });
      // 401 is unauthorized (bad key), anything else (like 200 or 400 bad payload) shows the key is valid and endpoint reachable
      return res.status !== 401;
    }
  } catch (err) {
    console.error(`[checkAIHealth] Health check exception for ${provider}:`, err);
    return false;
  }

  return false;
}

export async function generateAIResponse(
  provider: string,
  model: string,
  prompt: string,
  imageBase64: string,
  endpoint: string,
  apiKey: string
): Promise<string> {
  if (provider === 'ollama') {
    const res = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        images: [imageBase64],
        stream: false,
        format: 'json'
      })
    });
    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return data.response || '';
  }

  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error(`API key is missing for ${provider}. Configure it in Settings.`);
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${errText || res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'google') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${trimmedKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/png', data: imageBase64 } }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Gemini error: ${res.status} ${errText || res.statusText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': trimmedKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: imageBase64
                }
              }
            ]
          }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic Claude error: ${res.status} ${errText || res.statusText}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}
