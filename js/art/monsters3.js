// 第二章新怪物（潮風海岬）：自然物 ＋ 一個不相干的物件。
// 註冊到 A.MONSTER_DRAW／A.PROJ_DRAW／A.ZONE_DRAW／A.ICON。
// 風格同 monsters2.js：平塗、深棕描邊、右下月牙陰影、左上亮點、Q 版大眼。原點在腳底中央、面向右。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const PI = Math.PI;
  const TAU = PI * 2;

  // ───────────── 共用小工具 ─────────────
  function num(v, d) {
    return typeof v === 'number' && isFinite(v) ? v : d;
  }
  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  function eyeKind(m) {
    return m.dead ? 'x' : m.hurtT > 0 ? 'hurt' : m.angry ? 'angry' : m.blink ? 'closed' : 'normal';
  }
  function faceEyes(ctx, x, y, gap, rx, ry, m, kind) {
    kind = kind || eyeKind(m);
    A.eye(ctx, x, y, rx, ry, kind, 0.8);
    A.eye(ctx, x + gap, y - 0.5, rx * 0.92, ry * 0.95, kind, 0.8);
  }
  function stalkEye(ctx, x, y, r, m, kind) {
    kind = kind || eyeKind(m);
    A.ellipse(ctx, x, y, r, r, '#ffffff', null, { lw: 2.2, hl: false });
    if (kind === 'x') A.eye(ctx, x, y, r * 0.45, r * 0.45, 'x');
    else if (kind === 'closed') A.eye(ctx, x, y + 1, r * 0.55, r * 0.4, 'closed');
    else if (kind === 'hurt') A.eye(ctx, x, y, r * 0.5, r * 0.62, 'hurt');
    else A.eye(ctx, x + r * 0.2, y + r * 0.1, r * 0.52, r * 0.64, kind === 'angry' ? 'angry' : 'normal', 0);
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
  function line(ctx, pts, col, w) {
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = w || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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
  function poly(c, pts) {
    pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath();
  }
  function glow(ctx, x, y, r, rgb, a) {
    if (!(a > 0)) return;
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function walking(m) {
    return !!m.onGround && Math.abs(m.vx || 0) > 5;
  }
  function starPath(c, x, y, R, r, n, rot, sy) {
    sy = sy || 1;
    for (let i = 0; i < n * 2; i++) {
      const rr = i % 2 ? r : R;
      const a = rot + (i / (n * 2)) * TAU;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * sy;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
  }
  // 文字不跟著怪物左右翻轉（積木上的字母才不會變成鏡像）
  function uprightText(ctx, text, x, y) {
    const tr = ctx.getTransform();
    if (tr.a * tr.d - tr.b * tr.c < 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    } else ctx.fillText(text, x, y);
  }
  function sparkle(ctx, x, y, r, col) {
    A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.35, 4, 0), col || '#ffffff', null, { noStroke: true, hl: false });
  }
  function bolt(ctx, x0, y0, x1, y1, seed, col) {
    ctx.strokeStyle = A.c(col || '#fff27a');
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    const n = 3;
    for (let i = 1; i < n; i++) {
      const k = i / n;
      const off = (i % 2 ? 1 : -1) * 3.5 * (0.6 + 0.4 * Math.sin(seed * 7 + i));
      const nx = -(y1 - y0);
      const ny = x1 - x0;
      const L = Math.hypot(nx, ny) || 1;
      ctx.lineTo(x0 + (x1 - x0) * k + (nx / L) * off, y0 + (y1 - y0) * k + (ny / L) * off);
    }
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  // 八分音符（♪）
  function noteGlyph(ctx, x, y, s, col, sh) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    limb(ctx, (c) => { c.moveTo(3.2, 2); c.lineTo(3.2, -11); }, 3.8, col);
    A.shape(ctx, (c) => { c.moveTo(3.2, -11); c.quadraticCurveTo(10, -8, 8.5, -2); c.quadraticCurveTo(8, -6, 3.2, -6.5); c.closePath(); }, col, null, { lw: 1.8, hl: false });
    A.ellipse(ctx, -0.5, 3, 4.4, 3.4, col, sh, { rot: -0.4, lw: 2, hl: [-2, 1.5, 1.4, 0.9] });
    ctx.restore();
  }
  // 螯：掌 + 上下兩根鉗指，open 0~1
  function claw(ctx, x, y, r, open, col, sh, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    const lw = 2.4;
    const finger = (flip, len, w, ang) => {
      ctx.save();
      ctx.translate(r * 0.5, flip * r * 0.12);
      ctx.scale(1, flip);
      ctx.rotate(ang);
      A.shape(ctx, (c) => {
        c.moveTo(-r * 0.1, -w);
        c.quadraticCurveTo(len * 0.75, -w * 1.25, len, w * 0.15);
        c.quadraticCurveTo(len * 0.55, w * 0.1, -r * 0.1, w * 0.7);
        c.closePath();
      }, col, flip > 0 ? null : sh, { lw, shadeY: w * 0.2 });
      ctx.restore();
    };
    finger(1, r * 1.2, r * 0.46, 0.1 - open * 0.55);
    finger(-1, r * 1.45, r * 0.56, 0.02 - open * 0.65);
    A.ellipse(ctx, 0, 0, r * 0.9, r * 0.74, col, sh, { cel: [r * 0.18, r * 0.18], hl: [-r * 0.3, -r * 0.3, r * 0.25, r * 0.14] });
    ctx.restore();
  }
  // 小信封（郵筒口、投射物、圖示共用），中心在原點
  function envelope(ctx, w, h, seal) {
    A.shape(ctx, (c) => A.roundRect(c, -w / 2, -h / 2, w, h, 2), '#fff8e6', '#eadcbc', { lw: 2, shadeY: h * 0.2, hl: false });
    line(ctx, [[-w / 2 + 1.5, -h / 2 + 1.5], [0, h * 0.12], [w / 2 - 1.5, -h / 2 + 1.5]], '#c8b48a', 1.5);
    if (seal) A.ellipse(ctx, 0, h * 0.12, h * 0.2, h * 0.2, '#e8433a', null, { lw: 1.4, hl: false });
  }

  // ═════════════ 第二章：潮風海岬（新） ═════════════

  // ── 郵差寄居蟹：寄居蟹 ＋ 紅色郵筒當殼 ──
  function postcrab(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const throwing = clamp01(num(fx.throwing, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const bob = walk ? Math.abs(Math.sin(t * 14)) * 1.6 : Math.sin(t * 2.6) * 0.7;
    let lean = walk ? Math.sin(t * 14) * 0.04 : Math.sin(t * 1.6) * 0.025;
    if (ph === 'wind') lean -= 0.16;
    else if (ph === 'strike' || ph === 'recover') lean += 0.12;
    lean += throwing * 0.08;
    if (hurt) lean -= 0.12 + Math.sin(t * 40) * 0.04;
    const open = Math.max(throwing, ph === 'wind' ? 0.45 : ph === 'strike' ? 1 : 0);
    const cr = ['#f7b98a', '#dc8a56'];
    const by = -11 - bob;

    // 遠側的腳
    for (let i = 0; i < 2; i++) {
      const ph2 = t * 14 + i * 2.4 + 1;
      const lift = walk ? Math.max(0, Math.sin(ph2)) * 3 : 0;
      limb(ctx, (c) => { c.moveTo(2 + i * 6, by + 2); c.lineTo(-2 + i * 9, by - 2); c.lineTo(-6 + i * 10 + (walk ? Math.cos(ph2) * 1.5 : 0), -1 - lift); }, 4.4, cr[1]);
    }

    // 郵筒殼（以底部為支點傾斜）
    ctx.save();
    ctx.translate(-11, -3 - bob * 0.6);
    ctx.rotate(lean);
    const box = (c) => {
      c.moveTo(-14, 0);
      c.lineTo(-14, -30);
      c.bezierCurveTo(-14, -45, 14, -45, 14, -30);
      c.lineTo(14, 0);
      c.quadraticCurveTo(0, 3, -14, 0);
      c.closePath();
    };
    A.shape(ctx, box, '#e8433a', '#b9302b', { cel: [4, 3], hl: [-8, -36, 3.5, 2.2] });
    // 圓頂下緣的帽簷
    A.shape(ctx, (c) => A.roundRect(c, -16, -32, 32, 5, 2.5), '#c9352f', '#a82a26', { lw: 2.2, shadeY: -29.5, hl: false });
    // 頂上的小圓鈕
    A.ellipse(ctx, 0, -42.5, 3.4, 2.4, '#c9352f', null, { lw: 2, hl: false });
    // 投信口與蓋板
    const slotH = 2.6 + open * 4;
    A.shape(ctx, (c) => A.roundRect(c, -9, -23, 18, slotH, 1.3), '#3a1a18', null, { lw: 2 });
    if (open > 0.25) {
      // 從投信口探出來的信封
      ctx.save();
      ctx.translate(-1 + open * 3, -24 - open * 5);
      ctx.rotate(-0.15 - open * 0.25);
      envelope(ctx, 14, 9, true);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(0, -23);
    ctx.rotate(0);
    ctx.scale(1, 1 - open * 1.6);
    A.shape(ctx, (c) => A.roundRect(c, -10, -3.2, 20, 3.4, 1.4), '#f06a58', null, { lw: 1.8, hl: false });
    ctx.restore();
    // 郵徽牌：白底紅色〒
    A.shape(ctx, (c) => A.roundRect(c, -7, -15, 14, 10, 2), '#fff6e8', '#e8dcc8', { lw: 2, shadeY: -8, hl: false });
    line(ctx, [[-4, -12.5], [4, -12.5]], '#e8433a', 1.8);
    line(ctx, [[-4, -10], [4, -10], [0, -10], [0, -6.8]], '#e8433a', 1.8);
    // 底座
    A.shape(ctx, (c) => A.roundRect(c, -15.5, -4, 31, 5, 2), '#5a3a36', null, { lw: 2, hl: false });
    ctx.restore();

    // 近側的腳（在身體後面探出來）
    for (let i = 0; i < 3; i++) {
      const ph2 = t * 14 + i * 2.1;
      const lift = walk ? Math.max(0, Math.sin(ph2)) * 3.2 : 0;
      const x0 = 3 + i * 6;
      limb(ctx, (c) => { c.moveTo(x0, by + 3); c.lineTo(x0 + 5, by + 5); c.lineTo(x0 + 7 + (walk ? Math.cos(ph2) * 1.6 : 0), -1 - lift); }, 4.8, cr[0]);
    }
    // 後面的小螯
    limb(ctx, (c) => { c.moveTo(14, by - 4); c.lineTo(20, by - 12); }, 4.6, cr[1]);
    claw(ctx, 21, by - 14, 4.4, open * 0.6 + 0.2, cr[1], '#c4764a', -1.3);

    // 眼柄
    const wob = Math.sin(t * 3.4) * 1.1 + (hurt ? -2 : 0);
    limb(ctx, (c) => { c.moveTo(6, by - 8); c.lineTo(4 + wob, by - 19); c.moveTo(14, by - 9); c.lineTo(15 + wob, by - 19); }, 4.2, cr[0]);

    // 身體（從郵筒前緣鑽出來的圓胖頭胸）
    A.ellipse(ctx, 11, by - 1, 12.5, 9.5, cr[0], cr[1], { cel: [3, 3], hl: [4, by - 6, 3.2, 1.8] });
    ctx.strokeStyle = A.c(cr[1]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, by + 5);
    ctx.quadraticCurveTo(4, by + 2.5, 8, by + 5);
    ctx.stroke();

    stalkEye(ctx, 4 + wob, by - 21, 4.8, m);
    stalkEye(ctx, 15 + wob, by - 21, 4.5, m);
    smallMouth(ctx, 13, by + 1, hurt || ph === 'strike' || throwing > 0.5, 0.8);
    A.blush(ctx, 5, by + 1.5, 2.6);
    A.blush(ctx, 19, by + 0.5, 2.4);

    // 前面的大螯
    let cOpen = 0.35 + Math.sin(t * 4.5) * 0.12;
    let cRot = -0.55;
    if (ph === 'wind') { cOpen = 0.95; cRot = -1.2; }
    else if (ph === 'strike') { cOpen = 0.05; cRot = 0.1; }
    if (throwing > 0.5) cRot -= 0.4;
    limb(ctx, (c) => { c.moveTo(17, by + 3); c.lineTo(24, by); }, 5.2, cr[1]);
    claw(ctx, 26, by - 1, 7.4, cOpen, cr[0], cr[1], cRot);
  }

  // ── 燈泡水母：水母 ＋ 燈泡（傘是燈泡、觸手是電線） ──
  function bulbjelly(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const off = clamp01(num(fx.lightOff, 0));
    const fl = clamp01(num(fx.flash, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    let flick = 1;
    if (ph === 'wind') flick = 0.55 + 0.45 * Math.abs(Math.sin(t * 38));
    if (hurt) flick *= 0.7 + 0.3 * Math.abs(Math.sin(t * 50));
    const lit = (1 - off) * flick;
    const fy = Math.sin(t * 2.4) * 3;
    const pulse = 1 + Math.sin(t * 4.8) * 0.035;
    const cy = -46 - fy;

    // 光暈
    glow(ctx, 0, cy - 3, 48, '255,238,150', 0.55 * lit + fl * 0.4);
    if (fl > 0) {
      // 重新亮起的一瞬間：一圈電光與放射線
      ctx.save();
      ctx.globalAlpha *= fl;
      const R = 26 + (1 - fl) * 26;
      ctx.strokeStyle = A.c('#fff6a0');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, cy - 2, R, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        bolt(ctx, Math.cos(a) * (R - 8), cy - 2 + Math.sin(a) * (R - 8), Math.cos(a) * (R + 8), cy - 2 + Math.sin(a) * (R + 8), i + t);
      }
      ctx.restore();
    }

    // 電線觸手（從荷葉邊底下垂出來，尾端捲起）
    const neckY = cy + 25;
    const cords = [
      [-10, '#3e3848', 0],
      [-4, '#e8503a', 0],
      [3, '#3a8ad8', 0],
      [9, '#3e3848', 1],
    ];
    cords.forEach(([x, col, plug], i) => {
      const ph2 = t * 3.2 + i * 1.4;
      const s1 = Math.sin(ph2) * 4;
      const s2 = Math.sin(ph2 + 1.8) * 3;
      const ex = x * 1.35 + s2;
      const ey = -6 - (i % 2) * 3 + Math.sin(ph2 + 0.8) * 1.5;
      const curl = i < 2 ? -1 : 1;
      limb(ctx, (c) => {
        c.moveTo(x * 0.6, neckY - 3);
        c.bezierCurveTo(x + s1, neckY + 6, x * 1.3 - s1, ey - 8, ex, ey);
        if (!plug) c.quadraticCurveTo(ex + curl * 4, ey + 3, ex + curl * 3, ey - 2);
      }, 4.2, col);
      if (plug) {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(s2 * 0.05);
        line(ctx, [[-1.8, 3], [-1.8, 7]], '#d8dce4', 2);
        line(ctx, [[1.8, 3], [1.8, 7]], '#d8dce4', 2);
        A.shape(ctx, (c) => A.roundRect(c, -3.8, -1, 7.6, 5, 1.5), '#3e3848', null, { lw: 1.8, hl: false });
        ctx.restore();
      } else if (i === 1 && lit > 0.3 && Math.sin(t * 7) > 0.2) {
        sparkle(ctx, ex - 3, ey - 3, 3.5, '#fff27a');
      }
    });

    // 螺口燈座
    A.shape(ctx, (c) => A.roundRect(c, -8, cy + 11, 16, 11, 2.5), '#cfd4de', '#9ea6b6', { cel: [2, 2], lw: 2.2, hl: false });
    ctx.strokeStyle = A.c('#8a92a4');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(-7, cy + 13.5 + i * 3);
      ctx.lineTo(7, cy + 12 + i * 3);
    }
    ctx.stroke();

    // 水母的荷葉邊（傘緣），套在燈座下面
    ctx.save();
    ctx.translate(0, cy + 23);
    ctx.scale(pulse, 1);
    ctx.globalAlpha *= 1 - off * 0.3;
    A.shape(ctx, (c) => {
      const n = 6;
      const W = 17;
      c.moveTo(-W, 0);
      c.quadraticCurveTo(-W + 2, -6, -8, -6);
      c.lineTo(8, -6);
      c.quadraticCurveTo(W - 2, -6, W, 0);
      for (let i = 0; i < n; i++) {
        const x0 = W - (i / n) * 2 * W;
        const x1 = W - ((i + 1) / n) * 2 * W;
        c.quadraticCurveTo((x0 + x1) / 2, 7 + Math.sin(t * 5 + i) * 1.5, x1, 0);
      }
      c.closePath();
    }, U.mix('#bfe8ff', '#9aa6b8', off), U.mix('#8ccaf0', '#7a8698', off), { lw: 2.2, shadeY: 1, hl: false });
    ctx.restore();

    // 燈泡（傘）
    ctx.save();
    ctx.translate(0, cy);
    ctx.scale(pulse, 2 - pulse);
    const bulb = (c) => {
      c.moveTo(-8, 12);
      c.bezierCurveTo(-9, 6, -20, 3, -20, -7);
      c.bezierCurveTo(-20, -18, -11, -23, 0, -23);
      c.bezierCurveTo(11, -23, 20, -18, 20, -7);
      c.bezierCurveTo(20, 3, 9, 6, 8, 12);
      c.closePath();
    };
    const gFill = U.mix(U.mix('#fff4b0', '#fffce8', fl), '#aab0bc', off);
    const gShade = U.mix('#ffd968', '#8c93a2', off);
    ctx.save();
    ctx.globalAlpha *= 1 - off * 0.55;
    A.shape(ctx, bulb, gFill, gShade, { cel: [3.5, 3], noStroke: true });
    ctx.restore();
    // 燈絲：兩根支架＋頂端的發光螺旋
    const filCol = lit > 0.2 ? U.mix('#ff9a2a', '#ffffff', fl) : '#6a6a74';
    ctx.strokeStyle = A.c('#9a9aa4');
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, 11);
    ctx.lineTo(-5, -12);
    ctx.moveTo(3, 11);
    ctx.lineTo(5, -12);
    ctx.stroke();
    if (lit > 0.2) glow(ctx, 0, -13, 10, '255,200,90', 0.9 * lit);
    ctx.strokeStyle = A.c(filCol);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const x = -5 + (i / 12) * 10;
      const y = -12.5 + Math.sin(i * PI * 0.5) * -2.4;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    // 玻璃反光與描邊
    ctx.save();
    ctx.globalAlpha *= 0.75 * (1 - off * 0.5);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-12, -10, 2.6, 6, 0.35, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-9, -18, 1.6, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    bulb(ctx);
    ctx.lineWidth = A.LW;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    ctx.restore();

    // 臉
    let kind = eyeKind(m);
    if (kind === 'normal' && off > 0.6) kind = 'closed';
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    faceEyes(ctx, -5, cy - 1, 10, 3.2, 4.3, m, kind);
    smallMouth(ctx, 0.5, cy + 6.5, hurt || ph === 'strike', 0.8);
    if (off < 0.6) {
      A.blush(ctx, -11, cy + 4, 2.8);
      A.blush(ctx, 11, cy + 3.5, 2.6);
    } else {
      // 熄燈時的 zZ
      ctx.save();
      ctx.globalAlpha *= (off - 0.6) / 0.4;
      ctx.fillStyle = A.c('#9aa6c8');
      ctx.font = 'bold 9px ' + A.NUMFONT;
      ctx.textAlign = 'center';
      uprightText(ctx, 'z', 17, cy - 22 - (t * 6) % 6);
      ctx.restore();
    }

    if (ph === 'strike' || (ph === 'wind' && Math.sin(t * 30) > 0)) {
      for (let i = 0; i < 4; i++) {
        const a = t * 7 + (i * TAU) / 4;
        const r0 = 24;
        bolt(ctx, Math.cos(a) * r0, cy - 4 + Math.sin(a) * r0, Math.cos(a) * (r0 + 11), cy - 4 + Math.sin(a) * (r0 + 11), t * 3 + i);
      }
    }
  }

  // ── 雨傘海鷗：海鷗 ＋ 撐開的雨傘 ──
  function umbrellagull(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const glide = !!fx.gliding;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const air = !!(m.hover > 1) || !m.onGround;
    const walk = walking(m);
    const umb = ['#9468e0', '#744cc0'];
    const umb2 = ['#f4e6ff', '#d4bff0'];
    const white = ['#fbf8f0', '#ddd6c6'];
    const wingC = ['#b4bcca', '#949eae'];

    ctx.save();
    if (glide) {
      // 掛在傘下像鐘擺一樣晃
      ctx.translate(3, -46);
      ctx.rotate(Math.sin(t * 2.2) * 0.1);
      ctx.translate(-3, 46);
    } else if (ph === 'strike') {
      ctx.rotate(0.25);
    } else if (walk) {
      ctx.rotate(Math.sin(t * 12) * 0.06);
    }

    const flapSpd = ph === 'wind' ? 22 : 13;
    const flap = glide ? 0 : air ? Math.sin(t * flapSpd) : 0;
    const dangle = glide ? Math.sin(t * 2.2 + 0.6) * 2 : 0;

    // 撐開的傘（在最後面）
    if (glide) {
      const top = [2, -70];
      const rimY = -52;
      const W = 29;
      const can = (c) => {
        c.moveTo(-W + 2, rimY);
        c.bezierCurveTo(-W, rimY - 18, W + 4, rimY - 18, W + 2 + 2, rimY);
        const n = 6;
        for (let i = 0; i < n; i++) {
          const x0 = W + 4 - (i / n) * (2 * W + 2);
          const x1 = W + 4 - ((i + 1) / n) * (2 * W + 2);
          c.quadraticCurveTo((x0 + x1) / 2, rimY - 5, x1, rimY);
        }
        c.closePath();
      };
      // 傘柄
      limb(ctx, (c) => { c.moveTo(top[0], rimY - 8); c.lineTo(-3, -47); }, 4, '#6a5a70');
      A.shape(ctx, can, umb[0], umb[1], { noStroke: true });
      ctx.save();
      ctx.beginPath();
      can(ctx);
      ctx.clip();
      for (let i = 0; i < 6; i++) {
        if (i % 2) continue;
        const x0 = W + 4 - (i / 6) * (2 * W + 2);
        const x1 = W + 4 - ((i + 1) / 6) * (2 * W + 2);
        ctx.fillStyle = A.c(i < 3 ? umb2[0] : umb2[1]);
        ctx.beginPath();
        ctx.moveTo(top[0], top[1] + 4);
        ctx.lineTo(x0, rimY + 2);
        ctx.lineTo(x1, rimY + 2);
        ctx.closePath();
        ctx.fill();
      }
      // 右下的陰影
      ctx.fillStyle = 'rgba(60,30,90,0.18)';
      ctx.beginPath();
      ctx.moveTo(W + 10, rimY - 20);
      ctx.quadraticCurveTo(W - 8, rimY - 6, -W, rimY + 2);
      ctx.lineTo(W + 10, rimY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(-12, rimY - 12, 6, 2.2, -0.35, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 1; i < 6; i++) {
        const x = W + 4 - (i / 6) * (2 * W + 2);
        ctx.moveTo(top[0], top[1] + 4);
        ctx.quadraticCurveTo(x * 0.8 + top[0] * 0.2, rimY - 8, x, rimY);
      }
      ctx.stroke();
      ctx.beginPath();
      can(ctx);
      ctx.lineWidth = 2.8;
      ctx.lineJoin = 'round';
      ctx.stroke();
      limb(ctx, (c) => { c.moveTo(top[0], top[1] + 3); c.lineTo(top[0], top[1] - 3); }, 3.6, '#6a5a70');
      A.ellipse(ctx, top[0], top[1] - 4.5, 2.2, 2.2, '#ffd24a', null, { lw: 1.6, hl: false });
    }

    // 腳（飛行時垂著）
    const legY = -2;
    const lk = walk ? Math.sin(t * 12) : 0;
    limb(ctx, (c) => {
      c.moveTo(-4, -12);
      c.lineTo(-5 + dangle, legY - Math.max(0, lk) * 2);
      c.moveTo(4, -12);
      c.lineTo(5 + dangle * 1.2, legY - Math.max(0, -lk) * 2);
    }, 4.2, '#ffab3a');
    A.ellipse(ctx, -3 + dangle, legY - Math.max(0, lk) * 2, 4, 2.1, '#ffab3a', null, { lw: 1.8, hl: false, rot: air ? 0.5 : 0 });
    A.ellipse(ctx, 7 + dangle * 1.2, legY - Math.max(0, -lk) * 2, 4, 2.1, '#ffab3a', null, { lw: 1.8, hl: false, rot: air ? 0.5 : 0 });

    // 遠側翅膀
    const shoulder = [-4, -27];
    const wing = (ang, sc, col) => {
      ctx.save();
      ctx.translate(shoulder[0], shoulder[1]);
      ctx.rotate(ang);
      ctx.scale(sc, sc);
      A.shape(ctx, (c) => {
        c.moveTo(4, -3);
        c.quadraticCurveTo(-8, -9, -24, -3);
        c.lineTo(-19, 0);
        c.lineTo(-23, 3);
        c.quadraticCurveTo(-8, 7, 4, 4);
        c.closePath();
      }, col[0], col[1], { lw: 2.2, shadeY: 1.5, hl: false });
      // 黑色翼尖
      A.shape(ctx, (c) => { c.moveTo(-17, -5.6); c.quadraticCurveTo(-21, -5, -24, -3); c.lineTo(-19, 0); c.lineTo(-23, 3); c.quadraticCurveTo(-19, 4.2, -16, 4.2); c.closePath(); }, '#4a4e5c', null, { lw: 1.8, hl: false });
      ctx.restore();
    };
    if (glide) wing(PI / 2 - 0.12 + Math.sin(t * 2.2) * 0.04, 0.95, ['#9aa2b2', '#7e8698']);
    else wing(-0.9 - flap * 0.8 + (ph === 'wind' ? -0.4 : 0), 0.9, ['#9aa2b2', '#7e8698']);

    // 尾羽
    A.shape(ctx, (c) => { c.moveTo(-12, -24); c.lineTo(-25, -29); c.lineTo(-24, -20); c.lineTo(-12, -15); c.closePath(); }, '#e8e4dc', '#c8c2b6', { lw: 2.2, shadeY: -21 });
    line(ctx, [[-23.5, -28], [-23, -21]], '#4a4e5c', 2.4);

    // 身體＋頭
    A.ellipse(ctx, -2, -20, 14.5, 11.5, white[0], white[1], { cel: [3, 3], hl: false });
    A.ellipse(ctx, 8, -33, 10.5, 10, white[0], white[1], { cel: [2.5, 2.5], hl: [4, -39, 3, 1.8] });
    // 蓋掉身體與頭之間的線
    A.ellipse(ctx, 4, -25, 7, 5, white[0], null, { noStroke: true, hl: false });

    // 收起來的傘，夾在翅膀下
    if (!glide) {
      ctx.save();
      ctx.translate(-2, -20);
      ctx.rotate(0.28 + (ph === 'strike' ? -0.2 : 0));
      // 傘骨尖
      limb(ctx, (c) => { c.moveTo(22, 0); c.lineTo(30, 0); }, 3.4, '#6a5a70');
      A.shape(ctx, (c) => {
        c.moveTo(24, 0);
        c.quadraticCurveTo(6, -5.5, -12, -3.2);
        c.lineTo(-12, 3.2);
        c.quadraticCurveTo(6, 5.5, 24, 0);
        c.closePath();
      }, umb[0], umb[1], { lw: 2.2, shadeY: 1, hl: false });
      line(ctx, [[20, -0.5], [-10, -1.5]], umb2[1], 1.3);
      // 綁帶
      A.shape(ctx, (c) => A.roundRect(c, 2, -4.6, 3.4, 9.2, 1), umb2[0], null, { lw: 1.6, hl: false });
      // J 形握把
      limb(ctx, (c) => { c.moveTo(-12, 0); c.lineTo(-17, 0); c.arc(-17, 5, 5, -PI / 2, -PI * 1.45, true); }, 4.4, '#b0703e');
      ctx.restore();
    }

    // 臉
    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || ph === 'strike')) kind = 'angry';
    faceEyes(ctx, 6, -35, 8, 2.9, 3.9, m, kind);
    A.shape(ctx, (c) => { c.moveTo(15, -31); c.quadraticCurveTo(24, -32, 27, -28); c.quadraticCurveTo(21, -25.5, 15, -27); c.closePath(); }, '#ffcf3a', '#e8a61e', { lw: 2, shadeY: -28.5 });
    dot(ctx, 22.8, -27.8, 1.3, '#e8483a');
    if (hurt || ph === 'strike') smallMouth(ctx, 17, -22.5, true, 0.6);
    A.blush(ctx, 3, -29, 2.6);
    A.blush(ctx, 18, -34, 1.8);

    // 近側翅膀
    if (glide) {
      // 遠側翅膀高舉勾住傘柄（J 形握把），近側翅膀收在身上
      wing(0.25, 0.8, wingC);
      limb(ctx, (c) => { c.moveTo(-3, -48); c.arc(-6, -46, 3.2, -0.2, PI * 0.95, false); }, 3.8, '#b0703e');
    } else {
      wing(-0.2 - flap * 0.7 + (ph === 'wind' ? -0.6 : 0), 1, wingC);
    }
    ctx.restore();
  }

  // ── 鬧鐘海膽：海膽 ＋ 鬧鐘（刺是指針、頭頂兩個鈴） ──
  function alarmurchin(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const ring = clamp01(num(fx.ring, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const hop = walk ? Math.abs(Math.sin(t * 10)) * 2.5 : 0;
    const shakeX = ring * (1.2 + ring * 2) * Math.sin(t * 61);
    const shakeR = ring * 0.08 * Math.sin(t * 47);
    const cy = -24 - hop;

    ctx.save();
    ctx.translate(shakeX, 0);

    // 小腳（鬧鐘的腳）
    const lk = walk ? Math.sin(t * 10) : 0;
    A.ellipse(ctx, -9, -3 - Math.max(0, lk) * 2.5, 4.5, 3.2, '#e8b43a', '#c08a22', { lw: 2, hl: false });
    A.ellipse(ctx, 9, -3 - Math.max(0, -lk) * 2.5, 4.5, 3.2, '#e8b43a', '#c08a22', { lw: 2, hl: false });

    ctx.save();
    ctx.translate(0, cy);
    ctx.rotate(shakeR);

    // 刺＝指針
    const N = 16;
    let ext = 0;
    if (ph === 'wind') ext = -3;
    else if (ph === 'strike') ext = 7;
    for (let i = 0; i < N; i++) {
      const a = -PI / 2 + (i / N) * TAU + PI / N;
      if (Math.sin(a) > 0.8) continue; // 底部留給腳
      const L = 11 + ext + Math.sin(t * 3 + i * 1.7) * 1 + ring * 3 * Math.abs(Math.sin(t * 30 + i));
      const r0 = 14;
      ctx.save();
      ctx.rotate(a);
      const minute = i % 2 === 0;
      const w = minute ? 1.4 : 1.8;
      const tipW = minute ? 3 : 3.8;
      A.shape(ctx, (c) => poly(c, [
        [r0, -w], [r0 + L * 0.58, -w * 0.8], [r0 + L * 0.7, -tipW], [r0 + L, 0], [r0 + L * 0.7, tipW], [r0 + L * 0.58, w * 0.8], [r0, w],
      ]), minute ? '#4a3a6e' : '#6a4f94', null, { lw: 1.7, hl: false });
      ctx.restore();
    }

    // 頭頂兩個鈴＋鈴錘
    const knock = ring > 0 ? Math.sin(t * 52) : 0;
    [-1, 1].forEach((s) => {
      ctx.save();
      ctx.translate(s * 10, -17);
      ctx.rotate(s * 0.55 + (s > 0 ? Math.max(0, knock) : -Math.max(0, -knock)) * 0.12 * s);
      limb(ctx, (c) => { c.moveTo(0, 4); c.lineTo(0, -1); }, 3.4, '#c08a22');
      A.shape(ctx, (c) => {
        c.moveTo(-8, -1);
        c.bezierCurveTo(-8, -12, 8, -12, 8, -1);
        c.closePath();
      }, '#ffd24a', '#e0a830', { lw: 2.2, shadeY: -3, hl: [-3.5, -7, 2, 1.2] });
      A.ellipse(ctx, 0, -10.5, 1.8, 1.8, '#e0a830', null, { lw: 1.4, hl: false });
      ctx.restore();
    });
    const hs = knock * 0.5;
    limb(ctx, (c) => { c.moveTo(0, -14); c.lineTo(Math.sin(hs) * 12, -14 - Math.cos(hs) * 12); }, 3, '#c08a22');
    A.ellipse(ctx, Math.sin(hs) * 13, -14 - Math.cos(hs) * 13, 2.4, 2.4, '#ffd24a', null, { lw: 1.6, hl: false });

    // 錶框＋錶面
    A.ellipse(ctx, 0, 0, 16.5, 16.5, '#6fd0ae', '#46a888', { cel: [3, 3], hl: [-8, -9, 3.4, 2] });
    A.ellipse(ctx, 0, 0.5, 12.5, 12.5, '#fffaf0', '#efe4cc', { lw: 2, cel: [1.5, 1.5], hl: false });
    ctx.strokeStyle = A.c('#8a7a6a');
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const big = i % 3 === 0;
      ctx.lineWidth = big ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (big ? 8.6 : 9.6), 0.5 + Math.sin(a) * (big ? 8.6 : 9.6));
      ctx.lineTo(Math.cos(a) * 11, 0.5 + Math.sin(a) * 11);
      ctx.stroke();
    }
    // 臉
    let kind = eyeKind(m);
    if (kind === 'normal' && ring > 0.35) kind = 'angry';
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    faceEyes(ctx, -4.6, -2.5, 9.4, 2.7, 3.6, m, kind);
    // 小指針當鼻子
    const spd = ring > 0 ? 25 : 1.2;
    const ma = t * spd;
    const ha = t * spd * 0.08 + 1;
    line(ctx, [[0, 3.5], [Math.cos(ha) * 3.6, 3.5 + Math.sin(ha) * 3.6]], '#3a2a24', 1.6);
    line(ctx, [[0, 3.5], [Math.cos(ma) * 5.2, 3.5 + Math.sin(ma) * 5.2]], '#e8433a', 1.1);
    dot(ctx, 0, 3.5, 1.3, '#3a2a24');
    if (hurt || ring > 0.5 || ph === 'strike') smallMouth(ctx, 0, 7.5, true, 0.6);
    A.blush(ctx, -8, 3.5, 2.2);
    A.blush(ctx, 8, 3, 2.2);
    ctx.restore();

    // 響鈴時的震動線
    if (ring > 0.05) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, ring * 1.6);
      ctx.strokeStyle = A.c('#ffd24a');
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      [-1, 1].forEach((s) => {
        for (let k = 0; k < 2; k++) {
          const r = 30 + k * 6 + (t * 20 % 4);
          ctx.beginPath();
          ctx.arc(0, cy - 12, r, s > 0 ? -0.9 : PI + 0.9, s > 0 ? -0.35 : PI + 0.35, s < 0);
          ctx.stroke();
        }
      });
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 風箏魟魚：魟魚 ＋ 風箏（菱形骨架、尾巴是風箏線加蝴蝶結） ──
  function kiteray(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const dive = !!fx.dive;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const bob = dive ? 0 : Math.sin(t * 2.2) * 2.5;
    const flap = Math.sin(t * (dive ? 10 : 4.2));
    const pal = { a: ['#ff9a3a', '#e0782a'], b: ['#5cbcf2', '#3a98d4'] };

    ctx.save();
    ctx.translate(0, -23 - bob);
    let ang = -0.1 + Math.sin(t * 1.7) * 0.05;
    if (dive) ang = 0.5;
    else if (ph === 'wind') ang = -0.3;
    else if (ph === 'strike') ang = 0.35;
    if (hurt) ang += Math.sin(t * 40) * 0.08;
    ctx.rotate(ang);

    // 尾巴＝風箏線＋蝴蝶結
    const T = [-30, 0];
    const amp = dive ? 1.5 : 5;
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const x = T[0] - i * 6;
      const y = T[1] + Math.sin(t * 5 - i * 0.9) * amp * (i / 8) + i * (dive ? -0.4 : 1.2);
      pts.push([x, y]);
    }
    limb(ctx, (c) => pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))), 3.4, '#fff4dc');
    [[3, '#ff6fa0'], [6, '#ffd84a'], [8, '#ff6fa0']].forEach(([i, col]) => {
      const [x, y] = pts[i];
      const s = i === 8 ? 1.15 : 0.9;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 5 - i) * 0.3);
      A.shape(ctx, (c) => poly(c, [[0, 0], [-5 * s, -4.5 * s], [-5 * s, 4.5 * s]]), col, null, { lw: 1.8, hl: false });
      A.shape(ctx, (c) => poly(c, [[0, 0], [5 * s, -4.5 * s], [5 * s, 4.5 * s]]), col, null, { lw: 1.8, hl: false });
      A.ellipse(ctx, 0, 0, 1.8 * s, 1.8 * s, col, null, { lw: 1.4, hl: false });
      ctx.restore();
    });

    // 菱形身體（翅尖會上下拍）
    const N = [34, 0];
    const cx = 6;
    const W1 = [cx, -20 + flap * 3.5];
    const W2 = [cx, 20 + flap * 3.5];
    const body = (c) => {
      c.moveTo(N[0], N[1]);
      c.quadraticCurveTo(22, -13 + flap * 2, W1[0], W1[1]);
      c.quadraticCurveTo(-12, -11 + flap * 3, T[0], T[1]);
      c.quadraticCurveTo(-12, 11 + flap * 3, W2[0], W2[1]);
      c.quadraticCurveTo(22, 13 + flap * 2, N[0], N[1]);
      c.closePath();
    };
    const quads = (sh) => {
      const k = sh ? 1 : 0;
      ctx.fillStyle = A.c(pal.a[k]);
      ctx.fillRect(cx, -40, 60, 40);
      ctx.fillRect(-60, 0, 60 + cx, 40);
      ctx.fillStyle = A.c(pal.b[k]);
      ctx.fillRect(-60, -40, 60 + cx, 40);
      ctx.fillRect(cx, 0, 60, 40);
    };
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    quads(true);
    ctx.beginPath();
    ctx.save();
    ctx.translate(-3, -3);
    body(ctx);
    ctx.restore();
    ctx.clip();
    quads(false);
    ctx.restore();
    // 透過布面看到的骨架
    ctx.save();
    ctx.globalAlpha *= 0.35;
    line(ctx, [N, [cx, flap * 1.5], T], '#6a4020', 2);
    line(ctx, [W1, [cx - 1.5, flap * 2], W2], '#6a4020', 2);
    ctx.restore();
    // 亮點
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-8, -8 + flap * 2, 5, 2, -0.45, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    body(ctx);
    ctx.lineWidth = A.LW;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    // 四個角露出的竹骨頭
    [[N, 1, 0], [T, -1, 0], [W1, 0, -1], [W2, 0, 1]].forEach(([p, dx, dy]) => {
      limb(ctx, (c) => { c.moveTo(p[0] - dx * 2, p[1] - dy * 2); c.lineTo(p[0] + dx * 3, p[1] + dy * 3); }, 3.6, '#c89458');
    });
    // 魟魚的頭鰭（兩個小捲角）
    [-1, 1].forEach((s) => {
      A.shape(ctx, (c) => {
        c.moveTo(27, s * 3.5);
        c.quadraticCurveTo(35, s * 6, 36, s * 11);
        c.quadraticCurveTo(31, s * 10, 25, s * 7);
        c.closePath();
      }, pal.a[0], pal.a[1], { lw: 1.8, shadeY: s * 8, hl: false });
    });

    // 臉（畫在風箏布上）
    let kind = eyeKind(m);
    if (kind === 'normal' && (dive || ph === 'strike')) kind = 'angry';
    faceEyes(ctx, 9, -5, 10, 3, 4.1, m, kind);
    if (hurt || dive) smallMouth(ctx, 14.5, 3.5, true, 0.7);
    else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(10.5, 2.5);
      ctx.quadraticCurveTo(12.5, 5, 14.5, 3);
      ctx.quadraticCurveTo(16.5, 5, 18.5, 2.5);
      ctx.stroke();
    }
    A.blush(ctx, 5, 1.5, 2.6);
    A.blush(ctx, 23, 0.5, 2.4);

    if (dive) {
      // 俯衝的風切線
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const y = -12 + i * 12;
        const o = (t * 60 + i * 13) % 20;
        ctx.beginPath();
        ctx.moveTo(-36 - o, y);
        ctx.lineTo(-50 - o, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── 積木珊瑚：珊瑚 ＋ 兒童積木 ──
  function toyBlock(ctx, x, y, w, h, col, letter) {
    const top = U.mix(col[0], '#ffffff', 0.35);
    // 頂面（斜斜的一條，看起來有厚度）
    A.shape(ctx, (c) => poly(c, [[x, y], [x + 3, y - 3.5], [x + w + 3, y - 3.5], [x + w, y]]), top, null, { lw: 2, hl: false });
    A.shape(ctx, (c) => poly(c, [[x + w, y], [x + w + 3, y - 3.5], [x + w + 3, y + h - 3.5], [x + w, y + h]]), col[1], null, { lw: 2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, x, y, w, h, 1.5), col[0], col[1], { cel: [2, 2], lw: 2.2, hl: false });
    if (letter) {
      ctx.strokeStyle = A.c(U.mix(col[0], '#ffffff', 0.6));
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 2.2, y + 2.2, w - 4.4, h - 4.4);
      ctx.fillStyle = A.c('#ffffff');
      ctx.font = 'bold ' + Math.round(h * 0.62) + 'px ' + A.NUMFONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      uprightText(ctx, letter, x + w / 2, y + h / 2 + 0.5);
    }
  }
  function polyp(ctx, x, y, r, t, seed) {
    const n = 6;
    const wig = Math.sin(t * 3 + seed) * 0.15;
    A.shape(ctx, (c) => {
      for (let i = 0; i < n * 2; i++) {
        const rr = i % 2 ? r * 0.62 : r * (1.05 + (i % 4 === 0 ? 0.08 : 0));
        const a = (i / (n * 2)) * TAU + wig;
        i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
    }, '#ff9ab4', '#f07494', { lw: 1.8, shadeY: y + r * 0.3, hl: false });
    dot(ctx, x, y, r * 0.3, '#ffe6ee');
  }
  function blockcoral(ctx, m) {
    const t = m.t || 0;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const hopK = walk ? Math.abs(Math.sin(t * 9)) : 0;
    let sy = 1 - (walk ? (1 - hopK) * 0.06 : Math.sin(t * 2.4) * 0.015);
    if (!m.onGround) sy = m.vy < 0 ? 1.06 : 0.97;
    if (ph === 'wind') sy = 0.9;
    ctx.save();
    ctx.translate(0, -hopK * 4);
    ctx.scale(1 / Math.sqrt(sy), sy);
    let lean = 0;
    if (ph === 'wind') lean = -0.14;
    else if (ph === 'strike') lean = 0.2;
    if (hurt) lean += Math.sin(t * 45) * 0.06;
    const jolt = hurt ? Math.sin(t * 50) * 1.5 : 0;

    const pal = {
      red: ['#f0524a', '#c63a36'],
      blue: ['#4a8cf0', '#326cc8'],
      yel: ['#ffcc3a', '#e0a41e'],
      grn: ['#5ac86a', '#3ea452'],
    };
    const branch = (rx, ry, rot, draw) => {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(rot);
      draw();
      ctx.restore();
    };
    // 左枝：藍方塊 → 黃圓柱 → 珊瑚芽
    branch(-12, -18, -0.32 + lean + Math.sin(t * 2 + 1) * 0.05, () => {
      toyBlock(ctx, -6.5, -13, 13, 13, pal.blue, 'B');
      // 圓柱
      A.shape(ctx, (c) => { c.moveTo(-4.5, -15); c.lineTo(-4.5, -24); c.ellipse(0, -24, 4.5, 2, 0, PI, 0); c.lineTo(4.5, -15); c.ellipse(0, -15, 4.5, 2, 0, 0, PI); c.closePath(); }, pal.yel[0], pal.yel[1], { cel: [1.5, 0], lw: 2, hl: false });
      A.ellipse(ctx, 0, -24, 4.5, 2, U.mix(pal.yel[0], '#ffffff', 0.35), null, { lw: 1.8, hl: false });
      polyp(ctx, 0, -29, 4.6, t, 1);
    });
    // 右枝：綠方塊 → 紅三角
    branch(13, -16, 0.4 + lean + Math.sin(t * 2 + 2.5) * 0.05, () => {
      toyBlock(ctx, -6, -12, 12, 12, pal.grn, 'C');
      A.shape(ctx, (c) => poly(c, [[-6.5, -15.5], [0, -26], [6.5, -15.5]]), pal.red[0], pal.red[1], { cel: [1.5, 1.5], lw: 2, hl: false });
      polyp(ctx, 0, -29, 3.8, t, 2);
      polyp(ctx, 7, -9, 3, t, 5);
    });
    // 中枝：紅方塊 → 黃方塊 → 藍拱門 → 珊瑚芽
    branch(1, -22, lean * 1.2 + Math.sin(t * 2) * 0.04, () => {
      ctx.translate(jolt, 0);
      toyBlock(ctx, -7.5, -15, 15, 15, pal.red, 'A');
      ctx.save();
      ctx.translate(0, -15);
      ctx.rotate(0.12 + Math.sin(t * 2.3) * 0.04);
      toyBlock(ctx, -6, -12, 12, 12, pal.yel, null);
      // 黃方塊上的星星貼紙
      A.shape(ctx, (c) => starPath(c, 0, -6, 3.8, 1.7, 5, -PI / 2), '#ffffff', null, { lw: 1.2, hl: false });
      // 拱門
      A.shape(ctx, (c) => {
        c.moveTo(-7, -15.5);
        c.lineTo(-7, -23);
        c.lineTo(7, -23);
        c.lineTo(7, -15.5);
        c.lineTo(3, -15.5);
        c.arc(0, -15.5, 3, 0, PI, true);
        c.closePath();
      }, pal.blue[0], pal.blue[1], { cel: [1.5, 1.5], lw: 2, hl: false });
      polyp(ctx, -3, -27, 4.8, t, 3);
      polyp(ctx, 5, -26, 3.4, t, 4);
      ctx.restore();
    });

    // 珊瑚底座（臉在這裡）
    const base = (c) => {
      c.moveTo(-22, 0);
      c.bezierCurveTo(-26, -8, -22, -20, -14, -21);
      c.quadraticCurveTo(-10, -27, -3, -24);
      c.quadraticCurveTo(4, -29, 10, -23);
      c.quadraticCurveTo(19, -24, 21, -15);
      c.bezierCurveTo(26, -9, 25, -2, 21, 0);
      c.quadraticCurveTo(0, 3, -22, 0);
      c.closePath();
    };
    A.shape(ctx, base, '#ff8aa2', '#e56482', { cel: [3.5, 3], hl: [-13, -15, 3.5, 2] });
    // 珊瑚小孔
    [[-16, -6], [-11, -18], [16, -8], [14, -18], [-18, -12], [18, -3], [3, -22]].forEach(([x, y]) => {
      ctx.fillStyle = A.c('#d0506e');
      ctx.beginPath();
      ctx.ellipse(x, y, 1.6, 1.2, 0, 0, TAU);
      ctx.fill();
    });
    let kind = eyeKind(m);
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    faceEyes(ctx, -5, -12, 11, 3.2, 4.2, m, kind);
    smallMouth(ctx, 1, -5, hurt || ph === 'strike', 0.85);
    A.blush(ctx, -11, -7, 2.8);
    A.blush(ctx, 12, -7.5, 2.6);
    ctx.restore();
  }

  // ── 印章海星：海星 ＋ 印章（背上是把手、腳底是印面） ──
  function stampstar(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const slam = clamp01(num(fx.slam, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const air = !m.onGround;
    let sx = 1;
    let sy = 1 + Math.sin(t * 2.6) * 0.02;
    if (slam > 0) {
      sy = 1 - slam * 0.38;
      sx = 1 + slam * 0.22;
    } else if (ph === 'wind') {
      sy = 0.86;
      sx = 1.08;
    } else if (air) {
      sy = m.vy < 0 ? 1.08 : 1.02;
      sx = 0.95;
    }
    const lift = walk ? Math.abs(Math.sin(t * 9)) * 2 : 0;

    // 落地時的印泥飛濺
    if (slam > 0.05) {
      for (let i = 0; i < 6; i++) {
        const a = PI + (i / 5) * PI;
        const d = 30 + (1 - slam) * 18;
        ctx.save();
        ctx.globalAlpha *= slam;
        A.ellipse(ctx, Math.cos(a) * d * 1.1, -4 + Math.sin(a) * d * 0.35, 3, 2.4, '#3c3a8e', null, { lw: 1.6, hl: false });
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(0, -lift);
    ctx.scale(sx, sy);
    if (air) ctx.rotate(m.vy < 0 ? -0.1 : 0.12);
    const cy = -19;
    const R = 29;
    const Sy = 0.52;
    const armWig = (i) => (walk ? Math.sin(t * 9 + i * 1.3) * 2.5 : Math.sin(t * 2 + i * 1.3) * 1.2);
    // 圓潤的五角星（壓扁成俯視的角度）
    const star = (c, dy, k) => {
      const n = 5;
      const ri = R * 0.5 * k;
      for (let i = 0; i < n; i++) {
        const a = -PI / 2 + (i / n) * TAU;
        const a0 = a - PI / n;
        const a1 = a + PI / n;
        const ro = (R + armWig(i)) * 1.42 * k;
        if (!i) c.moveTo(Math.cos(a0) * ri, cy + dy + Math.sin(a0) * ri * Sy);
        c.quadraticCurveTo(Math.cos(a) * ro, cy + dy + Math.sin(a) * ro * Sy, Math.cos(a1) * ri, cy + dy + Math.sin(a1) * ri * Sy);
      }
      c.closePath();
    };
    // 印面（深藍紫色的印泥層）
    const inkDrop = air ? 3 : 0;
    A.shape(ctx, (c) => star(c, 9 + inkDrop, 0.98), '#3c3a8e', '#2a2870', { lw: 2.4, shadeY: cy + 12 });
    // 海星身體的厚度
    A.shape(ctx, (c) => star(c, 4.5, 1), '#d8662a', null, { lw: 2.4, hl: false });
    // 上表面
    A.shape(ctx, (c) => star(c, 0, 1), '#ff9a4a', '#f47e38', { cel: [3, 2.5], hl: [-13, cy - 6, 4, 1.8] });
    // 顆粒
    for (let i = 0; i < 5; i++) {
      const a = -PI / 2 + (i / 5) * TAU;
      for (let j = 1; j <= 2; j++) {
        const rr = R * (0.28 + j * 0.24);
        dot(ctx, Math.cos(a) * rr, cy + Math.sin(a) * rr * Sy, j === 2 ? 1.3 : 1.6, '#ffe0b8');
      }
    }
    // 印章把手（木頭），在背後偏後方
    const hx = -3;
    const hy = cy - 5;
    const hsq = slam * 3;
    A.shape(ctx, (c) => c.ellipse(hx, hy, 8, 3.4, 0, 0, TAU), '#9a5a30', null, { lw: 2.2, hl: false });
    A.shape(ctx, (c) => {
      c.moveTo(hx - 6, hy);
      c.quadraticCurveTo(hx - 2.5, hy - 7, hx - 3, hy - 13 + hsq);
      c.lineTo(hx + 3, hy - 13 + hsq);
      c.quadraticCurveTo(hx + 2.5, hy - 7, hx + 6, hy);
      c.quadraticCurveTo(hx, hy + 3, hx - 6, hy);
      c.closePath();
    }, '#c88a52', '#a86a38', { cel: [2, 0], lw: 2.2, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, hx - 5, hy - 15 + hsq, 10, 3.5, 1.5), '#e8b84a', null, { lw: 1.8, hl: false });
    A.ellipse(ctx, hx, hy - 21 + hsq, 7.5, 7, '#8a4a2a', '#6a3418', { cel: [2, 2], lw: 2.4, hl: [hx - 2.8, hy - 24 + hsq, 2.2, 1.4] });
    // 臉（在把手前面、身體正中央）
    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || air)) kind = 'angry';
    if (kind === 'normal' && slam > 0.4) kind = 'closed';
    faceEyes(ctx, 1, cy + 3, 10, 3.3, 4, m, kind);
    smallMouth(ctx, 6.5, cy + 9, hurt || air || slam > 0.3, 0.75);
    A.blush(ctx, -5, cy + 7.5, 2.5);
    A.blush(ctx, 17, cy + 7, 2.3);
    ctx.restore();
  }

  // ── 手風琴海鰻：海鰻 ＋ 手風琴（身體是風箱摺子） ──
  function accordioneel(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const stretch = clamp01(num(fx.stretch, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const squeeze = ph === 'wind' ? 1 : 0;
    const breathe = Math.sin(t * 2.2) * 3;
    const L = 42 * (1 - 0.5 * squeeze) + breathe * (1 - squeeze) + stretch * 220;
    const bx0 = -22;
    const bx1 = bx0 + L;
    const H = 22;
    const midY = -17;
    const waveA = (walk ? 3 : 1.6) * (1 - stretch) * (1 - squeeze * 0.5);
    const shake = squeeze ? Math.sin(t * 50) * 0.8 : 0;
    const wave = (x) => Math.sin(t * (walk ? 8 : 3) - (x - bx0) * 0.09) * waveA + shake;

    const skin = ['#a8c860', '#84a444'];
    // 尾巴＋尾鰭
    const ty = wave(bx0);
    A.shape(ctx, (c) => {
      c.moveTo(bx0 - 8, midY - 9 + ty);
      c.quadraticCurveTo(bx0 - 22, midY - 8 + ty, bx0 - 34, midY - 4 + Math.sin(t * 4) * 3);
      c.quadraticCurveTo(bx0 - 24, midY + 4 + ty, bx0 - 8, midY + 9 + ty);
      c.closePath();
    }, skin[0], skin[1], { cel: [2, 2], lw: 2.4, hl: false });
    A.shape(ctx, (c) => {
      c.moveTo(bx0 - 14, midY - 8 + ty);
      c.quadraticCurveTo(bx0 - 26, midY - 16 + ty, bx0 - 37, midY - 7 + Math.sin(t * 4) * 3);
      c.quadraticCurveTo(bx0 - 38, midY + 6 + Math.sin(t * 4) * 3, bx0 - 26, midY + 5 + ty);
      c.lineTo(bx0 - 32, midY - 4 + Math.sin(t * 4) * 3);
      c.quadraticCurveTo(bx0 - 22, midY - 9 + ty, bx0 - 14, midY - 8 + ty);
      c.closePath();
    }, '#ffcf5a', '#e8a83a', { lw: 2, hl: false, shadeY: midY + 2 + ty });

    // 低音側端板（有圓按鈕）
    A.shape(ctx, (c) => A.roundRect(c, bx0 - 9, midY - H / 2 - 3 + ty, 10, H + 6, 2.5), '#3a3244', '#262030', { cel: [2, 2], lw: 2.4, hl: false });
    for (let r = 0; r < 3; r++) {
      for (let q = 0; q < 2; q++) dot(ctx, bx0 - 6 + q * 4, midY - 7 + r * 6.5 + ty + q * 2, 1.4, '#fff4e0');
    }

    // 風箱摺子
    const n = 8;
    const seg = L / (n * 2);
    for (let k = 0; k < n * 2; k++) {
      const x0 = bx0 + k * seg;
      const x1 = x0 + seg;
      const y0 = wave(x0);
      const y1 = wave(x1);
      const ridge0 = k % 2 === 0;
      const d0 = ridge0 ? 0 : 3;
      const d1 = ridge0 ? 3 : 0;
      const col = ridge0 ? ['#c8445e', '#a8344e'] : ['#8e2a44', '#761e38'];
      ctx.fillStyle = A.c(col[0]);
      ctx.beginPath();
      ctx.moveTo(x0, midY - H / 2 + d0 + y0);
      ctx.lineTo(x1, midY - H / 2 + d1 + y1);
      ctx.lineTo(x1, midY + H / 2 - d1 + y1);
      ctx.lineTo(x0, midY + H / 2 - d0 + y0);
      ctx.closePath();
      ctx.fill();
      // 下半部陰影
      ctx.fillStyle = A.c(col[1]);
      ctx.beginPath();
      ctx.moveTo(x0, midY + 4 + y0);
      ctx.lineTo(x1, midY + 4 + y1);
      ctx.lineTo(x1, midY + H / 2 - d1 + y1);
      ctx.lineTo(x0, midY + H / 2 - d0 + y0);
      ctx.closePath();
      ctx.fill();
    }
    // 摺痕白線＋描邊
    ctx.strokeStyle = A.c('#fbe6d4');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k = 0; k <= n * 2; k += 2) {
      const x = bx0 + k * seg;
      const y = wave(x);
      ctx.moveTo(x, midY - H / 2 + 1.5 + y);
      ctx.lineTo(x, midY + H / 2 - 1.5 + y);
    }
    ctx.stroke();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let k = 0; k <= n * 2; k++) {
      const x = bx0 + k * seg;
      const y = midY - H / 2 + (k % 2 ? 3 : 0) + wave(x);
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.moveTo(bx0, midY + H / 2 + wave(bx0));
    for (let k = 0; k <= n * 2; k++) {
      const x = bx0 + k * seg;
      const y = midY + H / 2 - (k % 2 ? 3 : 0) + wave(x);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    // 金色護角
    ctx.fillStyle = A.c('#ffd24a');
    for (let k = 0; k <= n * 2; k += 2) {
      const x = bx0 + k * seg;
      const y = wave(x);
      ctx.fillRect(x - 1, midY - H / 2 - 0.5 + y, 2, 2);
      ctx.fillRect(x - 1, midY + H / 2 - 1.5 + y, 2, 2);
    }

    // 高音側端板（直立的琴鍵）
    const hy = wave(bx1);
    A.shape(ctx, (c) => A.roundRect(c, bx1 - 1, midY - H / 2 - 4 + hy, 12, H + 8, 2.5), '#3a3244', '#262030', { cel: [2, 2], lw: 2.4, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, bx1 + 4, midY - H / 2 - 1.5 + hy, 6, H + 3, 1), '#fffaf0', null, { lw: 1.6, hl: false });
    ctx.strokeStyle = A.c('#8a8290');
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      const y = midY - H / 2 - 1.5 + hy + (i * (H + 3)) / 6;
      ctx.moveTo(bx1 + 4, y);
      ctx.lineTo(bx1 + 10, y);
    }
    ctx.stroke();
    ctx.fillStyle = A.c('#2a2430');
    [1, 2, 4].forEach((i) => ctx.fillRect(bx1 + 4, midY - H / 2 - 1.5 + hy + (i * (H + 3)) / 6 - 1.3, 3.2, 2.6));

    // 頭
    const hx = bx1 + 11;
    const open = hurt ? 0.6 : ph === 'strike' ? 1 : ph === 'wind' ? 0.25 : 0.1 + Math.max(0, Math.sin(t * 1.5)) * 0.15;
    ctx.save();
    ctx.translate(hx, midY + hy);
    // 下顎
    ctx.save();
    ctx.translate(2, 3);
    ctx.rotate(open * 0.45);
    A.shape(ctx, (c) => {
      c.moveTo(-3, -1);
      c.quadraticCurveTo(12, 0, 23, -1);
      c.quadraticCurveTo(22, 5, 14, 7);
      c.quadraticCurveTo(4, 8, -3, 7);
      c.closePath();
    }, '#d8e49a', '#b4c470', { lw: 2.2, shadeY: 4, hl: false });
    ctx.restore();
    if (open > 0.2) {
      A.shape(ctx, (c) => { c.moveTo(4, 2); c.quadraticCurveTo(16, 1, 24, 0.5); c.quadraticCurveTo(18, 3 + open * 8, 5, 6 + open * 3); c.closePath(); }, '#8a2a34', null, { noStroke: true, hl: false });
    }
    // 上顎＋頭
    A.shape(ctx, (c) => {
      c.moveTo(-4, -11);
      c.bezierCurveTo(6, -17, 20, -14, 26, -5);
      c.quadraticCurveTo(28, 0, 24, 1.5);
      c.quadraticCurveTo(12, 3, -4, 5);
      c.closePath();
    }, skin[0], skin[1], { cel: [2.5, 2.5], hl: [5, -11, 3.5, 1.6] });
    // 小尖牙
    ctx.fillStyle = A.c('#ffffff');
    [8, 13, 18].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x - 1.4, 2 - x * 0.04);
      ctx.lineTo(x, 4.5 - x * 0.04);
      ctx.lineTo(x + 1.4, 2 - x * 0.04);
      ctx.fill();
    });
    // 斑點
    [[1, -7, 1.5], [6, -2, 1.2], [-1, 0, 1.1]].forEach(([x, y, r]) => dot(ctx, x, y, r, '#6a8a30'));
    // 頭頂背鰭
    A.shape(ctx, (c) => { c.moveTo(-3, -11); c.quadraticCurveTo(0, -18, 6, -14.5); c.quadraticCurveTo(2, -13, 1, -12.5); c.closePath(); }, '#ffcf5a', null, { lw: 1.8, hl: false });
    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || ph === 'strike')) kind = 'angry';
    faceEyes(ctx, 11, -7, 7.5, 2.8, 3.7, m, kind);
    A.blush(ctx, 17, -1.5, 2);
    ctx.restore();

    // 拉長時的速度線、擠壓時的小音符
    if (stretch > 0.2) {
      ctx.save();
      ctx.globalAlpha *= stretch;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const x = bx0 + L * (0.25 + i * 0.25);
        ctx.beginPath();
        ctx.moveTo(x, midY - H / 2 - 6 - i % 2 * 3);
        ctx.lineTo(x - 22, midY - H / 2 - 6 - i % 2 * 3);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (squeeze || stretch > 0.05) {
      const q = (t * 1.8) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      noteGlyph(ctx, bx0 + L * 0.5 - 4, midY - H / 2 - 10 - q * 12, 0.75, '#ffe066', '#e8b43a');
      ctx.restore();
    }
  }

  // ── 八音盒海龜：海龜 ＋ 八音盒（殼是打開的音樂盒） ──
  function musicturtle(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const playing = !!fx.playing;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const paddle = walk ? Math.sin(t * 7) : Math.sin(t * 1.8) * 0.2;
    const bob = walk ? Math.abs(Math.sin(t * 7)) * 1.2 : Math.sin(t * 2) * 0.6;
    const skin = ['#9ad88a', '#72b464'];
    const wood = ['#a8643a', '#844826'];
    const gold = ['#ffd24a', '#e0a830'];

    // 遠側鰭
    A.ellipse(ctx, -20, -5, 9, 3.6, skin[1], null, { rot: 0.3 - paddle * 0.25, lw: 2.2, hl: false });
    A.ellipse(ctx, 22, -5, 13, 4.2, skin[1], null, { rot: -0.35 + paddle * 0.3, lw: 2.2, hl: false });

    ctx.save();
    ctx.translate(0, -bob);

    // 打開的蓋子（在最後面）
    const lidOpen = playing ? 1 : ph === 'wind' ? 0.35 : 0;
    const bxL = -28;
    const bxR = 18;
    const topY = -36;
    if (lidOpen > 0.5) {
      const sway = Math.sin(t * 3) * 0.6;
      const lid = (c) => poly(c, [[bxL + 1, topY], [bxR - 3, topY], [bxR - 6 + sway, topY - 24], [bxL - 2 + sway, topY - 22]]);
      A.shape(ctx, lid, wood[0], wood[1], { cel: [2.5, 2], lw: 2.4, hl: false });
      // 粉紅絨布＋小鏡子
      A.shape(ctx, (c) => poly(c, [[bxL + 4, topY - 2.5], [bxR - 6, topY - 2.5], [bxR - 8.5 + sway, topY - 21], [bxL + 1 + sway, topY - 19.5]]), '#f08aac', '#d86a90', { lw: 1.8, shadeY: topY - 8, hl: false });
      A.ellipse(ctx, (bxL + bxR) / 2 - 3 + sway * 0.6, topY - 11.5, 8, 5.5, '#d8f0ff', '#b0d8f0', { lw: 1.8, hl: [(bxL + bxR) / 2 - 7, topY - 13.5, 2.4, 1.2] });
    }

    // 腹甲
    A.ellipse(ctx, -4, -12, 27, 6, '#f4e2a8', '#dcc080', { lw: 2.4, hl: false });

    // 頭與脖子
    const sway = playing ? Math.sin(t * 3) * 2.5 : 0;
    const retract = hurt ? -4 : 0;
    const hx = 30 + retract + (ph === 'strike' ? 3 : 0);
    const hy = -24 + sway * 0.4 - (playing ? 1 : 0);
    A.shape(ctx, (c) => {
      c.moveTo(14, -24);
      c.quadraticCurveTo(22, -26, hx - 4, hy - 4);
      c.lineTo(hx - 2, hy + 6);
      c.quadraticCurveTo(22, -12, 14, -13);
      c.closePath();
    }, skin[0], skin[1], { lw: 2.4, shadeY: -16, hl: false });

    // 盒身
    const boxP = (c) => A.roundRect(c, bxL, topY, bxR - bxL, 24, 4);
    A.shape(ctx, boxP, wood[0], wood[1], { cel: [3, 3], hl: [bxL + 6, topY + 5, 3.5, 1.6] });
    // 金邊
    A.shape(ctx, (c) => A.roundRect(c, bxL - 1, topY - 1, bxR - bxL + 2, 4, 1.5), gold[0], gold[1], { lw: 1.8, hl: false, shadeY: topY + 2 });
    A.shape(ctx, (c) => A.roundRect(c, bxL - 1, topY + 21, bxR - bxL + 2, 4, 1.5), gold[0], gold[1], { lw: 1.8, hl: false, shadeY: topY + 24 });
    // 龜甲紋（六角形鑲嵌）
    const hex = (x, y, r) => (c) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85);
      }
      c.closePath();
    };
    [[-18, -24, 6], [-5, -24, 6], [8, -24, 5.5]].forEach(([x, y, r]) => A.shape(ctx, hex(x, y, r), '#d49a5e', '#bc8048', { lw: 1.6, shadeY: y + 2, hl: false }));
    dot(ctx, -5, -24, 1.4, '#6a3418');

    if (lidOpen > 0.5) {
      // 盒子頂面開口：轉筒＋音梳＋旋轉的小貝殼舞者
      A.shape(ctx, (c) => poly(c, [[bxL + 2, topY + 1], [bxR - 2, topY + 1], [bxR - 5, topY - 4], [bxL + 4, topY - 4]]), '#5a2a3a', null, { lw: 2, hl: false });
      const drumX0 = bxL + 7;
      const drumX1 = bxL + 25;
      A.shape(ctx, (c) => A.roundRect(c, drumX0, topY - 6, drumX1 - drumX0, 5.5, 2.5), gold[0], gold[1], { lw: 1.8, shadeY: topY - 3, hl: false });
      const roll = (t * 12) % 4;
      ctx.fillStyle = A.c('#8a5a1a');
      for (let i = 0; i < 5; i++) {
        const x = drumX0 + 2 + ((i * 4 + roll) % 16);
        ctx.fillRect(x, topY - 5 + (i % 2) * 2, 1.4, 1.4);
      }
      // 音梳
      ctx.strokeStyle = A.c('#d8dce8');
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const x = drumX0 + 2 + i * 3;
        ctx.moveTo(x, topY + 0.5);
        ctx.lineTo(x, topY - 2.5);
      }
      ctx.stroke();
      // 小舞者（捲貝）
      const spin = Math.cos(t * 6);
      line(ctx, [[bxR - 7, topY - 2], [bxR - 7, topY - 9]], '#c0c8d0', 1.6);
      ctx.save();
      ctx.translate(bxR - 7, topY - 12);
      ctx.scale(0.35 + Math.abs(spin) * 0.65, 1);
      A.shape(ctx, (c) => { c.moveTo(0, -5); c.quadraticCurveTo(5, -1, 3.5, 3); c.lineTo(-3.5, 3); c.quadraticCurveTo(-5, -1, 0, -5); c.closePath(); }, '#ffc8dc', '#f098b8', { lw: 1.6, shadeY: 1, hl: false });
      ctx.restore();
    } else {
      // 闔上的圓頂蓋（龜殼）
      const lidTilt = lidOpen * -0.25;
      ctx.save();
      ctx.translate(bxL, topY);
      ctx.rotate(lidTilt);
      const dome = (c) => {
        c.moveTo(-1, 1);
        c.bezierCurveTo(2, -15, bxR - bxL - 2, -17, bxR - bxL + 1, 1);
        c.closePath();
      };
      A.shape(ctx, dome, '#8ab860', '#6a9a46', { cel: [3, 2], hl: [10, -9, 4, 1.8] });
      const W = bxR - bxL;
      [[W * 0.3, -5.5, 5.5], [W * 0.62, -6, 5.5], [W * 0.47, -10.5, 3.8]].forEach(([x, y, r]) => A.shape(ctx, hex(x, y, r), '#b4d880', '#9cc46a', { lw: 1.4, hl: false, shadeY: y + 2 }));
      A.shape(ctx, (c) => A.roundRect(c, -1.5, -1.5, W + 3, 3.5, 1.5), gold[0], null, { lw: 1.6, hl: false });
      ctx.restore();
    }

    // 側面的發條鑰匙
    const kx = bxL - 3;
    const ky = -24;
    line(ctx, [[bxL + 1, ky], [kx - 2, ky]], '#c08a22', 3);
    const turn = playing ? Math.cos(t * 7) : ph === 'wind' ? Math.cos(t * 16) : 1;
    ctx.save();
    ctx.translate(kx - 5, ky);
    ctx.scale(1, 0.25 + Math.abs(turn) * 0.75);
    A.shape(ctx, (c) => {
      c.moveTo(0, 0);
      c.bezierCurveTo(-6, -10, 6, -11, 0, 0);
      c.bezierCurveTo(-6, 10, 6, 11, 0, 0);
      c.closePath();
    }, gold[0], gold[1], { lw: 1.8, shadeY: 2, hl: false });
    ctx.restore();

    // 頭
    A.ellipse(ctx, hx, hy, 10, 8.5, skin[0], skin[1], { cel: [2, 2], hl: [hx - 4, hy - 4.5, 2.6, 1.5] });
    let kind = eyeKind(m);
    if (kind === 'normal' && playing && Math.sin(t * 1.3) > -0.3) kind = 'closed';
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    faceEyes(ctx, hx - 1, hy - 2.5, 6.5, 2.4, 3.2, m, kind);
    if (hurt || ph === 'strike') smallMouth(ctx, hx + 5, hy + 4, true, 0.6);
    else if (playing) {
      // 哼歌的小圓嘴
      A.ellipse(ctx, hx + 5.5, hy + 3.5, 1.8, 1.6, '#7a2323', null, { lw: 1.4, hl: false });
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(hx + 4, hy + 2, 2.5, 0.2 * PI, 0.8 * PI);
      ctx.stroke();
    }
    A.blush(ctx, hx - 3, hy + 3, 2.2);
    ctx.restore();

    // 近側鰭
    A.ellipse(ctx, -22, -6, 10, 4, skin[0], skin[1], { rot: 0.4 + paddle * 0.3, lw: 2.2, hl: false, cel: [1.5, 1.5] });
    A.ellipse(ctx, 16, -6, 14, 4.6, skin[0], skin[1], { rot: -0.45 - paddle * 0.35, lw: 2.2, hl: false, cel: [1.5, 1.5] });

    // 演奏時飄出的音符
    if (playing) {
      const cols = [['#6ad0e8', '#3aa8c8'], ['#ff8ab8', '#e0608e'], ['#ffd24a', '#e0a830']];
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.6 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha *= q < 0.15 ? q / 0.15 : 1 - (q - 0.15) / 0.85;
        noteGlyph(ctx, -6 + i * 7 + Math.sin(t * 3 + i) * 5 + q * 10, -44 - q * 26, 0.7, cols[i][0], cols[i][1]);
        ctx.restore();
      }
    }
  }

  // ═════════════ 投射物 ═════════════
  function letter(ctx, p, t) {
    const s = p.seed || 0;
    const dir = (p.vx || 0) < 0 ? -1 : (p.dir || 1);
    // 風切線
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-dir * 12, -3);
    ctx.lineTo(-dir * 20, -3);
    ctx.moveTo(-dir * 12, 3);
    ctx.lineTo(-dir * 17, 3);
    ctx.stroke();
    ctx.restore();
    ctx.rotate(Math.sin(t * 6 + s) * 0.3 + t * 1.5 * dir);
    envelope(ctx, 20, 13, false);
    // 心形封蠟
    A.shape(ctx, (c) => {
      c.moveTo(0, 4.5);
      c.bezierCurveTo(-5, 1, -3.5, -2.5, 0, -0.5);
      c.bezierCurveTo(3.5, -2.5, 5, 1, 0, 4.5);
      c.closePath();
    }, '#e8433a', null, { lw: 1.4, hl: false });
    // 角落的郵票
    A.shape(ctx, (c) => A.roundRect(c, 4, -5, 4.5, 4.5, 0.5), '#5ab0e8', null, { lw: 1.2, hl: false });
  }
  function spike(ctx, p, t) {
    const a = Math.atan2(p.vy || 0, p.vx || (p.dir || 1));
    ctx.rotate(a);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,240,200,0.6)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(-26, 0);
    ctx.stroke();
    ctx.restore();
    A.shape(ctx, (c) => poly(c, [[-12, -2], [2, -1.6], [4, -4.6], [13, 0], [4, 4.6], [2, 1.6], [-12, 2]]), '#6a4f94', '#4a3a6e', { lw: 2, shadeY: 0.5, hl: false });
    A.ellipse(ctx, -12, 0, 2.6, 2.6, '#ffd24a', null, { lw: 1.4, hl: false });
    dot(ctx, 6, -1.4, 0.9, '#c8b4f0');
  }
  function note(ctx, p, t) {
    const s = p.seed || 0;
    const cols = [['#6ad0e8', '#3aa8c8', '120,220,240'], ['#ff8ab8', '#e0608e', '255,150,200'], ['#ffd24a', '#e0a830', '255,220,110']];
    const col = cols[Math.floor(Math.abs(s) * 1.7) % 3];
    ctx.translate(0, Math.sin(t * 8 + s) * 3.5);
    ctx.rotate(Math.sin(t * 5 + s) * 0.15);
    glow(ctx, 0, 0, 18, col[2], 0.5);
    noteGlyph(ctx, -1, 3, 1, col[0], col[1]);
  }

  // ═════════════ 地面區域 ═════════════
  function ink(ctx, z, t) {
    const fade = Math.max(0, Math.min(1, (z.life || 1) - (z.t || 0), (z.t || 0) * 5));
    if (fade <= 0) return;
    const r = z.r || 60;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= fade;
    // 蓋章的星形印子（壓扁在地上）
    const spread = 1 + Math.min(1, (z.t || 0) * 6) * 0.05;
    const stamp = (c, k) => {
      const n = 5;
      for (let i = 0; i <= n * 2; i++) {
        const a = -PI / 2 + (i / (n * 2)) * TAU;
        const rr = (i % 2 ? r * 0.5 : r) * k * spread;
        const px = Math.cos(a) * rr;
        const py = -3 + Math.sin(a) * rr * 0.3;
        if (!i) c.moveTo(px, py);
        else {
          const pa = -PI / 2 + ((i - 0.5) / (n * 2)) * TAU;
          c.quadraticCurveTo(Math.cos(pa) * r * 0.78 * k, -3 + Math.sin(pa) * r * 0.78 * k * 0.3, px, py);
        }
      }
      c.closePath();
    };
    A.shape(ctx, (c) => stamp(c, 1), '#3c3a8e', '#2c2a74', { noStroke: true, shadeY: -1 });
    // 印面的花紋：內圈的星線
    ctx.strokeStyle = A.c('#6a68c0');
    ctx.lineWidth = 2;
    ctx.beginPath();
    stamp(ctx, 0.55);
    ctx.stroke();
    // 光澤
    ctx.fillStyle = 'rgba(200,200,255,0.35)';
    for (let i = 0; i < 3; i++) {
      const x = Math.sin(t * 0.7 + i * 2.1) * r * 0.35;
      ctx.beginPath();
      ctx.ellipse(x - r * 0.1, -5, r * 0.1, 1.4, 0, 0, TAU);
      ctx.fill();
    }
    // 四周濺出的墨點
    ctx.fillStyle = A.c('#3c3a8e');
    for (let i = 0; i < 7; i++) {
      const a = i * 2.3 + (z.seed || 0);
      const d = r * (1.05 + (i % 3) * 0.08);
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d, -3 + Math.sin(a) * d * 0.22, 2.5 + (i % 2) * 1.5, 1.2 + (i % 2) * 0.5, 0, 0, TAU);
      ctx.fill();
    }
    // 冒小泡
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.8 + i * 0.33) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      ctx.strokeStyle = A.c('#8a88e0');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(Math.sin(i * 2.7 + 1) * r * 0.5, -4 - q * 10, 1.5 + q * 2.5, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ═════════════ 素材圖示（中心在 0,0，約 -18～18） ═════════════
  const ICON3 = {
    // 郵票：齒孔邊＋小郵筒圖案
    stamp(ctx) {
      ctx.save();
      ctx.rotate(-0.12);
      A.shape(ctx, (c) => {
        const w = 12;
        const h = 14;
        const n = 5;
        c.moveTo(-w, -h);
        for (let i = 0; i < n; i++) { const x = -w + ((i + 0.5) / n) * 2 * w; c.lineTo(x - 1.5, -h); c.arc(x, -h, 1.5, PI, 0, true); }
        c.lineTo(w, -h);
        for (let i = 0; i < n; i++) { const y = -h + ((i + 0.5) / n) * 2 * h; c.lineTo(w, y - 1.5); c.arc(w, y, 1.5, -PI / 2, PI / 2, true); }
        c.lineTo(w, h);
        for (let i = n - 1; i >= 0; i--) { const x = -w + ((i + 0.5) / n) * 2 * w; c.lineTo(x + 1.5, h); c.arc(x, h, 1.5, 0, PI, true); }
        c.lineTo(-w, h);
        for (let i = n - 1; i >= 0; i--) { const y = -h + ((i + 0.5) / n) * 2 * h; c.lineTo(-w, y + 1.5); c.arc(-w, y, 1.5, PI / 2, -PI / 2, true); }
        c.closePath();
      }, '#fff8ea', '#eadcc0', { lw: 2, shadeY: 8, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, -8.5, -10.5, 17, 17, 1.5), '#8fd4f4', null, { lw: 1.4, hl: false });
      // 小海浪
      A.shape(ctx, (c) => { c.moveTo(-8.5, 2); c.quadraticCurveTo(-4, -1, 0, 2); c.quadraticCurveTo(4, 5, 8.5, 1); c.lineTo(8.5, 6.5); c.lineTo(-8.5, 6.5); c.closePath(); }, '#3a98d4', null, { noStroke: true, hl: false });
      // 郵筒
      A.shape(ctx, (c) => { c.moveTo(-3.5, 4); c.lineTo(-3.5, -4); c.bezierCurveTo(-3.5, -8.5, 3.5, -8.5, 3.5, -4); c.lineTo(3.5, 4); c.closePath(); }, '#e8433a', null, { lw: 1.3, hl: false });
      line(ctx, [[-2, -3], [2, -3]], '#3a1a18', 1.2);
      ctx.fillStyle = A.c('#3a2a24');
      ctx.font = 'bold 4px ' + A.NUMFONT;
      ctx.textAlign = 'center';
      ctx.fillText('13', 5, 10.5);
      ctx.restore();
    },
    // 燈絲：一小截發光的螺旋鎢絲
    filament(ctx) {
      glow(ctx, 0, -2, 16, '255,210,110', 0.75);
      A.shape(ctx, (c) => { c.moveTo(-8, 10); c.lineTo(-7, 6); c.lineTo(7, 6); c.lineTo(8, 10); c.quadraticCurveTo(0, 13, -8, 10); c.closePath(); }, '#cfd4de', '#9ea6b6', { lw: 1.8, shadeY: 8.5, hl: false });
      line(ctx, [[-5, 6], [-7, -6]], '#8a92a4', 1.6);
      line(ctx, [[5, 6], [7, -6]], '#8a92a4', 1.6);
      ctx.save();
      ctx.lineCap = 'round';
      [[4.2, A.outline()], [2.2, A.c('#ff9a2a')], [1, A.c('#fffbe0')]].forEach(([w, col]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const k = i / 40;
          const x = -7 + k * 14 + Math.cos(k * TAU * 4) * 1.2;
          const y = -6 - Math.sin(k * PI) * 5 + Math.sin(k * TAU * 4) * 2.4;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore();
      sparkle(ctx, 10, -14, 3.2);
    },
    // 傘骨：一根彎彎的金屬傘骨，尾端還掛著一小片紫色傘布
    rib(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-12, -10); c.quadraticCurveTo(-2, -14, 6, -8); c.lineTo(-4, 2); c.quadraticCurveTo(-9, -3, -12, -10); c.closePath(); }, '#9468e0', '#744cc0', { lw: 2, shadeY: -4, hl: false });
      ctx.strokeStyle = A.c('#f4e6ff');
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-10, -9);
      ctx.lineTo(-2, -3);
      ctx.stroke();
      limb(ctx, (c) => { c.moveTo(-14, -12); c.quadraticCurveTo(2, -10, 13, 13); }, 4, '#c8ccd8');
      limb(ctx, (c) => { c.moveTo(0, -2); c.lineTo(-6, 9); }, 3.2, '#c8ccd8');
      A.ellipse(ctx, -14, -12, 2.2, 2.2, '#ffd24a', null, { lw: 1.4, hl: false });
      A.ellipse(ctx, 13, 13, 2, 2, '#6a5a70', null, { lw: 1.4, hl: false });
    },
    // 發條：黃銅渦捲彈簧＋小鑰匙
    spring(ctx) {
      ctx.save();
      ctx.lineCap = 'round';
      [[5, A.outline()], [2.8, A.c('#ffd24a')]].forEach(([w, col]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        for (let a = 0; a < TAU * 2.6; a += 0.15) {
          const r = 1.5 + a * 0.78;
          const x = -3 + Math.cos(a) * r;
          const y = 2 + Math.sin(a) * r;
          a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore();
      ctx.strokeStyle = A.c('#fff4c0');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-3, 2, 7, PI * 1.1, PI * 1.5);
      ctx.stroke();
      line(ctx, [[8, -7], [11, -10]], '#c08a22', 3);
      A.shape(ctx, (c) => { c.moveTo(11, -10); c.bezierCurveTo(7, -17, 16, -18, 11, -10); c.bezierCurveTo(18, -14, 18, -6, 11, -10); c.closePath(); }, '#ffd24a', '#e0a830', { lw: 1.6, hl: false, shadeY: -9 });
    },
    // 風箏線：線軸＋一段線和蝴蝶結
    kitestring(ctx) {
      limb(ctx, (c) => { c.moveTo(-2, -2); c.bezierCurveTo(6, -12, 10, 2, 16, -14); }, 3, '#fff4dc');
      A.shape(ctx, (c) => poly(c, [[12, -10], [7, -14], [7, -6]]), '#ff6fa0', null, { lw: 1.5, hl: false });
      A.shape(ctx, (c) => poly(c, [[12, -10], [17, -14], [17, -6]]), '#ff6fa0', null, { lw: 1.5, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, -15, -9, 5, 22, 2), '#c89458', '#a87438', { lw: 1.8, hl: false, shadeY: 6 });
      A.shape(ctx, (c) => A.roundRect(c, 1, -9, 5, 22, 2), '#c89458', '#a87438', { lw: 1.8, hl: false, shadeY: 6 });
      A.shape(ctx, (c) => A.roundRect(c, -11, -5, 13, 14, 2), '#fff4dc', '#e8d8b8', { lw: 1.8, hl: false, shadeY: 5 });
      ctx.strokeStyle = A.c('#d8c098');
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(-10, -2 + i * 3);
        ctx.lineTo(1, -3 + i * 3);
      }
      ctx.stroke();
    },
    // 積木：ABC 字母方塊
    block(ctx) {
      A.shape(ctx, (c) => poly(c, [[-11, -6], [-4, -13], [14, -13], [7, -6]]), '#ffd66a', null, { lw: 2, hl: false });
      A.shape(ctx, (c) => poly(c, [[7, -6], [14, -13], [14, 5], [7, 12]]), '#326cc8', null, { lw: 2, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, -11, -6, 18, 18, 1.5), '#f0524a', '#c63a36', { cel: [2, 2], lw: 2.2, hl: false });
      ctx.strokeStyle = A.c('#ffb0a8');
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-8.5, -3.5, 13, 13);
      ctx.fillStyle = A.c('#ffffff');
      ctx.font = 'bold 11px ' + A.NUMFONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', -2, 3.5);
      ctx.fillStyle = A.c('#ffffff');
      ctx.font = 'bold 6px ' + A.NUMFONT;
      ctx.fillText('B', 10.5, 0);
    },
    // 印泥：打開的圓形印泥盒
    ink(ctx) {
      A.shape(ctx, (c) => c.ellipse(0, 4, 15, 8, 0, 0, TAU), '#c8ccd8', '#9ea6b6', { lw: 2, shadeY: 7, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-15, 4); c.lineTo(-15, 0); c.ellipse(0, 0, 15, 7, 0, PI, 0); c.lineTo(15, 4); c.ellipse(0, 4, 15, 7, 0, 0, PI); c.closePath(); }, '#d8dce6', '#aeb4c4', { lw: 2, shadeY: 3, hl: false });
      A.shape(ctx, (c) => c.ellipse(0, 0, 12, 5.2, 0, 0, TAU), '#3c3a8e', '#2c2a74', { lw: 1.8, shadeY: 1.5, hl: false });
      ctx.fillStyle = 'rgba(200,200,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(-4, -1.5, 4, 1.2, -0.1, 0, TAU);
      ctx.fill();
      // 蓋子上的星星印
      A.shape(ctx, (c) => starPath(c, 7, -12, 5.5, 2.4, 5, -PI / 2), '#3c3a8e', null, { lw: 1.6, hl: false });
    },
    // 風箱皮：一段摺起來的酒紅色風箱
    bellowskin(ctx) {
      const n = 5;
      for (let k = 0; k < n * 2; k++) {
        const x0 = -15 + k * 3;
        const x1 = x0 + 3;
        const r = k % 2 === 0;
        ctx.fillStyle = A.c(r ? '#c8445e' : '#8e2a44');
        ctx.beginPath();
        ctx.moveTo(x0, -10 + (r ? 0 : 2.5));
        ctx.lineTo(x1, -10 + (r ? 2.5 : 0));
        ctx.lineTo(x1, 10 - (r ? 2.5 : 0));
        ctx.lineTo(x0, 10 - (r ? 0 : 2.5));
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = A.c('#fbe6d4');
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k <= n * 2; k += 2) { ctx.moveTo(-15 + k * 3, -8.5); ctx.lineTo(-15 + k * 3, 8.5); }
      ctx.stroke();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let k = 0; k <= n * 2; k++) { const x = -15 + k * 3; const y = -10 + (k % 2 ? 2.5 : 0); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      for (let k = n * 2; k >= 0; k--) { const x = -15 + k * 3; const y = 10 - (k % 2 ? 2.5 : 0); ctx.lineTo(x, y); }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = A.c('#ffd24a');
      for (let k = 0; k <= n * 2; k += 2) { ctx.fillRect(-15 + k * 3 - 1.2, -11, 2.4, 2.4); ctx.fillRect(-15 + k * 3 - 1.2, 8.6, 2.4, 2.4); }
      A.shape(ctx, (c) => A.roundRect(c, 14, -12, 5, 24, 1.5), '#3a3244', null, { lw: 1.8, hl: false });
    },
    // 音梳：八音盒的鋼片梳子
    comb(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -15, -12, 30, 8, 2), '#c8ccd8', '#9ea6b6', { lw: 2, shadeY: -7, hl: false });
      const n = 8;
      for (let i = 0; i < n; i++) {
        const x = -13 + i * 3.6;
        const len = 20 - i * 1.6;
        A.shape(ctx, (c) => A.roundRect(c, x, -5, 2.6, len, 1), '#e4e8f0', '#b8bfcc', { lw: 1.3, shadeY: -5 + len * 0.6, hl: false });
      }
      [-10, 0, 10].forEach((x) => dot(ctx, x, -8, 1.3, '#6a7080'));
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-13, -11, 20, 1.4);
      noteGlyph(ctx, 12, 8, 0.55, '#ffd24a', '#e0a830');
    },
  };

  Object.assign(A.MONSTER_DRAW, { postcrab, bulbjelly, umbrellagull, alarmurchin, kiteray, blockcoral, stampstar, accordioneel, musicturtle });
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  Object.assign(A.PROJ_DRAW, { letter, spike, note });
  Object.assign(A.ZONE_DRAW, { ink });
  if (A.ICON) Object.assign(A.ICON, ICON3);
})();
