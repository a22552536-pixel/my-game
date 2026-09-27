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

  // ───────────── 有蹄四足的骨架（鏡麒麟、雙生天馬共用） ─────────────
  // 角度以「往下」為 0、往前（+x）為正；腿的關節：根（肩／髖）→ 肘／膝蓋（後腳的 stifle）→ 腕／跗關節 → 球節 → 蹄冠
  const smooth = (u) => u * u * (3 - 2 * u);
  function dv(p, a, L) {
    return [p[0] + Math.sin(a) * L, p[1] + Math.cos(a) * L];
  }
  // 兩節 IK：r → f，長 a、b；fwd 關節往前凸（前腳腕），否則往後凸（後腳跗關節）。回傳 [關節, 實際末端]
  function ik2(r, f, a, b, fwd) {
    const dx = f[0] - r[0];
    const dy = f[1] - r[1];
    const d = Math.hypot(dx, dy) || 0.001;
    const dm = clamp(d, Math.abs(a - b) + 0.5, a + b - 0.05);
    const base = Math.atan2(dy, dx);
    const al = Math.acos(clamp((a * a + dm * dm - b * b) / (2 * a * dm), -1, 1));
    const j1 = [r[0] + Math.cos(base + al) * a, r[1] + Math.sin(base + al) * a];
    const j2 = [r[0] + Math.cos(base - al) * a, r[1] + Math.sin(base - al) * a];
    const side = (j) => (j[0] - r[0]) * dy - (j[1] - r[1]) * dx;
    return [(side(j1) > side(j2)) === fwd ? j1 : j2, [r[0] + Math.cos(base) * dm, r[1] + Math.sin(base) * dm]];
  }
  // 腿的姿勢：L = [上段, 前臂／脛, 管骨, 繫部]，hh = 蹄高。
  // o.ik：{ ua, gx, gy(著地點，蹄底), pa }；否則 FK：{ ua, fa, ca, pa }。回傳關節點 P[0..4]＋蹄的傾角
  function legPose(root, L, hh, front, o) {
    const j0 = dv(root, o.ua, L[0]);
    const hr = o.pa - 0.5;
    if (o.gx != null) {
      // 蹄底中心 → 蹄冠 → 球節
      const gy = o.gy - Math.abs(Math.sin(hr)) * 3.2;
      const H = [o.gx - Math.sin(hr) * hh, gy - Math.cos(hr) * hh];
      const F = dv(H, o.pa + PI, L[3]);
      const r = ik2(j0, F, L[1], L[2], front);
      const Fe = r[1];
      return { P: [root, j0, r[0], Fe, dv(Fe, o.pa, L[3])], hr };
    }
    const j1 = dv(j0, o.fa, L[1]);
    const F = dv(j1, o.ca, L[2]);
    return { P: [root, j0, j1, F, dv(F, o.pa, L[3])], hr };
  }
  // 步態：相位 p（0..1）→ 蹄的著地點與繫部角度。duty＝著地比例、S＝前後擺幅、H＝抬腳高度
  function gaitFoot(p, duty, S, H, x0, front) {
    p = ((p % 1) + 1) % 1;
    if (p < duty) {
      const u = p / duty;
      return { gx: x0 + S * (1 - 2 * u), gy: 0, pa: 0.5 + Math.sin(u * PI) * 0.16 - Math.max(0, u - 0.7) * 2.2, sw: 1 - 2 * u, lift: 0 };
    }
    const u = (p - duty) / (1 - duty);
    const k = Math.sin(u * PI);
    return { gx: x0 - S + 2 * S * smooth(u), gy: -k * H - (front ? Math.max(0, 0.5 - u) * H * 0.5 : 0), pa: lerp(-0.16, 0.5, smooth(u)) - k * (front ? 1.35 : 0.9), sw: -1 + 2 * smooth(u), lift: k };
  }
  // 沿節點折線的寬度：knots = [[段位 0..4, 寬], ...]
  function knotW(knots) {
    return (s) => {
      const x = s * 4;
      for (let i = 1; i < knots.length; i++) {
        if (x <= knots[i][0]) {
          const a = knots[i - 1];
          const b = knots[i];
          return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0] || 1));
        }
      }
      return knots[knots.length - 1][1];
    };
  }
  // 畫一條有蹄的腿。C：{ base, shade, rim, hoof, hoofS, band }；o：{ far, lw, tex(ctx,path,P) 額外細節 }
  function hoofLeg(ctx, J, W, hh, C, o) {
    o = o || {};
    const P = J.P;
    const sp = spline(P);
    const wf = knotW(W);
    const path = (c) => taper(c, sp, wf, 18);
    const top = P[0];
    const bot = P[4];
    gradShape(ctx, path, top[0], top[1], bot[0], bot[1], [[0, C.base], [0.55, C.base], [1, C.low || C.shade]], { noStroke: true, lw: o.lw || 2.2 });
    if (o.lite) {
      strokeOut(ctx, (c) => taper(c, sp, wf, 18, true), o.lw || 2.2);
      return { sp, wf };
    }
    if (o.tex) clipDo(ctx, path, () => o.tex(P));
    // 右下的背光、左上的亮邊
    crescent(ctx, path, -2.2, -0.8, C.shade, o.far ? 0.9 : 0.8);
    ctx.lineCap = 'round';
    // 前緣的亮邊（沿著腿的前側一道細光）
    if (C.rim && !o.far) {
      ctx.strokeStyle = rgba(C.rim, 0.75);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const s = 0.08 + i * 0.1;
        const p = along(sp, s, wf(s) * 0.5 - 1.3);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
    }
    // 腱：管骨後側一道細線
    const t0 = along(sp, 0.58, -wf(0.58) * 0.28);
    const t1 = along(sp, 0.72, -wf(0.72) * 0.3);
    ctx.strokeStyle = rgba(C.line || C.shade, o.far ? 0.5 : 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(t0[0], t0[1]);
    ctx.lineTo(t1[0], t1[1]);
    ctx.stroke();
    strokeOut(ctx, (c) => taper(c, sp, wf, 18, true), o.lw || 2.2);
    // 蹄
    const a = J.hr;
    const hw = wf(1) * 1.15;
    ctx.save();
    ctx.translate(bot[0], bot[1]);
    ctx.rotate(-a);
    const hoof = (c) => {
      c.moveTo(-hw * 0.55, -0.6);
      c.lineTo(hw * 0.5, -0.6);
      c.quadraticCurveTo(hw * 0.75, hh * 0.5, hw * 0.95, hh);
      c.lineTo(-hw * 0.62, hh);
      c.quadraticCurveTo(-hw * 0.66, hh * 0.45, -hw * 0.55, -0.6);
      c.closePath();
    };
    A.shape(ctx, hoof, C.hoof, C.hoofS, { cel: [-1.2, 0], lw: 1.7, hl: false });
    ctx.fillStyle = rgba('#ffffff', o.far ? 0.15 : 0.35);
    ctx.fillRect(-hw * 0.35, 0.8, 1.2, hh - 2);
    if (C.band) {
      ctx.strokeStyle = A.c(C.band);
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-hw * 0.52, 0.4);
      ctx.lineTo(hw * 0.52, 0.4);
      ctx.stroke();
    }
    ctx.restore();
    return { sp, wf };
  }

  // ═════════════ 終章：時空間神殿 ═════════════
  // ── 時之鳳凰（id hourowl）：金紅火焰的不死鳥，尾羽末端化成流動的時之沙、尾羽上有沙漏紋；胸口一顆沙漏心。
  //    fx.sand＝沙漏上半的沙量、fx.rewind＝浴火倒流（身後浮現逆轉的錶盤光環、全身竄火、沙往上流） ──
  const PHX = { red: '#ec4a2c', redS: '#a8233a', deep: '#6e1438', orange: '#ff9a34', gold: '#ffd95e', goldS: '#e39a2a', cream: '#fff3cc', hot: '#fff8d8', mask: '#5a0f2a' };
  // 鳳凰的大翅膀（區域座標：+x 是翼前緣「肩→肘→腕→翼尖」，飛羽往 -y 拖出；整片以 ang 旋轉）。
  // open 0..1 展開程度、bend 腕部彎折（上撲時手部收起、慢半拍）、heat 羽尖的火光
  function phxWing(ctx, x, y, ang, open, bend, far, t, heat) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const k = far ? 1.02 : 1.2;
    ctx.scale(k * lerp(0.8, 1, open), k);
    const fan = lerp(0.2, 1, open);
    const el = [13, 2];
    const wa = 0.12 + bend * 0.5;
    const wr = [el[0] + Math.cos(wa) * 15, el[1] + Math.sin(wa) * 15];
    const ha = wa + bend * 0.8;
    const tip = [wr[0] + Math.cos(ha) * 12, wr[1] + Math.sin(ha) * 12];
    const cR = far ? PHX.deep : PHX.redS;
    const cM = far ? PHX.redS : PHX.red;
    const cG = far ? PHX.goldS : PHX.gold;
    const prim = [];
    for (let i = 8; i >= 0; i--) {
      const q = i / 8;
      const a = ha - lerp(1.35, 0.08, q) * fan - (1 - fan) * 0.1 + Math.sin(t * 4 + i * 0.9) * 0.025;
      prim.push([lerp(wr[0], tip[0], q), lerp(wr[1], tip[1], q), a, lerp(34, 60, Math.pow(q, 0.8)) * (far ? 0.9 : 1), i]);
    }
    const sec = [];
    for (let j = 6; j >= 0; j--) {
      const q = j / 6;
      sec.push([lerp(1, wr[0], q), lerp(0.5, wr[1], q), lerp(-0.1, -PI / 2 - 0.3 + q * 0.18, fan), lerp(22, 29, q), j]);
    }
    // 剪影（外框只描一次）
    const tips = prim.concat(sec).map(([bx, by, a, L]) => [bx + Math.cos(a) * L, by + Math.sin(a) * L, bx + Math.cos(a) * L * 0.74, by + Math.sin(a) * L * 0.74]);
    const sil = (c) => {
      c.moveTo(-3, 2);
      c.lineTo(el[0], el[1] + 2.5);
      c.lineTo(wr[0], wr[1] + 2.5);
      c.lineTo(tip[0] + 1.5, tip[1] + 1);
      c.lineTo(tips[0][0], tips[0][1]);
      for (let i = 1; i < tips.length; i++) {
        const A0 = tips[i - 1];
        const B = tips[i];
        c.quadraticCurveTo((A0[2] + B[2]) / 2, (A0[3] + B[3]) / 2, B[0], B[1]);
      }
      c.lineTo(-4, -5);
      c.closePath();
    };
    gradShape(ctx, sil, 0, 0, tips[0][0], tips[0][1], [[0, cR], [0.45, cM], [0.8, PHX.orange], [1, cG]], { lw: 2.4 });
    // 初級飛羽：紅 → 橙 → 金，羽尖像火舌
    prim.forEach(([bx, by, a, L, i]) => {
      feather(ctx, bx, by, L, 9.5, a, cM, cG, { colM: PHX.orange, mid: 0.5, curl: -0.3 + Math.sin(t * 7 + i) * 0.1, lw: 1, shaft: far ? null : '#ffe7a0', rim: far ? null : PHX.cream, rimA: 0.45 });
      if (heat > 0.05 && !far && i % 2 === 0) glowH(ctx, bx + Math.cos(a) * L, by + Math.sin(a) * L, 10, PHX.orange, 0.45 * heat);
    });
    sec.forEach(([bx, by, a, L]) => feather(ctx, bx, by, L, 10, a, cR, cG, { colM: cM, mid: 0.55, curl: -0.3, lw: 1, rim: far ? null : PHX.orange, rimA: 0.5 }));
    // 覆羽（兩排）：金色的大覆羽、紅色的小覆羽
    const edge = [[-3, 0.5], el, wr, tip];
    const covert = (w0, w1, col, colS, n) => {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const s = i / n;
        const seg = Math.min(2, Math.floor(s * 3));
        const u = s * 3 - seg;
        pts.push([lerp(edge[seg][0], edge[seg + 1][0], u), lerp(edge[seg][1], edge[seg + 1][1], u), lerp(w0, w1, s)]);
      }
      const path = (c) => {
        c.moveTo(pts[0][0], pts[0][1] + 1.5);
        for (let i = 1; i <= n; i++) c.lineTo(pts[i][0], pts[i][1] + 1.5);
        for (let i = n; i > 0; i--) {
          const a = pts[i];
          const b = pts[i - 1];
          c.quadraticCurveTo((a[0] + b[0]) / 2 + 1.5, (a[1] + b[1]) / 2 - (a[2] + b[2]) / 2 - 2.5 - (i % 2) * 1.5, b[0] - 0.5, b[1] - b[2] * (i % 2 ? 1 : 0.85));
        }
        c.closePath();
      };
      gradShape(ctx, path, 0, 2, 0, -w0, [[0, col], [1, colS]], { lw: 1.3 });
      return path;
    };
    covert(15, 8, far ? PHX.redS : PHX.orange, cG, 8);
    const cp = covert(8, 4.5, cM, far ? PHX.redS : PHX.orange, 7);
    if (!far) crescent(ctx, cp, 1, 1, PHX.cream, 0.6);
    // 翼前緣
    const arm = spline([[-3, 1], el, wr, tip]);
    const path = (c) => taper(c, arm, (s) => lerp(far ? 6.5 : 8, 2.4, s), 16);
    A.shape(ctx, path, cM, cR, { cel: [0, -1.4], lw: 2, hl: false });
    if (!far) crescent(ctx, path, 0, 1.4, PHX.cream, 0.85);
    phxWingTime(ctx, prim, t + (far ? 0.37 : 0), heat * (far ? 0.6 : 1), far);
    ctx.restore();
  }
  // 翼緣的時間意象：羽尖拖出的時之符文與金沙流、漂浮的錶盤碎片、繞著翼尖轉的數字環
  function phxWingTime(ctx, prim, t, heat, lite) {
    ctx.lineCap = 'round';
    const tipOf = (P) => [P[0] + Math.cos(P[2]) * P[3], P[1] + Math.sin(P[2]) * P[3], P[2]];
    // 羽尖的符文與金沙（往羽毛延伸的方向飄走、漸漸淡去）
    for (let n = 0; n < prim.length; n += lite ? 4 : 2) {
      const [x, y, a] = tipOf(prim[n]);
      for (let j = 0; j < 3; j++) {
        const q = (t * 0.6 + j / 3 + n * 0.17) % 1;
        const d = 4 + q * 20;
        const px = x + Math.cos(a) * d + Math.cos(a + PI / 2) * Math.sin(q * 5 + n) * 3;
        const py = y + Math.sin(a) * d + Math.sin(a + PI / 2) * Math.sin(q * 5 + n) * 3;
        if (j === 0) {
          ctx.strokeStyle = rgba('#fff0b0', (1 - q) * 0.9);
          ctx.lineWidth = 0.9;
          rune(ctx, px, py, 2.4, n + Math.floor(t * 0.6 + n * 0.17), a + q * 2);
        } else {
          ctx.fillStyle = rgba(j % 2 ? PHX.gold : '#fff2b0', (1 - q) * 0.95);
          ctx.fillRect(px - 0.9, py - 0.9, 1.8, 1.8);
        }
      }
    }
    // 金沙流：從翼後緣往後飄的一道細流
    ctx.strokeStyle = rgba(PHX.gold, 0.35 + heat * 0.2);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let n = 1; n < prim.length; n += 3) {
      const [x, y, a] = tipOf(prim[n]);
      const w = Math.sin(t * 3 + n) * 3;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * 10 + Math.cos(a + PI / 2) * w, y + Math.sin(a) * 10 + Math.sin(a + PI / 2) * w, x + Math.cos(a - 0.4) * 22, y + Math.sin(a - 0.4) * 22);
    }
    ctx.stroke();
    // 漂浮的錶盤碎片（四分之一圈的錶框、刻度與一根指針，慢慢轉）
    (lite ? [[4, 10, 0.8]] : [[2, 12, 0], [6, 9, 1.7]]).forEach(([n, r, ph]) => {
      const [x, y, a] = tipOf(prim[n]);
      const cx = x + Math.cos(a + 0.5) * 14;
      const cy = y + Math.sin(a + 0.5) * 14 + Math.sin(t * 1.5 + ph) * 2;
      const rot = t * 0.5 + ph;
      ctx.strokeStyle = rgba('#ffe7a0', 0.85);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, rot, rot + 1.6);
      ctx.stroke();
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const aa = rot + i * 0.4;
        ctx.moveTo(cx + Math.cos(aa) * r * 0.78, cy + Math.sin(aa) * r * 0.78);
        ctx.lineTo(cx + Math.cos(aa) * r * 0.95, cy + Math.sin(aa) * r * 0.95);
      }
      const ha = -t * 2 + ph;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ha) * r * 0.7, cy + Math.sin(ha) * r * 0.7);
      ctx.stroke();
      glowH(ctx, cx, cy, 3, PHX.gold, 0.6);
    });
    // 繞著翼尖轉的數字環（傾斜的橢圓軌道上的羅馬數字）
    {
      const [x, y] = tipOf(prim[0]);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.4);
      ctx.strokeStyle = rgba('#fff0b0', 0.4);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffe7a0', 0.85);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const aa = t * 0.9 + (i / 4) * TAU;
        roman(ctx, Math.cos(aa) * 16, Math.sin(aa) * 16, 5, i * 3, 0);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  // 羅馬數字（用線畫；s＝字高）
  const ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  function roman(c, x, y, s, n, rot) {
    const str = ROMAN[n % 12];
    const wch = (ch) => (ch === 'I' ? 0.28 : 0.62) * s;
    let W = 0;
    for (const ch of str) W += wch(ch) + s * 0.12;
    W -= s * 0.12;
    const ca = Math.cos(rot);
    const sa = Math.sin(rot);
    const L = (u0, v0, u1, v1) => {
      c.moveTo(x + u0 * ca - v0 * sa, y + u0 * sa + v0 * ca);
      c.lineTo(x + u1 * ca - v1 * sa, y + u1 * sa + v1 * ca);
    };
    let u = -W / 2;
    const h = s / 2;
    for (const ch of str) {
      const w = wch(ch);
      if (ch === 'I') L(u + w / 2, -h, u + w / 2, h);
      else if (ch === 'V') {
        L(u, -h, u + w / 2, h);
        L(u + w / 2, h, u + w, -h);
      } else {
        L(u, -h, u + w, h);
        L(u + w, -h, u, h);
      }
      u += w + s * 0.12;
    }
  }
  // 身後淡淡的時之光環：一圈羅馬數字；亮起的弧＝剩下的時之沙（從 12 點順時針）
  function numeralHalo(ctx, x, y, r, t, a, sand, rw) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rw > 0 ? -t * 1.2 : Math.sin(t * 0.3) * 0.05);
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(PHX.gold, 0.35 * a);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.moveTo(r * 0.8, 0);
    ctx.arc(0, 0, r * 0.8, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba('#fff0b0', 0.85 * a);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r, -PI / 2, -PI / 2 + TAU * clamp(sand, 0, 1));
    ctx.stroke();
    ctx.strokeStyle = rgba(PHX.gold, 0.7 * a);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const aa = (i / 12) * TAU - PI / 2;
      roman(ctx, Math.cos(aa) * r * 0.9, Math.sin(aa) * r * 0.9, 4.2, i, aa + PI / 2);
    }
    ctx.stroke();
    ctx.restore();
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
    const hurt = m.hurtT > 0 && !dead;
    const sand = amt(fx.sand, 1);
    const rw = dead ? 0 : amt(fx.rewind, 0);
    const kind = eyeKind(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    // 拍翅：下撲時身體往上提、上撲時腕部收起（手部慢半拍）
    const phi = t * (wind ? 9 : rw ? 11 : strike ? 7 : 4.6);
    const beat = Math.sin(phi);
    const upS = Math.cos(phi);
    let lift = dead ? 0 : -Math.cos(phi - 0.7) * 3;
    let wAng = -1.82 + beat * 0.55;
    let open = 1 - Math.max(0, -upS) * 0.22;
    let bend = Math.max(0, -upS) * 0.55 - Math.max(0, upS) * 0.2;
    let lean = Math.sin(phi - 1.2) * 0.03;
    let headA = Math.cos(phi - 0.7) * 0.05;
    if (wind) {
      wAng = -1.55 + beat * 0.3;
      open = 1;
      bend = beat * 0.15;
      lean = -0.16;
      headA = -0.22;
    } else if (strike) {
      wAng = -2.4 + beat * 0.12;
      open = 0.75;
      bend = 0.35;
      lean = 0.3;
      headA = 0.22;
    } else if (rw) {
      wAng = -1.55 + beat * 0.25;
      open = 1;
      bend = beat * 0.12;
      headA = -0.3;
    }
    if (hurt) {
      wAng = -1.85;
      open = 0.85;
      bend = -0.2;
      lean -= 0.1;
      headA = -0.28;
    }
    if (dead) {
      wAng = -2.9;
      open = 0.55;
      bend = 0.3;
      lean = 0.35;
      headA = 0.6;
    }
    const shake = hurt ? Math.sin(t * 70) * 1.2 : 0;
    const heat = clamp(0.35 + (wind ? 0.5 : 0) + rw, 0, 1.3);
    ctx.save();
    ctx.translate(shake, 0);
    // 身後的火光、逆轉錶盤
    if (!dead) glowH(ctx, 0, -50 + lift, 70, PHX.orange, 0.26 + rw * 0.35 + (wind ? 0.2 : 0));
    if (!dead) numeralHalo(ctx, 4, -62 + lift, 44, t, 0.55 + rw * 0.45 + (wind ? 0.3 : 0), sand, rw);
    rewindHalo(ctx, -2, -52, 42, t, rw);
    ctx.translate(0, lift);
    ctx.translate(0, -46);
    ctx.rotate(lean);
    ctx.translate(0, 46);

    // ── 尾羽：三根帶沙漏眼紋的長飄羽＋四根短羽，一節節波動（越末端越慢），末端化成時之沙 ──
    const swS = dead ? 0 : 1;
    for (let k = 6; k >= 0; k--) {
      const long = k % 2 === 1;
      const L = long ? 92 - Math.abs(k - 3) * 6 : 50 + (k === 0 || k === 6 ? -6 : 0);
      const pts = [[-11, -36]];
      let hd = PI + 0.3 - k * 0.12 + (strike ? 0.15 : 0);
      for (let i = 0; i < 6; i++) {
        hd += -0.07 + Math.sin(t * (wind || rw ? 4 : 2.4) - i * 0.75 - k * 0.45) * (0.05 + i * 0.03) * swS + (dead ? -0.12 : 0);
        const p = pts[i];
        pts.push([p[0] + Math.cos(hd) * (L / 6), p[1] - Math.sin(hd) * (L / 6)]);
      }
      const fn = spline(pts);
      const W = long ? 11 : 7.5;
      // 長飄羽：羽軸兩側有一層薄薄的羽片（像鳳尾的緞帶），末端展開成眼紋
      const wf = long ? (s) => 3.2 * (1 - s) + 3.4 * Math.sin(Math.min(1, s * 1.3) * PI) * (1 - s) + W * Math.exp(-Math.pow((s - 0.8) / 0.12, 2)) * Math.min(1, (1 - s) * 7) : (s) => W * Math.sin(Math.min(1, s * 0.9 + 0.12) * PI) * (1 - s * 0.3) + 0.8;
      const path = (c) => taper(c, fn, wf, long ? 18 : 12);
      const p1 = pts[6];
      gradShape(ctx, path, -11, -36, p1[0], p1[1], [[0, long ? PHX.red : PHX.redS], [0.45, PHX.orange], [0.8, PHX.gold], [1, PHX.cream]], { lw: 1.7 });
      if (long) {
        // 羽軸＋錶盤眼紋（金框、奶油色錶面、兩根小指針；倒流時指針逆轉）
        ctx.strokeStyle = rgba('#ffe7a0', 0.8);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (let s = 0; s <= 0.72; s += 0.08) {
          const p = fn(s);
          s ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
        }
        ctx.stroke();
        const e = along(fn, 0.8, 0);
        glowH(ctx, e[0], e[1], 9, '#7ef0e0', 0.45 + rw * 0.3);
        A.shape(ctx, (c) => c.ellipse(e[0], e[1], 5.4, 4.4, e[2], 0, TAU), '#2fb8b0', '#1a7a80', { lw: 1.3, hl: false, shadeY: e[1] + 2 });
        A.ellipse(ctx, e[0], e[1], 3.3, 3.3, PHX.cream, '#f0d890', { lw: 1, hl: false, shadeAt: 0.3 });
        ctx.strokeStyle = A.c(PHX.deep);
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (let j = 0; j < 4; j++) {
          const a = (j / 4) * TAU;
          ctx.moveTo(e[0] + Math.sin(a) * 2.3, e[1] - Math.cos(a) * 2.3);
          ctx.lineTo(e[0] + Math.sin(a) * 3, e[1] - Math.cos(a) * 3);
        }
        const ha = (rw ? -t * 6 : t * 0.6) + k;
        ctx.moveTo(e[0], e[1]);
        ctx.lineTo(e[0] + Math.sin(ha * 12) * 2.6, e[1] - Math.cos(ha * 12) * 2.6);
        ctx.stroke();
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(e[0], e[1]);
        ctx.lineTo(e[0] + Math.sin(ha) * 1.8, e[1] - Math.cos(ha) * 1.8);
        ctx.stroke();
      }
      // 從羽尖流出的沙（倒流時往回流）
      // 從羽尖飄起的金沙：往上升（剩下的沙越少、飄得越稀）；浴火倒流時沙往羽尖流回去
      const e = along(fn, 1, 0);
      const nS = 1 + Math.round(sand * 3);
      for (let j = 0; j < nS; j++) {
        let q = (t * (rw ? 1.4 : 0.55) + j / nS + k * 0.13) % 1;
        if (rw) q = 1 - q;
        const px = e[0] + Math.cos(e[2]) * 3 - q * 6 + Math.sin(t * 2 + j + k) * 2.5;
        const py = e[1] - q * 26;
        ctx.fillStyle = rgba(j % 2 ? '#fff2b0' : PHX.gold, Math.sin(q * PI) * 0.95);
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }

    // ── 浴火：倒流時身後竄起大火 ──
    if (rw > 0) {
      glowH(ctx, 0, -24, 36, '#ff8a2a', 0.8 * rw);
      for (let i = 0; i < 6; i++) {
        const bx = -24 + i * 9 + Math.sin(t * 3 + i) * 2;
        const by = -22 - Math.sin((i / 5) * PI) * 8;
        flameTongue(ctx, bx, by, 3.2, 24 + Math.sin(t * 11 + i * 1.7) * 7 + Math.sin((i / 5) * PI) * 14, t, i * 1.9, '#ff6a2a', '#ffe68a', rw * 0.6);
      }
    }
    // ── 遠側翅膀 ──
    {
      // 遠側翅膀：往前上方張開（翼展比身體寬得多）
      ctx.save();
      ctx.translate(6, -57);
      ctx.scale(-1, 1);
      phxWing(ctx, 0, 0, wAng + 0.1, open, bend, true, t + 0.15, heat);
      ctx.restore();
    }

    // ── 爪：金色鱗腳收在身下，攻擊時往前伸 ──
    [[5, 1], [-2, 0]].forEach(([lx, far]) => {
      const reach = strike ? 9 : wind ? -2 : 0;
      const ax = lx + reach * 0.5;
      const kx = lx + 3 + reach;
      const ky = -24 + (dead ? 3 : 0) + Math.sin(phi + far) * 0.8;
      limb(ctx, (c) => {
        c.moveTo(lx, -32);
        c.quadraticCurveTo(ax + 2, -24, kx, ky);
      }, far ? 4.6 : 5.4, far ? PHX.goldS : PHX.gold);
      ctx.strokeStyle = rgba(PHX.goldS, 0.9);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        const q = i / 4;
        const px = lerp(lx, kx, q) + 1;
        const py = lerp(-32, ky, q);
        ctx.moveTo(px - 1.6, py);
        ctx.lineTo(px + 1.4, py + 0.4);
      }
      ctx.stroke();
      // 三前趾＋一後趾（黑曜色的鉤爪）
      const curl = strike ? 0.2 : 0.9;
      ctx.strokeStyle = A.outline();
      ctx.lineCap = 'round';
      [[0.1, 7], [0.6, 7.5], [1.1, 6.5], [PI - 0.3, 5]].forEach(([a, L]) => {
        const ex = kx + Math.cos(a) * L;
        const ey = ky + Math.sin(a) * L * 0.7 + 2;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(kx, ky);
        ctx.quadraticCurveTo(kx + Math.cos(a) * L * 0.7, ky + Math.sin(a) * L * 0.5 + 2, ex, ey);
        ctx.stroke();
        ctx.strokeStyle = A.c(far ? PHX.goldS : PHX.gold);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.strokeStyle = A.c('#2a1418');
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.quadraticCurveTo(ex + Math.cos(a) * 2.5, ey + 1, ex + Math.cos(a + curl) * 2.6, ey + 2.6);
        ctx.stroke();
        ctx.strokeStyle = A.outline();
      });
    });

    // ── 身體：挺起的胸 ──
    const body = (c) => {
      c.moveTo(9, -61);
      c.bezierCurveTo(18, -55, 16, -40, 7, -33);
      c.bezierCurveTo(1, -29, -8, -31, -12, -37);
      c.bezierCurveTo(-15, -44, -9, -55, 0, -59);
      c.bezierCurveTo(3, -61, 6, -62, 9, -61);
      c.closePath();
    };
    A.shape(ctx, body, PHX.red, PHX.redS, { cel: [3, 3], lw: 2.6, hl: false });
    clipDo(ctx, body, () => {
      // 胸前的金色羽絨
      const g = ctx.createRadialGradient(12, -44, 2, 12, -44, 20);
      g.addColorStop(0, rgba(PHX.cream, 0.95));
      g.addColorStop(0.55, rgba(PHX.gold, 0.85));
      g.addColorStop(1, rgba(PHX.orange, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-10, -66, 44, 44);
      // 一排排羽鱗（胸前小、背後大）
      ctx.lineWidth = 1;
      for (let r = 0; r < 6; r++) {
        ctx.strokeStyle = rgba(r < 3 ? PHX.goldS : PHX.redS, 0.6);
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const px = -12 + k * 7 + (r % 2) * 3.5;
          const py = -56 + r * 5.5;
          ctx.moveTo(px - 3.2, py);
          ctx.quadraticCurveTo(px, py + 3.8, px + 3.2, py);
        }
        ctx.stroke();
      }
    });
    volume(ctx, body, 2, -44, 22, 0.25, 0.35, PHX.deep);
    crescent(ctx, body, 1.8, 1.8, PHX.cream, 0.6);
    crescent(ctx, body, -1.6, -1.2, PHX.orange, 0.7);
    strokeOut(ctx, body, 2.6);

    // ── 脖子：S 形，頸圈是一圈金色尖羽 ──
    const neckF = cb(3, -56, 17, -63, 5, -78, 16, -91);
    const neckW = (q) => 10.5 - q * 5;
    const neck = (c) => taper(c, neckF, neckW, 14);
    A.shape(ctx, neck, PHX.red, PHX.redS, { cel: [2, 2], hl: false, noStroke: true });
    clipDo(ctx, neck, () => {
      // 頸前的金色羽絨
      ctx.strokeStyle = rgba(PHX.gold, 0.9);
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const p = along(neckF, i / 10, neckW(i / 10) * 0.42);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
    });
    crescent(ctx, neck, 1.4, 1.4, PHX.cream, 0.6);
    strokeOut(ctx, (c) => taper(c, neckF, neckW, 14, true), 2.4);
    // 頸後的金色蓑羽：細長、往後下方垂，隨拍翅慢半拍飄動
    for (let i = 0; i < 7; i++) {
      const s0 = 0.82 - i * 0.1;
      const p = along(neckF, s0, -neckW(s0) * 0.35);
      const a = PI * 0.72 - i * 0.05 + Math.sin(phi - 1.5 - i * 0.3) * 0.08;
      feather(ctx, p[0], p[1], 15 - i * 0.6, 4.6, a, i % 2 ? PHX.orange : PHX.red, PHX.gold, { lw: 1.2, curl: -0.25, colM: PHX.orange, mid: 0.4 });
    }

    // ── 頭 ──
    ctx.save();
    ctx.translate(16, -91);
    ctx.scale(0.8, 0.8);
    ctx.rotate(headA - lift * 0.015);
    // 冠羽：兩根像時針與分針的長冠羽（金色羽軸、菱形羽尖），後面襯著三根小火焰羽
    for (let i = 2; i >= 0; i--) {
      const fl = Math.sin(t * 5 - i * 0.7) * 1.8;
      const fn = qb(-4, -6 + i, -12 - i * 3, -10 + i * 2 + fl, -19 - i * 3 + fl, -6 + i * 5);
      gradShape(ctx, (c) => taper(c, fn, (q) => (6 - i) * (1 - q * 0.85), 10), -4, -6, -18, -4, [[0, PHX.red], [0.5, PHX.orange], [1, PHX.gold]], { lw: 1.4 });
    }
    [[1, 27, -0.85 + Math.sin(t * 1.3) * 0.08, 3.6], [0, 20, -1.2 + Math.sin(t * 1.3 - 0.6) * 0.1, 4.2]].forEach(([k, L, a0, w]) => {
      const aa = a0 + (rw ? Math.sin(t * 9 + k) * 0.25 : 0) - PI / 2 - 0.4;
      const bx = -2 + k * 2;
      const by = -8;
      const fn = qb(bx, by, bx + Math.cos(aa + 0.55) * L * 0.55, by + Math.sin(aa + 0.55) * L * 0.55, bx + Math.cos(aa) * L, by + Math.sin(aa) * L);
      const e = fn(1);
      gradShape(ctx, (c) => taper(c, fn, (q) => w * Math.sin(Math.min(1, q * 0.8 + 0.25) * PI) * (1 - q * 0.4) + 0.8, 12), bx, by, e[0], e[1], [[0, PHX.red], [0.55, PHX.orange], [1, PHX.gold]], { lw: 1.3 });
      glowH(ctx, e[0], e[1], 7, PHX.gold, 0.35 + heat * 0.3);
      const d = Math.atan2(e[1] - fn(0.9)[1], e[0] - fn(0.9)[0]);
      A.shape(ctx, (c) => {
        c.moveTo(e[0] + Math.cos(d) * 6, e[1] + Math.sin(d) * 6);
        c.lineTo(e[0] + Math.cos(d + 1.6) * 2.6, e[1] + Math.sin(d + 1.6) * 2.6);
        c.lineTo(e[0] - Math.cos(d) * 2, e[1] - Math.sin(d) * 2);
        c.lineTo(e[0] + Math.cos(d - 1.6) * 2.6, e[1] + Math.sin(d - 1.6) * 2.6);
        c.closePath();
      }, PHX.gold, PHX.goldS, { lw: 1.2, hl: false, shadeY: e[1] + 1 });
    });
    const head = (c) => c.ellipse(0.5, 0, 12, 9.8, -0.22, 0, TAU);
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
      ctx.quadraticCurveTo(2, -6.5, -13, -2);
      ctx.quadraticCurveTo(-2, 0, 4, 3);
      ctx.quadraticCurveTo(8, 2, 10, -3);
      ctx.fill();
      // 頭頂的細羽紋
      ctx.strokeStyle = rgba(PHX.redS, 0.7);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(-6 + i * 3.5, -9);
        ctx.quadraticCurveTo(-5 + i * 3.5, -7, -7 + i * 3.5, -5.5);
      }
      ctx.stroke();
    });
    crescent(ctx, head, 1.4, 1.4, PHX.cream, 0.7);
    strokeOut(ctx, head, 2.4);
    // 猛禽的金色眉骨（讓眼神更威嚴）
    A.shape(ctx, (c) => {
      c.moveTo(-2.5, -7);
      c.quadraticCurveTo(5, -11, 11.5, -6);
      c.quadraticCurveTo(6, -7.4, -0.5, -5.4);
      c.closePath();
    }, PHX.gold, PHX.goldS, { lw: 1.3, hl: false, shadeY: -5 });
    // 鉤喙（金色、有蠟膜）
    const beak = wind || rw || strike;
    if (beak) {
      A.shape(ctx, (c) => {
        c.moveTo(9, 2);
        c.quadraticCurveTo(15, 5, 17, 9);
        c.quadraticCurveTo(12, 8, 8.5, 5);
        c.closePath();
      }, PHX.goldS, null, { lw: 1.5 });
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.moveTo(10, 1);
      ctx.lineTo(16, 4.5);
      ctx.lineTo(10, 4);
      ctx.fill();
    }
    A.shape(ctx, (c) => {
      c.moveTo(8, -5);
      c.quadraticCurveTo(18, -6.5, 20.5, 2.5);
      c.quadraticCurveTo(20, 5, 18, 4.2);
      c.quadraticCurveTo(17, 1.5, 12, 2);
      c.quadraticCurveTo(9, 1.5, 8, -5);
      c.closePath();
    }, PHX.gold, PHX.goldS, { lw: 1.8, shadeY: 0.5, hl: [12, -3.4, 2.6, 1] });
    ctx.fillStyle = A.c(PHX.deep);
    ctx.beginPath();
    ctx.ellipse(12.5, -2.6, 1, 0.7, 0.2, 0, TAU);
    ctx.fill();
    // 額上的時之寶石（金座＋青綠寶石）
    glowH(ctx, -2, -8.5, 6, '#7ef0e0', 0.5 + heat * 0.2);
    A.shape(ctx, (c) => {
      c.moveTo(-2, -12);
      c.lineTo(0.8, -8.5);
      c.lineTo(-2, -5.5);
      c.lineTo(-4.8, -8.5);
      c.closePath();
    }, '#3ad8c8', '#1a8a90', { lw: 1.3, hl: [-2.8, -9.8, 0.9, 0.6], shadeY: -8.5 });
    // 眼
    if (kind === 'normal' || kind === 'angry') {
      gemEye(ctx, 4.5, -1.5, 3.4, '#fff1a0', '#ffb030', kind === 'normal' && (wind || rw) ? 'angry' : kind, { glowCol: '#ffcc50', glowA: 0.6, slit: true, lw: 1.4 });
    } else {
      A.eye(ctx, 4.5, -1.5, 3, 3, kind, 0);
    }
    ctx.restore();

    // ── 近側翅膀 ──
    phxWing(ctx, -5, -55, wAng, open, bend, false, t, heat);

    if (rw > 0) {
      for (let i = 0; i < 4; i++) flameTongue(ctx, -12 + i * 8, -26, 2.6, 12 + Math.sin(t * 13 + i) * 4, t, i * 2.3, '#ff8a3a', '#fff2a0', rw * 0.55);
      for (let i = 0; i < 12; i++) {
        const q = (t * 0.9 + hash(i)) % 1;
        const px = -30 + hash(i + 7) * 60;
        const py = 10 - q * 90;
        ctx.fillStyle = rgba('#ffe68a', (1 - Math.abs(q - 0.5) * 2) * rw);
        ctx.fillRect(px - 1, py - 1, 2.2, 2.2);
      }
    }
    if (!dead && !rw) {
      // 平常從翅膀飄散的火星
      for (let i = 0; i < 6; i++) {
        const q = (t * 0.7 + i / 6) % 1;
        const px = -30 + hash(i + 3) * 50 + Math.sin(t * 2 + i) * 3;
        const py = -50 - q * 44;
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
    // 整隻放大一點，填滿牠的判定框（原點在腳底，地面不動）
    ctx.save();
    ctx.scale(1.05, 1.05);
    ctx.translate(-7, 0);
    if (!copy) {
      qilinBody(ctx, m, false);
      ctx.restore();
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
    ctx.restore();
  }
  // 腿長：[上段, 前臂／脛, 管骨, 繫部]；寬度節點（段位 0..4）：鹿腿纖細、腕與球節有骨感的突起、後腿大腿有肌肉量
  const QL_LF = [14, 15.5, 12, 5.5];
  const QL_LH = [15.5, 17, 15, 5.5];
  const QL_WF = [[0, 17], [0.75, 12.5], [1, 10.5], [1.3, 9.4], [1.88, 5.2], [2, 6.4], [2.14, 4.6], [2.86, 3.9], [3, 5.6], [3.3, 4.3], [4, 4.6]];
  const QL_WH = [[0, 24], [0.6, 18], [1, 12.5], [1.25, 10], [1.85, 5.4], [2, 6.9], [2.16, 4.8], [2.86, 3.9], [3, 5.6], [3.3, 4.3], [4, 4.6]];
  // 麒麟：緊實的鹿／馬身、從肩膀昂起的粗壯弓形頸、龍首（大顱、短吻、大眼）、鏡晶龍角、金鬚、稜鏡鬃、獅尾金焰
  function qilinBody(ctx, m, copy) {
    const t = num(m.t, 0);
    const ph = phase(m);
    const dead = !!m.dead;
    const hurt = m.hurtT > 0 && !dead;
    const kind = eyeKind(m);
    const walk = walking(m) && !ph && !dead;
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    // 四拍的漫步：近後 → 近前 → 遠後 → 遠前
    const g = t * 1.45;
    const G2 = g * TAU * 2;
    let bx = 0;
    let by = 0;
    let pitch = 0;
    let headDrop = 0;
    let nod = 0;
    if (walk) {
      by = -Math.cos(G2) * 1.1 - 0.4;
      pitch = Math.sin(g * TAU) * 0.016;
      nod = Math.sin(G2 - 0.9) * 0.06;
    } else {
      // 呼吸、左右看、重心慢慢移動
      by = Math.sin(t * 2) * 0.6;
      pitch = Math.sin(t * 0.7) * 0.008;
      nod = Math.sin(t * 0.9) * 0.04 + Math.max(0, Math.sin(t * 0.37)) * -0.05;
    }
    if (wind) {
      bx = -4;
      pitch = -0.09;
      headDrop = -0.12;
      nod = Math.sin(t * 9) * 0.03;
    } else if (strike) {
      bx = 9;
      pitch = 0.07;
      headDrop = 0.6;
      nod = 0;
    }
    if (hurt) {
      bx -= 2;
      pitch -= 0.04;
      headDrop -= 0.15;
    }
    if (dead) {
      bx = 0;
      by = 15;
      pitch = 0.06;
      headDrop = 0.9;
      nod = 0;
    }
    const shake = hurt ? Math.sin(t * 60) * 1.2 : 0;
    const glowA = wind ? 0.9 : strike ? 0.6 : 0.3 + Math.sin(t * 3) * 0.08;
    by += 4.5;
    // 身體的變換（以後腿髖部為軸抬起／壓低前半身）
    const PX = -24;
    const PY = -56;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const xf = (x, y) => [PX + (x - PX) * cp - (y - PY) * sp + bx + shake, PY + (x - PX) * sp + (y - PY) * cp + by];
    const bodyXf = () => {
      ctx.translate(bx + shake, by);
      ctx.translate(PX, PY);
      ctx.rotate(pitch);
      ctx.translate(-PX, -PY);
    };
    // ── 腳 ──
    const C_NEAR = { base: QL.body, shade: QL.bodyS, low: '#bfe6de', rim: '#ffffff', hoof: QL.hoof, hoofS: '#2a1a12', band: QL.gold, line: QL.deep };
    const C_FAR = { base: QL.bodyS, shade: QL.deep, low: '#6fa8aa', rim: '#dff5ea', hoof: '#3a2418', hoofS: '#1a0e08', band: QL.goldS, line: QL.deep };
    const wisp = (x, y, L, seed, alpha, trail) => {
      const fl = Math.sin(t * 9 + seed) * 3;
      const fn = qb(x, y, x - L * 0.45, y - L * 0.1 + fl, x - L * trail, y - L * 0.7 - fl);
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = rgba(QL.flameS, 0.75);
      ctx.beginPath();
      taper(ctx, fn, (q) => 4.2 * (1 - q) + 0.4, 8);
      ctx.fill();
      ctx.fillStyle = rgba(QL.flame, 0.9);
      ctx.beginPath();
      taper(ctx, fn, (q) => 2.2 * (1 - q) + 0.2, 6);
      ctx.fill();
      ctx.restore();
    };
    const leg = (lx, ly, off, front, far) => {
      const Ls = far ? (front ? QL_LF : QL_LH).map((v) => v * 0.96) : front ? QL_LF : QL_LH;
      const root = xf(lx, ly);
      const x0 = lx + (front ? -1 : 3);
      const gy = far ? -1.5 : 0;
      const uaR = front ? -0.28 : 0.55;
      let o;
      if (dead) {
        o = front ? { ua: 0.2, fa: 1.45, ca: -1.5, pa: -0.9 } : { ua: 1.15, fa: -1.35, ca: 1.25, pa: 1.6 };
      } else if (walk) {
        const f = gaitFoot(g + off, 0.62, 8, front ? 8 : 6, x0, front);
        o = { ua: uaR + f.sw * (front ? 0.16 : 0.12), gx: f.gx, gy: gy + f.gy, pa: f.pa };
      } else if (wind) {
        if (front && !far) {
          // 蹬地（前蹄刨地）
          const f = gaitFoot(t * 2.4, 0.4, 5, 10, x0 + 3, true);
          o = { ua: uaR + 0.25, gx: f.gx, gy: gy + f.gy, pa: f.pa };
        } else o = { ua: uaR + (front ? 0.1 : 0.2), gx: x0 + (front ? 5 : 6), gy, pa: front ? 0.55 : 0.62 };
      } else if (strike) {
        o = front ? { ua: uaR + 0.45, gx: x0 + (far ? 10 : 15), gy, pa: 0.38 } : { ua: uaR - 0.3, gx: x0 - (far ? 6 : 10), gy, pa: 0.05 };
      } else {
        // 優雅的站姿：近側前腳輕輕踮著蹄尖
        const st = front ? (far ? -2 : 1) : far ? 2 : -1;
        o = front && !far && !hurt ? { ua: uaR + 0.12, gx: x0 + 4, gy: gy - 1, pa: 0.12 } : { ua: uaR, gx: x0 + st, gy, pa: 0.52 };
      }
      const J = legPose(root, Ls, 6.5, front, o);
      const P = J.P;
      hoofLeg(ctx, J, front ? QL_WF : QL_WH, 6.5, far ? C_FAR : C_NEAR, { far, lw: far ? 2 : 2.3 });
      // 球節後面往後飄的金焰（走動時拖得更長）
      const f = P[3];
      wisp(f[0] - 2, f[1], walk ? 14 : 11, off * 7 + (front ? 1 : 2), far ? 0.5 : 0.9, walk ? 1.1 : 0.7);
      // 腕／跗關節上的金色鱗環
      const k = P[2];
      ctx.fillStyle = A.c(far ? QL.goldS : QL.gold);
      ctx.beginPath();
      ctx.ellipse(k[0], k[1], 2.2, 1.6, 0, 0, TAU);
      ctx.fill();
    };
    // 遠側的腳（相位：遠後 0.5、遠前 0.75）
    leg(-21, -60, 0.5, false, true);
    leg(16, -59, 0.75, true, true);
    ctx.save();
    bodyXf();
    // ── 獅尾：從臀部往上揚成 S 形，一節節甩動（越尾端越慢半拍），尾端一大團金焰毛＋水晶 ──
    const tpts = [[-33, -66]];
    let hd = PI - 0.25;
    for (let i = 0; i < 5; i++) {
      hd += (i < 2 ? -0.28 : 0.42) + Math.sin(t * (walk ? 4 : 2.4) - i * 0.75) * (0.08 + i * 0.05) + (dead ? 0.3 : 0);
      const p = tpts[i];
      tpts.push([p[0] + Math.cos(hd) * 6, p[1] + Math.sin(hd) * 6]);
    }
    const tail = spline(tpts);
    const tailPath = (c) => taper(c, tail, (q) => 6.5 - q * 3.5, 16);
    A.shape(ctx, tailPath, QL.body, QL.bodyS, { cel: [1, 1], lw: 2 });
    crescent(ctx, tailPath, 1, 1, '#ffffff', 0.6);
    const te = along(tail, 1, 0);
    // 尾端的金焰毛（幾綹往上竄、慢半拍）
    for (let i = 0; i < 5; i++) {
      const a = te[2] - 0.55 + i * 0.28;
      const fl = Math.sin(t * 7 - i * 0.8) * 2.2;
      const L = 15 + (i % 2) * 5 - Math.abs(i - 2) * 1.5;
      const fn = cb(te[0], te[1], te[0] + Math.cos(a) * L * 0.35, te[1] + Math.sin(a) * L * 0.35, te[0] + Math.cos(a - 0.5) * L * 0.7 + fl, te[1] + Math.sin(a - 0.5) * L * 0.7, te[0] + Math.cos(a - 0.9) * L - fl * 0.5, te[1] + Math.sin(a - 0.9) * L - 2);
      gradShape(ctx, (c) => taper(c, fn, (q) => 5.2 * Math.sin(Math.min(1, q * 0.8 + 0.2) * PI) + 0.4, 10), te[0], te[1], te[0] + Math.cos(a) * L, te[1] + Math.sin(a) * L, [[0, QL.gold], [0.6, QL.flame], [1, QL.flameS]], { lw: 1.3 });
    }
    crystalShard(ctx, te[0], te[1] - 1, 12, 6.5, te[2] - 0.3, Math.floor(t * 4));
    // ── 身體：緊實的鹿身，胸深、腰收、臀圓 ──
    const body = (c) => {
      c.moveTo(20, -74);
      c.bezierCurveTo(31, -72, 37, -60, 32, -48);
      c.bezierCurveTo(28, -40, 18, -38, 8, -39);
      c.bezierCurveTo(-4, -40, -12, -42, -20, -41);
      c.bezierCurveTo(-30, -40, -37, -46, -37, -56);
      c.bezierCurveTo(-37, -66, -30, -73, -20, -72);
      c.bezierCurveTo(-8, -71, 8, -76, 20, -74);
      c.closePath();
    };
    A.shape(ctx, body, QL.body, QL.bodyS, { cel: [3, 4], lw: 2.8, hl: false });
    clipDo(ctx, body, () => {
      scaleTex(ctx, -40, -78, 76, 40, 6, QL.scale, 0.42, 1);
      // 珍珠色的腹甲（一節節）
      ctx.fillStyle = A.c(QL.belly);
      ctx.beginPath();
      ctx.moveTo(36, -58);
      ctx.bezierCurveTo(30, -44, 12, -41, -4, -42);
      ctx.bezierCurveTo(-16, -43, -22, -40, -30, -42);
      ctx.lineTo(-30, -30);
      ctx.lineTo(40, -30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = A.c(QL.bellyS);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const x = -20 + i * 8.5;
        ctx.moveTo(x, -45);
        ctx.quadraticCurveTo(x + 3, -41, x + 1, -36);
      }
      ctx.stroke();
      // 金色祥雲紋（肩與臀）
      ctx.strokeStyle = rgba(QL.goldS, 0.85);
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      // 祥雲：兩個往內捲的漩渦，接一道雲尾
      const swirl = (x, y, r, dir) => {
        for (let j = 0; j <= 14; j++) {
          const a = dir * j * 0.55 + PI / 2;
          const rr = r * (1 - j / 18);
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr;
          j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
      };
      [[16, -60, 1], [-27, -59, -1]].forEach(([x, y, s]) => {
        ctx.beginPath();
        swirl(x, y, 3.6, s);
        swirl(x + 7 * s, y + 0.5, 2.6, -s);
        ctx.moveTo(x - 1 * s, y + 3.6);
        ctx.quadraticCurveTo(x + 3 * s, y + 5, x + 7 * s, y + 3.1);
        ctx.moveTo(x - 1 * s, y + 3.6);
        ctx.quadraticCurveTo(x - 7 * s, y + 4, x - 11 * s, y + 1);
        ctx.stroke();
      });
      // 背脊的深色帶＋鱗面的斜光
      const gg = ctx.createLinearGradient(0, -76, 0, -60);
      gg.addColorStop(0, rgba(QL.deep, 0.35));
      gg.addColorStop(1, rgba(QL.deep, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(-40, -78, 80, 18);
    });
    volume(ctx, body, -4, -58, 30, 0.35, 0.3, QL.deep);
    crescent(ctx, body, 2, 2, '#ffffff', 0.7);
    crescent(ctx, body, -1.8, -1.5, '#9ae8ff', 0.6);
    strokeOut(ctx, body, 2.8);
    // 背上的金色脊鰭（跟著步伐一片片輕輕起伏）
    for (let i = 0; i < 5; i++) {
      const x = -26 + i * 8.5;
      const y = -72 + Math.sin(((i + 0.5) / 5) * PI) * -1 + (i === 0 ? 1.5 : 0);
      const fl = Math.sin(t * (walk ? 6 : 2.4) - i * 0.8) * 1.2;
      A.shape(ctx, (c) => {
        c.moveTo(x - 4, y + 2);
        c.quadraticCurveTo(x - 3, y - 5, x - 7 + fl, y - 8);
        c.quadraticCurveTo(x + 2, y - 5, x + 4, y + 2);
        c.closePath();
      }, QL.gold, QL.goldS, { lw: 1.5, shadeY: y - 1, hl: false });
    }
    ctx.restore();
    // 近側的腳（近後 0、近前 0.25）
    leg(-25, -59, 0, false, false);
    leg(20, -58, 0.25, true, false);

    // ── 弓形的粗頸：從肩膀昂起，頸背一排稜鏡水晶鬃 ──
    ctx.save();
    bodyXf();
    // 頸根在胸前（肩的前方），往前上方斜著昂起，頭在身體前方、不壓在背上
    ctx.translate(26, -61);
    ctx.rotate(headDrop * 0.45 + nod);
    const neckF = cb(0, 6, 3, -8, 11, -18, 22, -25);
    const neckW = (q) => 25 - q * 10;
    for (let i = 6; i >= 2; i--) {
      const s0 = 0.04 + i * 0.14;
      const p = along(neckF, s0, -neckW(s0) * 0.42);
      const fl = Math.sin(t * (walk ? 5 : 3) - i * 0.5) * (0.08 + i * 0.012) - nod * 0.8;
      crystalShard(ctx, p[0], p[1], 17 - i * 0.6, 8, -2.25 + i * 0.07 + fl, Math.floor(t * 4) + i);
    }
    const neck = (c) => taper(c, neckF, neckW, 14);
    A.shape(ctx, neck, QL.body, QL.bodyS, { cel: [2, 2], hl: false, noStroke: true });
    clipDo(ctx, neck, () => {
      scaleTex(ctx, -14, -38, 40, 50, 5.5, QL.scale, 0.42, 1);
      // 喉下的珍珠腹鱗（一節節橫紋）
      const pb = (c) => taper(c, (s) => along(neckF, s, neckW(s) * 0.3), (s) => neckW(s) * 0.42, 10);
      ctx.beginPath();
      pb(ctx);
      ctx.fillStyle = A.c(QL.belly);
      ctx.fill();
      ctx.strokeStyle = A.c(QL.bellyS);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 7; i++) {
        const s = i / 7;
        const a = along(neckF, s, neckW(s) * 0.5);
        const b = along(neckF, s, neckW(s) * 0.1);
        ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo((a[0] + b[0]) / 2 + 1.5, (a[1] + b[1]) / 2 + 1.5, b[0], b[1]);
      }
      ctx.stroke();
    });
    crescent(ctx, neck, 1.5, 1.5, '#ffffff', 0.6);
    crescent(ctx, neck, -1.5, -1, QL.deep, 0.5);
    strokeOut(ctx, (c) => taper(c, neckF, neckW, 14, true), 2.6);
    // ── 龍首 ──
    ctx.save();
    ctx.translate(21, -25);
    ctx.rotate(headDrop * 0.5 - 0.05);
    const open = strike || wind ? 1 : hurt ? 0.4 : 0;
    const wh = Math.sin(t * 2.4) * 3;
    // 腦後往後捲的金焰鬃（慢半拍）
    for (let i = 3; i >= 0; i--) {
      const fl = Math.sin(t * 5 - i * 0.7) * 2;
      const fn = cb(-6, -10 + i * 3.5, -15, -13 + i * 4 + fl, -21, -4 + i * 5, -27 - i * 2 + fl, -9 + i * 6);
      gradShape(ctx, (c) => taper(c, fn, (q) => (7.5 - i * 0.8) * (1 - q * 0.9), 12), -6, 0, -27, 0, [[0, QL.gold], [0.6, QL.flame], [1, QL.flameS]], { lw: 1.5 });
    }
    // 遠側的角、遠側長鬚
    mirrorAntler(ctx, -3, -15, 0.95, -0.75, t, true, glowA * 0.6);
    ctx.strokeStyle = A.c(QL.goldS);
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(25, -2);
    ctx.bezierCurveTo(32, -7, 29, -17, 18 + wh, -19);
    ctx.stroke();
    // 下顎（張嘴時往下開）＋金色的鬍鬚
    ctx.save();
    ctx.translate(4, 3);
    ctx.rotate(open * 0.32);
    for (let i = 0; i < 3; i++) {
      const fl = Math.sin(t * 4 - i * 0.9) * 1.8;
      const fn = qb(6 + i * 4, 5, 3 + i * 3 + fl, 11 + i, -2 + i * 2 + fl * 1.5, 15 - i);
      gradShape(ctx, (c) => taper(c, fn, (q) => 4 * (1 - q) + 0.5, 8), 6, 5, 0, 15, [[0, QL.gold], [1, QL.flameS]], { lw: 1.2 });
    }
    const jaw = (c) => {
      c.moveTo(-8, -1);
      c.bezierCurveTo(4, 1, 14, 1, 20, 1);
      c.quadraticCurveTo(21, 5, 15, 6);
      c.bezierCurveTo(6, 7, -4, 6, -8, -1);
      c.closePath();
    };
    A.shape(ctx, jaw, QL.belly, QL.bellyS, { lw: 2.2, shadeY: 3, hl: false });
    if (open > 0.5) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(16.5, 0.8);
      ctx.lineTo(15, -3);
      ctx.lineTo(13.5, 0.8);
      ctx.fill();
    }
    ctx.restore();
    if (open > 0.3) {
      A.shape(ctx, (c) => {
        c.moveTo(25, 1);
        c.quadraticCurveTo(16, 4 + open * 8, -2, 4);
        c.lineTo(-2, 2);
        c.closePath();
      }, QL.mouth, null, { lw: 1.2 });
      ctx.fillStyle = rgba('#ff8a9a', 0.8);
      ctx.beginPath();
      ctx.ellipse(12, 4 + open * 3, 5, 1.6, 0.1, 0, TAU);
      ctx.fill();
    }
    // 頭：大顱頂、短吻（Q 版的比例）
    const head = (c) => {
      c.moveTo(-10, -2);
      c.bezierCurveTo(-12, -15, -2, -21, 8, -18);
      c.bezierCurveTo(13, -17, 17, -12, 22, -11);
      c.quadraticCurveTo(29.5, -10, 30, -4.5);
      c.quadraticCurveTo(30, 1, 25, 1.5);
      c.bezierCurveTo(18, 2.5, 10, 3, 4, 5);
      c.bezierCurveTo(-2, 8, -9, 6, -10, -2);
      c.closePath();
    };
    A.shape(ctx, head, QL.body, QL.bodyS, { cel: [1.5, 2], lw: 2.5, hl: false });
    clipDo(ctx, head, () => {
      scaleTex(ctx, -12, -22, 22, 20, 4.5, QL.scale, 0.42, 1);
      // 臉頰的珍珠白、鼻樑一節節金鱗
      ctx.fillStyle = A.c(QL.belly);
      ctx.beginPath();
      ctx.ellipse(8, 3, 12, 5, 0.05, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.c(QL.goldS);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(15 + i * 3.6, -12 + i * 0.4);
        ctx.quadraticCurveTo(16.6 + i * 3.6, -10, 15 + i * 3.6, -8);
      }
      ctx.stroke();
    });
    crescent(ctx, head, 1.4, 1.4, '#ffffff', 0.75);
    strokeOut(ctx, head, 2.5);
    // 鼻頭與鼻孔
    A.shape(ctx, (c) => c.ellipse(27, -5, 3.8, 3.2, 0, 0, TAU), QL.body, QL.bodyS, { lw: 1.6, shadeY: -4, hl: false });
    ctx.fillStyle = A.c('#3a2a2a');
    ctx.beginPath();
    ctx.ellipse(28.2, -4.5, 1.4, 1, 0.4, 0, TAU);
    ctx.fill();
    // 上唇的獠牙
    ctx.fillStyle = A.c('#ffffff');
    ctx.beginPath();
    ctx.moveTo(19, 2.5);
    ctx.lineTo(20.5, 7);
    ctx.lineTo(22, 2.2);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1;
    ctx.stroke();
    // 金色火焰形眉骨
    A.shape(ctx, (c) => {
      c.moveTo(2, -12);
      c.quadraticCurveTo(9, -19, 17, -13);
      c.quadraticCurveTo(8, -15.5, -1, -20 + Math.sin(t * 6) * 0.8);
      c.quadraticCurveTo(-2, -15, 2, -12);
      c.closePath();
    }, QL.gold, QL.goldS, { lw: 1.4, shadeY: -14, hl: false });
    // 眼：Q 版的大眼
    if (kind === 'normal' || kind === 'angry') gemEye(ctx, 8.5, -7, 4.2, '#8af0ff', '#2ea8d8', wind || strike ? 'angry' : kind, { glowCol: '#8af0ff', glowA: 0.6, slit: true, lw: 1.4 });
    else A.eye(ctx, 8.5, -7, 3.4, 3.4, kind, 0);
    // 臉頰的金色鰭
    for (let i = 0; i < 3; i++) {
      A.shape(ctx, (c) => {
        c.moveTo(-3, 0 + i * 1.5);
        c.quadraticCurveTo(-11, 1 + i * 4, -16 - i * 1.5, 3 + i * 5);
        c.quadraticCurveTo(-9, 1 + i * 3, -2, 3 + i * 1.5);
        c.closePath();
      }, QL.gold, QL.goldS, { lw: 1.2, hl: false, shadeY: 6 });
    }
    // 近側長鬚（從上唇往後下方飄，末端慢半拍）
    const w2 = Math.sin(t * 2.4 - 0.8) * 4;
    const wpath = () => {
      ctx.beginPath();
      ctx.moveTo(25, -1);
      ctx.bezierCurveTo(36, 1, 33, 13, 21 + wh, 15);
      ctx.bezierCurveTo(11 + wh, 17, 5 + w2, 23, 9 + w2 * 1.3, 28);
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
    mirrorAntler(ctx, 1, -17, 1.05, -0.45, t, false, glowA);
    ctx.restore();
    ctx.restore();
    void copy;
  }
  // ── 時停蝶（id stopmoth）：莊周夢蝶的神話巨蝶。前翅是夜空色的星盤錶面（金色細框、刻度環、旋轉的星盤指針），
  //    後翅拖著兩條長燕尾、尾端掛著新月；身體是象牙白與金，觸角捲成星星。fx.tick＝放時停領域：星盤發光、指針停住 ──
  const BF = { night: '#1c1a5c', night2: '#3a2a8e', violet: '#7a58d8', teal: '#3ac8d8', gold: '#ffd466', goldS: '#d09a30', ivory: '#fff6e4', ivoryS: '#d8c8e8', moon: '#fff2c0', eye: '#8af0ff' };
  // 前翅：尖而微鉤的翅尖（鐮刀形）；後翅：圓弧，燕尾另外畫（會飄）
  function bfForePath(c) {
    c.moveTo(2, -53);
    c.bezierCurveTo(9, -68, 25, -88, 45, -94);
    c.quadraticCurveTo(54, -96, 56, -90);
    c.bezierCurveTo(54, -80, 51, -69, 45, -61);
    c.bezierCurveTo(35, -52, 19, -48, 3, -46);
    c.closePath();
  }
  function bfHindPath(c) {
    c.moveTo(3, -47);
    c.bezierCurveTo(20, -51, 41, -46, 41, -33);
    c.bezierCurveTo(41, -26, 36, -21, 31, -18);
    c.quadraticCurveTo(28, -15, 25, -16);
    c.bezierCurveTo(17, -16, 9, -22, 5, -31);
    c.quadraticCurveTo(2.5, -38, 3, -47);
    c.closePath();
  }
  // 星盤（astrolabe）：細金線刻度環、旋轉的星網與兩根指針
  function astrolabe(ctx, x, y, r, t, rot, hr, mn, glowA) {
    if (glowA > 0) glowH(ctx, x, y, r * 2.2, BF.gold, glowA);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = rgba(BF.night, 0.55);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = A.c(BF.gold);
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.74, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const big = i % 2 === 0;
      ctx.moveTo(Math.cos(a) * r * (big ? 0.78 : 0.86), Math.sin(a) * r * (big ? 0.78 : 0.86));
      ctx.lineTo(Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97);
    }
    ctx.stroke();
    // 星網（rete）：偏心圓＋尖尖的星指
    ctx.save();
    ctx.rotate(rot);
    ctx.strokeStyle = rgba(BF.teal, 0.9);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(r * 0.16, 0, r * 0.48, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = A.c(BF.gold);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66);
      ctx.lineTo(Math.cos(a + 0.16) * r * 0.42, Math.sin(a + 0.16) * r * 0.42);
      ctx.lineTo(Math.cos(a - 0.16) * r * 0.42, Math.sin(a - 0.16) * r * 0.42);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = A.c(BF.ivory);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(hr) * r * 0.5, -Math.cos(hr) * r * 0.5);
    ctx.stroke();
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(mn) * r * 0.8, -Math.cos(mn) * r * 0.8);
    ctx.stroke();
    ctx.fillStyle = A.c(BF.gold);
    ctx.beginPath();
    ctx.arc(0, 0, 1.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 翅緣：金色細框＋一排白點（像鳳蝶的翅緣斑）
  function bfMargin(ctx, path, pts, far, a) {
    clipDo(ctx, path, () => {
      ctx.strokeStyle = rgba(BF.gold, far ? 0.55 : 0.95);
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      path(ctx);
      ctx.stroke();
      ctx.strokeStyle = rgba(BF.night, 0.9);
      ctx.lineWidth = 2;
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = 9;
      ctx.strokeStyle = rgba(BF.night, 0.55);
      ctx.stroke();
      ctx.restore();
    });
    ctx.fillStyle = rgba('#ffffff', (far ? 0.5 : 0.9) * a);
    pts.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    });
  }
  const BF_FDOTS = [[52, -88, 1.3], [52, -81, 1.2], [50, -74, 1.1], [47, -67, 1], [42, -61, 0.9], [44, -93, 1.1], [36, -90, 0.9]];
  const BF_HDOTS = [[38, -38, 1.2], [38, -31, 1.1], [35, -25, 1], [30, -21, 0.9], [33, -46, 0.9]];
  // 一側的翅膀（右側；左側用鏡像）。k0/k1＝前翅／後翅的拍動（水平縮放）
  function bfWing(ctx, t, tick, far, hr, mn, rot, foreK, hindK, tailSw) {
    const fore = bfForePath;
    const hind = bfHindPath;
    // ── 後翅＋燕尾 ──
    ctx.save();
    ctx.scale(hindK, 1);
    // 燕尾：細長緞帶往下飄（越末端越慢半拍），尾端掛著新月
    const tp = [[28, -19]];
    let hd = 0.75;
    for (let i = 0; i < 4; i++) {
      hd += -0.16 + Math.sin(t * 3.2 - i * 0.8) * (0.06 + i * 0.04) + tailSw * 0.08;
      const p = tp[i];
      tp.push([p[0] + Math.cos(hd) * 4.6, p[1] + Math.sin(hd) * 4.6]);
    }
    const tail = spline(tp);
    const tailP = (c) => taper(c, tail, (s) => 6 * (1 - s) * (1 - s * 0.2) + 1.2, 14);
    gradShape(ctx, tailP, 27, -19, tp[4][0], tp[4][1], [[0, far ? BF.night : BF.night2], [0.6, far ? BF.night2 : BF.violet], [1, BF.gold]], { lw: 1.6 });
    const te = tp[4];
    if (!far) glowH(ctx, te[0], te[1] + 2, 8, BF.moon, 0.5 + tick * 0.4);
    A.shape(ctx, (c) => {
      c.arc(te[0], te[1] + 2, 2.8, -0.6, PI + 0.6, false);
      c.arc(te[0] + 0.7, te[1] + 1.2, 2.2, PI + 0.3, -0.3, true);
      c.closePath();
    }, BF.moon, BF.gold, { lw: 1.1, hl: false, shadeY: te[1] + 3.5 });
    const hg = ctx.createRadialGradient(4, -44, 2, 8, -38, 36);
    hg.addColorStop(0, A.c(far ? BF.night : '#2a1f6e'));
    hg.addColorStop(0.5, A.c(far ? BF.night2 : '#5a4ad8'));
    hg.addColorStop(0.85, A.c(far ? BF.night2 : '#8a9cf8'));
    hg.addColorStop(1, A.c(far ? BF.night : '#b8c8ff'));
    ctx.beginPath();
    hind(ctx);
    ctx.fillStyle = hg;
    ctx.fill();
    clipDo(ctx, hind, () => {
      // 月相眼紋（青色光環＋新月）
      glowH(ctx, 25, -32, 10, BF.teal, far ? 0.25 : 0.5);
      ctx.fillStyle = rgba(BF.teal, far ? 0.5 : 0.9);
      ctx.beginPath();
      ctx.arc(25, -32, 5.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c(BF.night);
      ctx.beginPath();
      ctx.arc(25, -32, 4.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c(BF.moon);
      ctx.beginPath();
      ctx.arc(25, -32, 3.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c(BF.night);
      ctx.beginPath();
      ctx.arc(26.6, -33, 2.8, 0, TAU);
      ctx.fill();
      // 金色翅脈
      ctx.strokeStyle = rgba(BF.gold, far ? 0.35 : 0.65);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      [[40, -40], [40, -30], [33, -21], [24, -17], [14, -20]].forEach(([x, y]) => {
        ctx.moveTo(4, -42);
        ctx.quadraticCurveTo((x + 4) / 2 + 2, (y - 42) / 2 - 3, x, y);
      });
      ctx.stroke();
    });
    bfMargin(ctx, hind, BF_HDOTS, far, 1);
    if (!far) crescent(ctx, hind, 1.2, 1.2, '#b8a8ff', 0.45);
    strokeOut(ctx, hind, 1.9);
    ctx.restore();
    // ── 前翅 ──
    ctx.save();
    ctx.scale(foreK, 1);
    const fg = ctx.createRadialGradient(4, -50, 2, 12, -62, 50);
    fg.addColorStop(0, A.c(far ? BF.night : '#2a1f6e'));
    fg.addColorStop(0.3, A.c(far ? BF.night2 : '#5b47d6'));
    fg.addColorStop(0.62, A.c(far ? '#4a4ab8' : '#6a8cf0'));
    fg.addColorStop(0.85, A.c(far ? BF.night2 : '#9ab8ff'));
    fg.addColorStop(1, A.c(far ? BF.night : '#c8d8ff'));
    ctx.beginPath();
    fore(ctx);
    ctx.fillStyle = fg;
    ctx.fill();
    clipDo(ctx, fore, () => {
      // 翅上的星點與星雲霧
      for (let i = 0; i < 12; i++) {
        const px = 10 + hash(i + (far ? 40 : 10)) * 42;
        const py = -90 + hash(i + 60) * 40;
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
        ctx.fillStyle = rgba('#ffffff', 0.35 + tw * 0.55);
        const s = hash(i + 90) < 0.25 ? 1.5 : 0.9;
        ctx.fillRect(px, py, s, s);
      }
      glowH(ctx, 18, -62, 16, BF.teal, far ? 0.12 : 0.28);
      glowH(ctx, 40, -84, 12, '#ff9ae0', far ? 0.08 : 0.2);
      // 金色翅脈（從翅根放射）
      ctx.strokeStyle = rgba(BF.gold, far ? 0.4 : 0.7);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      [[46, -94], [55, -86], [52, -74], [46, -63], [34, -53]].forEach(([x, y]) => {
        ctx.moveTo(4, -50);
        ctx.quadraticCurveTo((x + 4) / 2 - 3, (y - 50) / 2 - 6, x, y);
      });
      ctx.stroke();
    });
    bfMargin(ctx, fore, BF_FDOTS, far, 1);
    if (!far) crescent(ctx, fore, 1.3, 1.3, '#c8b8ff', 0.5);
    strokeOut(ctx, fore, 2);
    // 星盤
    astrolabe(ctx, 30, -71, 9.5, t, rot, hr, mn, (far ? 0.2 : 0.4) * (0.4 + tick));
    ctx.restore();
  }
  function stopmoth(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const ph = phase(m);
    const dead = !!m.dead;
    const hurt = m.hurtT > 0 && !dead;
    const tick = amt(fx.tick, 0);
    const kind = eyeKind(m);
    const wind = ph === 'wind' || tick > 0;
    const strike = ph === 'strike';
    // 振翅：前翅先動、後翅慢半拍；下撲時身體往上提。時停施法中翅膀張到最開、慢慢停住
    const w = t * (strike ? 9 : 5.5);
    const fl = Math.sin(w);
    let foreK = 0.66 + fl * 0.34;
    let hindK = 0.7 + Math.sin(w - 0.55) * 0.3;
    let lift = -Math.cos(w - 0.8) * 2.2;
    if (tick > 0) {
      foreK = lerp(foreK, 1, Math.min(1, tick * 2));
      hindK = lerp(hindK, 1, Math.min(1, tick * 2));
      lift *= 1 - tick;
    }
    if (dead) {
      foreK = 0.2;
      hindK = 0.25;
      lift = 0;
    }
    // 指針：平常走、施法時快轉到 12 點然後停
    const hr = tick > 0 ? lerp(t * 0.5, 0, tick) : t * 0.5;
    const mn = tick > 0 ? lerp(t * 3, 0, tick) : t * 3;
    const rot = t * (tick > 0 ? 3 : 0.4);
    ctx.save();
    ctx.translate(hurt ? Math.sin(t * 60) * 1.2 : strike ? 5 : 0, lift);
    // 身後的光暈、時停的符文圈
    glowH(ctx, 0, -50, 70, BF.violet, 0.22 + tick * 0.25);
    if (tick > 0) {
      runeRing(ctx, 0, -52, 58 + tick * 6, -t * 0.4, rgbOf(BF.gold), tick * 0.8, 12);
      ctx.strokeStyle = rgba(BF.gold, tick * 0.8);
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * 66, -52 - Math.cos(a) * 66);
        ctx.lineTo(Math.sin(a) * (i % 3 ? 70 : 74), -52 - Math.cos(a) * (i % 3 ? 70 : 74));
        ctx.stroke();
      }
    }
    // 身體微微側向前進方向（3/4 視角：遠側翅膀較小、較暗）
    ctx.translate(0, -50);
    ctx.rotate((dead ? 0.5 : 0.1) + (strike ? 0.15 : 0) + (hurt ? -0.12 : 0) + Math.sin(t * 1.3) * 0.03);
    ctx.translate(0, 50);
    const wing = (side, far) => {
      ctx.save();
      ctx.translate(side * (far ? -1 : 1), -50);
      ctx.scale(side * (far ? 0.84 : 1), far ? 0.94 : 1);
      ctx.rotate(wind ? -0.08 : 0);
      ctx.translate(0, 50);
      bfWing(ctx, t, tick, far, hr, mn, rot * side, foreK, hindK, Math.cos(w));
      ctx.restore();
    };
    wing(-1, true);
    // ── 身體：深靛天鵝絨＋金色節環，胸前一圈象牙白的絨毛領 ──
    const abd = (c) => taper(c, qb(0, -45, 1, -32, 0, -19), (s) => 7 * (1 - s * 0.75) + 0.8, 12);
    gradShape(ctx, abd, -4, -40, 4, -22, [[0, BF.night2], [0.5, BF.violet], [1, BF.night]], { lw: 1.9 });
    clipDo(ctx, abd, () => {
      ctx.strokeStyle = rgba(BF.gold, 0.9);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const y = -41 + i * 4.6;
        ctx.moveTo(-4, y);
        ctx.quadraticCurveTo(0, y + 1.6, 4, y);
      }
      ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', 0.35);
      ctx.fillRect(-2.2, -44, 1.2, 22);
    });
    const thorax = (c) => c.ellipse(0, -50, 5.2, 6.8, 0, 0, TAU);
    A.shape(ctx, thorax, BF.night2, BF.night, { cel: [1.2, 1.2], lw: 2, hl: false });
    // 胸背的絨毛（象牙白，一撮撮往下垂）
    clipDo(ctx, thorax, () => {
      const fg = ctx.createLinearGradient(0, -57, 0, -45);
      fg.addColorStop(0, rgba('#c8b8f0', 0.8));
      fg.addColorStop(0.6, rgba(BF.violet, 0.4));
      fg.addColorStop(1, rgba(BF.night2, 0));
      ctx.fillStyle = fg;
      ctx.fillRect(-6, -57, 12, 12);
      ctx.strokeStyle = rgba('#ffffff', 0.7);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const x = -4 + i * 1.6;
        ctx.moveTo(x, -55);
        ctx.lineTo(x + 0.4, -51 - (i % 2));
      }
      ctx.stroke();
    });
    wing(1, false);
    // 頭
    const hx = 0;
    const hy = -59;
    // 羽狀觸角：主軸往外上捲、兩側細細的羽枝，尖端一顆星
    [-1, 1].forEach((s) => {
      const sw = Math.sin(t * 2 + s) * 1.5 + (wind ? -2 : 0);
      const fn = cb(hx + s * 1.5, hy - 4, hx + s * 5, hy - 16, hx + s * 14 + sw, hy - 24, hx + s * 19 + sw, hy - 21);
      ctx.strokeStyle = A.c(BF.goldS);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 2; i < 12; i++) {
        const p = along(fn, i / 12, 0);
        const L = 2.6 * Math.sin((i / 12) * PI);
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(p[0] + Math.cos(p[2] - 2.2 * s) * L, p[1] + Math.sin(p[2] - 2.2 * s) * L);
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(p[0] + Math.cos(p[2] + 2.2 * s) * L, p[1] + Math.sin(p[2] + 2.2 * s) * L);
      }
      ctx.stroke();
      limb(ctx, (c) => {
        const p0 = fn(0);
        c.moveTo(p0[0], p0[1]);
        for (let i = 1; i <= 12; i++) {
          const p = fn(i / 12);
          c.lineTo(p[0], p[1]);
        }
      }, 2.8, BF.gold);
      const e = fn(1);
      glowH(ctx, e[0], e[1], 7, BF.gold, 0.55 + tick * 0.4);
      A.shape(ctx, (c) => starPath(c, e[0], e[1], 3.6, 1.5, 4, t * 0.5), BF.moon, BF.gold, { lw: 1.1, hl: false, shadeY: e[1] + 1 });
    });
    const head = (c) => c.ellipse(hx, hy, 5.6, 5, 0, 0, TAU);
    A.shape(ctx, head, BF.night2, BF.night, { cel: [1, 1], lw: 2, hl: false });
    // 額上的星鑽
    glowH(ctx, hx, hy - 3.4, 4.5, BF.eye, 0.6);
    sparkle(ctx, hx, hy - 3.4, 2, '#dffcff');
    // 眼：兩顆大大的複眼（星空寶石）
    if (kind === 'normal' || kind === 'angry') {
      [-1, 1].forEach((s) => {
        const ex = hx + s * 3.4;
        const ey = hy + 0.6;
        const g = ctx.createRadialGradient(ex - s * 0.6, ey - 0.8, 0.2, ex, ey, 2.8);
        g.addColorStop(0, A.c('#bff8ff'));
        g.addColorStop(0.45, A.c('#3a8ae0'));
        g.addColorStop(1, A.c('#140e40'));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 2.5, 2.9, s * 0.2, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ex - s * 0.4 - 0.6, ey - 1.6, 1.1, 1.1);
      });
      if (kind === 'angry' || wind) {
        brow(ctx, hx - 5.5, hy - 3.2, hx - 1.6, hy - 1.6);
        brow(ctx, hx + 5.5, hy - 3.2, hx + 1.6, hy - 1.6);
      }
    } else {
      A.eye(ctx, hx - 3.2, hy + 0.6, 1.8, 1.8, kind, 0);
      A.eye(ctx, hx + 3.2, hy + 0.6, 1.8, 1.8, kind, 0);
    }
    // 捲起的金色口器
    ctx.strokeStyle = A.c(BF.gold);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(hx + 0.5, hy + 7, 1.9, -PI / 2, PI * 1.25);
    ctx.stroke();
    // 灑落的時之鱗粉
    if (!dead) {
      for (let i = 0; i < 9; i++) {
        const q = (t * (tick > 0 ? 0.15 : 0.5) + i / 9) % 1;
        const px = (hash(i + 5) - 0.5) * 84;
        const py = -44 + q * 52;
        ctx.save();
        ctx.globalAlpha *= (1 - q) * 0.9;
        sparkle(ctx, px, py, 1.6 + hash(i) * 1.5, i % 2 ? '#fff2b0' : '#bff4ff');
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
        const L = (i % 2 ? 8 : 13) * (0.5 + Math.sin((i / N) * PI) * 0.75) + Math.sin(t * 5 - i * 0.6) * 1.4;
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
    // 尾尖：紫金色的扇形尾鰭（龍環時被自己咬住）
    {
      const e0 = along(spine, 0, 0);
      ctx.save();
      ctx.translate(e0[0], e0[1]);
      ctx.rotate(e0[2] + PI + Math.sin(t * 4) * 0.12);
      const tf = (c) => {
        c.moveTo(-3, 0);
        c.quadraticCurveTo(4, -9, 13, -8);
        c.quadraticCurveTo(10, -3, 15, 0);
        c.quadraticCurveTo(10, 3, 13, 8);
        c.quadraticCurveTo(4, 9, -3, 0);
        c.closePath();
      };
      gradShape(ctx, tf, -2, 0, 15, 0, [[0, OU.finS], [0.5, OU.fin], [1, '#ffd98a']], { lw: 1.8 });
      ctx.strokeStyle = A.c('#ffd98a');
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      [[12, -7], [14, 0], [12, 7]].forEach(([x, y]) => {
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
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
      // 背脊的暗色帶＋鱗面的光澤帶
      ctx.strokeStyle = rgba(OU.dark, 0.35);
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const p = along(spine, i / 30, (finSide * wf(i / 30)) * 0.38);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
      ctx.strokeStyle = rgba('#dffff4', 0.3);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let i = 2; i <= 28; i++) {
        const p = along(spine, i / 30, (finSide * wf(i / 30)) * 0.2);
        i > 2 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
      // 背上一排金邊的菱形鱗甲
      for (let i = 2; i < 17; i++) {
        const s = i / 17.5;
        const w = wf(s);
        const p = along(spine, s, finSide * w * 0.34);
        const L = Math.max(2.6, w * 0.27);
        const H = Math.max(1.6, w * 0.13);
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(p[2]);
        ctx.beginPath();
        ctx.moveTo(-L, 0);
        ctx.lineTo(0, -H);
        ctx.lineTo(L, 0);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = A.c(i % 2 ? '#48c8a4' : '#3ab898');
        ctx.fill();
        ctx.strokeStyle = A.c(OU.bellyS);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      // 尾端的金環（循環的起點）
      [0.07, 0.1].forEach((s) => {
        const a = along(spine, s, wf(s) * 0.55);
        const b = along(spine, s, -wf(s) * 0.55);
        ctx.strokeStyle = A.c(OU.belly);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      });
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
    // 分岔的舌頭（平常會一下下吐信）
    const flick = biting || open > 0.2 ? 0 : Math.pow(Math.max(0, Math.sin(t * 2.3)), 6);
    if (flick > 0.05) {
      const L = 4 + flick * 12;
      const wv = Math.sin(t * 30) * 1.2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      const tg = () => {
        ctx.beginPath();
        ctx.moveTo(22, 2);
        ctx.quadraticCurveTo(22 + L * 0.6, 2 + wv, 22 + L, 2);
        ctx.moveTo(22 + L, 2);
        ctx.lineTo(22 + L + 3, 0.5 + wv);
        ctx.moveTo(22 + L, 2);
        ctx.lineTo(22 + L + 3, 3.5 + wv);
      };
      tg();
      ctx.stroke();
      ctx.strokeStyle = A.c('#e84a6a');
      ctx.lineWidth = 1.2;
      tg();
      ctx.stroke();
    }
    // 下巴的金色鬚髯（慢半拍飄動）
    for (let i = 0; i < 3; i++) {
      const fl = Math.sin(t * 4 - i * 0.8) * 1.5;
      const fn = qb(8 + i * 3.5, 5 + open * 3, 4 + i * 3 + fl, 10 + i + open * 4, -1 + i * 2 + fl * 1.4, 13 - i * 0.5 + open * 4);
      gradShape(ctx, (c) => taper(c, fn, (q) => 3.6 * (1 - q) + 0.5, 8), 8, 5, 0, 13, [[0, OU.horn], [1, OU.hornS]], { lw: 1.1 });
    }
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
    // 頭頂的金冠棘（兩角之間）
    for (let i = 0; i < 3; i++) {
      const x = 2 - i * 3.5;
      const y = -10 + i * 1.5;
      A.shape(ctx, (c) => {
        c.moveTo(x - 2, y + 1.5);
        c.lineTo(x - 4.5 - i, y - 6 + i);
        c.lineTo(x + 1.5, y + 0.5);
        c.closePath();
      }, OU.belly, OU.bellyS, { lw: 1.2, hl: false, shadeY: y - 1 });
    }
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
      // 尾巴翹起來捲成一道弧（尾鰭像在打拍子），身體在地上波動，前半身像眼鏡蛇昂起
      const base = [[-74, -34], [-70, -19], [-60, -8], [-46, -8], [-30, -14], [-14, -13], [2, -10], [16, -17], [23, -32 * rise], [27 + lunge * 0.5, -47 * rise], [33 + lunge, -58 * rise]];
      const flick = dead ? 0 : Math.sin(t * 2.6) * 1;
      const pts = base.map(([x, y], i) => {
        if (i < 3) return [x + flick * (3 - i) * 2.2, dead ? Math.min(-5, y * 0.25) : y + Math.sin(und * 0.5 - i) * (3 - i) * 1.2];
        const k = i < 8 ? 1 : 0.3;
        return [x + (i < 8 ? Math.cos(und + i * 1.1) * 1.5 : 0), dead ? Math.min(-5, y * 0.2) : y + Math.sin(und + i * 1.1) * (i < 8 ? 4.5 - (i - 3) * 0.5 : 1.2) * k];
      });
      if (dead) {
        pts[8] = [26, -8];
        pts[9] = [36, -8];
        pts[10] = [46, -7];
      }
      const spine = spline(pts);
      const wf = (s) => (s < 0.62 ? lerp(3, 26, Math.pow(s / 0.62, 0.85)) : lerp(26, 17, (s - 0.62) / 0.38));
      ouroBody(ctx, spine, wf, t, { finSide: -1, finFrom: 0.2, finTo: 0.9 });
      const e = along(spine, 1, 0);
      ctx.save();
      ctx.translate(e[0] - 2, e[1]);
      ctx.rotate(dead ? 0.2 : strike ? 0.25 : wind ? -0.25 : -0.05 + Math.sin(t * 2) * 0.07 + Math.sin(t * 3.4) * 0.03);
      ctx.scale(1.55, 1.55);
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
    // 身體的波動：尾柄上下擺、頭部微微反向（游泳時整條身體像波浪一樣彎）
    const dy = (x) => swim * 7 * Math.pow(Math.max(0, (-x - 4) / 56), 1.5) - swim * 1.2 * Math.max(0, (x - 20) / 50);
    const B = (x, y) => [x, y + dy(x)];
    const bz = (c, x1, y1, x2, y2, x3, y3) => {
      const p1 = B(x1, y1);
      const p2 = B(x2, y2);
      const p3 = B(x3, y3);
      c.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
    };
    const full = (c) => {
      const p0 = B(-56, -74);
      c.moveTo(p0[0], p0[1]);
      bz(c, -32, -80, -8, -92, 22, -90);
      bz(c, 48, -89, 68, -80, 69, -60);
      bz(c, 70, -44, 60, -33, 42, -31);
      bz(c, 14, -27, -20, -36, -40, -54);
      bz(c, -46, -60, -52, -66, -58, -68);
      const q = B(-60, -72);
      c.quadraticCurveTo(q[0], q[1], p0[0], p0[1]);
      c.closePath();
    };
    // ── 尾鰭：跟著尾柄的斜率擺動，末端慢半拍 ──
    const tail = B(-57, -71);
    const slope = (dy(-50) - dy(-60)) / 10;
    ctx.save();
    ctx.translate(tail[0], tail[1]);
    ctx.rotate(PI + 0.3 + Math.atan(slope) * -1 + Math.sin(t * 1.8 - 0.9) * 0.18 * (o.swimK || 1));
    const fluke = (c) => {
      c.moveTo(3, 0);
      c.bezierCurveTo(4, -10, 14, -20, 26, -23);
      c.quadraticCurveTo(23, -18, 24, -15);
      c.quadraticCurveTo(20, -12, 21, -8);
      c.quadraticCurveTo(15, -4, 13, 0);
      c.quadraticCurveTo(15, 4, 21, 8);
      c.quadraticCurveTo(20, 12, 24, 15);
      c.quadraticCurveTo(23, 18, 26, 23);
      c.bezierCurveTo(14, 20, 4, 10, 3, 0);
      c.closePath();
    };
    gradShape(ctx, fluke, 3, 0, 26, 0, [[0, WH.mid], [0.6, WH.top], [1, '#2a2080']], { noStroke: true });
    clipDo(ctx, fluke, () => {
      glowH(ctx, 19, -14, 9, WH.neb2, 0.5);
      glowH(ctx, 19, 14, 9, WH.neb1, 0.5);
      ctx.fillStyle = rgba('#ffffff', 0.8);
      [[16, -12], [21, -18], [18, 10], [22, 17], [10, -4]].forEach(([x, y]) => ctx.fillRect(x, y, 1.2, 1.2));
    });
    crescent(ctx, fluke, -1.2, 1.2, WH.rim, 0.75);
    strokeOut(ctx, fluke, 2.2);
    ctx.restore();
    // ── 遠側胸鰭 ──
    const finA = Math.sin(t * 1.8 - 0.6) * 0.22 * (o.swimK || 1);
    ctx.save();
    const fp = B(30, -43);
    ctx.translate(fp[0], fp[1]);
    ctx.rotate(2.75 + finA);
    ctx.scale(1, -1);
    A.shape(ctx, (c) => {
      c.moveTo(0, -4);
      c.bezierCurveTo(10, -4, 22, 0, 30, 6);
      c.quadraticCurveTo(18, 6, 0, 5);
      c.closePath();
    }, WH.fin, '#140e3a', { lw: 2, hl: false, shadeY: 3 });
    ctx.restore();
    // ── 身體 ──
    ctx.beginPath();
    full(ctx);
    const g = ctx.createLinearGradient(0, -90, 0, -30);
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
      glowH(ctx, -32, -62 + dy(-32), 14, WH.neb2, 0.35);
      // 側腹的小旋渦星系（慢慢轉）
      ctx.save();
      ctx.translate(-4, -66 + dy(-4));
      ctx.scale(1, 0.55);
      ctx.rotate(t * 0.25);
      glowH(ctx, 0, 0, 9, '#fff2c8', 0.55);
      ctx.fillStyle = rgba('#fff6e0', 0.85);
      for (let arm = 0; arm < 2; arm++) {
        for (let j = 0; j < 9; j++) {
          const a = arm * PI + j * 0.55;
          const r = 1.5 + j * 1.4;
          const s = j < 3 ? 1.4 : 1;
          ctx.fillRect(Math.cos(a) * r - s / 2, Math.sin(a) * r - s / 2, s, s);
        }
      }
      ctx.restore();
      // 星點
      for (let i = 0; i < 26; i++) {
        const px = -52 + hash(i + 3) * 110;
        const py = -86 + hash(i + 33) * 30 + dy(px);
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3);
        ctx.fillStyle = rgba('#ffffff', 0.35 + tw * 0.6);
        const s = hash(i + 63) < 0.2 ? 1.8 : 1.1;
        ctx.fillRect(px, py, s, s);
      }
      // 星座線（背上的北斗）
      const cs = [[-30, -73], [-18, -80], [-4, -79], [6, -84], [22, -80], [30, -84]].map(([x, y]) => B(x, y));
      ctx.strokeStyle = rgba('#fff2c0', 0.55);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      cs.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      cs.forEach(([x, y], i) => sparkle(ctx, x, y, (i % 2 ? 1.6 : 2.2) * (0.8 + 0.2 * Math.sin(t * 3 + i)), '#fff6c8'));
      // 喉腹褶：一道道青色光紋（跟著身體彎）
      ctx.strokeStyle = rgba(WH.pleat, 0.75);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const y = -44 + i * 2.6;
        const a = B(60 - i * 2, y - 2);
        const b = B(20, y + 3);
        const c2 = B(-18 + i * 3, y);
        ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo(b[0], b[1], c2[0], c2[1]);
      }
      ctx.stroke();
      // 頭上的星晶疣（座頭鯨的結節）
      [[40, -78, 2.6], [48, -75, 1.8], [34, -82, 2], [55, -70, 1.6], [44, -83, 1.4]].forEach(([x, y, r]) => {
        glowH(ctx, x, y, r * 3, WH.neb2, 0.55);
        sparkle(ctx, x, y, r, '#dffcff');
      });
      // 下顎的深色與唇線的光
      ctx.fillStyle = rgba('#140c30', 0.35);
      ctx.beginPath();
      ctx.ellipse(46, -46, 22, 6, -0.08, 0, TAU);
      ctx.fill();
    });
    volume(ctx, full, 10, -62, 48, 0.2, 0.4, '#07051c');
    crescent(ctx, full, 1.5, 2.2, WH.rim, 0.75);
    crescent(ctx, full, -1.5, -1.8, WH.neb1, 0.4);
    // 腹部的次元裂縫：沿著腹線裂開的一道發光縫（在身體裡，不是貼上去的）
    const rw = o.riftW;
    const rh = o.riftH;
    if (rw > 1) {
      clipDo(ctx, full, () => {
        const cx = -12;
        const cy = -43 + dy(-12);
        const rift = (c) => {
          for (let i = 0; i <= 10; i++) {
            const q = i / 10;
            const x = cx - rw + q * 2 * rw;
            const b = Math.sin(q * PI);
            const y = cy + (q - 0.5) * -6 - rh * b + ((i % 2) - 0.5) * 1.6 * b + Math.sin(t * 9 + i) * 0.5 * b;
            i ? c.lineTo(x, y) : c.moveTo(x, y);
          }
          for (let i = 10; i >= 0; i--) {
            const q = i / 10;
            const x = cx - rw + q * 2 * rw;
            const b = Math.sin(q * PI);
            c.lineTo(x, cy + (q - 0.5) * -6 + rh * b * 0.8 + ((i % 2) - 0.5) * -1.4 * b);
          }
          c.closePath();
        };
        glowH(ctx, cx, cy, rw * 1.3, WH.rift, 0.55);
        clipDo(ctx, rift, () => {
          starfield(ctx, cx - rw - 2, cy - rh - 8, rw * 2 + 4, rh * 2 + 16, 23, t, 1.4);
          glowH(ctx, cx, cy, rw * 0.8, WH.neb1, 0.55);
          ctx.strokeStyle = rgba(WH.neb2, 0.8);
          ctx.lineWidth = 1.2;
          const q = (t * 0.9) % 1;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rw * (1 - q) + 0.5, rh * (1 - q) + 0.5, -0.12, 0, TAU);
          ctx.stroke();
        });
        ctx.beginPath();
        rift(ctx);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = rgba(WH.rift, 0.6);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = A.c(WH.neb2);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
      // 從裂縫漏出的星塵
      for (let i = 0; i < 4; i++) {
        const q = (t * 0.8 + i / 4) % 1;
        ctx.fillStyle = rgba(i % 2 ? WH.rift : WH.neb2, (1 - q) * 0.9);
        ctx.fillRect(-12 - rw * 0.6 + i * rw * 0.4, -38 + dy(-12) + q * 14, 1.8, 1.8);
      }
    }
    ctx.beginPath();
    full(ctx);
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    // 背鰭＋後面一排小隆起
    const df = (x, y) => B(x, y);
    {
      const a = df(-22, -83);
      const b = df(-18, -93);
      const c1 = df(-8, -95);
      const d = df(-11, -89);
      const e = df(-6, -86);
      A.shape(ctx, (c) => {
        c.moveTo(a[0], a[1]);
        c.quadraticCurveTo(b[0], b[1], c1[0], c1[1]);
        c.quadraticCurveTo(d[0], d[1], e[0], e[1]);
        c.closePath();
      }, WH.top, '#0c0830', { lw: 2, hl: false, shadeY: -82 });
      ctx.strokeStyle = rgba(WH.rim, 0.8);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const p = df(-34 - i * 6, -80 + i * 1.6);
        ctx.moveTo(p[0] - 2, p[1] + 0.8);
        ctx.quadraticCurveTo(p[0], p[1] - 1.8, p[0] + 2, p[1] + 0.8);
      }
      ctx.stroke();
    }
    // 噴氣孔：偶爾噴出一道星塵
    const spout = o.spout || 0;
    if (spout > 0.02) {
      for (let i = 0; i < 8; i++) {
        const q = (t * 1.6 + i / 8) % 1;
        const a = -PI / 2 + (hash(i + 4) - 0.5) * 0.9;
        const r = q * 22;
        ctx.fillStyle = rgba(i % 2 ? '#dffcff' : WH.neb2, (1 - q) * spout);
        ctx.fillRect(34 + Math.cos(a) * r - 1, -88 + Math.sin(a) * r + q * q * 10 - 1, 2, 2);
      }
    }
    // 嘴線與下顎
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (open > 0.05) {
      A.shape(ctx, (c) => {
        c.moveTo(66, -52);
        c.quadraticCurveTo(46, -50 + open * 8, 22, -50);
        c.quadraticCurveTo(42, -44 + open * 12, 62, -40 + open * 10);
        c.closePath();
      }, '#4a1a5a', null, { lw: 2 });
      ctx.fillStyle = rgba('#ff7ab0', 0.7);
      ctx.beginPath();
      ctx.ellipse(44, -45 + open * 4, 10, 2.4, -0.05, 0, TAU);
      ctx.fill();
      // 鯨鬚
      ctx.strokeStyle = rgba('#f0e0ff', 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const x = 28 + i * 5;
        ctx.moveTo(x, -50.5);
        ctx.lineTo(x - 1, -47 + open * 2);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(66, -50);
      ctx.bezierCurveTo(52, -47, 38, -53, 22, -48);
      ctx.quadraticCurveTo(19, -47, 18, -45);
      ctx.stroke();
      ctx.strokeStyle = rgba(WH.pleat, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(64, -48);
      ctx.bezierCurveTo(52, -45.5, 38, -51, 24, -46.5);
      ctx.stroke();
    }
    // 眼：溫柔發光的大眼，眼周一圈星光
    const ex = 36;
    const ey = -59;
    if (o.kind === 'normal' || o.kind === 'angry') {
      glowH(ctx, ex, ey, 11, WH.eye, 0.55);
      A.ellipse(ctx, ex, ey, 3.8, 4, '#140c30', null, { lw: 1.5, hl: false });
      const ig = ctx.createRadialGradient(ex + 0.6, ey + 0.8, 0.3, ex + 0.6, ey + 0.8, 2.6);
      ig.addColorStop(0, A.c('#ffffff'));
      ig.addColorStop(0.4, A.c(WH.eye));
      ig.addColorStop(1, A.c('#e8a0ff'));
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.arc(ex + 0.6, ey + 0.8, 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex - 2, ey - 2.4, 1.6, 1.6);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ex - 4.5, ey - 3.5);
      ctx.quadraticCurveTo(ex, ey - 6.5, ex + 4.5, ey - 4);
      ctx.stroke();
      if (o.kind === 'angry' || open > 0.5) brow(ctx, ex - 4.5, ey - 7, ex + 4.5, ey - 4.5);
    } else A.eye(ctx, ex, ey, 3, 3, o.kind, 0);
    // 近側胸鰭（座頭鯨式的長鰭，前緣一顆顆星瘤；拍動慢半拍）
    ctx.save();
    const np = B(26, -41);
    ctx.translate(np[0], np[1]);
    ctx.rotate(2.55 + finA * 1.3);
    ctx.scale(1, -1);
    const pf = (c) => {
      c.moveTo(0, -6);
      c.bezierCurveTo(6, -8, 10, -6, 14, -6.5);
      c.bezierCurveTo(20, -5, 22, -3.5, 27, -2);
      c.bezierCurveTo(33, 0, 38, 2, 43, 7);
      c.quadraticCurveTo(45, 11, 40, 11);
      c.bezierCurveTo(28, 10, 12, 9, 0, 7);
      c.closePath();
    };
    gradShape(ctx, pf, 0, -4, 0, 8, [[0, WH.mid], [1, WH.bellyS]], { noStroke: true });
    clipDo(ctx, pf, () => {
      ctx.strokeStyle = rgba(WH.pleat, 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, 1);
      ctx.quadraticCurveTo(20, 1, 36, 6);
      ctx.stroke();
    });
    crescent(ctx, pf, 1, 1, WH.rim, 0.7);
    strokeOut(ctx, pf, 2.2);
    for (let i = 0; i < 5; i++) {
      const x = 7 + i * 7.5;
      const y = -6 + i * 2.6;
      ctx.fillStyle = A.c('#2a2070');
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, TAU);
      ctx.fill();
      sparkle(ctx, x, y, 1.5, '#dffcff');
    }
    ctx.restore();
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
    const swimK = dead ? 0 : walking(m) ? 1.4 : 1;
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
      if (k > 0.02) withTint('#b070ff', k * 0.8, () => whaleBody(ctx, t, { open: 0, swim, swimK, riftW: 20 + riftOpen * 6, riftH: 4 + riftOpen * 3, kind }));
      else whaleBody(ctx, t, { open: strike ? 1 : wind ? 0.3 : 0, swim, swimK, riftW: 21, riftH: 4.6 + Math.sin(t * 3) * 0.8, kind, spout: wind || strike || hurt ? 0 : Math.pow(Math.max(0, Math.sin(t * 0.7)), 6) });
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
      // 環上的分段刻紋（像土星環的縫）＋內側一圈細環
      ctx.setLineDash([2.5, 5]);
      ctx.lineDashOffset = -t * 12 * spinK;
      ctx.strokeStyle = rgba(EY.ringS, front ? 0.9 : 0.5);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRX + 0.5, ringRY + 0.5, 0, a0, a1);
      ctx.stroke();
      ctx.setLineDash([]);
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
    // 光之觸鬚（從殼的下緣垂下）：水母般的緞帶，一節節波動（越末端越慢半拍），上面串著一顆顆光珠
    for (let i = 0; i < 6; i++) {
      const x0 = cx - 20 + i * 8;
      const reach = pull ? 10 : 0;
      const pts = [[x0, cy + 22]];
      for (let j = 1; j <= 5; j++) {
        const sw = Math.sin(t * 2.4 - j * 0.7 + i * 1.3) * (1.5 + j * 1.1);
        pts.push([x0 + sw + reach * (j / 5) * 1.5 + (i - 2.5) * j * 0.6, cy + 22 + j * (11 - Math.abs(i - 2.5) * 1.1)]);
      }
      const fn = spline(pts);
      const W = i % 2 ? 5 : 7.5;
      const path = (c) => taper(c, fn, (q) => W * (1 - q) + 0.8, 16);
      const p1 = pts[5];
      gradShape(ctx, path, x0, cy + 22, p1[0], p1[1], [[0, EY.tend], [0.5, EY.tend2, 0.85], [1, EY.tend2, 0]], { noStroke: true });
      ctx.strokeStyle = rgba('#ffffff', 0.5);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let j = 0; j <= 8; j++) {
        const p = fn(j / 10);
        j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
      for (let j = 1; j < 4; j++) {
        const q = ((j * 0.22 + t * 0.35 + i * 0.13) % 0.8) + 0.08;
        const p = fn(q);
        ctx.fillStyle = rgba('#dffcff', 0.9 * (1 - q));
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.6 * (1 - q * 0.5), 0, TAU);
        ctx.fill();
      }
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
    // 重力透鏡的光環：殼外一圈被彎曲的星光（慢慢脈動）
    {
      const pr = R + 20 + Math.sin(t * 2) * 1.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.3);
      const lg = ctx.createLinearGradient(-pr, -pr, pr, pr);
      lg.addColorStop(0, rgba('#ffe7a0', 0.75 + (pull ? 0.2 : 0)));
      lg.addColorStop(0.5, rgba('#c07aff', 0.25));
      lg.addColorStop(1, rgba('#8af0ff', 0.7));
      ctx.strokeStyle = lg;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, pr, pr * 0.94, 0, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, pr + 4, pr * 0.94 + 4, 0, 0.3, 2.4);
      ctx.stroke();
      ctx.restore();
    }
    // 殼上的星晶刺（在殼後面）：多面的紫水晶，亮面＋暗面＋晶尖的光
    [[-2.2, 17], [-1.6, 23], [-1.0, 16], [-2.8, 12], [-0.4, 11], [0.4, 8]].forEach(([a, L], i) => {
      const bx = cx + Math.cos(a) * (R + 7);
      const by = cy + Math.sin(a) * (R + 7);
      const tx = cx + Math.cos(a) * (R + 7 + L);
      const ty = cy + Math.sin(a) * (R + 7 + L);
      const w = 4.5 + L * 0.08;
      const nx = -Math.sin(a) * w;
      const ny = Math.cos(a) * w;
      const mx = cx + Math.cos(a) * (R + 7 + L * 0.72);
      const my = cy + Math.sin(a) * (R + 7 + L * 0.72);
      const crys = (c) => {
        c.moveTo(bx + nx, by + ny);
        c.lineTo(mx + nx * 0.7, my + ny * 0.7);
        c.lineTo(tx, ty);
        c.lineTo(mx - nx * 0.7, my - ny * 0.7);
        c.lineTo(bx - nx, by - ny);
        c.closePath();
      };
      A.shape(ctx, crys, i % 2 ? '#9a6aff' : '#b88aff', '#5a3ab0', { lw: 1.6, hl: false, shadeY: ty + 100 });
      ctx.fillStyle = rgba('#efe0ff', 0.75);
      ctx.beginPath();
      ctx.moveTo(bx + nx * 0.2, by + ny * 0.2);
      ctx.lineTo(mx + nx * 0.6, my + ny * 0.6);
      ctx.lineTo(tx, ty);
      ctx.lineTo(mx, my);
      ctx.closePath();
      ctx.fill();
      glowH(ctx, tx, ty, 6, '#e0c8ff', 0.5 + 0.3 * Math.sin(t * 3 + i));
    });
    A.shape(ctx, shell, EY.rock, EY.rockS, { cel: [3, 3], lw: 2.8, hl: false });
    clipDo(ctx, shell, () => {
      // 多面的黑曜石切面：亮面朝左上、暗面朝右下，面與面之間一道細亮稜
      for (let i = 0; i < 9; i++) {
        const a0 = (i / 9) * TAU + 0.2;
        const a1 = ((i + 1) / 9) * TAU + 0.2;
        const rO = R + 14;
        const rI = R + 1;
        const lit = Math.cos(a0 + 0.35 - PI * 1.25);
        ctx.fillStyle = lit > 0 ? rgba('#8a70d0', 0.18 + lit * 0.3) : rgba('#07031a', -lit * 0.35);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a0) * rI, cy + Math.sin(a0) * rI);
        ctx.lineTo(cx + Math.cos(a0) * rO, cy + Math.sin(a0) * rO);
        ctx.lineTo(cx + Math.cos(a1) * rO, cy + Math.sin(a1) * rO);
        ctx.lineTo(cx + Math.cos((a0 + a1) / 2) * (rI + 5), cy + Math.sin((a0 + a1) / 2) * (rI + 5));
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = rgba('#c8b0ff', 0.4);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a0 = (i / 9) * TAU + 0.2;
        ctx.moveTo(cx + Math.cos(a0) * (R + 1), cy + Math.sin(a0) * (R + 1));
        ctx.lineTo(cx + Math.cos(a0) * (R + 14), cy + Math.sin(a0) * (R + 14));
      }
      ctx.stroke();
      // 嵌在殼裡的小晶簇
      [[-2.4, 1], [0.5, 0.8], [2.1, 1.1]].forEach(([a, k]) => {
        const px = cx + Math.cos(a) * (R + 6);
        const py = cy + Math.sin(a) * (R + 6);
        glowH(ctx, px, py, 6 * k, '#c07aff', 0.6);
        ctx.fillStyle = A.c('#e0c8ff');
        ctx.beginPath();
        ctx.moveTo(px, py - 3.2 * k);
        ctx.lineTo(px + 1.8 * k, py);
        ctx.lineTo(px, py + 2.4 * k);
        ctx.lineTo(px - 1.8 * k, py);
        ctx.closePath();
        ctx.fill();
      });
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
    // 眼珠會四處張望（跳視），攻擊時盯著前方
    const sac = Math.floor(t * 0.9);
    const lookX = pull ? 0 : wind || strike ? 6 : 3 + (hash(sac) - 0.5) * 8;
    const lookY = pull || wind || strike ? 1 : (hash(sac + 7) - 0.5) * 6;
    const ix = cx + lookX;
    const iy = cy + lookY;
    const ir = R * (pull ? 0.72 : 0.64);
    // 眼白上的紫色微血管（從眼角往內爬）
    ctx.strokeStyle = rgba('#b060d0', 0.45);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.4;
      let px = cx + Math.cos(a) * R;
      let py = cy + Math.sin(a) * R;
      ctx.moveTo(px, py);
      for (let k = 0; k < 3; k++) {
        const aa = a + PI + (hash(i * 3 + k) - 0.5) * 1.2;
        px += Math.cos(aa) * 3.2;
        py += Math.sin(aa) * 3.2;
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    // 虹膜外一圈深色的角膜緣暈影
    glowH(ctx, ix, iy, ir * 1.25, '#6a3ae0', 0.35);
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
    // 虹膜的放射紋（一絲絲的纖維）＋內側的金色環
    ctx.strokeStyle = rgba('#2a1060', 0.35);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      const r0 = ir * (0.45 + (i % 3) * 0.08);
      ctx.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0);
      ctx.lineTo(ix + Math.cos(a + 0.05) * ir * 0.95, iy + Math.sin(a + 0.05) * ir * 0.95);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffe7a0', 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ix, iy, ir * 0.4, 0, TAU);
    ctx.stroke();
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
  // 天馬的翅膀（翼的區域座標：+x 是翼前緣「肩→肘→腕→翼尖」，飛羽往 -y 拖出；整片以 ang 旋轉）。
  // open：0＝收攏貼在背上、1＝完全展開；bend：腕部的彎折（拍翅時手部慢半拍）
  function pegWing(ctx, x, y, ang, open, bend, P, far, t, lite) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const k = far ? 0.86 : 1;
    ctx.scale(k * lerp(0.86, 1, open), k);
    const fan = lerp(0.14, 1, open);
    const c0 = far ? P.wingS : P.wing;
    const el = [11, 1.5];
    const wa = 0.08 + bend * 0.45;
    const wr = [el[0] + Math.cos(wa) * 12, el[1] + Math.sin(wa) * 12];
    const ha = wa + bend * 0.7 - (1 - open) * 0.15;
    const tip = [wr[0] + Math.cos(ha) * 10, wr[1] + Math.sin(ha) * 10];
    const rs = far ? null : '#ffffff';
    const prim = [];
    for (let i = 6; i >= 0; i--) {
      const q = i / 6;
      const bx = lerp(wr[0], tip[0], q);
      const by = lerp(wr[1], tip[1], q);
      const a = ha - lerp(1.3, 0.14, q) * fan - (1 - fan) * 0.1 + Math.sin(t * 3 + i) * 0.02;
      const L = lerp(21, 29, q) * (far ? 0.92 : 1);
      prim.push([bx, by, a, L]);
    }
    const sec = [];
    for (let j = 5; j >= 0; j--) {
      const q = j / 5;
      sec.push([lerp(2, wr[0], q), lerp(0.5, wr[1], q), lerp(-0.12, -PI / 2 - 0.2 + q * 0.12, fan), lerp(15, 19, q)]);
    }
    // 整片翅膀的剪影（外框只畫一次，羽毛之間只留細線）
    const tips = prim.concat(sec).map(([bx, by, a, L]) => [bx + Math.cos(a) * L, by + Math.sin(a) * L, bx + Math.cos(a) * L * 0.72, by + Math.sin(a) * L * 0.72]);
    const sil = (c) => {
      c.moveTo(-2, 2);
      c.lineTo(el[0], el[1] + 2);
      c.lineTo(wr[0], wr[1] + 2);
      c.lineTo(tip[0] + 1, tip[1] + 1);
      c.lineTo(tips[0][0], tips[0][1]);
      for (let i = 1; i < tips.length; i++) {
        const A0 = tips[i - 1];
        const B = tips[i];
        c.quadraticCurveTo((A0[2] + B[2]) / 2, (A0[3] + B[3]) / 2, B[0], B[1]);
      }
      c.lineTo(-3, -4);
      c.closePath();
    };
    gradShape(ctx, sil, 0, 0, tips[0][0], tips[0][1], [[0, c0], [0.6, far ? P.wingS : P.wing], [1, P.tip]], { lw: 2.4 });
    // 初級飛羽（翼尖在最下層）：從腕到翼尖扇形展開，羽尖染上金色（淡淡的重影只畫剪影）
    if (!lite) prim.forEach(([bx, by, a, L], i) => feather(ctx, bx, by, L, 7.5, a, c0, P.tip, { colM: c0, mid: 0.62, curl: -0.18, lw: 1, shaft: far || i % 2 ? null : P.wingS }));
    // 次級飛羽：沿著前臂往後排
    if (!lite) sec.forEach(([bx, by, a, L]) => feather(ctx, bx, by, L, 8, a, c0, far ? P.tip : P.wingS, { mid: 0.7, colM: c0, curl: -0.25, lw: 1 }));
    if (rs && !lite) crescent(ctx, sil, 1.2, 1.2, rs, 0.5);
    // 覆羽：兩排魚鱗般的短羽，蓋住飛羽的根
    const edge = [[-2, 0.5], el, wr, tip];
    const covert = (w0, w1, col, colS, n) => {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const s = i / n;
        const seg = Math.min(2, Math.floor(s * 3));
        const u = s * 3 - seg;
        const p = [lerp(edge[seg][0], edge[seg + 1][0], u), lerp(edge[seg][1], edge[seg + 1][1], u)];
        pts.push([p[0], p[1], lerp(w0, w1, s)]);
      }
      const path = (c) => {
        c.moveTo(pts[0][0], pts[0][1] + 1.5);
        for (let i = 1; i <= n; i++) c.lineTo(pts[i][0], pts[i][1] + 1.5);
        for (let i = n; i > 0; i--) {
          const a = pts[i];
          const b = pts[i - 1];
          const mx = (a[0] + b[0]) / 2;
          c.quadraticCurveTo(mx + 1, (a[1] + b[1]) / 2 - (a[2] + b[2]) / 2 - 2.2 - (i % 2) * 1.4, b[0] - 0.5, b[1] - b[2] * (i % 2 ? 1 : 0.85));
        }
        c.closePath();
      };
      gradShape(ctx, path, 0, 2, 0, -w0, [[0, col], [1, colS]], { lw: 1.2 });
      return path;
    };
    if (!lite || lite === 'lower') {
      covert(11, 6, c0, far ? P.wingS : P.wing, 7);
      const cp = covert(6, 3.5, c0, far ? P.wingS : P.tip, 6);
      if (!far) crescent(ctx, cp, 1, 1, '#ffffff', 0.7);
    }
    // 翼前緣（骨）
    const arm = spline([[-2, 1], el, wr, tip]);
    const path = (c) => taper(c, arm, (s) => lerp(far ? 5 : 5.8, 2.2, s), 16);
    A.shape(ctx, path, c0, P.wingS, { cel: [0, -1.2], lw: 1.8, hl: false });
    if (!far) crescent(ctx, path, 0, 1.2, '#ffffff', 0.85);
    ctx.restore();
  }
  // 天馬的腿：比麒麟粗壯，球節有一撮長距毛
  const PG_LF = [11, 12, 9.5, 4.5];
  const PG_LH = [13, 13.5, 12, 4.5];
  const PG_WF = [[0, 15], [0.75, 11], [1, 9.6], [1.3, 8.6], [1.88, 5.4], [2, 6.6], [2.14, 5], [2.86, 4.6], [3, 6.4], [3.3, 5], [4, 5.2]];
  const PG_WH = [[0, 21], [0.6, 16], [1, 11], [1.25, 9], [1.85, 5.6], [2, 7], [2.16, 5.2], [2.86, 4.6], [3, 6.4], [3.3, 5], [4, 5.2]];
  function pegasusBody(ctx, m, P, t, lite) {
    const ph = phase(m);
    const dead = !!m.dead;
    const hurt = m.hurtT > 0 && !dead;
    const kind = eyeKind(m);
    const walk = walking(m) && !ph && !dead;
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const g = t * 1.8;
    const G2 = g * TAU * 2;
    let bx = 0;
    let by = 0;
    let pitch = 0;
    let nod = 0;
    let headA = 0;
    if (walk) {
      by = -Math.cos(G2) * 1 - 0.3;
      pitch = Math.sin(g * TAU) * 0.015;
      nod = Math.sin(G2 - 0.9) * 0.08;
    } else {
      by = Math.sin(t * 2.2) * 0.5;
      nod = Math.sin(t * 1.1) * 0.04;
    }
    // 翅膀：平常收攏、偶爾抖一抖；走路時跟著步伐顫動
    const rustle = dead ? 0 : Math.pow(Math.max(0, Math.sin(t * 0.55)), 10);
    let wOpen = 0.1 + rustle * 0.55 + Math.sin(t * 1.3) * 0.04;
    let wBeat = Math.sin(t * 1.3) * 0.06 + rustle * Math.sin(t * 16) * 0.12;
    if (walk) {
      wOpen = 0.18;
      wBeat = Math.sin(G2 - 1.2) * 0.08;
    }
    if (wind) {
      // 人立而起：前腳刨空、雙翼大張猛拍
      bx = -3;
      pitch = -0.42;
      headA = -0.3;
      nod = Math.sin(t * 9) * 0.04;
      wOpen = 1;
      wBeat = Math.sin(t * 11) * 0.55;
    } else if (strike) {
      bx = 8;
      pitch = 0.08;
      headA = 0.25;
      nod = 0;
      wOpen = 0.9;
      wBeat = -0.7;
    }
    if (hurt) {
      bx -= 2;
      pitch -= 0.05;
      headA -= 0.2;
      wOpen = Math.max(wOpen, 0.55);
      wBeat = 0.3;
    }
    if (dead) {
      by = 12;
      pitch = 0.05;
      headA = 0.75;
      nod = 0;
      wOpen = 0.55;
      wBeat = -1.1;
    }
    const wBend = -wBeat * 0.35 + (wind ? Math.sin(t * 11 - 1.2) * 0.25 : 0);
    const wAng = lerp(-2.62, -1.9, wOpen) + wBeat * 0.45;
    // 下面那對小翅膀：拍動比上面慢半拍、角度偏後下方
    let wBeat2 = Math.sin(t * 1.3 - 0.9) * 0.08 + rustle * Math.sin(t * 16 - 1) * 0.12;
    if (walk) wBeat2 = Math.sin(G2 - 2.3) * 0.1;
    if (wind) wBeat2 = Math.sin(t * 11 - 1.4) * 0.6;
    else if (strike) wBeat2 = -0.3;
    if (hurt) wBeat2 = 0.45;
    if (dead) wBeat2 = -1.3;
    const wOpen2 = clamp(wOpen * 0.9 + (wind ? 0.1 : 0), 0, 1);
    const wAng2 = lerp(-3.4, -2.75, wOpen2) + wBeat2 * 0.45;
    const wBend2 = -wBeat2 * 0.4;
    const smallWing = (x, y, far) => {
      if (lite) return;
      const r = xf(x, y);
      ctx.save();
      ctx.translate(r[0], r[1]);
      ctx.scale(0.72, 0.72);
      pegWing(ctx, 0, 0, (far ? wAng2 - 0.25 : wAng2) + pitch, wOpen2, wBend2, P, far, t + 0.5, lite || 'lower');
      ctx.restore();
    };
    const PX = -22;
    const PY = -40;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const xf = (x, y) => [PX + (x - PX) * cp - (y - PY) * sp + bx, PY + (x - PX) * sp + (y - PY) * cp + by];
    const bodyXf = () => {
      ctx.translate(bx, by);
      ctx.translate(PX, PY);
      ctx.rotate(pitch);
      ctx.translate(-PX, -PY);
    };
    const CN = { base: P.coat, shade: P.coatS, low: P.coatS, rim: '#ffffff', hoof: P.hoof, hoofS: P.deep, band: P.mane, line: P.deep };
    const CF = { base: P.coatS, shade: P.deep, low: P.deep, rim: P.coat, hoof: P.maneS, hoofS: P.deep, band: P.maneS, line: P.deep };
    const leg = (lx, ly, off, front, far) => {
      const Ls = far ? (front ? PG_LF : PG_LH).map((v) => v * 0.95) : front ? PG_LF : PG_LH;
      const root = xf(lx, ly);
      const x0 = lx + (front ? -1 : 3);
      const gy = far ? -1.2 : 0;
      const uaR = front ? -0.28 : 0.55;
      let o;
      if (dead) {
        o = front ? { ua: 0.2, fa: 1.5, ca: -1.55, pa: -1 } : { ua: 1.2, fa: -1.35, ca: 1.3, pa: 1.7 };
      } else if (walk) {
        const f = gaitFoot(g + off, 0.6, 7, front ? 7 : 5, x0, front);
        o = { ua: uaR + f.sw * (front ? 0.16 : 0.12), gx: f.gx, gy: gy + f.gy, pa: f.pa };
      } else if (wind && front) {
        // 前腳在空中交替刨動
        const w = Math.sin(t * 9 + (far ? 1.8 : 0));
        o = { ua: -0.1 + w * 0.2, fa: 1.25 + w * 0.35, ca: -0.35 + w * 0.5, pa: -0.5 + w * 0.3 };
      } else if (wind) {
        o = { ua: uaR + 0.35, gx: x0 + (far ? 7 : 5), gy, pa: 0.6 };
      } else if (strike) {
        o = front ? { ua: uaR + 0.4, gx: x0 + (far ? 8 : 12), gy, pa: 0.4 } : { ua: uaR - 0.3, gx: x0 - (far ? 5 : 8), gy, pa: 0.05 };
      } else {
        // 休息的站姿：近側後腳放鬆、只用蹄尖點地
        const st = front ? (far ? -2 : 1) : far ? 2 : -1;
        o = !front && !far && !hurt ? { ua: uaR + 0.05, gx: x0 + 4, gy: gy - 1.5, pa: 0.05 } : { ua: uaR, gx: x0 + st, gy, pa: 0.52 };
      }
      const J = legPose(root, Ls, 5, front, o);
      hoofLeg(ctx, J, front ? PG_WF : PG_WH, 5, far ? CF : CN, { far, lw: far ? 1.9 : 2.2, lite });
      // 球節後面垂下的長距毛（蓋住蹄踵，走動時往後飄、慢半拍）
      if (lite) return;
      const F = J.P[3];
      const fl = Math.sin(t * (walk ? 9 : 3) + off * 6) * 1.2 - (walk ? 1.5 : 0);
      const fn = cb(F[0] - 0.5, F[1] - 4, F[0] - 3.5, F[1] - 2, F[0] - 4.5 + fl * 0.5, F[1] + 2, F[0] - 3.5 + fl, F[1] + 5.5);
      gradShape(ctx, (c) => taper(c, fn, (q) => 3.4 * Math.sin(Math.min(1, q * 0.8 + 0.2) * PI) + 0.5, 10), F[0], F[1] - 4, F[0] - 4, F[1] + 7, [[0, far ? P.coatS : P.coat], [1, far ? P.maneS : P.mane]], { lw: 1 });
    };
    ctx.save();
    ctx.translate(hurt ? Math.sin(t * 60) * 1.2 : 0, 0);
    // ── 遠側：翅膀、兩條腿 ──
    {
      const r = xf(6, -50);
      pegWing(ctx, r[0], r[1], wAng - 0.22 + pitch, wOpen, wBend, P, true, t + 0.2, lite);
      smallWing(-2, -46, true);
    }
    leg(-20, -44, 0.5, false, true);
    leg(11, -41, 0.75, true, true);
    ctx.save();
    bodyXf();
    // ── 尾巴：三股金色長鬃，從尾根往上揚再垂下，一節節甩動（越尾端越慢半拍），末端散成星光 ──
    const tails = [];
    for (let k = 2; k >= 0; k--) {
      const pts = [[-35, -47 + k * 1.5]];
      let hd = PI - 0.75 + k * 0.1 + (wind ? 0.35 : 0) + (dead ? 0.5 : 0);
      for (let i = 0; i < 5; i++) {
        hd += 0.36 + Math.sin(t * (walk ? 5 : 2.6) - i * 0.7 - k * 0.45) * (0.05 + i * 0.04);
        const p = pts[i];
        const L = (walk ? 7.4 : 7) - k * 0.5;
        pts.push([p[0] + Math.cos(hd) * L, p[1] - Math.sin(hd) * L]);
      }
      const W = 11 - k * 2;
      tails.push({ fn: spline(pts), W, k, e: pts[5] });
    }
    const tw = (T) => (q) => T.W * Math.sin(Math.min(1, q * 0.8 + 0.22) * PI) * (1 - q * 0.4) + 1.2;
    // 先畫所有外框、再蓋上填色：幾股尾毛融成一整束，只留外輪廓
    tails.forEach((T) => strokeOut(ctx, (c) => taper(c, T.fn, tw(T), 18), 3.2));
    tails.forEach((T) => {
      gradShape(ctx, (c) => taper(c, T.fn, tw(T), 18), -35, -47, T.e[0], T.e[1], [[0, P.mane], [0.5, T.k === 1 ? P.mane2 : P.mane], [1, P.maneS]], { noStroke: true });
      if (lite) return;
      ctx.strokeStyle = rgba(T.k === 1 ? '#ffffff' : P.maneS, 0.6);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let s = 0.15; s < 0.92; s += 0.06) {
        const p = along(T.fn, s, T.W * 0.18 * Math.sin(s * 7 + T.k));
        s < 0.16 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    });
    tails.forEach((T, i) => sparkle(ctx, T.e[0] + Math.sin(t * 3 + i) * 1.5, T.e[1] + 2, 2.4 - i * 0.3, i % 2 ? '#ffffff' : P.glow));
    // ── 身體：馬的胸深、背線、圓臀 ──
    const body = (c) => {
      c.moveTo(20, -50);
      c.bezierCurveTo(30, -47, 31, -34, 22, -29);
      c.bezierCurveTo(12, -25, -6, -27, -16, -28);
      c.bezierCurveTo(-28, -28, -38, -33, -37, -42);
      c.bezierCurveTo(-36, -52, -26, -55, -16, -52);
      c.bezierCurveTo(-4, -49, 8, -54, 20, -50);
      c.closePath();
    };
    A.shape(ctx, body, P.coat, P.coatS, { cel: [2.5, 3], lw: 2.6, hl: false });
    if (!lite) clipDo(ctx, body, () => {
      // 肩胛、肋、臀的肌肉線
      ctx.strokeStyle = rgba(P.coatS, 0.85);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(14, -48);
      ctx.quadraticCurveTo(8, -40, 12, -31);
      ctx.moveTo(-2, -44);
      ctx.quadraticCurveTo(-6, -38, -3, -31);
      ctx.arc(-25, -41, 9, -1.2, 1.3);
      ctx.stroke();
      // 腹下的陰影、背上的光
      const gg = ctx.createLinearGradient(0, -52, 0, -26);
      gg.addColorStop(0, rgba('#ffffff', 0.35));
      gg.addColorStop(0.35, rgba('#ffffff', 0));
      gg.addColorStop(0.75, rgba(P.coatS, 0));
      gg.addColorStop(1, rgba(P.coatS, 0.7));
      ctx.fillStyle = gg;
      ctx.fillRect(-40, -56, 72, 32);
      // 斑點毛色（淡色圓斑，像蘋果斑的駿馬）
      ctx.fillStyle = rgba('#ffffff', 0.45);
      ctx.beginPath();
      [[-4, -44, 3.2], [3, -46, 2.6], [-10, -40, 2.8], [8, -41, 2.2], [-2, -37, 2.4], [-16, -46, 2.2], [11, -47, 1.8]].forEach(([x, y, r]) => {
        ctx.moveTo(x + r, y);
        ctx.ellipse(x, y, r, r * 0.8, 0, 0, TAU);
      });
      ctx.fill();
      // 臀上的星座（金色星點＋細連線，慢慢閃）
      const cs = [[-14, -44], [-8, -48], [0, -45], [-4, -38], [5, -36]];
      glowH(ctx, -4, -43, 14, P.glow, 0.45);
      ctx.strokeStyle = rgba(P.deep, 0.55);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      cs.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      cs.forEach(([x, y], i) => sparkle(ctx, x, y, (i === 1 ? 2.8 : 2) * (0.75 + 0.25 * Math.sin(t * 3 + i * 1.3)), i % 2 ? '#ffffff' : P.tip));
    });
    if (!lite) {
      volume(ctx, body, -4, -42, 30, 0.35, 0.25, P.deep);
      crescent(ctx, body, 1.8, 1.8, '#ffffff', 0.8);
      crescent(ctx, body, -1.5, -1.5, P.glow, 0.6);
    }
    strokeOut(ctx, body, 2.6);
    ctx.restore();
    // ── 近側的腳 ──
    leg(-24, -43, 0, false, false);
    leg(15, -40, 0.25, true, false);
    // ── 脖子與頭 ──
    ctx.save();
    bodyXf();
    ctx.translate(16, -47);
    ctx.rotate(headA * 0.6 + nod);
    const neckF = cb(0, 4, 4, -8, 8, -16, 14, -24);
    const neckW = (q) => 18 - q * 7;
    const neck = (c) => taper(c, neckF, neckW, 14);
    A.shape(ctx, neck, P.coat, P.coatS, { cel: [2, 2], hl: false, noStroke: true });
    clipDo(ctx, neck, () => {
      // 頸下的肌肉溝
      ctx.strokeStyle = rgba(P.coatS, 0.8);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(6, 6);
      ctx.quadraticCurveTo(12, -6, 17, -14);
      ctx.stroke();
    });
    crescent(ctx, neck, 1.4, 1.4, '#ffffff', 0.7);
    strokeOut(ctx, (c) => taper(c, neckF, neckW, 14, true), 2.4);
    // 頭
    ctx.save();
    ctx.translate(14, -26);
    ctx.rotate(0.45 + headA * 0.5 + nod * 0.6);
    const open = wind ? 1 : strike ? 0.5 : 0;
    // 遠側的耳
    const earA = hurt || strike ? -0.7 : Math.sin(t * 1.7) * 0.1 + Math.pow(Math.max(0, Math.sin(t * 0.8 + 1)), 12) * 0.5;
    const ear = (x, y, a, far) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      const ep = (c) => {
        c.moveTo(-2.6, 0);
        c.quadraticCurveTo(-3, -8, 0.5, -11.5);
        c.quadraticCurveTo(3.5, -7, 2.6, 0);
        c.closePath();
      };
      A.shape(ctx, ep, far ? P.coatS : P.coat, far ? P.deep : P.coatS, { cel: [1.2, 0], lw: 1.6, hl: false });
      ctx.fillStyle = rgba(far ? P.deep : P.coatS, 0.7);
      ctx.beginPath();
      ctx.ellipse(0.3, -5, 1, 3.6, 0.1, 0, TAU);
      ctx.fill();
      ctx.restore();
    };
    ear(-3.5, -7, -0.35 + earA * 0.8, true);
    // 下顎（嘶鳴時張開）
    if (open > 0) {
      ctx.save();
      ctx.translate(4, 6);
      ctx.rotate(open * 0.3);
      A.shape(ctx, (c) => {
        c.moveTo(-4, -1);
        c.bezierCurveTo(4, 0, 12, 1, 17, 2);
        c.quadraticCurveTo(17, 5, 13, 5.5);
        c.bezierCurveTo(6, 6, -2, 5, -4, -1);
        c.closePath();
      }, P.coat, P.coatS, { lw: 2, shadeY: 3.5, hl: false });
      ctx.restore();
      A.shape(ctx, (c) => {
        c.moveTo(21, 5);
        c.quadraticCurveTo(14, 8 + open * 4, 6, 6);
        c.lineTo(8, 4);
        c.closePath();
      }, '#7a2a3a', null, { lw: 1.2 });
    }
    const head = (c) => {
      c.moveTo(-6, -6);
      c.bezierCurveTo(-2, -11, 8, -11, 14, -7);
      c.bezierCurveTo(18, -5, 22.5, -1, 22.5, 3);
      c.bezierCurveTo(22.5, 7, 18, 8.5, 14, 7.5);
      c.bezierCurveTo(10, 7, 6, 9, 1, 9);
      c.bezierCurveTo(-5, 9, -8.5, 3, -6, -6);
      c.closePath();
    };
    A.shape(ctx, head, P.coat, P.coatS, { cel: [1.5, 1.5], lw: 2.3, hl: false });
    clipDo(ctx, head, () => {
      // 口鼻的深色、臉頰的圓
      ctx.fillStyle = rgba(P.coatS, 0.65);
      ctx.beginPath();
      ctx.ellipse(19, 4, 5.5, 4.5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(P.coatS, 0.95);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(1, 3, 5, -0.9, 1.9);
      ctx.moveTo(8, -8);
      ctx.quadraticCurveTo(13, -6, 16, -3);
      ctx.stroke();
      // 額上的白星
      sparkle(ctx, 4, -8, 2.2, '#ffffff');
    });
    crescent(ctx, head, 1.3, 1.3, '#ffffff', 0.8);
    strokeOut(ctx, head, 2.3);
    // 鼻孔、嘴
    ctx.strokeStyle = A.c(P.deep);
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20.5, 0.5);
    ctx.quadraticCurveTo(18.5, 0, 18.5, 2.5);
    ctx.stroke();
    if (!open) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(21, 6.5);
      ctx.quadraticCurveTo(18, 7.8, 15, 7);
      ctx.stroke();
    }
    // 眼（長睫毛）
    if (kind === 'normal' || kind === 'angry') {
      gemEye(ctx, 6, -2.5, 2.8, P.eye, P.eyeD, wind || strike ? 'angry' : kind, { glowCol: P.eye, glowA: 0.5, lw: 1.2 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(3.4, -5);
      ctx.lineTo(1.6, -6.6);
      ctx.moveTo(5, -5.6);
      ctx.lineTo(4.2, -7.6);
      ctx.stroke();
    } else A.eye(ctx, 6, -2.5, 2.4, 2.4, kind, 0);
    // 近側的耳
    ear(0, -8, -0.15 + earA, false);
    // 瀏海（從兩耳間往前垂）
    for (let i = 0; i < 2; i++) {
      const fl = Math.sin(t * 3 - i) * 1.2;
      const fn = cb(-1 + i * 2, -9, 3 + i * 2, -12 + fl, 7 + i, -8, 8 + i * 2 + fl, -3 - i * 2);
      gradShape(ctx, (c) => taper(c, fn, (q) => 4.5 * (1 - q) + 0.6, 8), 0, -9, 8, -3, [[0, P.mane], [1, i ? P.mane2 : P.mane]], { lw: 1.2 });
    }
    ctx.restore();
    // 鬃毛：沿著頸背往後飄的長鬃，一綹綹 S 形波浪（越末端越慢半拍）；先畫外框再蓋填色，融成一整片
    const ms = walk ? 6 : wind ? 9 : 3;
    const locks = [];
    for (let i = 0; i < 6; i++) {
      const s0 = 0.02 + i * 0.18;
      const p = along(neckF, s0, -neckW(s0) * 0.4);
      const L = 22 - i * 1.6;
      const w1 = Math.sin(t * ms - i * 0.5 - 0.6) * 3;
      const w2 = Math.sin(t * ms - i * 0.5 - 1.3) * 3.6;
      const w3 = Math.sin(t * ms - i * 0.5 - 2) * 4;
      const fn = cb(p[0] + 2, p[1] - 1, p[0] - L * 0.3, p[1] - 7 + w1, p[0] - L * 0.7, p[1] + 1 + w2, p[0] - L, p[1] + 4 + w3 + (dead ? 6 : 0));
      const wf = (q) => 9.5 * Math.sin(Math.min(1, q + 0.25) * PI * 0.85) * (1 - q * 0.55) + 0.8;
      locks.push({ fn, wf, p, L, i });
    }
    locks.forEach((M) => strokeOut(ctx, (c) => taper(c, M.fn, M.wf, 14), 3.2));
    locks.forEach((M) => {
      gradShape(ctx, (c) => taper(c, M.fn, M.wf, 14), M.p[0], M.p[1], M.p[0] - M.L, M.p[1], [[0, P.mane], [0.55, M.i % 2 ? P.mane2 : P.mane], [1, P.maneS]], { noStroke: true });
      if (lite) return;
      ctx.strokeStyle = rgba(M.i % 2 ? '#ffffff' : P.maneS, 0.55);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let s = 0.1; s < 0.9; s += 0.08) {
        const q = along(M.fn, s, M.wf(s) * 0.12);
        s < 0.11 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
    });
    ctx.restore();
    // ── 近側翅膀 ──
    {
      smallWing(-7, -43, false);
      const r = xf(2, -48);
      pegWing(ctx, r[0], r[1], wAng + pitch, wOpen, wBend, P, false, t, lite);
    }
    ctx.restore();
  }
  function parallelfox(ctx, m) {
    const fx = m.fx || {};
    const t = num(m.t, 0);
    const twin = !!fx.twin;
    const fake = !!fx.fake;
    ctx.save();
    // 整隻放大：身體更有份量
    ctx.scale(1.15, 1.15);
    if (!fake) {
      // 分身中：背後浮著淡淡的、錯開的銀藍重影（另一個世界的自己）
      if (twin) {
        const off = 10 + Math.sin(t * 5) * 3;
        ctx.save();
        ctx.globalAlpha *= 0.3;
        ctx.translate(-off, -off * 0.4);
        pegasusBody(ctx, m, PG_SILV, t - 0.1, true);
        ctx.restore();
      }
      glowH(ctx, 0, -48, 60, PG_GOLD.glow, 0.25);
      pegasusBody(ctx, m, PG_GOLD, t);
    } else {
      // 假身：銀藍色、半透明、紅藍色差殘影、被水平切成幾段錯位（故障感）
      glowH(ctx, 0, -48, 64, '#8ab8ff', 0.35);
      const bands = [[-120, -62], [-62, -44], [-44, -26], [-26, 12]];
      const seed = Math.floor(t * 7);
      // 紅藍色差殘影（淡淡的剪影）＋整隻假身＋兩段錯位的切片
      ctx.save();
      ctx.globalAlpha *= 0.26;
      ctx.translate(-3, 0);
      withTint('#ff5ac8', 0.6, () => pegasusBody(ctx, m, PG_SILV, t, true));
      ctx.translate(6, 0);
      withTint('#3ae0ff', 0.6, () => pegasusBody(ctx, m, PG_SILV, t, true));
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= 0.62;
      pegasusBody(ctx, m, PG_SILV, t);
      [0, 1].forEach((i) => {
        const [y0, y1] = bands[(seed + i * 2) % 4];
        ctx.save();
        ctx.beginPath();
        ctx.rect(-100, y0, 200, y1 - y0);
        ctx.clip();
        ctx.translate((hash(seed * 4 + i) - 0.5) * 12, 0);
        pegasusBody(ctx, m, PG_SILV, t, true);
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
    // 尾鰭：大片、多瓣、像緞帶一樣飄動的鰭（每一瓣各自慢半拍擺動），鰭緣有發光的線紋
    const lobes = [[-0.62, 58, 24], [-0.25, 42, 18], [0.1, 30, 13], [0.42, 44, 18], [0.75, 60, 24]];
    const lobeTip = lobes.map(([a, L], i) => {
      const sw = Math.sin(t * 3.2 - i * 0.7) * 0.12 + Math.sin(t * 1.7 - i) * 0.05;
      const aa = PI + a + sw;
      const cu = Math.sin(t * 3.2 - i * 0.7 - 1) * 6 + (i < 2 ? -5 : i > 2 ? 5 : 0);
      return [aa, L, cu];
    });
    // 每一瓣是一片寬寬的葉形鰭（從尾柄長出、尖端往後彎），幾瓣疊在一起
    const tailLocal = (c, k) => {
      const ox = -35;
      const oy = -40;
      lobeTip.forEach(([aa, L, cu], i) => {
        const Lk = L * k;
        const w = lobes[i][2] * k;
        const ca = Math.cos(aa);
        const sa = Math.sin(aa);
        const Q = (u, v) => tailT(ox + ca * u - sa * v, oy + sa * u + ca * v);
        const p0 = Q(0, -w * 0.3);
        const p1 = Q(Lk * 0.5, -w * 0.75 + cu * 0.3);
        const p2 = Q(Lk, cu);
        const p3 = Q(Lk * 0.7, w * 0.35 + cu * 0.8);
        const p4 = Q(Lk * 0.25, w * 0.1);
        const p5 = Q(0, w * 0.3);
        c.moveTo(p0[0], p0[1]);
        c.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
        c.quadraticCurveTo(p3[0], p3[1], p4[0], p4[1]);
        c.lineTo(p5[0], p5[1]);
        c.closePath();
      });
    };
    const tailP = (c) => tailLocal(c, 1);
    nebula(tailP, 0.6, -56, -40, 46);
    // 鰭緣的發光線紋（內縮一圈的描線＋鰭條）
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(140,230,255,' + (0.4 + link * 0.4).toFixed(3) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    tailLocal(ctx, 0.78);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,190,' + (0.75 + link * 0.25).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,240,255,0.55)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    lobeTip.forEach(([aa, L, cu]) => {
      const a0 = tailT(-36, -40);
      const b = tailT(-36 + Math.cos(aa) * L * 0.72 + Math.sin(aa) * cu * 0.4, -40 + Math.sin(aa) * L * 0.72 - Math.cos(aa) * cu * 0.4);
      ctx.moveTo(a0[0], a0[1]);
      ctx.lineTo(b[0], b[1]);
      sparkle(ctx, b[0], b[1], 1.6, '#fff6c8');
      ctx.moveTo(b[0], b[1]);
    });
    ctx.stroke();
    ctx.restore();
    // 背鰭（高高的帆）、腹鰭
    // 背鰭與腹鰭跟著游動輕輕起伏（鰭尖慢半拍）
    const fr = Math.sin(t * 3 - 0.8) * 2.2;
    nebula((c) => { c.moveTo(-8, -60); c.quadraticCurveTo(-4 - fr * 0.5, -82, 6 - fr, -86); c.quadraticCurveTo(22 - fr * 0.4, -80, 26, -63); c.closePath(); }, 0.7, 8, -70, 24);
    nebula((c) => { c.moveTo(-6, -21); c.quadraticCurveTo(-2 + fr * 0.4, -6, 2 + fr * 0.8, -4); c.quadraticCurveTo(8, -10, 12, -19); c.closePath(); }, 0.7, 2, -14, 16);
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
      if (i < 10 || link > 0.3) glowH(ctx, x, y, s * 3.2, i % 3 ? '#fff0b0' : '#a8e8ff', 0.55 + link * 0.4);
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
