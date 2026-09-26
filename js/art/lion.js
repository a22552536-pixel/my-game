// 主角小獅子。原點在腳底中央，面向右邊；左右翻轉由呼叫端處理。
// 進化形態由 G.data.forms[形態].look 決定：鬃毛形狀、體型、尾巴、配色都可以換。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;

  const BASE = {
    pal: {
      body: '#f7b547',
      bodyShade: '#e0913a',
      mane: '#d9722a',
      maneShade: '#b95a1e',
      cream: '#ffe6b0',
      ear: '#ffb3a3',
      tuft: '#e8452b',
      tuftShade: '#bf331c',
      nose: '#5a2f22',
      farLeg: '#d99a3c',
      farLegShade: '#c07d2e',
      glow: '#ffffff',
    },
    scale: 1,
    bodyRx: 21,
    bodyRy: 14,
    legW: 10,
    legLen: 15,
    mane: 'bumps',
    tail: 'tuft',
    ears: 'round',
  };
  const COL = BASE.pal;

  const cache = {};
  function lookOf(formId) {
    if (cache[formId]) return cache[formId];
    const f = G.data.forms && G.data.forms[formId];
    const lk = (f && f.look) || {};
    const L = Object.assign({}, BASE, lk);
    L.pal = Object.assign({}, BASE.pal, lk.pal || {});
    cache[formId] = L;
    return L;
  }
  A.lionLook = lookOf;

  function leg(ctx, x, y, lift, fill, shade, w, len) {
    w = w || 10;
    len = len || 15;
    A.shape(ctx, (c) => A.roundRect(c, x - w / 2, y - len - lift, w, len, w / 2), fill, shade, { shadeY: y - 5 - lift, lw: 2.5 });
  }

  // ════════ 鬃毛 ════════
  function ringPath(c, cx, cy, r, bumps, bulge) {
    for (let i = 0; i <= bumps; i++) {
      const a = (i / bumps) * Math.PI * 2;
      const rr = r + (i % 2 ? 3 : 0);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) c.moveTo(x, y);
      else {
        const am = ((i - 0.5) / bumps) * Math.PI * 2;
        c.quadraticCurveTo(cx + Math.cos(am) * (rr + (bulge || 8)), cy + Math.sin(am) * (rr + (bulge || 8)), x, y);
      }
    }
    c.closePath();
  }
  function ring(ctx, cx, cy, r, bumps, L, col, shade) {
    A.shape(ctx, (c) => ringPath(c, cx, cy, r, bumps), col || L.pal.mane, shade || L.pal.maneShade, { cel: [4, 4] });
  }
  // 固定亂數，讓岩塊每次長得一樣
  function jit(i, k) {
    return Math.sin(i * 12.9898 + k * 78.233) * 0.5 + 0.5;
  }
  function star(c, x, y, r1, r2, n, rot) {
    for (let i = 0; i <= n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2;
      const r = i % 2 ? r2 : r1;
      i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }

  const MANE = {
    bumps(ctx, cx, cy, L) {
      ring(ctx, cx, cy, 23, 12, L);
    },
    // 岩鬃獅：一塊塊圓鈍的岩石
    rock(ctx, cx, cy, L) {
      ring(ctx, cx, cy, 18, 10, L, L.pal.maneShade, U.mix(L.pal.maneShade, '#000000', 0.2));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const r = 19 + jit(i, 1) * 3;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const s = 8.5 + jit(i, 2) * 3;
        A.shape(ctx, (c) => {
          for (let k = 0; k < 6; k++) {
            const b = a + (k / 6) * Math.PI * 2;
            const rr = s * (0.75 + jit(i, k + 3) * 0.35);
            k ? c.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr) : c.moveTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr);
          }
          c.closePath();
        }, L.pal.mane, L.pal.maneShade, { cel: [2.5, 2.5], lw: 2.3, hl: false });
      }
    },
    // 鋼鬃獅：往後張開的鋼板
    plates(ctx, cx, cy, L) {
      const angs = [-1.2, -1.75, -2.25, -2.75, 3.0, 2.55, 2.1];
      angs.forEach((a, i) => {
        const len = 30 + (i === 2 || i === 3 ? 6 : 0);
        const bx = cx + Math.cos(a) * 10;
        const by = cy + Math.sin(a) * 10;
        const tx = cx + Math.cos(a - 0.12) * len;
        const ty = cy + Math.sin(a - 0.12) * len;
        const nx = -Math.sin(a) * 7;
        const ny = Math.cos(a) * 7;
        A.shape(ctx, (c) => {
          c.moveTo(bx - nx, by - ny);
          c.quadraticCurveTo((bx + tx) / 2 - nx * 1.2, (by + ty) / 2 - ny * 1.2, tx, ty);
          c.quadraticCurveTo((bx + tx) / 2 + nx * 0.9, (by + ty) / 2 + ny * 0.9, bx + nx, by + ny);
          c.closePath();
        }, L.pal.mane, L.pal.maneShade, { cel: [2, 2], lw: 2.3, hl: false });
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(bx + (tx - bx) * 0.25 - nx * 0.3, by + (ty - by) * 0.25 - ny * 0.3);
        ctx.lineTo(bx + (tx - bx) * 0.7 - nx * 0.25, by + (ty - by) * 0.7 - ny * 0.25);
        ctx.stroke();
      });
      ring(ctx, cx, cy, 17, 10, L);
    },
    // 山王獅：三座積雪的山峰
    peaks(ctx, cx, cy, L) {
      [[-2.0, 34, 13], [-1.45, 40, 15], [-2.55, 30, 12]].forEach(([a, h, w]) => {
        const bx = cx + Math.cos(a) * 12;
        const by = cy + Math.sin(a) * 12;
        const tx = cx + Math.cos(a) * h;
        const ty = cy + Math.sin(a) * h;
        const nx = -Math.sin(a) * w;
        const ny = Math.cos(a) * w;
        const peak = (c) => {
          c.moveTo(bx - nx, by - ny);
          c.lineTo(tx, ty);
          c.lineTo(bx + nx, by + ny);
          c.closePath();
        };
        A.shape(ctx, peak, L.pal.mane, L.pal.maneShade, { cel: [3, 1], lw: 2.4, hl: false });
        const sx = bx + (tx - bx) * 0.62;
        const sy = by + (ty - by) * 0.62;
        A.shape(ctx, (c) => {
          c.moveTo(sx - nx * 0.38, sy - ny * 0.38);
          c.lineTo(tx, ty);
          c.lineTo(sx + nx * 0.38, sy + ny * 0.38);
          c.lineTo(sx + nx * 0.1, sy + ny * 0.1 + 3);
          c.lineTo(sx - nx * 0.1, sy - ny * 0.1 + 2);
          c.closePath();
        }, '#ffffff', null, { lw: 2, hl: false });
      });
      ring(ctx, cx, cy, 21, 12, L);
    },
    // 震岳獅皇：黑曜石披風，裂縫透出熔岩
    lava(ctx, cx, cy, L, t) {
      const cape = (c) => {
        c.moveTo(cx + 6, cy - 24);
        c.bezierCurveTo(cx - 20, cy - 34, cx - 40, cy - 14, cx - 38, cy + 14);
        c.lineTo(cx - 32, cy + 22);
        c.lineTo(cx - 26, cy + 16);
        c.lineTo(cx - 18, cy + 26);
        c.lineTo(cx - 10, cy + 18);
        c.lineTo(cx - 2, cy + 24);
        c.quadraticCurveTo(cx + 12, cy + 10, cx + 6, cy - 24);
        c.closePath();
      };
      A.shape(ctx, cape, L.pal.mane, L.pal.maneShade, { cel: [4, 4], lw: 2.6, hl: false });
      const glow = 0.6 + Math.sin(t * 3) * 0.3;
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.strokeStyle = A.c(L.pal.glow);
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      [[[cx - 10, cy - 20], [cx - 16, cy - 8], [cx - 12, cy + 2], [cx - 22, cy + 14]], [[cx - 28, cy - 12], [cx - 30, cy + 2], [cx - 26, cy + 10]], [[cx - 2, cy - 12], [cx - 6, cy + 4], [cx - 2, cy + 14]]].forEach((pts) => {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
      });
      ctx.restore();
      ring(ctx, cx, cy, 19, 12, L);
    },
    // 靈鬃獅：往上飄的青色靈火
    wisp(ctx, cx, cy, L, t) {
      ring(ctx, cx, cy, 17, 10, L);
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI * 0.35 - (i / 7) * Math.PI * 1.25;
        const bx = cx + Math.cos(a) * 15;
        const by = cy + Math.sin(a) * 15;
        const sway = Math.sin(t * 5 + i * 1.3) * 4;
        const len = 14 + (i % 3) * 4;
        const tx = bx + Math.cos(a) * len * 0.6 + sway - 4;
        const ty = by + Math.sin(a) * len * 0.6 - len * 0.7;
        const flame = (c) => {
          c.moveTo(bx - 5, by);
          c.quadraticCurveTo(bx - 6, by - len * 0.5, tx, ty);
          c.quadraticCurveTo(bx + 6, by - len * 0.4, bx + 5, by);
          c.quadraticCurveTo(bx, by + 5, bx - 5, by);
          c.closePath();
        };
        ctx.globalAlpha = 0.92;
        A.shape(ctx, flame, L.pal.mane, L.pal.maneShade, { cel: [1.5, 1.5], lw: 2, hl: false });
        ctx.globalAlpha = 1;
        A.ellipse(ctx, bx + (tx - bx) * 0.35, by + (ty - by) * 0.35, 2.2, 3.5, '#e8fffc', null, { noStroke: true, hl: false });
      }
    },
    // 星鬃獅：夜空色的新月，閃著星星
    crescent(ctx, cx, cy, L, t) {
      const moon = (c) => {
        c.arc(cx - 2, cy, 28, Math.PI * 0.32, Math.PI * 1.68, false);
        c.arc(cx + 8, cy - 1, 21, Math.PI * 1.55, Math.PI * 0.45, true);
        c.closePath();
      };
      A.shape(ctx, moon, L.pal.mane, L.pal.maneShade, { cel: [3, 3], lw: 2.6, hl: false });
      ring(ctx, cx + 2, cy, 17, 10, L);
      ctx.fillStyle = '#fff6c0';
      [[-24, -8, 2.4], [-18, 14, 2], [-22, 3, 1.5], [-10, -24, 1.8], [-6, 22, 1.6]].forEach(([dx, dy, r], i) => {
        const tw = 0.5 + Math.sin(t * 3 + i * 1.7) * 0.5;
        ctx.globalAlpha = 0.4 + tw * 0.6;
        ctx.beginPath();
        star(ctx, cx + dx, cy + dy, r * 1.8, r * 0.6, 4, t * 0.5);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    },
    // 天輝獅：放射狀的日光
    rays(ctx, cx, cy, L, t) {
      const rot = t * 0.3;
      A.shape(ctx, (c) => star(c, cx, cy, 33, 20, 12, rot), L.pal.mane, L.pal.maneShade, { cel: [3, 3], lw: 2.3, hl: false });
      A.shape(ctx, (c) => ringPath(c, cx, cy, 18, 12, 6), '#fff4c8', '#ffe28a', { cel: [2, 2], lw: 2 });
    },
    // 極光獅神：一條條往後飄的極光
    aurora(ctx, cx, cy, L, t) {
      const cols = ['#7ae0c0', '#6ac8f0', '#a890f0', '#f08ad0'];
      cols.forEach((col, i) => {
        const y0 = cy - 16 + i * 9;
        const w = 5;
        const band = (c) => {
          c.moveTo(cx + 2, y0 - w);
          for (let k = 1; k <= 6; k++) {
            const x = cx + 2 - k * 8;
            const y = y0 - w + Math.sin(t * 3 + k * 0.8 + i) * (2 + k * 0.8) + k * 1.5;
            c.lineTo(x, y);
          }
          for (let k = 6; k >= 1; k--) {
            const x = cx + 2 - k * 8;
            const y = y0 + w + Math.sin(t * 3 + k * 0.8 + i) * (2 + k * 0.8) + k * 1.5 - k * 0.7;
            c.lineTo(x, y);
          }
          c.lineTo(cx + 2, y0 + w);
          c.closePath();
        };
        ctx.globalAlpha = 0.9;
        A.shape(ctx, band, col, null, { lw: 1.6, hl: false });
        ctx.globalAlpha = 1;
      });
      ring(ctx, cx, cy, 17, 12, L, '#e8fff8', '#b8e8dc');
    },
    // 風鬃獅：被風梳成往後飛的尖角
    swept(ctx, cx, cy, L, t) {
      for (let i = 0; i < 6; i++) {
        const by = cy - 17 + i * 7;
        const bx = cx - 4 + Math.abs(i - 2.5) * 1.5;
        const flutter = Math.sin(t * 8 + i) * 1.5;
        const tx = cx - 36 - (i === 1 || i === 2 ? 6 : 0);
        const ty = by - 6 + i * 1.5 + flutter;
        A.shape(ctx, (c) => {
          c.moveTo(bx, by - 5);
          c.quadraticCurveTo((bx + tx) / 2, by - 8, tx, ty);
          c.quadraticCurveTo((bx + tx) / 2, by + 3, bx, by + 5);
          c.closePath();
        }, L.pal.mane, L.pal.maneShade, { cel: [1.5, 2], lw: 2.2, hl: false });
      }
      ring(ctx, cx, cy, 17, 10, L);
    },
    // 影鬃獅：破碎的影子往後散開
    shadow(ctx, cx, cy, L, t) {
      for (let i = 0; i < 3; i++) {
        const y0 = cy - 12 + i * 12;
        const wv = Math.sin(t * 4 + i * 1.7) * 3;
        ctx.globalAlpha = 0.85 - i * 0.12;
        A.shape(ctx, (c) => {
          c.moveTo(cx - 4, y0 - 7);
          c.quadraticCurveTo(cx - 22, y0 - 10 + wv, cx - 40, y0 - 2 + wv);
          c.lineTo(cx - 32, y0 + 1 + wv);
          c.lineTo(cx - 38, y0 + 6 + wv);
          c.quadraticCurveTo(cx - 20, y0 + 8, cx - 4, y0 + 7);
          c.closePath();
        }, L.pal.mane, null, { lw: 2, hl: false });
      }
      ctx.globalAlpha = 1;
      A.shape(ctx, (c) => star(c, cx, cy, 25, 17, 9, 0.2), L.pal.mane, L.pal.maneShade, { cel: [3, 3], lw: 2.4, hl: false });
    },
    // 雷影獅：鋸齒狀的閃電
    zigzag(ctx, cx, cy, L, t) {
      A.shape(ctx, (c) => star(c, cx, cy, 31, 17, 11, 0.15), '#26222e', '#15131a', { cel: [3, 3], lw: 2.4, hl: false });
      A.shape(ctx, (c) => star(c, cx, cy, 25, 16, 11, 0.15), L.pal.mane, L.pal.maneShade, { cel: [2, 2], lw: 1.8, hl: false });
      if (Math.sin(t * 7) > 0.6) {
        ctx.strokeStyle = '#fff8c0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 28, cy - 14);
        ctx.lineTo(cx - 20, cy - 8);
        ctx.lineTo(cx - 26, cy - 2);
        ctx.lineTo(cx - 18, cy + 4);
        ctx.stroke();
      }
    },
    // 閃霆獅王：翻滾的雷雲，偶爾閃出電光
    storm(ctx, cx, cy, L, t) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.2;
        const r = 19 + Math.sin(t * 2 + i) * 1.2;
        A.ellipse(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 10, 9, L.pal.mane, L.pal.maneShade, { cel: [2.5, 2.5], hl: false, lw: 2.3 });
      }
      ring(ctx, cx, cy, 17, 12, L, '#e4ebfa', '#b8c6e4');
      if ((t * 1.3) % 2 < 0.18) {
        ctx.strokeStyle = '#6ad0ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy - 10);
        ctx.lineTo(cx - 22, cy - 2);
        ctx.lineTo(cx - 28, cy + 4);
        ctx.lineTo(cx - 18, cy + 12);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
  };

  // ════════ 尾巴末端 ════════
  const TAIL = {
    tuft(ctx, L) {
      A.shape(ctx, (c) => {
        c.moveTo(-5, 5);
        c.quadraticCurveTo(-10, -2, -5, -5);
        c.quadraticCurveTo(-4, -11, 0, -10);
        c.quadraticCurveTo(4, -12, 5, -5);
        c.quadraticCurveTo(10, -1, 5, 5);
        c.quadraticCurveTo(0, 8, -5, 5);
        c.closePath();
      }, L.pal.mane, L.pal.maneShade, { cel: [2, 2], lw: 2.5, hl: false });
    },
    rock(ctx, L) {
      A.shape(ctx, (c) => {
        c.moveTo(-7, 2);
        c.lineTo(-6, -6);
        c.lineTo(1, -10);
        c.lineTo(7, -5);
        c.lineTo(7, 3);
        c.lineTo(0, 7);
        c.closePath();
      }, L.pal.mane, L.pal.maneShade, { cel: [2, 2], lw: 2.5, hl: false });
    },
    mace(ctx, L) {
      A.shape(ctx, (c) => star(c, 0, -2, 11, 6, 6, 0.3), L.pal.mane, L.pal.maneShade, { cel: [2, 2], lw: 2.3, hl: false });
      A.ellipse(ctx, 0, -2, 5, 5, U.mix(L.pal.mane, '#ffffff', 0.3), null, { lw: 2, hl: false });
    },
    crag(ctx, L) {
      A.shape(ctx, (c) => {
        c.moveTo(-8, 5);
        c.lineTo(0, -12);
        c.lineTo(8, 5);
        c.closePath();
      }, L.pal.mane, L.pal.maneShade, { cel: [2, 1], lw: 2.4, hl: false });
      A.shape(ctx, (c) => {
        c.moveTo(-3, -4);
        c.lineTo(0, -12);
        c.lineTo(3, -4);
        c.closePath();
      }, '#ffffff', null, { lw: 1.8, hl: false });
    },
    ember(ctx, L, t) {
      TAIL.rock(ctx, L);
      ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.3;
      ctx.strokeStyle = A.c(L.pal.glow);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2, 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    wisp(ctx, L, t) {
      const sw = Math.sin(t * 6) * 2;
      A.shape(ctx, (c) => {
        c.moveTo(-6, 4);
        c.quadraticCurveTo(-8, -6, sw, -16);
        c.quadraticCurveTo(8, -6, 6, 4);
        c.quadraticCurveTo(0, 8, -6, 4);
        c.closePath();
      }, L.pal.mane, L.pal.maneShade, { cel: [1.5, 1.5], lw: 2.2, hl: false });
      A.ellipse(ctx, 0, -2, 2.5, 4, '#e8fffc', null, { noStroke: true, hl: false });
    },
    star(ctx, L, t) {
      ctx.save();
      ctx.rotate(Math.sin(t * 2) * 0.2);
      A.shape(ctx, (c) => star(c, 0, -3, 10, 4.5, 5, -Math.PI / 2), '#ffe066', '#e8b020', { cel: [1.5, 1.5], lw: 2.2, hl: false });
      ctx.restore();
    },
    sun(ctx, L, t) {
      A.shape(ctx, (c) => star(c, 0, -3, 10, 6, 8, t), L.pal.mane, L.pal.maneShade, { cel: [1.5, 1.5], lw: 2, hl: false });
      A.ellipse(ctx, 0, -3, 4, 4, '#fff4c8', null, { lw: 1.6, hl: false });
    },
    ribbon(ctx, L, t) {
      ['#7ae0c0', '#a890f0', '#f08ad0'].forEach((col, i) => {
        ctx.strokeStyle = A.c(col);
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) {
          const x = -k * 4;
          const y = Math.sin(t * 4 + k * 0.7 + i) * (2 + k * 0.6) + i * 3 - 4;
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    },
    leaf(ctx, L) {
      A.shape(ctx, (c) => {
        c.moveTo(0, 5);
        c.quadraticCurveTo(-9, -4, 0, -14);
        c.quadraticCurveTo(9, -4, 0, 5);
        c.closePath();
      }, L.pal.mane, L.pal.maneShade, { cel: [1.5, 1.5], lw: 2.2, hl: false });
      ctx.strokeStyle = A.c(L.pal.maneShade);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(0, -11);
      ctx.stroke();
    },
    split(ctx, L, t) {
      [-0.5, 0.4].forEach((r, i) => {
        ctx.save();
        ctx.rotate(r + Math.sin(t * 5 + i) * 0.15);
        ctx.globalAlpha = 0.9;
        A.shape(ctx, (c) => {
          c.moveTo(-3, 3);
          c.quadraticCurveTo(-5, -6, 0, -15);
          c.quadraticCurveTo(5, -6, 3, 3);
          c.closePath();
        }, L.pal.mane, null, { lw: 2, hl: false });
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    },
    bolt(ctx, L) {
      A.shape(ctx, (c) => {
        c.moveTo(-2, 6);
        c.lineTo(4, -2);
        c.lineTo(0, -2);
        c.lineTo(5, -13);
        c.lineTo(-5, -1);
        c.lineTo(-1, -1);
        c.closePath();
      }, L.pal.mane, L.pal.maneShade, { lw: 2.2, hl: false });
    },
    cloud(ctx, L, t) {
      [[-5, -2, 6], [3, -4, 7], [0, -9, 6]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r * 0.85, L.pal.mane, L.pal.maneShade, { cel: [1.5, 1.5], lw: 2.2, hl: false }));
      if ((t * 2) % 1.6 < 0.15) {
        ctx.strokeStyle = '#6ad0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(-3, 8);
        ctx.lineTo(1, 8);
        ctx.lineTo(-2, 14);
        ctx.stroke();
      }
    },
  };

  function mapleTuft(ctx, x, y, s, rot, L) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, s), L.pal.tuft, L.pal.tuftShade, { shadeY: s * 0.3, lw: 2.2 });
    ctx.restore();
  }

  // 星楓葉：每拿到一片，額頭楓葉旁多一片發光的小葉子；五片圍成一圈就是星楓之冠
  const CROWN = [[-9, 3, -0.9], [9, 3, 0.9], [-15, 9, -1.4], [15, 9, 1.4], [0, -8, 0]];
  function leafCrown(ctx, x, y, colors, t) {
    colors.forEach((col, i) => {
      if (!col) return;
      const [dx, dy, rot] = CROWN[i];
      ctx.save();
      ctx.translate(x + dx, y + dy + Math.sin(t * 2 + i) * 0.8);
      ctx.rotate(rot);
      ctx.globalAlpha *= 0.45 + Math.sin(t * 3 + i) * 0.1;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha /= 0.45 + Math.sin(t * 3 + i) * 0.1;
      A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, 4.5), col, null, { lw: 1.6, hl: false });
      ctx.restore();
    });
  }

  function drawTail(ctx, L, x, y, rot, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    (TAIL[L.tail] || TAIL.tuft)(ctx, L, t);
    ctx.restore();
  }

  function sideView(ctx, st, L) {
    const t = st.t;
    const P = L.pal;
    let bob = Math.sin(t * 3) * 1.2;
    let lean = 0;
    let stretch = 1;
    let tailUp = 0;
    let mouth = 'smile';
    let eyeKind = 'normal';
    let pawOut = 0;
    let lift = [0, 0, 0, 0]; // 遠後、遠前、近後、近前
    let off = [0, 0, 0, 0];

    if (st.state === 'walk') {
      const ph = t * 14;
      bob = -Math.abs(Math.sin(ph)) * 2.2;
      off = [Math.sin(ph) * -5, Math.sin(ph) * 5, Math.sin(ph) * 5, Math.sin(ph) * -5];
      lift = [Math.max(0, Math.cos(ph)) * 4, Math.max(0, -Math.cos(ph)) * 4, Math.max(0, -Math.cos(ph)) * 4, Math.max(0, Math.cos(ph)) * 4];
    } else if (st.state === 'jump' || st.state === 'fall') {
      bob = -2;
      off = [-6, 7, -5, 8];
      lift = [3, 5, 3, 5];
      tailUp = st.state === 'jump' ? 8 : -4;
    } else if (st.state === 'attack' || st.state === 'strike') {
      const p = st.p;
      const k = p < 0.3 ? p / 0.3 : Math.max(0, 1 - (p - 0.3) / 0.7);
      lean = k * 5;
      pawOut = k;
      mouth = 'open';
      eyeKind = k > 0.5 ? 'angry' : 'normal';
    } else if (st.state === 'roar' || st.state === 'cast') {
      const k = Math.sin(Math.min(1, st.p * 1.6) * Math.PI);
      lean = -2 + k * 3;
      mouth = st.state === 'roar' ? 'roar' : 'open';
      eyeKind = 'closed';
      tailUp = 10 * k;
    } else if (st.state === 'dash') {
      stretch = 1.18;
      off = [-9, 10, -8, 11];
      lift = [4, 6, 4, 6];
      lean = 6;
      mouth = 'open';
      eyeKind = 'angry';
      tailUp = -6;
    } else if (st.state === 'hurt') {
      lean = -5;
      eyeKind = 'hurt';
      mouth = 'o';
    }

    // 眨眼、耳朵抖動
    if (eyeKind === 'normal' && (st.state === 'idle' || st.state === 'walk') && t % 3.7 < 0.13) eyeKind = 'closed';
    const earTwitch = st.state === 'idle' && t % 5.3 < 0.22 ? -2.5 : 0;

    // 漂浮形態：腳縮起來，整隻上下浮動
    if (L.float) {
      lift = [5, 5, 5, 5];
      off = [-2, 2, -2, 2];
    }
    const up = L.legLen - 15; // 腿變長時，身體跟頭一起抬高

    ctx.save();
    ctx.scale(stretch * L.scale, L.scale / Math.sqrt(stretch));
    if (L.float) ctx.translate(0, -10 + Math.sin(t * 2) * 3);

    // 光翼（在身體後面）
    if (L.wings) {
      const flap = Math.sin(t * 5) * 0.2;
      [[-6, 1], [-2, 0.8]].forEach(([dx, s]) => {
        ctx.save();
        ctx.translate(dx + lean * 0.3, -30 - up + bob);
        ctx.rotate(-0.5 + flap);
        ctx.scale(s, s);
        A.shape(ctx, (c) => {
          c.moveTo(0, 0);
          c.bezierCurveTo(-10, -18, -28, -20, -30, -8);
          c.quadraticCurveTo(-22, -8, -24, -2);
          c.quadraticCurveTo(-14, -3, -16, 3);
          c.quadraticCurveTo(-8, 2, 0, 0);
          c.closePath();
        }, '#fffbe8', '#f0e0b0', { cel: [2, 2], lw: 2.2, hl: false });
        ctx.restore();
      });
    }

    // 遠側的腳（較暗）
    leg(ctx, -11 + off[0], 0, lift[0], P.farLeg, P.farLegShade, L.legW, L.legLen);
    leg(ctx, 9 + off[1], 0, lift[1], P.farLeg, P.farLegShade, L.legW, L.legLen);

    // 尾巴
    const sw = Math.sin(t * 4) * 3;
    const tailBaseY = -22 - up + bob;
    const tipX = -34 + sw * 0.3;
    const tipY = -38 - up + bob - tailUp;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, tailBaseY);
    ctx.quadraticCurveTo(-32, tailBaseY - 2, tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = A.c(P.body);
    ctx.lineWidth = 3.5;
    ctx.stroke();
    drawTail(ctx, L, tipX - 1, tipY - 3, 0.2 + sw * 0.04, t);

    // 身體
    const bx = -1 + lean * 0.3 - (L.bodyRx - 21) * 0.3;
    const by = -20 - up + bob;
    A.ellipse(ctx, bx, by, L.bodyRx, L.bodyRy, P.body, P.bodyShade, { cel: [3, 3] });
    A.ellipse(ctx, 6 + lean * 0.3, by + 5, 10, 7, P.cream, null, { noStroke: true, hl: false });
    if (L.stripes) {
      // 雷紋
      ctx.strokeStyle = A.c('#ffd42a');
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      [-12, -3].forEach((x0) => {
        ctx.beginPath();
        ctx.moveTo(x0 + bx, by - 11);
        ctx.lineTo(x0 + bx + 3, by - 5);
        ctx.lineTo(x0 + bx - 1, by - 2);
        ctx.lineTo(x0 + bx + 2, by + 4);
        ctx.stroke();
      });
    }

    // 近側的腳
    leg(ctx, -7 + off[2], 0, lift[2], P.body, P.bodyShade, L.legW, L.legLen);
    leg(ctx, 13 + off[3], 0, lift[3], P.body, P.bodyShade, L.legW, L.legLen);
    if (L.bracers) {
      [-7 + off[2], 13 + off[3]].forEach((x, i) => {
        const ly = -L.legLen * 0.62 - lift[2 + i];
        A.shape(ctx, (c) => A.roundRect(c, x - L.legW / 2 - 1.5, ly, L.legW + 3, 6, 2), '#b8c6d8', '#7e8ca2', { cel: [1, 1], lw: 2, hl: false });
      });
    }

    // 伸出的前爪（攻擊）
    if (pawOut > 0) {
      const px = 24 + pawOut * 14;
      const py = -24 - up - pawOut * 6 + bob;
      A.ellipse(ctx, px, py, 7, 6, P.body, P.bodyShade, { lw: 2.5, hl: false });
      ctx.strokeStyle = A.c('#fff6e6');
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 5, py + i * 3);
        ctx.lineTo(px + 10, py + i * 3.5);
        ctx.stroke();
      }
    }

    // 頭
    const hx = 9 + lean;
    const hy = -45 - up + bob;
    (MANE[L.mane] || MANE.bumps)(ctx, hx - 4, hy - 1, L, t);
    // 耳朵
    if (L.ears === 'pointed') {
      [[hx - 9, hy - 19 + earTwitch, -0.35], [hx + 8, hy - 21, 0.3]].forEach(([ex, ey, r]) => {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(r);
        A.shape(ctx, (c) => {
          c.moveTo(-6, 4);
          c.quadraticCurveTo(-4, -8, 0, -11);
          c.quadraticCurveTo(4, -8, 6, 4);
          c.closePath();
        }, P.mane, P.maneShade, { cel: [1.5, 1.5], lw: 2.4, hl: false });
        A.shape(ctx, (c) => {
          c.moveTo(-3, 3);
          c.quadraticCurveTo(-2, -4, 0, -6);
          c.quadraticCurveTo(2, -4, 3, 3);
          c.closePath();
        }, P.ear, null, { noStroke: true, hl: false });
        ctx.restore();
      });
    } else {
      A.ellipse(ctx, hx - 10, hy - 20 + earTwitch, 6.5, 6.5, P.mane, P.maneShade, { lw: 2.5, hl: false });
      A.ellipse(ctx, hx - 10, hy - 20 + earTwitch, 3, 3, P.ear, null, { noStroke: true, hl: false });
      A.ellipse(ctx, hx + 8, hy - 21, 6.5, 6.5, P.mane, P.maneShade, { lw: 2.5, hl: false });
      A.ellipse(ctx, hx + 8, hy - 21, 3, 3, P.ear, null, { noStroke: true, hl: false });
    }
    // 圍巾（在頭後面，末端往後飄）
    if (L.scarf) {
      const fl = Math.sin(t * 6) * 3;
      A.shape(ctx, (c) => {
        c.moveTo(hx - 12, hy + 12);
        c.quadraticCurveTo(hx - 24, hy + 10 + fl, hx - 34, hy + 16 + fl);
        c.lineTo(hx - 30, hy + 21 + fl);
        c.quadraticCurveTo(hx - 20, hy + 18, hx - 10, hy + 18);
        c.closePath();
      }, '#e0403a', '#b02a24', { cel: [1.5, 1.5], lw: 2.2, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, hx - 14, hy + 11, 26, 8, 4), '#e0403a', '#b02a24', { cel: [1.5, 1.5], lw: 2.2, hl: false });
    }
    A.ellipse(ctx, hx, hy, 19, 17.5, P.body, P.bodyShade, { cel: [3, 3.5] });
    // 楓葉鬃毛
    mapleTuft(ctx, hx - 1, hy - 20, 9, -0.15, L);
    if (L.leaves) leafCrown(ctx, hx - 1, hy - 20, L.leaves, st.t || 0);
    // 光環
    if (L.halo) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(hx - 2, hy - 33 + Math.sin(t * 2) * 1.5, 12, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffe066');
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
    // 嘴邊
    A.ellipse(ctx, hx + 11, hy + 7, 9, 6.5, P.cream, null, { lw: 2, hl: false });
    ctx.fillStyle = A.c(P.nose);
    ctx.beginPath();
    ctx.moveTo(hx + 12.8, hy + 1.6);
    ctx.quadraticCurveTo(hx + 16, hy + 0.2, hx + 19.2, hy + 1.6);
    ctx.quadraticCurveTo(hx + 17.6, hy + 5, hx + 16, hy + 5);
    ctx.quadraticCurveTo(hx + 14.4, hy + 5, hx + 12.8, hy + 1.6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(hx + 15, hy + 2, 1.3, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    // 嘴
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (mouth === 'smile') {
      ctx.beginPath();
      ctx.moveTo(hx + 16, hy + 5);
      ctx.lineTo(hx + 16, hy + 7);
      ctx.moveTo(hx + 12.6, hy + 7.4);
      ctx.quadraticCurveTo(hx + 14.3, hy + 9.8, hx + 16, hy + 7);
      ctx.quadraticCurveTo(hx + 17.7, hy + 9.8, hx + 19.4, hy + 7.4);
      ctx.stroke();
    } else {
      const big = mouth === 'roar' ? 6 : mouth === 'open' ? 4 : 2.5;
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.ellipse(hx + 13, hy + 10, big * 0.9, big, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (mouth === 'roar') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(hx + 9.5, hy + 6.5);
        ctx.lineTo(hx + 11, hy + 9.5);
        ctx.lineTo(hx + 12, hy + 6);
        ctx.moveTo(hx + 14, hy + 6);
        ctx.lineTo(hx + 15, hy + 9.5);
        ctx.lineTo(hx + 16.5, hy + 6.5);
        ctx.fill();
      }
    }
    // 眼睛
    A.eye(ctx, hx + 2, hy - 3, 3.9, 5.4, eyeKind, 1);
    A.eye(ctx, hx + 12, hy - 4, 3.6, 5.2, eyeKind, 1);
    if (L.eyeTint && (eyeKind === 'normal' || eyeKind === 'angry')) {
      ctx.fillStyle = A.c(L.eyeTint);
      ctx.globalAlpha = 0.75;
      [[hx + 3, hy - 1, 2.4], [hx + 13, hy - 2, 2.2]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    if (L.brows && eyeKind !== 'closed' && eyeKind !== 'hurt') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 12);
      ctx.lineTo(hx + 5, hy - 10);
      ctx.moveTo(hx + 9, hy - 10.5);
      ctx.lineTo(hx + 16, hy - 12);
      ctx.stroke();
    }
    A.blush(ctx, hx - 5, hy + 6, 4.5);

    ctx.restore();
  }

  function backView(ctx, st, L) {
    const P = L.pal;
    const a = st.moving ? Math.sin(st.t * 12) : 0;
    const t = st.t;
    ctx.save();
    ctx.scale(L.scale, L.scale);
    // 尾巴往旁邊捲起
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(4, -12);
    ctx.quadraticCurveTo(20, -8 + Math.sin(t * 3) * 2, 18, -24);
    ctx.stroke();
    ctx.strokeStyle = A.c(P.body);
    ctx.lineWidth = 3.5;
    ctx.stroke();
    drawTail(ctx, L, 18, -28, 0.3, t);
    // 後腳踩著繩子，左右交替
    leg(ctx, -8, 0 - a * 3, 0, P.body, P.bodyShade, L.legW, 15);
    leg(ctx, 8, 0 + a * 3, 0, P.body, P.bodyShade, L.legW, 15);
    A.ellipse(ctx, 0, -20, 16, 15, P.body, P.bodyShade, { cel: [3, 3] });
    // 鬃毛（背面看整圈）
    ring(ctx, 0, -46, 22, 14, L);
    A.ellipse(ctx, -12, -65, 6.5, 6.5, P.mane, P.maneShade, { lw: 2.5, hl: false });
    A.ellipse(ctx, 12, -65, 6.5, 6.5, P.mane, P.maneShade, { lw: 2.5, hl: false });
    mapleTuft(ctx, 0, -67, 8, 0, L);
    // 前爪輪流往頭頂上方抓
    A.ellipse(ctx, -8, -77 + a * 5, 6, 6, P.body, P.bodyShade, { lw: 2.5, hl: false });
    A.ellipse(ctx, 8, -77 - a * 5, 6, 6, P.body, P.bodyShade, { lw: 2.5, hl: false });
    ctx.restore();
  }

  // st：{ state, t, p, moving, form }
  A.drawLion = function (ctx, x, y, dir, st) {
    let L = lookOf(st.form || 'base');
    if (st.leaves && st.leaves.length) L = Object.assign({}, L, { leaves: st.leaves });
    ctx.save();
    ctx.translate(x, y);
    if (st.state === 'dead') {
      A.groundShadow(ctx, 0, 0, 30 * L.scale);
      ctx.translate(0, -14);
      ctx.rotate(-Math.PI / 2 * dir);
      ctx.translate(0, 14);
      ctx.scale(dir, 1);
      sideView(ctx, { state: 'hurt', t: 0, p: 0 }, L);
      ctx.restore();
      return;
    }
    if (st.state === 'climb') {
      backView(ctx, st, L);
      ctx.restore();
      return;
    }
    if (st.onGround || L.float) A.groundShadow(ctx, 0, 0, 24 * L.scale * (L.float ? 0.7 : 1));
    ctx.scale(dir, 1);
    sideView(ctx, st, L);
    ctx.restore();
  };

  A.lionColors = COL;
})();
