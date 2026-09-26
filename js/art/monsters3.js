// 第二章新怪物（潮風海岬）：自然物 ＋ 一個劍與魔法的奇幻概念（見 docs/SPEC-monsters.md「第二、三章」）。
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
  // 放射狀光暈；顏色走 A.c()，受擊閃白／閃光怪／染色時一起變
  function glow(ctx, x, y, r, col, a) {
    if (!(a > 0) || !(r > 0)) return;
    const rgb = U.hexToRgb(A.c(col)).join(',');
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

  // ───────────── 奇幻共用：符文、法陣 ─────────────
  // 符文字形（單位座標 -1～1 的筆畫）
  const RUNES = [
    [[[0, -1], [0, 1]], [[0, -0.35], [0.65, -0.95]], [[0, 0.2], [0.65, -0.4]]],
    [[[-0.45, 1], [-0.45, -1]], [[-0.45, -0.6], [0.5, 0], [-0.45, 0.55]]],
    [[[0, -1], [0, 1]], [[-0.65, -0.55], [0.65, 0.55]], [[0.65, -0.55], [-0.65, 0.55]]],
    [[[0, 1], [0, -1]], [[-0.65, -0.85], [0, -0.15], [0.65, -0.85]]],
    [[[-0.55, -1], [0.45, 0], [-0.55, 1]], [[0.55, -1], [0.55, 1]]],
    [[[0, -1], [0, 1]], [[0, -1], [0.6, -0.45]], [[0, -0.1], [-0.6, -0.6]]],
    [[[-0.6, -0.4], [0, -1], [0.6, -0.4], [0, 0.2], [-0.6, -0.4]], [[0, 0.2], [0, 1]]],
    [[[-0.6, -1], [-0.6, 1], [0.6, -1], [0.6, 1], [-0.6, -1]]],
  ];
  function runeGlyph(ctx, x, y, s, idx, col, w) {
    const g = RUNES[((Math.floor(idx) % RUNES.length) + RUNES.length) % RUNES.length];
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = w || Math.max(1, s * 0.32);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    g.forEach((st) => st.forEach((p, i) => (i ? ctx.lineTo(x + p[0] * s, y + p[1] * s) : ctx.moveTo(x + p[0] * s, y + p[1] * s))));
    ctx.stroke();
  }
  // 發光符文：先一層粗的光，再細的亮芯
  function glowRune(ctx, x, y, s, idx, col, core, a) {
    ctx.save();
    ctx.globalAlpha *= a == null ? 1 : a;
    glow(ctx, x, y, s * 2.6, col, 0.55);
    runeGlyph(ctx, x, y, s, idx, col, s * 0.62);
    runeGlyph(ctx, x, y, s, idx, core || '#ffffff', s * 0.26);
    ctx.restore();
  }
  // 魔法陣（圓心在原點，半徑 r）。呼叫前可以先 scale(1, 0.3) 壓成地面透視
  function magicCircle(ctx, r, rot, col, core, opts) {
    opts = opts || {};
    const lw = opts.lw || 1;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 外圈（雙線）
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = 3 * lw;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 1.4 * lw;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 0, TAU);
    ctx.stroke();
    // 兩圈之間的符文帶
    const n = opts.runes || 8;
    ctx.save();
    ctx.rotate(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      ctx.save();
      ctx.rotate(a);
      runeGlyph(ctx, 0, -r * 0.9, r * 0.075, i * 3 + 1, core, 1.3 * lw);
      ctx.restore();
    }
    ctx.restore();
    // 內部的星形（反方向轉）
    ctx.save();
    ctx.rotate(-rot * 1.4);
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = 1.8 * lw;
    ctx.beginPath();
    const k = opts.star || 5;
    for (let i = 0; i <= k; i++) {
      const a = -PI / 2 + ((i * 2) % k) / k * TAU;
      const px = Math.cos(a) * r * 0.78;
      const py = Math.sin(a) * r * 0.78;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.lineWidth = 1.2 * lw;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, TAU);
    ctx.stroke();
    ctx.restore();
    // 中心亮點
    glow(ctx, 0, 0, r * 0.45, core, 0.6);
    ctx.restore();
  }

  // ═════════════ 第二章：潮風海岬 ═════════════

  // ── 卷軸寄居蟹：寄居蟹 ＋ 封著蠟印的魔法卷軸當殼（捲紙的斷面像螺殼） ──
  function postcrab(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const throwing = clamp01(num(fx.throwing, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const bob = walk ? Math.abs(Math.sin(t * 14)) * 1.6 : Math.sin(t * 2.6) * 0.7;
    let lean = walk ? Math.sin(t * 14) * 0.04 : Math.sin(t * 1.6) * 0.025;
    if (ph === 'wind') lean -= 0.14;
    else if (ph === 'strike' || ph === 'recover') lean += 0.1;
    lean += throwing * 0.06;
    if (hurt) lean -= 0.12 + Math.sin(t * 40) * 0.04;
    const open = Math.max(throwing, ph === 'wind' ? 0.45 : ph === 'strike' ? 1 : 0);
    const cr = ['#f7b98a', '#dc8a56'];
    const pap = ['#f8e8bc', '#dcc08a'];
    const wood = ['#9a5a30', '#74401e'];
    const by = -11 - bob;

    // 遠側的腳
    for (let i = 0; i < 2; i++) {
      const ph2 = t * 14 + i * 2.4 + 1;
      const lift = walk ? Math.max(0, Math.sin(ph2)) * 3 : 0;
      limb(ctx, (c) => { c.moveTo(2 + i * 6, by + 2); c.lineTo(-2 + i * 9, by - 2); c.lineTo(-6 + i * 10 + (walk ? Math.cos(ph2) * 1.5 : 0), -1 - lift); }, 4.4, cr[1]);
    }

    // 卷軸殼（斜躺在背上）
    ctx.save();
    ctx.translate(-9, -21 - bob * 0.6);
    ctx.rotate(-0.3 + lean);
    const L = 16;
    const R = 12;
    // 右端的木軸頭（在後面）
    A.shape(ctx, (c) => A.roundRect(c, L + 1, -3, 7, 6, 2), wood[0], wood[1], { lw: 2, shadeY: 1, hl: false });
    A.ellipse(ctx, L + 9, 0, 3.4, 4.2, wood[0], wood[1], { lw: 2, hl: false, shadeAt: 0.1 });
    // 打開：一張紙從卷軸頂上展開，上面是發光的符文
    if (open > 0.15) {
      const sh = 3 + open * 17;
      const wav = Math.sin(t * 9) * 1.5 * open;
      ctx.save();
      glow(ctx, 0, -R - sh * 0.6, 14 + open * 12, '#7ad8ff', 0.5 * open);
      A.shape(ctx, (c) => {
        c.moveTo(-L + 3, -R + 3);
        c.lineTo(-L + 1 + wav, -R - sh);
        c.quadraticCurveTo(0, -R - sh - 3 + wav, L - 3 + wav, -R - sh + 1);
        c.lineTo(L - 3, -R + 3);
        c.closePath();
      }, pap[0], pap[1], { lw: 2.2, shadeY: -R - 1, hl: false });
      // 頂邊捲起來的小紙捲
      A.shape(ctx, (c) => A.roundRect(c, -L + wav, -R - sh - 3.5, L * 2 - 2, 5.5, 2.75), pap[0], pap[1], { lw: 2, shadeY: -R - sh, hl: false });
      A.ellipse(ctx, L - 2 + wav, -R - sh - 0.75, 1.6, 2.75, '#e8d4a4', null, { lw: 1.4, hl: false });
      if (sh > 9) glowRune(ctx, wav * 0.5, -R - sh * 0.5 - 1, Math.min(5.5, sh * 0.26), 3, '#4ab8ff', '#e8fbff', Math.min(1, (sh - 9) / 6));
      ctx.restore();
    }
    // 卷軸本體（圓筒）
    const body = (c) => {
      c.moveTo(-L, -R);
      c.lineTo(L, -R);
      c.ellipse(L, 0, 4.5, R, 0, -PI / 2, PI / 2);
      c.lineTo(-L, R);
      c.closePath();
    };
    A.shape(ctx, body, pap[0], pap[1], { cel: [2.5, 3.5], hl: [-4, -8, 6, 1.8] });
    // 紙上的咒文行
    ctx.strokeStyle = A.c('#b89060');
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    [[-9, -4, 8], [-9, 1, 5], [-10, 6, 7]].forEach(([x, y, w]) => { ctx.moveTo(x, y); ctx.lineTo(x + w, y); });
    ctx.stroke();
    // 綁繩＋蠟印
    A.shape(ctx, (c) => A.roundRect(c, 4, -R - 0.5, 5, R * 2 + 1, 1.5), '#c8384a', '#a02838', { lw: 1.8, shadeY: 4, hl: false });
    const tail = Math.sin(t * 3) * 1.2;
    A.shape(ctx, (c) => { c.moveTo(5.5, 6); c.quadraticCurveTo(4 + tail, 14, 1 + tail, 18); c.lineTo(5 + tail, 17); c.quadraticCurveTo(7.5, 13, 8, 6); c.closePath(); }, '#c8384a', null, { lw: 1.6, hl: false });
    if (open > 0.3) glow(ctx, 6.5, 1.5, 12, '#ffb070', 0.6 * open);
    A.shape(ctx, (c) => {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        const rr = 6.2 + (i % 2 ? -0.7 : 0.4);
        i ? c.lineTo(6.5 + Math.cos(a) * rr, 1.5 + Math.sin(a) * rr) : c.moveTo(6.5 + Math.cos(a) * rr, 1.5 + Math.sin(a) * rr);
      }
      c.closePath();
    }, '#d8342a', '#a82420', { lw: 2, shadeY: 3.5, hl: [4.5, -1, 1.6, 1] });
    runeGlyph(ctx, 6.5, 1.5, 2.6, 6, open > 0.3 ? '#ffe8a0' : '#ff9a80', 1.3);
    // 左端的斷面：一圈圈捲起來的紙，像螺殼的漩渦
    A.ellipse(ctx, -L, 0, 5, R, '#fff4d6', '#e8d4a4', { lw: 2.4, hl: false, shadeAt: 0.2 });
    ctx.strokeStyle = A.c('#c8a468');
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let a = 0; a < TAU * 2.4; a += 0.2) {
      const rr = 1.2 + a * 0.62;
      const px = -L + Math.cos(a) * rr * 0.42;
      const py = Math.sin(a) * rr;
      a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    // 左端的木軸頭
    A.shape(ctx, (c) => A.roundRect(c, -L - 7, -2.5, 6, 5, 1.8), wood[0], wood[1], { lw: 2, shadeY: 1, hl: false });
    A.ellipse(ctx, -L - 8, 0, 3.2, 4, wood[0], wood[1], { lw: 2, hl: [-L - 9, -1.5, 1, 0.8], shadeAt: 0.1 });
    ctx.restore();

    // 近側的腳
    for (let i = 0; i < 3; i++) {
      const ph2 = t * 14 + i * 2.1;
      const lift = walk ? Math.max(0, Math.sin(ph2)) * 3.2 : 0;
      const x0 = 3 + i * 6;
      limb(ctx, (c) => { c.moveTo(x0, by + 3); c.lineTo(x0 + 5, by + 5); c.lineTo(x0 + 7 + (walk ? Math.cos(ph2) * 1.6 : 0), -1 - lift); }, 4.8, cr[0]);
    }
    // 後面的小螯（施法時舉高）
    limb(ctx, (c) => { c.moveTo(14, by - 4); c.lineTo(20, by - 12 - open * 3); }, 4.6, cr[1]);
    claw(ctx, 21, by - 14 - open * 3, 4.4, open * 0.6 + 0.2, cr[1], '#c4764a', -1.3);

    // 眼柄
    const wob = Math.sin(t * 3.4) * 1.1 + (hurt ? -2 : 0);
    limb(ctx, (c) => { c.moveTo(6, by - 8); c.lineTo(4 + wob, by - 19); c.moveTo(14, by - 9); c.lineTo(15 + wob, by - 19); }, 4.2, cr[0]);

    // 身體（從卷軸底下鑽出來的圓胖頭胸）
    A.ellipse(ctx, 11, by - 1, 12.5, 9.5, cr[0], cr[1], { cel: [3, 3], hl: [4, by - 6, 3.2, 1.8] });
    ctx.strokeStyle = A.c(cr[1]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, by + 5);
    ctx.quadraticCurveTo(4, by + 2.5, 8, by + 5);
    ctx.stroke();

    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || throwing > 0.5)) kind = 'angry';
    stalkEye(ctx, 4 + wob, by - 21, 4.8, m, kind);
    stalkEye(ctx, 15 + wob, by - 21, 4.5, m, kind);
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
    // 螯尖上凝聚的符文光點
    if (throwing > 0.3 || ph === 'wind') {
      const q = Math.max(throwing, 0.5);
      glowRune(ctx, 34, by - 12, 3.2, Math.floor(t * 4), '#4ab8ff', '#e8fbff', q);
    }
  }

  // ── 鬼火水母：半透明的水母傘裡住著一團幽藍鬼火，觸手是飄散的靈光 ──
  function bulbjelly(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const off = clamp01(num(fx.lightOff, 0));
    const fl = clamp01(num(fx.flash, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    let flick = 1;
    if (ph === 'wind') flick = 0.6 + 0.4 * Math.abs(Math.sin(t * 38));
    if (hurt) flick *= 0.7 + 0.3 * Math.abs(Math.sin(t * 50));
    const lit = (1 - off) * flick;
    const fy = Math.sin(t * 2.4) * 3;
    const pulse = 1 + Math.sin(t * 4.8) * 0.04;
    const cy = -44 - fy;
    const rimY = cy + 10;

    // 光暈
    glow(ctx, 0, cy - 4, 50, '#6ad4ff', 0.45 * lit + fl * 0.45);
    if (fl > 0) {
      // 重新亮起的一瞬間：一圈鬼火電光
      ctx.save();
      ctx.globalAlpha *= fl;
      const R = 26 + (1 - fl) * 28;
      ctx.strokeStyle = A.c('#bff4ff');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, cy - 4, R, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        bolt(ctx, Math.cos(a) * (R - 8), cy - 4 + Math.sin(a) * (R - 8), Math.cos(a) * (R + 9), cy - 4 + Math.sin(a) * (R + 9), i + t, '#dffaff');
      }
      ctx.restore();
    }

    // 靈光觸手：沒有描邊，一段段往下淡掉，尾端飄出小光點
    const wisps = [-12, -6, 0, 6, 12];
    const baseA = ctx.globalAlpha;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    wisps.forEach((x, i) => {
      const ph2 = t * 3 + i * 1.3;
      const pts = [];
      const len = 30 + (i % 2) * 6;
      for (let k = 0; k <= 8; k++) {
        const q = k / 8;
        pts.push([x * (1 + q * 0.35) + Math.sin(ph2 - q * 4) * 4 * q, rimY + 2 + q * len]);
      }
      for (let k = 0; k < 8; k++) {
        const a = (1 - k / 8) * (0.25 + 0.75 * lit);
        ctx.globalAlpha = baseA * a * 0.35;
        ctx.strokeStyle = A.c('#7ad8ff');
        ctx.lineWidth = 7 - k * 0.5;
        ctx.beginPath();
        ctx.moveTo(pts[k][0], pts[k][1]);
        ctx.lineTo(pts[k + 1][0], pts[k + 1][1]);
        ctx.stroke();
        ctx.globalAlpha = baseA * a * 0.95;
        ctx.strokeStyle = A.c(U.mix('#e6fcff', '#8a9ab8', off));
        ctx.lineWidth = 2.6 - k * 0.2;
        ctx.stroke();
      }
      const q = (t * 0.7 + i * 0.37) % 1;
      ctx.globalAlpha = baseA * (1 - q) * (0.3 + 0.7 * lit);
      dot(ctx, pts[8][0] + Math.sin(t * 2 + i) * 3, pts[8][1] + q * 8, 1.8 - q, '#dffaff');
    });
    ctx.restore();

    // 荷葉邊（傘緣）
    ctx.save();
    ctx.translate(0, rimY);
    ctx.scale(pulse, 1);
    ctx.globalAlpha *= 0.85;
    A.shape(ctx, (c) => {
      const n = 7;
      const W = 21;
      c.moveTo(-W, -3);
      c.lineTo(W, -3);
      for (let i = 0; i < n; i++) {
        const x0 = W - (i / n) * 2 * W;
        const x1 = W - ((i + 1) / n) * 2 * W;
        c.quadraticCurveTo((x0 + x1) / 2, 6 + Math.sin(t * 5 + i) * 1.5, x1, -3);
      }
      c.closePath();
    }, U.mix('#a8d8ff', '#8a92a8', off), U.mix('#7ab4ec', '#6a7488', off), { lw: 2.2, shadeY: 1, hl: false });
    ctx.restore();

    // 傘（半透明），裡面是鬼火
    ctx.save();
    ctx.translate(0, cy);
    ctx.scale(pulse, 2 - pulse);
    const bell = (c) => {
      c.moveTo(-21, 10);
      c.bezierCurveTo(-24, -6, -16, -24, 0, -24);
      c.bezierCurveTo(16, -24, 24, -6, 21, 10);
      c.quadraticCurveTo(0, 14, -21, 10);
      c.closePath();
    };
    ctx.save();
    ctx.globalAlpha *= 0.62 - off * 0.12;
    A.shape(ctx, bell, U.mix('#c4e2ff', '#a8b0c4', off), U.mix('#94bcf0', '#8890a4', off), { cel: [3.5, 3], noStroke: true });
    ctx.restore();
    // 鬼火（三股火舌，會晃）
    const fk = (0.4 + 0.6 * (1 - off)) * (1 + fl * 0.25) * (0.9 + 0.1 * flick);
    const sw = Math.sin(t * 7) * 1.6;
    const fyB = -2;
    const flame = (c, k) => {
      const h = 16.5 * fk * k;
      const w = 9 * fk * k;
      c.moveTo(0, fyB);
      c.bezierCurveTo(-w * 1.25, fyB, -w * 1.2, fyB - h * 0.5, -w * 0.55, fyB - h * 0.7);
      c.quadraticCurveTo(-w * 0.4 + sw * 0.5, fyB - h * 0.85, -w * 0.6 + sw, fyB - h * 1.02);
      c.quadraticCurveTo(-w * 0.05, fyB - h * 0.82, 0 + sw * 0.6, fyB - h * 1.25);
      c.quadraticCurveTo(w * 0.2, fyB - h * 0.82, w * 0.65 + sw, fyB - h * 0.98);
      c.quadraticCurveTo(w * 0.45 + sw * 0.5, fyB - h * 0.8, w * 0.6, fyB - h * 0.68);
      c.bezierCurveTo(w * 1.2, fyB - h * 0.5, w * 1.25, fyB, 0, fyB);
      c.closePath();
    };
    glow(ctx, 0, fyB - 10 * fk, 18 * fk + 4, '#8ae8ff', 0.8 * lit + fl * 0.3);
    A.shape(ctx, (c) => flame(c, 1), U.mix('#58c8ff', '#4a5a8a', off), U.mix('#3a9ae8', '#3a4670', off), { cel: [2, 1.5], lw: 2, hl: false });
    A.shape(ctx, (c) => flame(c, 0.58), U.mix('#e8ffff', '#7a8ab0', off), null, { noStroke: true, hl: false });
    // 傘的反光與描邊
    ctx.save();
    ctx.globalAlpha *= 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-13, -11, 2.6, 6.5, 0.45, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-8, -19, 1.7, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    bell(ctx);
    ctx.lineWidth = A.LW;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    ctx.restore();

    // 臉（在傘的下半部）
    let kind = eyeKind(m);
    if (kind === 'normal' && off > 0.6) kind = 'closed';
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    faceEyes(ctx, -5, cy + 4, 10, 3.1, 4, m, kind);
    smallMouth(ctx, 0.5, cy + 10, hurt || ph === 'strike', 0.7);
    if (off < 0.6) {
      A.blush(ctx, -12, cy + 7.5, 2.8);
      A.blush(ctx, 12, cy + 7, 2.6);
    } else {
      // 熄滅時冒出的小煙
      ctx.save();
      ctx.globalAlpha *= (off - 0.6) / 0.4;
      for (let i = 0; i < 2; i++) {
        const q = (t * 0.9 + i * 0.5) % 1;
        ctx.strokeStyle = A.c('#9aa6c8');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(4 + Math.sin(q * 6 + i) * 3, cy - 26 - q * 14, 2 + q * 3, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (ph === 'strike' || (ph === 'wind' && Math.sin(t * 30) > 0)) {
      for (let i = 0; i < 4; i++) {
        const a = t * 7 + (i * TAU) / 4;
        const r0 = 25;
        bolt(ctx, Math.cos(a) * r0, cy - 4 + Math.sin(a) * r0, Math.cos(a) * (r0 + 11), cy - 4 + Math.sin(a) * (r0 + 11), t * 3 + i, '#bff4ff');
      }
    }
  }

  // ── 巫師海鷗：海鷗戴尖頂巫師帽、披星紋斗篷；漂浮時斗篷張開成傘狀、帽尖發光 ──
  function wizardHat(ctx, x, y, t, lit, droop) {
    const hat = ['#5a46c0', '#3e2f96'];
    ctx.save();
    ctx.translate(x, y);
    // 帽身（尖端往後垂）
    const tipX = -13 - droop * 3;
    const tipY = -25 + droop * 2 + Math.sin(t * 2.5) * 0.8;
    const cone = (c) => {
      c.moveTo(-8.5, 0);
      c.quadraticCurveTo(-5, -12, -6 + tipX * 0.25, -19);
      c.quadraticCurveTo(tipX * 0.6, -23, tipX, tipY);
      c.quadraticCurveTo(tipX * 0.2, -19, 2, -13);
      c.quadraticCurveTo(6, -6, 8.5, 0);
      c.closePath();
    };
    A.shape(ctx, cone, hat[0], hat[1], { cel: [2.5, 2], hl: [-3, -9, 1.6, 3.2] });
    // 金色帽帶
    A.shape(ctx, (c) => { c.moveTo(-8.8, -1); c.quadraticCurveTo(0, -5.5, 8.8, -1); c.lineTo(8, -4.5); c.quadraticCurveTo(0, -9, -8, -4.5); c.closePath(); }, '#ffd24a', '#e0a830', { lw: 1.8, shadeY: -2.5, hl: false });
    // 帽身上的小星星
    A.shape(ctx, (c) => starPath(c, 1.5, -11, 2.6, 1.1, 5, -PI / 2), '#ffe27a', null, { lw: 1, hl: false });
    dot(ctx, -3.5, -16, 0.9, '#ffe27a');
    // 帽簷
    A.shape(ctx, (c) => c.ellipse(0, 0.5, 14, 3.6, -0.06, 0, TAU), hat[0], hat[1], { lw: 2.2, shadeY: 1.5, hl: false });
    // 帽尖的星光
    if (lit > 0.02) {
      glow(ctx, tipX, tipY, 12, '#ffe890', 0.85 * lit);
      sparkle(ctx, tipX, tipY, 3.5 + Math.sin(t * 9) * 0.8, '#fffbe0');
    }
    A.ellipse(ctx, tipX, tipY, 2, 2, lit > 0.02 ? '#fff6b0' : '#ffd24a', null, { lw: 1.4, hl: false });
    ctx.restore();
  }
  function umbrellagull(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const glide = !!fx.gliding;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const air = !!(m.hover > 1) || !m.onGround;
    const walk = walking(m);
    const cloak = ['#34449c', '#25317a'];
    const lining = ['#9a6ae0', '#7a4cc0'];
    const white = ['#fbf8f0', '#ddd6c6'];
    const wingC = ['#b4bcca', '#949eae'];

    ctx.save();
    if (glide) {
      // 掛在斗篷傘下像鐘擺一樣晃
      ctx.translate(2, -80);
      ctx.rotate(Math.sin(t * 2.2) * 0.08);
      ctx.translate(-2, 80);
    } else if (ph === 'strike') {
      ctx.rotate(0.22);
    } else if (walk) {
      ctx.rotate(Math.sin(t * 12) * 0.06);
    }

    const flapSpd = ph === 'wind' ? 22 : 13;
    const flap = glide ? 0 : air ? Math.sin(t * flapSpd) : 0;
    const dangle = glide ? Math.sin(t * 2.2 + 0.6) * 2 : 0;

    // 張開成傘狀的斗篷（在最後面）
    if (glide) {
      const rimY = -70;
      const W = 32;
      const cx = 2;
      const billow = Math.sin(t * 3) * 1.5;
      const can = (c) => {
        c.moveTo(cx - W, rimY);
        c.bezierCurveTo(cx - W + 2, rimY - 24 - billow, cx + W - 2, rimY - 24 - billow, cx + W, rimY);
        const n = 7;
        for (let i = 0; i < n; i++) {
          const x0 = cx + W - (i / n) * 2 * W;
          const x1 = cx + W - ((i + 1) / n) * 2 * W;
          c.quadraticCurveTo((x0 + x1) / 2, rimY + 6 + Math.sin(t * 4 + i) * 1.2, x1, rimY);
        }
        c.closePath();
      };
      // 斗篷兩側往下收到肩膀的布
      A.shape(ctx, (c) => { c.moveTo(cx - W + 3, rimY + 1); c.quadraticCurveTo(-26, -56, -19, -44); c.lineTo(-13, -46); c.quadraticCurveTo(-18, -58, cx - W + 12, rimY + 3); c.closePath(); }, lining[0], lining[1], { lw: 2, shadeY: -48, hl: false });
      A.shape(ctx, (c) => { c.moveTo(cx + W - 3, rimY + 1); c.quadraticCurveTo(22, -56, 9, -46); c.lineTo(3, -48); c.quadraticCurveTo(14, -60, cx + W - 12, rimY + 3); c.closePath(); }, lining[0], lining[1], { lw: 2, shadeY: -48, hl: false });
      glow(ctx, cx, rimY - 8, 40, '#b8a0ff', 0.35);
      A.shape(ctx, can, cloak[0], cloak[1], { cel: [4, 3], hl: [cx - 14, rimY - 15, 6, 2.2] });
      // 金邊
      ctx.save();
      ctx.beginPath();
      can(ctx);
      ctx.clip();
      ctx.strokeStyle = A.c('#ffd24a');
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const x0 = cx + W - (i / 7) * 2 * W;
        const x1 = cx + W - ((i + 1) / 7) * 2 * W;
        if (!i) ctx.moveTo(x0, rimY - 2.5);
        ctx.quadraticCurveTo((x0 + x1) / 2, rimY + 3.5 + Math.sin(t * 4 + i) * 1.2, x1, rimY - 2.5);
      }
      ctx.stroke();
      ctx.restore();
      // 星紋
      [[cx - 16, rimY - 10, 3.2], [cx + 3, rimY - 17, 3.6], [cx + 19, rimY - 8, 2.8]].forEach(([x, y, r], i) => {
        A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.42, 5, -PI / 2 + Math.sin(t * 2 + i) * 0.2), '#ffe27a', null, { lw: 1.2, hl: false });
      });
      [[cx - 6, rimY - 6], [cx + 12, rimY - 14], [cx - 22, rimY - 4], [cx + 25, rimY - 3]].forEach(([x, y]) => dot(ctx, x, y, 1, '#fff4c0'));
      // 飄浮術的光點
      for (let i = 0; i < 4; i++) {
        const q = (t * 0.8 + i * 0.25) % 1;
        ctx.save();
        ctx.globalAlpha *= 1 - q;
        sparkle(ctx, cx - 24 + i * 16 + Math.sin(t * 3 + i) * 3, rimY + 4 + q * 30, 2.4, '#e8dcff');
        ctx.restore();
      }
    } else {
      // 披在背後的斗篷（走路時往後飄）
      const fl2 = walk ? Math.sin(t * 12) * 2 : Math.sin(t * 2.5) * 1;
      const up = air ? -4 : 0;
      A.shape(ctx, (c) => {
        c.moveTo(4, -34);
        c.quadraticCurveTo(-14, -34, -20 + fl2 * 0.3, -18 + up);
        c.quadraticCurveTo(-24 + fl2, -8 + up, -22 + fl2, -4 + up);
        c.lineTo(-17 + fl2, -7 + up);
        c.lineTo(-13 + fl2 * 0.8, -3 + up);
        c.lineTo(-9 + fl2 * 0.6, -8 + up * 0.5);
        c.quadraticCurveTo(-4, -20, 6, -26);
        c.closePath();
      }, cloak[0], cloak[1], { cel: [2.5, 2.5], hl: false });
      A.shape(ctx, (c) => starPath(c, -15 + fl2 * 0.5, -17, 2.6, 1.1, 5, -PI / 2), '#ffe27a', null, { lw: 1, hl: false });
      dot(ctx, -10, -24, 0.9, '#fff4c0');
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

    // 翅膀
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
      A.shape(ctx, (c) => { c.moveTo(-17, -5.6); c.quadraticCurveTo(-21, -5, -24, -3); c.lineTo(-19, 0); c.lineTo(-23, 3); c.quadraticCurveTo(-19, 4.2, -16, 4.2); c.closePath(); }, '#4a4e5c', null, { lw: 1.8, hl: false });
      ctx.restore();
    };
    // 遠側翅膀：漂浮時高舉抓著斗篷邊
    if (glide) wing(PI * 0.45 + Math.sin(t * 2.2) * 0.05, 1.1, ['#9aa2b2', '#7e8698']);
    else wing(-0.9 - flap * 0.8 + (ph === 'wind' ? -0.4 : 0), 0.9, ['#9aa2b2', '#7e8698']);

    // 尾羽
    A.shape(ctx, (c) => { c.moveTo(-12, -24); c.lineTo(-25, -29); c.lineTo(-24, -20); c.lineTo(-12, -15); c.closePath(); }, '#e8e4dc', '#c8c2b6', { lw: 2.2, shadeY: -21 });
    line(ctx, [[-23.5, -28], [-23, -21]], '#4a4e5c', 2.4);

    // 身體＋頭
    A.ellipse(ctx, -2, -20, 14.5, 11.5, white[0], white[1], { cel: [3, 3], hl: false });
    A.ellipse(ctx, 8, -33, 10.5, 10, white[0], white[1], { cel: [2.5, 2.5], hl: [3, -37, 2.6, 1.6] });
    A.ellipse(ctx, 4, -25, 7, 5, white[0], null, { noStroke: true, hl: false });
    // 斗篷的領口與金扣
    A.shape(ctx, (c) => { c.moveTo(-3, -30); c.quadraticCurveTo(4, -23, 14, -26); c.lineTo(13, -23); c.quadraticCurveTo(4, -19, -4, -26); c.closePath(); }, cloak[0], cloak[1], { lw: 2, shadeY: -23, hl: false });
    A.ellipse(ctx, 12, -24.5, 2.4, 2.4, '#ffd24a', '#e0a830', { lw: 1.5, hl: false });

    // 巫師帽
    const hatLit = glide ? 0.75 + Math.sin(t * 6) * 0.25 : ph === 'wind' ? 0.5 : 0;
    wizardHat(ctx, 7, -41.5, t, hatLit, glide ? 1 : 0);

    // 臉
    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || ph === 'strike')) kind = 'angry';
    faceEyes(ctx, 6, -33.5, 8, 2.8, 3.7, m, kind);
    A.shape(ctx, (c) => { c.moveTo(15, -30); c.quadraticCurveTo(24, -31, 27, -27); c.quadraticCurveTo(21, -24.5, 15, -26); c.closePath(); }, '#ffcf3a', '#e8a61e', { lw: 2, shadeY: -27.5 });
    dot(ctx, 22.8, -26.8, 1.3, '#e8483a');
    if (hurt || ph === 'strike') smallMouth(ctx, 17, -21.5, true, 0.6);
    A.blush(ctx, 3, -28, 2.6);
    A.blush(ctx, 18, -32.5, 1.8);

    // 近側翅膀
    if (glide) wing(PI * 0.27 + Math.sin(t * 2.2 + 1) * 0.05, 1.1, wingC);
    else wing(-0.2 - flap * 0.7 + (ph === 'wind' ? -0.6 : 0), 1, wingC);
    ctx.restore();
  }

  // ── 爆裂符文海膽：刺上刻著紅色爆裂符文，頭頂一顆魔法水晶；符文依序亮起，亮滿炸出尖刺 ──
  function alarmurchin(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const ring = clamp01(num(fx.ring, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const hop = walk ? Math.abs(Math.sin(t * 10)) * 2.5 : 0;
    const shakeX = ring * (0.8 + ring * 2) * Math.sin(t * 61);
    const shakeR = ring * 0.07 * Math.sin(t * 47);
    const cy = -23 - hop;
    const body = ['#7a5ab0', '#5a3e8e'];
    const spine = ['#43375e', '#2e2544'];

    ctx.save();
    ctx.translate(shakeX, 0);

    // 小管足
    const lk = walk ? Math.sin(t * 10) : 0;
    A.ellipse(ctx, -9, -3 - Math.max(0, lk) * 2.5, 4.5, 3.2, '#b48ae0', '#9068c0', { lw: 2, hl: false });
    A.ellipse(ctx, 9, -3 - Math.max(0, -lk) * 2.5, 4.5, 3.2, '#b48ae0', '#9068c0', { lw: 2, hl: false });

    ctx.save();
    ctx.translate(0, cy);
    ctx.rotate(shakeR);

    // 蓄力中的紅光
    if (ring > 0) glow(ctx, 0, 0, 30 + ring * 14, '#ff5a3a', 0.25 + ring * 0.45);

    // 刺：由上方順時針排，依序點亮
    const N = 14;
    let ext = 0;
    if (ph === 'wind') ext = -3;
    else if (ph === 'strike') ext = 7;
    const spines = [];
    for (let i = 0; i < N; i++) {
      const a = -PI / 2 + (i / N) * TAU + PI / N;
      if (Math.sin(a) > 0.8) continue; // 底部留給腳
      spines.push(a);
    }
    const litN = ring > 0 ? Math.floor(ring * (spines.length + 1)) : 0;
    spines.forEach((a, i) => {
      const on = i < litN;
      const L = 12 + ext + Math.sin(t * 3 + i * 1.7) * 0.8 + (on ? 2 + Math.abs(Math.sin(t * 30 + i)) * 1.5 : 0);
      const r0 = 13;
      ctx.save();
      ctx.rotate(a);
      A.shape(ctx, (c) => poly(c, [[r0 - 1, -3.4], [r0 + L * 0.55, -2.4], [r0 + L, 0], [r0 + L * 0.55, 2.4], [r0 - 1, 3.4]]),
        on ? '#5a3a58' : spine[0], null, { lw: 1.8, hl: false });
      // 刺上刻的符文（一小段折線）
      const rx = r0 + L * 0.42;
      if (on) glow(ctx, rx, 0, 7, '#ff5a3a', 0.9);
      ctx.strokeStyle = A.c(on ? '#ffd2a0' : '#b0303a');
      ctx.lineWidth = on ? 1.6 : 1.3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(rx - 2.4, -1.4);
      ctx.lineTo(rx - 0.6, 1.3);
      ctx.lineTo(rx + 1, -1.3);
      ctx.lineTo(rx + 2.4, 1.2);
      ctx.stroke();
      // 刺尖
      if (on) dot(ctx, r0 + L - 1.2, 0, 1.2, '#ffb080');
      ctx.restore();
    });

    // 身體
    A.ellipse(ctx, 0, 0, 16, 15.5, body[0], body[1], { cel: [3, 3], hl: [-7, -8, 3.4, 2] });
    // 身上的小疣粒
    [[-11, 4], [-8, 9], [10, 6], [5, 10], [-12, -4]].forEach(([x, y]) => dot(ctx, x, y, 1.3, '#a080d0'));

    // 頭頂的魔法水晶
    const cg = ring > 0 ? 0.5 + ring * 0.5 : 0.25 + Math.sin(t * 2) * 0.1;
    glow(ctx, 0, -20, 12 + ring * 8, '#ff6a4a', cg);
    ctx.save();
    ctx.translate(0, -15);
    ctx.rotate(Math.sin(t * 1.5) * 0.05);
    const gem = (x, h, w, lean) => (c) => poly(c, [[x - w, 0], [x - w + lean, -h * 0.7], [x + lean * 1.3, -h], [x + w + lean, -h * 0.7], [x + w, 0]]);
    A.shape(ctx, gem(-5.5, 8, 2.6, -1.5), '#e0405a', '#b02a46', { lw: 1.8, shadeY: -3, hl: false });
    A.shape(ctx, gem(5.5, 9, 2.6, 1.5), '#e0405a', '#b02a46', { lw: 1.8, shadeY: -3, hl: false });
    A.shape(ctx, gem(0, 14, 4, 0), U.mix('#ff6a6a', '#ffe0c0', ring * 0.6), '#d0384e', { cel: [1.6, 0], lw: 2, hl: false });
    line(ctx, [[-1.5, -2], [-1.5, -10]], '#ffffff', 1.2);
    A.shape(ctx, (c) => A.roundRect(c, -8, -1.5, 16, 4, 2), '#ffd24a', '#e0a830', { lw: 1.6, shadeY: 1, hl: false });
    ctx.restore();

    // 臉
    let kind = eyeKind(m);
    if (kind === 'normal' && ring > 0.35) kind = 'angry';
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    faceEyes(ctx, -4.6, -1.5, 9.4, 2.9, 3.8, m, kind);
    smallMouth(ctx, 0, 6, hurt || ring > 0.5 || ph === 'strike', 0.7);
    A.blush(ctx, -9, 3.5, 2.3);
    A.blush(ctx, 9, 3, 2.3);
    ctx.restore();

    // 亮滿時的警告火花
    if (ring > 0.6) {
      ctx.save();
      ctx.globalAlpha *= (ring - 0.6) / 0.4;
      for (let i = 0; i < 6; i++) {
        const a = t * 5 + (i / 6) * TAU;
        const r = 32 + Math.sin(t * 20 + i) * 3;
        sparkle(ctx, Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 2.6, '#ffd2a0');
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 槍騎魟魚：魟魚戴騎士頭盔，嘴前一支騎士長槍，尾巴是飄帶旗 ──
  function kiteray(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const dive = !!fx.dive;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const bob = dive ? 0 : Math.sin(t * 2.2) * 2.5;
    const flap = Math.sin(t * (dive ? 10 : 4.2));
    const skin = ['#4a92d8', '#2f6cb0'];
    const steel = ['#e4e9f2', '#aab4c6'];

    ctx.save();
    ctx.translate(0, -23 - bob);
    let ang = -0.08 + Math.sin(t * 1.7) * 0.05;
    if (dive) ang = 0.5;
    else if (ph === 'wind') ang = -0.3;
    else if (ph === 'strike') ang = 0.3;
    if (hurt) ang += Math.sin(t * 40) * 0.08;
    ctx.rotate(ang);

    // 尾巴 → 燕尾旗
    const T = [-28, 0];
    const amp = dive ? 1.5 : 4;
    const tail = [];
    for (let i = 0; i <= 5; i++) tail.push([T[0] - i * 4, T[1] + Math.sin(t * 5 - i * 0.9) * amp * (i / 5)]);
    limb(ctx, (c) => tail.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))), 3.6, skin[1]);
    const fp = tail[5];
    const flagWave = (k) => Math.sin(t * (dive ? 14 : 7) - k * 3) * (dive ? 1.5 : 3.5) * k;
    const flag = (c) => {
      c.moveTo(fp[0], fp[1] - 6);
      for (let k = 1; k <= 4; k++) c.lineTo(fp[0] - k * 6, fp[1] - 6 + k * 0.6 + flagWave(k / 4));
      c.lineTo(fp[0] - 22, fp[1] + flagWave(0.9));
      for (let k = 4; k >= 1; k--) c.lineTo(fp[0] - k * 6, fp[1] + 6 - k * 0.6 + flagWave(k / 4));
      c.lineTo(fp[0], fp[1] + 6);
      c.closePath();
    };
    A.shape(ctx, flag, '#e8433a', '#c02e2a', { shadeY: fp[1] + 1.5, lw: 2.2, hl: false });
    // 旗面的白條與金紋
    ctx.save();
    ctx.beginPath();
    flag(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#fff4e0');
    ctx.fillRect(fp[0] - 30, fp[1] - 1.3 + flagWave(0.5) * 0.5, 32, 2.6);
    ctx.restore();
    A.shape(ctx, (c) => starPath(c, fp[0] - 6, fp[1] - 0.5 + flagWave(0.25), 3, 1.3, 4, 0), '#ffd24a', null, { lw: 1.2, hl: false });
    limb(ctx, (c) => { c.moveTo(fp[0] + 1, fp[1] - 7); c.lineTo(fp[0] + 1, fp[1] + 7); }, 3.4, '#c89458');

    // 菱形身體（翅尖會上下拍）
    const N = [32, 0];
    const cx = 4;
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
    A.shape(ctx, body, skin[0], skin[1], { cel: [3, 3.5], hl: [-6, -8 + flap * 2, 5, 1.8] });
    // 背上的淺色斑點
    [[-10, -3], [-4, 6], [-16, 3], [2, -9]].forEach(([x, y], i) => dot(ctx, x, y + flap * (1 + i * 0.3), 1.7, '#a8d8ff'));

    // 騎士長槍（頭鰭夾著槍柄）
    const thrust = dive ? 6 : ph === 'strike' ? 5 : ph === 'wind' ? -3 : 0;
    ctx.save();
    ctx.translate(thrust, 3);
    if (dive || ph === 'strike') glow(ctx, 60, 0, 12, '#ffffff', 0.6);
    const lance = (c) => { c.moveTo(27, -4.2); c.lineTo(64, -0.4); c.quadraticCurveTo(66, 0, 64, 0.4); c.lineTo(27, 4.2); c.closePath(); };
    A.shape(ctx, lance, '#f6f2e8', '#d8cfb8', { lw: 2.2, shadeY: 1, hl: false });
    ctx.save();
    ctx.beginPath();
    lance(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#3a6ad0');
    for (let i = 0; i < 4; i++) {
      const x = 31 + i * 8;
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.lineTo(x + 4, -6);
      ctx.lineTo(x + 7, 6);
      ctx.lineTo(x + 3, 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    lance(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 槍尖的鋼
    A.shape(ctx, (c) => { c.moveTo(56, -1.4); c.lineTo(67, 0); c.lineTo(56, 1.4); c.closePath(); }, steel[0], steel[1], { lw: 1.6, shadeY: 0.2, hl: false });
    // 護手盤
    A.ellipse(ctx, 27, 0, 3, 8, steel[0], steel[1], { lw: 2, hl: [26, -4, 0.9, 2], shadeAt: 0.1 });
    ctx.restore();
    // 頭鰭（兩片小捲角夾住槍）
    [-1, 1].forEach((s) => {
      A.shape(ctx, (c) => {
        c.moveTo(24, s * 3 + 1);
        c.quadraticCurveTo(31, s * 5 + 3, 32 + thrust * 0.4, s * 4 + 3);
        c.quadraticCurveTo(30, s * 8 + 2, 23, s * 7 + 1);
        c.closePath();
      }, skin[0], skin[1], { lw: 1.8, shadeY: s * 6 + 2, hl: false });
    });

    // 騎士頭盔（蓋在額頭上，頂上一撮紅羽飾）
    ctx.save();
    ctx.translate(-5, 0.5);
    const plumeW = Math.sin(t * 6) * 1.5 + (dive ? 3 : 0);
    A.shape(ctx, (c) => {
      c.moveTo(14, -14);
      c.bezierCurveTo(8, -24, -4, -22 - plumeW, -10, -17 + plumeW * 0.5);
      c.quadraticCurveTo(-2, -19, 4, -15.5);
      c.quadraticCurveTo(-4, -14, -8, -10 + plumeW * 0.3);
      c.quadraticCurveTo(4, -9, 12, -11);
      c.closePath();
    }, '#e8433a', '#c02e2a', { lw: 2, shadeY: -13, hl: false });
    const helm = (c) => {
      c.moveTo(6, -5);
      c.bezierCurveTo(6, -16, 22, -18, 29, -6);
      c.quadraticCurveTo(29.5, -3.5, 27, -3.5);
      c.lineTo(8, -3.5);
      c.quadraticCurveTo(5.5, -3.5, 6, -5);
      c.closePath();
    };
    A.shape(ctx, helm, steel[0], steel[1], { cel: [2, 2], hl: [12, -12, 3, 1.3] });
    // 面罩掀起的縫與鉚釘
    line(ctx, [[10, -8.5], [26, -7.5]], '#6a7488', 1.6);
    dot(ctx, 9.5, -5.5, 1, '#6a7488');
    dot(ctx, 26.5, -5, 1, '#6a7488');
    A.shape(ctx, (c) => A.roundRect(c, 15, -17.5, 4, 5, 1), '#ffd24a', null, { lw: 1.4, hl: false });

    // 臉（頭盔下）
    let kind = eyeKind(m);
    if (kind === 'normal' && (dive || ph === 'strike' || ph === 'wind')) kind = 'angry';
    faceEyes(ctx, 12, 1, 9.5, 2.7, 3.5, m, kind);
    if (hurt || dive) smallMouth(ctx, 18, 8, true, 0.6);
    else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(15, 7.5);
      ctx.quadraticCurveTo(17, 9.5, 19.5, 7.5);
      ctx.stroke();
    }
    A.blush(ctx, 8.5, 5.5, 2.4);
    A.blush(ctx, 24.5, 5, 2.2);
    ctx.restore();

    if (dive) {
      // 俯衝的風切線
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const y = -12 + i * 12;
        const o = (t * 60 + i * 13) % 20;
        ctx.beginPath();
        ctx.moveTo(-34 - o, y);
        ctx.lineTo(-48 - o, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── 珊瑚魔像：珊瑚枝長成的小石魔像，胸口一顆魔像核心 ──
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
    }, '#ffd0dc', '#f4a0b8', { lw: 1.6, shadeY: y + r * 0.3, hl: false });
    dot(ctx, x, y, r * 0.3, '#fff4f6');
  }
  function coralBranch(ctx, x, y, ang, len, t, seed, col) {
    const sw = Math.sin(t * 2 + seed) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + sw);
    limb(ctx, (c) => { c.moveTo(0, 0); c.lineTo(0, -len); c.moveTo(0, -len * 0.5); c.lineTo(len * 0.35, -len * 0.8); c.moveTo(0, -len * 0.35); c.lineTo(-len * 0.3, -len * 0.62); }, 5.4, col);
    polyp(ctx, 0, -len - 1, 3.2, t, seed);
    polyp(ctx, len * 0.35 + 0.5, -len * 0.8 - 1, 2.4, t, seed + 1);
    polyp(ctx, -len * 0.3 - 0.5, -len * 0.62 - 1, 2.2, t, seed + 2);
    ctx.restore();
  }
  function blockcoral(ctx, m) {
    const t = m.t || 0;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const stepK = walk ? Math.sin(t * 9) : 0;
    const bob = walk ? Math.abs(stepK) * 2 : Math.sin(t * 2.4) * 0.6;
    const stone = ['#f08c8c', '#cc6474'];
    const dark = ['#d86e7e', '#b04e62'];
    let lean = 0;
    if (ph === 'wind') lean = -0.1;
    else if (ph === 'strike') lean = 0.14;
    if (hurt) lean += Math.sin(t * 45) * 0.05;

    // 腿
    [[-9, Math.max(0, stepK)], [9, Math.max(0, -stepK)]].forEach(([x, lift]) => {
      A.shape(ctx, (c) => A.roundRect(c, x - 6, -13 - lift * 3, 12, 13, 3.5), dark[0], dark[1], { cel: [2, 2], lw: 2.4, hl: false });
    });

    ctx.save();
    ctx.translate(0, -10 - bob);
    ctx.rotate(lean);
    // 遠側手臂
    const farSw = walk ? -stepK * 0.2 : Math.sin(t * 2) * 0.05;
    ctx.save();
    ctx.translate(-17, -26);
    ctx.rotate(0.25 + farSw + (ph === 'wind' ? -0.5 : 0));
    A.shape(ctx, (c) => A.roundRect(c, -5, -3, 10, 16, 4), dark[0], dark[1], { lw: 2.2, shadeY: 6, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, -7, 11, 14, 11, 4.5), dark[0], dark[1], { cel: [2, 2], lw: 2.4, hl: false });
    ctx.restore();

    // 肩上的珊瑚枝（長在石頭後面）
    coralBranch(ctx, -14, -38, -0.45, 12, t, 1, '#ff9ab4');
    coralBranch(ctx, 13, -40, 0.4, 10, t, 4, '#ff9ab4');

    // 軀幹（圓圓的珊瑚石塊）
    const torso = (c) => {
      c.moveTo(-19, -4);
      c.bezierCurveTo(-23, -20, -21, -38, -12, -42);
      c.quadraticCurveTo(0, -46, 12, -42);
      c.bezierCurveTo(22, -38, 23, -20, 19, -4);
      c.quadraticCurveTo(0, 2, -19, -4);
      c.closePath();
    };
    A.shape(ctx, torso, stone[0], stone[1], { cel: [4, 3.5], hl: [-12, -34, 3.6, 2] });
    // 珊瑚石的孔與裂紋
    [[-14, -12], [-15, -26], [13, -12], [14, -30], [-6, -36], [8, -6]].forEach(([x, y]) => {
      ctx.fillStyle = A.c('#c8586c');
      ctx.beginPath();
      ctx.ellipse(x, y, 1.6, 1.2, 0, 0, TAU);
      ctx.fill();
    });
    line(ctx, [[-19, -18], [-14, -17], [-12, -20]], '#b04e62', 1.4);
    line(ctx, [[17, -22], [13, -21]], '#b04e62', 1.4);

    // 胸口的魔像核心（青色寶石＋符文圈）
    const beat = 0.5 + 0.5 * Math.sin(t * 3.2);
    const cx = 1;
    const cyC = -20;
    glow(ctx, cx, cyC, 16 + beat * 4 + (ph === 'wind' ? 6 : 0), '#5af0e0', 0.55 + beat * 0.25);
    A.ellipse(ctx, cx, cyC, 9.5, 9, '#8a5a6a', '#6a4454', { lw: 2.2, hl: false, shadeAt: 0.1 });
    ctx.save();
    ctx.translate(cx, cyC);
    ctx.rotate(t * 0.8);
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i / 4) * TAU);
      runeGlyph(ctx, 0, -7.2, 1.3, i * 2 + 1, '#9af8ee', 0.9);
      ctx.restore();
    }
    ctx.restore();
    A.shape(ctx, (c) => poly(c, [[cx, cyC - 5.5], [cx + 4.5, cyC - 1.5], [cx + 3, cyC + 4.5], [cx - 3, cyC + 4.5], [cx - 4.5, cyC - 1.5]]), U.mix('#5ae8e0', '#e8ffff', beat * 0.35), '#2ab8b8', { cel: [1.4, 1.4], lw: 1.8, hl: false });
    dot(ctx, cx - 1.5, cyC - 2, 1.1, '#ffffff');

    // 頭（小石塊，嵌在肩膀中間）
    const head = (c) => A.roundRect(c, -11, -58, 22, 17, 6);
    A.shape(ctx, head, stone[0], stone[1], { cel: [3, 2.5], hl: [-6, -54, 2.8, 1.4] });
    // 頭頂的珊瑚冠
    coralBranch(ctx, -3, -57, -0.15, 8, t, 7, '#ff7aa0');
    coralBranch(ctx, 5, -57, 0.3, 6, t, 9, '#ff7aa0');
    let kind = eyeKind(m);
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    faceEyes(ctx, -3, -50, 9, 2.6, 3.4, m, kind);
    smallMouth(ctx, 2, -45.5, hurt || ph === 'strike', 0.6);
    A.blush(ctx, -7.5, -46, 2);
    A.blush(ctx, 10, -46.5, 1.8);

    // 近側手臂（大拳頭）：蓄力舉高、出招往前砸
    let armA = 0.15 + (walk ? stepK * 0.2 : Math.sin(t * 2 + 1) * 0.05);
    if (ph === 'wind') armA = -2.3;
    else if (ph === 'strike') armA = -0.9;
    ctx.save();
    ctx.translate(17, -30);
    ctx.rotate(armA);
    A.shape(ctx, (c) => A.roundRect(c, -5, -3, 11, 17, 4), stone[0], stone[1], { lw: 2.2, shadeY: 7, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, -8, 11, 16, 13, 5), stone[0], stone[1], { cel: [2.5, 2.5], lw: 2.6, hl: [-4, 14, 2, 1.2] });
    line(ctx, [[-3, 12], [-3, 16]], '#b04e62', 1.3);
    line(ctx, [[2, 12], [2, 16]], '#b04e62', 1.3);
    ctx.restore();
    ctx.restore();
  }

  // ── 封印海星：背上浮著一個旋轉的封印法陣，腳底是符印 ──
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
    const vio = ['#b070ff', '#e8d0ff'];

    // 落地時的紫光飛濺
    if (slam > 0.05) {
      ctx.save();
      ctx.globalAlpha *= slam;
      for (let i = 0; i < 7; i++) {
        const a = PI + (i / 6) * PI;
        const d = 28 + (1 - slam) * 20;
        sparkle(ctx, Math.cos(a) * d * 1.1, -4 + Math.sin(a) * d * 0.4, 3.2, '#e0c0ff');
      }
      ctx.restore();
    }

    // 背上浮著的封印法陣（不跟身體一起壓扁）；蓋下去時落到地面、墊在身體下面
    const sealCircle = () => {
      const spin = t * (ph === 'wind' || air ? 4 : 1.2);
      let hy = -46 - lift + Math.sin(t * 2.2) * 2;
      let pr = 20;
      let pa = 0.9;
      if (air) { hy = -52; pr = 22; }
      if (ph === 'wind') { hy = -50; pr = 21; pa = 1; }
      if (slam > 0) { hy = -46 + 43 * slam; pr = 20 + slam * 22; pa = 0.6 + slam * 0.4; }
      ctx.save();
      ctx.translate(0, hy);
      ctx.globalAlpha *= pa;
      glow(ctx, 0, 0, pr * 1.2, vio[0], 0.45);
      ctx.scale(1, 0.4);
      ctx.fillStyle = A.c('#6a3ab0');
      ctx.globalAlpha *= 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, TAU);
      ctx.fill();
      ctx.globalAlpha /= 0.35;
      magicCircle(ctx, pr, spin, vio[0], vio[1], { lw: 1.2, runes: 6 });
      ctx.restore();
      // 從法陣垂下來連到背上的光絲
      if (slam <= 0) {
        ctx.save();
        ctx.globalAlpha *= 0.5;
        ctx.strokeStyle = A.c('#d8b8ff');
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 3]);
        ctx.lineDashOffset = -t * 12;
        ctx.beginPath();
        ctx.moveTo(-6, hy + 5);
        ctx.lineTo(-4, -27 - lift);
        ctx.moveTo(6, hy + 5);
        ctx.lineTo(4, -27 - lift);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    };
    if (slam > 0) sealCircle();

    ctx.save();
    ctx.translate(0, -lift);
    ctx.scale(sx, sy);
    if (air) ctx.rotate(m.vy < 0 ? -0.1 : 0.12);
    const cy = -18;
    const R = 29;
    const Sy = 0.52;
    const armWig = (i) => (walk ? Math.sin(t * 9 + i * 1.3) * 2.5 : Math.sin(t * 2 + i * 1.3) * 1.2);
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
    // 腳底的符印層（深紫、發光的紋）
    const drop = air ? 3 : 0;
    if (air || slam > 0) glow(ctx, 0, cy + 10 + drop, 30, '#b070ff', 0.4 + slam * 0.4);
    A.shape(ctx, (c) => star(c, 9 + drop, 0.98), '#4a2a8a', '#351e6a', { lw: 2.4, shadeY: cy + 12 });
    ctx.save();
    ctx.beginPath();
    star(ctx, 9 + drop, 0.98);
    ctx.clip();
    ctx.strokeStyle = A.c(U.mix('#b88aff', '#ffffff', slam * 0.6));
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -PI / 2 + (i / 5) * TAU;
      ctx.moveTo(Math.cos(a) * 10, cy + 13 + drop + Math.sin(a) * 5);
      ctx.lineTo(Math.cos(a) * 40, cy + 13 + drop + Math.sin(a) * 20);
    }
    ctx.stroke();
    ctx.restore();
    // 身體的厚度
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
    // 臉
    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || air)) kind = 'angry';
    if (kind === 'normal' && slam > 0.4) kind = 'closed';
    faceEyes(ctx, 1, cy + 2, 10, 3.3, 4, m, kind);
    smallMouth(ctx, 6.5, cy + 8, hurt || air || slam > 0.3, 0.75);
    A.blush(ctx, -5, cy + 6.5, 2.5);
    A.blush(ctx, 17, cy + 6, 2.3);
    ctx.restore();

    if (!(slam > 0)) sealCircle();
  }

  // ── 蛇腹劍海鰻：身體是一節一節的劍刃，伸長時刀節分開、中間露出鎖鏈；尾巴是劍柄 ──
  function accordioneel(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const stretch = clamp01(num(fx.stretch, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const squeeze = ph === 'wind' && stretch <= 0 ? 1 : 0;
    const breathe = Math.sin(t * 2.2) * 2;
    const L = 44 * (1 - 0.4 * squeeze) + breathe * (1 - squeeze) + stretch * 220;
    const bx0 = -22;
    const bx1 = bx0 + L;
    const H = 20;
    const midY = -17;
    const waveA = (walk ? 3 : 1.6) * (1 - stretch) * (1 - squeeze * 0.5);
    const shake = squeeze ? Math.sin(t * 50) * 0.8 : 0;
    const wave = (x) => Math.sin(t * (walk ? 8 : 3) - (x - bx0) * 0.09) * waveA + shake;
    const skin = ['#7ac8a0', '#529e7c'];
    const steel = ['#e2e8f2', '#9eaabe'];
    const rune = '#5af0d0';

    // 尾巴＝劍柄：柄頭寶石、纏皮握柄、金色護手
    const ty = wave(bx0);
    ctx.save();
    ctx.translate(bx0, midY + ty);
    ctx.rotate(Math.sin(t * 3) * 0.05);
    A.shape(ctx, (c) => A.roundRect(c, -17, -3.6, 15, 7.2, 3), '#7a4a2a', '#5a3218', { lw: 2.2, shadeY: 1, hl: false });
    ctx.strokeStyle = A.c('#a8703e');
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(-15 + i * 3.5, -3.4);
      ctx.lineTo(-13 + i * 3.5, 3.4);
    }
    ctx.stroke();
    A.ellipse(ctx, -20, 0, 4.6, 4.6, '#ffd24a', '#e0a830', { lw: 2, hl: false });
    A.ellipse(ctx, -20, 0, 2.2, 2.2, '#e84a6a', null, { lw: 1.2, hl: [-20.8, -0.9, 0.8, 0.6] });
    A.shape(ctx, (c) => { c.moveTo(-3, -12); c.quadraticCurveTo(-6, -6, -4, 0); c.quadraticCurveTo(-6, 6, -3, 12); c.lineTo(1.5, 10); c.quadraticCurveTo(0, 0, 1.5, -10); c.closePath(); }, '#ffd24a', '#e0a830', { cel: [1.2, 1.2], lw: 2, hl: false });
    ctx.restore();

    // 鎖鏈（沿著中線，刀節分開時才看得到）
    const n = 6;
    const gap = L / n;
    const pl = 12;
    if (gap > pl * 0.7) {
      ctx.save();
      ctx.lineWidth = 1.8;
      for (let x = bx0 + 2; x < bx1; x += 5) {
        const y = midY + wave(x);
        const odd = Math.round((x - bx0) / 5) % 2;
        ctx.beginPath();
        if (odd) ctx.ellipse(x, y, 3.2, 1.3, 0, 0, TAU);
        else ctx.ellipse(x, y, 3.2, 2.4, 0, 0, TAU);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.strokeStyle = A.c(odd ? '#8a96aa' : '#b8c2d2');
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 刀節（箭頭狀的劍刃片，從尾到頭往前疊）
    for (let i = 0; i < n; i++) {
      const x = bx0 + gap * (i + 0.62);
      const y = midY + wave(x);
      const tilt = (wave(x + 3) - wave(x - 3)) / 6;
      const hk = 0.86 + (i / (n - 1)) * 0.14;
      const h = H * hk;
      const len = gap > pl ? pl + 2 : Math.max(pl, gap + 5);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan(tilt));
      const plate = (c) => poly(c, [[-len * 0.55, -h * 0.5], [len * 0.18, -h * 0.5], [len * 0.55, 0], [len * 0.18, h * 0.5], [-len * 0.55, h * 0.5], [-len * 0.2, 0]]);
      A.shape(ctx, plate, steel[0], steel[1], { cel: [1.6, 2.2], lw: 2.2, hl: false });
      // 刃的亮邊
      line(ctx, [[-len * 0.45, -h * 0.5 + 1.8], [len * 0.15, -h * 0.5 + 1.8], [len * 0.42, -1]], '#ffffff', 1.1);
      // 發光的符文血槽
      const rg = stretch > 0.2 || squeeze ? 0.9 : 0.35 + 0.25 * Math.sin(t * 3 + i);
      ctx.save();
      ctx.globalAlpha *= rg;
      glow(ctx, 0, 0, 7, rune, 0.8);
      ctx.restore();
      line(ctx, [[-len * 0.3, 0], [len * 0.25, 0]], U.mix('#2a9a88', rune, rg), 2);
      ctx.restore();
    }

    // 頭
    const hy = wave(bx1);
    const hx = bx1 + 2;
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
    }, '#c8ecd4', '#a0d0b4', { lw: 2.2, shadeY: 4, hl: false });
    ctx.restore();
    if (open > 0.2) {
      A.shape(ctx, (c) => { c.moveTo(4, 2); c.quadraticCurveTo(16, 1, 24, 0.5); c.quadraticCurveTo(18, 3 + open * 8, 5, 6 + open * 3); c.closePath(); }, '#8a2a34', null, { noStroke: true, hl: false });
    }
    // 頭頂的劍刃鰭
    A.shape(ctx, (c) => { c.moveTo(-4, -10); c.lineTo(-10, -19); c.lineTo(8, -14); c.closePath(); }, steel[0], steel[1], { lw: 1.8, shadeY: -13, hl: false });
    // 上顎＋頭
    A.shape(ctx, (c) => {
      c.moveTo(-5, -11);
      c.bezierCurveTo(6, -17, 20, -14, 26, -5);
      c.quadraticCurveTo(28, 0, 24, 1.5);
      c.quadraticCurveTo(12, 3, -5, 6);
      c.closePath();
    }, skin[0], skin[1], { cel: [2.5, 2.5], hl: [5, -11, 3.5, 1.6] });
    ctx.fillStyle = A.c('#ffffff');
    [8, 13, 18].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x - 1.4, 2 - x * 0.04);
      ctx.lineTo(x, 4.5 - x * 0.04);
      ctx.lineTo(x + 1.4, 2 - x * 0.04);
      ctx.fill();
    });
    [[1, -6, 1.4], [5, -1.5, 1.1], [-1, 1, 1]].forEach(([x, y, r]) => dot(ctx, x, y, r, '#3e8a68'));
    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || ph === 'strike')) kind = 'angry';
    faceEyes(ctx, 11, -7, 7.5, 2.8, 3.7, m, kind);
    A.blush(ctx, 17, -1.5, 2);
    ctx.restore();

    // 拉長時的劍光，擠壓蓄力時的刃光閃爍
    if (stretch > 0.2) {
      ctx.save();
      ctx.globalAlpha *= stretch;
      ctx.strokeStyle = A.c('#dffff6');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const x = bx0 + L * (0.25 + i * 0.25);
        const y = midY - H / 2 - 6 - (i % 2) * 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 24, y);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (squeeze || stretch > 0.05) {
      const q = (t * 2.2) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      sparkle(ctx, bx0 + L * (0.2 + q * 0.6), midY - H * 0.5 + 1 + wave(bx0 + L * 0.5), 4 + (1 - q) * 3, '#ffffff');
      ctx.restore();
    }
  }

  // ── 豎琴海龜：龜殼上架著吟遊詩人的豎琴，演奏時琴弦發光 ──
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
    const shell = ['#4aa878', '#35885e'];
    const gold = ['#ffd24a', '#e0a830'];
    const wood = ['#b8743a', '#94562a'];

    // 遠側鰭
    A.ellipse(ctx, -22, -5, 9, 3.6, skin[1], null, { rot: 0.3 - paddle * 0.25, lw: 2.2, hl: false });
    A.ellipse(ctx, 20, -5, 13, 4.2, skin[1], null, { rot: -0.35 + paddle * 0.3, lw: 2.2, hl: false });

    ctx.save();
    ctx.translate(0, -bob);

    // 頭與脖子
    const sway = playing ? Math.sin(t * 3) * 2.5 : 0;
    const retract = hurt ? -4 : 0;
    const hx = 29 + retract + (ph === 'strike' ? 3 : 0);
    const hy = -21 + sway * 0.4 - (playing ? 1 : 0);
    A.shape(ctx, (c) => {
      c.moveTo(12, -22);
      c.quadraticCurveTo(20, -24, hx - 4, hy - 4);
      c.lineTo(hx - 2, hy + 6);
      c.quadraticCurveTo(20, -10, 12, -11);
      c.closePath();
    }, skin[0], skin[1], { lw: 2.4, shadeY: -14, hl: false });

    // 豎琴（架在龜殼上，在殼的後面先畫琴柱）
    const hs = playing ? 1 : ph === 'wind' ? 0.5 : 0;
    ctx.save();
    ctx.translate(-6, -33);
    ctx.rotate(-0.08 + (playing ? Math.sin(t * 3) * 0.03 : 0));
    const B = [-10, 0];
    const C = [-12, -30];
    const D = [12, -18];
    const Q = [-1, -38];
    const neckAt = (s) => [
      (1 - s) * (1 - s) * C[0] + 2 * (1 - s) * s * Q[0] + s * s * D[0],
      (1 - s) * (1 - s) * C[1] + 2 * (1 - s) * s * Q[1] + s * s * D[1],
    ];
    if (hs > 0) glow(ctx, 0, -16, 26, '#8af0ff', 0.45 * hs);
    // 共鳴箱（斜的那根，木頭）
    limb(ctx, (c) => { c.moveTo(B[0] + 1, B[1]); c.lineTo(D[0], D[1]); }, 7.5, wood[0]);
    // 琴弦
    const ns = 6;
    for (let i = 1; i <= ns; i++) {
      const s = i / (ns + 1);
      const p = neckAt(s * 0.92 + 0.04);
      const k = (p[0] - B[0]) / (D[0] - B[0]);
      const by2 = B[1] + (D[1] - B[1]) * k - 2;
      const vib = hs > 0 ? Math.sin(t * 40 + i * 1.7) * 1.2 * hs : 0;
      const col = hs > 0 ? ['#6ae0ff', '#ff8ab8', '#ffe066'][i % 3] : '#fff4d0';
      if (hs > 0) {
        ctx.save();
        ctx.globalAlpha *= 0.5 * hs;
        ctx.strokeStyle = A.c(col);
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1] + 1);
        ctx.quadraticCurveTo(p[0] + vib, (p[1] + by2) / 2, p[0], by2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = A.c(hs > 0 ? '#ffffff' : col);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] + 1);
      ctx.quadraticCurveTo(p[0] + vib, (p[1] + by2) / 2, p[0], by2);
      ctx.stroke();
    }
    // 琴頸（上面彎的那根，金色）
    limb(ctx, (c) => { c.moveTo(C[0], C[1]); c.quadraticCurveTo(Q[0], Q[1], D[0], D[1]); }, 6.2, gold[0]);
    // 琴柱（前面直的那根，金色，頂上有渦卷）
    limb(ctx, (c) => { c.moveTo(B[0], B[1]); c.lineTo(C[0], C[1]); }, 6.2, gold[0]);
    A.ellipse(ctx, C[0] - 1, C[1] - 2, 3.4, 3.4, gold[0], gold[1], { lw: 1.8, hl: false });
    dot(ctx, C[0] - 1, C[1] - 2, 1.2, gold[1]);
    // 弦釘
    for (let i = 1; i <= ns; i++) {
      const p = neckAt((i / (ns + 1)) * 0.92 + 0.04);
      dot(ctx, p[0], p[1] - 0.5, 0.9, '#8a5a1a');
    }
    A.ellipse(ctx, D[0] + 1, D[1] - 1, 2.6, 2.6, gold[0], gold[1], { lw: 1.6, hl: false });
    ctx.restore();

    // 腹甲
    A.ellipse(ctx, -4, -11, 27, 5.5, '#f4e2a8', '#dcc080', { lw: 2.4, hl: false });
    // 龜殼
    const dome = (c) => {
      c.moveTo(-31, -12);
      c.bezierCurveTo(-30, -40, 20, -42, 22, -12);
      c.quadraticCurveTo(-4, -8, -31, -12);
      c.closePath();
    };
    A.shape(ctx, dome, shell[0], shell[1], { cel: [4, 3], hl: [-16, -30, 4.5, 2] });
    const hex = (x, y, r) => (c) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8);
      }
      c.closePath();
    };
    [[-19, -21, 6], [-5, -26, 6.5], [9, -21, 6]].forEach(([x, y, r]) => A.shape(ctx, hex(x, y, r), '#7ac890', '#5eae78', { lw: 1.6, shadeY: y + 2, hl: false }));
    // 殼邊的金色琴座
    A.shape(ctx, (c) => A.roundRect(c, -19, -37, 14, 5, 2), gold[0], gold[1], { lw: 1.8, shadeY: -34, hl: false });

    // 頭
    A.ellipse(ctx, hx, hy, 10, 8.5, skin[0], skin[1], { cel: [2, 2], hl: [hx - 4, hy - 4.5, 2.6, 1.5] });
    let kind = eyeKind(m);
    if (kind === 'normal' && playing && Math.sin(t * 1.3) > -0.3) kind = 'closed';
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    faceEyes(ctx, hx - 1, hy - 2.5, 6.5, 2.4, 3.2, m, kind);
    if (hurt || ph === 'strike') smallMouth(ctx, hx + 5, hy + 4, true, 0.6);
    else if (playing) {
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

    // 近側鰭（演奏時撥弦）
    const strum = playing ? Math.sin(t * 9) * 0.25 : 0;
    A.ellipse(ctx, -24, -6, 10, 4, skin[0], skin[1], { rot: 0.4 + paddle * 0.3, lw: 2.2, hl: false, cel: [1.5, 1.5] });
    A.ellipse(ctx, 14, -6, 14, 4.6, skin[0], skin[1], { rot: -0.45 - paddle * 0.35 - strum, lw: 2.2, hl: false, cel: [1.5, 1.5] });

    // 演奏時飄出的音符
    if (playing) {
      const cols = [['#6ad0e8', '#3aa8c8'], ['#ff8ab8', '#e0608e'], ['#ffd24a', '#e0a830']];
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.6 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha *= q < 0.15 ? q / 0.15 : 1 - (q - 0.15) / 0.85;
        noteGlyph(ctx, -2 + i * 8 + Math.sin(t * 3 + i) * 5 + q * 10, -66 - q * 22, 0.7, cols[i][0], cols[i][1]);
        ctx.restore();
      }
    }
  }

  // ═════════════ 投射物 ═════════════
  // 符文飛彈（卷軸寄居蟹）：會拐彎，尾巴沿著速度方向拖出光點
  function letter(ctx, p, t) {
    const s = p.seed || 0;
    const vx = p.vx || (p.dir || 1);
    const vy = p.vy || 0;
    const a = Math.atan2(vy, vx);
    ctx.save();
    ctx.rotate(a);
    for (let i = 5; i >= 0; i--) {
      const k = i / 6;
      ctx.save();
      ctx.globalAlpha *= (1 - k) * 0.7;
      dot(ctx, -7 - i * 4.5, Math.sin(t * 18 + s + i * 1.2) * 1.8 * k, 4.2 * (1 - k * 0.7), i % 2 ? '#8fe0ff' : '#dffaff');
      ctx.restore();
    }
    ctx.restore();
    glow(ctx, 0, 0, 20, '#5ac8ff', 0.75);
    // 外圈：轉動的虛線符文環
    ctx.save();
    ctx.rotate(t * 4 + s);
    ctx.strokeStyle = A.c('#bff0ff');
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 2.5]);
    ctx.beginPath();
    ctx.arc(0, 0, 10.5, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) {
      const b = (i / 3) * TAU;
      dot(ctx, Math.cos(b) * 10.5, Math.sin(b) * 10.5, 1.6, '#ffffff');
    }
    ctx.restore();
    // 核心：藍色符石＋白色符文
    A.ellipse(ctx, 0, 0, 7.5, 7.5, '#3a8ae8', '#2a64c0', { lw: 2, cel: [1.5, 1.5], hl: [-2.5, -3, 1.8, 1.1] });
    ctx.save();
    ctx.rotate(Math.sin(t * 5 + s) * 0.3);
    runeGlyph(ctx, 0, 0, 4, Math.floor(Math.abs(s) * 3), '#e8fbff', 1.8);
    ctx.restore();
  }
  // 爆裂符文尖刺（海膽炸出來的）
  function spike(ctx, p, t) {
    const a = Math.atan2(p.vy || 0, p.vx || (p.dir || 1));
    ctx.rotate(a);
    ctx.save();
    ctx.globalAlpha *= 0.7;
    ctx.strokeStyle = A.c('#ff7a4a');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-24, 0);
    ctx.stroke();
    ctx.restore();
    glow(ctx, -2, 0, 11, '#ff5a3a', 0.6);
    A.shape(ctx, (c) => poly(c, [[-12, -3], [3, -2.2], [13, 0], [3, 2.2], [-12, 3]]), '#5a3a58', '#3e2a44', { lw: 2, shadeY: 0.5, hl: false });
    ctx.strokeStyle = A.c('#ffd2a0');
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, -1.4);
    ctx.lineTo(-5, 1.3);
    ctx.lineTo(-3, -1.3);
    ctx.lineTo(-1, 1.2);
    ctx.stroke();
    dot(ctx, 11, 0, 1.2, '#ffb080');
  }
  // 豎琴音符：碰到會變慢
  function note(ctx, p, t) {
    const s = p.seed || 0;
    const cols = [['#6ad0e8', '#3aa8c8'], ['#ff8ab8', '#e0608e'], ['#ffd24a', '#e0a830']];
    const col = cols[Math.floor(Math.abs(s) * 1.7) % 3];
    ctx.translate(0, Math.sin(t * 8 + s) * 3.5);
    ctx.rotate(Math.sin(t * 5 + s) * 0.15);
    glow(ctx, 0, 0, 18, col[0], 0.5);
    noteGlyph(ctx, -1, 3, 1, col[0], col[1]);
    const q = (t * 2 + s) % 1;
    ctx.save();
    ctx.globalAlpha *= 1 - q;
    sparkle(ctx, -10 - q * 6, -6 + q * 4, 2.4, '#ffffff');
    ctx.restore();
  }

  // ═════════════ 地面區域 ═════════════
  // 封印法陣（封印海星蓋下來留下的，紫色、會轉、會往上冒光）
  function ink(ctx, z, t) {
    const zt = z.t || 0;
    const life = z.life || 1;
    const fade = Math.max(0, Math.min(1, life - zt, zt * 5));
    if (fade <= 0) return;
    const r = z.r || 60;
    const grow = 0.7 + 0.3 * Math.min(1, zt * 5);
    const pulse = 0.5 + 0.5 * Math.sin(zt * 6);
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= fade;
    // 剛蓋下的一瞬間：光柱
    if (zt < 0.35) {
      const k = 1 - zt / 0.35;
      ctx.save();
      ctx.globalAlpha *= k * 0.7;
      const g = ctx.createLinearGradient(0, -70, 0, 0);
      const rgb = U.hexToRgb(A.c('#d8b0ff')).join(',');
      g.addColorStop(0, 'rgba(' + rgb + ',0)');
      g.addColorStop(1, 'rgba(' + rgb + ',0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(-r * 0.7, -70, r * 1.4, 70);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(0, -3);
    ctx.scale(1, 0.3);
    glow(ctx, 0, 0, r * 1.25, '#9a5aff', 0.35 + pulse * 0.15);
    ctx.fillStyle = A.c('#3a1a6a');
    ctx.save();
    ctx.globalAlpha *= 0.45;
    ctx.beginPath();
    ctx.arc(0, 0, r * grow, 0, TAU);
    ctx.fill();
    ctx.restore();
    magicCircle(ctx, r * grow, t * 0.9 + (z.seed || 0), U.mix('#b070ff', '#e8d0ff', pulse * 0.4), '#f0e0ff', { lw: 1.6, runes: 10, star: 5 });
    // 外面一圈擴散的波紋
    const q = (zt * 1.4) % 1;
    ctx.save();
    ctx.globalAlpha *= (1 - q) * 0.8;
    ctx.strokeStyle = A.c('#d8b0ff');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * grow * (0.4 + q * 0.7), 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    // 往上飄的封印光點
    for (let i = 0; i < 6; i++) {
      const qq = (t * 0.7 + i / 6) % 1;
      const x = Math.sin(i * 2.7 + 1) * r * 0.75;
      ctx.save();
      ctx.globalAlpha *= (1 - qq) * 0.9;
      if (i % 2) sparkle(ctx, x, -4 - qq * 26, 2.6, '#e8d0ff');
      else dot(ctx, x, -4 - qq * 22, 1.6, '#c090ff');
      ctx.restore();
    }
    ctx.restore();
  }

  // ═════════════ 素材圖示（中心在 0,0，約 -18～18） ═════════════
  const ICON3 = {
    // 符文殘頁：撕下來的一角羊皮紙，上面有發光的藍色符文
    stamp(ctx) {
      ctx.save();
      ctx.rotate(-0.12);
      const page = (c) => poly(c, [[-12, -14], [10, -15], [13, -6], [11, 0], [14, 6], [9, 14], [2, 12], [-4, 15], [-13, 13], [-11, 2], [-14, -5]]);
      A.shape(ctx, page, '#f8e8bc', '#dcc08a', { cel: [2.5, 2.5], lw: 2.2, hl: [-7, -10, 3, 1.4] });
      // 燒焦的邊
      ctx.save();
      ctx.beginPath();
      page(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#b8864a');
      ctx.beginPath();
      ctx.moveTo(14, 6);
      ctx.lineTo(9, 14);
      ctx.lineTo(2, 12);
      ctx.lineTo(6, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = A.c('#b89060');
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      [[-9, -10, 14], [-9, 8, 9], [-10, 11.5, 6]].forEach(([x, y, w]) => { ctx.moveTo(x, y); ctx.lineTo(x + w, y); });
      ctx.stroke();
      glowRune(ctx, 0, -0.5, 5.5, 3, '#4ab8ff', '#e8fbff');
      ctx.restore();
    },
    // 鬼火芯：一團幽藍小火，芯是白的
    filament(ctx) {
      glow(ctx, 0, 0, 18, '#6ad4ff', 0.8);
      const fl = (c, k) => {
        c.moveTo(0, 12 * k);
        c.bezierCurveTo(-11 * k, 12 * k, -11 * k, -1 * k, -4 * k, -6 * k);
        c.quadraticCurveTo(-4 * k, -11 * k, -6 * k, -15 * k);
        c.quadraticCurveTo(1 * k, -12 * k, 1 * k, -17 * k);
        c.quadraticCurveTo(6 * k, -11 * k, 5 * k, -7 * k);
        c.bezierCurveTo(11 * k, -2 * k, 11 * k, 12 * k, 0, 12 * k);
        c.closePath();
      };
      A.shape(ctx, (c) => fl(c, 1), '#58c8ff', '#3a9ae8', { cel: [2, 2], lw: 2.2, hl: false });
      ctx.save();
      ctx.translate(0, 3);
      A.shape(ctx, (c) => fl(c, 0.55), '#e8ffff', null, { noStroke: true, hl: false });
      ctx.restore();
      sparkle(ctx, 11, -12, 3, '#dffaff');
      dot(ctx, -12, 8, 1.4, '#bff0ff');
    },
    // 巫師帽羽：一根紫藍色的長羽毛，羽根綁著金色星星
    rib(ctx) {
      ctx.save();
      ctx.rotate(-0.7);
      const fea = (c) => {
        c.moveTo(0, 17);
        c.quadraticCurveTo(-8, 4, -5, -10);
        c.quadraticCurveTo(-2, -17, 2, -19);
        c.quadraticCurveTo(7, -8, 4, 4);
        c.lineTo(6, 6);
        c.quadraticCurveTo(3, 11, 0, 17);
        c.closePath();
      };
      A.shape(ctx, fea, '#8a6ae0', '#6a4cc0', { cel: [2.2, 1.5], lw: 2.2, hl: [-3, -8, 1.4, 3] });
      ctx.strokeStyle = A.c('#b89aff');
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const y = -12 + i * 5;
        ctx.moveTo(0.5, y + 2);
        ctx.lineTo(-4, y - 1);
        ctx.moveTo(0.8, y + 2);
        ctx.lineTo(4, y);
      }
      ctx.stroke();
      line(ctx, [[0, 17], [1, -16]], '#f4eeff', 1.4);
      A.shape(ctx, (c) => starPath(c, 0, 13, 5, 2.2, 5, -PI / 2), '#ffd24a', '#e0a830', { lw: 1.6, shadeY: 14, hl: false });
      ctx.restore();
      sparkle(ctx, 12, -12, 3, '#fff4c0');
    },
    // 爆裂符石：裂開的石頭，紅色符文在發光
    spring(ctx) {
      glow(ctx, 0, 1, 18, '#ff5a3a', 0.5);
      A.shape(ctx, (c) => poly(c, [[-13, -4], [-8, -12], [3, -14], [12, -8], [14, 3], [8, 12], [-4, 13], [-13, 6]]), '#6a5a78', '#4a3e5a', { cel: [3, 3], lw: 2.4, hl: [-6, -8, 2.6, 1.4] });
      line(ctx, [[8, -10], [5, -4], [9, 0]], '#3a2e48', 1.4);
      line(ctx, [[-11, 5], [-6, 3]], '#3a2e48', 1.4);
      glowRune(ctx, 0, 0, 5.5, 2, '#ff4a2a', '#ffe0c0');
      sparkle(ctx, 12, -13, 3, '#ffd2a0');
      sparkle(ctx, -13, -12, 2, '#ffd2a0');
    },
    // 斷槍尖：鋼槍尖＋藍白紋，後面是斷掉的木柄
    kitestring(ctx) {
      ctx.save();
      ctx.rotate(-0.75);
      // 斷掉的木柄（碎裂的尖角）
      A.shape(ctx, (c) => poly(c, [[-4, 4], [-4, 14], [-2, 12], [-0.5, 16], [1.5, 12], [4, 15], [4, 4]]), '#c89458', '#a87438', { lw: 2, shadeY: 10, hl: false });
      // 槍身（藍白螺旋紋）
      const cone = (c) => { c.moveTo(-6, 5); c.lineTo(-1.2, -12); c.lineTo(1.2, -12); c.lineTo(6, 5); c.closePath(); };
      A.shape(ctx, cone, '#f6f2e8', '#d8cfb8', { lw: 2, shadeY: 0, hl: false });
      ctx.save();
      ctx.beginPath();
      cone(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#3a6ad0');
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-8, 1 - i * 6);
        ctx.lineTo(8, -3 - i * 6);
        ctx.lineTo(8, -0.5 - i * 6);
        ctx.lineTo(-8, 3.5 - i * 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.beginPath();
      cone(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-2, -10); c.lineTo(0, -19); c.lineTo(2, -10); c.closePath(); }, '#e4e9f2', '#aab4c6', { lw: 1.8, shadeY: -14, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, -7.5, 3, 15, 3.5, 1.5), '#ffd24a', '#e0a830', { lw: 1.6, shadeY: 5, hl: false });
      ctx.restore();
      sparkle(ctx, -11, -12, 3, '#ffffff');
    },
    // 魔像核心：石框裡一顆發光的青色寶石，外圈刻著符文
    block(ctx) {
      glow(ctx, 0, 0, 18, '#5af0e0', 0.6);
      A.ellipse(ctx, 0, 0, 14, 14, '#f08c8c', '#cc6474', { cel: [3, 3], hl: [-7, -8, 2.6, 1.6] });
      A.ellipse(ctx, 0, 0, 9.5, 9.5, '#8a5a6a', '#6a4454', { lw: 2, hl: false, shadeAt: 0.1 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU - PI / 4;
        runeGlyph(ctx, Math.cos(a) * 11.6, Math.sin(a) * 11.6, 1.4, i * 2 + 1, '#b04e62', 1);
      }
      A.shape(ctx, (c) => poly(c, [[0, -7], [6, -2], [4, 6], [-4, 6], [-6, -2]]), '#5ae8e0', '#2ab8b8', { cel: [1.6, 1.6], lw: 2, hl: false });
      dot(ctx, -2, -2.5, 1.4, '#ffffff');
      polyp(ctx, 11, -11, 3, 0, 1);
    },
    // 封印墨：圓墨水瓶，紫墨發光，瓶身貼著法陣標籤
    ink(ctx) {
      glow(ctx, 0, 2, 17, '#a060ff', 0.5);
      const bottle = (c) => {
        c.moveTo(-4, -9);
        c.lineTo(-4, -5);
        c.bezierCurveTo(-14, -3, -14, 14, 0, 14);
        c.bezierCurveTo(14, 14, 14, -3, 4, -5);
        c.lineTo(4, -9);
        c.closePath();
      };
      A.shape(ctx, bottle, '#5a2a9a', '#3e1a74', { cel: [2.5, 2.5], lw: 2.2, hl: [-6, 1, 1.6, 3] });
      // 標籤上的小法陣
      A.ellipse(ctx, 1, 5, 5.8, 5.8, '#f4e8ff', '#d8c4f0', { lw: 1.6, hl: false });
      ctx.save();
      ctx.translate(1, 5);
      ctx.strokeStyle = A.c('#8a4ae0');
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = -PI / 2 + ((i * 2) % 5) / 5 * TAU;
        i ? ctx.lineTo(Math.cos(a) * 4, Math.sin(a) * 4) : ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      }
      ctx.stroke();
      ctx.restore();
      // 軟木塞
      A.shape(ctx, (c) => A.roundRect(c, -5, -15, 10, 7, 2), '#c89458', '#a87438', { lw: 2, shadeY: -11, hl: false });
      sparkle(ctx, 11, -11, 3, '#e8d0ff');
    },
    // 劍鱗：一片箭頭狀的劍刃刀節，中間是青色符文槽，後面連著一小段鎖鏈
    bellowskin(ctx) {
      ctx.save();
      ctx.rotate(-0.5);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(-14, 0, 3.2, 2, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-18.5, 0, 3.2, 1.2, 0, 0, TAU);
      ctx.stroke();
      const pl = (c) => poly(c, [[-11, -9], [4, -9], [14, 0], [4, 9], [-11, 9], [-5, 0]]);
      A.shape(ctx, pl, '#e2e8f2', '#9eaabe', { cel: [2, 2.5], lw: 2.4, hl: false });
      line(ctx, [[-9, -7], [3.5, -7], [11, -1]], '#ffffff', 1.2);
      glow(ctx, 1, 0, 8, '#5af0d0', 0.8);
      line(ctx, [[-4, 0], [8, 0]], '#5af0d0', 2.2);
      ctx.restore();
      sparkle(ctx, 11, -12, 3, '#ffffff');
    },
    // 豎琴弦：一捲發光的金色琴弦，繞在弦釘上
    comb(ctx) {
      glow(ctx, 0, 0, 17, '#8af0ff', 0.45);
      ctx.save();
      ctx.lineCap = 'round';
      [[4.4, A.outline()], [2.2, A.c('#ffe07a')]].forEach(([w, col]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(-2 + i * 1.5, 1 + i * 0.5, 11 - i * 1.5, 7.5 - i * 1, -0.35, 0, TAU);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(7, -3);
        ctx.quadraticCurveTo(12, -8, 14, -15);
        ctx.stroke();
      });
      ctx.restore();
      // 弦釘
      A.shape(ctx, (c) => A.roundRect(c, -3, -3, 5, 10, 1.5), '#b8743a', '#94562a', { lw: 1.8, shadeY: 3, hl: false });
      A.ellipse(ctx, -0.5, -4, 4, 2.6, '#ffd24a', '#e0a830', { lw: 1.6, hl: false });
      noteGlyph(ctx, -12, -8, 0.5, '#6ad0e8', '#3aa8c8');
      sparkle(ctx, 14, -15, 2.6, '#ffffff');
    },
  };

  Object.assign(A.MONSTER_DRAW, { postcrab, bulbjelly, umbrellagull, alarmurchin, kiteray, blockcoral, stampstar, accordioneel, musicturtle });
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  Object.assign(A.PROJ_DRAW, { letter, spike, note });
  Object.assign(A.ZONE_DRAW, { ink });
  if (A.ICON) Object.assign(A.ICON, ICON3);
})();
