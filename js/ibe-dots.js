// IBE MOTION · golvend stippenveld met (optioneel) de leeuw erin. Zelfde doek als in de opening.
// IBEDots(canvas, { theme: 'dark' | 'light', lion: { x: 0.72, y: 0.52, size: 0.78 } | null, gap: 16 })
// lion.x/y zijn posities als fractie van het canvas, size is de hoogte van de leeuw als fractie van de canvashoogte.
(function () {
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const THEMES = {
    dark: { base: [210, 64, 76], deep: [92, 22, 30], lion: [216, 195, 165], hi: [255, 236, 228], a0: 0.14, a1: 0.42 },
    light: { base: [210, 64, 76], deep: [176, 168, 156], lion: [17, 19, 26], hi: [210, 64, 76], a0: 0.12, a1: 0.38 },
  };

  function IBEDots(canvas, opt) {
    opt = Object.assign({ theme: 'dark', lion: null, gap: 0 }, opt || {});
    const th = THEMES[opt.theme] || THEMES.dark;
    const ctx = canvas.getContext('2d');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, gap = 16, dots = [], mask = null, mx = -1e4, my = -1e4, raf = 0, visible = true, t0 = performance.now();

    function build() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gap = opt.gap || Math.max(12, Math.round(Math.min(W, H) / 46));
      const cols = Math.ceil(W / gap) + 1, rows = Math.ceil(H / gap) + 1;
      let px = null, lw = 0, lh = 0, lx = 0, ly = 0;
      if (mask && opt.lion) {
        const size = H * opt.lion.size, ar = mask.width / mask.height;
        lh = size; lw = size * ar;
        lx = W * opt.lion.x - lw / 2; ly = H * opt.lion.y - lh / 2;
        const off = document.createElement('canvas'); off.width = cols; off.height = rows;
        const o = off.getContext('2d');
        o.drawImage(mask, lx / gap, ly / gap, lw / gap, lh / gap);
        try { px = o.getImageData(0, 0, cols, rows).data; } catch (e) { px = null; }
      }
      dots = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        let b = 0;
        if (px) { const k = (j * cols + i) * 4; b = (px[k] + px[k + 1] + px[k + 2]) / 765; b = b > 0.2 ? b : 0; }
        dots.push({ x: i * gap, y: j * gap, b, s: Math.random() });
      }
    }

    function draw(now) {
      const time = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        const z = Math.sin(d.x * 0.011 + time * 0.9) * Math.cos(d.y * 0.015 - time * 0.6);
        const lift = (z + 1) / 2;
        const dist = Math.hypot(d.x - mx, d.y - my), near = clamp(1 - dist / 160);
        const y = d.y - z * gap * 0.3;
        let r, a, c;
        if (d.b) {
          r = gap * (0.17 + d.b * 0.16) * (1 + near * 0.35);
          a = 0.55 + lift * 0.45;
          c = lift > 0.78 ? th.hi : th.lion;
          if (near > 0.3) c = th.base;
        } else {
          r = gap * (0.07 + lift * 0.07) * (1 + near * 0.9);
          a = th.a0 + lift * (th.a1 - th.a0) + near * 0.4;
          const k = lift;
          c = [0, 1, 2].map((n) => Math.round(th.deep[n] + (th.base[n] - th.deep[n]) * k));
        }
        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.beginPath(); ctx.arc(d.x, y, r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) { if (visible) draw(now); raf = requestAnimationFrame(loop); }

    function start() {
      build();
      draw(t0 + 1800); // altijd meteen een beeld, ook buiten beeld
      if (!still) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    }
    if (opt.lion && window.IBE_LION_MASK) {
      mask = new Image(); mask.onload = start; mask.onerror = () => { mask = null; start(); }; mask.src = window.IBE_LION_MASK;
    } else start();

    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (still) draw(t0 + 1800); }, 150); });
    canvas.parentElement.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    canvas.parentElement.addEventListener('pointerleave', () => { mx = my = -1e4; });
    if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(canvas);
  }

  window.IBEDots = IBEDots;
})();
