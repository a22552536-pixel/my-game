// 終章「時空間神殿」怪物、投射物、地面區域與掉落素材圖示（規格：docs/SPEC-monsters.md 終章表）。
// 設計：自然物 ＋ 時間／空間魔法，約第一章的 1.6 倍。九隻各有自己的主色，時空概念就是牠們的身體本身：
//   沙漏鴞＝緋紅羽＋金沙心、鏡像鹿＝珍珠白＋稜鏡虹角、時停蝶＝青綠＋金錶盤、銜尾蛇＝翡翠＋∞ 符文、
//   時計蝸牛＝黃銅紅銅＋蒸汽、次元袋鼠＝桃紅＋紫青漩渦袋、重力水母＝暗物質＋小黑星、平行狐＝焰橙／冰藍兩個世界、星座魚＝星光線條。
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
  // 暫時用染色模式畫（鏡像分身、平行世界的假身）；受擊閃白時保留閃白，結束後還原原本的模式
  function withTint(col, k, fn) {
    if (A.mode === 'flash') return fn();
    const pm = A.mode;
    const pc = A.modeColor;
    const pa = A.modeAmt;
    A.mode = 'tint';
    A.modeColor = col;
    A.modeAmt = k;
    try {
      fn();
    } finally {
      A.mode = pm;
      A.modeColor = pc;
      A.modeAmt = pa;
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

  // 顏色（會跟著閃白／染色）轉成 'r,g,b'，給 glow 用：鏡像分身、假身的光暈也會一起染色
  function rgbOf(hex) {
    const c = A.c(hex);
    if (typeof c === 'string' && c[0] === '#' && c.length === 7) {
      const n = parseInt(c.slice(1), 16);
      return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    }
    const mm = /rgba?\(([^)]+)\)/.exec(c);
    return mm ? mm[1].split(',').slice(0, 3).join(',') : '255,255,255';
  }
  function glowH(ctx, x, y, r, hex, a) {
    glow(ctx, x, y, r, rgbOf(hex), a);
  }
  // 會發光的寶石眼（normal / angry）；其他表情交給 A.eye
  function gemEye(ctx, x, y, r, iris, irisD, kind, o) {
    o = o || {};
    if (kind !== 'normal' && kind !== 'angry') {
      A.eye(ctx, x, y, r * 0.75, r * 0.75, kind, 0);
      return;
    }
    const ry = r * (o.sy || 1.08);
    glowH(ctx, x, y, r * 2.4, o.glowCol || iris, o.glowA != null ? o.glowA : 0.5);
    A.ellipse(ctx, x, y, r, ry, iris, irisD, { lw: o.lw || 2, hl: false, shadeAt: 0.2 });
    ctx.fillStyle = A.c(o.pupil || '#1c1030');
    ctx.beginPath();
    ctx.ellipse(x + r * 0.14, y + r * 0.06, r * (o.slit ? 0.2 : 0.48), ry * (o.slit ? 0.8 : 0.58), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.3, y - ry * 0.36, r * 0.3, ry * 0.24, -0.4, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.38, y + ry * 0.34, r * 0.13, 0, TAU);
    ctx.fill();
    if (kind === 'angry') brow(ctx, x - r * 1.15, y - ry * 1.4, x + r * 1.05, y - ry * 0.95);
  }
  // 稜鏡彩虹漸層（顏色經過 A.c，分身染色時會一起變冷色）
  const PRISM = ['#ff6f9c', '#ffae52', '#fff066', '#6cffa4', '#56d0ff', '#9c7cff', '#ff72d6'];
  function prismGrad(ctx, x0, y0, x1, y1, shift) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    const n = PRISM.length;
    const s = Math.floor(num(shift, 0)) % n;
    for (let i = 0; i < n; i++) g.addColorStop(i / (n - 1), A.c(PRISM[(i + s + n) % n]));
    return g;
  }
  function heartPath(c, x, y, s) {
    c.moveTo(x, y + s * 0.95);
    c.bezierCurveTo(x - s * 1.35, y + s * 0.1, x - s * 0.95, y - s * 0.95, x, y - s * 0.35);
    c.bezierCurveTo(x + s * 0.95, y - s * 0.95, x + s * 1.35, y + s * 0.1, x, y + s * 0.95);
    c.closePath();
  }
  function infPath(c, x, y, s) {
    c.moveTo(x, y);
    c.bezierCurveTo(x + s * 0.4, y - s * 0.6, x + s, y - s * 0.5, x + s, y);
    c.bezierCurveTo(x + s, y + s * 0.5, x + s * 0.4, y + s * 0.6, x, y);
    c.bezierCurveTo(x - s * 0.4, y - s * 0.6, x - s, y - s * 0.5, x - s, y);
    c.bezierCurveTo(x - s, y + s * 0.5, x - s * 0.4, y + s * 0.6, x, y);
  }
  // 發光的 ∞ 符文：外暈＋描邊＋亮芯
  function infRune(ctx, x, y, s, rot, a, core, halo) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.globalAlpha *= Math.min(1, a);
    glowH(ctx, 0, 0, s * 1.9, halo, 0.7);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    infPath(ctx, 0, 0, s);
    ctx.strokeStyle = A.c(halo);
    ctx.lineWidth = Math.max(2, s * 0.42);
    ctx.stroke();
    ctx.strokeStyle = A.c(core);
    ctx.lineWidth = Math.max(1, s * 0.18);
    ctx.stroke();
    ctx.restore();
  }
  function strokeOut(ctx, path, lw) {
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = lw || 2.4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }

  // ═════════════ 終章：時空間神殿 ═════════════

  // ── 沙漏鴞：緋紅羽毛的大角鴞，肚子是一座金框沙漏，腰間一顆發光的「沙之心」；心形臉盤、青綠發光眼 ──
  const OWL = ['#f05a3c', '#b8322e'];
  const OWL_B = ['#c43a38', '#8a2230'];
  const OWL_GOLD = ['#ffd45a', '#e39a2a'];
  const OWL_FACE = ['#fff2d8', '#f2d0a0'];
  const SANDG = ['#ffd24a', '#f09a2a'];
  function owlWing(ctx, x, y, side, rot, back) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(side, 1);
    ctx.rotate(rot);
    const path = (c) => {
      c.moveTo(-3, -8);
      c.bezierCurveTo(16, -19, 41, -11, 47, 12);
      c.quadraticCurveTo(48, 22, 41, 24);
      c.quadraticCurveTo(40, 33, 31, 31);
      c.quadraticCurveTo(28, 40, 19, 35);
      c.quadraticCurveTo(13, 41, 7, 31);
      c.quadraticCurveTo(-5, 16, -3, -8);
      c.closePath();
    };
    const f = back ? OWL_B : OWL;
    A.shape(ctx, path, f[0], f[1], { cel: [3, 3], noStroke: true });
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    // 金色飛羽帶（兩階）
    ctx.fillStyle = A.c(back ? '#d99030' : OWL_GOLD[0]);
    ctx.beginPath();
    ctx.moveTo(54, 2);
    ctx.quadraticCurveTo(28, 22, 0, 15);
    ctx.lineTo(0, 60);
    ctx.lineTo(60, 60);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = A.c(back ? '#b06a22' : OWL_GOLD[1]);
    ctx.beginPath();
    ctx.moveTo(58, 16);
    ctx.quadraticCurveTo(30, 34, 2, 27);
    ctx.lineTo(0, 60);
    ctx.lineTo(60, 60);
    ctx.closePath();
    ctx.fill();
    // 覆羽的小月牙
    if (!back) {
      ctx.strokeStyle = A.c('#ffa070');
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      [[12, 0], [22, -3], [32, 2], [18, 8], [28, 10]].forEach(([px, py]) => {
        ctx.moveTo(px - 4, py);
        ctx.quadraticCurveTo(px, py + 4, px + 4, py);
      });
      ctx.stroke();
    }
    ctx.restore();
    strokeOut(ctx, path, 2.6);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    [[41, 24, 35, 16], [31, 31, 27, 21], [19, 35, 17, 24]].forEach(([a, b, c, d]) => {
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
    const flap = Math.sin(t * (wind ? 11 : 5));
    ctx.save();
    ctx.translate(0, Math.sin(t * 2.2) * 2 - 2);
    if (hurt) ctx.rotate(-0.08);
    if (strike) {
      ctx.translate(6, 2);
      ctx.rotate(0.14);
    }
    const cy = -50;

    // 倒流：身後浮現逆時針轉的金色錶環＋青綠箭頭
    if (rw > 0) {
      ctx.save();
      ctx.globalAlpha *= rw;
      glowH(ctx, 0, cy, 78, '#ffc860', 0.5);
      const R = 56;
      ctx.lineCap = 'round';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, cy, R, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffd86a');
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU - t * 0.8;
        const r1 = R - (i % 3 ? 8 : 13);
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * (R - 4), cy - Math.cos(a) * (R - 4));
        ctx.lineTo(Math.sin(a) * r1, cy - Math.cos(a) * r1);
        ctx.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const a0 = -t * 4 + (i / 3) * TAU;
        const r2 = R + 10;
        ctx.strokeStyle = 'rgba(110,255,230,0.95)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, cy, r2, a0, a0 + 1.1);
        ctx.stroke();
        const hx = Math.cos(a0) * r2;
        const hy = cy + Math.sin(a0) * r2;
        const tx = Math.sin(a0);
        const ty = -Math.cos(a0);
        ctx.fillStyle = 'rgba(110,255,230,0.95)';
        ctx.beginPath();
        ctx.moveTo(hx + tx * 8, hy + ty * 8);
        ctx.lineTo(hx - ty * 6, hy + tx * 6);
        ctx.lineTo(hx + ty * 6, hy - tx * 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // 沙之心的暖光
    glowH(ctx, 0, -42, 50, '#ffb040', 0.22 + 0.3 * rw);

    const wr = wind ? -0.62 + flap * 0.12 : strike ? 0.9 : 0.22 + flap * 0.2;
    owlWing(ctx, -21, -60, -1, wr, true);
    // 尾羽（金色扇形）
    A.shape(ctx, (c) => {
      c.moveTo(-11, -18);
      c.lineTo(-17, -3);
      c.lineTo(-7, -7);
      c.lineTo(0, 2);
      c.lineTo(7, -7);
      c.lineTo(17, -3);
      c.lineTo(11, -18);
      c.closePath();
    }, OWL_GOLD[0], OWL_GOLD[1], { lw: 2.2, shadeY: -7 });
    // 身體：圓滾滾的緋紅羽毛蛋
    const bodyP = (c) => c.ellipse(0, -43, 29, 31, 0, 0, TAU);
    A.shape(ctx, bodyP, OWL[0], OWL[1], { cel: [4, 4], hl: [-17, -58, 5, 3] });
    // 胸側的羽鱗
    ctx.save();
    ctx.beginPath();
    bodyP(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c('#ff9468');
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    [[-22, -38], [-24, -28], [-20, -20], [22, -38], [24, -28], [20, -20], [-21, -48], [21, -48]].forEach(([px, py]) => {
      ctx.moveTo(px - 3.5, py);
      ctx.quadraticCurveTo(px, py + 3.5, px + 3.5, py);
    });
    ctx.stroke();
    ctx.restore();

    // 肚子的沙漏窗
    const gP = (c) => {
      c.moveTo(-15, -67);
      c.bezierCurveTo(-18, -53, -5, -47, -3, -42);
      c.bezierCurveTo(-5, -37, -18, -31, -15, -17);
      c.quadraticCurveTo(0, -13, 15, -17);
      c.bezierCurveTo(18, -31, 5, -37, 3, -42);
      c.bezierCurveTo(5, -47, 18, -53, 15, -67);
      c.quadraticCurveTo(0, -71, -15, -67);
      c.closePath();
    };
    ctx.beginPath();
    gP(ctx);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 9.5;
    ctx.stroke();
    ctx.strokeStyle = A.c(OWL_GOLD[0]);
    ctx.lineWidth = 5.5;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    gP(ctx);
    ctx.clip();
    const gg = ctx.createLinearGradient(0, -70, 0, -14);
    gg.addColorStop(0, A.c('#6a2450'));
    gg.addColorStop(0.5, A.c('#8a2c4a'));
    gg.addColorStop(1, A.c('#5a1c40'));
    ctx.fillStyle = gg;
    ctx.fillRect(-20, -72, 40, 60);
    glowH(ctx, 0, -42, 28, '#ffc24a', 0.35 + 0.45 * rw);
    // 上半部的沙
    const topY = -42 - 24 * sand;
    if (sand > 0.02) {
      A.shape(ctx, (c) => {
        c.moveTo(-22, topY);
        c.quadraticCurveTo(0, topY + (rw > 0 ? -3.5 : 4), 22, topY);
        c.lineTo(22, -40);
        c.lineTo(-22, -40);
        c.closePath();
      }, SANDG[0], SANDG[1], { cel: [2.5, 2], noStroke: true });
    }
    // 下半部的沙堆
    const lowH = 3 + 19 * (1 - sand);
    const pileTop = -16 - lowH;
    A.shape(ctx, (c) => {
      c.moveTo(-22, -12);
      c.lineTo(-22, -16 - lowH * 0.45);
      c.quadraticCurveTo(0, -16 - lowH * 1.55, 22, -16 - lowH * 0.45);
      c.lineTo(22, -12);
      c.closePath();
    }, SANDG[0], SANDG[1], { cel: [2.5, 2], noStroke: true });
    // 沙中的亮點
    ctx.fillStyle = A.c('#fff6c0');
    for (let i = 0; i < 7; i++) {
      const q = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.1);
      if (q > 0.55) ctx.fillRect(-12 + hash(i) * 24, -18 - hash(i + 9) * lowH * 0.8, 1.6, 1.6);
    }
    // 沙流：平常往下，倒流時一粒粒往上飛
    if (rw > 0) {
      for (let i = 0; i < 10; i++) {
        const q = (t * 1.6 + i / 10) % 1;
        const y = pileTop + (topY + 2 - pileTop) * q;
        const x = Math.sin(i * 2.3 + t * 7) * (1 - Math.abs(y + 42) / 22) * 6;
        glowH(ctx, x, y, 4.5, '#ffe68c', 0.85);
        ctx.fillStyle = A.c('#fff4b0');
        ctx.fillRect(x - 1.3, y - 1.3, 2.6, 2.6);
      }
    } else if (sand > 0.02) {
      ctx.fillStyle = A.c(SANDG[0]);
      ctx.fillRect(-1, -42, 2, pileTop + 42 + 2);
      ctx.fillStyle = A.c('#fff4b0');
      for (let i = 0; i < 3; i++) {
        const q = (t * 2.4 + i / 3) % 1;
        ctx.fillRect(-0.9, -41 + (pileTop + 41) * q, 1.8, 2);
      }
    }
    // 玻璃反光
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -63);
    ctx.quadraticCurveTo(-12, -55, -7, -50);
    ctx.moveTo(-11, -21);
    ctx.quadraticCurveTo(-12, -27, -9, -31);
    ctx.stroke();
    ctx.restore();
    strokeOut(ctx, gP, 1.6);
    // 金框上下的紅寶石鉚釘
    [[-15, -67], [15, -67], [-15, -17], [15, -17]].forEach(([px, py]) => A.ellipse(ctx, px, py, 2.6, 2.6, '#ff4a6a', '#c02a4a', { lw: 1.4, hl: false }));
    // 沙之心：沙流經過腰間的一顆心
    const hb = 1 + Math.sin(t * 4) * 0.08 + rw * 0.18;
    glowH(ctx, 0, -42, 17 * hb, '#ffd24a', 0.8);
    A.shape(ctx, (c) => heartPath(c, 0, -42, 7 * hb), '#ffe680', '#ffae30', { lw: 2, shadeY: -40, hl: [-2.6, -44.5, 1.8, 1.1] });
    // 金爪
    [-9, 9].forEach((x) => {
      limb(ctx, (c) => { c.moveTo(x - 3, -12); c.lineTo(x - 5, -3); c.moveTo(x, -12); c.lineTo(x, -2); c.moveTo(x + 3, -12); c.lineTo(x + 5, -3); }, 3.6, '#ffc640');
    });
    owlWing(ctx, 21, -60, 1, wr, false);

    // 頭
    const hx = 2;
    const hy = -80 + (wind ? 2 : 0);
    const tuft = (s) => {
      A.shape(ctx, (c) => {
        c.moveTo(hx + s * 8, hy - 13);
        c.quadraticCurveTo(hx + s * 13, hy - 28, hx + s * 27, hy - 37);
        c.quadraticCurveTo(hx + s * 26, hy - 21, hx + s * 22, hy - 8);
        c.closePath();
      }, OWL[0], OWL[1], { lw: 2.4, shadeY: hy - 16 });
      A.shape(ctx, (c) => {
        c.moveTo(hx + s * 21, hy - 29);
        c.lineTo(hx + s * 27, hy - 37);
        c.lineTo(hx + s * 25, hy - 24);
        c.closePath();
      }, OWL_GOLD[0], null, { lw: 1.8 });
    };
    tuft(-1);
    tuft(1);
    A.ellipse(ctx, hx, hy, 25, 20, OWL[0], OWL[1], { cel: [3, 3], hl: [hx - 12, hy - 11, 5, 2.6] });
    // 心形臉盤
    A.shape(ctx, (c) => {
      c.moveTo(hx + 1, hy - 8);
      c.bezierCurveTo(hx - 9, hy - 18, hx - 24, hy - 9, hx - 19, hy + 5);
      c.quadraticCurveTo(hx - 11, hy + 16, hx + 1, hy + 16);
      c.quadraticCurveTo(hx + 13, hy + 16, hx + 21, hy + 5);
      c.bezierCurveTo(hx + 26, hy - 9, hx + 11, hy - 18, hx + 1, hy - 8);
      c.closePath();
    }, OWL_FACE[0], OWL_FACE[1], { lw: 2.2, shadeY: hy + 10 });
    const kind = eyeKind(m);
    const ek = (wind || rw > 0.5) && kind === 'normal' ? 'angry' : kind;
    const eyeC = rw > 0 ? ['#b8fff2', '#50e0d0'] : ['#46f0d8', '#16a8a0'];
    gemEye(ctx, hx - 8, hy + 2, 6.4, eyeC[0], eyeC[1], ek, { glowA: 0.45 + rw * 0.4 });
    gemEye(ctx, hx + 10, hy + 2, 6.8, eyeC[0], eyeC[1], ek, { glowA: 0.45 + rw * 0.4 });
    // 嘴喙
    A.shape(ctx, (c) => {
      c.moveTo(hx - 2, hy + 7);
      c.lineTo(hx + 5, hy + 7);
      c.lineTo(hx + 1.5, hy + (strike ? 12 : 14));
      c.closePath();
    }, '#ffc43a', '#d8902a', { lw: 1.8, shadeY: hy + 10 });
    if (strike || hurt) A.shape(ctx, (c) => { c.moveTo(hx - 1, hy + 13); c.lineTo(hx + 4, hy + 13); c.lineTo(hx + 1.5, hy + 17); c.closePath(); }, '#ffc43a', null, { lw: 1.6 });
    A.blush(ctx, hx - 15, hy + 10, 3);
    A.blush(ctx, hx + 18, hy + 10, 3);
    // 翅尖飄落／倒流時往上飛的沙粒
    for (let i = 0; i < 6; i++) {
      const q = (t * (rw > 0 ? 0.9 : 0.5) + i / 6) % 1;
      const s = i % 2 ? 1 : -1;
      const x = s * (40 + Math.sin(t * 2 + i) * 6);
      const y = rw > 0 ? cy + 30 - q * 70 : -34 + q * 34;
      ctx.save();
      ctx.globalAlpha *= Math.sin(q * PI);
      sparkle(ctx, x, y, 2.4 + (i % 3) * 0.6, '#ffe680');
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 鏡像鹿：珍珠白的小鹿，一對巨大的稜鏡水晶角（彩虹會流動）、水晶鬃毛、胸口一面小鏡；fx.copy＝鏡像分身 ──
  const DEER = ['#f7f4ff', '#c8bfea'];
  const DEER_B = ['#dcd6f4', '#aca2d4'];
  // 一根稜鏡角：以角根為原點往上長（-y），[x0,y0,x1,y1,半寬]
  const ANTLER = [
    [0, 0, -12, -21, 5.2],
    [-11, -19, -28, -36, 4.2],
    [-26, -34, -44, -40, 3.2],
    [-10, -17, -5, -42, 3.6],
    [-22, -30, -21, -56, 3.4],
    [-4, -8, 8, -24, 3],
  ];
  function prismAntler(ctx, bx, by, s, back, t, glowA, seed) {
    ctx.save();
    ctx.translate(bx, by);
    // 遠側的角往前張開、近側的角往後張開，兩支角成一個 V 字
    ctx.scale(back ? -s : s, s);
    if (glowA > 0) glowH(ctx, -16, -30, 44, '#c8a8ff', glowA);
    const grad = prismGrad(ctx, 4, 4, -30, -56, t * 4 + seed * 3);
    ANTLER.forEach(([x0, y0, x1, y1, w], i) => {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const L = Math.hypot(dx, dy) || 1;
      const ux = dx / L;
      const uy = dy / L;
      const px = -uy * w;
      const py = ux * w;
      const P = [
        [x0 + px * 0.75, y0 + py * 0.75],
        [x0 + dx * 0.72 + px, y0 + dy * 0.72 + py],
        [x1, y1],
        [x0 + dx * 0.72 - px, y0 + dy * 0.72 - py],
        [x0 - px * 0.75, y0 - py * 0.75],
      ];
      const path = (c) => {
        P.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
      };
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = grad;
      ctx.fill();
      // 暗面（右半）讓水晶有立體感
      ctx.save();
      ctx.clip();
      ctx.fillStyle = back ? 'rgba(60,40,120,0.42)' : 'rgba(80,60,160,0.22)';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(P[3][0], P[3][1]);
      ctx.lineTo(P[4][0], P[4][1]);
      ctx.closePath();
      ctx.fill();
      // 亮稜線
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x0 + px * 0.3, y0 + py * 0.3);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      // 鏡面反光：一道白光掃過
      if (!back) {
        const q = (t * 0.7 + seed + i * 0.19) % 1.8;
        if (q < 1) {
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.lineWidth = 3;
          const gx = x0 + dx * q;
          const gy = y0 + dy * q;
          ctx.beginPath();
          ctx.moveTo(gx - px * 1.6 - ux * 3, gy - py * 1.6 - uy * 3);
          ctx.lineTo(gx + px * 1.6 + ux * 3, gy + py * 1.6 + uy * 3);
          ctx.stroke();
        }
      }
      ctx.restore();
      strokeOut(ctx, path, 2);
    });
    if (!back) {
      [[-5, -42], [-21, -56], [-44, -40], [8, -24]].forEach(([x, y], i) => {
        const k = Math.sin(t * 2.6 + i * 1.7 + seed * 5);
        if (k > 0.55) sparkle(ctx, x, y, 3 + (k - 0.55) * 6, '#ffffff');
      });
    }
    ctx.restore();
  }
  function mirrordeer(ctx, m) {
    const fx = m.fx || {};
    const copy = !!fx.copy;
    if (copy) {
      const t = num(m.t, 0);
      ctx.save();
      // 鏡面的冷光邊框（像站在一面鏡子裡）
      glowH(ctx, 0, -60, 70, '#8ad8ff', 0.35);
      ctx.globalAlpha *= 0.6 + Math.sin(t * 5) * 0.05;
      withTint('#78c8ff', 0.55, () => deerBody(ctx, m, true));
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
    const step = walk ? Math.sin(t * (strike ? 16 : 9)) : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    if (strike) ctx.translate(8, 0);
    const by = walk ? -Math.abs(step) * 2 : Math.sin(t * 2) * 0.6;

    const leg = (x, sw, col, hoof) => {
      const fx2 = x + sw * 6;
      limb(ctx, (c) => {
        c.moveTo(x, -44 + by);
        c.quadraticCurveTo(x - 3 + sw * 2, -22 + by, fx2, -5);
      }, 9, col);
      A.shape(ctx, (c) => {
        c.moveTo(fx2 - 5, -7);
        c.lineTo(fx2 + 5, -7);
        c.lineTo(fx2 + 4, 0);
        c.lineTo(fx2 - 4, 0);
        c.closePath();
      }, hoof, null, { lw: 2 });
    };
    leg(-24, -step, DEER_B[0], '#7a8ee0');
    leg(12, step, DEER_B[0], '#7a8ee0');

    // 水晶尾巴
    A.shape(ctx, (c) => {
      c.moveTo(-36, -58 + by);
      c.lineTo(-48, -70 + by);
      c.lineTo(-44, -58 + by);
      c.lineTo(-50, -52 + by);
      c.lineTo(-37, -52 + by);
      c.closePath();
    }, '#e8f6ff', '#9ecbf0', { lw: 2.2, shadeY: -58 + by });
    // 身體
    const bodyP = (c) => c.ellipse(-6, -50 + by, 34, 20, -0.04, 0, TAU);
    A.shape(ctx, bodyP, DEER[0], DEER[1], { cel: [4, 4], hl: [-20, -62 + by, 8, 3] });
    // 背上的彩虹光斑（稜鏡折射的光點）
    [[-22, -60], [-10, -64], [2, -59], [-16, -52], [-3, -53]].forEach(([x, y], i) => {
      const tw = 0.8 + 0.2 * Math.sin(t * 3 + i * 1.3);
      ctx.fillStyle = A.c(PRISM[(i * 2 + Math.floor(t * 2)) % PRISM.length]);
      ctx.beginPath();
      starPath(ctx, x, y + by, 3.4 * tw, 1.3 * tw, 4, 0.2 * i);
      ctx.fill();
    });
    leg(-15, step, DEER[0], '#8ea4f0');
    leg(20, -step, DEER[0], '#8ea4f0');

    // 頭頸組：以頸根為軸，出招時低頭把稜鏡角對準前方
    ctx.save();
    ctx.translate(14, -58 + by);
    const hr = wind ? 0.55 : strike ? 0.75 : Math.sin(t * 1.6) * 0.04;
    ctx.rotate(hr);
    prismAntler(ctx, 8, -32, 0.82, true, t, 0, 0.5);
    // 脖子
    A.shape(ctx, (c) => {
      c.moveTo(-10, 6);
      c.quadraticCurveTo(-5, -12, 4, -22);
      c.lineTo(17, -18);
      c.quadraticCurveTo(10, -4, 10, 6);
      c.closePath();
    }, DEER[0], DEER[1], { cel: [3, 3], shadeY: 0 });
    // 水晶鬃毛（沿著後頸的三片稜鏡）
    [[-6, -2, -16, -8], [-3, -10, -13, -18], [1, -17, -7, -27]].forEach(([x0, y0, x1, y1], i) => {
      const path = (c) => {
        c.moveTo(x0 + 3, y0 + 2);
        c.lineTo(x1, y1);
        c.lineTo(x0 + 4, y0 - 4);
        c.closePath();
      };
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(PRISM[(i * 2 + 4) % PRISM.length]);
      ctx.fill();
      strokeOut(ctx, path, 1.8);
    });
    // 胸口的小圓鏡（銀框）
    A.ellipse(ctx, 8, -4, 5.5, 6.5, '#e8f0ff', '#a8c0e8', { lw: 2, hl: false, shadeAt: 0.1 });
    ctx.fillStyle = prismGrad(ctx, 3, -10, 13, 2, t * 3);
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    ctx.ellipse(8, -4, 3.6, 4.6, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha /= 0.6;
    // 耳朵
    A.shape(ctx, (c) => {
      c.moveTo(6, -30);
      c.quadraticCurveTo(-7, -41, -12, -36);
      c.quadraticCurveTo(-5, -28, 6, -26);
      c.closePath();
    }, DEER[0], DEER[1], { lw: 2.2, shadeY: -30 });
    ctx.fillStyle = A.c('#d8b4ff');
    ctx.beginPath();
    ctx.ellipse(-2, -33, 4.4, 1.8, 0.45, 0, TAU);
    ctx.fill();
    A.ellipse(ctx, 13, -24, 13, 10.5, DEER[0], DEER[1], { cel: [2.5, 2.5], hl: [8, -29, 3, 1.8] });
    A.ellipse(ctx, 25, -19, 8, 6.2, '#fff8ff', '#dcd0f0', { lw: 2.2, hl: false });
    A.ellipse(ctx, 31.5, -21, 2.8, 2.2, '#5a4a8a', null, { lw: 1.4, hl: false });
    // 額頭的小菱形稜鏡
    A.shape(ctx, (c) => { c.moveTo(8, -36); c.lineTo(11, -32); c.lineTo(8, -28); c.lineTo(5, -32); c.closePath(); }, '#9c7cff', null, { lw: 1.6 });
    prismAntler(ctx, 12, -33, 1.0, false, t, wind ? 0.9 : strike ? 0.6 : 0.2, 0);
    const kind = eyeKind(m);
    const ek = wind && kind === 'normal' ? 'angry' : kind;
    gemEye(ctx, 16, -25, 4.4, '#b890ff', '#7a54e0', ek, { glowA: 0.35 });
    if (kind === 'normal') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(19.5, -29.5);
      ctx.lineTo(22, -32);
      ctx.moveTo(17, -30.5);
      ctx.lineTo(18.5, -33.5);
      ctx.stroke();
    }
    smallMouth(ctx, 25.5, -14, strike, 0.8);
    A.blush(ctx, 17, -17.5, 3);
    ctx.restore();

    // 鏡像分身：身上流過的鏡面斜紋、被打到出現裂痕
    if (copy) {
      ctx.save();
      ctx.beginPath();
      bodyP(ctx);
      ctx.clip();
      const off = ((t * 30) % 40) - 20;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
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
      if (m.hurtT > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1.8;
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
      // 腳底的鏡面線（倒影的分界）
      ctx.strokeStyle = 'rgba(190,236,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-50, 1);
      ctx.lineTo(44, 1);
      ctx.stroke();
      sparkle(ctx, -24 + Math.sin(t * 2) * 6, -74, 3.5, '#ffffff');
      sparkle(ctx, 30 + Math.cos(t * 1.7) * 5, -40, 2.6, '#ffffff');
    }
    if (strike) speedLines(ctx, -42, -52, 34, 4, 18, t, 'rgba(220,200,255,0.85)');
    ctx.restore();
  }

  // ── 時停蝶：展開的青綠大翅蛾，兩片前翅各嵌一面金框錶盤（指針會走）、後翅拖著鐘擺尾；fx.tick 放領域時錶盤發光、指針一格格跳 ──
  const MOTH = ['#22bfb0', '#0f8084'];
  const MOTH_B = ['#18958e', '#0c6068'];
  const MOTH_GOLD = ['#ffd44e', '#dc9a2a'];
  function stopmoth(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const tick = amt(fx.tick, 0);
    const flap = Math.sin(t * (wind ? 10 : 5));
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
    const bx = 0;
    const byy = -44;
    if (tick > 0) {
      glowH(ctx, bx, byy - 4, 70, '#ffd86a', 0.5 * tick);
      runeRing(ctx, bx, byy - 4, 54, -t * 0.6, '255,220,130', 0.85 * tick, 12);
    }
    const open = wind ? 1.12 : 1;
    const sq = 0.78 + (flap * 0.5 + 0.5) * 0.22;
    // 後翅（燕尾＋金色鐘擺）
    const hind = (side) => {
      ctx.save();
      ctx.translate(bx + side * 2, byy + 4);
      ctx.scale(side * sq * open, open);
      ctx.rotate(0.1 + (1 - sq) * 0.4);
      const path = (c) => {
        c.moveTo(0, -2);
        c.bezierCurveTo(14, -4, 30, 2, 30, 14);
        c.quadraticCurveTo(30, 22, 23, 25);
        c.quadraticCurveTo(26, 33, 27, 41);
        c.quadraticCurveTo(22, 42, 19, 36);
        c.quadraticCurveTo(13, 28, 8, 25);
        c.quadraticCurveTo(0, 18, 0, -2);
        c.closePath();
      };
      A.shape(ctx, path, MOTH_B[0], MOTH_B[1], { cel: [2.5, 2.5], lw: 2.4 });
      // 金邊
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      ctx.strokeStyle = A.c(MOTH_GOLD[0]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      path(ctx);
      ctx.stroke();
      ctx.restore();
      strokeOut(ctx, path, 2.4);
      // 小齒輪眼紋
      gear(ctx, 17, 11, 5, 7, t * (tick > 0.05 ? 3 : 0.6) * side, MOTH_GOLD[0], MOTH_GOLD[1], { lw: 1.6, hl: false });
      // 鐘擺
      limb(ctx, (c) => { c.moveTo(24, 38); c.lineTo(25 + Math.sin(t * 3) * 2, 45); }, 2.4, MOTH_GOLD[0]);
      glowH(ctx, 25 + Math.sin(t * 3) * 2, 47, 8, '#ffd86a', 0.5 + tick * 0.4);
      A.ellipse(ctx, 25 + Math.sin(t * 3) * 2, 47, 4, 4, MOTH_GOLD[0], MOTH_GOLD[1], { lw: 1.8, hl: [23.5 + Math.sin(t * 3) * 2, 45.5, 1.2, 0.8] });
      ctx.restore();
    };
    // 前翅（大錶盤）
    const fore = (side, seed) => {
      ctx.save();
      ctx.translate(bx + side * 3, byy - 2);
      ctx.scale(side * sq * open, open);
      ctx.rotate(-0.05 - (1 - sq) * 0.5);
      const path = (c) => {
        c.moveTo(0, 3);
        c.bezierCurveTo(4, -20, 22, -38, 40, -37);
        c.bezierCurveTo(54, -35, 54, -17, 47, -6);
        c.bezierCurveTo(38, 7, 16, 9, 0, 3);
        c.closePath();
      };
      A.shape(ctx, path, MOTH[0], MOTH[1], { cel: [3, 3], noStroke: true, hl: [12, -14, 5, 2] });
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      // 翅脈
      ctx.strokeStyle = A.c('#7ff0e0');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.quadraticCurveTo(18, -8, 44, -30);
      ctx.moveTo(2, 2);
      ctx.quadraticCurveTo(24, 0, 50, -10);
      ctx.stroke();
      // 金色翅緣
      ctx.strokeStyle = A.c(MOTH_GOLD[0]);
      ctx.lineWidth = 4;
      ctx.beginPath();
      path(ctx);
      ctx.stroke();
      ctx.restore();
      strokeOut(ctx, path, 2.6);
      // 翅緣的金點（像刻度）
      ctx.fillStyle = A.c('#fff2b0');
      [[40, -34], [50, -22], [48, -9], [36, 3]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, TAU);
        ctx.fill();
      });
      // 錶盤（反過來畫時不讓錶面鏡像）
      ctx.save();
      ctx.translate(30, -16);
      ctx.scale(side, 1);
      clockFace(ctx, 0, 0, 14, {
        hr: hr + seed,
        mn: mn + seed * 3,
        rim: MOTH_GOLD[0],
        rimShade: MOTH_GOLD[1],
        face: tick > 0.3 ? '#fff4c0' : '#f4fff8',
        faceShade: tick > 0.3 ? '#ffe08a' : '#c8ece4',
        tick: '#0c6068',
        handCol: '#0c4a52',
        handCol2: '#e8503a',
        glowA: tick * 0.8,
        lw: 2.2,
      });
      ctx.restore();
      ctx.restore();
    };
    hind(-1);
    hind(1);
    fore(-1, 1.3);
    fore(1, 0);

    // 腹部（金與青綠相間的環節）
    const abd = (c) => c.ellipse(bx, byy + 18, 7.5, 15, 0, 0, TAU);
    A.shape(ctx, abd, '#ffe07a', '#e0a83a', { cel: [2, 2], noStroke: true });
    ctx.save();
    ctx.beginPath();
    abd(ctx);
    ctx.clip();
    ctx.fillStyle = A.c(MOTH[1]);
    [byy + 10, byy + 17, byy + 24].forEach((y) => ctx.fillRect(bx - 10, y, 20, 3));
    ctx.restore();
    strokeOut(ctx, abd, 2.4);
    // 胸部絨毛
    const fuzz = (c, x, y, r) => {
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const rr = r + (i % 2 ? 2.4 : 0);
        i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
    };
    A.shape(ctx, (c) => fuzz(c, bx, byy, 9.5), MOTH_GOLD[0], MOTH_GOLD[1], { cel: [2.5, 2.5], hl: [bx - 5, byy - 5, 3.5, 2] });
    // 頭
    const hx = bx + 3;
    const hy = byy - 16;
    [[-4, -1], [5, 1]].forEach(([dx], i) => {
      const ax = hx + dx;
      const tip = [ax + (i ? 12 : -8), hy - 26 + i * 2];
      limb(ctx, (c) => { c.moveTo(ax, hy - 8); c.quadraticCurveTo(ax + (i ? 3 : -2), hy - 20, tip[0], tip[1]); }, 3.4, MOTH_GOLD[0]);
      ctx.strokeStyle = A.c(MOTH_GOLD[1]);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const q = 0.35 + k * 0.18;
        const px = ax + (tip[0] - ax) * q;
        const py = hy - 8 + (tip[1] - hy + 8) * q;
        ctx.moveTo(px, py);
        ctx.lineTo(px - 4, py - 1.5);
        ctx.moveTo(px, py);
        ctx.lineTo(px + 4, py - 1.5);
      }
      ctx.stroke();
      glowH(ctx, tip[0], tip[1], 7, '#ffe68c', 0.5 + tick * 0.5);
      A.ellipse(ctx, tip[0], tip[1], 2.4, 2.4, '#fff4b0', null, { lw: 1.4, hl: false });
    });
    A.ellipse(ctx, hx, hy, 12.5, 11, '#fff4d6', '#e8cc96', { cel: [2, 2], hl: [hx - 5, hy - 5, 3, 1.8] });
    const kind = eyeKind(m);
    const ek = (wind || tick > 0.5) && kind === 'normal' ? 'angry' : kind;
    gemEye(ctx, hx - 1, hy, 4.4, '#2ad8c8', '#10908c', ek, { glowA: 0.35 + tick * 0.4 });
    gemEye(ctx, hx + 8, hy - 0.5, 4, '#2ad8c8', '#10908c', ek, { glowA: 0.35 + tick * 0.4 });
    smallMouth(ctx, hx + 4, hy + 6, strike || hurt, 0.7);
    A.blush(ctx, hx - 6, hy + 5, 2.4);
    // 灑落的金色鱗粉
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.7 + i / 4) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      sparkle(ctx, -30 + i * 20 + Math.sin(t * 3 + i) * 4, byy + 10 + q * 30, 2.4, '#ffe9a0');
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 銜尾蛇：翡翠色的蛇，金色背鰭與金角、琥珀色發光豎瞳，身上的 ∞ 符文沿著身體循環流動；fx.wheel＝咬住尾巴變成翡翠車輪 ──
  const JADE = '#3fd08e';
  const JADE_S = '#1f8f68';
  const JADE_BELLY = '#e6fac8';
  // 沿著 pts（[x, y, r, nx, ny]）畫一條粗細漸變的管子
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
    // 鱗紋：每隔幾節一道深色小弧
    ctx.strokeStyle = A.c(shade);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    pts.forEach(([x, y, r, nx, ny], i) => {
      if (i % 3 || r < 4) return;
      const cx = x - nx * r * 0.3;
      const cy = y - ny * r * 0.3;
      const sA = Math.atan2(ny, nx) - 0.8;
      ctx.moveTo(cx + Math.cos(sA) * r * 0.5, cy + Math.sin(sA) * r * 0.5);
      ctx.arc(cx, cy, r * 0.5, sA, sA + 1.6);
    });
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath();
    pts.forEach(([x, y, r, nx, ny]) => {
      const cx = x - nx * r * 0.5;
      const cy = y - ny * r * 0.5;
      ctx.moveTo(cx + r * 0.18, cy);
      ctx.arc(cx, cy, r * 0.18, 0, TAU);
    });
    ctx.fill();
  }
  // 背上的金色鰭刺（沿著背側法線）
  function dorsalSpikes(ctx, pts, from, to, every, h) {
    for (let i = from; i < to; i += every) {
      const [x, y, r, nx, ny] = pts[i];
      const bx = x - nx * r * 0.85;
      const by = y - ny * r * 0.85;
      const tx = -ny;
      const ty = nx;
      const hh = h * Math.min(1, r / 8);
      A.shape(ctx, (c) => {
        c.moveTo(bx + tx * 3.2, by + ty * 3.2);
        c.lineTo(bx - nx * hh - tx * 1.5, by - ny * hh - ty * 1.5);
        c.lineTo(bx - tx * 3.2, by - ty * 3.2);
        c.closePath();
      }, '#ffd65a', null, { lw: 1.6 });
    }
  }
  // 蛇頭（原點＝頸，面向 +x）
  function serpentHead(ctx, m, t, open, biting) {
    const kind = eyeKind(m);
    // 兩支往後掠的金角
    [[0, -0.2], [5, 0]].forEach(([dx], i) => {
      A.shape(ctx, (c) => {
        c.moveTo(dx + 3, -9);
        c.quadraticCurveTo(dx - 5, -19, dx - 14, -20 + i * 2);
        c.quadraticCurveTo(dx - 6, -14, dx - 2, -6);
        c.closePath();
      }, i ? '#ffd65a' : '#e0a83a', i ? '#e0a83a' : '#b88428', { lw: 2, shadeY: -12 });
    });
    // 下顎
    ctx.save();
    ctx.translate(2, 3);
    ctx.rotate(open * 0.5);
    A.shape(ctx, (c) => { c.moveTo(-4, -2); c.quadraticCurveTo(10, 0, 18, 1); c.quadraticCurveTo(14, 8, 2, 8); c.quadraticCurveTo(-6, 6, -4, -2); c.closePath(); }, JADE_BELLY, '#b8e0a0', { lw: 2.2, shadeY: 4 });
    ctx.restore();
    if (open > 0.1) {
      ctx.fillStyle = A.c('#8a2440');
      ctx.beginPath();
      ctx.moveTo(4, 2);
      ctx.lineTo(18, 0);
      ctx.lineTo(16, 2 + open * 8);
      ctx.closePath();
      ctx.fill();
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
    }, JADE, JADE_S, { cel: [2, 2.5], hl: [0, -9, 4, 2] });
    // 額上發光的 ∞
    infRune(ctx, 1, -5, 3.6, 0, 0.8 + 0.2 * Math.sin(t * 3), '#ffffff', '#7affd0');
    ctx.fillStyle = A.c('#145a44');
    ctx.beginPath();
    ctx.arc(19, -3, 1.1, 0, TAU);
    ctx.fill();
    // 琥珀色豎瞳
    gemEye(ctx, 11, -4.5, 4.6, '#ffd23a', '#f08a1a', kind === 'normal' && open > 0.5 ? 'angry' : kind, { slit: true, glowA: 0.45 });
    A.blush(ctx, 13, 1.5, 2.4);
    // 吐信
    if (!biting && open < 0.1 && Math.sin(t * 2.7) > 0.8) {
      limb(ctx, (c) => { c.moveTo(21, 1); c.lineTo(28, 2); c.moveTo(28, 2); c.lineTo(31, 0); c.moveTo(28, 2); c.lineTo(31, 4); }, 3, '#ff5a7a');
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
    ctx.save();
    if (hurt) ctx.rotate(-0.05);
    if (wheel) {
      const R = 27;
      const cy = -37;
      // 滾動的殘影弧（翡翠綠）
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a0 = -t * 14 + i * 2.1;
        ctx.strokeStyle = 'rgba(120,255,200,0.5)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, cy, R + 14, a0, a0 + 0.9);
        ctx.stroke();
      }
      ctx.restore();
      speedLines(ctx, -42, cy, 52, 5, 24, t, 'rgba(190,255,225,0.85)');
      glowH(ctx, 0, cy, 54, '#5affb8', 0.4);
      ctx.save();
      ctx.translate(0, cy);
      ctx.rotate(t * 11);
      const pts = [];
      const N = 46;
      const a0 = -PI / 2 + 0.55;
      for (let i = 0; i <= N; i++) {
        const q = i / N;
        const a = a0 + q * (TAU - 0.5);
        const r = 2.5 + Math.min(1, q * 3) * 8;
        const nx = Math.cos(a);
        const ny = Math.sin(a);
        pts.push([nx * R, ny * R, r, -nx, -ny]);
      }
      // 外側的金鰭（在環的外緣）
      for (let i = 6; i < N - 2; i += 4) {
        const [x, y, r, nx, ny] = pts[i];
        const bx = x - nx * r * 0.85;
        const by = y - ny * r * 0.85;
        A.shape(ctx, (c) => {
          c.moveTo(bx + ny * 3.2, by - nx * 3.2);
          c.lineTo(bx - nx * 7, by - ny * 7);
          c.lineTo(bx - ny * 3.2, by + nx * 3.2);
          c.closePath();
        }, '#ffd65a', null, { lw: 1.6 });
      }
      tube(ctx, pts, JADE, JADE_S, JADE_BELLY);
      for (let i = 0; i < 6; i++) {
        const q = ((i / 6 + t * 0.6) % 1) * 0.85 + 0.12;
        const a = a0 + q * (TAU - 0.5);
        infRune(ctx, Math.cos(a) * R, Math.sin(a) * R, 3.4, a + PI / 2, 0.95, '#ffffff', '#7affd0');
      }
      ctx.save();
      const ha = a0 + TAU - 0.35;
      ctx.translate(Math.cos(ha) * R, Math.sin(ha) * R);
      ctx.rotate(ha + PI / 2);
      ctx.scale(1.25, 1.25);
      ctx.translate(-6, 0);
      serpentHead(ctx, m, t, 0.15, true);
      ctx.restore();
      ctx.restore();
      // 環中心：一個不轉的大 ∞ 印記
      infRune(ctx, 0, cy, 9 + Math.sin(t * 6) * 0.8, 0, 1, '#ffffff', '#5affb8');
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha *= (1 - q) * 0.8;
        ctx.fillStyle = A.c('#c8f0d8');
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
    const N = 48;
    const x0 = -58 + coil * 10;
    const x1 = 30 + coil * -4 + lunge * 14;
    const wav = walk ? t * 7 : t * 1.5;
    const raw = [];
    for (let i = 0; i <= N; i++) {
      const q = i / N;
      const x = x0 + (x1 - x0) * q;
      const amp = (walk ? 5 : 3) * (1 - q * 0.4) + coil * 6;
      let y = -12 + Math.sin(q * 8 - wav) * amp * (q > 0.85 ? (1 - q) / 0.15 : 1);
      if (q > 0.78) {
        const k = (q - 0.78) / 0.22;
        y -= k * k * (18 + coil * 10 - lunge * 4);
      }
      const r = 2.2 + Math.min(1, q * 2.4) * 9 - (q > 0.8 ? (q - 0.8) * 8 : 0);
      raw.push([x, y, r]);
    }
    raw.forEach((p, i) => {
      const a = raw[Math.max(0, i - 1)];
      const b = raw[Math.min(raw.length - 1, i + 1)];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const L = Math.hypot(dx, dy) || 1;
      let nx = -dy / L;
      let ny = dx / L;
      if (ny < 0) { nx = -nx; ny = -ny; }
      pts.push([p[0], p[1], p[2], nx, ny]);
    });
    // 光環：身後一圈淡淡的翡翠 ∞ 法陣
    runeRing(ctx, -10, -8, 50, t * 0.4, '120,255,200', wind ? 0.8 : 0.3, 12, 0.22);
    // 尾尖：金色的環扣
    const tp = raw[0];
    A.shape(ctx, (c) => { c.moveTo(tp[0] + 2, tp[1] - 2.5); c.lineTo(tp[0] - 9, tp[1] - 1); c.lineTo(tp[0] + 2, tp[1] + 2.5); c.closePath(); }, '#ffd65a', '#d8a83a', { lw: 1.8, shadeY: tp[1] });
    dorsalSpikes(ctx, pts, 8, N - 6, 4, 7);
    tube(ctx, pts, JADE, JADE_S, JADE_BELLY);
    [6, 10].forEach((i) => {
      const [x, y, r] = pts[i];
      A.ellipse(ctx, x, y, 2.2, r + 0.5, '#ffd65a', '#d8a83a', { lw: 1.4, hl: false });
    });
    // 流動的 ∞ 符文（從尾流向頭，淡入淡出表現循環）
    for (let i = 0; i < 6; i++) {
      const q = (i / 6 + t * 0.25) % 1;
      const idx = Math.round(6 + q * (N - 12));
      const p = pts[idx];
      const a = Math.sin(q * PI);
      infRune(ctx, p[0], p[1] - p[2] * 0.12, Math.max(2.4, p[2] * 0.5), 0, 0.35 + 0.65 * a, '#ffffff', '#7affd0');
    }
    // 頭
    const hp = raw[N];
    ctx.save();
    ctx.translate(hp[0] - 2, hp[1] - 2);
    ctx.rotate(wind ? -0.3 : strike ? 0.15 : Math.sin(t * 1.8) * 0.06);
    ctx.scale(1.45, 1.45);
    serpentHead(ctx, m, t, wind ? 0.8 : strike ? 0.6 : hurt ? 0.3 : 0, false);
    ctx.restore();
    if (strike) speedLines(ctx, -30, -24, 24, 3, 18, t, 'rgba(190,255,225,0.85)');
    ctx.restore();
  }

  // ── 時計蝸牛：珊瑚色的蝸牛背著一台黃銅紅銅的發條殼（大齒輪、錶盤、煙囪冒蒸汽、爐窗透著火光）；fx.gear 施加速魔法 ──
  const SNAIL = ['#ff9f8a', '#d8675e'];
  const COPPER = ['#e8804a', '#a8502c'];
  const BRASS2 = ['#ffd052', '#c8902e'];
  function steamPuff(ctx, x, y, r, a) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    A.shape(ctx, (c) => {
      c.moveTo(x - r, y);
      c.arc(x - r * 0.35, y - r * 0.2, r * 0.7, PI * 0.9, PI * 1.9);
      c.arc(x + r * 0.45, y - r * 0.1, r * 0.62, PI * 1.3, PI * 0.3);
      c.arc(x, y + r * 0.25, r * 0.6, 0, PI);
      c.closePath();
    }, '#ffffff', '#dfe8f0', { lw: 1.8, shadeY: y + r * 0.2 });
    ctx.restore();
  }
  function clocksnail(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const g = amt(fx.gear, 0);
    const walk = walking(m);
    const stretch = walk ? Math.sin(t * 6) * 2 : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    if (strike) ctx.translate(6, 0);
    const sx = -8;
    const sy = -42;
    const spin = t * (0.5 + g * 7);

    // 加速光環：從殼往外擴散的金圈
    if (g > 0) {
      glowH(ctx, sx, sy, 74, '#ffcc60', 0.45 * g);
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.4 + i / 3) % 1;
        ctx.strokeStyle = 'rgba(255,214,110,' + ((1 - q) * 0.9 * g).toFixed(3) + ')';
        ctx.lineWidth = 3 * (1 - q) + 1;
        ctx.beginPath();
        ctx.ellipse(sx, sy + 10, 32 + q * 40, (32 + q * 40) * 0.8, 0, 0, TAU);
        ctx.stroke();
      }
      runeRing(ctx, sx, -6, 46, t * 1.5, '255,214,110', 0.8 * g, 12, 0.22);
    }
    // 身體
    const bodyP = (c) => {
      c.moveTo(-44 - stretch, -2);
      c.quadraticCurveTo(-42, -12, -26, -14);
      c.lineTo(20, -14);
      c.bezierCurveTo(26, -20, 28, -32, 36, -36);
      c.bezierCurveTo(46, -40, 53, -30, 51, -20);
      c.bezierCurveTo(49, -10, 47, -4, 43 + stretch, -1);
      c.quadraticCurveTo(0, 2, -44 - stretch, -2);
      c.closePath();
    };
    const eyeStalk = (bx, by, tx, ty, back) => {
      limb(ctx, (c) => { c.moveTo(bx, by); c.quadraticCurveTo(bx + 2, (by + ty) / 2, tx, ty); }, 5.5, back ? SNAIL[1] : SNAIL[0]);
    };
    const bob = Math.sin(t * 3) * 1.5;
    eyeStalk(40, -34, 40 + bob, -55, true);
    A.shape(ctx, bodyP, SNAIL[0], SNAIL[1], { cel: [3, 3], hl: [34, -32, 3, 2] });
    // 身側的金色斑點
    ctx.fillStyle = A.c('#ffd8a0');
    [[-30, -8], [-18, -9], [-6, -9], [30, -20]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, TAU);
      ctx.fill();
    });

    // 煙囪（殼後上方）與蒸汽
    const cx0 = sx + 12;
    limb(ctx, (c) => { c.moveTo(cx0, sy - 18); c.lineTo(cx0 + 4, sy - 40); }, 8, BRASS2[0]);
    A.shape(ctx, (c) => A.roundRect(c, cx0 - 2, sy - 47, 13, 6, 2), COPPER[0], COPPER[1], { lw: 2, hl: false, shadeY: sy - 43 });
    const nPuff = g > 0.3 ? 5 : 3;
    for (let i = 0; i < nPuff; i++) {
      const q = (t * (0.6 + g * 1.4) + i / nPuff) % 1;
      steamPuff(ctx, cx0 + 5 - q * 18 + Math.sin(t * 2 + i) * 3, sy - 50 - q * 34, 4 + q * 7, (1 - q) * 0.95);
    }
    // 殼：紅銅渦殼＋黃銅大齒輪外緣＋錶盤＋小齒輪
    gear(ctx, sx - 24, sy - 20, 9, 8, -spin * 1.8, BRASS2[0], BRASS2[1], { lw: 2, spoke: '#8a5a1e' });
    gear(ctx, sx, sy, 27, 14, spin, BRASS2[0], BRASS2[1], { hole: false, tooth: 5.5 });
    A.ellipse(ctx, sx, sy, 24, 24, COPPER[0], COPPER[1], { lw: 2.2, hl: [sx - 10, sy - 13, 5, 3] });
    // 殼上的螺旋紋
    ctx.strokeStyle = A.c('#8a3e22');
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const q = i / 40;
      const a = -PI / 2 + q * TAU * 1.3 + spin * 0.2;
      const r = 22 - q * 10;
      i ? ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r) : ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
    }
    ctx.stroke();
    // 鉚釘
    ctx.fillStyle = A.c('#ffe6a0');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      ctx.beginPath();
      ctx.arc(sx + Math.cos(a) * 21, sy + Math.sin(a) * 21, 1.4, 0, TAU);
      ctx.fill();
    }
    clockFace(ctx, sx + 1, sy + 1, 13, {
      hr: spin * 0.8 + 1,
      mn: spin * 4 + 0.5,
      glowA: g * 0.8,
      face: g > 0.3 ? '#fff0b8' : '#fff8e8',
      rim: BRASS2[0],
      rimShade: BRASS2[1],
      tick: '#8a3e22',
      handCol: '#5a2a1a',
      handCol2: '#1aa89a',
      lw: 2,
    });
    // 爐窗：殼下方透出的火光
    const fire = 0.6 + 0.3 * Math.sin(t * 9) + g * 0.4;
    glowH(ctx, sx + 20, sy + 16, 12, '#ff8a30', 0.5 * fire);
    A.ellipse(ctx, sx + 20, sy + 16, 6, 5, '#ffcc5a', '#ff7a2a', { lw: 2, hl: false, shadeAt: 0 });
    ctx.strokeStyle = A.c('#6a3a1e');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx + 17, sy + 12);
    ctx.lineTo(sx + 17, sy + 20);
    ctx.moveTo(sx + 20, sy + 11);
    ctx.lineTo(sx + 20, sy + 21);
    ctx.moveTo(sx + 23, sy + 12);
    ctx.lineTo(sx + 23, sy + 20);
    ctx.stroke();
    // 殼頂的小齒輪
    gear(ctx, sx + 22, sy - 20, 7, 7, spin * 2.6, '#f0c060', '#b8862a', { lw: 1.8 });

    eyeStalk(46, -30, 50 + bob * 0.6, -49, false);
    const kind = eyeKind(m);
    const ek = wind && kind === 'normal' ? 'angry' : kind;
    // 黃銅護目鏡框的眼睛
    [[40 + bob, -57, 5.4], [50 + bob * 0.6, -51, 6]].forEach(([x, y, r]) => {
      A.ellipse(ctx, x, y, r + 1.8, r + 1.8, BRASS2[0], BRASS2[1], { lw: 2, hl: false, shadeAt: 0.3 });
      if (ek === 'normal' || ek === 'angry') gemEye(ctx, x, y, r * 0.9, '#8affea', '#28c0b0', ek, { glowA: 0.35 + g * 0.4 });
      else {
        A.ellipse(ctx, x, y, r, r, '#fff8ec', null, { lw: 1.6, hl: false });
        A.eye(ctx, x, y, r * 0.5, r * 0.5, ek, 0);
      }
    });
    smallMouth(ctx, 45, -24, strike || hurt, 0.8);
    A.blush(ctx, 38, -26, 2.8);
    if (g > 0) {
      for (let i = 0; i < 4; i++) {
        const a = t * 3 + i * 1.6;
        sparkle(ctx, sx + Math.cos(a) * 40, sy + Math.sin(a) * 32, 3 + Math.sin(t * 8 + i) * 1.2, '#fff2a8');
      }
      speedLines(ctx, -40, -24, 30, 3, 16, t, 'rgba(255,230,150,' + (0.8 * g).toFixed(3) + ')');
    }
    ctx.restore();
  }

  // ── 次元袋鼠：桃紅色的拳擊袋鼠，戴著青光護腕，育兒袋是一個紫青雙色旋轉的空間漩渦；fx.warp（1＝完全消失在袋中） ──
  const ROO = ['#ff7eb4', '#d84a8e'];
  const ROO_D = ['#e8609c', '#b23a78'];
  const ROO_BELLY = '#ffe6f0';
  function portal(ctx, x, y, rx, ry, t, a) {
    if (!(a > 0) || !(rx > 0.5)) return;
    ctx.save();
    ctx.globalAlpha *= a;
    glowH(ctx, x, y, rx * 2.4, '#a86aff', 0.6);
    glowH(ctx, x, y, rx * 1.5, '#5af0ff', 0.4);
    const P = (c) => c.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.save();
    ctx.beginPath();
    P(ctx);
    ctx.clip();
    const g = ctx.createRadialGradient(x, y, 1, x, y, rx);
    g.addColorStop(0, A.c('#ffffff'));
    g.addColorStop(0.15, A.c('#8af4ff'));
    g.addColorStop(0.45, A.c('#6a3ae0'));
    g.addColorStop(1, A.c('#1a0a48'));
    ctx.fillStyle = g;
    ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    // 漩渦臂：紫、青交錯
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = k % 2 ? 'rgba(110,240,255,0.95)' : 'rgba(220,140,255,0.95)';
      ctx.lineWidth = Math.max(1.5, rx * 0.16);
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const q = i / 20;
        const aa = -t * 4 + k * (TAU / 4) + q * 3.4;
        const rr = rx * (0.1 + q * 0.9);
        const px = Math.cos(aa) * rr;
        const py = Math.sin(aa) * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const aa = t * 2 + i * 1.1;
      const rr = rx * (0.3 + hash(i) * 0.6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.cos(aa) * rr - 0.8, Math.sin(aa) * rr - 0.8, 1.6, 1.6);
    }
    ctx.restore();
    ctx.beginPath();
    P(ctx);
    ctx.lineWidth = 4;
    ctx.strokeStyle = A.c('#b070ff');
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = A.c('#7af4ff');
    ctx.stroke();
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.stroke();
    // 繞著袋口轉的小碎片
    for (let i = 0; i < 3; i++) {
      const aa = t * 3 + (i / 3) * TAU;
      sparkle(ctx, x + Math.cos(aa) * (rx + 4), y + Math.sin(aa) * (ry + 3), 2.4, i % 2 ? '#8af4ff' : '#e8b8ff');
    }
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
      ctx.translate(px, py);
      ctx.rotate(warp * 2.2);
      ctx.scale(s, s);
      ctx.translate(-px, -py);
      if (wind) {
        ctx.translate(0, 4);
        ctx.scale(1.03, 0.94);
      }
      const lean = strike ? -0.3 : 0;
      ctx.translate(-22, -8);
      ctx.rotate(lean);
      ctx.translate(22, 8);
      // 尾巴（尾端有一圈青光）
      const tailP = (c) => {
        c.moveTo(-14, -40);
        c.bezierCurveTo(-30, -30, -40, -14, -50, -4);
        c.quadraticCurveTo(-53, 0, -46, 0);
        c.bezierCurveTo(-34, -4, -18, -14, -4, -24);
        c.closePath();
      };
      A.shape(ctx, tailP, ROO[0], ROO[1], { cel: [2.5, 2.5], shadeY: -20 });
      glowH(ctx, -48, -2, 9, '#5af0ff', 0.6);
      // 後方的手（拳套）
      limb(ctx, (c) => { c.moveTo(12, -70); c.quadraticCurveTo(20, -66, 24, -60); }, 6, ROO_D[0]);
      A.ellipse(ctx, 26, -58, 5.5, 5, ROO_D[0], ROO_D[1], { lw: 2, hl: false });
      const footA = strike ? -0.95 : wind ? 0.08 : 0;
      const foot = (dx, col, sh, thigh) => {
        ctx.save();
        ctx.translate(-8 + dx, -12);
        ctx.rotate(footA);
        A.shape(ctx, (c) => {
          c.moveTo(-9, -8);
          c.quadraticCurveTo(-12, 8, -6, 12);
          c.lineTo(30, 12);
          c.quadraticCurveTo(37, 10, 33, 5);
          c.quadraticCurveTo(16, 3, 5, -8);
          c.closePath();
        }, col, sh, { cel: [2, 2], lw: 2.4 });
        // 腳掌上的青色能量紋
        ctx.strokeStyle = 'rgba(110,240,255,0.9)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(8, 7);
        ctx.lineTo(14, 5);
        ctx.lineTo(20, 8);
        ctx.stroke();
        ctx.restore();
        if (thigh) {
          A.ellipse(ctx, -8 + dx, -30, 15, 20, col, sh, { cel: [3, 3], hl: [-13 + dx, -40, 3, 5], rot: 0.35 });
          // 大腿上的星形印記
          glowH(ctx, -11 + dx, -32, 7, '#5af0ff', 0.5);
          ctx.fillStyle = A.c('#9af6ff');
          ctx.beginPath();
          starPath(ctx, -11 + dx, -32, 4, 1.6, 4, 0);
          ctx.fill();
        }
      };
      foot(6, ROO_D[0], ROO_D[1], false);
      A.shape(ctx, (c) => {
        c.moveTo(-18, -34);
        c.bezierCurveTo(-24, -60, -8, -84, 8, -82);
        c.bezierCurveTo(22, -80, 24, -58, 22, -44);
        c.bezierCurveTo(20, -30, 4, -24, -8, -24);
        c.quadraticCurveTo(-16, -26, -18, -34);
        c.closePath();
      }, ROO[0], ROO[1], { cel: [4, 3.5], hl: [-4, -70, 4, 7] });
      A.shape(ctx, (c) => c.ellipse(9, -52, 12, 23, -0.12, 0, TAU), ROO_BELLY, null, { noStroke: true });
      foot(0, ROO[0], ROO[1], true);
      // 頭
      const hx = 12;
      const hy = -95 + (wind ? 2 : 0);
      const ear = (x, back) => {
        A.shape(ctx, (c) => { c.moveTo(x - 5, hy - 7); c.quadraticCurveTo(x - 12, hy - 31, x - 5, hy - 34); c.quadraticCurveTo(x + 5, hy - 29, x + 5, hy - 7); c.closePath(); }, back ? ROO_D[0] : ROO[0], back ? ROO_D[1] : ROO[1], { lw: 2.4, shadeY: hy - 18 });
        if (!back) {
          ctx.fillStyle = A.c('#9a5cf0');
          ctx.beginPath();
          ctx.ellipse(x - 3.5, hy - 19, 2.4, 9, 0.1, 0, TAU);
          ctx.fill();
        }
        // 耳尖的青色光點
        glowH(ctx, x - 5, hy - 32, 6, '#5af0ff', back ? 0.35 : 0.6);
      };
      ear(hx - 3, true);
      A.ellipse(ctx, hx, hy, 15, 13, ROO[0], ROO[1], { cel: [2.5, 2.5], hl: [hx - 6, hy - 6, 3.5, 2] });
      A.ellipse(ctx, hx + 14, hy + 3, 9.5, 7, ROO_BELLY, '#f0c8d8', { lw: 2.2, hl: false });
      A.ellipse(ctx, hx + 21.5, hy, 2.8, 2.1, '#6a2a50', null, { lw: 1.2, hl: false });
      ear(hx + 7, false);
      const kind = eyeKind(m);
      gemEye(ctx, hx + 6, hy - 2, 4.4, '#8af4ff', '#34b8e0', (wind || strike) && kind === 'normal' ? 'angry' : kind, { glowA: 0.4 });
      smallMouth(ctx, hx + 16, hy + 8, strike, 0.7);
      A.blush(ctx, hx + 1, hy + 5, 3);
      // 額頭的次元印記
      A.shape(ctx, (c) => { c.moveTo(hx - 2, hy - 12); c.lineTo(hx + 1, hy - 8); c.lineTo(hx - 2, hy - 4); c.lineTo(hx - 5, hy - 8); c.closePath(); }, '#8af4ff', null, { lw: 1.6 });
      // 前手（拳套＋青光護腕）
      const pa = strike ? -0.2 : wind ? 0.3 : 0;
      limb(ctx, (c) => { c.moveTo(16, -72); c.quadraticCurveTo(26, -70 + pa * 10, 30, -64 + pa * 10); }, 6.5, ROO[0]);
      glowH(ctx, 28, -66 + pa * 10, 8, '#5af0ff', 0.5);
      A.shape(ctx, (c) => A.roundRect(c, 25, -69 + pa * 10, 6, 6, 2), '#8af4ff', '#40c8e8', { lw: 1.6, hl: false, shadeY: -65 + pa * 10 });
      A.ellipse(ctx, 34, -62 + pa * 10, 6.5, 6, ROO[0], ROO[1], { lw: 2.2, hl: [32, -64 + pa * 10, 2, 1.2] });
      // 袋口的毛邊
      A.shape(ctx, (c) => {
        c.moveTo(-3, -48);
        c.quadraticCurveTo(10, -39, 25, -48);
        c.quadraticCurveTo(23, -28, 10, -28);
        c.quadraticCurveTo(-3, -28, -3, -48);
        c.closePath();
      }, ROO_BELLY, '#f0c8d8', { lw: 2.2, shadeY: -34 });
      ctx.restore();
    }
    // 袋口的次元漩渦（最上層，吸人時變大，完全消失時收小）
    const close = warp > 0.85 ? (1 - warp) / 0.15 : 1;
    const pr = (15.5 + warp * 12) * (0.35 + 0.65 * close);
    portal(ctx, px + 1, py + 1, pr, pr * (0.62 + warp * 0.38), t, Math.max(0.35, close));
    if (warp > 0 && warp < 1) {
      for (let i = 0; i < 8; i++) {
        const q = (t * 1.8 + i / 8) % 1;
        const a = i * 0.8 + q * 3;
        const r = (1 - q) * 44;
        sparkle(ctx, px + Math.cos(a) * r, py + Math.sin(a) * r * 0.8, 2.6, i % 2 ? '#8af4ff' : '#e8b8ff');
      }
    }
    ctx.restore();
  }

  // ── 重力水母：暗物質做的深紫色傘（邊緣亮著洋紅光），傘裡懸著一顆被光環包住的小黑星，觸手是被重力扭曲的彩色光；fx.pull 吸引中 ──
  function blackStar(ctx, x, y, r, t, k, gk) {
    glowH(ctx, x, y, r * (gk || 3.4), '#b060ff', 0.6 + 0.3 * k);
    ctx.save();
    ctx.translate(x, y);
    // 吸積盤（後半）
    ctx.save();
    ctx.rotate(-0.35);
    ctx.scale(1, 0.32);
    ctx.lineWidth = r * 0.75;
    ctx.strokeStyle = A.c('#ff9a4a');
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.75, PI, TAU);
    ctx.stroke();
    ctx.restore();
    // 光子環（重力透鏡：黑星上下各一道亮弧）
    ctx.strokeStyle = A.c('#ffe8b0');
    ctx.lineWidth = r * 0.28;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, TAU);
    ctx.stroke();
    A.ellipse(ctx, 0, 0, r, r, '#0a0414', null, { lw: 2, hl: false });
    // 吸積盤（前半）＋轉動的亮點
    ctx.save();
    ctx.rotate(-0.35);
    ctx.scale(1, 0.32);
    ctx.lineWidth = r * 0.75;
    ctx.strokeStyle = A.c('#ffc870');
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.75, 0, PI);
    ctx.stroke();
    ctx.lineWidth = r * 0.25;
    ctx.strokeStyle = A.c('#fff6d8');
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.75, 0.2, PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + i * 2.1;
      if (Math.sin(a) > 0) {
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 1.75, Math.sin(a) * r * 1.75, r * 0.24, 0, TAU);
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
    const cy = -78 + Math.sin(t * 2) * 3;
    ctx.save();
    if (hurt) ctx.rotate(-0.07);
    glowH(ctx, 0, cy, 70, '#a050ff', 0.3 + (pull ? 0.25 : 0));
    // 吸引：周圍空間扭曲、往中心收縮的波紋圈
    if (pull) {
      for (let i = 0; i < 4; i++) {
        const q = 1 - ((t * 0.9 + i / 4) % 1);
        const R = 28 + q * 72;
        ctx.strokeStyle = 'rgba(' + (i % 2 ? '120,230,255' : '220,140,255') + ',' + (Math.sin(q * PI) * 0.85).toFixed(3) + ')';
        ctx.lineWidth = 2.6;
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
      for (let i = 0; i < 10; i++) {
        const q = (t * 0.8 + i / 10) % 1;
        const a = i * 0.7 + q * 4;
        const r = (1 - q) * 92 + 10;
        sparkle(ctx, Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, 2.6 * (0.4 + q), i % 2 ? '#bff4ff' : '#f0d0ff');
      }
    }
    // 觸手：被重力扭曲的光（洋紅、青、金三色）
    const rimY = cy + 24;
    const TCOL = ['255,110,220', '100,230,255', '255,210,110', '100,230,255', '255,110,220'];
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const x0 = -26 + i * 13;
      const len = 60 - Math.abs(i - 2) * 6 + (strike ? 10 : 0);
      const sway = wind ? 1.8 : 1;
      ctx.beginPath();
      for (let j = 0; j <= 18; j++) {
        const q = j / 18;
        const y = rimY + q * len;
        const w = Math.sin(q * 9 - t * 5 + i) * (2 + q * 6) * sway;
        const drift = Math.sin(t * 1.6 + i) * q * 6 + (pull ? -x0 * q * 0.3 : 0);
        const x = x0 * (1 + q * 0.25) + w + drift;
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = 'rgba(' + TCOL[i] + ',0.35)';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(' + TCOL[i] + ',0.95)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 觸手尾端的小光珠
      const q = 1;
      const ex = x0 * (1 + q * 0.25) + Math.sin(q * 9 - t * 5 + i) * 8 * sway + Math.sin(t * 1.6 + i) * 6 + (pull ? -x0 * 0.3 : 0);
      glow(ctx, ex, rimY + len, 6, TCOL[i], 0.9);
    }
    ctx.restore();
    // 口腕（中間的荷葉狀，深紫帶光）
    A.shape(ctx, (c) => {
      c.moveTo(-9, rimY - 2);
      c.bezierCurveTo(-13, rimY + 14, 4, rimY + 12, -2, rimY + 28 + Math.sin(t * 3) * 3);
      c.bezierCurveTo(10, rimY + 16, 13, rimY + 8, 9, rimY - 2);
      c.closePath();
    }, '#8a4ae0', '#5a2aa8', { lw: 2, shadeY: rimY + 10 });

    // 傘
    ctx.save();
    ctx.translate(0, cy);
    ctx.scale(pulse * (wind ? 1.06 : 1), (2 - pulse) * (wind ? 0.94 : 1));
    const bell = (c) => {
      c.moveTo(-42, 22);
      c.bezierCurveTo(-46, -8, -28, -32, 0, -32);
      c.bezierCurveTo(28, -32, 46, -8, 42, 22);
      const n = 7;
      for (let i = 0; i < n; i++) {
        const x0 = 42 - (i / n) * 84;
        const x1 = 42 - ((i + 1) / n) * 84;
        c.quadraticCurveTo((x0 + x1) / 2, 31, x1, 22);
      }
      c.closePath();
    };
    // 暗物質本體：深紫漸層＋星雲
    ctx.save();
    ctx.beginPath();
    bell(ctx);
    ctx.clip();
    const bg = ctx.createRadialGradient(-6, -8, 4, 0, 0, 50);
    bg.addColorStop(0, A.c('#5a2aa0'));
    bg.addColorStop(0.6, A.c('#2a1060'));
    bg.addColorStop(1, A.c('#12062e'));
    ctx.fillStyle = bg;
    ctx.fillRect(-50, -40, 100, 75);
    ctx.globalAlpha *= 0.7;
    starfield(ctx, -46, -34, 92, 66, 21, t, 1.1);
    ctx.globalAlpha /= 0.7;
    glowH(ctx, 18, 6, 22, '#ff5ad0', 0.35);
    glowH(ctx, -22, -4, 20, '#40c8ff', 0.3);
    // 內緣的洋紅邊光
    ctx.beginPath();
    bell(ctx);
    ctx.strokeStyle = A.c('#e070ff');
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = A.c('#ffb8f8');
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
    // 內傘的扭曲光圈
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = A.c('#c8a0ff');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(-4, 2, 30, 18, 0, PI * 1.05, PI * 1.95);
    ctx.stroke();
    ctx.restore();
    blackStar(ctx, -6, -10, 8.5, t, pull ? 1 : wind ? 0.6 : 0);
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-26, -16, 7, 3.6, -0.7, 0, TAU);
    ctx.fill();
    strokeOut(ctx, bell, 2.8);
    // 傘緣的一圈光點
    for (let i = 0; i < 7; i++) {
      const x = 42 - ((i + 0.5) / 7) * 84;
      const k = 0.6 + 0.4 * Math.sin(t * 4 + i);
      glowH(ctx, x, 27, 5, '#ff8af0', 0.8 * k);
      ctx.fillStyle = A.c('#ffe0fa');
      ctx.beginPath();
      ctx.arc(x, 27, 1.6, 0, TAU);
      ctx.fill();
    }
    // 臉：發光的冰青大眼
    const kind = eyeKind(m);
    const ek = (wind || pull) && kind === 'normal' ? 'angry' : kind;
    gemEye(ctx, 12, 10, 5, '#bff6ff', '#58c8f0', ek, { glowA: 0.6 });
    gemEye(ctx, 27, 9, 4.6, '#bff6ff', '#58c8f0', ek, { glowA: 0.6 });
    smallMouth(ctx, 20, 18, strike || hurt, 0.8);
    A.blush(ctx, 6, 17, 3);
    A.blush(ctx, 33, 16, 2.6);
    ctx.restore();
    ctx.restore();
  }

  // ── 平行狐：身體被一道發光的裂縫分成兩個世界——前半是焰橙色、後半是錯開的冰藍色，兩條大尾巴各屬一邊；fx.twin 分身中、fx.fake 平行世界的假身 ──
  const EMBER = { fur: ['#ff8a36', '#d45820'], furB: ['#e8702a', '#b04616'], cream: '#fff2dc', tip: '#ffd65a', paw: '#5a2a24', eye: ['#ffe04a', '#ff9a1a'], ear: '#5a2a30' };
  const ICE = { fur: ['#62c8ff', '#2e86d8'], furB: ['#48a8f0', '#246cc0'], cream: '#eefaff', tip: '#ffffff', paw: '#243a6a', eye: ['#c8f8ff', '#60c8f0'], ear: '#243a6a' };
  function foxBody(ctx, m, t, P, tails) {
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m) || strike;
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
      limb(ctx, (c) => { c.moveTo(x, -22 + by); c.lineTo(x + sw * 6, -4); }, 6.5, col);
      A.ellipse(ctx, x + sw * 6 + 1.5, -3, 4, 2.6, P.paw, null, { lw: 1.6, hl: false });
    };
    leg(-20, -step, P.furB[0]);
    leg(10, step, P.furB[0]);
    // 大尾巴：一條冰藍往上翹、一條焰橙往後甩
    const tail = (rot, T, sc) => {
      ctx.save();
      ctx.translate(-26, -30 + by);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      const tp = (c) => {
        c.moveTo(2, 5);
        c.bezierCurveTo(-16, 8, -34, 0, -38, -18);
        c.bezierCurveTo(-41, -33, -27, -39, -19, -29);
        c.bezierCurveTo(-14, -20, -6, -9, 5, -4);
        c.closePath();
      };
      A.shape(ctx, tp, T.fur[0], T.fur[1], { cel: [2.5, 2.5], noStroke: true, hl: [-26, -24, 3, 2] });
      ctx.save();
      ctx.beginPath();
      tp(ctx);
      ctx.clip();
      glowH(ctx, -31, -28, 12, T.tip, 0.8);
      ctx.fillStyle = A.c(T.tip);
      ctx.beginPath();
      ctx.ellipse(-31, -28, 10, 10, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      strokeOut(ctx, tp, A.LW);
      ctx.restore();
    };
    const sw = Math.sin(t * 3) * 0.12;
    if (tails) {
      tail(0.45 + sw, ICE, 1.05);
      tail(-0.12 - sw, EMBER, 1.1);
    }
    // 身體
    A.ellipse(ctx, -6, -26 + by, 24, 13, P.fur[0], P.fur[1], { cel: [3, 3], hl: [-16, -33 + by, 5, 2.4] });
    A.shape(ctx, (c) => c.ellipse(-2, -18 + by, 15, 4.5, 0, 0, TAU), P.cream, null, { noStroke: true });
    leg(-12, step, P.fur[0]);
    leg(16, -step, P.fur[0]);
    // 頭
    ctx.save();
    ctx.translate(18, -40 + by);
    ctx.rotate(wind ? 0.12 : strike ? 0.2 : Math.sin(t * 1.7) * 0.04);
    const ear = (x, back) => {
      A.shape(ctx, (c) => { c.moveTo(x - 8, -6); c.lineTo(x - 3, -25); c.lineTo(x + 6, -7); c.closePath(); }, back ? P.furB[0] : P.fur[0], back ? P.furB[1] : P.fur[1], { lw: 2.2, shadeY: -10 });
      if (!back) {
        ctx.fillStyle = A.c(P.ear);
        ctx.beginPath();
        ctx.moveTo(x - 4.5, -9);
        ctx.lineTo(x - 3, -19);
        ctx.lineTo(x + 2, -9);
        ctx.closePath();
        ctx.fill();
      }
    };
    ear(-4, true);
    A.shape(ctx, (c) => {
      c.moveTo(-13, 2);
      c.bezierCurveTo(-15, -11, -4, -14, 4, -13);
      c.bezierCurveTo(12, -12, 16, -6, 25, 0);
      c.quadraticCurveTo(27, 3, 23, 5);
      c.bezierCurveTo(12, 10, 0, 12, -8, 10);
      c.quadraticCurveTo(-14, 7, -13, 2);
      c.closePath();
    }, P.fur[0], P.fur[1], { cel: [2.5, 2.5], hl: [-4, -8, 3.5, 2] });
    A.shape(ctx, (c) => {
      c.moveTo(2, 3);
      c.quadraticCurveTo(12, 3, 24, 3);
      c.quadraticCurveTo(12, 10, 2, 9);
      c.quadraticCurveTo(-4, 8, -9, 10);
      c.quadraticCurveTo(-3, 5, 2, 3);
      c.closePath();
    }, P.cream, null, { noStroke: true });
    A.ellipse(ctx, 25, 1, 2.6, 2.1, '#2a1a2a', null, { lw: 1.2, hl: false });
    ear(6, false);
    // 額頭的一枚世界印記（菱形）
    A.shape(ctx, (c) => { c.moveTo(0, -12); c.lineTo(2.5, -8.5); c.lineTo(0, -5); c.lineTo(-2.5, -8.5); c.closePath(); }, P.tip, null, { lw: 1.4 });
    const kind = eyeKind(m);
    const ek = (wind || strike) && kind === 'normal' ? 'angry' : kind;
    gemEye(ctx, 10, -3, 3.8, P.eye[0], P.eye[1], ek, { slit: true, glowA: 0.5 });
    if (ek === 'normal') {
      // 狡猾的上眼瞼
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(5.5, -6.2);
      ctx.quadraticCurveTo(10, -9, 14.5, -5.2);
      ctx.stroke();
    }
    smallMouth(ctx, 18, 6, strike, 0.7);
    A.blush(ctx, 5, 4.5, 2.4);
    ctx.restore();
    ctx.restore();
  }
  // 兩個世界的分界：一道斜斜的鋸齒裂縫（x = seamX(y)），左後方是冰藍的世界
  function seamPts(t) {
    const pts = [];
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const y = -6 - (i / n) * 48;
      const x = -4 + (y + 30) * 0.35 + (i % 2 ? 3.5 : -3.5) + Math.sin(t * 7 + i) * 0.8;
      pts.push([x, y]);
    }
    return pts;
  }
  function parallelfox(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const twin = !!fx.twin;
    const fake = !!fx.fake;
    const jit = Math.sin(t * 23) * 0.6 + (Math.floor(t * 6) % 3 === 0 ? 1.2 : 0);
    const off = twin ? 12 + Math.sin(t * 6) * 3 : 3 + jit * 0.5;
    ctx.save();
    // 分身中：錯開的另一個自己（冰藍色殘影）
    if (twin) {
      ctx.save();
      ctx.globalAlpha *= 0.45;
      ctx.translate(-off, -off * 0.35);
      withTint(fake ? '#b070ff' : '#40b8ff', 0.7, () => foxBody(ctx, m, t - 0.08, ICE, true));
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= 0.3;
      ctx.translate(off * 0.8, off * 0.2);
      withTint(fake ? '#b070ff' : '#ff9a40', 0.7, () => foxBody(ctx, m, t - 0.16, EMBER, true));
      ctx.restore();
    }
    const S = seamPts(t);
    const drawReal = () => {
      foxBody(ctx, m, t, EMBER, true);
      // 冰藍的世界：裂縫左後方重畫一次，往左上錯開
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-90, 10);
      S.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(-90, -90);
      ctx.closePath();
      ctx.clip();
      ctx.translate(-2.5, -1.5);
      foxBody(ctx, m, t + 0.03, ICE, true);
      ctx.restore();
      // 發光的裂縫
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      S.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = 'rgba(220,150,255,0.45)';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = A.c('#e8b8ff');
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      const q = (t * 0.8) % 1;
      const k = Math.floor(q * (S.length - 1));
      sparkle(ctx, S[k][0], S[k][1], 3, '#ffffff');
    };
    if (fake) {
      // 假身：藍紫色、半透明，被水平切成幾段錯位（故障感）
      const bands = [[-80, -52], [-52, -34], [-34, -18], [-18, 10]];
      const seed = Math.floor(t * 7);
      ctx.save();
      ctx.globalAlpha *= 0.6;
      bands.forEach(([y0, y1], i) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-90, y0, 180, y1 - y0);
        ctx.clip();
        ctx.translate((hash(seed * 4 + i) - 0.5) * 8, 0);
        withTint('#8a64f0', 0.62, drawReal);
        ctx.restore();
      });
      ctx.restore();
    } else {
      drawReal();
    }
    // 掃描線（分身中／假身）
    if (twin || fake) {
      ctx.fillStyle = fake ? 'rgba(180,150,255,0.55)' : 'rgba(150,230,255,0.45)';
      for (let i = 0; i < 3; i++) {
        const y = -8 - ((t * 60 + i * 23) % 66);
        ctx.fillRect(-50 + hash(i + Math.floor(t * 5)) * 20, y, 50 + hash(i * 3) * 30, 1.6);
      }
    }
    ctx.restore();
  }

  // ── 星座魚：一條半透明的星雲魚，身體由金白色的星點與星光連線構成，拖著飄帶一樣的光尾；fx.link 連線發光 ──
  const FISH_STARS = [
    [55, -40], [40, -58], [16, -65], [-10, -61], [-30, -50], [-38, -40], [-30, -28], [-8, -20], [20, -18], [42, -24],
    [-62, -68], [-52, -40], [-62, -12], [6, -84], [24, -66], [2, -6], [16, -38],
  ];
  const FISH_LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0], [5, 10], [10, 11], [11, 12], [12, 5], [3, 13], [13, 14], [14, 2], [7, 15], [15, 8], [2, 16], [16, 8], [16, 9]];
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
    glowH(ctx, 0, -42, 80, '#5a8aff', 0.25);
    if (link > 0) glowH(ctx, 0, -40, 96, '#ffd86a', 0.4 * link);
    const tailT = (x, y) => {
      if (x > -38) return [x, y];
      const dx = x + 38;
      const dy = y + 40;
      return [-38 + dx * Math.cos(wag) - dy * Math.sin(wag), -40 + dx * Math.sin(wag) + dy * Math.cos(wag)];
    };
    const stars = FISH_STARS.map(([x, y]) => tailT(x, y));
    // 半透明星雲填色（漸層經過 A.c，受擊閃白時會一起亮）
    const nebula = (path, a, cx, cyy, R) => {
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      ctx.globalAlpha *= a;
      const g = ctx.createRadialGradient(cx, cyy, 2, cx, cyy, R);
      g.addColorStop(0, A.c('#8af0ff'));
      g.addColorStop(0.35, A.c('#4a7af0'));
      g.addColorStop(0.75, A.c('#5a2ab8'));
      g.addColorStop(1, A.c('#24104e'));
      ctx.fillStyle = g;
      ctx.fillRect(-90, -100, 170, 110);
      glowH(ctx, cx - R * 0.4, cyy + R * 0.2, R * 0.6, '#ff5ad0', 0.35);
      starfield(ctx, -90, -100, 170, 110, 3, t, 0.9);
      ctx.restore();
      // 雙層描邊：外深、內亮（像發光的星座邊界）
      ctx.beginPath();
      path(ctx);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = A.c('#9ae8ff');
      ctx.lineWidth = 1.3;
      ctx.stroke();
    };
    // 飄帶光尾（在尾鰭後面飄）
    ctx.save();
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let j = 0; j <= 14; j++) {
        const q = j / 14;
        const [bx, by] = tailT(-56 - q * 26, -40 + (k - 1) * 14 + (k - 1) * q * 16);
        const y = by + Math.sin(q * 6 - t * 5 + k) * 4 * q;
        j ? ctx.lineTo(bx, y) : ctx.moveTo(bx, y);
      }
      ctx.strokeStyle = 'rgba(' + (k === 1 ? '255,220,140' : '140,220,255') + ',0.35)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(' + (k === 1 ? '255,236,180' : '190,240,255') + ',0.9)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();
    // 尾鰭
    const tailP = (c) => {
      const p = [[-34, -42], [-64, -70], [-56, -46], [-52, -40], [-56, -34], [-64, -10], [-34, -38]].map(([x, y]) => tailT(x, y));
      c.moveTo(p[0][0], p[0][1]);
      c.quadraticCurveTo(p[1][0] + 8, p[1][1] + 4, p[1][0], p[1][1]);
      c.quadraticCurveTo(p[2][0], p[2][1], p[3][0], p[3][1]);
      c.quadraticCurveTo(p[4][0], p[4][1], p[5][0], p[5][1]);
      c.quadraticCurveTo(p[5][0] + 8, p[5][1] - 4, p[6][0], p[6][1]);
      c.closePath();
    };
    nebula(tailP, 0.55, -50, -40, 34);
    // 背鰭（高高的帆）、腹鰭
    nebula((c) => { c.moveTo(-8, -60); c.quadraticCurveTo(-4, -82, 6, -86); c.quadraticCurveTo(22, -80, 26, -63); c.closePath(); }, 0.7, 8, -70, 24);
    nebula((c) => { c.moveTo(-6, -21); c.quadraticCurveTo(-2, -6, 2, -4); c.quadraticCurveTo(8, -10, 12, -19); c.closePath(); }, 0.7, 2, -14, 16);
    // 身體
    const bodyP = (c) => {
      c.moveTo(58, -40);
      c.bezierCurveTo(53, -61, 16, -71, -12, -62);
      c.quadraticCurveTo(-32, -55, -38, -40);
      c.quadraticCurveTo(-32, -25, -12, -19);
      c.bezierCurveTo(16, -11, 53, -19, 58, -40);
      c.closePath();
    };
    nebula(bodyP, 0.62, 14, -46, 60);
    // 胸鰭（光線畫成的扇子）
    ctx.save();
    ctx.translate(20, -34);
    ctx.rotate(0.4 + Math.sin(t * 5) * 0.2);
    ctx.strokeStyle = 'rgba(190,240,255,0.9)';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = PI * 0.75 + i * 0.18;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(140,210,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 20, PI * 0.75, PI * 0.75 + 0.54);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 星座連線
    ctx.lineCap = 'round';
    const lk = 0.55 + link * 0.45;
    ctx.strokeStyle = 'rgba(255,226,140,' + (0.25 + 0.45 * link).toFixed(3) + ')';
    ctx.lineWidth = 5 + link * 4;
    ctx.beginPath();
    FISH_LINKS.forEach(([a, b]) => { ctx.moveTo(stars[a][0], stars[a][1]); ctx.lineTo(stars[b][0], stars[b][1]); });
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,248,215,' + lk.toFixed(3) + ')';
    ctx.lineWidth = 1.6 + link * 1.4;
    ctx.setLineDash(link > 0.5 ? [] : [5, 3]);
    ctx.lineDashOffset = -t * 10;
    ctx.beginPath();
    FISH_LINKS.forEach(([a, b]) => { ctx.moveTo(stars[a][0], stars[a][1]); ctx.lineTo(stars[b][0], stars[b][1]); });
    ctx.stroke();
    ctx.setLineDash([]);
    // 星點（大星是四芒星，亮星帶十字光）
    stars.forEach(([x, y], i) => {
      const tw = 0.7 + 0.3 * Math.sin(t * 4 + i * 1.9);
      const s = (i < 10 ? 4 : 3.2) * tw * (1 + link * 0.5);
      glowH(ctx, x, y, s * 3.2, i % 3 ? '#fff0b0' : '#a8e8ff', 0.55 + link * 0.4);
      sparkle(ctx, x, y, s, i % 4 === 0 ? '#ffffff' : '#fff2b0');
    });
    // 臉：發光的星之眼
    const kind = eyeKind(m);
    const ek = (wind || link > 0.5) && kind === 'normal' ? 'angry' : kind;
    if (ek === 'normal' || ek === 'angry') {
      gemEye(ctx, 39, -45, 7.5, '#fff6c8', '#ffc84a', ek, { glowA: 0.6, pupil: '#1a1850' });
      sparkle(ctx, 40.5, -44, 2.6, '#ffe070');
    } else {
      A.ellipse(ctx, 39, -45, 7.5, 7.5, '#fff6d8', null, { lw: 2.2, hl: false });
      A.eye(ctx, 39, -45, 4, 4, ek, 0);
    }
    smallMouth(ctx, 51, -34, strike || hurt, 0.8);
    A.blush(ctx, 36, -32, 3);
    // 灑落的星屑
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.6 + i / 4) % 1;
      ctx.save();
      ctx.globalAlpha *= (1 - q) * (0.5 + link * 0.5);
      sparkle(ctx, -30 + i * 20 + Math.sin(t + i) * 6, -14 + q * 22, 2.6, i % 2 ? '#a8e8ff' : '#fff2b0');
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
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const q = (t * 0.8 + k / 3) % 1;
      ctx.strokeStyle = k % 2 ? 'rgba(110,240,255,0.75)' : 'rgba(230,150,255,0.7)';
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
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.strokeStyle = '#7af4ff';
    ctx.lineWidth = 2;
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
      }, MOTH[0], MOTH[1], { cel: [2, 2], lw: 2.4 });
      clockFace(ctx, 0, -2, 9, { hr: -0.9, mn: 0.35, lw: 1.8, rim: MOTH_GOLD[0], rimShade: MOTH_GOLD[1], face: '#f4fff8', faceShade: '#c8ece4', tick: '#0c6068', handCol: '#0c4a52', handCol2: '#e8503a' });
      [[-12, 10], [12, 8], [8, 14]].forEach(([x, y], i) => sparkle(ctx, x, y, 2.4 - i * 0.4, '#ffe9a0'));
    },
    // 輪迴鱗：翡翠蛇鱗，上面一個發光的 ∞ 符文
    ouroscale(ctx) {
      A.shape(ctx, (c) => {
        c.moveTo(0, -14);
        c.bezierCurveTo(14, -12, 14, 4, 0, 14);
        c.bezierCurveTo(-14, 4, -14, -12, 0, -14);
        c.closePath();
      }, JADE, JADE_S, { cel: [2.5, 2.5], hl: [-5, -7, 2.5, 3.5] });
      glow(ctx, 0, 0, 10, '120,255,210', 0.6);
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
      ctx.strokeStyle = A.c('#b8ffe4');
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
      ctx.strokeStyle = 'rgba(110,240,255,0.8)';
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
      sparkle(ctx, 6, 4, 2, '#8af4ff');
      A.shape(ctx, (c) => A.roundRect(c, -13, -14, 26, 4, 2), ROO[0], ROO[1], { lw: 1.8, hl: false, shadeY: -12 });
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
      tuft(-0.4, ICE.fur[0], ICE.fur[1], '#ffffff');
      ctx.restore();
      ctx.save();
      ctx.translate(4, 0);
      tuft(0.4, EMBER.fur[0], EMBER.fur[1], EMBER.tip);
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
