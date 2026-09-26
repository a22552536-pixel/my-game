// 第三章「赤岩峽谷」怪物、投射物、地面區域與掉落素材圖示（v2：劍與魔法）。
// 設計：自然物 ＋ 一個劍與魔法的奇幻概念（炎劍、狂戰士頭盔、引力水晶、巫師帽魔火、符文戰鎚、
// 風系魔導書、騎士重鎧、元素紋、預言之眼）。規格見 docs/SPEC-monsters.md。
// 風格同 monsters2.js：平塗、深棕描邊、右下月牙陰影、左上亮點、Q 版大眼；第三章體型約第一章的 1.3 倍、表情更兇一點。
// 原點在腳底中央、面向右（+x）；翻轉、縮放、飛行高度由 A.drawMonster 處理。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const PI = Math.PI;
  const TAU = PI * 2;

  // ───────────── 共用小工具 ─────────────
  function eyeKind(m) {
    return m.dead ? 'x' : m.hurtT > 0 ? 'hurt' : m.angry ? 'angry' : m.blink ? 'closed' : 'normal';
  }
  function faceEyes(ctx, x, y, gap, rx, ry, m, kind) {
    kind = kind || eyeKind(m);
    A.eye(ctx, x, y, rx, ry, kind, 0.8);
    A.eye(ctx, x + gap, y - 0.5, rx * 0.92, ry * 0.95, kind, 0.8);
  }
  function smallMouth(ctx, x, y, open, k) {
    k = k || 1;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (open) {
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 3 * k, 3.5 * k, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y - 1, 3 * k, 0.2 * PI, 0.8 * PI);
      ctx.stroke();
    }
  }
  function limb(ctx, path, w, col) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = Math.max(1, w - 3);
    ctx.stroke();
  }
  function glow(ctx, x, y, r, rgb, a) {
    if (!(a > 0) || !(r > 0)) return;
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function walking(m) {
    if (m.onGround === false) return false;
    if (m.vx != null) return Math.abs(m.vx) > 5;
    return m.state === 'walk';
  }
  function phase(m) {
    return m.attackPhase || null;
  }
  function clamp(v, a, b) {
    v = +v;
    if (!(v === v)) v = a;
    return v < a ? a : v > b ? b : v;
  }
  // 顏色混合（量化，避免 U.mix 的快取無限長大）
  function mixq(a, b, k) {
    return U.mix(a, b, Math.round(clamp(k, 0, 1) * 20) / 20);
  }
  // 火焰配色：一般的火、術士的魔火（紫）
  const FIRE = { rgb: '255,170,60', out: '#ff7a2a', sh: '#e8521e', core: '#ffe46a' };
  const MAGIC = { rgb: '190,100,255', out: '#b85cff', sh: '#8a3ae0', core: '#ffd6ff' };
  // 可以往某方向彎的火焰（lean > 0 往右倒）；P 為配色（預設一般的火）
  function flame(ctx, x, y, r, t, seed, lean, P) {
    lean = lean || 0;
    P = P || FIRE;
    const f = Math.sin(t * 18 + (seed || 0)) * 0.15 + lean;
    glow(ctx, x, y - r * 0.5, r * 3, P.rgb, 0.45);
    A.shape(ctx, (c) => {
      c.moveTo(x + f * r * 2, y - r * 2.2);
      c.bezierCurveTo(x + r * 0.9 + f * r, y - r * 1.1, x + r, y + r * 0.5, x, y + r * 0.8);
      c.bezierCurveTo(x - r, y + r * 0.5, x - r * 0.9 + f * r, y - r * 1.0, x + f * r * 2, y - r * 2.2);
      c.closePath();
    }, P.out, P.sh, { lw: 2, shadeY: y + r * 0.2 });
    A.shape(ctx, (c) => {
      c.moveTo(x + f * r, y - r * 1.15);
      c.quadraticCurveTo(x + r * 0.6, y, x, y + r * 0.45);
      c.quadraticCurveTo(x - r * 0.6, y, x + f * r, y - r * 1.15);
      c.closePath();
    }, P.core, null, { noStroke: true });
  }
  // 漫畫的「💢」怒氣記號
  function angerMark(ctx, x, y, s, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    const path = () => {
      ctx.beginPath();
      for (let q = 0; q < 4; q++) {
        const a = q * PI * 0.5;
        const co = Math.cos(a);
        const si = Math.sin(a);
        const P = (px, py) => [px * co - py * si, px * si + py * co];
        const p0 = P(s * 0.22, -s);
        const p1 = P(s * 0.22, -s * 0.22);
        const p2 = P(s, -s * 0.22);
        ctx.moveTo(p0[0], p0[1]);
        ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
      }
    };
    path();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = Math.max(2.5, s * 0.55);
    ctx.stroke();
    ctx.strokeStyle = A.c(col || '#ff3b3b');
    ctx.lineWidth = Math.max(1.2, s * 0.55 - 2.2);
    ctx.stroke();
    ctx.restore();
  }
  function puff(ctx, x, y, r, col, a) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.arc(x + r * 0.8, y + r * 0.2, r * 0.7, 0, TAU);
    ctx.arc(x - r * 0.75, y + r * 0.25, r * 0.65, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function speedLines(ctx, x, y, h, n, len, t, col) {
    ctx.save();
    ctx.strokeStyle = col || 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const q = (t * 3 + i * 0.37) % 1;
      const yy = y - h / 2 + (h * (i + 0.5)) / n;
      const xx = x - q * 14;
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx - len * (0.6 + 0.4 * ((i * 7) % 3) / 2), yy);
    }
    ctx.stroke();
    ctx.restore();
  }
  function sparkle(ctx, x, y, s, col) {
    ctx.fillStyle = A.c(col || '#fff6b0');
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
  function heart(ctx, x, y, s, col) {
    A.shape(ctx, (c) => {
      c.moveTo(x, y + s * 0.9);
      c.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
      c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.3, y - s * 0.1, x, y + s * 0.9);
      c.closePath();
    }, col, null, { lw: 1.6 });
  }
  function dust(ctx, x, y, t, k) {
    for (let i = 0; i < 3; i++) {
      const q = (t * 2.2 + i / 3) % 1;
      puff(ctx, x - q * 16 * k, y - 3 - q * 8, (3 + q * 4) * k, '#e8c8a0', (1 - q) * 0.8);
    }
  }

  // ── 奇幻小零件 ──
  // 符文（幾個固定的筆畫字形，座標 -1..1）；col 由呼叫端決定（要不要過 A.c）
  const RUNES = [
    [[[0, -1], [0, 1]], [[0, -0.55], [0.6, -1]], [[0, -0.05], [0.6, -0.5]]],
    [[[-0.4, 1], [-0.4, -1], [0.45, -0.5], [-0.4, 0], [0.45, 1]]],
    [[[0, -1], [0.6, 0], [0, 1], [-0.6, 0], [0, -1]], [[0, -0.4], [0, 0.4]]],
    [[[0, 1], [0, -1]], [[-0.6, -0.9], [0, -0.25], [0.6, -0.9]]],
    [[[-0.35, -1], [-0.35, 1]], [[-0.35, -0.5], [0.45, 0], [-0.35, 0.5]]],
    [[[-0.5, -1], [0.45, -0.3], [-0.45, 0.3], [0.5, 1]]],
    [[[-0.55, 1], [-0.55, -1], [0.55, 1], [0.55, -1]]],
  ];
  function rune(ctx, x, y, s, idx, col, lw) {
    const R = RUNES[((Math.floor(idx) % RUNES.length) + RUNES.length) % RUNES.length];
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = col;
    ctx.lineWidth = lw || Math.max(1, s * 0.3);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    R.forEach((pl) => pl.forEach((p, i) => (i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s))));
    ctx.stroke();
    ctx.restore();
  }
  // 多面水晶（底部在原點、尖端朝上）
  const AMETHYST = { fill: '#c490f4', shade: '#8a58c8', facet: '#ecd8ff', rgb: '190,130,255' };
  function crystal(ctx, x, y, w, h, rot, P, glowA) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    if (glowA > 0) glow(ctx, 0, -h * 0.5, h * 1.3, P.rgb, glowA);
    const path = (c) => {
      c.moveTo(0, -h);
      c.lineTo(w * 0.5, -h * 0.7);
      c.lineTo(w * 0.5, -h * 0.08);
      c.lineTo(0, 0);
      c.lineTo(-w * 0.5, -h * 0.08);
      c.lineTo(-w * 0.5, -h * 0.7);
      c.closePath();
    };
    A.shape(ctx, path, P.fill, P.shade, { lw: 2, cel: [w * 0.22, 0] });
    ctx.strokeStyle = A.c(P.facet);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, -h + 1.5);
    ctx.lineTo(0, -1.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.66);
    ctx.lineTo(-w * 0.12, -h * 0.8);
    ctx.lineTo(-w * 0.12, -h * 0.34);
    ctx.lineTo(-w * 0.34, -h * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // 法陣（呼叫端先 scale(1, 0.3) 壓成地面透視）：雙圈＋一圈符文＋兩個交疊的三角形
  function magicCircle(ctx, r, rot, col, lw, runeN, seed) {
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.76, 0, TAU);
    ctx.stroke();
    ctx.save();
    ctx.rotate(rot);
    for (let i = 0; i < runeN; i++) {
      ctx.save();
      ctx.rotate((i / runeN) * TAU);
      rune(ctx, 0, -r * 0.88, r * 0.075, i + (seed || 0), col, lw * 0.6);
      ctx.restore();
    }
    ctx.restore();
    ctx.rotate(-rot * 1.5);
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i <= 3; i++) {
        const a = -PI / 2 + k * PI + (i * TAU) / 3;
        const x = Math.cos(a) * r * 0.76;
        const y = Math.sin(a) * r * 0.76;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // ═════════════ 第三章：赤岩峽谷 ═════════════

  // ── 炎劍蜥：藍色小蜥蜴，背上插著一把小劍；點燃（lit）時劍身燒紅、整把劍冒火，帶火衝刺 ──
  function matchlizard(ctx, m) {
    const ba = ctx.globalAlpha;
    const fx = m.fx || {};
    const t = m.t || 0;
    const lit = !!fx.lit;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const fast = strike || Math.abs(m.vx || 0) > 110;
    const step = walk ? Math.sin(t * (fast ? 22 : 15)) : 0;
    const skin = ['#5aaad6', '#3a7aac'];
    const dark = '#2c5f8c';
    const belly = '#f6e8c0';
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    if (strike) ctx.translate(4, 0);
    ctx.rotate(wind ? 0.07 : lit && fast ? 0.04 : 0);
    const by = -13 + (walk ? -Math.abs(step) : Math.sin(t * 3) * 0.5) + (wind ? 1.5 : 0);

    const leg = (x, s, col) => {
      const lift = Math.max(0, s) * 3.5;
      limb(ctx, (c) => { c.moveTo(x, by + 3); c.lineTo(x + 3 + s * 2, -3 - lift); }, 6, col);
      A.ellipse(ctx, x + 6 + s * 2, -2.5 - lift, 4.2, 2.4, col, null, { lw: 2, hl: false });
    };
    leg(-13, -step, skin[1]);
    leg(7, step, skin[1]);

    // 尾巴：往後翹、有深色環紋；點燃時尾巴尖也冒小火
    const tw = Math.sin(t * 3.2) * 2 + (fast ? 3 : 0);
    const tail = (c) => {
      c.moveTo(-14, by - 5);
      c.bezierCurveTo(-26, by - 5, -33, by - 7 - tw, -41, by - 15 - tw);
      c.quadraticCurveTo(-37, by - 6 - tw, -30, by + 1);
      c.quadraticCurveTo(-24, by + 5, -14, by + 5);
      c.closePath();
    };
    A.shape(ctx, tail, skin[0], skin[1], { cel: [1.5, 1.5] });
    ctx.save();
    ctx.beginPath();
    tail(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c(dark);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-24, by - 8);
    ctx.lineTo(-22, by + 6);
    ctx.moveTo(-32, by - 12 - tw);
    ctx.lineTo(-29, by + 2);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    tail(ctx);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    if (lit) flame(ctx, -41, by - 15 - tw, 3.2, t, 3, fast ? -0.4 : 0);

    // 背上的劍（插在背上、劍柄朝後上方）：先在身體後面畫火焰，身體蓋住火焰底部
    const sx = -3;
    const sy = by - 8;
    const sa = -0.42 + (walk ? step * 0.03 : 0) + (hurt ? -0.15 : 0);
    const back = fast || (walk && Math.abs(m.vx || 0) > 60) ? -0.5 : Math.sin(t * 3) * 0.05;
    if (lit) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(sa);
      flame(ctx, 0, -7, fast ? 12.5 : 11, t, 0, back);
      ctx.restore();
    }

    // 身體
    const body = (c) => {
      c.moveTo(-17, by + 5);
      c.bezierCurveTo(-21, by - 5, -12, by - 10, 0, by - 10);
      c.bezierCurveTo(12, by - 10, 20, by - 6, 21, by + 1);
      c.bezierCurveTo(20, by + 7, 10, by + 8, 0, by + 8);
      c.bezierCurveTo(-8, by + 8, -15, by + 8, -17, by + 5);
      c.closePath();
    };
    A.shape(ctx, body, skin[0], skin[1], { cel: [2.5, 2.5], hl: [-9, by - 5, 5, 1.6] });
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    A.ellipse(ctx, 2, by + 9, 16, 4.5, belly, null, { noStroke: true, hl: false });
    ctx.fillStyle = A.c(dark);
    [[-12, -3], [-6, -6], [8, -6], [14, -3], [-9, 1], [12, 1]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, by + y, 1.5, 0, TAU); ctx.fill(); });
    ctx.restore();
    ctx.beginPath();
    body(ctx);
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = A.outline();
    ctx.stroke();

    // 劍：劍身（插進背裡）、金色護手、皮纏劍柄、紅寶石劍首
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sa);
    const bl = 12;
    const hot = lit ? 1 : wind ? 0.55 : 0;
    const bc = hot >= 1 ? ['#fff2b8', '#ff9a3a'] : hot > 0 ? ['#ffe0b0', '#e89a5a'] : ['#eef2f8', '#a8b4c4'];
    if (hot > 0) glow(ctx, 0, -bl * 0.5, 14, '255,160,60', 0.35 + hot * 0.3);
    A.shape(ctx, (c) => { c.moveTo(-2.9, 4); c.lineTo(-2.9, -bl); c.lineTo(2.9, -bl); c.lineTo(2.9, 4); c.closePath(); }, bc[0], bc[1], { lw: 2, cel: [1.6, 0] });
    ctx.strokeStyle = A.c(hot ? '#ffffff' : '#c4ced8');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-0.6, 1);
    ctx.lineTo(-0.6, -bl + 1.5);
    ctx.stroke();
    // 燒起來時劍身前面也有一小簇火舌
    if (lit) flame(ctx, 0.5, -1, 4.8, t, 1.7, back * 0.8);
    // 插進背裡的地方：一圈小陰影
    ctx.fillStyle = A.c(dark);
    ctx.beginPath();
    ctx.ellipse(0, 3.5, 5, 1.6, 0, 0, TAU);
    ctx.fill();
    A.shape(ctx, (c) => {
      c.moveTo(-8.5, -bl - 1);
      c.quadraticCurveTo(-9.5, -bl - 4.5, -7, -bl - 4);
      c.lineTo(7, -bl - 4);
      c.quadraticCurveTo(9.5, -bl - 4.5, 8.5, -bl - 1);
      c.closePath();
    }, '#f2c14a', '#c08a2a', { lw: 2, shadeY: -bl - 2 });
    A.shape(ctx, (c) => A.roundRect(c, -2.2, -bl - 12, 4.4, 8.5, 1.5), '#8a5430', '#6a3a1e', { lw: 1.8, shadeY: -bl - 8 });
    ctx.strokeStyle = A.c('#5a321a');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(-2, -bl - 5.5 - i * 2.4);
      ctx.lineTo(2, -bl - 6.8 - i * 2.4);
    }
    ctx.stroke();
    A.ellipse(ctx, 0, -bl - 14, 3.2, 3.2, '#f2c14a', '#c08a2a', { lw: 1.8, hl: false });
    ctx.fillStyle = A.c('#e8384a');
    ctx.beginPath();
    ctx.arc(0, -bl - 14, 1.5, 0, TAU);
    ctx.fill();
    // 點燃中的火星（蓄力）／燒起來後往上飄的火粉
    if (wind || lit) {
      for (let i = 0; i < 5; i++) {
        const q = (t * (wind ? 4 : 2.5) + i * 0.21) % 1;
        const x = Math.sin(i * 2.3 + t * 3) * 6;
        const y = -2 - q * (wind ? 22 : 30);
        ctx.globalAlpha = ba * (1 - q);
        sparkle(ctx, x, y, 2.6 - q * 1.5, i % 2 ? '#ffe46a' : '#ff9a3a');
      }
      ctx.globalAlpha = ba;
    }
    ctx.restore();

    leg(-10, step, skin[0]);
    leg(10, -step, skin[0]);

    // 頭
    ctx.save();
    ctx.translate(15, by - 4);
    let hr = Math.sin(t * 2.5) * 0.04;
    if (wind) hr = 0.12;
    if (strike) hr = -0.12;
    if (hurt) hr = -0.3;
    ctx.rotate(hr);
    const hx = 9;
    const hy = -7;
    const head = (c) => {
      c.moveTo(hx - 13, hy + 7);
      c.bezierCurveTo(hx - 15, hy - 7, hx - 4, hy - 13, hx + 5, hy - 10);
      c.bezierCurveTo(hx + 12, hy - 8, hx + 18, hy - 2, hx + 17, hy + 3);
      c.bezierCurveTo(hx + 15, hy + 8, hx + 6, hy + 10, hx - 2, hy + 9);
      c.quadraticCurveTo(hx - 9, hy + 10, hx - 13, hy + 7);
      c.closePath();
    };
    A.shape(ctx, head, skin[0], skin[1], { cel: [2.5, 2.5], hl: [hx - 5, hy - 7, 4, 2] });
    ctx.save();
    ctx.beginPath();
    head(ctx);
    ctx.clip();
    A.ellipse(ctx, hx + 4, hy + 10, 12, 3.5, belly, null, { noStroke: true, hl: false });
    ctx.restore();
    ctx.fillStyle = A.c(dark);
    ctx.beginPath();
    ctx.arc(hx + 14.5, hy - 1.5, 1, 0, TAU);
    ctx.fill();
    // 眼睛（白底大眼）
    const kind = eyeKind(m);
    const ek = (lit || wind) && kind === 'normal' ? 'angry' : kind;
    [[hx + 1, hy - 3, 4.3], [hx + 9, hy - 3.5, 3.8]].forEach(([x, y, r]) => {
      A.ellipse(ctx, x, y, r, r * 1.1, '#fff8ec', null, { lw: 2, hl: false });
      if (ek === 'x') A.eye(ctx, x, y, 2, 2, 'x');
      else if (ek === 'closed') A.eye(ctx, x, y + 1, 2.4, 1.8, 'closed');
      else if (ek === 'hurt') A.eye(ctx, x, y, 2, 2.4, 'hurt');
      else A.eye(ctx, x + 1, y + 0.6, 2.2, 2.9, 'normal', 0);
    });
    if (ek === 'angry' && !m.dead) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 9.5);
      ctx.lineTo(hx + 4, hy - 7);
      ctx.moveTo(hx + 6, hy - 7.5);
      ctx.lineTo(hx + 12.5, hy - 9.5);
      ctx.stroke();
    }
    if (strike || hurt || wind) {
      A.shape(ctx, (c) => { c.moveTo(hx + 4, hy + 4); c.quadraticCurveTo(hx + 10, hy + 3, hx + 15, hy + 2); c.quadraticCurveTo(hx + 10, hy + 9, hx + 4, hy + 4); c.closePath(); }, '#7a2323', null, { lw: 1.8 });
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 5, hy + 4.5);
      ctx.quadraticCurveTo(hx + 10, hy + 6, hx + 14, hy + 3);
      ctx.stroke();
    }
    A.blush(ctx, hx - 4, hy + 3, 2.4);
    ctx.restore();
    ctx.restore();
    if (lit && fast) speedLines(ctx, -44, -20, 22, 3, 14, t, 'rgba(255,200,120,0.75)');
  }

  // ── 狂戰士岩：戴著有角鐵盔、臉上畫紅色戰紋的大石頭；rage 0..5 越來越紅、戰紋越亮、青筋越多、頭盔冒煙 ──
  function angerrock(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const rage = clamp(fx.rage || 0, 0, 5);
    const k = rage / 5;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const step = walk ? Math.sin(t * (9 + rage)) : 0;
    const shake = (k > 0.2 ? Math.sin(t * 57) * k * 1.6 : 0) + (wind ? Math.sin(t * 70) * 1.2 : 0);
    const col = [mixq('#b0a090', '#e25a3c', k * 0.85), mixq('#8a7868', '#a8322a', k * 0.85)];
    const crack = mixq('#7a6a5c', '#ffb43a', Math.max(0, (k - 0.5) * 2));
    const iron = ['#98a2b4', '#687286'];
    const bronze = ['#e0a844', '#b07a26'];
    const hornC = ['#f6ead0', '#d2bf96'];
    const paint = mixq('#d0302a', '#ff7a3a', k);
    // 變大由遊戲邏輯的 m.scale 處理（rage × 0.08），這裡不再額外放大
    ctx.save();
    ctx.translate(shake, 0);
    if (strike) ctx.rotate(0.12);
    if (hurt) ctx.rotate(-0.1);
    if (k >= 0.8) glow(ctx, 0, -30, 52, '255,70,40', 0.25 + Math.sin(t * 8) * 0.1);

    // 腳
    A.ellipse(ctx, -11, -4 - Math.max(0, step) * 3, 8.5, 5, col[1], null, { lw: 2.4, hl: false });
    A.ellipse(ctx, 12, -4 - Math.max(0, -step) * 3, 8.5, 5, col[1], null, { lw: 2.4, hl: false });

    // 後面的拳頭（纏著皮護腕）
    const fistUp = wind ? -22 : strike ? -2 : Math.sin(t * (4 + rage * 2)) * (1 + k * 2);
    A.ellipse(ctx, -27, -24 + fistUp * 0.6, 7, 6.5, col[1], null, { lw: 2.4, hl: false });

    // 身體：稜角分明的大石塊
    const breathe = 1 + Math.sin(t * (2 + rage)) * (0.015 + k * 0.02);
    ctx.save();
    ctx.translate(0, -4);
    ctx.scale(1 / breathe, breathe);

    // 頭盔的兩支彎角（在頭盔後面）
    const hs = 1 + k * 0.15;
    const horn = (x0, y0, s) => {
      ctx.save();
      ctx.translate(x0, y0);
      ctx.scale(s * hs, hs);
      const hp = (c) => {
        c.moveTo(-3, 5);
        c.bezierCurveTo(9, 6, 17, 0, 16, -19);
        c.quadraticCurveTo(15, -21, 13.5, -19);
        c.bezierCurveTo(12, -8, 6, -5, -3, -5);
        c.closePath();
      };
      A.shape(ctx, hp, hornC[0], hornC[1], { cel: [1.5, 1.5], lw: 2.6 });
      ctx.strokeStyle = A.c(hornC[1]);
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(6, -4.5);
      ctx.lineTo(7, 4);
      ctx.moveTo(11, -8);
      ctx.lineTo(13.5, -1);
      ctx.stroke();
      ctx.restore();
    };
    horn(-20, -45, -1);
    horn(24, -44, 1);

    const body = (c) => {
      c.moveTo(-25, -2);
      c.lineTo(-28, -24);
      c.lineTo(-20, -42);
      c.lineTo(-6, -50);
      c.lineTo(12, -48);
      c.lineTo(25, -36);
      c.lineTo(28, -16);
      c.lineTo(22, -1);
      c.closePath();
    };
    A.shape(ctx, body, col[0], col[1], { cel: [5, 5], hl: [-17, -30, 4, 2.5] });
    // 裂紋（越氣越會透出岩漿光）
    ctx.strokeStyle = A.c(crack);
    ctx.lineWidth = 1.8 + k * 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-28, -24);
    ctx.lineTo(-20, -20);
    ctx.lineTo(-22, -14);
    ctx.moveTo(22, -8);
    ctx.lineTo(15, -5);
    ctx.lineTo(14, 0);
    if (k > 0.5) {
      ctx.moveTo(26, -28);
      ctx.lineTo(20, -25);
      ctx.lineTo(22, -20);
    }
    ctx.stroke();

    // 鐵盔：圓頂、中脊、銅邊與鉚釘、護鼻
    const helm = (c) => {
      c.moveTo(-25, -36);
      c.bezierCurveTo(-26, -53, -12, -61, 2, -61);
      c.bezierCurveTo(17, -61, 30, -51, 29, -34);
      c.quadraticCurveTo(2, -43, -25, -36);
      c.closePath();
    };
    A.shape(ctx, helm, iron[0], iron[1], { cel: [3, 3], hl: [-10, -53, 5, 2.2] });
    ctx.strokeStyle = A.c('#c4ccda');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, -59);
    ctx.quadraticCurveTo(3, -50, 3, -42);
    ctx.stroke();
    const rim = (c) => {
      c.moveTo(-26, -35);
      c.quadraticCurveTo(2, -42, 30, -33);
      c.lineTo(29.5, -38);
      c.quadraticCurveTo(2, -47, -25.5, -40);
      c.closePath();
    };
    A.shape(ctx, rim, bronze[0], bronze[1], { lw: 2.2, shadeY: -37 });
    ctx.fillStyle = A.c('#6a4a1e');
    [[-19, -38.3], [-9, -40.2], [13, -40.2], [23, -37.6]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TAU); ctx.fill(); });
    A.shape(ctx, (c) => { c.moveTo(6, -41); c.lineTo(10.5, -41); c.lineTo(9.8, -31); c.quadraticCurveTo(8.25, -29, 6.7, -31); c.closePath(); }, iron[0], iron[1], { lw: 2, shadeY: -35 });

    // 臉
    const ey = -25;
    const kind = eyeKind(m);
    const ek = kind === 'normal' || kind === 'closed' ? (k > 0.35 || wind || strike ? 'angry' : kind) : kind;
    // 臉頰的紅色戰紋（越氣越亮）
    if (k > 0.5) {
      glow(ctx, -4, -16, 10, '255,110,60', (k - 0.5) * 1.2);
      glow(ctx, 20, -16, 10, '255,110,60', (k - 0.5) * 1.2);
    }
    ctx.strokeStyle = A.c(paint);
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -19);
    ctx.lineTo(-2, -17.5);
    ctx.moveTo(-9.5, -14.5);
    ctx.lineTo(-3, -13.5);
    ctx.moveTo(18, -17.5);
    ctx.lineTo(25, -19);
    ctx.moveTo(18.5, -13.5);
    ctx.lineTo(24.5, -14.5);
    ctx.stroke();
    faceEyes(ctx, 2, ey, 12, 4 + k * 0.4, 5 - k * 0.7, m, ek);
    if (!m.dead && kind !== 'hurt') {
      // 皺成倒八字的粗眉，越氣越斜
      const tilt = 3 + k * 5;
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, ey - 8 - tilt * 0.3);
      ctx.lineTo(5.5, ey - 6.5 + tilt * 0.4);
      ctx.moveTo(10.5, ey - 6.5 + tilt * 0.4);
      ctx.lineTo(19, ey - 8 - tilt * 0.3);
      ctx.stroke();
    }
    // 嘴：一開始嘟嘴，生氣後咬牙切齒
    const my = -11;
    if (rage >= 2 || strike || wind) {
      const mw = 8 + k * 3;
      A.shape(ctx, (c) => A.roundRect(c, 8 - mw, my - 4, mw * 2, 8, 3), '#fff6e6', null, { lw: 2.2 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8 - mw + 1, my);
      ctx.lineTo(8 + mw - 1, my);
      for (let i = 1; i < 4; i++) {
        const x = 8 - mw + (i * mw * 2) / 4;
        ctx.moveTo(x, my - 4);
        ctx.lineTo(x, my + 4);
      }
      ctx.stroke();
    } else if (hurt) {
      smallMouth(ctx, 8, my, true, 1.1);
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(8, my + 4, 4.5, 1.2 * PI, 1.8 * PI);
      ctx.stroke();
    }
    ctx.restore();

    // 青筋：rage 越高越多、跳得越快
    const veins = [[31, -26, 5.5], [-29, -30, 5], [-19, -8, 4.5], [25, -6, 4], [3, -70, 4.5]];
    const nv = Math.min(5, Math.floor(rage));
    for (let i = 0; i < nv; i++) {
      const v = veins[i];
      const pulse = 1 + Math.max(0, Math.sin(t * (6 + rage * 2) + i * 1.7)) * 0.22;
      angerMark(ctx, v[0], v[1], v[2] * pulse * (1 + k * 0.25), '#ff3b3b');
    }

    // 前面的拳頭（纏著皮護腕）
    const fx2 = strike ? 34 : 29;
    const fy = -22 + fistUp;
    A.shape(ctx, (c) => A.roundRect(c, fx2 - 11, fy - 5, 6, 10, 2), '#8a5a34', '#6a3e20', { lw: 2, shadeY: fy + 2 });
    A.ellipse(ctx, fx2, fy, 8, 7.5, col[0], col[1], { lw: 2.6, hl: false, cel: [2, 2] });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fx2 + 1, fy - 5);
    ctx.lineTo(fx2 + 1, fy + 1);
    ctx.moveTo(fx2 + 5, fy - 4);
    ctx.lineTo(fx2 + 5, fy + 1);
    ctx.stroke();
    if (strike) {
      ctx.strokeStyle = 'rgba(255,230,200,0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fx2 + 12, fy - 8);
      ctx.lineTo(fx2 + 18, fy - 12);
      ctx.moveTo(fx2 + 13, fy);
      ctx.lineTo(fx2 + 21, fy);
      ctx.moveTo(fx2 + 12, fy + 8);
      ctx.lineTo(fx2 + 18, fy + 12);
      ctx.stroke();
    }

    // 頭盔頂冒出的怒氣煙：越氣煙越多、越紅
    const ns = Math.round(rage);
    for (let i = 0; i < ns; i++) {
      const q = (t * (0.7 + k * 0.9) + i / ns) % 1;
      const x = 2 + Math.sin(i * 2.3) * 9 + Math.sin(t * 2 + i) * 3 - q * 4;
      const y = -66 - q * (20 + k * 16);
      puff(ctx, x, y, 2.5 + q * (4 + k * 4), mixq('#ffffff', '#c8584a', k * 0.7), (1 - q) * (0.7 + k * 0.3));
    }
    ctx.restore();
  }

  // ── 引力犰狳：灰藍色環節背甲上鑲著三顆紫色引力水晶；吸人時水晶發光、腳下浮現引力法陣，之後縮成球滾過來 ──
  function magnetdillo(ctx, m) {
    const ba = ctx.globalAlpha;
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const pulling = !!fx.pulling;
    const rolling = !!fx.rolling;
    const skin = ['#dcb6a6', '#b88e7e'];
    const armor = ['#8c96bc', '#5e6892'];
    const band = '#454e7a';

    if (rolling) {
      // 縮成一顆鑲水晶的甲殼球滾過來，身後拖著紫色引力殘光
      const R = 22;
      ctx.save();
      ctx.translate(0, -R - 1 + Math.abs(Math.sin(t * 12)) * -1.5);
      glow(ctx, -18, 0, 34, '190,130,255', 0.35);
      speedLines(ctx, -R - 4, 0, R * 1.4, 4, 16, t, 'rgba(210,170,255,0.8)');
      ctx.rotate(t * 13);
      A.shape(ctx, (c) => c.arc(0, 0, R, 0, TAU), armor[0], armor[1], { noStroke: true, shadeY: R * 0.3 });
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.clip();
      ctx.strokeStyle = A.c(band);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(i * 8, -R);
        ctx.quadraticCurveTo(i * 8 + 6, 0, i * 8, R);
      }
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.lineWidth = 3;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((i * TAU) / 3);
        crystal(ctx, 0, -R + 3, 7, 11, 0, AMETHYST, 0.35);
        ctx.restore();
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-8, -R - 9, 5, 3, -0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      if (hurt || m.dead) {
        // 露出暈頭的小臉
        faceEyes(ctx, 4, -24, 8, 2.8, 3.4, m);
      }
      return;
    }

    const step = walk ? Math.sin(t * 13) : 0;
    const pg = pulling ? 0.65 + Math.sin(t * 14) * 0.2 : wind ? 0.45 : 0.12 + Math.sin(t * 2.5) * 0.06;

    // 腳下的引力法陣
    if (pulling) {
      ctx.save();
      ctx.translate(-2, -1);
      ctx.scale(1, 0.28);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 54);
      g.addColorStop(0, 'rgba(200,150,255,0.45)');
      g.addColorStop(1, 'rgba(200,150,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 54, 0, TAU);
      ctx.fill();
      magicCircle(ctx, 50, t * 1.6, 'rgba(210,160,255,0.95)', 3, 8, 0);
      ctx.restore();
    }

    ctx.save();
    if (pulling) ctx.rotate(-0.06 + Math.sin(t * 40) * 0.01);
    if (hurt) ctx.rotate(-0.1);
    if (strike) ctx.translate(3, 0);
    const bob = walk ? Math.abs(step) * -1.2 : Math.sin(t * 2.5) * 0.6;

    // 後腳
    const foot = (x, s, col) => {
      const lift = Math.max(0, s) * 3;
      limb(ctx, (c) => { c.moveTo(x, -12 + bob); c.lineTo(x + s * 2, -3 - lift); }, 7, col);
      A.ellipse(ctx, x + 2 + s * 2, -2.5 - lift, 4.5, 2.5, col, null, { lw: 2, hl: false });
    };
    foot(-14, -step, skin[1]);
    foot(1, step, skin[1]);

    // 尾巴（也有環節）
    A.shape(ctx, (c) => { c.moveTo(-30, -14 + bob); c.quadraticCurveTo(-40, -12, -44, -6 + Math.sin(t * 3) * 2); c.quadraticCurveTo(-37, -7, -29, -7 + bob); c.closePath(); }, armor[0], armor[1], { lw: 2.4, shadeY: -9 });

    // 圓頂背甲
    const cx = -6;
    const cy = -9 + bob;
    const shell = (c) => {
      c.moveTo(cx - 29, cy + 1);
      c.bezierCurveTo(cx - 31, cy - 26, cx - 12, cy - 34, cx + 2, cy - 33);
      c.bezierCurveTo(cx + 18, cy - 32, cx + 30, cy - 20, cx + 29, cy + 1);
      c.quadraticCurveTo(cx, cy + 5, cx - 29, cy + 1);
      c.closePath();
    };
    A.shape(ctx, shell, armor[0], armor[1], { cel: [4, 4], noStroke: true });
    ctx.save();
    ctx.beginPath();
    shell(ctx);
    ctx.clip();
    // 環節
    ctx.strokeStyle = A.c(band);
    ctx.lineWidth = 2;
    ctx.beginPath();
    [-18, -9, 0, 9, 18].forEach((x) => {
      ctx.moveTo(cx + x * 1.05, cy + 4);
      ctx.quadraticCurveTo(cx + x * 1.2, cy - 16, cx + x * 0.7, cy - 36);
    });
    ctx.stroke();
    // 下緣一圈淺色甲邊
    ctx.strokeStyle = A.c('#b4bcd8');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 29, cy - 1);
    ctx.quadraticCurveTo(cx, cy + 3, cx + 29, cy - 1);
    ctx.stroke();
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - 15, cy - 22, 5, 2.5, -0.7, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    shell(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 三顆引力水晶（金色底座）
    const gems = [[cx - 13, cy - 27, 7, 12, -0.45], [cx + 2, cy - 31, 9.5, 17, 0], [cx + 16, cy - 25, 7, 12, 0.5]];
    gems.forEach(([x, y, w, h, r]) => {
      crystal(ctx, x, y + 2, w, h, r, AMETHYST, pg);
      A.ellipse(ctx, x, y + 2, w * 0.62, 2.2, '#f0c050', '#c0902a', { lw: 1.6, hl: false, rot: r });
    });

    // 前腳
    foot(-9, step, skin[0]);
    foot(5, -step, skin[0]);

    // 頭：尖尖長吻、大耳朵、頭頂一片小甲
    const hx = 25;
    const hy = -16 + bob + (wind ? 2 : 0);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(hurt ? -0.25 : pulling ? -0.05 : Math.sin(t * 2) * 0.04);
    A.shape(ctx, (c) => { c.moveTo(-6, -6); c.quadraticCurveTo(-8, -20, -1, -19); c.quadraticCurveTo(3, -12, 2, -5); c.closePath(); }, skin[0], '#e89a9a', { lw: 2.4, shadeY: -12 });
    A.shape(ctx, (c) => {
      c.moveTo(-8, -6);
      c.bezierCurveTo(-6, -14, 6, -12, 12, -5);
      c.quadraticCurveTo(18, 0, 19, 3);
      c.quadraticCurveTo(10, 7, -2, 6);
      c.quadraticCurveTo(-10, 4, -8, -6);
      c.closePath();
    }, skin[0], skin[1], { cel: [2, 2], hl: [-2, -8, 3, 1.5] });
    A.shape(ctx, (c) => { c.moveTo(-7, -7); c.quadraticCurveTo(0, -13, 8, -8); c.lineTo(6, -5); c.quadraticCurveTo(0, -8, -6, -4); c.closePath(); }, armor[0], armor[1], { lw: 2, shadeY: -6 });
    A.ellipse(ctx, 19, 2.5, 2.4, 2.2, '#6a3a3a', null, { lw: 1.5, hl: false });
    const kind = eyeKind(m);
    A.eye(ctx, 3, -2, 2.8, 3.4, pulling && kind === 'normal' ? 'angry' : kind, 0.8);
    if (hurt || strike) smallMouth(ctx, 10, 4, true, 0.7);
    A.blush(ctx, 1, 3, 2.6);
    ctx.restore();
    ctx.restore();

    // 引力：一圈圈往回收的紫色波紋、被吸過來的小石子與箭頭
    if (pulling) {
      const px = 34;
      const py = -20 + bob;
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const q = 1 - ((t * 1.3 + i / 4) % 1);
        const R = 12 + q * 70;
        ctx.globalAlpha = ba * Math.min(1, (1 - q) * 3) * Math.min(1, q * 1.5) * 0.9;
        ctx.strokeStyle = A.c(i % 2 ? '#c89aff' : '#8a64e8');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(px, py, R, R * 0.7, 0, -0.75, 0.75);
        ctx.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.1 + i / 3) % 1;
        const x = px + 80 - q * 64;
        const y = py + (i - 1) * 14 * (1 - q * 0.6) + 6;
        ctx.globalAlpha = ba * Math.sin(q * PI);
        A.shape(ctx, (c) => { c.moveTo(x - 3, y); c.lineTo(x, y - 3); c.lineTo(x + 3.5, y - 0.5); c.lineTo(x + 1, y + 3); c.closePath(); }, '#a89080', null, { lw: 1.4 });
        ctx.strokeStyle = A.c('#e8d8ff');
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x + 11, y - 4 - 6);
        ctx.lineTo(x + 7, y - 6);
        ctx.lineTo(x + 11, y + 4 - 6);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ── 三頭術士蛇：綠色三頭蛇盤成一團，三個頭各戴一頂小巫師帽，帽尖燃著紫色魔火（flames 0..3 顆亮著）──
  function candlesnake(ctx, m) {
    const ba = ctx.globalAlpha;
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const nFl = Math.round(clamp(fx.flames == null ? 3 : fx.flames, 0, 3));
    const scale = ['#7cc462', '#4e9642'];
    const belly = '#f2eab0';
    const hat = ['#6a54cc', '#48349c'];
    const slide = walk ? Math.sin(t * 8) : 0;

    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    // 尾巴尖從盤底後方翹出來
    limb(ctx, (c) => { c.moveTo(-22, -7); c.quadraticCurveTo(-34, -6, -37 + slide, -16 + Math.sin(t * 3) * 2); }, 8, scale[0]);
    // 盤繞的身體（兩圈，菱形鱗紋）
    const coil = (y, rx, ry) => {
      A.ellipse(ctx, 0, y, rx, ry, scale[0], scale[1], { cel: [3, 3], hl: [-rx * 0.4, y - ry * 0.4, rx * 0.2, ry * 0.25] });
      ctx.fillStyle = A.c('#5aa64a');
      for (let i = -2; i <= 2; i++) {
        const x = i * rx * 0.33 + slide * 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - ry * 0.55);
        ctx.lineTo(x + 3, y - ry * 0.1);
        ctx.lineTo(x, y + ry * 0.35);
        ctx.lineTo(x - 3, y - ry * 0.1);
        ctx.closePath();
        ctx.fill();
      }
    };
    coil(-7, 30, 8);
    coil(-18, 23, 7);
    A.ellipse(ctx, 0, -27, 14, 6.5, scale[0], scale[1], { cel: [2, 2], hl: false });

    // 三條脖子
    const sway = (i) => Math.sin(t * 2 + i * 1.9) * 2;
    let lunge = 0;
    if (wind) lunge = -5;
    if (strike) lunge = 7;
    const heads = [
      { bx: -6, by: -28, x: -28 + sway(0) + lunge * 0.6, y: -36, s: 0.86 },
      { bx: 6, by: -28, x: 25 + sway(2) + lunge, y: -35, s: 0.86 },
      { bx: 0, by: -30, x: -1 + sway(1) + lunge * 0.8, y: -54, s: 1 },
    ];
    heads.forEach((h, i) => {
      limb(ctx, (c) => {
        c.moveTo(h.bx, h.by);
        if (i < 2) c.bezierCurveTo(h.bx + (h.x - h.bx) * 0.9, h.by + 4, h.x - 2, h.by - 2, h.x - 2, h.y + 2);
        else c.quadraticCurveTo(h.bx - 3, h.by - 8, h.x - 2, h.y + 2);
      }, 10, scale[0]);
    });
    // 頭：圓圓的蛇頭（側臉、一隻大眼）＋小巫師帽
    const order = [2, 1, 0]; // 中間先亮，再右、再左
    heads.forEach((h, i) => {
      const litHere = order.indexOf(i) < nFl;
      const s = h.s;
      ctx.save();
      ctx.translate(h.x, h.y + 3);
      ctx.scale(s, s);
      ctx.rotate(strike ? 0.18 : wind ? -0.2 : Math.sin(t * 2.2 + i) * 0.05);
      const open = strike || hurt;
      const head = (c) => {
        c.moveTo(-8, 1);
        c.bezierCurveTo(-11, -8, -5, -15, 3, -14.5);
        c.bezierCurveTo(10, -14, 15, -9, 15, -5);
        c.quadraticCurveTo(15, open ? -3.5 : -1, 10, open ? -3 : 0);
        c.lineTo(3, open ? -2 : 1);
        c.quadraticCurveTo(-3, 3, -8, 1);
        c.closePath();
      };
      if (open) {
        // 下顎張開、兩顆小毒牙
        A.shape(ctx, (c) => { c.moveTo(-5, 0); c.lineTo(4, -1.5); c.quadraticCurveTo(10, -1, 13, 3); c.quadraticCurveTo(4, 5.5, -5, 2.5); c.closePath(); }, belly, null, { lw: 2 });
        ctx.fillStyle = A.c('#9a2a3a');
        ctx.beginPath();
        ctx.moveTo(3, -2.5);
        ctx.lineTo(13, -4);
        ctx.lineTo(12, 1.5);
        ctx.closePath();
        ctx.fill();
      }
      A.shape(ctx, head, scale[0], scale[1], { cel: [2.5, 2], hl: [-2, -11, 2.4, 1.4] });
      ctx.save();
      ctx.beginPath();
      head(ctx);
      ctx.clip();
      A.ellipse(ctx, 6, 1.5, 10, 3, belly, null, { noStroke: true, hl: false });
      ctx.restore();
      if (open) {
        ctx.fillStyle = A.c('#ffffff');
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, -3);
        ctx.lineTo(9, 0.5);
        ctx.lineTo(10, -3.2);
        ctx.fill();
        ctx.stroke();
      }
      // 眼睛（白底大眼）＋鼻孔
      const kind = eyeKind(m);
      const ek = (strike || wind) && kind === 'normal' ? 'angry' : kind;
      if (ek === 'normal' || ek === 'angry') {
        A.ellipse(ctx, 5, -7.5, 4, 4.4, '#fffbe8', null, { lw: 1.8, hl: false });
        A.eye(ctx, 6, -7, 2.2, 3, ek, 0);
      } else A.eye(ctx, 5.5, -7.5, 2.6, 3, ek);
      ctx.fillStyle = A.c('#2e5a26');
      ctx.beginPath();
      ctx.arc(12.5, -7.5, 0.9, 0, TAU);
      ctx.fill();
      if (!open && !m.dead && Math.sin(t * 1.6 + i * 2.1) > 0.8) {
        // 吐信
        ctx.strokeStyle = A.c('#e8453a');
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(13, -1.5);
        ctx.lineTo(18, -1);
        ctx.lineTo(21, -3);
        ctx.moveTo(18, -1);
        ctx.lineTo(21, 1);
        ctx.stroke();
      }
      A.blush(ctx, 3, -2, 1.8);

      // 巫師帽：帽簷、往後彎的尖帽、金色帽帶、小星星；熄火時帽尖垂下來
      ctx.save();
      ctx.translate(1, -13);
      ctx.rotate(-0.28);
      const droop = litHere ? 0 : 3;
      const tipX = -7 - droop;
      const tipY = -18 + droop;
      A.ellipse(ctx, 0, 0, 10.5, 3, hat[1], null, { lw: 2, hl: false });
      const cone = (c) => {
        c.moveTo(-6.5, -0.5);
        c.bezierCurveTo(-5, -8, -2, -13, tipX, tipY);
        c.bezierCurveTo(1, -14, 5, -8, 6.5, -0.5);
        c.quadraticCurveTo(0, 1.2, -6.5, -0.5);
        c.closePath();
      };
      A.shape(ctx, cone, hat[0], hat[1], { cel: [2, 1], hl: [-2.5, -7, 1.2, 2.5] });
      A.shape(ctx, (c) => { c.moveTo(-6.3, -1); c.quadraticCurveTo(0, 0.6, 6.3, -1); c.lineTo(5.6, -4); c.quadraticCurveTo(0, -2.6, -5.6, -4); c.closePath(); }, '#f2c440', null, { lw: 1.5 });
      sparkle(ctx, 0.5, -8, 2.4, '#ffe46a');
      if (litHere) {
        const big = wind ? 1.35 : strike ? 1.5 : 1;
        flame(ctx, tipX, tipY - 0.5, 4.8 * big, t, i * 2, strike ? 0.3 : wind ? -0.1 : -0.15, MAGIC);
      } else {
        // 熄掉的帽尖冒一縷紫煙
        ctx.strokeStyle = 'rgba(200,180,230,0.6)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let j = 0; j <= 8; j++) {
          const yy = tipY - 1 - j * 2.5;
          const xx = tipX + Math.sin(t * 3 + j * 0.8 + i) * 2.2 * (j / 8);
          j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    });
    // 三頭都點著魔火時，身邊飄著魔法星塵
    if (nFl >= 3 && !m.dead) {
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.8 + i / 3) % 1;
        ctx.globalAlpha = ba * Math.sin(q * PI) * 0.9;
        sparkle(ctx, Math.sin(i * 2.4 + t) * 28, -20 - q * 50, 2.6, '#e8c8ff');
      }
      ctx.globalAlpha = ba;
    }
    ctx.restore();
  }

  // ── 戰鎚甲蟲：綠色甲蟲用角扛著一把刻著發光符文的巨大戰鎚；跳起來時舉鎚過頭、出招時砸向地面 ──
  function weightbeetle(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const jump = !!fx.jump || m.onGround === false;
    const shell = ['#3aa878', '#227a56'];
    const legC = '#3a2e2a';
    const iron = ['#8a94a4', '#5c6574'];
    const step = walk ? Math.sin(t * 12) : 0;
    let sq = 1;
    if (wind) sq = 0.84;
    if (strike) sq = 0.8;
    if (jump) sq = 1.1;
    ctx.save();
    ctx.scale(1 / Math.sqrt(sq), sq);
    const lift = jump ? 6 : 0;
    const by = -17 - lift + (walk ? Math.abs(step) * -1 : 0);

    // 腳（三對，後面三隻較暗）
    const legs = (front, col) => {
      for (let i = 0; i < 3; i++) {
        const dx = i - 1; // -1 後腳、0 中腳、1 前腳
        const x0 = -8 + i * 11 + (front ? 2 : -3);
        const ph2 = step * (i % 2 ? 1 : -1) * (front ? 1 : -1);
        const bend = wind || strike ? 3 : 0;
        const knee = [x0 + dx * 12 + (dx === 0 ? (front ? 4 : -4) : 0), by + 7 + bend];
        const footP = jump
          ? [x0 + dx * 20 + (dx === 0 ? (front ? 8 : -8) : 0), by + 15]
          : [x0 + dx * 17 + (dx === 0 ? (front ? 6 : -6) : 0) + ph2 * 3, -1 - Math.max(0, ph2) * 3];
        limb(ctx, (c) => { c.moveTo(x0, by + 5); c.lineTo(knee[0], knee[1]); c.lineTo(footP[0], footP[1]); }, 5, col);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(footP[0], footP[1]);
        ctx.lineTo(footP[0] + (dx >= 0 ? 3 : -3), footP[1] + 1);
        ctx.stroke();
      }
    };
    legs(false, '#231a18');

    // 甲蟲身體
    const bx = -2;
    A.ellipse(ctx, bx, by, 30, 14, shell[0], shell[1], { cel: [4, 4], hl: false });
    ctx.strokeStyle = A.c('#1a5a40');
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(bx + 20, by - 11);
    ctx.quadraticCurveTo(bx, by - 6, bx - 28, by - 2);
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha *= 0.6;
    ctx.fillStyle = A.c('#9af0c8');
    ctx.beginPath();
    ctx.ellipse(bx - 14, by - 1, 7, 2.5, 0.1, 0, TAU);
    ctx.fill();
    ctx.restore();

    legs(true, legC);

    // 戰鎚：握點在頭前（用角勾著），平常扛在背上（鎚頭在後上方）
    const gx = 26;
    const gy = by - 4;
    const L = 40;
    let a = -2.45 + (walk ? Math.sin(t * 12 - 0.8) * 0.05 : Math.sin(t * 2) * 0.02);
    if (jump) a = -1.72;
    if (wind) a = -2.75;
    if (strike) a = 0.1;
    if (hurt) a = -2.6;
    const runeA = strike || jump ? 1 : wind ? 0.75 : 0.3 + Math.sin(t * 3) * 0.12;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(a);
    // 鎚柄（木頭＋皮纏＋鐵箍）
    A.shape(ctx, (c) => A.roundRect(c, -9, -2.6, L + 6, 5.2, 2.6), '#a8703e', '#7a4c26', { lw: 2.2, shadeY: 0.8 });
    ctx.strokeStyle = A.c('#5a3a22');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(-6 + i * 3, -2.4);
      ctx.lineTo(-4.5 + i * 3, 2.4);
    }
    ctx.stroke();
    A.ellipse(ctx, -10, 0, 3.6, 3.6, '#c8d0dc', '#8e98a8', { lw: 2, hl: false });
    // 鎚頭（跟鎚柄垂直的鐵塊，兩端包邊，正面刻符文）
    const hw = 19;
    const hh = 34;
    if (runeA > 0.5) glow(ctx, L, 0, 26, '110,230,255', (runeA - 0.3) * 0.7);
    A.shape(ctx, (c) => A.roundRect(c, L - hw / 2, -hh / 2, hw, hh, 3), iron[0], iron[1], { cel: [2.5, 2.5], hl: [L - 4, -hh / 2 + 7, 1.8, 4] });
    A.shape(ctx, (c) => A.roundRect(c, L - hw / 2 - 1.5, -hh / 2 - 2, hw + 3, 6.5, 2), '#4c5462', null, { lw: 2 });
    A.shape(ctx, (c) => A.roundRect(c, L - hw / 2 - 1.5, hh / 2 - 4.5, hw + 3, 6.5, 2), '#4c5462', null, { lw: 2 });
    ctx.fillStyle = A.c('#2e3440');
    ctx.beginPath();
    A.roundRect(ctx, L - 6.5, -9, 13, 18, 2.5);
    ctx.fill();
    if (runeA > 0) glow(ctx, L, 0, 12, '140,240,255', runeA * 0.8);
    rune(ctx, L, 0, 6, 3, A.c(runeA > 0.6 ? '#e0ffff' : '#7ae8ff'), 2.2);
    ctx.restore();

    // 頭與角（角勾著鎚柄）
    const hx = 30;
    const hy = by - 1 + (wind ? 3 : 0);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(hurt ? -0.2 : strike ? 0.15 : Math.sin(t * 2) * 0.03);
    limb(ctx, (c) => { c.moveTo(3, -7); c.quadraticCurveTo(8, -18, 15, -17 + Math.sin(t * 4) * 1.5); }, 3.5, legC);
    A.shape(ctx, (c) => { c.moveTo(4, -6); c.quadraticCurveTo(14, -10, 17, -24); c.quadraticCurveTo(20, -8, 10, 0); c.closePath(); }, '#2e4a3e', '#1e3028', { lw: 2.4, shadeY: -8 });
    A.ellipse(ctx, 0, 0, 11, 9, '#2e4a3e', '#1e3028', { cel: [2, 2], hl: [-3, -4, 2.5, 1.5] });
    const kind = eyeKind(m);
    [[1, -1.5, 3.4], [7, -2, 3]].forEach(([x, y, r]) => {
      A.ellipse(ctx, x, y, r, r * 1.15, '#ffffff', null, { lw: 1.8, hl: false });
      if (kind === 'x') A.eye(ctx, x, y, 1.8, 1.8, 'x');
      else if (kind === 'closed') A.eye(ctx, x, y + 1, 2, 1.5, 'closed');
      else if (kind === 'hurt') A.eye(ctx, x, y, 1.6, 2, 'hurt');
      else A.eye(ctx, x + 0.7, y + 0.5, 1.8, 2.4, 'normal', 0);
    });
    if (!m.dead && kind !== 'hurt') {
      ctx.strokeStyle = A.c('#9af0c8');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2, -7);
      ctx.lineTo(4, -5.5);
      ctx.moveTo(6, -6);
      ctx.lineTo(10, -7.5);
      ctx.stroke();
    }
    ctx.restore();

    // 汗滴（扛得好吃力）
    if (walk || wind) {
      const q = (t * 1.5) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      A.shape(ctx, (c) => {
        const x = 42;
        const y = by - 16 + q * 8;
        c.moveTo(x, y - 5);
        c.quadraticCurveTo(x + 3.5, y, x, y + 2.5);
        c.quadraticCurveTo(x - 3.5, y, x, y - 5);
        c.closePath();
      }, '#bfe8ff', null, { lw: 1.5 });
      ctx.restore();
    }
    ctx.restore();

    // 鎚子砸地的衝擊
    if (strike) {
      const ix = 66;
      ctx.strokeStyle = 'rgba(200,250,255,0.9)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let s = -1; s <= 1; s += 2) {
        ctx.moveTo(ix + s * 14, -6);
        ctx.lineTo(ix + s * 24, -14);
        ctx.moveTo(ix + s * 16, -2);
        ctx.lineTo(ix + s * 28, -3);
      }
      ctx.stroke();
      puff(ctx, ix - 18, -4, 6, '#e8c8a0', 0.8);
      puff(ctx, ix + 18, -4, 6, '#e8c8a0', 0.8);
    }
  }

  // ── 魔導書蝙蝠：紫色毛球蝙蝠，一對翅膀是一本攤開的風系魔導書（前翅看得到寫滿風咒的書頁、後翅是皮革封面）；
  //    吹咒風（blow）時書頁嘩啦嘩啦翻、符文發綠光 ──
  function bellowsbat(ctx, m) {
    const ba = ctx.globalAlpha;
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const blow = clamp(fx.blow || (strike ? 1 : 0), 0, 1);
    const fur = ['#7a5c9e', '#58407a'];
    const cover = ['#2f7a68', '#1f5a4c'];
    const page = ['#fbf2d8', '#e2d2a8'];
    const gold = '#f0c64a';
    const flap = blow > 0.3 ? Math.sin(t * 22) * 0.35 : Math.sin(t * 9);
    const by = -30 + Math.sin(t * 9 + 1) * 2.5;
    const runeCol = blow > 0.2 || wind ? '#3ad8a0' : '#3a8a78';
    ctx.save();
    if (hurt) ctx.rotate(-0.15);

    // 書籤緞帶（從書背垂下來，當作尾巴）
    const rs = Math.sin(t * 4) * 3;
    A.shape(ctx, (c) => {
      c.moveTo(-5, by + 8);
      c.quadraticCurveTo(-9 + rs * 0.5, by + 18, -8 + rs, by + 28);
      c.lineTo(-5.5 + rs, by + 25);
      c.lineTo(-3 + rs, by + 28.5);
      c.quadraticCurveTo(-3 + rs * 0.5, by + 18, -1, by + 8);
      c.closePath();
    }, '#e04858', '#b02e40', { lw: 2, shadeY: by + 20 });

    // 魔導書翅膀：書背在肩膀，往外攤開；翅膀尖端有一根小爪
    const wing = (side, back) => {
      ctx.save();
      ctx.translate(side * 7, by - 6);
      ctx.scale(side, 1);
      ctx.rotate(-0.5 + flap * 0.42 + (back ? -0.18 : 0));
      if (back) ctx.scale(0.9, 0.9);
      const L = 30;
      const H = 13;
      const leaf = (c, dx, dy, l, h) => {
        c.moveTo(dx, dy - h);
        c.quadraticCurveTo(dx + l * 0.5, dy - h - 4, dx + l, dy - h + 1);
        c.lineTo(dx + l, dy + h - 1);
        c.quadraticCurveTo(dx + l * 0.5, dy + h + 2, dx, dy + h);
        c.closePath();
      };
      // 封面（皮革、金色包角）
      A.shape(ctx, (c) => leaf(c, -1, 0, L + 3, H + 2), cover[0], cover[1], { cel: [2, 2], lw: 2.4 });
      ctx.fillStyle = A.c(gold);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.5;
      [[-1, 1], [1, 1]].forEach(([, sy]) => {
        ctx.beginPath();
        ctx.moveTo(L + 2, sy * (H + 1) - sy * 0.5);
        ctx.lineTo(L + 2, sy * (H + 1) - sy * 7);
        ctx.lineTo(L - 5, sy * (H + 1) + (sy < 0 ? -2.5 : 1.5));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      if (back) {
        // 後翅只看得到封面：中央一個金色風紋徽記
        ctx.strokeStyle = A.c(gold);
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(L * 0.52, 0, 5.5, PI * 0.2, PI * 1.7);
        ctx.moveTo(L * 0.52 - 7, 4);
        ctx.quadraticCurveTo(L * 0.52, 8, L * 0.52 + 8, 3);
        ctx.stroke();
      } else {
        // 前翅：一疊書頁（側邊露出頁緣），最上面那頁寫滿風咒
        A.shape(ctx, (c) => leaf(c, 1, 1.5, L - 1, H - 1), page[1], null, { lw: 1.6 });
        A.shape(ctx, (c) => leaf(c, 1, 0, L - 2, H - 1.5), page[0], page[1], { lw: 2, shadeY: H - 5 });
        if (blow > 0.2 || wind) glow(ctx, L * 0.5, 0, 18, '80,240,180', 0.35 + blow * 0.3);
        for (let r = 0; r < 3; r++) {
          for (let j = 0; j < 4; j++) {
            rune(ctx, 6 + j * 6, -6.5 + r * 6.5, 2.1, r * 4 + j * 3 + 1, A.c(runeCol), 1.3);
          }
        }
        // 吹風時一頁一頁翻過去
        if (blow > 0.2) {
          const q = (t * 3) % 1;
          ctx.save();
          ctx.scale(Math.cos(q * PI), 1);
          A.shape(ctx, (c) => leaf(c, 0, -0.5, L - 3, H - 2.5), '#fffaf0', page[1], { lw: 1.6, shadeY: H - 4 });
          ctx.restore();
        }
      }
      // 小爪（翅膀頂端、書背上方）
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(1, -H - 1);
      ctx.quadraticCurveTo(0, -H - 6, -3, -H - 6);
      ctx.stroke();
      ctx.strokeStyle = A.c('#4a3460');
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    };
    wing(-1, true);
    wing(1, false);

    // 小腳爪
    limb(ctx, (c) => { c.moveTo(-4, by + 12); c.lineTo(-5, by + 19); c.moveTo(4, by + 12); c.lineTo(5, by + 19); }, 4, '#4a3460');

    // 身體（毛茸茸）
    const puffC = 1 + blow * 0.12;
    const fluff = (c) => {
      const n = 12;
      const R = 15;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU;
        const a1 = ((i + 1) / n) * TAU;
        const am = (a0 + a1) / 2;
        if (!i) c.moveTo(Math.cos(a0) * R, by + Math.sin(a0) * R * 0.95);
        c.quadraticCurveTo(Math.cos(am) * R * 1.13, by + Math.sin(am) * R * 1.08, Math.cos(a1) * R, by + Math.sin(a1) * R * 0.95);
      }
      c.closePath();
    };
    const ear = (x, s) => A.shape(ctx, (c) => { c.moveTo(x - 5, by - 11); c.lineTo(x + s * 2, by - 27 + (blow > 0.5 ? 3 : 0)); c.lineTo(x + 6, by - 10); c.closePath(); }, fur[0], fur[1], { lw: 2.4, shadeY: by - 16 });
    ear(-7, -1);
    ear(6, 1);
    A.shape(ctx, fluff, fur[0], fur[1], { cel: [3, 3], hl: [-6, by - 8, 3.5, 2] });
    A.ellipse(ctx, 1, by + 5, 8, 6, '#b69ad0', null, { noStroke: true, hl: false });

    // 臉：吹風時鼓起腮幫子、嘟成 O 形嘴
    const fxX = 5;
    const fy = by - 3;
    const kind = eyeKind(m);
    const ek = (blow > 0.5 || wind) && kind === 'normal' ? 'angry' : kind;
    faceEyes(ctx, fxX - 3, fy - 3, 9, 3, 3.8, m, ek);
    A.ellipse(ctx, fxX + 5, fy + 2, 2.2, 1.6, '#e8a0b8', null, { lw: 1.4, hl: false });
    if (blow > 0.2) {
      A.ellipse(ctx, fxX - 5, fy + 5, 4.5 * puffC, 3.8 * puffC, '#9a7ec0', null, { lw: 2, hl: false });
      A.ellipse(ctx, fxX + 11, fy + 5, 3.6 * puffC, 3.4 * puffC, '#9a7ec0', null, { lw: 2, hl: false });
      A.ellipse(ctx, fxX + 5, fy + 7, 2.4, 2.6, '#6a2a3a', null, { lw: 1.6, hl: false });
    } else {
      A.blush(ctx, fxX - 5, fy + 4, 2.6);
      ctx.fillStyle = A.c('#ffffff');
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(fxX + 2, fy + 6);
      ctx.lineTo(fxX + 3.5, fy + 9);
      ctx.lineTo(fxX + 5, fy + 6);
      ctx.fill();
      ctx.stroke();
    }
    // 吐出的咒風：綠色風線夾著符文
    if (blow > 0.05) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const q = (t * 3 + i / 4) % 1;
        const x = fxX + 12 + q * 44 * (0.5 + blow);
        const y = fy + 6 + (i - 1.5) * 5 * (0.4 + q);
        ctx.globalAlpha = ba * (1 - q) * blow;
        ctx.strokeStyle = A.c(i % 2 ? '#c8ffe8' : '#7af0c0');
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 6 + blow * 4, y - 3, x + 10 + blow * 8, y);
        ctx.stroke();
        if (i % 2) rune(ctx, x + 6, y - 6, 2.4, i + Math.floor(t * 3), A.c('#b8ffe0'), 1.3);
      }
      ctx.globalAlpha = ba;
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 重鎧山羊：白色山羊穿全身騎士重鎧（鋼板身甲＋紅色馬衣、鋼護脛、護頸），頭盔頂著紅色羽飾、彎角從頭盔穿出來 ──
  function potgoat(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const charge = !!fx.charge || strike;
    const steel = ['#d6dde8', '#9aa4b6'];
    const steelD = '#6e788c';
    const gold = ['#f2c24a', '#c08a2a'];
    const cloth = ['#d23c46', '#a0262e'];
    const goat = ['#f7f0e2', '#d8ccb4'];
    const horn = ['#9a8672', '#6e5c4a'];
    const run = charge && walk;
    const step = walk ? Math.sin(t * (run ? 20 : 11)) : 0;
    ctx.save();
    if (charge) ctx.rotate(0.06);
    if (wind) ctx.rotate(-0.07);
    if (hurt) ctx.rotate(-0.1);
    const bob = walk ? -Math.abs(step) * 2 : Math.sin(t * 2.4) * 0.6;
    const cy = -32 + bob;

    // 腳：白毛大腿＋鋼護脛＋鐵靴
    const leg = (x, s, col) => {
      const lift = Math.max(0, s) * 4;
      const fx2 = x + s * 3;
      limb(ctx, (c) => { c.moveTo(x, cy + 10); c.lineTo(fx2, -5 - lift); }, 7, col);
      A.shape(ctx, (c) => A.roundRect(c, fx2 - 4.2, -16 - lift, 8.4, 10, 3), col === goat[0] ? steel[0] : steel[1], steelD, { lw: 2, shadeY: -9 - lift });
      A.shape(ctx, (c) => A.roundRect(c, fx2 - 4.5, -7 - lift, 9.5, 7, 2.2), '#5a6272', null, { lw: 2 });
    };
    leg(-16, -step, goat[1]);
    leg(10, step, goat[1]);
    if (wind) dust(ctx, 14, 0, t, 1);

    // 尾巴（從鎧甲後面冒出的一撮毛）
    A.shape(ctx, (c) => { c.moveTo(-30, cy - 6); c.quadraticCurveTo(-41, cy - 14 + Math.sin(t * 6) * 2, -37, cy - 1); c.closePath(); }, goat[0], goat[1], { lw: 2.2, shadeY: cy - 6 });

    // 身甲：圓滾滾的鋼板，下緣垂著紅色馬衣（金邊）
    const barrel = (c) => {
      c.moveTo(-30, cy - 8);
      c.bezierCurveTo(-32, cy - 23, -12, cy - 24, 6, cy - 21);
      c.bezierCurveTo(24, cy - 19, 30, cy - 10, 30, cy);
      c.bezierCurveTo(30, cy + 12, 20, cy + 18, 0, cy + 18);
      c.bezierCurveTo(-18, cy + 18, -32, cy + 12, -30, cy - 8);
      c.closePath();
    };
    A.shape(ctx, barrel, steel[0], steel[1], { cel: [4, 4], noStroke: true });
    ctx.save();
    ctx.beginPath();
    barrel(ctx);
    ctx.clip();
    // 甲片接縫與鉚釘
    ctx.strokeStyle = A.c(steelD);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    [-16, 0, 15].forEach((x) => {
      ctx.moveTo(x, cy - 26);
      ctx.quadraticCurveTo(x + 5, cy - 8, x + 1, cy + 8);
    });
    ctx.stroke();
    ctx.fillStyle = A.c(steelD);
    [-16, 0, 15].forEach((x) => {
      [cy - 17, cy - 8].forEach((y, j) => { ctx.beginPath(); ctx.arc(x + 2.2 + j * 1.2 + 3, y, 1.2, 0, TAU); ctx.fill(); });
    });
    // 馬衣（紅布、金邊、下緣是一片片的垂布）
    A.shape(ctx, (c) => {
      c.moveTo(-40, cy + 4);
      c.quadraticCurveTo(0, cy + 8, 40, cy + 2);
      c.lineTo(40, cy + 30);
      c.lineTo(-40, cy + 30);
      c.closePath();
    }, cloth[0], cloth[1], { cel: [3, 3], noStroke: true });
    ctx.strokeStyle = A.c(gold[0]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-40, cy + 4);
    ctx.quadraticCurveTo(0, cy + 8, 40, cy + 2);
    ctx.stroke();
    // 馬衣上的金色小盾徽
    A.shape(ctx, (c) => { c.moveTo(-4, cy + 8); c.lineTo(4, cy + 8); c.lineTo(4, cy + 12); c.quadraticCurveTo(0, cy + 16, -4, cy + 12); c.closePath(); }, gold[0], gold[1], { lw: 1.4, shadeY: cy + 12 });
    // 鋼甲反光
    ctx.globalAlpha *= 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-12, cy - 15, 9, 2.6, -0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    barrel(ctx);
    ctx.lineWidth = 3;
    ctx.strokeStyle = A.outline();
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 受傷時的刮痕／凹痕
    if (hurt || m.dead) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, cy - 19);
      ctx.lineTo(-11, cy - 12);
      ctx.lineTo(-7, cy - 8);
      ctx.moveTo(-11, cy - 12);
      ctx.lineTo(-16, cy - 10);
      ctx.stroke();
    }

    leg(-10, step, goat[0]);
    leg(16, -step, goat[0]);

    // 頭的位置：平常抬頭、衝撞時低頭把角對準前方、蓄力時往後仰
    let hx = 30;
    let hy = cy - 30;
    let hr = Math.sin(t * 2) * 0.04;
    if (charge) { hx = 38; hy = cy - 14; hr = 0.75; }
    if (wind) { hx = 26; hy = cy - 33; hr = -0.35; }
    if (hurt) { hx = 26; hy = cy - 30; hr = -0.4; }
    // 護頸：一節一節的鋼環
    const mx = 18;
    const my = cy - 15;
    limb(ctx, (c) => { c.moveTo(mx, my); c.lineTo(hx - 3, hy + 4); }, 14, steel[0]);
    {
      const dx = hx - 3 - mx;
      const dy = hy + 4 - my;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      ctx.strokeStyle = A.c(steelD);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      [0.3, 0.6].forEach((q) => {
        const px = mx + dx * q;
        const py = my + dy * q;
        ctx.moveTo(px - nx * 5, py - ny * 5);
        ctx.lineTo(px + nx * 5, py + ny * 5);
      });
      ctx.stroke();
    }
    // 肩甲
    A.shape(ctx, (c) => c.ellipse(mx - 1, my + 3, 11, 7, -0.3, 0, TAU), steel[0], steel[1], { lw: 2.4, shadeY: my + 5, hl: [mx - 5, my, 3, 1.2] });
    ctx.strokeStyle = A.c(gold[0]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(mx - 1, my + 3, 8, 4.5, -0.3, 0.1 * PI, 0.9 * PI);
    ctx.stroke();

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(hr);
    const hornP = (c) => {
      c.moveTo(-3, -6);
      c.bezierCurveTo(-10, -19, -24, -15, -21, -3);
      c.bezierCurveTo(-19, 3, -12, 2, -13, -4);
      c.bezierCurveTo(-14, -9, -8, -10, 3, -2);
      c.closePath();
    };
    A.shape(ctx, hornP, horn[1], null, { lw: 2.4 });
    // 臉（長臉，吻部朝右下）
    const face = (c) => {
      c.moveTo(-8, -4);
      c.bezierCurveTo(-8, -13, 6, -14, 10, -5);
      c.bezierCurveTo(14, 2, 18, 6, 16, 10);
      c.bezierCurveTo(13, 14, 4, 13, -2, 8);
      c.bezierCurveTo(-7, 5, -8, 1, -8, -4);
      c.closePath();
    };
    A.shape(ctx, face, goat[0], goat[1], { cel: [2.5, 2.5], hl: [3, -3, 2.5, 1.4] });
    A.shape(ctx, (c) => { c.moveTo(6, 11); c.quadraticCurveTo(7, 20, 4 + Math.sin(t * 3) * 1.5, 22); c.quadraticCurveTo(2, 16, 1, 10); c.closePath(); }, goat[0], goat[1], { lw: 2, shadeY: 16 });
    A.ellipse(ctx, 15, 7, 2.6, 2, '#e8a0a0', null, { lw: 1.5, hl: false });
    // 頭盔：鋼盔蓋住額頭與後腦，金色盔緣
    const helm = (c) => {
      c.moveTo(-11, 2);
      c.bezierCurveTo(-13, -11, -3, -18, 5, -16.5);
      c.bezierCurveTo(11, -15, 14, -11, 13.5, -7);
      c.quadraticCurveTo(4, -9.5, -2, -5.5);
      c.quadraticCurveTo(-6, -2, -11, 2);
      c.closePath();
    };
    A.shape(ctx, helm, steel[0], steel[1], { cel: [2, 2], hl: [-3, -13, 3, 1.4] });
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(13.5, -7);
    ctx.quadraticCurveTo(4, -9.5, -2, -5.5);
    ctx.quadraticCurveTo(-6, -2, -11, 2);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4.2;
    ctx.stroke();
    ctx.strokeStyle = A.c(gold[0]);
    ctx.lineWidth = 2;
    ctx.stroke();
    // 羽飾：插在頭盔頂，平常輕輕擺，衝撞時往後飄
    const fl = Math.sin(t * (charge ? 14 : 3)) * (charge ? 2.5 : 1.5);
    const pb = charge ? -8 : wind ? 2 : 0;
    A.shape(ctx, (c) => {
      c.moveTo(-1, -16);
      c.bezierCurveTo(-3, -28 - pb * 0.3, -12 + pb, -31 + fl, -22 + pb * 1.5, -26 + fl * 1.5);
      c.quadraticCurveTo(-17 + pb, -24 + fl, -14 + pb * 0.8, -22 + fl);
      c.quadraticCurveTo(-8, -20, 3, -15.5);
      c.closePath();
    }, cloth[0], cloth[1], { lw: 2.2, shadeY: -20 });
    ctx.strokeStyle = A.c('#ff8a90');
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(-8, -25 + fl * 0.5, -17 + pb, -25 + fl);
    ctx.stroke();
    A.ellipse(ctx, 1, -16, 2.6, 2, gold[0], null, { lw: 1.5, hl: false });
    // 前耳（從頭盔下露出來）
    A.ellipse(ctx, -6, 1, 7.5, 3.4, goat[0], null, { rot: 0.6, lw: 2.2, hl: false });
    A.ellipse(ctx, -6, 1, 4.5, 1.6, '#f0b8b0', null, { rot: 0.6, noStroke: true, hl: false });
    // 前角（從頭盔側面穿出，有節紋）
    ctx.save();
    ctx.translate(3, -1);
    A.shape(ctx, hornP, horn[0], horn[1], { lw: 2.4, shadeY: -6 });
    ctx.strokeStyle = A.c(horn[1]);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-8, -13);
    ctx.lineTo(-6, -8);
    ctx.moveTo(-14, -13);
    ctx.lineTo(-13, -8);
    ctx.moveTo(-19, -9);
    ctx.lineTo(-15, -7);
    ctx.stroke();
    ctx.restore();
    // 山羊的橫長瞳孔
    const kind = eyeKind(m);
    const ex = 5;
    const ey = -2.5;
    if (kind === 'x' || kind === 'hurt' || kind === 'closed') {
      A.eye(ctx, ex, ey, 2.4, 2.8, kind);
    } else {
      A.ellipse(ctx, ex, ey, 4.2, 4.2, '#fff3c8', null, { lw: 1.8, hl: false });
      ctx.fillStyle = A.c('#2b1a12');
      ctx.beginPath();
      A.roundRect(ctx, ex - 2.2, ey - 1.1, 5.6, 2.4, 1);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 1.2, ey - 2.3, 1, 0, TAU);
      ctx.fill();
      if (charge || wind || kind === 'angry') {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - 5, ey - 6.5);
        ctx.lineTo(ex + 5, ey - 3.8);
        ctx.stroke();
      }
    }
    if (hurt || strike) smallMouth(ctx, 10, 11, true, 0.7);
    else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(9, 10.5);
      ctx.quadraticCurveTo(12, 12, 15, 10);
      ctx.stroke();
    }
    A.blush(ctx, 2, 4.5, 2.6);
    ctx.restore();

    if (charge) {
      speedLines(ctx, -34, cy, 30, 4, 18, t, 'rgba(255,240,220,0.8)');
      dust(ctx, -26, 0, t, 1.2);
    }
    ctx.restore();
  }

  // ── 元素變色龍：身上浮現的元素紋跟著切換（紅＝火元素：火焰背鰭、尾巴著火；藍＝水元素：波紋、身邊繞著水珠；
  //    黃＝光元素：頭上光環、身邊閃光、治癒同伴時冒出光之十字）；沒有元素時是普通的綠色 ──
  const MOODS = {
    red: { body: '#ec5236', shade: '#b83426', belly: '#ffc488', crest: '#ffcf4a', mark: '#ffb040', sigil: '#fff0a0' },
    blue: { body: '#3f8ee0', shade: '#2a62ac', belly: '#b8e0ff', crest: '#7ad8ff', mark: '#9ad4ff', sigil: '#e8f8ff' },
    yellow: { body: '#f7c93a', shade: '#d49c1e', belly: '#fff6c0', crest: '#fffbe0', mark: '#fff0a0', sigil: '#ffffff' },
    green: { body: '#6cc05a', shade: '#4a9440', belly: '#dcf2a8', crest: '#a8e070', mark: '#4a9440', sigil: null },
  };
  function moodchameleon(ctx, m) {
    const ba = ctx.globalAlpha;
    const fx = m.fx || {};
    const t = m.t || 0;
    const mood = MOODS[fx.mood] ? fx.mood : 'green';
    const P = MOODS[mood];
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const red = mood === 'red';
    const blue = mood === 'blue';
    const yellow = mood === 'yellow';
    const step = walk ? Math.sin(t * (red ? 16 : blue ? 9 : 11)) : 0;
    ctx.save();
    // 姿勢
    let hop = 0;
    if (yellow) hop = Math.abs(Math.sin(t * 6)) * 4;
    if (red) ctx.translate(Math.sin(t * 45) * 0.8, 0);
    ctx.translate(0, -hop);
    if (red) ctx.rotate(0.06 + (strike ? 0.08 : 0));
    if (hurt) ctx.rotate(-0.12);
    if (red) glow(ctx, 4, -26, 44, '255,90,50', 0.22 + Math.sin(t * 10) * 0.08);
    if (blue) glow(ctx, 0, -24, 44, '90,170,255', 0.2);
    if (yellow) glow(ctx, 0, -26, 48, '255,236,140', 0.34 + Math.sin(t * 4) * 0.06);
    const by = -19 + (walk ? -Math.abs(step) * 1.2 : Math.sin(t * 2.5) * 0.6);

    // 腳（變色龍的夾子腳）
    const foot = (x, s, col) => {
      const lift = Math.max(0, s) * 3;
      limb(ctx, (c) => { c.moveTo(x, by + 4); c.lineTo(x + 4, by + 10); c.lineTo(x + 2 + s * 2, -3 - lift); }, 5.5, col);
      A.ellipse(ctx, x + 2 + s * 2, -2.5 - lift, 4, 2.5, col, null, { lw: 2, hl: false });
    };
    foot(-14, -step, P.shade);
    foot(8, step, P.shade);

    // 尾巴：捲起來；火元素時尾巴尖著火、水元素時尾巴尖掛著一顆水珠
    const tb = [-24, by + 1];
    const tailPts = [];
    const turns = yellow ? 2.2 : red ? 1.2 : blue ? 1.5 : 1.7;
    const R0 = yellow ? 13 : 12;
    const swayT = Math.sin(t * (red ? 8 : 2.5)) * 0.1;
    const ccx = tb[0] - 10;
    const ccy = tb[1] - (red ? 16 : 10);
    tailPts.push(tb);
    for (let i = 0; i <= 26; i++) {
      const q = i / 26;
      const a = 0.9 + swayT - q * turns * PI;
      const r = R0 * (1 - q * 0.8);
      tailPts.push([ccx + Math.cos(a) * r, ccy + Math.sin(a) * r]);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    tailPts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = A.c(P.body);
    ctx.lineWidth = 5.5;
    ctx.stroke();
    ctx.restore();
    const tip = tailPts[Math.round(tailPts.length * 0.62)];
    if (red) flame(ctx, tip[0], tip[1] - 2, 3.6, t, 1, -0.1);

    // 身體
    const body = (c) => {
      c.moveTo(-26, by + 2);
      c.bezierCurveTo(-26, by - 14, -6, by - 18, 10, by - 14);
      c.bezierCurveTo(22, by - 10, 24, by + 2, 18, by + 8);
      c.bezierCurveTo(8, by + 13, -18, by + 13, -26, by + 2);
      c.closePath();
    };
    // 背鰭：火＝搖曳的火舌、水＝圓圓的鰭、光＝發亮的小水晶、平常＝鋸齒
    const spikes = red ? 6 : 5;
    for (let i = 0; i < spikes; i++) {
      const q = i / (spikes - 1);
      const x = -22 + q * 36;
      const y = by - 13 - Math.sin(q * PI) * 3;
      if (red) {
        const hh = 7 + Math.sin(t * 20 + i * 1.7) * 2;
        const lean = Math.sin(t * 9 + i) * 1.5 - 1.5;
        A.shape(ctx, (c) => { c.moveTo(x - 3.5, y + 3); c.quadraticCurveTo(x - 2.5, y - hh * 0.5, x + lean, y - hh); c.quadraticCurveTo(x + 3.5, y - hh * 0.4, x + 3.5, y + 3); c.closePath(); }, '#ffb43a', '#ff7a2a', { lw: 2, shadeY: y - 1 });
      } else if (blue) {
        A.shape(ctx, (c) => { c.moveTo(x - 4, y + 3); c.arc(x, y + 2, 4, PI, 0); c.closePath(); }, P.crest, null, { lw: 2 });
      } else if (yellow) {
        A.shape(ctx, (c) => { c.moveTo(x - 3, y + 2); c.lineTo(x, y - 6); c.lineTo(x + 3, y + 2); c.closePath(); }, P.crest, '#ffe070', { lw: 2, shadeY: y });
      } else {
        A.shape(ctx, (c) => { c.moveTo(x - 3.5, y + 3); c.lineTo(x, y - 4); c.lineTo(x + 3.5, y + 3); c.closePath(); }, P.crest, null, { lw: 2 });
      }
    }
    A.shape(ctx, body, P.body, P.shade, { cel: [3.5, 3.5], hl: [-10, by - 9, 5, 2] });
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    A.ellipse(ctx, 0, by + 12, 22, 6, P.belly, null, { noStroke: true, hl: false });
    // 元素紋路
    ctx.strokeStyle = A.c(P.mark);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (red) {
      for (let i = 0; i < 3; i++) {
        const x = -20 + i * 8;
        ctx.moveTo(x - 3, by + 2);
        ctx.lineTo(x, by - 7);
        ctx.lineTo(x + 3, by + 2);
      }
    } else if (blue) {
      for (let r = 0; r < 2; r++) {
        const y = by - 7 + r * 6;
        ctx.moveTo(-24, y);
        for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(-21 + i * 6, y - 3, -18 + i * 6, y);
      }
    } else if (yellow) {
      for (let i = 0; i < 3; i++) {
        const x = -20 + i * 7;
        ctx.moveTo(x, by - 9);
        ctx.lineTo(x, by - 4);
        ctx.moveTo(x - 2.5, by - 6.5);
        ctx.lineTo(x + 2.5, by - 6.5);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const x = -14 + i * 10;
        ctx.moveTo(x, by - 12);
        ctx.quadraticCurveTo(x + 3, by - 4, x, by + 3);
      }
    }
    ctx.stroke();
    ctx.restore();
    // 側腹的元素徽記（發光）
    if (P.sigil) {
      const sx = 6;
      const sy = by - 3;
      glow(ctx, sx, sy, 12, red ? '255,200,90' : blue ? '150,220,255' : '255,250,200', 0.55 + Math.sin(t * 5) * 0.15);
      if (red) {
        flame(ctx, sx, sy + 2.5, 3.6, t, 5, 0, { rgb: '255,220,120', out: '#ffe46a', sh: '#ffb43a', core: '#fffbe0' });
      } else if (blue) {
        A.shape(ctx, (c) => { c.moveTo(sx, sy - 7); c.quadraticCurveTo(sx + 5, sy, sx + 4, sy + 2.5); c.arc(sx, sy + 2.5, 4, 0, PI); c.quadraticCurveTo(sx - 5, sy, sx, sy - 7); c.closePath(); }, P.sigil, null, { lw: 1.6 });
      } else {
        A.shape(ctx, (c) => {
          for (let i = 0; i < 8; i++) {
            const a = -PI / 2 + (i * PI) / 4;
            const r = i % 2 ? 2.6 : 6.5;
            i ? c.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r) : c.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
          }
          c.closePath();
        }, P.sigil, null, { lw: 1.6 });
      }
    }

    foot(-9, step, P.body);
    foot(13, -step, P.body);

    // 頭（頭盔狀的冠）
    const hx = 22;
    const hy = by - 5;
    ctx.save();
    ctx.translate(hx, hy);
    let hr = 0;
    if (blue) hr = strike ? -0.12 : wind ? 0.1 : 0.04;
    if (red) hr = wind ? 0.2 : strike ? -0.05 : 0.05;
    if (yellow) hr = -0.15 + Math.sin(t * 6) * 0.05;
    if (hurt) hr = -0.3;
    ctx.rotate(hr);
    const head = (c) => {
      c.moveTo(-10, 6);
      c.bezierCurveTo(-14, -6, -12, -18, -4, -22);
      c.quadraticCurveTo(4, -14, 12, -8);
      c.bezierCurveTo(18, -4, 20, 3, 16, 7);
      c.bezierCurveTo(10, 11, -4, 11, -10, 6);
      c.closePath();
    };
    A.shape(ctx, head, P.body, P.shade, { cel: [2.5, 2.5], hl: [-7, -12, 2.2, 3.5] });
    // 轉塔眼
    const ex = 3;
    const ey = -4;
    A.ellipse(ctx, ex, ey, 7, 7, P.body, P.shade, { lw: 2.4, hl: false, cel: [1.5, 1.5] });
    ctx.strokeStyle = A.c(P.shade);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ex, ey, 4.8, 0, TAU);
    ctx.stroke();
    const kind = eyeKind(m);
    if (kind === 'x' || kind === 'hurt') {
      A.eye(ctx, ex + 1, ey, 2.6, 2.6, kind);
    } else if (yellow || kind === 'closed') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (yellow) ctx.arc(ex + 1, ey + 2, 3.2, 1.15 * PI, 1.85 * PI);
      else ctx.arc(ex + 1, ey - 0.5, 3, 0.15 * PI, 0.85 * PI);
      ctx.stroke();
    } else {
      const look = Math.sin(t * 0.9) > 0.6 ? -1.5 : 1.8;
      A.ellipse(ctx, ex, ey, 4.4, 4.4, '#ffffff', null, { noStroke: true, hl: false });
      A.eye(ctx, ex + look, ey, red ? 1.8 : 2.4, red ? 1.8 : 2.8, 'normal', 0);
    }
    // 眉毛：火＝怒眉、水＝專注的平眉
    if (!m.dead && kind !== 'hurt') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (red) { ctx.moveTo(ex - 5, ey - 11); ctx.lineTo(ex + 6, ey - 6.5); }
      else if (blue) { ctx.moveTo(ex - 4, ey - 9.5); ctx.lineTo(ex + 5, ey - 8.5); }
      ctx.stroke();
    }
    // 嘴
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (red) {
      A.shape(ctx, (c) => { c.moveTo(4, 5); c.lineTo(16, 3); c.quadraticCurveTo(16, 8, 12, 8.5); c.lineTo(5, 8); c.closePath(); }, '#ffffff', null, { lw: 1.8 });
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(8, 4.3);
      ctx.lineTo(8, 8.2);
      ctx.moveTo(12, 3.8);
      ctx.lineTo(12, 8.4);
      ctx.stroke();
    } else if (blue && (strike || wind)) {
      // 嘟嘴吐水彈
      A.ellipse(ctx, 15, 4, 2.6, 2.8, '#6a2a3a', null, { lw: 1.6, hl: false });
    } else if (yellow || strike) {
      A.shape(ctx, (c) => { c.moveTo(4, 4); c.quadraticCurveTo(10, 4, 16, 2); c.quadraticCurveTo(13, 12, 5, 7); c.closePath(); }, '#8a2a2a', null, { lw: 1.8 });
      ctx.fillStyle = A.c('#ff8a9a');
      ctx.beginPath();
      ctx.ellipse(9, 7.5, 2.8, 1.4, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(4, 5);
      ctx.quadraticCurveTo(10, 7, 15, 3);
      ctx.stroke();
    }
    if (!red) A.blush(ctx, -3, 4, 3);
    ctx.restore();

    // 元素特效
    if (red) {
      // 往上飄的火粉
      for (let i = 0; i < 4; i++) {
        const q = (t * 1.4 + i / 4) % 1;
        ctx.globalAlpha = ba * (1 - q);
        sparkle(ctx, -14 + i * 9 + Math.sin(t * 5 + i) * 3, by - 16 - q * 26, 2.8 - q * 1.5, i % 2 ? '#ffe46a' : '#ff8a3a');
      }
      ctx.globalAlpha = ba;
    } else if (blue) {
      // 身邊繞著三顆水珠（後半圈畫淡一點）
      for (let i = 0; i < 3; i++) {
        const a = t * 1.6 + (i * TAU) / 3;
        const x = Math.cos(a) * 32;
        const y = by - 4 + Math.sin(a) * 9;
        ctx.globalAlpha = ba * (Math.sin(a) > 0 ? 1 : 0.6);
        A.ellipse(ctx, x, y, 4.2, 4.2, '#8fd0ff', '#4aa0e8', { lw: 1.8, hl: [x - 1.3, y - 1.5, 1.4, 1] });
      }
      ctx.globalAlpha = ba;
      if (strike || wind) {
        const q = strike ? 1 : 0.6;
        A.ellipse(ctx, hx + 19, hy + 1, 3.5 * q, 3.5 * q, '#8fd0ff', '#4aa0e8', { lw: 1.6 });
      }
    } else if (yellow) {
      // 光環
      ctx.save();
      const hx2 = hx - 2;
      const hy2 = hy - 26 + Math.sin(t * 3) * 1.5;
      glow(ctx, hx2, hy2, 14, '255,240,150', 0.6);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.ellipse(hx2, hy2, 9, 3, -0.1, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c('#fff2a0');
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        const a = t * 1.8 + (i * TAU) / 4;
        const x = Math.cos(a) * 34;
        const y = -34 + Math.sin(a) * 12 - hop;
        sparkle(ctx, x, y, 4 + Math.sin(t * 8 + i) * 1.2, i % 2 ? '#ffffff' : '#fff6b0');
      }
      if (strike || wind) {
        // 治癒同伴的光之十字
        for (let i = 0; i < 3; i++) {
          const q = (t * 1.5 + i / 3) % 1;
          const x = -20 + i * 20;
          const y = -30 - q * 30;
          ctx.globalAlpha = ba * (1 - q);
          glow(ctx, x, y, 10, '255,250,180', 0.6);
          A.shape(ctx, (c) => {
            c.moveTo(x - 2.2, y - 6);
            c.lineTo(x + 2.2, y - 6);
            c.lineTo(x + 2.2, y - 2.2);
            c.lineTo(x + 6, y - 2.2);
            c.lineTo(x + 6, y + 2.2);
            c.lineTo(x + 2.2, y + 2.2);
            c.lineTo(x + 2.2, y + 6);
            c.lineTo(x - 2.2, y + 6);
            c.lineTo(x - 2.2, y + 2.2);
            c.lineTo(x - 6, y + 2.2);
            c.lineTo(x - 6, y - 2.2);
            c.lineTo(x - 2.2, y - 2.2);
            c.closePath();
          }, '#fff6b0', null, { lw: 1.8 });
        }
        ctx.globalAlpha = ba;
      }
    }
    ctx.restore();
  }

  // ── 預言禿鷹：深紫羽毛的禿鷹，翅膀是一片星空（金色星點、星座連線）與一隻大眼紋，額頭有第三隻眼；
  //    盤旋時第三隻眼半睜，瞄準（wind）與俯衝（dive）時睜大發紅光 ──
  function mapvulture(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const dive = !!fx.dive;
    const fly = dive || (m.hover || 0) > 2 || (fx.hover || 0) > 2;
    const feather = ['#5a3e74', '#3e2856'];
    const sky = ['#3c3a86', '#2a2662'];
    const skyBack = ['#2c2a66', '#201c4c'];
    const skin = ['#f2a4a0', '#d07c7a'];
    const starC = '#ffe07a';
    const flap = fly && !dive ? Math.sin(t * 6) : 0;
    const seeing = dive || wind || strike;
    ctx.save();
    const by = fly ? -34 + flap * 2 : -30 + (walk ? -Math.abs(Math.sin(t * 9)) * 1.5 : 0);
    if (dive) {
      ctx.translate(0, -30);
      ctx.rotate(0.85);
      ctx.translate(0, 30);
    }
    if (hurt) ctx.rotate(-0.12);

    // 星空翅膀：外緣是一根根羽毛，翅面上有星座與一隻眼紋
    const SPREAD = [[5, 4], [-3, -20], [-16, -36], [-44, -48], [-45, -40], [-39, -36], [-42, -29], [-33, -27], [-34, -19], [-25, -17], [-24, -9], [-15, -7], [-12, 3]];
    const FOLD = [[8, -7], [-8, -11], [-28, -8], [-44, 2], [-38, 5], [-41, 10], [-30, 9], [-28, 14], [-18, 11], [-12, 15], [-4, 10], [4, 9]];
    const mapWing = (back) => {
      ctx.save();
      ctx.translate(-2, by - 8);
      const spread = fly && !dive;
      const up = spread || (wind && !dive);
      const pts = up ? SPREAD : FOLD;
      if (spread) {
        ctx.scale(1, 0.35 + (flap * 0.5 + 0.5) * 0.75 - (back ? 0.12 : 0));
      } else if (up) {
        ctx.scale(1, 0.9);
      }
      if (dive) ctx.rotate(-0.25);
      if (back) ctx.translate(4, -3);
      const wingP = (c) => {
        pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
        c.closePath();
      };
      const col = back ? skyBack : sky;
      A.shape(ctx, wingP, col[0], col[1], { cel: [2.5, 2.5], lw: 2.4 });
      ctx.save();
      ctx.beginPath();
      wingP(ctx);
      ctx.clip();
      const sp = pts === SPREAD;
      // 靠身體那一側是羽毛色，往外漸漸變成星空
      ctx.fillStyle = A.c(feather[0]);
      ctx.beginPath();
      if (sp) ctx.ellipse(2, -2, 10, 22, 0.5, 0, TAU);
      else ctx.ellipse(6, 2, 11, 12, 0, 0, TAU);
      ctx.fill();
      // 星座（金色星點＋細連線）
      const S = sp ? [[-12, -18], [-20, -28], [-30, -34], [-38, -42], [-26, -22]] : [[-6, -4], [-16, -6], [-26, -2], [-36, 4], [-20, 6]];
      ctx.strokeStyle = back ? 'rgba(255,224,122,0.35)' : 'rgba(255,224,122,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(S[0][0], S[0][1]);
      ctx.lineTo(S[1][0], S[1][1]);
      ctx.lineTo(S[2][0], S[2][1]);
      ctx.lineTo(S[3][0], S[3][1]);
      ctx.moveTo(S[1][0], S[1][1]);
      ctx.lineTo(S[4][0], S[4][1]);
      ctx.stroke();
      S.forEach((p, i) => sparkle(ctx, p[0], p[1], back ? 1.6 : 2.4 + (i % 2) * 0.8 + Math.sin(t * 4 + i) * 0.4, starC));
      if (!back) {
        // 眼紋（杏仁形白眼、紫色虹膜）
        const E = sp ? [-24, -30, 7, 3.6, -0.55] : [-24, 2, 7, 3.4, 0.1];
        ctx.save();
        ctx.translate(E[0], E[1]);
        ctx.rotate(E[4]);
        A.shape(ctx, (c) => { c.moveTo(-E[2], 0); c.quadraticCurveTo(0, -E[3] * 2, E[2], 0); c.quadraticCurveTo(0, E[3] * 2, -E[2], 0); c.closePath(); }, '#f4eeff', null, { lw: 1.6 });
        A.ellipse(ctx, 0, 0, 2.6, 2.6, seeing ? '#e8384a' : '#9a6ae8', null, { lw: 1.2, hl: false });
        ctx.fillStyle = A.c('#1a1030');
        ctx.beginPath();
        ctx.arc(0, 0, 1.1, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();
    };
    mapWing(true);

    // 尾羽（星空色、尖端一顆星）
    A.shape(ctx, (c) => { c.moveTo(-16, by + 2); c.lineTo(-34, by + 8); c.lineTo(-31, by + 13); c.lineTo(-24, by + 11); c.lineTo(-14, by + 9); c.closePath(); }, sky[0], sky[1], { lw: 2.4, shadeY: by + 9 });
    sparkle(ctx, -28, by + 9, 2, starC);

    // 腳：站著時站地上，飛行時垂下（俯衝時往前伸）
    const tal = '#e8c070';
    if (fly) {
      const fxp = dive ? 12 : 2;
      limb(ctx, (c) => { c.moveTo(-4, by + 10); c.lineTo(-4 + fxp, by + 22); c.moveTo(4, by + 10); c.lineTo(4 + fxp, by + 22); }, 4.5, tal);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.beginPath();
      [-4, 4].forEach((x) => {
        const X = x + fxp;
        ctx.moveTo(X, by + 22);
        ctx.lineTo(X + 4, by + 25);
        ctx.moveTo(X, by + 22);
        ctx.lineTo(X - 2, by + 26);
      });
      ctx.stroke();
    } else {
      const st = walk ? Math.sin(t * 9) : 0;
      limb(ctx, (c) => { c.moveTo(-5, by + 10); c.lineTo(-6 + st * 3, -2 - Math.max(0, st) * 3); c.moveTo(5, by + 10); c.lineTo(6 - st * 3, -2 - Math.max(0, -st) * 3); }, 5, tal);
      A.ellipse(ctx, -3 + st * 3, -2, 5, 2.2, tal, null, { lw: 1.8, hl: false });
      A.ellipse(ctx, 9 - st * 3, -2, 5, 2.2, tal, null, { lw: 1.8, hl: false });
    }

    // 身體
    A.ellipse(ctx, -2, by, 18, 14, feather[0], feather[1], { cel: [3.5, 3.5], hl: [-9, by - 7, 4, 2] });
    // 脖子
    const nx = dive ? 17 : 12;
    const ny = by - 16;
    limb(ctx, (c) => { c.moveTo(6, by - 8); c.quadraticCurveTo(nx - 2, by - 12, nx, ny); }, 8, skin[0]);
    // 白色毛領
    const ruff = (c) => {
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const a = PI * 1.05 + (i / n) * PI * 1.1;
        const r = i % 2 ? 10 : 13;
        const x = 6 + Math.cos(a) * r;
        const y = by - 9 + Math.sin(a) * r * 0.55;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.quadraticCurveTo(6, by - 1, -5, by - 8);
      c.closePath();
    };
    A.shape(ctx, ruff, '#f4ecdc', '#d8ccb4', { lw: 2.4, shadeY: by - 8 });

    // 頭（禿頭、勾嘴、額頭第三隻眼）
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(dive ? 0.2 : wind ? -0.2 : strike ? 0.25 : Math.sin(t * 1.5) * 0.06);
    A.ellipse(ctx, 0, -5, 9.5, 8.5, skin[0], skin[1], { cel: [2, 2], hl: [-5, -9, 2, 1.3] });
    A.shape(ctx, (c) => {
      c.moveTo(6, -7);
      c.quadraticCurveTo(15, -8, 17, -1);
      c.quadraticCurveTo(17, 4, 13, 4);
      c.quadraticCurveTo(14, 0, 11, -1);
      c.lineTo(6, -1);
      c.closePath();
    }, '#f0d890', '#c8a860', { lw: 2.2, shadeY: -3 });
    ctx.fillStyle = A.c('#3a2a22');
    ctx.beginPath();
    ctx.moveTo(15.5, 0);
    ctx.quadraticCurveTo(17, 3, 13.5, 4);
    ctx.quadraticCurveTo(14.5, 2, 13.5, 0);
    ctx.fill();
    if (strike || hurt) {
      A.shape(ctx, (c) => { c.moveTo(7, -1); c.lineTo(12, 0); c.quadraticCurveTo(9, 4, 7, 2); c.closePath(); }, '#7a2323', null, { lw: 1.5 });
    }
    // 第三隻眼（直立的杏仁眼）
    const tex = 1;
    const tey = -11.5;
    const open3 = m.dead ? 0 : hurt ? 0.15 : seeing ? 1 : 0.45 + Math.sin(t * 1.3) * 0.1;
    if (seeing && !m.dead) glow(ctx, tex, tey, 13, '255,70,70', 0.55 + Math.sin(t * 16) * 0.15);
    A.shape(ctx, (c) => { c.moveTo(tex, tey - 5); c.quadraticCurveTo(tex + 3.8 * (0.3 + open3 * 0.7), tey, tex, tey + 5); c.quadraticCurveTo(tex - 3.8 * (0.3 + open3 * 0.7), tey, tex, tey - 5); c.closePath(); }, open3 > 0.2 ? '#fff4f0' : skin[1], null, { lw: 1.6 });
    if (open3 > 0.2) {
      A.ellipse(ctx, tex, tey, 1.8 * open3 + 0.4, 2.4, seeing ? '#e8384a' : '#9a6ae8', null, { noStroke: true, hl: false });
      ctx.fillStyle = A.c('#1a1030');
      ctx.beginPath();
      ctx.ellipse(tex, tey, 0.7, 1.6, 0, 0, TAU);
      ctx.fill();
    }
    // 眼睛與陰沉的粗眉
    const kind = eyeKind(m);
    const ek = (dive || wind) && kind === 'normal' ? 'angry' : kind;
    A.eye(ctx, 5, -5, 2.4, 3, ek, 0.6);
    if (!m.dead && kind !== 'hurt') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2.5, -9.2);
      ctx.lineTo(8.5, -7.5);
      ctx.stroke();
    }
    A.blush(ctx, 0, -1, 2.4);
    ctx.restore();

    // 前面的星空翅膀
    mapWing(false);
    if (dive) speedLines(ctx, -34, by - 4, 34, 4, 22, t, 'rgba(255,200,220,0.85)');
    ctx.restore();
  }

  // ═════════════ 投射物 ═════════════
  function projAngle(p) {
    if (p.vx != null && p.vy != null && (p.vx || p.vy)) return Math.atan2(p.vy, p.vx);
    return (p.dir || 1) < 0 ? PI : 0;
  }
  // 水元素彈：一顆裡面有漩渦的水球，外面繞一圈水環，後面拖著小水珠
  function tear(ctx, p, t) {
    const ba = ctx.globalAlpha;
    const sd = p.seed || 0;
    ctx.rotate(projAngle(p));
    glow(ctx, 0, 0, 18, '120,190,255', 0.55);
    ctx.fillStyle = A.c('#9ad8ff');
    for (let i = 1; i <= 3; i++) {
      const q = (t * 6 + i * 0.3 + sd) % 1;
      ctx.globalAlpha = ba * 0.85 * (1 - q);
      ctx.beginPath();
      ctx.arc(-10 - i * 5 - q * 5, Math.sin(i * 2 + sd + t * 10) * 3, 2.6 - i * 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = ba;
    const wob = 1 + Math.sin(t * 20 + sd) * 0.06;
    ctx.save();
    ctx.scale(wob, 1 / wob);
    A.ellipse(ctx, 0, 0, 8.5, 8.5, '#5ab4f0', '#2f7fd0', { lw: 2.2, hl: false });
    // 水球裡的漩渦
    ctx.save();
    ctx.rotate(-t * 8 - sd);
    ctx.strokeStyle = A.c('#c8ecff');
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const q = i / 16;
      const a = q * PI * 2.2;
      const r = 1 + q * 5;
      i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-2.8, -3.6, 2.6, 1.5, -0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 繞著水球轉的水環
    ctx.save();
    ctx.rotate(t * 5 + sd);
    ctx.strokeStyle = 'rgba(190,235,255,0.9)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 4.5, 0, -0.3, PI * 1.25);
    ctx.stroke();
    ctx.restore();
  }
  // 鎧甲碎片：旋轉的一片鋼甲（金邊、鉚釘、亮面反光，斷口是鋸齒）
  function shard(ctx, p, t) {
    ctx.rotate(t * 12 * ((p.vx || p.dir || 1) < 0 ? -1 : 1) + (p.seed || 0));
    ctx.scale(1.25, 1.25);
    const path = (c) => {
      c.moveTo(-10, -5);
      c.quadraticCurveTo(0, -11, 10, -6);
      c.lineTo(7, -1);
      c.lineTo(10, 3);
      c.lineTo(6, 5);
      c.lineTo(7, 9);
      c.lineTo(-1, 7);
      c.lineTo(-4, 9);
      c.lineTo(-7, 3);
      c.closePath();
    };
    A.shape(ctx, path, '#d6dde8', '#98a2b4', { cel: [2, 2], noStroke: true });
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    // 金色包邊
    ctx.strokeStyle = A.c('#f2c24a');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.quadraticCurveTo(0, -10, 10, -5);
    ctx.stroke();
    // 反光
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.lineTo(-2, -5);
    ctx.lineTo(-4, 4);
    ctx.lineTo(-7, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    A.ellipse(ctx, 3, -1, 1.6, 1.6, '#6e788c', null, { lw: 1, hl: false });
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  // 咒風：綠紫色的詛咒旋風，周圍繞著三個發光符文，往前推
  function gust(ctx, p, t) {
    const a = projAngle(p);
    const dir = Math.cos(a) < 0 ? -1 : 1;
    const sd = p.seed || 0;
    ctx.scale(dir, 1);
    const R = p.r ? Math.max(14, p.r * 1.6) : 18;
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 1.3);
    g.addColorStop(0, 'rgba(200,255,225,0.55)');
    g.addColorStop(0.6, 'rgba(150,110,220,0.3)');
    g.addColorStop(1, 'rgba(120,80,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.3, R, 0, 0, TAU);
    ctx.fill();
    ctx.lineCap = 'round';
    const spin = -t * 10 - sd;
    const spiral = (a0, turns, r0, r1, n) => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const q = i / n;
        const aa = a0 + q * PI * turns;
        const r = R * (r0 + q * r1);
        const x = Math.cos(aa) * r * 1.15;
        const y = Math.sin(aa) * r * 0.8;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(110,70,170,0.55)';
    ctx.lineWidth = 4.5;
    spiral(spin, 3.2, 0.15, 0.75, 30);
    ctx.strokeStyle = 'rgba(210,255,235,0.95)';
    ctx.lineWidth = 2.4;
    spiral(spin, 3.2, 0.15, 0.75, 30);
    ctx.strokeStyle = 'rgba(190,150,255,0.9)';
    ctx.lineWidth = 1.8;
    spiral(spin + PI, 2.4, 0.2, 0.6, 20);
    // 繞著轉的符文
    for (let i = 0; i < 3; i++) {
      const aa = -t * 6 + (i * TAU) / 3 + sd;
      const x = Math.cos(aa) * R * 1.05;
      const y = Math.sin(aa) * R * 0.75;
      glow(ctx, x, y, 7, '120,255,190', 0.6);
      rune(ctx, x, y, 3.4, i * 2 + Math.floor(sd * 3), 'rgba(80,40,120,0.8)', 2.6);
      rune(ctx, x, y, 3.4, i * 2 + Math.floor(sd * 3), '#c8ffe4', 1.4);
    }
    // 後面拖的風線
    ctx.strokeStyle = 'rgba(200,255,230,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const q = (t * 4 + i / 3) % 1;
      const y = (i - 1) * R * 0.5;
      const x = -R * 1.1 - q * 12;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 10 - (i % 2) * 6, y);
    }
    ctx.stroke();
  }

  // ═════════════ 地面區域 ═════════════
  function zoneFade(z, inT) {
    const life = z.life || 1;
    const zt = z.t || 0;
    return Math.max(0, Math.min(1, life - zt, zt * (inT || 4)));
  }
  // 火痕：一條貼地燃燒的短火焰
  function firetrail(ctx, z, t) {
    const fade = zoneFade(z, 6);
    if (fade <= 0) return;
    const r = z.r || 30;
    const life = z.life || 1;
    const k = 1 - Math.min(1, (z.t || 0) / life) * 0.5; // 越燒越小
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha = fade;
    glow(ctx, 0, -10, r * 1.3, '255,120,30', 0.5);
    // 焦痕
    ctx.fillStyle = 'rgba(60,30,20,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, -1, r, 4, 0, 0, TAU);
    ctx.fill();
    // 一排小火焰
    const n = Math.max(3, Math.round(r / 8));
    for (let i = 0; i < n; i++) {
      const x = -r * 0.85 + (i / (n - 1)) * r * 1.7;
      const fl = 0.75 + Math.sin(t * 13 + i * 2.1 + (z.seed || 0)) * 0.2;
      const s = (6 + (i % 2) * 2.5) * k * fl;
      const lean = Math.sin(t * 5 + i) * 0.1;
      A.shape(ctx, (c) => {
        c.moveTo(x + lean * s * 3, -s * 3.4);
        c.bezierCurveTo(x + s, -s * 1.8, x + s * 1.1, 0, x, 0);
        c.bezierCurveTo(x - s * 1.1, 0, x - s, -s * 1.6, x + lean * s * 3, -s * 3.4);
        c.closePath();
      }, '#ff7a2a', '#e8521e', { lw: 1.8, shadeY: -s });
      A.shape(ctx, (c) => {
        c.moveTo(x, -s * 1.9);
        c.quadraticCurveTo(x + s * 0.6, -s * 0.4, x, 0);
        c.quadraticCurveTo(x - s * 0.6, -s * 0.4, x, -s * 1.9);
        c.closePath();
      }, '#ffe46a', null, { noStroke: true });
    }
    // 火星
    ctx.fillStyle = '#ffd24a';
    for (let i = 0; i < 3; i++) {
      const q = (t * 1.2 + i / 3 + (z.seed || 0)) % 1;
      ctx.globalAlpha = fade * (1 - q);
      ctx.beginPath();
      ctx.arc(Math.sin(i * 2.7 + 1) * r * 0.6 + Math.sin(t * 4 + i) * 3, -10 - q * 22, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // 預言之印：地上的紅色預言法陣（外圈符文、內圈六芒星、中央一隻眼），越接近時間到越亮、轉得越快、閃得越快，
  // 最後冒出一道光柱標出禿鷹會俯衝下來的位置
  function xmark(ctx, z, t) {
    const life = z.life || 1;
    const zt = z.t || 0;
    if (zt >= life) return;
    const p = Math.max(0, Math.min(1, zt / life));
    const fadeIn = Math.min(1, zt * 6);
    const r = z.r || 30;
    const blink = 0.5 + 0.5 * Math.sin(zt * (8 + p * 30));
    const a = fadeIn * Math.min(1, 0.55 + p * 0.3 + blink * (0.1 + p * 0.25));
    const hot = Math.min(1, p * 0.8 + blink * p * 0.4);
    const line = 'rgba(255,' + Math.round(70 + hot * 150) + ',' + Math.round(60 + hot * 130) + ',0.95)';
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha = Math.max(0, a);
    glow(ctx, 0, -2, r * 1.3, '255,50,40', 0.25 + p * 0.45);
    ctx.save();
    ctx.translate(0, -2);
    ctx.scale(1, 0.32);
    // 暗紅底
    ctx.fillStyle = 'rgba(120,10,20,' + (0.25 + p * 0.2).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, TAU);
    ctx.fill();
    // 描一圈深色底線，法陣在亮的地面上也看得清楚
    ctx.lineCap = 'round';
    const rot = t * (0.8 + p * 3);
    magicCircle(ctx, r, rot, 'rgba(70,10,20,0.6)', 6, 10, 2);
    magicCircle(ctx, r, rot, line, 3, 10, 2);
    // 中央的預言之眼
    ctx.save();
    ctx.scale(1, 1 / 0.32 * 0.45);
    const er = r * 0.48;
    ctx.beginPath();
    ctx.moveTo(-er, 0);
    ctx.quadraticCurveTo(0, -er * 0.9, er, 0);
    ctx.quadraticCurveTo(0, er * 0.9, -er, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,' + Math.round(200 + hot * 55) + ',' + Math.round(190 + hot * 60) + ',0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,10,20,0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,30,40,1)';
    ctx.beginPath();
    ctx.arc(0, 0, er * 0.38, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,0,10,1)';
    ctx.beginPath();
    ctx.ellipse(0, 0, er * 0.12, er * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    // 最後三成時間：從法陣升起的紅色光柱（越來越亮）
    if (p > 0.6) {
      const k = (p - 0.6) / 0.4;
      const w = r * (0.35 + k * 0.25);
      const h = 60 + k * 90;
      const g = ctx.createLinearGradient(0, 0, 0, -h);
      g.addColorStop(0, 'rgba(255,120,100,' + (0.55 * k + 0.1).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,80,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w, -2);
      ctx.lineTo(-w * 0.6, -h);
      ctx.lineTo(w * 0.6, -h);
      ctx.lineTo(w, -2);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        const q = (t * 1.5 + i / 4) % 1;
        ctx.globalAlpha = Math.max(0, a) * (1 - q) * k;
        sparkle(ctx, Math.sin(i * 2.1 + t * 2) * w * 0.7, -6 - q * h * 0.8, 2.6, '#ffb0a0');
      }
    }
    ctx.restore();
  }

  // 沿地面往兩側擴散的震波（z.r 會變大）
  function quake(ctx, z, t) {
    const fade = zoneFade(z, 10);
    if (fade <= 0) return;
    const r = z.r || 30;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha = fade;
    // 地面裂縫
    ctx.strokeStyle = 'rgba(70,35,20,0.7)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let s = -1; s <= 1; s += 2) {
      ctx.moveTo(0, -1);
      const n = Math.max(2, Math.floor(r / 14));
      for (let i = 1; i <= n; i++) ctx.lineTo(s * (r * i) / n, -1 + (i % 2 ? 2 : -1.5));
    }
    ctx.stroke();
    // 兩側的震波峰（土浪＋白色衝擊弧＋被震起的碎石）
    for (let s = -1; s <= 1; s += 2) {
      const x = s * r;
      const h = 26;
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(s, 1);
      const g = ctx.createLinearGradient(0, -h * 1.2, 0, 0);
      g.addColorStop(0, 'rgba(255,235,200,0)');
      g.addColorStop(0.45, 'rgba(255,225,180,0.85)');
      g.addColorStop(1, 'rgba(150,90,55,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-34, 0);
      ctx.quadraticCurveTo(-6, -h * 1.5, 12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,245,225,0.95)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-22, -6);
      ctx.quadraticCurveTo(-4, -h * 1.25, 10, -3);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, -h * 0.9);
      ctx.lineTo(18, -h * 1.1);
      ctx.moveTo(15, -h * 0.45);
      ctx.lineTo(23, -h * 0.5);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i / 3) % 1;
        const rx = -6 + i * 6 - q * 10;
        const ry = -5 - Math.sin(q * PI) * (18 + i * 5);
        A.shape(ctx, (c) => { c.moveTo(rx - 3.5, ry); c.lineTo(rx, ry - 3.5); c.lineTo(rx + 3.5, ry); c.lineTo(rx, ry + 3); c.closePath(); }, '#a86e4a', null, { lw: 1.6 });
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ═════════════ 素材圖示（掉落物） ═════════════
  const ICON4 = {
    // 炎劍碎片：斷掉的劍尖，劍身燒得通紅、冒著小火
    matchhead(ctx) {
      ctx.save();
      ctx.rotate(0.65);
      glow(ctx, 0, 0, 18, '255,150,60', 0.5);
      const blade = (c) => {
        c.moveTo(0, -17);
        c.lineTo(5, -9);
        c.lineTo(5, 8);
        c.lineTo(2, 6);
        c.lineTo(0, 10);
        c.lineTo(-2, 7);
        c.lineTo(-5, 9);
        c.lineTo(-5, -9);
        c.closePath();
      };
      A.shape(ctx, blade, '#ffe2a0', '#ff8a3a', { lw: 2.4, cel: [2, 0] });
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-1, -13);
      ctx.lineTo(-1, 5);
      ctx.stroke();
      ctx.restore();
      flame(ctx, -6, 9, 3.4, 0.2, 1, 0.1);
      sparkle(ctx, 10, -12, 3, '#ffe46a');
      sparkle(ctx, -11, -4, 2.2, '#ff9a3a');
    },
    // 怒紋石：紅褐色的石塊，刻著發亮的紅色戰紋
    vein(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-14, 8); c.lineTo(-15, -4); c.lineTo(-7, -13); c.lineTo(6, -13); c.lineTo(14, -4); c.lineTo(13, 9); c.lineTo(0, 13); c.closePath(); }, '#b8a494', '#8a7868', { cel: [3, 3], hl: [-8, -7, 3, 2] });
      glow(ctx, 0, 0, 14, '255,90,60', 0.45);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4.4;
      ctx.lineCap = 'round';
      const marks = () => {
        ctx.beginPath();
        ctx.moveTo(-9, -6);
        ctx.lineTo(-1, -3);
        ctx.moveTo(-9, 0);
        ctx.lineTo(-2, 2);
        ctx.moveTo(4, -8);
        ctx.lineTo(7, 7);
        ctx.moveTo(9, -8);
        ctx.lineTo(10, 3);
      };
      marks();
      ctx.stroke();
      ctx.strokeStyle = A.c('#ff5a3a');
      ctx.lineWidth = 2.4;
      marks();
      ctx.stroke();
    },
    // 引力水晶：一簇紫色水晶，外面繞一圈引力環
    lodestone(ctx) {
      ctx.save();
      ctx.translate(0, 11);
      crystal(ctx, -7, 0, 8, 15, -0.4, AMETHYST, 0.3);
      crystal(ctx, 7, 0, 8, 14, 0.4, AMETHYST, 0);
      crystal(ctx, 0, 1, 10.5, 24, 0, AMETHYST, 0);
      ctx.restore();
      ctx.strokeStyle = 'rgba(210,170,255,0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 1, 17, 5, -0.25, 0.1 * PI, 1.05 * PI);
      ctx.stroke();
      sparkle(ctx, 13, -12, 3.2, '#f0e0ff');
    },
    // 魔火帽：一頂小巫師帽，帽尖點著紫色魔火
    wax(ctx) {
      ctx.save();
      ctx.translate(1, 9);
      ctx.scale(0.84, 0.84);
      A.ellipse(ctx, 0, 0, 15, 4.5, '#48349c', null, { lw: 2.2, hl: false });
      A.shape(ctx, (c) => {
        c.moveTo(-9, -1);
        c.bezierCurveTo(-7, -10, -2, -18, -9, -24);
        c.bezierCurveTo(2, -20, 7, -10, 9, -1);
        c.quadraticCurveTo(0, 1.5, -9, -1);
        c.closePath();
      }, '#6a54cc', '#48349c', { cel: [2.5, 1], hl: [-3, -10, 1.6, 3.5] });
      A.shape(ctx, (c) => { c.moveTo(-8.8, -1.4); c.quadraticCurveTo(0, 0.8, 8.8, -1.4); c.lineTo(8, -5.5); c.quadraticCurveTo(0, -3.6, -8, -5.5); c.closePath(); }, '#f2c440', null, { lw: 1.6 });
      sparkle(ctx, 1, -11, 3, '#ffe46a');
      flame(ctx, -9, -25, 4.2, 0.3, 0, -0.1, MAGIC);
      ctx.restore();
    },
    // 戰鎚碎片：崩掉一角的鎚頭，正面的符文還在發光
    weight(ctx) {
      ctx.save();
      ctx.rotate(-0.25);
      const chunk = (c) => {
        c.moveTo(-12, -11);
        c.lineTo(10, -11);
        c.lineTo(12, -4);
        c.lineTo(7, -1);
        c.lineTo(11, 4);
        c.lineTo(8, 12);
        c.lineTo(-12, 12);
        c.closePath();
      };
      A.shape(ctx, chunk, '#8a94a4', '#5c6574', { cel: [3, 3], hl: [-7, -5, 2, 3.5] });
      A.shape(ctx, (c) => A.roundRect(c, -13.5, -13, 25, 6, 2), '#4c5462', null, { lw: 2 });
      ctx.fillStyle = A.c('#2e3440');
      ctx.beginPath();
      A.roundRect(ctx, -7, -4, 12, 13, 2);
      ctx.fill();
      glow(ctx, -1, 2.5, 11, '140,240,255', 0.7);
      rune(ctx, -1, 2.5, 4.6, 3, A.c('#c8faff'), 2);
      ctx.restore();
    },
    // 風咒書頁：一張撕下來的書頁，寫滿綠色風咒、微微捲起來
    bellowswing(ctx) {
      ctx.save();
      ctx.rotate(-0.18);
      const leaf = (c) => {
        c.moveTo(-12, -15);
        c.lineTo(11, -14);
        c.quadraticCurveTo(14, -2, 11, 14);
        c.lineTo(6, 12);
        c.lineTo(3, 15);
        c.lineTo(-1, 12);
        c.lineTo(-5, 15);
        c.lineTo(-12, 13);
        c.quadraticCurveTo(-9, 0, -12, -15);
        c.closePath();
      };
      A.shape(ctx, leaf, '#fbf2d8', '#e2d2a8', { cel: [2.5, 2.5], hl: [-6, -9, 2, 3] });
      glow(ctx, 0, 0, 14, '80,240,180', 0.35);
      for (let r = 0; r < 4; r++) {
        for (let j = 0; j < 3; j++) rune(ctx, -6 + j * 6.5, -9 + r * 6, 2.2, r * 3 + j * 2, A.c('#2e9a78'), 1.4);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(120,230,190,0.9)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(8, -18);
      ctx.quadraticCurveTo(14, -20, 17, -15);
      ctx.moveTo(10, -13);
      ctx.quadraticCurveTo(15, -14, 18, -10);
      ctx.stroke();
    },
    // 鎧甲碎片
    potshard(ctx) {
      ctx.save();
      ctx.scale(1.2, 1.2);
      shard(ctx, { seed: -0.3, vx: 0 }, 0);
      ctx.restore();
      sparkle(ctx, 11, -11, 3.2, '#ffffff');
    },
    // 元素鱗片：一片鱗分成火（紅）、水（藍）、光（黃）三色，各有小小的元素紋
    moodscale(ctx) {
      const path = (c) => {
        c.moveTo(0, -15);
        c.bezierCurveTo(12, -12, 14, 2, 0, 15);
        c.bezierCurveTo(-14, 2, -12, -12, 0, -15);
        c.closePath();
      };
      glow(ctx, 0, 0, 18, '255,240,200', 0.35);
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c('#f7c93a');
      ctx.fill();
      ctx.save();
      ctx.clip();
      ['#ec5236', '#3f8ee0', '#f7c93a'].forEach((col, i) => {
        ctx.fillStyle = A.c(col);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 30, -PI / 2 + (i * TAU) / 3, -PI / 2 + ((i + 1) * TAU) / 3);
        ctx.closePath();
        ctx.fill();
      });
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-4, -6, 2.5, 5, 0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = -PI / 2 + (i * TAU) / 3;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
      }
      ctx.stroke();
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = 2.6;
      ctx.stroke();
      // 三個元素小紋：火苗、水滴、星芒
      flame(ctx, 5.5, -1, 2.2, 0, 0, 0, { rgb: '255,220,120', out: '#ffe46a', sh: '#ffb43a', core: '#fffbe0' });
      A.shape(ctx, (c) => { c.moveTo(-0.5, 3.5); c.quadraticCurveTo(2.5, 7.5, 1.5, 9); c.arc(-0.5, 9, 2, 0, PI); c.quadraticCurveTo(-3.5, 7.5, -0.5, 3.5); c.closePath(); }, '#e8f8ff', null, { lw: 1.2 });
      sparkle(ctx, -5.5, -3, 3, '#ffffff');
      sparkle(ctx, 11, -11, 3.5, '#ffffff');
    },
    // 預言羽：深紫星空色的長羽毛，羽面上一隻眼紋與金色星點
    mapscrap(ctx) {
      ctx.save();
      ctx.rotate(0.6);
      const vane = (c) => {
        c.moveTo(0, 15);
        c.bezierCurveTo(-8, 8, -9, -8, 0, -17);
        c.bezierCurveTo(8, -8, 8, 6, 0, 15);
        c.closePath();
      };
      A.shape(ctx, vane, '#3c3a86', '#2a2662', { cel: [2.5, 2], hl: [-3, -8, 1.6, 3] });
      ctx.strokeStyle = A.c('#f4ecdc');
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.lineTo(0, -14);
      ctx.stroke();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 15);
      ctx.lineTo(0, 21);
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-5, -3); c.quadraticCurveTo(0, -8, 5, -3); c.quadraticCurveTo(0, 2, -5, -3); c.closePath(); }, '#f4eeff', null, { lw: 1.4 });
      A.ellipse(ctx, 0, -3, 1.9, 1.9, '#e8384a', null, { lw: 1, hl: false });
      sparkle(ctx, -3, 6, 2, '#ffe07a');
      sparkle(ctx, 3, -11, 1.8, '#ffe07a');
      ctx.restore();
      sparkle(ctx, -12, -12, 3, '#ffe07a');
    },
  };

  Object.assign(A.MONSTER_DRAW, { matchlizard, angerrock, magnetdillo, candlesnake, weightbeetle, bellowsbat, potgoat, moodchameleon, mapvulture });
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  Object.assign(A.PROJ_DRAW, { tear, shard, gust });
  Object.assign(A.ZONE_DRAW, { firetrail, xmark, quake });
  if (A.ICON) Object.assign(A.ICON, ICON4);
})();
