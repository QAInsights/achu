import { RedactionItem } from '../canvasRenderer';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const JWT_REGEX = /eyJ[a-zA-Z0-9-_=]+\.eyJ[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+/g;
const STRIPE_KEY_REGEX = /\b(?:sk|pk)_(?:live|test)_[0-9a-zA-Z]{24,}\b/g;
const AWS_KEY_REGEX = /\b(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/g;

// AI Provider API Keys
const OPENAI_KEY_REGEX = /\bsk-(?:proj-)?[a-zA-Z0-9_\-]{32,}\b/g;
const ANTHROPIC_KEY_REGEX = /\bsk-ant-[a-zA-Z0-9_\-]{40,120}\b/g;
const GOOGLE_KEY_REGEX = /\bAIzaSy[a-zA-Z0-9_\-]{30,40}\b/g;
const HUGGINGFACE_KEY_REGEX = /\bhf_[a-zA-Z0-9]{30,}\b/g;
const COHERE_KEY_REGEX = /\bco-[a-zA-Z0-9]{32,}\b/g;

// Password patterns (plaintext labeled values and masked sequences)
const PLAINTEXT_PASSWORD_REGEX = /\b(?:password|passwd|pass|db_pass|db_password)\s*[:=]\s*["'`]?([a-zA-Z0-9!@#$%^&*()_+={}\[\]|\\<>\/\-]{4,})["'`]?/gi;
const MASKED_PASSWORD_REGEX = /(?:[\u2022\u25cf•●]{4,})|(?:\*{5,})/g;

// Generic high-entropy alphanumeric key (mixed case + digit, length 24-64)
const GENERIC_KEY_REGEX = /\b(?=[a-zA-Z0-9\-]*[A-Z])(?=[a-zA-Z0-9\-]*[a-z])(?=[a-zA-Z0-9\-]*[0-9])[a-zA-Z0-9_\-]{24,64}\b/g;
const HEX_KEY_REGEX = /\b[0-9a-fA-F]{32,64}\b/g;

// Credit card number candidates
const CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;

const PHONE_REGEX = /(?:\+?\b\d{1,3}[-.\s]?)?\(?\b\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

const IPV4_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
const IPV6_REGEX = /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g;

// Street addresses
const ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z0-9\s.,#-]+?\s+(?:Street|St|Avenue|Ave|Road|Rd|Highway|Hwy|Square|Sq|Trail|Trl|Drive|Dr|Court|Ct|Lane|Ln|Boulevard|Blvd|Way|Plaza|Plz|Terrace|Ter|Parkway|Pkwy|Circle|Cir)\b/gi;

export function checkLuhn(cardNo: string): boolean {
  const clean = cardNo.replace(/[ -]/g, '');
  if (clean.length < 13 || clean.length > 19) return false;
  
  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

interface TextMatch {
  text: string;
  type: RedactionItem['type'];
  index: number;
}

export function detectSecretsInText(text: string): TextMatch[] {
  const matches: TextMatch[] = [];

  const addMatch = (regex: RegExp, type: RedactionItem['type'], customValidator?: (t: string) => boolean) => {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      // If the regex contains a capture group (e.g. for plaintext password labels),
      // we only redact the captured group value, not the entire matched label.
      const matchText = match[1] !== undefined ? match[1] : match[0];
      const matchIndex = match.index + (match[1] !== undefined ? match[0].indexOf(match[1]) : 0);

      if (customValidator && !customValidator(matchText)) {
        continue;
      }
      matches.push({
        text: matchText,
        type,
        index: matchIndex,
      });
    }
  };

  addMatch(EMAIL_REGEX, 'email');
  addMatch(JWT_REGEX, 'api-key');
  addMatch(STRIPE_KEY_REGEX, 'api-key');
  addMatch(AWS_KEY_REGEX, 'api-key');
  addMatch(OPENAI_KEY_REGEX, 'api-key');
  addMatch(ANTHROPIC_KEY_REGEX, 'api-key');
  addMatch(GOOGLE_KEY_REGEX, 'api-key');
  addMatch(HUGGINGFACE_KEY_REGEX, 'api-key');
  addMatch(COHERE_KEY_REGEX, 'api-key');
  addMatch(PLAINTEXT_PASSWORD_REGEX, 'password', (t) => !/^(?:true|false|null|undefined|yes|no)$/i.test(t.trim()));
  addMatch(MASKED_PASSWORD_REGEX, 'password');
  addMatch(GENERIC_KEY_REGEX, 'api-key');
  addMatch(HEX_KEY_REGEX, 'api-key', (t) => {
    const len = t.length;
    if (len !== 32 && len !== 40 && len !== 64) return false;
    const hasLetters = /[a-fA-F]/i.test(t);
    const hasDigits = /[0-9]/.test(t);
    return hasLetters && hasDigits;
  });
  addMatch(CARD_REGEX, 'card', checkLuhn);
  addMatch(PHONE_REGEX, 'phone');
  addMatch(IPV4_REGEX, 'ip');
  addMatch(IPV6_REGEX, 'ip');
  addMatch(ADDRESS_REGEX, 'address');

  return filterOverlappingMatches(matches);
}

export function filterOverlappingMatches(matches: TextMatch[]): TextMatch[] {
  const sorted = [...matches].sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return b.text.length - a.text.length;
  });

  const filtered: TextMatch[] = [];
  let lastEnd = -1;

  for (const m of sorted) {
    const start = m.index;
    const end = start + m.text.length;

    if (start < lastEnd) {
      continue;
    }

    filtered.push(m);
    lastEnd = end;
  }

  return filtered;
}

interface TesseractWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface TesseractLine {
  text: string;
  words: TesseractWord[];
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export function processOcrResults(
  lines: TesseractLine[],
  imageWidth: number,
  imageHeight: number
): RedactionItem[] {
  const redactions: RedactionItem[] = [];

  if (imageWidth <= 0 || imageHeight <= 0) return [];

  let lastRedactedWasApiKey = false;
  let lastLineBbox: { x0: number; y0: number; x1: number; y1: number } | null = null;

  lines.forEach((line, lineIdx) => {
    const words = line.words || [];
    if (words.length === 0) return;

    const reconstructedText = words.map((w) => w.text).join(' ');
    
    const wordRanges: Array<{ start: number; end: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> = [];
    let currentPos = 0;
    words.forEach((word) => {
      const start = currentPos;
      const end = currentPos + word.text.length;
      wordRanges.push({ start, end, bbox: word.bbox });
      currentPos = end + 1;
    });

    let uniqueMatches = detectSecretsInText(reconstructedText);
    let isContinuation = false;

    // Check if this line is a continuation of a wrapped API key
    if (uniqueMatches.length === 0 && lastRedactedWasApiKey && lastLineBbox && line.bbox) {
      const lastLineHeight = lastLineBbox.y1 - lastLineBbox.y0;
      const verticalGap = line.bbox.y0 - lastLineBbox.y1;
      
      // If vertically close and contains exactly one word (no spaces)
      if (verticalGap < lastLineHeight * 1.5 && words.length === 1) {
        const wordText = words[0].text.trim();
        // Verify it consists of alphanumeric characters and common key chars
        if (wordText.length >= 3 && /^[a-zA-Z0-9_\-\/=+\uff0d]+$/.test(wordText)) {
          isContinuation = true;
          uniqueMatches = [{
            text: wordText,
            type: 'api-key',
            index: 0
          }];
        }
      }
    }

    if (uniqueMatches.length > 0) {
      let matchedApiKey = false;

      uniqueMatches.forEach((m, matchIdx) => {
        const matchStart = m.index;
        const matchEnd = matchStart + m.text.length;

        const overlapping = wordRanges.filter(
          (w) => w.start < matchEnd && w.end > matchStart
        );

        if (overlapping.length === 0) return;

        const minX = Math.min(...overlapping.map((o) => o.bbox.x0));
        const minY = Math.min(...overlapping.map((o) => o.bbox.y0));
        const maxX = Math.max(...overlapping.map((o) => o.bbox.x1));
        const maxY = Math.max(...overlapping.map((o) => o.bbox.y1));

        const x = Math.max(0, minX / imageWidth);
        const y = Math.max(0, minY / imageHeight);
        const w = Math.min(1 - x, (maxX - minX) / imageWidth);
        const h = Math.min(1 - y, (maxY - minY) / imageHeight);

        redactions.push({
          id: `redaction-${lineIdx}-${matchIdx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          text: m.text,
          type: m.type,
          x,
          y,
          w,
          h,
          status: 'redacted',
        });

        if (m.type === 'api-key') {
          matchedApiKey = true;
        }
      });

      if (matchedApiKey || isContinuation) {
        lastRedactedWasApiKey = true;
        lastLineBbox = line.bbox;
      } else {
        lastRedactedWasApiKey = false;
        lastLineBbox = null;
      }
    } else {
      lastRedactedWasApiKey = false;
      lastLineBbox = null;
    }
  });

  return redactions;
}

export function downsampleImageForOcr(dataUrl: string, maxDim = 1600): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (w <= maxDim && h <= maxDim) {
        resolve({ dataUrl, width: w, height: h });
        return;
      }
      let targetW = w;
      let targetH = h;
      if (w > h) {
        targetW = maxDim;
        targetH = Math.round((h * maxDim) / w);
      } else {
        targetH = maxDim;
        targetW = Math.round((w * maxDim) / h);
      }
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.8), width: targetW, height: targetH });
      } else {
        resolve({ dataUrl, width: w, height: h });
      }
    };
    img.onerror = () => {
      resolve({ dataUrl, width: 0, height: 0 });
    };
    img.src = dataUrl;
  });
}
