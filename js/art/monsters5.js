// 第四章「霜鈴雪峰」怪物（v1.4：日本妖怪與神獸）、投射物、地面區域與掉落素材圖示。
// 鎌鼬、白澤、雪男、雷獸、影之芬里爾、貘、九尾封印狐、古木樹靈、狛犬——id、體型、fx 旗標、投射物與區域 kind 都不變（規格：docs/SPEC-monsters.md v1.4）。
// 風格：平塗＋深棕描邊，大塊面用 rimShape（右下月牙陰影＋左上邊緣光），加上毛流、發光、配件細節。
// 原點在腳底中央、面向右（+x）；翻轉、縮放、飛行高度由 A.drawMonster 處理。
// 註冊到 A.MONSTER_DRAW／A.PROJ_DRAW／A.ZONE_DRAW／A.ICON。
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
  function num(v, d) {
    return typeof v === 'number' && isFinite(v) ? v : d;
  }
  // 顏色混合（量化，避免 U.mix 的快取無限長大）
  function mixq(a, b, k) {
    return U.mix(a, b, Math.round(clamp(k, 0, 1) * 20) / 20);
  }
  function poly(c, pts) {
    pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath();
  }
  function starPath(c, x, y, R, r, n, rot) {
    for (let i = 0; i <= n * 2; i++) {
      const a = rot + (i / (n * 2)) * TAU;
      const rr = i % 2 ? r : R;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
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
  function speedLines(ctx, x, y, h, n, len, t, col) {
    ctx.save();
    ctx.strokeStyle = col || 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const q = (t * 3 + i * 0.37) % 1;
      const yy = y - h / 2 + (h * (i + 0.5)) / n;
      const xx = x - q * 14;
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx - len * (0.6 + (0.4 * ((i * 7) % 3)) / 2), yy);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 雪花（六芒）
  function snowflake(ctx, x, y, s, col, lw) {
    ctx.save();
    ctx.strokeStyle = A.c(col || '#ffffff');
    ctx.lineWidth = lw || 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const co = Math.cos(a);
      const si = Math.sin(a);
      ctx.moveTo(x, y);
      ctx.lineTo(x + co * s, y + si * s);
      const bx = x + co * s * 0.55;
      const by = y + si * s * 0.55;
      const a1 = a + 0.7;
      const a2 = a - 0.7;
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a1) * s * 0.3, by + Math.sin(a1) * s * 0.3);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a2) * s * 0.3, by + Math.sin(a2) * s * 0.3);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 簡單的符文筆畫（i 決定字形）
  const RUNES = [
    [[[0, -1], [0, 1]], [[0, -0.1], [-0.6, -0.8]], [[0, -0.1], [0.6, -0.8]]],
    [[[-0.3, -1], [-0.3, 1]], [[-0.3, -0.7], [0.5, -0.2]], [[-0.3, -0.1], [0.5, 0.4]]],
    [[[0, -1], [0.6, 0], [0, 1], [-0.6, 0], [0, -1]]],
    [[[0, -1], [0, 1]], [[-0.6, -0.4], [0, -1], [0.6, -0.4]]],
    [[[0.5, -1], [-0.5, -0.3], [0.5, 0.3], [-0.5, 1]]],
    [[[-0.5, -1], [-0.5, 1]], [[0.5, -1], [0.5, 1]], [[-0.5, -0.5], [0.5, 0.3]]],
  ];
  function runePath(ctx, x, y, s, i) {
    const R = RUNES[((i % RUNES.length) + RUNES.length) % RUNES.length];
    R.forEach((seg) => seg.forEach((p, j) => (j ? ctx.lineTo(x + p[0] * s, y + p[1] * s) : ctx.moveTo(x + p[0] * s, y + p[1] * s))));
  }
  function rune(ctx, x, y, s, col, i, lw, glowRgb, glowA) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (glowRgb && glowA > 0) {
      ctx.strokeStyle = 'rgba(' + glowRgb + ',' + (0.35 * glowA).toFixed(3) + ')';
      ctx.lineWidth = (lw || 1.6) + 4;
      ctx.beginPath();
      runePath(ctx, x, y, s, i);
      ctx.stroke();
    }
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = lw || 1.6;
    ctx.beginPath();
    runePath(ctx, x, y, s, i);
    ctx.stroke();
    ctx.restore();
  }
  // 符紙（直條的紙，紅框＋紅色咒文）
  function talisman(ctx, x, y, w, h, rot, paper, ink, glowRgb, glowA, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    if (glowRgb && glowA > 0) glow(ctx, 0, 0, h * 1.1, glowRgb, glowA);
    A.shape(ctx, (c) => c.rect(-w / 2, -h / 2, w, h), paper || '#fff1b8', null, { lw: 1.6 });
    ctx.strokeStyle = A.c(ink || '#d8364a');
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-w / 2 + 1.6, -h / 2 + 1.6, w - 3.2, h - 3.2);
    ctx.lineWidth = Math.max(1, w * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const s = (seed || 0) % 3;
    ctx.moveTo(0, -h / 2 + 3.5);
    ctx.lineTo(0, h / 2 - 3.5);
    ctx.moveTo(-w * 0.22, -h * 0.22);
    ctx.lineTo(w * 0.22, -h * 0.22);
    if (s === 0) {
      ctx.moveTo(-w * 0.22, h * 0.05);
      ctx.lineTo(w * 0.22, h * 0.05);
    } else if (s === 1) {
      ctx.moveTo(-w * 0.2, h * 0.02);
      ctx.lineTo(0, h * 0.12);
      ctx.lineTo(w * 0.2, h * 0.02);
    } else {
      ctx.moveTo(w * 0.18, h * 0.08);
      ctx.arc(0, h * 0.08, w * 0.18, 0, TAU);
    }
    ctx.stroke();
    ctx.restore();
  }
  // Z 字（睡意符文）
  function zGlyph(ctx, x, y, s, col) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const p = () => {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.5, y - s * 0.5);
      ctx.lineTo(x + s * 0.5, y - s * 0.5);
      ctx.lineTo(x - s * 0.5, y + s * 0.5);
      ctx.lineTo(x + s * 0.5, y + s * 0.5);
    };
    p();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = Math.max(2.6, s * 0.34);
    ctx.stroke();
    p();
    ctx.strokeStyle = A.c(col || '#e8dcff');
    ctx.lineWidth = Math.max(1.2, s * 0.34 - 2.2);
    ctx.stroke();
    ctx.restore();
  }
  // 彎月
  function crescent(ctx, x, y, r, col, lw) {
    A.shape(ctx, (c) => {
      c.arc(x, y, r, -PI * 0.62, PI * 0.62, false);
      c.arc(x - r * 0.45, y, r * 0.78, PI * 0.5, -PI * 0.5, true);
      c.closePath();
    }, col || '#ffe38a', null, { lw: lw || 1.6 });
  }
  // 雲朵形（一堆圓的聯集，外框乾淨、內部不描邊）
  function cloudPath(c, cs, dx, dy) {
    cs.forEach((q) => {
      c.moveTo(q[0] + dx + q[2], q[1] + dy);
      c.arc(q[0] + dx, q[1] + dy, q[2], 0, TAU);
    });
  }
  function cloud(ctx, cs, fill, shade, lw, cel) {
    lw = lw || A.LW;
    ctx.beginPath();
    cloudPath(ctx, cs, 0, 0);
    ctx.lineWidth = lw * 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    ctx.beginPath();
    cloudPath(ctx, cs, 0, 0);
    ctx.fillStyle = A.c(fill);
    ctx.fill();
    if (shade) {
      const k = cel || 4;
      ctx.save();
      ctx.beginPath();
      cloudPath(ctx, cs, 0, 0);
      ctx.clip();
      ctx.fillStyle = A.c(shade);
      ctx.fillRect(-500, -500, 1000, 1000);
      ctx.beginPath();
      cloudPath(ctx, cs, -k, -k);
      ctx.fillStyle = A.c(fill);
      ctx.fill();
      ctx.restore();
    }
  }
  // 暫時用染色模式畫（殘影、分身）
  function withTint(col, amt, fn) {
    const pm = A.mode;
    const pa = A.modeAmt;
    const pc = A.modeColor;
    A.mode = 'tint';
    A.modeColor = col;
    A.modeAmt = amt;
    try {
      fn();
    } finally {
      A.mode = pm;
      A.modeAmt = pa;
      A.modeColor = pc;
    }
  }
  // 半透明的分身：先畫到暫存畫布再整張淡淡貼上，重疊的描邊才不會一格一格透出來
  let scratch = null;
  // key 有給的話，同一個姿勢的分身圖只畫一次，之後直接貼（分身很淡，細部動畫看不出來）
  const ghostCache = new Map();
  function ghostDraw(ctx, box, alpha, fn, key) {
    if (!(alpha > 0)) return;
    if (key && typeof document !== 'undefined' && ctx.getTransform) {
      const tr0 = ctx.getTransform();
      const kq = Math.min(4, Math.max(1, Math.round(Math.hypot(tr0.a, tr0.b) * 2) / 2));
      const ck = key + '|' + kq;
      let cv = ghostCache.get(ck);
      if (!cv) {
        if (ghostCache.size > 96) ghostCache.clear();
        cv = document.createElement('canvas');
        cv.width = Math.ceil(box[2] * kq);
        cv.height = Math.ceil(box[3] * kq);
        const g = cv.getContext('2d');
        g.setTransform(kq, 0, 0, kq, -box[0] * kq, -box[1] * kq);
        g.save();
        fn(g);
        g.restore();
        ghostCache.set(ck, cv);
      }
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.drawImage(cv, box[0], box[1], box[2], box[3]);
      ctx.restore();
      return;
    }
    if (typeof document === 'undefined' || !ctx.getTransform) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      fn(ctx);
      ctx.restore();
      return;
    }
    const tr = ctx.getTransform();
    const k = Math.min(4, Math.max(1, Math.hypot(tr.a, tr.b)));
    const W = Math.ceil(box[2] * k);
    const H = Math.ceil(box[3] * k);
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width < W) scratch.width = W;
    if (scratch.height < H) scratch.height = H;
    const g = scratch.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.clearRect(0, 0, scratch.width, scratch.height);
    g.setTransform(k, 0, 0, k, -box[0] * k, -box[1] * k);
    g.save();
    fn(g);
    g.restore();
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(scratch, 0, 0, W, H, box[0], box[1], box[2], box[3]);
    ctx.restore();
  }
  // 只描一段弧線的外框（接在別的形狀上時用）
  function arcStroke(ctx, x, y, rx, ry, a0, a1, lw) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, a0, a1);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = lw || A.LW;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  function blushes(ctx, x, y, gap, r) {
    A.blush(ctx, x, y, r);
    A.blush(ctx, x + gap, y, r * 0.9);
  }
  function fang(ctx, x, y, s, up) {
    A.shape(ctx, (c) => poly(c, up ? [[x - s * 0.5, y], [x, y - s], [x + s * 0.5, y]] : [[x - s * 0.5, y], [x, y + s], [x + s * 0.5, y]]), '#ffffff', null, { lw: 1.2 });
  }
  function hoof(ctx, x, y, w, h, col) {
    A.shape(ctx, (c) => A.roundRect(c, x - w / 2, y - h, w, h, 2), col || '#4a4658', null, { lw: 2 });
  }
  function snowDust(ctx, x, y, t, k, dir) {
    dir = dir || -1;
    for (let i = 0; i < 3; i++) {
      const q = (t * 2.4 + i / 3) % 1;
      puff(ctx, x + dir * q * 16 * k, y - 3 - q * 8, (3 + q * 4) * k, '#ffffff', (1 - q) * 0.85);
    }
  }
  // ───────────── 第四章的奇幻小工具 ─────────────
  // 發光的眼睛：彩色虹膜＋光暈＋瞳孔＋亮點；閉眼、受傷、死亡照舊用 A.eye
  function glowEye(ctx, x, y, rx, ry, kind, iris, rgb, o) {
    o = o || {};
    if (kind !== 'normal' && kind !== 'angry') {
      A.eye(ctx, x, y, rx, ry, kind);
      return;
    }
    if (!o.noGlow && rgb) glow(ctx, x, y, Math.max(rx, ry) * 2.7, rgb, o.ga != null ? o.ga : 0.6);
    A.shape(ctx, (c) => c.ellipse(x, y, rx, ry, 0, 0, TAU), iris, null, { lw: o.lw || 1.5 });
    ctx.fillStyle = A.c(o.pupil || '#1a1030');
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.12, y + ry * 0.08, rx * (o.slit ? 0.24 : 0.46), ry * (o.slit ? 0.78 : 0.62), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.32, y - ry * 0.38, rx * 0.34, ry * 0.25, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + rx * 0.38, y + ry * 0.4, rx * 0.15, 0, TAU);
    ctx.fill();
    if (kind === 'angry') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.3, y - ry * 1.45);
      ctx.lineTo(x + rx * 1.1, y - ry * 0.9);
      ctx.stroke();
    }
  }
  function glowEyes(ctx, x, y, gap, rx, ry, m, iris, rgb, kind, o) {
    kind = kind || eyeKind(m);
    glowEye(ctx, x, y, rx, ry, kind, iris, rgb, o);
    glowEye(ctx, x + gap, y - 0.5, rx * 0.92, ry * 0.95, kind, iris, rgb, o);
  }
  // 火焰（淚滴形，尖端往上，sway 讓尖端擺動）
  function flamePath(c, x, y, w, h, sway) {
    const tx = x + sway;
    const ty = y - h;
    c.moveTo(tx, ty);
    c.quadraticCurveTo(x - w * 1.15, y - h * 0.42, x - w, y - w);
    c.arc(x, y - w, w, PI, 0, true);
    c.quadraticCurveTo(x + w * 1.15, y - h * 0.42, tx, ty);
    c.closePath();
  }
  // 靈焰：外焰＋內焰，不描邊、帶光暈
  function spiritFlame(ctx, x, y, w, h, sway, outer, inner, rgb, a) {
    a = a == null ? 1 : a;
    if (!(a > 0) || !(h > 0)) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    if (rgb) glow(ctx, x, y - h * 0.4, h * 0.95, rgb, 0.45);
    ctx.fillStyle = A.c(outer);
    ctx.beginPath();
    flamePath(ctx, x, y, w, h, sway);
    ctx.fill();
    ctx.fillStyle = A.c(inner);
    ctx.beginPath();
    flamePath(ctx, x + sway * 0.08, y - w * 0.2, w * 0.52, h * 0.58, sway * 0.55);
    ctx.fill();
    ctx.restore();
  }
  // 先畫形狀本體（不描邊），在形狀裡面畫花紋，最後才描外框
  function withClip(ctx, path, fill, shade, opts, inner, lw) {
    A.shape(ctx, path, fill, shade, Object.assign({}, opts || {}, { noStroke: true }));
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    inner();
    ctx.restore();
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = lw || (opts && opts.lw) || A.LW;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  // 放射狀的光芒
  function rays(ctx, x, y, n, r0, r1, w, rot, rgba) {
    ctx.fillStyle = rgba;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ctx.moveTo(x + ca * r0 - sa * w, y + sa * r0 + ca * w);
      ctx.lineTo(x + ca * r1, y + sa * r1);
      ctx.lineTo(x + ca * r0 + sa * w, y + sa * r0 - ca * w);
      ctx.closePath();
    }
    ctx.fill();
  }
  // 發光的筆畫：先畫一層寬的光暈，再畫實線
  function glowStroke(ctx, pathFn, col, lw, rgb, a) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (rgb && a > 0) {
      ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.35 * Math.min(1, a)).toFixed(3) + ')';
      ctx.lineWidth = lw + 4;
      ctx.beginPath();
      pathFn(ctx);
      ctx.stroke();
    }
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = lw;
    ctx.beginPath();
    pathFn(ctx);
    ctx.stroke();
    ctx.restore();
  }

  // ───────────── v1.4 神話生物用的精緻小工具（邊緣光、漸細形、毛流、閃電、巴紋、注連繩） ─────────────
  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  // 發光（顏色經過 A.c()，閃白／染色時才一致）
  function glowH(ctx, x, y, r, hex, a) {
    if (!(a > 0) || !(r > 0)) return;
    const rgb = U.hexToRgb(A.c(hex)).join(',');
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  // 右下月牙陰影＋左上邊緣光＋（可選）內部光源，最後描邊。o: { cel, rim, lw, noStroke, under:[x,y,r,hex,a], inner:fn }
  function rimShape(ctx, path, fill, shade, rim, o) {
    o = o || {};
    const c = o.cel != null ? o.cel : 4;
    const r = o.rim != null ? o.rim : 2;
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(shade || fill);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.translate(-c, -c);
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(fill);
    ctx.fill();
    ctx.translate(c, c);
    if (o.under) glowH(ctx, o.under[0], o.under[1], o.under[2], o.under[3], o.under[4]);
    if (o.inner) o.inner();
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
    ctx.lineWidth = o.lw || 2.6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
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
  // 沿中心線 fn(s) 的漸細形狀（尾巴、角、刀刃、鬃毛束）；wf(s) 是寬度
  function taper(c, fn, wf, n) {
    n = n || 16;
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
    c.closePath();
  }
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
  // 毛流：一組短弧線（x, y, 角度, 長度），畫在形狀裡增加毛的質感
  function strands(ctx, list, col, lw, bend) {
    ctx.save();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = lw || 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    list.forEach((s) => {
      const ca = Math.cos(s[2]);
      const sa = Math.sin(s[2]);
      const b = (bend == null ? 0.25 : bend) * s[3];
      ctx.moveTo(s[0], s[1]);
      ctx.quadraticCurveTo(s[0] + ca * s[3] * 0.5 - sa * b, s[1] + sa * s[3] * 0.5 + ca * b, s[0] + ca * s[3], s[1] + sa * s[3]);
    });
    ctx.stroke();
    ctx.restore();
  }
  // 在一個橢圓範圍裡撒固定位置的毛流
  function furField(ctx, x, y, rx, ry, n, ang, len, col, lw, seed) {
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = hash(seed + i * 1.37) * TAU;
      const d = Math.sqrt(hash(seed + i * 2.71));
      list.push([x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, ang + (hash(seed + i * 5.3) - 0.5) * 0.5, len * (0.7 + hash(seed + i * 3.1) * 0.6)]);
    }
    strands(ctx, list, col, lw);
  }
  // 閃電（固定種子，每 0.08 秒換一次形）：外光＋白芯
  function bolt(ctx, x1, y1, x2, y2, seed, jag, col, w, a) {
    a = a == null ? 1 : a;
    if (!(a > 0)) return;
    const n = 6;
    const pts = [[x1, y1]];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const L = Math.hypot(dx, dy) || 1;
    for (let i = 1; i < n; i++) {
      const k = i / n;
      const off = (hash(seed + i * 7.1) - 0.5) * 2 * jag;
      pts.push([x1 + dx * k - (dy / L) * off, y1 + dy * k + (dx / L) * off]);
    }
    pts.push([x2, y2]);
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const p = () => {
      ctx.beginPath();
      pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    };
    p();
    ctx.strokeStyle = A.c(col);
    ctx.globalAlpha *= 0.35;
    ctx.lineWidth = w * 3.2;
    ctx.stroke();
    ctx.globalAlpha /= 0.35;
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = Math.max(0.8, w * 0.4);
    ctx.stroke();
    ctx.restore();
  }
  // 三巴紋（雷神太鼓、狛犬的神紋）
  function tomoe(ctx, x, y, r, rot, col, n) {
    n = n || 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.fillStyle = A.c(col);
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate((i / n) * TAU);
      ctx.beginPath();
      ctx.arc(r * 0.42, 0, r * 0.3, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.72, 0);
      ctx.quadraticCurveTo(r * 0.78, r * 0.62, r * 0.05, r * 0.9);
      ctx.quadraticCurveTo(r * 0.55, r * 0.45, r * 0.12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // 注連繩的一段（麻繩的斜紋）
  function ropeStroke(ctx, pathFn, w, col, dark) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pathFn(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + 2.6;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.setLineDash([w * 0.45, w * 0.55]);
    ctx.strokeStyle = A.c(dark);
    ctx.lineWidth = w * 0.7;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // 紙垂（白色的之字形紙條）
  function shide(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => poly(c, [[-s * 0.3, 0], [s * 0.3, 0], [s * 0.3, s * 0.9], [s * 0.75, s * 0.9], [s * 0.75, s * 1.8], [s * 0.15, s * 1.8], [s * 0.15, s * 2.7], [s * 0.6, s * 2.7], [s * 0.6, s * 3.5], [-s * 0.05, s * 3.5], [-s * 0.05, s * 2.35], [-s * 0.45, s * 2.35], [-s * 0.45, s * 1.35], [-s * 0.05, s * 1.35], [-s * 0.05, s * 0.55], [-s * 0.3, s * 0.55]]), '#fffdf4', '#d6d4e6', { lw: 1.2, shadeY: s * 1.9 });
    ctx.restore();
  }
  // 雲紋渦卷（祥雲、狛犬的捲鬃）
  function curl(ctx, x, y, r, dir, col, lw) {
    ctx.save();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = lw || 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const k = i / 18;
      const a = dir * k * TAU * 1.05 + PI;
      const rr = r * (1 - k * 0.75);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 祥雲（飛行神獸腳下的雲）
  function auspiciousCloud(ctx, x, y, s, t, fill, shade) {
    const cs = [[x - s * 1.1, y, s * 0.55], [x - s * 0.4, y - s * 0.35, s * 0.7], [x + s * 0.45, y - s * 0.2, s * 0.62], [x + s * 1.1, y + s * 0.05, s * 0.48]];
    cloud(ctx, cs, fill, shade, 1.6, s * 0.18);
    curl(ctx, x - s * 0.4, y - s * 0.3, s * 0.38, 1, shade, 1.2);
    curl(ctx, x + s * 0.5, y - s * 0.15, s * 0.3, -1, shade, 1.2);
  }

  // ───────────── v2「雪社」美術語言 ─────────────
  // 色票只用五種：雪白、靛藍、朱、金、淡青（加上它們的陰影與亮面）。描邊改用靛墨色（浮世繪的墨線），
  // 花紋來自神社雕刻與浮世繪：青海波、雲紋渦卷、金色的飾金具、注連繩與紙垂、細細的毛筆毛流。
  const INK = '#2a2848';
  const P4 = {
    snow: '#fbf8f0', snowS: '#c9cde6', snowD: '#99a1cc', snowH: '#ffffff',
    ind: '#34407e', indS: '#1f2656', indD: '#151a3c', indL: '#5d6cb6',
    verm: '#d8432f', vermS: '#982b22', vermL: '#f5865f',
    gold: '#e8b84c', goldS: '#a6742a', goldL: '#fde9a8',
    teal: '#8fd9cf', tealS: '#4f9f9d', tealL: '#d8f7f1', tealD: '#2f6e70',
    pink: '#f0b2b8', mouth: '#6a1e36',
  };
  // 這一章的怪物都用靛墨色描邊（閃白、金色、染色模式照舊由 A.outline() 處理）
  function inked(fn) {
    return function (ctx, m) {
      const o = A.OUT;
      A.OUT = INK;
      try {
        fn(ctx, m);
      } finally {
        A.OUT = o;
      }
    };
  }
  // 兩節骨的 IK：從 a 到 b，長度 l1、l2，bend=+1 關節往前（+x）彎、-1 往後彎
  function ik(ax, ay, bx, by, l1, l2, bend) {
    const dx = bx - ax;
    const dy = by - ay;
    const d = Math.max(0.01, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.05));
    const a = Math.atan2(dy, dx);
    const c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const k = a - bend * Math.acos(c);
    return [ax + Math.cos(k) * l1, ay + Math.sin(k) * l1];
  }
  function lerp2(p, q, k) {
    return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  }
  // 一串關節點 → 平滑的中心線 fn(s)（關節處用二次曲線圓角，s 大約等於弧長比例）
  function chain(pts, r) {
    r = r == null ? 0.42 : r;
    const pieces = [];
    let prev = pts[0];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = lerp2(pts[i], pts[i - 1], r * (i === 1 ? 0.9 : 0.5));
      const b = lerp2(pts[i], pts[i + 1], r * (i === pts.length - 2 ? 0.9 : 0.5));
      pieces.push([0, prev, a]);
      pieces.push([1, a, pts[i], b]);
      prev = b;
    }
    pieces.push([0, prev, pts[pts.length - 1]]);
    const lens = pieces.map((p) => (p[0] ? Math.hypot(p[2][0] - p[1][0], p[2][1] - p[1][1]) + Math.hypot(p[3][0] - p[2][0], p[3][1] - p[2][1]) : Math.hypot(p[2][0] - p[1][0], p[2][1] - p[1][1])) + 0.001);
    const tot = lens.reduce((a, b) => a + b, 0);
    const cum = [];
    let acc = 0;
    lens.forEach((l) => {
      cum.push(acc / tot);
      acc += l;
    });
    return (s) => {
      let i = pieces.length - 1;
      while (i > 0 && cum[i] > s) i--;
      const u = clamp((s - cum[i]) / (lens[i] / tot), 0, 1);
      const p = pieces[i];
      if (!p[0]) return [p[1][0] + (p[2][0] - p[1][0]) * u, p[1][1] + (p[2][1] - p[1][1]) * u];
      const v = 1 - u;
      return [v * v * p[1][0] + 2 * v * u * p[2][0] + u * u * p[3][0], v * v * p[1][1] + 2 * v * u * p[2][1] + u * u * p[3][1]];
    };
  }
  // 關節處的寬度（依關節之間的長度比例內插）
  function jointWidths(pts, ws) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const T = L[L.length - 1] || 1;
    return (s) => {
      const d = s * T;
      let i = 1;
      while (i < L.length - 1 && L[i] < d) i++;
      const u = clamp((d - L[i - 1]) / (L[i] - L[i - 1] || 1), 0, 1);
      const e = u * u * (3 - 2 * u);
      return ws[i - 1] + (ws[i] - ws[i - 1]) * e;
    };
  }
  // 一條關節肢：肌肉飽滿的上段、細的下段；far=遠側（較暗、不打邊緣光）
  function limb2(ctx, pts, ws, fill, shade, rim, o) {
    o = o || {};
    const fn = chain(pts, o.round);
    const wf = jointWidths(pts, ws);
    const P = (c) => taper(c, fn, wf, o.n || 14);
    rimShape(ctx, P, fill, shade, rim, { cel: o.cel != null ? o.cel : 2.2, rim: 1.2, lw: o.lw || 2.2, inner: o.inner ? () => o.inner(fn, wf) : null });
    return fn;
  }
  // 步態：u 在 0..TAU；前半是著地往後推、後半是抬腳往前擺
  function gaitFoot(u, stride, lift) {
    u = ((u % TAU) + TAU) % TAU;
    const x = stride * Math.cos(u);
    const y = u > PI ? Math.sin(u) * lift : 0;
    return [x, y, u > PI ? -Math.sin(u) : 0];
  }
  // 腳掌（腳底在 y，腳尖朝 +x；curl 0..1 抬腳時腳掌往後彎）
  function pawFoot(ctx, x, y, w, h, fill, shade, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    const P = (c) => {
      c.moveTo(-w * 0.55, 0);
      c.quadraticCurveTo(-w * 0.62, -h * 0.95, -w * 0.05, -h);
      c.quadraticCurveTo(w * 0.42, -h * 1.02, w * 0.52, -h * 0.55);
      c.quadraticCurveTo(w * 0.72, -h * 0.35, w * 0.62, -h * 0.02);
      c.quadraticCurveTo(w * 0.62, h * 0.08, w * 0.4, h * 0.06);
      c.lineTo(-w * 0.5, h * 0.06);
      c.closePath();
    };
    A.shape(ctx, P, fill, shade, { lw: o.lw || 2, cel: [1.4, 1.4] });
    // 趾縫
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h * 0.02);
    ctx.lineTo(w * 0.08, -h * 0.38);
    ctx.moveTo(w * 0.36, 0);
    ctx.lineTo(w * 0.32, -h * 0.32);
    ctx.stroke();
    if (o.claw) {
      ctx.fillStyle = A.c(o.claw);
      ctx.beginPath();
      [0.26, 0.5, 0.7].forEach((k) => {
        const cx = w * k;
        ctx.moveTo(cx - 1, h * 0.02);
        ctx.lineTo(cx + 2.4, h * 0.14);
        ctx.lineTo(cx + 0.2, -h * 0.26);
      });
      ctx.fill();
    }
    ctx.restore();
  }
  // 杏仁眼（浮世繪式：上眼線粗而有尾勾）。kind：normal/angry 用自己的畫法，其他照舊
  function almondEye(ctx, x, y, w, h, iris, kind, o) {
    o = o || {};
    if (kind === 'x' || kind === 'hurt') {
      A.eye(ctx, x, y, w * 0.6, h * 0.8, kind);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (kind === 'closed') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = o.lw || 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w, -h * 0.1);
      ctx.quadraticCurveTo(0, h * 0.75, w * 1.05, -h * 0.25);
      ctx.lineTo(w * 1.35, -h * 0.55);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (o.glow) glowH(ctx, 0, 0, w * 2.6, o.glow, o.ga != null ? o.ga : 0.35);
    const up = kind === 'angry' ? 0.55 : 1;
    const P = (c) => {
      c.moveTo(-w, h * 0.15);
      c.quadraticCurveTo(-w * 0.2, -h * 1.25 * up, w, -h * 0.35);
      c.quadraticCurveTo(w * 0.2, h * 1.05, -w, h * 0.15);
      c.closePath();
    };
    ctx.beginPath();
    P(ctx);
    ctx.fillStyle = A.c(o.white || '#fffdf6');
    ctx.fill();
    ctx.save();
    ctx.clip();
    const ir = h * (o.irisK || 0.95);
    ctx.fillStyle = A.c(iris);
    ctx.beginPath();
    ctx.arc(w * 0.12, 0, ir, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c(o.irisL || '#ffffff');
    ctx.globalAlpha *= 0.45;
    ctx.beginPath();
    ctx.arc(w * 0.12, ir * 0.35, ir * 0.62, 0, PI);
    ctx.fill();
    ctx.globalAlpha /= 0.45;
    ctx.fillStyle = A.c(o.pupil || '#161030');
    ctx.beginPath();
    if (o.slit) ctx.ellipse(w * 0.14, 0, ir * 0.22, ir * 0.85, 0, 0, TAU);
    else ctx.arc(w * 0.14, 0, ir * 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-w * 0.12, -ir * 0.38, ir * 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 上眼線（粗、帶尾勾）＋下眼線（細）
    ctx.strokeStyle = A.outline();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = o.lw || 1.9;
    ctx.beginPath();
    ctx.moveTo(-w * 1.08, h * 0.25);
    ctx.quadraticCurveTo(-w * 0.2, -h * 1.3 * up, w * 1.02, -h * 0.38);
    ctx.lineTo(w * 1.4, -h * (kind === 'angry' ? 0.5 : 0.8));
    ctx.stroke();
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-w * 0.7, h * 0.5);
    ctx.quadraticCurveTo(w * 0.2, h * 1.02, w * 0.95, -h * 0.25);
    ctx.stroke();
    if (o.liner) {
      // 朱色的眼尾隈取
      ctx.strokeStyle = A.c(o.liner);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(w * 0.9, -h * 0.75);
      ctx.quadraticCurveTo(w * 1.7, -h * 1.4, w * 2.5, -h * 2.3);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 浮世繪的毛筆毛流：沿著曲線 fn 的一側，一叢一叢細線
  function brushHair(ctx, fn, s0, s1, n, off, len, ang, col, lw, seed) {
    const list = [];
    for (let i = 0; i < n; i++) {
      const s = s0 + ((s1 - s0) * (i + 0.5)) / n;
      const q = along(fn, s, off * (0.7 + hash(seed + i) * 0.5));
      list.push([q[0], q[1], q[2] + ang + (hash(seed + i * 3.3) - 0.5) * 0.3, len * (0.75 + hash(seed + i * 1.7) * 0.5)]);
    }
    strands(ctx, list, col, lw || 1, 0.18);
  }
  // 青海波（在目前的 clip 範圍內鋪一片）
  function seigaiha(ctx, x0, y0, w, h, r, fill, line, lw) {
    ctx.save();
    ctx.lineWidth = lw || 0.9;
    ctx.strokeStyle = A.c(line);
    ctx.fillStyle = A.c(fill);
    const rows = Math.ceil(h / (r * 0.5)) + 1;
    const cols = Math.ceil(w / (r * 2)) + 1;
    for (let j = 0; j < rows; j++) {
      const yy = y0 + j * r * 0.5;
      for (let i = 0; i < cols; i++) {
        const xx = x0 + i * r * 2 + (j % 2 ? r : 0);
        ctx.beginPath();
        ctx.arc(xx, yy, r, PI, TAU);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(xx, yy, r * 0.94, PI, TAU);
        ctx.moveTo(xx + r * 0.64, yy);
        ctx.arc(xx, yy, r * 0.64, 0, PI, true);
        ctx.moveTo(xx + r * 0.34, yy);
        ctx.arc(xx, yy, r * 0.34, 0, PI, true);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 金色的飾金具（圓鋲、菊座）
  function goldStud(ctx, x, y, r) {
    A.shape(ctx, (c) => c.arc(x, y, r, 0, TAU), P4.gold, P4.goldS, { lw: 1, cel: [r * 0.35, r * 0.35] });
    ctx.fillStyle = A.c(P4.goldL);
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, TAU);
    ctx.fill();
  }
  // 肌肉塊（大腿／肩）＋關節腳合成一塊：先描全部外框再上色，接縫沒有線
  function legMass(ctx, mass, pts, ws, fill, shade, rim, o) {
    o = o || {};
    const fn = chain(pts, o.round == null ? 0.8 : o.round);
    const wf = jointWidths(pts, ws);
    const legP = (c) => taper(c, fn, wf, o.n || 14);
    const massP = (c) => c.ellipse(mass[0], mass[1], mass[2], mass[3], mass[4] || 0, 0, TAU);
    const lw = o.lw || 2.1;
    ctx.lineJoin = 'round';
    [legP, massP].forEach((p) => {
      ctx.beginPath();
      p(ctx);
      ctx.lineWidth = lw * 2;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
    });
    // 先塗腳、再塗肌肉塊（蓋住腳的上端與接縫）
    rimShape(ctx, legP, fill, shade, rim, { cel: o.cel || 2.2, rim: 1.2, noStroke: true });
    rimShape(ctx, massP, fill, shade, rim, { cel: o.cel || 2.2, rim: 1.2, noStroke: true, inner: o.inner || null });
    return fn;
  }
  // 浮世繪的霞雲：平底、上緣一串圓弧，內側一道細描線，底部淡靛陰影
  function kasumi(ctx, x, y, w, h, fill, shade, line, seed) {
    const n = 4;
    const cs = [];
    for (let i = 0; i < n; i++) {
      const r = (w / n) * (1.08 + 0.22 * Math.sin(i * 2.3 + (seed || 0)));
      cs.push([x - w + (2 * w * (i + 0.5)) / n, y - h * 0.3 - (i === 1 || i === 2 ? h * 0.25 : 0), r]);
    }
    const P = (c) => {
      c.moveTo(x - w - h * 0.2, y);
      cs.forEach((q) => c.arc(q[0], q[1], q[2], PI * 0.95, TAU * 0.99));
      c.lineTo(x + w + h * 0.2, y);
      c.closePath();
    };
    A.shape(ctx, P, fill, shade, { lw: 1.8, shadeY: y - h * 0.22 });
    ctx.strokeStyle = A.c(line);
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    cs.forEach((q, i) => {
      if (i % 2) return;
      ctx.moveTo(q[0] - q[2] * 0.55, q[1] + 1);
      ctx.arc(q[0], q[1] + 1, q[2] * 0.55, PI, TAU * 0.97);
    });
    ctx.moveTo(x - w * 0.7, y - h * 0.12);
    ctx.lineTo(x + w * 0.5, y - h * 0.12);
    ctx.stroke();
  }
  // 整隻放大畫、但描邊維持原本的粗細（和 variants.js 的補償同一招：暫時改寫 ctx.lineWidth）
  const LWD4 = typeof CanvasRenderingContext2D !== 'undefined' ? Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'lineWidth') : null;
  function scaledLines(ctx, k, fn) {
    ctx.save();
    ctx.scale(k, k);
    const own = Object.getOwnPropertyDescriptor(ctx, 'lineWidth');
    const base = own || LWD4;
    if (!base || !base.set) {
      try {
        fn();
      } finally {
        ctx.restore();
      }
      return;
    }
    Object.defineProperty(ctx, 'lineWidth', {
      configurable: true,
      get() {
        return base.get.call(this) * k;
      },
      set(v) {
        base.set.call(this, v / k);
      },
    });
    try {
      fn();
    } finally {
      if (own) Object.defineProperty(ctx, 'lineWidth', own);
      else delete ctx.lineWidth;
      ctx.restore();
    }
  }
  // 雪花飄落（固定種子，繞著 x0 在 w 寬範圍內飄）
  function snowFall(ctx, x0, y0, w, h, n, t, a) {
    ctx.save();
    ctx.fillStyle = A.c('#ffffff');
    ctx.globalAlpha *= a == null ? 0.85 : a;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const q = (t * (0.25 + hash(i) * 0.2) + hash(i * 3.1)) % 1;
      const x = x0 + (hash(i * 7.7) - 0.5) * w + Math.sin(t * 1.5 + i) * 4;
      const y = y0 - h + q * h;
      const r = 0.8 + hash(i * 2.3) * 1.2;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }

  // ═════════════ 第四章：霜鈴雪峰 ═════════════

  // ── 鎌鼬（echoferret）：乘著旋風的冬毛白鼬（尾尖是靛墨色），臉上朱紅隈取；前腳的腕上長出鋼色的鐮刃爪（刃根埋在白毛袖口裡），
  //    尾尖化成淡青的旋風。撲斬時身體拉長，身後拖著淡青的殘影，殘影 1 秒後再斬一次（zone echoghost 也用這個姿勢畫）──
  const KAMA_FUR = [P4.snow, P4.snowS, '#ffffff'];
  const KAMA_RED = P4.verm;
  const FERRET_BOX = [-92, -92, 190, 100];
  // 把幾個形狀當成一塊：先描全部的粗外框，再逐一上色（接縫不會有描邊）
  function blob(ctx, paths, fill, shade, rim, o) {
    o = o || {};
    const lw = o.lw || 2.6;
    ctx.lineJoin = 'round';
    paths.forEach((p) => {
      ctx.beginPath();
      p(ctx);
      ctx.lineWidth = lw * 2;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
    });
    paths.forEach((p, i) => rimShape(ctx, p, fill, shade, rim, { cel: o.cel, rim: o.rim, noStroke: true, inner: i === 0 ? o.inner : null }));
  }
  // 風刃（原點在腕上，刃朝 +x 往上彎成新月）：壓縮空氣凝成的半透明淡青新月刃，刃口是白色的速度線，
  //    周圍繞著旋轉的風紋；刃根埋在白毛袖口裡（圖示也用）
  function sickle(ctx, len, t, glint, echo) {
    const L = len;
    const P = (c) => {
      c.moveTo(-2, 4);
      c.bezierCurveTo(L * 0.45, 9, L * 0.95, 1, L, -L * 0.72);
      c.bezierCurveTo(L * 0.68, -L * 0.18, L * 0.3, -2.5, -1, -3);
      c.closePath();
    };
    if (!echo) glowH(ctx, L * 0.5, -L * 0.2, L * 0.8, P4.teal, 0.25 + glint * 0.3);
    // 刃身：半透明的淡青空氣
    ctx.save();
    ctx.globalAlpha *= 0.72;
    ctx.beginPath();
    P(ctx);
    ctx.fillStyle = A.c(P4.tealL);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = A.c(P4.teal);
    ctx.beginPath();
    ctx.moveTo(-2, -3);
    ctx.bezierCurveTo(L * 0.3, -1.5, L * 0.66, -L * 0.14, L, -L * 0.72);
    ctx.bezierCurveTo(L * 0.62, -L * 0.02, L * 0.3, 2, -2, 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 淡淡的墨線輪廓（半透明，看得出形狀但不像金屬）
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    P(ctx);
    ctx.stroke();
    ctx.restore();
    // 刃口：白色的速度線（外緣＋兩道內側細線）
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(1, 3.2);
    ctx.bezierCurveTo(L * 0.45, 7.6, L * 0.92, 0.6, L * 0.99, -L * 0.7);
    ctx.stroke();
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(L * 0.2, 2.6);
    ctx.bezierCurveTo(L * 0.5, 3.5, L * 0.75, -L * 0.1, L * 0.85, -L * 0.45);
    ctx.moveTo(L * 0.35, -0.6);
    ctx.bezierCurveTo(L * 0.55, -1, L * 0.7, -L * 0.2, L * 0.76, -L * 0.36);
    ctx.stroke();
    // 繞著刃旋轉的風紋（流動）
    if (!echo) {
      ctx.save();
      ctx.globalAlpha *= 0.8;
      ctx.strokeStyle = A.c(P4.tealL);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const q = (t * 2.2 + i * 0.5) % 1;
        const x = L * (0.15 + q * 0.7);
        const y = -L * 0.55 * q * q + 8 - i * 3;
        ctx.moveTo(x - 7, y + 2);
        ctx.quadraticCurveTo(x - 1, y - 3, x + 5, y - 1);
      }
      ctx.stroke();
      ctx.restore();
      curl(ctx, L * 0.1, 1, 3.4, -1, P4.tealL, 1.1);
    }
    // 刃根的白毛袖口（毛尖一點朱色）
    A.shape(ctx, (c) => { c.moveTo(-6, -4.5); c.quadraticCurveTo(-1, -6.5, 3, -3.5); c.lineTo(1, -1.5); c.lineTo(4, 0); c.lineTo(1, 1.5); c.lineTo(3, 4); c.quadraticCurveTo(-2, 6.5, -6, 4.5); c.closePath(); }, KAMA_FUR[0], KAMA_FUR[1], { lw: 1.4, shadeY: 1.5 });
    ctx.fillStyle = A.c(KAMA_RED);
    ctx.beginPath();
    ctx.moveTo(1, -1.5);
    ctx.lineTo(4, 0);
    ctx.lineTo(1, 1.5);
    ctx.closePath();
    ctx.fill();
    if (glint > 0.05 && !echo) {
      ctx.save();
      ctx.globalAlpha *= clamp(glint, 0, 1);
      sparkle(ctx, L * 0.98, -L * 0.68, 3.5 + glint * 3, '#ffffff');
      ctx.restore();
    }
  }
  // 一道新月形的風斬（撲斬留下的）
  function windSlash(ctx, x, y, r, rot, a) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha *= a;
    ctx.fillStyle = A.c(P4.tealL);
    ctx.beginPath();
    ctx.arc(0, 0, r, -1.2, 1.2);
    ctx.arc(-r * 0.3, 0, r * 0.88, 1.1, -1.1, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, r, -1.1, 1.1);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(-r * 0.12, 0, r * 0.9, -0.8, 0.8);
    ctx.stroke();
    ctx.restore();
  }
  function ferretPose(ctx, m, o) {
    const o0 = A.OUT;
    A.OUT = INK;
    try {
      ferretPose2(ctx, m, o);
    } finally {
      A.OUT = o0;
    }
  }
  function ferretPose2(ctx, m, o) {
    const t = m.t || 0;
    const st = o.stretch || 0;
    const cr = o.crouch || 0;
    const seed = o.seed || 0;
    const echo = !!o.echo;
    const moving = o.u != null;
    const u = moving ? o.u : 0;
    const F = KAMA_FUR;
    const kind = eyeKind(m);
    const breathe = moving ? 0 : Math.sin(t * 3 + seed) * 0.7;
    const bob = moving ? Math.cos(u * 2) * 1.3 : 0;
    const Hx = -15 - st * 6;
    const Hy = -17 + cr * 1 + st * 2 - bob * 0.5 - breathe * 0.3;
    const Cx = 12 + st * 9 - cr * 1;
    const Cy = -20 + cr * 7 + st * 5 - bob - breathe;
    // 頭：反向微微點頭
    const hdx = Cx + 12 + st * 6 - cr * 1;
    const hdy = Cy - 9 + st * 7 + cr * 3 + bob * 0.6;
    const hRot = st * 0.12 + cr * 0.18 + (moving ? Math.sin(u * 2 + 0.8) * 0.04 : Math.sin(t * 1.7 + seed) * 0.03);
    const stride = moving ? 6.5 : 0;
    const lift = 4.5;
    // ── 旋風（腳下與尾巴的風） ──
    const windRing = (x, y, rx, ry, a0, sp, alpha, lw) => {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = A.c(P4.tealL);
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = a0 + t * sp + i * 2.1;
        const k = 1 - i * 0.14;
        ctx.moveTo(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k);
        ctx.ellipse(x, y, rx * k, ry * k, 0, a, a + 1.5);
      }
      ctx.stroke();
      ctx.restore();
    };
    // ── 尾巴：長而蓬的尾，尾尖靛墨色、再化成旋風 ──
    const tsw = Math.sin(t * 4 + seed - 0.6) * 2.5;
    const tailFn = cb(Hx - 5, Hy - 1, Hx - 20, Hy + 3 + st * 5, Hx - 31, Hy - 10 + st * 12, Hx - 25 - st * 16 + tsw * 0.5, Hy - 27 + st * 20 + tsw);
    const tailW = (s) => 6 + Math.sin(s * PI) * 7 - s * 2;
    const tp = tailFn(1);
    if (!echo) glowH(ctx, tp[0], tp[1], 22, P4.teal, 0.3);
    windRing(tp[0] - 1, tp[1] + 1, 14, 6, 0, -7, 0.85, 1.8);
    ctx.save();
    ctx.globalAlpha *= 0.7;
    ctx.strokeStyle = A.c(P4.tealL);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const k = i / 20;
      const a = -t * 8 + k * TAU * 1.3 + seed;
      const r = 3 + k * 12;
      const x = tp[0] + Math.cos(a) * r;
      const y = tp[1] - k * 9 + Math.sin(a) * r * 0.32;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    rimShape(ctx, (c) => taper(c, tailFn, tailW, 16), F[0], F[1], P4.tealL, { cel: 2.6, rim: 1.4, lw: 2.3, inner: () => {
      ctx.fillStyle = A.c(P4.ind);
      ctx.beginPath();
      taper(ctx, (s) => tailFn(0.66 + s * 0.34), 30, 8);
      ctx.fill();
      ctx.fillStyle = A.c(P4.indL);
      ctx.beginPath();
      taper(ctx, (s) => { const p = tailFn(0.7 + s * 0.3); return [p[0] - 2, p[1] - 1]; }, (s) => 4 * (1 - s), 6);
      ctx.fill();
      if (!echo) brushHair(ctx, tailFn, 0.08, 0.62, 7, 2, 5, PI + 0.3, F[1], 1, seed + 3);
    } });

    // ── 腳：兩對關節腳，對角步態（近前＋遠後同相） ──
    const hindLeg = (far, ph) => {
      const g = gaitFoot(u + ph, stride, lift);
      const hipX = Hx + 1 + (far ? 3 : 0);
      const hipY = Hy + 3;
      let fx = Hx + 2 + (far ? 4 : 0) + g[0] - st * 8 + cr * 1;
      let fy = -g[1];
      const hock = [fx - 4.5 + g[2] * 2.5, fy - 6 + g[2] * 1];
      const knee = ik(hipX, hipY, hock[0], hock[1], 9, 8, 1);
      const col = far ? '#b7bddc' : F[0];
      const sh = far ? '#8d95c2' : F[1];
      limb2(ctx, [[hipX - 3, hipY - 10], [hipX, hipY], knee, hock, [fx - 1, fy - 2]], [7, 17, 8, 5.2, 4.8], col, sh, far || echo ? null : '#ffffff', { lw: 2.1, cel: 2, round: 0.8 });
      pawFoot(ctx, fx, fy, 8, 4.5, col, sh, { rot: -g[2] * 0.5, lw: 1.8 });
    };
    const bite = !!o.bite;
    const foreLeg = (far, ph) => {
      const g = gaitFoot(u + ph, stride, lift);
      const shX = Cx - 1 + (far ? 3 : 0);
      const shY = Cy + 4;
      let fx = Cx + 2 + (far ? 4 : 0) + g[0] + st * 12;
      let fy = -g[1] - st * (far ? 7 : 3);
      if (cr > 0) fx -= 2;
      const wr = [fx - 1 + g[2] * 1.5, fy - 4.5 + g[2] * 0.5];
      const el = ik(shX, shY, wr[0], wr[1], 8.5, 8, -1);
      const col = far ? '#b7bddc' : F[0];
      const sh = far ? '#8d95c2' : F[1];
      limb2(ctx, [[shX - 1, shY - 9], [shX, shY], el, wr, [fx, fy - 2]], [6, 13, 7, 5, 4.6], col, sh, far || echo ? null : '#ffffff', { lw: 2.1, cel: 2, round: 0.8 });
      pawFoot(ctx, fx, fy, 7.5, 4.2, col, sh, { rot: -g[2] * 0.6 - st * 0.3, lw: 1.8 });
      // 腕上的鐮刃
      const fa = Math.atan2(el[1] - wr[1], el[0] - wr[0]);
      const bx = wr[0] + (el[0] - wr[0]) * 0.2;
      const by = wr[1] + (el[1] - wr[1]) * 0.2;
      let ba;
      // 刃尖方向＝ba−0.6：平常朝上微微後彎、蓄力時高舉到背後、撲斬時往前劈
      if (st > 0) ba = far ? -0.45 : 0.15;
      else if (cr > 0) ba = far ? -1.55 : -1.8;
      else ba = (far ? -1.35 : -1.6) + Math.sin(t * 3 + seed + (far ? 1 : 0)) * 0.06 + (fa + 2.2) * 0.15;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ba);
      if (far) ctx.scale(0.88, 0.88);
      sickle(ctx, 33, t, st > 0 ? 1 : cr > 0 ? 0.6 : 0.2 + 0.2 * Math.sin(t * 4 + (far ? 2 : 0)), echo);
      ctx.restore();
    };
    // 纏繞身體的旋風（後半圈，在身體後面）
    const bodyWind = (front) => {
      ctx.save();
      ctx.globalAlpha *= echo ? 0.5 : 0.85;
      ctx.strokeStyle = A.c(front ? '#ffffff' : P4.tealL);
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const cx = (Hx + Cx) / 2 - 4 + i * 10;
        const cy = (Hy + Cy) / 2 - 2 - i * 2;
        const a0 = t * (6 + i) + i * 2;
        ctx.lineWidth = front ? 1.6 : 2.2;
        ctx.beginPath();
        if (front) ctx.ellipse(cx, cy, 20 - i * 4, 7 - i, -0.15, a0 % TAU < PI ? 0.2 : 0.4, PI - 0.3);
        else ctx.ellipse(cx, cy, 20 - i * 4, 7 - i, -0.15, PI + 0.2, TAU - 0.3);
        ctx.stroke();
      }
      ctx.restore();
    };
    bodyWind(false);
    hindLeg(true, 0);
    foreLeg(true, PI);

    // ── 身體：修長的 S 形 ──
    const bodyFn = cb(Hx - 5, Hy + 1, Hx + 7, Hy - 9 + st * 7, Cx - 11, Cy - 8 + st * 6, Cx + 3, Cy);
    const bodyW = (s) => 17 - s * 3 + Math.sin(s * PI) * 1.5;
    const bodyP = (c) => taper(c, bodyFn, bodyW, 18);
    const hipP = (c) => c.ellipse(Hx - 1, Hy - 1, 10.5, 10, 0, 0, TAU);
    const chestP = (c) => c.ellipse(Cx + 1, Cy + 1, 8.5, 9, 0, 0, TAU);
    blob(ctx, [bodyP, hipP, chestP], F[0], F[1], '#ffffff', { cel: 3.2, rim: 1.6, lw: 2.4, inner: () => {
      // 肚子的陰影
      ctx.fillStyle = A.c('#dfe2f2');
      ctx.beginPath();
      taper(ctx, (s) => { const p = bodyFn(s); return [p[0] + 1, p[1] + 7 + s]; }, (s) => 5 + s * 3, 12);
      ctx.fill();
      // 背上的靛墨風紋（毛筆的一撇）
      ctx.fillStyle = A.c(P4.ind);
      [0.2, 0.42, 0.64].forEach((s0, i) => {
        const p = along(bodyFn, s0, -bodyW(s0) * 0.34);
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(p[2] + 0.1);
        ctx.beginPath();
        ctx.moveTo(7 - i, -3);
        ctx.quadraticCurveTo(0, -1.5, -11 + i * 2, 2.5);
        ctx.quadraticCurveTo(-1, 1.6, 7 - i, 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      if (!echo) brushHair(ctx, bodyFn, 0.06, 0.94, 11, -bodyW(0.5) * 0.12, 5, PI - 0.15, F[1], 0.9, seed + 11);
    } });
    // 胸前的白毛領（淡淡的鋸齒）
    A.shape(ctx, (c) => { c.moveTo(Cx - 3, Cy - 3); c.quadraticCurveTo(Cx + 9, Cy - 4, Cx + 8, Cy + 5); c.lineTo(Cx + 5.5, Cy + 3.5); c.lineTo(Cx + 3.5, Cy + 8); c.lineTo(Cx + 1, Cy + 5); c.lineTo(Cx - 2, Cy + 8.5); c.quadraticCurveTo(Cx - 5.5, Cy + 3, Cx - 3, Cy - 3); c.closePath(); }, '#ffffff', '#dfe2f2', { lw: 1.5, shadeY: Cy + 4 });
    const rg = echo ? 0 : 0.5 + 0.5 * Math.sin(t * 5 + seed);
    if (!echo) glowStroke(ctx, (c) => { const a = along(bodyFn, 0.12, 4); const b = along(bodyFn, 0.72, 6); c.moveTo(a[0], a[1]); c.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 2, b[0], b[1]); }, P4.tealL, 1.1, '143,217,207', 0.3 + rg * 0.35 + st * 0.4);
    hindLeg(false, PI);
    bodyWind(true);

    // ── 頭：尖吻、圓耳、朱紅隈取、細長的淡青妖眼 ──
    ctx.save();
    ctx.translate(hdx, hdy);
    ctx.rotate(hRot);
    ctx.scale(1.25, 1.25);
    // 頸毛
    A.shape(ctx, (c) => { c.moveTo(-5, -6); c.lineTo(-14, -3); c.lineTo(-9, -0.5); c.lineTo(-15, 3.5); c.lineTo(-7, 4.5); c.lineTo(-11, 8.5); c.lineTo(-1, 7); c.closePath(); }, F[1], null, { lw: 1.8 });
    const ear = (x, y, col, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      A.shape(ctx, (c) => { c.moveTo(-4.5, 1.5); c.bezierCurveTo(-5.5, -7, 4.5, -8, 4.5, 1.5); c.closePath(); }, col, null, { lw: 1.8 });
      ctx.fillStyle = A.c(P4.pink);
      ctx.beginPath();
      ctx.moveTo(-2.4, 1);
      ctx.bezierCurveTo(-3, -4.2, 2.6, -4.8, 2.4, 1);
      ctx.fill();
      ctx.restore();
    };
    ear(-4, -7, '#dfe2f2', -0.55);
    const headP = (c) => {
      c.moveTo(-9.5, 5);
      c.quadraticCurveTo(-12.5, -8, -1, -9.5);
      c.quadraticCurveTo(8, -10, 12, -4);
      c.quadraticCurveTo(15, -1.5, 19, 0.2);
      c.quadraticCurveTo(21, 3, 16.5, 4.6);
      c.quadraticCurveTo(5, 9, -9.5, 5);
      c.closePath();
    };
    if (bite) {
      A.shape(ctx, (c) => { c.moveTo(2, 4); c.lineTo(17, 8.5); c.quadraticCurveTo(13.5, 12.5, 3, 10); c.closePath(); }, F[1], null, { lw: 1.8 });
      A.shape(ctx, (c) => { c.moveTo(3, 4.5); c.lineTo(16, 8); c.lineTo(4, 8.6); c.closePath(); }, P4.mouth, null, { noStroke: true });
      fang(ctx, 14, 7.6, 2.4, true);
    }
    rimShape(ctx, headP, F[0], F[1], '#ffffff', { cel: 2.4, rim: 1.4, lw: 2.2, inner: () => {
      // 朱紅隈取：眼尾往後上方掃到耳根、頰上一道
      ctx.fillStyle = A.c(KAMA_RED);
      ctx.beginPath();
      ctx.moveTo(10.5, -2.5);
      ctx.quadraticCurveTo(3, -7.5, -8.5, -8);
      ctx.quadraticCurveTo(0, -4.8, 9.5, -0.6);
      ctx.closePath();
      ctx.moveTo(4, 2.8);
      ctx.quadraticCurveTo(-2, 3.4, -8, 0.6);
      ctx.quadraticCurveTo(-2, 5.6, 4.5, 4.2);
      ctx.closePath();
      ctx.fill();
      // 頭頂的靛墨一抹
      ctx.fillStyle = A.c(P4.ind);
      ctx.beginPath();
      ctx.moveTo(6, -9);
      ctx.quadraticCurveTo(-2, -10.5, -10, -5);
      ctx.quadraticCurveTo(-2, -8, 6, -7.2);
      ctx.closePath();
      ctx.fill();
    } });
    ear(1.5, -8.8, F[0], -0.3);
    almondEye(ctx, 6.5, -2.2, 3.5, 2.1, '#3fb2a8', kind === 'normal' && (st > 0 || cr > 0) ? 'angry' : kind, { slit: true, glow: echo ? null : P4.teal, ga: 0.25, lw: 1.7 });
    // 鼻頭、嘴角
    A.ellipse(ctx, 18.8, 1.1, 1.6, 1.3, P4.indD, null, { lw: 0.9, hl: false });
    if (!bite) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(17, 3.8);
      ctx.quadraticCurveTo(12, 5.2, 8, 3.8);
      ctx.stroke();
      fang(ctx, 12.8, 4.5, 1.7, false);
    }
    // 鬍鬚：往後吹的風絲
    ctx.save();
    ctx.globalAlpha *= 0.85;
    ctx.strokeStyle = A.c(INK);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    const wv = Math.sin(t * 7 + seed) * 1.5;
    ctx.moveTo(15, 2);
    ctx.quadraticCurveTo(10, -3 + wv, 1, -1 + wv);
    ctx.moveTo(15, 3);
    ctx.quadraticCurveTo(8, 8 + wv, -1, 6 + wv);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // ── 近側的前腳與鐮刃 ──
    foreLeg(false, 0);
    // 腳下的小旋風
    windRing(Hx + 12, -3, 26, 5, 1, 9, (echo ? 0.4 : 0.5) + st * 0.3, 1.5);
    // 撲斬的刀光（淡青的新月＋白芯）
    if (st > 0) {
      ctx.save();
      ctx.globalAlpha *= 0.9;
      const sx = Cx + 34;
      const sy = Cy + 2;
      ctx.fillStyle = A.c(P4.tealL);
      ctx.beginPath();
      ctx.arc(sx, sy, 24, -1.3, 1.1);
      ctx.arc(sx - 7, sy, 21, 1.0, -1.2, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, 24, -1.2, 0.9);
      ctx.arc(sx - 3, sy, 22.5, 0.85, -1.15, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  function echoferret(ctx, m) {
    scaledLines(ctx, 1.22, () => echoferret2(ctx, m));
  }
  function echoferret2(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const dash = !!fx.dash;
    const strike = ph === 'strike';
    const wind = ph === 'wind';
    const walk = walking(m);
    const hurt = m.hurtT > 0;
    const spd = dash ? 22 : 13;
    const moving = (walk || dash) && !m.dead;
    const pose = { u: moving ? t * spd : null, stretch: dash || strike ? 1 : 0, crouch: wind && !dash ? 1 : 0, bite: dash || strike };
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    // 殘影：淡青半透明，越後面越淡（姿勢量化成 6 格，用快取貼圖）
    const n = dash ? 3 : walk ? 2 : 1;
    for (let i = n; i >= 1; i--) {
      const lag = dash ? i * 18 : walk ? i * 12 : 12 + Math.sin(t * 2) * 3;
      const a = (dash ? 0.42 : walk ? 0.28 : 0.14) * (1 - (i - 1) / (n + 0.6));
      ctx.save();
      ctx.translate(-lag, walk || dash ? -Math.abs(Math.sin(t * spd - i)) * 1.5 : Math.sin(t * 2.5) * 1.5);
      const gi = moving ? ((Math.round((t * spd - i * 0.9) / (TAU / 6)) % 6) + 6) % 6 : -1;
      const gp = Object.assign({}, pose, { u: gi < 0 ? null : (gi * TAU) / 6, echo: true, seed: i });
      ghostDraw(ctx, FERRET_BOX, a * 1.6, (g) => withTint('#8fe6da', 0.72, () => ferretPose(g, m, gp)),
        'fe|' + (m.id || '') + '|' + pose.stretch + pose.crouch + (pose.bite ? 1 : 0) + '|' + gi + '|' + i);
      ctx.restore();
    }
    if (dash) {
      speedLines(ctx, -40, -24, 30, 4, 16, t, 'rgba(216,247,241,0.9)');
      // 撲過的路上留下一道道新月風斬
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i / 3) % 1;
        windSlash(ctx, -24 - i * 22 - q * 10, -22 + (i % 2) * 6, 16 - i * 2, -0.25 + i * 0.2, (1 - q) * 0.8);
      }
    }
    ferretPose(ctx, m, pose);
    ctx.restore();
  }
  // ── 白澤（crystalowl）：知曉萬物的神獸。雪白的獅身、浮世繪浪花般捲曲的淡青鬃毛與長鬚、往後彎的金角，
  //    身側睜著朱框金瞳的神眼、背脊長著金色的八卦毛紋；額頭長出一支淡青的占卜水晶角。
  //    腳下踏著雪白的霞雲懸空而行。施法時水晶角、八卦紋與所有眼睛一起發光 ──
  const BZ_BODY = [P4.snow, P4.snowS, '#ffffff'];
  const BZ_MANE = [P4.teal, P4.tealS, P4.tealL];
  const BZ_HORN = [P4.gold, P4.goldS];
  // 金色的神眼（open 0..1 睜開程度）：朱色眼框、金瞳、豎瞳
  function godEye(ctx, x, y, w, h, rot, open, glowA, kind) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    if (kind === 'x' || kind === 'hurt' || open < 0.15) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (kind === 'x') {
        ctx.moveTo(-w * 0.5, -h * 0.5);
        ctx.lineTo(w * 0.5, h * 0.5);
        ctx.moveTo(w * 0.5, -h * 0.5);
        ctx.lineTo(-w * 0.5, h * 0.5);
      } else {
        ctx.moveTo(-w, 0);
        ctx.quadraticCurveTo(0, h * 0.8, w, 0);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (glowA > 0) glowH(ctx, 0, 0, w * 2.6, '#ffd24a', glowA);
    const hh = h * open;
    // 朱色的眼框（像神社雕刻的描金朱漆）
    ctx.fillStyle = A.c(P4.verm);
    ctx.beginPath();
    ctx.moveTo(-w * 1.35, 0);
    ctx.quadraticCurveTo(0, -hh * 2.9, w * 1.35, 0);
    ctx.quadraticCurveTo(0, hh * 2.9, -w * 1.35, 0);
    ctx.fill();
    const P = (c) => { c.moveTo(-w, 0); c.quadraticCurveTo(0, -hh * 2, w, 0); c.quadraticCurveTo(0, hh * 2, -w, 0); c.closePath(); };
    A.shape(ctx, P, '#fff8dc', null, { lw: 1.2 });
    ctx.save();
    ctx.beginPath();
    P(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#f2b43a');
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.95, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#ffe07a');
    ctx.beginPath();
    ctx.arc(-h * 0.2, -h * 0.25, h * 0.55, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#2a1606');
    ctx.beginPath();
    ctx.ellipse(0, 0, h * 0.26, h * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-h * 0.45, -h * 0.4, h * 0.22, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w * 1.15, hh * 0.1);
    ctx.quadraticCurveTo(0, -hh * 2.1, w * 1.15, hh * 0.1);
    ctx.stroke();
    ctx.restore();
  }
  // 火焰狀的鬃毛（尖端往後掃；雷獸也用）
  function flameMane(c, x, y, R, r, n, sweep, a0, a1) {
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const a = a0 + (a1 - a0) * k;
      const tip = [x + Math.cos(a) * R - sweep, y + Math.sin(a) * R * 0.95];
      const ak = a + ((a1 - a0) / n) * 0.5;
      const base = [x + Math.cos(ak) * r, y + Math.sin(ak) * r];
      if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      c.quadraticCurveTo(x + Math.cos(a - 0.15) * R * 0.95, y + Math.sin(a - 0.15) * R, tip[0], tip[1]);
      if (i < n) c.quadraticCurveTo(x + Math.cos(ak) * R * 0.75, y + Math.sin(ak) * R * 0.75, base[0], base[1]);
    }
    c.lineTo(x, y);
    c.closePath();
  }
  // 浮世繪浪花般的髮束：一條漸細的 S 形，尾端往上捲成渦
  function waveLock(ctx, x, y, len, w, ang, bend, curlK, fill, shade, rim, lw) {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const px = (a, b) => [x + ca * a - sa * b, y + sa * a + ca * b];
    const p1 = px(len * 0.35, bend * len * 0.25);
    const p2 = px(len * 0.75, -bend * len * 0.15);
    const p3 = px(len, -bend * len * 0.32);
    const fn = cb(x, y, p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
    rimShape(ctx, (c) => taper(c, fn, (s) => w * (1 - s * 0.82) * (0.75 + Math.sin(Math.min(1, s * 2.5) * PI * 0.5) * 0.25), 12), fill, shade, rim, { cel: w * 0.18, rim: 1, lw: lw || 1.8 });
    if (curlK > 0) {
      const e = fn(1);
      curl(ctx, e[0] - ca * w * 0.2, e[1] + w * 0.25, w * 0.42 * curlK, bend > 0 ? -1 : 1, shade, 1.1);
    }
    return fn;
  }
  function crystalowl(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const dead = !!m.dead;
    const kind = eyeKind(m);
    const cast = dead ? 0 : clamp(Math.max(num(fx.cast, 0), wind ? 0.6 : 0, strike ? 1 : 0), 0, 1);
    const moving = Math.abs(m.vx || 0) > 5 && !dead;
    const B = BZ_BODY;
    const M = BZ_MANE;
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    const u = moving ? t * 7 : t * 2;
    const amp = moving ? 1 : 0.35;
    const bob = Math.sin(t * 2.4) * 1.6 + (moving ? Math.cos(u * 2) * 1 : 0);
    ctx.translate(0, bob);
    // 施法時身體前半微微抬起
    ctx.translate(-6, -30);
    ctx.rotate(-cast * 0.07 + (moving ? Math.sin(u) * 0.02 : 0));
    ctx.translate(6, 30);
    const hx = 24;
    const hy = -52 - cast * 2 - bob * 0.35;
    const eyeOpen = 0.55 + cast * 0.45;
    const eyeGlow = 0.1 + cast * 0.5;

    // 八卦（三條爻，陽爻實線、陰爻斷開）——白澤身上天生的金色毛紋
    const trig = (x, y, i, sz, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot || 0);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      for (let j = 0; j < 3; j++) {
        const yang = (i >> j) & 1;
        const yy = (j - 1) * sz * 0.75;
        if (yang) {
          ctx.moveTo(-sz, yy);
          ctx.lineTo(sz, yy);
        } else {
          ctx.moveTo(-sz, yy);
          ctx.lineTo(-sz * 0.25, yy);
          ctx.moveTo(sz * 0.25, yy);
          ctx.lineTo(sz, yy);
        }
      }
      ctx.stroke();
      ctx.restore();
    };
    // ── 尾巴：獅尾（慢半拍擺動）＋淡青捲毛尾穗 ──
    const tsw = Math.sin(t * 2.5 - 0.8) * 4;
    const tailFn = cb(-26, -34, -38, -33, -44, -46, -38 + tsw, -58);
    rimShape(ctx, (c) => taper(c, tailFn, (s) => 5.5 - s * 2.5, 12), B[0], B[1], null, { cel: 1.5, lw: 2 });
    const tt = tailFn(1);
    const sw2 = Math.sin(t * 3 - 1.5) * 0.25;
    waveLock(ctx, tt[0], tt[1] + 3, 15, 10, -PI / 2 - 0.5 + sw2, 1, 1, M[1], P4.tealD, null);
    waveLock(ctx, tt[0], tt[1] + 3, 18, 11, -PI / 2 + 0.05 + sw2, -1, 1, M[0], M[1], M[2]);

    // ── 腳：懸空時四腳像在雲上划行（對角交替）──
    const leg = (hind, far, ph2) => {
      const q = u + ph2;
      const rx = hind ? -19 + (far ? 4 : 0) : 13 + (far ? 4 : 0);
      const ry = -11 + (hind ? 0 : -1);
      const fxp = rx + Math.cos(q) * 5 * amp;
      const fyp = ry + Math.min(0, Math.sin(q)) * 4 * amp;
      const top = hind ? [rx + 2, -34] : [rx - 1, -34];
      const col = far ? '#d3d6ea' : B[0];
      const sh = far ? '#a6accf' : B[1];
      const curlF = Math.max(0, -Math.sin(q)) * amp;
      if (hind) {
        const hock = [fxp - 4, fyp - 5.5];
        const knee = ik(top[0], top[1] + 6, hock[0], hock[1], 9, 9, 1);
        legMass(ctx, [top[0] - 2, top[1] + 4, 9, 10, 0.2], [[top[0], top[1] + 6], knee, hock, [fxp - 0.5, fyp - 1.5]], [11, 8, 5.6, 5.2], col, sh, far ? null : '#ffffff', { lw: 2 });
      } else {
        const wr = [fxp - 1.5 + curlF * 2, fyp - 5];
        const el = ik(top[0], top[1] + 6, wr[0], wr[1], 9, 8.5, -1);
        legMass(ctx, [top[0] + 1, top[1] + 4, 7, 9, -0.1], [[top[0], top[1] + 6], el, wr, [fxp, fyp - 1.5]], [10, 7.4, 5.4, 5], col, sh, far ? null : '#ffffff', { lw: 2 });
      }
      pawFoot(ctx, fxp, fyp, 8.5, 5, col, sh, { rot: -curlF * 0.7, lw: 1.8 });
      // 腳踝的淡青捲毛
      if (!far) waveLock(ctx, fxp - 3.5, fyp - 6, 9, 4.5, PI * 0.82, -1, 0.7, M[0], M[1], null, 1.5);
    };
    leg(true, true, PI);
    leg(false, true, 0);

    // ── 身體 ──
    const bodyP = (c) => c.ellipse(-5, -31, 22, 12.5, -0.06, 0, TAU);
    const chestP = (c) => c.ellipse(12, -35, 11, 12.5, 0.1, 0, TAU);
    blob(ctx, [bodyP, chestP], B[0], B[1], '#ffffff', { cel: 3.2, rim: 1.6, lw: 2.4, inner: () => {
      // 背上的淡青雲紋（神社雕刻的描線）
      ctx.strokeStyle = A.c(M[1]);
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-25, -35);
      ctx.quadraticCurveTo(-20, -42, -12, -40.5);
      ctx.moveTo(-8, -41.5);
      ctx.quadraticCurveTo(-1, -44, 5, -40.5);
      ctx.stroke();
      curl(ctx, -12, -38, 3.6, 1, M[1], 1.2);
      curl(ctx, 5, -38.5, 3.2, -1, M[1], 1.2);
      // 腹下的毛流
      furField(ctx, -7, -23, 15, 3.5, 9, PI * 0.55, 4, B[1], 0.9, 3);
      // 背脊上的金色八卦毛紋（施法時發光）
      if (cast > 0.05) glowH(ctx, -8, -41, 22, P4.goldL, cast * 0.5);
      ctx.strokeStyle = A.c(mixq(P4.goldS, P4.gold, cast));
      ctx.lineWidth = 1.2;
      trig(-22, -38.5, 5, 2.3, -0.3);
      trig(-3, -42, 2, 2.3, 0.05);
      trig(8, -44.5, 6, 2, 0.25);
    } });
    // ── 近側的腳 ──
    leg(true, false, 0);
    leg(false, false, PI);

    // 身側的三隻神眼
    godEye(ctx, -19, -30, 3.4, 1.9, -0.2, eyeOpen, eyeGlow, kind);
    godEye(ctx, -6, -31, 3.4, 1.9, 0.1, eyeOpen, eyeGlow, kind);
    godEye(ctx, -12.5, -39, 3, 1.7, -0.1, eyeOpen, eyeGlow, kind);

    // ── 腳下的祥雲（浮世繪的平塗雲，靛色渦卷線） ──
    ctx.save();
    ctx.globalAlpha *= 0.95;
    kasumi(ctx, -17 + Math.sin(t * 1.5) * 1.5, -1, 15, 9, '#ffffff', P4.snowS, P4.indL, 0);
    kasumi(ctx, 15 - Math.sin(t * 1.5) * 1.5, 0, 13, 8, '#ffffff', P4.snowS, P4.indL, 2);
    ctx.restore();

    // ── 鬃毛：一束束浪花狀的髮束，從頭後往後流（外層深、內層淺，末端捲起） ──
    const ms = Math.sin(t * 2.2 - 0.9);
    if (cast > 0) glowH(ctx, hx - 6, hy + 2, 30, M[2], cast * 0.35);
    // 後層（淡青陰影色）三大束，前層兩束，末端捲起
    [[-0.35, 26, 13, 1], [0.15, 30, 14, -1], [0.62, 26, 13, 1]].forEach((L, i) => waveLock(ctx, hx - 6, hy + 2, L[1], L[2], PI + L[0] + ms * 0.07 * (1 + i * 0.4), L[3], 1, M[1], P4.tealD, null, 2.1));
    [[-0.1, 22, 11, -1], [0.4, 21, 10, 1]].forEach((L, i) => waveLock(ctx, hx - 4, hy + 1, L[1], L[2], PI + L[0] + ms * 0.1 * (1 + i * 0.5), L[3], 1, M[0], M[1], M[2], 2));
    // 遠側的角
    const horn = (fn, w0, col, sh) => {
      const wf = (s) => w0 * (1 - s * 0.85);
      rimShape(ctx, (c) => taper(c, fn, wf, 14), col, sh, P4.goldL, { cel: 1.6, rim: 1, lw: 1.9 });
      ctx.strokeStyle = A.c(sh);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i <= 5; i++) {
        const s = i * 0.14;
        const a = along(fn, s, wf(s) * 0.45);
        const b = along(fn, s, -wf(s) * 0.45);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
    };
    horn(cb(hx + 1, hy - 8, hx - 3, hy - 19, hx - 17, hy - 18, hx - 17, hy - 7), 5.5, '#c99a44', '#8a6026');
    // 耳朵
    A.shape(ctx, (c) => { c.moveTo(hx - 6, hy - 5); c.quadraticCurveTo(hx - 13, hy - 9, hx - 12, hy - 13); c.quadraticCurveTo(hx - 5, hy - 12, hx - 2, hy - 7); c.closePath(); }, B[0], null, { lw: 1.8 });
    ctx.fillStyle = A.c(P4.pink);
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy - 6.5);
    ctx.quadraticCurveTo(hx - 10.5, hy - 9, hx - 10.5, hy - 11.5);
    ctx.quadraticCurveTo(hx - 6, hy - 10, hx - 4, hy - 7.5);
    ctx.fill();
    // ── 頭：獅子般的方吻 ──
    const headP = (c) => {
      c.moveTo(hx - 8, hy + 6);
      c.quadraticCurveTo(hx - 11, hy - 9, hx + 1, hy - 10);
      c.quadraticCurveTo(hx + 9, hy - 10, hx + 11, hy - 4);
      c.quadraticCurveTo(hx + 17.5, hy - 4, hx + 17.5, hy + 2);
      c.quadraticCurveTo(hx + 17.5, hy + 7.5, hx + 10, hy + 8);
      c.quadraticCurveTo(hx, hy + 11, hx - 8, hy + 6);
      c.closePath();
    };
    rimShape(ctx, headP, B[0], B[1], '#ffffff', { cel: 2.4, rim: 1.4, lw: 2.3, inner: () => {
      ctx.fillStyle = A.c('#e6e7f3');
      ctx.beginPath();
      ctx.ellipse(hx + 11, hy + 4, 6.5, 4, 0, 0, TAU);
      ctx.fill();
      // 朱色的眉紋
      ctx.fillStyle = A.c(P4.verm);
      ctx.beginPath();
      ctx.moveTo(hx + 12, hy - 6);
      ctx.quadraticCurveTo(hx + 6, hy - 10, hx - 1, hy - 7);
      ctx.quadraticCurveTo(hx + 5, hy - 8, hx + 11.5, hy - 4.6);
      ctx.fill();
    } });
    // 鼻子、嘴
    A.shape(ctx, (c) => { c.moveTo(hx + 14, hy - 3); c.quadraticCurveTo(hx + 18.8, hy - 3.5, hx + 18, hy + 0.5); c.quadraticCurveTo(hx + 15, hy + 1.5, hx + 13.5, hy - 0.5); c.closePath(); }, P4.ind, null, { lw: 1.1 });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + 16, hy + 1);
    ctx.quadraticCurveTo(hx + 15, hy + 4.5 + cast * 1.5, hx + 10, hy + 4.5 + cast * 1.5);
    ctx.stroke();
    // 長鬚（淡青的浪花捲，慢半拍擺動）
    const bw = Math.sin(t * 2.5 - 1.2) * 0.12;
    waveLock(ctx, hx + 9, hy + 6, 18, 7, PI / 2 + 0.25 + bw, -1, 1, M[0], M[1], M[2], 1.8);
    waveLock(ctx, hx + 5, hy + 7, 13, 5.5, PI / 2 + 0.55 + bw, 1, 0.8, M[1], P4.tealD, null, 1.6);
    // 眼睛與額頭的第三眼
    almondEye(ctx, hx + 6.5, hy - 2.5, 3.6, 2.3, '#e9a830', kind, { glow: dead ? null : '#ffd24a', ga: 0.2 + cast * 0.4, slit: true, lw: 1.8 });
    // 近側的角
    horn(cb(hx + 3, hy - 8, hx, hy - 22, hx - 15, hy - 22, hx - 14, hy - 9), 7, BZ_HORN[0], BZ_HORN[1]);
    // ── 額頭長出的占卜水晶角（施法時發光，光球從這裡射出） ──
    const cx0 = hx + 4;
    const cy0 = hy - 17 - cast * 1.5;
    if (!dead) glowH(ctx, cx0, cy0, 14 + cast * 24, P4.teal, 0.25 + cast * 0.45);
    if (cast > 0.05) {
      ctx.save();
      ctx.globalAlpha *= cast;
      rays(ctx, cx0, cy0 - 3, 10, 8, 24 + cast * 10, 1.5, t * 0.8, 'rgba(253,233,168,0.6)');
      ctx.restore();
    }
    const cryP = (c) => poly(c, [[hx - 1, hy - 7], [hx + 0.5, hy - 17], [hx + 4.5, hy - 27 - cast * 2], [hx + 8, hy - 16], [hx + 8, hy - 7.5]]);
    rimShape(ctx, cryP, mixq(P4.tealL, '#ffffff', cast * 0.6), P4.tealS, '#ffffff', { cel: 2, rim: 1.1, lw: 1.8, inner: () => {
      ctx.fillStyle = A.c(P4.teal);
      ctx.beginPath();
      poly(ctx, [[hx + 4.5, hy - 27 - cast * 2], [hx + 5, hy - 14], [hx + 8, hy - 7.5], [hx + 8, hy - 16]]);
      ctx.fill();
      glowH(ctx, hx + 3.5, hy - 17, 5 + cast * 3, '#ffffff', 0.6 + cast * 0.4);
    } });
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(hx + 0.5, hy - 17);
    ctx.lineTo(hx + 5, hy - 14);
    ctx.lineTo(hx + 8, hy - 16);
    ctx.moveTo(hx + 5, hy - 14);
    ctx.lineTo(hx + 4.5, hy - 27 - cast * 2);
    ctx.stroke();
    if (!dead) sparkle(ctx, hx + 9 + Math.sin(t * 3) * 1.5, hy - 26, 1.8 + cast * 2, P4.goldL);
    ctx.restore();
  }
  // ── 雪男（avalanchehare）：雪山深處的小雪男。披著一身往下垂的長毛（毛尖一撮撮下垂、結著淡青的霜）、
  //    靛藍色的臉與手腳，背上長著淡青冰晶，額頭有一道天生的朱色火焰紋。
  //    後腳往後一收、再往前一踢，就踢出一顆越滾越大的雪球 ──
  const YETI_FUR = [P4.snow, P4.snowS, '#ffffff'];
  const YETI_SKIN = [P4.ind, P4.indS, P4.indL];
  // 一撮往下垂的毛（上端藏在上一排底下）；line = 毛尖的描線色（圖示也用）
  function furTuft(ctx, x, y, w, h, sway, fill, shade, line, lw) {
    const P = (c) => {
      c.moveTo(x - w, y);
      c.quadraticCurveTo(x - w * 1.05, y + h * 0.55, x + sway, y + h);
      c.quadraticCurveTo(x + w * 0.9, y + h * 0.5, x + w, y);
      c.closePath();
    };
    A.shape(ctx, P, fill, shade, { noStroke: true, shadeY: y + h * 0.55 });
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 1.05, y + h * 0.55, x + sway, y + h);
    ctx.quadraticCurveTo(x + w * 0.9, y + h * 0.5, x + w, y);
    ctx.strokeStyle = line === 'out' ? A.outline() : A.c(line);
    ctx.lineWidth = lw || 1.3;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  // 蓬毛的輪廓：橢圓周圍一片片往下垂的圓毛瓣，瓣尾帶一個小尖（下半與兩側長、頂上短）
  function shaggyPath(c, cx, cy, rx, ry, n, depth, drop, seed, sway) {
    for (let i = 0; i < n; i++) {
      const a0 = -PI / 2 + (i / n) * TAU;
      const a1 = -PI / 2 + ((i + 1) / n) * TAU;
      const am = (a0 + a1) / 2;
      const p0 = [cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry];
      const p1 = [cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry];
      const low = (Math.sin(am) + 1) / 2;
      const d = depth * (0.3 + low * 0.9) * (0.8 + hash(seed + i) * 0.4);
      const dy = drop * low;
      const sx = (sway || 0) * low;
      const ox = Math.cos(am);
      const oy = Math.sin(am);
      const tip = [cx + ox * (rx + d * 1.25) + sx + ox * 0.5, cy + oy * (ry + d * 1.25) + dy];
      if (i === 0) c.moveTo(p0[0], p0[1]);
      c.bezierCurveTo(p0[0] + ox * d, p0[1] + oy * d + dy * 0.5, tip[0] - oy * d * 0.3, tip[1] - d * 0.2, tip[0], tip[1]);
      c.quadraticCurveTo(p1[0] + ox * d * 0.5 + sx * 0.5, p1[1] + oy * d * 0.5 + dy * 0.3, p1[0], p1[1]);
    }
    c.closePath();
  }
  // 毛的內部紋理：一撮撮 V 形的毛筆線
  function lockMarks(ctx, cx, cy, rx, ry, n, col, seed, lw) {
    ctx.save();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = lw || 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = hash(seed + i * 1.3) * TAU;
      const d = Math.sqrt(hash(seed + i * 2.9)) * 0.85;
      const x = cx + Math.cos(a) * rx * d;
      const y = cy + Math.sin(a) * ry * d;
      const h = 4 + hash(seed + i * 4.1) * 3;
      ctx.moveTo(x - 2.2, y - h * 0.6);
      ctx.quadraticCurveTo(x - 1.4, y - h * 0.1, x, y + h * 0.4);
      ctx.quadraticCurveTo(x + 1, y - h * 0.1, x + 2, y - h * 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }
  function iceSpike(ctx, x, y, h, w, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const P = (c) => poly(c, [[-w, 2], [-w * 0.35, -h * 0.7], [0, -h], [w * 0.5, -h * 0.55], [w, 2]]);
    rimShape(ctx, P, P4.tealL, P4.teal, '#ffffff', { cel: w * 0.35, rim: 1, lw: 1.7 });
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.9);
    ctx.lineTo(-w * 0.1, 0);
    ctx.stroke();
    ctx.restore();
  }
  function avalanchehare(ctx, m) {
    scaledLines(ctx, 1.25, () => avalanchehare2(ctx, m));
  }
  function avalanchehare2(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const hurt = m.hurtT > 0;
    const dead = !!m.dead;
    const walk = walking(m) && !dead;
    const kind = eyeKind(m);
    const k = clamp(num(fx.kick, 0), 0, 1);
    const strike = ph === 'strike' || k >= 0.99;
    const wind = !strike && (ph === 'wind' || k > 0);
    const F = YETI_FUR;
    const S = YETI_SKIN;
    const u = walk ? t * 9 : 0;
    const bob = walk ? -Math.abs(Math.sin(u)) * 2.2 : Math.sin(t * 2.2) * 0.8;
    const sway = walk ? Math.sin(u) * 0.05 : 0;
    const lean = strike ? -0.14 : wind ? 0.12 * Math.max(k, 0.5) : 0;
    const blow = Math.sin(t * 6);
    const furSw = Math.sin(t * 3 - 0.7) * 1.2 + (walk ? Math.cos(u - 0.8) * 1.5 : 0);
    const farF = '#d8dbee';
    const farS = '#a9b0d4';
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    // ── 腳：粗短的關節腿（白毛大腿、靛藍小腿與大腳掌＋白爪） ──
    const legFn = (near) => {
      const q = u + (near ? 0 : PI);
      let fx2 = (near ? 6 : -7) + (walk ? Math.cos(q) * 6 : 0);
      let fy2 = walk ? -Math.max(0, -Math.sin(q)) * 5 : 0;
      let rot = walk ? -Math.max(0, -Math.sin(q)) * 0.4 : 0;
      if (near && strike) {
        fx2 = 20;
        fy2 = -14;
        rot = -0.8;
      } else if (near && wind) {
        fx2 = -9;
        fy2 = -6;
        rot = 0.45;
      }
      const hip = [near ? 3 : -7, -17 + bob];
      const ank = [fx2 - 3, fy2 - 4.5];
      const knee = ik(hip[0], hip[1], ank[0], ank[1], 8, 7.5, 1);
      limb2(ctx, [knee, ank, [fx2 - 1, fy2 - 2]], [7.5, 6, 5.6], near ? S[0] : '#28336a', S[1], null, { lw: 2, round: 0.6 });
      pawFoot(ctx, fx2, fy2, 13, 6, near ? S[0] : '#28336a', S[1], { rot, claw: '#f4f1e4', lw: 2 });
      limb2(ctx, [[hip[0], hip[1] - 2], knee], [12, 9.5], near ? F[0] : farF, near ? F[1] : farS, near ? '#ffffff' : null, { lw: 2.1 });
      furTuft(ctx, knee[0] - 2.5, knee[1] - 2, 3.2, 6.5, -1 + furSw * 0.3, near ? F[0] : farF, F[1], 'out', 1.5);
      furTuft(ctx, knee[0] + 2, knee[1] - 2, 3, 5.5, 1 + furSw * 0.3, near ? F[0] : farF, F[1], 'out', 1.5);
    };
    legFn(false);
    ctx.translate(0, bob);
    ctx.save();
    ctx.translate(0, -14);
    ctx.rotate(lean + sway);
    ctx.translate(0, 14);
    // ── 手臂：從身體兩側垂下的長毛袖，靛藍大手＋白爪 ──
    const armSw = walk ? Math.sin(u) : Math.sin(t * 2.2) * 0.25;
    const arm = (near) => {
      const sh0 = near ? [11, -31] : [-16, -32];
      let hx2 = sh0[0] + (near ? 7 : -5) - armSw * (near ? 5 : -5);
      let hy2 = -11 - Math.abs(armSw) * 1.5;
      if (strike) {
        hx2 += near ? 5 : -7;
        hy2 -= near ? 12 : 8;
      } else if (wind) {
        hx2 -= 3;
        hy2 -= 4;
      }
      const mid = [(sh0[0] + hx2) / 2 - (near ? 2.5 : -1.5), (sh0[1] + hy2) / 2];
      const col = near ? F[0] : farF;
      const shd = near ? F[1] : farS;
      const fn = limb2(ctx, [[sh0[0] - 2, sh0[1] - 5], sh0, mid, [hx2, hy2]], [4, 11, 10, 8], col, shd, near ? '#ffffff' : null, { lw: 2.1, round: 0.9 });
      for (let i = 0; i < 2; i++) {
        const q = along(fn, 0.5 + i * 0.2, near ? -3.5 : 3.5);
        furTuft(ctx, q[0], q[1] - 1, 3, 7 - i, -1.5 + furSw * 0.4, col, shd, 'out', 1.4);
      }
      ctx.save();
      ctx.translate(hx2, hy2);
      A.shape(ctx, (c) => c.ellipse(0, 1.5, 5, 4.6, 0, 0, TAU), near ? S[0] : '#28336a', S[1], { lw: 1.9, cel: [1.2, 1.2] });
      ctx.fillStyle = A.c('#f4f1e4');
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const x = -3 + i * 3;
        ctx.moveTo(x - 1.1, 5.2);
        ctx.lineTo(x + 0.3, 8.8);
        ctx.lineTo(x + 1.2, 5.2);
      }
      ctx.fill();
      ctx.restore();
    };
    arm(false);
    // 背上的淡青冰晶
    iceSpike(ctx, -15, -44, 9, 3.2, -0.75);
    iceSpike(ctx, -8, -49, 11, 3.6, -0.3);
    iceSpike(ctx, -21, -35, 7, 2.6, -1.15);
    // ── 身體：一整團蓬毛（頭與身體連在一起），毛瓣往下垂 ──
    const bodyP = (c) => shaggyPath(c, -3, -30, 18, 19.5, 13, 4.5, 3, 3, furSw);
    rimShape(ctx, bodyP, F[0], F[1], '#ffffff', { cel: 4, rim: 1.8, lw: 2.4, inner: () => {
      // 下半身的毛尖結了霜（淡青）：只有毛瓣的尖端露出霜色
      ctx.save();
      ctx.beginPath();
      ctx.rect(-40, -26, 80, 30);
      ctx.clip();
      ctx.fillStyle = A.c(P4.teal);
      ctx.fillRect(-40, -26, 80, 30);
      ctx.translate(0, -3.5);
      ctx.beginPath();
      bodyP(ctx);
      ctx.fillStyle = A.c(F[1]);
      ctx.fill();
      ctx.translate(-2.5, -1.5);
      ctx.beginPath();
      bodyP(ctx);
      ctx.fillStyle = A.c(F[0]);
      ctx.fill();
      ctx.restore();
      lockMarks(ctx, -7, -27, 10, 11, 7, '#d6d9ec', 7, 0.9);
      // 頭與身體之間淡淡的一道毛線（下巴的影子）
      ctx.strokeStyle = A.c(F[1]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-12, -27);
      ctx.quadraticCurveTo(0, -22, 13, -27);
      ctx.stroke();
    } });
    // 頭頂翹起的一撮毛
    [[-8, -47, -0.55], [-3, -49.5, -0.2], [2, -49, 0.15]].forEach((q, i) => {
      ctx.save();
      ctx.translate(q[0], q[1]);
      ctx.rotate(q[2] + PI + Math.sin(t * 3 - 1 + i) * 0.08);
      furTuft(ctx, 0, -2, 3.4, 8 + i, 1.2, F[0], '#ffffff', 'out', 1.7);
      ctx.restore();
    });
    // 近側的手臂（畫在臉的後面）
    arm(true);
    // ── 靛藍色的臉（嵌在毛裡，鼻吻往前凸） ──
    const hx = 1;
    const hy = -38;
    ctx.save();
    ctx.translate(hx + 8, hy + 4);
    ctx.scale(1.2, 1.2);
    ctx.translate(-hx - 8, -hy - 4);
    const faceP = (c) => {
      c.moveTo(hx + 1, hy - 3);
      c.quadraticCurveTo(hx + 11, hy - 7, hx + 19.5, hy - 1.5);
      c.quadraticCurveTo(hx + 22, hy + 5, hx + 16.5, hy + 9.5);
      c.quadraticCurveTo(hx + 7, hy + 12.5, hx + 1.5, hy + 6.5);
      c.quadraticCurveTo(hx - 1.5, hy + 1.5, hx + 1, hy - 3);
      c.closePath();
    };
    rimShape(ctx, faceP, S[0], S[1], S[2], { cel: 2, rim: 1.1, lw: 2, inner: () => {
      ctx.fillStyle = A.c(P4.indL);
      ctx.beginPath();
      ctx.ellipse(hx + 15, hy + 5, 5.5, 3.4, 0, 0, TAU);
      ctx.fill();
    } });
    // 眼睛（淡青的冰光）
    const ex = hx + 8.5;
    const ey = hy + 1.8;
    if (kind === 'normal' || kind === 'angry') {
      if (!dead) glowH(ctx, ex + 4, ey, 11, P4.teal, 0.45);
      [[ex, ey, 2.7], [ex + 7.5, ey - 0.4, 2.5]].forEach((q) => {
        ctx.fillStyle = A.c(P4.tealL);
        ctx.beginPath();
        ctx.ellipse(q[0], q[1], q[2], q[2] * 1.1, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = A.c(P4.indD);
        ctx.beginPath();
        ctx.arc(q[0] + 0.5, q[1] + 0.3, q[2] * 0.55, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(q[0] - 0.5, q[1] - 0.7, q[2] * 0.3, 0, TAU);
        ctx.fill();
      });
    } else {
      A.OUT = '#dfe4ff';
      A.eye(ctx, ex, ey, 2.3, 2.3, kind);
      A.eye(ctx, ex + 7.5, ey - 0.4, 2.1, 2.1, kind);
      A.OUT = INK;
    }
    // 鼻子、嘴、下排小獠牙
    A.ellipse(ctx, hx + 17.6, hy + 4.6, 2.2, 1.5, P4.indD, null, { lw: 0.9, hl: false });
    const mo = strike ? 1 : 0;
    A.shape(ctx, (c) => { c.moveTo(hx + 8, hy + 7.5); c.quadraticCurveTo(hx + 12, hy + 9.5 + mo * 3, hx + 16, hy + 8); c.quadraticCurveTo(hx + 12, hy + 8.5 + mo, hx + 8, hy + 7.5); c.closePath(); }, P4.mouth, null, { lw: 1.2 });
    fang(ctx, hx + 9.8, hy + 8.4, 2.3, true);
    fang(ctx, hx + 14.4, hy + 8.4, 2.3, true);
    // 濃眉（白毛的瀏海蓋在眼睛上，毛尖往下垂）
    A.shape(ctx, (c) => { c.moveTo(hx - 1, hy - 4.5); c.quadraticCurveTo(hx + 10, hy - 10, hx + 20.5, hy - 4.5); c.lineTo(hx + 19, hy - 1.6); c.lineTo(hx + 16.5, hy - 3); c.lineTo(hx + 14, hy - 1); c.lineTo(hx + 11.5, hy - 3); c.lineTo(hx + 8.5, hy - 0.8); c.lineTo(hx + 6, hy - 2.6); c.lineTo(hx + 3, hy - 0.6); c.lineTo(hx + 0.5, hy - 2); c.closePath(); }, F[0], F[1], { lw: 1.5, shadeY: hy - 1.2 });
    if (kind === 'angry' || strike) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ex - 3, ey - 3.3);
      ctx.lineTo(ex + 2, ey - 1.8);
      ctx.moveTo(ex + 10.5, ey - 3.8);
      ctx.lineTo(ex + 5.8, ey - 2.2);
      ctx.stroke();
    }
    // 額頭天生的朱色火焰紋（三瓣，像寶珠的火焰）
    ctx.save();
    ctx.translate(hx + 6, hy - 8.5);
    ctx.rotate(0.15);
    ctx.fillStyle = A.c(P4.verm);
    ctx.beginPath();
    flamePath(ctx, 0, 2, 1.9, 6.5, 0.6);
    flamePath(ctx, -2.8, 2.4, 1.3, 4.5, -0.8);
    flamePath(ctx, 2.8, 2.4, 1.3, 4.5, 1.1);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.restore();
    ctx.translate(0, -bob);
    // ── 近側的腳：蓄力往後收、踢出時往前掃 ──
    legFn(true);
    // 踢起來的雪
    if (strike) {
      for (let i = 0; i < 5; i++) {
        const q = (t * 3 + i / 5) % 1;
        puff(ctx, 28 + q * 18, -16 - Math.sin(q * PI) * 10 + i, 2.5 + q * 3, '#ffffff', (1 - q) * 0.9);
      }
      ctx.save();
      ctx.globalAlpha *= 0.8;
      ctx.strokeStyle = A.c(P4.tealL);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(8, -8, 22, -0.9, 0.4);
      ctx.stroke();
      ctx.restore();
    }
    if (walk) snowDust(ctx, -10, 0, t, 1, -1);
    ctx.restore();
  }
  // ── 雷獸（drumyak）：雷神的坐騎，高貴而兇猛的劍齒雷虎。深靛色的虎身、厚實的肩與深胸、金色稻妻紋當作虎紋、
  //    雪白的胸毛與口吻、一對長長的劍齒、眉上一對金色短角；尾巴是一道金色的鋸齒閃電。
  //    背上湧出一大片翻騰的雷雲披風（深靛雲毛、淡青邊緣光、金色電脈），雲頭凝成一圈雷神太鼓（鼓面是金色三巴紋），
  //    鼓與鼓之間劈啪連著電光。擂鼓（fx.beat）時太鼓依序閃亮、閃電在鼓間跳躍並劈向地面，雷獸仰頭怒吼 ──
  const RJ_BODY = [P4.ind, P4.indS, P4.teal];
  const RJ_BELLY = [P4.indL, P4.ind];
  const RJ_GOLD = P4.gold;
  // 稻妻紋（金色的鋸齒雷紋，沿著一條線）
  function inazuma(ctx, x0, y0, x1, y1, n, amp, col, lw) {
    ctx.save();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = lw || 1.4;
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    ctx.beginPath();
    const dx = (x1 - x0) / n;
    const dy = (y1 - y0) / n;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    ctx.moveTo(x0, y0);
    for (let i = 1; i <= n; i++) {
      const s = i % 2 ? amp : -amp;
      ctx.lineTo(x0 + dx * (i - 0.5) + nx * s, y0 + dy * (i - 0.5) + ny * s);
      ctx.lineTo(x0 + dx * i, y0 + dy * i);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 雷雲披風的雲團（一串圓；先描整團外框再上色，接縫沒有線）
  function stormCloud(ctx, cs, fill, shade, rim, lw, inner) {
    const P = (c) => cloudPath(c, cs, 0, 0);
    ctx.beginPath();
    P(ctx);
    ctx.lineWidth = (lw || 2.4) * 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    // 圓彼此重疊，不能用 evenodd 的邊緣光：改用巢狀 clip（左上邊緣光、右下陰影）
    ctx.save();
    ctx.beginPath();
    P(ctx);
    ctx.clip();
    ctx.fillStyle = A.c(rim);
    ctx.fillRect(-300, -300, 600, 600);
    ctx.translate(1.8, 1.8);
    ctx.beginPath();
    P(ctx);
    ctx.fillStyle = A.c(shade);
    ctx.fill();
    ctx.clip();
    ctx.translate(-5, -5);
    ctx.beginPath();
    P(ctx);
    ctx.fillStyle = A.c(fill);
    ctx.fill();
    ctx.translate(3.2, 3.2);
    if (inner) inner();
    ctx.restore();
  }
  function drumyak(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const hurt = m.hurtT > 0;
    const dead = !!m.dead;
    const walk = walking(m) && !dead;
    const kind = eyeKind(m);
    const beat = clamp(num(fx.beat, 0), 0, 1);
    const roar = beat > 0.15;
    const B = RJ_BODY;
    const u = walk ? t * 6.5 : 0;
    const stride = walk ? 8 : 0;
    const dip = beat * 3;
    const bob = walk ? Math.cos(u * 2) * 1.3 : Math.sin(t * 2) * 0.7;
    const flick = Math.floor(t * 12);
    const charge = dead ? 0 : 0.35 + 0.25 * Math.sin(t * 5) + beat * 0.8;
    const by = -40 + dip + bob;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    if (!dead) glowH(ctx, -6, -66, 70, P4.teal, 0.1 + beat * 0.3);

    // ── 雷雲披風（在身體後面，從肩背往上往後翻騰）＋雲頭凝成的雷神太鼓 ──
    const bl = (i) => Math.sin(t * 2.2 - i * 0.7) * 1.2;
    // 雲團沿著一條往後上方飄的弧排列：肩上小、背中段最蓬、尾端拉長散開（每團都有自己的起伏）
    const mcs = [];
    for (let i = 0; i < 11; i++) {
      const k = i / 10;
      const x = 20 - k * 78 + Math.sin(t * 1.6 - k * 4) * 2 * k;
      const y = by - 14 - Math.sin(k * PI * 0.9) * 20 - k * 10 + Math.sin(t * 2 - k * 5) * 2.5 * k;
      const r = (7 + Math.sin(Math.min(1, k * 1.4) * PI) * 8) * (1 - k * 0.35) + bl(i) * 0.8 + hash(i * 3.7) * 2;
      mcs.push([x, y, r]);
      // 上緣再冒出一團（不規則的翻騰）
      if (i % 2 === 1) mcs.push([x + 2, y - r * 0.8, r * (0.55 + hash(i) * 0.25)]);
    }
    // 貼著背的底層雲（蓋住雲與身體的接縫）
    mcs.push([-24, by - 8, 11], [-6, by - 10, 12], [10, by - 11, 10]);
    // 被風扯散的雲尾
    mcs.push([-64 + bl(3), by - 42, 4.5], [-70 + bl(4) * 1.5, by - 46, 3]);
    // 太鼓：沿著雲頭排成一道弧（光背），依序在擂鼓時閃亮
    const dr = [];
    // 太鼓排在雲鬃的浪頭上，順著雲往後上方排開
    for (let i = 0; i < 5; i++) {
      const k = 0.08 + i * 0.19;
      const r = (7 + Math.sin(Math.min(1, k * 1.4) * PI) * 8) * (1 - k * 0.35);
      const a = -PI / 2 - 0.5 + k * 0.7;
      dr.push([20 - k * 78 + Math.sin(t * 1.6 - k * 4) * 2 * k, by - 14 - Math.sin(k * PI * 0.9) * 20 - k * 10 - r - 3, a]);
    }
    const seq = (1 - beat) * 5;
    const litOf = (i) => (dead ? 0 : beat > 0.02 ? Math.max(0, 1 - Math.abs(seq - i) * 0.9) * 0.6 + beat * 0.4 : 0.08 + 0.08 * Math.sin(t * 4 + i));
    // 雲本體（連著每面鼓的根部一團雲，蓋住鼓的下半：鼓是從雲裡凝出來的）
    stormCloud(ctx, mcs, '#2a336c', P4.indD, P4.teal, 2.4, () => {
      // 雲裡的金色電脈
      ctx.save();
      ctx.globalAlpha *= 0.55 + charge * 0.3;
      inazuma(ctx, -34, by - 12, -18, by - 22, 3, 2.2, RJ_GOLD, 1.3);
      inazuma(ctx, -6, by - 24, 12, by - 18, 3, 2.2, RJ_GOLD, 1.3);
      inazuma(ctx, -20, by - 6, -4, by - 14, 2, 2, P4.goldS, 1.1);
      ctx.restore();
      [[-24, by - 22, 5, 1], [3, by - 26, 5, -1], [-38, by - 10, 4, 1]].forEach((q) => curl(ctx, q[0], q[1], q[2], q[3], P4.indL, 1.3));
    });
    // 鼓與鼓之間的電光（平常淡淡劈啪，擂鼓時很亮）
    if (!dead) for (let i = 0; i < 4; i++) bolt(ctx, dr[i][0], dr[i][1], dr[i + 1][0], dr[i + 1][1], flick * 3 + i, 4, P4.tealL, 1.4, beat > 0.02 ? 0.4 + beat * 0.6 : Math.sin(t * 7 + i * 2) > 0.7 ? 0.5 : 0);
    dr.forEach((d, i) => {
      const lit = litOf(i);
      ctx.save();
      ctx.translate(d[0], d[1] + Math.sin(t * 1.8 - i * 0.6) * 1);
      ctx.rotate(d[2] + PI / 2 + (lit > 0.5 ? Math.sin(t * 40 + i) * 0.05 : 0));
      if (lit > 0.15) glowH(ctx, 0, -3, 15, P4.goldL, lit * 0.7);
      A.shape(ctx, (c) => { c.moveTo(-8, -3); c.quadraticCurveTo(-9.5, 2.5, -8, 6); c.lineTo(8, 6); c.quadraticCurveTo(9.5, 2.5, 8, -3); c.closePath(); }, P4.verm, P4.vermS, { lw: 2, shadeY: 2.5 });
      ctx.fillStyle = A.c(RJ_GOLD);
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        ctx.moveTo(-4.5 + j * 3 + 0.9, 4);
        ctx.arc(-4.5 + j * 3, 4, 0.9, 0, TAU);
      }
      ctx.fill();
      A.shape(ctx, (c) => c.ellipse(0, -3, 8.5, 4, 0, 0, TAU), mixq(P4.snow, '#ffffff', lit), P4.snowS, { lw: 1.9, shadeY: -1.5 });
      tomoe(ctx, 0, -3, 3.3, i * 0.8 + (lit > 0.5 ? t * 6 : 0), P4.gold);
      ctx.restore();
    });
    // 每面鼓的根部再湧一小團雲（鼓是從雲裡凝出來的）
    const bases = [];
    dr.forEach((d, i) => {
      bases.push([d[0] - Math.cos(d[2]) * 6 - 4, d[1] - Math.sin(d[2]) * 6 + 3, 6.5 + bl(i + 2) * 0.4]);
      bases.push([d[0] - Math.cos(d[2]) * 6 + 4, d[1] - Math.sin(d[2]) * 6 + 4, 6 + bl(i + 3) * 0.4]);
    });
    stormCloud(ctx, bases, '#2a336c', P4.indD, P4.teal, 2.2, null);

    // ── 閃電尾巴（金色鋸齒、慢半拍擺動） ──
    const tail = [[-32, -40], [-44, -44], [-39, -51], [-54, -54], [-48, -61], [-64, -66]];
    const tw = Math.sin(t * 3 - 0.8) * 2.5;
    ctx.save();
    ctx.translate(0, dip * 0.5 + bob);
    const tailFn = (q) => {
      const f = q * (tail.length - 1);
      const i = Math.min(tail.length - 2, Math.floor(f));
      const v = f - i;
      return [tail[i][0] + (tail[i + 1][0] - tail[i][0]) * v + tw * q, tail[i][1] + (tail[i + 1][1] - tail[i][1]) * v];
    };
    if (!dead) glowH(ctx, -52, -60, 18, RJ_GOLD, 0.3 + beat * 0.4);
    rimShape(ctx, (c) => taper(c, tailFn, (q) => 9 - q * 7, 25), RJ_GOLD, P4.goldS, P4.goldL, { cel: 1.5, rim: 1, lw: 2 });
    ctx.restore();

    // ── 腳：粗壯的虎腳，對角步態；擂鼓時近側前腳重踏 ──
    const leg = (front, near, ph2) => {
      const g = gaitFoot(u + ph2, stride, 6);
      const stomp = front && near ? beat : 0;
      const x0 = front ? (near ? 22 : 26) : near ? -22 : -18;
      const fxp = x0 + (front ? 2 : 0) + g[0] + stomp * 4;
      const fyp = -g[1] - (stomp > 0.2 ? (1 - beat) * 7 : 0);
      const col = near ? B[0] : '#27306a';
      const sh = near ? B[1] : '#171d44';
      const rim = near ? B[2] : null;
      if (front) {
        const top = [x0, by + 6];
        const wr = [fxp - 1 + g[2] * 2, fyp - 7 + g[2]];
        const el = ik(top[0], top[1], wr[0], wr[1], 15, 13, -1);
        legMass(ctx, [x0 + 1, by + 2, 10, 13, -0.15], [top, el, wr, [fxp, fyp - 2]], [17, 11, 8.5, 8], col, sh, rim, { lw: 2.3, inner: near ? () => inazuma(ctx, x0 - 5, by - 3, x0 + 4, by + 10, 3, 2.2, RJ_GOLD, 1.4) : null });
      } else {
        const top = [x0, by + 5];
        const hock = [fxp - 8 + g[2] * 3, fyp - 12 + g[2] * 1.5];
        const knee = ik(top[0], top[1], hock[0], hock[1], 14, 13, 1);
        legMass(ctx, [x0 - 1, by + 1, 12, 13, 0.35], [top, knee, hock, [fxp - 1, fyp - 2]], [17, 10.5, 7, 7], col, sh, rim, { lw: 2.3, inner: near ? () => inazuma(ctx, x0 - 9, by - 4, x0 + 2, by + 10, 3, 2.2, RJ_GOLD, 1.4) : null });
      }
      pawFoot(ctx, fxp, fyp, 14, 7, col, sh, { rot: -g[2] * 0.5, claw: P4.goldL, lw: 2.1 });
      if (near && !dead) glowStroke(ctx, (c) => { c.moveTo(fxp - 6, fyp - 9); c.lineTo(fxp - 10, fyp - 12); c.lineTo(fxp - 7, fyp - 13); c.lineTo(fxp - 12, fyp - 17); }, P4.tealL, 1.3, '143,217,207', charge);
      if (stomp > 0.6) {
        ctx.save();
        ctx.globalAlpha *= (stomp - 0.6) * 2.5;
        rays(ctx, fxp + 2, 0, 7, 4, 18, 1.5, PI, 'rgba(253,233,168,0.9)');
        ctx.restore();
      }
    };
    leg(false, false, 0);
    leg(true, false, PI);
    // ── 身體：厚肩、深胸的虎身，金色稻妻虎紋 ──
    const bodyP = (c) => c.ellipse(-5, by, 28, 16.5, -0.05, 0, TAU);
    const chestP = (c) => c.ellipse(19, by - 3, 16, 19, 0.15, 0, TAU);
    blob(ctx, [bodyP, chestP], B[0], B[1], B[2], { cel: 4, rim: 1.8, lw: 2.6, inner: () => {
      ctx.fillStyle = A.c(RJ_BELLY[0]);
      ctx.beginPath();
      ctx.ellipse(2, by + 13, 24, 6, 0, 0, TAU);
      ctx.fill();
      furField(ctx, -8, by - 5, 20, 6, 12, PI * 0.9, 6, B[1], 1.1, 5);
      // 虎紋：一道道從背脊往下的金色稻妻
      [-24, -14, -4, 6].forEach((x, i) => inazuma(ctx, x, by - 15, x - 3 + (i % 2) * 2, by + 6, 3, 2.3, RJ_GOLD, 1.8));
    } });
    // 雪白的胸毛
    A.shape(ctx, (c) => { c.moveTo(24, by - 16); c.quadraticCurveTo(38, by - 10, 34, by + 6); c.lineTo(30, by + 3); c.lineTo(29, by + 11); c.lineTo(25, by + 6); c.lineTo(22, by + 13); c.lineTo(19, by + 5); c.quadraticCurveTo(15, by - 6, 24, by - 16); c.closePath(); }, P4.snow, P4.snowS, { lw: 1.9, shadeY: by + 4 });
    // 身上的電光（隨時劈啪）
    if (!dead && (Math.sin(t * 9) > 0.6 || beat > 0.3)) bolt(ctx, -30, by + 4, -12, by + 12, flick, 3, P4.tealL, 1.1, 0.8);
    leg(false, true, PI);
    leg(true, true, 0);
    // ── 頭：高傲的劍齒虎頭（怒吼時仰起、張嘴） ──
    const hx = 40;
    const hy = by - 16 - bob * 0.6 + (roar ? -2 : 0);
    ctx.save();
    ctx.translate(hx - 6, hy + 6);
    ctx.rotate(roar ? -0.22 : walk ? Math.sin(u * 2 + 0.8) * 0.03 : 0);
    ctx.translate(-(hx - 6), -(hy + 6));
    // 耳
    A.shape(ctx, (c) => { c.moveTo(hx - 6, hy - 7); c.quadraticCurveTo(hx - 13, hy - 17, hx - 5, hy - 17); c.quadraticCurveTo(hx - 1, hy - 13, hx - 1, hy - 9); c.closePath(); }, B[0], B[1], { lw: 1.9, shadeY: hy - 11 });
    // 下顎（怒吼時大張）
    const jaw = roar ? 1 : 0.15;
    A.shape(ctx, (c) => { c.moveTo(hx + 1, hy + 6); c.lineTo(hx + 18, hy + 7 + jaw * 5); c.quadraticCurveTo(hx + 16, hy + 12 + jaw * 7, hx + 2, hy + 12 + jaw * 3); c.closePath(); }, P4.snow, P4.snowS, { lw: 2, shadeY: hy + 11 + jaw * 3 });
    if (roar) A.shape(ctx, (c) => { c.moveTo(hx + 3, hy + 7); c.lineTo(hx + 17, hy + 8.5); c.lineTo(hx + 4, hy + 11.5); c.closePath(); }, P4.mouth, null, { noStroke: true });
    const headP = (c) => {
      c.moveTo(hx - 10, hy + 7);
      c.quadraticCurveTo(hx - 13, hy - 10, hx + 1, hy - 12);
      c.quadraticCurveTo(hx + 11, hy - 12, hx + 14, hy - 5);
      c.quadraticCurveTo(hx + 22, hy - 3, hx + 22, hy + 3);
      c.quadraticCurveTo(hx + 21, hy + 8, hx + 13, hy + 8);
      c.quadraticCurveTo(hx + 1, hy + 11, hx - 10, hy + 7);
      c.closePath();
    };
    rimShape(ctx, headP, B[0], B[1], B[2], { cel: 2.6, rim: 1.5, lw: 2.4, inner: () => {
      // 雪白的口吻與頰毛
      ctx.fillStyle = A.c(P4.snow);
      ctx.beginPath();
      ctx.ellipse(hx + 14, hy + 4, 8.5, 5, 0, 0, TAU);
      ctx.fill();
      // 臉上的金色稻妻紋
      ctx.fillStyle = A.c(RJ_GOLD);
      ctx.beginPath();
      poly(ctx, [[hx - 7, hy - 6], [hx + 1, hy - 3], [hx - 2, hy - 1.5], [hx + 5, hy + 1], [hx - 4, hy + 0.5], [hx - 1.5, hy - 1.5]]);
      ctx.fill();
    } });
    // 劍齒（從上顎往下伸）
    const fang2 = (x, L) => A.shape(ctx, (c) => { c.moveTo(x - 1.8, hy + 6.5); c.quadraticCurveTo(x - 1.2, hy + 6.5 + L * 0.6, x + 0.6, hy + 6.5 + L); c.quadraticCurveTo(x + 1.6, hy + 6.5 + L * 0.5, x + 1.8, hy + 6.5); c.closePath(); }, '#ffffff', P4.snowS, { lw: 1.4, shadeY: hy + 6.5 + L * 0.6 });
    fang2(hx + 16, 10);
    fang2(hx + 10.5, 8);
    A.ellipse(ctx, hx + 21, hy + 0.5, 2.4, 1.8, P4.indD, null, { lw: 1, hl: false });
    // 眉上的金色短角
    const hornZ = (x, y, s2, col) => A.shape(ctx, (c) => poly(c, [[x, y], [x + 3 * s2, y], [x + 1 * s2, y - 4], [x + 3.5 * s2, y - 4], [x - 1.5 * s2, y - 11], [x + 0.3 * s2, y - 6.5], [x - 2.5 * s2, y - 6.5]]), col, P4.goldS, { lw: 1.6, shadeY: y - 4 });
    hornZ(hx + 2, hy - 10, 1, RJ_GOLD);
    hornZ(hx - 4, hy - 10, 0.9, P4.goldS);
    almondEye(ctx, hx + 8, hy - 3, 4.2, 2.4, RJ_GOLD, kind === 'normal' && roar ? 'angry' : kind, { slit: true, glow: dead ? null : P4.gold, ga: 0.35 + beat * 0.4, white: P4.goldL, lw: 2.1 });
    // 頰旁的白色鬃毛
    A.shape(ctx, (c) => { c.moveTo(hx - 7, hy - 2); c.lineTo(hx - 16, hy + 1); c.lineTo(hx - 10, hy + 3); c.lineTo(hx - 15, hy + 8); c.lineTo(hx - 7, hy + 7); c.lineTo(hx - 9, hy + 12); c.lineTo(hx - 1, hy + 8); c.closePath(); }, P4.snow, P4.snowS, { lw: 1.8, shadeY: hy + 6 });
    ctx.restore();
    // 擂鼓：閃電劈向地面
    if (!dead && beat > 0.3) {
      for (let i = 0; i < 3; i++) {
        const d = dr[1 + i];
        bolt(ctx, d[0], d[1] + 6, d[0] + (hash(flick + i) - 0.5) * 16, 0, flick + i * 5, 5, P4.goldL, 1.4, beat);
      }
    }
    ctx.restore();
  }
  // ── 影之芬里爾（shadowwolf）：北歐神話巨狼的幼體。深靛近黑的毛、月光般的淡青邊緣光，胸深腰細、頸上一圈厚鬃；
  //    背脊與尾尖燒著靛藍的鬼火（芯是淡青）、臉上朱色隈取；頸上留著扯斷魔鏈（格萊普尼爾）的烙印，一圈鏈環紋發著淡青光。
  //    影子會離開身體去咬人——那時本體變得半透明、腳下沒有影子 ──
  const FEN_FUR = ['#262b58', '#161a3a', P4.teal];
  const FEN_BELLY = '#465196';
  const FEN_RGB = '#6f7fe0';
  const WOLF_BOX = [-80, -100, 176, 108];
  // 地上的狼影（頭在 -x；zone wolfshadow 用）
  function wolfShadowShape(ctx, t, a, eyes) {
    ctx.save();
    ctx.globalAlpha *= a;
    const wob = (i) => Math.sin(t * 5 + i) * 1.2;
    const path = (c) => {
      c.moveTo(40, -1);
      c.quadraticCurveTo(26, -8 + wob(0), 30, -14 + wob(1));
      c.quadraticCurveTo(18, -8, 8, -6);
      c.quadraticCurveTo(-10, -9 + wob(4), -26, -6);
      c.lineTo(-30, -12 + wob(2));
      c.lineTo(-33, -7);
      c.lineTo(-38, -15 + wob(3));
      c.lineTo(-40, -7);
      c.quadraticCurveTo(-52, -7, -60, -3);
      c.quadraticCurveTo(-56, 1, -44, 1);
      c.quadraticCurveTo(0, 4, 40, -1);
      c.closePath();
    };
    glowH(ctx, -10, -3, 48, FEN_RGB, 0.28);
    ctx.fillStyle = A.c('#10132e');
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.strokeStyle = A.c(P4.teal);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 影子頸上的斷鏈
    ctx.strokeStyle = A.c('#5d6aa8');
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-24 + i * 6, -2 + (i % 2), 2.8, 1.6, 0, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const q = (t * 1.3 + i / 5) % 1;
      const x = -30 + i * 14 + Math.sin(t * 2 + i) * 3;
      spiritFlame(ctx, x, -4 - q * 8, 2.6 * (1 - q * 0.4), 10 * (1 - q * 0.4), Math.sin(t * 6 + i) * 1.5, '#3d4cc0', P4.tealL, null, (1 - q) * 0.9);
    }
    if (eyes) {
      glowH(ctx, -48, -5, 12, P4.goldL, 0.8);
      ctx.fillStyle = A.c(P4.goldL);
      ctx.beginPath();
      ctx.ellipse(-51, -4.5, 2.8, 1.4, -0.25, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-44.5, -5.3, 2.8, 1.4, 0.25, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // 鬼火（靛藍的火，不描邊、內芯淡青；圖示也用）
  function shadowFlame(ctx, x, y, w, h, sway, a) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    glowH(ctx, x, y - h * 0.4, h * 0.8, FEN_RGB, 0.22);
    ctx.fillStyle = A.c('#27308a');
    ctx.beginPath();
    flamePath(ctx, x, y, w, h, sway);
    flamePath(ctx, x - w * 0.5, y + 1, w * 0.7, h * 0.7, sway * 1.4 - 2);
    ctx.fill();
    ctx.strokeStyle = A.c('#5a6ae0');
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = A.c(P4.teal);
    ctx.beginPath();
    flamePath(ctx, x + sway * 0.1, y - w * 0.15, w * 0.5, h * 0.55, sway * 0.5);
    ctx.fill();
    ctx.restore();
  }
  // 一個鐵鏈環（側面：扁長的環；broken＝斷開的 C 形）
  function chainLink(ctx, x, y, rot, s, broken) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.lineCap = 'round';
    const p = () => {
      ctx.beginPath();
      if (broken) ctx.ellipse(0, 0, 4.2 * s, 2.4 * s, 0, 0.7, TAU - 0.5);
      else ctx.ellipse(0, 0, 4.2 * s, 2.4 * s, 0, 0, TAU);
    };
    p();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.4 * s;
    ctx.stroke();
    p();
    ctx.strokeStyle = A.c('#7d86b0');
    ctx.lineWidth = 1.8 * s;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.2 * s, 2.4 * s, 0, PI * 1.1, PI * 1.6);
    ctx.strokeStyle = A.c('#e4e8f6');
    ctx.lineWidth = 0.9 * s;
    ctx.stroke();
    ctx.restore();
  }
  function wolfPose(ctx, m, o) {
    const t = m.t || 0;
    const kind = eyeKind(m);
    const dead = !!m.dead;
    const F = FEN_FUR;
    const moving = o.u != null;
    const u = moving ? o.u : 0;
    const cr = o.crouch || 0;
    const lunge = o.lunge || 0;
    const fl = dead ? 0 : 1;
    const bob = moving ? Math.cos(u * 2) * 1.4 : Math.sin(t * 2.2) * 0.6;
    const roll = moving ? Math.sin(u) * 0.015 : 0;
    const by = -36 + cr * 5 + bob;
    const chestX = 14 + lunge * 6;
    const hipX = -17 - lunge * 3;
    ctx.save();
    ctx.translate(0, by);
    ctx.rotate(roll - lunge * 0.06 + cr * 0.05);
    ctx.translate(0, -by);
    // ── 尾巴：蓬鬆的狼尾（慢半拍擺動），尾尖燒成鬼火 ──
    const tw = Math.sin(t * 3 - 0.9) * 3 + (moving ? Math.sin(u - 1) * 2 : 0);
    const tailFn = cb(hipX - 6, by - 5, hipX - 17, by - 1, hipX - 26 + tw * 0.4, by + 13 - cr * 4, hipX - 36 + tw, by + 6 - cr * 6);
    const tp = tailFn(1);
    shadowFlame(ctx, tp[0] + 1, tp[1] + 4, 5, 18, -4 + Math.sin(t * 8) * 2, fl);
    rimShape(ctx, (c) => taper(c, tailFn, (s) => 8 + Math.sin(s * PI) * 11 - s * 4, 16), F[0], F[1], F[2], { cel: 3, rim: 1.3, lw: 2.3, inner: () => {
      brushHair(ctx, tailFn, 0.1, 0.85, 7, 1.5, 6, PI + 0.2, F[1], 1, 4);
      ctx.fillStyle = A.c('#1d2a74');
      ctx.beginPath();
      taper(ctx, (s) => tailFn(0.78 + s * 0.22), 30, 6);
      ctx.fill();
    } });
    // 肌肉線：深色的肌肉分界＋一道淡青的高光（肩、前臂、大腿、頸）
    const muscle = (pts, hl) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = A.c('#10132c');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      pts.forEach((p) => {
        ctx.moveTo(p[0], p[1]);
        ctx.quadraticCurveTo(p[2], p[3], p[4], p[5]);
      });
      ctx.stroke();
      if (hl) {
        ctx.strokeStyle = A.c('#6a78c8');
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        hl.forEach((p) => {
          ctx.moveTo(p[0], p[1]);
          ctx.quadraticCurveTo(p[2], p[3], p[4], p[5]);
        });
        ctx.stroke();
      }
      ctx.restore();
    };
    // ── 腳：狼的關節腳（後腳有飛節的折角），對角小跑；站姿寬而有力 ──
    const stride = moving ? 8 : 0;
    const leg = (front, near, ph2) => {
      const g = gaitFoot(u + ph2, stride, 6);
      const col = near ? F[0] : '#1c2046';
      const sh = near ? F[1] : '#10132c';
      const rim = near ? F[2] : null;
      if (front) {
        const x0 = chestX + (near ? 2 : 6);
        const fxp = x0 + 5 + g[0] + lunge * 10;
        const fyp = -g[1] - lunge * 3;
        const top = [x0, by + 4];
        const wr = [fxp - 1.5 + g[2] * 2.5, fyp - 7 + g[2]];
        const el = ik(top[0], top[1], wr[0], wr[1], 14, 13, -1);
        const fn = legMass(ctx, [x0, by + 1, 9, 12.5, -0.2], [top, el, wr, [fxp, fyp - 2]], [15, 8.5, 6, 6], col, sh, rim, { lw: 2.2, inner: near ? () => muscle(
          [[x0 - 7, by - 6, x0 - 1, by + 2, x0 + 6, by - 3], [x0 - 5, by + 4, x0 - 2, by + 9, x0 + 4, by + 11]],
          [[x0 - 5, by - 8, x0, by - 5, x0 + 5, by - 7]]) : null });
        if (near) {
          // 前臂的筋
          const a = along(fn, 0.42, 1.5);
          const b = along(fn, 0.62, 1);
          const c2 = along(fn, 0.5, -1.8);
          muscle([[a[0], a[1], c2[0], c2[1], b[0], b[1]]], [[along(fn, 0.45, -1.5)[0], along(fn, 0.45, -1.5)[1], along(fn, 0.55, -2.2)[0], along(fn, 0.55, -2.2)[1], along(fn, 0.66, -1.4)[0], along(fn, 0.66, -1.4)[1]]]);
        }
        pawFoot(ctx, fxp, fyp, 10, 5.5, col, sh, { rot: -g[2] * 0.6, claw: '#dfe3f5', lw: 1.9 });
      } else {
        const x0 = hipX + (near ? 0 : 4);
        const fxp = x0 - 1 + g[0] - lunge * 5;
        const fyp = -g[1];
        const top = [x0, by + 3];
        const hock = [fxp - 8 + g[2] * 3, fyp - 11 + g[2] * 1.5];
        const knee = ik(top[0], top[1], hock[0], hock[1], 13, 12, 1);
        const fn = legMass(ctx, [x0 - 1, by, 11.5, 13.5, 0.35], [top, knee, hock, [fxp - 1, fyp - 2]], [16, 9.5, 5.8, 5.6], col, sh, rim, { lw: 2.2, inner: near ? () => muscle(
          [[x0 - 10, by - 6, x0 - 2, by - 2, x0 + 2, by + 10], [x0 + 3, by - 8, x0 + 8, by, x0 + 5, by + 9], [x0 - 8, by + 5, x0 - 4, by + 11, x0 - 1, by + 12]],
          [[x0 - 8, by - 9, x0 - 1, by - 7, x0 + 5, by - 9]]) : null });
        if (near) {
          // 小腿後側的跟腱
          const a = along(fn, 0.48, -1.5);
          const b = along(fn, 0.72, -1.2);
          const c2 = along(fn, 0.6, 0.8);
          muscle([[a[0], a[1], c2[0], c2[1], b[0], b[1]]], null);
        }
        pawFoot(ctx, fxp, fyp, 10, 5.5, col, sh, { rot: -g[2] * 0.5, claw: '#dfe3f5', lw: 1.9 });
      }
    };
    leg(false, false, 0);
    leg(true, false, PI);
    // ── 背上的鬼火鬃（在身體後面） ──
    for (let i = 0; i < 6; i++) {
      const k = i / 5;
      const x = chestX + 4 - k * 34;
      const y = by - 12 + k * 2;
      const h = (20 - k * 9) * (1 + 0.15 * Math.sin(t * 7 + i * 1.3));
      shadowFlame(ctx, x, y, 4.6 - k * 1.3, h, -6 - Math.sin(t * 5 - i * 0.6) * 2.5, fl);
    }
    if (!dead) glowH(ctx, 10, by - 20, 36, FEN_RGB, 0.2);
    // ── 身體：深胸、細腰 ──
    const spine = cb(hipX - 2, by - 1, hipX + 12, by - 4, chestX - 14, by - 6, chestX, by - 2);
    const bodyP = (c) => taper(c, spine, (s) => 21 - Math.sin(s * PI) * 5 + s * 5, 16);
    const hipP = (c) => c.ellipse(hipX, by - 1, 11.5, 11, 0, 0, TAU);
    const chestP = (c) => c.ellipse(chestX, by, 14, 15.5, 0.25, 0, TAU);
    blob(ctx, [bodyP, hipP, chestP], F[0], F[1], F[2], { cel: 3.5, rim: 1.8, lw: 2.5, inner: () => {
      ctx.fillStyle = A.c(FEN_BELLY);
      ctx.beginPath();
      ctx.ellipse(chestX - 2, by + 9, 12, 6, 0.2, 0, TAU);
      ctx.fill();
      brushHair(ctx, spine, 0.05, 0.95, 12, -4, 6, PI - 0.1, '#3a4280', 1, 9);
      // 胸肌、肋與腹側的肌肉線
      muscle([[chestX - 10, by - 9, chestX - 3, by + 4, chestX + 8, by + 11], [chestX - 16, by - 2, chestX - 18, by + 6, chestX - 12, by + 11], [hipX + 10, by - 4, hipX + 16, by + 4, hipX + 14, by + 10]],
        [[chestX - 8, by - 12, chestX, by - 9, chestX + 8, by - 12], [hipX + 4, by - 10, hipX + 12, by - 11, hipX + 18, by - 8]]);
      // 肩上的符文刻痕（淡青光）
      if (!dead) glowStroke(ctx, (c) => { c.moveTo(chestX - 8, by - 6); c.lineTo(chestX - 8, by + 3); c.moveTo(chestX - 8, by - 3); c.lineTo(chestX - 4, by - 7); c.moveTo(hipX + 2, by - 5); c.lineTo(hipX + 5, by + 2); c.lineTo(hipX + 8, by - 5); }, P4.tealL, 1.1, '143,217,207', 0.45 + 0.3 * Math.sin(t * 4));
    } });
    // ── 近側的腳 ──
    leg(false, true, PI);
    leg(true, true, 0);
    // ── 頸上的厚鬃（一片片尖毛，往後流） ──
    const hx = chestX + 21 + lunge * 6;
    const hy = by - 16 + cr * 6 + lunge * 5 - bob * 0.5;
    const rs = Math.sin(t * 3 - 0.6) * 0.8;
    const ruffP = (c) => {
      c.moveTo(chestX + 10, by + 10);
      c.lineTo(chestX + 1, by + 12 + rs);
      c.lineTo(chestX + 3, by + 6);
      c.lineTo(chestX - 7, by + 5 + rs);
      c.lineTo(chestX - 2, by);
      c.lineTo(chestX - 11, by - 5 + rs);
      c.lineTo(chestX - 3, by - 8);
      c.lineTo(chestX - 9, by - 15 + rs);
      c.lineTo(chestX + 3, by - 14);
      c.quadraticCurveTo(hx - 6, hy - 10, hx - 4, hy + 2);
      c.quadraticCurveTo(hx - 2, by + 6, chestX + 10, by + 10);
      c.closePath();
    };
    rimShape(ctx, ruffP, '#353d7c', F[1], F[2], { cel: 2.6, rim: 1.4, lw: 2.2, inner: () => strands(ctx, [[chestX - 3, by - 9, PI + 0.4, 7], [chestX - 1, by - 2, PI + 0.2, 7], [chestX + 3, by + 5, PI - 0.1, 6]], F[1], 1) });
    // 頸部的筋腱（從胸口往頭後拉）
    muscle([[chestX + 2, by - 8, chestX + 9, by - 14, hx - 8, hy + 3], [chestX + 6, by - 2, chestX + 13, by - 8, hx - 5, hy + 8]], [[chestX + 3, by - 11, chestX + 10, by - 17, hx - 9, hy - 1]]);
    // ── 頭 ──
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-lunge * 0.05 + cr * 0.15 + (moving ? Math.sin(u * 2 + 0.9) * 0.03 : 0));
    ctx.scale(1.15, 1.15);
    const open = lunge > 0 || o.bite ? 1 : 0;
    // 耳朵（遠）
    A.shape(ctx, (c) => { c.moveTo(-9, -5); c.lineTo(-15, -20); c.lineTo(-3, -9); c.closePath(); }, F[1], null, { lw: 1.9 });
    if (open) {
      A.shape(ctx, (c) => { c.moveTo(1, 5); c.lineTo(22, 9.5); c.quadraticCurveTo(18, 16.5, 2, 12); c.closePath(); }, F[1], null, { lw: 2.1 });
      A.shape(ctx, (c) => { c.moveTo(2, 6); c.lineTo(20, 9.8); c.lineTo(4, 10.5); c.closePath(); }, P4.mouth, null, { noStroke: true });
      fang(ctx, 17, 9.4, 3, true);
      fang(ctx, 11, 8.6, 2.4, true);
    }
    const headP = (c) => {
      c.moveTo(-11, 6);
      c.quadraticCurveTo(-13, -8, -1, -9);
      c.quadraticCurveTo(8, -9, 12, -4);
      c.lineTo(23, 1);
      c.quadraticCurveTo(25.5, 5, 21, 6.5);
      c.quadraticCurveTo(6, 11, -11, 6);
      c.closePath();
    };
    rimShape(ctx, headP, '#2f3670', F[1], F[2], { cel: 2, rim: 1.5, lw: 2.4, inner: () => {
      ctx.fillStyle = A.c(FEN_BELLY);
      ctx.beginPath();
      ctx.moveTo(-2, 9);
      ctx.quadraticCurveTo(6, 2, 25, 3);
      ctx.lineTo(25, 12);
      ctx.closePath();
      ctx.fill();
      // 朱色隈取：從眼尾往後上方、沿著口吻一道
      ctx.fillStyle = A.c(P4.verm);
      ctx.beginPath();
      ctx.moveTo(12, -3.5);
      ctx.quadraticCurveTo(3, -9.5, -9, -6);
      ctx.quadraticCurveTo(2, -5.2, 11, -1.2);
      ctx.closePath();
      ctx.moveTo(22, 1.5);
      ctx.quadraticCurveTo(14, -1.5, 9, 1.8);
      ctx.quadraticCurveTo(15, 0.8, 22, 3);
      ctx.closePath();
      ctx.fill();
    } });
    // 頰毛
    A.shape(ctx, (c) => { c.moveTo(-7, -2); c.lineTo(-17, 1); c.lineTo(-11, 3); c.lineTo(-17, 7); c.lineTo(-8, 7); c.lineTo(-11, 11); c.lineTo(-1, 8); c.closePath(); }, F[0], F[1], { lw: 1.9, shadeY: 5 });
    // 耳朵（近）
    const ew = Math.sin(t * 2.3 - 0.4) * 0.05;
    ctx.save();
    ctx.translate(-3, -7);
    ctx.rotate(ew);
    A.shape(ctx, (c) => { c.moveTo(-2, 1); c.lineTo(-4, -15); c.lineTo(6, -1); c.closePath(); }, F[0], F[1], { lw: 1.9, shadeY: -3 });
    ctx.fillStyle = A.c('#4a4f8e');
    ctx.beginPath();
    ctx.moveTo(-1, -1);
    ctx.lineTo(-2.5, -11);
    ctx.lineTo(3.5, -2);
    ctx.fill();
    ctx.restore();
    A.ellipse(ctx, 23, 2.5, 2.3, 1.8, '#0c0d1e', null, { lw: 0.9, hl: false });
    if (!open) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(21, 6);
      ctx.quadraticCurveTo(14, 8, 7, 6);
      ctx.stroke();
      fang(ctx, 15, 7.2, 2.4, false);
    }
    // 金色的狼眼（淡青鬼火光暈）
    // 純紅的眼：沒有瞳孔、虹膜與眼白，整顆發著紅光
    if (kind === 'normal' || kind === 'angry') {
      const ang = kind === 'angry' || open;
      const redEye = (c) => {
        c.moveTo(3.2, -1.4);
        c.quadraticCurveTo(7.5, -5.2 + (ang ? 1.6 : 0), 13, -3.2);
        c.quadraticCurveTo(8.5, 1.8, 3.2, -1.4);
        c.closePath();
      };
      glowH(ctx, 8, -2.2, 12, '#ff3030', 0.75);
      ctx.fillStyle = A.c('#ff2a2a');
      ctx.beginPath();
      redEye(ctx);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      redEye(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#ffb0a0');
      ctx.beginPath();
      ctx.ellipse(8, -2.8, 3.2, 1, -0.2, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2.5, -1.2);
      ctx.quadraticCurveTo(7.5, -5.6 + (ang ? 1.6 : 0), 14, -3.8);
      ctx.stroke();
    } else almondEye(ctx, 8, -2, 4.4, 2.3, P4.gold, kind, { lw: 2 });
    ctx.restore();
    // ── 斷掉的魔鏈留下的烙印：頸上一圈發淡青光的鏈環紋，最後一環裂開 ──
    const cx0 = hx - 12;
    const cy0 = hy + 8;
    const pulse = dead ? 0 : 0.55 + 0.3 * Math.sin(t * 4);
    ctx.save();
    ctx.lineCap = 'round';
    const links = [[cx0 - 3, cy0 - 9, 1.2], [cx0 - 1.5, cy0 - 3, 1.35], [cx0, cy0 + 3, 1.5], [cx0 + 1.5, cy0 + 9, 1.35]];
    links.forEach((q, i) => {
      const broken = i === links.length - 1;
      const pth = (c) => {
        if (broken) c.ellipse(q[0], q[1], 1.8, 3.2, q[2] - 1.2, 0.9, TAU - 0.6);
        else c.ellipse(q[0], q[1], 1.8, 3.2, q[2] - 1.2, 0, TAU);
      };
      if (pulse > 0) {
        ctx.strokeStyle = 'rgba(143,217,207,' + (0.35 * pulse).toFixed(3) + ')';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        pth(ctx);
        ctx.stroke();
      }
      ctx.strokeStyle = A.c(dead ? '#4a5390' : P4.tealL);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      pth(ctx);
      ctx.stroke();
    });
    ctx.restore();
    // 頸上的鬼火（蓋在頭後）
    shadowFlame(ctx, hx - 17, hy - 3, 3.5, 13, -6 - Math.sin(t * 6) * 2, fl);
    ctx.restore();
  }
  function shadowwolf(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const hurt = m.hurtT > 0;
    const walk = walking(m) && !m.dead;
    const gone = !!fx.shadowless;
    const spd = 9;
    const o = { u: walk ? t * spd : null, crouch: ph === 'wind' ? 1 : 0, lunge: ph === 'strike' ? 1 : 0, bite: ph === 'strike' };
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    if (gone) {
      // 影子離開了：本體變得半透明、冷靛色，身邊飄著影子的碎屑（姿勢量化成 6 格，用快取貼圖）
      const a = 0.42 + Math.sin(t * 6) * 0.06;
      const gi = walk ? ((Math.round((t * spd) / (TAU / 6)) % 6) + 6) % 6 : -1;
      const go = Object.assign({}, o, { u: gi < 0 ? null : (gi * TAU) / 6 });
      ghostDraw(ctx, WOLF_BOX, a, (g) => withTint('#7f8ae0', 0.35, () => wolfPose(g, m, go)), 'wf|' + (m.id || '') + '|' + o.crouch + o.lunge + '|' + gi + '|' + (m.dead ? 1 : 0) + (m.hurtT > 0 ? 1 : 0));
      ctx.save();
      ctx.fillStyle = A.c('#161a3a');
      const ga0 = ctx.globalAlpha;
      for (let i = 0; i < 5; i++) {
        const q = (t * 0.8 + i / 5) % 1;
        ctx.globalAlpha = ga0 * (1 - q) * 0.7;
        ctx.beginPath();
        ctx.ellipse(-30 + i * 16 + Math.sin(t + i) * 4, -10 - q * 50, 3 - q * 2, 2 - q, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    } else wolfPose(ctx, m, o);
    ctx.restore();
  }
  // ── 雪女（id 仍是 dreamsheep）：飄在雪地上方的雪之女。青白的肌膚、在風裡飄的烏黑長直髮、兩支冰簪，
  //    白底和服上有淡青與靛藍的雪結晶紋、靛色的腰帶繫著金色帶締；袖口與下擺化成飄散的雪（看不到腳）。
  //    平常半垂著眼、唇色淡淡的，呼出一絲白霜；施法（fx.puff）時舉起長袖、眼睛睜大發出淡青的光，
  //    從唇間吹出一長道閃著細光的睡意霜氣。死亡時整個人散成雪花 ──
  const YK = { skin: '#eef4fb', skinS: '#c4d0e8', hair: '#1c1d33', hairS: '#101122', hairL: '#44508a', lip: '#b7bfe0' };
  // 雲紋渦卷（雕刻的描線：一條弧線收成渦）
  function scrollMark(ctx, x, y, r, dir, rot, col, lw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = lw || 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 2.4, r * 0.6);
    ctx.quadraticCurveTo(-r * 1.4, -r * 0.2, -r * 0.2, r * 0.1);
    ctx.stroke();
    ctx.restore();
    curl(ctx, x + Math.cos(rot) * r * 0.2, y + Math.sin(rot) * r * 0.2, r, dir, col, lw || 1.4);
  }
  function yukiFlakes(ctx, x0, y0, w, h, n, t, a, seed) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = A.c('#ffffff');
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const q = (t * (0.3 + hash(seed + i) * 0.3) + hash(seed + i * 3.1)) % 1;
      const x = x0 + (hash(seed + i * 7.7) - 0.5) * w - q * 10 + Math.sin(t * 1.7 + i) * 3;
      const y = y0 - q * h;
      const r = (0.7 + hash(seed + i * 2.3) * 1.3) * (1 - q * 0.5);
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }
  // 梅花（五瓣，和服花紋用）
  function plum(ctx, x, y, r, col, core) {
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -PI / 2 + (i / 5) * TAU;
      const px = x + Math.cos(a) * r * 0.55;
      const py = y + Math.sin(a) * r * 0.55;
      ctx.moveTo(px + r * 0.45, py);
      ctx.arc(px, py, r * 0.45, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = A.c(core);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.22, 0, TAU);
    ctx.fill();
  }
  // 和服的整片花紋：大雪花、梅花、下緣的青海波（呼叫前先 clip 在衣服形狀裡）
  function kimonoPattern(ctx, x0, y0, w, h, waveY, seed, noWave) {
    // 下緣的青海波（靛／淡青）
    if (!noWave) seigaiha(ctx, x0, waveY, w, Math.min(14, y0 + h - waveY + 2), 5.2, P4.snow, P4.tealS, 0.85);
    else {
      // 袖子下緣：一道淡青的波紋線（省效能）
      ctx.strokeStyle = A.c(P4.tealS);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const x = x0 + (i * w) / 7;
        ctx.moveTo(x - 3, waveY + 3);
        ctx.arc(x, waveY + 3, 3, PI, TAU);
      }
      ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = A.c(P4.snow);
    ctx.fillRect(x0, waveY - 1, w, 5);
    ctx.restore();
    // 大朵雪結晶（靛）與小雪結晶（淡青、銀）
    for (let i = 0; i < 5; i++) {
      const x = x0 + (0.15 + hash(seed + i * 1.7) * 0.7) * w;
      const y = y0 + (0.1 + hash(seed + i * 3.3) * 0.62) * (waveY - y0);
      const big = i % 2 === 0;
      snowflake(ctx, x, y, big ? 4.2 : 2.6, big ? P4.indL : P4.tealS, big ? 1.2 : 0.9);
    }
    // 梅花（淡青花瓣＋金蕊，與銀白花瓣＋靛蕊）
    for (let i = 0; i < 4; i++) {
      const x = x0 + (0.1 + hash(seed + i * 5.1 + 9) * 0.8) * w;
      const y = y0 + (0.2 + hash(seed + i * 2.9 + 9) * 0.6) * (waveY - y0);
      plum(ctx, x, y, 2.6, i % 2 ? P4.teal : '#dfe6f4', i % 2 ? P4.gold : P4.ind);
    }
  }
  function dreamsheep(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const hurt = m.hurtT > 0;
    const dead = !!m.dead;
    const walk = walking(m) && !dead;
    const kind = eyeKind(m);
    const puffK = clamp(num(fx.puff, 0), 0, 1);
    const blowing = puffK > 0.05;
    const ph = phase(m);
    const cast = Math.max(puffK, ph === 'wind' ? 0.5 : 0, ph === 'strike' ? 0.8 : 0);
    const fl = Math.sin(t * 1.6) * 3;
    const wind = 1 + (walk ? 0.6 : 0) + cast * 0.4;
    const hw = (k, ph2) => Math.sin(t * 2.2 - k * 2.5 + (ph2 || 0)) * k;
    const sw = (k) => hw(k, 0.5) * wind * 0.8;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    ctx.translate(0, -6 + fl);
    if (walk) ctx.rotate(0.05);
    if (dead) ctx.globalAlpha *= 0.55;
    if (!dead) glowH(ctx, -6, -2, 40, P4.tealL, 0.35);
    const hx = 4;
    const hy = -84;
    // ── 後髮：烏黑直髮往後流、髮尾散開 ──
    const backHair = (c) => {
      c.moveTo(hx - 4, hy - 11);
      c.bezierCurveTo(hx - 14, hy - 10, hx - 17, hy + 2, hx - 17 + hw(2) * wind, hy + 20);
      c.bezierCurveTo(hx - 19 + hw(3, 0.3) * wind, hy + 36, hx - 27 + hw(5, 0.6) * wind, hy + 46, hx - 38 - wind * 6 + hw(7, 0.9), hy + 54);
      c.lineTo(hx - 32 - wind * 5 + hw(6, 1), hy + 49);
      c.lineTo(hx - 34 - wind * 6 + hw(7, 1.1), hy + 58);
      c.bezierCurveTo(hx - 20 + hw(4, 0.6), hy + 50, hx - 9, hy + 36, hx - 5, hy + 18);
      c.lineTo(hx + 3, hy - 3);
      c.closePath();
    };
    rimShape(ctx, backHair, YK.hair, YK.hairS, YK.hairL, { cel: 2.5, rim: 1.4, lw: 2.2, inner: () => {
      ctx.strokeStyle = A.c(YK.hairL);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(hx - 9 - i * 2, hy - 3 + i * 2);
        ctx.bezierCurveTo(hx - 14 - i * 2, hy + 10, hx - 16 - i * 2 + hw(3, 0.4) * wind, hy + 26, hx - 24 - i * 3 + hw(5, 0.8) * wind, hy + 44);
      }
      ctx.stroke();
    } });
    // ── 長長拖在身後的下擺（裡層：淡青的襦袢邊） ──
    const trainP = (c) => {
      c.moveTo(hx - 14, hy + 40);
      c.quadraticCurveTo(hx - 34, hy + 64, hx - 54 + sw(5) - wind * 4, hy + 80);
      c.quadraticCurveTo(hx - 44 + sw(5), hy + 84, hx - 36 + sw(4), hy + 86);
      c.lineTo(hx - 8, hy + 82);
      c.closePath();
    };
    rimShape(ctx, trainP, '#dfe4f2', P4.snowS, null, { cel: 2.4, lw: 2.1, inner: () => {
      ctx.save();
      ctx.beginPath();
      trainP(ctx);
      ctx.clip();
      seigaiha(ctx, hx - 62, hy + 74, 60, 12, 5.2, '#dfe4f2', P4.teal, 0.8);
      ctx.restore();
    } });
    yukiFlakes(ctx, hx - 44, hy + 86, 30, 22, 8, t, 0.9, 5);
    // ── 和服主體：寬大的振袖和服，下擺往後飄、化成雪 ──
    const robeP = (c) => {
      c.moveTo(hx - 10, hy + 12);
      c.quadraticCurveTo(hx - 24, hy + 40, hx - 32 + sw(2), hy + 68);
      c.quadraticCurveTo(hx - 38 + sw(4), hy + 76, hx - 44 + sw(4) - wind * 3, hy + 82);
      c.quadraticCurveTo(hx - 32 + sw(3), hy + 80, hx - 26 + sw(3), hy + 80);
      c.quadraticCurveTo(hx - 26 + sw(4), hy + 84, hx - 29 + sw(4), hy + 89);
      c.quadraticCurveTo(hx - 17 + sw(3), hy + 84, hx - 11 + sw(3), hy + 81);
      c.quadraticCurveTo(hx - 11 + sw(3), hy + 86, hx - 12 + sw(3), hy + 91);
      c.quadraticCurveTo(hx - 1 + sw(2), hy + 85, hx + 4 + sw(2), hy + 81);
      c.quadraticCurveTo(hx + 8 + sw(2), hy + 85, hx + 10 + sw(2), hy + 88);
      c.quadraticCurveTo(hx + 18 + sw(1), hy + 82, hx + 22 + sw(1), hy + 76);
      c.quadraticCurveTo(hx + 22, hy + 44, hx + 11, hy + 12);
      c.closePath();
    };
    rimShape(ctx, robeP, P4.snow, P4.snowS, '#ffffff', { cel: 3, rim: 1.5, lw: 2.4, inner: () => {
      kimonoPattern(ctx, hx - 48, hy + 36, 74, 56, hy + 70, 3);
      // 下擺往下漸漸變成雪
      const gr = ctx.createLinearGradient(0, hy + 74, 0, hy + 92);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(255,255,255,0.95)');
      ctx.fillStyle = gr;
      ctx.fillRect(hx - 50, hy + 74, 80, 20);
      // 衣褶
      ctx.strokeStyle = A.c(P4.snowS);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy + 36);
      ctx.quadraticCurveTo(hx - 10, hy + 58, hx - 18 + sw(3), hy + 80);
      ctx.moveTo(hx + 8, hy + 38);
      ctx.quadraticCurveTo(hx + 8, hy + 60, hx + 6 + sw(2), hy + 80);
      ctx.stroke();
      // 前襟的重疊（右衽）：淡青與靛的內襟邊一路往下
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = A.c(P4.teal);
      ctx.beginPath();
      ctx.moveTo(hx + 9, hy + 34);
      ctx.quadraticCurveTo(hx + 12, hy + 60, hx + 16 + sw(1), hy + 80);
      ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = A.c(P4.ind);
      ctx.beginPath();
      ctx.moveTo(hx + 7, hy + 34);
      ctx.quadraticCurveTo(hx + 10, hy + 60, hx + 13 + sw(1), hy + 80);
      ctx.stroke();
    } });
    yukiFlakes(ctx, hx - 10, hy + 92, 44, 26, 12, t, 0.9, 3);
    // ── 腰帶：靛色、金色麻葉紋，繫著金色帶締；背後打成一個大蝴蝶結（隨風飄） ──
    const bowX = hx - 14;
    const bowY = hy + 30;
    const bw = hw(1.5, 0.3);
    const bowP = (c) => {
      c.moveTo(bowX, bowY);
      c.quadraticCurveTo(bowX - 10 + bw, bowY - 14, bowX - 16 + bw, bowY - 6);
      c.quadraticCurveTo(bowX - 12, bowY - 1, bowX, bowY);
      c.quadraticCurveTo(bowX - 12, bowY + 2, bowX - 15 + bw, bowY + 9);
      c.quadraticCurveTo(bowX - 7 + bw, bowY + 12, bowX, bowY);
      c.closePath();
    };
    rimShape(ctx, bowP, P4.indL, P4.ind, '#8b98d6', { cel: 2, rim: 1, lw: 1.9 });
    // 垂下的兩條帶尾
    rimShape(ctx, (c) => taper(c, cb(bowX - 2, bowY + 2, bowX - 6, bowY + 12, bowX - 10 + bw, bowY + 20, bowX - 16 + hw(3) * wind, bowY + 30), (s) => 5 - s * 1.5, 10), P4.ind, P4.indS, P4.indL, { cel: 1.4, rim: 0.9, lw: 1.7 });
    A.shape(ctx, (c) => c.ellipse(bowX, bowY, 3.2, 3.8, 0, 0, TAU), P4.gold, P4.goldS, { lw: 1.4, cel: [1, 1] });
    const obiP = (c) => { c.moveTo(hx - 15, hy + 25); c.quadraticCurveTo(hx, hy + 23, hx + 14, hy + 24); c.lineTo(hx + 15, hy + 35); c.quadraticCurveTo(hx, hy + 34, hx - 16, hy + 37); c.closePath(); };
    withClip(ctx, obiP, P4.ind, null, { lw: 2 }, () => {
      // 金色的麻葉（六角星）紋
      ctx.strokeStyle = A.c(P4.goldS);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const x = hx - 12 + i * 6.5;
        const y = hy + 30 + (i % 2) * 1.5;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU;
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2);
        }
      }
      ctx.stroke();
      ctx.fillStyle = A.c(P4.indS);
      ctx.fillRect(hx - 20, hy + 33, 40, 5);
    }, 2);
    // 帶締（金色細繩）＋帶留（淡青的冰珠）
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx - 15, hy + 31.5);
    ctx.quadraticCurveTo(hx, hy + 29.5, hx + 14.5, hy + 30.5);
    ctx.stroke();
    ctx.strokeStyle = A.c(P4.gold);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    A.shape(ctx, (c) => c.ellipse(hx + 6, hy + 30.2, 2.6, 2, 0, 0, TAU), P4.tealL, P4.teal, { lw: 1.2, shadeY: hy + 31 });
    // ── 振袖：兩層（外白、內淡青、袖口靛），長長垂下、尾端往後飄成雪；吹氣時舉到唇邊 ──
    const sleeve = (near) => {
      const lift = puffK;
      const sx = hx + (near ? 6 : -6);
      const sy = hy + 14;
      const ex = sx + (near ? 15 : 6) + lift * 1;
      const ey = sy + 17 - lift * 20;
      const drop = 30 - lift * 8;
      const S = (c, g) => {
        c.moveTo(sx - 4, sy - 2);
        c.quadraticCurveTo(ex - 2, ey - 6, ex + 3, ey - 1);
        c.lineTo(ex + 1 + g, ey + 7);
        c.quadraticCurveTo(ex - 2 + sw(2), ey + drop * 0.7, ex - 12 + sw(4) - wind * 2, ey + drop);
        c.quadraticCurveTo(ex - 16 + sw(4), ey + drop - 4, ex - 22 + sw(5) - wind * 3, ey + drop - 2);
        c.quadraticCurveTo(sx - 10, sy + 22, sx - 7, sy + 4);
        c.closePath();
      };
      const col = near ? P4.snow : '#dde2f0';
      // 內層（淡青）稍微露在外層下緣
      A.shape(ctx, (c) => { c.save(); c.translate(1.5, 3); S(c, 1); c.restore(); }, P4.teal, P4.tealS, { lw: 1.8, shadeY: ey + drop * 0.6 });
      rimShape(ctx, (c) => S(c, 0), col, P4.snowS, near ? '#ffffff' : null, { cel: 2.4, rim: 1.2, lw: 2.1, inner: () => {
        kimonoPattern(ctx, ex - 30, ey - 4, 36, drop + 6, ey + drop - 9, near ? 11 : 17, true);
        const gs = ctx.createLinearGradient(0, ey + drop - 10, 0, ey + drop + 2);
        gs.addColorStop(0, 'rgba(255,255,255,0)');
        gs.addColorStop(1, 'rgba(255,255,255,0.9)');
        ctx.fillStyle = gs;
        ctx.fillRect(ex - 34, ey + drop - 10, 40, 14);
        // 袖口：靛＋淡青兩道
        ctx.lineWidth = 2;
        ctx.strokeStyle = A.c(P4.ind);
        ctx.beginPath();
        ctx.moveTo(ex + 3, ey - 1);
        ctx.lineTo(ex + 1, ey + 7);
        ctx.stroke();
      } });
      if (near && lift > 0.3) A.shape(ctx, (c) => c.ellipse(ex + 4, ey + 1.5, 2.6, 2.2, 0, 0, TAU), YK.skin, YK.skinS, { lw: 1.4, shadeY: ey + 2 });
      yukiFlakes(ctx, ex - 16, ey + drop + 4, 16, 16, 4, t, 0.8, near ? 11 : 17);
    };
    sleeve(false);
    // ── 頭（比例較小、優雅） ──
    ctx.save();
    ctx.translate(hx, hy + 8);
    ctx.rotate(hw(0.03) + (walk ? -0.04 : 0) - puffK * 0.1);
    ctx.scale(1.08, 1.08);
    ctx.translate(-hx, -hy - 8);
    A.shape(ctx, (c) => A.roundRect(c, hx - 3, hy + 6, 7, 9, 2), YK.skin, YK.skinS, { lw: 1.6, shadeY: hy + 11 });
    // 十二單般的層層衣領：白、淡青、靛、朱
    [[P4.verm, 0], [P4.ind, 1.6], [P4.teal, 3.2], [P4.snow, 4.8]].forEach((q) => {
      A.shape(ctx, (c) => { c.moveTo(hx - 10 + q[1] * 0.2, hy + 12 + q[1] * 0.3); c.lineTo(hx + 3.5 + q[1] * 0.3, hy + 25 - q[1] * 0.4); c.lineTo(hx + 11 - q[1] * 0.2, hy + 12 + q[1] * 0.3); c.lineTo(hx + 3.5 + q[1] * 0.3, hy + 19 + q[1] * 0.6); c.closePath(); }, q[0], null, { lw: 1.3 });
    });
    const faceP = (c) => {
      c.moveTo(hx - 11, hy - 4);
      c.quadraticCurveTo(hx - 12, hy - 15, hx + 1, hy - 15);
      c.quadraticCurveTo(hx + 13, hy - 15, hx + 13, hy - 3);
      c.quadraticCurveTo(hx + 13, hy + 6, hx + 6, hy + 9);
      c.quadraticCurveTo(hx + 1, hy + 11, hx - 5, hy + 8);
      c.quadraticCurveTo(hx - 11, hy + 4, hx - 11, hy - 4);
      c.closePath();
    };
    rimShape(ctx, faceP, YK.skin, YK.skinS, '#ffffff', { cel: 2.4, rim: 1.2, lw: 2.1 });
    const eyeK = kind;
    const ex2 = hx + 6.5;
    const ey2 = hy - 2;
    if (eyeK === 'normal' || eyeK === 'angry') {
      const wide = cast;
      if (wide > 0.2 && !dead) glowH(ctx, ex2, ey2, 8, P4.teal, 0.5 * wide);
      almondEye(ctx, ex2, ey2, 3.4, 1.4 + wide * 1.1, wide > 0.3 ? '#8fe7de' : '#5e7fb8', 'normal', { lw: 1.9, irisK: 1.05 - wide * 0.25, pupil: wide > 0.3 ? '#274a58' : '#161030' });
      almondEye(ctx, hx - 1.5, ey2 - 0.3, 2.6, 1.2 + wide * 0.9, wide > 0.3 ? '#8fe7de' : '#5e7fb8', 'normal', { lw: 1.7, irisK: 1.05 - wide * 0.25 });
      if (wide < 0.3) {
        ctx.fillStyle = A.c(YK.skinS);
        ctx.beginPath();
        ctx.ellipse(ex2 + 0.2, ey2 - 1.5, 3.6, 1.2, -0.12, PI, TAU);
        ctx.ellipse(hx - 1.5, ey2 - 1.7, 2.8, 1, -0.1, PI, TAU);
        ctx.fill();
      }
    } else A.eye(ctx, ex2, ey2, 2.4, 2, eyeK);
    ctx.fillStyle = A.c(YK.lip);
    ctx.beginPath();
    if (blowing) ctx.ellipse(hx + 10, hy + 4.5, 1.4, 1.2, 0, 0, TAU);
    else ctx.ellipse(hx + 9, hy + 5, 2, 0.8, -0.15, 0, TAU);
    ctx.fill();
    // 瀏海（公主切）與側髮
    const bangP = (c) => {
      c.moveTo(hx - 12, hy + 2);
      c.quadraticCurveTo(hx - 15, hy - 18, hx + 2, hy - 18);
      c.quadraticCurveTo(hx + 15, hy - 18, hx + 14, hy - 5);
      c.lineTo(hx + 11, hy - 5.5);
      c.lineTo(hx + 10, hy - 8);
      c.lineTo(hx - 3, hy - 7);
      c.lineTo(hx - 5, hy - 2);
      c.lineTo(hx - 6, hy + 14 + hw(1.5));
      c.lineTo(hx - 9, hy + 12);
      c.closePath();
    };
    rimShape(ctx, bangP, YK.hair, YK.hairS, YK.hairL, { cel: 2, rim: 1.3, lw: 2.1, inner: () => {
      ctx.strokeStyle = A.c(YK.hairL);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(hx, hy - 6, 13, PI * 1.15, PI * 1.55);
      ctx.stroke();
    } });
    rimShape(ctx, (c) => taper(c, cb(hx + 11, hy - 6, hx + 13, hy + 6, hx + 8 + hw(1.5), hy + 16, hx + 6 + hw(3) * wind, hy + 26), (s) => 4 - s * 2.5, 10), YK.hair, YK.hairS, null, { cel: 1, lw: 1.7 });
    // ── 髮飾：冰晶的櫛（梳子）、兩支冰簪＋垂下的冰珠流蘇（隨風搖） ──
    A.shape(ctx, (c) => { c.moveTo(hx - 11, hy - 12); c.quadraticCurveTo(hx - 4, hy - 21, hx + 5, hy - 18); c.lineTo(hx + 4, hy - 15.5); c.quadraticCurveTo(hx - 4, hy - 18, hx - 9, hy - 10.5); c.closePath(); }, P4.tealL, P4.teal, { lw: 1.4, shadeY: hy - 15 });
    ctx.fillStyle = A.c(P4.gold);
    [[-7, -15.5], [-3, -17.8], [1, -18.3]].forEach((q) => {
      ctx.beginPath();
      ctx.arc(hx + q[0], hy + q[1], 0.9, 0, TAU);
      ctx.fill();
    });
    [[hx - 8, hy - 14, -0.95, 14, 0], [hx - 5, hy - 16, -0.55, 12, 1]].forEach((q) => {
      ctx.save();
      ctx.translate(q[0], q[1]);
      ctx.rotate(q[2]);
      A.shape(ctx, (c) => poly(c, [[-1.2, 0], [0, -q[3]], [1.2, 0], [0, 3]]), P4.teal, P4.tealS, { lw: 1.3, shadeY: -2 });
      A.shape(ctx, (c) => starPath(c, 0, -q[3], 4.2, 1.8, 6, -PI / 2), '#ffffff', P4.tealL, { lw: 1.2, shadeY: -q[3] });
      ctx.restore();
      // 流蘇：一串冰珠，垂直往下晃
      const tx = q[0] + Math.cos(q[2] - PI / 2) * q[3];
      const ty = q[1] + Math.sin(q[2] - PI / 2) * q[3];
      const dsw = hw(2, q[4]) * 0.6 * wind;
      ctx.strokeStyle = A.c(P4.silver || '#c9d2ea');
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx - 1 + dsw * 0.5, ty + 5, tx - 2 + dsw, ty + 10);
      ctx.stroke();
      [[0.5, 1.2], [1, 1.5]].forEach((b) => A.shape(ctx, (c) => c.arc(tx - 2 * b[0] + dsw * b[0], ty + 10 * b[0], b[1], 0, TAU), P4.tealL, P4.teal, { lw: 1, shadeY: ty + 10 * b[0] + 0.4 }));
    });
    ctx.restore();
    sleeve(true);
    // ── 呼出的霜氣 ──
    const mx = hx + 12;
    const my = hy + 4.5;
    if (blowing) {
      for (let i = 0; i < 7; i++) {
        const q = (t * 1.3 + i / 7) % 1;
        const x = mx + 3 + q * 52;
        const y = my - 1 + Math.sin(q * 5 + i + t) * 4 * q - q * 4;
        puff(ctx, x, y, 2 + q * 8, i % 2 ? P4.tealL : '#ffffff', (1 - q) * 0.75 * puffK);
      }
      ctx.save();
      ctx.globalAlpha *= puffK;
      for (let i = 0; i < 5; i++) {
        const q = (t * 1.1 + i / 5) % 1;
        sparkle(ctx, mx + 8 + q * 50, my - 6 + Math.sin(t * 4 + i * 2) * 7, 2.4 * (1 - q * 0.5), i % 2 ? '#ffffff' : P4.tealL);
      }
      zGlyph(ctx, mx + 30, my - 18 - Math.sin(t * 3) * 2, 6, P4.tealL);
      ctx.restore();
    } else if (!dead) {
      const q = (t * 0.6) % 1;
      puff(ctx, mx + 2 + q * 10, my - q * 5, 1.2 + q * 3, '#ffffff', (1 - q) * 0.55);
    }
    yukiFlakes(ctx, hx, hy + 40, 64, 90, 8, t * 0.6, 0.6, 29);
    ctx.restore();
    if (dead) {
      yukiFlakes(ctx, 0, -10, 70, 120, 30, t * 2, 0.95, 41);
      snowFall(ctx, 0, -20, 60, 90, 12, t, 0.8);
    }
  }
  // ── 九尾封印狐（silencefox）：稻荷的白狐。雪白的毛、朱紅的隈取與額上的寶珠火焰紋、金色的眼，腳上是靛色的「襪子」；
  //    九條尾巴像扇子一樣張開，每條尾尖都燒著淡青的狐火（尾巴本身就是火的來源）。
  //    蓄力（fx.aura）時尾巴張得更開、尾尖的狐火變大，頭上聚起三團狐火，然後追著玩家飛出去（projectile foxfire） ──
  const KY_FUR = [P4.snow, P4.snowS, '#ffffff'];
  const KY_CREAM = ['#ffffff', '#dfe2f2'];
  const KY_RED = P4.verm;
  // 狐火（淡青、白芯，不描邊；投射物與圖示也用）
  function foxFlame(ctx, x, y, r, t, seed, a) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    glowH(ctx, x, y, r * 3, P4.teal, 0.55);
    const sw = Math.sin(t * 9 + seed) * r * 0.35;
    ctx.fillStyle = A.c('#4fc2c0');
    ctx.beginPath();
    flamePath(ctx, x, y + r, r, r * 2.8, sw);
    ctx.fill();
    ctx.fillStyle = A.c(P4.teal);
    ctx.beginPath();
    flamePath(ctx, x, y + r * 0.8, r * 0.7, r * 2, sw * 0.7);
    ctx.fill();
    ctx.fillStyle = A.c('#f4fffc');
    ctx.beginPath();
    ctx.arc(x, y + r * 0.2, r * 0.42, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function silencefox(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const hurt = m.hurtT > 0;
    const dead = !!m.dead;
    const walk = walking(m) && !dead;
    const kind = eyeKind(m);
    const aura = dead ? 0 : clamp(Math.max(num(fx.aura, 0), ph === 'wind' ? 0.3 : 0), 0, 1);
    const strike = ph === 'strike';
    const F = KY_FUR;
    const u = walk ? t * 10 : 0;
    const bob = walk ? Math.cos(u * 2) * 1.2 : Math.sin(t * 2.2) * 0.6;
    const by = -32 + bob + aura * 1;
    ctx.save();
    if (hurt) ctx.rotate(-0.07);
    // ── 九條尾巴：又大又蓬、像一團羽冠般在身後張開（尾巴合起來比身體還大），尾尖燒著淡青狐火；
    //    每條尾巴以不同相位緩緩波動，後排較暗、前排雪白 ──
    const rx0 = -17;
    const ry0 = by - 6;
    const spread = 1 + aura * 0.15;
    if (!dead) glowH(ctx, rx0 - 16, ry0 - 26, 56 + aura * 14, P4.teal, 0.16 + aura * 0.3);
    const tails = [];
    for (let i = 0; i < 9; i++) {
      const k = i / 8;
      const a = PI - 0.55 + k * 2.55 * spread;
      // 每條尾巴各自以不同速度與相位擺動
      const lag = Math.sin(t * (1.6 + (i % 3) * 0.35) - i * 0.9) * 0.1 + (walk ? Math.sin(u - i * 0.35) * 0.05 : 0);
      tails.push([a + lag, 72 + Math.sin(k * PI) * 18 + aura * 8, i]);
    }
    const order = [0, 8, 1, 7, 2, 6, 3, 5, 4];
    order.forEach((i, oi) => {
      const tl = tails[i];
      const a = tl[0];
      const L = tl[1];
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const wv = Math.sin(t * (2 + (i % 4) * 0.3) - i * 1.1) * 0.16;
      // 尾巴的中心線：先鼓出去、尾端往上翹（S 形），並隨相位波動
      const fn = cb(rx0, ry0,
        rx0 + ca * L * 0.35 + sa * L * (0.05 + wv), ry0 + sa * L * 0.35 - ca * L * (0.05 + wv),
        rx0 + ca * L * 0.75 - sa * L * (0.1 - wv), ry0 + sa * L * 0.75 + ca * L * (0.1 - wv),
        rx0 + ca * L, ry0 + sa * L);
      const wf = (s) => 6 + Math.sin(Math.min(1, s * 1.1) * PI * 0.92) * 17 * (1 - s * 0.2);
      // 蓬鬆的輪廓：兩側各一排毛瓣
      const P = (c) => {
        const n = 10;
        const Lp = [];
        const Rp = [];
        for (let q = 0; q <= n; q++) {
          const s2 = q / n;
          // 越往尾端，毛瓣越像火舌
          const bump = q > 0 && q < n ? (q % 2 ? 1.12 + s2 * 0.3 : 0.9 - s2 * 0.15) : 1;
          const w = wf(s2) * 0.5 * bump;
          Lp.push(along(fn, s2, w));
          Rp.push(along(fn, s2, -w));
        }
        c.moveTo(Lp[0][0], Lp[0][1]);
        for (let q = 1; q <= n; q += 2) {
          const b = Lp[Math.min(n, q + 1)];
          c.quadraticCurveTo(Lp[q][0], Lp[q][1], b[0], b[1]);
        }
        for (let q = n - 1; q >= 0; q -= 2) {
          const b = Rp[Math.max(0, q - 1)];
          c.quadraticCurveTo(Rp[q][0], Rp[q][1], b[0], b[1]);
        }
        c.closePath();
      };
      const back = oi < 4;
      const col = back ? (i % 2 ? '#dfe2f0' : '#d6daec') : F[0];
      const sh = back ? '#aab1d4' : F[1];
      if (back) {
        // 後排：單純的平塗＋月牙陰影＋尾尖狐火色（省效能）
        A.shape(ctx, P, col, sh, { lw: 2.1, cel: [3, 3] });
        ctx.save();
        ctx.beginPath();
        P(ctx);
        ctx.clip();
        ctx.fillStyle = A.c(P4.tealL);
        ctx.beginPath();
        taper(ctx, (s2) => fn(0.62 + s2 * 0.38), 44, 6);
        ctx.fill();
        ctx.restore();
      } else rimShape(ctx, P, col, sh, '#ffffff', { cel: 3, rim: 1.4, lw: 2.1, inner: () => {
        // 毛筆的毛流
        if (!back) brushHair(ctx, fn, 0.12, 0.72, 7, wf(0.4) * 0.18, 8, PI + 0.15, sh, 1, i * 7);
        // 尾尖漸漸變成狐火色
        ctx.fillStyle = A.c(P4.tealL);
        ctx.beginPath();
        taper(ctx, (s2) => fn(0.62 + s2 * 0.38), 44, 6);
        ctx.fill();
        if (!back) {
          ctx.fillStyle = A.c(P4.teal);
          ctx.beginPath();
          taper(ctx, (s2) => fn(0.82 + s2 * 0.18), 44, 4);
          ctx.fill();
        }
      } });
      const tp = fn(1);
      const fl = 3.6 + aura * 2 + Math.sin(t * 7 + i) * 0.4;
      if (!dead) spiritFlame(ctx, tp[0] + ca * 1.5, tp[1] + sa * 1.5 + fl * 0.6, fl, fl * 3, Math.sin(t * 8 + i) * 1.5 - 2, '#4fc2c0', '#f4fffc', null, 0.95);
    });

    // ── 腳：細長的狐狸腳（靛色襪子），對角小跑 ──
    const leg = (front, near, ph2) => {
      const g = gaitFoot(u + ph2, walk ? 7 : 0, 5);
      const col = near ? F[0] : '#d9dcee';
      const sh = near ? F[1] : '#a7add2';
      const sockC = near ? P4.ind : P4.indS;
      if (front) {
        const x0 = near ? 12 : 16;
        const fxp = x0 + 3 + g[0] + (strike ? 6 : 0);
        const fyp = -g[1];
        const top = [x0, by + 5];
        const wr = [fxp - 1 + g[2] * 2, fyp - 6 + g[2]];
        const el = ik(top[0], top[1], wr[0], wr[1], 12, 11, -1);
        legMass(ctx, [x0, by + 3, 6.5, 9, -0.1], [top, el, wr, [fxp, fyp - 2]], [11, 6, 4.4, 4.4], col, sh, near ? '#ffffff' : null, { lw: 2, inner: null });
        // 靛色襪子
        limb2(ctx, [lerp2(el, wr, 0.45), wr, [fxp, fyp - 2]], [5.2, 4.6, 4.4], sockC, P4.indD, null, { lw: 1.9, round: 0.6 });
        pawFoot(ctx, fxp, fyp, 8, 4.6, sockC, P4.indD, { rot: -g[2] * 0.6, lw: 1.8 });
      } else {
        const x0 = near ? -16 : -12;
        const fxp = x0 + 1 + g[0];
        const fyp = -g[1];
        const top = [x0, by + 4];
        const hock = [fxp - 7 + g[2] * 3, fyp - 9 + g[2]];
        const knee = ik(top[0], top[1], hock[0], hock[1], 12, 11, 1);
        legMass(ctx, [x0 - 1, by + 1, 9, 10, 0.3], [top, knee, hock, [fxp - 1, fyp - 2]], [12, 6.5, 4.4, 4.4], col, sh, near ? '#ffffff' : null, { lw: 2 });
        limb2(ctx, [lerp2(knee, hock, 0.55), hock, [fxp - 1, fyp - 2]], [5.4, 4.5, 4.4], sockC, P4.indD, null, { lw: 1.9, round: 0.6 });
        pawFoot(ctx, fxp, fyp, 8, 4.6, sockC, P4.indD, { rot: -g[2] * 0.6, lw: 1.8 });
      }
    };
    leg(false, false, 0);
    leg(true, false, PI);
    // ── 身體：纖細的狐身 ──
    const spine = cb(-22, by, -10, by - 5, 4, by - 5, 15, by - 2);
    const bodyP = (c) => taper(c, spine, (s) => 17 - Math.sin(s * PI) * 3 + s * 3, 14);
    const hipP = (c) => c.ellipse(-18, by, 10, 10.5, 0, 0, TAU);
    const chestP = (c) => c.ellipse(14, by, 10, 12, 0.2, 0, TAU);
    blob(ctx, [bodyP, hipP, chestP], F[0], F[1], '#ffffff', { cel: 3.2, rim: 1.6, lw: 2.4, inner: () => {
      brushHair(ctx, spine, 0.05, 0.95, 10, -3, 5, PI - 0.1, F[1], 0.9, 17);
      // 腰上一道朱色的毛紋
      ctx.fillStyle = A.c(KY_RED);
      ctx.beginPath();
      const p = along(spine, 0.45, -4);
      ctx.moveTo(p[0] + 7, p[1] - 3);
      ctx.quadraticCurveTo(p[0], p[1] - 1.5, p[0] - 9, p[1] + 2);
      ctx.quadraticCurveTo(p[0] + 1, p[1] + 0.5, p[0] + 7, p[1] - 0.8);
      ctx.fill();
    } });
    leg(false, true, PI);
    leg(true, true, 0);
    // 胸前的蓬毛
    A.shape(ctx, (c) => { c.moveTo(12, by - 10); c.quadraticCurveTo(26, by - 10, 25, by + 3); c.lineTo(21.5, by + 1); c.lineTo(21, by + 8); c.lineTo(17, by + 4); c.lineTo(14, by + 10); c.lineTo(11, by + 4); c.quadraticCurveTo(7, by - 3, 12, by - 10); c.closePath(); }, KY_CREAM[0], KY_CREAM[1], { lw: 1.8, shadeY: by + 2 });
    // ── 頭（反向點頭） ──
    const hx = 28 + (strike ? 3 : 0);
    const hy = by - 13 - bob * 0.5 + (strike ? 2 : 0);
    ctx.save();
    ctx.translate(hx - 4, hy + 4);
    ctx.rotate((walk ? Math.sin(u * 2 + 0.8) * 0.03 : 0) - aura * 0.08);
    ctx.scale(1.15, 1.15);
    ctx.translate(-(hx - 4), -(hy + 4));
    const ear = (x, y, rot, col, inner) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot + Math.sin(t * 2.3 - 0.4) * 0.04);
      A.shape(ctx, (c) => { c.moveTo(-5, 2); c.quadraticCurveTo(-4, -8, 0.5, -15); c.quadraticCurveTo(5, -7, 5, 2); c.closePath(); }, col, F[1], { lw: 1.9, shadeY: -2 });
      if (inner) {
        ctx.fillStyle = A.c(P4.pink);
        ctx.beginPath();
        ctx.moveTo(-2.4, 1);
        ctx.quadraticCurveTo(-2, -6, 0.5, -10.5);
        ctx.quadraticCurveTo(2.8, -5, 2.5, 1);
        ctx.fill();
      }
      ctx.fillStyle = A.c(KY_RED);
      ctx.beginPath();
      ctx.moveTo(-2, -9);
      ctx.quadraticCurveTo(0.5, -16, 3.2, -9);
      ctx.quadraticCurveTo(0.5, -11, -2, -9);
      ctx.fill();
      ctx.restore();
    };
    ear(hx - 7, hy - 6, -0.45, '#dfe2f2', false);
    const headP = (c) => {
      c.moveTo(hx - 10, hy + 5);
      c.quadraticCurveTo(hx - 12, hy - 8, hx, hy - 9);
      c.quadraticCurveTo(hx + 8, hy - 9, hx + 11, hy - 3.5);
      c.lineTo(hx + 19, hy + 1.2);
      c.quadraticCurveTo(hx + 20.5, hy + 4, hx + 16, hy + 5);
      c.quadraticCurveTo(hx + 4, hy + 9, hx - 10, hy + 5);
      c.closePath();
    };
    const open = strike || aura > 0.6;
    if (open) {
      A.shape(ctx, (c) => { c.moveTo(hx + 2, hy + 4); c.lineTo(hx + 17, hy + 7.5); c.quadraticCurveTo(hx + 13.5, hy + 12, hx + 3, hy + 9.5); c.closePath(); }, F[1], null, { lw: 1.8 });
      A.shape(ctx, (c) => { c.moveTo(hx + 3, hy + 4.5); c.lineTo(hx + 16, hy + 7.3); c.lineTo(hx + 4, hy + 8.2); c.closePath(); }, P4.mouth, null, { noStroke: true });
    }
    rimShape(ctx, headP, F[0], F[1], '#ffffff', { cel: 2.4, rim: 1.4, lw: 2.3, inner: () => {
      // 朱紅隈取（眼尾上揚到耳根＋頰上一道）
      ctx.fillStyle = A.c(KY_RED);
      ctx.beginPath();
      ctx.moveTo(hx + 10.5, hy - 2.5);
      ctx.quadraticCurveTo(hx + 3, hy - 8, hx - 7, hy - 8);
      ctx.quadraticCurveTo(hx + 1, hy - 5, hx + 9.5, hy - 0.6);
      ctx.closePath();
      ctx.moveTo(hx + 5, hy + 3);
      ctx.quadraticCurveTo(hx - 1, hy + 3.5, hx - 7, hy + 1);
      ctx.quadraticCurveTo(hx - 1, hy + 5.5, hx + 5.5, hy + 4.4);
      ctx.closePath();
      ctx.fill();
    } });
    ear(hx - 1, hy - 7.5, -0.15, F[0], true);
    // 額頭的寶珠火焰紋（天生的朱色毛紋）
    ctx.fillStyle = A.c(KY_RED);
    ctx.beginPath();
    flamePath(ctx, hx + 2, hy - 3, 1.6, 6, -0.6);
    ctx.fill();
    // 頰旁的白色蓬毛
    A.shape(ctx, (c) => { c.moveTo(hx - 6, hy - 1); c.lineTo(hx - 15, hy + 2); c.lineTo(hx - 9, hy + 3.5); c.lineTo(hx - 14, hy + 8); c.lineTo(hx - 6, hy + 7); c.lineTo(hx - 8, hy + 11); c.lineTo(hx + 0, hy + 7); c.closePath(); }, '#ffffff', F[1], { lw: 1.8, shadeY: hy + 6 });
    almondEye(ctx, hx + 6.5, hy - 2.4, 3.6, 2.1, P4.gold, kind === 'normal' && (open || aura > 0.3) ? 'angry' : kind, { slit: true, glow: dead ? null : aura > 0.2 ? P4.teal : null, ga: 0.3 + aura * 0.4, white: P4.goldL, lw: 1.9 });
    A.ellipse(ctx, hx + 18.7, hy + 1.3, 1.7, 1.4, P4.indD, null, { lw: 0.9, hl: false });
    if (!open) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 17, hy + 4);
      ctx.quadraticCurveTo(hx + 12, hy + 5.6, hx + 8, hy + 4.2);
      ctx.stroke();
    }
    ctx.restore();
    // ── 蓄力：頭上聚起三團狐火 ──
    if (aura > 0.05) {
      for (let i = 0; i < 3; i++) {
        const a = -PI / 2 + (i - 1) * 0.7;
        const r = 20 + aura * 6;
        foxFlame(ctx, 4 + Math.cos(a) * r, by - 34 + Math.sin(a) * r * 0.6 + Math.sin(t * 5 + i) * 2, 3.5 + aura * 3, t, i * 2, aura);
      }
    }
    ctx.restore();
  }
  // ── 古松樹靈（id 仍是 heartcedar）：參道旁千年老松的樹靈。扭曲傾斜、瘤節盤結的樹幹上是一塊塊深裂的龜甲樹皮，
  //    兩條長枝像手臂一樣往兩側水平伸出，枝端是浮世繪式的平頂雲形松針墊（深綠層疊、細針筆觸，上頭積雪），掛著幾顆松果；
  //    根腳緊抓著一塊積雪的岩石。臉是從樹瘤裡長出來的：瘤節成了眉骨與眼窩、樹皮裂開成嘴；
  //    樹幹中段的一道裂縫會張開，露出發光的金朱色心核（fx.open、fx.beat） ──
  const SC_BARK = ['#6a4a3e', '#3e2a2a', '#a8806a'];
  const SC_LEAF = ['#2f5e4c', '#1c3a33', '#6fa184'];
  // 金朱色的心核（光球＋年輪般的光環；圖示也用）
  function lifeCore(ctx, x, y, r, beat, t, ga) {
    if (ga > 0) glowH(ctx, x, y, r * 3.2, P4.goldL, ga * (0.45 + beat * 0.35));
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, A.c('#ffffff'));
    g.addColorStop(0.35, A.c(P4.goldL));
    g.addColorStop(0.75, A.c(P4.gold));
    g.addColorStop(1, A.c(P4.verm));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,250,220,0.75)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x, y, r * (0.35 + i * 0.22), r * (0.3 + i * 0.2), t * 0.5 * i, 0, TAU);
      ctx.stroke();
    }
    A.shape(ctx, (c) => { c.moveTo(x, y + r * 0.3); c.quadraticCurveTo(x - r * 0.1, y - r * 0.2, x - r * 0.45, y - r * 0.45); c.quadraticCurveTo(x - r * 0.05, y - r * 0.5, x, y + r * 0.3); c.closePath(); }, P4.tealS, null, { noStroke: true });
    A.shape(ctx, (c) => { c.moveTo(x, y + r * 0.3); c.quadraticCurveTo(x + r * 0.15, y - r * 0.25, x + r * 0.5, y - r * 0.35); c.quadraticCurveTo(x + r * 0.1, y - r * 0.05, x, y + r * 0.3); c.closePath(); }, P4.teal, null, { noStroke: true });
    ctx.restore();
  }
  // 雲形松針墊：圓頂、平底，下緣一排針葉扇；上面積雪
  function pinePad(ctx, px, py, w, h, dark, seed) {
    const n = Math.max(3, Math.round(w / 7));
    const padP = (c) => {
      c.moveTo(px - w, py + h * 0.3);
      c.bezierCurveTo(px - w * 1.05, py - h * 0.6, px - w * 0.55, py - h * 1.15, px - w * 0.1, py - h * 1.05);
      c.bezierCurveTo(px + w * 0.25, py - h * 1.35, px + w * 0.95, py - h * 1.0, px + w, py + h * 0.3);
      for (let k = n; k > 0; k--) {
        const x = px - w + (2 * w * k) / n;
        c.quadraticCurveTo(x - w / n, py + h * (0.95 + (k % 2) * 0.25), x - (2 * w) / n, py + h * 0.3);
      }
      c.closePath();
    };
    rimShape(ctx, padP, dark ? '#264d40' : SC_LEAF[0], SC_LEAF[1], dark ? null : SC_LEAF[2], { cel: 2.6, rim: 1.3, lw: 2.2, inner: () => {
      // 第二層（較亮的內層針葉）
      ctx.fillStyle = A.c(dark ? '#2f5e4c' : '#3c745c');
      ctx.beginPath();
      ctx.ellipse(px - w * 0.1, py - h * 0.25, w * 0.72, h * 0.55, 0, 0, TAU);
      ctx.fill();
      // 松針的扇形細筆觸
      ctx.strokeStyle = A.c(SC_LEAF[1]);
      ctx.lineWidth = 0.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const fx0 = px - w + (2 * w * (k + 0.5)) / n;
        const fy0 = py + h * 0.75;
        for (let q = -3; q <= 3; q++) {
          const a = -PI / 2 + q * 0.28;
          ctx.moveTo(fx0, fy0);
          ctx.lineTo(fx0 + Math.cos(a) * h * 0.85, fy0 + Math.sin(a) * h * 0.85);
        }
      }
      ctx.stroke();
      ctx.strokeStyle = A.c(SC_LEAF[2]);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let k = 0; k < n - 1; k++) {
        const fx0 = px - w * 0.8 + (1.6 * w * (k + 0.5)) / (n - 1);
        const fy0 = py - h * 0.1 + (k % 2) * 1.5;
        for (let q = -2; q <= 2; q++) {
          const a = -PI / 2 + q * 0.3;
          ctx.moveTo(fx0, fy0);
          ctx.lineTo(fx0 + Math.cos(a) * h * 0.55, fy0 + Math.sin(a) * h * 0.55);
        }
      }
      ctx.stroke();
    } });
    // 積雪（上緣一整片、下緣波浪）
    const snowP = (c) => {
      c.moveTo(px - w * 0.95, py - h * 0.05);
      c.bezierCurveTo(px - w * 1.0, py - h * 0.85, px - w * 0.55, py - h * 1.35, px - w * 0.1, py - h * 1.25);
      c.bezierCurveTo(px + w * 0.25, py - h * 1.55, px + w * 0.95, py - h * 1.15, px + w * 0.97, py - h * 0.1);
      c.quadraticCurveTo(px + w * 0.75, py - h * 0.45, px + w * 0.5, py - h * 0.3);
      c.quadraticCurveTo(px + w * 0.25, py - h * 0.7, px, py - h * 0.45);
      c.quadraticCurveTo(px - w * 0.3, py - h * 0.75, px - w * 0.55, py - h * 0.35);
      c.quadraticCurveTo(px - w * 0.75, py - h * 0.55, px - w * 0.95, py - h * 0.05);
      c.closePath();
    };
    A.shape(ctx, snowP, '#ffffff', P4.snowS, { lw: 1.7, shadeY: py - h * 0.55 });
    void seed;
  }
  // 松果
  function pineCone(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    A.shape(ctx, (c) => c.ellipse(0, s * 1.1, s * 0.85, s * 1.25, 0, 0, TAU), '#8a5a3a', '#5a3626', { lw: 1.4, shadeY: s * 1.4 });
    ctx.strokeStyle = A.c(P4.goldS);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const yy = s * (0.4 + i * 0.6);
      ctx.moveTo(-s * 0.7, yy);
      ctx.quadraticCurveTo(0, yy + s * 0.5, s * 0.7, yy);
    }
    ctx.stroke();
    ctx.restore();
  }
  function heartcedar(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const hurt = m.hurtT > 0;
    const dead = !!m.dead;
    const walk = walking(m) && !dead;
    const kind = eyeKind(m);
    const open = clamp(num(fx.open, 0), 0, 1);
    const beat = clamp(num(fx.beat, 0), 0, 1);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const K = SC_BARK;
    const u = walk ? t * 4 : 0;
    const sway = Math.sin(t * 1.1) * 1.6 + (walk ? Math.sin(u - 0.7) * 1.6 : 0);
    ctx.save();
    if (hurt) ctx.rotate(-0.04);
    // ── 根腳抓著的積雪岩石 ──
    const rockP = (c) => {
      c.moveTo(-26, 0);
      c.quadraticCurveTo(-28, -10, -18, -13);
      c.quadraticCurveTo(-4, -18, 10, -14);
      c.quadraticCurveTo(26, -12, 27, 0);
      c.closePath();
    };
    rimShape(ctx, rockP, '#8a90b0', '#5a5f80', '#c8cde4', { cel: 3, rim: 1.4, lw: 2.2, inner: () => {
      ctx.strokeStyle = A.c('#5a5f80');
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-12, -2);
      ctx.lineTo(-8, -9);
      ctx.lineTo(-2, -11);
      ctx.moveTo(12, -3);
      ctx.lineTo(15, -9);
      ctx.stroke();
    } });
    A.shape(ctx, (c) => { c.moveTo(-20, -12); c.quadraticCurveTo(-6, -19, 10, -15); c.quadraticCurveTo(4, -13, -2, -14); c.quadraticCurveTo(-10, -12, -20, -12); c.closePath(); }, '#ffffff', P4.snowS, { lw: 1.4, shadeY: -14 });
    // ── 根腳：四條根從樹基往下抓住岩石；走路時輪流抬起、再緊抓回去 ──
    const root = (x, dir, ph2, near) => {
      const s = walk ? Math.max(0, Math.sin(u + ph2)) : 0;
      const pts = [[x * 0.45, -22], [x + dir * 4, -14 - s * 3], [x + dir * 10 + s * dir * 2, -6 - s * 4], [x + dir * 13 + s * dir * 3, -s * 3]];
      limb2(ctx, pts, near ? [9, 7, 5, 3] : [11, 8, 5, 3], near ? K[0] : K[1], near ? K[1] : '#2a1c1e', near ? K[2] : null, { lw: 2.1, round: 0.8 });
    };
    root(-10, -1, 0, false);
    root(10, 1, PI, false);
    // 整棵樹隨步伐搖晃
    ctx.translate(0, -24);
    ctx.rotate(walk ? Math.sin(u) * 0.025 : 0);
    ctx.translate(0, 24);
    // ── 扭曲傾斜的樹幹（S 形、往前傾），深裂的龜甲樹皮 ──
    const spine = cb(0, -22, 13, -42 + sway * 0.2, -12, -58, 0 + sway * 0.5, -78);
    const trunkW = (s) => 36 - s * 14 + Math.sin(s * PI * 2) * 2;
    const trunkP = (c) => taper(c, spine, trunkW, 22);
    // 左枝（遠）：長長的水平枝，枝端是松針墊
    const armFar = [-50 + sway * 0.6, -72 + Math.sin(t * 1.4) * 1.5];
    const farFn = limb2(ctx, [[-2, -62], [-18, -70], [-34, -68], armFar], [12, 8, 6, 4.5], K[1], '#2a1c1e', null, { lw: 2.1, round: 0.8 });
    void farFn;
    pinePad(ctx, armFar[0] + 6, armFar[1] - 4, 30, 9, true, 1);
    pineCone(ctx, armFar[0] + 12, armFar[1] + 3, 2.6, 0.2 + Math.sin(t * 2) * 0.1);
    // 後面的幾片寬松針墊（層層往兩側鋪開）
    limb2(ctx, [[-4, -76], [-18, -92], [-30 + sway * 0.7, -96]], [9, 6, 4], K[1], '#2a1c1e', null, { lw: 2 });
    limb2(ctx, [[2, -78], [18, -90], [32 + sway * 0.7, -94]], [9, 6, 4], K[1], '#2a1c1e', null, { lw: 2 });
    pinePad(ctx, -30 + sway * 0.8, -98, 26, 8.5, true, 2);
    pinePad(ctx, 32 + sway * 0.8, -96, 24, 8, true, 5);
    rimShape(ctx, trunkP, K[0], K[1], K[2], { cel: 5, rim: 2, lw: 2.7, inner: () => {
      // 龜甲狀的樹皮塊（沿樹幹的格子，每塊一個多邊形裂紋）
      ctx.strokeStyle = A.c(K[1]);
      ctx.lineWidth = 1.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let r = 0; r < 7; r++) {
        const s = 0.06 + r * 0.13;
        for (let k = -1; k <= 1; k++) {
          const q = along(spine, s, k * trunkW(s) * 0.3 + (r % 2 ? 3 : -3));
          const w0 = trunkW(s) * 0.16;
          const hh = 5 + hash(r * 3 + k) * 2;
          ctx.moveTo(q[0] - w0, q[1] - hh * 0.3);
          ctx.lineTo(q[0] - w0 * 0.3, q[1] - hh * 0.6);
          ctx.lineTo(q[0] + w0, q[1] - hh * 0.4);
          ctx.lineTo(q[0] + w0 * 0.8, q[1] + hh * 0.4);
          ctx.lineTo(q[0] - w0 * 0.4, q[1] + hh * 0.5);
          ctx.closePath();
        }
      }
      ctx.stroke();
      // 樹皮塊的亮面
      ctx.fillStyle = A.c('#86604e');
      ctx.beginPath();
      for (let r = 0; r < 6; r++) {
        const q = along(spine, 0.1 + r * 0.14, -trunkW(0.1 + r * 0.14) * 0.3);
        ctx.moveTo(q[0] + 3, q[1]);
        ctx.ellipse(q[0], q[1], 3, 1.6, -0.4, 0, TAU);
      }
      ctx.fill();
      // 扭轉的樹紋
      ctx.strokeStyle = A.c('#4e342e');
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = -1; k <= 1; k += 2) {
        for (let i = 0; i <= 12; i++) {
          const s = i / 12;
          const q = along(spine, s, k * trunkW(s) * 0.42 * Math.cos(s * PI * 1.5));
          i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
        }
      }
      ctx.stroke();
      // 背光面的雪
      ctx.fillStyle = A.c('#ffffff');
      const sq = along(spine, 0.55, -trunkW(0.55) * 0.45);
      ctx.beginPath();
      ctx.ellipse(sq[0], sq[1], 2.5, 7, 0.3, 0, TAU);
      ctx.fill();
    } });
    // 近側的兩條根（在樹幹前）
    root(-16, -1, PI, true);
    root(16, 1, 0, true);
    // ── 樹幹中段的裂縫與心核 ──
    const cp = along(spine, 0.13, 1);
    const cx0 = cp[0];
    const cy0 = cp[1];
    const sw2 = 2.5 + open * 7;
    const splitP = (c) => {
      c.moveTo(cx0 + 1, cy0 - 12);
      c.bezierCurveTo(cx0 - sw2 * 1.3, cy0 - 6, cx0 - sw2 * 1.2, cy0 + 6, cx0 - 1, cy0 + 12);
      c.bezierCurveTo(cx0 + sw2 * 1.2, cy0 + 6, cx0 + sw2 * 1.3, cy0 - 6, cx0 + 1, cy0 - 12);
      c.closePath();
    };
    A.shape(ctx, splitP, '#1e0f12', null, { lw: 2.1 });
    if (open > 0.02) {
      ctx.save();
      ctx.beginPath();
      splitP(ctx);
      ctx.clip();
      lifeCore(ctx, cx0, cy0, (5 + open * 4.5) * (1 + beat * 0.1), beat, t, dead ? 0 : 1);
      ctx.restore();
      if (!dead) glowH(ctx, cx0, cy0, 34, P4.goldL, open * (0.25 + beat * 0.3));
    } else if (!dead) {
      glowH(ctx, cx0, cy0, 10, P4.goldL, 0.2 + beat * 0.25);
      ctx.save();
      ctx.globalAlpha *= 0.5 + beat * 0.5;
      ctx.strokeStyle = A.c(P4.goldL);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx0 + 0.5, cy0 - 9);
      ctx.quadraticCurveTo(cx0 - 1.5, cy0, cx0 + 0.5, cy0 + 9);
      ctx.stroke();
      ctx.restore();
    }
    // 裂縫兩側翻開的樹皮唇
    ctx.strokeStyle = A.c(K[2]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx0 - 1, cy0 - 13);
    ctx.bezierCurveTo(cx0 - sw2 * 1.5 - 1, cy0 - 6, cx0 - sw2 * 1.4 - 1, cy0 + 6, cx0 - 2, cy0 + 13);
    ctx.stroke();
    // ── 臉：從樹瘤長出來的（瘤節是眉骨與眼窩，樹皮裂開成嘴） ──
    const fp = along(spine, 0.5, 0);
    const fxp = fp[0] + 2;
    const fy = fp[1];
    const knot = (x, y, r) => rimShape(ctx, (c) => c.ellipse(x, y, r * 1.25, r, -0.2, 0, TAU), '#7a5646', K[1], K[2], { cel: 1.6, rim: 1, lw: 1.8, inner: () => curl(ctx, x, y, r * 0.7, 1, K[1], 1) });
    knot(fxp - 7, fy - 3, 5);
    knot(fxp + 7, fy - 4, 4.6);
    const eyeHole = (x, y) => {
      A.shape(ctx, (c) => c.ellipse(x, y, 3.2, 2.4, -0.2, 0, TAU), '#1a0c0e', null, { lw: 1.5 });
      if (kind === 'normal' || kind === 'angry') {
        if (!dead) glowH(ctx, x, y, 7, P4.gold, 0.5 + (open > 0.5 ? 0.3 : 0));
        ctx.fillStyle = A.c(P4.goldL);
        ctx.beginPath();
        ctx.ellipse(x + 0.4, y + 0.2, 1.6, open > 0.5 || strike ? 1.6 : 0.8, 0, 0, TAU);
        ctx.fill();
      } else if (kind === 'x') A.eye(ctx, x, y, 1.8, 1.8, 'x');
      else {
        ctx.strokeStyle = A.c(P4.goldS);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - 2, y);
        ctx.lineTo(x + 2, y);
        ctx.stroke();
      }
    };
    eyeHole(fxp - 6.5, fy - 1.5);
    eyeHole(fxp + 7, fy - 2.5);
    // 鼻：一個小瘤
    A.shape(ctx, (c) => c.ellipse(fxp + 1, fy + 3, 2.2, 2.8, 0, 0, TAU), K[0], K[1], { lw: 1.4, shadeY: fy + 4 });
    // 嘴：樹皮的裂口
    A.shape(ctx, (c) => { c.moveTo(fxp - 6, fy + 8); c.quadraticCurveTo(fxp, fy + 10 + (strike ? 4 : 0), fxp + 7, fy + 7); c.quadraticCurveTo(fxp, fy + 8.5, fxp - 6, fy + 8); c.closePath(); }, '#1a0c0e', null, { lw: 1.4 });
    // ── 樹頂的大松針墊 ──
    const top = spine(1);
    limb2(ctx, [[top[0] - 2, top[1] + 8], [top[0] + 4, top[1] - 8], [top[0] + 6 + sway, top[1] - 22]], [12, 8, 5], K[0], K[1], null, { lw: 2.1 });
    // 中層：一整片寬寬的平頂松雲
    pinePad(ctx, top[0] + 2 + sway * 1.1, top[1] - 12, 42, 11, false, 3);
    // 頂層
    pinePad(ctx, top[0] + 6 + sway * 1.4, top[1] - 34, 26, 10, false, 6);
    pineCone(ctx, top[0] - 14 + sway, top[1] - 4, 2.8, -0.2 + Math.sin(t * 2 + 1) * 0.1);
    pineCone(ctx, top[0] + 26 + sway, top[1] - 6, 2.5, 0.2 + Math.sin(t * 2 + 3) * 0.1);
    // 頂上長出的一簇冰柱（丟冰錐前會亮）
    const ice = wind ? 1 : strike ? 0.6 : 0.2 + 0.1 * Math.sin(t * 3);
    const ix = top[0] + 7 + sway * 1.5;
    const iy = top[1] - 50;
    if (!dead) glowH(ctx, ix, iy, 12 + ice * 8, P4.teal, 0.3 + ice * 0.5);
    ctx.save();
    ctx.translate(ix, iy + 3);
    iceSpike(ctx, -3, 1, 6, 2.2, -0.4);
    iceSpike(ctx, 3, 1, 6, 2.2, 0.4);
    iceSpike(ctx, 0, 1, 9, 2.8, 0);
    ctx.restore();
    // ── 右枝（近）：長枝手臂，丟冰錐時往上舉、再往前揮 ──
    const target = strike ? [54, -86 + sway * 0.3] : wind ? [42, -104] : [54 - sway * 0.5, -66 + Math.sin(t * 1.4 + 1) * 2];
    const sh0 = along(spine, 0.92, 8);
    const el = [(sh0[0] + target[0]) / 2 + 2, Math.min(sh0[1], target[1]) - 3 + (wind ? 6 : 0)];
    limb2(ctx, [[sh0[0] - 4, sh0[1] + 2], el, target], [11, 8, 5], K[0], K[1], K[2], { lw: 2.2, round: 0.8 });
    // 枝端的細枝手指
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      const a = (strike ? -0.2 : wind ? -1.2 : 0.1) + i * 0.55;
      ctx.moveTo(target[0], target[1]);
      ctx.quadraticCurveTo(target[0] + Math.cos(a) * 5, target[1] + Math.sin(a) * 5 - 1, target[0] + Math.cos(a + 0.2) * 9, target[1] + Math.sin(a + 0.2) * 9);
    }
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.8;
    ctx.stroke();
    ctx.strokeStyle = A.c(K[0]);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
    const padX = (sh0[0] + target[0]) / 2 + 4;
    const padY = Math.min(sh0[1], target[1]) - 6 + (wind ? 6 : 0);
    pinePad(ctx, padX + 2, padY, 28, 9, false, 4);
    pineCone(ctx, padX + 10, padY + 4, 2.4, 0.3 + Math.sin(t * 2 + 2) * 0.12);
    if (wind && !dead) {
      glowH(ctx, target[0], target[1] - 4, 12, P4.teal, 0.6);
      sparkle(ctx, target[0], target[1] - 4, 4 + Math.sin(t * 12) * 1.5, '#ffffff');
    }
    ctx.restore();
  }
  // ── 狛犬（shieldbear）：守護神社參道的石狛犬活了過來（阿形）。風化的淡色花崗岩身體、刻紋的凹槽裡長著青苔；
  //    挺起的胸、厚實的前腳，頭上一支金色獨角、張開的大嘴與獠牙、金色的眼；頭頸一圈雕出來的大捲鬃（一道道渦卷刻線），
  //    尾巴是一團火焰狀的捲毛。頸上繫著朱色的前掛（狛犬傳統的紅布）與金鈴。
  //    fx.guard：低頭把厚重的石鬃轉到前方當盾；fx.bash：頂著石鬃往前衝；recover：抬頭喘氣、露出破綻 ──
  const KM_STONE = ['#cfcbc1', '#95918a', '#f0eee6'];
  const KM_DARK = ['#aaa69d', '#6e6a64'];
  const KM_MOSS = '#7c9a84';
  // 雕刻的渦卷刻線（石頭上的凹槽，槽底長著一點青苔）
  function carvedCurl(ctx, x, y, r, dir, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const k = i / 16;
      const a = dir * k * TAU * 1.1 + PI;
      const rr = r * (1 - k * 0.78);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = A.c(KM_DARK[1]);
    ctx.lineWidth = Math.max(1.1, r * 0.22);
    ctx.stroke();
    ctx.strokeStyle = A.c(KM_STONE[2]);
    ctx.lineWidth = 0.8;
    ctx.translate(-0.8, -0.8);
    ctx.stroke();
    ctx.restore();
  }
  // 一片火焰狀的捲毛（圓瓣、尖端捲起）；用在鬃毛邊緣、肘後、尾巴
  function flameTuft(ctx, x, y, len, w, ang, dir, fill, shade, rim, lw) {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const fn = cb(x, y, x + ca * len * 0.4 - sa * w * 0.6 * dir, y + sa * len * 0.4 + ca * w * 0.6 * dir, x + ca * len * 0.85 + sa * w * 0.3 * dir, y + sa * len * 0.85 - ca * w * 0.3 * dir, x + ca * len, y + sa * len);
    rimShape(ctx, (c) => taper(c, fn, (s) => w * Math.sin(Math.min(1, 0.2 + s) * PI) * (1 - s * 0.55), 12), fill, shade, rim, { cel: w * 0.14, rim: 1, lw: lw || 2 });
    const e = fn(0.72);
    carvedCurl(ctx, e[0], e[1], w * 0.3, dir, ang);
  }
  function shieldbear(ctx, m) {
    scaledLines(ctx, 1.3, () => shieldbear2(ctx, m));
  }
  function shieldbear2(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const hurt = m.hurtT > 0;
    const dead = !!m.dead;
    const walk = walking(m) && !dead;
    const kind = eyeKind(m);
    const guard = fx.guard == null ? true : !!fx.guard;
    const bash = clamp(num(fx.bash, 0), 0, 1);
    const wind = ph === 'wind';
    const recover = ph === 'recover' || (!guard && !dead);
    const charging = bash > 0.05 || ph === 'strike';
    const guarding = !recover && (charging || wind || guard);
    const S = KM_STONE;
    const D = KM_DARK;
    const u = walk ? t * 5.5 : 0;
    const bob = walk ? Math.cos(u * 2) * 1.2 : Math.sin(t * 1.8) * 0.5;
    const lunge = charging ? 1 : 0;
    const by = -38 + bob + lunge * 3;
    ctx.save();
    if (hurt) ctx.rotate(-0.05);
    ctx.translate(lunge * 6 - (wind ? 3 : 0), 0);
    // ── 火焰狀的捲尾（三瓣、往上豎起，慢半拍擺動） ──
    const tw = Math.sin(t * 2 - 0.8) * 0.1 + (walk ? Math.sin(u - 1) * 0.07 : 0);
    ctx.save();
    ctx.translate(-32, by - 8);
    ctx.rotate(tw);
    flameTuft(ctx, -2, 2, 30, 17, -PI * 0.82, -1, D[0], D[1], null, 2.2);
    flameTuft(ctx, 0, 0, 36, 18, -PI * 0.62, 1, S[0], S[1], S[2], 2.3);
    flameTuft(ctx, 2, -1, 26, 14, -PI * 0.46, -1, S[0], S[1], S[2], 2.1);
    ctx.restore();
    // ── 腳：厚實的獅腳，肘後一撮火焰捲毛；對角步態 ──
    const leg = (front, near, ph2) => {
      const g = gaitFoot(u + ph2, walk ? 6 : 0, 5);
      const col = near ? S[0] : '#b3afa6';
      const sh = near ? S[1] : D[1];
      const rim = near ? S[2] : null;
      if (front) {
        const x0 = near ? 15 : 20;
        const fxp = x0 + 3 + g[0] + lunge * 6;
        const fyp = -g[1];
        const top = [x0, by + 6];
        const wr = [fxp - 1 + g[2] * 2, fyp - 8 + g[2]];
        const el = ik(top[0], top[1], wr[0], wr[1], 15, 13, -1);
        legMass(ctx, [x0, by + 4, 10.5, 13, -0.1], [top, el, wr, [fxp, fyp - 2]], [17, 12, 10, 9.5], col, sh, rim, { lw: 2.4 });
        if (near) flameTuft(ctx, el[0] - 1, el[1] - 2, 15, 9, PI * 0.8, -1, S[0], S[1], S[2], 1.9);
        pawFoot(ctx, fxp, fyp, 15, 8, col, sh, { rot: -g[2] * 0.5, claw: P4.goldL, lw: 2.1 });
      } else {
        const x0 = near ? -20 : -16;
        const fxp = x0 + 1 + g[0] - lunge * 3;
        const fyp = -g[1];
        const top = [x0, by + 5];
        const hock = [fxp - 8 + g[2] * 3, fyp - 11 + g[2]];
        const knee = ik(top[0], top[1], hock[0], hock[1], 14, 12, 1);
        legMass(ctx, [x0 - 1, by + 3, 12, 13, 0.3], [top, knee, hock, [fxp - 1, fyp - 2]], [17, 12, 9, 9], col, sh, rim, { lw: 2.4, inner: near ? () => carvedCurl(ctx, x0 - 2, by + 2, 6, 1, 0) : null });
        if (near) flameTuft(ctx, hock[0] - 1, hock[1] - 2, 14, 8, PI * 0.85, -1, S[0], S[1], S[2], 1.9);
        pawFoot(ctx, fxp, fyp, 15, 8, col, sh, { rot: -g[2] * 0.5, claw: P4.goldL, lw: 2.1 });
      }
    };
    leg(false, false, 0);
    leg(true, false, PI);
    // ── 身體：胸口挺起、腰身收緊的獅身（花崗岩的斑點與苔） ──
    const spine = cb(-24, by + 2, -10, by - 4, 6, by - 8, 18, by - 8);
    const bodyP = (c) => taper(c, spine, (s) => 22 + s * 8, 16);
    const hipP = (c) => c.ellipse(-20, by + 1, 13, 13, 0, 0, TAU);
    const chestP = (c) => c.ellipse(17, by - 5, 15, 19, 0.2, 0, TAU);
    blob(ctx, [bodyP, hipP, chestP], S[0], S[1], S[2], { cel: 4.5, rim: 2, lw: 2.7, inner: () => {
      // 花崗岩的斑點
      ctx.fillStyle = A.c(D[0]);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const x = -30 + hash(i * 3.3) * 58;
        const y = by - 16 + hash(i * 7.1) * 30;
        ctx.moveTo(x + 0.9, y);
        ctx.arc(x, y, 0.7 + hash(i) * 0.6, 0, TAU);
      }
      ctx.fill();
      // 刻出來的肋與腹線
      ctx.strokeStyle = A.c(D[1]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-8, by - 2);
      ctx.quadraticCurveTo(-4, by + 8, -10, by + 14);
      ctx.moveTo(-2, by - 4);
      ctx.quadraticCurveTo(3, by + 6, -2, by + 13);
      ctx.stroke();
      carvedCurl(ctx, -21, by - 2, 6.5, -1, 0);
      // 背上與凹槽裡的青苔
      ctx.fillStyle = A.c(KM_MOSS);
      ctx.beginPath();
      ctx.ellipse(-14, by - 12, 7, 2.2, -0.1, 0, TAU);
      ctx.ellipse(-22, by + 12, 4, 1.6, 0.2, 0, TAU);
      ctx.fill();
    } });
    leg(false, true, PI);
    leg(true, true, 0);
    // ── 頭與石鬃（守備時整組低頭往前，把厚鬃轉到前方當盾） ──
    const hx = 30 + lunge * 3;
    const hy = by - 22 - bob * 0.5 + (recover ? -2 + Math.sin(t * 6) * 1 : 0);
    const tilt = guarding ? 0.42 + (charging ? 0.12 : 0) : recover ? -0.12 : 0;
    const shine = dead ? 0 : charging ? 0.8 : wind ? 0.5 : guarding ? 0.15 : 0;
    ctx.save();
    ctx.translate(hx - 12, hy + 14);
    ctx.rotate(tilt);
    ctx.translate(-(hx - 12), -(hy + 14));
    if (shine > 0) glowH(ctx, hx - 10, hy + 2, 34, P4.goldL, shine * 0.4);
    // 厚重的捲鬃：一大團往後、往下的圓瓣（頭後到胸前）
    const maneP = (c) => {
      const cs = [[hx - 8, hy - 8, 12], [hx - 16, hy + 2, 12.5], [hx - 14, hy + 14, 12], [hx - 4, hy + 20, 11], [hx - 20, hy - 6, 9], [hx - 2, hy - 13, 9], [hx + 4, hy + 16, 9]];
      cloudPath(c, cs, 0, 0);
    };
    ctx.beginPath();
    maneP(ctx);
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    maneP(ctx);
    ctx.clip();
    ctx.fillStyle = A.c(D[1]);
    ctx.fillRect(hx - 50, hy - 40, 90, 90);
    ctx.translate(-3.5, -3.5);
    ctx.beginPath();
    maneP(ctx);
    ctx.fillStyle = A.c(D[0]);
    ctx.fill();
    ctx.translate(3.5, 3.5);
    // 一顆顆雕出來的渦卷＋槽裡的青苔
    [[hx - 8, hy - 8, 6.5, 1], [hx - 16, hy + 2, 7, -1], [hx - 14, hy + 14, 6.5, 1], [hx - 4, hy + 20, 6, -1], [hx - 20, hy - 6, 5, -1], [hx - 2, hy - 13, 5, 1], [hx + 4, hy + 16, 5, 1]].forEach((q) => {
      ctx.fillStyle = A.c(KM_MOSS);
      ctx.beginPath();
      ctx.ellipse(q[0] + 1.5, q[1] + q[2] * 0.6, q[2] * 0.5, 1.2, 0, 0, TAU);
      ctx.fill();
      carvedCurl(ctx, q[0], q[1], q[2], q[3], 0);
    });
    if (shine > 0.3) {
      ctx.fillStyle = 'rgba(253,233,168,' + (shine * 0.35).toFixed(3) + ')';
      ctx.fillRect(hx - 50, hy - 40, 90, 90);
    }
    ctx.restore();
    // 朱色的前掛（紅布，下緣隨步伐擺）＋金鈴
    const bibSw = Math.sin(t * 2.4 - 0.8) * 1.2 + (walk ? Math.sin(u - 0.8) * 1.5 : 0);
    const bibP = (c) => { c.moveTo(hx - 14, hy + 12); c.quadraticCurveTo(hx - 2, hy + 18, hx + 8, hy + 12); c.lineTo(hx + 2 + bibSw, hy + 30); c.quadraticCurveTo(hx - 8 + bibSw, hy + 31, hx - 12 + bibSw * 0.6, hy + 26); c.closePath(); };
    rimShape(ctx, bibP, P4.verm, P4.vermS, P4.vermL, { cel: 2, rim: 1, lw: 2, inner: () => {
      ctx.strokeStyle = A.c(P4.gold);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx - 12, hy + 15);
      ctx.quadraticCurveTo(hx - 2, hy + 20.5, hx + 6, hy + 15);
      ctx.stroke();
    } });
    A.shape(ctx, (c) => c.arc(hx - 3 + bibSw * 0.3, hy + 20, 2.8, 0, TAU), P4.gold, P4.goldS, { lw: 1.3, cel: [0.8, 0.8] });
    // 耳（垂耳）
    A.shape(ctx, (c) => { c.moveTo(hx - 4, hy - 8); c.quadraticCurveTo(hx - 13, hy - 9, hx - 12, hy); c.quadraticCurveTo(hx - 8, hy + 1, hx - 3, hy - 4); c.closePath(); }, S[0], S[1], { lw: 1.9, shadeY: hy - 3 });
    // 頭：方而寬的獅子臉，張開大嘴（阿形）
    const mo = charging ? 1 : recover ? 0.8 : 0.55;
    A.shape(ctx, (c) => { c.moveTo(hx + 2, hy + 6); c.lineTo(hx + 20, hy + 7); c.quadraticCurveTo(hx + 18, hy + 12 + mo * 5, hx + 3, hy + 11 + mo * 3); c.closePath(); }, S[1], null, { lw: 2 });
    A.shape(ctx, (c) => { c.moveTo(hx + 3.5, hy + 7); c.lineTo(hx + 18.5, hy + 7.6); c.quadraticCurveTo(hx + 15.5, hy + 10.5 + mo * 3.5, hx + 4.5, hy + 9.5 + mo * 2.2); c.closePath(); }, P4.verm, null, { noStroke: true });
    const headP = (c) => {
      c.moveTo(hx - 8, hy + 8);
      c.quadraticCurveTo(hx - 11, hy - 10, hx + 3, hy - 11);
      c.quadraticCurveTo(hx + 13, hy - 11, hx + 15, hy - 4);
      c.quadraticCurveTo(hx + 22, hy - 3, hx + 22, hy + 3);
      c.quadraticCurveTo(hx + 21, hy + 8, hx + 12, hy + 8);
      c.quadraticCurveTo(hx + 2, hy + 11, hx - 8, hy + 8);
      c.closePath();
    };
    rimShape(ctx, headP, S[0], S[1], S[2], { cel: 2.6, rim: 1.5, lw: 2.5, inner: () => {
      // 隆起的眉骨、鼻樑與頰上的渦卷刻紋
      ctx.fillStyle = A.c(KM_STONE[2]);
      ctx.beginPath();
      ctx.ellipse(hx + 16, hy + 1, 6, 4, 0, 0, TAU);
      ctx.fill();
      carvedCurl(ctx, hx + 4, hy + 3, 3.4, -1, 0);
      ctx.strokeStyle = A.c(D[1]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx + 1, hy - 7);
      ctx.quadraticCurveTo(hx + 7, hy - 10, hx + 13, hy - 6);
      ctx.stroke();
    } });
    // 獠牙
    fang(ctx, hx + 17, hy + 7.4, 3, false);
    fang(ctx, hx + 8, hy + 7.2, 2.4, false);
    fang(ctx, hx + 14, hy + 10.5 + mo * 3, 2.4, true);
    // 獅鼻
    A.shape(ctx, (c) => c.ellipse(hx + 21, hy - 0.5, 3, 2.4, 0, 0, TAU), '#57534e', null, { lw: 1 });
    // 金色的眼（守備時瞪著前方、衝撞時怒目、收招時暈眩）
    almondEye(ctx, hx + 8, hy - 3.5, 4, 2.6, P4.gold, kind === 'normal' && (charging || wind) ? 'angry' : recover && kind === 'normal' ? 'hurt' : kind, { white: P4.goldL, liner: P4.verm, lw: 2 });
    // 濃眉（刻出來的捲眉）
    flameTuft(ctx, hx + 3, hy - 7, 12, 5, -0.35, -1, S[0], S[1], S[2], 1.7);
    // 金色的獨角
    const hn = cb(hx, hy - 9, hx, hy - 17, hx + 4, hy - 22, hx + 9, hy - 25);
    rimShape(ctx, (c) => taper(c, hn, (s) => 6 * (1 - s * 0.85), 10), P4.gold, P4.goldS, P4.goldL, { cel: 1.4, rim: 0.9, lw: 1.8 });
    // 下巴的捲鬚
    flameTuft(ctx, hx + 2, hy + 10, 11, 5.5, PI * 0.62, 1, S[0], S[1], S[2], 1.8);
    ctx.restore();
    // 衝撞時的氣勁與腳下揚起的雪
    if (charging && !dead) {
      ctx.save();
      ctx.globalAlpha *= 0.8;
      ctx.strokeStyle = A.c(P4.goldL);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(hx + 4, hy + 10, 26, -1.1, 1.1);
      ctx.stroke();
      ctx.restore();
      snowDust(ctx, -22, 0, t, 1.4, -1);
    }
    if (recover && !dead) {
      const q = (t * 1.5) % 1;
      puff(ctx, hx + 26 + q * 8, hy + 6 - q * 6, 2 + q * 3, '#ffffff', (1 - q) * 0.7);
    }
    ctx.restore();
  }
  // ═════════════ 投射物 ═════════════
  function projAngle(p) {
    if (p.vx != null && p.vy != null && (p.vx || p.vy)) return Math.atan2(p.vy, p.vx);
    return (p.dir || 1) < 0 ? PI : 0;
  }
  // 白澤的占卜光球：淡青的水晶球裡睜著一隻金色神眼，身後拖著八卦爻光
  function crystalorb(ctx, p, t) {
    const a = projAngle(p);
    const seed = p.seed || 0;
    glowH(ctx, 0, 0, 30, '#9fe8ff', 0.55);
    for (let i = 1; i <= 4; i++) {
      const q = (t * 3 + i * 0.25 + seed) % 1;
      const d = 10 + i * 6 + q * 4;
      const x = -Math.cos(a) * d + Math.sin(t * 6 + i) * 2;
      const y = -Math.sin(a) * d + Math.cos(t * 5 + i) * 2;
      ctx.save();
      ctx.globalAlpha *= (1 - i / 5) * (1 - q * 0.5);
      if (i % 2) sparkle(ctx, x, y, 3.2 - i * 0.4, '#fff2a0');
      else {
        ctx.strokeStyle = A.c('#ffd24a');
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let j = 0; j < 3; j++) {
          ctx.moveTo(x - 2.5, y - 2 + j * 2);
          ctx.lineTo(x + 2.5, y - 2 + j * 2);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    const r = 10 * (1 + Math.sin(t * 10 + seed) * 0.05);
    const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, r);
    g.addColorStop(0, A.c('#ffffff'));
    g.addColorStop(0.5, A.c('#c8f2ff'));
    g.addColorStop(1, A.c('#6aa8e8'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // 水晶裡的金色神眼（看著前進方向）
    const lx = Math.cos(a) * 1.5;
    const ly = Math.sin(a) * 1.5;
    ctx.fillStyle = A.c('#fff8dc');
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(0, -6, 6, 0);
    ctx.quadraticCurveTo(0, 6, -6, 0);
    ctx.fill();
    ctx.fillStyle = A.c('#f2b43a');
    ctx.beginPath();
    ctx.arc(lx, ly, 2.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#2a1606');
    ctx.beginPath();
    ctx.ellipse(lx, ly, 0.9, 2.4, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = A.c('#8a5a20');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6.5, 0);
    ctx.quadraticCurveTo(0, -6.5, 6.5, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(-4, -5.5, 2.6, 1.3, -0.6, 0, TAU);
    ctx.fill();
    // 繞行的金環
    ctx.save();
    ctx.rotate(-0.35);
    ctx.strokeStyle = 'rgba(255,215,110,0.85)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 4.5, 0, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 2; i++) {
      const aa = t * 4 + i * PI;
      sparkle(ctx, Math.cos(aa) * 15, Math.sin(aa) * 4.5, 2.4, '#fff2a0');
    }
    ctx.restore();
  }
  // 雪男踢出的雪球：沿地面滾、越滾越大（照 p.r 畫；原點在球心），表面黏著一張鎮符
  function snowball(ctx, p, t) {
    const r = Math.max(4, num(p.r, 10));
    const dir = (p.vx || p.dir || 1) < 0 ? -1 : 1;
    const rot = p.x != null ? num(p.x, 0) / r : num(p.t, t) * 6 * dir;
    glowH(ctx, 0, 0, r * 1.6, '#bfeaff', 0.35);
    for (let i = 0; i < 3; i++) {
      const q = (t * 3 + i / 3 + (p.seed || 0)) % 1;
      puff(ctx, -dir * (r * 0.8 + q * r * 0.9), r * 0.7 - q * r * 0.6, r * (0.18 + q * 0.2), '#ffffff', (1 - q) * 0.85);
    }
    ctx.save();
    ctx.rotate(rot);
    A.shape(ctx, (c) => c.arc(0, 0, r, 0, TAU), '#f8fbff', null, { noStroke: true });
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = A.c('#dbe6f4');
    [[0.4, -0.3, 0.26], [-0.45, 0.35, 0.3], [0.1, 0.6, 0.2], [-0.35, -0.55, 0.18]].forEach((q) => {
      ctx.beginPath();
      ctx.arc(q[0] * r, q[1] * r, q[2] * r, 0, TAU);
      ctx.fill();
    });
    // 冰晶碎片
    ctx.fillStyle = A.c('#a8dcff');
    [[-0.6, -0.1], [0.55, 0.45]].forEach((q) => {
      ctx.beginPath();
      poly(ctx, [[q[0] * r, q[1] * r - r * 0.12], [q[0] * r + r * 0.08, q[1] * r], [q[0] * r, q[1] * r + r * 0.12], [q[0] * r - r * 0.08, q[1] * r]]);
      ctx.fill();
    });
    ctx.restore();
    // 黏在雪球上的鎮符
    const tw = Math.max(4, r * 0.4);
    const th = Math.max(8, r * 0.85);
    talisman(ctx, r * 0.1, -r * 0.05, tw, th, 0.2, '#ffe89a', '#c8243a', null, 0, 1);
    ctx.restore();
    // 固定方向的陰影與高光（不跟著轉）
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = A.c('#c6d6ec');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.arc(-r * 0.14, -r * 0.14, r, 0, TAU, true);
    ctx.fill();
    ctx.globalAlpha *= 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.26, r * 0.15, -0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.lineWidth = r > 14 ? 3 : 2.4;
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  // 樹靈的冰錐：尖端朝前進方向，冰裡封著一縷翠綠的生命光，尾端纏著一小枝杉葉
  function icicle(ctx, p, t) {
    ctx.rotate(projAngle(p));
    glowH(ctx, 0, 0, 22, '#bfeaff', 0.45);
    glowH(ctx, 2, 0, 12, '#c8ff7a', 0.35);
    for (let i = 1; i <= 3; i++) {
      const q = (t * 5 + i / 3 + (p.seed || 0)) % 1;
      ctx.save();
      ctx.globalAlpha *= (1 - q) * 0.9;
      sparkle(ctx, -16 - i * 6 - q * 6, Math.sin(i * 2.3 + t * 8) * 3, 2.4 - i * 0.4, i === 2 ? '#e0ffb0' : '#e6f8ff');
      ctx.restore();
    }
    const P = (c) => poly(c, [[22, 0], [-6, -7], [-14, -3], [-11, 0], [-14, 3.5], [-6, 7]]);
    rimShape(ctx, P, '#c8ecff', '#7cc4ee', '#ffffff', { cel: 2, rim: 1, lw: 2.2 });
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(18, -0.8);
    ctx.lineTo(-7, -4);
    ctx.stroke();
    ctx.strokeStyle = A.c('#8ae05a');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, 0.8);
    ctx.quadraticCurveTo(3, -0.5, 13, 0.8);
    ctx.stroke();
    // 尾端的杉葉
    ctx.strokeStyle = A.c('#2f6c4c');
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-20, 0);
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(-13 - i * 2.5, 0);
      ctx.lineTo(-16 - i * 2.5, -3);
      ctx.moveTo(-13 - i * 2.5, 0);
      ctx.lineTo(-16 - i * 2.5, 3);
    }
    ctx.stroke();
  }
  // 九尾的狐火：金橙色的火球，白芯，火尾拖在飛行方向的後面，會拐彎追人
  function foxfire(ctx, p, t) {
    const a = projAngle(p);
    const seed = p.seed || 0;
    const r = Math.max(6, num(p.r, 11));
    const fl = Math.sin(t * 20 + seed) * 0.08;
    glowH(ctx, 0, 0, r * 3, P4.teal, 0.6);
    // 飄散的火星
    for (let i = 0; i < 4; i++) {
      const q = (t * 2.5 + i / 4 + seed * 0.1) % 1;
      const d = r * (0.8 + q * 2.4);
      const side = Math.sin(i * 2.1 + seed) * r * 0.6;
      ctx.save();
      ctx.globalAlpha *= (1 - q) * 0.9;
      sparkle(ctx, -Math.cos(a) * d - Math.sin(a) * side, -Math.sin(a) * d + Math.cos(a) * side, 2.6 * (1 - q * 0.5), i % 2 ? '#ffffff' : P4.teal);
      ctx.restore();
    }
    ctx.save();
    ctx.rotate(a + PI / 2);
    // 火尾（朝後）：外焰、內焰
    const tail = (w, h, col, sw) => {
      ctx.fillStyle = A.c(col);
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.quadraticCurveTo(-w * 0.9 + sw, h * 0.55, sw * 1.8, h);
      ctx.quadraticCurveTo(w * 0.9 + sw, h * 0.55, w, 0);
      ctx.arc(0, 0, w, 0, PI, true);
      ctx.closePath();
      ctx.fill();
    };
    const sw = Math.sin(t * 14 + seed) * r * 0.25;
    tail(r * (1 + fl), r * 3, '#4fc2c0', sw);
    tail(r * 0.72, r * 2.2, P4.teal, sw * 0.7);
    tail(r * 0.45, r * 1.3, P4.tealL, sw * 0.4);
    ctx.restore();
    ctx.fillStyle = A.c('#f4fffc');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, TAU);
    ctx.fill();
    // 狐火中心的小勾玉紋
    ctx.strokeStyle = A.c(P4.tealS);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, t * 6 + seed, t * 6 + seed + 2.2);
    ctx.stroke();
  }
  // ═════════════ 地面區域 ═════════════
  function zoneFade(z, inT) {
    const life = z.life || 1;
    const zt = z.t || 0;
    return Math.max(0, Math.min(1, life - zt, zt * (inT || 4)));
  }
  // 鎌鼬的殘影：原地捲起一陣旋風、浮出翠色半透明的鎌鼬，最後 0.2 秒揮鐮再斬
  function echoghost(ctx, z, t) {
    const life = z.life || 1;
    const zt = z.t || 0;
    if (zt >= life) return;
    const left = life - zt;
    const fadeIn = Math.min(1, zt * 5);
    const fadeOut = left < 0.08 ? left / 0.08 : 1;
    const bite = left <= 0.2;
    const windUp = !bite && left < 0.5;
    ctx.save();
    ctx.translate(z.x, z.y);
    // 地上的旋風
    ctx.save();
    ctx.globalAlpha *= fadeIn * fadeOut * 0.75;
    ctx.strokeStyle = A.c('#b8fff0');
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.lineWidth = 2.6 - k * 0.6;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const q = i / 30;
        const a = -t * (6 + k) + q * TAU * 1.2 + k * 2;
        const r = 10 + q * 26 + k * 4;
        const x = Math.cos(a) * r;
        const y = -3 - k * 9 - q * 6 + Math.sin(a) * r * 0.22;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.scale((z.dir || 1) < 0 ? -1 : 1, 1);
    if (bite) ctx.translate((1 - left / 0.2) * 12, 0);
    const ga = (0.6 + Math.sin(t * 20) * 0.06) * fadeIn * fadeOut;
    const fake = { t: t, fx: { dash: bite }, attackPhase: bite ? 'strike' : windUp ? 'wind' : null, hurtT: 0, state: 'idle', vx: 0, onGround: true };
    ctx.scale(1.22, 1.22);
    ghostDraw(ctx, FERRET_BOX, ga, (g) => withTint('#6ff0d0', 0.62, () => ferretPose(g, fake, { step: 0, stretch: bite ? 1 : 0, crouch: windUp ? 1 : 0, bite: bite, echo: false })),
      'fz|' + (bite ? 1 : 0) + (windUp ? 1 : 0));
    ctx.restore();
  }
  // 雷獸擂鼓送出的雷擊地波（z.r 半寬會變大）：地面一道電光，兩端是竄起的閃電與太鼓的巴紋
  function runewave(ctx, z, t) {
    const fade = zoneFade(z, 10);
    if (fade <= 0) return;
    const r = z.r || 30;
    const flick = Math.floor(t * 14);
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= fade;
    // 地面的電光帶（中間淡、兩端亮）
    const g = ctx.createLinearGradient(-r, 0, r, 0);
    g.addColorStop(0, 'rgba(255,230,110,0.9)');
    g.addColorStop(0.5, 'rgba(140,210,255,0.12)');
    g.addColorStop(1, 'rgba(255,230,110,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -1, r, 4, 0, 0, TAU);
    ctx.fill();
    // 沿地面爬行的細電弧
    const n = Math.max(1, Math.floor(r / 34));
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < n; i++) {
        const x0 = s * (r - i * 34);
        const x1 = s * Math.max(4, r - i * 34 - 30);
        bolt(ctx, x0, -2, x1, -2, flick + i * 3 + (s > 0 ? 50 : 0), 3, '#bff0ff', 1.1, Math.max(0, 1 - i / (n + 0.5)));
      }
    }
    // 兩端：竄起的閃電＋巴紋
    for (let s = -1; s <= 1; s += 2) {
      ctx.save();
      ctx.translate(s * r, 0);
      ctx.scale(s, 1);
      glowH(ctx, 0, -14, 30, '#ffe07a', 0.5);
      const wg = ctx.createLinearGradient(0, -38, 0, 0);
      wg.addColorStop(0, 'rgba(255,250,210,0)');
      wg.addColorStop(0.5, 'rgba(160,220,255,0.55)');
      wg.addColorStop(1, 'rgba(90,110,230,0.8)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.quadraticCurveTo(-4, -40, 10, 0);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const x = -12 + i * 7;
        bolt(ctx, x, 0, x + (hash(flick + i * 7 + s) - 0.5) * 10, -18 - hash(flick * 3 + i + s) * 20, flick * 5 + i + s * 9, 3.5, i === 1 ? '#fff2a0' : '#bff0ff', 1.6, 1);
      }
      ctx.save();
      ctx.globalAlpha *= 0.9;
      tomoe(ctx, -2, -24, 6, t * 8, '#ffd24a');
      ctx.restore();
      // 飛濺的冰屑
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha *= 1 - q;
        sparkle(ctx, -4 + i * 6 - q * 10, -6 - Math.sin(q * PI) * (18 + i * 5), 3, i % 2 ? '#fff2a0' : '#dff6ff');
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // 芬里爾的影子：貼地滑行（z.x 移動中），z.bite 0..1 時從地上冒出來咬合（影子狼的上下顎＋斷鏈）
  function wolfshadow(ctx, z, t) {
    const life = z.life || 1;
    const zt = z.t || 0;
    const fade = Math.max(0, Math.min(1, (life - zt) * 5, zt * 5));
    if (fade <= 0) return;
    const bite = clamp(num(z.bite, 0), 0, 1);
    const dir = (z.dir || (z.vx != null && z.vx < 0 ? -1 : 1)) < 0 ? -1 : 1;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= fade;
    ctx.scale(dir, 1);
    // 地上的影子（往前滑，頭在前）
    ctx.save();
    ctx.scale(-0.75, 1);
    wolfShadowShape(ctx, t, 0.9, bite < 0.3);
    ctx.restore();
    if (bite <= 0) {
      ctx.strokeStyle = 'rgba(143,217,207,0.7)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i / 3) % 1;
        const x = -30 - q * 20;
        ctx.moveTo(x, -2 - i * 3);
        ctx.lineTo(x - 12, -2 - i * 3);
      }
      ctx.stroke();
    } else {
      // 冒出來的影之顎
      const h = 44 * Math.min(1, bite * 1.6);
      const close = Math.max(0, (bite - 0.45) / 0.55);
      const gap = (1 - close) * 16;
      glowH(ctx, 0, -h * 0.5, h * 0.9 + 10, FEN_RGB, 0.5);
      const jaw = (side) => {
        ctx.save();
        ctx.translate(side * (4 + gap), 0);
        ctx.scale(side, 1);
        ctx.fillStyle = A.c('#10132e');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(14, -h * 0.3, 10, -h);
        ctx.quadraticCurveTo(4, -h * 0.9, 0, -h * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = A.c(P4.teal);
        ctx.lineWidth = 1.8;
        ctx.stroke();
        // 牙
        ctx.fillStyle = '#f4fffc';
        for (let i = 0; i < 3; i++) {
          const y = -h * (0.25 + i * 0.22);
          ctx.beginPath();
          ctx.moveTo(1.5 + i * 0.4, y - 3);
          ctx.lineTo(-3.5, y);
          ctx.lineTo(1.5 + i * 0.4, y + 3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      };
      jaw(-1);
      jaw(1);
      chainLink(ctx, -12, -4, 0.3, 0.9);
      chainLink(ctx, 12, -5, -0.4, 0.9, true);
      if (bite < 0.6) {
        ctx.fillStyle = '#e6f7f4';
        ctx.beginPath();
        ctx.ellipse(-3, -h - 4, 1.8, 1.1, 0, 0, TAU);
        ctx.ellipse(3, -h - 4, 1.8, 1.1, 0, 0, TAU);
        ctx.fill();
      }
      if (close > 0.8) {
        ctx.save();
        ctx.globalAlpha *= (close - 0.8) * 5;
        sparkle(ctx, 0, -h * 0.6, 9, P4.tealL);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  // 貘吐出的夢霧（z.r 半徑）：粉紫色的霧、漂浮的夢泡泡（裡面是星星與月亮）、Z 字
  function sleepfog(ctx, z, t) {
    const fade = zoneFade(z, 3);
    if (fade <= 0) return;
    const r = z.r || 60;
    const seed = z.seed || 0;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= fade;
    // 地面上的淡紫光
    const bg = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, -r * 0.2, r * 1.1);
    bg.addColorStop(0, 'rgba(143,217,207,0.35)');
    bg.addColorStop(1, 'rgba(143,217,207,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.25, r * 1.1, r * 0.6, 0, 0, TAU);
    ctx.fill();
    // 一團團飄動的夢霧
    const n = Math.max(7, Math.round(r / 9));
    for (let i = 0; i < n; i++) {
      const q = (i + 0.5) / n;
      const x = Math.sin(t * 0.5 + i * 2.3 + seed) * r * 0.08 + (q * 2 - 1) * r * 0.8;
      const y = -r * 0.18 - Math.sin(i * 1.7 + seed) * r * 0.12 - Math.sin(t * 0.8 + i) * 3;
      const rr = r * (0.3 + ((i * 7) % 4) * 0.04) * (1 - Math.abs(q * 2 - 1) * 0.35);
      const g = ctx.createRadialGradient(x, y, rr * 0.1, x, y, rr);
      g.addColorStop(0, 'rgba(190,238,230,0.55)');
      g.addColorStop(0.6, 'rgba(143,217,207,0.3)');
      g.addColorStop(1, 'rgba(79,159,157,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, TAU);
      ctx.fill();
    }
    // 夢泡泡
    for (let i = 0; i < 5; i++) {
      const q = (t * 0.25 + i / 5 + seed) % 1;
      const x = (((i * 53) % 100) / 100 - 0.5) * r * 1.6 + Math.sin(t * 1.2 + i * 2) * 6;
      const y = -10 - q * r * 0.9;
      const br = 5 + (i % 3) * 2;
      ctx.save();
      ctx.globalAlpha *= Math.sin(q * PI) * 0.9;
      ctx.fillStyle = 'rgba(230,255,250,0.25)';
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, br, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(x - br * 0.4, y - br * 0.45, br * 0.25, br * 0.14, -0.6, 0, TAU);
      ctx.fill();
      if (i % 2) sparkle(ctx, x, y, br * 0.5, '#fff2a0');
      else snowflake(ctx, x, y, br * 0.5, P4.tealL, 1.1);
      ctx.restore();
    }
    // 漂浮的 Z、星星與小月亮
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.3 + i / 4 + seed) % 1;
      const x = (((i * 37) % 100) / 100 - 0.5) * r * 1.5 + Math.sin(t * 1.5 + i) * 5;
      const y = -8 - q * r * 0.8;
      ctx.save();
      ctx.globalAlpha *= Math.sin(q * PI) * 0.95;
      if (i % 2 === 0) zGlyph(ctx, x, y, 6 + (i % 3) * 2, '#efe6ff');
      else sparkle(ctx, x, y, 3.5, '#fff6c0');
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha *= 0.8;
    crescent(ctx, Math.sin(t * 0.7 + seed) * r * 0.3, -r * 0.55 - Math.sin(t * 1.3) * 3, 5.5, '#ffe38a', 1.4);
    ctx.restore();
    ctx.restore();
  }
  // ═════════════ 素材圖示（掉落物） ═════════════
  const ICON5 = {
    // 鎌鼬之刃：一片彎彎的鐮刃，朱紅纏柄，身邊一縷旋風
    phantomgem(ctx) {
      ctx.save();
      ctx.strokeStyle = A.c('#9ff0dc');
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-2, 2, 14, 2.2, 4.2);
      ctx.moveTo(-9, 12);
      ctx.arc(-2, 4, 10, 2.4, 3.9);
      ctx.stroke();
      ctx.restore();
      glowH(ctx, 3, -3, 16, '#8ff5d8', 0.35);
      ctx.save();
      ctx.translate(-10, 11);
      ctx.rotate(-0.45);
      sickle(ctx, 24, 0, 0.8, false);
      ctx.restore();
    },
    // 白澤之眼：金座上的淡青水晶球，裡面睜著一隻金色神眼
    owlcrystal(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-10, 14); c.lineTo(-7, 7); c.lineTo(7, 7); c.lineTo(10, 14); c.closePath(); }, '#ffd24a', '#d99a2a', { lw: 2, shadeY: 11 });
      tomoe(ctx, 0, 10.5, 2.6, 0, '#a86a1a');
      glowH(ctx, 0, -4, 20, '#9fe8ff', 0.5);
      const g = ctx.createRadialGradient(-3, -7, 1, 0, -4, 11);
      g.addColorStop(0, A.c('#ffffff'));
      g.addColorStop(0.5, A.c('#c8f2ff'));
      g.addColorStop(1, A.c('#6aa8e8'));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -4, 11, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.2;
      ctx.stroke();
      godEye(ctx, 0, -4, 6, 3, 0, 1, 0.3, 'normal');
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(-5, -10, 3, 1.5, -0.6, 0, TAU);
      ctx.fill();
      sparkle(ctx, 10, -13, 3, '#fff2a0');
    },
    // 雪男符：黃色的鎮符（朱紅咒文），上面結著霜、夾著一撮白毛
    runepaper(ctx) {
      glowH(ctx, 0, 0, 17, '#bfeaff', 0.4);
      ctx.save();
      ctx.rotate(-0.22);
      talisman(ctx, 0, 0, 13, 28, 0, '#ffe89a', '#c8243a', null, 0, 2);
      // 霜
      ctx.fillStyle = 'rgba(230,248,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(-6.5, -14);
      ctx.lineTo(6.5, -14);
      ctx.lineTo(6.5, -10);
      ctx.quadraticCurveTo(3, -8, 1, -11);
      ctx.quadraticCurveTo(-3, -8, -6.5, -10.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      furTuft(ctx, -9, 6, 4, 11, -2, '#f4f6ff', '#aab5de', 'out', 1.6);
      furTuft(ctx, -5, 7, 3.5, 9, 1, '#f4f6ff', '#aab5de', 'out', 1.6);
      snowflake(ctx, 10, -12, 5, '#bfe6ff', 1.6);
    },
    // 雷鼓皮：朱漆鼓框的一片鼓面，三巴紋上劈過一道閃電
    drumskin(ctx) {
      glowH(ctx, 0, 1, 18, '#ffe07a', 0.4);
      A.shape(ctx, (c) => c.ellipse(0, 1, 14, 12, 0, 0, TAU), '#c8342c', '#86201c', { cel: [2.5, 2.5], lw: 2.4 });
      ctx.fillStyle = A.c('#ffd24a');
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 12, 1 + Math.sin(a) * 10.2, 0.9, 0, TAU);
        ctx.fill();
      }
      A.shape(ctx, (c) => c.ellipse(0, 1, 10, 8.5, 0, 0, TAU), '#f4e6c4', '#d8c49a', { cel: [1.5, 1.5], lw: 1.8 });
      tomoe(ctx, 0, 1, 6.5, 0.4, '#c8342c');
      bolt(ctx, -12, -12, 10, 13, 3, 4, '#fff2a0', 1.8, 1);
    },
    // 芬里爾之毛：一撮燒著影焰的黑毛，綁著一節斷掉的鎖鏈
    shadowfur(ctx) {
      glowH(ctx, 0, 0, 16, '#a77cff', 0.45);
      shadowFlame(ctx, 3, -6, 4, 12, -2, 0.9);
      A.shape(ctx, (c) => {
        c.moveTo(-12, 10);
        c.quadraticCurveTo(-10, -2, -4, -12);
        c.lineTo(-2, -4);
        c.quadraticCurveTo(2, -10, 6, -14);
        c.lineTo(6, -5);
        c.quadraticCurveTo(10, -8, 13, -9);
        c.quadraticCurveTo(10, 2, 8, 10);
        c.quadraticCurveTo(-2, 14, -12, 10);
        c.closePath();
      }, '#383d58', '#1f2238', { cel: [2, 2], lw: 2.2 });
      ctx.strokeStyle = A.c('#8f96cc');
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-7, 8);
      ctx.quadraticCurveTo(-6, 0, -3, -5);
      ctx.moveTo(2, 8);
      ctx.quadraticCurveTo(3, 0, 6, -5);
      ctx.stroke();
      chainLink(ctx, -3, 8, 0.2, 1.1);
      chainLink(ctx, 5, 10, -0.3, 1.1, true);
    },
    // 貘之夢：一顆夢泡泡（裡面是彎月與星星），底下托著一朵夢雲
    // 雪女的冰簪：一支淡青的冰晶髮簪，簪頭是六角雪花，掛著一串小冰珠
    dreamwool(ctx) {
      glowH(ctx, 2, -2, 18, P4.teal, 0.5);
      ctx.save();
      ctx.rotate(0.6);
      A.shape(ctx, (c) => poly(c, [[-1.8, -4], [0, 16], [1.8, -4]]), P4.tealL, P4.teal, { lw: 1.8, shadeY: 4 });
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-0.5, -2);
      ctx.lineTo(0, 12);
      ctx.stroke();
      // 簪頭的雪花
      A.shape(ctx, (c) => starPath(c, 0, -9, 7.5, 3.2, 6, -PI / 2), '#ffffff', P4.tealL, { lw: 1.7, shadeY: -8 });
      snowflake(ctx, 0, -9, 4.5, P4.tealS, 1);
      // 垂下的冰珠
      ctx.restore();
      [[-7, -2], [-8.5, 3], [-9.5, 8]].forEach((q, i) => A.shape(ctx, (c) => c.arc(q[0], q[1], 1.8 - i * 0.2, 0, TAU), P4.tealL, P4.teal, { lw: 1.2, shadeY: q[1] + 0.5 }));
      sparkle(ctx, 8, -12, 2, '#ffffff');
      sparkle(ctx, 7, 8, 1.5, P4.tealL);
    },
    // 九尾封符：封印符上蓋著朱紅的狐印，旁邊燃著一團狐火
    sealtalisman(ctx) {
      glowH(ctx, 0, 0, 16, '#ffb03a', 0.35);
      talisman(ctx, -2, 0, 13, 26, 0.16, '#fff1b8', '#d8283a', null, 0, 0);
      ctx.save();
      ctx.rotate(0.16);
      // 狐面印
      A.shape(ctx, (c) => { c.moveTo(-6, -4); c.lineTo(-5, -10); c.lineTo(-2.5, -6.5); c.lineTo(0.5, -6.5); c.lineTo(3, -10); c.lineTo(3.5, -4); c.quadraticCurveTo(-1, 2, -6, -4); c.closePath(); }, '#d8283a', null, { lw: 1.1 });
      ctx.restore();
      foxFlame(ctx, 10, -10, 4, 0.3, 1, 1);
    },
    // 御神木之心：綁著注連繩的翠金色心核
    lifecrystal(ctx) {
      lifeCore(ctx, 0, 0, 11, 0.6, 0.4, 1);
      ropeStroke(ctx, (c) => { c.moveTo(-13, -3); c.quadraticCurveTo(0, 4, 13, -3); }, 3.2, '#e8d49a', '#b89a5a');
      shide(ctx, -4, 1, 2, 0.1);
      shide(ctx, 5, 1, 2, -0.1);
      sparkle(ctx, 11, -11, 3.5, '#ffffff');
    },
    // 狛犬石盾片：一片花崗岩的盾片，刻著半個金色的巴紋，帶著青苔
    shieldshard(ctx) {
      const P = (c) => poly(c, [[-13, 11], [-9, -12], [4, -14], [13, 4], [4, 13]]);
      glowH(ctx, 2, 0, 17, '#ffd86a', 0.35);
      rimShape(ctx, P, '#b4afa4', '#77726a', '#ebe6da', { cel: 3, rim: 1.4, lw: 2.4, inner: () => {
        A.shape(ctx, (c) => c.arc(8, 8, 15, 0, TAU), '#c4bfb3', null, { lw: 1.6 });
        tomoe(ctx, 8, 8, 9, 0.3, '#ffd24a');
        ctx.fillStyle = A.c('#8a9a5a');
        ctx.beginPath();
        ctx.ellipse(-7, -6, 3.5, 2.2, 0.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = A.c('#9a958b');
        [[-4, 4], [-9, 2], [0, -8]].forEach((q) => {
          ctx.beginPath();
          ctx.arc(q[0], q[1], 1, 0, TAU);
          ctx.fill();
        });
      } });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-9, -12);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-9, 2);
      ctx.stroke();
      sparkle(ctx, 10, -11, 3.5, '#fff6c8');
    },
  };

  // 全部用靛墨描邊（inked）
  Object.assign(A.MONSTER_DRAW, {
    echoferret: inked(echoferret),
    crystalowl: inked(crystalowl),
    avalanchehare: inked(avalanchehare),
    drumyak: inked(drumyak),
    shadowwolf: inked(shadowwolf),
    dreamsheep: inked(dreamsheep),
    silencefox: inked(silencefox),
    heartcedar: inked(heartcedar),
    shieldbear: inked(shieldbear),
  });
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  Object.assign(A.PROJ_DRAW, { crystalorb, snowball, icicle, foxfire });
  // v1.4：九尾狐不再封技能，封印結界（sealfield）不再使用
  Object.assign(A.ZONE_DRAW, { echoghost, runewave, wolfshadow, sleepfog });
  if (A.ICON) Object.assign(A.ICON, ICON5);
})();
