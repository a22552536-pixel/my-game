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

  // ── v1.4 細緻化工具：體積（月牙陰影＋左上邊緣光＋底部反光）、材質紋理、有神的眼睛 ──
  // 帶體積的形狀。o: { cel: 陰影偏移, rim: 邊緣光寬, lw, noStroke, under: [x, y, r, rgb, a] 形狀裡的發光, grad: [y0, y1, top, bottom] 直向漸層 }
  function vol(ctx, path, fill, shade, rim, o) {
    o = o || {};
    const c = o.cel != null ? o.cel : 3;
    const r = o.rim != null ? o.rim : 1.8;
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(shade || fill);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.translate(-c, -c * (o.celY != null ? o.celY : 1));
    ctx.beginPath();
    path(ctx);
    if (o.grad) {
      const g = ctx.createLinearGradient(0, o.grad[0], 0, o.grad[1]);
      g.addColorStop(0, A.c(o.grad[2]));
      g.addColorStop(1, A.c(o.grad[3]));
      ctx.fillStyle = g;
    } else ctx.fillStyle = A.c(fill);
    ctx.fill();
    ctx.translate(c, c * (o.celY != null ? o.celY : 1));
    if (o.under) glow(ctx, o.under[0], o.under[1], o.under[2], o.under[3], o.under[4]);
    if (o.tex) o.tex(ctx);
    if (rim) {
      ctx.beginPath();
      ctx.rect(-3000, -3000, 6000, 6000);
      ctx.translate(r, r);
      path(ctx);
      ctx.translate(-r, -r);
      ctx.clip('evenodd');
      ctx.fillStyle = A.c(rim);
      ctx.fillRect(-3000, -3000, 6000, 6000);
    }
    ctx.restore();
    if (o.noStroke) return;
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = o.lw || 2.4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  // 在形狀裡面畫東西（紋理、花紋）
  function inside(ctx, path, fn) {
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    fn(ctx);
    ctx.restore();
  }
  function outlineOf(ctx, path, lw) {
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = lw || 2.4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  // 固定的偽亂數（同一個 i 永遠同一個值，畫面不會閃）
  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  // 散佈的小點（石頭斑點、鱗片亮點）
  function speckle(ctx, x, y, w, h, n, seed, col, r0, r1) {
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + hash(seed + i) * w;
      const py = y + hash(seed + i + 50) * h;
      const pr = r0 + hash(seed + i + 90) * (r1 - r0);
      ctx.moveTo(px + pr, py);
      ctx.arc(px, py, pr, 0, TAU);
    }
    ctx.fill();
  }
  // 魚鱗／爬蟲鱗（一排排的小弧線）
  function scales(ctx, x, y, w, h, s, col, lw) {
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = lw || 1;
    ctx.beginPath();
    let row = 0;
    for (let yy = y; yy < y + h; yy += s * 0.62, row++) {
      for (let xx = x + (row % 2) * s * 0.5; xx < x + w; xx += s) {
        ctx.moveTo(xx - s * 0.5, yy);
        ctx.quadraticCurveTo(xx, yy + s * 0.55, xx + s * 0.5, yy);
      }
    }
    ctx.stroke();
  }
  // 金屬的斜向亮帶
  function sheen(ctx, x, y, w, h, a) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.45, 'rgba(255,255,255,' + (a || 0.5) + ')');
    g.addColorStop(0.55, 'rgba(255,255,255,' + (a || 0.5) * 0.7 + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  // 鉚釘
  function rivet(ctx, x, y, r, col) {
    ctx.fillStyle = A.c(col || '#5a4a3a');
    ctx.beginPath();
    ctx.arc(x + r * 0.25, y + r * 0.3, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#fff4d0');
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.25, r * 0.55, 0, TAU);
    ctx.fill();
  }
  // 有神的眼睛：鞏膜＋漸層虹膜＋瞳孔（slit 直瞳／round）＋眼神光＋上眼皮（lid 0..1 蓋住多少，tilt > 0 往內側壓＝兇）
  // o: { sclera, iris, irisD, pupil, lidCol, lid, tilt, look, glowRgb }
  function beastEye(ctx, x, y, rx, ry, kind, o) {
    o = o || {};
    if (kind === 'x') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = Math.max(1.8, rx * 0.5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.8, y - rx * 0.8);
      ctx.lineTo(x + rx * 0.8, y + rx * 0.8);
      ctx.moveTo(x + rx * 0.8, y - rx * 0.8);
      ctx.lineTo(x - rx * 0.8, y + rx * 0.8);
      ctx.stroke();
      return;
    }
    if (kind === 'closed' || kind === 'hurt') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = Math.max(1.8, rx * 0.45);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (kind === 'closed') {
        ctx.moveTo(x - rx, y);
        ctx.quadraticCurveTo(x, y + ry * 0.6, x + rx, y - ry * 0.1);
      } else {
        ctx.moveTo(x - rx, y - ry * 0.7);
        ctx.lineTo(x + rx * 0.7, y);
        ctx.lineTo(x - rx, y + ry * 0.7);
      }
      ctx.stroke();
      return;
    }
    const look = o.look || 0;
    const path = (c) => c.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (o.glowRgb) glow(ctx, x, y, rx * 3, o.glowRgb, 0.5);
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(o.sclera || '#fff8ea');
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    const ir = Math.min(rx, ry) * (o.irisK || 0.82);
    const ix = x + look * rx * 0.3 + rx * 0.12;
    const iy = y + ry * 0.05;
    const g = ctx.createRadialGradient(ix, iy + ir * 0.4, ir * 0.1, ix, iy, ir);
    g.addColorStop(0, A.c(o.iris || '#ffd24a'));
    g.addColorStop(1, A.c(o.irisD || '#c0661a'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ix, iy, ir, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#1a0e0a');
    ctx.beginPath();
    if (o.pupil === 'slit') ctx.ellipse(ix + ir * 0.05, iy, ir * 0.22, ir * 0.85, 0, 0, TAU);
    else ctx.arc(ix + ir * 0.05, iy, ir * 0.5, 0, TAU);
    ctx.fill();
    // 上緣的眼皮陰影
    ctx.fillStyle = 'rgba(40,20,20,0.28)';
    ctx.fillRect(x - rx * 2, y - ry * 2, rx * 4, ry * 1.35);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ix - ir * 0.35, iy - ir * 0.4, ir * 0.32, ir * 0.24, -0.4, 0, TAU);
    ctx.fill();
    ctx.globalAlpha *= 0.8;
    ctx.beginPath();
    ctx.arc(ix + ir * 0.35, iy + ir * 0.4, ir * 0.13, 0, TAU);
    ctx.fill();
    ctx.globalAlpha /= 0.8;
    // 眼皮（兇的時候往內側壓成斜的）
    const lid = o.lid || 0;
    const tilt = o.tilt || 0;
    if (lid > 0 || tilt > 0) {
      ctx.fillStyle = A.c(o.lidCol || '#888888');
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.5, y - ry * 1.5);
      ctx.lineTo(x + rx * 1.5, y - ry * 1.5);
      ctx.lineTo(x + rx * 1.5, y - ry + ry * 2 * lid + ry * tilt);
      ctx.lineTo(x - rx * 1.5, y - ry + ry * 2 * lid - ry * tilt * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = o.lw || 1.8;
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    if (lid > 0 || tilt > 0) {
      ctx.lineWidth = (o.lw || 1.8) + 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.1, y - ry + ry * 2 * lid - ry * tilt * 0.4 * 0.75);
      ctx.lineTo(x + rx * 1.1, y - ry + ry * 2 * lid + ry * tilt * 0.75);
      ctx.stroke();
    }
  }
  // 往上飄的火星
  function embers(ctx, x, y, w, h, n, t, sp, cols, seed) {
    const ba = ctx.globalAlpha;
    for (let i = 0; i < n; i++) {
      const q = (t * sp + hash((seed || 0) + i)) % 1;
      const px = x + (hash((seed || 0) + i + 30) - 0.5) * w + Math.sin(t * 3 + i) * 3;
      const py = y - q * h;
      ctx.globalAlpha = ba * (1 - q) * 0.95;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.arc(px, py, 1.6 - q * 0.8 + (i % 3) * 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = ba;
  }
  // 貼地的接觸陰影（讓腳站得穩）
  function contact(ctx, x, y, rx, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(30,15,10,' + (a || 0.35) + ')');
    g.addColorStop(1, 'rgba(30,15,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.25, 0, 0, TAU);
    ctx.fill();
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
    const dead = !!m.dead;
    const walk = walking(m);
    const fast = strike || Math.abs(m.vx || 0) > 110;
    const step = walk ? Math.sin(t * (fast ? 22 : 15)) : 0;
    const heat = lit ? 1 : wind ? 0.55 : 0;
    // 鈷藍鱗皮＋熔岩橘的背脊與斑紋
    const SK = ['#3f82c8', '#27548f', '#9ad8ff'];
    const SKF = ['#2f6aa8', '#1f4478', '#6aaede'];
    const BEL = ['#f4dfb0', '#d2ae78', '#fff6dc'];
    const dark = '#1c3a6a';
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    if (strike) ctx.translate(4, 0);
    ctx.rotate(wind ? 0.07 : lit && fast ? 0.04 : 0);
    const by = -14 + (walk ? -Math.abs(step) * 1.2 : Math.sin(t * 3) * 0.6) + (wind ? 2 : 0);
    contact(ctx, 0, 0, 30, 0.25);
    if (heat > 0) glow(ctx, 0, by - 4, 46, '255,120,40', 0.18 + heat * 0.18);

    // 腳：大腿＋小腿＋三趾爪
    const leg = (x, s, P, far) => {
      const lift = Math.max(0, s) * 3.5;
      const fx0 = x + 5 + s * 2.5;
      const fy0 = -2.5 - lift;
      limb(ctx, (c) => { c.moveTo(x, by + 2); c.quadraticCurveTo(x - 1 + s, by + 10, fx0 - 1, fy0 - 0.5); }, 7.5, P[0]);
      if (!far) {
        ctx.strokeStyle = A.c(P[2]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - 2.2, by + 3);
        ctx.quadraticCurveTo(x - 3 + s, by + 9, fx0 - 3, fy0 - 2);
        ctx.stroke();
      }
      vol(ctx, (c) => c.ellipse(fx0, fy0, 4.6, 2.4, 0, 0, TAU), P[0], P[1], null, { cel: 1, lw: 1.8 });
      ctx.strokeStyle = A.c('#f6ead0');
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) {
        ctx.moveTo(fx0 + 3.6, fy0 + k * 1.3);
        ctx.lineTo(fx0 + 6, fy0 + k * 1.9 + 0.8);
      }
      ctx.stroke();
    };
    leg(-13, -step, SKF, true);
    leg(8, step, SKF, true);

    // 尾巴：粗→細、往後上翹，環紋＋背脊小刺，尾尖是一顆悶燒的火核
    const tw = Math.sin(t * 3.2) * 2.2 + (fast ? 3 : 0);
    const tipX = -44;
    const tipY = by - 16 - tw;
    const tail = (c) => {
      c.moveTo(-14, by - 6);
      c.bezierCurveTo(-27, by - 6, -35, by - 8 - tw, tipX, tipY);
      c.quadraticCurveTo(-38, by - 5 - tw, -30, by + 2);
      c.quadraticCurveTo(-23, by + 6, -14, by + 6);
      c.closePath();
    };
    // 尾巴背上的小刺
    for (let i = 0; i < 4; i++) {
      const q = 0.2 + i * 0.2;
      const x = -16 - q * 26;
      const y = by - 6 - q * q * (10 + tw) - 0.5;
      A.shape(ctx, (c) => { c.moveTo(x - 3, y + 2); c.lineTo(x - 1.5 - q * 2, y - 4.5 + q); c.lineTo(x + 2, y + 2); c.closePath(); }, heat > 0.5 ? '#ffc05a' : '#ff9a3a', '#c8561a', { lw: 1.6, cel: [1, 0] });
    }
    vol(ctx, tail, SK[0], SK[1], SK[2], { cel: 2, rim: 1.4, lw: 2.4, tex: (c) => {
      c.strokeStyle = A.c(dark);
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(-23, by - 9); c.lineTo(-21, by + 7);
      c.moveTo(-30, by - 11 - tw * 0.5); c.lineTo(-28, by + 4);
      c.moveTo(-36, by - 12 - tw); c.lineTo(-34, by - 1 - tw * 0.5);
      c.stroke();
      scales(c, -44, by - 20, 30, 28, 4, 'rgba(10,30,70,0.18)', 0.8);
      if (heat > 0) {
        c.strokeStyle = 'rgba(255,150,60,' + (0.35 + heat * 0.5).toFixed(2) + ')';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(-18, by + 1); c.lineTo(-24, by - 1); c.lineTo(-29, by + 1); c.lineTo(-36, by - 4 - tw * 0.5);
        c.stroke();
      }
    } });
    // 尾尖火核
    const core = 0.5 + Math.sin(t * 6) * 0.15 + heat * 0.4;
    glow(ctx, tipX, tipY, 9 + heat * 5, '255,140,40', 0.5 * core);
    if (lit) flame(ctx, tipX, tipY, 3.4, t, 3, fast ? -0.45 : 0);
    else {
      ctx.fillStyle = A.c('#ffd35a');
      ctx.beginPath();
      ctx.arc(tipX, tipY, 1.8, 0, TAU);
      ctx.fill();
    }

    // 背上的劍（劍柄朝後上方）；燒起來時先在身體後面畫大火
    const sx = -3;
    const sy = by - 9;
    const sa = -0.42 + (walk ? step * 0.03 : 0) + (hurt ? -0.15 : 0);
    const back = fast || (walk && Math.abs(m.vx || 0) > 60) ? -0.5 : Math.sin(t * 3) * 0.05;
    if (lit) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(sa);
      flame(ctx, 0, -9, fast ? 11 : 10, t, 0, back * 0.8);
      flame(ctx, 3, -4, 7, t, 2.1, back * 1.2, { rgb: '255,120,40', out: '#ff5a1a', sh: '#c83a10', core: '#ffc84a' });
      ctx.restore();
    }

    // 身體
    const body = (c) => {
      c.moveTo(-18, by + 5);
      c.bezierCurveTo(-22, by - 6, -12, by - 11, 0, by - 11);
      c.bezierCurveTo(12, by - 11, 21, by - 7, 22, by + 1);
      c.bezierCurveTo(21, by + 8, 10, by + 9, 0, by + 9);
      c.bezierCurveTo(-8, by + 9, -16, by + 9, -18, by + 5);
      c.closePath();
    };
    vol(ctx, body, SK[0], SK[1], SK[2], { cel: 2.6, rim: 1.8, lw: 2.6, grad: [by - 11, by + 9, '#4a92d6', '#3a74b8'], tex: (c) => {
      // 肚子、鱗片、深色斑、熱起來時的熔岩紋
      A.ellipse(c, 2, by + 10, 18, 5.5, BEL[0], BEL[1], { noStroke: true, hl: false, shadeAt: 0.1 });
      c.strokeStyle = A.c(BEL[1]);
      c.lineWidth = 0.9;
      c.beginPath();
      for (let i = -12; i <= 16; i += 4) { c.moveTo(i, by + 5.5); c.lineTo(i + 1, by + 9); }
      c.stroke();
      scales(c, -20, by - 12, 44, 14, 4.4, 'rgba(10,30,70,0.16)', 0.8);
      c.fillStyle = A.c(dark);
      [[-12, -4, 2.2], [-5, -7, 1.8], [7, -7, 2], [14, -4, 1.7], [-9, 0, 1.5], [11, 0, 1.6], [1, -3, 1.4]].forEach(([x, y, r]) => { c.beginPath(); c.ellipse(x, by + y, r * 1.3, r, 0.2, 0, TAU); c.fill(); });
      if (heat > 0) {
        c.strokeStyle = 'rgba(255,170,70,' + (0.3 + heat * 0.6).toFixed(2) + ')';
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(-14, by - 2); c.lineTo(-8, by - 5); c.lineTo(-3, by - 2); c.lineTo(4, by - 6); c.lineTo(10, by - 3);
        c.moveTo(-3, by - 2); c.lineTo(-1, by + 3);
        c.moveTo(10, by - 3); c.lineTo(16, by - 1);
        c.stroke();
      }
    } });
    // 背脊：一排熔岩橘的小鰭刺
    for (let i = 0; i < 5; i++) {
      const x = -14 + i * 6.5;
      const y = by - 10.5 + Math.abs(i - 2) * 0.6;
      const hgt = 4.2 + (i === 1 || i === 2 ? 1 : 0);
      A.shape(ctx, (c) => { c.moveTo(x - 2.8, y + 2); c.quadraticCurveTo(x - 1.4, y - hgt * 0.6, x - 0.8, y - hgt); c.quadraticCurveTo(x + 1.6, y - hgt * 0.3, x + 2.8, y + 2); c.closePath(); }, heat > 0.5 ? '#ffc05a' : '#ff9a3a', '#c8561a', { lw: 1.6, cel: [1.2, 0] });
    }

    // 劍：刻著火紋符的劍身、龍翼護手、皮纏劍柄、紅寶石劍首
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sa);
    const bl = 15;
    if (heat > 0) glow(ctx, 0, -bl * 0.5, 18, '255,160,60', 0.3 + heat * 0.35);
    const blade = (c) => { c.moveTo(-3.2, 5); c.lineTo(-3.2, -bl); c.lineTo(3.2, -bl); c.lineTo(3.2, 5); c.closePath(); };
    const bg = heat >= 1 ? ['#fff4c8', '#ff9a3a', '#ffffff'] : heat > 0 ? ['#ffe2b8', '#e0925a', '#fff6e8'] : ['#e8eef6', '#96a4b8', '#ffffff'];
    vol(ctx, blade, bg[0], bg[1], bg[2], { cel: 1.4, rim: 0.9, lw: 2, grad: [-bl, 5, bg[0], heat > 0 ? '#ff7a2a' : '#b8c4d4'], tex: (c) => {
      c.strokeStyle = A.c(heat > 0 ? '#c84a1a' : '#7a889c');
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0.4, 3); c.lineTo(0.4, -bl + 1);
      c.stroke();
      rune(c, 0.3, -bl * 0.55, 1.7, 0, heat > 0 ? '#fff2a0' : 'rgba(90,110,140,0.8)', 0.9);
      rune(c, 0.3, -bl * 0.2, 1.5, 3, heat > 0 ? '#fff2a0' : 'rgba(90,110,140,0.8)', 0.9);
    } });
    if (lit) flame(ctx, 0.5, -1, 5, t, 1.7, back * 0.8);
    // 插進背裡的地方
    ctx.fillStyle = A.c(dark);
    ctx.beginPath();
    ctx.ellipse(0, 4.5, 5.5, 1.8, 0, 0, TAU);
    ctx.fill();
    // 龍翼護手
    vol(ctx, (c) => {
      c.moveTo(-3, -bl - 1);
      c.quadraticCurveTo(-7, -bl, -10.5, -bl - 4.5);
      c.quadraticCurveTo(-7, -bl - 3, -5.5, -bl - 5);
      c.quadraticCurveTo(-3, -bl - 3.5, 0, -bl - 4.5);
      c.quadraticCurveTo(3, -bl - 3.5, 5.5, -bl - 5);
      c.quadraticCurveTo(7, -bl - 3, 10.5, -bl - 4.5);
      c.quadraticCurveTo(7, -bl, 3, -bl - 1);
      c.closePath();
    }, '#f2c14a', '#b07a1e', '#fff0a8', { cel: 1, rim: 0.9, lw: 1.8 });
    ctx.fillStyle = A.c(heat > 0 ? '#ffe46a' : '#e8384a');
    ctx.beginPath();
    ctx.arc(0, -bl - 2.6, 1.3, 0, TAU);
    ctx.fill();
    vol(ctx, (c) => A.roundRect(c, -2.3, -bl - 13.5, 4.6, 9.5, 1.5), '#8a5430', '#5a321a', '#c08a5a', { cel: 1, rim: 0.8, lw: 1.8 });
    ctx.strokeStyle = A.c('#4a2812');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(-2.1, -bl - 5.2 - i * 2.1);
      ctx.lineTo(2.1, -bl - 6.6 - i * 2.1);
    }
    ctx.stroke();
    vol(ctx, (c) => c.arc(0, -bl - 15.5, 3.4, 0, TAU), '#f2c14a', '#b07a1e', '#fff0a8', { cel: 1, rim: 0.8, lw: 1.8 });
    const gem = heat > 0 ? '#ff7a2a' : '#e8384a';
    ctx.fillStyle = A.c(gem);
    ctx.beginPath();
    ctx.arc(0, -bl - 15.5, 1.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-0.6, -bl - 16.2, 0.6, 0, TAU);
    ctx.fill();
    if (heat > 0) glow(ctx, 0, -bl - 15.5, 6, '255,120,60', 0.6);
    // 點燃中的火星（蓄力）／燒起來後往上飄的火粉
    if (wind || lit) {
      for (let i = 0; i < 6; i++) {
        const q = (t * (wind ? 4 : 2.5) + i * 0.17) % 1;
        const x = Math.sin(i * 2.3 + t * 3) * 7;
        const y = -2 - q * (wind ? 24 : 32);
        ctx.globalAlpha = ba * (1 - q);
        sparkle(ctx, x, y, 2.6 - q * 1.5, i % 2 ? '#ffe46a' : '#ff9a3a');
      }
      ctx.globalAlpha = ba;
    }
    ctx.restore();

    leg(-10, step, SK, false);
    leg(11, -step, SK, false);

    // 頭：楔形吻部、眉骨小角、縱瞳、嘴角露一顆尖牙
    ctx.save();
    ctx.translate(15, by - 4);
    let hr = Math.sin(t * 2.5) * 0.04;
    if (wind) hr = 0.12;
    if (strike) hr = -0.12;
    if (hurt) hr = -0.3;
    if (dead) hr = 0.15;
    ctx.rotate(hr);
    const hx = 9;
    const hy = -7;
    const open = strike || hurt || wind;
    // 下顎
    const jaw = (c) => {
      c.moveTo(hx - 8, hy + 5);
      c.quadraticCurveTo(hx + 6, hy + (open ? 12 : 9), hx + 17, hy + (open ? 7 : 4));
      c.quadraticCurveTo(hx + 8, hy + (open ? 14 : 11), hx - 6, hy + 10);
      c.closePath();
    };
    vol(ctx, jaw, BEL[0], BEL[1], BEL[2], { cel: 1, rim: 0.8, lw: 2 });
    if (open) {
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy + 5);
      ctx.quadraticCurveTo(hx + 8, hy + 10, hx + 16, hy + 5);
      ctx.quadraticCurveTo(hx + 8, hy + 6, hx - 2, hy + 5);
      ctx.fill();
      if (heat > 0) glow(ctx, hx + 8, hy + 7, 8, '255,150,50', 0.5);
    }
    const head = (c) => {
      c.moveTo(hx - 13, hy + 7);
      c.bezierCurveTo(hx - 15, hy - 8, hx - 4, hy - 13, hx + 4, hy - 10.5);
      c.bezierCurveTo(hx + 12, hy - 8.5, hx + 19, hy - 2, hx + 18, hy + 3);
      c.quadraticCurveTo(hx + 17, hy + 5.5, hx + 13, hy + 5.5);
      c.quadraticCurveTo(hx + 4, hy + 6, hx - 2, hy + 8);
      c.quadraticCurveTo(hx - 9, hy + 10, hx - 13, hy + 7);
      c.closePath();
    };
    vol(ctx, head, SK[0], SK[1], SK[2], { cel: 2.2, rim: 1.6, lw: 2.6, grad: [hy - 11, hy + 8, '#4e98dc', '#3a74b8'], tex: (c) => {
      scales(c, hx - 14, hy - 12, 32, 14, 3.8, 'rgba(10,30,70,0.15)', 0.8);
      c.fillStyle = A.c(dark);
      [[hx - 8, hy - 5, 1.8], [hx - 5, hy + 1, 1.4], [hx + 12, hy - 5, 1.2]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
      if (heat > 0) {
        c.strokeStyle = 'rgba(255,170,70,' + (0.3 + heat * 0.6).toFixed(2) + ')';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(hx - 12, hy - 1); c.lineTo(hx - 7, hy - 3); c.lineTo(hx - 3, hy - 8);
        c.stroke();
      }
    } });
    // 嘴線、鼻孔、尖牙
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + 2, hy + 5.5);
    ctx.quadraticCurveTo(hx + 10, hy + 6, hx + 16, hy + 4);
    ctx.stroke();
    ctx.fillStyle = A.c(dark);
    ctx.beginPath();
    ctx.ellipse(hx + 15, hy - 1.8, 1.2, 0.8, -0.3, 0, TAU);
    ctx.fill();
    A.shape(ctx, (c) => { c.moveTo(hx + 10, hy + 5.6); c.lineTo(hx + 11, hy + 9); c.lineTo(hx + 12.3, hy + 5.4); c.closePath(); }, '#fffaf0', null, { lw: 1.1 });
    // 眉骨上的兩根小角
    [[hx - 6, hy - 10, -0.9, 4.5], [hx - 1, hy - 11.5, -0.5, 3.6]].forEach(([x, y, a, h]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      A.shape(ctx, (c) => { c.moveTo(-1.8, 1); c.quadraticCurveTo(-0.6, -h * 0.6, 0.4, -h); c.quadraticCurveTo(1.2, -h * 0.4, 1.8, 1); c.closePath(); }, '#ffb04a', '#c8561a', { lw: 1.4, cel: [0.8, 0] });
      ctx.restore();
    });
    // 眼睛
    const kind = eyeKind(m);
    const ek = (lit || wind || strike) && kind === 'normal' ? 'angry' : kind;
    const eo = { iris: heat > 0 ? '#fff08a' : '#ffd24a', irisD: heat > 0 ? '#ff6a1a' : '#d06a1a', pupil: 'slit', lidCol: SK[1], lid: 0.12, tilt: ek === 'angry' ? 0.55 : 0, look: 0.6, lw: 1.8, glowRgb: lit ? '255,170,60' : null };
    beastEye(ctx, hx + 2, hy - 3.5, 4.4, 4.8, ek === 'angry' ? 'normal' : ek, eo);
    // 眉骨稜線
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy - 8.2 - (ek === 'angry' ? 0.8 : 0));
    ctx.quadraticCurveTo(hx + 2, hy - 10, hx + 7, hy - 7.5 + (ek === 'angry' ? 1.2 : 0));
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    if (lit && fast) speedLines(ctx, -46, -20, 22, 3, 14, t, 'rgba(255,200,120,0.75)');
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
    const dead = !!m.dead;
    const walk = walking(m);
    const step = walk ? Math.sin(t * (9 + rage)) : 0;
    const shake = (k > 0.2 ? Math.sin(t * 57) * k * 1.6 : 0) + (wind ? Math.sin(t * 70) * 1.2 : 0);
    // 花崗岩：從灰褐慢慢燒成赤紅
    const ST = [mixq('#a89a8a', '#d0624a', k * 0.8), mixq('#766858', '#8a2e24', k * 0.8), mixq('#e2d8c8', '#ffb08a', k * 0.8)];
    const TOP = mixq('#c2b6a4', '#e88a66', k * 0.8);
    const SIDE = mixq('#8a7c6c', '#a03a2c', k * 0.8);
    const lava = Math.max(0, (k - 0.3) / 0.7);
    const IRON = ['#8e98aa', '#5a6476', '#d4dcea'];
    const BR = ['#e0a844', '#9a6a1e', '#fff0b0'];
    const HORN = ['#f2e4c6', '#b8a07a', '#fffaf0'];
    const paint = mixq('#c8282a', '#ff6a2a', k);
    ctx.save();
    ctx.translate(shake, 0);
    if (strike) ctx.rotate(0.12);
    if (hurt) ctx.rotate(-0.1);
    contact(ctx, 0, 0, 30, 0.3);
    if (k >= 0.6) glow(ctx, 0, -30, 56, '255,70,40', (0.15 + Math.sin(t * 8) * 0.08) * (k + 0.2));

    // 石頭腳（兩塊扁石）
    const foot = (x, lift) => vol(ctx, (c) => {
      c.moveTo(x - 9, -lift);
      c.lineTo(x - 8, -6 - lift);
      c.lineTo(x + 2, -8.5 - lift);
      c.lineTo(x + 9, -5 - lift);
      c.lineTo(x + 8.5, -lift);
      c.closePath();
    }, ST[0], ST[1], ST[2], { cel: 2, rim: 1.2, lw: 2.2 });
    foot(-11, Math.max(0, step) * 3);
    foot(12, Math.max(0, -step) * 3);

    // 後面的拳頭
    const fistUp = wind ? -22 : strike ? -2 : Math.sin(t * (4 + rage * 2)) * (1 + k * 2);
    vol(ctx, (c) => c.ellipse(-27, -24 + fistUp * 0.6, 7.5, 7, 0.2, 0, TAU), SIDE, ST[1], null, { cel: 2, lw: 2.2 });

    const breathe = 1 + Math.sin(t * (2 + rage)) * (0.015 + k * 0.02);
    ctx.save();
    ctx.translate(0, -4);
    ctx.scale(1 / breathe, breathe);

    // 頭盔的兩支彎角（有年輪紋、尖端發黑）
    const hs = 1 + k * 0.15;
    const horn = (x0, y0, s) => {
      ctx.save();
      ctx.translate(x0, y0);
      ctx.scale(s * hs, hs);
      const hp = (c) => {
        c.moveTo(-3, 5);
        c.bezierCurveTo(9, 6, 18, 0, 17, -20);
        c.quadraticCurveTo(15.5, -22.5, 14, -20);
        c.bezierCurveTo(12, -8, 6, -5, -3, -5);
        c.closePath();
      };
      vol(ctx, hp, HORN[0], HORN[1], HORN[2], { cel: 1.6, rim: 1, lw: 2.4, grad: [5, -22, '#e8d4ae', '#fff6e0'], tex: (c) => {
        c.strokeStyle = A.c('#a88e66');
        c.lineWidth = 1.1;
        c.lineCap = 'round';
        c.beginPath();
        [[2, -5, 2, 5], [6, -5.5, 7, 4.5], [10, -8, 12, 1.5], [12.5, -12, 15, -5]].forEach(([a, b, d, e]) => { c.moveTo(a, b); c.quadraticCurveTo((a + d) / 2 + 1.5, (b + e) / 2, d, e); });
        c.stroke();
        c.fillStyle = A.c('#5a4634');
        c.beginPath();
        c.moveTo(13, -16); c.lineTo(18, -18); c.lineTo(16, -23); c.lineTo(13, -19);
        c.fill();
      } });
      ctx.restore();
    };
    horn(-20, -45, -1);
    horn(24, -44, 1);

    // 身體：多切面的大石塊（頂面亮、右側面暗、底下接觸陰影）
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
    vol(ctx, body, ST[0], ST[1], ST[2], { cel: 4, rim: 2.2, lw: 2.8, tex: (c) => {
      // 切面
      c.fillStyle = A.c(TOP);
      c.beginPath();
      c.moveTo(-28, -24); c.lineTo(-20, -42); c.lineTo(-6, -50); c.lineTo(-4, -38); c.lineTo(-16, -30); c.closePath();
      c.fill();
      c.fillStyle = A.c(SIDE);
      c.beginPath();
      c.moveTo(25, -36); c.lineTo(28, -16); c.lineTo(22, -1); c.lineTo(15, -1); c.lineTo(19, -18); c.closePath();
      c.fill();
      c.fillStyle = 'rgba(40,20,10,0.22)';
      c.beginPath();
      c.moveTo(-25, -2); c.lineTo(-24, -9); c.quadraticCurveTo(0, -5, 22, -7); c.lineTo(22, -1); c.closePath();
      c.fill();
      // 岩層紋
      c.strokeStyle = 'rgba(60,40,30,0.35)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-28, -18); c.quadraticCurveTo(-18, -20, -10, -17);
      c.moveTo(16, -26); c.quadraticCurveTo(22, -27, 28, -24);
      c.moveTo(-26, -10); c.quadraticCurveTo(-20, -11, -15, -9);
      c.stroke();
      speckle(c, -28, -50, 56, 50, 34, 7, 'rgba(60,40,30,0.35)', 0.4, 1.1);
      speckle(c, -28, -50, 56, 50, 16, 41, 'rgba(255,250,235,0.45)', 0.3, 0.8);
      // 青苔
      if (k < 0.7) {
        c.globalAlpha *= 1 - k;
        vol(c, (q) => { q.moveTo(-28, -22); q.quadraticCurveTo(-24, -27, -20, -24); q.quadraticCurveTo(-17, -20, -21, -17); q.quadraticCurveTo(-25, -15, -28, -18); q.closePath(); }, '#7a9a4a', '#56743a', null, { cel: 0.8, noStroke: true });
        speckle(c, -27, -26, 8, 8, 6, 3, '#a8c46a', 0.4, 0.9);
        c.globalAlpha /= 1 - k;
      }
      // 岩漿裂縫（越氣越亮）
      if (lava > 0) glow(c, 0, -20, 30, '255,100,40', lava * 0.35);
    } });
    // 裂紋：平常是深色刻痕，越氣越透出岩漿光
    const crackPath = () => {
      ctx.beginPath();
      ctx.moveTo(-28, -24); ctx.lineTo(-20, -20); ctx.lineTo(-22, -14); ctx.lineTo(-17, -9);
      ctx.moveTo(22, -8); ctx.lineTo(15, -5); ctx.lineTo(14, 0);
      if (k > 0.3) { ctx.moveTo(26, -28); ctx.lineTo(20, -25); ctx.lineTo(22, -20); ctx.lineTo(18, -16); }
      if (k > 0.6) { ctx.moveTo(-8, -3); ctx.lineTo(-5, -8); ctx.lineTo(0, -6); }
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    crackPath();
    ctx.strokeStyle = A.c('#3a2618');
    ctx.lineWidth = 1.8 + lava;
    ctx.stroke();
    if (lava > 0) {
      crackPath();
      ctx.strokeStyle = A.c(mixq('#ff7a2a', '#ffe070', lava));
      ctx.lineWidth = 1 + lava * 0.8;
      ctx.stroke();
    }

    // 鐵盔：圓頂、中脊、刮痕、銅邊與鉚釘、護鼻
    const helm = (c) => {
      c.moveTo(-25, -36);
      c.bezierCurveTo(-26, -53, -12, -61, 2, -61);
      c.bezierCurveTo(17, -61, 30, -51, 29, -34);
      c.quadraticCurveTo(2, -43, -25, -36);
      c.closePath();
    };
    vol(ctx, helm, IRON[0], IRON[1], IRON[2], { cel: 3, rim: 1.8, lw: 2.6, grad: [-61, -36, '#aab4c6', '#7a8496'], tex: (c) => {
      sheen(c, -22, -62, 22, 26, 0.55);
      c.strokeStyle = 'rgba(40,46,60,0.5)';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(14, -54); c.lineTo(19, -50);
      c.moveTo(-14, -48); c.lineTo(-10, -51);
      c.moveTo(17, -47); c.lineTo(21, -45);
      c.stroke();
      // 中脊與兩條鐵帶
      c.strokeStyle = A.c('#4a5264');
      c.lineWidth = 3.2;
      c.beginPath();
      c.moveTo(1, -61); c.quadraticCurveTo(3, -50, 3, -41);
      c.stroke();
      c.strokeStyle = A.c('#c8d0de');
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(0, -60); c.quadraticCurveTo(2, -50, 2, -42);
      c.stroke();
    } });
    [-56, -48].forEach((y, i) => rivet(ctx, 2 + i * 0.8 + 3.5, y + 2, 1, '#3a4254'));
    const rim = (c) => {
      c.moveTo(-26, -35);
      c.quadraticCurveTo(2, -42, 30, -33);
      c.lineTo(29.5, -38.5);
      c.quadraticCurveTo(2, -47.5, -25.5, -40.5);
      c.closePath();
    };
    vol(ctx, rim, BR[0], BR[1], BR[2], { cel: 1.2, celY: 1, rim: 1, lw: 2 });
    [[-19, -38.3], [-9, -40.2], [13, -40.2], [23, -37.6]].forEach(([x, y]) => rivet(ctx, x, y, 1.2, '#6a4a1e'));
    vol(ctx, (c) => { c.moveTo(6, -41); c.lineTo(10.5, -41); c.lineTo(9.8, -30); c.quadraticCurveTo(8.25, -28, 6.7, -30); c.closePath(); }, IRON[0], IRON[1], IRON[2], { cel: 1, rim: 0.8, lw: 2 });

    // 臉：突出的岩石眉骨＋深陷的眼窩
    const ey = -25;
    const kind = eyeKind(m);
    const ek = kind === 'normal' || kind === 'closed' ? (k > 0.35 || wind || strike ? 'angry' : kind) : kind;
    ctx.fillStyle = 'rgba(40,20,10,0.35)';
    ctx.beginPath();
    ctx.ellipse(2, ey, 7.8, 7, 0, 0, TAU);
    ctx.ellipse(15.5, ey - 0.5, 7.4, 6.8, 0, 0, TAU);
    ctx.fill();
    // 戰紋（越氣越亮）
    if (k > 0.4) {
      glow(ctx, -6, -16, 11, '255,110,60', (k - 0.4) * 1.1);
      glow(ctx, 22, -16, 11, '255,110,60', (k - 0.4) * 1.1);
    }
    const warPaint = () => {
      ctx.beginPath();
      ctx.moveTo(-11, -20); ctx.lineTo(-2, -18); ctx.lineTo(-10, -16.5);
      ctx.moveTo(-10, -13); ctx.lineTo(-3, -12.5);
      ctx.moveTo(18, -18); ctx.lineTo(26, -20);
      ctx.moveTo(18.5, -13.5); ctx.lineTo(25, -14.5);
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    warPaint();
    ctx.strokeStyle = A.c(paint);
    ctx.lineWidth = 2.8;
    ctx.stroke();
    if (k > 0.4) {
      warPaint();
      ctx.strokeStyle = 'rgba(255,230,160,' + ((k - 0.4) * 1.2).toFixed(2) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const eyeHot = k >= 0.6;
    const eo = { sclera: eyeHot ? '#ffe8b0' : '#fff6e6', iris: eyeHot ? '#ffffff' : '#ffcf4a', irisD: eyeHot ? '#ff6a1a' : '#b8561a', irisK: 0.7, lidCol: ST[1], lid: 0.05, tilt: ek === 'angry' ? 0.3 + k * 0.4 : 0, lw: 2, glowRgb: eyeHot ? '255,120,40' : null };
    const ekk = ek === 'angry' ? 'normal' : ek;
    beastEye(ctx, 2, ey + 0.5, 5.2, 5.8 - k * 0.8, ekk, eo);
    beastEye(ctx, 15.5, ey, 4.9, 5.5 - k * 0.8, ekk, eo);
    // 岩石眉骨（蓋在眼睛上面，越氣越往中間壓）
    if (!dead) {
      const tilt = kind === 'hurt' ? 0 : 2 + k * 4 + (ek === 'angry' ? 1.5 : 0);
      vol(ctx, (c) => {
        c.moveTo(-5, ey - 8 - tilt * 0.4);
        c.lineTo(7.5, ey - 6.5 + tilt * 0.5);
        c.lineTo(9.5, ey - 9 + tilt * 0.3);
        c.lineTo(21, ey - 9 - tilt * 0.4);
        c.lineTo(21.5, ey - 12 - tilt * 0.4);
        c.lineTo(9, ey - 11.5 + tilt * 0.2);
        c.lineTo(-4.5, ey - 11.5 - tilt * 0.4);
        c.closePath();
      }, TOP, ST[1], ST[2], { cel: 1, rim: 0.8, lw: 2 });
    }
    // 嘴：一開始抿嘴，生氣後咬牙切齒
    const my = -11;
    if (rage >= 2 || strike || wind) {
      const mw = 8 + k * 3;
      A.shape(ctx, (c) => A.roundRect(c, 8 - mw, my - 4, mw * 2, 8, 3), '#3a1a14', null, { lw: 2.2 });
      if (lava > 0) glow(ctx, 8, my, mw, '255,120,40', lava * 0.6);
      ctx.fillStyle = A.c('#f6ecd8');
      for (let i = 0; i < 4; i++) {
        const x = 8 - mw + 1.5 + (i * (mw * 2 - 3)) / 4;
        const tw = (mw * 2 - 3) / 4 - 0.8;
        ctx.fillRect(x, my - 3.2, tw, 2.8);
        ctx.fillRect(x + tw * 0.2, my + 0.6, tw, 2.6);
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      A.roundRect(ctx, 8 - mw, my - 4, mw * 2, 8, 3);
      ctx.stroke();
    } else if (hurt) {
      smallMouth(ctx, 8, my, true, 1.1);
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(3, my + 1);
      ctx.quadraticCurveTo(8, my - 1.5, 13, my + 1);
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

    // 前面的拳頭：石拳＋皮護腕＋鐵指環
    const fx2 = strike ? 34 : 29;
    const fy = -22 + fistUp;
    vol(ctx, (c) => A.roundRect(c, fx2 - 12, fy - 5.5, 7, 11, 2), '#8a5a34', '#5a3a1e', '#c08a5a', { cel: 1, rim: 0.8, lw: 2, tex: (c) => {
      c.strokeStyle = A.c('#4a2a14');
      c.lineWidth = 0.9;
      c.beginPath();
      for (let i = 0; i < 3; i++) { c.moveTo(fx2 - 12, fy - 3 + i * 3.4); c.lineTo(fx2 - 5, fy - 4.5 + i * 3.4); }
      c.stroke();
    } });
    const fist = (c) => {
      c.moveTo(fx2 - 7, fy - 5);
      c.lineTo(fx2 - 1, fy - 8.5);
      c.lineTo(fx2 + 6, fy - 7);
      c.lineTo(fx2 + 9, fy - 1);
      c.lineTo(fx2 + 7, fy + 6);
      c.lineTo(fx2 - 1, fy + 8);
      c.lineTo(fx2 - 7, fy + 4);
      c.closePath();
    };
    vol(ctx, fist, ST[0], ST[1], ST[2], { cel: 2, rim: 1.4, lw: 2.4, tex: (c) => {
      speckle(c, fx2 - 8, fy - 9, 18, 18, 8, 13, 'rgba(60,40,30,0.35)', 0.4, 0.9);
      c.fillStyle = A.c(IRON[1]);
      c.fillRect(fx2 + 3, fy - 8, 3.2, 16);
      c.fillStyle = A.c(IRON[2]);
      c.fillRect(fx2 + 3, fy - 8, 1, 16);
    } });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fx2 - 1, fy - 5.5);
    ctx.lineTo(fx2 - 0.5, fy + 1);
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
      // 崩落的碎石
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i * 0.33) % 1;
        ctx.fillStyle = A.c(ST[1]);
        ctx.beginPath();
        ctx.arc(fx2 + 6 + q * 10, fy + 4 + q * q * 20 + i * 2, 1.4, 0, TAU);
        ctx.fill();
      }
    }
    if (lava > 0) embers(ctx, 0, -36, 50, 40, 3 + Math.round(lava * 4), t, 0.8, ['#ffd35a', '#ff7a2a'], 5);

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
    const dead = !!m.dead;
    const walk = walking(m);
    const pulling = !!fx.pulling;
    const rolling = !!fx.rolling;
    const SKIN = ['#dcb2a0', '#a87a6a', '#fff0e4'];
    const AR = ['#7c88b8', '#4a5486', '#c8d2f4'];
    const AR2 = ['#6c78aa', '#434c7c', '#b4bee8'];
    const band = '#343c68';
    const pg = pulling ? 0.7 + Math.sin(t * 14) * 0.2 : wind ? 0.45 : 0.14 + Math.sin(t * 2.5) * 0.06;
    // 甲片上的小鱗板（一排排圓角小方塊）
    const plates = (c, x0, y0, w, h, s) => {
      c.fillStyle = 'rgba(30,36,80,0.22)';
      c.beginPath();
      for (let yy = y0; yy < y0 + h; yy += s) for (let xx = x0 + ((yy - y0) / s % 2) * s * 0.5; xx < x0 + w; xx += s) {
        c.moveTo(xx + s * 0.8, yy);
        c.arc(xx + s * 0.4, yy, s * 0.36, 0, TAU);
      }
      c.fill();
    };
    // 引力紋：水晶之間流動的紫光
    const gravVein = (c, pts) => {
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = 'rgba(200,140,255,' + (0.25 + pg * 0.6).toFixed(2) + ')';
      c.lineWidth = 2.4;
      c.beginPath();
      pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.stroke();
      c.strokeStyle = 'rgba(255,230,255,' + (0.2 + pg * 0.7).toFixed(2) + ')';
      c.lineWidth = 0.9;
      c.stroke();
    };

    if (rolling) {
      // 縮成一顆鑲水晶的甲殼球滾過來，身後拖著紫色引力殘光
      const R = 22;
      ctx.save();
      contact(ctx, 0, 0, 24, 0.35);
      ctx.translate(0, -R - 1 + Math.abs(Math.sin(t * 12)) * -1.5);
      glow(ctx, -18, 0, 36, '190,130,255', 0.35);
      // 殘影
      for (let i = 1; i <= 2; i++) {
        ctx.globalAlpha = ba * (0.22 / i);
        ctx.fillStyle = A.c('#9a8ae8');
        ctx.beginPath();
        ctx.arc(-i * 9, 0, R, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = ba;
      speedLines(ctx, -R - 4, 0, R * 1.4, 4, 16, t, 'rgba(210,170,255,0.8)');
      const ball = (c) => c.arc(0, 0, R, 0, TAU);
      vol(ctx, ball, AR[0], AR[1], AR[2], { cel: 5, rim: 2.2, lw: 2.8, under: [6, 8, R, '150,110,255', 0.25], tex: (c) => {
        c.save();
        c.rotate(t * 13);
        for (let i = -3; i <= 3; i++) {
          c.strokeStyle = A.c(band);
          c.lineWidth = 2.2;
          c.beginPath();
          c.moveTo(i * 7, -R);
          c.quadraticCurveTo(i * 7 + 5 * Math.cos(i), 0, i * 7, R);
          c.stroke();
          c.strokeStyle = 'rgba(210,220,255,0.45)';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(i * 7 + 2, -R);
          c.quadraticCurveTo(i * 7 + 7 * Math.cos(i), 0, i * 7 + 2, R);
          c.stroke();
        }
        plates(c, -R, -R, R * 2, R * 2, 5);
        gravVein(c, [[0, -R + 4], [4, -6], [-6, 6], [0, R - 4]]);
        c.restore();
      } });
      ctx.save();
      ctx.rotate(t * 13);
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((i * TAU) / 3);
        crystal(ctx, 0, -R + 3, 7, 11, 0, AMETHYST, 0.4);
        ctx.restore();
      }
      ctx.restore();
      if (hurt || dead) {
        // 露出暈頭的小臉
        faceEyes(ctx, 4, 0, 8, 2.8, 3.4, m);
      }
      ctx.restore();
      return;
    }

    const step = walk ? Math.sin(t * 13) : 0;

    // 腳下的引力法陣
    if (pulling) {
      ctx.save();
      ctx.translate(-2, -1);
      ctx.scale(1, 0.28);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 58);
      g.addColorStop(0, 'rgba(200,150,255,0.5)');
      g.addColorStop(1, 'rgba(200,150,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, TAU);
      ctx.fill();
      magicCircle(ctx, 52, t * 1.6, 'rgba(120,60,200,0.6)', 5, 8, 0);
      magicCircle(ctx, 52, t * 1.6, 'rgba(225,190,255,0.95)', 2.4, 8, 0);
      ctx.restore();
    }
    contact(ctx, -4, 0, 34, 0.3);

    ctx.save();
    if (pulling) ctx.rotate(-0.06 + Math.sin(t * 40) * 0.01);
    if (hurt) ctx.rotate(-0.1);
    if (strike) ctx.translate(3, 0);
    const bob = walk ? Math.abs(step) * -1.2 : Math.sin(t * 2.5) * 0.6;

    // 腳：粗短、前腳有挖土的大爪
    const foot = (x, s, P, far, claw) => {
      const lift = Math.max(0, s) * 3;
      limb(ctx, (c) => { c.moveTo(x, -12 + bob); c.lineTo(x + s * 2, -3 - lift); }, 8, P[0]);
      vol(ctx, (c) => c.ellipse(x + 2 + s * 2, -2.6 - lift, 5, 2.8, 0, 0, TAU), P[0], P[1], far ? null : P[2], { cel: 1, rim: 0.8, lw: 1.8 });
      ctx.strokeStyle = A.c('#f2e6d0');
      ctx.lineWidth = claw ? 1.8 : 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let q = 0; q < 3; q++) {
        const cx0 = x + 5 + s * 2 + q * 0.4;
        const cy0 = -3.5 - lift + q * 1.4;
        ctx.moveTo(cx0, cy0);
        ctx.quadraticCurveTo(cx0 + (claw ? 3 : 2), cy0, cx0 + (claw ? 4 : 2.6), cy0 + 1.8);
      }
      ctx.stroke();
    };
    foot(-14, -step, [SKIN[1], '#7a5244', SKIN[2]], true, false);
    foot(1, step, [SKIN[1], '#7a5244', SKIN[2]], true, true);

    // 尾巴：一節一節的甲環
    const tw = Math.sin(t * 3) * 2;
    vol(ctx, (c) => { c.moveTo(-30, -15 + bob); c.quadraticCurveTo(-41, -13, -46, -6 + tw); c.quadraticCurveTo(-38, -6, -29, -7 + bob); c.closePath(); }, AR2[0], AR2[1], AR2[2], { cel: 1.5, rim: 1, lw: 2.2, tex: (c) => {
      c.strokeStyle = A.c(band);
      c.lineWidth = 1.2;
      c.beginPath();
      [-34, -38, -42].forEach((x) => { c.moveTo(x, -16 + bob); c.lineTo(x + 1, -4); });
      c.stroke();
    } });

    // 圓頂背甲：前後兩塊大盾甲＋中間五條可以伸縮的環帶
    const cx = -6;
    const cy = -9 + bob;
    const shell = (c) => {
      c.moveTo(cx - 29, cy + 1);
      c.bezierCurveTo(cx - 31, cy - 26, cx - 12, cy - 34, cx + 2, cy - 33);
      c.bezierCurveTo(cx + 18, cy - 32, cx + 30, cy - 20, cx + 29, cy + 1);
      c.quadraticCurveTo(cx, cy + 5, cx - 29, cy + 1);
      c.closePath();
    };
    vol(ctx, shell, AR[0], AR[1], AR[2], { cel: 4, rim: 2.2, lw: 2.8, grad: [cy - 34, cy + 4, '#8c98c8', '#6a76a8'], tex: (c) => {
      // 前後盾甲（較亮）
      c.fillStyle = A.c('#8e9aca');
      c.beginPath();
      c.moveTo(cx - 32, cy + 4); c.quadraticCurveTo(cx - 24, cy - 16, cx - 19, cy - 32); c.lineTo(cx - 40, cy - 40); c.closePath();
      c.moveTo(cx + 32, cy + 4); c.quadraticCurveTo(cx + 24, cy - 14, cx + 20, cy - 32); c.lineTo(cx + 40, cy - 40); c.closePath();
      c.fill();
      plates(c, cx - 31, cy - 30, 14, 32, 4.2);
      plates(c, cx + 18, cy - 28, 14, 32, 4.2);
      // 環帶：每一條有深色縫＋上緣亮邊
      [-10, -3.5, 3, 9.5].forEach((x) => {
        c.strokeStyle = A.c(band);
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(cx + x * 1.9, cy + 4);
        c.quadraticCurveTo(cx + x * 2.1, cy - 16, cx + x * 1.3, cy - 36);
        c.stroke();
        c.strokeStyle = 'rgba(220,228,255,0.55)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(cx + x * 1.9 + 1.8, cy + 4);
        c.quadraticCurveTo(cx + x * 2.1 + 1.8, cy - 16, cx + x * 1.3 + 1.8, cy - 36);
        c.stroke();
      });
      c.strokeStyle = A.c(band);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(cx - 20, cy + 4); c.quadraticCurveTo(cx - 24, cy - 14, cx - 19, cy - 32);
      c.moveTo(cx + 20, cy + 4); c.quadraticCurveTo(cx + 24, cy - 14, cx + 20, cy - 32);
      c.stroke();
      // 引力紋
      gravVein(c, [[cx - 13, cy - 24], [cx - 8, cy - 18], [cx - 4, cy - 22], [cx + 2, cy - 27]]);
      gravVein(c, [[cx + 2, cy - 27], [cx + 7, cy - 19], [cx + 11, cy - 22], [cx + 16, cy - 21]]);
      gravVein(c, [[cx - 4, cy - 22], [cx - 2, cy - 12], [cx + 5, cy - 6]]);
      if (pg > 0.3) glow(c, cx + 2, cy - 22, 26, '180,120,255', (pg - 0.3) * 0.6);
      // 下緣的扇形鱗邊
      c.fillStyle = A.c('#b8c2e6');
      c.beginPath();
      for (let x = -28; x <= 28; x += 5) {
        c.moveTo(cx + x + 2.6, cy + 2);
        c.arc(cx + x, cy + 2 - Math.abs(x) * 0.02, 2.6, 0, TAU);
      }
      c.fill();
      c.strokeStyle = 'rgba(40,44,90,0.5)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(cx - 30, cy - 1); c.quadraticCurveTo(cx, cy + 3, cx + 30, cy - 1);
      c.stroke();
    } });
    // 三顆引力水晶（金色底座＋爪形鑲座）
    const gems = [[cx - 13, cy - 27, 7, 12, -0.45], [cx + 2, cy - 31, 9.5, 17, 0], [cx + 16, cy - 25, 7, 12, 0.5]];
    gems.forEach(([x, y, w, h, r]) => {
      crystal(ctx, x, y + 2, w, h, r, AMETHYST, pg);
      ctx.save();
      ctx.translate(x, y + 2);
      ctx.rotate(r);
      vol(ctx, (c) => c.ellipse(0, 0, w * 0.68, 2.4, 0, 0, TAU), '#f0c050', '#a8741e', '#fff2b0', { cel: 0.8, rim: 0.6, lw: 1.6 });
      A.shape(ctx, (c) => { c.moveTo(-w * 0.55, -1); c.lineTo(-w * 0.4, -4.5); c.lineTo(-w * 0.2, -1); c.moveTo(w * 0.55, -1); c.lineTo(w * 0.4, -4.5); c.lineTo(w * 0.2, -1); }, '#f0c050', null, { lw: 1.2 });
      ctx.restore();
    });
    if (pulling || wind) {
      for (let i = 0; i < 4; i++) {
        const a = t * 3 + (i * TAU) / 4;
        ctx.globalAlpha = ba * 0.9;
        sparkle(ctx, cx + 2 + Math.cos(a) * 20, cy - 30 + Math.sin(a) * 6, 2.2, '#f0d8ff');
      }
      ctx.globalAlpha = ba;
    }

    // 前腳
    foot(-9, step, SKIN, false, false);
    foot(5, -step, SKIN, false, true);

    // 頭：長吻、大耳朵、頭頂一片頭盾
    const hx = 25;
    const hy = -16 + bob + (wind ? 2 : 0);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(hurt ? -0.25 : pulling ? -0.05 : dead ? 0.2 : Math.sin(t * 2) * 0.04);
    // 耳朵
    const ear = (c) => { c.moveTo(-6, -6); c.quadraticCurveTo(-9, -21, -1, -20); c.quadraticCurveTo(3, -12, 2, -5); c.closePath(); };
    vol(ctx, ear, SKIN[0], SKIN[1], SKIN[2], { cel: 1.2, rim: 1, lw: 2.2, tex: (c) => {
      c.fillStyle = A.c('#e89a9a');
      c.beginPath();
      c.moveTo(-4.5, -7); c.quadraticCurveTo(-6, -17, -1.5, -17); c.quadraticCurveTo(0.5, -12, 0, -6);
      c.fill();
    } });
    const head = (c) => {
      c.moveTo(-8, -6);
      c.bezierCurveTo(-6, -14, 6, -12, 12, -5);
      c.quadraticCurveTo(18, -1, 20, 2);
      c.quadraticCurveTo(20, 5, 16, 5);
      c.quadraticCurveTo(8, 7, -2, 6);
      c.quadraticCurveTo(-10, 4, -8, -6);
      c.closePath();
    };
    vol(ctx, head, SKIN[0], SKIN[1], SKIN[2], { cel: 1.8, rim: 1.3, lw: 2.4, tex: (c) => {
      c.strokeStyle = 'rgba(120,70,60,0.35)';
      c.lineWidth = 0.8;
      c.beginPath();
      [8, 11, 14].forEach((x) => { c.moveTo(x, -3 + (x - 8) * 0.3); c.lineTo(x + 0.5, 3); });
      c.stroke();
      A.blush(c, 2, 3.2, 2.8);
    } });
    // 頭盾（小片甲、有鱗板）
    vol(ctx, (c) => { c.moveTo(-7.5, -7); c.quadraticCurveTo(0, -14, 9, -8); c.lineTo(6.5, -4.5); c.quadraticCurveTo(0, -8, -6, -3.5); c.closePath(); }, AR[0], AR[1], AR[2], { cel: 1, rim: 0.9, lw: 2, tex: (c) => plates(c, -8, -12, 18, 8, 3) });
    // 粉紅鼻頭
    vol(ctx, (c) => c.ellipse(19.5, 2.2, 2.6, 2.3, 0, 0, TAU), '#d87a86', '#a04a5a', '#ffd0d8', { cel: 0.6, rim: 0.6, lw: 1.5 });
    ctx.fillStyle = A.c('#5a2a2a');
    ctx.beginPath();
    ctx.arc(20.5, 2.6, 0.6, 0, TAU);
    ctx.fill();
    // 眼睛：紫色虹膜，吸人時發光
    const kind = eyeKind(m);
    const ek = (pulling || wind) && kind === 'normal' ? 'angry' : kind;
    beastEye(ctx, 3.5, -2, 3, 3.4, ek === 'angry' ? 'normal' : ek, { iris: pulling ? '#ffe0ff' : '#b890ff', irisD: pulling ? '#a050ff' : '#5a3aa8', irisK: 0.85, lidCol: SKIN[1], lid: 0.1, tilt: ek === 'angry' ? 0.6 : 0, lw: 1.6, glowRgb: pulling ? '200,140,255' : null });
    if (hurt || strike) smallMouth(ctx, 11, 4.5, true, 0.7);
    else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(9, 4.5);
      ctx.quadraticCurveTo(12, 5.8, 15, 4.6);
      ctx.stroke();
    }
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
        ctx.strokeStyle = 'rgba(90,40,170,0.5)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(px, py, R, R * 0.7, 0, -0.75, 0.75);
        ctx.stroke();
        ctx.strokeStyle = A.c(i % 2 ? '#e0c8ff' : '#b08aff');
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.1 + i / 3) % 1;
        const x = px + 80 - q * 64;
        const y = py + (i - 1) * 14 * (1 - q * 0.6) + 6;
        ctx.globalAlpha = ba * Math.sin(q * PI);
        glow(ctx, x, y, 7, '200,150,255', 0.5);
        vol(ctx, (c) => { c.moveTo(x - 3, y); c.lineTo(x, y - 3); c.lineTo(x + 3.5, y - 0.5); c.lineTo(x + 1, y + 3); c.closePath(); }, '#a89080', '#6a5444', '#e8dccc', { cel: 0.8, rim: 0.6, lw: 1.4 });
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
    const dead = !!m.dead;
    const walk = walking(m);
    const nFl = Math.round(clamp(fx.flames == null ? 3 : fx.flames, 0, 3));
    const SC = ['#54a866', '#2e6a46', '#b8f0a8'];
    const DIA = '#24583a';
    const BEL = ['#efe2a4', '#c4b070', '#fffae0'];
    const HAT = ['#5a46c0', '#33237e', '#9a8af0'];
    const slide = walk ? Math.sin(t * 8) : 0;

    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    contact(ctx, 0, 0, 34, 0.3);
    if (nFl > 0 && !dead) glow(ctx, 0, -50, 50, '170,90,255', 0.08 * nFl);
    // 尾巴尖從盤底後方翹出來（尾端有一圈金環）
    const tailTip = [-38 + slide, -17 + Math.sin(t * 3) * 2];
    limb(ctx, (c) => { c.moveTo(-22, -7); c.quadraticCurveTo(-35, -6, tailTip[0], tailTip[1]); }, 8, SC[0]);
    vol(ctx, (c) => c.ellipse(tailTip[0] + 0.5, tailTip[1] + 2.5, 3.2, 1.6, -0.9, 0, TAU), '#f0c050', '#a8741e', null, { cel: 0.6, lw: 1.4 });
    // 盤繞的身體：兩圈，背上菱形紋、前面一片片淺色腹鱗
    const coil = (y, rx, ry, seed) => {
      vol(ctx, (c) => c.ellipse(0, y, rx, ry, 0, 0, TAU), SC[0], SC[1], SC[2], { cel: 2.6, rim: 1.6, lw: 2.6, grad: [y - ry, y + ry, '#62b872', '#4a9a5c'], tex: (c) => {
        // 腹鱗帶
        c.fillStyle = A.c(BEL[0]);
        c.beginPath();
        c.ellipse(0, y + ry * 0.75, rx * 0.96, ry * 0.5, 0, 0, TAU);
        c.fill();
        c.fillStyle = A.c(BEL[1]);
        c.beginPath();
        c.ellipse(1.5, y + ry * 0.95, rx * 0.9, ry * 0.32, 0, 0, TAU);
        c.fill();
        c.strokeStyle = A.c(BEL[1]);
        c.lineWidth = 0.9;
        c.beginPath();
        for (let i = -6; i <= 6; i++) {
          const a = PI / 2 + i * 0.22;
          const x = Math.cos(a) * rx * 0.95 + slide * 1.2;
          c.moveTo(x, y + ry * 0.3);
          c.lineTo(x * 1.02, y + ry);
        }
        c.stroke();
        scales(c, -rx, y - ry, rx * 2, ry * 1.1, 3.6, 'rgba(10,50,20,0.22)', 0.8);
        // 背上的菱形紋（沿著圈圈排）
        for (let i = -3; i <= 3; i++) {
          const a = PI / 2 + i * 0.36;
          const x = Math.cos(a) * rx * 0.78 + slide * 1.5;
          const yy = y - ry * 0.12 + (1 - Math.abs(i) / 3.5) * ry * 0.08;
          const s = 2.8 * (1 - Math.abs(i) * 0.1);
          c.fillStyle = A.c(DIA);
          c.beginPath();
          c.moveTo(x, yy - s * 1.3);
          c.lineTo(x + s * 1.1, yy);
          c.lineTo(x, yy + s * 1.1);
          c.lineTo(x - s * 1.1, yy);
          c.closePath();
          c.fill();
          c.fillStyle = A.c('#c8e878');
          c.beginPath();
          c.arc(x, yy, s * 0.35, 0, TAU);
          c.fill();
        }
      } });
    };
    coil(-7, 30, 8, 0);
    coil(-18, 23, 7, 5);
    vol(ctx, (c) => c.ellipse(0, -27, 14, 6.5, 0, 0, TAU), SC[0], SC[1], SC[2], { cel: 2, rim: 1.2, lw: 2.4 });

    // 三條脖子（前面是淺色腹鱗）
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
      const neck = (c) => {
        c.moveTo(h.bx, h.by);
        if (i < 2) c.bezierCurveTo(h.bx + (h.x - h.bx) * 0.9, h.by + 4, h.x - 2, h.by - 2, h.x - 2, h.y + 2);
        else c.quadraticCurveTo(h.bx - 3, h.by - 8, h.x - 2, h.y + 2);
      };
      ctx.lineCap = 'round';
      ctx.beginPath();
      neck(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = A.c(SC[1]);
      ctx.lineWidth = 8.2;
      ctx.stroke();
      ctx.save();
      ctx.translate(-1, -1);
      ctx.beginPath();
      neck(ctx);
      ctx.strokeStyle = A.c(SC[0]);
      ctx.lineWidth = 6.2;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(1.6, 1.2);
      ctx.beginPath();
      neck(ctx);
      ctx.strokeStyle = A.c(BEL[0]);
      ctx.lineWidth = 3;
      ctx.setLineDash([2.2, 1.2]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.save();
      ctx.translate(-2.2, -2);
      ctx.beginPath();
      neck(ctx);
      ctx.strokeStyle = A.c(SC[2]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });
    // 脖子分岔處的術士護符：金環＋紫寶石
    vol(ctx, (c) => c.ellipse(0, -29, 11, 4, 0, 0, TAU), '#f0c050', '#a8741e', '#fff2b0', { cel: 1, rim: 0.8, lw: 2, tex: (c) => {
      c.strokeStyle = A.c('#8a5a14');
      c.lineWidth = 0.8;
      c.beginPath();
      for (let x = -9; x <= 9; x += 3) { c.moveTo(x, -32.5); c.lineTo(x + 0.5, -25.5); }
      c.stroke();
    } });
    const gemG = 0.3 + nFl * 0.15 + Math.sin(t * 4) * 0.08;
    glow(ctx, 0, -27, 10, '190,110,255', gemG);
    vol(ctx, (c) => { c.moveTo(0, -31); c.lineTo(3.2, -27.5); c.lineTo(0, -23.5); c.lineTo(-3.2, -27.5); c.closePath(); }, '#b070ff', '#6a2ac0', '#f0d8ff', { cel: 0.8, rim: 0.8, lw: 1.6 });

    // 頭：尖吻的蛇頭（側臉、縱瞳）＋小巫師帽
    const order = [2, 1, 0]; // 中間先亮，再右、再左
    heads.forEach((h, i) => {
      const litHere = order.indexOf(i) < nFl;
      const s = h.s;
      ctx.save();
      ctx.translate(h.x, h.y + 3);
      ctx.scale(s, s);
      ctx.rotate(strike ? 0.18 : wind ? -0.2 : dead ? 0.3 : Math.sin(t * 2.2 + i) * 0.05);
      const open = strike || hurt;
      const head = (c) => {
        c.moveTo(-8, 1);
        c.bezierCurveTo(-11, -8, -5, -15, 3, -14.5);
        c.bezierCurveTo(9, -14.2, 13, -11, 16, -7);
        c.quadraticCurveTo(17.5, open ? -4 : -2, 12, open ? -3 : 0);
        c.lineTo(3, open ? -2 : 1);
        c.quadraticCurveTo(-3, 3, -8, 1);
        c.closePath();
      };
      if (open) {
        // 下顎張開、兩顆毒牙、口中透出魔火光
        A.shape(ctx, (c) => { c.moveTo(-5, 0); c.lineTo(4, -1.5); c.quadraticCurveTo(10, -1, 14, 3.5); c.quadraticCurveTo(4, 6, -5, 2.5); c.closePath(); }, BEL[0], BEL[1], { lw: 2, shadeY: 2 });
        ctx.fillStyle = A.c('#5a1a4a');
        ctx.beginPath();
        ctx.moveTo(3, -2.5);
        ctx.lineTo(14, -4);
        ctx.lineTo(13, 2);
        ctx.closePath();
        ctx.fill();
        if (litHere) glow(ctx, 10, -1, 8, '220,150,255', 0.6);
      }
      vol(ctx, head, SC[0], SC[1], SC[2], { cel: 2, rim: 1.3, lw: 2.2, grad: [-15, 2, '#66bc76', '#4a9a5c'], tex: (c) => {
        A.ellipse(c, 6, 2, 11, 3.2, BEL[0], BEL[1], { noStroke: true, hl: false, shadeAt: 0.1 });
        scales(c, -10, -15, 26, 12, 3.2, 'rgba(10,50,20,0.2)', 0.8);
        // 頭頂的深色 V 紋
        c.fillStyle = A.c(DIA);
        c.beginPath();
        c.moveTo(-8, -6); c.lineTo(-2, -12); c.lineTo(3, -12.5); c.lineTo(-3, -6.5); c.closePath();
        c.fill();
      } });
      if (open) {
        ctx.fillStyle = A.c('#ffffff');
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(9, -3);
        ctx.lineTo(10, 1);
        ctx.lineTo(11.2, -3.2);
        ctx.fill();
        ctx.stroke();
      }
      // 眼睛：金色縱瞳、點火時轉紫發光；眉鱗
      const kind = eyeKind(m);
      const ek = (strike || wind) && kind === 'normal' ? 'angry' : kind;
      beastEye(ctx, 5, -7.5, 3.8, 4.2, ek === 'angry' ? 'normal' : ek, { iris: litHere ? '#f4d8ff' : '#ffe070', irisD: litHere ? '#9a4ae8' : '#c8781a', pupil: 'slit', lidCol: SC[1], lid: 0.12, tilt: ek === 'angry' ? 0.55 : 0, lw: 1.6, glowRgb: litHere && (wind || strike) ? '200,130,255' : null });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(1, -11.8);
      ctx.quadraticCurveTo(5, -13, 9.5, -10.5 + (ek === 'angry' ? 1.2 : 0));
      ctx.stroke();
      ctx.fillStyle = A.c('#1e4a2a');
      ctx.beginPath();
      ctx.ellipse(13.8, -8, 1, 0.7, -0.4, 0, TAU);
      ctx.fill();
      if (!open && !dead && Math.sin(t * 1.6 + i * 2.1) > 0.8) {
        // 吐信
        ctx.strokeStyle = A.c('#e8453a');
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(14, -1.5);
        ctx.lineTo(19, -1);
        ctx.lineTo(22, -3);
        ctx.moveTo(19, -1);
        ctx.lineTo(22, 1);
        ctx.stroke();
      }

      // 巫師帽：帽簷、有皺褶的尖帽、金色帽帶與月亮扣、繡著的星星；熄火時帽尖垂下來
      ctx.save();
      ctx.translate(1, -13);
      ctx.rotate(-0.28);
      const droop = litHere ? 0 : 3;
      const tipX = -7 - droop;
      const tipY = -18 + droop;
      vol(ctx, (c) => c.ellipse(0, 0, 11, 3.2, 0, 0, TAU), HAT[1], '#1e1450', HAT[2], { cel: 0.8, rim: 0.8, lw: 2 });
      const cone = (c) => {
        c.moveTo(-6.5, -0.5);
        c.bezierCurveTo(-5, -8, -2, -13, tipX, tipY);
        c.bezierCurveTo(1, -14, 5, -8, 6.5, -0.5);
        c.quadraticCurveTo(0, 1.2, -6.5, -0.5);
        c.closePath();
      };
      vol(ctx, cone, HAT[0], HAT[1], HAT[2], { cel: 1.6, rim: 1.1, lw: 2, tex: (c) => {
        c.strokeStyle = 'rgba(20,10,60,0.45)';
        c.lineWidth = 0.9;
        c.beginPath();
        c.moveTo(-3, -4); c.quadraticCurveTo(-3.5, -9, tipX + 3, tipY + 5);
        c.moveTo(2.5, -5); c.quadraticCurveTo(1, -9, -1, -11);
        c.stroke();
        c.fillStyle = A.c('#ffe88a');
        [[1, -8, 1.1], [-3, -11, 0.7], [3.5, -3.8, 0.6]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
      } });
      vol(ctx, (c) => { c.moveTo(-6.3, -1); c.quadraticCurveTo(0, 0.6, 6.3, -1); c.lineTo(5.6, -4); c.quadraticCurveTo(0, -2.6, -5.6, -4); c.closePath(); }, '#f2c440', '#a8741e', '#fff2b0', { cel: 0.6, rim: 0.6, lw: 1.4 });
      // 月亮扣
      ctx.fillStyle = A.c('#fff4c0');
      ctx.beginPath();
      ctx.arc(1, -2.4, 1.9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c('#c89a2a');
      ctx.beginPath();
      ctx.arc(1.8, -2.8, 1.5, 0, TAU);
      ctx.fill();
      if (litHere) {
        const big = wind ? 1.35 : strike ? 1.5 : 1;
        glow(ctx, tipX, tipY - 3, 12 * big, '200,120,255', 0.35);
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
    // 三頭都點著魔火時，身邊繞著魔法符文與星塵
    if (nFl >= 3 && !dead) {
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.8 + i / 3) % 1;
        ctx.globalAlpha = ba * Math.sin(q * PI) * 0.9;
        sparkle(ctx, Math.sin(i * 2.4 + t) * 28, -20 - q * 50, 2.6, '#e8c8ff');
        const a = t * 1.5 + (i * TAU) / 3;
        const rx = Math.cos(a) * 34;
        const ry = -16 + Math.sin(a) * 6;
        glow(ctx, rx, ry, 6, '190,120,255', 0.5);
        rune(ctx, rx, ry, 2.6, i * 2 + 1, 'rgba(240,220,255,0.9)', 1.2);
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
    const dead = !!m.dead;
    const walk = walking(m);
    const jump = !!fx.jump || m.onGround === false;
    // 金屬光澤的翠綠甲殼（邊緣帶一點紫藍的虹彩）
    const SH = ['#2e9a72', '#155a44', '#9af0cc'];
    const PRO = ['#26806a', '#10483a', '#86e0c0'];
    const LEG = ['#2e2624', '#140e0c', '#6a5a52'];
    const IRON = ['#8e98aa', '#545e70', '#dfe6f2'];
    const step = walk ? Math.sin(t * 12) : 0;
    let sq = 1;
    if (wind) sq = 0.84;
    if (strike) sq = 0.8;
    if (jump) sq = 1.1;
    ctx.save();
    if (!jump) contact(ctx, 0, 0, 36, 0.35);
    ctx.scale(1 / Math.sqrt(sq), sq);
    const lift = jump ? 6 : 0;
    const by = -18 - lift + (walk ? Math.abs(step) * -1 : 0);

    // 腳（三對，節肢＋脛刺；後面三隻較暗）
    const legs = (front, P) => {
      for (let i = 0; i < 3; i++) {
        const dx = i - 1;
        const x0 = -8 + i * 11 + (front ? 2 : -3);
        const ph2 = step * (i % 2 ? 1 : -1) * (front ? 1 : -1);
        const bend = wind || strike ? 3 : 0;
        const knee = [x0 + dx * 11 + (dx === 0 ? (front ? 4 : -4) : 0), by + 9 + bend];
        const footP = jump
          ? [x0 + dx * 20 + (dx === 0 ? (front ? 8 : -8) : 0), by + 16]
          : [x0 + dx * 17 + (dx === 0 ? (front ? 6 : -6) : 0) + ph2 * 3, -1 - Math.max(0, ph2) * 3];
        limb(ctx, (c) => { c.moveTo(x0, by + 8); c.lineTo(knee[0], knee[1]); }, 7, P[0]);
        limb(ctx, (c) => { c.moveTo(knee[0], knee[1]); c.lineTo(footP[0], footP[1]); }, 5.5, P[0]);
        if (front) {
          ctx.strokeStyle = A.c(P[2]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x0 - 0.5, by + 7);
          ctx.lineTo(knee[0] - 0.5, knee[1] - 1.5);
          ctx.stroke();
        }
        // 脛刺
        const mx = (knee[0] + footP[0]) / 2;
        const my = (knee[1] + footP[1]) / 2;
        const sgn = dx >= 0 ? 1 : -1;
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + sgn * 2.5, my - 1.5);
        ctx.moveTo(footP[0], footP[1]);
        ctx.lineTo(footP[0] + sgn * 3.5, footP[1] + 0.5);
        ctx.stroke();
      }
    };
    legs(false, ['#1c1614', '#0c0808', '#4a3a34']);

    // 甲蟲身體：前胸背板＋隆起的翅鞘（中縫、縱溝、點刻、虹彩亮帶）
    const bx = -4;
    const elytra = (c) => {
      c.moveTo(bx - 30, by + 4);
      c.bezierCurveTo(bx - 32, by - 12, bx - 16, by - 20, bx + 2, by - 19);
      c.bezierCurveTo(bx + 14, by - 18, bx + 22, by - 12, bx + 22, by - 2);
      c.quadraticCurveTo(bx + 20, by + 10, bx, by + 11);
      c.quadraticCurveTo(bx - 22, by + 11, bx - 30, by + 4);
      c.closePath();
    };
    vol(ctx, elytra, SH[0], SH[1], SH[2], { cel: 3.5, rim: 2, lw: 2.8, grad: [by - 20, by + 11, '#38b484', '#1f7a5e'], tex: (c) => {
      // 虹彩：邊緣透出藍紫
      const g = c.createLinearGradient(bx - 30, by + 10, bx + 20, by - 20);
      g.addColorStop(0, 'rgba(90,70,200,0.4)');
      g.addColorStop(0.35, 'rgba(90,70,200,0)');
      g.addColorStop(0.8, 'rgba(255,240,120,0)');
      g.addColorStop(1, 'rgba(255,240,120,0.2)');
      c.fillStyle = g;
      c.fillRect(bx - 34, by - 22, 60, 36);
      // 縱溝
      c.strokeStyle = 'rgba(8,50,36,0.45)';
      c.lineWidth = 0.9;
      c.beginPath();
      for (let k = 1; k <= 3; k++) {
        c.moveTo(bx + 18, by - 12 + k * 4);
        c.quadraticCurveTo(bx - 4, by - 14 + k * 5.5, bx - 29, by - 2 + k * 3);
      }
      c.stroke();
      speckle(c, bx - 26, by - 14, 44, 20, 22, 17, 'rgba(8,50,36,0.4)', 0.4, 0.8);
      // 中縫
      c.strokeStyle = A.c('#0c3a2a');
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(bx + 20, by - 11);
      c.quadraticCurveTo(bx, by - 7, bx - 29, by - 1);
      c.stroke();
      // 亮帶
      c.fillStyle = 'rgba(210,255,235,0.55)';
      c.beginPath();
      c.ellipse(bx - 10, by - 13, 12, 2.4, 0.12, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.beginPath();
      c.ellipse(bx - 17, by - 12, 3.5, 1.2, 0.2, 0, TAU);
      c.fill();
    } });
    // 前胸背板
    const pro = (c) => {
      c.moveTo(bx + 16, by - 12);
      c.quadraticCurveTo(bx + 26, by - 17, bx + 33, by - 10);
      c.quadraticCurveTo(bx + 36, by, bx + 30, by + 6);
      c.quadraticCurveTo(bx + 22, by + 8, bx + 18, by + 4);
      c.quadraticCurveTo(bx + 21, by - 4, bx + 16, by - 12);
      c.closePath();
    };
    vol(ctx, pro, PRO[0], PRO[1], PRO[2], { cel: 2, rim: 1.4, lw: 2.4, tex: (c) => {
      speckle(c, bx + 18, by - 14, 16, 18, 10, 61, 'rgba(8,50,36,0.4)', 0.4, 0.7);
      c.fillStyle = 'rgba(220,255,240,0.6)';
      c.beginPath();
      c.ellipse(bx + 24, by - 11, 4, 1.4, -0.3, 0, TAU);
      c.fill();
    } });

    legs(true, LEG);

    // 戰鎚：握點在頭前（用角勾著），平常扛在背上（鎚頭在後上方）
    const gx = 28;
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
    // 鎚柄：木紋、皮纏、鐵箍、柄尾尖刺
    vol(ctx, (c) => A.roundRect(c, -9, -2.8, L + 6, 5.6, 2.8), '#a8703e', '#6a4222', '#e0a870', { cel: 1, rim: 0.9, lw: 2.2, tex: (c) => {
      c.strokeStyle = 'rgba(80,44,20,0.5)';
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(8, -1); c.lineTo(L - 10, -1.2);
      c.moveTo(12, 1.2); c.lineTo(L - 12, 1);
      c.stroke();
    } });
    vol(ctx, (c) => A.roundRect(c, -7, -3.2, 12, 6.4, 2), '#6a3e22', '#3e2210', '#a8704a', { cel: 0.8, rim: 0.6, lw: 1.8, tex: (c) => {
      c.strokeStyle = A.c('#2e1808');
      c.lineWidth = 0.9;
      c.beginPath();
      for (let i = 0; i < 5; i++) { c.moveTo(-6 + i * 2.6, -3); c.lineTo(-4.5 + i * 2.6, 3); }
      c.stroke();
    } });
    [8, L - 14].forEach((x) => vol(ctx, (c) => A.roundRect(c, x - 1.6, -3.4, 3.2, 6.8, 1), IRON[0], IRON[1], IRON[2], { cel: 0.6, rim: 0.5, lw: 1.4 }));
    vol(ctx, (c) => { c.moveTo(-9, -3); c.lineTo(-15, 0); c.lineTo(-9, 3); c.closePath(); }, IRON[0], IRON[1], IRON[2], { cel: 0.6, rim: 0.5, lw: 1.8 });
    // 鎚頭：鐵塊＋金包角＋中央的符文槽（發青光）
    const hw = 20;
    const hh = 36;
    if (runeA > 0.5) glow(ctx, L, 0, 30, '110,230,255', (runeA - 0.3) * 0.7);
    const hd = (c) => A.roundRect(c, L - hw / 2, -hh / 2, hw, hh, 3);
    vol(ctx, hd, IRON[0], IRON[1], IRON[2], { cel: 2.4, rim: 1.4, lw: 2.4, grad: [-hh / 2, hh / 2, '#a4aebe', '#6e788a'], tex: (c) => {
      sheen(c, L - hw / 2, -hh / 2, hw, hh * 0.6, 0.45);
      speckle(c, L - hw / 2, -hh / 2, hw, hh, 14, 23, 'rgba(40,46,60,0.35)', 0.3, 0.8);
      c.strokeStyle = 'rgba(30,34,46,0.5)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(L - 8, -12); c.lineTo(L - 5, -10);
      c.moveTo(L + 6, 11); c.lineTo(L + 8, 14);
      c.stroke();
    } });
    [-1, 1].forEach((s) => {
      vol(ctx, (c) => A.roundRect(c, L - hw / 2 - 1.8, s < 0 ? -hh / 2 - 2.2 : hh / 2 - 4.6, hw + 3.6, 6.8, 2), '#e0a844', '#9a6a1e', '#fff0b0', { cel: 0.8, rim: 0.8, lw: 2 });
      [L - hw / 2 + 1.5, L + hw / 2 - 1.5].forEach((x) => rivet(ctx, x, s < 0 ? -hh / 2 + 1.2 : hh / 2 - 1.2, 0.9, '#6a4a1e'));
    });
    ctx.fillStyle = A.c('#1e2430');
    ctx.beginPath();
    A.roundRect(ctx, L - 6.5, -10, 13, 20, 2.5);
    ctx.fill();
    ctx.strokeStyle = A.c('#b4bccc');
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (runeA > 0) glow(ctx, L, 0, 13, '140,240,255', runeA * 0.8);
    rune(ctx, L, 0, 6.5, 3, 'rgba(40,160,220,' + (0.5 + runeA * 0.4).toFixed(2) + ')', 3.4);
    rune(ctx, L, 0, 6.5, 3, A.c(runeA > 0.6 ? '#f0ffff' : '#8aeeff'), 1.6);
    // 符文的光順著溝槽流到兩端
    ctx.fillStyle = 'rgba(160,245,255,' + (runeA * 0.8).toFixed(2) + ')';
    [-13, 13].forEach((y) => { ctx.beginPath(); ctx.arc(L, y, 1.3, 0, TAU); ctx.fill(); });
    ctx.restore();

    // 頭與角（角勾著鎚柄）
    const hx = 31;
    const hy = by - 1 + (wind ? 3 : 0);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(hurt ? -0.2 : strike ? 0.15 : dead ? 0.2 : Math.sin(t * 2) * 0.03);
    // 觸角
    limb(ctx, (c) => { c.moveTo(3, -7); c.quadraticCurveTo(8, -17, 14, -16 + Math.sin(t * 4) * 1.5); }, 3, LEG[0]);
    // 大角：往前上彎、末端分叉，勾住鎚柄
    const horn = (c) => {
      c.moveTo(3, -6);
      c.quadraticCurveTo(13, -10, 16, -24);
      c.lineTo(19.5, -27);
      c.lineTo(18.5, -21);
      c.quadraticCurveTo(19.5, -8, 10, 0);
      c.closePath();
    };
    vol(ctx, horn, '#2e4a3e', '#142820', '#7aa898', { cel: 1.4, rim: 1.1, lw: 2.2, grad: [-27, 0, '#46705e', '#2e4a3e'] });
    const head = (c) => c.ellipse(0, 0, 11, 9, 0, 0, TAU);
    vol(ctx, head, '#2e4a3e', '#142820', '#7aa898', { cel: 2, rim: 1.4, lw: 2.4, tex: (c) => speckle(c, -10, -8, 20, 16, 8, 31, 'rgba(0,20,10,0.35)', 0.4, 0.7) });
    // 大顎
    vol(ctx, (c) => { c.moveTo(7, 4); c.quadraticCurveTo(13, 4, 14, 8.5); c.quadraticCurveTo(10.5, 6.5, 7, 7.5); c.closePath(); }, '#3a2e2a', '#1a1210', null, { cel: 0.6, lw: 1.6 });
    const kind = eyeKind(m);
    const ek = (wind || strike || jump) && kind === 'normal' ? 'angry' : kind;
    const eo = { iris: '#ffe46a', irisD: '#d07a1a', irisK: 0.8, lidCol: '#1e3a30', lid: 0.1, tilt: ek === 'angry' ? 0.6 : 0.15, lw: 1.6 };
    beastEye(ctx, 1, -1.5, 3.6, 4, ek === 'angry' ? 'normal' : ek, eo);
    beastEye(ctx, 7.5, -2, 3.2, 3.6, ek === 'angry' ? 'normal' : ek, eo);
    ctx.restore();

    // 汗滴（扛得好吃力）
    if (walk || wind) {
      const q = (t * 1.5) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      vol(ctx, (c) => {
        const x = 44;
        const y = by - 16 + q * 8;
        c.moveTo(x, y - 5);
        c.quadraticCurveTo(x + 3.5, y, x, y + 2.5);
        c.quadraticCurveTo(x - 3.5, y, x, y - 5);
        c.closePath();
      }, '#bfe8ff', '#7ab8e8', '#ffffff', { cel: 0.8, rim: 0.8, lw: 1.5 });
      ctx.restore();
    }
    ctx.restore();

    // 鎚子砸地的衝擊
    if (strike) {
      const ix = 68;
      glow(ctx, ix, -4, 26, '140,240,255', 0.45);
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
      // 地面裂痕
      ctx.strokeStyle = A.c('#4a2e1f');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ix - 12, 0); ctx.lineTo(ix - 5, -1.5); ctx.lineTo(ix, 0); ctx.lineTo(ix + 6, -1.2); ctx.lineTo(ix + 13, 0);
      ctx.stroke();
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
    const dead = !!m.dead;
    const blow = clamp(fx.blow || (strike ? 1 : 0), 0, 1);
    const FUR = ['#7a5ca2', '#4a3474', '#c4a8ec'];
    const COV = ['#2a7464', '#123e36', '#6ac8b0'];
    const PAGE = ['#fbf1d4', '#d8c498', '#ffffff'];
    const GOLD = ['#f0c64a', '#a8781e', '#fff2b0'];
    const flap = blow > 0.3 ? Math.sin(t * 22) * 0.35 : Math.sin(t * 9);
    const by = -30 + Math.sin(t * 9 + 1) * 2.5;
    const hot = blow > 0.2 || wind;
    ctx.save();
    if (hurt) ctx.rotate(-0.15);
    if (hot) glow(ctx, 8, by - 4, 46, '90,240,180', 0.12 + blow * 0.15);

    // 書籤緞帶（從書背垂下來，當作尾巴，末端剪成燕尾）
    const rs = Math.sin(t * 4) * 3;
    vol(ctx, (c) => {
      c.moveTo(-5, by + 8);
      c.quadraticCurveTo(-9 + rs * 0.5, by + 18, -8 + rs, by + 28);
      c.lineTo(-5.5 + rs, by + 25);
      c.lineTo(-3 + rs, by + 28.5);
      c.quadraticCurveTo(-3 + rs * 0.5, by + 18, -1, by + 8);
      c.closePath();
    }, '#e04858', '#9a2234', '#ff9aa8', { cel: 1, rim: 0.8, lw: 1.8 });

    // 魔導書翅膀：書背在肩膀，往外攤開；翅骨沿著封面伸出去、末端一根小爪
    const wing = (side, back) => {
      ctx.save();
      ctx.translate(side * 7, by - 6);
      ctx.scale(side, 1);
      ctx.rotate(-0.5 + flap * 0.42 + (back ? -0.18 : 0));
      if (back) ctx.scale(0.9, 0.9);
      const L = 31;
      const H = 13.5;
      const leaf = (c, dx, dy, l, h) => {
        c.moveTo(dx, dy - h);
        c.quadraticCurveTo(dx + l * 0.5, dy - h - 4, dx + l, dy - h + 1);
        c.lineTo(dx + l, dy + h - 1);
        c.quadraticCurveTo(dx + l * 0.5, dy + h + 2, dx, dy + h);
        c.closePath();
      };
      // 翅膜：封面下緣垂著一片蝙蝠翼膜（三道弧）
      vol(ctx, (c) => {
        c.moveTo(0, H - 2);
        c.lineTo(L + 2, H - 2);
        c.quadraticCurveTo(L - 3, H + 3, L - 8, H + 6);
        c.quadraticCurveTo(L - 12, H + 3, L - 17, H + 7);
        c.quadraticCurveTo(L - 21, H + 3, L - 26, H + 6);
        c.quadraticCurveTo(-2, H + 3, 0, H - 2);
        c.closePath();
      }, '#5a3c7c', '#3a2456', null, { cel: 1, lw: 1.8 });
      // 封面（皮革壓紋、金色包角、書背的突起橫帶）
      const cover = (c) => leaf(c, -1, 0, L + 3, H + 2);
      vol(ctx, cover, COV[0], COV[1], COV[2], { cel: 2, rim: 1.3, lw: 2.4, tex: (c) => {
        speckle(c, -1, -H - 4, L + 4, H * 2 + 6, 18, 71, 'rgba(0,30,24,0.3)', 0.4, 0.9);
        c.strokeStyle = 'rgba(0,30,24,0.45)';
        c.lineWidth = 1;
        c.beginPath();
        leaf(c, 3, 0, L - 6, H - 3);
        c.stroke();
        c.fillStyle = A.c('#1a4e44');
        c.fillRect(-1, -H - 3, 4, H * 2 + 6);
        c.fillStyle = A.c(GOLD[0]);
        [-H * 0.55, 0, H * 0.55].forEach((y) => c.fillRect(-1, y - 1, 4, 2));
      } });
      ctx.fillStyle = A.c(GOLD[0]);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.4;
      [-1, 1].forEach((sy) => {
        ctx.beginPath();
        ctx.moveTo(L + 2, sy * (H + 1) - sy * 0.5);
        ctx.lineTo(L + 2, sy * (H + 1) - sy * 7);
        ctx.quadraticCurveTo(L - 1, sy * (H + 1) - sy * 3, L - 5, sy * (H + 1) + (sy < 0 ? -2.5 : 1.5));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      if (back) {
        // 後翅只看得到封面：中央一個燙金的風紋徽記
        glow(ctx, L * 0.52, 0, 10, '255,220,120', hot ? 0.5 : 0.2);
        ctx.lineCap = 'round';
        const sig = () => {
          ctx.beginPath();
          ctx.arc(L * 0.52, 0, 5.5, PI * 0.2, PI * 1.7);
          ctx.moveTo(L * 0.52 - 7, 4);
          ctx.quadraticCurveTo(L * 0.52, 8, L * 0.52 + 8, 3);
          ctx.moveTo(L * 0.52 - 6, -6);
          ctx.quadraticCurveTo(L * 0.52 + 2, -9, L * 0.52 + 7, -5);
        };
        sig();
        ctx.strokeStyle = A.c(GOLD[1]);
        ctx.lineWidth = 2.6;
        ctx.stroke();
        sig();
        ctx.strokeStyle = A.c(GOLD[2]);
        ctx.lineWidth = 1.1;
        ctx.stroke();
      } else {
        // 前翅：一疊書頁（側邊露出頁緣細線），最上面那頁寫滿風咒
        vol(ctx, (c) => leaf(c, 1, 1.5, L - 1, H - 1), PAGE[1], '#b8a070', null, { cel: 0.8, lw: 1.5, tex: (c) => {
          c.strokeStyle = 'rgba(120,90,50,0.45)';
          c.lineWidth = 0.6;
          c.beginPath();
          for (let k = 0; k < 3; k++) { c.moveTo(3, H - 2 + k * 0.9); c.lineTo(L - 1, H - 2.5 + k * 0.9); }
          c.stroke();
        } });
        const pg = (c) => leaf(c, 1, 0, L - 2, H - 1.5);
        vol(ctx, pg, PAGE[0], PAGE[1], PAGE[2], { cel: 1.2, rim: 0.8, lw: 1.9, grad: [-H, H, '#fffaea', '#f0e2bc'], tex: (c) => {
          if (hot) glow(c, L * 0.5, 0, 20, '80,240,180', 0.35 + blow * 0.35);
          // 裝飾框線與行線
          c.strokeStyle = 'rgba(150,110,60,0.35)';
          c.lineWidth = 0.7;
          c.beginPath();
          leaf(c, 3.5, 0, L - 7, H - 4);
          c.stroke();
          const rc = hot ? '#1ab888' : '#4a8a78';
          for (let r = 0; r < 3; r++) {
            for (let j = 0; j < 4; j++) {
              rune(c, 7 + j * 5.8, -6.2 + r * 6.2, 2, r * 4 + j * 3 + 1, A.c(rc), 1.2);
            }
          }
          if (hot) {
            for (let r = 0; r < 3; r++) {
              for (let j = 0; j < 4; j++) {
                if ((r * 4 + j + Math.floor(t * 8)) % 3) continue;
                rune(c, 7 + j * 5.8, -6.2 + r * 6.2, 2, r * 4 + j * 3 + 1, 'rgba(220,255,240,0.95)', 0.8);
              }
            }
          }
        } });
        // 吹風時一頁一頁翻過去
        if (blow > 0.2) {
          for (let k = 0; k < 2; k++) {
            const q = (t * 3 + k * 0.5) % 1;
            ctx.save();
            ctx.scale(Math.cos(q * PI), 1);
            vol(ctx, (c) => leaf(c, 0, -0.5, L - 3, H - 2.5), '#fffaf0', PAGE[1], null, { cel: 0.8, lw: 1.5, tex: (c) => rune(c, L * 0.5, 0, 3, k + 2, 'rgba(26,184,136,0.8)', 1.2) });
            ctx.restore();
          }
        }
      }
      // 翅骨＋小爪（翅膀頂端、書背上方）
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(1, -H - 1);
      ctx.quadraticCurveTo(0, -H - 6, -3, -H - 6);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.strokeStyle = A.c('#e8dcc8');
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    };
    wing(-1, true);
    wing(1, false);

    // 小腳爪
    limb(ctx, (c) => { c.moveTo(-4, by + 12); c.lineTo(-5, by + 19); c.moveTo(4, by + 12); c.lineTo(5, by + 19); }, 4, '#4a3460');
    ctx.strokeStyle = A.c('#e8dcc8');
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    [-5, 5].forEach((x) => { ctx.moveTo(x - 1.5, by + 19.5); ctx.lineTo(x - 2.5, by + 21); ctx.moveTo(x + 1, by + 19.5); ctx.lineTo(x + 1.5, by + 21); });
    ctx.stroke();

    // 身體（毛茸茸）
    const puffC = 1 + blow * 0.12;
    const fluff = (c) => {
      const n = 14;
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
    // 大耳朵：內側粉紅翼膜＋血管
    const ear = (x, s) => {
      const tipY = by - 28 + (blow > 0.5 ? 3 : 0);
      vol(ctx, (c) => { c.moveTo(x - 5, by - 11); c.quadraticCurveTo(x - 4 + s * 2, by - 22, x + s * 2, tipY); c.quadraticCurveTo(x + 5, by - 20, x + 6, by - 10); c.closePath(); }, FUR[0], FUR[1], FUR[2], { cel: 1.4, rim: 1, lw: 2.2, tex: (c) => {
        c.fillStyle = A.c('#e8a0c0');
        c.beginPath();
        c.moveTo(x - 2.5, by - 11); c.quadraticCurveTo(x - 1.5 + s * 2, by - 20, x + s * 2 + 0.3, tipY + 4); c.quadraticCurveTo(x + 3, by - 18, x + 3.5, by - 11);
        c.fill();
        c.strokeStyle = 'rgba(180,70,110,0.6)';
        c.lineWidth = 0.6;
        c.beginPath();
        c.moveTo(x + 0.5, by - 12); c.lineTo(x + s * 1.2 + 0.4, by - 20);
        c.stroke();
      } });
    };
    ear(-7, -1);
    ear(6, 1);
    vol(ctx, fluff, FUR[0], FUR[1], FUR[2], { cel: 2.6, rim: 1.6, lw: 2.4, grad: [by - 15, by + 15, '#8a6cb4', '#6a4e92'], tex: (c) => {
      // 毛流
      c.strokeStyle = 'rgba(40,20,70,0.35)';
      c.lineWidth = 0.9;
      c.lineCap = 'round';
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = hash(i + 3) * TAU;
        const r = 5 + hash(i + 9) * 9;
        const x = Math.cos(a) * r;
        const y = by + Math.sin(a) * r;
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2 + 0.6);
      }
      c.stroke();
      // 淺色胸毛
      c.fillStyle = A.c('#b89ad8');
      c.beginPath();
      c.moveTo(-6, by + 3);
      c.quadraticCurveTo(-5, by + 13, 1, by + 13);
      c.quadraticCurveTo(8, by + 13, 9, by + 3);
      c.lineTo(7, by + 5); c.lineTo(5, by + 2); c.lineTo(3, by + 5); c.lineTo(1, by + 2); c.lineTo(-1, by + 5); c.lineTo(-3, by + 2); c.lineTo(-4.5, by + 5);
      c.closePath();
      c.fill();
    } });
    // 胸前掛著一枚風之符石
    ctx.strokeStyle = A.c(GOLD[1]);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-5, by + 3);
    ctx.quadraticCurveTo(1, by + 8, 8, by + 3);
    ctx.stroke();
    if (hot) glow(ctx, 1.5, by + 8.5, 7, '90,240,180', 0.7);
    vol(ctx, (c) => { c.moveTo(1.5, by + 5.5); c.lineTo(4, by + 8.5); c.lineTo(1.5, by + 11.5); c.lineTo(-1, by + 8.5); c.closePath(); }, hot ? '#8affd0' : '#3ab890', '#1a7a5e', '#e0fff4', { cel: 0.6, rim: 0.6, lw: 1.3 });

    // 臉：吹風時鼓起腮幫子、嘟成 O 形嘴
    const fxX = 5;
    const fy = by - 3;
    const kind = eyeKind(m);
    const ek = (blow > 0.5 || wind) && kind === 'normal' ? 'angry' : kind;
    const eo = { iris: hot ? '#c8ffe8' : '#8ae8c0', irisD: hot ? '#1ab888' : '#2a7a64', irisK: 0.85, lidCol: FUR[1], lid: 0.05, tilt: ek === 'angry' ? 0.5 : 0, lw: 1.7, glowRgb: blow > 0.5 ? '90,240,180' : null };
    beastEye(ctx, fxX - 5.5, fy - 3, 3.4, 4.1, ek === 'angry' ? 'normal' : ek, eo);
    beastEye(ctx, fxX + 4, fy - 3.5, 3.2, 3.9, ek === 'angry' ? 'normal' : ek, eo);
    // 鼻葉
    vol(ctx, (c) => { c.moveTo(fxX - 1.8, fy + 3.2); c.quadraticCurveTo(fxX - 2.4, fy + 0.5, fxX - 0.7, fy - 0.2); c.quadraticCurveTo(fxX + 1, fy + 0.5, fxX + 0.4, fy + 3.2); c.closePath(); }, '#e8a0b8', '#b86a88', null, { cel: 0.5, lw: 1.2 });
    if (blow > 0.2) {
      vol(ctx, (c) => c.ellipse(fxX - 8, fy + 5, 4.5 * puffC, 3.8 * puffC, 0, 0, TAU), '#9a7ec4', '#6a4e92', '#d4c0f0', { cel: 0.8, rim: 0.8, lw: 1.8 });
      vol(ctx, (c) => c.ellipse(fxX + 7.5, fy + 5, 3.6 * puffC, 3.4 * puffC, 0, 0, TAU), '#9a7ec4', '#6a4e92', '#d4c0f0', { cel: 0.8, rim: 0.8, lw: 1.8 });
      A.ellipse(ctx, fxX - 0.5, fy + 7, 2.4, 2.6, '#5a1a2e', null, { lw: 1.6, hl: false });
    } else {
      A.blush(ctx, fxX - 9, fy + 3.5, 2.4);
      A.blush(ctx, fxX + 8, fy + 3, 2);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fxX - 4, fy + 5.5);
      ctx.quadraticCurveTo(fxX - 0.7, fy + 7.6, fxX + 2.6, fy + 5.3);
      ctx.stroke();
      ctx.fillStyle = A.c('#ffffff');
      ctx.lineWidth = 1;
      [fxX - 2.8, fxX + 1.4].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x - 0.9, fy + 6.6);
        ctx.lineTo(x, fy + 9);
        ctx.lineTo(x + 0.9, fy + 6.4);
        ctx.fill();
        ctx.stroke();
      });
    }
    // 吐出的咒風：綠色風線夾著符文
    if (blow > 0.05 && !dead) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const q = (t * 3 + i / 4) % 1;
        const x = fxX + 12 + q * 44 * (0.5 + blow);
        const y = fy + 6 + (i - 1.5) * 5 * (0.4 + q);
        ctx.globalAlpha = ba * (1 - q) * blow;
        ctx.strokeStyle = 'rgba(40,140,110,0.5)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 6 + blow * 4, y - 3, x + 10 + blow * 8, y);
        ctx.stroke();
        ctx.strokeStyle = A.c(i % 2 ? '#e0fff4' : '#8af4cc');
        ctx.lineWidth = 2;
        ctx.stroke();
        if (i % 2) {
          glow(ctx, x + 6, y - 6, 6, '120,255,200', 0.5);
          rune(ctx, x + 6, y - 6, 2.4, i + Math.floor(t * 3), A.c('#d8fff0'), 1.3);
        }
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
    const dead = !!m.dead;
    const walk = walking(m);
    const charge = !!fx.charge || strike;
    const ST = ['#cfd6e2', '#838ea2', '#ffffff'];
    const STD = '#5a6478';
    const GOLD = ['#f2c24a', '#a8741e', '#fff2b0'];
    const CL = ['#c8323e', '#7e1a24', '#ff8a90'];
    const GOAT = ['#f5eee0', '#c8b89a', '#ffffff'];
    const HORN = ['#a08a72', '#5e4a38', '#e0cdb4'];
    const run = charge && walk;
    const step = walk ? Math.sin(t * (run ? 20 : 11)) : 0;
    ctx.save();
    contact(ctx, 0, 0, 38, 0.35);
    if (charge) ctx.rotate(0.06);
    if (wind) ctx.rotate(-0.07);
    if (hurt) ctx.rotate(-0.1);
    const bob = walk ? -Math.abs(step) * 2 : Math.sin(t * 2.4) * 0.6;
    const cy = -32 + bob;
    if (charge) glow(ctx, 30, cy - 10, 40, '255,220,160', 0.2);

    // 腳：白毛大腿＋鋼護脛（有膝甲）＋鐵靴
    const leg = (x, s, near) => {
      const lift = Math.max(0, s) * 4;
      const fx2 = x + s * 3;
      limb(ctx, (c) => { c.moveTo(x, cy + 10); c.lineTo(fx2, -5 - lift); }, 8, near ? GOAT[0] : GOAT[1]);
      const P = near ? ST : ['#9aa4b8', '#5e687c', '#c8d0de'];
      vol(ctx, (c) => A.roundRect(c, fx2 - 4.4, -17 - lift, 8.8, 11, 3), P[0], P[1], P[2], { cel: 1.2, rim: 0.9, lw: 2, tex: (c) => sheen(c, fx2 - 4.4, -17 - lift, 8.8, 11, 0.4) });
      vol(ctx, (c) => c.ellipse(fx2, -17 - lift, 4.2, 2.6, 0, 0, TAU), GOLD[0], GOLD[1], GOLD[2], { cel: 0.6, rim: 0.5, lw: 1.6 });
      vol(ctx, (c) => { c.moveTo(fx2 - 4.8, -lift); c.lineTo(fx2 - 4.4, -7 - lift); c.lineTo(fx2 + 3.5, -7 - lift); c.quadraticCurveTo(fx2 + 6.5, -4 - lift, fx2 + 6, -lift); c.closePath(); }, '#5a6272', '#343a48', '#9aa4b6', { cel: 0.8, rim: 0.7, lw: 2 });
    };
    leg(-16, -step, false);
    leg(10, step, false);
    if (wind) dust(ctx, 14, 0, t, 1);

    // 尾巴（從鎧甲後面冒出的一撮毛）
    vol(ctx, (c) => { c.moveTo(-30, cy - 6); c.quadraticCurveTo(-41, cy - 14 + Math.sin(t * 6) * 2, -37, cy - 1); c.closePath(); }, GOAT[0], GOAT[1], GOAT[2], { cel: 1, rim: 0.8, lw: 2 });

    // 身甲：圓滾滾的鋼板（一片片的甲片、金色包邊、鉚釘），下緣垂著紅色馬衣（金邊＋流蘇＋盾徽）
    const barrel = (c) => {
      c.moveTo(-30, cy - 8);
      c.bezierCurveTo(-32, cy - 23, -12, cy - 24, 6, cy - 21);
      c.bezierCurveTo(24, cy - 19, 30, cy - 10, 30, cy);
      c.bezierCurveTo(30, cy + 12, 20, cy + 18, 0, cy + 18);
      c.bezierCurveTo(-18, cy + 18, -32, cy + 12, -30, cy - 8);
      c.closePath();
    };
    vol(ctx, barrel, ST[0], ST[1], ST[2], { cel: 4, rim: 2, lw: 2.8, grad: [cy - 24, cy + 6, '#e4eaf2', '#a8b2c4'], tex: (c) => {
      // 甲片（每片的下緣有陰影、上緣有亮線）
      [-17, -1, 14].forEach((x, i) => {
        c.fillStyle = 'rgba(40,50,70,0.18)';
        c.beginPath();
        c.moveTo(x, cy - 26);
        c.quadraticCurveTo(x + 5, cy - 8, x + 1, cy + 8);
        c.lineTo(x - 3, cy + 8);
        c.quadraticCurveTo(x + 1, cy - 8, x - 4, cy - 26);
        c.closePath();
        c.fill();
        c.strokeStyle = A.c(STD);
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(x, cy - 26);
        c.quadraticCurveTo(x + 5, cy - 8, x + 1, cy + 8);
        c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.7)';
        c.lineWidth = 0.9;
        c.beginPath();
        c.moveTo(x + 1.5, cy - 26);
        c.quadraticCurveTo(x + 6.5, cy - 8, x + 2.5, cy + 8);
        c.stroke();
      });
      sheen(c, -30, cy - 26, 26, 22, 0.55);
      // 背脊的金色飾條
      c.strokeStyle = A.c(GOLD[1]);
      c.lineWidth = 3.4;
      c.beginPath();
      c.moveTo(-30, cy - 9);
      c.bezierCurveTo(-31, cy - 22, -12, cy - 23, 6, cy - 20);
      c.bezierCurveTo(22, cy - 18, 28, cy - 11, 29, cy - 4);
      c.stroke();
      c.strokeStyle = A.c(GOLD[0]);
      c.lineWidth = 1.8;
      c.stroke();
      // 馬衣
      const cl = (q) => {
        q.moveTo(-40, cy + 4);
        q.quadraticCurveTo(0, cy + 8, 40, cy + 2);
        q.lineTo(40, cy + 30);
        q.lineTo(-40, cy + 30);
        q.closePath();
      };
      vol(c, cl, CL[0], CL[1], null, { cel: 2.5, noStroke: true, tex: (q) => {
        // 菱格紋
        q.strokeStyle = 'rgba(90,10,20,0.35)';
        q.lineWidth = 0.8;
        q.beginPath();
        for (let x = -40; x < 44; x += 7) { q.moveTo(x, cy + 6); q.lineTo(x + 12, cy + 20); q.moveTo(x + 12, cy + 6); q.lineTo(x, cy + 20); }
        q.stroke();
        q.fillStyle = 'rgba(255,200,120,0.5)';
        for (let x = -34; x < 40; x += 7) { q.beginPath(); q.arc(x, cy + 13, 0.7, 0, TAU); q.fill(); }
      } });
      c.strokeStyle = A.c(GOLD[1]);
      c.lineWidth = 3.8;
      c.beginPath();
      c.moveTo(-40, cy + 4);
      c.quadraticCurveTo(0, cy + 8, 40, cy + 2);
      c.stroke();
      c.strokeStyle = A.c(GOLD[0]);
      c.lineWidth = 2;
      c.stroke();
      [-18, -6, 6, 18].forEach((x) => rivet(c, x, cy + 5.6 - x * 0.03, 1, '#8a5a14'));
      // 下緣的金流蘇
      c.strokeStyle = A.c(GOLD[0]);
      c.lineWidth = 1.2;
      c.beginPath();
      for (let x = -28; x <= 28; x += 3) {
        const yb = cy + 15.5 - Math.abs(x) * 0.03;
        c.moveTo(x, yb);
        c.lineTo(x + Math.sin(t * 6 + x) * (walk ? 0.8 : 0.3), yb + 3);
      }
      c.stroke();
    } });
    // 馬衣上的盾徽（金邊、紅底、白色山羊角紋）
    vol(ctx, (c) => { c.moveTo(-5, cy + 7.5); c.lineTo(5, cy + 7.5); c.lineTo(5, cy + 12); c.quadraticCurveTo(0, cy + 17, -5, cy + 12); c.closePath(); }, GOLD[0], GOLD[1], GOLD[2], { cel: 0.8, rim: 0.7, lw: 1.5, tex: (c) => {
      c.fillStyle = A.c('#3a4a8a');
      c.beginPath();
      c.moveTo(-3.4, cy + 8.8); c.lineTo(3.4, cy + 8.8); c.lineTo(3.4, cy + 11.8); c.quadraticCurveTo(0, cy + 15.3, -3.4, cy + 11.8); c.closePath();
      c.fill();
      c.strokeStyle = A.c('#fff4d8');
      c.lineWidth = 0.9;
      c.beginPath();
      c.arc(-1, cy + 11, 1.6, PI * 0.9, PI * 2.2);
      c.arc(1, cy + 11, 1.6, PI * 0.8, PI * 2.1, true);
      c.stroke();
    } });
    // 受傷時的刮痕／凹痕
    if (hurt || dead) {
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
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-7, cy - 19.5);
      ctx.lineTo(-10, cy - 12.5);
      ctx.stroke();
    }

    leg(-10, step, true);
    leg(16, -step, true);

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
    const dx = hx - 3 - mx;
    const dy = hy + 4 - my;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    limb(ctx, (c) => { c.moveTo(mx, my); c.lineTo(hx - 3, hy + 4); }, 15, ST[1]);
    ctx.save();
    ctx.translate(-1.2, -1.2);
    ctx.strokeStyle = A.c(ST[0]);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(hx - 3, hy + 4);
    ctx.stroke();
    ctx.restore();
    ctx.lineCap = 'round';
    [0.25, 0.5, 0.75].forEach((q) => {
      const px = mx + dx * q;
      const py = my + dy * q;
      ctx.strokeStyle = A.c(STD);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px - nx * 6, py - ny * 6);
      ctx.lineTo(px + nx * 6, py + ny * 6);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px - nx * 5 + dx / len * 1.4, py - ny * 5 + dy / len * 1.4);
      ctx.lineTo(px + nx * 5 + dx / len * 1.4, py + ny * 5 + dy / len * 1.4);
      ctx.stroke();
    });
    // 肩甲：三片重疊的甲片＋金邊
    for (let i = 2; i >= 0; i--) {
      vol(ctx, (c) => c.ellipse(mx - 1 - i * 1.5, my + 3 + i * 3.2, 11 - i * 1.2, 6.5 - i * 0.8, -0.3, 0, TAU), ST[0], ST[1], ST[2], { cel: 1.4, rim: 1, lw: 2.2, tex: (c) => {
        c.strokeStyle = A.c(GOLD[0]);
        c.lineWidth = 1.6;
        c.beginPath();
        c.ellipse(mx - 1 - i * 1.5, my + 3 + i * 3.2, 9.5 - i * 1.2, 5 - i * 0.8, -0.3, 0.05 * PI, 0.95 * PI);
        c.stroke();
      } });
    }
    rivet(ctx, mx - 4, my - 0.5, 1.2, STD);

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(hr);
    // 捲角：粗壯、有一圈圈的環紋
    const hornP = (c) => {
      c.moveTo(-3, -6);
      c.bezierCurveTo(-10, -19, -24, -15, -21, -3);
      c.bezierCurveTo(-19, 3, -12, 2, -13, -4);
      c.bezierCurveTo(-14, -9, -8, -10, 3, -2);
      c.closePath();
    };
    const hornRings = (c) => {
      c.strokeStyle = A.c(HORN[1]);
      c.lineWidth = 1.2;
      c.lineCap = 'round';
      c.beginPath();
      [[-5, -11, -2, -6], [-9, -14, -7, -8], [-13, -15, -12, -9], [-17, -14, -14.5, -8.5], [-20.5, -10, -16, -6.5], [-21.5, -5, -16.5, -4]].forEach(([a, b, d, e]) => { c.moveTo(a, b); c.lineTo(d, e); });
      c.stroke();
    };
    vol(ctx, hornP, '#7a6654', '#4a3a2a', null, { cel: 1, lw: 2.2, tex: hornRings });
    // 臉（長臉，吻部朝右下）
    const face = (c) => {
      c.moveTo(-8, -4);
      c.bezierCurveTo(-8, -13, 6, -14, 10, -5);
      c.bezierCurveTo(14, 2, 18, 6, 16, 10);
      c.bezierCurveTo(13, 14, 4, 13, -2, 8);
      c.bezierCurveTo(-7, 5, -8, 1, -8, -4);
      c.closePath();
    };
    vol(ctx, face, GOAT[0], GOAT[1], GOAT[2], { cel: 2, rim: 1.2, lw: 2.4, tex: (c) => {
      c.strokeStyle = 'rgba(160,140,110,0.4)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(9, 3); c.lineTo(11, 6);
      c.moveTo(6, 5); c.lineTo(8, 8.5);
      c.stroke();
      c.fillStyle = A.c('#e8d8c0');
      c.beginPath();
      c.ellipse(13, 8, 5, 4, 0.5, 0, TAU);
      c.fill();
    } });
    // 山羊鬍
    vol(ctx, (c) => { c.moveTo(7, 11); c.quadraticCurveTo(8, 20, 4 + Math.sin(t * 3) * 1.5, 23); c.quadraticCurveTo(3, 18, 0.5, 21 + Math.sin(t * 3 + 1)); c.quadraticCurveTo(1, 15, 0, 10); c.closePath(); }, GOAT[0], GOAT[1], GOAT[2], { cel: 1, rim: 0.7, lw: 1.9 });
    vol(ctx, (c) => c.ellipse(15, 7, 2.6, 2, 0.3, 0, TAU), '#e8a0a0', '#b86a6a', null, { cel: 0.5, lw: 1.4 });
    ctx.fillStyle = A.c('#6a3a3a');
    ctx.beginPath();
    ctx.ellipse(16, 7.5, 0.8, 0.5, 0.3, 0, TAU);
    ctx.fill();
    // 頭盔：鋼盔蓋住額頭與後腦、中脊、頰甲，金色盔緣
    const helm = (c) => {
      c.moveTo(-11, 2);
      c.bezierCurveTo(-13, -11, -3, -18, 5, -16.5);
      c.bezierCurveTo(11, -15, 14, -11, 13.5, -7);
      c.quadraticCurveTo(4, -9.5, -2, -5.5);
      c.quadraticCurveTo(-6, -2, -11, 2);
      c.closePath();
    };
    vol(ctx, helm, ST[0], ST[1], ST[2], { cel: 1.6, rim: 1.2, lw: 2.4, grad: [-17, 2, '#eef2f8', '#a0aabc'], tex: (c) => {
      sheen(c, -12, -18, 14, 14, 0.6);
      c.strokeStyle = A.c(STD);
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(-8, -3); c.quadraticCurveTo(-4, -14, 6, -16);
      c.stroke();
      rivet(c, -6, -2.5, 0.9, STD);
      rivet(c, 10, -10, 0.9, STD);
    } });
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(13.5, -7);
    ctx.quadraticCurveTo(4, -9.5, -2, -5.5);
    ctx.quadraticCurveTo(-6, -2, -11, 2);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4.4;
    ctx.stroke();
    ctx.strokeStyle = A.c(GOLD[0]);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = A.c(GOLD[2]);
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // 羽飾：插在頭盔頂，平常輕輕擺，衝撞時往後飄（羽枝一根根）
    const fl = Math.sin(t * (charge ? 14 : 3)) * (charge ? 2.5 : 1.5);
    const pb = charge ? -8 : wind ? 2 : 0;
    const plume = (c) => {
      c.moveTo(-1, -16);
      c.bezierCurveTo(-3, -28 - pb * 0.3, -12 + pb, -31 + fl, -22 + pb * 1.5, -26 + fl * 1.5);
      c.quadraticCurveTo(-18 + pb, -25 + fl, -17 + pb, -23 + fl);
      c.quadraticCurveTo(-15 + pb, -23 + fl, -14 + pb * 0.8, -21 + fl);
      c.quadraticCurveTo(-8, -20, 3, -15.5);
      c.closePath();
    };
    vol(ctx, plume, CL[0], CL[1], CL[2], { cel: 1.4, rim: 1, lw: 2.1, tex: (c) => {
      c.strokeStyle = 'rgba(100,10,20,0.45)';
      c.lineWidth = 0.8;
      c.beginPath();
      for (let i = 1; i < 6; i++) {
        const q = i / 6;
        const x = -1 + (-20 + pb * 1.4) * q;
        const y = -17 - q * 9 + fl * q;
        c.moveTo(x, y);
        c.lineTo(x - 2, y + 4);
      }
      c.stroke();
    } });
    ctx.strokeStyle = A.c('#ffd0d4');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(-8, -25 + fl * 0.5, -17 + pb, -25 + fl);
    ctx.stroke();
    vol(ctx, (c) => c.ellipse(1, -16, 2.8, 2.1, 0, 0, TAU), GOLD[0], GOLD[1], GOLD[2], { cel: 0.5, rim: 0.5, lw: 1.4 });
    // 前耳（從頭盔下露出來）
    vol(ctx, (c) => c.ellipse(-6, 1, 7.5, 3.4, 0.6, 0, TAU), GOAT[0], GOAT[1], GOAT[2], { cel: 0.8, rim: 0.6, lw: 2, tex: (c) => {
      c.fillStyle = A.c('#f0b8b0');
      c.beginPath();
      c.ellipse(-6, 1, 4.5, 1.6, 0.6, 0, TAU);
      c.fill();
    } });
    // 前角（從頭盔側面穿出，有節紋）
    ctx.save();
    ctx.translate(3, -1);
    vol(ctx, hornP, HORN[0], HORN[1], HORN[2], { cel: 1.4, rim: 1, lw: 2.4, grad: [-18, 2, '#c4ae94', '#8a745e'], tex: hornRings });
    ctx.restore();
    // 山羊的橫長瞳孔（琥珀色）
    const kind = eyeKind(m);
    const ex = 5;
    const ey = -2.5;
    if (kind === 'x' || kind === 'hurt' || kind === 'closed') {
      beastEye(ctx, ex, ey, 3, 3.2, kind);
    } else {
      ctx.beginPath();
      ctx.ellipse(ex, ey, 4.3, 4.3, 0, 0, TAU);
      ctx.fillStyle = A.c('#f6d060');
      ctx.fill();
      ctx.save();
      ctx.clip();
      const g = ctx.createRadialGradient(ex, ey + 1.5, 0.5, ex, ey, 4.3);
      g.addColorStop(0, A.c('#ffe89a'));
      g.addColorStop(1, A.c('#c8861e'));
      ctx.fillStyle = g;
      ctx.fillRect(ex - 5, ey - 5, 10, 10);
      ctx.fillStyle = A.c('#1a0e0a');
      ctx.beginPath();
      A.roundRect(ctx, ex - 2.6, ey - 1.1, 6, 2.4, 1);
      ctx.fill();
      ctx.fillStyle = 'rgba(40,20,20,0.3)';
      ctx.fillRect(ex - 5, ey - 5, 10, 3.2);
      if (charge || wind || kind === 'angry') {
        ctx.fillStyle = A.c(GOAT[1]);
        ctx.beginPath();
        ctx.moveTo(ex - 5, ey - 5);
        ctx.lineTo(ex + 5, ey - 5);
        ctx.lineTo(ex + 5, ey - 1.8);
        ctx.lineTo(ex - 5, ey - 4.2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 1.4, ey - 2, 1, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ex, ey, 4.3, 4.3, 0, 0, TAU);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.stroke();
      if (charge || wind || kind === 'angry') {
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
    red: { rim: '#ffb8a0', dot: '#ff9a6a', body: '#ec5236', shade: '#a82a20', belly: '#ffc488', crest: '#ffcf4a', mark: '#ffb040', sigil: '#fff0a0' },
    blue: { rim: '#c0e8ff', dot: '#8ac4ff', body: '#3f8ee0', shade: '#24569e', belly: '#b8e0ff', crest: '#7ad8ff', mark: '#9ad4ff', sigil: '#e8f8ff' },
    yellow: { rim: '#fffbe0', dot: '#fff0a0', body: '#f7c93a', shade: '#c88a18', belly: '#fff6c0', crest: '#fffbe0', mark: '#fff0a0', sigil: '#ffffff' },
    green: { rim: '#d0f4b0', dot: '#a8e080', body: '#6cc05a', shade: '#3e8438', belly: '#dcf2a8', crest: '#a8e070', mark: '#4a9440', sigil: null },
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
      const fx0 = x + 2 + s * 2;
      const fy0 = -2.5 - lift;
      // 夾子腳：前後兩瓣
      vol(ctx, (c) => c.ellipse(fx0 + 2.2, fy0, 2.8, 2.2, 0.3, 0, TAU), col, P.shade, null, { cel: 0.6, lw: 1.8 });
      vol(ctx, (c) => c.ellipse(fx0 - 1.8, fy0 + 0.2, 2.6, 2, -0.3, 0, TAU), col, P.shade, null, { cel: 0.6, lw: 1.8 });
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
    ctx.strokeStyle = A.c(P.shade);
    ctx.lineWidth = 5.5;
    ctx.stroke();
    ctx.translate(-0.8, -0.8);
    ctx.strokeStyle = A.c(P.body);
    ctx.lineWidth = 3.8;
    ctx.stroke();
    ctx.setLineDash([1.6, 3.2]);
    ctx.strokeStyle = A.c(P.shade);
    ctx.lineWidth = 3.8;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(-0.4, -0.4);
    ctx.strokeStyle = A.c(P.rim);
    ctx.lineWidth = 1;
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
    vol(ctx, body, P.body, P.shade, P.rim, { cel: 3, rim: 1.8, lw: 2.6, noStroke: true, grad: [by - 16, by + 12, mixq(P.body, '#ffffff', 0.12), P.body] });
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    // 顆粒狀的鱗皮
    speckle(ctx, -27, by - 17, 50, 28, 40, 11, P.dot, 0.5, 1.2);
    speckle(ctx, -27, by - 17, 50, 28, 26, 77, 'rgba(0,0,0,0.16)', 0.5, 1.1);
    A.ellipse(ctx, 0, by + 12, 22, 6, P.belly, null, { noStroke: true, hl: false });
    ctx.strokeStyle = A.c(mixq(P.belly, P.shade, 0.35));
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = -18; i <= 16; i += 3.5) { ctx.moveTo(i, by + 7.5); ctx.lineTo(i + 0.5, by + 12); }
    ctx.stroke();
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
    outlineOf(ctx, body, 2.6);
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
    vol(ctx, head, P.body, P.shade, P.rim, { cel: 2.2, rim: 1.5, lw: 2.6, tex: (c) => {
      speckle(c, -14, -22, 34, 32, 22, 19, P.dot, 0.5, 1.1);
      // 頭冠的稜線
      c.strokeStyle = A.c(P.shade);
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(-4, -20); c.quadraticCurveTo(-8, -10, -9, 3);
      c.moveTo(-1, -17); c.quadraticCurveTo(3, -13, 9, -9);
      c.stroke();
      A.ellipse(c, 6, 9, 12, 3, P.belly, null, { noStroke: true, hl: false });
    } });
    // 轉塔眼
    const ex = 3;
    const ey = -4;
    vol(ctx, (c) => c.arc(ex, ey, 7, 0, TAU), P.body, P.shade, P.rim, { cel: 1.4, rim: 1.2, lw: 2.4, tex: (c) => speckle(c, ex - 7, ey - 7, 14, 14, 10, 5, P.dot, 0.4, 0.8) });
    ctx.strokeStyle = A.c(P.shade);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ex, ey, 4.9, 0, TAU);
    ctx.moveTo(ex + 6, ey);
    ctx.arc(ex, ey, 6, 0, TAU);
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
      const IR = { red: ['#fff0a0', '#e8601a'], blue: ['#e0f6ff', '#2a7ad0'], green: ['#f0ffa0', '#6a9a1a'] }[mood] || ['#fff0a0', '#c07a1a'];
      beastEye(ctx, ex, ey, 4.4, 4.4, 'normal', { iris: IR[0], irisD: IR[1], irisK: red ? 0.7 : 0.8, look: look / 1.8, lw: 1.2, glowRgb: red ? '255,140,60' : null });
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
        glow(ctx, x, y, 9, '120,200,255', 0.4);
        vol(ctx, (c) => { c.moveTo(x, y - 6); c.quadraticCurveTo(x + 4.4, y - 1, x + 4.2, y + 1); c.arc(x, y + 1, 4.2, 0, PI); c.quadraticCurveTo(x - 4.4, y - 1, x, y - 6); c.closePath(); }, '#8fd0ff', '#3a8ae0', '#e8f8ff', { cel: 1, rim: 0.9, lw: 1.6, tex: (c) => {
          c.fillStyle = 'rgba(255,255,255,0.85)';
          c.beginPath();
          c.ellipse(x - 1.4, y - 0.5, 1.1, 1.8, 0.3, 0, TAU);
          c.fill();
        } });
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
      const sp = pts === SPREAD;
      vol(ctx, wingP, col[0], col[1], back ? null : '#8a86e0', { cel: 2.2, rim: 1.3, lw: 2.4, noStroke: true });
      ctx.save();
      ctx.beginPath();
      wingP(ctx);
      ctx.clip();
      // 星雲：翅膀裡透出紫紅與青色的霧光
      glow(ctx, sp ? -30 : -26, sp ? -34 : 2, 20, back ? '160,90,200' : '200,110,220', 0.45);
      glow(ctx, sp ? -18 : -12, sp ? -16 : 6, 14, '90,170,230', back ? 0.2 : 0.35);
      speckle(ctx, -46, sp ? -50 : -12, 50, sp ? 50 : 30, 26, back ? 91 : 37, 'rgba(255,250,220,0.75)', 0.3, 0.8);
      // 羽毛的分隔線（從每個缺口往肩膀收）
      ctx.strokeStyle = 'rgba(10,8,40,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      pts.forEach((p, k) => {
        if (k < 3 || k > pts.length - 2 || k % 2) return;
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(p[0] * 0.45 + 2, p[1] * 0.45);
      });
      ctx.stroke();
      // 靠身體那一側是一排排的覆羽，往外漸漸變成星空
      ctx.fillStyle = A.c(feather[0]);
      ctx.beginPath();
      if (sp) ctx.ellipse(2, -2, 10, 22, 0.5, 0, TAU);
      else ctx.ellipse(6, 2, 11, 12, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.c(feather[1]);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 4; k++) {
          const x = (sp ? 2 - r * 3 : 8 - r * 4) - k * (sp ? 1.5 : 0.5);
          const y = (sp ? -18 + k * 9 + r * 2 : -6 + k * 4.5);
          ctx.moveTo(x - 3, y);
          ctx.quadraticCurveTo(x, y + 3, x + 3, y);
        }
      }
      ctx.stroke();
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
      outlineOf(ctx, wingP, 2.4);
      ctx.restore();
    };
    mapWing(true);

    // 尾羽（星空色、尖端一顆星）
    vol(ctx, (c) => { c.moveTo(-16, by + 2); c.lineTo(-34, by + 8); c.lineTo(-31, by + 13); c.lineTo(-24, by + 11); c.lineTo(-14, by + 9); c.closePath(); }, sky[0], sky[1], '#8a86e0', { cel: 1.2, rim: 0.9, lw: 2.2, tex: (c) => {
      c.strokeStyle = 'rgba(10,8,40,0.5)';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(-31, by + 12); c.lineTo(-17, by + 5);
      c.stroke();
    } });
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
    vol(ctx, (c) => c.ellipse(-2, by, 18, 14, 0, 0, TAU), feather[0], feather[1], '#a888d0', { cel: 3, rim: 1.8, lw: 2.6, grad: [by - 14, by + 14, '#6a4c88', '#4a3266'], tex: (c) => {
      // 一片片鱗狀的胸羽
      c.strokeStyle = 'rgba(30,14,50,0.45)';
      c.lineWidth = 0.9;
      c.beginPath();
      for (let r = 0; r < 4; r++) {
        for (let k = 0; k < 5; k++) {
          const x = -14 + k * 6 + (r % 2) * 3;
          const y = by - 6 + r * 4.5;
          c.moveTo(x - 3, y);
          c.quadraticCurveTo(x, y + 3.2, x + 3, y);
        }
      }
      c.stroke();
      speckle(c, -18, by - 12, 34, 26, 8, 53, 'rgba(255,230,140,0.7)', 0.3, 0.6);
    } });
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
    vol(ctx, ruff, '#f4ecdc', '#bcae94', '#ffffff', { cel: 1.4, rim: 1, lw: 2.3, tex: (c) => {
      c.strokeStyle = 'rgba(150,130,100,0.55)';
      c.lineWidth = 0.8;
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const x = -2 + k * 3;
        c.moveTo(x, by - 12 + Math.abs(k - 2.5));
        c.lineTo(x + 1, by - 7);
      }
      c.stroke();
    } });

    // 頭（禿頭、勾嘴、額頭第三隻眼）
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(dive ? 0.2 : wind ? -0.2 : strike ? 0.25 : Math.sin(t * 1.5) * 0.06);
    vol(ctx, (c) => c.ellipse(0, -5, 9.5, 8.5, 0, 0, TAU), skin[0], skin[1], '#ffd8d0', { cel: 1.8, rim: 1.2, lw: 2.4, tex: (c) => {
      // 禿頭的皺褶
      c.strokeStyle = 'rgba(160,80,80,0.45)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(-7, -2); c.quadraticCurveTo(-5, 0, -6, 2);
      c.moveTo(-4, 1); c.quadraticCurveTo(-2, 2.5, -3, 3.5);
      c.stroke();
    } });
    // 預言者的金額環（第三隻眼嵌在正中）
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -3, 9.4, PI * 1.18, PI * 1.72);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.8;
    ctx.stroke();
    ctx.strokeStyle = A.c('#f0c64a');
    ctx.lineWidth = 2;
    ctx.stroke();
    vol(ctx, (c) => {
      c.moveTo(6, -7);
      c.quadraticCurveTo(15, -8, 17, -1);
      c.quadraticCurveTo(17, 4, 13, 4);
      c.quadraticCurveTo(14, 0, 11, -1);
      c.lineTo(6, -1);
      c.closePath();
    }, '#f0d890', '#b89448', '#fffae0', { cel: 1, rim: 0.8, lw: 2.2, grad: [-8, 4, '#f6e2a0', '#d8b460'], tex: (c) => {
      c.fillStyle = A.c('#8a6a4a');
      c.beginPath();
      c.ellipse(9, -4.5, 1.1, 0.7, 0, 0, TAU);
      c.fill();
    } });
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
    beastEye(ctx, 4.8, -5, 2.8, 3.2, ek === 'angry' ? 'normal' : ek, { iris: seeing ? '#ffd0a0' : '#ffe07a', irisD: seeing ? '#d02a2a' : '#b8761a', irisK: 0.85, lidCol: skin[1], lid: 0.15, tilt: ek === 'angry' ? 0.5 : 0.2, lw: 1.5 });
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
