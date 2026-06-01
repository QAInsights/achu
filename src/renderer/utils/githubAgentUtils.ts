import { jsonrepair } from 'jsonrepair';

export interface WordBoundingBox {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GitHubIssuePayload {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reproSteps: string[];
  expected: string;
  actual: string;
  components: string[];       // OCR-inferred UI component names
  labels: string[];           // suggested GitHub label strings
  severityReason: string;     // one sentence from model
  markdownBody: string;       // final rendered markdown
}

export interface AgentContext {
  ocrText: string;
  ocrWords: WordBoundingBox[];
  imageSrc: string;           // base64 data URL
}

export interface OllamaConfig {
  endpoint: string;           // default: http://localhost:11434
  model: string;              // default: llava-phi3
}

export function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildPrompt(ocrText: string): string {
  return `
You are analyzing a software bug screenshot.
OCR text extracted from the screenshot: "${ocrText}"

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
}

function extractField(raw: string, field: string): string | null {
  // First try the JSON-like pattern: "field" : "value" or field : "value"
  const jsonLikeRegex = new RegExp(`"??${field}"??\\s*:\\s*"([^"]*)"`, 'i');
  const jsonLikeMatch = raw.match(jsonLikeRegex);
  if (jsonLikeMatch) return jsonLikeMatch[1];

  // Try direct keyword search: field is "value" or field: "value" or field "value"
  const directRegex = new RegExp(`${field}\\s*(?:is|:)?\\s*"([^"]*)"`, 'i');
  const directMatch = raw.match(directRegex);
  if (directMatch) return directMatch[1];

  return null;
}

export function safeParseJSON(raw: string): Record<string, any> {
  // Attempt 1: clean parse
  try {
    return JSON.parse(raw);
  } catch { /* fall through */ }

  // Attempt 2: jsonrepair
  try {
    return JSON.parse(jsonrepair(raw));
  } catch { /* fall through */ }

  // Attempt 3: manual extraction of key fields
  return {
    title: extractField(raw, 'title') ?? 'Untitled Bug',
    severity: (extractField(raw, 'severity') ?? 'medium') as any,
    severityReason: extractField(raw, 'severityReason') ?? '',
    reproSteps: [],
    expected: extractField(raw, 'expected') ?? '',
    actual: extractField(raw, 'actual') ?? '',
    components: [],
    labels: ['bug']
  };
}

function buildPayload(parsed: any): GitHubIssuePayload {
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

  return {
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
}

export async function generateIssueFromScreenshot(
  context: AgentContext,
  config: OllamaConfig
): Promise<GitHubIssuePayload> {
  const prompt = buildPrompt(context.ocrText);

  const response = await fetch(`${config.endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      prompt,
      images: [context.imageSrc.split(',')[1]], // strip data URL prefix
      stream: false,
      format: 'json'
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama response not OK: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = safeParseJSON(data.response || '');
  return buildPayload(parsed);
}

export function buildMarkdown(payload: GitHubIssuePayload): string {
  const severityEmoji = {
    critical: '🔴', high: '🟠', medium: '🟡', low: '🟢'
  }[payload.severity] || '🟡';

  return `
## Bug Report

**Severity:** ${severityEmoji} ${capitalize(payload.severity)}
${payload.severityReason ? `> ${payload.severityReason}` : ''}

### Steps to Reproduce
${payload.reproSteps.length > 0 ? payload.reproSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'No steps specified.'}

### Expected Behavior
${payload.expected || 'No expected behavior specified.'}

### Actual Behavior
${payload.actual || 'No actual behavior specified.'}

### Affected Components
${payload.components.length > 0 ? payload.components.map(c => `\`${c}\``).join(' · ') : 'None detected.'}

---
*Generated by [Achu](https://achu.design) · Screenshot Agent*
`.trim();
}
