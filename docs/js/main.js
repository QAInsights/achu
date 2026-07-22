

document.addEventListener('DOMContentLoaded', () => {
  initBranding();
  initLinks();
  initFeatures();
  initGallery();
  initMobileMenu();
  initLightbox();
  initDownloadButton();
});

// Initialize site-wide branding text
function initBranding() {
  document.title = `${config.branding.name} - ${config.branding.tagline}`;

  const heroTitle = document.getElementById('hero-title');
  if (heroTitle) heroTitle.textContent = config.branding.name;

  const heroSubtitle = document.getElementById('hero-subtitle');
  if (heroSubtitle) heroSubtitle.innerHTML = config.branding.subtagline;

  const footerMeaning = document.getElementById('footer-meaning');
  if (footerMeaning) footerMeaning.textContent = config.branding.meaning;
}

// Bind links from config to appropriate elements
function initLinks() {
  // Navigation Github link
  const navGithub = document.getElementById('nav-github-link');
  if (navGithub) navGithub.href = config.links.github;

  // Hero Actions (Download button should point to releases, not main repo page)
  const heroDownload = document.getElementById('hero-github-link');
  if (heroDownload) heroDownload.href = config.links.releases || 'https://github.com/QAInsights/achu/releases';

  const heroExplore = document.getElementById('hero-explore-link');
  if (heroExplore) heroExplore.href = '#gallery';

  // Footer Links
  const footerGithub = document.getElementById('footer-github-link');
  if (footerGithub) footerGithub.href = config.links.github;

  const footerCoffee = document.getElementById('footer-coffee-link');
  if (footerCoffee) footerCoffee.href = config.links.coffee;

  // Partners Grid
  const partnersGrid = document.getElementById('partners-grid');
  if (partnersGrid && config.ecosystem) {
    partnersGrid.innerHTML = config.ecosystem.map(p => `
      <a href="${p.url}" target="_blank" rel="noopener noreferrer" class="partner-card glass-panel" id="partner-${p.name.replace(/\./g, '-')}">
        <span class="partner-name">${p.name}</span>
      </a>
    `).join('');
  }
}

// Render dynamic features cards
function initFeatures() {
  const container = document.getElementById('features-container');
  if (!container) return;

  container.innerHTML = config.features.map(f => `
    <article class="feature-card glass-panel" id="feature-${f.id}">
      <div class="feature-icon-wrapper" aria-hidden="true">
        ${f.icon}
      </div>
      <h3 class="feature-card-title">${f.title}</h3>
      <p class="feature-card-desc">${f.description}</p>
    </article>
  `).join('');
}

// Render dynamic, aspect-ratio locked gallery items
function initGallery() {
  const container = document.getElementById('gallery-container');
  if (!container) return;

  container.innerHTML = config.gallery.map((item, index) => `
    <div class="gallery-card" data-index="${index}" id="gallery-card-${index}" role="button" aria-label="Open image preview for ${item.title}">
      <div class="gallery-image-container glass-panel">
        <img src="${item.image}" alt="achu interface showing ${item.title}" loading="lazy" decoding="async" width="400" height="250" />
        <div class="gallery-hover-overlay">
          <div class="zoom-icon-wrapper" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </div>
        </div>
      </div>
      <div class="gallery-info">
        <span class="gallery-card-tag">${item.tag}</span>
        <h3 class="gallery-card-title">${item.title}</h3>
        <p class="gallery-card-desc">${item.description}</p>
      </div>
    </div>
  `).join('');
}



// Mobile navigation menu toggle handler
function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    menu.classList.toggle('active');
    const isActive = menu.classList.contains('active');
    toggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');

    // Toggle menu icon
    toggle.innerHTML = isActive
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`;
  });

  // Close menu when a link is clicked
  const links = menu.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`;
    });
  });
}

// Lightbox modal for gallery screenshots
function initLightbox() {
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-img');
  const modalCaption = document.getElementById('lightbox-caption');
  const modalClose = document.getElementById('lightbox-close');

  if (!modal || !modalImg || !modalCaption || !modalClose) return;

  const showLightbox = (src, alt, caption) => {
    modalImg.src = src;
    modalImg.alt = alt;
    modalCaption.textContent = caption;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Disable background scrolling
  };

  const closeLightbox = () => {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore background scrolling
    setTimeout(() => {
      modalImg.src = '';
      modalCaption.textContent = '';
    }, 300); // Wait for transition
  };

  // Attach click listener to gallery cards
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.gallery-card');
    if (card) {
      const index = parseInt(card.getAttribute('data-index'), 10);
      const item = config.gallery[index];
      if (item) {
        showLightbox(item.image, item.title, item.title);
      }
    }
  });

  // Attach click listener to hero mockup
  const heroMockup = document.getElementById('hero-mockup');
  if (heroMockup) {
    heroMockup.addEventListener('click', () => {
      showLightbox('assets/achu.png', 'achu Application Interface Screenshot', 'achu App');
    });
  }

  // Close triggers
  modalClose.addEventListener('click', closeLightbox);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLightbox();
  });

  // Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeLightbox();
    }
  });
}

