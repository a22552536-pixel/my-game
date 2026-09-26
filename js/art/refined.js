// 插畫風繪圖（精緻版）。手寫曲線輪廓，描邊下緣粗、上緣細；
// 陰影照形狀畫，邊緣有亮邊；眼睛有虹膜漸層與兩個反光點。
// 目前涵蓋：主角小鬃、菇系、蝸牛系。其餘角色沿用舊畫法，確認風格後再改。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;

  const ink = (hex, k) => U.mix(hex, '#1e0c06', k == null ? 0.62 : k);
  const lite = (hex, k) => U.mix(hex, '#ffffff', k);
  const dark = (hex, k) => U.mix(hex, '#2a1206', k);

  // ── 基本零件：一個有描邊、陰影、亮邊的形狀 ──
  function part(ctx, path, base, o) {
    o = o || {};
    const inkCol = o.ink || ink(base, o.inkK);
    const lw = o.lw != null ? o.lw : 1.5;
    // 底層粗描邊，往右下偏，讓下緣的線比較粗
    if (o.back !== false) {
      ctx.save();
      ctx.translate(o.ox != null ? o.ox : 0.6, o.oy != null ? o.oy : 1.2);
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(inkCol);
      ctx.fill();
      ctx.lineWidth = lw + 1.3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.c(inkCol);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = o.grad ? o.grad(ctx) : A.c(base);
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (o.shade) o.shade(ctx);
    if (o.rim !== false) {
      ctx.save();
      ctx.translate(1.3, 1.6);
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = o.rimW || 2.2;
      ctx.strokeStyle = A.c(o.rimCol || lite(base, 0.5));
      ctx.globalAlpha *= 0.75;
      ctx.stroke();
      ctx.restore();
    }
    if (o.bounce) {
      ctx.save();
      ctx.translate(-1.2, -1.6);
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = 2;
      ctx.strokeStyle = A.c(o.bounce);
      ctx.globalAlpha *= 0.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    if (o.line === false) return;
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.c(inkCol);
    ctx.stroke();
  }

  function radial(ctx, x, y, r, stops) {
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    stops.forEach(([p, c]) => g.addColorStop(p, A.c(c)));
    return g;
  }
  function fillPath(ctx, path, color, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = typeof color === 'string' ? A.c(color) : color;
    ctx.fill();
    ctx.restore();
  }

  // ── 眼睛：虹膜漸層、瞳孔、兩個反光、上眼瞼 ──
  function eye(ctx, x, y, rx, ry, kind, iris, look) {
    look = look || 0;
    const L = '#1c0a05';
    ctx.lineCap = 'round';
    if (kind === 'closed') {
      ctx.strokeStyle = A.c(L);
      ctx.lineWidth = Math.max(1.4, rx * 0.45);
      ctx.beginPath();
      ctx.arc(x, y - ry * 0.1, rx * 1.05, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
      return;
    }
    if (kind === 'hurt') {
      ctx.strokeStyle = A.c(L);
      ctx.lineWidth = Math.max(1.4, rx * 0.45);
      ctx.beginPath();
      ctx.moveTo(x - rx, y - ry * 0.6);
      ctx.lineTo(x + rx * 0.9, y);
      ctx.lineTo(x - rx, y + ry * 0.6);
      ctx.stroke();
      return;
    }
    if (kind === 'x') {
      ctx.strokeStyle = A.c(L);
      ctx.lineWidth = Math.max(1.3, rx * 0.4);
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.8, y - rx * 0.8);
      ctx.lineTo(x + rx * 0.8, y + rx * 0.8);
      ctx.moveTo(x + rx * 0.8, y - rx * 0.8);
      ctx.lineTo(x - rx * 0.8, y + rx * 0.8);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = A.c(L);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
    g.addColorStop(0, A.c(L));
    g.addColorStop(0.45, A.c(dark(iris, 0.35)));
    g.addColorStop(1, A.c(lite(iris, 0.35)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + look * 0.3, y + ry * 0.14, rx * 0.8, ry * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = A.c('#0e0402');
    ctx.beginPath();
    ctx.ellipse(x + look * 0.45, y + ry * 0.08, rx * 0.4, ry * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.26, y - ry * 0.4, rx * 0.44, ry * 0.3, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= 0.85;
    ctx.beginPath();
    ctx.arc(x + rx * 0.36, y + ry * 0.46, rx * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha /= 0.85;
    ctx.strokeStyle = A.c(L);
    ctx.lineWidth = Math.max(1.3, rx * 0.36);
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 1.02, ry * 1.02, 0, Math.PI * 1.12, Math.PI * 1.9);
    ctx.stroke();
    if (kind === 'angry') {
      ctx.lineWidth = Math.max(1.6, rx * 0.5);
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.2, y - ry * 1.45);
      ctx.quadraticCurveTo(x, y - ry * 1.35, x + rx * 1.05, y - ry * 0.95);
      ctx.stroke();
    }
  }

  function blush(ctx, x, y, r) {
    ctx.fillStyle = radial(ctx, x, y, r, [[0, 'rgba(255,120,120,0.55)'], [1, 'rgba(255,120,120,0)']]);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 沿著二次曲線做出前粗後細的形狀（尾巴、眼柄）
  function taper(c, p0, p1, p2, w0, w1) {
    const N = 12;
    const L = [];
    const R = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
      const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
      const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
      const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
      const len = Math.hypot(dx, dy) || 1;
      const w = w0 + (w1 - w0) * t;
      L.push([x - (dy / len) * w, y + (dx / len) * w]);
      R.push([x + (dy / len) * w, y - (dx / len) * w]);
    }
    c.moveTo(L[0][0], L[0][1]);
    L.forEach((p) => c.lineTo(p[0], p[1]));
    for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
    c.closePath();
  }

  // 一撮毛（鬃毛、尾巴）
  function lockPath(c, cx, cy, a, r0, r1, w, curl) {
    const bx = cx + Math.cos(a) * r0;
    const by = cy + Math.sin(a) * r0;
    const tx = cx + Math.cos(a + curl) * r1;
    const ty = cy + Math.sin(a + curl) * r1;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const mx = bx + (tx - bx) * 0.55;
    const my = by + (ty - by) * 0.55;
    c.moveTo(bx - nx * w, by - ny * w);
    c.quadraticCurveTo(mx - nx * w * 1.25, my - ny * w * 1.25, tx, ty);
    c.quadraticCurveTo(mx + nx * w * 0.5, my + ny * w * 0.5, bx + nx * w, by + ny * w);
    c.closePath();
  }

  // ════════════════════ 主角小鬃 ════════════════════
  const C = {
    body: '#f2b04e', bodyLo: '#cf8436', bodyHi: '#ffd98f',
    mane: '#dc7a2e', maneFront: '#f39b46', maneHi: '#ffc070',
    cream: '#fff0d2', creamLo: '#e9cc9e',
    ear: '#f4a393', nose: '#4a2016', iris: '#b86a24',
    tuft: '#e4432a', tuftHi: '#ff8f3e',
  };

  function lionLeg(ctx, x, lift, far) {
    const base = far ? dark(C.body, 0.2) : C.body;
    const lo = far ? dark(C.body, 0.34) : C.bodyLo;
    part(ctx, (c) => {
      c.moveTo(x - 4.5, -15);
      c.bezierCurveTo(x - 5, -9, x - 6, -4 - lift, x - 5.2, -1.6 - lift);
      c.quadraticCurveTo(x - 4, 0.5 - lift, x + 1, 0.5 - lift);
      c.quadraticCurveTo(x + 6.6, 0.5 - lift, x + 6, -2.6 - lift);
      c.bezierCurveTo(x + 5.6, -5 - lift, x + 5, -9, x + 4.5, -15);
      c.closePath();
    }, base, { lw: 1.3, shade: (c) => { c.fillStyle = A.c(lo); c.fillRect(x + 1.8, -20, 8, 22); } });
    ctx.strokeStyle = A.c(ink(base));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2.2, -0.4 - lift);
    ctx.lineTo(x + 2.2, -2.8 - lift);
    ctx.moveTo(x + 4.4, -0.9 - lift);
    ctx.lineTo(x + 4.4, -2.6 - lift);
    ctx.stroke();
  }

  function maneContour(c, cx, cy, r0, r1, n, curl, phase) {
    for (let i = 0; i <= n; i++) {
      const a = phase + (i / n) * Math.PI * 2;
      const va = a - (Math.PI / n);
      const vx = cx + Math.cos(va) * r0;
      const vy = cy + Math.sin(va) * r0;
      const rr = r1 + ((i * 37) % 5) * 0.6;
      const tx = cx + Math.cos(a + curl) * rr;
      const ty = cy + Math.sin(a + curl) * rr;
      if (i === 0) c.moveTo(vx, vy);
      else c.lineTo(vx, vy);
      if (i < n) {
        const ca = a - curl * 0.5;
        c.quadraticCurveTo(cx + Math.cos(ca - 0.12) * (rr + 1), cy + Math.sin(ca - 0.12) * (rr + 1), tx, ty);
        const na = a + (Math.PI / n);
        c.quadraticCurveTo(cx + Math.cos(na) * (r0 + 5), cy + Math.sin(na) * (r0 + 5), cx + Math.cos(na) * r0, cy + Math.sin(na) * r0);
      }
    }
    c.closePath();
  }

  function mapleLeaf(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    part(ctx, (c) => A.mapleLeafPath(c, 0, 0, s), C.tuft, {
      lw: 1.2,
      grad: (c) => radial(c, -s * 0.3, -s * 0.4, s * 1.4, [[0, C.tuftHi], [1, C.tuft]]),
      rimCol: '#ffc07a',
    });
    ctx.strokeStyle = A.c(dark(C.tuft, 0.35));
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.85);
    ctx.lineTo(0, -s * 0.6);
    ctx.moveTo(0, -s * 0.05);
    ctx.lineTo(-s * 0.55, -s * 0.25);
    ctx.moveTo(0, -s * 0.05);
    ctx.lineTo(s * 0.55, -s * 0.25);
    ctx.stroke();
    ctx.restore();
  }

  function lionSide(ctx, st) {
    const t = st.t;
    let bob = Math.sin(t * 3) * 1.1;
    let lean = 0;
    let stretch = 1;
    let tailUp = 0;
    let mouth = 'smile';
    let eyeKind = 'normal';
    let pawOut = 0;
    let lift = [0, 0, 0, 0];
    let off = [0, 0, 0, 0];

    if (st.state === 'walk') {
      const ph = t * 14;
      bob = -Math.abs(Math.sin(ph)) * 2.2;
      off = [Math.sin(ph) * -5, Math.sin(ph) * 5, Math.sin(ph) * 5, Math.sin(ph) * -5];
      lift = [Math.max(0, Math.cos(ph)) * 4, Math.max(0, -Math.cos(ph)) * 4, Math.max(0, -Math.cos(ph)) * 4, Math.max(0, Math.cos(ph)) * 4];
    } else if (st.state === 'jump' || st.state === 'fall') {
      bob = -2;
      off = [-6, 7, -5, 8];
      lift = [3, 5, 3, 5];
      tailUp = st.state === 'jump' ? 8 : -4;
    } else if (st.state === 'attack') {
      const p = st.p;
      const k = p < 0.3 ? p / 0.3 : Math.max(0, 1 - (p - 0.3) / 0.7);
      lean = k * 5;
      pawOut = k;
      mouth = 'open';
      eyeKind = k > 0.5 ? 'angry' : 'normal';
    } else if (st.state === 'roar') {
      const k = Math.sin(Math.min(1, st.p * 1.6) * Math.PI);
      lean = -2 + k * 3;
      mouth = 'roar';
      eyeKind = 'closed';
      tailUp = 10 * k;
    } else if (st.state === 'dash') {
      stretch = 1.18;
      off = [-9, 10, -8, 11];
      lift = [4, 6, 4, 6];
      lean = 6;
      mouth = 'open';
      eyeKind = 'angry';
      tailUp = -6;
    } else if (st.state === 'hurt') {
      lean = -5;
      eyeKind = 'hurt';
      mouth = 'o';
    }

    ctx.save();
    ctx.scale(stretch, 1 / Math.sqrt(stretch));

    // 遠側的腳
    lionLeg(ctx, -11 + off[0], lift[0], true);
    lionLeg(ctx, 9 + off[1], lift[1], true);

    // 尾巴
    const sw = Math.sin(t * 4) * 3;
    const tip = [-33 + sw * 0.4, -38 + bob - tailUp];
    part(ctx, (c) => taper(c, [-17, -20 + bob], [-33, -20 + bob], tip, 3.2, 1.6), C.body, { lw: 1.2, rim: false });
    ctx.save();
    ctx.translate(tip[0], tip[1]);
    ctx.rotate(-0.35 + sw * 0.03);
    part(ctx, (c) => {
      c.moveTo(0, 4);
      c.bezierCurveTo(-8, 2, -7, -8, 1, -13);
      c.bezierCurveTo(0, -8, 7, -6, 6, 1);
      c.quadraticCurveTo(4, 5, 0, 4);
      c.closePath();
    }, C.maneFront, {
      lw: 1.2,
      grad: (c) => radial(c, -2, -6, 12, [[0, C.maneHi], [1, C.mane]]),
      shade: (c) => fillPath(c, (p) => p.ellipse(3, 3, 6, 3, 0, 0, Math.PI * 2), dark(C.mane, 0.15), 0.8),
    });
    ctx.restore();

    // 身體
    const lx = lean * 0.3;
    const body = (c) => {
      c.moveTo(12 + lx, -31 + bob);
      c.bezierCurveTo(19 + lx, -26 + bob, 19 + lx, -12 + bob, 12 + lx, -8 + bob);
      c.bezierCurveTo(4 + lx, -5 + bob, -10 + lx, -5 + bob, -16 + lx, -8 + bob);
      c.bezierCurveTo(-24 + lx, -11 + bob, -25 + lx, -24 + bob, -18 + lx, -29 + bob);
      c.bezierCurveTo(-12 + lx, -33 + bob, 4 + lx, -34 + bob, 12 + lx, -31 + bob);
      c.closePath();
    };
    part(ctx, body, C.body, {
      grad: (c) => radial(c, -6 + lx, -28 + bob, 34, [[0, C.bodyHi], [0.55, C.body], [1, dark(C.body, 0.08)]]),
      shade: (c) => {
        fillPath(c, (p) => p.ellipse(2 + lx, -4 + bob, 30, 9, 0, 0, Math.PI * 2), C.bodyLo, 0.9);
        fillPath(c, (p) => p.ellipse(-24 + lx, -16 + bob, 6, 14, 0, 0, Math.PI * 2), C.bodyLo, 0.55);
      },
      bounce: '#ffe0a8',
    });
    // 胸前的毛
    part(ctx, (c) => {
      c.moveTo(6 + lx, -31 + bob);
      c.bezierCurveTo(16 + lx, -29 + bob, 18 + lx, -21 + bob, 15 + lx, -15 + bob);
      c.lineTo(12.5 + lx, -18 + bob);
      c.lineTo(11 + lx, -14 + bob);
      c.lineTo(8.5 + lx, -18.5 + bob);
      c.lineTo(6 + lx, -15.5 + bob);
      c.bezierCurveTo(3 + lx, -21 + bob, 2 + lx, -28 + bob, 6 + lx, -31 + bob);
      c.closePath();
    }, C.cream, { lw: 1, back: false, shade: (c) => fillPath(c, (p) => p.ellipse(16 + lx, -18 + bob, 6, 8, 0, 0, Math.PI * 2), C.creamLo, 0.8) });

    // 近側的腳
    lionLeg(ctx, -7 + off[2], lift[2], false);
    lionLeg(ctx, 13 + off[3], lift[3], false);

    // 攻擊時伸出的前爪
    if (pawOut > 0) {
      const px = 24 + pawOut * 14;
      const py = -24 - pawOut * 6 + bob;
      part(ctx, (c) => c.ellipse(px, py, 7.5, 6.2, -0.2, 0, Math.PI * 2), C.body, { lw: 1.3, shade: (c) => fillPath(c, (p) => p.ellipse(px + 2, py + 4, 8, 4, 0, 0, Math.PI * 2), C.bodyLo) });
      ctx.fillStyle = '#fffaf0';
      ctx.strokeStyle = A.c('#6a4a3a');
      ctx.lineWidth = 0.8;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 5, py + i * 3.2 - 1.2);
        ctx.quadraticCurveTo(px + 11, py + i * 3.6, px + 12, py + i * 4 + 1.5);
        ctx.quadraticCurveTo(px + 8, py + i * 3.4 + 0.6, px + 5, py + i * 3.2 + 1.2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // ── 頭 ──
    const hx = 9 + lean;
    const hy = -46 + bob;
    const mx = hx - 3;
    const my = hy - 1;
    // 鬃毛後層
    part(ctx, (c) => maneContour(c, mx, my, 21, 26.5, 11, 0.2, 0.35), C.mane, {
      lw: 1.5,
      grad: (c) => radial(c, mx - 6, my - 8, 30, [[0, C.maneFront], [0.6, C.mane], [1, dark(C.mane, 0.15)]]),
      shade: (c) => fillPath(c, (p) => p.ellipse(mx + 6, my + 16, 26, 12, 0, 0, Math.PI * 2), dark(C.mane, 0.2), 0.8),
    });
    // 耳朵
    [[hx - 9, hy - 18.5, -0.3], [hx + 8, hy - 20, 0.25]].forEach(([ex, ey, r]) => {
      part(ctx, (c) => c.ellipse(ex, ey, 6.4, 6.8, r, 0, Math.PI * 2), C.maneFront, { lw: 1.2 });
      fillPath(ctx, (p) => p.ellipse(ex + 0.4, ey + 0.8, 3.2, 3.6, r, 0, Math.PI * 2), C.ear);
    });
    // 鬃毛紋理：幾道弧線，不另外畫一片片的毛
    ctx.strokeStyle = A.c(dark(C.mane, 0.28));
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    [1.9, 2.45, 3.0, 3.55, 4.1, 4.65].forEach((a) => {
      ctx.beginPath();
      ctx.arc(mx, my, 22, a, a + 0.28);
      ctx.stroke();
    });
    ctx.strokeStyle = A.c(C.maneHi);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(mx, my, 20.5, 3.6, 4.4);
    ctx.stroke();
    // 臉頰的毛（在頭後面露出來）
    part(ctx, (c) => {
      c.moveTo(hx - 12, hy + 3);
      c.lineTo(hx - 18, hy + 7);
      c.lineTo(hx - 13, hy + 8);
      c.lineTo(hx - 16, hy + 12);
      c.lineTo(hx - 9, hy + 11);
      c.lineTo(hx - 8, hy + 5);
      c.closePath();
    }, C.body, { lw: 1.1, rim: false });
    // 頭部
    const head = (c) => {
      c.moveTo(hx - 16, hy - 1);
      c.bezierCurveTo(hx - 17, hy - 17, hx + 13, hy - 20, hx + 17.5, hy - 5);
      c.bezierCurveTo(hx + 21, hy + 6, hx + 12, hy + 15, hx + 1, hy + 15);
      c.bezierCurveTo(hx - 11, hy + 15, hx - 16.5, hy + 8, hx - 16, hy - 1);
      c.closePath();
    };
    part(ctx, head, C.body, {
      grad: (c) => radial(c, hx - 5, hy - 9, 28, [[0, C.bodyHi], [0.55, C.body], [1, dark(C.body, 0.06)]]),
      shade: (c) => fillPath(c, (p) => p.ellipse(hx - 2, hy + 17, 20, 8, 0, 0, Math.PI * 2), C.bodyLo, 0.75),
      bounce: '#ffe0a8',
    });
    // 楓葉鬃毛
    mapleLeaf(ctx, hx, hy - 19, 8.5, -0.25);
    // 嘴邊
    part(ctx, (c) => {
      c.ellipse(hx + 10, hy + 7.5, 6.2, 4.8, 0, 0, Math.PI * 2);
    }, C.cream, { lw: 1, back: false, rim: false });
    part(ctx, (c) => {
      c.ellipse(hx + 16.5, hy + 6.8, 5.2, 4.4, 0, 0, Math.PI * 2);
    }, C.cream, { lw: 1, back: false, rim: false, shade: (c) => fillPath(c, (p) => p.ellipse(hx + 18, hy + 10, 6, 3, 0, 0, Math.PI * 2), C.creamLo, 0.7) });
    // 鼻子
    part(ctx, (c) => {
      c.moveTo(hx + 11.8, hy + 1.6);
      c.quadraticCurveTo(hx + 15.5, hy + 0.2, hx + 19.2, hy + 1.8);
      c.quadraticCurveTo(hx + 17.5, hy + 5.4, hx + 15.3, hy + 5.6);
      c.quadraticCurveTo(hx + 13, hy + 5.2, hx + 11.8, hy + 1.6);
      c.closePath();
    }, C.nose, { lw: 0.8, back: false, rim: false });
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(hx + 14.2, hy + 2.2, 1.5, 0.8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // 嘴
    ctx.strokeStyle = A.c('#4a2016');
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    if (mouth === 'smile') {
      ctx.beginPath();
      ctx.moveTo(hx + 15.3, hy + 5.6);
      ctx.lineTo(hx + 15.3, hy + 7.4);
      ctx.moveTo(hx + 11.5, hy + 7.6);
      ctx.quadraticCurveTo(hx + 13.4, hy + 9.6, hx + 15.3, hy + 7.4);
      ctx.quadraticCurveTo(hx + 17.2, hy + 9.6, hx + 19.2, hy + 7.4);
      ctx.stroke();
    } else {
      const big = mouth === 'roar' ? 5.2 : mouth === 'open' ? 3.6 : 2.2;
      part(ctx, (c) => c.ellipse(hx + 14.5, hy + 9.5, big * 0.95, big, 0, 0, Math.PI * 2), '#8a2424', { lw: 1, back: false, rim: false });
      if (big > 3) {
        fillPath(ctx, (p) => p.ellipse(hx + 14.5, hy + 9.5 + big * 0.5, big * 0.6, big * 0.4, 0, 0, Math.PI * 2), '#f07a7a');
        if (mouth === 'roar') {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(hx + 11.6, hy + 6);
          ctx.lineTo(hx + 12.8, hy + 9);
          ctx.lineTo(hx + 13.8, hy + 5.6);
          ctx.moveTo(hx + 16, hy + 5.6);
          ctx.lineTo(hx + 17, hy + 9);
          ctx.lineTo(hx + 18.2, hy + 6);
          ctx.fill();
        }
      }
    }
    // 眼睛
    eye(ctx, hx + 1.5, hy - 3.5, 3.9, 5.4, eyeKind, C.iris, 1);
    eye(ctx, hx + 11.5, hy - 4.2, 3.6, 5.1, eyeKind, C.iris, 1);
    blush(ctx, hx - 4.5, hy + 6.5, 5);
    ctx.restore();
  }

  const oldDrawLion = A.drawLion;
  A.drawLion = function (ctx, x, y, dir, st) {
    if (st.state === 'climb') return oldDrawLion(ctx, x, y, dir, st);
    ctx.save();
    ctx.translate(x, y);
    if (st.state === 'dead') {
      A.groundShadow(ctx, 0, 0, 30);
      ctx.translate(0, -14);
      ctx.rotate((-Math.PI / 2) * dir);
      ctx.translate(0, 14);
      ctx.scale(dir, 1);
      lionSide(ctx, { state: 'hurt', t: 0, p: 0 });
      ctx.restore();
      return;
    }
    if (st.onGround) A.groundShadow(ctx, 0, 0, 24);
    ctx.scale(dir, 1);
    lionSide(ctx, st);
    ctx.restore();
  };

  // ════════════════════ 菇系 ════════════════════
  const MUSH = [
    null,
    { R: 25, K: 1, cap: '#f39a3d', hi: '#ffd08a', lo: '#c8641e', spot: '#ffe2b0', stem: '#fff0d6', stemLo: '#e3c69c', gill: '#ecc998', iris: '#7a4a2a' },
    { R: 29, K: 1.14, cap: '#dc463a', hi: '#ff8e74', lo: '#9a2820', spot: '#fff6ec', stem: '#fff0d6', stemLo: '#e3c69c', gill: '#e6be92', iris: '#6a3a22' },
    { R: 30, K: 1.22, cap: '#a8e05a', hi: '#efffb2', lo: '#63a02e', spot: '#fbffe0', stem: '#ece8ff', stemLo: '#b9b2e6', gill: '#a8d4aa', iris: '#4a3a8a' },
  ];

  function blob(c, x, y, r, seed) {
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.82 + 0.28 * Math.abs(Math.sin(seed * 3.7 + i * 1.9)));
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.82;
      if (i === 0) c.moveTo(px, py);
      else {
        const am = a - Math.PI / n;
        c.quadraticCurveTo(x + Math.cos(am) * rr * 1.12, y + Math.sin(am) * rr * 0.92, px, py);
      }
    }
    c.closePath();
  }

  function mushroomR(ctx, m) {
    const s = m.def.stage;
    const P = MUSH[s];
    const K = P.K;
    const t = m.t;
    let sy = 1;
    if (!m.onGround) sy = m.vy < 0 ? 1.12 : 0.96;
    else if (m.landT > 0) sy = 0.8 + (1 - m.landT / 0.15) * 0.2;
    if (m.attackT > 0 && m.attackPhase === 'wind') sy = 0.86;
    const walk = m.onGround && Math.abs(m.vx || 0) > 5;
    const step = walk ? Math.sin(t * 12) : 0;
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);

    const top = -38 * K;
    const rim = top + 3 * K + Math.sin(t * 5) * 0.8;
    const R = P.R;

    if (s === 3) {
      const glow = 0.55 + Math.sin(t * 3) * 0.2;
      ctx.fillStyle = radial(ctx, 0, rim - R * 0.4, 90, [[0, 'rgba(210,255,130,' + (0.5 * glow).toFixed(3) + ')'], [1, 'rgba(210,255,130,0)']]);
      ctx.beginPath();
      ctx.arc(0, rim - R * 0.4, 90, 0, Math.PI * 2);
      ctx.fill();
    }

    // 腳
    [[-7 * K, Math.max(0, step) * 3.5], [7 * K, Math.max(0, -step) * 3.5]].forEach(([fx, lift]) => {
      part(ctx, (c) => c.ellipse(fx, -3.2 - lift, 7 * K, 4.2 * K, 0, 0, Math.PI * 2), U.mix(P.stem, P.stemLo, 0.45), { lw: 1.2, rim: false });
    });

    // 身體
    const body = (c) => {
      c.moveTo(-9 * K, top);
      c.bezierCurveTo(-15.5 * K, top + 14 * K, -15.5 * K, -6, -8.5 * K, -2);
      c.quadraticCurveTo(0, 1.2, 8.5 * K, -2);
      c.bezierCurveTo(15.5 * K, -6, 15.5 * K, top + 14 * K, 9 * K, top);
      c.quadraticCurveTo(0, top - 3 * K, -9 * K, top);
      c.closePath();
    };
    part(ctx, body, P.stem, {
      grad: (c) => radial(c, -5 * K, top + 10 * K, 34 * K, [[0, '#ffffff'], [0.5, P.stem], [1, U.mix(P.stem, P.stemLo, 0.5)]]),
      shade: (c) => {
        fillPath(c, (p) => p.ellipse(13 * K, -14 * K, 8 * K, 24 * K, -0.1, 0, Math.PI * 2), P.stemLo, 0.85);
        fillPath(c, (p) => p.ellipse(0, top + 1, 18 * K, 5 * K, 0, 0, Math.PI * 2), P.stemLo, 0.7);
        c.strokeStyle = A.c(U.mix(P.stem, P.stemLo, 0.6));
        c.lineWidth = 0.8;
        c.globalAlpha *= 0.6;
        c.beginPath();
        c.moveTo(-7 * K, top + 20 * K);
        c.quadraticCurveTo(-8 * K, top + 26 * K, -6.5 * K, top + 30 * K);
        c.moveTo(4 * K, top + 22 * K);
        c.quadraticCurveTo(5 * K, top + 27 * K, 3.5 * K, top + 31 * K);
        c.stroke();
      },
      bounce: '#fff6e0',
    });

    // 臉
    const kind = m.dead ? 'x' : m.hurtT > 0 ? 'hurt' : m.angry || m.attackT > 0 || (s === 2 && m.chargeT > 0) ? 'angry' : m.blink ? 'closed' : 'normal';
    const ey = top + 20 * K;
    eye(ctx, -1.5 * K, ey, 3.5 * K, 4.8 * K, kind, P.iris, 1);
    eye(ctx, 8.5 * K, ey - 0.4, 3.2 * K, 4.5 * K, kind, P.iris, 1);
    if (s === 2 && kind === 'normal') {
      ctx.strokeStyle = A.c('#3a1a0a');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-5.5 * K, ey - 7 * K);
      ctx.lineTo(1.5 * K, ey - 6 * K);
      ctx.moveTo(5.5 * K, ey - 6 * K);
      ctx.lineTo(11.5 * K, ey - 7.2 * K);
      ctx.stroke();
    }
    blush(ctx, -7 * K, ey + 6 * K, 4.2 * K);
    blush(ctx, 13.5 * K, ey + 5.5 * K, 3.2 * K);
    ctx.strokeStyle = A.c('#5a2616');
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    if (m.hurtT > 0 || m.attackT > 0) {
      part(ctx, (c) => c.ellipse(3.5 * K, ey + 8 * K, 2.4 * K, 2.8 * K, 0, 0, Math.PI * 2), '#8a2424', { lw: 1, back: false, rim: false });
    } else {
      ctx.beginPath();
      ctx.moveTo(1 * K, ey + 7 * K);
      ctx.quadraticCurveTo(3.5 * K, ey + 9.4 * K, 6 * K, ey + 7 * K);
      ctx.stroke();
    }

    // 傘蓋
    const tilt = walk ? step * 0.05 : 0;
    ctx.save();
    ctx.translate(0, rim);
    ctx.rotate(tilt);
    // 菌褶
    part(ctx, (c) => c.ellipse(0, 3 * K, R * 0.88, 5 * K, 0, 0, Math.PI * 2), P.gill, {
      lw: 1.1, rim: false,
      shade: (c) => {
        c.strokeStyle = A.c(dark(P.gill, 0.3));
        c.lineWidth = 0.7;
        for (let i = -9; i <= 9; i++) {
          c.beginPath();
          c.moveTo(i * R * 0.02, 1);
          c.lineTo(i * R * 0.095, 8 * K);
          c.stroke();
        }
        fillPath(c, (p) => p.ellipse(0, 1, R * 0.4, 3 * K, 0, 0, Math.PI * 2), dark(P.gill, 0.35), 0.6);
      },
    });
    const cap = (c) => {
      c.moveTo(-R, 0);
      c.bezierCurveTo(-R - 2, -R * 0.95, -R * 0.3, -R * 1.2, R * 0.15, -R * 1.12);
      c.bezierCurveTo(R * 0.75, -R * 1.02, R + 3, -R * 0.55, R + 2, -1);
      c.bezierCurveTo(R + 1, 4 * K, R * 0.6, 5 * K, 0, 4.5 * K);
      c.bezierCurveTo(-R * 0.6, 5 * K, -R - 1, 4 * K, -R, 0);
      c.closePath();
    };
    const spots = s === 1
      ? [[-11, -12, 5], [7, -18, 5.8], [-1, -25, 3.8], [17, -7, 3.4], [-19, -3, 2.6]]
      : s === 2
        ? [[-14, -11, 6.4], [9, -19, 7], [-3, -28, 4.8], [20, -7, 4.4], [-23, -3, 3.4], [2, -6, 3]]
        : [[-12, -13, 3.6], [7, -21, 4], [-2, -28, 3], [18, -9, 3], [-21, -4, 2.4]];
    part(ctx, cap, P.cap, {
      lw: 1.6,
      grad: (c) => radial(c, -R * 0.35, -R * 0.75, R * 1.6, [[0, P.hi], [0.45, P.cap], [1, dark(P.cap, 0.12)]]),
      shade: (c) => {
        // 下緣的陰影帶
        fillPath(c, (p) => p.ellipse(R * 0.18, R * 0.12, R * 1.25, R * 0.42, 0, 0, Math.PI * 2), P.lo, 0.85);
        // 斑點
        spots.forEach(([dx, dy, r], i) => {
          const x = dx * (R / 25);
          const y = dy * (R / 25);
          if (s === 3) {
            c.save();
            c.globalCompositeOperation = 'lighter';
            c.fillStyle = radial(c, x, y, r * 2.2, [[0, 'rgba(255,255,210,0.95)'], [1, 'rgba(255,255,210,0)']]);
            c.beginPath();
            c.arc(x, y, r * 2.2, 0, Math.PI * 2);
            c.fill();
            c.restore();
          }
          part(c, (p) => blob(p, x, y, r * (R / 25), i + s), P.spot, {
            lw: s === 2 ? 0.9 : 0.6,
            ink: s === 2 ? dark(P.spot, 0.35) : U.mix(P.cap, P.lo, 0.5),
            back: false,
            rim: false,
            shade: (p) => fillPath(p, (q) => q.ellipse(x + r * 0.4, y + r * 0.6, r * 1.1, r * 0.55, 0, 0, Math.PI * 2), U.mix(P.spot, P.lo, 0.35), 0.8),
          });
        });
        // 光澤
        c.fillStyle = radial(c, -R * 0.42, -R * 0.78, R * 0.42, [[0, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
        c.beginPath();
        c.ellipse(-R * 0.42, -R * 0.78, R * 0.42, R * 0.2, -0.5, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.85)';
        c.lineWidth = 1.6;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(0, -R * 0.1, R * 0.92, Math.PI * 1.18, Math.PI * 1.36);
        c.stroke();
      },
      rimCol: P.hi,
    });
    ctx.restore();
    ctx.restore();
  }

  // ════════════════════ 蝸牛系 ════════════════════
  function snailR(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    const hide = m.shellT > 0;
    const sx = hide ? 1 : 1 + Math.sin(t * 4) * 0.045;
    const B = s === 3 ? { c: '#e8cf9e', lo: '#c7a56e', hi: '#fff0cc' } : { c: '#f1dfb6', lo: '#d6bb86', hi: '#fff6de' };

    if (!hide) {
      ctx.save();
      ctx.scale(sx, 1);
      // 眼柄
      const stalk = (bx, tx, ty) => part(ctx, (c) => taper(c, [bx, -17], [bx - 1, -26], [tx, ty], 1.9, 1.3), B.c, { lw: 1, rim: false });
      stalk(17, 14, -32);
      // 身體
      const body = (c) => {
        c.moveTo(-26, 0);
        c.quadraticCurveTo(-31, -2.5, -25, -6);
        c.bezierCurveTo(-14, -10.5, 5, -10, 11, -12.5);
        c.bezierCurveTo(14, -25, 28.5, -27, 30.5, -14);
        c.bezierCurveTo(31.5, -6, 28, 0, 20, 0);
        c.closePath();
      };
      part(ctx, body, B.c, {
        grad: (c) => radial(c, 18, -20, 30, [[0, B.hi], [0.5, B.c], [1, B.lo]]),
        shade: (c) => {
          fillPath(c, (p) => p.ellipse(4, 1, 34, 4.5, 0, 0, Math.PI * 2), B.lo, 0.9);
          c.fillStyle = A.c(dark(B.c, 0.12));
          [[-18, -5], [-10, -6.5], [-2, -7], [6, -8], [26, -7]].forEach(([x, y]) => {
            c.beginPath();
            c.arc(x, y, 1, 0, Math.PI * 2);
            c.fill();
          });
        },
        bounce: '#fff2d0',
      });
      stalk(24, 27, -31);
      // 眼球
      [[14, -33.5, 4.4], [27, -32.5, 4.2]].forEach(([x, y, r]) => {
        part(ctx, (c) => c.arc(x, y, r, 0, Math.PI * 2), '#ffffff', { lw: 1.1, ink: '#6a4a30', rim: false, shade: (c) => fillPath(c, (p) => p.ellipse(x + 1, y + 2.6, r, r * 0.5, 0, 0, Math.PI * 2), '#e6e0f0') });
        if (m.dead) eye(ctx, x + 0.8, y, 2, 2, 'x');
        else if (m.blink) eye(ctx, x + 0.8, y + 0.5, 2.2, 2, 'closed');
        else eye(ctx, x + 1.2, y + 0.4, 2.1, 2.7, 'normal', '#6a4a2a', 1);
      });
      // 嘴與腮紅
      ctx.strokeStyle = A.c('#6a3a20');
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      if (m.hurtT > 0) {
        part(ctx, (c) => c.ellipse(24, -11, 2.2, 2.6, 0, 0, Math.PI * 2), '#8a2424', { lw: 0.9, back: false, rim: false });
      } else {
        ctx.beginPath();
        ctx.moveTo(21.5, -12);
        ctx.quadraticCurveTo(24, -9.5, 26.5, -12);
        ctx.stroke();
      }
      blush(ctx, 18, -13, 3.4);
      ctx.restore();
    }

    // 殼
    const cy = hide ? -16 : -21;
    if (s === 1) {
      const r = 15;
      part(ctx, (c) => c.arc(-5, cy, r, 0, Math.PI * 2), '#7cc8ee', {
        lw: 1.5, ink: '#2a5a80',
        grad: (c) => radial(c, -10, cy - 7, r * 1.5, [[0, '#f2fbff'], [0.35, '#9fdcf6'], [0.8, '#56a8dc'], [1, '#3a86c0']]),
        shade: (c) => {
          c.strokeStyle = 'rgba(255,255,255,0.55)';
          c.lineWidth = 1.6;
          c.beginPath();
          for (let a = 0.6; a < 8.6; a += 0.2) {
            const rr = 1.5 + a * 1.25;
            const x = -4 + Math.cos(a) * rr;
            const y = cy + 1 + Math.sin(a) * rr;
            a <= 0.6 ? c.moveTo(x, y) : c.lineTo(x, y);
          }
          c.stroke();
          c.strokeStyle = 'rgba(210,245,255,0.9)';
          c.lineWidth = 2.4;
          c.beginPath();
          c.arc(-5, cy, r - 3, 0.15 * Math.PI, 0.6 * Math.PI);
          c.stroke();
        },
        rimCol: '#e8f8ff',
      });
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-11, cy - 7, 4.2, 2.6, -0.6, 0, Math.PI * 2);
      ctx.fill();
      // 小星光
      const tw = 0.6 + Math.sin(t * 3) * 0.4;
      ctx.save();
      ctx.translate(1, cy - 9);
      ctx.scale(tw, tw);
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(0.9, -0.9);
      ctx.lineTo(4, 0);
      ctx.lineTo(0.9, 0.9);
      ctx.lineTo(0, 4);
      ctx.lineTo(-0.9, 0.9);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-0.9, -0.9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (s === 2) {
      const r = 17;
      const cx = -5;
      const yy = cy - 1;
      part(ctx, (c) => c.arc(cx, yy, r, 0, Math.PI * 2), '#b0804e', {
        lw: 1.5,
        grad: (c) => radial(c, cx - 7, yy - 8, r * 1.6, [[0, '#e6b882'], [0.5, '#b0804e'], [1, '#7a5230']]),
        shade: (c) => {
          c.lineCap = 'round';
          for (let pass = 0; pass < 2; pass++) {
            c.strokeStyle = pass ? 'rgba(255,230,190,0.55)' : A.c('#5e3c20');
            c.lineWidth = pass ? 1.2 : 2.2;
            c.beginPath();
            for (let a = 0; a < 10.5; a += 0.15) {
              const rr = 1.2 + a * 1.45;
              const x = cx + 1 + Math.cos(a) * rr + (pass ? -0.9 : 0);
              const y = yy + 1 + Math.sin(a) * rr + (pass ? -0.9 : 0);
              a === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
            }
            c.stroke();
          }
          fillPath(c, (p) => p.ellipse(cx + 6, yy + 12, 18, 7, 0, 0, Math.PI * 2), '#6e4526', 0.55);
        },
      });
      // 青苔
      part(ctx, (c) => {
        c.moveTo(cx - 17, yy - 4);
        const bumps = [[-15, -14], [-9, -18.5], [-2, -20], [5, -19], [11, -16], [15.5, -10]];
        let px = cx - 17;
        let py = yy - 4;
        bumps.forEach(([bx, by]) => {
          const x = cx + bx;
          const y = yy + by;
          c.quadraticCurveTo((px + x) / 2 - 2, (py + y) / 2 - 5, x, y);
          px = x;
          py = y;
        });
        c.quadraticCurveTo(cx + 18, yy - 6, cx + 16, yy - 4);
        c.bezierCurveTo(cx + 8, yy - 10, cx - 8, yy - 10, cx - 17, yy - 4);
        c.closePath();
      }, '#86b04e', {
        lw: 1.2,
        grad: (c) => radial(c, cx - 6, yy - 18, 24, [[0, '#c4e684'], [0.6, '#86b04e'], [1, '#5e8a34']]),
        shade: (c) => fillPath(c, (p) => p.ellipse(cx, yy - 5, 20, 4, 0, 0, Math.PI * 2), '#557e2e', 0.8),
      });
      // 小芽
      part(ctx, (c) => taper(c, [cx - 1, yy - 18], [cx - 2, yy - 24], [cx, yy - 29], 1.3, 0.9), '#6aa046', { lw: 0.9, rim: false });
      part(ctx, (c) => {
        c.moveTo(cx, yy - 28);
        c.quadraticCurveTo(cx - 6, yy - 36, cx - 12, yy - 30);
        c.quadraticCurveTo(cx - 6, yy - 27, cx, yy - 28);
        c.closePath();
      }, '#9fdc6a', { lw: 1 });
      part(ctx, (c) => {
        c.moveTo(cx, yy - 28);
        c.quadraticCurveTo(cx + 6, yy - 37, cx + 12, yy - 32);
        c.quadraticCurveTo(cx + 6, yy - 28, cx, yy - 28);
        c.closePath();
      }, '#9fdc6a', { lw: 1 });
    } else {
      const x0 = -25;
      const w = 38;
      const top = cy - 22;
      const bot = cy + 10;
      part(ctx, (c) => {
        c.moveTo(x0 + 2, top);
        c.lineTo(x0 + w - 2, top);
        c.bezierCurveTo(x0 + w + 1, top + 10, x0 + w + 2, bot - 8, x0 + w - 1, bot);
        c.quadraticCurveTo(x0 + w / 2, bot + 4, x0 + 1, bot);
        c.bezierCurveTo(x0 - 2, bot - 8, x0 - 1, top + 10, x0 + 2, top);
        c.closePath();
      }, '#8b5e3c', {
        lw: 1.6,
        grad: (c) => {
          const g = c.createLinearGradient(x0, 0, x0 + w, 0);
          g.addColorStop(0, A.c('#a8764c'));
          g.addColorStop(0.35, A.c('#94643e'));
          g.addColorStop(1, A.c('#5e3e24'));
          return g;
        },
        shade: (c) => {
          c.strokeStyle = A.c('#4e321c');
          c.lineWidth = 1.3;
          c.lineCap = 'round';
          for (let i = 0; i < 5; i++) {
            const xx = x0 + 5 + i * 7.5;
            c.beginPath();
            c.moveTo(xx, top + 4);
            c.bezierCurveTo(xx + 2, top + 12, xx - 2, bot - 12, xx + 1, bot - 2);
            c.stroke();
          }
          c.strokeStyle = 'rgba(255,220,170,0.35)';
          c.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            const xx = x0 + 3 + i * 7.5;
            c.beginPath();
            c.moveTo(xx, top + 6);
            c.bezierCurveTo(xx + 2, top + 13, xx - 2, bot - 12, xx + 1, bot - 4);
            c.stroke();
          }
          fillPath(c, (p) => p.ellipse(x0 + w * 0.2, bot + 2, 10, 6, 0, 0, Math.PI * 2), '#7aa046', 0.9);
        },
      });
      // 年輪頂面
      part(ctx, (c) => c.ellipse(x0 + w / 2, top, w / 2, 6, 0, 0, Math.PI * 2), '#e3be86', {
        lw: 1.3,
        grad: (c) => radial(c, x0 + w * 0.35, top - 2, w * 0.6, [[0, '#f6dcaa'], [1, '#c9a068']]),
        shade: (c) => {
          c.strokeStyle = A.c('#b48a52');
          c.lineWidth = 0.9;
          [0.72, 0.48, 0.24].forEach((k) => {
            c.beginPath();
            c.ellipse(x0 + w / 2 + 1, top + 0.3, (w / 2) * k, 6 * k, 0, 0, Math.PI * 2);
            c.stroke();
          });
        },
      });
      // 小蘑菇與小草
      [[x0 + 9, top - 1, 1], [x0 + 20, top - 2, 1.25], [x0 + 29, top, 0.8]].forEach(([mx2, my2, k], i) => {
        part(ctx, (c) => {
          c.moveTo(mx2 - 1.8 * k, my2);
          c.lineTo(mx2 - 1.4 * k, my2 - 7 * k);
          c.lineTo(mx2 + 1.4 * k, my2 - 7 * k);
          c.lineTo(mx2 + 1.8 * k, my2);
          c.closePath();
        }, '#fff0d6', { lw: 0.9, rim: false });
        part(ctx, (c) => {
          c.moveTo(mx2 - 6 * k, my2 - 6.5 * k);
          c.bezierCurveTo(mx2 - 6 * k, my2 - 13 * k, mx2 + 6 * k, my2 - 13 * k, mx2 + 6 * k, my2 - 6.5 * k);
          c.quadraticCurveTo(mx2, my2 - 5 * k, mx2 - 6 * k, my2 - 6.5 * k);
          c.closePath();
        }, i === 1 ? '#e0513a' : '#f08a3a', {
          lw: 1,
          shade: (c) => {
            c.fillStyle = 'rgba(255,245,230,0.95)';
            c.beginPath();
            c.arc(mx2 - 2 * k, my2 - 10 * k, 1.1 * k, 0, Math.PI * 2);
            c.arc(mx2 + 2.5 * k, my2 - 9 * k, 0.9 * k, 0, Math.PI * 2);
            c.fill();
          },
        });
      });
      ctx.strokeStyle = A.c('#5f9a3a');
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0 + w - 3, top);
      ctx.quadraticCurveTo(x0 + w + 2, top - 8, x0 + w + 6, top - 9);
      ctx.moveTo(x0 + w - 4, top);
      ctx.quadraticCurveTo(x0 + w - 2, top - 10, x0 + w + 1, top - 13);
      ctx.stroke();
    }
  }

  A.MONSTER_DRAW.mushroom = mushroomR;
  A.MONSTER_DRAW.snail = snailR;
  A.refined = { part, eye, blush, taper, lockPath, radial, fillPath };
})();
