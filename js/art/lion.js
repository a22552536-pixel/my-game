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
    if (L.hd) {
      L.tier = (f && f.tier) || 0;
      L._key = formId + ':';
    }
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

  // 火焰形：底部圓、往 (tx,ty) 收尖
  function flamePath(c, bx, by, tx, ty, w) {
    const dx = tx - bx;
    const dy = ty - by;
    const d = Math.hypot(dx, dy) || 1;
    const nx = (-dy / d) * w;
    const ny = (dx / d) * w;
    c.moveTo(bx - nx, by - ny);
    c.quadraticCurveTo(bx - nx * 1.3 + dx * 0.45, by - ny * 1.3 + dy * 0.45, tx, ty);
    c.quadraticCurveTo(bx + nx * 1.3 + dx * 0.45, by + ny * 1.3 + dy * 0.45, bx + nx, by + ny);
    c.quadraticCurveTo(bx - (dx / d) * w * 1.3, by - (dy / d) * w * 1.3, bx - nx, by - ny);
    c.closePath();
  }
  // 新月：大圓扣掉往 (ox,oy) 偏移的小圓
  function crescentPath(c, x, y, R, ox, oy, R2) {
    const d = Math.hypot(ox, oy);
    const th = Math.atan2(oy, ox);
    const a = (R * R - R2 * R2 + d * d) / (2 * d);
    const ph = Math.acos(Math.max(-1, Math.min(1, a / R)));
    const p1x = x + Math.cos(th + ph) * R;
    const p1y = y + Math.sin(th + ph) * R;
    const p2x = x + Math.cos(th - ph) * R;
    const p2y = y + Math.sin(th - ph) * R;
    c.moveTo(p1x, p1y);
    c.arc(x, y, R, th + ph, th - ph, false);
    c.arc(x + ox, y + oy, R2, Math.atan2(p2y - y - oy, p2x - x - ox), Math.atan2(p1y - y - oy, p1x - x - ox), true);
    c.closePath();
  }
  // 從 (bx,by) 往角度 a 伸出的尖刺，w 是底部半寬，bend 讓刺往後彎
  function spikePath(c, bx, by, a, len, w, bend) {
    const tx = bx + Math.cos(a + bend) * len;
    const ty = by + Math.sin(a + bend) * len;
    const nx = -Math.sin(a) * w;
    const ny = Math.cos(a) * w;
    const mx = bx + Math.cos(a + bend * 0.4) * len * 0.55;
    const my = by + Math.sin(a + bend * 0.4) * len * 0.55;
    c.moveTo(bx - nx, by - ny);
    c.quadraticCurveTo(mx - nx * 0.7, my - ny * 0.7, tx, ty);
    c.quadraticCurveTo(mx + nx * 0.4, my + ny * 0.4, bx + nx, by + ny);
    c.closePath();
    return [tx, ty];
  }
  function sparkle(ctx, x, y, r, col, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha == null ? 1 : alpha;
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    star(ctx, x, y, r, r * 0.3, 4, 0);
    ctx.fill();
    ctx.restore();
  }
  // 一把劍（沿角度 a 往外），劍柄在 r0，劍尖在 r1
  function sword(ctx, cx, cy, a, r0, r1, w, L) {
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    const nx = -sn;
    const ny = cs;
    const P = (r, n) => [cx + cs * r + nx * n, cy + sn * r + ny * n];
    const gx = r0 + 7;
    A.shape(ctx, (c) => {
      const p = [P(r0, -1.8), P(gx, -1.8), P(gx, 1.8), P(r0, 1.8)];
      p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
      c.closePath();
    }, L.pal.grip || '#6a3a22', null, { lw: 1.8, hl: false });
    A.shape(ctx, (c) => {
      const p = [P(gx, -w), P(r1 - 8, -w), P(r1, 0), P(r1 - 8, w), P(gx, w)];
      p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
      c.closePath();
    }, L.pal.blade || '#e6eef8', L.pal.bladeShade || '#98a8c0', { cel: [1.5, 1.5], lw: 2.1, hl: false });
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    let q = P(gx + 3, -w * 0.35);
    ctx.moveTo(q[0], q[1]);
    q = P(r1 - 7, -w * 0.35);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
    // 護手
    A.shape(ctx, (c) => {
      const p = [P(gx - 1.8, -w - 3.5), P(gx + 1.8, -w - 3.5), P(gx + 1.8, w + 3.5), P(gx - 1.8, w + 3.5)];
      p.forEach((q2, i) => (i ? c.lineTo(q2[0], q2[1]) : c.moveTo(q2[0], q2[1])));
      c.closePath();
    }, L.pal.guard || '#ffcf3a', L.pal.guardShade || '#d09010', { lw: 1.8, hl: false, cel: [1, 1] });
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

    // ── 力量 ──
    // 劍鬃獅：一圈往後展開的劍，像騎士的劍冠
    blades(ctx, cx, cy, L) {
      [[2.75, 38], [-3.05, 46], [-2.45, 50], [-1.85, 48], [-1.3, 40]].forEach(([a, len]) => sword(ctx, cx, cy, a, 14, len, 4, L));
      ring(ctx, cx, cy, 16, 10, L);
    },
    // 龍騎獅皇：往後掃的龍鰭加一對龍角，像一頂龍頭盔
    dragon(ctx, cx, cy, L, t) {
      const gold = L.pal.trim || '#ffcf3a';
      [[2.5, 26, 8], [-3.05, 36, 9], [-2.55, 42, 10], [-2.05, 40, 10], [-1.55, 32, 8]].forEach(([a, len, w], i) => {
        const bx = cx + Math.cos(a) * 9;
        const by = cy + Math.sin(a) * 9;
        const bend = -0.35 + Math.sin(t * 2 + i) * 0.03;
        A.shape(ctx, (c) => spikePath(c, bx, by, a, len, w, bend), L.pal.mane, L.pal.maneShade, { cel: [2.5, 2.5], lw: 2.4, hl: false });
        const tx = bx + Math.cos(a + bend) * len;
        const ty = by + Math.sin(a + bend) * len;
        ctx.strokeStyle = A.c(gold);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(a) * 8, by + Math.sin(a) * 8);
        ctx.quadraticCurveTo(bx + Math.cos(a + bend * 0.4) * len * 0.6, by + Math.sin(a + bend * 0.4) * len * 0.6, tx + (bx - tx) * 0.12, ty + (by - ty) * 0.12);
        ctx.stroke();
      });
      ring(ctx, cx, cy, 17, 11, L);
      // 龍角（遠的先畫、暗一點）：從額頭兩側往上、再往後彎
      [[cx + 9, cy - 13, cx + 10, cy - 38, cx - 10, cy - 46, 0.22], [cx - 3, cy - 11, cx - 6, cy - 36, cx - 30, cy - 40, 0]].forEach(([x0, y0, qx, qy, x1, y1, dk]) => {
        const pt = (f) => {
          const u = 1 - f;
          return [u * u * x0 + 2 * u * f * qx + f * f * x1, u * u * y0 + 2 * u * f * qy + f * f * y1];
        };
        const side = [];
        const N = 10;
        for (let k = 0; k <= N; k++) {
          const f = k / N;
          const p = pt(f);
          const q = pt(Math.min(1, f + 0.02));
          const r = pt(Math.max(0, f - 0.02));
          const tx = q[0] - r[0];
          const ty = q[1] - r[1];
          const d = Math.hypot(tx, ty) || 1;
          const w = 6.5 * (1 - f) + 0.4;
          side.push([p[0] - (ty / d) * w, p[1] + (tx / d) * w, p[0] + (ty / d) * w, p[1] - (tx / d) * w]);
        }
        A.shape(ctx, (c) => {
          side.forEach((e, i) => (i ? c.lineTo(e[0], e[1]) : c.moveTo(e[0], e[1])));
          for (let i = side.length - 1; i >= 0; i--) c.lineTo(side[i][2], side[i][3]);
          c.closePath();
        }, U.mix(L.pal.horn || '#fff0c8', '#000000', dk), U.mix(L.pal.hornShade || '#d8b070', '#000000', dk), { cel: [2, 2], lw: 2.4, hl: false });
        ctx.strokeStyle = A.c(U.mix(L.pal.hornShade || '#d8b070', '#000000', 0.25 + dk));
        ctx.lineWidth = 1.5;
        [3, 5].forEach((k) => {
          const e = side[k];
          ctx.beginPath();
          ctx.moveTo(e[0] + (e[2] - e[0]) * 0.15, e[1] + (e[3] - e[1]) * 0.15);
          ctx.lineTo(e[0] + (e[2] - e[0]) * 0.85, e[1] + (e[3] - e[1]) * 0.85);
          ctx.stroke();
        });
      });
    },

    // ── 法術 ──
    // 焰鬃獅：往上竄的火焰，外紅內黃
    fire(ctx, cx, cy, L, t) {
      const fl = [];
      for (let i = 0; i < 8; i++) {
        const a = -0.55 - (i / 7) * 2.55;
        const bx = cx + Math.cos(a) * 14;
        const by = cy + Math.sin(a) * 14;
        const len = 18 + (i % 2) * 7 + (i > 1 && i < 5 ? 5 : 0);
        const sway = Math.sin(t * 7 + i * 1.9) * 3;
        const dx = Math.cos(a) * 0.55 - 0.35;
        const dy = Math.sin(a) * 0.55 - 0.85;
        const d = Math.hypot(dx, dy);
        fl.push([bx, by, bx + (dx / d) * len + sway, by + (dy / d) * len, len]);
      }
      fl.forEach(([bx, by, tx, ty]) => A.shape(ctx, (c) => flamePath(c, bx, by, tx, ty, 7), L.pal.mane, L.pal.maneShade, { cel: [2, 2], lw: 2.2, hl: false }));
      fl.forEach(([bx, by, tx, ty]) => A.shape(ctx, (c) => flamePath(c, bx, by, bx + (tx - bx) * 0.62, by + (ty - by) * 0.62, 3.8), L.pal.flame || '#ffd84a', null, { noStroke: true, hl: false }));
      ring(ctx, cx, cy, 16, 10, L);
      A.shape(ctx, (c) => ringPath(c, cx, cy, 11, 8, 4), L.pal.flame || '#ffd84a', null, { noStroke: true, hl: false });
    },
    // 霜鬃獅：一根根往外長的冰晶
    frost(ctx, cx, cy, L, t) {
      [[2.55, 30], [3.1, 38], [-2.65, 46], [-2.15, 38], [-1.65, 46], [-1.15, 36], [-0.7, 27]].forEach(([a, len]) => {
        const w = 6.5;
        const bx = cx + Math.cos(a) * 10;
        const by = cy + Math.sin(a) * 10;
        const tx = cx + Math.cos(a) * len;
        const ty = cy + Math.sin(a) * len;
        const nx = -Math.sin(a) * w;
        const ny = Math.cos(a) * w;
        const mx = bx + (tx - bx) * 0.68;
        const my = by + (ty - by) * 0.68;
        A.shape(ctx, (c) => {
          c.moveTo(bx - nx, by - ny);
          c.lineTo(mx - nx, my - ny);
          c.lineTo(tx, ty);
          c.lineTo(mx + nx, my + ny);
          c.lineTo(bx + nx, by + ny);
          c.closePath();
        }, L.pal.mane, L.pal.maneShade, { lw: 2.2, hl: false });
        A.shape(ctx, (c) => {
          c.moveTo(bx - nx * 0.9, by - ny * 0.9);
          c.lineTo(mx - nx * 0.9, my - ny * 0.9);
          c.lineTo(tx - (tx - mx) * 0.15, ty - (ty - my) * 0.15);
          c.lineTo(mx, my);
          c.lineTo(bx, by);
          c.closePath();
        }, '#eafaff', null, { noStroke: true, hl: false });
      });
      ring(ctx, cx, cy, 16, 11, L, L.pal.frostRing || '#e2f6ff', L.pal.frostRingShade || '#a8d4ec');
      [[-30, -18, 4], [-8, -36, 3.2], [-36, 6, 3]].forEach(([dx, dy, r], i) => sparkle(ctx, cx + dx, cy + dy, r, '#ffffff', 0.4 + (Math.sin(t * 4 + i * 2) * 0.5 + 0.5) * 0.6));
    },
    // 星月獅：夜空色的鬃毛上掛著一彎金色新月
    moonstar(ctx, cx, cy, L, t) {
      A.shape(ctx, (c) => ringPath(c, cx, cy, 20, 12, 7), L.pal.mane, L.pal.maneShade, { cel: [3, 3], lw: 2.5 });
      A.shape(ctx, (c) => crescentPath(c, cx - 15, cy - 19, 16, 7, -6, 13), L.pal.moon || '#ffe680', L.pal.moonShade || '#e8b830', { cel: [2, 2], lw: 2.4, hl: false });
      [[-26, 4, 2.6], [-18, 18, 2.2], [-6, 24, 1.8], [-28, -8, 1.6]].forEach(([dx, dy, r], i) => sparkle(ctx, cx + dx, cy + dy, r * 1.6, '#fff6c0', 0.45 + (Math.sin(t * 3 + i * 1.7) * 0.5 + 0.5) * 0.55));
    },
    // 日冕獅神：兩層放射的日冕加一圈太陽火環
    corona(ctx, cx, cy, L, t) {
      const g = ctx.createRadialGradient(cx, cy, 12, cx, cy, 44);
      g.addColorStop(0, 'rgba(255,236,140,0.7)');
      g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 44, 0, Math.PI * 2);
      ctx.fill();
      const rot = t * 0.25;
      A.shape(ctx, (c) => star(c, cx, cy, 36, 22, 12, rot), L.pal.ray || '#ff9a2a', L.pal.rayShade || '#e06a10', { cel: [3, 3], lw: 2.2, hl: false });
      A.shape(ctx, (c) => star(c, cx, cy, 29, 20, 12, rot + Math.PI / 12), L.pal.mane, L.pal.maneShade, { cel: [2.5, 2.5], lw: 2.1, hl: false });
      A.shape(ctx, (c) => ringPath(c, cx, cy, 20, 14, 5), '#fff3b0', '#ffd870', { cel: [2, 2], lw: 2 });
    },

    // ── 敏捷 ──
    // 忍鬃獅：包住頭的忍者頭巾，後面飄著兩條頭帶
    hood(ctx, cx, cy, L, t) {
      const band = L.pal.band || '#d8343a';
      const bandShade = L.pal.bandShade || '#a02024';
      [[0, 0], [1, 5]].forEach(([k, dy]) => {
        const w1 = Math.sin(t * 8 + k * 1.3) * 3;
        const w2 = Math.sin(t * 8 + 1.5 + k * 1.3) * 4;
        A.shape(ctx, (c) => {
          c.moveTo(cx - 14, cy - 10 + dy);
          c.quadraticCurveTo(cx - 26, cy - 14 + dy + w1, cx - 42 + k * 4, cy - 10 + dy * 1.6 + w2);
          c.lineTo(cx - 40 + k * 4, cy - 4 + dy * 1.6 + w2);
          c.quadraticCurveTo(cx - 26, cy - 7 + dy + w1, cx - 14, cy - 4 + dy);
          c.closePath();
        }, k ? bandShade : band, k ? null : bandShade, { cel: [1, 1.5], lw: 2, hl: false });
      });
      A.shape(ctx, (c) => {
        c.ellipse(cx + 2, cy, 23, 21.5, 0, 0, Math.PI * 2);
        c.moveTo(cx - 16, cy + 12);
        c.quadraticCurveTo(cx - 26, cy + 18, cx - 30, cy + 24);
        c.quadraticCurveTo(cx - 18, cy + 24, cx - 6, cy + 18);
      }, L.pal.mane, L.pal.maneShade, { cel: [3, 3], lw: 2.5 });
    },
    // 闇夜盜王：往後燒的黑色暗焰，邊緣透著紫光
    abyss(ctx, cx, cy, L, t) {
      const rim = L.pal.rim || '#a070ff';
      const sp = [[2.3, 26, 7], [2.8, 36, 8], [-2.95, 42, 9], [-2.5, 44, 9], [-2.05, 36, 8], [-1.6, 26, 7]];
      sp.forEach(([a, len, w], i) => {
        const bx = cx + Math.cos(a) * 10;
        const by = cy + Math.sin(a) * 10;
        const bend = (a > 0 ? 0.35 : -0.55) + Math.sin(t * 3 + i * 1.3) * 0.06;
        if (i % 2 === 0) {
          A.shape(ctx, (c) => spikePath(c, bx, by, a, len, w, bend), L.pal.mane, L.pal.maneShade, { cel: [2.5, 2.5], lw: 2.3, hl: false });
          return;
        }
        A.shape(ctx, (c) => spikePath(c, bx, by, a, len, w, bend), L.pal.mane, L.pal.maneShade, { cel: [2.5, 2.5], lw: 2.3, hl: false });
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = A.c(rim);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const tx = bx + Math.cos(a + bend) * len;
        const ty = by + Math.sin(a + bend) * len;
        const nx = -Math.sin(a) * w;
        const ny = Math.cos(a) * w;
        const mx = bx + Math.cos(a + bend * 0.4) * len * 0.55;
        const my = by + Math.sin(a + bend * 0.4) * len * 0.55;
        ctx.moveTo(bx - nx * 0.6 + (mx - bx) * 0.3, by - ny * 0.6 + (my - by) * 0.3);
        ctx.quadraticCurveTo(mx - nx * 0.45, my - ny * 0.45, tx + (bx - tx) * 0.1, ty + (by - ty) * 0.1);
        ctx.stroke();
        ctx.restore();
      });
      A.shape(ctx, (c) => star(c, cx, cy, 23, 16, 10, 0.25), L.pal.mane, L.pal.maneShade, { cel: [3, 3], lw: 2.4, hl: false });
    },


    // ── 五轉 ──
    // 星楓獅王：柔和的一圈光做成的鬃毛，後面浮著一道淡淡的光環
    radiant(ctx, cx, cy, L, t) {
      A.shape(ctx, (c) => ringPath(c, cx, cy, 21, 9, 8), L.pal.mane, L.pal.maneShade, { cel: [2.5, 2.5], lw: 2.2, hl: false });
    },
  };

  // 柔光圓盤（用 A.c 上色，各種顏色模式都跟著變）
  function glowDisc(ctx, x, y, r, col, alpha) {
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, A.c(col));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }  // 神靈的光：頭後一大片柔光，加一圈細細的光環
  function spiritHalo(ctx, cx, cy, L, t, ring) {
    const P = L.pal;
    glowDisc(ctx, cx, cy, 46, P.aura || '#fff4c0', 0.7 + Math.sin(t * 2) * 0.1);
    if (!ring) return;
    // 會慢慢轉動的光環：金環、一圈長短交錯的光芒，環上四片小星楓葉
    const rot = t * 0.5;
    const gold = A.c(P.halo || '#f5c040');
    ctx.save();
    ctx.globalAlpha *= 0.9;
    ctx.fillStyle = gold;
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = rot + (k / 16) * Math.PI * 2;
      const r1 = ring + (k % 2 ? 4.5 : 8);
      const cs = Math.cos(a);
      const sn = Math.sin(a);
      ctx.moveTo(cx + cs * (ring + 1) - sn * 1.6, cy + sn * (ring + 1) + cs * 1.6);
      ctx.lineTo(cx + cs * r1, cy + sn * r1);
      ctx.lineTo(cx + cs * (ring + 1) + sn * 1.6, cy + sn * (ring + 1) - cs * 1.6);
    }
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(cx, cy, ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = A.c(P.haloRing || '#fffbe6');
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = A.c(P.leaf || '#ffd35a');
    for (let k = 0; k < 4; k++) {
      const a = rot + (k / 4) * Math.PI * 2 + Math.PI / 16;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * ring, cy + Math.sin(a) * ring);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      A.mapleLeafPath(ctx, 0, 0, 5.5);
      ctx.fill();
      ctx.strokeStyle = A.c(P.halo || '#f5c040');
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  // 頭頂的星楓葉：一大兩小
  function spiritSprig(ctx, L, x, y, t) {
    const P = L.pal;
    glowDisc(ctx, x, y - 4, 16, P.aura || '#fff4c0', 0.8);
    [[-7, 2, -0.6, 6], [7, 2, 0.6, 6], [0, -3, 0, 9.5]].forEach(([dx, dy, rot, sz], i) => {
      ctx.save();
      ctx.translate(x + dx, y + dy + Math.sin(t * 2 + i) * 0.6);
      ctx.rotate(rot);
      A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, sz), P.leaf || '#ffd35a', P.leafShade || '#f0a830', { cel: [1, 1], lw: 1.8, hl: false });
      A.shape(ctx, (c) => A.mapleLeafPath(c, 0, -sz * 0.05, sz * 0.45), P.leafCore || '#fff6d0', null, { noStroke: true, hl: false });
      ctx.restore();
    });
  }
  // 背上的光翼：三根圓潤的長羽，遠側那扇不描邊、淡一點
  // 背上的光翼：像教堂的彩繪玻璃，三根圓潤的長羽，每根分成兩塊玻璃，中間用金色的鉛條隔開
  const SPIRIT_FEATHERS = [[-3.05, 34], [-2.62, 46], [-2.2, 52]];
  const GLASS = [['#4ad6a0', '#5a9aff'], ['#ffcc4a', '#b07cff'], ['#ff6a7a', '#ffcc4a']];
  function spiritWings(ctx, L, x, y, t) {
    const P = L.pal;
    const glass = L.glass || GLASS;
    const lead = A.c(P.lead || '#f0c860');
    const flap = Math.sin(t * 2.4) * 0.09;
    [[6, 0.82, true], [-2, 1, false]].forEach(([dx, sc, far]) => {
      ctx.save();
      ctx.translate(x + dx, y);
      ctx.rotate(flap * (far ? 0.6 : 1));
      ctx.scale(sc, sc);
      if (far) ctx.globalAlpha *= 0.65;
      glowDisc(ctx, -24, -24, 44, P.aura || '#fff4c0', 0.7);
      SPIRIT_FEATHERS.forEach(([a, len], i) => {
        const rx = len * 0.5;
        const ry = 9;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(rx, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = A.c(glass[i][0]);
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = A.c(glass[i][1]);
        ctx.fillRect(rx, -ry, rx + 1, ry * 2);
        // 光透過玻璃的亮面
        ctx.globalAlpha *= 0.45;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(rx * 0.95, -ry * 0.35, rx * 0.7, ry * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = lead;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(rx, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.moveTo(rx, -ry);
        ctx.lineTo(rx, ry);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    });
  }

  // 攀爬（背面）時，鬃毛在圓環後面多畫的部分；對稱版
  const BACKMANE = {
    blades(ctx, cx, cy, L) {
      [-2.6, -2.1, -1.57, -1.04, -0.54, 3.5, -0.1].forEach((a) => sword(ctx, cx, cy, a, 10, 38, 3.4, L));
    },
    dragon(ctx, cx, cy, L) {
      [-2.5, -1.95, -1.19, -0.64].forEach((a) => A.shape(ctx, (c) => spikePath(c, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, a, 36, 9, 0), L.pal.mane, L.pal.maneShade, { cel: [2, 2], lw: 2.3, hl: false }));
    },
    fire(ctx, cx, cy, L, t) {
      [-2.7, -2.2, -1.57, -0.94, -0.44].forEach((a, i) => {
        const bx = cx + Math.cos(a) * 14;
        const by = cy + Math.sin(a) * 14;
        const tx = bx + Math.cos(a) * 12 + Math.sin(t * 7 + i) * 3;
        const ty = by - 22;
        A.shape(ctx, (c) => flamePath(c, bx, by, tx, ty, 7), L.pal.mane, L.pal.maneShade, { cel: [2, 2], lw: 2.2, hl: false });
        A.shape(ctx, (c) => flamePath(c, bx, by, bx + (tx - bx) * 0.6, by + (ty - by) * 0.6, 3.8), L.pal.flame || '#ffd84a', null, { noStroke: true, hl: false });
      });
    },
    frost(ctx, cx, cy, L) {
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI + (i / 6) * Math.PI;
        A.shape(ctx, (c) => spikePath(c, cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, a, i % 2 ? 22 : 30, 6, 0), L.pal.mane, L.pal.maneShade, { lw: 2.2, hl: false });
      }
    },
    moonstar(ctx, cx, cy, L) {
      A.shape(ctx, (c) => crescentPath(c, cx, cy - 24, 15, 0, -8, 12.5), L.pal.moon || '#ffe680', L.pal.moonShade || '#e8b830', { cel: [2, 2], lw: 2.4, hl: false });
    },
    corona(ctx, cx, cy, L, t) {
      MANE.corona(ctx, cx, cy, L, t);
    },
    abyss(ctx, cx, cy, L) {
      A.shape(ctx, (c) => star(c, cx, cy, 36, 20, 9, -Math.PI / 2), L.pal.mane, L.pal.maneShade, { cel: [3, 3], lw: 2.4, hl: false });
    },
    radiant(ctx, cx, cy, L, t) {
      spiritHalo(ctx, cx, cy - 4, L, t, 31);
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
    // 劍尾：尾巴末端是一把小劍
    sword(ctx, L) {
      ctx.save();
      ctx.rotate(-0.25);
      sword(ctx, 0, 6, -Math.PI / 2, 0, 24, 3.4, L);
      A.ellipse(ctx, 0, 7, 3, 3, L.pal.guard || '#ffcf3a', L.pal.guardShade || '#d09010', { lw: 1.8, hl: false });
      ctx.restore();
    },
    // 龍尾：金色的槍尖
    spade(ctx, L) {
      A.shape(ctx, (c) => {
        c.moveTo(0, -18);
        c.quadraticCurveTo(6, -10, 8, -2);
        c.lineTo(3, -3);
        c.lineTo(2, 4);
        c.lineTo(-2, 4);
        c.lineTo(-3, -3);
        c.lineTo(-8, -2);
        c.quadraticCurveTo(-6, -10, 0, -18);
        c.closePath();
      }, L.pal.trim || '#ffcf3a', L.pal.trimShade || '#c88a10', { cel: [1.5, 1.5], lw: 2.2, hl: false });
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-1, -14);
      ctx.lineTo(-1, -4);
      ctx.stroke();
    },
    flame(ctx, L, t) {
      const sw = Math.sin(t * 7) * 3;
      A.shape(ctx, (c) => flamePath(c, 0, 2, sw - 3, -19, 7), L.pal.mane, L.pal.maneShade, { cel: [1.5, 1.5], lw: 2.2, hl: false });
      A.shape(ctx, (c) => flamePath(c, 0, 2, sw * 0.6 - 2, -9, 3.6), L.pal.flame || '#ffd84a', null, { noStroke: true, hl: false });
    },
    snowflake(ctx, L, t) {
      ctx.save();
      ctx.translate(0, -5);
      ctx.rotate(t * 0.8);
      ctx.lineCap = 'round';
      [[A.outline(), 6], [A.c(L.pal.mane), 3.2], [A.c('#ffffff'), 1.2]].forEach(([col, lw]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const x = Math.cos(a);
          const y = Math.sin(a);
          ctx.moveTo(0, 0);
          ctx.lineTo(x * 10, y * 10);
          ctx.moveTo(x * 6 + Math.cos(a + 0.9) * 3.5, y * 6 + Math.sin(a + 0.9) * 3.5);
          ctx.lineTo(x * 6, y * 6);
          ctx.lineTo(x * 6 + Math.cos(a - 0.9) * 3.5, y * 6 + Math.sin(a - 0.9) * 3.5);
        }
        ctx.stroke();
      });
      ctx.restore();
    },
    // 風尾：兩道捲起來的風
    gust(ctx, L, t) {
      const f = Math.sin(t * 8) * 1.5;
      [[0, 0, 1], [-3, 5, 0.7]].forEach(([dx, dy, s]) => {
        A.shape(ctx, (c) => {
          c.moveTo(dx + 2 * s, dy + 4 * s);
          c.bezierCurveTo(dx - 12 * s, dy - 2 * s, dx - 2 * s, dy - 18 * s + f, dx + 10 * s, dy - 12 * s + f);
          c.bezierCurveTo(dx + 2 * s, dy - 12 * s, dx - 4 * s, dy - 6 * s, dx + 6 * s, dy + 2 * s);
          c.closePath();
        }, L.pal.mane, L.pal.maneShade, { cel: [1.5, 1.5], lw: 2.1, hl: false });
      });
    },
    kunai(ctx, L) {
      ctx.save();
      ctx.rotate(-0.3);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 7, 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = A.c('#b8c4d6');
      ctx.lineWidth = 1.6;
      ctx.stroke();
      A.shape(ctx, (c) => A.roundRect(c, -1.8, -4, 3.6, 8, 1), L.pal.band || '#d8343a', null, { lw: 2, hl: false });
      A.shape(ctx, (c) => {
        c.moveTo(0, -20);
        c.lineTo(5, -8);
        c.lineTo(1.6, -4);
        c.lineTo(-1.6, -4);
        c.lineTo(-5, -8);
        c.closePath();
      }, '#dde6f2', '#8c9ab2', { lw: 2.1, hl: false, shadeY: -20, cel: [1.5, 0] });
      ctx.restore();
    },
    // 盜王的尾巴：一把新月形的彎刃
    crescent(ctx, L, t) {
      ctx.save();
      ctx.rotate(-0.5 + Math.sin(t * 2) * 0.1);
      ctx.save();
      ctx.shadowColor = L.pal.rim || '#a070ff';
      ctx.shadowBlur = 8;
      A.shape(ctx, (c) => crescentPath(c, 0, -8, 11, 5, -3, 9), L.pal.moon || '#f0e6ff', L.pal.moonShade || '#b8a0e8', { cel: [1.5, 1.5], lw: 2.2, hl: false });
      ctx.restore();
      ctx.restore();
    },
    // 星楓獅王：普通的尾巴毛球，末端帶一點柔光
    glow(ctx, L, t) {
      glowDisc(ctx, 0, -2, 15, L.pal.aura || '#fff4c0', 0.8 + Math.sin(t * 3) * 0.15);
      A.ellipse(ctx, 0, -2, 5.5, 5.5, L.pal.tuft, L.pal.tuftShade, { lw: 2, hl: [-1.5, -3.5, 1.6, 1.1] });
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

  // ════════ 形態配件 ════════
  function pathPts(c, pts) {
    pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath();
  }
  function upperBody(c, bx, by, rx, ry, cut) {
    const a = Math.asin(Math.max(-0.95, Math.min(0.95, cut / ry)));
    c.ellipse(bx, by, rx, ry, 0, Math.PI + a, Math.PI * 2 - a, false);
    c.closePath();
  }
  // 背甲：steel 鋼板 / knight 騎士披布加銀甲 / dragon 龍鱗甲加背刺
  function drawArmor(ctx, L, bx, by) {
    const rx = L.bodyRx + 1.5;
    const ry = L.bodyRy + 1.5;
    const P = L.pal;
    if (L.armor === 'knight') {
      A.shape(ctx, (c) => {
        c.moveTo(bx - rx + 1, by - 2);
        for (let k = 0; k <= 5; k++) {
          const x = bx - rx + 1 + k * ((rx * 2 - 12) / 5);
          c.quadraticCurveTo(x - 3, by + 11, x, by + 7);
        }
        c.lineTo(bx + rx - 10, by - 2);
        c.closePath();
      }, P.cloth || '#3a64c8', P.clothShade || '#27469a', { shadeY: by + 4, lw: 2.2 });
      ctx.strokeStyle = A.c(P.trim || '#ffcf3a');
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bx - rx + 3, by + 3);
      ctx.lineTo(bx + rx - 12, by + 3);
      ctx.stroke();
    }
    if (L.armor === 'dragon') {
      [-14, -5, 4].forEach((dx, i) => {
        const x = bx + dx;
        const y = by - ry * Math.sqrt(Math.max(0, 1 - (dx / rx) * (dx / rx)));
        A.shape(ctx, (c) => pathPts(c, [[x - 4.5, y + 3], [x - 5 - i * 0.5, y - 8 - (i === 1 ? 2 : 0)], [x + 4.5, y + 2]]), P.trim || '#ffcf3a', P.trimShade || '#c88a10', { lw: 2, hl: false, cel: [1, 1] });
      });
    }
    const plate = L.armor === 'dragon' ? [P.mane, P.maneShade] : [P.plate || '#c4d0e0', P.plateShade || '#7e8ca2'];
    const cut = L.armor === 'knight' ? 1 : -1.5;
    A.shape(ctx, (c) => upperBody(c, bx, by, rx, ry, cut), plate[0], plate[1], { cel: [2, 2.5], lw: 2.4, hl: [bx - 6, by - ry + 4, 6, 2] });
    const edge = (col, lw) => {
      ctx.strokeStyle = A.c(col);
      ctx.lineWidth = lw;
      ctx.beginPath();
      const a = Math.asin(cut / ry);
      ctx.ellipse(bx, by, rx - 3, ry - 3, 0, Math.PI + a + 0.12, Math.PI * 2 - a - 0.12, false);
      ctx.stroke();
    };
    if (L.armor === 'steel') {
      edge('#eef4ff', 1.4);
      ctx.fillStyle = A.c('#5c6a80');
      [-14, -5, 4].forEach((dx) => {
        ctx.beginPath();
        ctx.arc(bx + dx, by - 1, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      edge(P.trim || '#ffcf3a', 2);
      if (L.armor === 'dragon') {
        ctx.strokeStyle = A.c(P.maneShade);
        ctx.lineWidth = 1.3;
        [[-12, -6], [-4, -8], [4, -6], [-8, -1], [0, -1]].forEach(([dx, dy]) => {
          ctx.beginPath();
          ctx.arc(bx + dx, by + dy, 3.5, 0.2, Math.PI - 0.2);
          ctx.stroke();
        });
      }
    }
  }
  // 龍翼（在身體後面）
  function dragonWings(ctx, L, x, y, t) {
    const flap = Math.sin(t * 4) * 0.12;
    [[4, 0.78, 0.25], [-2, 1, 0]].forEach(([dx, s, dk]) => {
      ctx.save();
      ctx.translate(x + dx, y);
      ctx.rotate(-0.15 + flap * (dk ? 0.6 : 1));
      ctx.scale(s, s);
      A.shape(ctx, (c) => {
        c.moveTo(2, 2);
        c.lineTo(-8, -24);
        c.lineTo(-4, -38);
        c.quadraticCurveTo(-12, -28, -24, -34);
        c.quadraticCurveTo(-24, -22, -36, -18);
        c.quadraticCurveTo(-22, -12, -16, 2);
        c.quadraticCurveTo(-8, -4, 2, 2);
        c.closePath();
      }, U.mix(L.pal.mane, '#000000', dk), U.mix(L.pal.maneShade, '#000000', dk), { cel: [2, 2], lw: 2.4, hl: false });
      ctx.strokeStyle = A.c(U.mix(L.pal.trim || '#ffcf3a', '#000000', dk));
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-8, -24);
      ctx.lineTo(-4, -36);
      ctx.moveTo(-8, -24);
      ctx.lineTo(-22, -32);
      ctx.moveTo(-8, -24);
      ctx.lineTo(-33, -18);
      ctx.stroke();
      ctx.restore();
    });
  }
  // 盜王披風：後面一大片往後飄、下擺破碎；近側再垂一片蓋住背
  function capeBack(ctx, L, hx, hy, bx, by, t) {
    const w = Math.sin(t * 3) * 2.5;
    const w2 = Math.sin(t * 3 + 1.2) * 3;
    const rx = L.bodyRx;
    const path = (c) => {
      c.moveTo(hx - 8, hy + 4);
      c.quadraticCurveTo(bx - 2, by - L.bodyRy - 22 + w, bx - rx - 20, by - 18 + w);
      c.lineTo(bx - rx - 28 + w2, -10 + w2 * 0.5);
      c.lineTo(bx - rx - 13 + w2 * 0.6, -14);
      c.lineTo(bx - rx - 12 + w2 * 0.5, -3);
      c.lineTo(bx - rx - 3, -11);
      c.lineTo(bx - rx + 2, -2);
      c.lineTo(bx - rx + 8, -10);
      c.lineTo(bx - 4, -6);
      c.lineTo(hx - 12, hy + 18);
      c.closePath();
    };
    ctx.save();
    ctx.translate(-3, 3);
    A.shape(ctx, path, L.pal.lining || '#b01c3c', L.pal.liningShade || '#7a1028', { cel: [2, 2], lw: 2.3, hl: false });
    ctx.restore();
    A.shape(ctx, path, L.pal.cape || '#2a1d40', L.pal.capeShade || '#170f26', { cel: [3, 3], lw: 2.4, hl: false });
  }
  function capeFront(ctx, L, hx, hy, bx, by, t) {
    const w = Math.sin(t * 3 + 0.5) * 1.5;
    const rx = L.bodyRx;
    const ry = L.bodyRy;
    const path = (c) => {
      c.moveTo(hx - 6, hy + 8);
      c.quadraticCurveTo(bx - 2, by - ry - 9, bx - rx - 7, by - 6 + w);
      c.lineTo(bx - rx - 2, by + 6 + w);
      c.lineTo(bx - rx + 5, by);
      c.lineTo(bx - rx + 11, by + 7 + w);
      c.lineTo(bx - rx + 17, by + 1);
      c.lineTo(bx - rx + 23, by + 6 + w);
      c.lineTo(bx + 4, by - 1);
      c.lineTo(hx - 4, hy + 20);
      c.closePath();
    };
    A.shape(ctx, path, L.pal.cape || '#2a1d40', L.pal.capeShade || '#170f26', { cel: [2.5, 2.5], lw: 2.4, hl: false });
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = A.c(L.pal.rim || '#a070ff');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(hx - 12, hy + 8);
    ctx.quadraticCurveTo(bx - 4, by - ry - 6, bx - rx - 4, by - 5 + w);
    ctx.stroke();
    ctx.restore();
  }
  // 新月胸針
  function moonClasp(ctx, L, x, y) {
    A.shape(ctx, (c) => crescentPath(c, x, y, 6, 3, -2.5, 5), L.pal.clasp || '#ffd84a', L.pal.claspShade || '#c89a10', { lw: 2, hl: false, cel: [1, 1] });
  }
  // 暗影王冠：鋸齒狀的黑冠，紫色描邊、紅寶石
  function shadowCrown(ctx, L, hx, hy, t) {
    ctx.save();
    ctx.translate(hx - 1, hy - 17);
    ctx.rotate(-0.12);
    const pts = [[-15, 3], [-15, -3], [-20, -16], [-10, -7], [-9, -22], [-3.5, -9], [0, -31], [3.5, -9], [9, -23], [10.5, -7], [20, -17], [15, -3], [15, 3]];
    ctx.save();
    ctx.shadowColor = A.c(L.pal.rim || '#a070ff');
    ctx.shadowBlur = 7 + Math.sin(t * 3) * 3;
    A.shape(ctx, (c) => pathPts(c, pts), L.pal.crown || '#2a1f3a', L.pal.crownShade || '#140c20', { cel: [2, 2], lw: 2.3, hl: false });
    ctx.restore();
    ctx.strokeStyle = A.c(L.pal.crownEdge || '#d8c4ff');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.slice(1, -1).forEach((p, i) => {
      const q = [p[0] * 0.88, p[1] * 0.88 + 0.5];
      i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
    });
    ctx.stroke();
    A.shape(ctx, (c) => A.roundRect(c, -15, -2, 30, 5.5, 2), L.pal.crown || '#2a1f3a', null, { lw: 2, hl: false });
    [[-10, 0.8], [10, 0.8]].forEach(([x, y]) => A.ellipse(ctx, x, y, 2.4, 2.4, L.pal.gem || '#ff2a4a', null, { lw: 1.5, hl: [x - 0.8, y - 0.8, 0.8, 0.6] }));
    ctx.restore();
  }
  // 蓋住頭頂的忍者頭巾與額帶
  function hoodTop(ctx, L, hx, hy) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(hx, hy, 20.6, 19.1, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = A.c(L.pal.mane);
    ctx.fillRect(hx - 30, hy - 30, 60, 17);
    ctx.fillStyle = A.c(L.pal.band || '#d8343a');
    ctx.fillRect(hx - 30, hy - 14, 60, 6);
    ctx.fillStyle = A.c(L.pal.bandShade || '#a02024');
    ctx.fillRect(hx - 30, hy - 10, 60, 2);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx - 30, hy - 14);
    ctx.lineTo(hx + 30, hy - 14);
    ctx.moveTo(hx - 30, hy - 8);
    ctx.lineTo(hx + 30, hy - 8);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 19, 17.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // 額當
    A.shape(ctx, (c) => A.roundRect(c, hx + 3, hy - 15.5, 11, 8, 2), '#c8d2e0', '#8a98ae', { shadeY: hy - 10, lw: 2, hl: false });
    ctx.strokeStyle = A.c('#5a6478');
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy - 13.5);
    ctx.lineTo(hx + 11, hy - 9.5);
    ctx.moveTo(hx + 11, hy - 13.5);
    ctx.lineTo(hx + 6, hy - 9.5);
    ctx.stroke();
  }
  // 蓋住嘴巴的面罩
  function faceMask(ctx, L, hx, hy) {
    A.shape(ctx, (c) => {
      c.moveTo(hx - 9, hy + 2);
      c.quadraticCurveTo(hx + 6, hy - 0.5, hx + 21, hy + 1);
      c.quadraticCurveTo(hx + 22, hy + 12, hx + 12, hy + 15.5);
      c.quadraticCurveTo(hx - 1, hy + 18, hx - 11, hy + 10);
      c.closePath();
    }, L.pal.mane, L.pal.maneShade, { cel: [1.5, 2], lw: 2.2, hl: false });
    ctx.strokeStyle = A.c(L.pal.maneShade);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(hx + 4, hy + 6);
    ctx.quadraticCurveTo(hx + 12, hy + 8, hx + 18, hy + 6);
    ctx.stroke();
  }
  // 盜賊眼罩
  function eyeMask(ctx, L, hx, hy, t) {
    const col = L.pal.mask || '#1e1430';
    const fl = Math.sin(t * 7) * 2;
    A.shape(ctx, (c) => {
      c.moveTo(hx - 17, hy - 5);
      c.quadraticCurveTo(hx - 26, hy - 9 + fl, hx - 31, hy - 5 + fl);
      c.lineTo(hx - 27, hy - 1 + fl);
      c.quadraticCurveTo(hx - 30, hy + 3 + fl, hx - 25, hy + 5 + fl);
      c.quadraticCurveTo(hx - 21, hy + 1, hx - 16, hy + 1);
      c.closePath();
    }, col, null, { lw: 2, hl: false });
    A.shape(ctx, (c) => {
      c.moveTo(hx - 17, hy - 8);
      c.quadraticCurveTo(hx + 4, hy - 13, hx + 19, hy - 10);
      c.lineTo(hx + 19.5, hy + 1);
      c.quadraticCurveTo(hx + 8, hy + 3, hx - 17, hy + 2);
      c.closePath();
    }, col, null, { lw: 2.2, hl: false });
    ctx.fillStyle = A.c(L.pal.cream);
    [[hx + 2, hy - 3, 4.9, 6.1], [hx + 12, hy - 4, 4.6, 5.9]].forEach(([x, y, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // 環繞的星星（前後兩層，back=true 畫在頭後面）
  function orbitStars(ctx, hx, hy, t, back) {
    for (let i = 0; i < 3; i++) {
      const a = t * 1.4 + (i / 3) * Math.PI * 2;
      const s = Math.sin(a);
      if ((s < 0) !== back) continue;
      const x = hx - 3 + Math.cos(a) * 30;
      const y = hy - 6 + s * 9;
      const r = 4.5 + s * 1.2;
      A.shape(ctx, (c) => star(c, x, y, r, r * 0.45, 5, -Math.PI / 2 + t), '#ffe066', '#e8b020', { lw: 1.6, hl: false, shadeY: y + 1 });
    }
  }
  // 粒子：embers 火星 / snow 雪花 / wisps 暗影 / wind 風痕
  function particles(ctx, L, t, hx, hy, bx, by, layer) {
    if (L.fx === 'wind' && layer === 'back') {
      ctx.save();
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      [[-12, 0], [-24, 0.35], [-4, 0.7]].forEach(([dy, ph]) => {
        const k = (t * 1.6 + ph) % 1;
        const x0 = bx - L.bodyRx - 4 - k * 22;
        ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8;
        ctx.beginPath();
        ctx.moveTo(x0, by + dy + 4);
        ctx.quadraticCurveTo(x0 - 8, by + dy + 2, x0 - 16, by + dy + 4);
        ctx.stroke();
      });
      ctx.restore();
    }
    if (L.fx === 'embers' && layer === 'front') {
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.7 + i / 6) % 1;
        const x = hx - 14 - (i % 3) * 7 + Math.sin(k * 6 + i) * 3;
        const y = hy - 18 - k * 30;
        ctx.globalAlpha = (1 - k) * 0.95;
        ctx.fillStyle = A.c(i % 2 ? '#ffd84a' : '#ff7a2a');
        ctx.beginPath();
        ctx.arc(x, y, 1.8 + (1 - k) * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (L.fx === 'snow' && layer === 'front') {
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.25 + i / 6) % 1;
        const x = -34 + i * 13 + Math.sin(t * 1.5 + i) * 4;
        const y = hy - 34 + k * 70;
        sparkle(ctx, x, y, 3, '#ffffff', Math.sin(k * Math.PI) * 0.9);
      }
    }
    if (L.fx === 'aura' && layer === 'back') {
      glowDisc(ctx, bx + 4, by - 12, 64, L.pal.aura || '#fff4c0', 0.5 + Math.sin(t * 1.6) * 0.08);
      spiritHalo(ctx, hx - 3, hy - 8, L, t, 33);
    }
    if (L.fx === 'wisps' && layer === 'back') {
      ctx.save();
      const n = 6;
      for (let i = 0; i < n; i++) {
        const k = (t * 0.45 + i / n + (layer === 'back' ? 0 : 0.5)) % 1;
        const x = (layer === 'back' ? -44 + ((i * 17) % 60) : hx - 30 + i * 8) - k * 12;
        const y = (layer === 'back' ? -4 : hy + 8) - k * 40;
        const s = 3 + (1 - k) * 3;
        ctx.globalAlpha = Math.sin(k * Math.PI) * 0.7;
        ctx.fillStyle = A.c(i % 2 ? L.pal.rim || '#a070ff' : L.pal.wisp || '#5a3a8a');
        ctx.beginPath();
        flamePath(ctx, x, y, x - 3 + Math.sin(t * 5 + i) * 2, y - s * 3, s);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 精修版（look.hd）：目前只有 base / magic1 / might3 / agile4 開啟，其他形態完全走舊的畫法。
  // 原則：保留 Q 版比例與大眼睛，加兩階賽璐璐陰影、受光側柔和邊光、肚子的反光、
  // 一簇簇有內陰影與高光毛束的鬃毛、上細下粗的描邊、會落後一拍的鬃毛與尾巴。
  // 光從左上來（和全遊戲一致），陰影落在右下。
  // ════════════════════════════════════════════════════════════════
  const TAU = Math.PI * 2;

  // 每個形態算一次的衍生色（存在 look 物件上，不會每幀重算字串）
  function hdPal(L) {
    if (L._hd) return L._hd;
    const P = L.pal;
    const hd = typeof L.hd === 'string' ? L.hd : 'base';
    L._hd = {
      mood: hd,
      rim: P.rim ? U.mix(P.rim, '#ffffff', 0.25) : U.mix(P.body, '#ffffff', 0.6),
      rimA: P.rim ? 0.75 : 0.85,
      bounce: U.mix(P.bodyShade, P.cream, 0.55),
      furLine: U.mix(P.bodyShade, '#000000', 0.18),
      maneHi: U.mix(P.mane, '#ffffff', hd === 'agile' ? 0.18 : 0.42),
      maneDeep: U.mix(P.maneShade, '#000000', 0.28),
      maneBack: U.mix(P.mane, P.maneShade, 0.7),
      maneBackShade: U.mix(P.maneShade, '#000000', 0.22),
      creamShade: U.mix(P.cream, P.bodyShade, 0.45),
      toe: U.mix(P.bodyShade, A.OUT, 0.45),
      farToe: U.mix(P.farLegShade, A.OUT, 0.45),
      pad: hd === 'agile' ? '#c86a9a' : '#ff9e8e',
      iris: L.hdIris || ['#5a2c14', '#c07a34'],
    };
    return L._hd;
  }
  // 先描邊再填色：同一顏色的多個子形狀合成一個輪廓，裡面不會有接縫線
  // inner(ctx)：還在同一個裁切範圍裡要多畫的東西（例如鬃毛根部的內陰影），省一次 clip
  function unionShape(ctx, path, fill, shade, lw, cel, inner) {
    ctx.beginPath();
    path(ctx);
    if (lw) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = lw * 2;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
    }
    ctx.fillStyle = A.c(shade || fill);
    ctx.fill();
    if (shade) {
      ctx.save();
      ctx.clip();
      ctx.translate(-cel[0], -cel[1]);
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(fill);
      ctx.fill();
      ctx.translate(cel[0], cel[1]);
      if (inner) inner(ctx);
      ctx.restore();
    }
  }
  // 兩端不同粗細的膠囊（兩圓的外公切線）
  function taper(c, x0, y0, r0, x1, y1, r1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const d = Math.hypot(dx, dy) || 0.01;
    const a = Math.atan2(dy, dx);
    const off = Math.acos(Math.max(-1, Math.min(1, (r0 - r1) / d)));
    c.moveTo(x1 + Math.cos(a - off) * r1, y1 + Math.sin(a - off) * r1);
    c.arc(x1, y1, r1, a - off, a + off, false);
    c.lineTo(x0 + Math.cos(a + off) * r0, y0 + Math.sin(a + off) * r0);
    c.arc(x0, y0, r0, a + off, a - off, false);
    c.closePath();
  }
  // 火舌／煙尾：圓底、往 (tx,ty) 收成尖角，curl 讓它彎
  function tonguePath(c, bx, by, tx, ty, w, curl) {
    const dx = tx - bx;
    const dy = ty - by;
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d;
    const ny = dx / d;
    const mx = bx + dx * 0.5 + nx * curl;
    const my = by + dy * 0.5 + ny * curl;
    c.moveTo(bx - nx * w, by - ny * w);
    c.quadraticCurveTo(mx - nx * w * 0.95, my - ny * w * 0.95, tx, ty);
    c.quadraticCurveTo(mx + nx * w * 0.7, my + ny * w * 0.7, bx + nx * w, by + ny * w);
    c.quadraticCurveTo(bx - (dx / d) * w * 1.25, by - (dy / d) * w * 1.25, bx - nx * w, by - ny * w);
    c.closePath();
  }
  // 一簇毛：粗根、圓圓的毛尖（整圈看起來還是原本那種圓滾滾的波浪輪廓）
  function clumpPath(c, bx, by, tx, ty, w) {
    taper(c, bx, by, w * 0.92, tx, ty, w * 0.6);
  }
  // 從毛束中線上取一段、往受光側偏的高光毛絲
  // side 的正負會自動改成朝左上（受光側）
  function strand(c, bx, by, tx, ty, curl, f0, f1, side) {
    const dx = tx - bx;
    const dy = ty - by;
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d;
    const ny = dx / d;
    side = Math.abs(side) * (nx + ny < 0 ? 1 : -1);
    const P = (f) => {
      const b = 4 * f * (1 - f) * curl * 0.5;
      return [bx + dx * f + nx * (b + side), by + dy * f + ny * (b + side)];
    };
    const p0 = P(f0);
    const pm = P((f0 + f1) / 2);
    const p1 = P(f1);
    c.moveTo(p0[0], p0[1]);
    c.quadraticCurveTo(pm[0] * 2 - (p0[0] + p1[0]) / 2, pm[1] * 2 - (p0[1] + p1[1]) / 2, p1[0], p1[1]);
  }

  // ── 共用的腳 ──（之後其他形態也可以直接用）
  // 柔軟的上段肉 → 較細的小腿 → 圓腳掌加 2～3 條趾縫。後腳多一個小小的跗關節彎。
  // o = { hipX, hipY, px, py(腳掌底), w, len, fill, shade, toe, hind, far, squash(0..1 著地壓扁), tuck(0..1 抬腳彎曲), back(背面), pad }
  function hdLeg(ctx, o) {
    const w = o.w;
    const s = o.squash || 0;
    const prx = w * 0.6 * (1 + 0.22 * s);
    const pry = w * 0.4 * (1 - 0.24 * s);
    const tilt = o.back ? 0 : -(o.tuck || 0) * 0.45;
    const pcx = o.px + (o.back ? 0 : w * 0.1);
    const pcy = o.py - pry;
    const ax = o.px;
    const ay = pcy - pry * 0.2;
    const hx = o.hipX;
    const hy = o.hipY;
    const rest = o.len - pry * 1.2;
    const comp = Math.max(0, rest - Math.hypot(ax - hx, ay - hy));
    // 膝／跗關節：前腳往前拱一點，後腳往後折；腳抬起來越多，彎得越多
    let kx;
    let ky;
    let rTop;
    let rMid;
    const rLow = w * 0.34;
    if (o.back) {
      kx = (hx + ax) / 2;
      ky = (hy + ay) / 2;
      rTop = w * 0.56;
      rMid = w * 0.42;
    } else if (o.hind) {
      kx = hx + (ax - hx) * 0.55 - w * 0.3 - comp * 0.55;
      ky = hy + (ay - hy) * 0.6;
      rTop = w * 0.5;
      rMid = w * 0.36;
    } else {
      kx = hx + (ax - hx) * 0.5 + w * 0.06 + comp * 0.6;
      ky = hy + (ay - hy) * 0.5;
      rTop = w * 0.5;
      rMid = w * 0.4;
    }
    const legPath = (c) => {
      taper(c, hx, hy, rTop, kx, ky, rMid);
      taper(c, kx, ky, rMid, ax, ay, rLow);
      c.moveTo(pcx + prx, pcy);
      c.ellipse(pcx, pcy, prx, pry, tilt, 0, TAU);
    };
    const lw = o.far ? 1.05 : 1.2;
    // 上細下粗：整隻腳 lw，腳掌再加粗一次
    ctx.beginPath();
    ctx.ellipse(pcx, pcy + 0.4, prx, pry, tilt, 0, TAU);
    ctx.lineWidth = lw * 2 + 1.4;
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    // 遠側的腳大多藏在身體後面：只填一個較暗的顏色，不做陰影與趾縫
    unionShape(ctx, legPath, o.far ? U.mix(o.fill, o.shade, 0.35) : o.fill, o.far ? null : o.shade, lw, [1.6, 1.5]);
    if (o.far) return;
    // 上段肉的一點亮面
    {
      ctx.save();
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(hx - rTop * 0.35, hy - rTop * 0.1, rTop * 0.35, rTop * 0.55, -0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // 趾縫（或背面看到的肉球）
    if (o.back) {
      ctx.fillStyle = A.c(o.pad || '#ff9e8e');
      ctx.beginPath();
      ctx.ellipse(pcx, pcy + pry * 0.1, prx * 0.45, pry * 0.5, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = A.c(o.toe);
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const n = w >= 11 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const fx = n === 3 ? 0.05 + k * 0.3 : 0.18 + k * 0.36;
        const x = pcx + prx * fx;
        const c = Math.cos(tilt);
        const sn = Math.sin(tilt);
        const y0 = pry * 0.95;
        const y1 = pry * 0.15;
        ctx.moveTo(pcx + (x - pcx) * c - y0 * sn, pcy + (x - pcx) * sn + y0 * c);
        ctx.lineTo(pcx + (x - pcx) * c - y1 * sn, pcy + (x - pcx) * sn + y1 * c);
      }
      ctx.stroke();
    }
  }
  A.lionLeg = hdLeg;

  // 圓腳掌（攻擊時伸出去的前爪、攀爬時往上抓的爪）
  function hdPaw(ctx, L, x, y, r, rot, claws) {
    const D = hdPal(L);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => c.ellipse(0, 0, r * 1.12, r, 0, 0, TAU), L.pal.body, L.pal.bodyShade, { cel: [1.5, 1.5], lw: 2.4 });
    ctx.strokeStyle = A.c(D.toe);
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    [-0.4, 0.1, 0.6].forEach((f) => {
      ctx.moveTo(r * 1.05, f * r * 0.9);
      ctx.lineTo(r * 0.45, f * r * 0.75);
    });
    ctx.stroke();
    if (claws) {
      ctx.strokeStyle = A.c('#fff6e6');
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(r * 0.8, i * 3);
        ctx.lineTo(r * 0.8 + 5, i * 3.5);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // 受光側邊光（左上）＋ 肚子反光（下緣），都只畫在形狀裡面
  function litEdges(ctx, pathFn, x, y, rx, ry, rot, D, opt) {
    opt = opt || {};
    ctx.save();
    ctx.beginPath();
    pathFn(ctx);
    ctx.clip();
    ctx.lineCap = 'round';
    ctx.globalAlpha *= D.rimA;
    ctx.strokeStyle = A.c(D.rim);
    ctx.lineWidth = opt.rimW || 2.4;
    ctx.beginPath();
    ctx.ellipse(x + 1.4, y + 1.6, rx - 1.2, ry - 1.2, rot, Math.PI * (opt.r0 || 1.02), Math.PI * (opt.r1 || 1.62));
    ctx.stroke();
    if (opt.bounce !== false) {
      ctx.globalAlpha = (ctx.globalAlpha / D.rimA) * 0.7;
      ctx.strokeStyle = A.c(D.bounce);
      ctx.lineWidth = opt.bounceW || 2.6;
      ctx.beginPath();
      ctx.ellipse(x - 0.5, y - 2.2, rx - 2.2, ry - 1.4, rot, Math.PI * 0.2, Math.PI * 0.72);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 上細下粗的描邊：全圈 lwTop，下半圈再疊一條 lwBot
  function varOutline(ctx, x, y, rx, ry, rot, lwTop, lwBot) {
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = lwTop;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineWidth = lwBot;
    ctx.beginPath();
    ctx.ellipse(x, y, rx + (lwBot - lwTop) * 0.25, ry + (lwBot - lwTop) * 0.25, rot, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
  }
  // 一小撮毛尖（臉頰、胸口、尾巴末端），n 根，從 (x,y) 往角度 a 扇開
  function tufts(c, x, y, a, spread, n, len, w) {
    for (let i = 0; i < n; i++) {
      const b = a + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
      const l = len * (i % 2 ? 0.78 : 1);
      clumpPath(c, x, y, x + Math.cos(b) * l, y + Math.sin(b) * l, w, 1.2);
    }
  }

  // ── 身體 ── 橢圓＋兩階陰影＋邊光＋肚子反光＋背上幾筆毛流＋胸口的毛領
  function hdBody(ctx, L, bx, by, rx, ry, rot) {
    const P = L.pal;
    const D = hdPal(L);
    const path = (c) => c.ellipse(bx, by, rx, ry, rot, 0, TAU);
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(P.body);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = A.c(P.bodyShade);
    ctx.fillRect(-500, -500, 1000, 1000);
    ctx.beginPath();
    ctx.ellipse(bx - 3, by - 3.4, rx, ry, rot, 0, TAU);
    ctx.fillStyle = A.c(P.body);
    ctx.fill();
    // 肚子的奶油色，下緣有一點陰影
    ctx.beginPath();
    const crx = bx + 7 + (L.bodyRx - 21) * 0.3;
    ctx.ellipse(crx, by + 5, 10, 7, 0, 0, TAU);
    ctx.fillStyle = A.c(P.cream);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(crx, by + 8.5, 10, 4, 0, 0, Math.PI);
    ctx.fillStyle = A.c(D.creamShade);
    ctx.globalAlpha *= 0.45;
    ctx.fill();
    ctx.restore();
    litEdges(ctx, path, bx, by, rx, ry, rot, D, { r0: 1.0, r1: 1.55 });
    // 背上的毛流（陰影色的小勾）
    ctx.strokeStyle = A.c(D.furLine);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    [[-0.62, 0.35], [-0.2, 0.25], [0.25, 0.35]].forEach(([fx, fy]) => {
      const x = bx + rx * fx;
      const y = by + ry * fy;
      ctx.moveTo(x - 2.5, y - 1.5);
      ctx.quadraticCurveTo(x, y + 0.5, x + 2.5, y - 1.2);
    });
    ctx.stroke();
    varOutline(ctx, bx, by, rx, ry, rot, 2.4, 3.4);
  }
  // 胸口毛領：頭下方一圈奶油色的毛尖，k 越大越蓬（高轉抬頭挺胸）
  function hdRuff(ctx, L, bx, by, k) {
    const P = L.pal;
    const D = hdPal(L);
    const cx = bx + L.bodyRx * 0.62;
    const cy = by - L.bodyRy * 0.35;
    unionShape(ctx, (c) => {
      c.moveTo(cx + 7 * k, cy);
      c.ellipse(cx, cy, 7 * k, 6.5 * k, 0, 0, TAU);
      tufts(c, cx - 1, cy + 3 * k, Math.PI * 0.5, 1.5, 4, 7.5 * k, 2.6);
    }, P.cream, D.creamShade, 1.1, [1.2, 1.4]);
  }

  // 背面看到的後腦勺：一片鬃毛，中間一個小漩渦
  function hdBackCap(ctx, L, cx, cy) {
    const P = L.pal;
    const D = hdPal(L);
    // 不描邊，跟外圈的毛簇接在一起；右下一點陰影
    A.shape(ctx, (c) => c.ellipse(cx, cy, 17, 16, 0, 0, TAU), P.mane, P.maneShade, { cel: [2.2, 2.2], noStroke: true });
    ctx.strokeStyle = A.c(L.mane === 'abyss' ? P.rim || D.maneHi : D.maneHi);
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    [-2.5, -1.9, -1.2, -0.6].forEach((a) => {
      ctx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
      ctx.quadraticCurveTo(cx + Math.cos(a - 0.25) * 10, cy + Math.sin(a - 0.25) * 10, cx + Math.cos(a - 0.15) * 14, cy + Math.sin(a - 0.15) * 14);
    });
    ctx.stroke();
    ctx.strokeStyle = A.c(D.maneDeep);
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    [0.6, 1.5, 2.4].forEach((a) => {
      ctx.moveTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
      ctx.quadraticCurveTo(cx + Math.cos(a - 0.25) * 11, cy + Math.sin(a - 0.25) * 11, cx + Math.cos(a - 0.1) * 14.5, cy + Math.sin(a - 0.1) * 14.5);
    });
    ctx.stroke();
    ctx.globalAlpha /= 0.6;
  }

  // ── 頭 ── 臉頰毛尖在頭後面，頭本身兩階陰影＋邊光，上細下粗
  function hdHead(ctx, L, hx, hy) {
    const P = L.pal;
    const D = hdPal(L);
    unionShape(ctx, (c) => {
      tufts(c, hx - 13, hy + 9, Math.PI * 0.8, 1.0, 3, 8.5, 2.6);
      tufts(c, hx + 2, hy + 14, Math.PI * 0.55, 0.7, 2, 6, 2.3);
    }, P.body, P.bodyShade, 1.2, [1, 1.4]);
    const path = (c) => c.ellipse(hx, hy, 19, 17.5, 0, 0, TAU);
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(P.body);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = A.c(P.bodyShade);
    ctx.fillRect(-500, -500, 1000, 1000);
    ctx.beginPath();
    ctx.ellipse(hx - 3, hy - 3.8, 19, 17.5, 0, 0, TAU);
    ctx.fillStyle = A.c(P.body);
    ctx.fill();
    // 額頭柔和亮面
    ctx.globalAlpha *= 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(hx - 7, hy - 10, 6, 3.4, -0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    litEdges(ctx, path, hx, hy, 19, 17.5, 0, D, { r0: 0.95, r1: 1.55, bounce: false, rimW: 2.6 });
    varOutline(ctx, hx, hy, 19, 17.5, 0, 2.5, 3.4);
  }

  // ── 眼睛 ── 虹膜漸層、兩個高光、上眼瞼陰影；三條路線各自的神情
  function hdEye(ctx, L, x, y, rx, ry, kind, mood, t, near) {
    if (kind !== 'normal' && kind !== 'angry') {
      A.eye(ctx, x, y, rx, ry, kind, 1);
      return;
    }
    const D = hdPal(L);
    const agile = mood === 'agile';
    const ex = x + 1;
    const ery = agile ? ry * 0.86 : ry;
    const path = (c) => {
      if (agile) {
        // 上緣斜切：銳利一點，但還是圓的
        c.moveTo(ex - rx, y - ery * 0.35);
        c.quadraticCurveTo(ex - rx * 0.1, y - ery * 1.25, ex + rx, y - ery * 0.8);
        c.ellipse(ex, y, rx, ery, 0, -0.35, Math.PI + 0.3, false);
        c.closePath();
      } else {
        c.ellipse(ex, y, rx, ery, 0, 0, TAU);
      }
    };
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c('#241410');
    ctx.fill();
    ctx.clip();
    // 虹膜：下半部亮起來的漸層
    const g = ctx.createLinearGradient(0, y - ery * 0.2, 0, y + ery);
    g.addColorStop(0, A.c(D.iris[0]));
    g.addColorStop(1, A.c(D.iris[1]));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(ex + 0.3, y + ery * 0.22, rx * 0.86, ery * 0.72, 0, 0, TAU);
    ctx.fill();
    // 瞳孔
    ctx.fillStyle = A.c('#180c08');
    ctx.beginPath();
    ctx.ellipse(ex + 0.4, y + ery * 0.12, rx * (agile ? 0.32 : 0.46), ery * 0.5, 0, 0, TAU);
    ctx.fill();
    // 法術：虹膜發光（一圈亮色環，不用 shadowBlur）
    if (mood === 'magic') {
      const a0 = ctx.globalAlpha;
      ctx.strokeStyle = A.c(D.iris[2] || '#fff0a0');
      ctx.globalAlpha *= 0.55 + Math.sin(t * 4) * 0.2;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(ex + 0.3, y + ery * 0.26, rx * 0.66, ery * 0.52, 0, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.globalAlpha = a0;
    }
    // 上眼瞼陰影
    ctx.fillStyle = A.c('#120806');
    ctx.globalAlpha *= 0.45;
    ctx.beginPath();
    ctx.ellipse(ex, y - ery * (agile ? 1.02 : 1.3), rx * 1.3, ery * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 兩個高光（敏捷：細長的一道銳光）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (agile) {
      star(ctx, ex - rx * 0.28, y - ery * 0.2, rx * 0.62, rx * 0.16, 4, 0.3);
    } else {
      ctx.ellipse(ex - rx * 0.28, y - ery * 0.34, rx * 0.5, ery * 0.34, -0.3, 0, TAU);
    }
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + rx * 0.38, y + ery * 0.42, rx * 0.2, 0, TAU);
    ctx.fill();
    // 上睫毛線（粗）與眼尾
    ctx.strokeStyle = A.outline();
    ctx.lineCap = 'round';
    ctx.lineWidth = agile ? 2.2 : 1.7;
    ctx.beginPath();
    if (agile) {
      ctx.moveTo(ex - rx - 0.6, y - ery * 0.3);
      ctx.quadraticCurveTo(ex - rx * 0.1, y - ery * 1.3, ex + rx + 1.2, y - ery * 0.85);
    } else {
      ctx.ellipse(ex, y, rx + 0.2, ery + 0.2, 0, Math.PI * 1.25, Math.PI * 1.85);
      if (near) ctx.lineTo(ex + rx + 1.4, y - ery * 0.7);
    }
    ctx.stroke();
    if (kind === 'angry') {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.3, y - ry * 1.5);
      ctx.lineTo(x + rx * 1.1, y - ry * 0.95);
      ctx.stroke();
    }
  }

  // ── 鬃毛：一圈一簇簇的毛 ──
  // o = { n, r0, len, w, a0, span, sweep, curl, seed, fill, shade, inner, hi, lw, front(臉那側縮短) }
  // M = { lx, ly, back }：毛尖跟著動作落後一拍的位移；back＝背面（對稱、不往後梳）
  function clumpRing(ctx, cx, cy, o, M) {
    const list = [];
    const span = o.span || TAU;
    for (let i = 0; i < o.n; i++) {
      const a = o.a0 + (span * (i + (span >= TAU ? 0 : 0.5))) / o.n;
      // 臉那側（右）與下巴下面的毛短一點，不要擋臉、不要變成圍兜
      const front = M.back ? 0 : Math.max(0, Math.cos(a)) * (o.front == null ? 0.45 : o.front) + Math.max(0, Math.sin(a) - 0.25) * 1.1;
      const l = o.len * (0.84 + jit(i, o.seed || 1) * 0.32) * (1 - front);
      const ta = a + (M.back ? 0 : (o.sweep || 0.3) * Math.sin(a));
      const bx = cx + Math.cos(a) * o.r0;
      const by = cy + Math.sin(a) * o.r0;
      const k = l / o.len;
      const tx = cx + Math.cos(ta) * (o.r0 + l) - (M.back ? 0 : M.lx * k);
      const ty = cy + Math.sin(ta) * (o.r0 + l) + M.ly * k;
      const curl = (o.curl == null ? 2.2 : o.curl) * (M.back ? (Math.cos(a) > 0 ? 1 : -1) : 1);
      list.push([bx, by, tx, ty, o.w * (0.9 + jit(i, 7) * 0.2), curl, a]);
    }
    const path = (c) => list.forEach((q) => clumpPath(c, q[0], q[1], q[2], q[3], q[4], q[5]));
    // 內陰影：靠近頭的根部一圈較深（硬邊，跟賽璐璐一致）
    const inner = o.inner
      ? (c) => {
          c.globalAlpha *= 0.55;
          c.fillStyle = A.c(o.inner);
          c.beginPath();
          c.arc(cx + 1.5, cy + 1.5, o.r0 + (o.innerR || 5), 0, TAU);
          c.fill();
        }
      : null;
    unionShape(ctx, path, o.fill, o.shade, o.lw || 1.2, [2, 2.2], inner);
    // 受光（左上）那幾簇的高光毛絲
    if (o.hi) {
      ctx.strokeStyle = A.c(o.hi);
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      list.forEach((q) => {
        if (Math.cos(q[6]) + Math.sin(q[6]) < 0.2 || M.back) strand(ctx, q[0], q[1], q[2], q[3], q[5], 0.35, 0.78, -q[4] * 0.3);
      });
      ctx.stroke();
    }
    return list;
  }

  // 火舌：外層紅橘（描邊＋陰影）、中層黃、最裡面白熱的芯
  function flameTongues(ctx, L, list) {
    const P = L.pal;
    unionShape(ctx, (c) => list.forEach((f) => tonguePath(c, f[0], f[1], f[2], f[3], f[4], f[5])), P.mane, null, 1.1);
    const part = (k, wk) => (c) =>
      list.forEach((f) => tonguePath(c, f[0], f[1], f[0] + (f[2] - f[0]) * k, f[1] + (f[3] - f[1]) * k, f[4] * wk, f[5] * k));
    ctx.beginPath();
    part(0.72, 0.58)(ctx);
    ctx.fillStyle = A.c(P.flame || '#ffd84a');
    ctx.fill();
    ctx.beginPath();
    part(0.4, 0.3)(ctx);
    ctx.fillStyle = A.c(P.flameCore || '#fff8dc');
    ctx.fill();
  }
  function flameList(cx, cy, t, M, n, a0, a1, r, len0, w, sym) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / (n - 1);
      const bx = cx + Math.cos(a) * r;
      const by = cy + Math.sin(a) * r;
      // 閃爍：兩個不同頻率疊起來，長度與擺動每根都不一樣
      const fl = 0.82 + Math.sin(t * 11 + i * 2.3) * 0.12 + Math.sin(t * 17.3 + i * 1.1) * 0.08;
      const len = (len0 + (i % 2) * 6 + (i > 1 && i < n - 2 ? 4 : 0)) * fl;
      const dx = Math.cos(a) * 0.5 - (sym ? 0 : 0.38);
      const dy = Math.sin(a) * 0.5 - 0.9;
      const d = Math.hypot(dx, dy);
      const sway = Math.sin(t * 7 + i * 1.9) * 2.6;
      out.push([bx, by, bx + (dx / d) * len + sway - M.lx * 1.3, by + (dy / d) * len + M.ly * 1.2, w, sway * 0.8]);
    }
    return out;
  }

  // 劍羽：從鬃毛裡長出來的金屬羽刃。亮面／暗面各半、中脊、鏡面高光、會沿著刃滑過的閃光
  function bladeFeather(ctx, L, bx, by, a, len, w, bend, glint) {
    const P = L.pal;
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    const nx = -sn;
    const ny = cs;
    const tx = bx + Math.cos(a + bend) * len;
    const ty = by + Math.sin(a + bend) * len;
    const cx = bx + Math.cos(a + bend * 0.45) * len * 0.5;
    const cy = by + Math.sin(a + bend * 0.45) * len * 0.5;
    // 哪一側朝左上（受光）
    const lit = nx * -1 + ny * -1 > 0 ? 1 : -1;
    const side = (sg, k) => [cx + nx * w * sg * k, cy + ny * w * sg * k];
    const full = (c) => {
      const b1 = [bx + nx * w * 0.45, by + ny * w * 0.45];
      const m1 = side(1, 1.35);
      const m2 = side(-1, 1.35);
      c.moveTo(b1[0], b1[1]);
      c.quadraticCurveTo(m1[0], m1[1], tx, ty);
      c.quadraticCurveTo(m2[0], m2[1], bx - nx * w * 0.45, by - ny * w * 0.45);
      c.closePath();
    };
    ctx.beginPath();
    full(ctx);
    ctx.fillStyle = A.c(P.blade || '#eef3fa');
    ctx.fill();
    // 暗面：背光那一半
    ctx.save();
    ctx.clip();
    const m2 = side(-lit, 1.35);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.quadraticCurveTo(m2[0], m2[1], bx - nx * w * 0.45 * lit, by - ny * w * 0.45 * lit);
    ctx.closePath();
    ctx.fillStyle = A.c(P.bladeShade || '#9aaac2');
    ctx.fill();
    // 鏡面高光：亮面靠中脊的一道白
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const s0 = side(lit, 0.32);
    ctx.moveTo(bx + (s0[0] - bx) * 0.5 + nx * lit * 0.6, by + (s0[1] - by) * 0.5 + ny * lit * 0.6);
    ctx.quadraticCurveTo(s0[0], s0[1], cx + (tx - cx) * 0.62 + nx * lit * 0.7, cy + (ty - cy) * 0.62 + ny * lit * 0.7);
    ctx.stroke();
    ctx.restore();
    // 中脊
    ctx.strokeStyle = A.c(P.bladeEdge || '#6c7a94');
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(cx, cy, tx + (bx - tx) * 0.08, ty + (by - ty) * 0.08);
    ctx.stroke();
    ctx.beginPath();
    full(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 根部的金色羽軸環
    A.ellipse(ctx, bx + cs * 3, by + sn * 3, 3.2, 3.2, P.trim || '#ffcf3a', P.trimShade || '#c88a10', { lw: 1.5, hl: false, cel: [0.8, 0.8] });
    if (glint > 0) featherGlint(ctx, bx, by, a, len, bend, glint);
  }
  // 沿著羽刃滑過去的閃光（每幀即時畫，羽刃本體可以快取）
  function featherGlint(ctx, bx, by, a, len, bend, glint) {
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const lit = nx * -1 + ny * -1 > 0 ? 1 : -1;
    const tx = bx + Math.cos(a + bend) * len;
    const ty = by + Math.sin(a + bend) * len;
    const f = 0.25 + glint * 0.6;
    sparkle(ctx, bx + (tx - bx) * f + nx * lit * 1.2, by + (ty - by) * f + ny * lit * 1.2, 4.5, '#ffffff', Math.sin(glint * Math.PI));
  }

  // 暗影小幽靈：圓頭、波浪尾巴、兩顆發光的小眼睛
  function ghostWisp(ctx, L, x, y, s, t, i) {
    const P = L.pal;
    const w = Math.sin(t * 6 + i) * 1.2;
    ctx.fillStyle = A.c(P.wisp || '#3a2858');
    ctx.beginPath();
    ctx.arc(x, y, s, Math.PI * 0.95, Math.PI * 2.05, false);
    ctx.quadraticCurveTo(x + s * 1.1, y + s * 1.2, x + s * 2.4, y + s * 1.2 + w);
    ctx.quadraticCurveTo(x + s * 1.2, y + s * 1.9, x + s * 0.2, y + s * 1.5);
    ctx.quadraticCurveTo(x - s * 0.8, y + s * 1.4, x - s, y);
    ctx.fill();
    ctx.strokeStyle = A.c(P.rim || '#a070ff');
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = A.c(P.gem || '#ff2a4a');
    ctx.fillRect(x - s * 0.5, y - s * 0.15, 1.3, 1.6);
    ctx.fillRect(x + s * 0.15, y - s * 0.15, 1.3, 1.6);
  }

  // 每一種精修鬃毛分三層：under（每幀即時、在最後面）、ring（不動的本體，快取成點陣圖）、over（每幀即時、在最上面）。
  // 鬃毛本體整片跟著 lag 位移一點點，就是落後一拍的次要動作。
  const M0 = { lx: 0, ly: 0, back: false };
  const MB = { lx: 0, ly: 0, back: true };
  const BLADES_SIDE = { long: [[3.0, 36], [-2.72, 46], [-2.22, 50], [-1.72, 47], [-1.25, 38]], short: [[-2.97, 30], [-2.47, 33], [-1.97, 32]] };
  const BLADES_BACK = { long: [[-2.55, 40], [-2.05, 46], [-1.57, 48], [-1.09, 46], [-0.59, 40]], short: [[-2.3, 32], [-0.84, 32]] };
  // 羽刃的幾何：[根部 x, y, 角度, 長度, 寬度, 彎曲]
  function bladeGeo(cx, cy, back) {
    const B = back ? BLADES_BACK : BLADES_SIDE;
    const g = (a, len, r, dl, w) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, a, len - dl, w, back ? 0 : 0.32 * Math.sin(a)];
    return { long: B.long.map(([a, len]) => g(a, len, 16, 10, 5.4)), short: B.short.map(([a, len]) => g(a, len, 17, 12, 4.4)) };
  }
  const HDMANE = {
    // 小獅子：兩層蓬鬆的毛簇
    bumps: {
      ring(ctx, cx, cy, L, M) {
        const P = L.pal;
        const D = hdPal(L);
        clumpRing(ctx, cx, cy, { n: 14, r0: 17.5, len: 11, w: 7, a0: 0.22, sweep: 0.3, seed: 3, fill: D.maneBack, shade: D.maneBackShade, lw: 1.2, front: 0.15 }, M);
        clumpRing(ctx, cx, cy, { n: 13, r0: 15.5, len: 7, w: 6.4, a0: 0, sweep: 0.34, seed: 5, fill: P.mane, shade: P.maneShade, inner: D.maneDeep, innerR: 3, hi: D.maneHi, lw: 1.15, front: 0.3 }, M);
      },
    },
    // 焰鬃獅：鬃毛尖端往上竄出火舌（即時閃爍），芯是白熱的
    fire: {
      under(ctx, cx, cy, L, t, M) {
        flameTongues(ctx, L, flameList(cx, cy, t, M, 8, M.back ? -2.8 : -0.4, M.back ? -0.34 : -3.0, 21, 21, 7, M.back));
      },
      ring(ctx, cx, cy, L, M) {
        const P = L.pal;
        const D = hdPal(L);
        clumpRing(ctx, cx, cy, { n: 14, r0: 17, len: 8.5, w: 6.4, a0: 0.22, sweep: 0.32, seed: 3, fill: P.maneShade, shade: D.maneDeep, lw: 1.15, front: 0.15 }, M);
        clumpRing(ctx, cx, cy, { n: 13, r0: 15.5, len: 6.5, w: 6.2, a0: 0, sweep: 0.36, seed: 5, fill: P.mane, shade: P.maneShade, inner: P.maneShade, innerR: 3, hi: P.flame || '#ffd84a', lw: 1.1, front: 0.3 }, M);
      },
    },
    // 劍鬃獅：金屬羽刃從深藍的鬃毛裡長出來，往後梳；閃光即時沿著刃滑過
    blades: {
      ring(ctx, cx, cy, L, M) {
        const P = L.pal;
        const D = hdPal(L);
        const G2 = bladeGeo(cx, cy, M.back);
        G2.long.forEach((b) => bladeFeather(ctx, L, b[0], b[1], b[2], b[3], b[4], b[5], 0));
        clumpRing(ctx, cx, cy, { n: 14, r0: 16.5, len: 8, w: 6.2, a0: 0.22, sweep: 0.3, seed: 3, fill: D.maneBack, shade: D.maneBackShade, lw: 1.15, front: 0.15 }, M);
        G2.short.forEach((b) => bladeFeather(ctx, L, b[0], b[1], b[2], b[3], b[4], b[5], 0));
        clumpRing(ctx, cx, cy, { n: 13, r0: 15, len: 6, w: 6, a0: 0, sweep: 0.34, seed: 5, fill: P.mane, shade: P.maneShade, inner: D.maneDeep, innerR: 3, hi: D.maneHi, lw: 1.1, front: 0.3 }, M);
      },
      over(ctx, cx, cy, L, t, M) {
        const G2 = bladeGeo(cx, cy, M.back);
        G2.long.forEach((b, i) => {
          const k = (t * 0.45 + i * 0.37) % 1.6;
          if (k < 0.35) featherGlint(ctx, b[0], b[1], b[2], b[3], b[5], k / 0.35);
        });
      },
    },
    // 闇夜盜王：暗影煙霧做的鬃毛與兜帽；往後燒的煙舌與飄走的小幽靈是即時的
    abyss: {
      under(ctx, cx, cy, L, t, M) {
        const P = L.pal;
        const rim = P.rim || '#a070ff';
        const sg = M.back ? 0 : 1;
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.42 + i / 3) % 1;
          const a0 = ctx.globalAlpha;
          ctx.globalAlpha *= Math.sin(k * Math.PI) * 0.85;
          const sx = M.back ? (i - 1) * 22 : 0;
          ghostWisp(ctx, L, cx - 40 * sg + sx - k * 18 * sg - M.lx, cy - 14 + i * 12 - k * 24 + Math.sin(t * 3 + i) * 2, 4.4 - k * 1.2, t, i);
          ctx.globalAlpha = a0;
        }
        const tails = [];
        const ta = M.back ? [[-2.75, 26], [-2.2, 32], [-1.57, 34], [-0.94, 32], [-0.39, 26]] : [[2.5, 24], [2.95, 32], [-2.9, 38], [-2.45, 40], [-2.0, 32], [-1.6, 24]];
        ta.forEach(([a, l], i) => {
          const bx = cx + Math.cos(a) * 12;
          const by = cy + Math.sin(a) * 12;
          const wv = Math.sin(t * 3.2 + i * 1.7) * 2.6;
          const b = M.back ? 0 : a > 0 ? 0.35 : -0.5;
          const k = l / 40;
          tails.push([bx, by, bx + Math.cos(a + b) * l - M.lx * 1.4 * k, by + Math.sin(a + b) * l + wv + M.ly * k, 8, wv * 1.4 + (M.back ? 0 : -2)]);
        });
        unionShape(ctx, (c) => tails.forEach((f) => tonguePath(c, f[0], f[1], f[2], f[3], f[4], f[5])), P.mane, null, 1.15);
        // 煙的層次：裡面再一層更深的舌
        ctx.fillStyle = A.c(P.maneShade);
        ctx.beginPath();
        tails.forEach((f) => tonguePath(ctx, f[0], f[1], f[0] + (f[2] - f[0]) * 0.62, f[1] + (f[3] - f[1]) * 0.62, f[4] * 0.55, f[5] * 0.6));
        ctx.fill();
        // 受光側的紫色邊光
        const a0 = ctx.globalAlpha;
        ctx.globalAlpha *= 0.85;
        ctx.strokeStyle = A.c(rim);
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        tails.forEach((f) => strand(ctx, f[0], f[1], f[2], f[3], f[5], 0.35, 0.88, f[4] * 0.42));
        ctx.stroke();
        ctx.globalAlpha = a0;
      },
      ring(ctx, cx, cy, L, M) {
        const P = L.pal;
        const rim = P.rim || '#a070ff';
        const hood = (c) => {
          c.moveTo(cx + 19, cy - 3);
          c.ellipse(cx - 2, cy - 3, 21, 20, 0, 0, TAU);
          if (!M.back) {
            c.moveTo(cx - 10, cy - 18);
            c.quadraticCurveTo(cx - 26, cy - 26, cx - 36, cy - 18);
            c.quadraticCurveTo(cx - 28, cy - 10, cx - 17, cy - 3);
            c.closePath();
          }
        };
        unionShape(ctx, hood, P.mane, P.maneShade, 1.2, [2.4, 2.6]);
        const puffs = [];
        const pa = M.back ? [-2.9, -2.2, -0.9, -0.2, 2.6, 0.55] : [];
        pa.forEach((a, i) => puffs.push([cx - 2 + Math.cos(a) * 20, cy - 3 + Math.sin(a) * 19, 5.5 + jit(i, 4) * 2.2]));
        const puffPath = (c) =>
          puffs.forEach((q) => {
            c.moveTo(q[0] + q[2], q[1]);
            c.arc(q[0], q[1], q[2], 0, TAU);
          });
        unionShape(ctx, puffPath, P.mane, P.maneShade, 1.1, [1.8, 1.8]);
        // 紫色邊光：兜帽與煙團的左上緣
        ctx.save();
        ctx.beginPath();
        hood(ctx);
        puffPath(ctx);
        ctx.clip();
        ctx.strokeStyle = A.c(rim);
        ctx.globalAlpha *= 0.8;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        puffs.forEach((q) => {
          ctx.moveTo(q[0] + Math.cos(Math.PI * 1.05) * (q[2] - 1), q[1] + Math.sin(Math.PI * 1.05) * (q[2] - 1));
          ctx.arc(q[0] + 0.8, q[1] + 0.8, q[2] - 1, Math.PI * 1.05, Math.PI * 1.55);
        });
        ctx.moveTo(cx - 1 + Math.cos(Math.PI * 1.05) * 19.5, cy - 2 + Math.sin(Math.PI * 1.05) * 18.5);
        ctx.ellipse(cx - 1, cy - 2, 19.5, 18.5, 0, Math.PI * 1.05, Math.PI * 1.7);
        ctx.stroke();
        ctx.restore();
      },
    },
  };

  // ── 點陣圖快取 ──
  // 不會動的部分（鬃毛本體、頭、身體、毛領）依目前畫布的實際縮放各畫一次，之後直接貼圖。
  // 受擊閃白、染色殘影等顏色模式（A.mode）一律即時畫，不走快取。
  const BMP = {};
  let bmpCount = 0;
  function cachedDraw(ctx, key, x0, y0, w, h, draw) {
    if (A.mode || typeof document === 'undefined') {
      draw(ctx);
      return;
    }
    const m = ctx.getTransform();
    const sc = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
    const q = Math.max(1, Math.ceil(sc * 4) / 4);
    // 放得非常大（>6 倍）時直接即時畫，避免做出巨大的點陣圖
    if (q > 6) {
      draw(ctx);
      return;
    }
    const k = key + '@' + q + A.OUT;
    let cv = BMP[k];
    if (!cv) {
      if (bmpCount > 80) {
        for (const kk in BMP) delete BMP[kk];
        bmpCount = 0;
      }
      cv = document.createElement('canvas');
      cv.width = Math.ceil(w * q);
      cv.height = Math.ceil(h * q);
      const c = cv.getContext('2d');
      c.scale(q, q);
      c.translate(-x0, -y0);
      draw(c);
      BMP[k] = cv;
      bmpCount++;
    }
    ctx.drawImage(cv, x0, y0, w, h);
  }
  // 精修鬃毛：under → 快取的本體（跟著 lag 位移）→ over
  function hdMane(ctx, L, mane, cx, cy, t, M, key) {
    const H = HDMANE[mane];
    if (H.under) H.under(ctx, cx, cy, L, t, M);
    const dx = M.back ? 0 : -M.lx * 0.55;
    const dy = M.ly * 0.55;
    cachedDraw(ctx, key + mane + (M.back ? 'B' : 'S'), cx + dx - 64, cy + dy - 64, 128, 128, (c) => H.ring(c, cx + dx, cy + dy, L, M.back ? MB : M0));
    if (H.over) H.over(ctx, cx + dx, cy + dy, L, t, M);
  }

  // 尾巴：由粗到細、末端落後一拍；末端的毛球換成一簇簇的毛
  function hdTail(ctx, L, x0, y0, tipX, tipY, t, lagx, lagy) {
    const P = L.pal;
    const D = hdPal(L);
    const mx = (x0 + tipX) / 2 - 6 - lagx * 0.5;
    const my = y0 + 2 + lagy * 0.3;
    ctx.lineCap = 'round';
    // 描邊：根部粗、尾端細（兩段疊出來）
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 6.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, tipX, tipY);
    ctx.stroke();
    ctx.lineWidth = 7.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + mx) / 2, (y0 + my) / 2, (x0 + 2 * mx + tipX) / 4, (y0 + 2 * my + tipY) / 4);
    ctx.stroke();
    ctx.strokeStyle = A.c(P.body);
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, tipX, tipY);
    ctx.stroke();
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + mx) / 2, (y0 + my) / 2, (x0 + 2 * mx + tipX) / 4, (y0 + 2 * my + tipY) / 4);
    ctx.stroke();
    const a0 = ctx.globalAlpha;
    ctx.strokeStyle = A.c(D.rim);
    ctx.globalAlpha *= 0.7;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 - 2, y0 - 1.4);
    ctx.quadraticCurveTo(mx - 1, my - 1.4, tipX - 1.3, tipY + 3);
    ctx.stroke();
    ctx.globalAlpha = a0;
    if (L.tail === 'tuft' || !TAIL[L.tail]) {
      // 毛球是快取的；落後一拍用旋轉表現
      ctx.save();
      ctx.translate(tipX - 1, tipY - 2);
      ctx.rotate(0.2 - lagx * 0.07 + lagy * 0.04);
      cachedDraw(ctx, (L._key || '') + 'tuft', -16, -16, 32, 28, (cc) => {
        const lst = [];
        [-2.35, -1.95, -1.55, -1.2, -0.8].forEach((a, i) => {
          const l = 10 + (i === 2 ? 3 : i % 2 ? 1 : 0);
          lst.push([Math.cos(a) * 2, 2 + Math.sin(a) * 2, Math.cos(a) * l, 2 + Math.sin(a) * l, 3.4, (i - 2) * 0.8]);
        });
        unionShape(cc, (c) => {
          c.moveTo(5.5, 3);
          c.ellipse(0, 3, 5.5, 5, 0, 0, TAU);
          lst.forEach((q) => clumpPath(c, q[0], q[1], q[2], q[3], q[4], q[5]));
        }, P.mane, P.maneShade, 1.2, [1.6, 1.6]);
        cc.strokeStyle = A.c(D.maneHi);
        cc.lineWidth = 1.1;
        cc.lineCap = 'round';
        cc.beginPath();
        lst.slice(0, 3).forEach((q) => strand(cc, q[0], q[1], q[2], q[3], q[5], 0.3, 0.75, -1));
        cc.stroke();
      });
      ctx.restore();
    } else {
      if (L.tail === 'crescent' || L.tail === 'sword') {
        // 不會自己變形的尾巴末端（彎刃有 shadowBlur）快取，擺動用旋轉
        ctx.save();
        ctx.translate(tipX - 1, tipY - 3);
        ctx.rotate(0.2 - lagx * 0.04 + (L.tail === 'crescent' ? Math.sin(t * 2) * 0.1 : 0));
        cachedDraw(ctx, (L._key || '') + 'tip', -32, -44, 64, 64, (c) => TAIL[L.tail](c, L, 0));
        ctx.restore();
      } else drawTail(ctx, L, tipX - 1, tipY - 3, 0.2 - lagx * 0.04, t);
      // 火尾多一層白熱的芯
      if (L.tail === 'flame') {
        ctx.save();
        ctx.translate(tipX - 1, tipY - 3);
        ctx.rotate(0.2 - lagx * 0.04);
        ctx.beginPath();
        flamePath(ctx, 0, 1.5, Math.sin(t * 7) * 1.5 - 1, -5, 1.9);
        ctx.fillStyle = A.c(P.flameCore || '#fff8dc');
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // 圓耳朵：陰影、粉色內耳加一撮毛
  function hdRoundEar(ctx, L, x, y) {
    cachedDraw(ctx, (L._key || '') + 'ear', x - 9, y - 9, 18, 18, (c) => hdRoundEarRaw(c, L, x, y));
  }
  function hdRoundEarRaw(ctx, L, x, y) {
    const P = L.pal;
    A.shape(ctx, (c) => c.ellipse(x, y, 6.5, 6.5, 0, 0, TAU), P.mane, P.maneShade, { cel: [1.4, 1.4], lw: 2.3 });
    A.ellipse(ctx, x + 0.3, y + 0.3, 3.1, 3.1, P.ear, null, { noStroke: true, hl: false });
    ctx.strokeStyle = A.c(hdPal(L).maneHi);
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 1, y + 3.5);
    ctx.lineTo(x - 0.2, y + 0.5);
    ctx.moveTo(x + 1.3, y + 3.6);
    ctx.lineTo(x + 1.6, y + 1.2);
    ctx.stroke();
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
    // ── 精修版：呼吸、落後一拍的鬃毛／尾巴、會抬腳踩地的走路 ──
    const HD = !!L.hd;
    const D = HD ? hdPal(L) : null;
    const tier = HD ? L.tier || 0 : 0;
    const hup = tier * 0.7; // 高轉稍微高一點
    let lag = null;
    const sq = [0, 0, 0, 0];
    let breath = 0;
    if (HD) {
      lag = { lx: 0, ly: Math.sin(t * 3 - 1.1) * 1.3, back: false };
      if (st.state === 'idle' || !st.state) breath = Math.sin(t * 2.4);
      if (st.state === 'walk' && !L.float) {
        // 對角線的兩隻腳一組；擺動時抬起、往前，著地那一下腳掌壓扁
        const ph = t * 14;
        const phs = [0, Math.PI, Math.PI, 0];
        for (let k = 0; k < 4; k++) {
          const f = (((ph + phs[k]) % TAU) + TAU) % TAU;
          const swing = f < Math.PI;
          off[k] = -Math.cos(f) * 5;
          lift[k] = swing ? Math.pow(Math.sin(f), 1.4) * 5.5 : 0;
          const u = (f - Math.PI) / 1.1;
          sq[k] = !swing && u < 1 ? (1 - u) * (1 - u) : 0;
        }
        lag = { lx: 1.6 + Math.sin(ph * 2) * 0.4, ly: 1 - Math.abs(Math.sin(ph - 0.8)) * 2.2, back: false };
      } else if (st.state === 'jump') lag = { lx: 1.5, ly: 2.6, back: false };
      else if (st.state === 'fall') lag = { lx: 1, ly: -2.6, back: false };
      else if (st.state === 'dash') lag = { lx: 4.5, ly: 0.5, back: false };
      else if (st.state === 'hurt') lag = { lx: -2, ly: 1.5, back: false };
      else if (pawOut > 0) lag.lx = pawOut * 2.5;
    }
    const legLen = L.legLen + hup;
    const up = L.legLen - 15 + hup; // 腿變長時，身體跟頭一起抬高
    const hdLegAt = (k, x, hind, far) =>
      hdLeg(ctx, {
        hipX: x,
        hipY: -legLen * 0.84 + bob * 0.6,
        px: x + off[k],
        py: -lift[k],
        w: L.legW,
        len: legLen,
        fill: far ? P.farLeg : P.body,
        shade: far ? P.farLegShade : P.bodyShade,
        toe: far ? D.farToe : D.toe,
        hind,
        far,
        squash: sq[k],
        tuck: Math.min(1, lift[k] / 5),
      });

    ctx.save();
    ctx.scale(stretch * L.scale, L.scale / Math.sqrt(stretch));
    if (L.float) ctx.translate(0, -10 + Math.sin(t * 2) * 3);
    const hx0 = 9 + lean;
    const hy0 = -45 - up + bob;
    const bx0 = -1 + lean * 0.3 - (L.bodyRx - 21) * 0.3;
    const by0 = -20 - up + bob;
    if (L.fx && !(L.fx === 'wind' && (st.state === 'idle' || st.state === 'hurt'))) particles(ctx, L, t, hx0, hy0, bx0, by0, 'back');
    if (L.dwings) dragonWings(ctx, L, -6 + lean * 0.3, -32 - up + bob, t);
    if (L.cape) capeBack(ctx, L, hx0, hy0, bx0, by0, t);
    if (L.lwings) spiritWings(ctx, L, -8 + lean * 0.3, -33 - up + bob, t);

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
    if (HD) {
      hdLegAt(0, -11, true, true);
      hdLegAt(1, 9, false, true);
    } else {
      leg(ctx, -11 + off[0], 0, lift[0], P.farLeg, P.farLegShade, L.legW, L.legLen);
      leg(ctx, 9 + off[1], 0, lift[1], P.farLeg, P.farLegShade, L.legW, L.legLen);
    }

    // 尾巴
    const sw = Math.sin(t * 4) * 3;
    const tailBaseY = -22 - up + bob;
    const tipX = -34 + sw * 0.3;
    const tipY = -38 - up + bob - tailUp;
    if (HD) {
      const sw2 = Math.sin(t * 4 - 0.8) * 3;
      hdTail(ctx, L, -18, tailBaseY, tipX + (sw2 - sw) * 0.4 - lag.lx * 1.2, tipY + lag.ly * 0.9 - breath * 0.4, t, lag.lx - sw2 * 0.3, lag.ly);
    } else {
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
    }

    // 身體
    const bx = -1 + lean * 0.3 - (L.bodyRx - 21) * 0.3;
    const by = -20 - up + bob;
    if (HD) {
      // 呼吸：快取好的身體整張微微縮放
      const rx = L.bodyRx;
      const ry = L.bodyRy;
      ctx.save();
      ctx.translate(bx, by - breath * 0.35);
      ctx.scale(1 - breath * 0.008, 1 + breath * 0.028);
      cachedDraw(ctx, L._key + 'body', -rx - 6, -ry - 6, rx * 2 + 12, ry * 2 + 12, (c) => hdBody(c, L, 0, 0, rx, ry, -0.035 * tier));
      ctx.restore();
    }
    else {
      A.ellipse(ctx, bx, by, L.bodyRx, L.bodyRy, P.body, P.bodyShade, { cel: [3, 3] });
      A.ellipse(ctx, 6 + lean * 0.3, by + 5, 10, 7, P.cream, null, { noStroke: true, hl: false });
    }
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

    if (L.armor) drawArmor(ctx, L, bx, by);
    if (L.kunaiBack) {
      [[-0.5, -15], [0.3, -9]].forEach(([r, dx]) => {
        ctx.save();
        ctx.translate(bx + dx, by - L.bodyRy + 5);
        ctx.rotate(r - 0.9);
        ctx.scale(0.75, 0.75);
        TAIL.kunai(ctx, L, t);
        ctx.restore();
      });
    }

    // 近側的腳
    if (HD) {
      hdLegAt(2, -7, true, false);
      hdLegAt(3, 13, false, false);
      // 胸口毛領蓋在前腳根部上面；高轉更蓬（抬頭挺胸）
      const rk = 1 + 0.07 * tier;
      const rcx = bx + L.bodyRx * 0.62;
      const rcy = by - breath * 0.35 - L.bodyRy * 0.35;
      ctx.save();
      ctx.translate(rcx, rcy);
      ctx.scale(1 + breath * 0.03, 1 + breath * 0.03);
      cachedDraw(ctx, L._key + 'ruff', -16, -14, 32, 34, (c) => hdRuff(c, L, -L.bodyRx * 0.62, L.bodyRy * 0.35, rk));
      ctx.restore();
    } else {
      leg(ctx, -7 + off[2], 0, lift[2], P.body, P.bodyShade, L.legW, L.legLen);
      leg(ctx, 13 + off[3], 0, lift[3], P.body, P.bodyShade, L.legW, L.legLen);
    }
    if (L.bracers) {
      [-7 + off[2], 13 + off[3]].forEach((x, i) => {
        const ly = HD ? (-legLen + bob * 0.6 - lift[2 + i]) / 2 - 2 : -L.legLen * 0.62 - lift[2 + i];
        A.shape(ctx, (c) => A.roundRect(c, x - L.legW / 2 - 1.5, ly, L.legW + 3, 6, 2), P.bracer || '#b8c6d8', P.bracerShade || '#7e8ca2', { cel: [1, 1], lw: 2, hl: false });
      });
    }
    if (L.cape) capeFront(ctx, L, hx0, hy0, bx, by, t);

    // 伸出的前爪（攻擊）
    if (pawOut > 0) {
      const px = 24 + pawOut * 14;
      const py = -24 - up - pawOut * 6 + bob;
      if (HD) hdPaw(ctx, L, px, py, 6.2, -0.15, true);
      else {
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
    }

    // 頭
    const hx = 9 + lean;
    const hy = -45 - up + bob;
    if (L.orbit) orbitStars(ctx, hx, hy, t, true);
    if (HD && HDMANE[L.mane]) hdMane(ctx, L, L.mane, hx - 4, hy - 1, t, lag, L._key);
    else (MANE[L.mane] || MANE.bumps)(ctx, hx - 4, hy - 1, L, t);
    // 耳朵
    if (L.ears === 'none') {
      // 龍盔：角取代耳朵
    } else if (L.ears === 'pointed') {
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
    } else if (HD) {
      hdRoundEar(ctx, L, hx - 10, hy - 20 + earTwitch);
      hdRoundEar(ctx, L, hx + 8, hy - 21);
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
    if (HD) cachedDraw(ctx, L._key + 'head', hx - 32, hy - 24, 58, 54, (c) => hdHead(c, L, hx, hy));
    else A.ellipse(ctx, hx, hy, 19, 17.5, P.body, P.bodyShade, { cel: [3, 3.5] });
    if (L.hoodTop) hoodTop(ctx, L, hx, hy);
    if (L.crown === 'sprig') spiritSprig(ctx, L, hx - 1, hy - 20, t);
    else if (HD) {
      // 精修版：王冠（有 shadowBlur，很貴）和額頭楓葉一起快取
      cachedDraw(ctx, L._key + 'top', hx - 34, hy - 64, 68, 56, (c) => {
        if (L.crown) shadowCrown(c, L, hx, hy, 0.52);
        mapleTuft(c, hx - 1, hy - 20, 9, -0.15, L);
      });
      if (L.leaves) leafCrown(ctx, hx - 1, hy - 20, L.leaves, st.t || 0);
    } else {
      if (L.crown) shadowCrown(ctx, L, hx, hy, t);
      // 楓葉鬃毛
      mapleTuft(ctx, hx - 1, hy - 20, 9, -0.15, L);
      if (L.leaves) leafCrown(ctx, hx - 1, hy - 20, L.leaves, st.t || 0);
    }
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
    if (L.cape) moonClasp(ctx, L, hx - 15, hy + 13);
    // 嘴邊
    A.ellipse(ctx, hx + 11, hy + 7, 9, 6.5, P.cream, null, { lw: 2, hl: false });
    if (L.faceLine) A.OUT = L.faceLine;
    if (L.faceMask) faceMask(ctx, L, hx, hy);
    else {
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
    }
    // 眼睛
    if (L.eyeMask) eyeMask(ctx, L, hx, hy, t);
    if (HD) {
      hdEye(ctx, L, hx + 2, hy - 3, 3.9, 5.4, eyeKind, D.mood, t, false);
      hdEye(ctx, L, hx + 12, hy - 4, 3.6, 5.2, eyeKind, D.mood, t, true);
      if (L.eyeGlow && (eyeKind === 'normal' || eyeKind === 'angry')) {
        glowDisc(ctx, hx + 3, hy - 2, 7, L.eyeTint, 0.45 + Math.sin(t * 3) * 0.1);
        glowDisc(ctx, hx + 13, hy - 3, 6.5, L.eyeTint, 0.45 + Math.sin(t * 3) * 0.1);
      }
    } else {
      A.eye(ctx, hx + 2, hy - 3, 3.9, 5.4, eyeKind, 1);
      A.eye(ctx, hx + 12, hy - 4, 3.6, 5.2, eyeKind, 1);
    }
    if (!HD && L.eyeTint && (eyeKind === 'normal' || eyeKind === 'angry')) {
      ctx.fillStyle = A.c(L.eyeTint);
      ctx.globalAlpha = 0.75;
      [[hx + 3, hy - 1, 2.4], [hx + 13, hy - 2, 2.2]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (L.eyeGlow) {
        ctx.save();
        ctx.shadowColor = A.c(L.eyeTint);
        ctx.shadowBlur = 9;
        ctx.fillStyle = A.c(U.mix(L.eyeTint, '#ffffff', 0.25));
        [[hx + 3, hy - 1, 1.6], [hx + 13, hy - 2, 1.5]].forEach(([x, y, r]) => {
          ctx.beginPath();
          ctx.ellipse(x, y, r, r * 1.3, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    }
    if (L.brows && eyeKind !== 'closed' && eyeKind !== 'hurt') {
      const sly = L.brows === 'sly';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = sly ? 3.2 : 2.8;
      ctx.beginPath();
      if (sly) {
        ctx.moveTo(hx - 4, hy - 13.5);
        ctx.lineTo(hx + 6, hy - 9.5);
        ctx.moveTo(hx + 9, hy - 10);
        ctx.lineTo(hx + 17, hy - 14);
      } else if (HD) {
        // 力量：堅定的粗眉，內側壓低
        ctx.stroke();
        ctx.fillStyle = A.outline();
        ctx.beginPath();
        ctx.moveTo(hx - 4, hy - 13.2);
        ctx.quadraticCurveTo(hx + 1, hy - 14, hx + 6, hy - 10.4);
        ctx.lineTo(hx + 5, hy - 8.6);
        ctx.quadraticCurveTo(hx + 0.5, hy - 11, hx - 3.6, hy - 11);
        ctx.closePath();
        ctx.moveTo(hx + 8.6, hy - 9.8);
        ctx.quadraticCurveTo(hx + 12.5, hy - 13.2, hx + 16.8, hy - 13);
        ctx.lineTo(hx + 16.6, hy - 11);
        ctx.quadraticCurveTo(hx + 12.8, hy - 11.2, hx + 9.6, hy - 8.4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.moveTo(hx - 3, hy - 12);
        ctx.lineTo(hx + 5, hy - 10);
        ctx.moveTo(hx + 9, hy - 10.5);
        ctx.lineTo(hx + 16, hy - 12);
      }
      ctx.stroke();
    }
    if (!L.faceMask && !L.noBlush) A.blush(ctx, hx - 5, hy + 6, 4.5);
    if (L.orbit) orbitStars(ctx, hx, hy, t, false);
    if (L.fx) particles(ctx, L, t, hx, hy, bx, by, 'front');

    ctx.restore();
  }

  function backView(ctx, st, L) {
    const P = L.pal;
    const a = st.moving ? Math.sin(st.t * 12) : 0;
    const t = st.t;
    ctx.save();
    ctx.scale(L.scale, L.scale);
    if (L.dwings) {
      [-1, 1].forEach((sx) => {
        ctx.save();
        ctx.scale(sx, 1);
        dragonWings(ctx, L, -6, -30, t);
        ctx.restore();
      });
    }
    if (L.fx === 'aura') glowDisc(ctx, 0, -40, 64, P.aura || '#fff4c0', 0.5 + Math.sin(t * 1.6) * 0.08);
    if (L.lwings) {
      [-1, 1].forEach((sx) => {
        ctx.save();
        ctx.scale(sx, 1);
        spiritWings(ctx, L, -4, -30, t);
        ctx.restore();
      });
    }
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
    if (L.hd) {
      const D = hdPal(L);
      [-1, 1].forEach((sx) => hdLeg(ctx, { hipX: sx * 8, hipY: -16, px: sx * 8, py: sx * a * 3, w: L.legW, len: 15, fill: P.body, shade: P.bodyShade, toe: D.toe, back: true, pad: D.pad }));
      const bp = (c) => c.ellipse(0, -20, 16, 15, 0, 0, TAU);
      A.shape(ctx, bp, P.body, P.bodyShade, { cel: [3, 3], noStroke: true });
      litEdges(ctx, bp, 0, -20, 16, 15, 0, D, {});
      varOutline(ctx, 0, -20, 16, 15, 0, 2.4, 3.4);
    } else {
      leg(ctx, -8, 0 - a * 3, 0, P.body, P.bodyShade, L.legW, 15);
      leg(ctx, 8, 0 + a * 3, 0, P.body, P.bodyShade, L.legW, 15);
      A.ellipse(ctx, 0, -20, 16, 15, P.body, P.bodyShade, { cel: [3, 3] });
    }
    if (L.cape) {
      // 披風整片蓋住背
      const w = Math.sin(t * 3) * 1.5;
      const cape = (c) => {
        c.moveTo(-10, -38);
        c.quadraticCurveTo(-24, -24, -22 + w, -2);
        [[-15, -7], [-10, 1], [-4, -6], [2, 2], [8, -6], [13, 1], [17, -6], [22 + w, -1]].forEach(([x, y]) => c.lineTo(x, y));
        c.quadraticCurveTo(24, -24, 10, -38);
        c.closePath();
      };
      ctx.save();
      ctx.translate(0, 3);
      A.shape(ctx, cape, P.lining || '#b01c3c', null, { lw: 2.3, hl: false });
      ctx.restore();
      A.shape(ctx, cape, P.cape || '#2a1d40', P.capeShade || '#170f26', { cel: [3, 3], lw: 2.4, hl: false });
    }
    if (L.armor) drawArmor(ctx, Object.assign({}, L, { bodyRx: 16, bodyRy: 15 }), 0, -20);
    // 鬃毛（背面看整圈）
    if (L.hd && HDMANE[L.mane]) {
      hdMane(ctx, L, L.mane, 0, -46, t, { lx: 0, ly: Math.sin(t * 3 - 1) * 1.2, back: true }, L._key);
      cachedDraw(ctx, L._key + 'cap', -20, -66, 40, 40, (c) => hdBackCap(c, L, 0, -46));
    } else {
      if (BACKMANE[L.mane]) BACKMANE[L.mane](ctx, 0, -46, L, t);
      ring(ctx, 0, -46, 22, 14, L);
    }
    if (L.mane === 'dragon') {
      [-1, 1].forEach((sx) => A.shape(ctx, (c) => {
        c.moveTo(sx * 6, -58);
        c.quadraticCurveTo(sx * 16, -74, sx * 24, -84);
        c.quadraticCurveTo(sx * 18, -68, sx * 15, -56);
        c.closePath();
      }, P.horn || '#fff0c8', P.hornShade || '#d8b070', { cel: [1.5, 1.5], lw: 2.3, hl: false }));
    }
    if (L.ears !== 'none' && !L.crown) {
      if (L.hd) {
        hdRoundEar(ctx, L, -12, -65);
        hdRoundEar(ctx, L, 12, -65);
      } else {
        A.ellipse(ctx, -12, -65, 6.5, 6.5, P.mane, P.maneShade, { lw: 2.5, hl: false });
        A.ellipse(ctx, 12, -65, 6.5, 6.5, P.mane, P.maneShade, { lw: 2.5, hl: false });
      }
    }
    if (L.hoodTop) {
      A.shape(ctx, (c) => A.roundRect(c, -21, -58, 42, 6, 3), P.band || '#d8343a', P.bandShade || '#a02024', { shadeY: -54, lw: 2.2, hl: false });
    }
    if (L.crown === 'sprig') spiritSprig(ctx, L, 0, -66, t);
    else {
      if (L.crown) shadowCrown(ctx, L, 1, -53, t);
      mapleTuft(ctx, 0, -67, 8, 0, L);
    }
    // 前爪輪流往頭頂上方抓
    if (L.hd) {
      hdPaw(ctx, L, -8, -77 + a * 5, 5.6, -Math.PI / 2, false);
      hdPaw(ctx, L, 8, -77 - a * 5, 5.6, -Math.PI / 2, false);
    } else {
      A.ellipse(ctx, -8, -77 + a * 5, 6, 6, P.body, P.bodyShade, { lw: 2.5, hl: false });
      A.ellipse(ctx, 8, -77 - a * 5, 6, 6, P.body, P.bodyShade, { lw: 2.5, hl: false });
    }
    ctx.restore();
  }

  // st：{ state, t, p, moving, form }
  A.drawLion = function (ctx, x, y, dir, st) {
    let L = lookOf(st.form || 'base');
    if (st.leaves && st.leaves.length) L = Object.assign({}, L, { leaves: st.leaves });
    // 柔和描邊的形態：畫的時候暫時換掉描邊色，畫完一定換回來
    const out0 = A.OUT;
    if (L.softLine) A.OUT = L.softLine;
    ctx.save();
    try {
      ctx.translate(x, y);
      if (st.state === 'dead') {
        A.groundShadow(ctx, 0, 0, 30 * L.scale);
        ctx.translate(0, -14);
        ctx.rotate(-Math.PI / 2 * dir);
        ctx.translate(0, 14);
        ctx.scale(dir, 1);
        sideView(ctx, { state: 'hurt', t: 0, p: 0 }, L);
      } else if (st.state === 'climb') {
        backView(ctx, st, L);
      } else {
        if (st.onGround || L.float) A.groundShadow(ctx, 0, 0, 24 * L.scale * (L.float ? 0.7 : 1));
        ctx.scale(dir, 1);
        sideView(ctx, st, L);
      }
    } finally {
      ctx.restore();
      A.OUT = out0;
    }
  };

  A.lionColors = COL;
})();
