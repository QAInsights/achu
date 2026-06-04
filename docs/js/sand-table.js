// Wakanda Vibranium Sand Table Mockup Simulation
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('sand-table-canvas');
  const fallback = document.getElementById('sand-table-fallback');
  if (!canvas || !fallback) return;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  let particles = [];
  let w = 0;
  let h = 0;
  let mouseX = -9999;
  let mouseY = -9999;
  let isHovering = false;
  let animationFrameId = null;

  // Physics coefficients
  const springStiffness = 0.035;
  const friction = 0.85;
  const pushStrength = 0.6;
  const activeRadius = 90;
  const baseJitter = 0.25;

  // Load image and initialize
  const img = new Image();
  img.src = fallback.src;
  img.onload = () => {
    initParticles();
    resizeCanvas();
    window.addEventListener('resize', handleResize);
    
    // Cross-fade canvas and fallback
    canvas.style.opacity = '1';
    fallback.style.opacity = '0';
    setTimeout(() => {
      fallback.style.display = 'none';
    }, 500);

    // Start loop
    tick();
  };

  function initParticles() {
    // Render to offscreen canvas to sample pixel data
    const sampleW = 320;
    const sampleH = 200;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = sampleW;
    tempCanvas.height = sampleH;
    tempCtx.drawImage(img, 0, 0, sampleW, sampleH);

    const imgData = tempCtx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    particles = [];
    const step = 3; // Sample frequency for ideal particle density (~4500 particles)
    for (let y = 0; y < sampleH; y += step) {
      for (let x = 0; x < sampleW; x += step) {
        const i = (y * sampleW + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 30) { // Only sample visible pixels
          particles.push({
            nx: x / sampleW,
            ny: y / sampleH,
            x: 0,
            y: 0,
            originX: 0,
            originY: 0,
            vx: 0,
            vy: 0,
            r, g, b, a,
            size: Math.random() * 1.4 + 0.9,
            glow: 0
          });
        }
      }
    }
  }

  function resizeCanvas() {
    const parentRect = canvas.parentElement.getBoundingClientRect();
    w = parentRect.width;
    h = parentRect.height;
    canvas.width = w;
    canvas.height = h;

    // Update coordinates
    particles.forEach(p => {
      const tx = p.nx * w;
      const ty = p.ny * h;
      p.originX = tx;
      p.originY = ty;
      
      // If first resize, place particles at their origin
      if (p.x === 0 && p.y === 0) {
        p.x = tx + (Math.random() - 0.5) * w;
        p.y = ty + (Math.random() - 0.5) * h;
      }
    });
  }

  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas();
    }, 100);
  }

  // Mouse / Touch listeners
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isHovering = true;
  });

  canvas.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
    isHovering = false;
  });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left;
      mouseY = e.touches[0].clientY - rect.top;
      isHovering = true;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    mouseX = -9999;
    mouseY = -9999;
    isHovering = false;
  });

  function tick() {
    ctx.clearRect(0, 0, w, h);

    const len = particles.length;
    for (let i = 0; i < len; i++) {
      const p = particles[i];

      // Mouse interactive force
      let dx = p.x - mouseX;
      let dy = p.y - mouseY;
      let distSq = dx * dx + dy * dy;
      let dist = Math.sqrt(distSq);

      if (dist < activeRadius) {
        const force = (activeRadius - dist) / activeRadius;
        const angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force * pushStrength;
        p.vy += Math.sin(angle) * force * pushStrength;
        p.glow = Math.min(p.glow + 0.12, 1.0);
      }

      // Spring pull to origin
      const originDx = p.originX - p.x;
      const originDy = p.originY - p.y;
      p.vx += originDx * springStiffness;
      p.vy += originDy * springStiffness;

      // Vibranium sand continuous cymatic vibration
      const curJitter = baseJitter + p.glow * baseJitter * 4.0;
      p.vx += (Math.random() - 0.5) * curJitter;
      p.vy += (Math.random() - 0.5) * curJitter;

      // Physics update
      p.vx *= friction;
      p.vy *= friction;
      p.x += p.vx;
      p.y += p.vy;

      // Decay glow
      p.glow *= 0.94;

      // Render particle with dynamic color interpolation (blend to lime-green accent)
      const curR = Math.round(p.r + (178 - p.r) * p.glow);
      const curG = Math.round(p.g + (255 - p.g) * p.glow);
      const curB = Math.round(p.b + (89 - p.b) * p.glow);

      ctx.fillStyle = `rgba(${curR}, ${curG}, ${curB}, ${p.a / 255})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    animationFrameId = requestAnimationFrame(tick);
  }
});
