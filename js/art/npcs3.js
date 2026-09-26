// 第四章「霜鈴雪峰」與終章「時空間神殿」的 NPC 與營地建築。
// NPC 註冊到 A.NPC_DRAW（由 A.drawNpc 呼叫：原點在腳底中央、面向右、頭頂大約在 -80 以內，
// 任務標記畫在 -92，所以頭上的東西不要超過 -86）。營地建築註冊到 A.CAMP_DRAW[4]、A.CAMP_DRAW[5]。
// 風格比照 npcs.js／npcs2.js／camps2.js：平塗、深棕描邊、右下月牙陰影、Q 版眼睛。
// 必須在 js/art/npcs2.js、js/art/camps2.js 之後載入。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  A.CAMP_DRAW = A.CAMP_DRAW || {};

  // ════════ 小工具 ════════
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
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.max(0, a).toFixed(3) + ')');
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
  function sparkle(ctx, x, y, r, col, a) {
    ctx.save();
    ctx.globalAlpha *= a == null ? 1 : a;
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    starPath(ctx, x, y, r, r * 0.3, 4, -Math.PI / 2);
    ctx.fill();
    ctx.restore();
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
  // 眼皮半垂的眼睛（溫柔、淡定或冷酷）；lid 0~1 是蓋住的比例，tilt 讓眼皮斜一點
  function lidEye(ctx, x, y, rx, ry, lidCol, lid, tilt, look) {
    A.eye(ctx, x, y, rx, ry, 'normal', look == null ? 1 : look);
    const ly = y - ry + ry * 2 * lid;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x + (look == null ? 1 : look), y, rx + 0.6, ry + 0.6, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = A.c(lidCol);
    ctx.beginPath();
    ctx.moveTo(x - rx - 2, y - ry - 2);
    ctx.lineTo(x + rx + 3, y - ry - 2);
    ctx.lineTo(x + rx + 3, ly + (tilt || 0));
    ctx.lineTo(x - rx - 2, ly - (tilt || 0));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    line(ctx, [[x - rx - 0.3, ly - (tilt || 0)], [x + rx + 1.3, ly + (tilt || 0)]], null, 2.2);
  }
  // 小金鈴
  function bell(ctx, x, y, r, rot, col, shade) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => { c.moveTo(-r, r * 0.7); c.quadraticCurveTo(-r, -r, 0, -r); c.quadraticCurveTo(r, -r, r, r * 0.7); c.closePath(); }, col || '#ffd35a', shade || '#e0a020', { cel: [r * 0.25, r * 0.2], lw: Math.max(1.2, r * 0.35), hl: false });
    dot(ctx, 0, r * 0.85, r * 0.3, '#8a5a1a');
    ctx.restore();
  }
  // 楓葉（光之獅子手邊那片）
  function maple(ctx, x, y, s, rot, col, shade) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, s), col, shade, { shadeY: s * 0.3, lw: 2 });
    ctx.restore();
  }

  // ════════ 第四章：霜鈴雪峰 ════════

  // 狐狸巫女：紅白巫女服、搖著鈴杖。溫柔，但眼神有點哀傷——她知道守葉獸的宿命
  function foxmiko(ctx, t) {
    const bob = Math.sin(t * 1.6) * 0.8;
    const FUR = '#ec8f4c';
    const FURS = '#c86c32';
    const CREAM = '#fff4e6';
    // 每隔一陣子垂下眼睛，像在想什麼
    const muse = t % 7.5 > 6.2;
    // 大尾巴（身後）
    ctx.save();
    ctx.translate(-9, -16 + bob);
    ctx.rotate(Math.sin(t * 1.4) * 0.08);
    const tail = (c) => { c.moveTo(2, 0); c.bezierCurveTo(-18, 6, -36, -4, -33, -26); c.bezierCurveTo(-31, -42, -15, -46, -11, -37); c.bezierCurveTo(-18, -26, -12, -12, 5, -8); c.closePath(); };
    A.shape(ctx, tail, FUR, FURS, { cel: [2.5, 2.5], hl: false });
    ctx.save();
    ctx.beginPath();
    tail(ctx);
    ctx.clip();
    ctx.fillStyle = A.c(CREAM);
    ctx.beginPath();
    ctx.ellipse(-26, -35, 11, 10, -0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    A.shape(ctx, tail, 'rgba(0,0,0,0)', null, { lw: 2.6, hl: false });
    ctx.restore();
    // 緋袴
    A.shape(ctx, (c) => { c.moveTo(-13, -25 + bob); c.lineTo(13, -25 + bob); c.lineTo(18, -1); c.quadraticCurveTo(0, 2, -18, -1); c.closePath(); }, '#d8323a', '#a82028', { cel: [3, 2] });
    line(ctx, [[-4, -22 + bob], [-6, -3]], '#a82028', 1.5);
    line(ctx, [[5, -22 + bob], [7, -3]], '#a82028', 1.5);
    A.ellipse(ctx, -8, -0.5, 5.5, 2.6, '#ffffff', '#e4e4ec', { lw: 2, hl: false });
    A.ellipse(ctx, 9, -0.5, 5.5, 2.6, '#ffffff', '#e4e4ec', { lw: 2, hl: false });
    // 白衣
    A.shape(ctx, (c) => { c.moveTo(-13, -25 + bob); c.quadraticCurveTo(-15, -43 + bob, -2, -45 + bob); c.lineTo(5, -45 + bob); c.quadraticCurveTo(16, -42 + bob, 13, -25 + bob); c.closePath(); }, '#fbf8f2', '#dcd6cc', { cel: [2, 2], hl: false });
    line(ctx, [[-2, -45 + bob], [3, -35 + bob], [8, -45 + bob]], '#d8323a', 2.2);
    A.shape(ctx, (c) => A.roundRect(c, -14, -28 + bob, 28, 4.5, 2), '#d8323a', '#a82028', { lw: 1.8, hl: false });
    // 鈴杖（巫女的神樂鈴，杖頭一圈金環掛著小鈴與五色緞帶）
    const sx = 24;
    const top = -70 + bob;
    const sw = Math.sin(t * 2.2) * 0.12 + (t % 5 < 0.6 ? Math.sin(t * 30) * 0.25 : 0);
    ctx.save();
    ctx.translate(sx, top);
    ctx.rotate(sw * 0.4);
    ['#d8323a', '#ffffff', '#3d9a5a', '#f0c040', '#5a78c8'].forEach((col, i) => {
      const fl = Math.sin(t * 2.4 + i) * 3;
      A.shape(ctx, (c) => { c.moveTo(-1 + i * 0.5, 2); c.quadraticCurveTo(-4 - i * 1.5 + fl, 14, -3 - i * 2 + fl * 1.4, 26 + i * 1.5); c.lineTo(-i * 2 + fl * 1.4, 26 + i * 1.5); c.quadraticCurveTo(-1 - i + fl, 14, 1 + i * 0.5, 2); c.closePath(); }, col, null, { lw: 1.2, hl: false });
    });
    ctx.restore();
    stick(ctx, [[sx, 0], [sx, top]], '#b8322a', 2.6);
    ctx.save();
    ctx.translate(sx, top);
    ctx.rotate(sw);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.ellipse(0, -7, 7, 7, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = A.c('#ffd35a');
    ctx.lineWidth = 2;
    ctx.stroke();
    [[-6, -4], [6, -4], [-3.5, 0], [3.5, 0], [0, -14]].forEach(([x, y], i) => bell(ctx, x, y, 2.6, Math.sin(t * 6 + i) * 0.3));
    ctx.restore();
    // 大袖子與握杖的手
    const sl = Math.sin(t * 1.6 + 0.5) * 1;
    A.shape(ctx, (c) => { c.moveTo(4, -43 + bob); c.quadraticCurveTo(18, -42 + bob, 21, -30 + bob); c.lineTo(21 + sl * 0.3, -15 + bob); c.quadraticCurveTo(14, -12 + bob, 8, -17 + bob); c.quadraticCurveTo(3, -28 + bob, 4, -43 + bob); c.closePath(); }, '#fbf8f2', '#dcd6cc', { cel: [2, 1.5], hl: false, lw: 2.4 });
    line(ctx, [[9, -17.5 + bob], [20.5, -16 + bob]], '#d8323a', 2);
    A.ellipse(ctx, sx - 1, -30 + bob, 4.2, 4, FUR, FURS, { lw: 2, hl: false });
    // 頭
    const hx = 6;
    const hy = -55 + bob;
    const ear = (x0, y0, x1, y1, x2, y2, col, sh) => {
      A.shape(ctx, (c) => { c.moveTo(x0, y0); c.quadraticCurveTo(x1 - 2, (y0 + y1) / 2, x1, y1); c.quadraticCurveTo(x2 + 1, (y1 + y2) / 2, x2, y2); c.closePath(); }, col, sh, { cel: [1, 1], lw: 2.2, hl: false });
    };
    ear(hx - 11, hy - 8, hx - 12, hy - 25, hx - 1, hy - 13, FURS, null);
    ear(hx + 1, hy - 13, hx + 7, hy - 27, hx + 13, hy - 9, FUR, FURS);
    A.shape(ctx, (c) => { c.moveTo(hx + 4, hy - 13); c.quadraticCurveTo(hx + 6, hy - 20, hx + 7, hy - 22); c.quadraticCurveTo(hx + 9, hy - 17, hx + 10, hy - 11); c.closePath(); }, '#3a2418', null, { noStroke: true, hl: false });
    const head = (c) => { c.moveTo(hx - 12, hy + 2); c.quadraticCurveTo(hx - 14, hy - 12, hx, hy - 13); c.quadraticCurveTo(hx + 12, hy - 12, hx + 14, hy - 4); c.quadraticCurveTo(hx + 18, hy, hx + 23, hy + 2); c.quadraticCurveTo(hx + 22, hy + 7, hx + 13, hy + 8); c.quadraticCurveTo(hx + 4, hy + 13, hx - 4, hy + 10); c.quadraticCurveTo(hx - 12, hy + 8, hx - 12, hy + 2); c.closePath(); };
    A.shape(ctx, head, FUR, FURS, { cel: [2, 2.5], hl: [hx - 5, hy - 7, 4, 2.5] });
    ctx.save();
    ctx.beginPath();
    head(ctx);
    ctx.clip();
    ctx.fillStyle = A.c(CREAM);
    ctx.beginPath();
    ctx.moveTo(hx - 12, hy + 4);
    ctx.quadraticCurveTo(hx + 4, hy - 1, hx + 12, hy + 1);
    ctx.quadraticCurveTo(hx + 18, hy + 1, hx + 24, hy + 3);
    ctx.lineTo(hx + 24, hy + 16);
    ctx.lineTo(hx - 14, hy + 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    A.shape(ctx, head, 'rgba(0,0,0,0)', null, { lw: 2.6, hl: false });
    dot(ctx, hx + 22.5, hy + 2.5, 2.3, '#3a2418');
    // 眼睛：溫柔半垂，偶爾閉上
    const bl = blinkAt(t, 0.8, 0.4);
    if (muse || bl) {
      A.eye(ctx, hx + 2, hy - 2, 3, 3.6, 'closed');
      A.eye(ctx, hx + 10, hy - 2.5, 2.8, 3.4, 'closed');
    } else {
      A.eye(ctx, hx + 2, hy - 1.5, 2.9, 3.6, 'normal', 0.5);
      A.eye(ctx, hx + 10, hy - 2, 2.7, 3.4, 'normal', 0.5);
    }
    // 眼尾的紅妝與八字眉（帶一點哀傷）
    line(ctx, [[hx - 2.2, hy - 1], [hx - 5, hy + 1]], '#d8323a', 2);
    line(ctx, [[hx - 2, hy - 7.5], [hx + 3.5, hy - 9.5]], null, 1.8);
    line(ctx, [[hx + 8.5, hy - 10], [hx + 12.5, hy - 8]], null, 1.8);
    dot(ctx, hx + 5.5, hy - 12, 1.3, '#d8323a');
    // 嘴：淡淡的微笑
    line(ctx, [[hx + 14, hy + 6.5], [hx + 17, hy + 6], [hx + 19.5, hy + 5]], null, 1.6);
    A.blush(ctx, hx - 3, hy + 4, 2.6);
    // 頭上的紅緞帶與紙垂
    const pf = Math.sin(t * 2) * 1.2;
    const rx = hx - 12;
    const ry = hy - 1;
    A.shape(ctx, (c) => { c.moveTo(rx, ry); c.lineTo(rx - 4 + pf, ry + 11); c.lineTo(rx - 1 + pf, ry + 10); c.lineTo(rx + 1, ry + 1); c.closePath(); }, '#d8323a', '#a82028', { lw: 1.5, hl: false });
    A.shape(ctx, (c) => { c.moveTo(rx, ry); c.lineTo(rx - 7, ry - 5); c.lineTo(rx - 6, ry + 3); c.closePath(); }, '#d8323a', null, { lw: 1.5, hl: false });
    A.shape(ctx, (c) => { c.moveTo(rx, ry); c.lineTo(rx + 5, ry - 6); c.lineTo(rx + 5, ry + 2); c.closePath(); }, '#d8323a', null, { lw: 1.5, hl: false });
    A.ellipse(ctx, rx, ry, 2.2, 2.2, '#ffd35a', null, { lw: 1.4, hl: false });
  }

  // 犛牛長老：披著織紋毛斗篷的老犛牛，脖子掛大銅鈴，背架上綁滿登山裝備（商店）
  function yakelder(ctx, t) {
    const bob = Math.sin(t * 1.1) * 0.8;
    const FUR = '#5e483a';
    const FURS = '#45342a';
    // 腳
    [[-20, FURS], [8, FURS], [-12, FUR], [16, FUR]].forEach(([x, col]) => {
      A.shape(ctx, (c) => A.roundRect(c, x - 4.5, -16, 9, 16, 3), col, null, { lw: 2.2, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, x - 5, -4, 10, 4, 1.5), '#2e241e', null, { lw: 1.8, hl: false });
    });
    // 背架（身後）：木框、捲起的繩子、鍋子、鈴鐺
    stick(ctx, [[-36, -18 + bob], [-34, -74 + bob]], '#a87a4a', 2.6);
    stick(ctx, [[-20, -26 + bob], [-18, -74 + bob]], '#a87a4a', 2.6);
    stick(ctx, [[-36, -70 + bob], [-17, -70 + bob]], '#a87a4a', 2.4);
    A.shape(ctx, (c) => A.roundRect(c, -38, -66 + bob, 22, 12, 5), '#6a8a5a', '#50704a', { cel: [2, 2], lw: 2, hl: false });
    line(ctx, [[-32, -66 + bob], [-32, -54 + bob]], '#3e5a36', 1.4);
    line(ctx, [[-24, -66 + bob], [-24, -54 + bob]], '#3e5a36', 1.4);
    A.ellipse(ctx, -30, -76 + bob, 8, 4, '#c8a068', '#a88048', { lw: 2, hl: false });
    ctx.strokeStyle = A.c('#a88048');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-30, -76 + bob, 4.5, 2, 0, 0, TAU);
    ctx.stroke();
    A.shape(ctx, (c) => { c.moveTo(-40, -52 + bob); c.lineTo(-38, -40 + bob); c.lineTo(-30, -40 + bob); c.lineTo(-28, -52 + bob); c.closePath(); }, '#8a929c', '#6a727c', { cel: [1.5, 1], lw: 2, hl: false });
    line(ctx, [[-37, -54 + bob], [-34, -58 + bob], [-31, -54 + bob]], null, 1.6);
    bell(ctx, -38, -34 + bob, 3, Math.sin(t * 2 + 1) * 0.3, '#d8a050', '#b07a34');
    // 蓬蓬的身體（下緣一撮撮的長毛）
    A.shape(ctx, (c) => {
      c.moveTo(-30, -18);
      c.bezierCurveTo(-32, -44 + bob, -10, -52 + bob, 6, -50 + bob);
      c.bezierCurveTo(22, -48 + bob, 30, -36 + bob, 28, -18);
      for (let i = 0; i <= 10; i++) {
        const x = 28 - i * 5.8;
        c.lineTo(x + 2.9, i % 2 ? -8 : -13);
      }
      c.closePath();
    }, FUR, FURS, { cel: [3, 3], hl: false });
    // 織紋毛斗篷
    const cloak = (c) => {
      c.moveTo(-29, -30 + bob);
      c.bezierCurveTo(-28, -48 + bob, -8, -54 + bob, 8, -51 + bob);
      c.quadraticCurveTo(18, -49 + bob, 20, -40 + bob);
      c.lineTo(14, -24 + bob);
      c.lineTo(8, -28 + bob);
      c.lineTo(2, -22 + bob);
      c.lineTo(-4, -27 + bob);
      c.lineTo(-10, -21 + bob);
      c.lineTo(-16, -26 + bob);
      c.lineTo(-22, -20 + bob);
      c.lineTo(-27, -25 + bob);
      c.closePath();
    };
    A.shape(ctx, cloak, '#c89a64', '#a67a48', { cel: [2.5, 2.5], hl: [-10, -46 + bob, 7, 2.5] });
    ctx.save();
    ctx.beginPath();
    cloak(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#b83a3a');
    ctx.fillRect(-40, -40 + bob, 70, 5);
    ctx.fillStyle = A.c('#2e8a8a');
    for (let i = 0; i < 9; i++) {
      const x = -30 + i * 6;
      ctx.beginPath();
      ctx.moveTo(x, -37.5 + bob);
      ctx.lineTo(x + 3, -40 + bob);
      ctx.lineTo(x + 6, -37.5 + bob);
      ctx.lineTo(x + 3, -35 + bob);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // 頭
    const hx = 22;
    const hy = -44 + bob;
    curve(ctx, [hx - 6, hy - 9], [hx - 22, hy - 12], [hx - 19, hy - 27], '#efe4c8', 4);
    A.shape(ctx, (c) => A.roundRect(c, hx - 12, hy - 12, 25, 25, 10), FUR, FURS, { cel: [2.5, 2.5], hl: false });
    curve(ctx, [hx + 5, hy - 10], [hx + 20, hy - 14], [hx + 15, hy - 28], '#efe4c8', 4);
    A.ellipse(ctx, hx + 9, hy + 6, 8, 6.5, '#8a7262', '#6e5a4c', { lw: 2.2, hl: false });
    dot(ctx, hx + 11, hy + 5, 1.3, '#2e241e');
    dot(ctx, hx + 15, hy + 5, 1.3, '#2e241e');
    // 瀏海蓋住一半的眼睛
    const bl = blinkAt(t, 0.7);
    A.eye(ctx, hx - 1, hy + 0.5, 2.4, 2.8, bl ? 'closed' : 'normal', 1);
    A.eye(ctx, hx + 7, hy, 2.2, 2.6, bl ? 'closed' : 'normal', 1);
    A.blush(ctx, hx - 4, hy + 5, 2.6);
    const fs = Math.sin(t * 1.3) * 0.6;
    A.shape(ctx, (c) => {
      c.moveTo(hx - 13, hy - 9);
      c.quadraticCurveTo(hx, hy - 17, hx + 13, hy - 9);
      for (let i = 0; i <= 6; i++) {
        const x = hx + 13 - i * 4.3;
        c.lineTo(x - 2.1 + fs, hy - (i % 2 ? 4 : 7.5));
      }
      c.closePath();
    }, '#7a6252', '#5e483a', { cel: [1.5, 1.5], lw: 2, hl: false });
    // 白鬍子
    A.shape(ctx, (c) => { c.moveTo(hx + 2, hy + 11); c.quadraticCurveTo(hx + 9, hy + 13, hx + 15, hy + 10); c.lineTo(hx + 13, hy + 18); c.lineTo(hx + 10, hy + 15); c.lineTo(hx + 7, hy + 21); c.lineTo(hx + 5, hy + 15); c.lineTo(hx + 2, hy + 18); c.closePath(); }, '#f4f0e6', '#d8d0c0', { cel: [1, 1], lw: 1.8, hl: false });
    // 脖子上的大銅鈴
    const bs = Math.sin(t * 1.8) * 0.25;
    line(ctx, [[hx - 10, hy + 9], [hx - 3, hy + 16], [hx + 1, hy + 16]], '#b83a3a', 2.4);
    bell(ctx, hx - 3, hy + 21, 5, bs, '#e0a848', '#b87a28');
    // 冷空氣裡的一口白氣
    const ph = (t % 3.2) / 3.2;
    if (ph < 0.5) {
      const k = ph / 0.5;
      ctx.save();
      ctx.globalAlpha *= 0.6 * Math.sin(k * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx + 18 + k * 10, hy + 6 - k * 4, 2.5 + k * 3.5, 0, TAU);
      ctx.arc(hx + 23 + k * 12, hy + 3 - k * 5, 2 + k * 2.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  // 雪兔小孩：白白軟軟，一隻耳朵垂下來，圍著紅白條紋的手織圍巾，手裡捏著雪球
  function harekid(ctx, t) {
    const h = -Math.abs(Math.sin(t * 2.4)) * 2.2;
    const W = '#ffffff';
    const WS = '#d6deea';
    A.ellipse(ctx, -6, -2, 7.5, 3.2, W, WS, { lw: 2, hl: false });
    A.ellipse(ctx, 9, -2, 7.5, 3.2, W, WS, { lw: 2, hl: false });
    A.ellipse(ctx, -12, -14 + h, 5, 5, W, WS, { lw: 2, hl: false });
    A.ellipse(ctx, 0, -18 + h, 12, 13.5, W, WS, { cel: [2.5, 2.5] });
    // 雪球與紅手套
    const sb = Math.sin(t * 2.4) * 0.8;
    A.ellipse(ctx, 14, -20 + h + sb, 5.5, 5.2, '#f6faff', '#cfdcec', { cel: [1.2, 1.2], lw: 2 });
    A.ellipse(ctx, 9, -18 + h + sb, 3.6, 3.4, '#e0484a', '#b83436', { lw: 1.8, hl: false });
    A.ellipse(ctx, 19, -18 + h + sb, 3.6, 3.4, '#e0484a', '#b83436', { lw: 1.8, hl: false });
    // 頭與耳朵
    const hx = 3;
    const hy = -38 + h;
    const ew = Math.sin(t * 1.7) * 0.06;
    A.ellipse(ctx, hx - 5, hy - 21, 4.6, 12, W, WS, { rot: -0.2 + ew, lw: 2.2, hl: false });
    A.ellipse(ctx, hx - 5, hy - 20, 2, 8, '#ffc0cc', null, { rot: -0.2 + ew, noStroke: true, hl: false });
    A.ellipse(ctx, hx, hy, 13, 12, W, WS, { cel: [2, 2] });
    ctx.save();
    ctx.translate(hx + 5, hy - 9);
    ctx.rotate(1.15 + Math.sin(t * 2.4) * 0.08);
    A.ellipse(ctx, 0, -10, 4.4, 11, W, WS, { lw: 2.2, hl: false });
    A.ellipse(ctx, 0.5, -9, 1.8, 7, '#ffc0cc', null, { noStroke: true, hl: false });
    ctx.restore();
    // 臉
    const bl = blinkAt(t, 1, 0.8);
    A.eye(ctx, hx + 3, hy - 1, 2.8, 3.6, bl ? 'closed' : 'normal', 1);
    A.eye(ctx, hx + 9.5, hy - 1.5, 2.6, 3.4, bl ? 'closed' : 'normal', 1);
    A.ellipse(ctx, hx + 12.5, hy + 3, 1.8, 1.3, '#ff8aa8', null, { lw: 1, hl: false });
    line(ctx, [[hx + 9.5, hy + 6], [hx + 11, hy + 7], [hx + 12.5, hy + 5.6], [hx + 14, hy + 7], [hx + 15, hy + 6]], null, 1.5);
    A.blush(ctx, hx + 1, hy + 4, 3);
    A.blush(ctx, hx + 13, hy + 3.5, 2);
    // 手織圍巾
    const fl = Math.sin(t * 3) * 2.5;
    const tailS = (c) => { c.moveTo(hx - 8, hy + 10); c.quadraticCurveTo(hx - 16, hy + 12 + fl * 0.5, hx - 22 + fl, hy + 18 + fl * 0.4); c.lineTo(hx - 18 + fl, hy + 22 + fl * 0.4); c.quadraticCurveTo(hx - 12, hy + 17, hx - 5, hy + 15); c.closePath(); };
    A.shape(ctx, tailS, '#e0484a', '#b83436', { cel: [1, 1], lw: 2, hl: false });
    line(ctx, [[hx - 22 + fl, hy + 18 + fl * 0.4], [hx - 24 + fl, hy + 21 + fl * 0.4]], '#f4e8d0', 1.6);
    line(ctx, [[hx - 20 + fl, hy + 21 + fl * 0.4], [hx - 22 + fl, hy + 24 + fl * 0.4]], '#f4e8d0', 1.6);
    const band = (c) => A.roundRect(c, hx - 12, hy + 8, 25, 8, 4);
    A.shape(ctx, band, '#e0484a', '#b83436', { cel: [1.5, 1.5], lw: 2, hl: false });
    ctx.save();
    ctx.beginPath();
    band(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#f4e8d0');
    [-6, 2, 10].forEach((dx) => ctx.fillRect(hx + dx, hy + 7, 3, 10));
    ctx.strokeStyle = A.c('rgba(120,30,30,0.45)');
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 8; i++) {
      const x = hx - 11 + i * 3.2;
      ctx.beginPath();
      ctx.moveTo(x, hy + 10.5);
      ctx.lineTo(x + 1.5, hy + 12.5);
      ctx.lineTo(x + 3, hy + 10.5);
      ctx.stroke();
    }
    ctx.restore();
    A.shape(ctx, band, 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
  }

  // 土撥鼠獵人：圓滾滾，戴著有尾巴的毛皮帽，背箭筒、手持短弓；常常站起來東張西望
  function marmot(ctx, t) {
    const cyc = t % 7;
    const look = cyc < 3 ? 1 : cyc < 3.4 ? 0 : cyc < 5.4 ? -1 : 0;
    const bob = Math.sin(t * 2) * 0.8;
    const FUR = '#a8784a';
    const FURS = '#86592e';
    A.ellipse(ctx, -7, -2, 6.5, 3, FURS, null, { lw: 2, hl: false });
    A.ellipse(ctx, 7, -2, 6.5, 3, FURS, null, { lw: 2, hl: false });
    A.ellipse(ctx, -15, -8, 6, 4, '#6a4a2e', null, { rot: -0.5, lw: 2, hl: false });
    // 箭筒（背後）
    ctx.save();
    ctx.translate(-12, -30 + bob);
    ctx.rotate(-0.35);
    [[-3, '#e0584a'], [0, '#fff6ee'], [3, '#e0584a']].forEach(([dx, col]) => {
      line(ctx, [[dx, -8], [dx, -20]], '#c8a068', 1.6);
      A.shape(ctx, (c) => { c.moveTo(dx, -26); c.lineTo(dx - 2.4, -19); c.lineTo(dx + 2.4, -19); c.closePath(); }, col, null, { lw: 1.2, hl: false });
    });
    A.shape(ctx, (c) => A.roundRect(c, -6, -12, 12, 26, 3), '#7a5230', '#5e3e22', { cel: [1.5, 1.5], lw: 2, hl: false });
    line(ctx, [[-6, -6], [6, -6]], '#c8a068', 1.6);
    ctx.restore();
    // 身體
    A.ellipse(ctx, 0, -22 + bob, 15, 19, FUR, FURS, { cel: [3, 3] });
    A.ellipse(ctx, 4, -18 + bob, 9, 13, '#ecd4aa', null, { noStroke: true, hl: false });
    line(ctx, [[-10, -34 + bob], [10, -10 + bob]], '#5e3e22', 2.4);
    // 弓（在前面）
    const bx = 22;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, -6 + bob);
    ctx.lineTo(bx, -54 + bob);
    ctx.stroke();
    curve(ctx, [bx, -6 + bob], [bx + 18, -30 + bob], [bx, -54 + bob], '#8a5a2e', 2.8);
    A.shape(ctx, (c) => A.roundRect(c, bx + 6, -34 + bob, 5, 8, 2), '#c8a068', null, { lw: 1.6, hl: false });
    A.ellipse(ctx, bx + 7, -30 + bob, 4.5, 4, FUR, FURS, { lw: 2, hl: false });
    // 頭
    const hx = 5 + look * 1.2;
    const hy = -48 + bob;
    A.ellipse(ctx, hx - 11, hy - 3, 3.5, 3.5, FURS, null, { lw: 2, hl: false });
    A.ellipse(ctx, hx, hy, 14, 12.5, FUR, FURS, { cel: [2, 2] });
    A.ellipse(ctx, hx + 8 + look, hy + 4, 7.5, 5.5, '#ecd4aa', null, { lw: 2, hl: false });
    dot(ctx, hx + 14 + look, hy + 1.5, 2.2, '#3a2418');
    A.shape(ctx, (c) => A.roundRect(c, hx + 9 + look, hy + 7, 4.5, 4, 1), '#ffffff', null, { lw: 1.4, hl: false });
    line(ctx, [[hx + 11.2 + look, hy + 7], [hx + 11.2 + look, hy + 11]], null, 1);
    whiskers(ctx, hx + 15 + look, hy + 4, 1, null, 6);
    const bl = blinkAt(t, 1.1, 2);
    A.eye(ctx, hx + 2, hy - 2, 2.4, 2.8, bl ? 'closed' : 'normal', look);
    A.eye(ctx, hx + 9, hy - 2.5, 2.2, 2.6, bl ? 'closed' : 'normal', look);
    A.blush(ctx, hx - 1, hy + 4, 2.6);
    // 毛皮帽：皮革帽身、毛茸茸的帽緣、後面垂著一條尾巴
    const tw = Math.sin(t * 2.2) * 2;
    A.shape(ctx, (c) => { c.moveTo(hx - 10, hy - 12); c.quadraticCurveTo(hx - 22, hy - 10 + tw * 0.3, hx - 23 + tw * 0.4, hy + 2); c.quadraticCurveTo(hx - 18, hy + 1, hx - 13, hy - 6); c.closePath(); }, '#8a7a6a', '#6a5a4c', { cel: [1, 1], lw: 2, hl: false });
    [[hx - 20, hy - 7], [hx - 22.5, hy - 2]].forEach(([x, y]) => line(ctx, [[x - 2, y], [x + 2.5, y + 1]], '#4a3a30', 1.8));
    A.shape(ctx, (c) => { c.moveTo(hx - 12, hy - 7); c.quadraticCurveTo(hx - 12, hy - 23, hx + 1, hy - 23); c.quadraticCurveTo(hx + 13, hy - 23, hx + 13, hy - 8); c.closePath(); }, '#7a5230', '#5e3e22', { cel: [2, 1.5], lw: 2.2, hl: [hx - 4, hy - 18, 3, 1.6] });
    A.shape(ctx, (c) => A.roundRect(c, hx - 14, hy - 11, 29, 6, 3), '#e0d6c4', '#c4b8a4', { cel: [1, 1], lw: 2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, hx - 15, hy - 8, 7, 12, 3), '#e0d6c4', '#c4b8a4', { cel: [1, 1], lw: 2, hl: false });
    ctx.save();
    ctx.translate(hx + 8, hy - 20);
    ctx.rotate(0.5 + Math.sin(t * 1.9) * 0.1);
    A.ellipse(ctx, 0, -5, 2.2, 6, '#e0584a', '#b8403a', { lw: 1.4, hl: false });
    ctx.restore();
  }

  // 雪豹劍士：灰白斑點毛、深藍袴，手按在腰間的刀柄上，冰藍色的眼睛冷冷的
  function snowleopard(ctx, t) {
    const bob = Math.sin(t * 1.5) * 0.7;
    const FUR = '#eceff3';
    const FURS = '#c6cdd8';
    const SPOT = '#5a6070';
    // 粗粗的長尾巴
    const tf = Math.sin(t * 1.8) * 4;
    const tp = [[-8, -20], [-34, -8 + tf * 0.2], [-30, -38 + tf]];
    curve(ctx, tp[0], tp[1], tp[2], FUR, 8);
    for (let i = 1; i <= 5; i++) {
      const u = i / 6;
      const x = (1 - u) * (1 - u) * tp[0][0] + 2 * (1 - u) * u * tp[1][0] + u * u * tp[2][0];
      const y = (1 - u) * (1 - u) * tp[0][1] + 2 * (1 - u) * u * tp[1][1] + u * u * tp[2][1];
      dot(ctx, x, y, 1.8, SPOT);
    }
    A.ellipse(ctx, tp[2][0], tp[2][1] - 1, 5.6, 5.6, FUR, FURS, { lw: 2, hl: false });
    ctx.strokeStyle = A.c(SPOT);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(tp[2][0], tp[2][1] - 1, 3.2, 0.2, 2.6);
    ctx.stroke();
    // 深藍袴
    A.shape(ctx, (c) => { c.moveTo(-11, -32 + bob); c.lineTo(11, -32 + bob); c.lineTo(17, -2); c.lineTo(2, -2); c.lineTo(0, -12); c.lineTo(-2, -2); c.lineTo(-17, -2); c.closePath(); }, '#2e3a5e', '#222c48', { cel: [2.5, 2] });
    line(ctx, [[-5, -29 + bob], [-9, -4]], '#1a2240', 1.3);
    line(ctx, [[6, -29 + bob], [10, -4]], '#1a2240', 1.3);
    A.ellipse(ctx, -10, -1, 6, 2.8, FURS, null, { lw: 2, hl: false });
    A.ellipse(ctx, 11, -1, 6, 2.8, FUR, FURS, { lw: 2, hl: false });
    // 上衣：白色內襯、灰藍短羽織
    A.shape(ctx, (c) => { c.moveTo(-11, -31 + bob); c.quadraticCurveTo(-13, -50 + bob, 0, -52 + bob); c.quadraticCurveTo(13, -50 + bob, 11, -31 + bob); c.closePath(); }, '#5a6a92', '#44527a', { cel: [2, 2], hl: false });
    A.shape(ctx, (c) => { c.moveTo(-1, -52 + bob); c.lineTo(5, -40 + bob); c.lineTo(9, -51 + bob); c.closePath(); }, '#f4f6fa', null, { lw: 1.8, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, -12, -34 + bob, 24, 4, 2), '#d8dce6', '#b8bcc8', { lw: 1.8, hl: false });
    // 圍巾（飄向身後）
    const fl = Math.sin(t * 2.6) * 3;
    A.shape(ctx, (c) => { c.moveTo(-6, -52 + bob); c.quadraticCurveTo(-14, -52 + bob + fl * 0.3, -22 + fl * 0.3, -46 + bob + fl); c.lineTo(-19 + fl * 0.3, -42 + bob + fl); c.quadraticCurveTo(-13, -46 + bob, -6, -46 + bob); c.closePath(); }, '#8fc8e8', '#6aa8cc', { cel: [1, 1.2], lw: 2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, -9, -54 + bob, 20, 6, 3), '#8fc8e8', '#6aa8cc', { cel: [1, 1], lw: 2, hl: false });
    // 刀：斜插在腰間，刀柄朝前，手按在刀柄上
    ctx.save();
    ctx.translate(4, -31 + bob);
    ctx.rotate(-0.28);
    A.shape(ctx, (c) => { c.moveTo(-36, -1.8); c.quadraticCurveTo(-18, -3.2, 0, -2.6); c.lineTo(0, 2.6); c.quadraticCurveTo(-18, 3.2, -36, 2.6); c.quadraticCurveTo(-38, 0.4, -36, -1.8); c.closePath(); }, '#3a2a3e', '#241a28', { cel: [0, 1], lw: 2, hl: false });
    line(ctx, [[-10, -3], [-10, 3]], '#d8a040', 1.4);
    A.shape(ctx, (c) => c.ellipse(1.5, 0, 2.2, 5, 0, 0, TAU), '#e0b040', '#b8862a', { lw: 1.8, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, 3.5, -2.3, 15, 4.6, 2), '#f4f6fa', null, { lw: 1.8, hl: false });
    ctx.strokeStyle = A.c('#2e3a5e');
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(5 + i * 3.3, -2.3);
      ctx.lineTo(6.8 + i * 3.3, 2.3);
      ctx.moveTo(6.8 + i * 3.3, -2.3);
      ctx.lineTo(5 + i * 3.3, 2.3);
      ctx.stroke();
    }
    A.shape(ctx, (c) => A.roundRect(c, 17.5, -2.6, 3, 5.2, 1), '#e0b040', null, { lw: 1.4, hl: false });
    ctx.restore();
    A.ellipse(ctx, 12, -35 + bob, 4.5, 4.2, FUR, FURS, { lw: 2, hl: false });
    // 頭
    const hx = 7;
    const hy = -63 + bob;
    const et = t % 5.3 < 0.2 ? -1.5 : 0;
    A.ellipse(ctx, hx - 9, hy - 10 + et, 4.5, 4.5, FUR, FURS, { lw: 2.2, hl: false });
    dot(ctx, hx - 9, hy - 10 + et, 1.8, SPOT);
    A.ellipse(ctx, hx + 5, hy - 11.5, 4.5, 4.5, FUR, FURS, { lw: 2.2, hl: false });
    dot(ctx, hx + 5, hy - 11.5, 1.8, '#e8b8c0');
    A.ellipse(ctx, hx, hy, 13.5, 12, FUR, FURS, { cel: [2, 2] });
    [[hx - 8, hy - 4, 2.2, 0.4], [hx - 3, hy - 8.5, 1.8, 1.2], [hx - 9, hy + 3, 1.8, 2.2]].forEach(([x, y, r, a]) => {
      ctx.strokeStyle = A.c(SPOT);
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, r, a, a + 4.2);
      ctx.stroke();
    });
    dot(ctx, hx + 1, hy - 10, 1, SPOT);
    dot(ctx, hx - 11, hy - 1, 1, SPOT);
    A.ellipse(ctx, hx + 9, hy + 4, 7.5, 5.5, '#ffffff', null, { lw: 2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(hx + 12, hy); c.lineTo(hx + 17, hy); c.lineTo(hx + 14.5, hy + 3); c.closePath(); }, '#9a7a86', null, { lw: 1.4, hl: false });
    whiskers(ctx, hx + 15, hy + 4, 1, '#8a92a0', 7);
    // 冷冷的冰藍色眼睛（上眼皮壓平）
    const bl = blinkAt(t, 0.75, 1.2);
    [[hx + 2, hy - 2.5, 3, 3.4], [hx + 9.5, hy - 3, 2.8, 3.2]].forEach(([x, y, rx, ry]) => {
      if (bl) return A.eye(ctx, x, y, rx, ry, 'closed');
      ctx.fillStyle = A.c('#2b1a12');
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c('#8fd0f0');
      ctx.beginPath();
      ctx.ellipse(x + 0.5, y + 0.5, rx * 0.75, ry * 0.75, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c('#2b1a12');
      ctx.beginPath();
      ctx.ellipse(x + 0.8, y + 0.5, rx * 0.25, ry * 0.6, 0, 0, TAU);
      ctx.fill();
      dot(ctx, x - 0.8, y - 0.6, 0.8, '#ffffff');
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, rx + 0.6, ry + 0.6, 0, 0, TAU);
      ctx.clip();
      ctx.fillStyle = A.c(FUR);
      ctx.fillRect(x - rx - 2, y - ry - 2, rx * 2 + 4, ry * 0.75 + 2);
      ctx.restore();
      line(ctx, [[x - rx - 0.5, y - ry * 0.25 - 0.6], [x + rx + 1, y - ry * 0.25 + 0.4]], null, 2.4);
    });
    // 嘴角微微上揚
    line(ctx, [[hx + 9, hy + 7.5], [hx + 13, hy + 7.8], [hx + 15, hy + 6.5]], null, 1.5);
  }

  // 丹頂鶴：優雅的旅行治療師，細長的腳，披著繡了藥草的包袱，腰間掛著小葫蘆
  function crane(ctx, t) {
    const sway = Math.sin(t * 1.2) * 1.5;
    const cyc = t % 8;
    const lift = cyc > 5 && cyc < 7.4 ? Math.min(1, (cyc - 5) * 3, (7.4 - cyc) * 3) : 0;
    const LEG = '#4a4a52';
    // 腳
    line(ctx, [[-3, 0], [-2, -14], [-3, -30]], null, 4.6);
    line(ctx, [[-3, 0], [-2, -14], [-3, -30]], LEG, 2.2);
    const kx = 6 + lift * 5;
    const ky = -14 - lift * 6;
    const fy = -lift * 12;
    line(ctx, [[5 - lift * 1, fy], [kx, ky], [4, -30]], null, 4.6);
    line(ctx, [[5 - lift * 1, fy], [kx, ky], [4, -30]], LEG, 2.2);
    line(ctx, [[-8, 0], [2, 0]], null, 2.4);
    line(ctx, [[0 - lift * 1, fy], [9 - lift * 3, fy + lift * 2]], null, 2.4);
    // 尾羽（黑色，垂在後面）
    A.shape(ctx, (c) => { c.moveTo(-12, -44); c.quadraticCurveTo(-26, -42, -30, -30); c.lineTo(-26, -32); c.lineTo(-27, -26); c.lineTo(-22, -30); c.lineTo(-20, -25); c.quadraticCurveTo(-14, -32, -6, -34); c.closePath(); }, '#2e2e36', '#1e1e24', { cel: [1.5, 1.5], lw: 2.2, hl: false });
    // 身體
    A.ellipse(ctx, 0, -40, 17, 10.5, '#ffffff', '#dfe4ec', { cel: [2.5, 2.5], rot: -0.12 });
    // 藥草包袱（斜背）
    // 小葫蘆
    const gs = Math.sin(t * 1.6) * 0.15;
    ctx.save();
    ctx.translate(8, -33);
    ctx.rotate(gs);
    line(ctx, [[0, 0], [0, 3]], '#b83a3a', 1.4);
    A.ellipse(ctx, 0, 5.5, 2.4, 2.4, '#e0a050', '#b87a30', { lw: 1.6, hl: false });
    A.ellipse(ctx, 0, 11, 4, 4.2, '#e0a050', '#b87a30', { lw: 1.6, hl: false });
    ctx.restore();
    // 翅膀（收起來，末端黑色飛羽）
    A.shape(ctx, (c) => { c.moveTo(12, -46); c.quadraticCurveTo(-2, -50, -14, -42); c.quadraticCurveTo(-20, -36, -18, -32); c.quadraticCurveTo(-6, -34, 8, -38); c.closePath(); }, '#f4f6fa', '#d8dde6', { cel: [1.5, 1.5], lw: 2.2, hl: false });
    // 藥草包袱（斜背，掛在翅膀下）
    line(ctx, [[10, -47], [-2, -30]], '#2e7a7a', 2.6);
    const bw = Math.sin(t * 1.6 + 1) * 0.6;
    A.shape(ctx, (c) => { c.moveTo(-14, -32); c.quadraticCurveTo(-16, -20 + bw, -6, -19 + bw); c.quadraticCurveTo(4, -20 + bw, 2, -32); c.quadraticCurveTo(-6, -35, -14, -32); c.closePath(); }, '#3aa0a0', '#2e7a7a', { cel: [1.5, 1.5], lw: 2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(-7, -32); c.lineTo(-11, -37); c.lineTo(-3, -36); c.closePath(); }, '#3aa0a0', null, { lw: 1.6, hl: false });
    A.ellipse(ctx, -8, -25 + bw, 3.6, 2, '#8ad06a', null, { rot: -0.6, lw: 1.2, hl: false });
    A.ellipse(ctx, -4, -26 + bw, 3.2, 1.8, '#6ab04a', null, { rot: 0.5, lw: 1.2, hl: false });
    // 脖子：黑色長頸
    const hx = 16 + sway * 0.6;
    const hy = -74 + Math.sin(t * 1.2 + 0.6) * 0.8;
    const neck = [[11, -45], [20 + sway * 0.3, -58], [hx - 2, hy + 4]];
    curve(ctx, neck[0], neck[1], neck[2], '#2e2e36', 5.5);
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(neck[0][0] - 1.5, neck[0][1] - 1);
    ctx.quadraticCurveTo(neck[1][0] - 2.5, neck[1][1], neck[2][0] - 3, neck[2][1] + 1);
    ctx.stroke();
    // 頭
    A.ellipse(ctx, hx, hy, 7.5, 6.5, '#ffffff', '#dfe4ec', { cel: [1, 1], lw: 2.2, hl: false });
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(hx, hy, 7.5, 6.5, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = A.c('#2e2e36');
    ctx.beginPath();
    ctx.moveTo(hx - 2, hy + 8);
    ctx.lineTo(hx + 1, hy - 1);
    ctx.lineTo(hx + 9, hy - 2);
    ctx.lineTo(hx + 9, hy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    A.ellipse(ctx, hx, hy, 7.5, 6.5, 'rgba(0,0,0,0)', null, { lw: 2.2, hl: false });
    A.shape(ctx, (c) => c.ellipse(hx - 0.5, hy - 5.5, 4.2, 2.6, -0.1, Math.PI, 0), '#e8303a', '#c02028', { lw: 1.8, hl: false });
    // 長嘴
    A.shape(ctx, (c) => { c.moveTo(hx + 5, hy - 1.5); c.lineTo(hx + 23, hy + 1.5); c.lineTo(hx + 5, hy + 2.5); c.closePath(); }, '#c8c4a0', '#a8a480', { cel: [0.5, 0.8], lw: 1.8, hl: false });
    // 眼：溫柔的
    const bl = blinkAt(t, 0.7, 2.4);
    A.ellipse(ctx, hx + 2, hy - 1.5, 2.8, 2.8, '#ffffff', null, { noStroke: true, hl: false });
    A.eye(ctx, hx + 2.2, hy - 1.5, 1.8, 2.2, bl ? 'closed' : 'normal', 0.4);
  }

  // 白角鹿：小鹿的媽媽，雪白優雅，淡金色的鹿角微微發光
  function whitedeer(ctx, t) {
    const bob = Math.sin(t * 1.3) * 0.8;
    const W = '#fbfaf6';
    const WS = '#dcd8e6';
    const ANT = '#f2dc96';
    const ANTS = '#d4b464';
    // 細長的腳
    [[-15, WS], [10, WS], [-9, W], [16, W]].forEach(([x, col]) => {
      A.shape(ctx, (c) => { c.moveTo(x - 3, -30); c.lineTo(x + 3, -30); c.lineTo(x + 2, -3); c.lineTo(x - 2, -3); c.closePath(); }, col, null, { lw: 2, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, x - 2.8, -4, 5.6, 4, 1.4), '#b8b4c4', null, { lw: 1.6, hl: false });
    });
    // 小尾巴、身體
    A.ellipse(ctx, -22, -40 + bob, 4, 3, W, null, { rot: -0.6, lw: 2, hl: false });
    A.ellipse(ctx, 0, -36 + bob, 22, 11.5, W, WS, { cel: [3, 3] });
    // 背上淡金色的斑點
    [[-10, -43], [-3, -46], [5, -44], [-14, -38], [-6, -40]].forEach(([x, y], i) => {
      ctx.save();
      ctx.globalAlpha *= 0.55 + Math.sin(t * 2 + i) * 0.2;
      A.ellipse(ctx, x, y + 2 + bob, 2, 1.5, '#f2dc96', null, { noStroke: true, hl: false });
      ctx.restore();
    });
    // 脖子
    const hx = 22;
    const hy = -56 + bob + Math.sin(t * 0.9) * 0.6;
    A.shape(ctx, (c) => { c.moveTo(8, -42 + bob); c.quadraticCurveTo(14, -50 + bob, hx - 7, hy + 1); c.lineTo(hx + 2, hy + 5); c.quadraticCurveTo(22, -42 + bob, 18, -32 + bob); c.closePath(); }, W, WS, { cel: [2, 1.5], lw: 2.4, hl: false });
    // 鹿角的光
    glow(ctx, hx - 2, hy - 16, 22, '255,236,170', 0.35 + Math.sin(t * 1.8) * 0.1);
    // 往兩邊張開的鹿角，每支兩根分叉
    const antler = (sx, sy, dir) => {
      curve(ctx, [sx, sy], [sx + dir * 3, sy - 12], [sx + dir * 11, sy - 21], ANT, 2.6);
      curve(ctx, [sx + dir * 2.2, sy - 8], [sx + dir * 1, sy - 14], [sx + dir * 2, sy - 20], ANT, 1.9);
      curve(ctx, [sx + dir * 6.5, sy - 16], [sx + dir * 13, sy - 15], [sx + dir * 16, sy - 17], ANT, 1.8);
    };
    antler(hx - 4, hy - 8, -1);
    antler(hx + 2, hy - 8.5, 1);
    // 耳朵
    A.ellipse(ctx, hx - 10, hy - 2, 7, 3.2, W, WS, { rot: -0.35, lw: 2, hl: false });
    A.ellipse(ctx, hx - 10, hy - 2, 4, 1.6, '#f4c8d0', null, { rot: -0.35, noStroke: true, hl: false });
    // 頭
    A.shape(ctx, (c) => { c.moveTo(hx - 8, hy - 2); c.quadraticCurveTo(hx - 7, hy - 10, hx + 1, hy - 9); c.quadraticCurveTo(hx + 7, hy - 8, hx + 10, hy - 2); c.quadraticCurveTo(hx + 17, hy + 1, hx + 16, hy + 5); c.quadraticCurveTo(hx + 12, hy + 9, hx + 3, hy + 8); c.quadraticCurveTo(hx - 8, hy + 7, hx - 8, hy - 2); c.closePath(); }, W, WS, { cel: [1.5, 1.5], hl: [hx - 2, hy - 5, 3, 1.8] });
    A.ellipse(ctx, hx + 7, hy - 8, 6, 2.8, W, WS, { rot: 0.4, lw: 2, hl: false });
    A.ellipse(ctx, hx + 7, hy - 8, 3.4, 1.3, '#f4c8d0', null, { rot: 0.4, noStroke: true, hl: false });
    A.ellipse(ctx, hx + 15, hy + 3, 2, 1.6, '#6a5a6a', null, { noStroke: true, hl: false });
    // 溫柔的眼睛與長睫毛
    const bl = blinkAt(t, 0.6, 0.5);
    if (bl) A.eye(ctx, hx + 3, hy, 2.8, 3.4, 'closed');
    else {
      A.eye(ctx, hx + 3, hy, 2.8, 3.6, 'normal', 0.6);
      line(ctx, [[hx + 0.6, hy - 2.6], [hx - 1.6, hy - 4.2]], null, 1.3);
      line(ctx, [[hx + 1.8, hy - 3.4], [hx + 0.8, hy - 5.6]], null, 1.3);
    }
    line(ctx, [[hx + 10, hy + 5.5], [hx + 12.5, hy + 6.3], [hx + 14.5, hy + 5.6]], null, 1.4);
    A.blush(ctx, hx + 2, hy + 4.5, 2.5);
    // 飄上去的光點
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.35 + i / 4) % 1;
      sparkle(ctx, hx - 14 + i * 7 + Math.sin(t + i * 2) * 3, hy - 4 - k * 26, 2.2, '#fff2b0', Math.sin(k * Math.PI));
    }
  }

  // ════════ 終章：時空間神殿 ════════

  // 老陸龜賢者：背上蓋著一座小神殿，白長眉白長鬍，脖子掛著流沙的沙漏墜子
  function tortoisesage(ctx, t) {
    const br = Math.sin(t * 0.9) * 0.8;
    const SKIN = '#a4b07e';
    const SKINS = '#7e8a5e';
    // 腳
    [[-20, SKINS], [10, SKINS], [-12, SKIN], [16, SKIN]].forEach(([x, col]) => {
      A.shape(ctx, (c) => A.roundRect(c, x - 5, -14, 10, 14, 4), col, null, { lw: 2.2, hl: false });
      [-2.5, 0.5, 3.5].forEach((dx) => dot(ctx, x + dx, -1.5, 1, '#e8e0c8'));
    });
    // 殼
    const shell = (c) => { c.moveTo(-31, -12); c.quadraticCurveTo(-33, -46, -6, -47); c.quadraticCurveTo(20, -47, 22, -12); c.closePath(); };
    A.shape(ctx, shell, '#8e6c46', '#6c5032', { cel: [3, 3], hl: [-16, -38, 6, 3] });
    ctx.save();
    ctx.beginPath();
    shell(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c('#5e4428');
    ctx.lineWidth = 1.8;
    const hex = (x, y, r) => {
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8);
      }
      ctx.stroke();
    };
    hex(-6, -30, 8);
    hex(-21, -24, 7);
    hex(9, -24, 7);
    // 殼上的舊年輪（像刻著的時間）
    ctx.strokeStyle = A.c('rgba(240,210,140,0.45)');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-6, -30, 4, 0, TAU);
    ctx.stroke();
    ctx.restore();
    A.shape(ctx, (c) => A.roundRect(c, -33, -16, 57, 6, 3), '#c8a870', '#a8885a', { lw: 2.2, hl: false });
    // 小神殿（在殼頂上）
    const tx = -6;
    const ty = -45;
    A.shape(ctx, (c) => A.roundRect(c, tx - 13, ty - 4, 26, 5, 1.5), '#e8e2d4', '#c8c0b0', { lw: 1.8, hl: false });
    const lamp = 0.7 + Math.sin(t * 3) * 0.15 + Math.sin(t * 7.3) * 0.06;
    glow(ctx, tx, ty - 10, 14, '255,210,120', 0.5 * lamp);
    A.shape(ctx, (c) => A.roundRect(c, tx - 7, ty - 15, 14, 11, 1), '#ffe6a0', null, { lw: 1.4, hl: false });
    [-10, -4, 4, 10].forEach((dx) => A.shape(ctx, (c) => A.roundRect(c, tx + dx - 1.4, ty - 16, 2.8, 12, 0.8), '#c8403a', null, { lw: 1.3, hl: false }));
    const roof = (c) => { c.moveTo(tx - 17, ty - 15); c.quadraticCurveTo(tx - 12, ty - 17, tx - 8, ty - 24); c.lineTo(tx + 8, ty - 24); c.quadraticCurveTo(tx + 12, ty - 17, tx + 17, ty - 15); c.quadraticCurveTo(tx, ty - 18, tx - 17, ty - 15); c.closePath(); };
    A.shape(ctx, roof, '#4a6a8a', '#3a5270', { cel: [1, 1], lw: 1.8, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, tx - 9, ty - 26, 18, 3, 1.2), '#3a5270', null, { lw: 1.4, hl: false });
    A.ellipse(ctx, tx, ty - 28, 2, 2, '#ffd35a', null, { lw: 1.2, hl: false });
    bell(ctx, tx - 16, ty - 13, 1.6, Math.sin(t * 2.5) * 0.4);
    bell(ctx, tx + 16, ty - 13, 1.6, Math.sin(t * 2.5 + 1) * 0.4);
    // 脖子與頭
    const hx = 32;
    const hy = -32 + br;
    A.shape(ctx, (c) => { c.moveTo(16, -14); c.quadraticCurveTo(20, -28 + br, hx - 6, hy - 4); c.lineTo(hx - 2, hy + 6); c.quadraticCurveTo(26, -16, 24, -12); c.closePath(); }, SKIN, SKINS, { cel: [1.5, 1.5], lw: 2.2, hl: false });
    line(ctx, [[20, -20 + br * 0.5], [24, -21 + br * 0.5]], SKINS, 1.2);
    line(ctx, [[21, -17 + br * 0.3], [25, -18 + br * 0.3]], SKINS, 1.2);
    // 沙漏墜子
    const px = 25;
    const py = -16 + br * 0.4;
    line(ctx, [[hx - 8, hy + 2], [px, py - 7], [hx - 1, hy + 6]], '#b88a2a', 1.3);
    const sand = (t % 6) / 6;
    const hg = (c) => { c.moveTo(px - 4, py - 5); c.lineTo(px + 4, py - 5); c.lineTo(px + 0.8, py); c.lineTo(px + 4, py + 5); c.lineTo(px - 4, py + 5); c.lineTo(px - 0.8, py); c.closePath(); };
    A.shape(ctx, hg, '#d8f0f8', null, { lw: 1.4, hl: false });
    ctx.save();
    ctx.beginPath();
    hg(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#f0c040');
    ctx.fillRect(px - 5, py - 5 + sand * 5, 10, 5 - sand * 5);
    ctx.fillRect(px - 5, py + 5 - sand * 4.5, 10, sand * 4.5 + 1);
    ctx.fillRect(px - 0.4, py - 1, 0.8, 6);
    ctx.restore();
    A.shape(ctx, (c) => A.roundRect(c, px - 5, py - 7, 10, 2.2, 1), '#e0b040', null, { lw: 1.2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, px - 5, py + 4.8, 10, 2.2, 1), '#e0b040', null, { lw: 1.2, hl: false });
    // 頭
    A.ellipse(ctx, hx + 1, hy - 1, 12, 10, SKIN, SKINS, { cel: [1.5, 1.5], hl: [hx - 3, hy - 6, 3.5, 1.8] });
    dot(ctx, hx + 11.5, hy - 1.5, 1, '#3a4028');
    // 白長鬍
    const bs = Math.sin(t * 1.3) * 1;
    A.shape(ctx, (c) => { c.moveTo(hx - 1, hy + 5); c.quadraticCurveTo(hx + 5, hy + 8, hx + 9, hy + 4); c.quadraticCurveTo(hx + 10, hy + 13, hx + 6 + bs, hy + 22); c.quadraticCurveTo(hx + 3, hy + 16, hx + 1 + bs * 0.5, hy + 17); c.quadraticCurveTo(hx - 2, hy + 11, hx - 1, hy + 5); c.closePath(); }, '#ffffff', '#dfe4ea', { cel: [1, 1], lw: 1.8, hl: false });
    // 慈祥的瞇瞇眼與垂下來的白眉
    const bl = blinkAt(t, 0.5, 1);
    if (bl) A.eye(ctx, hx + 3, hy - 1.5, 2.4, 2.6, 'closed');
    else lidEye(ctx, hx + 3, hy - 1.5, 2.4, 3, SKIN, 0.45, 0, 0.5);
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + 7, hy - 6.5);
    ctx.quadraticCurveTo(hx + 2, hy - 9, hx - 3, hy - 6);
    ctx.quadraticCurveTo(hx - 6, hy - 4, hx - 7, hy + bs * 0.4);
    ctx.stroke();
    line(ctx, [[hx + 5, hy + 3.5], [hx + 7.5, hy + 4], [hx + 9, hy + 3]], null, 1.4);
    A.blush(ctx, hx - 1, hy + 2.5, 2.2);
  }

  // 斯芬克斯貓：沒有毛的粉膚色貓咪，坐得直挺挺的，戴金色寬領、金耳環和額飾（終章商店）
  function sphinxcat(ctx, t) {
    const SK = '#ecbca4';
    const SKS = '#cc9880';
    const WR = '#b88068';
    const GOLD = '#f0c040';
    const GOLDS = '#c8962a';
    const br = Math.sin(t * 1.2) * 0.6;
    // 腳邊的一小堆金幣
    [[24, -2], [30, -2], [27, -5.5], [33, -5], [30, -9]].forEach(([x, y]) => A.ellipse(ctx, x, y, 4, 2, GOLD, GOLDS, { lw: 1.4, hl: false }));
    const sp = (t * 0.6) % 1;
    sparkle(ctx, 32, -14, 3.2, '#fff6c0', Math.sin(sp * Math.PI));
    // 後腿坐姿
    A.ellipse(ctx, -8, -16, 17, 16, SK, SKS, { cel: [2.5, 2.5], hl: [-14, -24, 4, 2.4] });
    A.ellipse(ctx, -12, -2, 8, 3, SKS, null, { lw: 2, hl: false });
    // 胸口
    A.ellipse(ctx, 6, -30 + br, 11, 17, SK, SKS, { cel: [2, 2] });
    // 前腳
    [[5, SKS], [12, SK]].forEach(([x, col]) => {
      A.shape(ctx, (c) => A.roundRect(c, x - 3.5, -24, 7, 23, 3.5), col, null, { lw: 2.2, hl: false });
      A.ellipse(ctx, x + 1, -1.5, 4.5, 2.6, col, null, { lw: 2, hl: false });
    });
    A.shape(ctx, (c) => A.roundRect(c, 8, -18, 8, 3.5, 1.5), GOLD, GOLDS, { lw: 1.6, hl: false });
    // 尾巴繞到前面
    const tf = Math.sin(t * 2) * 3;
    curve(ctx, [-22, -8], [-14, 4], [2, 0 + tf * 0.1], SK, 3.6);
    curve(ctx, [2, 0 + tf * 0.1], [8, -2], [10 + tf * 0.5, -8 - Math.abs(tf) * 0.4], SK, 3.2);
    A.shape(ctx, (c) => A.roundRect(c, -8, -1.5, 3.5, 5, 1.2), GOLD, null, { lw: 1.3, hl: false });
    // 頭
    const hx = 9;
    const hy = -52 + br;
    const et = t % 4.7 < 0.18 ? 2 : 0;
    const ear = (pts, twitch) => {
      A.shape(ctx, (c) => { c.moveTo(pts[0], pts[1]); c.quadraticCurveTo(pts[2] - 3, pts[3] + 10, pts[2], pts[3] + twitch); c.quadraticCurveTo(pts[4], pts[5] - 8, pts[4], pts[5]); c.closePath(); }, SK, SKS, { cel: [1, 1], lw: 2.2, hl: false });
    };
    ear([hx - 12, hy - 4, hx - 17, hy - 27, hx - 2, hy - 12], 0);
    A.shape(ctx, (c) => { c.moveTo(hx - 10, hy - 8); c.lineTo(hx - 15, hy - 23); c.lineTo(hx - 5, hy - 12); c.closePath(); }, '#f4a8a8', null, { noStroke: true, hl: false });
    ear([hx + 1, hy - 12, hx + 11, hy - 28, hx + 14, hy - 3], et);
    A.shape(ctx, (c) => { c.moveTo(hx + 4, hy - 11); c.lineTo(hx + 10, hy - 24 + et); c.lineTo(hx + 12, hy - 7); c.closePath(); }, '#f4a8a8', null, { noStroke: true, hl: false });
    // 金耳環
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.arc(hx + 14, hy - 5, 3, 0.2, TAU - 0.9);
    ctx.stroke();
    ctx.strokeStyle = A.c(GOLD);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 臉：倒三角
    A.shape(ctx, (c) => { c.moveTo(hx - 12, hy - 3); c.quadraticCurveTo(hx - 11, hy - 13, hx + 1, hy - 13); c.quadraticCurveTo(hx + 13, hy - 12, hx + 15, hy - 1); c.quadraticCurveTo(hx + 17, hy + 6, hx + 8, hy + 10); c.quadraticCurveTo(hx - 2, hy + 12, hx - 8, hy + 7); c.quadraticCurveTo(hx - 13, hy + 3, hx - 12, hy - 3); c.closePath(); }, SK, SKS, { cel: [2, 2], hl: [hx - 5, hy - 8, 3.5, 2] });
    // 額頭的皺紋
    [[-3, -9.5], [0, -8], [3, -9.5]].forEach(([dx, dy]) => {
      ctx.strokeStyle = A.c(WR);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(hx + 3 + dx, hy + dy + 3, 3, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
    });
    // 金額飾與藍寶石
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(hx - 11, hy - 6);
    ctx.quadraticCurveTo(hx + 2, hy - 14, hx + 14, hy - 5);
    ctx.stroke();
    ctx.strokeStyle = A.c(GOLD);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    A.shape(ctx, (c) => { c.moveTo(hx + 3, hy - 14); c.lineTo(hx + 5.5, hy - 11); c.lineTo(hx + 3, hy - 7.5); c.lineTo(hx + 0.5, hy - 11); c.closePath(); }, '#3a6ac8', '#2a4a9a', { lw: 1.4, hl: false });
    // 眼睛：大大的杏眼，綠金色、直立瞳孔、埃及式眼線
    const bl = blinkAt(t, 0.8, 0.2);
    const look = t % 6 < 3 ? 0.4 : -0.3;
    [[hx + 1, hy - 1, 3.4, 3.6], [hx + 10, hy - 1.5, 3.1, 3.4]].forEach(([x, y, rx, ry], i) => {
      if (bl) {
        A.eye(ctx, x, y, rx, ry, 'closed');
      } else {
        A.shape(ctx, (c) => { c.moveTo(x - rx, y); c.quadraticCurveTo(x, y - ry * 1.3, x + rx, y - ry * 0.3); c.quadraticCurveTo(x, y + ry * 1.2, x - rx, y); c.closePath(); }, '#b8d84a', null, { lw: 1.6, hl: false });
        ctx.fillStyle = A.c('#2b1a12');
        ctx.beginPath();
        ctx.ellipse(x + look, y - 0.2, 0.9, ry * 0.75, 0, 0, TAU);
        ctx.fill();
        dot(ctx, x - rx * 0.4, y - ry * 0.35, 0.8, '#ffffff');
      }
      if (i === 1) line(ctx, [[x + rx - 0.5, y - ry * 0.3], [x + rx + 3, y - ry * 0.9]], null, 1.8);
      else line(ctx, [[x - rx + 0.3, y], [x - rx - 2.5, y + 1]], null, 1.8);
    });
    // 鼻子與嘴
    A.shape(ctx, (c) => { c.moveTo(hx + 12.5, hy + 3); c.lineTo(hx + 16, hy + 3); c.lineTo(hx + 14.3, hy + 5.4); c.closePath(); }, '#e88a98', null, { lw: 1.3, hl: false });
    line(ctx, [[hx + 11.5, hy + 7], [hx + 14.3, hy + 7.4], [hx + 16, hy + 6.4]], null, 1.4);
    A.blush(ctx, hx - 4, hy + 4, 2.6);
    // 寬領（青金石藍、金、綠松石）
    const collar = (r0, r1, col, sh) => A.shape(ctx, (c) => { c.arc(hx + 1, hy + 4, r1, 0.18 * Math.PI, 0.9 * Math.PI); c.arc(hx + 1, hy + 4, r0, 0.9 * Math.PI, 0.18 * Math.PI, true); c.closePath(); }, col, sh, { lw: 1.6, hl: false, shadeY: hy + 14 });
    collar(9, 12.5, GOLD, GOLDS);
    collar(12.5, 15.5, '#2e5aa8', '#244a8a');
    collar(15.5, 18.5, GOLD, GOLDS);
    for (let i = 0; i < 7; i++) {
      const a = (0.24 + (i / 6) * 0.6) * Math.PI;
      dot(ctx, hx + 1 + Math.cos(a) * 17, hy + 4 + Math.sin(a) * 17, 1.2, '#3ab0a8');
    }
  }

  // 雲鬃的靈：上一代守葉獸。像主角的小獅子，但老一點、鬃毛更長，整隻由金色的光構成、半透明地飄著，手邊有一片楓葉
  const CM = {
    body: '#ffe38e',
    shade: '#f2c064',
    mane: '#ffcf5a',
    maneS: '#eaa23a',
    cream: '#fff7da',
    ear: '#ffc8a0',
    far: '#f6d078',
    farS: '#e0ac56',
    nose: '#a8682e',
    tuft: '#ff8a3a',
    tuftS: '#e0602a',
  };
  let cmCanvas = null;
  function cmMane(c, cx, cy, r, bumps, bulge) {
    for (let i = 0; i <= bumps; i++) {
      const a = (i / bumps) * TAU;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) c.moveTo(x, y);
      else {
        const am = ((i - 0.5) / bumps) * TAU;
        c.quadraticCurveTo(cx + Math.cos(am) * (r + bulge), cy + Math.sin(am) * (r + bulge), x, y);
      }
    }
    c.closePath();
  }
  function cloudLion(ctx, t) {
    const bob = Math.sin(t * 1.6) * 1;
    const leg = (x, fill, shade) => A.shape(ctx, (c) => A.roundRect(c, x - 5, -15, 10, 15, 5), fill, shade, { shadeY: -5, lw: 2.5 });
    leg(-11, CM.far, CM.farS);
    leg(9, CM.far, CM.farS);
    // 尾巴：末端是一團雲
    const sw = Math.sin(t * 1.5) * 3;
    const tipX = -35 + sw * 0.3;
    const tipY = -38 + bob;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, -22 + bob);
    ctx.quadraticCurveTo(-32, -24 + bob, tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = A.c(CM.body);
    ctx.lineWidth = 3.5;
    ctx.stroke();
    A.shape(ctx, (c) => cmMane(c, tipX - 1, tipY - 4, 5, 6, 4), CM.mane, CM.maneS, { cel: [1.5, 1.5], lw: 2.4 });
    // 身體
    A.ellipse(ctx, -1, -20 + bob, 21, 14, CM.body, CM.shade, { cel: [3, 3] });
    A.ellipse(ctx, 6, -15 + bob, 10, 7, CM.cream, null, { noStroke: true, hl: false });
    leg(-7, CM.body, CM.shade);
    leg(13, CM.body, CM.shade);
    const hx = 9;
    const hy = -45 + bob;
    // 長長的雲鬃：外層往後飄的長毛＋主角那樣的一圈圓鬃
    const fl = Math.sin(t * 1.3) * 2;
    A.shape(ctx, (c) => {
      c.moveTo(hx - 6, hy - 22);
      c.quadraticCurveTo(hx - 26, hy - 24, hx - 34 + fl, hy - 8);
      c.quadraticCurveTo(hx - 30 + fl, hy - 6, hx - 36 + fl, hy + 4);
      c.quadraticCurveTo(hx - 28 + fl, hy + 4, hx - 30 + fl * 0.6, hy + 16);
      c.quadraticCurveTo(hx - 16, hy + 20, hx - 6, hy + 22);
      c.closePath();
    }, CM.maneS, null, { lw: 2.6, hl: false });
    A.shape(ctx, (c) => cmMane(c, hx - 4, hy - 1, 22, 13, 9), CM.mane, CM.maneS, { cel: [4, 4] });
    // 耳朵
    A.ellipse(ctx, hx - 10, hy - 20, 6.5, 6.5, CM.mane, CM.maneS, { lw: 2.5, hl: false });
    A.ellipse(ctx, hx - 10, hy - 20, 3, 3, CM.ear, null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx + 8, hy - 21, 6.5, 6.5, CM.mane, CM.maneS, { lw: 2.5, hl: false });
    A.ellipse(ctx, hx + 8, hy - 21, 3, 3, CM.ear, null, { noStroke: true, hl: false });
    // 頭
    A.ellipse(ctx, hx, hy, 19, 17.5, CM.body, CM.shade, { cel: [3, 3.5] });
    // 額頭上的楓葉鬃毛（跟主角一樣）
    maple(ctx, hx - 1, hy - 20, 9, -0.15, CM.tuft, CM.tuftS);
    // 嘴邊與下巴的鬍鬚（老了）
    A.shape(ctx, (c) => { c.moveTo(hx + 5, hy + 11); c.quadraticCurveTo(hx + 10, hy + 15, hx + 17, hy + 11); c.lineTo(hx + 14, hy + 20); c.lineTo(hx + 11, hy + 16); c.lineTo(hx + 8, hy + 21); c.lineTo(hx + 7, hy + 15); c.closePath(); }, CM.mane, CM.maneS, { cel: [1, 1], lw: 2, hl: false });
    A.ellipse(ctx, hx + 11, hy + 7, 9, 6.5, CM.cream, null, { lw: 2, hl: false });
    ctx.fillStyle = A.c(CM.nose);
    ctx.beginPath();
    ctx.moveTo(hx + 12.8, hy + 1.6);
    ctx.quadraticCurveTo(hx + 16, hy + 0.2, hx + 19.2, hy + 1.6);
    ctx.quadraticCurveTo(hx + 17.6, hy + 5, hx + 16, hy + 5);
    ctx.quadraticCurveTo(hx + 14.4, hy + 5, hx + 12.8, hy + 1.6);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + 16, hy + 5);
    ctx.lineTo(hx + 16, hy + 7);
    ctx.moveTo(hx + 12.6, hy + 7.4);
    ctx.quadraticCurveTo(hx + 14.3, hy + 9.8, hx + 16, hy + 7);
    ctx.quadraticCurveTo(hx + 17.7, hy + 9.8, hx + 19.4, hy + 7.4);
    ctx.stroke();
    // 溫柔的眼睛（眼皮半垂）＋長長的白金色眉毛
    // 大多時候是瞇著眼的溫柔笑臉，偶爾睜開看看你
    const open = t % 7 > 4.5 && t % 7 < 6.6;
    if (open) {
      A.eye(ctx, hx + 2, hy - 3, 3.9, 5.2, 'normal', 0.8);
      A.eye(ctx, hx + 12, hy - 4, 3.6, 5, 'normal', 0.8);
    } else {
      A.eye(ctx, hx + 2, hy - 1.5, 4, 3.4, 'closed');
      A.eye(ctx, hx + 12, hy - 2.5, 3.7, 3.2, 'closed');
    }
    ctx.strokeStyle = A.c('#fffbee');
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy - 10);
    ctx.quadraticCurveTo(hx + 1, hy - 12.5, hx + 5, hy - 10.5);
    ctx.moveTo(hx + 10, hy - 11.5);
    ctx.quadraticCurveTo(hx + 14, hy - 13.5, hx + 17, hy - 11);
    ctx.stroke();
    A.blush(ctx, hx - 5, hy + 6, 4.5);
  }
  function cloudmane(ctx, t) {
    const S = 2;
    const W = 150;
    const H = 150;
    const OX = 72;
    const OY = 118;
    if (!cmCanvas) {
      cmCanvas = document.createElement('canvas');
      cmCanvas.width = W * S;
      cmCanvas.height = H * S;
    }
    const g = cmCanvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, W * S, H * S);
    const lift = -5 + Math.sin(t * 1.4) * 2.5;
    g.setTransform(S * 1.04, 0, 0, S * 1.04, OX * S, OY * S);
    g.translate(0, lift);
    // 光做成的身體：描邊用暖金色取代深棕
    const oldOut = A.OUT;
    A.OUT = '#b9822e';
    try {
      cloudLion(g, t);
    } finally {
      A.OUT = oldOut;
    }
    // 腳底慢慢淡掉，像從光裡長出來
    g.setTransform(S, 0, 0, S, OX * S, OY * S);
    g.globalCompositeOperation = 'destination-out';
    const fade = g.createLinearGradient(0, -26, 0, 2);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = fade;
    g.fillRect(-OX, -26, W, 40);
    g.globalCompositeOperation = 'source-over';

    ctx.save();
    // 背後的光暈
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, -46 + lift, 62, '255,214,110', 0.32 + Math.sin(t * 2) * 0.06);
    ctx.restore();
    ctx.globalAlpha *= 0.74 + Math.sin(t * 2.2) * 0.06;
    ctx.drawImage(cmCanvas, -OX, -OY, W, H);
    ctx.restore();
    // 往上飄的光點
    for (let i = 0; i < 7; i++) {
      const k = (t * 0.3 + i / 7) % 1;
      const x = -30 + ((i * 23) % 64) + Math.sin(t * 1.5 + i) * 4;
      sparkle(ctx, x, -6 - k * 78, 1.6 + (i % 3) * 0.6, i % 2 ? '#fff4c0' : '#ffd06a', Math.sin(k * Math.PI) * 0.9);
    }
    // 手邊飄著的一片楓葉
    const lx = 34 + Math.sin(t * 1.1) * 3;
    const ly = -30 + lift + Math.sin(t * 1.7) * 4;
    glow(ctx, lx, ly, 16, '255,150,70', 0.45);
    maple(ctx, lx, ly, 7.5, Math.sin(t * 1.3) * 0.3 + 0.2, '#ff8a3a', '#d8582a');
    line(ctx, [[lx + 1, ly + 5], [lx + 3, ly + 10]], '#b04a22', 1.4);
  }

  Object.assign(A.NPC_DRAW, {
    foxmiko, yakelder, harekid, marmot, snowleopard, crane, whitedeer,
    tortoisesage, sphinxcat, cloudmane,
  });

  // ════════ 營地建築 ════════
  function campSign(ctx, sx, y, text) {
    ctx.fillStyle = A.c('#6b4428');
    ctx.fillRect(sx - 3, y - 60, 6, 60);
    A.shape(ctx, (c) => A.roundRect(c, sx - 46, y - 84, 92, 30, 6), '#c8905a', '#a8703c', { cel: [2, 2] });
    ctx.font = 'bold 16px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = A.c('#4a2e1f');
    ctx.fillText(text, sx, y - 68);
  }
  function sag(x1, y1, x2, y2, drop) {
    const mx = (x1 + x2) / 2;
    const my = Math.max(y1, y2) + drop;
    return {
      draw(ctx, col, lw) {
        ctx.strokeStyle = A.c(col);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(mx, my, x2, y2);
        ctx.stroke();
      },
      at(u) {
        return [
          (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2,
          (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2,
        ];
      },
    };
  }

  // ── 第四章：霜鈴村（雪山村落）──
  // 積雪的屋頂：木頭屋頂＋一層厚厚鼓鼓的雪＋屋簷下的冰柱
  function snowRoof(ctx, cx, eaveY, half, h, t) {
    const th = Math.max(9, Math.min(15, half * 0.14));
    const roof = (c) => { c.moveTo(cx - half, eaveY); c.lineTo(cx, eaveY - h); c.lineTo(cx + half, eaveY); c.lineTo(cx + half - 6, eaveY + th * 0.7); c.lineTo(cx, eaveY - h + th); c.lineTo(cx - half + 6, eaveY + th * 0.7); c.closePath(); };
    A.shape(ctx, roof, '#6e4a36', '#56382a', { cel: [3, 3] });
    // 一層鼓鼓的雪，下緣一團團往下垂
    const lumpy = (c, x0, y0, x1, y1, n, amp) => {
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        const um = (i - 0.5) / n;
        c.quadraticCurveTo(x0 + (x1 - x0) * um, y0 + (y1 - y0) * um + amp * (i % 2 ? 1 : 0.6), x0 + (x1 - x0) * u, y0 + (y1 - y0) * u);
      }
    };
    const sn = Math.max(9, th * 0.9);
    const n = Math.max(3, Math.round(half / 16));
    A.shape(ctx, (c) => {
      c.moveTo(cx - half - 7, eaveY + 3);
      c.quadraticCurveTo(cx - half - 10, eaveY - sn, cx - half + 2, eaveY - sn * 0.9);
      c.lineTo(cx - 8, eaveY - h - sn + 1);
      c.quadraticCurveTo(cx, eaveY - h - sn - 5, cx + 8, eaveY - h - sn + 1);
      c.lineTo(cx + half - 2, eaveY - sn * 0.9);
      c.quadraticCurveTo(cx + half + 10, eaveY - sn, cx + half + 7, eaveY + 3);
      lumpy(c, cx + half + 7, eaveY + 3, cx, eaveY - h + 4, n, 6);
      lumpy(c, cx, eaveY - h + 4, cx - half - 7, eaveY + 3, n, 6);
      c.closePath();
    }, '#ffffff', '#d4e0ee', { cel: [2.5, 2.5], hl: false, lw: 2.4 });
    // 冰柱
    const m = Math.min(6, Math.floor(half / 16) * 2);
    for (let i = 0; i < m; i++) {
      const s = i % 2 ? 1 : -1;
      const x = cx + s * (half - 10 - Math.floor(i / 2) * 14);
      const len = 7 + ((i * 7) % 5) * 2 + Math.sin(t * 0.8 + i) * 0.5;
      const slope = (h - th * 0.3) / (half - 6);
      const yy = eaveY + th * 0.7 - Math.max(0, half - 6 - Math.abs(x - cx)) * slope + 1;
      A.shape(ctx, (c) => { c.moveTo(x - 2.6, yy); c.lineTo(x + 2.6, yy); c.lineTo(x, yy + len); c.closePath(); }, '#dff4ff', null, { lw: 1.4, hl: false });
    }
  }
  // 玻璃風鈴：圓頂＋底下飄的短冊
  function windBell(ctx, x, y, t, k, col) {
    const sw = Math.sin(t * 2.4 + k * 1.7) * 0.25 + Math.sin(t * 5.1 + k) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sw * 0.4);
    line(ctx, [[0, 0], [0, 5]], '#5a4030', 1);
    A.shape(ctx, (c) => { c.moveTo(-5, 11); c.quadraticCurveTo(-5, 4, 0, 4); c.quadraticCurveTo(5, 4, 5, 11); c.closePath(); }, col || '#cdefff', null, { lw: 1.6, hl: false });
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(-3, 6, 1.5, 3);
    ctx.rotate(sw);
    line(ctx, [[0, 9], [0, 16]], '#5a4030', 0.9);
    A.shape(ctx, (c) => A.roundRect(c, -2.5, 16, 5, 12, 1), ['#ff8a8a', '#fff2a0', '#a8e0a0', '#b8c8ff'][k % 4], null, { lw: 1.2, hl: false });
    ctx.restore();
  }
  function snowPile(ctx, x, y, w, h) {
    A.shape(ctx, (c) => { c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 0.8, y - h, x - w * 0.2, y - h * 0.9); c.quadraticCurveTo(x + w * 0.3, y - h * 1.2, x + w * 0.7, y - h * 0.6); c.quadraticCurveTo(x + w, y - h * 0.3, x + w, y); c.closePath(); }, '#ffffff', '#d4e0ee', { cel: [2, 1.5], lw: 2.2, hl: false });
  }
  function paperLantern(ctx, x, y, t, k, col) {
    const bob = Math.sin(t * 1.6 + k * 2) * 1.2;
    const on = 0.8 + Math.sin(t * 2.3 + k) * 0.12;
    glow(ctx, x, y + 14 + bob, 30, '255,190,110', 0.5 * on);
    line(ctx, [[x, y], [x, y + 4 + bob]], '#3a2a20', 1.4);
    A.shape(ctx, (c) => A.roundRect(c, x - 4, y + 3 + bob, 8, 3, 1), '#3a2a20', null, { lw: 1.2, hl: false });
    A.ellipse(ctx, x, y + 14 + bob, 8, 10, col || '#fff0d8', '#f0d0a8', { lw: 2, hl: false });
    ctx.strokeStyle = A.c('rgba(160,90,50,0.5)');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 10 + bob); ctx.lineTo(x + 7, y + 10 + bob);
    ctx.moveTo(x - 7.5, y + 16 + bob); ctx.lineTo(x + 7.5, y + 16 + bob);
    ctx.stroke();
    A.shape(ctx, (c) => A.roundRect(c, x - 4, y + 23 + bob, 8, 3, 1), '#3a2a20', null, { lw: 1.2, hl: false });
  }

  A.CAMP_DRAW[4] = function (ctx, x1, x2, y, t) {
    const mid = (x1 + x2) / 2;
    ctx.save();
    const lit = 0.85 + Math.sin(t * 1.7) * 0.08;

    // 木屋（左）
    const hx = x1 + 110;
    A.shape(ctx, (c) => A.roundRect(c, hx - 88, y - 14, 176, 14, 3), '#a8a4a0', '#8a8680', { cel: [4, 2] });
    // 煙囪
    A.shape(ctx, (c) => A.roundRect(c, hx + 34, y - 176, 22, 50, 2), '#9a8a80', '#7e6e64', { cel: [3, 0] });
    A.shape(ctx, (c) => A.roundRect(c, hx + 31, y - 184, 28, 10, 5), '#ffffff', '#d4e0ee', { lw: 2.2, hl: false });
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.25 + k / 4) % 1;
      ctx.fillStyle = 'rgba(235,240,248,' + (0.55 * Math.sin(ph * Math.PI)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(hx + 45 + Math.sin(ph * 4 + k) * 6 + ph * 20, y - 190 - ph * 90, 7 + ph * 14, 0, TAU);
      ctx.fill();
    }
    // 圓木牆
    A.shape(ctx, (c) => A.roundRect(c, hx - 78, y - 100, 156, 88, 3), '#a8744a', '#8a5a36', { cel: [6, 3] });
    ctx.strokeStyle = A.c('rgba(70,40,20,0.45)');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 1; k < 8; k++) { ctx.moveTo(hx - 76, y - 100 + k * 11); ctx.lineTo(hx + 76, y - 100 + k * 11); }
    ctx.stroke();
    for (let k = 0; k < 8; k++) {
      A.ellipse(ctx, hx - 80, y - 94 + k * 11, 4, 5, '#c8945e', null, { lw: 1.4, hl: false });
      A.ellipse(ctx, hx + 80, y - 94 + k * 11, 4, 5, '#c8945e', null, { lw: 1.4, hl: false });
    }
    // 門
    A.shape(ctx, (c) => { c.moveTo(hx - 50, y - 12); c.lineTo(hx - 50, y - 62); c.quadraticCurveTo(hx - 32, y - 74, hx - 14, y - 62); c.lineTo(hx - 14, y - 12); c.closePath(); }, '#6a4430', '#56362a', { shadeY: y - 30, lw: 2.5 });
    A.ellipse(ctx, hx - 20, y - 36, 2, 2, '#ffd35a', null, { noStroke: true, hl: false });
    // 門上的冬青花圈
    A.shape(ctx, (c) => { c.arc(hx - 32, y - 52, 8, 0, TAU); c.moveTo(hx - 28, y - 52); c.arc(hx - 32, y - 52, 4, 0, TAU, true); }, '#4a8a5a', null, { lw: 1.6, hl: false });
    dot(ctx, hx - 36, y - 46, 1.6, '#e0484a');
    dot(ctx, hx - 32, y - 45, 1.6, '#e0484a');
    // 亮燈的窗
    const wx = hx + 30;
    glow(ctx, wx, y - 58, 44, '255,200,120', 0.4 * lit);
    A.shape(ctx, (c) => A.roundRect(c, wx - 20, y - 76, 40, 34, 3), '#ffe0a0', '#ffd080', { lw: 2.6, hl: false, shadeY: y - 50 });
    line(ctx, [[wx, y - 76], [wx, y - 42]], '#6a4430', 2.6);
    line(ctx, [[wx - 20, y - 59], [wx + 20, y - 59]], '#6a4430', 2.6);
    A.shape(ctx, (c) => A.roundRect(c, wx - 24, y - 44, 48, 6, 3), '#ffffff', '#d4e0ee', { lw: 2, hl: false });
    snowRoof(ctx, hx, y - 96, 102, 72, t);
    // 屋簷下的風鈴
    windBell(ctx, hx + 72, y - 88, t, 0, '#cdefff');
    windBell(ctx, hx - 72, y - 88, t, 1, '#ffd8e8');
    // 木柴堆
    [[-2, 0], [10, 0], [22, 0], [4, -10], [16, -10], [10, -20]].forEach(([dx, dy]) => {
      A.ellipse(ctx, hx + 96 + dx, y - 6 + dy, 6, 6, '#b88a5a', '#96683e', { lw: 2, hl: false });
      A.ellipse(ctx, hx + 96 + dx, y - 6 + dy, 2.5, 2.5, '#e0c090', null, { noStroke: true, hl: false });
    });
    A.shape(ctx, (c) => { c.moveTo(hx + 86, y - 24); c.quadraticCurveTo(hx + 106, y - 38, hx + 124, y - 22); c.quadraticCurveTo(hx + 106, y - 28, hx + 86, y - 24); c.closePath(); }, '#ffffff', null, { lw: 1.8, hl: false });

    // 山莊（右）：兩層樓，一樓是店面
    const lx = x2 - 120;
    const LW = 200;
    A.shape(ctx, (c) => A.roundRect(c, lx - LW / 2 - 6, y - 16, LW + 12, 16, 3), '#a8a4a0', '#8a8680', { cel: [4, 2] });
    A.shape(ctx, (c) => A.roundRect(c, lx - LW / 2, y - 104, LW, 90, 2), '#f0e4d0', '#dccaae', { cel: [6, 2] });
    ctx.fillStyle = A.c('#7a4a30');
    for (let k = 0; k <= 4; k++) ctx.fillRect(lx - LW / 2 + k * (LW / 4) - 4, y - 104, 8, 90);
    ctx.fillRect(lx - LW / 2, y - 104, LW, 7);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = A.LW;
    ctx.strokeRect(lx - LW / 2, y - 104, LW, 90);
    // 二樓
    A.shape(ctx, (c) => A.roundRect(c, lx - 70, y - 168, 140, 66, 2), '#a8744a', '#8a5a36', { cel: [5, 2] });
    ctx.strokeStyle = A.c('rgba(70,40,20,0.45)');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 1; k < 6; k++) { ctx.moveTo(lx - 68, y - 168 + k * 11); ctx.lineTo(lx + 68, y - 168 + k * 11); }
    ctx.stroke();
    [-38, 38].forEach((dx) => {
      glow(ctx, lx + dx, y - 138, 30, '255,200,120', 0.35 * lit);
      A.shape(ctx, (c) => A.roundRect(c, lx + dx - 13, y - 152, 26, 28, 12), '#ffe0a0', '#ffd080', { lw: 2.4, hl: false, shadeY: y - 132 });
      line(ctx, [[lx + dx, y - 152], [lx + dx, y - 124]], '#6a4430', 2);
    });
    // 陽台欄杆
    A.shape(ctx, (c) => A.roundRect(c, lx - 84, y - 110, 168, 8, 2), '#8a5a36', null, { lw: 2.2, hl: false });
    ctx.strokeStyle = A.c('#8a5a36');
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) { ctx.moveTo(lx - 80 + k * 13.3, y - 126); ctx.lineTo(lx - 80 + k * 13.3, y - 110); }
    ctx.stroke();
    A.shape(ctx, (c) => A.roundRect(c, lx - 84, y - 130, 168, 6, 2), '#8a5a36', null, { lw: 2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, lx - 86, y - 134, 172, 6, 3), '#ffffff', '#d4e0ee', { lw: 1.8, hl: false });
    // 店門與暖簾
    A.shape(ctx, (c) => A.roundRect(c, lx - 34, y - 88, 68, 74, 2), '#5a3a2a', '#4a2e20', { lw: 2.4, hl: false });
    glow(ctx, lx, y - 40, 50, '255,200,120', 0.35 * lit);
    const sw = Math.sin(t * 1.4) * 2;
    for (let k = 0; k < 3; k++) {
      const nx0 = lx - 32 + k * 22;
      A.shape(ctx, (c) => { c.moveTo(nx0, y - 88); c.lineTo(nx0 + 20, y - 88); c.lineTo(nx0 + 20 + sw, y - 52); c.lineTo(nx0 + sw, y - 52); c.closePath(); }, '#2e6a8a', '#245470', { lw: 2, hl: false, shadeY: y - 58 });
    }
    // 暖簾上的鈴鐺記號
    bell(ctx, lx + sw * 0.5, y - 70, 6, 0, '#ffe6a0', '#e0c070');
    // 店門兩側的貨架：毛毯與登山繩
    const shelf = (sx) => {
      A.shape(ctx, (c) => A.roundRect(c, sx - 22, y - 78, 44, 50, 2), '#ffe0a0', '#ffd080', { lw: 2.4, hl: false, shadeY: y - 40 });
      glow(ctx, sx, y - 54, 34, '255,200,120', 0.3 * lit);
      line(ctx, [[sx - 22, y - 54], [sx + 22, y - 54]], '#6a4430', 2.4);
      A.shape(ctx, (c) => A.roundRect(c, sx - 18, y - 70, 14, 14, 2), '#c84a4a', null, { lw: 1.6, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, sx - 2, y - 68, 16, 12, 2), '#4a8aa8', null, { lw: 1.6, hl: false });
      A.ellipse(ctx, sx - 8, y - 42, 8, 8, '#d8b070', null, { lw: 1.6, hl: false });
      A.ellipse(ctx, sx - 8, y - 42, 4, 4, '#b89050', null, { lw: 1.2, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, sx + 4, y - 50, 10, 16, 3), '#8a929c', null, { lw: 1.6, hl: false });
    };
    shelf(lx - 64);
    shelf(lx + 64);
    snowRoof(ctx, lx, y - 164, 96, 58, t);
    // 一樓屋簷（積雪的小斜頂）
    A.shape(ctx, (c) => { c.moveTo(lx - LW / 2 - 14, y - 96); c.lineTo(lx - LW / 2 + 10, y - 112); c.lineTo(lx + LW / 2 - 10, y - 112); c.lineTo(lx + LW / 2 + 14, y - 96); c.closePath(); }, '#6e4a36', '#56382a', { cel: [3, 2] });
    A.shape(ctx, (c) => { c.moveTo(lx - LW / 2 - 18, y - 96); c.quadraticCurveTo(lx - LW / 2 - 16, y - 108, lx - LW / 2 + 8, y - 116); c.lineTo(lx + LW / 2 - 8, y - 116); c.quadraticCurveTo(lx + LW / 2 + 16, y - 108, lx + LW / 2 + 18, y - 96); c.quadraticCurveTo(lx, y - 104, lx - LW / 2 - 18, y - 96); c.closePath(); }, '#ffffff', '#d4e0ee', { cel: [2, 2], lw: 2.2, hl: false });
    ctx.font = 'bold 13px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    A.shape(ctx, (c) => A.roundRect(c, lx - 34, y - 100, 68, 14, 3), '#3a2a20', null, { lw: 1.8, hl: false });
    ctx.fillStyle = A.c('#ffe0a0');
    ctx.fillText('犛牛雜貨', lx, y - 93);
    paperLantern(ctx, lx - LW / 2 - 4, y - 96, t, 0, '#e8503a');
    paperLantern(ctx, lx + LW / 2 + 4, y - 96, t, 1, '#e8503a');
    snowPile(ctx, lx + LW / 2 + 6, y, 26, 12);

    // 小神社（中間偏右）：紅鳥居＋小祠＋兩隻小石狐
    const sx = mid + 70;
    // 小祠（鳥居後面，稍微偏右）
    const px = sx + 84;
    A.shape(ctx, (c) => A.roundRect(c, px - 26, y - 14, 52, 14, 2), '#a8a4a0', '#8a8680', { cel: [3, 2] });
    A.shape(ctx, (c) => A.roundRect(c, px - 18, y - 56, 36, 42, 2), '#c8905a', '#a8703c', { cel: [3, 2] });
    glow(ctx, px, y - 36, 26, '255,200,120', 0.35 * lit);
    A.shape(ctx, (c) => A.roundRect(c, px - 11, y - 48, 22, 30, 1), '#ffe0a0', null, { lw: 2, hl: false });
    line(ctx, [[px, y - 48], [px, y - 18]], '#6a4430', 1.8);
    snowRoof(ctx, px, y - 54, 32, 22, t);
    // 大鈴與紅白繩
    const rs = Math.sin(t * 1.5) * 0.08;
    ctx.save();
    ctx.translate(px, y - 56);
    ctx.rotate(rs);
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 40); ctx.stroke();
    for (let k = 0; k < 8; k++) {
      ctx.strokeStyle = A.c(k % 2 ? '#ffffff' : '#d8323a');
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 8 + k * 4); ctx.lineTo(0, 12 + k * 4); ctx.stroke();
    }
    ctx.restore();
    bell(ctx, px, y - 52, 5.5, rs);
    // 鳥居
    const tw = 30;
    [-tw, tw].forEach((dx) => A.shape(ctx, (c) => A.roundRect(c, sx + dx - 4, y - 84, 8, 84, 2), '#d8323a', '#a82028', { cel: [2, 0], lw: 2.4 }));
    A.shape(ctx, (c) => A.roundRect(c, sx - tw - 8, y - 70, tw * 2 + 16, 6, 1.5), '#d8323a', '#a82028', { lw: 2.2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(sx - tw - 18, y - 86); c.quadraticCurveTo(sx, y - 82, sx + tw + 18, y - 86); c.lineTo(sx + tw + 20, y - 94); c.quadraticCurveTo(sx, y - 88, sx - tw - 20, y - 94); c.closePath(); }, '#d8323a', '#a82028', { cel: [2, 2], lw: 2.4, hl: false });
    A.shape(ctx, (c) => { c.moveTo(sx - tw - 20, y - 94); c.quadraticCurveTo(sx, y - 88, sx + tw + 20, y - 94); c.lineTo(sx + tw + 22, y - 99); c.quadraticCurveTo(sx, y - 93, sx - tw - 22, y - 99); c.closePath(); }, '#ffffff', '#d4e0ee', { lw: 2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, sx - 8, y - 84, 16, 12, 1.5), '#3a2a20', null, { lw: 1.6, hl: false });
    // 鳥居下的紙垂
    const pf = Math.sin(t * 2) * 1.5;
    [-12, 12].forEach((dx) => A.shape(ctx, (c) => { c.moveTo(sx + dx - 2, y - 64); c.lineTo(sx + dx + 2 + pf, y - 58); c.lineTo(sx + dx - 1 + pf, y - 58); c.lineTo(sx + dx + 3 + pf, y - 50); c.lineTo(sx + dx - 2, y - 58); c.closePath(); }, '#ffffff', null, { lw: 1.2, hl: false }));
    line(ctx, [[sx - tw, y - 64], [sx + tw, y - 64]], '#e8d8a8', 2);
    // 小石狐
    [[sx - tw - 16, 1], [sx + tw + 16, -1]].forEach(([fx, d]) => {
      A.shape(ctx, (c) => A.roundRect(c, fx - 9, y - 10, 18, 10, 2), '#a8a4a0', '#8a8680', { lw: 2, hl: false });
      A.ellipse(ctx, fx, y - 20, 7, 10, '#c8c4bc', '#a8a49c', { cel: [1.5, 1.5], lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(fx - 5, y - 30); c.lineTo(fx - 4, y - 38); c.lineTo(fx, y - 32); c.lineTo(fx + 4, y - 38); c.lineTo(fx + 5, y - 30); c.quadraticCurveTo(fx + 8 * d, y - 26, fx + 9 * d, y - 26); c.quadraticCurveTo(fx, y - 22, fx - 5, y - 30); c.closePath(); }, '#c8c4bc', '#a8a49c', { cel: [1, 1], lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(fx - 6, y - 24); c.lineTo(fx + 6, y - 24); c.lineTo(fx, y - 17); c.closePath(); }, '#d8323a', null, { lw: 1.4, hl: false });
      A.shape(ctx, (c) => c.ellipse(fx, y - 38, 6, 2.2, 0, Math.PI, 0), '#ffffff', null, { lw: 1.4, hl: false });
    });

    // 木屋到鳥居、鳥居到山莊的風鈴串
    const r1 = sag(hx + 102, y - 96, sx - tw - 18, y - 92, 22);
    r1.draw(ctx, '#5a4030', 1.4);
    for (let k = 1; k < 7; k++) {
      const [bx, by] = r1.at(k / 7);
      windBell(ctx, bx, by, t, k + 2, ['#cdefff', '#ffe0a0', '#ffd8e8', '#d8f4d0'][k % 4]);
    }
    // 小祠旁邊一根掛燈籠的竹竿
    const qx = px + 40;
    stick(ctx, [[qx, y], [qx, y - 96]], '#8aa860', 3);
    line(ctx, [[qx, y - 92], [qx - 14, y - 92]], '#5a4030', 1.6);
    paperLantern(ctx, qx - 14, y - 92, t, 5, '#fff0d8');
    // 石燈籠（戴雪帽）
    const sl = mid - 70;
    A.shape(ctx, (c) => A.roundRect(c, sl - 12, y - 8, 24, 8, 2), '#a8a49a', '#86827a', { lw: 2.2 });
    A.shape(ctx, (c) => A.roundRect(c, sl - 5, y - 30, 10, 22, 2), '#a8a49a', '#86827a', { lw: 2.2 });
    A.shape(ctx, (c) => A.roundRect(c, sl - 12, y - 46, 24, 16, 3), '#a8a49a', '#86827a', { lw: 2.2 });
    glow(ctx, sl, y - 38, 26, '255,200,120', 0.5 * lit);
    A.shape(ctx, (c) => A.roundRect(c, sl - 6, y - 43, 12, 9, 2), '#ffd88a', null, { lw: 1.6, hl: false });
    A.shape(ctx, (c) => { c.moveTo(sl - 20, y - 46); c.quadraticCurveTo(sl, y - 60, sl + 20, y - 46); c.closePath(); }, '#a8a49a', '#86827a', { lw: 2.2 });
    A.shape(ctx, (c) => { c.moveTo(sl - 22, y - 46); c.quadraticCurveTo(sl - 20, y - 56, sl, y - 62); c.quadraticCurveTo(sl + 20, y - 56, sl + 22, y - 46); c.quadraticCurveTo(sl, y - 52, sl - 22, y - 46); c.closePath(); }, '#ffffff', '#d4e0ee', { lw: 2, hl: false });
    // 雪人
    const mx = hx - 62;
    A.ellipse(ctx, mx, y - 14, 16, 14, '#ffffff', '#d4e0ee', { cel: [2, 2] });
    A.ellipse(ctx, mx + 1, y - 36, 11, 10, '#ffffff', '#d4e0ee', { cel: [1.5, 1.5] });
    dot(ctx, mx - 1, y - 38, 1.6, '#3a2418');
    dot(ctx, mx + 6, y - 38, 1.6, '#3a2418');
    A.shape(ctx, (c) => { c.moveTo(mx + 3, y - 35); c.lineTo(mx + 13, y - 33); c.lineTo(mx + 3, y - 32); c.closePath(); }, '#f28c38', null, { lw: 1.2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, mx - 10, y - 28, 22, 5, 2.5), '#e0484a', null, { lw: 1.6, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, mx - 7, y - 29, 5, 12, 2), '#e0484a', null, { lw: 1.4, hl: false });
    A.shape(ctx, (c) => c.ellipse(mx + 1, y - 45, 8, 4, 0, Math.PI, 0), '#4a8aa8', null, { lw: 1.6, hl: false });
    snowPile(ctx, mid - 240, y, 22, 9);
    snowPile(ctx, mid + 10, y, 18, 7);
    snowPile(ctx, hx - 96, y, 20, 9);

    campSign(ctx, mid - 150, y, '霜鈴村');
    ctx.restore();
  };

  // ── 終章：神殿前庭（漂浮的大理石庭院、金色時鐘）──
  function gearPath(c, x, y, r, teeth, rot, hole) {
    const n = teeth * 4;
    for (let i = 0; i <= n; i++) {
      const a = rot + (i / n) * TAU;
      const q = i % 4;
      const rr = q === 1 || q === 2 ? r : r * 0.82;
      i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    if (hole) {
      c.moveTo(x + hole, y);
      c.arc(x, y, hole, 0, TAU, true);
    }
  }
  function clockFace(ctx, x, y, r, t, sp) {
    A.shape(ctx, (c) => c.arc(x, y, r + 4, 0, TAU), '#f0c040', '#c8962a', { cel: [1.5, 1.5], lw: 2.4, hl: false });
    A.shape(ctx, (c) => c.arc(x, y, r, 0, TAU), '#fff8e4', '#f0e2c0', { cel: [1, 1], lw: 2, hl: false });
    ctx.strokeStyle = A.outline();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.lineWidth = i % 3 ? 1.2 : 2.2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
      ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
      ctx.stroke();
    }
    const m = t * sp - Math.PI / 2;
    const h = t * sp / 12 - Math.PI / 2 + 1.2;
    line(ctx, [[x, y], [x + Math.cos(h) * r * 0.5, y + Math.sin(h) * r * 0.5]], null, 2.6);
    line(ctx, [[x, y], [x + Math.cos(m) * r * 0.75, y + Math.sin(m) * r * 0.75]], '#c8962a', 1.8);
    dot(ctx, x, y, 2, '#c8962a');
  }
  function column(ctx, x, top, bot, w) {
    A.shape(ctx, (c) => A.roundRect(c, x - w / 2 - 3, bot - 6, w + 6, 6, 1.5), '#f4f0ea', '#d8d2c8', { lw: 2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, x - w / 2, top + 5, w, bot - top - 10, 1), '#fbf8f2', '#dcd6cc', { cel: [3, 0], lw: 2.2, hl: false });
    ctx.strokeStyle = A.c('rgba(170,160,140,0.55)');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k < 4; k++) { ctx.moveTo(x - w / 2 + (w / 4) * k, top + 8); ctx.lineTo(x - w / 2 + (w / 4) * k, bot - 8); }
    ctx.stroke();
    A.shape(ctx, (c) => A.roundRect(c, x - w / 2 - 4, top, w + 8, 6, 1.5), '#f0c040', '#c8962a', { lw: 2, hl: false });
  }
  function marbleSteps(ctx, x, y, w, n) {
    for (let k = 0; k < n; k++) {
      const ww = w - k * 14;
      A.shape(ctx, (c) => A.roundRect(c, x - ww / 2, y - (k + 1) * 7, ww, 7, 1.5), '#f4f0ea', '#d8d2c8', { cel: [3, 1], lw: 2, hl: false });
    }
  }

  A.CAMP_DRAW[5] = function (ctx, x1, x2, y, t) {
    const mid = (x1 + x2) / 2;
    ctx.save();

    // 背景裡慢慢轉的金色齒輪
    ctx.save();
    ctx.globalAlpha *= 0.28;
    [[x1 + 250, y - 230, 44, 12, 0.12], [x1 + 320, y - 180, 26, 8, -0.2], [x2 - 330, y - 250, 52, 14, -0.08], [mid, y - 280, 30, 9, 0.15]].forEach(([gx, gy, r, n, sp]) => {
      A.shape(ctx, (c) => gearPath(c, gx, gy, r, n, t * sp, r * 0.35), '#f0c040', null, { lw: 2, hl: false });
    });
    ctx.restore();

    // 漂浮的大理石碎塊
    [[x1 + 270, y - 250, 24, 0], [mid - 60, y - 235, 18, 1.3], [x2 - 310, y - 300, 22, 2.4], [mid + 110, y - 330, 14, 3.1]].forEach(([fx, fy, s, ph]) => {
      const fb = Math.sin(t * 1.1 + ph) * 5;
      const piece = (c) => { c.moveTo(fx - s, fy + fb); c.lineTo(fx + s, fy + fb); c.lineTo(fx + s * 0.6, fy + fb + s * 0.7); c.lineTo(fx - s * 0.2, fy + fb + s * 1.1); c.lineTo(fx - s * 0.7, fy + fb + s * 0.6); c.closePath(); };
      A.shape(ctx, piece, '#d8d2e0', '#b8b0c4', { cel: [2, 2], lw: 2, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, fx - s - 1, fy + fb - 5, s * 2 + 2, 6, 2), '#fbf8f2', '#dcd6cc', { lw: 2, hl: false });
      ctx.fillStyle = A.c('#f0c040');
      ctx.fillRect(fx - s + 2, fy + fb - 1, s * 2 - 4, 1.5);
    });

    // 圓亭（左）：大理石柱、金邊圓頂、裡面浮著會翻轉的沙漏
    const px = x1 + 110;
    marbleSteps(ctx, px, y, 170, 3);
    const ptop = y - 140;
    const hgy = y - 80 + Math.sin(t * 1.5) * 4;
    glow(ctx, px, hgy, 46, '255,220,140', 0.45 + Math.sin(t * 2) * 0.1);
    ctx.save();
    ctx.translate(px, hgy);
    const flip = (t % 8) > 7 ? ((t % 8) - 7) * Math.PI : 0;
    ctx.rotate(flip);
    const sand = Math.min(1, (t % 8) / 7);
    const hg = (c) => { c.moveTo(-12, -18); c.lineTo(12, -18); c.lineTo(2, 0); c.lineTo(12, 18); c.lineTo(-12, 18); c.lineTo(-2, 0); c.closePath(); };
    A.shape(ctx, hg, '#e4f4fc', null, { lw: 2, hl: false });
    ctx.save();
    ctx.beginPath();
    hg(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#f0c040');
    ctx.fillRect(-14, -18 + sand * 16, 28, 18 - sand * 16);
    ctx.fillRect(-14, 18 - sand * 14, 28, sand * 14 + 1);
    if (flip === 0) ctx.fillRect(-0.8, -2, 1.6, 20);
    ctx.restore();
    A.shape(ctx, (c) => A.roundRect(c, -15, -22, 30, 5, 2), '#f0c040', '#c8962a', { lw: 1.8, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, -15, 17, 30, 5, 2), '#f0c040', '#c8962a', { lw: 1.8, hl: false });
    ctx.restore();
    [-60, -28, 28, 60].forEach((dx) => column(ctx, px + dx, ptop, y - 21, 14));
    A.shape(ctx, (c) => A.roundRect(c, px - 76, ptop - 12, 152, 14, 2), '#fbf8f2', '#dcd6cc', { cel: [4, 2], lw: 2.4 });
    ctx.fillStyle = A.c('#f0c040');
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      ctx.arc(px - 64 + k * 16, ptop - 5, 2.2, 0, TAU);
      ctx.fill();
    }
    A.shape(ctx, (c) => { c.moveTo(px - 70, ptop - 12); c.quadraticCurveTo(px - 66, ptop - 76, px, ptop - 78); c.quadraticCurveTo(px + 66, ptop - 76, px + 70, ptop - 12); c.closePath(); }, '#f4f0ea', '#d8d2c8', { cel: [6, 4], hl: [px - 30, ptop - 50, 12, 6] });
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px - 70, ptop - 12);
    ctx.quadraticCurveTo(px - 66, ptop - 76, px, ptop - 78);
    ctx.quadraticCurveTo(px + 66, ptop - 76, px + 70, ptop - 12);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = A.c('#e0b040');
    ctx.lineWidth = 2;
    [-40, 0, 40].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(px + dx * 1.7, ptop - 12);
      ctx.quadraticCurveTo(px + dx * 0.9, ptop - 60, px, ptop - 80);
      ctx.stroke();
    });
    ctx.restore();
    // 頂上的金色小鐘球
    line(ctx, [[px, ptop - 78], [px, ptop - 90]], '#c8962a', 2.4);
    clockFace(ctx, px, ptop - 100, 9, t, 0.8);

    // 神殿正面（右）：五根柱子、三角楣上一面大金鐘
    const tx = x2 - 130;
    const TW = 230;
    const top = y - 176;
    marbleSteps(ctx, tx, y, TW + 30, 3);
    A.shape(ctx, (c) => A.roundRect(c, tx - TW / 2 + 10, top + 6, TW - 20, y - 21 - top - 6, 2), '#e8e2f0', '#d0c8dc', { cel: [6, 0], lw: 2.2, hl: false });
    // 深處的門，透出金光
    glow(ctx, tx, y - 70, 70, '255,214,120', 0.4 + Math.sin(t * 1.3) * 0.08);
    A.shape(ctx, (c) => { c.moveTo(tx - 26, y - 21); c.lineTo(tx - 26, y - 100); c.quadraticCurveTo(tx, y - 124, tx + 26, y - 100); c.lineTo(tx + 26, y - 21); c.closePath(); }, '#ffe8a8', '#ffd878', { lw: 2.4, hl: false, shadeY: y - 50 });
    [-1, 1].forEach((d) => {
      A.shape(ctx, (c) => A.roundRect(c, tx + (d < 0 ? -24 : 8), y - 21 - 60, 16, 60, 1), '#f0c040', '#c8962a', { cel: [1.5, 0], lw: 1.8, hl: false });
    });
    [-100, -50, 0, 50, 100].forEach((dx) => { if (dx !== 0) column(ctx, tx + dx, top, y - 21, 18); });
    // 楣帶：金色齒輪花紋
    A.shape(ctx, (c) => A.roundRect(c, tx - TW / 2, top - 18, TW, 20, 2), '#fbf8f2', '#dcd6cc', { cel: [5, 2], lw: 2.6 });
    for (let k = 0; k < 7; k++) {
      A.shape(ctx, (c) => gearPath(c, tx - 96 + k * 32, top - 8, 6, 6, t * 0.3 * (k % 2 ? 1 : -1), 2), '#f0c040', null, { lw: 1.2, hl: false });
    }
    const ped = (c) => { c.moveTo(tx - TW / 2 - 10, top - 18); c.lineTo(tx, top - 76); c.lineTo(tx + TW / 2 + 10, top - 18); c.closePath(); };
    A.shape(ctx, ped, '#fbf8f2', '#dcd6cc', { cel: [5, 3] });
    A.shape(ctx, (c) => { c.moveTo(tx - TW / 2 + 16, top - 22); c.lineTo(tx, top - 66); c.lineTo(tx + TW / 2 - 16, top - 22); c.closePath(); }, '#e8e2f0', null, { lw: 1.6, hl: false });
    clockFace(ctx, tx, top - 38, 15, t, 0.6);
    A.shape(ctx, (c) => { c.moveTo(tx - TW / 2 - 14, top - 16); c.lineTo(tx, top - 80); c.lineTo(tx + TW / 2 + 14, top - 16); c.lineTo(tx + TW / 2 + 6, top - 16); c.lineTo(tx, top - 72); c.lineTo(tx - TW / 2 - 6, top - 16); c.closePath(); }, '#f0c040', '#c8962a', { cel: [1.5, 1.5], lw: 2, hl: false });
    A.shape(ctx, (c) => starPath(c, tx, top - 88, 7, 3, 4, -Math.PI / 2), '#ffe070', '#e0b040', { lw: 1.6, hl: false });
    // 神殿前的金色火盆
    [tx - TW / 2 - 10, tx + TW / 2 + 10].forEach((bx, k) => {
      A.shape(ctx, (c) => A.roundRect(c, bx - 4, y - 42, 8, 42, 2), '#f4f0ea', '#d8d2c8', { lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(bx - 12, y - 50); c.lineTo(bx + 12, y - 50); c.lineTo(bx + 7, y - 40); c.lineTo(bx - 7, y - 40); c.closePath(); }, '#f0c040', '#c8962a', { lw: 2, hl: false });
      const f = Math.sin(t * 8 + k) * 1.5;
      glow(ctx, bx, y - 58, 30, '160,210,255', 0.5);
      A.shape(ctx, (c) => { c.moveTo(bx - 7, y - 50); c.quadraticCurveTo(bx - 8, y - 60, bx + f, y - 70); c.quadraticCurveTo(bx + 8, y - 60, bx + 7, y - 50); c.closePath(); }, '#bfe6ff', '#8fc8f0', { lw: 1.6, hl: false, shadeY: y - 55 });
    });

    // 渾天儀（中間偏右）：金環慢慢轉
    const ax = mid + 130;
    A.shape(ctx, (c) => A.roundRect(c, ax - 18, y - 10, 36, 10, 2), '#f4f0ea', '#d8d2c8', { cel: [2, 1], lw: 2.2 });
    A.shape(ctx, (c) => { c.moveTo(ax - 10, y - 10); c.lineTo(ax - 6, y - 50); c.lineTo(ax + 6, y - 50); c.lineTo(ax + 10, y - 10); c.closePath(); }, '#fbf8f2', '#dcd6cc', { cel: [2, 0], lw: 2.2 });
    A.shape(ctx, (c) => A.roundRect(c, ax - 14, y - 56, 28, 7, 2), '#f0c040', '#c8962a', { lw: 2, hl: false });
    const ay = y - 86;
    glow(ctx, ax, ay, 34, '255,220,140', 0.35);
    [[0, 1, 0], [Math.PI / 2, 1, 0.8], [0, 0.35, 1.7]].forEach(([rot, sq, ph]) => {
      const ry = 24 * Math.abs(Math.cos(t * 0.6 + ph)) * sq + 2;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(rot * 0.5 + 0.3);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, ry, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c('#f0c040');
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();
    });
    A.ellipse(ctx, ax, ay, 6, 6, '#8fd0ff', '#5aa8e0', { lw: 2 });
    line(ctx, [[ax, ay - 30], [ax, y - 56]], '#c8962a', 1.6);

    // 圓亭到神殿之間的金色星燈串
    const r = sag(px + 70, ptop - 14, tx - TW / 2 - 10, top - 18, 34);
    r.draw(ctx, '#c8962a', 1.4);
    for (let k = 1; k < 9; k++) {
      const [lx, ly] = r.at(k / 9);
      const on = 0.7 + Math.sin(t * 2.2 + k) * 0.3;
      glow(ctx, lx, ly + 6, 14, '255,220,140', 0.55 * on);
      A.shape(ctx, (c) => starPath(c, lx, ly + 6, 4.5, 2, 4, -Math.PI / 2 + Math.sin(t + k) * 0.3), k % 3 ? '#ffe070' : '#bfe6ff', null, { lw: 1.2, hl: false });
    }

    campSign(ctx, mid - 150, y, '神殿前庭');
    ctx.restore();
  };

  // ════════ 圖示（第四章、終章材料）════════
  // 跟 npcs2.js 的 lampshard／volcanocore 一樣：以 (0,0) 為中心，大約 ±14 的範圍
  function iconSparkle(ctx, x, y, r, col) {
    A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.35, 4, 0), col || '#ffffff', null, { noStroke: true, hl: false });
  }
  Object.assign(A.ICON, {
    // 霜鈴碎片：神社大霜鈴裂下來的一塊，淡藍白、結著霜
    frostbell(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
      g.addColorStop(0, 'rgba(200,236,255,0.9)');
      g.addColorStop(1, 'rgba(150,210,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.fill();
      // 鈴身的一片弧（上緣圓頂、右邊是鋸齒狀的裂口）
      const piece = (c) => {
        c.moveTo(-12, 11);
        c.quadraticCurveTo(-13, -6, -4, -12);
        c.quadraticCurveTo(0, -14, 3, -13);
        c.lineTo(1, -8);
        c.lineTo(6, -5);
        c.lineTo(2, 0);
        c.lineTo(8, 4);
        c.lineTo(4, 8);
        c.lineTo(7, 12);
        c.closePath();
      };
      A.shape(ctx, piece, '#e4f4ff', '#a8d0ec', { cel: [2.5, 2], lw: 2, hl: [-7, -5, 2, 4] });
      // 鈴口的厚邊與鈴身上的紋
      A.shape(ctx, (c) => { c.moveTo(-13, 9); c.lineTo(7, 10); c.lineTo(7.5, 14); c.lineTo(-13, 13.5); c.closePath(); }, '#bfe0f4', '#8ec0e0', { lw: 1.8, hl: false });
      line(ctx, [[-11, -1], [3, -1.5]], '#8ec0e0', 1.3);
      line(ctx, [[-12, 4], [4, 4]], '#8ec0e0', 1.3);
      // 裂痕
      line(ctx, [[-2, -10], [-4, -4], [-1, 1], [-4, 7]], '#6aa0c8', 1.1);
      // 霜花
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      [[-7, -7, 2.6], [-9, 6, 2]].forEach(([x, y, r]) => {
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          ctx.stroke();
        }
      });
      // 掛繩的小環
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(-4, -15, 2.6, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c('#d8323a');
      ctx.lineWidth = 1.5;
      ctx.stroke();
      iconSparkle(ctx, 11, -10, 3.5);
      iconSparkle(ctx, 12, 1, 2.2, '#dff4ff');
    },
    // 時之碎片：金色鐘面的一角，裡面流著星沙
    timeshard(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
      g.addColorStop(0, 'rgba(255,226,140,0.9)');
      g.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.fill();
      // 以 (-10, 10) 為圓心的四分之一鐘面，外框是金邊，斷口參差
      const cx = -10;
      const cy = 10;
      const shard = (c) => {
        c.moveTo(cx, cy);
        c.lineTo(cx, cy - 20);
        c.arc(cx, cy, 20, -Math.PI / 2, -0.05);
        c.lineTo(cx + 16, cy - 2);
        c.lineTo(cx + 12, cy + 1);
        c.lineTo(cx + 6, cy - 1);
        c.closePath();
      };
      A.shape(ctx, shard, '#f0c040', '#c8962a', { cel: [2, 2], lw: 2, hl: false });
      // 內側透明的鐘面，裝著深藍的星沙
      const inner = (c) => {
        c.moveTo(cx + 2, cy - 3);
        c.lineTo(cx + 2, cy - 16);
        c.arc(cx, cy, 16, -Math.PI / 2 + 0.12, -0.2);
        c.lineTo(cx + 12, cy - 4);
        c.lineTo(cx + 6, cy - 4);
        c.closePath();
      };
      A.shape(ctx, inner, '#2e3a78', '#222c5c', { cel: [1.5, 1.5], lw: 1.4, hl: false });
      ctx.save();
      ctx.beginPath();
      inner(ctx);
      ctx.clip();
      [[-4, -2, 1.1, '#fff6c0'], [0, -6, 0.8, '#ffe070'], [1, 2, 1, '#ffffff'], [-6, -1, 0.7, '#ffe070'], [-2, 4, 0.8, '#bfe6ff'], [3, -3, 0.7, '#fff6c0']].forEach(([x, y, r, col]) => dot(ctx, x, y, r, col));
      iconSparkle(ctx, -3, -8, 2.4, '#fff6c0');
      ctx.restore();
      // 刻度與半截指針
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      [-Math.PI / 2 + 0.3, -Math.PI / 4, -0.35].forEach((a) => {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17);
        ctx.lineTo(cx + Math.cos(a) * 19.5, cy + Math.sin(a) * 19.5);
        ctx.stroke();
      });
      line(ctx, [[cx + 2, cy - 4], [cx + 9, cy - 11]], null, 2.6);
      line(ctx, [[cx + 2, cy - 4], [cx + 9, cy - 11]], '#f0c040', 1.2);
      iconSparkle(ctx, 11, -12, 3.5);
      iconSparkle(ctx, 12, 8, 2.4, '#fff0a0');
    },
  });
})();
