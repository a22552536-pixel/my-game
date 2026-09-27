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

  // ═════════════ 第四章：霜鈴雪峰 ═════════════

  // ── 鎌鼬（echoferret）：乘著旋風的妖鼬。鋼青色的長身、臉上朱紅隈取，兩隻前肢是閃著寒光的鐮刀，
  //    尾巴末端化成一團旋風；撲斬時身後拖著殘影，殘影 1 秒後再斬一次（zone echoghost 也用這個姿勢畫）──
  const KAMA_FUR = ['#4f7d95', '#2d5069', '#a6dcea'];
  const KAMA_BELLY = ['#eef7f5', '#bfd4da'];
  const KAMA_RED = '#d8344a';
  const KAMA_RGB = '140,245,215';
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
  // 鐮刀刃（原點在手腕，刃朝 +x 往上彎）
  function sickle(ctx, len, t, glint, echo) {
    const L = len;
    const P = (c) => {
      c.moveTo(-2, 4);
      c.quadraticCurveTo(L * 0.75, 6, L, -L * 0.72);
      c.quadraticCurveTo(L * 0.55, -L * 0.12, -1, -4);
      c.closePath();
    };
    if (!echo && glint > 0.5) glowH(ctx, L * 0.55, -L * 0.2, L * 0.7, '#8ff5d8', (glint - 0.5) * 0.5);
    rimShape(ctx, P, '#d3e0ec', '#6f86a0', '#ffffff', { cel: 2.4, rim: 1.3, lw: 2.2 });
    // 刃紋（波浪狀的淬火線）＋銳利的內刃白光
    ctx.save();
    ctx.beginPath();
    P(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c('#9fb4c8');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      const u = 1 - k;
      const x = 2 * u * k * L * 0.66 + k * k * L * 0.99;
      const y = u * u * 0.3 + 2 * u * k * (-L * 0.02) + k * k * (-L * 0.71) + Math.sin(k * 20) * 0.9 * (1 - k);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(L * 0.95, -L * 0.66);
    ctx.quadraticCurveTo(L * 0.56, -L * 0.08, 1, -2.4);
    ctx.stroke();
    // 纏柄（朱紅的纏繩）
    A.shape(ctx, (c) => A.roundRect(c, -4.5, -3.8, 6, 7.6, 2), KAMA_RED, '#8e1c2c', { lw: 1.6, shadeY: 1.5 });
    ctx.strokeStyle = A.c('#ffd6a0');
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-3.5, -2);
    ctx.lineTo(0.5, 0.5);
    ctx.moveTo(-3.5, 1);
    ctx.lineTo(0.5, 3.2);
    ctx.stroke();
    if (glint > 0.05 && !echo) {
      ctx.save();
      ctx.globalAlpha *= clamp(glint, 0, 1);
      sparkle(ctx, L * 0.97, -L * 0.68, 4 + glint * 3, '#ffffff');
      ctx.restore();
    }
  }
  function ferretPose(ctx, m, o) {
    const t = m.t || 0;
    const st = o.stretch || 0;
    const cr = o.crouch || 0;
    const step = o.step || 0;
    const seed = o.seed || 0;
    const echo = !!o.echo;
    const F = KAMA_FUR;
    const kind = eyeKind(m);
    const bob = Math.sin(t * 3 + seed) * 0.8 * (1 - st);
    const Hx = -12 - st * 2;
    const Hy = -17 + cr * 3 + st * 2;
    const Cx = 13 + st * 10 - cr * 2;
    const Cy = -29 + cr * 8 + st * 11 + bob;
    const hdx = Cx + 12 + st * 3;
    const hdy = Cy - 8 + st * 3 + cr * 2;
    // ── 旋風（腳下與尾巴的風） ──
    const windRing = (x, y, rx, ry, a0, sp, alpha, lw) => {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = A.c('#c8fff0');
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = a0 + t * sp + i * 2.1;
        ctx.beginPath();
        ctx.ellipse(x, y, rx * (1 - i * 0.12), ry * (1 - i * 0.12), 0, a, a + 1.6);
        ctx.stroke();
      }
      ctx.restore();
    };
    // 尾巴：蓬鬆的長尾，末端化成旋風
    const tailFn = cb(Hx - 6, Hy - 1, Hx - 22, Hy + 2 + st * 6, Hx - 30, Hy - 16 + st * 12, Hx - 22 - st * 16, Hy - 30 + st * 20 + Math.sin(t * 4 + seed) * 2);
    const tailW = (s) => 7 + Math.sin(s * PI) * 9 - s * 3;
    const tp = tailFn(1);
    if (!echo) glowH(ctx, tp[0], tp[1], 26, '#8ff5d8', 0.35);
    windRing(tp[0] - 2, tp[1] + 2, 16, 7, 0, -7, 0.8, 2);
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = A.c('#c8fff0');
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      const a = -t * 8 + k * TAU * 1.4 + seed;
      const r = 3 + k * 14;
      const x = tp[0] + Math.cos(a) * r;
      const y = tp[1] - k * 10 + Math.sin(a) * r * 0.35;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = A.c('#e6fff8');
    ctx.stroke();
    ctx.restore();
    const tailP = (c) => taper(c, tailFn, tailW, 18);
    rimShape(ctx, tailP, F[0], F[1], F[2], { cel: 3, rim: 1.6, lw: 2.4, inner: () => {
      // 尾端漸漸變成風的顏色
      ctx.fillStyle = A.c('#8fe6d8');
      ctx.beginPath();
      taper(ctx, (s) => tailFn(0.62 + s * 0.38), (s) => 30, 8);
      ctx.fill();
      ctx.fillStyle = A.c('#e6fff8');
      ctx.beginPath();
      taper(ctx, (s) => tailFn(0.84 + s * 0.16), (s) => 30, 6);
      ctx.fill();
      const list = [];
      for (let i = 0; i < 9; i++) {
        const q = along(tailFn, 0.1 + i * 0.08, (hash(i + seed) - 0.5) * tailW(0.1 + i * 0.08) * 0.6);
        list.push([q[0], q[1], q[2] + PI + 0.25, 5]);
      }
      strands(ctx, list, F[1], 1);
    } });

    // ── 遠側的後腳與鐮刀臂 ──
    const hind = (dx, s, col, sh) => {
      const kx = Hx + dx;
      const fx = kx + 7 + s * 5 - st * 6;
      const lift = Math.max(0, s) * 3;
      A.ellipse(ctx, kx + 2, Hy + 3, 8, 9, col, sh, { lw: 2.2, hl: false, cel: [2, 2] });
      limb(ctx, (c) => { c.moveTo(kx + 4, Hy + 8); c.quadraticCurveTo(kx - 1, Hy + 12, fx - 2, -2.5 - lift); }, 7, col);
      A.shape(ctx, (c) => { c.moveTo(fx - 6, -lift); c.quadraticCurveTo(fx - 5, -5.5 - lift, fx + 1, -5 - lift); c.quadraticCurveTo(fx + 7, -4 - lift, fx + 7, -lift); c.closePath(); }, col, sh, { lw: 2, shadeY: -2 - lift });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx + 2, -lift);
      ctx.lineTo(fx + 2, -2.5 - lift);
      ctx.moveTo(fx + 4.5, -lift);
      ctx.lineTo(fx + 4.5, -2.5 - lift);
      ctx.stroke();
    };
    const arm = (far) => {
      const sx = Cx - 3 + (far ? 3 : 0);
      const sy = Cy + 4 + (far ? -1 : 0);
      let ex, ey, wx, wy, ba;
      const sw = Math.sin(t * 3 + seed + (far ? 1 : 0)) * 0.08;
      if (cr > 0) {
        ex = sx - 5 + (far ? 3 : 0);
        ey = sy - 7;
        wx = ex - 2 + (far ? 4 : 0);
        wy = ey - 9;
        ba = (far ? -1.6 : -2.1) + sw;
      } else if (st > 0) {
        ex = sx + 9;
        ey = sy + 3;
        wx = ex + 9;
        wy = ey + (far ? -3 : 1);
        ba = far ? -0.25 : 0.55;
      } else {
        ex = sx + 5 + (far ? 2 : 0);
        ey = sy + 8;
        wx = ex + (far ? 2 : 10);
        wy = ey - (far ? 12 : 2);
        ba = (far ? -1.75 : -0.12) + sw;
      }
      const col = far ? F[1] : F[0];
      limb(ctx, (c) => { c.moveTo(sx, sy); c.quadraticCurveTo(ex - 2, ey + 1, ex, ey); c.lineTo(wx, wy); }, 7, col);
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(ba);
      if (far) ctx.scale(0.9, 0.9);
      sickle(ctx, 30, t, st > 0 ? 1 : cr > 0 ? 0.6 : 0.25 + 0.2 * Math.sin(t * 4 + (far ? 2 : 0)), echo);
      ctx.restore();
    };
    hind(4, -step, F[1], '#1f3a4e');
    arm(true);

    // ── 身體：修長的 S 形，淡色的肚子，朱紅的風紋 ──
    const bodyFn = cb(Hx - 6, Hy + 1, Hx + 10, Hy - 5, Cx - 10, Cy + 5, Cx + 3, Cy);
    const bodyW = (s) => 19 - s * 5 + Math.sin(s * PI) * 3;
    const bodyP = (c) => taper(c, bodyFn, bodyW, 18);
    const hipP = (c) => c.ellipse(Hx - 1, Hy - 1, 12, 11, 0, 0, TAU);
    const chestP = (c) => c.ellipse(Cx + 1, Cy + 1, 9, 9.5, 0, 0, TAU);
    blob(ctx, [bodyP, hipP, chestP], F[0], F[1], F[2], { cel: 3, rim: 1.8, lw: 2.5, inner: () => {
      // 肚子
      ctx.fillStyle = A.c(KAMA_BELLY[0]);
      ctx.beginPath();
      taper(ctx, (s) => { const p = bodyFn(s); return [p[0] + 1, p[1] + 6 + s * 2]; }, (s) => 8 + s * 5, 12);
      ctx.fill();
      // 背上的毛流
      const list = [];
      for (let i = 0; i < 12; i++) {
        const q = along(bodyFn, 0.08 + i * 0.075, -bodyW(0.08 + i * 0.075) * (0.15 + hash(i * 3 + seed) * 0.25));
        list.push([q[0], q[1], q[2] + PI - 0.2, 5 + hash(i) * 2]);
      }
      strands(ctx, list, F[1], 1);
    } });
    // 肚子的月牙陰影與胸前的白毛
    ctx.save();
    ctx.beginPath();
    bodyP(ctx);
    ctx.clip();
    ctx.fillStyle = A.c(KAMA_BELLY[1]);
    ctx.beginPath();
    taper(ctx, (s) => { const p = bodyFn(s); return [p[0] + 1, p[1] + 9 + s * 2]; }, (s) => 4 + s * 3, 12);
    ctx.fill();
    ctx.restore();
    A.shape(ctx, (c) => { c.moveTo(Cx - 4, Cy - 2); c.quadraticCurveTo(Cx + 9, Cy - 4, Cx + 8, Cy + 6); c.lineTo(Cx + 5, Cy + 4); c.lineTo(Cx + 3, Cy + 9); c.lineTo(Cx, Cy + 6); c.lineTo(Cx - 3, Cy + 10); c.quadraticCurveTo(Cx - 6, Cy + 4, Cx - 4, Cy - 2); c.closePath(); }, KAMA_BELLY[0], KAMA_BELLY[1], { lw: 1.6, shadeY: Cy + 5 });
    // 朱紅風紋（身側一道道往後吹的紋）
    const rg = echo ? 0 : 0.5 + 0.5 * Math.sin(t * 5 + seed);
    [0.3, 0.52].forEach((s0, i) => {
      const p = along(bodyFn, s0, -2);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(p[2]);
      A.shape(ctx, (c) => { c.moveTo(6, -1); c.quadraticCurveTo(0, -5, -12 + i * 2, -3); c.quadraticCurveTo(-2, -2, 6, 2); c.closePath(); }, KAMA_RED, '#9a1e30', { lw: 1.2, shadeY: 1 });
      ctx.restore();
    });
    if (!echo) glowStroke(ctx, (c) => { const a = along(bodyFn, 0.15, 3); const b = along(bodyFn, 0.7, 5); c.moveTo(a[0], a[1]); c.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 3, b[0], b[1]); }, '#c8fff0', 1.2, KAMA_RGB, 0.4 + rg * 0.4 + st * 0.4);
    hind(0, step, F[0], F[1]);

    // ── 頭：尖吻、後掠的耳朵、朱紅隈取、細長的翠色妖眼 ──
    const bite = !!o.bite;
    ctx.save();
    ctx.translate(hdx - 6, hdy + 6);
    ctx.scale(1.18, 1.18);
    ctx.translate(-(hdx - 6), -(hdy + 6));
    // 臉頰旁的鬃毛
    A.shape(ctx, (c) => { c.moveTo(hdx - 6, hdy - 6); c.lineTo(hdx - 16, hdy - 3); c.lineTo(hdx - 10, hdy); c.lineTo(hdx - 17, hdy + 4); c.lineTo(hdx - 8, hdy + 5); c.lineTo(hdx - 12, hdy + 9); c.lineTo(hdx - 2, hdy + 7); c.closePath(); }, F[1], null, { lw: 2 });
    const ear = (x, y, col, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      A.shape(ctx, (c) => { c.moveTo(-5, 2); c.quadraticCurveTo(-4, -9, 1, -11); c.quadraticCurveTo(5, -6, 5, 2); c.closePath(); }, col, null, { lw: 2 });
      A.shape(ctx, (c) => { c.moveTo(-2.5, 1); c.quadraticCurveTo(-2, -6, 0.8, -7.5); c.quadraticCurveTo(3, -4, 2.5, 1); c.closePath(); }, '#f2b8c0', null, { noStroke: true });
      ctx.restore();
    };
    ear(hdx - 3, hdy - 7, F[1], -0.75);
    const headP = (c) => {
      c.moveTo(hdx - 10, hdy + 5);
      c.quadraticCurveTo(hdx - 13, hdy - 8, hdx - 1, hdy - 10);
      c.quadraticCurveTo(hdx + 8, hdy - 10.5, hdx + 12, hdy - 4);
      c.lineTo(hdx + 19, hdy + 0.5);
      c.quadraticCurveTo(hdx + 20.5, hdy + 3.5, hdx + 16, hdy + 4.5);
      c.quadraticCurveTo(hdx + 5, hdy + 9, hdx - 10, hdy + 5);
      c.closePath();
    };
    if (bite) {
      // 張開的下顎
      A.shape(ctx, (c) => { c.moveTo(hdx + 2, hdy + 4); c.lineTo(hdx + 17, hdy + 8); c.quadraticCurveTo(hdx + 14, hdy + 12, hdx + 3, hdy + 10); c.closePath(); }, F[1], null, { lw: 2 });
      A.shape(ctx, (c) => { c.moveTo(hdx + 3, hdy + 4.5); c.lineTo(hdx + 16, hdy + 7.5); c.lineTo(hdx + 4, hdy + 8.5); c.closePath(); }, '#5a1426', null, { noStroke: true });
      fang(ctx, hdx + 14, hdy + 7.2, 2.6, true);
    }
    rimShape(ctx, headP, F[0], F[1], F[2], { cel: 2.5, rim: 1.5, lw: 2.4, inner: () => {
      // 白色的口吻與下巴
      ctx.fillStyle = A.c(KAMA_BELLY[0]);
      ctx.beginPath();
      ctx.moveTo(hdx - 4, hdy + 8);
      ctx.quadraticCurveTo(hdx + 4, hdy + 1, hdx + 21, hdy + 1);
      ctx.lineTo(hdx + 21, hdy + 10);
      ctx.closePath();
      ctx.fill();
      // 朱紅隈取：從眼角往後上方掃到耳根
      ctx.fillStyle = A.c(KAMA_RED);
      ctx.beginPath();
      ctx.moveTo(hdx + 10, hdy - 1.5);
      ctx.quadraticCurveTo(hdx + 2, hdy - 7, hdx - 9, hdy - 9);
      ctx.quadraticCurveTo(hdx - 1, hdy - 3, hdx + 9, hdy + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hdx + 3, hdy + 2.5);
      ctx.quadraticCurveTo(hdx - 3, hdy + 3, hdx - 8, hdy + 1);
      ctx.quadraticCurveTo(hdx - 2, hdy + 5, hdx + 4, hdy + 4);
      ctx.closePath();
      ctx.fill();
    } });
    ear(hdx + 3, hdy - 8.5, F[0], -0.45);
    // 額頭的風之印（小勾玉形）
    ctx.save();
    if (!echo) glowH(ctx, hdx + 1, hdy - 6.5, 6 + rg * 2 + st * 3, '#8ff5d8', 0.35);
    ctx.fillStyle = A.c('#b8fff0');
    ctx.beginPath();
    ctx.arc(hdx + 1, hdy - 6.5, 1.6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = A.c('#b8fff0');
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(hdx + 1, hdy - 6.5, 3.2, PI * 0.1, PI * 1.3);
    ctx.stroke();
    ctx.restore();
    // 眼睛：細長的杏眼＋翠色豎瞳
    const ex = hdx + 6;
    const ey = hdy - 2.5;
    if (kind === 'normal' || kind === 'angry') {
      if (!echo) glowH(ctx, ex, ey, 8, '#8ff5d8', 0.3);
      const eyeP = (c) => { c.moveTo(ex - 4, ey + 0.8); c.quadraticCurveTo(ex, ey - 3.4, ex + 4.2, ey - 0.8); c.quadraticCurveTo(ex + 0.5, ey + 2.6, ex - 4, ey + 0.8); c.closePath(); };
      A.shape(ctx, eyeP, '#b8ffd8', null, { lw: 1.4 });
      ctx.fillStyle = A.c('#123a30');
      ctx.beginPath();
      ctx.ellipse(ex + 0.6, ey - 0.3, 0.9, 1.9, 0.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 1.3, ey - 0.8, 0.8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - 4.5, ey + 0.2);
      ctx.quadraticCurveTo(ex, ey - 3.8 - (kind === 'angry' ? 0 : 0.3), ex + 5.5, ey - 2 + (kind === 'angry' ? 1.2 : 0));
      ctx.stroke();
    } else A.eye(ctx, ex, ey, 2.8, 2.6, kind);
    // 鼻頭、嘴角
    A.ellipse(ctx, hdx + 19, hdy + 1.2, 1.7, 1.4, '#2a1c28', null, { lw: 1, hl: false });
    if (!bite) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hdx + 17, hdy + 3.8);
      ctx.quadraticCurveTo(hdx + 12, hdy + 5, hdx + 8, hdy + 3.6);
      ctx.stroke();
      fang(ctx, hdx + 12.5, hdy + 4.4, 1.8, false);
    }
    // 鬍鬚：往後吹的風絲
    ctx.save();
    ctx.globalAlpha *= 0.85;
    ctx.strokeStyle = A.c('#dffff6');
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    const wv = Math.sin(t * 7 + seed) * 1.5;
    ctx.moveTo(hdx + 15, hdy + 2);
    ctx.quadraticCurveTo(hdx + 8, hdy - 4 + wv, hdx - 2, hdy - 2 + wv);
    ctx.moveTo(hdx + 15, hdy + 3);
    ctx.quadraticCurveTo(hdx + 6, hdy + 8 + wv, hdx - 4, hdy + 5 + wv);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
    // ── 近側的鐮刀臂 ──
    arm(false);
    // 腳下的小旋風
    windRing(Hx + 4, -3, 22, 5, 1, 9, (echo ? 0.4 : 0.55) + st * 0.3, 1.6);
    // 撲斬的刀光（白色新月＋翠色殘光）
    if (st > 0) {
      ctx.save();
      ctx.globalAlpha *= 0.9;
      const sx = Cx + 36;
      const sy = Cy + 4;
      ctx.fillStyle = A.c('#b8fff0');
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
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const dash = !!fx.dash;
    const strike = ph === 'strike';
    const wind = ph === 'wind';
    const walk = walking(m);
    const hurt = m.hurtT > 0;
    const spd = dash ? 24 : 14;
    const step = walk || dash ? Math.sin(t * spd) : 0;
    const pose = { step, stretch: dash || strike ? 1 : 0, crouch: wind && !dash ? 1 : 0, bite: dash || strike };
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    const hop = dash ? 0 : walk ? -Math.abs(Math.sin(t * spd)) * 3 : 0;
    // 殘影：翠色半透明，越後面越淡
    const n = dash ? 3 : walk ? 2 : 1;
    for (let i = n; i >= 1; i--) {
      const lag = dash ? i * 18 : walk ? i * 12 : 12 + Math.sin(t * 2) * 3;
      const a = (dash ? 0.42 : walk ? 0.28 : 0.14) * (1 - (i - 1) / (n + 0.6));
      ctx.save();
      ctx.translate(-lag, hop * 0.6 - (walk || dash ? Math.sin(t * spd - i) : Math.sin(t * 2.5) * 1.5));
      const gs = walk || dash ? Math.round(Math.sin(t * spd - i * 0.9) * 3) / 3 : 0;
      ghostDraw(ctx, FERRET_BOX, a * 1.6, (g) => withTint('#6ff0d0', 0.72, () => ferretPose(g, m, Object.assign({}, pose, { step: gs, echo: true, seed: i }))),
        'fe|' + (m.id || '') + '|' + pose.stretch + pose.crouch + (pose.bite ? 1 : 0) + '|' + gs + '|' + i);
      ctx.restore();
    }
    ctx.translate(0, hop);
    if (dash) speedLines(ctx, -40, -24, 30, 4, 16, t, 'rgba(180,255,235,0.9)');
    ferretPose(ctx, m, pose);
    ctx.restore();
  }
  // ── 白澤（crystalowl）：知曉萬物的神獸。雪白的獅身踏著祥雲、青碧色的火焰鬃毛與長鬚、金色的羊角，
  //    額頭與身側都睜著金色的眼睛；頭頂浮著一顆占卜水晶，外圍繞著轉動的八卦環。施法時水晶與所有眼睛一起發光 ──
  const BZ_BODY = ['#f7f3ea', '#b9b4d8', '#ffffff'];
  const BZ_MANE = ['#5cc4b2', '#2f8a80', '#b2f4e6'];
  const BZ_HORN = ['#ecc574', '#a87636'];
  // 金色的神眼（open 0..1 睜開程度）
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
    const P = (c) => { c.moveTo(-w, 0); c.quadraticCurveTo(0, -hh * 2, w, 0); c.quadraticCurveTo(0, hh * 2, -w, 0); c.closePath(); };
    A.shape(ctx, P, '#fff8dc', null, { lw: 1.3 });
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
    // 上眼線
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w * 1.15, hh * 0.1);
    ctx.quadraticCurveTo(0, -hh * 2.1, w * 1.15, hh * 0.1);
    ctx.stroke();
    ctx.restore();
  }
  // 火焰狀的鬃毛（尖端往後掃）
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
  function crystalowl(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const kind = eyeKind(m);
    const cast = clamp(Math.max(num(fx.cast, 0), wind ? 0.6 : 0, strike ? 1 : 0), 0, 1);
    const moving = Math.abs(m.vx || 0) > 5;
    const B = BZ_BODY;
    const M = BZ_MANE;
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    const bob = Math.sin(t * 2.4) * 1.6;
    ctx.translate(0, bob);
    const paddle = moving ? Math.sin(t * 7) : Math.sin(t * 2) * 0.3;
    const hx = 22;
    const hy = -50 - cast * 2;
    const eyeOpen = 0.55 + cast * 0.45;
    const eyeGlow = 0.12 + cast * 0.5;

    // ── 占卜水晶與八卦環（後半圈） ──
    const cx0 = hx - 1;
    const cy0 = -84 + Math.sin(t * 2.2) * 2 - cast * 4;
    const ringR = 15 + cast * 3;
    const trig = (x, y, i, s) => {
      // 八卦：三條爻，陽爻實線、陰爻斷開
      ctx.lineCap = 'butt';
      for (let j = 0; j < 3; j++) {
        const yang = (i >> j) & 1;
        const yy = y + (j - 1) * s * 0.75;
        ctx.beginPath();
        if (yang) {
          ctx.moveTo(x - s, yy);
          ctx.lineTo(x + s, yy);
        } else {
          ctx.moveTo(x - s, yy);
          ctx.lineTo(x - s * 0.25, yy);
          ctx.moveTo(x + s * 0.25, yy);
          ctx.lineTo(x + s, yy);
        }
        ctx.stroke();
      }
    };
    const ring = (front) => {
      ctx.save();
      ctx.translate(cx0, cy0 + 2);
      ctx.globalAlpha *= 0.55 + cast * 0.45;
      ctx.strokeStyle = A.c('#ffd24a');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringR, ringR * 0.32, 0, front ? 0 : PI, front ? PI : TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c(front ? '#fff2b0' : '#d8a840');
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 8; i++) {
        const a = (t * (0.6 + cast * 2.5) + (i / 8) * TAU) % TAU;
        if (a < PI !== front) continue;
        trig(Math.cos(a) * ringR, Math.sin(a) * ringR * 0.32, i, 2.2 + (front ? 0.4 : 0));
      }
      ctx.restore();
    };
    glowH(ctx, cx0, cy0, 22 + cast * 26, '#9fe8ff', 0.3 + cast * 0.5);
    if (cast > 0.05) {
      ctx.save();
      ctx.globalAlpha *= cast;
      rays(ctx, cx0, cy0, 10, 10, 30 + cast * 10, 1.6, t * 0.8, 'rgba(255,240,180,0.55)');
      ctx.restore();
    }
    ring(false);
    const cryP = (c) => poly(c, [[cx0, cy0 - 12], [cx0 + 6.5, cy0 - 4.5], [cx0 + 5.5, cy0 + 6], [cx0, cy0 + 11], [cx0 - 5.5, cy0 + 6], [cx0 - 6.5, cy0 - 4.5]]);
    rimShape(ctx, cryP, mixq('#c6f2ff', '#ffffff', cast * 0.6), '#6f9fe6', '#ffffff', { cel: 2.4, rim: 1.2, lw: 2, inner: () => {
      ctx.fillStyle = A.c('#9cd4ff');
      ctx.beginPath();
      poly(ctx, [[cx0, cy0 - 12], [cx0 + 1.5, cy0 - 1], [cx0, cy0 + 11], [cx0 + 6.5, cy0 - 4.5]]);
      ctx.fill();
      glowH(ctx, cx0 - 1, cy0 - 1, 7 + cast * 3, '#ffffff', 0.7 + cast * 0.3);
    } });
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx0 - 6.5, cy0 - 4.5);
    ctx.lineTo(cx0 + 1.5, cy0 - 1);
    ctx.lineTo(cx0 + 6.5, cy0 - 4.5);
    ctx.moveTo(cx0 + 1.5, cy0 - 1);
    ctx.lineTo(cx0, cy0 + 11);
    ctx.stroke();
    ring(true);
    sparkle(ctx, cx0 + 8 + Math.sin(t * 3) * 2, cy0 - 10, 2.2 + cast * 2, '#fff6c8');

    // ── 尾巴：獅尾＋青碧火焰尾尖 ──
    const tailFn = cb(-26, -34, -38, -34, -40, -48, -34 - Math.sin(t * 2.5) * 3, -58);
    limb(ctx, (c) => { const a = tailFn(0); c.moveTo(a[0], a[1]); for (let i = 1; i <= 10; i++) { const p = tailFn(i / 10); c.lineTo(p[0], p[1]); } }, 5.5, B[0]);
    const tt = tailFn(1);
    const sw2 = Math.sin(t * 4) * 3;
    const tuft = (dx, len, w, bend) => rimShape(ctx, (c) => taper(c, qb(tt[0], tt[1] + 3, tt[0] + dx * 0.5 + bend, tt[1] - len * 0.5, tt[0] + dx + sw2, tt[1] - len), (s) => w * Math.sin(Math.min(1, 0.25 + s) * PI) * (1 - s * 0.6), 12), M[0], M[1], M[2], { cel: 1.5, rim: 1, lw: 1.9 });
    tuft(-8, 13, 11, -3);
    tuft(4, 14, 11, 2);
    tuft(-2, 19, 13, -1);

    // ── 腳（遠側） ──
    const leg = (x, ph2, col, sh, far) => {
      const sw = paddle * (ph2 ? 1 : -1) * 3;
      const px = x + sw;
      const py = -5 - Math.max(0, paddle * (ph2 ? 1 : -1)) * 2;
      const lf = cb(x, -22, x + 2, -15, px - 1 + sw * 0.3, -10, px, py - 2);
      blob(ctx, [(c) => c.ellipse(x - 0.5, -25, 7.5, 9, 0.15, 0, TAU), (c) => taper(c, lf, (s) => 10 - s * 4, 10)], col, sh, far ? null : B[2], { cel: 2, rim: 1.2, lw: 2.1 });
      A.shape(ctx, (c) => { c.moveTo(px - 5.5, py + 1); c.quadraticCurveTo(px - 5, py - 4.5, px + 1, py - 4.5); c.quadraticCurveTo(px + 7.5, py - 4, px + 7, py + 1); c.closePath(); }, col, sh, { lw: 2, shadeY: py - 1 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(px + 2, py + 1);
      ctx.lineTo(px + 2, py - 2);
      ctx.moveTo(px + 4.5, py + 1);
      ctx.lineTo(px + 4.5, py - 2);
      ctx.stroke();
      // 腳踝的青碧火焰毛
      if (!far) spiritFlame(ctx, x - 3, py - 5, 3, 9, -5, M[0], M[2], null, 0.9);
    };
    leg(-13, true, '#dcd6ea', '#a39cc6', true);
    leg(15, false, '#dcd6ea', '#a39cc6', true);

    // ── 身體 ──
    const bodyP = (c) => c.ellipse(-6, -31, 23, 13.5, -0.06, 0, TAU);
    const chestP = (c) => c.ellipse(12, -35, 11.5, 12.5, 0, 0, TAU);
    blob(ctx, [bodyP, chestP], B[0], B[1], B[2], { cel: 3.5, rim: 1.8, lw: 2.5, inner: () => {
      // 背上的青碧雲紋
      curl(ctx, -18, -37, 5, 1, '#7fcfc4', 1.4);
      curl(ctx, -4, -40, 4, -1, '#7fcfc4', 1.4);
      ctx.strokeStyle = A.c('#7fcfc4');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-26, -34);
      ctx.quadraticCurveTo(-22, -42, -14, -40);
      ctx.moveTo(-9, -41);
      ctx.quadraticCurveTo(-2, -44, 4, -40);
      ctx.stroke();
      furField(ctx, -8, -24, 16, 4, 10, PI * 0.55, 4, '#cdc8e2', 1, 3);
    } });

    // ── 近側的腳 ──
    leg(-19, false, B[0], B[1], false);
    leg(9, true, B[0], B[1], false);

    // 身側的三隻神眼
    godEye(ctx, -18, -29, 3.6, 2, -0.2, eyeOpen, eyeGlow, kind);
    godEye(ctx, -5, -30, 3.6, 2, 0.1, eyeOpen, eyeGlow, kind);
    godEye(ctx, -10, -38, 3.2, 1.8, -0.1, eyeOpen, eyeGlow, kind);
    // ── 腳下的祥雲 ──
    ctx.save();
    ctx.globalAlpha *= 0.95;
    auspiciousCloud(ctx, -16 + Math.sin(t * 1.5) * 1.5, 0, 11, t, '#ffffff', '#c6d4f0');
    auspiciousCloud(ctx, 12 - Math.sin(t * 1.5) * 1.5, 1, 10, t, '#ffffff', '#c6d4f0');
    ctx.restore();

    // ── 鬃毛（火焰狀、往後掃） ──
    rimShape(ctx, (c) => flameMane(c, hx - 4, hy + 2, 25, 16, 5, 5, PI * 0.55, PI * 1.5), M[1], '#226a64', null, { cel: 3, lw: 2.4 });
    const maneP = (c) => flameMane(c, hx - 3, hy + 1, 23, 15, 6, 4, PI * 0.5, PI * 1.62);
    if (cast > 0) glowH(ctx, hx - 4, hy, 30, M[2], cast * 0.4);
    rimShape(ctx, maneP, M[0], M[1], M[2], { cel: 3, rim: 1.6, lw: 2.4, inner: () => {
      const list = [];
      for (let i = 0; i < 10; i++) {
        const a = PI * 0.55 + i * 0.11;
        list.push([hx - 3 + Math.cos(a) * 13, hy + 1 + Math.sin(a) * 13, a + 0.2, 7]);
      }
      strands(ctx, list, M[1], 1.1);
    } });
    // 遠側的角
    const horn = (fn, w0, col, sh) => {
      const wf = (s) => w0 * (1 - s * 0.85);
      rimShape(ctx, (c) => taper(c, fn, wf, 14), col, sh, '#fff4cc', { cel: 1.6, rim: 1, lw: 2 });
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
    horn(cb(hx + 1, hy - 8, hx - 3, hy - 19, hx - 17, hy - 18, hx - 17, hy - 7), 6, '#c9a25c', '#8a6030');
    // 耳朵
    A.shape(ctx, (c) => { c.moveTo(hx - 6, hy - 6); c.quadraticCurveTo(hx - 10, hy - 14, hx - 4, hy - 15); c.quadraticCurveTo(hx - 1, hy - 11, hx - 1, hy - 7); c.closePath(); }, B[0], null, { lw: 2 });
    // ── 頭 ──
    const headP = (c) => {
      c.moveTo(hx - 8, hy + 6);
      c.quadraticCurveTo(hx - 11, hy - 9, hx + 1, hy - 10);
      c.quadraticCurveTo(hx + 9, hy - 10, hx + 11, hy - 4);
      c.quadraticCurveTo(hx + 17, hy - 4, hx + 17, hy + 2);
      c.quadraticCurveTo(hx + 17, hy + 7.5, hx + 10, hy + 8);
      c.quadraticCurveTo(hx, hy + 11, hx - 8, hy + 6);
      c.closePath();
    };
    rimShape(ctx, headP, B[0], B[1], B[2], { cel: 2.5, rim: 1.5, lw: 2.4, inner: () => {
      // 口吻的淡紫陰影、眉骨
      ctx.fillStyle = A.c('#e4def0');
      ctx.beginPath();
      ctx.ellipse(hx + 11, hy + 4, 6.5, 4, 0, 0, TAU);
      ctx.fill();
    } });
    // 鼻子、嘴
    A.shape(ctx, (c) => { c.moveTo(hx + 14, hy - 3); c.quadraticCurveTo(hx + 18.5, hy - 3.5, hx + 17.5, hy + 0.5); c.quadraticCurveTo(hx + 15, hy + 1.5, hx + 13.5, hy - 0.5); c.closePath(); }, '#8a6aa8', null, { lw: 1.2 });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + 16, hy + 1);
    ctx.quadraticCurveTo(hx + 15, hy + 4.5 + cast * 1.5, hx + 10, hy + 4.5 + cast * 1.5);
    ctx.stroke();
    // 長鬚（青碧，隨風擺）
    const bw = Math.sin(t * 2.5) * 2;
    rimShape(ctx, (c) => taper(c, cb(hx + 9, hy + 6, hx + 11, hy + 14, hx + 5 + bw, hy + 18, hx + 1 + bw * 1.5, hy + 25), (s) => 7 * (1 - s * 0.85), 12), M[0], M[1], M[2], { cel: 1.5, rim: 1, lw: 2 });
    strands(ctx, [[hx + 9, hy + 9, 1.8, 7], [hx + 7, hy + 10, 1.9, 6]], M[1], 0.9);
    // 眼睛與額頭的第三眼
    if (kind === 'normal' || kind === 'angry') {
      glowH(ctx, hx + 7, hy - 3, 7, '#ffd24a', 0.25 + cast * 0.4);
      godEye(ctx, hx + 7, hy - 3, 3.4, 2.2, 0.1, 0.9, 0, 'normal');
      if (kind === 'angry') {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx + 3, hy - 8);
        ctx.lineTo(hx + 11, hy - 5.5);
        ctx.stroke();
      }
    } else A.eye(ctx, hx + 7, hy - 3, 2.6, 2.6, kind);
    godEye(ctx, hx + 1, hy - 7.5, 1.9, 2.6, PI / 2 - 0.25, eyeOpen, eyeGlow * 1.3, kind);
    // 眉毛（青碧的火焰眉）
    A.shape(ctx, (c) => { c.moveTo(hx + 3, hy - 7); c.quadraticCurveTo(hx + 8, hy - 10, hx + 12, hy - 7); c.quadraticCurveTo(hx + 7, hy - 8, hx + 3, hy - 5.5); c.closePath(); }, M[0], null, { lw: 1.1 });
    // 近側的角
    horn(cb(hx + 3, hy - 8, hx, hy - 22, hx - 15, hy - 22, hx - 14, hy - 9), 7.5, BZ_HORN[0], BZ_HORN[1]);
    ctx.restore();
  }
  // ── 雪男（avalanchehare）：雪山深處的小雪男。一層層往下垂的蓬鬆長毛、冰藍色的臉與手腳、
  //    背上結著冰晶；額頭貼著一張鎮壓用的符紙，被風吹得一直翻動。後腳一踢，就踢出一顆越滾越大的雪球 ──
  const YETI_FUR = ['#f4f6ff', '#aab5de', '#ffffff'];
  const YETI_SKIN = ['#86bdea', '#4f84c0', '#c8ecff'];
  // 一撮往下垂的毛（上端藏在上一排底下）；line = 毛尖的描線色
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
  // 在橢圓範圍裡一排排鋪毛（由下往上畫，上排蓋住下排）
  function tuftRows(ctx, cx, cy, rx, ry, rows, w, h, t, fill, shade, line, bottomLine, seed, sway) {
    for (let r = rows - 1; r >= 0; r--) {
      const yy = cy - ry + (2 * ry * (r + 0.7)) / rows;
      const half = rx * Math.sqrt(Math.max(0, 1 - Math.pow((yy - cy) / ry, 2))) - w * 0.6;
      const n = Math.max(1, Math.round((half * 2) / (w * 1.5)));
      for (let i = 0; i <= n; i++) {
        const x = cx - half + (half * 2 * i) / n + (r % 2 ? w * 0.5 : 0) * (i < n ? 1 : 0);
        const sw = (hash(seed + r * 9 + i) - 0.5) * w * 0.8 + (sway || 0) * Math.sin(t * 3 + i + r);
        const hh = h * (0.8 + hash(seed + r * 5 + i * 3) * 0.4);
        furTuft(ctx, x, yy - hh * 0.35, w, hh, sw, r === rows - 1 ? shade : fill, shade, r === rows - 1 ? bottomLine : line, r === rows - 1 ? 1.8 : 1.1);
      }
    }
  }
  function iceSpike(ctx, x, y, h, w, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const P = (c) => poly(c, [[-w, 2], [-w * 0.35, -h * 0.7], [0, -h], [w * 0.5, -h * 0.55], [w, 2]]);
    rimShape(ctx, P, '#c4ecff', '#6fb0e6', '#ffffff', { cel: w * 0.35, rim: 1, lw: 1.8 });
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.9);
    ctx.lineTo(-w * 0.1, 0);
    ctx.stroke();
    ctx.restore();
  }
  function avalanchehare(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const kind = eyeKind(m);
    const k = clamp(num(fx.kick, 0), 0, 1);
    const strike = ph === 'strike' || k >= 0.99;
    const wind = !strike && (ph === 'wind' || k > 0);
    const F = YETI_FUR;
    const S = YETI_SKIN;
    const step = walk ? Math.sin(t * 9) : 0;
    const bounce = walk ? -Math.abs(Math.sin(t * 9)) * 2.5 : Math.sin(t * 2.2) * 0.8;
    const lean = strike ? -0.16 : wind ? 0.1 * Math.max(k, 0.5) : 0;
    const blow = Math.sin(t * 6);
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    // ── 腳 ──
    const foot = (x, y, rot, col, sh) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      rimShape(ctx, (c) => { c.moveTo(-7, 0); c.quadraticCurveTo(-8, -7, -1, -7.5); c.quadraticCurveTo(8, -7, 10, -1.5); c.quadraticCurveTo(10, 1, 7, 1); c.lineTo(-6, 1); c.closePath(); }, col, sh, S[2], { cel: 1.6, rim: 1, lw: 2.2 });
      ctx.strokeStyle = A.c(sh);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(3, 1);
      ctx.lineTo(3.5, -2.5);
      ctx.moveTo(6.5, 0.5);
      ctx.lineTo(7, -2.5);
      ctx.stroke();
      ctx.fillStyle = A.c('#2c3350');
      [[5.5, -0.5], [8.8, -0.8], [10, -3.2]].forEach((q) => {
        ctx.beginPath();
        ctx.moveTo(q[0], q[1] - 1.4);
        ctx.lineTo(q[0] + 3, q[1] + 0.6);
        ctx.lineTo(q[0], q[1] + 1.2);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    };
    const legFur = (x, y, col, sh) => {
      A.shape(ctx, (c) => c.ellipse(x, y, 7, 7.5, 0, 0, TAU), col, sh, { lw: 2.2, shadeY: y + 2 });
      furTuft(ctx, x - 4, y + 2, 3.4, 8, -1, col, sh, 'out', 1.6);
      furTuft(ctx, x + 1, y + 3, 3.6, 8, 1, col, sh, 'out', 1.6);
      furTuft(ctx, x + 5, y + 2, 3, 6.5, 1.5, col, sh, 'out', 1.6);
    };
    foot(-9 - step * 3, 0 - Math.max(0, -step) * 2, 0, S[1], '#3a6aa4');
    legFur(-7 - step * 2, -11, '#c8d0ec', F[1]);
    // 手臂：粗壯、手肘垂著長毛、冰藍大手＋黑爪
    const arm = (sx, sy, hx2, hy2, col, sh, rim) => {
      const fn = qb(sx, sy, (sx + hx2) / 2 + 4, (sy + hy2) / 2, hx2, hy2);
      rimShape(ctx, (c) => taper(c, fn, (s) => 12 - s * 4, 12), col, sh, rim, { cel: 2.4, rim: 1.2, lw: 2.3 });
      for (let i = 0; i < 3; i++) {
        const q = along(fn, 0.3 + i * 0.2, 3);
        furTuft(ctx, q[0] - 1, q[1], 3.2, 8 - i, -1.5, col, sh, 'out', 1.6);
      }
      ctx.save();
      ctx.translate(hx2, hy2);
      A.shape(ctx, (c) => c.ellipse(0, 1.5, 5.5, 5, 0, 0, TAU), S[0], S[1], { lw: 2, cel: [1.2, 1.2] });
      ctx.fillStyle = A.c('#2c3350');
      for (let i = 0; i < 3; i++) {
        const x = -3 + i * 3;
        ctx.beginPath();
        ctx.moveTo(x - 1.2, 5.5);
        ctx.lineTo(x + 0.3, 9.5);
        ctx.lineTo(x + 1.3, 5.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };
    const armSw = walk ? Math.sin(t * 9) * 3 : Math.sin(t * 2.2) * 1;
    ctx.translate(0, bounce);
    ctx.save();
    ctx.translate(0, -8);
    ctx.rotate(lean);
    ctx.translate(0, 8);
    arm(-14, -34, -22 + armSw + (strike ? -6 : 0), -12 - (strike ? 10 : 0), '#c8d0ec', F[1], null);
    // 背上的冰晶
    iceSpike(ctx, -17, -45, 13, 4, -0.75);
    iceSpike(ctx, -8, -52, 15, 4.5, -0.3);
    iceSpike(ctx, -23, -35, 9, 3.2, -1.15);
    // ── 身體：一層層垂下來的長毛 ──
    const bodyP = (c) => c.ellipse(-2, -29, 20, 22, 0, 0, TAU);
    rimShape(ctx, bodyP, F[0], F[1], F[2], { cel: 4, rim: 2, lw: 2.6 });
    ctx.save();
    ctx.beginPath();
    ctx.rect(-40, -44, 80, 35);
    ctx.clip();
    tuftRows(ctx, -2, -29, 20, 22, 4, 5.5, 13, t, F[0], '#e2e7f8', '#c6cdea', '#c6cdea', 3, 0.8);
    ctx.restore();
    // 肚子上的冰藍皮毛
    A.shape(ctx, (c) => c.ellipse(6, -24, 8.5, 9, 0, 0, TAU), '#dde5fa', '#b9c4e6', { noStroke: true, shadeY: -20 });
    strands(ctx, [[3, -30, PI / 2, 6], [7, -31, PI / 2, 7], [10, -28, PI / 2, 5]], '#aab5de', 1);
    // 身體下緣垂出來的毛
    [[-19, 7, -1.5], [-12.5, 10, -1], [-6, 8, 0], [0, 11, 0.5], [6.5, 8.5, 1], [13, 9.5, 1.5]].forEach((q, i) => furTuft(ctx, q[0], -14, 4.2 + (i % 2) * 0.6, q[1], q[2] + Math.sin(t * 3 + i) * 0.6, F[0], '#d9dff4', 'out', 1.8));
    // ── 頭 ──
    const hx = 9;
    const hy = -46;
    rimShape(ctx, (c) => c.ellipse(hx, hy, 13.5, 12.5, 0, 0, TAU), F[0], F[1], F[2], { cel: 3, rim: 1.6, lw: 2.5 });
    // 頭頂往後翹的毛
    [[-8, -9, -0.9], [-3, -12, -0.5], [2, -12.5, -0.2]].forEach((q, i) => {
      ctx.save();
      ctx.translate(hx + q[0], hy + q[1]);
      ctx.rotate(q[2] + PI);
      furTuft(ctx, 0, -2, 3.6, 9 + i, 1.5 + Math.sin(t * 3 + i) * 0.8, F[0], F[2], 'out', 1.8);
      ctx.restore();
    });
    // 臉頰兩側垂下的鬢毛
    furTuft(ctx, hx - 5, hy + 6, 4, 10, -1.5, F[0], F[1], 'out', 1.8);
    furTuft(ctx, hx + 1, hy + 7, 4, 9, 0, F[0], F[1], 'out', 1.8);
    // 冰藍色的臉
    const faceP = (c) => {
      c.moveTo(hx + 1, hy - 3);
      c.quadraticCurveTo(hx + 11, hy - 7, hx + 19, hy - 2);
      c.quadraticCurveTo(hx + 21.5, hy + 5, hx + 16, hy + 9.5);
      c.quadraticCurveTo(hx + 7, hy + 12, hx + 2, hy + 6);
      c.quadraticCurveTo(hx - 1, hy + 1, hx + 1, hy - 3);
      c.closePath();
    };
    rimShape(ctx, faceP, S[0], S[1], S[2], { cel: 2, rim: 1, lw: 2.1, inner: () => {
      ctx.fillStyle = A.c('#a8d6f6');
      ctx.beginPath();
      ctx.ellipse(hx + 14, hy + 5, 5.5, 3.6, 0, 0, TAU);
      ctx.fill();
    } });
    // 眼睛（冰色的光）
    const ex = hx + 8.5;
    const ey = hy + 1.5;
    if (kind === 'normal' || kind === 'angry') {
      glowH(ctx, ex + 4, ey, 10, '#bff4ff', 0.4);
      [[ex, ey, 2.7], [ex + 8, ey - 0.4, 2.5]].forEach((q) => {
        A.shape(ctx, (c) => c.ellipse(q[0], q[1], q[2], q[2] * 1.12, 0, 0, TAU), '#e8fdff', null, { lw: 1.3 });
        ctx.fillStyle = A.c('#16324e');
        ctx.beginPath();
        ctx.arc(q[0] + 0.5, q[1] + 0.3, q[2] * 0.58, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(q[0] - 0.4, q[1] - 0.7, q[2] * 0.28, 0, TAU);
        ctx.fill();
      });
    } else {
      A.eye(ctx, ex, ey, 2.5, 2.5, kind);
      A.eye(ctx, ex + 8, ey - 0.4, 2.3, 2.3, kind);
    }
    // 鼻子、嘴、下排小獠牙
    A.ellipse(ctx, hx + 17, hy + 5, 2.2, 1.5, '#2c3350', null, { lw: 1, hl: false });
    const mo = strike ? 1 : 0;
    A.shape(ctx, (c) => { c.moveTo(hx + 8, hy + 7.5); c.quadraticCurveTo(hx + 12, hy + 9.5 + mo * 3, hx + 16, hy + 8); c.quadraticCurveTo(hx + 12, hy + 8.5 + mo, hx + 8, hy + 7.5); c.closePath(); }, '#3a2440', null, { lw: 1.3 });
    fang(ctx, hx + 9.8, hy + 8.4, 2.2, true);
    fang(ctx, hx + 14.4, hy + 8.4, 2.2, true);
    // 濃眉（白毛蓋在眼睛上）
    A.shape(ctx, (c) => { c.moveTo(hx + 3, hy - 1); c.quadraticCurveTo(hx + 10, hy - 6, hx + 19.5, hy - 3); c.lineTo(hx + 18, hy - 0.5); c.lineTo(hx + 15, hy - 1.8); c.lineTo(hx + 12.5, hy - 0.3); c.lineTo(hx + 10, hy - 1.8); c.lineTo(hx + 7, hy + 0.2); c.closePath(); }, F[0], F[1], { lw: 1.6, shadeY: hy - 1.5 });
    if (kind === 'angry' || strike) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ex - 3, ey - 3.5);
      ctx.lineTo(ex + 2, ey - 2);
      ctx.moveTo(ex + 11, ey - 4);
      ctx.lineTo(ex + 6, ey - 2.4);
      ctx.stroke();
    }
    // 額頭的鎮符：上端貼住、下端被風吹得翻起
    ctx.save();
    ctx.translate(hx + 5, hy - 12);
    ctx.rotate(-0.35 + blow * 0.08 - (strike ? 0.35 : 0));
    const fl = blow * 1.5 + (strike ? -4 : 0);
    const talP = (c) => { c.moveTo(-3.6, 0); c.lineTo(3.6, 0); c.quadraticCurveTo(4 + fl * 0.3, 6, 3.8 + fl, 12); c.lineTo(-3.4 + fl, 12.5); c.quadraticCurveTo(-3.4 + fl * 0.3, 6, -3.6, 0); c.closePath(); };
    A.shape(ctx, talP, '#ffe89a', '#e0bb5a', { lw: 1.5, shadeY: 9 });
    ctx.strokeStyle = A.c('#c8243a');
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2.4, 1.4);
    ctx.lineTo(2.4, 1.4);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.2, 2.8);
    ctx.lineTo(0.2 + fl * 0.5, 10.5);
    ctx.moveTo(-1.8, 4.5);
    ctx.lineTo(2.2, 4.5);
    ctx.moveTo(-1.6 + fl * 0.3, 7.5);
    ctx.lineTo(2.4 + fl * 0.3, 7);
    ctx.stroke();
    ctx.restore();
    // 近側的手臂
    arm(8, -32, 17 - armSw + (strike ? 6 : wind ? -3 : 0), -11 - (strike ? 12 : wind ? 4 : 0), F[0], F[1], F[2]);
    ctx.restore();
    // ── 近側的腳：蓄力往後收、踢出時往前掃 ──
    let fx2 = 7 + step * 3;
    let fy2 = -Math.max(0, step) * 2;
    let fr = 0;
    if (strike) {
      fx2 = 22;
      fy2 = -14;
      fr = -0.7;
    } else if (wind) {
      fx2 = -6;
      fy2 = -6;
      fr = 0.4;
    }
    legFur(fx2 * 0.4 + 3, -11 + fy2 * 0.4, F[0], F[1]);
    foot(fx2, fy2, fr, S[0], S[1]);
    // 踢起來的雪
    if (strike) {
      for (let i = 0; i < 5; i++) {
        const q = (t * 3 + i / 5) % 1;
        puff(ctx, fx2 + 8 + q * 18, fy2 - 2 - Math.sin(q * PI) * 10 + i, 2.5 + q * 3, '#ffffff', (1 - q) * 0.9);
      }
      ctx.save();
      ctx.globalAlpha *= 0.8;
      ctx.strokeStyle = A.c('#dff4ff');
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
  // ── 雷獸（drumyak）：雷神的坐騎。靛紫色的猛獸，身上是金黃的閃電紋、鬃毛是劈啪作響的電光，
  //    尾巴是一道閃電；背上架著一圈朱漆的雷神太鼓（每面鼓都是三巴紋）。擂鼓時鼓面放電、閃電在鼓間亂竄 ──
  const RJ_BODY = ['#3f3c8c', '#24225c', '#9491f2'];
  const RJ_BELLY = ['#7470c8', '#4e4a9c'];
  const RJ_GOLD = '#ffd83a';
  function drumyak(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const kind = eyeKind(m);
    const beat = clamp(num(fx.beat, 0), 0, 1);
    const dead = !!m.dead;
    const B = RJ_BODY;
    const step = walk ? Math.sin(t * 7) : 0;
    const dip = beat * 3;
    const flick = Math.floor(t * 12);
    const charge = dead ? 0 : 0.35 + 0.25 * Math.sin(t * 5) + beat * 0.8;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    if (!dead) glowH(ctx, -4, -52, 70, '#8fd8ff', 0.12 + beat * 0.3);

    // ── 閃電尾巴 ──
    const tail = [[-30, -40], [-42, -44], [-37, -51], [-50, -57], [-45, -63], [-60, -72]];
    const tw = Math.sin(t * 3) * 2;
    ctx.save();
    ctx.translate(0, dip * 0.5);
    const tailFn = (q) => {
      const f = q * (tail.length - 1);
      const i = Math.min(tail.length - 2, Math.floor(f));
      const u = f - i;
      return [tail[i][0] + (tail[i + 1][0] - tail[i][0]) * u + tw * q, tail[i][1] + (tail[i + 1][1] - tail[i][1]) * u];
    };
    const tailP = (c) => taper(c, tailFn, (q) => 9 - q * 7, 25);
    if (!dead) glowH(ctx, -48, -64, 18, RJ_GOLD, 0.35 + beat * 0.4);
    rimShape(ctx, tailP, RJ_GOLD, '#e09a1a', '#fff6c0', { cel: 1.5, rim: 1, lw: 2 });
    ctx.restore();

    // ── 腳 ──
    const leg = (x, ph2, col, sh, front, near) => {
      const s = ph2 * step;
      const lift = Math.max(0, s) * 4;
      const stomp = front && near ? beat : 0;
      const px = x + s * 5 + stomp * 4;
      const py = -lift - (front && near && beat > 0.2 ? (1 - beat) * 6 : 0);
      const fn = cb(x, -28 + dip, x + (front ? 3 : -4), -20, px + (front ? -2 : 2), -12, px, py - 4);
      blob(ctx, [(c) => c.ellipse(x, -30 + dip, 8, 9.5, front ? 0.1 : -0.2, 0, TAU), (c) => taper(c, fn, (q) => 11 - q * 3.5, 10)], col, sh, near ? B[2] : null, { cel: 2.5, rim: 1.3, lw: 2.3 });
      // 大腳掌＋金爪
      A.shape(ctx, (c) => { c.moveTo(px - 7, py); c.quadraticCurveTo(px - 7, py - 7, px, py - 7); c.quadraticCurveTo(px + 8, py - 7, px + 8, py); c.closePath(); }, col, sh, { lw: 2.2, shadeY: py - 2 });
      ctx.fillStyle = A.c('#fff0a0');
      for (let i = 0; i < 3; i++) {
        const cx2 = px + 1 + i * 3;
        ctx.beginPath();
        ctx.moveTo(cx2 - 1.3, py - 1);
        ctx.lineTo(cx2 + 2.6, py + 0.4);
        ctx.lineTo(cx2 - 0.4, py + 0.8);
        ctx.closePath();
        ctx.fill();
      }
      // 腳踝的電光毛
      if (near && !dead) glowStroke(ctx, (c) => { c.moveTo(px - 6, py - 9); c.lineTo(px - 10, py - 12); c.lineTo(px - 7, py - 13); c.lineTo(px - 12, py - 17); }, '#dffaff', 1.3, '120,220,255', charge);
      if (stomp > 0.6) {
        ctx.save();
        ctx.globalAlpha *= (stomp - 0.6) * 2.5;
        rays(ctx, px + 2, 0, 7, 4, 18, 1.5, PI, 'rgba(255,240,150,0.9)');
        ctx.restore();
      }
    };
    leg(-24, -1, '#2e2c70', '#1c1a48', false, false);
    leg(20, 1, '#2e2c70', '#1c1a48', true, false);

    // ── 身體 ──
    ctx.save();
    ctx.translate(0, dip);
    const bodyP = (c) => c.ellipse(-4, -38, 30, 17, -0.04, 0, TAU);
    const chestP = (c) => c.ellipse(20, -42, 15, 16, 0.2, 0, TAU);
    blob(ctx, [bodyP, chestP], B[0], B[1], B[2], { cel: 4, rim: 2, lw: 2.7, inner: () => {
      ctx.fillStyle = A.c(RJ_BELLY[0]);
      ctx.beginPath();
      ctx.ellipse(2, -24, 26, 7, 0, 0, TAU);
      ctx.fill();
      furField(ctx, -8, -44, 22, 7, 16, PI * 0.9, 6, B[1], 1.1, 5);
      // 金黃的閃電紋
      [[-28, -46], [-14, -50], [0, -50]].forEach((p, i) => {
        ctx.fillStyle = A.c(RJ_GOLD);
        ctx.beginPath();
        poly(ctx, [[p[0], p[1]], [p[0] + 5, p[1]], [p[0] + 2, p[1] + 7], [p[0] + 6, p[1] + 7], [p[0] - 2, p[1] + 19 - i * 2], [p[0] + 0.5, p[1] + 10], [p[0] - 3.5, p[1] + 10]]);
        ctx.fill();
      });
    } });
    // ── 雷神太鼓的環（朱漆框） ──
    const rcx = -8;
    const rcy = -48;
    const R = 34;
    const a0 = PI * 1.08;
    const a1 = PI * 1.92;
    ropeStroke(ctx, (c) => c.arc(rcx, rcy, R, a0 - 0.08, a1 + 0.08), 4.5, '#c8322c', '#8a1c1c');
    // 框的兩腳插進背上的鞍
    A.shape(ctx, (c) => A.roundRect(c, -24, -56, 30, 8, 3), '#c8322c', '#8a1c1c', { lw: 2, shadeY: -52 });
    ctx.fillStyle = A.c('#ffd24a');
    [-20, -9, 2].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, -52, 1.3, 0, TAU);
      ctx.fill();
    });
    // 鼓與鼓之間的電弧
    const drums = [];
    for (let i = 0; i < 5; i++) {
      const a = a0 + ((a1 - a0) * i) / 4;
      drums.push([rcx + Math.cos(a) * R, rcy + Math.sin(a) * R, a]);
    }
    if (!dead && beat > 0.05) {
      for (let i = 0; i < 4; i++) bolt(ctx, drums[i][0], drums[i][1], drums[i + 1][0], drums[i + 1][1], flick * 3 + i, 5, '#bff0ff', 1.6, beat);
    }
    drums.forEach((d, i) => {
      const lit = !dead && (beat > 0.05 ? beat : 0.15 + 0.15 * Math.sin(t * 4 + i));
      ctx.save();
      ctx.translate(d[0], d[1]);
      ctx.rotate(d[2] + PI / 2);
      glowH(ctx, 0, 0, 13, '#ffe07a', lit * 0.6);
      // 鼓身（側面看是一個鼓胴，鼓面朝外）
      A.shape(ctx, (c) => { c.moveTo(-8, -3); c.quadraticCurveTo(-9, 2.5, -8, 5); c.lineTo(8, 5); c.quadraticCurveTo(9, 2.5, 8, -3); c.closePath(); }, '#c8342c', '#86201c', { lw: 2, shadeY: 2 });
      ctx.fillStyle = A.c('#ffd24a');
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.arc(-6 + j * 3, 3.6, 0.8, 0, TAU);
        ctx.fill();
      }
      A.shape(ctx, (c) => c.ellipse(0, -3, 8.5, 4, 0, 0, TAU), mixq('#f4e6c4', '#fffbe6', lit), '#d8c49a', { lw: 1.8, shadeY: -1.5 });
      tomoe(ctx, 0, -3, 3.4, t * (beat > 0.05 ? 6 : 0.5) + i, beat > 0.3 ? '#c8342c' : '#2a1a24');
      ctx.restore();
    });
    // 身上的電光（隨時劈啪）
    if (!dead && (Math.sin(t * 9) > 0.6 || beat > 0.3)) bolt(ctx, -30, -34, -12, -26, flick, 3, '#bff0ff', 1.1, 0.8);

    // ── 頭 ──
    const hx = 36;
    const hy = -52 + (beat > 0.2 ? 2 : 0);
    // 電光鬃毛（往後豎起的尖刺毛）
    const maneP = (c) => flameMane(c, hx - 8, hy + 2, 21, 12, 7, 6, PI * 0.45, PI * 1.6);
    if (!dead) glowH(ctx, hx - 8, hy, 28, '#8fe0ff', 0.25 + charge * 0.3);
    rimShape(ctx, maneP, '#6fd4ff', '#2c8ed0', '#e6fbff', { cel: 2.5, rim: 1.5, lw: 2.4, inner: () => {
      const list = [];
      for (let i = 0; i < 9; i++) {
        const a = PI * 0.55 + i * 0.13;
        list.push([hx - 8 + Math.cos(a) * 12, hy + 2 + Math.sin(a) * 12, a, 6]);
      }
      strands(ctx, list, '#2c8ed0', 1);
    } });
    // 閃電角
    const hornZ = (x, y, s, col) => A.shape(ctx, (c) => poly(c, [[x, y], [x + 3 * s, y], [x + 1 * s, y - 5], [x + 4 * s, y - 5], [x - 1 * s, y - 14], [x + 0.5 * s, y - 8], [x - 2.5 * s, y - 8]]), col, '#d08a10', { lw: 1.6, shadeY: y - 4 });
    hornZ(hx - 5, hy - 9, 1, '#e8b830');
    const headP = (c) => {
      c.moveTo(hx - 9, hy + 7);
      c.quadraticCurveTo(hx - 12, hy - 9, hx + 1, hy - 11);
      c.quadraticCurveTo(hx + 10, hy - 11, hx + 13, hy - 4);
      c.quadraticCurveTo(hx + 21, hy - 2, hx + 21, hy + 4);
      c.quadraticCurveTo(hx + 20, hy + 9, hx + 12, hy + 9);
      c.quadraticCurveTo(hx + 1, hy + 13, hx - 9, hy + 7);
      c.closePath();
    };
    const roar = beat > 0.2;
    if (roar) {
      A.shape(ctx, (c) => { c.moveTo(hx + 2, hy + 7); c.lineTo(hx + 19, hy + 9); c.quadraticCurveTo(hx + 16, hy + 16, hx + 3, hy + 13); c.closePath(); }, B[1], null, { lw: 2.2 });
      A.shape(ctx, (c) => { c.moveTo(hx + 3, hy + 8); c.lineTo(hx + 17, hy + 9.5); c.lineTo(hx + 5, hy + 11.5); c.closePath(); }, '#5a1030', null, { noStroke: true });
      fang(ctx, hx + 15, hy + 9.2, 3, true);
    }
    rimShape(ctx, headP, B[0], B[1], B[2], { cel: 2.6, rim: 1.6, lw: 2.5, inner: () => {
      ctx.fillStyle = A.c(RJ_BELLY[0]);
      ctx.beginPath();
      ctx.ellipse(hx + 14, hy + 5, 8, 4.5, 0, 0, TAU);
      ctx.fill();
      // 臉上的閃電紋
      ctx.fillStyle = A.c(RJ_GOLD);
      ctx.beginPath();
      poly(ctx, [[hx - 6, hy - 6], [hx + 2, hy - 3], [hx - 1, hy - 1.5], [hx + 6, hy + 1], [hx - 3, hy + 0.5], [hx - 0.5, hy - 1.5]]);
      ctx.fill();
    } });
    hornZ(hx + 1, hy - 10, 1.1, RJ_GOLD);
    A.ellipse(ctx, hx + 20, hy + 1, 2.4, 1.8, '#1a1030', null, { lw: 1, hl: false });
    if (!roar) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 19, hy + 6.5);
      ctx.quadraticCurveTo(hx + 13, hy + 8.5, hx + 7, hy + 6.5);
      ctx.stroke();
      fang(ctx, hx + 15.5, hy + 7.4, 2.6, false);
    }
    // 金色的雷光眼
    const ex = hx + 7;
    const ey = hy - 3;
    if (kind === 'normal' || kind === 'angry') {
      if (!dead) glowH(ctx, ex, ey, 10, RJ_GOLD, 0.45 + beat * 0.4);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(1.35, 1.35);
      ctx.translate(-ex, -ey);
      const eyeP = (c) => { c.moveTo(ex - 4, ey + 1); c.quadraticCurveTo(ex, ey - 3.8, ex + 4.5, ey - 0.5); c.quadraticCurveTo(ex + 0.5, ey + 3, ex - 4, ey + 1); c.closePath(); };
      A.shape(ctx, eyeP, '#fff4a0', null, { lw: 1.4 });
      ctx.fillStyle = A.c('#2a1606');
      ctx.beginPath();
      ctx.ellipse(ex + 0.8, ey - 0.2, 1, 2.1, 0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - 5, ey - 1.5);
      ctx.lineTo(ex + 5, ey - 3.5 + (kind === 'angry' || roar ? 1.5 : 0));
      ctx.stroke();
      ctx.restore();
    } else A.eye(ctx, ex, ey, 2.8, 2.8, kind);
    // 耳朵
    A.shape(ctx, (c) => { c.moveTo(hx - 4, hy - 8); c.lineTo(hx - 12, hy - 16); c.lineTo(hx - 1, hy - 11); c.closePath(); }, B[0], B[1], { lw: 1.8, shadeY: hy - 11 });
    ctx.restore();

    // ── 近側的腳 ──
    leg(-18, 1, B[0], B[1], false, true);
    leg(26, -1, B[0], B[1], true, true);
    // 擂鼓時：從地面竄起的電火花
    if (!dead && beat > 0.3) {
      for (let i = 0; i < 3; i++) bolt(ctx, -30 + i * 30, 0, -26 + i * 30 + (hash(flick + i) - 0.5) * 10, -18 - hash(flick * 2 + i) * 14, flick + i * 5, 4, '#fff2a0', 1.3, beat);
    }
    ctx.restore();
  }
  // ── 影之芬里爾（shadowwolf）：北歐神話巨狼的幼體。石板灰黑的毛、月光般的冷色邊緣光，
  //    頸背與尾巴燒著黑紫色的影焰；脖子上還套著被扯斷的魔鏈（格萊普尼爾），鐵環上的符文發著紫光。
  //    影子會離開身體去咬人——那時本體變得半透明、腳下沒有影子 ──
  const FEN_FUR = ['#383d58', '#1f2238', '#8f96cc'];
  const FEN_BELLY = '#565c80';
  const FEN_RGB = '#a77cff';
  const WOLF_BOX = [-78, -96, 170, 104];
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
    ctx.fillStyle = A.c('#130c26');
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.strokeStyle = A.c('#a77cff');
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 影子頸上的斷鏈
    ctx.strokeStyle = A.c('#6a5aa8');
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-24 + i * 6, -2 + (i % 2), 2.8, 1.6, 0, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const q = (t * 1.3 + i / 5) % 1;
      const x = -30 + i * 14 + Math.sin(t * 2 + i) * 3;
      spiritFlame(ctx, x, -4 - q * 8, 2.6 * (1 - q * 0.4), 10 * (1 - q * 0.4), Math.sin(t * 6 + i) * 1.5, '#7a44e8', '#e2c8ff', null, (1 - q) * 0.9);
    }
    if (eyes) {
      glowH(ctx, -48, -5, 12, '#d8b8ff', 0.8);
      ctx.fillStyle = '#f4e8ff';
      ctx.beginPath();
      ctx.ellipse(-51, -4.5, 2.8, 1.4, -0.25, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-44.5, -5.3, 2.8, 1.4, 0.25, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // 影焰（黑紫色的火，不描邊、內芯是紫光）
  function shadowFlame(ctx, x, y, w, h, sway, a) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    glowH(ctx, x, y - h * 0.4, h * 0.8, '#8a5aff', 0.25);
    ctx.fillStyle = A.c('#241640');
    ctx.beginPath();
    flamePath(ctx, x, y, w, h, sway);
    flamePath(ctx, x - w * 0.5, y + 1, w * 0.7, h * 0.7, sway * 1.4 - 2);
    ctx.fill();
    ctx.strokeStyle = A.c('#6a3ed0');
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = A.c('#9a6aff');
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
    ctx.strokeStyle = A.c('#8a8ea8');
    ctx.lineWidth = 1.8 * s;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.2 * s, 2.4 * s, 0, PI * 1.1, PI * 1.6);
    ctx.strokeStyle = A.c('#dfe2f2');
    ctx.lineWidth = 0.9 * s;
    ctx.stroke();
    ctx.restore();
  }
  function wolfPose(ctx, m, o) {
    const t = m.t || 0;
    const kind = eyeKind(m);
    const dead = !!m.dead;
    const F = FEN_FUR;
    const walk = o.walk;
    const cr = o.crouch || 0;
    const lunge = o.lunge || 0;
    const step = walk ? Math.sin(t * 9) : 0;
    const fl = dead ? 0 : 1;
    const by = -33 + cr * 4;
    // ── 尾巴：粗大的狼尾，尾尖燒成影焰 ──
    const tw = Math.sin(t * 3) * 3 + step * 2;
    const tailFn = cb(-30, by - 2, -44, by - 2, -52 + tw * 0.4, by - 12, -58 + tw, by - 20 - cr * 3);
    const tp = tailFn(1);
    shadowFlame(ctx, tp[0] + 1, tp[1] + 4, 5, 18, -4 + Math.sin(t * 8) * 2, fl);
    rimShape(ctx, (c) => taper(c, tailFn, (s) => 9 + Math.sin(s * PI) * 6 - s * 5, 16), F[0], F[1], F[2], { cel: 3, rim: 1.5, lw: 2.4, inner: () => {
      const list = [];
      for (let i = 0; i < 7; i++) {
        const q = along(tailFn, 0.15 + i * 0.12, (hash(i * 2) - 0.5) * 6);
        list.push([q[0], q[1], q[2] + PI + 0.2, 6]);
      }
      strands(ctx, list, F[1], 1.1);
      ctx.fillStyle = A.c('#2a1e4a');
      ctx.beginPath();
      taper(ctx, (s) => tailFn(0.78 + s * 0.22), 30, 6);
      ctx.fill();
    } });
    // ── 腳 ──
    const leg = (x, ph2, col, sh, front, near) => {
      const s = ph2 * step;
      const lift = Math.max(0, s) * 4;
      const px = x + s * 6 + (front ? lunge * 8 : -lunge * 3);
      const py = -lift;
      const top = by + 4;
      const fn = front ? cb(x, top, x + 2, -18, px - 1, -12, px, py - 4) : cb(x, top, x - 7, -18, px + 3, -12, px, py - 4);
      blob(ctx, [(c) => c.ellipse(x - (front ? 0 : 2), top, front ? 8 : 10, 11, 0, 0, TAU), (c) => taper(c, fn, (q) => 10 - q * 4.5, 12)], col, sh, near ? F[2] : null, { cel: 2.4, rim: 1.2, lw: 2.3 });
      A.shape(ctx, (c) => { c.moveTo(px - 5, py); c.quadraticCurveTo(px - 5.5, py - 6, px + 1, py - 6); c.quadraticCurveTo(px + 7.5, py - 5.5, px + 7, py); c.closePath(); }, col, sh, { lw: 2, shadeY: py - 2 });
      ctx.fillStyle = A.c('#e6e0f6');
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 1.5 + i * 2.2, py - 1.4);
        ctx.lineTo(px + 4 + i * 2.2, py + 0.2);
        ctx.lineTo(px + 1.5 + i * 2.2, py + 0.6);
        ctx.closePath();
        ctx.fill();
      }
    };
    leg(-20, -1, '#2a2e46', '#171a2c', false, false);
    leg(20, 1, '#2a2e46', '#171a2c', true, false);
    // ── 背上的影焰鬃（在身體後面） ──
    for (let i = 0; i < 7; i++) {
      const k = i / 6;
      const x = 26 - k * 38;
      const y = by - 12 + k * 3 - Math.sin(k * PI) * 2;
      const h = (22 - k * 10) * (1 + 0.15 * Math.sin(t * 7 + i * 1.3));
      shadowFlame(ctx, x, y, 5 - k * 1.5, h, -6 - Math.sin(t * 5 + i) * 2.5, fl);
    }
    if (!dead) glowH(ctx, 12, by - 20, 36, FEN_RGB, 0.22);
    // ── 身體 ──
    const bodyP = (c) => c.ellipse(-6, by, 27, 13.5, -0.05, 0, TAU);
    const chestP = (c) => c.ellipse(17, by - 3 + lunge * 2, 13, 15, 0.25, 0, TAU);
    blob(ctx, [bodyP, chestP], F[0], F[1], F[2], { cel: 4, rim: 2, lw: 2.7, inner: () => {
      ctx.fillStyle = A.c(FEN_BELLY);
      ctx.beginPath();
      ctx.ellipse(0, by + 11, 24, 6, 0, 0, TAU);
      ctx.fill();
      furField(ctx, -10, by - 4, 20, 7, 18, PI * 0.95, 6, F[1], 1.1, 9);
      // 肩上的符文刻痕（發紫光）
      if (!dead) {
        glowStroke(ctx, (c) => {
          c.moveTo(6, by - 6);
          c.lineTo(6, by + 4);
          c.moveTo(6, by - 3);
          c.lineTo(10, by - 7);
          c.moveTo(-18, by - 5);
          c.lineTo(-14, by + 2);
          c.lineTo(-10, by - 5);
        }, '#c8a8ff', 1.2, '167,124,255', 0.5 + 0.3 * Math.sin(t * 4));
      }
    } });
    // ── 近側的腳 ──
    leg(-15, 1, F[0], F[1], false, true);
    leg(26, -1, F[0], F[1], true, true);
    // 胸前的蓬毛
    A.shape(ctx, (c) => { c.moveTo(14, by - 12); c.quadraticCurveTo(30, by - 12, 29, by + 2); c.lineTo(25, by); c.lineTo(24, by + 7); c.lineTo(20, by + 3); c.lineTo(17, by + 9); c.lineTo(14, by + 3); c.quadraticCurveTo(10, by - 4, 14, by - 12); c.closePath(); }, '#4a5072', F[1], { lw: 1.8, shadeY: by + 1 });
    // ── 頭 ──
    const hx = 36 + lunge * 6;
    const hy = by - 12 + cr * 5 + lunge * 3;
    ctx.save();
    ctx.translate(hx - 10, hy + 6);
    ctx.scale(1.2, 1.2);
    ctx.translate(-(hx - 10), -(hy + 6));
    const open = lunge > 0 || o.bite ? 1 : 0;
    // 耳朵（遠）
    A.shape(ctx, (c) => { c.moveTo(hx - 9, hy - 5); c.lineTo(hx - 14, hy - 19); c.lineTo(hx - 3, hy - 9); c.closePath(); }, F[1], null, { lw: 2 });
    if (open) {
      A.shape(ctx, (c) => { c.moveTo(hx + 1, hy + 5); c.lineTo(hx + 22, hy + 9); c.quadraticCurveTo(hx + 18, hy + 16, hx + 2, hy + 12); c.closePath(); }, F[1], null, { lw: 2.2 });
      A.shape(ctx, (c) => { c.moveTo(hx + 2, hy + 6); c.lineTo(hx + 20, hy + 9.5); c.lineTo(hx + 4, hy + 10.5); c.closePath(); }, '#4a1238', null, { noStroke: true });
      fang(ctx, hx + 17, hy + 9.2, 3, true);
      fang(ctx, hx + 11, hy + 8.4, 2.4, true);
    }
    const headP = (c) => {
      c.moveTo(hx - 11, hy + 6);
      c.quadraticCurveTo(hx - 13, hy - 8, hx - 1, hy - 9);
      c.quadraticCurveTo(hx + 8, hy - 9, hx + 12, hy - 4);
      c.lineTo(hx + 23, hy + 1);
      c.quadraticCurveTo(hx + 25, hy + 5, hx + 21, hy + 6.5);
      c.quadraticCurveTo(hx + 6, hy + 11, hx - 11, hy + 6);
      c.closePath();
    };
    rimShape(ctx, headP, '#454b6c', F[1], F[2], { cel: 2, rim: 1.6, lw: 2.5, inner: () => {
      ctx.fillStyle = A.c(FEN_BELLY);
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy + 9);
      ctx.quadraticCurveTo(hx + 6, hy + 2, hx + 25, hy + 3);
      ctx.lineTo(hx + 25, hy + 12);
      ctx.closePath();
      ctx.fill();
      // 眉間的影紋
      ctx.fillStyle = A.c('#181a2c');
      ctx.beginPath();
      ctx.moveTo(hx + 12, hy - 3.5);
      ctx.quadraticCurveTo(hx + 3, hy - 9, hx - 9, hy - 6);
      ctx.quadraticCurveTo(hx + 2, hy - 5, hx + 11, hy - 1.5);
      ctx.closePath();
      ctx.fill();
    } });
    // 頰毛
    A.shape(ctx, (c) => { c.moveTo(hx - 7, hy - 2); c.lineTo(hx - 17, hy + 1); c.lineTo(hx - 11, hy + 3); c.lineTo(hx - 17, hy + 7); c.lineTo(hx - 8, hy + 7); c.lineTo(hx - 11, hy + 11); c.lineTo(hx - 1, hy + 8); c.closePath(); }, F[0], F[1], { lw: 2, shadeY: hy + 5 });
    A.shape(ctx, (c) => { c.moveTo(hx - 5, hy - 6); c.lineTo(hx - 7, hy - 21); c.lineTo(hx + 3, hy - 8); c.closePath(); }, F[0], F[1], { lw: 2, shadeY: hy - 9 });
    A.shape(ctx, (c) => { c.moveTo(hx - 4, hy - 8); c.lineTo(hx - 5.5, hy - 17); c.lineTo(hx + 0.5, hy - 9); c.closePath(); }, '#5a4a88', null, { noStroke: true });
    A.ellipse(ctx, hx + 23, hy + 2.5, 2.3, 1.8, '#11101c', null, { lw: 1, hl: false });
    if (!open) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 21, hy + 6);
      ctx.quadraticCurveTo(hx + 14, hy + 8, hx + 7, hy + 6);
      ctx.stroke();
      fang(ctx, hx + 15, hy + 7.2, 2.4, false);
    }
    // 冰紫色的鬼火眼
    const ex = hx + 8;
    const ey = hy - 2;
    if (kind === 'normal' || kind === 'angry') {
      if (!dead) glowH(ctx, ex, ey, 11, '#c8a8ff', 0.6);
      const eyeP = (c) => { c.moveTo(ex - 4.5, ey + 1); c.quadraticCurveTo(ex, ey - 3.6, ex + 5, ey - 1); c.quadraticCurveTo(ex + 0.5, ey + 2.8, ex - 4.5, ey + 1); c.closePath(); };
      A.shape(ctx, eyeP, '#efe2ff', null, { lw: 1.4 });
      ctx.fillStyle = A.c('#8a5aff');
      ctx.beginPath();
      ctx.arc(ex + 0.8, ey - 0.2, 1.9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c('#140a28');
      ctx.beginPath();
      ctx.ellipse(ex + 0.9, ey - 0.2, 0.7, 1.6, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - 5.5, ey - 1);
      ctx.lineTo(ex + 5.5, ey - 3 + (kind === 'angry' || open ? 1.6 : 0));
      ctx.stroke();
    } else A.eye(ctx, ex, ey, 2.8, 2.8, kind);
    ctx.restore();
    // ── 斷掉的魔鏈項圈 ──
    const cx0 = hx - 15;
    const cy0 = hy + 8;
    A.shape(ctx, (c) => { c.ellipse(cx0, cy0, 5, 10, -0.35, 0, TAU); }, '#6a6e88', '#3e4258', { lw: 2.2, cel: [1.6, 1.6] });
    if (!dead) glowStroke(ctx, (c) => { c.moveTo(cx0 - 1, cy0 - 5); c.lineTo(cx0 + 1, cy0 - 2); c.lineTo(cx0 - 1, cy0 + 1); c.moveTo(cx0 + 1.5, cy0 + 3); c.lineTo(cx0 + 0.5, cy0 + 7); }, '#d6c0ff', 1.1, '167,124,255', 0.8);
    const sw = Math.sin(t * 3) * 0.2 + step * 0.15;
    chainLink(ctx, cx0 + 1, cy0 + 12, 1.3 + sw, 1);
    chainLink(ctx, cx0 + 2 + sw * 6, cy0 + 18, 0.2 + sw, 1);
    chainLink(ctx, cx0 + 3 + sw * 10, cy0 + 23, 1.4 + sw, 1, true);
    // 頸上的影焰（蓋在頭後）
    shadowFlame(ctx, hx - 19, hy - 3, 3.5, 13, -6 - Math.sin(t * 6) * 2, fl);
  }
  function shadowwolf(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const gone = !!fx.shadowless;
    const o = { walk, crouch: ph === 'wind' ? 1 : 0, lunge: ph === 'strike' ? 1 : 0, bite: ph === 'strike' };
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    if (walk) ctx.translate(0, -Math.abs(Math.sin(t * 9)) * 2);
    if (gone) {
      // 影子離開了：本體變得半透明、冷紫色，身邊飄著影子的碎屑
      const a = 0.42 + Math.sin(t * 6) * 0.06;
      ghostDraw(ctx, WOLF_BOX, a, (g) => withTint('#8a7ad8', 0.35, () => wolfPose(g, m, o)));
      for (let i = 0; i < 5; i++) {
        const q = (t * 0.8 + i / 5) % 1;
        ctx.save();
        ctx.globalAlpha *= (1 - q) * 0.7;
        ctx.fillStyle = A.c('#2a1e4a');
        ctx.beginPath();
        ctx.ellipse(-30 + i * 16 + Math.sin(t + i) * 4, -10 - q * 50, 3 - q * 2, 2 - q, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    } else wolfPose(ctx, m, o);
    ctx.restore();
  }
  // ── 貘（dreamsheep）：吃惡夢的神獸。暮紫色的熊身、金色的火焰卷紋、虎紋的腳、象鼻與象牙、犀牛般的厚眼皮，
  //    背上馱著一朵夢雲與一彎月亮；吹夢時象鼻高高舉起，噴出紫色的睡意霧和 Z 字 ──
  const BAKU_BODY = ['#8a78c8', '#5a4a94', '#d6ccff'];
  const BAKU_LEG = ['#f0b45a', '#b87632', '#ffe0a8'];
  const BAKU_GOLD = '#ffd98a';
  function dreamsheep(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const kind = eyeKind(m);
    const dead = !!m.dead;
    const puffK = clamp(num(fx.puff, 0), 0, 1);
    const blowing = puffK > 0.05;
    const B = BAKU_BODY;
    const L = BAKU_LEG;
    const step = walk ? Math.sin(t * 7) : 0;
    const breathe = Math.sin(t * 1.8) * 0.8;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    if (walk) ctx.translate(0, -Math.abs(Math.sin(t * 7)) * 1.5);
    // ── 牛尾 ──
    const tw = Math.sin(t * 2.4) * 3;
    limb(ctx, (c) => { c.moveTo(-34, -40); c.quadraticCurveTo(-44, -38, -46 + tw * 0.3, -26); }, 4.2, B[1]);
    cloud(ctx, [[-46 + tw * 0.3, -24, 3.6], [-49 + tw * 0.3, -20, 3.4], [-43 + tw * 0.3, -20, 3.2], [-46 + tw * 0.3, -17, 3]], BAKU_GOLD, '#d8a040', 1.6, 1.2);
    // ── 虎紋的腳 ──
    const leg = (x, ph2, near, front) => {
      const s = ph2 * step;
      const lift = Math.max(0, s) * 3.5;
      const px = x + s * 4;
      const py = -lift;
      const col = near ? L[0] : '#d09a4c';
      const sh = near ? L[1] : '#94602a';
      const fn = cb(x, -30, x + (front ? 2 : -2), -18, px, -12, px, py - 4);
      const legP = (c) => taper(c, fn, (q) => 12 - q * 3, 10);
      rimShape(ctx, legP, col, sh, near ? L[2] : null, { cel: 2.2, rim: 1.2, lw: 2.3, inner: () => {
        ctx.fillStyle = A.c('#5a2c20');
        for (let i = 0; i < 3; i++) {
          const p = fn(0.22 + i * 0.22);
          const sd = front ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(p[0] - sd * 8, p[1] - 2);
          ctx.quadraticCurveTo(p[0], p[1] - 1.5, p[0] + sd * 2.5, p[1] + 0.8);
          ctx.quadraticCurveTo(p[0] - sd * 1, p[1] + 1, p[0] - sd * 8, p[1] + 1.6);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(p[0] + sd * 8, p[1] + 4);
          ctx.quadraticCurveTo(p[0] + sd * 3, p[1] + 4, p[0] + sd * 1, p[1] + 5.5);
          ctx.quadraticCurveTo(p[0] + sd * 4, p[1] + 6, p[0] + sd * 8, p[1] + 6.5);
          ctx.closePath();
          ctx.fill();
        }
      } });
      A.shape(ctx, (c) => { c.moveTo(px - 6.5, py); c.quadraticCurveTo(px - 7, py - 6.5, px, py - 6.5); c.quadraticCurveTo(px + 7.5, py - 6.5, px + 7, py); c.closePath(); }, col, sh, { lw: 2.1, shadeY: py - 2 });
      ctx.fillStyle = A.c('#fff4dc');
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 0.5 + i * 2.4, py - 1.4);
        ctx.lineTo(px + 3.2 + i * 2.4, py + 0.3);
        ctx.lineTo(px + 0.5 + i * 2.4, py + 0.6);
        ctx.closePath();
        ctx.fill();
      }
    };
    leg(-22, -1, false, false);
    leg(16, 1, false, true);
    // ── 身體 ──
    const bodyP = (c) => c.ellipse(-6, -38 + breathe * 0.3, 30, 18 + breathe * 0.4, -0.03, 0, TAU);
    rimShape(ctx, bodyP, B[0], B[1], B[2], { cel: 4, rim: 2, lw: 2.7, inner: () => {
      ctx.fillStyle = A.c('#a898dc');
      ctx.beginPath();
      ctx.ellipse(-4, -24, 24, 7, 0, 0, TAU);
      ctx.fill();
      furField(ctx, -10, -44, 22, 8, 14, PI * 0.9, 5, B[1], 1, 13);
    } });
    // 肩與腰的金色火焰卷紋（神社雕刻風）
    const flameCurl = (x, y, s, dir) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir * s, s);
      A.shape(ctx, (c) => {
        c.moveTo(-6, 6);
        c.quadraticCurveTo(-9, -3, -2, -6);
        c.quadraticCurveTo(4, -8, 6, -3);
        c.quadraticCurveTo(7, 2, 2, 2);
        c.quadraticCurveTo(-1, 1, 0, -2);
        c.quadraticCurveTo(-4, -1, -3, 3);
        c.quadraticCurveTo(-1, 6, 4, 5);
        c.lineTo(10, 3);
        c.lineTo(6, 8);
        c.quadraticCurveTo(-2, 11, -6, 6);
        c.closePath();
      }, BAKU_GOLD, '#d8a040', { lw: 1.4, shadeY: 4 });
      ctx.restore();
    };
    flameCurl(12, -38, 1.1, 1);
    flameCurl(-24, -40, 1, -1);
    // ── 背上的夢雲與月亮 ──
    const cb2 = -60 + Math.sin(t * 1.5) * 1.5 - puffK * 3;
    if (!dead) glowH(ctx, -8, cb2 - 6, 34, '#e6b8ff', 0.3 + puffK * 0.3);
    cloud(ctx, [[-22, cb2 + 2, 7], [-13, cb2 - 3, 9], [-3, cb2 - 1, 8.5], [6, cb2 + 3, 6.5], [-8, cb2 + 5, 7]], '#f2e2ff', '#c8a8f0', 1.8, 2.5);
    ctx.save();
    ctx.translate(-8, cb2 - 14);
    ctx.rotate(-0.35 + Math.sin(t * 1.2) * 0.06);
    if (!dead) glowH(ctx, 0, 0, 14, '#ffe38a', 0.5);
    crescent(ctx, 0, 0, 8, '#ffe38a', 1.8);
    // 月亮睡著的臉
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(4.8, -1.5, 1.2, 0.1 * PI, 0.9 * PI);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.35 + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha *= Math.sin(q * PI);
      sparkle(ctx, -24 + i * 14 + Math.sin(t + i) * 3, cb2 - 10 - q * 20, 2.4, i % 2 ? '#fff6c0' : '#ffd6f4');
      ctx.restore();
    }
    // ── 近側的腳 ──
    leg(-16, 1, true, false);
    leg(22, -1, true, true);
    // ── 頭 ──
    const hx = 28;
    const hy = -46 + breathe * 0.3;
    // 捲捲的鬃（頭後）
    rimShape(ctx, (c) => flameMane(c, hx - 5, hy + 1, 17, 11, 6, 3, PI * 0.5, PI * 1.55), '#fff0cc', '#d8b87a', '#ffffff', { cel: 2, rim: 1.2, lw: 2.2, inner: () => {
      curl(ctx, hx - 12, hy - 4, 4, 1, '#d8b87a', 1.2);
      curl(ctx, hx - 14, hy + 6, 3.5, -1, '#d8b87a', 1.2);
    } });
    // 耳朵（像象耳的圓耳）
    A.shape(ctx, (c) => c.ellipse(hx - 6, hy - 6, 6, 8, -0.4, 0, TAU), B[1], null, { lw: 2 });
    A.shape(ctx, (c) => c.ellipse(hx - 6, hy - 6, 3.2, 5, -0.4, 0, TAU), '#e8a6d0', null, { noStroke: true });
    const headP = (c) => {
      c.moveTo(hx - 9, hy + 6);
      c.quadraticCurveTo(hx - 11, hy - 10, hx + 2, hy - 11);
      c.quadraticCurveTo(hx + 12, hy - 11, hx + 14, hy - 2);
      c.quadraticCurveTo(hx + 15, hy + 6, hx + 8, hy + 9);
      c.quadraticCurveTo(hx - 2, hy + 11, hx - 9, hy + 6);
      c.closePath();
    };
    rimShape(ctx, headP, B[0], B[1], B[2], { cel: 2.6, rim: 1.6, lw: 2.5 });
    // 象鼻：平常垂下、末端捲起；吹夢時高高舉起
    const trunk = blowing
      ? cb(hx + 10, hy + 2, hx + 22, hy + 2, hx + 26, hy - 10 - puffK * 4, hx + 24, hy - 20 - puffK * 4)
      : cb(hx + 10, hy + 2, hx + 18, hy + 6, hx + 18 + Math.sin(t * 2) * 1.5, hy + 18, hx + 13, hy + 24);
    const trunkP = (c) => taper(c, trunk, (q) => 9 - q * 4, 16);
    rimShape(ctx, trunkP, B[0], B[1], B[2], { cel: 2, rim: 1.2, lw: 2.3, inner: () => {
      ctx.strokeStyle = A.c(B[1]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 8; i++) {
        const q = i / 8.5;
        const a = along(trunk, q, (9 - q * 4) * 0.45);
        const b = along(trunk, q, -(9 - q * 4) * 0.2);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
    } });
    const te = trunk(1);
    A.ellipse(ctx, te[0], te[1], 3.2, 3.2, '#6a58a8', null, { lw: 1.6, hl: false });
    ctx.fillStyle = A.c('#2a1c40');
    ctx.beginPath();
    ctx.arc(te[0], te[1], 1.3, 0, TAU);
    ctx.fill();
    // 象牙
    A.shape(ctx, (c) => { c.moveTo(hx + 7, hy + 7); c.quadraticCurveTo(hx + 12, hy + 16, hx + 20, hy + 14); c.quadraticCurveTo(hx + 13, hy + 12, hx + 11, hy + 6); c.closePath(); }, '#fffaf0', '#dcd0c0', { lw: 1.6, shadeY: hy + 11 });
    // 厚眼皮的犀牛眼（睡眼惺忪、長睫毛）
    const ex = hx + 5;
    const ey = hy - 3;
    if (blowing || kind === 'closed') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, ey - 0.5, 3, 0.1 * PI, 0.9 * PI);
      ctx.stroke();
    } else if (kind === 'normal' || kind === 'angry') {
      A.shape(ctx, (c) => c.ellipse(ex, ey, 3.2, 3, 0, 0, TAU), '#fff8ff', null, { lw: 1.3 });
      ctx.fillStyle = A.c('#3a1c5a');
      ctx.beginPath();
      ctx.arc(ex + 0.6, ey + 0.6, 1.9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, 0.7, 0, TAU);
      ctx.fill();
      // 厚眼皮蓋住上半
      A.shape(ctx, (c) => { c.moveTo(ex - 4, ey + 0.3); c.quadraticCurveTo(ex, ey - 5, ex + 4, ey + 0.3); c.quadraticCurveTo(ex, ey - 1 + (kind === 'angry' ? 1 : 0), ex - 4, ey + 0.3); c.closePath(); }, B[1], null, { lw: 1.3 });
    } else A.eye(ctx, ex, ey, 2.8, 2.8, kind);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ex + 3, ey + 0.2);
    ctx.lineTo(ex + 5, ey - 1.3);
    ctx.moveTo(ex + 3.6, ey + 1.3);
    ctx.lineTo(ex + 5.8, ey + 0.8);
    ctx.stroke();
    if (!dead) blushes(ctx, hx + 3, hy + 4, 0, 2.4);
    // ── 吹出來的夢霧 ──
    if (blowing) {
      for (let i = 0; i < 6; i++) {
        const q = (t * 1.2 + i / 6) % 1;
        const x = te[0] + 4 + q * 46;
        const y = te[1] - 2 - q * 6 + Math.sin(q * 6 + i) * 4;
        puff(ctx, x, y, 4 + q * 10, i % 2 ? '#d8b8ff' : '#f0d8ff', (1 - q) * 0.85 * puffK);
      }
      ctx.save();
      ctx.globalAlpha *= puffK;
      zGlyph(ctx, te[0] + 16, te[1] - 18 - Math.sin(t * 3) * 2, 6, '#efe6ff');
      zGlyph(ctx, te[0] + 28, te[1] - 28 - Math.sin(t * 3 + 1) * 2, 8, '#efe6ff');
      ctx.restore();
    } else if (!dead && Math.sin(t * 0.9) > 0.2) {
      ctx.save();
      ctx.globalAlpha *= (Math.sin(t * 0.9) - 0.2) * 1.2;
      zGlyph(ctx, hx - 2, hy - 18 - ((t * 6) % 6), 5, '#efe6ff');
      ctx.restore();
    }
    ctx.restore();
  }
  // ── 九尾封印狐（silencefox）：金色的九尾妖狐。九條尾巴像扇子一樣張開，尾尖是白毛與狐火；
  //    臉上朱紅的隈取、額頭一道火焰紋，頸上繫著紅繩與巫女的神樂鈴，身邊飄著封印符。
  //    蓄力（fx.aura）時尾巴張得更開、頭上浮出三團狐火，然後追著玩家飛出去（projectile foxfire） ──
  const KY_FUR = ['#f2a93a', '#c26e1c', '#ffe6a0'];
  const KY_CREAM = ['#fff4dc', '#e6cca4'];
  const KY_RED = '#d8283a';
  // 狐火（金橙色、白芯，不描邊）
  function foxFlame(ctx, x, y, r, t, seed, a) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    glowH(ctx, x, y, r * 3, '#ffb03a', 0.55);
    const sw = Math.sin(t * 9 + seed) * r * 0.35;
    ctx.fillStyle = A.c('#ff9a2a');
    ctx.beginPath();
    flamePath(ctx, x, y + r, r, r * 2.8, sw);
    ctx.fill();
    ctx.fillStyle = A.c('#ffd24a');
    ctx.beginPath();
    flamePath(ctx, x, y + r * 0.8, r * 0.7, r * 2, sw * 0.7);
    ctx.fill();
    ctx.fillStyle = A.c('#fffbe0');
    ctx.beginPath();
    ctx.arc(x, y + r * 0.2, r * 0.42, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 神樂鈴（一串金鈴）
  function kaguraBells(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 4) * 0.12);
    [[0, 0], [-2.8, 3.2], [2.8, 3.2], [0, 6]].forEach((q) => {
      A.shape(ctx, (c) => c.arc(q[0] * s, q[1] * s, 2.2 * s, 0, TAU), '#ffd24a', '#c8901e', { lw: 1.2, shadeY: q[1] * s + 0.8 });
      ctx.fillStyle = A.c('#5a3410');
      ctx.fillRect(q[0] * s - 1.1 * s, q[1] * s + 0.6 * s, 2.2 * s, 0.6 * s);
    });
    ctx.restore();
  }
  function silencefox(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const kind = eyeKind(m);
    const dead = !!m.dead;
    const aura = clamp(Math.max(num(fx.aura, 0), ph === 'wind' ? 0.3 : 0), 0, 1);
    const F = KY_FUR;
    const C = KY_CREAM;
    const step = walk ? Math.sin(t * 10) : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.07);
    if (walk) ctx.translate(0, -Math.abs(Math.sin(t * 10)) * 2);
    if (!dead && aura > 0) glowH(ctx, -10, -44, 60 + aura * 20, '#ffb03a', aura * 0.35);
    // ── 九條尾巴（扇形張開，蓄力時張得更開） ──
    const spread = 0.85 + aura * 0.35;
    const tails = [];
    for (let i = 0; i < 9; i++) {
      const k = i / 8;
      const a = -PI * 0.5 - 0.25 - (k - 0.5) * 2 * 1.05 * spread + Math.sin(t * 2.2 + i * 0.8) * 0.06;
      const len = 30 + Math.sin(k * PI) * 10;
      tails.push([a, len, i]);
    }
    // 由外往內畫：兩側先畫、中間的蓋在上面
    tails.sort((p, q) => Math.abs(q[2] - 4) - Math.abs(p[2] - 4));
    const rx0 = -24;
    const ry0 = -32;
    tails.forEach(([a, len, i]) => {
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const bend = 0.35 * (i < 4 ? 1 : -1);
      const fn = cb(rx0, ry0, rx0 + ca * len * 0.35 - sa * 4, ry0 + sa * len * 0.35 + ca * 4, rx0 + Math.cos(a + bend) * len * 0.8, ry0 + Math.sin(a + bend) * len * 0.8, rx0 + Math.cos(a + bend * 0.6) * len, ry0 + Math.sin(a + bend * 0.6) * len);
      const wf = (s) => 4 + Math.sin(Math.min(1, s * 1.1) * PI) * 12 * (1 - s * 0.2);
      const shade = Math.abs(i - 4) > 2 ? '#a85c16' : F[1];
      rimShape(ctx, (c) => taper(c, fn, wf, 16), Math.abs(i - 4) > 2 ? '#e0962e' : F[0], shade, F[2], { cel: 2.2, rim: 1.2, lw: 2.2, inner: () => {
        // 白色的尾尖
        ctx.fillStyle = A.c(C[0]);
        ctx.beginPath();
        taper(ctx, (s) => fn(0.72 + s * 0.28), 40, 8);
        ctx.fill();
        const q = along(fn, 0.45, 0);
        strands(ctx, [[q[0], q[1], q[2] + PI, 6], [q[0] + 2, q[1] + 1, q[2] + PI + 0.2, 5]], shade, 1);
      } });
      const tip = fn(1);
      if (!dead && (i % 2 === 0 || aura > 0.3)) foxFlame(ctx, tip[0], tip[1] - 2, 2.6 + aura * 1.2, t, i, 0.55 + aura * 0.45);
    });
    // ── 腳（遠側） ──
    const leg = (x, ph2, col, sh, front, near) => {
      const s = ph2 * step;
      const lift = Math.max(0, s) * 4;
      const px = x + s * 6;
      const py = -lift;
      const fn = front ? cb(x, -26, x + 2, -16, px, -10, px, py - 3) : cb(x, -28, x - 6, -18, px + 3, -10, px, py - 3);
      blob(ctx, [(c) => c.ellipse(x - (front ? 0 : 2), -28, front ? 6 : 8, 9, 0, 0, TAU), (c) => taper(c, fn, (q) => 8 - q * 3.5, 10)], col, sh, near ? F[2] : null, { cel: 2, rim: 1.1, lw: 2.2, inner: () => {
        ctx.fillStyle = A.c('#5a2a14');
        ctx.beginPath();
        taper(ctx, (q) => fn(0.62 + q * 0.38), 20, 6);
        ctx.fill();
      } });
      A.shape(ctx, (c) => c.ellipse(px + 1.5, py - 1.8, 4.2, 2.6, 0, 0, TAU), '#5a2a14', null, { lw: 1.8 });
    };
    leg(-18, -1, '#d68a2a', '#9a5410', false, false);
    leg(12, 1, '#d68a2a', '#9a5410', true, false);
    // ── 身體 ──
    const bodyP = (c) => c.ellipse(-5, -30, 22, 11, -0.05, 0, TAU);
    const chestP = (c) => c.ellipse(13, -34, 10, 12, 0.2, 0, TAU);
    blob(ctx, [bodyP, chestP], F[0], F[1], F[2], { cel: 3, rim: 1.8, lw: 2.5, inner: () => {
      ctx.fillStyle = A.c(C[0]);
      ctx.beginPath();
      ctx.ellipse(2, -20, 18, 5, 0, 0, TAU);
      ctx.fill();
      furField(ctx, -8, -34, 14, 5, 10, PI * 0.95, 5, F[1], 1, 17);
      // 身側的朱紅火焰紋
      ctx.fillStyle = A.c(KY_RED);
      ctx.beginPath();
      ctx.moveTo(-18, -26);
      ctx.quadraticCurveTo(-12, -34, -2, -33);
      ctx.quadraticCurveTo(-10, -31, -12, -27);
      ctx.quadraticCurveTo(-8, -30, -3, -29);
      ctx.quadraticCurveTo(-11, -25, -18, -26);
      ctx.closePath();
      ctx.fill();
    } });
    // 胸前白毛
    A.shape(ctx, (c) => { c.moveTo(10, -44); c.quadraticCurveTo(24, -44, 22, -30); c.lineTo(19, -32); c.lineTo(18, -26); c.lineTo(15, -29); c.lineTo(12, -24); c.lineTo(10, -30); c.quadraticCurveTo(6, -38, 10, -44); c.closePath(); }, C[0], C[1], { lw: 1.8, shadeY: -32 });
    // ── 近側的腳 ──
    leg(-13, 1, F[0], F[1], false, true);
    leg(17, -1, F[0], F[1], true, true);
    // ── 頭 ──
    const hx = 27;
    const hy = -47 - aura * 2;
    const ear = (x, y, rot, col) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      A.shape(ctx, (c) => { c.moveTo(-6, 2); c.quadraticCurveTo(-5, -10, 1, -16); c.quadraticCurveTo(6, -8, 6, 2); c.closePath(); }, col, null, { lw: 2.1 });
      A.shape(ctx, (c) => { c.moveTo(-3, 1); c.quadraticCurveTo(-2.5, -7, 1, -11); c.quadraticCurveTo(3.5, -6, 3.5, 1); c.closePath(); }, C[0], null, { noStroke: true });
      ctx.fillStyle = A.c('#4a2412');
      ctx.beginPath();
      ctx.moveTo(-4.4, -8);
      ctx.quadraticCurveTo(0, -10, 1, -16);
      ctx.quadraticCurveTo(3.5, -12, 4.6, -8);
      ctx.quadraticCurveTo(0, -11, -4.4, -8);
      ctx.fill();
      ctx.restore();
    };
    ear(hx - 7, hy - 6, -0.35, F[1]);
    const headP = (c) => {
      c.moveTo(hx - 10, hy + 5);
      c.quadraticCurveTo(hx - 12, hy - 8, hx - 1, hy - 9);
      c.quadraticCurveTo(hx + 8, hy - 9.5, hx + 11, hy - 3);
      c.lineTo(hx + 19, hy + 1.5);
      c.quadraticCurveTo(hx + 20.5, hy + 4.5, hx + 16, hy + 5.5);
      c.quadraticCurveTo(hx + 4, hy + 9, hx - 10, hy + 5);
      c.closePath();
    };
    rimShape(ctx, headP, F[0], F[1], F[2], { cel: 2.4, rim: 1.5, lw: 2.4, inner: () => {
      ctx.fillStyle = A.c(C[0]);
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy + 9);
      ctx.quadraticCurveTo(hx + 4, hy + 1, hx + 21, hy + 2);
      ctx.lineTo(hx + 21, hy + 10);
      ctx.closePath();
      ctx.fill();
      // 朱紅隈取
      ctx.fillStyle = A.c(KY_RED);
      ctx.beginPath();
      ctx.moveTo(hx + 10, hy - 1);
      ctx.quadraticCurveTo(hx + 3, hy - 6, hx - 7, hy - 5);
      ctx.quadraticCurveTo(hx + 1, hy - 2.5, hx + 9, hy + 1);
      ctx.closePath();
      ctx.fill();
    } });
    // 頰毛
    A.shape(ctx, (c) => { c.moveTo(hx - 6, hy - 2); c.lineTo(hx - 15, hy + 2); c.lineTo(hx - 9, hy + 4); c.lineTo(hx - 14, hy + 8); c.lineTo(hx - 5, hy + 7); c.lineTo(hx - 7, hy + 11); c.lineTo(hx + 2, hy + 7); c.closePath(); }, C[0], C[1], { lw: 1.9, shadeY: hy + 6 });
    ear(hx + 1, hy - 7.5, 0.05, F[0]);
    // 額頭的火焰紋
    A.shape(ctx, (c) => { c.moveTo(hx + 1, hy - 3); c.quadraticCurveTo(hx - 2, hy - 7, hx + 1, hy - 11); c.quadraticCurveTo(hx + 1, hy - 7, hx + 4, hy - 6); c.quadraticCurveTo(hx + 3, hy - 4, hx + 1, hy - 3); c.closePath(); }, KY_RED, null, { noStroke: true });
    // 眼睛：細長的狐眼、金色虹膜，蓄力時發光
    const ex = hx + 6;
    const ey = hy - 1.5;
    if (kind === 'normal' || kind === 'angry') {
      if (!dead) glowH(ctx, ex, ey, 8 + aura * 5, '#ffcf4a', 0.25 + aura * 0.5);
      const eyeP = (c) => { c.moveTo(ex - 4, ey + 1.2); c.quadraticCurveTo(ex - 0.5, ey - 3, ex + 4.5, ey - 1.5); c.quadraticCurveTo(ex + 1, ey + 2.4, ex - 4, ey + 1.2); c.closePath(); };
      A.shape(ctx, eyeP, mixq('#ffe07a', '#fff8d8', aura), null, { lw: 1.3 });
      ctx.fillStyle = A.c('#3a1606');
      ctx.beginPath();
      ctx.ellipse(ex + 0.6, ey - 0.3, 0.8, 1.8, 0.3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - 4.8, ey + 0.8);
      ctx.quadraticCurveTo(ex - 0.5, ey - 3.6, ex + 5.8, ey - 2.4 + (kind === 'angry' ? 1 : 0));
      ctx.stroke();
    } else A.eye(ctx, ex, ey, 2.6, 2.6, kind);
    A.ellipse(ctx, hx + 19, hy + 2.2, 1.7, 1.4, '#2a1406', null, { lw: 1, hl: false });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (aura > 0.2) {
      ctx.moveTo(hx + 17, hy + 4.5);
      ctx.quadraticCurveTo(hx + 12, hy + 7, hx + 8, hy + 4.5);
    } else {
      ctx.moveTo(hx + 17, hy + 4.5);
      ctx.quadraticCurveTo(hx + 13, hy + 5.5, hx + 10, hy + 3.8);
    }
    ctx.stroke();
    // ── 頸上的紅繩與神樂鈴 ──
    ropeStroke(ctx, (c) => { c.moveTo(hx - 12, hy + 3); c.quadraticCurveTo(hx - 6, hy + 12, hx + 1, hy + 8); }, 2.6, '#e0303e', '#9a1826');
    kaguraBells(ctx, hx - 5, hy + 12, 1, t);
    // 紅繩流蘇
    limb(ctx, (c) => { c.moveTo(hx - 3, hy + 10); c.quadraticCurveTo(hx - 1 + Math.sin(t * 3) * 1.5, hy + 16, hx - 2, hy + 21); }, 3, '#e0303e');
    // ── 飄在身邊的封印符 ──
    for (let i = 0; i < 2; i++) {
      const a = t * 0.9 + i * PI;
      const x = -30 + Math.cos(a) * 26;
      const y = -66 + Math.sin(a) * 6 + Math.sin(t * 2 + i) * 3;
      talisman(ctx, x, y, 7, 14, Math.sin(t * 2 + i) * 0.3, '#fff1b8', KY_RED, null, 0, i + 1);
    }
    // ── 蓄力：頭上浮出三團狐火（位置對準發射點） ──
    if (!dead && aura > 0) {
      for (let k = 0; k < 3; k++) {
        const a = -PI / 2 + (k - 1) * 0.7;
        const x = Math.cos(a) * 40;
        const y = -63 + Math.sin(a) * 20 + Math.sin(t * 5 + k) * 1.5;
        const r = 4 + aura * 6;
        ctx.save();
        ctx.globalAlpha *= Math.min(1, aura * 1.6);
        ctx.strokeStyle = 'rgba(255,200,90,0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.8 * (1.4 - aura * 0.4), t * 3 + k, t * 3 + k + 4);
        ctx.stroke();
        ctx.restore();
        foxFlame(ctx, x, y, r, t, k * 2, Math.min(1, aura * 1.4));
      }
    }
    ctx.restore();
  }
  // ── 古木樹靈（heartcedar）：神社御神木的樹靈。千年杉的層層枝葉上積著雪，粗大的樹幹上繫著注連繩與紙垂，
  //    樹皮間是一張沉睡的老臉與長長的苔鬚；樹幹中央的樹皮會像門一樣打開，露出發光的翠金色心核（fx.open、fx.beat） ──
  const SC_BARK = ['#6e5444', '#45322a', '#b0927a'];
  const SC_LEAF = ['#2f6c4c', '#1c4633', '#72b884'];
  // 翠金色的心核（光球＋年輪般的光環）
  function lifeCore(ctx, x, y, r, beat, t, ga) {
    if (ga > 0) glowH(ctx, x, y, r * 3.2, '#c8ff7a', ga * (0.45 + beat * 0.35));
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, A.c('#ffffff'));
    g.addColorStop(0.35, A.c('#f4ffb0'));
    g.addColorStop(0.75, A.c('#9ae05a'));
    g.addColorStop(1, A.c('#4a9a3a'));
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
    ctx.strokeStyle = 'rgba(255,255,220,0.7)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x, y, r * (0.35 + i * 0.22), r * (0.3 + i * 0.2), t * 0.5 * i, 0, TAU);
      ctx.stroke();
    }
    // 一片新芽
    A.shape(ctx, (c) => { c.moveTo(x, y + r * 0.3); c.quadraticCurveTo(x - r * 0.1, y - r * 0.2, x - r * 0.45, y - r * 0.45); c.quadraticCurveTo(x - r * 0.05, y - r * 0.5, x, y + r * 0.3); c.closePath(); }, '#5ac04a', null, { noStroke: true });
    A.shape(ctx, (c) => { c.moveTo(x, y + r * 0.3); c.quadraticCurveTo(x + r * 0.15, y - r * 0.25, x + r * 0.5, y - r * 0.35); c.quadraticCurveTo(x + r * 0.1, y - r * 0.05, x, y + r * 0.3); c.closePath(); }, '#7ad85a', null, { noStroke: true });
    ctx.restore();
  }
  // 杉木的一層枝葉（上緣是圓弧、下緣是一撮撮針葉）
  function cedarTier(c, cx, cy, w, h, n, sway) {
    c.moveTo(cx - w, cy + h * 0.3);
    c.quadraticCurveTo(cx - w * 0.55 + sway * 0.5, cy - h * 0.9, cx + sway, cy - h);
    c.quadraticCurveTo(cx + w * 0.55 + sway * 0.5, cy - h * 0.9, cx + w, cy + h * 0.3);
    for (let i = n; i > 0; i--) {
      const x = cx - w + (2 * w * i) / n;
      const dy = ((i * 7) % 3) * 0.12;
      c.quadraticCurveTo(x - w / n, cy + h * (1.15 + dy), x - (2 * w) / n, cy + h * 0.3);
    }
    c.closePath();
  }
  function heartcedar(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const kind = eyeKind(m);
    const dead = !!m.dead;
    const open = clamp(num(fx.open, 0), 0, 1);
    const beat = clamp(num(fx.beat, 0), 0, 1);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const K = SC_BARK;
    const Lf = SC_LEAF;
    const sway = Math.sin(t * 1.2) * 2 + (walk ? Math.sin(t * 5) * 1.5 : 0);
    ctx.save();
    if (hurt) ctx.rotate(-0.04);
    // ── 根（腳）：四條粗根，走路時輪流挪動 ──
    const root = (x, dir, ph2, col, sh) => {
      const s = walk ? Math.sin(t * 5 + ph2) : 0;
      const lift = Math.max(0, s) * 3;
      const ex = x + dir * 16 + s * 3;
      const fn = cb(x, -16, x + dir * 4, -6, ex - dir * 6, -1 - lift, ex, -lift);
      rimShape(ctx, (c) => taper(c, fn, (q) => 13 - q * 10, 12), col, sh, K[2], { cel: 2, rim: 1.2, lw: 2.3 });
      strands(ctx, [[x + dir * 3, -10, dir > 0 ? 0.4 : PI - 0.4, 8]], sh, 1);
    };
    root(-12, -1, 0, K[1], '#2e2018');
    root(12, 1, PI, K[1], '#2e2018');
    root(-20, -1, PI, K[0], K[1]);
    root(20, 1, 0, K[0], K[1]);
    // ── 遠側的枝手 ──
    const arm = (sx, sy, hx2, hy2, col, sh, rim) => {
      const fn = qb(sx, sy, (sx + hx2) / 2, Math.min(sy, hy2) - 8, hx2, hy2);
      rimShape(ctx, (c) => taper(c, fn, (q) => 10 - q * 6, 12), col, sh, rim, { cel: 1.8, rim: 1, lw: 2.2 });
      const e = fn(1);
      const d = fn(0.9);
      const a = Math.atan2(e[1] - d[1], e[0] - d[0]);
      limb(ctx, (c) => {
        for (let i = -1; i <= 1; i++) {
          c.moveTo(e[0], e[1]);
          c.quadraticCurveTo(e[0] + Math.cos(a + i * 0.6) * 5, e[1] + Math.sin(a + i * 0.6) * 5, e[0] + Math.cos(a + i * 0.7 - 0.2) * 9, e[1] + Math.sin(a + i * 0.7 - 0.2) * 9);
        }
      }, 4, col);
      // 枝上的小針葉
      const q = fn(0.5);
      rimShape(ctx, (c) => cedarTier(c, q[0], q[1] - 3, 7, 4, 3, 0), Lf[0], Lf[1], null, { cel: 1.2, lw: 1.6 });
    };
    arm(-22, -66, -44 + sway * 0.5, -48, K[1], '#2e2018', null);
    // ── 樹幹 ──
    const trunkP = (c) => {
      c.moveTo(-30, -10);
      c.quadraticCurveTo(-22, -24, -24, -50);
      c.quadraticCurveTo(-26, -80, -19, -98);
      c.lineTo(19, -98);
      c.quadraticCurveTo(26, -80, 23, -50);
      c.quadraticCurveTo(22, -24, 30, -10);
      c.quadraticCurveTo(0, -4, -30, -10);
      c.closePath();
    };
    rimShape(ctx, trunkP, K[0], K[1], K[2], { cel: 5, rim: 2.2, lw: 2.8, inner: () => {
      // 樹皮的縱紋
      ctx.strokeStyle = A.c(K[1]);
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      [[-18, 0.1], [-11, -0.05], [-3, 0.08], [6, -0.06], [14, 0.05]].forEach((q, i) => {
        const x = q[0];
        ctx.moveTo(x, -12);
        ctx.bezierCurveTo(x + 4 * q[1] * 30, -40, x - 3, -70, x + (i - 2) * 1.5, -98);
      });
      ctx.stroke();
      ctx.strokeStyle = A.c('#8a6e5a');
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      [[-15, -30], [9, -24], [-6, -88], [12, -84], [-20, -76]].forEach((q) => {
        ctx.moveTo(q[0], q[1]);
        ctx.quadraticCurveTo(q[0] + 2, q[1] - 5, q[0], q[1] - 10);
      });
      ctx.stroke();
      // 苔蘚
      ctx.fillStyle = A.c('#6e9a4a');
      [[-24, -20, 6, 4], [22, -30, 5, 3.5], [-22, -92, 5, 3], [18, -74, 4, 5]].forEach((q) => {
        ctx.beginPath();
        ctx.ellipse(q[0], q[1], q[2], q[3], 0.3, 0, TAU);
        ctx.fill();
      });
    } });
    // ── 心核的樹洞與樹皮門 ──
    const cx0 = 0;
    const cy0 = -36;
    const hr = 13;
    const pulse = 1 + beat * 0.1;
    // 樹洞（深色）
    A.shape(ctx, (c) => c.ellipse(cx0, cy0, hr + 2, hr + 4, 0, 0, TAU), '#1e1410', null, { lw: 2.2 });
    if (open > 0.02) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx0, cy0, hr + 1, hr + 3, 0, 0, TAU);
      ctx.clip();
      lifeCore(ctx, cx0, cy0, hr * 0.85 * pulse * (0.7 + open * 0.3), beat, t, dead ? 0 : 1);
      ctx.restore();
      if (!dead) glowH(ctx, cx0, cy0, 40, '#c8ff7a', open * (0.25 + beat * 0.3));
    } else if (!dead) {
      glowH(ctx, cx0, cy0, 12, '#c8ff7a', 0.2 + beat * 0.25);
    }
    // 兩扇樹皮門：往兩側打開
    const door = (side) => {
      const w = (hr + 2) * (1 - open * 0.78);
      const x0 = cx0 + side * (hr + 2);
      const P = (c) => {
        c.moveTo(x0, cy0 - hr - 4);
        c.quadraticCurveTo(x0 - side * w * 1.1, cy0 - hr - 2, x0 - side * w, cy0);
        c.quadraticCurveTo(x0 - side * w * 1.1, cy0 + hr + 2, x0, cy0 + hr + 4);
        c.closePath();
      };
      rimShape(ctx, P, side < 0 ? K[0] : '#5e4638', K[1], K[2], { cel: 1.5, rim: 1, lw: 2.2, inner: () => {
        ctx.strokeStyle = A.c(K[1]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const y = cy0 - 8 + i * 8;
          ctx.moveTo(x0, y);
          ctx.quadraticCurveTo(x0 - side * w * 0.5, y + 2, x0 - side * w * 0.9, y);
        }
        ctx.stroke();
      } });
    };
    door(-1);
    door(1);
    if (open < 0.1 && !dead) {
      // 門縫透出的光
      ctx.save();
      ctx.globalAlpha *= 0.5 + beat * 0.5;
      ctx.strokeStyle = A.c('#e8ffa0');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx0, cy0 - hr);
      ctx.lineTo(cx0, cy0 + hr);
      ctx.stroke();
      ctx.restore();
    }
    // ── 注連繩＋紙垂 ──
    const ry = -58;
    ropeStroke(ctx, (c) => { c.moveTo(-26, ry - 3); c.quadraticCurveTo(0, ry + 7, 25, ry - 3); }, 6, '#e8d49a', '#b89a5a');
    ropeStroke(ctx, (c) => { c.moveTo(-25, ry + 1); c.quadraticCurveTo(0, ry + 11, 24, ry + 1); }, 3.5, '#e8d49a', '#b89a5a');
    [-19, 18].forEach((x, i) => shide(ctx, x, ry + 1, 3, Math.sin(t * 2 + i) * 0.12));
    // 繩上垂下的草穗
    [-20, -7, 8, 20].forEach((x, i) => limb(ctx, (c) => { c.moveTo(x, ry + 3 + (i % 3 === 0 ? -1 : 2)); c.lineTo(x + Math.sin(t * 2 + i) * 1, ry + 9 + (i % 3 === 0 ? -1 : 2)); }, 3, '#d8c080'));
    // ── 臉：樹皮上沉睡的老臉 ──
    const fy = -84;
    // 眉骨（樹皮垂下來）
    A.shape(ctx, (c) => { c.moveTo(-18, fy - 4); c.quadraticCurveTo(-9, fy - 10, -2, fy - 5); c.quadraticCurveTo(0, fy - 7, 2, fy - 5); c.quadraticCurveTo(9, fy - 10, 18, fy - 4); c.quadraticCurveTo(9, fy - 6, 1, fy - 2); c.quadraticCurveTo(-9, fy - 6, -18, fy - 4); c.closePath(); }, '#5a4234', K[1], { lw: 1.8, shadeY: fy - 5 });
    const eyeHole = (x) => {
      A.shape(ctx, (c) => c.ellipse(x, fy, 4.8, 3.6, 0, 0, TAU), '#1a100c', null, { lw: 1.8 });
      if (kind === 'normal' || kind === 'angry') {
        if (!dead) glowH(ctx, x, fy, 9, '#ffd06a', 0.55 + (open > 0.5 ? 0.3 : 0));
        ctx.fillStyle = A.c('#ffd86a');
        ctx.beginPath();
        ctx.ellipse(x + 0.6, fy + 0.3, 2.4, open > 0.5 || strike ? 2.2 : 1.2, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fffbe0';
        ctx.beginPath();
        ctx.arc(x + 0.2, fy - 0.2, 0.8, 0, TAU);
        ctx.fill();
      } else if (kind === 'x') {
        A.eye(ctx, x, fy, 2.4, 2.4, 'x');
      } else {
        ctx.strokeStyle = A.c('#c8a060');
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x - 3, fy);
        ctx.lineTo(x + 3, fy);
        ctx.stroke();
      }
    };
    eyeHole(-8);
    eyeHole(9);
    // 鼻樑（一個樹瘤）與嘴
    A.shape(ctx, (c) => c.ellipse(1, fy + 6, 3.4, 4.2, 0, 0, TAU), K[0], K[1], { lw: 1.6, shadeY: fy + 7 });
    A.shape(ctx, (c) => { c.moveTo(-6, fy + 12); c.quadraticCurveTo(1, fy + 15 + (strike ? 4 : 0), 8, fy + 12); c.quadraticCurveTo(1, fy + 13.5, -6, fy + 12); c.closePath(); }, '#1a100c', null, { lw: 1.5 });
    // 苔鬚
    for (let i = 0; i < 5; i++) {
      const x = -8 + i * 4.2;
      const len = 4 + ((i * 3) % 4) * 1.2;
      limb(ctx, (c) => { c.moveTo(x, fy + 14); c.quadraticCurveTo(x - 1 + Math.sin(t * 2 + i) * 1.2, fy + 14 + len * 0.6, x + Math.sin(t * 2 + i) * 1.8, fy + 14 + len); }, 3.2, i % 2 ? '#8ab86a' : '#a8cc84');
    }
    // ── 枝葉（三層杉葉＋積雪） ──
    const tiers = [[0, -104, 58, 13, 8], [0, -118, 44, 12, 6], [0, -131, 28, 11, 4]];
    tiers.forEach(([x, y, w, h, n], i) => {
      const sw = sway * (0.6 + i * 0.3);
      const P = (c) => cedarTier(c, x + sw * 0.3, y, w, h, n, sw);
      rimShape(ctx, P, Lf[0], Lf[1], Lf[2], { cel: 3, rim: 1.6, lw: 2.5, inner: () => {
        const list = [];
        for (let j = 0; j < n + 2; j++) {
          const xx = x - w * 0.8 + (w * 1.6 * j) / (n + 1) + sw * 0.3;
          list.push([xx, y - h * 0.2, PI / 2 + (j - n / 2) * 0.08, h * 0.7]);
        }
        strands(ctx, list, Lf[1], 1.1);
      } });
      // 積雪：兩側的肩上各一團，最上層整片蓋住
      const lump = (x0, y0, r) => A.shape(ctx, (c) => { c.moveTo(x0 - r * 1.6, y0 + r * 0.5); c.quadraticCurveTo(x0 - r * 1.2, y0 - r, x0, y0 - r); c.quadraticCurveTo(x0 + r * 1.3, y0 - r * 0.9, x0 + r * 1.6, y0 + r * 0.4); c.quadraticCurveTo(x0 + r * 0.8, y0 + r * 0.1, x0 + r * 0.3, y0 + r * 0.6); c.quadraticCurveTo(x0 - r * 0.4, y0 + r * 0.1, x0 - r * 1.6, y0 + r * 0.5); c.closePath(); }, '#ffffff', '#d6e4f4', { lw: 1.7, shadeY: y0 + r * 0.1 });
      if (i < 2) {
        lump(x - w * 0.72 + sw * 0.3, y - h * 0.05, 4.5);
        lump(x + w * 0.7 + sw * 0.3, y - h * 0.05, 4.5);
      } else lump(x + sw * 0.8, y - h * 0.75, 7);
    });
    // 頂上的一顆冰晶（丟冰錐前會亮）
    const ice = wind ? 1 : strike ? 0.6 : 0.2 + 0.1 * Math.sin(t * 3);
    if (!dead) glowH(ctx, sway * 1.2, -144, 12 + ice * 8, '#bfeaff', 0.3 + ice * 0.5);
    ctx.save();
    ctx.translate(sway * 1.2, -141);
    A.shape(ctx, (c) => poly(c, [[0, -8], [3.5, 0], [0, 5], [-3.5, 0]]), '#dff6ff', '#8ccaf0', { lw: 1.6, shadeY: 0 });
    ctx.restore();
    // ── 近側的枝手：丟冰錐時往前揮 ──
    if (strike) arm(22, -66, 46, -84 + sway * 0.3, K[0], K[1], K[2]);
    else if (wind) arm(22, -66, 36, -92, K[0], K[1], K[2]);
    else arm(22, -66, 44 - sway * 0.5, -50, K[0], K[1], K[2]);
    if (wind && !dead) {
      glowH(ctx, 38, -96, 12, '#bfeaff', 0.6);
      sparkle(ctx, 38, -96, 4 + Math.sin(t * 12) * 1.5, '#ffffff');
    }
    ctx.restore();
  }
  // ── 狛犬（shieldbear）：守護神社參道的石狛犬活了過來。花崗岩的身體長著地衣與青苔、滿頭一圈圈雕出來的捲鬃、
  //    頭上一支獨角、胸前掛著紅色的前掛；前爪舉著一面刻有三巴神紋與注連繩的石盾（fx.guard 舉盾、fx.bash 盾擊） ──
  const KM_STONE = ['#b4afa4', '#77726a', '#ebe6da'];
  const KM_DARK = ['#8e897f', '#5c5750'];
  function stoneShield(ctx, r, shine, t, dead) {
    // 外圈（刻紋的石框）
    rimShape(ctx, (c) => c.arc(0, 0, r, 0, TAU), '#a8a398', '#6e6a62', '#e6e2d6', { cel: r * 0.12, rim: 1.6, lw: 2.8, inner: () => {
      ctx.fillStyle = A.c('#8a9a5a');
      [[-0.55, 0.6, 0.18], [0.62, -0.5, 0.12], [0.3, 0.75, 0.1]].forEach((q) => {
        ctx.beginPath();
        ctx.ellipse(q[0] * r, q[1] * r, q[2] * r, q[2] * r * 0.7, 0.4, 0, TAU);
        ctx.fill();
      });
    } });
    // 內圈（凹下去的盾面）
    A.shape(ctx, (c) => c.arc(0, 0, r * 0.76, 0, TAU), '#c4bfb3', '#9a958a', { lw: 1.8, cel: [-r * 0.06, -r * 0.06] });
    // 刻紋小點
    ctx.fillStyle = A.c('#7e796f');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88, r * 0.045, 0, TAU);
      ctx.fill();
    }
    // 三巴神紋（舉盾時發金光）
    if (shine > 0 && !dead) glowH(ctx, 0, 0, r * 0.9, '#ffd86a', shine * 0.55);
    tomoe(ctx, 0.8, 0.8, r * 0.52, 0.3, '#6e695f');
    tomoe(ctx, 0, 0, r * 0.52, 0.3, mixq('#8a857a', '#ffd24a', dead ? 0 : shine));
    // 上緣的注連繩＋紙垂
    ropeStroke(ctx, (c) => { c.moveTo(-r * 0.8, -r * 0.55); c.quadraticCurveTo(0, -r * 0.25, r * 0.8, -r * 0.55); }, r * 0.14, '#e8d49a', '#b89a5a');
    shide(ctx, -r * 0.35, -r * 0.38, r * 0.1, 0.05 + Math.sin(t * 3) * 0.08);
    shide(ctx, r * 0.35, -r * 0.38, r * 0.1, -0.05 + Math.sin(t * 3 + 1) * 0.08);
    // 裂痕
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(r * 0.72, r * 0.2);
    ctx.lineTo(r * 0.55, r * 0.3);
    ctx.lineTo(r * 0.6, r * 0.45);
    ctx.lineTo(r * 0.45, r * 0.55);
    ctx.stroke();
  }
  // 雕刻風的螺旋捲毛
  function stoneCurl(ctx, x, y, r, dir, fill, shade) {
    rimShape(ctx, (c) => c.arc(x, y, r, 0, TAU), fill, shade, KM_STONE[2], { cel: r * 0.22, rim: r * 0.12, lw: 2 });
    curl(ctx, x, y, r * 0.75, dir, shade, Math.max(1, r * 0.16));
  }
  function shieldbear(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const kind = eyeKind(m);
    const dead = !!m.dead;
    const guard = fx.guard == null ? true : !!fx.guard;
    const bash = clamp(num(fx.bash, 0), 0, 1);
    const wind = ph === 'wind';
    const lowered = !guard && bash < 0.5;
    const S = KM_STONE;
    const D = KM_DARK;
    const step = walk ? Math.sin(t * 6) : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.04);
    if (walk) ctx.translate(0, -Math.abs(Math.sin(t * 6)) * 2);
    const lean = bash > 0.5 ? 0.12 : wind ? -0.08 : 0;
    // ── 捲尾（石雕的火焰捲） ──
    ctx.save();
    ctx.translate(-26, -44);
    ctx.rotate(0.35 + Math.sin(t * 2) * 0.04 - lean);
    rimShape(ctx, (c) => flameMane(c, -2, -8, 20, 10, 5, 4, PI * 0.95, PI * 2.05), D[0], D[1], S[2], { cel: 2.5, rim: 1.2, lw: 2.4 });
    stoneCurl(ctx, -8, -14, 5, 1, D[0], D[1]);
    stoneCurl(ctx, 4, -18, 4.5, -1, D[0], D[1]);
    ctx.restore();
    // ── 後腳（蹲坐的大腿＋腳掌） ──
    const hind = (x, s, col, sh, rim) => {
      const lift = Math.max(0, s) * 3;
      rimShape(ctx, (c) => c.ellipse(x - 4, -20, 15, 15, 0, 0, TAU), col, sh, rim, { cel: 3, rim: 1.4, lw: 2.5 });
      A.shape(ctx, (c) => { c.moveTo(x - 8 + s * 4, -lift); c.quadraticCurveTo(x - 9 + s * 4, -9 - lift, x + 1 + s * 4, -9 - lift); c.quadraticCurveTo(x + 13 + s * 4, -8 - lift, x + 12 + s * 4, -lift); c.closePath(); }, col, sh, { lw: 2.3, shadeY: -3 - lift });
      ctx.strokeStyle = A.c(sh);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 3 + s * 4, -lift);
      ctx.lineTo(x + 3 + s * 4, -4 - lift);
      ctx.moveTo(x + 7 + s * 4, -lift);
      ctx.lineTo(x + 7 + s * 4, -4 - lift);
      ctx.stroke();
      stoneCurl(ctx, x - 12, -24, 4, 1, col, sh);
    };
    hind(-8, -step, D[0], D[1], null);
    // ── 身體（直立的胸膛） ──
    ctx.save();
    ctx.translate(0, -10);
    ctx.rotate(lean);
    ctx.translate(0, 10);
    // 遠側的前腳（撐地或抬起）
    limb(ctx, (c) => { c.moveTo(-4, -58); c.quadraticCurveTo(-10, -40, -2 + step * 3, -6); }, 11, D[0]);
    A.ellipse(ctx, 0 + step * 3, -4, 6.5, 4, D[0], D[1], { lw: 2.1, hl: false });
    const bodyP = (c) => c.ellipse(0, -46, 20, 26, 0.12, 0, TAU);
    rimShape(ctx, bodyP, S[0], S[1], S[2], { cel: 5, rim: 2.2, lw: 2.8, inner: () => {
      // 石頭的斑點與地衣
      ctx.fillStyle = A.c('#9a958b');
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc(-16 + hash(i * 3.1) * 32, -68 + hash(i * 1.7) * 44, 0.8 + hash(i) * 1.2, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = A.c('#b8c070');
      [[-14, -30, 5, 3], [10, -62, 4, 2.5], [-8, -66, 3, 2]].forEach((q) => {
        ctx.beginPath();
        ctx.ellipse(q[0], q[1], q[2], q[3], 0.5, 0, TAU);
        ctx.fill();
      });
      // 胸肌的雕刻線
      ctx.strokeStyle = A.c(S[1]);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-6, -40);
      ctx.quadraticCurveTo(2, -34, 12, -40);
      ctx.moveTo(-4, -30);
      ctx.quadraticCurveTo(3, -26, 10, -30);
      ctx.stroke();
    } });
    // 後腳（近側）
    ctx.restore();
    hind(2, step, S[0], S[1], S[2]);
    ctx.save();
    ctx.translate(0, -10);
    ctx.rotate(lean);
    ctx.translate(0, 10);
    // ── 捲鬃（頭後一圈螺旋捲毛） ──
    const hx = 14;
    const hy = -76;
    ctx.save();
    ctx.translate(hx - 4, hy + 12);
    ctx.scale(1.14, 1.14);
    ctx.translate(-(hx - 4), -(hy + 12));
    const maneR = 21;
    for (let i = 0; i < 9; i++) {
      const a = PI * 0.45 + (i / 8) * PI * 1.2;
      stoneCurl(ctx, hx - 3 + Math.cos(a) * maneR, hy + 2 + Math.sin(a) * maneR * 0.95, 6.5 - Math.abs(i - 4) * 0.25, i % 2 ? 1 : -1, D[0], D[1]);
    }
    rimShape(ctx, (c) => c.ellipse(hx - 3, hy + 2, maneR - 2, maneR - 3, 0, 0, TAU), D[0], D[1], null, { cel: 3, lw: 2.4 });
    // 紅色前掛
    const bibP = (c) => { c.moveTo(-8, -64); c.quadraticCurveTo(10, -58, 26, -66); c.quadraticCurveTo(24, -50, 10, -44); c.quadraticCurveTo(-4, -48, -8, -64); c.closePath(); };
    rimShape(ctx, bibP, '#d8323a', '#9a1c24', '#ff8a8a', { cel: 2, rim: 1, lw: 2.2, inner: () => {
      ctx.strokeStyle = A.c('#ffd24a');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, -61);
      ctx.quadraticCurveTo(10, -55, 23, -62);
      ctx.stroke();
    } });
    // 耳朵（下垂）
    A.shape(ctx, (c) => { c.moveTo(hx - 8, hy - 8); c.quadraticCurveTo(hx - 18, hy - 6, hx - 14, hy + 4); c.quadraticCurveTo(hx - 10, hy - 2, hx - 5, hy - 4); c.closePath(); }, S[0], S[1], { lw: 2, shadeY: hy - 2 });
    // ── 頭 ──
    const roar = bash > 0.3 || wind || kind === 'angry';
    const headP = (c) => {
      c.moveTo(hx - 12, hy + 8);
      c.quadraticCurveTo(hx - 15, hy - 12, hx + 1, hy - 14);
      c.quadraticCurveTo(hx + 14, hy - 14, hx + 17, hy - 4);
      c.quadraticCurveTo(hx + 25, hy - 3, hx + 24, hy + 5);
      c.quadraticCurveTo(hx + 23, hy + 13, hx + 12, hy + 13);
      c.quadraticCurveTo(hx - 2, hy + 15, hx - 12, hy + 8);
      c.closePath();
    };
    rimShape(ctx, headP, S[0], S[1], S[2], { cel: 3, rim: 1.8, lw: 2.6, inner: () => {
      ctx.fillStyle = A.c('#b8c070');
      ctx.beginPath();
      ctx.ellipse(hx - 6, hy - 10, 4, 2.4, 0.3, 0, TAU);
      ctx.fill();
    } });
    // 張開的阿形口（大口、獠牙）
    A.shape(ctx, (c) => { c.moveTo(hx + 6, hy + 5); c.quadraticCurveTo(hx + 16, hy + (roar ? 15 : 11), hx + 24, hy + 6); c.quadraticCurveTo(hx + 15, hy + 7, hx + 6, hy + 5); c.closePath(); }, '#5a1a22', null, { lw: 1.8 });
    if (roar) A.shape(ctx, (c) => c.ellipse(hx + 15, hy + 10, 4, 2, 0, 0, TAU), '#c84a5a', null, { noStroke: true });
    fang(ctx, hx + 10, hy + 5.6, 3, false);
    fang(ctx, hx + 21, hy + 6, 3, false);
    fang(ctx, hx + 15, hy + (roar ? 12.5 : 9), 2.4, true);
    // 獅子鼻
    A.shape(ctx, (c) => c.ellipse(hx + 21, hy - 1, 4.2, 3.2, 0, 0, TAU), S[0], S[1], { lw: 1.8, shadeY: hy });
    A.ellipse(ctx, hx + 23, hy, 1.6, 1.3, '#4a4038', null, { noStroke: true, hl: false });
    // 捲眉＋金色的眼
    const ex = hx + 8;
    const ey = hy - 4;
    if (kind === 'normal' || kind === 'angry') {
      if (!dead) glowH(ctx, ex, ey, 9, '#ffd24a', 0.3 + bash * 0.5);
      A.shape(ctx, (c) => c.ellipse(ex, ey, 4, 3.8, 0, 0, TAU), '#fff4c0', null, { lw: 1.6 });
      ctx.fillStyle = A.c('#e8a82a');
      ctx.beginPath();
      ctx.arc(ex + 0.8, ey + 0.3, 2.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c('#2a1606');
      ctx.beginPath();
      ctx.arc(ex + 1, ey + 0.4, 1.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 0.4, ey - 1, 0.9, 0, TAU);
      ctx.fill();
    } else A.eye(ctx, ex, ey, 3, 3, kind);
    stoneCurl(ctx, ex - 1, ey - 6.5, 3.6, 1, S[0], S[1]);
    stoneCurl(ctx, ex + 5.5, ey - 5.5, 3, -1, S[0], S[1]);
    // 獨角
    rimShape(ctx, (c) => taper(c, qb(hx - 2, hy - 12, hx - 2, hy - 22, hx - 8, hy - 28), (q) => 7 * (1 - q * 0.85), 10), '#d8d2c4', '#9a948a', '#ffffff', { cel: 1.4, rim: 0.9, lw: 2 });
    // 臉頰的捲鬚
    stoneCurl(ctx, hx + 2, hy + 12, 4, -1, D[0], D[1]);
    ctx.restore();
    // ── 近側的前腳與石盾 ──
    let sx;
    let sy;
    let srot;
    if (bash > 0.5) {
      sx = 46;
      sy = -46;
      srot = 0.05;
    } else if (lowered) {
      sx = 26;
      sy = -24;
      srot = 0.5;
    } else if (wind) {
      sx = 24;
      sy = -52;
      srot = -0.15;
    } else {
      sx = 32;
      sy = -50 + Math.sin(t * 2) * 1;
      srot = -0.05;
    }
    limb(ctx, (c) => { c.moveTo(4, -60); c.quadraticCurveTo(sx - 12, sy - 6, sx - 6, sy + 2); }, 13, S[0]);
    stoneCurl(ctx, 4, -58, 5.5, 1, S[0], S[1]);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(srot);
    ctx.scale(0.55, 1);
    stoneShield(ctx, 25, dead ? 0 : guard ? 0.45 + 0.3 * Math.sin(t * 3) + bash * 0.4 : bash, t, dead);
    ctx.restore();
    // 盾擊的衝擊
    if (bash > 0.5) {
      speedLines(ctx, -20, -50, 50, 5, 18, t, 'rgba(230,225,210,0.9)');
      ctx.save();
      ctx.globalAlpha *= bash;
      ctx.strokeStyle = A.c('#fff2c0');
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(sx + 2, sy, 30, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    if (bash > 0.5) {
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i / 3) % 1;
        puff(ctx, -22 - q * 20, -3 - q * 6, 3 + q * 5, '#e8e4dc', (1 - q) * 0.8);
      }
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
    glowH(ctx, 0, 0, r * 3, '#ffb03a', 0.6);
    // 飄散的火星
    for (let i = 0; i < 4; i++) {
      const q = (t * 2.5 + i / 4 + seed * 0.1) % 1;
      const d = r * (0.8 + q * 2.4);
      const side = Math.sin(i * 2.1 + seed) * r * 0.6;
      ctx.save();
      ctx.globalAlpha *= (1 - q) * 0.9;
      sparkle(ctx, -Math.cos(a) * d - Math.sin(a) * side, -Math.sin(a) * d + Math.cos(a) * side, 2.6 * (1 - q * 0.5), i % 2 ? '#fff2a0' : '#ffb03a');
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
    tail(r * (1 + fl), r * 3, '#ff8a1e', sw);
    tail(r * 0.72, r * 2.2, '#ffc23a', sw * 0.7);
    tail(r * 0.45, r * 1.3, '#fff0a0', sw * 0.4);
    ctx.restore();
    ctx.fillStyle = A.c('#fffbe6');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, TAU);
    ctx.fill();
    // 狐火中心的小勾玉紋
    ctx.strokeStyle = A.c('#ff9a2a');
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
      ctx.strokeStyle = 'rgba(165,108,255,0.7)';
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
      glowH(ctx, 0, -h * 0.5, h * 0.9 + 10, '#a77cff', 0.5);
      const jaw = (side) => {
        ctx.save();
        ctx.translate(side * (4 + gap), 0);
        ctx.scale(side, 1);
        ctx.fillStyle = A.c('#170f2c');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(14, -h * 0.3, 10, -h);
        ctx.quadraticCurveTo(4, -h * 0.9, 0, -h * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = A.c('#a56cff');
        ctx.lineWidth = 1.8;
        ctx.stroke();
        // 牙
        ctx.fillStyle = '#efe6ff';
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
        ctx.fillStyle = '#e6d0ff';
        ctx.beginPath();
        ctx.ellipse(-3, -h - 4, 1.8, 1.1, 0, 0, TAU);
        ctx.ellipse(3, -h - 4, 1.8, 1.1, 0, 0, TAU);
        ctx.fill();
      }
      if (close > 0.8) {
        ctx.save();
        ctx.globalAlpha *= (close - 0.8) * 5;
        sparkle(ctx, 0, -h * 0.6, 9, '#d8c0ff');
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
    bg.addColorStop(0, 'rgba(190,160,255,0.35)');
    bg.addColorStop(1, 'rgba(190,160,255,0)');
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
      g.addColorStop(0, 'rgba(220,175,255,0.55)');
      g.addColorStop(0.6, 'rgba(200,140,240,0.3)');
      g.addColorStop(1, 'rgba(150,110,230,0)');
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
      ctx.fillStyle = 'rgba(255,230,255,0.25)';
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
      else crescent(ctx, x + br * 0.1, y, br * 0.45, '#ffe38a', 0.9);
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
    dreamwool(ctx) {
      glowH(ctx, 0, -3, 18, '#e6b8ff', 0.5);
      cloud(ctx, [[-8, 9, 5.5], [0, 7, 7], [8, 9, 5.5]], '#f2e2ff', '#c8a8f0', 2, 2);
      ctx.fillStyle = 'rgba(210,180,255,0.35)';
      ctx.beginPath();
      ctx.arc(0, -4, 11, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -4, 8.5, PI * 1.1, PI * 1.5);
      ctx.stroke();
      crescent(ctx, 1, -4, 5.5, '#ffe38a', 1.4);
      sparkle(ctx, -4, -9, 2, '#fff6c0');
      sparkle(ctx, 5, 1, 1.6, '#ffffff');
      zGlyph(ctx, 11, -14, 5, '#efe6ff');
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

  Object.assign(A.MONSTER_DRAW, { echoferret, crystalowl, avalanchehare, drumyak, shadowwolf, dreamsheep, silencefox, heartcedar, shieldbear });
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  Object.assign(A.PROJ_DRAW, { crystalorb, snowball, icicle, foxfire });
  // v1.4：九尾狐不再封技能，封印結界（sealfield）不再使用
  Object.assign(A.ZONE_DRAW, { echoghost, runewave, wolfshadow, sleepfog });
  if (A.ICON) Object.assign(A.ICON, ICON5);
})();
