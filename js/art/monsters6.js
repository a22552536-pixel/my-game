// 終章「時空間神殿」怪物、投射物、地面區域與掉落素材圖示（規格：docs/SPEC-monsters.md 終章表）。
// 設計：自然物 ＋ 時間／空間魔法（黃銅齒輪、錶盤、時之沙、深靛星空、符文法陣），約第一章的 1.6 倍，最抽象但仍保留 Q 版表情。
// 風格同 monsters2～4：平塗、深棕描邊、右下月牙陰影、左上亮點。原點在腳底中央、面向右（+x）；翻轉、縮放、飛行高度由 A.drawMonster 處理。
// 註冊到 A.MONSTER_DRAW／A.PROJ_DRAW／A.ZONE_DRAW／A.ICON。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const PI = Math.PI;
  const TAU = PI * 2;

  // ───────────── 共用色票 ─────────────
  const BRASS = ['#e8b84a', '#b8842a'];
  const BRASS_D = '#8a5a1e';
  const FACE = ['#fff4d8', '#ecd8a8'];
  const INDIGO = ['#4c44a8', '#342e82'];
  const SAND = ['#f6cc5a', '#d8a23a'];

  // ───────────── 共用小工具 ─────────────
  function num(v, d) {
    return typeof v === 'number' && isFinite(v) ? v : d;
  }
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  // 0..1 的 fx 欄位；也接受 true/false
  function amt(v, d) {
    if (v === true) return 1;
    if (v === false) return 0;
    return clamp(num(v, d), 0, 1);
  }
  function eyeKind(m) {
    return m.dead ? 'x' : m.hurtT > 0 ? 'hurt' : m.angry ? 'angry' : m.blink ? 'closed' : 'normal';
  }
  function phase(m) {
    return m.attackPhase || null;
  }
  function walking(m) {
    if (m.onGround === false) return false;
    if (m.vx != null) return Math.abs(m.vx) > 5;
    return m.state === 'walk';
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
  function starPath(c, x, y, R, r, n, rot) {
    for (let i = 0; i <= n * 2; i++) {
      const a = rot - PI / 2 + (i / (n * 2)) * TAU;
      const rr = i % 2 ? r : R;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
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
  function brow(ctx, x0, y0, x1, y1) {
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  function speedLines(ctx, x, y, h, n, len, t, col) {
    ctx.save();
    ctx.strokeStyle = col || 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const q = (t * 3 + i * 0.37) % 1;
      const yy = y - h / 2 + (h * (i + 0.5)) / n;
      const xx = x - q * 14;
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx - len * (0.6 + 0.2 * (i % 3)), yy);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 暫時用染色模式畫（鏡像分身、平行世界的假身）；受擊閃白時保留閃白
  function withTint(col, k, fn) {
    if (A.mode) return fn();
    A.mode = 'tint';
    A.modeColor = col;
    A.modeAmt = k;
    try {
      fn();
    } finally {
      A.mode = null;
    }
  }
  // 偽隨機（固定種子，畫星點用）
  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // 齒輪輪廓
  function gearPath(c, x, y, R, n, rot, tooth) {
    const w = (TAU / n) * 0.24;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU;
      const pts = [[a - w * 1.15, R], [a - w * 0.6, R + tooth], [a + w * 0.6, R + tooth], [a + w * 1.15, R]];
      pts.forEach(([aa, rr], j) => {
        const px = x + Math.cos(aa) * rr;
        const py = y + Math.sin(aa) * rr;
        i || j ? c.lineTo(px, py) : c.moveTo(px, py);
      });
    }
    c.closePath();
  }
  function gear(ctx, x, y, R, n, rot, fill, shade, o) {
    o = o || {};
    const tooth = o.tooth || R * 0.22;
    A.shape(ctx, (c) => gearPath(c, x, y, R, n, rot, tooth), fill, shade, { cel: [R * 0.1, R * 0.1], lw: o.lw || 2.2, hl: o.hl === false ? null : [x - R * 0.4, y - R * 0.45, R * 0.22, R * 0.13] });
    if (o.hole !== false) {
      // 輻條與軸孔
      ctx.strokeStyle = A.c(o.spoke || BRASS_D);
      ctx.lineWidth = Math.max(1, R * 0.12);
      ctx.beginPath();
      ctx.arc(x, y, R * 0.62, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = A.c(o.spoke || BRASS_D);
      ctx.beginPath();
      ctx.arc(x, y, R * 0.24, 0, TAU);
      ctx.fill();
    }
  }
  // 錶盤：a 以 12 點鐘方向為 0、順時針為正
  function hand(ctx, x, y, a, len, w, col) {
    limb(ctx, (c) => {
      c.moveTo(x - Math.sin(a) * len * 0.15, y + Math.cos(a) * len * 0.15);
      c.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len);
    }, w, col);
  }
  function clockFace(ctx, x, y, r, o) {
    o = o || {};
    const lw = o.lw || 2.4;
    A.ellipse(ctx, x, y, r, r, o.rim || BRASS[0], o.rimShade || BRASS[1], { cel: [r * 0.1, r * 0.1], lw, hl: [x - r * 0.45, y - r * 0.55, r * 0.22, r * 0.12] });
    A.ellipse(ctx, x, y, r * 0.78, r * 0.78, o.face || FACE[0], o.faceShade || FACE[1], { lw: lw * 0.75, hl: false, shadeAt: 0.45 });
    if (o.glowA > 0) glow(ctx, x, y, r * 0.8, '255,226,120', o.glowA);
    ctx.strokeStyle = A.c(o.tick || '#5a4690');
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const big = i % 3 === 0;
      const r0 = r * (big ? 0.52 : 0.6);
      const r1 = r * 0.7;
      ctx.lineWidth = big ? Math.max(1.4, r * 0.08) : Math.max(1, r * 0.045);
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0);
      ctx.lineTo(x + Math.sin(a) * r1, y - Math.cos(a) * r1);
      ctx.stroke();
    }
    if (o.hr != null) hand(ctx, x, y, o.hr, r * 0.4, Math.max(3.2, r * 0.17), o.handCol || '#3a2e6a');
    if (o.mn != null) hand(ctx, x, y, o.mn, r * 0.6, Math.max(2.6, r * 0.12), o.handCol2 || '#d0483a');
    A.ellipse(ctx, x, y, Math.max(1.6, r * 0.09), Math.max(1.6, r * 0.09), BRASS[0], null, { lw: 1.4, hl: false });
  }
  // 小符文（幾筆直線組成的奇幻文字）
  function rune(ctx, x, y, s, k, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.beginPath();
    switch (k % 5) {
      case 0: ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(0, -s * 0.2); ctx.lineTo(s * 0.8, -s); break;
      case 1: ctx.moveTo(-s * 0.7, s); ctx.lineTo(0, -s); ctx.lineTo(s * 0.7, s); ctx.moveTo(-s * 0.4, s * 0.2); ctx.lineTo(s * 0.4, s * 0.2); break;
      case 2: ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(-s * 0.7, -s * 0.5); ctx.lineTo(0, 0); ctx.lineTo(s * 0.7, -s * 0.5); break;
      case 3: ctx.moveTo(-s * 0.6, -s); ctx.lineTo(s * 0.6, -s * 0.2); ctx.lineTo(-s * 0.6, s * 0.4); ctx.lineTo(s * 0.6, s); break;
      default: ctx.arc(0, 0, s * 0.6, 0, TAU); ctx.moveTo(0, -s); ctx.lineTo(0, s);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 符文圓陣（描邊用 rgba，會淡入淡出）
  function runeRing(ctx, x, y, r, rot, rgb, a, n, sy) {
    if (!(a > 0)) return;
    sy = sy || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sy);
    ctx.strokeStyle = 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 0, TAU);
    ctx.stroke();
    n = n || 10;
    ctx.lineWidth = 1.3;
    for (let i = 0; i < n; i++) {
      const ang = rot + (i / n) * TAU;
      rune(ctx, Math.cos(ang) * r * 0.9, Math.sin(ang) * r * 0.9, r * 0.065, i * 3 + 1, ang + PI / 2);
    }
    ctx.restore();
  }
  // 深靛星空（剪裁在目前路徑裡用）：底色＋星點＋星雲
  function starfield(ctx, x0, y0, w, h, seed, t, bright) {
    const g = ctx.createRadialGradient(x0 + w * 0.5, y0 + h * 0.5, 2, x0 + w * 0.5, y0 + h * 0.5, Math.max(w, h) * 0.7);
    g.addColorStop(0, A.c('#5a2c9a'));
    g.addColorStop(0.55, A.c('#221650'));
    g.addColorStop(1, A.c('#0e0a28'));
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, w, h);
    const n = Math.max(6, Math.round((w * h) / 90));
    for (let i = 0; i < n; i++) {
      const px = x0 + hash(seed + i) * w;
      const py = y0 + hash(seed + i + 50) * h;
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
      ctx.fillStyle = 'rgba(255,248,220,' + ((0.35 + tw * 0.6) * (bright || 1)).toFixed(3) + ')';
      const s = hash(seed + i + 90) < 0.2 ? 1.6 : 0.9;
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
  }

  // ═════════════ 終章：時空間神殿 ═════════════

  // ── 沙漏鴞：身體是一座黃銅沙漏，頭是靛藍色的貓頭鷹；沙量 fx.sand、倒流 fx.rewind ──
  function owlWing(ctx, x, y, side, rot, back) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(side, 1);
    ctx.rotate(rot);
    const path = (c) => {
      c.moveTo(0, -6);
      c.quadraticCurveTo(22, -14, 34, -3);
      c.quadraticCurveTo(33, 4, 28, 6);
      c.quadraticCurveTo(26, 11, 20, 10);
      c.quadraticCurveTo(17, 15, 11, 12);
      c.quadraticCurveTo(6, 15, 3, 9);
      c.quadraticCurveTo(-3, 5, 0, -6);
      c.closePath();
    };
    A.shape(ctx, path, back ? '#3e3482' : INDIGO[0], back ? '#2a2462' : INDIGO[1], { cel: [2.5, 2.5], lw: 2.4, hl: back ? null : [10, -6, 5, 1.8] });
    // 翅尖的金色羽紋（像刻度）
    ctx.strokeStyle = A.c(back ? '#b8923a' : '#ffd86a');
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    [[28, 1, 24, -2], [21, 6, 18, 2], [13, 8, 11, 4]].forEach(([a, b, c, d]) => {
      ctx.moveTo(a, b);
      ctx.lineTo(c, d);
    });
    ctx.stroke();
    ctx.restore();
  }
  function hourowl(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const sand = amt(fx.sand, 0.65);
    const rw = amt(fx.rewind, 0);
    const flap = Math.sin(t * (wind ? 11 : 6));
    ctx.save();
    ctx.translate(0, Math.sin(t * 2.2) * 2 - 2);
    if (hurt) ctx.rotate(-0.08);
    if (strike) {
      ctx.translate(6, 2);
      ctx.rotate(0.14);
    }
    const cy = -46;

    // 倒流：身後浮現逆時針轉的時針光環
    if (rw > 0) {
      ctx.save();
      ctx.globalAlpha *= rw;
      glow(ctx, 0, cy, 70, '255,214,110', 0.45);
      const R = 52;
      ctx.lineCap = 'round';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, cy, R, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffd86a');
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU - t * 0.8;
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * (R - 4), cy - Math.cos(a) * (R - 4));
        ctx.lineTo(Math.sin(a) * (R - (i % 3 ? 8 : 12)), cy - Math.cos(a) * (R - (i % 3 ? 8 : 12)));
        ctx.stroke();
      }
      // 三支逆時針追著跑的箭頭
      for (let i = 0; i < 3; i++) {
        const a0 = -t * 4 + (i / 3) * TAU;
        const r2 = R + 9;
        ctx.strokeStyle = 'rgba(255,236,160,0.95)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, cy, r2, a0, a0 + 1.1);
        ctx.stroke();
        const hx = Math.cos(a0) * r2;
        const hy = cy + Math.sin(a0) * r2;
        const tx = Math.sin(a0);
        const ty = -Math.cos(a0);
        ctx.fillStyle = 'rgba(255,236,160,0.95)';
        ctx.beginPath();
        ctx.moveTo(hx + tx * 7, hy + ty * 7);
        ctx.lineTo(hx - ty * 5, hy + tx * 5);
        ctx.lineTo(hx + ty * 5, hy - tx * 5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 後翅
    const wr = wind ? -0.55 + flap * 0.15 : strike ? 1.0 : 0.45 + flap * 0.28;
    owlWing(ctx, -15, -56, -1, wr, true);

    // 沙漏框：柱子（後面兩根）
    const pillar = (x) => {
      limb(ctx, (c) => { c.moveTo(x, -52); c.lineTo(x, -8); }, 5.5, BRASS[0]);
      A.ellipse(ctx, x, -30, 3.2, 3.2, BRASS[0], BRASS[1], { lw: 1.8, hl: false });
    };
    pillar(-17);

    // 玻璃
    const gP = (c) => {
      c.moveTo(-14, -51);
      c.bezierCurveTo(-18, -38, -4, -34, -2.5, -29.5);
      c.bezierCurveTo(-4, -25, -18, -21, -14, -8);
      c.lineTo(14, -8);
      c.bezierCurveTo(18, -21, 4, -25, 2.5, -29.5);
      c.bezierCurveTo(4, -34, 18, -38, 14, -51);
      c.closePath();
    };
    ctx.save();
    ctx.globalAlpha *= 0.6;
    ctx.fillStyle = A.c('#d6ecff');
    ctx.beginPath();
    gP(ctx);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    gP(ctx);
    ctx.clip();
    if (rw > 0) glow(ctx, 0, -30, 26, '255,220,120', 0.6 * rw);
    // 上半部的沙（往頸部漏斗堆）
    const topY = -30 - 20 * sand;
    if (sand > 0.02) {
      A.shape(ctx, (c) => {
        c.moveTo(-20, topY);
        c.quadraticCurveTo(0, topY + (rw > 0 ? -3 : 3.5), 20, topY);
        c.lineTo(20, -28);
        c.lineTo(-20, -28);
        c.closePath();
      }, SAND[0], SAND[1], { cel: [2.5, 2], noStroke: true });
    }
    // 下半部的沙堆
    const lowH = 3 + 17 * (1 - sand);
    const pileTop = -8 - lowH;
    A.shape(ctx, (c) => {
      c.moveTo(-20, -7);
      c.lineTo(-20, -8 - lowH * 0.45);
      c.quadraticCurveTo(0, -8 - lowH * 1.55, 20, -8 - lowH * 0.45);
      c.lineTo(20, -7);
      c.closePath();
    }, SAND[0], SAND[1], { cel: [2.5, 2], noStroke: true });
    // 沙流：平常往下，倒流時一粒粒往上飛
    if (rw > 0) {
      for (let i = 0; i < 9; i++) {
        const q = (t * 1.6 + i / 9) % 1;
        const y = pileTop + (topY + 2 - pileTop) * q;
        const x = Math.sin(i * 2.3 + t * 7) * (1 - Math.abs(y + 29.5) / 20) * 5;
        glow(ctx, x, y, 4, '255,230,140', 0.8);
        ctx.fillStyle = A.c('#fff0a8');
        ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
      }
    } else if (sand > 0.02) {
      ctx.fillStyle = A.c(SAND[0]);
      ctx.fillRect(-0.9, -30, 1.8, pileTop + 30 + 2);
      ctx.fillStyle = A.c('#fff0b0');
      for (let i = 0; i < 3; i++) {
        const q = (t * 2.4 + i / 3) % 1;
        ctx.fillRect(-0.8, -29 + (pileTop + 29) * q, 1.6, 2);
      }
    }
    ctx.restore();
    // 玻璃反光與描邊
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -47);
    ctx.quadraticCurveTo(-12, -40, -7, -36);
    ctx.moveTo(-11, -12);
    ctx.quadraticCurveTo(-12, -18, -9, -21);
    ctx.stroke();
    ctx.beginPath();
    gP(ctx);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = A.outline();
    ctx.lineJoin = 'round';
    ctx.stroke();
    pillar(17);
    // 上下黃銅座
    A.shape(ctx, (c) => A.roundRect(c, -21, -9, 42, 7, 3), BRASS[0], BRASS[1], { cel: [2, 2], lw: 2.4, hl: [-12, -7, 4, 1] });
    A.shape(ctx, (c) => A.roundRect(c, -22, -58, 44, 7.5, 3), BRASS[0], BRASS[1], { cel: [2, 2], lw: 2.4, hl: [-12, -56, 4, 1] });
    // 小爪子
    [-7, 7].forEach((x) => {
      limb(ctx, (c) => { c.moveTo(x - 3, -2); c.lineTo(x - 4, 3); c.moveTo(x, -2); c.lineTo(x, 4); c.moveTo(x + 3, -2); c.lineTo(x + 4, 3); }, 3.4, '#f0c850');
    });

    // 前翅
    owlWing(ctx, 15, -56, 1, wr, false);

    // 頭
    const hx = 2;
    const hy = -73 + (wind ? 2 : 0);
    A.shape(ctx, (c) => { c.moveTo(hx - 17, hy - 8); c.lineTo(hx - 21, hy - 25); c.lineTo(hx - 6, hy - 15); c.closePath(); }, INDIGO[0], INDIGO[1], { lw: 2.4, shadeY: hy - 12 });
    A.shape(ctx, (c) => { c.moveTo(hx + 17, hy - 8); c.lineTo(hx + 23, hy - 25); c.lineTo(hx + 6, hy - 15); c.closePath(); }, INDIGO[0], INDIGO[1], { lw: 2.4, shadeY: hy - 12 });
    A.ellipse(ctx, hx, hy, 23, 18, INDIGO[0], INDIGO[1], { cel: [3, 3], hl: [hx - 11, hy - 10, 5, 2.6] });
    // 額頭的金色小時針（10 點 10 分）
    limb(ctx, (c) => { c.moveTo(hx + 2, hy - 8); c.lineTo(hx - 5, hy - 13); c.moveTo(hx + 2, hy - 8); c.lineTo(hx + 10, hy - 14); }, 3.6, '#ffd86a');
    // 臉盤
    A.shape(ctx, (c) => {
      c.ellipse(hx - 7, hy + 2, 10, 9.5, 0, 0, TAU);
      c.moveTo(hx + 20, hy + 2);
      c.ellipse(hx + 10, hy + 2, 10, 9.5, 0, 0, TAU);
    }, '#f6e8c8', '#e2cc9c', { lw: 2, shadeY: hy + 7 });
    const kind = eyeKind(m);
    const ek = wind && kind === 'normal' ? 'angry' : kind;
    [[hx - 7, hy + 1.5], [hx + 10, hy + 1.5]].forEach(([ex, ey], i) => {
      if (ek === 'normal' || ek === 'angry') {
        A.ellipse(ctx, ex, ey, 7, 7, rw > 0 ? '#fff0a0' : '#ffcf40', '#e8a82a', { lw: 1.8, hl: false, shadeAt: 0.2 });
        A.eye(ctx, ex + 1, ey, 4, 4.8, 'normal', 0.3);
      } else {
        A.eye(ctx, ex, ey, 5, 5, ek, 0);
      }
      if (ek === 'angry') brow(ctx, ex - 7 + i * 2, ey - 9 + (i ? 3 : 0), ex + 5 + i * 2, ey - 6 - (i ? 1 : 0) + (i ? 0 : 1));
    });
    // 嘴喙
    A.shape(ctx, (c) => {
      c.moveTo(hx - 1, hy + 6);
      c.lineTo(hx + 6, hy + 6);
      c.lineTo(hx + 2.5, hy + (strike ? 11 : 13));
      c.closePath();
    }, '#ffc43a', '#d8962a', { lw: 1.8, shadeY: hy + 9 });
    if (strike || hurt) A.shape(ctx, (c) => { c.moveTo(hx, hy + 12); c.lineTo(hx + 5, hy + 12); c.lineTo(hx + 2.5, hy + 16); c.closePath(); }, '#ffc43a', null, { lw: 1.6 });
    A.blush(ctx, hx - 15, hy + 9, 3);
    A.blush(ctx, hx + 19, hy + 9, 3);
    // 倒流時飄在身邊的沙粒
    if (rw > 0) {
      for (let i = 0; i < 6; i++) {
        const q = (t * 0.9 + i / 6) % 1;
        const a = -q * TAU * 0.6 + i;
        sparkle(ctx, Math.cos(a) * 36, cy + 20 - q * 50, 2.5 * (1 - q) + 1, '#fff2a8');
      }
    }
    ctx.restore();
  }

  // ── 鏡像鹿：星斑小鹿，鹿角是鏡面水晶；fx.copy＝鏡像分身（冷色半透明＋鏡面反光） ──
  function crystalAntler(ctx, bx, by, s, back, t, glowA, seed) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(s, s);
    // [base x, base y, tip x, tip y, half width]
    const shards = [
      [-3, -14, -17, -25, 4.2],
      [0, 0, -5, -32, 6],
      [-1, -9, 11, -22, 4.6],
    ];
    const light = back ? '#8ec4ec' : '#d4f4ff';
    const dark = back ? '#5a8ec8' : '#7cc4f0';
    if (glowA > 0) glow(ctx, -4, -20, 34, '150,220,255', glowA);
    shards.forEach(([x0, y0, x1, y1, w], i) => {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const L = Math.hypot(dx, dy) || 1;
      const ux = dx / L;
      const uy = dy / L;
      const px = -uy * w;
      const py = ux * w;
      // 細長的六角水晶柱：底部平、尖端尖
      const P = [
        [x0 + px * 0.7, y0 + py * 0.7],
        [x0 + dx * 0.7 + px, y0 + dy * 0.7 + py],
        [x1, y1],
        [x0 + dx * 0.7 - px, y0 + dy * 0.7 - py],
        [x0 - px * 0.7, y0 - py * 0.7],
      ];
      const path = (c) => {
        P.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
      };
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(dark);
      ctx.fill();
      // 亮面（左半邊）
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      ctx.fillStyle = A.c(light);
      ctx.beginPath();
      ctx.moveTo(P[0][0], P[0][1]);
      ctx.lineTo(P[1][0], P[1][1]);
      ctx.lineTo(P[2][0], P[2][1]);
      ctx.lineTo(x0 + dx * 0.7 + px * 0.05, y0 + dy * 0.7 + py * 0.05);
      ctx.lineTo(x0 + px * 0.05, y0 + py * 0.05);
      ctx.closePath();
      ctx.fill();
      // 鏡面反光：一道白光掃過
      if (!back) {
        const q = (t * 0.7 + seed + i * 0.23) % 1.8;
        if (q < 1) {
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.lineWidth = 2.6;
          const gx = x0 + dx * q;
          const gy = y0 + dy * q;
          ctx.beginPath();
          ctx.moveTo(gx - px * 1.5 - ux * 3, gy - py * 1.5 - uy * 3);
          ctx.lineTo(gx + px * 1.5 + ux * 3, gy + py * 1.5 + uy * 3);
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.stroke();
    });
    if (!back && Math.sin(t * 2.3 + seed * 5) > 0.75) sparkle(ctx, -5, -33, 4, '#ffffff');
    ctx.restore();
  }
  function mirrordeer(ctx, m) {
    const fx = m.fx || {};
    const copy = !!fx.copy;
    if (copy) {
      ctx.save();
      ctx.globalAlpha *= 0.62 + Math.sin(num(m.t, 0) * 5) * 0.05;
      withTint('#6aa8ff', 0.72, () => deerBody(ctx, m, true));
      ctx.restore();
    } else {
      deerBody(ctx, m, false);
    }
  }
  function deerBody(ctx, m, copy) {
    const t = num(m.t, 0);
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m) || strike;
    const fur = ['#c8905a', '#a06a3c'];
    const furB = ['#a8744a', '#86562e'];
    const belly = '#f6e4c6';
    const step = walk ? Math.sin(t * (strike ? 16 : 9)) : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    if (strike) ctx.translate(8, 0);
    const by = walk ? -Math.abs(step) * 2 : Math.sin(t * 2) * 0.6;

    // 腿
    const leg = (x, sw, col, hoof) => {
      const fx2 = x + sw * 6;
      limb(ctx, (c) => {
        c.moveTo(x, -44 + by);
        c.quadraticCurveTo(x - 3 + sw * 2, -22 + by, fx2, -4);
      }, 9, col);
      A.shape(ctx, (c) => A.roundRect(c, fx2 - 4.5, -7, 10, 7, 2.5), hoof, null, { lw: 2 });
    };
    leg(-24, -step, furB[0], '#5a4038');
    leg(12, step, furB[0], '#5a4038');

    // 尾巴
    A.ellipse(ctx, -38, -60 + by, 7, 6, '#fff8ec', '#e4d6c0', { lw: 2.2, hl: false, rot: -0.4 });
    // 身體
    const bodyP = (c) => c.ellipse(-6, -50 + by, 34, 20, -0.04, 0, TAU);
    A.shape(ctx, bodyP, fur[0], fur[1], { cel: [4, 4], hl: [-20, -62 + by, 7, 3] });
    A.shape(ctx, (c) => c.ellipse(-4, -37 + by, 23, 6.5, 0, 0, TAU), belly, null, { noStroke: true });
    // 背上的星形斑點
    [[-22, -61], [-10, -64], [2, -60], [-16, -54], [-2, -53]].forEach(([x, y], i) => {
      const tw = 0.8 + 0.2 * Math.sin(t * 3 + i * 1.3);
      ctx.fillStyle = A.c('#fff4d0');
      ctx.beginPath();
      starPath(ctx, x, y + by, 3.2 * tw, 1.3 * tw, 4, 0.2 * i);
      ctx.fill();
    });
    leg(-15, step, fur[0], '#6a4a40');
    leg(20, -step, fur[0], '#6a4a40');

    // 頭頸組：以頸根為軸，出招時低頭把鏡角對準前方
    ctx.save();
    ctx.translate(14, -58 + by);
    const hr = wind ? 0.55 : strike ? 0.75 : Math.sin(t * 1.6) * 0.04;
    ctx.rotate(hr);
    crystalAntler(ctx, 9, -32, 1.0, true, t, wind ? 0.7 : 0.25, 0.5);
    A.shape(ctx, (c) => {
      c.moveTo(-9, 6);
      c.quadraticCurveTo(-4, -12, 4, -22);
      c.lineTo(17, -18);
      c.quadraticCurveTo(10, -4, 10, 6);
      c.closePath();
    }, fur[0], fur[1], { cel: [3, 3], shadeY: 0 });
    A.shape(ctx, (c) => { c.moveTo(3, -2); c.quadraticCurveTo(8, -10, 12, -14); c.lineTo(10, 2); c.closePath(); }, belly, null, { noStroke: true });
    // 耳朵
    A.shape(ctx, (c) => {
      c.moveTo(6, -30);
      c.quadraticCurveTo(-6, -40, -10, -36);
      c.quadraticCurveTo(-4, -28, 6, -26);
      c.closePath();
    }, fur[0], fur[1], { lw: 2.2, shadeY: -30 });
    ctx.fillStyle = A.c('#f4b8a8');
    ctx.beginPath();
    ctx.ellipse(-1, -33, 4, 1.8, 0.45, 0, TAU);
    ctx.fill();
    A.ellipse(ctx, 13, -24, 12.5, 10, fur[0], fur[1], { cel: [2.5, 2.5], hl: [8, -29, 3, 1.8] });
    A.ellipse(ctx, 24, -19, 8.5, 6.5, '#e8c29a', '#c89c70', { lw: 2.2, hl: false });
    A.ellipse(ctx, 31, -21, 2.8, 2.2, '#3a2a2a', null, { lw: 1.4, hl: false });
    crystalAntler(ctx, 14, -33, 1.1, false, t, wind ? 0.9 : strike ? 0.6 : 0.2, 0);
    const kind = eyeKind(m);
    A.eye(ctx, 16, -26, 3.4, 4.2, wind && kind === 'normal' ? 'angry' : kind, 0.8);
    if (kind === 'normal') {
      // 長睫毛
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(19, -30);
      ctx.lineTo(21.5, -32);
      ctx.moveTo(17, -31);
      ctx.lineTo(18.5, -33.5);
      ctx.stroke();
    }
    smallMouth(ctx, 25, -14, strike, 0.8);
    A.blush(ctx, 17, -18, 3);
    ctx.restore();

    // 鏡像分身：身上的鏡面反光斜紋、被打到出現裂痕
    if (copy) {
      ctx.save();
      ctx.beginPath();
      bodyP(ctx);
      ctx.clip();
      const off = ((t * 30) % 40) - 20;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-30 + off, -34);
      ctx.lineTo(-10 + off, -74);
      ctx.moveTo(-18 + off, -34);
      ctx.lineTo(2 + off, -74);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8 + off, -34);
      ctx.lineTo(12 + off, -74);
      ctx.stroke();
      if (hurt) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-6, -52);
        ctx.lineTo(-14, -60);
        ctx.lineTo(-20, -58);
        ctx.moveTo(-6, -52);
        ctx.lineTo(4, -60);
        ctx.moveTo(-6, -52);
        ctx.lineTo(-2, -40);
        ctx.lineTo(6, -38);
        ctx.moveTo(-6, -52);
        ctx.lineTo(-18, -44);
        ctx.stroke();
      }
      ctx.restore();
      sparkle(ctx, -24 + Math.sin(t * 2) * 6, -72, 3.5, '#ffffff');
    }
    if (strike) speedLines(ctx, -42, -52, 34, 4, 18, t, 'rgba(200,236,255,0.85)');
    ctx.restore();
  }

  // ── 時停蝶：絨毛大蛾，兩片上翅是黃銅錶盤（指針會轉），fx.tick 放領域時發光 ──
  function stopmoth(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const tick = amt(fx.tick, 0);
    const flap = Math.sin(t * (wind ? 9 : 5));
    ctx.save();
    ctx.translate(0, Math.sin(t * 2.4) * 3 - 4);
    if (hurt) ctx.rotate(-0.1);
    if (strike) {
      ctx.translate(8, 2);
      ctx.rotate(0.12);
    }
    // 指針：平常平順轉動，放領域時一格一格「喀、喀」跳
    const tt = tick > 0.05 ? Math.floor(t * 3) / 3 : t;
    const mn = tt * 1.6;
    const hr = tt * 0.25 + 2;
    if (tick > 0) {
      glow(ctx, -8, -52, 62, '255,214,110', 0.5 * tick);
      runeRing(ctx, -8, -46, 50, -t * 0.6, '255,220,130', 0.8 * tick, 12);
    }
    const open = wind ? 1.12 : 1;
    const wing = (cx, cy, r, back, rot, seed) => {
      ctx.save();
      ctx.translate(2, -44);
      ctx.rotate(rot);
      const sq = 0.72 + (flap * 0.5 + 0.5) * 0.28;
      ctx.scale(open, sq * open);
      ctx.translate(cx - 2, cy + 44);
      // 翅膜邊（扇貝狀的靛紫邊）
      A.shape(ctx, (c) => {
        const n = 14;
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * TAU;
          const rr = r * (i % 2 ? 1.18 : 1.1);
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          i ? c.quadraticCurveTo(Math.cos(a - PI / n) * r * 1.24, Math.sin(a - PI / n) * r * 1.24, px, py) : c.moveTo(px, py);
        }
        c.closePath();
      }, back ? '#4a3a92' : '#6a4ec0', back ? '#34286e' : '#4c3898', { cel: [2.5, 2.5], lw: 2.4 });
      clockFace(ctx, 0, 0, r * 0.92, {
        hr: hr + seed,
        mn: mn + seed * 3,
        face: tick > 0.3 ? '#fff0b8' : back ? '#e8dcc0' : FACE[0],
        faceShade: back ? '#cbb890' : FACE[1],
        glowA: tick * 0.7,
        lw: 2.2,
      });
      ctx.restore();
    };
    // 後面的上翅與下翅
    wing(10, -62, 17, true, -0.1, 1.3);
    A.shape(ctx, (c) => c.ellipse(-14, -26, 13, 9, 0.5, 0, TAU), '#5a3ea8', '#3e2a80', { cel: [2, 2], lw: 2.2 });
    A.ellipse(ctx, -16, -25, 4.5, 3.5, '#ffd86a', '#e0a830', { lw: 1.6, hl: false });
    ctx.fillStyle = A.c('#2a1f5a');
    ctx.beginPath();
    ctx.arc(-16, -25, 1.8, 0, TAU);
    ctx.fill();

    // 腹部（金靛相間的環節）
    ctx.save();
    ctx.translate(-8, -34);
    ctx.rotate(0.35 + Math.sin(t * 2.4) * 0.05);
    const abd = (c) => c.ellipse(-8, 0, 14, 9, 0, 0, TAU);
    A.shape(ctx, abd, '#f0c860', '#c89a3a', { cel: [2, 2], noStroke: true });
    ctx.save();
    ctx.beginPath();
    abd(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#3c3490');
    [-16, -9, -2].forEach((x) => ctx.fillRect(x, -10, 3.5, 20));
    ctx.restore();
    ctx.beginPath();
    abd(ctx);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    ctx.restore();

    // 前上翅（大錶盤）
    wing(-16, -58, 24, false, 0.05, 0);

    // 胸部絨毛
    const fuzz = (c, x, y, r) => {
      const n = 12;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const rr = r + (i % 2 ? 2.4 : 0);
        i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
    };
    A.shape(ctx, (c) => fuzz(c, 2, -42, 12), INDIGO[0], INDIGO[1], { cel: [2.5, 2.5], hl: [-3, -48, 3.5, 2] });
    // 奶油色毛領
    A.shape(ctx, (c) => fuzz(c, 10, -46, 7.5), '#fff0d0', '#e8d0a0', { lw: 2, shadeY: -44 });
    // 腳
    limb(ctx, (c) => { c.moveTo(4, -32); c.lineTo(8, -22); c.moveTo(9, -34); c.lineTo(15, -25); }, 3.6, '#3c3490');
    // 頭
    const hx = 16;
    const hy = -52;
    // 羽狀觸角
    [[0, -1], [5, 1]].forEach(([dx, s], i) => {
      const ax = hx - 2 + dx;
      const tip = [ax + 6 + i * 6, hy - 26 + i * 3];
      limb(ctx, (c) => { c.moveTo(ax, hy - 9); c.quadraticCurveTo(ax + 1, hy - 20, tip[0], tip[1]); }, 3.4, '#ffd86a');
      ctx.strokeStyle = A.c('#e8b84a');
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const q = 0.35 + k * 0.18;
        const px = ax + (tip[0] - ax) * q + 0.5;
        const py = hy - 9 + (tip[1] - hy + 9) * q;
        ctx.moveTo(px, py);
        ctx.lineTo(px - 4, py - 1.5);
        ctx.moveTo(px, py);
        ctx.lineTo(px + 3.5, py + 1.5);
      }
      ctx.stroke();
      glow(ctx, tip[0], tip[1], 6, '255,230,140', 0.4 + tick * 0.5);
    });
    A.ellipse(ctx, hx, hy, 11.5, 10.5, '#5c52b8', INDIGO[1], { cel: [2, 2], hl: [hx - 5, hy - 5, 3, 1.8] });
    const kind = eyeKind(m);
    const ek = (wind || tick > 0.5) && kind === 'normal' ? 'angry' : kind;
    A.eye(ctx, hx + 1, hy - 1, 3.4, 4.2, ek, 0.8);
    A.eye(ctx, hx + 8.5, hy - 1.5, 3, 3.8, ek, 0.8);
    smallMouth(ctx, hx + 6, hy + 5, strike || hurt, 0.7);
    A.blush(ctx, hx - 3, hy + 4, 2.4);
    // 灑落的錶盤鱗粉
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.7 + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      sparkle(ctx, -20 + i * 12 + Math.sin(t * 3 + i) * 4, -30 + q * 26, 2.4, '#ffe9a0');
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 銜尾蛇：靛色的蛇、身上金色符文循環流動；fx.wheel＝咬住尾巴變成車輪滾動 ──
  // 沿著 pts（[x, y, r]）畫一條粗細漸變的管子
  function tube(ctx, pts, col, shade, belly) {
    const out = A.outline();
    ctx.fillStyle = out;
    ctx.beginPath();
    pts.forEach(([x, y, r]) => { ctx.moveTo(x + r + 1.6, y); ctx.arc(x, y, r + 1.6, 0, TAU); });
    ctx.fill();
    ctx.fillStyle = A.c(shade);
    ctx.beginPath();
    pts.forEach(([x, y, r]) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); });
    ctx.fill();
    if (belly) {
      ctx.fillStyle = A.c(belly);
      ctx.beginPath();
      pts.forEach(([x, y, r, nx, ny]) => {
        const bx = x + nx * r * 0.45;
        const bj = y + ny * r * 0.45;
        ctx.moveTo(bx + r * 0.52, bj);
        ctx.arc(bx, bj, r * 0.52, 0, TAU);
      });
      ctx.fill();
    }
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    pts.forEach(([x, y, r, nx, ny]) => {
      const cx = x - nx * r * 0.2 - 0.4;
      const cy = y - ny * r * 0.2 - 0.4;
      ctx.moveTo(cx + r * 0.78, cy);
      ctx.arc(cx, cy, r * 0.78, 0, TAU);
    });
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    pts.forEach(([x, y, r, nx, ny]) => {
      const cx = x - nx * r * 0.5;
      const cy = y - ny * r * 0.5;
      ctx.moveTo(cx + r * 0.18, cy);
      ctx.arc(cx, cy, r * 0.18, 0, TAU);
    });
    ctx.fill();
  }
  // 蛇頭（原點＝頸，面向 +x）
  function serpentHead(ctx, m, t, open, biting) {
    const kind = eyeKind(m);
    // 小金角
    A.shape(ctx, (c) => { c.moveTo(2, -9); c.quadraticCurveTo(-4, -18, -9, -19); c.quadraticCurveTo(-4, -13, -2, -7); c.closePath(); }, '#ffd86a', '#d8a83a', { lw: 2, shadeY: -12 });
    // 下顎
    ctx.save();
    ctx.translate(2, 3);
    ctx.rotate(open * 0.5);
    A.shape(ctx, (c) => { c.moveTo(-4, -2); c.quadraticCurveTo(10, 0, 18, 1); c.quadraticCurveTo(14, 8, 2, 8); c.quadraticCurveTo(-6, 6, -4, -2); c.closePath(); }, '#e8d6a2', '#c8b07a', { lw: 2.2, shadeY: 4 });
    ctx.restore();
    if (open > 0.1) {
      ctx.fillStyle = A.c('#7a2330');
      ctx.beginPath();
      ctx.moveTo(4, 2);
      ctx.lineTo(18, 0);
      ctx.lineTo(16, 2 + open * 8);
      ctx.closePath();
      ctx.fill();
      // 毒牙
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(16, 0);
      ctx.lineTo(15, 4);
      ctx.closePath();
      ctx.fill();
    }
    // 上顎／頭
    A.shape(ctx, (c) => {
      c.moveTo(-8, 4);
      c.bezierCurveTo(-10, -10, 2, -14, 10, -11);
      c.bezierCurveTo(18, -8, 23, -3, 22, 2);
      c.quadraticCurveTo(12, 4, -8, 4);
      c.closePath();
    }, INDIGO[0], INDIGO[1], { cel: [2, 2.5], hl: [0, -9, 4, 2] });
    // 額上的金色符文
    ctx.strokeStyle = A.c('#ffd86a');
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    rune(ctx, 1, -6, 3, 4, 0);
    // 鼻孔
    ctx.fillStyle = A.c('#241c50');
    ctx.beginPath();
    ctx.arc(19, -3, 1.1, 0, TAU);
    ctx.fill();
    // 大眼
    A.ellipse(ctx, 10, -5, 5.5, 5.5, '#fff6d8', null, { lw: 2, hl: false });
    if (kind === 'normal' || kind === 'angry') A.eye(ctx, 11, -4.5, 3, 3.8, 'normal', 0.3);
    else A.eye(ctx, 10.5, -4.5, 3, 3, kind, 0);
    if (kind === 'angry' || open > 0.5) brow(ctx, 5, -11, 15, -9);
    A.blush(ctx, 13, 1, 2.4);
    // 吐信
    if (!biting && open < 0.1 && Math.sin(t * 2.7) > 0.8) {
      limb(ctx, (c) => { c.moveTo(21, 1); c.lineTo(28, 2); c.moveTo(28, 2); c.lineTo(31, 0); c.moveTo(28, 2); c.lineTo(31, 4); }, 3, '#e8485a');
    }
  }
  function ouroboros(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const wheel = !!fx.wheel;
    const walk = walking(m);
    const col = '#4a52b8';
    const shade = '#343a8c';
    const belly = '#f0dca8';
    ctx.save();
    if (hurt) ctx.rotate(-0.05);
    if (wheel) {
      const R = 26;
      const cy = -36;
      // 滾動的殘影弧
      ctx.save();
      ctx.strokeStyle = 'rgba(255,226,140,0.45)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a0 = -t * 14 + i * 2.1;
        ctx.beginPath();
        ctx.arc(0, cy, R + 14, a0, a0 + 0.9);
        ctx.stroke();
      }
      ctx.restore();
      speedLines(ctx, -40, cy, 50, 5, 22, t, 'rgba(255,240,200,0.8)');
      glow(ctx, 0, cy, 48, '255,210,110', 0.35);
      ctx.save();
      ctx.translate(0, cy);
      ctx.rotate(t * 11);
      // 環身：尾巴從嘴裡延伸出來繞一圈
      const pts = [];
      const N = 44;
      const a0 = -PI / 2 + 0.55;
      for (let i = 0; i <= N; i++) {
        const q = i / N;
        const a = a0 + q * (TAU - 0.5);
        const r = 2.5 + Math.min(1, q * 3) * 7.5;
        const nx = Math.cos(a);
        const ny = Math.sin(a);
        pts.push([nx * R, ny * R, r, -nx, -ny]);
      }
      tube(ctx, pts, col, shade, belly);
      // 流動的符文
      ctx.strokeStyle = 'rgba(255,224,120,0.95)';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const q = ((i / 8 + t * 0.6) % 1) * 0.85 + 0.12;
        const a = a0 + q * (TAU - 0.5);
        glow(ctx, Math.cos(a) * R, Math.sin(a) * R, 7, '255,220,110', 0.6);
        rune(ctx, Math.cos(a) * R, Math.sin(a) * R, 3, i, a + PI / 2);
      }
      // 頭（咬著尾巴）
      ctx.save();
      const ha = a0 + TAU - 0.35;
      ctx.translate(Math.cos(ha) * R, Math.sin(ha) * R);
      ctx.rotate(ha + PI / 2);
      ctx.scale(1.25, 1.25);
      ctx.translate(-6, 0);
      serpentHead(ctx, m, t, 0.15, true);
      ctx.restore();
      ctx.restore();
      // 地上的塵土
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha *= (1 - q) * 0.8;
        ctx.fillStyle = A.c('#d8c8b0');
        ctx.beginPath();
        ctx.arc(-10 - q * 22, -3 - q * 8, 3 + q * 4, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    // 爬行：S 形身體
    const coil = wind ? 1 : 0;
    const lunge = strike ? 1 : 0;
    const pts = [];
    const N = 46;
    const x0 = -58 + coil * 10;
    const x1 = 30 + coil * -4 + lunge * 14;
    const wav = walk ? t * 7 : t * 1.5;
    const raw = [];
    for (let i = 0; i <= N; i++) {
      const q = i / N;
      const x = x0 + (x1 - x0) * q;
      const amp = (walk ? 5 : 3) * (1 - q * 0.4) + coil * 6;
      let y = -11 + Math.sin(q * 8 - wav) * amp * (q > 0.85 ? (1 - q) / 0.15 : 1);
      // 頸部往上抬
      if (q > 0.78) {
        const k = (q - 0.78) / 0.22;
        y -= k * k * (16 + coil * 10 - lunge * 4);
      }
      const r = 2.2 + Math.min(1, q * 2.4) * 8.6 - (q > 0.8 ? (q - 0.8) * 8 : 0);
      raw.push([x, y, r]);
    }
    raw.forEach((p, i) => {
      const a = raw[Math.max(0, i - 1)];
      const b = raw[Math.min(raw.length - 1, i + 1)];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const L = Math.hypot(dx, dy) || 1;
      // 法線朝下（腹側）
      let nx = -dy / L;
      let ny = dx / L;
      if (ny < 0) { nx = -nx; ny = -ny; }
      pts.push([p[0], p[1], p[2], nx, ny]);
    });
    // 尾尖的金色刺
    const tp = raw[0];
    A.shape(ctx, (c) => { c.moveTo(tp[0] + 2, tp[1] - 2.5); c.lineTo(tp[0] - 9, tp[1] - 1); c.lineTo(tp[0] + 2, tp[1] + 2.5); c.closePath(); }, '#ffd86a', '#d8a83a', { lw: 1.8, shadeY: tp[1] });
    tube(ctx, pts, col, shade, belly);
    // 流動的符文（從頭流向尾，再從尾回到頭：用淡入淡出表現循環）
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const q = (i / 7 + t * 0.25) % 1;
      const idx = Math.round(4 + q * (N - 10));
      const p = pts[idx];
      const a = Math.sin(q * PI);
      glow(ctx, p[0], p[1] - 1, 7, '255,220,110', 0.55 * a);
      ctx.strokeStyle = 'rgba(255,224,120,' + (0.4 + 0.6 * a).toFixed(3) + ')';
      ctx.lineWidth = 1.7;
      rune(ctx, p[0], p[1] - p[2] * 0.15, Math.max(1.5, p[2] * 0.35), i, 0);
    }
    // 頭
    const hp = raw[N];
    ctx.save();
    ctx.translate(hp[0] - 2, hp[1] - 2);
    ctx.rotate(wind ? -0.3 : strike ? 0.15 : Math.sin(t * 1.8) * 0.06);
    ctx.scale(1.4, 1.4);
    serpentHead(ctx, m, t, wind ? 0.8 : strike ? 0.6 : hurt ? 0.3 : 0, false);
    ctx.restore();
    if (strike) speedLines(ctx, -30, -24, 24, 3, 18, t);
    ctx.restore();
  }

  // ── 時計蝸牛：殼是黃銅齒輪時計；fx.gear 施加速魔法（齒輪快轉、金色光環） ──
  function clocksnail(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const g = amt(fx.gear, 0);
    const walk = walking(m);
    const body = ['#c8b4ec', '#9e88cc'];
    const stretch = walk ? Math.sin(t * 6) * 2 : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    if (strike) ctx.translate(6, 0);
    const sx = -6;
    const sy = -40;
    const spin = t * (0.4 + g * 7);

    // 加速光環：從殼往外擴散的金圈
    if (g > 0) {
      glow(ctx, sx, sy, 70, '255,210,100', 0.45 * g);
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.4 + i / 3) % 1;
        ctx.strokeStyle = 'rgba(255,220,120,' + ((1 - q) * 0.9 * g).toFixed(3) + ')';
        ctx.lineWidth = 3 * (1 - q) + 1;
        ctx.beginPath();
        ctx.ellipse(sx, sy + 10, 30 + q * 38, (30 + q * 38) * 0.8, 0, 0, TAU);
        ctx.stroke();
      }
      runeRing(ctx, sx, -6, 44, t * 1.5, '255,220,120', 0.8 * g, 12, 0.22);
    }
    // 身體（在殼下面，頭在右）
    const bodyP = (c) => {
      c.moveTo(-42 - stretch, -2);
      c.quadraticCurveTo(-40, -12, -24, -14);
      c.lineTo(20, -14);
      c.bezierCurveTo(26, -20, 28, -32, 36, -36);
      c.bezierCurveTo(46, -40, 52, -30, 50, -20);
      c.bezierCurveTo(48, -10, 46, -4, 42 + stretch, -1);
      c.quadraticCurveTo(0, 2, -42 - stretch, -2);
      c.closePath();
    };
    // 眼柄（後）
    const eyeStalk = (bx, by, tx, ty, back) => {
      limb(ctx, (c) => { c.moveTo(bx, by); c.quadraticCurveTo(bx + 2, (by + ty) / 2, tx, ty); }, 5, back ? body[1] : body[0]);
    };
    const bob = Math.sin(t * 3) * 1.5;
    eyeStalk(40, -34, 40 + bob, -54, true);
    A.shape(ctx, bodyP, body[0], body[1], { cel: [3, 3], hl: [34, -32, 3, 2] });
    // 腳邊的黏液光
    ctx.fillStyle = 'rgba(220,210,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-2, -1, 42, 2.5, 0, 0, TAU);
    ctx.fill();

    // 殼：大齒輪＋錶盤＋小齒輪
    gear(ctx, sx - 22, sy - 22, 9, 8, -spin * 1.8, BRASS[0], BRASS[1], { lw: 2 });
    gear(ctx, sx, sy, 27, 12, spin, BRASS[0], BRASS[1], { hole: false, tooth: 5.5 });
    // 殼上的螺旋刻紋
    ctx.strokeStyle = A.c(BRASS_D);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(sx, sy, 24, 0, TAU);
    ctx.stroke();
    clockFace(ctx, sx + 1, sy + 1, 19, {
      hr: spin * 0.8 + 1,
      mn: spin * 4 + 0.5,
      glowA: g * 0.8,
      face: g > 0.3 ? '#fff0b8' : FACE[0],
      rim: '#d49a3a',
      rimShade: '#a8702a',
    });
    // 殼頂的小擺錘（往前）
    gear(ctx, sx + 20, sy - 22, 6, 7, spin * 2.6, '#d8c070', '#b09040', { lw: 1.8 });

    eyeStalk(46, -30, 50 + bob * 0.6, -48, false);
    const kind = eyeKind(m);
    const ek = wind && kind === 'normal' ? 'angry' : kind;
    [[40 + bob, -56, 5], [50 + bob * 0.6, -50, 5.5]].forEach(([x, y, r]) => {
      A.ellipse(ctx, x, y, r, r, '#ffffff', null, { lw: 2, hl: false });
      if (ek === 'normal' || ek === 'angry') A.eye(ctx, x + 1, y + 0.5, r * 0.55, r * 0.66, ek, 0);
      else A.eye(ctx, x, y, r * 0.5, r * 0.5, ek, 0);
    });
    // 眼柄尖端的一滴露珠（第一章露珠蝸牛的遠親）
    const dx = 52 + bob * 0.6;
    A.shape(ctx, (c) => {
      c.moveTo(dx + 3, -58);
      c.quadraticCurveTo(dx + 7, -52, dx + 3, -50);
      c.quadraticCurveTo(dx - 1, -52, dx + 3, -58);
      c.closePath();
    }, '#bfe8ff', null, { lw: 1.6 });
    smallMouth(ctx, 44, -24, strike || hurt, 0.8);
    A.blush(ctx, 38, -26, 2.6);
    if (g > 0) {
      for (let i = 0; i < 4; i++) {
        const a = t * 3 + i * 1.6;
        sparkle(ctx, sx + Math.cos(a) * 38, sy + Math.sin(a) * 30, 3 + Math.sin(t * 8 + i) * 1.2, '#fff2a8');
      }
    }
    ctx.restore();
  }

  // ── 次元袋鼠：育兒袋是一個旋轉的空間裂口；fx.warp（1＝完全消失在袋中） ──
  function portal(ctx, x, y, rx, ry, t, a) {
    if (!(a > 0) || !(rx > 0.5)) return;
    ctx.save();
    ctx.globalAlpha *= a;
    glow(ctx, x, y, rx * 2.2, '190,110,255', 0.55);
    const P = (c) => c.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.save();
    ctx.beginPath();
    P(ctx);
    ctx.clip();
    starfield(ctx, x - rx, y - ry, rx * 2, ry * 2, 7, t, 1);
    // 旋渦
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = k % 2 ? 'rgba(120,220,255,0.75)' : 'rgba(230,150,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const q = i / 18;
        const aa = -t * 4 + k * 2.09 + q * 3.2;
        const rr = rx * (0.08 + q * 0.92);
        const px = Math.cos(aa) * rr;
        const py = Math.sin(aa) * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    P(ctx);
    ctx.lineWidth = 3;
    ctx.strokeStyle = A.c('#d890ff');
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
    ctx.restore();
  }
  function pouchroo(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const warp = amt(fx.warp, 0);
    const walk = walking(m);
    const fur = ['#b8a0dc', '#907ab8'];
    const furD = ['#9a84c4', '#7662a0'];
    const belly = '#f6ead6';
    const hop = walk && !warp ? Math.abs(Math.sin(t * 7)) : 0;
    const px = 10;
    const py = -50;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    ctx.translate(0, -hop * 12);
    const s = 1 - warp;
    if (s > 0.02) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, s * 1.4);
      // 被吸進袋子：以袋口為中心縮小、旋轉
      ctx.translate(px, py);
      ctx.rotate(warp * 2.2);
      ctx.scale(s, s);
      ctx.translate(-px, -py);
      if (wind) {
        ctx.translate(0, 4);
        ctx.scale(1.03, 0.94);
      }
      // 踢擊：靠尾巴撐著往後仰、雙腳往前踹
      const lean = strike ? -0.3 : 0;
      ctx.translate(-22, -8);
      ctx.rotate(lean);
      ctx.translate(22, 8);
      // 尾巴
      A.shape(ctx, (c) => {
        c.moveTo(-14, -40);
        c.bezierCurveTo(-30, -30, -40, -14, -50, -4);
        c.quadraticCurveTo(-52, 0, -46, 0);
        c.bezierCurveTo(-34, -4, -18, -14, -4, -24);
        c.closePath();
      }, fur[0], fur[1], { cel: [2.5, 2.5], shadeY: -20 });
      // 後方的手
      limb(ctx, (c) => { c.moveTo(12, -70); c.quadraticCurveTo(20, -66, 22, -58); }, 6, furD[0]);
      // 大腳（踢擊時往前伸）
      const footA = strike ? -0.95 : wind ? 0.08 : 0;
      const foot = (dx, col, sh, thigh) => {
        ctx.save();
        ctx.translate(-8 + dx, -12);
        ctx.rotate(footA);
        // 長長的後腳掌
        A.shape(ctx, (c) => {
          c.moveTo(-9, -8);
          c.quadraticCurveTo(-12, 8, -6, 12);
          c.lineTo(30, 12);
          c.quadraticCurveTo(37, 10, 33, 5);
          c.quadraticCurveTo(16, 3, 5, -8);
          c.closePath();
        }, col, sh, { cel: [2, 2], lw: 2.4 });
        ctx.restore();
        // 大腿
        if (thigh) A.ellipse(ctx, -8 + dx, -30, 15, 20, col, sh, { cel: [3, 3], hl: [-13 + dx, -40, 3, 5], rot: 0.35 });
      };
      foot(6, furD[0], furD[1], false);
      A.shape(ctx, (c) => {
        c.moveTo(-18, -34);
        c.bezierCurveTo(-24, -60, -8, -84, 8, -82);
        c.bezierCurveTo(22, -80, 24, -58, 22, -44);
        c.bezierCurveTo(20, -30, 4, -24, -8, -24);
        c.quadraticCurveTo(-16, -26, -18, -34);
        c.closePath();
      }, fur[0], fur[1], { cel: [4, 3.5], hl: [-4, -70, 4, 7] });
      // 肚皮
      A.shape(ctx, (c) => c.ellipse(9, -52, 11, 22, -0.12, 0, TAU), belly, null, { noStroke: true });
      foot(0, fur[0], fur[1], true);
      // 黃銅項圈（刻符文）
      A.shape(ctx, (c) => A.roundRect(c, -2, -86, 22, 6, 3), BRASS[0], BRASS[1], { lw: 2, hl: false, shadeY: -82 });
      ctx.strokeStyle = A.c(BRASS_D);
      ctx.lineWidth = 1.2;
      rune(ctx, 9, -83, 2, 2, 0);
      // 頭
      const hx = 12;
      const hy = -94 + (wind ? 2 : 0);
      const ear = (x, back) => {
        A.shape(ctx, (c) => { c.moveTo(x - 4, hy - 6); c.quadraticCurveTo(x - 10, hy - 28, x - 4, hy - 30); c.quadraticCurveTo(x + 4, hy - 26, x + 4, hy - 6); c.closePath(); }, back ? furD[0] : fur[0], back ? furD[1] : fur[1], { lw: 2.4, shadeY: hy - 16 });
        if (!back) {
          ctx.fillStyle = A.c('#f4b8c8');
          ctx.beginPath();
          ctx.ellipse(x - 3, hy - 17, 2.2, 8, 0.1, 0, TAU);
          ctx.fill();
        }
      };
      ear(hx - 2, true);
      A.ellipse(ctx, hx, hy, 13, 11, fur[0], fur[1], { cel: [2.5, 2.5], hl: [hx - 5, hy - 5, 3, 2] });
      A.ellipse(ctx, hx + 13, hy + 3, 9, 6.5, belly, '#e0ccb0', { lw: 2.2, hl: false });
      A.ellipse(ctx, hx + 20, hy, 2.6, 2, '#3a2a3a', null, { lw: 1.2, hl: false });
      ear(hx + 6, false);
      const kind = eyeKind(m);
      A.eye(ctx, hx + 6, hy - 2, 3.2, 4, (wind || strike) && kind === 'normal' ? 'angry' : kind, 0.8);
      smallMouth(ctx, hx + 15, hy + 7, strike, 0.7);
      A.blush(ctx, hx + 2, hy + 4, 2.6);
      // 前手（在袋子上方）
      limb(ctx, (c) => { c.moveTo(16, -72); c.quadraticCurveTo(26, -68, 26, -62); }, 6, fur[0]);
      // 袋口的毛邊
      A.shape(ctx, (c) => {
        c.moveTo(-2, -48);
        c.quadraticCurveTo(10, -40, 24, -48);
        c.quadraticCurveTo(22, -30, 10, -30);
        c.quadraticCurveTo(-2, -30, -2, -48);
        c.closePath();
      }, belly, '#e0ccb0', { lw: 2.2, shadeY: -36 });
      ctx.restore();
    }
    // 袋口的次元裂口（在最上層，吸人時變大，完全消失時收小）
    const close = warp > 0.85 ? (1 - warp) / 0.15 : 1;
    const pr = (11.5 + warp * 12) * (0.35 + 0.65 * close);
    portal(ctx, px + 1, py + 1, pr, pr * (0.6 + warp * 0.4), t, Math.max(0.35, close));
    if (warp > 0 && warp < 1) {
      for (let i = 0; i < 6; i++) {
        const q = (t * 1.8 + i / 6) % 1;
        const a = i * 1.05 + q * 3;
        const r = (1 - q) * 40;
        sparkle(ctx, px + Math.cos(a) * r, py + Math.sin(a) * r * 0.8, 2.5, '#e8b8ff');
      }
    }
    ctx.restore();
  }

  // ── 重力水母：傘裡懸著一顆小黑星、觸手是扭曲的光；fx.pull 吸引中 ──
  function blackStar(ctx, x, y, r, t, k, gk) {
    glow(ctx, x, y, r * (gk || 3.2), '150,90,255', 0.55 + 0.3 * k);
    ctx.save();
    ctx.translate(x, y);
    // 吸積盤（後半）
    ctx.save();
    ctx.rotate(-0.35);
    ctx.scale(1, 0.32);
    ctx.lineWidth = r * 0.7;
    ctx.strokeStyle = 'rgba(255,200,120,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.7, PI, TAU);
    ctx.stroke();
    ctx.restore();
    A.ellipse(ctx, 0, 0, r, r, '#1a1030', '#0a0618', { lw: 2, hl: false });
    // 光子環
    ctx.strokeStyle = 'rgba(230,210,255,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, TAU);
    ctx.stroke();
    // 吸積盤（前半）＋轉動的亮點
    ctx.save();
    ctx.rotate(-0.35);
    ctx.scale(1, 0.32);
    ctx.lineWidth = r * 0.7;
    ctx.strokeStyle = 'rgba(255,214,140,0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.7, 0, PI);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + i * 2.1;
      if (Math.sin(a) > 0) {
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 1.7, Math.sin(a) * r * 1.7, r * 0.22, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.restore();
  }
  function gravjelly(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const pull = !!fx.pull;
    const pulse = 1 + Math.sin(t * 3.2) * 0.04;
    const cy = -76 + Math.sin(t * 2) * 3;
    ctx.save();
    if (hurt) ctx.rotate(-0.07);
    // 吸引：周圍空間扭曲、往中心收縮的波紋圈
    if (pull) {
      for (let i = 0; i < 4; i++) {
        const q = 1 - ((t * 0.9 + i / 4) % 1);
        const R = 26 + q * 70;
        ctx.strokeStyle = 'rgba(190,150,255,' + (Math.sin(q * PI) * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let k = 0; k <= 48; k++) {
          const a = (k / 48) * TAU;
          const rr = R + Math.sin(a * 6 + t * 5 + i) * 4 * q;
          const x = Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr * 0.85;
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      // 被吸進來的光點（螺旋）
      for (let i = 0; i < 8; i++) {
        const q = (t * 0.8 + i / 8) % 1;
        const a = i * 0.8 + q * 4;
        const r = (1 - q) * 90 + 10;
        sparkle(ctx, Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, 2.6 * (0.4 + q), '#e8d8ff');
      }
    }
    // 觸手：兩股交纏的扭曲光
    const rimY = cy + 24;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const x0 = -24 + i * 12;
      const len = 58 - Math.abs(i - 2) * 6 + (strike ? 8 : 0);
      const sway = (wind ? 1.8 : 1) * 1;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let j = 0; j <= 16; j++) {
          const q = j / 16;
          const y = rimY + q * len;
          const w = Math.sin(q * 9 - t * 5 + i + k * PI) * (2 + q * 5) * sway;
          const drift = Math.sin(t * 1.6 + i) * q * 6 + (pull ? -x0 * q * 0.25 : 0);
          const x = x0 * (1 + q * 0.25) + w + drift;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = k ? 'rgba(130,220,255,0.35)' : 'rgba(220,170,255,0.35)';
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.strokeStyle = k ? 'rgba(170,236,255,0.95)' : 'rgba(236,200,255,0.95)';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    }
    // 口腕（中間的荷葉狀）
    ctx.restore();
    A.shape(ctx, (c) => {
      c.moveTo(-8, rimY - 2);
      c.bezierCurveTo(-12, rimY + 14, 4, rimY + 12, -2, rimY + 26 + Math.sin(t * 3) * 3);
      c.bezierCurveTo(10, rimY + 16, 12, rimY + 8, 8, rimY - 2);
      c.closePath();
    }, '#c8a8f0', '#a080d8', { lw: 2, shadeY: rimY + 10 });

    // 傘
    ctx.save();
    ctx.translate(0, cy);
    ctx.scale(pulse * (wind ? 1.06 : 1), (2 - pulse) * (wind ? 0.94 : 1));
    const bell = (c) => {
      c.moveTo(-40, 22);
      c.bezierCurveTo(-44, -6, -28, -30, 0, -30);
      c.bezierCurveTo(28, -30, 44, -6, 40, 22);
      const n = 7;
      for (let i = 0; i < n; i++) {
        const x0 = 40 - (i / n) * 80;
        const x1 = 40 - ((i + 1) / n) * 80;
        c.quadraticCurveTo((x0 + x1) / 2, 30, x1, 22);
      }
      c.closePath();
    };
    ctx.save();
    ctx.globalAlpha *= 0.82;
    A.shape(ctx, bell, '#8a6ad8', '#6a4cb8', { cel: [4, 4], noStroke: true });
    ctx.restore();
    // 傘內的星空
    ctx.save();
    ctx.beginPath();
    bell(ctx);
    ctx.clip();
    ctx.globalAlpha *= 0.45;
    starfield(ctx, -44, -32, 88, 62, 21, t, 1);
    ctx.restore();
    // 內傘
    ctx.save();
    ctx.globalAlpha *= 0.4;
    ctx.fillStyle = A.c('#e0c8ff');
    ctx.beginPath();
    ctx.ellipse(0, 4, 28, 20, 0, PI, TAU);
    ctx.fill();
    ctx.restore();
    blackStar(ctx, -6, -8, 7.5, t, pull ? 1 : wind ? 0.6 : 0);
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-24, -14, 7, 4, -0.7, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    bell(ctx);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = A.outline();
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 臉
    const kind = eyeKind(m);
    const ek = (wind || pull) && kind === 'normal' ? 'angry' : kind;
    A.eye(ctx, 10, 9, 3.8, 4.6, ek, 0.8);
    A.eye(ctx, 24, 8, 3.4, 4.2, ek, 0.8);
    smallMouth(ctx, 17, 16, strike || hurt, 0.8);
    A.blush(ctx, 5, 15, 3);
    A.blush(ctx, 30, 14, 2.6);
    ctx.restore();
    ctx.restore();
  }

  // ── 平行狐：身體邊緣有另一個錯開的自己；fx.twin 分身中、fx.fake 平行世界的假身 ──
  function foxBody(ctx, m, t, tails) {
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m) || strike;
    const fur = ['#f29a48', '#c8702e'];
    const furB = ['#d88038', '#a85a24'];
    const cream = '#fff4e0';
    const step = walk ? Math.sin(t * (strike ? 18 : 11)) : 0;
    const by = walk ? -Math.abs(step) * 2 : Math.sin(t * 2.4) * 0.6;
    ctx.save();
    if (hurt) ctx.rotate(-0.07);
    if (wind) {
      ctx.translate(0, 3);
      ctx.rotate(-0.05);
    }
    if (strike) ctx.translate(7, -3);
    const leg = (x, sw, col) => {
      limb(ctx, (c) => { c.moveTo(x, -22 + by); c.lineTo(x + sw * 6, -4); }, 6, col);
      A.ellipse(ctx, x + sw * 6 + 1.5, -3, 4, 2.6, '#4a3040', null, { lw: 1.6, hl: false });
    };
    leg(-20, -step, furB[0]);
    leg(10, step, furB[0]);
    // 兩條尾巴：一條金橙、一條藍紫（兩個世界各一條）
    const tail = (rot, col, sh, tip) => {
      ctx.save();
      ctx.translate(-26, -30 + by);
      ctx.rotate(rot);
      A.shape(ctx, (c) => {
        c.moveTo(2, 4);
        c.bezierCurveTo(-14, 6, -30, -2, -34, -18);
        c.bezierCurveTo(-36, -30, -24, -34, -18, -26);
        c.bezierCurveTo(-14, -18, -6, -8, 4, -4);
        c.closePath();
      }, col, sh, { cel: [2.5, 2.5], hl: [-26, -24, 3, 2] });
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-28, -24, 9, 9, 0, 0, TAU);
      ctx.clip();
      A.shape(ctx, (c) => {
        c.moveTo(2, 4);
        c.bezierCurveTo(-14, 6, -30, -2, -34, -18);
        c.bezierCurveTo(-36, -30, -24, -34, -18, -26);
        c.bezierCurveTo(-14, -18, -6, -8, 4, -4);
        c.closePath();
      }, tip, null, { noStroke: true });
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-34, -18);
      ctx.bezierCurveTo(-36, -30, -24, -34, -18, -26);
      ctx.lineWidth = A.LW;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      ctx.restore();
    };
    const sw = Math.sin(t * 3) * 0.12;
    if (tails) {
      tail(0.35 + sw, '#8a78e8', '#6656c0', '#e8e4ff');
      tail(-0.1 - sw, fur[0], fur[1], cream);
    }
    // 身體
    A.ellipse(ctx, -6, -26 + by, 24, 13, fur[0], fur[1], { cel: [3, 3], hl: [-16, -33 + by, 5, 2.4] });
    A.shape(ctx, (c) => c.ellipse(-2, -18 + by, 15, 4.5, 0, 0, TAU), cream, null, { noStroke: true });
    leg(-12, step, fur[0]);
    leg(16, -step, fur[0]);
    // 頭
    ctx.save();
    ctx.translate(18, -40 + by);
    ctx.rotate(wind ? 0.12 : strike ? 0.2 : Math.sin(t * 1.7) * 0.04);
    const ear = (x, back) => {
      A.shape(ctx, (c) => { c.moveTo(x - 7, -6); c.lineTo(x - 3, -22); c.lineTo(x + 5, -7); c.closePath(); }, back ? furB[0] : fur[0], back ? furB[1] : fur[1], { lw: 2.2, shadeY: -10 });
      if (!back) {
        ctx.fillStyle = A.c('#4a3040');
        ctx.beginPath();
        ctx.moveTo(x - 4.5, -9);
        ctx.lineTo(x - 3, -17);
        ctx.lineTo(x + 1.5, -9);
        ctx.closePath();
        ctx.fill();
      }
    };
    ear(-4, true);
    A.shape(ctx, (c) => {
      c.moveTo(-12, 2);
      c.bezierCurveTo(-14, -10, -4, -13, 4, -12);
      c.bezierCurveTo(12, -11, 16, -6, 24, 0);
      c.quadraticCurveTo(26, 3, 22, 5);
      c.bezierCurveTo(12, 9, 0, 12, -8, 9);
      c.quadraticCurveTo(-13, 7, -12, 2);
      c.closePath();
    }, fur[0], fur[1], { cel: [2.5, 2.5], hl: [-4, -8, 3.5, 2] });
    // 臉頰白毛
    A.shape(ctx, (c) => {
      c.moveTo(2, 3);
      c.quadraticCurveTo(12, 3, 23, 3);
      c.quadraticCurveTo(12, 10, 2, 9);
      c.quadraticCurveTo(-4, 8, -8, 10);
      c.quadraticCurveTo(-3, 5, 2, 3);
      c.closePath();
    }, cream, null, { noStroke: true });
    A.ellipse(ctx, 24, 1, 2.6, 2.1, '#3a2430', null, { lw: 1.2, hl: false });
    ear(6, false);
    const kind = eyeKind(m);
    const ek = (wind || strike) && kind === 'normal' ? 'angry' : kind;
    if (ek === 'normal' && !m.blink) {
      // 狐狸的瞇瞇笑眼（帶一點狡猾）
      A.eye(ctx, 9, -3, 3, 3.6, 'normal', 1);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4.5, -6.5);
      ctx.quadraticCurveTo(9, -9.5, 13.5, -6);
      ctx.stroke();
    } else {
      A.eye(ctx, 9, -3, 3, 3.6, ek, 1);
    }
    smallMouth(ctx, 17, 6, strike, 0.7);
    A.blush(ctx, 5, 4, 2.4);
    ctx.restore();
    ctx.restore();
  }
  function parallelfox(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const twin = !!fx.twin;
    const fake = !!fx.fake;
    const jit = Math.sin(t * 23) * 0.6 + (Math.floor(t * 6) % 3 === 0 ? 1.2 : 0);
    const off = twin ? 10 + Math.sin(t * 6) * 3 : 4 + jit * 0.5;
    ctx.save();
    // 錯開的另一個自己（真身：藍紫色的影；假身：反過來是金橙色的影）
    ctx.save();
    ctx.globalAlpha *= twin ? 0.5 : 0.42;
    ctx.translate(-off, -off * 0.35);
    withTint(fake ? '#ffb040' : '#6a6aff', 0.8, () => foxBody(ctx, m, t - 0.08, true));
    ctx.restore();
    if (twin) {
      ctx.save();
      ctx.globalAlpha *= 0.32;
      ctx.translate(off * 0.8, off * 0.2);
      withTint('#40e0ff', 0.8, () => foxBody(ctx, m, t - 0.16, true));
      ctx.restore();
    }
    if (fake) {
      // 假身：藍紫色、半透明，被水平切成幾段錯位（故障感）
      const bands = [[-80, -52], [-52, -34], [-34, -18], [-18, 10]];
      const seed = Math.floor(t * 7);
      ctx.save();
      ctx.globalAlpha *= 0.62;
      bands.forEach(([y0, y1], i) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-80, y0, 160, y1 - y0);
        ctx.clip();
        ctx.translate((hash(seed * 4 + i) - 0.5) * 7, 0);
        withTint('#7a64f0', 0.62, () => foxBody(ctx, m, t, true));
        ctx.restore();
      });
      ctx.restore();
    } else {
      foxBody(ctx, m, t, true);
    }
    // 掃描線（分身中／假身）
    if (twin || fake) {
      ctx.fillStyle = fake ? 'rgba(170,150,255,0.5)' : 'rgba(150,230,255,0.45)';
      for (let i = 0; i < 3; i++) {
        const y = -8 - ((t * 60 + i * 23) % 66);
        ctx.fillRect(-46 + hash(i + Math.floor(t * 5)) * 20, y, 50 + hash(i * 3) * 30, 1.6);
      }
    }
    ctx.restore();
  }

  // ── 星座魚：身體是一片夜空，星點與連線構成魚的輪廓；fx.link 連線發光 ──
  const FISH_STARS = [
    [55, -40], [40, -58], [16, -65], [-10, -61], [-30, -50], [-38, -40], [-30, -28], [-8, -20], [20, -18], [42, -24],
    [-60, -64], [-52, -40], [-60, -16], [6, -80], [22, -66], [2, -8], [16, -33],
  ];
  const FISH_LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0], [5, 10], [10, 11], [11, 12], [12, 5], [3, 13], [13, 14], [14, 2], [7, 15], [15, 8], [2, 16], [16, 8]];
  function constellfish(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const link = amt(fx.link, 0);
    const wag = Math.sin(t * (strike ? 12 : 4)) * 0.14;
    ctx.save();
    ctx.translate(0, Math.sin(t * 1.8) * 3);
    if (hurt) ctx.rotate(-0.07);
    if (strike) ctx.translate(8, 0);
    if (link > 0) glow(ctx, 0, -40, 90, '255,226,140', 0.35 * link);
    // 尾巴（擺動）
    const tailT = (x, y) => {
      if (x > -38) return [x, y];
      const dx = x + 38;
      const dy = y + 40;
      return [-38 + dx * Math.cos(wag) - dy * Math.sin(wag), -40 + dx * Math.sin(wag) + dy * Math.cos(wag)];
    };
    const stars = FISH_STARS.map(([x, y]) => tailT(x, y));
    const skyFill = (path, a) => {
      ctx.save();
      ctx.globalAlpha *= a;
      A.shape(ctx, path, '#2c2e7a', '#1e1e58', { cel: [3, 3], noStroke: true });
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      starfield(ctx, -70, -90, 130, 90, 3, t, 0.9);
      ctx.restore();
      ctx.restore();
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = 2.6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.stroke();
    };
    // 尾鰭
    const tailP = (c) => {
      const p = [[-34, -42], [-60, -66], [-54, -46], [-51, -40], [-54, -34], [-60, -14], [-34, -38]].map(([x, y]) => tailT(x, y));
      c.moveTo(p[0][0], p[0][1]);
      c.quadraticCurveTo(p[1][0] + 8, p[1][1] + 4, p[1][0], p[1][1]);
      c.quadraticCurveTo(p[2][0], p[2][1], p[3][0], p[3][1]);
      c.quadraticCurveTo(p[4][0], p[4][1], p[5][0], p[5][1]);
      c.quadraticCurveTo(p[5][0] + 8, p[5][1] - 4, p[6][0], p[6][1]);
      c.closePath();
    };
    skyFill(tailP, 0.85);
    // 背鰭、腹鰭
    skyFill((c) => { c.moveTo(-6, -60); c.quadraticCurveTo(-2, -78, 6, -80); c.quadraticCurveTo(18, -76, 24, -63); c.closePath(); }, 0.8);
    skyFill((c) => { c.moveTo(-6, -21); c.quadraticCurveTo(-2, -8, 2, -7); c.quadraticCurveTo(8, -12, 12, -19); c.closePath(); }, 0.8);
    // 身體
    const bodyP = (c) => {
      c.moveTo(57, -40);
      c.bezierCurveTo(52, -60, 16, -70, -12, -61);
      c.quadraticCurveTo(-32, -54, -38, -40);
      c.quadraticCurveTo(-32, -26, -12, -20);
      c.bezierCurveTo(16, -12, 52, -20, 57, -40);
      c.closePath();
    };
    skyFill(bodyP, 1);
    // 星雲
    ctx.save();
    ctx.beginPath();
    bodyP(ctx);
    ctx.clip();
    glow(ctx, 0, -44, 30, '200,120,255', 0.35);
    glow(ctx, -18, -34, 18, '120,190,255', 0.3);
    ctx.restore();
    // 胸鰭
    ctx.save();
    ctx.translate(20, -34);
    ctx.rotate(0.4 + Math.sin(t * 5) * 0.2);
    A.shape(ctx, (c) => { c.moveTo(2, -2); c.quadraticCurveTo(-12, -2, -20, 12); c.quadraticCurveTo(-12, 16, -6, 12); c.quadraticCurveTo(0, 12, 4, 4); c.closePath(); }, '#9c8cf0', '#7a68d0', { lw: 2, shadeY: 8, hl: [-8, 3, 3, 1.5] });
    ctx.restore();
    // 星座連線
    ctx.lineCap = 'round';
    const lk = 0.45 + link * 0.55;
    if (link > 0) {
      ctx.strokeStyle = 'rgba(255,226,140,' + (0.45 * link).toFixed(3) + ')';
      ctx.lineWidth = 7;
      ctx.beginPath();
      FISH_LINKS.forEach(([a, b]) => { ctx.moveTo(stars[a][0], stars[a][1]); ctx.lineTo(stars[b][0], stars[b][1]); });
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,244,200,' + lk.toFixed(3) + ')';
    ctx.lineWidth = 1.4 + link * 1.4;
    ctx.setLineDash(link > 0.5 ? [] : [4, 3]);
    ctx.lineDashOffset = -t * 10;
    ctx.beginPath();
    FISH_LINKS.forEach(([a, b]) => { ctx.moveTo(stars[a][0], stars[a][1]); ctx.lineTo(stars[b][0], stars[b][1]); });
    ctx.stroke();
    ctx.setLineDash([]);
    // 星點
    stars.forEach(([x, y], i) => {
      const tw = 0.7 + 0.3 * Math.sin(t * 4 + i * 1.9);
      const s = (i < 10 ? 3.6 : 3) * tw * (1 + link * 0.5);
      glow(ctx, x, y, s * 3, '255,236,170', 0.5 + link * 0.4);
      sparkle(ctx, x, y, s, i % 4 === 0 ? '#ffffff' : '#fff2b0');
    });
    // 臉：大眼睛（眼中有星星反光）
    const kind = eyeKind(m);
    const ek = (wind || link > 0.5) && kind === 'normal' ? 'angry' : kind;
    A.ellipse(ctx, 38, -44, 7.5, 7.5, '#fff6d8', null, { lw: 2.2, hl: false });
    if (ek === 'normal' || ek === 'angry') {
      A.eye(ctx, 40, -44, 4.2, 5.2, ek, 0.4);
      sparkle(ctx, 38.5, -46.5, 2.2, '#ffffff');
    } else {
      A.eye(ctx, 38, -44, 4, 4, ek, 0);
    }
    smallMouth(ctx, 50, -34, strike || hurt, 0.8);
    A.blush(ctx, 36, -33, 3);
    // 灑落的星屑
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.6 + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha *= (1 - q) * (0.5 + link * 0.5);
      sparkle(ctx, -24 + i * 22 + Math.sin(t + i) * 6, -16 + q * 20, 2.5, '#fff2b0');
      ctx.restore();
    }
    ctx.restore();
  }

  // ═════════════ 投射物 ═════════════
  // 重力球：黑色核心＋吸積盤＋紫色光暈，慢慢下墜
  function gravorb(ctx, p, t) {
    const r = Math.max(8, num(p.r, 12));
    glow(ctx, 0, 0, r * 2.6, '150,90,255', 0.6);
    // 被吸進去的小光點
    for (let i = 0; i < 5; i++) {
      const q = (t * 1.5 + i / 5 + num(p.seed, 0)) % 1;
      const a = i * 1.3 + q * 2.5;
      const rr = r * (2.4 - q * 1.6);
      ctx.fillStyle = 'rgba(230,210,255,' + (q * 0.9).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.6, 0, TAU);
      ctx.fill();
    }
    blackStar(ctx, 0, 0, r * 0.62, t + num(p.seed, 0), 1);
  }
  // 小星星（撒下後會停住，停住時一閃一閃）
  function star(ctx, p, t) {
    const r = Math.max(6, num(p.r, 9));
    const moving = Math.abs(num(p.vx, 0)) + Math.abs(num(p.vy, 0)) > 2;
    const tw = moving ? 1 : 0.85 + 0.25 * Math.sin(t * 9 + num(p.seed, 0) * 5);
    glow(ctx, 0, 0, r * 2.8 * tw, '255,230,140', moving ? 0.5 : 0.75);
    if (!moving) {
      ctx.strokeStyle = 'rgba(255,245,200,0.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r * 2 * tw, 0);
      ctx.lineTo(r * 2 * tw, 0);
      ctx.moveTo(0, -r * 2 * tw);
      ctx.lineTo(0, r * 2 * tw);
      ctx.stroke();
    }
    ctx.rotate(moving ? t * 6 : Math.sin(t * 2 + num(p.seed, 0)) * 0.15);
    A.shape(ctx, (c) => starPath(c, 0, 0, r * tw, r * 0.48 * tw, 5, 0), '#ffe27a', '#f0b43a', { cel: [1.5, 1.5], lw: 2, hl: [-r * 0.3, -r * 0.35, r * 0.18, r * 0.12] });
    // 小臉
    ctx.fillStyle = A.c('#5a3a1a');
    ctx.beginPath();
    ctx.arc(-r * 0.22, -r * 0.02, r * 0.1, 0, TAU);
    ctx.arc(r * 0.22, -r * 0.02, r * 0.1, 0, TAU);
    ctx.fill();
  }

  // ═════════════ 地面區域 ═════════════
  function zoneFade(z, inT, outT) {
    const life = num(z.life, 1);
    const zt = num(z.t, 0);
    return Math.max(0, Math.min(1, (life - zt) / (outT || 0.25), zt * (inT || 4)));
  }
  // 時停領域：半透明金色球域＋停住的指針＋凍結在空中的沙粒（z.x, z.y 是地面中心點；球域壓扁坐在地上，寬 2r、高約 1.1r）
  function timefield(ctx, z, t) {
    const fade = zoneFade(z, 5, 0.3);
    if (fade <= 0) return;
    const r = Math.max(20, num(z.r, 90));
    const zt = num(z.t, 0);
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= fade;
    const grow = Math.min(1, zt * 5);
    const R = r * (0.7 + 0.3 * grow);
    // 地上的光圈
    ctx.strokeStyle = 'rgba(255,220,120,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, R, R * 0.14, 0, 0, TAU);
    ctx.stroke();
    ctx.translate(0, -R * 0.5);
    ctx.scale(1, 0.56);
    const g = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.1, 0, 0, R);
    g.addColorStop(0, 'rgba(255,244,200,0.10)');
    g.addColorStop(0.7, 'rgba(255,214,110,0.18)');
    g.addColorStop(0.95, 'rgba(255,200,90,0.38)');
    g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    // 球殼
    ctx.strokeStyle = 'rgba(255,220,120,0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.stroke();
    // 球面上的經線（像玻璃球）
    ctx.strokeStyle = 'rgba(255,230,150,0.3)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.45, R, 0, 0, TAU);
    ctx.moveTo(R, 0);
    ctx.ellipse(0, 0, R, R * 0.3, 0, 0, TAU);
    ctx.stroke();
    // 錶盤刻度
    ctx.strokeStyle = 'rgba(255,226,140,0.8)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const big = i % 3 === 0;
      ctx.lineWidth = big ? 3 : 1.6;
      ctx.beginPath();
      ctx.moveTo(Math.sin(a) * R * 0.86, -Math.cos(a) * R * 0.86);
      ctx.lineTo(Math.sin(a) * R * (big ? 0.72 : 0.78), -Math.cos(a) * R * (big ? 0.72 : 0.78));
      ctx.stroke();
    }
    // 慢慢轉的符文環
    runeRing(ctx, 0, 0, R * 0.64, t * 0.15, '255,226,140', 0.45, 12);
    // 停住的指針（只在原地微微發抖）
    const tr = Math.sin(t * 40) * 0.012;
    const hnd = (a, len, w) => {
      ctx.strokeStyle = 'rgba(90,60,30,0.55)';
      ctx.lineWidth = w + 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,236,170,0.85)';
      ctx.lineWidth = w;
      ctx.stroke();
    };
    hnd(-0.95 + tr, R * 0.38, 5);
    hnd(0.35 - tr, R * 0.56, 3.5);
    ctx.fillStyle = 'rgba(255,236,170,0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, TAU);
    ctx.fill();
    // 凍結在空中的沙粒
    for (let i = 0; i < 14; i++) {
      const a = hash(i + 3) * TAU;
      const d = Math.sqrt(hash(i + 40)) * R * 0.85;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
      ctx.fillStyle = 'rgba(255,236,160,' + (0.5 + tw * 0.4).toFixed(3) + ')';
      ctx.fillRect(Math.cos(a) * d - 1.3, Math.sin(a) * d - 1.3, 2.6, 2.6);
    }
    // 高光
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.88, PI * 1.08, PI * 1.38);
    ctx.stroke();
    ctx.restore();
  }
  // 次元裂口：直立的紫色空間裂縫（z.x, z.y 是地面上的底端），開→維持→關
  function rift(ctx, z, t) {
    const life = num(z.life, 1);
    const zt = num(z.t, 0);
    if (zt >= life) return;
    const open = Math.max(0, Math.min(1, zt / Math.min(0.3, life * 0.3), (life - zt) / Math.min(0.3, life * 0.3)));
    const e = open * open * (3 - 2 * open);
    if (e <= 0.01) return;
    const H = num(z.h, 120);
    const W = 24 * e;
    const cy = -H / 2 - 4;
    ctx.save();
    ctx.translate(z.x, z.y);
    glow(ctx, 0, cy, H * 0.6, '180,90,255', 0.5 * e);
    // 鋸齒狀的裂縫輪廓（兩側各 7 點）
    const L = [];
    const Rt = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const q = i / n;
      const y = cy - H / 2 + q * H;
      const bulge = Math.sin(q * PI);
      const jag = (i % 2 ? 1 : -1) * 3 * bulge + Math.sin(t * 9 + i * 2) * 1.2 * bulge;
      L.push([-W * bulge + jag, y]);
      Rt.push([W * bulge + jag * 0.6, y]);
    }
    const path = (c) => {
      L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      for (let i = Rt.length - 1; i >= 0; i--) c.lineTo(Rt[i][0], Rt[i][1]);
      c.closePath();
    };
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    starfield(ctx, -W - 6, cy - H / 2, W * 2 + 12, H, 11, t, 1.2);
    // 裡面的旋渦
    ctx.strokeStyle = 'rgba(230,150,255,0.6)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const q = (t * 0.8 + k / 3) % 1;
      ctx.beginPath();
      ctx.ellipse(0, cy, W * (1 - q) + 1, H * 0.45 * (1 - q) + 1, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    // 發光的邊
    ctx.beginPath();
    path(ctx);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(200,110,255,0.55)';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = '#e8a0ff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 飛出的空間碎片
    for (let i = 0; i < 6; i++) {
      const q = (t * 1.3 + i / 6) % 1;
      const s = i % 2 ? 1 : -1;
      const x = s * (W * 0.6 + q * 26);
      const y = cy + (hash(i + 5) - 0.5) * H * 0.7 - q * 10;
      ctx.save();
      ctx.globalAlpha *= (1 - q) * e;
      ctx.translate(x, y);
      ctx.rotate(q * 5 + i);
      ctx.fillStyle = i % 3 ? '#d8a0ff' : '#9ad8ff';
      ctx.beginPath();
      ctx.moveTo(0, -3.5);
      ctx.lineTo(2.5, 0);
      ctx.lineTo(0, 3.5);
      ctx.lineTo(-2.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // 星光連線：z.x1,z.y1 → z.x2,z.y2；蓄力時淡淡的虛線，最後 0.4 秒變亮（有傷害）
  function starline(ctx, z, t) {
    const life = num(z.life, 1);
    const zt = num(z.t, 0);
    if (zt >= life) return;
    const x1 = num(z.x1, num(z.x, 0) - 60);
    const y1 = num(z.y1, num(z.y, 0));
    const x2 = num(z.x2, num(z.x, 0) + 60);
    const y2 = num(z.y2, num(z.y, 0));
    const left = life - zt;
    const hot = left <= 0.4;
    ctx.save();
    ctx.lineCap = 'round';
    if (!hot) {
      const k = Math.min(1, zt / Math.max(0.1, life - 0.4));
      const fin = Math.min(1, zt * 5);
      // 從起點慢慢描到終點的淡虛線
      const ex = x1 + (x2 - x1) * Math.min(1, k * 1.3);
      const ey = y1 + (y2 - y1) * Math.min(1, k * 1.3);
      ctx.globalAlpha *= fin;
      ctx.strokeStyle = 'rgba(200,210,255,' + (0.3 + 0.35 * k).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      // 快發動時閃一閃預警
      if (k > 0.7) {
        const bl = 0.5 + 0.5 * Math.sin(zt * 40);
        ctx.strokeStyle = 'rgba(255,236,160,' + (0.25 * bl).toFixed(3) + ')';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else {
      const k = left / 0.4; // 1 → 0
      const fl = 0.85 + 0.15 * Math.sin(t * 50);
      const a = Math.min(1, k * 4) * fl;
      ctx.globalAlpha *= a;
      ctx.strokeStyle = 'rgba(255,214,110,0.35)';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = '#ffd86a';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      // 沿線跑動的星芒
      const L = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(2, Math.round(L / 40));
      for (let i = 0; i < n; i++) {
        const q = (i / n + t * 1.5) % 1;
        sparkle(ctx, x1 + (x2 - x1) * q, y1 + (y2 - y1) * q, 5 + Math.sin(t * 20 + i) * 1.5, '#ffffff');
      }
    }
    // 兩端的星
    const endS = hot ? 9 : 5;
    [[x1, y1], [x2, y2]].forEach(([x, y]) => {
      glow(ctx, x, y, endS * 3, '255,230,140', hot ? 0.8 : 0.4);
      sparkle(ctx, x, y, endS, '#fff6c8');
    });
    ctx.restore();
  }

  // ═════════════ 素材圖示（掉落物） ═════════════
  const ICON6 = {
    // 時之沙：一小瓶發光的金沙
    timesand(ctx) {
      glow(ctx, 0, 3, 15, '255,214,110', 0.45);
      const bottle = (c) => {
        c.moveTo(-4, -10);
        c.lineTo(-4, -5);
        c.bezierCurveTo(-14, -2, -14, 14, 0, 14);
        c.bezierCurveTo(14, 14, 14, -2, 4, -5);
        c.lineTo(4, -10);
        c.closePath();
      };
      ctx.save();
      ctx.globalAlpha *= 0.6;
      ctx.fillStyle = A.c('#d6ecff');
      ctx.beginPath();
      bottle(ctx);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      bottle(ctx);
      ctx.clip();
      A.shape(ctx, (c) => { c.moveTo(-14, 3); c.quadraticCurveTo(0, 0, 14, 3); c.lineTo(14, 16); c.lineTo(-14, 16); c.closePath(); }, SAND[0], SAND[1], { cel: [2, 2], noStroke: true });
      ctx.fillStyle = '#fff6c8';
      [[-5, 7], [3, 9], [6, 5], [-2, 11]].forEach(([x, y]) => ctx.fillRect(x, y, 1.6, 1.6));
      ctx.restore();
      ctx.beginPath();
      bottle(ctx);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = A.outline();
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 5, 7, PI * 1.05, PI * 1.4);
      ctx.stroke();
      A.shape(ctx, (c) => A.roundRect(c, -5, -15, 10, 6, 2), '#b07a4a', '#8a5a30', { lw: 2, hl: false, shadeY: -12 });
      sparkle(ctx, 11, -10, 3.5, '#fff2a8');
    },
    // 鏡晶：鏡面水晶碎片
    mirrorshard(ctx) {
      const path = (c) => { c.moveTo(-3, -15); c.lineTo(9, -6); c.lineTo(6, 13); c.lineTo(-8, 10); c.lineTo(-11, -3); c.closePath(); };
      A.shape(ctx, path, '#e6f6ff', '#a2c8ec', { cel: [2.5, 2.5], lw: 2.4 });
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      ctx.strokeStyle = A.c('#b8dcf6');
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-3, -15);
      ctx.lineTo(-1, 2);
      ctx.lineTo(9, -6);
      ctx.moveTo(-1, 2);
      ctx.lineTo(-8, 10);
      ctx.moveTo(-1, 2);
      ctx.lineTo(6, 13);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.lineTo(2, -12);
      ctx.stroke();
      ctx.restore();
      sparkle(ctx, 10, -12, 3.5, '#ffffff');
    },
    // 錶盤鱗粉：一片帶刻度的蝶翅鱗片
    clockwing(ctx) {
      A.shape(ctx, (c) => {
        c.moveTo(0, 14);
        c.bezierCurveTo(-16, 6, -16, -14, 0, -14);
        c.bezierCurveTo(16, -14, 16, 6, 0, 14);
        c.closePath();
      }, '#6a4ec0', '#4c3898', { cel: [2, 2], lw: 2.4 });
      clockFace(ctx, 0, -2, 9, { hr: -0.9, mn: 0.35, lw: 1.8 });
      [[-12, 10], [12, 8], [8, 14]].forEach(([x, y], i) => sparkle(ctx, x, y, 2.4 - i * 0.4, '#ffe9a0'));
    },
    // 輪迴鱗：靛色蛇鱗，上面一個金色 ∞ 符文
    ouroscale(ctx) {
      A.shape(ctx, (c) => {
        c.moveTo(0, -14);
        c.bezierCurveTo(14, -12, 14, 4, 0, 14);
        c.bezierCurveTo(-14, 4, -14, -12, 0, -14);
        c.closePath();
      }, INDIGO[0], INDIGO[1], { cel: [2.5, 2.5], hl: [-5, -7, 2.5, 3.5] });
      glow(ctx, 0, 0, 10, '255,220,110', 0.5);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      const inf = () => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(3, -5, 8, -4, 8, 0);
        ctx.bezierCurveTo(8, 4, 3, 5, 0, 0);
        ctx.bezierCurveTo(-3, -5, -8, -4, -8, 0);
        ctx.bezierCurveTo(-8, 4, -3, 5, 0, 0);
        ctx.stroke();
      };
      inf();
      ctx.strokeStyle = A.c('#ffd86a');
      ctx.lineWidth = 2;
      inf();
    },
    // 黃銅齒輪
    brassgear(ctx) {
      gear(ctx, 5, 5, 6, 8, 0.3, '#d8c070', '#b09040', { lw: 1.8 });
      gear(ctx, -3, -3, 10, 10, 0.1, BRASS[0], BRASS[1], { lw: 2.2 });
      sparkle(ctx, 11, -11, 3, '#fff6c8');
    },
    // 次元布：一塊印著星空、邊緣破開的紫布
    riftcloth(ctx) {
      const path = (c) => {
        c.moveTo(-13, -11);
        c.quadraticCurveTo(0, -15, 13, -11);
        c.lineTo(12, 2);
        c.lineTo(15, 6);
        c.lineTo(10, 8);
        c.lineTo(12, 13);
        c.lineTo(4, 11);
        c.lineTo(0, 14);
        c.lineTo(-4, 10);
        c.lineTo(-10, 13);
        c.lineTo(-11, 5);
        c.lineTo(-15, 1);
        c.closePath();
      };
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      starfield(ctx, -16, -16, 32, 32, 5, 0, 1.3);
      ctx.strokeStyle = 'rgba(230,160,255,0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-14, -4);
      ctx.quadraticCurveTo(0, 2, 14, -6);
      ctx.moveTo(-14, 6);
      ctx.quadraticCurveTo(0, 10, 14, 3);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      sparkle(ctx, -5, -4, 2.5, '#ffffff');
      sparkle(ctx, 6, 4, 2, '#ffe9a0');
    },
    // 小黑星
    darkstar(ctx) {
      blackStar(ctx, 0, 0, 8, 0.6, 0.5, 1.9);
    },
    // 平行狐尾毛：一撮金橙、一撮藍紫交叉
    twintail(ctx) {
      const tuft = (rot, col, sh, tip) => {
        ctx.save();
        ctx.rotate(rot);
        const p = (c) => {
          c.moveTo(0, 14);
          c.bezierCurveTo(-8, 6, -8, -8, 0, -15);
          c.bezierCurveTo(8, -8, 8, 6, 0, 14);
          c.closePath();
        };
        A.shape(ctx, p, col, sh, { cel: [2, 2], hl: [-2, -6, 1.5, 3] });
        ctx.save();
        ctx.beginPath();
        p(ctx);
        ctx.clip();
        ctx.fillStyle = A.c(tip);
        ctx.fillRect(-10, -16, 20, 8);
        ctx.restore();
        ctx.beginPath();
        p(ctx);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = A.outline();
        ctx.stroke();
        ctx.restore();
      };
      ctx.save();
      ctx.translate(-4, 0);
      ctx.globalAlpha *= 0.9;
      tuft(-0.4, '#8a78e8', '#6656c0', '#e8e4ff');
      ctx.restore();
      ctx.save();
      ctx.translate(4, 0);
      tuft(0.4, '#f29a48', '#c8702e', '#fff4e0');
      ctx.restore();
    },
    // 星座碎片：三顆星連成線的水晶片
    stardust(ctx) {
      A.shape(ctx, (c) => { c.moveTo(0, -15); c.lineTo(13, -3); c.lineTo(8, 13); c.lineTo(-9, 12); c.lineTo(-13, -4); c.closePath(); }, '#2c2e7a', '#1e1e58', { cel: [2.5, 2.5], lw: 2.4, hl: [-4, -8, 3, 2] });
      const pts = [[-6, -4], [3, -8], [5, 6], [-4, 7]];
      ctx.strokeStyle = 'rgba(255,244,200,0.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      pts.forEach(([x, y], i) => {
        glow(ctx, x, y, 6, '255,236,170', 0.6);
        sparkle(ctx, x, y, i === 1 ? 3.6 : 2.6, '#fff6c8');
      });
    },
  };

  Object.assign(A.MONSTER_DRAW, { hourowl, mirrordeer, stopmoth, ouroboros, clocksnail, pouchroo, gravjelly, parallelfox, constellfish });
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  Object.assign(A.PROJ_DRAW, { gravorb, star });
  Object.assign(A.ZONE_DRAW, { timefield, rift, starline });
  if (A.ICON) Object.assign(A.ICON, ICON6);
})();
