// 第三批技能美術：新技能圖示（A.ICON）、技能投射物（A.PROJ_DRAW）、怪物狀態特效（A.drawStatus）。
// 風格跟 items.js／npcs2.js／monsters2.js 一致：平塗、深棕描邊、右下月牙陰影、亮芯 + 柔光。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const PI = Math.PI;

  // ════════ 小工具 ════════
  function line(ctx, pts, col, w) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = w || 2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  // 有描邊的粗線（先描深棕，再塗顏色）
  function stick(ctx, pts, col, w, outW) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + (outW || 2.6);
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  function dot(ctx, x, y, r, col) {
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function glow(ctx, x, y, r, rgb, a) {
    if (a <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function starPath(c, x, y, r1, r2, n, rot) {
    for (let i = 0; i <= n * 2; i++) {
      const a = rot + (i / (n * 2)) * TAU;
      const r = i % 2 ? r2 : r1;
      i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }
  function sparkle(ctx, x, y, r, col) {
    A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.35, 4, 0), col || '#ffffff', null, { noStroke: true, hl: false });
  }
  function speedLines(ctx, pts, col, w) {
    ctx.strokeStyle = A.c(col || '#ffffff');
    ctx.lineWidth = w || 2.5;
    ctx.lineCap = 'round';
    pts.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  }
  // 兩端尖、中間鼓的斬擊弧（bend > 0 往法線方向彎）
  function slashPath(c, x1, y1, x2, y2, w, bend) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    const b = bend || 0;
    c.moveTo(x1, y1);
    c.quadraticCurveTo(mx + nx * (b + w), my + ny * (b + w), x2, y2);
    c.quadraticCurveTo(mx + nx * (b - w), my + ny * (b - w), x1, y1);
    c.closePath();
  }
  // 閃電折線（固定形狀，給定起點終點與折點數）
  function zigzag(x1, y1, x2, y2, n, amp, seed) {
    const pts = [[x1, y1]];
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    for (let i = 1; i < n; i++) {
      const k = i / n;
      const o = (i % 2 ? 1 : -1) * amp * (0.6 + 0.4 * Math.abs(Math.sin(i * 2.3 + (seed || 0))));
      pts.push([x1 + (x2 - x1) * k + nx * o, y1 + (y2 - y1) * k + ny * o]);
    }
    pts.push([x2, y2]);
    return pts;
  }
  // 發光閃電：外光暈 → 深棕描邊 → 黃 → 白芯
  function boltLine(ctx, pts, w, col) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = 'rgba(255,240,140,0.35)';
    ctx.lineWidth = w * 3.2;
    ctx.stroke();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + 2.4;
    ctx.stroke();
    ctx.strokeStyle = A.c(col || '#ffe066');
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = A.c('#fffbe0');
    ctx.lineWidth = Math.max(0.8, w * 0.38);
    ctx.stroke();
    ctx.restore();
  }
  // 雪花
  function snowflake(ctx, x, y, r, col, w) {
    ctx.save();
    ctx.strokeStyle = A.c(col || '#ffffff');
    ctx.lineWidth = w || 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI + PI / 2;
      const cx = Math.cos(a) * r;
      const cy = Math.sin(a) * r;
      ctx.moveTo(x - cx, y - cy);
      ctx.lineTo(x + cx, y + cy);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + PI / 2;
      const bx = x + Math.cos(a) * r * 0.6;
      const by = y + Math.sin(a) * r * 0.6;
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a + 0.8) * r * 0.35, by + Math.sin(a + 0.8) * r * 0.35);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a - 0.8) * r * 0.35, by + Math.sin(a - 0.8) * r * 0.35);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 冰晶（菱形，尖端朝 +x）
  function crystalPath(c, x, y, len, w, back) {
    const b = back != null ? back : len * 0.35;
    c.moveTo(x + len, y);
    c.lineTo(x + len * 0.15, y - w);
    c.lineTo(x - b, y);
    c.lineTo(x + len * 0.15, y + w);
    c.closePath();
  }
  function iceShardAt(ctx, x, y, len, w, rot, lw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => crystalPath(c, 0, 0, len, w), '#d8f2ff', '#8ccaf0', { shadeY: 0, lw: lw || 1.6, hl: false });
    line(ctx, [[-len * 0.2, -w * 0.25], [len * 0.55, -w * 0.25]], 'rgba(255,255,255,0.95)', Math.max(0.8, w * 0.35));
    ctx.restore();
  }
  // 四角手裡劍（刃尖朝上下左右，帶一點彎鉤）
  function shurikenPath(c, r, inner, hook) {
    const h = hook || 0;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU - PI / 2;
      const tx = Math.cos(a) * r;
      const ty = Math.sin(a) * r;
      const a2 = a + PI / 4;
      const ix = Math.cos(a2) * inner;
      const iy = Math.sin(a2) * inner;
      const pa = a - PI / 4;
      const px = Math.cos(pa) * inner;
      const py = Math.sin(pa) * inner;
      if (i === 0) c.moveTo(px, py);
      // 前緣微彎（hook）
      const cx = (px + tx) / 2 + Math.cos(a - PI / 2) * r * h;
      const cy = (py + ty) / 2 + Math.sin(a - PI / 2) * r * h;
      c.quadraticCurveTo(cx, cy, tx, ty);
      c.lineTo(ix, iy);
    }
    c.closePath();
  }
  // 小的手裡劍（r < 9）刃要胖一點、不畫中心孔，縮小後才不會只剩描邊
  function shuriken(ctx, x, y, r, rot, fill, shade, lw, hook) {
    const small = r < 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => shurikenPath(c, r, r * (small ? 0.45 : 0.3), hook || 0), fill || '#c8d4e4', shade || '#8a98b0', { cel: [r * 0.12, r * 0.12], lw: lw || 1.6, hl: false });
    ctx.restore();
    if (small) dot(ctx, x, y, r * 0.14, '#6a7488');
    else A.ellipse(ctx, x, y, r * 0.16, r * 0.16, '#4a5468', null, { lw: Math.max(1, (lw || 1.6) * 0.7), hl: false });
  }
  // 火焰舌（底部 (x,y)，高 h，寬 w，flick 左右擺）
  function flamePath(c, x, y, w, h, flick) {
    const f = flick || 0;
    // 水滴形：圓胖的底、彎彎的尖
    c.moveTo(x, y + w * 0.45);
    c.bezierCurveTo(x - w * 1.35, y + w * 0.4, x - w * 1.05, y - h * 0.45, x + f, y - h);
    c.bezierCurveTo(x + w * 0.2 + f * 0.3, y - h * 0.62, x + w * 1.35, y - h * 0.3, x + w * 1.05, y - w * 0.1);
    c.quadraticCurveTo(x + w * 0.9, y + w * 0.45, x, y + w * 0.45);
    c.closePath();
  }
  function flame(ctx, x, y, w, h, flick, lw) {
    A.shape(ctx, (c) => flamePath(c, x, y, w, h, flick), '#ff8a2a', '#e8521e', { shadeY: y - h * 0.15, lw: lw || 1.6, hl: false });
    A.shape(ctx, (c) => flamePath(c, x + w * 0.05, y - w * 0.05, w * 0.55, h * 0.6, flick * 0.6), '#ffe46a', null, { noStroke: true, hl: false });
  }
  // 石頭輪廓（凹凸的圓）
  function rockPath(c, x, y, r, n, seed) {
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (0.9 + 0.1 * Math.sin(i * 2.7 + (seed || 0)) * Math.cos(i * 1.3));
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
  }
  // 小獅子剪影（影遁、瞬影用）朝右
  function lionSilhouette(ctx, x, y, s, fill, shade, lw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const body = (c) => {
      // 身體往前衝、尾巴拖在後面
      c.moveTo(-9, 3);
      c.quadraticCurveTo(-15, 0, -17, -5);
      c.quadraticCurveTo(-13, -2, -9, -1);
      c.quadraticCurveTo(-6, -6, 1, -5);
      c.quadraticCurveTo(3, -11, 8, -11);
      c.lineTo(9, -14);
      c.lineTo(11, -10);
      c.quadraticCurveTo(16, -9, 16, -4);
      c.quadraticCurveTo(15, 0, 10, 0);
      c.lineTo(9, 5);
      c.lineTo(5, 5);
      c.lineTo(5, 2);
      c.lineTo(-4, 2);
      c.lineTo(-7, 6);
      c.lineTo(-11, 6);
      c.closePath();
    };
    A.shape(ctx, body, fill, shade, { cel: [1.5, 1.5], lw: (lw || 2) / s, hl: false });
    ctx.restore();
  }

  // ═════════════ 技能圖示 ═════════════
  const ICON3 = {
    // ─── 力量系 ───
    risingClaw(ctx) {
      glow(ctx, 2, -2, 18, '255,190,90', 0.45);
      // 三道往上彎的爪痕
      [[-13, -1], [-7.5, 3], [-2, 7]].forEach(([dx, dy]) => {
        A.shape(ctx, (c) => slashPath(c, dx - 3, dy + 8, dx + 9, dy - 15, 5, -4), '#ffffff', '#c8d4e4', { shadeY: dy + 3, lw: 1.8, hl: false });
      });
      // 往上的力量箭頭
      A.shape(ctx, (c) => {
        c.moveTo(12, -16);
        c.lineTo(18, -7);
        c.lineTo(14.5, -7);
        c.lineTo(14.5, 12);
        c.lineTo(9.5, 12);
        c.lineTo(9.5, -7);
        c.lineTo(6, -7);
        c.closePath();
      }, '#ffb84a', '#e0782a', { cel: [1.5, 1.5], lw: 2, hl: false });
      line(ctx, [[11, -4], [11, 8]], 'rgba(255,240,200,0.9)', 1.2);
      speedLines(ctx, [[-15, 15, -15, 10], [-9, 16, -9, 12], [3, 16, 3, 12]], '#ffe9a8', 1.8);
    },
    hammerDrop(ctx) {
      // 裂開的地面
      A.shape(ctx, (c) => { c.moveTo(-16, 9); c.lineTo(16, 9); c.lineTo(14, 16); c.lineTo(-14, 16); c.closePath(); }, '#9a7b5a', '#6e5236', { shadeY: 13, lw: 2 });
      line(ctx, [[-2, 9], [-5, 12], [-2, 14], [-4, 16]], null, 1.6);
      line(ctx, [[4, 9], [7, 13], [5, 16]], null, 1.6);
      [[-14, 4, 2.3], [14, 3, 2.2], [-11, -2, 1.5], [12, -3, 1.4]].forEach(([x, y, r]) => A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.7, 3, 0.3), '#c8aa80', null, { lw: 1.3, hl: false }));
      // 錘柄
      stick(ctx, [[1, -1], [4, -17]], '#b07a4a', 3.2);
      // 錘頭
      ctx.save();
      ctx.translate(0, 2);
      ctx.rotate(0.12);
      A.shape(ctx, (c) => A.roundRect(c, -11, -6, 22, 12, 2.5), '#a8988a', '#6e5e50', { cel: [2, 2], lw: 2, hl: [-6, -3, 3, 1.3] });
      A.shape(ctx, (c) => { c.rect(-4, -6.5, 3, 13); c.rect(1, -6.5, 3, 13); }, '#e0a040', null, { lw: 1.4, hl: false });
      ctx.restore();
      speedLines(ctx, [[-9, -16, -9, -9], [-13, -12, -13, -7], [10, -15, 10, -9]], '#ffffff', 2);
    },
    lionBrandish(ctx) {
      glow(ctx, 0, 0, 18, '255,220,110', 0.55);
      const slashes = [[-16, -10, 15, 11, 3], [-15, 12, 16, -9, 3], [-4, -17, 3, 17, 2.4], [-17, 1, 17, -2, 2.2]];
      slashes.forEach(([x1, y1, x2, y2, w], i) => {
        A.shape(ctx, (c) => slashPath(c, x1, y1, x2, y2, w, i % 2 ? 3 : -3), '#ffe066', '#f0b020', { shadeY: 20, lw: 1.6, hl: false });
      });
      slashes.forEach(([x1, y1, x2, y2], i) => {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        line(ctx, [[x1 + (mx - x1) * 0.4, y1 + (my - y1) * 0.4], [mx, my]], 'rgba(255,255,240,0.95)', 1.1);
      });
      sparkle(ctx, 0, 0, 7, '#fffbe0');
      sparkle(ctx, 12, -13, 3, '#fff0a0');
      sparkle(ctx, -12, 13, 2.5, '#fff0a0');
    },
    boulderRoll(ctx) {
      // 塵土
      [[-13, 12, 4], [-7, 14, 3.2], [-17, 8, 2.6]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r * 0.8, '#e0caa0', '#c8aa80', { lw: 1.4, hl: false }));
      speedLines(ctx, [[-17, -8, -10, -8], [-18, -1, -11, -1], [-16, 5, -12, 5]], '#ffffff', 2.2);
      line(ctx, [[-16, 16], [16, 16]], null, 2);
      // 巨石
      A.shape(ctx, (c) => rockPath(c, 4, 2, 12.5, 11, 1), '#b0a090', '#7e6e60', { cel: [2.2, 2.2], lw: 2, hl: [0, -4, 3.5, 2] });
      line(ctx, [[0, -5], [3, 0], [1, 5]], '#6a5a4c', 1.5);
      line(ctx, [[3, 0], [9, 2]], '#6a5a4c', 1.5);
      A.ellipse(ctx, 10, -5, 2.6, 1.8, '#7fb04a', null, { lw: 1.1, hl: false, rot: 0.5 });
      // 旋轉弧
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = A.c('#ffe9a8');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(4, 2, 16, -2.3, -0.9);
      ctx.stroke();
      ctx.restore();
      A.shape(ctx, (c) => { c.moveTo(14.5, -14.5); c.lineTo(15.5, -9); c.lineTo(10.5, -11.5); c.closePath(); }, '#ffe9a8', null, { lw: 1.2, hl: false });
    },

    // ─── 魔法系 ───
    flameBolt(ctx) {
      glow(ctx, 4, 0, 18, '255,150,50', 0.6);
      ctx.save();
      ctx.translate(5, 0);
      ctx.rotate(-0.35);
      const blob = (c, k) => {
        c.moveTo(9 * k, 0);
        c.bezierCurveTo(9 * k, -8 * k, -2 * k, -9 * k, -8 * k, -6 * k);
        c.quadraticCurveTo(-15 * k, -8 * k, -22 * k, -4 * k);
        c.quadraticCurveTo(-14 * k, -1 * k, -20 * k, 3 * k);
        c.quadraticCurveTo(-13 * k, 4 * k, -16 * k, 8 * k);
        c.quadraticCurveTo(-8 * k, 9 * k, -2 * k, 8 * k);
        c.bezierCurveTo(4 * k, 8 * k, 9 * k, 5 * k, 9 * k, 0);
        c.closePath();
      };
      A.shape(ctx, (c) => blob(c, 1), '#ff7a2a', '#e8521e', { lw: 2, shadeY: 3 });
      ctx.translate(2, -0.5);
      A.shape(ctx, (c) => blob(c, 0.55), '#ffe46a', null, { noStroke: true });
      A.ellipse(ctx, 1, -0.5, 2.6, 2.6, '#fffbe0', null, { noStroke: true, hl: false });
      ctx.restore();
      sparkle(ctx, -12, 11, 2.5, '#ffd24a');
      sparkle(ctx, 14, -10, 2.8, '#fff0a0');
    },
    chainLightning(ctx) {
      const nodes = [[-12, 9], [-1, -10], [12, 6]];
      boltLine(ctx, zigzag(nodes[0][0], nodes[0][1], nodes[1][0], nodes[1][1], 4, 3, 1), 2.2);
      boltLine(ctx, zigzag(nodes[1][0], nodes[1][1], nodes[2][0], nodes[2][1], 4, 3, 2), 2.2);
      nodes.forEach(([x, y]) => {
        glow(ctx, x, y, 8, '255,245,160', 0.8);
        A.ellipse(ctx, x, y, 3.6, 3.6, '#fffbd0', '#ffe46a', { lw: 1.8, hl: false });
      });
      sparkle(ctx, 15, -11, 2.6, '#fff6b0');
      sparkle(ctx, -15, -4, 2.2, '#fff6b0');
    },
    iceLance(ctx) {
      glow(ctx, 3, -3, 17, '170,225,255', 0.5);
      ctx.save();
      ctx.rotate(-PI / 4);
      // 槍桿
      A.shape(ctx, (c) => { c.moveTo(-20, -1.8); c.lineTo(4, -2); c.lineTo(4, 2); c.lineTo(-20, 1.8); c.closePath(); }, '#9fd4f4', '#6aaede', { shadeY: 0.3, lw: 1.6, hl: false });
      // 護手冰晶
      A.shape(ctx, (c) => crystalPath(c, 3, 0, 3.5, 6, 3), '#bfe8ff', '#7ec0ec', { shadeY: 0, lw: 1.6, hl: false });
      // 槍頭
      A.shape(ctx, (c) => crystalPath(c, 7, 0, 15, 4.8, 3), '#e2f6ff', '#9ad2f2', { shadeY: 0, lw: 1.8, hl: false });
      line(ctx, [[6, -1.3], [17, -0.8]], 'rgba(255,255,255,0.95)', 1.2);
      A.shape(ctx, (c) => crystalPath(c, -21, 0, 3, 3.5, 2.5), '#bfe8ff', '#7ec0ec', { shadeY: 0, lw: 1.4, hl: false });
      ctx.restore();
      snowflake(ctx, -9, -9, 4, '#ffffff', 1.3);
      sparkle(ctx, 9, 9, 3, '#e8fbff');
      sparkle(ctx, 15, -3, 2.2, '#e8fbff');
    },
    blizzard(ctx) {
      // 風
      ctx.save();
      ctx.strokeStyle = 'rgba(220,240,255,0.8)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      [[-16, 3], [-14, 11]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 8, y - 3, x + 14, y + 2);
        ctx.stroke();
      });
      ctx.restore();
      iceShardAt(ctx, -8, 1, 7, 2.4, PI / 2 + 0.35);
      iceShardAt(ctx, 3, 4, 8, 2.6, PI / 2 + 0.35);
      iceShardAt(ctx, 12, 0, 6.5, 2.2, PI / 2 + 0.35);
      snowflake(ctx, -2, 13, 3.6, '#ffffff', 1.4);
      snowflake(ctx, 12, 13, 2.6, '#e8f6ff', 1.2);
      // 雲
      A.shape(ctx, (c) => {
        c.moveTo(-13, -2);
        c.arc(-11, -6, 5, PI * 0.6, PI * 1.5);
        c.arc(-3, -10, 6.5, PI * 1.1, PI * 1.85);
        c.arc(6, -9, 6, PI * 1.25, PI * 1.95);
        c.arc(12, -5, 4.5, PI * 1.5, PI * 0.45);
        c.closePath();
      }, '#dce8f4', '#a8b8cc', { shadeY: -4, lw: 2, hl: [-4, -12, 3, 1.5] });
    },
    thunderJudge(ctx) {
      glow(ctx, 0, 6, 18, '255,245,150', 0.55);
      // 落點閃光
      A.shape(ctx, (c) => starPath(c, 0, 13, 9, 3.5, 6, -PI / 2), '#fff6b0', null, { noStroke: true, hl: false });
      A.shape(ctx, (c) => c.ellipse(0, 14, 12, 2.6, 0, 0, TAU), '#ffe066', null, { lw: 1.4, hl: false });
      // 巨大雷柱
      A.shape(ctx, (c) => {
        c.moveTo(-3, -12);
        c.lineTo(6, -12);
        c.lineTo(2, -3);
        c.lineTo(7, -3);
        c.lineTo(-1, 14);
        c.lineTo(0.5, 2);
        c.lineTo(-5, 2);
        c.closePath();
      }, '#ffe066', '#f0b020', { cel: [1.5, 1], lw: 2, hl: false });
      line(ctx, [[1, -10], [-2.5, -0], [2.5, -0.5], [0, 8]], 'rgba(255,255,240,0.95)', 1.2);
      // 雷雲
      A.shape(ctx, (c) => {
        c.moveTo(-15, -9);
        c.arc(-12, -12, 4.5, PI * 0.7, PI * 1.5);
        c.arc(-4, -14, 5.5, PI * 1.1, PI * 1.85);
        c.arc(5, -14, 5.5, PI * 1.15, PI * 1.9);
        c.arc(12, -11, 4.5, PI * 1.5, PI * 0.4);
        c.closePath();
      }, '#6a6488', '#4a4466', { shadeY: -11, lw: 2, hl: false });
      speedLines(ctx, [[-10, -2, -8, 4], [10, -3, 8, 3], [-14, 6, -12, 9], [14, 5, 12, 9]], '#fff6b0', 1.6);
    },
    auroraStorm(ctx) {
      glow(ctx, 0, 0, 18, '150,230,220', 0.45);
      const arms = [['#7ae0c0', 0], ['#a890f0', TAU / 3], ['#6ac8f0', (TAU * 2) / 3]];
      arms.forEach(([col, a0]) => {
        const pts = [];
        for (let i = 0; i <= 14; i++) {
          const k = i / 14;
          const a = a0 + k * 3.4;
          const r = 3 + k * 13;
          pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.85]);
        }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // 描邊 → 彩帶 → 白色亮邊，愈外愈細
        for (let pass = 0; pass < 3; pass++) {
          for (let i = 1; i < pts.length; i++) {
            const k = i / pts.length;
            const w = 4.2 * (1 - k * 0.6);
            ctx.beginPath();
            ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
            ctx.lineTo(pts[i][0], pts[i][1]);
            if (pass === 0) {
              ctx.strokeStyle = A.outline();
              ctx.lineWidth = w + 2.4;
            } else if (pass === 1) {
              ctx.strokeStyle = A.c(col);
              ctx.lineWidth = w;
            } else {
              ctx.strokeStyle = 'rgba(255,255,255,0.6)';
              ctx.lineWidth = w * 0.3;
            }
            ctx.stroke();
          }
        }
        ctx.restore();
      });
      A.ellipse(ctx, 0, 0, 3.8, 3.8, '#ffffff', '#d8f8f0', { lw: 1.6, hl: false });
      sparkle(ctx, 13, -12, 3, '#e8fffc');
      sparkle(ctx, -14, 11, 2.4, '#f0e0ff');
    },
    magicSurge(ctx) {
      glow(ctx, 0, 4, 18, '190,160,255', 0.55);
      // 符文圈（稍微斜看的橢圓）
      ctx.save();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 8, 15, 6.5, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c('#c9a7ff');
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.setLineDash([2, 2.5]);
      ctx.strokeStyle = A.c('#8ff0e8');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 8, 10, 4, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      [0, 1, 2, 3, 4, 5].forEach((i) => {
        const a = (i / 6) * TAU + 0.3;
        const x = Math.cos(a) * 15;
        const y = 8 + Math.sin(a) * 6.5;
        A.shape(ctx, (c) => { c.moveTo(x, y - 2.2); c.lineTo(x + 1.6, y); c.lineTo(x, y + 2.2); c.lineTo(x - 1.6, y); c.closePath(); }, '#fff4ff', null, { lw: 1, hl: false });
      });
      // 往上的箭頭
      A.shape(ctx, (c) => {
        c.moveTo(0, -17);
        c.lineTo(8, -7);
        c.lineTo(3.2, -7);
        c.lineTo(3.2, 8);
        c.lineTo(-3.2, 8);
        c.lineTo(-3.2, -7);
        c.lineTo(-8, -7);
        c.closePath();
      }, '#8ff0e8', '#4fc0c8', { cel: [1.5, 1.5], lw: 2, hl: false });
      line(ctx, [[-1, -12], [-1, 4]], 'rgba(255,255,255,0.9)', 1.3);
      sparkle(ctx, 12, -10, 3, '#f0e0ff');
      sparkle(ctx, -12, -6, 2.4, '#e8fffc');
    },

    // ─── 敏捷系 ───
    featherThrow(ctx) {
      // 後空翻的弧形箭頭
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-5, -2, 9.5, 0.55, PI * 0.72, true);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5.4;
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 2.8;
      ctx.stroke();
      ctx.restore();
      // 箭頭（在弧的起點附近，朝逆時針方向）
      const ea = PI * 0.72;
      const ax = -5 + Math.cos(ea) * 9.5;
      const ay = -2 + Math.sin(ea) * 9.5;
      ctx.save();
      ctx.translate(ax, ay);
      // 逆時針前進方向 = (sin a, -cos a)；三角形尖端原本朝 -y
      ctx.rotate(Math.atan2(-Math.cos(ea), Math.sin(ea)) + PI / 2);
      A.shape(ctx, (c) => { c.moveTo(0, -5.5); c.lineTo(5, 2.5); c.lineTo(-5, 2.5); c.closePath(); }, '#ffffff', '#d8e0e8', { lw: 1.8, hl: false });
      ctx.restore();
      // 兩把飛出去的羽刃
      const blade = (x, y, len, w, rot) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        A.shape(ctx, (c) => { c.moveTo(len, 0); c.quadraticCurveTo(0, -w, -len, -w * 0.15); c.quadraticCurveTo(0, w * 0.85, len, 0); c.closePath(); }, '#d8ff9a', '#a8d04a', { lw: 2, hl: false });
        ctx.restore();
      };
      speedLines(ctx, [[3, -9, 7, -10], [5, 4, 9, 5]], '#e8ffd0', 1.6);
      blade(12, -12, 6, 4.6, -0.35);
      blade(12, 9, 6.5, 5, 0.3);
    },
    shadowStep(ctx) {
      glow(ctx, 3, 0, 18, '170,120,255', 0.55);
      // 身後的紫色斬擊線
      A.shape(ctx, (c) => slashPath(c, -17, 13, 15, -14, 2.8, 2), '#c49aff', '#9a70e0', { shadeY: 30, lw: 1.6, hl: false });
      line(ctx, [[-8, 5], [5, -6]], 'rgba(245,235,255,0.95)', 1.2);
      // 殘影
      ctx.save();
      ctx.globalAlpha = 0.35;
      lionSilhouette(ctx, -8, 5, 0.75, '#a888e8', null, 2);
      ctx.restore();
      // 影子本體
      lionSilhouette(ctx, 3, 5, 0.85, '#4a3478', '#2e1f4c', 2);
      A.ellipse(ctx, 12, -3.5, 1.4, 1, '#e8d4ff', null, { noStroke: true, hl: false });
      speedLines(ctx, [[-17, 0, -12, 0], [-16, 8, -10, 8]], '#c9a7ff', 1.8);
      sparkle(ctx, 15, -12, 3, '#e8d4ff');
    },
    bladeRain(ctx) {
      glow(ctx, 0, -13, 10, '220,255,180', 0.7);
      // 從上方中央往下散開
      const tgt = [[-12, 9, 0.2], [-2, 13, 0.6], [9, 11, 1.1], [15, 1, 0.4], [-16, -2, 0.9]];
      ctx.save();
      ctx.lineCap = 'round';
      tgt.forEach(([x, y]) => {
        const g = ctx.createLinearGradient(0, -13, x, y);
        g.addColorStop(0, 'rgba(232,255,210,0)');
        g.addColorStop(1, 'rgba(232,255,210,0.9)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x * 0.15, -13 + (y + 13) * 0.15);
        ctx.lineTo(x * 0.72, -13 + (y + 13) * 0.72);
        ctx.stroke();
      });
      ctx.restore();
      tgt.forEach(([x, y, r]) => shuriken(ctx, x, y, 6, r, '#eef4fc', '#9aa8c0', 1.1));
      sparkle(ctx, 0, -13, 4.5, '#f4ffe0');
    },
    windShuriken(ctx) {
      glow(ctx, 0, 0, 18, '180,240,140', 0.5);
      // 風的漩渦
      ctx.save();
      ctx.lineCap = 'round';
      [[16, 0.2, 1.5], [16, 0.2 + PI, 1.5], [12.5, 1.9, 1.1]].forEach(([r, a0, span]) => {
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, a0 + span);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 3.6;
        ctx.stroke();
        ctx.strokeStyle = A.c('#b8f07a');
        ctx.lineWidth = 1.8;
        ctx.stroke();
      });
      ctx.restore();
      shuriken(ctx, 0, 0, 13, 0.3, '#d0dcec', '#8a98b0', 2, 0.18);
      line(ctx, [[-2, -9], [-1, -4]], 'rgba(255,255,255,0.9)', 1.2);
      sparkle(ctx, 13, -13, 2.8, '#f0ffe0');
    },
    phantomStrike(ctx) {
      glow(ctx, 0, 0, 18, '180,130,255', 0.5);
      // 殘影
      [[-9, -4, 0.35], [-4, 9, 0.5], [3, -2, 0.65]].forEach(([x, y, a]) => {
        ctx.save();
        ctx.globalAlpha = a;
        lionSilhouette(ctx, x, y, 0.6, '#b89aff', null, 1.5);
        ctx.restore();
      });
      lionSilhouette(ctx, 7, 9, 0.62, '#4a3478', '#2e1f4c', 1.8);
      // 很多小斬擊
      [[-12, -13, 0.6], [1, -15, -0.5], [13, -10, 0.8], [-15, 4, -0.7], [15, 2, 0.4], [-8, 15, 0.9], [4, 5, -0.4], [-2, -6, 0.3]].forEach(([x, y, a]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        A.shape(ctx, (c) => slashPath(c, -5, 0, 5, 0, 2.4, 0), '#ffffff', null, { lw: 1.2, hl: false });
        ctx.restore();
      });
      sparkle(ctx, 14, -15, 2.6, '#f0e0ff');
    },
  };

  // ═════════════ 技能投射物 ═════════════
  function flameProj(ctx, p, t) {
    const s = p.seed || 0;
    ctx.scale(p.dir || 1, 1);
    glow(ctx, 0, 0, 34, '255,140,40', 0.55);
    // 火星往後飄
    for (let i = 0; i < 5; i++) {
      const q = (t * 3 + i / 5 + s) % 1;
      const x = -14 - q * 34;
      const y = Math.sin(i * 2.1 + t * 9) * 7 * q - q * 4;
      ctx.globalAlpha = 1 - q;
      dot(ctx, x, y, 2.4 - q * 1.4, i % 2 ? '#ffd24a' : '#ff8a2a');
    }
    ctx.globalAlpha = 1;
    const f1 = Math.sin(t * 26 + s) * 3;
    const f2 = Math.sin(t * 19 + s * 2) * 3;
    const blob = (c, k) => {
      c.moveTo(16 * k, 0);
      c.bezierCurveTo(16 * k, -13 * k, 0, -15 * k, -10 * k, -10 * k);
      c.quadraticCurveTo(-22 * k, -12 * k + f1 * k, -36 * k, -6 * k + f1 * k);
      c.quadraticCurveTo(-24 * k, -2 * k, -32 * k, 3 * k + f2 * k);
      c.quadraticCurveTo(-22 * k, 5 * k, -26 * k, 11 * k - f1 * k);
      c.quadraticCurveTo(-12 * k, 14 * k, -2 * k, 13 * k);
      c.bezierCurveTo(8 * k, 13 * k, 16 * k, 8 * k, 16 * k, 0);
      c.closePath();
    };
    A.shape(ctx, (c) => blob(c, 1), '#ff6a24', '#d8421a', { lw: 2.6, shadeY: 5 });
    ctx.save();
    ctx.translate(3, -0.5);
    A.shape(ctx, (c) => blob(c, 0.62), '#ffb83a', null, { noStroke: true });
    ctx.translate(2, 0);
    A.shape(ctx, (c) => blob(c, 0.36), '#ffee8a', null, { noStroke: true });
    ctx.restore();
    A.ellipse(ctx, 6, -2, 3.6, 3.2, '#fffbe6', null, { noStroke: true, hl: false });
  }
  function icelance(ctx, p, t) {
    const s = p.seed || 0;
    ctx.scale(p.dir || 1, 1);
    // 冰霧尾巴
    const g = ctx.createLinearGradient(-80, 0, -20, 0);
    g.addColorStop(0, 'rgba(190,235,255,0)');
    g.addColorStop(1, 'rgba(190,235,255,0.55)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-20, -7);
    ctx.lineTo(-82, -2);
    ctx.lineTo(-82, 2);
    ctx.lineTo(-20, 7);
    ctx.closePath();
    ctx.fill();
    glow(ctx, 14, 0, 30, '170,225,255', 0.5);
    // 冰屑
    for (let i = 0; i < 6; i++) {
      const q = (t * 2.5 + i / 6 + s) % 1;
      const x = -30 - q * 46;
      const y = Math.sin(i * 1.9 + s) * 9 * (0.4 + q);
      ctx.globalAlpha = 1 - q;
      if (i % 2) sparkle(ctx, x, y, 3.2 - q * 1.5, '#ffffff');
      else dot(ctx, x, y, 1.8 - q, '#d8f2ff');
    }
    ctx.globalAlpha = 1;
    // 槍桿
    A.shape(ctx, (c) => { c.moveTo(-34, -2.6); c.lineTo(4, -3.2); c.lineTo(4, 3.2); c.lineTo(-34, 2.6); c.closePath(); }, '#9fd4f4', '#6aaede', { shadeY: 0.5, lw: 2, hl: false });
    // 尾端冰晶
    A.shape(ctx, (c) => crystalPath(c, -34, 0, 5, 5.5, 5), '#bfe8ff', '#7ec0ec', { shadeY: 0, lw: 1.8, hl: false });
    // 護手
    A.shape(ctx, (c) => { c.moveTo(0, -10); c.lineTo(6, 0); c.lineTo(0, 10); c.lineTo(-4, 0); c.closePath(); }, '#bfe8ff', '#7ec0ec', { shadeY: 0, lw: 2, hl: false });
    // 槍頭
    A.shape(ctx, (c) => crystalPath(c, 7, 0, 29, 7.5, 5), '#e6f8ff', '#9ad2f2', { shadeY: 0, lw: 2.2, hl: false });
    line(ctx, [[6, -2.2], [28, -1.2]], 'rgba(255,255,255,0.95)', 1.8);
    line(ctx, [[-28, -1], [-4, -1.2]], 'rgba(255,255,255,0.7)', 1.2);
    const tw = 0.5 + 0.5 * Math.sin(t * 14 + s);
    sparkle(ctx, 34, -1, 3 + tw * 3, '#ffffff');
  }
  function meteorProj(ctx, p, t) {
    const s = p.seed || 0;
    // 有速度就照實際方向畫，否則預設往前下方
    const hasV = p.vy > 0 && p.vx != null;
    const dir = hasV && p.vx !== 0 ? Math.sign(p.vx) : p.dir || 1;
    ctx.scale(dir, 1);
    const ang = hasV ? Math.atan2(p.vy, Math.abs(p.vx)) : Math.atan2(1, 0.75);
    // 火焰尾巴（往後上方）
    ctx.save();
    ctx.rotate(ang);
    const f = Math.sin(t * 20 + s) * 4;
    const tail = (c, w, len) => {
      c.moveTo(0, -w);
      c.quadraticCurveTo(-len * 0.45, -w * 0.9 + f, -len, f * 0.5);
      c.quadraticCurveTo(-len * 0.45, w * 0.9 - f, 0, w);
      c.closePath();
    };
    let g = ctx.createLinearGradient(-150, 0, 0, 0);
    g.addColorStop(0, 'rgba(255,90,30,0)');
    g.addColorStop(1, 'rgba(255,110,40,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath();
    tail(ctx, 44, 150);
    ctx.fill();
    g = ctx.createLinearGradient(-110, 0, 0, 0);
    g.addColorStop(0, 'rgba(255,220,90,0)');
    g.addColorStop(1, 'rgba(255,230,120,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    tail(ctx, 28, 110);
    ctx.fill();
    // 速度線
    ctx.strokeStyle = 'rgba(255,240,190,0.75)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const q = (t * 3 + i / 4 + s) % 1;
      const y = (i - 1.5) * 20;
      const x = -50 - q * 90;
      ctx.globalAlpha = 1 - q;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 26, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // 火星
    for (let i = 0; i < 6; i++) {
      const q = (t * 2 + i / 6 + s) % 1;
      const d = 40 + q * 70;
      const a = ang + PI + Math.sin(i * 2.7 + s) * 0.45;
      ctx.globalAlpha = 1 - q;
      dot(ctx, Math.cos(a) * d, Math.sin(a) * d, 3.5 - q * 2, i % 2 ? '#ffd24a' : '#ff8a2a');
    }
    ctx.globalAlpha = 1;
    glow(ctx, 0, 0, 72, '255,130,40', 0.6);
    // 岩石本體
    ctx.save();
    ctx.rotate(t * 3 + s);
    const rock = (c) => rockPath(c, 0, 0, 42, 9, s + 2);
    A.shape(ctx, rock, '#6a4640', '#46302c', { cel: [6, 6], lw: 3 });
    ctx.save();
    ctx.beginPath();
    rock(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c('#ff9a2a');
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-26, -18);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-10, 16);
    ctx.moveTo(-6, -4);
    ctx.lineTo(18, -10);
    ctx.lineTo(28, 6);
    ctx.moveTo(-10, 16);
    ctx.lineTo(8, 28);
    ctx.stroke();
    ctx.strokeStyle = A.c('#ffe46a');
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    // 迎面的熔岩亮面（不跟著轉，永遠在前下方）
    ctx.save();
    ctx.beginPath();
    rockPath(ctx, 0, 0, 40, 9, s + 2);
    ctx.clip();
    const hg = ctx.createRadialGradient(Math.cos(ang) * 30, Math.sin(ang) * 30, 2, Math.cos(ang) * 30, Math.sin(ang) * 30, 34);
    hg.addColorStop(0, 'rgba(255,240,150,0.9)');
    hg.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(-45, -45, 90, 90);
    ctx.restore();
  }
  function boulder(ctx, p, t) {
    const r = p.r || 34;
    const dir = p.dir || 1;
    const rot = p.rot != null ? p.rot : t * 6 * dir + (p.seed || 0);
    // 塵土（在滾動方向的後方地面）
    for (let i = 0; i < 4; i++) {
      const q = (t * 2.2 + i / 4 + (p.seed || 0)) % 1;
      const x = -dir * (r * 0.6 + q * r * 1.1);
      const y = r * 0.85 - q * r * 0.45;
      ctx.globalAlpha = (1 - q) * 0.9;
      A.ellipse(ctx, x, y, r * (0.16 + q * 0.18), r * (0.13 + q * 0.14), '#e0caa0', '#c8aa80', { lw: 1.6, hl: false });
    }
    ctx.globalAlpha = 1;
    // 速度線
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    [-0.45, 0, 0.4].forEach((k, i) => {
      const x0 = -dir * (r * 1.1 + (i % 2) * 8);
      ctx.beginPath();
      ctx.moveTo(x0, k * r);
      ctx.lineTo(x0 - dir * r * 0.55, k * r);
      ctx.stroke();
    });
    ctx.restore();
    // 岩石：形狀跟著轉，陰影永遠在右下（把月牙偏移反向旋轉）
    ctx.save();
    ctx.rotate(rot);
    const cr = Math.cos(-rot);
    const sr = Math.sin(-rot);
    const off = r * 0.14;
    const cel = [off * cr - off * sr, off * sr + off * cr];
    const hx = -r * 0.35;
    const hy = -r * 0.4;
    const rock = (c) => rockPath(c, 0, 0, r, 12, 3);
    A.shape(ctx, rock, '#b0a090', '#7e6e60', { cel: cel, lw: 3, hl: false });
    ctx.save();
    ctx.beginPath();
    rock(ctx);
    ctx.clip();
    // 苔蘚
    A.shape(ctx, (c) => {
      c.moveTo(-r * 0.9, -r * 0.25);
      c.quadraticCurveTo(-r * 0.55, -r * 0.55, -r * 0.1, -r * 0.95);
      c.lineTo(-r * 0.45, -r * 1.1);
      c.lineTo(-r * 1.1, -r * 0.6);
      c.closePath();
    }, '#7fb04a', '#5a8a34', { shadeY: -r * 0.55, lw: 2, hl: false });
    A.ellipse(ctx, r * 0.45, r * 0.5, r * 0.14, r * 0.09, '#7fb04a', null, { lw: 1.6, hl: false, rot: 0.6 });
    // 裂痕
    line(ctx, [[-r * 0.1, -r * 0.35], [r * 0.12, 0], [-r * 0.05, r * 0.35], [r * 0.1, r * 0.6]], '#5a4a3e', 2.4);
    line(ctx, [[r * 0.12, 0], [r * 0.55, -r * 0.1], [r * 0.7, -r * 0.35]], '#5a4a3e', 2.4);
    line(ctx, [[-r * 0.05, r * 0.35], [-r * 0.45, r * 0.45]], '#5a4a3e', 2);
    // 小凹坑
    A.ellipse(ctx, r * 0.4, -r * 0.5, r * 0.1, r * 0.08, '#8e7e70', null, { lw: 1.5, hl: false });
    A.ellipse(ctx, -r * 0.5, r * 0.2, r * 0.08, r * 0.07, '#8e7e70', null, { lw: 1.5, hl: false });
    ctx.restore();
    ctx.restore();
    // 固定的高光
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(hx, hy, r * 0.22, r * 0.12, -0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function shurikenProj(ctx, p, t) {
    const rot = t * 26 * (p.dir || 1) + (p.seed || 0);
    ctx.save();
    ctx.strokeStyle = 'rgba(230,240,255,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, TAU);
    ctx.stroke();
    ctx.restore();
    speedLines(ctx, [[-(p.dir || 1) * 16, -3, -(p.dir || 1) * 26, -3], [-(p.dir || 1) * 16, 3, -(p.dir || 1) * 22, 3]], 'rgba(255,255,255,0.7)', 1.6);
    shuriken(ctx, 0, 0, 12, rot, '#e4ecf6', '#8a98b0', 1.8, 0.1);
  }
  // 風魔手裡劍（闇夜盜王）：四片又長又利、往後掃的黑鋼彎刃，刃背有鋸齒缺口，刃口一線紫光；
  // 輪轂是暗鐵加暗紅鑲邊，中心嵌一顆血紅的眼石。身後拖著黑紫色的煙與風痕、飄著暗色的羽片。
  function fumaBlade(c, r) {
    c.moveTo(r * 0.2, -r * 0.12);
    c.lineTo(r * 0.42, -r * 0.17);
    c.lineTo(r * 0.47, -r * 0.13); // 刃背的缺口
    c.lineTo(r * 0.55, -r * 0.2);
    c.quadraticCurveTo(r * 0.82, -r * 0.3, r * 1.1, -r * 0.5); // 刃背（往後彎，尖端更長）
    c.quadraticCurveTo(r * 0.88, r * 0.0, r * 0.22, r * 0.17); // 刃口（外凸的弧）
    c.closePath();
  }
  function bigShuriken(ctx, p, t) {
    const r = p.r || 64;
    const dir = p.dir || 1;
    const s = p.seed || 0;
    const rot = t * 20 * dir + s;
    const O = '#120a18';
    const lite = !!G.lowFx;
    // 暗色光暈（中心發紫、外圈是黑煙）
    const aura = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.5);
    aura.addColorStop(0, 'rgba(120,60,200,0.35)');
    aura.addColorStop(0.6, 'rgba(30,10,50,0.28)');
    aura.addColorStop(1, 'rgba(10,0,20,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, TAU);
    ctx.fill();
    // 黑紫的風痕：頭粗尾細，跟著轉的反方向拖尾（外層黑煙、內層一線紫光）
    ctx.save();
    ctx.lineCap = 'butt';
    const nTr = lite ? 4 : 7;
    for (let i = 0; i < nTr; i++) {
      const rr = r * (1.02 + ((i * 37) % 5) * 0.07);
      const a0 = -t * 7 * dir + (i * TAU) / nTr + s;
      const span = 0.8 + (i % 3) * 0.28;
      const seg = 5;
      for (let j = 0; j < seg; j++) {
        const k0 = j / seg;
        const a1 = a0 + dir * span * k0;
        const a2 = a0 + dir * span * (k0 + 1 / seg) + dir * 0.03;
        ctx.beginPath();
        ctx.arc(0, 0, rr, a1, a2, dir < 0);
        ctx.strokeStyle = 'rgba(20,6,30,' + (0.7 * (1 - k0)).toFixed(2) + ')';
        ctx.lineWidth = Math.max(0.8, 6 * (1 - k0));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, rr, a1, a2, dir < 0);
        ctx.strokeStyle = 'rgba(190,130,255,' + (0.85 * (1 - k0)).toFixed(2) + ')';
        ctx.lineWidth = Math.max(0.5, 2 * (1 - k0));
        ctx.stroke();
      }
    }
    ctx.lineCap = 'round';
    // 飄散的暗色羽片
    if (!lite) {
      for (let i = 0; i < 4; i++) {
        const a = -t * 5 * dir + i * 1.7 + s;
        const rr = r * (1.2 + 0.1 * Math.sin(t * 3 + i));
        ctx.save();
        ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr);
        ctx.rotate(a * 2 + t * 6);
        ctx.beginPath();
        ctx.moveTo(-r * 0.09, 0);
        ctx.quadraticCurveTo(0, -r * 0.04, r * 0.09, 0);
        ctx.quadraticCurveTo(0, r * 0.03, -r * 0.09, 0);
        ctx.fillStyle = i % 2 ? '#2a1838' : '#4a2a66';
        ctx.fill();
        ctx.strokeStyle = 'rgba(200,150,255,0.6)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    // 高速旋轉的暗色轉盤殘影
    ctx.save();
    const disc = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.08);
    disc.addColorStop(0, 'rgba(40,20,60,0.3)');
    disc.addColorStop(0.85, 'rgba(90,50,140,0.14)');
    disc.addColorStop(1, 'rgba(90,50,140,0)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.08, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 殘刃
    if (!lite) {
      [0.26, 0.5].forEach((lag, k) => {
        ctx.save();
        ctx.rotate(rot - lag * dir);
        ctx.globalAlpha = 0.3 - k * 0.12;
        ctx.fillStyle = '#3a2250';
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate((i * TAU) / 4);
          ctx.scale(1, dir);
          ctx.beginPath();
          fumaBlade(ctx, r);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      });
    }
    // 四片黑鋼刃
    ctx.save();
    ctx.rotate(rot);
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / 4);
      ctx.scale(1, dir);
      const g = ctx.createLinearGradient(0, -r * 0.45, 0, r * 0.2);
      g.addColorStop(0, '#0e0a14');
      g.addColorStop(0.5, '#2c2638');
      g.addColorStop(1, '#5a5268');
      ctx.beginPath();
      fumaBlade(ctx, r);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      fumaBlade(ctx, r);
      ctx.clip();
      // 刃口：一道冷紫的磨亮斜面＋最外緣一線白光
      ctx.beginPath();
      ctx.moveTo(r * 1.1, -r * 0.5);
      ctx.quadraticCurveTo(r * 0.88, r * 0.0, r * 0.22, r * 0.17);
      ctx.lineTo(r * 0.24, r * 0.08);
      ctx.quadraticCurveTo(r * 0.76, -r * 0.05, r * 1.1, -r * 0.5);
      ctx.closePath();
      const eg = ctx.createLinearGradient(r * 0.2, 0, r * 1.1, 0);
      eg.addColorStop(0, 'rgba(120,80,190,0.55)');
      eg.addColorStop(1, 'rgba(210,170,255,0.95)');
      ctx.fillStyle = eg;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 1.1, -r * 0.5);
      ctx.quadraticCurveTo(r * 0.88, r * 0.0, r * 0.22, r * 0.17);
      ctx.strokeStyle = 'rgba(245,235,255,0.9)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // 刃身上的暗紅符紋（血槽）
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.06);
      ctx.quadraticCurveTo(r * 0.62, -r * 0.14, r * 0.9, -r * 0.34);
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = Math.max(1.6, r * 0.035);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.34, -r * 0.07);
      ctx.quadraticCurveTo(r * 0.62, -r * 0.14, r * 0.84, -r * 0.3);
      ctx.strokeStyle = 'rgba(220,40,70,' + (0.55 + 0.35 * Math.sin(t * 6 + i)).toFixed(2) + ')';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      fumaBlade(ctx, r);
      ctx.strokeStyle = O;
      ctx.lineWidth = 2.8;
      ctx.lineJoin = 'miter';
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // 輪轂：暗鐵 → 暗紅鑲邊 → 尖釘 → 血紅眼石
    ctx.save();
    ctx.rotate(rot);
    const hub = ctx.createRadialGradient(-r * 0.08, -r * 0.08, 0, 0, 0, r * 0.32);
    hub.addColorStop(0, '#4a4458');
    hub.addColorStop(1, '#141018');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, TAU);
    ctx.fillStyle = hub;
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.23, 0, TAU);
    ctx.strokeStyle = '#7a1a2a';
    ctx.lineWidth = Math.max(2, r * 0.045);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,120,140,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.23, PI * 1.05, PI * 1.6);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * TAU) / 4 + PI / 4;
      const x = Math.cos(a) * r * 0.23;
      const y = Math.sin(a) * r * 0.23;
      const q = Math.max(2, r * 0.045);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * q * 1.6, y + Math.sin(a) * q * 1.6);
      ctx.lineTo(x + Math.cos(a + 1.9) * q, y + Math.sin(a + 1.9) * q);
      ctx.lineTo(x + Math.cos(a - 1.9) * q, y + Math.sin(a - 1.9) * q);
      ctx.closePath();
      ctx.fillStyle = '#6a6278';
      ctx.fill();
      ctx.strokeStyle = O;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
    glow(ctx, 0, 0, r * 0.34, '230,40,80', 0.5);
    const gem = ctx.createRadialGradient(-r * 0.04, -r * 0.05, 0, 0, 0, r * 0.14);
    gem.addColorStop(0, '#ffd0d8');
    gem.addColorStop(0.45, '#e8203c');
    gem.addColorStop(1, '#5a0414');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.13, 0, TAU);
    ctx.fillStyle = gem;
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // 眼石裡的直瞳
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.025, r * 0.09, 0, 0, TAU);
    ctx.fillStyle = '#12020a';
    ctx.fill();
    const sh = Math.max(0, Math.sin(t * 20 + s));
    if (sh > 0.3) sparkle(ctx, -r * 0.52, -r * 0.44, r * 0.16 * sh, '#f0e0ff');
  }
  function hammer(ctx, p, t) {
    const s = p.seed || 0;
    ctx.rotate(Math.sin(t * 6 + s) * 0.05);
    // 下墜速度線（在上方）
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const q = (t * 3 + i / 5 + s) % 1;
      const x = (i - 2) * 16;
      const y = -30 - q * 70;
      ctx.globalAlpha = 1 - q;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 22);
      ctx.stroke();
    }
    ctx.restore();
    glow(ctx, 0, 4, 52, '255,220,140', 0.35);
    // 錘柄
    A.shape(ctx, (c) => A.roundRect(c, -5.5, -78, 11, 66, 4), '#b07a4a', '#8a5a34', { cel: [2.5, 0], lw: 2.6, hl: false });
    [-68, -56].forEach((y) => A.shape(ctx, (c) => A.roundRect(c, -7, y, 14, 6, 2), '#7a4a2a', null, { lw: 2, hl: false }));
    A.ellipse(ctx, 0, -80, 8, 6, '#e0a040', '#b07a28', { lw: 2.4, hl: false });
    // 錘頭
    A.shape(ctx, (c) => A.roundRect(c, -30, -16, 60, 34, 6), '#a8988a', '#6e5e50', { cel: [5, 5], lw: 3, hl: [-17, -8, 7, 3] });
    A.shape(ctx, (c) => { c.rect(-18, -17, 7, 36); c.rect(11, -17, 7, 36); }, '#e0a040', '#b07a28', { shadeY: 10, lw: 2.2, hl: false });
    // 敲擊面的裂痕
    line(ctx, [[-4, 18], [-1, 10], [-5, 4]], '#5a4a3e', 2);
    line(ctx, [[22, -12], [26, -4]], '#5a4a3e', 2);
    // 石面刻紋
    A.shape(ctx, (c) => starPath(c, 0, 1, 6, 2.6, 4, 0), '#ffe066', null, { lw: 1.6, hl: false });
  }
  function iceShard(ctx, p, t) {
    const s = p.seed || 0;
    const g = ctx.createLinearGradient(0, -34, 0, -6);
    g.addColorStop(0, 'rgba(200,240,255,0)');
    g.addColorStop(1, 'rgba(200,240,255,0.6)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(0, -36);
    ctx.lineTo(5, -6);
    ctx.closePath();
    ctx.fill();
    glow(ctx, 0, 2, 18, '180,230,255', 0.5);
    ctx.rotate(Math.sin(t * 8 + s) * 0.08);
    iceShardAt(ctx, 0, -4, 18, 6.5, PI / 2, 2);
    const tw = Math.sin(t * 12 + s);
    if (tw > 0) sparkle(ctx, 3, 10, 2 + tw * 2.5, '#ffffff');
  }

  // ═════════════ 怪物狀態特效 ═════════════
  A.drawStatus = function (ctx, m, t) {
    if (!m || m.dead) return;
    const sc = m.scale || 1;
    const h = (m.h || 40) * sc;
    const w = (m.w || 40) * sc;
    const seed = ((m.x || 0) * 0.013) % TAU;
    t = t != null ? t : m.t || 0;
    ctx.save();
    ctx.translate(m.x, m.y);

    if (m.frozenT > 0) {
      // 冰凍：一團不規則的冰（包住身體的冰殼）＋從幾個生長點往外長的晶簇。
      // 每根晶體的粗細、長度、角度、斷面數、頂端（尖、斜切、斷裂）都不同，大晶體旁再長小晶體。
      // 形狀用位置當種子，同一隻怪每一格都一樣。
      const bw = Math.max(w * 1.3, h * 0.8) + 14;
      const bh = h * 1.12 + 12;
      const hov = m.hover || 0;
      const air = hov > 12; // 飛在空中：冰包住身體，不貼地
      ctx.save();
      ctx.translate(0, -hov);
      if (!air) {
        // 地面以下不畫（晶體的根埋進冰層裡）
        ctx.beginPath();
        ctx.rect(-bw * 2, -bh * 3, bw * 4, bh * 3 + 3);
        ctx.clip();
      }
      const a = m.frozenT < 0.5 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 18)) : 1;
      let rs = Math.floor(Math.abs(seed * 1e4)) + 7;
      const R = () => {
        rs = (rs * 16807) % 2147483647;
        return (rs & 0xffff) / 0x10000;
      };
      const O = A.outline();
      ctx.globalAlpha = a;
      glow(ctx, 0, -bh * 0.5, Math.max(bw, bh) * 0.7, '170,225,255', 0.26);
      const path = (pts) => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.closePath();
      };
      // 冰殼：沿著身體外緣、邊緣凹凸不平的一塊
      const shell = [];
      const NS = 9;
      for (let i = 0; i <= NS; i++) {
        const k = i / NS;
        const ang = PI + k * PI; // 左下 → 頂 → 右下
        const r = 0.82 + R() * 0.36;
        const yy = Math.sin(ang) * bh * 0.86 * (0.88 + R() * 0.22) + 3;
        shell.push([Math.cos(ang) * bw * 0.55 * r, air ? yy + bh * 0.08 : Math.min(3, yy)]);
      }
      if (air) {
        // 空中：下半部也包起來（上下對稱的凹凸冰塊）
        for (let i = 1; i < NS; i++) {
          const ang = (i / NS) * PI;
          shell.push([Math.cos(ang) * bw * 0.55 * (0.9 + R() * 0.2), 3 + Math.sin(ang) * bh * 0.12 * (0.7 + R() * 0.5)]);
        }
      } else shell.push([bw * 0.55, 3], [-bw * 0.55, 3]);
      path(shell);
      ctx.fillStyle = 'rgba(185,228,255,0.24)';
      ctx.fill();
      ctx.globalAlpha = a * 0.4;
      ctx.strokeStyle = O;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(235,250,255,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 冰殼裡面的幾條折射裂紋（不規則折線）
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        let x = (R() - 0.5) * bw * 0.6;
        let y = -bh * (0.2 + R() * 0.5);
        ctx.moveTo(x, y);
        for (let j = 0; j < 3; j++) {
          x += (R() - 0.5) * bw * 0.25;
          y += (R() - 0.3) * bh * 0.18;
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // 一根晶體：本地座標沿長軸往上，左右兩邊各有一個轉折，頂端三種形式
      const crystal = (bx, by, ang, len, wid, back) => {
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const P = (lx, ly) => [bx + lx * ca + ly * sa, by - (ly * ca - lx * sa)];
        const hw = wid / 2;
        const lk = 0.3 + R() * 0.45; // 左側轉折的高度
        const rk = 0.3 + R() * 0.45;
        const lo = (R() - 0.35) * hw * 0.35; // 轉折往外或往內
        const ro = (R() - 0.35) * hw * 0.35;
        const sh = len * (0.62 + R() * 0.2); // 頂端開始收的地方
        const shL = sh * (0.9 + R() * 0.18);
        const shR = sh * (0.9 + R() * 0.18);
        const kind = R();
        const top = [];
        if (kind < 0.55) top.push(P((R() - 0.5) * hw * 0.9, len)); // 尖頂（歪的）
        else if (kind < 0.8) top.push(P(-hw * 0.55, len * (0.93 + R() * 0.05)), P(hw * 0.5, len * (0.8 + R() * 0.08))); // 斜切
        else top.push(P(-hw * 0.5, len * 0.9), P(-hw * 0.1, len * 0.97), P(hw * 0.15, len * 0.86), P(hw * 0.5, len * 0.92)); // 斷口
        const L0 = P(-hw * (0.85 + R() * 0.2), 0);
        const L1 = P(-hw + lo, len * lk);
        const L2 = P(-hw * (0.85 + R() * 0.2), shL);
        const R2 = P(hw * (0.85 + R() * 0.2), shR);
        const R1 = P(hw + ro, len * rk);
        const R0 = P(hw * (0.85 + R() * 0.2), 0);
        const outline = [L0, L1, L2].concat(top, [R2, R1, R0]);
        const dim = back ? 0.7 : 1;
        // 斷面：2 或 3 個面，分界位置不固定
        const faces = R() < 0.5 ? 2 : 3;
        const cut1 = -hw * (0.25 + R() * 0.3);
        const cut2 = hw * (0.1 + R() * 0.4);
        const apex = top[Math.floor(top.length / 2)];
        const c1b = P(cut1, 0), c1t = P(cut1 * 0.7, sh);
        const c2b = P(cut2, 0), c2t = P(cut2 * 0.7, sh);
        path(outline);
        ctx.fillStyle = 'rgba(160,215,250,' + (0.24 * dim).toFixed(3) + ')';
        ctx.fill();
        ctx.save();
        path(outline);
        ctx.clip();
        // 左側受光面
        path([L0, L1, L2, c1t, c1b]);
        ctx.fillStyle = 'rgba(235,248,255,' + ((0.28 + R() * 0.12) * dim).toFixed(3) + ')';
        ctx.fill();
        // 右側背光面
        path(faces === 3 ? [c2b, c2t, R2, R1, R0] : [c1b, c1t, R2, R1, R0]);
        ctx.fillStyle = 'rgba(70,135,200,' + ((0.2 + R() * 0.12) * dim).toFixed(3) + ')';
        ctx.fill();
        // 頂端斜面
        path([L2, c1t, apex]);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.4 * dim).toFixed(3) + ')';
        ctx.fill();
        ctx.restore();
        path(outline);
        ctx.globalAlpha = a * (back ? 0.32 : 0.55);
        ctx.strokeStyle = O;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = a;
        ctx.strokeStyle = 'rgba(235,250,255,' + (back ? 0.55 : 0.9) + ')';
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + (back ? 0.3 : 0.55) + ')';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(c1b[0], c1b[1]);
        ctx.lineTo(c1t[0], c1t[1]);
        ctx.lineTo(apex[0], apex[1]);
        if (faces === 3) {
          ctx.moveTo(c2b[0], c2b[1]);
          ctx.lineTo(c2t[0], c2t[1]);
          ctx.lineTo(apex[0], apex[1]);
        }
        ctx.stroke();
        if (!back && wid > 9) {
          const h1 = P(-hw * 0.6, len * (0.12 + R() * 0.1));
          const h2 = P(-hw * 0.55, len * (0.45 + R() * 0.2));
          line(ctx, [h1, h2], 'rgba(255,255,255,0.8)', Math.min(2.2, wid * 0.12));
        }
        return P;
      };
      // 生長點：2～3 個，不平均地散在腳邊與身體兩側
      const nOrig = 2 + (R() < 0.5 ? 1 : 0);
      const crystals = [];
      for (let o = 0; o < nOrig; o++) {
        const ox = (R() - 0.5) * bw * 0.85;
        const oy = air ? -bh * (0.2 + R() * 0.5) : 6 + R() * 4; // 貼地時根部略低於地面，被冰層蓋住
        const lean = ox / bw; // 靠邊的晶簇往外倒
        const cnt = 2 + Math.floor(R() * 3);
        for (let i = 0; i < cnt; i++) {
          const big = i === 0;
          crystals.push({
            x: ox + (R() - 0.5) * 10,
            y: oy,
            ang: lean * 0.8 + (R() - 0.5) * (big ? 0.45 : 1.2),
            len: bh * (big ? 0.7 + R() * 0.4 : 0.25 + R() * 0.4) * (air ? 0.6 : 1),
            wid: bw * (big ? 0.26 + R() * 0.16 : 0.1 + R() * 0.12),
            back: R() < 0.4,
          });
        }
      }
      crystals.sort((p, q) => (p.back === q.back ? q.len - p.len : p.back ? -1 : 1));
      crystals.forEach((c) => {
        const P = crystal(c.x, c.y, c.ang, c.len, c.wid, c.back);
        // 大晶體側面再冒一兩根小晶體
        if (c.len > bh * 0.55 && R() < 0.7) {
          const side = R() < 0.5 ? -1 : 1;
          const at = P(side * c.wid * 0.45, c.len * (0.25 + R() * 0.35));
          crystal(at[0], at[1], c.ang + side * (0.5 + R() * 0.5), c.len * (0.2 + R() * 0.2), c.wid * (0.3 + R() * 0.2), c.back);
        }
      });
      if (!air) {
        ctx.restore();
        ctx.save();
        ctx.translate(0, -hov);
        // 貼地的冰層：邊緣不規則、有厚度，把晶體的根蓋住；底下一道接觸陰影
        const gw = bw * 0.56;
        ctx.fillStyle = 'rgba(20,40,70,0.22)';
        ctx.beginPath();
        ctx.ellipse(0, 4, gw * 1.02, 5, 0, 0, TAU);
        ctx.fill();
        const NB = 14;
        const topE = [];
        for (let i = 0; i <= NB; i++) {
          const k = i / NB;
          const edge = Math.sin(k * PI); // 中間厚、兩端薄
          topE.push([-gw + k * gw * 2 + (R() - 0.5) * 6, 3 - (3 + edge * (5 + R() * 7))]);
        }
        const sheet = topE.concat([[gw * (1 + R() * 0.08), 4], [-gw * (1 + R() * 0.08), 4]]);
        path(sheet);
        const sg = ctx.createLinearGradient(0, -10, 0, 4);
        sg.addColorStop(0, 'rgba(235,249,255,0.85)');
        sg.addColorStop(1, 'rgba(130,185,230,0.7)');
        ctx.fillStyle = sg;
        ctx.fill();
        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = O;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.globalAlpha = a;
        // 冰層上緣的亮邊（只畫上緣，不畫貼地那條線）
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(topE[0][0], topE[0][1] + 1);
        for (let i = 1; i < topE.length; i++) ctx.lineTo(topE[i][0], topE[i][1] + 1);
        ctx.stroke();
        // 冰層往外延伸到地面上的霜紋
        ctx.strokeStyle = 'rgba(230,248,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const side = i % 2 ? 1 : -1;
          let x = side * gw * (0.85 + R() * 0.15);
          ctx.moveTo(x, 3);
          x += side * (8 + R() * 14);
          ctx.lineTo(x, 3 - R() * 2);
          ctx.lineTo(x + side * (4 + R() * 6), 3 + R() * 1.5);
        }
        ctx.stroke();
        // 冰層前緣幾塊凸起的碎冰
        for (let i = 0; i < 3; i++) {
          const x = (R() - 0.5) * gw * 1.6;
          const r = 3 + R() * 4;
          path([[x - r, 4], [x - r * (0.2 + R() * 0.5), 4 - r * (0.8 + R() * 0.6)], [x + r * (0.3 + R() * 0.5), 4 - r * (0.4 + R() * 0.5)], [x + r, 4]]);
          ctx.fillStyle = 'rgba(225,245,255,0.8)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(40,90,140,0.45)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      sparkle(ctx, (R() - 0.5) * bw * 0.5, -bh * (0.5 + R() * 0.3), 3 + 2 * Math.max(0, Math.sin(t * 7 + seed)), '#ffffff');
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    if (m.burnT > 0) {
      glow(ctx, 0, -h * 0.4, Math.max(w, h) * 0.8, '255,120,40', 0.28);
      // 身體周圍的火焰舌：兩側高、腳邊矮，不擋住臉
      const k2 = Math.min(1.6, Math.max(0.8, sc));
      const spots = [[-0.55, 0.4, 1.05], [0.55, 0.34, 1], [-0.42, 0.06, 0.85], [0.44, 0.1, 0.9], [0.05, -0.04, 0.6], [-0.25, 0.72, 0.75]];
      spots.forEach(([kx, ky, s], i) => {
        const x = kx * w;
        const baseY = -h * ky;
        const fh = 18 * s * k2 * (0.8 + 0.25 * Math.sin(t * 13 + i * 2.1 + seed));
        ctx.globalAlpha = 0.9;
        flame(ctx, x, baseY, 5.6 * s * k2, fh, Math.sin(t * 17 + i * 1.3) * 3, 1.4);
      });
      // 火星往上飄
      for (let i = 0; i < 6; i++) {
        const q = (t * 1.3 + i / 6 + seed) % 1;
        const x = Math.sin(i * 2.9 + seed) * w * 0.45 + Math.sin(t * 5 + i) * 3;
        const y = -h * 0.3 - q * h * 0.9;
        ctx.globalAlpha = (1 - q) * 0.95;
        dot(ctx, x, y, 2.2 - q * 1.2, i % 2 ? '#ffd24a' : '#ff8a2a');
      }
      ctx.globalAlpha = 1;
    }

    if (m.stunT > 0) {
      const cy = -h - 10;
      const rx = Math.max(14, w * 0.38);
      // 先畫後面的星星，再畫前面的，讓它有繞圈的深度
      const stars = [];
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + (i * TAU) / 3;
        stars.push([Math.cos(a) * rx, cy + Math.sin(a) * 5, Math.sin(a)]);
      }
      stars.sort((p, q) => p[2] - q[2]);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,240,160,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, cy, rx, 5, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      stars.forEach(([x, y, d]) => {
        const r = 5.5 + d * 1.3;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 4);
        A.shape(ctx, (c) => starPath(c, 0, 0, r, r * 0.45, 5, -PI / 2), '#ffe066', '#f0b020', { cel: [1, 1], lw: 1.6, hl: false });
        ctx.restore();
      });
    }
    ctx.restore();
  };

  Object.assign(A.ICON, ICON3);
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  Object.assign(A.PROJ_DRAW, {
    flame: flameProj,
    icelance,
    meteor: meteorProj,
    boulder,
    shuriken: shurikenProj,
    bigShuriken,
    hammer,
    iceShard,
  });
})();

