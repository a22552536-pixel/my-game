// 標題畫面、開場、進入遊戲。
(function () {
  'use strict';
  const U = G.util;
  const A = G.art;
  const OA = G.openArt;

  // ════════════════════════ 開場動畫 ════════════════════════
  // 八個鏡頭（G.data.story.intro 每頁一個 shot）。靜態的大圖層第一次用到前先畫進離屏畫布，
  // 之後每幀只是貼圖＋少量即時的光、葉子、粒子；粒子全部是「時間的函數」，沒有狀態，跳頁也不會亂。
  const PI2 = Math.PI * 2;
  const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const sm = (a, b, v) => {
    const x = cl((v - a) / (b - a));
    return x * x * (3 - 2 * x);
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  // 五片星楓葉（綠、藍、紅、霜白、金色心葉）
  const LEAVES = [
    { col: '#7ad86a', rgb: '122,216,106' },
    { col: '#5ab8ff', rgb: '90,184,255' },
    { col: '#ff7a3a', rgb: '255,122,58' },
    { col: '#dff4ff', rgb: '223,244,255' },
    { col: '#ffd35a', rgb: '255,211,90' },
  ];
  // 葉子在星楓樹上的位置（樹的原點＝樹幹底部，s = 1 時）
  const TREE_LEAVES = [[-190, -450], [196, -446], [-116, -352], [126, -356], [0, -548]];
  const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const BAR = 64; // 上下黑邊
  const FULL = { ox: -80, oy: -50, w: 1440, h: 830 }; // 全畫面圖層多留邊，鏡頭平移時不露底

  const IX = { k: 1, bk: 1, L: {}, bt: {}, snap: null, trans: null, cue: 0 };

  function newCv(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  const GLOW = {};
  function glowSpr(rgb) {
    if (GLOW[rgb]) return GLOW[rgb];
    const c = newCv(64, 64);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(' + rgb + ',1)');
    g.addColorStop(0.28, 'rgba(' + rgb + ',0.5)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return (GLOW[rgb] = c);
  }
  // 加亮的柔光（加法混色）
  function glow(ctx, x, y, r, rgb, a) {
    if (a <= 0.004) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= Math.min(1, a);
    ctx.drawImage(glowSpr(rgb), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  // 一般混色的柔光（天空的太陽暈）
  function haze(ctx, x, y, r, rgb, a) {
    if (a <= 0.004) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    ctx.drawImage(glowSpr(rgb), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  // 把畫好的角色變成純石頭：去掉所有彩度（腮紅、舌頭也一起），再蒙一層淡淡的石色
  function stoneify(tc, tint, amt) {
    const t2 = newCv(tc.width, tc.height);
    const g = t2.getContext('2d');
    g.drawImage(tc, 0, 0);
    g.globalCompositeOperation = 'saturation';
    g.fillStyle = '#808080';
    g.fillRect(0, 0, t2.width, t2.height);
    if (tint) {
      g.globalCompositeOperation = 'color';
      g.globalAlpha = amt || 0.3;
      g.fillStyle = tint;
      g.fillRect(0, 0, t2.width, t2.height);
      g.globalAlpha = 1;
    }
    // 卡通的深色描邊變成淺淺的刻痕：暗部往上提到石頭的陰影色
    g.globalCompositeOperation = 'lighten';
    g.fillStyle = U.mix(tint || '#9a96a4', '#2a2834', 0.3);
    g.fillRect(0, 0, t2.width, t2.height);
    // 體積：左上受光、右下沉
    g.globalCompositeOperation = 'soft-light';
    const vg = g.createLinearGradient(0, 0, t2.width, t2.height);
    vg.addColorStop(0, 'rgba(255,255,255,0.55)');
    vg.addColorStop(0.5, 'rgba(128,128,128,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = vg;
    g.fillRect(0, 0, t2.width, t2.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(tc, 0, 0);
    OA.finish(t2, { grain: 0.35, fbm: 0.45, scale: 0.8 });
    const x = tc.getContext('2d');
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'copy';
    x.drawImage(t2, 0, 0);
    x.restore();
  }

  // 平塗＋月牙陰影＋高光＋深棕描邊（任何座標都能用，不受 A.shape 的 ±500 限制）
  function paint(c, path, fill, o) {
    o = o || {};
    c.beginPath();
    path(c);
    c.fillStyle = A.c(fill);
    c.fill();
    if (o.shade) {
      c.save();
      c.clip();
      c.fillStyle = A.c(o.shade);
      if (o.cel) {
        c.fillRect(-6000, -6000, 14000, 14000);
        c.translate(-o.cel[0], -o.cel[1]);
        c.beginPath();
        path(c);
        c.fillStyle = A.c(fill);
        c.fill();
      } else c.fillRect(-6000, o.shadeY, 14000, 14000);
      c.restore();
    }
    if (o.hl) {
      c.save();
      c.globalAlpha *= o.hlA || 0.5;
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(o.hl[0], o.hl[1], o.hl[2], o.hl[3], o.hl[4] == null ? -0.5 : o.hl[4], 0, PI2);
      c.fill();
      c.restore();
    }
    if (o.lw === 0) return;
    softEdge(c, path, fill, o.lw || 3);
  }
  // 取代卡通的深色描邊：沿著形狀內側一道很淡、跟本色同色系的暗邊（只留下形體，不留「線」）
  function softEdge(c, path, fill, lw) {
    const f = A.c(fill);
    const ga = c.globalAlpha;
    c.beginPath();
    path(c);
    c.lineWidth = lw * 0.55;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.strokeStyle = typeof f === 'string' ? U.mix(f, '#2a1c28', 0.35) : 'rgb(60,44,52)';
    c.globalAlpha = ga * 0.3;
    c.stroke();
    c.globalAlpha = ga;
  }

  // 雲朵、樹冠用：上緣一道亮邊、下緣一道月牙陰影
  function lit(c, path, col, o) {
    c.save();
    c.beginPath();
    path(c);
    c.fillStyle = A.c(o.hi);
    c.fill();
    c.clip();
    c.translate(0, o.rim);
    c.beginPath();
    path(c);
    c.fillStyle = A.c(o.shade);
    c.fill();
    c.clip();
    c.translate(-(o.dx || 0), -o.sh);
    c.beginPath();
    path(c);
    c.fillStyle = A.c(col);
    c.fill();
    c.restore();
  }
  const blobs = (list) => (p) => list.forEach((b) => {
    p.moveTo(b[0] + b[2], b[1]);
    p.arc(b[0], b[1], b[2], 0, PI2);
  });

  function sparkle(c, x, y, r, a, col) {
    if (a <= 0.01) return;
    c.save();
    c.globalAlpha *= Math.min(1, a);
    c.fillStyle = col || '#fffbe0';
    c.beginPath();
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y);
    c.quadraticCurveTo(x, y, x, y - r);
    c.fill();
    c.restore();
  }

  function leafGem(c, x, y, s, col, rot) {
    c.save();
    c.translate(x, y);
    c.rotate(rot || 0);
    paint(c, (p) => A.mapleLeafPath(p, 0, 0, s), col, {
      shade: U.mix(col, '#40305a', 0.3), cel: [s * 0.22, s * 0.2], lw: Math.max(1.3, s * 0.15),
      hl: [-s * 0.3, -s * 0.38, s * 0.24, s * 0.12], hlA: 0.7,
    });
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.lineWidth = Math.max(0.8, s * 0.07);
    c.beginPath();
    c.moveTo(0, s * 0.75);
    c.lineTo(0, -s * 0.6);
    c.moveTo(0, s * 0.1);
    c.lineTo(-s * 0.55, -s * 0.2);
    c.moveTo(0, s * 0.1);
    c.lineTo(s * 0.55, -s * 0.2);
    c.stroke();
    c.restore();
  }

  // ── 離屏圖層 ──
  function layer(id) {
    let L = IX.L[id];
    if (L) return L;
    const d = DEFS[id];
    const t0 = performance.now();
    const n0 = OA.nDab;
    const k = Math.max(0.75, Math.min(IX.k, d.kmax || 1.5));
    const c = newCv(d.w * k, d.h * k);
    const x = c.getContext('2d');
    x.scale(k, k);
    x.translate(-(d.ox || 0), -(d.oy || 0));
    IX.bk = k;
    d.draw(x);
    // 收尾的顆粒：雲、時鐘環這種要乾淨的不加
    if (d.fin) OA.finish(c, d.fin);
    L = IX.L[id] = { c, x: d.ox || 0, y: d.oy || 0, w: d.w, h: d.h, pieces: d.solid ? null : pieces(c) };
    IX.bt[id] = performance.now() - t0; // 快取花了多久（效能檢查用）
    IX.bt[id + '#'] = OA.nDab - n0;
    return L;
  }
  // 貼圖的花費跟面積成正比：把圖層切成 64px 的格子，只記下有東西的那幾塊（一列一列合併成長條）。
  // 不旋轉、不歪斜的時候只貼這些塊；拼接處不會有縫（已測過縮放＋小數位移）。
  function pieces(c) {
    const w = c.width;
    const h = c.height;
    if (w * h < 120000) return null;
    const T = 64;
    const nx = Math.ceil(w / T);
    const ny = Math.ceil(h / T);
    let data;
    try {
      // 讀一份複本，不要對圖層本身 getImageData（瀏覽器可能因此把它改成不用 GPU 的畫布）
      const tmp = newCv(w, h);
      const tx = tmp.getContext('2d', { willReadFrequently: true });
      tx.drawImage(c, 0, 0);
      data = tx.getImageData(0, 0, w, h).data;
    } catch (e) {
      return null;
    }
    const on = new Uint8Array(nx * ny);
    for (let y = 0; y < h; y++) {
      const row = y * w * 4 + 3;
      const ty = ((y / T) | 0) * nx;
      for (let tx = 0; tx < nx; tx++) {
        if (on[ty + tx]) continue;
        const x1 = Math.min(w, (tx + 1) * T);
        for (let x = tx * T; x < x1; x++) {
          if (data[row + x * 4]) {
            on[ty + tx] = 1;
            break;
          }
        }
      }
    }
    const out = [];
    let area = 0;
    let prev = [];
    for (let ty = 0; ty < ny; ty++) {
      const runs = [];
      for (let tx = 0; tx < nx; tx++) {
        if (!on[ty * nx + tx]) continue;
        let e = tx;
        while (e + 1 < nx && on[ty * nx + e + 1]) e++;
        runs.push([tx, e]);
        tx = e;
      }
      const cur = [];
      runs.forEach(([a, b]) => {
        const sx = a * T;
        const sw = Math.min(w, (b + 1) * T) - sx;
        const sh = Math.min(h, (ty + 1) * T) - ty * T;
        const same = prev.find((q) => q[0] === sx && q[2] === sw);
        if (same) {
          same[3] += sh;
          cur.push(same);
        } else {
          const q = [sx, ty * T, sw, sh];
          out.push(q);
          cur.push(q);
        }
        area += sw * sh;
      });
      prev = cur;
    }
    return area > w * h * 0.85 ? null : out;
  }
  function drawL(ctx, L, x, y) {
    if (!L.pieces) {
      ctx.drawImage(L.c, x, y, L.w, L.h);
      return;
    }
    const k = L.w / L.c.width;
    for (const q of L.pieces) ctx.drawImage(L.c, q[0], q[1], q[2], q[3], x + q[0] * k, y + q[1] * k, q[2] * k, q[3] * k);
  }
  function blit(ctx, id, dx, dy) {
    const L = layer(id);
    drawL(ctx, L, L.x + (dx || 0), L.y + (dy || 0));
  }
  // 以圖層中心點（cx, cy）縮放貼上
  function blitAt(ctx, id, x, y, s, rot) {
    const L = layer(id);
    ctx.save();
    ctx.translate(x, y);
    if (rot) {
      ctx.rotate(rot);
      ctx.scale(s, s);
      ctx.drawImage(L.c, L.x, L.y, L.w, L.h);
    } else {
      ctx.scale(s, s);
      drawL(ctx, L, L.x, L.y);
    }
    ctx.restore();
  }

  // 鏡頭：C = { x, y, z, sx, sy }，f 是圖層的遠近（0 很遠不動、1 焦點平面）
  function cam(ctx, C, f, fn) {
    const z = 1 + (C.z - 1) * f;
    ctx.save();
    ctx.translate(W() / 2 + (C.sx || 0) * f, H() / 2 + (C.sy || 0) * f);
    ctx.scale(z, z);
    ctx.translate(-(W() / 2 + (C.x - W() / 2) * f), -(H() / 2 + (C.y - H() / 2) * f));
    fn();
    ctx.restore();
  }
  const W = () => G.W;
  const H = () => G.H;

  // 可以左右無限捲動的雲帶
  function band(ctx, id, scroll, y, x0) {
    const L = layer(id);
    const off = -(scroll % L.w) - x0;
    drawL(ctx, L, off, y + L.y);
    drawL(ctx, L, off + L.w, y + L.y);
  }

  // 天空漸層＋太陽暈：畫一次低解析度的小圖，每幀放大貼上（漸層放大看不出來）
  const SKYC = {};
  function sky(ctx, stops, hz) {
    const key = JSON.stringify([stops, hz]);
    let c = SKYC[key];
    if (!c) {
      c = SKYC[key] = newCv(320, 180);
      const x = c.getContext('2d');
      x.scale(0.25, 0.25);
      const g = x.createLinearGradient(0, 0, 0, 720);
      stops.forEach((st) => g.addColorStop(st[0], st[1]));
      x.fillStyle = g;
      x.fillRect(0, 0, 1280, 720);
      if (hz) haze(x, hz[0], hz[1], hz[2], hz[3], hz[4]);
    }
    ctx.drawImage(c, 0, 0, W(), H());
  }


  // ════════ 美術零件 ════════
  // 雲海：每一排是一串積雲（有受光的柔邊球），底下接著一片慢慢變暗的雲層本體；左右可以無縫循環
  function cloudBand(c, w, seed, rows) {
    const r = U.seeded(seed);
    rows.forEach((row) => {
      const hi = A.c(row.hi);
      const col = A.c(row.col);
      const sh = A.c(row.shade);
      const pal = [hi, col, sh, U.mix(sh, '#ffd0b8', 0.5)];
      const key = 'band' + pal.join();
      const rAvg = (row.r[0] + row.r[1]) / 2;
      // 雲層本體
      const top = row.y + rAvg * 0.25;
      const g = c.createLinearGradient(0, top - 20, 0, top + 260);
      g.addColorStop(0, col);
      g.addColorStop(0.4, U.mix(col, sh, 0.5));
      g.addColorStop(1, sh);
      c.fillStyle = g;
      c.fillRect(-w, top, w * 3, row.fill || 400);
      const balls = [];
      const n = row.n;
      for (let i = 0; i < n; i++) {
        const x = ((i + r() * 0.6) / n) * w;
        const rr = row.r[0] + r() * (row.r[1] - row.r[0]);
        const y = row.y + r() * row.jit;
        const cu = OA.cumulus(r, x, y + rr * 0.45, rr * 2.6, rr * 1.35);
        cu.forEach((b) => balls.push(b, [b[0] - w, b[1], b[2]], [b[0] + w, b[1], b[2]]));
      }
      // 本體上緣再補一排扁球，讓積雲跟雲層接起來
      for (let x = -rAvg; x < w + rAvg; x += rAvg * 0.7) {
        const b = [x, top + rAvg * 0.2 + r() * 10, rAvg * (0.55 + r() * 0.25)];
        balls.push(b, [b[0] - w, b[1], b[2]], [b[0] + w, b[1], b[2]]);
      }
      OA.cloudBalls(c, balls, pal, key);
      // 下半部慢慢沉進陰影、上緣受光的柔光
      c.save();
      c.globalCompositeOperation = 'source-atop';
      const g2 = c.createLinearGradient(0, row.y - rAvg, 0, top + 200);
      g2.addColorStop(0, 'rgba(255,255,255,0)');
      g2.addColorStop(0.55, 'rgba(255,255,255,0)');
      g2.addColorStop(1, U.mix(sh, '#b89ab0', 0.3));
      c.globalAlpha = 0.45;
      c.fillStyle = g2;
      c.fillRect(-w, row.y - rAvg * 2, w * 3, 700);
      c.restore();
    });
  }

  function ringSprite(c, r, col) {
    c.strokeStyle = col;
    c.fillStyle = col;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, r, 0, PI2);
    c.stroke();
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(0, 0, r - 18, 0, PI2);
    c.stroke();
    c.beginPath();
    c.arc(0, 0, r * 0.6, 0, PI2);
    c.stroke();
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * PI2;
      const big = k % 5 === 0;
      c.lineWidth = big ? 3 : 1.3;
      c.beginPath();
      c.moveTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
      c.lineTo(Math.cos(a) * (r - (big ? 15 : 8)), Math.sin(a) * (r - (big ? 15 : 8)));
      c.stroke();
    }
    c.font = 'bold ' + Math.round(r * 0.11) + 'px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let k = 0; k < 12; k++) {
      c.save();
      c.rotate((k / 12) * PI2);
      c.fillText(ROMAN[k], 0, -(r - 18 - r * 0.09));
      c.restore();
    }
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * PI2;
      c.beginPath();
      c.arc(Math.cos(a) * (r * 0.6 + 8), Math.sin(a) * (r * 0.6 + 8), k % 2 ? 1.6 : 2.8, 0, PI2);
      c.fill();
    }
  }

  const MARBLE = '#fbf6ec';
  const MARBLE_S = '#ddd0bd';
  const GOLD = '#e8b84a';

  // 大理石的圓柱受光：左亮、右暗、最右邊一點反光
  function marbleGrad(c, x0, x1, M, S) {
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, U.mix(M, '#fffaf0', 0.5));
    g.addColorStop(0.28, M);
    g.addColorStop(0.7, S);
    g.addColorStop(0.9, U.mix(S, '#5a4c48', 0.18));
    g.addColorStop(1, U.mix(S, M, 0.35));
    return g;
  }
  function column(c, x, base, w, h, o) {
    o = o || {};
    const lw = o.lw || 2.5;
    const M = A.c(o.m || MARBLE);
    const S = A.c(o.s || MARBLE_S);
    const block = (x0, y0, bw, bh) => {
      c.fillStyle = marbleGrad(c, x0, x0 + bw, M, S);
      c.fillRect(x0, y0, bw, bh);
      c.fillStyle = 'rgba(255,250,236,0.55)';
      c.fillRect(x0, y0, bw, Math.max(0.8, bh * 0.14));
      c.fillStyle = 'rgba(60,44,40,0.22)';
      c.fillRect(x0, y0 + bh * 0.82, bw, bh * 0.18);
    };
    block(x - w * 0.72, base - w * 0.36, w * 1.44, w * 0.36);
    const top = base - h;
    const r = U.seeded(o.seed || 7);
    const body = (p) => {
      p.moveTo(x - w / 2, base - w * 0.36);
      if (o.broken) {
        p.lineTo(x - w / 2, top + w * 0.5);
        p.lineTo(x - w * 0.22, top + w * (0.1 + r() * 0.3));
        p.lineTo(x - w * 0.02, top + w * (0.35 + r() * 0.3));
        p.lineTo(x + w * 0.2, top - w * 0.12);
        p.lineTo(x + w / 2, top + w * (0.3 + r() * 0.3));
      } else {
        p.lineTo(x - w / 2, top);
        p.lineTo(x + w / 2, top);
      }
      p.lineTo(x + w / 2, base - w * 0.36);
      p.closePath();
    };
    c.save();
    c.beginPath();
    body(c);
    c.fillStyle = marbleGrad(c, x - w / 2, x + w / 2, M, S);
    c.fill();
    c.clip();
    // 凹槽：每一條是一道暗、一道亮（圓柱上越靠邊越密）
    for (let k = -3; k <= 3; k++) {
      const u = k / 3.6;
      const fx = x + Math.sin(u * 1.3) * w * 0.5;
      const lt = 0.5 - u * 0.5;
      c.fillStyle = 'rgba(110,86,70,' + (0.1 + (1 - lt) * 0.12).toFixed(3) + ')';
      c.fillRect(fx - w * 0.03, top - 10, Math.max(0.8, w * 0.05), h + 10);
      c.fillStyle = 'rgba(255,252,240,' + (0.25 * lt).toFixed(3) + ')';
      c.fillRect(fx - w * 0.07, top - 10, Math.max(0.6, w * 0.03), h + 10);
    }
    // 上下的陰影：柱頭底下、地面接觸的地方
    const g = c.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, 'rgba(70,52,48,0.28)');
    g.addColorStop(0.08, 'rgba(70,52,48,0)');
    g.addColorStop(0.85, 'rgba(70,52,48,0)');
    g.addColorStop(1, 'rgba(70,52,48,0.25)');
    c.fillStyle = g;
    c.fillRect(x - w, top - 10, w * 2, h + 10);
    OA.texture(c, x - w, top - 10, w * 2, h + 10, { fbm: 0.35, scale: Math.max(0.4, w / 60) });
    if (o.crack) {
      c.strokeStyle = 'rgba(90,60,40,0.45)';
      c.lineWidth = Math.max(1, w * 0.04);
      c.beginPath();
      c.moveTo(x - w * 0.5, top + h * 0.45);
      c.lineTo(x - w * 0.1, top + h * 0.5);
      c.lineTo(x + w * 0.05, top + h * 0.58);
      c.stroke();
    }
    c.restore();
    if (!o.broken) {
      // 柱頭：外擴的圓盤＋頂板
      c.save();
      c.beginPath();
      c.ellipse(x, top - w * 0.05, w * 0.62, w * 0.18, 0, 0, PI2);
      c.fillStyle = marbleGrad(c, x - w * 0.62, x + w * 0.62, M, S);
      c.fill();
      c.restore();
      block(x - w * 0.8, top - w * 0.42, w * 1.6, w * 0.28);
      c.fillStyle = A.c(GOLD);
      c.fillRect(x - w * 0.8, top - w * 0.2, w * 1.6, Math.max(1.2, w * 0.05));
      c.fillStyle = 'rgba(255,240,190,0.6)';
      c.fillRect(x - w * 0.8, top - w * 0.2, w * 0.5, Math.max(0.6, w * 0.02));
    }
    if (o.ivy) ivy(c, x - w * 0.5, top + (o.broken ? w * 0.6 : 0), h * o.ivy, o.seed || 3, w);
  }

  function ivy(c, x, y, len, seed, w) {
    const r = U.seeded(seed + 11);
    const pts = [[x, y]];
    const n = 8;
    for (let i = 1; i <= n; i++) pts.push([x + (i % 2 ? 1 : -0.2) * w * 0.25 + (r() - 0.3) * w * 0.2, y + (len * i) / n]);
    c.strokeStyle = 'rgba(52,72,36,0.9)';
    c.lineWidth = Math.max(1, w * 0.05);
    c.lineCap = 'round';
    c.beginPath();
    pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
    c.stroke();
    const M = c.getTransform();
    const lp = OA.leafPath('oval');
    const nl = Math.round(len / Math.max(2.5, w * 0.12)) + 4;
    for (let i = 0; i < nl; i++) {
      const q = pts[Math.min(n, Math.floor(r() * (n + 0.99)))];
      const t = 0.35 + r() * 0.55 - (i / nl) * 0.1;
      c.fillStyle = OA.rgb(OA.ramp(OA.TFOL, t));
      OA.dab(c, M, lp, q[0] + (r() - 0.5) * w * 0.4, q[1] + (r() - 0.5) * (len / n), Math.max(1.4, w * (0.1 + r() * 0.08)), r() * 6);
    }
    c.setTransform(M);
  }

  function grassTuft(c, x, y, s, col, dark) {
    paint(c, (p) => {
      p.moveTo(x - 12 * s, y);
      p.quadraticCurveTo(x - 10 * s, y - 10 * s, x - 16 * s, y - 20 * s);
      p.quadraticCurveTo(x - 4 * s, y - 12 * s, x - 3 * s, y - 6 * s);
      p.quadraticCurveTo(x - 2 * s, y - 18 * s, x + 1 * s, y - 26 * s);
      p.quadraticCurveTo(x + 5 * s, y - 14 * s, x + 4 * s, y - 6 * s);
      p.quadraticCurveTo(x + 9 * s, y - 14 * s, x + 17 * s, y - 18 * s);
      p.quadraticCurveTo(x + 11 * s, y - 8 * s, x + 12 * s, y);
      p.closePath();
    }, col || '#8cc85e', { shade: dark || '#62a04a', cel: [4 * s, -4 * s], lw: Math.max(1.4, 2.2 * Math.min(1.2, s)) });
  }

  function flower(c, x, y, s, col, ctr) {
    c.strokeStyle = A.c('#5a9a4a');
    c.lineWidth = Math.max(1, 1.6 * s);
    c.beginPath();
    c.moveTo(x, y + 12 * s);
    c.quadraticCurveTo(x - 2 * s, y + 6 * s, x, y);
    c.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI2 - Math.PI / 2;
      paint(c, (p) => p.ellipse(x + Math.cos(a) * 4.2 * s, y + Math.sin(a) * 4.2 * s, 3.6 * s, 2.7 * s, a, 0, PI2), col, { lw: Math.max(1, 1.3 * s) });
    }
    c.fillStyle = A.c(ctr || '#ffd84a');
    c.beginPath();
    c.arc(x, y, 2.2 * s, 0, PI2);
    c.fill();
  }

  function mushroom(c, x, y, s) {
    paint(c, (p) => A.roundRect(p, x - 4 * s, y - 13 * s, 8 * s, 13 * s, 3 * s), '#fff3dc', { shade: '#e6d2b0', cel: [2 * s, 0], lw: Math.max(1.4, 2 * s) });
    paint(c, (p) => {
      p.moveTo(x - 13 * s, y - 11 * s);
      p.quadraticCurveTo(x - 12 * s, y - 27 * s, x, y - 27 * s);
      p.quadraticCurveTo(x + 12 * s, y - 27 * s, x + 13 * s, y - 11 * s);
      p.closePath();
    }, '#ec5a48', { shade: '#c23e34', cel: [4 * s, 2 * s], lw: Math.max(1.4, 2 * s), hl: [x - 5 * s, y - 22 * s, 3.5 * s, 2 * s] });
    c.fillStyle = A.c('#fff6ea');
    [[-6, -16, 2.2], [4, -21, 2], [8, -14, 1.6]].forEach(([dx, dy, r]) => {
      c.beginPath();
      c.arc(x + dx * s, y + dy * s, r * s, 0, PI2);
      c.fill();
    });
  }

  // 星楓樹。part：'trunk'、'canopy' 或全部（畫法在 js/ui/openart.js）
  function starTree(c, s, part, o) {
    c.save();
    c.scale(s, s);
    OA.worldTree(c, part || 'all', o);
    c.restore();
  }

  // 石獅像：小獅子的石頭版（臉一模一樣——伏筆）
  function statue(c, x, base, s, dir) {
    const lw = Math.max(1.3, 2.6 * Math.min(1.2, s));
    const pw = 96 * s;
    const ph = 62 * s;
    paint(c, (p) => p.rect(x - pw / 2 - 6 * s, base - 11 * s, pw + 12 * s, 11 * s), '#d6ccbc', { shade: '#b0a390', cel: [10 * s, 0], lw });
    paint(c, (p) => p.rect(x - pw / 2, base - ph, pw, ph - 10 * s), '#e4dccd', { shade: '#bdb09c', cel: [pw * 0.2, 0], lw });
    paint(c, (p) => p.rect(x - pw / 2 - 8 * s, base - ph - 12 * s, pw + 16 * s, 12 * s), '#efe8dc', { shade: '#c9bca8', cel: [10 * s, 0], lw });
    c.save();
    c.translate(x, base - ph / 2 - 4 * s);
    paint(c, (p) => A.mapleLeafPath(p, 0, 0, 12 * s), GOLD, { shade: '#b8862a', cel: [2 * s, 2 * s], lw: lw * 0.7 });
    c.restore();
    c.strokeStyle = 'rgba(90,64,44,0.5)';
    c.lineWidth = Math.max(1, 1.5 * s);
    c.beginPath();
    c.moveTo(x + pw * 0.3 * dir, base - ph + 2 * s);
    c.lineTo(x + pw * 0.22 * dir, base - ph + 16 * s);
    c.lineTo(x + pw * 0.34 * dir, base - ph + 26 * s);
    c.stroke();
    for (let i = 0; i < 4; i++) {
      const mx = x - dir * (pw * 0.5 - i * 11 * s);
      paint(c, (p) => p.ellipse(mx, base - ph - 12 * s, 8 * s, (3 + (i % 2) * 2) * s, 0, 0, Math.PI), i % 2 ? '#8cc466' : '#7ab55a', { lw: lw * 0.6 });
    }
    // 石頭獅子：先畫到小畫布，再整體蓋一層石色
    const k = IX.bk;
    const ls = 1.55 * s;
    const tw = 130 * ls;
    const th = 110 * ls;
    const tc = newCv(tw * k, th * k);
    const x2 = tc.getContext('2d');
    x2.scale(k, k);
    const m0 = A.mode;
    const mc = A.modeColor;
    const ma = A.modeAmt;
    A.mode = 'tint';
    A.modeColor = '#b9b2c8';
    A.modeAmt = 0.8;
    try {
      x2.save();
      x2.translate(tw / 2, th - 3 * ls);
      x2.scale(ls, ls);
      A.drawLion(x2, 0, 0, dir, { state: 'idle', t: 0.05, p: 0 });
      x2.restore();
    } finally {
      A.mode = m0;
      A.modeColor = mc;
      A.modeAmt = ma;
    }
    stoneify(tc, '#b6b0be', 0.25);
    x2.globalCompositeOperation = 'source-atop';
    x2.fillStyle = 'rgba(150,146,160,0.22)';
    x2.fillRect(0, 0, tw, th);
    x2.fillStyle = A.c('#86b866');
    [[-18, -54, 9, 4], [-26, -40, 6, 3], [6, -76, 7, 3]].forEach(([dx, dy, rx, ry]) => {
      x2.beginPath();
      x2.ellipse(tw / 2 + dx * dir * ls, th - 3 * ls + dy * ls, rx * ls, ry * ls, 0, 0, PI2);
      x2.fill();
    });
    c.drawImage(tc, x - tw / 2, base - ph - 12 * s - th + 4 * s, tw, th);
  }

  // 浮空的岩塊（底下倒掛的山；畫法在 js/ui/openart.js）
  function isleRock(c, w, d, seed, o) {
    o = o || {};
    return OA.rockIsle(c, w, d, seed, { roots: o.roots === false ? 0 : 1, crystals: o.gold !== false, vines: o.roots !== false });
  }

  // 主浮島（原點＝頂面中心）
  function drawIsle(c) {
    // 下方跟著漂的小碎岩另外畫（會動）
    isleRock(c, 640, 330, 5, { lw: 3 });
    // 草地頂面（從斜上方看的橢圓）
    {
      c.save();
      c.beginPath();
      c.ellipse(0, 2, 322, 26, 0, 0, PI2);
      const tg = c.createLinearGradient(-320, 0, 320, 0);
      tg.addColorStop(0, '#9cc05a');
      tg.addColorStop(0.5, '#6e9a40');
      tg.addColorStop(1, '#4a7032');
      c.fillStyle = tg;
      c.fill();
      c.clip();
      OA.texture(c, -330, -30, 660, 60, { fbm: 0.6, grain: 0.3, scale: 0.5 });
      c.restore();
    }
    // 神殿的建築：先畫在一張暫存上，再統一上光（左邊暖光、右邊冷色的陰影、貼地的地方暗）
    OA.hazed(c, '0,0,0', 0, (c) => {
      drawIsleTop(c);
      c.save();
      c.globalCompositeOperation = 'source-atop';
      const lg = c.createLinearGradient(-300, 0, 300, 0);
      lg.addColorStop(0, 'rgba(255,236,200,0.22)');
      lg.addColorStop(0.45, 'rgba(255,236,200,0)');
      lg.addColorStop(0.6, 'rgba(90,80,120,0.05)');
      lg.addColorStop(1, 'rgba(90,80,120,0.3)');
      c.fillStyle = lg;
      c.fillRect(-340, -200, 680, 240);
      const vg = c.createLinearGradient(0, -170, 0, 20);
      vg.addColorStop(0, 'rgba(255,250,235,0.12)');
      vg.addColorStop(0.75, 'rgba(80,60,60,0)');
      vg.addColorStop(1, 'rgba(80,60,60,0.25)');
      c.fillStyle = vg;
      c.fillRect(-340, -200, 680, 240);
      c.restore();
    });
    // 星楓樹
    c.save();
    c.translate(0, -8);
    starTree(c, 0.42, null, { rootK: 0.45, glow: 8, jit: 0.07, warm: 0.02, leafPx: 6.5 });
    c.restore();
    // 島緣的草
    {
      const r = U.seeded(515);
      const M = c.getTransform();
      const bl = OA.leafPath('blade');
      for (let i = 0; i < 260; i++) {
        const an = Math.PI * (0.02 + r() * 0.96);
        const x = Math.cos(an) * 318 * (0.9 + r() * 0.1);
        const y = 2 + Math.sin(an) * 26 * (0.85 + r() * 0.15);
        if (Math.abs(x) < 80) continue; // 正面的階梯
        c.fillStyle = OA.rgb(OA.ramp(OA.TFOL, Math.max(0, Math.min(1, 0.45 + (-x / 320) * 0.25 + (r() - 0.5) * 0.35))));
        OA.dab(c, M, bl, x, y - 3, 3 + r() * 3.5, (r() - 0.5) * 0.8);
      }
      c.setTransform(M);
    }
  }
  function drawIsleTop(c) {
    // 大理石廣場
    paint(c, (p) => p.ellipse(0, -2, 236, 17, 0, 0, PI2), '#f6efe2', { shade: '#e2d6c2', shadeY: 6, lw: 2.2 });
    c.strokeStyle = A.c(GOLD);
    c.lineWidth = 1.6;
    c.beginPath();
    c.ellipse(0, -2, 150, 10, 0, 0, PI2);
    c.stroke();
    // 廣場的石板縫
    c.save();
    c.beginPath();
    c.ellipse(0, -2, 236, 17, 0, 0, PI2);
    c.clip();
    c.strokeStyle = 'rgba(150,120,90,0.3)';
    c.lineWidth = 1;
    for (let k = -7; k <= 7; k++) {
      c.beginPath();
      c.moveTo(k * 30, -20);
      c.lineTo(k * 36, 16);
      c.stroke();
    }
    c.beginPath();
    c.ellipse(0, -2, 200, 13, 0, 0, PI2);
    c.stroke();
    c.restore();
    // 後面一排拱廊（中間那段塌了）
    const arc = [-176, -128, -80, -32, 16, 64, 112];
    c.save();
    for (let i = 0; i + 1 < arc.length; i++) {
      if (i === 3) continue;
      const x0 = arc[i] + 4;
      const x1 = arc[i + 1] - 4;
      const top = -64;
      paint(c, (p) => {
        p.moveTo(x0 - 5, -16);
        p.lineTo(x0 - 5, top - 10);
        p.lineTo(x1 + 5, top - 10);
        p.lineTo(x1 + 5, -16);
        p.lineTo(x1, -16);
        p.lineTo(x1, top + 14);
        p.arc((x0 + x1) / 2, top + 14, (x1 - x0) / 2, 0, Math.PI, true);
        p.lineTo(x0, -16);
        p.closePath();
      }, '#f1e8d8', { shade: '#d8c9b2', cel: [5, 0], lw: 1.8 });
      c.fillStyle = A.c(GOLD);
      c.fillRect(x0 - 5, top - 7, x1 - x0 + 10, 2);
      c.fillStyle = 'rgba(120,90,70,0.18)';
      c.beginPath();
      c.moveTo(x0, -16);
      c.lineTo(x0, top + 14);
      c.arc((x0 + x1) / 2, top + 14, (x1 - x0) / 2, Math.PI, 0);
      c.lineTo(x1, -16);
      c.closePath();
      c.fill();
    }
    // 塌掉的那一段：斷口與倒在地上的拱石
    paint(c, (p) => {
      p.moveTo(-36, -16);
      p.lineTo(-36, -50);
      p.lineTo(-30, -58);
      p.lineTo(-26, -48);
      p.lineTo(-24, -16);
      p.closePath();
    }, '#f1e8d8', { shade: '#d8c9b2', cel: [3, 0], lw: 1.6 });
    [[-10, -14, 0.3], [4, -12, -0.4]].forEach(([bx, by, rot]) => {
      c.save();
      c.translate(bx, by);
      c.rotate(rot);
      paint(c, (p) => p.rect(-6, -4, 12, 7), '#efe6d6', { shade: '#d6c7b0', cel: [3, 0], lw: 1.4 });
      c.restore();
    });
    // 藤從拱廊上垂下來
    [[-150, -70, 36], [44, -70, 30], [100, -70, 22]].forEach(([x, y, len], i) => ivy(c, x, y, len, 30 + i, 10));
    c.restore();
    // 正面的階梯：從廣場走下到島的邊緣
    for (let k = 0; k < 4; k++) {
      const y = 12 + k * 5;
      const hw = 46 + k * 7;
      paint(c, (p) => p.rect(-hw, y, hw * 2, 5), MARBLE, { shade: MARBLE_S, cel: [0, -2], lw: 1.4 });
    }
    // 階梯兩旁的燈柱
    [-66, 66].forEach((x) => {
      paint(c, (p) => p.rect(x - 2.5, -8, 5, 26), MARBLE, { shade: MARBLE_S, cel: [2, 0], lw: 1.4 });
      paint(c, (p) => A.roundRect(p, x - 5, -18, 10, 11, 3), '#ffe6a0', { shade: '#e8b84a', cel: [2, 0], lw: 1.4 });
      haze(c, x, -12, 18, '255,220,140', 0.7);
    });
    // 流到島邊的小溪（瀑布的源頭）
    [[-300, 6, -1], [292, 4, 1]].forEach(([x, y, sd]) => {
      c.strokeStyle = A.c('#9ad8f4');
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - sd * 60, y - 10);
      c.quadraticCurveTo(x - sd * 30, y + 4, x, y + 12);
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)';
      c.lineWidth = 1.5;
      c.stroke();
    });
    // 左邊：斷掉的柱廊
    column(c, -292, 4, 18, 64, { broken: true, seed: 3, lw: 2 });
    column(c, -254, -2, 20, 118, { lw: 2, ivy: 0.5, seed: 4 });
    column(c, -214, -6, 20, 86, { broken: true, seed: 9, lw: 2 });
    paint(c, (p) => A.roundRect(p, -190, -18, 44, 13, 6), MARBLE, { shade: MARBLE_S, cel: [0, -3], lw: 2 });
    // 右邊：半毀的小神殿
    [[164, 150], [158, 158], [152, 166]].forEach(([y0, ww], i) => paint(c, (p) => p.rect(212 - ww / 2, -6 - i * 6, ww, 6), MARBLE, { shade: MARBLE_S, cel: [0, -2], lw: 1.8 }));
    column(c, 158, -24, 18, 104, { lw: 2 });
    column(c, 212, -24, 18, 104, { lw: 2, crack: true });
    column(c, 266, -24, 18, 70, { broken: true, seed: 12, lw: 2, ivy: 0.6 });
    paint(c, (p) => {
      p.moveTo(140, -128);
      p.lineTo(232, -128);
      p.lineTo(240, -140);
      p.lineTo(218, -148);
      p.lineTo(196, -168);
      p.lineTo(140, -142);
      p.closePath();
    }, MARBLE, { shade: MARBLE_S, cel: [0, -4], lw: 2 });
    c.fillStyle = A.c(GOLD);
    c.fillRect(142, -134, 90, 2.5);
    paint(c, (p) => A.roundRect(p, 282, -14, 30, 11, 5), MARBLE, { shade: MARBLE_S, cel: [0, -3], lw: 1.8 });
    // 石獅像（歷代守葉獸）
    statue(c, -118, -2, 0.3, 1);
    statue(c, -78, -8, 0.26, 1);
    statue(c, 78, -8, 0.26, -1);
    statue(c, 118, -2, 0.3, -1);
  }
  const ISLE_TREE_S = 0.42;
  const ISLE_TREE_Y = -8;

  function farIsle(c, x, y, w, seed, kind) {
    c.save();
    c.translate(x, y);
    isleRock(c, w, w * 0.62, seed, { roots: w > 70 });
    if (kind === 'cols') {
      column(c, -w * 0.2, 0, w * 0.07, w * 0.42, { lw: 1.6 });
      column(c, w * 0.12, 0, w * 0.07, w * 0.3, { lw: 1.6, broken: true, seed: seed + 1 });
    } else if (kind === 'tree') {
      OA.smallTree(c, 0, 0, w * 0.55, seed);
    } else if (kind === 'arch') {
      const aw = w * 0.34;
      const ah = w * 0.4;
      paint(c, (p) => {
        p.moveTo(-aw - 5, 0);
        p.lineTo(-aw - 5, -ah);
        p.arc(0, -ah, aw + 5, Math.PI, 0);
        p.lineTo(aw + 5, 0);
        p.lineTo(aw - 4, 0);
        p.lineTo(aw - 4, -ah);
        p.arc(0, -ah, aw - 4, 0, Math.PI, true);
        p.lineTo(-aw + 4, 0);
        p.closePath();
      }, MARBLE, { shade: MARBLE_S, cel: [4, 0], lw: 1.6 });
      // 拱上垂下的藤
      ivy(c, -aw + 2, -ah - 2, ah * 0.6, seed, 8);
    }
    c.restore();
  }

  function puff(c, w, h, seed, pal) {
    const r = U.seeded(seed);
    const balls = OA.cumulus(r, 0, h * 0.3, w * 0.75, h * 0.7);
    OA.cloudBalls(c, balls, [A.c(pal[1]), A.c(pal[0]), A.c(pal[2]), U.mix(A.c(pal[2]), '#eef4ff', 0.5)], 'puff' + pal.join());
  }

  // 從高空往下看的大地：森林、峽谷、海、雪峰
  const LAND = { forest: [300, 420], canyon: [700, 236], sea: [1270, 330], snow: [1210, 70] };
  function drawLands(c) {
    const w = 1600;
    const h = 620;
    const r = U.seeded(77);
    const M = c.getTransform();
    const ground = (p) => {
      p.moveTo(-10, 70);
      p.quadraticCurveTo(w / 2, 20, w + 10, 70);
      p.lineTo(w + 10, h);
      p.lineTo(-10, h);
      p.closePath();
    };
    c.save();
    c.beginPath();
    ground(c);
    const g = c.createLinearGradient(0, 30, 0, h);
    g.addColorStop(0, '#b8d4a8');
    g.addColorStop(0.35, '#8cbc68');
    g.addColorStop(1, '#6aa048');
    c.fillStyle = g;
    c.fill();
    c.clip();
    // 草原上一塊塊深淺不同的地
    for (let i = 0; i < 70; i++) {
      const x = r() * w;
      const y = 80 + r() * (h - 80);
      const s = (30 + r() * 90) * (0.4 + y / h);
      OA.soft(c, x, y, s * 1.6, s * 0.6, r() < 0.5 ? '70,110,40' : '200,210,120', 0.25);
    }
    OA.texture(c, 0, 0, w, h, { fbm: 0.5, grain: 0.25, scale: 1 });
    // 海（右側）
    const coast = (p, off) => {
      p.moveTo(w + 20, 118);
      p.lineTo(1070 + off, 118);
      p.bezierCurveTo(1010 + off, 190, 1110 + off, 230, 1060 + off, 320);
      p.bezierCurveTo(1010 + off, 420, 1130 + off, 520, 1080 + off, h + 20);
      p.lineTo(w + 20, h + 20);
      p.closePath();
    };
    c.beginPath();
    coast(c, -16);
    c.fillStyle = '#e8dcae';
    c.fill();
    c.beginPath();
    coast(c, 0);
    const sg = c.createLinearGradient(1060, 0, w, 0);
    sg.addColorStop(0, '#9ad6e8');
    sg.addColorStop(0.15, '#5ab0d8');
    sg.addColorStop(1, '#2a6aa8');
    c.fillStyle = sg;
    c.fill();
    c.save();
    c.clip();
    const sv = c.createLinearGradient(0, 118, 0, h);
    sv.addColorStop(0, 'rgba(220,236,250,0.55)');
    sv.addColorStop(1, 'rgba(20,50,100,0.15)');
    c.fillStyle = sv;
    c.fillRect(1000, 100, 620, h);
    // 海面的光：一條條短短的亮紋
    for (let i = 0; i < 160; i++) {
      const x = 1080 + r() * 520;
      const y = 120 + r() * 500;
      const k = 0.4 + (y / h) * 1.2;
      c.fillStyle = 'rgba(255,255,255,' + (0.15 + r() * 0.35).toFixed(2) + ')';
      c.fillRect(x, y, (4 + r() * 10) * k, 1.2 * k);
    }
    OA.texture(c, 1000, 100, 620, h, { fbm: 0.35, scale: 1.2 });
    c.restore();
    // 浪花的岸線
    c.beginPath();
    coast(c, 3);
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.lineWidth = 3;
    c.stroke();
    c.beginPath();
    coast(c, 10);
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 2;
    c.stroke();
    // 小島
    OA.soft(c, 1400, 250, 50, 18, '160,220,230', 0.6);
    c.fillStyle = '#e8dcae';
    c.beginPath();
    c.ellipse(1400, 250, 42, 15, 0, 0, PI2);
    c.fill();
    OA.foliage(c, [[1392, 246, 22, 0.8], [1412, 248, 16, 0.8]], { pal: OA.TFOL, leaf: 'oval', size: 2.4, density: 1.5, box: [1360, 225, 1440, 265], seed: 5, ao: 0.2 });
    // 燈塔
    c.fillStyle = '#f4efe6';
    c.fillRect(1180, 150, 9, 28);
    c.fillStyle = '#d85a48';
    c.fillRect(1179, 146, 11, 6);
    OA.soft(c, 1184, 148, 18, 18, '255,240,180', 0.7, 'lighter');
    // 雪峰（遠方右側）：受光的左坡、背光的右坡、雪線
    const peaks = [[900, 120, 110, 70], [990, 122, 130, 96], [1100, 124, 160, 126], [1230, 120, 140, 104], [1350, 124, 170, 134], [1480, 120, 130, 92], [1580, 124, 110, 70]];
    const rockP = OA.P([[0, '#4a5474'], [0.5, '#7c88a8'], [1, '#c8d2e8']]);
    peaks.forEach(([x, base, pw, ph], i) => {
      const L = [];
      const R = [];
      const n = 10;
      for (let k = 0; k <= n; k++) {
        const u = k / n;
        const j = (OA.fbm(u * 4, i, 50, 2) - 0.5) * ph * 0.16 * (1 - u);
        L.push([x - pw * 0.05 - (pw * 0.45) * u, base - ph + ph * u + j]);
        R.push([x + pw * 0.05 + (pw * 0.45) * u, base - ph + ph * u + j * 0.7]);
      }
      const ridge = [];
      for (let k = 0; k <= n; k++) {
        const u = k / n;
        ridge.push([x + pw * 0.08 * u + Math.sin(u * 5 + i) * pw * 0.03, base - ph + ph * u]);
      }
      const poly = (a, b2) => {
        c.beginPath();
        a.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
        for (let k = b2.length - 1; k >= 0; k--) c.lineTo(b2[k][0], b2[k][1]);
        c.closePath();
      };
      poly(L, ridge);
      c.fillStyle = OA.rgb(OA.ramp(rockP, 0.75));
      c.fill();
      poly(ridge, R);
      c.fillStyle = OA.rgb(OA.ramp(rockP, 0.3));
      c.fill();
      // 雪
      c.save();
      poly(L, R);
      c.clip();
      const sl = base - ph * (0.45 + OA.fbm(i, 3, 9, 1) * 0.15);
      c.beginPath();
      c.moveTo(x - pw, base - ph - 10);
      for (let k = 0; k <= 16; k++) {
        const xx = x - pw * 0.5 + (pw * k) / 16;
        c.lineTo(xx, sl + (OA.fbm(k * 0.6, i, 60, 2) - 0.5) * ph * 0.35 + Math.abs(xx - x) * 0.25);
      }
      c.lineTo(x + pw, base - ph - 10);
      c.closePath();
      const snow = c.createLinearGradient(x - pw * 0.3, 0, x + pw * 0.3, 0);
      snow.addColorStop(0, '#ffffff');
      snow.addColorStop(0.5, '#eef4ff');
      snow.addColorStop(0.55, '#b8c8e4');
      snow.addColorStop(1, '#a4b6d8');
      c.fillStyle = snow;
      c.fill();
      OA.texture(c, x - pw, base - ph - 10, pw * 2, ph + 20, { fbm: 0.5, grain: 0.2, scale: 0.5 });
      c.restore();
    });
    // 雪山腳下的松林
    for (let i = 0; i < 90; i++) {
      const px = 880 + r() * 720;
      const py = 118 + r() * 26;
      if (px > 1040 && px < 1100 && py > 118) continue;
      c.fillStyle = OA.rgb(OA.mix(OA.hex('#2e5a44'), OA.hex('#6a9a70'), r() * 0.6));
      c.beginPath();
      c.moveTo(px, py - 9);
      c.lineTo(px + 3.5, py);
      c.lineTo(px - 3.5, py);
      c.closePath();
      c.fill();
    }
    // 峽谷（中間）：平頂的紅岩台地
    OA.soft(c, 700, 250, 300, 110, '214,150,96', 0.7);
    const mesaP = OA.P([[0, '#6a2e22'], [0.35, '#a24a30'], [0.65, '#d27a4e'], [1, '#f6c090']]);
    [[600, 210, 70, 34], [700, 190, 90, 44], [800, 222, 76, 36], [560, 290, 60, 28], [870, 280, 60, 30], [650, 280, 100, 46], [770, 300, 86, 40]].forEach(([x, y, mw, mh], i) => {
      // 影子
      OA.soft(c, x + mw * 0.35, y + 4, mw * 0.7, mh * 0.25, '60,24,16', 0.5);
      const side = (p) => {
        p.moveTo(x - mw / 2, y);
        p.lineTo(x - mw * 0.42, y - mh);
        p.lineTo(x + mw * 0.42, y - mh);
        p.lineTo(x + mw / 2, y);
        p.closePath();
      };
      c.save();
      c.beginPath();
      side(c);
      const mg = c.createLinearGradient(x - mw / 2, 0, x + mw / 2, 0);
      mg.addColorStop(0, OA.rgb(OA.ramp(mesaP, 0.72)));
      mg.addColorStop(0.5, OA.rgb(OA.ramp(mesaP, 0.5)));
      mg.addColorStop(1, OA.rgb(OA.ramp(mesaP, 0.18)));
      c.fillStyle = mg;
      c.fill();
      c.clip();
      for (let k = 1; k < 5; k++) {
        c.fillStyle = k % 2 ? 'rgba(90,30,20,0.18)' : 'rgba(255,210,170,0.12)';
        c.fillRect(x - mw, y - (mh * k) / 5, mw * 2, mh * 0.08);
      }
      for (let k = 0; k < 6; k++) {
        const xx = x - mw * 0.4 + r() * mw * 0.8;
        c.fillStyle = 'rgba(60,20,14,0.25)';
        c.fillRect(xx, y - mh, 1.5, mh);
      }
      OA.texture(c, x - mw, y - mh, mw * 2, mh, { fbm: 0.5, grain: 0.3, scale: 0.5 });
      c.restore();
      c.fillStyle = OA.rgb(OA.ramp(mesaP, 0.88));
      c.beginPath();
      c.ellipse(x, y - mh, mw * 0.42, mh * 0.12 + 2, 0, 0, PI2);
      c.fill();
      c.fillStyle = 'rgba(120,150,70,0.35)';
      c.beginPath();
      c.ellipse(x - mw * 0.08, y - mh, mw * 0.25, mh * 0.07 + 1, 0, 0, PI2);
      c.fill();
    });
    // 河：從森林深處流出來、繞過峽谷流進海
    const river = (p) => {
      p.moveTo(60, 120);
      p.bezierCurveTo(160, 200, 260, 190, 330, 260);
      p.bezierCurveTo(400, 330, 470, 330, 540, 350);
      p.bezierCurveTo(620, 370, 700, 360, 760, 320);
      p.moveTo(760, 320);
      p.bezierCurveTo(800, 400, 900, 380, 950, 450);
      p.bezierCurveTo(990, 510, 1040, 520, 1090, 560);
    };
    c.lineCap = 'round';
    c.beginPath();
    river(c);
    c.strokeStyle = 'rgba(70,100,60,0.45)';
    c.lineWidth = 10;
    c.stroke();
    c.beginPath();
    river(c);
    c.strokeStyle = '#6cb4dc';
    c.lineWidth = 5.5;
    c.stroke();
    c.beginPath();
    river(c);
    c.strokeStyle = 'rgba(230,248,255,0.7)';
    c.lineWidth = 1.4;
    c.stroke();
    c.fillStyle = '#6cb4dc';
    c.beginPath();
    c.ellipse(330, 262, 50, 17, -0.1, 0, PI2);
    c.fill();
    OA.soft(c, 320, 258, 30, 8, '240,250,255', 0.6);
    // 森林（左側）：從高處看下去的一片樹冠
    const fcl = [];
    for (let row = 0; row < 9; row++) {
      const y = 140 + row * 52;
      const n = 22 - row;
      for (let i = 0; i < n; i++) {
        const x = -30 + (i / n) * (560 + row * 20) + (r() - 0.5) * 24 + (row % 2) * 16;
        if (x > 500 + row * 25) continue;
        if (Math.hypot(x - 330, (y - 262) * 2.2) < 70) continue;
        fcl.push([x, y - 8, 14 + row * 3.5, row / 8]);
      }
    }
    OA.foliage(c, fcl, { pal: OA.P([[0, '#0e2a1c'], [0.3, '#1f4e2c'], [0.55, '#3e7c38'], [0.8, '#7eae4a'], [1, '#d0e08a']]), leaf: 'oval', size: 7, density: 0.8, box: [-40, 90, 560, 620], seed: 9, ao: 0.35, jit: 0.12 });
    // 田地與村子（森林和海之間）
    const fr = U.seeded(123);
    for (let i = 0; i < 12; i++) {
      const fx = 930 + (i % 3) * 44 + (fr() - 0.5) * 10 + Math.floor(i / 3) * 10;
      const fy = 250 + Math.floor(i / 3) * 34 + (fr() - 0.5) * 8;
      if (fx > 1060 - Math.floor(i / 3) * 4) continue;
      const col = ['#b8d47a', '#d8d88a', '#9cc46a', '#e0c878', '#a6c87e'][i % 5];
      c.save();
      c.translate(fx, fy);
      c.transform(1, 0, -0.25, 1, 0, 0);
      c.fillStyle = col;
      c.fillRect(-20, -14, 40 + fr() * 6, 28);
      c.strokeStyle = 'rgba(80,100,50,0.2)';
      c.lineWidth = 1;
      for (let k = -16; k < 22; k += 5) {
        c.beginPath();
        c.moveTo(k, -12);
        c.lineTo(k, 12);
        c.stroke();
      }
      c.strokeStyle = 'rgba(60,80,40,0.35)';
      c.strokeRect(-20, -14, 40, 28);
      c.restore();
    }
    [[984, 214], [1000, 222], [968, 226], [1012, 234], [988, 238]].forEach(([hx, hy]) => {
      c.fillStyle = '#f2ead8';
      c.fillRect(hx - 6, hy - 4, 12, 8);
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(hx + 2, hy - 4, 4, 8);
      c.fillStyle = '#c85a44';
      c.beginPath();
      c.moveTo(hx - 8, hy - 3);
      c.lineTo(hx, hy - 10);
      c.lineTo(hx + 8, hy - 3);
      c.closePath();
      c.fill();
    });
    // 小路
    c.strokeStyle = 'rgba(236,216,168,0.75)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(560, 360);
    c.bezierCurveTo(700, 380, 860, 360, 940, 300);
    c.bezierCurveTo(980, 270, 990, 250, 990, 236);
    c.stroke();
    // 峽谷冒的煙、岩縫裡的紅光
    [[700, 146], [800, 186]].forEach(([sx, sy]) => {
      for (let k = 0; k < 4; k++) OA.soft(c, sx + k * 10, sy - k * 16, 14 + k * 7, 14 + k * 7, '226,216,214', 0.5 - k * 0.1);
    });
    OA.soft(c, 660, 258, 40, 10, '255,120,60', 0.5, 'lighter');
    OA.soft(c, 760, 270, 36, 9, '255,120,60', 0.45, 'lighter');
    // 海上的小船
    [[1300, 420], [1460, 520], [1230, 300]].forEach(([bx, by]) => {
      c.fillStyle = '#6a4a30';
      c.beginPath();
      c.ellipse(bx, by, 8, 2.5, 0, 0, Math.PI);
      c.fill();
      c.fillStyle = '#fbf8f0';
      c.beginPath();
      c.moveTo(bx, by - 2);
      c.lineTo(bx, by - 14);
      c.lineTo(bx + 8, by - 3);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(bx - 10, by + 2);
      c.lineTo(bx - 30, by + 5);
      c.stroke();
    });
    // 雲在地上的影子
    [[420, 250, 140], [860, 330, 120], [1340, 460, 160], [200, 520, 150]].forEach(([cx, cy, rr]) => OA.soft(c, cx, cy, rr, rr * 0.45, '30,50,80', 0.22));
    // 大霧（遠處淡掉）
    const hz = c.createLinearGradient(0, 20, 0, h * 0.6);
    hz.addColorStop(0, 'rgba(232,242,255,0.9)');
    hz.addColorStop(1, 'rgba(232,242,255,0)');
    c.fillStyle = hz;
    c.fillRect(0, 0, w, h);
    c.restore();
    c.setTransform(M);
  }

  // ── 各鏡頭的圖層定義 ──
  const DEFS = {
    ringA: { ox: -316, oy: -316, w: 632, h: 632, kmax: 1.2, draw: (c) => ringSprite(c, 300, '#fff0c0') },
    ringB: { ox: -206, oy: -206, w: 412, h: 412, kmax: 1.2, draw: (c) => ringSprite(c, 190, '#fff0c0') },
    ringC: { ox: -116, oy: -116, w: 232, h: 232, kmax: 1.2, draw: (c) => ringSprite(c, 100, '#fff0c0') },
    bandFar: {
      ox: 0, oy: -170, w: 1600, h: 470, kmax: 1.1,
      draw: (c) => cloudBand(c, 1600, 3, [
        { y: 20, jit: 40, n: 8, r: [50, 110], col: '#f4dcd8', hi: '#fcece6', shade: '#e4c6c6' },
        { y: 70, jit: 40, n: 11, r: [40, 90], col: '#fbe9dc', hi: '#fff8f0', shade: '#eed2c4' },
      ]),
    },
    bandMid: {
      ox: 0, oy: -170, w: 1600, h: 470, kmax: 1.1,
      draw: (c) => cloudBand(c, 1600, 8, [
        { y: 20, jit: 50, n: 7, r: [70, 130], col: '#fbe8dc', hi: '#fff6ee', shade: '#ecd0c4', rim: 8, sh: 26 },
        { y: 80, jit: 40, n: 9, r: [50, 100], col: '#fff3e6', hi: '#ffffff', shade: '#f0d6c6', rim: 8, sh: 24 },
      ]),
    },
    bandNear: {
      ox: 0, oy: -170, w: 1600, h: 470, kmax: 1.1,
      draw: (c) => cloudBand(c, 1600, 21, [
        { y: 30, jit: 50, n: 6, r: [90, 150], col: '#fff5ec', hi: '#ffffff', shade: '#f0d8cc', rim: 10, sh: 30 },
        { y: 100, jit: 40, n: 8, r: [60, 110], col: '#fffaf4', hi: '#ffffff', shade: '#f4e0d4', rim: 10, sh: 28 },
      ]),
    },
    isle: { fin: { grain: 0.18, fbm: 0.12 }, ox: -380, oy: -290, w: 760, h: 670, kmax: 2, draw: drawIsle },
    farIsles: {
      ox: 0, oy: 0, w: 1440, h: 560, kmax: 1.2,
      draw: (c) => {
        // 更遠的島：被空氣染成淡藍、幾乎化進天空
        OA.hazed(c, '196,214,240', 0.62, (x) => {
          [[440, 70, 60, 41], [930, 120, 54, 42], [40, 110, 44, 43], [1380, 330, 60, 44]].forEach(([px, py, w, seed]) => farIsle(x, px, py, w, seed, seed % 2 ? 'cols' : 'tree'));
        });
        // 零零星星的碎石
        OA.hazed(c, '206,220,240', 0.35, (x) => {
          const r = U.seeded(71);
          for (let i = 0; i < 16; i++) {
            const px = r() * 1440;
            const py = 80 + r() * 380;
            const rs = 4 + r() * 9;
            OA.chip(x, px, py, rs, 200 + i);
          }
        });
        // 近一點的島（還是隔著一層薄薄的空氣）
        OA.hazed(c, '214,224,242', 0.22, (x) => {
          farIsle(x, 150, 250, 120, 31, 'arch');
          farIsle(x, 1250, 200, 90, 32, 'tree');
          farIsle(x, 1060, 330, 56, 33, 'cols');
          farIsle(x, 330, 150, 50, 34, 'tree');
        });
      },
    },
    chunk: { ox: -40, oy: -30, w: 80, h: 90, kmax: 2, draw: (c) => isleRock(c, 56, 60, 91, { lw: 2, roots: false, gold: false }) },
    // 樹的鏡頭（中景）
    cyBack: {
      fin: { grain: 0.16, fbm: 0.12 },
      ...FULL, kmax: 1.4,
      draw: (c) => {
        // 遠方霧中的廢墟剪影
        // 霧裡遠遠的浮島與塔
        c.fillStyle = 'rgba(238,222,236,0.75)';
        [[380, 250, 90], [900, 230, 120], [700, 300, 50]].forEach(([x, y, w]) => {
          c.beginPath();
          c.ellipse(x, y, w / 2, w * 0.08, 0, 0, PI2);
          c.moveTo(x - w / 2, y);
          c.lineTo(x + w * 0.04, y + w * 0.62);
          c.lineTo(x + w / 2, y);
          c.fill();
          c.fillRect(x - w * 0.18, y - w * 0.4, w * 0.08, w * 0.4);
          c.fillRect(x + w * 0.1, y - w * 0.28, w * 0.07, w * 0.28);
        });
        c.fillStyle = 'rgba(236,226,240,0.9)';
        [[-20, 330, 26, 120], [60, 300, 24, 150], [1190, 310, 26, 140], [1270, 340, 22, 110]].forEach(([x, y, w, h]) => c.fillRect(x - w / 2, y, w, h));
        // 塔頂
        [[60, 300, 24], [1190, 310, 26]].forEach(([x, y, w]) => {
          c.beginPath();
          c.moveTo(x - w * 0.8, y);
          c.lineTo(x, y - w * 1.6);
          c.lineTo(x + w * 0.8, y);
          c.fill();
        });
        // 欄杆
        const railY = 440;
        paint(c, (p) => p.rect(-100, railY + 50, 1480, 60), '#efe6d6', { shade: '#dccfbc', shadeY: railY + 90, lw: 2.5 });
        for (let x = -90; x < 1380; x += 24) {
          if (x > 990 && x < 1080) continue;
          paint(c, (p) => {
            p.moveTo(x - 5, railY + 50);
            p.quadraticCurveTo(x - 10, railY + 34, x - 4, railY + 22);
            p.lineTo(x + 4, railY + 22);
            p.quadraticCurveTo(x + 10, railY + 34, x + 5, railY + 50);
            p.closePath();
          }, MARBLE, { shade: MARBLE_S, cel: [3, 0], lw: 1.8 });
        }
        paint(c, (p) => {
          p.moveTo(-100, railY + 10);
          p.lineTo(994, railY + 10);
          p.lineTo(1004, railY + 16);
          p.lineTo(990, railY + 24);
          p.lineTo(-100, railY + 24);
          p.closePath();
          p.moveTo(1380, railY + 10);
          p.lineTo(1082, railY + 10);
          p.lineTo(1074, railY + 18);
          p.lineTo(1086, railY + 24);
          p.lineTo(1380, railY + 24);
          p.closePath();
        }, MARBLE, { shade: MARBLE_S, shadeY: railY + 19, lw: 2 });
        paint(c, (p) => A.roundRect(p, 1010, railY + 40, 40, 12, 5), MARBLE, { shade: MARBLE_S, cel: [0, -3], lw: 2 });
        for (const x of [-60, 220, 500, 780, 1340]) {
          paint(c, (p) => p.rect(x - 11, railY - 4, 22, 56), MARBLE, { shade: MARBLE_S, cel: [6, 0], lw: 2 });
          paint(c, (p) => p.arc(x, railY - 10, 8, 0, PI2), GOLD, { shade: '#c08a2a', cel: [2, 2], lw: 1.8, hl: [x - 3, railY - 13, 2.5, 1.5] });
        }
        // 高大的柱子
        column(c, 60, 520, 48, 460, { ivy: 0.55, seed: 2 });
        column(c, 250, 520, 44, 240, { broken: true, seed: 5, crack: true });
        column(c, 1040, 520, 44, 290, { broken: true, seed: 6, ivy: 0.5 });
        column(c, 1220, 520, 48, 470, { seed: 8, crack: true });
        // 柱頂上斷掉的橫樑
        paint(c, (p) => {
          p.moveTo(1150, 34);
          p.lineTo(1400, 34);
          p.lineTo(1400, 62);
          p.lineTo(1170, 62);
          p.lineTo(1158, 54);
          p.lineTo(1164, 46);
          p.closePath();
        }, MARBLE, { shade: MARBLE_S, shadeY: 52, lw: 2.5 });
        c.fillStyle = A.c(GOLD);
        c.fillRect(1164, 40, 236, 3);
        paint(c, (p) => {
          p.moveTo(-100, 26);
          p.lineTo(140, 26);
          p.lineTo(126, 40);
          p.lineTo(138, 54);
          p.lineTo(-100, 54);
          p.closePath();
        }, MARBLE, { shade: MARBLE_S, shadeY: 44, lw: 2.5 });
        c.fillStyle = A.c(GOLD);
        c.fillRect(-100, 32, 230, 3);
        // 後方地坪
        paint(c, (p) => p.rect(-100, 548, 1480, 40), '#ece2d2', { lw: 0 });
      },
    },
    cyFloor: {
      fin: { grain: 0.18, fbm: 0.14 },
      ...FULL, oy: 548, h: 232, kmax: 1.4,
      draw: (c) => {
        const top = 560;
        const floor = (p) => p.rect(-100, top, 1480, 300);
        const g = c.createLinearGradient(0, top, 0, 780);
        g.addColorStop(0, '#efe5d4');
        g.addColorStop(1, '#f8f1e4');
        c.fillStyle = g;
        c.beginPath();
        floor(c);
        c.fill();
        c.save();
        c.beginPath();
        floor(c);
        c.clip();
        c.strokeStyle = 'rgba(150,118,86,0.3)';
        c.lineWidth = 2;
        for (const y of [574, 596, 626, 668, 726]) {
          c.beginPath();
          c.moveTo(-100, y);
          c.lineTo(1380, y);
          c.stroke();
        }
        for (let i = -6; i <= 6; i++) {
          c.beginPath();
          c.moveTo(640 + i * 110, top);
          c.lineTo(640 + i * 330, 790);
          c.stroke();
        }
        // 地上的時鐘紋（金色）
        c.strokeStyle = A.c(GOLD);
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(640, 640, 330, 52, 0, 0, PI2);
        c.stroke();
        c.lineWidth = 1.6;
        c.beginPath();
        c.ellipse(640, 640, 290, 44, 0, 0, PI2);
        c.stroke();
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * PI2;
          c.lineWidth = k % 2 ? 1.4 : 2.6;
          c.beginPath();
          c.moveTo(640 + Math.cos(a) * 292, 640 + Math.sin(a) * 45);
          c.lineTo(640 + Math.cos(a) * 326, 640 + Math.sin(a) * 51);
          c.stroke();
        }
        // 裂縫與苔
        c.strokeStyle = 'rgba(100,70,50,0.35)';
        c.lineWidth = 1.6;
        [[380, 600, 420, 612, 410, 640], [900, 590, 870, 610, 890, 630], [520, 700, 560, 690, 570, 720]].forEach(([a, b, d, e, f, g2]) => {
          c.beginPath();
          c.moveTo(a, b);
          c.lineTo(d, e);
          c.lineTo(f, g2);
          c.stroke();
        });
        [[260, 590, 60], [1010, 596, 70], [470, 740, 90], [860, 730, 80]].forEach(([x, y, w]) => {
          paint(c, (p) => p.ellipse(x, y, w, w * 0.16, 0, 0, PI2), '#a3cf7a', { shade: '#7fb05e', shadeY: y + w * 0.05, lw: 0 });
        });
        // 石板一塊一塊深淺不同
        const rf = U.seeded(314);
        const ys = [560, 574, 596, 626, 668, 726, 790];
        for (let j = 0; j + 1 < ys.length; j++) {
          for (let i = -6; i < 6; i++) {
            const v = rf();
            if (v > 0.5) continue;
            const u0 = (ys[j] - top) / (790 - top);
            const u1 = (ys[j + 1] - top) / (790 - top);
            const xa = (k, u) => 640 + k * lerp(110, 330, u);
            c.beginPath();
            quad(c, [[xa(i, u0), ys[j]], [xa(i + 1, u0), ys[j]], [xa(i + 1, u1), ys[j + 1]], [xa(i, u1), ys[j + 1]]]);
            c.fillStyle = v < 0.22 ? 'rgba(150,118,86,0.1)' : 'rgba(255,255,255,0.18)';
            c.fill();
          }
        }
        // 鐘紋外圈的刻字
        c.fillStyle = A.c('#c89a3a');
        for (let k = 0; k < 48; k++) {
          if (k % 4 === 0) continue;
          const a = (k / 48) * PI2;
          c.fillRect(640 + Math.cos(a) * 346 - 3, 640 + Math.sin(a) * 55 - 1, 6, 2);
        }
        // 磚縫裡的苔
        c.strokeStyle = 'rgba(110,170,90,0.55)';
        c.lineWidth = 2.5;
        c.lineCap = 'round';
        for (let i = 0; i < 18; i++) {
          const y = ys[1 + Math.floor(rf() * 5)];
          const x = rf() * 1280;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + 14 + rf() * 30, y);
          c.stroke();
        }
        // 掉在地上的葉子與花瓣
        for (let i = 0; i < 26; i++) {
          const x = rf() * 1280;
          const y = 575 + rf() * 200;
          const sz = 5 + (y - 560) * 0.04 + rf() * 4;
          const col = ['#f0a04a', '#e8864a', '#9ad886', '#ffc2d8', '#f2c85a'][i % 5];
          c.save();
          c.translate(x, y);
          c.rotate(rf() * 6);
          c.scale(1, 0.5);
          if (i % 5 === 3) paint(c, (p) => p.ellipse(0, 0, sz * 0.8, sz * 0.5, 0, 0, PI2), col, { lw: 1.2 });
          else paint(c, (p) => A.mapleLeafPath(p, 0, 0, sz), col, { shade: U.mix(col, '#6a3020', 0.25), cel: [sz * 0.2, sz * 0.2], lw: 1.4 });
          c.restore();
        }
        c.restore();
        c.strokeStyle = A.outline();
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(-100, top);
        c.lineTo(1380, top);
        c.stroke();
      },
    },
    treeTrunk: { ox: -330, oy: -330, w: 660, h: 380, kmax: 1.6, draw: (c) => starTree(c, 0.95, 'trunk') },
    treeCanopy: { ox: -380, oy: -690, w: 760, h: 460, kmax: 1.6, draw: (c) => starTree(c, 0.95, 'canopy') },
    cyFore: {
      fin: { grain: 0.16 },
      ...FULL, oy: 360, h: 420, kmax: 1.4,
      draw: (c) => {
        statue(c, 330, 606, 1.05, 1);
        statue(c, 950, 606, 1.05, -1);
        statue(c, 116, 690, 1.45, 1);
        statue(c, 1164, 690, 1.45, -1);
        [[40, 760], [220, 752], [420, 770], [700, 776], [880, 758], [1060, 768], [1250, 760]].forEach(([x, y], i) => grassTuft(c, x, y, 1.5 + (i % 2) * 0.3));
        [[250, 740, '#ffffff'], [300, 752, '#ffc2d8'], [990, 742, '#fff4a0'], [1030, 756, '#ffffff'], [560, 764, '#ffc2d8']].forEach(([x, y, col]) => flower(c, x, y, 1.4, col));
        // 台座腳邊的草、花和藤
        [[330, 608], [950, 608]].forEach(([x, y], i) => {
          for (let k = -2; k <= 2; k++) grassTuft(c, x + k * 30 + (k % 2) * 6, y + 2 + Math.abs(k) * 2, 0.8 + (k % 2 ? 0.2 : 0));
          flower(c, x - 50 + i * 100, y - 6, 1, i ? '#ffc2d8' : '#fff4a0');
          flower(c, x + 40 - i * 80, y - 2, 0.9, '#ffffff');
          ivy(c, x + (i ? 58 : -58), y - 60, 58, 40 + i, 16);
        });
        [[116, 690], [1164, 690]].forEach(([x, y], i) => {
          ivy(c, x + (i ? 80 : -80), y - 92, 84, 50 + i, 22);
          for (let k = -2; k <= 2; k++) grassTuft(c, x + k * 42, y + 4 + Math.abs(k) * 3, 1.1);
        });
      },
    },
    // 午睡的特寫
    napBack: {
      fin: { grain: 0.16, fbm: 0.12 },
      ...FULL, kmax: 1.3,
      draw: (c) => {
        const railY = 360;
        paint(c, (p) => p.rect(-100, railY + 70, 1480, 90), '#f2e9da', { shade: '#e2d6c4', shadeY: railY + 130, lw: 0 });
        c.globalAlpha = 0.9;
        for (let x = -90; x < 1400; x += 40) {
          paint(c, (p) => {
            p.moveTo(x - 8, railY + 70);
            p.quadraticCurveTo(x - 16, railY + 46, x - 6, railY + 30);
            p.lineTo(x + 6, railY + 30);
            p.quadraticCurveTo(x + 16, railY + 46, x + 8, railY + 70);
            p.closePath();
          }, '#f7f0e4', { shade: '#e4d8c6', cel: [5, 0], lw: 0 });
        }
        paint(c, (p) => p.rect(-100, railY + 10, 1480, 22), '#f7f0e4', { shade: '#e4d8c6', shadeY: railY + 24, lw: 0 });
        c.globalAlpha = 1;
        column(c, 1180, 460, 70, 560, { m: '#f5eee2', s: '#e0d4c2', lw: 2.5, ivy: 0.4, seed: 21 });
      },
    },
    napTree: {
      fin: { grain: 0.16 },
      ...FULL, kmax: 1.4,
      draw: (c) => {
        const top = 540;
        const g = c.createLinearGradient(0, top, 0, 780);
        g.addColorStop(0, '#ede2d0');
        g.addColorStop(1, '#faf3e6');
        c.fillStyle = g;
        c.fillRect(-100, top, 1480, 300);
        c.strokeStyle = 'rgba(150,118,86,0.28)';
        c.lineWidth = 2.5;
        for (const y of [566, 606, 668, 760]) {
          c.beginPath();
          c.moveTo(-100, y);
          c.lineTo(1380, y);
          c.stroke();
        }
        for (let i = -5; i <= 5; i++) {
          c.beginPath();
          c.moveTo(640 + i * 170, top);
          c.lineTo(640 + i * 520, 790);
          c.stroke();
        }
        c.strokeStyle = A.c(GOLD);
        c.lineWidth = 4;
        c.beginPath();
        c.ellipse(560, 700, 620, 90, 0, Math.PI * 1.05, Math.PI * 1.95);
        c.stroke();
        c.strokeStyle = A.outline();
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(-100, top);
        c.lineTo(1380, top);
        c.stroke();
        statue(c, 1090, 606, 1.45, -1);
        // 伸進樹冠的粗枝
        [[[440, 180, 60], [300, 60, 40], [150, -20, 26], [0, -60, 16]], [[470, 170, 50], [620, 40, 32], [780, -40, 20], [900, -90, 12]], [[455, 150, 40], [450, 20, 28], [430, -80, 16]]].forEach((L, i) => {
          OA.tube(c, OA.spline(L, 6), { pal: OA.TBARK, seed: 70 + i, bark: 0.8, lit: 0.8, ao: (u) => 0.25 + u * 0.35, rimA: 0.12, moss: 0.3 });
        });
        c.save();
        c.translate(470, 700);
        starTree(c, 2.25, 'trunk');
        c.restore();
        // 上方的樹冠底部（畫面上緣）：從下往上看的葉團，大部分背光，縫隙透著亮
        const cb = [[-60, 0, 150], [180, -40, 170], [420, -10, 150], [640, -60, 140], [840, -60, 110], [300, 90, 70], [560, 70, 60], [1010, -80, 90], [60, 80, 80], [760, 20, 70]];
        const napPal = OA.P([[0, '#061612'], [0.25, '#0d2f25'], [0.5, '#1f5234'], [0.72, '#3f7a36'], [0.88, '#86ae4a'], [1, '#e8eca0']]);
        OA.foliage(c, cb.map((b, i) => [b[0], b[1], b[2], i < 8 ? 0.4 : 0.9]), { pal: napPal, box: [-160, -160, 1110, 200], seed: 12, size: 13, density: 1.1, lit: 0.82, warm: 0.05, ao: 0.4, glow: 10, flat: true });
        const r = U.seeded(12);
        // 垂下來的細枝和葉子
        const M = c.getTransform();
        const lp = OA.leafPath('maple');
        [[120, 110, 90], [330, 150, 70], [520, 120, 110], [700, 70, 80], [930, 20, 90]].forEach(([x, y, len], i) => {
          const pts = [[x, y - 40, 3.2], [x + 12, y + len * 0.4, 2.4], [x + 6 - (i % 2) * 12, y + len, 1.2]];
          OA.tube(c, OA.spline(pts, 6), { pal: OA.TBARK, seed: 90 + i, bark: 0, rim: false, strands: 6 });
          const sp = OA.spline(pts, 8);
          for (let j = 0; j < 9; j++) {
            const q = sp[Math.floor((sp.length - 1) * (0.15 + j * 0.1))];
            const t = 0.35 + r() * 0.45;
            c.fillStyle = OA.rgb(OA.ramp(napPal, t));
            OA.dab(c, M, lp, q[0] + (j % 2 ? 8 : -8), q[1] + 4, 9 + r() * 5, Math.PI + (j % 2 ? 0.6 : -0.6) + (r() - 0.5) * 0.4);
          }
          c.setTransform(M);
        });
      },
    },
    napFront: {
      fin: { grain: 0.16 },
      ...FULL, oy: 560, h: 270, kmax: 1.4,
      draw: (c) => {
        [[700, 668, 1.5], [760, 674, 1.9], [860, 676, 1.8], [930, 666, 1.4], [640, 690, 1.3]].forEach(([x, y, s]) => grassTuft(c, x, y, s));
        [[690, 676, '#ffffff'], [900, 680, '#ffc2d8'], [950, 690, '#fff4a0']].forEach(([x, y, col]) => flower(c, x, y, 1.8, col));
        // 落在地上的普通楓葉
        [[1040, 700, '#f0a04a', 0.4], [360, 736, '#e8864a', -0.6], [1150, 742, '#f2b85a', 1.1]].forEach(([x, y, col, rot]) => {
          c.save();
          c.translate(x, y);
          c.rotate(rot);
          c.scale(1, 0.55);
          paint(c, (p) => A.mapleLeafPath(p, 0, 0, 18), col, { shade: U.mix(col, '#6a3020', 0.25), cel: [4, 4], lw: 2.4 });
          c.restore();
        });
        // 草地上的小東西：苜蓿、小石子、更多的花
        const r = U.seeded(33);
        for (let i = 0; i < 14; i++) {
          const x = 560 + r() * 520;
          const y = 670 + r() * 30;
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * PI2 - Math.PI / 2;
            paint(c, (p) => p.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 3, 4, 0, PI2), '#7cc462', { lw: 1.2 });
          }
        }
        [[600, 700, '#ffffff', 1.3], [980, 686, '#c8a8ff', 1.4], [1060, 694, '#ffffff', 1.2], [820, 700, '#fff4a0', 1.1], [1120, 710, '#ffc2d8', 1.5]].forEach(([x, y, col, sc]) => flower(c, x, y, sc, col));
        [[380, 720, 9], [420, 728, 6], [1180, 724, 8]].forEach(([x, y, rr]) => paint(c, (p) => p.ellipse(x, y, rr, rr * 0.5, 0, 0, PI2), '#d8cfc0', { shade: '#b0a390', cel: [0, -2], lw: 1.6 }));
        mushroom(c, 1000, 700, 1.1);
        grassTuft(c, 60, 790, 3.2, '#7cbc56', '#5a9a44');
        grassTuft(c, 1240, 800, 3.4, '#7cbc56', '#5a9a44');
      },
    },
    // 墜落
    lands: { fin: { grain: 0.14 }, ox: 0, oy: 0, w: 1600, h: 620, kmax: 1.2, draw: drawLands },
    puffA: { ox: -270, oy: -120, w: 540, h: 230, kmax: 1.1, draw: (c) => puff(c, 480, 190, 1, ['#ffffff', '#ffffff', '#d8e8f8']) },
    puffB: { ox: -180, oy: -80, w: 360, h: 160, kmax: 1.1, draw: (c) => puff(c, 320, 130, 2, ['#f6fbff', '#ffffff', '#cfe0f4']) },
    puffC: { ox: -120, oy: -56, w: 240, h: 110, kmax: 1.1, draw: (c) => puff(c, 210, 90, 3, ['#eef6fe', '#ffffff', '#c6d8f0']) },
    // 醒來的森林
    fwFar: {
      ...FULL, oy: 110, h: 670, kmax: 1.1,
      draw: (c) => {
        const LW = OA.light(0.55, -0.6, 0.6);
        const far = OA.P([[0, '#48705e'], [0.5, '#7aa276'], [1, '#d4e8b4']]);
        // 霧裡兩排遠樹：越遠越淡、越藍
        [[330, 0.46, '206,230,222', 64, 46], [400, 0.24, '200,226,204', 78, 58]].forEach(([y, haze, air, rMax, gap], row) => {
          OA.hazed(c, air, haze, (x) => {
            const r = U.seeded(5 + row);
            // 樹幹
            for (let i = 0; i < 12; i++) {
              const tx = -60 + i * 125 + r() * 60;
              x.fillStyle = OA.rgb(OA.ramp(far, 0.25 + r() * 0.2));
              x.fillRect(tx - 5 - row * 3, y - 40, 10 + row * 6, 460);
            }
            const cls = [];
            for (let tx = -120; tx < 1420; tx += gap * (0.8 + r() * 0.6)) {
              for (let k = 0; k < 3; k++) cls.push([tx + (r() - 0.5) * 40, y - 30 + (r() - 0.5) * 70 - k * 30, rMax * (0.6 + r() * 0.5), r()]);
            }
            OA.foliage(x, cls, { pal: far, leaf: 'oval', size: 19, density: 0.9, box: [-120, y - 140, 1420, y + 60], seed: 30 + row, L: LW, ao: 0.25, jit: 0.1 });
            // 林下的草叢
            x.fillStyle = OA.rgb(OA.ramp(far, 0.62));
            x.fillRect(-120, y + 70, 1560, 500);
          });
        });
        // 光柱照進林子裡的暖光
        OA.soft(c, 760, 380, 420, 260, '255,244,200', 0.3);
        // 地面的霧
        const g = c.createLinearGradient(0, 420, 0, 620);
        g.addColorStop(0, 'rgba(230,242,226,0)');
        g.addColorStop(0.5, 'rgba(230,242,226,0.35)');
        g.addColorStop(1, 'rgba(220,236,214,0.2)');
        c.fillStyle = g;
        c.fillRect(-100, 420, 1500, 360);
      },
    },
    fwMid: {
      fin: { grain: 0.12 },
      ...FULL, kmax: 1.3,
      draw: (c) => {
        const LW = OA.light(0.55, -0.6, 0.6);
        const fpal = OA.P([[0, '#0a1c14'], [0.25, '#16372a'], [0.5, '#2f6a38'], [0.72, '#5e9a40'], [0.9, '#b0cc62'], [1, '#f0eeaa']]);
        const bpal = OA.P([[0, '#15100c'], [0.25, '#2e2720'], [0.5, '#544a3c'], [0.75, '#857a64'], [1, '#c8bea0']]);
        // 後面的樹冠（樹幹後方）
        OA.foliage(c, [[-60, 30, 170, 0.2], [150, -20, 150, 0.3], [330, 20, 120, 0.2], [480, -30, 110, 0.3], [1360, 50, 170, 0.2], [1190, 0, 130, 0.25], [1060, -30, 100, 0.3]], { pal: fpal, leaf: 'oval', size: 12, density: 1.2, box: [-200, -150, 1500, 260], seed: 41, L: LW, ao: 0.3, lit: 0.85, air: [OA.hex('#b8d0c0'), 0.35] });
        // 樹幹
        [[170, 44, -0.04], [400, 34, 0.03], [1010, 38, -0.02], [1230, 52, 0.04]].forEach(([x, w, lean], i) => {
          const top = [x + lean * 800, -80, w * 0.42];
          OA.tube(c, OA.spline([[x, 660, w * 0.9], [x + lean * 60, 600, w * 0.6], [x + lean * 300, 300, w * 0.52], top], 8), { pal: bpal, L: LW, seed: 300 + i, bark: 0.9, moss: 0.5, mossAt: (u) => u < 0.4, knots: 1, gnarl: 0.15, ao: (u) => (u < 0.08 ? 0.3 : 0) + (u > 0.7 ? (u - 0.7) * 1 : 0) });
          // 層孔菌
          [[470, 1], [440, 0.7]].forEach(([fy, fs]) => {
            const fx = x + w * 0.45 + lean * (700 - fy);
            c.save();
            c.beginPath();
            c.ellipse(fx, fy, 14 * fs, 6 * fs, 0, Math.PI, 0);
            const g = c.createLinearGradient(0, fy - 6 * fs, 0, fy);
            g.addColorStop(0, '#f2dcb0');
            g.addColorStop(1, '#a8845a');
            c.fillStyle = g;
            c.fill();
            c.fillStyle = 'rgba(60,40,20,0.35)';
            c.fillRect(fx - 14 * fs, fy - 1.5, 28 * fs, 1.5);
            c.restore();
          });
        });
        // 樹叢
        OA.foliage(c, [[40, 620, 70, 0.6], [150, 600, 60, 0.7], [270, 630, 70, 0.6], [920, 616, 66, 0.6], [1060, 600, 70, 0.7], [1190, 626, 80, 0.6], [1330, 610, 70, 0.7], [-20, 640, 60, 0.9], [210, 650, 50, 0.9], [980, 650, 50, 0.9], [1270, 650, 60, 0.9]], { pal: fpal, leaf: 'oval', size: 8, density: 1.5, box: [-100, 520, 1400, 700], seed: 43, L: LW, ao: 0.35, warm: 0.03 });
        // 上方的樹冠（留出中間偏右的天空）
        OA.foliage(c, [[60, 170, 100, 0.7], [250, 140, 86, 0.8], [560, 30, 70, 0.7], [400, 110, 70, 0.8], [-40, 120, 110, 0.6], [1260, 200, 96, 0.8], [1120, 120, 72, 0.7], [1010, 40, 60, 0.8], [1360, 150, 100, 0.6]], { pal: fpal, leaf: 'oval', size: 11, density: 1.4, box: [-200, -150, 1500, 280], seed: 45, L: LW, ao: 0.4, glow: 0, flat: true });
        // 垂下來的藤
        const M = c.getTransform();
        const lp = OA.leafPath('oval');
        [[520, 60, 260, 3], [590, 40, 180, 4], [1040, 70, 230, 5]].forEach(([x, y, len, seed]) => {
          const r = U.seeded(seed);
          const pts = [];
          for (let k = 0; k <= 10; k++) pts.push([x + Math.sin(k * 0.7 + seed) * 8, y + (len * k) / 10]);
          c.strokeStyle = 'rgba(40,56,30,0.9)';
          c.lineWidth = 2;
          c.beginPath();
          pts.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
          c.stroke();
          for (let k = 0; k < 26; k++) {
            const q = pts[Math.floor(r() * 10)];
            c.fillStyle = OA.rgb(OA.ramp(fpal, 0.35 + r() * 0.5));
            OA.dab(c, M, lp, q[0] + (r() - 0.5) * 14, q[1] + r() * 20, 4 + r() * 3, r() * 6);
          }
          c.setTransform(M);
        });
      },
    },
    fwFront: {
      fin: { grain: 0.14 },
      ...FULL, kmax: 1.4,
      draw: (c) => {
        c.translate(0, -30);
        const LW = OA.light(0.55, -0.6, 0.6);
        const gpal = OA.P([[0, '#17301a'], [0.25, '#2e5a22'], [0.5, '#548a32'], [0.72, '#8cbc46'], [0.9, '#c8de74'], [1, '#f8f4b8']]);
        // 長滿苔的地面
        const ground = (p) => {
          p.moveTo(-100, 660);
          p.bezierCurveTo(200, 610, 420, 612, 640, 626);
          p.bezierCurveTo(880, 640, 1100, 620, 1380, 656);
          p.lineTo(1380, 800);
          p.lineTo(-100, 800);
          p.closePath();
        };
        c.save();
        c.beginPath();
        ground(c);
        const gg = c.createLinearGradient(0, 610, 0, 800);
        gg.addColorStop(0, '#76a43e');
        gg.addColorStop(0.4, '#4e7e2e');
        gg.addColorStop(1, '#2c4e1e');
        c.fillStyle = gg;
        c.fill();
        c.clip();
        // 光柱照到的那一塊地比較亮
        OA.soft(c, 760, 690, 420, 90, '236,240,150', 0.55);
        OA.texture(c, -100, 600, 1500, 220, { fbm: 0.6, grain: 0.3, scale: 0.8 });
        c.restore();
        // 一片片草葉（光從右上來、光柱裡最亮）
        {
          const r = U.seeded(19);
          const M = c.getTransform();
          const bl = OA.leafPath('blade');
          const gy = (x) => (x < 640 ? 660 - Math.sin(((x + 100) / 740) * Math.PI) * 40 : 630 + Math.sin(((x - 640) / 740) * Math.PI) * 6);
          for (let i = 0; i < 2300; i++) {
            const x = -100 + r() * 1480;
            const top = gy(x);
            const v = Math.pow(r(), 1.3);
            const y = top + 4 + v * (800 - top);
            const near = (y - top) / (800 - top);
            const sun = Math.max(0, 1 - Math.hypot((x - 760) / 460, (y - 690) / 110));
            const t = Math.max(0, Math.min(1, 0.38 + sun * 0.45 + (r() - 0.5) * 0.35 - near * 0.1));
            c.fillStyle = OA.rgb(OA.ramp(gpal, t));
            const sz = 6 + near * 12 + r() * 5;
            OA.dab(c, M, bl, x, y - sz * 0.8, sz, (r() - 0.5) * 0.7);
          }
          c.setTransform(M);
        }
        // 左邊的大樹
        OA.tube(c, OA.spline([[20, 720, 150], [10, 640, 110], [0, 420, 96], [-10, 180, 92], [-20, -80, 90]], 8), { pal: OA.P([[0, '#120c08'], [0.25, '#2a2018'], [0.5, '#4e4232'], [0.75, '#7c6e56'], [1, '#bcae8c']]), L: LW, seed: 88, bark: 1, moss: 0.6, mossAt: (u) => u < 0.5, knots: 1, gnarl: 0.12, ao: (u) => (u < 0.1 ? 0.4 : 0) });
        // 右邊的長苔石頭
        OA.boulder(c, 1150, 664, 132, 80, 17, { L: LW, moss: true });
        // 香菇、花、蕨
        mushroom(c, 1010, 664, 1.4);
        mushroom(c, 1044, 670, 1.0);
        mushroom(c, 176, 668, 1.1);
        [[300, 690, '#ffffff'], [340, 702, '#fff4a0'], [780, 680, '#ffc2d8'], [820, 700, '#ffffff'], [930, 694, '#fff4a0'], [460, 720, '#ffc2d8']].forEach(([x, y, col]) => flower(c, x, y, 1.5, col));
        [[250, 668, -1], [880, 664, 1]].forEach(([x, y, d]) => {
          for (let f = 0; f < 3; f++) {
            const a = -Math.PI / 2 + d * (f - 1) * 0.5;
            const len = 70 - Math.abs(f - 1) * 14;
            const ex = x + Math.cos(a) * len;
            const ey = y + Math.sin(a) * len;
            c.strokeStyle = A.c('#4f8e44');
            c.lineWidth = 2.4;
            c.beginPath();
            c.moveTo(x, y);
            c.quadraticCurveTo(x + Math.cos(a) * len * 0.6 + d * 14, y + Math.sin(a) * len * 0.6, ex, ey);
            c.stroke();
            for (let j = 1; j < 7; j++) {
              const u = j / 7;
              const px = lerp(x, ex, u);
              const py = lerp(y, ey, u);
              paint(c, (p) => p.ellipse(px, py, 8 * (1 - u * 0.6), 3.4 * (1 - u * 0.5), a + 1.2, 0, PI2), '#72b45c', { lw: 1.5 });
              paint(c, (p) => p.ellipse(px, py, 8 * (1 - u * 0.6), 3.4 * (1 - u * 0.5), a - 1.2, 0, PI2), '#62a450', { lw: 1.5 });
            }
          }
        });
        [[520, 790], [690, 800], [1300, 790], [380, 800]].forEach(([x, y], i) => grassTuft(c, x, y, 2 + (i % 2) * 0.4, '#86c45a', '#5f9a44'));
        // 地面的細節：一撮一撮的細草、苜蓿、小石子、落葉、會發光的小藍菇
        const rg = U.seeded(77);
        const groundY = (x) => (x < 640 ? 660 - Math.sin((x + 100) / 740 * Math.PI) * 40 : 630 + Math.sin((x - 640) / 740 * Math.PI) * 6);
        c.lineCap = 'round';
        for (let i = 0; i < 90; i++) {
          const x = 120 + rg() * 1180;
          const y = groundY(x) + 8 + rg() * 110;
          const hgt = 8 + rg() * 12 * (1 + (y - 620) / 200);
          c.strokeStyle = A.c(i % 3 ? '#5f9a44' : '#a6dc78');
          c.lineWidth = 1.8;
          c.beginPath();
          c.moveTo(x, y);
          c.quadraticCurveTo(x + 1, y - hgt * 0.6, x + (rg() - 0.5) * 8, y - hgt);
          c.moveTo(x + 3, y);
          c.quadraticCurveTo(x + 4, y - hgt * 0.5, x + 6 + rg() * 4, y - hgt * 0.8);
          c.stroke();
        }
        for (let i = 0; i < 10; i++) {
          const x = 180 + rg() * 1000;
          const y = groundY(x) + 30 + rg() * 90;
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * PI2 - Math.PI / 2;
            paint(c, (p) => p.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 3.5, 5, 0, PI2), '#7cc462', { shade: '#5f9a44', cel: [0, 2], lw: 1.3 });
          }
        }
        for (let i = 0; i < 12; i++) {
          const x = 150 + rg() * 1100;
          const y = groundY(x) + 20 + rg() * 100;
          const rr = 3 + rg() * 5;
          paint(c, (p) => p.ellipse(x, y, rr * 1.4, rr * 0.8, 0, 0, PI2), '#c8c4c0', { shade: '#a4a09c', cel: [0, -rr * 0.3], lw: 1.4 });
        }
        for (let i = 0; i < 9; i++) {
          const x = 150 + rg() * 1100;
          const y = groundY(x) + 30 + rg() * 90;
          const col = ['#f0a04a', '#9ad886', '#e8864a'][i % 3];
          c.save();
          c.translate(x, y);
          c.rotate(rg() * 6);
          c.scale(1, 0.5);
          paint(c, (p) => A.mapleLeafPath(p, 0, 0, 9 + rg() * 5), col, { shade: U.mix(col, '#6a3020', 0.25), cel: [2, 2], lw: 1.6 });
          c.restore();
        }
        // 發光的小藍菇（大石頭旁、左邊樹根下）
        [[1068, 648, 0.8], [1086, 652, 0.6], [140, 676, 0.7], [118, 680, 0.55]].forEach(([x, y, sc]) => {
          haze(c, x, y - 12 * sc, 30 * sc, '140,210,255', 0.6);
          paint(c, (p) => A.roundRect(p, x - 2.5 * sc, y - 12 * sc, 5 * sc, 12 * sc, 2 * sc), '#eaf6ff', { lw: 1.4 });
          paint(c, (p) => {
            p.moveTo(x - 10 * sc, y - 10 * sc);
            p.quadraticCurveTo(x, y - 26 * sc, x + 10 * sc, y - 10 * sc);
            p.closePath();
          }, '#8fd4ff', { shade: '#5aa8e2', cel: [2, 2], lw: 1.4, hl: [x - 3 * sc, y - 17 * sc, 2.5 * sc, 1.4 * sc] });
        });
      },
    },
  };

  // ── 前景的大葉子與蕨（畫面角落，比地面更近）──
  function bigLeaf(c, x, y, len, ang, col, dark) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    const wd = len * 0.36;
    const shape = (p) => {
      p.moveTo(0, 0);
      p.bezierCurveTo(wd, -len * 0.15, wd * 1.1, -len * 0.7, 0, -len);
      p.bezierCurveTo(-wd * 1.1, -len * 0.7, -wd, -len * 0.15, 0, 0);
      p.closePath();
    };
    paint(c, shape, col, { shade: dark, cel: [wd * 0.35, 0], lw: 3.2, hl: [-wd * 0.35, -len * 0.62, wd * 0.18, len * 0.1, 0.3], hlA: 0.25 });
    c.strokeStyle = A.c(dark);
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, -2);
    c.quadraticCurveTo(wd * 0.1, -len * 0.5, 0, -len * 0.94);
    c.stroke();
    c.lineWidth = 1.5;
    for (let k = 1; k < 7; k++) {
      const u = k / 7.5;
      const yy = -len * u;
      const sp = wd * Math.sin(u * Math.PI) * 0.85;
      c.beginPath();
      c.moveTo(0, yy);
      c.quadraticCurveTo(sp * 0.5, yy - len * 0.03, sp, yy - len * 0.09);
      c.moveTo(0, yy);
      c.quadraticCurveTo(-sp * 0.5, yy - len * 0.03, -sp, yy - len * 0.09);
      c.stroke();
    }
    c.restore();
  }
  function frond(c, x, y, len, ang, col, dark) {
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    const cx = x + Math.cos(ang) * len * 0.6 + Math.cos(ang + 1.57) * len * 0.12;
    const cy = y + Math.sin(ang) * len * 0.6 + Math.sin(ang + 1.57) * len * 0.12;
    c.strokeStyle = A.c(dark);
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(cx, cy, ex, ey);
    c.stroke();
    for (let j = 1; j < 11; j++) {
      const u = j / 11;
      const px = (1 - u) * (1 - u) * x + 2 * (1 - u) * u * cx + u * u * ex;
      const py = (1 - u) * (1 - u) * y + 2 * (1 - u) * u * cy + u * u * ey;
      const l = len * 0.16 * (1 - u * 0.7);
      [1, -1].forEach((sd) => {
        const a = ang + sd * 1.1;
        paint(c, (p) => p.ellipse(px + Math.cos(a) * l * 0.5, py + Math.sin(a) * l * 0.5, l * 0.55, l * 0.2, a, 0, PI2), sd > 0 ? col : dark, { lw: 1.4 });
      });
    }
  }
  function forestCorner(c, side) {
    const x0 = side < 0 ? -40 : 1320;
    const col = '#4f9a50';
    const dark = '#346c3c';
    frond(c, x0 - side * 20, 790, 300, side < 0 ? -1.15 : -2.0, '#5aa656', dark);
    frond(c, x0 + side * 10, 790, 240, side < 0 ? -0.7 : -2.45, '#5aa656', dark);
    bigLeaf(c, x0 - side * 30, 800, 300, -side * 0.5, col, dark);
    bigLeaf(c, x0 - side * 170, 820, 200, -side * 0.12, '#5aa656', dark);
    bigLeaf(c, x0 - side * 10, 800, 220, -side * 0.95, '#468c48', dark);
    // 葉子上的露珠
    [[0.3, 0.6], [0.55, 0.45]].forEach(([u, v]) => {
      const dx = x0 - side * (40 + u * 160);
      const dy = 790 - v * 240;
      paint(c, (p) => p.arc(dx, dy, 4, 0, PI2), '#e8f8ff', { lw: 1.2, hl: [dx - 1.5, dy - 1.5, 1.2, 1] });
    });
  }

  // ════════ 王座廳（一百年前） ════════
  // 一點透視：X 左右、Y 高度（鏡頭高 = 1）、d 深度。地面上的點 → 畫面座標
  const TH = { vx: 590, hz: 232, x: 790, y: 510, s: 2.3, d: 1.15 };
  TH.X0 = ((TH.x - TH.vx) * TH.d) / 400;
  const thP = (X, Y, d) => [TH.vx + (400 * X) / d, TH.hz + (400 * (1 - Y)) / d];
  const TH_HAZE = '#8391aa';
  const TH_LINE = '#1c2230';
  const STONE = '#8a91a1';
  const STONE_S = '#5f6676';
  function quad(c, pts) {
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
  }
  // 霧：顏色往霧色混
  const fogC = (col, a) => U.mix(col, TH_HAZE, a);

  // 大廳的柱子：台基、有凹槽的柱身、雕花的柱頭（a = 霧的濃度）
  function thPillar(c, x, base, w, h, a, seed) {
    const lw = Math.max(1, Math.min(3, w * 0.05));
    const line = fogC(TH_LINE, a * 0.8);
    const M = fogC('#6f7789', a);
    const S = fogC('#4a5162', a);
    const Hi = fogC('#98a1b4', a);
    const top = base - h;
    const r = U.seeded(seed);
    // 兩層台基
    paint(c, (p) => p.rect(x - w * 0.8, base - w * 0.22, w * 1.6, w * 0.22), fogC('#737b8d', a), { shade: S, cel: [w * 0.34, 0], lw, line });
    paint(c, (p) => A.roundRect(p, x - w * 0.66, base - w * 0.46, w * 1.32, w * 0.25, w * 0.1), fogC('#7a8294', a), { shade: S, cel: [w * 0.3, 0], lw, line });
    // 柱身
    const sy0 = top + w * 0.62;
    const sy1 = base - w * 0.46;
    paint(c, (p) => p.rect(x - w / 2, sy0, w, sy1 - sy0), M, { shade: S, cel: [w * 0.34, 0], lw, line });
    c.save();
    c.beginPath();
    c.rect(x - w / 2, sy0, w, sy1 - sy0);
    c.clip();
    // 凹槽：每一條都是暗線＋亮線（光從左上來）
    const fa = 1 - a;
    for (let k = -2; k <= 2; k++) {
      const fx = x + k * w * 0.19;
      c.strokeStyle = 'rgba(20,26,38,' + (0.34 * fa).toFixed(3) + ')';
      c.lineWidth = Math.max(1, w * 0.05);
      c.beginPath();
      c.moveTo(fx, sy0);
      c.lineTo(fx, sy1);
      c.stroke();
      c.strokeStyle = 'rgba(190,202,226,' + (0.16 * fa).toFixed(3) + ')';
      c.lineWidth = Math.max(0.8, w * 0.03);
      c.beginPath();
      c.moveTo(fx - w * 0.05, sy0);
      c.lineTo(fx - w * 0.05, sy1);
      c.stroke();
    }
    // 左緣的一道天光
    c.fillStyle = 'rgba(170,190,225,' + (0.18 * fa).toFixed(3) + ')';
    c.fillRect(x - w / 2, sy0, w * 0.12, sy1 - sy0);
    // 往下越暗
    const g = c.createLinearGradient(0, sy0, 0, sy1);
    g.addColorStop(0, 'rgba(8,10,18,0.25)');
    g.addColorStop(0.3, 'rgba(8,10,18,0)');
    g.addColorStop(0.8, 'rgba(8,10,18,0)');
    g.addColorStop(1, 'rgba(8,10,18,' + (0.3 * fa).toFixed(3) + ')');
    c.fillStyle = g;
    c.fillRect(x - w / 2, sy0, w, sy1 - sy0);
    // 裂縫（兩道，一道有分岔）
    c.strokeStyle = 'rgba(16,20,30,' + (0.55 * fa).toFixed(3) + ')';
    c.lineWidth = Math.max(1, w * 0.04);
    for (let n = 0; n < 2; n++) {
      let cx = x - w / 2 + (n ? w : 0);
      let cy = base - h * (0.2 + r() * 0.55);
      c.beginPath();
      c.moveTo(cx, cy);
      for (let i = 1; i <= 4; i++) {
        cx += (n ? -1 : 1) * w * (0.12 + r() * 0.1);
        cy += (r() - 0.3) * w * 0.45;
        c.lineTo(cx, cy);
      }
      c.stroke();
    }
    // 底部的苔與水漬
    if (a < 0.6) {
      c.fillStyle = fogC('#4d6a55', a);
      for (let i = 0; i < 6; i++) {
        const mx = x - w / 2 + r() * w;
        const mh = w * (0.08 + r() * 0.22);
        c.beginPath();
        c.ellipse(mx, sy1 - mh * 0.2, w * (0.05 + r() * 0.07), mh * 0.5, 0, 0, PI2);
        c.fill();
      }
      c.fillStyle = 'rgba(10,14,22,' + (0.18 * fa).toFixed(3) + ')';
      for (let i = 0; i < 3; i++) c.fillRect(x - w * 0.4 + r() * w * 0.7, sy0 + (sy1 - sy0) * r() * 0.5, Math.max(1, w * 0.04), (sy1 - sy0) * (0.2 + r() * 0.3));
    }
    c.restore();
    // 柱頭：頸圈、外擴的鐘形、一圈石葉、頂板
    paint(c, (p) => p.rect(x - w * 0.56, sy0 - w * 0.1, w * 1.12, w * 0.12), fogC('#7d8597', a), { shade: S, cel: [w * 0.3, 0], lw, line });
    const bell = (p) => {
      p.moveTo(x - w * 0.52, sy0 - w * 0.1);
      p.quadraticCurveTo(x - w * 0.6, top + w * 0.2, x - w * 0.82, top + w * 0.12);
      p.lineTo(x + w * 0.82, top + w * 0.12);
      p.quadraticCurveTo(x + w * 0.6, top + w * 0.2, x + w * 0.52, sy0 - w * 0.1);
      p.closePath();
    };
    paint(c, bell, fogC('#737b8d', a), { shade: S, cel: [w * 0.3, 0], lw, line });
    if (w > 16) {
      // 雕出來的葉子（一排往上捲的尖葉）
      for (let k = -2; k <= 2; k++) {
        const lx = x + k * w * 0.3;
        const ly = sy0 - w * 0.1;
        const lh = w * (k === 0 ? 0.42 : 0.34);
        paint(c, (p) => {
          p.moveTo(lx - w * 0.12, ly);
          p.quadraticCurveTo(lx - w * 0.14, ly - lh * 0.7, lx + k * w * 0.04, ly - lh);
          p.quadraticCurveTo(lx + w * 0.14, ly - lh * 0.7, lx + w * 0.12, ly);
          p.closePath();
        }, fogC(k < 0 ? '#8a93a6' : '#7a8295', a), { lw: lw * 0.7, line });
        c.strokeStyle = 'rgba(20,26,38,' + (0.4 * fa).toFixed(3) + ')';
        c.lineWidth = Math.max(0.7, lw * 0.5);
        c.beginPath();
        c.moveTo(lx, ly - 1);
        c.lineTo(lx + k * w * 0.03, ly - lh * 0.8);
        c.stroke();
      }
      // 角落的渦卷
      [-1, 1].forEach((sd) => {
        c.strokeStyle = line;
        c.lineWidth = Math.max(1, lw * 0.8);
        c.beginPath();
        c.arc(x + sd * w * 0.7, top + w * 0.24, w * 0.1, 0, PI2 * 0.8);
        c.stroke();
      });
    }
    paint(c, (p) => p.rect(x - w * 0.9, top - w * 0.04, w * 1.8, w * 0.18), fogC('#848c9e', a), { shade: S, cel: [w * 0.34, 0], lw, line });
    c.fillStyle = Hi;
    c.globalAlpha = 0.5 * fa;
    c.fillRect(x - w * 0.9, top - w * 0.04, w * 1.8, Math.max(1, w * 0.04));
    c.globalAlpha = 1;
  }

  // 一整列的石獅（過去的守葉獸）。臉跟小獅子一樣
  const TH_POSE = [
    { state: 'idle', t: 0.05, p: 0 },
    { state: 'roar', t: 0.05, p: 0.1 },
    { state: 'idle', t: 0.05, p: 0, rot: 0.07 },
    { state: 'idle', t: 0.05, p: 0, sq: 0.94 },
    { state: 'cast', t: 0.05, p: 0.05, rot: -0.04 },
  ];
  function thStatue(c, x, base, sc, dir, a, i) {
    const lw = Math.max(1, Math.min(2.6, sc * 0.013));
    const line = fogC(TH_LINE, a * 0.8);
    const pw = 0.72 * sc;
    const ph = 0.3 * sc;
    const S = fogC('#4d5465', a);
    paint(c, (p) => p.rect(x - pw / 2 - pw * 0.06, base - ph * 0.16, pw * 1.12, ph * 0.16), fogC('#737b8d', a), { shade: S, cel: [pw * 0.2, 0], lw, line });
    paint(c, (p) => p.rect(x - pw / 2, base - ph, pw, ph * 0.84), fogC('#6c7486', a), { shade: S, cel: [pw * 0.22, 0], lw, line });
    paint(c, (p) => p.rect(x - pw / 2 - pw * 0.08, base - ph - ph * 0.16, pw * 1.16, ph * 0.16), fogC('#838b9c', a), { shade: S, cel: [pw * 0.2, 0], lw, line });
    // 台座上的刻痕與苔
    c.strokeStyle = 'rgba(18,22,32,' + (0.45 * (1 - a)).toFixed(3) + ')';
    c.lineWidth = lw * 0.7;
    c.beginPath();
    c.moveTo(x + pw * 0.28 * dir, base - ph);
    c.lineTo(x + pw * 0.2 * dir, base - ph * 0.62);
    c.lineTo(x + pw * 0.32 * dir, base - ph * 0.35);
    c.stroke();
    c.save();
    c.globalAlpha = 1 - a * 0.7;
    c.beginPath();
    A.mapleLeafPath(c, x, base - ph * 0.55, ph * 0.22);
    c.strokeStyle = 'rgba(190,205,230,0.35)';
    c.lineWidth = lw * 0.6;
    c.stroke();
    c.restore();
    for (let j = 0; j < 3; j++) {
      const mx = x - dir * (pw * 0.46 - j * pw * 0.13);
      paint(c, (p) => p.ellipse(mx, base - ph - ph * 0.16, pw * 0.08, pw * (0.03 + (j % 2) * 0.02), 0, 0, Math.PI), fogC(j % 2 ? '#5f7a62' : '#546e58', a), { lw: lw * 0.6, line });
    }
    if (a < 0.7) {
      const fa = 1 - a;
      const rr = U.seeded(i * 13 + 5);
      // 苔從頂板往下流
      c.fillStyle = fogC('#4f6a58', a);
      for (let j = 0; j < 4; j++) {
        const mx = x - pw * 0.44 + rr() * pw * 0.88;
        const mh = ph * (0.12 + rr() * 0.4);
        A.roundRect(c, mx - pw * 0.018, base - ph - 1, pw * 0.036, mh, pw * 0.018);
        c.fill();
      }
      // 缺角
      c.fillStyle = 'rgba(12,16,24,' + (0.6 * fa).toFixed(3) + ')';
      c.beginPath();
      c.moveTo(x - dir * pw * 0.58, base - ph - ph * 0.16);
      c.lineTo(x - dir * pw * 0.44, base - ph - ph * 0.16);
      c.lineTo(x - dir * pw * 0.52, base - ph - ph * 0.02);
      c.lineTo(x - dir * pw * 0.5, base - ph + ph * 0.08);
      c.lineTo(x - dir * pw * 0.5, base - ph);
      c.closePath();
      c.fill();
      // 名牌：刻著名字的地方被磨平了
      c.strokeStyle = 'rgba(16,20,30,' + (0.5 * fa).toFixed(3) + ')';
      c.lineWidth = lw * 0.6;
      c.strokeRect(x - pw * 0.3, base - ph * 0.3, pw * 0.6, ph * 0.16);
      c.fillStyle = 'rgba(190,205,230,' + (0.14 * fa).toFixed(3) + ')';
      for (let j = 0; j < 5; j++) c.fillRect(x - pw * 0.24 + j * pw * 0.1, base - ph * 0.24, pw * 0.06, ph * 0.04);
      // 第二道裂縫
      c.strokeStyle = 'rgba(18,22,32,' + (0.4 * fa).toFixed(3) + ')';
      c.beginPath();
      c.moveTo(x - dir * pw * 0.2, base - ph * 0.16);
      c.lineTo(x - dir * pw * 0.26, base - ph * 0.4);
      c.lineTo(x - dir * pw * 0.14, base - ph * 0.56);
      c.stroke();
    }
    // 石頭獅子：先畫到小畫布，染成石色，再蓋一層霧
    const P = TH_POSE[i % TH_POSE.length];
    const k = IX.bk;
    const ls = sc * 0.0105;
    const tw = 140 * ls;
    const th = 120 * ls;
    const tc = newCv(tw * k, th * k);
    const x2 = tc.getContext('2d');
    x2.scale(k, k);
    const m0 = A.mode;
    const mc = A.modeColor;
    const ma = A.modeAmt;
    A.mode = 'tint';
    A.modeColor = '#9aa2b3';
    A.modeAmt = 0.95;
    try {
      x2.save();
      x2.translate(tw / 2, th - 3 * ls);
      if (P.rot) x2.rotate(P.rot * dir);
      x2.scale(ls, ls * (P.sq || 1));
      A.drawLion(x2, 0, 0, dir, P);
      x2.restore();
    } finally {
      A.mode = m0;
      A.modeColor = mc;
      A.modeAmt = ma;
    }
    stoneify(tc, '#8a96b4', 0.3);
    x2.globalCompositeOperation = 'source-atop';
    x2.fillStyle = 'rgba(30,38,56,0.28)';
    x2.fillRect(0, 0, tw, th);
    x2.fillStyle = 'rgba(12,16,26,0.35)';
    x2.fillRect(0, th * 0.62, tw, th);
    x2.fillStyle = A.c('#62806a');
    [[-18, -54, 9, 4], [-24, -40, 6, 3], [8, -74, 7, 3], [20, -30, 7, 3]].forEach(([dx, dy, rx, ry], j) => {
      if ((i + j) % 3 === 2) return;
      x2.beginPath();
      x2.ellipse(tw / 2 + dx * dir * ls, th - 3 * ls + dy * ls, rx * ls, ry * ls, 0, 0, PI2);
      x2.fill();
    });
    x2.strokeStyle = 'rgba(20,24,34,0.55)';
    x2.lineWidth = Math.max(0.8, 1.2 * ls);
    x2.beginPath();
    x2.moveTo(tw / 2 - 6 * dir * ls, th - 70 * ls);
    x2.lineTo(tw / 2 - 2 * dir * ls, th - 56 * ls);
    x2.lineTo(tw / 2 - 9 * dir * ls, th - 44 * ls);
    x2.stroke();
    if (a > 0) {
      x2.fillStyle = 'rgba(131,145,170,' + a.toFixed(3) + ')';
      x2.fillRect(0, 0, tw, th);
    }
    c.drawImage(tc, x - tw / 2, base - ph - ph * 0.16 - th + 4 * ls, tw, th);
  }

  // 橫跨大廳的拱（a = 霧）：從柱頭起拱，拱上是一整片石牆
  const TH_SPRING = 2.7;
  function thArch(c, d, a, WL, CE) {
    const P = thP;
    const q = 400 / d;
    const line = fogC(TH_LINE, a * 0.8);
    const fa = 1 - a;
    const lw = Math.max(1, Math.min(3, q * 0.012));
    const sy = P(0, TH_SPRING + 0.28, d)[1];
    const rx = q * (2.12 - 0.22);
    const ry = q * 0.62;
    const L = P(-WL, CE + 0.2, d);
    const R = P(WL, TH_SPRING + 0.28, d);
    // 拱的厚度：先畫後面那一面（比較暗），中間的拱腹露出來
    const face = (dd, col) => {
      const qq = 400 / dd;
      const yy = P(0, TH_SPRING + 0.28, dd)[1];
      const ll = P(-WL, CE + 0.2, dd);
      const rr = P(WL, TH_SPRING + 0.28, dd);
      c.beginPath();
      c.rect(ll[0], ll[1], rr[0] - ll[0], rr[1] - ll[1]);
      c.moveTo(TH.vx + (2.12 - 0.22) * qq, yy);
      c.ellipse(TH.vx, yy, (2.12 - 0.22) * qq, 0.62 * qq, 0, 0, Math.PI, true);
      c.fillStyle = col;
      c.fill('evenodd');
    };
    face(d + 0.34, fogC('#262d3c', Math.min(1, a + 0.05)));
    face(d, fogC('#5e6678', a));
    c.save();
    c.beginPath();
    c.rect(L[0], L[1], R[0] - L[0], R[1] - L[1]);
    c.moveTo(TH.vx + rx, sy);
    c.ellipse(TH.vx, sy, rx, ry, 0, 0, Math.PI, true);
    c.clip('evenodd');
    // 拱石：沿著拱放射的接縫
    c.strokeStyle = 'rgba(16,20,30,' + (0.45 * fa).toFixed(3) + ')';
    c.lineWidth = lw * 0.6;
    for (let k = 0; k <= 16; k++) {
      const an = Math.PI + (k / 16) * Math.PI;
      c.beginPath();
      c.moveTo(TH.vx + Math.cos(an) * rx, sy + Math.sin(an) * ry);
      c.lineTo(TH.vx + Math.cos(an) * (rx + q * 0.26), sy + Math.sin(an) * (ry + q * 0.26));
      c.stroke();
    }
    c.beginPath();
    c.ellipse(TH.vx, sy, rx + q * 0.26, ry + q * 0.26, 0, Math.PI, PI2);
    c.stroke();
    // 牆上的石塊
    for (let yy = L[1] + q * 0.22; yy < sy; yy += q * 0.22) {
      c.beginPath();
      c.moveTo(L[0], yy);
      c.lineTo(R[0], yy);
      c.stroke();
    }
    // 拱心石上的星楓（幾乎磨平了）
    c.fillStyle = fogC('#6c7488', a);
    c.fillRect(TH.vx - q * 0.13, sy - ry - q * 0.3, q * 0.26, q * 0.34);
    c.strokeStyle = 'rgba(190,205,230,' + (0.3 * fa).toFixed(3) + ')';
    c.lineWidth = lw * 0.6;
    c.beginPath();
    A.mapleLeafPath(c, TH.vx, sy - ry - q * 0.12, q * 0.1);
    c.stroke();
    // 下緣的光（窗在左邊）
    const hl = c.createLinearGradient(L[0], 0, R[0], 0);
    hl.addColorStop(0, 'rgba(150,172,214,' + (0.22 * fa).toFixed(3) + ')');
    hl.addColorStop(0.5, 'rgba(150,172,214,0)');
    c.fillStyle = hl;
    c.fillRect(L[0], L[1], R[0] - L[0], R[1] - L[1]);
    c.restore();
    c.beginPath();
    c.ellipse(TH.vx, sy, rx, ry, 0, Math.PI, PI2);
    c.strokeStyle = line;
    c.lineWidth = lw;
    c.stroke();
    c.beginPath();
    c.moveTo(L[0], R[1]);
    c.lineTo(R[0], R[1]);
    c.stroke();
  }

  // 牆上破爛的舊旗
  function thBanner(c, sd, d, a, seed, WL) {
    const P = thP;
    const r = U.seeded(seed);
    const d1 = d + 0.55;
    const top0 = P(sd * WL, 3.05, d);
    const top1 = P(sd * WL, 3.05, d1);
    const n = 7;
    const bot = [];
    for (let i = 0; i <= n; i++) {
      const dd = lerp(d, d1, i / n);
      const Y = 1.35 + (i % 2 ? 0.18 + r() * 0.18 : r() * 0.1) + Math.abs(i - n / 2) * 0.04;
      bot.push(P(sd * (WL - 0.02), Y, dd));
    }
    const path = (p) => {
      p.moveTo(top0[0], top0[1]);
      p.lineTo(top1[0], top1[1]);
      for (let i = n; i >= 0; i--) p.lineTo(bot[i][0], bot[i][1]);
      p.closePath();
    };
    c.beginPath();
    path(c);
    c.fillStyle = fogC('#28304a', a);
    c.fill();
    c.save();
    c.clip();
    // 褪色的金邊與中間的葉紋
    c.strokeStyle = 'rgba(180,160,110,' + (0.35 * (1 - a)).toFixed(3) + ')';
    c.lineWidth = Math.max(1, 5 / d);
    const m0 = P(sd * WL, 2.95, d + 0.06);
    const m1 = P(sd * WL, 2.95, d1 - 0.06);
    c.beginPath();
    c.moveTo(m0[0], m0[1]);
    c.lineTo(m1[0], m1[1]);
    c.stroke();
    const ce = P(sd * WL, 2.3, (d + d1) / 2);
    c.save();
    c.translate(ce[0], ce[1]);
    c.scale(sd * 0.35, 1);
    c.beginPath();
    A.mapleLeafPath(c, 0, 0, 110 / d);
    c.stroke();
    c.restore();
    // 布的皺褶
    c.strokeStyle = 'rgba(8,10,20,0.35)';
    c.lineWidth = Math.max(1, 6 / d);
    for (let i = 1; i < 4; i++) {
      const dd = lerp(d, d1, i / 4);
      const a0 = P(sd * WL, 3.0, dd);
      const a1 = P(sd * WL, 1.5, dd);
      c.beginPath();
      c.moveTo(a0[0], a0[1]);
      c.lineTo(a1[0], a1[1]);
      c.stroke();
    }
    c.restore();
    c.beginPath();
    path(c);
    c.strokeStyle = fogC(TH_LINE, a * 0.8);
    c.lineWidth = Math.max(1, 4 / d);
    c.lineJoin = 'round';
    c.stroke();
    // 旗桿
    c.beginPath();
    c.moveTo(top0[0], top0[1]);
    c.lineTo(top1[0], top1[1]);
    c.strokeStyle = fogC('#1a1f2c', a);
    c.lineWidth = Math.max(1.5, 14 / d);
    c.stroke();
  }

  function thHall(c) {
    const D = 24;
    const WL = 2.7;
    const CE = 3.6;
    const P = thP;
    const g = c.createLinearGradient(0, -50, 0, 780);
    g.addColorStop(0, '#0b0e16');
    g.addColorStop(0.32, '#1a2130');
    g.addColorStop(0.5, '#2b3548');
    g.addColorStop(1, '#141820');
    c.fillStyle = g;
    c.fillRect(-80, -50, 1440, 830);
    // 天花板與兩側的牆
    const wallG = (side) => {
      const a = P(side * WL, 0, 0.6);
      const b = P(side * WL, 0, D);
      const gg = c.createLinearGradient(a[0], 0, b[0], 0);
      gg.addColorStop(0, '#0c1018');
      gg.addColorStop(0.7, '#27303f');
      gg.addColorStop(1, '#3d4860');
      return gg;
    };
    [-1, 1].forEach((sd) => {
      c.beginPath();
      quad(c, [P(sd * WL, 0, 0.6), P(sd * WL, 0, D), P(sd * WL, CE, D), P(sd * WL, CE, 0.6)]);
      c.fillStyle = wallG(sd);
      c.fill();
      // 牆上的石塊：水平的層、錯開的直縫
      c.save();
      c.clip();
      c.strokeStyle = 'rgba(6,8,14,0.3)';
      c.lineWidth = 1.2;
      for (let Y = 0.3; Y < CE; Y += 0.3) {
        const a = P(sd * WL, Y, 0.6);
        const b = P(sd * WL, Y, D);
        c.beginPath();
        c.moveTo(a[0], a[1]);
        c.lineTo(b[0], b[1]);
        c.stroke();
        for (let d = 0.8 + ((Y * 10) % 2) * 0.3; d < 14; d *= 1.32) {
          const u = P(sd * WL, Y, d);
          const v = P(sd * WL, Y + 0.3, d);
          c.beginPath();
          c.moveTo(u[0], u[1]);
          c.lineTo(v[0], v[1]);
          c.stroke();
        }
      }
      // 牆腳的潮氣
      const w0 = P(sd * WL, 0, 0.6);
      const w1 = P(sd * WL, 0.9, 0.6);
      const mg = c.createLinearGradient(0, w1[1], 0, w0[1]);
      mg.addColorStop(0, 'rgba(40,60,58,0)');
      mg.addColorStop(1, 'rgba(40,60,58,0.35)');
      c.fillStyle = mg;
      c.fillRect(-80, w1[1], 1440, w0[1] - w1[1]);
      c.restore();
    });
    c.beginPath();
    quad(c, [P(-WL, CE, 0.6), P(WL, CE, 0.6), P(WL, CE, D), P(-WL, CE, D)]);
    const cg = c.createLinearGradient(0, -50, 0, P(0, CE, D)[1]);
    cg.addColorStop(0, '#07090f');
    cg.addColorStop(1, '#262e40');
    c.fillStyle = cg;
    c.fill();
    // 盡頭的牆與門（冷冷的天光）
    const e0 = P(-WL, CE, D);
    const e1 = P(WL, 0, D);
    c.fillStyle = '#434e66';
    c.fillRect(e0[0], e0[1], e1[0] - e0[0], e1[1] - e0[1]);
    const d0 = P(-0.95, 3.0, D);
    const d1 = P(0.95, 0, D);
    haze(c, (d0[0] + d1[0]) / 2, (d0[1] + d1[1]) / 2, 260, '150,172,210', 0.55);
    c.beginPath();
    c.moveTo(d0[0], d1[1]);
    c.lineTo(d0[0], d0[1] + (d1[0] - d0[0]) * 0.5);
    c.arc((d0[0] + d1[0]) / 2, d0[1] + (d1[0] - d0[0]) * 0.5, (d1[0] - d0[0]) / 2, Math.PI, 0);
    c.lineTo(d1[0], d1[1]);
    c.closePath();
    c.fillStyle = '#c3d2ea';
    c.fill();
    // 門外的台階與天空的亮
    haze(c, (d0[0] + d1[0]) / 2, d1[1] - 8, 40, '230,240,255', 0.8);
    // 高處的窗（左邊亮、右邊暗），有窗櫺
    [[-1, 2.6], [-1, 4.4], [-1, 7], [-1, 11], [-1, 16], [1, 3.4], [1, 6], [1, 9.5], [1, 14]].forEach(([sd, d]) => {
      c.beginPath();
      quad(c, [P(sd * WL, 2.1, d), P(sd * WL, 3.15, d), P(sd * WL, 3.15, d + 0.5), P(sd * WL, 2.1, d + 0.5)]);
      c.fillStyle = sd < 0 ? '#8ea3c4' : '#4e5b74';
      c.fill();
      // 窗櫺
      c.strokeStyle = sd < 0 ? 'rgba(30,38,56,0.8)' : 'rgba(20,26,38,0.8)';
      c.lineWidth = Math.max(1, 5 / d);
      const m0 = P(sd * WL, 2.1, d + 0.25);
      const m1 = P(sd * WL, 3.15, d + 0.25);
      const h0 = P(sd * WL, 2.62, d);
      const h1 = P(sd * WL, 2.62, d + 0.5);
      c.beginPath();
      c.moveTo(m0[0], m0[1]);
      c.lineTo(m1[0], m1[1]);
      c.moveTo(h0[0], h0[1]);
      c.lineTo(h1[0], h1[1]);
      c.stroke();
      // 窗台
      const s0 = P(sd * (WL - 0.08), 2.08, d - 0.04);
      const s1 = P(sd * (WL - 0.08), 2.08, d + 0.54);
      c.strokeStyle = sd < 0 ? '#6d7c98' : '#3a4458';
      c.lineWidth = Math.max(1.5, 12 / d);
      c.beginPath();
      c.moveTo(s0[0], s0[1]);
      c.lineTo(s1[0], s1[1]);
      c.stroke();
      if (sd < 0) {
        const m = P(sd * WL, 2.6, d + 0.25);
        haze(c, m[0], m[1], 520 / d, '160,185,225', 0.4);
      }
    });
    // 牆上的舊旗
    [[-1, 3.3], [-1, 5.6], [-1, 8.6], [1, 2.9], [1, 4.6], [1, 7.8], [1, 11.5]].forEach(([sd, d], i) => {
      const a = Math.min(0.85, Math.pow(cl((d - 1.7) / 15), 0.6) * 0.85);
      thBanner(c, sd, d, a, 60 + i, WL);
    });
    // 地板
    const f0 = P(0, 0, D)[1];
    c.beginPath();
    quad(c, [P(-WL, 0, 0.55), P(-WL, 0, D), P(WL, 0, D), P(WL, 0, 0.55)]);
    const fg = c.createLinearGradient(0, f0, 0, 780);
    fg.addColorStop(0, '#7f8ba2');
    fg.addColorStop(0.15, '#8e98ab');
    fg.addColorStop(0.5, '#7b8495');
    fg.addColorStop(1, '#4f5665');
    c.fillStyle = fg;
    c.fill();
    c.save();
    c.clip();
    // 每塊石磚的深淺不一
    const rr = U.seeded(404);
    const rows = [0.55, 0.9, 1.1, 1.35, 1.65, 2.05, 2.55, 3.2, 4.1, 5.3, 7, 9.5, 13, 18];
    for (let i = 0; i + 1 < rows.length; i++) {
      for (let X = -2.5; X < 2.5; X += 0.5) {
        const v = rr();
        if (v > 0.55) continue;
        c.beginPath();
        quad(c, [P(X, 0, rows[i]), P(X + 0.5, 0, rows[i]), P(X + 0.5, 0, rows[i + 1]), P(X, 0, rows[i + 1])]);
        c.fillStyle = v < 0.25 ? 'rgba(16,20,32,0.13)' : 'rgba(200,212,236,0.07)';
        c.fill();
      }
    }
    c.strokeStyle = 'rgba(28,34,48,0.32)';
    c.lineWidth = 1.5;
    for (const d of rows.slice(1)) {
      const a = P(-WL, 0, d);
      const b = P(WL, 0, d);
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
    }
    for (let X = -2.5; X <= 2.51; X += 0.5) {
      const a = P(X, 0, 0.55);
      const b = P(X, 0, D);
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
    }
    // 磚縫裡的苔
    c.strokeStyle = 'rgba(70,104,84,0.5)';
    c.lineWidth = 2.2;
    for (let i = 0; i < 22; i++) {
      const X = -2.5 + Math.floor(rr() * 11) * 0.5;
      const d0 = 0.9 + rr() * 4;
      const a = P(X, 0, d0);
      const b = P(X, 0, d0 * (1.05 + rr() * 0.12));
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
    }
    // 碎裂的磚
    c.strokeStyle = 'rgba(14,18,28,0.45)';
    c.lineWidth = 1.4;
    for (let i = 0; i < 9; i++) {
      const X = -2.4 + rr() * 4.8;
      const d = 0.95 + rr() * 3.2;
      let [x, y] = P(X, 0, d);
      c.beginPath();
      c.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (rr() - 0.5) * 70 / d;
        y += (rr() - 0.2) * 26 / d;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    // 走道：長地毯（早就褪色、磨破）
    c.beginPath();
    quad(c, [P(-0.6, 0, 0.55), P(-0.6, 0, D), P(0.6, 0, D), P(0.6, 0, 0.55)]);
    c.fillStyle = 'rgba(40,50,72,0.2)';
    c.fill();
    c.beginPath();
    quad(c, [P(-0.42, 0, 0.55), P(-0.42, 0, D), P(0.42, 0, D), P(0.42, 0, 0.55)]);
    c.fillStyle = 'rgba(52,40,58,0.22)';
    c.fill();
    c.strokeStyle = 'rgba(190,205,230,0.18)';
    c.lineWidth = 2;
    [-0.6, 0.6].forEach((X) => {
      const a = P(X, 0, 0.55);
      const b = P(X, 0, D);
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
    });
    // 走道兩邊鑲的菱形（黃銅，暗掉了）
    for (let d = 0.95; d < 16; d *= 1.2) {
      [-0.6, 0.6].forEach((X) => {
        c.beginPath();
        quad(c, [P(X, 0, d * 0.975), P(X + 0.05, 0, d), P(X, 0, d * 1.025), P(X - 0.05, 0, d)]);
        c.fillStyle = 'rgba(176,160,112,0.2)';
        c.fill();
        c.strokeStyle = 'rgba(20,24,34,0.4)';
        c.lineWidth = 1;
        c.stroke();
      });
    }
    // 地上嵌著的星楓紋：在地面位置用仿射近似透視
    const ic = P(0, 0, 2.7);
    const sc = 400 / 2.7;
    c.save();
    c.translate(ic[0], ic[1]);
    c.scale(sc, sc / 2.7);
    c.strokeStyle = 'rgba(200,215,240,0.32)';
    c.lineWidth = 2.2 / sc;
    c.beginPath();
    c.arc(0, 0, 1.05, 0, PI2);
    c.stroke();
    c.lineWidth = 1.2 / sc;
    c.beginPath();
    c.arc(0, 0, 0.92, 0, PI2);
    c.stroke();
    c.beginPath();
    c.arc(0, 0, 1.2, 0, PI2);
    c.stroke();
    for (let k = 0; k < 12; k++) {
      const an = (k / 12) * PI2;
      c.beginPath();
      c.moveTo(Math.cos(an) * 0.92, Math.sin(an) * 0.92);
      c.lineTo(Math.cos(an) * 1.05, Math.sin(an) * 1.05);
      c.stroke();
      // 外圈的小刻字（看不清的古字）
      c.fillStyle = 'rgba(200,215,240,0.22)';
      c.fillRect(Math.cos(an + 0.26) * 1.12 - 0.03, Math.sin(an + 0.26) * 1.12 - 0.012, 0.06, 0.024);
    }
    // 十二道細刻線往中心收
    c.strokeStyle = 'rgba(200,215,240,0.1)';
    for (let k = 0; k < 12; k++) {
      const an = (k / 12) * PI2 + 0.26;
      c.beginPath();
      c.moveTo(Math.cos(an) * 0.3, Math.sin(an) * 0.3);
      c.lineTo(Math.cos(an) * 0.9, Math.sin(an) * 0.9);
      c.stroke();
    }
    c.strokeStyle = 'rgba(200,215,240,0.32)';
    c.beginPath();
    A.mapleLeafPath(c, 0, 0.04, 0.72);
    c.fillStyle = 'rgba(170,188,220,0.12)';
    c.fill();
    c.lineWidth = 2 / sc;
    c.stroke();
    c.restore();
    // 窗光落在地上的亮塊
    [[-1.7, 2.9], [-1.5, 4.8], [-1.3, 7.4]].forEach(([X, d]) => {
      c.beginPath();
      quad(c, [P(X - 0.5, 0, d), P(X + 0.5, 0, d + 0.2), P(X + 0.62, 0, d + 0.9), P(X - 0.3, 0, d + 0.7)]);
      c.fillStyle = 'rgba(170,192,232,0.1)';
      c.fill();
    });
    c.restore();
    // 柱子、拱和石獅，由遠到近（越遠越淡、越藍）
    const objs = [];
    [1.6, 2.55, 3.7, 5.2, 7.2, 10, 14, 19].forEach((d, i) => {
      [-1, 1].forEach((sd) => objs.push({ d, kind: 'p', sd, i }));
      objs.push({ d: d - 0.001, kind: 'a', i });
    });
    [2.1, 3.1, 4.4, 6.1, 8.4, 11.6, 16].forEach((d, i) => [-1, 1].forEach((sd) => objs.push({ d: d + (sd > 0 ? 0.15 : 0), kind: 's', sd, i: i * 2 + (sd > 0 ? 1 : 0) })));
    // 地上的碎石（以前的石殼掉下來的）
    const rb = U.seeded(515);
    for (let i = 0; i < 14; i++) objs.push({ d: 1.9 + rb() * 8, kind: 'r', X: (rb() < 0.5 ? -1 : 1) * (0.75 + rb() * 1.7), i });
    objs.sort((a, b) => b.d - a.d);
    objs.forEach((o) => {
      const a = Math.min(0.82, Math.pow(cl((o.d - 1.7) / 15), 0.6) * 0.85);
      if (o.kind === 'p') {
        const b = P(o.sd * 2.12, 0, o.d);
        const w = (0.36 * 400) / o.d;
        thPillar(c, b[0], b[1], w, (TH_SPRING * 400) / o.d, a, 20 + o.i * 2 + (o.sd > 0 ? 1 : 0));
      } else if (o.kind === 'a') {
        thArch(c, o.d, a, WL, CE);
      } else if (o.kind === 'r') {
        const b = P(o.X, 0, o.d);
        const r = (0.03 + hash(o.i * 3.3) * 0.04) * (400 / o.d);
        paint(c, (p) => quad(p, [[b[0] - r, b[1]], [b[0] - r * 0.5, b[1] - r * 0.8], [b[0] + r * 0.6, b[1] - r * 0.7], [b[0] + r, b[1]]]), fogC('#737b8d', a), { shade: fogC('#4a5162', a), cel: [r * 0.4, 0], lw: Math.max(0.8, r * 0.14), line: fogC(TH_LINE, a * 0.8) });
      } else {
        const b = P(o.sd * 1.42, 0, o.d);
        thStatue(c, b[0], b[1], 400 / o.d, -o.sd, a, o.i);
      }
    });
    // 深處的霧：地面附近最濃
    const hz0 = P(0, 0, 9)[1];
    const fz = c.createLinearGradient(0, TH.hz - 120, 0, hz0 + 40);
    fz.addColorStop(0, 'rgba(131,145,170,0)');
    fz.addColorStop(0.55, 'rgba(131,145,170,0.28)');
    fz.addColorStop(1, 'rgba(131,145,170,0)');
    c.fillStyle = fz;
    c.fillRect(-80, TH.hz - 120, 1440, hz0 - TH.hz + 160);
    haze(c, TH.vx, TH.hz + 20, 420, '110,126,158', 0.22);
    // 暗角直接畫進大廳（王座那張也有），每幀就不用再蓋一張全畫面的圖
    thVignette(c);
  }

  // 王座（從背後看）：兩層台階、矮椅背、兩根高扶柱
  function thThrone(c) {
    const x = TH.x;
    const line = TH_LINE;
    const top = '#9aa2b2';
    const sd = '#4c5262';
    const step = (y0, y1, hw, hw2) => {
      paint(c, (p) => quad(p, [[x - hw2, y0 - 10], [x + hw2, y0 - 10], [x + hw, y0], [x - hw, y0]]), top, { lw: 2.4, line });
      paint(c, (p) => p.rect(x - hw, y0, hw * 2, y1 - y0), '#6d7486', { shade: sd, cel: [hw * 0.22, 0], lw: 2.6, line });
      // 踏面前緣的亮邊（被踩了一千年，中間磨圓了）
      c.save();
      c.beginPath();
      c.rect(x - hw, y0 - 10, hw * 2, y1 - y0 + 10);
      c.clip();
      c.strokeStyle = 'rgba(200,212,236,0.35)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x - hw + 4, y0 + 2);
      c.quadraticCurveTo(x, y0 + 5, x + hw * 0.55, y0 + 2);
      c.stroke();
      // 立面的浮雕帶：一排菱形和星楓
      const fy = y0 + (y1 - y0) * 0.5;
      const fh = Math.min(16, (y1 - y0) * 0.36);
      c.strokeStyle = 'rgba(18,22,32,0.45)';
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(x - hw + 10, fy - fh);
      c.lineTo(x + hw - 10, fy - fh);
      c.moveTo(x - hw + 10, fy + fh);
      c.lineTo(x + hw - 10, fy + fh);
      c.stroke();
      const n = Math.round(hw / 34);
      for (let k = -n; k <= n; k++) {
        const fx = x + k * 34;
        if (k % 3 === 0) {
          c.beginPath();
          A.mapleLeafPath(c, fx, fy, fh * 0.8);
          c.strokeStyle = 'rgba(190,204,230,0.28)';
          c.stroke();
        } else {
          c.beginPath();
          quad(c, [[fx, fy - fh * 0.7], [fx + fh * 0.6, fy], [fx, fy + fh * 0.7], [fx - fh * 0.6, fy]]);
          c.strokeStyle = 'rgba(18,22,32,0.4)';
          c.stroke();
        }
      }
      // 缺角與水痕
      c.fillStyle = 'rgba(12,16,24,0.45)';
      c.beginPath();
      c.moveTo(x + hw * 0.62, y0 - 1);
      c.lineTo(x + hw * 0.7, y0 - 1);
      c.lineTo(x + hw * 0.67, y0 + 6);
      c.closePath();
      c.fill();
      const dg = c.createLinearGradient(0, y0, 0, y1);
      dg.addColorStop(0, 'rgba(8,10,18,0)');
      dg.addColorStop(1, 'rgba(8,10,18,0.3)');
      c.fillStyle = dg;
      c.fillRect(x - hw, y0, hw * 2, y1 - y0);
      c.restore();
    };
    step(598, 680, 340, 326);
    step(560, 598, 262, 250);
    // 扶柱
    [-1, 1].forEach((s) => {
      const px = x + s * 172;
      paint(c, (p) => p.rect(px - 23, 250, 46, 312), '#747c8e', { shade: sd, cel: [14, 0], lw: 2.6, line });
      c.save();
      c.beginPath();
      c.rect(px - 23, 250, 46, 312);
      c.clip();
      c.strokeStyle = 'rgba(18,22,32,0.35)';
      c.lineWidth = 2;
      [-9, 0, 9].forEach((k) => {
        c.beginPath();
        c.moveTo(px + k, 250);
        c.lineTo(px + k, 562);
        c.stroke();
      });
      c.restore();
      // 柱頭：外擴的鐘形＋一圈石葉
      paint(c, (p) => {
        p.moveTo(px - 23, 262);
        p.quadraticCurveTo(px - 26, 246, px - 36, 242);
        p.lineTo(px + 36, 242);
        p.quadraticCurveTo(px + 26, 246, px + 23, 262);
        p.closePath();
      }, '#7c8496', { shade: sd, cel: [14, 0], lw: 2.4, line });
      for (let k = -2; k <= 2; k++) {
        const lx = px + k * 11;
        paint(c, (p) => {
          p.moveTo(lx - 6, 262);
          p.quadraticCurveTo(lx - 7, 250, lx + k * 1.5, 244);
          p.quadraticCurveTo(lx + 7, 250, lx + 6, 262);
          p.closePath();
        }, k < 0 ? '#9199ab' : '#838b9d', { lw: 1.6, line });
      }
      paint(c, (p) => p.rect(px - 32, 228, 64, 16), '#848c9e', { shade: sd, cel: [16, 0], lw: 2.6, line });
      c.fillStyle = 'rgba(200,212,236,0.35)';
      c.fillRect(px - 32, 228, 64, 2);
      paint(c, (p) => p.rect(px - 28, 544, 56, 18), '#7c8496', { shade: sd, cel: [14, 0], lw: 2.4, line });
      // 柱頂：石頭星楓葉
      c.save();
      c.translate(px, 206);
      paint(c, (p) => A.mapleLeafPath(p, 0, 0, 30), '#8c94a6', { shade: '#5c6374', cel: [6, 5], lw: 2.4, line, hl: [-8, -12, 6, 3], hlA: 0.25 });
      c.restore();
    });
    // 椅背（背面）
    paint(c, (p) => quad(p, [[x - 150, 474], [x + 150, 474], [x + 158, 484], [x - 158, 484]]), top, { lw: 2.4, line });
    paint(c, (p) => p.rect(x - 158, 484, 316, 78), '#697083', { shade: sd, cel: [60, 0], lw: 2.6, line });
    // 椅背的框與浮雕
    c.save();
    c.strokeStyle = 'rgba(18,22,32,0.45)';
    c.lineWidth = 1.6;
    c.strokeRect(x - 146, 492, 292, 62);
    c.strokeStyle = 'rgba(200,212,236,0.18)';
    c.strokeRect(x - 144, 494, 292, 62);
    [-1, 1].forEach((sdd) => {
      for (let k = 0; k < 3; k++) {
        const vx = x + sdd * (60 + k * 28);
        c.strokeStyle = 'rgba(18,22,32,0.4)';
        c.beginPath();
        c.moveTo(vx, 500);
        c.quadraticCurveTo(vx + sdd * 10, 523, vx, 546);
        c.stroke();
      }
    });
    c.restore();
    // 椅背上的星楓圓章
    c.save();
    c.strokeStyle = 'rgba(196,210,236,0.4)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x, 523, 28, 0, PI2);
    c.stroke();
    c.beginPath();
    A.mapleLeafPath(c, x, 525, 20);
    c.stroke();
    c.restore();
    // 裂縫、苔
    c.strokeStyle = 'rgba(16,20,30,0.5)';
    c.lineWidth = 1.8;
    [[x - 120, 484, x - 104, 506, x - 116, 530], [x + 96, 562, x + 120, 580, x + 110, 598], [x - 230, 598, x - 250, 630, x - 236, 660]].forEach(([a, b, d, e, f, g]) => {
      c.beginPath();
      c.moveTo(a, b);
      c.lineTo(d, e);
      c.lineTo(f, g);
      c.stroke();
    });
    [[x - 300, 598, 26], [x + 250, 598, 20], [x - 190, 560, 16]].forEach(([mx, my, r]) => {
      paint(c, (p) => p.ellipse(mx, my, r, r * 0.3, 0, Math.PI, 0), '#586f5c', { shade: '#445848', cel: [0, -2], lw: 1.6, line });
    });
    // 以前碎掉的小石塊
    [[x - 280, 640, 9], [x + 300, 650, 7], [x + 210, 632, 5], [x - 150, 596, 5]].forEach(([rx, ry, r]) => {
      paint(c, (p) => quad(p, [[rx - r, ry], [rx - r * 0.4, ry - r * 0.9], [rx + r * 0.8, ry - r * 0.6], [rx + r, ry]]), '#7e8698', { shade: sd, cel: [r * 0.4, 0], lw: 1.6, line });
    });
  }

  // ── 金色的獅子（背影）──
  // 原點在腳底中央；u：0 坐著 → 1 站起來
  const LION_BODY = '#cfa066';
  const LION_BODY_S = '#9a7042';
  const MANE = '#efb83f';
  const MANE_S = '#b8761f';
  const MANE_HI = '#fff0b4';
  function thBodyPath(p, u, inf) {
    inf = inf || 0;
    const hw = lerp(46, 30, u) + inf;
    const by = lerp(-2, -38, u) + inf;
    const cy = lerp(-32, -62, u);
    const sy = -100;
    const sw = lerp(30, 24, u) + inf;
    p.moveTo(0, by);
    p.bezierCurveTo(hw * 0.78, by, hw, cy + (by - cy) * 0.55, hw, cy);
    p.bezierCurveTo(hw, cy - 22, sw, sy + 16, sw * 0.6, sy);
    p.lineTo(-sw * 0.6, sy);
    p.bezierCurveTo(-sw, sy + 16, -hw, cy - 22, -hw, cy);
    p.bezierCurveTo(-hw, cy + (by - cy) * 0.55, -hw * 0.78, by, 0, by);
    p.closePath();
  }
  // 鬃毛：一撮一撮往下垂，越下面越長
  function thManePath(p, cx, cy, R, t, n, sway, drop) {
    n = n || 18;
    drop = drop == null ? 0.3 : drop;
    const step = PI2 / n;
    const pt = (a, r) => {
      const down = Math.max(0, Math.sin(a));
      const rx = R * (1.08 + down * 0.1);
      const ry = R * (1 + Math.pow(down, 1.6) * drop);
      // 毛尖往下垂
      return [cx + Math.cos(a) * rx * r + down * down * (sway || 0), cy + Math.sin(a) * ry * r + (r - 0.85) * R * 0.9 * (0.35 + down * 0.3)];
    };
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * step;
      const w = t == null ? 0 : Math.sin(t * 1.7 + i * 1.3) * 0.04;
      const v0 = pt(a, 0.86);
      const tip = pt(a + step * 0.7 + w, 1.1);
      const c1 = pt(a + step * 0.2, 1.08);
      const v1 = pt(a + step, 0.86);
      const c2 = pt(a + step * 0.92, 0.98);
      if (i === 0) p.moveTo(v0[0], v0[1]);
      p.quadraticCurveTo(c1[0], c1[1], tip[0], tip[1]);
      p.quadraticCurveTo(c2[0], c2[1], v1[0], v1[1]);
    }
    p.closePath();
  }
  // 逆光的輪廓光：形狀往光的反方向挪一點，露出來的邊亮起來
  function rimLight(c, path, dx, dy, rgb, a) {
    if (a <= 0.01) return;
    c.save();
    c.beginPath();
    path(c);
    c.clip();
    c.beginPath();
    c.rect(-2000, -2000, 4000, 4000);
    c.translate(dx, dy);
    path(c);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha *= a;
    c.fillStyle = 'rgb(' + rgb + ')';
    c.fill('evenodd');
    c.restore();
  }
  const TH_RIM = '150,180,235';
  function goldLion(c, t, u, ph, wa, bob, shA) {
    const lw = 2.6;
    // 走到地上以後，腳下的影子
    if (shA > 0.01) {
      c.save();
      c.globalAlpha *= shA * 0.45;
      c.fillStyle = '#05070c';
      c.beginPath();
      c.ellipse(-4, -1, 40, 8, 0, 0, PI2);
      c.fill();
      c.restore();
    }
    const mx = Math.sin(ph) * 1.6 * wa;
    const my = lerp(-116, -122, u) + (bob || 0);
    // 站起來以後才看得到腳和尾巴
    if (u > 0.35) {
      const ka = cl((u - 0.35) / 0.4);
      const lift = [Math.max(0, Math.sin(ph)) * 7 * wa, Math.max(0, -Math.sin(ph)) * 7 * wa];
      c.save();
      c.globalAlpha *= ka;
      // 前腳（比較遠，比較暗）
      [-1, 1].forEach((s, i) => {
        const ly = -6 - lift[1 - i] * 0.7;
        paint(c, (p) => A.roundRect(p, s * 11 - 6.5, -50, 13, 50 + ly, 5), '#b08450', { shade: '#86613a', cel: [4, 0], lw });
      });
      [-1, 1].forEach((s, i) => {
        const ly = -lift[i];
        paint(c, (p) => {
          p.moveTo(s * 10, -54);
          p.lineTo(s * 27, -54);
          p.quadraticCurveTo(s * 26, -26, s * 22, ly - 4);
          p.lineTo(s * 9, ly - 4);
          p.quadraticCurveTo(s * 10, -28, s * 10, -54);
          p.closePath();
        }, LION_BODY, { shade: LION_BODY_S, cel: [6, 0], lw });
        paint(c, (p) => p.ellipse(s * 15.5, ly - 3, 9, 5, 0, 0, PI2), LION_BODY, { shade: LION_BODY_S, cel: [2, -2], lw });
      });
      c.restore();
    }
    paint(c, (p) => thBodyPath(p, u), LION_BODY, { shade: LION_BODY_S, cel: [11, 7], lw, hl: [-14, lerp(-58, -74, u), 9, 5], hlA: 0.18 });
    // 背上的毛流
    c.save();
    c.beginPath();
    thBodyPath(c, u);
    c.clip();
    c.strokeStyle = 'rgba(120,80,40,0.35)';
    c.lineWidth = 1.2;
    c.lineCap = 'round';
    for (let j = 0; j < 10; j++) {
      const fx = -26 + j * 5.8;
      const fy = lerp(-30, -62, u) + (j % 3) * 7;
      c.beginPath();
      c.moveTo(fx, fy);
      c.quadraticCurveTo(fx + (fx < 0 ? -2 : 2), fy + 5, fx + (fx < 0 ? -1 : 1), fy + 10);
      c.stroke();
    }
    c.restore();
    rimLight(c, (p) => thBodyPath(p, u), 3, 2.5, TH_RIM, 0.45);
    c.strokeStyle = A.c('rgba(90,60,30,0.45)');
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, lerp(-2, -38, u));
    c.quadraticCurveTo(1, lerp(-12, -46, u), 0, lerp(-24, -54, u));
    c.stroke();
    // 外層鬃毛（後面先墊一層比較深、垂得比較長的）
    const sway = Math.sin(t * 0.9) * 2 + Math.sin(ph) * 3 * wa;
    lit(c, (p) => thManePath(p, mx, my + 8, 37, t + 1, 16, sway * 1.4, lerp(0.75, 0.3, u)), '#dc9c32', { hi: '#f4c85c', shade: '#a8661a', rim: 3, sh: 10, dx: 6, lw });
    lit(c, (p) => thManePath(p, mx, my, 36, t, 20, sway, lerp(0.3, 0.12, u)), MANE, { hi: MANE_HI, shade: MANE_S, rim: 4, sh: 11, dx: 7, lw });
    // 耳朵（從鬃毛裡冒出來）
    [-1, 1].forEach((s) => paint(c, (p) => p.ellipse(mx + s * 15, my - 34, 7, 8.5, s * 0.3, 0, PI2), LION_BODY, { shade: LION_BODY_S, cel: [3, 2], lw }));
    // 髮絲：三種深淺、長短不一，末端跟著走路甩
    const manePath = (p) => thManePath(p, mx, my, 36, t, 20, sway, lerp(0.3, 0.12, u));
    c.save();
    c.beginPath();
    manePath(c);
    c.clip();
    c.lineCap = 'round';
    for (let j = 0; j < 26; j++) {
      const k = (j + 0.5) / 26;
      const ox = (k - 0.5) * 84;
      const tone = j % 4;
      c.strokeStyle = A.c(tone === 0 ? MANE_HI : tone === 2 ? '#c9862a' : MANE_S);
      c.globalAlpha = tone === 0 ? 0.5 : 0.42;
      c.lineWidth = tone === 0 ? 1.3 : 1.7;
      const len = 36 + hash(j * 3.1) * 14 - Math.abs(ox) * 0.35;
      const y0 = my - 26 + Math.abs(ox) * 0.25 + hash(j * 1.7) * 6;
      const sw = sway * (0.3 + k * 0.4) + Math.sin(t * 2 + j) * 0.8;
      c.beginPath();
      c.moveTo(mx + ox * 0.35, y0);
      c.bezierCurveTo(mx + ox * 0.8, y0 + len * 0.35, mx + ox * 1.1 + sw * 0.4, y0 + len * 0.7, mx + ox * 1.15 + sw, y0 + len);
      c.stroke();
    }
    c.restore();
    rimLight(c, manePath, 3.5, 3, TH_RIM, 0.55);
    // 飄出輪廓的幾根毛
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = A.c(MANE);
    c.lineWidth = 1.4;
    for (let j = 0; j < 7; j++) {
      const an = -Math.PI * 0.95 + j * 0.3;
      const r0 = 38;
      const bx = mx + Math.cos(an) * r0 * 1.08;
      const by = my + Math.sin(an) * r0;
      const fl = Math.sin(t * 3 + j * 1.7) * 2 + sway * 0.3;
      c.globalAlpha = 0.8;
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(bx + Math.cos(an) * 6 + fl, by + Math.sin(an) * 6, bx + Math.cos(an) * 9 + fl * 1.5, by + Math.sin(an) * 9 + 4);
      c.stroke();
    }
    c.restore();
    // 內層（後腦勺的鬃毛）
    lit(c, (p) => thManePath(p, mx, my - 10, 22, t + 2, 13, sway * 0.6, 0.2), '#f7c64e', { hi: MANE_HI, shade: '#c9862a', rim: 3, sh: 7, dx: 5, lw: lw * 0.8 });
    rimLight(c, (p) => thManePath(p, mx, my - 10, 22, t + 2, 13, sway * 0.6, 0.2), 2.5, 2.5, TH_RIM, 0.35);
    // 後腦勺中間的旋
    c.save();
    c.strokeStyle = A.c('#c9862a');
    c.globalAlpha = 0.3;
    c.lineWidth = 1.1;
    c.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      const an = j * 2.1 + 0.4;
      c.beginPath();
      c.arc(mx + 1, my - 14, 5 + j * 3, an, an + 1.1);
      c.stroke();
    }
    c.restore();
    // 站著的時候，屁股比鬃毛近，蓋在鬃毛前面
    if (u > 0.5) {
      const ka = cl((u - 0.5) / 0.35);
      const cy = lerp(-32, -62, u);
      c.save();
      c.globalAlpha *= ka;
      paint(c, (p) => p.ellipse(0, cy + 2, lerp(46, 30, u), 25, 0, 0, PI2), LION_BODY, { shade: LION_BODY_S, cel: [9, 6], lw, hl: [-12, cy - 10, 8, 4], hlA: 0.2 });
      rimLight(c, (p) => p.ellipse(0, cy + 2, lerp(46, 30, u), 25, 0, 0, PI2), 3, 2.5, TH_RIM, 0.4);
      c.strokeStyle = A.c('rgba(90,60,30,0.5)');
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, cy + 27);
      c.quadraticCurveTo(1, cy + 16, 0, cy + 6);
      c.stroke();
      c.restore();
    }
    // 尾巴：垂在後腿中間，走路時左右擺
    if (u > 0.5) {
      const ka = cl((u - 0.5) / 0.4);
      const sw = Math.sin(ph * 0.5 + 0.6) * 8 * wa + Math.sin(t * 1.3) * 2;
      c.save();
      c.globalAlpha *= ka;
      c.lineCap = 'round';
      const tail = (p) => {
        p.moveTo(0, -44);
        p.quadraticCurveTo(sw * 0.4, -26, sw, -14);
      };
      c.strokeStyle = 'rgba(70,46,24,0.6)';
      c.lineWidth = 6;
      c.beginPath();
      tail(c);
      c.stroke();
      c.strokeStyle = A.c(LION_BODY);
      c.lineWidth = 4;
      c.beginPath();
      tail(c);
      c.stroke();
      paint(c, (p) => p.ellipse(sw, -12, 5, 7, sw * 0.03, 0, PI2), '#8a5a2c', { shade: '#63401e', cel: [2, 2], lw: 2.2 });
      c.restore();
    }
  }
  const thWithLion = (ctx, x, y, s, fn) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    fn();
    ctx.restore();
  };

  // 石殼：前面那一半（坐著的獅子形狀，上緣碎成鋸齒）
  const RIM_F = [[-60, -52], [-44, -56], [-34, -50], [-24, -60], [-14, -54], [-4, -63], [6, -56], [16, -64], [26, -54], [36, -60], [46, -52], [60, -56]];
  const RIM_B = [[-50, -66], [-34, -74], [-20, -70], [-8, -79], [4, -72], [16, -80], [30, -71], [50, -68]];
  function thShellClip(c, rim) {
    c.beginPath();
    c.moveTo(-80, 40);
    rim.forEach(([x, y]) => c.lineTo(x, y));
    c.lineTo(80, 40);
    c.closePath();
    c.clip();
  }
  function thShellShape(p) {
    thBodyPath(p, 0, 3);
  }
  function thShellFront(c) {
    c.save();
    c.translate(TH.x, TH.y);
    c.scale(TH.s, TH.s);
    c.save();
    thShellClip(c, RIM_F);
    c.beginPath();
    thShellShape(c);
    c.lineWidth = 3.4;
    c.strokeStyle = 'rgba(28,34,48,0.55)';
    c.lineJoin = 'round';
    c.stroke();
    c.beginPath();
    thShellShape(c);
    c.fillStyle = STONE;
    c.fill();
    c.clip();
    c.fillStyle = STONE_S;
    c.save();
    c.translate(-12, -8);
    c.beginPath();
    thShellShape(c);
    c.rect(-200, -300, 400, 600);
    c.fill('evenodd');
    c.restore();
    // 石頭的紋路和苔
    c.strokeStyle = 'rgba(20,24,34,0.4)';
    c.lineWidth = 1.2;
    const r = U.seeded(77);
    for (let i = 0; i < 12; i++) {
      const x0 = -44 + r() * 88;
      const y0 = -80 + r() * 70;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x0 + (r() - 0.5) * 14, y0 + 5 + r() * 8);
      c.lineTo(x0 + (r() - 0.5) * 16, y0 + 12 + r() * 8);
      c.stroke();
    }
    c.fillStyle = 'rgba(210,222,240,0.2)';
    c.beginPath();
    c.ellipse(-24, -38, 10, 16, 0.3, 0, PI2);
    c.fill();
    c.restore();
    // 獅子的形狀：兩邊大腿的輪廓、背脊的凹線
    c.save();
    c.beginPath();
    thShellShape(c);
    c.clip();
    c.strokeStyle = 'rgba(28,34,48,0.55)';
    c.lineWidth = 2;
    c.lineCap = 'round';
    [-1, 1].forEach((sd) => {
      c.beginPath();
      c.moveTo(sd * 12, -4);
      c.bezierCurveTo(sd * 18, -34, sd * 40, -44, sd * 47, -30);
      c.stroke();
    });
    c.beginPath();
    c.moveTo(0, -4);
    c.quadraticCurveTo(-2, -30, 0, -60);
    c.stroke();
    c.strokeStyle = 'rgba(220,230,246,0.25)';
    c.beginPath();
    c.moveTo(-14, -6);
    c.bezierCurveTo(-20, -32, -38, -40, -44, -28);
    c.stroke();
    c.restore();
    // 石頭尾巴：繞在右邊屁股旁
    paint(c, (p) => {
      p.moveTo(30, -6);
      p.quadraticCurveTo(58, -2, 60, -20);
      p.quadraticCurveTo(62, -30, 54, -34);
      p.quadraticCurveTo(50, -24, 50, -18);
      p.quadraticCurveTo(46, -10, 28, -14);
      p.closePath();
    }, STONE, { shade: STONE_S, cel: [4, 3], lw: 2.3, line: TH_LINE });
    paint(c, (p) => p.ellipse(56, -34, 6, 8, 0.4, 0, PI2), '#7b8292', { shade: STONE_S, cel: [2, 2], lw: 2.3, line: TH_LINE });
    // 鋸齒的上緣（斷面，亮一點）
    c.save();
    c.beginPath();
    thShellShape(c);
    c.clip();
    c.beginPath();
    RIM_F.forEach(([x, y], i) => (i ? c.lineTo(x, y + 3) : c.moveTo(x, y + 3)));
    c.strokeStyle = '#b3bccb';
    c.lineWidth = 3;
    c.stroke();
    c.beginPath();
    RIM_F.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = TH_LINE;
    c.lineWidth = 2.4;
    c.lineJoin = 'round';
    c.stroke();
    c.restore();
    c.restore();
  }
  // 石殼：後面那一半（胸口那側的內壁）＋空心的黑
  function thShellBack(c) {
    c.save();
    c.translate(TH.x, TH.y);
    c.scale(TH.s, TH.s);
    c.save();
    thShellClip(c, RIM_B);
    c.beginPath();
    thShellShape(c);
    c.lineWidth = 3.4;
    c.strokeStyle = 'rgba(28,34,48,0.55)';
    c.lineJoin = 'round';
    c.stroke();
    c.beginPath();
    thShellShape(c);
    c.fillStyle = '#5a6172';
    c.fill();
    c.clip();
    const g = c.createRadialGradient(0, -62, 2, 0, -62, 40);
    g.addColorStop(0, '#07090e');
    g.addColorStop(0.6, '#161a24');
    g.addColorStop(1, 'rgba(22,26,36,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, -62, 36, 14, 0, 0, PI2);
    c.fill();
    c.restore();
    c.beginPath();
    RIM_B.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = TH_LINE;
    c.lineWidth = 2.4;
    c.lineJoin = 'round';
    c.stroke();
    c.restore();
  }

  function thVignette(c) {
    const g = c.createRadialGradient(640, 330, 200, 640, 360, 820);
    g.addColorStop(0, 'rgba(4,6,12,0)');
    g.addColorStop(0.6, 'rgba(4,6,12,0.35)');
    g.addColorStop(1, 'rgba(4,6,12,0.85)');
    c.fillStyle = g;
    c.fillRect(-80, -50, 1440, 830);
  }

  Object.assign(DEFS, {
    fwCornerL: { fin: { grain: 0.16, fbm: 0.14 }, ox: -120, oy: 420, w: 500, h: 410, kmax: 1.4, draw: (c) => forestCorner(c, -1) },
    fwCornerR: { fin: { grain: 0.16, fbm: 0.14 }, ox: 930, oy: 420, w: 490, h: 410, kmax: 1.4, draw: (c) => forestCorner(c, 1) },
    thHall: { fin: { grain: 0.2, fbm: 0.16 }, ...FULL, kmax: 1.4, draw: thHall },
    thThrone: {
      fin: { grain: 0.18, fbm: 0.12 },
      ox: 420, oy: 160, w: 740, h: 560, kmax: 1.5,
      draw: (c) => {
        thThrone(c);
        c.globalCompositeOperation = 'source-atop';
        thVignette(c);
        c.globalCompositeOperation = 'source-over';
      },
    },
    thShell: { ox: 640, oy: 290, w: 300, h: 240, kmax: 1.6, draw: thShellFront },
    thShellB: { ox: 640, oy: 290, w: 300, h: 240, kmax: 1.6, draw: thShellBack },
    // 貼著地面慢慢流的霧（左右可以無限接）
    thMist: {
      ox: 0, oy: -90, w: 1400, h: 180, kmax: 0.6,
      draw: (c) => {
        const r = U.seeded(88);
        for (let i = 0; i < 26; i++) {
          const x = r() * 1400;
          const y = (r() - 0.5) * 60;
          const rx = 120 + r() * 160;
          const ry = 26 + r() * 30;
          [x - 1400, x, x + 1400].forEach((xx) => {
            c.save();
            c.translate(xx, y);
            c.scale(rx / 64, ry / 64);
            c.globalAlpha = 0.28 + r() * 0.2;
            c.drawImage(glowSpr('150,166,196'), -64, -64, 128, 128);
            c.restore();
          });
        }
      },
    },
  });

  // 每個鏡頭用到的圖層（用來預先準備、用完釋放）
  const SHOT_LAYERS = {
    throne: ['thHall', 'thMist', 'thShellB', 'thShell', 'thThrone'],
    sky: ['ringA', 'ringB', 'ringC', 'bandFar', 'bandMid', 'bandNear', 'farIsles', 'isle', 'chunk'],
    tree: ['ringA', 'ringB', 'bandFar', 'cyBack', 'cyFloor', 'treeTrunk', 'treeCanopy', 'cyFore'],
    nap: ['bandFar', 'napBack', 'napTree', 'napFront'],
    wind: ['ringA', 'ringB', 'bandFar', 'cyBack', 'cyFloor', 'treeTrunk', 'treeCanopy', 'cyFore'],
    scatter: ['ringA', 'ringB', 'ringC', 'bandFar', 'bandMid', 'bandNear', 'farIsles', 'isle', 'chunk'],
    fall: ['lands', 'puffA', 'puffB', 'puffC'],
    wake: ['isle', 'chunk', 'fwFar', 'fwMid', 'fwFront', 'fwCornerL', 'fwCornerR'],
    title: ['isle', 'chunk', 'fwFar', 'fwMid', 'fwFront', 'fwCornerL', 'fwCornerR'],
  };

  // ════════ 即時的小東西 ════════
  function cub(ctx, x, y, s, dir, st, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(s, s);
    A.drawLion(ctx, 0, 0, dir, st);
    ctx.restore();
  }

  function zzz(ctx, x, y, t, s) {
    ctx.save();
    ctx.font = 'bold 20px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.42 + i / 3) % 1;
      const a = Math.sin(k * Math.PI);
      ctx.globalAlpha = a * 0.95;
      const px = x + k * 46 * s + Math.sin(k * 7 + i) * 6;
      const py = y - k * 70 * s;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale((0.7 + k * 0.8) * s, (0.7 + k * 0.8) * s);
      ctx.rotate(-0.15);
      ctx.lineWidth = 4;
      ctx.strokeStyle = A.OUT;
      ctx.strokeText('z', 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('z', 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function petals(ctx, t, n, box, wind, seed, cols) {
    const [x0, y0, w, h] = box;
    for (let i = 0; i < n; i++) {
      const hs = hash(i * 3.1 + seed);
      const sp = 0.5 + hash(i * 7.7 + seed) * 0.8;
      const k = (t * 0.06 * sp * (1 + wind * 3) + hs) % 1;
      const x = x0 + ((hash(i * 1.3 + seed) * w + k * wind * w * 2.2) % (w + 60)) - 30 + Math.sin(t * 1.3 + i) * 20 * (1 - wind);
      const y = y0 + (k * h * (1 - wind * 0.6) + hash(i * 5.1 + seed) * h * wind) % h;
      const rot = t * (1.5 + hs * 2) + i;
      const sz = 3 + hs * 3.5;
      ctx.fillStyle = cols[i % cols.length];
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.ellipse(x, y, sz * (0.6 + 0.4 * Math.abs(Math.cos(rot))), sz * 0.55, rot * 0.5, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 一片楓葉的小圖（每種顏色畫一次），飛舞的葉子都用貼圖，便宜
  const LEAFSPR = {};
  function leafSpr(col) {
    if (LEAFSPR[col]) return LEAFSPR[col];
    const c = newCv(48, 48);
    const x = c.getContext('2d');
    x.translate(24, 24);
    paint(x, (p) => A.mapleLeafPath(p, 0, 0, 19), col, { shade: U.mix(col, '#3a2a40', 0.28), cel: [4, 4], lw: 2.6, hl: [-6, -8, 4, 2], hlA: 0.5 });
    x.strokeStyle = 'rgba(255,255,255,0.45)';
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(0, 16);
    x.lineTo(0, -12);
    x.moveTo(0, 2);
    x.lineTo(-10, -4);
    x.moveTo(0, 2);
    x.lineTo(10, -4);
    x.stroke();
    return (LEAFSPR[col] = c);
  }
  // 被風吹著走的葉子：flip 讓它像在空中翻面
  function leafStream(ctx, t, n, box, spd, seed, cols, a) {
    const [x0, y0, w, h] = box;
    for (let i = 0; i < n; i++) {
      const hs = hash(i * 2.3 + seed);
      const sp = 0.6 + hash(i * 5.9 + seed) * 0.8;
      const k = (t * spd * sp / (w + 120) + hs) % 1;
      const x = x0 - 60 + k * (w + 120);
      const y = y0 + hash(i * 3.7 + seed) * h + Math.sin(t * 2.2 * sp + i) * 26 - k * 60;
      const sz = 8 + hash(i * 8.1 + seed) * 10;
      const rot = t * (3 + hs * 5) + i;
      const flip = Math.cos(t * (4 + hs * 4) + i * 1.7);
      ctx.save();
      ctx.globalAlpha = (a == null ? 1 : a) * Math.min(1, Math.sin(k * Math.PI) * 3);
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(1, Math.max(0.15, Math.abs(flip)));
      ctx.drawImage(leafSpr(cols[i % cols.length]), -sz, -sz, sz * 2, sz * 2);
      ctx.restore();
    }
  }

  function motes(ctx, t, n, box, rgb, seed) {
    const [x0, y0, w, h] = box;
    ctx.fillStyle = 'rgb(' + rgb + ')';
    for (let i = 0; i < n; i++) {
      const k = (t * 0.03 * (0.6 + hash(i + seed) * 0.8) + hash(i * 2.3 + seed)) % 1;
      const x = x0 + hash(i * 4.7 + seed) * w + Math.sin(t * 0.7 + i) * 18;
      const y = y0 + h - k * h;
      const a = Math.sin(k * Math.PI) * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7));
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + hash(i * 9.1 + seed) * 1.6, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function raysPaint(ctx, x, y, ang, list, len, rgb, a) {
    ctx.save();
    list.forEach(([off, wd, aa], i) => {
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const px = -dy;
      const py = dx;
      const sx = x + px * off;
      const sy = y + py * off;
      const g = ctx.createLinearGradient(sx, sy, sx + dx * len, sy + dy * len);
      g.addColorStop(0, 'rgba(' + rgb + ',' + (a * aa).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx - px * wd * 0.3, sy - py * wd * 0.3);
      ctx.lineTo(sx + px * wd * 0.3, sy + py * wd * 0.3);
      ctx.lineTo(sx + dx * len + px * wd, sy + dy * len + py * wd);
      ctx.lineTo(sx + dx * len - px * wd, sy + dy * len - py * wd);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }  // 光束也先畫成半解析度的圖，每幀只調透明度
  const RAYC = {};
  function rays(ctx, x, y, ang, list, len, rgb, a) {
    if (a <= 0.01) return;
    const key = [x, y, ang, len, rgb, JSON.stringify(list)].join('|');
    let R = RAYC[key];
    if (!R) {
      // 只存光束實際蓋到的範圍（貼圖的花費跟面積成正比）
      let x0 = 1e9;
      let y0 = 1e9;
      let x1 = -1e9;
      let y1 = -1e9;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      list.forEach(([off, wd]) => {
        const sx = x - dy * off;
        const sy = y + dx * off;
        [[sx, sy, wd * 0.3], [sx + dx * len, sy + dy * len, wd]].forEach(([px, py, w]) => {
          x0 = Math.min(x0, px - w);
          x1 = Math.max(x1, px + w);
          y0 = Math.min(y0, py - w);
          y1 = Math.max(y1, py + w);
        });
      });
      x0 = Math.max(0, Math.floor(x0));
      y0 = Math.max(0, Math.floor(y0));
      x1 = Math.min(1280, Math.ceil(x1));
      y1 = Math.min(720, Math.ceil(y1));
      const c = newCv(Math.max(1, x1 - x0), Math.max(1, y1 - y0));
      const g = c.getContext('2d');
      g.translate(-x0, -y0);
      raysPaint(g, x, y, ang, list, len, rgb, 1);
      R = RAYC[key] = { c, x0, y0, w: x1 - x0, h: y1 - y0 };
    }
    if (R.w <= 1 || R.h <= 1) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= Math.min(1, a);
    ctx.drawImage(R.c, R.x0, R.y0, R.w, R.h);
    ctx.restore();
  }


  function birds(ctx, t, x0, y0, spd) {
    ctx.strokeStyle = 'rgba(80,60,70,0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    [[0, 0], [-16, -8], [-18, 9], [-34, 2]].forEach(([dx, dy], i) => {
      const x = x0 + t * spd + dx;
      const y = y0 + dy + Math.sin(t * 1.3 + i) * 3;
      const f = Math.sin(t * 8 + i * 1.3) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - f);
      ctx.quadraticCurveTo(x - 2, y - 2, x, y + 1);
      ctx.quadraticCurveTo(x + 2, y - 2, x + 6, y - f);
      ctx.stroke();
    });
  }

  // 葉子留下的光尾：pos(u) 回傳 [x, y]
  function comet(ctx, pos, u, i, size, fade) {
    const L = LEAVES[i];
    const a = fade == null ? 1 : fade;
    if (a <= 0.01) return;
    ctx.save();
    ctx.lineCap = 'round';
    const NS = 16;
    const pts = [pos(u)];
    for (let j = 1; j <= NS; j++) {
      const uu = u - j * 0.018;
      if (uu < 0) break;
      pts.push(pos(uu));
    }
    // 三層：外面一圈淡的顏色光、中間的顏色、白色的芯
    for (let pass = 0; pass < 3; pass++) {
      if (pass === 1 && size < 8) continue;
      if (pass) ctx.globalCompositeOperation = 'lighter';
      for (let j = 1; j < pts.length; j++) {
        const k = 1 - j / (NS + 1);
        ctx.globalAlpha = a * k * [0.85, 0.3, 0.75][pass];
        ctx.strokeStyle = pass === 2 ? '#ffffff' : 'rgb(' + L.rgb + ')';
        ctx.lineWidth = [size * 1.1 * k + 1.5, size * 2.6 * k + 2, size * 0.28 * k + 0.5][pass];
        ctx.beginPath();
        ctx.moveTo(pts[j - 1][0], pts[j - 1][1]);
        ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
    }
    ctx.restore();
    // 沿路灑下的光屑（跟著葉子的顏色）
    for (let j = 2; j < pts.length; j += 3) {
      const k = 1 - j / (NS + 1);
      const h = hash(i * 31 + j + Math.floor(u * 40) * 0.37);
      const q = pts[j];
      const off = (h - 0.5) * size * 3.2 * (1 - k + 0.3);
      sparkle(ctx, q[0] + off, q[1] - off * 0.6 + (1 - k) * size * 1.5, size * (0.25 + h * 0.3), a * k * 0.9, j % 4 ? '#ffffff' : L.col);
    }
    const p = pts[0];
    haze(ctx, p[0], p[1], size * 3.2, L.rgb, a * 0.8);
    glow(ctx, p[0], p[1], size * 4, L.rgb, a * 0.7);
    glow(ctx, p[0], p[1], size * 1.6, '255,255,255', a * 0.8);
    ctx.save();
    ctx.globalAlpha *= a;
    leafGem(ctx, p[0], p[1], size, L.col, u * 14 + i);
    ctx.restore();
  }

  // 樹上發光的五片葉子
  function treeLeaves(ctx, ox, oy, s, t, o) {
    o = o || {};
    for (let i = 0; i < 5; i++) {
      if (o.gone && o.gone[i]) continue;
      const [lx, ly] = TREE_LEAVES[i];
      const x = ox + lx * s + (o.dx ? o.dx(ly * s) : 0);
      const y = oy + ly * s;
      const L = LEAVES[i];
      const pulse = 0.75 + Math.sin(t * 2.2 + i * 1.3) * 0.25;
      const big = i === 4 ? 1.35 : 1;
      glow(ctx, x, y, 70 * s * big * pulse * (o.glow || 1), L.rgb, 0.55 * (o.alpha == null ? 1 : o.alpha));
      glow(ctx, x, y, 26 * s * big, '255,255,255', 0.35 * pulse);
      const shake = o.shake ? Math.sin(t * 40 + i * 3) * o.shake[i] : 0;
      leafGem(ctx, x, y + Math.sin(t * 1.6 + i) * 2 * s, 17 * s * big, L.col, Math.sin(t * 1.2 + i * 2) * 0.12 + shake);
      for (let j = 0; j < 3; j++) {
        const a = t * 1.1 + j * 2.1 + i;
        sparkle(ctx, x + Math.cos(a) * 28 * s * big, y + Math.sin(a * 1.3) * 22 * s * big, 4 * s + 1.5, 0.5 + Math.sin(t * 3 + j * 2 + i) * 0.5, '#fffbe0');
      }
    }
  }

  // ════════ 八個鏡頭 ════════
  const SKY_DAWN = [[0, '#7aa8e6'], [0.42, '#bcd6f2'], [0.7, '#fde4c4'], [1, '#ffd6a0']];
  const SKY_STORM = [[0, '#5e6fb8'], [0.45, '#a9a6d8'], [0.72, '#f0c6c0'], [1, '#ffc49a']];

  function isleAt(t, storm) {
    const bob = Math.sin(t * 0.9) * 5;
    if (!storm) return { x: 640, y: 330 + bob, rot: 0, s: 0.78 };
    const k = sm(0.2, 4, t);
    return { x: 640 + Math.sin(t * 17) * 2 * k, y: 330 + bob + k * 14, rot: -0.035 * k, s: 0.78 };
  }
  function isleLeafPos(I, i) {
    const [lx, ly] = TREE_LEAVES[i];
    const x = lx * ISLE_TREE_S * I.s;
    const y = (ly * ISLE_TREE_S + ISLE_TREE_Y) * I.s;
    const cs = Math.cos(I.rot);
    const sn = Math.sin(I.rot);
    return [I.x + x * cs - y * sn, I.y + x * sn + y * cs];
  }

  function shotSky(ctx, t, storm) {
    const C = storm
      ? { x: 640, y: 350, z: lerp(1.1, 1.0, sm(0, 6, t)), sx: Math.sin(t * 23) * 3 * sm(0.2, 1, t), sy: Math.cos(t * 19) * 2 * sm(0.2, 1, t) }
      : { x: 640, y: lerp(372, 340, sm(0, 7.5, t)), z: lerp(1.0, 1.1, sm(0, 7.5, t)) };
    sky(ctx, storm ? SKY_STORM : SKY_DAWN, [640, 470, 620, '255,238,200', storm ? 0.45 : 0.75]);
    // 左上角的太陽
    glow(ctx, 170, -30, 420, storm ? '255,210,200' : '255,246,214', storm ? 0.3 : 0.55);
    // 天上慢慢轉的時鐘環
    cam(ctx, C, 0.12, () => {
      ctx.save();
      ctx.globalAlpha = storm ? 0.3 : 0.42;
      const sp = storm ? 3 : 1;
      blitAt(ctx, 'ringA', 640, 270, 1, t * 0.03 * sp);
      blitAt(ctx, 'ringB', 640, 270, 1, -t * 0.05 * sp);
      blitAt(ctx, 'ringC', 1090, 140, 1, t * 0.08 * sp);
      ctx.restore();
    });
    cam(ctx, C, 0.22, () => {
      blit(ctx, 'farIsles', 0, Math.sin(t * 0.7) * 4);
      if (!storm) birds(ctx, t, 180, 190, 26);
    });
    cam(ctx, C, 0.35, () => {
      band(ctx, 'bandFar', t * (storm ? 40 : 8), 420, 80);
    });
    // 光束
    rays(ctx, 180, -60, 1.1, [[0, 60, 0.5], [160, 90, 0.35], [330, 70, 0.4], [520, 110, 0.25]], 900, '255,246,220', (storm ? 0.25 : 0.55) * (0.8 + Math.sin(t * 0.8) * 0.2));
    const I = isleAt(t, storm);
    cam(ctx, C, 0.7, () => {
      ctx.save();
      ctx.translate(I.x, I.y);
      ctx.scale(I.s, I.s);
      ctx.translate(-I.x, -I.y);
      // 跟著漂的小碎岩
      [[-200, 250, 0.9, 0], [180, 290, 0.7, 2], [40, 380, 0.55, 4], [-360, 150, 0.4, 1], [380, 120, 0.45, 3], [-110, 430, 0.35, 5]].forEach(([dx, dy, s, ph]) => {
        blitAt(ctx, 'chunk', I.x + dx, I.y + dy + Math.sin(t * 1.2 + ph) * 8 + (storm ? t * 20 * s : 0), s, storm ? t * 0.3 : 0);
      });
      glow(ctx, I.x + 8, I.y + 336, 50, '255,220,140', 0.6 + Math.sin(t * 2) * 0.15);
      const tx = I.x;
      const ty = I.y - 150;
      glow(ctx, tx, ty, 190, '255,236,170', (storm ? 0.25 : 0.45) + Math.sin(t * 1.5) * 0.08);
      blitAt(ctx, 'isle', I.x, I.y, 1, I.rot);
      // 從島邊流下去、落進雲海的瀑布
      waterfall(ctx, t, I.x - 300, I.y + 16, 16, 340, 1, storm);
      waterfall(ctx, t, I.x + 292, I.y + 14, 13, 310, 2, storm);
      ctx.restore();
      if (!storm) {
        for (let i = 0; i < 5; i++) {
          const [x, y] = isleLeafPos(I, i);
          glow(ctx, x, y, 22, LEAVES[i].rgb, 0.8 + Math.sin(t * 2.4 + i) * 0.2);
          leafGem(ctx, x, y, i === 4 ? 8.5 : 6.5, LEAVES[i].col, Math.sin(t + i) * 0.2);
        }
      }
      if (storm) stormLeaves(ctx, t, I);
    });
    cam(ctx, C, 0.85, () => {
      band(ctx, 'bandMid', t * (storm ? 70 : 16), 560, 80);
      if (storm) stormCub(ctx, t, I);
    });
    cam(ctx, C, 1.1, () => {
      band(ctx, 'bandNear', t * (storm ? 110 : 26), 650, 120);
    });
    motes(ctx, t, 30, [0, 60, W(), H() - 120], '255,244,200', 1);
    if (storm) {
      windStreaks(ctx, t, 1, 0.8);
      petals(ctx, t, 50, [-40, 40, W() + 80, H() - 80], 1, 7, ['#ffc6dc', '#ffe39a', '#fff6ea']);
    }
  }

  function waterfall(ctx, t, x, y, w, len, seed, storm) {
    const sway = storm ? Math.sin(t * 3 + seed) * 10 : 0;
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, 'rgba(190,232,255,0.95)');
    g.addColorStop(0.55, 'rgba(215,240,255,0.6)');
    g.addColorStop(1, 'rgba(235,248,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x - w * 0.55, y + len * 0.5, x - w * 1.3 + sway, y + len);
    ctx.lineTo(x + w * 1.3 + sway, y + len);
    ctx.quadraticCurveTo(x + w * 0.55, y + len * 0.5, x + w / 2, y);
    ctx.closePath();
    ctx.fill();
    // 水流的亮紋，往下越散
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      const k = (t * (0.8 + hash(i * 1.3 + seed) * 0.5) + hash(i * 2.7 + seed)) % 1;
      const sx = x + (hash(i * 3.1 + seed) - 0.5) * w * (0.8 + k * 1.8) + sway * k;
      const sy = y + k * len * 0.92;
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.fillRect(sx - 1, sy, 2, 10 + k * 26);
    }
    ctx.restore();
    // 邊緣的水沫、落下去的水霧
    glow(ctx, x, y + 2, w * 1.6, '255,255,255', 0.5);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.25 + i / 3) % 1;
      haze(ctx, x + sway + (i - 1) * w, y + len * (0.7 + k * 0.25), w * (2 + k * 3), '240,248,255', 0.35 * (1 - k));
    }
  }

  // 散開的五道光（在遠景的浮島鏡頭裡）
  const SCATTER = [
    { end: [-140, 700], ctl: [200, 60] },
    { end: [1440, 740], ctl: [1080, 60] },
    { end: [300, 860], ctl: [420, 100] },
    { end: [1010, 880], ctl: [900, 80] },
    { end: [700, -160], ctl: [560, 40] },
  ];
  function stormLeaves(ctx, t, I) {
    for (let i = 0; i < 5; i++) {
      const t0 = 0.3 + [0, 0.3, 0.55, 0.8, 1.15][i];
      const u = cl((t - t0) / 2.2);
      const [sx, sy] = isleLeafPos(I, i);
      if (u <= 0) {
        glow(ctx, sx, sy, 24, LEAVES[i].rgb, 0.9);
        leafGem(ctx, sx, sy, i === 4 ? 8.5 : 6.5, LEAVES[i].col, Math.sin(t * 30 + i) * 0.3);
        continue;
      }
      const S = SCATTER[i];
      const pos = (uu) => {
        const e = Math.pow(uu, 1.25);
        const a = 1 - e;
        return [a * a * sx + 2 * a * e * S.ctl[0] + e * e * S.end[0], a * a * sy + 2 * a * e * S.ctl[1] + e * e * S.end[1]];
      };
      if (u < 0.08) glow(ctx, sx, sy, 90 * (1 - u / 0.08), '255,255,255', 0.9);
      comet(ctx, pos, u, i, 9, 1 - sm(0.9, 1, u));
    }
  }
  // 被吹下浮島的小獅子（遠景）
  function stormCub(ctx, t, I) {
    const t0 = 3.0;
    if (t < t0) return;
    const u = t - t0;
    const x = I.x + 296 * I.s + u * 80;
    const y = I.y - 30 - u * 70 + u * u * 130;
    cub(ctx, x, y, 0.62, 1, { state: 'fall', t: t, p: 0 }, u * 2.6);
  }

  function windStreaks(ctx, t, I, a) {
    if (I <= 0.01) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const sp = 0.6 + hash(i * 2.2) * 0.7;
      const k = (t * 0.55 * sp + hash(i * 5.5)) % 1;
      const y = 80 + hash(i * 3.3) * (H() - 160);
      const len = 120 + hash(i * 7.7) * 220;
      const x = -300 + k * (W() + 600);
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.55 * I * a;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 + hash(i) * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len * 0.5, y - 10 - hash(i * 9) * 16, x + len, y + Math.sin(t * 2 + i) * 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 中景的樹（第二、四鏡）
  const TREE_X = 640;
  const TREE_Y = 632;
  const TREE_S = 0.95;
  function shotTree(ctx, t, wind) {
    const I = wind ? sm(0.2, 1.6, t) : 0;
    const C = wind
      ? { x: 640, y: 390, z: 1.08 + sm(2, 3.6, t) * 0.05, sx: Math.sin(t * 31) * 4 * I, sy: Math.cos(t * 27) * 3 * I }
      : { x: lerp(640, 640, 0), y: lerp(430, 346, sm(0.4, 6.4, t)), z: lerp(1.22, 1.03, sm(0.4, 6.4, t)) };
    sky(ctx, wind ? SKY_STORM : SKY_DAWN, [640, 420, 560, '255,238,200', 0.6]);
    cam(ctx, C, 0.1, () => {
      ctx.save();
      ctx.globalAlpha = 0.3;
      blitAt(ctx, 'ringA', 640, 250, 1.15, t * 0.025 * (1 + I * 4));
      blitAt(ctx, 'ringB', 640, 250, 1.15, -t * 0.04 * (1 + I * 4));
      ctx.restore();
    });
    cam(ctx, C, 0.3, () => {
      band(ctx, 'bandFar', t * (8 + I * 60), 410, 80);
    });
    cam(ctx, C, 0.6, () => blit(ctx, 'cyBack'));
    rays(ctx, 300, -80, 1.15, [[0, 50, 0.5], [180, 80, 0.35], [380, 60, 0.4]], 900, '255,246,220', 0.4 * (1 - I * 0.6));
    const gone = [];
    const shake = [];
    const rel = [];
    for (let i = 0; i < 5; i++) {
      rel[i] = 2.0 + i * 0.28;
      gone[i] = wind && t > rel[i];
      shake[i] = wind ? sm(0.8, rel[i], t) * 0.5 : 0;
    }
    cam(ctx, C, 1, () => {
      blit(ctx, 'cyFloor');
      // 葉子的光順著樹幹流進地底（它們讓神殿浮著）
      if (!wind) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
          const [lx, ly] = TREE_LEAVES[i];
          const sx = TREE_X + lx * TREE_S;
          const sy = TREE_Y + ly * TREE_S;
          for (let j = 0; j < 3; j++) {
            const k = (t * 0.28 + j / 3 + i * 0.13) % 1;
            let x;
            let y;
            if (k < 0.5) {
              const u = k / 0.5;
              x = lerp(sx, TREE_X, u * u);
              y = lerp(sy, TREE_Y - 300, u);
            } else {
              const u = (k - 0.5) / 0.5;
              x = TREE_X + Math.sin(u * 6 + i) * 6;
              y = lerp(TREE_Y - 300, TREE_Y + 10, u);
            }
            glow(ctx, x, y, 16, LEAVES[i].rgb, Math.sin(k * Math.PI) * 0.8 * sm(0.5, 2, t));
          }
        }
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + pulse * 0.25;
        ctx.strokeStyle = '#ffe9a0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(640, 640, 330, 52, 0, 0, PI2);
        ctx.stroke();
        ctx.restore();
      }
      glow(ctx, TREE_X, TREE_Y - 170 * TREE_S, 60, '255,220,140', 0.5 + Math.sin(t * 2) * 0.15);
      blit(ctx, 'treeTrunk', TREE_X, TREE_Y);
      // 樹冠隨風擺
      const lean = wind ? -(0.05 * I + Math.sin(t * 5.5) * 0.035 * I + Math.sin(t * 13) * 0.01 * I) : Math.sin(t * 0.8) * 0.006;
      const pivot = TREE_Y - 300 * TREE_S;
      const skewX = (yy) => (yy - pivot) * lean;
      ctx.save();
      ctx.translate(TREE_X, pivot);
      ctx.transform(1, 0, lean, 1, 0, 0);
      ctx.translate(-TREE_X, -pivot);
      const Lc = layer('treeCanopy');
      ctx.drawImage(Lc.c, TREE_X + Lc.x, TREE_Y + Lc.y, Lc.w, Lc.h);
      ctx.restore();
      const dimGlow = wind ? 1 - sm(2, 3.4, t) * 0.6 : 1;
      treeLeaves(ctx, TREE_X, TREE_Y, TREE_S, t, { gone, shake, glow: dimGlow, dx: (yy) => skewX(TREE_Y + yy) });
      if (wind) {
        if (t < 3.5) windCub(ctx, t, I);
        for (let i = 0; i < 5; i++) {
          if (t < rel[i]) continue;
          const [lx, ly] = TREE_LEAVES[i];
          const sx = TREE_X + lx * TREE_S + skewX(TREE_Y + ly * TREE_S);
          const sy = TREE_Y + ly * TREE_S;
          const dirs = [[-900, 300], [1000, -120], [-800, -420], [1000, 280], [120, -900]];
          const u = cl((t - rel[i]) / 1.3);
          const pos = (uu) => {
            const e = uu * uu;
            return [sx + dirs[i][0] * e + Math.sin(uu * 5) * 30, sy + dirs[i][1] * e - Math.sin(uu * 3) * 60];
          };
          const f = cl((t - rel[i]) / 0.35);
          if (f < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - f;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4 * (1 - f) + 1;
            ctx.beginPath();
            ctx.arc(sx, sy, 10 + f * 60, 0, PI2);
            ctx.stroke();
            ctx.restore();
            glow(ctx, sx, sy, 80, LEAVES[i].rgb, 1 - f);
          }
          comet(ctx, pos, u, i, 16, 1 - sm(0.85, 1, u));
        }
      }
      blit(ctx, 'cyFore');
      if (wind && t >= 3.5) windCub(ctx, t, I);
    });
    petals(ctx, t, wind ? 80 : 26, [-40, 40, W() + 80, H() - 60], wind ? I : 0, 3, ['#ffc6dc', '#ffe39a', '#fff6ea', '#9ad886']);
    motes(ctx, t, 26, [0, 80, W(), H() - 140], '255,244,200', 2);
    if (wind) {
      // 樹上被扯下來的葉子，一整條一整條往右飛
      leafStream(ctx, t, Math.round(34 * I), [0, 70, W(), H() - 200], 620, 11, ['#6fbc68', '#9ada86', '#4f9c5a', '#f2b85a', '#ffc2d8'], I);
      windStreaks(ctx, t, I, 1);
      // 雲的影子掠過地面、光在閃
      const shd = glowSpr('40,30,90');
      ctx.save();
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.32 + i * 0.5) % 1;
        ctx.globalAlpha = 0.34 * I;
        ctx.drawImage(shd, -650 + k * 2000, 470 + i * 90, 700, 220);
      }
      ctx.restore();
      // 光一閃一閃：暗下來的那層紫色忽淡忽濃
      const flick = Math.max(0, Math.sin(t * 9.3) * Math.sin(t * 3.1 + 1)) * 0.09 * I;
      ctx.fillStyle = 'rgba(60,40,110,' + Math.max(0, 0.13 * I - flick).toFixed(3) + ')';
      ctx.fillRect(0, 0, W(), H());
    }
  }

  // 第四鏡：樹下的小獅子被風驚醒、抓不住、被吹走
  function windCub(ctx, t, I) {
    const x0 = 780;
    const y0 = TREE_Y + 6;
    if (t < 1.0) {
      const br = 1 + Math.sin(t * 2.4) * 0.02;
      ctx.save();
      ctx.translate(x0, y0);
      ctx.scale(1, br);
      cub(ctx, 0, 0, 1.05, -1, { state: 'idle', t: 0.05, p: 0, onGround: true });
      ctx.restore();
      return;
    }
    if (t < 3.5) {
      const st = t < 1.5 ? { state: 'idle', t: 1.0, p: 0, onGround: true } : { state: 'hurt', t, p: 0, onGround: true };
      const slide = sm(1.5, 3.5, t) * 36;
      cub(ctx, x0 + slide + Math.sin(t * 30) * 1.5 * I, y0, 1.05, -1, st, t < 1.5 ? 0 : 0.12);
      if (t > 1.0 && t < 1.8) {
        ctx.save();
        ctx.globalAlpha = sm(1.0, 1.15, t) * (1 - sm(1.6, 1.8, t));
        G.hud.text(ctx, '！', x0 - 20, y0 - 104, 30, '#ffe45a', 'center');
        ctx.restore();
      }
      return;
    }
    const u = t - 3.5;
    const x = x0 + 36 + u * 260 + u * u * 120;
    const y = y0 - u * 220 + u * u * 30;
    cub(ctx, x, y, 1.05 + u * 0.25, -1, { state: 'fall', t, p: 0 }, u * 3.2);
  }

  // 第三鏡：午睡特寫
  function shotNap(ctx, t) {
    const C = { x: lerp(640, 740, sm(0, 7, t)), y: lerp(372, 440, sm(0, 7, t)), z: lerp(1.0, 1.14, sm(0, 7, t)) };
    sky(ctx, SKY_DAWN, [900, 300, 600, '255,238,200', 0.7]);
    cam(ctx, C, 0.25, () => {
      band(ctx, 'bandFar', t * 6, 350, 80);
    });
    cam(ctx, C, 0.5, () => blit(ctx, 'napBack'));
    // 景深：後景蓋一層淡霧
    ctx.fillStyle = 'rgba(255,246,230,0.22)';
    ctx.fillRect(0, 0, W(), H());
    // 從樹冠縫隙斜照下來的光
    rays(ctx, 620, -40, 1.95, [[-160, 40, 0.45], [-40, 60, 0.55], [90, 34, 0.4], [200, 70, 0.3]], 820, '255,244,210', 0.45 + Math.sin(t * 0.7) * 0.08);
    cam(ctx, C, 1, () => {
      blit(ctx, 'napTree');
      // 樹上葉子灑下來的光斑（葉子在風裡動，光斑也跟著晃）
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      [[700, 630, 90, 0], [960, 660, 70, 1], [560, 600, 60, 2], [1080, 610, 50, 3]].forEach(([x, y, r, i]) => {
        const a = 0.22 + Math.sin(t * 1.3 + i * 2) * 0.08;
        ctx.save();
        ctx.translate(x + Math.sin(t * 0.6 + i) * 10, y);
        ctx.scale(1, 0.3);
        ctx.globalAlpha = a;
        ctx.drawImage(glowSpr(LEAVES[i === 3 ? 4 : i].rgb), -r, -r, r * 2, r * 2);
        ctx.restore();
      });
      const wsp = glowSpr('255,246,214');
      for (let i = 0; i < 14; i++) {
        const bx = 520 + hash(i * 3.3) * 680 + Math.sin(t * (0.5 + hash(i) * 0.6) + i) * 16;
        const by = 590 + hash(i * 5.7) * 120;
        const r = 16 + hash(i * 7.1) * 24;
        const a = 0.18 + 0.14 * Math.sin(t * (0.9 + hash(i * 2.2)) + i * 1.9);
        if (a <= 0.02) continue;
        ctx.globalAlpha = a;
        ctx.drawImage(wsp, bx - r, by - r * 0.35, r * 2, r * 0.7);
      }
      ctx.restore();
      // 睡覺的小獅子
      const cx = 820;
      const cy = 672;
      const br = Math.sin(t * 2.2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + br * 0.012, 1 - br * 0.02);
      const land = sm(4.6, 5.0, t);
      cub(ctx, 0, 0, 2.3, 1, { state: 'idle', t: 0.05, p: 0, onGround: true }, 0.05 + Math.sin(t * 1.1) * 0.02 + (t > 5 ? Math.max(0, Math.sin((t - 5) * 12)) * 0.03 * (1 - sm(5, 5.6, t)) : 0));
      ctx.restore();
      // 一片花瓣慢慢飄下，停在鼻子上
      const nose = [cx + 60, cy - 88];
      const u = sm(0.8, 5.0, t);
      const px = lerp(cx - 150, nose[0], u) + Math.sin(t * 2.2) * 40 * (1 - u);
      const py = lerp(cy - 460, nose[1], u);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.sin(t * 3) * 0.8 * (1 - land) + 0.4);
      paint(ctx, (p) => p.ellipse(0, 0, 9, 5.5, 0, 0, PI2), '#ffc2d8', { shade: '#f096b8', cel: [0, 2], lw: 2 });
      ctx.restore();
      zzz(ctx, cx + 30, cy - 150, t, 1.3);
      blit(ctx, 'napFront');
      // 小獅子身邊一根一根隨風擺的草
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const gx = 650 + hash(i * 1.9) * 360;
        const gy = 686 + hash(i * 4.1) * 18;
        const gh = 18 + hash(i * 6.7) * 26;
        const sw = Math.sin(t * 1.6 + gx * 0.02) * 5 + Math.sin(t * 3.1 + i) * 1.5;
        ctx.beginPath();
        ctx.moveTo(gx - 3, gy);
        ctx.quadraticCurveTo(gx - 1 + sw * 0.3, gy - gh * 0.6, gx + sw, gy - gh);
        ctx.quadraticCurveTo(gx + 1 + sw * 0.3, gy - gh * 0.55, gx + 3, gy);
        ctx.closePath();
        ctx.fillStyle = A.c(['#6f9e44', '#8cbc52', '#a8d06a', '#5a8a3a'][i % 4]);
        ctx.fill();
      }
      ctx.restore();
    });
    // 慢慢飄下的幾片葉子
    leafStream(ctx, t, 5, [0, 80, W(), 360], 40, 21, ['#9ada86', '#f2b85a', '#6fbc68'], 0.9);
    petals(ctx, t, 18, [-40, 40, W() + 80, H() - 60], 0, 5, ['#ffc6dc', '#ffe39a', '#fff6ea']);
    motes(ctx, t, 24, [300, 60, 900, H() - 160], '255,244,200', 3);
    // 從上方灑下的暖光
    glow(ctx, 520, 40, 420, '255,236,170', 0.35);
  }

  // 第六鏡：穿過雲層往下掉
  function shotFall(ctx, t) {
    const reveal = sm(1.4, 5.4, t);
    sky(ctx, [[0, '#6ea6e6'], [0.5, '#a8d2f4'], [1, '#e2f2ff']]);
    // 底下的大地慢慢出現
    const lk = lerp(0.8, 1.05, reveal);
    const ly = lerp(760, 250, reveal);
    ctx.save();
    ctx.translate(640, ly);
    ctx.scale(lk, lk);
    blit(ctx, 'lands', -800, 0);
    // 散落到各地的光
    const tg = [LAND.forest, LAND.sea, LAND.canyon, LAND.snow];
    for (let i = 0; i < 4; i++) {
      const t0 = 3 + i * 0.35;
      const u = cl((t - t0) / 2.2);
      if (u <= 0) continue;
      const [ex, ey] = [tg[i][0] - 800, tg[i][1]];
      const pos = (uu) => [lerp(ex * 0.5, ex, uu), lerp(-240, ey, uu * uu)];
      if (u < 1) comet(ctx, pos, u, i, 6, 1);
      else {
        glow(ctx, ex, ey, 40 + Math.sin(t * 4 + i) * 6, LEAVES[i].rgb, 0.9);
        glow(ctx, ex, ey, 14, '255,255,255', 0.8);
      }
    }
    ctx.restore();
    // 金色心葉往上飄回雲的上面
    if (t > 3.6) {
      const u = cl((t - 3.6) / 2.5);
      comet(ctx, (uu) => [lerp(1000, 1160, uu), lerp(520, -40, uu)], u, 4, 6, 1 - sm(0.8, 1, u));
    }
    // 往上衝的雲
    const clouds = ['puffC', 'puffB', 'puffA'];
    const n = 16;
    const drawPuffs = (front) => {
      for (let i = 0; i < n; i++) {
        const d = 0.4 + hash(i * 3.7) * 1.3;
        const isFront = d > 1.25;
        if (isFront !== front) continue;
        const life = 1 - sm(1.2, 4.2, t) * (0.55 + hash(i * 1.9) * 0.6);
        if (life <= 0.05) continue;
        const span = H() + 500;
        const k = (t * (0.25 + d * 0.45) + hash(i * 6.1)) % 1;
        const y = H() + 250 - k * span;
        let x = hash(i * 8.3) * (W() + 200) - 100;
        if (isFront && Math.abs(x - 640) < 280) x += x < 640 ? -280 : 280;
        const id = clouds[Math.min(2, Math.floor(d / 0.6))];
        ctx.save();
        ctx.globalAlpha = (isFront ? 0.85 : 0.95) * Math.min(1, life * 1.4);
        blitAt(ctx, id, x, y, 0.5 + d * 0.5);
        ctx.restore();
      }
    };
    // 薄雲的長條，被墜落的速度拉長
    const wsp = glowSpr('255,255,255');
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const k = (t * (0.55 + hash(i * 2.1) * 0.5) + hash(i * 9.3)) % 1;
      const wx = hash(i * 4.9) * W();
      const wy = H() + 300 - k * (H() + 700);
      const ww = 16 + hash(i * 3.3) * 30;
      ctx.globalAlpha = 0.3 * Math.sin(k * Math.PI) * (1 - reveal * 0.5);
      ctx.drawImage(wsp, wx - ww, wy - 220, ww * 2, 440);
    }
    ctx.restore();
    drawPuffs(false);
    // 速度線
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const k = (t * (1.8 + hash(i) * 1.4) + hash(i * 4.4)) % 1;
      let x = hash(i * 2.9) * (W() - 500);
      if (x > W() / 2 - 250) x += 500;
      const y = H() + 100 - k * (H() + 300);
      const len = 50 + hash(i * 5.3) * 90;
      ctx.globalAlpha = 0.5 * Math.sin(k * Math.PI);
      ctx.lineWidth = 2 + hash(i * 7.1) * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + len);
      ctx.stroke();
    }
    ctx.restore();
    // 小獅子（翻滾，但是很可愛）
    const cx = 640 + Math.sin(t * 1.3) * 60;
    const cy = 330 + Math.sin(t * 2.1) * 16 - reveal * 30;
    const rot = Math.sin(t * 1.7) * 0.6 + t * 0.9;
    glow(ctx, cx, cy - 40, 120, '255,250,230', 0.25);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const k = (t * 2.2 + i / 5) % 1;
      const x = cx - 70 + i * 34;
      const y = cy - 40 - k * 120;
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 6, y - 20, x, y - 44);
      ctx.stroke();
    }
    ctx.restore();
    const hurt = Math.floor(t / 0.9) % 3 === 1;
    cub(ctx, cx, cy + 40, 2.1, 1, { state: hurt ? 'hurt' : 'fall', t, p: 0 }, rot);
    // 飛出去的淚珠
    const tk = (t * 1.4) % 1;
    ctx.save();
    ctx.globalAlpha = Math.sin(tk * Math.PI) * 0.9;
    paint(ctx, (p) => p.ellipse(cx - 30 - tk * 40, cy - 90 - tk * 70, 4, 6, 0.4, 0, PI2), '#bfe6ff', { lw: 1.6 });
    ctx.restore();
    drawPuffs(true);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.3 * (1 - sm(0, 0.8, t))).toFixed(3) + ')';
    ctx.fillRect(0, 0, W(), H());
  }

  // 第七、八鏡：陌生的森林
  function shotWake(ctx, t, title) {
    const up = title ? 1 : sm(3.0, 6.6, t);
    const C = title
      ? { x: 640, y: 360, z: lerp(1.0, 1.04, sm(0, 6, t)) }
      : { x: lerp(560, 640, up), y: lerp(530, 360, up), z: lerp(1.5, 1.0, up) };
    sky(ctx, [[0, '#8fcaf6'], [0.35, '#cfeaff'], [0.7, '#fff6dc'], [1, '#fff0c8']]);
    // 天上的神殿，正在往下沉
    const tt = title ? 8 + t : t;
    cam(ctx, C, 0.15, () => {
      // 神殿在天上，一點一點往下沉：越來越斜，底下不停掉碎石
      const sink = tt * 3.2;
      const x = 860;
      const y = 128 + sink;
      const sc = 0.24;
      const tilt = -0.05 - tt * 0.004;
      glow(ctx, x, y - 30, 120, '255,226,150', 0.5 + Math.sin(tt * 2) * 0.1);
      // 往下拖的一道淡淡的塵
      const dg = ctx.createLinearGradient(0, y + 40, 0, y + 200);
      dg.addColorStop(0, 'rgba(190,170,160,0.3)');
      dg.addColorStop(1, 'rgba(190,170,160,0)');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.moveTo(x - 30, y + 40);
      ctx.lineTo(x + 40, y + 40);
      ctx.lineTo(x + 70, y + 200);
      ctx.lineTo(x - 60, y + 200);
      ctx.closePath();
      ctx.fill();
      blitAt(ctx, 'isle', x, y, sc, tilt);
      // 掉下來的碎石（有大有小，越掉越快）
      for (let i = 0; i < 10; i++) {
        const k = (tt * (0.16 + hash(i * 2.2) * 0.12) + hash(i * 7.7)) % 1;
        const bx = x - 60 + hash(i * 3.1) * 120 + k * 10;
        const by = y + 20 + hash(i * 1.3) * 40 + k * k * 180;
        const bs = 1.5 + hash(i * 5.5) * 3;
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.fillStyle = i % 3 ? '#9a7c6c' : '#c9ad98';
        ctx.fillRect(bx - bs / 2, by - bs / 2, bs, bs);
      }
      ctx.globalAlpha = 1;
      if (Math.floor(tt / 2.3) % 2 === 0) {
        const k = (tt % 2.3) / 2.3;
        blitAt(ctx, 'chunk', x + 40, y + 60 + k * k * 220, 0.12, k * 3);
      }
    });
    cam(ctx, C, 0.35, () => blit(ctx, 'fwFar'));
    cam(ctx, C, 0.65, () => blit(ctx, 'fwMid'));
    rays(ctx, 860, -40, 2.1, [[-120, 40, 0.5], [-40, 70, 0.6], [60, 50, 0.45], [150, 90, 0.35]], 900, '255,246,210', 0.5 + Math.sin(t * 0.9) * 0.1);
    shaftDust(ctx, t, 860, -40, 2.1, 760, 260, 50, '255,248,220', 0.8);
    cam(ctx, C, 1, () => {
      blit(ctx, 'fwFront');
      const x = 560;
      const y = 606;
      if (title) {
        cub(ctx, x, y, 1.9, 1, { state: 'idle', t: t + 1, p: 0, onGround: true }, -0.1);
      } else if (t < 2.5) {
        // 側躺，眨眼
        const open = (t > 1.3 && t < 1.55) || t > 1.85;
        const br = Math.sin(t * 2.2) * 0.02;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1.9, 1.9);
        A.groundShadow(ctx, 0, 0, 30);
        ctx.translate(-4, -14);
        ctx.rotate(-Math.PI / 2 * 0.9 + (t > 1.85 ? sm(1.85, 2.5, t) * 0.25 : 0));
        ctx.translate(0, 14);
        ctx.scale(1, 1 + br);
        A.drawLion(ctx, 0, 0, 1, { state: 'idle', t: open ? 1.0 : 0.05, p: 0 });
        ctx.restore();
      } else {
        // 跳起來、抬頭看
        const h = t < 3.0 ? Math.sin(((t - 2.5) / 0.5) * Math.PI) * 30 : 0;
        const st = t < 3.0 ? { state: 'jump', t, p: 0 } : { state: 'idle', t, p: 0, onGround: true };
        const look = -0.14 * sm(3.4, 4.2, t);
        cub(ctx, x, y - h, 1.9, 1, st, look);
        if (t > 4.2 && t < 6.4) {
          ctx.save();
          ctx.globalAlpha = sm(4.2, 4.5, t) * (1 - sm(6.0, 6.4, t));
          G.hud.text(ctx, '…？', x + 44, y - 170 - sm(4.2, 4.5, t) * 8, 26, '#ffffff', 'center');
          ctx.restore();
        }
      }
      // 小獅子前面的草
      grassTuft(ctx, x - 60, y + 14, 1.3);
      grassTuft(ctx, x + 70, y + 16, 1.1);
    });
    // 蝴蝶
    for (let i = 0; i < 2; i++) {
      const k = t * 0.12 + i * 0.5;
      const bx = 300 + ((k * 900) % 900) + Math.sin(t * 1.5 + i) * 40;
      const by = 470 + Math.sin(t * 2 + i * 3) * 50 - i * 60;
      const f = Math.abs(Math.sin(t * 12 + i));
      cam(ctx, C, 0.9, () => {
        ctx.save();
        ctx.translate(bx, by);
        const col = i ? '#ffd35a' : '#9ad6ff';
        paint(ctx, (p) => {
          p.ellipse(-5, -3, 6, 5 * f + 1, -0.4, 0, PI2);
          p.moveTo(11, -3);
          p.ellipse(5, -3, 6, 5 * f + 1, 0.4, 0, PI2);
        }, col, { lw: 1.4 });
        ctx.restore();
      });
    }
    // 最前面的大葉子（比地面更近，鏡頭動的時候動得更多）
    cam(ctx, C, 1.25, () => {
      const sw = Math.sin(t * 0.9) * 4;
      blit(ctx, 'fwCornerL', -30 + sw, 14);
      blit(ctx, 'fwCornerR', 30 - sw * 0.8, 18);
    });
    motes(ctx, t, 34, [500, 100, 600, H() - 200], '255,250,210', 4);
    petals(ctx, t, 10, [-40, 40, W() + 80, H() - 60], 0, 9, ['#9ad886', '#c8e89a']);
    if (title) titleCard(ctx, t);
  }

  // 標題字：描邊＋上亮下金的漸層，畫一次存起來（另存一張白色的字形給掃光用）
  const TITLEC = {};
  function titleText(text) {
    if (TITLEC.text === text) return TITLEC;
    const k = Math.max(1, Math.min(2, IX.k));
    const ms = newCv(8, 8).getContext('2d');
    ms.font = 'bold 44px ' + A.FONT;
    const tw = ms.measureText(text).width;
    const w = Math.ceil(tw + 40);
    const h = 72;
    const mk = (fn) => {
      const c = newCv(w * k, h * k);
      const x = c.getContext('2d');
      x.scale(k, k);
      x.translate(w / 2, h / 2);
      x.font = 'bold 44px ' + A.FONT;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineJoin = 'round';
      fn(x);
      return c;
    };
    const c = mk((x) => {
      x.lineWidth = 9;
      x.strokeStyle = 'rgba(30,16,10,0.55)';
      x.strokeText(text, 0, 2);
      x.lineWidth = 6;
      x.strokeStyle = 'rgba(60,32,14,0.85)';
      x.strokeText(text, 0, 0);
      const tg = x.createLinearGradient(0, -22, 0, 22);
      tg.addColorStop(0, '#fffbea');
      tg.addColorStop(0.55, '#fff0c4');
      tg.addColorStop(1, '#f2c66a');
      x.fillStyle = tg;
      x.fillText(text, 0, 0);
    });
    const m = mk((x) => {
      x.fillStyle = 'rgba(255,240,200,1)';
      x.fillText(text, 0, 0);
    });
    return Object.assign(TITLEC, { text, c, m, w, h, k, tw });
  }

  function titleCard(ctx, t) {
    // 暗角，讓字浮出來
    const v = sm(0.2, 1.6, t) * 0.62;
    if (!TITLEC.vig) {
      const vc = (TITLEC.vig = newCv(320, 180));
      const x = vc.getContext('2d');
      x.scale(0.25, 0.25);
      const g = x.createRadialGradient(640, 360, 120, 640, 360, 760);
      g.addColorStop(0, 'rgba(20,14,30,0.55)');
      g.addColorStop(1, 'rgba(20,14,30,1)');
      x.fillStyle = g;
      x.fillRect(0, 0, 1280, 720);
    }
    ctx.save();
    ctx.globalAlpha = v;
    ctx.drawImage(TITLEC.vig, 0, 0, W(), H());
    ctx.restore();
    const a = sm(0.6, 1.8, t);
    const text = IX.text || '';
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(640, 300 - (1 - a) * 10);
    glow(ctx, 0, 0, 260, '255,220,150', 0.28 * a);
    const TC = titleText(text);
    ctx.drawImage(TC.c, -TC.w / 2, -TC.h / 2, TC.w, TC.h);
    // 一道光從字上掃過（切成幾條，越靠中間越亮）
    const sw = sm(1.2, 2.6, t);
    if (sw > 0 && sw < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sx = lerp(-TC.w / 2, TC.w / 2, sw);
      for (let k = -3; k <= 3; k++) {
        const x0 = sx + k * 12 - 6;
        const cx0 = Math.max(0, x0 + TC.w / 2);
        const cx1 = Math.min(TC.w, x0 + 12 + TC.w / 2);
        if (cx1 <= cx0) continue;
        ctx.globalAlpha = a * 0.75 * (1 - Math.abs(k) / 4);
        ctx.drawImage(TC.m, cx0 * TC.k, 0, (cx1 - cx0) * TC.k, TC.m.height, cx0 - TC.w / 2, -TC.h / 2, cx1 - cx0, TC.h);
      }
      ctx.restore();
    }
    const tw = TC.tw / 2 + 24;
    // 兩邊的金色細線與菱形
    const ll = 120 * sm(0.9, 2.0, t);
    if (ll > 1) {
      [-1, 1].forEach((sd) => {
        const g2 = ctx.createLinearGradient(sd * tw, 0, sd * (tw + ll), 0);
        g2.addColorStop(0, 'rgba(255,214,130,0.9)');
        g2.addColorStop(1, 'rgba(255,214,130,0)');
        ctx.strokeStyle = g2;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sd * tw, 2);
        ctx.lineTo(sd * (tw + ll), 2);
        ctx.stroke();
        ctx.fillStyle = '#ffe2a0';
        ctx.beginPath();
        ctx.moveTo(sd * (tw - 8), 2);
        ctx.lineTo(sd * (tw - 3), -3);
        ctx.lineTo(sd * (tw + 2), 2);
        ctx.lineTo(sd * (tw - 3), 7);
        ctx.closePath();
        ctx.fill();
      });
    }
    ctx.restore();
    // 五片葉子之間的細線
    const la = sm(1.6, 3.0, t);
    if (la > 0) {
      ctx.save();
      ctx.globalAlpha = la * 0.6;
      ctx.strokeStyle = '#ffd98a';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(640 - 2 * 72 - 26, 376);
      ctx.lineTo(640 - 2 * 72 - 26 + (4 * 72 + 52) * la, 376);
      ctx.stroke();
      ctx.restore();
    }
    // 五片葉子一片一片亮起
    for (let i = 0; i < 5; i++) {
      const k = sm(1.6 + i * 0.28, 2.1 + i * 0.28, t);
      if (k <= 0) continue;
      const x = 640 + (i - 2) * 72;
      const y = 376 - (1 - k) * 12;
      ctx.save();
      ctx.globalAlpha = k;
      glow(ctx, x, y, 42, LEAVES[i].rgb, 0.7 + Math.sin(t * 2.5 + i) * 0.2);
      leafGem(ctx, x, y, i === 4 ? 22 : 18, LEAVES[i].col, Math.sin(t * 1.4 + i) * 0.12);
      ctx.restore();
      if (k < 1) {
        sparkle(ctx, x, y, 22 * (1 - k) + 4, 1 - k, '#ffffff');
        // 點亮時的光圈
        ctx.save();
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.strokeStyle = LEAVES[i].col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 14 + k * 30, 0, PI2);
        ctx.stroke();
        ctx.restore();
      }
    }
    const b = sm(3.4, 4.4, t);
    if (b > 0) {
      ctx.save();
      ctx.globalAlpha = b * 0.9;
      G.hud.text(ctx, '小獅子的冒險', 640, 428, 20, '#ffe6b0', 'center');
      ctx.fillStyle = '#ffd98a';
      [-1, 1].forEach((sd) => {
        ctx.fillRect(640 + sd * 74 - (sd > 0 ? 0 : 36), 428, 36, 1.5);
        ctx.beginPath();
        A.mapleLeafPath(ctx, 640 + sd * 118, 428, 6);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  // 第零鏡：一百年前，王座廳
  // 掉下來的石片：[相對獅子的位置 x, y, 大小, 何時剝落]
  const TH_BITS = [];
  for (let i = 0; i < 18; i++) {
    const onMane = i < 12;
    TH_BITS.push({
      x: (hash(i * 3.3 + 1) - 0.5) * (onMane ? 62 : 90),
      y: onMane ? -58 - hash(i * 5.1 + 2) * 16 : -54 - hash(i * 5.1 + 2) * 6,
      r: (onMane ? 6 : 6) + hash(i * 7.7 + 3) * 4,
      at: onMane ? 1.5 + hash(i * 2.9 + 4) * 1.7 : 2.1 + hash(i * 2.9 + 4) * 0.9,
      vx: (hash(i * 9.1 + 5) - 0.5) * 300,
      vy: -60 - hash(i * 4.4 + 6) * 150,
      land: 596 + hash(i * 6.6 + 7) * 52,
      spin: (hash(i * 8.8 + 8) - 0.5) * 12,
      onMane,
    });
  }
  // 石片：每一塊的形狀畫一次存成小圖，之後只是旋轉貼上
  const BITC = {};
  function stoneBit(ctx, x, y, r, rot, i, a) {
    const key = i + '|' + r.toFixed(1);
    let B = BITC[key];
    if (!B) {
      const k = Math.max(1, Math.min(2, IX.k));
      const sz = Math.ceil(r * 2.4 + 6);
      const c = newCv(sz * k, sz * k);
      const g = c.getContext('2d');
      g.scale(k, k);
      g.translate(sz / 2, sz / 2);
      stoneBitPaint(g, r, i);
      B = BITC[key] = { c, sz };
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (a != null) ctx.globalAlpha *= a;
    ctx.drawImage(B.c, -B.sz / 2, -B.sz / 2, B.sz, B.sz);
    ctx.restore();
  }
  function stoneBitPaint(ctx, r, i) {
    paint(ctx, (p) => {
      for (let k = 0; k < 6; k++) {
        const an = (k / 6) * PI2;
        const rr = r * (0.65 + hash(i * 11 + k) * 0.5);
        if (k) p.lineTo(Math.cos(an) * rr, Math.sin(an) * rr * 0.8);
        else p.moveTo(Math.cos(an) * rr, Math.sin(an) * rr * 0.8);
      }
      p.closePath();
    }, STONE, { shade: STONE_S, cel: [r * 0.35, r * 0.3], lw: Math.max(1.2, r * 0.18), line: TH_LINE });
  }
  const G_FALL = 1500;
  function thBits(ctx, t, lift, shake, attachedOnly) {
    const S = TH.s;
    TH_BITS.forEach((b, i) => {
      const x0 = TH.x + (b.x + shake) * S;
      const y0 = TH.y + (b.y + (b.onMane ? lift : 0)) * S;
      const r = b.r * S;
      if (t < b.at) {
        if (attachedOnly) stoneBit(ctx, x0, y0, r, i * 1.7, i);
        return;
      }
      if (attachedOnly) return;
      const tau = t - b.at;
      const tl = (-b.vy + Math.sqrt(b.vy * b.vy + 2 * G_FALL * (b.land - y0))) / G_FALL;
      if (tau < tl) {
        stoneBit(ctx, x0 + b.vx * tau, y0 + b.vy * tau + 0.5 * G_FALL * tau * tau, r, i * 1.7 + b.spin * tau, i);
        return;
      }
      // 落地：彈一下、滑一點，然後就留在台階上（碎片不會消失）
      const ts = tau - tl;
      const lx = x0 + b.vx * tl;
      const vLand = b.vy + G_FALL * tl;
      const vb = -vLand * 0.26;
      const tb = (-2 * vb) / G_FALL;
      const vxb = b.vx * 0.4;
      const rot0 = i * 1.7 + b.spin * tl;
      let x;
      let y;
      let rot;
      if (ts < tb) {
        x = lx + vxb * ts;
        y = b.land + vb * ts + 0.5 * G_FALL * ts * ts;
        rot = rot0 + b.spin * 0.6 * ts;
      } else {
        const te = ts - tb;
        const k = 1 - Math.exp(-te * 7);
        x = lx + vxb * tb + vxb * 0.14 * k;
        y = b.land;
        rot = rot0 + b.spin * 0.6 * tb + b.spin * 0.03 * k;
      }
      stoneBit(ctx, x, y, r, rot, i);
      // 第一次撞地：一團灰＋幾塊小碎片噴開
      if (ts > 1.4) return;
      haze(ctx, lx, b.land - 8, 26 + ts * 70, '150,162,186', 0.4 * (1 - sm(0, 1.4, ts)));
      for (let j = 0; j < 4; j++) {
        const an = -Math.PI * (0.1 + 0.8 * hash(i * 5 + j));
        const sp = 70 + hash(i * 7 + j) * 150;
        const tt = Math.min(ts, 0.5);
        const sx = lx + Math.cos(an) * sp * tt;
        const sy = Math.min(b.land + 4, b.land + Math.sin(an) * sp * tt + 0.5 * 1100 * tt * tt);
        stoneBit(ctx, sx, sy, r * 0.32, j + tt * 9, i * 4 + j, 1 - sm(0.8, 1.4, ts));
      }
    });
  }

  // 高窗射進來的光柱裡，慢慢飄的灰塵（只在光裡看得到）
  function shaftDust(ctx, t, x0, y0, ang, len, wid, n, rgb, a) {
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgb(' + rgb + ')';
    for (let i = 0; i < n; i++) {
      const along = ((hash(i * 1.9) + t * 0.012 * (0.5 + hash(i * 3.7))) % 1) * len;
      const o = (hash(i * 7.3) - 0.5) * wid * (0.4 + (along / len) * 0.9) + Math.sin(t * 0.4 + i) * 6;
      const x = x0 + dx * along - dy * o + Math.sin(t * 0.3 + i * 2.1) * 8;
      const y = y0 + dy * along + dx * o + Math.sin(t * 0.25 + i) * 10 + t * 3;
      const edge = 1 - Math.abs(o) / (wid * 0.7);
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i) * 2) + i * 2.3);
      const aa = a * Math.max(0, edge) * (0.3 + tw * 0.7) * Math.sin((along / len) * Math.PI);
      if (aa <= 0.02) continue;
      ctx.globalAlpha = aa;
      const sz = 1 + hash(i * 5.1) * 2.2;
      ctx.fillRect(x, y, sz, sz);
    }
    ctx.restore();
  }

  function shotThrone(ctx, t) {
    const push = sm(0, 7.8, t);
    const C = { x: lerp(650, 680, push), y: lerp(372, 356, push), z: lerp(1.0, 1.1, push) };
    cam(ctx, C, 0.7, () => {
      blit(ctx, 'thHall');
      // 地上流動的霧（遠的一層、近的一層）
      ctx.save();
      ctx.globalAlpha = 0.42;
      band(ctx, 'thMist', t * 11, 452, 0);
      ctx.restore();
    });
    // 高窗斜射進來的冷光：一道寬的柔光＋幾道細的
    const flick = 0.3 + Math.sin(t * 0.7) * 0.05 + Math.sin(t * 2.3) * 0.015;
    rays(ctx, 330, 30, 0.66, [[-40, 34, 0.5], [0, 60, 0.7], [56, 40, 0.45], [10, 150, 0.22]], 760, '170,196,240', flick);
    shaftDust(ctx, t, 330, 30, 0.66, 720, 170, 70, '215,228,255', 0.9);
    // 動作
    const rise = sm(1.9, 3.1, t);
    const shake = t > 1.2 && t < 3.0 ? Math.sin(t * 57) * 0.9 * sm(1.2, 1.6, t) * (1 - sm(2.6, 3.0, t)) : 0;
    const lift = -Math.sin(rise * Math.PI) * 9;
    const bob = -3 * sm(1.0, 1.8, t) + (rise > 0 ? 3 * sm(1.8, 3.4, t) : 0);
    const tw = t - 3.9;
    let d = TH.d;
    let wa = 0;
    let ph = 0;
    if (tw > 0) {
      const v = 1.35;
      const dist = tw < 0.7 ? (v * tw * tw) / 1.4 : v * (tw - 0.35);
      d = TH.d + dist;
      wa = sm(0, 0.6, tw);
      ph = dist * 8.5;
    }
    const X = lerp(TH.X0, -0.42, sm(1.2, 2.6, d));
    const hgt = 0.2 * (1 - sm(1.5, 2.15, d));
    const lx = TH.vx + (400 * X) / d;
    const ly = TH.hz + (400 * (1 - hgt)) / d + (tw > 0 ? -Math.abs(Math.sin(ph)) * 3 * wa * (TH.d / d) : 0);
    const ls = (TH.s * TH.d) / d;
    const fog = sm(1.4, 5.4, d) * 0.82;
    const fade = 1 - sm(4.6, 6.0, d) * 0.85;
    const fl = lerp(1, 0.7, sm(1.15, 3, d));
    // 空了的石殼：先畫內壁，獅子在它裡面／前面走開
    cam(ctx, C, 1, () => blit(ctx, 'thShellB'));
    // 他走出石殼、跨過胸口那一側的殼壁以後，殼壁要擋住他的下半身
    const past = sm(TH.d + 0.1, TH.d + 0.28, d);
    cam(ctx, C, fl, () => {
      // 他身上的金色，是這裡唯一的暖色
      glow(ctx, lx, ly + (-112 + lift) * ls, 150 * ls, '255,196,96', 0.2 * fade * (1 - fog));
      const m0 = A.mode;
      const mc = A.modeColor;
      const ma = A.modeAmt;
      if (fog > 0.01) {
        A.mode = 'tint';
        A.modeColor = '#323b4e';
        A.modeAmt = fog;
      }
      try {
        ctx.save();
        ctx.globalAlpha = fade;
        thWithLion(ctx, lx + shake * ls, ly + lift * ls, ls, () => goldLion(ctx, t, rise, ph, wa, bob, sm(1.9, 2.2, d)));
        ctx.restore();
      } finally {
        A.mode = m0;
        A.modeColor = mc;
        A.modeAmt = ma;
      }
    });
    if (past > 0.01) {
      cam(ctx, C, 1, () => {
        ctx.save();
        ctx.globalAlpha = past;
        blit(ctx, 'thShellB');
        ctx.restore();
      });
    }
    cam(ctx, C, 1, () => {
      blit(ctx, 'thShell');
      // 石殼上的新裂縫
      const ca = sm(1.2, 2.2, t);
      if (ca > 0) {
        ctx.save();
        ctx.translate(TH.x, TH.y);
        ctx.scale(TH.s, TH.s);
        ctx.globalAlpha = ca;
        ctx.lineJoin = 'round';
        [[[-4, -62], [-8, -48], [-2, -38], [-10, -26]], [[26, -56], [32, -44], [28, -34]], [[-30, -56], [-36, -42], [-32, -30]], [[16, -62], [20, -50], [14, -42], [22, -30]]].forEach((ln) => {
          [['rgba(200,215,240,0.4)', 1.3], [TH_LINE, 0.6]].forEach(([col, w]) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = w;
            ctx.beginPath();
            ln.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.stroke();
          });
        });
        ctx.restore();
      }
      // 還黏在他身上的石片
      thBits(ctx, t, lift, shake, true);
      blit(ctx, 'thThrone');
      // 石片落下、碎掉
      thBits(ctx, t, lift, shake, false);
      // 落下的細沙
      if (t > 1.3 && t < 4.2) {
        const sa = sm(1.3, 1.8, t) * (1 - sm(3.4, 4.2, t));
        ctx.fillStyle = 'rgba(190,200,220,' + (0.8 * sa).toFixed(3) + ')';
        for (let i = 0; i < 26; i++) {
          const k = (t * (0.9 + hash(i * 1.7) * 0.8) + hash(i * 3.9)) % 1;
          const x = TH.x + (hash(i * 5.3) - 0.5) * 180;
          const y = 350 + k * 280;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    });
    // 他站起來的那一刻，殼裡揚起的灰
    const puffA = sm(1.9, 2.3, t) * (1 - sm(2.6, 4.0, t));
    if (puffA > 0) {
      const pk = sm(1.9, 4.0, t);
      for (let i = 0; i < 5; i++) {
        const an = -Math.PI * (0.15 + i * 0.17);
        haze(ctx, TH.x + Math.cos(an) * 120 * pk, TH.y - 150 + Math.sin(an) * 60 * pk - pk * 40, 60 + pk * 80, '160,172,196', 0.28 * puffA);
      }
    }
    // 光裡的灰塵
    motes(ctx, t, 44, [300, 60, 560, 560], '196,210,238', 17);
  }

  const SHOTS = {
    throne: { draw: shotThrone, dur: 7.8, trans: 'black', out: 'black' },
    sky: { draw: (c, t) => shotSky(c, t, false), dur: 7.5, trans: 'fade' },
    tree: { draw: (c, t) => shotTree(c, t, false), dur: 7.5, trans: 'fade' },
    nap: { draw: shotNap, dur: 7, trans: 'fade' },
    wind: { draw: (c, t) => shotTree(c, t, true), dur: 6.2, trans: 'quick' },
    scatter: { draw: (c, t) => shotSky(c, t, true), dur: 6.2, trans: 'flash' },
    fall: { draw: shotFall, dur: 6.8, trans: 'quick' },
    wake: { draw: (c, t) => shotWake(c, t, false), dur: 8, trans: 'black' },
    title: { draw: (c, t) => shotWake(c, t, true), dur: 6.5, trans: 'fade' },
  };
  const TRANS_T = { fade: 1.1, quick: 0.5, flash: 1.0, black: 1.8 };
  // 音效提示：[鏡頭, 秒, 音效或函式]
  const CUES = [
    ['throne', 0.05, () => G.music.stop(1.6)],
    ['throne', 1.25, 'rockHit'],
    ['throne', 1.95, 'slam'],
    ['throne', 2.3, 'rockHit'],
    ['throne', 2.85, 'rockHit'],
    ['throne', 3.3, 'land'],
    ['throne', 4.5, 'land'],
    ['throne', 5.2, 'land'],
    ['sky', 0.05, () => G.music.current() || G.music.play('title')],
    ['wind', 0.2, 'heavyWind'],
    ['wind', 1.0, 'jump'],
    ['wind', 2.0, 'spiritShot'],
    ['wind', 2.56, 'spiritShot'],
    ['wind', 3.12, 'spiritShot'],
    ['wind', 3.5, 'heavyWind'],
    ['scatter', 0.1, 'heavyWind'],
    ['scatter', 0.4, 'sweep'],
    ['fall', 0.05, 'sweep'],
    ['wake', 0.3, () => G.music.play('forest')],
    ['wake', 2.5, 'jump'],
    ['title', 1.6, 'quest'],
  ];
  const shotOf = (page) => SHOTS[page && page.shot] || SHOTS.sky;

  function drawShot(ctx, idx, t) {
    const pages = G.data.story.intro;
    const page = pages[Math.max(0, Math.min(idx, pages.length - 1))];
    ctx.save();
    try {
      shotOf(page).draw(ctx, t);
    } finally {
      ctx.restore();
    }
  }

  // 預先準備接下來兩頁用到的圖層（每幀最多一張），用完的釋放
  function prepare(idx, force) {
    const pages = G.data.story.intro;
    const want = {};
    for (let i = idx; i < Math.min(pages.length, idx + 2); i++) (SHOT_LAYERS[pages[i].shot] || []).forEach((id) => (want[id] = true));
    for (let i = idx + 2; i < pages.length; i++) (SHOT_LAYERS[pages[i].shot] || []).forEach((id) => (want[id] = want[id] || 'later'));
    if (!(IX.trans && IX.trans.need)) for (const id in IX.L) if (!want[id]) delete IX.L[id];
    if (!IX.ready) return;
    for (const id in want) {
      if (want[id] === true && !IX.L[id]) {
        layer(id);
        if (!force) return;
      }
    }
  }

  function caption(ctx, text, t, fade) {
    const a = sm(0.35, 1.2, t) * (fade == null ? 1 : fade);
    if (a <= 0) return;
    const y = H() - BAR / 2 - 2 + (1 - a) * 6;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = 'bold 25px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,190,90,0.45)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#fff3da';
    ctx.fillText(text, W() / 2, y);
    ctx.restore();
  }

  function frame(ctx, idx, n, gt) {
    const b = BAR * sm(0, 1.4, gt);
    ctx.fillStyle = '#07050b';
    ctx.fillRect(0, 0, W(), b);
    ctx.fillRect(0, H() - b, W(), b);
    // 金色細線
    const g = ctx.createLinearGradient(0, 0, W(), 0);
    g.addColorStop(0, 'rgba(232,184,74,0)');
    g.addColorStop(0.5, 'rgba(232,184,74,0.55)');
    g.addColorStop(1, 'rgba(232,184,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, b - 1, W(), 1);
    ctx.fillRect(0, H() - b, W(), 1);
    // 頁數小點與提示
    const ha = sm(0.8, 2, gt);
    ctx.save();
    ctx.globalAlpha = ha;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i === idx ? '#ffd35a' : i < idx ? 'rgba(255,211,90,0.45)' : 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(28 + i * 16, b / 2, i === idx ? 4 : 3, 0, PI2);
      ctx.fill();
    }
    ctx.font = '13px ' + A.FONT;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('按任意鍵繼續 · Esc 跳過', W() - 22, b / 2);
    ctx.restore();
  }

  const S = (G.scenes = {
    introIdx: 0,
    introT: 0,
    titleT: 0,
    titleEl: null,

    toTitle() {
      G.scene = 'title';
      this.titleSave = null;
      this.titleT = 0;
      G.ui.closeAll();
      G.hud.reset();
      G.music.play('title');
      this.showTitle();
    },

    showTitle() {
      this.hideTitle();
      const el = document.createElement('div');
      el.className = 'title-screen';
      const save = G.save.peek();
      let cont = '';
      if (save && save.player) {
        const m = save.pos && G.data.maps[save.pos.map] ? G.data.maps[save.pos.map].name : '營地';
        cont = '<button class="primary big" data-t="continue">繼續遊戲<small>Lv.' + save.player.level + ' · ' + m + ' · ' + U.fmtTime(save.player.playTime || 0) + '</small></button>';
      }
      // 舊版本的存檔直接清掉（正式版重新開始，不再提示）
      if (!save && G.save.outdated()) G.save.clear();
      const old = '';
      el.innerHTML = old +
        '<div class="logo"><div class="name">小獅子的冒險</div><div class="sub">一隻小獅子，往天空的家爬回去</div></div>' +
        '<div class="tbtns">' + cont +
        '<button class="' + (cont ? '' : 'primary ') + 'big" data-t="new">' + (cont ? '新遊戲' : '開始冒險') + '</button>' +
        '<button data-t="keys">按鍵設定</button></div>' +
        '<div class="hint">方向鍵移動 · ' + G.input.label('jump') + ' 跳躍 · ' + G.input.label('attack') + ' 攻擊 · ↑ 爬繩／對話／傳送門 · Esc 選單</div>';
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-t]');
        if (!b) return;
        G.audio.unlock();
        G.audio.play('ui');
        const t = b.getAttribute('data-t');
        if (t === 'continue') this.continueGame();
        else if (t === 'new') {
          if (save && !b.classList.contains('confirm')) {
            b.classList.add('confirm');
            b.innerHTML = '再按一次：覆蓋目前存檔';
            return;
          }
          G.save.clear();
          this.newGame();
        } else if (t === 'keys') {
          G.ui.open('keys');
        }
      });
      document.getElementById('ui').appendChild(el);
      this.titleEl = el;
    },

    hideTitle() {
      if (this.titleEl) this.titleEl.remove();
      this.titleEl = null;
    },

    newGame() {
      G.tutorial.active = false;
      this.hideTitle();
      G.ui.closeAll();
      G.player.newGame();
      G.quests.reset();
      G.world.resetProgress();
      G.hud.reset();
      G.scene = 'intro';
      this.introIdx = 0;
      this.introT = 0;
    },

    continueGame() {
      G.tutorial.active = false;
      const data = G.save.peek();
      if (!data) return this.newGame();
      this.hideTitle();
      G.hud.reset();
      let r;
      try {
        r = G.save.apply(data);
      } catch (e) {
        console.error(e);
        G.hud.toast('存檔讀取失敗，從營地開始', '#ff9a9a');
        r = { map: '1-1', entry: 'camp' };
      }
      this.startPlay(r.map, r.entry);
    },

    startPlay(mapId, entry) {
      G.scene = 'play';
      G.world.fade = 1;
      G.world.fadeDir = -1;
      G.world.load(mapId, entry);
      G.save.write();
    },

    // ── 開場（畫面與鏡頭在上面的「開場動畫」區） ──
    introPage() {
      const p = G.data.story.intro;
      return p[Math.max(0, Math.min(this.introIdx, p.length - 1))];
    },

    // 測試用：每個圖層快取花的毫秒數；全部重建一次
    introLayerTimes(rebuild) {
      if (rebuild) {
        IX.L = {};
        IX.k = rebuild;
        for (const id in DEFS) layer(id);
      }
      return Object.assign({}, IX.bt);
    },

    // 測試用：直接跳到第 i 頁的第 t 秒
    introGo(i, t) {
      this.introIdx = i;
      this.introT = t || 0;
      IX.trans = null;
      IX.gt = Math.max(IX.gt || 0, 3);
    },

    updateIntro(dt) {
      if (!IX.started) {
        IX.started = true;
        IX.gt = 0;
        IX.trans = null;
      }
      const t0 = this.introT;
      this.introT += dt;
      IX.gt += dt;
      const shot = this.introPage().shot;
      CUES.forEach(([s, at, what]) => {
        if (s !== shot || t0 >= at || this.introT < at) return;
        if (typeof what === 'function') what();
        else G.audio.play(what);
      });
      if (IX.gt > 0.3) prepare(this.introIdx);
      const I = G.input;
      if (I.escPressed) return this.endIntro();
      const dur = shotOf(this.introPage()).dur;
      if (((I.anyPressed || this.clicked) && this.introT > 0.6) || this.introT > dur) this.nextIntroPage();
      this.clicked = false;
    },

    nextIntroPage() {
      const pages = G.data.story.intro;
      const from = this.introIdx;
      const fromT = this.introT;
      this.introIdx++;
      this.introT = 0;
      if (this.introIdx >= pages.length) return this.endIntro();
      const type = shotOf(pages[from]).out || shotOf(pages[this.introIdx]).trans;
      IX.trans = { type, from, fromT, need: true, d: TRANS_T[type] || 1, text: pages[from].shot === 'title' ? '' : pages[from].text };
    },

    endIntro() {
      IX.L = {};
      IX.snap = null;
      IX.trans = null;
      IX.started = false;
      IX.ready = false;
      G.tutorial.active = true; // 先標記，進地圖時的章節劇情會等教學結束再出現
      this.startPlay('1-1', 'start');
      G.tutorial.start();
    },

    drawIntro(ctx) {
      const pages = G.data.story.intro;
      const idx = Math.min(this.introIdx, pages.length - 1);
      const page = pages[idx];
      const t = this.introT;
      const WW = G.W;
      const HH = G.H;
      if (!IX.ready) {
        IX.k = ctx.getTransform ? ctx.getTransform().a : 1;
        IX.ready = true;
      }
      IX.text = page.text;
      // （每個鏡頭第一筆都會蓋滿整個畫面，不用先塗黑）
      const tr = IX.trans;
      if (tr && tr.need) {
        // 換頁的那一幀：先畫一次上一頁，存成快照，之後讓它淡出
        drawShot(ctx, tr.from, tr.fromT);
        const cv = ctx.canvas;
        if (!IX.snap || IX.snap.width !== cv.width || IX.snap.height !== cv.height) IX.snap = newCv(cv.width, cv.height);
        const sx = IX.snap.getContext('2d');
        sx.clearRect(0, 0, cv.width, cv.height);
        sx.drawImage(cv, 0, 0);
        tr.need = false;
      }
      drawShot(ctx, idx, t);
      if (tr && !tr.need) {
        if (t >= tr.d) IX.trans = null;
        else {
          const cw = ctx.canvas.width;
          const ch = ctx.canvas.height;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (tr.type === 'black') {
            if (t < 0.6) {
              ctx.drawImage(IX.snap, 0, 0);
              ctx.fillStyle = 'rgba(0,0,0,' + sm(0, 0.6, t).toFixed(3) + ')';
            } else ctx.fillStyle = 'rgba(0,0,0,' + (1 - sm(0.6, tr.d, t)).toFixed(3) + ')';
            ctx.fillRect(0, 0, cw, ch);
          } else if (tr.type === 'flash') {
            ctx.globalAlpha = 1 - sm(0, 0.12, t);
            ctx.drawImage(IX.snap, 0, 0);
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(255,252,240,' + (0.95 * (1 - sm(0.06, tr.d, t))).toFixed(3) + ')';
            ctx.fillRect(0, 0, cw, ch);
          } else {
            ctx.globalAlpha = 1 - sm(0, tr.d, t);
            ctx.drawImage(IX.snap, 0, 0);
          }
          ctx.restore();
        }
      }
      // 開頭從黑畫面淡入；最後一頁結束前淡出（進遊戲時地圖再淡入）
      let black = idx === 0 ? 1 - sm(0.1, 1.8, IX.gt) : 0;
      const dur = shotOf(page).dur;
      if (idx === pages.length - 1) black = Math.max(black, sm(dur - 1.1, dur - 0.1, t));
      if (black > 0) {
        ctx.fillStyle = 'rgba(0,0,0,' + black.toFixed(3) + ')';
        ctx.fillRect(0, 0, WW, HH);
      }
      frame(ctx, idx, pages.length, IX.gt);
      if (tr && tr.text && t < 0.5) caption(ctx, tr.text, 2, 1 - t / 0.5);
      if (page.shot !== 'title') caption(ctx, page.text, t);
    },

    // ── 標題背景 ──
    drawTitle(ctx, dt) {
      this.titleT += dt;
      const map = G.data.maps['1-2'];
      if (!map._theme) A.prepareMap(map);
      const cam = { x: this.titleT * 30, y: map.h - G.H };
      A.drawBackground(ctx, map, cam, this.titleT);
      if (A.drawTitleGround) A.drawTitleGround(ctx);
      else {
        ctx.fillStyle = '#7bbf4a';
        ctx.fillRect(0, G.H - 140, G.W, 14);
        ctx.fillStyle = '#9a6a42';
        ctx.fillRect(0, G.H - 128, G.W, 128);
      }
      // 星楓樹：存檔裡拿到幾片葉子，樹上就亮幾盞
      const save = this.titleSave || (this.titleSave = G.save.peek() || {});
      const got = (save.world && save.world.flags && save.world.flags.leaves) || {};
      if (save.world && save.world.flags && save.world.flags.starleaf1 && !save.world.flags.leaves) got[1] = true;
      this.drawStarTree(ctx, G.W - 190, G.H - 140, got, this.titleT);
      const leaves = [1, 2, 3, 4, 5].map((ch) => (got[ch] ? G.data.story.chapters[ch].leaf.color : null));
      ctx.save();
      ctx.translate(G.W / 2 - 250, G.H - 140);
      ctx.scale(2, 2);
      A.drawLion(ctx, 0, 0, 1, { state: 'walk', t: this.titleT, p: 0, onGround: true, form: (save.player && save.player.form) || 'base', leaves });
      ctx.restore();
      [['snail', 1, 380, 1.6], ['mushroom', 1, 520, 1.6], ['sprite', 2, 250, 1.5]].forEach(([art, stage, dx, sc], i) => {
        const m = { def: { art, stage, name: '' }, x: G.W / 2 + dx, y: G.H - 140, dir: -1, t: this.titleT + i, w: 40, h: 40, scale: sc, onGround: true, vy: 0, hurtT: 0, hurtFlash: 0, dead: false, deadT: 0 };
        A.drawMonster(ctx, m);
      });
      A.drawAtmosphere(ctx, map, cam, this.titleT);
    },

    drawStarTree(ctx, x, y, got, t) {
      // 寫實版的星楓樹在 js/art/bgmagic.js（背景魔幻化）；關掉那個檔時才用下面的舊畫法
      if (A.drawStarTreeArt) return A.drawStarTreeArt(ctx, x, y, got, t);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = A.c('#6b4a30');
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.quadraticCurveTo(-8, -120, -40, -210);
      ctx.lineTo(-26, -214);
      ctx.quadraticCurveTo(4, -150, 8, -200);
      ctx.lineTo(20, -196);
      ctx.quadraticCurveTo(14, -110, 22, 0);
      ctx.closePath();
      ctx.fill();
      const n = Object.keys(got).length;
      const green = n >= 5 ? '#ffb8d8' : '#5f9a52';
      A.shape(ctx, (c) => {
        [[-70, -230, 60], [0, -270, 70], [70, -226, 58], [-30, -200, 54], [40, -190, 50]].forEach(([cx, cy, r]) => { c.moveTo(cx + r, cy); c.arc(cx, cy, r, 0, Math.PI * 2); });
      }, green, n >= 5 ? '#e890b8' : '#4a7e40', { noStroke: true, hl: false });
      const spots = [[-70, -240], [60, -236], [-20, -290], [30, -200], [0, -250]];
      [1, 2, 3, 4, 5].forEach((ch, i) => {
        const [lx, ly] = spots[i];
        const on = got[ch];
        const col = G.data.story.chapters[ch].leaf.color;
        if (on) {
          const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 34);
          g.addColorStop(0, 'rgba(255,255,230,0.9)');
          g.addColorStop(1, 'rgba(255,255,200,0)');
          ctx.fillStyle = g;
          ctx.globalAlpha = 0.7 + Math.sin(t * 2 + i) * 0.2;
          ctx.beginPath();
          ctx.arc(lx, ly, 34, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.save();
        ctx.translate(lx, ly + Math.sin(t * 1.5 + i) * 2);
        ctx.globalAlpha = on ? 1 : 0.35;
        A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, 13), on ? col : '#3e5a36', null, { lw: 2, hl: false });
        ctx.restore();
      });
      ctx.restore();
    },
  });

  // 結局（js/ui/ending.js）借用開場的圖層快取與繪畫零件，兩邊的畫風才會一致。
  // setK：依目前畫布的放大倍率決定圖層解析度；free：用完的圖層釋放。
  S.kit = {
    IX, DEFS, BAR, FULL, LEAVES, TREE_LEAVES, TREE_X, TREE_Y, TREE_S, SKY_DAWN, MARBLE, MARBLE_S, GOLD,
    cl, sm, lerp, hash, newCv, glowSpr, glow, haze, paint, softEdge, sparkle, leafGem, leafSpr,
    layer, blit, blitAt, drawL, cam, band, sky, rays, motes, petals, leafStream, treeLeaves, cub,
    grassTuft, flower, ivy, column, statue, caption,
    setK(k) {
      IX.k = k;
    },
    free(ids) {
      ids.forEach((id) => delete IX.L[id]);
    },
  };

  document.addEventListener('mousedown', () => {
    if (G.story.cer && G.story.cer.t > 5) G.story.clicked = true;
    if (G.scene === 'intro') S.clicked = true;
  });
})();
