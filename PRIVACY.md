# Privacy Policy

**App Name:** achu  
**Publisher:** QAInsights (NaveenKumar Namachivayam)  
**Contact:** catch.nkn@gmail.com  
**Effective Date:** June 7, 2026  
**Last Updated:** June 7, 2026

---

## Overview

achu is a desktop screenshot beautification utility for Windows. This policy explains what data is collected, how it is used, and the choices available to you. achu is designed with a **privacy-first** approach — the core functionality runs entirely on your local machine with no data transmitted externally unless you explicitly configure optional third-party AI integrations.

---

## Data We Collect

### We Do Not Collect

achu does **not** collect, store, transmit, or share any of the following:

- Screenshots or images you load into the application
- Text extracted by the OCR feature
- Personally identifiable information (PII) or sensitive data detected by the Privacy Guard feature
- Usage analytics, telemetry, or crash reports
- Device identifiers or hardware fingerprints

### Data Stored Locally on Your Device

The following data is stored **only on your local device** and is never transmitted to QAInsights:

| Data | Storage Location | Purpose |
|------|-----------------|---------|
| AI provider API keys (OpenAI, Gemini, Claude) | Encrypted via Windows DPAPI (`safeStorage`) | Authenticating optional AI features |
| GitHub personal access token | Encrypted via Windows DPAPI (`safeStorage`) | Pushing generated issue reports to GitHub |
| App preferences and settings | Local app data directory | Restoring your configuration between sessions |

All credentials are encrypted at rest using the operating system's native cryptography (Data Protection API on Windows). They are never written to disk in plaintext and are never sent to QAInsights servers.

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
