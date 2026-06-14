window.config = {
  branding: {
    name: "achu",
    tagline: "AI-Enhanced Screenshots: From Raw Captures to Stunning Assets & Bug Tickets",
    subtagline: "A lightweight, gorgeous desktop utility for Windows, macOS, and Linux that turns raw captures into polished visual graphics, with a <span class=\"gradient-text\">local screenshot gallery</span>, an integrated <span class=\"gradient-text\">AI Issue Agent</span>, and fully local, <span class=\"gradient-text\">offline OCR</span> text extraction.",
    meaning: "achu (அச்சு) means 'print' or 'mold' in Tamil. 🖨️",
    customDomain: "achu.app"
  },
  links: {
    github: "https://github.com/QAInsights/achu",
    coffee: "https://buymeacoffee.com/qainsights"
  },
  ecosystem: [
    { name: "qainsights.com", url: "https://qainsights.com" },
    { name: "dosa.dev", url: "https://dosa.dev" },
    { name: "ai.dosa.dev", url: "https://ai.dosa.dev" },
    { name: "jmeter.ai", url: "https://jmeter.ai" },
    { name: "plugins.jmeter.ai", url: "https://plugins.jmeter.ai" },
    { name: "iamspeed.dev", url: "https://iamspeed.dev" }
  ],
  features: [
    {
      id: "beautification",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feature-icon-svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/><path d="M12 2v20"/><path d="M12 12h10"/><path d="M12 12H2"/><path d="m19 12-7-7"/><path d="m19 12-7 7"/><path d="m5 12 7-7"/><path d="m5 12 7 7"/></svg>`,
      title: "Canvas & Framing Aesthetics",
      description: "Frame screenshots with custom padding, background blur, rounded corners, adjustable shadows, scale, and custom aspect ratios. Instantly overlay polished browser chromes (macOS-style or Windows-style window controls)."
    },
    {
      id: "screenshot-gallery",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feature-icon-svg"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
      title: "Local Screenshot Gallery",
      description: "Save beautified captures to a local folder, browse thumbnails, reopen in the editor, copy to clipboard, or soft-delete to .achu-trash for 30 days. Pick any folder in Settings — everything stays on your machine."
    },
    {
      id: "privacy",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feature-icon-svg"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 11.5 2 2 4-4"/></svg>`,
      title: "Smart Privacy Guard",
      description: "Locally scan captures using Tesseract WASM to automatically detect credentials, API keys, passwords, emails, and IPs. Redact sensitive values in one click with Gaussian Blur or solid masks."
    },
    {
      id: "ai-agent",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feature-icon-svg"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
      title: "AI-Powered Issue Agent",
      description: "Use vision models to analyze screenshots and generate fully structured GitHub issue templates (titles, repro steps, system context). Supports local models (Ollama) or external APIs (Gemini, Claude, OpenAI)."
    },
    {
      id: "ocr",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feature-icon-svg"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/><path d="M11 8v6"/></svg>`,
      title: "OCR Canvas Text Grabber",
      description: "Right-click anywhere on your canvas screenshot to extract text content instantly. Edit, trim, format, and copy the text via a clean local modal. Runs 100% locally and privately."
    }
  ],
  gallery: [
    {
      title: "Canvas Beautification & Presets",
      description: "Apply modern mesh gradients, custom padding, shadows, and window border mockups to screenshots.",
      image: "assets/presets.png",
      tag: "Presets & Backgrounds"
    },
    {
      title: "Privacy Guard & Redaction",
      description: "Automatically identify and pixelate/censor API keys, credit cards, emails, and passwords on-device.",
      image: "assets/privacy.png",
      tag: "Local Security"
    },
    {
      title: "AI Bug & Issue Agent",
      description: "Scan screenshots with visual LLMs to write code-compliant bug tickets directly to your GitHub repository.",
      image: "assets/issue-agent.png",
      tag: "AI Workflows"
    },
    {
      title: "OCR Text Extractor",
      description: "Extract text from any canvas block using high-performance local Tesseract WebAssembly.",
      image: "assets/ocr.png",
      tag: "OCR Utility"
    },
    {
      title: "Local Screenshot Gallery",
      description: "Browse saved captures in a thumbnail grid, reopen in the editor, and manage files locally. Deleted items move to .achu-trash and are removed after 30 days.",
      image: "assets/gallery.png",
      tag: "Local Library"
    }
  ]
};
