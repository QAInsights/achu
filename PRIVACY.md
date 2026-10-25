# Privacy Policy

**App Name:** achu  
**Publisher:** QAInsights (NaveenKumar Namachivayam)  
**Contact:** catch.nkn@gmail.com  
**Effective Date:** June 7, 2026  
**Last Updated:** October 25, 2026

---

## Overview

achu is a desktop screenshot beautification utility for Windows. This policy explains what data is collected, how it is used, and the choices available to you. The core functionality runs locally. achu also sends anonymous daily usage statistics to QAInsights by default, and you can turn this off in Settings. Optional third-party AI integrations send data only when you configure and use them.

---

## Data We Collect

### We Do Not Collect

Except for the anonymous usage statistics described below and transient IP processing for rate limiting, achu does not persist or share any of the following:

- Screenshots or images you load into the application
- Text extracted by the OCR feature
- Personally identifiable information (PII) or sensitive data detected by the Privacy Guard feature
- Crash reports
- Device identifiers or hardware fingerprints
- IP addresses (used transiently for rate limiting, never stored)

### Data Stored Locally on Your Device

The following data is stored locally on your device. Telemetry settings and unsent feature counts are stored locally until they are sent or cleared, as described below.

| Data | Storage Location | Purpose |
|------|-----------------|---------|
| AI provider API keys (OpenAI, Gemini, Claude) | Encrypted via Windows DPAPI (`safeStorage`) | Authenticating optional AI features |
| GitHub personal access token | Encrypted via Windows DPAPI (`safeStorage`) | Pushing generated issue reports to GitHub |
| App preferences and settings | Local app data directory | Restoring your configuration between sessions |

All credentials are encrypted at rest using the operating system's native cryptography (Data Protection API on Windows). They are never written to disk in plaintext and are never sent to QAInsights servers.

### Anonymous Usage Statistics

Anonymous usage statistics are on by default. Once per day, achu sends a ping containing a random install ID, app version, Electron version, operating system, CPU architecture, distribution channel, UI locale, first-run flag, and aggregate feature usage counts. Cloudflare derives the country from request metadata. achu does not send the country itself.

The ping is sent to `telemetry.achu.app`, which uses Cloudflare Workers and D1 and is operated by QAInsights.

Feature counts use only a fixed list of action names, including exports by format, gallery and burst pack saves, privacy scan, OCR, AI issue generation by provider, GitHub pushes, background modes, presets, annotation tools, capture sources, onboarding actions, and update installs. These are aggregate counts only.

The telemetry ping never contains screenshots or images, OCR text, AI prompts, file paths, gallery names, API keys, GitHub tokens, or repository names.

Turn telemetry off with the **Share Anonymous Usage Stats** toggle in **Settings > General**, or set `DO_NOT_TRACK=1` or `ACHU_TELEMETRY=0`. Turning it off deletes unsent feature counters. Development builds never send telemetry.

---

## Optional Third-Party Integrations

achu supports optional integrations with external services. **These are entirely opt-in and require you to supply your own API credentials.** No data is sent to any of these services unless you explicitly configure and use the corresponding feature.

### AI Vision Providers (Issue Agent)

When you use the AI-Powered Issue Agent feature, your screenshot is sent to the AI provider you have selected:

| Provider | Privacy Policy |
|----------|---------------|
| **OpenAI** (GPT-4o-mini) | https://openai.com/policies/privacy-policy |
| **Google Gemini** (gemini-2.5-flash) | https://policies.google.com/privacy |
| **Anthropic Claude** (claude-3-5-sonnet) | https://www.anthropic.com/privacy |
| **Ollama** (local models, e.g., llava-phi3) | Fully offline — no data leaves your device |

**Recommendation:** Use the Ollama (local) option if you want the AI Issue Agent to remain 100% private.

### GitHub

When you use the GitHub integration, the generated issue title, body, labels, and system context you approve are transmitted to the GitHub API using your personal access token. Review [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) for details.

---

## Local Processing

The following features process data **exclusively on your device** using in-process WebAssembly and never contact any external server:

- **Privacy Guard / Secret Scanner** — Tesseract WASM scans your screenshot locally to detect credentials, API keys, email addresses, phone numbers, and other sensitive patterns.
- **OCR Text Grabber** — Tesseract WASM extracts text from your screenshot locally.
- **Canvas Beautification** — All rendering, filters, gradients, and export operations occur in-process.
- **Annotations** — All drawing and annotation data is kept in memory and is not persisted or transmitted.

---

## Children's Privacy

achu is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided personal information through this application, please contact us.

---

## Changes to This Policy

We may update this Privacy Policy to reflect changes in the application's features or applicable laws. The **Last Updated** date at the top of this document will reflect any revisions. Continued use of the application after an update constitutes acceptance of the revised policy.

---

## Contact

If you have questions or concerns about this Privacy Policy, please contact:

**NaveenKumar Namachivayam**  
Email: catch.nkn@gmail.com  
GitHub: https://github.com/QAInsights/achu
