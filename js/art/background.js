// 背景與地形。吉卜力式多層視差：遠山 → 遠樹 → 近樹，加上斜射光與漂浮光點。
// 各層預先畫到離屏 Canvas，遊戲中只做貼圖。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const TW = 1600; // 背景層的循環寬度

  const THEMES = {
    forestMorning: {
      sky: ['#a9dcff', '#e9f6ff', '#fff3d2'],
      layers: [
        { type: 'hills', f: 0.06, color: '#bcdcc0', base: 0.62, amp: 60 },
        { type: 'trees', f: 0.18, colors: ['#9cc58a', '#8dba7c'], trunk: '#8a7560', base: 0.72, n: 9, size: [70, 110], alpha: 0.9 },
        { type: 'trees', f: 0.38, colors: ['#6fa85a', '#5f9a4c', '#78b062'], trunk: '#6b4a35', base: 0.86, n: 7, size: [90, 140] },
      ],
      beams: 0.18,
      motes: 'rgba(255,250,200,0.8)',
      plat: { top: '#7bbf4a', topHi: '#a6db6a', body: '#9a6a42', shade: '#7a5033', edge: '#5a3a26', deco: 'flowers' },
    },
    forestMushroom: {
      sky: ['#b8e0f0', '#e8f5e6', '#fff0d8'],
      layers: [
        { type: 'hills', f: 0.06, color: '#c3dcc4', base: 0.6, amp: 50 },
        { type: 'mushrooms', f: 0.2, colors: ['#f2a36a', '#e88a8a', '#f5c26b'], stem: '#f3e3c8', base: 0.78, n: 7, size: [60, 120], alpha: 0.85 },
        { type: 'trees', f: 0.4, colors: ['#6fa85a', '#5f9a4c'], trunk: '#6b4a35', base: 0.88, n: 6, size: [90, 150] },
      ],
      beams: 0.14,
      motes: 'rgba(255,220,170,0.8)',
      plat: { top: '#7bbf4a', topHi: '#a6db6a', body: '#9a6a42', shade: '#7a5033', edge: '#5a3a26', deco: 'mushrooms' },
    },
    forestDeep: {
      sky: ['#5f8f7a', '#a9c9a0', '#e8e2b0'],
      layers: [
        { type: 'trees', f: 0.08, colors: ['#6c917a', '#5f8570'], trunk: '#4f6a5a', base: 0.7, n: 10, size: [80, 130], alpha: 0.8 },
        { type: 'trees', f: 0.22, colors: ['#4f7d52', '#46724a'], trunk: '#4a3a2c', base: 0.8, n: 8, size: [110, 170] },
        { type: 'trees', f: 0.42, colors: ['#3d6b40', '#346038'], trunk: '#3a2a1e', base: 0.95, n: 6, size: [140, 200] },
      ],
      beams: 0.32,
      motes: 'rgba(230,255,190,0.9)',
      plat: { top: '#5fa843', topHi: '#86c95c', body: '#83573a', shade: '#66422c', edge: '#4a2e1f', deco: 'ferns' },
    },
    rootCave: {
      sky: ['#1d2a2c', '#2c3e38', '#3f4a36'],
      layers: [
        { type: 'caveWall', f: 0.1, color: '#34443a', base: 0.3 },
        { type: 'roots', f: 0.25, color: '#4a3a2a', n: 14 },
        { type: 'glow', f: 0.4, colors: ['#7df0d0', '#b6f07a', '#8fc8ff'], n: 26 },
      ],
      beams: 0.1,
      motes: 'rgba(150,255,210,0.9)',
      dark: 0.18,
      plat: { top: '#6a8a45', topHi: '#88a95a', body: '#6e4a30', shade: '#553823', edge: '#3a2416', deco: 'glowshrooms' },
    },
    queenHall: {
      sky: ['#3a2440', '#6a3e62', '#b0708a'],
      layers: [
        { type: 'hills', f: 0.05, color: '#5a3656', base: 0.55, amp: 40 },
        { type: 'mushrooms', f: 0.2, colors: ['#9a4f86', '#b85a8e', '#7e4a8a'], stem: '#e8d4dc', base: 0.82, n: 6, size: [110, 180], alpha: 0.9 },
        { type: 'lanterns', f: 0.35, n: 10 },
      ],
      beams: 0.12,
      motes: 'rgba(255,190,230,0.9)',
      plat: { top: '#b98ac0', topHi: '#d7aee0', body: '#6e5070', shade: '#56405a', edge: '#3a2640', deco: 'gems' },
    },
  };

  // ── 背景層繪製 ──
  function wrapDraw(w, x, draw) {
    draw(x);
    if (x < 200) draw(x + w);
    if (x > w - 200) draw(x - w);
  }

  const LAYER = {
    hills(ctx, L, rnd, h) {
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      const p1 = rnd() * 6;
      const p2 = rnd() * 6;
      for (let x = 0; x <= TW; x += 10) {
        const y = h * L.base - Math.sin((x / TW) * Math.PI * 2 * 2 + p1) * L.amp - Math.sin((x / TW) * Math.PI * 2 * 5 + p2) * L.amp * 0.35;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(TW, h);
      ctx.closePath();
      ctx.fill();
    },
    trees(ctx, L, rnd, h) {
      ctx.globalAlpha = L.alpha || 1;
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.6;
        const s = L.size[0] + rnd() * (L.size[1] - L.size[0]);
        const col = L.colors[Math.floor(rnd() * L.colors.length)];
        const baseY = h * L.base + rnd() * 30;
        const seed = rnd();
        wrapDraw(TW, x, (xx) => {
          // 樹幹
          ctx.fillStyle = L.trunk;
          ctx.beginPath();
          ctx.moveTo(xx - s * 0.1, h);
          ctx.quadraticCurveTo(xx - s * 0.06, baseY - s * 0.4, xx - s * 0.05, baseY - s * 0.9);
          ctx.lineTo(xx + s * 0.05, baseY - s * 0.9);
          ctx.quadraticCurveTo(xx + s * 0.06, baseY - s * 0.4, xx + s * 0.12, h);
          ctx.fill();
          // 樹冠：一簇圓
          const r2 = U.seeded(Math.floor(seed * 1e6));
          for (let k = 0; k < 7; k++) {
            const cx = xx + (r2() - 0.5) * s * 0.9;
            const cy = baseY - s * 0.95 - r2() * s * 0.55;
            const rr = s * (0.28 + r2() * 0.18);
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(cx, cy, rr, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,220,0.12)';
            ctx.beginPath();
            ctx.arc(cx - rr * 0.25, cy - rr * 0.3, rr * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      ctx.globalAlpha = 1;
    },
    mushrooms(ctx, L, rnd, h) {
      ctx.globalAlpha = L.alpha || 1;
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.5;
        const s = L.size[0] + rnd() * (L.size[1] - L.size[0]);
        const col = L.colors[Math.floor(rnd() * L.colors.length)];
        const baseY = h * L.base + rnd() * 30;
        const lean = (rnd() - 0.5) * 0.3;
        wrapDraw(TW, x, (xx) => {
          ctx.fillStyle = L.stem;
          ctx.beginPath();
          ctx.moveTo(xx - s * 0.12, h);
          ctx.quadraticCurveTo(xx - s * 0.1 + lean * s, baseY - s * 0.5, xx - s * 0.08 + lean * s * 1.4, baseY - s);
          ctx.lineTo(xx + s * 0.08 + lean * s * 1.4, baseY - s);
          ctx.quadraticCurveTo(xx + s * 0.1 + lean * s, baseY - s * 0.5, xx + s * 0.14, h);
          ctx.fill();
          const cx = xx + lean * s * 1.4;
          const cy = baseY - s;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(cx - s * 0.55, cy + 4);
          ctx.bezierCurveTo(cx - s * 0.55, cy - s * 0.6, cx + s * 0.55, cy - s * 0.6, cx + s * 0.55, cy + 4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          for (let k = 0; k < 4; k++) {
            ctx.beginPath();
            ctx.ellipse(cx + (k - 1.5) * s * 0.22, cy - s * 0.18 - (k % 2) * s * 0.12, s * 0.06, s * 0.04, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      ctx.globalAlpha = 1;
    },
    caveWall(ctx, L, rnd, h) {
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= TW; x += 20) ctx.lineTo(x, h * 0.12 + Math.sin(x * 0.01 + 1) * 20 + Math.sin(x * 0.037) * 10);
      ctx.lineTo(TW, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 20) ctx.lineTo(x, h * 0.78 + Math.sin(x * 0.008 + 2) * 30 + Math.sin(x * 0.03) * 12);
      ctx.lineTo(TW, h);
      ctx.closePath();
      ctx.fill();
    },
    roots(ctx, L, rnd, h) {
      ctx.strokeStyle = L.color;
      ctx.lineCap = 'round';
      for (let i = 0; i < L.n; i++) {
        const x = rnd() * TW;
        const len = h * (0.25 + rnd() * 0.5);
        const w = 6 + rnd() * 16;
        wrapDraw(TW, x, (xx) => {
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(xx, -10);
          ctx.bezierCurveTo(xx + 40, len * 0.3, xx - 40, len * 0.6, xx + 10, len);
          ctx.stroke();
          ctx.lineWidth = w * 0.4;
          ctx.beginPath();
          ctx.moveTo(xx + 5, len * 0.4);
          ctx.quadraticCurveTo(xx + 40, len * 0.55, xx + 30, len * 0.75);
          ctx.stroke();
        });
      }
    },
    glow(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = rnd() * TW;
        const y = h * (0.2 + rnd() * 0.65);
        const r = 3 + rnd() * 5;
        const col = L.colors[Math.floor(rnd() * L.colors.length)];
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    lanterns(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * 100;
        const y = h * (0.15 + rnd() * 0.3);
        ctx.strokeStyle = 'rgba(40,20,40,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, y - 14);
        ctx.stroke();
        const g = ctx.createRadialGradient(x, y, 2, x, y, 50);
        g.addColorStop(0, 'rgba(255,220,150,0.6)');
        g.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd98a';
        ctx.beginPath();
        ctx.ellipse(x, y, 9, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };

  const layerCache = {};
  function buildLayers(themeId) {
    if (layerCache[themeId]) return layerCache[themeId];
    const th = THEMES[themeId];
    const out = th.layers.map((L, i) => {
      const c = document.createElement('canvas');
      c.width = TW;
      c.height = G.H;
      const ctx = c.getContext('2d');
      const rnd = U.seeded(1000 + i * 77 + themeId.length * 13);
      LAYER[L.type](ctx, L, rnd, G.H);
      return { canvas: c, f: L.f };
    });
    layerCache[themeId] = out;
    return out;
  }

  // ── 地圖準備：預先算好平台上的裝飾 ──
  A.prepareMap = function (map) {
    const th = THEMES[map.theme] || THEMES.forestMorning;
    map._theme = th;
    map._layers = buildLayers(map.theme);
    const rnd = U.seeded(map.w * 7 + map.h);
    map._deco = map.platforms.map((p) => {
      const list = [];
      const len = p[1] - p[0];
      const n = Math.floor(len / 55);
      for (let i = 0; i < n; i++) {
        list.push({ x: p[0] + 20 + rnd() * (len - 40), k: rnd(), s: 0.7 + rnd() * 0.6 });
      }
      return list;
    });
    // 地面擺設：依主題挑選（樹樁、倒木、灌木、蘑菇叢、石頭、花叢、水晶、發光菇）
    const propSets = {
      forestMorning: ['stump', 'bush', 'log', 'flowers', 'rock', 'bush'],
      forestMushroom: ['mushCluster', 'bigMush', 'bush', 'stump', 'flowers', 'mushCluster'],
      forestDeep: ['fern', 'log', 'rock', 'stump', 'fern', 'bush'],
      rootCave: ['crystal', 'glowCluster', 'rock', 'root', 'crystal'],
      queenHall: ['crystal', 'bigMush', 'mushCluster'],
    };
    const set = propSets[map.theme] || propSets.forestMorning;
    const g = map.platforms[0];
    const avoid = [].concat((map.portals || []).map((p) => p.x), (map.npcs || []).map((n) => n.x), (map.signs || []).map((s) => s.x), (map.springs || []).map((s) => s.x), map.camp ? [map.camp.x1 - 60, (map.camp.x1 + map.camp.x2) / 2, map.camp.x2 + 60] : []);
    map._props = [];
    for (let x = g[0] + 140; x < g[1] - 100; x += 180 + rnd() * 160) {
      if (avoid.some((a) => Math.abs(a - x) < 90)) continue;
      if (map.camp && x > map.camp.x1 - 80 && x < map.camp.x2 + 80) continue;
      map._props.push({ kind: set[Math.floor(rnd() * set.length)], x, y: g[2], s: 0.8 + rnd() * 0.5, flip: rnd() < 0.5 ? -1 : 1 });
    }
    // 平台底下垂著的藤蔓／樹根
    map._hang = [];
    map.platforms.forEach((p, i) => {
      if (i === 0) return;
      const n = Math.floor((p[1] - p[0]) / 140);
      for (let k = 0; k < n; k++) map._hang.push({ x: p[0] + 30 + rnd() * (p[1] - p[0] - 60), y: p[2] + 20, len: 20 + rnd() * 40, seed: rnd() * 6 });
    });
    // 前景的高草（畫在角色前面）
    map._fore = [];
    for (let x = g[0] + 60; x < g[1]; x += 220 + rnd() * 260) map._fore.push({ x, s: 0.8 + rnd() * 0.6 });
    map._motes = [];
    for (let i = 0; i < 40; i++) {
      map._motes.push({ x: rnd() * G.W, y: rnd() * G.H, s: 1 + rnd() * 2.5, p: rnd() * 6, v: 6 + rnd() * 14 });
    }
  };

  A.drawBackground = function (ctx, map, cam, t) {
    const th = map._theme;
    const g = ctx.createLinearGradient(0, 0, 0, G.H);
    g.addColorStop(0, th.sky[0]);
    g.addColorStop(0.55, th.sky[1]);
    g.addColorStop(1, th.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, G.W, G.H);

    const maxY = Math.max(0, map.h - G.H);
    for (const L of map._layers) {
      const ox = -((cam.x * L.f) % TW);
      const oy = (maxY - cam.y) * L.f * 0.7;
      for (let x = ox; x < G.W; x += TW) ctx.drawImage(L.canvas, x, oy);
    }

    // 斜射光
    if (th.beams) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const bx = ((i * 360 - cam.x * 0.3) % (G.W + 600) + G.W + 600) % (G.W + 600) - 300;
        const a = th.beams * (0.6 + 0.4 * Math.sin(t * 0.5 + i * 1.7));
        const gr = ctx.createLinearGradient(bx, 0, bx + 220, G.H);
        gr.addColorStop(0, 'rgba(255,248,210,' + a.toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(255,248,210,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx + 90, 0);
        ctx.lineTo(bx + 330, G.H);
        ctx.lineTo(bx + 180, G.H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // 前景：漂浮光點與暗角（畫在世界之後）
  // 地面擺設（畫在角色後面）
  A.drawProps = function (ctx, map, cam, t) {
    const x0 = cam.x - 120;
    const x1 = cam.x + G.W + 120;
    const leafy = map.theme === 'rootCave' ? '#4a6a3a' : '#5f9f3a';
    for (const h of map._hang) {
      if (h.x < x0 || h.x > x1) continue;
      const sw = Math.sin(t * 1.5 + h.seed) * 3;
      ctx.strokeStyle = map.theme === 'rootCave' ? '#5a3e28' : '#4f8a34';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 4);
      ctx.quadraticCurveTo(h.x + sw, h.y + h.len * 0.5, h.x + sw * 1.5, h.y + h.len);
      ctx.stroke();
      ctx.fillStyle = leafy;
      ctx.beginPath();
      ctx.ellipse(h.x + sw * 1.5, h.y + h.len, 4, 2.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of map._props) {
      if (p.x < x0 || p.x > x1) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.s * p.flip, p.s);
      PROP[p.kind](ctx, t, p);
      ctx.restore();
    }
  };

  // 前景高草（畫在角色前面，營造深度）
  A.drawForeground = function (ctx, map, cam, t) {
    const y = map.platforms[0][2];
    const col = map.theme === 'rootCave' ? ['#3f5a30', '#4a6a36'] : map.theme === 'queenHall' ? ['#8a5a8a', '#a070a0'] : ['#4f9a32', '#6ab846'];
    for (const f of map._fore) {
      if (f.x < cam.x - 60 || f.x > cam.x + G.W + 60) continue;
      for (let k = -3; k <= 3; k++) {
        const sw = Math.sin(t * 2 + f.x * 0.01 + k) * 3;
        ctx.fillStyle = col[(k + 3) % 2];
        ctx.beginPath();
        ctx.moveTo(f.x + k * 5 - 4, y + 12);
        ctx.quadraticCurveTo(f.x + k * 6 + sw, y - 20 * f.s - Math.abs(k) * -3, f.x + k * 7 + sw * 1.5, y - 26 * f.s + Math.abs(k) * 4);
        ctx.quadraticCurveTo(f.x + k * 6 + 2, y - 8, f.x + k * 5 + 4, y + 12);
        ctx.fill();
      }
    }
  };

  const PROP = {
    stump(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -16, -24, 32, 26, 5), '#8b5e3c', '#6b4428', { cel: [3, 2], lw: 2.5 });
      A.ellipse(ctx, 0, -24, 16, 5, '#e3be86', '#c9a068', { hl: false, lw: 2.2 });
      A.ellipse(ctx, 0, -24, 8, 2.5, '#c9a068', null, { noStroke: true, hl: false });
    },
    log(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -44, -18, 80, 18, 9), '#8b5e3c', '#6b4428', { cel: [2, 2], lw: 2.5 });
      A.ellipse(ctx, 36, -9, 6, 9, '#e3be86', '#c9a068', { hl: false, lw: 2.2 });
      A.ellipse(ctx, -20, -18, 8, 4, '#79b04a', null, { lw: 1.8, hl: false });
    },
    bush(ctx) {
      [[-14, -12, 14], [4, -18, 17], [18, -10, 12]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r * 0.85, '#6aae4a', '#4f8a36', { cel: [3, 3], hl: false, lw: 2.3 }));
      A.ellipse(ctx, -6, -20, 2.5, 2.5, '#ff6a6a', null, { noStroke: true, hl: false });
      A.ellipse(ctx, 12, -14, 2.5, 2.5, '#ff6a6a', null, { noStroke: true, hl: false });
    },
    flowers(ctx, t) {
      for (let i = 0; i < 5; i++) {
        const x = -20 + i * 10;
        const h = 10 + (i % 3) * 5;
        ctx.strokeStyle = '#4f8a34';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + Math.sin(t * 2 + i) * 2, -h);
        ctx.stroke();
        A.ellipse(ctx, x + Math.sin(t * 2 + i) * 2, -h, 3.5, 3.5, ['#ff9fbf', '#ffe36b', '#b8a0ff'][i % 3], null, { lw: 1.4, hl: false });
      }
    },
    rock(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-20, 0); c.lineTo(-16, -14); c.lineTo(-2, -20); c.lineTo(14, -14); c.lineTo(20, 0); c.closePath(); }, '#a8a498', '#7e7a70', { cel: [3, 3], lw: 2.3 });
      A.ellipse(ctx, -6, -16, 6, 3, '#79b04a', null, { lw: 1.6, hl: false });
    },
    mushCluster(ctx) {
      [[-10, 1, '#f28c38'], [4, 1.3, '#e0513a'], [14, 0.8, '#f5c26b']].forEach(([x, k, col]) => {
        A.shape(ctx, (c) => A.roundRect(c, x - 2.5 * k, -12 * k, 5 * k, 12 * k, 2), '#fff0d6', null, { lw: 1.8, hl: false });
        A.shape(ctx, (c) => c.ellipse(x, -12 * k, 9 * k, 7 * k, 0, Math.PI, 0), col, null, { lw: 1.8, hl: false });
      });
    },
    bigMush(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -8, -46, 16, 46, 6), '#fff0d6', '#e8cfa6', { cel: [3, 2], lw: 2.3 });
      A.shape(ctx, (c) => { c.moveTo(-34, -42); c.bezierCurveTo(-34, -76, 34, -76, 34, -42); c.quadraticCurveTo(0, -36, -34, -42); c.closePath(); }, '#c2408f', '#982f70', { cel: [4, 4], lw: 2.5 });
      [[-14, -56, 5], [10, -62, 6]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r * 0.8, '#fff6fb', null, { lw: 1.6, hl: false }));
    },
    fern(ctx, t) {
      ctx.strokeStyle = '#3f7f2a';
      ctx.lineWidth = 3;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(k * 10, -30, k * 18 + Math.sin(t * 1.5 + k) * 2, -22 + Math.abs(k) * 6);
        ctx.stroke();
      }
    },
    crystal(ctx, t) {
      const glow = 0.5 + Math.sin(t * 2) * 0.2;
      const g = ctx.createRadialGradient(0, -14, 0, 0, -14, 34);
      g.addColorStop(0, 'rgba(160,255,230,' + glow.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(160,255,230,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -14, 34, 0, Math.PI * 2);
      ctx.fill();
      [[-8, 20, -0.3], [4, 30, 0.1], [12, 16, 0.4]].forEach(([x, h, r]) => {
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-5, 0); c.lineTo(-5, -h * 0.7); c.lineTo(0, -h); c.lineTo(5, -h * 0.7); c.lineTo(5, 0); c.closePath(); }, '#9ff0e0', '#5ec8b8', { cel: [2, 0], lw: 2 });
        ctx.restore();
      });
    },
    glowCluster(ctx, t) {
      [[-10, 1], [2, 1.4], [12, 0.9]].forEach(([x, k]) => {
        const g = ctx.createRadialGradient(x, -10 * k, 0, x, -10 * k, 18 * k);
        g.addColorStop(0, 'rgba(140,255,210,0.5)');
        g.addColorStop(1, 'rgba(140,255,210,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, -10 * k, 18 * k, 0, Math.PI * 2);
        ctx.fill();
        A.shape(ctx, (c) => A.roundRect(c, x - 2 * k, -10 * k, 4 * k, 10 * k, 2), '#d8fff0', null, { lw: 1.6, hl: false });
        A.shape(ctx, (c) => c.ellipse(x, -10 * k, 7 * k, 5 * k, 0, Math.PI, 0), '#7df0d0', null, { lw: 1.6, hl: false });
      });
    },
    root(ctx) {
      ctx.strokeStyle = '#4e3420';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-40, 4);
      ctx.bezierCurveTo(-20, -30, 10, -20, 30, 4);
      ctx.stroke();
      ctx.strokeStyle = '#6a4a30';
      ctx.lineWidth = 3;
      ctx.stroke();
    },
  };

  A.drawAtmosphere = function (ctx, map, cam, t) {
    const th = map._theme;
    // 森林裡緩緩飄落的葉子
    if (map.theme !== 'rootCave' && map.theme !== 'queenHall') {
      for (let i = 0; i < 8; i++) {
        const sp = 18 + (i % 3) * 8;
        const x = ((i * 173 + t * 12 - cam.x * 0.8) % (G.W + 100) + G.W + 100) % (G.W + 100) - 50 + Math.sin(t + i) * 30;
        const y = ((i * 97 + t * sp) % (G.H + 60)) - 30;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 1.5 + i);
        ctx.fillStyle = ['#e8a040', '#9fcf5a', '#f0c060'][i % 3];
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = th.motes;
    for (const m of map._motes) {
      const x = ((m.x - cam.x * 0.6 + Math.sin(t * 0.7 + m.p) * 20) % G.W + G.W) % G.W;
      const y = ((m.y - cam.y * 0.6 - t * m.v) % G.H + G.H) % G.H;
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + m.p);
      ctx.beginPath();
      ctx.arc(x, y, m.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (th.dark) {
      const g = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.35, G.W / 2, G.H / 2, G.H * 0.9);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,' + (th.dark * 2).toFixed(2) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, G.W, G.H);
    }
  };

  // ── 地形 ──
  A.drawPlatforms = function (ctx, map, cam) {
    const P = map._theme.plat;
    const x0 = cam.x - 50;
    const x1 = cam.x + G.W + 50;
    map.platforms.forEach((p, i) => {
      if (p[1] < x0 || p[0] > x1) return;
      if (p[2] < cam.y - 40 || p[2] > cam.y + G.H + 60) return;
      const isGround = i === 0;
      const left = p[0];
      const right = p[1];
      const y = p[2];
      const bodyH = isGround ? map.h - y + 200 : 26;

      // 本體
      ctx.fillStyle = P.body;
      ctx.beginPath();
      if (isGround) ctx.rect(left, y, right - left, bodyH);
      else A.roundRect(ctx, left, y, right - left, bodyH, 12);
      ctx.fill();
      ctx.fillStyle = P.shade;
      if (isGround) ctx.fillRect(left, y + 30, right - left, bodyH);
      else {
        ctx.beginPath();
        A.roundRect(ctx, left + 3, y + 14, right - left - 6, bodyH - 14, 10);
        ctx.fill();
      }
      if (isGround) {
        // 地層裡的小石頭
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        const r = U.seeded(i * 31 + 7);
        for (let k = 0; k < (right - left) / 80; k++) {
          const sx = left + r() * (right - left);
          if (sx < x0 || sx > x1) continue;
          ctx.beginPath();
          ctx.ellipse(sx, y + 40 + r() * (bodyH - 50), 8 + r() * 10, 5 + r() * 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.strokeStyle = P.edge;
        ctx.lineWidth = 3;
        ctx.beginPath();
        A.roundRect(ctx, left, y, right - left, bodyH, 12);
        ctx.stroke();
      }
      // 草皮
      ctx.fillStyle = P.top;
      ctx.beginPath();
      A.roundRect(ctx, left - (isGround ? 0 : 4), y - 6, right - left + (isGround ? 0 : 8), 14, 7);
      ctx.fill();
      ctx.fillStyle = P.topHi;
      ctx.fillRect(left + (isGround ? 0 : 6), y - 5, right - left - (isGround ? 0 : 12), 4);
      // 草皮下緣的鋸齒
      ctx.fillStyle = P.top;
      for (let x = left + 6; x < right - 6; x += 14) {
        if (x < x0 || x > x1) continue;
        ctx.beginPath();
        ctx.moveTo(x, y + 7);
        ctx.lineTo(x + 7, y + 13);
        ctx.lineTo(x + 14, y + 7);
        ctx.fill();
      }
      // 裝飾
      const deco = map._deco[i];
      for (const d of deco) {
        if (d.x < x0 || d.x > x1) continue;
        drawDeco(ctx, P.deco, d, y);
      }
    });
  };

  function drawDeco(ctx, kind, d, y) {
    const x = d.x;
    if (d.k < 0.45) {
      // 草叢
      ctx.fillStyle = kind === 'gems' ? '#caa0d6' : '#5f9f3a';
      ctx.beginPath();
      ctx.moveTo(x - 8 * d.s, y - 4);
      ctx.quadraticCurveTo(x - 6 * d.s, y - 16 * d.s, x - 2, y - 4);
      ctx.quadraticCurveTo(x, y - 20 * d.s, x + 3, y - 4);
      ctx.quadraticCurveTo(x + 7 * d.s, y - 14 * d.s, x + 9 * d.s, y - 4);
      ctx.fill();
      return;
    }
    if (d.k > 0.8) return;
    if (kind === 'flowers') {
      ctx.strokeStyle = '#4f8f34';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y - 14 * d.s);
      ctx.stroke();
      ctx.fillStyle = d.k > 0.62 ? '#ffe36b' : '#ff9fbf';
      for (let a = 0; a < 5; a++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(a * 1.26) * 3.5, y - 14 * d.s + Math.sin(a * 1.26) * 3.5, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath();
      ctx.arc(x, y - 14 * d.s, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'mushrooms' || kind === 'glowshrooms') {
      const glow = kind === 'glowshrooms';
      if (glow) {
        const g = ctx.createRadialGradient(x, y - 10, 1, x, y - 10, 22);
        g.addColorStop(0, 'rgba(140,255,210,0.5)');
        g.addColorStop(1, 'rgba(140,255,210,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y - 10, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = glow ? '#d8fff0' : '#fff0d6';
      ctx.fillRect(x - 2, y - 11 * d.s, 4, 8 * d.s);
      ctx.fillStyle = glow ? '#7df0d0' : d.k > 0.62 ? '#e05a3a' : '#f28c38';
      ctx.beginPath();
      ctx.ellipse(x, y - 11 * d.s, 8 * d.s, 6 * d.s, 0, Math.PI, 0);
      ctx.fill();
    } else if (kind === 'ferns') {
      ctx.strokeStyle = '#3f7f2a';
      ctx.lineWidth = 2;
      for (let s = -1; s <= 1; s += 2) {
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.quadraticCurveTo(x + s * 10 * d.s, y - 22 * d.s, x + s * 20 * d.s, y - 14 * d.s);
        ctx.stroke();
      }
    } else if (kind === 'gems') {
      ctx.fillStyle = d.k > 0.62 ? '#ffd35a' : '#ff9fd0';
      ctx.beginPath();
      ctx.moveTo(x, y - 16 * d.s);
      ctx.lineTo(x + 5, y - 6);
      ctx.lineTo(x, y - 2);
      ctx.lineTo(x - 5, y - 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  A.drawRope = function (ctx, r, t) {
    const x = r[0];
    const top = r[1] - 8;
    const bottom = r[2] - 34;
    if (r[3] === 'ladder') {
      ctx.strokeStyle = '#6b4428';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 10, top);
      ctx.lineTo(x - 10, bottom);
      ctx.moveTo(x + 10, top);
      ctx.lineTo(x + 10, bottom);
      for (let y = top + 10; y < bottom; y += 16) {
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
      }
      ctx.stroke();
      return;
    }
    ctx.strokeStyle = '#3f6b2a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let y = top; y <= bottom; y += 6) {
      const xx = x + Math.sin(y * 0.08) * 2.5;
      y === top ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#6fae45';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#6fbf4a';
    for (let y = top + 10; y < bottom; y += 22) {
      const s = (y / 22) % 2 < 1 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(x + s * 6, y, 6, 3, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  A.THEMES = THEMES;
})();
