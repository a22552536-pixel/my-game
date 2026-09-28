// 第四章、終章 Boss 的美術：霜靈、時間（註冊到 A.MONSTER_DRAW）。
// 風格與 monsters2.js 相同：平塗、深棕描邊、月牙陰影、高光；顏色都經過 A.c()（受擊閃白）。
// 原點在腳底中央、面向右（+x）；翻轉、閃白、淡出由 A.drawMonster 處理。
// 這兩隻是全遊戲最重要的 Boss：畫得大、姿勢跟著招式變（預警姿勢要一眼看得出來），第二階段換一個樣子。
//   霜靈：設計尺寸 300 高（約 360×330），m.h 等比例縮放。
//   時間：設計尺寸 380 高（約 400×400，懸空），錶盤中心 (0,-228) 要和 boss3.js 的 pivot() 一致。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const PI = Math.PI;
  const TAU = PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;

  function glow(ctx, x, y, r, rgb, a) {
    if (a <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  // 帶描邊的粗線
  function limb(ctx, path, w, col) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = Math.max(1, w - 5);
    ctx.stroke();
  }
  function prog(m) {
    return clamp(1 - (m.stateT || 0) / (m.stateT0 || 1), 0, 1);
  }
  // 偽亂數（固定種子，畫星星用）
  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function starPath(c, x, y, r1, r2, n) {
    for (let i = 0; i < n * 2; i++) {
      const a = -PI / 2 + (i * PI) / n;
      const r = i % 2 ? r2 : r1;
      i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }
  function gearPath(c, x, y, r, teeth, rot) {
    const n = teeth * 4;
    for (let i = 0; i <= n; i++) {
      const a = rot + (i / n) * TAU;
      const rr = i % 4 < 2 ? r : r * 0.82;
      i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.moveTo(x + r * 0.35, y);
    c.arc(x, y, r * 0.35, 0, TAU, true);
  }

  // ───────── 幾何小工具（多邊形一律順時針，拼起來的剪影用 nonzero 才不會破洞）─────────
  function qpt(p, s) {
    const u = 1 - s;
    return [u * u * p[0] + 2 * u * s * p[2] + s * s * p[4], u * u * p[1] + 2 * u * s * p[3] + s * s * p[5]];
  }
  function qtan(p, s) {
    const dx = 2 * (1 - s) * (p[2] - p[0]) + 2 * s * (p[4] - p[2]);
    const dy = 2 * (1 - s) * (p[3] - p[1]) + 2 * s * (p[5] - p[3]);
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }
  function cub(p, s) {
    const u = 1 - s;
    const a = u * u * u;
    const b = 3 * u * u * s;
    const c = 3 * u * s * s;
    const d = s * s * s;
    return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7]];
  }
  function areaOf(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a / 2;
  }
  function cw(pts) {
    return areaOf(pts) < 0 ? pts.reverse() : pts;
  }
  // 沿二次曲線、粗細 w0→w1 的錐形（圓頭）
  function taperPts(p, w0, w1, n) {
    n = n || 10;
    const L = [];
    const R = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const q = qpt(p, s);
      const d = qtan(p, s);
      const w = lerp(w0, w1, s) / 2;
      L.push([q[0] - d[1] * w, q[1] + d[0] * w]);
      R.push([q[0] + d[1] * w, q[1] - d[0] * w]);
    }
    const e = qpt(p, 1);
    const d = qtan(p, 1);
    const w = w1 / 2;
    const tip = [];
    for (let i = 1; i < 4; i++) {
      const a = (i / 4) * PI;
      // 從 L 端繞到 R 端的半圓
      const nx = -d[1] * Math.cos(a) + d[0] * Math.sin(a);
      const ny = d[0] * Math.cos(a) + d[1] * Math.sin(a);
      tip.push([e[0] + nx * w, e[1] + ny * w]);
    }
    return cw(L.concat(tip, R.reverse()));
  }
  function ellPts(x, y, rx, ry, rot, n) {
    n = n || 28;
    const out = [];
    const cr = Math.cos(rot || 0);
    const sr = Math.sin(rot || 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      out.push([x + ex * cr - ey * sr, y + ex * sr + ey * cr]);
    }
    return cw(out);
  }
  function cubPts(segs, n) {
    const out = [];
    segs.forEach((sg) => {
      for (let i = 0; i < (n || 8); i++) out.push(cub(sg, i / (n || 8)));
    });
    return cw(out);
  }
  function poly(pts) {
    return (c) => {
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.closePath();
    };
  }
  // 平滑的封閉曲線（用中點二次曲線）
  function smooth(pts) {
    return (c) => {
      const n = pts.length;
      const mid = (i) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
      const m0 = mid(n - 1);
      c.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) {
        const m1 = mid(i);
        c.quadraticCurveTo(pts[i][0], pts[i][1], m1[0], m1[1]);
      }
      c.closePath();
    };
  }
  // 不規則的團塊（苔蘚、雪堆）
  function blobPts(x, y, rx, ry, seed, n) {
    n = n || 9;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const r = 0.75 + hash(seed + i) * 0.35;
      out.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]);
    }
    return out;
  }
  function rgba(rgb, a) {
    return 'rgba(' + rgb + ',' + clamp(a, 0, 1).toFixed(3) + ')';
  }
  function sparkle(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  // 跟 A.shape 一樣的畫法（填色 → 月牙陰影 → 高光 → 描邊），但陰影只填形狀本身的範圍：
  // A.shape 每次都鋪一張 1000×1000 的陰影再 clip，這兩隻 Boss 有上百個小零件，會很慢。
  function sh(ctx, path, fill, shade, opts) {
    opts = opts || {};
    ctx.beginPath();
    path(ctx);
    if (shade && opts.cel) {
      ctx.fillStyle = A.c(shade);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.translate(-opts.cel[0], -opts.cel[1]);
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(fill);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = A.c(fill);
      ctx.fill();
      if (shade) {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = A.c(shade);
        const sy = opts.shadeY != null ? opts.shadeY : 0;
        ctx.fillRect(-460, sy, 920, 420);
        ctx.restore();
      }
    }
    if (opts.hl) {
      ctx.save();
      ctx.globalAlpha *= 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(opts.hl[0], opts.hl[1], opts.hl[2], opts.hl[3], -0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    if (opts.noStroke) return;
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = opts.lw || A.LW;
    ctx.strokeStyle = A.outline();
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  function ell(ctx, x, y, rx, ry, fill, shade, opts) {
    opts = opts || {};
    const rot = opts.rot || 0;
    sh(ctx, (c) => c.ellipse(x, y, rx, ry, rot, 0, TAU), fill, shade, {
      shadeY: y + ry * (opts.shadeAt != null ? opts.shadeAt : 0.35),
      hl: opts.hl === false ? null : opts.hl || [x - rx * 0.35, y - ry * 0.45, rx * 0.25, ry * 0.16],
      lw: opts.lw,
      noStroke: opts.noStroke,
      cel: opts.cel,
    });
  }

  // 一大堆小圓點（星、星沙、雪）：依透明度分四桶，每桶一次 fill，draw call 少很多
  const DOT = [[], [], [], []];
  function dot(x, y, r, a) {
    if (!(a > 0.04) || r <= 0) return;
    DOT[Math.min(3, (a * 4) | 0)].push(x, y, r);
  }
  function dotFlush(ctx, col) {
    const ga = ctx.globalAlpha;
    ctx.fillStyle = col;
    for (let k = 0; k < 4; k++) {
      const b = DOT[k];
      if (!b.length) continue;
      ctx.globalAlpha = (ga * (k + 0.6)) / 4;
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 3) {
        ctx.moveTo(b[i] + b[i + 2], b[i + 1]);
        ctx.arc(b[i], b[i + 1], b[i + 2], 0, TAU);
      }
      ctx.fill();
      b.length = 0;
    }
    ctx.globalAlpha = ga;
  }

  // ═════════════════════════ 霜靈 ═════════════════════════
  // 雪峰的山靈：冰河結晶的巨鹿，背脊是積雪的山稜（上面長著小小的雪松），鹿角是掛滿冰雪的古老枝椏，
  // 鬃毛裡流著極光；角上用注連繩吊著神社的巨鐘；透明的冰裡睡著白角鹿（小鹿的媽媽）。
  // 第二階段「裂鐘」：鐘裂開透光、冰的身體變深藍且裂出冷光、背上的雪松被冰棱吞掉、極光變成紫紅的風暴。
  const FS = {
    body: '#d8eefc', bodyS: '#7eaede', far: '#8cb2de', farS: '#5a7fb8', crev: '#4a78b8',
    body2: '#b2d4f6', bodyS2: '#5a8ad4', far2: '#7098d4', farS2: '#4264aa', crev2: '#2c469c',
    snow: '#ffffff', snowS: '#cfe3f5', hoof: '#3c4a62',
    bark: '#cfe4f6', barkS: '#7fa8d4', barkF: '#9dbde0', barkFS: '#6488bc', barkD: '#4e6f9c',
    pine: '#3f7072', pineS: '#2a5058',
    bell: '#4f8272', bellS: '#2e5a4c', bellD: '#1d3b33', bellL: '#8cc6aa', rim: '#e0bc5c',
    rope: '#ecd9a6', ropeS: '#b9985c', tassel: '#d8404e', tasselS: '#9a2634',
    doe: '#fbf4ea', doeS: '#e2d2bc', muzzle: '#56749e', nose: '#27365a',
  };

  // 冰裡睡著的白角鹿（小鹿的媽媽）
  function frozenDoe(ctx, x, y, s, t, wake) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const br = Math.sin(t * 0.8) * 0.8;
    ell(ctx, -34, 26, 20, 9, FS.doeS, null, { lw: 2.6, hl: false });
    ell(ctx, 26, 28, 22, 8, FS.doeS, null, { lw: 2.6, hl: false });
    ell(ctx, -6, 6 + br, 64, 30, FS.doe, FS.doeS, { cel: [4, 4] });
    ctx.fillStyle = A.c('#efe2cf');
    [[-30, -8], [-12, -14], [8, -12], [-40, 4]].forEach(([a, b]) => {
      ctx.beginPath();
      ctx.arc(a, b + br, 4, 0, TAU);
      ctx.fill();
    });
    ell(ctx, -68, -4, 9, 7, '#ffffff', FS.doeS, { lw: 2.4, hl: false });
    sh(ctx, (c) => {
      c.moveTo(30, -12 + br);
      c.quadraticCurveTo(58, -26, 66, -2);
      c.lineTo(52, 12);
      c.quadraticCurveTo(44, 0, 30, 10);
      c.closePath();
    }, FS.doe, FS.doeS, { lw: 2.6, cel: [3, 3] });
    const hx = 62;
    const hy = 6;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy - 14);
    ctx.quadraticCurveTo(hx - 14, hy - 34, hx - 30, hy - 40);
    ctx.moveTo(hx - 11, hy - 27);
    ctx.lineTo(hx - 4, hy - 36);
    ctx.stroke();
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 2.5;
    ctx.stroke();
    sh(ctx, (c) => {
      c.moveTo(hx - 12, hy - 8);
      c.quadraticCurveTo(hx - 30, hy - 18, hx - 34, hy - 10);
      c.quadraticCurveTo(hx - 24, hy - 2, hx - 12, hy - 2);
      c.closePath();
    }, FS.doe, FS.doeS, { lw: 2.4, shadeY: hy - 6 });
    ell(ctx, hx, hy, 17, 13, FS.doe, FS.doeS, { cel: [2, 2] });
    ell(ctx, hx + 14, hy + 5, 10, 7, '#fffaf2', null, { lw: 2.2, hl: false });
    ctx.fillStyle = A.c('#5a4034');
    ctx.beginPath();
    ctx.arc(hx + 22, hy + 3, 2.6, 0, TAU);
    ctx.fill();
    if (wake) A.eye(ctx, hx + 2, hy - 2, 3, 4, 'normal', 1);
    else A.eye(ctx, hx + 2, hy - 1, 4, 3, 'closed');
    A.blush(ctx, hx + 2, hy + 6, 4);
    ctx.restore();
  }

  // 神社的巨鐘（梵鐘）：粗注連繩＋紙垂＋紅流蘇；p2 裂開透光
  function shrineBell(ctx, rot, t, cracked, ring, P2) {
    ctx.save();
    ctx.rotate(rot);
    // 注連繩：兩股麻繩絞在一起
    const rl = 30;
    limb(ctx, (c) => {
      c.moveTo(0, -4);
      c.lineTo(0, rl);
    }, 19, FS.rope);
    ctx.strokeStyle = A.c(FS.ropeS);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      ctx.moveTo(-6.5, -2 + i * 5.5);
      ctx.quadraticCurveTo(0, 0 + i * 5.5, 6.5, 4 + i * 5.5);
    }
    ctx.stroke();
    // 繩結（纏在角上的那一圈，粗的注連繩）
    ell(ctx, 0, -5, 20, 10, FS.rope, FS.ropeS, { lw: 2.8, hl: false, cel: [2, 3] });
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(i * 5.5 - 2, -13 + Math.abs(i) * 0.8);
      ctx.quadraticCurveTo(i * 5.5, -5, i * 5.5 + 2, 3 - Math.abs(i) * 0.8);
    }
    ctx.stroke();
    // 紅流蘇（左右各一，比鐘晃得更大）
    [-1, 1].forEach((d) => {
      const sw = Math.sin(t * 2.4 + d) * 0.12 + ring * 0.2 * Math.sin(t * 9 + d);
      ctx.save();
      ctx.translate(d * 7, 8);
      ctx.rotate(-rot * 0.5 + sw + d * 0.12);
      limb(ctx, (c) => {
        c.moveTo(0, 0);
        c.quadraticCurveTo(d * 10, 20, d * 12, 44);
      }, 5, FS.tassel);
      ell(ctx, d * 12, 46, 6, 5, FS.rim, '#9a8040', { lw: 2, hl: false });
      sh(ctx, (c) => {
        c.moveTo(d * 12 - 6, 49);
        c.lineTo(d * 12 - 9, 78);
        c.quadraticCurveTo(d * 12, 84, d * 12 + 9, 78);
        c.lineTo(d * 12 + 6, 49);
        c.closePath();
      }, FS.tassel, FS.tasselS, { lw: 2.2, cel: [3, 0] });
      ctx.strokeStyle = A.c('#ff8a8a');
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(d * 12 - 3, 54);
      ctx.lineTo(d * 12 - 4, 76);
      ctx.moveTo(d * 12 + 2, 54);
      ctx.lineTo(d * 12 + 2, 78);
      ctx.stroke();
      ctx.restore();
    });
    // 紙垂（閃電形白紙）
    [-1, 1].forEach((d) => {
      sh(ctx, (c) => {
        c.moveTo(d * 16, -6);
        c.lineTo(d * 26, -4);
        c.lineTo(d * 22, 6);
        c.lineTo(d * 31, 8);
        c.lineTo(d * 25, 19);
        c.lineTo(d * 33, 21);
        c.lineTo(d * 26, 34);
        c.lineTo(d * 21, 22);
        c.lineTo(d * 16, 21);
        c.closePath();
      }, '#ffffff', '#dde8f2', { lw: 1.8, hl: false, shadeY: 16 });
      sh(ctx, (c) => {
        c.moveTo(d * 4, 12);
        c.lineTo(d * 16, 12);
        c.lineTo(d * 11, 22);
        c.lineTo(d * 20, 23);
        c.lineTo(d * 14, 34);
        c.lineTo(d * 22, 35);
        c.lineTo(d * 14, 48);
        c.lineTo(d * 9, 36);
        c.lineTo(d * 4, 36);
        c.closePath();
      }, '#ffffff', '#dde8f2', { lw: 1.8, hl: false, shadeY: 30 });
    });
    const top = rl + 2;
    const H = 90;
    // 龍頭環
    sh(ctx, (c) => {
      c.moveTo(-12, top + 6);
      c.bezierCurveTo(-14, top - 10, 14, top - 10, 12, top + 6);
      c.lineTo(6, top + 6);
      c.bezierCurveTo(7, top - 3, -7, top - 3, -6, top + 6);
      c.closePath();
    }, FS.bell, FS.bellS, { lw: 2.6, hl: false });
    const body = (c) => {
      c.moveTo(-27, top + 12);
      c.bezierCurveTo(-27, top - 7, 27, top - 7, 27, top + 12);
      c.bezierCurveTo(31, top + 40, 31, top + H - 24, 37, top + H - 8);
      c.quadraticCurveTo(46, top + H - 4, 46, top + H);
      c.lineTo(-46, top + H);
      c.quadraticCurveTo(-46, top + H - 4, -37, top + H - 8);
      c.bezierCurveTo(-31, top + H - 24, -31, top + 40, -27, top + 12);
      c.closePath();
    };
    if (ring > 0.2) glow(ctx, 0, top + H * 0.55, 90 + ring * 50, P2 ? '150,220,255' : '210,245,255', 0.5 * ring);
    sh(ctx, body, FS.bell, FS.bellS, { cel: [10, 0] });
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    // 銅綠的垂流痕
    ctx.fillStyle = A.c(FS.bellL);
    ctx.globalAlpha = 0.5;
    [[-18, 30, 5], [-6, 40, 4], [14, 26, 5], [22, 50, 3]].forEach(([x, l, w]) => {
      ctx.beginPath();
      ctx.moveTo(x - w, top + 8);
      ctx.quadraticCurveTo(x - w * 0.6, top + 8 + l * 0.7, x, top + 8 + l);
      ctx.quadraticCurveTo(x + w * 0.6, top + 8 + l * 0.7, x + w, top + 8);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // 袈裟襷（格子帶）
    ctx.strokeStyle = A.c(FS.bellD);
    ctx.lineWidth = 3;
    [top + 22, top + H - 22, top + H - 15].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(-48, y);
      ctx.lineTo(48, y);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(0, top + 22);
    ctx.lineTo(0, top + H - 22);
    ctx.moveTo(-20, top + 22);
    ctx.lineTo(-22, top + H - 22);
    ctx.moveTo(20, top + 22);
    ctx.lineTo(22, top + H - 22);
    ctx.stroke();
    // 刻在鐘身上的古文（發著冷光的符文，鐘響時更亮）
    {
      const rk = clamp(0.55 + 0.25 * Math.sin(t * 2.2) + ring * 0.5 + (P2 ? 0.3 : 0), 0, 1.2);
      const glyph = (c, x, y, g) => {
        const S = 5.5;
        const L = (a, b, cc, d) => {
          c.moveTo(x + a * S, y + b * S);
          c.lineTo(x + cc * S, y + d * S);
        };
        if (g === 0) { L(-1, -1, 1, -1); L(0, -1.4, 0, 1.2); L(-1, 0.2, 1, 0.2); L(-0.8, 1.2, 0.8, 1.2); }
        else if (g === 1) { L(-1, -1.2, -1, 1.2); L(-1, -1.2, 1, -1.2); L(1, -1.2, 1, 1.2); L(-1, 0, 1, 0); L(-0.3, 0.6, 0.6, 1.2); }
        else if (g === 2) { L(0, -1.4, 0, -0.6); L(-1.1, -0.6, 1.1, -0.6); L(-0.8, -0.6, -1, 1.2); L(0.8, -0.6, 1, 1.2); L(-0.5, 0.4, 0.5, 0.4); }
        else { L(-1, -1, 1, 1.2); L(1, -1, -1, 1.2); L(-1.2, 0.1, 1.2, 0.1); L(0, -1.4, 0, -0.9); }
      };
      const runes = (c) => {
        [[-11, top + 32, 0], [-11, top + 50, 2], [11, top + 32, 1], [11, top + 50, 3], [-33, top + 40, 3], [33, top + 40, 0]].forEach(([x, y, g]) => glyph(c, x, y, g));
      };
      ctx.lineCap = 'round';
      ctx.beginPath();
      runes(ctx);
      ctx.strokeStyle = rgba(P2 ? '120,220,255' : '110,235,255', 0.35 * rk);
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = rgba('215,252,255', 0.95 * Math.min(1, rk));
      ctx.lineWidth = 1.9;
      ctx.stroke();
    }
    // 撞座（蓮花）
    ell(ctx, -10, top + H - 34, 8, 8, '#a8d0bc', FS.bellS, { lw: 2.2, hl: false });
    ell(ctx, -10, top + H - 34, 3.5, 3.5, FS.bellD, null, { noStroke: true, hl: false });
    // 口緣的金色
    ctx.fillStyle = A.c(FS.rim);
    ctx.fillRect(-50, top + H - 8, 100, 8);
    ctx.fillRect(-30, top + 4, 60, 4);
    // 霜花
    ctx.fillStyle = 'rgba(240,250,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-20, top + 16, 10, 5, -0.3, 0, TAU);
    ctx.ellipse(18, top + 60, 7, 4, 0.4, 0, TAU);
    ctx.fill();
    // 雪帽
    sh(ctx, (c) => {
      c.moveTo(-40, top + 8);
      c.bezierCurveTo(-30, top - 8, 30, top - 8, 40, top + 8);
      c.quadraticCurveTo(28, top + 16, 18, top + 11);
      c.quadraticCurveTo(10, top + 20, 0, top + 12);
      c.quadraticCurveTo(-12, top + 18, -22, top + 12);
      c.quadraticCurveTo(-32, top + 16, -40, top + 8);
      c.closePath();
    }, '#ffffff', FS.snowS, { lw: 2.4, hl: false, shadeY: top + 9 });
    ctx.restore();
    // 冰柱
    [[-36, 8], [-22, 14], [-8, 9], [10, 16], [26, 10], [38, 6]].forEach(([x, l]) => {
      const L = l * (P2 ? 1.4 : 1) + Math.sin(t * 2 + x) * 1.2;
      sh(ctx, (c) => {
        c.moveTo(x - 3.5, top + H - 1);
        c.lineTo(x, top + H + L);
        c.lineTo(x + 3.5, top + H - 1);
        c.closePath();
      }, '#eaf7ff', null, { lw: 1.8, hl: false });
    });
    if (cracked > 0) {
      const k = clamp(cracked, 0, 1);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const crack = (c) => {
        c.moveTo(8, top + H);
        c.lineTo(15, top + H - 18);
        c.lineTo(4, top + H - 34);
        c.lineTo(13, top + H * 0.42);
        c.lineTo(2, top + 12);
        c.moveTo(4, top + H - 34);
        c.lineTo(-12, top + H - 48);
        c.lineTo(-20, top + H - 70);
        c.moveTo(13, top + H * 0.42);
        c.lineTo(27, top + H * 0.34);
        c.moveTo(15, top + H - 18);
        c.lineTo(30, top + H - 22);
      };
      ctx.globalAlpha = k;
      glow(ctx, 8, top + H * 0.55, 70, '140,230,255', 0.5 * k + Math.sin(t * 5) * 0.08);
      ctx.beginPath();
      crack(ctx);
      ctx.strokeStyle = 'rgba(160,235,255,0.6)';
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = A.c('#e8fbff');
      ctx.lineWidth = 2.6;
      ctx.stroke();
      // 缺了一角：從缺口透出冷光
      sh(ctx, (c) => {
        c.moveTo(18, top + H);
        c.lineTo(23, top + H - 13);
        c.lineTo(34, top + H - 9);
        c.lineTo(38, top + H);
        c.closePath();
      }, '#1c2c48', null, { lw: 2.4 });
      ctx.fillStyle = 'rgba(170,240,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(21, top + H);
      ctx.lineTo(10, top + H + 60);
      ctx.lineTo(56, top + H + 60);
      ctx.lineTo(36, top + H);
      ctx.closePath();
      ctx.globalAlpha = k * 0.35;
      ctx.fill();
      ctx.restore();
    }
    // 鐘聲的波紋
    if (ring > 0.3) {
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.8 + i / 3) % 1;
        ctx.strokeStyle = rgba('235,250,255', (1 - q) * 0.8 * Math.min(1, ring));
        ctx.beginPath();
        ctx.ellipse(0, top + H * 0.55, 50 + q * 90, 40 + q * 70, 0, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── 鹿角：古老的銀白枝椏，枝上積雪、下面垂冰柱、枝梢長冰晶 ──
  const ANT = (() => {
    const S = [];
    // 一株結冰的小樹：主幹往上，兩層斜斜往上的枝
    const tree = (bx, by, h, lean, w, seed) => {
      const p = [bx, by, bx + lean * 0.3, by - h * 0.5, bx + lean, by - h];
      S.push({ p, w0: w, w1: Math.max(3, w * 0.42), tip: 1 });
      [[0.5, 0.36]].forEach(([u, l], j) => {
        const q = qpt(p, u);
        [-1, 1].forEach((d, i) => {
          if (j === 1 && hash(seed + i) < 0.3) return;
          const a = -PI / 2 + d * (0.75 + hash(seed + i + j * 3) * 0.2) + lean * 0.004;
          const L = h * l * (0.8 + hash(seed + i + 5) * 0.4);
          const ex = q[0] + Math.cos(a) * L;
          const ey = q[1] + Math.sin(a) * L;
          S.push({ p: [q[0], q[1], (q[0] + ex) / 2 + d * 2, (q[1] + ey) / 2 + 3, ex, ey], w0: w * 0.6, w1: 3.4, tip: 2 });
        });
      });
    };
    S.push({ p: [0, 0, -8, -26, -30, -44], w0: 25, w1: 19 });
    S.push({ p: [-30, -44, -62, -62, -104, -62], w0: 19, w1: 14 });
    S.push({ p: [-104, -62, -144, -62, -178, -84], w0: 14, w1: 7, tip: 1 });
    // 眉叉（往前伸）
    S.push({ p: [-4, -20, 18, -26, 42, -50], w0: 12, w1: 5, tip: 1 });
    S.push({ p: [22, -30, 30, -44, 28, -60], w0: 7, w1: 3.4, tip: 2 });
    tree(-26, -40, 58, 8, 14, 11);
    tree(-64, -58, 72, 2, 14, 21);
    tree(-104, -62, 62, -6, 12.5, 31);
    tree(-142, -66, 48, -10, 10, 41);
    return S;
  })();
  const ANT_HANG = qpt(ANT[1].p, 0.85); // 鐘掛在這裡
  const ANT_SC = 0.86;

  // rotW：角在世界裡的轉角（算「往上」用：雪積在上面、冰柱往下垂）
  function frostAntler(ctx, far, glowK, t, p2, rotW) {
    const P2 = p2 > 0.5;
    const bark = far ? FS.barkF : FS.bark;
    const barkS = far ? FS.barkFS : FS.barkS;
    const ux = -Math.sin(rotW);
    const uy = -Math.cos(rotW);
    ctx.save();
    ctx.scale(ANT_SC, ANT_SC);
    if (glowK > 0) glow(ctx, -40, -90, 150, P2 ? '140,210,255' : '180,240,255', 0.45 * glowK);
    const segs = ANT.map((s) => taperPts(s.p, s.w0, s.w1, 9));
    // 描邊一次畫完（接縫就不會有線）
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 6;
    ctx.beginPath();
    segs.forEach((sp) => poly(sp)(ctx));
    ctx.stroke();
    // 填色：所有枝都是順時針的多邊形，拼成一個 path 一次填
    ctx.fillStyle = A.c(bark);
    ctx.beginPath();
    segs.forEach((sp) => poly(sp)(ctx));
    ctx.fill();
    // 沿著一枝畫一條偏向上／下側的線（side：+1 朝上、-1 朝下）
    const edge = (c, s, side, k, u0, u1) => {
      for (let i = 0; i <= 5; i++) {
        const u = lerp(u0, u1, i / 5);
        const q = qpt(s.p, u);
        const d = qtan(s.p, u);
        let nx = -d[1];
        let ny = d[0];
        if ((nx * ux + ny * uy) * side < 0) {
          nx = -nx;
          ny = -ny;
        }
        const w = lerp(s.w0, s.w1, u) * k;
        i ? c.lineTo(q[0] + nx * w, q[1] + ny * w) : c.moveTo(q[0] + nx * w, q[1] + ny * w);
      }
    };
    // 陰影（朝下的一側）：粗枝、細枝各一次畫完
    ctx.strokeStyle = A.c(barkS);
    ctx.lineCap = 'round';
    [[9, 99, 4], [0, 9, 2]].forEach(([lo, hi, lw]) => {
      ctx.lineWidth = lw;
      ctx.beginPath();
      ANT.forEach((s) => {
        if (s.w0 >= lo && s.w0 < hi) edge(ctx, s, -1, 0.3, 0, 0.9);
      });
      ctx.stroke();
    });
    // 古木的紋路
    ctx.strokeStyle = A.c(FS.barkD);
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ANT.forEach((s) => {
      if (s.w0 < 9) return;
      edge(ctx, s, 1, 0.12, 0.1, 0.88);
      edge(ctx, s, -1, 0.08, 0.1, 0.88);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
    // 冰殼的亮邊（朝上的一側）
    ctx.strokeStyle = far ? 'rgba(230,246,255,0.45)' : 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ANT.forEach((s) => edge(ctx, s, 1, 0.28, 0, 0.9));
    ctx.stroke();
    // 積雪：只積在朝上的那一面，越平的枝積得越厚（全部拼成一個 path 一次畫）
    const snowP = [];
    ANT.forEach((s, si) => {
      const up = [];
      const lo = [];
      let any = false;
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const u = 0.04 + (i / n) * 0.88;
        const q = qpt(s.p, u);
        const d = qtan(s.p, u);
        let nx = -d[1];
        let ny = d[0];
        let f = nx * ux + ny * uy;
        if (f < 0) {
          nx = -nx;
          ny = -ny;
          f = -f;
        }
        const w = lerp(s.w0, s.w1, u) / 2;
        const th = f > 0.45 ? (f - 0.35) * (4 + w * 0.9) * (0.75 + 0.35 * hash(si * 9 + i)) * Math.sin((i / n) * PI) : 0;
        if (th > 1.5) any = true;
        up.push([q[0] + nx * (w + th), q[1] + ny * (w + th)]);
        lo.push([q[0] + nx * w * 0.2, q[1] + ny * w * 0.2]);
      }
      if (any) snowP.push(smooth(up.concat(lo.reverse())));
    });
    sh(ctx, (c) => snowP.forEach((f) => f(c)), '#ffffff', null, { lw: 2, hl: false });
    // 冰柱：從枝條下面垂下來
    const icP = [];
    ANT.forEach((s, si) => {
      if (s.w0 < 6) return;
      [0.3, 0.55, 0.8].forEach((u, j) => {
        if (hash(si * 5 + j) < 0.35) return;
        const q = qpt(s.p, u);
        const d = qtan(s.p, u);
        let nx = -d[1];
        let ny = d[0];
        if (nx * ux + ny * uy > 0) {
          nx = -nx;
          ny = -ny;
        }
        if (nx * -ux + ny * -uy < 0.3) return;
        const w = lerp(s.w0, s.w1, u) / 2;
        const bx = q[0] + nx * (w - 1.5);
        const by = q[1] + ny * (w - 1.5);
        const L = (8 + hash(si * 3 + j) * 12) * (P2 ? 1.5 : 1);
        icP.push([bx, by, L]);
      });
    });
    sh(ctx, (c) => icP.forEach(([bx, by, L]) => {
      c.moveTo(bx - 3.2, by);
      c.lineTo(bx - ux * L, by - uy * L);
      c.lineTo(bx + 3.2, by);
      c.closePath();
    }), far ? '#d4ecfb' : '#eef9ff', null, { lw: 1.8, hl: false });
    // 枝梢的冰晶
    const cr = [];
    ANT.forEach((s, si) => {
      if (!s.tip) return;
      const e = qpt(s.p, 1);
      const d = qtan(s.p, 1);
      const r = (far ? 7 : 9) * (s.tip === 2 ? 0.7 : 1.15) * (P2 ? 1.45 : 1);
      // 晶體的座標系：y 軸沿著枝的方向往外
      const P = (px, py) => [e[0] - d[1] * px + d[0] * -py, e[1] + d[0] * px + d[1] * -py];
      cr.push({ P, r, big: s.tip === 1, e, si });
    });
    const crPath = (c, f) => cr.forEach(({ P, r, big }) => {
      const pts = f(P, r, big);
      if (!pts) return;
      pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
      c.closePath();
    });
    const body = (P, r) => [P(0, -r * 1.8), P(r * 0.62, -r * 0.2), P(0, r * 0.7), P(-r * 0.62, -r * 0.2)];
    const side = (P, r, big) => (P2 && big ? [P(r * 0.3, -r * 0.1), P(r * 1.3, -r * 1.1), P(r * 0.8, 0)] : null);
    ctx.fillStyle = A.c('#e6f6ff');
    ctx.beginPath();
    crPath(ctx, side);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = A.c(far ? '#dcf2ff' : '#ffffff');
    ctx.beginPath();
    crPath(ctx, body);
    ctx.fill();
    ctx.fillStyle = A.c('#a8d8f6');
    ctx.beginPath();
    crPath(ctx, (P, r) => [P(0, -r * 1.8), P(r * 0.62, -r * 0.2), P(0, r * 0.7)]);
    ctx.fill();
    ctx.beginPath();
    crPath(ctx, body);
    ctx.lineWidth = 2;
    ctx.stroke();
    if ((glowK > 0 || P2) && !far) {
      cr.forEach(({ r, big, e, si }) => {
        if (!big) return;
        const k = Math.max(glowK, P2 ? 0.5 : 0) * (0.55 + 0.45 * Math.sin(t * 7 + si));
        glow(ctx, e[0], e[1], r * 3, P2 ? '150,230,255' : '220,250,255', 0.8 * k);
        sparkle(ctx, e[0], e[1] - r * 0.4, r * 1.1 * k, 'rgba(255,255,255,' + (0.9 * k).toFixed(3) + ')');
      });
    }
    ctx.restore();
  }

  // 鹿腳：粗壯的大腿 → 膝/飛節 → 小腿 → 蹄上飄著霜毛 → 冰晶的蹄
  function deerLeg(ctx, hx, hy, footX, lift, hind, w, col, colS, P2, glowOn) {
    const fy = -lift;
    const kx = hind ? lerp(hx, footX, 0.4) - 22 : lerp(hx, footX, 0.55) + 6;
    const ky = lerp(hy, fy, hind ? 0.6 : 0.56);
    const fk = fy - 24;
    // 小腿
    sh(ctx, poly(taperPts([kx, ky, (kx + footX) / 2 + (hind ? -3 : 3), (ky + fk) / 2, footX, fk], w * 0.7, w * 0.52, 6)), col, colS, { cel: [4, 0], lw: 3.2 });
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(kx - w * 0.2, ky + 6);
    ctx.lineTo(footX - w * 0.15, fk - 8);
    ctx.stroke();
    // 冰晶的蹄（多面體，裡面透光）
    if (glowOn) glow(ctx, footX, fy - 6, 26, P2 ? '120,220,255' : '170,240,255', 0.55);
    const hoof = (c) => {
      c.moveTo(footX - 12, fy - 16);
      c.lineTo(footX + 11, fy - 16);
      c.lineTo(footX + 17, fy - 5);
      c.lineTo(footX + 15, fy);
      c.lineTo(footX - 13, fy);
      c.lineTo(footX - 16, fy - 6);
      c.closePath();
    };
    sh(ctx, hoof, P2 ? '#8fd8ff' : '#b8ecff', null, { lw: 2.6, hl: false });
    ctx.fillStyle = A.c(P2 ? '#4f9ee0' : '#6fbef0');
    ctx.beginPath();
    ctx.moveTo(footX + 2, fy - 16);
    ctx.lineTo(footX + 11, fy - 16);
    ctx.lineTo(footX + 17, fy - 5);
    ctx.lineTo(footX + 15, fy);
    ctx.lineTo(footX + 4, fy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(footX - 9, fy - 14);
    ctx.lineTo(footX - 3, fy - 14);
    ctx.lineTo(footX - 7, fy - 3);
    ctx.lineTo(footX - 12, fy - 5);
    ctx.closePath();
    ctx.fill();
    // 蹄上的霜毛（往後飄）
    sh(ctx, (c) => {
      c.moveTo(footX - 13, fk - 10);
      c.quadraticCurveTo(footX - 24, fy - 12, footX - 20, fy - 6);
      c.quadraticCurveTo(footX - 12, fy - 14, footX - 6, fy - 10);
      c.quadraticCurveTo(footX - 1, fy - 18, footX + 4, fy - 12);
      c.quadraticCurveTo(footX + 10, fy - 17, footX + 15, fy - 13);
      c.quadraticCurveTo(footX + 14, fk - 4, footX + 10, fk - 10);
      c.closePath();
    }, '#ffffff', FS.snowS, { lw: 2.2, hl: false, cel: [2, 2] });
    // 大腿（肌肉很厚）
    const cx = hind ? hx + 24 : hx - 10;
    const cy = lerp(hy, ky, 0.5);
    sh(ctx, poly(taperPts([hx, hy - 14, cx, cy, kx, ky], w * 2.3, w * 0.74, 8)), col, colS, { cel: [9, 4], lw: 3.4 });
    // 冰的切面光
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(hx - w * 0.6, hy - 6);
    ctx.quadraticCurveTo(cx - w * 0.6, cy, kx - w * 0.2, ky - 10);
    ctx.stroke();
    if (P2) {
      ctx.strokeStyle = 'rgba(140,240,255,0.9)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(hx + 4, hy + 6);
      ctx.lineTo(hx - 2, cy);
      ctx.lineTo(kx + 3, ky - 14);
      ctx.stroke();
    }
  }

  // 小雪松（背上的山稜）：list = [[x, y, h], ...]，同一層的一次畫完
  function pines(ctx, list, t) {
    const sway = (i) => Math.sin(t * 1.2 + i) * 1.2;
    sh(ctx, (c) => list.forEach(([x, y, h]) => A.roundRect(c, x - 2.5, y - h * 0.25, 5, h * 0.3, 2)), '#5a4a44', null, { lw: 1.8, hl: false });
    for (let k = 0; k < 3; k++) {
      const geo = (x, y, h, i) => {
        const yb = y - h * 0.18 - k * h * 0.26;
        const ww = h * (0.34 - k * 0.08);
        return [yb, ww, yb - h * 0.36, x + sway(i) * (k + 1) * 0.5];
      };
      sh(ctx, (c) => list.forEach(([x, y, h], i) => {
        const [yb, ww, tip, tx] = geo(x, y, h, i);
        c.moveTo(x - ww, yb);
        c.lineTo(tx, tip);
        c.lineTo(x + ww, yb);
        c.closePath();
      }), FS.pine, null, { lw: 2, hl: false });
      sh(ctx, (c) => list.forEach(([x, y, h], i) => {
        const [yb, ww, tip, tx] = geo(x, y, h, i);
        c.moveTo(x - ww * 0.72, yb - h * 0.08);
        c.lineTo(tx, tip + 1);
        c.lineTo(x + ww * 0.6, yb - h * 0.1);
        c.quadraticCurveTo(x + ww * 0.2, yb - h * 0.04, x, yb - h * 0.12);
        c.quadraticCurveTo(x - ww * 0.3, yb - h * 0.03, x - ww * 0.72, yb - h * 0.08);
        c.closePath();
      }), '#ffffff', null, { lw: 1.6, hl: false });
    }
  }

  // 極光：一條條垂直的光幕，底邊最亮、往上淡掉
  function aurora(ctx, t, pts, P2, amp, alpha) {
    const cols = P2 ? ['140,90,255', '255,80,190', '70,210,255'] : ['40,235,160', '50,190,255', '150,110,255'];
    const N = 11;
    const mix = (s) => {
      const f = s * (cols.length - 1);
      const i = Math.min(cols.length - 2, Math.floor(f));
      const q = f - i;
      const a = cols[i].split(',').map(Number);
      const b = cols[i + 1].split(',').map(Number);
      return a.map((v, j) => Math.round(v + (b[j] - v) * q)).join(',');
    };
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const p = cub(pts, s);
      p[1] += Math.sin(t * 1.7 + s * 7) * amp * s;
      const h = (36 + 96 * Math.sin(s * PI) + 16 * Math.sin(t * 2.3 + s * 11)) * (0.6 + 0.4 * s);
      if (prev) {
        const col = mix(s);
        const fade = Math.min(1, Math.sin(s * PI) * 1.6) * (0.75 + 0.25 * Math.sin(t * 3 + i * 1.3));
        const g = ctx.createLinearGradient(0, p[1], 0, p[1] - h);
        g.addColorStop(0, rgba(col, alpha * fade));
        g.addColorStop(0.4, rgba(col, alpha * fade * 0.7));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(prev[0], prev[1] - prev[2]);
        ctx.lineTo(p[0], p[1] - h);
        ctx.lineTo(p[0], p[1]);
        ctx.closePath();
        ctx.fill();
      }
      prev = [p[0], p[1], h];
    }
    // 底邊的亮線
    ctx.strokeStyle = rgba(P2 ? '255,220,255' : '220,255,240', alpha * 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 2; i <= N - 2; i++) {
      const s = i / N;
      const p = cub(pts, s);
      p[1] += Math.sin(t * 1.7 + s * 7) * amp * s;
      i > 2 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
  }

  // 冰河瀑布般的霜鬃：一整塊往下流的冰雪（上白下藍、越往下越透明），下緣是一根根冰柱，
  // 裡面用亮線、暗線畫出一綹綹的流向。outline：外形的點；flows：[[x0, y0, cx, cy, x1, y1], ...]
  function glacierMane(ctx, outline, flows, y0, y1, grad, alpha, t, lit) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, A.c(grad[0]));
    g.addColorStop(0.45, A.c(grad[1]));
    g.addColorStop(1, A.c(grad[2]));
    const path = (c) => {
      c.moveTo(outline[0][0], outline[0][1]);
      for (let i = 1; i < outline.length; i++) {
        const p = outline[i];
        const pr = outline[i - 1];
        if (p[2]) c.lineTo(p[0], p[1]);
        else c.quadraticCurveTo((pr[0] + p[0]) / 2 + (p[1] - pr[1]) * 0.12, (pr[1] + p[1]) / 2 - (p[0] - pr[0]) * 0.12, p[0], p[1]);
      }
      c.closePath();
    };
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.lineCap = 'round';
    // 暗的毛縫
    ctx.strokeStyle = 'rgba(40,80,160,0.4)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    flows.forEach((f) => {
      ctx.moveTo(f[0], f[1]);
      ctx.quadraticCurveTo(f[2], f[3], f[4], f[5]);
    });
    ctx.stroke();
    // 亮的流光（像融水往下流）
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    flows.forEach((f, i) => {
      const a = lit ? (t * 0.4 + i * 0.29) % 1 : 0.5;
      const o = 7;
      const P = [f[0] + o, f[1], f[2] + o, f[3], f[4] + o, f[5]];
      const q0 = qpt(P, Math.max(0, a - 0.35));
      const q1 = qpt(P, a);
      ctx.moveTo(q0[0], q0[1]);
      ctx.lineTo(q1[0], q1[1]);
    });
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    path(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function frostSpirit(ctx, m) {
    const t = m.t || 0;
    const st = m.state;
    const K = (m.h || 300) / 300;
    const p2 = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    const P2 = p2 > 0.5;
    const k = prog(m);
    const portrait = m.x === 0 && m.y === 0 && st === 'recover';
    const dead = !!m.dead;

    // ── 姿勢參數 ──
    let rear = 0; // 用後腳站起來
    let headDown = 0; // 低頭（角朝前）
    let headUp = 0; // 仰頭
    let crouch = 0;
    let glowK = 0; // 鹿角發光
    let tuck = 0; // 空中收腳
    let lean = 0;
    if (st === 'tollPrep') {
      rear = k * 0.95;
      headUp = k * 0.4;
    } else if (st === 'toll') {
      rear = Math.max(0, (m.stateT || 0) / 0.55 - 0.7);
      crouch = 0.3;
    } else if (st === 'spikePrep') {
      headDown = k * 0.8;
      glowK = k;
      crouch = k * 0.3;
    } else if (st === 'spikes') {
      headDown = 0.8;
      glowK = 1;
      crouch = 0.3;
    } else if (st === 'rainPrep') {
      headUp = k;
      glowK = k;
    } else if (st === 'rain') {
      headUp = 1;
      glowK = 1;
    } else if (st === 'chargePrep') {
      headDown = k;
      crouch = k * 0.35;
      lean = -0.05 * k;
    } else if (st === 'charge') {
      headDown = 1;
      lean = 0.05;
    } else if (st === 'stompPrep') {
      crouch = k * 0.6;
      headDown = 0.3;
    } else if (st === 'stompAir') {
      tuck = 1;
      headUp = 0.3;
    } else if (st === 'blizzardPrep') {
      rear = k * 0.8;
      headUp = k;
      glowK = k;
    } else if (st === 'blizzard') {
      rear = 0.25 + Math.sin(t * 3) * 0.05;
      headUp = 0.8;
      glowK = 1;
    } else if (st === 'summon') {
      headUp = 0.6;
      glowK = 0.6;
    } else if (st === 'transform') {
      rear = 0.5 * Math.sin(k * PI);
      headUp = 0.7;
      glowK = k;
    } else if (st === 'recover' && !portrait) {
      crouch = 0.15;
    }
    if (P2 && !dead && st === 'move') headUp = Math.max(headUp, 0.25);
    if (dead) {
      crouch = 0.6;
      headDown = 0.5;
      rear = 0;
      glowK = 0;
    }
    const walking = (st === 'move' && Math.abs(m.vx || 0) > 8) || st === 'charge';
    const gait = st === 'charge' ? t * 16 : t * 6.5;
    const shake = st === 'transform' || st === 'blizzardPrep' ? Math.sin(t * 50) * 2 : 0;
    const bellSwing = m.bellSwing || 0;
    const storm = st === 'blizzard' ? 1 : st === 'blizzardPrep' ? k : 0;
    const wind = dead ? 0 : (P2 ? 1 : 0.25) + storm; // 鬃毛被吹往後的程度
    const legC = P2 ? '#a8caf2' : '#c6e0f8';
    const legS = P2 ? '#3a64b4' : '#5c8cce';
    const farC = P2 ? '#6f94d0' : '#89aede';
    const farS = P2 ? '#33549c' : '#4c70ae';
    const crev = P2 ? '#2c469c' : '#4a78b8';
    const lit = !dead;

    ctx.save();
    ctx.scale(K, K);
    if (portrait) ctx.translate(-120, 40);
    ctx.translate(shake, 0);

    // ── 地上的影子、背後的冷光與雲霧 ──
    ctx.fillStyle = 'rgba(12,24,60,' + (0.34 * (1 - tuck * 0.4)).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(10, 2, 200 * (1 - tuck * 0.2), 16, 0, 0, TAU);
    ctx.fill();
    if (lit) {
      glow(ctx, 0, -210, 215, P2 ? '110,170,255' : '200,236,255', (P2 ? 0.5 : 0.36) + glowK * 0.15 + Math.sin(t * 2) * 0.04);
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const q = (t * 0.3 + i / 5) % 1;
        ctx.globalAlpha = Math.sin(q * PI) * 0.5;
        ctx.fillStyle = i % 2 ? '#ffffff' : '#dcecfa';
        ctx.beginPath();
        ctx.ellipse(-200 + i * 95 + Math.sin(t * 0.6 + i) * 14, -14 - q * 34, 46 + q * 30, 14 + q * 8, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // 整隻往後仰（以後腳為軸）
    const pivotX = -80;
    const rotW = -rear * 0.36 + lean;
    ctx.save();
    ctx.translate(pivotX, 0);
    ctx.rotate(rotW);
    ctx.translate(-pivotX, 0);
    const cy = crouch * 26 + tuck * 10;
    const bob = walking ? Math.abs(Math.sin(gait)) * -6 : Math.sin(t * 1.6) * 2;
    const by = cy + bob;
    const na = headDown * 0.55 - headUp * 0.5; // 頭的轉角
    const hx = 170 + headDown * 36 - headUp * 16;
    const hy = -292 + by + headDown * 104 - headUp * 22;

    // ── 神鹿背後的日暈 ──
    if (lit) {
      ctx.save();
      const hr = 122 + Math.sin(t * 1.3) * 3;
      const hcx = hx - 44;
      const hcy = hy - 72;
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = P2 ? '#bfe0ff' : '#ffffff';
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.arc(hcx, hcy, hr - 8, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.45 + glowK * 0.3;
      ctx.strokeStyle = P2 ? '#bfe0ff' : '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(hcx, hcy, hr, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 9]);
      ctx.beginPath();
      ctx.arc(hcx, hcy, hr + 12, t * 0.1, t * 0.1 + TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 6; i++) {
        const a = t * 0.15 + (i / 6) * TAU;
        sparkle(ctx, hcx + Math.cos(a) * hr, hcy + Math.sin(a) * hr, 9, '#ffffff');
      }
      ctx.restore();
    }

    // ── 極光：從肩脊流向天空 ──
    if (lit) {
      ctx.save();
      const aA = (P2 ? 0.85 : 0.75) + glowK * 0.15 + storm * 0.15;
      const amp = 10 + storm * 20 + (P2 ? 8 : 0);
      aurora(ctx, t, [40, -276 + by, -40, -350 + by, -150, -282 + by, -300, -340 + by + Math.sin(t) * 10], P2, amp, aA);
      aurora(ctx, t + 2, [60, -262 + by, -10, -310 + by, -120, -248 + by, -260, -280 + by + Math.cos(t * 0.8) * 12], P2, amp * 0.8, aA * 0.8);
      aurora(ctx, t + 4.5, [hx - 60, hy - 10, -20, -390 + by, -190, -370 + by, -250, -430 + by], P2, amp, aA * 0.6);
      ctx.restore();
    }

    // ── 遠側的腳 ──
    const legY = -150 + by;
    const sw = (ph) => (walking ? Math.sin(gait + ph) : 0);
    const lift = (ph) => (walking ? Math.max(0, Math.sin(gait + ph + PI / 2)) * (st === 'charge' ? 28 : 16) : 0);
    const fLift = rear * 60 + tuck * 50;
    deerLeg(ctx, -104, legY, -110 + sw(PI) * 26, lift(PI) + tuck * 40, true, 25, farC, farS, P2, false);
    deerLeg(ctx, 86, legY - 6, 96 + sw(0) * 30 + rear * 22, lift(0) + fLift, false, 24, farC, farS, P2, false);

    // ── 尾巴 ──
    sh(ctx, (c) => {
      c.moveTo(-154, -214 + by);
      c.quadraticCurveTo(-198, -234 + by + Math.sin(t * 3) * 6, -190, -190 + by);
      c.quadraticCurveTo(-174, -176 + by, -150, -188 + by);
      c.closePath();
    }, '#ffffff', FS.snowS, { lw: 3, cel: [3, 3] });

    // ── 身體：一層層半透明的冰河結晶，深處透著冷光，裡面凍著白角鹿 ──
    const bodyPts = cubPts([
      [-158, -184, -168, -238, -120, -254, -64, -252],
      [-64, -252, -10, -252, 6, -290, 68, -290],
      [68, -290, 128, -288, 156, -228, 152, -168],
      [152, -168, 148, -118, 108, -98, 64, -102],
      [64, -102, 20, -108, -26, -124, -64, -122],
      [-64, -122, -118, -120, -154, -140, -158, -184],
    ].map((sg) => sg.map((v, i) => (i % 2 ? v + by : v))), 8);
    const body = smooth(bodyPts);
    const bg = ctx.createLinearGradient(0, -292 + by, 0, -98 + by);
    const bcol = P2 ? ['#d2e8ff', '#7eb0ee', '#3f6fc8', '#172f80'] : ['#eef8ff', '#b4d8f6', '#6c9fdc', '#2d5aa8'];
    bcol.forEach((c, i) => bg.addColorStop(i / 3, A.c(c)));
    ctx.save();
    ctx.globalAlpha *= 0.95;
    ctx.fillStyle = bg;
    ctx.beginPath();
    body(ctx);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    // 心口的冷光：白角鹿就睡在光裡
    if (lit) glow(ctx, -50, -170 + by, 130, P2 ? '120,235,255' : '235,252,255', P2 ? 0.75 : 0.7);
    ctx.save();
    ctx.globalAlpha *= 0.92;
    frozenDoe(ctx, -52, -172 + by, 1.12, t, dead);
    ctx.restore();
    // 冰的切面（半透明，蓋在鹿身上）
    const facet = (pts, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + by) : ctx.moveTo(p[0], p[1] + by)));
      ctx.closePath();
      ctx.fill();
    };
    const FL = 'rgba(255,255,255,0.3)';
    const FD = P2 ? 'rgba(30,60,160,0.3)' : 'rgba(50,100,180,0.22)';
    facet([[-170, -206], [-110, -262], [-78, -200], [-134, -156]], FL);
    facet([[-12, -262], [66, -296], [48, -216], [0, -206]], FL);
    facet([[84, -282], [156, -216], [96, -184]], FL);
    facet([[-170, -186], [-134, -156], [-120, -110], [-170, -124]], FD);
    facet([[44, -216], [96, -184], [160, -120], [64, -94], [20, -140]], FD);
    facet([[-120, -110], [-60, -118], [-90, -100]], FD);
    ctx.strokeStyle = A.c(crev);
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    [[[-110, -262], [-78, -200], [-134, -156], [-120, -110]], [[-78, -200], [-12, -160], [0, -206], [-12, -262]], [[-12, -160], [20, -140], [48, -216], [66, -296]], [[20, -140], [64, -96]], [[48, -216], [96, -184], [156, -216]]].forEach((ln) => {
      ln.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + by) : ctx.moveTo(p[0], p[1] + by)));
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
    // 冰河的層理
    ctx.strokeStyle = P2 ? 'rgba(40,80,190,0.4)' : 'rgba(60,110,200,0.3)';
    ctx.lineCap = 'round';
    [[-134, 3.5], [-120, 5], [-106, 3]].forEach(([y0, lw], i) => {
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-180, y0 + by);
      ctx.bezierCurveTo(-90, y0 - 16 + by + i * 4, -20, y0 + 14 + by, 40, y0 - 4 + by);
      ctx.bezierCurveTo(80, y0 - 14 + by, 120, y0 - 30 + by, 170, y0 - 44 + by);
      ctx.stroke();
    });
    // 冰裡緩緩上浮的雪
    for (let i = 0; i < 16; i++) {
      const q = (t * 0.12 + hash(i)) % 1;
      dot(-150 + hash(i + 9) * 290, -104 + by - q * 160, 1.3 + hash(i + 3) * 2, 0.85);
    }
    dotFlush(ctx, '#ffffff');
    if (P2 && lit) {
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-66, -266 + by);
      ctx.lineTo(-48, -218 + by);
      ctx.lineTo(-70, -186 + by);
      ctx.lineTo(-60, -146 + by);
      ctx.moveTo(-48, -218 + by);
      ctx.lineTo(-8, -206 + by);
      ctx.lineTo(10, -178 + by);
      ctx.moveTo(104, -250 + by);
      ctx.lineTo(88, -200 + by);
      ctx.lineTo(108, -156 + by);
      ctx.moveTo(-126, -222 + by);
      ctx.lineTo(-108, -192 + by);
      ctx.strokeStyle = rgba('120,230,255', 0.5 + Math.sin(t * 4) * 0.12);
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = A.c('#e8fcff');
      ctx.lineWidth = 2.8;
      ctx.stroke();
    }
    // 上緣的亮邊（冰的厚度）
    ctx.save();
    ctx.translate(4, 7);
    ctx.beginPath();
    body(ctx);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    ctx.beginPath();
    body(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ── 背上的雪稜（山脊），第一階段長著雪松，第二階段被冰棱吞掉 ──
    const ridge = [];
    [[-158, -184, -168, -238, -120, -254, -64, -252], [-64, -252, -10, -252, 6, -290, 68, -290]].forEach((sg, j) => {
      for (let i = j ? 1 : 3; i <= 10; i++) ridge.push(cub(sg, i / 10));
    });
    ridge.forEach((p) => (p[1] += by));
    {
      const n = ridge.length;
      const up = ridge.map((p, i) => [p[0], p[1] - (3 + Math.sin((i / (n - 1)) * PI) * 11) * (0.8 + 0.4 * hash(i + 40))]);
      const lo = ridge.map((p, i) => [p[0], p[1] + 6 + (i % 2) * 6]).reverse();
      sh(ctx, smooth(up.concat(lo)), '#ffffff', FS.snowS, { lw: 2.6, hl: false, cel: [2, 4] });
    }
    const rAt = (i) => ridge[Math.min(ridge.length - 1, i)];
    if (!P2) {
      pines(ctx, [[4, 26], [7, 36], [9, 30], [12, 40], [14, 32]].map(([i, h]) => [rAt(i)[0], rAt(i)[1] - 6, h]), t);
    } else {
      [[3, 38], [6, 60], [8, 44], [10, 72], [12, 50], [14, 64]].forEach(([i, h], j) => {
        const p = rAt(i);
        const lean2 = (j % 2 ? 1 : -1) * 0.15 - 0.1;
        sh(ctx, (c) => {
          c.moveTo(p[0] - 12, p[1] + 4);
          c.lineTo(p[0] - 4 + Math.sin(lean2) * h * 0.3, p[1] - h * 0.6);
          c.lineTo(p[0] + Math.sin(lean2) * h, p[1] - h);
          c.lineTo(p[0] + 6 + Math.sin(lean2) * h * 0.3, p[1] - h * 0.5);
          c.lineTo(p[0] + 12, p[1] + 4);
          c.closePath();
        }, '#e4f6ff', '#6aa6e6', { lw: 2.6, cel: [5, 0] });
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(p[0] - 5, p[1]);
        ctx.lineTo(p[0] - 2 + Math.sin(lean2) * h * 0.6, p[1] - h * 0.7);
        ctx.stroke();
      });
    }

    // ── 近側的腳 ──
    deerLeg(ctx, -76, legY + 4, -70 + sw(0) * 26, lift(0) + tuck * 40, true, 28, legC, legS, P2, false);
    deerLeg(ctx, 114, legY - 2, 122 + sw(PI) * 30 + rear * 30, lift(PI) + fLift * 1.1, false, 27, legC, legS, P2, false);

    // ── 粗壯的脖子 ──
    const neck = (c) => {
      c.moveTo(6, -282 + by);
      c.quadraticCurveTo(hx - 76, hy - 50, hx - 26, hy - 22);
      c.lineTo(hx + 6, hy + 24);
      c.quadraticCurveTo(hx - 4, hy + 96, 152, -178 + by);
      c.lineTo(64, -206 + by);
      c.closePath();
    };
    const ng = ctx.createLinearGradient(hx - 60, hy - 30, 130, -150 + by);
    ng.addColorStop(0, A.c(P2 ? '#dcefff' : '#f2faff'));
    ng.addColorStop(1, A.c(P2 ? '#5a8ad6' : '#86b6e6'));
    ctx.fillStyle = ng;
    ctx.beginPath();
    neck(ctx);
    ctx.fill();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = A.outline();
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ── 遠側的鹿角（順便算出鐘掛的位置）──
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(na);
    ctx.save();
    ctx.translate(-10, -24);
    ctx.scale(0.92, 0.92);
    ctx.rotate(0.1);
    frostAntler(ctx, true, glowK, t, p2, rotW + na + 0.1);
    ctx.scale(ANT_SC, ANT_SC);
    const hangDev = ctx.getTransform().transformPoint(new DOMPoint(ANT_HANG[0], ANT_HANG[1]));
    ctx.restore();
    ctx.restore();
    const hang = ctx.getTransform().inverse().transformPoint(hangDev);

    // ── 頸背的霜鬃：沿著脖子往後流過肩脊，末端一根根往後飄 ──
    {
      const C = [hx - 30, hy - 30, hx - 80, hy - 56, 6, -290 + by];
      const out = [];
      const flows = [];
      for (let i = 0; i <= 6; i++) {
        const q = qpt(C, i / 6);
        const d = qtan(C, i / 6);
        const th = 14 + Math.sin((i / 6) * PI) * 16 + (i % 2) * 5;
        out.push([q[0] + d[1] * th, q[1] - d[0] * th]);
      }
      // 往後飄的尾端
      const e = qpt(C, 1);
      const wv = (j) => Math.sin(t * (2 + wind) + j) * (3 + wind * 4);
      const L = 56 + wind * 30;
      out.push([e[0] - L, e[1] - 6 - wind * 10 + wv(0), 1], [e[0] - 12, e[1] + 6], [e[0] - L * 0.8, e[1] + 12 - wind * 6 + wv(1), 1], [e[0] - 4, e[1] + 16]);
      for (let i = 5; i >= 0; i--) {
        const q = qpt(C, i / 6);
        const d = qtan(C, i / 6);
        out.push([q[0] - d[1] * 14, q[1] + d[0] * 14]);
      }
      for (let i = 0; i < 4; i++) {
        const q = qpt(C, 0.1 + i * 0.2);
        flows.push([q[0], q[1] - 4, q[0] - 30, q[1] - 10, e[0] - L * 0.7, e[1] + (i - 1.5) * 5]);
      }
      glacierMane(ctx, out, flows, hy - 60, -250 + by, ['#ffffff', '#d4f0ff', P2 ? '#7aa8f0' : '#9cd2f4'], 0.97, t, lit);
    }

    // ── 喉下到胸前的巨大霜鬃：冰河瀑布，一路垂到前腳 ──
    {
      const Q = [hx + 6, hy + 24, hx - 6, hy + 96, 152, -178 + by];
      const out = [[hx - 44, hy + 4], [hx - 10, hy + 18]];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        const q = qpt(Q, u);
        const d = qtan(Q, u);
        const o = 12 + u * 14 + (i % 2) * 6;
        out.push([q[0] + d[1] * o, q[1] - d[0] * o]);
      }
      const E = qpt(Q, 1);
      const bot = -64 + by;
      const n = 8;
      const tips = [];
      for (let j = 0; j <= n; j++) {
        const f = j / n;
        const x = E[0] + 20 - f * 118 - wind * 16 * (1 - f * 0.5) + Math.sin(t * (2 + wind) + j * 1.3) * (2 + wind * 3);
        const y = j % 2 ? lerp(bot, E[1], 0.35 + f * 0.2) : bot + (j === 0 ? -24 : 0) - Math.sin(f * PI) * 4 - f * 14;
        tips.push([x, y]);
        out.push([x, y, 1]);
      }
      out.push([E[0] - 104, E[1] + 12]);
      for (let i = 6; i >= 1; i--) {
        const u = i / 6;
        const q = qpt(Q, u);
        const d = qtan(Q, u);
        const o = 22 + u * 8;
        out.push([q[0] - d[1] * o, q[1] + d[0] * o]);
      }
      const flows = [];
      tips.forEach(([x, y], j) => {
        if (j % 2) return;
        const q = qpt(Q, 0.15 + (1 - j / n) * 0.8);
        flows.push([q[0] - 4, q[1], lerp(q[0], x, 0.5) + 8, lerp(q[1], y, 0.5), x + 2, y - 6]);
      });
      glacierMane(ctx, out, flows, hy + 10, bot, ['#ffffff', '#c6ecff', P2 ? '#3f7fe0' : '#5aa4ec'], 0.94, t, lit);
      if (lit) {
        tips.forEach(([x, y], j) => {
          if (j % 2) return;
          sparkle(ctx, x, y + 3, 5 + Math.sin(t * 5 + j) * 2, 'rgba(225,252,255,0.95)');
        });
      }
    }

    // ── 鐘：永遠朝正下方垂（再加上搖晃）──
    const swing = (Math.sin(t * 7) * 0.4 * bellSwing + Math.sin(t * 1.4) * 0.05) * (dead ? 0.2 : 1);
    ctx.save();
    ctx.translate(hang.x, hang.y);
    ctx.scale(1.3, 1.3);
    shrineBell(ctx, swing - rotW, t, P2 ? 1 : st === 'transform' ? k : 0, clamp(bellSwing, 0, 1.4) * (dead ? 0 : 1), P2);
    ctx.restore();

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(na);
    // 耳朵（尖、往後）
    sh(ctx, (c) => {
      c.moveTo(-14, -16);
      c.quadraticCurveTo(-50, -44, -70, -36 + Math.sin(t * 2) * 2);
      c.quadraticCurveTo(-46, -12, -14, -4);
      c.closePath();
    }, legC, legS, { lw: 3, shadeY: -22 });
    sh(ctx, (c) => {
      c.moveTo(-18, -13);
      c.quadraticCurveTo(-42, -32, -58, -32);
      c.quadraticCurveTo(-42, -17, -18, -8);
      c.closePath();
    }, '#ffffff', null, { noStroke: true, hl: false });
    // 頭：長而高貴、下顎有力
    const head = (c) => {
      c.moveTo(-34, 4);
      c.bezierCurveTo(-38, -30, -6, -44, 24, -36);
      c.bezierCurveTo(48, -30, 72, -14, 86, 0);
      c.bezierCurveTo(94, 12, 84, 26, 66, 28);
      c.bezierCurveTo(42, 32, 8, 38, -14, 30);
      c.bezierCurveTo(-30, 24, -34, 14, -34, 4);
      c.closePath();
    };
    const hg2 = ctx.createLinearGradient(0, -40, 0, 34);
    hg2.addColorStop(0, A.c('#ffffff'));
    hg2.addColorStop(0.55, A.c(P2 ? '#b4d6f8' : '#cfe7fa'));
    hg2.addColorStop(1, A.c(P2 ? '#5a88d0' : '#7eaee0'));
    ctx.fillStyle = hg2;
    ctx.beginPath();
    head(ctx);
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 深色的口鼻
    ctx.fillStyle = A.c('#46669c');
    ctx.beginPath();
    ctx.ellipse(78, 12, 24, 19, 0.2, 0, TAU);
    ctx.fill();
    // 臉上的冰面
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(-22, -20);
    ctx.lineTo(18, -34);
    ctx.lineTo(34, -14);
    ctx.lineTo(-4, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(40,80,170,0.2)';
    ctx.beginPath();
    ctx.moveTo(-34, 10);
    ctx.lineTo(12, 6);
    ctx.lineTo(46, 32);
    ctx.lineTo(-22, 34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    head(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.4;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 鼻子
    ell(ctx, 82, 5, 7, 6, FS.nose, null, { lw: 2.2, hl: [80, 3, 2, 1.5] });
    // 頰骨的冰稜
    ctx.strokeStyle = A.c(P2 ? '#3a64b0' : '#6c9cd6');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 12);
    ctx.quadraticCurveTo(14, 8, 36, 18);
    ctx.stroke();
    // 嘴與寒氣：平常鼻子也一直冒著白霧
    const open = st === 'tollPrep' || st === 'blizzardPrep' || st === 'blizzard' || st === 'rain' || st === 'transform' || (P2 && !dead);
    if (open && lit) {
      sh(ctx, (c) => {
        c.moveTo(44, 20);
        c.quadraticCurveTo(62, 38, 80, 22);
        c.quadraticCurveTo(62, 26, 44, 20);
        c.closePath();
      }, '#16244a', null, { lw: 2.2 });
      ctx.fillStyle = A.c('#eaf8ff');
      ctx.beginPath();
      ctx.moveTo(50, 22);
      ctx.lineTo(53, 29);
      ctx.lineTo(56, 23);
      ctx.moveTo(70, 23);
      ctx.lineTo(72, 30);
      ctx.lineTo(75, 22);
      ctx.fill();
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(46, 22);
      ctx.quadraticCurveTo(60, 26, 74, 21);
      ctx.stroke();
    }
    if (lit) {
      const big = open ? (st === 'blizzard' || st === 'blizzardPrep' || P2 ? 1.6 : 1) : 0.45;
      ctx.save();
      const nb = open ? 7 : 4;
      for (let i = 0; i < nb; i++) {
        const q = (t * 1.5 + i / nb) % 1;
        ctx.globalAlpha = (1 - q) * 0.7 * Math.min(1, big + 0.3);
        ctx.fillStyle = i % 2 ? '#ffffff' : '#dff4ff';
        ctx.beginPath();
        ctx.arc(90 + q * 60 * big, (open ? 26 : 10) + Math.sin(i + t) * 4 - q * 12 * big, (4 + q * 12) * big, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    // 額頭的雪花神紋
    {
      const gk = dead ? 0 : 0.6 + glowK * 0.4 + (P2 ? 0.3 : 0);
      if (gk > 0) glow(ctx, 8, -24, 22, P2 ? '140,230,255' : '220,250,255', 0.8 * gk);
      ctx.save();
      ctx.translate(8, -24);
      ctx.strokeStyle = A.c(P2 ? '#8ff0ff' : '#ffffff');
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.moveTo(Math.cos(a) * 4.5 + Math.cos(a + 0.9) * 3, Math.sin(a) * 4.5 + Math.sin(a + 0.9) * 3);
        ctx.lineTo(Math.cos(a) * 4.5, Math.sin(a) * 4.5);
      }
      ctx.stroke();
      ctx.restore();
    }
    // 眉上的霜冠（三根往後的冰刺）
    sh(ctx, (c) => {
      [[0, -30, -18, -52], [12, -32, 0, -58], [24, -31, 16, -50]].forEach(([x0, y0, x1, y1]) => {
        c.moveTo(x0 - 6, y0 + 3);
        c.lineTo(x1, y1);
        c.lineTo(x0 + 6, y0 + 1);
        c.closePath();
      });
    }, '#f0faff', null, { lw: 2.2, hl: false });
    // 眼睛：發光的冰眼、壓低的眉骨
    const ex = 18;
    const ey = -10;
    const angry = !dead && (st !== 'move' || P2);
    if (dead) {
      A.eye(ctx, ex, ey, 6, 5, 'closed');
    } else if (m.hurtFlash > 0.05) {
      A.eye(ctx, ex, ey, 7, 8, 'hurt');
    } else {
      const eyeGlow = P2 ? '110,225,255' : '170,236,255';
      glow(ctx, ex + 2, ey, 30 + glowK * 16 + (P2 ? 10 : 0), eyeGlow, 0.75 + glowK * 0.25);
      const eyeP = (c) => {
        c.moveTo(ex - 15, ey + 3);
        c.quadraticCurveTo(ex - 2, ey - 11, ex + 16, ey - 6);
        c.quadraticCurveTo(ex + 6, ey + 9, ex - 15, ey + 3);
        c.closePath();
      };
      sh(ctx, eyeP, '#0f1c40', null, { lw: 2.6, hl: false });
      ctx.fillStyle = A.c(P2 ? '#7aeeff' : '#bff4ff');
      ctx.beginPath();
      ctx.ellipse(ex + 2, ey - 1, 5.5, 6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c('#1d3a80');
      ctx.beginPath();
      ctx.ellipse(ex + 3, ey - 1, 1.6, 4.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 4.5, ey - 4, 2, 0, TAU);
      ctx.fill();
      if (m.blink && !angry) sh(ctx, eyeP, legC, null, { lw: 2.6, hl: false });
      // 眼裡拖出的冷光
      ctx.strokeStyle = rgba(eyeGlow, P2 ? 0.8 : 0.45 + glowK * 0.3);
      ctx.lineWidth = P2 ? 3.5 : 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - 12, ey + 1);
      ctx.quadraticCurveTo(ex - 30, ey - 2 + Math.sin(t * 6) * 2, ex - (P2 ? 52 : 36), ey - 10);
      ctx.stroke();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ex - 17, ey - 14 + (angry ? -3 : 0));
      ctx.lineTo(ex + 17, ey - 8 + (angry ? 4 : 0));
      ctx.stroke();
    }
    // 近側的鹿角
    ctx.save();
    ctx.translate(2, -26);
    frostAntler(ctx, false, glowK, t, p2, rotW + na);
    ctx.restore();
    ctx.restore();

    // ── 招式的附加效果 ──
    if (lit) {
      if (st === 'spikePrep' || st === 'spikes') {
        const g = st === 'spikes' ? 1 : k;
        sh(ctx, (c) => {
          [[-120, 18], [-88, 26], [64, 24], [100, 32], [140, 20]].forEach(([x, h], i) => {
            const hh = h * g;
            c.moveTo(x - 8, 2);
            c.lineTo(x + (i % 2 ? 3 : -3), -hh);
            c.lineTo(x + 8, 2);
            c.closePath();
          });
        }, '#e8f8ff', null, { lw: 2, hl: false });
      }
      if (st === 'charge' || st === 'chargePrep') {
        const g = st === 'charge' ? 1 : k * 0.5;
        ctx.save();
        for (let i = 0; i < 6; i++) {
          const q = (t * 3 + i / 6) % 1;
          ctx.globalAlpha = (1 - q) * 0.6 * g;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(-130 - q * 120, -10 - q * 20 - (i % 3) * 8, 16 + q * 26, 9 + q * 10, 0, 0, TAU);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * g).toFixed(3) + ')';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const y = -260 + i * 40 + by;
          const x0 = -180 - ((t * 400 + i * 70) % 120);
          ctx.moveTo(x0, y);
          ctx.lineTo(x0 - 50, y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore(); // 身體的轉角

    // ── 前景：腳邊的雲霧、落雪、暴風的旋風 ──
    if (lit) {
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const q = (t * 0.22 + i / 5) % 1;
        ctx.globalAlpha = Math.sin(q * PI) * 0.42;
        ctx.fillStyle = i % 2 ? '#ffffff' : '#e2f0fb';
        ctx.beginPath();
        ctx.ellipse(-190 + i * 92 + q * 30, 0 - (i % 2) * 8, 62, 13 + q * 6, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      // 靜靜落下的雪（暴風時斜著飛）
      const drift = (P2 ? 60 : 0) + storm * 160;
      for (let i = 0; i < 26; i++) {
        const q = (t * (0.1 + hash(i + 200) * 0.08) * (1 + storm * 2) + hash(i + 201)) % 1;
        const x = -260 + hash(i + 202) * 520 - q * drift + Math.sin(t + i) * 8;
        dot(x, -470 + q * 470, 1.2 + hash(i + 203) * 2.2, Math.sin(q * PI) * 0.95);
      }
      dotFlush(ctx, '#ffffff');
      if (P2 || storm > 0) {
        const sk = Math.max(storm, 0.55);
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
          const a0 = t * (1.6 + storm) + i * 0.8;
          const r = 170 + i * 16;
          ctx.strokeStyle = i % 2 ? rgba('255,255,255', 0.6 * sk) : rgba('170,215,255', 0.55 * sk);
          ctx.lineWidth = 3 + (i % 3) * 1.5;
          ctx.beginPath();
          ctx.ellipse(0, -180, r, r * 0.42, -0.12, a0, a0 + 0.9 + storm * 0.6);
          ctx.stroke();
        }
        ctx.restore();
      }
      // 身邊飄的六角雪花（兩種亮度各一次畫完）
      const nf = P2 ? 18 : 12;
      [0, 1].forEach((pass) => {
        ctx.globalAlpha = pass ? 0.9 : 0.55;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        for (let i = pass; i < nf; i += 2) {
          const a = t * (0.3 + hash(i) * 0.3) * (1 + storm * 2) + i * 0.63;
          const r = 160 + hash(i + 4) * 90;
          const x = Math.cos(a) * r;
          const y = -200 + Math.sin(a) * r * 0.6;
          const R1 = 4 + hash(i + 2) * 3;
          const rot = t + i;
          for (let j = 0; j < 12; j++) {
            const b = rot + (j * PI) / 6;
            const rr = j % 2 ? 1.5 : R1;
            j ? ctx.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr) : ctx.moveTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr);
          }
          ctx.closePath();
        }
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ═════════════════════════ 時間 ═════════════════════════
  // 歷代守葉獸的石像：坐在一塊漂浮的古老石台上的巨大石獅（青苔、裂縫、長在背上的小樹），
  // 裂縫與破洞裡流著星沙；背後是日蝕般的天體錶盤（光冕、星軌、石環），四根時針像手臂。
  // 第二階段「無盡星空」：石殼碎掉，剩下星雲與齒輪組成的獅形，石台碎成三塊，錶盤換成紫紅的日蝕與金色大齒輪。
  const TS = {
    stone: '#bcae96', stoneS: '#958771', stoneD: '#6c604f', stoneL: '#ddd2bb', stoneDD: '#4f4638',
    mane: '#a89a82', maneS: '#83765f',
    moss: '#7f9e4c', mossS: '#5a7732', mossL: '#b0cc6c',
    gold: '#f0cf7a', goldS: '#c9953e', goldD: '#8a5e22', void: '#1c1640', void2: '#3a2878',
  };
  const NUM = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  // 星空＋星沙（畫在已經 clip 好的區域裡）。ts：星沙的時間（時停時不動、倒轉時往上流）
  function starVoid(ctx, t, x0, y0, w, h, rich, ts) {
    if (ts == null) ts = t;
    const g = ctx.createRadialGradient(x0 + w * 0.55, y0 + h * 0.4, 10, x0 + w * 0.5, y0 + h * 0.5, Math.max(w, h) * 0.7);
    g.addColorStop(0, rich ? '#6a42b8' : '#3e2e86');
    g.addColorStop(0.5, rich ? '#2c1a66' : '#231a56');
    g.addColorStop(1, '#0c0822');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, w, h);
    if (rich) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = t * 0.2 + i * 2.1;
        glow(ctx, x0 + w * 0.5 + Math.cos(a) * w * 0.22, y0 + h * 0.5 + Math.sin(a) * h * 0.2, w * 0.36, i === 1 ? '255,110,200' : i === 2 ? '90,200,255' : '130,120,255', 0.24);
      }
      ctx.restore();
    }
    const n = rich ? 80 : 44;
    const sp = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + hash(i) * w;
      const y = y0 + hash(i + 50) * h;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + hash(i + 7) * 2) + i));
      const s = 0.8 + hash(i + 20) * (rich ? 2.2 : 1.6);
      dot(x, y, s * 0.6, tw);
      if (hash(i + 30) > 0.9) sp.push(x, y, s * 3);
    }
    dotFlush(ctx, '#fffae6');
    for (let i = 0; i < sp.length; i += 3) sparkle(ctx, sp[i], sp[i + 1], sp[i + 2], 'rgba(255,250,230,0.85)');
    ctx.fillStyle = '#ffe9a0';
    for (let i = 0; i < 46; i++) {
      const q = (((ts * (0.18 + hash(i + 80) * 0.12) + hash(i + 90)) % 1) + 1) % 1;
      const x = x0 + (hash(i + 70) * 0.8 + 0.1) * w + Math.sin(q * 6 + i) * 8;
      const y = y0 + q * h;
      dot(x, y, 1.2 + hash(i + 60) * 1.8, Math.sin(q * PI) * 0.9);
    }
    dotFlush(ctx, '#ffe9a0');
    ctx.globalAlpha = 1;
  }

  // 四根時針
  function clockHand(ctx, kind, ang, len, glowK, P2) {
    ctx.save();
    ctx.rotate(ang);
    if (glowK > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = P2 ? 'rgba(255,170,230,' + (0.4 * glowK).toFixed(3) + ')' : 'rgba(255,225,140,' + (0.4 * glowK).toFixed(3) + ')';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.restore();
    }
    const gold = P2 ? '#f6dc8e' : TS.gold;
    if (kind === 'hour') {
      // 粗針＋鏤空的太陽盤＋黑桃形針尖
      sh(ctx, (c) => {
        c.moveTo(-28, -9);
        c.lineTo(len - 56, -8);
        c.bezierCurveTo(len - 66, -36, len - 16, -32, len, 0);
        c.bezierCurveTo(len - 16, 32, len - 66, 36, len - 56, 8);
        c.lineTo(-28, 9);
        c.closePath();
      }, gold, TS.goldS, { cel: [0, 4], lw: 3.5, hl: [len * 0.4, -3, 30, 2] });
      sh(ctx, (c) => {
        c.arc(len * 0.45, 0, 17, 0, TAU);
        c.moveTo(len * 0.45 + 9, 0);
        c.arc(len * 0.45, 0, 9, 0, TAU, true);
      }, gold, TS.goldS, { lw: 3, cel: [0, 3], hl: false });
      ctx.fillStyle = A.c(P2 ? '#ff8ad0' : '#ff9a4a');
      ctx.beginPath();
      ctx.arc(len * 0.45, 0, 5, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        sh(ctx, (c) => {
          c.moveTo(len * 0.45 + Math.cos(a - 0.2) * 17, Math.sin(a - 0.2) * 17);
          c.lineTo(len * 0.45 + Math.cos(a) * 25, Math.sin(a) * 25);
          c.lineTo(len * 0.45 + Math.cos(a + 0.2) * 17, Math.sin(a + 0.2) * 17);
          c.closePath();
        }, gold, null, { lw: 2 });
      }
      ell(ctx, len - 36, 0, 8, 8, TS.void2, null, { lw: 2.4, hl: [len - 38, -3, 2.5, 2] });
    } else if (kind === 'minute') {
      sh(ctx, (c) => {
        c.moveTo(-32, -6);
        c.lineTo(len - 46, -5);
        c.lineTo(len - 54, -20);
        c.lineTo(len, 0);
        c.lineTo(len - 54, 20);
        c.lineTo(len - 46, 5);
        c.lineTo(-32, 6);
        c.closePath();
      }, gold, TS.goldS, { cel: [0, 3], lw: 3.2, hl: [len * 0.4, -2, 40, 1.5] });
      // 中段的新月
      sh(ctx, (c) => {
        c.arc(len * 0.52, 0, 16, 0, TAU);
        c.moveTo(len * 0.52 + 16, -4);
        c.arc(len * 0.52 + 7, -4, 12, 0, TAU, true);
      }, '#fff3c0', TS.goldS, { lw: 2.6, hl: false, cel: [2, 2] });
      ell(ctx, len - 70, 0, 5, 5, P2 ? '#ff8ad0' : '#7ad8ff', null, { lw: 2, hl: false });
    } else if (kind === 'second') {
      sh(ctx, (c) => {
        c.moveTo(-54, -3);
        c.lineTo(len, -1.5);
        c.lineTo(len, 1.5);
        c.lineTo(-54, 3);
        c.closePath();
      }, '#e8605a', '#b83a3a', { lw: 2.6, hl: false });
      sh(ctx, (c) => starPath(c, -54, 0, 15, 7, 5), '#e8605a', '#b83a3a', { lw: 2.6, hl: false, cel: [2, 2] });
      ell(ctx, len - 22, 0, 6, 6, '#ffd0c0', null, { lw: 2.2, hl: false });
    } else {
      // 命運之針：尖端是一彎新月
      sh(ctx, (c) => {
        c.moveTo(-22, -6);
        c.lineTo(len - 38, -5);
        c.lineTo(len - 38, 5);
        c.lineTo(-22, 6);
        c.closePath();
      }, '#d8c8ff', '#9a84d8', { cel: [0, 3], lw: 3, hl: false });
      sh(ctx, (c) => starPath(c, len * 0.45, 0, 12, 5, 4), '#fff3c0', TS.goldS, { lw: 2.2, hl: false });
      sh(ctx, (c) => {
        c.arc(len - 16, 0, 23, -PI * 0.75, PI * 0.75);
        c.arc(len - 27, 0, 19, PI * 0.6, -PI * 0.6, true);
        c.closePath();
      }, '#fff3c0', TS.goldS, { lw: 3, cel: [3, 0], hl: false });
    }
    ctx.restore();
  }

  // 天體錶盤：光冕 → 星軌 → 石環（p2 齒輪）→ 星空錶面 → 金色字環
  function timeHalo(ctx, t, p2, glowK, spin, flip, hot, ts) {
    const R = 172;
    const P2 = p2 > 0.5;
    const cor = P2 ? '255,120,210' : '255,210,120';
    // 光冕（日蝕的長短光刺）
    ctx.save();
    ctx.rotate(t * 0.05 + spin * 0.1);
    const cg = ctx.createRadialGradient(0, 0, R, 0, 0, R * 1.5);
    cg.addColorStop(0, rgba(cor, 0.8 + glowK * 0.2));
    cg.addColorStop(1, rgba(cor, 0));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.5, 0, TAU);
    ctx.fill();
    const nr = 24;
    // 長短光刺：同一種顏色的一次畫完（一個 path），省很多 draw call
    [0, 1].forEach((odd) => {
      ctx.beginPath();
      for (let i = odd; i < nr; i += 2) {
        const a = (i / nr) * TAU;
        const L = R * (odd ? 1.28 : 1.46 + hash(i) * 0.14 + Math.sin(t * 2 + i) * 0.03) * (1 + glowK * 0.08 + (P2 ? 0.06 : 0));
        const w = odd ? 0.05 : 0.07;
        ctx.moveTo(Math.cos(a - w) * (R + 10), Math.sin(a - w) * (R + 10));
        ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
        ctx.lineTo(Math.cos(a + w) * (R + 10), Math.sin(a + w) * (R + 10));
        ctx.closePath();
      }
      ctx.fillStyle = A.c(P2 ? (odd ? '#ff9ad8' : '#ffd88a') : odd ? '#ffe7a8' : TS.gold);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
    ctx.restore();
    // 星軌：兩圈斜的軌道，小行星沿著跑
    ctx.save();
    [[-0.38, 1], [0.5, -1]].forEach(([rot, d], j) => {
      ctx.save();
      ctx.rotate(rot);
      ctx.strokeStyle = P2 ? 'rgba(255,200,240,0.7)' : 'rgba(255,240,200,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, R + 60, 34 + j * 10, 0, 0, TAU);
      ctx.stroke();
      const a = t * 0.5 * d + j * 2 + spin * 0.4;
      ell(ctx, Math.cos(a) * (R + 60), Math.sin(a) * (34 + j * 10), 9 - j * 2, 9 - j * 2, j ? '#9ad8ff' : '#ffb87a', j ? '#5a98d8' : '#d8803a', { lw: 2.2, cel: [2, 2] });
      ctx.restore();
    });
    ctx.restore();
    // 外圈：古老的石環（第二階段是大齒輪）
    ctx.save();
    ctx.rotate(-t * 0.04 - spin * 0.15);
    if (P2) {
      sh(ctx, (c) => gearPath(c, 0, 0, R + 40, 36, 0), '#e0b862', '#a8803a', { lw: 3, hl: false, cel: [0, 4] });
      ctx.rotate(t * 0.12);
      ctx.strokeStyle = A.c('#fff0c0');
      ctx.lineWidth = 2;
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (R + 24), Math.sin(a) * (R + 24), 2.2, 0, TAU);
        ctx.stroke();
      }
    } else {
      sh(ctx, (c) => {
        c.arc(0, 0, R + 30, 0, TAU);
        c.moveTo(R + 2, 0);
        c.arc(0, 0, R + 2, 0, TAU, true);
      }, TS.stone, TS.stoneS, { lw: 3.4, hl: false, cel: [0, 5] });
      // 石環上刻的星座符號＋分段
      ctx.strokeStyle = A.c(TS.stoneD);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        ctx.moveTo(Math.cos(a) * (R + 4), Math.sin(a) * (R + 4));
        ctx.lineTo(Math.cos(a) * (R + 28), Math.sin(a) * (R + 28));
      }
      ctx.stroke();
      ctx.fillStyle = A.c(hot > 0 ? '#ffe7a0' : '#8a7c66');
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const b = ((i + 0.5) / 24) * TAU;
        const gx = Math.cos(b) * (R + 16);
        const gy = Math.sin(b) * (R + 16);
        if (i % 3 === 0) {
          ctx.moveTo(gx + 3.2, gy);
          ctx.arc(gx, gy, 3.2, 0, TAU);
        } else if (i % 3 === 1) ctx.rect(gx - 2.5, gy - 2.5, 5, 5);
        else starPath(ctx, gx, gy, 4.5, 2, 4);
      }
      ctx.fill();
      // 青苔
      [[-2.2, 26], [-1.1, 18], [0.6, 22], [2.4, 14]].forEach(([a, w], i) => {
        const x = Math.cos(a) * (R + 26);
        const y = Math.sin(a) * (R + 26);
        sh(ctx, smooth(blobPts(x, y, w * 0.6, 7, i * 7 + 3, 8)), TS.moss, null, { lw: 2, hl: false });
      });
    }
    ctx.restore();
    // 錶面
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R - 14, 0, TAU);
    ctx.clip();
    starVoid(ctx, t, -R, -R, R * 2, R * 2, true, ts);
    // 銀河帶
    ctx.save();
    ctx.rotate(-0.5);
    const mg = ctx.createLinearGradient(0, -30, 0, 30);
    mg.addColorStop(0, 'rgba(255,240,255,0)');
    mg.addColorStop(0.5, P2 ? 'rgba(255,190,240,0.35)' : 'rgba(220,210,255,0.3)');
    mg.addColorStop(1, 'rgba(255,240,255,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(-R, -30, R * 2, 60);
    ctx.restore();
    // 往中心捲進去的星沙漩渦
    ctx.fillStyle = '#ffe9a0';
    for (let i = 0; i < 40; i++) {
      const q = (((ts * 0.08 + hash(i + 400)) % 1) + 1) % 1;
      const r = (R - 20) * (1 - q);
      const a = hash(i + 401) * TAU + q * 5 + spin;
      dot(Math.cos(a) * r, Math.sin(a) * r, 1.4 + hash(i + 402) * 1.4, Math.sin(q * PI) * 0.8);
    }
    dotFlush(ctx, '#ffe9a0');
    ctx.globalAlpha = P2 ? 0.55 : 0.3;
    ctx.fillStyle = A.c('#e8c878');
    [[-70, 60, 50, 10, 0.3, 1], [10, 104, 34, 8, -0.45, -1.5], [84, 40, 40, 9, 0.38, 1], [-40, -90, 44, 9, -0.5, 0], [80, -70, 28, 7, 0.7, 0]].forEach(([x, y, r, n, s, sp], i) => {
      if (i > 2 && !P2) return;
      ctx.beginPath();
      gearPath(ctx, x, y, r, n, t * s + spin * sp);
      ctx.fill('evenodd');
    });
    ctx.globalAlpha = 1;
    ctx.restore();
    // 金色字環
    sh(ctx, (c) => {
      c.arc(0, 0, R, 0, TAU);
      c.moveTo(R - 18, 0);
      c.arc(0, 0, R - 18, 0, TAU, true);
    }, P2 ? '#f6dc90' : TS.gold, TS.goldS, { cel: [0, 5], lw: 3.5, hl: false });
    ctx.strokeStyle = A.c(TS.goldD);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, R - 9, 0, TAU);
    ctx.stroke();
    // 刻度與羅馬數字
    ctx.save();
    ctx.font = 'bold 20px ' + A.NUMFONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    [false, true].forEach((big) => {
      ctx.strokeStyle = A.c(big ? '#fff3c0' : '#c8b88a');
      ctx.lineWidth = big ? 3 : 1.5;
      ctx.beginPath();
      for (let i = 0; i < 60; i++) {
        if ((i % 5 === 0) !== big) continue;
        const a = -PI / 2 + (i / 60) * TAU;
        ctx.moveTo(Math.cos(a) * (R - 22), Math.sin(a) * (R - 22));
        ctx.lineTo(Math.cos(a) * (R - (big ? 34 : 28)), Math.sin(a) * (R - (big ? 34 : 28)));
      }
      ctx.stroke();
    });
    for (let i = 0; i < 12; i++) {
      const a = -PI / 2 + (i / 12) * TAU;
      // 整隻被 dir 翻過來的時候，數字要翻回來（不然錶盤是反的）
      const x = Math.cos(a) * (R - 54) * (flip || 1);
      const y = Math.sin(a) * (R - 54);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(flip || 1, 1);
      if (hot > 0) glow(ctx, 0, 0, 26, '255,140,210', 0.6 * hot * (0.6 + 0.4 * Math.sin(t * 8 + i)));
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(24,14,50,0.9)';
      ctx.strokeText(NUM[i], 0, 0);
      ctx.fillStyle = A.c(P2 ? '#ffe0f4' : '#fff3c0');
      ctx.fillText(NUM[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
    // 外面一圈轉動的星符
    ctx.save();
    ctx.rotate(t * 0.12 + spin * 0.3);
    const n = P2 ? 24 : 12;
    [0, 1].forEach((pass) => {
      ctx.fillStyle = A.c(pass ? '#fff3c0' : P2 ? '#ff9ad8' : '#c8b0ff');
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if ((i % 3 !== 0) !== !!pass) continue;
        const a = (i / n) * TAU;
        const r = R + (P2 ? 60 : 44) + (i % 2) * 6;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        for (let j = 0; j < 8; j++) {
          const b = a - PI / 2 + (j * PI) / 4;
          const rr = j % 2 ? 2.5 : 7;
          j ? ctx.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr) : ctx.moveTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr);
        }
        ctx.closePath();
      }
      ctx.fill();
    });
    ctx.restore();
  }

  // 石獅各部位的多邊形（順時針），第一階段逐塊畫，第二階段拼成一整塊剪影
  function lionParts(t, tailW) {
    const hx = 58;
    const hy = -242;
    const maneP = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU;
      const lobe = Math.pow(Math.abs(Math.cos(a * 8)), 0.6);
      const r = 90 + lobe * 16 + hash(Math.floor(i / 4)) * 6;
      maneP.push([hx - 12 + Math.cos(a) * r, hy + 6 + Math.sin(a) * r * 0.96]);
    }
    return {
      hx,
      hy,
      tail: taperPts([-136, -104, -206, -124, -176 + tailW, -222], 28, 16, 12),
      tuft: ellPts(-172 + tailW, -232, 24, 22, 0, 20),
      legF: taperPts([34, -170, 30, -112, 40, -64], 44, 34, 8),
      pawF: ellPts(46, -58, 32, 16, 0, 22),
      torso: cubPts([
        [-150, -92, -164, -160, -112, -210, -40, -218],
        [-40, -218, 20, -228, 84, -214, 110, -176],
        [110, -176, 130, -146, 122, -96, 104, -66],
        [104, -66, 60, -56, -40, -50, -110, -54],
        [-110, -54, -140, -58, -148, -74, -150, -92],
      ], 8),
      haunch: ellPts(-90, -104, 74, 60, -0.12, 32),
      hpaw: ellPts(-30, -58, 40, 15, 0, 22),
      legN: taperPts([88, -166, 92, -112, 96, -64], 50, 38, 8),
      pawN: ellPts(104, -58, 36, 17, 0, 22),
      mane: cw(maneP),
      head: ellPts(hx, hy, 56, 50, 0, 30),
      muzzle: ellPts(hx + 36, hy + 22, 34, 25, 0, 24),
    };
  }

  // 螺旋捲毛（狛犬式的鬃）
  function curl(ctx, x, y, r, col, colS, dir) {
    ell(ctx, x, y, r, r, col, null, { lw: 2.4, hl: false });
    ctx.strokeStyle = A.c(colS);
    ctx.lineWidth = r * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, -0.3, 1.9);
    ctx.stroke();
    ctx.strokeStyle = A.c(TS.stoneDD);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * TAU * 1.3 * (dir || 1);
      const rr = r * 0.78 * (1 - i / 16);
      i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.stroke();
  }

  function mossPatch(ctx, x, y, w, h, seed, flowers) {
    sh(ctx, smooth(blobPts(x, y, w, h, seed, 10)), TS.moss, null, { lw: 2.2, hl: false });
    ctx.fillStyle = A.c(TS.mossL);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x - w * 0.5 + hash(seed + i) * w, y - h * 0.3 + hash(seed + i + 9) * h * 0.4, 1.6 + hash(seed + i + 3) * 1.4, 0, TAU);
      ctx.fill();
    }
    // 垂下來的苔絲
    ctx.strokeStyle = A.c(TS.mossS);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const xx = x - w * 0.5 + (i + 0.5) * (w / 3);
      ctx.beginPath();
      ctx.moveTo(xx, y + h * 0.5);
      ctx.lineTo(xx + 1, y + h * 0.5 + 5 + hash(seed + i + 20) * 8);
      ctx.stroke();
    }
    if (flowers) {
      for (let i = 0; i < flowers; i++) {
        const fx = x - w * 0.4 + hash(seed + i + 40) * w * 0.8;
        const fy = y - h * 0.5 + hash(seed + i + 41) * h * 0.3;
        ctx.fillStyle = A.c('#ffffff');
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(a) * 2.2, fy + Math.sin(a) * 2.2, 1.6, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = A.c('#ffd24a');
        ctx.beginPath();
        ctx.arc(fx, fy, 1.3, 0, TAU);
        ctx.fill();
      }
    }
  }

  // 裂縫：深色線＋裡面透出的金色星沙光
  function cracks(ctx, lines, hot, t) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    lines.forEach((ln) => ln.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))));
    ctx.strokeStyle = A.c(TS.stoneDD);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = rgba('255,220,140', 0.55 + hot * 0.45 + Math.sin(t * 3) * 0.1);
    ctx.lineWidth = 1.3 + hot * 1.2;
    ctx.stroke();
    ctx.restore();
  }

  function timeItself(ctx, m) {
    const t = m.t || 0;
    const st = m.state;
    const K = (m.h || 380) / 380;
    const p2 = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    const P2 = p2 > 0.5;
    const k = prog(m);
    const portrait = m.x === 0 && m.y === 0 && st === 'recover';
    const dead = !!m.dead;
    const bob = Math.sin(t * 1.2) * 6;

    // ── 姿勢 ──
    let glowK = 0;
    let eyeK = 0;
    let spin = 0;
    let shake = 0;
    let hot = 0; // 十二時：數字發光
    const idleA = [-PI * 0.78 + Math.sin(t * 0.8) * 0.08, -PI * 0.2 + Math.sin(t * 0.9 + 1) * 0.08, Math.floor(t * 2) * (TAU / 60), PI * 0.18 + Math.sin(t * 0.7) * 0.06];
    if (A.timeHands && m.handPh != null) for (let i = 0; i < 4; i++) idleA[i] += m.handPh * A.timeHands.MUL[i]; // 時針一直正轉逆轉（js/art/stormfrost.js）
    let A4 = idleA.slice();
    let hide = -1; // 被預警畫走的那根針
    const dirL = m.dir || 1;
    // 世界座標 → 本地（已經被 dir、K 縮放過）
    const loc = (wx) => ((wx - (m.x || 0)) * dirL) / K;
    const toGround = (wx) => Math.atan2(228 + bob, loc(wx));
    // 星沙的時間：時停時凍住、倒轉時往回流
    let ts = t;
    if (st === 'sweepPrep') {
      const side = (m.sweepFrom || 1) * dirL;
      const a = Math.atan2(228, side * 640);
      A4[1] = lerp(idleA[1], a, k);
      glowK = k;
      eyeK = k;
    } else if (st === 'sweep') {
      hide = 1;
      glowK = 0.6;
      eyeK = 1;
    } else if (st === 'stab') {
      const tgt = m.stabX != null ? toGround(m.stabX) : PI / 2;
      const T = m.stateT0 || 0.8;
      const left = m.stateT || 0;
      const raise = left > 0.25 ? Math.min(1, (T - left) / Math.max(0.2, T - 0.25)) : 0;
      A4[0] = left > 0.25 ? lerp(idleA[0], -PI * 0.62, raise) : tgt;
      eyeK = 0.8;
    } else if (st === 'stopPrep' || st === 'stop') {
      const kk = st === 'stop' ? 1 : k;
      for (let i = 0; i < 4; i++) A4[i] = lerp(idleA[i], -PI / 2 + (i - 1.5) * 0.06, kk);
      glowK = kk;
      eyeK = kk;
      if (st === 'stop') ts = t - ((m.stateT0 || 0) - (m.stateT || 0));
    } else if (st === 'rewindPrep') {
      A4 = idleA.map((a, i) => a - t * (5 + i * 2));
      glowK = 0.7;
      eyeK = 0.7;
      spin = -t * 4;
      ts = -t * 3;
    } else if (st === 'clockworkPrep' || st === 'clockwork') {
      A4 = idleA.map((a, i) => a + t * (4 + i * 3));
      glowK = 1;
      eyeK = 1;
      spin = t * 3;
      hot = st === 'clockwork' ? 1 : k;
    } else if (st === 'echo') {
      A4 = [-PI * 0.95, -PI * 0.05, PI * 0.1 + k, PI * 0.9];
      glowK = 0.6;
      eyeK = 0.6;
    } else if (st === 'transform') {
      shake = Math.sin(t * 60) * 3 * (1 - k * 0.5);
      A4 = idleA.map((a, i) => a + Math.sin(t * 30 + i) * 0.3);
      eyeK = 1;
      glowK = k;
    }
    if (dead) A4 = [PI * 0.55, PI * 0.45, PI * 0.6, PI * 0.4];
    // 眼睛只在預警與出招時睜開（預警一開始就很快睜大），平常閉著
    const ATK_ST = ['sweepPrep', 'sweep', 'stab', 'stopPrep', 'stop', 'rewindPrep', 'rewind', 'clockworkPrep', 'clockwork', 'echo', 'transform'];
    const openK = dead || portrait || !ATK_ST.includes(st) ? 0 : /Prep$/.test(st) ? clamp(k * 5, 0.25, 1) : 1;

    ctx.save();
    ctx.scale(K, K);
    if (portrait) ctx.translate(-50, 120);
    ctx.translate(shake, bob);

    // ── 錶盤光環 ──
    ctx.save();
    ctx.translate(0, -228);
    timeHalo(ctx, t, p2, dead ? 0 : glowK, spin, dirL, hot, ts);
    // 四根時針（在石獅後面，伸得比身體長）
    const lens = [170, 236, 250, 200];
    const kinds = ['hour', 'minute', 'second', 'fate'];
    if (A.timeHands && !dead) A.timeHands.blur(ctx, m, A4, lens, hide); // 快轉時針的殘影弧
    for (let i = 3; i >= 0; i--) if (i !== hide) clockHand(ctx, kinds[i], A4[i], lens[i], glowK * (i === 2 ? 0.4 : 1), P2);
    ell(ctx, 0, 0, 22, 22, TS.gold, TS.goldS, { lw: 3, hl: false, cel: [3, 3] });
    ctx.restore();

    const tailW = Math.sin(t * 1.3) * 6;
    const L = lionParts(t, tailW);
    const hx = L.hx;
    const hy = L.hy;
    const order = ['tail', 'tuft', 'legF', 'pawF', 'torso', 'haunch', 'hpaw', 'legN', 'pawN', 'mane', 'head', 'muzzle'];

    // 石台：第一階段一整塊，第二階段碎成三塊
    const plinthTop = -48;
    const slab = (x0, x1, y0, depth, seed) => {
      const top = (c) => {
        c.moveTo(x0, y0);
        c.lineTo(x1, y0);
        c.lineTo(x1 + 10, y0 + 10);
        c.lineTo(x0 + 8, y0 + 10);
        c.closePath();
      };
      const front = [[x0 + 8, y0 + 10], [x1 + 10, y0 + 10], [x1 + 10, y0 + 30]];
      const n = 7;
      for (let i = n; i >= 0; i--) {
        const x = lerp(x0 + 8, x1 + 10, i / n);
        front.push([x, y0 + 30 + depth * (0.4 + hash(seed + i) * 0.6) * Math.sin(((i + 0.5) / (n + 1)) * PI)]);
      }
      sh(ctx, poly(front), TS.stoneS, TS.stoneD, { lw: 3.2, shadeY: y0 + 28 });
      sh(ctx, top, TS.stoneL, TS.stone, { lw: 3, shadeY: y0 + 7 });
      return front;
    };
    const sandFall = (x, y, w, len, seed) => {
      if (dead) return;
      ctx.save();
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, 'rgba(255,230,150,0.55)');
      g.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x + w * 0.8, y + len);
      ctx.lineTo(x - w * 0.8, y + len);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff0b0';
      for (let i = 0; i < 10; i++) {
        const q = (((ts * 0.9 + hash(seed + i)) % 1) + 1) % 1;
        dot(x + (hash(seed + i + 5) - 0.5) * w * (1 + q), y + q * len, 1.3 + hash(seed + i + 2) * 1.2, 1 - q);
      }
      dotFlush(ctx, '#fff0b0');
      ctx.restore();
    };

    if (!P2) {
      // ─ 第一階段：苔蘚石像 ─
      const F = slab(-172, 150, plinthTop, 26, 3);
      // 石台正面的古文字（守葉獸的名字），蓄力時發光
      ctx.save();
      ctx.strokeStyle = glowK > 0.3 ? rgba('255,225,140', 0.5 + glowK * 0.5) : A.c(TS.stoneD);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const x = -150 + i * 34;
        const y = plinthTop + 20;
        ctx.beginPath();
        if (i % 3 === 0) {
          ctx.arc(x, y, 5, 0, TAU);
          ctx.moveTo(x, y - 8);
          ctx.lineTo(x, y + 8);
        } else if (i % 3 === 1) {
          ctx.moveTo(x - 6, y - 6);
          ctx.lineTo(x + 6, y + 6);
          ctx.moveTo(x + 6, y - 6);
          ctx.lineTo(x - 2, y + 2);
        } else {
          ctx.moveTo(x - 6, y + 5);
          ctx.lineTo(x, y - 7);
          ctx.lineTo(x + 6, y + 5);
          ctx.moveTo(x - 4, y);
          ctx.lineTo(x + 4, y);
        }
        ctx.stroke();
      }
      ctx.restore();
      // 石台底部垂下的根與藤
      ctx.strokeStyle = A.c('#5a4a36');
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      [[-130, 30], [-60, 44], [20, 26], [110, 38]].forEach(([x, l], i) => {
        const y0 = plinthTop + 34;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.quadraticCurveTo(x + 8, y0 + l * 0.5, x + Math.sin(t + i) * 4, y0 + l);
        ctx.stroke();
      });
      [[-100, 50], [60, 40]].forEach(([x, l], i) => {
        const y0 = plinthTop + 36;
        ctx.strokeStyle = A.c(TS.mossS);
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.quadraticCurveTo(x - 6, y0 + l * 0.6, x + Math.sin(t * 1.3 + i) * 5, y0 + l);
        ctx.stroke();
        for (let j = 1; j < 4; j++) ell(ctx, x + (j % 2 ? 4 : -4) + Math.sin(t * 1.3 + i) * j, y0 + (l * j) / 4, 4, 2.5, TS.moss, null, { lw: 1.4, hl: false, rot: j % 2 ? 0.5 : -0.5 });
      });
      sandFall(-40, plinthTop + 50, 18, 70, 11);
      sandFall(80, plinthTop + 44, 12, 56, 23);
      void F;
      mossPatch(ctx, -150, plinthTop + 6, 26, 8, 71, 1);
      mossPatch(ctx, 124, plinthTop + 7, 22, 7, 81, 1);

      // 尾巴
      sh(ctx, poly(L.tail), TS.stoneS, TS.stoneD, { cel: [4, 4], lw: 3.4 });
      sh(ctx, poly(L.tuft), TS.mane, TS.maneS, { cel: [4, 4], lw: 3.2 });
      curl(ctx, -176 + tailW, -236, 10, TS.mane, TS.maneS, 1);
      curl(ctx, -160 + tailW, -222, 8, TS.mane, TS.maneS, -1);
      // 遠側前腳
      sh(ctx, poly(L.legF), TS.stoneS, TS.stoneD, { cel: [4, 0], lw: 3.2 });
      sh(ctx, poly(L.pawF), TS.stoneS, TS.stoneD, { cel: [3, 3], lw: 3.2 });
      // 身體＋後腿
      sh(ctx, poly(L.torso), TS.stone, TS.stoneS, { cel: [8, 8], lw: 3.6, hl: [-60, -196, 30, 8] });
      sh(ctx, poly(L.haunch), TS.stone, TS.stoneS, { cel: [8, 8], lw: 3.6, hl: [-120, -140, 22, 8] });
      // 後腿的肌肉刻線
      ctx.strokeStyle = A.c(TS.stoneD);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-90, -104, 44, -2.4, -0.9);
      ctx.stroke();
      sh(ctx, poly(L.hpaw), TS.stone, TS.stoneS, { cel: [3, 3], lw: 3.2 });
      [[-2, -64], [10, -62]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 2, y + 12);
        ctx.stroke();
      });
      // 石殼上的破洞：裡面是流動的星沙，星沙從破口流出來
      const crackGrow = clamp(p2 * 2, 0, 1);
      const holes = [
        [[-72, -176], [-40, -190], [-14, -170], [-24, -138], [-58, -130]],
        [[-128, -112], [-100, -128], [-76, -110], [-90, -80], [-120, -84]],
      ];
      holes.forEach((hp, i) => {
        const s = 1 + crackGrow * 0.35;
        const cx0 = hp.reduce((a, p) => a + p[0], 0) / hp.length;
        const cy0 = hp.reduce((a, p) => a + p[1], 0) / hp.length;
        const pts = hp.map((p) => [cx0 + (p[0] - cx0) * s, cy0 + (p[1] - cy0) * s]);
        ctx.save();
        ctx.beginPath();
        poly(pts)(ctx);
        ctx.clip();
        starVoid(ctx, t + i, cx0 - 60, cy0 - 60, 120, 120, false, ts);
        ctx.restore();
        // 破口的厚度（石頭的斷面）
        ctx.beginPath();
        poly(pts)(ctx);
        ctx.strokeStyle = A.c(TS.stoneL);
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 3;
        ctx.stroke();
        const low = pts.reduce((a, p) => (p[1] > a[1] ? p : a), pts[0]);
        sandFall(low[0], low[1], 8, 36, 30 + i * 10);
      });
      // 近側前腳
      sh(ctx, poly(L.legN), TS.stone, TS.stoneS, { cel: [5, 0], lw: 3.4, hl: [80, -140, 5, 16] });
      sh(ctx, poly(L.pawN), TS.stone, TS.stoneS, { cel: [3, 3], lw: 3.2 });
      ctx.strokeStyle = A.c(TS.stoneD);
      ctx.lineWidth = 2.4;
      [96, 108, 120].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, -66);
        ctx.lineTo(x + 2, -48);
        ctx.stroke();
      });
      // 腳上的腕環（金色，歷代守葉獸的印）
      sh(ctx, (c) => A.roundRect(c, 70, -98, 48, 12, 5), TS.gold, TS.goldS, { lw: 2.6, hl: false, cel: [0, 3] });
      sh(ctx, (c) => A.roundRect(c, 14, -100, 42, 11, 5), TS.goldS, TS.goldD, { lw: 2.6, hl: false });
      // 胸前的捲毛
      [[98, -140, 15], [72, -124, 14], [102, -112, 12]].forEach(([x, y, r], i) => curl(ctx, x, y, r, TS.mane, TS.maneS, i % 2 ? 1 : -1));
      // 裂縫
      cracks(ctx, [
        [[-146, -96], [-128, -112]],
        [[-14, -170], [18, -178], [30, -160]],
        [[-24, -138], [-30, -110], [-10, -96]],
        [[40, -214], [52, -196]],
        [[-160, -70], [-140, -60]],
      ].concat(crackGrow > 0 ? [[[-140, -130], [-100, -176], [-40, -190]], [[110, -176], [90, -210], [60, -250]]] : []), crackGrow + glowK * 0.3, t);
      // 青苔與小花、背上長出的小樹
      mossPatch(ctx, -70, -214, 26, 8, 11, 2);
      mossPatch(ctx, -140, -150, 16, 7, 21, 0);
      mossPatch(ctx, 108, -72, 16, 6, 31, 1);
      mossPatch(ctx, -34, -70, 18, 6, 41, 0);
      {
        // 小樹（盤根的枝幹＋兩團葉）
        const tx = -108;
        const ty = -198;
        const sw2 = Math.sin(t * 1.4) * 2;
        limb(ctx, (c) => {
          c.moveTo(tx, ty + 4);
          c.quadraticCurveTo(tx - 8, ty - 18, tx + 4 + sw2, ty - 34);
        }, 8, '#6a543e');
        limb(ctx, (c) => {
          c.moveTo(tx - 3, ty - 14);
          c.quadraticCurveTo(tx - 14, ty - 20, tx - 20 + sw2, ty - 26);
        }, 5.5, '#6a543e');
        sh(ctx, smooth(blobPts(tx - 20 + sw2, ty - 32, 13, 9, 91, 9)), '#6fa048', '#4f7a30', { lw: 2.2, cel: [2, 2], hl: false });
        sh(ctx, smooth(blobPts(tx + 6 + sw2, ty - 44, 18, 12, 93, 10)), '#7fb050', '#557f34', { lw: 2.4, cel: [3, 3], hl: [tx + sw2, ty - 50, 6, 3] });
        mossPatch(ctx, tx, ty + 2, 14, 5, 97, 0);
      }
      // 鬃毛：一整圈捲毛
      sh(ctx, poly(L.mane), TS.mane, TS.maneS, { cel: [8, 8], lw: 3.6 });
      // 鬃毛的刻紋：從臉往外放射的火焰狀毛束
      ctx.save();
      ctx.beginPath();
      poly(L.mane)(ctx);
      ctx.clip();
      ctx.strokeStyle = A.c(TS.maneS);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * TAU;
        const x0 = hx - 12 + Math.cos(a) * 58;
        const y0 = hy + 6 + Math.sin(a) * 56;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(hx - 12 + Math.cos(a + 0.12) * 80, hy + 6 + Math.sin(a + 0.12) * 78, hx - 12 + Math.cos(a + 0.05) * 100, hy + 6 + Math.sin(a + 0.05) * 98);
        ctx.stroke();
      }
      ctx.restore();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + 0.2;
        curl(ctx, hx - 12 + Math.cos(a) * 88, hy + 6 + Math.sin(a) * 86, 17, TS.mane, TS.maneS, i % 2 ? 1 : -1);
      }
      // 鬃毛上的破洞
      const h3 = [[-4, -318], [20, -330], [36, -306], [16, -290]];
      ctx.save();
      ctx.beginPath();
      poly(h3)(ctx);
      ctx.clip();
      starVoid(ctx, t + 5, -30, -340, 80, 80, false, ts);
      ctx.restore();
      ctx.beginPath();
      poly(h3)(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.stroke();
      mossPatch(ctx, hx - 40, hy - 88, 24, 8, 51, 2);
      mossPatch(ctx, hx - 100, hy - 30, 12, 6, 61, 0);
      // 耳朵
      ell(ctx, hx - 34, hy - 46, 15, 14, TS.stone, TS.stoneS, { lw: 3, hl: false, cel: [2, 2] });
      ell(ctx, hx + 14, hy - 54, 15, 14, TS.stone, TS.stoneS, { lw: 3, hl: false, cel: [2, 2] });
      ell(ctx, hx + 14, hy - 53, 7, 6, TS.stoneD, null, { noStroke: true, hl: false });
      // 頭
      sh(ctx, poly(L.head), TS.stone, TS.stoneS, { cel: [6, 6], lw: 3.6, hl: [hx - 24, hy - 26, 12, 6] });
      mossPatch(ctx, hx - 16, hy - 44, 18, 6, 101, 1);
      cracks(ctx, [[[hx - 40, hy - 10], [hx - 30, hy + 8], [hx - 38, hy + 24]]], crackGrow + glowK * 0.3, t);
    } else {
      // ─ 第二階段：石殼碎了，剩下星雲與齒輪的獅形 ─
      // 碎成三塊的石台
      [[-176, -80, 18, 0, 3], [-64, 40, 26, 1.3, 7], [58, 154, 14, 2.6, 11]].forEach(([x0, x1, dy, ph, sd]) => {
        ctx.save();
        const fl = Math.sin(t * 1.1 + ph) * 6;
        ctx.translate((x0 + x1) / 2, plinthTop + dy + fl);
        ctx.rotate(Math.sin(t * 0.7 + ph) * 0.06 + (ph - 1.3) * 0.05);
        ctx.translate(-(x0 + x1) / 2, -plinthTop);
        slab(x0, x1, plinthTop, 22, sd);
        mossPatch(ctx, x0 + 18, plinthTop + 5, 14, 5, sd * 7, 1);
        ctx.restore();
        sandFall((x0 + x1) / 2, plinthTop + dy + fl + 40, 14, 70, sd * 3);
      });
      const parts = order.map((n) => L[n]);
      const U = (c) => parts.forEach((p) => poly(p)(c));
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.beginPath();
      U(ctx);
      ctx.strokeStyle = 'rgba(210,160,255,0.5)';
      ctx.lineWidth = 18;
      ctx.stroke();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.clip();
      starVoid(ctx, t, -220, -360, 400, 340, true, ts);
      // 鬃毛的位置是一團旋轉的星系
      ctx.save();
      ctx.translate(hx - 12, hy + 6);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, 90, '255,150,220', 0.35);
      for (let arm = 0; arm < 3; arm++) {
        for (let i = 0; i < 26; i++) {
          const q = i / 26;
          const a = t * 0.5 + arm * (TAU / 3) + q * 4.2;
          const r = 12 + q * 92;
          dot(Math.cos(a) * r, Math.sin(a) * r * 0.9, 2.6 - q * 1.2, 0.9 - q * 0.6);
        }
        dotFlush(ctx, arm === 1 ? '#ffbef0' : '#d2c8ff');
      }
      ctx.restore();
      // 裡面轉動的齒輪
      ctx.globalAlpha = 0.55;
      [[-70, -120, 56, 12, 0.4], [4, -150, 38, 9, -0.6], [60, -90, 30, 8, 0.8], [-116, -70, 30, 8, -0.5], [-150, -170, 22, 7, 0.9], [100, -60, 20, 6, -1]].forEach(([x, y, r, n, s]) => {
        ctx.fillStyle = '#e8c070';
        ctx.beginPath();
        gearPath(ctx, x, y, r, n, t * s);
        ctx.fill('evenodd');
      });
      ctx.globalAlpha = 1;
      // 原本的石像形體：淡淡的輪廓線
      ctx.strokeStyle = 'rgba(210,180,255,0.35)';
      ctx.lineWidth = 2;
      ['torso', 'haunch', 'legN', 'pawN', 'hpaw'].forEach((n) => {
        ctx.beginPath();
        poly(L[n])(ctx);
        ctx.stroke();
      });
      // 星座線：沿著獅子的骨架
      const cons = [[-172, -232], [-150, -150], [-90, -104], [-30, -58], [-40, -200], [40, -214], [96, -160], [94, -64], [104, -58], [46, -58], [34, -150]];
      ctx.strokeStyle = 'rgba(255,230,150,0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [6, 7], [7, 8], [5, 10], [10, 9]].forEach(([a, b]) => {
        ctx.moveTo(cons[a][0], cons[a][1]);
        ctx.lineTo(cons[b][0], cons[b][1]);
      });
      ctx.stroke();
      cons.forEach(([x, y], i) => {
        glow(ctx, x, y, 12, '255,240,200', 0.8);
        sparkle(ctx, x, y, 5 + (i % 3) * 1.5, '#ffffff');
      });
      // 往下流的星沙河
      ctx.fillStyle = '#ffe9a0';
      for (let i = 0; i < 40; i++) {
        const q = (((ts * 0.25 + hash(i + 600)) % 1) + 1) % 1;
        const path = i % 2 ? [40, -200, 110, -150, 100, -64] : [-40, -210, -150, -150, -60, -60];
        const p = qpt(path, q);
        dot(p[0] + (hash(i) - 0.5) * 14, p[1], 1.6 + hash(i + 3) * 1.4, Math.sin(q * PI));
      }
      dotFlush(ctx, '#ffe9a0');
      ctx.globalAlpha = 1;
      ctx.restore();
      // 還黏在身上的石殼：半張臉的面具、一塊肩甲、前腳的石頭
      const shell = (clipPts, part, col, colS) => {
        ctx.save();
        ctx.beginPath();
        poly(clipPts)(ctx);
        ctx.clip();
        sh(ctx, poly(part), col, colS, { cel: [6, 6], lw: 3.6 });
        ctx.restore();
        // 破邊
        ctx.beginPath();
        poly(clipPts)(ctx);
        ctx.save();
        ctx.clip();
        ctx.beginPath();
        poly(part)(ctx);
        ctx.clip();
        ctx.beginPath();
        poly(clipPts)(ctx);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
      };
      shell([[hx - 80, hy - 80], [hx + 12, hy - 80], [hx - 4, hy - 44], [hx + 14, hy - 26], [hx - 14, hy - 2], [hx - 4, hy + 20], [hx - 80, hy + 40]], L.head, TS.stone, TS.stoneS);
      shell([[70, -130], [140, -130], [140, -30], [70, -30], [74, -60], [96, -76], [84, -100]], L.pawN, TS.stone, TS.stoneS);
      shell([[-200, -140], [-120, -160], [-96, -130], [-116, -110], [-100, -80], [-200, -40]], L.haunch, TS.stone, TS.stoneS);
      mossPatch(ctx, -150, -150, 14, 6, 21, 1);
      mossPatch(ctx, hx - 24, hy - 46, 16, 6, 101, 0);
      // 周圍漂浮的石殼碎片（有的還長著青苔）
      for (let i = 0; i < 11; i++) {
        const a = t * (0.22 + hash(i) * 0.2) + i * 0.62;
        const r = 180 + hash(i + 3) * 70;
        const x = Math.cos(a) * r;
        const y = -170 + Math.sin(a) * r * 0.7;
        const s = 10 + hash(i + 5) * 14;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * (hash(i + 8) - 0.5) * 2 + i);
        sh(ctx, (c) => {
          c.moveTo(-s, -s * 0.4);
          c.lineTo(-s * 0.2, -s);
          c.lineTo(s, -s * 0.3);
          c.lineTo(s * 0.5, s * 0.8);
          c.lineTo(-s * 0.7, s * 0.6);
          c.closePath();
        }, TS.stone, null, { lw: 2.6, hl: false });
        if (i % 3 === 0) ell(ctx, -s * 0.2, -s * 0.6, s * 0.5, s * 0.22, TS.moss, TS.mossS, { lw: 1.8, hl: false });
        ctx.restore();
        // 碎片後面拖著的星沙
        ctx.fillStyle = 'rgba(255,233,160,0.6)';
        for (let j = 1; j < 4; j++) {
          const aa = a - j * 0.05;
          ctx.beginPath();
          ctx.arc(Math.cos(aa) * r, -170 + Math.sin(aa) * r * 0.7, 2.2 - j * 0.5, 0, TAU);
          ctx.fill();
        }
      }
    }

    // ── 臉 ──
    // 額頭的星楓葉刻印（歷代守葉獸的印記）
    sh(ctx, (c) => A.mapleLeafPath(c, hx + 2, hy - 30, 13), P2 ? '#ffe9a0' : '#d8c8a8', P2 ? '#f0b050' : '#a89878', { lw: 2.6, hl: false, cel: [2, 2] });
    if (!dead && (P2 || glowK > 0.3)) glow(ctx, hx + 2, hy - 30, 36, '255,230,150', 0.55);
    // 口鼻
    sh(ctx, poly(L.muzzle), P2 ? '#a89a84' : TS.stone, TS.stoneS, { lw: 3.2, cel: [4, 4], hl: false });
    ctx.fillStyle = A.c(TS.stoneD);
    [[hx + 26, hy + 24], [hx + 34, hy + 30], [hx + 22, hy + 32], [hx + 42, hy + 22]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, TAU);
      ctx.fill();
    });
    sh(ctx, (c) => {
      c.moveTo(hx + 48, hy + 4);
      c.quadraticCurveTo(hx + 64, hy - 2, hx + 74, hy + 8);
      c.quadraticCurveTo(hx + 70, hy + 20, hx + 58, hy + 18);
      c.quadraticCurveTo(hx + 50, hy + 16, hx + 48, hy + 4);
      c.closePath();
    }, '#5a4e46', null, { lw: 2.4, hl: [hx + 58, hy + 4, 4, 2] });
    // 嘴：預警時張開（露出裡面的星空）
    const roar = !dead && (eyeK > 0.6 || st === 'transform');
    if (roar) {
      const mouth = (c) => {
        c.moveTo(hx + 26, hy + 30);
        c.quadraticCurveTo(hx + 52, hy + 20, hx + 72, hy + 28);
        c.quadraticCurveTo(hx + 62, hy + 58, hx + 32, hy + 46);
        c.closePath();
      };
      sh(ctx, mouth, TS.void, null, { lw: 3 });
      ctx.save();
      ctx.beginPath();
      mouth(ctx);
      ctx.clip();
      glow(ctx, hx + 50, hy + 38, 22, P2 ? '255,160,230' : '255,220,140', 0.8);
      sparkle(ctx, hx + 48, hy + 38, 6, '#ffffff');
      ctx.restore();
      [[hx + 34, hy + 29, 1], [hx + 64, hy + 27, 1], [hx + 40, hy + 46, -1]].forEach(([x, y, d]) => {
        sh(ctx, (c) => {
          c.moveTo(x - 4.5, y);
          c.lineTo(x, y + 10 * d);
          c.lineTo(x + 4.5, y);
          c.closePath();
        }, '#f4ecd8', null, { lw: 1.8, hl: false });
      });
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 30, hy + 38);
      ctx.quadraticCurveTo(hx + 50, hy + 30, hx + 70, hy + 32);
      ctx.stroke();
      sh(ctx, (c) => {
        c.moveTo(hx + 58, hy + 31);
        c.lineTo(hx + 61, hy + 40);
        c.lineTo(hx + 64, hy + 31);
        c.closePath();
      }, '#f4ecd8', null, { lw: 1.6, hl: false });
    }
    // 下巴的捲鬚
    if (!P2) {
      curl(ctx, hx + 30, hy + 52, 9, TS.mane, TS.maneS, 1);
      curl(ctx, hx + 46, hy + 50, 8, TS.mane, TS.maneS, -1);
    }
    // 眼睛：深深的眼窩裡透出的光
    const eyes = [[hx + 6, hy - 6, 1.2, 1], [hx + 38, hy - 8, 0.95, -1]];
    eyes.forEach(([x, y, s, d]) => {
      if (!P2) ell(ctx, x + 1, y + 1, 15 * s, 9 * s, TS.stoneD, null, { noStroke: true, hl: false });
      if (dead) {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 9 * s, y);
        ctx.lineTo(x + 9 * s, y);
        ctx.stroke();
        return;
      }
      const col = P2 ? '225,190,255' : '255,220,130';
      // 平常閉著眼（沉睡的石像），只有預警與出招時睜開；睜開的眼沒有眼珠，整顆是發光的眼白（邊緣帶一點金／星光紫）
      if (openK <= 0.02) {
        glow(ctx, x, y + 2 * s, 16 * s, col, 0.28);
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(col, 0.75);
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(x - 10 * s, y + 1 * s * d);
        ctx.quadraticCurveTo(x, y + 6 * s, x + 10 * s, y + 2 * s * d);
        ctx.stroke();
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 12 * s, y - 1 * s * d);
        ctx.quadraticCurveTo(x, y + 5 * s, x + 12 * s, y + 1 * s * d);
        ctx.stroke();
      } else {
        const hs = openK;
        glow(ctx, x, y, (30 + eyeK * 24) * s, col, (0.7 + eyeK * 0.3) * hs);
        const eyeP = (c) => {
          c.moveTo(x - 12 * s, y - 1 * s * d);
          c.quadraticCurveTo(x, y - 8 * s * hs, x + 12 * s, y + 1 * s * d);
          c.quadraticCurveTo(x, y + 8 * s * hs, x - 12 * s, y - 1 * s * d);
          c.closePath();
        };
        const rg = (hex, al) => 'rgba(' + U.hexToRgb(A.c(hex)).join(',') + ',' + al + ')';
        const ig = ctx.createRadialGradient(x + 1 * s, y, 0.5 * s, x + 1 * s, y, 12 * s);
        ig.addColorStop(0, rg('#ffffff', 1));
        ig.addColorStop(0.55, rg(P2 ? '#fbf4ff' : '#fffbea', 1));
        ig.addColorStop(0.85, rg(P2 ? '#e2c8ff' : '#ffe9a8', 1));
        ig.addColorStop(1, rg(P2 ? '#b98cff' : '#ffc860', 1));
        sh(ctx, eyeP, m.hurtFlash > 0.05 ? '#ffffff' : P2 ? '#eadcff' : '#fff4c8', null, { lw: 2.6, hl: false, noStroke: true });
        if (!(m.hurtFlash > 0.05)) {
          ctx.beginPath();
          eyeP(ctx);
          ctx.fillStyle = ig;
          ctx.fill();
        }
        ctx.beginPath();
        eyeP(ctx);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.6;
        ctx.lineJoin = 'round';
        ctx.stroke();
        glow(ctx, x, y, 13 * s, P2 ? '200,140,255' : '255,200,90', 0.45 * hs);
      }
      if (openK > 0.5 && (P2 || eyeK > 0.6)) {
        ctx.strokeStyle = rgba(col, 0.7);
        ctx.lineWidth = 3 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 10 * s, y);
        ctx.quadraticCurveTo(x - 26 * s, y - 4 + Math.sin(t * 6) * 2, x - 42 * s, y - 12);
        ctx.stroke();
      }
      // 厚重的石眉：往鼻樑壓下來（很兇）
      sh(ctx, (c) => {
        c.moveTo(x - 16 * s * d, y - 16 * s);
        c.quadraticCurveTo(x, y - 18 * s, x + 16 * s * d, y - 6 * s);
        c.lineTo(x + 12 * s * d, y - 1 * s);
        c.quadraticCurveTo(x, y - 10 * s, x - 15 * s * d, y - 9 * s);
        c.closePath();
      }, TS.mane, TS.maneS, { lw: 2.6, hl: false, shadeY: y - 8 * s });
    });

    // 身體下方流出來的星沙（懸空）
    if (!dead) {
      ctx.fillStyle = '#ffe9a0';
      for (let i = 0; i < 18; i++) {
        const q = (((ts * 0.7 + hash(i + 11)) % 1) + 1) % 1;
        dot(-60 + hash(i) * 140 + Math.sin(q * 5 + i) * 6, 0 + q * 40, 1.5 + hash(i + 2) * 1.5, (1 - q) * 0.8);
      }
      dotFlush(ctx, '#ffe9a0');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  Object.assign(A.MONSTER_DRAW, { frostSpirit, timeItself });
})();
