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
  function bigShuriken(ctx, p, t) {
    const r = p.r || 64;
    const dir = p.dir || 1;
    const s = p.seed || 0;
    glow(ctx, 0, 0, r * 1.45, '170,240,120', 0.45);
    // 風的漩渦弧
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const rr = r * (1.05 + (i % 3) * 0.14);
      const a0 = -t * 7 * dir + (i * TAU) / 5 + s;
      ctx.beginPath();
      ctx.arc(0, 0, rr, a0, a0 + 0.9 + (i % 2) * 0.4);
      ctx.strokeStyle = 'rgba(200,255,160,' + (0.55 + (i % 2) * 0.3).toFixed(2) + ')';
      ctx.lineWidth = 4 - (i % 3);
      ctx.stroke();
    }
    ctx.restore();
    // 旋轉的殘像
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.rotate(t * 20 * dir + s - 0.35 * dir);
    A.shape(ctx, (c) => shurikenPath(c, r, r * 0.3, 0.18), '#e0f0d0', null, { noStroke: true, hl: false });
    ctx.restore();
    shuriken(ctx, 0, 0, r, t * 20 * dir + s, '#d0dcec', '#8a98b0', 3, 0.18);
    // 中心綠寶石環
    A.ellipse(ctx, 0, 0, r * 0.2, r * 0.2, '#a8e05a', '#78b030', { lw: 2.4, hl: false });
    A.ellipse(ctx, 0, 0, r * 0.08, r * 0.08, '#2e3a48', null, { lw: 1.6, hl: false });
    // 刃上的高光（固定角度，看起來會閃）
    const sh = Math.max(0, Math.sin(t * 20 + s));
    if (sh > 0.3) sparkle(ctx, -r * 0.35, -r * 0.35, r * 0.18 * sh, '#ffffff');
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
      const bw = Math.max(w * 1.3, h * 0.95);
      const bh = h * 1.12 + 6;
      const x0 = -bw / 2;
      const y0 = -bh + 3;
      const box = (c) => A.roundRect(c, x0, y0, bw, bh, Math.min(12, bw * 0.18));
      // 淡出（快解凍時閃爍）
      const a = m.frozenT < 0.5 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 18)) : 1;
      ctx.globalAlpha = a;
      glow(ctx, 0, y0 + bh / 2, Math.max(bw, bh) * 0.75, '170,225,255', 0.35);
      ctx.fillStyle = 'rgba(170,220,255,0.42)';
      ctx.beginPath();
      box(ctx);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      box(ctx);
      ctx.clip();
      // 下半部較深、內側折射面
      ctx.fillStyle = 'rgba(110,180,235,0.28)';
      ctx.beginPath();
      ctx.moveTo(x0, y0 + bh * 0.62);
      ctx.lineTo(x0 + bw, y0 + bh * 0.45);
      ctx.lineTo(x0 + bw, y0 + bh);
      ctx.lineTo(x0, y0 + bh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(x0 + bw * 0.12, y0);
      ctx.lineTo(x0 + bw * 0.3, y0);
      ctx.lineTo(x0, y0 + bh * 0.4);
      ctx.lineTo(x0, y0 + bh * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // 冰塊邊框：描邊 + 白色內邊
      ctx.beginPath();
      box(ctx);
      ctx.strokeStyle = A.outline();
      ctx.globalAlpha = a * 0.55;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(235,250,255,0.95)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // 高光條
      line(ctx, [[x0 + 6, y0 + bh * 0.55], [x0 + 6, y0 + 10], [x0 + 14, y0 + 5]], 'rgba(255,255,255,0.95)', 2.6);
      line(ctx, [[x0 + bw - 7, y0 + 12], [x0 + bw - 7, y0 + 20]], 'rgba(255,255,255,0.8)', 2);
      // 頂上的小冰晶
      iceShardAt(ctx, x0 + bw * 0.28, y0 + 2, 8, 3, -PI / 2 - 0.25, 1.5);
      iceShardAt(ctx, x0 + bw * 0.72, y0 + 2, 11, 3.5, -PI / 2 + 0.2, 1.5);
      // 雪花
      const tw = 0.8 + 0.2 * Math.sin(t * 5 + seed);
      snowflake(ctx, x0 + bw - 8, y0 + bh * 0.35, 5 * tw, '#ffffff', 1.5);
      snowflake(ctx, x0 + 9, y0 + bh * 0.8, 3.6, '#ffffff', 1.3);
      sparkle(ctx, x0 + bw * 0.55, y0 + bh * 0.2, 3 + 2 * Math.max(0, Math.sin(t * 7 + seed)), '#ffffff');
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