// ═════════ 技能大特效（世界座標）：雷霆審判、升龍爪 ═════════
// 分兩層畫：back（在怪物、玩家後面；由 loot.draw 前的掛鉤呼叫）、front（在粒子之後、傷害數字之前；由 fx.drawCuts 呼叫）。
// 每個特效模組登記到 A.skillFx；狀態每幀只推進一次（哪一層先被呼叫就在那一層推進），兩層看到的是同一個狀態。
// 粒子用預先配置好的物件池，畫的時候不產生新物件；鋸齒雷的點放在各特效自己的 Float32Array 裡。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const PI = Math.PI;
  let seed = 918273;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const rr = (a, b) => a + (b - a) * rnd();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const eOut = (k) => 1 - (1 - k) * (1 - k);
  const eBack = (k) => {
    const c = 1.9;
    return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  };
  const mk = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w);
    c.height = Math.ceil(h || w);
    return c;
  };
  function radial(size, stops) {
    const cv = mk(size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  }
  const lite = () => !!G.lowFx;
  const OUTC = '#4a2e1f'; // 遊戲一貫的深棕描邊

  // ── 共用：粒子池 ──
  function pool(n) {
    const a = [];
    for (let i = 0; i < n; i++) a.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, rot: 0, vr: 0, g: 0, floor: 1e9, drag: 0, c: 0, b: 0 });
    return { a, i: 0, n: 0 };
  }
  function spawn(P, k, x, y, vx, vy, life, s) {
    const a = P.a;
    for (let j = 0; j < a.length; j++) {
      const q = a[(P.i + j) % a.length];
      if (q.on) continue;
      P.i = (P.i + j + 1) % a.length;
      P.n++;
      q.on = true;
      q.k = k;
      q.x = x;
      q.y = y;
      q.vx = vx;
      q.vy = vy;
      q.t = 0;
      q.life = life;
      q.s = s;
      q.rot = rr(0, TAU);
      q.vr = rr(-9, 9);
      q.g = 0;
      q.floor = 1e9;
      q.drag = 0;
      q.c = 0;
      q.b = 0;
      return q;
    }
    return null;
  }
  function stepPool(P, dt) {
    if (!P.n) return;
    for (const q of P.a) {
      if (!q.on) continue;
      q.t += dt;
      if (q.t >= q.life) {
        q.on = false;
        P.n--;
        continue;
      }
      if (q.drag) {
        const d = Math.max(0, 1 - q.drag * dt);
        q.vx *= d;
        q.vy *= d;
      }
      q.vy += q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
      if (q.y > q.floor) {
        q.y = q.floor;
        if (q.b++ < 1 && q.vy > 60) {
          q.vy *= -0.3;
          q.vx *= 0.55;
          q.vr *= 0.5;
        } else {
          q.vy = 0;
          q.vx *= 0.8;
          q.vr = 0;
        }
      }
    }
  }
  function clearPool(P) {
    for (const q of P.a) q.on = false;
    P.n = 0;
  }

  // ── 共用：鋸齒雷（寫進 buf，回傳點數） ──
  function jag(buf, off, x0, y0, x1, y1, n, amp) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const o = i === 0 || i === n ? 0 : rr(-amp, amp);
      buf[off + i * 2] = x0 + dx * k + nx * o;
      buf[off + i * 2 + 1] = y0 + dy * k + ny * o;
    }
    return n + 1;
  }
  function pathBuf(ctx, buf, off, cnt) {
    ctx.beginPath();
    ctx.moveTo(buf[off], buf[off + 1]);
    for (let i = 1; i < cnt; i++) ctx.lineTo(buf[off + i * 2], buf[off + i * 2 + 1]);
  }
  // 一道電弧：外層藍光＋白芯（呼叫前要先設好 'lighter'）
  function arc(ctx, buf, off, cnt, w, a, hue) {
    if (a <= 0.01) return;
    pathBuf(ctx, buf, off, cnt);
    ctx.globalAlpha = Math.min(1, a) * 0.4;
    ctx.strokeStyle = hue || '#6aa8ff';
    ctx.lineWidth = w * 3.4;
    ctx.stroke();
    ctx.globalAlpha = Math.min(1, a);
    ctx.strokeStyle = '#eef6ff';
    ctx.lineWidth = w;
    ctx.stroke();
  }

  // ── 模組登記 ──
  const MODS = [];
  let lastStep = -1;
  function step() {
    if (G.time === lastStep) return;
    const dt = lastStep < 0 ? 0 : clamp(G.time - lastStep, 0, 0.05);
    lastStep = G.time;
    for (const m of MODS) m.step(dt);
  }
  A.skillFx = {
    add(m) {
      MODS.push(m);
    },
    back(ctx) {
      step();
      for (const m of MODS) {
        if (!m.live() || !m.back) continue;
        ctx.save();
        m.back(ctx);
        ctx.restore();
      }
    },
    front(ctx) {
      step();
      for (const m of MODS) {
        if (!m.live() || !m.front) continue;
        ctx.save();
        m.front(ctx);
        ctx.restore();
      }
    },
    clear() {
      MODS.forEach((m) => m.clear());
    },
  };

  const GLOW_B = radial(128, [[0, 'rgba(255,255,255,1)'], [0.16, 'rgba(215,236,255,0.9)'], [0.42, 'rgba(120,175,255,0.34)'], [1, 'rgba(60,110,255,0)']]);
  const GLOW_G = radial(96, [[0, 'rgba(255,240,190,0.9)'], [0.4, 'rgba(255,200,90,0.35)'], [1, 'rgba(255,170,60,0)']]);
  const GLOW_O = radial(96, [[0, 'rgba(255,250,210,1)'], [0.25, 'rgba(255,200,90,0.7)'], [0.6, 'rgba(255,130,30,0.22)'], [1, 'rgba(255,110,20,0)']]);
  const SMOKE = radial(64, [[0, 'rgba(58,58,68,0.55)'], [0.6, 'rgba(52,52,62,0.25)'], [1, 'rgba(48,48,58,0)']]);
  const SCORCH = radial(128, [[0, 'rgba(10,8,14,0.92)'], [0.5, 'rgba(22,16,20,0.66)'], [1, 'rgba(30,24,22,0)']]);
  // 雷柱的外光：水平方向的漸層條，拉長貼上去
  const COLG = (() => {
    const cv = mk(64, 4);
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(70,130,255,0)');
    g.addColorStop(0.3, 'rgba(90,150,255,0.35)');
    g.addColorStop(0.5, 'rgba(170,210,255,0.85)');
    g.addColorStop(0.7, 'rgba(90,150,255,0.35)');
    g.addColorStop(1, 'rgba(70,130,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 4);
    return cv;
  })();

  // ════════════════ 雷霆審判 ════════════════
  // 施法者背後浮出一圈雷鼓光環（金環＋八面太鼓，鼓面是三道雷勾紋）→ 鼓一面接一面地敲、迸出火花；
  // 畫面最上方翻滾出厚重的雷雲（寬度蓋住要劈的目標群），雲底閃著電；先導雷從雲底一節節探下來 →
  // 藍白雷柱一道接一道劈下（五連劈，前四道細一點、最後一道最粗），每道都在地面炸出焦黑的坑、裂縫與衝擊波，
  // 之後地上還爬著殘電。不做全螢幕閃白，只有局部的光暈。

  // 太鼓（正面、往右下看得到一點鼓身）：預先畫成 3 倍解析度的圖
  const DS = 3;
  const DR = 15;
  const DRUM = (() => {
    const R = DR * DS;
    const S = Math.ceil(R * 2.9);
    const cv = mk(S);
    const c = cv.getContext('2d');
    const cx = S / 2 - R * 0.1;
    const cy = S / 2 - R * 0.1;
    const bx = cx + R * 0.24;
    const by = cy + R * 0.26;
    const lw = 2.2 * DS;
    c.lineJoin = 'round';
    c.lineCap = 'butt';
    // 鼓身（前後兩個圓之間的圓筒）：先描邊、再塗色
    c.fillStyle = OUTC;
    c.beginPath();
    c.arc(bx, by, R + lw / 2, 0, TAU);
    c.fill();
    c.strokeStyle = OUTC;
    c.lineWidth = R * 2 + lw;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(bx, by);
    c.stroke();
    c.fillStyle = '#8a3320';
    c.beginPath();
    c.arc(bx, by, R, 0, TAU);
    c.fill();
    c.strokeStyle = '#8a3320';
    c.lineWidth = R * 2;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(bx, by);
    c.stroke();
    // 鼓身上的金色箍
    c.strokeStyle = '#e8b448';
    c.lineWidth = R * 0.16;
    c.beginPath();
    c.arc(cx + (bx - cx) * 0.55, cy + (by - cy) * 0.55, R * 0.99, -0.3, 1.9);
    c.stroke();
    // 鼓框（紅漆）
    c.fillStyle = '#d4462c';
    c.beginPath();
    c.arc(cx, cy, R, 0, TAU);
    c.fill();
    c.strokeStyle = OUTC;
    c.lineWidth = lw;
    c.stroke();
    c.strokeStyle = '#ff9a70';
    c.lineWidth = R * 0.08;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(cx, cy, R * 0.9, PI * 1.05, PI * 1.55);
    c.stroke();
    // 鉚釘
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      c.beginPath();
      c.arc(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86, R * 0.075, 0, TAU);
      c.fillStyle = '#ffd97a';
      c.fill();
      c.strokeStyle = OUTC;
      c.lineWidth = DS * 0.7;
      c.stroke();
    }
    // 鼓面
    const Rs = R * 0.7;
    c.beginPath();
    c.arc(cx, cy, Rs, 0, TAU);
    c.fillStyle = '#f6edd4';
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = '#e0cfa8';
    c.beginPath();
    c.arc(cx + Rs * 0.3, cy + Rs * 0.32, Rs, 0, TAU);
    c.fill();
    c.fillStyle = '#f6edd4';
    c.beginPath();
    c.arc(cx - Rs * 0.08, cy - Rs * 0.08, Rs * 0.93, 0, TAU);
    c.fill();
    c.restore();
    c.strokeStyle = '#9a7650';
    c.lineWidth = DS * 0.9;
    c.beginPath();
    c.arc(cx, cy, Rs, 0, TAU);
    c.stroke();
    // 三道雷勾紋：勾頭＋沿著圓繞出去、尾端折一下的電勾
    c.fillStyle = '#2d3c8e';
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU - 0.4;
      const hr = Rs * 0.2;
      const hd = Rs * 0.36;
      const hx = cx + Math.cos(a) * hd;
      const hy = cy + Math.sin(a) * hd;
      c.beginPath();
      c.arc(hx, hy, hr, 0, TAU);
      c.fill();
      const r1 = hd + hr;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      c.arc(cx, cy, r1, a, a + 1.55);
      // 尾端的電折
      const ta = a + 1.55;
      c.lineTo(cx + Math.cos(ta + 0.22) * r1 * 0.82, cy + Math.sin(ta + 0.22) * r1 * 0.82);
      c.lineTo(cx + Math.cos(ta + 0.05) * r1 * 0.7, cy + Math.sin(ta + 0.05) * r1 * 0.7);
      c.quadraticCurveTo(cx + Math.cos(a + 0.8) * hd * 0.72, cy + Math.sin(a + 0.8) * hd * 0.72, cx + Math.cos(a) * (hd - hr), cy + Math.sin(a) * (hd - hr));
      c.closePath();
      c.fill();
    }
    c.beginPath();
    c.arc(cx, cy, Rs * 0.1, 0, TAU);
    c.fillStyle = '#e8b448';
    c.fill();
    // 鼓面高光
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = DS * 1.2;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(cx, cy, Rs * 0.8, PI * 1.1, PI * 1.4);
    c.stroke();
    return { c: cv, w: S / DS, ox: (cx / S) * (S / DS), oy: (cy / S) * (S / DS) };
  })();
  // 雷雲的雲團：先把所有雲團的深色外框畫一遍，再畫所有雲團本體 → 只有整朵雲的外緣有描邊
  const PF_OUT = radial(64, [[0, '#17151f'], [0.96, '#17151f'], [1, 'rgba(23,21,31,0)']]);
  const PF_FILL = (() => {
    const cv = mk(64);
    const c = cv.getContext('2d');
    c.beginPath();
    c.arc(32, 32, 31, 0, TAU);
    const g = c.createLinearGradient(0, 2, 0, 62);
    g.addColorStop(0, '#6e7794');
    g.addColorStop(0.45, '#434a64');
    g.addColorStop(1, '#1e2130');
    c.fillStyle = g;
    c.fill();
    const h = c.createRadialGradient(24, 18, 2, 24, 18, 22);
    h.addColorStop(0, 'rgba(176,186,222,0.4)');
    h.addColorStop(1, 'rgba(176,186,222,0)');
    c.fillStyle = h;
    c.fill();
    return cv;
  })();

  // 雷雨雲的柔邊雲塊（沒有描邊）：深色、中間色、被閃電照亮的亮邊
  const CL_D = radial(64, [[0, 'rgba(18,19,30,1)'], [0.6, 'rgba(22,24,37,0.92)'], [0.86, 'rgba(28,30,46,0.45)'], [1, 'rgba(30,32,48,0)']]);
  const CL_M = radial(64, [[0, 'rgba(70,76,104,0.95)'], [0.5, 'rgba(58,64,90,0.8)'], [0.85, 'rgba(46,51,74,0.3)'], [1, 'rgba(44,49,70,0)']]);
  const CL_L = radial(64, [[0, 'rgba(170,185,235,0.7)'], [0.5, 'rgba(130,145,205,0.3)'], [1, 'rgba(110,125,190,0)']]);

  const J = [];
  const JP = pool(260);
  function hitboxOf(m) {
    if (m && m.hitbox) return m.hitbox();
    return { x: (m ? m.x : 0) - 30, y: (m ? m.y : 0) - 80, w: 60, h: 80 };
  }
  // 雷雲壓在畫面最上方（神從天上劈下來），寬度蓋住預測要劈的所有目標；只有目標本身就在畫面頂端時才往下讓一點。
  // H 是雲的「厚度」尺寸（雲團大小、雲底高度都跟它走），W 是橫向寬度 —— 很寬的雲不會跟著變得很厚。
  function placeCloud(e, list) {
    let x0 = 1e9;
    let x1 = -1e9;
    let top = 1e9;
    for (const m of list) {
      const hb = hitboxOf(m);
      x0 = Math.min(x0, hb.x);
      x1 = Math.max(x1, hb.x + hb.w);
      top = Math.min(top, hb.y);
    }
    const W = clamp(x1 - x0 + 170, 320, 780);
    const H = clamp(200 + (x1 - x0) * 0.12, 320, 380);
    e.cW = W;
    e.H = H;
    e.cx = e.cxT = (x0 + x1) / 2;
    const cam = G.cam;
    e.cyB = Math.min(cam.y + 30 + H * 0.24, top - 36);
    e.puffs.length = 0;
    const n = Math.round(clamp(W / 30, 11, 24) * (lite() ? 0.6 : 1));
    for (let i = 0; i < n; i++) {
      const k = (i / (n - 1)) * 2 - 1;
      const bell = 1 - k * k;
      const r = H * (0.12 + bell * 0.08) * rr(0.9, 1.1) * (W > 460 ? 0.92 : 1);
      e.puffs.push({ ax: k * W * 0.43 + rr(-5, 5), ay: -r * 0.55 - bell * H * 0.12 - (i % 2 ? H * 0.05 : 0), r, ph: rr(0, TAU), sp: rr(1.1, 2.2) * (rnd() < 0.5 ? -1 : 1), orb: rr(2, 6), d: Math.abs(k) * 0.12 + rr(0, 0.05) });
    }
    e.puffs.sort((p, q) => p.ay - q.ay);
    e.pp = new Float32Array(n * 3);
    // 雷雨雲的「天花板」：蓋住整個畫面上緣，雲底高低起伏、有垂下的乳房雲和被風扯碎的雲絮
    const L = lite();
    const span = G.W * 1.5;
    e.baseX = cam.x + G.W / 2;
    e.span = span;
    e.ceil = [];
    const nc = L ? 14 : 24;
    for (let i = 0; i < nc; i++) {
      const k = i / (nc - 1);
      e.ceil.push({ x: (k - 0.5) * span + rr(-30, 30), y: rr(-H * 0.3, -H * 0.02), rx: rr(100, 190), ry: rr(70, 120), ph: rr(0, TAU) });
    }
    e.lobes = [];
    const nl = L ? 9 : 16;
    for (let i = 0; i < nl; i++) {
      const x = (rnd() - 0.5) * span * 0.95;
      const near = Math.max(0, 1 - Math.abs(x - (e.cx - e.baseX)) / (W * 0.8)); // 越靠近要劈的地方雲底垂得越低
      e.lobes.push({ x, y: rr(0, 22) + near * H * 0.12, rx: rr(60, 115) * (1 + near * 0.3), ry: rr(38, 66) * (1 + near * 0.4), ph: rr(0, TAU) });
    }
    e.wisps = [];
    const nw = L ? 4 : 9;
    for (let i = 0; i < nw; i++) {
      e.wisps.push({ x: (rnd() - 0.5) * span, y: rr(10, 46), len: rr(90, 210), th: rr(8, 16), v: rr(18, 40) * (rnd() < 0.5 ? -1 : 1) });
    }
  }
  function newJudge(P, list, hitAt) {
    const e = {
      t: 0, hitAt: hitAt || 0.45, hitT: -1, lastHit: -1, lastBig: false, lastX: 0, done: false, nS: 0, fz: false, m: null, pre: list,
      cloud: false, cx: 0, cxT: 0, cyB: 0, cW: 320, H: 320, puffs: [], pp: null, S: [],
      beatI: -1, lead: 0, flT: -1, flX: 0, flY: 0, flR: 0, flA: 0, flNext: 0.12,
      lb: new Float32Array(2 * 12), ln: 0, cb: new Float32Array(2 * 8), db: new Float32Array(2 * 7 * 10), dn: 0, drT: 0,
    };
    if (list.length) {
      e.m = list[0];
      e.cloud = true;
      placeCloud(e, list);
    }
    return e;
  }
  // 一道落雷（五連劈的其中一道）。big：最後、最粗的那一道
  function judgeStrike(e, m, big) {
    if (!e.cloud) {
      e.cloud = true;
      placeCloud(e, [m]);
    }
    const hb = hitboxOf(m);
    // 目標在雲外 → 雲往那邊挪（雷柱還是從雲底劈下）
    const edge = e.cW * 0.4;
    if (m.x < e.cxT - edge) e.cxT = m.x + e.cW * 0.3;
    else if (m.x > e.cxT + edge) e.cxT = m.x - e.cW * 0.3;
    if (e.hitT < 0) e.hitT = e.t;
    e.lastHit = e.t;
    e.lastBig = big;
    e.lastX = m.x;
    e.nS++;
    e.m = m;
    if (big) e.done = true;
    // 雲裡對應的位置亮一下
    e.flX = m.x;
    e.flY = e.cyB - e.H * 0.12;
    e.flR = e.H * (big ? 0.62 : 0.46);
    e.flT = e.t;
    e.flA = 1;
    const pw = big ? 1 : 0.72;
    const sz = clamp(hb.w / 70, 1, 2.6);
    const s = {
      t: 0, m, big, pw, hb, x: m.x, gy: hb.y + hb.h, top: e.cyB - e.H * 0.06, H: e.H, sz,
      Wc: clamp(40 + hb.w * 0.3, 46, 124) * (big ? 1.12 : 0.66), Rc: (30 + 22 * sz) * (big ? 1 : 0.7),
      ground: false, span0: 0, span1: 0, depth: 0, regen: 0, arcT: 0, arcDur: big ? 1.7 : 0.6,
      col: new Float32Array(3 * 52), cn: 0, br: new Float32Array(2 * 8 * 12), bc: new Int8Array(12), nb: 0,
      ab: new Float32Array(2 * 8 * 10), ac: new Int8Array(10), na: 0, cr: null, crN: 0, bowl: new Float32Array(2 * 9), rim: null,
    };
    e.S.push(s);
    const feet = s.gy;
    const map = G.world && G.world.map;
    if (map && G.physics) {
      const i = G.physics.platformBelow(map, m.x, feet - 4);
      if (i >= 0) {
        const p = map.platforms[i];
        if (p[2] - feet < 240) {
          s.ground = true;
          s.gy = p[2];
          s.span0 = p[0];
          s.span1 = p[1];
          s.depth = i === 0 ? 150 : 20;
        }
      }
    }
    const x = s.x;
    const gy = s.gy;
    const L = lite();
    if (s.ground) {
      // 坑：參差的淺碗
      const Rc = s.Rc;
      for (let i = 0; i <= 8; i++) {
        const k = i / 8;
        s.bowl[i * 2] = x - Rc + 2 * Rc * k + (i && i < 8 ? rr(-3, 3) : 0);
        s.bowl[i * 2 + 1] = gy + Math.sin(k * PI) * Rc * 0.22 * rr(0.75, 1.1);
      }
      // 放射狀裂縫：兩條貼著地表往外跑、其餘斜斜往下劈進地裡（小雷少一點）
      const nC = big ? (L ? 4 : 8) : L ? 2 : 4;
      s.crN = nC;
      s.cr = new Float32Array(nC * 2 * 7);
      for (let c = 0; c < nC; c++) {
        const sg = c % 2 ? 1 : -1;
        const flat = c < 2;
        const a0 = flat ? rr(0.02, 0.1) : rr(0.25, 1.15);
        const ang = sg > 0 ? a0 : PI - a0;
        const len = (flat ? rr(90, 150) : rr(40, 100)) * (0.7 + 0.3 * sz) * (big ? 1 : 0.6);
        let px = x + sg * rr(0.3, 0.8) * Rc;
        let py = gy + (flat ? 2 : rr(3, 8));
        for (let i = 0; i < 7; i++) {
          s.cr[(c * 7 + i) * 2] = px;
          s.cr[(c * 7 + i) * 2 + 1] = py;
          const d = ang + rr(-0.45, 0.45);
          px += Math.cos(d) * (len / 6);
          py = Math.max(gy + 1.5, py + Math.sin(d) * (len / 6));
        }
      }
      // 坑邊翻起來的碎石（描邊的小石塊，貼在地表上）
      s.rim = [];
      for (let i = 0; i < (big ? (L ? 3 : 6) : L ? 1 : 3); i++) {
        const sg = i % 2 ? 1 : -1;
        s.rim.push({ x: x + sg * Rc * rr(0.75, 1.25), r: rr(3, 6) * (0.8 + 0.2 * sz) * (big ? 1 : 0.8), rot: rr(0, TAU), c: ['#6a5a52', '#57504e', '#7a6a5a'][i % 3] });
      }
    }
    // 碎石、火花、煙（小雷大約一半）
    const nR = Math.round((L ? 5 : 11) * (big ? 1 : 0.5));
    for (let i = 0; i < nR; i++) {
      const q = spawn(JP, 2, x + rr(-0.5, 0.5) * s.Rc, gy - 4, rr(-260, 260) * pw, rr(-520, -220) * pw, rr(0.8, 1.2), rr(3, 6.5) * (0.8 + 0.2 * sz) * (big ? 1 : 0.8));
      if (!q) break;
      q.g = 1500;
      q.floor = s.ground ? gy - 1 : 1e9;
      q.c = i % 3;
    }
    const nSp = Math.round((L ? 12 : 28) * (big ? 1 : 0.55));
    for (let i = 0; i < nSp; i++) {
      const a = -PI / 2 + rr(-1.35, 1.35);
      const sp = rr(260, 720) * (big ? 1 : 0.8);
      const q = spawn(JP, 1, x + rr(-8, 8), gy - 6, Math.cos(a) * sp, Math.sin(a) * sp, rr(0.25, 0.55), rr(1.2, 2.4));
      if (!q) break;
      q.g = 900;
      q.drag = 1.5;
    }
    for (let i = 0; i < (big ? (L ? 3 : 7) : L ? 1 : 3); i++) {
      const q = spawn(JP, 3, x + rr(-1, 1) * s.Rc, gy - rr(4, 20), rr(-40, 40), rr(-60, -20), rr(0.9, 1.5), rr(18, 30) * (0.8 + 0.2 * sz) * (big ? 1 : 0.75));
      if (!q) break;
      q.drag = 1.2;
      q.b = -rr(0.08, 0.25); // 延遲出現
    }
    regenColumn(s);
  }
  function regenColumn(s) {
    const top = s.top;
    const gy = s.gy;
    const N = clamp(Math.round((gy - top) / 24), 8, 50);
    s.cn = N;
    for (let i = 0; i <= N; i++) {
      s.col[i * 3] = s.x + (i === N ? 0 : rr(-1, 1) * s.Wc * 0.14);
      s.col[i * 3 + 1] = rr(0.7, 1.08);
      s.col[i * 3 + 2] = rr(0.7, 1.08);
    }
    // 分叉：從柱身往外、往下劈出去
    const nb = lite() ? (s.big ? 3 : 2) : s.big ? 7 : 4;
    let w = 0;
    let k = 0;
    while (k < nb && w < 12) {
      const i = Math.floor(rr(1, N - 1));
      const sg = rnd() < 0.5 ? -1 : 1;
      const y0 = top + ((gy - top) * i) / N;
      const x0 = s.col[i * 3] + (sg * s.Wc) / 2;
      const a = rr(0.15, 0.95);
      const len = rr(40, 130) * (0.8 + 0.2 * s.sz) * (s.big ? 1 : 0.75);
      const x1 = x0 + sg * Math.cos(a) * len;
      const y1 = Math.min(gy - 2, y0 + Math.sin(a) * len);
      s.bc[w] = jag(s.br, w * 16, x0, y0, x1, y1, 7, len * 0.14);
      w++;
      // 偶爾再分一次
      if (w < 12 && rnd() < 0.4) {
        const j = 3 * 2 + 16 * (w - 1);
        const bx = s.br[j];
        const by = s.br[j + 1];
        const a2 = a + rr(0.3, 0.7);
        const l2 = len * rr(0.35, 0.55);
        s.bc[w] = jag(s.br, w * 16, bx, by, bx + sg * Math.cos(a2) * l2, Math.min(gy - 2, by + Math.sin(a2) * l2), 4, l2 * 0.18);
        w++;
      }
      k++;
    }
    s.nb = w;
  }
  function regenGroundArcs(s) {
    const n = s.big ? (lite() ? 2 : 5) : lite() ? 1 : 2;
    s.na = n;
    for (let i = 0; i < n; i++) {
      if (i === 0 && s.m && !s.m.dead && s.t < 0.9) {
        // 一道從坑裡往上爬到目標身上的殘電（麻痺中）
        const hb = hitboxOf(s.m);
        s.ac[i] = jag(s.ab, i * 20, s.x + rr(-10, 10), s.gy - 2, hb.x + rr(0.2, 0.8) * hb.w, hb.y + rr(0.3, 0.8) * hb.h, 6, 10);
        continue;
      }
      const x0 = s.x + rr(-1.4, 1.4) * s.Rc;
      const x1 = x0 + rr(-45, 45) * s.sz;
      s.ac[i] = jag(s.ab, i * 20, x0, s.gy - 1, x1, s.gy - rr(0, 5), 6, 5);
    }
  }

  function judgeStep(dt) {
    stepPool(JP, dt);
    for (let i = J.length - 1; i >= 0; i--) {
      const e = J[i];
      e.t += dt;
      const t = e.t;
      // 保險：五連劈的計時器被清掉（換地圖等）時也要收尾
      if (!e.done && e.hitT >= 0 && t - e.lastHit > 0.6) e.done = true;
      if (e.hitT < 0 && t > e.hitAt + 0.25) e.fz = true;
      if ((e.done && t - e.lastHit > 2.4) || (e.fz && e.hitT < 0 && t > e.hitAt + 1.1)) {
        J.splice(i, 1);
        continue;
      }
      // 劈之前：雲跟著預測的目標群移動；劈了之後：往需要的位置挪
      if (e.cloud) {
        if (e.hitT < 0 && e.pre.length) {
          let x0 = 1e9;
          let x1 = -1e9;
          for (const m of e.pre) {
            if (m.dead) continue;
            x0 = Math.min(x0, m.x);
            x1 = Math.max(x1, m.x);
          }
          if (x1 >= x0) e.cxT = (x0 + x1) / 2;
        }
        e.cx += (e.cxT - e.cx) * Math.min(1, dt * 9);
      }
      const hkL = e.hitT >= 0 ? t - e.lastHit : -1;
      // 雲裡的閃電：越接近劈下越頻繁；連劈期間一直閃
      if (e.cloud && e.pp && t > e.flNext && (!e.done || hkL < 0.5)) {
        const j = Math.floor(rnd() * e.puffs.length);
        const p = e.puffs[j];
        e.flX = e.cx + p.ax;
        e.flY = e.cyB + p.ay;
        e.flR = p.r * rr(1.4, 2.2);
        e.flT = t;
        e.flA = rr(0.5, 1);
        e.flNext = t + (e.hitT < 0 ? rr(0.05, 0.16) * (1.2 - Math.min(1, t / e.hitAt)) + 0.03 : rr(0.06, 0.14));
      }
      for (const s of e.S) {
        s.t += dt;
        const hk = s.t;
        s.regen -= dt;
        if (hk < 0.62 && s.regen <= 0) {
          s.regen = 0.034;
          regenColumn(s);
        }
        s.arcT -= dt;
        if (hk > 0.12 && hk < s.arcDur && s.arcT <= 0) {
          s.arcT = 0.07;
          regenGroundArcs(s);
        }
      }
      if (e.hitT < 0 && e.cloud && t > e.hitAt - 0.16) {
        // 第一道之前，先導雷從雲底一節節探向預測的目標
        e.lead -= dt;
        if (e.lead <= 0) {
          e.lead = 0.03;
          const k = clamp((t - (e.hitAt - 0.16)) / 0.16, 0, 1);
          const hb = e.m && !e.m.dead ? hitboxOf(e.m) : null;
          const lx = e.m ? e.m.x : e.cx;
          const y1 = e.cyB + ((hb ? hb.y + hb.h * 0.5 : e.cyB + 200) - e.cyB) * k * 0.85;
          e.ln = jag(e.lb, 0, lx + rr(-6, 6), e.cyB - 4, lx + rr(-18, 18), y1, 10, 12);
        }
      }
      // 鼓：一面接一面地敲（連劈期間也一直敲），敲的那面迸火花
      const P = G.player;
      if (!e.done && !e.fz && t > 0.1 && P) {
        const n = lite() ? 6 : 8;
        const b = Math.floor((t - 0.1) / 0.048);
        if (b !== e.beatI) {
          e.beatI = b;
          const d = drumPos(e, P, b % n, n);
          for (let k = 0; k < (lite() ? 1 : 3); k++) {
            const a = Math.atan2(d.y - d.cy, d.x - d.cx) + rr(-0.6, 0.6);
            const sp = rr(120, 240);
            const q = spawn(JP, 4, d.x, d.y, Math.cos(a) * sp, Math.sin(a) * sp, rr(0.14, 0.26), rr(1, 1.8));
            if (q) q.drag = 3;
          }
        }
      }
      // 每劈一道，每面鼓都往天上射一道電（最後一道射得久一點）
      if (hkL >= 0 && hkL < (e.lastBig ? 0.2 : 0.11)) {
        e.drT -= dt;
        if (e.drT <= 0 && P) {
          e.drT = 0.035;
          const n = lite() ? 6 : 8;
          e.dn = Math.min(10, n);
          for (let i = 0; i < e.dn; i++) {
            const d = drumPos(e, P, i, n);
            jag(e.db, i * 14, d.x, d.y, d.x + (d.x - d.cx) * 0.6 + rr(-14, 14), d.y - rr(50, 95) * (e.lastBig ? 1 : 0.7), 6, 7);
          }
        }
      }
    }
  }
  const DP_ = { x: 0, y: 0, cx: 0, cy: 0 };
  function drumPos(e, P, i, n) {
    const a = eBack(clamp(e.t / 0.2, 0, 1));
    const cx = P.x - P.dir * 4;
    const cy = P.y - 64;
    const ang = -PI / 2 + (i / n) * TAU + e.t * 0.45 * (P.dir || 1);
    DP_.cx = cx;
    DP_.cy = cy;
    DP_.x = cx + Math.cos(ang) * 68 * a;
    DP_.y = cy + Math.sin(ang) * 56 * a;
    return DP_;
  }
  function drumsOut(e) {
    if (e.done) return clamp(1 - (e.t - e.lastHit - 0.3) / 0.32, 0, 1);
    if (e.fz && e.hitT < 0) return clamp(1 - (e.t - e.hitAt - 0.25) / 0.3, 0, 1);
    return 1;
  }

  function judgeBack(ctx) {
    const P = G.player;
    if (!P) return;
    for (const e of J) {
      const out = drumsOut(e);
      if (out <= 0) continue;
      const t = e.t;
      const a = eBack(clamp(t / 0.2, 0, 1));
      const n = lite() ? 6 : 8;
      const cx = P.x - P.dir * 4;
      const cy = P.y - 64;
      const hk = e.hitT >= 0 ? t - e.lastHit : -1;
      const sp = hk >= 0 ? Math.max(0, 1 - hk / (e.lastBig ? 0.28 : 0.16)) * (e.lastBig ? 1 : 0.7) : 0;
      ctx.globalCompositeOperation = 'lighter';
      const gr = 120 * a * (1 + 0.3 * sp);
      ctx.globalAlpha = out * (0.35 + 0.4 * sp);
      ctx.drawImage(GLOW_G, cx - gr, cy - gr, gr * 2, gr * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = out;
      // 金環
      const R = 68 * a;
      const Ry = 56 * a;
      if (R > 2) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, R, Ry, 0, 0, TAU);
        ctx.strokeStyle = OUTC;
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.strokeStyle = sp > 0 ? '#fff1b0' : '#f0c050';
        ctx.lineWidth = 3.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, cy, R, Ry, 0, PI * 1.08, PI * 1.45);
        ctx.strokeStyle = '#fff6cc';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      // 鼓與鼓之間的電鏈（敲鼓時才有）
      const beating = !e.done && !e.fz && t > 0.1;
      const bi = beating ? e.beatI % n : -1;
      const bk = beating ? 1 - (((t - 0.1) / 0.048) % 1) : 0;
      for (let i = 0; i < n; i++) {
        const si = eBack(clamp((t - 0.03 - i * 0.018) / 0.14, 0, 1));
        if (si <= 0) continue;
        const d = drumPos(e, P, i, n);
        const p = i === bi ? bk : 0;
        const sc = si * (1 + 0.2 * p + 0.25 * sp) * (0.6 + 0.4 * out);
        const w = DRUM.w * sc;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = out;
        ctx.drawImage(DRUM.c, d.x - DRUM.ox * sc, d.y - DRUM.oy * sc, w, w);
        const ga = 0.75 * p + 0.9 * sp;
        if (ga > 0.02) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, ga) * out;
          const r = 22 * sc;
          ctx.drawImage(GLOW_B, d.x - r, d.y - r, r * 2, r * 2);
        }
      }
      // 敲響的那面鼓：一小道電往下一面鼓跳
      if (bi >= 0 && bk > 0.4) {
        const d0 = drumPos(e, P, bi, n);
        const x0 = d0.x;
        const y0 = d0.y;
        const d1 = drumPos(e, P, (bi + 1) % n, n);
        ctx.globalCompositeOperation = 'lighter';
        jag(e.cb, 0, x0, y0, d1.x, d1.y, 5, 6);
        arc(ctx, e.cb, 0, 6, 1.4, bk * out);
      }
      const dd = e.lastBig ? 0.2 : 0.11;
      if (e.dn && hk >= 0 && hk < dd) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < e.dn; i++) arc(ctx, e.db, i * 14, 7, 1.6, (1 - hk / dd) * out);
      }
    }
  }

  function drawCloud(ctx, e, t) {
    const hk = e.done ? t - e.lastHit : -1;
    let ca = 1;
    if (hk >= 0) ca = clamp(1 - (hk - 0.5) / 0.6, 0, 1);
    else if (e.fz && e.hitT < 0) ca = clamp(1 - (t - e.hitAt - 0.25) / 0.5, 0, 1);
    if (ca <= 0) return;
    const cx = e.cx;
    const cyB = e.cyB;
    const n = e.puffs.length;
    const pp = e.pp;
    const dis = hk > 0.5 ? 1 + (hk - 0.5) * 0.5 : 1;
    for (let i = 0; i < n; i++) {
      const p = e.puffs[i];
      const s = eBack(clamp((t - p.d) / 0.3, 0, 1));
      pp[i * 3] = cx + p.ax * dis + Math.cos(t * p.sp + p.ph) * p.orb;
      pp[i * 3 + 1] = cyB + p.ay + Math.sin(t * p.sp + p.ph) * p.orb * 0.6;
      pp[i * 3 + 2] = s <= 0 ? 0 : p.r * s * (1 + 0.05 * Math.sin(t * 3.1 + p.ph)) * (hk > 0.5 ? 1 - (hk - 0.5) * 0.4 : 1);
    }
    // 雷雨雲：由上往下長出來（form），散掉時往上收、變淡
    const H = e.H;
    const grow = eOut(clamp(t / 0.35, 0, 1)) * (hk > 0.5 ? 1 - (hk - 0.5) * 0.5 : 1);
    const bx = e.baseX;
    const span = e.span;
    const topY = G.cam.y - 40;
    const drop = (cyB - topY) * grow; // 雲底目前往下長到哪裡
    const yb = topY + drop;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = ca;
    // 1) 天花板的底色：上深下淺的帶子（邊緣柔化）
    const band = ctx.createLinearGradient(0, topY, 0, yb);
    band.addColorStop(0, 'rgba(14,15,24,0.96)');
    band.addColorStop(0.7, 'rgba(26,28,42,0.9)');
    band.addColorStop(1, 'rgba(34,37,54,0)');
    ctx.fillStyle = band;
    ctx.fillRect(bx - span / 2, topY, span, drop + 4);
    // 2) 起伏的雲底：一團團扁平的深色雲塊，慢慢翻滾
    for (const c of e.ceil) {
      const rx = c.rx * (1 + 0.06 * Math.sin(t * 1.3 + c.ph));
      const ry = c.ry * grow;
      const y = yb + c.y * grow;
      ctx.drawImage(CL_D, bx + c.x + Math.sin(t * 0.8 + c.ph) * 6 - rx, y - ry, rx * 2, ry * 2);
    }
    // 3) 垂下來的乳房雲：中間色、下緣被底下的電光照出一點亮邊
    for (const l of e.lobes) {
      const rx = l.rx;
      const ry = l.ry * grow;
      const x = bx + l.x + Math.sin(t * 1.1 + l.ph) * 4;
      const y = yb + l.y * grow;
      ctx.drawImage(CL_M, x - rx, y - ry, rx * 2, ry * 2);
      ctx.drawImage(CL_D, x - rx * 0.85, y - ry * 1.25, rx * 1.7, ry * 1.6);
    }
    // 雲塊的下緣被底下的電光照出冷色亮邊
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = ca * 0.35;
    for (const l of e.lobes) {
      const x = bx + l.x + Math.sin(t * 1.1 + l.ph) * 4;
      const y = yb + l.y * grow + l.ry * grow * 0.55;
      ctx.drawImage(CL_L, x - l.rx * 0.7, y - l.ry * 0.28 * grow, l.rx * 1.4, l.ry * 0.56 * grow);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = ca;
    // 4) 被風扯碎的雲絮：細長、往兩邊飄
    ctx.globalAlpha = ca * 0.7;
    for (const w of e.wisps) {
      const x = bx + w.x + ((w.v * t) % 60);
      const y = yb + w.y * grow;
      ctx.drawImage(CL_M, x - w.len / 2, y - w.th / 2, w.len, w.th);
    }
    ctx.globalAlpha = ca;
    // 5) 要劈的地方：雲底往下凹成一個旋轉的漏斗，邊緣被電光照亮
    ctx.save();
    ctx.translate(cx, yb + H * 0.02);
    ctx.scale(1, 0.32);
    ctx.rotate(t * 1.4);
    for (let k = 0; k < 3; k++) {
      const R = (H * 0.2 + k * H * 0.12) * grow;
      ctx.drawImage(k ? CL_M : CL_D, -R, -R, R * 2, R * 2);
    }
    ctx.restore();
    // 雲底的漩渦
    const form = clamp(t / 0.3, 0, 1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(150,162,205,0.32)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 2; k++) {
      const a0 = t * 3.2 + k * PI;
      ctx.beginPath();
      ctx.ellipse(cx, cyB - H * 0.05, (H * (0.14 + 0.1 * k) + (e.cW - H) * 0.25) * form, H * (0.03 + 0.02 * k) * form, 0, a0, a0 + 2.1);
      ctx.stroke();
    }
    // 雲裡的閃光
    ctx.globalCompositeOperation = 'lighter';
    const fk = 1 - (t - e.flT) / 0.09;
    if (fk > 0 && e.flT >= 0) {
      ctx.globalAlpha = ca * fk * e.flA * 0.8;
      ctx.drawImage(GLOW_B, e.flX - e.flR, e.flY - e.flR, e.flR * 2, e.flR * 2);
    }
    // 蓄電：雲底越來越亮；每劈一道，那一段雲底被照亮
    if (e.hitT < 0) {
      const charge = clamp(t / e.hitAt, 0, 1) * 0.45;
      if (charge > 0.02) {
        ctx.globalAlpha = ca * charge;
        const w = Math.min(e.cW, H * 1.3);
        ctx.drawImage(GLOW_B, cx - w * 0.45, cyB - H * 0.22, w * 0.9, H * 0.4);
      }
    } else {
      const k = t - e.lastHit;
      const charge = Math.max(0, 1 - k / (e.lastBig ? 0.4 : 0.22)) * (e.lastBig ? 1 : 0.75);
      if (charge > 0.02) {
        ctx.globalAlpha = ca * charge;
        ctx.drawImage(GLOW_B, e.lastX - H * 0.45, cyB - H * 0.22, H * 0.9, H * 0.4);
      }
    }
  }

  function drawColumn(ctx, s, hk) {
    const top = s.top;
    const gy = s.gy;
    const drop = hk < 0.045 ? eOut(hk / 0.045) : 1;
    const yEnd = top + (gy - top) * drop;
    // 小雷收得比較快
    const hold = s.big ? 0.3 : 0.16;
    const fade = s.big ? 0.32 : 0.22;
    const wk = hk < 0.045 ? 0.8 : hk < hold ? 1 + 0.12 * Math.sin(hk * 90) : Math.max(0, 1 - (hk - hold) / fade);
    if (wk <= 0.01) return;
    const W = s.Wc * wk;
    ctx.globalCompositeOperation = 'lighter';
    // 外光
    ctx.globalAlpha = 0.75 * Math.min(1, wk);
    ctx.drawImage(COLG, s.x - W * 2.4, top, W * 4.8, yEnd - top);
    // 柱身：三層（藍、淡藍、白芯），兩側是參差的鋸齒
    const N = s.cn;
    const layer = (f, style, al) => {
      ctx.globalAlpha = al;
      ctx.fillStyle = style;
      ctx.beginPath();
      let last = 0;
      for (let i = 0; i <= N; i++) {
        const y = top + ((gy - top) * i) / N;
        if (y > yEnd + 0.5) break;
        const hw = (W / 2) * f * (i === 0 ? 1.35 : 1); // 柱頂略寬，接進雲裡
        const x = s.col[i * 3] - hw * s.col[i * 3 + 1];
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        last = i;
      }
      const yl = Math.min(yEnd, top + ((gy - top) * last) / N);
      ctx.lineTo(s.col[last * 3] + (W / 2) * f * s.col[last * 3 + 2], yl);
      for (let i = last; i >= 0; i--) {
        const y = top + ((gy - top) * i) / N;
        const hw = (W / 2) * f * (i === 0 ? 1.35 : 1);
        ctx.lineTo(s.col[i * 3] + hw * s.col[i * 3 + 2], y);
      }
      ctx.closePath();
      ctx.fill();
    };
    layer(1, '#5c9cff', 0.7);
    layer(0.62, '#bfe0ff', 0.9);
    layer(0.26, '#ffffff', 1);
    // 分叉、沿柱身爬的電
    if (hk < hold + 0.1) {
      const ba = hk < hold ? 1 : 1 - (hk - hold) / 0.1;
      for (let i = 0; i < s.nb; i++) {
        if (s.br[i * 16 + 1] > yEnd) continue;
        arc(ctx, s.br, i * 16, s.bc[i], i % 2 ? 1.6 : 2.4, ba);
      }
    }
    // 落下的雷頭
    if (hk < 0.08) {
      const r = s.Wc * 1.6;
      ctx.globalAlpha = 1;
      ctx.drawImage(GLOW_B, s.x - r, yEnd - r, r * 2, r * 2);
    }
  }

  function drawCrater(ctx, s, hk) {
    const a = hk < 1.5 ? 1 : clamp(1 - (hk - 1.5) / 0.85, 0, 1);
    if (a <= 0) return;
    const x = s.x;
    const gy = s.gy;
    const Rc = s.Rc;
    const glowK = clamp(1 - hk / 0.9, 0, 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(s.span0, gy - 3, s.span1 - s.span0, s.depth + 3);
    ctx.clip();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a * clamp(hk / 0.05, 0, 1) * (s.big ? 1 : 0.75);
    ctx.drawImage(SCORCH, x - Rc * 1.9, gy - Rc * 0.3, Rc * 3.8, Rc * 0.95);
    ctx.globalAlpha = a * clamp(hk / 0.05, 0, 1);
    // 坑
    ctx.beginPath();
    ctx.moveTo(s.bowl[0], gy - 1);
    for (let i = 0; i <= 8; i++) ctx.lineTo(s.bowl[i * 2], s.bowl[i * 2 + 1]);
    ctx.closePath();
    ctx.fillStyle = 'rgba(20,13,16,0.92)';
    ctx.fill();
    // 裂縫（深色）
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let c = 0; c < s.crN; c++) {
      for (let i = 0; i < 7; i++) {
        const j = (c * 7 + i) * 2;
        i ? ctx.lineTo(s.cr[j], s.cr[j + 1]) : ctx.moveTo(s.cr[j], s.cr[j + 1]);
      }
    }
    ctx.strokeStyle = 'rgba(18,12,14,0.88)';
    ctx.lineWidth = s.big ? 3 : 2.2;
    ctx.stroke();
    // 裂縫與坑裡殘留的雷光
    if (glowK > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = glowK * a * 0.45;
      ctx.strokeStyle = '#5c9cff';
      ctx.lineWidth = s.big ? 7 : 5;
      ctx.stroke();
      ctx.globalAlpha = glowK * a;
      ctx.strokeStyle = '#d8ecff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 1; i < 8; i++) {
        const j = i * 2;
        i > 1 ? ctx.lineTo(s.bowl[j], s.bowl[j + 1] - 1) : ctx.moveTo(s.bowl[j], s.bowl[j + 1] - 1);
      }
      ctx.strokeStyle = '#eaf4ff';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    ctx.restore();
    // 坑邊翻起的碎石：貼在地表上、有描邊
    if (s.rim) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a * clamp(hk / 0.05, 0, 1);
      ctx.lineJoin = 'round';
      for (const r of s.rim) {
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const an = r.rot + (k / 5) * TAU;
          const rad = r.r * (k % 2 ? 0.75 : 1);
          const py = gy + 1 + Math.sin(an) * rad * 0.8 - r.r * 0.55;
          k ? ctx.lineTo(r.x + Math.cos(an) * rad, Math.min(gy + 1.5, py)) : ctx.moveTo(r.x + Math.cos(an) * rad, Math.min(gy + 1.5, py));
        }
        ctx.closePath();
        ctx.fillStyle = r.c;
        ctx.fill();
        ctx.strokeStyle = OUTC;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
  }

  function drawShock(ctx, s, hk) {
    const x = s.x;
    const gy = s.gy;
    const pw = s.pw;
    ctx.globalCompositeOperation = 'lighter';
    // 局部的光暈（不是全螢幕閃光）
    const gl = s.big ? 0.55 : 0.34;
    if (hk < gl) {
      const k = hk / gl;
      const r = (120 + 45 * s.sz) * pw * (hk < 0.08 ? 0.6 + hk * 5 : 1);
      ctx.globalAlpha = Math.pow(1 - k, 1.8) * 0.7;
      ctx.drawImage(GLOW_B, x - r, gy - 10 - r, r * 2, r * 2);
      ctx.globalAlpha = Math.pow(1 - k, 2) * 0.8 * pw;
      const r2 = s.H * 0.6 * pw;
      ctx.drawImage(GLOW_B, x - r2, s.top - r2 * 0.6, r2 * 2, r2 * 1.2);
    }
    // 地面上的衝擊波（大雷兩圈、小雷一圈）
    for (let w = 0; w < (s.big ? 2 : 1); w++) {
      const k = (hk - w * 0.08) / ((0.5 + w * 0.1) * (s.big ? 1 : 0.8));
      if (k <= 0 || k >= 1) continue;
      const rx = 26 + (260 + 90 * (s.sz - 1)) * pw * eOut(k) * (w ? 0.8 : 1);
      ctx.globalAlpha = (1 - k) * (w ? 0.6 : 1);
      ctx.strokeStyle = w ? '#8cc0ff' : '#e6f2ff';
      ctx.lineWidth = ((w ? 4 : 9) * (1 - k) + 1) * (s.big ? 1 : 0.7);
      ctx.beginPath();
      ctx.ellipse(x, gy - 2, rx, rx * 0.15, 0, 0, TAU);
      ctx.stroke();
    }
    // 半圓的爆風
    const kd = hk / (s.big ? 0.32 : 0.24);
    if (kd < 1) {
      const r = 20 + (150 + 50 * s.sz) * pw * eOut(kd);
      ctx.globalAlpha = (1 - kd) * 0.7;
      ctx.strokeStyle = '#cfe6ff';
      ctx.lineWidth = 5 * (1 - kd) * pw + 1;
      ctx.beginPath();
      ctx.arc(x, gy, r, PI, TAU);
      ctx.stroke();
    }
  }

  function drawJP(ctx) {
    if (!JP.n) return;
    // 碎石（描邊的小石塊）
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineJoin = 'round';
    const RC = ['#6a5a52', '#4e4648', '#7c6c5c'];
    for (const q of JP.a) {
      if (!q.on || q.k !== 2) continue;
      const k = q.t / q.life;
      ctx.globalAlpha = Math.min(1, (1 - k) * 4);
      const s = q.s;
      const c = Math.cos(q.rot);
      const sn = Math.sin(q.rot);
      ctx.beginPath();
      ctx.moveTo(q.x + c * s, q.y + sn * s);
      ctx.lineTo(q.x - sn * s * 0.8, q.y + c * s * 0.8);
      ctx.lineTo(q.x - c * s * 0.9, q.y - sn * s * 0.9);
      ctx.lineTo(q.x + sn * s * 0.7, q.y - c * s * 0.7);
      ctx.closePath();
      ctx.fillStyle = RC[q.c];
      ctx.fill();
      ctx.strokeStyle = OUTC;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // 煙
    for (const q of JP.a) {
      if (!q.on || q.k !== 3) continue;
      const tt = q.t + q.b;
      if (tt <= 0) continue;
      const k = tt / (q.life + q.b);
      const s = q.s * (0.5 + k);
      ctx.globalAlpha = (1 - k) * Math.min(1, tt / 0.15) * 0.9;
      ctx.drawImage(SMOKE, q.x - s, q.y - s, s * 2, s * 2);
    }
    // 火花（拖尾的亮線）
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#dcebff';
    for (const q of JP.a) {
      if (!q.on || (q.k !== 1 && q.k !== 4)) continue;
      const k = q.t / q.life;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = q.s;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03);
      ctx.stroke();
    }
  }

  function judgeFront(ctx) {
    for (const e of J) {
      const t = e.t;
      for (const s of e.S) if (s.ground) drawCrater(ctx, s, s.t);
      if (e.cloud) drawCloud(ctx, e, t);
      if (e.hitT < 0 && e.cloud && e.ln && t > e.hitAt - 0.16 && !e.fz) {
        ctx.globalCompositeOperation = 'lighter';
        arc(ctx, e.lb, 0, e.ln, 1.6, 0.9);
      }
      for (const s of e.S) {
        const hk = s.t;
        drawColumn(ctx, s, hk);
        drawShock(ctx, s, hk);
        if (hk > 0.12 && hk < s.arcDur && s.na) {
          ctx.globalCompositeOperation = 'lighter';
          const a = 1 - (hk - 0.12) / (s.arcDur - 0.12);
          for (let i = 0; i < s.na; i++) arc(ctx, s.ab, i * 20, s.ac[i], 1.3, a);
        }
      }
    }
    drawJP(ctx);
  }

  A.judgeFx = {
    // 開始施法。pre：預測會被劈的目標（陣列，可以是空的；也接受單一隻或 null），雷雲會蓋住它們
    begin(P, pre, hitAt) {
      const list = Array.isArray(pre) ? pre.filter(Boolean) : pre ? [pre] : [];
      const e = newJudge(P, list, hitAt);
      J.push(e);
      return e;
    },
    // 劈下一道（在 hitMonster 之前呼叫，這時目標一定還活著）；last：最後、最粗的那一道
    strike(e, m, last) {
      if (!e || !m) return;
      judgeStrike(e, m, last !== false);
    },
    // 連劈中途沒有目標了：直接收尾
    finish(e) {
      if (e && e.hitT >= 0) {
        e.done = true;
      } else if (e) e.fz = true;
    },
    fizzle(e) {
      if (e) e.fz = true;
    },
  };
  A.skillFx.add({
    live: () => J.length > 0 || JP.n > 0,
    step: judgeStep,
    back: judgeBack,
    front: judgeFront,
    clear() {
      J.length = 0;
      clearPool(JP);
    },
  });

  // ════════════════ 升龍爪 ════════════════
  // 上勾的爪子放出一條金橙色能量的東方龍，沿著上升路徑盤旋而上：龍頭（角、鬚、張開的嘴）領頭，
  // 身體是有鱗片與背鰭的長條光帶，尾巴漸細。身體在路徑前面的那一半畫在前景、後面那一半畫在怪物後面，
  // 被打上天的怪看起來就在龍的盤繞裡。到頂時一聲龍吼（爆風、火花），之後從尾巴開始散成金色的鱗片。
  const HS = 3;
  function makeHead(roar) {
    // 世界座標：朝右，(0,0) 是脖子接點；範圍 x -32..48, y -34..20
    const X0 = 32;
    const Y0 = 34;
    const cv = mk(80 * HS, 56 * HS);
    const c = cv.getContext('2d');
    c.scale(HS, HS);
    c.translate(X0, Y0);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    const OL = '#5a2410';
    const shp = (fn, fill, lw) => {
      c.beginPath();
      fn();
      c.fillStyle = fill;
      c.fill();
      c.strokeStyle = OL;
      c.lineWidth = lw || 2.2;
      c.stroke();
    };
    // 鬃（火焰狀，往後飄）
    shp(() => {
      c.moveTo(4, -10);
      c.quadraticCurveTo(-8, -20, -26, -16);
      c.quadraticCurveTo(-14, -12, -20, -6);
      c.quadraticCurveTo(-10, -6, -24, 4);
      c.quadraticCurveTo(-10, 2, -18, 12);
      c.quadraticCurveTo(-4, 8, 0, 10);
      c.closePath();
    }, '#ff8a2a');
    shp(() => {
      c.moveTo(2, -6);
      c.quadraticCurveTo(-8, -12, -18, -11);
      c.quadraticCurveTo(-9, -6, -15, 1);
      c.quadraticCurveTo(-5, 0, -10, 8);
      c.quadraticCurveTo(-2, 5, 2, 6);
      c.closePath();
    }, '#ffb347', 1.4);
    // 遠側的角（暗一點）
    shp(() => {
      c.moveTo(8, -12);
      c.quadraticCurveTo(0, -24, -14, -30);
      c.lineTo(-10, -26);
      c.quadraticCurveTo(-18, -26, -20, -22);
      c.quadraticCurveTo(-6, -22, 4, -10);
      c.closePath();
    }, '#e8c890', 1.8);
    // 下顎（張開）
    const jaw = roar ? 0.62 : 0.36;
    // 嘴裡
    c.beginPath();
    c.moveTo(12, 2);
    c.lineTo(38, -1);
    const jx = 12 + Math.cos(jaw) * 25;
    const jy = 2 + Math.sin(jaw) * 25;
    c.lineTo(jx, jy);
    c.closePath();
    c.fillStyle = '#8a1a14';
    c.fill();
    c.save();
    c.translate(12, 2);
    c.rotate(jaw);
    // 下排牙
    c.fillStyle = '#fffbe8';
    c.strokeStyle = OL;
    c.lineWidth = 1;
    [[8, 3], [15, 3], [21, 3]].forEach(([x, s]) => {
      c.beginPath();
      c.moveTo(x - s * 0.6, 0.5);
      c.lineTo(x, -s);
      c.lineTo(x + s * 0.6, 0.5);
      c.closePath();
      c.fill();
      c.stroke();
    });
    shp(() => {
      c.moveTo(-1, 0);
      c.lineTo(24, 0);
      c.quadraticCurveTo(29, 1, 27, 5);
      c.quadraticCurveTo(18, 9, 2, 8);
      c.closePath();
    }, '#f5a238', 2);
    c.fillStyle = '#e07a20';
    c.beginPath();
    c.moveTo(2, 6);
    c.quadraticCurveTo(16, 8, 26, 4.5);
    c.lineTo(26, 3.5);
    c.quadraticCurveTo(16, 6.5, 2, 5);
    c.fill();
    c.restore();
    // 舌頭
    c.fillStyle = '#e8483a';
    c.beginPath();
    c.moveTo(14, 4);
    c.quadraticCurveTo(24, 3 + jaw * 10, 30, 2 + jaw * 12);
    c.quadraticCurveTo(24, 6 + jaw * 10, 14, 7);
    c.fill();
    // 上顎與頭骨
    shp(() => {
      c.moveTo(-6, -9);
      c.quadraticCurveTo(0, -15, 9, -14);
      c.quadraticCurveTo(13, -16, 16, -12);
      c.quadraticCurveTo(24, -10, 32, -8);
      c.quadraticCurveTo(36, -12, 40, -8);
      c.quadraticCurveTo(44, -5, 41, -1);
      c.lineTo(38, 0);
      c.lineTo(14, 2);
      c.quadraticCurveTo(8, 8, 2, 9);
      c.quadraticCurveTo(-4, 10, -7, 7);
      c.closePath();
    }, '#ffc34a', 2.4);
    // 下半部的陰影、額頭的高光
    c.save();
    c.beginPath();
    c.moveTo(-6, -9);
    c.quadraticCurveTo(0, -15, 9, -14);
    c.quadraticCurveTo(13, -16, 16, -12);
    c.quadraticCurveTo(24, -10, 32, -8);
    c.quadraticCurveTo(36, -12, 40, -8);
    c.quadraticCurveTo(44, -5, 41, -1);
    c.lineTo(38, 0);
    c.lineTo(14, 2);
    c.quadraticCurveTo(8, 8, 2, 9);
    c.quadraticCurveTo(-4, 10, -7, 7);
    c.closePath();
    c.clip();
    c.fillStyle = '#f08a24';
    c.beginPath();
    c.moveTo(-10, 2);
    c.quadraticCurveTo(14, -2, 44, -3);
    c.lineTo(44, 14);
    c.lineTo(-10, 14);
    c.fill();
    c.fillStyle = 'rgba(255,248,210,0.85)';
    c.beginPath();
    c.ellipse(8, -11, 7, 2, -0.15, 0, TAU);
    c.fill();
    c.beginPath();
    c.ellipse(28, -8.5, 5, 1.2, -0.1, 0, TAU);
    c.fill();
    c.restore();
    // 上排牙（獠牙）
    c.fillStyle = '#fffbe8';
    c.strokeStyle = OL;
    c.lineWidth = 1;
    [[18, 3], [26, 2.6], [34, 4.2]].forEach(([x, s]) => {
      c.beginPath();
      c.moveTo(x - s * 0.55, 0.5 - (x - 14) * 0.08);
      c.lineTo(x, s + 1 - (x - 14) * 0.08);
      c.lineTo(x + s * 0.55, 0 - (x - 14) * 0.08);
      c.closePath();
      c.fill();
      c.stroke();
    });
    // 鼻孔、眉骨、眼睛
    c.fillStyle = OL;
    c.beginPath();
    c.ellipse(38, -6.5, 1.6, 1.1, -0.3, 0, TAU);
    c.fill();
    // 眼睛：沒有眼珠，整顆是發光的眼白；細長、往吻端斜壓的兇眼，上面壓著厚眉骨
    const eg = c.createRadialGradient(16.5, -6.2, 0, 16.5, -6.2, 9);
    eg.addColorStop(0, 'rgba(255,250,220,0.95)');
    eg.addColorStop(0.45, 'rgba(255,210,120,0.45)');
    eg.addColorStop(1, 'rgba(255,170,60,0)');
    c.fillStyle = eg;
    c.beginPath();
    c.arc(16.5, -6.2, 9, 0, TAU);
    c.fill();
    shp(() => {
      c.moveTo(10.5, -8.6);
      c.quadraticCurveTo(16, -9.4, 22.5, -5.2); // 上緣：往吻端壓下來
      c.quadraticCurveTo(16.5, -3.6, 11, -5.8); // 下緣
      c.closePath();
    }, '#fffef4', 1.4);
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.beginPath();
    c.ellipse(15.6, -6.6, 2.6, 0.9, 0.2, 0, TAU);
    c.fill();
    shp(() => {
      c.moveTo(8.5, -9.5);
      c.quadraticCurveTo(15, -14.5, 24, -7.2); // 眉骨往吻端下壓
      c.lineTo(22.6, -5.6);
      c.quadraticCurveTo(15.5, -10.6, 10, -7.6);
      c.closePath();
    }, '#c85e14', 1.4);
    // 頰上的鰭刺
    shp(() => {
      c.moveTo(4, 5);
      c.quadraticCurveTo(-2, 12, -10, 16);
      c.quadraticCurveTo(-3, 10, -2, 4);
      c.closePath();
    }, '#ffb347', 1.6);
    // 近側的角：鹿角狀，往後掃、帶一根分叉
    shp(() => {
      c.moveTo(4, -12);
      c.quadraticCurveTo(-4, -22, -20, -26);
      c.lineTo(-26, -32);
      c.quadraticCurveTo(-24, -24, -20, -22);
      c.quadraticCurveTo(-10, -20, -8, -18);
      c.lineTo(-12, -28);
      c.quadraticCurveTo(-4, -22, -2, -16);
      c.quadraticCurveTo(0, -12, 0, -9);
      c.closePath();
    }, '#fff0c8', 2);
    c.strokeStyle = 'rgba(210,160,90,0.8)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(1, -12);
    c.quadraticCurveTo(-8, -20, -20, -24);
    c.stroke();
    return { c: cv, x0: X0, y0: Y0, w: 80, h: 56 };
  }
  const HEAD = makeHead(false);
  const HEAD_R = makeHead(true);

  const DG = [];
  const DGP = pool(110);
  const DRAG_H = 270;
  const TURNS = 1.5;
  const PHI = Math.PI; // 讓龍頭到頂時正好轉到前面（cos(1.5·2π + π) = 1）
  const RH = 56;
  function newDragon(P) {
    const N = lite() ? 12 : 22;
    return {
      t: 0, dir: P.dir || 1, ax: P.x + (P.dir || 1) * 38, y0: P.y, N, du: 1.1 / N,
      px: new Float32Array(N + 1), py: new Float32Array(N + 1), pz: new Float32Array(N + 1), pw: new Float32Array(N + 1),
      L: new Float32Array(2 * (N + 2)), R: new Float32Array(2 * (N + 2)), roared: false, cut: N, hx: 0, hy: 0, ha: 0, hz: 1,
    };
  }
  function dragonStep(dt) {
    stepPool(DGP, dt);
    const P = G.player;
    for (let k = DG.length - 1; k >= 0; k--) {
      const e = DG[k];
      e.t += dt;
      const t = e.t;
      if (t > 1.25) {
        DG.splice(k, 1);
        continue;
      }
      const uh = t < 0.4 ? eOut(t / 0.4) : 1 + (t - 0.4) * 0.22;
      const cx = P ? P.x + e.dir * 30 : e.ax;
      const cy = P ? P.y - 46 : e.y0 - 46;
      for (let i = 0; i <= e.N; i++) {
        const u = uh - i * e.du;
        let x;
        let y;
        let z;
        if (u <= 0) {
          x = cx;
          y = cy;
          z = 1;
        } else {
          const ang = u * TURNS * TAU + PHI;
          const rad = RH * (0.35 + 0.65 * Math.min(1, u * 5));
          x = e.ax + e.dir * Math.sin(ang) * rad;
          y = e.y0 - 40 - DRAG_H * u;
          z = Math.cos(ang);
          // 從爪子接出來：最底下那一小段往爪子靠
          if (u < 0.12) {
            const k2 = u / 0.12;
            x = cx + (x - cx) * k2;
            y = cy + (y - cy) * k2;
          }
        }
        e.px[i] = x;
        e.py[i] = y;
        e.pz[i] = z;
        const f = i / e.N;
        e.pw[i] = (15 * (1 - Math.pow(f, 1.25)) + 2) * (0.72 + 0.28 * z);
      }
      // 散掉：從尾巴開始
      const cut = t < 0.58 ? e.N : Math.max(-1, Math.floor(e.N * (1 - (t - 0.58) / 0.42)));
      if (cut < e.cut) {
        for (let i = Math.max(0, cut); i < e.cut; i++) {
          for (let j = 0; j < (lite() ? 1 : 2); j++) {
            const q = spawn(DGP, 5, e.px[i] + rr(-5, 5), e.py[i] + rr(-5, 5), rr(-70, 70), rr(-110, -20), rr(0.45, 0.8), rr(2.5, 4.5));
            if (q) q.drag = 1.8;
          }
        }
        e.cut = cut;
      }
      // 龍頭的方向
      const tx = e.px[0] - e.px[1];
      const ty = e.py[0] - e.py[1];
      e.hx = e.px[0];
      e.hy = e.py[0];
      e.hz = e.pz[0];
      e.ha = clamp(Math.atan2(ty, tx * e.dir), -2.2, 0.5);
      if (!e.roared && t >= 0.4) {
        e.roared = true;
        const mx = e.hx + e.dir * Math.cos(e.ha) * 34;
        const my = e.hy + Math.sin(e.ha) * 34;
        e.mx = mx;
        e.my = my;
        const n = lite() ? 8 : 18;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + rr(-0.2, 0.2);
          const sp = rr(240, 520);
          const q = spawn(DGP, 1, mx, my, Math.cos(a) * sp, Math.sin(a) * sp - 60, rr(0.3, 0.55), rr(1.6, 2.8));
          if (q) {
            q.g = 500;
            q.drag = 2;
          }
        }
        for (let i = 0; i < (lite() ? 4 : 10); i++) {
          const j = Math.floor(rr(1, e.N));
          const q = spawn(DGP, 5, e.px[j], e.py[j], rr(-90, 90), rr(-140, -40), rr(0.5, 0.9), rr(2.5, 4.5));
          if (q) q.drag = 1.6;
        }
      }
    }
  }
  // 一段身體（i0..i1）畫成一條有寬度的光帶
  function ribbon(ctx, e, i0, i1, alpha, back) {
    if (i1 - i0 < 1) return;
    const L = e.L;
    const R = e.R;
    let n = 0;
    let wmax = 0;
    for (let i = i0; i <= i1; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(e.N, i + 1);
      let tx = e.px[a] - e.px[b];
      let ty = e.py[a] - e.py[b];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      let w = e.pw[i];
      if (i >= e.cut - 3) w *= clamp((e.cut - i) / 3, 0, 1);
      wmax = Math.max(wmax, w);
      L[n * 2] = e.px[i] - ty * w;
      L[n * 2 + 1] = e.py[i] + tx * w;
      R[n * 2] = e.px[i] + ty * w;
      R[n * 2 + 1] = e.py[i] - tx * w;
      n++;
    }
    const poly = (k) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const mx = (L[i * 2] + R[i * 2]) / 2;
        const my = (L[i * 2 + 1] + R[i * 2 + 1]) / 2;
        const x = mx + (L[i * 2] - mx) * k;
        const y = my + (L[i * 2 + 1] - my) * k;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      for (let i = n - 1; i >= 0; i--) {
        const mx = (L[i * 2] + R[i * 2]) / 2;
        const my = (L[i * 2 + 1] + R[i * 2 + 1]) / 2;
        ctx.lineTo(mx + (R[i * 2] - mx) * k, my + (R[i * 2 + 1] - my) * k);
      }
      ctx.closePath();
    };
    // 外光
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (back ? 0.18 : 0.28);
    ctx.strokeStyle = '#ff8c24';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = wmax * 3.6;
    ctx.beginPath();
    for (let i = i0; i <= i1; i++) (i === i0 ? ctx.moveTo : ctx.lineTo).call(ctx, e.px[i], e.py[i]);
    ctx.stroke();
    // 身體
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * (back ? 0.62 : 0.94);
    poly(1);
    ctx.fillStyle = back ? '#c8661e' : '#ffae3c';
    ctx.fill();
    ctx.strokeStyle = back ? 'rgba(120,44,10,0.55)' : 'rgba(128,46,10,0.85)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // 亮芯
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (back ? 0.18 : 0.7);
    poly(0.45);
    ctx.fillStyle = '#ffe9a0';
    ctx.fill();
    // 鱗片：一排往尾巴張開的 V
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * (back ? 0.45 : 0.75);
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = '#c4541a';
    ctx.beginPath();
    for (let j = 1; j < n - 1; j++) {
      const i = i0 + j;
      if (i >= e.cut - 1) break;
      const mx = (L[j * 2] + R[j * 2]) / 2;
      const my = (L[j * 2 + 1] + R[j * 2 + 1]) / 2;
      const fx = (L[(j - 1) * 2] + R[(j - 1) * 2]) / 2 - mx;
      const fy = (L[(j - 1) * 2 + 1] + R[(j - 1) * 2 + 1]) / 2 - my;
      const lx = (L[j * 2] - mx) * 0.6;
      const ly = (L[j * 2 + 1] - my) * 0.6;
      ctx.moveTo(mx + lx - fx * 0.3, my + ly - fy * 0.3);
      ctx.lineTo(mx + fx * 0.25, my + fy * 0.25);
      ctx.lineTo(mx - lx - fx * 0.3, my - ly - fy * 0.3);
    }
    ctx.stroke();
    // 背鰭：每兩節一片，長在外側（L 那一邊）
    ctx.fillStyle = back ? '#f0b050' : '#ffd566';
    ctx.strokeStyle = back ? 'rgba(120,44,10,0.55)' : 'rgba(128,46,10,0.85)';
    ctx.lineWidth = 1.2;
    for (let j = 1; j < n - 2; j += 2) {
      const i = i0 + j;
      if (i >= e.cut - 2 || i < 2) continue;
      const bx = L[j * 2];
      const by = L[j * 2 + 1];
      const ox = L[j * 2] - (L[j * 2] + R[j * 2]) / 2;
      const oy = L[j * 2 + 1] - (L[j * 2 + 1] + R[j * 2 + 1]) / 2;
      const nx = L[(j + 1) * 2];
      const ny = L[(j + 1) * 2 + 1];
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(nx + ox * 0.9, ny + oy * 0.9);
      ctx.lineTo(nx, ny);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  function drawHead(ctx, e, back) {
    const t = e.t;
    const fade = t < 0.9 ? 1 : clamp(1 - (t - 0.9) / 0.3, 0, 1);
    if (fade <= 0) return;
    const roar = e.roared ? clamp(1 - (t - 0.4) / 0.3, 0, 1) : 0;
    const sc = (1.3 + 0.3 * eOut(roar)) * (0.92 + 0.08 * e.hz);
    ctx.save();
    ctx.translate(e.hx, e.hy);
    ctx.scale(e.dir * sc, sc);
    ctx.rotate(e.ha);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.55;
    ctx.drawImage(GLOW_O, -34, -40, 88, 80);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * (back ? 0.75 : 1);
    const H = roar > 0.15 || (e.roared && t < 0.75) ? HEAD_R : HEAD;
    ctx.drawImage(H.c, -H.x0, -H.y0, H.w, H.h);
    // 龍鬚：從上唇往後飄
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const w = Math.sin(t * 13 + k * 1.7) * 7;
      ctx.beginPath();
      ctx.moveTo(34, -3 + k * 2);
      ctx.bezierCurveTo(22, 8 + w, 4, 4 - w, -26 - k * 6, 14 + w * 0.8 + k * 6);
      ctx.globalAlpha = fade * 0.4;
      ctx.strokeStyle = '#ff9a30';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = '#fff2c0';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    ctx.restore();
  }
  function dragonDraw(ctx, back) {
    for (const e of DG) {
      const t = e.t;
      const alpha = t < 0.05 ? t / 0.05 : 1;
      const last = Math.min(e.N, e.cut);
      if (last >= 1) {
        // 依前後切成幾段：前面的畫在前景、後面的畫在怪物後面
        let i0 = 0;
        for (let i = 1; i <= last + 1; i++) {
          const endRun = i > last || (e.pz[i] >= 0) !== (e.pz[i0] >= 0);
          if (!endRun) continue;
          const isFront = e.pz[i0] >= 0;
          if (isFront !== back) ribbon(ctx, e, i0, Math.min(last, i), alpha, back);
          i0 = i;
        }
      }
      // 爪子上的光
      if (!back && t < 0.45) {
        const P = G.player;
        if (P) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = (1 - t / 0.45) * 0.8;
          ctx.drawImage(GLOW_O, P.x + e.dir * 30 - 30, P.y - 76, 60, 60);
        }
      }
      // 龍頭永遠在前景（它是整條龍的焦點）
      if (!back) drawHead(ctx, e, false);
      // 龍吼的爆風
      if (!back && e.roared) {
        const k = (t - 0.4) / 0.4;
        if (k < 1) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineCap = 'round';
          const a0 = e.dir > 0 ? e.ha : PI - e.ha;
          for (let w = 0; w < 3; w++) {
            const kk = k - w * 0.12;
            if (kk <= 0 || kk >= 1) continue;
            const r = 14 + 110 * eOut(kk);
            ctx.globalAlpha = (1 - kk) * 0.85;
            ctx.strokeStyle = w === 1 ? '#ffb040' : '#fff0b8';
            ctx.lineWidth = 6 * (1 - kk) + 1;
            ctx.beginPath();
            ctx.arc(e.mx, e.my, r, a0 - 0.95, a0 + 0.95);
            ctx.stroke();
          }
          ctx.globalAlpha = Math.pow(1 - k, 2) * 0.9;
          const r = 70;
          ctx.drawImage(GLOW_O, e.mx - r, e.my - r, r * 2, r * 2);
        }
      }
    }
    if (!back && DGP.n) {
      // 金色火花
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffe2a0';
      for (const q of DGP.a) {
        if (!q.on || q.k !== 1) continue;
        ctx.globalAlpha = 1 - q.t / q.life;
        ctx.lineWidth = q.s;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03);
        ctx.stroke();
      }
      // 散開的能量鱗片（小菱形）
      for (const q of DGP.a) {
        if (!q.on || q.k !== 5) continue;
        const k = q.t / q.life;
        const s = q.s * (1 - k * 0.5);
        const c = Math.cos(q.rot) * s;
        const sn = Math.sin(q.rot) * s;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (1 - k) * 0.95;
        ctx.beginPath();
        ctx.moveTo(q.x + c, q.y + sn);
        ctx.lineTo(q.x - sn * 0.6, q.y + c * 0.6);
        ctx.lineTo(q.x - c, q.y - sn);
        ctx.lineTo(q.x + sn * 0.6, q.y - c * 0.6);
        ctx.closePath();
        ctx.fillStyle = '#ffc54a';
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - k) * 0.6;
        ctx.fillStyle = '#fff4c8';
        ctx.fill();
      }
    }
  }
  A.dragonFx = {
    begin(P) {
      const e = newDragon(P);
      DG.push(e);
      return e;
    },
  };
  A.skillFx.add({
    live: () => DG.length > 0 || DGP.n > 0,
    step: dragonStep,
    back: (ctx) => dragonDraw(ctx, true),
    front: (ctx) => dragonDraw(ctx, false),
    clear() {
      DG.length = 0;
      clearPool(DGP);
    },
  });
})();
