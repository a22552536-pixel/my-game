// 背景細節層：遠山稜線、立體積雲、天光、地標剪影、浮島、極光、銀河……
// 全部在建圖時畫進離屏 Canvas（見 background.js 的 buildLayers），遊戲中只貼圖，不增加每格成本。
// 也在這裡替第一章的樹、山丘、蘑菇、雲、平頂山換上更細緻的畫法，並提供兩個通用後製：
//   L.rim  = { c: 'rgba(...)', dx, dy }  依剪影算出受光邊（光從 -dx,-dy 的方向來）
//   L.haze = 'r,g,b', L.hazeA = [上, 下], L.hazeY = [y0, y1]  大氣透視：只染在這層已畫的像素上
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const LAYER = A.BG_LAYER;
  if (!LAYER) return;
  const TW = 1600;
  const PI = Math.PI;
  const PI2 = PI * 2;

  // ── 小工具 ──
  const rr = (rnd, a) => a[0] + rnd() * (a[1] - a[0]);
  function wrap2(x, m, draw) {
    draw(x);
    if (x < m) draw(x + TW);
    if (x > TW - m) draw(x - TW);
  }
  function hex(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map((k) => k + k).join('');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }
  function mix(a, b, t) {
    const P = hex(a);
    const Q = hex(b);
    return '#' + P.map((v, i) => Math.round(v + (Q[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  const rgba = (rgb, a) => 'rgba(' + rgb + ',' + a + ')';
  function newCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function circle(ctx, x, y, r) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, PI2);
  }
  function glow(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(rgb, a));
    g.addColorStop(0.4, rgba(rgb, a * 0.35));
    g.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 可循環（週期 TW）的稜線函數：整數頻率的正弦疊加，部分八度取「脊」形讓山頂尖一點
  function ridgeFn(rnd, amp, sharp) {
    const oct = [];
    const freqs = [2, 3, 5, 8, 13, 19, 29, 41];
    let a = 1;
    let sum = 0;
    for (const f of freqs) {
      const k = a * (0.6 + rnd() * 0.8);
      oct.push([f, k, rnd() * PI2, rnd() < (sharp == null ? 0.5 : sharp)]);
      sum += k;
      a *= 0.5;
    }
    return (x) => {
      let v = 0;
      for (const [f, k, p, s] of oct) {
        const q = Math.sin((x / TW) * PI2 * f + p);
        v += k * (s ? 1 - Math.abs(q) * 2 : q);
      }
      return (v / sum) * amp;
    };
  }
  // 塗一個形狀，右側留一道陰影
  function fillShaded(ctx, path, fill, shade, dx) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    if (!shade) return;
    ctx.save();
    ctx.clip();
    ctx.fillStyle = shade;
    ctx.fillRect(-4000, -4000, 8000, 8000);
    ctx.translate(dx, 0);
    ctx.fillStyle = fill;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.restore();
  }

  // ── 通用後製：受光邊與大氣透視 ──
  let tmpC = null;
  function rimLight(ctx, rim, h) {
    const src = ctx.canvas;
    if (!tmpC || tmpC.width !== src.width || tmpC.height !== src.height) tmpC = newCanvas(src.width, src.height);
    const t = tmpC.getContext('2d');
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = 'source-over';
    t.globalAlpha = 1;
    t.clearRect(0, 0, tmpC.width, tmpC.height);
    t.drawImage(src, 0, 0);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = rim.c;
    t.fillRect(0, 0, tmpC.width, tmpC.height);
    t.globalCompositeOperation = 'destination-out';
    const dx = rim.dx == null ? 3 : rim.dx;
    const dy = rim.dy == null ? 3 : rim.dy;
    t.drawImage(src, dx, dy);
    t.drawImage(src, dx - TW, dy);
    t.drawImage(src, dx + TW, dy);
    ctx.drawImage(tmpC, 0, 0);
  }
  function post(ctx, L, h) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (L.rim && typeof L.rim === 'object') rimLight(ctx, L.rim, h);
    if (L.haze) {
      ctx.globalCompositeOperation = 'source-atop';
      const y = L.hazeY || [0, 1];
      const a = L.hazeA || [0.2, 0.5];
      const g = ctx.createLinearGradient(0, h * y[0], 0, h * y[1]);
      g.addColorStop(0, rgba(L.haze, a[0]));
      g.addColorStop(1, rgba(L.haze, a[1]));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TW, h);
    }
    ctx.restore();
  }
  function wrapPost(fn) {
    if (fn._post) return fn;
    const w = function (ctx, L, rnd, h) {
      const out = fn.call(this, ctx, L, rnd, h);
      if ((L.rim && typeof L.rim === 'object') || L.haze) post(ctx, L, h);
      return out;
    };
    w._post = true;
    return w;
  }

  // ── 立體積雲：陰影 → 中間調 → 受光面 → 頂上一道亮邊，底部壓平 ──
  function drawCumulus(ctx, x, y, s, r2, C) {
    const puffs = [];
    const k = 5 + Math.floor(r2() * 4);
    for (let j = 0; j < k; j++) {
      const u = j / (k - 1);
      const bell = Math.sin(u * PI);
      puffs.push([(u - 0.5) * s * 1.8 + (r2() - 0.5) * s * 0.16, -bell * s * 0.34 - r2() * s * 0.08 + (1 - bell) * s * 0.08, s * (0.3 + r2() * 0.1) * (0.82 + bell * 0.38)]);
    }
    const top = 1 + Math.floor(r2() * 3);
    for (let j = 0; j < top; j++) puffs.push([(r2() - 0.5) * s * 0.8, -s * (0.5 + r2() * 0.22), s * (0.3 + r2() * 0.14)]);
    const W = s * 3.2;
    const H = s * 1.9;
    const c = newCanvas(W, H);
    const g = c.getContext('2d');
    const ox = W / 2;
    const oy = H * 0.8;
    const union = (dx, dy, k2, only) => {
      g.beginPath();
      for (const [px, py, pr] of puffs) if (!only || only(py)) circle(g, ox + px + dx * pr, oy + py + dy * pr, pr * k2);
    };
    // 整朵雲：上亮下暗的漸層
    const gr = g.createLinearGradient(0, oy - s * 0.9, 0, oy + s * 0.12);
    gr.addColorStop(0, C.mid || C.lit);
    gr.addColorStop(0.55, C.shade);
    gr.addColorStop(1, C.dark || C.shade);
    g.fillStyle = gr;
    union(0, 0, 1);
    g.fill();
    // 上半部每個雲團的受光面（只畫在雲裡面）
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = C.lit;
    if ('filter' in g) g.filter = 'blur(' + Math.max(1, s * 0.035).toFixed(1) + 'px)';
    union(-0.16, -0.22, 0.8, (py) => py < -s * 0.12);
    g.fill();
    g.globalAlpha = 0.85;
    union(-0.08, -0.16, 0.82, (py) => py >= -s * 0.12);
    g.fill();
    g.globalAlpha = 1;
    if ('filter' in g) g.filter = 'none';
    // 平底與底部的冷色陰影
    g.globalCompositeOperation = 'destination-out';
    g.fillRect(0, oy + s * 0.05, W, H);
    g.globalCompositeOperation = 'source-atop';
    const gb = g.createLinearGradient(0, oy - s * 0.3, 0, oy + s * 0.05);
    gb.addColorStop(0, 'rgba(0,0,0,0)');
    gb.addColorStop(1, C.base || 'rgba(90,110,150,0.12)');
    g.fillStyle = gb;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    // 受光邊（只在最上面幾團）
    if (C.rim) {
      g.strokeStyle = C.rim;
      g.lineWidth = Math.max(1, s * 0.02);
      g.lineCap = 'round';
      for (const [px, py, pr] of puffs) {
        if (py > -s * 0.3) continue;
        g.beginPath();
        g.arc(ox + px, oy + py, pr * 0.97, PI * 1.12, PI * 1.5);
        g.stroke();
      }
    }
    // 底下幾縷薄雲
    g.fillStyle = C.wisp || C.shade;
    g.globalAlpha = 0.45;
    for (let j = 0; j < 2; j++) {
      g.beginPath();
      g.ellipse(ox + (r2() - 0.5) * s * 1.4, oy + s * 0.04 + j * 3, s * (0.5 + r2() * 0.5), s * 0.03, 0, 0, PI2);
      g.fill();
    }
    g.globalAlpha = 1;
    wrap2(x, W, (xx) => ctx.drawImage(c, xx - ox, y - oy));
  }

  // ── 地標剪影（遠處的故事）──
  function smoke(ctx, x, y, s, r, col) {
    ctx.fillStyle = col;
    for (let i = 0; i < 6; i++) {
      const k = i / 5;
      ctx.globalAlpha = 0.35 * (1 - k * 0.8);
      ctx.beginPath();
      ctx.arc(x + Math.sin(k * 3 + r) * 6 * s + k * 14 * s, y - k * 40 * s, (3 + k * 7) * s, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function winGlow(ctx, x, y, w, h, P) {
    if (P.win) glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 2.2, P.win, 0.35);
    ctx.fillStyle = P.winC || '#ffe2a0';
    ctx.fillRect(x, y, w, h);
  }
  function cottage(ctx, x, b, s, r, P, opt) {
    const w = 34 * s * (opt && opt.wide ? 1.5 : 1);
    const hg = 22 * s * (opt && opt.tall ? 1.5 : 1);
    const wall = (opt && opt.wall) || P.wall;
    ctx.fillStyle = wall;
    ctx.fillRect(x - w / 2, b - hg, w, hg);
    ctx.fillStyle = P.wallShade || mix(wall, '#000000', 0.2);
    ctx.fillRect(x + w * 0.18, b - hg, w * 0.32, hg);
    // 煙囪與煙
    ctx.fillStyle = P.stone || mix(wall, '#000000', 0.3);
    ctx.fillRect(x + w * 0.2, b - hg - 18 * s, 5 * s, 12 * s);
    if (P.smoke) smoke(ctx, x + w * 0.2 + 2.5 * s, b - hg - 22 * s, s, r, P.smoke);
    // 屋頂
    ctx.fillStyle = P.roof;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.62, b - hg + 2 * s);
    ctx.lineTo(x, b - hg - 17 * s);
    ctx.lineTo(x + w * 0.62, b - hg + 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.roofShade || mix(P.roof, '#000000', 0.25);
    ctx.beginPath();
    ctx.moveTo(x, b - hg - 17 * s);
    ctx.lineTo(x + w * 0.62, b - hg + 2 * s);
    ctx.lineTo(x + w * 0.2, b - hg + 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x - w / 2, b - hg + 2 * s, w, 2 * s);
    winGlow(ctx, x - w * 0.32, b - hg * 0.62, 5 * s, 5 * s, P);
    ctx.fillStyle = P.door || mix(wall, '#000000', 0.45);
    ctx.fillRect(x - w * 0.02, b - 10 * s, 6 * s, 10 * s);
  }
  function roundTree(ctx, x, b, s, r, cols, trunk) {
    ctx.fillStyle = trunk || '#6a5040';
    ctx.fillRect(x - 1.5 * s, b - 10 * s, 3 * s, 10 * s);
    const c = cols[Math.floor(r() * cols.length)];
    ctx.fillStyle = mix(c, '#000000', 0.2);
    ctx.beginPath();
    circle(ctx, x + 1.5 * s, b - 14 * s, 9 * s);
    ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath();
    circle(ctx, x - 1 * s, b - 16 * s, 8 * s);
    circle(ctx, x + 4 * s, b - 20 * s, 5 * s);
    ctx.fill();
    ctx.fillStyle = mix(c, '#fff6d0', 0.25);
    ctx.beginPath();
    circle(ctx, x - 3 * s, b - 19 * s, 4 * s);
    ctx.fill();
  }
  function conifer(ctx, x, b, s, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, b - 30 * s);
    ctx.lineTo(x + 7 * s, b - 4 * s);
    ctx.lineTo(x - 7 * s, b - 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 1 * s, b - 5 * s, 2 * s, 5 * s);
  }

  const MARK = {
    windmill(ctx, x, b, s, r, P) {
      // 小丘
      ctx.fillStyle = P.ground || P.wallShade;
      ctx.beginPath();
      ctx.ellipse(x, b + 4 * s, 60 * s, 14 * s, 0, PI, PI2);
      ctx.fill();
      const hg = 74 * s;
      ctx.fillStyle = P.wall;
      ctx.beginPath();
      ctx.moveTo(x - 14 * s, b);
      ctx.lineTo(x - 8 * s, b - hg);
      ctx.lineTo(x + 8 * s, b - hg);
      ctx.lineTo(x + 14 * s, b);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = P.wallShade;
      ctx.beginPath();
      ctx.moveTo(x + 3 * s, b);
      ctx.lineTo(x + 2 * s, b - hg);
      ctx.lineTo(x + 8 * s, b - hg);
      ctx.lineTo(x + 14 * s, b);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = P.roof;
      ctx.beginPath();
      ctx.moveTo(x - 12 * s, b - hg + 2 * s);
      ctx.quadraticCurveTo(x, b - hg - 22 * s, x + 12 * s, b - hg + 2 * s);
      ctx.fill();
      winGlow(ctx, x - 3 * s, b - hg * 0.55, 5 * s, 6 * s, P);
      ctx.fillStyle = P.door || '#4a3428';
      ctx.fillRect(x - 4 * s, b - 12 * s, 7 * s, 12 * s);
      // 風車葉
      const hx = x;
      const hy = b - hg - 4 * s;
      const a0 = r() * PI;
      for (let k = 0; k < 4; k++) {
        const a = a0 + (k * PI) / 2;
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(a);
        ctx.fillStyle = P.sail || 'rgba(250,244,230,0.9)';
        ctx.fillRect(4 * s, -1 * s, 50 * s, 9 * s);
        ctx.strokeStyle = P.frame || '#6a5040';
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(56 * s, 0);
        for (let q = 12; q < 56; q += 9) {
          ctx.moveTo(q * s, 0);
          ctx.lineTo(q * s, 8 * s);
        }
        ctx.moveTo(4 * s, 8 * s);
        ctx.lineTo(54 * s, 8 * s);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = P.frame || '#6a5040';
      ctx.beginPath();
      ctx.arc(hx, hy, 3.5 * s, 0, PI2);
      ctx.fill();
    },
    village(ctx, x, b, s, r, P) {
      // 山坡上的小村：後排小屋 → 教堂尖塔 → 前排小屋與樹
      ctx.fillStyle = P.ground || P.wallShade;
      ctx.beginPath();
      ctx.moveTo(x - 150 * s, b + 6 * s);
      ctx.quadraticCurveTo(x, b - 40 * s, x + 150 * s, b + 6 * s);
      ctx.fill();
      const walls = P.walls || [P.wall];
      const spots = [];
      for (let i = 0; i < 7; i++) spots.push([x + (i - 3) * 36 * s + (r() - 0.5) * 12 * s, i]);
      spots.sort(() => r() - 0.5);
      spots.slice(0, 3).forEach(([hx]) => cottage(ctx, hx, b - 22 * s + Math.abs(hx - x) * 0.18, s * 0.7, r(), P, { wall: walls[Math.floor(r() * walls.length)] }));
      // 教堂
      const cx = x + (r() - 0.5) * 60 * s;
      const cb = b - 16 * s;
      ctx.fillStyle = P.stoneWall || P.wall;
      ctx.fillRect(cx - 9 * s, cb - 54 * s, 18 * s, 54 * s);
      ctx.fillStyle = P.wallShade;
      ctx.fillRect(cx + 2 * s, cb - 54 * s, 7 * s, 54 * s);
      ctx.fillStyle = P.roof;
      ctx.beginPath();
      ctx.moveTo(cx - 11 * s, cb - 52 * s);
      ctx.lineTo(cx, cb - 88 * s);
      ctx.lineTo(cx + 11 * s, cb - 52 * s);
      ctx.fill();
      winGlow(ctx, cx - 3 * s, cb - 44 * s, 6 * s, 9 * s, P);
      ctx.strokeStyle = P.frame || '#5a4030';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx, cb - 88 * s);
      ctx.lineTo(cx, cb - 98 * s);
      ctx.moveTo(cx - 4 * s, cb - 94 * s);
      ctx.lineTo(cx + 4 * s, cb - 94 * s);
      ctx.stroke();
      cottage(ctx, cx + 22 * s, cb, s * 0.9, r(), P, { wide: true, wall: walls[0] });
      spots.slice(3).forEach(([hx]) => {
        if (Math.abs(hx - cx) < 34 * s) return;
        cottage(ctx, hx, b - 6 * s + Math.abs(hx - x) * 0.08, s * 0.85, r(), P, { wall: walls[Math.floor(r() * walls.length)] });
      });
      if (P.tree) for (let i = 0; i < 6; i++) roundTree(ctx, x + (r() - 0.5) * 280 * s, b + 4 * s, s * (0.8 + r() * 0.5), r, P.tree, P.trunk);
    },
    giantTree(ctx, x, b, s, r, P) {
      const cols = P.tree || ['#5f9a5a'];
      const trunk = P.trunk || '#5a4636';
      // 盤根
      ctx.fillStyle = trunk;
      ctx.beginPath();
      ctx.moveTo(x - 60 * s, b);
      ctx.quadraticCurveTo(x - 22 * s, b - 20 * s, x - 18 * s, b - 90 * s);
      ctx.quadraticCurveTo(x - 16 * s, b - 170 * s, x - 70 * s, b - 230 * s);
      ctx.lineTo(x - 50 * s, b - 236 * s);
      ctx.quadraticCurveTo(x, b - 190 * s, x + 4 * s, b - 250 * s);
      ctx.lineTo(x + 14 * s, b - 250 * s);
      ctx.quadraticCurveTo(x + 20 * s, b - 190 * s, x + 70 * s, b - 228 * s);
      ctx.lineTo(x + 80 * s, b - 220 * s);
      ctx.quadraticCurveTo(x + 22 * s, b - 160 * s, x + 22 * s, b - 90 * s);
      ctx.quadraticCurveTo(x + 26 * s, b - 20 * s, x + 66 * s, b);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = P.trunkShade || mix(trunk, '#000000', 0.25);
      ctx.beginPath();
      ctx.moveTo(x + 6 * s, b);
      ctx.quadraticCurveTo(x + 10 * s, b - 120 * s, x + 12 * s, b - 240 * s);
      ctx.quadraticCurveTo(x + 24 * s, b - 120 * s, x + 66 * s, b);
      ctx.fill();
      // 傘狀的大樹冠
      const cl = [];
      for (let i = 0; i < 26; i++) {
        const u = r();
        const a = PI + u * PI;
        const rx = 190 * s * Math.sqrt(r());
        cl.push([x + Math.cos(a) * rx * 1.05, b - 250 * s + Math.sin(a) * rx * 0.42 - r() * 20 * s, (30 + r() * 26) * s, cols[Math.floor(r() * cols.length)]]);
      }
      cl.sort((p, q) => p[1] - q[1]);
      for (const [cx, cy, cr, c] of cl) {
        ctx.fillStyle = mix(c, '#10281c', 0.3);
        ctx.beginPath();
        circle(ctx, cx + cr * 0.08, cy + cr * 0.16, cr);
        ctx.fill();
      }
      for (const [cx, cy, cr, c] of cl) {
        ctx.fillStyle = c;
        ctx.beginPath();
        circle(ctx, cx, cy, cr * 0.9);
        ctx.fill();
      }
      for (const [cx, cy, cr, c] of cl) {
        ctx.fillStyle = mix(c, '#fff4c8', 0.28);
        ctx.beginPath();
        circle(ctx, cx - cr * 0.25, cy - cr * 0.34, cr * 0.5);
        ctx.fill();
      }
      // 垂下的藤與樹上小屋的燈
      ctx.strokeStyle = mix(cols[0], '#10281c', 0.2);
      ctx.lineWidth = 1.5 * s;
      for (let i = 0; i < 12; i++) {
        const vx = x + (r() - 0.5) * 300 * s;
        const vy = b - 230 * s + r() * 20 * s;
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.quadraticCurveTo(vx + 4 * s, vy + 30 * s, vx - 2 * s, vy + (30 + r() * 50) * s);
        ctx.stroke();
      }
      if (P.win) for (let i = 0; i < 3; i++) winGlow(ctx, x + (i - 1) * 60 * s + r() * 10, b - 240 * s + r() * 30 * s, 4 * s, 4 * s, P);
    },
    ruinTower(ctx, x, b, s, r, P) {
      const w = 40 * s;
      const hg = 170 * s;
      const top = b - hg;
      const stone = P.stone || '#9a9a88';
      const sh = P.stoneShade || mix(stone, '#000000', 0.25);
      ctx.fillStyle = stone;
      ctx.beginPath();
      ctx.moveTo(x - w / 2 - 6 * s, b);
      ctx.lineTo(x - w / 2, top + 20 * s);
      ctx.lineTo(x - w / 2 + 6 * s, top + 4 * s);
      ctx.lineTo(x - 6 * s, top + 14 * s);
      ctx.lineTo(x + 2 * s, top - 6 * s);
      ctx.lineTo(x + w / 2 - 4 * s, top + 24 * s);
      ctx.lineTo(x + w / 2, top + 40 * s);
      ctx.lineTo(x + w / 2 + 6 * s, b);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = sh;
      ctx.fillRect(x + w * 0.12, top - 20, w, hg + 40);
      // 石塊縫
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 1;
      for (let y = top + 8 * s; y < b; y += 9 * s) {
        ctx.beginPath();
        ctx.moveTo(x - w, y);
        ctx.lineTo(x + w, y);
        const off = ((y / (9 * s)) % 2) * 6 * s;
        for (let k = -w; k < w; k += 12 * s) {
          ctx.moveTo(x + k + off, y);
          ctx.lineTo(x + k + off, y + 9 * s);
        }
        ctx.stroke();
      }
      ctx.restore();
      // 拱窗
      ctx.fillStyle = P.dark || '#2e3430';
      for (let k = 0; k < 3; k++) {
        const wy = top + 40 * s + k * 42 * s;
        ctx.beginPath();
        ctx.moveTo(x - 5 * s, wy + 16 * s);
        ctx.lineTo(x - 5 * s, wy + 5 * s);
        ctx.arc(x, wy + 5 * s, 5 * s, PI, 0);
        ctx.lineTo(x + 5 * s, wy + 16 * s);
        ctx.fill();
      }
      // 常春藤
      const vine = P.vine || '#4f7a44';
      ctx.fillStyle = vine;
      for (let k = 0; k < 90; k++) {
        const u = Math.pow(r(), 0.7);
        const vx = x - w / 2 + r() * w * 0.8;
        const vy = top + 10 * s + u * hg;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(vx, vy, (2 + r() * 3) * s, 0, PI2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = vine;
      ctx.lineWidth = 1.4 * s;
      for (let k = 0; k < 7; k++) {
        const vx = x - w / 2 + r() * w;
        ctx.beginPath();
        ctx.moveTo(vx, top + 20 * s);
        ctx.quadraticCurveTo(vx + 6 * s, top + 60 * s, vx - 2 * s, top + (60 + r() * 60) * s);
        ctx.stroke();
      }
      // 碎石
      ctx.fillStyle = sh;
      for (let k = 0; k < 8; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (r() - 0.5) * 110 * s, b - 2 * s, (4 + r() * 8) * s, (3 + r() * 4) * s, 0, 0, PI2);
        ctx.fill();
      }
      // 旁邊斷掉的拱門
      const ax = x + 64 * s;
      ctx.fillStyle = stone;
      ctx.fillRect(ax - 22 * s, b - 64 * s, 9 * s, 64 * s);
      ctx.fillRect(ax + 14 * s, b - 40 * s, 9 * s, 40 * s);
      ctx.beginPath();
      ctx.moveTo(ax - 22 * s, b - 60 * s);
      ctx.arc(ax, b - 60 * s, 22 * s, PI, PI * 1.55);
      ctx.lineTo(ax - 4 * s, b - 72 * s);
      ctx.arc(ax, b - 60 * s, 13 * s, PI * 1.5, PI, true);
      ctx.fill();
    },
    waterfall(ctx, x, b, s, r, P) {
      const w = 170 * s;
      const top = b - 200 * s;
      const rock = P.stone || '#6a7a70';
      const sh = P.stoneShade || mix(rock, '#000000', 0.25);
      ctx.fillStyle = rock;
      ctx.beginPath();
      ctx.moveTo(x - w, b);
      ctx.lineTo(x - w * 0.8, top + 40 * s);
      ctx.quadraticCurveTo(x - w * 0.5, top - 10 * s, x - 20 * s, top);
      ctx.lineTo(x + 30 * s, top + 6 * s);
      ctx.quadraticCurveTo(x + w * 0.6, top - 6 * s, x + w * 0.9, top + 50 * s);
      ctx.lineTo(x + w, b);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      // 右半背光、上亮下暗
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.moveTo(x + 40 * s, top - 10);
      ctx.quadraticCurveTo(x + w * 0.3, top + 90 * s, x + w * 0.2, b);
      ctx.lineTo(x + w * 1.2, b);
      ctx.lineTo(x + w * 1.2, top - 10);
      ctx.fill();
      const vg = ctx.createLinearGradient(0, top, 0, b);
      vg.addColorStop(0, 'rgba(255,255,255,0.12)');
      vg.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = vg;
      ctx.fillRect(x - w, top - 20, w * 2, b - top + 20);
      // 岩層（微彎）與直向裂縫
      ctx.strokeStyle = 'rgba(0,0,0,0.13)';
      ctx.lineWidth = 2 * s;
      for (let y = top + 24 * s; y < b; y += (16 + r() * 14) * s) {
        ctx.beginPath();
        ctx.moveTo(x - w, y);
        ctx.quadraticCurveTo(x, y - 8 * s, x + w, y + 4 * s);
        ctx.stroke();
      }
      ctx.lineWidth = 1.5 * s;
      for (let k = 0; k < 10; k++) {
        const cx = x - w * 0.9 + r() * w * 1.8;
        const cy = top + r() * (b - top) * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + (r() - 0.5) * 8 * s, cy + (20 + r() * 40) * s);
        ctx.stroke();
      }
      // 濕苔
      if (P.moss) {
        ctx.fillStyle = P.moss;
        for (let k = 0; k < 30; k++) {
          ctx.beginPath();
          ctx.arc(x - w + r() * w * 2, top + r() * (b - top), (2 + r() * 5) * s, 0, PI2);
          ctx.fill();
        }
      }
      ctx.restore();
      // 頂上的草與樹
      if (P.tree) {
        ctx.fillStyle = P.tree[0];
        ctx.beginPath();
        ctx.moveTo(x - w * 0.8, top + 44 * s);
        ctx.quadraticCurveTo(x - w * 0.5, top - 14 * s, x - 20 * s, top - 4 * s);
        ctx.lineTo(x + 30 * s, top + 2 * s);
        ctx.quadraticCurveTo(x + w * 0.6, top - 12 * s, x + w * 0.9, top + 50 * s);
        ctx.lineTo(x + w * 0.9, top + 40 * s);
        ctx.quadraticCurveTo(x + w * 0.6, top + 6 * s, x + 30 * s, top + 12 * s);
        ctx.lineTo(x - 20 * s, top + 10 * s);
        ctx.quadraticCurveTo(x - w * 0.5, top, x - w * 0.8, top + 56 * s);
        ctx.fill();
        for (let i = 0; i < 7; i++) {
          const tx = x - w * 0.7 + r() * w * 1.5;
          if (Math.abs(tx - x - 5 * s) < 30 * s) continue;
          roundTree(ctx, tx, top + 8 * s + Math.abs(tx - x) * 0.12, s * (1.2 + r() * 0.8), r, P.tree, P.trunk);
        }
      }
      // 水簾
      const wx = x + 5 * s;
      const ww = 26 * s;
      const g = ctx.createLinearGradient(0, top, 0, b);
      g.addColorStop(0, P.water || '#dff6ff');
      g.addColorStop(1, P.water2 || 'rgba(220,245,255,0.6)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(wx - ww / 2, top + 4 * s);
      ctx.quadraticCurveTo(wx - ww * 0.7, top + 30 * s, wx - ww * 0.62, b);
      ctx.lineTo(wx + ww * 0.62, b);
      ctx.quadraticCurveTo(wx + ww * 0.7, top + 30 * s, wx + ww / 2, top + 4 * s);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 9; k++) {
        const sx = wx - ww * 0.5 + r() * ww;
        const sy = top + r() * 60 * s;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (r() - 0.5) * 3, sy + (40 + r() * 80) * s);
        ctx.stroke();
      }
      // 水霧
      const mist = P.mist || '240,250,255';
      for (let k = 0; k < 7; k++) glow(ctx, wx + (r() - 0.5) * 70 * s, b - r() * 20 * s, (26 + r() * 30) * s, mist, 0.55);
    },
    giantMush(ctx, x, b, s, r, P) {
      const cap = P.cap || '#d8845c';
      const lean = (r() - 0.5) * 30 * s;
      const hg = 200 * s * (0.8 + r() * 0.4);
      const stem = P.stem || '#efe0c8';
      ctx.fillStyle = stem;
      ctx.beginPath();
      ctx.moveTo(x - 20 * s, b);
      ctx.quadraticCurveTo(x - 10 * s + lean * 0.4, b - hg * 0.5, x - 12 * s + lean, b - hg);
      ctx.lineTo(x + 12 * s + lean, b - hg);
      ctx.quadraticCurveTo(x + 12 * s + lean * 0.4, b - hg * 0.5, x + 24 * s, b);
      ctx.fill();
      ctx.fillStyle = mix(stem, '#000000', 0.18);
      ctx.beginPath();
      ctx.moveTo(x + 4 * s, b);
      ctx.quadraticCurveTo(x + 6 * s + lean * 0.4, b - hg * 0.5, x + 4 * s + lean, b - hg);
      ctx.lineTo(x + 12 * s + lean, b - hg);
      ctx.quadraticCurveTo(x + 12 * s + lean * 0.4, b - hg * 0.5, x + 24 * s, b);
      ctx.fill();
      const cx = x + lean;
      const cy = b - hg;
      const cw = 110 * s * (0.8 + r() * 0.4);
      // 菌褶
      ctx.fillStyle = P.gill || mix(cap, '#ffffff', 0.35);
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2 * s, cw * 0.96, 16 * s, 0, 0, PI2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = -10; k <= 10; k++) {
        ctx.moveTo(cx + k * cw * 0.02, cy + 2 * s);
        ctx.lineTo(cx + k * cw * 0.09, cy + 12 * s);
      }
      ctx.stroke();
      const g = ctx.createLinearGradient(0, cy - cw * 0.7, 0, cy);
      g.addColorStop(0, mix(cap, '#ffffff', 0.2));
      g.addColorStop(1, mix(cap, '#000000', 0.18));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - cw, cy + 2 * s);
      ctx.bezierCurveTo(cx - cw * 1.02, cy - cw * 0.72, cx + cw * 1.02, cy - cw * 0.72, cx + cw, cy + 2 * s);
      ctx.quadraticCurveTo(cx, cy - 8 * s, cx - cw, cy + 2 * s);
      ctx.fill();
      ctx.fillStyle = P.spot || 'rgba(255,250,235,0.8)';
      for (let k = 0; k < 7; k++) {
        const u = (r() - 0.5) * 1.5;
        ctx.beginPath();
        ctx.ellipse(cx + u * cw * 0.8, cy - cw * 0.42 * (1 - u * u * 0.8) + r() * 12 * s, (6 + r() * 9) * s, (4 + r() * 6) * s, 0, 0, PI2);
        ctx.fill();
      }
      if (P.glowRgb) {
        glow(ctx, cx, cy + 16 * s, cw * 1.1, P.glowRgb, 0.28);
        ctx.fillStyle = rgba(P.glowRgb, 0.9);
        for (let k = 0; k < 14; k++) {
          ctx.beginPath();
          ctx.arc(cx + (r() - 0.5) * cw * 1.6, cy + 10 * s + r() * 80 * s, (1 + r() * 1.6) * s, 0, PI2);
          ctx.fill();
        }
      }
      if (P.win) {
        // 菇柄上的小門窗（有人住）
        winGlow(ctx, x - 2 * s + lean * 0.2, b - hg * 0.35, 5 * s, 7 * s, P);
        ctx.fillStyle = P.door || '#6a4a38';
        ctx.beginPath();
        ctx.moveTo(x - 4 * s, b);
        ctx.lineTo(x - 4 * s, b - 10 * s);
        ctx.arc(x + 1 * s, b - 10 * s, 5 * s, PI, 0);
        ctx.lineTo(x + 6 * s, b);
        ctx.fill();
      }
    },
    mushHouse(ctx, x, b, s, r, P) {
      const cap = (P.caps || ['#e0705a'])[Math.floor(r() * (P.caps || [1]).length)];
      const bw = 30 * s;
      const bh = 34 * s;
      ctx.fillStyle = P.wall || '#f2e2c4';
      ctx.beginPath();
      ctx.moveTo(x - bw / 2 - 3 * s, b);
      ctx.quadraticCurveTo(x - bw / 2, b - bh * 0.6, x - bw / 2 + 2 * s, b - bh);
      ctx.lineTo(x + bw / 2 - 2 * s, b - bh);
      ctx.quadraticCurveTo(x + bw / 2, b - bh * 0.6, x + bw / 2 + 3 * s, b);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(x + bw * 0.12, b - bh, bw * 0.4, bh);
      winGlow(ctx, x - bw * 0.35, b - bh * 0.7, 6 * s, 6 * s, P);
      ctx.fillStyle = P.door || '#7a5040';
      ctx.beginPath();
      ctx.moveTo(x + 1 * s, b);
      ctx.lineTo(x + 1 * s, b - 11 * s);
      ctx.arc(x + 6 * s, b - 11 * s, 5 * s, PI, 0);
      ctx.lineTo(x + 11 * s, b);
      ctx.fill();
      const cy = b - bh;
      const cw = 36 * s;
      ctx.fillStyle = mix(cap, '#000000', 0.22);
      ctx.beginPath();
      ctx.ellipse(x, cy + 3 * s, cw, 7 * s, 0, 0, PI2);
      ctx.fill();
      ctx.fillStyle = cap;
      ctx.beginPath();
      ctx.moveTo(x - cw, cy + 3 * s);
      ctx.bezierCurveTo(x - cw, cy - 40 * s, x + cw, cy - 40 * s, x + cw, cy + 3 * s);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (k - 1.5) * 15 * s, cy - (14 + (k % 2) * 10) * s, 4.5 * s, 3 * s, 0, 0, PI2);
        ctx.fill();
      }
      ctx.fillStyle = mix(cap, '#ffffff', 0.35);
      ctx.beginPath();
      ctx.ellipse(x - cw * 0.35, cy - 20 * s, 9 * s, 5 * s, -0.4, 0, PI2);
      ctx.fill();
      // 煙囪
      ctx.fillStyle = P.stone || '#8a7a6a';
      ctx.fillRect(x + cw * 0.4, cy - 30 * s, 5 * s, 14 * s);
      if (P.smoke) smoke(ctx, x + cw * 0.4 + 2.5 * s, cy - 34 * s, s, r(), P.smoke);
    },
    castle(ctx, x, b, s, r, P) {
      const stone = P.wall;
      const sh = P.wallShade;
      // 城牆與垛口
      ctx.fillStyle = stone;
      ctx.fillRect(x - 90 * s, b - 40 * s, 180 * s, 40 * s);
      for (let k = -90; k < 90; k += 10) ctx.fillRect(x + k * s, b - 46 * s, 6 * s, 6 * s);
      const tower = (tx, tw, th, roofH) => {
        ctx.fillStyle = stone;
        ctx.fillRect(tx - tw / 2, b - th, tw, th);
        ctx.fillStyle = sh;
        ctx.fillRect(tx + tw * 0.1, b - th, tw * 0.4, th);
        ctx.fillStyle = P.roof;
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2 - 4 * s, b - th + 2 * s);
        ctx.lineTo(tx, b - th - roofH);
        ctx.lineTo(tx + tw / 2 + 4 * s, b - th + 2 * s);
        ctx.fill();
        ctx.fillStyle = P.roofShade || mix(P.roof, '#000000', 0.25);
        ctx.beginPath();
        ctx.moveTo(tx, b - th - roofH);
        ctx.lineTo(tx + tw / 2 + 4 * s, b - th + 2 * s);
        ctx.lineTo(tx + tw * 0.1, b - th + 2 * s);
        ctx.fill();
        ctx.strokeStyle = P.frame || '#3a3040';
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(tx, b - th - roofH);
        ctx.lineTo(tx, b - th - roofH - 14 * s);
        ctx.stroke();
        ctx.fillStyle = P.flag || '#d8453a';
        ctx.beginPath();
        ctx.moveTo(tx, b - th - roofH - 14 * s);
        ctx.lineTo(tx + 12 * s, b - th - roofH - 10 * s);
        ctx.lineTo(tx, b - th - roofH - 6 * s);
        ctx.fill();
        for (let k = 0; k < Math.floor(th / (26 * s)); k++) winGlow(ctx, tx - 2.5 * s, b - th + 14 * s + k * 26 * s, 5 * s, 7 * s, P);
      };
      tower(x - 84 * s, 24 * s, 80 * s, 34 * s);
      tower(x + 84 * s, 24 * s, 74 * s, 30 * s);
      tower(x - 30 * s, 30 * s, 110 * s, 42 * s);
      tower(x + 24 * s, 44 * s, 140 * s, 56 * s);
      // 城門
      ctx.fillStyle = P.dark || '#2a2430';
      ctx.beginPath();
      ctx.moveTo(x - 10 * s, b);
      ctx.lineTo(x - 10 * s, b - 18 * s);
      ctx.arc(x, b - 18 * s, 10 * s, PI, 0);
      ctx.lineTo(x + 10 * s, b);
      ctx.fill();
    },
    pagoda(ctx, x, b, s, r, P) {
      const tiers = P.tiers || 4;
      let y = b;
      let w = 70 * s;
      ctx.fillStyle = P.stone || P.wallShade;
      ctx.fillRect(x - w * 0.7, y - 8 * s, w * 1.4, 8 * s);
      y -= 8 * s;
      for (let i = 0; i < tiers; i++) {
        const th = (i === 0 ? 34 : 24) * s;
        ctx.fillStyle = P.wall;
        ctx.fillRect(x - w * 0.42, y - th, w * 0.84, th);
        ctx.fillStyle = P.wallShade;
        ctx.fillRect(x + w * 0.1, y - th, w * 0.32, th);
        // 窗
        for (let k = -1; k <= 1; k++) winGlow(ctx, x + k * w * 0.22 - 3 * s, y - th * 0.7, 6 * s, th * 0.4, P);
        y -= th;
        // 翹起的屋簷
        const rw = w * 0.78;
        ctx.fillStyle = P.roof;
        ctx.beginPath();
        ctx.moveTo(x - rw - 8 * s, y - 4 * s);
        ctx.quadraticCurveTo(x - rw * 0.6, y + 2 * s, x - rw * 0.4, y - 10 * s);
        ctx.lineTo(x + rw * 0.4, y - 10 * s);
        ctx.quadraticCurveTo(x + rw * 0.6, y + 2 * s, x + rw + 8 * s, y - 4 * s);
        ctx.lineTo(x + rw * 0.9, y + 3 * s);
        ctx.lineTo(x - rw * 0.9, y + 3 * s);
        ctx.closePath();
        ctx.fill();
        if (P.snow) {
          ctx.fillStyle = P.snow;
          ctx.beginPath();
          ctx.moveTo(x - rw * 0.9, y - 5 * s);
          ctx.quadraticCurveTo(x - rw * 0.55, y - 5 * s, x - rw * 0.4, y - 12 * s);
          ctx.lineTo(x + rw * 0.4, y - 12 * s);
          ctx.quadraticCurveTo(x + rw * 0.55, y - 5 * s, x + rw * 0.9, y - 5 * s);
          ctx.lineTo(x + rw * 0.5, y - 8 * s);
          ctx.lineTo(x - rw * 0.5, y - 8 * s);
          ctx.fill();
        }
        if (P.lantern) {
          glow(ctx, x - rw - 4 * s, y + 6 * s, 16 * s, P.win || '255,190,110', 0.5);
          glow(ctx, x + rw + 4 * s, y + 6 * s, 16 * s, P.win || '255,190,110', 0.5);
          ctx.fillStyle = P.lantern;
          ctx.fillRect(x - rw - 6 * s, y + 2 * s, 4 * s, 7 * s);
          ctx.fillRect(x + rw + 2 * s, y + 2 * s, 4 * s, 7 * s);
        }
        y -= 10 * s;
        w *= 0.84;
      }
      ctx.strokeStyle = P.gold || P.roof;
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 34 * s);
      ctx.stroke();
      ctx.fillStyle = P.gold || P.roof;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(x, y - 8 * s - k * 6 * s, (5 - k) * s, 1.5 * s, 0, 0, PI2);
        ctx.fill();
      }
    },
    onsen(ctx, x, b, s, r, P) {
      // 兩層的溫泉旅館：木牆、紙窗透光、屋頂冒熱氣
      const w = 150 * s;
      const drawStorey = (y, ww, hh) => {
        ctx.fillStyle = P.wall;
        ctx.fillRect(x - ww / 2, y - hh, ww, hh);
        ctx.fillStyle = P.wallShade;
        ctx.fillRect(x + ww * 0.2, y - hh, ww * 0.3, hh);
        for (let k = 0; k < Math.floor(ww / (18 * s)); k++) winGlow(ctx, x - ww / 2 + 8 * s + k * 18 * s, y - hh * 0.72, 11 * s, hh * 0.46, P);
        ctx.fillStyle = 'rgba(40,20,10,0.5)';
        for (let k = 0; k <= Math.floor(ww / (18 * s)); k++) ctx.fillRect(x - ww / 2 + 6 * s + k * 18 * s, y - hh, 2 * s, hh);
        ctx.fillStyle = P.roof;
        ctx.beginPath();
        ctx.moveTo(x - ww / 2 - 16 * s, y - hh + 2 * s);
        ctx.quadraticCurveTo(x - ww / 2, y - hh - 2 * s, x - ww / 2 + 6 * s, y - hh - 16 * s);
        ctx.lineTo(x + ww / 2 - 6 * s, y - hh - 16 * s);
        ctx.quadraticCurveTo(x + ww / 2, y - hh - 2 * s, x + ww / 2 + 16 * s, y - hh + 2 * s);
        ctx.closePath();
        ctx.fill();
      };
      drawStorey(b, w, 32 * s);
      drawStorey(b - 48 * s, w * 0.7, 28 * s);
      // 暖簾與燈籠
      ctx.fillStyle = P.accent || '#c84a3a';
      ctx.fillRect(x - 12 * s, b - 30 * s, 24 * s, 12 * s);
      for (let k = -1; k <= 1; k += 2) {
        glow(ctx, x + k * w * 0.42, b - 20 * s, 18 * s, P.win || '255,190,110', 0.6);
        ctx.fillStyle = P.lantern || '#ff9a5a';
        ctx.beginPath();
        ctx.ellipse(x + k * w * 0.42, b - 20 * s, 4 * s, 6 * s, 0, 0, PI2);
        ctx.fill();
      }
      if (P.smoke) for (let k = 0; k < 3; k++) smoke(ctx, x + (k - 1) * 50 * s, b - 90 * s, s * 1.6, r(), P.smoke);
    },
    arch(ctx, x, b, s, r, P) {
      const w = 220 * s;
      const hg = 170 * s;
      const col = P.rock;
      const path = (c) => {
        c.moveTo(x - w / 2 - 20 * s, b);
        c.lineTo(x - w / 2, b - hg * 0.7);
        c.quadraticCurveTo(x - w / 2 + 10 * s, b - hg, x - w * 0.2, b - hg - 6 * s);
        c.lineTo(x + w * 0.25, b - hg + 4 * s);
        c.quadraticCurveTo(x + w / 2, b - hg + 6 * s, x + w / 2 + 8 * s, b - hg * 0.6);
        c.lineTo(x + w / 2 + 24 * s, b);
        c.lineTo(x + w * 0.3, b);
        c.quadraticCurveTo(x + w * 0.28, b - hg * 0.72, x, b - hg * 0.74);
        c.quadraticCurveTo(x - w * 0.28, b - hg * 0.72, x - w * 0.28, b);
        c.closePath();
      };
      fillShaded(ctx, path, col, P.rockShade, -w * 0.12);
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      for (let y = b - hg; y < b; y += (8 + r() * 10) * s) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(255,240,220,0.14)' : 'rgba(90,30,20,0.12)';
        ctx.fillRect(x - w, y, w * 2, (3 + r() * 5) * s);
      }
      ctx.fillStyle = P.cap || mix(col, '#ffffff', 0.2);
      ctx.fillRect(x - w, b - hg - 10 * s, w * 2, 12 * s);
      ctx.restore();
      // 洞口下緣的影子
      ctx.fillStyle = 'rgba(60,20,20,0.18)';
      ctx.beginPath();
      ctx.ellipse(x, b, w * 0.3, 6 * s, 0, 0, PI2);
      ctx.fill();
    },
    butte(ctx, x, b, s, r, P) {
      // 孤立的石柱山，岩壁上鑿出的崖居
      const w = 140 * s;
      const hg = 230 * s;
      const path = (c) => {
        c.moveTo(x - w * 0.8, b);
        c.quadraticCurveTo(x - w * 0.55, b - hg * 0.3, x - w * 0.44, b - hg * 0.42);
        c.lineTo(x - w * 0.4, b - hg);
        c.lineTo(x + w * 0.38, b - hg + 4 * s);
        c.lineTo(x + w * 0.44, b - hg * 0.42);
        c.quadraticCurveTo(x + w * 0.6, b - hg * 0.3, x + w * 0.85, b);
        c.closePath();
      };
      fillShaded(ctx, path, P.rock, P.rockShade, -w * 0.2);
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      for (let y = b - hg + 10 * s; y < b; y += (9 + r() * 12) * s) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(255,236,210,0.13)' : 'rgba(90,30,20,0.13)';
        ctx.fillRect(x - w, y, w * 2, (3 + r() * 5) * s);
      }
      ctx.fillStyle = 'rgba(60,20,15,0.14)';
      for (let k = 0; k < 9; k++) ctx.fillRect(x - w * 0.4 + r() * w * 0.78, b - hg, (2 + r() * 4) * s, (30 + r() * 70) * s);
      ctx.fillStyle = P.cap || mix(P.rock, '#ffffff', 0.18);
      ctx.fillRect(x - w, b - hg - 4 * s, w * 2, 10 * s);
      ctx.restore();
      // 崖居：凹洞 + 土磚房
      const cy = b - hg * 0.6;
      ctx.fillStyle = P.dark || '#5a2a20';
      ctx.beginPath();
      ctx.ellipse(x, cy, w * 0.3, 26 * s, 0, PI, PI2);
      ctx.lineTo(x + w * 0.3, cy + 6 * s);
      ctx.lineTo(x - w * 0.3, cy + 6 * s);
      ctx.fill();
      const adobe = P.adobe || mix(P.rock, '#ffe0c0', 0.3);
      for (let k = 0; k < 4; k++) {
        const bx = x - w * 0.24 + k * w * 0.13;
        const bh = (12 + (k % 2) * 8) * s;
        ctx.fillStyle = adobe;
        ctx.fillRect(bx, cy + 6 * s - bh, w * 0.11, bh);
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.fillRect(bx + w * 0.07, cy + 6 * s - bh, w * 0.04, bh);
        ctx.fillStyle = P.dark || '#5a2a20';
        ctx.fillRect(bx + w * 0.03, cy + 6 * s - bh * 0.6, 4 * s, 5 * s);
      }
      // 梯子
      ctx.strokeStyle = P.frame || '#6a4030';
      ctx.lineWidth = 1.3 * s;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, cy + 6 * s);
      ctx.lineTo(x + w * 0.24, cy + 40 * s);
      ctx.moveTo(x + w * 0.26, cy + 6 * s);
      ctx.lineTo(x + w * 0.3, cy + 40 * s);
      for (let k = 1; k < 6; k++) {
        ctx.moveTo(x + w * (0.2 + k * 0.008), cy + 6 * s + k * 6 * s);
        ctx.lineTo(x + w * (0.26 + k * 0.008), cy + 6 * s + k * 6 * s);
      }
      ctx.stroke();
      // 頂上的灌木
      ctx.fillStyle = P.shrub || '#7a7a4a';
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.arc(x - w * 0.35 + r() * w * 0.7, b - hg - 4 * s, (3 + r() * 4) * s, 0, PI2);
        ctx.fill();
      }
    },
    balloon(ctx, x, b, s, r, P) {
      const y = b;
      const R = 22 * s;
      const cols = P.stripes || ['#e8604a', '#f6d06a'];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - R * 0.35, y + R * 0.95);
      ctx.bezierCurveTo(x - R * 1.4, y + R * 0.2, x - R * 1.2, y - R * 1.2, x, y - R * 1.2);
      ctx.bezierCurveTo(x + R * 1.2, y - R * 1.2, x + R * 1.4, y + R * 0.2, x + R * 0.35, y + R * 0.95);
      ctx.closePath();
      ctx.fillStyle = cols[0];
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = cols[1];
      for (let k = -3; k <= 3; k += 2) {
        ctx.beginPath();
        ctx.ellipse(x + k * R * 0.28, y, R * 0.12, R * 1.4, 0, 0, PI2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(x + R * 0.6, y, R * 0.7, R * 1.5, 0, 0, PI2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(x - R * 0.45, y - R * 0.45, R * 0.25, R * 0.45, -0.3, 0, PI2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(60,40,30,0.8)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - R * 0.35, y + R * 0.95);
      ctx.lineTo(x - R * 0.18, y + R * 1.5);
      ctx.moveTo(x + R * 0.35, y + R * 0.95);
      ctx.lineTo(x + R * 0.18, y + R * 1.5);
      ctx.stroke();
      ctx.fillStyle = '#7a5038';
      ctx.fillRect(x - R * 0.2, y + R * 1.5, R * 0.4, R * 0.3);
    },
    bridge(ctx, x, b, s, r, P) {
      // 吊橋：x 到 x + span
      const span = 320 * s;
      const x2 = x + span;
      const sag = 34 * s;
      ctx.strokeStyle = P.rope || '#5a3a28';
      ctx.lineWidth = 1.6 * s;
      for (const dy of [0, -16 * s]) {
        ctx.beginPath();
        ctx.moveTo(x, b + dy);
        ctx.quadraticCurveTo(x + span / 2, b + dy + sag * 2, x2, b + dy);
        ctx.stroke();
      }
      ctx.fillStyle = P.plank || '#8a6040';
      for (let k = 1; k < 40; k++) {
        const u = k / 40;
        const px = x + span * u;
        const py = b + 4 * sag * u * (1 - u);
        ctx.fillRect(px - 3 * s, py, 6 * s, 2.5 * s);
        if (k % 3 === 0) {
          ctx.fillRect(px - 0.5, py - 16 * s, 1, 16 * s);
        }
      }
      ctx.fillStyle = P.post || '#4a3020';
      ctx.fillRect(x - 3 * s, b - 26 * s, 5 * s, 30 * s);
      ctx.fillRect(x2 - 2 * s, b - 26 * s, 5 * s, 30 * s);
      // 橋上的旗
      ctx.fillStyle = P.flag || '#e0604a';
      for (let k = 1; k < 8; k++) {
        const u = k / 8;
        const px = x + span * u;
        const py = b - 16 * s + 4 * sag * u * (1 - u);
        ctx.beginPath();
        ctx.moveTo(px - 3 * s, py);
        ctx.lineTo(px + 3 * s, py);
        ctx.lineTo(px, py + 7 * s);
        ctx.fill();
      }
    },
    islet(ctx, x, b, s, r, P) {
      const w = (120 + r() * 120) * s;
      const hg = (20 + r() * 30) * s;
      ctx.fillStyle = P.rock;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, b);
      ctx.bezierCurveTo(x - w * 0.3, b - hg * 1.2, x + w * 0.1, b - hg * 1.4, x + w / 2, b);
      ctx.fill();
      ctx.fillStyle = P.rockShade;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.05, b - hg * 0.9);
      ctx.bezierCurveTo(x + w * 0.2, b - hg * 0.9, x + w * 0.35, b - hg * 0.5, x + w / 2, b);
      ctx.lineTo(x + w * 0.05, b);
      ctx.fill();
      if (P.tree) {
        for (let k = 0; k < 4 + r() * 4; k++) {
          const tx = x - w * 0.3 + r() * w * 0.5;
          const ty = b - hg * (0.9 - Math.abs(tx - x) / w);
          if (P.palm) {
            ctx.strokeStyle = P.trunk || '#6a5040';
            ctx.lineWidth = 1.5 * s;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(tx + 3 * s, ty - 12 * s, tx + 6 * s, ty - 22 * s);
            ctx.stroke();
            ctx.strokeStyle = P.tree[0];
            ctx.lineWidth = 2.5 * s;
            for (let q = 0; q < 5; q++) {
              const a = -PI * (0.1 + q * 0.2);
              ctx.beginPath();
              ctx.moveTo(tx + 6 * s, ty - 22 * s);
              ctx.quadraticCurveTo(tx + 6 * s + Math.cos(a) * 8 * s, ty - 26 * s + Math.sin(a) * 4 * s, tx + 6 * s + Math.cos(a) * 12 * s, ty - 18 * s);
              ctx.stroke();
            }
          } else roundTree(ctx, tx, ty + 2 * s, s * 0.8, r, P.tree, P.trunk);
        }
      }
      if (P.win) {
        cottage(ctx, x + w * 0.12, b - hg * 0.55, s * 0.6, r(), P);
      }
      ctx.fillStyle = P.foam || 'rgba(255,255,255,0.7)';
      ctx.fillRect(x - w / 2 - 6 * s, b - 1, w + 12 * s, 2);
    },
    harbor(ctx, x, b, s, r, P) {
      // 海港小鎮：沿著山坡堆疊的彩色房子、教堂、防波堤
      ctx.fillStyle = P.rock;
      ctx.beginPath();
      ctx.moveTo(x - 200 * s, b);
      ctx.bezierCurveTo(x - 120 * s, b - 90 * s, x + 60 * s, b - 120 * s, x + 200 * s, b);
      ctx.fill();
      ctx.fillStyle = P.grass || '#8cbf6a';
      ctx.beginPath();
      ctx.moveTo(x - 170 * s, b - 22 * s);
      ctx.bezierCurveTo(x - 110 * s, b - 96 * s, x + 60 * s, b - 124 * s, x + 176 * s, b - 12 * s);
      ctx.bezierCurveTo(x + 60 * s, b - 104 * s, x - 110 * s, b - 80 * s, x - 170 * s, b - 22 * s);
      ctx.fill();
      const walls = P.walls || ['#f4ece0'];
      const rows = [[b - 8 * s, 9], [b - 34 * s, 7], [b - 58 * s, 5], [b - 78 * s, 3]];
      rows.forEach(([ry, n], ri) => {
        for (let k = 0; k < n; k++) {
          const hx = x - (n - 1) * 17 * s + k * 34 * s + (r() - 0.5) * 8 * s + ri * 10 * s;
          cottage(ctx, hx, ry, s * (0.62 + r() * 0.1), r(), P, { wall: walls[Math.floor(r() * walls.length)], tall: r() < 0.3 });
        }
        if (ri === 2) {
          // 鐘樓
          const cx = x + 24 * s;
          ctx.fillStyle = walls[0];
          ctx.fillRect(cx - 7 * s, ry - 60 * s, 14 * s, 60 * s);
          ctx.fillStyle = P.roof;
          ctx.beginPath();
          ctx.moveTo(cx - 9 * s, ry - 58 * s);
          ctx.lineTo(cx, ry - 82 * s);
          ctx.lineTo(cx + 9 * s, ry - 58 * s);
          ctx.fill();
          winGlow(ctx, cx - 3 * s, ry - 50 * s, 6 * s, 8 * s, P);
        }
      });
      // 防波堤與桅杆
      ctx.fillStyle = P.stone || '#b8ac98';
      ctx.fillRect(x - 230 * s, b - 3 * s, 120 * s, 5 * s);
      ctx.strokeStyle = P.frame || '#5a4a4a';
      ctx.lineWidth = 1.2 * s;
      for (let k = 0; k < 4; k++) {
        const mx = x - 220 * s + k * 26 * s;
        ctx.beginPath();
        ctx.moveTo(mx, b - 2 * s);
        ctx.lineTo(mx, b - (22 + r() * 10) * s);
        ctx.stroke();
      }
    },
    seaStack(ctx, x, b, s, r, P) {
      const w = (40 + r() * 30) * s;
      const hg = (120 + r() * 90) * s;
      const path = (c) => {
        c.moveTo(x - w * 0.7, b);
        c.lineTo(x - w * 0.5, b - hg * 0.7);
        c.lineTo(x - w * 0.42, b - hg);
        c.lineTo(x + w * 0.2, b - hg - 6 * s);
        c.lineTo(x + w * 0.5, b - hg * 0.8);
        c.lineTo(x + w * 0.6, b - hg * 0.3);
        c.lineTo(x + w * 0.8, b);
        c.closePath();
      };
      fillShaded(ctx, path, P.rock, P.rockShade, -w * 0.3);
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let y = b - hg; y < b; y += (8 + r() * 8) * s) ctx.fillRect(x - w, y, w * 2, 2 * s);
      ctx.fillStyle = P.grass || '#8aa870';
      ctx.fillRect(x - w, b - hg - 10 * s, w * 2, 12 * s);
      ctx.restore();
      if (P.hole) {
        ctx.fillStyle = P.holeC || P.rockShade;
        ctx.beginPath();
        ctx.ellipse(x, b - hg * 0.18, w * 0.28, hg * 0.16, 0, 0, PI2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.ellipse(x - w * 0.7 + r() * w * 1.5, b - 1, (6 + r() * 10) * s, 2 * s, 0, 0, PI2);
        ctx.fill();
      }
      // 石柱頂的海鳥
      ctx.strokeStyle = P.bird || 'rgba(60,70,90,0.7)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        const bx = x + (r() - 0.5) * 90 * s;
        const by = b - hg - (16 + r() * 40) * s;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by);
        ctx.quadraticCurveTo(bx - 2, by - 3, bx, by);
        ctx.quadraticCurveTo(bx + 2, by - 3, bx + 5, by);
        ctx.stroke();
      }
    },
    wreckMast(ctx, x, b, s, r, P) {
      // 半沉的大船：翹起的船首、斷掉的桅杆與破帆
      ctx.fillStyle = P.hull || '#5a4a48';
      ctx.beginPath();
      ctx.moveTo(x - 90 * s, b);
      ctx.lineTo(x - 70 * s, b - 20 * s);
      ctx.lineTo(x + 40 * s, b - 30 * s);
      ctx.quadraticCurveTo(x + 90 * s, b - 40 * s, x + 110 * s, b - 70 * s);
      ctx.lineTo(x + 100 * s, b);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5 * s;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x - 80 * s, b - 4 * s - k * 5 * s);
        ctx.quadraticCurveTo(x + 40 * s, b - 12 * s - k * 6 * s, x + 104 * s, b - 20 * s - k * 13 * s);
        ctx.stroke();
      }
      ctx.strokeStyle = P.hull || '#5a4a48';
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(x - 20 * s, b - 26 * s);
      ctx.lineTo(x - 36 * s, b - 140 * s);
      ctx.moveTo(x + 50 * s, b - 36 * s);
      ctx.lineTo(x + 60 * s, b - 100 * s);
      ctx.moveTo(x - 60 * s, b - 110 * s);
      ctx.lineTo(x - 10 * s, b - 118 * s);
      ctx.stroke();
      ctx.fillStyle = P.sail || 'rgba(230,220,200,0.8)';
      ctx.beginPath();
      ctx.moveTo(x - 56 * s, b - 108 * s);
      ctx.lineTo(x - 14 * s, b - 116 * s);
      ctx.lineTo(x - 22 * s, b - 80 * s);
      ctx.lineTo(x - 34 * s, b - 88 * s);
      ctx.lineTo(x - 46 * s, b - 70 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,30,0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 36 * s, b - 140 * s);
      ctx.lineTo(x + 104 * s, b - 66 * s);
      ctx.moveTo(x - 36 * s, b - 140 * s);
      ctx.lineTo(x - 86 * s, b - 4 * s);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(x - 96 * s, b - 1, 210 * s, 2);
    },
    lavaFall(ctx, x, b, s, r, P) {
      const w = 130 * s;
      const top = b - 220 * s;
      const path = (c) => {
        c.moveTo(x - w, b);
        c.lineTo(x - w * 0.7, top + 30 * s);
        c.lineTo(x - w * 0.3, top);
        c.lineTo(x + w * 0.4, top + 10 * s);
        c.lineTo(x + w * 0.8, top + 50 * s);
        c.lineTo(x + w, b);
        c.closePath();
      };
      fillShaded(ctx, path, P.rock, P.rockShade, -w * 0.3);
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      ctx.strokeStyle = rgba(P.glowRgb || '255,120,50', 0.45);
      ctx.lineWidth = 1.5 * s;
      for (let k = 0; k < 10; k++) {
        let cx = x - w + r() * w * 2;
        let cy = top + r() * 200 * s;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let q = 0; q < 4; q++) {
          cx += (r() - 0.5) * 20 * s;
          cy += (8 + r() * 14) * s;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
      ctx.restore();
      glow(ctx, x, b - 60 * s, 140 * s, P.glowRgb || '255,120,50', 0.4);
      const g = ctx.createLinearGradient(0, top, 0, b);
      g.addColorStop(0, '#fff0a0');
      g.addColorStop(0.3, '#ffae40');
      g.addColorStop(1, '#e0401a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 6 * s, top + 6 * s);
      ctx.quadraticCurveTo(x - 14 * s, top + 60 * s, x - 20 * s, b);
      ctx.lineTo(x + 20 * s, b);
      ctx.quadraticCurveTo(x + 12 * s, top + 60 * s, x + 8 * s, top + 6 * s);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,250,200,0.7)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        const sx = x - 6 * s + r() * 12 * s;
        ctx.beginPath();
        ctx.moveTo(sx, top + 10 * s + r() * 30 * s);
        ctx.lineTo(sx + (r() - 0.5) * 8 * s, b - r() * 40 * s);
        ctx.stroke();
      }
    },
    plume(ctx, x, b, s, r, P) {
      // 火山煙柱：底部被岩漿照亮
      const puffs = [];
      for (let k = 0; k < 46; k++) {
        const u = k / 45;
        puffs.push([x + Math.sin(u * 5 + r() * 0.5) * 24 * s * u + u * u * 260 * s + (r() - 0.5) * 20 * s * u, b - 10 * s - u * 300 * s, (18 + u * 80) * s * (0.8 + r() * 0.4), u]);
      }
      // 由上往下畫，底部被照亮的煙團蓋在上面
      for (let i = puffs.length - 1; i >= 0; i--) {
        const [px, py, pr, u] = puffs[i];
        ctx.fillStyle = mix(P.smoke || '#4a3036', P.far || '#6a4a4e', u);
        ctx.globalAlpha = 0.92 - u * 0.35;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, PI2);
        ctx.fill();
        ctx.fillStyle = u < 0.35 ? P.lit || '#c85a3a' : mix(P.smoke || '#4a3036', '#ffffff', 0.08);
        ctx.globalAlpha = u < 0.35 ? 0.55 * (1 - u / 0.35) : 0.35;
        ctx.beginPath();
        if (u < 0.35) ctx.arc(px, py + pr * 0.3, pr * 0.75, 0, PI2);
        else ctx.arc(px - pr * 0.25, py - pr * 0.3, pr * 0.55, 0, PI2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      glow(ctx, x, b, 120 * s, P.glowRgb || '255,120,50', 0.5);
    },
    planet(ctx, x, b, s, r, P) {
      const R = 60 * s;
      const g = ctx.createRadialGradient(x - R * 0.4, b - R * 0.4, R * 0.1, x, b, R);
      g.addColorStop(0, P.lit || '#f4c8a0');
      g.addColorStop(0.7, P.body || '#b0708a');
      g.addColorStop(1, P.dark || '#402a5a');
      glow(ctx, x, b, R * 1.8, P.glowRgb || '200,150,255', 0.25);
      // 後半的環
      ctx.strokeStyle = P.ring || 'rgba(240,220,255,0.55)';
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.ellipse(x, b, R * 1.7, R * 0.36, -0.25, PI, PI2);
      ctx.stroke();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, b, R, 0, PI2);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      for (let k = 0; k < 5; k++) ctx.fillRect(x - R, b - R + (k * 0.4 + r() * 0.2) * R, R * 2, R * 0.08);
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(x, b, R * 1.7, R * 0.36, -0.25, 0, PI);
      ctx.stroke();
    },
    colonnade(ctx, x, b, s, r, P) {
      // 半毀的列柱與山牆（遠方的神殿遺跡）
      const n = 6;
      const gap = 26 * s;
      const hg = 90 * s;
      ctx.fillStyle = P.stoneShade;
      ctx.fillRect(x - (n / 2) * gap - 12 * s, b - 8 * s, n * gap + 24 * s, 8 * s);
      for (let k = 0; k < n; k++) {
        const cx = x - (n / 2 - 0.5) * gap + k * gap;
        const broken = r() < 0.35;
        const ch = broken ? hg * (0.4 + r() * 0.4) : hg;
        ctx.fillStyle = P.stone;
        ctx.fillRect(cx - 6 * s, b - 8 * s - ch, 12 * s, ch);
        ctx.fillStyle = P.stoneShade;
        ctx.fillRect(cx + 1.5 * s, b - 8 * s - ch, 4.5 * s, ch);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(cx - 3 * s, b - 8 * s - ch, 1.2 * s, ch);
        if (!broken) {
          ctx.fillStyle = P.stone;
          ctx.fillRect(cx - 8 * s, b - 8 * s - ch - 4 * s, 16 * s, 4 * s);
        } else {
          ctx.fillStyle = P.stone;
          ctx.beginPath();
          ctx.moveTo(cx - 6 * s, b - 8 * s - ch);
          ctx.lineTo(cx - 2 * s, b - 12 * s - ch);
          ctx.lineTo(cx + 2 * s, b - 6 * s - ch);
          ctx.lineTo(cx + 6 * s, b - 10 * s - ch);
          ctx.lineTo(cx + 6 * s, b - 8 * s - ch);
          ctx.fill();
        }
      }
      // 殘存的橫樑與半邊山牆
      const lx = x - (n / 2) * gap - 4 * s;
      ctx.fillStyle = P.stone;
      ctx.fillRect(lx, b - 8 * s - hg - 14 * s, gap * 3.2, 10 * s);
      ctx.beginPath();
      ctx.moveTo(lx, b - hg - 22 * s);
      ctx.lineTo(lx + gap * 3.2, b - hg - 48 * s);
      ctx.lineTo(lx + gap * 3.2, b - hg - 22 * s);
      ctx.fill();
      if (P.gold) {
        ctx.fillStyle = P.gold;
        ctx.fillRect(lx, b - hg - 12 * s, gap * 3.2, 2 * s);
      }
    },
    bellTower(ctx, x, b, s, r, P) {
      // 山頂上的鐘樓（四柱、翹簷、大鐘）
      ctx.fillStyle = P.stone || P.wallShade;
      ctx.fillRect(x - 26 * s, b - 10 * s, 52 * s, 10 * s);
      ctx.fillStyle = P.wall;
      ctx.fillRect(x - 20 * s, b - 56 * s, 5 * s, 46 * s);
      ctx.fillRect(x + 15 * s, b - 56 * s, 5 * s, 46 * s);
      ctx.fillStyle = P.bell || '#c8a060';
      ctx.beginPath();
      ctx.moveTo(x - 10 * s, b - 22 * s);
      ctx.quadraticCurveTo(x - 10 * s, b - 46 * s, x, b - 48 * s);
      ctx.quadraticCurveTo(x + 10 * s, b - 46 * s, x + 10 * s, b - 22 * s);
      ctx.closePath();
      ctx.fill();
      if (P.win) glow(ctx, x, b - 34 * s, 30 * s, P.win, 0.35);
      ctx.fillStyle = P.roof;
      ctx.beginPath();
      ctx.moveTo(x - 36 * s, b - 52 * s);
      ctx.quadraticCurveTo(x - 22 * s, b - 56 * s, x - 16 * s, b - 70 * s);
      ctx.lineTo(x + 16 * s, b - 70 * s);
      ctx.quadraticCurveTo(x + 22 * s, b - 56 * s, x + 36 * s, b - 52 * s);
      ctx.lineTo(x + 30 * s, b - 58 * s);
      ctx.lineTo(x - 30 * s, b - 58 * s);
      ctx.fill();
      if (P.snow) {
        ctx.fillStyle = P.snow;
        ctx.beginPath();
        ctx.moveTo(x - 30 * s, b - 58 * s);
        ctx.quadraticCurveTo(x - 20 * s, b - 60 * s, x - 16 * s, b - 72 * s);
        ctx.lineTo(x + 16 * s, b - 72 * s);
        ctx.quadraticCurveTo(x + 20 * s, b - 60 * s, x + 30 * s, b - 58 * s);
        ctx.lineTo(x + 18 * s, b - 64 * s);
        ctx.lineTo(x - 18 * s, b - 64 * s);
        ctx.fill();
      }
    },
    // 岩壁上的木造棧道：柱子、木板、梯子、燈籠
    scaffold(ctx, x, b, s, r, P) {
      const wood = P.wood || '#6a4a34';
      const lvls = 2 + Math.floor(r() * 2);
      const w = 120 * s;
      ctx.fillStyle = wood;
      for (let k = 0; k < lvls; k++) {
        const y = b - k * 46 * s;
        const off = (k % 2 ? 30 : 0) * s;
        ctx.fillRect(x - w / 2 + off, y - 4 * s, w, 5 * s);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x - w / 2 + off, y + 1 * s, w, 2 * s);
        ctx.fillStyle = wood;
        for (let q = 0; q <= 4; q++) {
          const px = x - w / 2 + off + (q / 4) * (w - 4 * s);
          ctx.fillRect(px, y, 3 * s, 46 * s);
          // 斜撐
          ctx.save();
          ctx.strokeStyle = wood;
          ctx.lineWidth = 2 * s;
          ctx.beginPath();
          ctx.moveTo(px + 1.5 * s, y + 20 * s);
          ctx.lineTo(px + 1.5 * s + (q % 2 ? 1 : -1) * 14 * s, y + 2 * s);
          ctx.stroke();
          ctx.restore();
        }
        // 欄杆
        ctx.fillRect(x - w / 2 + off, y - 16 * s, w, 2 * s);
        for (let q = 0; q <= 8; q++) ctx.fillRect(x - w / 2 + off + (q / 8) * (w - 2 * s), y - 16 * s, 1.5 * s, 12 * s);
        if (P.win) {
          const lx = x - w / 2 + off + w * (0.2 + r() * 0.6);
          glow(ctx, lx, y - 22 * s, 20 * s, P.win, 0.6);
          ctx.fillStyle = P.lantern || '#ff9a5a';
          ctx.beginPath();
          ctx.ellipse(lx, y - 22 * s, 3.5 * s, 5 * s, 0, 0, PI2);
          ctx.fill();
          ctx.fillStyle = wood;
        }
      }
      // 梯子
      ctx.strokeStyle = wood;
      ctx.lineWidth = 1.6 * s;
      const lx = x + w / 2 - 10 * s;
      ctx.beginPath();
      ctx.moveTo(lx, b - (lvls - 1) * 46 * s - 4 * s);
      ctx.lineTo(lx, b + 40 * s);
      ctx.moveTo(lx + 8 * s, b - (lvls - 1) * 46 * s - 4 * s);
      ctx.lineTo(lx + 8 * s, b + 40 * s);
      for (let y = b - (lvls - 1) * 46 * s; y < b + 40 * s; y += 7 * s) {
        ctx.moveTo(lx, y);
        ctx.lineTo(lx + 8 * s, y);
      }
      ctx.stroke();
    },
    // 岩壁上的崖居（只有凹洞與土磚房）
    alcove(ctx, x, b, s, r, P) {
      const w = 140 * s;
      ctx.fillStyle = P.dark || '#5a2a20';
      ctx.beginPath();
      ctx.ellipse(x, b, w * 0.4, 34 * s, 0, PI, PI2);
      ctx.lineTo(x + w * 0.4, b + 6 * s);
      ctx.lineTo(x - w * 0.4, b + 6 * s);
      ctx.fill();
      const adobe = P.adobe || '#d8a888';
      for (let k = 0; k < 5; k++) {
        const bx = x - w * 0.34 + k * w * 0.14;
        const bh = (14 + ((k * 7) % 3) * 7) * s;
        ctx.fillStyle = adobe;
        ctx.fillRect(bx, b + 6 * s - bh, w * 0.12, bh);
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.fillRect(bx + w * 0.08, b + 6 * s - bh, w * 0.04, bh);
        ctx.fillStyle = P.dark || '#5a2a20';
        ctx.fillRect(bx + w * 0.035, b + 6 * s - bh * 0.6, 4 * s, 5 * s);
        if (P.win && k % 2) winGlow(ctx, bx + w * 0.035, b + 6 * s - bh * 0.6, 4 * s, 5 * s, P);
      }
      ctx.fillStyle = adobe;
      ctx.fillRect(x - w * 0.42, b + 4 * s, w * 0.84, 4 * s);
    },
    tent(ctx, x, b, s, r, P) {
      ctx.fillStyle = P.tent || '#d8b890';
      ctx.beginPath();
      ctx.moveTo(x - 20 * s, b);
      ctx.lineTo(x, b - 22 * s);
      ctx.lineTo(x + 20 * s, b);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.moveTo(x, b - 22 * s);
      ctx.lineTo(x + 20 * s, b);
      ctx.lineTo(x + 4 * s, b);
      ctx.fill();
      glow(ctx, x - 30 * s, b - 4 * s, 22 * s, '255,170,90', 0.55);
      ctx.fillStyle = '#ffcf7a';
      ctx.beginPath();
      ctx.moveTo(x - 33 * s, b);
      ctx.lineTo(x - 30 * s, b - 7 * s);
      ctx.lineTo(x - 27 * s, b);
      ctx.fill();
    },
  };

  // ── 新的背景層 ──
  Object.assign(LAYER, {
    // 把幾個層畫進同一張離屏圖（同樣的視差），每個子層先畫在暫存圖上，後製只影響自己
    stack(ctx, L, rnd, h) {
      let anim = null;
      for (const S of L.of) {
        const c = newCanvas(TW, h);
        const g = c.getContext('2d');
        const a = LAYER[S.type](g, S, rnd, h);
        if (a) anim = (anim || []).concat(a);
        ctx.drawImage(c, 0, 0);
      }
      return anim;
    },
    // 天空：太陽／月亮的大光暈、地平線的霧帶、高空卷雲、遠處的鳥群
    skyGlow(ctx, L, rnd, h) {
      if (L.sun) {
        const sx = TW * L.sun[0];
        const sy = h * L.sun[1];
        const R = L.r || 420;
        wrap2(sx, R, (xx) => {
          const g = ctx.createRadialGradient(xx, sy, 0, xx, sy, R);
          g.addColorStop(0, rgba(L.rgb, L.a == null ? 0.55 : L.a));
          g.addColorStop(0.25, rgba(L.rgb, (L.a == null ? 0.55 : L.a) * 0.4));
          g.addColorStop(1, rgba(L.rgb, 0));
          ctx.fillStyle = g;
          ctx.fillRect(xx - R, sy - R, R * 2, R * 2);
        });
      }
      if (L.horizon) {
        const y = h * L.horizonY;
        const hh = h * (L.horizonH || 0.2);
        const g = ctx.createLinearGradient(0, y - hh, 0, y + hh);
        g.addColorStop(0, rgba(L.horizon, 0));
        g.addColorStop(0.5, rgba(L.horizon, L.horizonA || 0.4));
        g.addColorStop(1, rgba(L.horizon, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, y - hh, TW, hh * 2);
      }
      if (L.cirrus) {
        ctx.fillStyle = rgba(L.cirrusRgb || '255,255,255', L.cirrusA || 0.35);
        for (let i = 0; i < L.cirrus; i++) {
          const cx = rnd() * TW;
          const cy = h * rr(rnd, L.cirrusY || [0.06, 0.26]);
          const len = 120 + rnd() * 220;
          const tilt = (rnd() - 0.5) * 0.08;
          for (let k = 0; k < 7; k++) {
            const u = k / 6;
            wrap2(cx, len, (xx) => {
              ctx.beginPath();
              ctx.ellipse(xx + (u - 0.5) * len * 0.9, cy + (u - 0.5) * len * tilt + (rnd() - 0.5) * 6, len * (0.18 + rnd() * 0.2), 1.2 + rnd() * 2.4, tilt, 0, PI2);
              ctx.fill();
            });
          }
        }
      }
      if (L.birds) {
        ctx.strokeStyle = L.birdColor || 'rgba(60,70,90,0.55)';
        ctx.lineCap = 'round';
        for (let i = 0; i < L.birds; i++) {
          const fx = (i / L.birds) * TW + rnd() * (TW / L.birds) * 0.6;
          const fy = h * rr(rnd, L.birdY || [0.12, 0.34]);
          const n = 3 + Math.floor(rnd() * 5);
          for (let k = 0; k < n; k++) {
            const bx = fx + k * (10 + rnd() * 8) - (k % 2) * 4;
            const by = fy + Math.abs(k - n / 2) * 6 + (rnd() - 0.5) * 6;
            const bs = 3 + rnd() * 2.5;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(bx - bs, by - bs * 0.2);
            ctx.quadraticCurveTo(bx - bs * 0.4, by - bs * 0.7, bx, by);
            ctx.quadraticCurveTo(bx + bs * 0.4, by - bs * 0.7, bx + bs, by - bs * 0.2);
            ctx.stroke();
          }
        }
      }
    },
    // 立體積雲
    cumulus(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.7;
        const y = h * rr(rnd, [L.y0, L.y1]);
        const s = rr(rnd, L.size);
        const seed = Math.floor(rnd() * 1e6);
        ctx.globalAlpha = L.alpha || 1;
        drawCumulus(ctx, x, y, s, U.seeded(seed), L);
      }
      ctx.globalAlpha = 1;
    },
    // 遠山稜線：一層比一層近，越遠越淡（顏色往 haze 靠）；可加樹線、雪頂
    ridges(ctx, L, rnd, h) {
      const bands = L.bands;
      bands.forEach((B, bi) => {
        const f = ridgeFn(rnd, B.amp, B.sharp);
        const base = h * B.base;
        const ys = [];
        for (let x = 0; x <= TW; x += 4) ys.push(base - f(x) - B.amp * 0.3);
        const path = (c) => {
          c.moveTo(0, h);
          ys.forEach((y, i) => c.lineTo(i * 4, y));
          c.lineTo(TW, h);
          c.closePath();
        };
        // 本體：由上往下漸入霧色
        const g = ctx.createLinearGradient(0, base - B.amp * 1.4, 0, base + (B.fogH || 90));
        g.addColorStop(0, B.color);
        g.addColorStop(1, L.fog ? mix(B.color, L.fog, B.fogK == null ? 0.5 : B.fogK) : B.color);
        ctx.fillStyle = g;
        ctx.beginPath();
        path(ctx);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        path(ctx);
        ctx.clip();
        // 背光坡：面向右下的坡塗暗
        if (B.shade) {
          ctx.fillStyle = B.shade;
          ctx.beginPath();
          for (let i = 1; i < ys.length; i++) {
            if (ys[i] > ys[i - 1] + 0.8) {
              const x = i * 4;
              ctx.moveTo(x - 4, ys[i - 1]);
              ctx.lineTo(x, ys[i]);
              ctx.lineTo(x + 26, h);
              ctx.lineTo(x - 30, h);
              ctx.closePath();
            }
          }
          ctx.fill();
        }
        // 雪頂
        if (B.snow) {
          const lim = base - B.amp * (B.snowLine || 0.55);
          ctx.fillStyle = B.snow;
          ctx.beginPath();
          ys.forEach((y, i) => {
            if (y < lim) {
              const x = i * 4;
              ctx.rect(x - 2, y - 1, 5, (lim - y) * (0.6 + hashK(x) * 0.6));
            }
          });
          ctx.fill();
        }
        // 樹線：沿稜線長一排小樹／針葉
        if (B.trees) {
          ctx.fillStyle = B.trees;
          const step = B.treeStep || 7;
          ctx.beginPath();
          for (let x = 0; x < TW; x += step * (0.6 + hashK(x + bi) * 0.8)) {
            const y = ys[Math.round(x / 4)] + 2;
            const th = (B.treeH || 12) * (0.6 + hashK(x * 1.7) * 0.8);
            if (B.pointy) {
              ctx.moveTo(x - th * 0.3, y + 2);
              ctx.lineTo(x, y - th);
              ctx.lineTo(x + th * 0.3, y + 2);
            } else circle(ctx, x, y - th * 0.4, th * 0.55);
          }
          ctx.fill();
        }
        // 小顆的霧、田野
        if (B.fields) {
          for (let k = 0; k < B.fields; k++) {
            const fx = rnd() * TW;
            const fy = ys[Math.round(fx / 4)] + 16 + rnd() * 40;
            ctx.fillStyle = B.fieldCols[Math.floor(rnd() * B.fieldCols.length)];
            ctx.beginPath();
            ctx.ellipse(fx, fy, 30 + rnd() * 50, 5 + rnd() * 5, (rnd() - 0.5) * 0.2, 0, PI2);
            ctx.fill();
          }
        }
        ctx.restore();
        // 受光稜
        if (B.rim) {
          ctx.strokeStyle = B.rim;
          ctx.lineWidth = B.rimW || 1.6;
          ctx.beginPath();
          for (let i = 1; i < ys.length; i++) {
            if (ys[i] <= ys[i - 1] + 0.3) {
              ctx.moveTo((i - 1) * 4, ys[i - 1] + 0.8);
              ctx.lineTo(i * 4, ys[i] + 0.8);
            }
          }
          ctx.stroke();
        }
        // 山腳的霧
        if (L.fog && B.mist !== false) {
          const mg = ctx.createLinearGradient(0, base - 30, 0, base + (B.fogH || 90));
          mg.addColorStop(0, rgba(L.fogRgb, 0));
          mg.addColorStop(1, rgba(L.fogRgb, B.mistA == null ? 0.55 : B.mistA));
          ctx.fillStyle = mg;
          ctx.fillRect(0, base - 30, TW, (B.fogH || 90) + 30);
          ctx.fillStyle = rgba(L.fogRgb, B.mistA == null ? 0.55 : B.mistA);
          ctx.fillRect(0, base + (B.fogH || 90), TW, h);
        }
      });
    },
    // 地標剪影：[種類, x(0~1), 底(0~1), 大小]
    landmarks(ctx, L, rnd, h) {
      for (const it of L.items) {
        const [kind, fx, fb, s] = it;
        const P = Object.assign({}, L, it[4] || {});
        const x = TW * fx;
        const b = h * fb;
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, 400 * s, (xx) => {
          ctx.save();
          MARK[kind](ctx, xx, b, s, U.seeded(seed), P);
          ctx.restore();
        });
      }
    },
    // 靜態的光柱（從高處一點斜斜照下來）
    shafts(ctx, L, rnd, h) {
      const oy = h * L.y;
      for (let i = 0; i < L.n; i++) {
        const ox = TW * (L.x + (L.span || 0) * (rnd() - 0.5));
        const a = (L.angle || 1.9) + (rnd() - 0.5) * (L.spread || 0.9);
        const len = h * (L.len || 1.3);
        const w = (L.w || 0.05) * (0.4 + rnd());
        const a0 = L.a * (0.4 + rnd() * 0.6);
        wrap2(ox, TW, (xx) => {
          const ex = xx + Math.cos(a) * len;
          const ey = oy + Math.sin(a) * len;
          const g = ctx.createLinearGradient(xx, oy, ex, ey);
          g.addColorStop(0, rgba(L.rgb, 0));
          g.addColorStop(0.2, rgba(L.rgb, a0));
          g.addColorStop(1, rgba(L.rgb, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(xx, oy);
          ctx.lineTo(xx + Math.cos(a - w) * len, oy + Math.sin(a - w) * len);
          ctx.lineTo(xx + Math.cos(a + w) * len, oy + Math.sin(a + w) * len);
          ctx.closePath();
          ctx.fill();
        });
      }
    },
    // 浮空島：倒錐形的岩塊、草皮、小樹、瀑布從邊上落下化成霧
    floatIsles(ctx, L, rnd, h) {
      const items = L.items;
      for (const [fx, fy, s0] of items) {
        const x = TW * fx;
        const y = h * fy;
        const s = s0;
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, 200 * s, (xx) => {
          const r = U.seeded(seed);
          ctx.save();
          if (L.flip) {
            ctx.translate(0, y * 2);
            ctx.scale(1, -1);
          }
          drawIsle(ctx, xx, y, s, r, L);
          ctx.restore();
        });
      }
    },
    // 極光：沿波浪路徑的一排直條，上淡下亮
    aurora(ctx, L, rnd, h) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const [cy, amp, rgb, a] of L.bands) {
        const p1 = rnd() * PI2;
        const p2 = rnd() * PI2;
        for (let x = 0; x < TW; x += 3) {
          const y = h * cy + Math.sin((x / TW) * PI2 * 2 + p1) * amp + Math.sin((x / TW) * PI2 * 5 + p2) * amp * 0.35;
          const hh = h * (L.hgt || 0.2) * (0.6 + 0.4 * Math.sin((x / TW) * PI2 * 7 + p2));
          const k = a * (0.55 + 0.45 * Math.sin((x / TW) * PI2 * 11 + p1));
          const g = ctx.createLinearGradient(0, y - hh, 0, y + 6);
          g.addColorStop(0, rgba(rgb, 0));
          g.addColorStop(0.75, rgba(rgb, k * 0.5));
          g.addColorStop(1, rgba(rgb, k));
          ctx.fillStyle = g;
          ctx.fillRect(x, y - hh, 3, hh + 6);
        }
      }
      ctx.restore();
    },
    // 銀河帶：斜斜的一道星塵、暗雲、密集小星
    milkyWay(ctx, L, rnd, h) {
      const y0 = h * L.y0;
      const y1 = h * L.y1;
      const band = (x) => y0 + ((y1 - y0) * x) / TW + Math.sin((x / TW) * PI2) * 30;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70; i++) {
        const x = rnd() * TW;
        const y = band(x) + (rnd() - 0.5) * 120;
        wrap2(x, 140, (xx) => glow(ctx, xx, y, 50 + rnd() * 90, L.colors[Math.floor(rnd() * L.colors.length)], 0.1 + rnd() * 0.08));
      }
      ctx.restore();
      // 暗星雲帶：模糊的深色雲氣（不支援 filter 的瀏覽器就淡一點）
      // 先畫在暫存圖上，再整張模糊一次貼上（每筆都模糊會很慢）
      const lc = newCanvas(TW, h);
      const lg = lc.getContext('2d');
      lg.fillStyle = L.lane || 'rgba(10,8,30,0.3)';
      for (let i = 0; i < 30; i++) {
        const x = rnd() * TW;
        const y = band(x) + (rnd() - 0.5) * 30;
        lg.beginPath();
        lg.ellipse(x, y, 30 + rnd() * 60, 6 + rnd() * 10, 0.1, 0, PI2);
        lg.fill();
      }
      ctx.save();
      const blur = 'filter' in ctx;
      if (blur) ctx.filter = 'blur(10px)';
      ctx.globalAlpha = blur ? 1 : 0.4;
      ctx.drawImage(lc, 0, 0);
      ctx.restore();
      for (let i = 0; i < (L.n || 900); i++) {
        const x = rnd() * TW;
        const y = band(x) + (rnd() + rnd() + rnd() - 1.5) * 90;
        ctx.globalAlpha = 0.3 + rnd() * 0.7;
        ctx.fillStyle = rnd() < 0.7 ? '#ffffff' : '#ffe6c8';
        ctx.fillRect(x, y, rnd() < 0.9 ? 1 : 2, 1);
      }
      ctx.globalAlpha = 1;
    },
    // 鐘乳石與石筍：洞頂垂下、洞底長起，濕亮的邊
    stalactites(ctx, L, rnd, h) {
      const drawOne = (x, len, w, up) => {
        const y0 = up ? h : 0;
        const d = up ? -1 : 1;
        const base = up ? h * L.floor : h * L.ceil;
        ctx.fillStyle = L.color;
        ctx.beginPath();
        ctx.moveTo(x - w, y0);
        ctx.lineTo(x - w, base);
        ctx.quadraticCurveTo(x - w * 0.5, base + d * len * 0.5, x, base + d * len);
        ctx.quadraticCurveTo(x + w * 0.5, base + d * len * 0.5, x + w, base);
        ctx.lineTo(x + w, y0);
        ctx.fill();
        ctx.fillStyle = L.shade;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, base);
        ctx.quadraticCurveTo(x + w * 0.3, base + d * len * 0.5, x, base + d * len);
        ctx.quadraticCurveTo(x + w * 0.5, base + d * len * 0.5, x + w, base);
        ctx.fill();
        ctx.strokeStyle = L.wet;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.6, base);
        ctx.quadraticCurveTo(x - w * 0.35, base + d * len * 0.45, x - 1, base + d * len * 0.94);
        ctx.stroke();
        if (!up && L.drip) {
          ctx.fillStyle = L.drip;
          ctx.beginPath();
          ctx.ellipse(x, base + len + 6, 1.6, 2.6, 0, 0, PI2);
          ctx.fill();
        }
      };
      // 洞頂與洞底的岩帶
      for (const up of [false, true]) {
        const base = up ? h * L.floor : h * L.ceil;
        const f = ridgeFn(rnd, 26, 0.3);
        ctx.fillStyle = L.color;
        ctx.beginPath();
        ctx.moveTo(0, up ? h : 0);
        for (let x = 0; x <= TW; x += 8) ctx.lineTo(x, base + (up ? f(x) : -f(x)));
        ctx.lineTo(TW, up ? h : 0);
        ctx.fill();
      }
      for (let i = 0; i < L.n; i++) {
        const x = rnd() * TW;
        const len = rr(rnd, L.len);
        const w = len * (0.16 + rnd() * 0.14);
        const up = rnd() < (L.upK == null ? 0.35 : L.upK);
        wrap2(x, w + 4, (xx) => drawOne(xx, up ? len * 0.7 : len, w, up));
      }
      // 岩縫裡的發光礦脈
      if (L.veins) {
        for (let i = 0; i < L.veins; i++) {
          let x = rnd() * TW;
          let y = h * (rnd() < 0.5 ? L.ceil * (0.3 + rnd() * 0.7) : L.floor + rnd() * (1 - L.floor) * 0.6);
          const rgb = L.veinRgb[Math.floor(rnd() * L.veinRgb.length)];
          ctx.strokeStyle = rgba(rgb, 0.8);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          const pts = [[x, y]];
          for (let k = 0; k < 5; k++) {
            x += 8 + rnd() * 16;
            y += (rnd() - 0.5) * 14;
            ctx.lineTo(x, y);
            pts.push([x, y]);
          }
          ctx.stroke();
          for (const [px, py] of pts) glow(ctx, px, py, 16, rgb, 0.3);
        }
      }
    },
    // 皇宮垂幕與旗幟（女王廳）
    banners(ctx, L, rnd, h) {
      // 左右拉起的布幔
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW;
        const w = TW / L.n;
        ctx.fillStyle = L.cloth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + w, 0);
        ctx.quadraticCurveTo(x + w * 0.5, h * 0.14, x, 0);
        ctx.fill();
        ctx.fillStyle = L.clothShade;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + w * 0.5, h * 0.14, x + w, 0);
        ctx.quadraticCurveTo(x + w * 0.5, h * 0.1, x, 0);
        ctx.fill();
        ctx.strokeStyle = L.trim;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + w * 0.5, h * 0.14, x + w, 0);
        ctx.stroke();
        // 垂旗
        const bx = x + w * 0.5;
        const bl = h * (0.2 + rnd() * 0.1);
        ctx.fillStyle = L.flag;
        ctx.beginPath();
        ctx.moveTo(bx - 18, h * 0.07);
        ctx.lineTo(bx + 18, h * 0.07);
        ctx.lineTo(bx + 18, h * 0.07 + bl);
        ctx.lineTo(bx, h * 0.07 + bl - 16);
        ctx.lineTo(bx - 18, h * 0.07 + bl);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(bx + 6, h * 0.07, 12, bl - 6);
        ctx.strokeStyle = L.trim;
        ctx.strokeRect(bx - 14, h * 0.07 + 6, 28, bl - 22);
        // 旗上的菇紋章
        ctx.fillStyle = L.trim;
        ctx.beginPath();
        ctx.arc(bx, h * 0.07 + bl * 0.45, 9, PI, 0);
        ctx.fill();
        ctx.fillRect(bx - 2.5, h * 0.07 + bl * 0.45, 5, 10);
        ctx.fillStyle = L.trim;
        ctx.beginPath();
        ctx.arc(bx, h * 0.07 + bl + 6 - 16, 3, 0, PI2);
        ctx.fill();
      }
    },
  });

  function hashK(x) {
    const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  function drawIsle(ctx, x, y, s, r, L) {
    const w = (90 + r() * 60) * s;
    const d = (70 + r() * 50) * s;
    const rock = L.rock;
    const sh = L.rockShade;
    // 岩塊
    const pts = [[x - w, y]];
    for (let k = 1; k <= 6; k++) {
      const u = k / 7;
      pts.push([x - w + u * w * 2 + (r() - 0.5) * 10 * s, y + Math.sin(u * PI) * d * (0.6 + r() * 0.5) + 4 * s]);
    }
    pts.push([x + w, y]);
    const tip = [x + (r() - 0.5) * w * 0.3, y + d * 1.4];
    const path = (c) => {
      c.moveTo(x - w, y);
      c.lineTo(x - w * 0.7, y + d * 0.4);
      c.lineTo(tip[0], tip[1]);
      c.lineTo(x + w * 0.7, y + d * 0.35);
      c.lineTo(x + w, y);
      c.closePath();
    };
    fillShaded(ctx, path, rock, sh, -w * 0.4);
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let yy = y + 8 * s; yy < tip[1]; yy += (8 + r() * 8) * s) ctx.fillRect(x - w, yy, w * 2, 2.5 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let k = 0; k < 6; k++) ctx.fillRect(x - w * 0.6 + r() * w * 1.2, y + r() * d, 2 * s, (10 + r() * 20) * s);
    ctx.restore();
    // 垂下的根
    ctx.strokeStyle = L.root || mix(sh, '#000000', 0.2);
    ctx.lineWidth = 1.3 * s;
    for (let k = 0; k < 6; k++) {
      const rx = x - w * 0.6 + r() * w * 1.2;
      const ry = y + d * (0.3 + r() * 0.3);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + 4 * s, ry + 16 * s, rx - 2 * s, ry + (20 + r() * 30) * s);
      ctx.stroke();
    }
    // 草皮
    ctx.fillStyle = L.grass;
    ctx.beginPath();
    ctx.moveTo(x - w - 4 * s, y + 2 * s);
    ctx.quadraticCurveTo(x, y - 12 * s, x + w + 4 * s, y + 2 * s);
    ctx.lineTo(x + w - 4 * s, y + 8 * s);
    for (let k = 0; k <= 10; k++) ctx.lineTo(x + w - (k / 10) * w * 2, y + (8 + (k % 2) * 5) * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = L.grassHi || mix(L.grass, '#ffffff', 0.3);
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x, y - 12 * s, x + w, y);
    ctx.quadraticCurveTo(x, y - 7 * s, x - w, y);
    ctx.fill();
    // 瀑布
    if (L.fall && r() < 0.75) {
      const fx = x + (r() < 0.5 ? -1 : 1) * w * (0.55 + r() * 0.3);
      const fl = (140 + r() * 120) * s;
      const g = ctx.createLinearGradient(0, y, 0, y + fl);
      g.addColorStop(0, L.fall);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx - 4 * s, y + 2 * s);
      ctx.quadraticCurveTo(fx - 7 * s, y + fl * 0.4, fx - 12 * s, y + fl);
      ctx.lineTo(fx + 12 * s, y + fl);
      ctx.quadraticCurveTo(fx + 7 * s, y + fl * 0.4, fx + 4 * s, y + 2 * s);
      ctx.fill();
      glow(ctx, fx, y + fl * 0.8, 30 * s, L.mist || '255,255,255', 0.35);
    }
    // 樹或遺跡
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const tx = x - w * 0.7 + r() * w * 1.4;
      const ty = y - 8 * s * (1 - Math.abs(tx - x) / w) + 2 * s;
      if (L.tree && r() < 0.7) roundTree(ctx, tx, ty, s * (0.9 + r() * 0.8), r, L.tree, L.trunk);
      else if (L.pillar) {
        ctx.fillStyle = L.pillar;
        const ph = (18 + r() * 30) * s;
        ctx.fillRect(tx - 3 * s, ty - ph, 6 * s, ph);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(tx + 1 * s, ty - ph, 2 * s, ph);
        ctx.fillStyle = L.pillar;
        ctx.fillRect(tx - 5 * s, ty - ph - 3 * s, 10 * s, 3 * s);
      }
    }
    if (L.gold) {
      ctx.strokeStyle = L.gold;
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.6, y + d * 0.25);
      ctx.lineTo(x - w * 0.2, y + d * 0.55);
      ctx.lineTo(x + w * 0.3, y + d * 0.4);
      ctx.stroke();
      glow(ctx, tip[0], tip[1], 16 * s, L.glowRgb || '255,220,150', 0.8);
    }
  }

  // ── 第一章舊層的精緻版（維持原本的擺放亂數，外觀加細節）──
  // 樹：樹幹有根、分枝與樹皮；樹冠由一簇簇葉團組成，有暗面、中間調、亮面與邊緣的小葉點
  LAYER.trees = function (ctx, L, rnd, h) {
    for (let i = 0; i < L.n; i++) {
      const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.6;
      const s = L.size[0] + rnd() * (L.size[1] - L.size[0]);
      const col = L.colors[Math.floor(rnd() * L.colors.length)];
      const baseY = h * L.base + rnd() * 30;
      const seed = rnd();
      const dark = mix(col, L.deep || '#16301e', 0.38);
      const light = mix(col, L.light || '#fff5c4', 0.2);
      const trunkD = mix(L.trunk, '#000000', 0.3);
      wrap2(x, s, (xx) => {
        const r2 = U.seeded(Math.floor(seed * 1e6));
        // 樹幹與根
        ctx.fillStyle = L.trunk;
        ctx.beginPath();
        ctx.moveTo(xx - s * 0.2, h);
        ctx.quadraticCurveTo(xx - s * 0.09, h - 8, xx - s * 0.075, h - Math.min(40, (h - baseY) * 0.4));
        ctx.quadraticCurveTo(xx - s * 0.06, baseY - s * 0.4, xx - s * 0.05, baseY - s * 0.95);
        ctx.lineTo(xx + s * 0.05, baseY - s * 0.95);
        ctx.quadraticCurveTo(xx + s * 0.065, baseY - s * 0.4, xx + s * 0.085, h - Math.min(40, (h - baseY) * 0.4));
        ctx.quadraticCurveTo(xx + s * 0.1, h - 8, xx + s * 0.22, h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = trunkD;
        ctx.beginPath();
        ctx.moveTo(xx + s * 0.01, h);
        ctx.quadraticCurveTo(xx + s * 0.03, baseY - s * 0.4, xx + s * 0.02, baseY - s * 0.95);
        ctx.lineTo(xx + s * 0.05, baseY - s * 0.95);
        ctx.quadraticCurveTo(xx + s * 0.065, baseY - s * 0.4, xx + s * 0.085, h - 30);
        ctx.quadraticCurveTo(xx + s * 0.1, h - 8, xx + s * 0.22, h);
        ctx.fill();
        // 分枝
        ctx.strokeStyle = L.trunk;
        ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const sy = baseY - s * (0.6 + k * 0.14);
          const dir = k % 2 ? 1 : -1;
          ctx.lineWidth = s * (0.045 - k * 0.01);
          ctx.beginPath();
          ctx.moveTo(xx, sy);
          ctx.quadraticCurveTo(xx + dir * s * 0.18, sy - s * 0.08, xx + dir * s * 0.3, sy - s * 0.3);
          ctx.stroke();
        }
        // 樹皮紋
        ctx.strokeStyle = 'rgba(0,0,0,0.16)';
        ctx.lineWidth = 1;
        for (let k = 0; k < 5; k++) {
          const bx = xx + (r2() - 0.5) * s * 0.08;
          const by = baseY - s * 0.2 - r2() * s * 0.6;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + (r2() - 0.5) * 3, by + 10 + r2() * 14);
          ctx.stroke();
        }
        // 樹冠：葉團
        const cl = [];
        const n = 9 + Math.floor(r2() * 5);
        for (let k = 0; k < n; k++) {
          const a = r2() * PI2;
          const rad = Math.sqrt(r2());
          cl.push([xx + Math.cos(a) * rad * s * 0.5, baseY - s * 1.15 + Math.sin(a) * rad * s * 0.36, s * (0.2 + r2() * 0.12)]);
        }
        cl.sort((p, q) => p[1] - q[1]);
        ctx.fillStyle = dark;
        ctx.beginPath();
        for (const [cx, cy, cr] of cl) circle(ctx, cx + cr * 0.1, cy + cr * 0.2, cr);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        for (const [cx, cy, cr] of cl) circle(ctx, cx - cr * 0.05, cy - cr * 0.02, cr * 0.86);
        ctx.fill();
        // 亮面：只在上半部的葉團，用新月形（亮圓扣掉往右下偏的圓）
        const topY = cl[Math.floor(cl.length * 0.55)][1];
        for (const [cx, cy, cr] of cl) {
          if (cy > topY) continue;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx - cr * 0.05, cy - cr * 0.02, cr * 0.86, 0, PI2);
          ctx.clip();
          ctx.fillStyle = light;
          ctx.beginPath();
          ctx.arc(cx - cr * 0.3, cy - cr * 0.36, cr * 0.62, 0, PI2);
          ctx.fill();
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(cx - cr * 0.1, cy - cr * 0.1, cr * 0.6, 0, PI2);
          ctx.fill();
          ctx.restore();
        }
        // 邊緣的小葉點
        ctx.fillStyle = col;
        for (let k = 0; k < 22; k++) {
          const c = cl[Math.floor(r2() * cl.length)];
          const a = PI + r2() * PI;
          ctx.beginPath();
          ctx.arc(c[0] + Math.cos(a) * c[2] * 0.95, c[1] + Math.sin(a) * c[2] * 0.95, c[2] * (0.1 + r2() * 0.1), 0, PI2);
          ctx.fill();
        }
        ctx.fillStyle = mix(light, '#ffffff', 0.25);
        for (let k = 0; k < 5; k++) {
          const c = cl[Math.floor(r2() * cl.length)];
          ctx.beginPath();
          ctx.arc(c[0] - c[2] * (0.1 + r2() * 0.4), c[1] - c[2] * (0.3 + r2() * 0.35), 1.2 + r2() * 1.8, 0, PI2);
          ctx.fill();
        }
      });
    }
  };

  // 山丘：漸層、受光的稜、沿稜的小樹叢與草地斑塊
  LAYER.hills = function (ctx, L, rnd, h) {
    const p1 = rnd() * 6;
    const p2 = rnd() * 6;
    const yAt = (x) => h * L.base - Math.sin((x / TW) * PI * 2 * 2 + p1) * L.amp - Math.sin((x / TW) * PI * 2 * 5 + p2) * L.amp * 0.35;
    const path = (c) => {
      c.moveTo(0, h);
      for (let x = 0; x <= TW; x += 8) c.lineTo(x, yAt(x));
      c.lineTo(TW, h);
      c.closePath();
    };
    const g = ctx.createLinearGradient(0, h * L.base - L.amp * 1.4, 0, h);
    g.addColorStop(0, mix(L.color, '#ffffff', 0.12));
    g.addColorStop(0.5, L.color);
    g.addColorStop(1, mix(L.color, L.low || '#4a6a5a', 0.25));
    ctx.fillStyle = g;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    // 草地斑塊、小路
    for (let k = 0; k < 26; k++) {
      const x = rnd() * TW;
      const y = yAt(x) + 20 + rnd() * 120;
      ctx.fillStyle = rnd() < 0.6 ? 'rgba(255,255,230,0.1)' : mix(L.color, L.low || '#4a6a5a', 0.12);
      ctx.beginPath();
      ctx.ellipse(x, y, 40 + rnd() * 80, 6 + rnd() * 8, (rnd() - 0.5) * 0.3, 0, PI2);
      ctx.fill();
    }
    if (L.path !== false) {
      ctx.strokeStyle = 'rgba(255,245,220,0.35)';
      ctx.lineWidth = 3;
      for (let k = 0; k < 2; k++) {
        let x = rnd() * TW;
        let y = yAt(x) + 6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let q = 0; q < 6; q++) {
          x += 30 + rnd() * 40;
          y += 10 + rnd() * 20;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    // 稜線上的樹叢
    const bush = mix(L.color, L.low || '#3a5a48', 0.28);
    ctx.fillStyle = bush;
    for (let x = rnd() * 40; x < TW; x += 30 + rnd() * 110) {
      const y = yAt(x) + 5;
      const n = 2 + Math.floor(rnd() * 4);
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const br = 4 + rnd() * 5;
        circle(ctx, x + k * 6, y - br * 0.5 - (k % 2) * 2, br);
      }
      ctx.fill();
      // 偶爾一棵小樹
      if (rnd() < 0.35) {
        const th = 14 + rnd() * 10;
        ctx.fillRect(x - 1, y - th * 0.6, 2, th * 0.6);
        ctx.beginPath();
        circle(ctx, x, y - th, th * 0.45);
        circle(ctx, x + th * 0.3, y - th * 0.8, th * 0.35);
        ctx.fill();
      }
    }
    // 受光稜
    ctx.strokeStyle = L.rimC || 'rgba(255,255,235,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= TW; x += 8) (x ? ctx.lineTo(x, yAt(x) + 1) : ctx.moveTo(x, yAt(x) + 1));
    ctx.stroke();
  };

  // 蘑菇：菌柄有陰影與菌環，菌蓋漸層、菌褶、立體斑點
  LAYER.mushrooms = function (ctx, L, rnd, h) {
    for (let i = 0; i < L.n; i++) {
      const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.5;
      const s = L.size[0] + rnd() * (L.size[1] - L.size[0]);
      const col = L.colors[Math.floor(rnd() * L.colors.length)];
      const baseY = h * L.base + rnd() * 30;
      const lean = (rnd() - 0.5) * 0.3;
      const seed = Math.floor(rnd() * 1e6);
      wrap2(x, s, (xx) => {
        const r2 = U.seeded(seed);
        const cx = xx + lean * s * 1.4;
        const cy = baseY - s;
        const stemPath = (c) => {
          c.moveTo(xx - s * 0.14, h);
          c.quadraticCurveTo(xx - s * 0.1 + lean * s, baseY - s * 0.5, cx - s * 0.08, cy);
          c.lineTo(cx + s * 0.08, cy);
          c.quadraticCurveTo(xx + s * 0.1 + lean * s, baseY - s * 0.5, xx + s * 0.16, h);
          c.closePath();
        };
        fillShaded(ctx, stemPath, L.stem, mix(L.stem, '#6a4a5a', 0.3), -s * 0.08);
        // 菌環
        ctx.fillStyle = mix(L.stem, '#ffffff', 0.3);
        ctx.beginPath();
        ctx.ellipse(xx + lean * s * 0.8, baseY - s * 0.62, s * 0.13, s * 0.035, 0, 0, PI2);
        ctx.fill();
        // 菌褶
        ctx.fillStyle = mix(col, L.stem, 0.55);
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3, s * 0.54, s * 0.08, 0, 0, PI2);
        ctx.fill();
        ctx.strokeStyle = mix(col, '#000000', 0.25);
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = -8; k <= 8; k++) {
          ctx.moveTo(cx + k * s * 0.012, cy + 2);
          ctx.lineTo(cx + k * s * 0.06, cy + s * 0.07);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        // 菌蓋
        const g = ctx.createLinearGradient(0, cy - s * 0.5, 0, cy + 4);
        g.addColorStop(0, mix(col, '#fff6e0', 0.3));
        g.addColorStop(0.6, col);
        g.addColorStop(1, mix(col, '#4a2030', 0.25));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.56, cy + 4);
        ctx.bezierCurveTo(cx - s * 0.58, cy - s * 0.62, cx + s * 0.58, cy - s * 0.62, cx + s * 0.56, cy + 4);
        ctx.quadraticCurveTo(cx, cy - s * 0.04, cx - s * 0.56, cy + 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx - s * 0.22, cy - s * 0.3, s * 0.16, s * 0.07, -0.5, 0, PI2);
        ctx.fill();
        // 斑點（有陰影）
        for (let k = 0; k < 6; k++) {
          const u = (r2() - 0.5) * 1.6;
          const px = cx + u * s * 0.45;
          const py = cy - s * 0.32 * (1 - u * u * 0.7) + r2() * s * 0.08;
          const pr = s * (0.035 + r2() * 0.035);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.beginPath();
          ctx.ellipse(px + 1.5, py + 1.5, pr * 1.3, pr, 0, 0, PI2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,252,240,0.85)';
          ctx.beginPath();
          ctx.ellipse(px, py, pr * 1.3, pr, 0, 0, PI2);
          ctx.fill();
        }
        // 菌蓋下緣的柔光（背光的暖色）
        if (L.glowRgb) glow(ctx, cx, cy + s * 0.08, s * 0.6, L.glowRgb, 0.25);
      });
    }
  };

  // 雲：改成立體積雲（保留原本的顏色參數）
  LAYER.clouds = function (ctx, L, rnd, h) {
    for (let i = 0; i < L.n; i++) {
      const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.6;
      const y = h * rr(rnd, [L.y0, L.y1]);
      const s = rr(rnd, L.size);
      const seed = Math.floor(rnd() * 1e6);
      ctx.globalAlpha = L.alpha || 0.9;
      drawCumulus(ctx, x, y + s * 0.1, s * 0.85, U.seeded(seed), {
        lit: L.lit || L.color,
        mid: L.mid || mix(L.color, L.shade, 0.25),
        shade: L.shade,
        dark: L.dark || mix(L.shade, '#5a6088', 0.2),
        rim: L.rim === undefined ? 'rgba(255,255,255,0.8)' : L.rim,
        base: L.base,
      });
    }
    ctx.globalAlpha = 1;
  };

  // 平頂山：岩層有深淺交錯的色帶、頂上的蓋岩、垂直的沖蝕溝與「沙漠漆」、山腳碎石、頂上灌木
  LAYER.mesas = function (ctx, L, rnd, h) {
    let x = -rnd() * 60;
    while (x < TW - 40) {
      const w = rr(rnd, L.w);
      const hg = rr(rnd, L.hgt);
      const top = h * L.base - hg;
      const seed = Math.floor(rnd() * 1e6);
      wrap2(x + w / 2, w, (xx) => drawMesa2(ctx, L, xx - w / 2, w, top, hg, h, seed));
      x += w + rr(rnd, L.gap);
    }
    // 山腳連成一片，上面散著碎石
    const fy = (xx) => h * L.base + 18 + Math.sin((xx / TW) * PI * 6) * 8;
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let xx = 0; xx <= TW; xx += 20) ctx.lineTo(xx, fy(xx));
    ctx.lineTo(TW, h);
    ctx.fill();
    const g = ctx.createLinearGradient(0, h * L.base, 0, h);
    g.addColorStop(0, 'rgba(255,240,220,0.12)');
    g.addColorStop(1, 'rgba(90,40,30,0.15)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * L.base + 10, TW, h);
    for (let k = 0; k < 40; k++) {
      const bx = rnd() * TW;
      const by = fy(bx) + 6 + rnd() * 60;
      const br = 2 + rnd() * 6;
      ctx.fillStyle = L.shade;
      ctx.beginPath();
      ctx.ellipse(bx, by, br * 1.4, br, 0, 0, PI2);
      ctx.fill();
      ctx.fillStyle = L.top;
      ctx.beginPath();
      ctx.ellipse(bx - br * 0.3, by - br * 0.3, br * 0.8, br * 0.5, 0, 0, PI2);
      ctx.fill();
    }
    if (L.shrub) {
      for (let k = 0; k < 30; k++) {
        const bx = rnd() * TW;
        const by = fy(bx) + 4 + rnd() * 50;
        ctx.fillStyle = L.shrub;
        ctx.beginPath();
        circle(ctx, bx, by, 3 + rnd() * 3);
        circle(ctx, bx + 4, by + 1, 2 + rnd() * 3);
        ctx.fill();
      }
    }
  };
  function drawMesa2(ctx, L, x, w, top, hg, h, seed) {
    const r = U.seeded(seed);
    const capL = x + w * (0.12 + r() * 0.06);
    const capR = x + w * (0.82 + r() * 0.06);
    const foot = top + hg * (0.55 + r() * 0.15);
    const tilt = (r() - 0.5) * 6;
    const path = (c) => {
      c.moveTo(x - 20, h);
      c.lineTo(x - 20, top + hg + 10);
      c.quadraticCurveTo(x + w * 0.05, foot + 10, capL - 4, foot);
      c.lineTo(capL + 2, foot - (foot - top) * 0.4);
      c.lineTo(capL - 2, foot - (foot - top) * 0.55);
      c.lineTo(capL + 4, top + 12);
      c.lineTo(capL + 10, top);
      c.lineTo(capR - 10, top + tilt);
      c.lineTo(capR - 2, top + 10);
      c.lineTo(capR + 3, foot - (foot - top) * 0.5);
      c.lineTo(capR + 6, foot);
      c.quadraticCurveTo(x + w * 0.95, foot + 10, x + w + 20, top + hg + 10);
      c.lineTo(x + w + 20, h);
      c.closePath();
    };
    fillShaded(ctx, path, L.color, L.shade, -w * 0.22);
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    // 岩層：亮暗交錯、粗細不一，在陰影面也看得見
    for (let y = top + 10; y < h; y += 7 + r() * 12) {
      const th = 2 + r() * 6;
      const k = r();
      ctx.fillStyle = k < 0.4 ? 'rgba(255,238,215,0.16)' : k < 0.8 ? 'rgba(110,40,25,0.12)' : L.stripe;
      ctx.beginPath();
      ctx.moveTo(x - 30, y);
      for (let q = 0; q <= 6; q++) ctx.lineTo(x - 30 + (q / 6) * (w + 60), y + Math.sin(q * 1.3 + seed) * 1.5);
      ctx.lineTo(x + w + 30, y + th);
      ctx.lineTo(x - 30, y + th);
      ctx.fill();
    }
    // 蓋岩
    ctx.fillStyle = L.top;
    ctx.fillRect(x - 30, top - 4, w + 60, 9);
    ctx.fillStyle = 'rgba(80,30,20,0.2)';
    ctx.fillRect(x - 30, top + 5, w + 60, 3);
    // 沙漠漆：從頂上垂下的深色條紋
    for (let k = 0; k < w / 22; k++) {
      const sx = capL + 8 + r() * (capR - capL - 16);
      const len = (foot - top) * (0.2 + r() * 0.6);
      const g = ctx.createLinearGradient(0, top, 0, top + len);
      g.addColorStop(0, 'rgba(70,25,20,0.22)');
      g.addColorStop(1, 'rgba(70,25,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx, top + 6, 2 + r() * 5, len);
    }
    // 沖蝕溝
    ctx.strokeStyle = 'rgba(90,30,20,0.16)';
    ctx.lineWidth = 2.5;
    for (let k = 0; k < w / 34; k++) {
      const sx = capL + 12 + r() * (capR - capL - 24);
      ctx.beginPath();
      ctx.moveTo(sx, top + 10);
      ctx.lineTo(sx + (r() - 0.5) * 8, foot - r() * 20);
      ctx.stroke();
    }
    // 山腳的崩積坡紋
    ctx.strokeStyle = 'rgba(255,240,220,0.14)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 10; k++) {
      const sx = x + r() * w;
      ctx.beginPath();
      ctx.moveTo(sx, foot + 4);
      ctx.lineTo(sx + (sx < x + w / 2 ? -1 : 1) * (10 + r() * 20), foot + 30 + r() * 30);
      ctx.stroke();
    }
    ctx.restore();
    // 受光的頂緣
    ctx.fillStyle = 'rgba(255,245,225,0.5)';
    ctx.fillRect(capL + 10, top - 1, capR - capL - 20, 2);
    // 頂上的灌木
    ctx.fillStyle = L.shrub || mix(L.shade, '#4a5a2a', 0.5);
    for (let k = 0; k < w / 30; k++) {
      ctx.beginPath();
      ctx.arc(capL + 14 + r() * (capR - capL - 28), top - 2, 2 + r() * 3, PI, 0);
      ctx.fill();
    }
  }

  // 所有層都掛上通用後製（含上面新定義與覆寫的）
  for (const k of Object.keys(LAYER)) LAYER[k] = wrapPost(LAYER[k]);
})();
