import { describe, it, expect } from 'vitest';
import { 
  checkLuhn, 
  detectSecretsInText, 
  filterOverlappingMatches, 
  processOcrResults 
} from '../src/renderer/utils/privacyGuardUtils';

describe('Privacy Guard Utils', () => {
  describe('Luhn check card validator', () => {
    it('should validate correct card numbers', () => {
      // 4111111111111111 is a valid test credit card number (passes Luhn)
      expect(checkLuhn('4111-1111-1111-1111')).toBe(true);
      expect(checkLuhn('4111 1111 1111 1111')).toBe(true);
      expect(checkLuhn('4111111111111111')).toBe(true);
    });

    it('should reject invalid card numbers', () => {
      expect(checkLuhn('4111-1111-1111-1112')).toBe(false);
      expect(checkLuhn('12345')).toBe(false);
      expect(checkLuhn('abc')).toBe(false);
    });
  });

  describe('Secret detection regex matches', () => {
    it('should detect emails', () => {
      const text = 'Contact us at test.user@example.co.uk or support@service.com';
      const matches = detectSecretsInText(text);
      
      const emails = matches.filter(m => m.type === 'email');
      expect(emails.length).toBe(2);
      expect(emails[0].text).toBe('test.user@example.co.uk');
      expect(emails[1].text).toBe('support@service.com');
    });

    it('should detect JWT and Stripe keys', () => {
      const stripeKey = 'sk_test_abcdefghijklmnopqrstuvwx'; // Test fixture - matches STRIPE_KEY_REGEX
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const text = `Keys: ${stripeKey} and token ${jwt}`;

      const matches = detectSecretsInText(text);
      const keys = matches.filter(m => m.type === 'api-key');

      expect(keys.length).toBe(2);
      expect(keys.map(k => k.text)).toContain(stripeKey);
      expect(keys.map(k => k.text)).toContain(jwt);
    });

    it('should detect major AI provider keys', () => {
      const openAi = 'sk-proj-abc123XYZ456_7890defABC123_XYZ456def789abc123';
      const claude = 'sk-ant-sid01-abc123XYZ456_7890defABC123-XYZ456def789abc123-ABC123xyz-xyz987';
      const gemini = 'AIzaSyAz123xyzABC-def987XYZ_654abc123';
      const hf = 'hf_xyzABC123def456ghi789jkl012mno345';
      const cohere = 'co-abc123XYZ456def789ghi012jkl345mno678';
      const text = `OpenAI: ${openAi}, Claude: ${claude}, Google Gemini: ${gemini}, HF: ${hf}, Cohere: ${cohere}`;

      const matches = detectSecretsInText(text);
      const keys = matches.filter(m => m.type === 'api-key');

      expect(keys.length).toBe(5);
      expect(keys.map(k => k.text)).toContain(openAi);
      expect(keys.map(k => k.text)).toContain(claude);
      expect(keys.map(k => k.text)).toContain(gemini);
      expect(keys.map(k => k.text)).toContain(hf);
      expect(keys.map(k => k.text)).toContain(cohere);
    });

    it('should detect passwords (both plaintext labeled and masked)', () => {
      const text = 'Admin Password: "superSecret123!" and DB_PASSWORD = mySafePass, but wait: is pass: true ignored? Masked password is •••••••• or *******';
      const matches = detectSecretsInText(text);
      const passwords = matches.filter(m => m.type === 'password');

      expect(passwords.length).toBe(4);
      expect(passwords.map(p => p.text)).toContain('superSecret123!');
      expect(passwords.map(p => p.text)).toContain('mySafePass');
      expect(passwords.map(p => p.text)).toContain('••••••••');
      expect(passwords.map(p => p.text)).toContain('*******');
      expect(passwords.map(p => p.text)).not.toContain('true');
    });

    it('should detect high-entropy keys', () => {
      // Must contain at least one uppercase, lowercase, and digit to pass the high-entropy check
      const genericKey = 'abCdEfGhIjKlMnOpQrStUvWxYz01'; 
      const text = `KEY_VALUE = "${genericKey}"`;
      const matches = detectSecretsInText(text);
      
      const keys = matches.filter(m => m.type === 'api-key');
      expect(keys.length).toBe(1);
      expect(keys[0].text).toBe(genericKey);
    });

    it('should detect phone numbers', () => {
      const text = 'Call +1-555-019-2834 or (555) 123-4567 for support';
      const matches = detectSecretsInText(text);
      
      const phones = matches.filter(m => m.type === 'phone');
      expect(phones.length).toBe(2);
      expect(phones.map(p => p.text)).toContain('+1-555-019-2834');
      expect(phones.map(p => p.text)).toContain('(555) 123-4567');
    });

    it('should detect IP addresses', () => {
      const text = 'Server 192.168.1.50 and gateway 10.0.0.1';
      const matches = detectSecretsInText(text);
      
      const ips = matches.filter(m => m.type === 'ip');
      expect(ips.length).toBe(2);
      expect(ips[0].text).toBe('192.168.1.50');
      expect(ips[1].text).toBe('10.0.0.1');
    });

    it('should detect street addresses', () => {
      const text = 'Deliver to 1600 Amphitheatre Parkway, Mountain View, CA or 10 Downing Street, London';
      const matches = detectSecretsInText(text);
      
      const addresses = matches.filter(m => m.type === 'address');
      expect(addresses.length).toBe(2);
      expect(addresses[0].text).toBe('1600 Amphitheatre Parkway');
      expect(addresses[1].text).toBe('10 Downing Street');
    });

    it('should detect valid hex keys (32, 40, 64 chars)', () => {
      const hex32 = 'abcdef1234567890abcdef1234567890';
      const text = `key=${hex32}`;
      const matches = detectSecretsInText(text);
      const keys = matches.filter(m => m.type === 'api-key');
      expect(keys.length).toBe(1);

      const hex40 = 'abcdef1234567890abcdef1234567890abcdef12';
      const matches40 = detectSecretsInText(`hex40=${hex40}`);
      expect(matches40.filter(m => m.type === 'api-key').length).toBe(1);
    });

    it('should reject invalid hex key lengths', () => {
      const short = 'abc123'; // too short
      expect(detectSecretsInText(short).filter(m => m.type === 'api-key').length).toBe(0);
    });

    it('should detect IPv6 addresses', () => {
      const text = 'Server at 2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const matches = detectSecretsInText(text);
      const ips = matches.filter(m => m.type === 'ip');
      expect(ips.length).toBe(1);
      expect(ips[0].text).toContain('2001');
    });

    it('should detect credit card numbers via Luhn check', () => {
      const text = 'Use card 4111 1111 1111 1111 for payment';
      const matches = detectSecretsInText(text);
      const cards = matches.filter(m => m.type === 'card');
      expect(cards.length).toBe(1);
      expect(cards[0].text).toBe('4111 1111 1111 1111');
    });
  });

  describe('Overlapping matches filter', () => {
    it('should prefer longer/earlier matches', () => {
      const matches = [
        { text: '192.168.1.5', type: 'ip' as const, index: 10 },
        { text: '192.168.1.50', type: 'ip' as const, index: 10 }, // overlaps completely but longer
        { text: 'test@example.com', type: 'email' as const, index: 30 }
      ];

      const filtered = filterOverlappingMatches(matches);
      expect(filtered.length).toBe(2);
      expect(filtered[0].text).toBe('192.168.1.50');
      expect(filtered[1].text).toBe('test@example.com');
    });
  });

  describe('OCR Bounding Box Mapping', () => {
    it('should align OCR words and map coordinates', () => {
      const ocrLines = [
        {
          text: 'Send key sk_test_abcdefghijklmnopqrstuvwx here', // Test fixture - matches STRIPE_KEY_REGEX
          bbox: { x0: 0, y0: 0, x1: 500, y1: 50 },
          words: [
            { text: 'Send', bbox: { x0: 0, y0: 10, x1: 40, y1: 40 } },
            { text: 'key', bbox: { x0: 50, y0: 10, x1: 80, y1: 40 } },
            { text: 'sk_test_abcdefghijklmnopqrstuvwx', bbox: { x0: 90, y0: 10, x1: 400, y1: 40 } }, // Test fixture
            { text: 'here', bbox: { x0: 410, y0: 10, x1: 450, y1: 40 } }
          ]
        }
      ];

      const result = processOcrResults(ocrLines, 500, 100);
      expect(result.length).toBe(1);
      expect(result[0].text).toBe('sk_test_abcdefghijklmnopqrstuvwx');
      expect(result[0].type).toBe('api-key');
      expect(result[0].x).toBeCloseTo(90 / 500);
      expect(result[0].y).toBeCloseTo(10 / 100);
      expect(result[0].w).toBeCloseTo((400 - 90) / 500);
      expect(result[0].h).toBeCloseTo((40 - 10) / 100);
    });

    it('should handle wrapped API key line continuations', () => {
      const ocrLines = [
        {
          text: 'API Key: sk-proj-abc123xyz456789def123xyz456def789abc',
          bbox: { x0: 0, y0: 0, x1: 500, y1: 30 },
          words: [
            { text: 'API', bbox: { x0: 0, y0: 5, x1: 30, y1: 25 } },
            { text: 'Key:', bbox: { x0: 40, y0: 5, x1: 80, y1: 25 } },
            { text: 'sk-proj-abc123xyz456789def123xyz456def789abc', bbox: { x0: 90, y0: 5, x1: 450, y1: 25 } }
          ]
        },
        {
          text: 'wrapContinuationPart1',
          bbox: { x0: 90, y0: 35, x1: 350, y1: 65 },
          words: [
            { text: 'wrapContinuationPart1', bbox: { x0: 90, y0: 40, x1: 350, y1: 60 } }
          ]
        },
        {
          text: 'part2',
          bbox: { x0: 90, y0: 70, x1: 150, y1: 100 },
          words: [
            { text: 'part2', bbox: { x0: 90, y0: 75, x1: 150, y1: 95 } }
          ]
        }
      ];

      const result = processOcrResults(ocrLines, 500, 200);
      expect(result.length).toBe(3);
      expect(result[0].text).toBe('sk-proj-abc123xyz456789def123xyz456def789abc');
      expect(result[0].type).toBe('api-key');
      expect(result[1].text).toBe('wrapContinuationPart1');
      expect(result[1].type).toBe('api-key');
      expect(result[2].text).toBe('part2');
      expect(result[2].type).toBe('api-key');
    });

    it('returns empty array for zero dimensions', () => {
      const ocrLines = [
        {
          text: 'test',
          bbox: { x0: 0, y0: 0, x1: 100, y1: 50 },
          words: [
            { text: 'test', bbox: { x0: 0, y0: 0, x1: 100, y1: 50 } }
          ]
        }
      ];
      expect(processOcrResults(ocrLines, 0, 0)).toEqual([]);
      expect(processOcrResults(ocrLines, 800, 0)).toEqual([]);
      expect(processOcrResults(ocrLines, 0, 600)).toEqual([]);
    });

    it('handles empty words array in a line', () => {
      const ocrLines = [
        {
          text: 'has words',
          bbox: { x0: 0, y0: 0, x1: 200, y1: 30 },
          words: [{ text: 'has', bbox: { x0: 0, y0: 0, x1: 40, y1: 30 } }, { text: 'words', bbox: { x0: 50, y0: 0, x1: 130, y1: 30 } }]
        },
        {
          text: '',
          bbox: { x0: 0, y0: 40, x1: 200, y1: 70 },
          words: []
        }
      ];
      const result = processOcrResults(ocrLines, 200, 100);
      // Empty words line should be skipped without error
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('clamps bounding boxes to stay within image dimensions', () => {
      const longKey = 'sk-proj-' + 'a'.repeat(32) + 'B'.repeat(16) + '1'.repeat(8);
      const ocrLines = [
        {
          text: longKey,
          bbox: { x0: -10, y0: -5, x1: 600, y1: 800 },
          words: [
            { text: longKey, bbox: { x0: -10, y0: -5, x1: 600, y1: 800 } }
          ]
        }
      ];
      const result = processOcrResults(ocrLines, 500, 700);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].x).toBeGreaterThanOrEqual(0);
      expect(result[0].y).toBeGreaterThanOrEqual(0);
      expect(result[0].w).toBeLessThanOrEqual(1);
      expect(result[0].h).toBeLessThanOrEqual(1);
    });

    it('does not flag continuation when vertical gap is too large', () => {
      const longKey = 'sk-proj-' + 'a'.repeat(32) + 'B'.repeat(16) + '1'.repeat(8);
      const ocrLines = [
        {
          text: 'API Key: ' + longKey,
          bbox: { x0: 0, y0: 0, x1: 500, y1: 20 },
          words: [
            { text: 'API', bbox: { x0: 0, y0: 0, x1: 30, y1: 20 } },
            { text: 'Key:', bbox: { x0: 35, y0: 0, x1: 70, y1: 20 } },
            { text: longKey, bbox: { x0: 80, y0: 0, x1: 350, y1: 20 } }
          ]
        },
        {
          text: 'NotContinuation',
          bbox: { x0: 80, y0: 200, x1: 280, y1: 230 },
          words: [
            { text: 'NotContinuation', bbox: { x0: 80, y0: 200, x1: 280, y1: 230 } }
          ]
        }
      ];
      const result = processOcrResults(ocrLines, 500, 250);
      // Only the actual API key should be flagged, not the far-away word
      expect(result.length).toBe(1);
      expect(result[0].text).toBe(longKey);
    });

    it('continues API key across lines for multi-line wrapped keys', () => {
      const longKey = 'sk-proj-' + 'a'.repeat(32) + 'B'.repeat(16) + '1'.repeat(8);
      const suffix = 'bbbbCCCCdddd1234';  // 16 chars, enough for continuation detection
      const ocrLines = [
        {
          text: 'key: ' + longKey,
          bbox: { x0: 0, y0: 0, x1: 500, y1: 30 },
          words: [
            { text: 'key:', bbox: { x0: 10, y0: 5, x1: 50, y1: 25 } },
            { text: longKey, bbox: { x0: 60, y0: 5, x1: 250, y1: 25 } }
          ]
        },
        {
          text: suffix,
          bbox: { x0: 60, y0: 35, x1: 130, y1: 65 },
          words: [
            { text: suffix, bbox: { x0: 60, y0: 40, x1: 130, y1: 60 } }
          ]
        }
      ];
      const result = processOcrResults(ocrLines, 500, 100);
      expect(result.length).toBe(2);
      expect(result[0].text).toBe(longKey);
      expect(result[1].text).toBe(suffix);
      expect(result[1].type).toBe('api-key');
    });

    it('resets API key continuation flag after a non-API-key match', () => {
      const longKey = 'sk-proj-' + 'a'.repeat(32) + 'B'.repeat(16) + '1'.repeat(8);
      const ocrLines = [
        {
          text: 'API Key: ' + longKey,
          bbox: { x0: 0, y0: 0, x1: 500, y1: 30 },
          words: [
            { text: 'API', bbox: { x0: 0, y0: 5, x1: 30, y1: 25 } },
            { text: 'Key:', bbox: { x0: 35, y0: 5, x1: 70, y1: 25 } },
            { text: longKey, bbox: { x0: 80, y0: 5, x1: 320, y1: 25 } }
          ]
        },
        {
          text: 'test@example.com',
          bbox: { x0: 0, y0: 40, x1: 500, y1: 70 },
          words: [
            { text: 'test@example.com', bbox: { x0: 0, y0: 45, x1: 180, y1: 65 } }
          ]
        },
        {
          text: 'NotKey',
          bbox: { x0: 80, y0: 80, x1: 200, y1: 110 },
          words: [
            { text: 'NotKey', bbox: { x0: 80, y0: 85, x1: 200, y1: 105 } }
          ]
        }
      ];
      const result = processOcrResults(ocrLines, 500, 150);
      const apiKeyItems = result.filter(r => r.text === longKey);
      const emailItems = result.filter(r => r.text === 'test@example.com');
      const notKeyItems = result.filter(r => r.text === 'NotKey');
      expect(apiKeyItems.length).toBe(1);
      expect(emailItems.length).toBe(1);
      expect(notKeyItems.length).toBe(0);
    });
  });
});
