// 第二、三章的 NPC 與新圖示（註冊到 A.NPC_DRAW／A.ICON）。
// 風格跟 npcs.js、items.js 一樣：平塗、深棕描邊、右下月牙陰影、Q 版眼睛，每隻 NPC 一個招牌配件。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;

  // ════════ 小工具 ════════
  // 有描邊的粗線（釣竿、拐杖、湯杓柄）
  function stick(ctx, pts, col, w) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + 2.6;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  // 有描邊的曲線（手臂、觸手、角）
  function curve(ctx, p0, p1, p2, col, w) {
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + 2.6;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  function line(ctx, pts, col, w) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = w || 2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  function dot(ctx, x, y, r, col) {
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function glow(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
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
  function blinkAt(t, sp, off) {
    return Math.sin(t * sp + (off || 0)) > 0.97;
  }
  function smile(ctx, x, y, w) {
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y - w * 0.6, w, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
  }
  function whiskers(ctx, x, y, dir, col, len) {
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    [-2.5, 0, 2.5].forEach((dy, i) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy);
      ctx.lineTo(x + dir * (len || 8), y + dy * 1.8 + (i - 1) * 0.5);
      ctx.stroke();
    });
  }
  // 往上飄的熱氣
  function steam(ctx, x, y, t, n, sp, h) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const ph = (t * sp + k / n) % 1;
      ctx.globalAlpha = 0.6 * Math.sin(ph * Math.PI);
      const sx = x + k * 6;
      const sy = y - ph * h;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 5);
      ctx.quadraticCurveTo(sx - 3, sy + 2, sx, sy);
      ctx.quadraticCurveTo(sx + 3, sy - 2, sx, sy - 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ════════ 第二章：燈塔岬 ════════

  // 海獺漁夫：草帽、釣竿，話很多（嘴巴一直動）
  function otter(ctx, t) {
    const bob = Math.sin(t * 2.2) * 1;
    const talking = t % 4 < 2.2;
    const talk = talking ? Math.abs(Math.sin(t * 11)) : 0;
    // 扁尾巴
    A.shape(ctx, (c) => { c.moveTo(-8, -12); c.quadraticCurveTo(-26, -12, -32, -3); c.quadraticCurveTo(-30, 1, -22, 0); c.quadraticCurveTo(-14, -1, -6, -3); c.closePath(); }, '#7a4e32', '#5e3a24', { cel: [2, 2], lw: 2.2, hl: false });
    A.ellipse(ctx, -6, -2, 6.5, 3.2, '#6a4228', null, { lw: 2, hl: false });
    A.ellipse(ctx, 8, -2, 6.5, 3.2, '#6a4228', null, { lw: 2, hl: false });
    // 身體
    A.ellipse(ctx, 0, -22 + bob, 15, 19, '#8e5c3a', '#6c4428', { cel: [3, 3] });
    A.ellipse(ctx, 3, -19 + bob, 9, 13, '#ecd2a8', null, { noStroke: true, hl: false });
    // 釣竿與釣線
    const tipX = 46;
    const tipY = -68 + bob + Math.sin(t * 1.6) * 1.5;
    const bobX = 53 + Math.sin(t * 1.3) * 2;
    const bobY = -22 + Math.sin(t * 2.6) * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX + 8, (tipY + bobY) / 2, bobX, bobY - 5);
    ctx.stroke();
    stick(ctx, [[8, -14 + bob], [tipX, tipY]], '#c8904a', 2.6);
    A.shape(ctx, (c) => c.ellipse(17, -26 + bob, 3.5, 3.5, 0, 0, TAU), '#9aa4ae', null, { lw: 1.8, hl: false });
    A.shape(ctx, (c) => c.arc(bobX, bobY, 4.5, Math.PI, 0), '#e8433a', null, { lw: 1.8, hl: false });
    A.shape(ctx, (c) => c.arc(bobX, bobY, 4.5, 0, Math.PI), '#ffffff', null, { lw: 1.8, hl: false });
    A.ellipse(ctx, 13, -21 + bob, 5, 4.5, '#8e5c3a', '#6c4428', { lw: 2, hl: false });
    // 頭
    const hx = 5;
    const hy = -47 + bob;
    A.ellipse(ctx, hx - 10, hy - 7, 4, 4, '#8e5c3a', null, { lw: 2, hl: false });
    A.ellipse(ctx, hx, hy, 14.5, 12.5, '#8e5c3a', '#6c4428', { cel: [2, 2.5] });
    A.ellipse(ctx, hx + 7, hy + 4, 8.5, 6, '#ecd2a8', null, { lw: 2, hl: false });
    ctx.fillStyle = A.c('#3a2418');
    ctx.beginPath();
    ctx.ellipse(hx + 13, hy + 1, 3, 2.2, 0, 0, TAU);
    ctx.fill();
    whiskers(ctx, hx + 14, hy + 4, 1, null, 7);
    if (talk > 0.1) {
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.ellipse(hx + 9, hy + 8, 2.2, 0.8 + talk * 2.2, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else smile(ctx, hx + 9, hy + 7, 2.6);
    const bl = blinkAt(t, 0.9);
    A.eye(ctx, hx + 2, hy - 3, 2.8, 3.4, bl ? 'closed' : 'normal', 1);
    A.eye(ctx, hx + 9, hy - 3.5, 2.6, 3.2, bl ? 'closed' : 'normal', 1);
    A.blush(ctx, hx - 1, hy + 4, 3);
    // 草帽
    A.shape(ctx, (c) => c.ellipse(hx - 1, hy - 9, 18, 4.5, -0.08, 0, TAU), '#f0d080', '#c8a850', { shadeY: hy - 8, lw: 2.2 });
    A.shape(ctx, (c) => { c.moveTo(hx - 10, hy - 10); c.quadraticCurveTo(hx - 10, hy - 23, hx - 1, hy - 23); c.quadraticCurveTo(hx + 8, hy - 23, hx + 8, hy - 11); c.closePath(); }, '#f0d080', '#d8b860', { cel: [2, 1.5], lw: 2.2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, hx - 10, hy - 15, 18, 4, 1.5), '#d94f4f', null, { lw: 1.6, hl: false });
    // 說話的小泡泡
    if (talking) {
      const k = (t % 4) / 2.2;
      ctx.globalAlpha = Math.min(1, Math.sin(k * Math.PI) * 2);
      [[hx + 20, hy - 18, 2], [hx + 25, hy - 24, 2.8], [hx + 32, hy - 30, 3.6]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r, '#ffffff', null, { lw: 1.4, hl: false }));
      ctx.globalAlpha = 1;
    }
  }

  // 海豹燈塔守：老海豹，紅藍毛線帽，手提油燈
  function seal(ctx, t) {
    const bob = Math.sin(t * 1.4) * 0.8;
    A.shape(ctx, (c) => { c.moveTo(-18, -4); c.quadraticCurveTo(-30, -14, -36, -8); c.quadraticCurveTo(-30, -4, -32, 2); c.quadraticCurveTo(-24, 0, -16, 0); c.closePath(); }, '#76828f', '#5c6875', { lw: 2.2, hl: false });
    const body = (c) => { c.moveTo(-24, 0); c.bezierCurveTo(-30, -26, -12, -46 + bob, 4, -46 + bob); c.bezierCurveTo(22, -46 + bob, 24, -20, 18, 0); c.closePath(); };
    A.shape(ctx, body, '#8e9aa6', '#6c7886', { cel: [4, 3] });
    A.shape(ctx, (c) => c.ellipse(6, -16, 10, 14, 0, 0, TAU), '#c8d0d8', null, { noStroke: true, hl: false });
    [[-8, -30], [-14, -18], [-4, -38]].forEach(([x, y]) => A.ellipse(ctx, x, y + bob * 0.5, 2.2, 1.6, '#6c7886', null, { noStroke: true, hl: false }));
    // 油燈（在身體前面晃）
    const sw = Math.sin(t * 1.8) * 0.12;
    const lx = 26;
    const ly = -30 + bob;
    const flick = 0.75 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.06;
    glow(ctx, lx + 2, ly + 16, 26, '255,210,110', 0.45 * flick);
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(sw);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 4, 4, Math.PI, 0);
    ctx.stroke();
    A.shape(ctx, (c) => { c.moveTo(-7, 9); c.lineTo(-4, 4); c.lineTo(4, 4); c.lineTo(7, 9); c.closePath(); }, '#3e4a58', null, { lw: 2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, -6, 9, 12, 13, 3), '#ffe79a', null, { lw: 2, hl: false });
    A.ellipse(ctx, 0, 16, 2.4, 3.6 * flick, '#ff9a3a', null, { noStroke: true, hl: false });
    ctx.strokeStyle = A.c('#3e4a58');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, 9);
    ctx.lineTo(-3, 22);
    ctx.moveTo(3, 9);
    ctx.lineTo(3, 22);
    ctx.stroke();
    A.shape(ctx, (c) => A.roundRect(c, -7, 21, 14, 4, 2), '#3e4a58', null, { lw: 2, hl: false });
    ctx.restore();
    // 前鰭提著燈
    A.shape(ctx, (c) => { c.moveTo(12, -30 + bob); c.quadraticCurveTo(22, -36 + bob, 28, -32 + bob); c.quadraticCurveTo(26, -26 + bob, 14, -22 + bob); c.closePath(); }, '#8e9aa6', '#6c7886', { lw: 2.2, hl: false });
    // 頭
    const hx = 7;
    const hy = -50 + bob;
    A.ellipse(ctx, hx, hy, 15, 13, '#8e9aa6', '#6c7886', { cel: [2.5, 2.5] });
    A.ellipse(ctx, hx + 9, hy + 5, 5.5, 4.5, '#dfe4ea', null, { lw: 1.8, hl: false });
    A.ellipse(ctx, hx + 15, hy + 5, 5, 4.2, '#dfe4ea', null, { lw: 1.8, hl: false });
    ctx.fillStyle = A.c('#2b2a30');
    ctx.beginPath();
    ctx.ellipse(hx + 13, hy + 1, 3, 2.2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 1.3;
    [[0, 0], [2, 3], [1, 6]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(hx + 17 + dx, hy + 4 + dy * 0.4);
      ctx.quadraticCurveTo(hx + 24 + dx, hy + 2 + dy, hx + 28 + dx, hy + 6 + dy * 1.2);
      ctx.stroke();
    });
    const bl = blinkAt(t, 0.7);
    A.eye(ctx, hx + 2, hy - 2, 2.6, 2.8, bl ? 'closed' : 'normal', 1);
    A.eye(ctx, hx + 10, hy - 2.5, 2.4, 2.6, bl ? 'closed' : 'normal', 1);
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 2, hy - 6);
    ctx.quadraticCurveTo(hx + 2, hy - 9, hx + 5, hy - 6);
    ctx.moveTo(hx + 7, hy - 7);
    ctx.quadraticCurveTo(hx + 10, hy - 10, hx + 14, hy - 7);
    ctx.stroke();
    A.blush(ctx, hx - 2, hy + 4, 3);
    // 毛線帽
    const cap = (c) => { c.moveTo(hx - 14, hy - 5); c.quadraticCurveTo(hx - 14, hy - 26, hx + 1, hy - 26); c.quadraticCurveTo(hx + 15, hy - 26, hx + 14, hy - 8); c.closePath(); };
    A.shape(ctx, cap, '#d94f4f', '#b33a3a', { cel: [2, 2], lw: 2.2, hl: false });
    ctx.save();
    ctx.beginPath();
    cap(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#f4ecd8');
    ctx.fillRect(hx - 20, hy - 19, 40, 3.5);
    ctx.restore();
    A.shape(ctx, (c) => A.roundRect(c, hx - 16, hy - 10, 31, 6, 3), '#3d6fb3', '#2d5690', { shadeY: hy - 6, lw: 2 });
    ctx.strokeStyle = A.c('#2d5690');
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(hx - 12 + i * 5, hy - 9);
      ctx.lineTo(hx - 12 + i * 5, hy - 5);
      ctx.stroke();
    }
    A.ellipse(ctx, hx - 2, hy - 28, 4.5, 4.5, '#f4ecd8', '#d8ccb4', { lw: 2, hl: false });
  }

  // 海鷗商人：白身灰翅，斜背一個鼓鼓的商人包
  function gullmerchant(ctx, t) {
    const bob = Math.sin(t * 2) * 1;
    const peck = t % 5 < 0.35 ? Math.sin(((t % 5) / 0.35) * Math.PI) : 0;
    line(ctx, [[-4, -14], [-4, -2]], '#f28c38', 3);
    line(ctx, [[6, -14], [6, -2]], '#f28c38', 3);
    A.shape(ctx, (c) => { c.moveTo(-9, 0); c.lineTo(-4, -3); c.lineTo(1, 0); c.closePath(); }, '#f28c38', null, { lw: 1.8, hl: false });
    A.shape(ctx, (c) => { c.moveTo(1, 0); c.lineTo(6, -3); c.lineTo(11, 0); c.closePath(); }, '#f28c38', null, { lw: 1.8, hl: false });
    A.shape(ctx, (c) => { c.moveTo(-12, -26 + bob); c.lineTo(-30, -20 + bob); c.lineTo(-26, -16 + bob); c.lineTo(-10, -16 + bob); c.closePath(); }, '#9aa4b0', '#7a8490', { lw: 2.2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(-26, -21 + bob); c.lineTo(-30, -20 + bob); c.lineTo(-27, -17 + bob); c.closePath(); }, '#3a3a44', null, { noStroke: true, hl: false });
    A.ellipse(ctx, 0, -26 + bob, 17, 15, '#fbfbf6', '#d8dce2', { cel: [3, 3] });
    A.shape(ctx, (c) => { c.moveTo(-10, -34 + bob); c.quadraticCurveTo(4, -38 + bob, 8, -28 + bob); c.quadraticCurveTo(4, -16 + bob, -20, -18 + bob); c.quadraticCurveTo(-18, -26 + bob, -10, -34 + bob); c.closePath(); }, '#9aa4b0', '#7a8490', { cel: [1.5, 1.5], lw: 2.2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(-20, -18 + bob); c.quadraticCurveTo(-14, -22 + bob, -10, -19 + bob); c.lineTo(-14, -17 + bob); c.closePath(); }, '#3a3a44', null, { noStroke: true, hl: false });
    // 背帶與商人包
    line(ctx, [[-6, -39 + bob], [10, -17 + bob]], '#6b4428', 3);
    A.shape(ctx, (c) => A.roundRect(c, 5, -31 + bob, 5, 7, 2), '#fff0d0', null, { lw: 1.6, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, 2, -24 + bob, 18, 15, 4), '#b5763c', '#8f5a2a', { cel: [2, 2], lw: 2.2 });
    A.shape(ctx, (c) => { c.moveTo(2, -20 + bob); c.lineTo(2, -22 + bob); c.quadraticCurveTo(2, -26 + bob, 6, -26 + bob); c.lineTo(16, -26 + bob); c.quadraticCurveTo(20, -26 + bob, 20, -22 + bob); c.lineTo(20, -18 + bob); c.quadraticCurveTo(11, -14 + bob, 2, -20 + bob); c.closePath(); }, '#c8905a', '#a8703c', { shadeY: -19 + bob, lw: 2 });
    A.ellipse(ctx, 11, -18 + bob, 3, 3, '#ffcf3a', '#e0a020', { lw: 1.6, hl: false });
    // 頭（偶爾點頭啄一下）
    ctx.save();
    ctx.translate(7, -44 + bob);
    ctx.rotate(peck * 0.35);
    A.ellipse(ctx, 0, 0, 11, 10, '#fbfbf6', '#d8dce2', { cel: [2, 2] });
    A.shape(ctx, (c) => { c.moveTo(8, -3); c.lineTo(22, -1); c.quadraticCurveTo(24, 1, 21, 3); c.lineTo(8, 4); c.closePath(); }, '#ffc83a', '#e8a020', { shadeY: 1.5, lw: 2 });
    dot(ctx, 18, 2.5, 1.6, '#e8433a');
    A.eye(ctx, 4, -2, 2.4, 3, blinkAt(t, 0.8, 1) ? 'closed' : 'normal', 1);
    line(ctx, [[0, -6], [7, -5]], null, 2);
    A.blush(ctx, 2, 4, 2.4);
    ctx.restore();
  }

  // 小河豚：住在裝水的玻璃缸裡，底下長了兩隻小腳；偶爾會氣鼓鼓地脹起來
  function pufferkid(ctx, t) {
    const cyc = t % 4;
    const puff = cyc > 2.4 && cyc < 3.6 ? Math.sin(((cyc - 2.4) / 1.2) * Math.PI) : 0;
    const hop = -Math.abs(Math.sin(t * 3.2)) * 3 * (1 - puff);
    const cy = -27 + hop;
    const R = 18;
    [-7, 7].forEach((x) => {
      A.shape(ctx, (c) => A.roundRect(c, x - 2.5, cy + 12, 5, -cy - 13, 2.5), '#ffd65a', null, { lw: 2, hl: false });
      A.ellipse(ctx, x + 2, -2, 5.5, 3, '#3d6fb3', null, { lw: 2, hl: false });
    });
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, cy, R, 0, TAU);
    ctx.clip();
    ctx.fillStyle = 'rgba(210,240,255,0.35)';
    ctx.fillRect(-R, cy - R, R * 2, R * 2);
    const wl = cy - 9 + Math.sin(t * 3) * 1;
    ctx.fillStyle = A.c('rgba(110,200,240,0.55)');
    ctx.beginPath();
    ctx.moveTo(-R, wl);
    for (let x = -R; x <= R; x += 4) ctx.lineTo(x, wl + Math.sin(x * 0.4 + t * 4) * 1.2);
    ctx.lineTo(R, cy + R);
    ctx.lineTo(-R, cy + R);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = A.c('#f0d8a0');
    ctx.beginPath();
    ctx.ellipse(0, cy + R, R, 5, 0, Math.PI, 0);
    ctx.fill();
    // 河豚
    const fx = 1 + Math.sin(t * 1.5) * 2;
    const fy = cy + 2 + Math.sin(t * 2.4) * 1.2;
    const fr = 7 + puff * 4.5;
    A.shape(ctx, (c) => { c.moveTo(fx - fr + 1, fy); c.lineTo(fx - fr - 6, fy - 4); c.lineTo(fx - fr - 5, fy + 4); c.closePath(); }, '#ffb84a', null, { lw: 1.6, hl: false });
    if (puff > 0.05) A.shape(ctx, (c) => starPath(c, fx, fy, fr + 3 * puff, fr - 0.5, 12, t), '#ffe08a', null, { lw: 1.6, hl: false });
    A.ellipse(ctx, fx, fy, fr, fr * 0.92, '#ffd65a', '#e8b030', { cel: [1.5, 1.5], lw: 2 });
    A.ellipse(ctx, fx + 1, fy + fr * 0.45, fr * 0.6, fr * 0.35, '#fff4c8', null, { noStroke: true, hl: false });
    A.ellipse(ctx, fx - 1, fy + 1, 3, 2, '#ffb84a', null, { lw: 1.4, hl: false, rot: 0.4 });
    A.eye(ctx, fx + fr * 0.35, fy - fr * 0.25, 1.9, 2.4, blinkAt(t, 1.1) ? 'closed' : 'normal', 0.6);
    A.eye(ctx, fx + fr * 0.75, fy - fr * 0.28, 1.7, 2.2, 'normal', 0.6);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (puff > 0.3) ctx.arc(fx + fr * 0.85, fy + fr * 0.2, 1.4, 0, TAU);
    else ctx.arc(fx + fr * 0.7, fy + 1, 1.8, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    A.blush(ctx, fx + fr * 0.2, fy + fr * 0.3, 1.8);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.7 + i / 3) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - k)).toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(fx + 10 + Math.sin(k * 6 + i) * 2, fy - 3 - k * 14, 1.2 + k * 1.2, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    // 玻璃缸：描邊、缸口、反光
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = A.LW;
    ctx.beginPath();
    ctx.arc(0, cy, R, -0.34 * Math.PI, 1.34 * Math.PI);
    ctx.stroke();
    A.shape(ctx, (c) => c.ellipse(0, cy - R + 2, 9, 3, 0, 0, TAU), '#e8f8ff', null, { lw: 2.2, hl: false });
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, cy, R - 4, 1.05 * Math.PI, 1.35 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, cy, R - 4, 1.45 * Math.PI, 1.5 * Math.PI);
    ctx.stroke();
  }

  // 海星：粉紅色，戴著綁花的遮陽草帽
  function starfish(ctx, t) {
    const sway = Math.sin(t * 1.8) * 0.06;
    ctx.save();
    ctx.rotate(sway);
    const cx = 0;
    const cy = -23;
    const R = 25;
    const r = 11;
    const P = (a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
    const star = (c) => {
      const a0 = -Math.PI / 2;
      const p = P(a0 - 0.17, R * 0.86);
      c.moveTo(p[0], p[1]);
      for (let k = 0; k < 5; k++) {
        const a = a0 + (k / 5) * TAU;
        const tip = P(a, R * 1.12);
        const e = P(a + 0.17, R * 0.86);
        c.quadraticCurveTo(tip[0], tip[1], e[0], e[1]);
        const v = P(a + TAU / 10, r * 0.95);
        const n = P(a + TAU / 5 - 0.17, R * 0.86);
        c.quadraticCurveTo(v[0], v[1], n[0], n[1]);
      }
      c.closePath();
    };
    A.shape(ctx, star, '#ff8fa8', '#e06a88', { cel: [3, 3] });
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k / 5) * TAU;
      [0.55, 0.8].forEach((f) => {
        const p = P(a, R * f);
        dot(ctx, p[0], p[1], 1.8 - f, '#ffd3de');
      });
    }
    const bl = blinkAt(t, 0.9, 2);
    A.eye(ctx, cx - 3, cy - 3, 2.6, 3.2, bl ? 'closed' : 'normal', 1);
    A.eye(ctx, cx + 5, cy - 3, 2.6, 3.2, bl ? 'closed' : 'normal', 1);
    smile(ctx, cx + 1.5, cy + 4, 2.8);
    A.blush(ctx, cx - 6, cy + 2, 2.6);
    A.blush(ctx, cx + 9, cy + 2, 2.6);
    // 遮陽帽（戴在最上面那隻手臂上）
    const hy = cy - R + 3;
    A.shape(ctx, (c) => c.ellipse(1, hy, 17, 4.5, -0.12, 0, TAU), '#f6dc8e', '#d4b460', { shadeY: hy + 1, lw: 2.2 });
    A.shape(ctx, (c) => { c.moveTo(-7, hy); c.quadraticCurveTo(-7, hy - 11, 1, hy - 11); c.quadraticCurveTo(9, hy - 11, 8, hy - 1); c.closePath(); }, '#f6dc8e', '#dcc070', { cel: [2, 1.5], lw: 2.2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(-7, hy - 3); c.quadraticCurveTo(1, hy - 1, 8, hy - 4); c.lineTo(8, hy - 1); c.quadraticCurveTo(1, hy + 2, -7, hy); c.closePath(); }, '#5ac0d8', null, { lw: 1.6, hl: false });
    for (let i = 0; i < 5; i++) A.ellipse(ctx, 7 + Math.cos(i * 1.256) * 2.6, hy - 4 + Math.sin(i * 1.256) * 2.6, 2, 2, '#ffffff', null, { lw: 1.1, hl: false });
    dot(ctx, 7, hy - 4, 1.4, '#ffd23a');
    ctx.restore();
  }

  // 章魚畫家：紫色章魚，貝雷帽，一手畫筆一手調色盤
  function octopus(ctx, t) {
    const bob = Math.sin(t * 2) * 1.5;
    const col = '#b07ad8';
    const sh = '#8a58b8';
    const tent = (x0, dir, ph, len) => {
      const w = Math.sin(t * 3 + ph) * 3;
      ctx.lineCap = 'round';
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(x0, -18 + bob);
        ctx.bezierCurveTo(x0 + dir * 4 + w, -8, x0 + dir * 10, -2 + len, x0 + dir * 14 + w * 0.3, -6);
      };
      path();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 9;
      ctx.stroke();
      path();
      ctx.strokeStyle = A.c(col);
      ctx.lineWidth = 6;
      ctx.stroke();
    };
    tent(-12, -1, 0, 2);
    tent(-4, -1, 1.3, 3);
    tent(6, 1, 2.1, 3);
    tent(13, 1, 0.7, 2);
    // 調色盤
    curve(ctx, [-14, -24 + bob], [-26, -26 + bob], [-26, -34 + bob], col, 5);
    A.shape(ctx, (c) => c.ellipse(-30, -38 + bob, 11, 7, -0.3, 0, TAU), '#e8c08a', '#c89a60', { shadeY: -36 + bob, lw: 2 });
    [['#e8433a', -35, -40], ['#4b8cf0', -29, -43], ['#ffd23a', -24, -40], ['#6fbf4a', -32, -35]].forEach(([cc, x, y]) => A.ellipse(ctx, x, y + bob, 2.2, 1.8, cc, null, { lw: 1.2, hl: false }));
    // 頭
    const hy = -38 + bob;
    A.shape(ctx, (c) => { c.moveTo(-18, -18 + bob); c.bezierCurveTo(-24, hy - 30, 24, hy - 30, 18, -18 + bob); c.quadraticCurveTo(0, -12 + bob, -18, -18 + bob); c.closePath(); }, col, sh, { cel: [3, 3], hl: [-8, hy - 8, 5, 3.5] });
    [[-10, hy - 10, 2.5], [10, hy - 12, 2], [-4, hy - 17, 1.6]].forEach(([x, y, rr]) => dot(ctx, x, y, rr, '#c89ae8'));
    // 前排觸手：拿畫筆往右上舉
    const wave = Math.sin(t * 2.5) * 0.12;
    ctx.save();
    ctx.translate(12, -22 + bob);
    ctx.rotate(wave);
    curve(ctx, [0, 0], [14, 4], [18, -12], col, 5);
    stick(ctx, [[16, -8], [28, -30]], '#c8904a', 2.4);
    A.shape(ctx, (c) => A.roundRect(c, 25.5, -33, 5, 5, 1), '#c0c8d0', null, { lw: 1.4, hl: false });
    A.shape(ctx, (c) => { c.moveTo(26, -32); c.quadraticCurveTo(28, -42, 32, -40); c.quadraticCurveTo(32, -35, 30, -32); c.closePath(); }, '#4bc0e8', null, { lw: 1.6, hl: false });
    ctx.restore();
    const bl = blinkAt(t, 0.8, 0.5);
    A.eye(ctx, 2, hy + 2, 3.2, 4.2, bl ? 'closed' : 'normal', 1);
    A.eye(ctx, 11, hy + 1.5, 3, 4, bl ? 'closed' : 'normal', 1);
    smile(ctx, 8, hy + 10, 2.8);
    A.blush(ctx, -3, hy + 8, 3);
    A.ellipse(ctx, 15, hy + 8, 2.4, 1.8, '#4bc0e8', null, { noStroke: true, hl: false });
    // 貝雷帽
    A.shape(ctx, (c) => c.ellipse(-2, hy - 17, 17, 6, -0.18, 0, TAU), '#c8303a', '#a0222c', { cel: [2, 2], lw: 2.2, hl: [-8, hy - 20, 4, 1.5] });
    line(ctx, [[-2, hy - 23], [-1, hy - 27]], null, 2.5);
  }

  // 鵜鶘補給員：大喙袋裡裝滿補給品，戴著藍色郵差帽
  function pelican(ctx, t) {
    const bob = Math.sin(t * 1.9) * 1;
    const chew = Math.sin(t * 2.2) * 0.04;
    line(ctx, [[-6, -14], [-6, -2]], '#f28c38', 3.2);
    line(ctx, [[5, -14], [5, -2]], '#f28c38', 3.2);
    A.ellipse(ctx, -4, -1.5, 6, 2.6, '#f28c38', null, { lw: 1.8, hl: false });
    A.ellipse(ctx, 7, -1.5, 6, 2.6, '#f28c38', null, { lw: 1.8, hl: false });
    A.shape(ctx, (c) => { c.moveTo(-14, -26 + bob); c.lineTo(-28, -18 + bob); c.lineTo(-12, -14 + bob); c.closePath(); }, '#e4e4de', '#c8c8c0', { lw: 2.2, hl: false });
    A.ellipse(ctx, -2, -27 + bob, 17, 17, '#f8f6ee', '#d8d6cc', { cel: [3, 3] });
    A.shape(ctx, (c) => { c.moveTo(-12, -36 + bob); c.quadraticCurveTo(2, -38 + bob, 6, -28 + bob); c.quadraticCurveTo(2, -16 + bob, -18, -18 + bob); c.quadraticCurveTo(-20, -30 + bob, -12, -36 + bob); c.closePath(); }, '#e4e4de', '#c8c8c0', { cel: [1.5, 1.5], lw: 2.2, hl: false });
    [[-16, -20], [-11, -18]].forEach(([x, y]) => A.ellipse(ctx, x, y + bob, 3, 1.6, '#4a4a52', null, { noStroke: true, hl: false, rot: 0.3 }));
    A.shape(ctx, (c) => { c.moveTo(0, -40 + bob); c.quadraticCurveTo(-2, -52 + bob, 2, -58 + bob); c.lineTo(12, -58 + bob); c.quadraticCurveTo(8, -50 + bob, 12, -38 + bob); c.closePath(); }, '#f8f6ee', '#d8d6cc', { cel: [2, 1], lw: 2.2, hl: false });
    const hx = 6;
    const hy = -62 + bob;
    A.ellipse(ctx, hx, hy, 10, 9, '#f8f6ee', '#d8d6cc', { cel: [2, 2] });
    // 喙袋（裝補給）：嘴巴微張，露出塞得滿滿的補給品
    ctx.save();
    ctx.translate(hx + 6, hy + 2);
    ctx.rotate(chew);
    A.shape(ctx, (c) => { c.moveTo(0, 0); c.lineTo(28, 1); c.quadraticCurveTo(26, 20, 12, 22); c.quadraticCurveTo(2, 20, 0, 6); c.closePath(); }, '#ffcf7a', '#e8a850', { cel: [2, 2], lw: 2.2 });
    // 上喙（往上張開）
    ctx.save();
    ctx.translate(-1, -1);
    ctx.rotate(-0.42);
    A.shape(ctx, (c) => { c.moveTo(-1, -3); c.lineTo(29, -1); c.quadraticCurveTo(34, 0, 31, 3); c.lineTo(0, 3); c.closePath(); }, '#ffb84a', '#e0923a', { shadeY: 1.5, lw: 2.2 });
    ctx.restore();
    // 藥水瓶
    A.shape(ctx, (c) => A.roundRect(c, 9, -10, 6, 10, 2.5), '#e8433a', '#b8302a', { cel: [1, 1], lw: 1.6, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, 10, -13, 4, 3.5, 1), '#b5824a', null, { lw: 1.2, hl: false });
    // 麵包
    A.shape(ctx, (c) => c.ellipse(19, -3, 6.5, 4, -0.35, 0, TAU), '#e8b060', '#c88a40', { cel: [1, 1], lw: 1.6, hl: false });
    line(ctx, [[16, -3], [18, -6]], '#c88a40', 1.2);
    line(ctx, [[19, -1.5], [21, -4.5]], '#c88a40', 1.2);
    // 信封
    ctx.save();
    ctx.translate(26, -3);
    ctx.rotate(0.35);
    A.shape(ctx, (c) => A.roundRect(c, -4, -4, 8, 6, 1), '#fff6e0', null, { lw: 1.4, hl: false });
    line(ctx, [[-3.5, -3.5], [0, -0.5], [3.5, -3.5]], null, 1);
    ctx.restore();
    ctx.restore();
    A.eye(ctx, hx + 2, hy - 2, 2.6, 3.2, blinkAt(t, 0.8, 3) ? 'closed' : 'normal', 1);
    A.blush(ctx, hx - 1, hy + 3, 2.4);
    // 郵差帽
    A.shape(ctx, (c) => { c.moveTo(hx - 9, hy - 5); c.quadraticCurveTo(hx - 8, hy - 16, hx, hy - 16); c.quadraticCurveTo(hx + 8, hy - 16, hx + 8, hy - 6); c.closePath(); }, '#3d6fb3', '#2d5690', { cel: [1.5, 1.5], lw: 2.2, hl: false });
    A.shape(ctx, (c) => c.ellipse(hx + 8, hy - 5.5, 7, 2.2, 0.1, 0, TAU), '#2d5690', null, { lw: 2, hl: false });
    A.ellipse(ctx, hx - 1, hy - 11, 2.4, 2.4, '#ffd23a', null, { lw: 1.2, hl: false });
  }

  // ════════ 第三章：溫泉谷 ════════

  // 水豚掌櫃：一臉淡定，頭上頂著一顆柚子，穿著靛藍短掛
  function capybara(ctx, t) {
    const bob = Math.sin(t * 1.2) * 0.8;
    A.ellipse(ctx, -12, -2, 7, 3.2, '#946438', null, { lw: 2, hl: false });
    A.ellipse(ctx, 10, -2, 7, 3.2, '#946438', null, { lw: 2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(-24, -2); c.bezierCurveTo(-28, -30, -18, -44 + bob, 0, -44 + bob); c.bezierCurveTo(18, -44 + bob, 24, -26, 20, -2); c.closePath(); }, '#b8844e', '#946438', { cel: [4, 3] });
    const coat = (c) => { c.moveTo(-18, -36 + bob); c.quadraticCurveTo(0, -42 + bob, 18, -34 + bob); c.lineTo(20, -10); c.quadraticCurveTo(0, -4, -22, -10); c.closePath(); };
    A.shape(ctx, coat, '#3d5f9a', '#2c4878', { cel: [3, 2], lw: 2.2, hl: false });
    line(ctx, [[4, -40 + bob], [2, -8]], '#f4ecd8', 3);
    A.shape(ctx, (c) => A.roundRect(c, -10, -22 + bob * 0.5, 9, 9, 2), '#f4ecd8', null, { lw: 1.6, hl: false });
    ctx.fillStyle = A.c('#3d5f9a');
    ctx.font = 'bold 7px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('湯', -5.5, -17.5 + bob * 0.5);
    A.ellipse(ctx, 10, -20 + bob, 5, 4, '#b8844e', '#946438', { lw: 2, hl: false });
    // 頭：方方的大鼻子
    const hx = 6;
    const hy = -52 + bob;
    A.ellipse(ctx, hx - 9, hy - 10, 3.5, 3, '#946438', null, { lw: 2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, hx - 15, hy - 11, 36, 22, 10), '#b8844e', '#946438', { cel: [3, 3], hl: [hx - 8, hy - 6, 4, 2.5] });
    A.shape(ctx, (c) => A.roundRect(c, hx + 8, hy - 6, 13, 16, 6), '#a07040', null, { noStroke: true, hl: false });
    ctx.fillStyle = A.c('#3a2418');
    [[hx + 15, hy - 1], [hx + 19, hy - 1]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, 1.1, 2, 0, 0, TAU);
      ctx.fill();
    });
    line(ctx, [[hx + 13, hy + 6], [hx + 19, hy + 6]], null, 1.8);
    // 半瞇的淡定眼
    const bl = blinkAt(t, 0.8, 1);
    [[hx - 1, hy - 3], [hx + 7, hy - 3.5]].forEach(([x, y]) => {
      if (bl) return A.eye(ctx, x, y, 2.4, 2.4, 'closed');
      A.eye(ctx, x, y + 0.5, 2.4, 2.4, 'normal', 0.6);
      ctx.fillStyle = A.c('#b8844e');
      ctx.fillRect(x - 3.2, y - 3, 6.4, 2.6);
      line(ctx, [[x - 3, y - 0.4], [x + 3, y - 0.4]], null, 2);
    });
    A.blush(ctx, hx - 5, hy + 4, 3);
    // 頭上的柚子
    const ys = Math.sin(t * 1.2 + 0.8) * 0.8;
    const yx = hx + 2;
    const yy = hy - 17 + ys;
    A.ellipse(ctx, yx, yy, 7.5, 6.5, '#ffc83a', '#e8a020', { cel: [1.5, 1.5], hl: [yx - 3, yy - 3, 2, 1.4] });
    [[yx + 2, yy + 1], [yx - 2, yy + 2], [yx + 4, yy - 2]].forEach(([x, y]) => dot(ctx, x, y, 0.6, '#e8a020'));
    line(ctx, [[yx, yy - 6], [yx + 1, yy - 8]], null, 2);
    A.ellipse(ctx, yx + 5, yy - 8, 4.5, 2.2, '#6fbf4a', '#4f9a34', { rot: -0.4, lw: 1.6, hl: false });
    steam(ctx, yx - 12, yy - 6, t, 2, 0.35, 16);
  }

  // 老猴子：雪猴爺爺，紅臉白長鬍，拄著彎彎的木杖
  function oldmonkey(ctx, t) {
    const bob = Math.sin(t * 1.3) * 0.8;
    const fur = '#b8aa98';
    const furS = '#948672';
    A.ellipse(ctx, -8, -2, 6.5, 3, furS, null, { lw: 2, hl: false });
    A.ellipse(ctx, 6, -2, 6.5, 3, furS, null, { lw: 2, hl: false });
    // 駝背的身體
    [[-19, -20, -0.4], [-15, -32, -0.9], [-6, -41, -1.4]].forEach(([x, y, r]) => A.shape(ctx, (c) => { c.moveTo(x + 5 * Math.cos(r + 1.6), y + bob + 5 * Math.sin(r + 1.6)); c.lineTo(x + 6 * Math.cos(r + Math.PI), y + bob + 6 * Math.sin(r + Math.PI)); c.lineTo(x + 5 * Math.cos(r - 1.6), y + bob + 5 * Math.sin(r - 1.6)); c.closePath(); }, fur, null, { lw: 2, hl: false }));
    A.shape(ctx, (c) => { c.moveTo(-16, -2); c.bezierCurveTo(-24, -26, -10, -44 + bob, 4, -40 + bob); c.bezierCurveTo(16, -36 + bob, 16, -16, 12, -2); c.closePath(); }, fur, furS, { cel: [3, 3] });
    // 木杖
    const sx = 22;
    stick(ctx, [[sx + 1, 0], [sx - 1, -22], [sx + 1, -38 + bob]], '#9a6a3e', 3.2);
    A.ellipse(ctx, sx + 1, -41 + bob, 4.5, 4, '#8a5a30', '#6a4220', { lw: 2, hl: false });
    A.ellipse(ctx, sx + 6, -42 + bob, 3.5, 1.8, '#6fbf4a', null, { rot: -0.5, lw: 1.4, hl: false });
    A.ellipse(ctx, sx - 1, -28 + bob, 4.5, 4.5, fur, furS, { lw: 2, hl: false });
    // 頭
    const hx = 5;
    const hy = -48 + bob;
    A.ellipse(ctx, hx - 11, hy + 1, 4, 4, '#e8807a', null, { lw: 2, hl: false });
    A.ellipse(ctx, hx, hy, 14, 12.5, fur, furS, { cel: [2, 2] });
    // 紅通通的臉
    A.shape(ctx, (c) => { c.moveTo(hx - 3, hy - 4); c.quadraticCurveTo(hx - 2, hy - 10, hx + 5, hy - 8); c.quadraticCurveTo(hx + 12, hy - 10, hx + 14, hy - 3); c.quadraticCurveTo(hx + 17, hy + 3, hx + 12, hy + 6); c.quadraticCurveTo(hx + 4, hy + 8, hx - 1, hy + 4); c.quadraticCurveTo(hx - 4, hy + 1, hx - 3, hy - 4); c.closePath(); }, '#f08a80', '#d86e66', { cel: [1.5, 1.5], lw: 2, hl: false });
    dot(ctx, hx + 13, hy + 0.5, 0.9, '#8a3a34');
    dot(ctx, hx + 14.8, hy + 0.2, 0.9, '#8a3a34');
    // 眼睛與往下垂的白眉
    const bl = blinkAt(t, 0.85);
    A.eye(ctx, hx + 3, hy - 2.5, 2.2, 2.6, bl ? 'closed' : 'normal', 1);
    A.eye(ctx, hx + 9.5, hy - 3, 2, 2.4, bl ? 'closed' : 'normal', 1);
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy - 4);
    ctx.quadraticCurveTo(hx + 1, hy - 9, hx + 6, hy - 7);
    ctx.moveTo(hx + 7.5, hy - 7.5);
    ctx.quadraticCurveTo(hx + 11, hy - 9.5, hx + 14, hy - 5);
    ctx.stroke();
    // 白長鬍子（從下巴垂下來，嘴角露出一點笑）
    const bs = Math.sin(t * 1.6) * 1.2;
    A.shape(ctx, (c) => { c.moveTo(hx + 1, hy + 5); c.quadraticCurveTo(hx + 7, hy + 9, hx + 13, hy + 5); c.quadraticCurveTo(hx + 13, hy + 16, hx + 6 + bs, hy + 27); c.quadraticCurveTo(hx + 4, hy + 20, hx + 1, hy + 21 + bs * 0.5); c.quadraticCurveTo(hx - 1, hy + 12, hx + 1, hy + 5); c.closePath(); }, '#ffffff', '#dfe4ea', { cel: [1.5, 1.5], lw: 2, hl: false });
    line(ctx, [[hx + 8, hy + 4], [hx + 11, hy + 4.5], [hx + 13, hy + 3.5]], null, 1.6);
    A.shape(ctx, (c) => { c.moveTo(hx - 8, hy - 9); c.quadraticCurveTo(hx - 4, hy - 18, hx + 2, hy - 12); c.quadraticCurveTo(hx + 4, hy - 18, hx + 8, hy - 10); c.closePath(); }, fur, null, { lw: 2, hl: false });
  }

  // 狐獴小哨兵：站得直直的，一手搭在額頭上東張西望，脖子上掛著哨子
  function meerkat(ctx, t) {
    const cyc = t % 6;
    const look = cyc < 2.5 ? 1 : cyc < 3.2 ? 0 : cyc < 5.2 ? -1 : 0;
    const bob = Math.sin(t * 2.4) * 0.8;
    const fur = '#d8b88a';
    const furS = '#b8966a';
    curve(ctx, [-6, -12], [-20, -8], [-22, -1], fur, 4.5);
    A.ellipse(ctx, -22, -1, 3, 2.4, '#4a3426', null, { lw: 1.6, hl: false });
    A.ellipse(ctx, -6, -2, 6, 2.8, furS, null, { lw: 2, hl: false });
    A.ellipse(ctx, 6, -2, 6, 2.8, furS, null, { lw: 2, hl: false });
    A.ellipse(ctx, 0, -24 + bob, 11, 21, fur, furS, { cel: [2.5, 2.5] });
    A.ellipse(ctx, 3, -20 + bob, 6, 14, '#f0dcb8', null, { noStroke: true, hl: false });
    A.ellipse(ctx, 7, -30 + bob, 3.2, 5, fur, furS, { lw: 1.8, hl: false, rot: 0.3 });
    // 哨子與綠領巾
    A.shape(ctx, (c) => { c.moveTo(-8, -42 + bob); c.quadraticCurveTo(2, -36 + bob, 10, -42 + bob); c.lineTo(8, -38 + bob); c.quadraticCurveTo(1, -32 + bob, -7, -38 + bob); c.closePath(); }, '#5ab04a', '#3f8a34', { lw: 1.8, hl: false });
    A.shape(ctx, (c) => { c.moveTo(1, -36 + bob); c.lineTo(-2, -29 + bob); c.lineTo(4, -30 + bob); c.closePath(); }, '#5ab04a', null, { lw: 1.6, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, 5, -34 + bob, 7, 4, 1.5), '#ffcf3a', null, { lw: 1.4, hl: false });
    const hx = 4 + look * 1.5;
    const hy = -52 + bob;
    // 搭在額頭上的手（手臂在頭後面，只有手掌蓋在額頭上）
    curve(ctx, [4, -40 + bob], [16, -46 + bob], [hx + 6, hy - 8], fur, 5);
    // 頭
    A.ellipse(ctx, hx - 8, hy - 3, 3, 3, '#4a3426', null, { lw: 1.8, hl: false });
    A.shape(ctx, (c) => { c.moveTo(hx - 10, hy - 2); c.quadraticCurveTo(hx - 10, hy - 11, hx, hy - 10); c.quadraticCurveTo(hx + 9, hy - 9, hx + 15 + look, hy + 1); c.quadraticCurveTo(hx + 12, hy + 6, hx + 2, hy + 7); c.quadraticCurveTo(hx - 10, hy + 7, hx - 10, hy - 2); c.closePath(); }, fur, furS, { cel: [2, 2], hl: [hx - 3, hy - 6, 3, 2] });
    dot(ctx, hx + 14.5 + look, hy + 0.5, 2, '#3a2418');
    A.ellipse(ctx, hx + 1, hy - 2, 4.3, 3.6, '#6a4a34', null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx + 8, hy - 2.5, 3.8, 3.3, '#6a4a34', null, { noStroke: true, hl: false });
    const bl = blinkAt(t, 1.1);
    A.eye(ctx, hx + 1, hy - 2, 2.3, 2.7, bl ? 'closed' : 'normal', look);
    A.eye(ctx, hx + 8, hy - 2.5, 2.1, 2.5, bl ? 'closed' : 'normal', look);
    A.blush(ctx, hx - 2, hy + 3, 2.2);
    A.ellipse(ctx, hx + 6, hy - 8, 6.5, 2.8, fur, furS, { lw: 1.8, hl: false, rot: -0.15 });
  }

  // 小熊貓廚師：高高的廚師帽，手拿湯杓，條紋大尾巴
  function redpanda(ctx, t) {
    const bob = Math.sin(t * 2.3) * 1;
    const fur = '#cf5e2c';
    const furS = '#a54620';
    const dark = '#4a2a22';
    const sw = Math.sin(t * 2) * 0.12;
    ctx.save();
    ctx.translate(-10, -12);
    ctx.rotate(sw);
    const tail = (c) => { c.moveTo(0, -4); c.quadraticCurveTo(-18, -6, -26, -24); c.quadraticCurveTo(-30, -34, -22, -36); c.quadraticCurveTo(-12, -32, -10, -20); c.quadraticCurveTo(-6, -10, 2, 4); c.closePath(); };
    A.shape(ctx, tail, fur, furS, { cel: [2, 2] });
    ctx.save();
    ctx.beginPath();
    tail(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c('#f0a468');
    ctx.lineWidth = 3.5;
    [[-8, -6], [-15, -14], [-20, -23], [-24, -31]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 6);
      ctx.lineTo(x + 8, y - 4);
      ctx.stroke();
    });
    ctx.restore();
    ctx.beginPath();
    tail(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = A.LW;
    ctx.stroke();
    ctx.restore();
    A.ellipse(ctx, -6, -2, 6, 3, dark, null, { lw: 2, hl: false });
    A.ellipse(ctx, 7, -2, 6, 3, dark, null, { lw: 2, hl: false });
    A.ellipse(ctx, 0, -22 + bob, 14, 18, fur, furS, { cel: [3, 3] });
    A.shape(ctx, (c) => { c.moveTo(-6, -32 + bob); c.lineTo(12, -32 + bob); c.quadraticCurveTo(14, -16 + bob, 10, -6 + bob); c.quadraticCurveTo(0, -3 + bob, -6, -8 + bob); c.closePath(); }, '#fffbf2', '#e8e0d0', { cel: [2, 1.5], lw: 2, hl: false });
    // 湯杓
    const lad = Math.sin(t * 3) * 0.15;
    ctx.save();
    ctx.translate(14, -26 + bob);
    ctx.rotate(-0.35 + lad);
    stick(ctx, [[0, 8], [0, -22]], '#c0c8d0', 2.4);
    A.shape(ctx, (c) => { c.moveTo(-6, -22); c.quadraticCurveTo(-6, -30, 0, -30); c.quadraticCurveTo(6, -30, 6, -22); c.closePath(); }, '#d8dee4', '#a8b0b8', { cel: [1, 1], lw: 2, hl: false });
    ctx.restore();
    A.ellipse(ctx, 13, -24 + bob, 4.5, 4.5, dark, null, { lw: 2, hl: false });
    // 頭
    const hx = 5;
    const hy = -48 + bob;
    [[hx - 10, hy - 9], [hx + 9, hy - 10]].forEach(([x, y]) => {
      A.ellipse(ctx, x, y, 5, 5, fur, furS, { lw: 2, hl: false });
      A.ellipse(ctx, x, y, 2.6, 2.6, '#fffbf2', null, { noStroke: true, hl: false });
    });
    A.ellipse(ctx, hx, hy, 14, 12, fur, furS, { cel: [2, 2.5] });
    A.ellipse(ctx, hx + 8, hy + 4, 7.5, 5.5, '#fffbf2', null, { lw: 1.8, hl: false });
    A.ellipse(ctx, hx - 6, hy + 3, 4, 3.5, '#fffbf2', null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx + 1, hy - 6, 2, 1.4, '#fffbf2', null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx + 9, hy - 7, 2, 1.4, '#fffbf2', null, { noStroke: true, hl: false });
    dot(ctx, hx + 14, hy + 2, 2.4, '#2b1a12');
    smile(ctx, hx + 11, hy + 7, 2.4);
    const bl = blinkAt(t, 0.9, 2.5);
    A.eye(ctx, hx + 1.5, hy - 1.5, 2.6, 3.2, bl ? 'closed' : 'normal', 1);
    A.eye(ctx, hx + 9, hy - 2, 2.4, 3, bl ? 'closed' : 'normal', 1);
    // 廚師帽
    A.shape(ctx, (c) => { c.arc(hx - 6, hy - 20, 6, Math.PI * 0.6, Math.PI * 1.5); c.arc(hx, hy - 25, 7, Math.PI * 1.1, Math.PI * 1.9); c.arc(hx + 6, hy - 20, 6, Math.PI * 1.5, Math.PI * 0.4); c.lineTo(hx + 8, hy - 15); c.lineTo(hx - 9, hy - 15); c.closePath(); }, '#fffbf2', '#e8e0d0', { cel: [2, 2], lw: 2.2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, hx - 9, hy - 16, 17, 7, 2), '#fffbf2', '#e8e0d0', { shadeY: hy - 12, lw: 2 });
    steam(ctx, 26, -58 + bob, t, 2, 0.6, 12);
  }

  // 鸚鵡嚮導：金剛鸚鵡，紅身藍黃翅，會用翅膀指路
  function parrot(ctx, t) {
    const bob = Math.sin(t * 2.4) * 1;
    const cyc = t % 5;
    const point = cyc > 3 && cyc < 4.4 ? Math.sin(((cyc - 3) / 1.4) * Math.PI) : 0;
    A.shape(ctx, (c) => { c.moveTo(-6, -18 + bob); c.lineTo(-24, 2); c.lineTo(-18, 4); c.lineTo(0, -14 + bob); c.closePath(); }, '#3a7ad8', '#2a5ab0', { lw: 2.2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(-4, -16 + bob); c.lineTo(-16, 4); c.lineTo(-10, 4); c.lineTo(2, -14 + bob); c.closePath(); }, '#e8403a', '#b82a28', { lw: 2.2, hl: false });
    line(ctx, [[-2, -10], [-2, -2]], '#8a8a92', 3);
    line(ctx, [[6, -10], [6, -2]], '#8a8a92', 3);
    A.ellipse(ctx, 0, -1.5, 4.5, 2, '#8a8a92', null, { lw: 1.6, hl: false });
    A.ellipse(ctx, 8, -1.5, 4.5, 2, '#8a8a92', null, { lw: 1.6, hl: false });
    A.ellipse(ctx, 2, -28 + bob, 13, 19, '#e8403a', '#b82a28', { cel: [3, 3] });
    // 翅膀（指路時往前伸）
    ctx.save();
    ctx.translate(0, -38 + bob);
    ctx.rotate(-point * 1.3);
    const wing = (c) => { c.moveTo(-4, -2); c.quadraticCurveTo(10, 0, 8, 12); c.quadraticCurveTo(2, 26, -12, 30); c.quadraticCurveTo(-12, 14, -4, -2); c.closePath(); };
    A.shape(ctx, wing, '#3a7ad8', '#2a5ab0', { cel: [2, 2], lw: 2.2, hl: false, noStroke: true });
    ctx.save();
    ctx.beginPath();
    wing(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#ffd23a');
    ctx.fillRect(-20, -6, 40, 9);
    ctx.fillStyle = A.c('#5ac05a');
    ctx.fillRect(-20, 3, 40, 5);
    ctx.restore();
    ctx.beginPath();
    wing(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
    // 頭
    const hx = 8;
    const hy = -52 + bob;
    A.shape(ctx, (c) => { c.moveTo(hx - 6, hy - 8); c.lineTo(hx - 12, hy - 16); c.lineTo(hx - 2, hy - 10); c.closePath(); }, '#e8403a', null, { lw: 1.8, hl: false });
    A.ellipse(ctx, hx, hy, 11, 11, '#e8403a', '#b82a28', { cel: [2, 2] });
    A.ellipse(ctx, hx + 4, hy, 5.5, 5, '#fff4ec', null, { noStroke: true, hl: false });
    ctx.strokeStyle = A.c('#3a3030');
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + 1, hy + 1 + i * 1.6);
      ctx.lineTo(hx + 5, hy + 1.6 + i * 1.6);
      ctx.stroke();
    }
    A.shape(ctx, (c) => { c.moveTo(hx + 7, hy + 4); c.quadraticCurveTo(hx + 12, hy + 12, hx + 17, hy + 6); c.quadraticCurveTo(hx + 13, hy + 5, hx + 9, hy + 2); c.closePath(); }, '#3a3030', null, { lw: 1.6, hl: false });
    A.shape(ctx, (c) => { c.moveTo(hx + 7, hy - 4); c.quadraticCurveTo(hx + 18, hy - 6, hx + 19, hy + 5); c.quadraticCurveTo(hx + 17, hy + 10, hx + 15, hy + 7); c.quadraticCurveTo(hx + 14, hy + 3, hx + 8, hy + 4); c.closePath(); }, '#f4ecd8', '#d4c8b0', { shadeY: hy + 3, lw: 2 });
    A.eye(ctx, hx + 3, hy - 1.5, 2.3, 2.8, blinkAt(t, 1, 1.5) ? 'closed' : 'normal', 1);
    // 嚮導的綠領巾與小羅盤
    A.shape(ctx, (c) => { c.moveTo(hx - 10, hy + 8); c.quadraticCurveTo(hx, hy + 14, hx + 8, hy + 9); c.lineTo(hx + 6, hy + 13); c.quadraticCurveTo(hx - 2, hy + 17, hx - 9, hy + 12); c.closePath(); }, '#2e8a6a', '#226a50', { lw: 1.8, hl: false });
    A.ellipse(ctx, hx + 1, hy + 18, 4, 4, '#ffcf3a', '#e0a020', { lw: 1.6, hl: false });
    line(ctx, [[hx + 1, hy + 16], [hx + 2, hy + 18.5]], '#e8403a', 1.2);
  }

  // 山羊採藥人：白色山羊，彎角和山羊鬍，背著裝滿藥草的竹簍
  function goat(ctx, t) {
    const bob = Math.sin(t * 1.8) * 0.8;
    const chew = Math.sin(t * 6) * (t % 4 < 1.5 ? 0.8 : 0);
    const fur = '#f4eee2';
    const furS = '#d4cab6';
    [[-14, '#ddd4c2'], [8, '#ddd4c2'], [-8, fur], [14, fur]].forEach(([x, col]) => {
      A.shape(ctx, (c) => A.roundRect(c, x - 2.8, -20, 5.6, 18, 2.5), col, null, { lw: 2, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, x - 3, -4, 6, 4, 1.5), '#5a4a3e', null, { lw: 1.8, hl: false });
    });
    A.shape(ctx, (c) => { c.moveTo(-20, -30 + bob); c.lineTo(-26, -36 + bob); c.lineTo(-19, -34 + bob); c.closePath(); }, fur, null, { lw: 1.8, hl: false });
    A.ellipse(ctx, -2, -27 + bob, 20, 12, fur, furS, { cel: [3, 3] });
    // 藥草（在簍子後面）
    [[-14, -0.4, '#5ab04a'], [-9, 0.1, '#79c04a'], [-4, 0.5, '#4f9a34']].forEach(([x, r, cc]) => {
      ctx.save();
      ctx.translate(x, -46 + bob);
      ctx.rotate(r + Math.sin(t * 2 + x) * 0.06);
      A.shape(ctx, (c) => { c.moveTo(0, 2); c.quadraticCurveTo(-5, -6, 0, -13); c.quadraticCurveTo(5, -6, 0, 2); c.closePath(); }, cc, null, { lw: 1.6, hl: false });
      ctx.restore();
    });
    A.ellipse(ctx, -10, -58 + bob, 3, 3, '#ff9fc4', null, { lw: 1.4, hl: false });
    dot(ctx, -10, -58 + bob, 1.1, '#ffe14a');
    // 竹簍
    const basket = (c) => { c.moveTo(-20, -46 + bob); c.lineTo(2, -46 + bob); c.lineTo(0, -32 + bob); c.quadraticCurveTo(-9, -29 + bob, -18, -32 + bob); c.closePath(); };
    A.shape(ctx, basket, '#d8a050', '#b07a34', { cel: [2, 2], lw: 2.2, hl: false });
    ctx.save();
    ctx.beginPath();
    basket(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c('#9a6a28');
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-22, -42 + i * 4 + bob);
      ctx.lineTo(4, -42 + i * 4 + bob);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-17 + i * 4.5, -46 + bob);
      ctx.lineTo(-16 + i * 4.2, -30 + bob);
      ctx.stroke();
    }
    ctx.restore();
    A.shape(ctx, (c) => A.roundRect(c, -21, -48 + bob, 24, 4, 2), '#c8903a', null, { lw: 1.8, hl: false });
    line(ctx, [[-2, -46 + bob], [6, -26 + bob]], '#8a5a34', 2.2);
    // 頭與脖子
    const hx = 18;
    const hy = -44 + bob;
    A.shape(ctx, (c) => { c.moveTo(8, -34 + bob); c.lineTo(hx - 3, hy - 2); c.lineTo(hx + 6, hy + 2); c.lineTo(16, -26 + bob); c.closePath(); }, fur, furS, { lw: 2.2, hl: false });
    curve(ctx, [hx - 4, hy - 7], [hx - 8, hy - 20], [hx - 16, hy - 14], '#8a7a6a', 3.2);
    curve(ctx, [hx + 1, hy - 8], [hx - 1, hy - 20], [hx - 8, hy - 18], '#a8988a', 3.2);
    A.ellipse(ctx, hx - 8, hy - 2, 6.5, 2.8, fur, furS, { rot: 0.35, lw: 2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(hx - 7, hy - 4); c.quadraticCurveTo(hx - 4, hy - 12, hx + 4, hy - 9); c.quadraticCurveTo(hx + 14, hy - 4, hx + 14, hy + 4); c.quadraticCurveTo(hx + 12, hy + 9, hx + 5, hy + 8); c.quadraticCurveTo(hx - 6, hy + 6, hx - 7, hy - 4); c.closePath(); }, fur, furS, { cel: [2, 2], hl: [hx - 1, hy - 5, 3, 2] });
    A.shape(ctx, (c) => { c.moveTo(hx + 6, hy + 7); c.lineTo(hx + 7 + chew * 0.5, hy + 15); c.lineTo(hx + 10, hy + 7); c.closePath(); }, fur, furS, { lw: 1.8, hl: false });
    dot(ctx, hx + 12.5, hy + 1.5, 1.2, '#3a2418');
    line(ctx, [[hx + 9, hy + 5 + chew * 0.4], [hx + 13, hy + 4.5]], null, 1.6);
    A.eye(ctx, hx + 3, hy - 2, 2.3, 2.9, blinkAt(t, 0.8, 0.3) ? 'closed' : 'normal', 1);
    A.blush(ctx, hx + 1, hy + 3, 2.4);
  }

  // 犰狳礦工：一節節的殼，黃色安全帽上的頭燈，扛著十字鎬
  function armadillo(ctx, t) {
    const bob = Math.sin(t * 2) * 0.8;
    const shell = '#b8a080';
    const shellS = '#948060';
    const skin = '#e8c0aa';
    const skinS = '#c89a84';
    // 十字鎬（在殼後面）
    ctx.save();
    ctx.translate(-10, -36 + bob);
    ctx.rotate(-0.5);
    stick(ctx, [[0, 10], [0, -18]], '#a87a4a', 2.8);
    A.shape(ctx, (c) => { c.moveTo(-14, -14); c.quadraticCurveTo(0, -24, 14, -14); c.quadraticCurveTo(0, -19, -14, -14); c.closePath(); }, '#b8c0c8', '#8a92a0', { lw: 2, hl: false });
    ctx.restore();
    [-14, 10].forEach((x) => A.shape(ctx, (c) => A.roundRect(c, x - 3.5, -12, 7, 12, 3), '#d8ae98', null, { lw: 2, hl: false }));
    A.shape(ctx, (c) => { c.moveTo(-20, -14); c.quadraticCurveTo(-30, -10, -34, -2); c.quadraticCurveTo(-26, -6, -18, -8); c.closePath(); }, shell, shellS, { lw: 2, hl: false });
    // 殼
    const shellPath = (c) => { c.moveTo(-24, -10); c.bezierCurveTo(-26, -40 + bob, 18, -44 + bob, 20, -10); c.quadraticCurveTo(-2, -6, -24, -10); c.closePath(); };
    A.shape(ctx, shellPath, shell, shellS, { cel: [3, 3], hl: [-8, -30 + bob, 5, 2.5] });
    ctx.save();
    ctx.beginPath();
    shellPath(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c('#7a6448');
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 5; i++) {
      const x = -14 + i * 7.5;
      ctx.beginPath();
      ctx.moveTo(x - 3, -44 + bob);
      ctx.quadraticCurveTo(x + 2, -26, x, -6);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) dot(ctx, -10 + i * 7.5, -30 + k * 10 + bob * 0.5, 1.1, '#d4c0a0');
    ctx.restore();
    [-4, 16].forEach((x) => A.shape(ctx, (c) => A.roundRect(c, x - 3.5, -12, 7, 12, 3), skin, skinS, { shadeY: -4, lw: 2, hl: false }));
    // 頭
    const hx = 22;
    const hy = -24 + bob;
    A.ellipse(ctx, hx - 7, hy - 10, 3.5, 7, skin, skinS, { rot: -0.3, lw: 2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(hx - 9, hy - 4); c.quadraticCurveTo(hx - 6, hy - 10, hx + 2, hy - 8); c.quadraticCurveTo(hx + 10, hy - 4, hx + 16, hy + 3); c.quadraticCurveTo(hx + 16, hy + 7, hx + 12, hy + 7); c.quadraticCurveTo(hx - 2, hy + 10, hx - 9, hy + 4); c.closePath(); }, skin, skinS, { cel: [2, 2] });
    dot(ctx, hx + 15, hy + 4, 1.8, '#5a3a2a');
    A.ellipse(ctx, hx + 1, hy - 7, 3.5, 7, skin, skinS, { rot: 0.25, lw: 2, hl: false });
    A.ellipse(ctx, hx + 1, hy - 7, 1.6, 4.5, '#ffb3c8', null, { rot: 0.25, noStroke: true, hl: false });
    A.eye(ctx, hx + 5, hy - 1, 2.1, 2.6, blinkAt(t, 0.9, 0.7) ? 'closed' : 'normal', 1);
    A.blush(ctx, hx + 3, hy + 4, 2.2);
    // 安全帽與頭燈
    const flick = 0.8 + Math.sin(t * 5) * 0.12;
    ctx.save();
    ctx.globalAlpha = 0.35 * flick;
    const g = ctx.createLinearGradient(hx + 6, 0, hx + 40, 0);
    g.addColorStop(0, 'rgba(255,240,160,1)');
    g.addColorStop(1, 'rgba(255,240,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy - 18);
    ctx.lineTo(hx + 40, hy - 26);
    ctx.lineTo(hx + 40, hy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    A.shape(ctx, (c) => { c.moveTo(hx - 10, hy - 11); c.quadraticCurveTo(hx - 8, hy - 24, hx + 1, hy - 24); c.quadraticCurveTo(hx + 10, hy - 23, hx + 9, hy - 12); c.closePath(); }, '#ffcf3a', '#d8a010', { cel: [1.5, 1.5], lw: 2.2, hl: false });
    A.shape(ctx, (c) => c.ellipse(hx, hy - 11, 12, 2.6, 0, 0, TAU), '#ffcf3a', '#d8a010', { shadeY: hy - 10, lw: 2 });
    A.ellipse(ctx, hx + 8, hy - 18, 3.2, 3.2, '#fff6c0', null, { lw: 1.8, hl: false });
  }

  // ════════ 對手：灰鬃 ════════
  // 跟主角差不多大的灰色小獅子，鬃毛亂翹，缺了一角的耳朵，臉頰一道疤，琥珀色的眼睛總是警戒地瞇著
  const GM = {
    body: '#b4b0aa',
    shade: '#8e8a86',
    mane: '#58545c',
    maneS: '#3c3940',
    cream: '#e0dbd2',
    far: '#9c9892',
    farS: '#7e7a76',
    ear: '#d4a49c',
    nose: '#3a2e2e',
  };
  function jag(i, k) {
    return Math.sin(i * 12.9898 + k * 78.233) * 0.5 + 0.5;
  }
  function gmLeg(ctx, x, fill, shade) {
    A.shape(ctx, (c) => A.roundRect(c, x - 5, -15, 10, 15, 5), fill, shade, { shadeY: -5, lw: 2.5 });
  }
  function amberEye(ctx, x, y, rx, ry, closed) {
    if (closed) return A.eye(ctx, x, y, rx, ry, 'closed');
    ctx.fillStyle = A.c('#2b1a12');
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#f0a020');
    ctx.beginPath();
    ctx.ellipse(x + 0.6, y + 0.3, rx * 0.72, ry * 0.76, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#2b1a12');
    ctx.beginPath();
    ctx.ellipse(x + 0.9, y + 0.3, rx * 0.32, ry * 0.58, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - rx * 0.25, y + ry * 0.05, rx * 0.26, 0, TAU);
    ctx.fill();
    // 半垂的上眼皮：警戒地瞇著
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx + 0.5, ry + 0.5, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = A.c(GM.body);
    ctx.beginPath();
    ctx.moveTo(x - rx - 1, y - ry - 1);
    ctx.lineTo(x + rx + 1, y - ry - 1);
    ctx.lineTo(x + rx + 1, y - ry * 0.2);
    ctx.lineTo(x - rx - 1, y - ry * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    line(ctx, [[x - rx - 0.5, y - ry * 0.45], [x + rx + 0.5, y - ry * 0.2]], null, 2.4);
  }
  function greymane(ctx, t) {
    const bob = Math.sin(t * 3) * 1.2;
    const closed = t % 3.3 < 0.13;
    const earTwitch = t % 4.1 < 0.2 ? -2.5 : 0;
    gmLeg(ctx, -11, GM.far, GM.farS);
    gmLeg(ctx, 9, GM.far, GM.farS);
    // 尾巴：甩來甩去
    const sw = Math.sin(t * 2.6) * 6;
    const tb = -22 + bob;
    const tipX = -34 + sw * 0.5;
    const tipY = -36 + bob - Math.abs(sw) * 0.4;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, tb);
    ctx.quadraticCurveTo(-32 + sw * 0.3, tb - 2, tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = A.c(GM.body);
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.save();
    ctx.translate(tipX - 1, tipY - 3);
    ctx.rotate(0.2 + sw * 0.05);
    A.shape(ctx, (c) => { c.moveTo(-5, 5); c.lineTo(-10, -1); c.lineTo(-5, -3); c.lineTo(-5, -11); c.lineTo(0, -6); c.lineTo(5, -12); c.lineTo(5, -4); c.lineTo(10, 0); c.lineTo(5, 5); c.quadraticCurveTo(0, 8, -5, 5); c.closePath(); }, GM.mane, GM.maneS, { cel: [2, 2], lw: 2.4, hl: false });
    ctx.restore();
    // 身體
    A.ellipse(ctx, -1, -20 + bob, 21, 14, GM.body, GM.shade, { cel: [3, 3] });
    A.ellipse(ctx, 6, -15 + bob, 10, 7, GM.cream, null, { noStroke: true, hl: false });
    [[-14, -32], [-6, -34]].forEach(([x, y]) => A.shape(ctx, (c) => { c.moveTo(x - 3, y + 3 + bob); c.lineTo(x - 1, y - 3 + bob); c.lineTo(x + 3, y + 3 + bob); c.closePath(); }, GM.body, null, { lw: 2, hl: false }));
    gmLeg(ctx, -7, GM.body, GM.shade);
    gmLeg(ctx, 13, GM.body, GM.shade);
    const hx = 9;
    const hy = -45 + bob;
    // 刺刺的深灰鬃毛（每根長短不一）
    const mx = hx - 4;
    const my = hy - 1;
    A.shape(ctx, (c) => {
      const n = 15;
      for (let i = 0; i <= n * 2; i++) {
        const k = Math.floor(i / 2) % n;
        const a = 0.2 + (i / (n * 2)) * TAU + (i % 2 ? 0 : (jag(k, 2) - 0.5) * 0.18);
        const r = i % 2 ? 20 : 25 + jag(k, 1) * 5;
        i ? c.lineTo(mx + Math.cos(a) * r, my + Math.sin(a) * r) : c.moveTo(mx + Math.cos(a) * r, my + Math.sin(a) * r);
      }
      c.closePath();
    }, GM.mane, GM.maneS, { cel: [4, 4] });
    // 耳朵：遠側完整，近側缺一角
    A.ellipse(ctx, hx - 10, hy - 20 + earTwitch, 6.5, 6.5, GM.far, GM.farS, { lw: 2.5, hl: false });
    A.ellipse(ctx, hx - 10, hy - 20 + earTwitch, 3, 3, GM.ear, null, { noStroke: true, hl: false });
    const ex = hx + 8;
    const ey = hy - 21;
    const torn = (c) => {
      c.moveTo(ex + Math.cos(-0.25 * Math.PI) * 6.5, ey + Math.sin(-0.25 * Math.PI) * 6.5);
      c.arc(ex, ey, 6.5, -0.25 * Math.PI, -0.62 * Math.PI + TAU);
      c.lineTo(ex, ey - 2);
      c.lineTo(ex + 2, ey - 6.5);
      c.closePath();
    };
    A.shape(ctx, torn, GM.body, GM.shade, { lw: 2.5, hl: false });
    A.ellipse(ctx, ex - 0.5, ey + 1, 2.6, 2.6, GM.ear, null, { noStroke: true, hl: false });
    // 頭
    A.ellipse(ctx, hx, hy, 19, 17.5, GM.body, GM.shade, { cel: [3, 3.5] });
    // 額前亂翹的瀏海
    A.shape(ctx, (c) => { c.moveTo(hx - 10, hy - 14); c.lineTo(hx - 8, hy - 25); c.lineTo(hx - 3, hy - 17); c.lineTo(hx + 1, hy - 28); c.lineTo(hx + 4, hy - 17); c.lineTo(hx + 10, hy - 22); c.lineTo(hx + 8, hy - 13); c.quadraticCurveTo(hx, hy - 10, hx - 10, hy - 14); c.closePath(); }, GM.mane, GM.maneS, { cel: [1.5, 1.5], lw: 2.2, hl: false });
    // 臉頰的疤
    ctx.strokeStyle = A.c('#8a5a58');
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 9, hy - 1);
    ctx.lineTo(hx - 3, hy + 7);
    ctx.moveTo(hx - 8, hy + 3.5);
    ctx.lineTo(hx - 5, hy + 1.5);
    ctx.moveTo(hx - 6.5, hy + 6);
    ctx.lineTo(hx - 3.5, hy + 4);
    ctx.stroke();
    // 嘴邊
    A.ellipse(ctx, hx + 11, hy + 7, 9, 6.5, GM.cream, null, { lw: 2, hl: false });
    ctx.fillStyle = A.c(GM.nose);
    ctx.beginPath();
    ctx.moveTo(hx + 12.8, hy + 1.6);
    ctx.quadraticCurveTo(hx + 16, hy + 0.2, hx + 19.2, hy + 1.6);
    ctx.quadraticCurveTo(hx + 17.6, hy + 5, hx + 16, hy + 5);
    ctx.quadraticCurveTo(hx + 14.4, hy + 5, hx + 12.8, hy + 1.6);
    ctx.fill();
    // 不服氣地撇著嘴，露出一顆小尖牙
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + 16, hy + 5);
    ctx.lineTo(hx + 16, hy + 7.5);
    ctx.moveTo(hx + 11.5, hy + 9.5);
    ctx.quadraticCurveTo(hx + 15, hy + 7.2, hx + 19.5, hy + 8.4);
    ctx.stroke();
    A.shape(ctx, (c) => { c.moveTo(hx + 17, hy + 8.2); c.lineTo(hx + 18, hy + 11); c.lineTo(hx + 19, hy + 8.4); c.closePath(); }, '#ffffff', null, { lw: 1.2, hl: false });
    // 眼睛與倒八字眉
    amberEye(ctx, hx + 2, hy - 3, 3.9, 5.2, closed);
    amberEye(ctx, hx + 12, hy - 4, 3.6, 5, closed);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy - 12);
    ctx.lineTo(hx + 5, hy - 9);
    ctx.moveTo(hx + 9.5, hy - 9.5);
    ctx.lineTo(hx + 16, hy - 12.5);
    ctx.stroke();
    // 灰撲撲的小髒污
    ctx.fillStyle = A.c('rgba(90,80,80,0.25)');
    ctx.beginPath();
    ctx.ellipse(hx + 3, hy + 9, 3, 1.6, 0.3, 0, TAU);
    ctx.fill();
  }

  Object.assign(A.NPC_DRAW, {
    otter, seal, gullmerchant, pufferkid, starfish, octopus, pelican,
    capybara, oldmonkey, meerkat, redpanda, parrot, goat, armadillo,
    greymane,
  });


  // ════════ 圖示 ════════
  // 跟 items.js 一樣：以 (0,0) 為中心，大約 ±14 的範圍，放大 1.3 倍畫在深色格子上
  function bumpRing(c, x, y, r, n, bulge) {
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (!i) c.moveTo(px, py);
      else {
        const am = ((i - 0.5) / n) * TAU;
        c.quadraticCurveTo(x + Math.cos(am) * (r + bulge), y + Math.sin(am) * (r + bulge), px, py);
      }
    }
    c.closePath();
  }
  // 小獅子頭（技能圖示用）
  function lionHead(ctx, x, y, s, fill, shade, mane, maneS) {
    A.shape(ctx, (c) => bumpRing(c, x, y, 8 * s, 10, 3.5 * s), mane || '#d9722a', maneS || '#b95a1e', { cel: [1.5, 1.5], lw: 2 });
    A.ellipse(ctx, x, y, 6.5 * s, 6 * s, fill || '#f7b547', shade || '#e0913a', { lw: 2, hl: false });
  }
  // 羽刃：跟 featherThrow 同一個形狀
  function blade(ctx, x, y, len, w, fill, shade, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => { c.moveTo(len, 0); c.quadraticCurveTo(0, -w, -len, -w * 0.15); c.quadraticCurveTo(0, w * 0.85, len, 0); c.closePath(); }, fill, shade, { lw: 2, hl: false });
    ctx.restore();
  }
  function boltPath(c, x, y, s) {
    c.moveTo(x + 2 * s, y - 12 * s);
    c.lineTo(x - 6 * s, y + 1 * s);
    c.lineTo(x - 0.5 * s, y + 1 * s);
    c.lineTo(x - 3 * s, y + 12 * s);
    c.lineTo(x + 6 * s, y - 2 * s);
    c.lineTo(x + 0.5 * s, y - 2 * s);
    c.closePath();
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
  function sparkle(ctx, x, y, r, col) {
    A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.35, 4, 0), col || '#ffffff', null, { noStroke: true, hl: false });
  }
  function heartPath(c, x, y, s) {
    c.moveTo(x, y + 11 * s);
    c.bezierCurveTo(x - 14 * s, y + 1 * s, x - 11 * s, y - 11 * s, x, y - 5 * s);
    c.bezierCurveTo(x + 11 * s, y - 11 * s, x + 14 * s, y + 1 * s, x, y + 11 * s);
    c.closePath();
  }
  function eyePath(c, x, y, w, h) {
    c.moveTo(x - w, y);
    c.quadraticCurveTo(x, y - h * 2, x + w, y);
    c.quadraticCurveTo(x, y + h * 2, x - w, y);
    c.closePath();
  }

  const ICON2 = {
    // ─── 力量系 ───
    chargeSlam(ctx) {
      speedLines(ctx, [[-16, -7, -9, -7], [-18, 0, -8, 0], [-16, 7, -9, 7]]);
      A.shape(ctx, (c) => starPath(c, 10, 0, 9, 4, 7, 0.2), '#ffe066', '#ffb62e', { lw: 2, hl: false });
      lionHead(ctx, 0, 0, 1);
      A.eye(ctx, 2, -1.5, 1.4, 1.8, 'angry', 1);
      dot(ctx, 5.5, 1.5, 1.4, '#5a2f22');
    },
    lionRoar(ctx) {
      ctx.strokeStyle = A.c('#ffe9a8');
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      [11, 15].forEach((r) => {
        ctx.beginPath();
        ctx.arc(0, 1, r, -0.55, 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 1, r, Math.PI - 0.55, Math.PI + 0.55);
        ctx.stroke();
      });
      A.shape(ctx, (c) => bumpRing(c, 0, 0, 9, 12, 3.5), '#d9722a', '#b95a1e', { cel: [1.5, 1.5], lw: 2 });
      A.ellipse(ctx, 0, 0, 7.5, 7, '#f7b547', '#e0913a', { lw: 2, hl: false });
      A.eye(ctx, -3, -2.5, 1.3, 1.6, 'normal');
      A.eye(ctx, 3, -2.5, 1.3, 1.6, 'normal');
      line(ctx, [[-5, -6], [-1.5, -4.5]], null, 1.8);
      line(ctx, [[5, -6], [1.5, -4.5]], null, 1.8);
      A.shape(ctx, (c) => c.ellipse(0, 3, 3.6, 3.4, 0, 0, TAU), '#7a2323', null, { lw: 1.6, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-2.6, 0.8); c.lineTo(-1.6, 3); c.lineTo(-0.8, 0.4); c.closePath(); c.moveTo(2.6, 0.8); c.lineTo(1.6, 3); c.lineTo(0.8, 0.4); c.closePath(); }, '#ffffff', null, { noStroke: true, hl: false });
    },
    steelMane(ctx) {
      [-2.5, -1.9, -1.25, -0.6, 0].forEach((a) => {
        const tx = Math.cos(a - 0.1) * 15;
        const ty = Math.sin(a - 0.1) * 15 - 1;
        const bx = Math.cos(a) * 4;
        const by = Math.sin(a) * 4 + 2;
        const nx = -Math.sin(a) * 4;
        const ny = Math.cos(a) * 4;
        A.shape(ctx, (c) => { c.moveTo(bx - nx, by - ny); c.quadraticCurveTo((bx + tx) / 2 - nx * 1.2, (by + ty) / 2 - ny * 1.2, tx, ty); c.quadraticCurveTo((bx + tx) / 2 + nx, (by + ty) / 2 + ny, bx + nx, by + ny); c.closePath(); }, '#c8d4e4', '#8a98b0', { cel: [1.2, 1.2], lw: 2, hl: false });
        line(ctx, [[bx + (tx - bx) * 0.3, by + (ty - by) * 0.3], [bx + (tx - bx) * 0.7, by + (ty - by) * 0.7]], 'rgba(255,255,255,0.9)', 1.3);
      });
      A.ellipse(ctx, 0, 5, 7, 6.5, '#f7b547', '#e0913a', { lw: 2, hl: false });
      A.eye(ctx, 2, 4, 1.3, 1.7, 'angry', 1);
      sparkle(ctx, 11, -10, 3.5);
    },
    quakeStrike(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-15, 7); c.lineTo(15, 7); c.lineTo(13, 14); c.lineTo(-13, 14); c.closePath(); }, '#9a7b5a', '#6e5236', { shadeY: 11, lw: 2 });
      line(ctx, [[0, 7], [-3, 10], [1, 12], [-1, 14]], null, 1.8);
      line(ctx, [[-8, 7], [-11, 11]], null, 1.6);
      line(ctx, [[8, 7], [10, 10], [9, 13]], null, 1.6);
      [[-13, 1, 2.5], [13, 0, 2.2], [-10, -5, 1.6], [11, -6, 1.5]].forEach(([x, y, r]) => A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.7, 3, 0.3), '#c8aa80', null, { lw: 1.4, hl: false }));
      // 肉球朝下拍在地上
      A.ellipse(ctx, 0, -3, 9.5, 9, '#f7b547', '#e0913a', { cel: [1.5, 1.5], lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-5, 3); c.quadraticCurveTo(-5, -3, 0, -3); c.quadraticCurveTo(5, -3, 5, 3); c.quadraticCurveTo(0, 5, -5, 3); c.closePath(); }, '#ff9fb0', null, { lw: 1.4, hl: false });
      [[-5.5, -7], [0, -9.5], [5.5, -7]].forEach(([x, y]) => A.ellipse(ctx, x, y, 2.2, 2.5, '#ff9fb0', null, { lw: 1.3, hl: false }));
      speedLines(ctx, [[-7, -17, -6, -14], [7, -17, 6, -14]], '#ffffff', 2);
    },
    kingAura(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      g.addColorStop(0, 'rgba(255,230,120,0.8)');
      g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => starPath(c, 0, 1, 16, 9, 8, -Math.PI / 2), 'rgba(255,236,150,0.55)', null, { noStroke: true, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-11, 8); c.lineTo(-12, -5); c.lineTo(-6, 0); c.lineTo(0, -9); c.lineTo(6, 0); c.lineTo(12, -5); c.lineTo(11, 8); c.closePath(); }, '#ffcf3a', '#e0a020', { cel: [1.5, 1.5], lw: 2 });
      A.shape(ctx, (c) => A.roundRect(c, -11, 5, 22, 5, 2), '#e0a020', null, { lw: 1.8, hl: false });
      A.ellipse(ctx, 0, 1.5, 2.4, 2.4, '#e8433a', null, { lw: 1.4, hl: false });
      [-12, 0, 12].forEach((x, i) => A.ellipse(ctx, x, i === 1 ? -9 : -5, 1.8, 1.8, '#fff6c0', null, { lw: 1.2, hl: false }));
    },
    unyielding(ctx) {
      const g = ctx.createRadialGradient(0, 2, 2, 0, 2, 16);
      g.addColorStop(0, 'rgba(255,150,90,0.6)');
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 2, 16, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-6, -4); c.quadraticCurveTo(-8, -12, -3, -16); c.quadraticCurveTo(-2, -10, 0, -9); c.quadraticCurveTo(1, -14, 5, -17); c.quadraticCurveTo(8, -10, 6, -4); c.closePath(); }, '#ffb84a', '#f28c38', { lw: 1.8, hl: false });
      A.shape(ctx, (c) => heartPath(c, 0, 1, 1), '#e8433a', '#b8302a', { cel: [2, 2], lw: 2, hl: [-5, -3, 2.5, 1.8] });
      A.shape(ctx, (c) => A.roundRect(c, -10, 1, 20, 4, 1.5), '#b8c6d8', '#7e8ca2', { shadeY: 3.5, lw: 1.6, hl: false });
      [-6, 0, 6].forEach((x) => dot(ctx, x, 3, 0.9, '#5a6478'));
    },
    mountainQuake(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-15, 8); c.lineTo(-4, -12); c.lineTo(1, -4); c.lineTo(5, -9); c.lineTo(15, 8); c.closePath(); }, '#9a8a7a', '#6e5e50', { cel: [2, 1], lw: 2 });
      A.shape(ctx, (c) => { c.moveTo(-7.5, -6); c.lineTo(-4, -12); c.lineTo(-0.5, -6); c.lineTo(-2.5, -4.5); c.lineTo(-4.5, -6.5); c.closePath(); }, '#ffffff', null, { lw: 1.6, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-16, 8); c.lineTo(16, 8); c.lineTo(14, 14); c.lineTo(-14, 14); c.closePath(); }, '#6e5236', null, { lw: 2, hl: false });
      ctx.save();
      ctx.lineJoin = 'round';
      line(ctx, [[-9, 14], [-5, 8], [-1, 11], [3, 6], [7, 10]], '#ff9a3a', 2.6);
      line(ctx, [[-9, 14], [-5, 8], [-1, 11], [3, 6], [7, 10]], '#fff0a0', 1);
      ctx.restore();
      speedLines(ctx, [[-17, -4, -17, 2], [-14, -9, -14, -5], [17, -2, 17, 4], [14, -7, 14, -3]], '#ffe9a8', 2);
    },
    lionSoul(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      g.addColorStop(0, 'rgba(255,220,120,0.8)');
      g.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-10, 10); c.quadraticCurveTo(-16, 0, -10, -8); c.quadraticCurveTo(-8, -3, -6, -4); c.quadraticCurveTo(-7, -12, 0, -17); c.quadraticCurveTo(0, -9, 4, -8); c.quadraticCurveTo(6, -13, 11, -13); c.quadraticCurveTo(8, -6, 12, -2); c.quadraticCurveTo(16, 6, 10, 10); c.quadraticCurveTo(0, 15, -10, 10); c.closePath(); }, '#ffb84a', '#f28c38', { cel: [2, 2], lw: 2, hl: false });
      A.ellipse(ctx, 0, 3, 7, 6.5, '#fff4c8', '#ffe28a', { lw: 2, hl: false });
      A.eye(ctx, -2.5, 2, 1.3, 1.7, 'normal');
      A.eye(ctx, 2.5, 2, 1.3, 1.7, 'normal');
      dot(ctx, 0, 5.5, 1.3, '#5a2f22');
      A.shape(ctx, (c) => A.mapleLeafPath(c, 0, -4, 3.5), '#e8452b', null, { lw: 1.2, hl: false });
    },
    hundredBattles(ctx) {
      // 月桂葉環 + 勳章
      [-1, 1].forEach((s) => {
        for (let i = 0; i < 4; i++) {
          const a = Math.PI / 2 + s * (0.45 + i * 0.5);
          const x = Math.cos(a) * 11;
          const y = Math.sin(a) * 11 + 1;
          A.ellipse(ctx, x, y, 4, 2, '#6fbf4a', '#4f9a34', { rot: a + (s > 0 ? -1.2 : 1.2), lw: 1.4, hl: false });
        }
      });
      A.shape(ctx, (c) => { c.moveTo(-4, -2); c.lineTo(-6, -14); c.lineTo(-1, -11); c.lineTo(0, -2); c.closePath(); c.moveTo(4, -2); c.lineTo(6, -14); c.lineTo(1, -11); c.lineTo(0, -2); c.closePath(); }, '#e8433a', '#b8302a', { lw: 1.6, hl: false });
      A.ellipse(ctx, 0, 2, 7.5, 7.5, '#ffcf3a', '#e0a020', { cel: [1.5, 1.5], lw: 2 });
      ctx.save();
      A.shape(ctx, (c) => starPath(c, 0, 2.5, 4.5, 2, 5, -Math.PI / 2), '#fff4c0', null, { lw: 1.2, hl: false });
      ctx.restore();
    },

    // ─── 魔法系 ───
    starRain(ctx) {
      [[-7, -8, 5], [7, -2, 4], [-2, 8, 4.5]].forEach(([x, y, r]) => {
        ctx.strokeStyle = 'rgba(143,240,232,0.7)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 3, y - 3);
        ctx.lineTo(x - 10, y - 10);
        ctx.stroke();
        A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.45, 5, -Math.PI / 2 + 0.3), '#ffe066', '#e8b020', { cel: [1, 1], lw: 1.8, hl: false });
      });
    },
    blink(ctx) {
      ctx.save();
      ctx.setLineDash([2.5, 2.5]);
      ctx.strokeStyle = A.c('#8ff0e8');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-8, 3, 6, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3, -1);
      ctx.quadraticCurveTo(0, -12, 6, -6);
      ctx.stroke();
      ctx.restore();
      const g = ctx.createRadialGradient(7, 3, 1, 7, 3, 12);
      g.addColorStop(0, 'rgba(200,255,250,0.9)');
      g.addColorStop(1, 'rgba(95,208,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(7, 3, 12, 0, TAU);
      ctx.fill();
      A.ellipse(ctx, 7, 3, 6, 6, '#8ff0e8', '#5fd0c8', { lw: 2 });
      sparkle(ctx, 13, -7, 3.5);
      sparkle(ctx, -13, -8, 2.5, '#c9f0ff');
    },
    manaSpring(ctx) {
      A.shape(ctx, (c) => c.ellipse(0, 9, 14, 5, 0, 0, TAU), '#6ab0ff', '#3a80d8', { shadeY: 10, lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-4, 9); c.quadraticCurveTo(-5, -4, 0, -13); c.quadraticCurveTo(5, -4, 4, 9); c.closePath(); }, '#8fd8ff', '#5ab0e8', { cel: [1.5, 1.5], lw: 2, hl: false });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      [-1, 1].forEach((s) => {
        A.shape(ctx, (c) => { c.moveTo(s * 1, -8); c.quadraticCurveTo(s * 12, -12, s * 12, 2); c.quadraticCurveTo(s * 9, -6, s * 1, -4); c.closePath(); }, '#8fd8ff', null, { lw: 1.8, hl: false });
      });
      [[-9, 4], [10, 5], [0, 12]].forEach(([x, y]) => A.ellipse(ctx, x, y, 1.6, 1.6, '#e8fffc', null, { noStroke: true, hl: false }));
      A.ellipse(ctx, -1, -3, 1.2, 3, '#e8fffc', null, { noStroke: true, hl: false });
    },
    meteor(ctx) {
      // 火焰尾巴
      const tail = (c, w) => { c.moveTo(-16, -16); c.quadraticCurveTo(-4, -4 - w * 0.6, 7 - w * 0.4, -3 - w); c.arc(4, 4, w, -Math.PI * 0.15, Math.PI * 0.85); c.quadraticCurveTo(-4 - w * 0.6, -4, -16, -16); c.closePath(); };
      ctx.save();
      const g1 = ctx.createLinearGradient(-16, -16, 4, 4);
      g1.addColorStop(0, 'rgba(255,140,60,0)');
      g1.addColorStop(1, 'rgba(255,140,60,0.95)');
      ctx.fillStyle = g1;
      ctx.beginPath();
      tail(ctx, 10);
      ctx.fill();
      const g2 = ctx.createLinearGradient(-12, -12, 4, 4);
      g2.addColorStop(0, 'rgba(255,240,160,0)');
      g2.addColorStop(1, 'rgba(255,240,160,1)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      tail(ctx, 6);
      ctx.fill();
      ctx.restore();
      A.ellipse(ctx, 5, 5, 8, 8, '#ffb84a', '#e8702a', { cel: [2, 2], lw: 2, hl: [2, 1, 2.5, 1.8] });
      A.ellipse(ctx, 8, 6, 2, 1.6, '#e8702a', null, { noStroke: true, hl: false });
      A.ellipse(ctx, 4, 9, 1.5, 1.2, '#e8702a', null, { noStroke: true, hl: false });
      sparkle(ctx, 13, -8, 3, '#fff0a0');
    },
    halo(ctx) {
      const g = ctx.createRadialGradient(0, 2, 2, 0, 2, 17);
      g.addColorStop(0, 'rgba(255,245,190,0.7)');
      g.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 2, 17, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, -1, 13, 6, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffe066');
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(0, -1, 13, 6, 0, Math.PI * 1.1, Math.PI * 1.5);
      ctx.stroke();
      [[-8, 9, 2], [0, 12, 2.5], [8, 9, 2]].forEach(([x, y, r]) => sparkle(ctx, x, y, r * 1.5, '#fff6c0'));
    },
    resonance(ctx) {
      ['#c9a7ff', '#8ff0e8', '#c9a7ff'].forEach((col, i) => {
        const r = 6 + i * 4.5;
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, -0.9 + i * 0.4, 0.9 + i * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI - 0.9 + i * 0.4, Math.PI + 0.9 + i * 0.4);
        ctx.stroke();
        ctx.strokeStyle = A.c(col);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, -0.9 + i * 0.4, 0.9 + i * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI - 0.9 + i * 0.4, Math.PI + 0.9 + i * 0.4);
        ctx.stroke();
      });
      A.ellipse(ctx, 0, 0, 4, 4, '#e8d4ff', '#b090e8', { lw: 1.8, hl: false });
    },
    auroraVeil(ctx) {
      ['#7ae0c0', '#6ac8f0', '#a890f0', '#f08ad0'].forEach((col, i) => {
        const x0 = -10 + i * 6.5;
        A.shape(ctx, (c) => {
          c.moveTo(x0 - 2.5, -13 + i);
          c.bezierCurveTo(x0 + 4, -6, x0 - 5, 2, x0 - 1, 13);
          c.lineTo(x0 + 3.5, 13);
          c.bezierCurveTo(x0 - 1, 2, x0 + 8, -6, x0 + 2.5, -13 + i);
          c.closePath();
        }, col, null, { lw: 1.6, hl: false });
      });
      sparkle(ctx, 11, -11, 3);
      sparkle(ctx, -12, 9, 2.4);
    },
    healLight(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 17);
      g.addColorStop(0, 'rgba(210,255,200,0.8)');
      g.addColorStop(1, 'rgba(150,240,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-3.5, -11); c.lineTo(3.5, -11); c.lineTo(3.5, -3.5); c.lineTo(11, -3.5); c.lineTo(11, 3.5); c.lineTo(3.5, 3.5); c.lineTo(3.5, 11); c.lineTo(-3.5, 11); c.lineTo(-3.5, 3.5); c.lineTo(-11, 3.5); c.lineTo(-11, -3.5); c.lineTo(-3.5, -3.5); c.closePath(); }, '#8fe88a', '#5ac05a', { cel: [1.5, 1.5], lw: 2, hl: [-1, -7, 1.3, 2.5] });
      sparkle(ctx, 11, -11, 3);
      sparkle(ctx, -11, 10, 2.4);
    },
    omniscience(ctx) {
      ctx.strokeStyle = A.c('#e8d4ff');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + Math.PI / 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 14);
        ctx.stroke();
      }
      A.shape(ctx, (c) => eyePath(c, 0, 0, 14, 5.5), '#fffaf0', '#e8e0d0', { shadeY: 3, lw: 2, hl: false });
      ctx.save();
      ctx.beginPath();
      eyePath(ctx, 0, 0, 14, 5.5);
      ctx.clip();
      A.ellipse(ctx, 0, 0, 6, 6, '#9a70d8', '#6a48b0', { lw: 1.6, hl: false });
      A.shape(ctx, (c) => starPath(c, 0, 0, 3.4, 1.4, 4, 0), '#2b1a30', null, { noStroke: true, hl: false });
      dot(ctx, -2, -2, 1.3, '#ffffff');
      ctx.restore();
      A.shape(ctx, (c) => eyePath(c, 0, 0, 14, 5.5), 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
    },

    // ─── 敏捷系（全部都是投擲的羽刃）───
    doubleClaw(ctx) {
      speedLines(ctx, [[-17, -9, -12, -9], [-17, 0, -12, 0], [-17, 9, -12, 9]], '#ffffff', 2);
      blade(ctx, -3, -8, 8, 6.5, '#d8ff9a', '#a8d04a', -0.12);
      blade(ctx, 4, 0, 8.5, 7, '#d8ff9a', '#a8d04a', 0);
      blade(ctx, 9, 8, 7.5, 6, '#d8ff9a', '#a8d04a', 0.12);
    },
    shadowStep(ctx) {
      ctx.save();
      const g = ctx.createLinearGradient(-17, 0, 6, 0);
      g.addColorStop(0, 'rgba(140,90,210,0)');
      g.addColorStop(1, 'rgba(140,90,210,0.8)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-17, -4);
      ctx.lineTo(4, -2.5);
      ctx.lineTo(4, 2.5);
      ctx.lineTo(-17, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.rotate(-0.12);
      A.shape(ctx, (c) => { c.moveTo(17, 0); c.quadraticCurveTo(4, -7, -13, -3.5); c.lineTo(-9, 0); c.lineTo(-13, 3.5); c.quadraticCurveTo(4, 6, 17, 0); c.closePath(); }, '#7a5ab8', '#4a2e72', { shadeY: 0.5, lw: 2, hl: false });
      line(ctx, [[-4, -1.2], [11, -0.5]], 'rgba(230,210,255,0.9)', 1.2);
      ctx.restore();
      // 被貫穿的影子漣漪
      ctx.strokeStyle = A.c('#b89aff');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(1, -0.2, 2.5, 8, 0, 0, TAU);
      ctx.stroke();
      sparkle(ctx, 16, -6, 3, '#e8d4ff');
    },
    boomerang(ctx) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(216,255,154,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 1, 14, 9, 0, Math.PI * 0.15, Math.PI * 1.35);
      ctx.stroke();
      ctx.restore();
      A.shape(ctx, (c) => { c.moveTo(12, -10); c.quadraticCurveTo(-4, -12, -10, 2); c.quadraticCurveTo(-8, 5, -6, 3); c.quadraticCurveTo(-2, -5, 10, -6); c.closePath(); }, '#d8ff9a', '#a8d04a', { cel: [1.2, 1.2], lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-10, 2); c.quadraticCurveTo(-4, 12, 10, 12); c.quadraticCurveTo(10, 9, 8, 8); c.quadraticCurveTo(-2, 8, -6, 3); c.closePath(); }, '#a8d04a', '#78a030', { cel: [1.2, 1.2], lw: 2, hl: false });
      A.ellipse(ctx, -8, 2.5, 2, 2, '#f2c24a', null, { lw: 1.4, hl: false });
    },
    afterimage(ctx) {
      [[-9, 0.3], [-3, 0.6], [4, 1]].forEach(([x, a]) => {
        ctx.globalAlpha = a;
        A.ellipse(ctx, x - 4, -7, 2.8, 2.8, '#d9722a', null, { lw: 1.6, hl: false });
        A.ellipse(ctx, x + 4, -7, 2.8, 2.8, '#d9722a', null, { lw: 1.6, hl: false });
        A.ellipse(ctx, x, 0, 8, 7.5, a < 1 ? '#a8d04a' : '#f7b547', a < 1 ? '#78a030' : '#e0913a', { lw: 2, hl: false });
      });
      ctx.globalAlpha = 1;
      A.eye(ctx, 6, -1, 1.4, 1.8, 'normal', 1);
      A.eye(ctx, 10, -1.5, 1.3, 1.7, 'normal', 1);
      speedLines(ctx, [[-17, 9, -8, 9]], '#ffffff', 2);
    },
    thunderCombo(ctx) {
      // 鋸齒狀的電鏈串著三個火花，末端是一把雷刃
      ctx.lineJoin = 'round';
      const pts = [[-15, 9], [-11, 2], [-7, 7], [-3, -1], [1, 4], [4, -2]];
      line(ctx, pts, null, 4.5);
      line(ctx, pts, '#ffe14a', 2);
      [[-15, 9], [-7, 7], [1, 4]].forEach(([x, y]) => A.shape(ctx, (c) => starPath(c, x, y, 3.2, 1.3, 4, 0.4), '#fff8c0', null, { lw: 1.2, hl: false }));
      ctx.save();
      ctx.translate(8, -6);
      ctx.rotate(-0.55);
      ctx.scale(1.3, 1.3);
      A.shape(ctx, (c) => { c.moveTo(10, 0); c.lineTo(2, -4.5); c.lineTo(3, -1.2); c.lineTo(-8, -3.5); c.lineTo(-4, 0); c.lineTo(-8, 3.5); c.lineTo(3, 1.2); c.lineTo(2, 4.5); c.closePath(); }, '#ffe14a', '#e8b020', { shadeY: 0.5, lw: 1.6, hl: false });
      ctx.restore();
    },
    shadowClone(ctx) {
      const head = (x, y, fill, shade, mane, maneS) => {
        A.ellipse(ctx, x - 5, y - 7, 3, 3, mane, null, { lw: 1.6, hl: false });
        A.ellipse(ctx, x + 5, y - 7, 3, 3, mane, null, { lw: 1.6, hl: false });
        A.shape(ctx, (c) => bumpRing(c, x, y, 7.5, 10, 3), mane, maneS, { cel: [1.2, 1.2], lw: 1.8 });
        A.ellipse(ctx, x, y, 6, 5.5, fill, shade, { lw: 1.8, hl: false });
      };
      ctx.globalAlpha = 0.85;
      head(-5, -3, '#6a4a9a', '#4a2e72', '#4a2e72', '#321e52');
      ctx.globalAlpha = 1;
      dot(ctx, -6, -4, 1.4, '#e8d4ff');
      dot(ctx, -2, -4, 1.4, '#e8d4ff');
      head(5, 4, '#f7b547', '#e0913a', '#d9722a', '#b95a1e');
      A.eye(ctx, 4.5, 3, 1.3, 1.7, 'normal', 1);
      A.eye(ctx, 8.5, 3, 1.3, 1.7, 'normal', 1);
    },
    lethal(ctx) {
      A.shape(ctx, (c) => starPath(c, 5, 5, 11, 4, 6, 0.1), '#ff6a5a', '#d8403a', { lw: 1.8, hl: false });
      A.shape(ctx, (c) => starPath(c, 5, 5, 6, 2.5, 6, 0.35), '#ffe0a0', null, { noStroke: true, hl: false });
      ctx.save();
      ctx.translate(-2, -2);
      ctx.rotate(0.75);
      A.shape(ctx, (c) => { c.moveTo(13, 0); c.quadraticCurveTo(2, -5, -11, -2); c.lineTo(-8, 0); c.lineTo(-11, 2); c.quadraticCurveTo(2, 5, 13, 0); c.closePath(); }, '#f4f8ff', '#b8c6d8', { shadeY: 0.5, lw: 2, hl: false });
      ctx.restore();
      speedLines(ctx, [[-15, -9, -10, -4], [-10, -15, -5, -10]], '#ffffff', 2);
    },
    thousandBolts(ctx) {
      [[-8, -10, 5], [0, -12, 6], [8, -10, 5]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r * 0.8, '#6a6a88', '#4a4a66', { lw: 2, hl: false }));
      [[-9, 3, 0.55], [1, 4, 0.7], [10, 3, 0.55]].forEach(([x, y, s]) => A.shape(ctx, (c) => boltPath(c, x, y, s), '#ffe14a', '#e8b020', { shadeY: y + 2, lw: 1.8, hl: false }));
    },
    stormRush(ctx) {
      ctx.lineCap = 'round';
      [[13, '#8ff0e8', 0], [9, '#d8ff9a', 1.6]].forEach(([r, col, a0]) => {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, a0 + Math.PI * 1.25);
        ctx.stroke();
        ctx.strokeStyle = A.c(col);
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });
      A.shape(ctx, (c) => boltPath(c, 0, 0, 0.75), '#ffe14a', '#e8b020', { shadeY: 2, lw: 2, hl: false });
    },
    hunterInstinct(ctx) {
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(dx * 12, dy * 12);
        ctx.lineTo(dx * 16, dy * 16);
        ctx.stroke();
      });
      A.shape(ctx, (c) => eyePath(c, 0, 0, 12, 5), '#e8f070', '#c0c840', { shadeY: 2.5, lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(0, -8); c.quadraticCurveTo(3, 0, 0, 8); c.quadraticCurveTo(-3, 0, 0, -8); c.closePath(); }, '#2b1a12', null, { noStroke: true, hl: false });
      dot(ctx, -4, -2, 1.3, '#ffffff');
    },

    // ─── 第二章材料 ───
    sandgrain(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-13, 9); c.quadraticCurveTo(-8, -4, 0, -6); c.quadraticCurveTo(8, -4, 13, 9); c.quadraticCurveTo(0, 12, -13, 9); c.closePath(); }, '#f0d8a0', '#d4b070', { cel: [2, 2], lw: 2 });
      [[-5, 2], [2, -1], [5, 5], [-1, 6], [-8, 7], [8, 8]].forEach(([x, y], i) => dot(ctx, x, y, i % 2 ? 1 : 1.3, '#b89050'));
      A.ellipse(ctx, 9, -5, 2.5, 2.5, '#f0d8a0', '#d4b070', { lw: 1.6, hl: false });
      sparkle(ctx, -6, -8, 3);
    },
    shellpiece(ctx) {
      const sh = (c) => { c.moveTo(0, 11); c.lineTo(-12, -3); c.quadraticCurveTo(-8, -12, 0, -12); c.lineTo(3, -8); c.lineTo(6, -11); c.lineTo(8, -5); c.lineTo(12, -4); c.closePath(); };
      A.shape(ctx, sh, '#ffc8b8', '#e89a8a', { cel: [2, 2], lw: 2 });
      ctx.save();
      ctx.beginPath();
      sh(ctx);
      ctx.clip();
      ctx.strokeStyle = A.c('#e08878');
      ctx.lineWidth = 1.4;
      [-9, -4.5, 0, 4.5, 9].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(0, 11);
        ctx.lineTo(x, -13);
        ctx.stroke();
      });
      ctx.restore();
      A.shape(ctx, (c) => A.roundRect(c, -3, 8, 6, 4, 1.5), '#ffc8b8', null, { lw: 1.6, hl: false });
    },
    coralbranch(ctx) {
      const br = [[[0, 14], [0, 2], [-6, -6], [-7, -12]], [[0, 2], [6, -4], [8, -12]], [[-3, -2], [-10, -2], [-12, -7]], [[4, -2], [11, 0], [13, -5]], [[6, -4], [3, -11]]];
      [[8, A.outline()], [4.5, null]].forEach(([w, col]) => {
        br.forEach((pts) => {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = col || A.c('#ff7a6a');
          ctx.lineWidth = w;
          ctx.beginPath();
          pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.stroke();
        });
      });
      [[-7, -12], [8, -12], [-12, -7], [13, -5], [3, -11]].forEach(([x, y]) => dot(ctx, x - 0.5, y + 0.5, 1, '#ffd0c8'));
      line(ctx, [[1.5, 12], [1.5, 3]], '#d8503f', 1.5);
    },
    jellydrop(ctx) {
      const g = ctx.createRadialGradient(0, 2, 1, 0, 2, 16);
      g.addColorStop(0, 'rgba(200,190,255,0.6)');
      g.addColorStop(1, 'rgba(180,160,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 2, 16, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.9;
      A.shape(ctx, (c) => { c.moveTo(-12, 8); c.quadraticCurveTo(-14, -2, -8, -8); c.quadraticCurveTo(0, -14, 8, -8); c.quadraticCurveTo(14, -2, 12, 8); c.quadraticCurveTo(6, 12, 0, 10); c.quadraticCurveTo(-6, 12, -12, 8); c.closePath(); }, '#c8c0ff', '#a098f0', { cel: [2, 2], lw: 2, hl: [-5, -5, 3, 2] });
      ctx.restore();
      A.ellipse(ctx, 3, 1, 3, 2.4, '#ffb8e0', null, { noStroke: true, hl: false });
      dot(ctx, -3, 4, 1.2, '#ffffff');
    },
    glowgel(ctx) {
      const g = ctx.createRadialGradient(0, 4, 1, 0, 4, 16);
      g.addColorStop(0, 'rgba(180,255,140,0.8)');
      g.addColorStop(1, 'rgba(150,255,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 4, 16, 0, TAU);
      ctx.fill();
      const fl = (c) => { c.moveTo(-3.5, -9); c.lineTo(3.5, -9); c.lineTo(3.5, -3); c.quadraticCurveTo(11, 1, 10, 7); c.quadraticCurveTo(9, 13, 0, 13); c.quadraticCurveTo(-9, 13, -10, 7); c.quadraticCurveTo(-11, 1, -3.5, -3); c.closePath(); };
      A.shape(ctx, fl, '#e8fff0', null, { lw: 2, hl: false });
      ctx.save();
      ctx.beginPath();
      fl(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#8cff6a');
      ctx.fillRect(-12, 2, 24, 12);
      ctx.fillStyle = A.c('#5ad84a');
      ctx.fillRect(-12, 9, 24, 5);
      ctx.restore();
      A.shape(ctx, fl, 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, -4.5, -13, 9, 5, 2), '#b5824a', null, { lw: 1.8, hl: false });
      A.ellipse(ctx, -5, 5, 1.2, 2.5, '#ffffff', null, { noStroke: true, hl: false });
      dot(ctx, 3, 6, 1.2, '#e8ffd0');
    },
    moonpearl(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 17);
      g.addColorStop(0, 'rgba(230,230,255,0.9)');
      g.addColorStop(1, 'rgba(190,190,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, TAU);
      ctx.fill();
      A.ellipse(ctx, 0, 1, 10, 10, '#f4f0ff', '#cfc4f0', { cel: [2, 2], lw: 2, hl: [-3.5, -3, 3, 2.2] });
      A.shape(ctx, (c) => { c.arc(2, 1, 5, -Math.PI * 0.5, Math.PI * 0.5); c.arc(0.5, 1, 4, Math.PI * 0.45, -Math.PI * 0.45, true); c.closePath(); }, '#ffe89a', null, { noStroke: true, hl: false });
      sparkle(ctx, 10, -10, 3);
    },
    gullfeather(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-10, 12); c.quadraticCurveTo(-9, -6, 10, -14); c.quadraticCurveTo(5, 2, -10, 12); c.closePath(); }, '#fbfbf6', '#d8dce2', { cel: [1.5, 1.5], lw: 2, hl: false });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.quadraticCurveTo(-9, -6, 10, -14);
      ctx.quadraticCurveTo(5, 2, -10, 12);
      ctx.clip();
      ctx.fillStyle = A.c('#9aa4b0');
      ctx.fillRect(-2, -16, 16, 9);
      ctx.fillStyle = A.c('#3a3a44');
      ctx.fillRect(4, -16, 10, 5);
      ctx.restore();
      A.shape(ctx, (c) => { c.moveTo(-10, 12); c.quadraticCurveTo(-9, -6, 10, -14); c.quadraticCurveTo(5, 2, -10, 12); c.closePath(); }, 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
      line(ctx, [[-12, 14], [-2, 0], [8, -12]], '#b8bcc4', 1.4);
    },
    foam(ctx) {
      [[-5, 3, 7], [6, 5, 5.5], [2, -6, 5], [-8, -6, 3.2], [9, -4, 2.6]].forEach(([x, y, r]) => {
        A.ellipse(ctx, x, y, r, r, '#e8faff', '#b8e4f4', { cel: [1.2, 1.2], lw: 1.8, hl: false });
        A.ellipse(ctx, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.22, '#ffffff', null, { noStroke: true, hl: false, rot: -0.5 });
      });
    },
    plume(ctx) {
      ctx.save();
      ctx.rotate(-0.75);
      const p = (c) => { c.moveTo(-17, 0); c.quadraticCurveTo(-2, -10, 17, -2); c.quadraticCurveTo(0, 8, -17, 0); c.closePath(); };
      A.shape(ctx, p, '#fffdf4', '#e4dcc8', { cel: [1, 1.5], lw: 2, hl: false });
      ctx.save();
      ctx.beginPath();
      p(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#5a5a66');
      ctx.fillRect(9, -10, 12, 20);
      ctx.restore();
      A.shape(ctx, p, 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
      line(ctx, [[-19, 0.5], [15, -1.5]], '#c8bca0', 1.4);
      [[-6, -2, -3, -6], [0, -2.5, 3, -6.5], [-3, 1, 0, 5], [3, 0.5, 6, 4]].forEach(([a, b, c2, d]) => line(ctx, [[a, b], [c2, d]], '#e4dcc8', 1));
      ctx.restore();
    },
    lampshard(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
      g.addColorStop(0, 'rgba(255,240,150,0.95)');
      g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-8, 12); c.lineTo(-11, -4); c.lineTo(-3, -14); c.lineTo(6, -9); c.lineTo(11, 3); c.lineTo(3, 12); c.closePath(); }, '#fff2a0', '#ffd24a', { cel: [2, 2], lw: 2, hl: [-4, -6, 2.5, 4] });
      line(ctx, [[-3, -14], [0, -2], [11, 3]], '#ffd24a', 1.4);
      line(ctx, [[0, -2], [-8, 12]], '#ffd24a', 1.4);
      A.shape(ctx, (c) => { c.moveTo(-10, 12); c.lineTo(5, 12); c.lineTo(4, 16); c.lineTo(-9, 16); c.closePath(); }, '#c8903a', '#9a6a28', { lw: 1.8, hl: false });
      sparkle(ctx, 12, -11, 3.5);
      sparkle(ctx, -13, -8, 2.5);
    },

    // ─── 第三章材料 ───
    emberscale(ctx) {
      const g = ctx.createRadialGradient(0, 2, 1, 0, 2, 15);
      g.addColorStop(0, 'rgba(255,160,80,0.7)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 2, 15, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(0, -12); c.quadraticCurveTo(12, -6, 10, 4); c.quadraticCurveTo(7, 12, 0, 13); c.quadraticCurveTo(-7, 12, -10, 4); c.quadraticCurveTo(-12, -6, 0, -12); c.closePath(); }, '#ff8a3a', '#d85a20', { cel: [2, 2], lw: 2, hl: [-4, -4, 2, 3] });
      A.shape(ctx, (c) => { c.moveTo(0, -6); c.quadraticCurveTo(6, -2, 5, 4); c.quadraticCurveTo(3, 8, 0, 8); c.quadraticCurveTo(-3, 8, -5, 4); c.quadraticCurveTo(-6, -2, 0, -6); c.closePath(); }, '#ffd05a', null, { lw: 1.4, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-2, 5); c.quadraticCurveTo(-3, 0, 0, -3); c.quadraticCurveTo(0, 1, 2, 1); c.quadraticCurveTo(3, 4, 0, 6); c.closePath(); }, '#fff4c0', null, { noStroke: true, hl: false });
    },
    magmashard(ctx) {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 15);
      g.addColorStop(0, 'rgba(255,120,40,0.55)');
      g.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-10, 10); c.lineTo(-12, -2); c.lineTo(-4, -13); c.lineTo(8, -10); c.lineTo(12, 2); c.lineTo(4, 12); c.closePath(); }, '#4a3a3e', '#2e2428', { cel: [2, 2], lw: 2, hl: false });
      ctx.lineJoin = 'round';
      line(ctx, [[-4, -13], [-2, -4], [-8, 3], [-6, 10]], '#ff7a2a', 2.8);
      line(ctx, [[-2, -4], [6, 0], [10, 4]], '#ff7a2a', 2.4);
      line(ctx, [[-4, -13], [-2, -4], [-8, 3], [-6, 10]], '#ffe07a', 1);
      line(ctx, [[-2, -4], [6, 0], [10, 4]], '#ffe07a', 0.9);
    },
    fang(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-9, -11); c.quadraticCurveTo(0, -14, 8, -10); c.quadraticCurveTo(8, 2, 1, 13); c.quadraticCurveTo(-2, 4, -9, -11); c.closePath(); }, '#fff4e0', '#e0d0b0', { cel: [2, 1.5], lw: 2, hl: [-3, -6, 1.5, 3] });
      A.shape(ctx, (c) => { c.moveTo(-9, -11); c.quadraticCurveTo(0, -14, 8, -10); c.lineTo(7, -6); c.quadraticCurveTo(0, -9, -8, -7); c.closePath(); }, '#e8704a', '#c0502a', { lw: 1.8, hl: false });
      A.shape(ctx, (c) => { c.moveTo(9, -2); c.quadraticCurveTo(14, -4, 12, -10); c.quadraticCurveTo(16, -5, 13, 1); c.closePath(); }, '#ff8a3a', null, { lw: 1.4, hl: false });
    },
    pebble(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-11, 4); c.lineTo(-9, -7); c.lineTo(0, -11); c.lineTo(10, -6); c.lineTo(12, 5); c.lineTo(3, 11); c.lineTo(-7, 10); c.closePath(); }, '#a8a09a', '#7a726c', { cel: [2, 2], lw: 2 });
      A.shape(ctx, (c) => { c.moveTo(-5, -1); c.lineTo(0, -6); c.lineTo(5, -2); c.lineTo(3, 4); c.lineTo(-3, 4); c.closePath(); }, '#c8c0b8', null, { lw: 1.4, hl: false });
      dot(ctx, 0, -1, 1.8, '#e8b060');
    },
    rockheart(ctx) {
      const g = ctx.createRadialGradient(0, 1, 1, 0, 1, 16);
      g.addColorStop(0, 'rgba(255,180,90,0.6)');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 1, 16, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => heartPath(c, 0, 0, 1.05), '#9a8a7a', '#6e5e50', { cel: [2, 2], lw: 2, hl: false });
      ctx.lineJoin = 'round';
      line(ctx, [[0, -5], [-2, -1], [2, 2], [0, 8]], '#ffb84a', 2.4);
      line(ctx, [[0, -5], [-2, -1], [2, 2], [0, 8]], '#fff0a0', 0.9);
      A.ellipse(ctx, 0, 1, 3, 3, '#ffb84a', null, { lw: 1.4, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-9, -4); c.lineTo(-6, -7); c.lineTo(-4, -5); c.closePath(); }, '#b8a898', null, { noStroke: true, hl: false });
    },
    springstone(ctx) {
      A.ellipse(ctx, 0, 5, 12, 8, '#7ad0c8', '#4aa8a0', { cel: [2, 2], lw: 2, hl: [-5, 2, 3, 1.6] });
      A.ellipse(ctx, 3, 6, 3, 2, '#b8f0e8', null, { noStroke: true, hl: false });
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      [[-5, -3], [1, -5], [7, -3]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - 3, y - 3, x, y - 6);
        ctx.quadraticCurveTo(x + 3, y - 9, x, y - 11);
        ctx.stroke();
      });
    },
    towel(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -13, -6, 26, 16, 4), '#fbfbf6', '#dcdcd4', { cel: [2, 2], lw: 2 });
      A.shape(ctx, (c) => A.roundRect(c, -13, -11, 26, 8, 4), '#ffffff', '#e8e8e0', { shadeY: -5, lw: 2 });
      ctx.fillStyle = A.c('#5a8ad8');
      ctx.fillRect(-12, 2, 24, 2.5);
      ctx.fillRect(-12, 6, 24, 1.2);
      ctx.fillStyle = A.c('#e8433a');
      ctx.fillRect(-12, -8, 24, 1.6);
      A.shape(ctx, (c) => A.roundRect(c, -13, -6, 26, 16, 4), 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
    },
    redfur(ctx) {
      [[-6, 0.5, '#c84a28'], [6, -0.45, '#c84a28'], [0, 0.05, '#e8603a']].forEach(([x, r, col]) => {
        ctx.save();
        ctx.translate(x, 11);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-6, 0); c.quadraticCurveTo(-8, -14, 2, -25); c.quadraticCurveTo(0, -16, 6, -12); c.quadraticCurveTo(7, -5, 6, 0); c.closePath(); }, col, '#a83a1c', { cel: [1.5, 1], lw: 2, hl: false });
        ctx.restore();
      });
      line(ctx, [[-1, 4], [1, -6]], '#ffa070', 1.2);
      A.shape(ctx, (c) => A.roundRect(c, -7, 9, 14, 5, 2), '#ffd05a', '#e0a020', { shadeY: 12, lw: 1.6, hl: false });
    },
    maskshard(ctx) {
      const m = (c) => { c.moveTo(-2, -13); c.quadraticCurveTo(-13, -12, -13, 0); c.quadraticCurveTo(-12, 11, -1, 13); c.lineTo(1, 7); c.lineTo(-2, 3); c.lineTo(3, -1); c.lineTo(0, -5); c.lineTo(3, -9); c.closePath(); };
      A.shape(ctx, m, '#c8904a', '#9a6a30', { cel: [2, 2], lw: 2 });
      A.shape(ctx, (c) => c.ellipse(-6, -3, 3.5, 2.4, -0.2, 0, TAU), '#3a2418', null, { noStroke: true, hl: false });
      ctx.save();
      ctx.beginPath();
      m(ctx);
      ctx.clip();
      ctx.strokeStyle = A.c('#e8433a');
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-11, 3);
      ctx.lineTo(-3, 5);
      ctx.moveTo(-10, 7);
      ctx.lineTo(-3, 9);
      ctx.moveTo(-9, -8);
      ctx.lineTo(-3, -9);
      ctx.stroke();
      ctx.restore();
      A.shape(ctx, m, 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
      [[7, -4, 2.4], [8, 5, 1.8]].forEach(([x, y, r]) => A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.6, 3, 0.4), '#c8904a', null, { lw: 1.4, hl: false }));
    },
    volcanocore(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
      g.addColorStop(0, 'rgba(255,170,80,0.95)');
      g.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.fill();
      A.ellipse(ctx, 0, 0, 11, 11, '#ff7a2a', '#d84a18', { cel: [2, 2], lw: 2, hl: false });
      A.ellipse(ctx, -1, -1, 6, 6, '#ffd05a', null, { noStroke: true, hl: false });
      A.ellipse(ctx, -2, -2, 3, 3, '#fff6c0', null, { noStroke: true, hl: false });
      [[-0.3, 1.1], [1.5, 0.9], [2.8, 1.0], [4.3, 1.1]].forEach(([a, w]) => {
        const x = Math.cos(a) * 10;
        const y = Math.sin(a) * 10;
        A.shape(ctx, (c) => { c.arc(0, 0, 12.5, a - w * 0.4, a + w * 0.4); c.arc(0, 0, 7.5, a + w * 0.3, a - w * 0.3, true); c.closePath(); }, '#4a3a3e', '#2e2428', { lw: 1.8, hl: false });
        dot(ctx, x * 0.9, y * 0.9, 0.9, '#6a5a5e');
      });
      sparkle(ctx, 13, -12, 3, '#fff0a0');
      sparkle(ctx, -14, 10, 2.4, '#ffd05a');
    },
  };
  // doubleClaw／shadowStep／thunderCombo 刻意蓋過 items.js 的舊圖示（敏捷系改成投擲羽刃）
  Object.assign(A.ICON, ICON2);
})();
