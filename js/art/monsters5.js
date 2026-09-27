// 第四章「霜鈴雪峰」新怪物、投射物、地面區域與掉落素材圖示。
// 設計：雪地動物 ＋ 一個劍與魔法的概念（幻術、占卜水晶、雪崩符、符文戰鼓、影子魔法、睡眠咒、封印結界、生命水晶、聖騎士塔盾），
// 而且奇幻元素就是牠的身分：每隻都有自己的主色（深紫、午夜藍、暴風青、青銅赤紅、墨黑紫焰、薰衣草金月、朱紅金、墨綠紅寶石、鋼鐵金藍），
// 在白色的雪地背景上一眼就分得出來。風格同 monsters2～4：平塗、深棕描邊、右下月牙陰影、左上亮點；第四章體型約第一章的 1.45 倍。
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
  function ghostDraw(ctx, box, alpha, fn) {
    if (!(alpha > 0)) return;
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

  // ═════════════ 第四章：霜鈴雪峰 ═════════════

  // ── 殘影雪貂：深紫色的幻影貂，眼罩裡一雙青色鬼火眼、尾巴燒成青色靈焰，身後拖著青色殘影 ──
  const FER_FUR = ['#6c46cc', '#46298f'];
  const FER_BELLY = ['#dccfff', '#ab94ee'];
  const FER_MASK = '#261550';
  const FER_RGB = '95,240,255';
  const FERRET_BOX = [-84, -78, 156, 84];
  function ferretPose(ctx, m, o) {
    const t = m.t || 0;
    const st = o.stretch || 0;
    const cr = o.crouch || 0;
    const step = o.step || 0;
    const seed = o.seed || 0;
    const fur = FER_FUR;
    const by = -17 + cr * 4;
    const brx = 25 + st * 7;
    const bry = 11 - st * 1.5 + cr * 1.5;
    const bx = -5 - cr * 3;
    // 尾巴：紫色蓬尾，末端燒成青色靈焰
    ctx.save();
    ctx.translate(bx - brx + 5, by - 3);
    ctx.rotate(Math.sin(t * 4 + seed) * 0.12 + st * 0.55 - cr * 0.1);
    const tailP = (c) => {
      c.moveTo(4, -5);
      c.quadraticCurveTo(-8, -12, -18, -22);
      c.quadraticCurveTo(-27, -27, -26, -16);
      c.quadraticCurveTo(-22, -4, -8, 3);
      c.quadraticCurveTo(0, 6, 4, 5);
      c.closePath();
    };
    withClip(ctx, tailP, fur[0], fur[1], { cel: [2.5, 2.5] }, () => {
      A.shape(ctx, (c) => {
        c.moveTo(-30, -30);
        c.lineTo(-10, -30);
        c.quadraticCurveTo(-18, -14, -26, -6);
        c.lineTo(-30, -6);
        c.closePath();
      }, '#57e6ff', '#23aede', { noStroke: true, cel: [2, 2] });
    }, 2.6);
    spiritFlame(ctx, -22, -20, 5, 17 + st * 6, -6 - st * 5 + Math.sin(t * 9 + seed) * 2.5, '#5ff0ff', '#effeff', o.echo ? null : FER_RGB, 0.95);
    ctx.restore();

    // 腳（遠側先畫）
    const leg = (x, s, col, front) => {
      const reach = st * (front ? 9 : -9);
      const lift = Math.max(0, s) * 4;
      const fx = x + s * 4 + reach;
      limb(ctx, (c) => { c.moveTo(x, by + 4); c.lineTo(fx, -2.5 - lift); }, 7.5, col);
      A.ellipse(ctx, fx + 1.5, -2.2 - lift, 4.2, 2.6, FER_MASK, null, { lw: 2, hl: false });
    };
    leg(bx - brx * 0.55, -step, fur[1], false);
    leg(bx + brx * 0.6, step, fur[1], true);

    // 身體＋淡紫肚子
    const bodyP = (c) => c.ellipse(bx, by, brx, bry, -0.05 - st * 0.04, 0, TAU);
    withClip(ctx, bodyP, fur[0], fur[1], { cel: [3, 3], hl: [bx - brx * 0.35, by - bry * 0.5, brx * 0.28, 2.6] }, () => {
      A.shape(ctx, (c) => c.ellipse(bx + 6, by + bry * 0.95, brx * 0.75, bry * 0.55, 0, 0, TAU), FER_BELLY[0], FER_BELLY[1], { noStroke: true, shadeY: by + bry * 1.15 });
    });
    // 身上的青色幻術紋
    const rg = 0.5 + 0.5 * Math.sin(t * 5 + seed);
    glowStroke(ctx, (c) => {
      c.moveTo(bx - 14, by - 1);
      c.quadraticCurveTo(bx - 10, by - 8, bx - 4, by - 4.5);
      c.quadraticCurveTo(bx, by - 1, bx + 5, by - 6);
      c.moveTo(bx + 9, by - 7);
      c.quadraticCurveTo(bx + 13, by - 9, bx + 16, by - 5);
    }, '#8ff7ff', 1.8, o.echo ? null : FER_RGB, 0.6 + rg * 0.4 + st * 0.4);
    leg(bx - brx * 0.35, step, fur[0], false);
    leg(bx + brx * 0.78, -step, fur[0], true);

    // 頭
    const hx = bx + brx + 4 + st * 2;
    const hy = by - 9 - cr * 2 + st * 3;
    // 耳朵（內側發青光）
    A.ellipse(ctx, hx - 6, hy - 9.5, 5.2, 5.4, fur[1], null, { lw: 2.2, hl: false });
    A.ellipse(ctx, hx - 6, hy - 9.5, 2.4, 2.6, '#5ff0ff', null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx + 2.5, hy - 11.5, 5.2, 5.4, fur[0], fur[1], { lw: 2.2, hl: false });
    A.ellipse(ctx, hx + 2.5, hy - 11.5, 2.4, 2.6, '#5ff0ff', null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx, hy, 12, 10.5, fur[0], fur[1], { cel: [2.5, 2.5], hl: [hx - 5, hy - 5, 3.5, 2] });
    // 口鼻
    const bite = o.bite;
    const jaw = bite ? 5 : 0;
    const my = hy + 1.5 - (bite ? 1.5 : 0);
    if (bite) {
      A.shape(ctx, (c) => {
        c.moveTo(hx + 6, hy + 3);
        c.lineTo(hx + 19, hy + 1);
        c.lineTo(hx + 17, hy + 4 + jaw);
        c.quadraticCurveTo(hx + 10, hy + 8 + jaw, hx + 5, hy + 6);
        c.closePath();
      }, '#4a1450', null, { lw: 2 });
      fang(ctx, hx + 16, hy + 1.6, 3.2, false);
      fang(ctx, hx + 12, hy + 1.8, 2.6, false);
      A.ellipse(ctx, hx + 13, hy + 6 + jaw * 0.6, 5, 2.4, FER_BELLY[0], null, { lw: 2, hl: false });
    }
    A.shape(ctx, (c) => c.ellipse(hx + 9, my, 8, 5.2, -0.08, 0, TAU), '#ece4ff', '#c2b2f2', { noStroke: true, shadeY: hy + 4.5 });
    arcStroke(ctx, hx + 9, my, 8, 5.2, -1.9, 1.7, 2.6);
    // 深色眼罩（貂的招牌花紋）
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(hx, hy, 12, 10.5, 0, 0, TAU);
    ctx.moveTo(hx + 17, my);
    ctx.ellipse(hx + 9, my, 8, 5.2, -0.08, 0, TAU);
    ctx.clip();
    ctx.fillStyle = A.c(FER_MASK);
    ctx.beginPath();
    ctx.ellipse(hx + 4.5, hy - 3, 11.5, 4.8, -0.06, 0, TAU);
    ctx.fill();
    ctx.restore();
    A.ellipse(ctx, hx + 16.5, hy - 0.5 - (bite ? 1.5 : 0), 2.4, 2, '#2a1840', null, { lw: 1.2, hl: false });
    glowEyes(ctx, hx + 1, hy - 3, 7.5, 2.6, 3.1, m, '#86f8ff', FER_RGB, undefined, { noGlow: !!o.echo, pupil: '#0e1c38', ga: 0.7 });
    if (!bite) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(hx + 12, hy + 3.5, 1.8, 0.1 * PI, 0.9 * PI);
      ctx.arc(hx + 15.6, hy + 3.5, 1.8, 0.1 * PI, 0.9 * PI);
      ctx.stroke();
    }
    // 鬍鬚（青色靈光）
    ctx.strokeStyle = A.c('#9ff6ff');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx + 12, hy + 1);
    ctx.lineTo(hx + 23, hy - 2.5);
    ctx.moveTo(hx + 12, hy + 2.5);
    ctx.lineTo(hx + 23, hy + 3.5);
    ctx.stroke();
    // 額頭的幻術寶石（大顆、青色）
    const gx = hx + 2;
    const gy = hy - 9.5;
    const pul = 0.5 + 0.5 * Math.sin(t * 5 + seed);
    if (!o.echo) glow(ctx, gx, gy, 12 + pul * 5 + st * 6, FER_RGB, 0.5 + st * 0.35);
    A.shape(ctx, (c) => poly(c, [[gx, gy - 6], [gx + 4.2, gy - 0.5], [gx, gy + 4.5], [gx - 4.2, gy - 0.5]]), '#6ff4ff', '#20a8dc', { lw: 1.8, shadeY: gy - 0.5 });
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(gx - 1.6, gy - 2.6);
    ctx.lineTo(gx, gy - 4.4);
    ctx.lineTo(gx, gy - 0.8);
    ctx.closePath();
    ctx.fill();
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
    const spd = dash ? 24 : 16;
    const step = walk || dash ? Math.sin(t * spd) : 0;
    const pose = { step, stretch: dash || strike ? 1 : 0, crouch: wind ? 1 : 0, bite: dash || strike };
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    const hop = dash ? 0 : walk ? -Math.abs(Math.sin(t * spd)) * 2.5 : Math.sin(t * 3) * 0.6;
    // 青色殘影（越後面越淡）
    const n = dash ? 3 : walk ? 2 : 1;
    for (let i = n; i >= 1; i--) {
      const lag = dash ? i * 18 : walk ? i * 12 : 7 + Math.sin(t * 2) * 3;
      const a = (dash ? 0.45 : walk ? 0.34 : 0.26) * (1 - (i - 1) / (n + 0.6));
      ctx.save();
      ctx.translate(-lag, hop * 0.6 - (walk || dash ? Math.sin(t * spd - i) * 1 : Math.sin(t * 2.5) * 1.5));
      ghostDraw(ctx, FERRET_BOX, a * 1.6, (g) => withTint('#3ee6ff', 0.7, () => ferretPose(g, m, Object.assign({}, pose, { step: walk || dash ? Math.sin(t * spd - i * 0.9) : 0, echo: true, seed: i }))));
      ctx.restore();
    }
    ctx.translate(0, hop);
    if (dash) speedLines(ctx, -36, -20, 26, 3, 14, t, 'rgba(110,240,255,0.85)');
    ferretPose(ctx, m, pose);
    ctx.restore();
  }

  // ── 水晶球雪鴞：午夜藍的星紋貓頭鷹，捧著一顆比頭還大、裡面星雲漩渦轉個不停的占卜水晶球 ──
  function crystalowl(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const cast = clamp(Math.max(num(fx.cast, 0), wind ? 0.6 : 0, strike ? 1 : 0), 0, 1);
    const moving = Math.abs(m.vx || 0) > 5;
    const fe = ['#34489e', '#212d74'];
    const wg = ['#2a3a8a', '#19235c'];
    const disc = ['#c8d4ff', '#98a8e8'];
    ctx.save();
    if (hurt) ctx.rotate(-0.1);
    if (moving) ctx.rotate(0.06);
    const bob = Math.sin(t * 3) * 2;
    const cy = -40 + bob;
    const flap = Math.sin(t * (moving ? 14 : 5));
    const br = 17 + cast * 2;
    const bx = 17;
    const byy = cy + 13 - cast * 6;
    glow(ctx, bx, byy, 30 + cast * 30, '190,110,255', 0.35 + cast * 0.5);
    // 水晶球外圍的金色符文環（前後兩半分開畫，才會繞著球轉）
    const ringA = 0.45 + cast * 0.55;
    const ringR = br + 8 + cast * 5;
    const ringRot = -0.35 + Math.sin(t * 0.8) * 0.08;
    const ring = (front) => {
      ctx.save();
      ctx.translate(bx, byy);
      ctx.rotate(ringRot);
      ctx.globalAlpha *= ringA;
      ctx.lineCap = 'round';
      const a0 = front ? 0 : PI;
      const a1 = front ? PI : TAU;
      ctx.strokeStyle = 'rgba(255,215,110,0.35)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringR, ringR * 0.3, 0, a0, a1);
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffd24a');
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringR, ringR * 0.3, 0, a0, a1);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (t * (1 + cast * 2) + i * (TAU / 4)) % TAU;
        if (a < PI !== front) continue;
        sparkle(ctx, Math.cos(a) * ringR, Math.sin(a) * ringR * 0.3, 2.4 + cast, '#fff2a0');
      }
      ctx.restore();
    };
    ring(false);

    // 遠側翅膀
    ctx.save();
    ctx.translate(-14, cy - 8);
    ctx.rotate(-0.25 - cast * 0.7 + flap * 0.12);
    A.shape(ctx, (c) => {
      c.moveTo(0, -4);
      c.quadraticCurveTo(-18, -2, -22, 20);
      c.lineTo(-17, 18);
      c.lineTo(-16, 25);
      c.lineTo(-10, 21);
      c.lineTo(-7, 27);
      c.quadraticCurveTo(4, 18, 6, 4);
      c.closePath();
    }, wg[1], '#121a48', { cel: [2, 2], lw: 2.4 });
    ctx.restore();

    // 金色腳爪
    [-7, 5].forEach((x) => {
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) {
        ctx.moveTo(x, cy + 26);
        ctx.lineTo(x + k * 3 + 1, cy + 33);
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffcf5a');
      ctx.lineWidth = 1.6;
      ctx.stroke();
      A.ellipse(ctx, x, cy + 26, 4.5, 3.5, fe[0], fe[1], { lw: 2, hl: false });
    });

    // 角羽（高高豎起，尖端金色）
    A.shape(ctx, (c) => poly(c, [[-17, cy - 21], [-26, cy - 47], [-4, cy - 29]]), fe[1], null, { lw: 2.2 });
    A.shape(ctx, (c) => poly(c, [[6, cy - 29], [19, cy - 49], [20, cy - 21]]), fe[0], fe[1], { lw: 2.2, shadeY: cy - 30 });
    A.shape(ctx, (c) => poly(c, [[-24, cy - 42], [-26, cy - 47], [-21, cy - 44]]), '#ffd24a', null, { lw: 1.2 });
    A.shape(ctx, (c) => poly(c, [[17, cy - 45], [19, cy - 49], [19.6, cy - 43]]), '#ffd24a', null, { lw: 1.2 });

    // 身體（蛋形）＋星紋肚子
    const bodyP = (c) => {
      c.moveTo(0, cy - 32);
      c.bezierCurveTo(18, cy - 32, 26, cy - 16, 25, cy + 2);
      c.bezierCurveTo(24, cy + 20, 14, cy + 30, 0, cy + 30);
      c.bezierCurveTo(-16, cy + 30, -25, cy + 18, -25, cy);
      c.bezierCurveTo(-25, cy - 18, -17, cy - 32, 0, cy - 32);
      c.closePath();
    };
    withClip(ctx, bodyP, fe[0], fe[1], { cel: [4, 4], hl: [-12, cy - 20, 5, 3] }, () => {
      A.shape(ctx, (c) => c.ellipse(-3, cy + 15, 17, 17, 0, 0, TAU), '#4c64c8', '#3a50ac', { noStroke: true, shadeY: cy + 23 });
      [[-15, cy + 1, 2.4], [-7, cy + 9, 1.9], [-17, cy + 14, 1.7], [-2, cy + 20, 2.2], [-11, cy + 23, 1.6], [-20, cy - 9, 1.7], [4, cy + 26, 1.5]].forEach((p, i) => sparkle(ctx, p[0], p[1], p[2] * (0.85 + 0.25 * Math.sin(t * 3 + i * 1.7)), i % 2 ? '#fff2a0' : '#bfe8ff'));
    });

    // 臉盤
    A.shape(ctx, (c) => {
      c.moveTo(6, cy - 4);
      c.bezierCurveTo(-8, cy - 2, -12, cy - 16, -8, cy - 23);
      c.quadraticCurveTo(-2, cy - 27, 6, cy - 22);
      c.quadraticCurveTo(14, cy - 28, 20, cy - 23);
      c.bezierCurveTo(25, cy - 15, 20, cy - 2, 6, cy - 4);
      c.closePath();
    }, disc[0], disc[1], { lw: 2, shadeY: cy - 8 });
    // 額頭的金色彎月印
    const mg = 0.5 + cast * 0.5;
    glow(ctx, 6, cy - 27, 9, '255,210,90', 0.35 + mg * 0.4);
    A.shape(ctx, (c) => {
      c.arc(6, cy - 27, 3.6, -PI * 0.1, PI * 1.1, false);
      c.arc(6, cy - 28.5, 3, PI * 1.05, -PI * 0.05, true);
      c.closePath();
    }, '#ffd24a', null, { lw: 1.3 });
    // 發光的金色大眼
    const k = eyeKind(m);
    const iris = mixq('#ffc83a', '#fff6c0', cast);
    glowEye(ctx, -1, cy - 15, 5.6, 5.6, k, iris, '255,200,70', { ga: 0.2 + cast * 0.35, pupil: '#1a1230' });
    glowEye(ctx, 13, cy - 15.5, 5.2, 5.2, k, iris, '255,200,70', { ga: 0.2 + cast * 0.35, pupil: '#1a1230' });
    // 喙
    A.shape(ctx, (c) => poly(c, [[3.5, cy - 11], [9.5, cy - 11], [6.5, cy - 5]]), '#ffb52e', '#d98a1a', { lw: 1.8, shadeY: cy - 8 });

    // 近側翅膀：收在身側，翅尖彎到前面托住水晶球
    ctx.save();
    ctx.translate(-4, cy - 8);
    ctx.rotate(-cast * 0.12 + (moving ? flap * 0.08 : 0));
    A.shape(ctx, (c) => {
      c.moveTo(0, -4);
      c.quadraticCurveTo(-16, 8, -10, 26);
      c.quadraticCurveTo(0, 36, 22, 32);
      c.lineTo(19, 29);
      c.lineTo(24, 27);
      c.quadraticCurveTo(8, 26, 4, 14);
      c.quadraticCurveTo(2, 4, 6, -2);
      c.closePath();
    }, wg[0], wg[1], { cel: [2.5, 2.5], lw: 2.4, hl: [-6, 8, 2.5, 5] });
    ctx.strokeStyle = A.c('#7fd8ff');
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 12);
    ctx.quadraticCurveTo(-6, 20, -1, 25);
    ctx.moveTo(-3, 10);
    ctx.quadraticCurveTo(-1, 18, 4, 22);
    ctx.stroke();
    ctx.restore();

    // 大水晶球：紫色星雲，兩條旋臂（洋紅／青）一直旋轉
    A.shape(ctx, (c) => c.arc(bx, byy, br, 0, TAU), '#4b2ab4', '#311b86', { cel: [3, 3], lw: 2.6 });
    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, byy, br - 1.2, 0, TAU);
    ctx.clip();
    glow(ctx, bx + 3, byy + 3, br * 1.05, '255,90,210', 0.6 + cast * 0.3);
    glow(ctx, bx - 5, byy - 4, br * 0.85, '90,235,255', 0.55 + cast * 0.3);
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 2; arm++) {
      ctx.strokeStyle = arm ? 'rgba(170,250,255,' + (0.7 + cast * 0.3).toFixed(2) + ')' : 'rgba(255,175,240,' + (0.7 + cast * 0.3).toFixed(2) + ')';
      ctx.lineWidth = 2.4 - arm * 0.5;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const q = i / 24;
        const a = t * (2 + cast * 3) + arm * PI + q * PI * 2.2;
        const r = br * (0.08 + q * 0.82);
        const x = bx + Math.cos(a) * r;
        const y = byy + Math.sin(a) * r * 0.75;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    glow(ctx, bx, byy, 6 + cast * 5, '255,255,255', 0.85);
    for (let i = 0; i < 4; i++) {
      const a = t * 1.5 + i * 1.6;
      const d = br * (0.35 + (i % 2) * 0.3);
      sparkle(ctx, bx + Math.cos(a) * d, byy + Math.sin(a) * d * 0.8, 1.6 + cast * 1.2 + (i % 2) * 0.6, i % 2 ? '#ffffff' : '#fff2a0');
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(bx - br * 0.42, byy - br * 0.45, br * 0.28, br * 0.14, -0.7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(225,205,255,0.7)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(bx, byy, br - 3.5, PI * 0.15, PI * 0.6);
    ctx.stroke();
    // 托住球底的翅尖
    A.ellipse(ctx, bx - br * 0.55, byy + br * 0.78, 9, 4.6, wg[0], wg[1], { rot: -0.45, lw: 2.2, hl: false });
    ring(true);
    // 外面的星光
    const ns = 3 + Math.round(cast * 4);
    for (let i = 0; i < ns; i++) {
      const q = (t * (0.6 + cast) + i / ns) % 1;
      const a = i * 2.4 + t * 0.4;
      const d = br + 4 + q * (12 + cast * 14);
      ctx.save();
      ctx.globalAlpha *= Math.sin(q * PI);
      sparkle(ctx, bx + Math.cos(a) * d, byy + Math.sin(a) * d * 0.9, 2.3 + cast * 1.6, i % 3 === 0 ? '#ff9cf0' : i % 2 ? '#fff6b0' : '#a8f4ff');
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 雪崩符兔：暴風青色的雪兔，全身刻著會發光的赤紅符文，耳朵纏著金帶與赤紅符紙 ──
  function avalanchehare(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const kick = clamp(Math.max(num(fx.kick, 0), strike ? 1 : 0), 0, 1);
    const fur = ['#2f93a4', '#1d6677'];
    const belly = ['#d4f7f2', '#98d8d2'];
    const pink = '#ffb2c4';
    const RUNE = '#ff2e58';
    const RGB = '255,45,85';
    const gA = clamp(0.4 + kick * 0.6 + (wind ? 0.35 : 0) + Math.sin(t * 4) * 0.1, 0, 1.3);
    const runeCol = mixq(RUNE, '#ffe6a0', kick * 0.7);
    const hopQ = walk ? Math.abs(Math.sin(t * 8)) : 0;
    ctx.save();
    ctx.translate(0, -hopQ * 9);
    if (hurt) ctx.rotate(-0.1);
    ctx.rotate(-kick * 0.22 + (wind ? 0.08 : 0) + (walk ? (hopQ - 0.5) * 0.08 : 0));
    const crouch = wind ? 3 : 0;
    const cy = -22 + crouch;

    // 尾巴（白色蓬球）
    A.ellipse(ctx, -26, cy - 3, 7, 6.5, '#effffc', '#b4e2dc', { lw: 2.4, hl: false, cel: [1.5, 1.5] });
    // 遠側耳朵
    const earSway = Math.sin(t * 3) * 0.06 + (walk ? (hopQ - 0.5) * 0.2 : 0) - kick * 0.15;
    const ear = (x, y, rot, len, back) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      A.shape(ctx, (c) => c.ellipse(0, -len / 2, 5.8, len / 2, 0, 0, TAU), back ? fur[1] : fur[0], back ? '#134a58' : fur[1], { cel: [1.8, 1.8], lw: 2.4 });
      A.shape(ctx, (c) => c.ellipse(0.5, -len / 2 + 1, 2.7, len / 2 - 4, 0, 0, TAU), pink, null, { noStroke: true });
      ctx.restore();
    };
    ear(8, cy - 18, -0.5 + earSway, 28, true);

    const hipX = -10;
    const hipY = cy + 8;
    const footBase = [-6, -3];
    const footKick = [26, -12];
    const fxp = footBase[0] + (footKick[0] - footBase[0]) * kick;
    const fyp = footBase[1] + (footKick[1] - footBase[1]) * kick;
    const walkStep = walk ? Math.sin(t * 8) * 3 : 0;
    // 身體＋淺色肚子
    withClip(ctx, (c) => c.ellipse(-5, cy, 20, 17, 0, 0, TAU), fur[0], fur[1], { cel: [3.5, 3.5], hl: [-13, cy - 8, 5, 3] }, () => {
      A.shape(ctx, (c) => c.ellipse(5, cy + 10, 14, 10, 0, 0, TAU), belly[0], belly[1], { noStroke: true, shadeY: cy + 14 });
    });
    // 背上的符文帶
    glowStroke(ctx, (c) => {
      c.moveTo(-18, cy - 10);
      c.lineTo(-14, cy - 14);
      c.lineTo(-10, cy - 10);
      c.lineTo(-6, cy - 14);
      c.lineTo(-2, cy - 10);
    }, runeCol, 1.8, RGB, gA);
    // 前腳
    A.ellipse(ctx, 11 + walkStep * 0.5, -5 + crouch * 0.3, 4.6, 5.5, fur[0], fur[1], { lw: 2.2, hl: false });
    // 大腿（刻著圓形符文）與腳掌
    if (kick > 0.05) {
      limb(ctx, (c) => { c.moveTo(hipX, hipY); c.lineTo(fxp - 6, fyp); }, 11, fur[0]);
    }
    A.ellipse(ctx, hipX, hipY - 2, 11, 12, fur[0], fur[1], { cel: [2.5, 2.5], hl: false });
    glow(ctx, hipX, hipY - 2, 13 + kick * 10, RGB, gA * 0.6);
    glowStroke(ctx, (c) => c.arc(hipX, hipY - 2, 7, 0, TAU), runeCol, 1.5, RGB, gA);
    rune(ctx, hipX, hipY - 2, 4, runeCol, 3, 1.8, RGB, gA);
    ctx.save();
    ctx.translate(fxp - walkStep, fyp);
    ctx.rotate(-kick * 0.35);
    A.shape(ctx, (c) => c.ellipse(0, -1, 14, 5.2, 0, 0, TAU), fur[0], fur[1], { shadeY: 0.5, lw: 2.4 });
    ctx.fillStyle = A.c(belly[0]);
    [[6, -2], [9.5, -1.2]].forEach((p) => {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 1.4, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
    if (kick > 0.3) {
      // 踢出去的瞬間：赤紅符文爆閃＋雪塊
      glow(ctx, fxp + 12, fyp - 2, 22 * kick, RGB, kick * 0.7);
      ctx.save();
      ctx.globalAlpha *= kick;
      ctx.strokeStyle = 'rgba(255,90,110,0.9)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(fxp + 12, fyp - 2, 8 + kick * 8, -1.3, 1.3);
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        const a = -0.9 + i * 0.45;
        const d = 12 + kick * 8 + (i % 2) * 4;
        puff(ctx, fxp + 8 + Math.cos(a) * d, fyp + Math.sin(a) * d * 0.7, 3 + (i % 2), '#ffffff', kick * 0.9);
      }
      sparkle(ctx, fxp + 18, fyp - 9, 4.5, '#ffd0a0');
    }
    if (wind) snowDust(ctx, -14, 0, t, 0.9);

    // 頭
    const hx = 14;
    const hy = cy - 14 + crouch * 0.3;
    withClip(ctx, (c) => c.ellipse(hx, hy, 13, 11.5, 0, 0, TAU), fur[0], fur[1], { cel: [2.5, 2.5], hl: [hx - 6, hy - 5, 3.5, 2.2] }, () => {
      A.shape(ctx, (c) => c.ellipse(hx + 8, hy + 6, 9, 6.5, 0, 0, TAU), belly[0], belly[1], { noStroke: true, shadeY: hy + 9 });
    });
    // 近側耳朵＋金色纏帶
    const er = -0.2 + earSway * 1.3;
    ear(hx - 2, hy - 8, er, 30, false);
    ctx.save();
    ctx.translate(hx - 2, hy - 8);
    ctx.rotate(er);
    glow(ctx, 0, -15, 12, RGB, gA * 0.45);
    A.shape(ctx, (c) => A.roundRect(c, -7, -19, 14, 8, 1.5), '#ffd24a', '#d99a2a', { lw: 2, shadeY: -13 });
    rune(ctx, 0, -15, 2.8, runeCol, 4, 1.4);
    ctx.restore();
    // 飄動的赤紅符紙帶
    const flut = Math.sin(t * 7) * 0.2 + (walk ? 0.3 : 0) + kick * 0.3;
    const earTip = [hx - 2 + Math.sin(er) * 15, hy - 8 - Math.cos(er) * 15];
    talisman(ctx, earTip[0] - 12, earTip[1] + 5, 6.5, 15, -1.25 - flut, '#d8283e', '#ffd24a', RGB, gA * 0.45, 1);
    // 額頭符文
    rune(ctx, hx - 2, hy - 6, 2.8, runeCol, 0, 1.4, RGB, gA);
    // 臉：赤紅色的發光眼睛
    glowEyes(ctx, hx + 2, hy - 1.5, 7, 2.6, 3.3, m, '#ff5a7a', RGB, kick > 0.3 && eyeKind(m) === 'normal' ? 'angry' : undefined, { pupil: '#3a0818', ga: 0.4 + kick * 0.4 });
    A.shape(ctx, (c) => poly(c, [[hx + 11.5, hy + 2], [hx + 14.5, hy + 2], [hx + 13, hy + 4]]), '#ff8aa8', null, { lw: 1.2 });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + 13, hy + 4);
    ctx.lineTo(hx + 13, hy + 5.5);
    ctx.stroke();
    A.shape(ctx, (c) => c.rect(hx + 11.4, hy + 5.5, 3.2, 3.2), '#ffffff', null, { lw: 1.2 });
    A.blush(ctx, hx + 3, hy + 4.5, 2.6);
    ctx.restore();
  }

  // ── 戰鼓犛牛：青銅色長毛的戰爭犛牛，披著赤紅戰毯、臉上畫戰紋；側掛青銅戰鼓，鼓面是赤紅皮＋金色符文，用尾巴捲著金槌擂鼓 ──
  function drumyak(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const beat = clamp(Math.max(num(fx.beat, 0), strike ? 1 : 0), 0, 1);
    const fur = ['#8e5a32', '#5e381c'];
    const face = ['#6a4026', '#4a2a16'];
    const bang = ['#a8724a', '#7a4c2c'];
    const horn = ['#fff0cc', '#d6bc88'];
    const rim = ['#e2a444', '#a86a24'];
    const skin = ['#c8283c', '#8c1828'];
    const blanket = ['#c8283c', '#901a2a'];
    const gold = ['#ffd24a', '#d99a2a'];
    const RGB = '255,190,70';
    const step = walk ? Math.sin(t * 8) : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    const bob = walk ? -Math.abs(step) * 2 : Math.sin(t * 2) * 0.8;
    const squash = beat * 3;
    const cy = -44 + bob + squash;

    // 腳（遠側）
    const leg = (x, s, col) => {
      const lift = Math.max(0, s) * 4;
      limb(ctx, (c) => { c.moveTo(x, cy + 10); c.lineTo(x + s * 3, -5 - lift); }, 12, col);
      hoof(ctx, x + s * 3, -lift, 11, 6, '#2e2220');
    };
    leg(-24, -step, fur[1]);
    leg(18, step, fur[1]);

    // 身體：長毛下緣是一排鬚鬚；背上披赤紅戰毯
    const bodyP = (c) => {
      c.moveTo(-44, cy + 8);
      c.bezierCurveTo(-50, cy - 16, -34, cy - 34, -10, cy - 33);
      c.bezierCurveTo(12, cy - 32, 30, cy - 24, 34, cy - 8);
      c.lineTo(34, cy + 16);
      const n = 12;
      for (let i = 0; i <= n; i++) {
        const x = 34 - (i / n) * 78;
        const y = cy + 22 + (i % 2 ? -5 : 1) + Math.sin(t * 3 + i) * (walk ? 1.2 : 0.4);
        c.lineTo(x, y);
      }
      c.closePath();
    };
    withClip(ctx, bodyP, fur[0], fur[1], { cel: [5, 5], hl: [-24, cy - 22, 9, 4] }, () => {
      // 毛流
      ctx.strokeStyle = A.c('#b07a4c');
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const x = -38 + i * 8.5;
        ctx.moveTo(x, cy + 4 + (i % 2) * 4);
        ctx.quadraticCurveTo(x + 2, cy + 12, x - 1, cy + 19);
      }
      ctx.stroke();
      // 戰毯
      const bl = (c) => {
        c.moveTo(-40, cy - 40);
        c.lineTo(22, cy - 40);
        c.lineTo(22, cy - 12);
        for (let i = 0; i <= 6; i++) {
          const x = 22 - i * 10;
          c.lineTo(x - 5, cy - 5);
          c.lineTo(x - 10, cy - 12);
        }
        c.lineTo(-40, cy - 12);
        c.closePath();
      };
      A.shape(ctx, bl, blanket[0], blanket[1], { lw: 2.2, shadeY: cy - 14 });
      ctx.strokeStyle = A.c(gold[0]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-40, cy - 15);
      ctx.lineTo(19, cy - 15);
      ctx.stroke();
      for (let i = 0; i <= 6; i++) A.ellipse(ctx, 17 - i * 10, cy - 5, 1.8, 1.8, gold[0], null, { lw: 1, hl: false });
      rune(ctx, -30, cy - 24, 4.5, gold[0], 3, 1.8, RGB, 0.5 + beat * 0.5);
    });
    // 近側腳
    leg(-32, step, fur[0]);
    leg(8, -step, fur[0]);

    // 鼓的背帶（金邊赤紅帶）
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-18, cy - 12);
    ctx.quadraticCurveTo(-10, cy - 34, 4, cy - 31);
    ctx.stroke();
    ctx.strokeStyle = A.c(gold[0]);
    ctx.lineWidth = 3.4;
    ctx.stroke();

    // 戰鼓（側掛，鼓面朝外）
    const dx = -12;
    const dy = cy + 2;
    const dr = 17;
    const hit = beat;
    const pulse = 0.4 + 0.25 * Math.sin(t * 3) + hit * 0.8;
    glow(ctx, dx, dy, dr + 10 + hit * 22, RGB, 0.3 + hit * 0.6);
    A.shape(ctx, (c) => c.ellipse(dx + 3, dy + 3, dr, dr, 0, 0, TAU), rim[1], '#7a4a18', { cel: [2.5, 2.5] });
    A.shape(ctx, (c) => c.ellipse(dx, dy, dr, dr, 0, 0, TAU), rim[0], rim[1], { cel: [2, 2], hl: false });
    // 鼓繩（金色 Z 字）＋鉚釘
    ctx.strokeStyle = A.c('#fff0b0');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * TAU;
      const r = i % 2 ? dr - 1.5 : dr - 5;
      const x = dx + Math.cos(a) * r;
      const y = dy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    const sk = 1 - hit * 0.06;
    A.shape(ctx, (c) => c.ellipse(dx, dy + hit * 0.8, 11.5 * sk + 0.6, 11.5 * sk, 0, 0, TAU), skin[0], skin[1], { cel: [1.8, 1.8], lw: 2.2, hl: [dx - 4, dy - 5, 3, 1.8] });
    glow(ctx, dx, dy + hit * 0.8, 12, RGB, pulse * 0.7);
    glowStroke(ctx, (c) => c.arc(dx, dy + hit * 0.8, 8.5, 0, TAU), mixq(gold[0], '#fff8d8', hit), 1.2, RGB, pulse);
    rune(ctx, dx, dy + hit * 0.8, 5.5, mixq(gold[0], '#fffbe6', hit), 0, 2.2, RGB, pulse);
    // 擂下去的衝擊
    if (hit > 0.2) {
      ctx.save();
      ctx.globalAlpha *= hit;
      ctx.strokeStyle = 'rgba(255,200,90,0.9)';
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(dx, dy, dr + 5 + i * 7 + (1 - hit) * 8, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 頭
    const hx = 40;
    const hy = cy + 6 + (wind ? 3 : 0) - beat * 2;
    // 遠側角
    A.shape(ctx, (c) => {
      c.moveTo(hx - 8, hy - 11);
      c.quadraticCurveTo(hx - 20, hy - 14, hx - 20, hy - 26);
      c.quadraticCurveTo(hx - 18, hy - 34, hx - 14, hy - 36);
      c.quadraticCurveTo(hx - 15, hy - 26, hx - 5, hy - 17);
      c.closePath();
    }, horn[1], '#b09c78', { lw: 2.2, shadeY: hy - 20 });
    A.shape(ctx, (c) => poly(c, [[hx - 18, hy - 29], [hx - 14, hy - 36], [hx - 14.5, hy - 28]]), rim[0], null, { lw: 1.4 });
    // 耳
    A.ellipse(ctx, hx - 12, hy - 5, 6, 3.2, face[1], null, { rot: 0.4, lw: 2, hl: false });
    // 臉
    A.shape(ctx, (c) => {
      c.moveTo(hx - 10, hy - 12);
      c.bezierCurveTo(hx - 4, hy - 20, hx + 10, hy - 18, hx + 13, hy - 6);
      c.bezierCurveTo(hx + 15, hy + 4, hx + 14, hy + 14, hx + 6, hy + 16);
      c.bezierCurveTo(hx - 4, hy + 18, hx - 12, hy + 8, hx - 10, hy - 12);
      c.closePath();
    }, face[0], face[1], { cel: [2.5, 2.5] });
    // 戰紋（赤紅＋金）
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.c('#e8303e');
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy + 2);
    ctx.lineTo(hx - 3, hy + 7);
    ctx.moveTo(hx - 2, hy + 1.5);
    ctx.lineTo(hx + 1, hy + 6.5);
    ctx.stroke();
    // 鼻口
    A.ellipse(ctx, hx + 6, hy + 10, 9, 6.5, '#c49270', '#9c6e4e', { lw: 2.2, hl: false, shadeY: hy + 12 });
    ctx.fillStyle = A.c('#3a2218');
    [[hx + 3, hy + 9], [hx + 10, hy + 8.5]].forEach((p) => {
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], 1.5, 2, 0, 0, TAU);
      ctx.fill();
    });
    // 金鼻環
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.arc(hx + 6.5, hy + 12, 3.2, 0.1 * PI, 0.9 * PI);
    ctx.stroke();
    ctx.strokeStyle = A.c(gold[0]);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (strike || beat > 0.5) {
      ctx.fillStyle = A.c('#5a1a22');
      ctx.ellipse(hx + 6, hy + 14.5, 3, 2, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // 眼睛（從瀏海下發出琥珀色的光）
    glowEyes(ctx, hx - 1, hy - 1, 8, 2.5, 3, m, '#ffb43a', RGB, wind && eyeKind(m) === 'normal' ? 'angry' : undefined, { pupil: '#2a1206', ga: 0.55 + beat * 0.3 });
    // 瀏海
    A.shape(ctx, (c) => {
      c.moveTo(hx - 12, hy - 11);
      c.bezierCurveTo(hx - 6, hy - 22, hx + 10, hy - 20, hx + 13, hy - 8);
      for (let i = 0; i <= 5; i++) {
        const x = hx + 13 - i * 5;
        c.lineTo(x - 2.5, hy - 3 - (i % 2 ? 0 : 2.5));
        c.lineTo(x - 5, hy - 7);
      }
      c.closePath();
    }, bang[0], bang[1], { lw: 2.2, shadeY: hy - 7 });
    // 近側角（大、往上彎，金環＋青銅角套）
    A.shape(ctx, (c) => {
      c.moveTo(hx + 3, hy - 15);
      c.quadraticCurveTo(hx + 20, hy - 18, hx + 20, hy - 30);
      c.quadraticCurveTo(hx + 19, hy - 40, hx + 13, hy - 42);
      c.quadraticCurveTo(hx + 12, hy - 30, hx + 1, hy - 21);
      c.closePath();
    }, horn[0], horn[1], { lw: 2.4, cel: [1.6, 1.6], hl: [hx + 15, hy - 30, 1.2, 3] });
    A.shape(ctx, (c) => {
      c.moveTo(hx + 19.6, hy - 33);
      c.quadraticCurveTo(hx + 19, hy - 40, hx + 13, hy - 42);
      c.quadraticCurveTo(hx + 13.2, hy - 37, hx + 14.5, hy - 33.5);
      c.closePath();
    }, rim[0], rim[1], { lw: 1.8, shadeY: hy - 36 });
    limb(ctx, (c) => { c.moveTo(hx + 8, hy - 21); c.lineTo(hx + 12.5, hy - 16.5); }, 4.6, gold[0]);
    limb(ctx, (c) => { c.moveTo(hx + 14, hy - 27); c.lineTo(hx + 20, hy - 26); }, 4.6, gold[0]);

    // 尾巴＋鼓槌：從臀部甩起，擂在鼓面上
    const px = -44;
    const py = cy - 6;
    const aUp = -1.95 + Math.sin(t * 2) * 0.08;
    const aHit = -0.15;
    const ang = aUp + (aHit - aUp) * beat - (wind ? 0.3 : 0);
    const L = 30;
    const ex = px + Math.cos(ang) * L;
    const ey = py + Math.sin(ang) * L;
    const cxp = px + Math.cos(ang - 0.9) * L * 0.6;
    const cyp = py + Math.sin(ang - 0.9) * L * 0.6;
    limb(ctx, (c) => { c.moveTo(px + 2, py); c.quadraticCurveTo(cxp, cyp, ex, ey); }, 8, fur[0]);
    const sa = ang + 0.5;
    const sx = ex + Math.cos(sa) * 17;
    const sy = ey + Math.sin(sa) * 17;
    limb(ctx, (c) => { c.moveTo(ex - Math.cos(sa) * 3, ey - Math.sin(sa) * 3); c.lineTo(sx, sy); }, 6, '#6a3a1e');
    A.shape(ctx, (c) => {
      c.moveTo(ex + Math.cos(ang + 1.6) * 6, ey + Math.sin(ang + 1.6) * 6);
      c.quadraticCurveTo(ex + Math.cos(sa) * 8, ey + Math.sin(sa) * 8, ex + Math.cos(ang - 1.6) * 6, ey + Math.sin(ang - 1.6) * 6);
      c.quadraticCurveTo(ex - Math.cos(ang) * 7, ey - Math.sin(ang) * 7, ex + Math.cos(ang + 1.6) * 6, ey + Math.sin(ang + 1.6) * 6);
      c.closePath();
    }, fur[0], fur[1], { lw: 2.2, shadeY: ey + 2 });
    glow(ctx, sx, sy, 11 + beat * 8, RGB, 0.4 + beat * 0.4);
    A.ellipse(ctx, sx, sy, 7.5, 6.5, gold[0], gold[1], { rot: sa, lw: 2.4, hl: [sx - 2.2, sy - 2.4, 1.8, 1.3] });
    rune(ctx, sx, sy, 2.8, '#c8283c', 3, 1.4);
    if (beat > 0.6) {
      ctx.save();
      ctx.globalAlpha *= beat;
      sparkle(ctx, sx + 5, sy - 7, 5, '#fff2b0');
      sparkle(ctx, sx - 6, sy - 4, 3, '#ffd24a');
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 影縛狼：墨黑色的狼，背脊與頸毛燒著紫色影焰、眼睛是紫色鬼火；影子是一隻獨立的生物 ──
  function wolfShadowShape(ctx, t, a, eyes) {
    ctx.save();
    ctx.globalAlpha *= a;
    const wob = (i) => Math.sin(t * 5 + i) * 1.2;
    const path = (c) => {
      c.moveTo(36, -1);
      c.quadraticCurveTo(0, 4, -40, 2);
      c.quadraticCurveTo(-54, 2, -57, -3);
      c.lineTo(-60, -13 + wob(1));
      c.lineTo(-53, -8);
      c.lineTo(-49, -14 + wob(2));
      c.lineTo(-45, -6);
      c.quadraticCurveTo(-36, -7 + wob(3), -24, -5);
      c.quadraticCurveTo(-10, -8 + wob(4), 4, -5);
      c.quadraticCurveTo(22, -5 + wob(5), 36, -1);
      c.closePath();
    };
    glow(ctx, -10, -3, 44, '150,80,255', 0.25);
    ctx.fillStyle = A.c('#170f2c');
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.strokeStyle = A.c('#a56cff');
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 影子上冒出的紫色火苗
    for (let i = 0; i < 4; i++) {
      const q = (t * 1.3 + i / 4) % 1;
      const x = -32 + i * 16 + Math.sin(t * 2 + i) * 3;
      spiritFlame(ctx, x, -3 - q * 8, 2.6 * (1 - q * 0.4), 9 * (1 - q * 0.4), Math.sin(t * 6 + i) * 1.5, '#8a4cff', '#e2c8ff', null, (1 - q) * 0.9);
    }
    if (eyes) {
      glow(ctx, -51, -6, 12, '200,150,255', 0.8);
      ctx.fillStyle = '#f4e8ff';
      ctx.beginPath();
      ctx.ellipse(-54, -6, 2.6, 1.5, -0.25, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-47.5, -6.8, 2.6, 1.5, 0.25, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  function shadowwolf(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const shadowless = !!fx.shadowless;
    const fur = ['#2e2a4a', '#18152a'];
    const light = ['#4a4474', '#373260'];
    const FL = ['#9150ff', '#e6d0ff'];
    const RGB = '160,90,255';
    const run = Math.abs(m.vx || 0) > 90;
    const step = walk ? Math.sin(t * (run ? 18 : 12)) : 0;
    const fa = shadowless ? 0.35 : 1;

    // 活著的影子（在本體下面）
    if (!shadowless) wolfShadowShape(ctx, t, 0.85, !m.dead);

    ctx.save();
    if (shadowless) ctx.globalAlpha *= 0.5 + Math.sin(t * 6) * 0.06;
    if (hurt) ctx.rotate(-0.08);
    if (wind) ctx.rotate(0.06);
    if (strike) {
      ctx.translate(6, 0);
      ctx.rotate(-0.06);
    }
    const bob = walk ? -Math.abs(step) * 2 : Math.sin(t * 2.2) * 0.6;
    const cy = -34 + bob + (wind ? 3 : 0);

    const leg = (x, s, col) => {
      const lift = Math.max(0, s) * 5;
      const kx = x + s * 5;
      limb(ctx, (c) => { c.moveTo(x, cy + 6); c.quadraticCurveTo(x + s * 2 - 2, cy + 18, kx, -3 - lift); }, 8.5, col);
      A.ellipse(ctx, kx + 2, -2.8 - lift, 4.8, 2.8, col, null, { lw: 2, hl: false });
      if (!shadowless) {
        ctx.strokeStyle = 'rgba(165,108,255,0.75)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(kx, -1 - lift);
        ctx.quadraticCurveTo(kx - 3, -6 - lift, kx - 1 + Math.sin(t * 4 + x) * 2, -10 - lift);
        ctx.stroke();
      }
    };
    leg(-22, -step, fur[1]);
    leg(16, step, fur[1]);

    // 背脊的紫色影焰（畫在身體後面，只露出火舌）
    const fl = [[-28, 9], [-19, 13], [-9, 15], [1, 14], [10, 12]];
    fl.forEach((f, i) => {
      const h = f[1] * (1 + Math.sin(t * 7 + i * 1.9) * 0.15) * (strike || run ? 1.25 : 1);
      spiritFlame(ctx, f[0], cy - 9, 4.2, h + 8, -3 - (run ? 5 : 0) + Math.sin(t * 5 + i) * 2, FL[0], FL[1], RGB, fa);
    });

    // 尾巴：往上翹，尾端燒成紫焰
    ctx.save();
    ctx.translate(-32, cy - 5);
    ctx.rotate(Math.sin(t * 3) * 0.1 + (run || strike ? 0.35 : 0));
    const tailP = (c) => {
      c.moveTo(3, -5);
      c.quadraticCurveTo(-10, -8, -17, -16);
      c.quadraticCurveTo(-23, -24, -21, -28);
      c.quadraticCurveTo(-13, -24, -9, -17);
      c.quadraticCurveTo(-4, -8, 4, 4);
      c.closePath();
    };
    withClip(ctx, tailP, fur[0], fur[1], { cel: [2.5, 2.5] }, () => {
      A.shape(ctx, (c) => c.ellipse(-20, -26, 7, 7, 0, 0, TAU), FL[0], null, { noStroke: true });
    });
    spiritFlame(ctx, -20, -24, 4.6, 16, -4 + Math.sin(t * 8) * 2.5, FL[0], FL[1], RGB, fa);
    ctx.restore();

    // 身體
    const bodyP = (c) => {
      c.moveTo(-34, cy - 2);
      c.bezierCurveTo(-33, cy - 16, -6, cy - 17, 14, cy - 14);
      c.bezierCurveTo(26, cy - 12, 30, cy - 2, 26, cy + 8);
      c.bezierCurveTo(18, cy + 14, -2, cy + 11, -16, cy + 12);
      c.bezierCurveTo(-30, cy + 13, -36, cy + 8, -34, cy - 2);
      c.closePath();
    };
    withClip(ctx, bodyP, fur[0], fur[1], { cel: [4, 4] }, () => {
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = '#b79cff';
      ctx.beginPath();
      ctx.ellipse(-14, cy - 10, 11, 2.2, -0.05, 0, TAU);
      ctx.fill();
    });
    // 肩上的紫色符文
    rune(ctx, 12, cy - 1, 4, '#caa4ff', 2, 1.6, RGB, 0.9 * fa);
    leg(-12, step, fur[0]);
    leg(22, -step, fur[0]);

    // 頭
    const hx = 31;
    const hy = cy - 12 + (wind ? 3 : 0);
    // 頸部的影焰毛領
    for (let i = 0; i < 3; i++) {
      spiritFlame(ctx, hx - 12 + i * 3, hy + 6 + i * 3, 4, 14 - i * 2, -6 + Math.sin(t * 6 + i * 2) * 2, FL[0], FL[1], RGB, fa);
    }
    A.shape(ctx, (c) => {
      c.moveTo(hx - 10, hy - 6);
      c.lineTo(hx - 14, hy + 2);
      c.lineTo(hx - 10, hy + 4);
      c.lineTo(hx - 12, hy + 11);
      c.lineTo(hx - 6, hy + 10);
      c.lineTo(hx - 5, hy + 17);
      c.lineTo(hx + 2, hy + 12);
      c.lineTo(hx + 8, hy + 6);
      c.closePath();
    }, light[0], light[1], { lw: 2.4, shadeY: hy + 9 });
    // 耳朵（內側紫光）
    const earT = walk ? Math.sin(t * 12) * 0.5 : 0;
    A.shape(ctx, (c) => poly(c, [[hx - 9, hy - 6], [hx - 11, hy - 21 + earT], [hx - 1, hy - 9]]), fur[1], null, { lw: 2.4 });
    A.shape(ctx, (c) => poly(c, [[hx - 3, hy - 8], [hx + 1, hy - 23 - earT], [hx + 6, hy - 7]]), fur[0], fur[1], { lw: 2.4, shadeY: hy - 10 });
    glow(ctx, hx + 1.5, hy - 12, 7, RGB, 0.5 * fa);
    A.shape(ctx, (c) => poly(c, [[hx - 1, hy - 9], [hx + 1, hy - 19 - earT], [hx + 4, hy - 9]]), '#9a5cff', null, { noStroke: true });
    // 口鼻
    const open = strike ? 1 : 0;
    if (open) {
      A.shape(ctx, (c) => {
        c.moveTo(hx + 4, hy + 2);
        c.lineTo(hx + 19, hy + 4);
        c.quadraticCurveTo(hx + 20, hy + 10, hx + 14, hy + 11);
        c.lineTo(hx + 4, hy + 7);
        c.closePath();
      }, '#6a1a4a', null, { lw: 2.2 });
      glow(ctx, hx + 12, hy + 6, 8, RGB, 0.6);
      fang(ctx, hx + 16, hy + 3.8, 3.4, false);
      fang(ctx, hx + 15, hy + 10.5, 3, true);
    }
    A.shape(ctx, (c) => {
      c.moveTo(hx + 2, hy - 6);
      c.lineTo(hx + 16, hy - 1 - open * 2);
      c.quadraticCurveTo(hx + 20, hy + 1 - open * 2, hx + 17, hy + 3 - open * 1.5);
      c.lineTo(hx + 4, hy + (open ? 3 : 6));
      c.closePath();
    }, light[0], light[1], { lw: 2.4, shadeY: hy + 1 });
    A.ellipse(ctx, hx, hy - 2, 10.5, 9.5, fur[0], fur[1], { cel: [2.2, 2.2], hl: [hx - 4, hy - 6, 3, 2], lw: A.LW });
    A.shape(ctx, (c) => {
      c.moveTo(hx + 6, hy - 5);
      c.lineTo(hx + 16, hy - 1 - open * 2);
      c.quadraticCurveTo(hx + 20, hy + 1 - open * 2, hx + 17, hy + 3 - open * 1.5);
      c.lineTo(hx + 7, hy + (open ? 3 : 5.5));
      c.closePath();
    }, light[0], light[1], { noStroke: true, shadeY: hy + 1.5 });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + 8, hy - 4.4);
    ctx.lineTo(hx + 16, hy - 1 - open * 2);
    ctx.quadraticCurveTo(hx + 20, hy + 1 - open * 2, hx + 17, hy + 3 - open * 1.5);
    ctx.lineTo(hx + 8, hy + (open ? 3 : 5.2));
    ctx.stroke();
    A.ellipse(ctx, hx + 17.5, hy - 1 - open * 2, 2.4, 2, '#0e0c18', null, { lw: 1.2, hl: false });
    // 紫色鬼火眼＋眼下的影紋
    const k = eyeKind(m);
    glowEyes(ctx, hx - 1, hy - 4, 7, 2.6, 3.1, m, '#d2a8ff', RGB, (strike || wind) && k === 'normal' ? 'angry' : undefined, { slit: true, pupil: '#1a0a36', ga: 0.75 });
    glowStroke(ctx, (c) => {
      c.moveTo(hx - 3, hy + 0.5);
      c.lineTo(hx - 9, hy + 3.5);
    }, '#b07aff', 1.6, RGB, 0.8 * fa);
    if (!open) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx + 9, hy + 3.5);
      ctx.quadraticCurveTo(hx + 12, hy + 5, hx + 15, hy + 3);
      ctx.stroke();
    }

    // 影子離開時：本體冒出淡紫色碎影
    if (shadowless) {
      for (let i = 0; i < 5; i++) {
        const q = (t * 0.9 + i / 5) % 1;
        const x = -30 + i * 14 + Math.sin(t * 2 + i) * 4;
        ctx.save();
        ctx.globalAlpha *= (1 - q) * 0.9;
        ctx.fillStyle = A.c('#9a6aff');
        ctx.beginPath();
        ctx.ellipse(x, cy - 10 - q * 26, 2.6, 3.6, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ── 夢咒綿羊：薰衣草色夢雲羊毛、金色捲角，背後浮著一輪發光的彎月光環，身邊飄著星星和 Z 符文 ──
  function sleepyEye(ctx, x, y, rx, ry, kind, lid, lidCol) {
    if (kind !== 'normal' && kind !== 'angry') {
      A.eye(ctx, x, y, rx, ry, kind);
      return;
    }
    A.eye(ctx, x, y, rx, ry, 'normal', 0.5);
    if (lid <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx + 0.6, ry + 0.6, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = A.c(lidCol);
    ctx.fillRect(x - rx - 2, y - ry - 2, rx * 2 + 4, (ry * 2 + 2) * lid + 1);
    ctx.restore();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const ly = y - ry + ry * 2 * lid;
    ctx.beginPath();
    ctx.moveTo(x - rx - 0.8, ly - 0.4);
    ctx.quadraticCurveTo(x, ly + 1, x + rx + 0.8, ly - 0.4);
    ctx.stroke();
  }
  function dreamsheep(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const pf = clamp(Math.max(num(fx.puff, 0), strike ? 1 : 0, wind ? 0.35 : 0), 0, 1);
    const wool = ['#b894f4', '#8060d4'];
    const face = ['#f6ecff', '#d4c2f0'];
    const horn = ['#ffd866', '#d89a2e'];
    const step = walk ? Math.sin(t * 9) : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    const breathe = Math.sin(t * 1.6) * 1.2;
    const bob = walk ? -Math.abs(step) * 2 : 0;
    const cy = -42 + bob;

    // 背後的彎月光環
    const mx = -24;
    const my = cy - 16;
    glow(ctx, mx, my, 42 + pf * 12, '255,220,120', 0.45 + pf * 0.25);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(PI - 0.35 + Math.sin(t * 0.8) * 0.06);
    crescent(ctx, 0, 0, 24, '#ffe07a', 2.4);
    ctx.restore();
    // 月亮旁的小星
    [[-50, cy - 30, 3.4], [-36, cy - 46, 2.6], [-8, cy - 42, 2.2]].forEach((p, i) => sparkle(ctx, p[0], p[1], p[2] * (0.6 + 0.4 * Math.sin(t * 3 + i * 2)), '#fff6c0'));

    // 腳
    const leg = (x, s, col) => {
      const lift = Math.max(0, s) * 4;
      limb(ctx, (c) => { c.moveTo(x, cy + 10); c.lineTo(x + s * 3, -5 - lift); }, 7, col);
      hoof(ctx, x + s * 3, -lift, 7.5, 5.5, '#241a48');
    };
    leg(-20, -step, '#3a2c6a');
    leg(14, step, '#3a2c6a');
    leg(-28, step, '#4c3c84');
    leg(6, -step, '#4c3c84');

    // 夢雲羊毛
    const k = 1 + pf * 0.14 + breathe * 0.01;
    const C = [[-28, 4, 13], [-20, -11, 15], [-3, -17, 16], [15, -11, 14], [22, 4, 12], [7, 12, 14], [-12, 12, 14], [-4, -1, 19]].map((q) => [
      -4 + q[0] * k + Math.sin(t * 1.3 + q[0]) * 0.6,
      cy + q[1] * k + Math.cos(t * 1.1 + q[1]) * 0.6,
      q[2] * k,
    ]);
    cloud(ctx, C, wool[0], wool[1], A.LW, 5);
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-18, cy - 16 * k, 6, 3, -0.4, 0, TAU);
    ctx.ellipse(-4, cy - 23 * k, 4, 2, -0.2, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 羊毛裡閃爍的星星
    [[6, cy - 9, 3.2], [-24, cy + 7, 2.6], [12, cy + 8, 2.2], [-14, cy - 2, 2.8], [-2, cy + 10, 2]].forEach((p, i) => {
      sparkle(ctx, p[0], p[1], p[2] * (0.7 + 0.3 * Math.sin(t * 2.5 + i * 1.3)), i % 2 ? '#ffffff' : '#fff2a0');
    });
    // 噴出的睡意霧
    if (pf > 0.05) {
      for (let i = 0; i < 5; i++) {
        const q = (t * 0.8 + i / 5) % 1;
        const a = -PI * 0.5 + (i - 2) * 0.55;
        const d = 24 + q * 22 * pf;
        puff(ctx, -4 + Math.cos(a) * d * 1.3, cy + Math.sin(a) * d * 0.8, 4 + q * 6 * pf, '#d4bcff', (1 - q) * pf * 0.85);
      }
    }
    // 飄起的 Z
    for (let i = 0; i < 2; i++) {
      const q = (t * 0.35 + i * 0.5) % 1;
      ctx.save();
      ctx.globalAlpha *= Math.sin(q * PI);
      zGlyph(ctx, 10 + i * 8 + Math.sin(t * 2 + i) * 3 + q * 6, cy - 28 - q * 16, 5 + q * 3 + i, '#fff2a0');
      ctx.restore();
    }

    // 頭
    const hx = 30;
    const hy = cy + 2 + (wind ? 2 : 0);
    // 遠側的角（小小一截）
    limb(ctx, (c) => {
      c.moveTo(hx + 4, hy - 7);
      c.quadraticCurveTo(hx + 12, hy - 14, hx + 15, hy - 7);
    }, 6, horn[1]);
    // 耳朵（往兩邊垂）
    A.ellipse(ctx, hx - 9, hy - 3, 7, 3.4, face[1], null, { rot: 0.6, lw: 2.2, hl: false });
    A.shape(ctx, (c) => c.ellipse(hx, hy + 4, 11, 13, 0.15, 0, TAU), face[0], face[1], { cel: [2.5, 2.5], hl: [hx - 5, hy - 2, 3, 2] });
    A.ellipse(ctx, hx + 9, hy - 2, 7, 3.4, face[0], face[1], { rot: -0.5, lw: 2.2, hl: false, shadeAt: 0 });
    A.ellipse(ctx, hx + 9.5, hy - 2.2, 3.6, 1.4, '#ffb8cc', null, { rot: -0.5, noStroke: true, hl: false });
    // 頭頂的一小團夢雲
    cloud(ctx, [[hx - 4, hy - 8, 6], [hx + 3, hy - 10, 6.5], [hx - 9, hy - 5, 4.5]], wool[0], wool[1], 2.4, 2);
    // 近側的金色捲角
    limb(ctx, (c) => {
      c.moveTo(hx - 2, hy - 9);
      c.bezierCurveTo(hx - 15, hy - 17, hx - 21, hy - 1, hx - 13, hy + 5);
      c.quadraticCurveTo(hx - 7, hy + 8, hx - 7, hy + 1);
    }, 8, horn[0]);
    ctx.strokeStyle = A.c(horn[1]);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy - 14);
    ctx.lineTo(hx - 6, hy - 10);
    ctx.moveTo(hx - 14, hy - 10);
    ctx.lineTo(hx - 11, hy - 7.5);
    ctx.moveTo(hx - 17, hy - 3);
    ctx.lineTo(hx - 13.5, hy - 2);
    ctx.stroke();
    // 額頭的小月印
    glow(ctx, hx + 2, hy - 3, 6, '255,220,120', 0.6);
    crescent(ctx, hx + 2, hy - 3, 2.8, '#ffd24a', 1.1);
    // 眼睛：睏睏的半閉眼
    const ek = eyeKind(m);
    const lid = ek === 'normal' ? 0.45 + Math.max(0, Math.sin(t * 0.9)) * 0.25 - pf * 0.2 : 0;
    sleepyEye(ctx, hx - 1, hy + 3, 2.6, 3.2, ek, lid, face[0]);
    sleepyEye(ctx, hx + 7, hy + 2.5, 2.4, 3, ek, lid, face[0]);
    if (pf > 0.3) {
      A.shape(ctx, (c) => c.ellipse(hx + 5, hy + 11, 2.6 + pf * 1.5, 2.8 + pf * 2.2, 0, 0, TAU), '#6a2a5a', null, { lw: 1.8 });
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 2, hy + 10);
      ctx.quadraticCurveTo(hx + 4, hy + 12, hx + 6, hy + 10);
      ctx.quadraticCurveTo(hx + 8, hy + 12, hx + 10, hy + 10);
      ctx.stroke();
    }
    ctx.fillStyle = A.c('#b89ad0');
    ctx.beginPath();
    ctx.ellipse(hx + 6, hy + 7.5, 1.6, 1.1, 0, 0, TAU);
    ctx.fill();
    A.blush(ctx, hx - 1, hy + 8, 2.6);
    ctx.restore();
  }

  // ── 封印狐：朱紅與金色的神社狐，三條尾巴尖燃著金色狐火，身邊繞著三張封印符紙；脖子上掛著注連繩與金鈴 ──
  function silencefox(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const aura = clamp(Math.max(num(fx.aura, 0), wind ? 0.5 : 0, strike ? 1 : 0), 0, 1);
    const fur = ['#e4502f', '#ac311d'];
    const cream = ['#fff2dc', '#efcfa6'];
    const dark = '#3a1620';
    const gold = ['#ffd24a', '#d99a2a'];
    const red = '#c8203a';
    const FIRE = '255,200,80';
    const step = walk ? Math.sin(t * 13) : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    const bob = walk ? -Math.abs(step) * 2 : Math.sin(t * 2.5) * 0.5;
    const cy = -28 + bob;

    // 腳下的封印小陣（結界張開時）
    if (aura > 0.02) {
      ctx.save();
      ctx.globalAlpha *= aura;
      ctx.translate(0, -1);
      ctx.scale(1, 0.28);
      glow(ctx, 0, 0, 50, '255,90,100', 0.4);
      ctx.strokeStyle = 'rgba(255,90,110,0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,210,90,0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      starPath(ctx, 0, 0, 38, 15, 5, t * 0.8);
      ctx.stroke();
      ctx.restore();
    }

    // 繞著身體飛的封印符紙（後半圈先畫）
    const papers = (front) => {
      for (let i = 0; i < 3; i++) {
        const a = t * (0.9 + aura * 1.3) + (i / 3) * TAU;
        const s = Math.sin(a);
        if (s > 0 !== front) continue;
        const R = 34 + aura * 12;
        const x = -2 + Math.cos(a) * R;
        const y = cy - 14 - aura * 10 + s * 7 + Math.sin(t * 2.3 + i) * 2.5;
        talisman(ctx, x, y, 7 + aura * 1.5, 14 + aura * 3, Math.sin(t * 2 + i) * 0.25, '#ffe890', red, '255,120,90', 0.35 + aura * 0.6, i);
      }
    };
    papers(false);

    // 三條尾巴（尖端金色，燃著狐火）
    const spread = 0.4 + aura * 0.28;
    const tails = [-2.45 - spread, -2.45 + spread, -2.45];
    const tips = [];
    tails.forEach((a0, i) => {
      const a = a0 + Math.sin(t * 2.2 + i * 1.7) * 0.07 + (walk ? Math.sin(t * 13 + i) * 0.05 : 0);
      ctx.save();
      ctx.translate(-20, cy - 2);
      ctx.rotate(a);
      const L = 32 + aura * 4;
      const tp = (c) => {
        c.moveTo(0, -5);
        c.quadraticCurveTo(L * 0.45, -12, L, -3);
        c.quadraticCurveTo(L + 5, 1, L - 2, 4);
        c.quadraticCurveTo(L * 0.5, 11, 0, 5);
        c.closePath();
      };
      withClip(ctx, tp, i === 2 ? fur[0] : '#d24428', fur[1], { cel: [2, 2] }, () => {
        A.shape(ctx, (c) => c.ellipse(L - 1, 0, 10, 10, 0, 0, TAU), gold[0], gold[1], { noStroke: true, shadeY: 3 });
        ctx.fillStyle = A.c('#fff4c8');
        ctx.beginPath();
        ctx.ellipse(L + 1, -1, 4.5, 4, 0, 0, TAU);
        ctx.fill();
      }, 2.6);
      ctx.restore();
      tips.push([-20 + Math.cos(a) * (L + 1), cy - 2 + Math.sin(a) * (L + 1), i]);
    });
    tips.forEach((p) => spiritFlame(ctx, p[0], p[1] + 2, 4.2 + aura, 13 + aura * 7 + Math.sin(t * 7 + p[2]) * 2, -4 + Math.sin(t * 5 + p[2] * 2) * 2.5, '#ffc83a', '#fffbe0', FIRE, 0.9));

    // 腳（黑襪）
    const leg = (x, s, col) => {
      const lift = Math.max(0, s) * 4;
      limb(ctx, (c) => { c.moveTo(x, cy + 6); c.lineTo(x + s * 4, -3 - lift); }, 7, col);
      limb(ctx, (c) => { c.moveTo(x + s * 2.6, -9 - lift); c.lineTo(x + s * 4, -3 - lift); }, 7, dark);
      A.ellipse(ctx, x + s * 4 + 1.5, -2.6 - lift, 4, 2.6, dark, null, { lw: 2, hl: false });
    };
    leg(-14, -step, fur[1]);
    leg(12, step, fur[1]);
    // 身體＋奶油色胸口
    withClip(ctx, (c) => c.ellipse(-3, cy, 21, 12.5, 0, 0, TAU), fur[0], fur[1], { cel: [3, 3], hl: [-12, cy - 6, 5, 2.4] }, () => {
      A.shape(ctx, (c) => c.ellipse(14, cy + 5, 10, 10, 0, 0, TAU), cream[0], cream[1], { noStroke: true, shadeY: cy + 9 });
      // 金色狐紋
      ctx.strokeStyle = A.c(gold[0]);
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-18, cy - 4);
      ctx.quadraticCurveTo(-12, cy - 9, -5, cy - 6);
      ctx.moveTo(-14, cy + 1);
      ctx.quadraticCurveTo(-9, cy - 3, -3, cy - 1);
      ctx.stroke();
    });
    leg(-8, step, fur[0]);
    leg(17, -step, fur[0]);

    // 頭
    const hx = 22;
    const hy = cy - 12 + (wind ? 1 : 0);
    // 耳朵（尖端黑色，內側奶油色）
    const earP1 = (c) => poly(c, [[hx - 9, hy - 5], [hx - 12, hy - 23], [hx - 1, hy - 9]]);
    const earP2 = (c) => poly(c, [[hx - 3, hy - 8], [hx + 1, hy - 26], [hx + 7, hy - 7]]);
    withClip(ctx, earP1, fur[1], null, {}, () => {
      ctx.fillStyle = A.c(dark);
      ctx.fillRect(hx - 16, hy - 30, 16, 12);
    }, 2.4);
    withClip(ctx, earP2, fur[0], fur[1], { shadeY: hy - 11 }, () => {
      A.shape(ctx, (c) => poly(c, [[hx - 0.5, hy - 9], [hx + 1.2, hy - 21], [hx + 4.5, hy - 8.5]]), cream[0], null, { noStroke: true });
      ctx.fillStyle = A.c(dark);
      ctx.fillRect(hx - 6, hy - 30, 16, 11);
    }, 2.4);
    // 臉
    A.ellipse(ctx, hx, hy, 11.5, 10, fur[0], fur[1], { cel: [2.2, 2.2], hl: [hx - 5, hy - 4, 3, 2] });
    // 臉頰毛（奶油色）
    A.shape(ctx, (c) => poly(c, [[hx - 10, hy + 1], [hx - 15, hy + 5], [hx - 9, hy + 5], [hx - 11, hy + 9], [hx - 4, hy + 7]]), cream[0], cream[1], { lw: 2, shadeY: hy + 6 });
    // 鼻尖（奶油色口吻）
    A.shape(ctx, (c) => {
      c.moveTo(hx + 5, hy - 4);
      c.lineTo(hx + 17, hy + 1);
      c.quadraticCurveTo(hx + 19, hy + 4, hx + 15, hy + 5);
      c.lineTo(hx + 6, hy + 6);
      c.closePath();
    }, cream[0], cream[1], { noStroke: true, shadeY: hy + 3 });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + 8, hy - 3);
    ctx.lineTo(hx + 17, hy + 1);
    ctx.quadraticCurveTo(hx + 19, hy + 4, hx + 15, hy + 5);
    ctx.lineTo(hx + 8, hy + 6.5);
    ctx.stroke();
    A.ellipse(ctx, hx + 17.5, hy + 1.8, 2.2, 1.8, '#2a1018', null, { lw: 1.2, hl: false });
    // 金色狐紋眼線
    glowStroke(ctx, (c) => {
      c.moveTo(hx - 4, hy - 5);
      c.quadraticCurveTo(hx - 7, hy - 8, hx - 10, hy - 6);
      c.moveTo(hx + 9.5, hy - 5.5);
      c.lineTo(hx + 12.5, hy - 7.5);
    }, gold[0], 1.8, FIRE, 0.4 + aura * 0.5);
    // 眼睛：金色狐眼（結界全開時閉眼念咒）
    const ek = eyeKind(m);
    const chant = aura > 0.6 && ek === 'normal';
    glowEyes(ctx, hx, hy - 2, 7, 2.4, 3, m, '#ffd84a', FIRE, chant ? 'closed' : undefined, { slit: true, pupil: '#3a1008', ga: 0.5 });
    // 額頭封印（金圈＋紅點）
    const fg = 0.35 + aura * 0.65;
    glow(ctx, hx + 2, hy - 8.5, 8 + aura * 7, '255,150,90', fg * 0.7);
    A.shape(ctx, (c) => c.arc(hx + 2, hy - 8.5, 2.8, 0, TAU), gold[0], null, { lw: 1.2 });
    A.shape(ctx, (c) => c.arc(hx + 2, hy - 8.5, 1.3, 0, TAU), mixq(red, '#fff4c8', aura), null, { noStroke: true });
    // 嘴
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx + 9, hy + 4.5);
    ctx.quadraticCurveTo(hx + 12, hy + 6, hx + 14, hy + 4.4);
    ctx.stroke();
    // 注連繩＋金鈴
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(hx - 11, hy + 5);
    ctx.quadraticCurveTo(hx - 4, hy + 13, hx + 5, hy + 9);
    ctx.stroke();
    ctx.strokeStyle = A.c('#fff2c8');
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = A.c('#d8b060');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const x = hx - 9 + i * 4;
      ctx.moveTo(x, hy + 6 + i * 0.8);
      ctx.lineTo(x + 2, hy + 9.5 + i * 0.4);
    }
    ctx.stroke();
    const bellSw = Math.sin(t * (walk ? 13 : 3)) * 0.25;
    ctx.save();
    ctx.translate(hx - 3, hy + 12);
    ctx.rotate(bellSw);
    glow(ctx, 0, 3, 8, FIRE, 0.4 + aura * 0.4);
    A.shape(ctx, (c) => {
      c.moveTo(-5, 5.5);
      c.quadraticCurveTo(-5.5, -1, 0, -1.5);
      c.quadraticCurveTo(5.5, -1, 5, 5.5);
      c.closePath();
    }, gold[0], gold[1], { lw: 1.8, shadeY: 3, hl: [-1.8, 0.8, 1, 1.4] });
    ctx.fillStyle = A.outline();
    ctx.beginPath();
    ctx.arc(0, 5.5, 1.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    papers(true);
    ctx.restore();
  }

  // ── 心核雪松：墨綠針葉、黑褐古樹皮的千年雪松樹人，琥珀色的眼睛在樹洞裡發光，樹幹裡一顆紅寶石心臟，紅光沿著樹紋流動 ──
  function heartPath(c, x, y, s) {
    c.moveTo(x, y + s * 0.95);
    c.bezierCurveTo(x - s * 1.25, y - s * 0.05, x - s * 0.7, y - s * 1.05, x, y - s * 0.4);
    c.bezierCurveTo(x + s * 0.7, y - s * 1.05, x + s * 1.25, y - s * 0.05, x, y + s * 0.95);
    c.closePath();
  }
  function crystalHeart(ctx, x, y, s, lw) {
    A.shape(ctx, (c) => heartPath(c, x, y, s), '#ff2a55', '#b0103a', { cel: [s * 0.18, s * 0.18], lw: lw || 2.2 });
    ctx.save();
    ctx.beginPath();
    heartPath(ctx, x, y, s);
    ctx.clip();
    ctx.strokeStyle = A.c('#ff9ab4');
    ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.4);
    ctx.lineTo(x, y + s * 0.95);
    ctx.moveTo(x - s * 0.9, y - s * 0.2);
    ctx.lineTo(x - s * 0.2, y + s * 0.15);
    ctx.lineTo(x, y - s * 0.4);
    ctx.moveTo(x + s * 0.9, y - s * 0.2);
    ctx.lineTo(x + s * 0.2, y + s * 0.15);
    ctx.lineTo(x, y - s * 0.4);
    ctx.stroke();
    ctx.globalAlpha *= 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.52, y - s * 0.38, s * 0.22, s * 0.13, -0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function heartcedar(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const open = clamp(num(fx.open, 0), 0, 1);
    const beat = clamp(fx.beat != null ? num(fx.beat, 0) : Math.pow(Math.max(0, Math.sin(t * 3.2)), 6), 0, 1);
    const bark = ['#5b402e', '#3a281c'];
    const needle = ['#1f5a4a', '#123c32'];
    const snow = ['#f8fbff', '#cddcec'];
    const RGB = '255,40,80';
    const vein = 0.35 + beat * 0.45 + open * 0.25;
    const step = walk ? Math.sin(t * 6) : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.05);
    const sway = Math.sin(t * 1.4) * 0.02 + (walk ? step * 0.015 : 0);

    // 根腳
    const root = (x, s, col) => {
      const lift = Math.max(0, s) * 5;
      A.shape(ctx, (c) => {
        c.moveTo(x - 10, -18);
        c.quadraticCurveTo(x - 13, -6 - lift, x - 15, -lift);
        c.lineTo(x + 12, -lift);
        c.quadraticCurveTo(x + 10, -8 - lift, x + 8, -18);
        c.closePath();
      }, col, bark[1], { lw: 2.6, shadeY: -6 - lift });
      glowStroke(ctx, (c) => {
        c.moveTo(x - 1, -16);
        c.quadraticCurveTo(x - 4, -8 - lift, x - 3, -3 - lift);
      }, '#ff4a6a', 1.3, RGB, vein);
      A.shape(ctx, (c) => {
        c.moveTo(x - 14, -lift - 1);
        c.quadraticCurveTo(x - 8, -7 - lift, x - 2, -lift - 1);
        c.closePath();
      }, snow[0], null, { lw: 1.8 });
    };
    root(-14, -step, bark[1]);
    root(14, step, bark[0]);

    ctx.rotate(sway);
    // 樹幹（樹紋裡流著紅光）
    const trunkP = (c) => {
      c.moveTo(-22, -12);
      c.bezierCurveTo(-18, -30, -20, -60, -16, -84);
      c.lineTo(16, -84);
      c.bezierCurveTo(20, -60, 18, -30, 22, -12);
      c.quadraticCurveTo(0, -6, -22, -12);
      c.closePath();
    };
    const hx = 3;
    const hy = -36;
    withClip(ctx, trunkP, bark[0], bark[1], { cel: [5, 5] }, () => {
      ctx.strokeStyle = A.c('#2e1f16');
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      [[-14, -18, -12, -48], [-9, -60, -10, -80], [12, -16, 13, -44], [9, -62, 11, -82]].forEach((l) => {
        ctx.moveTo(l[0], l[1]);
        ctx.quadraticCurveTo(l[0] + 3, (l[1] + l[3]) / 2, l[2], l[3]);
      });
      ctx.stroke();
      glowStroke(ctx, (c) => {
        c.moveTo(hx - 9, hy + 10);
        c.quadraticCurveTo(hx - 14, hy + 18, hx - 16, hy + 26);
        c.moveTo(hx + 9, hy + 10);
        c.quadraticCurveTo(hx + 13, hy + 18, hx + 16, hy + 26);
        c.moveTo(hx - 9, hy - 10);
        c.quadraticCurveTo(hx - 14, hy - 18, hx - 16, hy - 22);
        c.moveTo(hx + 9, hy - 10);
        c.quadraticCurveTo(hx + 13, hy - 17, hx + 14, hy - 21);
        c.moveTo(hx, hy + 14);
        c.lineTo(hx - 1, hy + 24);
      }, '#ff4a6a', 1.6, RGB, vein);
    });

    // 遠側樹枝手臂
    const armRaise = wind ? 1 : strike ? -0.6 : 0;
    A.shape(ctx, (c) => {
      c.moveTo(-15, -58);
      c.quadraticCurveTo(-30, -56, -40, -46 + Math.sin(t * 2) * 1.5);
      c.lineTo(-44, -50);
      c.lineTo(-42, -43);
      c.lineTo(-46, -40);
      c.lineTo(-38, -40);
      c.quadraticCurveTo(-28, -46, -15, -48);
      c.closePath();
    }, bark[1], null, { lw: 2.4 });
    A.shape(ctx, (c) => {
      c.moveTo(-38, -48);
      c.quadraticCurveTo(-30, -56, -20, -54);
      c.quadraticCurveTo(-28, -50, -38, -48);
      c.closePath();
    }, snow[0], null, { lw: 1.6 });

    // 心臟的樹洞
    const glowA = (0.3 + beat * 0.35) * (0.4 + open * 0.6);
    glow(ctx, hx, hy, 28 + open * 20 + beat * 10, RGB, glowA + 0.12);
    A.shape(ctx, (c) => c.ellipse(hx, hy, 12, 14, 0, 0, TAU), '#1a0c0c', null, { lw: 2.6 });
    const hs = 8.5 * (1 + beat * 0.14) * (0.85 + open * 0.15);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(hx, hy, 11, 13, 0, 0, TAU);
    ctx.clip();
    glow(ctx, hx, hy, 15, '255,70,110', 0.6 + beat * 0.4);
    crystalHeart(ctx, hx, hy + 1, hs, 2);
    // 樹皮門（往兩邊打開，門上刻著紅色封紋）
    const door = (side) => {
      ctx.save();
      ctx.translate(hx + side * 12, 0);
      ctx.scale(Math.max(0.04, 1 - open * 0.92), 1);
      ctx.translate(-(hx + side * 12), 0);
      const dp = (c) => {
        c.moveTo(hx, hy - 14);
        c.ellipse(hx, hy, 12, 14, 0, -PI / 2, PI / 2, side < 0);
        c.closePath();
      };
      A.shape(ctx, dp, side < 0 ? bark[0] : '#4c3526', bark[1], { noStroke: true, shadeY: hy + 6 });
      glowStroke(ctx, (c) => {
        c.moveTo(hx + side * 3, hy - 7);
        c.lineTo(hx + side * 7, hy - 3);
        c.lineTo(hx + side * 3, hy + 1);
        c.lineTo(hx + side * 7, hy + 5);
      }, '#ff4a6a', 1.3, RGB, (0.5 + beat * 0.5) * (1 - open));
      ctx.beginPath();
      dp(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    };
    door(-1);
    door(1);
    ctx.restore();
    // 關著時：門縫透出心跳的紅光
    if (open < 0.3) {
      ctx.save();
      ctx.globalAlpha *= (1 - open / 0.3) * (0.5 + beat * 0.5);
      ctx.strokeStyle = 'rgba(255,60,100,0.4)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(hx, hy - 12);
      ctx.lineTo(hx, hy + 12);
      ctx.stroke();
      ctx.strokeStyle = '#ff8aa4';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // 臉：樹洞眼窩裡的琥珀色眼睛
    const fy = -64;
    const ek = eyeKind(m);
    A.ellipse(ctx, -4, fy, 6, 6.6, '#1c100a', null, { lw: 2, hl: false });
    A.ellipse(ctx, 10, fy - 0.5, 5.6, 6.3, '#1c100a', null, { lw: 2, hl: false });
    glowEyes(ctx, -4, fy, 14, 3.4, 4, m, '#ffb43a', '255,170,60', ek === 'normal' && open > 0.5 ? 'hurt' : undefined, { pupil: '#3a1806', ga: 0.6 });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (strike) {
      ctx.fillStyle = A.c('#1c100a');
      ctx.ellipse(3, fy + 10, 3.4, 2.8, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.arc(3, fy + 8, 3, 0.2 * PI, 0.8 * PI);
    }
    ctx.stroke();

    // 樹冠：三層積雪的墨綠雪松枝，枝下掛著冰柱與紅寶石果
    const tier = (yb, hw, h, off) => {
      const sw = Math.sin(t * 1.7 + off) * 1.2;
      const P = (c) => {
        c.moveTo(sw * 0.5, yb - h);
        c.quadraticCurveTo(hw * 0.5, yb - h * 0.55, hw + sw, yb);
        const n = 5;
        for (let i = 1; i <= n; i++) {
          const x0 = hw + sw - ((hw * 2) * i) / n;
          c.quadraticCurveTo(x0 + hw / n, yb + 8, x0, yb);
        }
        c.quadraticCurveTo(-hw * 0.5, yb - h * 0.55, sw * 0.5, yb - h);
        c.closePath();
      };
      // 冰柱與紅寶石果（掛在枝下）
      for (let i = 0; i < 3; i++) {
        const x = -hw * 0.6 + i * hw * 0.6 + sw;
        if (i === 1) {
          glow(ctx, x, yb + 7, 8, RGB, 0.35 + beat * 0.4);
          A.shape(ctx, (c) => poly(c, [[x, yb + 2], [x + 3, yb + 7], [x, yb + 12], [x - 3, yb + 7]]), '#ff2a55', '#b0103a', { lw: 1.4, shadeY: yb + 7 });
        } else {
          A.shape(ctx, (c) => poly(c, [[x - 2.2, yb + 1], [x + 2.2, yb + 1], [x, yb + 9 + (i % 2) * 3]]), '#cdeeff', null, { lw: 1.2 });
        }
      }
      A.shape(ctx, P, needle[0], needle[1], { cel: [4, 4] });
      A.shape(ctx, (c) => {
        c.moveTo(sw * 0.5, yb - h - 1);
        c.quadraticCurveTo(hw * 0.45, yb - h * 0.6, hw * 0.85 + sw, yb - h * 0.12);
        c.quadraticCurveTo(hw * 0.7, yb - h * 0.2 + 5, hw * 0.52, yb - h * 0.32);
        c.quadraticCurveTo(hw * 0.35, yb - h * 0.25 + 6, hw * 0.1, yb - h * 0.45);
        c.quadraticCurveTo(-hw * 0.15, yb - h * 0.3 + 5, -hw * 0.38, yb - h * 0.4);
        c.quadraticCurveTo(-hw * 0.6, yb - h * 0.18 + 5, -hw * 0.82 + sw, yb - h * 0.14);
        c.quadraticCurveTo(-hw * 0.45, yb - h * 0.6, sw * 0.5, yb - h - 1);
        c.closePath();
      }, snow[0], snow[1], { lw: 2, cel: [2, 2], hl: [-hw * 0.2, yb - h * 0.62, hw * 0.12, 2] });
    };
    tier(-76, 50, 30, 0);
    tier(-98, 38, 27, 1.3);
    tier(-116, 26, 22, 2.6);
    // 樹頂：一顆發光的紅寶石
    const topX = Math.sin(t * 1.7 + 2.6) * 0.6;
    glow(ctx, topX, -140, 12 + beat * 5, RGB, 0.45 + beat * 0.35);
    A.shape(ctx, (c) => poly(c, [[topX, -148], [topX + 4.5, -140], [topX, -133], [topX - 4.5, -140]]), '#ff2a55', '#b0103a', { lw: 1.8, shadeY: -140 });
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    poly(ctx, [[topX - 1.5, -143], [topX, -146], [topX, -141]]);
    ctx.fill();

    // 近側樹枝手臂（出招時握著冰錐）
    ctx.save();
    ctx.translate(15, -56);
    ctx.rotate(-armRaise * 0.9 + Math.sin(t * 2) * 0.04);
    A.shape(ctx, (c) => {
      c.moveTo(0, -4);
      c.quadraticCurveTo(14, -8, 26, -6);
      c.lineTo(30, -11);
      c.lineTo(30, -5);
      c.lineTo(35, -4);
      c.lineTo(30, -1);
      c.lineTo(32, 3);
      c.lineTo(25, 1);
      c.quadraticCurveTo(14, 2, 0, 6);
      c.closePath();
    }, bark[0], bark[1], { lw: 2.4, shadeY: 1 });
    A.shape(ctx, (c) => {
      c.moveTo(4, -5);
      c.quadraticCurveTo(14, -12, 24, -7);
      c.quadraticCurveTo(14, -4, 4, -5);
      c.closePath();
    }, snow[0], null, { lw: 1.6 });
    if (wind || strike) {
      ctx.save();
      ctx.translate(32, -3);
      ctx.rotate(-PI / 2 + 0.3);
      glow(ctx, 6, 0, 16, '255,90,130', 0.45);
      A.shape(ctx, (c) => poly(c, [[16, 0], [-4, -4], [-7, 0], [-4, 4]]), '#dff6ff', '#9fd4f2', { lw: 2, shadeY: 1 });
      ctx.strokeStyle = A.c('#ff4a6a');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  }

  // ── 冰盾熊：鋼鐵重鎧的聖騎士熊，赤紅披風、頭盔插著紅羽；舉著一面金邊寶藍的巨大聖光塔盾，盾上的聖十字會放光 ──
  function holyShield(ctx, shine, t) {
    const P = (c) => {
      c.moveTo(-21, -38);
      c.quadraticCurveTo(0, -50, 21, -38);
      c.lineTo(21, 18);
      c.quadraticCurveTo(0, 42, -21, 18);
      c.closePath();
    };
    const P2 = (c) => {
      c.moveTo(-16, -34);
      c.quadraticCurveTo(0, -44, 16, -34);
      c.lineTo(16, 16);
      c.quadraticCurveTo(0, 35, -16, 16);
      c.closePath();
    };
    // 聖光
    glow(ctx, 0, -8, 36 + shine * 18, '255,225,130', 0.2 + shine * 0.35);
    if (shine > 0.05) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, shine) * 0.7;
      rays(ctx, 0, -8, 10, 22, 50 + Math.sin(t * 3) * 4, 3.5, t * 0.4, 'rgba(255,236,160,0.5)');
      ctx.restore();
    }
    A.shape(ctx, P, '#ffd24a', '#d0942a', { cel: [4, 4], lw: 3 });
    withClip(ctx, P2, '#2f5ccc', '#1d3c94', { cel: [4, 4] }, () => {
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      poly(ctx, [[-16, -26], [-6, -40], [2, -40], [-16, -8]]);
      ctx.fill();
    }, 2);
    // 盾緣的鉚釘
    [[-18.5, -30], [18.5, -30], [-18.5, 10], [18.5, 10], [0, -41], [0, 27]].forEach((p) => A.ellipse(ctx, p[0], p[1], 1.8, 1.8, '#fff4c8', null, { lw: 1, hl: false }));
    // 聖十字
    glow(ctx, 0, -8, 20 + shine * 12, '255,240,170', 0.5 + shine * 0.45);
    A.shape(ctx, (c) => {
      c.moveTo(-3.5, -30);
      c.lineTo(3.5, -30);
      c.lineTo(3.5, -12);
      c.lineTo(13, -12);
      c.lineTo(13, -5);
      c.lineTo(3.5, -5);
      c.lineTo(3.5, 20);
      c.lineTo(-3.5, 20);
      c.lineTo(-3.5, -5);
      c.lineTo(-13, -5);
      c.lineTo(-13, -12);
      c.lineTo(-3.5, -12);
      c.closePath();
    }, mixq('#ffe79a', '#fffbe8', shine), '#e8b43a', { lw: 1.8, shadeY: -6 });
    A.shape(ctx, (c) => poly(c, [[0, -13.5], [4, -8.5], [0, -3.5], [-4, -8.5]]), '#8fe8ff', '#3ab0e0', { lw: 1.4, shadeY: -8.5 });
    sparkle(ctx, -1, -10, 2.2, '#ffffff');
  }
  function shieldbear(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const bash = clamp(Math.max(num(fx.bash, 0), strike ? 1 : 0), 0, 1);
    const guard = fx.guard != null ? !!fx.guard : !ph;
    const fur = ['#f8fbff', '#c9d6ea'];
    const steel = ['#b6c2d6', '#7784a2'];
    const steelD = '#56607c';
    const gold = ['#ffd24a', '#d99a2a'];
    const cape = ['#c8283c', '#8a1828'];
    const step = walk ? Math.sin(t * 7) : 0;
    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    if (bash > 0) ctx.rotate(0.08 * bash);
    if (wind) ctx.rotate(-0.05);
    const bob = walk ? -Math.abs(step) * 2.5 : Math.sin(t * 2) * 0.8;
    ctx.translate(bash * 6, bob);

    // 赤紅披風
    const cw = Math.sin(t * 3) * 2 + (walk ? 3 : 0) + bash * 6;
    A.shape(ctx, (c) => {
      c.moveTo(-6, -74);
      c.quadraticCurveTo(-34, -68, -40 - cw, -12);
      c.quadraticCurveTo(-28, -6, -18, -11);
      c.quadraticCurveTo(-12, -40, 4, -64);
      c.closePath();
    }, cape[0], cape[1], { cel: [3, 3], lw: 2.6 });
    ctx.strokeStyle = A.c(gold[0]);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-38 - cw, -13.5);
    ctx.quadraticCurveTo(-28, -8, -19, -12);
    ctx.stroke();

    // 腳：鋼鐵脛甲
    const foot = (x, s, col) => {
      const lift = Math.max(0, s) * 5;
      A.shape(ctx, (c) => A.roundRect(c, x - 10, -24 - lift, 20, 22, 7), col, steel[1], { lw: 2.6, shadeY: -10 - lift });
      A.shape(ctx, (c) => A.roundRect(c, x - 10.5, -24 - lift, 21, 5, 2), gold[0], gold[1], { lw: 1.8, shadeY: -21 - lift });
      A.shape(ctx, (c) => A.roundRect(c, x - 11, -6 - lift, 24, 6, 2.5), steelD, null, { lw: 2 });
    };
    foot(-14, -step, steel[1]);
    foot(10, step, steel[0]);

    // 遠側肩甲
    A.ellipse(ctx, -18, -64, 11, 9, gold[1], null, { lw: 2.4, hl: false, rot: -0.3 });

    // 身體：鋼鐵胸甲
    const bodyP = (c) => {
      c.moveTo(-24, -12);
      c.bezierCurveTo(-36, -34, -30, -76, -2, -78);
      c.bezierCurveTo(24, -78, 32, -40, 26, -12);
      c.quadraticCurveTo(0, -2, -24, -12);
      c.closePath();
    };
    withClip(ctx, bodyP, steel[0], steel[1], { cel: [5, 5], hl: [-14, -60, 6, 4] }, () => {
      ctx.strokeStyle = A.c(steelD);
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-32, -40);
      ctx.quadraticCurveTo(0, -32, 32, -40);
      ctx.moveTo(-32, -50);
      ctx.quadraticCurveTo(0, -43, 32, -50);
      ctx.moveTo(4, -76);
      ctx.lineTo(4, -54);
      ctx.stroke();
      // 裙甲（腰帶下的鋼片）
      A.shape(ctx, (c) => {
        c.moveTo(-34, -22);
        c.quadraticCurveTo(0, -12, 34, -22);
        c.lineTo(34, 0);
        c.lineTo(-34, 0);
        c.closePath();
      }, steel[1], steelD, { lw: 1.8, shadeY: -8 });
    });
    // 胸前的金色聖徽
    glow(ctx, 4, -62, 10, '255,220,120', 0.4);
    A.shape(ctx, (c) => starPath(c, 4, -62, 6, 2.6, 4, -PI / 2), gold[0], gold[1], { lw: 1.4, shadeY: -61 });
    // 金色腰帶
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-28, -26);
    ctx.quadraticCurveTo(0, -18, 28, -26);
    ctx.stroke();
    ctx.strokeStyle = A.c(gold[0]);
    ctx.lineWidth = 3.4;
    ctx.stroke();

    // 頭
    const hx = 6 + (guard ? 2 : 0);
    const hy = -84 + (wind ? 3 : 0);
    // 頭盔上的紅羽（往後飄）
    const pw = Math.sin(t * 4) * 2 + (walk ? 2 : 0) + bash * 4;
    A.shape(ctx, (c) => {
      c.moveTo(hx - 1, hy - 19);
      c.bezierCurveTo(hx - 8, hy - 32, hx - 26 - pw, hy - 30, hx - 32 - pw, hy - 13);
      c.quadraticCurveTo(hx - 22, hy - 21, hx - 8, hy - 13);
      c.closePath();
    }, cape[0], cape[1], { lw: 2.2, cel: [2, 2] });
    A.ellipse(ctx, hx, hy, 19, 16, fur[0], fur[1], { cel: [3, 3], hl: false });
    // 頭盔
    const helmP = (c) => {
      c.moveTo(hx - 20, hy + 1);
      c.bezierCurveTo(hx - 22, hy - 24, hx + 20, hy - 26, hx + 19.5, hy - 3);
      c.quadraticCurveTo(hx + 12, hy - 8.5, hx + 2, hy - 8);
      c.quadraticCurveTo(hx - 10, hy - 7.5, hx - 20, hy + 1);
      c.closePath();
    };
    A.shape(ctx, helmP, steel[0], steel[1], { cel: [3, 3], hl: [hx - 8, hy - 16, 5, 2.5], lw: 2.6 });
    // 金色帽緣與冠脊
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + 19, hy - 3.5);
    ctx.quadraticCurveTo(hx + 12, hy - 8.5, hx + 2, hy - 8);
    ctx.quadraticCurveTo(hx - 10, hy - 7.5, hx - 19.5, hy + 0.5);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = A.c(gold[0]);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx + 2, hy - 9);
    ctx.quadraticCurveTo(hx + 1, hy - 18, hx - 2, hy - 21.5);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = A.c(gold[0]);
    ctx.lineWidth = 3;
    ctx.stroke();
    // 從頭盔兩側探出來的熊耳朵
    A.ellipse(ctx, hx - 13, hy - 16, 5.5, 5.5, fur[0], fur[1], { lw: 2.2, hl: false });
    A.ellipse(ctx, hx - 13, hy - 16, 2.6, 2.6, '#ffb8c8', null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx + 11, hy - 18, 5.5, 5.5, fur[0], fur[1], { lw: 2.2, hl: false });
    A.ellipse(ctx, hx + 11, hy - 18, 2.6, 2.6, '#ffb8c8', null, { noStroke: true, hl: false });
    // 鼻口
    A.ellipse(ctx, hx + 14, hy + 4, 9.5, 7, '#ffffff', '#dfe7f3', { lw: 2.4, hl: false });
    A.ellipse(ctx, hx + 21, hy + 1, 3.2, 2.5, '#2e2838', null, { lw: 1.2, hl: false });
    const ek = eyeKind(m);
    glowEyes(ctx, hx + 2, hy - 2.5, 10, 2.6, 3.2, m, '#8fe6ff', '120,220,255', (guard || bash > 0.3) && ek === 'normal' ? 'angry' : undefined, { pupil: '#10203a', ga: 0.45 });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (bash > 0.3) {
      ctx.fillStyle = A.c('#7a2a36');
      ctx.ellipse(hx + 16, hy + 8, 3, 2.2, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.moveTo(hx + 21, hy + 3.5);
      ctx.lineTo(hx + 21, hy + 6);
      ctx.moveTo(hx + 17, hy + 7.5);
      ctx.quadraticCurveTo(hx + 21, hy + 8.5, hx + 24, hy + 6.5);
    }
    ctx.stroke();
    A.blush(ctx, hx - 1, hy + 5, 3);

    // 盾的位置：舉盾（正面擋）／放下（出招蓄力）／盾擊（往前推）
    const up = { x: 40, y: -48, r: 0 };
    const low = { x: 26, y: -36, r: 0.42 };
    const hit = { x: 50, y: -46, r: -0.12 };
    let S;
    if (guard && bash <= 0) S = up;
    else if (bash > 0) S = { x: low.x + (hit.x - low.x) * bash, y: low.y + (hit.y - low.y) * bash, r: low.r + (hit.r - low.r) * bash };
    else S = low;
    // 近側手臂（鋼鐵臂甲）握著盾
    limb(ctx, (c) => { c.moveTo(10, -58); c.quadraticCurveTo(S.x - 16, S.y - 2, S.x - 4, S.y); }, 13, steel[0]);
    A.ellipse(ctx, S.x - 5, S.y, 6.5, 5.5, steelD, null, { lw: 2, hl: false });
    // 近側肩甲（金邊）
    A.shape(ctx, (c) => c.ellipse(10, -62, 14, 10, -0.2, PI, TAU), gold[0], gold[1], { lw: 2.4, shadeY: -64, hl: [5, -68, 4, 1.8] });
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(-3.5, -59);
    ctx.lineTo(23.5, -64.5);
    ctx.stroke();
    ctx.strokeStyle = A.c(cape[0]);
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.save();
    ctx.translate(S.x, S.y);
    ctx.rotate(S.r);
    holyShield(ctx, guard && bash <= 0 ? 0.75 + Math.sin(t * 4) * 0.25 : bash, t);
    ctx.restore();
    if (bash > 0.5) {
      ctx.save();
      ctx.globalAlpha *= bash;
      speedLines(ctx, -30, -50, 50, 4, 16, t, 'rgba(255,235,170,0.9)');
      sparkle(ctx, S.x + 26, S.y - 18, 7, '#fff6c8');
      sparkle(ctx, S.x + 30, S.y + 8, 4.5, '#ffd24a');
      ctx.restore();
    }
    ctx.restore();
  }

  // ═════════════ 投射物 ═════════════
  function projAngle(p) {
    if (p.vx != null && p.vy != null && (p.vx || p.vy)) return Math.atan2(p.vy, p.vx);
    return (p.dir || 1) < 0 ? PI : 0;
  }
  // 慢速追蹤的星雲水晶光球（紫色球心、洋紅／青色漩渦、金色星屑）
  function crystalorb(ctx, p, t) {
    const a = projAngle(p);
    const seed = p.seed || 0;
    glow(ctx, 0, 0, 28, '190,110,255', 0.6);
    for (let i = 1; i <= 4; i++) {
      const q = (t * 3 + i * 0.25 + seed) % 1;
      const d = 10 + i * 6 + q * 4;
      ctx.save();
      ctx.globalAlpha *= (1 - i / 5) * (1 - q * 0.5);
      sparkle(ctx, -Math.cos(a) * d + Math.sin(t * 6 + i) * 2, -Math.sin(a) * d + Math.cos(t * 5 + i) * 2, 3.2 - i * 0.4, i % 2 ? '#fff2a0' : '#ff9cf0');
      ctx.restore();
    }
    const pul = 1 + Math.sin(t * 10 + seed) * 0.06;
    const r = 10 * pul;
    A.shape(ctx, (c) => c.arc(0, 0, r, 0, TAU), '#4b2ab4', '#311b86', { cel: [2.5, 2.5], lw: 2.4 });
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, TAU);
    ctx.clip();
    glow(ctx, 2, 2, r, '255,90,210', 0.7);
    glow(ctx, -3, -3, r * 0.8, '90,235,255', 0.6);
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 2; arm++) {
      ctx.strokeStyle = arm ? 'rgba(170,250,255,0.9)' : 'rgba(255,175,240,0.9)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const q = i / 14;
        const aa = t * 5 + arm * PI + q * PI * 2;
        const rr = r * (0.1 + q * 0.8);
        i ? ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr * 0.8) : ctx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr * 0.8);
      }
      ctx.stroke();
    }
    glow(ctx, 0, 0, 5, '255,255,255', 0.9);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-3, -4, 2.6, 1.4, -0.6, 0, TAU);
    ctx.fill();
    // 繞行的金色小環
    ctx.save();
    ctx.rotate(-0.35);
    ctx.strokeStyle = 'rgba(255,215,110,0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 4.5, 0, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 2; i++) {
      const aa = t * 4 + i * PI;
      sparkle(ctx, Math.cos(aa) * 15, Math.sin(aa) * 4.5, 2.4, '#fff2a0');
    }
    ctx.restore();
  }
  // 沿地面滾、越滾越大的雪球（照 p.r 畫；原點在球心）
  function snowball(ctx, p, t) {
    const r = Math.max(4, num(p.r, 10));
    const dir = (p.vx || p.dir || 1) < 0 ? -1 : 1;
    const rot = p.x != null ? num(p.x, 0) / r : num(p.t, t) * 6 * dir;
    // 赤紅符文的光暈＋身後揚起的雪花
    glow(ctx, 0, 0, r * 1.6, '255,45,85', 0.35);
    for (let i = 0; i < 3; i++) {
      const q = (t * 3 + i / 3 + (p.seed || 0)) % 1;
      puff(ctx, -dir * (r * 0.8 + q * r * 0.9), r * 0.7 - q * r * 0.6, r * (0.18 + q * 0.2), '#ffffff', (1 - q) * 0.85);
    }
    ctx.save();
    ctx.rotate(rot);
    A.shape(ctx, (c) => c.arc(0, 0, r, 0, TAU), '#f8fbff', '#c6d6ec', { noStroke: true, shadeY: 1e5 });
    // 表面的雪塊紋＋雪崩符文（跟著滾動）
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
    rune(ctx, r * 0.1, 0, r * 0.4, '#ff2e58', 0, Math.max(1.4, r * 0.12), '255,45,85', 1);
    ctx.strokeStyle = 'rgba(255,60,95,0.75)';
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.beginPath();
    ctx.arc(r * 0.1, 0, r * 0.62, 0, TAU);
    ctx.stroke();
    ctx.restore();
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
  // 冰錐（尖端朝前進方向）
  function icicle(ctx, p, t) {
    ctx.rotate(projAngle(p));
    glow(ctx, 0, 0, 22, '170,230,255', 0.45);
    glow(ctx, 2, 0, 12, '255,60,100', 0.4);
    // 霜氣尾巴
    for (let i = 1; i <= 3; i++) {
      const q = (t * 5 + i / 3 + (p.seed || 0)) % 1;
      ctx.save();
      ctx.globalAlpha *= (1 - q) * 0.9;
      sparkle(ctx, -14 - i * 6 - q * 6, Math.sin(i * 2.3 + t * 8) * 3, 2.4 - i * 0.4, '#e6f8ff');
      ctx.restore();
    }
    const P = (c) => poly(c, [[22, 0], [-6, -7], [-14, -3], [-11, 0], [-14, 3.5], [-6, 7]]);
    A.shape(ctx, P, '#bfe9ff', '#7cc4ee', { shadeY: 0, lw: 2.4 });
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(18, -0.8);
    ctx.lineTo(-7, -4);
    ctx.stroke();
    // 冰裡封著一縷心核的紅光
    ctx.strokeStyle = A.c('#ff4a6a');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-9, 0.5);
    ctx.lineTo(12, 0.5);
    ctx.stroke();
  }

  // ═════════════ 地面區域 ═════════════
  function zoneFade(z, inT) {
    const life = z.life || 1;
    const zt = z.t || 0;
    return Math.max(0, Math.min(1, life - zt, zt * (inT || 4)));
  }
  // 雪貂的殘影：原地浮現一隻青色半透明的幻影雪貂，最後 0.2 秒咬下去
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
    // 地上的幻術漩渦
    ctx.save();
    ctx.globalAlpha *= fadeIn * fadeOut * 0.7;
    ctx.scale(1, 0.3);
    ctx.strokeStyle = 'rgba(95,240,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const q = i / 40;
      const a = -t * 4 + q * TAU * 1.5;
      const r = 8 + q * 30;
      i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.restore();
    ctx.scale((z.dir || 1) < 0 ? -1 : 1, 1);
    if (bite) ctx.translate((1 - left / 0.2) * 12, 0);
    const ga = (0.6 + Math.sin(t * 20) * 0.06) * fadeIn * fadeOut;
    const fake = {
      t: t,
      fx: { dash: bite },
      attackPhase: bite ? 'strike' : windUp ? 'wind' : null,
      hurtT: 0,
      state: 'idle',
      vx: 0,
      onGround: true,
    };
    ghostDraw(ctx, FERRET_BOX, ga, (g) => withTint('#3ee6ff', 0.62, () => ferretPose(g, fake, { step: 0, stretch: bite ? 1 : 0, crouch: windUp ? 1 : 0, bite: bite, echo: false })));
    ctx.restore();
  }
  // 戰鼓的金紅符文震波（z.r 半寬會變大）
  function runewave(ctx, z, t) {
    const fade = zoneFade(z, 10);
    if (fade <= 0) return;
    const r = z.r || 30;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= fade;
    // 地面發光線＋一路留下的符文
    const g = ctx.createLinearGradient(-r, 0, r, 0);
    g.addColorStop(0, 'rgba(255,170,60,0.85)');
    g.addColorStop(0.5, 'rgba(255,170,60,0.15)');
    g.addColorStop(1, 'rgba(255,170,60,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -1, r, 3.5, 0, 0, TAU);
    ctx.fill();
    const n = Math.max(1, Math.floor(r / 26));
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 1; i <= n; i++) {
        const x = s * (r - i * 26);
        if (s * x < 6) continue;
        const a = Math.max(0, 1 - i / (n + 1));
        ctx.save();
        ctx.globalAlpha *= a;
        rune(ctx, x, -7, 4.5, '#ffd24a', i + (s > 0 ? 2 : 0), 1.8, '255,170,60', 0.9);
        ctx.restore();
      }
    }
    // 兩側的冰浪
    for (let s = -1; s <= 1; s += 2) {
      ctx.save();
      ctx.translate(s * r, 0);
      ctx.scale(s, 1);
      const h = 28;
      const wg = ctx.createLinearGradient(0, -h * 1.3, 0, 0);
      wg.addColorStop(0, 'rgba(255,240,190,0)');
      wg.addColorStop(0.4, 'rgba(255,190,80,0.85)');
      wg.addColorStop(1, 'rgba(210,40,60,0.95)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.quadraticCurveTo(-4, -h * 1.5, 12, 0);
      ctx.closePath();
      ctx.fill();
      // 冰晶尖刺
      for (let i = 0; i < 3; i++) {
        const x = -14 + i * 8;
        const hh = 10 + ((i + 1) % 3) * 5 + Math.sin(t * 12 + i) * 1.5;
        A.shape(ctx, (c) => poly(c, [[x - 3.2, 0], [x + 0.5, -hh], [x + 3.2, 0]]), '#ffe07a', '#e0782a', { lw: 1.6, shadeY: -hh * 0.3 });
      }
      ctx.strokeStyle = 'rgba(255,248,210,0.95)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-20, -6);
      ctx.quadraticCurveTo(-2, -h * 1.25, 10, -3);
      ctx.stroke();
      // 冰屑
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha *= 1 - q;
        sparkle(ctx, -4 + i * 6 - q * 10, -6 - Math.sin(q * PI) * (18 + i * 5), 3.2, i % 2 ? '#fff2a0' : '#ffb04a');
        ctx.restore();
      }
      rune(ctx, 2, -h * 0.55, 5.5, '#fffbe6', s > 0 ? 0 : 3, 2, '255,170,60', 1);
      ctx.restore();
    }
    ctx.restore();
  }
  // 影縛狼的影子：貼地滑行（z.x 移動中），z.bite 0..1 時從地上冒出來咬合
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
      glow(ctx, 0, -h * 0.5, h * 0.9 + 10, '150,80,255', 0.5);
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
  // 紫色夢霧（z.r 半徑）
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
      g.addColorStop(0, 'rgba(200,170,255,0.55)');
      g.addColorStop(0.6, 'rgba(170,130,240,0.3)');
      g.addColorStop(1, 'rgba(150,110,230,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, TAU);
      ctx.fill();
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
  // 封印結界：地上的封印圓陣＋浮起的符紙（z.r 半徑）
  function sealfield(ctx, z, t) {
    const fade = zoneFade(z, 4);
    if (fade <= 0) return;
    const r = z.r || 80;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= fade;
    // 淡淡的光柱
    ctx.save();
    ctx.scale(1, 0.8);
    const pg = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
    pg.addColorStop(0, 'rgba(255,120,130,0.22)');
    pg.addColorStop(1, 'rgba(255,120,130,0)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(0, 0, r, PI, TAU);
    ctx.fill();
    ctx.restore();
    const back = [];
    const front = [];
    const nt = Math.max(5, Math.round(r / 16));
    for (let i = 0; i < nt; i++) {
      const a = t * 0.6 + (i / nt) * TAU;
      (Math.sin(a) < 0 ? back : front).push([i, a]);
    }
    const paper = (i, a) => {
      const q = (t * 0.5 + i * 0.37) % 1;
      const x = Math.cos(a) * r * 0.9;
      const y = Math.sin(a) * r * 0.25 - 12 - Math.sin(q * PI) * r * 0.3 - 6;
      talisman(ctx, x, y, 8, 16, Math.sin(t * 2 + i) * 0.25, '#fff1b8', '#d8364a', '255,110,110', 0.35, i);
    };
    back.forEach((b) => paper(b[0], b[1]));
    // 地上的法陣（壓扁的圓）
    ctx.save();
    ctx.scale(1, 0.28);
    glow(ctx, 0, 0, r * 1.1, '255,90,100', 0.3);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(230,60,80,0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,90,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    starPath(ctx, 0, 0, r * 0.8, r * 0.32, 5, -t * 0.4 - PI / 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, TAU);
    ctx.stroke();
    // 兩圈之間的符文
    const nr = Math.max(6, Math.round(r / 12));
    for (let i = 0; i < nr; i++) {
      const a = t * 0.4 + (i / nr) * TAU;
      const x = Math.cos(a) * r * 0.91;
      const y = Math.sin(a) * r * 0.91;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 2.2);
      rune(ctx, 0, 0, 3.2, '#ff7a8a', i, 1.6);
      ctx.restore();
    }
    ctx.restore();
    front.forEach((f) => paper(f[0], f[1]));
    ctx.restore();
  }

  // ═════════════ 素材圖示（掉落物） ═════════════
  const ICON5 = {
    // 幻術寶石：青色菱形寶石，後面拖著青色殘影
    phantomgem(ctx) {
      const gem = (x, y) => (c) => poly(c, [[x, y - 13], [x + 9, y - 3], [x, y + 12], [x - 9, y - 3]]);
      ctx.save();
      ctx.globalAlpha *= 0.4;
      A.shape(ctx, gem(-6, 1), '#8a64e0', null, { lw: 1.8 });
      ctx.restore();
      glow(ctx, 3, 0, 17, '95,240,255', 0.55);
      A.shape(ctx, gem(3, 0), '#6ff4ff', '#20a8dc', { cel: [2.5, 2.5], lw: 2.4 });
      ctx.strokeStyle = A.c('#e0fdff');
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo(12, -3);
      ctx.moveTo(3, -13);
      ctx.lineTo(0, -3);
      ctx.lineTo(3, 12);
      ctx.stroke();
      sparkle(ctx, 11, -11, 3.5, '#ffffff');
    },
    // 占卜水晶：金座上的紫色星雲水晶球
    owlcrystal(ctx) {
      A.shape(ctx, (c) => {
        c.moveTo(-10, 13);
        c.lineTo(-7, 6);
        c.lineTo(7, 6);
        c.lineTo(10, 13);
        c.closePath();
      }, '#ffd24a', '#d99a2a', { lw: 2, shadeY: 10 });
      glow(ctx, 0, -4, 19, '190,110,255', 0.55);
      A.shape(ctx, (c) => c.arc(0, -4, 11, 0, TAU), '#4b2ab4', '#311b86', { cel: [2.5, 2.5], lw: 2.4 });
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -4, 10, 0, TAU);
      ctx.clip();
      glow(ctx, 2, -2, 10, '255,90,210', 0.7);
      glow(ctx, -3, -7, 8, '90,235,255', 0.6);
      ctx.restore();
      sparkle(ctx, 2, -3, 4, '#ffffff');
      sparkle(ctx, -4, 1, 2, '#fff2a0');
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(-4, -9, 3, 1.6, -0.6, 0, TAU);
      ctx.fill();
    },
    // 雪崩符紙：赤紅符紙＋金色咒文，旁邊一片雪花
    runepaper(ctx) {
      glow(ctx, 0, 0, 17, '255,45,85', 0.45);
      ctx.save();
      ctx.rotate(-0.25);
      A.shape(ctx, (c) => c.rect(-7, -14, 14, 28), '#d8283e', '#a01c30', { lw: 2, shadeY: 8 });
      ctx.strokeStyle = A.c('#ffd24a');
      ctx.lineWidth = 1.1;
      ctx.strokeRect(-5, -12, 10, 24);
      rune(ctx, 0, -4, 5, '#ffd24a', 4, 1.8);
      rune(ctx, 0, 7, 3.2, '#fff2c0', 3, 1.5);
      ctx.restore();
      snowflake(ctx, 10, -11, 5, '#bfe6ff', 1.6);
    },
    // 符文鼓皮：一片赤紅鼓皮，青銅邊、金繩，中央金色符文
    drumskin(ctx) {
      A.shape(ctx, (c) => c.ellipse(0, 1, 14, 12, 0, 0, TAU), '#e2a444', '#a86a24', { cel: [2.5, 2.5], lw: 2.4 });
      A.shape(ctx, (c) => c.ellipse(0, 1, 10, 8.5, 0, 0, TAU), '#c8283c', '#8c1828', { cel: [1.8, 1.8], lw: 1.8 });
      ctx.strokeStyle = A.c('#fff0b0');
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * TAU;
        const r = i % 2 ? 1 : 0.8;
        const x = Math.cos(a) * 13 * r;
        const y = 1 + Math.sin(a) * 11 * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      glow(ctx, 0, 1, 10, '255,190,70', 0.7);
      rune(ctx, 0, 1, 4.5, '#ffd24a', 0, 2, '255,190,70', 0.9);
    },
    // 影狼毛：一撮紫黑色的狼毛，冒著影子的火苗
    shadowfur(ctx) {
      glow(ctx, 0, 0, 15, '140,90,230', 0.45);
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
      }, '#3a2c62', '#2a1e46', { cel: [2, 2], lw: 2.2 });
      ctx.strokeStyle = A.c('#8a6ad8');
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.quadraticCurveTo(-5, 0, -2, -4);
      ctx.moveTo(2, 8);
      ctx.quadraticCurveTo(3, 0, 6, -5);
      ctx.stroke();
      ctx.fillStyle = '#e6d0ff';
      ctx.beginPath();
      ctx.ellipse(-2, 3, 1.6, 1, -0.2, 0, TAU);
      ctx.ellipse(3, 2.5, 1.6, 1, 0.2, 0, TAU);
      ctx.fill();
    },
    // 夢咒羊毛：紫色夢雲毛球＋小月亮＋Z
    dreamwool(ctx) {
      cloud(ctx, [[-6, 2, 8], [3, -3, 9], [8, 5, 7], [-1, 7, 7], [-9, 8, 5]], '#c4aaf2', '#9476d8', 2.2, 2.5);
      crescent(ctx, 0, 1, 4.5, '#ffe38a', 1.4);
      zGlyph(ctx, 10, -12, 5.5, '#efe6ff');
      sparkle(ctx, -10, -6, 2.5, '#fff6c0');
    },
    // 封印符：黃色封印符紙，紅色封印圓＋紅繩流蘇
    sealtalisman(ctx) {
      glow(ctx, 0, 0, 16, '255,110,110', 0.35);
      talisman(ctx, 0, -1, 13, 26, 0.18, '#fff1b8', '#d8364a', null, 0, 2);
      ctx.save();
      ctx.rotate(0.18);
      A.shape(ctx, (c) => c.arc(0, -4, 4, 0, TAU), '#e8506a', null, { lw: 1.4 });
      ctx.strokeStyle = A.c('#fff1b8');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, -4);
      ctx.lineTo(2, -4);
      ctx.moveTo(0, -6);
      ctx.lineTo(0, -2);
      ctx.stroke();
      limb(ctx, (c) => { c.moveTo(0, 12); c.quadraticCurveTo(2, 15, 0, 17); }, 3.5, '#d8364a');
      ctx.restore();
    },
    // 生命水晶：心形水晶
    lifecrystal(ctx) {
      glow(ctx, 0, 0, 18, '255,120,170', 0.5);
      crystalHeart(ctx, 0, 1, 12, 2.4);
      sparkle(ctx, 11, -11, 3.5, '#ffffff');
    },
    // 聖盾碎片：寶藍琺瑯的碎片，一邊是金色盾緣，上面還留著一角聖十字
    shieldshard(ctx) {
      const P = (c) => poly(c, [[-13, 11], [-9, -12], [4, -14], [13, 4], [4, 13]]);
      glow(ctx, 2, 0, 17, '255,225,130', 0.4);
      A.shape(ctx, P, '#2f5ccc', '#1d3c94', { cel: [3, 3], lw: 2.4 });
      ctx.save();
      ctx.beginPath();
      P(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#ffd24a');
      ctx.beginPath();
      poly(ctx, [[-16, 13], [-12, -14], [-6, -14], [-10, 13]]);
      ctx.fill();
      A.shape(ctx, (c) => {
        c.moveTo(3, -16);
        c.lineTo(8, -16);
        c.lineTo(8, -2);
        c.lineTo(18, -2);
        c.lineTo(18, 3);
        c.lineTo(8, 3);
        c.lineTo(8, 16);
        c.lineTo(3, 16);
        c.closePath();
      }, '#fff2b0', '#e8b43a', { lw: 1.4, shadeY: 1 });
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      poly(ctx, [[-6, 8], [-3, -10], [1, -11], [-2, 8]]);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      P(ctx);
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      sparkle(ctx, 10, -11, 3.5, '#fff6c8');
    },
  };

  Object.assign(A.MONSTER_DRAW, { echoferret, crystalowl, avalanchehare, drumyak, shadowwolf, dreamsheep, silencefox, heartcedar, shieldbear });
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  Object.assign(A.PROJ_DRAW, { crystalorb, snowball, icicle });
  Object.assign(A.ZONE_DRAW, { echoghost, runewave, wolfshadow, sleepfog, sealfield });
  if (A.ICON) Object.assign(A.ICON, ICON5);
})();
