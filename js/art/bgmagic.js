// 背景的魔法氣氛：每一章的遠景改成更深、更暗、更有奇幻感的版本。
// ・只改 THEMES 的背景層清單與天空色，外加新的背景層畫法（LAYER）；地形、擺設、地面完全不動
// ・所有細節都畫進離屏快取（跟其他背景層走同一條 buildLayers → 土地變老調色 → LRU 淘汰）
// ・會動的東西（光柱、孢子、閃電、燈塔光、火星、雪、倒流的瀑布）在畫背景時插進層與層之間，
//   用預先畫好的小貼圖與固定數量的粒子，每格只做貼圖
// 網址加 ?bg=plain 可以關掉整個檔案（比較效能用）
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const THEMES = A.THEMES;
  const LAYER = A.BG_LAYER;
  if (!THEMES || !LAYER) return;
  if (typeof location !== 'undefined' && /[?&]bg=plain\b/.test(location.search)) return;
  const TW = 1600; // 與 background.js 相同的循環寬度
  const PI2 = Math.PI * 2;

  // ── 小工具 ──
  const rgba = (rgb, a) => 'rgba(' + rgb + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  const rr = (rnd, v) => v[0] + rnd() * (v[1] - v[0]);
  const hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  function newCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  // 靠近循環邊界的東西在另一邊再畫一次，接縫才看不出來
  function wrap2(x, r, fn) {
    fn(x);
    if (x - r < 0) fn(x + TW);
    if (x + r > TW) fn(x - TW);
  }
  // 在 TW 上首尾相接的起伏（整數頻率的正弦和）
  function wave(rnd, terms) {
    const T = terms.map(([k, amp]) => [k, amp, rnd() * PI2]);
    return (x) => {
      let s = 0;
      for (const [k, amp, p] of T) s += Math.sin((x / TW) * PI2 * k + p) * amp;
      return s;
    };
  }
  // 首尾相接的分形雜訊（多層 value noise）：岩稜的鋸齒、侵蝕的起伏
  function fractal(rnd, sizes, amp) {
    const oct = sizes.map((sz, i) => {
      const n = Math.max(1, Math.round(TW / sz));
      const tab = [];
      for (let k = 0; k < n; k++) tab.push(rnd() * 2 - 1);
      return [TW / n, n, tab, amp * Math.pow(0.5, i)];
    });
    return (x) => {
      let v = 0;
      for (const [sz, n, tab, a] of oct) {
        const f = x / sz;
        const i = Math.floor(f);
        let u = f - i;
        u = u * u * (3 - 2 * u);
        const a0 = tab[((i % n) + n) % n];
        const a1 = tab[(((i + 1) % n) + n) % n];
        v += (a0 + (a1 - a0) * u) * a;
      }
      return v;
    };
  }
  function glow(ctx, x, y, r, rgb, a, sy) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sy || 1);
    // 漸層在填色當下的座標系解讀：先移到中心再建
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(rgb, a));
    g.addColorStop(0.35, rgba(rgb, a * 0.45));
    g.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, PI2);
    ctx.fill();
    ctx.restore();
  }
  // 水平霧帶：y0→ym 由透明到 a，ym→y1 再淡掉
  function band(ctx, y0, ym, y1, rgb, a) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, rgba(rgb, 0));
    g.addColorStop(Math.max(0.01, Math.min(0.99, (ym - y0) / (y1 - y0))), rgba(rgb, a));
    g.addColorStop(1, rgba(rgb, y1 >= G.H ? a : 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, TW, y1 - y0);
  }
  // 只蓋在已經畫了東西的像素上（大氣透視：越遠越染上霧色）
  function hazeOver(ctx, h, rgb, a0, a1, y0) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, y0 || 0, 0, h);
    g.addColorStop(0, rgba(rgb, a0));
    g.addColorStop(1, rgba(rgb, a1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TW, h);
    ctx.restore();
  }
  // 動畫用的柔光圓（預先畫好，每格只貼圖）
  const sprites = {};
  function glowSprite(rgb) {
    let c = sprites[rgb];
    if (c) return c;
    c = sprites[rgb] = newCanvas(32, 32);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(' + rgb + ',1)');
    g.addColorStop(0.25, 'rgba(' + rgb + ',0.55)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 32);
    return c;
  }
  // 變老的地圖：動畫貼圖也換成調過色的版本（依調色後的顏色字串快取）
  function agedRgb(rgb, cur) {
    if (!cur.aged) return rgb;
    const s = A.ageColor('rgb(' + rgb + ')', cur.map);
    const m = /rgba?\(([^)]*)\)/.exec(s);
    return m ? m[1].split(',').slice(0, 3).join(',') : rgb;
  }

  // ════════════════════════════════════════════════════════════
  // 新的背景層
  // ════════════════════════════════════════════════════════════
  Object.assign(LAYER, {
    // 整片天空：底色漸層＋幾團大光暈（跟 sky 漸層疊在一起，讓天空有深淺）
    mgSky(ctx, L, rnd, h) {
      if (L.grad) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        L.grad.forEach((c, i) => g.addColorStop(i / (L.grad.length - 1), c));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, TW, h);
      }
      for (const [fx, fy, r, rgb, a, sy] of L.glows || []) wrap2(TW * fx, r, (xx) => glow(ctx, xx, h * fy, r, rgb, a, sy));
      for (const B of L.bands || []) band(ctx, h * B[0], h * B[1], h * B[2], B[3], B[4]);
    },

    // ── 第一章：古老的巨木 ──
    // 樹幹從畫面頂端外面一路伸下來，根部張開抓地；亮面一側有邊光、苔蘚，另一側沉進陰影
    mgTrunks(ctx, L, rnd, h) {
      const n = L.n;
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.5 + (rnd() - 0.5) * (L.jit == null ? 0.8 : L.jit)) / n) * TW;
        const w = rr(rnd, L.w);
        const by = h * L.base + rnd() * h * 0.05;
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, w * 2.4, (xx) => drawTrunk(ctx, xx, by, w, L, U.seeded(seed), h));
      }
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
      if (L.fog) band(ctx, h * L.fog[0], h * L.fog[1], h * L.fog[2], L.fog[3], L.fog[4]);
      if (L.shadow) band(ctx, h * L.shadow[0], h * L.shadow[1], h, L.shadow[2], L.shadow[3]);
    },
    // 快要把天空整個蓋住的林冠：葉團、縫隙裡的天光、從縫隙斜照下來的光柱、垂下的藤蔓與苔簾
    mgCanopy(ctx, L, rnd, h) {
      const yb = h * L.base;
      const edge = wave(rnd, [[3, L.amp * 0.5], [7, L.amp * 0.35], [13, L.amp * 0.2]]);
      const yAt = (x) => yb + edge(x);
      // 光柱先畫（在葉子後面，從縫隙往下照）
      for (const [hx, ang, len, w0, w1, a] of L.rays || []) {
        wrap2(TW * hx, 500, (xx) => ray(ctx, xx, yb * 0.55, ang, h * len, w0, w1, L.rayRgb, a));
      }
      // 葉團本體
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= TW; x += 16) ctx.lineTo(x, yAt(x));
      ctx.lineTo(TW, 0);
      ctx.closePath();
      ctx.fill();
      // 下緣一團一團的葉簇：上暗下亮（被底下的霧光照到）
      const cl = L.clumps || 70;
      for (let k = 0; k < cl; k++) {
        const x = rnd() * TW;
        const r = rr(rnd, L.clump || [18, 52]);
        const y = yAt(x) - r * 0.3 + rnd() * r * 0.5;
        wrap2(x, r, (xx) => {
          ctx.fillStyle = k % 3 ? L.color : L.color2 || L.color;
          ctx.beginPath();
          ctx.arc(xx, y, r, 0, PI2);
          ctx.fill();
          ctx.strokeStyle = rgba(L.rim, 0.22 + rnd() * 0.2);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(xx, y, r - 1, Math.PI * 0.2, Math.PI * 0.8);
          ctx.stroke();
        });
      }
      // 葉叢的質感：整片林冠上散著一簇簇稍亮的葉團，越靠下緣越亮（被霧光照到）
      for (let k = 0; k < (L.tex || 260); k++) {
        const x = rnd() * TW;
        const e = yAt(x);
        const u = Math.pow(rnd(), 0.6);
        const y = e * u - 6;
        const r0 = rr(rnd, [4, 10]) * (0.6 + u * 0.8);
        const a = (0.04 + u * 0.16) * (L.texA || 1);
        wrap2(x, r0 * 3, (xx) => {
          ctx.fillStyle = rgba(L.leafRgb, a);
          for (let q = 0; q < 4; q++) {
            ctx.beginPath();
            ctx.ellipse(xx + Math.cos(q * 1.9) * r0 * 1.1, y + Math.sin(q * 1.9) * r0 * 0.6, r0, r0 * 0.62, q, 0, PI2);
            ctx.fill();
          }
        });
      }
      // 下緣被霧光從底下照亮
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const ug = ctx.createLinearGradient(0, yb - L.amp * 2.5, 0, yb + L.amp * 1.2);
      ug.addColorStop(0, rgba(L.leafRgb, 0));
      ug.addColorStop(1, rgba(L.leafRgb, 0.3));
      ctx.fillStyle = ug;
      ctx.fillRect(0, yb - L.amp * 2.5, TW, L.amp * 4);
      ctx.restore();
      // 下緣垂著的葉尖
      for (let k = 0; k < 140; k++) {
        const x = rnd() * TW;
        const y = yAt(x) + rnd() * 18;
        const l = 8 + rnd() * 16;
        const ang = (rnd() - 0.5) * 0.9;
        wrap2(x, 20, (xx) => {
          ctx.fillStyle = k % 2 ? L.color2 || L.color : L.color;
          ctx.beginPath();
          ctx.ellipse(xx + Math.sin(ang) * l * 0.5, y + l * 0.4, l * 0.28, l * 0.6, -ang, 0, PI2);
          ctx.fill();
          ctx.fillStyle = rgba(L.rim, 0.18);
          ctx.beginPath();
          ctx.ellipse(xx + Math.sin(ang) * l * 0.5 + 1, y + l * 0.55, l * 0.16, l * 0.4, -ang, 0, PI2);
          ctx.fill();
        });
      }
      // 林冠裡的縫隙：挖空透出後面的天光，邊上的葉子被照亮
      for (const [hx, hy, r] of L.holes || []) {
        wrap2(TW * hx, r * 1.4, (xx) => {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          const g = ctx.createRadialGradient(xx, h * hy, 0, xx, h * hy, r);
          g.addColorStop(0, 'rgba(0,0,0,1)');
          g.addColorStop(0.55, 'rgba(0,0,0,0.85)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(xx, h * hy, r * 1.4, r, 0, 0, PI2);
          ctx.fill();
          ctx.restore();
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          glow(ctx, xx, h * hy, r * 2.2, L.rayRgb, 0.35, 0.7);
          ctx.restore();
        });
      }
      // 藤蔓：從林冠垂下來，沿途掛著小葉子
      for (let k = 0; k < (L.vines || 0); k++) {
        const x = rnd() * TW;
        const len = rr(rnd, L.vineLen || [60, 260]);
        const sw = (rnd() - 0.5) * 40;
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, 60, (xx) => vine(ctx, xx, yAt(x) - 6, len, sw, L.vine, L.leaf, U.seeded(seed)));
      }
      // 苔簾：一束細絲，越往下越淡
      for (let k = 0; k < (L.moss || 0); k++) {
        const x = rnd() * TW;
        const len = rr(rnd, L.mossLen || [80, 220]);
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, 50, (xx) => mossCurtain(ctx, xx, yAt(x) - 4, len, L.mossRgb, U.seeded(seed)));
      }
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
    },
    // 霧裡的發光巨菇（遠方）：傘底的菌褶與斑點發光，四周一圈光暈
    mgShrooms(ctx, L, rnd, h) {
      for (const [fx, fb, s, rgb, cap] of L.items) {
        const x = TW * fx;
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, 260 * s, (xx) => glowShroom(ctx, xx, h * fb, s, rgb, cap || L.cap, L, U.seeded(seed)));
      }
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
    },
    // 只有一條條光柱的層（光從縫隙斜照下來）
    mgRays(ctx, L, rnd, h) {
      for (const [hx, hy, ang, len, w0, w1, a] of L.rays) wrap2(TW * hx, 600, (xx) => ray(ctx, xx, h * hy, ang, h * len, w0, w1, L.rgb, a));
    },
  });

  // 一條斜斜的光柱：頂端窄、往下變寬變淡
  function ray(ctx, x, y, ang, len, w0, w1, rgb, a) {
    const dx = Math.sin(ang) * len;
    const dy = Math.cos(ang) * len;
    const g = ctx.createLinearGradient(x, y, x + dx, y + dy);
    g.addColorStop(0, rgba(rgb, 0));
    g.addColorStop(0.12, rgba(rgb, a));
    g.addColorStop(0.55, rgba(rgb, a * 0.45));
    g.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = g;
    const nx = Math.cos(ang);
    const ny = -Math.sin(ang);
    ctx.beginPath();
    ctx.moveTo(x - nx * w0, y - ny * w0);
    ctx.lineTo(x + nx * w0, y + ny * w0);
    ctx.lineTo(x + dx + nx * w1, y + dy + ny * w1);
    ctx.lineTo(x + dx - nx * w1, y + dy - ny * w1);
    ctx.closePath();
    ctx.fill();
  }

  function drawTrunk(ctx, x, by, w, L, r, h) {
    const top = L.top != null ? h * L.top : -8;
    const lean = (r() - 0.5) * w * (L.lean == null ? 0.5 : L.lean);
    const ph = r() * 6;
    const side = L.side || 1; // 亮面在哪一側
    const H = by - top;
    const cx = (y) => x + lean * (1 - (y - top) / H) + Math.sin(y * 0.011 + ph) * w * 0.06;
    const hw = (y) => {
      const u = (y - top) / H;
      let k = w * 0.5 * (1 + 0.22 * u * u);
      if (u > 0.82) k += w * 1.1 * Math.pow((u - 0.82) / 0.18, 2.2);
      return k;
    };
    const step = Math.max(10, H / 40);
    const left = [];
    const right = [];
    for (let y = top; y <= by + 0.1; y += step) {
      const c = cx(y);
      const k = hw(y);
      left.push([c - k + Math.sin(y * 0.05 + ph) * 1.5, y]);
      right.push([c + k + Math.sin(y * 0.043 + ph * 2) * 1.5, y]);
    }
    const path = (c) => {
      c.moveTo(left[0][0], left[0][1]);
      for (const p of left) c.lineTo(p[0], p[1]);
      // 根：地面上幾條往外爬的粗根
      c.lineTo(right[right.length - 1][0], by);
      for (let k = right.length - 1; k >= 0; k--) c.lineTo(right[k][0], right[k][1]);
      c.closePath();
    };
    // 根
    if (L.roots !== false) {
      ctx.fillStyle = L.color;
      for (let k = 0; k < 4; k++) {
        const dir = k % 2 ? 1 : -1;
        const rx = cx(by) + dir * (hw(by) * (0.6 + r() * 0.5));
        const ry = by + 4 + r() * 12;
        ctx.beginPath();
        ctx.moveTo(cx(by) + dir * hw(by) * 0.2, by - H * 0.1);
        ctx.quadraticCurveTo(rx - dir * 10, by - 16, rx + dir * w * 0.5, ry + 18);
        ctx.lineTo(rx + dir * w * 0.2, ry + 26);
        ctx.quadraticCurveTo(rx - dir * w * 0.3, by, cx(by), by + 10);
        ctx.closePath();
        ctx.fill();
        // 根的稜線
        if (L.barkHi) {
          ctx.strokeStyle = rgba(L.barkHi, 0.22);
          ctx.lineWidth = Math.max(1, w * 0.025);
          ctx.beginPath();
          ctx.moveTo(cx(by) + dir * hw(by) * 0.25, by - H * 0.08);
          ctx.quadraticCurveTo(rx - dir * 6, by - 10, rx + dir * w * 0.42, ry + 18);
          ctx.stroke();
        }
      }
    }
    // 樹幹本體：亮面→本色→暗面
    const x0 = cx(by * 0.5) - w * 0.7;
    const x1 = cx(by * 0.5) + w * 0.7;
    const g = ctx.createLinearGradient(side > 0 ? x1 : x0, 0, side > 0 ? x0 : x1, 0);
    g.addColorStop(0, L.lit || L.color);
    g.addColorStop(0.3, L.color);
    g.addColorStop(1, L.dark || L.color);
    ctx.fillStyle = g;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    // 樹皮直紋
    if (L.bark) {
      ctx.strokeStyle = L.bark;
      ctx.lineWidth = Math.max(1, w * 0.03);
      const nb = Math.max(3, Math.round(w / 9));
      for (let k = 0; k < nb; k++) {
        const off = (k / (nb - 1) - 0.5) * 1.6;
        const p2 = r() * 6;
        ctx.beginPath();
        for (let y = top; y <= by; y += 14) {
          const xx = cx(y) + off * hw(y) * 0.9 + Math.sin(y * 0.03 + p2) * 3;
          y === top ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y);
        }
        ctx.stroke();
        // 溝旁邊被光擦亮的樹皮稜
        if (L.barkHi) {
          ctx.save();
          ctx.strokeStyle = rgba(L.barkHi, (off * side > 0 ? 0.3 : 0.1) * (L.barkHiA || 1));
          ctx.lineWidth = Math.max(1, w * 0.018);
          ctx.translate(side * Math.max(2, w * 0.03), 0);
          ctx.stroke();
          ctx.restore();
        }
      }
      // 一片片樹皮之間的橫向裂紋
      if (L.barkHi) {
        ctx.strokeStyle = L.bark;
        ctx.lineWidth = Math.max(1, w * 0.02);
        for (let k = 0; k < H / 26; k++) {
          const y = top + r() * H * 0.92;
          const off = (r() - 0.5) * 1.5;
          const xx = cx(y) + off * hw(y);
          ctx.beginPath();
          ctx.moveTo(xx - w * 0.07, y);
          ctx.quadraticCurveTo(xx, y + 3, xx + w * 0.07, y - 1);
          ctx.stroke();
        }
      }
    }
    // 苔蘚：亮面上一片片的綠
    if (L.moss) {
      for (let k = 0; k < 7; k++) {
        const y = top + H * (0.15 + r() * 0.75);
        const xx = cx(y) + side * hw(y) * (0.35 + r() * 0.5);
        ctx.fillStyle = rgba(L.moss, 0.25 + r() * 0.3);
        ctx.beginPath();
        ctx.ellipse(xx, y, w * (0.15 + r() * 0.2), w * (0.3 + r() * 0.6), 0, 0, PI2);
        ctx.fill();
      }
    }
    // 樹洞與節瘤
    if (L.knots) {
      for (let k = 0; k < L.knots; k++) {
        const y = top + H * (0.3 + r() * 0.5);
        const xx = cx(y) + (r() - 0.5) * hw(y) * 0.8;
        // 節瘤：一圈圈年輪般的隆起，中間是暗洞
        if (L.barkHi) {
          ctx.strokeStyle = rgba(L.barkHi, 0.16);
          ctx.lineWidth = Math.max(1, w * 0.014);
          for (let q = 2; q >= 1; q--) {
            ctx.beginPath();
            ctx.ellipse(xx + q * 1.5, y - q * 2, w * 0.05 + q * w * 0.028, w * 0.1 + q * w * 0.05, (r() - 0.5) * 0.3, 0, PI2);
            ctx.stroke();
          }
        }
        ctx.fillStyle = L.dark || 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(xx, y, w * 0.05, w * 0.1, 0, 0, PI2);
        ctx.fill();
      }
    }
    ctx.restore();
    // 亮面的邊光
    if (L.rim) {
      const pts = side > 0 ? right : left;
      const gr = ctx.createLinearGradient(0, top, 0, by);
      gr.addColorStop(0, rgba(L.rim, L.rimA || 0.5));
      gr.addColorStop(0.7, rgba(L.rim, (L.rimA || 0.5) * 0.5));
      gr.addColorStop(1, rgba(L.rim, 0));
      ctx.strokeStyle = gr;
      ctx.lineWidth = Math.max(1.5, w * 0.035);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0] - side * 1.5, p[1]) : ctx.moveTo(p[0] - side * 1.5, p[1])));
      ctx.stroke();
    }
    // 往上伸進林冠的枝幹：由粗到細的一段弧
    for (let k = 0; k < (L.limbs || 0); k++) {
      const y = top + H * (0.1 + r() * 0.3);
      const dir = r() < 0.5 ? -1 : 1;
      const x0b = cx(y) + dir * hw(y) * 0.5;
      const len = w * (0.9 + r() * 0.8);
      const lw = w * (0.2 + r() * 0.1);
      const ex = x0b + dir * len * 0.8;
      const ey = y - len * (0.9 + r() * 0.5);
      const mx = x0b + dir * len * 0.55;
      const my = y - len * 0.2;
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(x0b - dir * lw * 0.2, y + lw * 1.4);
      ctx.quadraticCurveTo(mx + dir * lw * 0.3, my + lw * 0.6, ex + dir * lw * 0.12, ey);
      ctx.lineTo(ex - dir * lw * 0.12, ey);
      ctx.quadraticCurveTo(mx - dir * lw * 0.4, my - lw * 0.4, x0b - dir * lw * 0.2, y - lw * 0.6);
      ctx.closePath();
      ctx.fill();
      if (L.rim) {
        ctx.strokeStyle = rgba(L.rim, (L.rimA || 0.5) * 0.5);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x0b, y - lw * 0.6);
        ctx.quadraticCurveTo(mx - dir * lw * 0.4, my - lw * 0.4, ex, ey);
        ctx.stroke();
      }
    }
    // 樹幹上垂下的幾條藤
    for (let k = 0; k < (L.vines || 0); k++) {
      const y = top + H * (0.05 + r() * 0.4);
      const xx = cx(y) + (r() - 0.5) * hw(y) * 1.6;
      vine(ctx, xx, y, 60 + r() * 220, (r() - 0.5) * 30, L.vine || L.color, L.leaf, r);
    }
  }

  function vine(ctx, x, y, len, sw, col, leaf, r) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6 + r() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sw, y + len * 0.5, x + sw * 0.4, y + len);
    ctx.stroke();
    if (!leaf) return;
    ctx.fillStyle = leaf;
    for (let u = 0.12; u < 1; u += 0.09 + r() * 0.08) {
      const px = x + 2 * (1 - u) * u * sw + u * u * sw * 0.4;
      const py = y + len * u;
      const d = r() < 0.5 ? -1 : 1;
      ctx.beginPath();
      ctx.ellipse(px + d * 3.5, py, 4.2, 2, d * 0.6, 0, PI2);
      ctx.fill();
    }
  }
  function mossCurtain(ctx, x, y, len, rgb, r) {
    const n = 7 + Math.floor(r() * 9);
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, rgba(rgb, 0.45));
    g.addColorStop(0.6, rgba(rgb, 0.3));
    g.addColorStop(1, rgba(rgb, 0));
    ctx.strokeStyle = g;
    for (let k = 0; k < n; k++) {
      const xx = x + (r() - 0.5) * 50;
      const l = len * (0.4 + r() * 0.6);
      ctx.lineWidth = 0.8 + r() * 1.6;
      ctx.beginPath();
      ctx.moveTo(xx, y);
      ctx.bezierCurveTo(xx + (r() - 0.5) * 12, y + l * 0.3, xx + (r() - 0.5) * 16, y + l * 0.7, xx + (r() - 0.5) * 10, y + l);
      ctx.stroke();
    }
  }
  function glowShroom(ctx, x, b, s, rgb, cap, L, r) {
    const sh = (160 + r() * 80) * s;
    const cw = (90 + r() * 50) * s;
    const bend = (r() - 0.5) * 40 * s;
    glow(ctx, x + bend, b - sh, cw * 2.4, rgb, 0.28, 0.8);
    // 柄
    ctx.fillStyle = L.stem;
    ctx.beginPath();
    ctx.moveTo(x - 16 * s, b);
    ctx.quadraticCurveTo(x - 10 * s + bend * 0.5, b - sh * 0.5, x - 9 * s + bend, b - sh);
    ctx.lineTo(x + 9 * s + bend, b - sh);
    ctx.quadraticCurveTo(x + 12 * s + bend * 0.5, b - sh * 0.5, x + 18 * s, b);
    ctx.closePath();
    ctx.fill();
    // 柄上的光紋
    ctx.strokeStyle = rgba(rgb, 0.35);
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(x + 4 * s, b);
    ctx.quadraticCurveTo(x + 4 * s + bend * 0.5, b - sh * 0.5, x + 3 * s + bend, b - sh);
    ctx.stroke();
    const cx = x + bend;
    const cy = b - sh;
    // 傘底的發光菌褶
    const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw);
    gg.addColorStop(0, rgba(rgb, 0.95));
    gg.addColorStop(0.7, rgba(rgb, 0.55));
    gg.addColorStop(1, rgba(rgb, 0.1));
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, cw * 0.18, 0, 0, PI2);
    ctx.fill();
    // 傘蓋
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.moveTo(cx - cw, cy);
    ctx.bezierCurveTo(cx - cw * 0.95, cy - cw * 0.75, cx + cw * 0.95, cy - cw * 0.75, cx + cw, cy);
    ctx.quadraticCurveTo(cx, cy - cw * 0.12, cx - cw, cy);
    ctx.fill();
    // 傘緣一圈光
    ctx.strokeStyle = rgba(rgb, 0.7);
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx - cw, cy);
    ctx.quadraticCurveTo(cx, cy - cw * 0.12, cx + cw, cy);
    ctx.stroke();
    // 發光斑點
    for (let k = 0; k < 7; k++) {
      const u = (r() - 0.5) * 1.5;
      const px = cx + u * cw * 0.8;
      const py = cy - cw * 0.5 * (1 - u * u * 0.8) + r() * 6 * s;
      glow(ctx, px, py, 9 * s, rgb, 0.8);
    }
  }

  // ── 第二章：暗色的魔法海岸 ──
  Object.assign(LAYER, {
    // 低壓的暴風雲：一排排厚重的雲團，頂上冷冷的微光、底下沉暗
    mgStorm(ctx, L, rnd, h) {
      const rows = L.rows || 4;
      for (let row = 0; row < rows; row++) {
        const u = row / Math.max(1, rows - 1);
        const y = h * (L.y0 + (L.y1 - L.y0) * u);
        const col = L.cols[Math.min(L.cols.length - 1, row)];
        // 一層雲：上緣平緩起伏，下緣是一個接一個往下鼓的雲團
        const top = wave(rnd, [[2, 18], [5, 10], [9, 5]]);
        const bumps = [];
        let x = 0;
        while (x < TW) {
          const w = rr(rnd, L.r) * (1.2 - u * 0.4);
          bumps.push([x, w, w * (0.25 + rnd() * 0.3)]);
          x += w * (0.7 + rnd() * 0.5);
        }
        const path = (c, dy) => {
          c.moveTo(-40, y - 150 + top(0));
          for (let xx = 0; xx <= TW; xx += 20) c.lineTo(xx, y - 150 + top(xx));
          c.lineTo(TW + 40, y - 150 + top(TW));
          c.lineTo(TW + 40, y + dy);
          for (let k = bumps.length - 1; k >= 0; k--) {
            const [bx, bw, bd] = bumps[k];
            c.quadraticCurveTo(bx + bw * 0.5, y + bd * 2 + dy, bx, y + dy);
          }
          c.lineTo(-40, y + dy);
          c.closePath();
        };
        const g = ctx.createLinearGradient(0, y - 130, 0, y + 70);
        g.addColorStop(0, L.lit);
        g.addColorStop(0.35, col);
        g.addColorStop(1, L.under);
        ctx.fillStyle = g;
        ctx.beginPath();
        path(ctx, 0);
        ctx.fill();
        // 雲團底部被遠方冷光擦亮的一道邊
        ctx.strokeStyle = rgba(L.rimRgb || '150,175,185', 0.12 + u * 0.18);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const [bx, bw, bd] of bumps) {
          ctx.moveTo(bx + bw * 0.15, y + bd * 0.9);
          ctx.quadraticCurveTo(bx + bw * 0.5, y + bd * 2 - 1, bx + bw * 0.85, y + bd * 0.9);
        }
        ctx.stroke();
        // 雲裡的明暗：幾團較亮的鼓起
        for (let k = 0; k < 10; k++) {
          const xx = rnd() * TW;
          glow(ctx, xx, y - 40 - rnd() * 40, 90 + rnd() * 90, L.puffRgb || '120,140,150', 0.08 + u * 0.05, 0.45);
        }
      }
      // 雲底一條被遠方天光照亮的縫
      if (L.slit) band(ctx, h * L.slit[0], h * L.slit[1], h * L.slit[2], L.slit[3], L.slit[4]);
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
    },
    // 翻騰的深藍海面：由遠到近一排排浪，越近越高越寬；浪頭有白色浪花，浪背拖著泡沫，遠處被風暴的霧吞掉
    mgSea(ctx, L, rnd, h) {
      const Y0 = h * L.y0;
      const Y1 = h * L.y1;
      const n = L.rows;
      for (let k = 0; k < n; k++) {
        const u = (k + 1) / n;
        const y = Y0 + (Y1 - Y0) * Math.pow(k / n, 1.5) + 2;
        const A = (L.amp[0] + (L.amp[1] - L.amp[0]) * u * u) * (0.8 + rnd() * 0.4);
        const m = Math.max(2, Math.round(L.waves[0] + (L.waves[1] - L.waves[0]) * u));
        const p1 = rnd() * PI2;
        const p2 = rnd() * PI2;
        const m2 = m * 2 + 1;
        const crest = (x) => {
          const v = 0.5 + 0.5 * Math.sin((x / TW) * PI2 * m + p1 + Math.sin((x / TW) * PI2 * 3 + p2) * 0.8);
          return y - A * Math.pow(v, 2.4) - A * 0.15 * Math.sin((x / TW) * PI2 * m2 + p2);
        };
        const g = ctx.createLinearGradient(0, y - A, 0, y + A * 2 + 30);
        g.addColorStop(0, L.face);
        g.addColorStop(0.35, L.body);
        g.addColorStop(1, L.deep);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= TW; x += 8) ctx.lineTo(x, crest(x));
        ctx.lineTo(TW, h);
        ctx.closePath();
        ctx.fill();
        // 浪面上被天光照亮的一道
        ctx.strokeStyle = rgba(L.litRgb, 0.18 + u * 0.2);
        ctx.lineWidth = 1 + u * 2;
        ctx.beginPath();
        for (let x = 0; x <= TW; x += 8) x ? ctx.lineTo(x, crest(x) + 3 + u * 4) : ctx.moveTo(x, crest(x) + 3 + u * 4);
        ctx.stroke();
        // 浪頭的白花與往後拖的泡沫
        const step = TW / m;
        for (let q = 0; q < m; q++) {
          const cx = ((q + 0.25) / m) * TW - (p1 / PI2) * step;
          let best = cx;
          let by = 1e9;
          for (let dx = -step * 0.5; dx <= step * 0.5; dx += step / 16) {
            const yy = crest(cx + dx);
            if (yy < by) {
              by = yy;
              best = cx + dx;
            }
          }
          const fw = step * (0.18 + rnd() * 0.22);
          const fx0 = ((best % TW) + TW) % TW;
          wrap2(fx0, fw * 2, (xx) => {
            ctx.fillStyle = rgba(L.foam, 0.55 + u * 0.35);
            for (let j = 0; j < 5 + u * 8; j++) {
              const ox = (rnd() - 0.5) * fw * 2;
              const oy = crest(xx + ox) - by;
              ctx.beginPath();
              ctx.ellipse(xx + ox, by + oy + rnd() * 3, (2 + rnd() * 6) * (0.5 + u), (1 + rnd() * 2.5) * (0.5 + u), 0, 0, PI2);
              ctx.fill();
            }
            // 浪背的泡沫紋
            ctx.strokeStyle = rgba(L.foam, 0.18 + u * 0.2);
            ctx.lineWidth = 0.8 + u;
            for (let j = 0; j < 3; j++) {
              const sx = xx + (rnd() - 0.3) * fw * 2;
              const sy = by + A * (0.3 + rnd() * 0.6);
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.quadraticCurveTo(sx + fw * 0.5, sy + 4, sx + fw * (1 + rnd()), sy + 2 + rnd() * 6);
              ctx.stroke();
            }
            // 風把浪頭吹成的水霧
            if (u > 0.4) glow(ctx, xx + fw * 0.4, by - A * 0.2, fw * 1.4, L.foam, 0.12 + u * 0.1, 0.45);
          });
        }
        // 大氣透視：越遠越融進霧裡
        if (L.mist) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = rgba(L.mist, (1 - u) * L.mistA);
          ctx.fillRect(0, y - A - 10, TW, h);
          ctx.restore();
        }
      }
      if (L.glint) band(ctx, h * L.glint[0], h * L.glint[1], h * L.glint[2], L.glint[3], L.glint[4]);
    },
    // 退得很遠的潮水：遠方一線暗海，底下是整片露出來的海床（水窪、沙紋、發光的海底生物）
    mgSeabed(ctx, L, rnd, h) {
      const hz = h * L.horizon;
      // 遠方的海
      const sg = ctx.createLinearGradient(0, hz - 16, 0, hz + 10);
      sg.addColorStop(0, L.sea[0]);
      sg.addColorStop(1, L.sea[1]);
      ctx.fillStyle = sg;
      ctx.fillRect(0, hz - 16, TW, 26);
      ctx.fillStyle = rgba(L.glint, 0.5);
      for (let k = 0; k < 60; k++) ctx.fillRect(rnd() * TW, hz - 14 + rnd() * 20, 6 + rnd() * 30, 1);
      // 海床
      const edge = wave(rnd, [[4, 4], [11, 2]]);
      const g = ctx.createLinearGradient(0, hz, 0, h);
      g.addColorStop(0, L.bed[0]);
      g.addColorStop(0.35, L.bed[1]);
      g.addColorStop(1, L.bed[2]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 16) ctx.lineTo(x, hz + 6 + edge(x));
      ctx.lineTo(TW, h);
      ctx.closePath();
      ctx.fill();
      // 沙紋：越近越寬
      for (let k = 0; k < 110; k++) {
        const u = Math.pow(rnd(), 1.4);
        const y = hz + 14 + u * (h - hz);
        const x = rnd() * TW;
        const w = (30 + rnd() * 90) * (0.4 + u * 1.6);
        wrap2(x, w, (xx) => {
          ctx.strokeStyle = rgba(L.ripple, 0.1 + u * 0.12);
          ctx.lineWidth = 0.8 + u * 1.2;
          ctx.beginPath();
          ctx.moveTo(xx - w, y);
          ctx.quadraticCurveTo(xx, y - 3 - u * 4, xx + w, y);
          ctx.stroke();
        });
      }
      // 退潮留下的水窪：倒映著暗雲，邊上一圈發光的小生物
      for (let k = 0; k < (L.pools || 10); k++) {
        const u = 0.1 + Math.pow(rnd(), 1.2) * 0.9;
        const y = hz + 20 + u * (h - hz - 40);
        const x = rnd() * TW;
        const w = (40 + rnd() * 120) * (0.35 + u);
        const hh = w * (0.08 + u * 0.06);
        const bio = L.bio[Math.floor(rnd() * L.bio.length)];
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, w * 1.5, (xx) => {
          const r = U.seeded(seed);
          ctx.fillStyle = L.pool;
          ctx.beginPath();
          ctx.ellipse(xx, y, w, hh, 0, 0, PI2);
          ctx.fill();
          ctx.strokeStyle = rgba(L.glint, 0.35);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(xx, y, w * 0.98, hh * 0.9, 0, Math.PI * 1.05, Math.PI * 1.95);
          ctx.stroke();
          glow(ctx, xx, y, w * 0.9, bio, 0.14 + u * 0.08, 0.3);
          for (let q = 0; q < 6 + u * 10; q++) {
            const a = r() * PI2;
            const px = xx + Math.cos(a) * w * (0.8 + r() * 0.35);
            const py = y + Math.sin(a) * hh * (0.9 + r() * 0.5);
            glow(ctx, px, py, 2 + u * 4 + r() * 3, bio, 0.9);
          }
        });
      }
      // 海床上零散的發光斑塊與石塊
      for (let k = 0; k < (L.patches || 26); k++) {
        const u = Math.pow(rnd(), 1.2);
        const y = hz + 16 + u * (h - hz - 30);
        const x = rnd() * TW;
        const bio = L.bio[Math.floor(rnd() * L.bio.length)];
        const s = 0.4 + u * 1.2;
        wrap2(x, 40, (xx) => {
          ctx.fillStyle = L.rock;
          ctx.beginPath();
          ctx.ellipse(xx, y, 10 * s + rnd() * 10 * s, 4 * s + rnd() * 3 * s, 0, Math.PI, PI2);
          ctx.fill();
          for (let q = 0; q < 4; q++) glow(ctx, xx + (rnd() - 0.5) * 30 * s, y - rnd() * 4 * s, (1.5 + rnd() * 2.5) * s, bio, 0.85);
        });
      }
      band(ctx, hz - 30, hz + 4, hz + 60, L.mist, L.mistA || 0.5);
    },
    // 黑色玄武岩：一根根六角柱擠在一起的海蝕柱與斷崖
    mgBasalt(ctx, L, rnd, h) {
      L._surfs = L.surf ? [] : null;
      for (const it of L.items) {
        const [fx, fb, wdt, hgt, opt] = it;
        const x = TW * fx;
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, wdt, (xx) => basalt(ctx, xx, h * fb, wdt, hgt, Object.assign({}, L, opt || {}), U.seeded(seed)));
      }
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
      if (L.fog) band(ctx, h * L.fog[0], h * L.fog[1], h * L.fog[2], L.fog[3], L.fog[4]);
    },
    // 沉在海床上的古老石柱與門框：斷頂、歪斜、長滿藤壺，刻紋微微發光
    mgPillars(ctx, L, rnd, h) {
      for (const [fx, fb, s, kind, tilt] of L.items) {
        const x = TW * fx;
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, 200 * s, (xx) => pillar(ctx, xx, h * fb, s, kind, tilt || 0, L, U.seeded(seed)));
      }
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
    },
    // 擱淺的沉船剪影：斷成兩截的船身、露出的肋骨、折斷的桅杆與破帆
    mgWreck(ctx, L, rnd, h) {
      for (const [fx, fb, s, tilt, flip] of L.items) {
        const x = TW * fx;
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, 320 * s, (xx) => {
          ctx.save();
          ctx.translate(xx, h * fb);
          ctx.rotate(tilt);
          ctx.scale(flip ? -s : s, s);
          wreck(ctx, L, U.seeded(seed));
          ctx.restore();
        });
      }
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
    },
    // 遠方海蝕柱上的燈塔（光束另外用動畫畫）
    mgLighthouse(ctx, L, rnd, h) {
      const x = TW * L.x;
      const b = h * L.base;
      const s = L.s;
      wrap2(x, 200 * s, (xx) => {
        basalt(ctx, xx, b, 150 * s, L.rockH * s, L, U.seeded(77));
        const top = b - L.rockH * s;
        const th = (L.towerH || 120) * s;
        ctx.fillStyle = L.tower;
        ctx.beginPath();
        ctx.moveTo(xx - 14 * s, top + 4);
        ctx.lineTo(xx - 9 * s, top - th);
        ctx.lineTo(xx + 9 * s, top - th);
        ctx.lineTo(xx + 14 * s, top + 4);
        ctx.fill();
        ctx.fillStyle = L.towerLit;
        ctx.beginPath();
        ctx.moveTo(xx - 14 * s, top + 4);
        ctx.lineTo(xx - 9 * s, top - th);
        ctx.lineTo(xx - 4 * s, top - th);
        ctx.lineTo(xx - 6 * s, top + 4);
        ctx.fill();
        // 塔身的暗色橫帶與小窗
        if (L.stripe) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(xx - 14 * s, top + 4);
          ctx.lineTo(xx - 9 * s, top - th);
          ctx.lineTo(xx + 9 * s, top - th);
          ctx.lineTo(xx + 14 * s, top + 4);
          ctx.clip();
          ctx.fillStyle = L.stripe;
          for (let k = 0; k < 3; k++) ctx.fillRect(xx - 20 * s, top - th * (0.22 + k * 0.3), 40 * s, th * 0.12);
          ctx.restore();
          ctx.fillStyle = rgba(L.lampRgb, 0.55);
          for (let k = 0; k < 3; k++) ctx.fillRect(xx - 1.5 * s, top - th * (0.1 + k * 0.3) - 6 * s, 3 * s, 5 * s);
        }
        ctx.fillStyle = L.tower;
        ctx.fillRect(xx - 13 * s, top - th - 4 * s, 26 * s, 5 * s);
        // 迴廊欄杆
        ctx.strokeStyle = L.rail || L.tower;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xx - 14 * s, top - th - 9 * s);
        ctx.lineTo(xx + 14 * s, top - th - 9 * s);
        for (let k = -3; k <= 3; k++) {
          ctx.moveTo(xx + k * 4.5 * s, top - th - 9 * s);
          ctx.lineTo(xx + k * 4.5 * s, top - th - 4 * s);
        }
        ctx.stroke();
        ctx.fillRect(xx - 10 * s, top - th - 22 * s, 20 * s, 4 * s);
        ctx.beginPath();
        ctx.moveTo(xx - 11 * s, top - th - 22 * s);
        ctx.lineTo(xx, top - th - 34 * s);
        ctx.lineTo(xx + 11 * s, top - th - 22 * s);
        ctx.fill();
        glow(ctx, xx, top - th - 12 * s, 60 * s, L.lampRgb, 0.55);
        ctx.fillStyle = L.lamp;
        ctx.fillRect(xx - 6 * s, top - th - 18 * s, 12 * s, 13 * s);
        // 燈室的窗框
        ctx.fillStyle = L.tower;
        ctx.fillRect(xx - 1 * s, top - th - 18 * s, 2 * s, 13 * s);
        ctx.fillRect(xx - 6.5 * s, top - th - 18 * s, 1.5 * s, 13 * s);
        ctx.fillRect(xx + 5 * s, top - th - 18 * s, 1.5 * s, 13 * s);
        // 窗
        ctx.fillStyle = rgba(L.lampRgb, 0.7);
        ctx.fillRect(xx - 2 * s, top - th * 0.55, 3 * s, 5 * s);
      });
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
    },
  });
  function basalt(ctx, x, b, w, hgt, L, r) {
    // 一群粗細不一的六角柱：整體像一座被海蝕過的岩丘，柱頂斜斜斷開
    const cols = [];
    let cx = x - w / 2;
    const end = x + w / 2;
    const base = L.col || 16;
    while (cx < end) {
      const cw = base * (0.7 + r() * 0.7);
      cols.push([cx, Math.min(cw, end - cx + 2)]);
      cx += cw;
    }
    const ph = r() * 6;
    cols.forEach(([cx, cw], k) => {
      const u = (cx + cw / 2 - (x - w / 2)) / w;
      const hump = Math.pow(Math.max(0, Math.sin(u * Math.PI)), 0.7);
      let hh = hgt * (0.25 + 0.75 * hump) * (0.8 + r() * 0.35) * (0.9 + 0.1 * Math.sin(u * 9 + ph));
      if (r() < 0.12) hh *= 0.6;
      const slope = (r() - 0.5) * cw * 0.9;
      const top = b - hh;
      const lit = u < 0.4;
      ctx.fillStyle = lit ? L.rockLit || L.rock : u > 0.72 ? L.rockDark || L.rock : L.rock;
      ctx.beginPath();
      ctx.moveTo(cx, b + 2);
      ctx.lineTo(cx, top + slope * 0.5);
      ctx.lineTo(cx + cw, top - slope * 0.5);
      ctx.lineTo(cx + cw, b + 2);
      ctx.closePath();
      ctx.fill();
      // 柱面：亮的一側窄窄一條
      ctx.fillStyle = L.rockTop || L.rockLit || L.rock;
      ctx.globalAlpha = lit ? 0.5 : 0.22;
      ctx.beginPath();
      ctx.moveTo(cx, b);
      ctx.lineTo(cx, top + slope * 0.5);
      ctx.lineTo(cx + cw * 0.28, top + slope * 0.5 - slope * 0.28);
      ctx.lineTo(cx + cw * 0.28, b);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 斷口的頂面
      ctx.strokeStyle = L.rockTop || L.rockLit;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, top + slope * 0.5);
      ctx.lineTo(cx + cw, top - slope * 0.5);
      ctx.stroke();
      // 柱縫
      ctx.fillStyle = L.seam || 'rgba(0,0,0,0.4)';
      ctx.fillRect(cx + cw - 1, Math.min(top + slope * 0.5, top - slope * 0.5) + 3, 1.3, hh);
      // 偶爾一道橫向節理
      if (r() < 0.35) ctx.fillRect(cx, top + hh * (0.3 + r() * 0.5), cw, 1.2);
      if (L.wet && r() < 0.6) {
        ctx.fillStyle = rgba(L.wet, lit ? 0.3 : 0.14);
        ctx.fillRect(cx + 1.5, top + 4, 1.2, hh * (0.2 + r() * 0.5));
      }
    });
    // 腳下的碎石
    ctx.fillStyle = L.rockDark || L.rock;
    for (let k = 0; k < 8; k++) {
      const rx = x - w / 2 - 20 + r() * (w + 40);
      ctx.beginPath();
      ctx.ellipse(rx, b + 2, 6 + r() * 14, 4 + r() * 6, 0, Math.PI, PI2);
      ctx.fill();
    }
    // 浪打在岩腳：一圈白色的碎浪、往上炸開的浪花（位置記下來給動畫用）
    if (L.surf) {
      const sb = b - (L.surfY || 0);
      glow(ctx, x, sb - hgt * 0.12, w * 0.8, L.surf, 0.35, 0.5);
      for (let k = 0; k < 14; k++) {
        const fx = x - w * 0.65 + r() * w * 1.3;
        ctx.fillStyle = rgba(L.surf, 0.5 + r() * 0.4);
        ctx.beginPath();
        ctx.ellipse(fx, sb - r() * 10, 6 + r() * w * 0.12, 3 + r() * 5, 0, 0, PI2);
        ctx.fill();
      }
      const side = r() < 0.5 ? -1 : 1;
      glow(ctx, x + side * w * 0.3, sb - hgt * 0.35, Math.max(30, hgt * 0.35), L.surf, 0.3, 1.4);
      ctx.fillStyle = rgba(L.surf, 0.8);
      for (let k = 0; k < 26; k++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
        const d = r() * hgt * 0.6;
        ctx.fillRect(x + side * w * 0.3 + Math.cos(a) * d * 0.6, sb - 10 + Math.sin(a) * d, 1.5 + r() * 2, 1.5 + r() * 2);
      }
      if (L._surfs) L._surfs.push([x, sb, w, hgt]);
    }
  }
  function pillar(ctx, x, b, s, kind, tilt, L, r) {
    ctx.save();
    ctx.translate(x, b);
    ctx.rotate(tilt);
    const w = 26 * s;
    const hh = (kind === 'stub' ? 90 : 230) * s * (0.8 + r() * 0.35);
    const col = (cx, top, hgt, broken) => {
      ctx.fillStyle = L.stone;
      ctx.fillRect(cx - w / 2, -hgt + 10 * s, w, hgt - 10 * s);
      ctx.fillStyle = L.stoneLit;
      ctx.fillRect(cx - w / 2, -hgt + 10 * s, w * 0.3, hgt - 10 * s);
      // 凹槽
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let q = 1; q < 4; q++) ctx.fillRect(cx - w / 2 + (w * q) / 4, -hgt + 12 * s, 1.2 * s, hgt - 12 * s);
      // 柱礎
      ctx.fillStyle = L.stone;
      ctx.fillRect(cx - w * 0.75, -12 * s, w * 1.5, 12 * s);
      if (broken) {
        // 斷掉的頂：鋸齒
        ctx.fillStyle = L.stone;
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, -hgt + 10 * s);
        ctx.lineTo(cx - w * 0.2, -hgt - 6 * s);
        ctx.lineTo(cx, -hgt + 4 * s);
        ctx.lineTo(cx + w * 0.3, -hgt - 12 * s);
        ctx.lineTo(cx + w / 2, -hgt + 10 * s);
        ctx.fill();
      } else {
        // 柱頭
        ctx.fillRect(cx - w * 0.8, -hgt, w * 1.6, 12 * s);
        ctx.fillRect(cx - w * 0.65, -hgt + 12 * s, w * 1.3, 5 * s);
      }
      // 藤壺與海藻
      ctx.fillStyle = L.crust;
      for (let q = 0; q < 10; q++) {
        ctx.beginPath();
        ctx.arc(cx + (r() - 0.5) * w, -r() * hgt * 0.6, (1.5 + r() * 3) * s, 0, PI2);
        ctx.fill();
      }
      // 刻紋發光
      ctx.strokeStyle = rgba(L.rune, 0.55);
      ctx.lineWidth = 1.3 * s;
      const ry = -hgt * (0.35 + r() * 0.3);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.2, ry);
      ctx.lineTo(cx + w * 0.15, ry - 8 * s);
      ctx.lineTo(cx - w * 0.1, ry - 16 * s);
      ctx.moveTo(cx + w * 0.2, ry + 10 * s);
      ctx.lineTo(cx - w * 0.15, ry + 18 * s);
      ctx.stroke();
      glow(ctx, cx, ry, 22 * s, L.rune, 0.25);
    };
    if (kind === 'gate') {
      col(-46 * s, 0, hh, false);
      col(46 * s, 0, hh * 0.92, false);
      // 門楣：一半斷掉垂下
      ctx.fillStyle = L.stone;
      ctx.save();
      ctx.translate(-46 * s, -hh);
      ctx.rotate(0.08);
      ctx.fillRect(-w, -16 * s, 92 * s + w * 1.2, 16 * s);
      ctx.fillStyle = L.stoneLit;
      ctx.fillRect(-w, -16 * s, 92 * s + w * 1.2, 3 * s);
      ctx.restore();
    } else {
      col(0, 0, hh, kind !== 'whole');
    }
    ctx.restore();
  }
  function wreck(ctx, L, r) {
    // 船身（原點在龍骨中央、船底貼地）
    ctx.fillStyle = L.hull;
    ctx.beginPath();
    ctx.moveTo(-230, -20);
    ctx.quadraticCurveTo(-200, 10, -60, 6);
    ctx.lineTo(20, 4);
    // 斷口
    ctx.lineTo(34, -30);
    ctx.lineTo(18, -48);
    ctx.lineTo(40, -70);
    ctx.lineTo(22, -96);
    ctx.lineTo(-40, -104);
    ctx.lineTo(-200, -110);
    ctx.quadraticCurveTo(-250, -112, -262, -128);
    ctx.lineTo(-248, -70);
    ctx.closePath();
    ctx.fill();
    // 甲板邊與船板紋
    ctx.strokeStyle = L.plank;
    ctx.lineWidth = 1.5;
    for (let k = 1; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(-248, -110 + k * 22);
      ctx.quadraticCurveTo(-120, -104 + k * 24, 20, -100 + k * 22);
      ctx.stroke();
    }
    // 破洞裡露出的肋骨
    ctx.fillStyle = L.hole;
    ctx.beginPath();
    ctx.ellipse(-110, -56, 34, 22, 0.1, 0, PI2);
    ctx.fill();
    ctx.strokeStyle = L.hull;
    ctx.lineWidth = 5;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(-136 + k * 17, -78);
      ctx.quadraticCurveTo(-140 + k * 17, -56, -132 + k * 17, -34);
      ctx.stroke();
    }
    // 另一截：只剩一排肋骨
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const x = 80 + k * 26;
      const hh = 70 + Math.sin(k * 1.3) * 18 - k * 6;
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.quadraticCurveTo(x - 20, -hh * 0.5, x - 6 - k * 3, -hh);
      ctx.stroke();
    }
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(60, 6);
    ctx.lineTo(240, 0);
    ctx.stroke();
    // 折斷的桅杆與破帆
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-120, -104);
    ctx.lineTo(-150, -300);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-190, -250);
    ctx.lineTo(-100, -268);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-30, -102);
    ctx.lineTo(10, -190);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = L.sail;
    ctx.beginPath();
    ctx.moveTo(-186, -248);
    ctx.lineTo(-104, -264);
    ctx.quadraticCurveTo(-110, -220, -130, -200);
    ctx.lineTo(-138, -214);
    ctx.lineTo(-150, -196);
    ctx.quadraticCurveTo(-170, -222, -186, -248);
    ctx.fill();
    // 繩索
    ctx.strokeStyle = L.plank;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-150, -300);
    ctx.quadraticCurveTo(-200, -200, -240, -118);
    ctx.moveTo(-150, -300);
    ctx.quadraticCurveTo(-80, -220, -20, -104);
    ctx.stroke();
    // 邊光
    ctx.strokeStyle = rgba(L.rim, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-262, -128);
    ctx.quadraticCurveTo(-250, -112, -200, -110);
    ctx.lineTo(-40, -104);
    ctx.stroke();
  }

  // ── 第三章：燃燒的峽谷 ──
  Object.assign(LAYER, {
    // 高聳的紅黑岩壁：上緣是一座座岩塔與缺口，岩層一條條橫紋，底部被熔岩從下方照亮
    mgCanyon(ctx, L, rnd, h) {
      const base = h * L.top;
      const w1 = wave(rnd, [[2, L.amp * 0.5], [5, L.amp * 0.3], [11, L.amp * 0.12], [23, L.amp * 0.05]]);
      const towers = [];
      for (let k = 0; k < (L.towers || 0); k++) towers.push([rnd() * TW, rr(rnd, [40, 110]), rr(rnd, L.towerH || [80, 200])]);
      const J = L.jag == null ? 10 : L.jag;
      const jag = fractal(rnd, [160, 64, 28, 12, 6], J);
      const yAt = (x) => {
        let y = base + w1(x) + jag(x);
        for (const [tx, tw, th] of towers) {
          let d = Math.abs(x - tx);
          d = Math.min(d, TW - d);
          if (d >= tw) continue;
          // 平頂、階梯狀往下斷的岩塔
          const k = d / tw;
          let f = k < 0.35 ? 1 - k * 0.25 : Math.pow(Math.max(0, 1 - (k - 0.35) / 0.65), 0.8) * 0.91;
          f = f * 0.5 + (Math.round(f * 4) / 4) * 0.5;
          y -= th * f;
        }
        return y;
      };
      const path = (c) => {
        c.moveTo(0, h);
        for (let x = 0; x <= TW; x += 6) c.lineTo(x, yAt(x));
        c.lineTo(TW, h);
        c.closePath();
      };
      const g = ctx.createLinearGradient(0, base - L.amp - 200, 0, h);
      g.addColorStop(0, L.colTop);
      g.addColorStop(0.55, L.col);
      g.addColorStop(1, L.colLow);
      ctx.fillStyle = g;
      ctx.beginPath();
      path(ctx);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      // 岩層：一層層往外突的岩棚（上緣亮、下方一道陰影），跟著緩緩的傾斜與起伏
      const tilt = (rnd() - 0.5) * 0.08;
      for (let y = base - L.amp - 240; y < h; y += 12 + rnd() * 26) {
        const a = 0.08 + rnd() * 0.14;
        const th = 3 + rnd() * 9;
        const ph = rnd() * 6;
        const wob = fractal(rnd, [300, 90, 30], 6);
        const ly = (x) => y + x * tilt + Math.sin(x * 0.004 + ph) * 8 + wob(x);
        ctx.fillStyle = 'rgba(0,0,0,' + (a * 1.4).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(0, ly(0));
        for (let x = 0; x <= TW; x += 20) ctx.lineTo(x, ly(x));
        for (let x = TW; x >= 0; x -= 20) ctx.lineTo(x, ly(x) + th);
        ctx.fill();
        if (rnd() < 0.6) {
          ctx.strokeStyle = rgba(L.strata, a * 1.3);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let x = 0; x <= TW; x += 20) x ? ctx.lineTo(x, ly(x) - 1) : ctx.moveTo(x, ly(x) - 1);
          ctx.stroke();
        }
      }
      // 侵蝕的溝：從稜線往下、越來越窄的暗色 V 字，一側被光擦亮
      for (let k = 0; k < (L.gullies == null ? 18 : L.gullies); k++) {
        const x = rnd() * TW;
        const y0 = yAt(x) + 2;
        const len = 50 + rnd() * 200;
        const gw = 6 + rnd() * 18;
        const bend = (rnd() - 0.5) * 30;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.moveTo(x - gw, y0);
        ctx.quadraticCurveTo(x + bend * 0.5, y0 + len * 0.5, x + bend, y0 + len);
        ctx.quadraticCurveTo(x + bend * 0.5 + gw * 0.3, y0 + len * 0.5, x + gw, y0);
        ctx.fill();
        ctx.strokeStyle = rgba(L.strata, 0.14);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + gw, y0);
        ctx.quadraticCurveTo(x + bend * 0.5 + gw * 0.3, y0 + len * 0.5, x + bend, y0 + len);
        ctx.stroke();
      }
      // 直向的裂縫
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      for (let k = 0; k < (L.cracks || 30); k++) {
        const x = rnd() * TW;
        let y = yAt(x) + 6;
        ctx.lineWidth = 1 + rnd() * 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        let xx = x;
        for (let q = 0; q < 5; q++) {
          xx += (rnd() - 0.5) * 16;
          y += 20 + rnd() * 50;
          ctx.lineTo(xx, y);
        }
        ctx.stroke();
      }
      // 下方熔岩的照明
      const ug = ctx.createLinearGradient(0, h * L.glowY - 200, 0, h * L.glowY + 30);
      ug.addColorStop(0, rgba(L.glowRgb, 0));
      ug.addColorStop(1, rgba(L.glowRgb, L.glowA));
      ctx.fillStyle = ug;
      ctx.fillRect(0, h * L.glowY - 200, TW, h);
      ctx.restore();
      // 上緣被天上的火光擦亮
      if (L.rim) {
        ctx.strokeStyle = rgba(L.rim, L.rimA || 0.45);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= TW; x += 8) x ? ctx.lineTo(x, yAt(x) + 1.5) : ctx.moveTo(x, yAt(x) + 1.5);
        ctx.stroke();
      }
      // 從岩壁上奔流而下的熔岩瀑布
      // 位置記在 L._falls，流動的亮紋動畫照著畫；towerFalls 讓熔岩從岩塔頂上的缺口流下來
      L._falls = [];
      for (const [fx, w, y0, y1] of L.falls || []) L._falls.push([fx, Math.max(yAt(TW * fx) + 4, h * y0) / h, y1, w]);
      (L.towerFalls || []).forEach((w, i) => {
        const T = towers[i];
        if (T) L._falls.push([T[0] / TW + (i % 2 ? 0.006 : -0.006), (yAt(T[0]) + 14) / h, L.fallY || 0.84, w]);
      });
      for (const [fx, y0, y1, w] of L._falls) wrap2(TW * fx, 120, (xx) => lavaFall(ctx, xx, h * y0, h * y1, w, L));
      // 從上方垂下的岩壁（隘道）
      if (L.ceil) {
        const cw = wave(rnd, [[3, 26], [8, 14], [17, 6]]);
        const cg = ctx.createLinearGradient(0, 0, 0, h * L.ceil + 40);
        cg.addColorStop(0, L.colTop);
        cg.addColorStop(1, L.col);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let x = 0; x <= TW; x += 10) ctx.lineTo(x, h * L.ceil + cw(x));
        ctx.lineTo(TW, 0);
        ctx.fill();
        ctx.strokeStyle = rgba(L.glowRgb, 0.35);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= TW; x += 10) x ? ctx.lineTo(x, h * L.ceil + cw(x) - 1) : ctx.moveTo(x, h * L.ceil + cw(x) - 1);
        ctx.stroke();
      }
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
      if (L.fog) band(ctx, h * L.fog[0], h * L.fog[1], h * L.fog[2], L.fog[3], L.fog[4]);
    },
    // 濃煙：一團團柔軟的暗煙，底下被火光映成橘紅
    mgSmoke(ctx, L, rnd, h) {
      for (let k = 0; k < L.n; k++) {
        const u = rnd();
        const x = rnd() * TW;
        const y = h * (L.y0 + (L.y1 - L.y0) * u);
        const r = rr(rnd, L.r) * (1 - u * 0.3);
        const sy = 0.35 + rnd() * 0.25;
        wrap2(x, r * 1.2, (xx) => {
          glow(ctx, xx, y + r * sy * 0.5, r * 1.1, L.lit, (L.litA || 0.3) * (0.4 + u * 0.8), sy);
          glow(ctx, xx, y, r, L.smoke, L.a * (1 - u * 0.4), sy);
        });
      }
    },
    // 火山放在循環寬度的中段（不跨接縫）
    mgVolcano(ctx, L, rnd, h) {
      volcano(ctx, L, rnd, h);
    },
    // 遠方谷底的熔岩河：彎彎曲曲的一條亮帶，表面浮著暗色的冷殼
    mgLavaRiver(ctx, L, rnd, h) {
      const y = h * L.y;
      const w = wave(rnd, [[3, 6], [7, 3]]);
      glow(ctx, TW * 0.5, y, TW * 0.7, L.glowRgb, 0.35, 0.12);
      const g = ctx.createLinearGradient(0, y - L.th, 0, y + L.th);
      g.addColorStop(0, '#ffcf6a');
      g.addColorStop(0.5, '#ff8a2a');
      g.addColorStop(1, '#c43a12');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, y - L.th * 0.5 + w(0));
      for (let x = 0; x <= TW; x += 12) ctx.lineTo(x, y - L.th * 0.5 + w(x));
      for (let x = TW; x >= 0; x -= 12) ctx.lineTo(x, y + L.th * 0.5 + w(x) * 1.3);
      ctx.fill();
      ctx.fillStyle = 'rgba(60,16,8,0.6)';
      for (let k = 0; k < 50; k++) {
        const x = rnd() * TW;
        ctx.beginPath();
        ctx.ellipse(x, y + w(x) + (rnd() - 0.5) * L.th * 0.5, 6 + rnd() * 26, 1 + rnd() * 1.5, 0, 0, PI2);
        ctx.fill();
      }
      // 兩岸的暗色河床
      ctx.fillStyle = L.bank;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 12) ctx.lineTo(x, y + L.th * 0.55 + w(x) * 1.3 + Math.abs(Math.sin(x * 0.01)) * 4);
      ctx.lineTo(TW, h);
      ctx.fill();
      band(ctx, y - 60, y, y + 40, L.glowRgb, 0.25);
    },
  });
  function lavaFall(ctx, x, y0, y1, w, L) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, (y0 + y1) / 2, Math.max(70, w * 7), L.glowRgb, 0.35, Math.max(1.2, (y1 - y0) / (w * 7)));
    glow(ctx, x, y1, w * 7, L.glowRgb, 0.6, 0.35);
    ctx.restore();
    // 從岩縫溢出、往下越來越寬的熔岩簾，兩側有細的支流
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#fff6c0');
    g.addColorStop(0.2, '#ffc050');
    g.addColorStop(0.7, '#ff7a24');
    g.addColorStop(1, '#d8401a');
    ctx.fillStyle = g;
    const H = y1 - y0;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y0);
    for (let u = 0; u <= 1.001; u += 0.1) ctx.lineTo(x - w * (0.5 + u * 0.7) + Math.sin(u * 9 + x) * w * 0.15, y0 + u * H);
    for (let u = 1; u >= -0.001; u -= 0.1) ctx.lineTo(x + w * (0.5 + u * 0.7) + Math.sin(u * 7 + x * 2) * w * 0.15, y0 + u * H);
    ctx.closePath();
    ctx.fill();
    for (const side of [-1, 1]) {
      const sx = x + side * w * 1.4;
      ctx.strokeStyle = '#ff9a38';
      ctx.lineWidth = Math.max(1.2, w * 0.18);
      ctx.beginPath();
      ctx.moveTo(sx - side * w * 0.6, y0 + H * 0.15);
      ctx.quadraticCurveTo(sx, y0 + H * 0.3, sx + side * w * 0.2, y1);
      ctx.stroke();
    }
    // 流紋
    ctx.strokeStyle = 'rgba(150,40,10,0.4)';
    ctx.lineWidth = 1;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * w * 0.18, y0 + 6);
      ctx.quadraticCurveTo(x + k * w * 0.3, (y0 + y1) / 2, x + k * w * 0.5, y1);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.ellipse(x, y1, w * 2.2, w * 0.35, 0, 0, PI2);
    ctx.fill();
    // 落點濺起的熔岩滴與一圈亮光
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y1 - w * 0.5, w * 3, '255,200,90', 0.5, 0.6);
    ctx.restore();
    ctx.fillStyle = '#ffc860';
    for (let k = 0; k < 12; k++) {
      const a = -Math.PI / 2 + ((k / 11) - 0.5) * 2.4;
      const d = w * (1.2 + ((k * 7) % 5) * 0.5);
      ctx.beginPath();
      ctx.arc(x + Math.sin(a) * d * 1.3, y1 - Math.cos(a) * d * 0.9, 0.8 + (k % 3) * 0.7, 0, PI2);
      ctx.fill();
    }
  }
  // 真正的火山：凹弧的山腹、鋸齒的火口、火口裡的紅光、從下面被照亮的煙柱、沿山腹流下的熔岩溝
  function volcano(ctx, L, rnd, h) {
    const x = TW * L.x;
    const b = h * L.base;
    const top = h * L.top;
    const w = L.w;
    const cw = L.cw || w * 0.16;
    const rim = fractal(rnd, [40, 16, 8], 7);
    const flank = fractal(rnd, [120, 50, 20, 8], 8);
    const px = (u, side) => {
      // u: 0 在火口、1 在山腳；凹弧的山腹
      const k = Math.pow(u, 1.8);
      return x + side * (cw + (w - cw) * k) + flank(x + side * 400 + u * 300) * u;
    };
    const py = (u) => top + (b - top) * u;
    // 煙柱（在山後面先畫）：底下被火口照成橘紅，越高越暗越散
    for (let k = 0; k < 44; k++) {
      const u = k / 43;
      const cx = x + Math.sin(u * 4 + 1) * 20 * u + u * u * L.drift;
      const cy = top - 10 - u * L.smokeH;
      const r = (26 + u * 120) * (0.8 + rnd() * 0.4);
      glow(ctx, cx + (rnd() - 0.5) * 30 * u, cy, r, L.smoke, 0.6 * (1 - u * 0.5), 0.8);
      if (u < 0.55) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        glow(ctx, cx, cy + r * 0.4, r * 0.9, L.glowRgb, 0.5 * (1 - u / 0.55), 0.6);
        ctx.restore();
      }
    }
    // 山體
    const path = (c) => {
      c.moveTo(px(1, -1) - 40, b + 30);
      for (let u = 1; u >= 0; u -= 0.04) c.lineTo(px(u, -1), py(u));
      for (let xx = x - cw; xx <= x + cw; xx += 6) c.lineTo(xx, top + rim(xx) - 4 - Math.abs(Math.sin((xx - x) * 0.05)) * 5);
      for (let u = 0; u <= 1.001; u += 0.04) c.lineTo(px(u, 1), py(u));
      c.lineTo(px(1, 1) + 40, b + 30);
      c.closePath();
    };
    const g = ctx.createLinearGradient(0, top, 0, b);
    g.addColorStop(0, L.colTop);
    g.addColorStop(1, L.col);
    ctx.fillStyle = g;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    // 山腹上從火口放射下來的稜與溝
    for (let k = 0; k < 34; k++) {
      const side = k % 2 ? 1 : -1;
      const s0 = rnd();
      const u0 = 0.05 + rnd() * 0.2;
      ctx.strokeStyle = k % 3 ? 'rgba(0,0,0,0.3)' : rgba(L.strata, 0.14);
      ctx.lineWidth = 1 + rnd() * 2.5;
      ctx.beginPath();
      for (let u = u0; u <= 1; u += 0.05) {
        const xx = x + side * (cw * (0.3 + s0) + (w - cw) * Math.pow(u, 1.8) * s0) + flank(u * 500 + k * 40) * 0.5;
        u === u0 ? ctx.moveTo(xx, py(u)) : ctx.lineTo(xx, py(u));
      }
      ctx.stroke();
    }
    // 山腳被熔岩照紅
    const ug = ctx.createLinearGradient(0, b - (b - top) * 0.5, 0, b);
    ug.addColorStop(0, rgba(L.glowRgb, 0));
    ug.addColorStop(1, rgba(L.glowRgb, 0.3));
    ctx.fillStyle = ug;
    ctx.fillRect(x - w - 60, b - (b - top) * 0.5, w * 2 + 120, (b - top) * 0.6);
    ctx.restore();
    // 火口：裡面的熔岩湖與往上噴的紅光
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, top - 8, cw * 3, L.glowRgb, 0.55, 0.7);
    ctx.restore();
    const cg = ctx.createLinearGradient(0, top - 10, 0, top + 6);
    cg.addColorStop(0, '#fff0a0');
    cg.addColorStop(1, '#ff6a1a');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(x, top - 2, cw * 0.85, 7, 0, 0, PI2);
    ctx.fill();
    ctx.strokeStyle = rgba('255,170,80', 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let xx = x - cw; xx <= x + cw; xx += 6) xx === x - cw ? ctx.moveTo(xx, top + rim(xx) - 3) : ctx.lineTo(xx, top + rim(xx) - 3 - Math.abs(Math.sin((xx - x) * 0.05)) * 5);
    ctx.stroke();
    // 熔岩溝：從火口邊緣沿山腹蜿蜒流下，一路分岔（點記在 L._chans 給流動的亮光用）
    L._chans = [];
    for (const [side, s0, len, wig] of L.chans) {
      const pts = [];
      for (let u = 0.02; u <= len; u += 0.025) {
        const xx = x + side * (cw * 0.6 + (w - cw) * Math.pow(u, 1.8) * s0) + Math.sin(u * 14 + s0 * 9) * wig * u;
        pts.push([xx, py(u) - 2]);
      }
      L._chans.push(pts);
      const stroke = (lw, c) => {
        ctx.strokeStyle = c;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
      };
      stroke(14, rgba(L.glowRgb, 0.12));
      stroke(7, rgba(L.glowRgb, 0.3));
      stroke(3.2, '#ff8a2a');
      stroke(1.2, '#ffe08a');
      // 末端的熔岩池
      const e = pts[pts.length - 1];
      glow(ctx, e[0], e[1], 40, L.glowRgb, 0.45, 0.4);
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  }

  // ── 第四章：雪山裡的松林 ──
  Object.assign(LAYER, {
    // 大小混雜的雪松：同一層裡有小的、中的、偶爾一棵特別大的，間距不規則、一叢一叢
    mgPines(ctx, L, rnd, h) {
      const base = h * L.base;
      // 積雪的地面
      if (L.ground) {
        const gw = wave(rnd, [[3, 10], [7, 5], [15, 2]]);
        const g = ctx.createLinearGradient(0, base - 20, 0, h);
        g.addColorStop(0, L.ground[0]);
        g.addColorStop(1, L.ground[1]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= TW; x += 16) ctx.lineTo(x, base + gw(x));
        ctx.lineTo(TW, h);
        ctx.fill();
      }
      const trees = [];
      let x = rnd() * 40;
      while (x < TW) {
        const k = rnd();
        let hh = L.size[0] + Math.pow(k, L.skew || 2) * (L.size[1] - L.size[0]);
        if (rnd() < (L.giant || 0)) hh *= 1.5 + rnd() * 0.5;
        trees.push([x, base + rnd() * (L.spread || 20), hh]);
        // 一叢一叢：有時候很擠、有時候空出一段
        x += (L.gap[0] + rnd() * (L.gap[1] - L.gap[0])) * (rnd() < 0.2 ? 2.2 : rnd() < 0.3 ? 0.4 : 1);
      }
      // 大的先畫（在後面），小的疊在前面，大小才會交錯
      trees.sort((a, b) => b[2] - a[2]);
      for (const [tx, ty, hh] of trees) {
        const seed = Math.floor(rnd() * 1e6);
        const w = hh * (L.wr || 0.36) * (0.8 + rnd() * 0.4);
        wrap2(tx, w, (xx) => snowPine(ctx, xx, ty, hh, w, L, U.seeded(seed)));
      }
      // 林子深處的石燈籠／風鈴：位置記下來給閃爍動畫用
      L._lights = [];
      for (const [fx, s] of L.lanterns || []) {
        const lx = TW * fx;
        const ly = base + 4;
        wrap2(lx, 60, (xx) => shrineLantern(ctx, xx, ly, s, L));
        L._lights.push([lx, ly - 22 * s, 26 * s]);
      }
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
      if (L.fog) band(ctx, h * L.fog[0], h * L.fog[1], h * L.fog[2], L.fog[3], L.fog[4]);
    },
  });
  function snowPine(ctx, x, base, hh, w, L, r) {
    const top = base - hh;
    const tiers = Math.max(4, Math.min(16, Math.round(hh / (L.tierH || 34))));
    const lean = (r() - 0.5) * w * 0.08;
    // 樹幹
    ctx.fillStyle = L.trunk;
    ctx.fillRect(x - w * 0.05, top + hh * 0.2, w * 0.1, hh * 0.8 + 4);
    const tierPath = (c, i) => {
      const u0 = i / tiers;
      const u1 = (i + 1.5) / tiers;
      const yt = top + hh * 0.92 * Math.pow(u0, 0.95);
      const yb = top + hh * 0.92 * Math.min(1, Math.pow(u1, 0.95)) + 4;
      const ww = w * (0.18 + 0.82 * Math.min(1, u1)) * (0.85 + r() * 0.3);
      const cx = x + lean * (1 - u0);
      const droop = (yb - yt) * 0.25;
      c.moveTo(cx, yt);
      c.quadraticCurveTo(cx - ww * 0.45, yt + (yb - yt) * 0.55, cx - ww, yb + droop * 0.3);
      // 下緣一根根垂下的枝尖
      const n = 3 + Math.round(ww / 18);
      for (let k = 1; k <= n; k++) {
        const px = cx - ww + (2 * ww * k) / n;
        const py = yb - droop * 0.4 + (k % 2 ? droop * 0.6 : -droop * 0.2) + r() * droop * 0.4;
        c.lineTo(px, py);
      }
      c.quadraticCurveTo(cx + ww * 0.45, yt + (yb - yt) * 0.55, cx, yt);
      c.closePath();
      return [cx, yt, yb, ww];
    };
    for (let i = 0; i < tiers; i++) {
      ctx.beginPath();
      const [cx, yt, yb, ww] = tierPath(ctx, i);
      ctx.fillStyle = L.color;
      ctx.fill();
      // 背光的一側：藍紫色陰影
      ctx.save();
      ctx.clip();
      ctx.fillStyle = L.shade;
      ctx.fillRect(cx + ww * 0.05, yt - 4, ww * 1.2, yb - yt + 30);
      // 枝上的雪：亮面的上緣一條、枝尖一團團
      ctx.fillStyle = L.snow;
      ctx.beginPath();
      ctx.moveTo(cx, yt);
      ctx.quadraticCurveTo(cx - ww * 0.4, yt + (yb - yt) * 0.4, cx - ww * 0.95, yb - (yb - yt) * 0.1);
      ctx.quadraticCurveTo(cx - ww * 0.35, yt + (yb - yt) * 0.55 + 2, cx + ww * 0.1, yt + (yb - yt) * 0.35);
      ctx.quadraticCurveTo(cx + ww * 0.45, yt + (yb - yt) * 0.45, cx + ww * 0.8, yb - (yb - yt) * 0.15);
      ctx.quadraticCurveTo(cx + ww * 0.35, yt + (yb - yt) * 0.2, cx, yt);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = L.snow2 || L.snow;
      const nc = 2 + Math.round(ww / 26);
      for (let k = 0; k < nc; k++) {
        const px = cx - ww * 0.9 + (1.8 * ww * (k + r() * 0.5)) / nc;
        const py = yb - (yb - yt) * (0.2 + r() * 0.25);
        ctx.beginPath();
        ctx.ellipse(px, py, ww * 0.08 + 2, (yb - yt) * 0.07 + 1.5, 0, 0, PI2);
        ctx.fill();
      }
    }
    // 樹腳的積雪
    ctx.fillStyle = L.snow;
    ctx.beginPath();
    ctx.ellipse(x, base + 2, w * 0.5, w * 0.08 + 3, 0, Math.PI, PI2);
    ctx.fill();
  }
  function shrineLantern(ctx, x, b, s, L) {
    glow(ctx, x, b - 22 * s, 60 * s, L.lampRgb, 0.35);
    ctx.fillStyle = L.stone;
    ctx.fillRect(x - 3 * s, b - 14 * s, 6 * s, 14 * s);
    ctx.fillRect(x - 8 * s, b - 2 * s, 16 * s, 3 * s);
    ctx.fillRect(x - 7 * s, b - 16 * s, 14 * s, 3 * s);
    ctx.fillStyle = L.lamp;
    ctx.fillRect(x - 5 * s, b - 27 * s, 10 * s, 11 * s);
    ctx.fillStyle = L.stone;
    ctx.fillRect(x - 5 * s, b - 27 * s, 2 * s, 11 * s);
    ctx.fillRect(x + 3 * s, b - 27 * s, 2 * s, 11 * s);
    ctx.beginPath();
    ctx.moveTo(x - 11 * s, b - 27 * s);
    ctx.lineTo(x, b - 35 * s);
    ctx.lineTo(x + 11 * s, b - 27 * s);
    ctx.fill();
    ctx.fillStyle = L.snow;
    ctx.beginPath();
    ctx.ellipse(x, b - 31 * s, 8 * s, 3 * s, 0, Math.PI, PI2);
    ctx.fill();
  }

  // ── 終章：抽象的時空神殿 ──
  Object.assign(LAYER, {
    // 現實的裂縫：鋸齒狀的缺口，裡面是更亮、更密的星空，邊緣泛著淡金色的光
    mgRifts(ctx, L, rnd, h) {
      for (const [fx, fy, len, ang, wid] of L.items) {
        const seed = Math.floor(rnd() * 1e6);
        wrap2(TW * fx, len, (xx) => rift(ctx, xx, h * fy, len, ang, wid, L, U.seeded(seed)));
      }
    },
    // 漂浮的幾何碎片：方塊、斷掉的拱門、通往虛空的階梯、細長的石碑碎片、平放的石環
    mgFragments(ctx, L, rnd, h) {
      for (const [fx, fy, s, kind, rot, flip] of L.items) {
        const seed = Math.floor(rnd() * 1e6);
        wrap2(TW * fx, 260 * s, (xx) => {
          ctx.save();
          ctx.translate(xx, h * fy);
          ctx.rotate(rot || 0);
          if (flip) ctx.scale(1, -1);
          ctx.scale(s, s);
          glow(ctx, 0, 0, 160, L.glowRgb, L.glowA || 0.12);
          FRAG[kind](ctx, L, U.seeded(seed));
          ctx.restore();
        });
      }
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
    },
    // 往上流的瀑布：從底下的光池升起，越往上越淡，最後散成一團光霧
    mgUpfalls(ctx, L, rnd, h) {
      L._ups = [];
      for (const [fx, yb, yt, w] of L.items) {
        const x = TW * fx;
        L._ups.push([x, h * yb, h * yt, w]);
        wrap2(x, w * 4, (xx) => {
          const Yb = h * yb;
          const Yt = h * yt;
          glow(ctx, xx, Yb, w * 5, L.glowRgb, 0.35, 0.3);
          ctx.fillStyle = L.pool;
          ctx.beginPath();
          ctx.ellipse(xx, Yb, w * 2.6, w * 0.45, 0, 0, PI2);
          ctx.fill();
          const g = ctx.createLinearGradient(0, Yb, 0, Yt);
          g.addColorStop(0, rgba(L.water, 0.75));
          g.addColorStop(0.6, rgba(L.water, 0.35));
          g.addColorStop(1, rgba(L.water, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(xx - w, Yb);
          ctx.bezierCurveTo(xx - w * 0.6, Yb - (Yb - Yt) * 0.4, xx - w * 0.5, Yb - (Yb - Yt) * 0.7, xx - w * 0.9, Yt);
          ctx.lineTo(xx + w * 0.9, Yt);
          ctx.bezierCurveTo(xx + w * 0.5, Yb - (Yb - Yt) * 0.7, xx + w * 0.6, Yb - (Yb - Yt) * 0.4, xx + w, Yb);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = rgba(L.water, 0.5);
          ctx.lineWidth = 1;
          for (let k = -2; k <= 2; k++) {
            ctx.beginPath();
            ctx.moveTo(xx + k * w * 0.3, Yb);
            ctx.quadraticCurveTo(xx + k * w * 0.2, (Yb + Yt) / 2, xx + k * w * 0.35, Yt + (Yb - Yt) * 0.15);
            ctx.stroke();
          }
          glow(ctx, xx, Yt, w * 4, L.glowRgb, 0.3, 0.6);
        });
      }
      if (L.haze) hazeOver(ctx, h, L.haze, L.hazeA[0], L.hazeA[1]);
    },
    // 天上慢慢轉的巨大星盤：靜態的淡刻度畫進快取，轉動的環另外交給動畫
    mgAstrolabes(ctx, L, rnd, h) {
      const anim = [];
      for (const [fx, fy, r, sp] of L.items) {
        const x = TW * fx;
        const y = h * fy;
        wrap2(x, r * 1.2, (xx) => {
          glow(ctx, xx, y, r * 1.3, L.glowRgb, 0.1);
          ctx.strokeStyle = rgba(L.lineRgb, 0.12);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(xx, y, r * 1.12, 0, PI2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(xx - r * 1.2, y);
          ctx.lineTo(xx + r * 1.2, y);
          ctx.moveTo(xx, y - r * 1.2);
          ctx.lineTo(xx, y + r * 1.2);
          ctx.stroke();
        });
        const p = rnd() * 6;
        const outer = astroSprite(r, L.lineRgb, 0);
        wrap2(x, r * 1.2, (xx) => {
          ctx.save();
          ctx.globalAlpha = L.alpha;
          ctx.translate(xx, y);
          ctx.rotate(p);
          ctx.drawImage(outer, -outer.width / 2, -outer.height / 2);
          ctx.restore();
        });
        anim.push({ type: 'spin', img: astroSprite(r * 0.72, L.lineRgb, 1), x, y, sp: -sp * 1.6, a: L.alpha * 0.9, p: p + 1 });
      }
      return anim;
    },
  });
  function rift(ctx, x, y, len, ang, wid, L, r) {
    const n = 14;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const top = [];
    const bot = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const along = (u - 0.5) * len;
      const w = wid * Math.pow(Math.sin(u * Math.PI), 0.8) * (0.6 + r() * 0.7);
      const j = (r() - 0.5) * wid * 0.5;
      const px = x + ca * along;
      const py = y + sa * along;
      top.push([px - sa * (w + j), py + ca * (w + j)]);
      bot.push([px + sa * (w - j), py - ca * (w - j)]);
    }
    const path = (c) => {
      c.moveTo(top[0][0], top[0][1]);
      for (const p of top) c.lineTo(p[0], p[1]);
      for (let k = bot.length - 1; k >= 0; k--) c.lineTo(bot[k][0], bot[k][1]);
      c.closePath();
    };
    glow(ctx, x, y, len * 0.6, L.haloRgb, 0.16, 0.5);
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    const g = ctx.createRadialGradient(x, y, 0, x, y, len * 0.5);
    g.addColorStop(0, L.core);
    g.addColorStop(0.5, L.inner);
    g.addColorStop(1, L.outer);
    ctx.fillStyle = g;
    ctx.fillRect(x - len, y - len, len * 2, len * 2);
    for (let k = 0; k < 4; k++) glow(ctx, x + (r() - 0.5) * len * 0.6, y + (r() - 0.5) * wid, len * 0.25, L.nebula[k % L.nebula.length], 0.35);
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < len * 1.2; k++) {
      const sx = x + (r() - 0.5) * len;
      const sy = y + (r() - 0.5) * len * 0.6;
      const rr0 = r() < 0.08 ? 1.6 : 0.7;
      ctx.globalAlpha = 0.4 + r() * 0.6;
      ctx.fillRect(sx, sy, rr0, rr0);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // 邊緣的光
    ctx.strokeStyle = rgba(L.edgeRgb, 0.25);
    ctx.lineWidth = 5;
    ctx.beginPath();
    path(ctx);
    ctx.stroke();
    ctx.strokeStyle = rgba(L.edgeRgb, 0.85);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  function astroSprite(r, rgb, kind) {
    const key = 'astro:' + r + ':' + rgb + ':' + kind;
    let c = sprites[key];
    if (c) return c;
    const S = Math.ceil(r * 2 + 12);
    c = sprites[key] = newCanvas(S, S);
    const x = c.getContext('2d');
    const m = S / 2;
    x.translate(m, m);
    x.strokeStyle = rgba(rgb, 0.8);
    x.fillStyle = rgba(rgb, 0.8);
    if (kind === 0) {
      // 外環：刻度、十二個記號
      x.lineWidth = 2.5;
      x.beginPath();
      x.arc(0, 0, r, 0, PI2);
      x.stroke();
      x.lineWidth = 1;
      x.beginPath();
      x.arc(0, 0, r - 14, 0, PI2);
      x.stroke();
      for (let k = 0; k < 72; k++) {
        const a = (k / 72) * PI2;
        const l = k % 6 === 0 ? 12 : 5;
        x.beginPath();
        x.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        x.lineTo(Math.cos(a) * (r - l), Math.sin(a) * (r - l));
        x.stroke();
      }
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * PI2 + 0.26;
        x.beginPath();
        x.arc(Math.cos(a) * (r - 24), Math.sin(a) * (r - 24), 3, 0, PI2);
        x.fill();
      }
    } else {
      // 內圈：兩個斜放的橢圓環（像渾天儀）＋指針
      x.lineWidth = 1.6;
      for (const t of [0.35, -0.9]) {
        x.save();
        x.rotate(t);
        x.beginPath();
        x.ellipse(0, 0, r, r * 0.34, 0, 0, PI2);
        x.stroke();
        x.restore();
      }
      x.lineWidth = 1;
      x.beginPath();
      x.arc(0, 0, r * 0.5, 0, PI2);
      x.stroke();
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(-r * 0.9, 0);
      x.lineTo(r * 0.9, 0);
      x.stroke();
      x.beginPath();
      x.arc(0, 0, 5, 0, PI2);
      x.fill();
    }
    return c;
  }
  // 幾何碎片（原點在碎片中心，單位約 100px）
  function isoBox(ctx, x, y, w, d, hh, L, lightLeft) {
    // 等角的長方體：頂面、左面、右面；光從哪一側來可以反過來（不可能的光線）
    const cx = 0.866;
    const top = [[x, y - hh], [x + w * cx, y - hh - w * 0.5], [x + w * cx - d * cx, y - hh - w * 0.5 - d * 0.5], [x - d * cx, y - hh - d * 0.5]];
    const left = [[x - d * cx, y - hh - d * 0.5], [x, y - hh], [x, y], [x - d * cx, y - d * 0.5]];
    const right = [[x, y - hh], [x + w * cx, y - hh - w * 0.5], [x + w * cx, y - w * 0.5], [x, y]];
    const poly = (pts, c) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.fill();
    };
    poly(top, L.lit);
    poly(left, lightLeft ? L.mid : L.dark);
    poly(right, lightLeft ? L.dark : L.mid);
    ctx.strokeStyle = rgba(L.goldRgb, 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.stroke();
  }
  const FRAG = {
    cube(ctx, L, r) {
      isoBox(ctx, 0, 30, 60, 60, 60, L, r() < 0.5);
      // 一角缺掉、浮在旁邊
      isoBox(ctx, 70, -40, 18, 18, 18, L, true);
      isoBox(ctx, -80, -70, 12, 12, 12, L, false);
    },
    stairs(ctx, L, r) {
      // 通往虛空的階梯：往右上爬，最後幾階斷開、浮在空中
      const n = 9;
      for (let k = 0; k < n; k++) {
        const gapk = k > n - 3 ? (k - (n - 3)) * 14 : 0;
        isoBox(ctx, -120 + k * 26 + gapk, 60 - k * 22 - gapk * 0.8, 26, 50, 16 + (k < 3 ? (3 - k) * 10 : 0), L, false);
      }
    },
    arch(ctx, L, r) {
      // 沒有柱子的拱門：一圈拱石，缺了兩塊，缺的那兩塊浮在附近
      const R = 80;
      const t = 22;
      const n = 11;
      for (let k = 0; k < n; k++) {
        const a0 = Math.PI + (k / n) * Math.PI;
        const a1 = Math.PI + ((k + 0.92) / n) * Math.PI;
        const miss = k === 3 || k === 7;
        const off = miss ? [(k - 5) * 8, -30 - k * 3] : [0, 0];
        ctx.save();
        ctx.translate(off[0], off[1]);
        if (miss) ctx.rotate(0.3);
        ctx.fillStyle = k % 2 ? L.mid : L.lit;
        ctx.beginPath();
        ctx.arc(0, 0, R + t, a0, a1);
        ctx.arc(0, 0, R, a1, a0, true);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = L.dark;
        ctx.beginPath();
        ctx.arc(0, 0, R + 4, a0, a1);
        ctx.arc(0, 0, R, a1, a0, true);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = rgba(L.goldRgb, 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, R + t + 2, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      // 兩根斷在半空的柱頭
      for (const sx of [-1, 1]) {
        ctx.fillStyle = L.mid;
        ctx.fillRect(sx * (R + t / 2) - 12, 0, 24, 36);
        ctx.fillStyle = L.lit;
        ctx.fillRect(sx * (R + t / 2) - 16, 0, 32, 8);
        ctx.fillStyle = L.dark;
        ctx.beginPath();
        ctx.moveTo(sx * (R + t / 2) - 12, 36);
        ctx.lineTo(sx * (R + t / 2) - 4, 48);
        ctx.lineTo(sx * (R + t / 2) + 3, 38);
        ctx.lineTo(sx * (R + t / 2) + 12, 50);
        ctx.lineTo(sx * (R + t / 2) + 12, 36);
        ctx.fill();
      }
    },
    shard(ctx, L, r) {
      // 細長的石碑碎片，中間一道金色刻紋
      ctx.fillStyle = L.mid;
      ctx.beginPath();
      ctx.moveTo(0, -110);
      ctx.lineTo(18, -60);
      ctx.lineTo(14, 70);
      ctx.lineTo(-4, 100);
      ctx.lineTo(-16, 60);
      ctx.lineTo(-14, -70);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = L.lit;
      ctx.beginPath();
      ctx.moveTo(0, -110);
      ctx.lineTo(-14, -70);
      ctx.lineTo(-16, 60);
      ctx.lineTo(-4, 100);
      ctx.lineTo(-2, 40);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(L.goldRgb, 0.85);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(4, -70);
      ctx.lineTo(8, -30);
      ctx.lineTo(2, -10);
      ctx.lineTo(6, 30);
      ctx.stroke();
      glow(ctx, 5, -20, 30, L.glowRgb, 0.35);
    },
    ring(ctx, L, r) {
      // 平放的石環（橢圓），內側一圈金紋；看起來同時是俯視與側視
      ctx.fillStyle = L.dark;
      ctx.beginPath();
      ctx.ellipse(0, 8, 110, 34, 0, 0, PI2);
      ctx.ellipse(0, 8, 76, 20, 0, 0, PI2, true);
      ctx.fill('evenodd');
      ctx.fillStyle = L.lit;
      ctx.beginPath();
      ctx.ellipse(0, 0, 110, 34, 0, 0, PI2);
      ctx.ellipse(0, 0, 76, 20, 0, 0, PI2, true);
      ctx.fill('evenodd');
      ctx.strokeStyle = rgba(L.goldRgb, 0.8);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 93, 27, 0, 0, PI2);
      ctx.stroke();
    },
    door(ctx, L, r) {
      // 立在虛空裡的門框：門後是另一片星空
      ctx.fillStyle = L.dark;
      ctx.fillRect(-50, -120, 100, 150);
      const g = ctx.createLinearGradient(0, -110, 0, 30);
      g.addColorStop(0, 'rgba(' + L.glowRgb + ',0.9)');
      g.addColorStop(1, 'rgba(' + L.glowRgb + ',0.15)');
      ctx.fillStyle = g;
      ctx.fillRect(-36, -106, 72, 136);
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 30; k++) ctx.fillRect(-34 + r() * 68, -104 + r() * 130, 1.2, 1.2);
      ctx.strokeStyle = L.lit;
      ctx.lineWidth = 10;
      ctx.strokeRect(-45, -115, 90, 150);
      ctx.strokeStyle = rgba(L.goldRgb, 0.8);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-51, -121, 102, 162);
    },
  };

  // ── 終章：「時間如流水，空間如風」 ──
  const GOLD = '232,196,110';
  // 光之河：空中蜿蜒的光帶，細細的金線沿著流（河上漂的數字與齒輪交給動畫）
  function streamY(S, x) {
    return S.y + Math.sin((x / TW) * PI2 * S.f + S.p) * S.amp + Math.sin((x / TW) * PI2 * (S.f * 2 + 1) + S.p2) * S.amp * 0.3;
  }
  Object.assign(LAYER, {
    mgStreams(ctx, L, rnd, h) {
      L._streams = [];
      for (const [y0, amp, f, speed] of L.items) {
        const S = { y: h * y0, amp, f, p: rnd() * PI2, p2: rnd() * PI2, speed };
        L._streams.push(S);
        const line = (off, lw, c) => {
          ctx.strokeStyle = c;
          ctx.lineWidth = lw;
          ctx.beginPath();
          for (let x = 0; x <= TW; x += 8) x ? ctx.lineTo(x, streamY(S, x) + off) : ctx.moveTo(x, streamY(S, x) + off);
          ctx.stroke();
        };
        line(0, 34, rgba(L.glowRgb, 0.05));
        line(0, 16, rgba(L.glowRgb, 0.08));
        line(-6, 0.8, rgba(GOLD, 0.35));
        line(0, 1.2, rgba(GOLD, 0.6));
        line(5, 0.7, rgba(GOLD, 0.3));
        line(10, 0.5, rgba(L.glowRgb, 0.25));
        ctx.fillStyle = rgba('255,240,210', 0.8);
        for (let k = 0; k < 60; k++) {
          const x = rnd() * TW;
          ctx.fillRect(x, streamY(S, x) + (rnd() - 0.5) * 16, 1.2, 1.2);
        }
      }
    },
    // 星空的綢帶：像風吹過的絲，寬窄起伏、在折起來的地方變細，裡面是星空，兩邊一條細金線
    mgSilk(ctx, L, rnd, h) {
      for (const [y0, amp, f, wid] of L.items) {
        const p = rnd() * PI2;
        const q = rnd() * PI2;
        const top = (x) => h * y0 + Math.sin((x / TW) * PI2 * f + p) * amp;
        const wd = (x) => wid * (0.12 + 0.88 * Math.abs(Math.sin((x / TW) * PI2 * (f + 1) * 0.5 + q)));
        const path = (c) => {
          c.moveTo(0, top(0));
          for (let x = 0; x <= TW; x += 8) c.lineTo(x, top(x));
          for (let x = TW; x >= 0; x -= 8) c.lineTo(x, top(x) + wd(x));
          c.closePath();
        };
        ctx.save();
        ctx.beginPath();
        path(ctx);
        ctx.clip();
        const g = ctx.createLinearGradient(0, h * y0 - amp, 0, h * y0 + amp + wid);
        g.addColorStop(0, 'rgba(40,30,100,0.55)');
        g.addColorStop(1, 'rgba(90,60,160,0.42)');
        ctx.fillStyle = g;
        ctx.fillRect(0, h * y0 - amp - 10, TW, amp * 2 + wid + 20);
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < 260; k++) {
          const x = rnd() * TW;
          ctx.globalAlpha = 0.3 + rnd() * 0.7;
          const r0 = rnd() < 0.06 ? 1.8 : 0.8;
          ctx.fillRect(x, top(x) + rnd() * wd(x), r0, r0);
        }
        ctx.globalAlpha = 1;
        // 絲的光澤：幾條順著布紋的細線
        for (let k = 1; k <= 3; k++) {
          ctx.strokeStyle = rgba('220,200,255', 0.12);
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 0; x <= TW; x += 10) x ? ctx.lineTo(x, top(x) + wd(x) * k / 4) : ctx.moveTo(x, top(x) + wd(x) * k / 4);
          ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = rgba(GOLD, 0.65);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= TW; x += 8) x ? ctx.lineTo(x, top(x)) : ctx.moveTo(x, top(x));
        ctx.stroke();
        ctx.strokeStyle = rgba(GOLD, 0.4);
        ctx.beginPath();
        for (let x = 0; x <= TW; x += 8) x ? ctx.lineTo(x, top(x) + wd(x)) : ctx.moveTo(x, top(x) + wd(x));
        ctx.stroke();
      }
    },
    // 橫躺的沙漏：沙子不往下掉，從瓶頸橫著流出去，在空中拉成一條細細的沙河
    mgSandglass(ctx, L, rnd, h) {
      const x = TW * L.x;
      const y = h * L.y;
      const s = L.s;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(L.rot);
      glow(ctx, 0, 0, 110 * s, '255,220,160', 0.12);
      // 玻璃
      const bulb = (dir) => {
        ctx.beginPath();
        ctx.moveTo(0, -4 * s);
        ctx.bezierCurveTo(dir * 40 * s, -8 * s, dir * 62 * s, -40 * s, dir * 70 * s, -34 * s);
        ctx.lineTo(dir * 70 * s, 34 * s);
        ctx.bezierCurveTo(dir * 62 * s, 40 * s, dir * 40 * s, 8 * s, 0, 4 * s);
        ctx.closePath();
      };
      for (const dir of [-1, 1]) {
        bulb(dir);
        ctx.fillStyle = 'rgba(200,210,255,0.12)';
        ctx.fill();
        ctx.strokeStyle = rgba('230,235,255', 0.5);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // 剩下的沙
      ctx.fillStyle = '#e8c27a';
      ctx.beginPath();
      ctx.moveTo(-68 * s, 34 * s);
      ctx.lineTo(-68 * s, 6 * s);
      ctx.quadraticCurveTo(-40 * s, 14 * s, -20 * s, 12 * s);
      ctx.lineTo(-10 * s, 34 * s);
      ctx.fill();
      // 金框：兩端的圓盤與三根細柱
      ctx.strokeStyle = rgba(GOLD, 0.9);
      ctx.lineWidth = 2;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(dir * 74 * s, -44 * s);
        ctx.lineTo(dir * 74 * s, 44 * s);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      for (const yy of [-44, 0, 44]) {
        ctx.beginPath();
        ctx.moveTo(-74 * s, yy * s);
        ctx.lineTo(74 * s, yy * s);
        ctx.stroke();
      }
      ctx.restore();
      // 從瓶頸橫著流出去的沙河（世界座標，記下來給動畫用）
      const nx = x + Math.sin(L.rot) * 4 * s;
      const ny = y;
      const pts = [];
      for (let k = 0; k <= 40; k++) {
        const u = k / 40;
        pts.push([nx + u * L.len, ny + Math.sin(u * 5 + 1) * 26 * u - u * u * 40]);
      }
      L._sand = pts;
      ctx.fillStyle = 'rgba(240,210,140,0.7)';
      for (let k = 0; k < 220; k++) {
        const u = Math.pow(rnd(), 0.8);
        const pt = pts[Math.floor(u * 40)];
        const spread = 2 + u * 22;
        ctx.globalAlpha = 0.8 * (1 - u * 0.8);
        ctx.fillRect(pt[0] + (rnd() - 0.5) * 8, pt[1] + (rnd() - 0.5) * spread, 1.3, 1.3);
      }
      ctx.globalAlpha = 1;
    },
  });
  // 動畫用的小貼圖：羅馬數字、小齒輪、鐘錶的指針、被風吹走的建築碎片
  const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  function glyphSprites() {
    if (sprites.glyphs) return sprites.glyphs;
    const out = ROMANS.map((t) => {
      const c = newCanvas(34, 20);
      const x = c.getContext('2d');
      x.font = '14px Georgia, serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = 'rgba(' + GOLD + ',0.95)';
      x.fillText(t, 17, 10);
      return c;
    });
    for (const [r, teeth] of [[8, 8], [6, 6]]) {
      const S = r * 2 + 6;
      const c = newCanvas(S, S);
      const x = c.getContext('2d');
      x.translate(S / 2, S / 2);
      x.strokeStyle = 'rgba(' + GOLD + ',0.9)';
      x.lineWidth = 1.2;
      x.beginPath();
      for (let k = 0; k < teeth * 2; k++) {
        const a = (k / (teeth * 2)) * PI2;
        const rr0 = k % 2 ? r : r + 2.5;
        k ? x.lineTo(Math.cos(a) * rr0, Math.sin(a) * rr0) : x.moveTo(Math.cos(a) * rr0, Math.sin(a) * rr0);
      }
      x.closePath();
      x.stroke();
      x.beginPath();
      x.arc(0, 0, r * 0.35, 0, PI2);
      x.stroke();
      out.push(c);
    }
    sprites.glyphs = out;
    return out;
  }
  function handSprite(kind) {
    const key = 'hand' + kind;
    if (sprites[key]) return sprites[key];
    const c = newCanvas(64, 16);
    const x = c.getContext('2d');
    x.translate(6, 8);
    x.strokeStyle = 'rgba(' + GOLD + ',0.95)';
    x.fillStyle = 'rgba(' + GOLD + ',0.95)';
    x.lineWidth = 1.2;
    // 尾巴的小圓、細桿、中段的鏤空菱形、尖端
    x.beginPath();
    x.arc(0, 0, 3, 0, PI2);
    x.stroke();
    x.beginPath();
    x.moveTo(3, 0);
    x.lineTo(kind ? 50 : 40, 0);
    x.stroke();
    x.beginPath();
    x.moveTo(16, 0);
    x.lineTo(22, -4);
    x.lineTo(28, 0);
    x.lineTo(22, 4);
    x.closePath();
    x.stroke();
    x.beginPath();
    x.moveTo(kind ? 56 : 46, 0);
    x.lineTo(kind ? 48 : 38, -3);
    x.lineTo(kind ? 48 : 38, 3);
    x.closePath();
    x.fill();
    sprites[key] = c;
    return c;
  }
  function fragSprites() {
    if (sprites.frags) return sprites.frags;
    const L = { lit: '#bdb2dc', mid: '#7c70a8', dark: '#3e3470', goldRgb: GOLD };
    const out = [];
    const mk = (w, hh, fn) => {
      const c = newCanvas(w, hh);
      const x = c.getContext('2d');
      x.translate(w / 2, hh / 2);
      fn(x);
      out.push(c);
    };
    mk(40, 40, (x) => isoBox(x, 0, 10, 14, 14, 14, L, true));
    mk(40, 40, (x) => {
      // 一塊拱石
      x.fillStyle = L.lit;
      x.beginPath();
      x.arc(0, 18, 26, Math.PI * 1.3, Math.PI * 1.55);
      x.arc(0, 18, 14, Math.PI * 1.55, Math.PI * 1.3, true);
      x.closePath();
      x.fill();
      x.strokeStyle = 'rgba(' + GOLD + ',0.8)';
      x.lineWidth = 1;
      x.stroke();
    });
    mk(40, 40, (x) => {
      // 一截柱身
      x.fillStyle = L.mid;
      x.fillRect(-7, -12, 14, 24);
      x.fillStyle = L.lit;
      x.fillRect(-7, -12, 4, 24);
      x.strokeStyle = 'rgba(' + GOLD + ',0.8)';
      x.lineWidth = 1;
      x.strokeRect(-7, -12, 14, 24);
    });
    sprites.frags = out;
    return out;
  }

  // ════════════════════════════════════════════════════════════
  // 動畫：插在背景層之間的「假層」
  // 每個主題的 fx 清單：{ after: 在第幾層之後, f: 視差, kind, ... }
  // 畫背景時把假層塞進 map._layers，貼圖時攔下來改成跑動畫；原本的層與快取完全不變
  // ════════════════════════════════════════════════════════════
  const FX = {};
  const TOKENS = new Map(); // 假層的小畫布 → fx 設定
  const EXT = new WeakMap(); // 要往上延伸的層（巨木、林冠、大松樹）：視差把圖往下推時，頂端的一列拉長補滿
  const AUG = new WeakMap(); // 原本的層陣列 → 插好假層的陣列
  const hooked = new WeakSet();
  const cur = { map: null, orig: null, cam: null, t: 0, th: null, aged: false };
  let active = false;
  const baseDrawImage = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype.drawImage : null;

  function install(ctx) {
    if (hooked.has(ctx) || !baseDrawImage) return;
    hooked.add(ctx);
    const own = Object.prototype.hasOwnProperty.call(ctx, 'drawImage') ? ctx.drawImage : baseDrawImage;
    ctx.drawImage = function (img, x, y) {
      if (!active || arguments.length !== 3) return own.apply(this, arguments);
      const d = TOKENS.get(img);
      if (d) {
        if (x < G.W && x + TW > 0) {
          this.save();
          this.translate(x, y);
          FX[d.kind](this, d, cur.t, x, y);
          this.restore();
        }
        return;
      }
      if (y > 0 && EXT.has(img)) own.call(this, img, 0, 0, img.width, 1, x, 0, img.width, y + 1);
      return own.call(this, img, x, y);
    };
  }
  function augment(orig, th) {
    const out = orig.slice();
    orig.forEach((L, i) => {
      const def = th.layers[i];
      if (def && def.extendTop && !L.y0 && !L.empty) EXT.set(L.canvas, 1);
    });
    const list = (th.fx || []).slice().sort((a, b) => b.after - a.after);
    for (const d of list) {
      if (!d._tok) {
        d._tok = newCanvas(1, 1);
        TOKENS.set(d._tok, d);
        if (FX[d.kind].init) FX[d.kind].init(d);
      }
      out.splice(d.after + 1, 0, { canvas: d._tok, y0: 0, f: d.f, anim: null, empty: false });
    }
    return out;
  }
  const baseBg = A.drawBackground;
  A.drawBackground = function (ctx, map, cam, t) {
    const th = map && map._theme;
    if (!th || !th.mg || active) return baseBg.apply(this, arguments);
    install(ctx);
    const orig = map._layers;
    let aug = orig && AUG.get(orig);
    if (orig && !aug) {
      aug = augment(orig, th);
      AUG.set(orig, aug);
    }
    if (aug) map._layers = aug;
    cur.map = map;
    cur.orig = orig;
    cur.cam = cam;
    cur.t = t;
    cur.th = th;
    cur.aged = !!map._aged;
    active = true;
    try {
      return baseBg.call(this, ctx, map, cam, t);
    } finally {
      active = false;
      if (map._layers === aug) map._layers = orig;
    }
  };

  // 粒子池：固定數量，位置全用時間算出來（不配置、不累積）
  function pool(d, n, rnd) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: rnd() * TW, y: rnd() * G.H, p: rnd() * PI2, v: rnd(), s: rnd() });
    d.pts = out;
  }
  const wrapN = (v, m) => ((v % m) + m) % m;

  Object.assign(FX, {
    // 林冠縫隙的光柱：沿著靜態光柱再疊一層緩慢呼吸、左右微晃的亮光
    rays: Object.assign(function (ctx, d, t, sx) {
      const img = d._img;
      ctx.globalCompositeOperation = 'lighter';
      for (const [hx, hy, ang, len, w, a, sp] of d.rays) {
        const x = TW * hx;
        if (sx + x + 520 < 0 || sx + x - 520 > G.W) continue;
        const k = 0.55 + 0.45 * Math.sin(t * (sp || 0.35) + hx * 17);
        ctx.save();
        ctx.globalAlpha = a * k;
        ctx.translate(x, G.H * hy);
        ctx.rotate(-(ang + Math.sin(t * 0.13 + hx * 9) * 0.03));
        ctx.drawImage(img, -w / 2, 0, w, G.H * len);
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
    }, {
      init(d) {
        const c = newCanvas(64, 256);
        const x = c.getContext('2d');
        const g = x.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, rgba(d.rgb, 0));
        g.addColorStop(0.1, rgba(d.rgb, 0.9));
        g.addColorStop(0.5, rgba(d.rgb, 0.35));
        g.addColorStop(1, rgba(d.rgb, 0));
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(24, 0);
        x.lineTo(40, 0);
        x.lineTo(64, 256);
        x.lineTo(0, 256);
        x.fill();
        // 左右兩側柔化
        const s = x.createLinearGradient(0, 0, 64, 0);
        s.addColorStop(0, 'rgba(0,0,0,1)');
        s.addColorStop(0.35, 'rgba(0,0,0,0)');
        s.addColorStop(0.65, 'rgba(0,0,0,0)');
        s.addColorStop(1, 'rgba(0,0,0,1)');
        x.globalCompositeOperation = 'destination-out';
        x.fillStyle = s;
        x.fillRect(0, 0, 64, 256);
        d._img = c;
      },
    }),
    // 漂浮的孢子與光點：慢慢往上飄、左右搖、一明一暗
    motes: Object.assign(function (ctx, d, t, sx) {
      const img = glowSprite(agedRgb(d.rgb, cur));
      const img2 = d.rgb2 ? glowSprite(agedRgb(d.rgb2, cur)) : img;
      const H = G.H;
      const y0 = H * (d.y0 || 0);
      const span = H * ((d.y1 || 1) - (d.y0 || 0));
      ctx.globalCompositeOperation = 'lighter';
      for (const q of d.pts) {
        const x = q.x + Math.sin(t * (0.25 + q.v * 0.3) + q.p) * 26;
        if (sx + x < -20 || sx + x > G.W + 20) continue;
        const y = y0 + wrapN(q.y - t * d.speed * (0.5 + q.v), span);
        const r = d.size[0] + q.s * (d.size[1] - d.size[0]);
        const k = 0.5 + 0.5 * Math.sin(t * (1 + q.v * 1.5) + q.p * 3);
        ctx.globalAlpha = d.a * (0.25 + 0.75 * k);
        ctx.drawImage(q.s > 0.7 ? img2 : img, x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }, {
      init(d) {
        pool(d, d.n, U.seeded(d.seed || 7));
      },
    }),
  });

  // 預先畫好的霧團與燈塔光束（依顏色快取）
  function mistSprite(rgb) {
    const key = 'mist:' + rgb;
    let c = sprites[key];
    if (c) return c;
    c = sprites[key] = newCanvas(256, 96);
    const x = c.getContext('2d');
    x.translate(128, 48);
    x.scale(1, 0.375);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 128);
    g.addColorStop(0, 'rgba(' + rgb + ',1)');
    g.addColorStop(0.5, 'rgba(' + rgb + ',0.45)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g;
    x.fillRect(-128, -128, 256, 256);
    return c;
  }
  function beamSprite(rgb) {
    const key = 'beam:' + rgb;
    let c = sprites[key];
    if (c) return c;
    c = sprites[key] = newCanvas(256, 64);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(' + rgb + ',0.9)');
    g.addColorStop(0.3, 'rgba(' + rgb + ',0.45)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, 28);
    x.lineTo(256, 0);
    x.lineTo(256, 64);
    x.lineTo(0, 36);
    x.fill();
    const v = x.createLinearGradient(0, 0, 0, 64);
    v.addColorStop(0, 'rgba(0,0,0,1)');
    v.addColorStop(0.4, 'rgba(0,0,0,0)');
    v.addColorStop(0.6, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = v;
    x.fillRect(0, 0, 256, 64);
    return c;
  }
  Object.assign(FX, {
    // 雲裡的閃電：每隔幾秒某一團雲從裡面亮兩下，偶爾看得到一小段橫走的電光
    lightning: Object.assign(function (ctx, d, t, sx) {
      const per = d.period || 6;
      const cyc = Math.floor(t / per);
      const ph = t - cyc * per;
      if (ph > 0.9) return;
      const e = Math.max(0, 1 - Math.abs(ph - 0.08) / 0.08) + 0.7 * Math.max(0, 1 - Math.abs(ph - 0.34) / 0.12) + 0.25 * Math.max(0, 1 - Math.abs(ph - 0.6) / 0.3);
      if (e <= 0.01) return;
      const x = TW * hash(cyc + (d.seed || 0));
      if (sx + x < -500 || sx + x > G.W + 500) return;
      const y = G.H * (d.y0 + (d.y1 - d.y0) * hash(cyc * 3.1 + 1));
      const rgb = agedRgb(d.rgb, cur);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, 0.55 * e);
      ctx.drawImage(glowSprite(rgb), x - 320, y - 150, 640, 300);
      ctx.globalAlpha = Math.min(1, 0.3 * e);
      ctx.drawImage(glowSprite(rgb), x - 700, y - 260, 1400, 520);
      if (e > 0.5) {
        ctx.globalAlpha = Math.min(1, e);
        ctx.strokeStyle = rgba(rgb, 0.9);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        let bx = x - 120 + hash(cyc + 7) * 60;
        let by = y + (hash(cyc + 9) - 0.5) * 30;
        ctx.moveTo(bx, by);
        for (let k = 0; k < 7; k++) {
          bx += 20 + hash(cyc * 13 + k) * 30;
          by += (hash(cyc * 17 + k) - 0.5) * 34;
          ctx.lineTo(bx, by);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }, {}),
    // 燈塔的光束：繞著塔轉，轉向我們時變短、燈頭一閃；照進霧裡
    beam: Object.assign(function (ctx, d, t, sx) {
      const x = TW * d.x;
      const y = G.H * d.y;
      if (sx + x < -900 || sx + x > G.W + 900) return;
      const rgb = agedRgb(d.rgb, cur);
      const a = t * (d.speed || 0.55);
      const c = Math.cos(a);
      const toward = Math.max(0, Math.sin(a));
      ctx.globalCompositeOperation = 'lighter';
      ctx.save();
      ctx.translate(x, y);
      ctx.scale((c * d.len) / 256, (1 + toward * 0.6) * (d.w || 1));
      ctx.globalAlpha = d.a * (0.55 + 0.45 * (1 - toward));
      ctx.drawImage(beamSprite(rgb), 0, -32);
      ctx.restore();
      const fr = 26 + toward * toward * 90;
      ctx.globalAlpha = 0.45 + toward * 0.45;
      ctx.drawImage(glowSprite(rgb), x - fr, y - fr, fr * 2, fr * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }, {}),
    // 飄過的濃霧：幾大團柔和的霧慢慢橫移
    mist: Object.assign(function (ctx, d, t, sx) {
      const img = mistSprite(agedRgb(d.rgb, cur));
      const span = TW + 800;
      for (const q of d.pts) {
        const x = wrapN(q.x + t * d.speed * (0.5 + q.v), span) - 400;
        if (sx + x + q.w < 0 || sx + x - q.w > G.W) continue;
        const y = G.H * (d.y0 + (d.y1 - d.y0) * q.s) + Math.sin(t * 0.2 + q.p) * 10;
        ctx.globalAlpha = d.a * (0.6 + 0.4 * Math.sin(t * 0.3 + q.p));
        ctx.drawImage(img, x - q.w, y - q.w * 0.3, q.w * 2, q.w * 0.6);
      }
      ctx.globalAlpha = 1;
    }, {
      init(d) {
        pool(d, d.n, U.seeded(d.seed || 3));
        for (const q of d.pts) q.w = d.size[0] + q.v * (d.size[1] - d.size[0]);
      },
    }),
    // 固定位置一明一暗的小光點（海床上的發光生物、深林裡的燈）
    twinkle: Object.assign(function (ctx, d, t, sx) {
      const img = glowSprite(agedRgb(d.rgb, cur));
      const img2 = d.rgb2 ? glowSprite(agedRgb(d.rgb2, cur)) : img;
      ctx.globalCompositeOperation = 'lighter';
      for (const q of d.pts) {
        if (sx + q.x < -20 || sx + q.x > G.W + 20) continue;
        const k = Math.sin(t * (0.6 + q.v * 1.8) + q.p * 5);
        if (k < -0.2) continue;
        const r = (d.size[0] + q.s * (d.size[1] - d.size[0])) * (0.7 + 0.3 * k);
        ctx.globalAlpha = d.a * (0.2 + 0.8 * Math.max(0, k));
        ctx.drawImage(q.s > 0.6 ? img2 : img, q.x - r, q.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }, {
      init(d) {
        const r = U.seeded(d.seed || 9);
        d.pts = [];
        for (let i = 0; i < d.n; i++) {
          const u = Math.pow(r(), d.pow || 1);
          d.pts.push({ x: r() * TW, y: G.H * (d.y0 + (d.y1 - d.y0) * u), p: r() * PI2, v: r(), s: r() });
        }
      },
    }),
  });

  Object.assign(FX, {
    // 慢慢落下的東西（灰燼、雪）：固定數量，左右飄
    fall: Object.assign(function (ctx, d, t, sx) {
      const H = G.H + 40;
      ctx.fillStyle = d.color;
      for (const q of d.pts) {
        const x = q.x + Math.sin(t * (0.4 + q.v * 0.6) + q.p) * d.sway + t * (d.wind || 0);
        const xx = wrapN(x, TW);
        if (sx + xx < -10 || sx + xx > G.W + 10) continue;
        const y = wrapN(q.y + t * d.speed * (0.6 + q.v * 0.8), H) - 20;
        const r = d.size[0] + q.s * (d.size[1] - d.size[0]);
        ctx.globalAlpha = d.a * (0.5 + 0.5 * q.s);
        ctx.fillRect(xx - r / 2, y - r / 2, r, r);
      }
      ctx.globalAlpha = 1;
    }, {
      init(d) {
        pool(d, d.n, U.seeded(d.seed || 13));
      },
    }),
    // 熔岩瀑布往下流的亮紋
    flow: function (ctx, d, t, sx) {
      const falls = d.src._falls;
      if (!falls) return;
      ctx.globalCompositeOperation = 'lighter';
      for (const [fx, y0, y1, w0] of falls) {
        const w = w0 * 2;
        const x = TW * fx;
        if (sx + x < -60 || sx + x > G.W + 60) continue;
        const Y0 = G.H * y0;
        const Y1 = G.H * y1;
        for (let k = 0; k < 4; k++) {
          const ph = (t * 0.45 + k / 4 + fx * 3) % 1;
          const y = Y0 + ph * (Y1 - Y0);
          const ww = w * (0.35 + ph * 0.6);
          ctx.fillStyle = 'rgba(255,240,170,' + (0.5 * Math.sin(ph * Math.PI)).toFixed(3) + ')';
          ctx.fillRect(x - ww * 0.5 + Math.sin(k * 2.1) * ww * 0.3, y, 2, 16);
          ctx.fillRect(x + ww * 0.3 + Math.sin(k * 3.7) * ww * 0.2, y + 8, 1.5, 12);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    // 熱浪：把某一層靠近熔岩的那一段，切成細條左右輕晃再貼一次
    heat: function (ctx, d, t, sx, sy) {
      const L = cur.orig && cur.orig[d.src];
      if (!L || !L.canvas || L.canvas === d._tok) return;
      const img = L.canvas;
      const y0 = L.y0 || 0;
      const top = Math.max(0, G.H * d.y0 - y0);
      const bot = Math.min(img.height, G.H * d.y1 - y0);
      const sh = d.strip || 6;
      ctx.globalAlpha = d.a;
      for (let y = top; y < bot; y += sh * (d.gap || 1)) {
        const dx = Math.sin(t * (d.spd || 3.1) + y * (d.k || 0.09)) * d.amp + Math.sin(t * (d.spd || 3.1) * 0.55 + y * 0.031) * d.amp * 0.5;
        ctx.drawImage(img, 0, y, TW, sh, dx, y0 + y, TW, sh);
      }
      ctx.globalAlpha = 1;
    },
  });

  // 林子深處的燈火：照著層上記下的位置，輕輕搖曳
  FX.lights = function (ctx, d, t, sx) {
    const pts = d.src._lights;
    if (!pts) return;
    const img = glowSprite(agedRgb(d.rgb, cur));
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pts.length; i++) {
      const [x, y, r] = pts[i];
      if (sx + x < -r * 3 || sx + x > G.W + r * 3) continue;
      const k = 0.75 + 0.15 * Math.sin(t * 7 + i * 3.7) + 0.1 * Math.sin(t * 13.3 + i);
      ctx.globalAlpha = d.a * k;
      ctx.drawImage(img, x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  // 往上流的水：一段段亮紋沿著倒流的瀑布往上爬
  FX.upfall = function (ctx, d, t, sx) {
    const ups = d.src._ups;
    if (!ups) return;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < ups.length; i++) {
      const [x, yb, yt, w] = ups[i];
      if (sx + x < -w * 3 || sx + x > G.W + w * 3) continue;
      for (let k = 0; k < 6; k++) {
        const ph = (t * 0.22 + k / 6 + i * 0.37) % 1;
        const y = yb - ph * (yb - yt);
        const a = Math.sin(ph * Math.PI) * 0.55;
        ctx.fillStyle = rgba(d.rgb, a);
        const ox = Math.sin(k * 2.3 + i) * w * 0.5 * (1 - ph * 0.3);
        ctx.fillRect(x + ox - 1, y - 12, 2, 20);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  // 浪打在岩腳炸開的浪花：每塊礁岩輪流噴起幾團白霧與水珠
  FX.surf = function (ctx, d, t, sx) {
    const img = glowSprite(agedRgb('235,245,255', cur));
    ctx.fillStyle = 'rgba(240,248,255,0.85)';
    for (const src of d.srcs) {
      const list = src._surfs;
      if (!list) continue;
      for (let i = 0; i < list.length; i++) {
        const [x, b, w, hgt] = list[i];
        if (sx + x + w < 0 || sx + x - w > G.W) continue;
        for (let k = 0; k < 2; k++) {
          const ph = (t * (d.speed || 0.45) + k * 0.5 + i * 0.29 + x * 0.0007) % 1;
          if (ph > 0.7) continue;
          const u = ph / 0.7;
          const e = Math.sin(u * Math.PI);
          const px = x + (k ? 0.25 : -0.2) * w;
          const py = b - Math.sin(u * Math.PI * 0.5) * hgt * (d.rise || 0.55);
          const r = Math.min(70, w * (0.15 + u * 0.3));
          ctx.globalAlpha = 0.45 * e;
          ctx.drawImage(img, px - r, py - r * 0.8, r * 2, r * 1.6);
          ctx.globalAlpha = 0.9 * e;
          for (let q = 0; q < 6; q++) {
            const a = (q / 5 - 0.5) * 1.8;
            const dd = u * hgt * 0.5;
            ctx.fillRect(px + Math.sin(a) * dd * 0.8, b - Math.cos(a) * dd + u * u * hgt * 0.35, 2, 2);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  // 熔岩溝裡往下流的亮點
  FX.chan = function (ctx, d, t, sx) {
    const chans = d.src._chans;
    if (!chans) return;
    const img = glowSprite(agedRgb('255,210,120', cur));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,245,200,0.9)';
    for (let c = 0; c < chans.length; c++) {
      const pts = chans[c];
      const n = pts.length;
      for (let k = 0; k < 4; k++) {
        const ph = (t * 0.07 + k / 4 + c * 0.31) % 1;
        const p = pts[Math.floor(ph * (n - 1))];
        if (sx + p[0] < -20 || sx + p[0] > G.W + 20) continue;
        ctx.globalAlpha = 0.7 * Math.sin(ph * Math.PI);
        ctx.drawImage(img, p[0] - 9, p[1] - 9, 18, 18);
        ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  Object.assign(FX, {
    // 光之河上順流漂的羅馬數字與小齒輪
    glyphs(ctx, d, t, sx) {
      const list = d.src._streams;
      if (!list) return;
      const G2 = glyphSprites();
      for (let s = 0; s < list.length; s++) {
        const S = list[s];
        const n = d.n;
        for (let k = 0; k < n; k++) {
          const u = (t * S.speed + k / n + s * 0.13) % 1;
          const x = u * TW;
          if (sx + x < -30 || sx + x > G.W + 30) continue;
          const img = G2[(k * 5 + s * 3) % G2.length];
          const y = streamY(S, x) + Math.sin(t * 1.3 + k * 2.1) * 5 - img.height / 2;
          ctx.globalAlpha = 0.85 * Math.min(1, Math.sin(u * Math.PI) * 3);
          ctx.drawImage(img, x - img.width / 2, y);
        }
      }
      ctx.globalAlpha = 1;
    },
    // 像魚一樣游的鐘錶指針：沿著緩緩起伏的路線前進，身體跟著擺
    fish: Object.assign(function (ctx, d, t, sx) {
      for (const q of d.pts) {
        const sp = 18 + q.v * 22;
        const x = wrapN(q.x + t * sp, TW);
        if (sx + x < -60 || sx + x > G.W + 60) continue;
        const y = G.H * (d.y0 + (d.y1 - d.y0) * q.s) + Math.sin(t * 0.7 + q.p) * 22;
        const vy = Math.cos(t * 0.7 + q.p) * 22 * 0.7;
        const ang = Math.atan2(vy, sp) + Math.sin(t * 3 + q.p) * 0.12;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.globalAlpha = 0.8;
        const img = handSprite(q.v > 0.5 ? 1 : 0);
        ctx.drawImage(img, -32, -8);
        ctx.restore();
      }
    }, { init(d) { pool(d, d.n, U.seeded(d.seed || 41)); } }),
    // 橫流的沙
    sand(ctx, d, t, sx) {
      const pts = d.src._sand;
      if (!pts) return;
      ctx.fillStyle = 'rgba(250,225,160,0.9)';
      const n = pts.length - 1;
      for (let k = 0; k < 26; k++) {
        const u = (t * 0.12 + k / 26) % 1;
        const p = pts[Math.floor(u * n)];
        if (sx + p[0] < -10 || sx + p[0] > G.W + 10) continue;
        ctx.globalAlpha = 1 - u * 0.85;
        ctx.fillRect(p[0] + Math.sin(k * 7.1) * 3, p[1] + Math.sin(k * 3.3 + t) * (2 + u * 12), 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
    },
    // 被「空間的風」吹走的建築碎片：慢慢翻滾著橫越
    blown: Object.assign(function (ctx, d, t, sx) {
      const F = fragSprites();
      for (let i = 0; i < d.pts.length; i++) {
        const q = d.pts[i];
        const x = wrapN(q.x + t * (26 + q.v * 30), TW);
        if (sx + x < -40 || sx + x > G.W + 40) continue;
        const y = G.H * (d.y0 + (d.y1 - d.y0) * q.s) + Math.sin(t * 0.5 + q.p) * 30;
        const img = F[i % F.length];
        const sc = 0.6 + q.v * 0.6;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * (0.3 + q.v * 0.5) + q.p);
        ctx.globalAlpha = 0.75;
        ctx.drawImage(img, -img.width * sc / 2, -img.height * sc / 2, img.width * sc, img.height * sc);
        ctx.restore();
      }
    }, { init(d) { pool(d, d.n, U.seeded(d.seed || 43)); } }),
  });

  // ════════════════════════════════════════════════════════════
  // 第一章　古老的魔法森林
  // ════════════════════════════════════════════════════════════
  function forest(o) {
    const P = Object.assign({
      skyTop: '#07140f', skyMid: '#123a33', skyLow: '#3c7a6a',
      mist: '120,205,185', gold: '255,222,150',
      far: '#2f6c60', farHaze: '130,210,190',
      mid: '#1b4740', midLit: '#3a6f5a', midDark: '#0f2e29',
      near: '#0e2621', nearLit: '#35553c', nearDark: '#07130f',
      front: '#18201a', frontLit: '#3a4832', frontDark: '#0b110d', frontMoss: '70,110,70', barkHi: '150,170,120',
      canopy: '#0a1d18', canopy2: '#0e2620', canopyRim: '170,230,170',
      moss: '130,190,120', mossRgb: '90,140,105', leafRgb: '70,130,95',
      shroom: '110,240,220', shroom2: '190,255,150', shroomCap: '#1e4a52', stem: '#2e5a5a',
    }, o);
    const holes = P.holes || [[0.18, 0.06, 70], [0.47, 0.03, 95], [0.8, 0.07, 60]];
    const cb = P.canopyBase || 0.2;
    const rays = [];
    const fxRays = [];
    holes.forEach(([hx, hy, r], i) => {
      const ang = (P.rayAng || 0.32) + (i % 2 ? 0.05 : -0.04);
      rays.push([hx, cb * 0.55, ang, 1.15, r * 0.45, r * 1.9, 0.2]);
      rays.push([hx + 0.02, cb * 0.55, ang + 0.06, 1.0, r * 0.2, r * 0.9, 0.16]);
      if (i < 2) fxRays.push([hx, cb * 0.5, ang, 1.0, r * 1.3, 0.16, 0.3 + i * 0.07]);
    });
    // 效能：只用三張會動的大圖層（遠景合成一張、林冠與中景巨木一張、近景剪影一張），
    // 其他深度差都畫進同一張快取裡
    const layers = [
      // 遠景：霧裡的天光、細瘦的樹影、遠方的發光巨菇、一排較粗的巨木，還有從林冠縫隙斜照下來的光柱
      { type: 'stack', f: 0.02, of: [
        { type: 'mgSky', glows: [[0.5, 0.66, 900, P.mist, 0.55, 0.55], [0.18, 0.02, 420, P.gold, 0.35, 1], [0.5, 0.0, 380, P.gold, 0.3, 1], [0.82, 0.03, 360, P.gold, 0.28, 1]].concat(P.skyGlows || []) },
        { type: 'mgTrunks', n: 24, w: [14, 40], base: 0.74, color: P.far, lit: P.far, dark: P.far, lean: 0.3, roots: false, haze: P.farHaze, hazeA: [0.35, 0.72], fog: [0.45, 0.72, 0.95, P.mist, 0.55] },
      ].concat(P.farExtra || []).concat([
        { type: 'mgShrooms', items: P.shrooms || [[0.08, 0.76, 0.55, P.shroom], [0.36, 0.78, 0.35, P.shroom2], [0.62, 0.77, 0.7, P.shroom], [0.9, 0.78, 0.4, P.shroom2]], cap: P.shroomCap, stem: P.stem, haze: P.farHaze, hazeA: [0.18, 0.3] },
        { type: 'mgTrunks', n: 11, w: [36, 84], base: 0.82, color: P.mid, lit: P.midLit, dark: P.midDark, bark: 'rgba(0,20,15,0.3)', barkHi: P.barkHi, barkHiA: 0.6, knots: 1, rim: P.mist, rimA: 0.35, side: -1, moss: P.moss, limbs: 1, haze: P.farHaze, hazeA: [0.28, 0.42], fog: [0.62, 0.84, 1, P.mist, 0.45] },
      ]).concat(P.midExtra || []).concat([
        { type: 'mgRays', rays, rgb: P.gold },
      ]) },
      // 林冠（幾乎蓋住天空）與中景的古木：亮面有金色邊光與苔蘚，腳下沉進陰影
      { type: 'stack', f: 0.1, extendTop: true, of: [
        { type: 'mgCanopy', base: cb, amp: 46, color: P.canopy, color2: P.canopy2, rim: P.canopyRim, holes, rayRgb: P.gold, vines: 30, vineLen: [60, 280], vine: '#12302a', leaf: '#1d4a3a', moss: 9, mossLen: [60, 150], mossRgb: P.mossRgb, clumps: 110, leafRgb: P.leafRgb },
        { type: 'mgTrunks', n: 6, w: [80, 150], base: 0.93, color: P.near, lit: P.nearLit, dark: P.nearDark, bark: 'rgba(0,0,0,0.34)', barkHi: P.barkHi, rim: P.gold, rimA: 0.45, side: 1, moss: P.moss, knots: 2, limbs: 1, vines: 2, vine: '#10251f', leaf: '#1d3e30', haze: P.mist, hazeA: [0.1, 0.22], fog: [0.72, 0.9, 1, P.mist, 0.28], shadow: [0.8, 1, '3,10,8', 0.55] },
      ] },
      // 近景：幾乎全黑的巨大樹幹剪影
      { type: 'mgTrunks', f: 0.28, extendTop: true, n: 3, w: [150, 230], jit: 0.5, base: 1.04, color: P.front, lit: P.frontLit, dark: P.frontDark, bark: 'rgba(0,0,0,0.4)', barkHi: P.barkHi, barkHiA: 0.7, rim: P.gold, rimA: 0.32, side: 1, moss: P.frontMoss, knots: 2, limbs: 0, vines: 3, vine: '#0e1c14', leaf: '#1a3024' },
    ];
    return {
      sky: [P.skyTop, P.skyMid, P.skyLow],
      layers,
      fx: [
        { after: 0, f: 0.02, kind: 'rays', rgb: P.gold, rays: fxRays },
        { after: 1, f: 0.14, kind: 'motes', n: 24, rgb: P.shroom, rgb2: P.gold, size: [2, 6], a: 0.8, speed: 9, y0: 0.2, y1: 0.95, seed: 11 },
      ],
      beams: 0,
      motes: P.motes || 'rgba(190,255,215,0.85)',
      fgSpores: P.fgRgb || '200,255,215',
      mg: true,
    };
  }
  // 套用到主題上。整片蓋在畫面上的 tint（色調）與 dark（暗角）每格都是一次全螢幕填色，
  // 原本就有的主題才保留（換成新的顏色），原本沒有的不加，免得每格多花時間
  function apply(id, patch) {
    const th = THEMES[id];
    if (!th) return;
    const P = Object.assign({}, patch);
    P.tint = th.tint ? P.tint || th.tint : null;
    P.dark = th.dark ? P.dark || th.dark : 0;
    Object.assign(th, P);
  }

  apply('forestMorning', forest({ skyLow: '#4a8472', holes: [[0.14, 0.05, 80], [0.44, 0.02, 110], [0.76, 0.05, 90]], dark: 0.06 }));
  apply('forestMushroom', forest({
    skyTop: '#0a1216', skyMid: '#1a3440', skyLow: '#4a6e78', mist: '140,190,210',
    shrooms: [[0.06, 0.76, 0.9, '255,150,200', '#3a2a48'], [0.24, 0.78, 0.45, '120,230,255'], [0.44, 0.76, 1.05, '150,255,190', '#1e4a40'], [0.62, 0.78, 0.5, '255,190,120', '#4a3226'], [0.8, 0.77, 0.85, '120,230,255'], [0.95, 0.78, 0.4, '255,150,200', '#3a2a48']],
    midExtra: [{ type: 'mgShrooms', items: [[0.16, 0.9, 0.9, '255,160,210', '#2a1e34'], [0.7, 0.9, 1.1, '130,235,255', '#172e3a']], cap: '#172e3a', stem: '#20343a', haze: '60,110,120', hazeA: [0.15, 0.2] }],
  }));
  apply('forestDeep', forest({
    skyTop: '#040c0a', skyMid: '#0e2c26', skyLow: '#2c6252', canopyBase: 0.26, dark: 0.14, rayAng: 0.22,
    holes: [[0.3, 0.04, 70], [0.62, 0.06, 55]],
    farExtra: [{ type: 'landmarks', stone: '#2a5048', stoneShade: '#214239', vine: '#1d4034', dark: '#12261f', water: '#bff5e6', water2: 'rgba(170,240,220,0.4)', mist: '130,210,190', tree: ['#23473f'], trunk: '#1d3a33',
      items: [['ruinTower', 0.26, 0.74, 1.1], ['waterfall', 0.74, 0.76, 0.9, { stone: '#23463e', stoneShade: '#1b3832', moss: 'rgba(100,170,140,0.4)' }]], haze: '120,200,180', hazeA: [0.5, 0.45] }],
  }));
  // 根洞本來就是暗的魔法洞穴：保留原本的層，只加上漂浮孢子
  apply('rootCave', { mg: true, fx: [{ after: 2, f: 0.12, kind: 'motes', n: 22, rgb: '125,240,208', rgb2: '182,240,122', size: [2, 6], a: 0.75, speed: 7, y0: 0.15, y1: 0.95, seed: 5 }] });
  // 女王的殿堂：暮紫的林子，巨木之間透出城堡與發光巨菇
  apply('queenHall', forest({
    skyTop: '#0b0612', skyMid: '#201228', skyLow: '#4e2a4c', mist: '170,105,170', gold: '255,190,220', farHaze: '130,85,135',
    far: '#4a3050', mid: '#2e1c38', midLit: '#4e3458', midDark: '#1c1024', near: '#1a0f20', nearLit: '#402a44', nearDark: '#0c0610', front: '#1c1320', frontLit: '#3e2c40', frontDark: '#0e0810', frontMoss: '110,80,120', barkHi: '180,140,180',
    canopy: '#120a16', canopy2: '#1a1020', canopyRim: '230,170,220', moss: '170,120,170', mossRgb: '140,100,150', leafRgb: '120,80,130',
    shroom: '255,170,220', shroom2: '210,170,255', shroomCap: '#3a2244', stem: '#4a3450', motes: 'rgba(255,190,230,0.9)', fgRgb: '255,205,235',
    holes: [[0.5, 0.04, 120]], canopyBase: 0.16,
    farExtra: [{ type: 'landmarks', wall: '#3e2a4a', wallShade: '#32203e', roof: '#5a2e56', roofShade: '#4a2446', flag: '#c8a04a', frame: '#1e1024', dark: '#180c1e', win: '255,200,230', winC: '#ffd8ea',
      items: [['castle', 0.5, 0.74, 1.15]], haze: '150,100,150', hazeA: [0.4, 0.45], rim: { c: 'rgba(255,190,220,0.6)', dx: 0, dy: 3 } }],
  }));

  // ════════════════════════════════════════════════════════════
  // 第二章　暗色的魔法海岸：低壓的暴風雲、退到天邊的潮水、黑色玄武岩、沉船與古老的石柱
  // ════════════════════════════════════════════════════════════
  function coast(o) {
    const P = Object.assign({
      sky: ['#1a2638', '#3a5068', '#7890a4'],
      cloud: ['#2c3a4e', '#38485e', '#44566c', '#50647a'], cloudLit: '#7a90a6', cloudUnder: '#223044',
      mist: '150,175,198', haze: '96,122,146',
      rock: '#14191e', rockLit: '#262e36', rockDark: '#0c1014', rockTop: '#3a4650', wet: '170,210,230',
      lamp: '#fff4c8', lampRgb: '255,236,170',
      horizon: 0.46, lightning: 8, lighthouse: [0.66, 0.74, 0.95],
      breakX: 0.3,
    }, o);
    const hz = P.horizon;
    const surf = '235,245,255';
    const far = { type: 'mgBasalt', items: P.farStacks || [[0.1, hz + 0.05, 70, 170], [0.16, hz + 0.05, 40, 100], [0.46, hz + 0.06, 50, 80], [0.88, hz + 0.05, 80, 210]], rock: '#344454', rockLit: '#40526a', rockDark: '#2e3c4c', rockTop: '#56687a', col: 10, surf, surfY: 0, haze: P.haze, hazeA: [0.35, 0.3] };
    const mid = { type: 'mgBasalt', items: P.stacks || [[0.04, 0.8, 190, 360], [0.4, 0.82, 120, 200], [0.95, 0.8, 220, 420, { col: 20 }]], rock: P.rock, rockLit: P.rockLit, rockDark: P.rockDark, rockTop: P.rockTop, wet: P.wet, col: 17, surf, haze: P.haze, hazeA: [0.1, 0.16] };
    const near = { type: 'mgBasalt', f: 0.18, items: P.nearStacks || [[0.02, 1.0, 300, 560, { col: 24 }], [0.62, 1.0, 160, 280, { col: 22 }]], rock: '#0e1216', rockLit: '#1c242c', rockDark: '#080a0c', rockTop: '#2c3842', wet: '150,190,210', surf, surfY: 40 };
    const L1 = P.lighthouse;
    const lamp = { x: L1[0], y: L1[1] - (230 + 190 + 12) * L1[2] / G.H };
    const layers = [
      // 遠景：風暴的天（雲縫裡透下幾道冷光）、一直翻到天邊的深藍海、遠方的玄武岩柱
      { type: 'stack', f: 0.012, of: [
        { type: 'mgSky', glows: [[P.breakX, 0.22, 420, '220,232,242', 0.35, 0.7], [0.5, hz, 1000, '150,175,198', 0.4, 0.3]] },
        { type: 'mgStorm', y0: 0.0, y1: 0.3, rows: 4, r: [80, 150], step: 100, cols: P.cloud, lit: P.cloudLit, under: P.cloudUnder, rimRgb: '200,215,230', puffRgb: '140,160,180', slit: [hz - 0.14, hz - 0.03, hz, '190,208,222', 0.35] },
        { type: 'mgRays', rgb: '220,232,242', rays: [[P.breakX, 0.2, -0.12, 0.7, 20, 110, 0.14], [P.breakX + 0.04, 0.2, -0.05, 0.75, 14, 80, 0.12], [P.breakX + 0.09, 0.22, 0.05, 0.6, 10, 60, 0.1]] },
        { type: 'mgSea', y0: hz, y1: 0.66, rows: 7, amp: [2, 12], waves: [22, 9], face: '#3574a6', body: '#1a4c80', deep: '#10305a', litRgb: '190,220,245', foam: '240,248,255', mist: P.mist, mistA: 0.42, glint: [hz - 0.01, hz + 0.02, hz + 0.08, '210,228,240', 0.35] },
        far,
      ].concat(P.farExtra || []) },
      // 中景：近處滾來的大浪、浪打在黑色玄武岩柱上、岩上高高的燈塔
      { type: 'stack', f: 0.06, of: [
        { type: 'mgSea', y0: 0.58, y1: 1.0, rows: 6, amp: [12, 46], waves: [8, 3], face: '#2c6ea4', body: '#14467a', deep: '#0a2548', litRgb: '170,210,240', foam: '240,248,255', mist: P.mist, mistA: 0.28 },
      ].concat(P.midExtra || []).concat([
        mid,
        { type: 'mgLighthouse', x: L1[0], base: L1[1], s: L1[2], rockH: 230, towerH: 190, rock: '#12171c', rockLit: '#222a32', rockDark: '#0a0d10', rockTop: '#34404a', col: 16, tower: '#4e5862', towerLit: '#8894a0', stripe: 'rgba(24,30,38,0.75)', rail: '#2a3038', lamp: P.lamp, lampRgb: P.lampRgb, surf, wet: P.wet },
      ]) },
      // 近景：畫面邊上的黑色斷崖，浪在腳下碎開
      near,
    ];
    return {
      sky: P.sky,
      layers,
      fx: [
        { after: 0, f: 0.012, kind: 'lightning', rgb: '210,225,255', y0: 0.06, y1: 0.26, period: P.lightning, seed: P.seed || 1 },
        { after: 0, f: 0.012, kind: 'surf', srcs: [far], speed: 0.4, rise: 0.4 },
        { after: 1, f: 0.06, kind: 'heat', src: 1, y0: 0.62, y1: 0.76, amp: 5, a: 0.55, strip: 8, spd: 1.3, k: 0.035 },
        { after: 1, f: 0.06, kind: 'beam', x: lamp.x, y: lamp.y, len: 1000, a: 0.36, rgb: P.lampRgb, speed: 0.5, w: 1.3 },
        { after: 1, f: 0.06, kind: 'surf', srcs: [mid], speed: 0.45 },
        { after: 2, f: 0.18, kind: 'surf', srcs: [near], speed: 0.38, rise: 0.35 },
      ],
      beams: 0,
      gulls: 0,
      tint: ['rgba(60,90,130,0.04)', 'rgba(10,30,50,0.1)'],
      motes: 'rgba(225,240,250,0.8)',
      fore: { kind: 'weed', colors: ['#2a4640', '#3a5a4c'] },
      mg: true,
    };
  }
  // 燈塔的光束位置跟燈頭一致：燈頭在 base − (岩高 + 塔高 + 12)·s
  apply('coastCamp', coast({ seed: 2, lighthouse: [0.62, 0.72, 1.0], breakX: 0.22 }));
  apply('tidepool', coast({ seed: 3, lighthouse: [0.8, 0.74, 0.8], breakX: 0.4, stacks: [[0.06, 0.8, 170, 330], [0.34, 0.82, 110, 190], [0.56, 0.81, 150, 250]] }));
  apply('shipwreck', coast({ seed: 4, lighthouse: [0.9, 0.74, 0.75], breakX: 0.55,
    midExtra: [{ type: 'mgWreck', items: [[0.3, 0.8, 0.8, 0.12, false], [0.64, 0.74, 0.45, -0.1, true]], hull: '#141a20', plank: 'rgba(70,90,106,0.6)', hole: '#080c10', sail: 'rgba(110,128,140,0.7)', rim: '190,215,235' }] }));
  apply('reef', coast({ seed: 5, lightning: 6, lighthouse: [0.46, 0.74, 0.85], breakX: 0.7, stacks: [[0.1, 0.8, 210, 400], [0.28, 0.82, 110, 230], [0.7, 0.82, 150, 270], [0.86, 0.8, 230, 440, { col: 20 }]] }));
  apply('crabNest', coast({ seed: 6, lightning: 5, sky: ['#141828', '#323a58', '#6a7090'], cloud: ['#2a2e44', '#343850', '#40445c', '#4c5068'], cloudLit: '#727a96', cloudUnder: '#1e2034', lighthouse: [0.28, 0.74, 0.7], breakX: 0.6,
    midExtra: [{ type: 'mgPillars', items: [[0.18, 0.84, 1.1, 'gate', -0.02], [0.5, 0.86, 0.9, 'whole', 0.04], [0.78, 0.84, 1.0, 'broken', -0.07]], stone: '#262c38', stoneLit: '#38404e', crust: 'rgba(10,14,20,0.8)', rune: '120,200,255' }] }));

  // ════════════════════════════════════════════════════════════
  // 第三章　燃燒的峽谷：煙霧暗橘的天、被火光從下方照亮的雲、紅黑岩壁、熔岩河與熔岩瀑布
  // ════════════════════════════════════════════════════════════
  function canyon(o) {
    const P = Object.assign({
      sky: ['#0e0605', '#3a130b', '#8a3412'],
      glowRgb: '255,110,40',
      farFalls: [[0.16, 6, 0.46, 0.72], [0.47, 8, 0.42, 0.72], [0.8, 6, 0.48, 0.72]],
      midFalls: [],
      river: 0.72, ceil: 0, extraFar: [],
    }, o);
    const far = { type: 'mgCanyon', top: P.farTop || 0.46, amp: 40, towers: P.farTowers == null ? 6 : P.farTowers, towerH: [80, 200], colTop: '#260b0a', col: '#34100d', colLow: '#4a120e', strata: '255,120,80', glowY: 0.72, glowRgb: P.glowRgb, glowA: 0.4, rim: '255,150,80', rimA: 0.45, falls: P.farFalls, haze: '90,24,16', hazeA: [0.3, 0.12] };
    const mid = { type: 'mgCanyon', top: P.midTop || 0.56, amp: 50, towers: P.midTowers || 4, towerH: [120, 300], colTop: '#100606', col: '#220909', colLow: '#3e0c0a', strata: '255,90,60', glowY: 0.84, glowRgb: '255,70,30', glowA: 0.3, jag: 14, rim: '255,120,60', rimA: 0.4, falls: P.midFalls, towerFalls: P.towerFalls || [9, 12], fallY: 0.86, ceil: P.ceil ? P.ceil * 0.8 : 0, haze: '60,20,12', hazeA: [0.15, 0.05], fog: [0.66, 0.86, 1, '70,16,10', 0.3] };
    const layers = [
      // 遠景：濃煙、被火山光從下面照紅的雲底、被煙霧染淡的岩壁與熔岩瀑布、谷底的熔岩河
      { type: 'stack', f: 0.014, of: [
        { type: 'mgSky', glows: [[0.5, 0.8, 1100, P.glowRgb, 0.6, 0.45], [0.2, 0.7, 500, '255,160,60', 0.25, 0.6], [0.78, 0.72, 520, '255,90,30', 0.25, 0.6]] },
        { type: 'mgSmoke', n: 70, y0: -0.05, y1: 0.42, r: [120, 300], smoke: '26,12,10', a: 0.75, lit: '255,110,40', litA: 0.3 },
        // 最遠的一道稜線：幾乎溶進煙霧裡，只剩被火光擦亮的邊
        { type: 'mgCanyon', top: P.ridgeTop || 0.4, amp: 50, towers: P.farTowers == null ? 4 : P.farTowers, towerH: [60, 140], jag: 12, gullies: 6, cracks: 6, colTop: '#3a1612', col: '#44180f', colLow: '#5a1c10', strata: '255,140,90', glowY: 0.7, glowRgb: P.glowRgb, glowA: 0.3, rim: '255,160,90', rimA: 0.4, haze: '120,40,24', hazeA: [0.5, 0.35] },
      ].concat(P.volcano ? [P.volcano] : []).concat([
        far,
        { type: 'mgLavaRiver', y: P.river, th: 10, glowRgb: P.glowRgb, bank: '#1e0b07' },
      ]).concat(P.extraFar) },
      // 中景：高聳的岩壁，熔岩從岩塔頂上的缺口流下來，谷底一條較近的熔岩河
      { type: 'stack', f: 0.05, of: [mid, { type: 'mgLavaRiver', y: 0.83, th: 14, glowRgb: P.glowRgb, bank: '#160706' }] },
      // 近景：幾根黑色岩塔，底部被熔岩照紅
      { type: 'mgCanyon', f: 0.14, extendTop: true, top: 0.92, amp: 30, towers: 3, towerH: [420, 640], colTop: '#070303', col: '#0e0505', colLow: '#240808', strata: '255,70,40', glowY: 0.95, glowRgb: '255,70,30', glowA: 0.35, jag: 18, rim: '255,110,50', rimA: 0.3, cracks: 20, ceil: P.ceil, fog: [0.8, 1, 1, '20,6,4', 0.5] },
    ];
    return {
      sky: P.sky,
      layers,
      fx: [
        { after: 0, f: 0.014, kind: 'flow', src: far },
      ].concat(P.volcano ? [{ after: 0, f: 0.014, kind: 'chan', src: P.volcano }] : []).concat([
        { after: 1, f: 0.05, kind: 'flow', src: mid },
        { after: 1, f: 0.05, kind: 'heat', src: 1, y0: 0.76, y1: 0.86, amp: 2, a: 0.45, strip: 8 },
        { after: 1, f: 0.08, kind: 'motes', n: 30, rgb: '255,140,50', rgb2: '255,215,120', size: [1.5, 4.5], a: 0.95, speed: 34, y0: 0, y1: 1, seed: 17 },
        { after: 1, f: 0.1, kind: 'fall', n: 30, color: 'rgba(70,58,56,0.8)', size: [1.5, 3.5], a: 0.8, speed: 16, sway: 16, wind: 6, seed: 19 },
      ]),
      beams: 0,
      motes: 'rgba(255,170,90,0.9)',
      tint: ['rgba(255,90,30,0.03)', 'rgba(60,10,5,0.12)'],
      mg: true,
    };
  }
  apply('hotspringCamp', canyon({ towerFalls: [8], farFalls: [[0.2, 6, 0.48, 0.72], [0.86, 6, 0.46, 0.72]], midFalls: [[0.6, 10, 0.46, 0.84]],
    extraFar: [{ type: 'landmarks', wall: '#2a120c', wallShade: '#200d08', roof: '#1a0a08', roofShade: '#140806', stone: '#301610', win: '255,170,90', winC: '#ffc070', accent: '#6a2010', lantern: '#ff8a3a', gold: '#a8662a', smoke: 'rgba(120,70,60,0.5)',
      items: [['pagoda', 0.36, 0.66, 0.55, { tiers: 5, lantern: '#ff8a3a' }]], haze: '110,40,20', hazeA: [0.3, 0.3] }] }));
  apply('redRift', canyon({ farFalls: [[0.1, 7, 0.46, 0.72], [0.34, 9, 0.42, 0.72], [0.58, 7, 0.46, 0.72], [0.84, 8, 0.44, 0.72]], towerFalls: [11, 14, 10] }));
  apply('steamPass', canyon({ ceil: 0.1, towerFalls: [], farFalls: [[0.3, 6, 0.46, 0.72], [0.62, 7, 0.44, 0.72]], midFalls: [[0.14, 10, 0.3, 0.84], [0.5, 14, 0.28, 0.84], [0.86, 10, 0.34, 0.84]] }));
  apply('lavaBed', canyon({ sky: ['#0a0404', '#2a0c07', '#6a2410'], river: 0.7, dark: 0.16, farFalls: [[0.1, 7, 0.46, 0.7], [0.3, 6, 0.48, 0.7], [0.56, 8, 0.42, 0.7], [0.84, 7, 0.46, 0.7]], midFalls: [[0.2, 12, 0.36, 0.84], [0.5, 15, 0.34, 0.84], [0.8, 12, 0.4, 0.84]] }));
  apply('volcanoNest', canyon({ sky: ['#140606', '#4a160c', '#b04818'], towerFalls: [10], farTop: 0.62, ridgeTop: 0.58, farTowers: 2, midTop: 0.64, midTowers: 2,
    volcano: { type: 'mgVolcano', x: 0.5, base: 0.72, top: 0.2, w: 700, cw: 80, drift: 300, smokeH: 260, smoke: '78,58,54', colTop: '#2a0f0b', col: '#170806', strata: '255,120,70', glowRgb: '255,110,40',
      chans: [[-1, 0.55, 0.95, 18], [-1, 0.9, 0.8, 26], [1, 0.4, 1.0, 14], [1, 0.8, 0.75, 22], [1, 1.0, 0.9, 30]] } }));

  // ════════════════════════════════════════════════════════════
  // 第四章　雪山裡的松林：大小交錯的雪松一層層疊進霧裡，遠山若隱若現，林子深處幾點燈火
  // ════════════════════════════════════════════════════════════
  function snowwood(o) {
    const P = Object.assign({
      sky: ['#0c1230', '#27335e', '#5e6c98'],
      mist: '150,160,205', lampRgb: '255,190,110', lamp: '#ffd690',
      snowAmt: 0.8, extraSky: [], extraMid: [], extraFar: [],
    }, o);
    const pine = (o2) => Object.assign({ type: 'mgPines', trunk: '#161a30', lampRgb: P.lampRgb, lamp: P.lamp, stone: '#262c48' }, o2);
    const mid = pine({ base: 0.8, size: [130, 330], skew: 2.2, giant: 0.12, gap: [60, 150], spread: 40, color: '#1e2850', shade: 'rgba(40,30,90,0.5)', snow: '#96a2cc', snow2: '#a8b4da', trunk: '#12162c', ground: ['#8e9ac6', '#5a6698'], haze: P.mist, hazeA: [0.28, 0.18], lanterns: P.midLanterns || [[0.2, 1.1], [0.64, 0.9]], fog: [0.66, 0.84, 1, P.mist, 0.3] });
    const far = pine({ base: 0.7, size: [40, 130], skew: 1.6, giant: 0.1, gap: [16, 46], spread: 26, color: '#3e4a7c', shade: 'rgba(60,50,110,0.4)', snow: '#9eaad4', trunk: '#303a64', tierH: 22, ground: ['#8894c2', '#6c78aa'], haze: P.mist, hazeA: [0.5, 0.42], lanterns: P.farLanterns || [[0.08, 0.55], [0.37, 0.5], [0.52, 0.6], [0.86, 0.5]] });
    const layers = [
      // 遠景：陰沉的靛藍天空、幾乎被雪霧吞掉的遠山、密密麻麻的小松樹，深處有幾盞石燈籠
      { type: 'stack', f: 0.014, of: [
        { type: 'mgSky', glows: [[0.3, 0.12, 520, '170,185,235', 0.22, 0.6], [0.5, 0.62, 1000, '150,165,215', 0.4, 0.3]] },
      ].concat(P.extraSky).concat([
        { type: 'peaks', base: 0.6, w: [420, 640], hgt: [200, 320], gap: [0.45, 0.7], color: '#48558a', shade: '#3e4a7c', snow: '#8a98c8', snowShade: '#6a78aa', cap: 0.55, rim: 'rgba(200,210,245,0.35)', mist: P.mist, mistH: 150, mistA: 0.85 },
        far,
      ]).concat(P.extraFar) },
      // 中景：大小混雜的兩排雪松，枝上堆著雪
      { type: 'stack', f: 0.07, of: [
        pine({ base: 0.74, size: [70, 230], skew: 2, giant: 0.15, gap: [30, 90], spread: 34, color: '#2c3766', shade: 'rgba(50,40,100,0.45)', snow: '#aab6dc', trunk: '#1e2448', tierH: 26, ground: ['#8a96c4', '#6672a4'], haze: P.mist, hazeA: [0.36, 0.3] }),
      ].concat(P.extraMid).concat([mid]) },
      // 近景：粗大的暗色雪松，頂端被畫面切掉，中間夾著幾棵小的
      pine({ f: 0.2, extendTop: true, base: 0.98, size: [240, 520], skew: 1.2, giant: 0.55, gap: [170, 400], spread: 20, color: '#0e1230', shade: 'rgba(20,10,50,0.5)', snow: '#a4afd4', snow2: '#b8c2e2', trunk: '#0a0c1e', tierH: 44, wr: 0.42 }),
    ];
    return {
      sky: P.sky,
      layers,
      fx: [
        { after: 0, f: 0.014, kind: 'lights', src: far, rgb: P.lampRgb, a: 0.8 },
        { after: 0, f: 0.04, kind: 'fall', n: 56, color: 'rgba(225,232,255,0.8)', size: [1.2, 2.6], a: 0.8, speed: 20 * P.snowAmt + 8, sway: 12, wind: 4, seed: 23 },
        { after: 1, f: 0.07, kind: 'lights', src: mid, rgb: P.lampRgb, a: 0.9 },
        { after: 1, f: 0.14, kind: 'fall', n: 30, color: 'rgba(240,244,255,0.9)', size: [2.2, 4], a: 0.85, speed: 34 * P.snowAmt + 10, sway: 18, wind: 8, seed: 29 },
      ],
      beams: 0,
      motes: 'rgba(230,236,255,0.8)',
      tint: ['rgba(60,70,140,0.04)', 'rgba(20,20,60,0.12)'],
      mg: true,
    };
  }
  apply('snowCamp', snowwood({ sky: ['#10142e', '#2e3560', '#6a6c98'], midLanterns: [[0.12, 1.1], [0.42, 1.0], [0.7, 1.2], [0.9, 0.9]],
    extraFar: [{ type: 'landmarks', wall: '#2e2a4a', wallShade: '#26223e', roof: '#1a1830', stone: '#34304e', snow: '#aab2d8', bell: '#a88a4a', win: '255,190,120', winC: '#ffd890', lantern: '#ff9a5a', gold: '#b8904a',
      items: [['bellTower', 0.3, 0.7, 0.7], ['pagoda', 0.74, 0.7, 0.5, { tiers: 3 }]], haze: '150,160,205', hazeA: [0.45, 0.45] }] }));
  apply('snowField', snowwood({}));
  apply('iceFall', snowwood({ sky: ['#070c22', '#18264e', '#3e5a8a'], mist: '120,150,200', dark: 0.12,
    extraSky: [{ type: 'stars', n: 120, colors: ['#ffffff', '#cfefff'], cons: 0, line: 'rgba(0,0,0,0)' }, { type: 'aurora', bands: [[0.1, 18, '110,255,200', 0.35], [0.16, 24, '140,170,255', 0.25]], hgt: 0.16 }],
    extraMid: [{ type: 'icefall', top: 0.42, base: 0.8, color: '#2c3c66', shade: '#22305a', falls: [[0.5, 150]], ice: ['#dff4ff', '#8cc8ec', '#4a86bc'], snow: '#b8c8ea', glowRgb: '140,210,255' }] }));
  apply('bellShrine', snowwood({ sky: ['#140f2c', '#34285a', '#7a5e8a'], mist: '170,150,200', lampRgb: '255,170,100',
    midLanterns: [[0.1, 1.2], [0.3, 1.0], [0.5, 1.3], [0.7, 1.0], [0.9, 1.2]],
    extraMid: [{ type: 'torii', base: 0.76, s: 0.7, n: 3, color: '#4a2240', shade: '#3a1a34', cap: '#1e1428', snow: '#c8bcd8', bell: '#a88a4a', bellShade: '#7a6038', cord: '#5a2a40', rows: 2, alpha: 0.85 }] }));
  apply('frostAltar', snowwood({ sky: ['#050818', '#121e44', '#34487a'], mist: '100,130,190', dark: 0.16, snowAmt: 1.2,
    extraSky: [{ type: 'moon', x: 0.26, y: 0.2, r: 56, color: '#dfe8ff', spot: 'rgba(150,170,215,0.35)', limb: 'rgba(110,130,190,0.5)', glowRgb: '160,190,255', glowA: 0.4 }],
    extraMid: [{ type: 'altar', x: 0.42, base: 0.8, s: 0.9, stone: '#3a4a74', stoneShade: '#2e3c62', top: '#8ea4cc', snow: '#b8c8e8', ice: ['#dff4ff', '#7ab8e0', '#3a78b0'], glowRgb: '130,200,255', ground: '#2a365e', groundShade: '#222c50' }] }));

  // ════════════════════════════════════════════════════════════
  // 終章　時空神殿：深紫與靛藍的虛空、現實的裂縫透出星空、慢慢轉的星盤、
  // 漂浮的幾何碎片與沒有柱子的拱門、通往虛空的階梯、往上流的瀑布
  // ════════════════════════════════════════════════════════════
  function temple(o) {
    const P = Object.assign({
      sky: ['#05041a', '#171040', '#34205a'],
      haze: '60,40,110', glowRgb: '255,220,160',
      stone: { lit: '#bdb2dc', mid: '#7c70a8', dark: '#3e3470', goldRgb: '232,196,110' },
      rifts: [[0.2, 0.2, 260, 0.5, 26], [0.66, 0.12, 200, -0.3, 20], [0.9, 0.42, 160, 1.1, 16]],
      astro: [[0.42, 0.28, 200, 0.03], [0.86, 0.16, 110, -0.05]],
      far: [[0.08, 0.36, 0.4, 'cube', 0.1], [0.3, 0.44, 0.45, 'ring', -0.1], [0.55, 0.36, 0.35, 'shard', 0.4], [0.74, 0.46, 0.45, 'stairs', 0], [0.94, 0.3, 0.35, 'arch', 0.2]],
      mid: [[0.16, 0.52, 0.8, 'arch', -0.08], [0.46, 0.5, 0.7, 'stairs', 0, true], [0.7, 0.4, 0.6, 'door', 0.12], [0.9, 0.56, 0.7, 'cube', -0.2]],
      ups: [[0.28, 0.8, 0.28, 16], [0.62, 0.82, 0.34, 12]],
      // 綢帶：[y, 起伏, 頻率, 寬]；光之河：[y, 起伏, 頻率, 流速]
      silk: [[0.14, 30, 2, 46], [0.36, 22, 3, 30]], silkBand: [0.1, 0.24],
      streams: [[0.26, 40, 2, 0.02], [0.5, 26, 3, -0.015]],
      glass: { x: 0.12, y: 0.42, s: 0.6, rot: -0.35, len: 520 },
      extra: [],
    }, o);
    const S = P.stone;
    const streams = { type: 'mgStreams', items: P.streams, glowRgb: '200,180,255' };
    const glass = Object.assign({ type: 'mgSandglass' }, P.glass);
    const up = { type: 'mgUpfalls', items: P.ups, water: '210,225,255', pool: 'rgba(170,190,255,0.5)', glowRgb: '170,190,255', haze: P.haze, hazeA: [0.15, 0.2] };
    const layers = [
      // 虛空：稀疏的星、淡淡的星雲、幾道現實的裂縫
      { type: 'stack', f: 0.004, of: [
        { type: 'mgSky', glows: [[0.5, 0.7, 900, '90,60,160', 0.35, 0.4], [0.3, 0.2, 500, '120,80,200', 0.18, 0.7]] },
        { type: 'stars', n: 160, colors: ['#ffffff', '#d8d0ff', '#ffe8c8'], cons: 2, line: 'rgba(200,190,255,0.25)' },
        { type: 'nebula', n: 3, colors: ['110,70,200', '60,80,190', '170,90,190'], y0: 0.1, y1: 0.6 },
        { type: 'mgRifts', items: P.rifts, core: '#f4f0ff', inner: '#8a7ae0', outer: '#241a5a', nebula: ['160,120,255', '120,200,255', '255,160,220'], edgeRgb: '255,230,170', haloRgb: '150,120,255' },
        // 天上慢慢轉的星盤（外環畫進快取，只有內圈的渾天儀在轉）
        { type: 'mgAstrolabes', items: P.astro, lineRgb: '240,215,150', glowRgb: '200,170,255', alpha: 0.5 },
        // 星空的綢帶（像風吹過的絲）與空中的光之河：跟天空畫在同一張圖上，不多一張全螢幕的貼圖
        { type: 'mgSilk', items: P.silk },
        streams,
      ] },
      // 遠方漂浮的碎片（被紫色的虛空吞掉一半）
      // 遠方漂浮的碎片（被紫色的虛空吞掉一半）
      { type: 'mgFragments', f: 0.025, items: P.far, lit: S.lit, mid: S.mid, dark: S.dark, goldRgb: S.goldRgb, glowRgb: P.glowRgb, glowA: 0.08, haze: P.haze, hazeA: [0.5, 0.5] },
      // 往上流的瀑布＋中景的拱門、階梯、門框
      { type: 'stack', f: 0.05, of: [up].concat(P.extra).concat([
        glass,
        { type: 'mgFragments', items: P.mid, lit: S.lit, mid: S.mid, dark: S.dark, goldRgb: S.goldRgb, glowRgb: P.glowRgb, glowA: 0.1, haze: P.haze, hazeA: [0.28, 0.32] },
      ]) },
      // 近景：大塊的暗色碎片，只有金邊
      { type: 'mgFragments', f: 0.13, items: P.near || [[0.1, 0.84, 1.6, 'cube', 0.05], [0.58, 0.9, 1.8, 'arch', 0.04], [0.86, 0.78, 1.3, 'shard', -0.3]], lit: '#3a3264', mid: '#2a2250', dark: '#181236', goldRgb: '232,196,110', glowRgb: '150,120,255', glowA: 0.06 },
    ];
    return {
      sky: P.sky,
      layers,
      fx: [
        { after: 0, f: 0.004, kind: 'heat', src: 0, y0: P.silkBand[0], y1: P.silkBand[1], amp: 3, a: 0.5, strip: 6, gap: 3, spd: 0.9, k: 0.02 },
        { after: 0, f: 0.004, kind: 'glyphs', src: streams, n: 7 },
        { after: 1, f: 0.035, kind: 'fish', n: 3, y0: 0.2, y1: 0.55, seed: 41 },
        { after: 2, f: 0.05, kind: 'upfall', src: up, rgb: '230,240,255' },
        { after: 2, f: 0.05, kind: 'sand', src: glass },
        { after: 2, f: 0.09, kind: 'blown', n: 3, y0: 0.15, y1: 0.6, seed: 43 },
        { after: 2, f: 0.08, kind: 'motes', n: 10, rgb: '230,220,255', rgb2: '255,220,150', size: [1.5, 4], a: 0.8, speed: 10, y0: 0, y1: 1, seed: 31 },
      ],
      beams: 0,
      motes: 'rgba(230,220,255,0.85)',
      tint: ['rgba(90,60,180,0.04)', 'rgba(20,10,50,0.12)'],
      mg: true,
    };
  }
  apply('templeCourt', temple({
    extra: [{ type: 'temple', x: 0.44, base: 0.6, s: 0.8, isles: 0, rock: '#3e3468', rockShade: '#30285a', marble: '#b8aed8', marbleShade: '#8a80b4', inner: '#4a4078', gold: '#d8b060', top: '#c8c0e4', glowRgb: '255,210,150', glowA: 0.25 }] }));
  apply('timeCorridor', temple({ astro: [[0.25, 0.24, 170, -0.02], [0.72, 0.3, 220, 0.014]],
    extra: [{ type: 'arches', top: 0.12, spring: 0.5, aw: 246, n: 5, marble: '#6c6098', shade: '#4e4478', dark: '#2e2656', gold: '#c8a050', glowRgb: '200,170,255' }] }));
  apply('reverseGarden', temple({ ups: [[0.14, 0.82, 0.2, 18], [0.4, 0.84, 0.3, 14], [0.66, 0.82, 0.16, 20], [0.9, 0.84, 0.32, 12]],
    mid: [[0.26, 0.4, 0.7, 'arch', Math.PI, false], [0.52, 0.46, 0.6, 'stairs', 0, true], [0.8, 0.36, 0.6, 'ring', 0.3]],
  }));
  apply('starStair', temple({ sky: ['#030312', '#0e0c30', '#261a50'], dark: 0.1,
    rifts: [[0.14, 0.18, 300, 0.3, 30], [0.5, 0.1, 220, -0.2, 22], [0.78, 0.3, 260, 0.9, 26], [0.36, 0.5, 140, -0.6, 14]],
    far: [[0.1, 0.4, 0.5, 'stairs', 0], [0.34, 0.3, 0.4, 'stairs', 0, true], [0.6, 0.42, 0.5, 'stairs', 0.1], [0.84, 0.34, 0.4, 'cube', 0]],
    mid: [[0.2, 0.5, 0.9, 'stairs', 0], [0.52, 0.42, 0.7, 'door', 0], [0.82, 0.48, 0.9, 'stairs', 0, true]], ups: [[0.66, 0.82, 0.3, 12]] }));
  // 時之王座：保留原本的鐘面、王座、石獅，後面加上裂縫與碎片，整體壓暗
  apply('timeThrone', { mg: true,
    layers: [
      { type: 'stack', f: 0.01, of: [
        { type: 'stars', n: 200, colors: ['#ffffff', '#e0d0ff', '#ffe0c0'], cons: 2, line: 'rgba(220,190,255,0.25)' },
        { type: 'nebula', n: 3, colors: ['120,60,200', '200,110,90', '80,70,200'], y0: 0.1, y1: 0.7 },
        { type: 'mgRifts', items: [[0.12, 0.2, 240, 0.6, 24], [0.82, 0.14, 200, -0.4, 20], [0.94, 0.5, 150, 1.2, 14]], core: '#f4f0ff', inner: '#9a7ae0', outer: '#2a1a5a', nebula: ['190,120,255', '255,170,140'], edgeRgb: '255,220,150', haloRgb: '170,110,255' },
      ] },
      THEMES.timeThrone.layers[3],
      { type: 'mgFragments', f: 0.02, items: [[0.06, 0.5, 0.4, 'arch', 0.2], [0.26, 0.3, 0.3, 'shard', -0.4], [0.62, 0.22, 0.35, 'cube', 0.1], [0.94, 0.62, 0.4, 'stairs', 0, true]], lit: '#a89ccc', mid: '#6c6098', dark: '#342a62', goldRgb: '232,196,110', glowRgb: '255,210,150', glowA: 0.08, haze: '50,30,90', hazeA: [0.5, 0.5] },
    ].concat(THEMES.timeThrone.layers.slice(4)),
    fx: [{ after: 2, f: 0.04, kind: 'motes', n: 22, rgb: '230,210,255', rgb2: '255,215,150', size: [1.5, 4], a: 0.8, speed: 9, y0: 0, y1: 1, seed: 37 }],
  });

  // ── 第一章：畫在角色前面、非常稀疏的大顆孢子（柔光、半透明，慢慢飄） ──
  const fgPts = [];
  {
    const r = U.seeded(4242);
    for (let i = 0; i < 7; i++) fgPts.push({ x: r() * (G.W + 400), y: r() * G.H, p: r() * PI2, v: r(), s: r() });
  }
  const baseAtmo = A.drawAtmosphere;
  A.drawAtmosphere = function (ctx, map, cam, t) {
    baseAtmo.apply(this, arguments);
    const th = map && map._theme;
    if (!th || !th.fgSpores) return;
    const aged = !!map._aged;
    const n = aged ? 3 : fgPts.length;
    const img = glowSprite(aged ? agedRgb(th.fgSpores, { aged, map }) : th.fgSpores);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const span = G.W + 400;
    for (let i = 0; i < n; i++) {
      const q = fgPts[i];
      const x = wrapN(q.x - cam.x * 1.25 + t * (6 + q.v * 8), span) - 200 + Math.sin(t * 0.3 + q.p) * 30;
      const y = wrapN(q.y - cam.y * 1.1 - t * (5 + q.v * 6), G.H + 200) - 100;
      const r = 14 + q.s * 16;
      ctx.globalAlpha = 0.16 + 0.1 * Math.sin(t * 0.8 + q.p * 3);
      ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  };

  // ════════════════════════════════════════════════════════════
  // 標題畫面的星楓樹：取代原本平塗的卡通樹。樹幹有樹皮紋、根、苔、邊光；
  // 樹冠是一層層葉團（背光的深、迎光的亮、上緣一圈金色邊光）。整棵樹畫進快取，
  // 每格只貼一次圖，再畫五片星楓葉（拿到的會發光，跟存檔進度一致）
  // ════════════════════════════════════════════════════════════
  const TREE_LEAVES = [[-120, -360], [104, -352], [-26, -448], [62, -268], [-8, -330]];
  function starTreeCanvas(bloom) {
    const key = 'startree:' + (bloom ? 1 : 0);
    if (sprites[key]) return sprites[key];
    const W = 560;
    const H = 560;
    const c = newCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.translate(W / 2, H - 30);
    const r = U.seeded(2025);
    const pal = bloom
      ? { dark: [52, 22, 40], mid: [120, 58, 90], lit: [220, 140, 176], rim: '255,214,228' }
      : { dark: [14, 34, 24], mid: [36, 70, 44], lit: [84, 126, 66], rim: '200,220,130' };
    // 後面一圈淡淡的光（樹是這個世界的時鐘）
    glow(ctx, 0, -340, 260, bloom ? '255,190,220' : '220,240,170', 0.16, 0.8);
    // 樹幹與往上分開的三根主枝
    const trunk = { top: -250, color: '#2e2418', lit: '#5a4630', dark: '#161008', bark: 'rgba(0,0,0,0.4)', barkHi: '190,170,130', rim: '255,220,150', rimA: 0.45, side: -1, moss: '90,130,70', knots: 1, limbs: 0, lean: 0.2 };
    for (const [ex, ey, w0] of [[-130, -330, 20], [16, -380, 22], [136, -318, 18]]) {
      ctx.strokeStyle = trunk.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = w0;
      ctx.beginPath();
      ctx.moveTo(0, -210);
      ctx.quadraticCurveTo(ex * 0.3, -250, ex, ey);
      ctx.stroke();
      ctx.strokeStyle = rgba('255,220,150', 0.3);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-w0 * 0.4, -214);
      ctx.quadraticCurveTo(ex * 0.3 - w0 * 0.4, -254, ex - w0 * 0.3, ey);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    drawTrunk(ctx, 0, 0, 46, trunk, U.seeded(77), 1);
    // 樹冠：一團團葉簇，由後往前畫；每片小葉的明暗看它在葉團裡的位置（光從左上來）
    const clusters = [];
    for (let k = 0; k < 22; k++) {
      const a = r() * PI2;
      const d = Math.sqrt(r());
      clusters.push([Math.cos(a) * 190 * d, -350 + Math.sin(a) * 110 * d, 60 + r() * 50, r()]);
    }
    clusters.sort((a, b) => a[3] - b[3]);
    const mixc = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
    clusters.forEach(([cx, cy, R, depth]) => {
      const front = 0.35 + depth * 0.65;
      // 葉團底下的陰影
      glow(ctx, cx + 10, cy + R * 0.35, R * 1.1, '0,0,0', 0.25, 0.6);
      for (let i = 0; i < 150; i++) {
        const a = r() * PI2;
        const d = Math.sqrt(r()) * R;
        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d * 0.8;
        const lt = Math.max(0, Math.min(1, 0.55 - ((x - cx) * 0.55 + (y - cy) * 0.85) / (R * 1.6)));
        const t0 = lt * front;
        ctx.fillStyle = t0 < 0.5 ? mixc(pal.dark, pal.mid, t0 * 2) : mixc(pal.mid, pal.lit, (t0 - 0.5) * 2);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(r() * PI2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 7 + r() * 5, 3 + r() * 2, 0, 0, PI2);
        ctx.fill();
        ctx.restore();
        // 迎光的葉緣
        if (t0 > 0.72 && r() < 0.5) {
          ctx.fillStyle = rgba(pal.rim, 0.55);
          ctx.beginPath();
          ctx.ellipse(x - 1, y - 1, 3, 1.4, r() * 3, 0, PI2);
          ctx.fill();
        }
      }
    });
    // 從樹冠垂下的幾串葉子
    for (let k = 0; k < 14; k++) {
      const x = (r() - 0.5) * 360;
      const y0 = -300 + r() * 70;
      const len = 30 + r() * 60;
      ctx.strokeStyle = mixc(pal.dark, pal.mid, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.quadraticCurveTo(x + 6, y0 + len * 0.5, x + 2, y0 + len);
      ctx.stroke();
      for (let q = 0; q < 5; q++) {
        ctx.fillStyle = mixc(pal.dark, pal.lit, 0.3 + r() * 0.3);
        ctx.beginPath();
        ctx.ellipse(x + 3, y0 + (len * q) / 5 + 4, 4, 2, 0.6, 0, PI2);
        ctx.fill();
      }
    }
    sprites[key] = c;
    return c;
  }
  A.drawStarTreeArt = function (ctx, x, y, got, t) {
    const n = Object.keys(got).length;
    const img = starTreeCanvas(n >= 5);
    ctx.drawImage(img, x - img.width / 2, y - img.height + 30);
    ctx.save();
    ctx.translate(x, y);
    [1, 2, 3, 4, 5].forEach((ch, i) => {
      const [lx, ly] = TREE_LEAVES[i];
      const on = got[ch];
      const col = G.data.story.chapters[ch].leaf.color;
      const yy = ly + Math.sin(t * 1.5 + i) * 2;
      if (on) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55 + Math.sin(t * 2 + i) * 0.2;
        ctx.drawImage(glowSprite('255,245,200'), lx - 34, yy - 34, 68, 68);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(lx, yy);
      ctx.rotate(Math.sin(t * 0.8 + i * 2) * 0.12);
      ctx.globalAlpha = on ? 1 : 0.4;
      ctx.fillStyle = on ? col : '#1a2a1c';
      ctx.strokeStyle = on ? 'rgba(255,245,210,0.9)' : 'rgba(150,180,120,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      A.mapleLeafPath(ctx, 0, 0, 11);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  };
  // 標題畫面的地面：暗色的林床，上緣一排細草與幾顆石頭（取代原本平塗的綠條與土色塊）
  A.drawTitleGround = function (ctx) {
    let c = sprites.titleGround;
    if (!c) {
      c = sprites.titleGround = newCanvas(G.W, 160);
      const x = c.getContext('2d');
      const r = U.seeded(99);
      const g = x.createLinearGradient(0, 20, 0, 160);
      g.addColorStop(0, '#223a26');
      g.addColorStop(0.3, '#18261a');
      g.addColorStop(1, '#0c120c');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(0, 160);
      for (let k = 0; k <= G.W; k += 16) x.lineTo(k, 20 + Math.sin(k * 0.013) * 3 + r() * 2);
      x.lineTo(G.W, 160);
      x.fill();
      for (let k = 0; k < 40; k++) {
        const sx = r() * G.W;
        const sy = 50 + r() * 100;
        x.fillStyle = 'rgba(80,100,80,' + (0.15 + r() * 0.2).toFixed(2) + ')';
        x.beginPath();
        x.ellipse(sx, sy, 6 + r() * 16, 3 + r() * 6, 0, 0, PI2);
        x.fill();
      }
      for (let k = 0; k < 700; k++) {
        const bx = r() * G.W;
        const hh = 5 + r() * 14;
        const lean = (r() - 0.5) * 8;
        x.strokeStyle = r() < 0.3 ? '#5a8a4a' : r() < 0.6 ? '#3a6038' : '#28482a';
        x.lineWidth = 1 + r();
        x.beginPath();
        x.moveTo(bx, 24);
        x.quadraticCurveTo(bx + lean * 0.3, 24 - hh * 0.6, bx + lean, 24 - hh);
        x.stroke();
      }
    }
    ctx.drawImage(c, 0, G.H - 160);
  };

  // 葉團：一團團由幾百片小葉組成的樹冠（光從左上來，背光深、迎光亮、上緣有淡金邊光）。
  // 給營地樹屋這類前景建築的樹冠用，取代平塗的綠色雲朵；front=false 是後面較暗的一層
  A.leafMass = function (ctx, list, front) {
    const r = U.seeded(list.length * 131 + (front ? 7 : 3));
    const dark = front ? [34, 66, 38] : [18, 40, 26];
    const mid = front ? [62, 104, 56] : [36, 70, 42];
    const lit = front ? [120, 160, 82] : [70, 108, 62];
    const mixc = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
    for (const [cx, cy, R] of list) {
      glow(ctx, cx + 6, cy + R * 0.4, R * 1.1, '0,0,0', front ? 0.2 : 0.3, 0.6);
      const n = Math.round(R * R * 0.09) + 30;
      for (let i = 0; i < n; i++) {
        const a = r() * PI2;
        const d = Math.sqrt(r()) * R;
        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d * 0.85;
        const t0 = Math.max(0, Math.min(1, 0.55 - ((x - cx) * 0.55 + (y - cy) * 0.85) / (R * 1.6)));
        ctx.fillStyle = t0 < 0.5 ? mixc(dark, mid, t0 * 2) : mixc(mid, lit, (t0 - 0.5) * 2);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(r() * PI2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5 + r() * 3, 2.2 + r() * 1.2, 0, 0, PI2);
        ctx.fill();
        ctx.restore();
        if (front && t0 > 0.75 && r() < 0.4) {
          ctx.fillStyle = 'rgba(220,230,150,0.5)';
          ctx.beginPath();
          ctx.ellipse(x - 1, y - 1, 2.2, 1, r() * 3, 0, PI2);
          ctx.fill();
        }
      }
    }
  };
})();