// Detect visitor's OS and update download button with platform-specific installer link
function initDownloadButton() {
  const heroBtn = document.getElementById('hero-github-link');
  if (!heroBtn) return;

  const fallbackReleaseUrl = (typeof config !== 'undefined' && config.links && config.links.releases)
    ? config.links.releases
    : 'https://github.com/QAInsights/achu/releases';

  // Ensure initial fallback href points to releases page, not the GitHub repo homepage
  heroBtn.href = fallbackReleaseUrl;

  // Detect OS from user agent
  const ua = navigator.userAgent.toLowerCase();
  let os = 'unknown';
  let osLabel = 'Download';

  if (ua.includes('win')) {
    os = 'windows';
    osLabel = 'Download for Windows';
  } else if (ua.includes('mac') || ua.includes('macintosh') || ua.includes('mac os')) {
    os = 'macos';
    osLabel = 'Download for macOS';
  } else if (ua.includes('linux')) {
    os = 'linux';
    osLabel = 'Download for Linux';
  }

  // Detect architecture (arm64 vs x64)
  const isArm64 = ua.includes('arm') || ua.includes('aarch64');

  // Update button text immediately with OS label
  heroBtn.textContent = osLabel;

  // Fetch latest release and find the matching asset
  fetch('https://api.github.com/repos/QAInsights/achu/releases/latest')
    .then(res => res.ok ? res.json() : null)
    .then(release => {
      if (!release || !release.assets) return;

      const assets = release.assets;
      let downloadUrl = null;

      if (os === 'windows') {
        // Prefer .exe, match arch
        const exeAssets = assets.filter(a => a.name.toLowerCase().endsWith('.exe'));
        if (isArm64) {
          downloadUrl = exeAssets.find(a => a.name.toLowerCase().includes('arm64'))?.browser_download_url;
        } else {
          downloadUrl = exeAssets.find(a => a.name.toLowerCase().includes('-x64-'))?.browser_download_url
            || exeAssets.find(a => !a.name.toLowerCase().includes('arm64'))?.browser_download_url;
        }
        if (!downloadUrl && exeAssets.length > 0) downloadUrl = exeAssets[0].browser_download_url;
      } else if (os === 'macos') {
        // Prefer .dmg over .zip / .pkg
        const dmgAssets = assets.filter(a => a.name.toLowerCase().endsWith('.dmg'));
        const zipAssets = assets.filter(a => a.name.toLowerCase().endsWith('.zip') || a.name.toLowerCase().endsWith('.pkg'));

        let dmg = null;
        if (isArm64) {
          dmg = dmgAssets.find(a => a.name.toLowerCase().includes('arm64'))
             || dmgAssets.find(a => a.name.toLowerCase().includes('universal'))
             || dmgAssets[0];
        } else {
          dmg = dmgAssets.find(a => a.name.toLowerCase().includes('x64') || a.name.toLowerCase().includes('universal'))
             || dmgAssets.find(a => !a.name.toLowerCase().includes('arm64'))
             || dmgAssets[0];
        }

        let zip = null;
        if (isArm64) {
          zip = zipAssets.find(a => a.name.toLowerCase().includes('arm64'))
             || zipAssets.find(a => a.name.toLowerCase().includes('universal'))
             || zipAssets[0];
        } else {
          zip = zipAssets.find(a => a.name.toLowerCase().includes('x64') || a.name.toLowerCase().includes('universal'))
             || zipAssets.find(a => !a.name.toLowerCase().includes('arm64'))
             || zipAssets[0];
        }

        downloadUrl = (dmg || zip)?.browser_download_url;
      } else if (os === 'linux') {
        // Prefer .AppImage, fall back to .deb
        const appImages = assets.filter(a => a.name.toLowerCase().endsWith('.appimage'));
        const debs = assets.filter(a => a.name.toLowerCase().endsWith('.deb'));

        if (isArm64) {
          downloadUrl = appImages.find(a => a.name.toLowerCase().includes('arm64'))?.browser_download_url
            || debs.find(a => a.name.toLowerCase().includes('arm64'))?.browser_download_url;
        } else {
          downloadUrl = appImages.find(a => a.name.toLowerCase().includes('amd64') || !a.name.toLowerCase().includes('arm64'))?.browser_download_url
            || debs.find(a => a.name.toLowerCase().includes('amd64') || !a.name.toLowerCase().includes('arm64'))?.browser_download_url;
        }
        if (!downloadUrl && appImages.length > 0) downloadUrl = appImages[0].browser_download_url;
        if (!downloadUrl && debs.length > 0) downloadUrl = debs[0].browser_download_url;
      }

      // Fallback to first asset if no match
      if (!downloadUrl && assets.length > 0) {
        downloadUrl = assets[0].browser_download_url;
      }

      if (downloadUrl) {
        heroBtn.href = downloadUrl;
        // Remove target="_blank" so the download happens in the same tab
        heroBtn.removeAttribute('target');
      }
    })
    .catch(() => {
      heroBtn.href = fallbackReleaseUrl;
    });
}
