/* =========================================================
   H2Li Energy Grid — Main JavaScript
   Signal visualiser, navigation, and scroll interactions
   ========================================================= */

(function () {
  "use strict";

  // ----- Utility -----
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

  /* =========================================================
     NAVIGATION — burger + scroll behaviour
     ========================================================= */
  const nav    = qs("#mainNav");
  const burger = qs("#navBurger");
  const links  = qs(".nav__links");

  if (burger && links) {
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    // Close menu when a link is clicked
    qsa("a", links).forEach(a => a.addEventListener("click", () => {
      links.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    }));
  }

  // Elevate nav on scroll
  window.addEventListener("scroll", () => {
    if (nav) nav.style.background = window.scrollY > 10
      ? "rgba(12,15,20,.97)"
      : "rgba(12,15,20,.85)";
  }, { passive: true });

  /* =========================================================
     HERO CANVAS — animated signal field
     ========================================================= */
  const heroCanvas = qs("#signalCanvas");
  if (heroCanvas) {
    const hCtx   = heroCanvas.getContext("2d");
    let   hW, hH, particles = [];
    const PARTICLE_COUNT = 80;

    function resizeHero() {
      hW = heroCanvas.width  = heroCanvas.offsetWidth;
      hH = heroCanvas.height = heroCanvas.offsetHeight;
    }

    function Particle() {
      this.reset();
    }
    Particle.prototype.reset = function () {
      this.x  = Math.random() * hW;
      this.y  = Math.random() * hH;
      this.vx = (Math.random() - 0.5) * 0.6;
      this.vy = (Math.random() - 0.5) * 0.6;
      this.r  = Math.random() * 2 + 0.5;
      this.alpha = Math.random() * 0.5 + 0.2;
      this.hue   = 190 + Math.random() * 40; // cyan-blue range
    };
    Particle.prototype.update = function () {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > hW || this.y < 0 || this.y > hH) this.reset();
    };

    function initParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = new Particle();
        particles.push(p);
      }
    }

    function drawHero(ts) {
      hCtx.clearRect(0, 0, hW, hH);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.3;
            hCtx.beginPath();
            hCtx.moveTo(particles[i].x, particles[i].y);
            hCtx.lineTo(particles[j].x, particles[j].y);
            hCtx.strokeStyle = `hsla(${particles[i].hue}, 85%, 65%, ${alpha})`;
            hCtx.lineWidth = 0.8;
            hCtx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        p.update();
        hCtx.beginPath();
        hCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        hCtx.fillStyle = `hsla(${p.hue}, 85%, 70%, ${p.alpha})`;
        hCtx.fill();
      });

      requestAnimationFrame(drawHero);
    }

    window.addEventListener("resize", () => { resizeHero(); initParticles(); }, { passive: true });
    resizeHero();
    initParticles();
    requestAnimationFrame(drawHero);
  }

  /* =========================================================
     WAVE CANVAS — signal waveform visualiser
     ========================================================= */
  const waveCanvas  = qs("#waveCanvas");
  const freqSlider  = qs("#freqSlider");
  const noiseSlider = qs("#noiseSlider");
  const freqVal     = qs("#freqVal");
  const noiseVal    = qs("#noiseVal");

  if (waveCanvas) {
    const wCtx = waveCanvas.getContext("2d");
    let   freq  = 42;
    let   noise = 0.35;
    let   t     = 0;

    // Seeded PRNG (mulberry32) for reproducible noise
    function mulberry32(seed) {
      return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        z = z + Math.imul(z ^ (z >>> 7), 61 | z) ^ z;
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
      };
    }

    function drawWave(timestamp) {
      const W = waveCanvas.width;
      const H = waveCanvas.height;
      const mid = H / 2;
      const amp = H * 0.35;
      const rng = mulberry32(Math.floor(timestamp / 50)); // refresh noise every 50 ms

      wCtx.clearRect(0, 0, W, H);

      // Grid lines
      wCtx.strokeStyle = "rgba(255,255,255,.04)";
      wCtx.lineWidth   = 1;
      for (let y = 0; y <= H; y += H / 4) {
        wCtx.beginPath(); wCtx.moveTo(0, y); wCtx.lineTo(W, y); wCtx.stroke();
      }
      wCtx.strokeStyle = "rgba(255,255,255,.03)";
      for (let x = 0; x <= W; x += W / 8) {
        wCtx.beginPath(); wCtx.moveTo(x, 0); wCtx.lineTo(x, H); wCtx.stroke();
      }

      // --- Input waveform (noisy water signal, cyan) ---
      wCtx.beginPath();
      for (let px = 0; px < W; px++) {
        const phase = (px / W) * Math.PI * 2 * (freq / 10) + t;
        const noiseAmp = noise * amp * (rng() * 2 - 1);
        const y = mid - (amp * 0.55 * Math.sin(phase) + noiseAmp);
        px === 0 ? wCtx.moveTo(px, y) : wCtx.lineTo(px, y);
      }
      wCtx.strokeStyle = "rgba(86,204,242,.75)";
      wCtx.lineWidth   = 1.5;
      wCtx.stroke();

      // --- Output waveform (Li-amplified, red, 6 dB gain = ×2) ---
      wCtx.beginPath();
      for (let px = 0; px < W; px++) {
        const phase = (px / W) * Math.PI * 2 * (freq / 10) + t;
        const noiseAmp = noise * amp * (rng() * 2 - 1) * 0.15; // noise reduced post-resonance
        const y = mid - (amp * 1.0 * Math.sin(phase) + noiseAmp);
        px === 0 ? wCtx.moveTo(px, y) : wCtx.lineTo(px, y);
      }
      wCtx.strokeStyle = "rgba(231,76,60,.85)";
      wCtx.lineWidth   = 2;
      wCtx.stroke();

      // --- Stored waveform (H2 lattice, green, smoothed) ---
      wCtx.beginPath();
      const storeAmp = amp * 0.45;
      for (let px = 0; px < W; px++) {
        const phase = (px / W) * Math.PI * 2 * (freq / 10) + t;
        const y = mid - storeAmp * Math.sin(phase);
        px === 0 ? wCtx.moveTo(px, y) : wCtx.lineTo(px, y);
      }
      wCtx.strokeStyle = "rgba(39,174,96,.7)";
      wCtx.lineWidth   = 1.5;
      wCtx.setLineDash([4, 6]);
      wCtx.stroke();
      wCtx.setLineDash([]);

      // Advance time
      t += 0.04 * (freq / 42);
      requestAnimationFrame(drawWave);
    }

    if (freqSlider) {
      freqSlider.addEventListener("input", () => {
        freq = Number(freqSlider.value);
        if (freqVal) freqVal.textContent = freq;
      });
    }
    if (noiseSlider) {
      noiseSlider.addEventListener("input", () => {
        noise = Number(noiseSlider.value);
        if (noiseVal) noiseVal.textContent = noise.toFixed(2);
      });
    }

    requestAnimationFrame(drawWave);
  }

  /* =========================================================
     AOS — minimal scroll-triggered fade-in
     ========================================================= */
  function initAOS() {
    const els = qsa("[data-aos]");
    if (!els.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const delay = Number(e.target.dataset.aosDelay || 0);
          setTimeout(() => e.target.classList.add("aos-animate"), delay);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    els.forEach(el => io.observe(el));
  }

  /* =========================================================
     STORAGE BARS — animate on scroll
     ========================================================= */
  function initBars() {
    const bars = qsa(".storage__bar-fill");
    if (!bars.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          // Width is already set inline; trigger reflow to animate
          const el = e.target;
          const w  = el.style.width;
          el.style.width = "0";
          requestAnimationFrame(() => { el.style.width = w; });
          io.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    bars.forEach(b => io.observe(b));
  }

  /* =========================================================
     INIT
     ========================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    initAOS();
    initBars();
  });
})();
