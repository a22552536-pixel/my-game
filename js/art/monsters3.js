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

  // ───────────── v1.4 精緻化：厚塗形狀、質感、有神的眼睛 ─────────────
  // 厚塗：整片陰影色 → 往左上偏移的亮面（右下留月牙陰影）→ 質感（在形狀裡面畫）→ 左上緣的邊光 → 描邊
  // o.cel：[dx,dy] 或數字；o.rim：邊光寬度；o.tex(ctx)：在形狀裡面畫的紋理；o.sheen：[x,y,r,a] 柔光；o.hl 同 A.shape
  function rs(ctx, path, fill, shade, rim, o) {
    o = o || {};
    const cel = o.cel == null ? [3, 3] : typeof o.cel === 'number' ? [o.cel, o.cel] : o.cel;
    const r = o.rim == null ? 1.6 : o.rim;
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(shade || fill);
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (shade) {
      ctx.translate(-cel[0], -cel[1]);
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(fill);
      ctx.fill();
      ctx.translate(cel[0], cel[1]);
    }
    if (o.sheen) glow(ctx, o.sheen[0], o.sheen[1], o.sheen[2], o.sheenCol || '#ffffff', o.sheen[3]);
    if (o.tex) {
      ctx.save();
      o.tex(ctx);
      ctx.restore();
    }
    if (rim && r > 0) {
      ctx.beginPath();
      ctx.rect(-900, -900, 1800, 1800);
      ctx.translate(r, r * (o.rimY == null ? 1 : o.rimY));
      path(ctx);
      ctx.translate(-r, -r * (o.rimY == null ? 1 : o.rimY));
      ctx.clip('evenodd');
      ctx.fillStyle = A.c(rim);
      ctx.fillRect(-900, -900, 1800, 1800);
    }
    ctx.restore();
    if (o.hl) {
      ctx.save();
      ctx.globalAlpha *= o.hlA || 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(o.hl[0], o.hl[1], o.hl[2], o.hl[3], o.hlRot == null ? -0.5 : o.hlRot, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    if (o.noStroke) return;
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = o.lw || 2.6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  function rse(ctx, x, y, rx, ry, fill, shade, rim, o) {
    o = Object.assign({}, o || {});
    const rot = o.rot || 0;
    if (o.hl === undefined) o.hl = [x - rx * 0.35, y - ry * 0.45, rx * 0.26, ry * 0.15];
    if (o.cel == null) o.cel = [rx * 0.16, ry * 0.2];
    rs(ctx, (c) => c.ellipse(x, y, rx, ry, rot, 0, TAU), fill, shade, rim, o);
  }
  // 顏色走 A.c() 的線性漸層
  function lg(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([k, col, a]) => {
      if (a == null) g.addColorStop(k, A.c(col));
      else g.addColorStop(k, 'rgba(' + U.hexToRgb(A.c(col)).join(',') + ',' + a + ')');
    });
    return g;
  }
  // 固定亂數（同一隻怪每一幀的斑點位置都一樣）
  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  // 一把小斑點（質感）
  function speckle(ctx, x, y, w, h, n, r, col, seed, a) {
    ctx.save();
    ctx.globalAlpha *= a == null ? 1 : a;
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + (hash(seed + i * 3.1) - 0.5) * w;
      const py = y + (hash(seed + i * 7.7) - 0.5) * h;
      const rr = r * (0.55 + hash(seed + i * 1.3) * 0.7);
      ctx.moveTo(px + rr, py);
      ctx.arc(px, py, rr, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }
  // 有神的大眼：深色眼眶 → 有漸層的彩色虹膜 → 瞳孔 → 兩個亮點；生氣時上眼瞼壓下來
  function eye2(ctx, x, y, rx, ry, kind, iris, lid, look) {
    look = look || 0;
    if (kind !== 'normal' && kind !== 'angry' && kind !== 'glare') {
      A.eye(ctx, x, y, rx, ry, kind, look);
      return;
    }
    const ir = iris || '#3a2a20';
    ctx.save();
    ctx.fillStyle = A.c('#22140e');
    ctx.beginPath();
    ctx.ellipse(x + look * 0.4, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.clip();
    const g = ctx.createRadialGradient(x + look, y + ry * 0.45, ry * 0.1, x + look, y + ry * 0.2, ry * 0.95);
    g.addColorStop(0, A.c(U.mix(ir, '#ffffff', 0.45)));
    g.addColorStop(0.55, A.c(ir));
    g.addColorStop(1, A.c(U.mix(ir, '#10080a', 0.55)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + look, y + ry * 0.12, rx * 0.8, ry * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#140a08');
    ctx.beginPath();
    ctx.ellipse(x + look, y + ry * 0.16, rx * 0.4, ry * 0.44, 0, 0, TAU);
    ctx.fill();
    if (kind === 'angry' || kind === 'glare') {
      // 壓下來的上眼瞼
      ctx.fillStyle = A.c(lid || '#22140e');
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.4, y - ry * 1.4);
      ctx.lineTo(x + rx * 1.4, y - ry * 1.4);
      ctx.lineTo(x + rx * 1.4, y - ry * 0.05);
      ctx.lineTo(x - rx * 1.4, y - ry * 0.75);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    const hy = kind === 'normal' ? y - ry * 0.42 : y - ry * 0.02;
    ctx.beginPath();
    ctx.ellipse(x + look - rx * 0.3, hy, rx * 0.36, ry * 0.26, -0.3, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + look + rx * 0.36, y + ry * 0.42, rx * 0.16, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x + look * 0.4, y, rx, ry, 0, 0, TAU);
    ctx.stroke();
    if (kind === 'angry') {
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.25, y - ry * 1.35);
      ctx.lineTo(x + rx * 1.15, y - ry * 0.7);
      ctx.stroke();
    }
  }
  function eyes2(ctx, x, y, gap, rx, ry, kind, iris, lid) {
    eye2(ctx, x, y, rx, ry, kind, iris, lid, 0.7);
    eye2(ctx, x + gap, y - 0.5, rx * 0.92, ry * 0.95, kind, iris, lid, 0.7);
  }
  // 兩端粗細不同、帶描邊與中線亮面的一節（腳、手臂）
  function seg(ctx, ax, ay, bx, by, w0, w1, col, shade, rim) {
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    const path = (c) => {
      c.moveTo(ax + nx * w0, ay + ny * w0);
      c.lineTo(bx + nx * w1, by + ny * w1);
      c.arc(bx, by, w1, Math.atan2(ny, nx), Math.atan2(ny, nx) + PI, true);
      c.lineTo(ax - nx * w0, ay - ny * w0);
      c.arc(ax, ay, w0, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + PI, true);
      c.closePath();
    };
    rs(ctx, path, col, shade, rim, { cel: [1.2, 1.4], rim: 1.2, lw: 2.2 });
  }

  // ═════════════ 第二章：潮風海岬 ═════════════

  // ── 卷軸寄居蟹：寄居蟹 ＋ 封著蠟印的魔法卷軸當殼（捲紙的斷面像螺殼） ──
  // 小嘴：'smile' 貓嘴、'open' 張嘴（舌頭）、'o' 圓嘴、'grit' 咬牙
  function mouth2(ctx, x, y, kind, k) {
    k = k || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.strokeStyle = A.outline();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (kind === 'open' || kind === 'o') {
      const w = kind === 'o' ? 2.4 : 3.6;
      const h = kind === 'o' ? 2.8 : 3.4;
      ctx.beginPath();
      if (kind === 'o') ctx.ellipse(0, 1.2, w, h, 0, 0, TAU);
      else {
        ctx.moveTo(-w, -0.6);
        ctx.quadraticCurveTo(0, 0.6, w, -0.6);
        ctx.quadraticCurveTo(w * 0.9, h * 1.5, 0, h * 1.45);
        ctx.quadraticCurveTo(-w * 0.9, h * 1.5, -w, -0.6);
        ctx.closePath();
      }
      ctx.fillStyle = A.c('#521420');
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = A.c('#ff7a88');
      ctx.beginPath();
      ctx.ellipse(0.6, h * 1.55, w * 0.72, h * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else if (kind === 'grit') {
      ctx.beginPath();
      A.roundRect(ctx, -3.8, -1.4, 7.6, 3.6, 1.4);
      ctx.fillStyle = A.c('#ffffff');
      ctx.fill();
      ctx.lineWidth = 1.7;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-3.6, 0.4);
      ctx.lineTo(3.6, 0.4);
      ctx.moveTo(-1.2, -1.2);
      ctx.lineTo(-1.2, 2);
      ctx.moveTo(1.3, -1.2);
      ctx.lineTo(1.3, 2);
      ctx.stroke();
    } else {
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(-3.2, -0.8);
      ctx.quadraticCurveTo(-1.6, 1.8, 0, 0);
      ctx.quadraticCurveTo(1.6, 1.8, 3.2, -0.8);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 厚塗版的螯：鉗指內側有鋸齒、指尖顏色較深，掌上有疣粒
  function claw2(ctx, x, y, r, open, C, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    const finger = (flip, len, w, ang) => {
      ctx.save();
      ctx.translate(r * 0.5, flip * r * 0.12);
      ctx.scale(1, flip);
      ctx.rotate(ang);
      const path = (c) => {
        c.moveTo(-r * 0.1, -w);
        c.quadraticCurveTo(len * 0.75, -w * 1.3, len, w * 0.15);
        c.lineTo(len * 0.8, w * 0.15);
        for (let i = 0; i < 3; i++) {
          const x0 = len * (0.78 - i * 0.2);
          c.lineTo(x0 - len * 0.06, w * 0.55);
          c.lineTo(x0 - len * 0.12, w * 0.2);
        }
        c.lineTo(-r * 0.1, w * 0.75);
        c.closePath();
      };
      rs(ctx, path, C[0], C[1], C[2], {
        cel: [0.6, flip > 0 ? 1.2 : -1.2],
        rim: 1,
        lw: 2,
        tex: (c) => {
          c.fillStyle = A.c(C[3]);
          c.fillRect(len * 0.72, -w * 2, len, w * 4);
        },
      });
      ctx.restore();
    };
    finger(1, r * 1.2, r * 0.46, 0.1 - open * 0.55);
    finger(-1, r * 1.45, r * 0.56, 0.02 - open * 0.65);
    rse(ctx, 0, 0, r * 0.92, r * 0.76, C[0], C[1], C[2], {
      lw: 2.3,
      tex: (c) => speckle(c, r * 0.1, r * 0.1, r * 1.4, r * 1.1, 6, r * 0.09, C[1], 5 + r, 0.8),
    });
    ctx.restore();
  }
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
    const CR = ['#f5925e', '#b8523a', '#ffd6b0', '#7a2a1e'];
    const LEG = ['#e27a4c', '#9a4228', '#ffc49a', '#6a2418'];
    const PAP = ['#f6e2b0', '#c49a62', '#fffbe8'];
    const WOOD = ['#8a4a24', '#4e2410', '#c88450'];
    const GOLD = ['#ffd24a', '#b87a18', '#fff4b8'];
    const RIB = ['#cf2e40', '#861426', '#ff8a98'];
    const RUNE = '#4ab8ff';
    const by = -13 - bob;

    // 施法時繞著卷軸飄的符文碎光
    if (open > 0.2) {
      for (let i = 0; i < 4; i++) {
        const a = t * 2.2 + (i / 4) * TAU;
        const q = open * (0.5 + 0.5 * Math.sin(t * 5 + i));
        glowRune(ctx, -8 + Math.cos(a) * 26, -30 + Math.sin(a) * 12, 2.2, i * 2 + 1, RUNE, '#e8fbff', q * 0.8);
      }
    }

    // 遠側的腳（兩節、關節往上拱）
    for (let i = 0; i < 2; i++) {
      const ph2 = t * 14 + i * 2.4 + 1;
      const lift = walk ? Math.max(0, Math.sin(ph2)) * 3 : 0;
      const hx = 1 + i * 6;
      const kx = -3 + i * 7;
      const fx2 = -7 + i * 9 + (walk ? Math.cos(ph2) * 1.5 : 0);
      seg(ctx, hx, by + 3, kx, by - 3, 2.4, 2, LEG[1], LEG[3], null);
      seg(ctx, kx, by - 3, fx2, -1.5 - lift, 2, 1.1, LEG[1], LEG[3], null);
    }

    // 卷軸殼（斜躺在背上）
    ctx.save();
    ctx.translate(-9, -21 - bob * 0.6);
    ctx.rotate(-0.3 + lean);
    const L = 16;
    const R = 12;
    // 右端的木軸頭（在後面）＋金色軸蓋
    rs(ctx, (c) => A.roundRect(c, L + 1, -3.2, 7, 6.4, 2), WOOD[0], WOOD[1], WOOD[2], { cel: [0, 1.5], rim: 1, lw: 2 });
    rse(ctx, L + 9, 0, 3.6, 4.4, GOLD[0], GOLD[1], GOLD[2], { lw: 2, rim: 1, hl: false });
    dot(ctx, L + 9.4, 0, 1.3, '#e8484a');
    // 打開：一張紙從卷軸頂上展開，上面是發光的符文法陣
    if (open > 0.15) {
      const sh = 3 + open * 17;
      const wav = Math.sin(t * 9) * 1.5 * open;
      glow(ctx, 0, -R - sh * 0.6, 16 + open * 14, '#7ad8ff', 0.55 * open);
      const sheet = (c) => {
        c.moveTo(-L + 3, -R + 3);
        c.lineTo(-L + 1 + wav, -R - sh);
        c.quadraticCurveTo(0, -R - sh - 3 + wav, L - 3 + wav, -R - sh + 1);
        c.lineTo(L - 3, -R + 3);
        c.closePath();
      };
      rs(ctx, sheet, PAP[0], PAP[1], PAP[2], {
        cel: [-2, 0],
        rim: 1.2,
        lw: 2.2,
        tex: (c) => {
          c.fillStyle = lg(c, 0, -R - sh, 0, -R + 3, [[0, '#ffffff', 0], [1, '#a07840', 0.35]]);
          c.fillRect(-L, -R - sh - 4, L * 2, sh + 8);
          speckle(c, 0, -R - sh * 0.5, L * 1.8, sh, 7, 1, '#c8a060', 21, 0.5);
          if (sh > 8) {
            c.save();
            c.translate(wav * 0.5, -R - sh * 0.5 - 0.5);
            c.scale(1, 0.62);
            c.globalAlpha *= Math.min(1, (sh - 8) / 6);
            magicCircle(c, Math.min(9.5, sh * 0.45), t * 1.5, '#2a8ae0', '#8ae4ff', { lw: 0.55, runes: 6 });
            c.restore();
          }
        },
      });
      // 頂邊捲起來的小紙捲
      rs(ctx, (c) => A.roundRect(c, -L + wav, -R - sh - 3.5, L * 2 - 2, 5.5, 2.75), PAP[0], PAP[1], PAP[2], { cel: [0, 1.5], rim: 1, lw: 2 });
      A.ellipse(ctx, L - 2 + wav, -R - sh - 0.75, 1.6, 2.75, '#e8d4a4', null, { lw: 1.4, hl: false });
      if (sh > 9) glowRune(ctx, wav * 0.5, -R - sh * 0.5 - 1, Math.min(4, sh * 0.2), 3, RUNE, '#e8fbff', Math.min(1, (sh - 9) / 6));
    }
    // 卷軸本體（圓筒）：圓筒的明暗、紙纖維、陳年汙漬、一行行符文
    const body = (c) => {
      c.moveTo(-L, -R);
      c.lineTo(L, -R);
      c.ellipse(L, 0, 4.5, R, 0, -PI / 2, PI / 2);
      c.lineTo(-L, R);
      c.closePath();
    };
    rs(ctx, body, PAP[0], PAP[1], PAP[2], {
      cel: [0, 3.2],
      rim: 1.8,
      tex: (c) => {
        c.fillStyle = lg(c, 0, -R, 0, R, [[0, '#ffffff', 0.35], [0.35, '#ffffff', 0], [0.75, '#8a6a3a', 0.1], [1, '#6a4a22', 0.35]]);
        c.fillRect(-L - 5, -R, L * 2 + 10, R * 2);
        // 一圈圈紙邊（捲起來的層）
        c.strokeStyle = A.c('#d8b886');
        c.lineWidth = 0.9;
        c.beginPath();
        [-7, -1, 11].forEach((x) => {
          c.moveTo(x, -R);
          c.quadraticCurveTo(x + 1.5, 0, x, R);
        });
        c.stroke();
        speckle(c, -2, 3, L * 1.8, R * 1.6, 9, 1.3, '#b88a4e', 3, 0.35);
        // 符文行（平常是褐色墨，施法時亮成藍色）
        for (let row = 0; row < 3; row++) {
          for (let k = 0; k < 3; k++) {
            const gx = -11 + k * 4.4 + (row % 2) * 1.5;
            const gy = -5 + row * 5;
            runeGlyph(c, gx, gy, 1.5, row * 3 + k, open > 0.3 ? '#2a78d8' : '#8a5a2a', 0.9);
          }
        }
        if (open > 0.3) {
          c.globalAlpha *= open;
          glow(c, -7, 0, 14, RUNE, 0.35);
        }
      },
    });
    // 插在緞帶下的羽毛筆
    ctx.save();
    ctx.translate(7, -R + 3);
    ctx.rotate(0.55 + Math.sin(t * 2.3) * 0.04);
    const vane = (c) => {
      c.moveTo(0, -3);
      c.quadraticCurveTo(-4.2, -10, -1.2, -19);
      c.quadraticCurveTo(0.6, -21, 1.2, -22);
      c.quadraticCurveTo(4, -13, 2.2, -8);
      c.lineTo(3.2, -7);
      c.quadraticCurveTo(2, -4, 0.8, -3);
      c.closePath();
    };
    rs(ctx, vane, '#f4f0ff', '#a898c8', '#ffffff', {
      cel: [1.2, 0],
      rim: 0.8,
      lw: 1.6,
      tex: (c) => {
        c.strokeStyle = A.c('#b8a8e0');
        c.lineWidth = 0.6;
        c.beginPath();
        for (let i = 0; i < 5; i++) {
          c.moveTo(0.3, -5 - i * 3.2);
          c.lineTo(-2.6, -7.5 - i * 3);
          c.moveTo(0.5, -5 - i * 3.2);
          c.lineTo(2.6, -6.8 - i * 3);
        }
        c.stroke();
        c.fillStyle = A.c('#5a7ad8');
        c.fillRect(-5, -23, 10, 4.5);
      },
    });
    line(ctx, [[0.4, 2], [0.6, -20]], '#e8e0c8', 0.9);
    ctx.restore();
    // 綁繩（紅緞帶＋金線）＋蠟印
    const band = (c) => A.roundRect(c, 4, -R - 0.5, 5.2, R * 2 + 1, 1.5);
    rs(ctx, band, RIB[0], RIB[1], RIB[2], {
      cel: [0, 3],
      rim: 1,
      lw: 1.8,
      tex: (c) => {
        c.strokeStyle = A.c(GOLD[0]);
        c.lineWidth = 0.8;
        c.setLineDash([1.4, 1.2]);
        c.beginPath();
        c.moveTo(5, -R);
        c.lineTo(5, R);
        c.moveTo(8.2, -R);
        c.lineTo(8.2, R);
        c.stroke();
        c.setLineDash([]);
      },
    });
    const tail = Math.sin(t * 3) * 1.2;
    rs(ctx, (c) => { c.moveTo(5.5, 6); c.quadraticCurveTo(4 + tail, 14, 1 + tail, 18.5); c.lineTo(3.4 + tail, 16.6); c.lineTo(5.4 + tail, 18); c.quadraticCurveTo(7.5, 13, 8, 6); c.closePath(); }, RIB[0], RIB[1], null, { cel: [-1, 0], lw: 1.6 });
    if (open > 0.3) glow(ctx, 6.5, 1.5, 13, '#ffb070', 0.65 * open);
    // 蠟印：邊緣滴落的蠟、壓出來的符文
    const seal = (c) => {
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * TAU;
        const rr = 6.3 + (i % 2 ? -0.6 : 0.5) + (i === 3 ? 1.6 : 0);
        i ? c.lineTo(6.5 + Math.cos(a) * rr, 1.5 + Math.sin(a) * rr) : c.moveTo(6.5 + Math.cos(a) * rr, 1.5 + Math.sin(a) * rr);
      }
      c.closePath();
    };
    rs(ctx, seal, '#dc3a2c', '#8e1c18', '#ff9a80', { cel: [1.2, 1.4], rim: 1.1, lw: 2 });
    A.ellipse(ctx, 6.5, 1.5, 3.8, 3.8, '#c42a22', null, { lw: 1.1, hl: false });
    runeGlyph(ctx, 6.5, 1.5, 2.3, 6, open > 0.3 ? '#fff0b0' : '#ff9a80', 1.2);
    dot(ctx, 4.6, -1.2, 0.9, '#ffd0c0');
    // 左端的斷面：一圈圈捲起來的紙，像螺殼的漩渦（每一圈有深淺）
    rse(ctx, -L, 0, 5, R, '#fff4d6', '#d8bc88', null, { lw: 2.4, hl: false, cel: [0.8, 2] });
    ctx.lineCap = 'round';
    const spiral = (dx, dy) => {
      ctx.beginPath();
      for (let a = 0; a < TAU * 2.4; a += 0.18) {
        const rr = 1.2 + a * 0.62;
        const px = -L + dx + Math.cos(a) * rr * 0.42;
        const py = dy + Math.sin(a) * rr;
        a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
    };
    spiral(0.4, 0.6);
    ctx.strokeStyle = A.c('#a8804a');
    ctx.lineWidth = 1.6;
    ctx.stroke();
    spiral(-0.2, -0.3);
    ctx.strokeStyle = A.c('#fffaf0');
    ctx.lineWidth = 0.7;
    ctx.stroke();
    A.ellipse(ctx, -L, 0, 1.1, 1.8, '#4a2e1f', null, { noStroke: true, hl: false });
    // 左端的木軸頭（金色軸蓋＋寶石）
    rs(ctx, (c) => A.roundRect(c, -L - 7, -2.6, 6, 5.2, 1.8), WOOD[0], WOOD[1], WOOD[2], { cel: [0, 1.4], rim: 1, lw: 2 });
    rse(ctx, -L - 8.5, 0, 3.4, 4.2, GOLD[0], GOLD[1], GOLD[2], { lw: 2, rim: 1, hl: [-L - 9.6, -1.6, 1, 0.8] });
    dot(ctx, -L - 8.8, 0.2, 1.2, open > 0.3 ? '#bff4ff' : '#3a8ae8');
    ctx.restore();

    // 近側的腳（兩節、關節往上拱、腳尖顏色深）
    for (let i = 0; i < 3; i++) {
      const ph2 = t * 14 + i * 2.1;
      const lift = walk ? Math.max(0, Math.sin(ph2)) * 3.2 : 0;
      const x0 = 3 + i * 6;
      const kx = x0 + 5;
      const ky = by - 1.5 - i * 0.5;
      const fx2 = x0 + 8 + (walk ? Math.cos(ph2) * 1.6 : 0);
      seg(ctx, x0, by + 4, kx, ky, 3, 2.5, LEG[0], LEG[1], LEG[2]);
      seg(ctx, kx, ky, fx2, -1.2 - lift, 2.5, 1.4, LEG[0], LEG[1], LEG[2]);
      dot(ctx, kx, ky, 1, LEG[3]);
      line(ctx, [[fx2 - (fx2 - kx) * 0.25, -1.2 - lift - (ky + 1.2 + lift) * 0.25], [fx2, -1.2 - lift]], LEG[3], 1.6);
    }
    // 後面的小螯（施法時舉高）
    seg(ctx, 14, by - 4, 20, by - 11 - open * 3, 2.4, 2, LEG[1], LEG[3], null);
    claw2(ctx, 21, by - 14 - open * 3, 4.4, open * 0.6 + 0.2, [LEG[1], LEG[3], '#c8603c', '#4a1a12'], -1.3);

    // 眼柄
    const wob = Math.sin(t * 3.4) * 1.1 + (hurt ? -2 : 0);
    seg(ctx, 6, by - 7, 4 + wob, by - 18, 2.3, 1.7, CR[0], CR[1], CR[2]);
    seg(ctx, 14, by - 8, 15 + wob, by - 18, 2.3, 1.7, CR[0], CR[1], CR[2]);

    // 身體（從卷軸底下鑽出來的圓胖頭胸甲）：甲殼分節、疣粒、邊光
    const cara = (c) => {
      c.moveTo(-1.5, by + 4);
      c.bezierCurveTo(-3, by - 6, 4, by - 11, 12, by - 10.5);
      c.bezierCurveTo(20, by - 10, 25, by - 5, 23.5, by + 2);
      c.quadraticCurveTo(22, by + 8.5, 11, by + 8.5);
      c.quadraticCurveTo(0, by + 8.5, -1.5, by + 4);
      c.closePath();
    };
    rs(ctx, cara, CR[0], CR[1], CR[2], {
      cel: [2.4, 3],
      rim: 1.8,
      sheen: [8, by - 7, 9, 0.35],
      tex: (c) => {
        c.strokeStyle = A.c('#d06a42');
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(3, by - 7);
        c.quadraticCurveTo(8, by - 3, 6, by + 3);
        c.moveTo(19, by - 8);
        c.quadraticCurveTo(15, by - 3, 17, by + 3);
        c.stroke();
        speckle(c, 12, by - 1, 20, 12, 10, 0.9, '#c85a38', 11, 0.9);
        speckle(c, 10, by - 6, 14, 5, 4, 0.7, '#ffe0c0', 17, 0.8);
      },
    });

    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || throwing > 0.5)) kind = 'angry';
    // 眼柄上的眼珠：白眼球＋琥珀色虹膜
    [[4 + wob, by - 21, 4.8], [15 + wob, by - 21, 4.5]].forEach(([x, y, r]) => {
      rse(ctx, x, y, r, r, '#ffffff', '#d8dce8', null, { lw: 2.1, hl: false, cel: [r * 0.2, r * 0.25] });
      if (kind === 'normal' || kind === 'angry') eye2(ctx, x + r * 0.22, y + r * 0.1, r * 0.52, r * 0.62, kind, '#e0901e', '#ffffff', 0);
      else if (kind === 'x') A.eye(ctx, x, y, r * 0.45, r * 0.45, 'x');
      else if (kind === 'closed') A.eye(ctx, x, y + 1, r * 0.55, r * 0.4, 'closed');
      else A.eye(ctx, x, y, r * 0.5, r * 0.62, 'hurt');
    });
    mouth2(ctx, 11, by + 3, hurt ? 'open' : ph === 'strike' || throwing > 0.5 ? 'o' : ph === 'wind' ? 'grit' : 'smile', 0.8);
    A.blush(ctx, 4.5, by + 2.5, 2.6);
    A.blush(ctx, 18, by + 2, 2.3);

    // 前面的大螯
    let cOpen = 0.35 + Math.sin(t * 4.5) * 0.12;
    let cRot = -0.55;
    if (ph === 'wind') { cOpen = 0.95; cRot = -1.2; }
    else if (ph === 'strike') { cOpen = 0.05; cRot = 0.1; }
    if (throwing > 0.5) cRot -= 0.4;
    seg(ctx, 17, by + 3, 24, by, 2.9, 2.6, CR[0], CR[1], CR[2]);
    claw2(ctx, 26, by - 1, 7.4, cOpen, [CR[0], CR[1], CR[2], '#8a3020'], cRot);
    // 螯尖上凝聚的符文光點
    if (throwing > 0.3 || ph === 'wind') {
      const q = Math.max(throwing, 0.5);
      glowRune(ctx, 34, by - 12, 3.2, Math.floor(t * 4), RUNE, '#e8fbff', q);
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
    // 噴水游泳：傘一收（變窄變高）身體就往上竄，放鬆時慢慢沉；觸手落後傘的動作
    const sw0 = t * (walking(m) ? 3.4 : 2.4);
    const con = Math.max(0, Math.sin(sw0));
    const fy = Math.sin(sw0 - 0.9) * 3.5;
    const pulse = 1.03 - con * con * 0.1;
    ctx.save();
    ctx.scale(1.1, 1.1);
    const cy = -44 - fy;
    const rimY = cy + 10;
    const mx = (a, b) => U.mix(a, b, off);
    const BELL = [mx('#bfe4ff', '#a4acc0'), mx('#6fa6e8', '#6c7488'), mx('#f0fbff', '#c8ccd8')];
    const GA = ctx.globalAlpha;
    const q0 = (p) => Math.sin(p - 1.6);

    // 光暈
    glow(ctx, 0, cy - 4, 54, '#6ad4ff', 0.42 * lit + fl * 0.45);
    glow(ctx, 0, rimY + 18, 30, '#8a7aff', 0.2 * lit);
    if (fl > 0) {
      // 重新亮起的一瞬間：一圈鬼火電光
      ctx.save();
      ctx.globalAlpha *= fl;
      const R = 26 + (1 - fl) * 28;
      ctx.strokeStyle = A.c('#8ae4ff');
      ctx.lineWidth = 6;
      ctx.globalAlpha *= 0.4;
      ctx.beginPath();
      ctx.arc(0, cy - 4, R, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha /= 0.4;
      ctx.strokeStyle = A.c('#e8fcff');
      ctx.lineWidth = 2.4;
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        bolt(ctx, Math.cos(a) * (R - 8), cy - 4 + Math.sin(a) * (R - 8), Math.cos(a) * (R + 10), cy - 4 + Math.sin(a) * (R + 10), i + t, '#dffaff');
      }
      ctx.restore();
    }

    // 繞著傘飄的三顆小鬼火
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + (i / 3) * TAU;
      const x = Math.cos(a) * 29;
      const y = cy - 6 + Math.sin(a) * 9;
      const back = Math.sin(a) < 0;
      if (!back) continue;
      ctx.save();
      ctx.globalAlpha *= 0.35 + 0.5 * lit;
      glow(ctx, x, y, 8, '#7ae0ff', 0.7);
      dot(ctx, x, y, 2, '#e8ffff');
      ctx.restore();
    }

    // 靈光觸手：兩條荷葉邊的口腕（有描邊）＋五條沒有描邊、往下淡掉的光絲
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    [-12, -6, 0, 6, 12].forEach((x, i) => {
      const ph2 = t * 3 + i * 1.3;
      const pts = [];
      const len = 30 + (i % 2) * 7;
      // 傘收縮時觸手往內收、放鬆時往外散（相位落後）
      const spread = 1 + q0(sw0) * 0.35;
      for (let k = 0; k <= 8; k++) {
        const q = k / 8;
        pts.push([x * (1 + q * 0.4) * spread + Math.sin(ph2 - q * 4) * 4 * q, rimY + 2 + q * len * (1.04 - con * 0.08)]);
      }
      for (let k = 0; k < 8; k++) {
        const a = (1 - k / 8) * (0.25 + 0.75 * lit);
        ctx.globalAlpha = GA * a * 0.3;
        ctx.strokeStyle = A.c(i % 2 ? '#9a8aff' : '#7ad8ff');
        ctx.lineWidth = 7 - k * 0.5;
        ctx.beginPath();
        ctx.moveTo(pts[k][0], pts[k][1]);
        ctx.lineTo(pts[k + 1][0], pts[k + 1][1]);
        ctx.stroke();
        ctx.globalAlpha = GA * a * 0.95;
        ctx.strokeStyle = A.c(mx('#e6fcff', '#8a9ab8'));
        ctx.lineWidth = 2.2 - k * 0.18;
        ctx.stroke();
      }
      // 光絲上的小光珠
      for (let k = 2; k < 8; k += 3) {
        ctx.globalAlpha = GA * (1 - k / 9) * (0.3 + 0.7 * lit);
        dot(ctx, pts[k][0], pts[k][1], 1.3, '#ffffff');
      }
      const q = (t * 0.7 + i * 0.37) % 1;
      ctx.globalAlpha = GA * (1 - q) * (0.3 + 0.7 * lit);
      dot(ctx, pts[8][0] + Math.sin(t * 2 + i) * 3, pts[8][1] + q * 8, 1.8 - q, '#dffaff');
    });
    ctx.globalAlpha = GA;
    // 口腕：兩條扭動的半透明緞帶
    [-4, 4].forEach((x0, j) => {
      const P = [];
      for (let k = 0; k <= 10; k++) {
        const q = k / 10;
        P.push([x0 + Math.sin(t * 2.6 + j * 2 - q * 5) * (1.5 + q * 4), rimY + 1 + q * 26]);
      }
      const wid = (k) => 3.2 * (1 - k / 12);
      const arm = (c) => {
        P.forEach((p, k) => (k ? c.lineTo(p[0] + wid(k), p[1]) : c.moveTo(p[0] + wid(k), p[1])));
        for (let k = 10; k >= 0; k--) c.lineTo(P[k][0] - wid(k) - (k % 2 ? 1.2 : 0), P[k][1]);
        c.closePath();
      };
      ctx.save();
      ctx.globalAlpha *= 0.62 * (0.5 + 0.5 * lit) + 0.2;
      ctx.beginPath();
      arm(ctx);
      ctx.fillStyle = lg(ctx, 0, rimY, 0, rimY + 26, [[0, mx('#d8ccff', '#a0a4b8')], [0.6, mx('#9a8aff', '#80849a'), 0.7], [1, mx('#7ad8ff', '#80849a'), 0]]);
      ctx.fill();
      ctx.strokeStyle = A.c(mx('#f4f0ff', '#c0c4d0'));
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();

    // 荷葉邊（傘緣）：後面一層深、前面一層淺
    ctx.save();
    ctx.translate(0, rimY);
    ctx.scale(pulse, 1);
    const frill = (c, W, dy, n, ph0) => {
      c.moveTo(-W, -3);
      c.lineTo(W, -3);
      for (let i = 0; i < n; i++) {
        const x0 = W - (i / n) * 2 * W;
        const x1 = W - ((i + 1) / n) * 2 * W;
        c.quadraticCurveTo((x0 + x1) / 2, dy + Math.sin(t * 5 + i + ph0) * 1.5, x1, -3);
      }
      c.closePath();
    };
    ctx.save();
    ctx.globalAlpha *= 0.7;
    rs(ctx, (c) => frill(c, 19, 9, 6, 1.5), mx('#9a8ae8', '#7a7e92'), mx('#6a5ac0', '#5a5e70'), null, { cel: [0, 2], lw: 2 });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= 0.88;
    rs(ctx, (c) => frill(c, 21.5, 6, 7, 0), mx('#b4dcff', '#8a92a8'), mx('#6ea0e0', '#6a7488'), mx('#ffffff', '#c0c4d0'), { cel: [0, 2], rim: 1, lw: 2.1 });
    ctx.restore();
    // 傘緣上一排會亮的小點
    for (let i = 0; i < 7; i++) {
      const x = -18 + i * 6;
      const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i * 0.9));
      ctx.save();
      ctx.globalAlpha *= a * (0.25 + 0.75 * lit);
      glow(ctx, x, -1, 3.5, '#bff4ff', 0.9);
      dot(ctx, x, -1, 0.9, '#ffffff');
      ctx.restore();
    }
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
    const inner = (c) => {
      c.moveTo(-15, 9);
      c.bezierCurveTo(-17, -3, -11, -16, 0, -16);
      c.bezierCurveTo(11, -16, 17, -3, 15, 9);
      c.quadraticCurveTo(0, 12, -15, 9);
      c.closePath();
    };
    ctx.save();
    ctx.globalAlpha *= 0.6 - off * 0.1;
    rs(ctx, bell, BELL[0], BELL[1], null, {
      cel: [3.5, 3],
      noStroke: true,
      tex: (c) => {
        // 邊緣比較濃、中間透明（果凍的厚度）
        const g = c.createRadialGradient(-4, -8, 3, 0, -2, 26);
        g.addColorStop(0, 'rgba(255,255,255,0.35)');
        g.addColorStop(0.6, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(40,60,140,0.3)');
        c.fillStyle = g;
        c.fillRect(-26, -26, 52, 40);
        // 傘面分成八瓣，瓣與瓣之間的深色縫（像燈籠的骨）
        c.fillStyle = 'rgba(40,70,160,0.16)';
        for (let i = 0; i < 4; i++) {
          const k = -0.75 + i * 0.5;
          c.beginPath();
          c.moveTo(k * 4, -24);
          c.quadraticCurveTo(k * 26 - 3, -8, k * 24 - 3, 12);
          c.lineTo(k * 24 + 3, 12);
          c.quadraticCurveTo(k * 26 + 3, -8, k * 4 + 2, -24);
          c.closePath();
          c.fill();
        }
      },
    });
    // 內傘（深一點的一層）
    rs(ctx, inner, mx('#8ab8f0', '#8890a4'), mx('#6a8ad8', '#747a8e'), null, { cel: [2, 2], noStroke: true });
    // 傘裡的四瓣生殖腺（淡紫色的馬蹄形環，像水母的四葉草）
    ctx.strokeStyle = A.c(mx('#d8c8ff', '#a8acc0'));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    [[-7, 3], [7, 3], [-3.5, -6], [3.5, -6]].forEach(([x, y]) => {
      ctx.moveTo(x + 3.2, y);
      ctx.ellipse(x, y, 3.2, 2.2, x * 0.08, 0, PI * 1.6);
    });
    ctx.stroke();
    ctx.restore();
    // 輻射管（從傘頂往下的細線）
    ctx.save();
    ctx.globalAlpha *= 0.45;
    ctx.strokeStyle = A.c(mx('#e8f6ff', '#c0c4d0'));
    ctx.lineWidth = 1;
    ctx.beginPath();
    [-0.75, -0.4, 0.4, 0.75].forEach((k) => {
      ctx.moveTo(k * 6, -21);
      ctx.quadraticCurveTo(k * 22, -12, k * 19, 9.5);
    });
    ctx.stroke();
    ctx.restore();
    // 鬼火（三層火舌，會晃）
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
    glow(ctx, 0, fyB - 10 * fk, 20 * fk + 4, '#8ae8ff', 0.85 * lit + fl * 0.3);
    rs(ctx, (c) => flame(c, 1), mx('#4ab4ff', '#4a5a8a'), mx('#2a6ad8', '#3a4670'), mx('#bff0ff', '#6a7aa0'), { cel: [1.5, 1.5], rim: 1.2, noStroke: true });
    ctx.beginPath();
    flame(ctx, 1);
    ctx.strokeStyle = A.c(mx('#1a4ab8', '#2a3450'));
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.stroke();
    rs(ctx, (c) => flame(c, 0.72), mx('#8ae8ff', '#6a7aa8'), null, null, { noStroke: true });
    rs(ctx, (c) => flame(c, 0.42), mx('#ffffff', '#8a98b8'), null, null, { noStroke: true });
    // 火裡往上竄的火星
    for (let i = 0; i < 3; i++) {
      const q = (t * 1.3 + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha *= (1 - q) * lit;
      dot(ctx, Math.sin(t * 4 + i * 2) * 4, fyB - 6 - q * 16 * fk, 1.1, '#e8ffff');
      ctx.restore();
    }
    // 傘的反光與描邊
    ctx.save();
    ctx.globalAlpha *= 0.85;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-13, -11, 2.4, 6.8, 0.45, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-7.5, -19.5, 1.7, 0, TAU);
    ctx.fill();
    ctx.globalAlpha *= 0.5;
    ctx.beginPath();
    ctx.ellipse(15, -4, 1.2, 4, -0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 左上緣的邊光
    ctx.save();
    ctx.beginPath();
    bell(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c(BELL[2]);
    ctx.lineWidth = 2.4;
    ctx.globalAlpha *= 0.8;
    ctx.translate(1.2, 1.2);
    ctx.beginPath();
    bell(ctx);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    bell(ctx);
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    // 傘緣一圈會發光的環管（水母的發光環，像燈籠的箍），上面一顆顆發光點
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20.5, 7.5);
    ctx.quadraticCurveTo(0, 12, 20.5, 7.5);
    ctx.save();
    ctx.globalAlpha *= 0.5 * (0.3 + 0.7 * lit);
    ctx.strokeStyle = A.c('#7ae0ff');
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = A.c(mx('#bff4ff', '#a8acc0'));
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = -2; i <= 2; i++) dot(ctx, i * 8, 9.6 - Math.abs(i) * 0.9, 1, mx('#ffffff', '#c8ccd8'));
    // 傘頂的鬼火冠：三朵小藍火，跟著搖
    ctx.save();
    ctx.globalAlpha *= 0.4 + 0.6 * lit;
    [[-6, 0.8, -0.4], [0, 1.2, 0], [6, 0.8, 0.4]].forEach(([x, k, r], i) => {
      const w2 = Math.sin(t * 7 + i * 2) * 1.2;
      const base = -23 + Math.abs(x) * 0.2;
      glow(ctx, x, base - 4 * k, 7 * k, '#7ae0ff', 0.7);
      A.shape(ctx, (c) => {
        c.moveTo(x - 2.6 * k, base);
        c.quadraticCurveTo(x - 3 * k, base - 5 * k, x + w2 + r * 4, base - 9 * k);
        c.quadraticCurveTo(x + 3 * k, base - 5 * k, x + 2.6 * k, base);
        c.closePath();
      }, mx('#6ad4ff', '#7a86a0'), mx('#2a7ae0', '#5a6480'), { lw: 1.4, hl: false });
      A.shape(ctx, (c) => { c.moveTo(x - 1.2 * k, base); c.quadraticCurveTo(x + w2 * 0.5, base - 6 * k, x + 1.2 * k, base); c.closePath(); }, '#e8ffff', null, { noStroke: true, hl: false });
    });
    ctx.restore();
    ctx.restore();

    // 前面的小鬼火
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + (i / 3) * TAU;
      if (Math.sin(a) < 0) continue;
      const x = Math.cos(a) * 29;
      const y = cy - 6 + Math.sin(a) * 9;
      ctx.save();
      ctx.globalAlpha *= 0.35 + 0.6 * lit;
      glow(ctx, x, y, 9, '#7ae0ff', 0.8);
      A.shape(ctx, (c) => { c.moveTo(x, y + 2.4); c.quadraticCurveTo(x - 3, y + 1, x - 0.4, y - 4.5); c.quadraticCurveTo(x + 3, y + 1, x, y + 2.4); c.closePath(); }, '#e8ffff', null, { noStroke: true });
      ctx.restore();
    }

    // 臉（在傘的下半部）
    let kind = eyeKind(m);
    if (kind === 'normal' && off > 0.6) kind = 'closed';
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    eyes2(ctx, -5, cy + 1.5, 10, 3.2, 4.1, kind, off > 0.3 ? '#6a7aa8' : '#2a9ae8', '#2a3a6a');
    mouth2(ctx, 0.5, cy + 6.8, hurt ? 'open' : ph === 'strike' ? 'o' : ph === 'wind' ? 'grit' : 'smile', 0.7);
    if (off < 0.6) {
      A.blush(ctx, -11.5, cy + 5.5, 2.8);
      A.blush(ctx, 12, cy + 5, 2.6);
    } else {
      // 熄滅時冒出的小煙
      ctx.save();
      ctx.globalAlpha *= (off - 0.6) / 0.4;
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.9 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha *= 1 - q;
        ctx.strokeStyle = A.c('#9aa6c8');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(3 + Math.sin(q * 6 + i) * 4, cy - 26 - q * 16, 2 + q * 3.5, 0, TAU);
        ctx.stroke();
        ctx.restore();
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
    ctx.restore();
  }

  // ── 巫師海鷗：海鷗戴尖頂巫師帽、披星紋斗篷；漂浮時斗篷張開成傘狀、帽尖發光 ──
  const HAT = ['#5a46c8', '#2e2280', '#9a8aff'];
  const CLOAK = ['#34449c', '#1c2464', '#7a8ae8'];
  const LINING = ['#a070e8', '#6a3cb0', '#d8b8ff'];
  const GOLDC = ['#ffd24a', '#b87a18', '#fff4b8'];
  function wizardHat(ctx, x, y, t, lit, droop) {
    ctx.save();
    ctx.translate(x, y);
    // 帽身（尖端往後垂，有皺褶與補丁）
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
    rs(ctx, cone, HAT[0], HAT[1], HAT[2], {
      cel: [2.6, 1.6],
      rim: 1.3,
      tex: (c) => {
        c.fillStyle = lg(c, 0, -22, 0, 0, [[0, '#1a1050', 0.35], [0.5, '#1a1050', 0], [1, '#ffffff', 0.08]]);
        c.fillRect(-20, -30, 32, 32);
        // 皺褶
        c.strokeStyle = A.c(HAT[1]);
        c.lineWidth = 1.1;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(-8, -17);
        c.quadraticCurveTo(-5, -15, -3, -17);
        c.moveTo(-2, -12);
        c.quadraticCurveTo(1, -9, 3.5, -10);
        c.stroke();
        // 補丁（縫線）
        c.fillStyle = A.c('#7a5ad8');
        c.fillRect(-5.5, -9.5, 4.6, 4);
        c.strokeStyle = A.c('#ffe27a');
        c.lineWidth = 0.6;
        c.setLineDash([0.9, 0.9]);
        c.strokeRect(-5.5, -9.5, 4.6, 4);
        c.setLineDash([]);
      },
    });
    // 帽身上的小星星與星點
    A.shape(ctx, (c) => starPath(c, 2, -11, 2.6, 1.1, 5, -PI / 2), '#ffe27a', null, { lw: 0.9, hl: false });
    dot(ctx, -4, -16.5, 0.8, '#fff4c0');
    dot(ctx, -9.5, -20.5, 0.7, '#fff4c0');
    // 金色帽帶＋寶石扣
    const band = (c) => { c.moveTo(-8.8, -1); c.quadraticCurveTo(0, -5.5, 8.8, -1); c.lineTo(8, -4.5); c.quadraticCurveTo(0, -9, -8, -4.5); c.closePath(); };
    rs(ctx, band, GOLDC[0], GOLDC[1], GOLDC[2], { cel: [0, 1.2], rim: 0.8, lw: 1.7 });
    rs(ctx, (c) => A.roundRect(c, 1.2, -7.2, 4.4, 4.4, 1), GOLDC[0], GOLDC[1], null, { cel: [0.6, 0.6], lw: 1.3 });
    rse(ctx, 3.4, -5, 1.3, 1.3, '#4ad8ff', '#1a78c8', null, { lw: 0.8, hl: [2.9, -5.5, 0.5, 0.4] });
    // 帽簷（下緣有影子）
    const brim = (c) => c.ellipse(0, 0.5, 14, 3.6, -0.06, 0, TAU);
    rs(ctx, brim, HAT[0], HAT[1], HAT[2], { cel: [0, -1.6], rim: 1, lw: 2.1 });
    // 帽尖的星光
    if (lit > 0.02) {
      glow(ctx, tipX, tipY, 14, '#ffe890', 0.9 * lit);
      sparkle(ctx, tipX, tipY, 3.8 + Math.sin(t * 9) * 0.8, '#fffbe0');
    }
    rse(ctx, tipX, tipY, 2.1, 2.1, lit > 0.02 ? '#fff6b0' : GOLDC[0], GOLDC[1], null, { lw: 1.3, hl: false });
    ctx.restore();
  }
  function umbrellagull(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const glide = !!fx.gliding;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const air = !!(m.hover > 1) || !m.onGround;
    const walk = walking(m) && !m.dead && !glide;
    const gait = t * 10;
    const WHITE = ['#fbf8f0', '#c8c2ba', '#ffffff'];
    const GREY = ['#b0b8c8', '#78809a', '#e4e8f2'];
    const DARKF = ['#3e4252', '#1e2030', '#8a90a8'];

    ctx.save();
    if (glide) {
      // 掛在斗篷傘下像鐘擺一樣晃
      ctx.translate(2, -80);
      ctx.rotate(Math.sin(t * 2.2) * 0.08);
      ctx.translate(-2, 80);
    } else if (ph === 'strike') {
      ctx.rotate(0.22);
    } else if (walk) {
      ctx.rotate(Math.sin(gait) * 0.05);
    }
    // 走路：身體在跨步中間最高（兩拍一次）；平常慢慢呼吸
    // （整隻抬高 5，露出腳）
    const bobW = walk ? -Math.abs(Math.sin(gait)) * 1.6 : air ? 0 : Math.sin(t * 2.4) * 0.5;
    const lift0 = -5 + bobW;
    ctx.translate(0, lift0);

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
      // 腳下的漂浮術法陣
      ctx.save();
      ctx.translate(2 + dangle, 4);
      ctx.scale(1, 0.28);
      ctx.globalAlpha *= 0.75;
      glow(ctx, 0, 0, 30, '#b8a0ff', 0.5);
      magicCircle(ctx, 20, t * 1.6, '#b88aff', '#f0e4ff', { lw: 1.1, runes: 6 });
      ctx.restore();
      // 斗篷兩側往下收到肩膀的布（內裡）
      rs(ctx, (c) => { c.moveTo(cx - W + 3, rimY + 1); c.quadraticCurveTo(-26, -56, -19, -44); c.lineTo(-13, -46); c.quadraticCurveTo(-18, -58, cx - W + 12, rimY + 3); c.closePath(); }, LINING[0], LINING[1], LINING[2], { cel: [1.5, 0], rim: 1, lw: 2 });
      rs(ctx, (c) => { c.moveTo(cx + W - 3, rimY + 1); c.quadraticCurveTo(22, -56, 9, -46); c.lineTo(3, -48); c.quadraticCurveTo(14, -60, cx + W - 12, rimY + 3); c.closePath(); }, LINING[0], LINING[1], LINING[2], { cel: [1.5, 0], rim: 1, lw: 2 });
      glow(ctx, cx, rimY - 8, 42, '#b8a0ff', 0.38);
      rs(ctx, can, CLOAK[0], CLOAK[1], CLOAK[2], {
        cel: [4, 3],
        rim: 1.8,
        tex: (c) => {
          c.fillStyle = lg(c, 0, rimY - 26, 0, rimY + 6, [[0, '#8a9aff', 0.3], [0.6, '#000000', 0], [1, '#0a0a30', 0.35]]);
          c.fillRect(cx - W - 4, rimY - 30, W * 2 + 8, 40);
          // 傘骨（布的摺痕）
          c.strokeStyle = A.c(CLOAK[1]);
          c.lineWidth = 1.2;
          c.beginPath();
          for (let i = 1; i < 7; i++) {
            const x1 = cx + W - (i / 7) * 2 * W;
            c.moveTo(cx + (x1 - cx) * 0.15, rimY - 22 - billow);
            c.quadraticCurveTo(cx + (x1 - cx) * 0.7, rimY - 16, x1, rimY + 1);
          }
          c.stroke();
          // 金邊
          c.strokeStyle = A.c(GOLDC[0]);
          c.lineWidth = 2.4;
          c.beginPath();
          for (let i = 0; i < 7; i++) {
            const x0 = cx + W - (i / 7) * 2 * W;
            const x1 = cx + W - ((i + 1) / 7) * 2 * W;
            if (!i) c.moveTo(x0, rimY - 2.5);
            c.quadraticCurveTo((x0 + x1) / 2, rimY + 3.5 + Math.sin(t * 4 + i) * 1.2, x1, rimY - 2.5);
          }
          c.stroke();
          // 星座刺繡（星點連線）
          const S = [[cx - 20, rimY - 7], [cx - 11, rimY - 12], [cx - 2, rimY - 9], [cx + 8, rimY - 14], [cx + 17, rimY - 8]];
          c.strokeStyle = A.c('#c8d0ff');
          c.lineWidth = 0.7;
          c.beginPath();
          S.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
          c.stroke();
        },
      });
      [[cx - 20, rimY - 7, 2.2], [cx - 11, rimY - 12, 1.6], [cx - 2, rimY - 9, 2.8], [cx + 8, rimY - 14, 1.8], [cx + 17, rimY - 8, 2.4]].forEach(([x, y, r], i) => {
        glow(ctx, x, y, r * 2.5, '#fff0a0', 0.4 + 0.3 * Math.sin(t * 4 + i));
        A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.42, 5, -PI / 2), '#ffe27a', null, { lw: 0.9, hl: false });
      });
      // 飄浮術的光點
      for (let i = 0; i < 4; i++) {
        const q = (t * 0.8 + i * 0.25) % 1;
        ctx.save();
        ctx.globalAlpha *= 1 - q;
        sparkle(ctx, cx - 24 + i * 16 + Math.sin(t * 3 + i) * 3, rimY + 4 + q * 30, 2.4, '#e8dcff');
        ctx.restore();
      }
    } else {
      // 披在背後的斗篷（走路時往後飄）：外面深藍、翻出紫色內裡
      const fl2 = walk ? Math.sin(t * 12) * 2 : Math.sin(t * 2.5) * 1;
      const up = air ? -4 : 0;
      const capeP = (c) => {
        c.moveTo(4, -34);
        c.quadraticCurveTo(-14, -34, -20 + fl2 * 0.3, -18 + up);
        c.quadraticCurveTo(-24 + fl2, -8 + up, -22 + fl2, -4 + up);
        c.lineTo(-17 + fl2, -7 + up);
        c.lineTo(-13 + fl2 * 0.8, -3 + up);
        c.lineTo(-9 + fl2 * 0.6, -8 + up * 0.5);
        c.quadraticCurveTo(-4, -20, 6, -26);
        c.closePath();
      };
      rs(ctx, capeP, CLOAK[0], CLOAK[1], CLOAK[2], {
        cel: [2.5, 2.5],
        rim: 1.4,
        tex: (c) => {
          c.fillStyle = A.c(LINING[0]);
          c.beginPath();
          c.moveTo(-22 + fl2, -4 + up);
          c.lineTo(-17 + fl2, -7 + up);
          c.lineTo(-13 + fl2 * 0.8, -3 + up);
          c.lineTo(-9 + fl2 * 0.6, -8 + up * 0.5);
          c.lineTo(-10 + fl2 * 0.6, -12 + up);
          c.lineTo(-21 + fl2, -9 + up);
          c.closePath();
          c.fill();
          c.strokeStyle = A.c(GOLDC[0]);
          c.lineWidth = 1.3;
          c.beginPath();
          c.moveTo(-22.5 + fl2, -6 + up);
          c.lineTo(-17 + fl2, -9 + up);
          c.lineTo(-13 + fl2 * 0.8, -5.5 + up);
          c.lineTo(-9.5 + fl2 * 0.6, -10 + up * 0.5);
          c.stroke();
          c.strokeStyle = A.c(CLOAK[1]);
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(-4, -30);
          c.quadraticCurveTo(-12, -24, -15 + fl2 * 0.6, -12 + up);
          c.stroke();
        },
      });
      A.shape(ctx, (c) => starPath(c, -15 + fl2 * 0.5, -19, 2.4, 1, 5, -PI / 2), '#ffe27a', null, { lw: 0.9, hl: false });
      dot(ctx, -10, -25, 0.8, '#fff4c0');
      dot(ctx, -18 + fl2 * 0.5, -13, 0.7, '#fff4c0');
    }

    // 腳：大腿藏在羽毛裡，露出的是往後彎的「腳跟」（跗蹠關節）→ 有鱗紋的跗蹠 → 三趾蹼足
    const LEGC = ['#ffab3a', '#d0701a', '#ffe0a0'];
    const LEGF = ['#e08a2a', '#a8520e', null];
    const birdLeg = (o, hx, bx, C, far) => {
      const p = gait + o;
      let fx2 = bx + (walk ? -Math.cos(p) * 5 : 0);
      let fy = -1.2 - (walk ? Math.max(0, Math.sin(p)) * 4.2 : 0);
      let curl = walk ? Math.max(0, Math.sin(p)) * 0.7 : 0;
      if (air || glide) {
        // 飛行時腳往後收、腳趾垂著
        fx2 = bx - 5 + dangle;
        fy = -4 + (glide ? 1 : 0);
        curl = 0.9;
      }
      const hy = -11;
      fy -= lift0;
      const k = kneeIK(hx, hy, fx2, fy - 1.2, 8.2, 7.4, -1);
      // 羽毛蓋住的大腿（白色「褲子」）
      rse(ctx, hx - 0.5, hy - 1, 4.2, 3.6, far ? WHITE[1] : WHITE[0], WHITE[1], null, { lw: 1.8, hl: false });
      seg(ctx, hx, hy + 1, k[0], k[1], 2.9, 2.2, C[0], C[1], C[2]);
      seg(ctx, k[0], k[1], fx2, fy - 1.2, 2.2, 1.9, C[0], C[1], C[2]);
      if (!far) {
        // 跗蹠的鱗紋
        ctx.strokeStyle = A.c(C[1]);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 1; i < 3; i++) {
          const px = k[0] + (fx2 - k[0]) * (i / 3);
          const py = k[1] + (fy - 1.2 - k[1]) * (i / 3);
          ctx.moveTo(px - 1.5, py);
          ctx.lineTo(px + 1.5, py + 0.4);
        }
        ctx.stroke();
      }
      dot(ctx, k[0], k[1], 1.2, C[1]);
      ctx.save();
      ctx.translate(fx2, fy - 0.4);
      ctx.rotate(curl);
      ctx.scale(1.2, 1.2);
      rs(ctx, (c) => {
        c.moveTo(-2.4, -0.6);
        c.quadraticCurveTo(0, -1.8, 6.2, -1.4);
        c.quadraticCurveTo(4.6, -0.2, 6, 0.6);
        c.quadraticCurveTo(4.4, 0.8, 5.4, 1.8);
        c.quadraticCurveTo(1.5, 1.8, -2.2, 1.4);
        c.closePath();
      }, C[0], C[1], C[2], { cel: [0, 0.9], rim: 0.7, lw: 1.6 });
      if (!far) line(ctx, [[0.5, 0], [4.4, -0.6]], C[1], 0.7);
      ctx.restore();
    };
    birdLeg(PI, -3, -4, LEGF, true);
    // 翅膀：覆羽（灰）→ 飛羽（深灰、白色翼斑）三層
    const shoulder = [-4, -27];
    // 翅膀＝巫師斗篷的兩片袖擺：外面深靛藍、金色滾邊、繡著星星；翻開時露出紫色的星紋內裡；
    // 下擺是一排尖尖的飛羽（斗篷底下露出來的羽毛）。拍翅／施法時斗篷往外鼓開。
    const wing = (ang, sc, far, open) => {
      ctx.save();
      ctx.translate(shoulder[0], shoulder[1]);
      ctx.rotate(ang);
      ctx.scale(sc, sc * (1 + open * 0.18));
      const wv = Math.sin(t * 5 + (far ? 1 : 0)) * (0.6 + open * 1.2);
      // 下擺露出的飛羽（在布的後面）
      const FE = far ? ['#9aa0b8', '#5a6078'] : ['#f4f4f8', '#a8acc0'];
      for (let i = 0; i < 5; i++) {
        const x = -25 + i * 5.4;
        const y = 4.2 + i * 0.3 + (i % 2 ? wv * 0.4 : 0);
        A.shape(ctx, (c) => { c.moveTo(x - 2.4, y - 3); c.quadraticCurveTo(x - 3.4, y + 3.5, x - 1.2, y + 6.4 + (4 - i) * 0.4); c.quadraticCurveTo(x + 1.8, y + 3, x + 2.2, y - 3); c.closePath(); }, FE[0], FE[1], { lw: 1.3, hl: false, shadeY: y + 3 });
      }
      const cloth = (c) => {
        c.moveTo(6, -4.5);
        c.quadraticCurveTo(-8, -10.5, -28, -6 + wv * 0.3);
        c.quadraticCurveTo(-27, -1, -27.5, 4 + wv);
        for (let i = 0; i < 5; i++) {
          const x0 = -27.5 + i * 6.4;
          c.quadraticCurveTo(x0 + 3.2, 1.5 + wv * (i % 2 ? 0.2 : 0.6), x0 + 6.4, 4.6 + i * 0.2 + (i % 2 ? wv * 0.5 : 0));
        }
        c.quadraticCurveTo(6, 4, 6, -4.5);
        c.closePath();
      };
      const lining = far || open > 0.45;
      const P = lining ? LINING : CLOAK;
      rs(ctx, cloth, P[0], P[1], far ? null : P[2], {
        cel: [0, 1.8], rim: 1.2, lw: 2.1,
        tex: (c) => {
          c.fillStyle = lg(c, 0, -9, 0, 6, [[0, '#ffffff', 0.12], [1, '#0a0830', 0.3]]);
          c.fillRect(-30, -12, 40, 20);
          // 布的摺痕（從肩往下擺放射）
          c.strokeStyle = A.c(P[1]);
          c.lineWidth = 0.9;
          c.beginPath();
          for (let i = 1; i < 4; i++) { c.moveTo(2 - i * 2, -5); c.quadraticCurveTo(-6 - i * 4, -2, -8 - i * 5.5, 4); }
          c.stroke();
          // 星星刺繡（內裡是金色的星紋、外面是零星的小星點）
          c.fillStyle = A.c(lining ? '#ffe27a' : '#c8d0ff');
          [[-8, -3], [-17, -1], [-23, -3.5], [-13, 2]].forEach(([x, y], i) => {
            c.beginPath();
            starPath(c, x, y, lining ? 2 : 1.2, lining ? 0.8 : 0.5, 5, -PI / 2 + i);
            c.fill();
          });
          // 金色滾邊（上緣）
          c.strokeStyle = A.c(GOLDC[0]);
          c.lineWidth = 1.6;
          c.beginPath();
          c.moveTo(6, -4.5);
          c.quadraticCurveTo(-8, -10.5, -28, -6 + wv * 0.3);
          c.stroke();
        },
      });
      // 下擺的金邊
      ctx.strokeStyle = A.c(far ? GOLDC[1] : GOLDC[0]);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-27.2, 3.2 + wv);
      for (let i = 0; i < 5; i++) {
        const x0 = -27.5 + i * 6.4;
        ctx.quadraticCurveTo(x0 + 3.2, 0.5 + wv * (i % 2 ? 0.2 : 0.6), x0 + 6.4, 3.6 + i * 0.2 + (i % 2 ? wv * 0.5 : 0));
      }
      ctx.stroke();
      ctx.restore();
    };
    // 遠側翅膀：漂浮時高舉抓著斗篷邊
    const cast = ph === 'wind' || ph === 'strike' ? 1 : 0;
    const openN = glide ? 1 : Math.max(cast, air ? 0.5 + flap * 0.5 : 0);
    if (glide) wing(PI * 0.45 + Math.sin(t * 2.2) * 0.05, 1.1, true, 1);
    else wing(-0.9 - flap * 0.8 + (ph === 'wind' ? -0.4 : 0), 0.9, true, openN);

    birdLeg(0, 3, 4, LEGC, false);
    ctx.save();
    // 尾羽（白底黑邊）：落後身體擺動
    ctx.translate(-12, -20);
    ctx.rotate((walk ? Math.sin(gait - 1.2) : air && !glide ? Math.sin(t * flapSpd - 1.2) : Math.sin(t * 1.8)) * 0.1);
    ctx.translate(12, 20);
    rs(ctx, (c) => { c.moveTo(-12, -24); c.lineTo(-25, -29); c.lineTo(-23, -24.5); c.lineTo(-26, -20.5); c.lineTo(-12, -15); c.closePath(); }, WHITE[0], WHITE[1], null, {
      cel: [0, 2],
      lw: 2.1,
      tex: (c) => {
        c.fillStyle = A.c(DARKF[0]);
        c.fillRect(-27, -32, 4.6, 14);
        c.strokeStyle = A.c(WHITE[1]);
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(-13, -21);
        c.lineTo(-23, -25);
        c.moveTo(-13, -18);
        c.lineTo(-23, -21.5);
        c.stroke();
      },
    });
    ctx.restore();
    ctx.save();

    // 身體＋頭：胸前一片片的小羽紋、背上灰色
    const bodyP = (c) => c.ellipse(-2, -20, 14.5, 11.5, 0, 0, TAU);
    rs(ctx, bodyP, WHITE[0], WHITE[1], WHITE[2], {
      cel: [3, 3],
      rim: 1.4,
      tex: (c) => {
        c.fillStyle = A.c(GREY[0]);
        c.beginPath();
        c.ellipse(-8, -27, 11, 6, -0.25, 0, TAU);
        c.fill();
        c.strokeStyle = A.c('#dcd6cc');
        c.lineWidth = 0.9;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const x = -6 + (i % 3) * 5 + (i > 2 ? 2.5 : 0);
          const y = -18 + (i > 2 ? 4 : 0);
          c.moveTo(x - 2, y);
          c.quadraticCurveTo(x, y + 2, x + 2, y);
        }
        c.stroke();
      },
    });
    // 頭：走路時像鴿子一樣一伸一縮，並抵消身體的上下（頭比身體穩）
    const hdx = walk ? Math.sin(gait * 2 - 1) * 1.3 : 0;
    const hdy = -bobW * 0.6;
    // 斗篷的兜帽：垂在後腦勺與肩上（深靛藍、紫色內裡翻邊、金色滾邊）
    ctx.save();
    ctx.translate(hdx * 0.5, hdy * 0.5);
    const hood = (c) => { c.moveTo(4, -43); c.bezierCurveTo(-6, -44, -10, -36, -8, -27); c.quadraticCurveTo(-3, -22, 6, -24); c.quadraticCurveTo(-1, -30, 4, -43); c.closePath(); };
    rs(ctx, hood, CLOAK[0], CLOAK[1], CLOAK[2], {
      cel: [1.5, 1.5], rim: 1.2, lw: 2.1,
      tex: (c) => {
        c.fillStyle = A.c(LINING[0]);
        c.beginPath();
        c.moveTo(4, -43);
        c.quadraticCurveTo(-1, -30, 6, -24);
        c.lineTo(3, -24);
        c.quadraticCurveTo(-4, -31, 1.5, -43);
        c.closePath();
        c.fill();
        c.strokeStyle = A.c(CLOAK[1]);
        c.lineWidth = 0.9;
        c.beginPath();
        c.moveTo(-3, -40);
        c.quadraticCurveTo(-7, -34, -5, -27);
        c.stroke();
      },
    });
    line(ctx, [[-8, -27.5], [-3, -23.2], [6, -24.2]], GOLDC[0], 1.4);
    ctx.restore();
    ctx.save();
    ctx.translate(hdx, hdy);
    rs(ctx, (c) => c.ellipse(8, -33, 10.5, 10, 0, 0, TAU), WHITE[0], WHITE[1], WHITE[2], {
      cel: [2.5, 2.5], rim: 1.3, hl: [3, -37.5, 2.6, 1.5],
      tex: (c) => {
        // 後腦勺淡灰的羽毛、臉頰的羽紋
        c.fillStyle = A.c('#e4e2de');
        c.beginPath();
        c.ellipse(1, -36, 6, 7, 0.3, 0, TAU);
        c.fill();
        c.strokeStyle = A.c('#dcd6cc');
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(0, -30);
        c.quadraticCurveTo(2, -28.5, 4, -29.5);
        c.moveTo(-1, -34);
        c.quadraticCurveTo(1, -32.5, 3, -33.5);
        c.stroke();
      },
    });
    ctx.restore();
    A.ellipse(ctx, 4, -25, 7, 5, WHITE[0], null, { noStroke: true, hl: false });
    // 斗篷的領口＋發光的寶石扣
    const collar = (c) => { c.moveTo(-3, -30); c.quadraticCurveTo(4, -23, 14, -26); c.lineTo(13, -22.5); c.quadraticCurveTo(4, -18.5, -4, -26); c.closePath(); };
    rs(ctx, collar, CLOAK[0], CLOAK[1], CLOAK[2], {
      cel: [0, 1.5],
      rim: 1,
      lw: 2,
      tex: (c) => {
        c.strokeStyle = A.c(GOLDC[0]);
        c.lineWidth = 0.9;
        c.beginPath();
        c.moveTo(-3.6, -26.8);
        c.quadraticCurveTo(4, -20, 13, -23.4);
        c.stroke();
      },
    });
    const gemOn = glide || ph === 'wind' ? 1 : 0.4 + 0.2 * Math.sin(t * 3);
    glow(ctx, 12, -24.5, 7, '#b88aff', gemOn * 0.8);
    rse(ctx, 12, -24.5, 2.9, 2.9, GOLDC[0], GOLDC[1], null, { lw: 1.4, hl: false });
    rse(ctx, 12, -24.5, 1.6, 1.6, '#c89aff', '#7a4ad8', null, { lw: 0.8, hl: [11.5, -25.1, 0.6, 0.45] });

    // 巫師帽
    const hatLit = glide ? 0.75 + Math.sin(t * 6) * 0.25 : ph === 'wind' ? 0.5 : 0;
    ctx.save();
    ctx.translate(hdx, hdy);
    wizardHat(ctx, 7, -41.5, t, hatLit, glide ? 1 : 0);

    // 臉：金黃色的鷗眼、兩色鳥喙（下喙的紅點）
    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || ph === 'strike')) kind = 'angry';
    eyes2(ctx, 6, -33.5, 8, 2.9, 3.8, kind, '#e8b020', '#fbf8f0');
    const beakU = (c) => { c.moveTo(15, -30.5); c.quadraticCurveTo(22, -32, 27.5, -28); c.quadraticCurveTo(26, -26.6, 24, -27.2); c.quadraticCurveTo(20, -27.6, 15, -27); c.closePath(); };
    const open = hurt || ph === 'strike';
    rs(ctx, (c) => { c.moveTo(15, -27); c.quadraticCurveTo(20, -26.5 + (open ? 2.5 : 0), 25, -26.8 + (open ? 2 : 0)); c.quadraticCurveTo(20, -23.5 + (open ? 2.5 : 0), 15, -24.6); c.closePath(); }, '#ffc02a', '#d88a10', null, { cel: [0, 1], lw: 1.8 });
    dot(ctx, 22.8, -25.8 + (open ? 2 : 0), 1.2, '#e8483a');
    rs(ctx, beakU, '#ffd84a', '#e0981a', '#fff4b0', { cel: [0, 1.4], rim: 0.9, lw: 1.9 });
    line(ctx, [[18, -29.6], [20, -29.9]], '#b8741a', 0.9);
    A.blush(ctx, 3, -28, 2.6);
    A.blush(ctx, 16.5, -32.5, 1.6);
    // 老巫師的羽毛長鬍子（白色、一撮撮，走路時跟著甩）
    const bw = walk ? Math.sin(gait - 1.4) * 1.5 : Math.sin(t * 2) * 0.6;
    const beard = (c) => {
      c.moveTo(12, -26.5);
      c.quadraticCurveTo(18, -27, 22, -25.5);
      c.quadraticCurveTo(21, -20, 19 + bw * 0.5, -16);
      c.lineTo(20 + bw, -11);
      c.lineTo(16.5 + bw * 0.7, -14);
      c.lineTo(15 + bw, -9.5);
      c.lineTo(13 + bw * 0.5, -14);
      c.quadraticCurveTo(10.5, -19, 12, -26.5);
      c.closePath();
    };
    ctx.save();
    ctx.translate(-2.5, 2);
    rs(ctx, beard, '#ffffff', '#c8c4d8', '#ffffff', {
      cel: [1.2, 1.4], rim: 0.8, lw: 1.7,
      tex: (c) => {
        c.strokeStyle = A.c('#d4d0e4');
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(15, -25);
        c.quadraticCurveTo(15, -18, 15.5 + bw, -11);
        c.moveTo(18.5, -25);
        c.quadraticCurveTo(18.5, -19, 19 + bw, -13);
        c.stroke();
      },
    });
    ctx.restore();
    // 眼周一圈金色的羽毛眼圈＋往後拖的一道眉紋（像老學者的眼鏡，是羽毛的花紋）
    if (kind !== 'x') {
      ctx.strokeStyle = A.c('#f0c040');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(6.2, -33.5, 4.7, -0.2, PI * 1.35);
      ctx.moveTo(18.5, -34.4);
      ctx.arc(14.2, -34, 4.3, -0.1, PI * 1.2);
      ctx.moveTo(1.6, -34.8);
      ctx.quadraticCurveTo(-1.5, -35, -3.5, -32.5);
      ctx.stroke();
    }
    ctx.restore();

    // 近側翅膀（走路時落後半拍輕輕拍）
    const wsw = walk ? Math.sin(gait - 0.8) * 0.08 : 0;
    if (glide) wing(PI * 0.27 + Math.sin(t * 2.2 + 1) * 0.05, 1.1, false, 1);
    else wing(-0.2 - flap * 0.7 + (ph === 'wind' ? -0.6 : 0) + wsw, 1, false, openN);
    ctx.restore();
    ctx.restore();
  }

  // ── 符文鸚鵡螺（id alarmurchin）：捲成螺旋、分成一格格氣室的條紋殼，氣室之間的隔板縫是發光的爆裂符文；
  //    殼口伸出一叢觸手、上面蓋著斑點肉帽（頭巾），一顆大眼睛。平常浮在地面上一點點、用漏斗噴水一抖一抖地前進。
  //    fx.ring（0→1 蓄力）：符文縫一格一格亮起、殼越震越厲害、觸手縮回殼裡；炸出尖刺的瞬間殼整個閃亮（m.alarmCd 剛設成 3）──
  const NAU = { shell: '#f6e8c8', shellS: '#caa878', shellL: '#fffaf0', stripe: '#b8562e', stripeS: '#7a3218', hood: '#b8683e', hoodS: '#723a1e', hoodL: '#f0a878', tent: '#f0b890', tentS: '#b87858', rune: '#ff8a3a', runeL: '#fff0c8', pearl: '#e8f0ff' };
  function alarmurchin(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const ring = m.dead ? 0 : clamp01(num(fx.ring, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m) && !m.dead;
    // 炸開後的一瞬間（能力程式把 alarmCd 設成 3）
    const flare = m.dead ? 0 : clamp01((num(m.alarmCd, 0) - 2.6) / 0.4);
    // 噴水：一收一放，收的時候往上一竄
    const jp = t * (walk ? 5 : 2.4);
    const jet = Math.max(0, Math.sin(jp));
    const hov = m.dead ? 0 : 7 + Math.sin(jp - 0.9) * 2.2;
    const shake = ring > 0 ? (0.6 + ring * 1.8) * Math.sin(t * 57) : 0;
    const tilt = (walk ? 0.08 : 0) + Math.sin(jp - 1.4) * 0.05 + (hurt ? Math.sin(t * 40) * 0.08 : 0) + (m.dead ? -0.2 : 0) + (ph === 'strike' ? 0.12 : 0);
    const cx = -3;
    const cy = -24;
    const R = 19;
    const nSeam = 7;
    const litN = ring > 0 ? Math.floor(ring * (nSeam + 1)) : 0;

    ctx.save();
    ctx.scale(1.14, 1.14);
    ctx.translate(shake, -hov - (m.dead ? 3 : 0));
    ctx.rotate(tilt);
    // 蓄力的紅光
    if (ring > 0 || flare > 0) glow(ctx, cx, cy, 30 + ring * 14 + flare * 16, NAU.rune, 0.25 + ring * 0.45 + flare * 0.5);

    // 觸手（殼口下方往前伸，一條條落後擺動；蓄力時縮回殼裡）
    const tk = (1 - ring * 0.8) * (m.dead ? 0.5 : 1) * (hurt ? 0.6 : 1);
    const ax = cx + 12;
    const ay = cy + 6;
    for (let i = 0; i < 7; i++) {
      const far = i % 2 === 0;
      const base = [ax - 1 + i * 0.6, ay + 1 + i * 0.7];
      const L = (10 + (i % 3) * 3.5) * tk + 1.5;
      const a0 = -0.35 + i * 0.14 - jet * 0.3;
      const pts = [];
      for (let k = 0; k <= 4; k++) {
        const q = k / 4;
        const a = a0 + Math.sin(t * 3.2 - q * 2.6 + i) * 0.35 * q;
        pts.push([base[0] + Math.cos(a) * L * q, base[1] + Math.sin(a) * L * q]);
      }
      limb(ctx, (c) => pts.forEach((p, k) => (k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))), far ? 3.6 : 4.2, far ? NAU.tentS : NAU.tent);
      dot(ctx, pts[4][0], pts[4][1], far ? 0.8 : 1, far ? '#8a5038' : '#fff0e0');
    }
    // 漏斗（噴水管）＋噴出的水泡
    seg(ctx, ax - 3, ay + 3, ax - 7, ay + 8, 2.6, 2.1, NAU.tent, NAU.tentS, null);
    for (let i = 0; i < 3; i++) {
      const q = (t * (walk ? 1.6 : 0.9) + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha *= (1 - q) * 0.8;
      ctx.strokeStyle = A.c('#cfefff');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ax - 8 - q * 10, ay + 9 + q * 4 + Math.sin(q * 6 + i) * 1.5, 1 + q * 1.6, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // 殼：對數螺旋的外形（殼口在右下往外張），奶油底＋虎斑條紋，中間露出一圈圈捲進去的臍孔
    ctx.save();
    ctx.translate(cx, cy);
    const fl = 1 + flare * 0.08;
    ctx.scale(fl, fl);
    const shell = (c) => {
      c.moveTo(R * 0.55, R * 0.62);
      c.bezierCurveTo(R * 0.15, R * 1.08, -R * 0.95, R * 0.95, -R * 1.0, 0);
      c.bezierCurveTo(-R * 1.02, -R * 0.95, R * 0.2, -R * 1.18, R * 0.8, -R * 0.6);
      c.quadraticCurveTo(R * 1.15, -R * 0.25, R * 1.02, R * 0.12);
      c.quadraticCurveTo(R * 0.85, R * 0.45, R * 0.55, R * 0.62);
      c.closePath();
    };
    rs(ctx, shell, NAU.shell, NAU.shellS, NAU.shellL, {
      cel: [3, 3],
      rim: 1.8,
      sheen: [-6, -9, 10, 0.35],
      tex: (c) => {
        // 虎斑：從臍孔往外、沿著螺旋彎的火焰狀條紋（只在殼的上半與後半）
        c.fillStyle = A.c(NAU.stripe);
        for (let i = 0; i < 8; i++) {
          const a = -PI * 0.1 - i * 0.36;
          const w = 0.14;
          c.beginPath();
          c.moveTo(Math.cos(a - w) * R * 0.45, Math.sin(a - w) * R * 0.45);
          c.quadraticCurveTo(Math.cos(a - 0.3) * R * 0.8, Math.sin(a - 0.3) * R * 0.8, Math.cos(a - 0.2) * R * 1.1, Math.sin(a - 0.2) * R * 1.1);
          c.lineTo(Math.cos(a + 0.05) * R * 1.1, Math.sin(a + 0.05) * R * 1.1);
          c.quadraticCurveTo(Math.cos(a - 0.15) * R * 0.8, Math.sin(a - 0.15) * R * 0.8, Math.cos(a + w) * R * 0.45, Math.sin(a + w) * R * 0.45);
          c.closePath();
          c.fill();
        }
        c.fillStyle = lg(c, 0, -R, 0, R, [[0, '#ffffff', 0.25], [0.5, '#ffffff', 0], [1, '#5a3010', 0.3]]);
        c.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
        // 氣室的隔板縫＝符文縫（從臍孔往外的弧線），依序亮起
        for (let i = 0; i < nSeam; i++) {
          const a = PI * 0.35 - (i / nSeam) * TAU * 0.92;
          const on = i < litN || flare > 0;
          const p0 = [Math.cos(a) * R * 0.38, Math.sin(a) * R * 0.38];
          const pc = [Math.cos(a + 0.35) * R * 0.75, Math.sin(a + 0.35) * R * 0.75];
          const p1 = [Math.cos(a + 0.2) * R * 1.1, Math.sin(a + 0.2) * R * 1.1];
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(p0[0], p0[1]);
          c.quadraticCurveTo(pc[0], pc[1], p1[0], p1[1]);
          if (on) {
            c.strokeStyle = A.c(NAU.rune);
            c.lineWidth = 3.4;
            c.stroke();
            c.strokeStyle = A.c(NAU.runeL);
            c.lineWidth = 1.3;
            c.stroke();
          } else {
            c.strokeStyle = A.c(NAU.stripeS);
            c.lineWidth = 1.4;
            c.stroke();
            c.save();
            c.globalAlpha *= 0.35 + 0.25 * Math.sin(t * 2 + i);
            c.strokeStyle = A.c(NAU.rune);
            c.lineWidth = 0.8;
            c.stroke();
            c.restore();
          }
          // 縫上的小符文
          const pm = [Math.cos(a + 0.3) * R * 0.74, Math.sin(a + 0.3) * R * 0.74];
          runeGlyph(c, pm[0] + 1.6, pm[1], 1.4, i * 3 + 1, on ? NAU.runeL : '#9a5a2a', 0.8);
        }
        if (flare > 0) {
          c.fillStyle = 'rgba(255,245,220,' + (flare * 0.55).toFixed(3) + ')';
          c.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
        }
      },
    });
    // 臍孔：一圈圈往內捲的螺旋
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let a = 0; a < TAU * 1.6; a += 0.25) {
      const rr = R * 0.36 - a * 0.55;
      if (rr < 0.6) break;
      const px = Math.cos(-a + 0.6) * rr - 1;
      const py = Math.sin(-a + 0.6) * rr;
      a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.stroke();
    A.ellipse(ctx, -1, 0, 2.4, 2.4, ring > 0.5 || flare > 0 ? '#ffd08a' : '#e8d4b0', null, { lw: 1.4, hl: false });
    ctx.restore();

    // 頭巾（殼口上方蓋住頭的斑點肉帽）
    const hx = cx + R * 0.72;
    const hy = cy - R * 0.2;
    const hood = (c) => {
      c.moveTo(hx - 7, hy - 6);
      c.quadraticCurveTo(hx + 3, hy - 11, hx + 11, hy - 4);
      c.quadraticCurveTo(hx + 13, hy + 1, hx + 9, hy + 3);
      c.quadraticCurveTo(hx + 1, hy + 1, hx - 6, hy + 2);
      c.closePath();
    };
    // 頭（肉）
    rse(ctx, hx + 3, hy + 5, 8, 6.5, NAU.tent, NAU.tentS, '#ffe8d8', { lw: 2.1, hl: false });
    rs(ctx, hood, NAU.hood, NAU.hoodS, NAU.hoodL, {
      cel: [1.2, 1.6], rim: 1.2, lw: 2.1,
      tex: (c) => speckle(c, hx + 2, hy - 3, 16, 7, 7, 1.1, '#f6e0c8', 91, 0.9),
    });
    // 大眼睛（針孔般的深色大瞳孔、金色虹膜）
    let kind = eyeKind(m);
    if (kind === 'normal' && (ring > 0.3 || ph === 'wind' || ph === 'strike')) kind = 'angry';
    eye2(ctx, hx + 4, hy + 4.5, 3.8, 4.4, kind, ring > 0.3 ? '#ff6a3a' : '#e8a62a', NAU.hood, 0.6);
    A.blush(ctx, hx + 8.5, hy + 8.5, 1.8);
    ctx.restore();

    // 蓄力滿的火花
    if (ring > 0.6) {
      ctx.save();
      ctx.globalAlpha *= (ring - 0.6) / 0.4;
      for (let i = 0; i < 6; i++) {
        const a = t * 5 + (i / 6) * TAU;
        const r = 30 + Math.sin(t * 20 + i) * 3;
        sparkle(ctx, cx + Math.cos(a) * r, cy - hov + Math.sin(a) * r * 0.9, 2.6, '#ffd2a0');
      }
      ctx.restore();
    }
    // 炸開的閃光環
    if (flare > 0) {
      ctx.save();
      ctx.strokeStyle = A.c('#fff0c8');
      ctx.globalAlpha *= flare;
      ctx.lineWidth = 3 * flare;
      ctx.beginPath();
      ctx.arc(cx, cy - hov, 22 + (1 - flare) * 26, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── 槍騎魟魚：魟魚戴騎士頭盔，吻端長出一支螺旋紋的長槍角，尾巴末端長成燕尾旗狀的尾鰭 ──
  function kiteray(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const dive = !!fx.dive;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const bob = dive ? 0 : Math.sin(t * 2.2) * 2.5;
    const fr = t * (dive ? 10 : 4.2);
    const flap = Math.sin(fr);
    // 兩片胸鰭不同步：近側（下）落後遠側（上）一點，翅尖同時前後擺（波從前往後傳）
    const flapN = Math.sin(fr - 0.7);
    const sweep = Math.cos(fr) * 2.2;
    const SKIN = ['#4a92d8', '#1e4e92', '#a8dcff'];
    const STEEL = ['#e4e9f2', '#7e8aa2', '#ffffff'];
    const RED = ['#e0403a', '#8e1e22', '#ff9a90'];

    ctx.save();
    ctx.translate(0, -24 - bob);
    ctx.scale(1.1, 1.1);
    let ang = -0.08 + Math.sin(t * 1.7) * 0.05;
    if (dive) ang = 0.5;
    else if (ph === 'wind') ang = -0.3;
    else if (ph === 'strike') ang = 0.3;
    if (hurt) ang += Math.sin(t * 40) * 0.08;
    ctx.rotate(ang);

    // 尾巴 → 燕尾旗（旗面有金邊與紋章）
    const T = [-28, 0];
    const amp = dive ? 1.5 : 4;
    const tail = [];
    for (let i = 0; i <= 5; i++) tail.push([T[0] - i * 4, T[1] + Math.sin(t * 5 - i * 0.9) * amp * (i / 5)]);
    limb(ctx, (c) => tail.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))), 3.8, SKIN[1]);
    const fp = tail[5];
    const flagWave = (k) => Math.sin(t * (dive ? 14 : 7) - k * 3) * (dive ? 1.5 : 3.5) * k;
    const flag = (c) => {
      c.moveTo(fp[0], fp[1] - 6.5);
      for (let k = 1; k <= 4; k++) c.lineTo(fp[0] - k * 6, fp[1] - 6.5 + k * 0.6 + flagWave(k / 4));
      c.lineTo(fp[0] - 22, fp[1] + flagWave(0.9));
      for (let k = 4; k >= 1; k--) c.lineTo(fp[0] - k * 6, fp[1] + 6.5 - k * 0.6 + flagWave(k / 4));
      c.lineTo(fp[0], fp[1] + 6.5);
      c.closePath();
    };
    rs(ctx, flag, RED[0], RED[1], RED[2], {
      cel: [0, 2.4],
      rim: 1.1,
      lw: 2.1,
      tex: (c) => {
        // 布的起伏（波峰亮、波谷暗）
        for (let k = 0; k < 4; k++) {
          const x = fp[0] - 3 - k * 6;
          const w = flagWave((k + 0.5) / 4);
          c.fillStyle = w > 0 ? 'rgba(255,255,255,0.14)' : 'rgba(60,0,10,0.18)';
          c.fillRect(x - 3, fp[1] - 10, 3, 20);
        }
        c.fillStyle = A.c('#fff4e0');
        c.fillRect(fp[0] - 30, fp[1] - 1.3 + flagWave(0.5) * 0.5, 32, 2.6);
        c.strokeStyle = A.c(GOLDC[0]);
        c.lineWidth = 1;
        c.beginPath();
        flag(c);
        c.stroke();
      },
    });
    rs(ctx, (c) => { c.moveTo(fp[0] - 6, fp[1] - 5 + flagWave(0.25)); c.lineTo(fp[0] - 2.5, fp[1] - 3.5 + flagWave(0.25)); c.lineTo(fp[0] - 3, fp[1] + 1 + flagWave(0.25)); c.lineTo(fp[0] - 6, fp[1] + 3.5 + flagWave(0.25)); c.lineTo(fp[0] - 9, fp[1] + 1 + flagWave(0.25)); c.lineTo(fp[0] - 9.5, fp[1] - 3.5 + flagWave(0.25)); c.closePath(); }, '#3a6ad0', '#1a3a90', null, { cel: [0.6, 0.8], lw: 1.2 });
    A.shape(ctx, (c) => starPath(c, fp[0] - 6.2, fp[1] - 0.8 + flagWave(0.25), 2, 0.9, 4, 0), GOLDC[0], null, { lw: 0.7, hl: false });

    // 菱形身體（翅尖會上下拍）：背上的漸層、斑點、翅膀邊緣露出淺色的腹面
    const N = [32, 0];
    const cx = 4;
    const W1 = [cx - sweep, -21 + flap * 4.5];
    const W2 = [cx - sweep * 0.8, 21 + flapN * 3];
    // 腹鰭（尾巴根部兩片小圓鰭，在身體後面）
    [-1, 1].forEach((sg) => {
      rs(ctx, (c) => { c.moveTo(-18, sg * 3); c.quadraticCurveTo(-24, sg * 11 + flap, -30, sg * 6 + flap * 0.5); c.quadraticCurveTo(-26, sg * 2, -22, 0); c.closePath(); }, sg < 0 ? '#3a78c0' : SKIN[0], SKIN[1], null, { cel: [0, 1.4], lw: 1.8 });
    });
    const body = (c) => {
      c.moveTo(N[0], N[1]);
      c.bezierCurveTo(26, -6 + flap, 16, -14 + flap * 2.5, W1[0], W1[1]);
      c.bezierCurveTo(-4, -15 + flap * 3.5, -14, -8 + flap * 2, T[0], T[1]);
      c.bezierCurveTo(-14, 8 + flapN * 2, -4, 15 + flapN * 2.5, W2[0], W2[1]);
      c.bezierCurveTo(16, 14 + flapN * 2, 26, 6 + flapN, N[0], N[1]);
      c.closePath();
    };
    rs(ctx, body, SKIN[0], SKIN[1], SKIN[2], {
      cel: [2.5, 4],
      rim: 1.8,
      tex: (c) => {
        // 靠翅尖的淺色腹面
        c.fillStyle = A.c('#d8f0ff');
        c.beginPath();
        c.moveTo(W2[0] + 12, W2[1] - 6);
        c.quadraticCurveTo(W2[0] + 2, W2[1] - 2, W2[0] - 10, W2[1] - 6);
        c.lineTo(W2[0] - 10, W2[1] + 6);
        c.lineTo(W2[0] + 14, W2[1] + 6);
        c.closePath();
        c.fill();
        c.fillStyle = lg(c, 0, -20, 0, 20, [[0, '#9ad8ff', 0.35], [0.5, '#2a6ab8', 0], [1, '#0a2050', 0.2]]);
        c.fillRect(-30, -24, 64, 48);
        // 背中線的脊
        c.strokeStyle = A.c('#2a5aa8');
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(24, 0);
        c.quadraticCurveTo(0, 1.5 + flap, -26, 0);
        c.stroke();
        // 翅膀上的放射鰭條
        c.strokeStyle = A.c('#3a78c8');
        c.lineWidth = 0.9;
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          c.moveTo(8 - i * 6, -2);
          c.quadraticCurveTo(6 - i * 5, -10 + flap, 3 - i * 3, -16 + flap * 2.5 + i * 1.5);
        }
        c.stroke();
        // 翅膀前緣的淺色鑲邊（跟著拍動起伏）
        c.strokeStyle = A.c('#c8ecff');
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(N[0] - 3, -1.5);
        c.bezierCurveTo(24, -7 + flap, 15, -13 + flap * 2.5, W1[0] + 1, W1[1] + 2.2);
        c.stroke();
        // 背中線上一排小棘（鯊魟的皮齒）
        c.fillStyle = A.c('#cfeaff');
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const x = 16 - i * 7;
          c.moveTo(x + 1.2, 0.4);
          c.arc(x, 0.4 + flap * 0.3, 1.2, 0, TAU);
        }
        c.fill();
        // 斑點（淺色、有深色邊）
        [[-10, -4], [-3, 7], [-16, 4], [-4, -9], [-8, 11], [9, 7], [-15, -5], [3, 13], [-20, 1]].forEach(([x, y], i) => {
          const yy = y + (y < 0 ? flap : flapN) * (0.8 + Math.abs(y) * 0.12);
          c.fillStyle = A.c('#1e5aa0');
          c.beginPath();
          c.arc(x + 0.3, yy + 0.3, 2.1, 0, TAU);
          c.fill();
          c.fillStyle = A.c('#b8e4ff');
          c.beginPath();
          c.arc(x, yy, 1.5, 0, TAU);
          c.fill();
        });
      },
    });

    // 背上天生的紋章斑紋（紅白格、燕尾狀的邊、中間一顆星斑）：騎士的紋章長在皮膚上，跟著翅膀起伏
    const fU = flap * 1.6;
    const fD = flapN * 1.6;
    const cap = (c) => {
      c.moveTo(4, -11 + fU * 0.6);
      c.quadraticCurveTo(-6, -13 + fU, -17, -9 + fU * 0.8);
      c.lineTo(-20, -4 + fU * 0.5);
      c.lineTo(-16, -1);
      c.lineTo(-20, 3 + fD * 0.5);
      c.lineTo(-17, 9 + fD * 0.8);
      c.quadraticCurveTo(-6, 13 + fD, 4, 11 + fD * 0.6);
      c.lineTo(1, 6 + fD * 0.4);
      c.lineTo(5, 0);
      c.lineTo(1, -6 + fU * 0.4);
      c.closePath();
    };
    ctx.save();
    ctx.translate(-3, 0);
    ctx.scale(0.72, 0.8);
    ctx.globalAlpha *= 0.9;
    rs(ctx, cap, '#f4ece0', '#c8b8a8', null, {
      cel: [1, 2], noStroke: true,
      tex: (c) => {
        // 紅色的格紋
        c.fillStyle = A.c(RED[0]);
        for (let gx = 0; gx < 5; gx++) for (let gy = 0; gy < 6; gy++) {
          if ((gx + gy) % 2) continue;
          c.fillRect(-21 + gx * 5, -13 + gy * 4.5 + (gy < 3 ? fU * 0.5 : fD * 0.5), 5, 4.5);
        }
        c.fillStyle = 'rgba(60,10,20,0.22)';
        c.fillRect(-22, 3, 28, 14);
      },
    });
    ctx.globalAlpha /= 0.9;
    // 中央的紋章盾（藍底金星）
    rs(ctx, (c) => { c.moveTo(-12, -4.5); c.lineTo(-4, -4.5); c.lineTo(-4, 1); c.quadraticCurveTo(-5, 5, -8, 6.5); c.quadraticCurveTo(-11, 5, -12, 1); c.closePath(); }, '#3a6ad0', '#1a3a90', null, { cel: [0.8, 1], noStroke: true });
    A.shape(ctx, (c) => starPath(c, -8, 0.4, 2.8, 1.2, 5, -PI / 2), GOLDC[0], null, { lw: 0.8, hl: false });
    ctx.restore();
    // 騎士長槍：藍白螺旋槍身、鋼製護手錐、槍尖綁著小三角旗
    const thrust = dive ? 6 : ph === 'strike' ? 5 : ph === 'wind' ? -3 : 0;
    ctx.save();
    ctx.translate(thrust, 3);
    if (dive || ph === 'strike') {
      glow(ctx, 62, 0, 14, '#ffffff', 0.7);
      glow(ctx, 50, 0, 22, '#bff0ff', 0.35);
    }
    const lance = (c) => { c.moveTo(27, -4.2); c.lineTo(64, -0.5); c.quadraticCurveTo(66, 0, 64, 0.5); c.lineTo(27, 4.2); c.closePath(); };
    rs(ctx, lance, '#f6f2e8', '#b8ae98', '#ffffff', {
      cel: [0, 1.6],
      rim: 0.8,
      lw: 2.1,
      tex: (c) => {
        c.fillStyle = A.c('#3a6ad0');
        for (let i = 0; i < 4; i++) {
          const x = 31 + i * 8;
          c.beginPath();
          c.moveTo(x, -6);
          c.lineTo(x + 4, -6);
          c.lineTo(x + 7, 6);
          c.lineTo(x + 3, 6);
          c.closePath();
          c.fill();
        }
        c.fillStyle = 'rgba(0,0,30,0.22)';
        c.fillRect(27, 1.2, 40, 4);
      },
    });
    rs(ctx, (c) => { c.moveTo(56, -0.8); c.lineTo(67, 0); c.lineTo(56, 0.8); c.closePath(); }, STEEL[0], STEEL[1], null, { cel: [0, 0.5], lw: 1.4 });
    // 護手錐（vamplate）
    const vamp = (c) => { c.moveTo(33, -3.4); c.lineTo(27, -9); c.quadraticCurveTo(24.5, 0, 27, 9); c.lineTo(33, 3.4); c.closePath(); };
    // 角根：吻端鼓起的一圈肉（角從這裡長出來）
    rs(ctx, vamp, SKIN[0], SKIN[1], SKIN[2], {
      cel: [0, 2.4],
      rim: 1,
      lw: 2,
      tex: (c) => {
        c.strokeStyle = A.c('#a8dcff');
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(27.4, -8.4);
        c.quadraticCurveTo(25, 0, 27.4, 8.4);
        c.stroke();
      },
    });
    ctx.restore();
    // 頭鰭（兩片小捲角夾住槍）
    [-1, 1].forEach((s) => {
      rs(ctx, (c) => {
        c.moveTo(24, s * 3 + 1);
        c.quadraticCurveTo(31, s * 5 + 3, 32 + thrust * 0.4, s * 4 + 3);
        c.quadraticCurveTo(30, s * 8 + 2, 23, s * 7 + 1);
        c.closePath();
      }, SKIN[0], SKIN[1], SKIN[2], { cel: [0, 1.2], rim: 0.8, lw: 1.7 });
    });

    // 騎士頭盔（蓋在額頭上，頂上一撮紅羽飾）
    ctx.save();
    ctx.translate(-5, 0.5);
    const plumeW = Math.sin(t * 6) * 1.5 + (dive ? 3 : 0);
    const plume = (c) => {
      c.moveTo(14, -14);
      c.bezierCurveTo(8, -24, -4, -22 - plumeW, -11, -17 + plumeW * 0.5);
      c.quadraticCurveTo(-3, -19, 3, -16);
      c.quadraticCurveTo(-6, -15, -9, -10 + plumeW * 0.3);
      c.quadraticCurveTo(0, -12, 5, -12.5);
      c.quadraticCurveTo(0, -9, -3, -6 + plumeW * 0.2);
      c.quadraticCurveTo(6, -8, 12, -11);
      c.closePath();
    };
    rs(ctx, plume, RED[0], RED[1], RED[2], {
      cel: [0, 1.8],
      rim: 1,
      lw: 1.9,
      tex: (c) => {
        c.strokeStyle = A.c('#b82a2a');
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(12, -14);
        c.quadraticCurveTo(4, -18, -6, -17);
        c.moveTo(11, -12.5);
        c.quadraticCurveTo(2, -14, -5, -12);
        c.stroke();
      },
    });
    const helm = (c) => {
      c.moveTo(6, -5);
      c.bezierCurveTo(6, -16, 22, -18, 29, -6);
      c.quadraticCurveTo(29.5, -3.5, 27, -3.5);
      c.lineTo(8, -3.5);
      c.quadraticCurveTo(5.5, -3.5, 6, -5);
      c.closePath();
    };
    rs(ctx, helm, STEEL[0], STEEL[1], STEEL[2], {
      cel: [1.5, 2.4],
      rim: 1.3,
      sheen: [13, -12, 6, 0.6],
      tex: (c) => {
        // 金色冠脊
        c.fillStyle = A.c(GOLDC[0]);
        c.beginPath();
        c.moveTo(9, -10.5);
        c.quadraticCurveTo(17, -18, 26, -10);
        c.lineTo(25, -8.6);
        c.quadraticCurveTo(17, -15.6, 10, -9);
        c.closePath();
        c.fill();
        // 面罩的透氣孔
        c.fillStyle = A.c('#3a4258');
        [18, 21, 24].forEach((x) => c.fillRect(x, -7.4, 1.4, 2.6));
      },
    });
    line(ctx, [[8, -5.4], [27.5, -5.4]], '#5a6480', 1.2);
    [9.5, 26.5].forEach((x) => { dot(ctx, x, -5.4, 1.1, '#5a6480'); dot(ctx, x - 0.3, -5.8, 0.4, '#ffffff'); });
    rse(ctx, 17, -15.6, 2.2, 2.2, GOLDC[0], GOLDC[1], null, { lw: 1.2, hl: false });
    dot(ctx, 17, -15.6, 1, '#3a8ae8');

    // 臉（頭盔下）
    let kind = eyeKind(m);
    if (kind === 'normal' && (dive || ph === 'strike' || ph === 'wind')) kind = 'angry';
    eyes2(ctx, 12, 1, 9.5, 2.8, 3.5, kind, '#2ab8a8', SKIN[0]);
    mouth2(ctx, 17.5, 7.5, hurt ? 'open' : dive ? 'o' : ph === 'wind' ? 'grit' : 'smile', 0.65);
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

  // 兩節腿的膝蓋位置（簡單 IK）：腳在髖下方時 bend = 1 膝蓋朝前（+x）、-1 朝後
  function kneeIK(hx, hy, fx, fy, L1, L2, bend) {
    const dx = fx - hx;
    const dy = fy - hy;
    const d = Math.min(L1 + L2 - 0.01, Math.max(0.01, Math.hypot(dx, dy)));
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const ux = dx / d;
    const uy = dy / d;
    return [hx + ux * a + bend * uy * h, hy + uy * a - bend * ux * h];
  }
  // ── 珊瑚晶獸（id blockcoral）：圓滾滾的粉紅珊瑚小獸，頭和背上長出圓頭珊瑚枝，枝間夾著幾根魔法水晶；
  //    半透明的珊瑚身體裡看得到一顆發光的晶核，晶核上有細細的裂紋（被打倒時會「喀啦」裂成兩隻小的）。四隻短腳。──
  const CRL = { body: '#ff8fae', bodyS: '#d8587e', bodyL: '#ffd6e2', belly: '#ffe4ea', branch: '#ff9ab8', branchS: '#c8467a', branchL: '#ffe0ea', core: '#5af0e0', coreS: '#1aa8b0', coreL: '#e8fffc', leg: '#f27a9c', legF: '#c85a7e' };
  // 圓頭珊瑚枝：主幹＋一根分叉，每個枝頭是一顆圓圓的小球
  function coralKnob(ctx, x, y, ang, len, t, seed, far) {
    const sw = Math.sin(t * 2.2 + seed) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + sw);
    const fk = len * 0.55;
    const fa = seed % 2 ? 0.7 : -0.7;
    const tips = [[0, -len], [Math.sin(fa) * fk * 0.8, -len * 0.45 - Math.cos(fa) * fk * 0.8]];
    const br = (c) => { c.moveTo(0, 0); c.lineTo(0, -len); c.moveTo(0, -len * 0.45); c.lineTo(tips[1][0], tips[1][1]); };
    limb(ctx, br, far ? 5.4 : 6.4, far ? CRL.branchS : CRL.branch);
    if (!far) {
      ctx.save();
      ctx.translate(-0.8, -0.2);
      ctx.beginPath();
      br(ctx);
      ctx.strokeStyle = A.c(CRL.branchL);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
    tips.forEach(([px, py], i) => rse(ctx, px, py, i ? 2.6 : 3.2, i ? 2.6 : 3.2, far ? CRL.branchS : CRL.branch, far ? '#9a2e5a' : CRL.branchS, far ? null : CRL.branchL, { lw: 1.8, hl: far ? false : undefined, rim: 0.8 }));
    ctx.restore();
  }
  // 魔法水晶：六角柱＋尖頂，左亮右暗
  function crystalShard(ctx, x, y, h, w, ang, t, seed, lit) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    glow(ctx, 0, -h * 0.6, h * 0.9, CRL.core, 0.35 + lit * 0.4);
    const pts = [[-w, 0], [-w, -h * 0.7], [0, -h], [w, -h * 0.7], [w, 0]];
    A.shape(ctx, (c) => poly(c, pts), U.mix('#7af4ec', '#e8ffff', lit * 0.5), null, { lw: 1.7, hl: false });
    ctx.fillStyle = A.c('#d8fffa');
    ctx.beginPath();
    poly(ctx, [[-w + 0.7, -0.5], [-w + 0.7, -h * 0.68], [0, -h + 1], [-w * 0.1, -h * 0.5], [-w * 0.2, -0.5]]);
    ctx.fill();
    ctx.fillStyle = A.c(CRL.coreS);
    ctx.beginPath();
    poly(ctx, [[w * 0.35, -0.5], [w * 0.35, -h * 0.55], [w - 0.6, -h * 0.68], [w - 0.6, -0.5]]);
    ctx.fill();
    ctx.beginPath();
    poly(ctx, pts);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.7;
    ctx.lineJoin = 'round';
    ctx.stroke();
    const tw = Math.max(0, Math.sin(t * 2.3 + seed * 1.7));
    if (tw > 0.85) sparkle(ctx, -w * 0.3, -h * 0.75, 1.5 + (tw - 0.85) * 18, '#ffffff');
    ctx.restore();
  }
  function blockcoral(ctx, m) {
    const t = m.t || 0;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const dead = !!m.dead;
    const walk = walking(m) && !dead;
    const gait = t * 8;
    const bob = walk ? Math.abs(Math.sin(gait)) * 1.8 : Math.sin(t * 2.4) * 0.7;
    const charge = ph === 'wind' ? 1 : 0;
    const beat = 0.5 + 0.5 * Math.sin(t * 3.2);
    let lean = walk ? Math.sin(gait) * 0.03 : 0;
    let push = 0;
    if (ph === 'wind') { lean = -0.12; push = -2; }
    else if (ph === 'strike') { lean = 0.14; push = 4; }
    if (hurt) lean += Math.sin(t * 45) * 0.05;
    if (dead) lean = 0.25;
    const cx = 0;
    const cy = -27;

    // 腳：四隻短短圓圓的腳，斜對角一起抬（遠側顏色深、小一點）
    const leg = (x, o, far) => {
      const p = gait + o;
      const lift = walk ? Math.max(0, Math.sin(p)) * 3 : 0;
      const fx2 = x + (walk ? -Math.cos(p) * 2.5 : 0) + push * 0.3;
      const w = far ? 5.2 : 6.2;
      seg(ctx, x, cy + 11 - bob, fx2, -3.2 - lift, w, w * 0.92, far ? CRL.legF : CRL.leg, far ? '#8a2e52' : CRL.bodyS, far ? null : CRL.bodyL);
      rse(ctx, fx2 + 1, -2.2 - lift, w * 1.1, 2.4, far ? CRL.legF : CRL.belly, far ? '#8a2e52' : '#e8a8b8', null, { lw: 1.8, hl: false });
      if (!far) {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fx2 + 1.5, -3.6 - lift);
        ctx.lineTo(fx2 + 1.5, -1.2 - lift);
        ctx.moveTo(fx2 + 4, -3.4 - lift);
        ctx.lineTo(fx2 + 4, -1.4 - lift);
        ctx.stroke();
      }
    };
    leg(-6, PI, true);
    leg(14, 0, true);
    leg(-12, 0, false);
    leg(9, PI, false);

    ctx.save();
    ctx.translate(push, -bob);
    ctx.translate(cx, cy + 10);
    ctx.rotate(lean);
    ctx.translate(-cx, -cy - 10);

    // 背後（遠側）的珊瑚枝與水晶
    coralKnob(ctx, -16, cy - 9, -0.95, 11, t, 3, true);
    crystalShard(ctx, -8, cy - 14, 13, 3, -0.35, t, 1, charge);
    coralKnob(ctx, 5, cy - 15, 0.35, 12, t, 6, true);

    // 身體：半透明的珊瑚，看得到裡面的晶核
    const coreX = cx - 5;
    const coreY = cy + 1;
    const body = (c) => c.ellipse(cx, cy, 23, 18, 0, 0, TAU);
    rs(ctx, body, CRL.body, CRL.bodyS, CRL.bodyL, {
      cel: [3, 3.5],
      rim: 1.8,
      sheen: [cx - 8, cy - 9, 11, 0.35],
      tex: (c) => {
        // 淺色的肚子
        c.fillStyle = A.c(CRL.belly);
        c.beginPath();
        c.ellipse(cx + 3, cy + 12, 16, 7, 0, 0, TAU);
        c.fill();
        // 透光的「窗」：晶核附近的珊瑚比較薄，透出青光
        const g = c.createRadialGradient(coreX, coreY, 1, coreX, coreY, 13);
        g.addColorStop(0, 'rgba(255,255,255,0.55)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(coreX, coreY, 13, 0, TAU);
        c.fill();
        glow(c, coreX, coreY, 15 + beat * 4 + charge * 6, CRL.core, 0.8 + beat * 0.2 + charge * 0.2);
        glow(c, coreX, coreY, 7, '#ffffff', 0.5 + beat * 0.2);
        // 晶核（多面寶石），上面一道細細的裂紋把它分成兩半
        const gp = [[coreX, coreY - 6.5], [coreX + 5.5, coreY - 2], [coreX + 3.6, coreY + 5], [coreX - 3.6, coreY + 5], [coreX - 5.5, coreY - 2]];
        c.save();
        c.globalAlpha *= 0.9;
        c.fillStyle = A.c(U.mix('#5af0e8', '#e8ffff', beat * 0.3 + charge * 0.35));
        c.beginPath();
        poly(c, gp);
        c.fill();
        c.fillStyle = A.c('#b8fff8');
        c.beginPath();
        poly(c, [gp[0], gp[4], [coreX - 1.8, coreY], [coreX, coreY - 1.4]]);
        c.fill();
        c.fillStyle = A.c(CRL.coreS);
        c.beginPath();
        poly(c, [gp[1], gp[2], [coreX, coreY + 1.6], [coreX + 1.4, coreY - 0.8]]);
        c.fill();
        c.strokeStyle = A.c('#1a6a78');
        c.lineWidth = 1.2;
        c.lineJoin = 'round';
        c.beginPath();
        poly(c, gp);
        c.stroke();
        // 裂紋（亮白的細線，從上到下鋸齒狀貫穿）
        c.strokeStyle = A.c('#ffffff');
        c.lineWidth = 0.9;
        c.beginPath();
        c.moveTo(coreX + 0.5, coreY - 6.5);
        c.lineTo(coreX - 0.8, coreY - 3);
        c.lineTo(coreX + 1, coreY - 0.5);
        c.lineTo(coreX - 0.6, coreY + 2.5);
        c.lineTo(coreX + 0.4, coreY + 5);
        c.moveTo(coreX - 0.8, coreY - 3);
        c.lineTo(coreX - 3, coreY - 3.8);
        c.moveTo(coreX + 1, coreY - 0.5);
        c.lineTo(coreX + 3.2, coreY + 0.6);
        c.stroke();
        c.restore();
        // 一層薄薄的粉紅珊瑚蓋在晶核上（半透明的感覺）
        c.fillStyle = 'rgba(255,150,180,0.12)';
        c.beginPath();
        c.arc(coreX, coreY, 8, 0, TAU);
        c.fill();
        // 珊瑚的小孔與白斑
        speckle(c, cx + 2, cy - 4, 36, 22, 10, 0.9, '#c84872', 71, 0.55);
        speckle(c, cx - 2, cy - 8, 30, 12, 6, 1.1, '#ffe6ee', 83, 0.8);
      },
    });

    // 前面的珊瑚枝與水晶（頭頂）
    coralKnob(ctx, -3, cy - 16, -0.25, 15, t, 1, false);
    crystalShard(ctx, 3, cy - 16, 11, 2.8, 0.2, t, 2, charge);
    coralKnob(ctx, 10, cy - 14, 0.55, 11, t, 8, false);
    crystalShard(ctx, -13, cy - 12, 8, 2.3, -0.7, t, 4, charge);

    // 臉（身體前半，大大的眼睛）
    let kind = eyeKind(m);
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    eyes2(ctx, cx + 8, cy - 3, 10, 4, 5, kind, '#2ab8c8', CRL.body);
    mouth2(ctx, cx + 13.5, cy + 5, hurt ? 'open' : ph === 'strike' ? 'open' : ph === 'wind' ? 'grit' : 'smile', 0.8);
    A.blush(ctx, cx + 3, cy + 3, 2.6);
    A.blush(ctx, cx + 19, cy + 2, 2.2);
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
    const vio = ['#b070ff', '#f0e0ff'];
    const ORG = ['#ff9a4a', '#c8502a', '#ffe0b0'];

    // 落地時的紫光飛濺
    if (slam > 0.05) {
      ctx.save();
      ctx.globalAlpha *= slam;
      for (let i = 0; i < 7; i++) {
        const a = PI + (i / 6) * PI;
        const d = 28 + (1 - slam) * 20;
        glow(ctx, Math.cos(a) * d * 1.1, -4 + Math.sin(a) * d * 0.4, 8, '#c090ff', 0.6);
        sparkle(ctx, Math.cos(a) * d * 1.1, -4 + Math.sin(a) * d * 0.4, 3.4, '#f0e0ff');
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
      glow(ctx, 0, 0, pr * 1.3, vio[0], 0.5);
      // 往下打的光柱（蓄力／空中）
      if (air || ph === 'wind') {
        ctx.save();
        ctx.globalAlpha *= 0.3;
        ctx.fillStyle = lg(ctx, 0, 0, 0, 40, [[0, '#d0a8ff', 0.8], [1, '#d0a8ff', 0]]);
        ctx.fillRect(-pr * 0.8, 0, pr * 1.6, 40);
        ctx.restore();
      }
      ctx.scale(1, 0.4);
      ctx.fillStyle = A.c('#4a2090');
      ctx.globalAlpha *= 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, TAU);
      ctx.fill();
      ctx.globalAlpha /= 0.4;
      // 外面再一圈細的刻度環（反向轉）
      ctx.save();
      ctx.rotate(-spin * 0.6);
      ctx.strokeStyle = A.c('#d8b8ff');
      ctx.lineWidth = 1;
      ctx.setLineDash([1.5, 2.5]);
      ctx.beginPath();
      ctx.arc(0, 0, pr * 1.14, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = A.c('#7a3ad8');
      ctx.globalAlpha *= 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha /= 0.5;
      magicCircle(ctx, pr, spin, vio[0], vio[1], { lw: 1.2, runes: 6 });
      // 中央的封印字
      ctx.save();
      ctx.rotate(-spin);
      glowRune(ctx, 0, 0, pr * 0.2, 7, '#c890ff', '#ffffff', 0.9);
      ctx.restore();
      ctx.restore();
      // 從法陣垂下來連到背上的光絲
      if (slam <= 0) {
        ctx.save();
        ctx.globalAlpha *= 0.55;
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
        // 繞著法陣轉的小符文
        for (let i = 0; i < 3; i++) {
          const a = t * 2 + (i / 3) * TAU;
          glowRune(ctx, Math.cos(a) * (pr + 5), hy + Math.sin(a) * (pr + 5) * 0.4, 1.8, i * 3 + 2, '#c890ff', '#ffffff', 0.5 + 0.4 * Math.sin(a));
        }
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
    const tip = (i, k) => {
      const a = -PI / 2 + (i / 5) * TAU;
      const r = (R + armWig(i)) * 0.98 * k;
      return [Math.cos(a) * r, cy + Math.sin(a) * r * Sy];
    };
    // 腳底的符印層（深紫、發光的紋）
    const drop = air ? 3 : 0;
    if (air || slam > 0) glow(ctx, 0, cy + 10 + drop, 32, '#b070ff', 0.45 + slam * 0.4);
    rs(ctx, (c) => star(c, 9 + drop, 0.98), '#4a2a8a', '#2a1458', null, {
      cel: [0, 2],
      lw: 2,
      tex: (c) => {
        c.strokeStyle = A.c(U.mix('#b88aff', '#ffffff', slam * 0.6));
        c.lineWidth = 1.4;
        c.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -PI / 2 + (i / 5) * TAU;
          c.moveTo(Math.cos(a) * 10, cy + 13 + drop + Math.sin(a) * 5);
          c.lineTo(Math.cos(a) * 40, cy + 13 + drop + Math.sin(a) * 20);
        }
        c.stroke();
        c.globalAlpha *= 0.4 + slam * 0.6 + (air ? 0.4 : 0);
        glow(c, 0, cy + 14 + drop, 26, '#c890ff', 0.8);
      },
    });
    // 身體的厚度（側面一排小管足）
    rs(ctx, (c) => star(c, 4.5, 1), '#d8662a', '#9a3a1a', null, {
      cel: [0, 1.5],
      lw: 1.8,
      tex: (c) => {
        for (let i = 0; i < 5; i++) {
          const p = tip(i, 0.8);
          dot(c, p[0], p[1] + 5.5, 0.9, '#ffb080');
        }
      },
    });
    // 上表面：每條腕中央一排大顆粒、兩側細網紋、腕尖亮一點
    rs(ctx, (c) => star(c, 0, 1), ORG[0], ORG[1], ORG[2], {
      cel: [3, 2.5],
      rim: 1.6,
      sheen: [-6, cy - 4, 16, 0.25],
      tex: (c) => {
        c.fillStyle = lg(c, 0, cy - 14, 0, cy + 14, [[0, '#ffd080', 0.3], [1, '#a03010', 0.25]]);
        c.fillRect(-45, cy - 20, 90, 40);
        // 網紋
        c.strokeStyle = A.c('#e87838');
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -PI / 2 + (i / 5) * TAU;
          for (const s of [-1, 1]) {
            const b = a + s * 0.22;
            c.moveTo(Math.cos(b) * 8, cy + Math.sin(b) * 8 * Sy);
            c.lineTo(Math.cos(a + s * 0.12) * R * 0.95, cy + Math.sin(a + s * 0.12) * R * 0.95 * Sy);
          }
        }
        c.stroke();
        // 中央的淺色圓盤
        c.fillStyle = A.c('#ffc080');
        c.beginPath();
        c.ellipse(0, cy + 1, 13, 7, 0, 0, TAU);
        c.fill();
      },
    });
    // 顆粒（有亮面）
    for (let i = 0; i < 5; i++) {
      const a = -PI / 2 + (i / 5) * TAU;
      for (let j = 1; j <= 3; j++) {
        const rr = R * (0.3 + j * 0.2);
        const x = Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * Sy;
        const r = 2 - j * 0.35;
        rse(ctx, x, y, r, r * 0.85, '#ffe0b8', '#e89a60', null, { noStroke: true, hl: false, cel: [r * 0.3, r * 0.3] });
        dot(ctx, x - r * 0.3, y - r * 0.35, r * 0.3, '#ffffff');
      }
      // 腕尖的小符印（亮紫）
      const p = tip(i, 1);
      glow(ctx, p[0], p[1], 5, '#c890ff', 0.5 + slam * 0.4);
      dot(ctx, p[0], p[1], 1.2, '#f0e0ff');
    }
    // 臉
    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || air)) kind = 'angry';
    if (kind === 'normal' && slam > 0.4) kind = 'closed';
    eyes2(ctx, 1, cy + 1.5, 10, 3.4, 4.1, kind, '#9a4ae0', ORG[0]);
    mouth2(ctx, 6.5, cy + 7.5, hurt ? 'open' : air ? 'o' : slam > 0.3 || ph === 'wind' ? 'grit' : 'smile', 0.75);
    A.blush(ctx, -5, cy + 6.5, 2.5);
    A.blush(ctx, 17.5, cy + 6, 2.3);
    ctx.restore();

    if (!(slam > 0)) sealCircle();
  }

  // ── 蛇腹劍海鰻：背上的鱗長成一節一節的劍刃，伸長時刀節分開、中間露出鎖鏈般的脊椎；尾巴長得像劍柄 ──
  function accordioneel(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const stretch = clamp01(num(fx.stretch, 0));
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m) && !m.dead;
    const squeeze = ph === 'wind' && stretch <= 0 ? 1 : 0;
    const breathe = Math.sin(t * 2.2) * 2;
    const L = 44 * (1 - 0.4 * squeeze) + breathe * (1 - squeeze) + stretch * 220;
    const bx0 = -22;
    const bx1 = bx0 + L;
    const H = 23;
    const midY = -20;
    // 蛇行：波從頭往尾傳，尾巴擺得比頭大（頭穩、尾甩）；拉長時拉直
    const waveA = (walk ? 4.6 : 2.6) * (1 - stretch) * (1 - squeeze * 0.5);
    const shake = squeeze ? Math.sin(t * 50) * 0.8 : 0;
    const wave = (x) => Math.sin(t * (walk ? 8 : 3) + (x - bx0) * 0.11) * waveA * (1 - Math.min(1, Math.max(0, (x - bx0) / (L + 1))) * 0.55) + shake;
    const SKIN = ['#6cc096', '#2e6e54', '#c0f0d0'];
    const STEEL = ['#e8edf6', '#8894ac', '#ffffff'];
    const rune = '#5af0d0';
    const hot = stretch > 0.2 || squeeze ? 1 : 0;

    // 尾巴長得像劍柄，但都是身體的一部分：交叉的鱗紋是「握柄」、兩片捲曲的金色鰭是「護手」、
    // 尾尖圓圓的肉球上有一個發光的眼斑是「柄頭寶石」，後面拖著一條尾鰭絲（像流蘇）
    const ty = wave(bx0);
    ctx.save();
    ctx.translate(bx0, midY + ty);
    ctx.rotate(Math.sin(t * 3 - 1.2) * 0.12 * (1 - stretch));
    const sway = Math.sin(t * 3.4 - 1.8) * 2.4;
    rs(ctx, (c) => { c.moveTo(-22, 2); c.quadraticCurveTo(-25 + sway * 0.4, 7, -27 + sway, 13); c.quadraticCurveTo(-23 + sway, 10, -20, 3.5); c.closePath(); }, '#9ae0b8', '#4a9a78', null, { cel: [1, 0], lw: 1.5 });
    rs(ctx, (c) => { c.moveTo(-1, -5); c.quadraticCurveTo(-10, -4.2, -17, -3); c.lineTo(-17, 3); c.quadraticCurveTo(-10, 4.4, -1, 5.5); c.closePath(); }, SKIN[0], SKIN[1], SKIN[2], {
      cel: [0, 2],
      rim: 0.9,
      lw: 2.1,
      tex: (c) => {
        c.fillStyle = A.c('#d0f0da');
        c.fillRect(-18, 1.6, 18, 5);
        c.strokeStyle = A.c('#2e6e54');
        c.lineWidth = 1.1;
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          c.moveTo(-15.5 + i * 3.5, -4);
          c.lineTo(-12.5 + i * 3.5, 4);
          c.moveTo(-12.5 + i * 3.5, -4);
          c.lineTo(-15.5 + i * 3.5, 4);
        }
        c.stroke();
      },
    });
    glow(ctx, -20, 0, 8, '#ff6a8a', 0.4 + hot * 0.4);
    rse(ctx, -20, 0, 5, 4.8, SKIN[0], SKIN[1], SKIN[2], { lw: 2, rim: 0.9 });
    rse(ctx, -20.4, 0, 2.6, 2.6, '#ffd24a', '#c07a18', null, { lw: 1, hl: false });
    rse(ctx, -20.4, 0, 1.5, 1.5, '#e84a6a', '#8a1a3a', null, { noStroke: true, hl: [-21, -0.6, 0.6, 0.5] });
    const guard = (c) => {
      c.moveTo(-3, -12);
      c.quadraticCurveTo(-8, -14, -8, -10);
      c.quadraticCurveTo(-6, -8.5, -4.5, -10);
      c.quadraticCurveTo(-5.5, -5, -4, 0);
      c.quadraticCurveTo(-5.5, 5, -4.5, 10);
      c.quadraticCurveTo(-6, 8.5, -8, 10);
      c.quadraticCurveTo(-8, 14, -3, 12);
      c.lineTo(1.5, 10);
      c.quadraticCurveTo(0, 0, 1.5, -10);
      c.closePath();
    };
    rs(ctx, guard, GOLDC[0], GOLDC[1], GOLDC[2], {
      cel: [1.2, 1.2], rim: 1, lw: 1.9,
      tex: (c) => {
        // 鰭條
        c.strokeStyle = A.c(GOLDC[1]);
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = -3; i <= 3; i++) { c.moveTo(0.5, i * 1.6); c.lineTo(-5.5, i * 3.4); }
        c.stroke();
      },
    });
    ctx.restore();

    // 鰻魚的身體（刀節底下的皮肉）：綠背、淺色的腹、斑點；伸長時刀節分開、身體縮成鎖鏈，就淡掉
    const skinA = 1 - Math.min(1, stretch * 3);
    if (skinA > 0.02) {
      ctx.save();
      ctx.globalAlpha *= skinA;
      const eelB = (c) => {
        const x0 = bx0 + 1;
        const x1 = bx1 + 4;
        for (let x = x0; x <= x1; x += 4) {
          const k = 0.72 + 0.28 * ((x - x0) / (x1 - x0));
          (x === x0 ? c.moveTo : c.lineTo).call(c, x, midY + wave(x) - H * 0.44 * k);
        }
        for (let x = x1; x >= x0; x -= 4) {
          const k = 0.72 + 0.28 * ((x - x0) / (x1 - x0));
          c.lineTo(x, midY + wave(x) + H * 0.66 * k);
        }
        c.closePath();
      };
      rs(ctx, eelB, SKIN[0], SKIN[1], SKIN[2], {
        cel: [0, 2.4],
        rim: 1.2,
        lw: 2.2,
        tex: (c) => {
          // 腹部的淺色帶
          c.fillStyle = A.c('#d0f0da');
          c.beginPath();
          for (let x = bx0; x <= bx1 + 6; x += 4) (x === bx0 ? c.moveTo(x, midY + wave(x) + H * 0.36) : c.lineTo(x, midY + wave(x) + H * 0.36));
          c.lineTo(bx1 + 6, midY + 20);
          c.lineTo(bx0, midY + 20);
          c.closePath();
          c.fill();
          c.fillStyle = A.c('#3e8a68');
          c.beginPath();
          for (let i = 0; i < 9; i++) {
            const x = bx0 + 4 + ((i * 7.3) % L);
            const y = midY + wave(x) + H * (0.44 + 0.07 * (i % 3));
            c.moveTo(x + 1.3, y);
            c.ellipse(x, y, 1.3, 0.9, 0, 0, TAU);
          }
          c.fill();
        },
      });
      ctx.restore();
    }

    // 鎖鏈（沿著中線，刀節分開時才看得到）
    const n = 6;
    const gap = L / n;
    const pl = 12;
    if (gap > pl * 0.7) {
      ctx.save();
      for (let x = bx0 + 2; x < bx1; x += 5) {
        const y = midY + wave(x);
        const odd = Math.round((x - bx0) / 5) % 2;
        ctx.beginPath();
        if (odd) ctx.ellipse(x, y, 3.2, 1.3, 0, 0, TAU);
        else ctx.ellipse(x, y, 3.2, 2.4, 0, 0, TAU);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.8;
        ctx.stroke();
        ctx.strokeStyle = A.c(odd ? '#7a86a0' : '#b8c2d2');
        ctx.lineWidth = 1.3;
        ctx.stroke();
        if (!odd) dot(ctx, x - 1.2, y - 1.6, 0.5, '#ffffff');
      }
      if (stretch > 0.3) {
        ctx.globalAlpha *= stretch * 0.6;
        ctx.strokeStyle = A.c(rune);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = bx0; x <= bx1; x += 4) (x === bx0 ? ctx.moveTo(x, midY + wave(x)) : ctx.lineTo(x, midY + wave(x)));
        ctx.stroke();
      }
      ctx.restore();
    }

    // 背鰭：沿著刀節上緣的一條半透明鰭膜（拉長時收起來）
    const finA = 1 - Math.min(1, stretch * 2.5);
    if (finA > 0.02) {
      ctx.save();
      ctx.globalAlpha *= 0.8 * finA;
      const fin = (c) => {
        c.moveTo(bx0 + 2, midY + wave(bx0 + 2) - H * 0.35);
        for (let x = bx0 + 2; x <= bx1 - 2; x += 3) c.lineTo(x, midY + wave(x) - H * 0.45 - 3.5 - Math.sin(x * 0.5 + t * 6) * 0.9);
        c.lineTo(bx1 - 2, midY + wave(bx1 - 2) - H * 0.35);
        c.closePath();
      };
      rs(ctx, fin, '#9ae0b8', '#4a9a78', null, {
        cel: [0, -1.2],
        lw: 1.6,
        tex: (c) => {
          c.strokeStyle = A.c('#4a9a78');
          c.lineWidth = 0.7;
          c.beginPath();
          for (let x = bx0 + 5; x < bx1 - 3; x += 4) {
            c.moveTo(x, midY + wave(x) - H * 0.35);
            c.lineTo(x - 1.5, midY + wave(x) - H * 0.45 - 3.5);
          }
          c.stroke();
        },
      });
      ctx.restore();
    }

    // 刀節（箭頭狀的劍刃片，從尾到頭往前疊）：上半亮、下半暗的斜磨面，中間發光的符文血槽
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
      const rg = hot ? 0.95 : 0.35 + 0.25 * Math.sin(t * 3 + i);
      rs(ctx, plate, STEEL[0], STEEL[1], STEEL[2], {
        cel: [0, 1.2],
        rim: 1,
        lw: 2.1,
        tex: (c) => {
          // 下半的斜磨面
          c.fillStyle = A.c('#aab4c8');
          c.beginPath();
          poly(c, [[-len * 0.2, 0], [len * 0.55, 0], [len * 0.18, h * 0.5], [-len * 0.55, h * 0.5]]);
          c.fill();
          c.fillStyle = 'rgba(40,50,80,0.25)';
          c.fillRect(-len, h * 0.32, len * 2, h);
          // 刃口的亮線
          c.strokeStyle = '#ffffff';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(-len * 0.45, -h * 0.5 + 1.6);
          c.lineTo(len * 0.15, -h * 0.5 + 1.6);
          c.lineTo(len * 0.42, -1);
          c.stroke();
          // 血槽與符文
          c.globalAlpha *= rg;
          glow(c, 0, 0, 8, rune, 0.8);
        },
      });
      ctx.lineCap = 'round';
      line(ctx, [[-len * 0.32, -0.2], [len * 0.26, -0.2]], '#3a4660', 2.6);
      line(ctx, [[-len * 0.32, -0.2], [len * 0.26, -0.2]], U.mix('#2a8a7a', rune, rg), 1.6);
      if (hot) runeGlyph(ctx, -len * 0.05, -h * 0.26, 1.3, i * 2 + 1, '#e8fff8', 0.7);
      // 刀節根部的金色鑲片＋鉚釘
      A.shape(ctx, (c) => poly(c, [[-len * 0.55, -h * 0.5], [-len * 0.36, -h * 0.5], [-len * 0.02, 0], [-len * 0.36, h * 0.5], [-len * 0.55, h * 0.5], [-len * 0.2, 0]]), GOLDC[0], GOLDC[1], { lw: 1.4, hl: false });
      dot(ctx, -len * 0.3, -h * 0.26, 1.1, GOLDC[2]);
      dot(ctx, -len * 0.3, h * 0.26, 1.1, GOLDC[1]);
      ctx.restore();
    }
    // 頭（海鰻）：斑駁的皮、鰓孔、鼻管、尖牙、頭頂的劍刃鰭
    const hy = wave(bx1);
    const hx = bx1 + 2;
    const open = hurt ? 0.6 : ph === 'strike' ? 1 : ph === 'wind' ? 0.25 : 0.1 + Math.max(0, Math.sin(t * 1.5)) * 0.15;
    const slope = Math.atan((wave(bx1 + 3) - wave(bx1 - 3)) / 6);
    ctx.save();
    ctx.translate(hx, midY + hy);
    ctx.rotate(slope * 0.8);
    ctx.scale(1.12, 1.12);
    // 胸鰭（頭後面的小扇子，一直在搧）
    ctx.save();
    ctx.translate(-4, 5);
    ctx.rotate(0.5 + Math.sin(t * (walk ? 12 : 6)) * 0.35);
    rs(ctx, (c) => { c.moveTo(0, 0); c.quadraticCurveTo(-3, 7, -9, 8); c.quadraticCurveTo(-8, 3, -6, -1); c.closePath(); }, '#9ae0b8', '#4a9a78', null, { cel: [0, 1], lw: 1.5, tex: (c) => { c.strokeStyle = A.c('#4a9a78'); c.lineWidth = 0.7; c.beginPath(); c.moveTo(-0.5, 0.5); c.lineTo(-7, 6.5); c.moveTo(-1, 0); c.lineTo(-8, 3.5); c.stroke(); } });
    ctx.restore();
    // 下顎
    ctx.save();
    ctx.translate(2, 3);
    ctx.rotate(open * 0.45);
    rs(ctx, (c) => {
      c.moveTo(-3, -1);
      c.quadraticCurveTo(12, 0, 23, -1);
      c.quadraticCurveTo(22, 5, 14, 7);
      c.quadraticCurveTo(4, 8, -3, 7);
      c.closePath();
    }, '#d0f0da', '#8ac0a0', null, { cel: [0, 1.6], lw: 2.1 });
    if (open > 0.2) {
      ctx.fillStyle = A.c('#ffffff');
      [9, 14, 19].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x - 1.3, -0.6);
        ctx.lineTo(x, -3);
        ctx.lineTo(x + 1.3, -0.6);
        ctx.fill();
      });
    }
    ctx.restore();
    if (open > 0.2) {
      A.shape(ctx, (c) => { c.moveTo(4, 2); c.quadraticCurveTo(16, 1, 24, 0.5); c.quadraticCurveTo(18, 3 + open * 8, 5, 6 + open * 3); c.closePath(); }, '#6a1a28', null, { noStroke: true, hl: false });
      A.ellipse(ctx, 10, 4 + open * 2.5, 4, 1.4, '#e8607a', null, { noStroke: true, hl: false });
    }
    // 頭頂的劍刃鰭
    rs(ctx, (c) => { c.moveTo(-4, -10); c.lineTo(-11, -20); c.lineTo(-1, -17); c.lineTo(9, -14); c.closePath(); }, STEEL[0], STEEL[1], STEEL[2], {
      cel: [0, 1.5],
      rim: 0.8,
      lw: 1.7,
      tex: (c) => {
        c.strokeStyle = A.c(hot ? rune : '#8a96ac');
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(-8, -17.5);
        c.lineTo(4, -13.5);
        c.stroke();
      },
    });
    // 上顎＋頭
    const headP = (c) => {
      c.moveTo(-5, -11);
      c.bezierCurveTo(6, -17, 20, -14, 26, -5);
      c.quadraticCurveTo(28, 0, 24, 1.5);
      c.quadraticCurveTo(12, 3, -5, 6);
      c.closePath();
    };
    rs(ctx, headP, SKIN[0], SKIN[1], SKIN[2], {
      cel: [2, 2.6],
      rim: 1.4,
      sheen: [8, -10, 8, 0.25],
      tex: (c) => {
        // 斑駁的深色斑
        [[2, -8, 1.8], [-2, -3, 1.4], [6, -2, 1.2], [15, -11, 1.1], [-3, 2.5, 1.2], [11, 0, 1]].forEach(([x, y, r]) => {
          c.fillStyle = A.c('#3e8a68');
          c.beginPath();
          c.ellipse(x, y, r * 1.3, r, 0.3, 0, TAU);
          c.fill();
        });
        speckle(c, 10, -6, 22, 10, 7, 0.6, '#d8ffe8', 13, 0.7);
        // 鰓孔
        c.strokeStyle = A.c('#1e4a38');
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(-1, -6);
        c.quadraticCurveTo(1.5, -2, -0.5, 2);
        c.stroke();
      },
    });
    // 上排尖牙
    ctx.fillStyle = A.c('#ffffff');
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 0.9;
    [8, 13, 18, 22].forEach((x, i) => {
      const s2 = i === 3 ? 0.8 : 1;
      ctx.beginPath();
      ctx.moveTo(x - 1.4 * s2, 2 - x * 0.04);
      ctx.lineTo(x, 5 * s2 - x * 0.04);
      ctx.lineTo(x + 1.4 * s2, 2 - x * 0.04);
      ctx.fill();
      ctx.stroke();
    });
    // 鼻管
    seg(ctx, 23, -5.5, 25.5, -8, 1.1, 0.9, SKIN[0], SKIN[1], null);
    let kind = eyeKind(m);
    if (kind === 'normal' && (ph === 'wind' || ph === 'strike')) kind = 'angry';
    eyes2(ctx, 11, -7, 7.5, 2.9, 3.7, kind, '#e8c020', SKIN[0]);
    A.blush(ctx, 17, -1.8, 2);
    ctx.restore();

    // 拉長時的劍光，擠壓蓄力時的刃光閃爍
    if (stretch > 0.2) {
      ctx.save();
      ctx.globalAlpha *= stretch;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const x = bx0 + L * (0.25 + i * 0.25);
        const y = midY - H / 2 - 6 - (i % 2) * 3;
        ctx.strokeStyle = A.c(rune);
        ctx.lineWidth = 4;
        ctx.globalAlpha *= 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 28, y);
        ctx.stroke();
        ctx.globalAlpha /= 0.4;
        ctx.strokeStyle = A.c('#e8fff8');
        ctx.lineWidth = 1.6;
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

  // ── 豎琴海龜：龜殼上架著吟遊詩人的豎琴，演奏時琴弦發光；頭戴插羽毛的詩人帽 ──
  function musicturtle(ctx, m) {
    const t = m.t || 0;
    const fx = m.fx || {};
    const playing = !!fx.playing;
    const ph = m.attackPhase;
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const paddle = walk ? Math.sin(t * 7) : Math.sin(t * 1.8) * 0.2;
    const bob = walk ? Math.abs(Math.sin(t * 7)) * 1.2 : Math.sin(t * 2) * 0.6;
    const SKIN = ['#9ad88a', '#4e8a48', '#dcf8c8'];
    const SHELL = ['#3e9a70', '#1e5a40', '#8ae0b0'];
    const SCUTE = ['#6ac088', '#2e7a52', '#b8f0c8'];
    const WOOD = ['#b8743a', '#6a3a18', '#e8a868'];
    const flip = (c, x, y, rx, ry, rot) => c.ellipse(x, y, rx, ry, rot, 0, TAU);
    const skinTex = (x, y, w, h, seed) => (c) => speckle(c, x, y, w, h, 6, 0.8, '#6aa860', seed, 0.8);

    // 遠側鰭
    rs(ctx, (c) => flip(c, -22, -5, 9, 3.6, 0.3 - paddle * 0.25), SKIN[1], '#34602e', null, { cel: [0, 1], lw: 2.1 });
    rs(ctx, (c) => flip(c, 20, -5, 13, 4.2, -0.35 + paddle * 0.3), SKIN[1], '#34602e', null, { cel: [0, 1], lw: 2.1 });

    ctx.save();
    ctx.translate(0, -bob);

    // 頭與脖子（有鱗紋）
    const sway = playing ? Math.sin(t * 3) * 2.5 : 0;
    const retract = hurt ? -4 : 0;
    const hx = 29 + retract + (ph === 'strike' ? 3 : 0);
    const hy = -21 + sway * 0.4 - (playing ? 1 : 0);
    rs(ctx, (c) => {
      c.moveTo(12, -22);
      c.quadraticCurveTo(20, -24, hx - 4, hy - 4);
      c.lineTo(hx - 2, hy + 6);
      c.quadraticCurveTo(20, -10, 12, -11);
      c.closePath();
    }, SKIN[0], SKIN[1], SKIN[2], {
      cel: [0, 2.4],
      rim: 1,
      lw: 2.3,
      tex: (c) => {
        c.strokeStyle = A.c('#7ab86a');
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = 0; i < 3; i++) {
          c.moveTo(15 + i * 3.5, -20 + i * 0.3);
          c.quadraticCurveTo(16.5 + i * 3.5, -16, 15 + i * 3.5, -12);
        }
        c.stroke();
      },
    });

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
    if (hs > 0) glow(ctx, 0, -16, 28, '#8af0ff', 0.5 * hs);
    // 共鳴箱（斜的那根，木頭：木紋＋金色鑲邊＋音孔）
    ctx.save();
    ctx.translate(B[0] + 1, B[1]);
    ctx.rotate(Math.atan2(D[1] - B[1], D[0] - B[0] - 1));
    const bl = Math.hypot(D[0] - B[0] - 1, D[1] - B[1]);
    const box = (c) => { c.moveTo(-2, -2.5); c.lineTo(bl + 1, -2); c.quadraticCurveTo(bl + 3, 0, bl + 1, 2.2); c.lineTo(-2, 4.6); c.quadraticCurveTo(-4.5, 1, -2, -2.5); c.closePath(); };
    rs(ctx, box, WOOD[0], WOOD[1], WOOD[2], {
      cel: [0, 1.6],
      rim: 1,
      lw: 2,
      tex: (c) => {
        c.strokeStyle = A.c('#8a4e22');
        c.lineWidth = 0.7;
        c.beginPath();
        c.moveTo(0, -0.8);
        c.quadraticCurveTo(bl * 0.5, 0.8, bl, -0.6);
        c.moveTo(1, 2.2);
        c.quadraticCurveTo(bl * 0.5, 2.8, bl - 2, 1.2);
        c.stroke();
        c.fillStyle = A.c(GOLDC[0]);
        c.fillRect(-4, 3.2, bl + 6, 1.1);
      },
    });
    [bl * 0.3, bl * 0.62].forEach((x) => A.ellipse(ctx, x, 0.4, 1.3, 1, '#3a1a08', null, { noStroke: true, hl: false }));
    ctx.restore();
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
        ctx.globalAlpha *= 0.55 * hs;
        ctx.strokeStyle = A.c(col);
        ctx.lineWidth = 3.6;
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
    // 琴頸（上面彎的那根，金色，雙線條）
    limb(ctx, (c) => { c.moveTo(C[0], C[1]); c.quadraticCurveTo(Q[0], Q[1], D[0], D[1]); }, 6.4, GOLDC[1]);
    ctx.save();
    ctx.translate(-0.5, -0.8);
    ctx.beginPath();
    ctx.moveTo(C[0], C[1]);
    ctx.quadraticCurveTo(Q[0], Q[1], D[0], D[1]);
    ctx.strokeStyle = A.c(GOLDC[0]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = A.c(GOLDC[2]);
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
    // 琴柱（前面直的那根，金色、刻環；頂上有渦卷）
    limb(ctx, (c) => { c.moveTo(B[0], B[1]); c.lineTo(C[0], C[1]); }, 6.4, GOLDC[1]);
    line(ctx, [[B[0] - 0.6, B[1]], [C[0] - 0.6, C[1]]], GOLDC[0], 2);
    line(ctx, [[B[0] - 1, B[1] - 1], [C[0] - 1, C[1] + 2]], GOLDC[2], 0.7);
    [0.3, 0.6].forEach((k) => {
      const x = B[0] + (C[0] - B[0]) * k;
      const y = B[1] + (C[1] - B[1]) * k;
      rse(ctx, x, y, 3.2, 1.4, GOLDC[0], GOLDC[1], null, { lw: 1.2, hl: false, rot: -0.07 });
    });
    rse(ctx, C[0] - 1, C[1] - 2, 3.6, 3.6, GOLDC[0], GOLDC[1], GOLDC[2], { lw: 1.7, hl: false, rim: 0.8 });
    ctx.strokeStyle = A.c(GOLDC[1]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let a = 0; a < TAU * 1.3; a += 0.3) {
      const rr = 0.4 + a * 0.35;
      const px = C[0] - 1 + Math.cos(a) * rr;
      const py = C[1] - 2 + Math.sin(a) * rr;
      a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    // 弦釘
    for (let i = 1; i <= ns; i++) {
      const p = neckAt((i / (ns + 1)) * 0.92 + 0.04);
      dot(ctx, p[0], p[1] - 0.5, 1, '#8a5a1a');
      dot(ctx, p[0] - 0.3, p[1] - 0.8, 0.35, '#fff4b8');
    }
    rse(ctx, D[0] + 1, D[1] - 1, 2.8, 2.8, GOLDC[0], GOLDC[1], null, { lw: 1.5, hl: false });
    dot(ctx, D[0] + 1, D[1] - 1, 1.2, hs > 0 ? '#bff4ff' : '#3a8ae8');
    ctx.restore();

    // 腹甲（分節）
    rs(ctx, (c) => c.ellipse(-4, -11, 27, 5.5, 0, 0, TAU), '#f4e2a8', '#c8a060', '#fffbe0', {
      cel: [0, 1.5],
      rim: 0.8,
      lw: 2.3,
      tex: (c) => {
        c.strokeStyle = A.c('#d0b070');
        c.lineWidth = 0.9;
        c.beginPath();
        [-18, -8, 2, 12].forEach((x) => { c.moveTo(x, -16); c.lineTo(x + 1, -6); });
        c.stroke();
      },
    });
    // 龜殼：大塊盾片有生長紋、殼緣一圈小緣盾
    const dome = (c) => {
      c.moveTo(-31, -12);
      c.bezierCurveTo(-30, -40, 20, -42, 22, -12);
      c.quadraticCurveTo(-4, -8, -31, -12);
      c.closePath();
    };
    const hex = (x, y, r) => (c) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8);
      }
      c.closePath();
    };
    rs(ctx, dome, SHELL[0], SHELL[1], SHELL[2], {
      cel: [4, 3],
      rim: 1.8,
      sheen: [-12, -30, 14, 0.25],
      tex: (c) => {
        // 緣盾
        c.fillStyle = A.c('#2e7a58');
        c.beginPath();
        c.moveTo(-32, -12);
        c.quadraticCurveTo(-4, -8, 23, -12);
        c.lineTo(23, -17);
        c.quadraticCurveTo(-4, -13, -32, -17);
        c.closePath();
        c.fill();
        c.strokeStyle = A.c('#1e5a40');
        c.lineWidth = 1;
        c.beginPath();
        for (let x = -26; x < 20; x += 6) {
          c.moveTo(x, -16.5 + Math.abs(x + 4) * 0.02);
          c.lineTo(x + 0.5, -11.5 + Math.abs(x + 4) * 0.02);
        }
        c.stroke();
        c.strokeStyle = A.c('#6ac090');
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(-31, -17.5);
        c.quadraticCurveTo(-4, -13.5, 22, -17.5);
        c.stroke();
      },
    });
    [[-19, -22, 6], [-5, -27, 6.5], [9, -22, 6]].forEach(([x, y, r], i) => {
      rs(ctx, hex(x, y, r), SCUTE[0], SCUTE[1], SCUTE[2], {
        cel: [0.8, 1.4],
        rim: 0.8,
        lw: 1.5,
        tex: (c) => {
          c.strokeStyle = A.c('#4a9a6a');
          c.lineWidth = 0.8;
          c.beginPath();
          hex(x + 0.4, y + 0.4, r * 0.62)(c);
          c.stroke();
          c.beginPath();
          hex(x + 0.6, y + 0.6, r * 0.3)(c);
          c.stroke();
          speckle(c, x, y, r * 1.6, r, 3, 0.5, '#d8ffe0', 30 + i, 0.8);
        },
      });
    });
    // 殼邊的金色琴座
    rs(ctx, (c) => A.roundRect(c, -19, -37, 14, 5, 2), GOLDC[0], GOLDC[1], GOLDC[2], { cel: [0, 1.2], rim: 0.8, lw: 1.7 });
    [-16, -12, -8].forEach((x) => dot(ctx, x, -34.5, 0.8, '#8a5a1a'));

    // 頭
    rse(ctx, hx, hy, 10, 8.5, SKIN[0], SKIN[1], SKIN[2], {
      cel: [2, 2],
      rim: 1.2,
      hl: [hx - 4, hy - 3.5, 2.4, 1.3],
      tex: skinTex(hx + 2, hy + 2, 12, 8, 41),
    });
    // 吟遊詩人帽（酒紅色扁帽＋長羽毛）
    const fs = Math.sin(t * 2.6) * 0.06 + (playing ? Math.sin(t * 6) * 0.05 : 0);
    ctx.save();
    ctx.translate(hx - 1, hy - 6.5);
    ctx.rotate(-0.18 + (hurt ? -0.2 : 0));
    ctx.save();
    ctx.translate(-5, -2);
    ctx.rotate(-0.5 + fs);
    const fea = (c) => { c.moveTo(0, 0); c.quadraticCurveTo(-5, -4, -13, -3); c.quadraticCurveTo(-17, -2.5, -19, -1); c.quadraticCurveTo(-12, 1.5, -6, 1.6); c.quadraticCurveTo(-2, 1.6, 0, 0); c.closePath(); };
    rs(ctx, fea, '#ffe27a', '#d89a20', '#fffbe0', {
      cel: [0, 1.2],
      rim: 0.7,
      lw: 1.4,
      tex: (c) => {
        c.strokeStyle = A.c('#e0a830');
        c.lineWidth = 0.6;
        c.beginPath();
        for (let i = 1; i < 6; i++) {
          c.moveTo(-i * 3, -0.8);
          c.lineTo(-i * 3 - 1.5, -2.8);
          c.moveTo(-i * 3, -0.6);
          c.lineTo(-i * 3 - 1.4, 1.2);
        }
        c.stroke();
        c.fillStyle = A.c('#4ab8e0');
        c.fillRect(-21, -4, 4, 6);
      },
    });
    ctx.restore();
    const beret = (c) => { c.moveTo(-9, 1.5); c.bezierCurveTo(-11, -5, -2, -7.5, 6, -5.5); c.quadraticCurveTo(10.5, -4, 9, 0.5); c.quadraticCurveTo(0, 3, -9, 1.5); c.closePath(); };
    rs(ctx, beret, '#b8304a', '#6a1428', '#ff8a9a', {
      cel: [1.4, 1.6],
      rim: 1,
      lw: 2,
      tex: (c) => {
        c.fillStyle = A.c(GOLDC[0]);
        c.beginPath();
        c.moveTo(-9, 0.4);
        c.quadraticCurveTo(0, 2, 9.4, -0.8);
        c.lineTo(9.2, 1.2);
        c.quadraticCurveTo(0, 3.6, -9, 2);
        c.closePath();
        c.fill();
      },
    });
    dot(ctx, 1, -6.8, 1.1, '#6a1428');
    ctx.restore();
    let kind = eyeKind(m);
    if (kind === 'normal' && playing && Math.sin(t * 1.3) > -0.3) kind = 'closed';
    if (kind === 'normal' && ph === 'wind') kind = 'angry';
    eyes2(ctx, hx - 1, hy - 2, 6.5, 2.5, 3.2, kind, '#8a5a2a', SKIN[0]);
    if (hurt || ph === 'strike') mouth2(ctx, hx + 5, hy + 3.5, 'open', 0.6);
    else if (playing) mouth2(ctx, hx + 5.5, hy + 3, 'o', 0.55);
    else mouth2(ctx, hx + 4.5, hy + 3, 'smile', 0.6);
    A.blush(ctx, hx - 3, hy + 3, 2.2);
    ctx.restore();

    // 近側鰭（演奏時撥弦）：有鱗片花紋
    const strum = playing ? Math.sin(t * 9) * 0.25 : 0;
    rs(ctx, (c) => flip(c, -24, -6, 10, 4, 0.4 + paddle * 0.3), SKIN[0], SKIN[1], SKIN[2], { cel: [0, 1.4], rim: 0.8, lw: 2.1, tex: skinTex(-24, -6, 14, 5, 51) });
    rs(ctx, (c) => flip(c, 14, -6, 14, 4.6, -0.45 - paddle * 0.35 - strum), SKIN[0], SKIN[1], SKIN[2], { cel: [0, 1.4], rim: 0.8, lw: 2.1, tex: skinTex(16, -8, 18, 6, 61) });

    // 演奏時飄出的音符
    if (playing) {
      const cols = [['#6ad0e8', '#3aa8c8'], ['#ff8ab8', '#e0608e'], ['#ffd24a', '#e0a830']];
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.6 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha *= q < 0.15 ? q / 0.15 : 1 - (q - 0.15) / 0.85;
        glow(ctx, -2 + i * 8 + Math.sin(t * 3 + i) * 5 + q * 10, -68 - q * 22, 9, cols[i][0], 0.5);
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
    rse(ctx, 0, 0, 7.5, 7.5, '#3a8ae8', '#1a4aa0', '#9ad8ff', { lw: 2, cel: [1.6, 1.6], rim: 1.2, hl: [-2.5, -3, 1.8, 1.1], sheen: [-1, -1, 6, 0.4], sheenCol: '#bff0ff' });
    ctx.save();
    ctx.rotate(Math.sin(t * 5 + s) * 0.3);
    runeGlyph(ctx, 0, 0, 4, Math.floor(Math.abs(s) * 3), '#e8fbff', 1.8);
    ctx.restore();
  }
  // 鸚鵡螺殼片（符文鸚鵡螺炸出來的）：一片帶條紋的彎殼碎片，中間的符文縫燒得發亮，邊轉邊飛，身後拖著火星
  function spike(ctx, p, t) {
    const a = Math.atan2(p.vy || 0, p.vx || (p.dir || 1));
    ctx.rotate(a);
    // 尾焰
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = lg(ctx, -26, 0, -6, 0, [[0, '#ff6a3a', 0], [1, '#ffb070', 0.9]]);
    ctx.beginPath();
    ctx.moveTo(-6, -3.5);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-6, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const q = (t * 3 + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      dot(ctx, -10 - q * 16, Math.sin(i * 2.3 + t * 9) * 3 * q, 1.2, '#ffd0a0');
      ctx.restore();
    }
    glow(ctx, 0, 0, 13, '#ff7a3a', 0.6);
    ctx.save();
    ctx.rotate(t * 9 + (p.seed || 0));
    const shard = (c) => { c.moveTo(-8, -5); c.quadraticCurveTo(0, -9, 9, -4); c.lineTo(6, -1); c.lineTo(8.5, 3); c.quadraticCurveTo(0, 7.5, -7, 5); c.lineTo(-5, 1); c.closePath(); };
    rs(ctx, shard, NAU.shell, NAU.shellS, NAU.shellL, {
      cel: [1, 1.6], rim: 1, lw: 1.9,
      tex: (c) => {
        c.fillStyle = A.c(NAU.stripe);
        c.beginPath();
        c.moveTo(-6, -7); c.quadraticCurveTo(-2, -3, -4, 6); c.lineTo(-1, 6); c.quadraticCurveTo(1, -3, -3, -8); c.closePath();
        c.moveTo(4, -7); c.quadraticCurveTo(7, -2, 6, 5); c.lineTo(8, 5); c.quadraticCurveTo(9, -2, 6, -7); c.closePath();
        c.fill();
      },
    });
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1.5, -6.5);
    ctx.quadraticCurveTo(3, 0, 1.5, 6);
    ctx.strokeStyle = A.c(NAU.rune);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = A.c(NAU.runeL);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    runeGlyph(ctx, -2.5, 0, 2, 2, NAU.runeL, 1);
    ctx.restore();
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
    // 鸚鵡螺碎殼：一片彎彎的條紋殼片，斷口的符文縫還在發亮
    spring(ctx) {
      glow(ctx, 0, 1, 18, '#ff7a3a', 0.45);
      const sh = (c) => { c.moveTo(-14, -2); c.bezierCurveTo(-12, -13, 4, -16, 13, -8); c.lineTo(9, -4); c.lineTo(13, 1); c.lineTo(8, 4); c.bezierCurveTo(6, 12, -6, 14, -12, 8); c.lineTo(-9, 4); c.closePath(); };
      A.shape(ctx, sh, NAU.shell, NAU.shellS, { cel: [3, 3], lw: 2.4, hl: [-6, -8, 2.6, 1.4] });
      ctx.save();
      ctx.beginPath();
      sh(ctx);
      ctx.clip();
      ctx.fillStyle = A.c(NAU.stripe);
      [[-9, 0.25], [-1, 0.1], [7, -0.05]].forEach(([x, k]) => {
        ctx.beginPath();
        ctx.moveTo(x - 2, -16);
        ctx.quadraticCurveTo(x + 4, -2, x + k * 10 - 1, 14);
        ctx.lineTo(x + k * 10 + 3, 14);
        ctx.quadraticCurveTo(x + 8, -2, x + 2, -16);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
      ctx.beginPath();
      sh(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(9, -4);
      ctx.lineTo(13, 1);
      ctx.lineTo(8, 4);
      ctx.strokeStyle = A.c(NAU.rune);
      ctx.lineWidth = 3;
      ctx.stroke();
      glowRune(ctx, -1, -1, 5, 2, '#ff6a2a', '#fff0c8');
      sparkle(ctx, 13, -12, 3, '#ffd2a0');
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
    // 珊瑚晶核：粉紅珊瑚包著的一顆青色晶核，晶核中間一道裂紋，旁邊冒出圓頭珊瑚枝與小水晶
    block(ctx) {
      glow(ctx, 0, 1, 18, '#5af0e0', 0.6);
      coralKnob(ctx, -8, -6, -0.6, 9, 0, 1, false);
      crystalShard(ctx, 7, -7, 9, 2.4, 0.5, 0, 3, 0);
      A.shape(ctx, (c) => c.ellipse(0, 3, 13, 11, 0, 0, TAU), CRL.body, CRL.bodyS, { cel: [3, 3], hl: [-6, -3, 2.6, 1.5] });
      glow(ctx, 0, 3, 10, '#ffffff', 0.5);
      const gp = [[0, -4], [6, 0.5], [4, 8.5], [-4, 8.5], [-6, 0.5]];
      A.shape(ctx, (c) => poly(c, gp), '#6af4ec', '#2ab8b8', { cel: [1.6, 1.6], lw: 1.8, hl: false });
      line(ctx, [[0.5, -4], [-0.8, -0.5], [1, 2], [-0.6, 5.5], [0.4, 8.5]], '#ffffff', 1);
      dot(ctx, -2.4, -0.6, 1.3, '#ffffff');
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
