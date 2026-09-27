// 終章「時空間神殿」怪物、投射物、地面區域與掉落素材圖示（規格：docs/SPEC-monsters.md 終章表）。
// 設計（v1.4）：時間與宇宙的神話生物，約第一章的 1.6 倍。九隻各有自己的主色，時空概念就是牠們的身體本身：
//   時之鳳凰＝金紅火羽＋沙漏心、鏡麒麟＝珍珠翡翠鱗＋鏡晶角、時停蝶＝夜空星盤翅、銜尾蛇＝翡翠龍蛇＋循環符文、
//   時之聖甲蟲＝青金石甲殼＋太陽盤、虛空鯨＝星雲鯨＋腹部裂縫、重力魔眼＝星岩眼殼＋星環、雙生天馬＝金／銀藍兩個世界、星座魚＝星光線條。
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

  // ───────────── v1.4 神話生物用的細緻畫法 ─────────────
  const lerp = (a, b, k) => a + (b - a) * k;
  // 顏色經過 A.c 後轉 rgba（覆蓋層、光暈用；剪影、閃白、染色時一起變）
  function rgba(hex, a) {
    return 'rgba(' + rgbOf(hex) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
  }
  // 貝茲曲線取樣
  function qb(x0, y0, x1, y1, x2, y2) {
    return (s) => {
      const u = 1 - s;
      return [u * u * x0 + 2 * u * s * x1 + s * s * x2, u * u * y0 + 2 * u * s * y1 + s * s * y2];
    };
  }
  function cb(x0, y0, x1, y1, x2, y2, x3, y3) {
    return (s) => {
      const u = 1 - s;
      const a = u * u * u;
      const b = 3 * u * u * s;
      const c = 3 * u * s * s;
      const d = s * s * s;
      return [a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3];
    };
  }
  // 沿中心線 fn(s) 做漸細的形狀；wf(s) 是寬度
  function taper(c, fn, wf, n, open) {
    n = n || 18;
    const L = [];
    const R = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const p = fn(s);
      const q = fn(Math.min(1, s + 0.02));
      const o = fn(Math.max(0, s - 0.02));
      let dx = q[0] - o[0];
      let dy = q[1] - o[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const w = (typeof wf === 'function' ? wf(s) : wf) / 2;
      L.push([p[0] - dy * w, p[1] + dx * w]);
      R.push([p[0] + dy * w, p[1] - dx * w]);
    }
    c.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) c.lineTo(L[i][0], L[i][1]);
    for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
    if (!open) c.closePath();
  }
  // 中心線法線方向上的點：[x, y, 切線角]
  function along(fn, s, off) {
    const p = fn(s);
    const q = fn(Math.min(1, s + 0.02));
    const o = fn(Math.max(0, s - 0.02));
    let dx = q[0] - o[0];
    let dy = q[1] - o[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    return [p[0] - dy * off, p[1] + dx * off, Math.atan2(dy, dx)];
  }
  // 剪裁在形狀裡畫細節
  function clipDo(ctx, path, fn) {
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    fn();
    ctx.restore();
  }
  // 形狀內側的月牙光帶：光從 (-dx,-dy) 方向來。dx,dy>0 → 左上亮邊；<0 → 右下的逆光邊
  function crescent(ctx, path, dx, dy, col, a) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.beginPath();
    path(ctx);
    ctx.translate(dx, dy);
    path(ctx);
    ctx.globalAlpha *= Math.min(1, a);
    ctx.fillStyle = A.c(col);
    ctx.fill('evenodd');
    ctx.restore();
  }
  // 立體感：左上柔光、右下暗角（剪裁在形狀裡）
  function volume(ctx, path, x, y, r, lightA, darkA, dark) {
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.25);
    g.addColorStop(0, rgba('#ffffff', lightA));
    g.addColorStop(0.45, rgba('#ffffff', 0));
    g.addColorStop(0.75, rgba(dark || '#1a0c30', 0));
    g.addColorStop(1, rgba(dark || '#1a0c30', darkA));
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.restore();
  }
  // 漸層填色的形狀（stops: [[0,'#hex'],...]，沿 (x0,y0)→(x1,y1)）；描邊可省略
  function gradShape(ctx, path, x0, y0, x1, y1, stops, o) {
    o = o || {};
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([k, c, a]) => g.addColorStop(k, a == null ? A.c(c) : rgba(c, a)));
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = g;
    ctx.fill();
    if (o.noStroke) return;
    ctx.lineWidth = o.lw || 2.4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  // 羽毛／葉片：從 (x,y) 沿 rot 方向長 L、寬 W；col0 根部 → col1 尖端
  function featherPath(c, x, y, L, W, rot, curl) {
    const ca = Math.cos(rot);
    const sa = Math.sin(rot);
    const P = (u, v) => [x + ca * u - sa * v, y + sa * u + ca * v];
    const k = curl || 0;
    const p0 = P(0, -W * 0.28);
    const p1 = P(L * 0.45, -W * 0.62);
    const p2 = P(L, W * k);
    const p3 = P(L * 0.55, W * 0.6);
    const p4 = P(0, W * 0.28);
    c.moveTo(p0[0], p0[1]);
    c.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
    c.quadraticCurveTo(p3[0], p3[1], p4[0], p4[1]);
    c.closePath();
  }
  function feather(ctx, x, y, L, W, rot, col0, col1, o) {
    o = o || {};
    const path = (c) => featherPath(c, x, y, L, W, rot, o.curl);
    gradShape(ctx, path, x, y, x + Math.cos(rot) * L, y + Math.sin(rot) * L, [[0, col0], [o.mid != null ? o.mid : 0.55, o.colM || col0], [1, col1]], { lw: o.lw || 1.8, noStroke: true });
    if (o.rim) crescent(ctx, path, 1.2, 1.2, o.rim, o.rimA || 0.7);
    // 羽軸
    if (o.shaft) {
      ctx.strokeStyle = A.c(o.shaft);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(rot) * L * 0.85, y + Math.sin(rot) * L * 0.85);
      ctx.stroke();
    }
    strokeOut(ctx, path, o.lw || 1.8);
  }
  // 火舌（往上竄的火焰）
  function flameTongue(ctx, x, y, w, h, t, seed, outer, inner, a) {
    if (!(a > 0)) return;
    const sw = Math.sin(t * 9 + seed) * w * 0.35;
    const path = (c, k) => {
      c.moveTo(x - w * k, y);
      c.quadraticCurveTo(x - w * k, y - h * 0.5 * k, x + sw * k, y - h * k);
      c.quadraticCurveTo(x + w * k * 0.9, y - h * 0.45 * k, x + w * k, y);
      c.closePath();
    };
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    ctx.fillStyle = rgba(outer, 0.85);
    ctx.beginPath();
    path(ctx, 1);
    ctx.fill();
    ctx.fillStyle = rgba(inner, 0.95);
    ctx.beginPath();
    path(ctx, 0.55);
    ctx.fill();
    ctx.restore();
  }
  // 魚鱗紋（剪裁內使用）：一排排小弧
  function scaleTex(ctx, x0, y0, w, h, s, col, a, lw) {
    if (!(a > 0)) return;
    ctx.strokeStyle = rgba(col, a);
    ctx.lineWidth = lw || 1;
    ctx.beginPath();
    for (let row = 0, y = y0; y < y0 + h + s; row++, y += s * 0.62) {
      for (let x = x0 + (row % 2 ? s * 0.5 : 0); x < x0 + w + s; x += s) {
        ctx.moveTo(x + s * 0.5, y);
        ctx.arc(x, y, s * 0.5, 0, PI);
      }
    }
    ctx.stroke();
  }

  // ═════════════ 終章：時空間神殿 ═════════════
  // ── 時之鳳凰（id hourowl）：金紅火焰的不死鳥，尾羽末端化成流動的時之沙、尾羽上有沙漏紋；胸口一顆沙漏心。
  //    fx.sand＝沙漏上半的沙量、fx.rewind＝浴火倒流（身後浮現逆轉的錶盤光環、全身竄火、沙往上流） ──
  const PHX = { red: '#ec4a2c', redS: '#a8233a', deep: '#6e1438', orange: '#ff9a34', gold: '#ffd95e', goldS: '#e39a2a', cream: '#fff3cc', hot: '#fff8d8', mask: '#5a0f2a' };
  function phxWing(ctx, x, y, ang, spread, far, t, heat) {
    const La = far ? 21 : 26;
    const wx = x + Math.cos(ang) * La;
    const wy = y + Math.sin(ang) * La;
    const c0 = far ? PHX.deep : PHX.redS;
    const cm = far ? PHX.redS : PHX.red;
    const c1 = far ? PHX.goldS : PHX.gold;
    const sp = 0.5 + 0.5 * spread;
    // 次級飛羽（沿著前臂往後垂）
    for (let j = 0; j < 5; j++) {
      const s = 0.1 + j * 0.19;
      const a = ang - 1.3 + j * 0.12 * sp;
      feather(ctx, lerp(x, wx, s), lerp(y, wy, s), (far ? 16 : 19) + j * 2, 8, a, c0, c1, { colM: cm, mid: 0.45, curl: 0.25, lw: 1.6 });
    }
    // 初級飛羽（從腕部展開，尖端像火舌）
    for (let i = 6; i >= 0; i--) {
      const a = ang + 0.2 - i * 0.15 * sp;
      const L = (far ? 0.82 : 1) * (46 - i * 3.2);
      const ax = wx - Math.cos(ang) * i * 1.2;
      const ay = wy - Math.sin(ang) * i * 1.2;
      feather(ctx, ax, ay, L, 8.5, a, cm, c1, { colM: PHX.orange, mid: 0.5, curl: 0.35 + Math.sin(t * 7 + i) * 0.12, lw: 1.7, shaft: far ? null : '#ffe7a0', rim: far ? null : PHX.cream, rimA: 0.45 });
      if (heat > 0.05 && !far && i % 2 === 0) {
        const tx = ax + Math.cos(a) * L;
        const ty = ay + Math.sin(a) * L;
        glowH(ctx, tx, ty, 9, PHX.orange, 0.5 * heat);
      }
    }
    // 大覆羽、小覆羽（兩排短羽蓋住飛羽根部）
    for (let j = 0; j < 6; j++) {
      const q = 0.02 + j * 0.17;
      feather(ctx, lerp(x, wx, q) + Math.sin(ang) * 2, lerp(y, wy, q) - Math.cos(ang) * 2, (far ? 11 : 14) - j * 0.6, 8, ang - 1.15 + j * 0.1, far ? PHX.redS : PHX.orange, far ? PHX.orange : PHX.gold, { lw: 1.5, curl: 0.2 });
    }
    for (let j = 0; j < 5; j++) {
      const q = 0.0 + j * 0.2;
      feather(ctx, lerp(x, wx, q) + Math.sin(ang) * 4.5, lerp(y, wy, q) - Math.cos(ang) * 4.5, (far ? 8 : 10) - j * 0.5, 7, ang - 1.0 + j * 0.1, far ? PHX.deep : PHX.red, far ? PHX.redS : PHX.orange, { lw: 1.4, curl: 0.15 });
    }
    // 翅膀前緣（肩）
    const arm = qb(x, y, (x + wx) / 2 + Math.sin(ang) * 3, (y + wy) / 2 - Math.cos(ang) * 3, wx, wy);
    const path = (c) => taper(c, arm, (s) => (far ? 6 : 7.5) * (1 - s * 0.6), 12);
    A.shape(ctx, path, cm, c0, { cel: [1, 1.5], lw: 2, hl: false });
    if (!far) crescent(ctx, path, 1.4, 1.4, PHX.cream, 0.8);
    strokeOut(ctx, path, 2);
  }
  // 胸口的沙漏心（上半 top 0..1 的沙；flowUp 倒流時沙粒往上）
  function sandHeart(ctx, x, y, s, top, flowUp, t, glowA) {
    glowH(ctx, x, y, s * 2.6, PHX.gold, glowA);
    const glass = (c) => {
      c.moveTo(x - s * 0.55, y - s * 0.9);
      c.lineTo(x + s * 0.55, y - s * 0.9);
      c.quadraticCurveTo(x + s * 0.55, y - s * 0.3, x + s * 0.1, y);
      c.quadraticCurveTo(x + s * 0.55, y + s * 0.3, x + s * 0.55, y + s * 0.9);
      c.lineTo(x - s * 0.55, y + s * 0.9);
      c.quadraticCurveTo(x - s * 0.55, y + s * 0.3, x - s * 0.1, y);
      c.quadraticCurveTo(x - s * 0.55, y - s * 0.3, x - s * 0.55, y - s * 0.9);
      c.closePath();
    };
    ctx.save();
    ctx.beginPath();
    glass(ctx);
    ctx.fillStyle = rgba('#fff4dc', 0.55);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = A.c('#ffc83a');
    const th = s * 0.85 * top;
    if (th > 0.3) ctx.fillRect(x - s, y - th - 0.5, s * 2, th);
    const bh = s * 0.85 * (1 - top);
    if (bh > 0.3) {
      ctx.beginPath();
      ctx.moveTo(x - s, y + s * 0.9);
      ctx.lineTo(x - s, y + s * 0.9 - bh * 0.7);
      ctx.quadraticCurveTo(x, y + s * 0.9 - bh * 1.4, x + s, y + s * 0.9 - bh * 0.7);
      ctx.lineTo(x + s, y + s * 0.9);
      ctx.fill();
    }
    // 中間落下（或倒流上升）的沙粒
    ctx.fillStyle = A.c('#fff6c0');
    for (let i = 0; i < 4; i++) {
      let q = (t * 2.2 + i / 4) % 1;
      if (flowUp) q = 1 - q;
      ctx.fillRect(x - 0.7, y - s * 0.3 + q * s * 0.9, 1.4, 1.6);
    }
    ctx.restore();
    ctx.beginPath();
    glass(ctx);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.35, y - s * 0.75);
    ctx.lineTo(x - s * 0.35, y - s * 0.45);
    ctx.stroke();
    // 金框（上下兩片、兩根柱）
    A.shape(ctx, (c) => A.roundRect(c, x - s * 0.8, y - s * 1.15, s * 1.6, s * 0.3, 1.2), PHX.gold, PHX.goldS, { lw: 1.5, hl: false, shadeY: y - s });
    A.shape(ctx, (c) => A.roundRect(c, x - s * 0.8, y + s * 0.85, s * 1.6, s * 0.3, 1.2), PHX.gold, PHX.goldS, { lw: 1.5, hl: false, shadeY: y + s });
  }
  // 身後逆轉的錶盤光環
  function rewindHalo(ctx, x, y, r, t, a) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    glowH(ctx, x, y, r * 1.35, PHX.gold, 0.45);
    runeRing(ctx, x, y, r, -t * 1.6, rgbOf(PHX.gold), 0.85, 12);
    ctx.strokeStyle = rgba(PHX.hot, 0.9);
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const aa = (i / 12) * TAU;
      const big = i % 3 === 0;
      ctx.lineWidth = big ? 2.6 : 1.3;
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(aa) * r * 1.08, y - Math.cos(aa) * r * 1.08);
      ctx.lineTo(x + Math.sin(aa) * r * (big ? 1.24 : 1.16), y - Math.cos(aa) * r * (big ? 1.24 : 1.16));
      ctx.stroke();
    }
    // 逆時針的箭弧
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = rgba('#ffe7a0', 0.95);
    for (let k = 0; k < 3; k++) {
      const a0 = -t * 5 + (k * TAU) / 3;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.36, a0, a0 + 0.9);
      ctx.stroke();
      const hx = x + Math.cos(a0) * r * 1.36;
      const hy = y + Math.sin(a0) * r * 1.36;
      const ta = a0 - PI / 2;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(ta) * 6, hy + Math.sin(ta) * 6);
      ctx.lineTo(hx + Math.cos(ta + 2.5) * 6, hy + Math.sin(ta + 2.5) * 6);
      ctx.moveTo(hx + Math.cos(ta) * 6, hy + Math.sin(ta) * 6);
      ctx.lineTo(hx + Math.cos(ta - 2.5) * 6, hy + Math.sin(ta - 2.5) * 6);
      ctx.stroke();
    }
    // 倒著轉的指針
    ctx.strokeStyle = rgba(PHX.hot, 0.95);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(-t * 9) * r * 0.55, y - Math.cos(-t * 9) * r * 0.55);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(-t * 2.2) * r * 0.38, y - Math.cos(-t * 2.2) * r * 0.38);
    ctx.stroke();
    ctx.restore();
  }
  function hourowl(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const dead = !!m.dead;
    const hurt = m.hurtT > 0;
    const sand = amt(fx.sand, 1);
    const rw = dead ? 0 : amt(fx.rewind, 0);
    const kind = eyeKind(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const flap = Math.sin(t * (wind ? 10 : rw ? 12 : 5.5));
    let ang = -2.2 + flap * 0.38;
    let spread = 0.75 + flap * 0.25;
    let headA = 0;
    let lean = 0;
    if (wind) {
      ang = -1.72 + flap * 0.1;
      spread = 1;
      headA = -0.12;
      lean = -0.08;
    } else if (strike) {
      ang = -2.95;
      spread = 0.55;
      headA = 0.12;
      lean = 0.12;
    } else if (rw) {
      ang = -1.8 + flap * 0.2;
      spread = 1;
      headA = -0.25;
    }
    if (dead) {
      ang = -3.1;
      spread = 0.2;
      headA = 0.45;
      lean = 0.2;
    }
    const shake = hurt ? Math.sin(t * 70) * 1.2 : 0;
    const heat = clamp(0.35 + (wind ? 0.5 : 0) + rw, 0, 1.3);
    ctx.save();
    ctx.translate(shake, 0);
    // 身後的火光
    if (!dead) glowH(ctx, 0, -48, 64, PHX.orange, 0.28 + rw * 0.35 + (wind ? 0.2 : 0));
    rewindHalo(ctx, -2, -50, 40, t, rw);
    ctx.translate(0, -44);
    ctx.rotate(lean);
    ctx.translate(0, 44);

    // ── 尾羽：五根長羽，末端化成時之沙 ──
    const sway = dead ? 0 : Math.sin(t * 2.2) * 4;
    for (let i = 4; i >= 0; i--) {
      const sw = sway * (0.6 + i * 0.2) + Math.sin(t * 3 + i) * 1.5;
      const E = [[-64, -14], [-60, 2], [-52, 14], [-40, 20], [-27, 22]][i];
      const fn = cb(-10, -34, -26, -36 + i * 2, E[0] * 0.62, -26 + i * 5, E[0] + sw, E[1] + sw * 0.4);
      const W = i % 2 ? 6 : 11 - i;
      const wf = (s) => 2.6 * (1 - s) + W * Math.exp(-Math.pow((s - 0.7) / 0.19, 2)) * Math.min(1, (1 - s) * 6);
      const path = (c) => taper(c, fn, wf, 16);
      const p0 = fn(0);
      const p1 = fn(1);
      gradShape(ctx, path, p0[0], p0[1], p1[0], p1[1], [[0, i % 2 ? PHX.redS : PHX.red], [0.45, PHX.orange], [0.8, PHX.gold], [1, PHX.cream]], { lw: 1.8 });
      // 沙漏紋（尾羽上的眼紋）
      if (i % 2 === 0) {
        const e = along(fn, 0.7, 0);
        glowH(ctx, e[0], e[1], 7, '#7ef0e0', 0.5);
        ctx.fillStyle = A.c('#2fb8b0');
        ctx.beginPath();
        ctx.ellipse(e[0], e[1], 4.6, 3.6, e[2], 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.translate(e[0], e[1]);
        ctx.rotate(e[2]);
        ctx.fillStyle = A.c(PHX.deep);
        ctx.beginPath();
        ctx.moveTo(-2.6, -2.2);
        ctx.lineTo(2.6, -2.2);
        ctx.lineTo(-2.6, 2.2);
        ctx.lineTo(2.6, 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = A.c(PHX.gold);
        ctx.fillRect(-0.8, -0.8, 1.6, 1.6);
        ctx.restore();
      }
      // 從尾尖流出的沙（倒流時往回流）
      const e = along(fn, 1, 0);
      for (let k = 0; k < 4; k++) {
        let q = (t * (rw ? 1.6 : 0.8) + k / 4 + i * 0.13) % 1;
        if (rw) q = 1 - q;
        const d = 3 + q * 16;
        const px = e[0] + Math.cos(e[2]) * d + Math.sin(t * 2 + k + i) * 2;
        const py = e[1] + Math.sin(e[2]) * d + q * 4;
        ctx.fillStyle = rgba(k % 2 ? '#fff2b0' : PHX.gold, (1 - q) * 0.9);
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
      void p1;
    }

    // ── 浴火：倒流時身後竄起大火 ──
    if (rw > 0) {
      glowH(ctx, 0, -22, 34, '#ff8a2a', 0.8 * rw);
      for (let i = 0; i < 9; i++) {
        const bx = -26 + i * 6.5;
        const by = -18 - Math.sin((i / 8) * PI) * 10;
        flameTongue(ctx, bx, by, 7, 34 + Math.sin(t * 11 + i) * 8 + Math.sin((i / 8) * PI) * 18, t, i * 1.9, '#ff6a2a', '#ffe68a', rw * 0.75);
      }
    }
    // ── 遠側翅膀 ──
    phxWing(ctx, 4, -58, ang - 0.28, spread, true, t, heat);

    // ── 爪（收在身下）──
    [[-2, 1], [6, 0]].forEach(([lx, back]) => {
      limb(ctx, (c) => {
        c.moveTo(lx, -30);
        c.quadraticCurveTo(lx + 2, -22, lx - 1, -17 + (dead ? 2 : 0));
      }, 4.5, back ? '#c08030' : PHX.goldS);
      ctx.strokeStyle = A.c('#3a1a1a');
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lx - 1, -17);
      ctx.quadraticCurveTo(lx + 4, -16, lx + 5, -13);
      ctx.moveTo(lx - 1, -17);
      ctx.quadraticCurveTo(lx - 4, -15, lx - 4, -12);
      ctx.stroke();
    });

    // ── 身體 ──
    const body = (c) => {
      c.moveTo(18, -58);
      c.bezierCurveTo(24, -44, 16, -26, 2, -24);
      c.bezierCurveTo(-10, -23, -18, -30, -16, -40);
      c.bezierCurveTo(-14, -52, -4, -60, 6, -62);
      c.closePath();
    };
    A.shape(ctx, body, PHX.red, PHX.redS, { cel: [3, 3], lw: 2.6, hl: false });
    clipDo(ctx, body, () => {
      // 胸前的金色羽絨
      const g = ctx.createRadialGradient(10, -40, 2, 10, -40, 18);
      g.addColorStop(0, rgba(PHX.cream, 0.95));
      g.addColorStop(0.55, rgba(PHX.gold, 0.8));
      g.addColorStop(1, rgba(PHX.orange, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-10, -60, 40, 40);
      // 羽鱗紋
      ctx.strokeStyle = rgba(PHX.redS, 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let r = 0; r < 5; r++) {
        for (let k = 0; k < 4; k++) {
          const px = -8 + k * 7 + (r % 2) * 3.5;
          const py = -52 + r * 6;
          ctx.moveTo(px - 3, py);
          ctx.quadraticCurveTo(px, py + 3.5, px + 3, py);
        }
      }
      ctx.stroke();
    });
    volume(ctx, body, 2, -42, 22, 0.25, 0.35, PHX.deep);
    crescent(ctx, body, 1.8, 1.8, PHX.cream, 0.6);
    crescent(ctx, body, -1.6, -1.2, PHX.orange, 0.7);
    strokeOut(ctx, body, 2.6);
    // 胸口的沙漏心
    sandHeart(ctx, 8, -40, 7.5, sand, rw > 0, t, 0.45 + rw * 0.5 + (wind ? 0.3 : 0));

    // ── 頭 ──
    ctx.save();
    ctx.translate(14, -62);
    ctx.rotate(headA);
    // 火焰冠羽
    for (let i = 3; i >= 0; i--) {
      const fl = Math.sin(t * 8 + i * 1.7) * 2.5;
      const fn = qb(-4, -6, -10 - i * 4, -18 - (3 - i) * 2 + fl, -18 - i * 6 + fl, -20 - (3 - i) * 4 + i * 3);
      const path = (c) => taper(c, fn, (s) => (6 - i * 0.6) * (1 - s * 0.85), 10);
      gradShape(ctx, path, -4, -6, -18 - i * 6, -22, [[0, PHX.red], [0.5, PHX.orange], [1, PHX.gold]], { lw: 1.6 });
    }
    const head = (c) => c.ellipse(0, 0, 11.5, 10.5, -0.15, 0, TAU);
    A.shape(ctx, head, PHX.red, PHX.redS, { cel: [2, 2], lw: 2.4, hl: false });
    clipDo(ctx, head, () => {
      // 臉頰金羽＋深色眼罩紋
      ctx.fillStyle = A.c(PHX.gold);
      ctx.beginPath();
      ctx.ellipse(6, 4, 7, 5, 0.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c(PHX.mask);
      ctx.beginPath();
      ctx.moveTo(10, -3);
      ctx.quadraticCurveTo(2, -6, -12, -1);
      ctx.quadraticCurveTo(-2, 0, 4, 3);
      ctx.quadraticCurveTo(8, 2, 10, -3);
      ctx.fill();
    });
    crescent(ctx, head, 1.4, 1.4, PHX.cream, 0.7);
    strokeOut(ctx, head, 2.4);
    // 鉤喙
    A.shape(ctx, (c) => {
      c.moveTo(8, -4);
      c.quadraticCurveTo(17, -5, 19, 3);
      c.quadraticCurveTo(16, 1, 12, 2);
      c.quadraticCurveTo(9, 1, 8, -4);
      c.closePath();
    }, PHX.gold, PHX.goldS, { lw: 1.8, shadeY: 0, hl: [11, -3, 2.5, 1] });
    if (wind || rw || strike) {
      // 張嘴啼叫
      A.shape(ctx, (c) => {
        c.moveTo(10, 3);
        c.quadraticCurveTo(15, 5, 16, 8);
        c.quadraticCurveTo(12, 7, 9, 5);
        c.closePath();
      }, PHX.goldS, null, { lw: 1.5 });
    }
    // 眼
    if (kind === 'normal' || kind === 'angry') {
      gemEye(ctx, 4.5, -1.5, 3.4, '#fff1a0', '#ffb030', kind === 'normal' && (wind || rw) ? 'angry' : kind, { glowCol: '#ffcc50', glowA: 0.6, slit: true, lw: 1.4 });
    } else {
      A.eye(ctx, 4.5, -1.5, 3, 3, kind, 0);
    }
    ctx.restore();

    // ── 近側翅膀 ──
    phxWing(ctx, -7, -50, ang, spread, false, t, heat);

    if (rw > 0) {
      for (let i = 0; i < 4; i++) flameTongue(ctx, -12 + i * 8, -24, 4, 12 + Math.sin(t * 13 + i) * 4, t, i * 2.3, '#ff8a3a', '#fff2a0', rw * 0.55);
      for (let i = 0; i < 12; i++) {
        const q = (t * 0.9 + hash(i)) % 1;
        const px = -30 + hash(i + 7) * 60;
        const py = 10 - q * 90;
        ctx.fillStyle = rgba('#ffe68a', (1 - Math.abs(q - 0.5) * 2) * rw);
        ctx.fillRect(px - 1, py - 1, 2.2, 2.2);
      }
    }
    if (!dead && !rw) {
      // 平常飄散的火星
      for (let i = 0; i < 5; i++) {
        const q = (t * 0.7 + i / 5) % 1;
        const px = -20 + hash(i + 3) * 36 + Math.sin(t * 2 + i) * 3;
        const py = -44 - q * 40;
        ctx.fillStyle = rgba(i % 2 ? '#ffd060' : '#ff8a3a', (1 - q) * 0.8);
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }
    ctx.restore();
  }
  // ── 鏡麒麟（id mirrordeer）：龍首、鹿身、全身珍珠翡翠鱗，一對鏡晶龍角、稜鏡水晶鬃毛、腳踝燃著金焰、金色長鬚。
  //    fx.copy＝鏡像分身：冷色半透明、鏡面斜光、身上有鏡子裂紋、周圍浮著鏡片 ──
  const QL = { body: '#dff5ea', bodyS: '#94c6c2', deep: '#4f8f96', scale: '#4f9f9c', belly: '#fff6dc', bellyS: '#e6d2a4', gold: '#ffd466', goldS: '#d4952e', hoof: '#5a3a2a', crys: '#c8f4ff', crysS: '#7cc4ea', flame: '#ffcf5a', flameS: '#ff8a3a', mouth: '#7a2a3a' };
  function crystalShard(ctx, x, y, L, W, rot, shift, o) {
    o = o || {};
    const ca = Math.cos(rot);
    const sa = Math.sin(rot);
    const P = (u, v) => [x + ca * u - sa * v, y + sa * u + ca * v];
    const pts = [P(0, -W * 0.5), P(L * 0.7, -W * 0.45), P(L, 0), P(L * 0.6, W * 0.5), P(0, W * 0.4)];
    const path = (c) => {
      pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.closePath();
    };
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = prismGrad(ctx, pts[0][0], pts[0][1], pts[2][0], pts[2][1], shift);
    ctx.fill();
    // 冷色的鏡面底＋白色刻面
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = A.c(o.base || QL.crys);
    ctx.fill();
    ctx.restore();
    const mid = P(L * 0.45, 0);
    ctx.strokeStyle = rgba('#ffffff', 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(mid[0], mid[1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.moveTo(mid[0], mid[1]);
    ctx.lineTo(pts[4][0], pts[4][1]);
    ctx.stroke();
    strokeOut(ctx, path, o.lw || 1.5);
  }
  // 鏡晶龍角：主幹＋分岔，都是會流動虹彩的水晶
  function mirrorAntler(ctx, x, y, s, rot, t, far, glowA) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    if (glowA > 0) glowH(ctx, -6, -18, 26, '#bff0ff', glowA);
    const main = cb(0, 0, -4, -10, -2, -20, -12, -32);
    const wf = (q) => 6.5 * (1 - q * 0.8);
    const path = (c) => taper(c, main, wf, 12);
    const shift = Math.floor(t * 4) + (far ? 3 : 0);
    const branch = (s0, ang, L) => {
      const p = along(main, s0, 0);
      const bx = p[0] + Math.cos(ang) * L;
      const by = p[1] + Math.sin(ang) * L;
      const f = qb(p[0], p[1], (p[0] + bx) / 2 + 2, (p[1] + by) / 2 - 1, bx, by);
      const bp = (c) => taper(c, f, (q) => 4.4 * (1 - q * 0.85), 8);
      ctx.beginPath();
      bp(ctx);
      ctx.fillStyle = prismGrad(ctx, p[0], p[1], bx, by, shift + 2);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha *= 0.3;
      ctx.fillStyle = A.c(far ? QL.crysS : QL.crys);
      ctx.fill();
      ctx.restore();
      strokeOut(ctx, bp, 1.4);
    };
    branch(0.35, -0.2, 11);
    branch(0.62, -2.6, 9);
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = prismGrad(ctx, 0, 0, -12, -32, shift);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.3;
    ctx.fillStyle = A.c(far ? QL.crysS : QL.crys);
    ctx.fill();
    ctx.restore();
    crescent(ctx, path, 1.2, 0.6, '#ffffff', 0.9);
    strokeOut(ctx, path, 1.6);
    // 刻面亮點
    sparkle(ctx, -6, -22, 2.4, '#ffffff');
    ctx.restore();
  }
  function mirrordeer(ctx, m) {
    const fx = m.fx || {};
    const copy = !!fx.copy;
    const t = num(m.t, 0);
    if (!copy) {
      qilinBody(ctx, m, false);
      return;
    }
    ctx.save();
    // 鏡中的冷光與浮著的鏡片
    glowH(ctx, 0, -60, 76, '#8ad8ff', 0.4);
    ctx.globalAlpha *= 0.62 + Math.sin(t * 5) * 0.06;
    withTint('#7cc8ff', 0.5, () => qilinBody(ctx, m, true));
    ctx.restore();
    ctx.save();
    // 鏡面斜光（掃過身體的白色光帶）
    const sweep = ((t * 0.6) % 1) * 160 - 80;
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sweep - 10, -120);
    ctx.lineTo(sweep + 4, -120);
    ctx.lineTo(sweep - 36, 0);
    ctx.lineTo(sweep - 50, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 鏡子裂紋
    ctx.save();
    ctx.strokeStyle = 'rgba(235,250,255,0.85)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -56);
    ctx.lineTo(-14, -66);
    ctx.lineTo(-20, -63);
    ctx.moveTo(-4, -56);
    ctx.lineTo(6, -44);
    ctx.lineTo(4, -38);
    ctx.moveTo(-4, -56);
    ctx.lineTo(-18, -48);
    ctx.moveTo(-4, -56);
    ctx.lineTo(10, -64);
    ctx.stroke();
    // 周圍浮著的鏡片
    for (let i = 0; i < 5; i++) {
      const a = t * 0.8 + (i / 5) * TAU;
      const px = Math.cos(a) * 52;
      const py = -58 + Math.sin(a) * 30;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a * 1.3);
      ctx.fillStyle = 'rgba(200,240,255,0.55)';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(4, 1);
      ctx.lineTo(-1, 5);
      ctx.lineTo(-4, -1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function qilinBody(ctx, m, copy) {
    const t = num(m.t, 0);
    const ph = phase(m);
    const dead = !!m.dead;
    const hurt = m.hurtT > 0;
    const kind = eyeKind(m);
    const walk = walking(m) && !ph && !dead;
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const cyc = t * 7;
    const bob = walk ? Math.abs(Math.sin(cyc)) * -2.5 : Math.sin(t * 2) * 0.8;
    let lean = 0;
    let headDrop = 0;
    let push = 0;
    if (wind) {
      lean = -0.12;
      headDrop = -0.15;
      push = -4;
    } else if (strike) {
      lean = 0.1;
      headDrop = 0.5;
      push = 8;
    }
    if (dead) headDrop = 0.6;
    const glowA = wind ? 0.9 : strike ? 0.6 : 0.3 + Math.sin(t * 3) * 0.08;
    ctx.save();
    ctx.translate(push + (hurt ? Math.sin(t * 60) * 1.2 : 0), bob);
    // 腳：沿著曲線的漸細腿＋關節上往後飄的金焰
    const wisp = (x, y, L, a, seed, alpha) => {
      const fl = Math.sin(t * 9 + seed) * 3;
      const fn = qb(x, y, x - L * 0.5, y - 2 + fl, x - L, y - L * 0.35 - fl);
      const path = (c) => taper(c, fn, (q) => 6 * (1 - q) + 0.5, 10);
      ctx.save();
      ctx.globalAlpha *= alpha;
      gradShape(ctx, path, x, y, x - L, y - L * 0.3, [[0, QL.flame], [0.6, QL.flameS], [1, QL.flameS, 0]], { noStroke: true });
      ctx.restore();
      void a;
    };
    const leg = (hx, hy, off, front, far) => {
      const sw = walk ? Math.sin(cyc + off) * 0.32 : strike && front ? 0.25 : wind && front ? -0.2 : 0;
      const lift = walk ? Math.max(0, -Math.cos(cyc + off)) * 5 : 0;
      const rot = (x, y) => {
        const dx = x - hx;
        const dy = y - hy;
        return [hx + dx * Math.cos(sw) - dy * Math.sin(sw), hy + dx * Math.sin(sw) + dy * Math.cos(sw)];
      };
      const P = front
        ? [[hx, hy], [hx + 3, hy + 20], [hx - 1, -16], [hx + 1, -bob - lift]]
        : [[hx, hy], [hx + 8, hy + 18], [hx - 8, -18], [hx - 2, -bob - lift]];
      const Q = P.map(([x, y], i) => (i === 3 ? [rot(x, y)[0], Math.min(-bob - lift, rot(x, y)[1])] : rot(x, y)));
      Q[3][1] = -bob - lift;
      const fn = cb(Q[0][0], Q[0][1], Q[1][0], Q[1][1], Q[2][0], Q[2][1], Q[3][0], Q[3][1] - 5);
      const wf = (q) => (front ? 15 : 21) * Math.pow(1 - q, 1.8) + 4.5;
      const path = (c) => taper(c, fn, wf, 16);
      A.shape(ctx, path, far ? QL.bodyS : QL.body, far ? QL.deep : QL.bodyS, { cel: [2, 1], hl: false, noStroke: true });
      if (!far) {
        clipDo(ctx, path, () => scaleTex(ctx, Q[0][0] - 12, Q[0][1] - 4, 24, 26, 5, QL.scale, 0.35, 1));
        crescent(ctx, path, 1.3, 1, '#ffffff', 0.6);
      }
      strokeOut(ctx, (c) => taper(c, fn, wf, 16, true), 2.3);
      const j = fn(0.55);
      wisp(j[0] - 2, j[1], 16, 0, off * 3 + (front ? 1 : 2), far ? 0.6 : 0.95);
      const hx2 = Q[3][0];
      const hy2 = Q[3][1];
      A.shape(ctx, (c) => {
        c.moveTo(hx2 - 4.5, hy2 - 6);
        c.lineTo(hx2 + 4, hy2 - 6);
        c.lineTo(hx2 + 6.5, hy2);
        c.lineTo(hx2 - 5, hy2);
        c.closePath();
      }, far ? '#3a2418' : QL.hoof, null, { lw: 1.6 });
      ctx.strokeStyle = A.c(QL.gold);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx2 - 4.5, hy2 - 6.5);
      ctx.lineTo(hx2 + 4, hy2 - 6.5);
      ctx.moveTo(hx2 + 0.8, hy2 - 5);
      ctx.lineTo(hx2 + 1, hy2);
      ctx.stroke();
    };
    ctx.save();
    ctx.translate(0, -50);
    ctx.rotate(lean);
    ctx.translate(0, 50);
    // 遠側的腳
    leg(16, -50, PI, true, true);
    leg(-30, -52, 0, false, true);
    // 尾巴：獅尾，尾端一團金焰與水晶
    const tw = Math.sin(t * 2.6) * 4;
    const tail = qb(-40, -60, -56, -62 + tw * 0.4, -60 + tw, -82);
    A.shape(ctx, (c) => taper(c, tail, (q) => 6 - q * 3, 10), QL.body, QL.bodyS, { cel: [1, 1], lw: 2 });
    for (let i = 0; i < 4; i++) {
      flameTongue(ctx, -60 + tw + (i - 1.5) * 4, -78, 4.5, 14 + Math.sin(t * 9 + i) * 3, t, i * 1.3, QL.flameS, QL.flame, 0.9);
    }
    crystalShard(ctx, -60 + tw, -80, 13, 7, -1.9, Math.floor(t * 4));
    // 身體：挺起的胸、收起的腹、圓的後腿
    const body = (c) => {
      c.moveTo(22, -70);
      c.bezierCurveTo(34, -66, 38, -50, 28, -38);
      c.bezierCurveTo(20, -30, 6, -36, -6, -38);
      c.bezierCurveTo(-18, -38, -26, -32, -38, -38);
      c.bezierCurveTo(-50, -44, -50, -64, -38, -68);
      c.bezierCurveTo(-24, -72, 4, -66, 22, -70);
      c.closePath();
    };
    A.shape(ctx, body, QL.body, QL.bodyS, { cel: [3, 4], lw: 2.8, hl: false });
    clipDo(ctx, body, () => {
      scaleTex(ctx, -52, -76, 92, 44, 7, QL.scale, 0.42, 1.1);
      ctx.fillStyle = A.c(QL.belly);
      ctx.beginPath();
      ctx.moveTo(34, -60);
      ctx.bezierCurveTo(30, -40, 10, -36, -12, -36);
      ctx.bezierCurveTo(-24, -36, -30, -30, -40, -34);
      ctx.lineTo(-40, -20);
      ctx.lineTo(40, -20);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = A.c(QL.bellyS);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const x = -24 + i * 9;
        ctx.moveTo(x, -42);
        ctx.quadraticCurveTo(x + 3, -38, x + 1, -32);
      }
      ctx.stroke();
      // 後腿的肌肉線
      ctx.strokeStyle = rgba(QL.deep, 0.45);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-34, -54, 12, -0.6, 1.9);
      ctx.stroke();
    });
    volume(ctx, body, -6, -56, 36, 0.35, 0.3, QL.deep);
    crescent(ctx, body, 2, 2, '#ffffff', 0.7);
    crescent(ctx, body, -1.8, -1.5, '#9ae8ff', 0.6);
    strokeOut(ctx, body, 2.8);
    // 背上的金色脊鰭
    for (let i = 0; i < 6; i++) {
      const x = -34 + i * 9;
      const y = -69 + Math.sin(((i + 0.5) / 6) * PI) * 1.5;
      A.shape(ctx, (c) => {
        c.moveTo(x - 4, y + 2);
        c.quadraticCurveTo(x - 3, y - 5, x - 7, y - 8);
        c.quadraticCurveTo(x + 2, y - 5, x + 4, y + 2);
        c.closePath();
      }, QL.gold, QL.goldS, { lw: 1.5, shadeY: y - 1, hl: false });
    }
    // 近側的腳
    leg(-26, -50, PI, false, false);
    leg(22, -48, 0, true, false);

    // ── 脖子與頭 ──
    ctx.save();
    ctx.translate(20, -64);
    ctx.rotate(headDrop * 0.6);
    const neckF = cb(0, 2, 8, -14, 12, -26, 22, -38);
    // 稜鏡水晶鬃毛（沿著脖子往後飄）
    for (let i = 6; i >= 0; i--) {
      const p = along(neckF, 0.05 + i * 0.15, -6);
      const fl = Math.sin(t * 3 + i) * 0.12;
      crystalShard(ctx, p[0] + 2, p[1], 24 - i * 1.2, 10, -2.75 + i * 0.05 + fl, Math.floor(t * 4) + i);
    }
    const neck = (c) => taper(c, neckF, (q) => 22 - q * 8, 14);
    A.shape(ctx, neck, QL.body, QL.bodyS, { cel: [2, 2], hl: false, noStroke: true });
    clipDo(ctx, neck, () => {
      scaleTex(ctx, -12, -46, 44, 52, 6, QL.scale, 0.42, 1);
      ctx.fillStyle = A.c(QL.belly);
      ctx.beginPath();
      ctx.ellipse(18, -10, 6, 22, 0.45, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.c(QL.bellyS);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.moveTo(8 + i * 3.2, 4 - i * 7);
        ctx.lineTo(18 + i * 3.2, -1 - i * 7);
      }
      ctx.stroke();
    });
    crescent(ctx, neck, 1.5, 1.5, '#ffffff', 0.6);
    strokeOut(ctx, (c) => taper(c, neckF, (q) => 22 - q * 8, 14, true), 2.6);
    // 頭
    ctx.save();
    ctx.translate(22, -40);
    ctx.rotate(headDrop * 0.5 - 0.05);
    ctx.scale(1.3, 1.3);
    const open = strike || wind ? 1 : 0;
    // 腦後往後捲的火焰鬃（金→橙）
    for (let i = 3; i >= 0; i--) {
      const fl = Math.sin(t * 5 + i * 1.3) * 2;
      const fn = cb(-4, -6 + i * 3, -14, -10 + i * 4 + fl, -20, -2 + i * 5, -26 - i * 2 + fl, -8 + i * 6);
      gradShape(ctx, (c) => taper(c, fn, (q) => (7 - i * 0.8) * (1 - q * 0.9), 12), -4, 0, -26, 0, [[0, QL.gold], [0.6, QL.flame], [1, QL.flameS]], { lw: 1.5 });
    }
    // 遠側的角、遠側長鬚
    mirrorAntler(ctx, -4, -8, 1.05, -0.8, t, true, glowA * 0.6);
    const wh = Math.sin(t * 2.4) * 3;
    ctx.strokeStyle = A.c(QL.goldS);
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(26, -1);
    ctx.bezierCurveTo(34, -6, 30, -16, 18 + wh, -18);
    ctx.stroke();
    // 下顎（張嘴時往下開）
    ctx.save();
    ctx.translate(6, 4);
    ctx.rotate(open * 0.32);
    const jaw = (c) => {
      c.moveTo(-10, -1);
      c.bezierCurveTo(4, 0, 16, 0, 22, 1);
      c.quadraticCurveTo(22, 5, 16, 6);
      c.bezierCurveTo(6, 7, -4, 6, -10, -1);
      c.closePath();
    };
    A.shape(ctx, jaw, QL.belly, QL.bellyS, { lw: 2.2, shadeY: 3, hl: false });
    if (open) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(18, 0.5);
      ctx.lineTo(16.5, -3);
      ctx.lineTo(15, 0.5);
      ctx.fill();
    }
    ctx.restore();
    if (open) {
      A.shape(ctx, (c) => {
        c.moveTo(28, 3);
        c.quadraticCurveTo(18, 12, 0, 5);
        c.lineTo(0, 3);
        c.closePath();
      }, QL.mouth, null, { lw: 1.2 });
    }
    const head = (c) => {
      c.moveTo(-9, 0);
      c.bezierCurveTo(-10, -11, 0, -16, 9, -12);
      c.bezierCurveTo(14, -10, 20, -9, 26, -9);
      c.quadraticCurveTo(33, -9, 33, -3);
      c.quadraticCurveTo(33, 3, 26, 3);
      c.bezierCurveTo(18, 4, 8, 4, 2, 6);
      c.bezierCurveTo(-4, 8, -9, 5, -9, 0);
      c.closePath();
    };
    A.shape(ctx, head, QL.body, QL.bodyS, { cel: [1.5, 2], lw: 2.5, hl: false });
    clipDo(ctx, head, () => {
      scaleTex(ctx, -12, -18, 24, 26, 5, QL.scale, 0.4, 1);
      // 鼻樑的一節節金鱗
      ctx.strokeStyle = A.c(QL.goldS);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(14 + i * 4, -10);
        ctx.quadraticCurveTo(15.5 + i * 4, -8, 14 + i * 4, -6);
      }
      ctx.stroke();
    });
    crescent(ctx, head, 1.4, 1.4, '#ffffff', 0.75);
    strokeOut(ctx, head, 2.5);
    // 鼻頭與鼻孔
    A.shape(ctx, (c) => c.ellipse(30, -5, 3.6, 3, 0, 0, TAU), QL.body, QL.bodyS, { lw: 1.6, shadeY: -4, hl: false });
    ctx.fillStyle = A.c('#3a2a2a');
    ctx.beginPath();
    ctx.ellipse(31, -4.5, 1.3, 0.9, 0.4, 0, TAU);
    ctx.fill();
    // 上唇的獠牙
    ctx.fillStyle = A.c('#ffffff');
    ctx.beginPath();
    ctx.moveTo(22, 3);
    ctx.lineTo(23.5, 7.5);
    ctx.lineTo(25, 3);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1;
    ctx.stroke();
    // 眉角（金色火焰形眉骨）
    A.shape(ctx, (c) => {
      c.moveTo(3, -9);
      c.quadraticCurveTo(10, -15, 17, -10);
      c.quadraticCurveTo(8, -12, 0, -16 + Math.sin(t * 6) * 0.8);
      c.quadraticCurveTo(-1, -12, 3, -9);
      c.closePath();
    }, QL.gold, QL.goldS, { lw: 1.4, shadeY: -11, hl: false });
    // 眼
    if (kind === 'normal' || kind === 'angry') gemEye(ctx, 9, -6, 3.1, '#8af0ff', '#2ea8d8', wind || strike ? 'angry' : kind, { glowCol: '#8af0ff', glowA: 0.6, slit: true, lw: 1.3 });
    else A.eye(ctx, 9, -6, 2.6, 2.6, kind, 0);
    // 臉頰的金色鰭
    for (let i = 0; i < 3; i++) {
      A.shape(ctx, (c) => {
        c.moveTo(-2, 1 + i * 1.5);
        c.quadraticCurveTo(-10, 2 + i * 4, -15 - i * 1.5, 4 + i * 5);
        c.quadraticCurveTo(-8, 2 + i * 3, -1, 4 + i * 1.5);
        c.closePath();
      }, QL.gold, QL.goldS, { lw: 1.2, hl: false, shadeY: 6 });
    }
    // 近側長鬚（從上唇往後上方飄）
    const wpath = () => {
      ctx.beginPath();
      ctx.moveTo(27, 0);
      ctx.bezierCurveTo(38, 2, 34, 14, 22 + wh, 16);
      ctx.bezierCurveTo(12 + wh, 18, 6 + wh, 24, 10 + wh * 1.3, 28);
    };
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3;
    wpath();
    ctx.stroke();
    ctx.strokeStyle = A.c(QL.gold);
    ctx.lineWidth = 1.5;
    wpath();
    ctx.stroke();
    // 近側的角
    mirrorAntler(ctx, 1, -11, 1.15, -0.5, t, false, glowA);
    ctx.restore();
    ctx.restore();
    ctx.restore();
    ctx.restore();
    void copy;
  }
  // ── 時停蝶（id stopmoth）：莊周夢蝶的神話巨蝶。前翅是夜空色的星盤錶面（金色細框、刻度環、旋轉的星盤指針），
  //    後翅拖著兩條長燕尾、尾端掛著新月；身體是象牙白與金，觸角捲成星星。fx.tick＝放時停領域：星盤發光、指針停住 ──
  const BF = { night: '#1c1a5c', night2: '#3a2a8e', violet: '#7a58d8', teal: '#3ac8d8', gold: '#ffd466', goldS: '#d09a30', ivory: '#fff6e4', ivoryS: '#d8c8e8', moon: '#fff2c0', eye: '#8af0ff' };
  function bfForePath(c) {
    c.moveTo(3, -46);
    c.bezierCurveTo(8, -66, 26, -90, 44, -90);
    c.bezierCurveTo(54, -89, 55, -76, 50, -66);
    c.bezierCurveTo(44, -54, 24, -46, 3, -42);
    c.closePath();
  }
  function bfHindPath(c) {
    c.moveTo(3, -42);
    c.bezierCurveTo(22, -46, 40, -42, 39, -28);
    c.bezierCurveTo(38, -20, 30, -17, 26, -15);
    c.bezierCurveTo(28, -8, 32, -2, 34, 3);
    c.bezierCurveTo(28, 0, 22, -8, 18, -14);
    c.bezierCurveTo(10, -18, 5, -26, 3, -36);
    c.closePath();
  }
  // 星盤（astrolabe）：刻度環、十二宮小符號、旋轉的星網與兩根指針
  function astrolabe(ctx, x, y, r, t, rot, hr, mn, glowA) {
    if (glowA > 0) glowH(ctx, x, y, r * 2.2, BF.gold, glowA);
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = A.c(BF.gold);
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const big = i % 2 === 0;
      ctx.moveTo(Math.cos(a) * r * (big ? 0.78 : 0.86), Math.sin(a) * r * (big ? 0.78 : 0.86));
      ctx.lineTo(Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97);
    }
    ctx.stroke();
    // 星網（rete）：偏心的圓＋尖尖的星指
    ctx.save();
    ctx.rotate(rot);
    ctx.strokeStyle = rgba(BF.teal, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(r * 0.16, 0, r * 0.48, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = A.c(BF.gold);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66);
      ctx.lineTo(Math.cos(a + 0.18) * r * 0.4, Math.sin(a + 0.18) * r * 0.4);
      ctx.lineTo(Math.cos(a - 0.18) * r * 0.4, Math.sin(a - 0.18) * r * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // 指針
    ctx.strokeStyle = A.c(BF.ivory);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(hr) * r * 0.5, -Math.cos(hr) * r * 0.5);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(mn) * r * 0.78, -Math.cos(mn) * r * 0.78);
    ctx.stroke();
    ctx.fillStyle = A.c(BF.gold);
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function bfWing(ctx, t, tick, far, hr, mn, rot, foreK, hindK) {
    const fore = bfForePath;
    const hind = bfHindPath;
    // 後翅
    ctx.save();
    ctx.scale(hindK, 1);
    gradShape(ctx, hind, 3, -40, 34, 0, [[0, far ? BF.night : BF.violet], [0.5, far ? BF.night : BF.night2], [1, BF.night]], { noStroke: true });
    clipDo(ctx, hind, () => {
      // 月相眼紋
      ctx.fillStyle = rgba(BF.teal, far ? 0.5 : 0.85);
      ctx.beginPath();
      ctx.arc(26, -30, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c(BF.night);
      ctx.beginPath();
      ctx.arc(28, -31, 4.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c(BF.moon);
      ctx.beginPath();
      ctx.arc(26, -30, 3.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c(BF.night);
      ctx.beginPath();
      ctx.arc(27.6, -31, 2.8, 0, TAU);
      ctx.fill();
      // 金色翅脈
      ctx.strokeStyle = rgba(BF.gold, far ? 0.4 : 0.7);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      [[36, -34], [34, -22], [26, -14], [30, -2]].forEach(([x, y]) => {
        ctx.moveTo(4, -40);
        ctx.quadraticCurveTo((x + 4) / 2 + 2, (y - 40) / 2 - 3, x, y);
      });
      ctx.stroke();
      // 內側的金邊
      ctx.strokeStyle = A.c(BF.gold);
      ctx.lineWidth = 3;
      ctx.beginPath();
      hind(ctx);
      ctx.stroke();
    });
    strokeOut(ctx, hind, 2);
    // 尾端的新月
    const mx = 34;
    const my = 4;
    if (!far) glowH(ctx, mx, my, 9, BF.moon, 0.5 + tick * 0.4);
    A.shape(ctx, (c) => {
      c.arc(mx, my, 4.4, -0.6, PI + 0.6, false);
      c.arc(mx + 1, my - 1.4, 3.4, PI + 0.3, -0.3, true);
      c.closePath();
    }, BF.moon, BF.gold, { lw: 1.4, hl: false, shadeY: my + 2 });
    ctx.restore();
    // 前翅
    ctx.save();
    ctx.scale(foreK, 1);
    gradShape(ctx, fore, 3, -44, 48, -88, [[0, far ? BF.night2 : BF.violet], [0.45, BF.night2], [1, BF.night]], { noStroke: true });
    clipDo(ctx, fore, () => {
      // 星點
      for (let i = 0; i < 14; i++) {
        const px = 8 + hash(i + (far ? 40 : 10)) * 44;
        const py = -86 + hash(i + 60) * 42;
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
        ctx.fillStyle = rgba('#ffffff', 0.4 + tw * 0.5);
        const s = hash(i + 90) < 0.25 ? 1.6 : 1;
        ctx.fillRect(px, py, s, s);
      }
      // 星雲霧
      glowH(ctx, 18, -60, 18, BF.teal, far ? 0.15 : 0.3);
      // 金色翅脈
      ctx.strokeStyle = rgba(BF.gold, far ? 0.45 : 0.75);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      [[44, -89], [52, -76], [48, -62], [36, -50]].forEach(([x, y]) => {
        ctx.moveTo(4, -45);
        ctx.quadraticCurveTo((x + 4) / 2 - 3, (y - 45) / 2 - 6, x, y);
      });
      ctx.stroke();
      // 翅尖的金色細框（雙線＋小珠）
      ctx.strokeStyle = A.c(BF.gold);
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      fore(ctx);
      ctx.stroke();
      ctx.strokeStyle = rgba(BF.gold, 0.7);
      ctx.lineWidth = 0.9;
      ctx.save();
      ctx.translate(20, -64);
      ctx.scale(0.84, 0.84);
      ctx.translate(-20, 64);
      ctx.beginPath();
      fore(ctx);
      ctx.stroke();
      ctx.restore();
    });
    if (!far) crescent(ctx, fore, 1.3, 1.3, '#c8b8ff', 0.6);
    strokeOut(ctx, fore, 2.2);
    // 星盤
    astrolabe(ctx, 30, -68, 11.5, t, rot, hr, mn, (far ? 0.25 : 0.45) * (0.4 + tick));
    // 翅緣的金珠
    ctx.fillStyle = A.c(BF.gold);
    [[44, -90], [51, -80], [51, -68]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }
  function stopmoth(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const dead = !!m.dead;
    const hurt = m.hurtT > 0;
    const tick = amt(fx.tick, 0);
    const kind = eyeKind(m);
    const wind = ph === 'wind' || tick > 0;
    // 振翅：時停施法中翅膀張到最開、慢慢停住
    const fl = dead ? 0.35 : tick > 0 ? 1 - tick * 0.05 : Math.sin(t * 6);
    const foreK = dead ? 0.45 : tick > 0 ? 1 : 0.72 + fl * 0.28;
    const hindK = dead ? 0.45 : tick > 0 ? 1 : 0.76 + Math.sin(t * 6 - 0.5) * 0.24;
    // 指針：平常走、施法時快轉到 12 點然後停
    const hr = tick > 0 ? lerp(t * 0.5, 0, tick) : t * 0.5;
    const mn = tick > 0 ? lerp(t * 3, 0, tick) : t * 3;
    const rot = t * (tick > 0 ? 3 : 0.4);
    ctx.save();
    ctx.translate(hurt ? Math.sin(t * 60) * 1.2 : 0, 0);
    // 身後的光暈與飄著的時之塵
    glowH(ctx, 0, -48, 70, BF.violet, 0.25 + tick * 0.25);
    if (tick > 0) {
      runeRing(ctx, 0, -50, 58 + tick * 6, -t * 0.4, rgbOf(BF.gold), tick * 0.8, 12);
      ctx.strokeStyle = rgba(BF.gold, tick * 0.8);
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * 66, -50 - Math.cos(a) * 66);
        ctx.lineTo(Math.sin(a) * (i % 3 ? 70 : 74), -50 - Math.cos(a) * (i % 3 ? 70 : 74));
        ctx.stroke();
      }
    }
    // 翅膀：遠側（左）先畫，縮小一點、偏暗
    const wing = (side, far) => {
      ctx.save();
      ctx.translate(side * (far ? -2 : 1), -44);
      ctx.scale(side * (far ? 0.86 : 1), far ? 0.95 : 1);
      ctx.rotate(wind ? -0.1 : 0);
      ctx.translate(0, 44);
      bfWing(ctx, t, tick, far, hr, mn, rot * side, foreK, hindK);
      ctx.restore();
    };
    wing(-1, true);
    wing(1, false);
    // ── 身體：象牙白＋金色節環 ──
    const abd = (c) => {
      c.moveTo(-4, -42);
      c.bezierCurveTo(-5, -30, -3, -16, 0, -10);
      c.bezierCurveTo(3, -16, 5, -30, 4, -42);
      c.closePath();
    };
    A.shape(ctx, abd, BF.ivory, BF.ivoryS, { cel: [1.5, 0], lw: 2, hl: false });
    ctx.strokeStyle = A.c(BF.goldS);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const y = -38 + i * 5.5;
      const w = 4.2 - i * 0.6;
      ctx.moveTo(-w, y);
      ctx.quadraticCurveTo(0, y + 1.5, w, y);
    }
    ctx.stroke();
    const thorax = (c) => c.ellipse(0, -48, 6, 8, 0, 0, TAU);
    A.shape(ctx, thorax, BF.ivory, BF.ivoryS, { cel: [1.5, 1.5], lw: 2.2, hl: false });
    clipDo(ctx, thorax, () => {
      ctx.fillStyle = rgba(BF.gold, 0.8);
      ctx.beginPath();
      ctx.moveTo(0, -55);
      ctx.lineTo(3, -48);
      ctx.lineTo(0, -41);
      ctx.lineTo(-3, -48);
      ctx.closePath();
      ctx.fill();
    });
    strokeOut(ctx, thorax, 2.2);
    // 頭
    const hx = 0;
    const hy = -60;
    // 捲成星星的觸角
    [-1, 1].forEach((s) => {
      const sw = Math.sin(t * 2 + s) * 1.5;
      const fn = cb(hx + s * 2, hy - 5, hx + s * 6, hy - 18, hx + s * 16 + sw, hy - 24, hx + s * 18 + sw, hy - 18);
      limb(ctx, (c) => {
        const p0 = fn(0);
        c.moveTo(p0[0], p0[1]);
        for (let i = 1; i <= 12; i++) {
          const p = fn(i / 12);
          c.lineTo(p[0], p[1]);
        }
      }, 3.2, BF.gold);
      const e = fn(1);
      glowH(ctx, e[0], e[1], 7, BF.gold, 0.6 + tick * 0.4);
      A.shape(ctx, (c) => starPath(c, e[0], e[1], 4, 1.8, 4, t * 0.5), BF.moon, BF.gold, { lw: 1.2, hl: false, shadeY: e[1] + 1 });
    });
    const head = (c) => c.ellipse(hx, hy, 7.5, 6.5, 0, 0, TAU);
    A.shape(ctx, head, BF.ivory, BF.ivoryS, { cel: [1.5, 1.5], lw: 2.2, hl: [hx - 3, hy - 3, 2, 1.2] });
    // 額上的小星盤寶石
    glowH(ctx, hx, hy - 4, 5, BF.eye, 0.6);
    ctx.fillStyle = A.c(BF.teal);
    ctx.beginPath();
    ctx.moveTo(hx, hy - 7);
    ctx.lineTo(hx + 1.8, hy - 4.5);
    ctx.lineTo(hx, hy - 2.5);
    ctx.lineTo(hx - 1.8, hy - 4.5);
    ctx.closePath();
    ctx.fill();
    // 眼（兩顆閃著星光的大眼）
    if (kind === 'normal' || kind === 'angry') {
      [-1, 1].forEach((s) => {
        A.ellipse(ctx, hx + s * 3.6, hy + 0.5, 2.6, 3, '#1c1a5c', null, { lw: 1.2, hl: false });
        ctx.fillStyle = A.c(BF.eye);
        ctx.beginPath();
        ctx.arc(hx + s * 3.6, hy + 1.4, 1.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx + s * 3.6 - 1.3, hy - 1.3, 1.2, 1.2);
      });
      if (kind === 'angry' || wind) {
        brow(ctx, hx - 6, hy - 3.5, hx - 1.5, hy - 2);
        brow(ctx, hx + 6, hy - 3.5, hx + 1.5, hy - 2);
      }
    } else {
      A.eye(ctx, hx - 3.4, hy + 0.5, 1.8, 1.8, kind, 0);
      A.eye(ctx, hx + 3.4, hy + 0.5, 1.8, 1.8, kind, 0);
    }
    // 細長的口器（捲起來）
    ctx.strokeStyle = A.c(BF.goldS);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(hx, hy + 8, 2.2, -PI / 2, PI * 1.2);
    ctx.stroke();
    // 灑落的時之鱗粉
    if (!dead) {
      for (let i = 0; i < 8; i++) {
        const q = (t * (tick > 0 ? 0.15 : 0.5) + i / 8) % 1;
        const px = (hash(i + 5) - 0.5) * 80;
        const py = -40 + q * 50;
        ctx.save();
        ctx.globalAlpha *= (1 - q) * 0.9;
        sparkle(ctx, px, py, 1.8 + hash(i) * 1.5, i % 2 ? '#fff2b0' : '#bff4ff');
        ctx.restore();
      }
    }
    ctx.restore();
  }
  // ── 銜尾蛇（id ouroboros）：宏偉的翡翠龍蛇。象牙金的後掠雙角、紫色鰭帆與頸褶、金色腹甲，
  //    鱗片上刻著循環符文，一道光沿著身體從尾流到頭再回到尾。fx.wheel＝咬住尾巴變成高速滾動的龍環 ──
  const OU = { body: '#2fae8c', bodyS: '#1a6c6a', dark: '#0e3a46', belly: '#ffe6a0', bellyS: '#d4a24a', fin: '#8a5ad8', finS: '#5a36a0', horn: '#fff0c8', hornS: '#d8b060', rune: '#b8fff0', runeH: '#7a4aff', eye: '#ffb020', mouth: '#6a1a3a' };
  // Catmull-Rom 曲線：穿過每個點
  function spline(pts) {
    const n = pts.length - 1;
    return (s) => {
      const f = clamp(s, 0, 1) * n;
      const i = Math.min(n - 1, Math.floor(f));
      const u = f - i;
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(n, i + 2)];
      const u2 = u * u;
      const u3 = u2 * u;
      const k = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      return [k(p0[0], p1[0], p2[0], p3[0]), k(p0[1], p1[1], p2[1], p3[1])];
    };
  }
  // 蛇身：鰭帆 → 身體（漸層、鱗、腹甲、流動符文）→ 亮邊
  function ouroBody(ctx, spine, wf, t, o) {
    const n = o.n || 40;
    const path = (c) => taper(c, spine, wf, n);
    // 鰭帆（背側）：一整片紫色膜＋金色鰭條，邊緣一段段的弧
    const finSide = o.finSide || -1;
    {
      const N = 14;
      const baseP = [];
      const tipP = [];
      for (let i = 0; i <= N; i++) {
        const s = lerp(o.finFrom, o.finTo, i / N);
        const p = along(spine, s, (finSide * wf(s)) / 2 - finSide * 2);
        const a = p[2] + finSide * PI / 2 - finSide * 0.35;
        const L = (i % 2 ? 7 : 11) * (0.5 + Math.sin((i / N) * PI) * 0.7) + Math.sin(t * 5 + i) * 1;
        baseP.push(p);
        tipP.push([p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L]);
      }
      const finPath = (c) => {
        c.moveTo(baseP[0][0], baseP[0][1]);
        for (let i = 0; i <= N; i++) {
          if (i === 0) c.lineTo(tipP[0][0], tipP[0][1]);
          else {
            const mx = (tipP[i - 1][0] + tipP[i][0]) / 2 + (baseP[i][0] - tipP[i][0]) * 0.25;
            const my = (tipP[i - 1][1] + tipP[i][1]) / 2 + (baseP[i][1] - tipP[i][1]) * 0.25;
            c.quadraticCurveTo(mx, my, tipP[i][0], tipP[i][1]);
          }
        }
        c.lineTo(baseP[N][0], baseP[N][1]);
        for (let i = N; i >= 0; i--) c.lineTo(baseP[i][0], baseP[i][1]);
        c.closePath();
      };
      gradShape(ctx, finPath, baseP[0][0], baseP[0][1], baseP[N][0], baseP[N][1] - 10, [[0, OU.finS], [0.5, OU.fin], [1, OU.finS]], { noStroke: true });
      ctx.strokeStyle = A.c('#ffd98a');
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i <= N; i += 2) {
        ctx.moveTo(baseP[i][0], baseP[i][1]);
        ctx.lineTo(tipP[i][0], tipP[i][1]);
      }
      ctx.stroke();
      strokeOut(ctx, finPath, 1.8);
    }
    // 身體
    const P0 = spine(0.3);
    const P1 = spine(0.7);
    gradShape(ctx, path, P0[0], P0[1] - 20, P1[0], P1[1] + 20, [[0, OU.body], [1, OU.bodyS]], { noStroke: true });
    clipDo(ctx, path, () => {
      // 背側深色、腹側金色腹甲
      for (let i = 0; i <= n; i++) {
        const s = i / n;
        if (s < 0.04) continue;
        const w = wf(s);
        const pb = along(spine, s, (-finSide * w) * 0.36);
        ctx.save();
        ctx.translate(pb[0], pb[1]);
        ctx.rotate(pb[2]);
        ctx.fillStyle = A.c(OU.belly);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, w * 0.24, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = A.c(OU.bellyS);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(1.8, -w * 0.24);
        ctx.lineTo(1.8, w * 0.24);
        ctx.stroke();
        ctx.restore();
      }
      // 鱗片：沿著身體一排排的小弧
      ctx.strokeStyle = rgba(OU.dark, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < n * 1.5; i++) {
        const s = i / (n * 1.5);
        const w = wf(s);
        for (let k = -1; k <= 0; k++) {
          const p = along(spine, s, finSide * w * (0.12 + (k + 1) * 0.2) + ((i % 2) * w * 0.1));
          const r = Math.max(1.2, w * 0.14);
          const a = p[2];
          ctx.moveTo(p[0] + Math.cos(a + PI / 2) * r, p[1] + Math.sin(a + PI / 2) * r);
          ctx.arc(p[0], p[1], r, a + PI / 2, a - PI / 2, finSide > 0);
        }
      }
      ctx.stroke();
      // 背脊的暗色帶
      ctx.strokeStyle = rgba(OU.dark, 0.35);
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const p = along(spine, i / 30, (finSide * wf(i / 30)) * 0.38);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
    });
    crescent(ctx, path, o.rimDx || 1.6, o.rimDy || 1.8, '#c8fff0', 0.6);
    strokeOut(ctx, path, 2.6);
    // 流動的循環符文：一道光從尾跑到頭（每個符文依距離亮起）
    const pulse = ((t * (o.fast ? 1.4 : 0.45)) % 1) * 1.3 - 0.15;
    ctx.lineCap = 'round';
    for (let i = 1; i < 12; i++) {
      const s = 0.08 + i * 0.075;
      if (s > 0.95) break;
      const p = along(spine, s, finSide * wf(s) * 0.1);
      const d = Math.abs(s - pulse);
      const k = Math.max(0.28, 1 - d * 6) * (o.boost || 1);
      glowH(ctx, p[0], p[1], 7, OU.runeH, 0.55 * k);
      ctx.strokeStyle = rgba(k > 0.5 ? '#ffffff' : OU.rune, Math.min(1, 0.5 + k * 0.5));
      ctx.lineWidth = 1.3;
      rune(ctx, p[0], p[1], Math.max(2, wf(s) * 0.17), i, p[2] + PI / 2);
    }
  }
  // 龍頭（原點在頭根部、面向 +x）；open 0..1 張嘴
  function ouroHead(ctx, t, open, kind, glowEye, biting) {
    // 頸褶（紫色鰭扇）
    for (let i = 0; i < 4; i++) {
      const a = PI * 0.62 + i * 0.28;
      const L = 14 + (i % 2) * 3;
      A.shape(ctx, (c) => {
        c.moveTo(0, 0);
        c.lineTo(Math.cos(a - 0.2) * L, Math.sin(a - 0.2) * L);
        c.quadraticCurveTo(Math.cos(a) * L * 0.8, Math.sin(a) * L * 0.8, Math.cos(a + 0.18) * L, Math.sin(a + 0.18) * L);
        c.closePath();
      }, OU.fin, OU.finS, { lw: 1.5, hl: false, shadeY: 6 });
    }
    // 後掠的雙角（遠側先畫）
    const horn = (x, y, L, rot, far) => {
      const fn = qb(x, y, x - L * 0.5, y - L * 0.25 + rot, x - L, y + L * 0.05 + rot);
      A.shape(ctx, (c) => taper(c, fn, (q) => 5.5 * (1 - q * 0.9), 10), far ? OU.hornS : OU.horn, OU.hornS, { cel: [1, 1], lw: 1.8, hl: false });
      ctx.strokeStyle = A.c(OU.hornS);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        const a = along(fn, i * 0.2, 2.2);
        const b = along(fn, i * 0.2, -2.2);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
    };
    horn(4, -8, 22, -4, true);
    // 下顎
    ctx.save();
    ctx.translate(2, 3);
    ctx.rotate(open * 0.55);
    A.shape(ctx, (c) => {
      c.moveTo(-2, -1);
      c.bezierCurveTo(8, 0, 18, 0, 22, 2);
      c.quadraticCurveTo(20, 6, 14, 6);
      c.bezierCurveTo(6, 6, 0, 5, -2, -1);
      c.closePath();
    }, OU.belly, OU.bellyS, { lw: 2, shadeY: 3, hl: false });
    if (open > 0.2) {
      ctx.fillStyle = '#ffffff';
      [[18, 1], [12, 1]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x - 1.4, y);
        ctx.lineTo(x, y - 3.5);
        ctx.lineTo(x + 1.4, y);
        ctx.fill();
      });
    }
    ctx.restore();
    if (open > 0.2) {
      A.shape(ctx, (c) => {
        c.moveTo(24, 1);
        c.quadraticCurveTo(14, 4 + open * 10, 2, 3);
        c.closePath();
      }, OU.mouth, null, { lw: 1.2 });
    }
    // 上頭
    const head = (c) => {
      c.moveTo(-4, 2);
      c.bezierCurveTo(-6, -8, 2, -13, 10, -10);
      c.bezierCurveTo(16, -8, 22, -6, 27, -4);
      c.quadraticCurveTo(31, -2, 29, 2);
      c.bezierCurveTo(20, 3, 8, 3, 2, 5);
      c.quadraticCurveTo(-3, 6, -4, 2);
      c.closePath();
    };
    A.shape(ctx, head, OU.body, OU.bodyS, { cel: [1.5, 2], lw: 2.4, hl: false });
    clipDo(ctx, head, () => {
      ctx.fillStyle = rgba(OU.dark, 0.35);
      ctx.beginPath();
      ctx.ellipse(10, -9, 14, 3, 0.15, 0, TAU);
      ctx.fill();
      scaleTex(ctx, -6, -12, 20, 16, 4, OU.dark, 0.4, 0.9);
    });
    crescent(ctx, head, 1.3, 1.3, '#c8fff0', 0.7);
    strokeOut(ctx, head, 2.4);
    // 上排獠牙
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1;
    [[24, 2], [17, 3]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(x - 1.4, y);
      ctx.lineTo(x, y + 4);
      ctx.lineTo(x + 1.4, y);
      ctx.fill();
      ctx.stroke();
    });
    // 鼻孔、眉骨
    ctx.fillStyle = A.c('#0a2a2a');
    ctx.beginPath();
    ctx.ellipse(26, -3, 1.4, 0.9, 0.3, 0, TAU);
    ctx.fill();
    A.shape(ctx, (c) => {
      c.moveTo(4, -8);
      c.quadraticCurveTo(10, -13, 16, -8);
      c.quadraticCurveTo(10, -9, 4, -6);
      c.closePath();
    }, OU.horn, OU.hornS, { lw: 1.3, hl: false, shadeY: -8 });
    // 眼
    if (kind === 'normal' || kind === 'angry') gemEye(ctx, 10, -5, 2.8, '#ffe070', OU.eye, 'angry', { glowCol: OU.eye, glowA: glowEye, slit: true, lw: 1.3 });
    else A.eye(ctx, 10, -5, 2.4, 2.4, kind, 0);
    // 長鬚
    ctx.lineCap = 'round';
    const wh = Math.sin(t * 3) * 2;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.4;
    const wp = () => {
      ctx.beginPath();
      ctx.moveTo(25, 1);
      ctx.bezierCurveTo(22, 8, 10, 10, 2 + wh, 11);
      ctx.quadraticCurveTo(-6 + wh, 12, -12 + wh * 1.5, 18);
    };
    wp();
    ctx.stroke();
    ctx.strokeStyle = A.c(OU.horn);
    ctx.lineWidth = 1.1;
    wp();
    ctx.stroke();
    horn(6, -9, 26, -2, false);
    void biting;
  }
  function ouroboros(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const dead = !!m.dead;
    const hurt = m.hurtT > 0;
    const wheel = !!fx.wheel && !dead;
    const kind = eyeKind(m);
    ctx.save();
    ctx.translate(hurt ? Math.sin(t * 60) * 1.2 : 0, 0);
    if (wheel) {
      // ── 龍環：咬住自己的尾巴、高速滾動 ──
      const R = 32;
      const cy = -R - 7;
      const rot = t * 9;
      glowH(ctx, 0, cy, R * 2, OU.runeH, 0.35);
      // 殘影弧線（滾動方向 +x，順時針）
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = rgba(k % 2 ? OU.rune : '#ffffff', 0.55 - k * 0.12);
        ctx.lineWidth = 3 - k * 0.6;
        ctx.beginPath();
        ctx.arc(0, cy, R + 14 + k * 5, PI * 0.55 + k * 0.2, PI * 1.2 + k * 0.2);
        ctx.stroke();
      }
      speedLines(ctx, -R - 10, cy, R * 1.6, 5, 16, t, rgba('#dffff4', 0.7));
      // 地上擦出的火星
      for (let i = 0; i < 4; i++) {
        const q = (t * 3 + i / 4) % 1;
        ctx.fillStyle = rgba(i % 2 ? '#ffe68a' : OU.rune, 1 - q);
        ctx.fillRect(-6 - q * 30, -2 - q * 10 + i, 2.2, 2.2);
      }
      ctx.save();
      ctx.translate(0, cy);
      ctx.rotate(rot);
      const spine = (s) => {
        const a = s * TAU * 0.9;
        return [Math.cos(a) * R, Math.sin(a) * R];
      };
      const wf = (s) => (s < 0.12 ? lerp(4, 18, s / 0.12) : 18 + Math.sin(s * PI) * 2);
      // 內側 = 腹甲，外側 = 鰭帆（spine 順時針，外側在切線的左邊）
      ouroBody(ctx, spine, wf, t, { finSide: -1, finFrom: 0.1, finTo: 0.9, fast: true, boost: 1.3, rimDx: 0, rimDy: 0 });
      // 頭（在 s=1 附近）咬住尾巴（s=0）
      const hp = spine(1);
      const ha = TAU * 0.9 + PI / 2;
      ctx.save();
      ctx.translate(hp[0], hp[1]);
      ctx.rotate(ha);
      ctx.scale(1.2, 1.2);
      ouroHead(ctx, t, 0.35, kind, 0.8, true);
      ctx.restore();
      ctx.restore();
    } else {
      // ── 平時：S 形在地上蜿蜒，頭像眼鏡蛇一樣昂起 ──
      const wind = ph === 'wind';
      const strike = ph === 'strike';
      const und = dead ? 0 : t * (walking(m) ? 5 : 2);
      const rise = dead ? 0 : strike ? 1.15 : wind ? 0.85 : 1;
      const lunge = strike ? 10 : wind ? -4 : 0;
      const base = [[-66, -6], [-52, -10], [-38, -17], [-22, -16], [-6, -12], [10, -14], [22, -26 * rise], [26 + lunge * 0.5, -42 * rise], [32 + lunge, -54 * rise]];
      const pts = base.map(([x, y], i) => {
        const k = i < 6 ? 1 : 0.3;
        return [x, dead ? Math.min(-5, y * 0.2) : y + Math.sin(und + i * 1.1) * 3 * k];
      });
      if (dead) {
        pts[6] = [26, -8];
        pts[7] = [36, -8];
        pts[8] = [46, -7];
      }
      const spine = spline(pts);
      const wf = (s) => (s < 0.6 ? lerp(3, 25, Math.pow(s / 0.6, 0.7)) : lerp(25, 16, (s - 0.6) / 0.4));
      ouroBody(ctx, spine, wf, t, { finSide: -1, finFrom: 0.15, finTo: 0.88 });
      const e = along(spine, 1, 0);
      ctx.save();
      ctx.translate(e[0] - 2, e[1]);
      ctx.rotate(dead ? 0.2 : strike ? 0.25 : wind ? -0.25 : -0.05 + Math.sin(t * 2) * 0.05);
      ctx.scale(1.4, 1.4);
      ouroHead(ctx, t, dead ? 0.4 : strike ? 1 : wind ? 0.7 : 0, kind, wind || strike ? 0.8 : 0.5, false);
      ctx.restore();
    }
    ctx.restore();
  }
  // ── 時之聖甲蟲（id clocksnail）：埃及神話的凱布利。青金石色的金屬甲殼刻著金色時刻，前腳推著一輪發光的太陽盤（盤面是十二時刻環）。
  //    fx.gear＝施加速魔法：鞘翅打開、張開埃及式的綠松石金羽翼，太陽盤爆亮、光芒與時刻環快轉、金色光環往外擴散 ──
  const SC = { lapis: '#3a5ad0', lapisS: '#1c2c86', deep: '#101a4c', sheen: '#5ae0e8', gold: '#ffd05a', goldS: '#c0842a', leg: '#1c2250', turq: '#3ad0c0', turqS: '#1a8a90', sun: '#ffb830', sunS: '#e0661e', sunL: '#fff4c0' };
  function sunDisc(ctx, x, y, r, spin, g, t) {
    // 光芒
    glowH(ctx, x, y, r * (2.2 + g * 0.8), SC.sun, 0.45 + g * 0.45);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin * 0.5);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const L = r * (i % 2 ? 1.25 : 1.45 + g * 0.35) + Math.sin(t * 6 + i) * 1.2;
      ctx.fillStyle = rgba(i % 2 ? SC.sun : SC.sunL, 0.75);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.09) * r * 0.95, Math.sin(a - 0.09) * r * 0.95);
      ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
      ctx.lineTo(Math.cos(a + 0.09) * r * 0.95, Math.sin(a + 0.09) * r * 0.95);
      ctx.fill();
    }
    ctx.restore();
    const disc = (c) => c.arc(x, y, r, 0, TAU);
    ctx.save();
    ctx.beginPath();
    disc(ctx);
    const gr = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
    gr.addColorStop(0, A.c(SC.sunL));
    gr.addColorStop(0.55, A.c('#ffd24a'));
    gr.addColorStop(1, A.c(SC.sunS));
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.clip();
    // 時刻環（會轉）
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.strokeStyle = A.c('#b8501a');
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const big = i % 3 === 0;
      ctx.lineWidth = big ? 2 : 1.1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.76);
      ctx.lineTo(Math.cos(a) * r * (big ? 0.95 : 0.88), Math.sin(a) * r * (big ? 0.95 : 0.88));
      ctx.stroke();
    }
    ctx.fillStyle = A.c('#c8601e');
    for (let i = 0; i < 12; i++) {
      const a = ((i + 0.5) / 12) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.56, Math.sin(a) * r * 0.56, 1.2, 0, TAU);
      ctx.fill();
    }
    // 中心的荷魯斯之眼（簡化）
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.22, r * 0.12, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = A.c('#b8501a');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.07, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (g > 0) glowH(ctx, x, y, r * 0.9, '#ffffff', g * 0.55);
    crescent(ctx, disc, -2, -2, SC.sunS, 0.6);
    strokeOut(ctx, disc, 2.6);
  }
  // 埃及式羽翼：一排排綠松石、青金、金色的長羽
  function egyptWing(ctx, x, y, open, t, far) {
    if (!(open > 0.02)) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.15 + open * 0.55 - (far ? 0.25 : 0) + Math.sin(t * 14) * 0.05 * open);
    ctx.scale(0.4 + 0.6 * open, 0.4 + 0.6 * open);
    const n = 8;
    const bands = [[SC.lapis, SC.turq, 34], [SC.turq, SC.gold, 23], [SC.gold, SC.sunL, 13]];
    bands.forEach(([c0, c1, L], bi) => {
      for (let i = n - 1; i >= 0; i--) {
        const ax = -2 - i * 5.2;
        const ang = PI / 2 + 0.2 + i * 0.07;
        feather(ctx, ax, 0, L * (0.78 + i * 0.05), 6.5, ang, far ? SC.lapisS : c0, far ? c0 : c1, { lw: 1.2, curl: 0 });
      }
      void bi;
    });
    A.shape(ctx, (c) => A.roundRect(c, -46, -3.5, 50, 6, 3), far ? SC.goldS : SC.gold, SC.goldS, { lw: 1.6, hl: false, shadeY: 0.5 });
    ctx.restore();
  }
  function clocksnail(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const dead = !!m.dead;
    const hurt = m.hurtT > 0;
    const g = dead ? 0 : amt(fx.gear, 0);
    const walk = walking(m) && !dead;
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const kind = eyeKind(m);
    const cyc = t * 9;
    const push = strike ? 7 : wind ? -3 : 0;
    const spin = t * (walk ? 2.2 : 0.4) + g * t * 6;
    ctx.save();
    ctx.translate(hurt ? Math.sin(t * 60) * 1.2 : 0, 0);
    // 加速光環：從太陽盤往外擴散的金圈＋地上的時刻陣
    if (g > 0) {
      glowH(ctx, 0, -34, 90, '#ffcc60', 0.4 * g);
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.4 + i / 3) % 1;
        ctx.strokeStyle = rgba('#ffd66e', (1 - q) * 0.9 * g);
        ctx.lineWidth = 3 * (1 - q) + 1;
        ctx.beginPath();
        ctx.ellipse(0, -30, 34 + q * 46, (34 + q * 46) * 0.75, 0, 0, TAU);
        ctx.stroke();
      }
      runeRing(ctx, 0, -4, 52, t * 1.5, '255,214,110', 0.8 * g, 12, 0.22);
    }
    const bx = -12;
    const by = -28;
    // 遠側的腳
    const legC = (x0, y0, x1, y1, x2, y2, far) => {
      limb(ctx, (c) => {
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
        c.lineTo(x2, y2);
      }, far ? 4.2 : 5, far ? SC.deep : SC.leg);
      ctx.fillStyle = A.c(far ? SC.goldS : SC.gold);
      ctx.beginPath();
      ctx.arc(x1, y1, far ? 1.6 : 2, 0, TAU);
      ctx.fill();
      // 腳上的小刺
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      ctx.moveTo(mx, my);
      ctx.lineTo(mx - 3, my - 2);
      ctx.stroke();
    };
    const lw = (o) => (walk ? Math.sin(cyc + o) * 5 : 0);
    const ll = (o) => (walk ? Math.max(0, Math.cos(cyc + o)) * 3 : 0);
    legC(bx - 4, by + 8, bx - 20 + lw(0), by + 12, bx - 26 + lw(0), -ll(0), true);
    legC(bx + 8, by + 10, bx + 10 + lw(2), by + 18, bx + 16 + lw(2), -ll(2), true);
    // 遠側翅膀
    egyptWing(ctx, bx + 2, by - 10, g, t, true);
    // 太陽盤（在前面滾）
    const dx = 32 + push;
    const dr = 22 + g * 2;
    const dy = -dr - 1;
    // 遠側前腳搭在盤上
    legC(bx + 22, by - 6, bx + 30 + push * 0.6, by - 14, dx - dr * 0.72, dy - dr * 0.55, true);
    sunDisc(ctx, dx, dy, dr, spin, g, t);
    // ── 身體 ──
    const tilt = -0.12 + (strike ? 0.08 : 0);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(tilt);
    // 鞘翅（打開時往上掀）
    const eOpen = g * 0.7;
    ctx.save();
    ctx.translate(14, -10);
    ctx.rotate(eOpen * 0.55);
    ctx.translate(-14, 10);
    const ely = (c) => {
      c.moveTo(14, -10);
      c.bezierCurveTo(10, -24, -20, -26, -30, -12);
      c.bezierCurveTo(-36, -2, -30, 12, -16, 14);
      c.bezierCurveTo(-2, 16, 12, 10, 14, -10);
      c.closePath();
    };
    gradShape(ctx, ely, -24, -22, 8, 14, [[0, '#5a7ae8'], [0.45, SC.lapis], [1, SC.lapisS]], { noStroke: true });
    clipDo(ctx, ely, () => {
      // 金屬光澤的條紋（縱溝）
      ctx.strokeStyle = rgba(SC.deep, 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.moveTo(12, -8 + i * 4);
        ctx.bezierCurveTo(0, -22 + i * 7, -20, -22 + i * 7, -32, -8 + i * 5);
      }
      ctx.stroke();
      // 青綠色的虹彩反光
      ctx.fillStyle = rgba(SC.sheen, 0.55);
      ctx.beginPath();
      ctx.ellipse(-8, -14, 16, 4, -0.12, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.6);
      ctx.beginPath();
      ctx.ellipse(-12, -17, 7, 1.8, -0.12, 0, TAU);
      ctx.fill();
      // 刻在殼上的時刻：金色弧線＋十二道刻痕
      ctx.strokeStyle = A.c(SC.gold);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(-8, 1, 17, 11, -0.1, PI * 1.02, PI * 1.98);
      ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = PI * (1.05 + i * 0.075);
        const r0 = i % 3 === 0 ? 0.8 : 0.88;
        ctx.moveTo(-8 + Math.cos(a) * 17 * r0, 1 + Math.sin(a) * 11 * r0);
        ctx.lineTo(-8 + Math.cos(a) * 17, 1 + Math.sin(a) * 11);
      }
      ctx.stroke();
      // 時針（跟著施法快轉）
      const ha = -PI / 2 + t * (0.3 + g * 5);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-8, 1);
      ctx.lineTo(-8 + Math.cos(ha) * 9, 1 + Math.sin(ha) * 6);
      ctx.stroke();
    });
    volume(ctx, ely, -8, -4, 26, 0.3, 0.35, SC.deep);
    crescent(ctx, ely, 1.8, 1.8, '#d8f0ff', 0.75);
    crescent(ctx, ely, -1.6, -1.6, SC.sheen, 0.5);
    strokeOut(ctx, ely, 2.6);
    // 鞘翅邊緣的金線
    ctx.strokeStyle = A.c(SC.gold);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(12, -8);
    ctx.bezierCurveTo(2, 12, -14, 14, -28, 4);
    ctx.stroke();
    ctx.restore();
    // 頭與前胸
    const pron = (c) => c.ellipse(22, -4, 12, 10.5, 0.1, 0, TAU);
    A.shape(ctx, pron, SC.lapis, SC.lapisS, { cel: [2, 2], lw: 2.4, hl: false });
    clipDo(ctx, pron, () => {
      glowH(ctx, 18, -10, 10, SC.sheen, 0.5);
      ctx.strokeStyle = A.c(SC.gold);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(22, -2, 7, PI * 1.1, PI * 1.9);
      ctx.stroke();
    });
    crescent(ctx, pron, 1.4, 1.4, '#bfe8ff', 0.7);
    strokeOut(ctx, pron, 2.4);
    // 頭：鏟狀頭盾，前緣六顆金齒
    const head = (c) => {
      c.moveTo(30, -12);
      c.quadraticCurveTo(40, -12, 42, -4);
      for (let i = 0; i < 3; i++) {
        c.lineTo(43.5 - i * 1.2, -1 + i * 2.6);
        c.lineTo(41 - i * 1.2, 0 + i * 2.6);
      }
      c.quadraticCurveTo(36, 8, 30, 6);
      c.closePath();
    };
    A.shape(ctx, head, SC.lapisS, SC.deep, { cel: [1, 1], lw: 2.2, hl: false });
    ctx.strokeStyle = A.c(SC.gold);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(33, -10);
    ctx.quadraticCurveTo(40, -9, 41.5, -3);
    ctx.stroke();
    // 眼（發光的琥珀複眼）
    if (kind === 'normal' || kind === 'angry') gemEye(ctx, 34, -3, 2.8, '#ffe070', '#ff9a20', g > 0 || wind ? 'angry' : kind, { glowCol: '#ffb040', glowA: 0.5 + g * 0.4, lw: 1.3 });
    else A.eye(ctx, 34, -3, 2.4, 2.4, kind, 0);
    // 觸角（扇狀）
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(38, 4);
    ctx.lineTo(42, 8);
    ctx.stroke();
    A.shape(ctx, (c) => c.ellipse(43, 9, 2.4, 1.6, 0.6, 0, TAU), SC.gold, null, { lw: 1.1, hl: false });
    ctx.restore();
    // 近側翅膀
    egyptWing(ctx, bx + 4, by - 12, g, t, false);
    // 近側的腳
    legC(bx - 2, by + 12, bx - 14 + lw(PI), by + 18, bx - 18 + lw(PI), -ll(PI), false);
    legC(bx + 12, by + 12, bx + 16 + lw(PI + 2), by + 20, bx + 22 + lw(PI + 2), -ll(PI + 2), false);
    legC(bx + 24, by + 2, bx + 34 + push * 0.6, by - 2, dx - dr * 0.85, dy + dr * 0.25, false);
    ctx.restore();
  }
  // ── 虛空鯨（id pouchroo）：在空中游的鯨，身體是星雲（深靛底、洋紅與青色星雲、星點與星座線），
  //    腹部有一道發光的次元裂縫、喉腹褶是青色光紋。fx.warp（1＝完全潛進腹部的裂縫、消失）；出來時張嘴衝撞 ──
  const WH = { top: '#1c1650', mid: '#3a2a8e', belly: '#b8a8f0', bellyS: '#7a68c8', pleat: '#8af4ff', neb1: '#ff6ad0', neb2: '#5ae8ff', rim: '#9af0ff', fin: '#2a2270', rift: '#e8a0ff', eye: '#fff2a0' };
  // 裂縫形狀（橫向的眼形、邊緣鋸齒）
  function riftSlit(ctx, x, y, w, h, t, a, rot) {
    if (!(a > 0) || w < 1) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.globalAlpha *= Math.min(1, a);
    glowH(ctx, 0, 0, w * 1.4 + 6, WH.rift, 0.6);
    const n = 8;
    const path = (c) => {
      for (let i = 0; i <= n; i++) {
        const q = i / n;
        const xx = -w + q * 2 * w;
        const b = Math.sin(q * PI);
        const jag = (i % 2 ? 1 : -1) * 1.5 * b + Math.sin(t * 9 + i) * 0.8 * b;
        i ? c.lineTo(xx, -h * b + jag) : c.moveTo(xx, -h * b + jag);
      }
      for (let i = n; i >= 0; i--) {
        const q = i / n;
        const xx = -w + q * 2 * w;
        const b = Math.sin(q * PI);
        const jag = (i % 2 ? -1 : 1) * 1.5 * b;
        c.lineTo(xx, h * b + jag);
      }
      c.closePath();
    };
    clipDo(ctx, path, () => {
      starfield(ctx, -w - 2, -h - 4, w * 2 + 4, h * 2 + 8, 23, t, 1.3);
      glowH(ctx, 0, 0, w * 0.9, WH.neb1, 0.5);
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) {
        const q = (t * 0.9 + k / 3) % 1;
        ctx.strokeStyle = k % 2 ? rgba(WH.neb2, 0.8) : rgba(WH.rift, 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, w * (1 - q) + 0.5, h * (1 - q) + 0.5, t * 2, 0, TAU);
        ctx.stroke();
      }
    });
    ctx.beginPath();
    path(ctx);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(WH.rift, 0.55);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = A.c(WH.neb2);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  function whaleBody(ctx, t, o) {
    const open = o.open;
    const swim = o.swim;
    // 尾柄往上翹
    const sw = swim * 4;
    const full = (c) => {
      c.moveTo(-52, -76 + sw);
      c.bezierCurveTo(-30, -80, -8, -90, 20, -88);
      c.bezierCurveTo(46, -87, 66, -80, 67, -60);
      c.bezierCurveTo(68, -44, 58, -34, 40, -32);
      c.bezierCurveTo(12, -28, -20, -38, -38, -56);
      c.bezierCurveTo(-44, -62, -50, -68, -56, -70 + sw);
      c.quadraticCurveTo(-56, -74 + sw, -52, -76 + sw);
      c.closePath();
    };
    const tail = [-49, -73 + sw];
    const ta = PI + 0.35 + swim * 0.15;
    // 尾鰭
    ctx.save();
    ctx.translate(tail[0], tail[1]);
    ctx.rotate(ta + swim * 0.2);
    const fluke = (c) => {
      c.moveTo(4, 0);
      c.bezierCurveTo(4, -10, 14, -20, 24, -22);
      c.quadraticCurveTo(18, -12, 20, -6);
      c.quadraticCurveTo(14, -2, 12, 0);
      c.quadraticCurveTo(14, 2, 20, 6);
      c.quadraticCurveTo(18, 12, 24, 22);
      c.bezierCurveTo(14, 20, 4, 10, 4, 0);
      c.closePath();
    };
    gradShape(ctx, fluke, 4, 0, 24, 0, [[0, WH.mid], [1, WH.top]], { noStroke: true });
    clipDo(ctx, fluke, () => {
      glowH(ctx, 18, -14, 8, WH.neb2, 0.45);
      glowH(ctx, 18, 14, 8, WH.neb1, 0.45);
    });
    crescent(ctx, fluke, -1.2, 1.2, WH.rim, 0.7);
    strokeOut(ctx, fluke, 2.2);
    ctx.restore();
    // 遠側胸鰭
    ctx.save();
    ctx.translate(18, -44);
    ctx.rotate(0.9 + swim * 0.15);
    A.shape(ctx, (c) => {
      c.moveTo(0, -4);
      c.bezierCurveTo(10, -4, 22, 0, 30, 6);
      c.quadraticCurveTo(18, 6, 0, 5);
      c.closePath();
    }, WH.fin, '#140e3a', { lw: 2, hl: false, shadeY: 3 });
    ctx.restore();
    ctx.beginPath();
    full(ctx);
    const g = ctx.createLinearGradient(0, -86, 0, -32);
    g.addColorStop(0, A.c(WH.top));
    g.addColorStop(0.55, A.c(WH.mid));
    g.addColorStop(0.72, A.c(WH.bellyS));
    g.addColorStop(1, A.c(WH.belly));
    ctx.fillStyle = g;
    ctx.fill();
    clipDo(ctx, full, () => {
      // 星雲
      glowH(ctx, -10, -70, 26, WH.neb1, 0.45);
      glowH(ctx, 22, -72, 22, WH.neb2, 0.4);
      glowH(ctx, -32, -62, 14, WH.neb2, 0.35);
      // 星點
      for (let i = 0; i < 26; i++) {
        const px = -52 + hash(i + 3) * 110;
        const py = -86 + hash(i + 33) * 30;
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3);
        ctx.fillStyle = rgba('#ffffff', 0.35 + tw * 0.6);
        const s = hash(i + 63) < 0.2 ? 1.8 : 1.1;
        ctx.fillRect(px, py, s, s);
      }
      // 星座線
      const cs = [[-30, -72], [-16, -78], [0, -74], [10, -80], [26, -76]];
      ctx.strokeStyle = rgba('#fff2c0', 0.45);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      cs.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      cs.forEach(([x, y]) => sparkle(ctx, x, y, 2, '#fff6c8'));
      // 喉腹褶：一道道青色光紋
      ctx.strokeStyle = rgba(WH.pleat, 0.75);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const y = -44 + i * 2.6;
        ctx.moveTo(60 - i * 2, y - 2);
        ctx.quadraticCurveTo(20, y + 3, -18 + i * 3, y);
      }
      ctx.stroke();
      // 頭上的星晶藤壺
      [[40, -76, 2.6], [48, -74, 1.8], [34, -80, 2]].forEach(([x, y, r]) => {
        glowH(ctx, x, y, r * 3, WH.neb2, 0.6);
        sparkle(ctx, x, y, r, '#dffcff');
      });
    });
    volume(ctx, full, 10, -62, 48, 0.2, 0.4, '#07051c');
    crescent(ctx, full, 1.5, 2.2, WH.rim, 0.75);
    crescent(ctx, full, -1.5, -1.8, WH.neb1, 0.4);
    ctx.beginPath();
    full(ctx);
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    // 背鰭
    A.shape(ctx, (c) => {
      c.moveTo(-22, -83);
      c.quadraticCurveTo(-18, -93, -8, -95);
      c.quadraticCurveTo(-11, -89, -6, -86);
      c.closePath();
    }, WH.top, '#0c0830', { lw: 2, hl: false, shadeY: -82 });
    // 嘴線與下顎
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (open > 0.05) {
      A.shape(ctx, (c) => {
        c.moveTo(63, -52);
        c.quadraticCurveTo(46, -50 + open * 8, 24, -50);
        c.quadraticCurveTo(42, -44 + open * 12, 60, -40 + open * 10);
        c.closePath();
      }, '#4a1a5a', null, { lw: 2 });
      // 鯨鬚
      ctx.strokeStyle = rgba('#f0e0ff', 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * 5;
        ctx.moveTo(x, -50.5);
        ctx.lineTo(x - 1, -47 + open * 2);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(63, -50);
      ctx.bezierCurveTo(50, -48, 36, -52, 24, -48);
      ctx.stroke();
    }
    // 眼（小小的、溫柔發光）
    const ex = 36;
    const ey = -58;
    if (o.kind === 'normal' || o.kind === 'angry') {
      glowH(ctx, ex, ey, 9, WH.eye, 0.55);
      A.ellipse(ctx, ex, ey, 3, 3.2, '#140c30', null, { lw: 1.4, hl: false });
      ctx.fillStyle = A.c(WH.eye);
      ctx.beginPath();
      ctx.arc(ex + 0.6, ey + 0.6, 1.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex - 1.6, ey - 1.8, 1.4, 1.4);
      if (o.kind === 'angry' || open > 0.5) brow(ctx, ex - 4, ey - 6, ex + 4, ey - 4);
    } else A.eye(ctx, ex, ey, 2.6, 2.6, o.kind, 0);
    // 近側胸鰭（座頭鯨式的長鰭，邊緣一顆顆星瘤）
    ctx.save();
    ctx.translate(12, -44);
    ctx.rotate(0.55 + swim * 0.25);
    const pf = (c) => {
      c.moveTo(0, -5);
      c.bezierCurveTo(12, -6, 26, -2, 38, 6);
      c.quadraticCurveTo(24, 8, 0, 6);
      c.closePath();
    };
    gradShape(ctx, pf, 0, -4, 0, 8, [[0, WH.mid], [1, WH.bellyS]], { noStroke: true });
    crescent(ctx, pf, 1, 1, WH.rim, 0.7);
    strokeOut(ctx, pf, 2.2);
    for (let i = 0; i < 4; i++) sparkle(ctx, 8 + i * 8, -3 + i * 2, 1.6, '#dffcff');
    ctx.restore();
    // 腹部的次元裂縫
    riftSlit(ctx, -6, -38, o.riftW, o.riftH, t, 1, -0.12);
  }
  function pouchroo(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const dead = !!m.dead;
    const hurt = m.hurtT > 0;
    const warp = dead ? 0 : amt(fx.warp, 0);
    const kind = eyeKind(m);
    const strike = ph === 'strike' && warp < 0.05;
    const wind = ph === 'wind';
    const swim = dead ? 0 : Math.sin(t * (walking(m) ? 3.2 : 1.8));
    const bob = dead ? 12 : Math.sin(t * 1.6) * 4;
    ctx.save();
    ctx.scale(0.88, 0.88);
    ctx.translate((hurt ? Math.sin(t * 60) * 1.2 : 0) + (strike ? 12 : wind ? -5 : 0), bob);
    if (dead) {
      ctx.translate(0, -58);
      ctx.rotate(0.12);
      ctx.translate(0, 58);
    }
    // 游過留下的星塵
    if (!dead && warp < 0.9) {
      for (let i = 0; i < 7; i++) {
        const q = (t * 0.7 + i / 7) % 1;
        ctx.fillStyle = rgba(i % 2 ? WH.neb2 : '#fff2c0', (1 - q) * 0.8 * (1 - warp));
        ctx.fillRect(-60 - q * 30, -78 + hash(i) * 30 + Math.sin(t * 2 + i) * 3, 2, 2);
      }
    }
    if (strike) speedLines(ctx, -64, -60, 50, 6, 22, t, rgba('#dffcff', 0.8));
    // 潛進腹部的裂縫：鯨魚被吸進去（縮小、扭轉、變淡），裂縫先張開再閉起來
    const rcx = -6;
    const rcy = -38;
    const k = warp;
    const riftOpen = Math.sin(Math.min(1, k * 1.15) * PI);
    if (k < 0.98) {
      ctx.save();
      const sc = 1 - k * 0.92;
      ctx.translate(rcx, rcy);
      ctx.rotate(k * k * 2.2);
      ctx.scale(sc, sc * (1 - k * 0.3));
      ctx.translate(-rcx, -rcy);
      ctx.globalAlpha *= 1 - k * k;
      if (k > 0.02) withTint('#b070ff', k * 0.8, () => whaleBody(ctx, t, { open: 0, swim, riftW: 22 + riftOpen * 6, riftH: 5 + riftOpen * 3, kind }));
      else whaleBody(ctx, t, { open: strike ? 1 : wind ? 0.3 : 0, swim, riftW: 22, riftH: 4.5 + Math.sin(t * 3) * 0.8, kind });
      ctx.restore();
    }
    // 吞下鯨魚的大裂縫
    if (k > 0.02) {
      riftSlit(ctx, rcx, rcy - 16 * k, 10 + riftOpen * 34, 4 + riftOpen * 24, t, Math.min(1, riftOpen * 1.6 + 0.15), PI / 2 - 0.1);
      // 往裂縫裡捲的星塵
      for (let i = 0; i < 10; i++) {
        const q = (t * 1.5 + i / 10) % 1;
        const a = i * 2.4 + q * 3;
        const r = (1 - q) * 50;
        ctx.fillStyle = rgba(i % 2 ? WH.neb2 : WH.rift, q * riftOpen);
        ctx.fillRect(rcx + Math.cos(a) * r - 1, rcy - 16 * k + Math.sin(a) * r * 0.8 - 1, 2.2, 2.2);
      }
    }
    ctx.restore();
  }
  // ── 重力魔眼（id gravjelly）：浮空的宇宙魔眼。黑曜星岩的眼殼（裂縫透著紫光、長著星晶刺）裡一顆巨大的眼珠，
  //    虹膜是旋轉的星系；斜斜的星環上繞著小行星；殼下垂著幾條觸鬚般的光。fx.pull＝吸引中：瞳孔張成黑洞、空間往內收縮 ──
  const EY = { rock: '#2e2250', rockS: '#150e2e', crack: '#c07aff', white: '#f4eeff', whiteS: '#b8a8e0', iris1: '#ffe27a', iris2: '#ff7ad0', iris3: '#6a3ae0', ring: '#ffd98a', ringS: '#c89a4a', ast: '#8a7a9a', astS: '#4a3e5a', tend: '#b78aff', tend2: '#6af0ff' };
  function asteroid(ctx, x, y, r, rot, seed) {
    const path = (c) => {
      for (let i = 0; i < 7; i++) {
        const a = rot + (i / 7) * TAU;
        const rr = r * (0.75 + hash(seed + i) * 0.4);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    };
    A.shape(ctx, path, EY.ast, EY.astS, { cel: [r * 0.25, r * 0.25], lw: 1.6, hl: false });
    ctx.fillStyle = rgba(EY.astS, 0.8);
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y - r * 0.1, r * 0.22, 0, TAU);
    ctx.fill();
    crescent(ctx, path, 0.9, 0.9, '#e8dcff', 0.7);
  }
  // 小黑洞：黑芯＋吸積盤（重力球、瞳孔共用）
  function voidCore(ctx, x, y, r, t, k) {
    glowH(ctx, x, y, r * 3, '#a060ff', 0.55 * k + 0.2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    ctx.scale(1, 0.38);
    ctx.lineWidth = r * 0.5;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = rgba(i === 1 ? '#ffe7a0' : '#ff7ad0', 0.75);
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.5 + i * 0.35), t * 3 + i, t * 3 + i + PI * 1.3);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = A.c('#06030e');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba('#ffe7a0', 0.9);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  function gravjelly(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const dead = !!m.dead;
    const hurt = m.hurtT > 0;
    const pull = !!fx.pull && !dead;
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const kind = eyeKind(m);
    const cx = 0;
    const cy = -60;
    const R = 26;
    const spinK = pull ? 4 : 1;
    ctx.save();
    ctx.translate(hurt ? Math.sin(t * 60) * 1.4 : 0, dead ? 6 : Math.sin(t * 1.8) * 2);
    // 吸引：往內收縮的空間扭曲圈
    if (pull) {
      glowH(ctx, cx, cy, 110, '#8a50ff', 0.35);
      for (let i = 0; i < 4; i++) {
        const q = 1 - ((t * 1.1 + i / 4) % 1);
        ctx.strokeStyle = rgba(i % 2 ? '#c8a0ff' : '#8af0ff', (1 - q) * 0.9);
        ctx.lineWidth = 1.5 + (1 - q) * 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 30 + q * 80, (30 + q * 80) * 0.85, t * 0.5, 0, TAU);
        ctx.stroke();
      }
      // 被吸進來的星屑
      for (let i = 0; i < 12; i++) {
        const q = (t * 1.4 + i / 12) % 1;
        const a = i * 2.1 - q * 2;
        const r = (1 - q) * 100 + 28;
        ctx.fillStyle = rgba('#efe0ff', q);
        ctx.fillRect(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r * 0.85 - 1, 2.2, 2.2);
      }
    }
    glowH(ctx, cx, cy, 70, '#7a4aff', 0.3 + (wind ? 0.2 : 0));
    // 星環與小行星（後半）
    const ringRot = -0.18;
    const ringRX = 60;
    const ringRY = 15;
    const ringY = 13;
    const ringPt = (a) => {
      const x = Math.cos(a) * ringRX;
      const y = Math.sin(a) * ringRY;
      return [cx + x * Math.cos(ringRot) - y * Math.sin(ringRot), cy + ringY + x * Math.sin(ringRot) + y * Math.cos(ringRot)];
    };
    const ringHalf = (front) => {
      ctx.save();
      ctx.translate(cx, cy + ringY);
      ctx.rotate(ringRot);
      ctx.lineCap = 'round';
      const a0 = front ? 0 : PI;
      const a1 = front ? PI : TAU;
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRX, ringRY, 0, a0, a1);
      ctx.stroke();
      ctx.strokeStyle = A.c(front ? EY.ring : EY.ringS);
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff6d8', front ? 0.9 : 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRX - 1, ringRY - 1, 0, a0, a1);
      ctx.stroke();
      // 內側一圈細環
      ctx.strokeStyle = rgba(EY.ring, 0.45);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRX * 0.84, ringRY * 0.8, 0, a0, a1);
      ctx.stroke();
      ctx.restore();
    };
    const asts = [0, 1, 2, 3, 4].map((i) => {
      const a = (dead ? 0 : t * 0.7 * spinK) + (i / 5) * TAU + hash(i) * 0.6;
      return { a, i, r: 3.4 + hash(i + 9) * 2.6 };
    });
    const drawAst = (front) => asts.forEach(({ a, i, r }) => {
      const na = ((a % TAU) + TAU) % TAU;
      if (na < PI !== front) return;
      const p = ringPt(a);
      asteroid(ctx, p[0], p[1] - 2, r * (front ? 1 : 0.8), t * (1 + i * 0.3), i * 11);
    });
    ringHalf(false);
    drawAst(false);
    // 光之觸鬚（從殼的下緣垂下）
    for (let i = 0; i < 5; i++) {
      const x0 = cx - 18 + i * 9;
      const sw = Math.sin(t * 2.4 + i * 1.3) * 6;
      const reach = pull ? 10 : 0;
      const fn = cb(x0, cy + 24, x0 + sw * 0.4, cy + 42, x0 - sw + reach, cy + 58, x0 + sw * 0.6 + reach * 1.5, cy + 80 - Math.abs(i - 2) * 8);
      const path = (c) => taper(c, fn, (q) => 7 * (1 - q) + 0.8, 14);
      const p1 = fn(1);
      gradShape(ctx, path, x0, cy + 22, p1[0], p1[1], [[0, EY.tend], [0.55, EY.tend2, 0.8], [1, EY.tend2, 0]], { noStroke: true });
      const tip = fn(0.85 + Math.sin(t * 3 + i) * 0.1);
      sparkle(ctx, tip[0], tip[1], 1.8, '#dffcff');
    }
    // 眼殼（黑曜星岩）
    const shell = (c) => {
      const n = 22;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const rr = R + 8 + Math.sin(a * 3 + 1) * 2.5 + hash(i + 3) * 2.5;
        const px = cx + Math.cos(a) * rr * 1.05;
        const py = cy + Math.sin(a) * rr * 0.98;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    };
    // 殼上的星晶刺（在殼後面）
    [[-2.2, 14], [-1.6, 18], [-1.0, 13], [-2.8, 10], [-0.5, 9]].forEach(([a, L], i) => {
      const bx = cx + Math.cos(a) * (R + 8);
      const by = cy + Math.sin(a) * (R + 8);
      const tx = cx + Math.cos(a) * (R + 8 + L);
      const ty = cy + Math.sin(a) * (R + 8 + L);
      const nx = -Math.sin(a) * 4;
      const ny = Math.cos(a) * 4;
      A.shape(ctx, (c) => {
        c.moveTo(bx + nx, by + ny);
        c.lineTo(tx, ty);
        c.lineTo(bx - nx, by - ny);
        c.closePath();
      }, i % 2 ? '#9a6aff' : '#c8a0ff', '#5a3ab0', { lw: 1.6, hl: false, shadeY: ty + 100 });
      glowH(ctx, tx, ty, 5, '#e0c8ff', 0.6);
    });
    A.shape(ctx, shell, EY.rock, EY.rockS, { cel: [3, 3], lw: 2.8, hl: false });
    clipDo(ctx, shell, () => {
      // 發光的裂紋
      ctx.strokeStyle = rgba(EY.crack, 0.85);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      [[-2.6, 0], [-0.4, 1], [2.2, 2], [1.1, 3]].forEach(([a, s]) => {
        let px = cx + Math.cos(a) * (R + 12);
        let py = cy + Math.sin(a) * (R + 12);
        ctx.moveTo(px, py);
        for (let k = 0; k < 3; k++) {
          px -= Math.cos(a + (hash(s * 5 + k) - 0.5)) * 4;
          py -= Math.sin(a + (hash(s * 5 + k) - 0.5)) * 4;
          ctx.lineTo(px, py);
        }
      });
      ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const a = hash(i + 70) * TAU;
        const d = R + 4 + hash(i + 80) * 8;
        ctx.fillStyle = rgba('#ffffff', 0.5 + 0.4 * Math.sin(t * 3 + i));
        ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.3, 1.3);
      }
    });
    crescent(ctx, shell, 2, 2, '#8a70d0', 0.8);
    crescent(ctx, shell, -2, -2, '#c07aff', 0.5);
    strokeOut(ctx, shell, 2.8);
    // 眼珠
    const eye = (c) => c.arc(cx, cy, R, 0, TAU);
    ctx.save();
    ctx.beginPath();
    eye(ctx);
    const wg = ctx.createRadialGradient(cx - 7, cy - 8, 2, cx, cy, R);
    wg.addColorStop(0, A.c('#ffffff'));
    wg.addColorStop(0.6, A.c(EY.white));
    wg.addColorStop(1, A.c(EY.whiteS));
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.clip();
    // 看向前方（+x）
    const look = pull ? 0 : 5;
    const ix = cx + look;
    const iy = cy + 1;
    const ir = R * (pull ? 0.72 : 0.64);
    // 星系虹膜
    const ig = ctx.createRadialGradient(ix, iy, 1, ix, iy, ir);
    ig.addColorStop(0, A.c(EY.iris1));
    ig.addColorStop(0.45, A.c(EY.iris2));
    ig.addColorStop(1, A.c(EY.iris3));
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(ix, iy, ir, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(t * 0.8 * spinK);
    ctx.strokeStyle = rgba('#fff2c8', 0.55);
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let j = 0; j <= 12; j++) {
        const q = j / 12;
        const a = (k * TAU) / 3 + q * 2.4;
        const r = ir * (0.2 + q * 0.75);
        j ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = hash(i + 20) * TAU;
      const d = ir * (0.3 + hash(i + 30) * 0.6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.2, 1.2);
    }
    ctx.restore();
    ctx.strokeStyle = A.c('#2a1060');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(ix, iy, ir, 0, TAU);
    ctx.stroke();
    // 瞳孔：平常是豎瞳，吸引時張成黑洞
    if (pull) voidCore(ctx, ix, iy, ir * 0.42, t, 1);
    else {
      if (wind || strike) glowH(ctx, ix, iy, ir * 0.9, '#ffe7a0', 0.7);
      ctx.fillStyle = A.c('#0a0418');
      ctx.beginPath();
      ctx.ellipse(ix, iy, ir * (wind ? 0.3 : 0.2), ir * 0.8, 0, 0, TAU);
      ctx.fill();
    }
    // 高光
    ctx.fillStyle = rgba('#ffffff', 0.9);
    ctx.beginPath();
    ctx.ellipse(cx - 9, cy - 10, 5, 3.2, -0.6, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 10, cy + 9, 1.8, 0, TAU);
    ctx.fill();
    // 眼皮：眨眼、受傷瞇眼、死亡閉上
    const lid = kind === 'closed' || kind === 'x' ? 1 : kind === 'hurt' ? 0.55 : kind === 'angry' || pull ? 0.18 : 0.08;
    if (lid > 0) {
      ctx.fillStyle = A.c(EY.rock);
      ctx.beginPath();
      ctx.moveTo(cx - R - 2, cy - R - 2);
      ctx.lineTo(cx + R + 2, cy - R - 2);
      ctx.lineTo(cx + R + 2, cy - R + lid * R);
      ctx.quadraticCurveTo(cx, cy - R + lid * R * 2.1, cx - R - 2, cy - R + lid * R);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = A.c(EY.rockS);
      ctx.beginPath();
      ctx.moveTo(cx - R - 2, cy + R + 2);
      ctx.lineTo(cx + R + 2, cy + R + 2);
      ctx.lineTo(cx + R + 2, cy + R - lid * R * 0.95);
      ctx.quadraticCurveTo(cx, cy + R - lid * R * 2, cx - R - 2, cy + R - lid * R * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - R - 2, cy - R + lid * R);
      ctx.quadraticCurveTo(cx, cy - R + lid * R * 2.1, cx + R + 2, cy - R + lid * R);
      ctx.moveTo(cx - R - 2, cy + R - lid * R * 0.95);
      ctx.quadraticCurveTo(cx, cy + R - lid * R * 2, cx + R + 2, cy + R - lid * R * 0.95);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = A.outline();
    ctx.beginPath();
    eye(ctx);
    ctx.stroke();
    if (kind === 'x') {
      ctx.strokeStyle = A.c(EY.crack);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 14);
      ctx.lineTo(cx - 2, cy - 4);
      ctx.lineTo(cx - 6, cy + 4);
      ctx.moveTo(cx - 2, cy - 4);
      ctx.lineTo(cx + 8, cy - 8);
      ctx.stroke();
    }
    // 發射重力球時：瞳孔前凝聚的小黑洞
    if (wind && !pull) voidCore(ctx, cx + R + 6, cy + 2, 4 + Math.sin(t * 20) * 0.6, t, 1);
    ringHalf(true);
    drawAst(true);
    ctx.restore();
  }
  // ── 雙生天馬（id parallelfox）：平行世界的雙子天馬。真身是金色（象牙金毛皮、金色羽翼與鬃毛），
  //    fx.fake＝另一個世界的假身：銀藍色、半透明、被切成錯位的幾段、有紅藍色差殘影與掃描線；fx.twin＝分身中，真身背後浮著淡淡的銀藍重影 ──
  const PG_GOLD = { coat: '#ffe4a0', coatS: '#e2a852', deep: '#9a6428', mane: '#fff0a0', mane2: '#ffb83a', maneS: '#e08a24', wing: '#fff8e4', wingS: '#f0c870', tip: '#ffb52a', hoof: '#d09a36', eye: '#ffb030', eyeD: '#c05a10', glow: '#ffe7a0' };
  const PG_SILV = { coat: '#dfeaff', coatS: '#8eaae6', deep: '#4a64b0', mane: '#dff4ff', mane2: '#b89aff', maneS: '#4a7ad8', wing: '#f6f9ff', wingS: '#aec4f2', tip: '#7ab0ff', hoof: '#6a88c8', eye: '#7af0ff', eyeD: '#2a7ad0', glow: '#bfe8ff' };
  function pegWing(ctx, x, y, ang, spread, P, far) {
    const La = far ? 18 : 22;
    const wx = x + Math.cos(ang) * La;
    const wy = y + Math.sin(ang) * La;
    const sp = 0.55 + 0.45 * spread;
    const c0 = far ? P.wingS : P.wing;
    // 初級飛羽
    for (let i = 6; i >= 0; i--) {
      const a = ang + 0.15 - i * 0.2 * sp;
      const L = (far ? 0.85 : 1) * (34 - i * 2.4);
      feather(ctx, wx - Math.cos(ang) * i * 1.5, wy - Math.sin(ang) * i * 1.5, L, 8, a, c0, P.tip, { colM: far ? P.wingS : P.wing, mid: 0.6, curl: 0.15, lw: 1.5, rim: far ? null : '#ffffff', rimA: 0.6 });
    }
    // 次級飛羽
    for (let j = 0; j < 4; j++) {
      const s = 0.15 + j * 0.22;
      feather(ctx, lerp(x, wx, s), lerp(y, wy, s), 17 + j * 2, 8, ang - 1.45 + j * 0.14 * sp, c0, P.wingS, { lw: 1.4, curl: 0.2 });
    }
    // 覆羽
    for (let j = 0; j < 5; j++) {
      const s = j * 0.2;
      feather(ctx, lerp(x, wx, s) + Math.sin(ang) * 2, lerp(y, wy, s) - Math.cos(ang) * 2, 11 - j * 0.5, 7, ang - 1.2 + j * 0.1, c0, far ? P.wingS : P.wing, { lw: 1.3, curl: 0.2 });
    }
    const arm = qb(x, y, (x + wx) / 2 + Math.sin(ang) * 3, (y + wy) / 2 - Math.cos(ang) * 3, wx, wy);
    const path = (c) => taper(c, arm, (s) => (far ? 6 : 7) * (1 - s * 0.55), 10);
    A.shape(ctx, path, c0, P.wingS, { cel: [1, 1.2], lw: 2, hl: false });
    if (!far) crescent(ctx, path, 1.2, 1.2, '#ffffff', 0.8);
    strokeOut(ctx, path, 2);
  }
  function pegasusBody(ctx, m, P, t) {
    const ph = phase(m);
    const dead = !!m.dead;
    const kind = eyeKind(m);
    const walk = walking(m) && !ph && !dead;
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const cyc = t * 9;
    const bob = walk ? -Math.abs(Math.sin(cyc)) * 3 : Math.sin(t * 2.2) * 0.8;
    let rear = 0;
    if (wind) rear = -0.28;
    if (strike) rear = 0.1;
    const flap = Math.sin(t * (walk ? 8 : wind ? 11 : 4.5));
    let ang = -2.1 + flap * 0.35;
    let spread = 0.75 + flap * 0.25;
    if (wind) {
      ang = -1.7;
      spread = 1;
    } else if (strike) {
      ang = -2.8;
      spread = 0.6;
    }
    if (dead) {
      ang = -2.9;
      spread = 0.2;
    }
    ctx.save();
    ctx.translate(strike ? 8 : 0, bob);
    // 後腳為軸心抬起前半身
    ctx.translate(-20, -30);
    ctx.rotate(rear);
    ctx.translate(20, 30);
    const leg = (hx, hy, off, front, far) => {
      let sw = walk ? Math.sin(cyc + off) * 0.45 : 0;
      if (wind && front) sw = -0.9 - (far ? 0.2 : 0);
      if (strike && front) sw = 0.5;
      const lift = walk ? Math.max(0, -Math.cos(cyc + off)) * 6 : 0;
      const rot = (x, y) => {
        const dx = x - hx;
        const dy = y - hy;
        return [hx + dx * Math.cos(sw) - dy * Math.sin(sw), hy + dx * Math.sin(sw) + dy * Math.cos(sw)];
      };
      const bend = wind && front ? 8 : 0;
      const pts = front ? [[hx, hy], [hx + 2, hy + 12], [hx - 1 + bend, -12 - lift], [hx + 1 + bend, -lift]] : [[hx, hy], [hx + 6, hy + 12], [hx - 6, -12 - lift], [hx - 2, -lift]];
      const Q = pts.map(([x, y]) => rot(x, y));
      if (!(wind && front)) Q[3][1] = Math.min(Q[3][1], -lift - bob);
      const fn = cb(Q[0][0], Q[0][1], Q[1][0], Q[1][1], Q[2][0], Q[2][1], Q[3][0], Q[3][1] - 4);
      const wf = (q) => (front ? 10 : 14) * Math.pow(1 - q, 1.8) + 3.6;
      const path = (c) => taper(c, fn, wf, 14);
      A.shape(ctx, path, far ? P.coatS : P.coat, far ? P.deep : P.coatS, { cel: [1.5, 1], hl: false, noStroke: true });
      if (!far) crescent(ctx, path, 1.2, 1, '#ffffff', 0.7);
      strokeOut(ctx, (c) => taper(c, fn, wf, 14, true), 2.2);
      // 距毛（腳踝的一撮羽毛狀毛）＋蹄
      const h = fn(0.82);
      A.shape(ctx, (c) => {
        c.moveTo(h[0] + 2, h[1] - 3);
        c.quadraticCurveTo(h[0] - 6, h[1] - 2, h[0] - 9, h[1] + 3);
        c.quadraticCurveTo(h[0] - 3, h[1] + 2, h[0] + 2, h[1] + 3);
        c.closePath();
      }, far ? P.maneS : P.mane, P.maneS, { lw: 1.3, hl: false, shadeY: h[1] + 1 });
      const e = fn(1);
      A.shape(ctx, (c) => {
        c.moveTo(e[0] - 3.5, e[1] - 1);
        c.lineTo(e[0] + 3.5, e[1] - 1);
        c.lineTo(e[0] + 4.5, e[1] + 4);
        c.lineTo(e[0] - 4, e[1] + 4);
        c.closePath();
      }, far ? P.maneS : P.hoof, null, { lw: 1.5 });
    };
    // 遠側翅膀、遠側腳
    pegWing(ctx, 6, -50, ang - 0.3, spread, P, true);
    leg(14, -34, PI, true, true);
    leg(-22, -36, 0, false, true);
    // 尾巴：金色長鬃，末端散成星光
    const tw = dead ? 0 : Math.sin(t * 3) * 4;
    for (let i = 2; i >= 0; i--) {
      const fn = cb(-30, -46, -46, -50 + i * 3, -46 - i * 3, -30 + tw, -54 - i * 3 + tw, -20 + i * 4);
      const path = (c) => taper(c, fn, (q) => (12 - i * 2.5) * Math.sin(Math.min(1, q * 0.9 + 0.2) * PI) * (1 - q * 0.5) + 2, 14);
      gradShape(ctx, path, -30, -44, -56, -18, [[0, P.mane], [0.6, i === 1 ? P.mane2 : P.mane], [1, P.maneS]], { lw: 1.6 });
    }
    sparkle(ctx, -56 + tw, -18, 2.4, P.glow);
    sparkle(ctx, -46 + tw, -30, 1.8, '#ffffff');
    // 身體
    const body = (c) => {
      c.moveTo(18, -52);
      c.bezierCurveTo(28, -48, 28, -32, 18, -28);
      c.bezierCurveTo(6, -24, -12, -26, -24, -28);
      c.bezierCurveTo(-36, -30, -38, -48, -28, -52);
      c.bezierCurveTo(-16, -56, 4, -55, 18, -52);
      c.closePath();
    };
    A.shape(ctx, body, P.coat, P.coatS, { cel: [2.5, 3], lw: 2.6, hl: false });
    clipDo(ctx, body, () => {
      ctx.strokeStyle = rgba(P.coatS, 0.8);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(-24, -40, 9, -0.8, 1.6);
      ctx.moveTo(16, -34);
      ctx.quadraticCurveTo(10, -30, 4, -30);
      ctx.stroke();
      // 身上的星紋
      [[-8, -44], [0, -40], [-14, -38]].forEach(([x, y], i) => sparkle(ctx, x, y, 2 - i * 0.3, P.glow));
    });
    volume(ctx, body, -4, -42, 30, 0.35, 0.25, P.deep);
    crescent(ctx, body, 1.8, 1.8, '#ffffff', 0.8);
    crescent(ctx, body, -1.5, -1.5, P.glow, 0.6);
    strokeOut(ctx, body, 2.6);
    // 近側腳
    leg(-18, -34, PI, false, false);
    leg(18, -34, 0, true, false);
    // 脖子與頭
    ctx.save();
    ctx.translate(16, -48);
    ctx.rotate(dead ? 0.6 : strike ? 0.2 : wind ? -0.2 : Math.sin(t * 2) * 0.04);
    const neckF = cb(0, 4, 4, -8, 8, -16, 14, -24);
    const neck = (c) => taper(c, neckF, (q) => 17 - q * 6, 12);
    A.shape(ctx, neck, P.coat, P.coatS, { cel: [2, 2], hl: false, noStroke: true });
    crescent(ctx, neck, 1.4, 1.4, '#ffffff', 0.7);
    strokeOut(ctx, (c) => taper(c, neckF, (q) => 17 - q * 6, 12, true), 2.4);
    // 頭
    ctx.save();
    ctx.translate(14, -26);
    ctx.rotate(0.45);
    const head = (c) => {
      c.moveTo(-6, -6);
      c.bezierCurveTo(-2, -10, 8, -10, 14, -6);
      c.bezierCurveTo(19, -3, 22, 1, 21, 5);
      c.bezierCurveTo(20, 9, 15, 9, 11, 7);
      c.bezierCurveTo(6, 6, 0, 6, -4, 4);
      c.bezierCurveTo(-8, 2, -8, -3, -6, -6);
      c.closePath();
    };
    A.shape(ctx, head, P.coat, P.coatS, { cel: [1.5, 1.5], lw: 2.3, hl: false });
    clipDo(ctx, head, () => {
      ctx.fillStyle = rgba(P.coatS, 0.6);
      ctx.beginPath();
      ctx.ellipse(18, 5, 5, 4, 0, 0, TAU);
      ctx.fill();
    });
    crescent(ctx, head, 1.3, 1.3, '#ffffff', 0.8);
    strokeOut(ctx, head, 2.3);
    // 鼻孔、嘴
    ctx.fillStyle = A.c(P.deep);
    ctx.beginPath();
    ctx.ellipse(19, 2, 1.3, 0.9, 0.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(20, 7);
    ctx.quadraticCurveTo(17, 8, 14, 7);
    ctx.stroke();
    // 耳
    A.shape(ctx, (c) => {
      c.moveTo(-2, -8);
      c.quadraticCurveTo(-2, -17, 2, -19);
      c.quadraticCurveTo(4, -13, 3, -8);
      c.closePath();
    }, P.coat, P.coatS, { lw: 1.6, hl: false, shadeY: -10 });
    // 眼
    if (kind === 'normal' || kind === 'angry') gemEye(ctx, 6, -2, 2.7, P.eye, P.eyeD, wind || strike ? 'angry' : kind, { glowCol: P.eye, glowA: 0.5, lw: 1.2 });
    else A.eye(ctx, 6, -2, 2.3, 2.3, kind, 0);
    ctx.restore();
    // 鬃毛：沿著脖子往後飄的長鬃（一綹綹 S 形）
    for (let i = 0; i < 5; i++) {
      const p = along(neckF, 0.05 + i * 0.22, -6.5);
      const fl = Math.sin(t * 4 + i * 0.9) * 3;
      const L = 24 - i * 2;
      const fn = cb(p[0] + 2, p[1] - 2, p[0] - L * 0.3, p[1] - 8 + fl, p[0] - L * 0.7, p[1] + 2 - fl, p[0] - L, p[1] - 2 + fl);
      gradShape(ctx, (c) => taper(c, fn, (q) => 9 * Math.sin(Math.min(1, q + 0.25) * PI * 0.85) * (1 - q * 0.6) + 0.8, 12), p[0], p[1], p[0] - L, p[1], [[0, P.mane], [0.6, i % 2 ? P.mane2 : P.mane], [1, P.maneS]], { lw: 1.5 });
    }
    // 瀏海
    const fp = neckF(1);
    gradShape(ctx, (c) => taper(c, qb(fp[0], fp[1] - 2, fp[0] + 6, fp[1] - 6, fp[0] + 10, fp[1] - 1), (q) => 6 * (1 - q) + 0.6, 8), fp[0], fp[1], fp[0] + 10, fp[1], [[0, P.mane], [1, P.mane2]], { lw: 1.3 });
    ctx.restore();
    // 近側翅膀
    pegWing(ctx, 2, -48, ang, spread, P, false);
    ctx.restore();
  }
  function parallelfox(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const twin = !!fx.twin;
    const fake = !!fx.fake;
    ctx.save();
    if (!fake) {
      // 分身中：背後浮著淡淡的、錯開的銀藍重影（另一個世界的自己）
      if (twin) {
        const off = 10 + Math.sin(t * 5) * 3;
        ctx.save();
        ctx.globalAlpha *= 0.3;
        ctx.translate(-off, -off * 0.4);
        pegasusBody(ctx, m, PG_SILV, t - 0.1);
        ctx.restore();
      }
      glowH(ctx, 0, -48, 60, PG_GOLD.glow, 0.25);
      pegasusBody(ctx, m, PG_GOLD, t);
    } else {
      // 假身：銀藍色、半透明、紅藍色差殘影、被水平切成幾段錯位（故障感）
      glowH(ctx, 0, -48, 64, '#8ab8ff', 0.35);
      ctx.save();
      ctx.globalAlpha *= 0.28;
      ctx.translate(-3, 0);
      withTint('#ff5ac8', 0.6, () => pegasusBody(ctx, m, PG_SILV, t));
      ctx.translate(6, 0);
      withTint('#3ae0ff', 0.6, () => pegasusBody(ctx, m, PG_SILV, t));
      ctx.restore();
      const bands = [[-110, -62], [-62, -44], [-44, -26], [-26, 10]];
      const seed = Math.floor(t * 7);
      ctx.save();
      ctx.globalAlpha *= 0.62;
      bands.forEach(([y0, y1], i) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-100, y0, 200, y1 - y0);
        ctx.clip();
        ctx.translate((hash(seed * 4 + i) - 0.5) * 9, 0);
        pegasusBody(ctx, m, PG_SILV, t);
        ctx.restore();
      });
      ctx.restore();
    }
    // 掃描線（分身中／假身）
    if (twin || fake) {
      ctx.fillStyle = fake ? 'rgba(170,200,255,0.6)' : 'rgba(255,236,170,0.45)';
      for (let i = 0; i < 3; i++) {
        const y = -8 - ((t * 60 + i * 29) % 90);
        ctx.fillRect(-50 + hash(i + Math.floor(t * 5)) * 20, y, 50 + hash(i * 3) * 40, 1.6);
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
  // 重力球（重力魔眼射出）：小黑洞＋吸積盤＋繞著轉的小行星，慢慢下墜
  function gravorb(ctx, p, t) {
    const r = Math.max(8, num(p.r, 12));
    const sd = num(p.seed, 0);
    glowH(ctx, 0, 0, r * 2.8, '#9a60ff', 0.5);
    // 被吸進去的小光點
    for (let i = 0; i < 6; i++) {
      const q = (t * 1.5 + i / 6 + sd) % 1;
      const a = i * 1.3 + q * 2.5;
      const rr = r * (2.4 - q * 1.6);
      ctx.fillStyle = rgba(i % 2 ? '#8af0ff' : '#efe0ff', q * 0.9);
      ctx.fillRect(Math.cos(a) * rr - 1, Math.sin(a) * rr - 1, 2, 2);
    }
    voidCore(ctx, 0, 0, r * 0.5, t + sd, 1);
    const a = t * 4 + sd;
    asteroid(ctx, Math.cos(a) * r * 1.35, Math.sin(a) * r * 0.55, Math.max(2.2, r * 0.22), t * 3, 5);
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
    g.addColorStop(0, 'rgba(90,70,200,0.10)');
    g.addColorStop(0.6, 'rgba(60,40,150,0.22)');
    g.addColorStop(0.92, 'rgba(255,210,110,0.36)');
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
    // 慢慢轉的符文環＋星盤的星網（和時停蝶翅膀上的星盤同一個樣式）
    runeRing(ctx, 0, 0, R * 0.64, t * 0.15, '255,226,140', 0.45, 12);
    ctx.save();
    ctx.rotate(-t * 0.1);
    ctx.strokeStyle = 'rgba(130,230,240,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(R * 0.1, 0, R * 0.36, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,226,140,0.55)';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5);
      ctx.lineTo(Math.cos(a + 0.12) * R * 0.3, Math.sin(a + 0.12) * R * 0.3);
      ctx.lineTo(Math.cos(a - 0.12) * R * 0.3, Math.sin(a - 0.12) * R * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
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
    // 凍結在空中的星塵與蝶翅鱗粉
    for (let i = 0; i < 16; i++) {
      const a = hash(i + 3) * TAU;
      const d = Math.sqrt(hash(i + 40)) * R * 0.85;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
      ctx.globalAlpha = fade * (0.5 + tw * 0.45);
      sparkle(ctx, Math.cos(a) * d, Math.sin(a) * d, i % 3 ? 2.4 : 4, i % 2 ? '#fff2b0' : '#bff4ff');
    }
    ctx.globalAlpha = fade;
    // 高光
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.88, PI * 1.08, PI * 1.38);
    ctx.stroke();
    ctx.restore();
  }
  // 次元裂口（虛空鯨從這裡鑽出來）：直立的星雲裂縫＋地上擴散的星塵漣漪（z.x, z.y 是地面上的底端），開→維持→關
  function rift(ctx, z, t) {
    const life = num(z.life, 1);
    const zt = num(z.t, 0);
    if (zt >= life) return;
    const open = Math.max(0, Math.min(1, zt / Math.min(0.3, life * 0.3), (life - zt) / Math.min(0.3, life * 0.3)));
    const e = open * open * (3 - 2 * open);
    if (e <= 0.01) return;
    const H = num(z.h, 120);
    const cy = -H / 2 - 6;
    ctx.save();
    ctx.translate(z.x, z.y);
    // 地上的漣漪
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const q = (zt * 1.2 + k / 3) % 1;
      ctx.strokeStyle = rgba(k % 2 ? WH.neb2 : WH.rift, (1 - q) * 0.7 * e);
      ctx.beginPath();
      ctx.ellipse(0, 0, 14 + q * 50, (14 + q * 50) * 0.2, 0, 0, TAU);
      ctx.stroke();
    }
    glowH(ctx, 0, cy, H * 0.65, WH.neb1, 0.3 * e);
    glowH(ctx, 0, cy, H * 0.4, WH.neb2, 0.25 * e);
    riftSlit(ctx, 0, cy, (H / 2) * (0.35 + 0.65 * e), 20 * e, t, 1, PI / 2);
    // 飛出的星塵碎片
    for (let i = 0; i < 8; i++) {
      const q = (t * 1.3 + i / 8) % 1;
      const s = i % 2 ? 1 : -1;
      const x = s * (10 * e + q * 30);
      const y = cy + (hash(i + 5) - 0.5) * H * 0.7 - q * 12;
      ctx.save();
      ctx.globalAlpha *= (1 - q) * e;
      sparkle(ctx, x, y, 2.5 + hash(i) * 1.5, i % 3 ? '#f0c8ff' : '#9af4ff');
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
    // 鳳凰時羽：一根金紅火羽，羽眼是沙漏，羽尖散成金沙
    timesand(ctx) {
      glow(ctx, 0, 0, 16, '255,170,80', 0.45);
      feather(ctx, -11, 12, 30, 13, -0.95, PHX.red, PHX.gold, { colM: PHX.orange, mid: 0.5, curl: 0.3, lw: 2, shaft: '#ffe7a0', rim: PHX.cream, rimA: 0.6 });
      ctx.save();
      ctx.translate(2, -4);
      ctx.rotate(-0.95);
      ctx.fillStyle = A.c('#2fb8b0');
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c(PHX.deep);
      ctx.beginPath();
      ctx.moveTo(-2.8, -2.4);
      ctx.lineTo(2.8, -2.4);
      ctx.lineTo(-2.8, 2.4);
      ctx.lineTo(2.8, 2.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = A.c('#ffe68a');
      [[12, -14], [14, -9], [9, -16], [15, -15]].forEach(([x, y]) => ctx.fillRect(x, y, 1.8, 1.8));
      sparkle(ctx, -10, -10, 3, '#fff2a8');
    },
    // 麒麟鏡鱗：一片會映出彩虹的鏡面鱗
    mirrorshard(ctx) {
      const path = (c) => {
        c.moveTo(0, -14);
        c.bezierCurveTo(12, -12, 14, 2, 0, 14);
        c.bezierCurveTo(-14, 2, -12, -12, 0, -14);
        c.closePath();
      };
      glow(ctx, 0, 0, 16, '190,240,255', 0.5);
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = prismGrad(ctx, -10, -12, 10, 12, 1);
      ctx.fill();
      clipDo(ctx, path, () => {
        ctx.fillStyle = rgba('#dff6ff', 0.55);
        ctx.fillRect(-16, -16, 32, 32);
        ctx.fillStyle = rgba('#ffffff', 0.9);
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(0, -14);
        ctx.lineTo(4, -14);
        ctx.lineTo(-10, 4);
        ctx.closePath();
        ctx.fill();
      });
      crescent(ctx, path, -1.6, -1.6, '#7ab8e0', 0.8);
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      ctx.strokeStyle = A.c(QL.gold);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.quadraticCurveTo(0, 12, 6, 8);
      ctx.stroke();
      sparkle(ctx, 9, -11, 3.5, '#ffffff');
    },
    // 時停蝶翅粉：一片夜空色的翅片，上面是金色星盤
    clockwing(ctx) {
      const path = (c) => {
        c.moveTo(-12, 12);
        c.bezierCurveTo(-14, -6, 0, -16, 14, -13);
        c.bezierCurveTo(16, 0, 6, 12, -12, 12);
        c.closePath();
      };
      glow(ctx, 0, 0, 16, '150,130,255', 0.45);
      gradShape(ctx, path, -12, 12, 14, -13, [[0, '#6a4ac8'], [0.6, '#2c2a7a'], [1, '#1a1650']], { noStroke: true });
      clipDo(ctx, path, () => {
        ctx.strokeStyle = A.c('#ffd466');
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(2, -1, 7, 0, TAU);
        ctx.stroke();
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(2, -1, 4.5, 0, TAU);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          ctx.moveTo(2 + Math.cos(a) * 7, -1 + Math.sin(a) * 7);
          ctx.lineTo(2 + Math.cos(a) * 8.8, -1 + Math.sin(a) * 8.8);
        }
        ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(2, -1);
        ctx.lineTo(6, -5);
        ctx.moveTo(2, -1);
        ctx.lineTo(0, 3);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        [[-8, 6], [9, -9], [-4, -6], [10, 4]].forEach(([x, y]) => ctx.fillRect(x, y, 1.4, 1.4));
      });
      crescent(ctx, path, 1.5, 1.5, '#b8a8ff', 0.7);
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      [[-12, -10], [12, 12], [-15, 2]].forEach(([x, y], i) => sparkle(ctx, x, y, 3 - i * 0.5, '#ffe9a0'));
    },
    // 銜尾蛇鱗：一片翡翠龍鱗，金邊，上面一個發光的 ∞ 符文
    ouroscale(ctx) {
      const path = (c) => {
        c.moveTo(0, -14);
        c.bezierCurveTo(14, -12, 14, 4, 0, 14);
        c.bezierCurveTo(-14, 4, -14, -12, 0, -14);
        c.closePath();
      };
      gradShape(ctx, path, -8, -12, 8, 12, [[0, '#5ae0b0'], [0.55, '#1f9a86'], [1, '#12505a']], { noStroke: true });
      clipDo(ctx, path, () => scaleTex(ctx, -14, -12, 28, 26, 7, '#0e3a44', 0.4, 1));
      crescent(ctx, path, 1.6, 1.6, '#c8ffe8', 0.8);
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = A.c('#ffd466');
      ctx.stroke();
      infRune(ctx, 0, 0, 6.5, 0, 1, '#ffffff', '#b070ff');
    },
    // 聖甲蟲太陽石：一顆封著朝陽的圓石，刻著十二時
    brassgear(ctx) {
      glow(ctx, 0, 0, 18, '255,190,80', 0.6);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        ctx.fillStyle = A.c(i % 3 ? '#ffb040' : '#fff0a0');
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.12) * 11, Math.sin(a - 0.12) * 11);
        ctx.lineTo(Math.cos(a) * (i % 3 ? 15 : 17), Math.sin(a) * (i % 3 ? 15 : 17));
        ctx.lineTo(Math.cos(a + 0.12) * 11, Math.sin(a + 0.12) * 11);
        ctx.fill();
      }
      const disc = (c) => c.arc(0, 0, 11, 0, TAU);
      ctx.save();
      ctx.beginPath();
      disc(ctx);
      const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 11);
      g.addColorStop(0, A.c('#fffbe0'));
      g.addColorStop(0.45, A.c('#ffd24a'));
      g.addColorStop(1, A.c('#e0701e'));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = A.c('#b8581a');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, TAU);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        ctx.moveTo(Math.cos(a) * 7.5, Math.sin(a) * 7.5);
        ctx.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5);
      }
      ctx.stroke();
      strokeOut(ctx, disc, 2.4);
      sparkle(ctx, -4, -4, 3, '#ffffff');
    },
    // 虛空鯨鬚：一片彎彎的鯨鬚板，裡面是星雲，末端是細細的鬚
    riftcloth(ctx) {
      const path = (c) => {
        c.moveTo(-10, -14);
        c.bezierCurveTo(4, -14, 12, -6, 12, 6);
        c.lineTo(8, 12);
        c.lineTo(5, 7);
        c.lineTo(2, 13);
        c.lineTo(-1, 6);
        c.lineTo(-4, 12);
        c.lineTo(-6, 4);
        c.bezierCurveTo(-4, -4, -8, -9, -12, -10);
        c.closePath();
      };
      glow(ctx, 0, 0, 16, '160,110,255', 0.45);
      clipDo(ctx, path, () => {
        starfield(ctx, -14, -16, 28, 30, 5, 0, 1.3);
        glow(ctx, 4, -2, 10, '255,120,210', 0.5);
        glow(ctx, -4, 6, 8, '110,240,255', 0.5);
        ctx.strokeStyle = rgba('#c8b8ff', 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          ctx.moveTo(-8 + i * 4, -12 + i);
          ctx.quadraticCurveTo(-2 + i * 4, 0, -4 + i * 3, 12);
        }
        ctx.stroke();
      });
      crescent(ctx, path, 1.4, 1.4, '#e8d8ff', 0.7);
      strokeOut(ctx, path, 2.3);
      sparkle(ctx, 10, -10, 3, '#8af4ff');
    },
    // 魔眼星核：一顆包著星環的水晶眼珠
    darkstar(ctx) {
      glow(ctx, 0, 0, 17, '180,110,255', 0.6);
      ctx.save();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 5, -0.35, PI * 0.95, PI * 2.05);
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffd98a');
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      const ball = (c) => c.arc(0, 0, 9.5, 0, TAU);
      A.shape(ctx, ball, '#2a1a5a', '#140c34', { cel: [1.5, 1.5], lw: 2.2, hl: false });
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 7);
      g.addColorStop(0, A.c('#fff2a0'));
      g.addColorStop(0.5, A.c('#ff8ad8'));
      g.addColorStop(1, A.c('#6a3ad8'));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0.5, 0.5, 6.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c('#10081e');
      ctx.beginPath();
      ctx.ellipse(0.8, 0.5, 1.6, 4.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3, -3.5, 1.8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 5, -0.35, PI * 0.05, PI * 0.95);
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffd98a');
      ctx.lineWidth = 2;
      ctx.stroke();
      sparkle(ctx, 12, -9, 3, '#ffffff');
    },
    // 天馬雙羽：一金一銀藍，交叉的兩根翼羽
    twintail(ctx) {
      glow(ctx, 0, 0, 16, '255,230,160', 0.4);
      feather(ctx, 10, 13, 28, 11, -2.05, '#8aa8e8', '#f0f8ff', { colM: '#c8dcff', curl: 0.2, lw: 2, shaft: '#ffffff', rim: '#ffffff', rimA: 0.6 });
      feather(ctx, -10, 13, 28, 11, -1.1, '#e8a830', '#fff6c8', { colM: '#ffd466', curl: -0.2, lw: 2, shaft: '#fff6d8', rim: '#ffffff', rimA: 0.6 });
      sparkle(ctx, 0, -12, 3, '#ffffff');
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
