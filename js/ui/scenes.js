// 標題畫面、開場、進入遊戲。
(function () {
  'use strict';
  const U = G.util;
  const A = G.art;

  // ════════════════════════ 開場動畫 ════════════════════════
  // 八個鏡頭（G.data.story.intro 每頁一個 shot）。靜態的大圖層第一次用到前先畫進離屏畫布，
  // 之後每幀只是貼圖＋少量即時的光、葉子、粒子；粒子全部是「時間的函數」，沒有狀態，跳頁也不會亂。
  const PI2 = Math.PI * 2;
  const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const sm = (a, b, v) => {
    const x = cl((v - a) / (b - a));
    return x * x * (3 - 2 * x);
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  // 五片星楓葉（綠、藍、紅、霜白、金色心葉）
  const LEAVES = [
    { col: '#7ad86a', rgb: '122,216,106' },
    { col: '#5ab8ff', rgb: '90,184,255' },
    { col: '#ff7a3a', rgb: '255,122,58' },
    { col: '#dff4ff', rgb: '223,244,255' },
    { col: '#ffd35a', rgb: '255,211,90' },
  ];
  // 葉子在星楓樹上的位置（樹的原點＝樹幹底部，s = 1 時）
  const TREE_LEAVES = [[-190, -450], [196, -446], [-116, -352], [126, -356], [0, -548]];
  const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const BAR = 64; // 上下黑邊
  const FULL = { ox: -80, oy: -50, w: 1440, h: 830 }; // 全畫面圖層多留邊，鏡頭平移時不露底

  const IX = { k: 1, bk: 1, L: {}, snap: null, trans: null, cue: 0 };

  function newCv(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  const GLOW = {};
  function glowSpr(rgb) {
    if (GLOW[rgb]) return GLOW[rgb];
    const c = newCv(64, 64);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(' + rgb + ',1)');
    g.addColorStop(0.28, 'rgba(' + rgb + ',0.5)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return (GLOW[rgb] = c);
  }
  // 加亮的柔光（加法混色）
  function glow(ctx, x, y, r, rgb, a) {
    if (a <= 0.004) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= Math.min(1, a);
    ctx.drawImage(glowSpr(rgb), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  // 一般混色的柔光（天空的太陽暈）
  function haze(ctx, x, y, r, rgb, a) {
    if (a <= 0.004) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    ctx.drawImage(glowSpr(rgb), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  // 平塗＋月牙陰影＋高光＋深棕描邊（任何座標都能用，不受 A.shape 的 ±500 限制）
  function paint(c, path, fill, o) {
    o = o || {};
    c.beginPath();
    path(c);
    c.fillStyle = A.c(fill);
    c.fill();
    if (o.shade) {
      c.save();
      c.clip();
      c.fillStyle = A.c(o.shade);
      if (o.cel) {
        c.fillRect(-6000, -6000, 14000, 14000);
        c.translate(-o.cel[0], -o.cel[1]);
        c.beginPath();
        path(c);
        c.fillStyle = A.c(fill);
        c.fill();
      } else c.fillRect(-6000, o.shadeY, 14000, 14000);
      c.restore();
    }
    if (o.hl) {
      c.save();
      c.globalAlpha *= o.hlA || 0.5;
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(o.hl[0], o.hl[1], o.hl[2], o.hl[3], o.hl[4] == null ? -0.5 : o.hl[4], 0, PI2);
      c.fill();
      c.restore();
    }
    if (o.lw === 0) return;
    c.beginPath();
    path(c);
    c.lineWidth = o.lw || 3;
    c.strokeStyle = o.line || A.outline();
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();
  }

  // 雲朵、樹冠用：上緣一道亮邊、下緣一道月牙陰影
  function lit(c, path, col, o) {
    if (o.lw) {
      // 描邊先畫、再蓋上填色：只留下外輪廓，圓與圓之間不會有線
      c.beginPath();
      path(c);
      c.lineWidth = o.lw * 2;
      c.strokeStyle = o.line || A.outline();
      c.lineJoin = 'round';
      c.stroke();
    }
    c.save();
    c.beginPath();
    path(c);
    c.fillStyle = A.c(o.hi);
    c.fill();
    c.clip();
    c.translate(0, o.rim);
    c.beginPath();
    path(c);
    c.fillStyle = A.c(o.shade);
    c.fill();
    c.clip();
    c.translate(-(o.dx || 0), -o.sh);
    c.beginPath();
    path(c);
    c.fillStyle = A.c(col);
    c.fill();
    c.restore();
  }
  const blobs = (list) => (p) => list.forEach((b) => {
    p.moveTo(b[0] + b[2], b[1]);
    p.arc(b[0], b[1], b[2], 0, PI2);
  });

  function sparkle(c, x, y, r, a, col) {
    if (a <= 0.01) return;
    c.save();
    c.globalAlpha *= Math.min(1, a);
    c.fillStyle = col || '#fffbe0';
    c.beginPath();
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y);
    c.quadraticCurveTo(x, y, x, y - r);
    c.fill();
    c.restore();
  }

  function leafGem(c, x, y, s, col, rot) {
    c.save();
    c.translate(x, y);
    c.rotate(rot || 0);
    paint(c, (p) => A.mapleLeafPath(p, 0, 0, s), col, {
      shade: U.mix(col, '#40305a', 0.3), cel: [s * 0.22, s * 0.2], lw: Math.max(1.3, s * 0.15),
      hl: [-s * 0.3, -s * 0.38, s * 0.24, s * 0.12], hlA: 0.7,
    });
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.lineWidth = Math.max(0.8, s * 0.07);
    c.beginPath();
    c.moveTo(0, s * 0.75);
    c.lineTo(0, -s * 0.6);
    c.moveTo(0, s * 0.1);
    c.lineTo(-s * 0.55, -s * 0.2);
    c.moveTo(0, s * 0.1);
    c.lineTo(s * 0.55, -s * 0.2);
    c.stroke();
    c.restore();
  }

  // ── 離屏圖層 ──
  function layer(id) {
    let L = IX.L[id];
    if (L) return L;
    const d = DEFS[id];
    const k = Math.max(0.75, Math.min(IX.k, d.kmax || 1.5));
    const c = newCv(d.w * k, d.h * k);
    const x = c.getContext('2d');
    x.scale(k, k);
    x.translate(-(d.ox || 0), -(d.oy || 0));
    IX.bk = k;
    d.draw(x);
    L = IX.L[id] = { c, x: d.ox || 0, y: d.oy || 0, w: d.w, h: d.h };
    return L;
  }
  function blit(ctx, id, dx, dy) {
    const L = layer(id);
    ctx.drawImage(L.c, L.x + (dx || 0), L.y + (dy || 0), L.w, L.h);
  }
  // 以圖層中心點（cx, cy）縮放貼上
  function blitAt(ctx, id, x, y, s, rot) {
    const L = layer(id);
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.drawImage(L.c, L.x, L.y, L.w, L.h);
    ctx.restore();
  }

  // 鏡頭：C = { x, y, z, sx, sy }，f 是圖層的遠近（0 很遠不動、1 焦點平面）
  function cam(ctx, C, f, fn) {
    const z = 1 + (C.z - 1) * f;
    ctx.save();
    ctx.translate(W() / 2 + (C.sx || 0) * f, H() / 2 + (C.sy || 0) * f);
    ctx.scale(z, z);
    ctx.translate(-(W() / 2 + (C.x - W() / 2) * f), -(H() / 2 + (C.y - H() / 2) * f));
    fn();
    ctx.restore();
  }
  const W = () => G.W;
  const H = () => G.H;

  // 可以左右無限捲動的雲帶
  function band(ctx, id, scroll, y, x0) {
    const L = layer(id);
    const off = -(scroll % L.w) - x0;
    ctx.drawImage(L.c, off, y + L.y, L.w, L.h);
    ctx.drawImage(L.c, off + L.w, y + L.y, L.w, L.h);
  }

  // 天空漸層＋太陽暈：畫一次低解析度的小圖，每幀放大貼上（漸層放大看不出來）
  const SKYC = {};
  function sky(ctx, stops, hz) {
    const key = JSON.stringify([stops, hz]);
    let c = SKYC[key];
    if (!c) {
      c = SKYC[key] = newCv(320, 180);
      const x = c.getContext('2d');
      x.scale(0.25, 0.25);
      const g = x.createLinearGradient(0, 0, 0, 720);
      stops.forEach((st) => g.addColorStop(st[0], st[1]));
      x.fillStyle = g;
      x.fillRect(0, 0, 1280, 720);
      if (hz) haze(x, hz[0], hz[1], hz[2], hz[3], hz[4]);
    }
    ctx.drawImage(c, 0, 0, W(), H());
  }


  // ════════ 美術零件 ════════
  function cloudBand(c, w, seed, rows) {
    const r = U.seeded(seed);
    rows.forEach((row) => {
      const list = [];
      const n = row.n;
      for (let i = 0; i < n; i++) {
        const x = ((i + r() * 0.6) / n) * w;
        const rr = row.r[0] + r() * (row.r[1] - row.r[0]);
        const y = row.y + r() * row.jit;
        list.push([x, y, rr], [x - w, y, rr], [x + w, y, rr]);
      }
      const path = (p) => {
        blobs(list)(p);
        p.rect(-w, row.y + 4, w * 3, row.fill || 400);
      };
      lit(c, path, row.col, { hi: row.hi, shade: row.shade, rim: row.rim || 6, sh: row.sh || 18, lw: 0 });
    });
  }

  function ringSprite(c, r, col) {
    c.strokeStyle = col;
    c.fillStyle = col;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, r, 0, PI2);
    c.stroke();
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(0, 0, r - 18, 0, PI2);
    c.stroke();
    c.beginPath();
    c.arc(0, 0, r * 0.6, 0, PI2);
    c.stroke();
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * PI2;
      const big = k % 5 === 0;
      c.lineWidth = big ? 3 : 1.3;
      c.beginPath();
      c.moveTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
      c.lineTo(Math.cos(a) * (r - (big ? 15 : 8)), Math.sin(a) * (r - (big ? 15 : 8)));
      c.stroke();
    }
    c.font = 'bold ' + Math.round(r * 0.11) + 'px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let k = 0; k < 12; k++) {
      c.save();
      c.rotate((k / 12) * PI2);
      c.fillText(ROMAN[k], 0, -(r - 18 - r * 0.09));
      c.restore();
    }
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * PI2;
      c.beginPath();
      c.arc(Math.cos(a) * (r * 0.6 + 8), Math.sin(a) * (r * 0.6 + 8), k % 2 ? 1.6 : 2.8, 0, PI2);
      c.fill();
    }
  }

  const MARBLE = '#fbf6ec';
  const MARBLE_S = '#ddd0bd';
  const GOLD = '#e8b84a';

  function column(c, x, base, w, h, o) {
    o = o || {};
    const lw = o.lw || 2.5;
    const M = o.m || MARBLE;
    const S = o.s || MARBLE_S;
    paint(c, (p) => p.rect(x - w * 0.72, base - w * 0.36, w * 1.44, w * 0.36), M, { shade: S, cel: [w * 0.3, 0], lw });
    const top = base - h;
    const r = U.seeded(o.seed || 7);
    const body = (p) => {
      p.moveTo(x - w / 2, base - w * 0.36);
      if (o.broken) {
        p.lineTo(x - w / 2, top + w * 0.5);
        p.lineTo(x - w * 0.22, top + w * (0.1 + r() * 0.3));
        p.lineTo(x - w * 0.02, top + w * (0.35 + r() * 0.3));
        p.lineTo(x + w * 0.2, top - w * 0.12);
        p.lineTo(x + w / 2, top + w * (0.3 + r() * 0.3));
      } else {
        p.lineTo(x - w / 2, top);
        p.lineTo(x + w / 2, top);
      }
      p.lineTo(x + w / 2, base - w * 0.36);
      p.closePath();
    };
    paint(c, body, M, { shade: S, cel: [w * 0.3, 0], lw: 0 });
    c.save();
    c.beginPath();
    body(c);
    c.clip();
    c.strokeStyle = 'rgba(130,105,80,0.22)';
    c.lineWidth = Math.max(1, w * 0.05);
    for (const k of [-0.25, 0, 0.25]) {
      c.beginPath();
      c.moveTo(x + k * w, top - 10);
      c.lineTo(x + k * w, base);
      c.stroke();
    }
    if (o.crack) {
      c.strokeStyle = 'rgba(90,60,40,0.45)';
      c.lineWidth = Math.max(1, w * 0.04);
      c.beginPath();
      c.moveTo(x - w * 0.5, top + h * 0.45);
      c.lineTo(x - w * 0.1, top + h * 0.5);
      c.lineTo(x + w * 0.05, top + h * 0.58);
      c.stroke();
    }
    c.restore();
    c.beginPath();
    body(c);
    c.lineWidth = lw;
    c.strokeStyle = A.outline();
    c.lineJoin = 'round';
    c.stroke();
    if (!o.broken) {
      paint(c, (p) => p.ellipse(x, top - w * 0.05, w * 0.62, w * 0.18, 0, 0, PI2), M, { shade: S, cel: [0, -w * 0.08], lw });
      paint(c, (p) => p.rect(x - w * 0.8, top - w * 0.42, w * 1.6, w * 0.28), M, { shade: S, cel: [w * 0.3, 0], lw });
      c.fillStyle = A.c(GOLD);
      c.fillRect(x - w * 0.8, top - w * 0.2, w * 1.6, Math.max(1.5, w * 0.06));
    }
    if (o.ivy) ivy(c, x - w * 0.5, top + (o.broken ? w * 0.6 : 0), h * o.ivy, o.seed || 3, w);
  }

  function ivy(c, x, y, len, seed, w) {
    const r = U.seeded(seed + 11);
    c.strokeStyle = A.c('#4f8a44');
    c.lineWidth = Math.max(1.5, w * 0.07);
    c.beginPath();
    c.moveTo(x, y);
    const n = 6;
    for (let i = 1; i <= n; i++) c.quadraticCurveTo(x + (i % 2 ? 1 : -0.2) * w * 0.5, y + (len * (i - 0.5)) / n, x + (r() - 0.3) * w * 0.3, y + (len * i) / n);
    c.stroke();
    for (let i = 0; i < 9; i++) {
      const yy = y + (len * i) / 9 + 4;
      const xx = x + (r() - 0.35) * w * 0.5;
      paint(c, (p) => p.ellipse(xx, yy, w * 0.14, w * 0.09, r() * 3, 0, PI2), i % 2 ? '#6fb35c' : '#5a9e4e', { lw: Math.max(1, w * 0.035) });
    }
  }

  function grassTuft(c, x, y, s, col, dark) {
    paint(c, (p) => {
      p.moveTo(x - 12 * s, y);
      p.quadraticCurveTo(x - 10 * s, y - 10 * s, x - 16 * s, y - 20 * s);
      p.quadraticCurveTo(x - 4 * s, y - 12 * s, x - 3 * s, y - 6 * s);
      p.quadraticCurveTo(x - 2 * s, y - 18 * s, x + 1 * s, y - 26 * s);
      p.quadraticCurveTo(x + 5 * s, y - 14 * s, x + 4 * s, y - 6 * s);
      p.quadraticCurveTo(x + 9 * s, y - 14 * s, x + 17 * s, y - 18 * s);
      p.quadraticCurveTo(x + 11 * s, y - 8 * s, x + 12 * s, y);
      p.closePath();
    }, col || '#8cc85e', { shade: dark || '#62a04a', cel: [4 * s, -4 * s], lw: Math.max(1.4, 2.2 * Math.min(1.2, s)) });
  }

  function flower(c, x, y, s, col, ctr) {
    c.strokeStyle = A.c('#5a9a4a');
    c.lineWidth = Math.max(1, 1.6 * s);
    c.beginPath();
    c.moveTo(x, y + 12 * s);
    c.quadraticCurveTo(x - 2 * s, y + 6 * s, x, y);
    c.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI2 - Math.PI / 2;
      paint(c, (p) => p.ellipse(x + Math.cos(a) * 4.2 * s, y + Math.sin(a) * 4.2 * s, 3.6 * s, 2.7 * s, a, 0, PI2), col, { lw: Math.max(1, 1.3 * s) });
    }
    c.fillStyle = A.c(ctr || '#ffd84a');
    c.beginPath();
    c.arc(x, y, 2.2 * s, 0, PI2);
    c.fill();
  }

  function mushroom(c, x, y, s) {
    paint(c, (p) => A.roundRect(p, x - 4 * s, y - 13 * s, 8 * s, 13 * s, 3 * s), '#fff3dc', { shade: '#e6d2b0', cel: [2 * s, 0], lw: Math.max(1.4, 2 * s) });
    paint(c, (p) => {
      p.moveTo(x - 13 * s, y - 11 * s);
      p.quadraticCurveTo(x - 12 * s, y - 27 * s, x, y - 27 * s);
      p.quadraticCurveTo(x + 12 * s, y - 27 * s, x + 13 * s, y - 11 * s);
      p.closePath();
    }, '#ec5a48', { shade: '#c23e34', cel: [4 * s, 2 * s], lw: Math.max(1.4, 2 * s), hl: [x - 5 * s, y - 22 * s, 3.5 * s, 2 * s] });
    c.fillStyle = A.c('#fff6ea');
    [[-6, -16, 2.2], [4, -21, 2], [8, -14, 1.6]].forEach(([dx, dy, r]) => {
      c.beginPath();
      c.arc(x + dx * s, y + dy * s, r * s, 0, PI2);
      c.fill();
    });
  }

  // 星楓樹。part：'trunk'、'canopy' 或全部
  function starTree(c, s, part) {
    c.save();
    c.scale(s, s);
    const lw = Math.max(1.5, Math.min(4.4, 3.4 * s)) / s;
    if (part !== 'canopy') {
      const bark = '#8f5d3c';
      const barkS = '#673f28';
      [[-1, 150, 0], [1, 160, 0], [-1, 92, 8], [1, 100, 8]].forEach(([d, len, dy]) => {
        paint(c, (p) => {
          p.moveTo(d * 16, -70);
          p.quadraticCurveTo(d * 44, -12 + dy, d * len, 6 + dy * 0.4);
          p.quadraticCurveTo(d * (len - 20), 14, d * (len - 40), 10);
          p.quadraticCurveTo(d * 36, 8, d * 6, -8);
          p.closePath();
        }, bark, { shade: barkS, cel: [0, -7], lw });
      });
      const trunk = (p) => {
        p.moveTo(-58, 2);
        p.bezierCurveTo(-30, -14, -26, -60, -30, -110);
        p.bezierCurveTo(-34, -170, -18, -220, -30, -270);
        p.quadraticCurveTo(-60, -320, -118, -352);
        p.lineTo(-100, -372);
        p.quadraticCurveTo(-44, -338, -8, -300);
        p.quadraticCurveTo(-6, -350, -14, -400);
        p.lineTo(8, -404);
        p.quadraticCurveTo(12, -350, 10, -306);
        p.quadraticCurveTo(26, -340, 70, -378);
        p.lineTo(86, -360);
        p.quadraticCurveTo(34, -320, 26, -260);
        p.bezierCurveTo(22, -200, 36, -150, 30, -100);
        p.bezierCurveTo(26, -50, 30, -14, 60, 2);
        p.closePath();
      };
      paint(c, trunk, bark, { shade: barkS, cel: [16, 0], lw });
      c.save();
      c.beginPath();
      trunk(c);
      c.clip();
      c.strokeStyle = A.c('rgba(70,38,22,0.4)');
      c.lineWidth = (2.2 * Math.min(1.3, s)) / s;
      [[-14, 0], [2, 1], [16, 2]].forEach(([dx, k]) => {
        c.beginPath();
        c.moveTo(dx, -8);
        c.bezierCurveTo(dx - 8 + k * 3, -90, dx + 10, -170, dx - 4 + k * 2, -260);
        c.stroke();
      });
      c.strokeStyle = 'rgba(255,230,190,0.25)';
      c.beginPath();
      c.moveTo(-20, -30);
      c.bezierCurveTo(-24, -100, -12, -180, -22, -250);
      c.stroke();
      c.restore();
      // 樹幹上的星楓紋（微微發光）
      c.save();
      c.globalAlpha = 0.85;
      paint(c, (p) => A.mapleLeafPath(p, 0, -170, 17), '#f8dc8a', { shade: '#e0b050', cel: [3, 3], lw: lw * 0.7 });
      c.restore();
      // 樹根的苔
      [[-66, -2, 18], [-38, -6, 12], [70, 0, 14], [110, 6, 10]].forEach(([x, y, r]) => {
        paint(c, (p) => p.ellipse(x, y, r, r * 0.45, 0, Math.PI, 0), '#86c060', { shade: '#5f9a4a', cel: [0, -3], lw: lw * 0.8 });
      });
    }
    if (part !== 'trunk') {
      const back = [[-250, -392, 58], [250, -392, 58], [-160, -440, 90], [160, -440, 90], [-66, -496, 92], [66, -496, 92], [0, -520, 84], [-214, -470, 56], [214, -470, 56]];
      const front = [[-206, -334, 70], [206, -334, 70], [-104, -350, 92], [104, -350, 92], [0, -392, 104]];
      lit(c, blobs(back), '#4f9c5a', { hi: '#86cc78', shade: '#3a7548', rim: 10, sh: 30, dx: -8, lw });
      lit(c, blobs(front), '#5fb060', { hi: '#9ada86', shade: '#43824e', rim: 10, sh: 30, dx: -8, lw });
      c.save();
      c.beginPath();
      blobs(back.concat(front))(c);
      c.clip();
      const r = U.seeded(42);
      for (let i = 0; i < 46; i++) {
        const x = -270 + r() * 540;
        const y = -590 + r() * 290;
        c.globalAlpha = 0.55;
        c.fillStyle = A.c(['#72c46a', '#468c52', '#86d27a'][i % 3]);
        c.beginPath();
        A.mapleLeafPath(c, x, y, 9 + r() * 8);
        c.fill();
      }
      c.globalAlpha = 1;
      for (let i = 0; i < 26; i++) sparkle(c, -250 + r() * 500, -580 + r() * 280, 3 + r() * 4, 0.55 + r() * 0.4, '#fff6c8');
      c.restore();
    }
    c.restore();
  }

  // 石獅像：小獅子的石頭版（臉一模一樣——伏筆）
  function statue(c, x, base, s, dir) {
    const lw = Math.max(1.3, 2.6 * Math.min(1.2, s));
    const pw = 96 * s;
    const ph = 62 * s;
    paint(c, (p) => p.rect(x - pw / 2 - 6 * s, base - 11 * s, pw + 12 * s, 11 * s), '#d6ccbc', { shade: '#b0a390', cel: [10 * s, 0], lw });
    paint(c, (p) => p.rect(x - pw / 2, base - ph, pw, ph - 10 * s), '#e4dccd', { shade: '#bdb09c', cel: [pw * 0.2, 0], lw });
    paint(c, (p) => p.rect(x - pw / 2 - 8 * s, base - ph - 12 * s, pw + 16 * s, 12 * s), '#efe8dc', { shade: '#c9bca8', cel: [10 * s, 0], lw });
    c.save();
    c.translate(x, base - ph / 2 - 4 * s);
    paint(c, (p) => A.mapleLeafPath(p, 0, 0, 12 * s), GOLD, { shade: '#b8862a', cel: [2 * s, 2 * s], lw: lw * 0.7 });
    c.restore();
    c.strokeStyle = 'rgba(90,64,44,0.5)';
    c.lineWidth = Math.max(1, 1.5 * s);
    c.beginPath();
    c.moveTo(x + pw * 0.3 * dir, base - ph + 2 * s);
    c.lineTo(x + pw * 0.22 * dir, base - ph + 16 * s);
    c.lineTo(x + pw * 0.34 * dir, base - ph + 26 * s);
    c.stroke();
    for (let i = 0; i < 4; i++) {
      const mx = x - dir * (pw * 0.5 - i * 11 * s);
      paint(c, (p) => p.ellipse(mx, base - ph - 12 * s, 8 * s, (3 + (i % 2) * 2) * s, 0, 0, Math.PI), i % 2 ? '#8cc466' : '#7ab55a', { lw: lw * 0.6 });
    }
    // 石頭獅子：先畫到小畫布，再整體蓋一層石色
    const k = IX.bk;
    const ls = 1.55 * s;
    const tw = 130 * ls;
    const th = 110 * ls;
    const tc = newCv(tw * k, th * k);
    const x2 = tc.getContext('2d');
    x2.scale(k, k);
    const m0 = A.mode;
    const mc = A.modeColor;
    const ma = A.modeAmt;
    A.mode = 'tint';
    A.modeColor = '#b9b2c8';
    A.modeAmt = 0.8;
    try {
      x2.save();
      x2.translate(tw / 2, th - 3 * ls);
      x2.scale(ls, ls);
      A.drawLion(x2, 0, 0, dir, { state: 'idle', t: 0.05, p: 0 });
      x2.restore();
    } finally {
      A.mode = m0;
      A.modeColor = mc;
      A.modeAmt = ma;
    }
    x2.globalCompositeOperation = 'source-atop';
    x2.fillStyle = 'rgba(160,150,176,0.3)';
    x2.fillRect(0, 0, tw, th);
    x2.fillStyle = A.c('#86b866');
    [[-18, -54, 9, 4], [-26, -40, 6, 3], [6, -76, 7, 3]].forEach(([dx, dy, rx, ry]) => {
      x2.beginPath();
      x2.ellipse(tw / 2 + dx * dir * ls, th - 3 * ls + dy * ls, rx * ls, ry * ls, 0, 0, PI2);
      x2.fill();
    });
    c.drawImage(tc, x - tw / 2, base - ph - 12 * s - th + 4 * s, tw, th);
  }

  // 浮空的岩塊（底下倒掛的山）
  function isleRock(c, w, d, seed, o) {
    o = o || {};
    const r = U.seeded(seed);
    const L = [];
    const R = [];
    for (let i = 0; i <= 9; i++) {
      const u = i / 10;
      const sp = Math.pow(1 - u, 0.85) * w * 0.5;
      L.push([-sp - (r() - 0.3) * w * 0.05, d * u + (r() - 0.5) * d * 0.05]);
      R.push([sp + (r() - 0.3) * w * 0.05, d * u + (r() - 0.5) * d * 0.05]);
    }
    L[0] = [-w / 2, 2];
    R[0] = [w / 2, 2];
    const tip = [w * 0.03, d];
    const path = (p) => {
      p.moveTo(L[0][0], L[0][1]);
      for (const q of L) p.lineTo(q[0], q[1]);
      p.lineTo(tip[0], tip[1]);
      for (let i = R.length - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]);
      p.closePath();
    };
    const lw = o.lw || 3;
    paint(c, path, o.rock || '#c9ad98', { shade: o.rockS || '#98786a', cel: [w * 0.13, d * 0.05], lw: 0 });
    c.save();
    c.beginPath();
    path(c);
    c.clip();
    c.strokeStyle = 'rgba(255,240,220,0.35)';
    c.lineWidth = d * 0.05;
    c.beginPath();
    c.moveTo(-w / 2, d * 0.1);
    c.quadraticCurveTo(0, d * 0.16, w / 2, d * 0.08);
    c.stroke();
    c.strokeStyle = 'rgba(90,58,40,0.2)';
    c.lineWidth = Math.max(1.5, d * 0.012);
    for (let k = 1; k < 6; k++) {
      c.beginPath();
      c.moveTo(-w / 2, d * k * 0.15 + 6);
      c.quadraticCurveTo(-w * 0.1, d * k * 0.15 + 18 - k * 2, w / 2, d * k * 0.15);
      c.stroke();
    }
    if (o.gold !== false) {
      c.strokeStyle = A.c(GOLD);
      c.globalAlpha = 0.75;
      c.lineWidth = Math.max(1.2, w * 0.005);
      for (let k = 0; k < 3; k++) {
        let vx = (r() - 0.5) * w * 0.6;
        let vy = d * 0.12;
        c.beginPath();
        c.moveTo(vx, vy);
        for (let j = 0; j < 4; j++) {
          vx += (r() - 0.5) * w * 0.07;
          vy += d * 0.12;
          c.lineTo(vx, vy);
        }
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    c.restore();
    c.beginPath();
    path(c);
    c.lineWidth = lw;
    c.strokeStyle = A.outline();
    c.lineJoin = 'round';
    c.stroke();
    // 底端的晶石
    paint(c, (p) => {
      p.moveTo(tip[0], tip[1] - d * 0.06);
      p.lineTo(tip[0] + d * 0.035, tip[1] + d * 0.01);
      p.lineTo(tip[0], tip[1] + d * 0.09);
      p.lineTo(tip[0] - d * 0.035, tip[1] + d * 0.01);
      p.closePath();
    }, '#ffe08a', { shade: '#e0a838', cel: [d * 0.015, 0], lw: lw * 0.8 });
    // 垂下來的根與藤
    if (o.roots !== false) {
      for (let i = 0; i < Math.round(w / 70); i++) {
        const x0 = -w * 0.42 + (i / Math.max(1, Math.round(w / 70) - 1)) * w * 0.84 + (r() - 0.5) * 20;
        const len = d * (0.12 + r() * 0.28);
        const green = i % 2 === 0;
        c.strokeStyle = A.c(green ? '#5a9a4a' : '#7a5238');
        c.lineWidth = Math.max(1.4, w * 0.005);
        c.beginPath();
        c.moveTo(x0, 6);
        c.bezierCurveTo(x0 + 10, len * 0.4, x0 - 10, len * 0.7, x0 + 4, len);
        c.stroke();
        if (green) {
          for (let j = 1; j <= 3; j++) {
            paint(c, (p) => p.ellipse(x0 + (j % 2 ? 5 : -5), (len * j) / 3.2, w * 0.011 + 2, w * 0.007 + 1.4, j, 0, PI2), '#78bd5e', { lw: Math.max(1, lw * 0.5) });
          }
        }
      }
    }
    // 頂面：草皮與垂下來的邊
    const top = o.top || '#98cf6c';
    paint(c, (p) => {
      p.ellipse(0, 0, w / 2 + 4, Math.max(6, w * 0.045), 0, 0, PI2);
      const n = Math.max(5, Math.round(w / 34));
      for (let i = 0; i <= n; i++) {
        const x = -w / 2 + (i / n) * w;
        const yy = Math.sqrt(Math.max(0, 1 - Math.pow(x / (w / 2 + 4), 2))) * Math.max(6, w * 0.045);
        p.moveTo(x + w / n / 2, yy);
        p.arc(x, yy, w / n / 2, 0, Math.PI);
      }
    }, top, { shade: o.topS || '#6aa850', cel: [0, -Math.max(3, w * 0.012)], lw });
  }

  // 主浮島（原點＝頂面中心）
  function drawIsle(c) {
    // 下方跟著漂的小碎岩另外畫（會動）
    isleRock(c, 640, 330, 5, { lw: 3 });
    // 大理石廣場
    paint(c, (p) => p.ellipse(0, -2, 236, 17, 0, 0, PI2), '#f6efe2', { shade: '#e2d6c2', shadeY: 6, lw: 2.2 });
    c.strokeStyle = A.c(GOLD);
    c.lineWidth = 1.6;
    c.beginPath();
    c.ellipse(0, -2, 150, 10, 0, 0, PI2);
    c.stroke();
    // 左邊：斷掉的柱廊
    column(c, -292, 4, 18, 64, { broken: true, seed: 3, lw: 2 });
    column(c, -254, -2, 20, 118, { lw: 2, ivy: 0.5, seed: 4 });
    column(c, -214, -6, 20, 86, { broken: true, seed: 9, lw: 2 });
    paint(c, (p) => A.roundRect(p, -190, -18, 44, 13, 6), MARBLE, { shade: MARBLE_S, cel: [0, -3], lw: 2 });
    // 右邊：半毀的小神殿
    [[164, 150], [158, 158], [152, 166]].forEach(([y0, ww], i) => paint(c, (p) => p.rect(212 - ww / 2, -6 - i * 6, ww, 6), MARBLE, { shade: MARBLE_S, cel: [0, -2], lw: 1.8 }));
    column(c, 158, -24, 18, 104, { lw: 2 });
    column(c, 212, -24, 18, 104, { lw: 2, crack: true });
    column(c, 266, -24, 18, 70, { broken: true, seed: 12, lw: 2, ivy: 0.6 });
    paint(c, (p) => {
      p.moveTo(140, -128);
      p.lineTo(232, -128);
      p.lineTo(240, -140);
      p.lineTo(218, -148);
      p.lineTo(196, -168);
      p.lineTo(140, -142);
      p.closePath();
    }, MARBLE, { shade: MARBLE_S, cel: [0, -4], lw: 2 });
    c.fillStyle = A.c(GOLD);
    c.fillRect(142, -134, 90, 2.5);
    paint(c, (p) => A.roundRect(p, 282, -14, 30, 11, 5), MARBLE, { shade: MARBLE_S, cel: [0, -3], lw: 1.8 });
    // 石獅像（歷代守葉獸）
    statue(c, -118, -2, 0.3, 1);
    statue(c, -78, -8, 0.26, 1);
    statue(c, 78, -8, 0.26, -1);
    statue(c, 118, -2, 0.3, -1);
    // 星楓樹
    c.save();
    c.translate(0, -8);
    starTree(c, 0.42);
    c.restore();
    for (let i = 0; i < 8; i++) grassTuft(c, -300 + i * 86 + (i % 3) * 9, 10 + (i % 2) * 3, 0.55, '#8cc85e', '#62a04a');
  }
  const ISLE_TREE_S = 0.42;
  const ISLE_TREE_Y = -8;

  function farIsle(c, x, y, w, seed, kind) {
    c.save();
    c.translate(x, y);
    isleRock(c, w, w * 0.62, seed, { lw: 2, roots: w > 90, rock: '#d2bcae', rockS: '#ab9284' });
    if (kind === 'cols') {
      column(c, -w * 0.2, 0, w * 0.07, w * 0.42, { lw: 1.6 });
      column(c, w * 0.12, 0, w * 0.07, w * 0.3, { lw: 1.6, broken: true, seed: seed + 1 });
    } else if (kind === 'tree') {
      paint(c, (p) => p.rect(-3, -w * 0.28, 6, w * 0.28), '#8a6a50', { lw: 1.5 });
      lit(c, blobs([[0, -w * 0.36, w * 0.16], [-w * 0.13, -w * 0.28, w * 0.12], [w * 0.13, -w * 0.28, w * 0.12]]), '#8fcf7a', { hi: '#b8e6a0', shade: '#6aa860', rim: 3, sh: 8, lw: 1.6 });
    } else if (kind === 'arch') {
      const aw = w * 0.34;
      const ah = w * 0.4;
      paint(c, (p) => {
        p.moveTo(-aw - 5, 0);
        p.lineTo(-aw - 5, -ah);
        p.arc(0, -ah, aw + 5, Math.PI, 0);
        p.lineTo(aw + 5, 0);
        p.lineTo(aw - 4, 0);
        p.lineTo(aw - 4, -ah);
        p.arc(0, -ah, aw - 4, 0, Math.PI, true);
        p.lineTo(-aw + 4, 0);
        p.closePath();
      }, MARBLE, { shade: MARBLE_S, cel: [4, 0], lw: 1.6 });
    }
    c.restore();
  }

  function puff(c, w, h, seed, pal) {
    const r = U.seeded(seed);
    const n = Math.max(4, Math.round(w / (h * 0.7)));
    const list = [];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const rr = h * (0.3 + 0.32 * Math.sin(u * Math.PI)) * (0.8 + r() * 0.4);
      list.push([-w / 2 + u * w, -rr * 0.2 + (r() - 0.5) * h * 0.12, rr]);
    }
    list.push([0, h * 0.05, h * 0.45]);
    lit(c, (p) => {
      blobs(list)(p);
      p.ellipse(0, h * 0.12, w * 0.5, h * 0.2, 0, 0, PI2);
    }, pal[0], { hi: pal[1], shade: pal[2], rim: h * 0.05, sh: h * 0.16, lw: 0 });
  }

  // 從高空往下看的大地：森林、峽谷、海、雪峰
  const LAND = { forest: [300, 420], canyon: [700, 236], sea: [1270, 330], snow: [1210, 70] };
  function drawLands(c) {
    const w = 1600;
    const h = 620;
    const ground = (p) => {
      p.moveTo(-10, 70);
      p.quadraticCurveTo(w / 2, 20, w + 10, 70);
      p.lineTo(w + 10, h);
      p.lineTo(-10, h);
      p.closePath();
    };
    const g = c.createLinearGradient(0, 30, 0, h);
    g.addColorStop(0, '#c8e0b8');
    g.addColorStop(0.35, '#a6d27e');
    g.addColorStop(1, '#8cc468');
    c.fillStyle = g;
    c.beginPath();
    ground(c);
    c.fill();
    c.save();
    c.beginPath();
    ground(c);
    c.clip();
    // 海（右側）
    const coast = (p, off) => {
      p.moveTo(w + 20, 118);
      p.lineTo(1070 + off, 118);
      p.bezierCurveTo(1010 + off, 190, 1110 + off, 230, 1060 + off, 320);
      p.bezierCurveTo(1010 + off, 420, 1130 + off, 520, 1080 + off, h + 20);
      p.lineTo(w + 20, h + 20);
      p.closePath();
    };
    paint(c, (p) => coast(p, -14), '#f4e6b8', { lw: 0 });
    paint(c, (p) => coast(p, 0), '#8fd0f0', { lw: 0 });
    paint(c, (p) => coast(p, 30), '#5aa8e2', { shade: '#4a90d0', shadeY: 400, lw: 0 });
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 2.5;
    c.beginPath();
    coast(c, 4);
    c.stroke();
    const r = U.seeded(77);
    c.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 40; i++) {
      const x = 1120 + r() * 480;
      const y = 80 + r() * 520;
      const s = 0.4 + (y / h) * 1.2;
      c.fillRect(x, y, 10 * s, 2 * s);
    }
    // 小島
    paint(c, (p) => p.ellipse(1400, 250, 40, 14, 0, 0, PI2), '#a6d27e', { shade: '#86b862', shadeY: 254, lw: 2 });
    // 燈塔
    paint(c, (p) => p.rect(1180, 150, 10, 28), '#fff6ea', { lw: 1.6 });
    paint(c, (p) => p.rect(1178, 146, 14, 6), '#e8584a', { lw: 1.6 });
    // 雪峰（遠方右側）
    const peaks = [[900, 120, 110, 70], [990, 122, 130, 96], [1100, 124, 160, 126], [1230, 120, 140, 104], [1350, 124, 170, 134], [1480, 120, 130, 92], [1580, 124, 110, 70]];
    peaks.forEach(([x, base, pw, ph], i) => {
      const tri = (p) => {
        p.moveTo(x - pw / 2, base);
        p.lineTo(x - pw * 0.05, base - ph);
        p.lineTo(x + pw * 0.05, base - ph + 2);
        p.lineTo(x + pw / 2, base);
        p.closePath();
      };
      paint(c, tri, '#9fb4d8', { shade: '#7c90b8', cel: [-pw * 0.2, 0], lw: 0 });
      const cap = (p) => {
        p.moveTo(x - pw * 0.05, base - ph);
        p.lineTo(x + pw * 0.05, base - ph + 2);
        p.lineTo(x + pw * 0.26, base - ph * 0.5);
        p.lineTo(x + pw * 0.12, base - ph * 0.56);
        p.lineTo(x + pw * 0.02, base - ph * 0.44);
        p.lineTo(x - pw * 0.1, base - ph * 0.55);
        p.lineTo(x - pw * 0.25, base - ph * 0.48);
        p.closePath();
      };
      paint(c, cap, '#f6faff', { shade: '#cfdcf0', cel: [-pw * 0.08, 0], lw: 0 });
      c.beginPath();
      tri(c);
      c.lineWidth = 2;
      c.strokeStyle = A.outline();
      c.lineJoin = 'round';
      c.stroke();
    });
    // 峽谷（中間）
    const mesa = (x, y, mw, mh) => {
      paint(c, (p) => {
        p.moveTo(x - mw / 2, y);
        p.lineTo(x - mw * 0.4, y - mh);
        p.lineTo(x + mw * 0.42, y - mh);
        p.lineTo(x + mw / 2, y);
        p.closePath();
      }, '#df8558', { shade: '#b65c3a', cel: [mw * 0.2, 0], lw: 2 });
      paint(c, (p) => p.ellipse(x, y - mh, mw * 0.41, mh * 0.12 + 2, 0, 0, PI2), '#f2a878', { lw: 1.6 });
      c.strokeStyle = 'rgba(130,50,30,0.35)';
      c.lineWidth = 1.5;
      for (let k = 1; k < 3; k++) {
        c.beginPath();
        c.moveTo(x - mw * 0.44, y - (mh * k) / 3);
        c.lineTo(x + mw * 0.46, y - (mh * k) / 3);
        c.stroke();
      }
    };
    paint(c, (p) => p.ellipse(700, 250, 230, 90, 0, 0, PI2), '#e8b27a', { lw: 0 });
    [[600, 210, 70, 34], [700, 190, 90, 44], [800, 222, 76, 36], [650, 280, 100, 46], [770, 300, 86, 40], [560, 290, 60, 28], [870, 280, 60, 30]].forEach((m) => mesa(...m));
    // 河
    c.strokeStyle = A.c('#7cc4ee');
    c.lineCap = 'round';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(760, 320);
    c.bezierCurveTo(800, 400, 900, 380, 950, 450);
    c.bezierCurveTo(990, 510, 1040, 520, 1090, 560);
    c.stroke();
    // 森林（左側）：一排一排的樹，越近越大
    paint(c, (p) => {
      p.ellipse(240, 300, 330, 150, 0, 0, PI2);
      p.ellipse(220, 500, 420, 200, 0, 0, PI2);
    }, '#6fae5c', { lw: 0 });
    for (let row = 0; row < 8; row++) {
      const y = 140 + row * 58;
      const s = 0.5 + row * 0.2;
      const n = 17 - row;
      for (let i = 0; i < n; i++) {
        const x = -30 + (i / n) * (560 + row * 20) + (r() - 0.5) * 24 + (row % 2) * 16;
        if (x > 500 + row * 25) continue;
        const col = ['#5da65a', '#4f9652', '#6cb462'][(i + row) % 3];
        lit(c, blobs([[x, y - 14 * s, 18 * s], [x - 13 * s, y - 4 * s, 14 * s], [x + 13 * s, y - 4 * s, 14 * s]]), col, { hi: '#96d27e', shade: '#3e7a48', rim: 2 * s, sh: 7 * s, lw: 1.8 });
      }
    }
    // 大霧（遠處淡掉）
    const hz = c.createLinearGradient(0, 20, 0, h * 0.55);
    hz.addColorStop(0, 'rgba(235,245,255,0.85)');
    hz.addColorStop(1, 'rgba(235,245,255,0)');
    c.fillStyle = hz;
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  // ── 各鏡頭的圖層定義 ──
  const DEFS = {
    ringA: { ox: -316, oy: -316, w: 632, h: 632, kmax: 1.2, draw: (c) => ringSprite(c, 300, '#fff0c0') },
    ringB: { ox: -206, oy: -206, w: 412, h: 412, kmax: 1.2, draw: (c) => ringSprite(c, 190, '#fff0c0') },
    ringC: { ox: -116, oy: -116, w: 232, h: 232, kmax: 1.2, draw: (c) => ringSprite(c, 100, '#fff0c0') },
    bandFar: {
      ox: 0, oy: -170, w: 1600, h: 470, kmax: 1.1,
      draw: (c) => cloudBand(c, 1600, 3, [
        { y: 20, jit: 40, n: 8, r: [50, 110], col: '#f4dcd8', hi: '#fcece6', shade: '#e4c6c6' },
        { y: 70, jit: 40, n: 11, r: [40, 90], col: '#fbe9dc', hi: '#fff8f0', shade: '#eed2c4' },
      ]),
    },
    bandMid: {
      ox: 0, oy: -170, w: 1600, h: 470, kmax: 1.1,
      draw: (c) => cloudBand(c, 1600, 8, [
        { y: 20, jit: 50, n: 7, r: [70, 130], col: '#fbe8dc', hi: '#fff6ee', shade: '#ecd0c4', rim: 8, sh: 26 },
        { y: 80, jit: 40, n: 9, r: [50, 100], col: '#fff3e6', hi: '#ffffff', shade: '#f0d6c6', rim: 8, sh: 24 },
      ]),
    },
    bandNear: {
      ox: 0, oy: -170, w: 1600, h: 470, kmax: 1.1,
      draw: (c) => cloudBand(c, 1600, 21, [
        { y: 30, jit: 50, n: 6, r: [90, 150], col: '#fff5ec', hi: '#ffffff', shade: '#f0d8cc', rim: 10, sh: 30 },
        { y: 100, jit: 40, n: 8, r: [60, 110], col: '#fffaf4', hi: '#ffffff', shade: '#f4e0d4', rim: 10, sh: 28 },
      ]),
    },
    isle: { ox: -380, oy: -290, w: 760, h: 670, kmax: 2, draw: drawIsle },
    farIsles: {
      ox: 0, oy: 0, w: 1440, h: 560, kmax: 1.2,
      draw: (c) => {
        farIsle(c, 150, 250, 120, 31, 'arch');
        farIsle(c, 1250, 200, 90, 32, 'tree');
        farIsle(c, 1060, 330, 56, 33, 'cols');
        farIsle(c, 330, 150, 50, 34, 'tree');
      },
    },
    chunk: { ox: -40, oy: -30, w: 80, h: 90, kmax: 2, draw: (c) => isleRock(c, 56, 60, 91, { lw: 2, roots: false, gold: false }) },
    // 樹的鏡頭（中景）
    cyBack: {
      ...FULL, kmax: 1.4,
      draw: (c) => {
        // 遠方霧中的廢墟剪影
        c.fillStyle = 'rgba(236,226,240,0.9)';
        [[-20, 330, 26, 120], [60, 300, 24, 150], [1190, 310, 26, 140], [1270, 340, 22, 110]].forEach(([x, y, w, h]) => c.fillRect(x - w / 2, y, w, h));
        // 欄杆
        const railY = 440;
        paint(c, (p) => p.rect(-100, railY + 50, 1480, 60), '#efe6d6', { shade: '#dccfbc', shadeY: railY + 90, lw: 2.5 });
        for (let x = -90; x < 1380; x += 24) {
          if (x > 990 && x < 1080) continue;
          paint(c, (p) => {
            p.moveTo(x - 5, railY + 50);
            p.quadraticCurveTo(x - 10, railY + 34, x - 4, railY + 22);
            p.lineTo(x + 4, railY + 22);
            p.quadraticCurveTo(x + 10, railY + 34, x + 5, railY + 50);
            p.closePath();
          }, MARBLE, { shade: MARBLE_S, cel: [3, 0], lw: 1.8 });
        }
        paint(c, (p) => {
          p.moveTo(-100, railY + 10);
          p.lineTo(994, railY + 10);
          p.lineTo(1004, railY + 16);
          p.lineTo(990, railY + 24);
          p.lineTo(-100, railY + 24);
          p.closePath();
          p.moveTo(1380, railY + 10);
          p.lineTo(1082, railY + 10);
          p.lineTo(1074, railY + 18);
          p.lineTo(1086, railY + 24);
          p.lineTo(1380, railY + 24);
          p.closePath();
        }, MARBLE, { shade: MARBLE_S, shadeY: railY + 19, lw: 2 });
        paint(c, (p) => A.roundRect(p, 1010, railY + 40, 40, 12, 5), MARBLE, { shade: MARBLE_S, cel: [0, -3], lw: 2 });
        for (const x of [-60, 220, 500, 780, 1340]) {
          paint(c, (p) => p.rect(x - 11, railY - 4, 22, 56), MARBLE, { shade: MARBLE_S, cel: [6, 0], lw: 2 });
          paint(c, (p) => p.arc(x, railY - 10, 8, 0, PI2), GOLD, { shade: '#c08a2a', cel: [2, 2], lw: 1.8, hl: [x - 3, railY - 13, 2.5, 1.5] });
        }
        // 高大的柱子
        column(c, 60, 520, 48, 460, { ivy: 0.55, seed: 2 });
        column(c, 250, 520, 44, 240, { broken: true, seed: 5, crack: true });
        column(c, 1040, 520, 44, 290, { broken: true, seed: 6, ivy: 0.5 });
        column(c, 1220, 520, 48, 470, { seed: 8, crack: true });
        // 柱頂上斷掉的橫樑
        paint(c, (p) => {
          p.moveTo(1150, 34);
          p.lineTo(1400, 34);
          p.lineTo(1400, 62);
          p.lineTo(1170, 62);
          p.lineTo(1158, 54);
          p.lineTo(1164, 46);
          p.closePath();
        }, MARBLE, { shade: MARBLE_S, shadeY: 52, lw: 2.5 });
        c.fillStyle = A.c(GOLD);
        c.fillRect(1164, 40, 236, 3);
        paint(c, (p) => {
          p.moveTo(-100, 26);
          p.lineTo(140, 26);
          p.lineTo(126, 40);
          p.lineTo(138, 54);
          p.lineTo(-100, 54);
          p.closePath();
        }, MARBLE, { shade: MARBLE_S, shadeY: 44, lw: 2.5 });
        c.fillStyle = A.c(GOLD);
        c.fillRect(-100, 32, 230, 3);
        // 後方地坪
        paint(c, (p) => p.rect(-100, 548, 1480, 40), '#ece2d2', { lw: 0 });
      },
    },
    cyFloor: {
      ...FULL, oy: 548, h: 232, kmax: 1.4,
      draw: (c) => {
        const top = 560;
        const floor = (p) => p.rect(-100, top, 1480, 300);
        const g = c.createLinearGradient(0, top, 0, 780);
        g.addColorStop(0, '#efe5d4');
        g.addColorStop(1, '#f8f1e4');
        c.fillStyle = g;
        c.beginPath();
        floor(c);
        c.fill();
        c.save();
        c.beginPath();
        floor(c);
        c.clip();
        c.strokeStyle = 'rgba(150,118,86,0.3)';
        c.lineWidth = 2;
        for (const y of [574, 596, 626, 668, 726]) {
          c.beginPath();
          c.moveTo(-100, y);
          c.lineTo(1380, y);
          c.stroke();
        }
        for (let i = -6; i <= 6; i++) {
          c.beginPath();
          c.moveTo(640 + i * 110, top);
          c.lineTo(640 + i * 330, 790);
          c.stroke();
        }
        // 地上的時鐘紋（金色）
        c.strokeStyle = A.c(GOLD);
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(640, 640, 330, 52, 0, 0, PI2);
        c.stroke();
        c.lineWidth = 1.6;
        c.beginPath();
        c.ellipse(640, 640, 290, 44, 0, 0, PI2);
        c.stroke();
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * PI2;
          c.lineWidth = k % 2 ? 1.4 : 2.6;
          c.beginPath();
          c.moveTo(640 + Math.cos(a) * 292, 640 + Math.sin(a) * 45);
          c.lineTo(640 + Math.cos(a) * 326, 640 + Math.sin(a) * 51);
          c.stroke();
        }
        // 裂縫與苔
        c.strokeStyle = 'rgba(100,70,50,0.35)';
        c.lineWidth = 1.6;
        [[380, 600, 420, 612, 410, 640], [900, 590, 870, 610, 890, 630], [520, 700, 560, 690, 570, 720]].forEach(([a, b, d, e, f, g2]) => {
          c.beginPath();
          c.moveTo(a, b);
          c.lineTo(d, e);
          c.lineTo(f, g2);
          c.stroke();
        });
        [[260, 590, 60], [1010, 596, 70], [470, 740, 90], [860, 730, 80]].forEach(([x, y, w]) => {
          paint(c, (p) => p.ellipse(x, y, w, w * 0.16, 0, 0, PI2), '#a3cf7a', { shade: '#7fb05e', shadeY: y + w * 0.05, lw: 0 });
        });
        c.restore();
        c.strokeStyle = A.outline();
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(-100, top);
        c.lineTo(1380, top);
        c.stroke();
      },
    },
    treeTrunk: { ox: -300, oy: -330, w: 600, h: 360, kmax: 1.6, draw: (c) => starTree(c, 0.95, 'trunk') },
    treeCanopy: { ox: -320, oy: -620, w: 640, h: 380, kmax: 1.6, draw: (c) => starTree(c, 0.95, 'canopy') },
    cyFore: {
      ...FULL, oy: 360, h: 420, kmax: 1.4,
      draw: (c) => {
        statue(c, 330, 606, 1.05, 1);
        statue(c, 950, 606, 1.05, -1);
        statue(c, 116, 690, 1.45, 1);
        statue(c, 1164, 690, 1.45, -1);
        [[40, 760], [220, 752], [420, 770], [700, 776], [880, 758], [1060, 768], [1250, 760]].forEach(([x, y], i) => grassTuft(c, x, y, 1.5 + (i % 2) * 0.3));
        [[250, 740, '#ffffff'], [300, 752, '#ffc2d8'], [990, 742, '#fff4a0'], [1030, 756, '#ffffff'], [560, 764, '#ffc2d8']].forEach(([x, y, col]) => flower(c, x, y, 1.4, col));
      },
    },
    // 午睡的特寫
    napBack: {
      ...FULL, kmax: 1.3,
      draw: (c) => {
        const railY = 360;
        paint(c, (p) => p.rect(-100, railY + 70, 1480, 90), '#f2e9da', { shade: '#e2d6c4', shadeY: railY + 130, lw: 0 });
        c.globalAlpha = 0.9;
        for (let x = -90; x < 1400; x += 40) {
          paint(c, (p) => {
            p.moveTo(x - 8, railY + 70);
            p.quadraticCurveTo(x - 16, railY + 46, x - 6, railY + 30);
            p.lineTo(x + 6, railY + 30);
            p.quadraticCurveTo(x + 16, railY + 46, x + 8, railY + 70);
            p.closePath();
          }, '#f7f0e4', { shade: '#e4d8c6', cel: [5, 0], lw: 0 });
        }
        paint(c, (p) => p.rect(-100, railY + 10, 1480, 22), '#f7f0e4', { shade: '#e4d8c6', shadeY: railY + 24, lw: 0 });
        c.globalAlpha = 1;
        column(c, 1180, 460, 70, 560, { m: '#f5eee2', s: '#e0d4c2', lw: 2.5, ivy: 0.4, seed: 21 });
      },
    },
    napTree: {
      ...FULL, kmax: 1.4,
      draw: (c) => {
        const top = 540;
        const g = c.createLinearGradient(0, top, 0, 780);
        g.addColorStop(0, '#ede2d0');
        g.addColorStop(1, '#faf3e6');
        c.fillStyle = g;
        c.fillRect(-100, top, 1480, 300);
        c.strokeStyle = 'rgba(150,118,86,0.28)';
        c.lineWidth = 2.5;
        for (const y of [566, 606, 668, 760]) {
          c.beginPath();
          c.moveTo(-100, y);
          c.lineTo(1380, y);
          c.stroke();
        }
        for (let i = -5; i <= 5; i++) {
          c.beginPath();
          c.moveTo(640 + i * 170, top);
          c.lineTo(640 + i * 520, 790);
          c.stroke();
        }
        c.strokeStyle = A.c(GOLD);
        c.lineWidth = 4;
        c.beginPath();
        c.ellipse(560, 700, 620, 90, 0, Math.PI * 1.05, Math.PI * 1.95);
        c.stroke();
        c.strokeStyle = A.outline();
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(-100, top);
        c.lineTo(1380, top);
        c.stroke();
        statue(c, 1090, 606, 1.45, -1);
        c.save();
        c.translate(470, 700);
        starTree(c, 2.25, 'trunk');
        c.restore();
        // 上方的樹冠底部（畫面上緣）
        lit(c, blobs([[-60, -30, 150], [180, -70, 170], [420, -40, 150], [640, -90, 140], [840, -80, 110], [300, 60, 70], [560, 40, 60]]), '#4f9a58', { hi: '#6fb86a', shade: '#3a7548', rim: 0, sh: 26, lw: 3.4 });
        const r = U.seeded(12);
        for (let i = 0; i < 12; i++) sparkle(c, 60 + r() * 700, 10 + r() * 70, 4 + r() * 4, 0.7, '#fff6c8');
      },
    },
    napFront: {
      ...FULL, oy: 560, h: 270, kmax: 1.4,
      draw: (c) => {
        [[700, 668, 1.5], [760, 674, 1.9], [860, 676, 1.8], [930, 666, 1.4], [640, 690, 1.3]].forEach(([x, y, s]) => grassTuft(c, x, y, s));
        [[690, 676, '#ffffff'], [900, 680, '#ffc2d8'], [950, 690, '#fff4a0']].forEach(([x, y, col]) => flower(c, x, y, 1.8, col));
        // 落在地上的普通楓葉
        [[1040, 700, '#f0a04a', 0.4], [360, 736, '#e8864a', -0.6], [1150, 742, '#f2b85a', 1.1]].forEach(([x, y, col, rot]) => {
          c.save();
          c.translate(x, y);
          c.rotate(rot);
          c.scale(1, 0.55);
          paint(c, (p) => A.mapleLeafPath(p, 0, 0, 18), col, { shade: U.mix(col, '#6a3020', 0.25), cel: [4, 4], lw: 2.4 });
          c.restore();
        });
        grassTuft(c, 60, 790, 3.2, '#7cbc56', '#5a9a44');
        grassTuft(c, 1240, 800, 3.4, '#7cbc56', '#5a9a44');
      },
    },
    // 墜落
    lands: { ox: 0, oy: 0, w: 1600, h: 620, kmax: 1.2, draw: drawLands },
    puffA: { ox: -270, oy: -120, w: 540, h: 230, kmax: 1.1, draw: (c) => puff(c, 480, 190, 1, ['#ffffff', '#ffffff', '#d8e8f8']) },
    puffB: { ox: -180, oy: -80, w: 360, h: 160, kmax: 1.1, draw: (c) => puff(c, 320, 130, 2, ['#f6fbff', '#ffffff', '#cfe0f4']) },
    puffC: { ox: -120, oy: -56, w: 240, h: 110, kmax: 1.1, draw: (c) => puff(c, 210, 90, 3, ['#eef6fe', '#ffffff', '#c6d8f0']) },
    // 醒來的森林
    fwFar: {
      ...FULL, kmax: 1.1,
      draw: (c) => {
        const r = U.seeded(5);
        [[340, '#cfe8cf', '#e2f2de', '#bddcc0', 60, 90], [420, '#b8dcbc', '#d2ecd0', '#a4ceaa', 70, 100]].forEach(([y, col, hi, shade, r0, r1]) => {
          const list = [];
          for (let x = -120; x < 1420; x += 70 + r() * 40) list.push([x, y + r() * 50, r0 + r() * (r1 - r0)]);
          lit(c, (p) => {
            blobs(list)(p);
            p.rect(-120, y + 30, 1560, 500);
          }, col, { hi, shade, rim: 6, sh: 20, lw: 0 });
          c.fillStyle = shade;
          for (let i = 0; i < 9; i++) c.fillRect(-60 + i * 170 + r() * 60, y + 40, 8, 300);
        });
      },
    },
    fwMid: {
      ...FULL, kmax: 1.3,
      draw: (c) => {
        // 樹幹
        [[170, 44, -0.04], [400, 34, 0.03], [1010, 38, -0.02], [1230, 52, 0.04]].forEach(([x, w, lean]) => {
          paint(c, (p) => {
            p.moveTo(x - w / 2 - 10, 640);
            p.quadraticCurveTo(x - w / 2, 600, x - w / 2 + lean * 400, 300);
            p.lineTo(x - w / 2 + lean * 800, -60);
            p.lineTo(x + w / 2 + lean * 800, -60);
            p.lineTo(x + w / 2 + lean * 400, 300);
            p.quadraticCurveTo(x + w / 2, 600, x + w / 2 + 10, 640);
            p.closePath();
          }, '#8f6c50', { shade: '#6c4f3a', cel: [w * 0.3, 0], lw: 3 });
        });
        // 樹叢
        lit(c, blobs([[40, 620, 70], [150, 600, 60], [270, 630, 70], [920, 616, 66], [1060, 600, 70], [1190, 626, 80], [1330, 610, 70]]), '#74b462', { hi: '#a4da8a', shade: '#558f4c', rim: 8, sh: 24, lw: 3 });
        // 上方的樹冠（留出中間偏右的天空）
        lit(c, blobs([[-60, 30, 170], [150, -20, 150], [330, 20, 120], [480, -30, 110], [60, 170, 100], [250, 140, 86], [560, 30, 70], [400, 110, 70]]), '#5ea85a', { hi: '#90d27a', shade: '#3e7e48', rim: 10, sh: 30, lw: 3.4 });
        lit(c, blobs([[1360, 50, 170], [1190, 0, 130], [1060, -30, 100], [1260, 200, 96], [1120, 120, 72], [1010, 40, 60]]), '#5ea85a', { hi: '#90d27a', shade: '#3e7e48', rim: 10, sh: 30, lw: 3.4 });
        // 垂下來的藤
        [[520, 60, 260, 3], [590, 40, 180, 4], [1040, 70, 230, 5]].forEach(([x, y, len, seed]) => ivy(c, x, y, len, seed, 26));
      },
    },
    fwFront: {
      ...FULL, kmax: 1.4,
      draw: (c) => {
        c.translate(0, -30);
        // 長滿苔的地面
        lit(c, (p) => {
          p.moveTo(-100, 660);
          p.bezierCurveTo(200, 610, 420, 612, 640, 626);
          p.bezierCurveTo(880, 640, 1100, 620, 1380, 656);
          p.lineTo(1380, 800);
          p.lineTo(-100, 800);
          p.closePath();
        }, '#7cc056', { hi: '#b2e27c', shade: '#5a9a44', rim: 7, sh: 30, lw: 3.4 });
        const r = U.seeded(9);
        c.fillStyle = 'rgba(70,120,50,0.35)';
        for (let i = 0; i < 60; i++) {
          c.beginPath();
          c.ellipse(-80 + r() * 1440, 660 + r() * 110, 6 + r() * 8, 2 + r() * 2, 0, 0, PI2);
          c.fill();
        }
        // 左邊的大樹
        paint(c, (p) => {
          p.moveTo(-120, 700);
          p.lineTo(-120, -60);
          p.lineTo(90, -60);
          p.bezierCurveTo(80, 200, 70, 420, 100, 560);
          p.quadraticCurveTo(120, 640, 220, 668);
          p.quadraticCurveTo(140, 676, 100, 668);
          p.quadraticCurveTo(80, 690, 40, 700);
          p.closePath();
        }, '#7f593e', { shade: '#5b3e2b', cel: [30, 0], lw: 3.6 });
        c.strokeStyle = 'rgba(60,36,22,0.4)';
        c.lineWidth = 3;
        [[10, 0], [48, 1]].forEach(([x]) => {
          c.beginPath();
          c.moveTo(x, -40);
          c.bezierCurveTo(x + 14, 200, x - 10, 420, x + 20, 640);
          c.stroke();
        });
        [[64, 566, 34, 12], [36, 514, 20, 8], [78, 420, 16, 6], [52, 250, 18, 7]].forEach(([x, y, rx, ry]) => {
          paint(c, (p) => p.ellipse(x, y, rx, ry, -0.2, 0, PI2), '#86c860', { shade: '#5f9a46', cel: [0, -3], lw: 2.2 });
        });
        // 右邊的長苔石頭
        paint(c, (p) => p.ellipse(1150, 660, 130, 76, 0, Math.PI, 0), '#aeb0bf', { shade: '#86889c', cel: [30, 0], lw: 3.4 });
        lit(c, blobs([[1110, 600, 50], [1180, 594, 44], [1230, 620, 30], [1060, 626, 30]]), '#86c860', { hi: '#b8e684', shade: '#62a046', rim: 4, sh: 12, lw: 2.6 });
        // 香菇、花、蕨
        mushroom(c, 1010, 664, 1.4);
        mushroom(c, 1044, 670, 1.0);
        mushroom(c, 176, 668, 1.1);
        [[300, 690, '#ffffff'], [340, 702, '#fff4a0'], [780, 680, '#ffc2d8'], [820, 700, '#ffffff'], [930, 694, '#fff4a0'], [460, 720, '#ffc2d8']].forEach(([x, y, col]) => flower(c, x, y, 1.5, col));
        [[250, 668, -1], [880, 664, 1]].forEach(([x, y, d]) => {
          for (let f = 0; f < 3; f++) {
            const a = -Math.PI / 2 + d * (f - 1) * 0.5;
            const len = 70 - Math.abs(f - 1) * 14;
            const ex = x + Math.cos(a) * len;
            const ey = y + Math.sin(a) * len;
            c.strokeStyle = A.c('#4f8e44');
            c.lineWidth = 2.4;
            c.beginPath();
            c.moveTo(x, y);
            c.quadraticCurveTo(x + Math.cos(a) * len * 0.6 + d * 14, y + Math.sin(a) * len * 0.6, ex, ey);
            c.stroke();
            for (let j = 1; j < 7; j++) {
              const u = j / 7;
              const px = lerp(x, ex, u);
              const py = lerp(y, ey, u);
              paint(c, (p) => p.ellipse(px, py, 8 * (1 - u * 0.6), 3.4 * (1 - u * 0.5), a + 1.2, 0, PI2), '#72b45c', { lw: 1.5 });
              paint(c, (p) => p.ellipse(px, py, 8 * (1 - u * 0.6), 3.4 * (1 - u * 0.5), a - 1.2, 0, PI2), '#62a450', { lw: 1.5 });
            }
          }
        });
        [[520, 790], [690, 800], [1300, 790], [380, 800]].forEach(([x, y], i) => grassTuft(c, x, y, 2 + (i % 2) * 0.4, '#86c45a', '#5f9a44'));
      },
    },
  };

  // ════════ 王座廳（一百年前） ════════
  // 一點透視：X 左右、Y 高度（鏡頭高 = 1）、d 深度。地面上的點 → 畫面座標
  const TH = { vx: 590, hz: 232, x: 790, y: 510, s: 2.3, d: 1.15 };
  TH.X0 = ((TH.x - TH.vx) * TH.d) / 400;
  const thP = (X, Y, d) => [TH.vx + (400 * X) / d, TH.hz + (400 * (1 - Y)) / d];
  const TH_HAZE = '#8391aa';
  const TH_LINE = '#1c2230';
  const STONE = '#8a91a1';
  const STONE_S = '#5f6676';
  function quad(c, pts) {
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
  }
  // 霧：顏色往霧色混
  const fogC = (col, a) => U.mix(col, TH_HAZE, a);

  function thPillar(c, x, base, w, h, a, seed) {
    const lw = Math.max(1, Math.min(3, w * 0.05));
    const line = fogC(TH_LINE, a * 0.8);
    const M = fogC('#6f7789', a);
    const S = fogC('#4a5162', a);
    const top = base - h;
    paint(c, (p) => p.rect(x - w * 0.7, base - w * 0.4, w * 1.4, w * 0.4), fogC('#7a8294', a), { shade: S, cel: [w * 0.3, 0], lw, line });
    paint(c, (p) => p.rect(x - w / 2, top, w, h - w * 0.4), M, { shade: S, cel: [w * 0.32, 0], lw, line });
    c.save();
    c.beginPath();
    c.rect(x - w / 2, top, w, h - w * 0.4);
    c.clip();
    c.strokeStyle = 'rgba(20,26,38,' + (0.3 * (1 - a)).toFixed(3) + ')';
    c.lineWidth = Math.max(1, w * 0.05);
    for (const k of [-0.25, 0, 0.25]) {
      c.beginPath();
      c.moveTo(x + k * w, top);
      c.lineTo(x + k * w, base);
      c.stroke();
    }
    // 裂縫
    const r = U.seeded(seed);
    c.strokeStyle = 'rgba(16,20,30,' + (0.5 * (1 - a)).toFixed(3) + ')';
    c.lineWidth = Math.max(1, w * 0.04);
    let cy = base - h * (0.2 + r() * 0.5);
    c.beginPath();
    c.moveTo(x - w / 2, cy);
    for (let i = 1; i <= 4; i++) c.lineTo(x - w / 2 + (w * i) / 4, (cy += (r() - 0.3) * w * 0.4));
    c.stroke();
    c.restore();
    paint(c, (p) => p.rect(x - w * 0.72, top - w * 0.3, w * 1.44, w * 0.3), fogC('#7d8597', a), { shade: S, cel: [w * 0.3, 0], lw, line });
  }

  // 一整列的石獅（過去的守葉獸）。臉跟小獅子一樣
  const TH_POSE = [
    { state: 'idle', t: 0.05, p: 0 },
    { state: 'roar', t: 0.05, p: 0.1 },
    { state: 'idle', t: 0.05, p: 0, rot: 0.07 },
    { state: 'idle', t: 0.05, p: 0, sq: 0.94 },
    { state: 'cast', t: 0.05, p: 0.05, rot: -0.04 },
  ];
  function thStatue(c, x, base, sc, dir, a, i) {
    const lw = Math.max(1, Math.min(2.6, sc * 0.013));
    const line = fogC(TH_LINE, a * 0.8);
    const pw = 0.72 * sc;
    const ph = 0.3 * sc;
    const S = fogC('#4d5465', a);
    paint(c, (p) => p.rect(x - pw / 2 - pw * 0.06, base - ph * 0.16, pw * 1.12, ph * 0.16), fogC('#737b8d', a), { shade: S, cel: [pw * 0.2, 0], lw, line });
    paint(c, (p) => p.rect(x - pw / 2, base - ph, pw, ph * 0.84), fogC('#6c7486', a), { shade: S, cel: [pw * 0.22, 0], lw, line });
    paint(c, (p) => p.rect(x - pw / 2 - pw * 0.08, base - ph - ph * 0.16, pw * 1.16, ph * 0.16), fogC('#838b9c', a), { shade: S, cel: [pw * 0.2, 0], lw, line });
    // 台座上的刻痕與苔
    c.strokeStyle = 'rgba(18,22,32,' + (0.45 * (1 - a)).toFixed(3) + ')';
    c.lineWidth = lw * 0.7;
    c.beginPath();
    c.moveTo(x + pw * 0.28 * dir, base - ph);
    c.lineTo(x + pw * 0.2 * dir, base - ph * 0.62);
    c.lineTo(x + pw * 0.32 * dir, base - ph * 0.35);
    c.stroke();
    c.save();
    c.globalAlpha = 1 - a * 0.7;
    c.beginPath();
    A.mapleLeafPath(c, x, base - ph * 0.55, ph * 0.22);
    c.strokeStyle = 'rgba(190,205,230,0.35)';
    c.lineWidth = lw * 0.6;
    c.stroke();
    c.restore();
    for (let j = 0; j < 3; j++) {
      const mx = x - dir * (pw * 0.46 - j * pw * 0.13);
      paint(c, (p) => p.ellipse(mx, base - ph - ph * 0.16, pw * 0.08, pw * (0.03 + (j % 2) * 0.02), 0, 0, Math.PI), fogC(j % 2 ? '#5f7a62' : '#546e58', a), { lw: lw * 0.6, line });
    }
    // 石頭獅子：先畫到小畫布，染成石色，再蓋一層霧
    const P = TH_POSE[i % TH_POSE.length];
    const k = IX.bk;
    const ls = sc * 0.0105;
    const tw = 140 * ls;
    const th = 120 * ls;
    const tc = newCv(tw * k, th * k);
    const x2 = tc.getContext('2d');
    x2.scale(k, k);
    const m0 = A.mode;
    const mc = A.modeColor;
    const ma = A.modeAmt;
    A.mode = 'tint';
    A.modeColor = '#9aa2b3';
    A.modeAmt = 0.95;
    try {
      x2.save();
      x2.translate(tw / 2, th - 3 * ls);
      if (P.rot) x2.rotate(P.rot * dir);
      x2.scale(ls, ls * (P.sq || 1));
      A.drawLion(x2, 0, 0, dir, P);
      x2.restore();
    } finally {
      A.mode = m0;
      A.modeColor = mc;
      A.modeAmt = ma;
    }
    x2.globalCompositeOperation = 'source-atop';
    x2.fillStyle = 'rgba(30,38,56,0.28)';
    x2.fillRect(0, 0, tw, th);
    x2.fillStyle = 'rgba(12,16,26,0.35)';
    x2.fillRect(0, th * 0.62, tw, th);
    x2.fillStyle = A.c('#62806a');
    [[-18, -54, 9, 4], [-24, -40, 6, 3], [8, -74, 7, 3], [20, -30, 7, 3]].forEach(([dx, dy, rx, ry], j) => {
      if ((i + j) % 3 === 2) return;
      x2.beginPath();
      x2.ellipse(tw / 2 + dx * dir * ls, th - 3 * ls + dy * ls, rx * ls, ry * ls, 0, 0, PI2);
      x2.fill();
    });
    x2.strokeStyle = 'rgba(20,24,34,0.55)';
    x2.lineWidth = Math.max(0.8, 1.2 * ls);
    x2.beginPath();
    x2.moveTo(tw / 2 - 6 * dir * ls, th - 70 * ls);
    x2.lineTo(tw / 2 - 2 * dir * ls, th - 56 * ls);
    x2.lineTo(tw / 2 - 9 * dir * ls, th - 44 * ls);
    x2.stroke();
    if (a > 0) {
      x2.fillStyle = 'rgba(131,145,170,' + a.toFixed(3) + ')';
      x2.fillRect(0, 0, tw, th);
    }
    c.drawImage(tc, x - tw / 2, base - ph - ph * 0.16 - th + 4 * ls, tw, th);
  }

  function thHall(c) {
    const D = 24;
    const WL = 2.7;
    const CE = 3.6;
    const P = thP;
    const g = c.createLinearGradient(0, -50, 0, 780);
    g.addColorStop(0, '#0b0e16');
    g.addColorStop(0.32, '#1a2130');
    g.addColorStop(0.5, '#2b3548');
    g.addColorStop(1, '#141820');
    c.fillStyle = g;
    c.fillRect(-80, -50, 1440, 830);
    // 天花板與兩側的牆
    const wallG = (side) => {
      const a = P(side * WL, 0, 0.6);
      const b = P(side * WL, 0, D);
      const gg = c.createLinearGradient(a[0], 0, b[0], 0);
      gg.addColorStop(0, '#0c1018');
      gg.addColorStop(0.7, '#27303f');
      gg.addColorStop(1, '#3d4860');
      return gg;
    };
    [-1, 1].forEach((sd) => {
      c.beginPath();
      quad(c, [P(sd * WL, 0, 0.6), P(sd * WL, 0, D), P(sd * WL, CE, D), P(sd * WL, CE, 0.6)]);
      c.fillStyle = wallG(sd);
      c.fill();
    });
    c.beginPath();
    quad(c, [P(-WL, CE, 0.6), P(WL, CE, 0.6), P(WL, CE, D), P(-WL, CE, D)]);
    const cg = c.createLinearGradient(0, -50, 0, P(0, CE, D)[1]);
    cg.addColorStop(0, '#07090f');
    cg.addColorStop(1, '#262e40');
    c.fillStyle = cg;
    c.fill();
    // 盡頭的牆與門（冷冷的天光）
    const e0 = P(-WL, CE, D);
    const e1 = P(WL, 0, D);
    c.fillStyle = '#434e66';
    c.fillRect(e0[0], e0[1], e1[0] - e0[0], e1[1] - e0[1]);
    const d0 = P(-0.95, 3.0, D);
    const d1 = P(0.95, 0, D);
    haze(c, (d0[0] + d1[0]) / 2, (d0[1] + d1[1]) / 2, 260, '150,172,210', 0.55);
    c.beginPath();
    c.moveTo(d0[0], d1[1]);
    c.lineTo(d0[0], d0[1] + (d1[0] - d0[0]) * 0.5);
    c.arc((d0[0] + d1[0]) / 2, d0[1] + (d1[0] - d0[0]) * 0.5, (d1[0] - d0[0]) / 2, Math.PI, 0);
    c.lineTo(d1[0], d1[1]);
    c.closePath();
    c.fillStyle = '#c3d2ea';
    c.fill();
    // 高處的窗（左邊亮、右邊暗）
    [[-1, 2.6], [-1, 4.4], [-1, 7], [-1, 11], [-1, 16], [1, 3.4], [1, 6], [1, 9.5], [1, 14]].forEach(([sd, d]) => {
      c.beginPath();
      quad(c, [P(sd * WL, 2.1, d), P(sd * WL, 3.15, d), P(sd * WL, 3.15, d + 0.5), P(sd * WL, 2.1, d + 0.5)]);
      c.fillStyle = sd < 0 ? '#8ea3c4' : '#4e5b74';
      c.fill();
      if (sd < 0) {
        const m = P(sd * WL, 2.6, d + 0.25);
        haze(c, m[0], m[1], 520 / d, '160,185,225', 0.4);
      }
    });
    // 地板
    const f0 = P(0, 0, D)[1];
    c.beginPath();
    quad(c, [P(-WL, 0, 0.55), P(-WL, 0, D), P(WL, 0, D), P(WL, 0, 0.55)]);
    const fg = c.createLinearGradient(0, f0, 0, 780);
    fg.addColorStop(0, '#7f8ba2');
    fg.addColorStop(0.15, '#8e98ab');
    fg.addColorStop(0.5, '#7b8495');
    fg.addColorStop(1, '#4f5665');
    c.fillStyle = fg;
    c.fill();
    c.save();
    c.clip();
    c.strokeStyle = 'rgba(28,34,48,0.32)';
    c.lineWidth = 1.5;
    for (const d of [0.9, 1.1, 1.35, 1.65, 2.05, 2.55, 3.2, 4.1, 5.3, 7, 9.5, 13, 18]) {
      const a = P(-WL, 0, d);
      const b = P(WL, 0, d);
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
    }
    for (let X = -2.5; X <= 2.51; X += 0.5) {
      const a = P(X, 0, 0.55);
      const b = P(X, 0, D);
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
    }
    // 走道：淡淡的長地毯痕跡
    c.beginPath();
    quad(c, [P(-0.6, 0, 0.55), P(-0.6, 0, D), P(0.6, 0, D), P(0.6, 0, 0.55)]);
    c.fillStyle = 'rgba(40,50,72,0.2)';
    c.fill();
    c.strokeStyle = 'rgba(190,205,230,0.18)';
    c.lineWidth = 2;
    [-0.6, 0.6].forEach((X) => {
      const a = P(X, 0, 0.55);
      const b = P(X, 0, D);
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
    });
    // 地上嵌著的星楓紋（淡淡的）：在地面位置用仿射近似透視
    const ic = P(0, 0, 2.7);
    const sc = 400 / 2.7;
    c.save();
    c.translate(ic[0], ic[1]);
    c.scale(sc, sc / 2.7);
    c.strokeStyle = 'rgba(200,215,240,0.32)';
    c.lineWidth = 2.2 / sc;
    c.beginPath();
    c.arc(0, 0, 1.05, 0, PI2);
    c.stroke();
    c.lineWidth = 1.2 / sc;
    c.beginPath();
    c.arc(0, 0, 0.92, 0, PI2);
    c.stroke();
    for (let k = 0; k < 12; k++) {
      const an = (k / 12) * PI2;
      c.beginPath();
      c.moveTo(Math.cos(an) * 0.92, Math.sin(an) * 0.92);
      c.lineTo(Math.cos(an) * 1.05, Math.sin(an) * 1.05);
      c.stroke();
    }
    c.beginPath();
    A.mapleLeafPath(c, 0, 0.04, 0.72);
    c.fillStyle = 'rgba(170,188,220,0.12)';
    c.fill();
    c.lineWidth = 2 / sc;
    c.stroke();
    c.restore();
    c.restore();
    // 柱子和石獅，由遠到近（越遠越淡、越藍）
    const objs = [];
    [1.6, 2.55, 3.7, 5.2, 7.2, 10, 14, 19].forEach((d, i) => [-1, 1].forEach((sd) => objs.push({ d, kind: 'p', sd, i })));
    [2.1, 3.1, 4.4, 6.1, 8.4, 11.6, 16].forEach((d, i) => [-1, 1].forEach((sd) => objs.push({ d: d + (sd > 0 ? 0.15 : 0), kind: 's', sd, i: i * 2 + (sd > 0 ? 1 : 0) })));
    objs.sort((a, b) => b.d - a.d);
    objs.forEach((o) => {
      const a = Math.min(0.82, Math.pow(cl((o.d - 1.7) / 15), 0.6) * 0.85);
      if (o.kind === 'p') {
        const b = P(o.sd * 2.12, 0, o.d);
        const w = (0.36 * 400) / o.d;
        thPillar(c, b[0], b[1], w, (CE * 400) / o.d, a, 20 + o.i * 2 + (o.sd > 0 ? 1 : 0));
      } else {
        const b = P(o.sd * 1.42, 0, o.d);
        thStatue(c, b[0], b[1], 400 / o.d, -o.sd, a, o.i);
      }
    });
    // 天花板的橫樑
    [2.55, 3.7, 5.2, 7.2, 10, 14].forEach((d) => {
      const a = P(-WL, CE, d);
      const b = P(WL, CE - 0.22, d);
      c.fillStyle = fogC('#1d2331', cl((d - 2) / 16));
      c.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    });
    haze(c, TH.vx, TH.hz + 20, 420, '110,126,158', 0.22);
  }

  // 王座（從背後看）：兩層台階、矮椅背、兩根高扶柱
  function thThrone(c) {
    const x = TH.x;
    const line = TH_LINE;
    const top = '#9aa2b2';
    const sd = '#4c5262';
    const step = (y0, y1, hw, hw2) => {
      paint(c, (p) => quad(p, [[x - hw2, y0 - 10], [x + hw2, y0 - 10], [x + hw, y0], [x - hw, y0]]), top, { lw: 2.4, line });
      paint(c, (p) => p.rect(x - hw, y0, hw * 2, y1 - y0), '#6d7486', { shade: sd, cel: [hw * 0.22, 0], lw: 2.6, line });
    };
    step(598, 680, 340, 326);
    step(560, 598, 262, 250);
    // 扶柱
    [-1, 1].forEach((s) => {
      const px = x + s * 172;
      paint(c, (p) => p.rect(px - 23, 250, 46, 312), '#747c8e', { shade: sd, cel: [14, 0], lw: 2.6, line });
      c.save();
      c.beginPath();
      c.rect(px - 23, 250, 46, 312);
      c.clip();
      c.strokeStyle = 'rgba(18,22,32,0.35)';
      c.lineWidth = 2;
      [-9, 0, 9].forEach((k) => {
        c.beginPath();
        c.moveTo(px + k, 250);
        c.lineTo(px + k, 562);
        c.stroke();
      });
      c.restore();
      paint(c, (p) => p.rect(px - 32, 232, 64, 20), '#848c9e', { shade: sd, cel: [16, 0], lw: 2.6, line });
      paint(c, (p) => p.rect(px - 28, 544, 56, 18), '#7c8496', { shade: sd, cel: [14, 0], lw: 2.4, line });
      // 柱頂：石頭星楓葉
      c.save();
      c.translate(px, 206);
      paint(c, (p) => A.mapleLeafPath(p, 0, 0, 30), '#8c94a6', { shade: '#5c6374', cel: [6, 5], lw: 2.4, line, hl: [-8, -12, 6, 3], hlA: 0.25 });
      c.restore();
    });
    // 椅背（背面）
    paint(c, (p) => quad(p, [[x - 150, 474], [x + 150, 474], [x + 158, 484], [x - 158, 484]]), top, { lw: 2.4, line });
    paint(c, (p) => p.rect(x - 158, 484, 316, 78), '#697083', { shade: sd, cel: [60, 0], lw: 2.6, line });
    // 椅背上的星楓圓章
    c.save();
    c.strokeStyle = 'rgba(196,210,236,0.4)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x, 523, 28, 0, PI2);
    c.stroke();
    c.beginPath();
    A.mapleLeafPath(c, x, 525, 20);
    c.stroke();
    c.restore();
    // 裂縫、苔
    c.strokeStyle = 'rgba(16,20,30,0.5)';
    c.lineWidth = 1.8;
    [[x - 120, 484, x - 104, 506, x - 116, 530], [x + 96, 562, x + 120, 580, x + 110, 598], [x - 230, 598, x - 250, 630, x - 236, 660]].forEach(([a, b, d, e, f, g]) => {
      c.beginPath();
      c.moveTo(a, b);
      c.lineTo(d, e);
      c.lineTo(f, g);
      c.stroke();
    });
    [[x - 300, 598, 26], [x + 250, 598, 20], [x - 190, 560, 16]].forEach(([mx, my, r]) => {
      paint(c, (p) => p.ellipse(mx, my, r, r * 0.3, 0, Math.PI, 0), '#586f5c', { shade: '#445848', cel: [0, -2], lw: 1.6, line });
    });
    // 以前碎掉的小石塊
    [[x - 280, 640, 9], [x + 300, 650, 7], [x + 210, 632, 5], [x - 150, 596, 5]].forEach(([rx, ry, r]) => {
      paint(c, (p) => quad(p, [[rx - r, ry], [rx - r * 0.4, ry - r * 0.9], [rx + r * 0.8, ry - r * 0.6], [rx + r, ry]]), '#7e8698', { shade: sd, cel: [r * 0.4, 0], lw: 1.6, line });
    });
  }

  // ── 金色的獅子（背影）──
  // 原點在腳底中央；u：0 坐著 → 1 站起來
  const LION_BODY = '#cfa066';
  const LION_BODY_S = '#9a7042';
  const MANE = '#efb83f';
  const MANE_S = '#b8761f';
  const MANE_HI = '#fff0b4';
  function thBodyPath(p, u, inf) {
    inf = inf || 0;
    const hw = lerp(46, 30, u) + inf;
    const by = lerp(-2, -38, u) + inf;
    const cy = lerp(-32, -62, u);
    const sy = -100;
    const sw = lerp(30, 24, u) + inf;
    p.moveTo(0, by);
    p.bezierCurveTo(hw * 0.78, by, hw, cy + (by - cy) * 0.55, hw, cy);
    p.bezierCurveTo(hw, cy - 22, sw, sy + 16, sw * 0.6, sy);
    p.lineTo(-sw * 0.6, sy);
    p.bezierCurveTo(-sw, sy + 16, -hw, cy - 22, -hw, cy);
    p.bezierCurveTo(-hw, cy + (by - cy) * 0.55, -hw * 0.78, by, 0, by);
    p.closePath();
  }
  // 鬃毛：一撮一撮往下垂，越下面越長
  function thManePath(p, cx, cy, R, t, n, sway, drop) {
    n = n || 18;
    drop = drop == null ? 0.3 : drop;
    const step = PI2 / n;
    const pt = (a, r) => {
      const down = Math.max(0, Math.sin(a));
      const rx = R * (1.08 + down * 0.1);
      const ry = R * (1 + Math.pow(down, 1.6) * drop);
      // 毛尖往下垂
      return [cx + Math.cos(a) * rx * r + down * down * (sway || 0), cy + Math.sin(a) * ry * r + (r - 0.85) * R * 0.9 * (0.35 + down * 0.3)];
    };
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * step;
      const w = t == null ? 0 : Math.sin(t * 1.7 + i * 1.3) * 0.04;
      const v0 = pt(a, 0.86);
      const tip = pt(a + step * 0.7 + w, 1.1);
      const c1 = pt(a + step * 0.2, 1.08);
      const v1 = pt(a + step, 0.86);
      const c2 = pt(a + step * 0.92, 0.98);
      if (i === 0) p.moveTo(v0[0], v0[1]);
      p.quadraticCurveTo(c1[0], c1[1], tip[0], tip[1]);
      p.quadraticCurveTo(c2[0], c2[1], v1[0], v1[1]);
    }
    p.closePath();
  }
  function goldLion(c, t, u, ph, wa, bob) {
    const lw = 2.6;
    const mx = Math.sin(ph) * 1.6 * wa;
    const my = lerp(-116, -122, u) + (bob || 0);
    // 站起來以後才看得到腳和尾巴
    if (u > 0.35) {
      const ka = cl((u - 0.35) / 0.4);
      const lift = [Math.max(0, Math.sin(ph)) * 7 * wa, Math.max(0, -Math.sin(ph)) * 7 * wa];
      c.save();
      c.globalAlpha *= ka;
      // 前腳（比較遠，比較暗）
      [-1, 1].forEach((s, i) => {
        const ly = -6 - lift[1 - i] * 0.7;
        paint(c, (p) => A.roundRect(p, s * 11 - 6.5, -50, 13, 50 + ly, 5), '#b08450', { shade: '#86613a', cel: [4, 0], lw });
      });
      [-1, 1].forEach((s, i) => {
        const ly = -lift[i];
        paint(c, (p) => {
          p.moveTo(s * 10, -54);
          p.lineTo(s * 27, -54);
          p.quadraticCurveTo(s * 26, -26, s * 22, ly - 4);
          p.lineTo(s * 9, ly - 4);
          p.quadraticCurveTo(s * 10, -28, s * 10, -54);
          p.closePath();
        }, LION_BODY, { shade: LION_BODY_S, cel: [6, 0], lw });
        paint(c, (p) => p.ellipse(s * 15.5, ly - 3, 9, 5, 0, 0, PI2), LION_BODY, { shade: LION_BODY_S, cel: [2, -2], lw });
      });
      c.restore();
    }
    paint(c, (p) => thBodyPath(p, u), LION_BODY, { shade: LION_BODY_S, cel: [11, 7], lw, hl: [-14, lerp(-58, -74, u), 9, 5], hlA: 0.18 });
    c.strokeStyle = A.c('rgba(90,60,30,0.45)');
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, lerp(-2, -38, u));
    c.quadraticCurveTo(1, lerp(-12, -46, u), 0, lerp(-24, -54, u));
    c.stroke();
    // 外層鬃毛（後面先墊一層比較深、垂得比較長的）
    const sway = Math.sin(t * 0.9) * 2 + Math.sin(ph) * 3 * wa;
    lit(c, (p) => thManePath(p, mx, my + 8, 37, t + 1, 16, sway * 1.4, lerp(0.75, 0.3, u)), '#dc9c32', { hi: '#f4c85c', shade: '#a8661a', rim: 3, sh: 10, dx: 6, lw });
    lit(c, (p) => thManePath(p, mx, my, 36, t, 20, sway, lerp(0.3, 0.12, u)), MANE, { hi: MANE_HI, shade: MANE_S, rim: 4, sh: 11, dx: 7, lw });
    // 耳朵（從鬃毛裡冒出來）
    [-1, 1].forEach((s) => paint(c, (p) => p.ellipse(mx + s * 15, my - 34, 7, 8.5, s * 0.3, 0, PI2), LION_BODY, { shade: LION_BODY_S, cel: [3, 2], lw }));
    // 髮絲
    c.save();
    c.beginPath();
    thManePath(c, mx, my, 36, t, 20, sway, lerp(0.3, 0.12, u));
    c.clip();
    c.lineCap = 'round';
    for (let j = 0; j < 9; j++) {
      const ox = (j - 4) * 9;
      c.strokeStyle = A.c(j % 3 === 0 ? MANE_HI : MANE_S);
      c.globalAlpha = j % 3 === 0 ? 0.45 : 0.5;
      c.lineWidth = j % 3 === 0 ? 1.8 : 2.2;
      c.beginPath();
      c.moveTo(mx + ox * 0.4, my - 20);
      c.quadraticCurveTo(mx + ox * 1.0, my + 6, mx + ox * 1.2 + sway * 0.5, my + 42 - Math.abs(ox) * 0.4);
      c.stroke();
    }
    c.restore();
    // 內層（後腦勺的鬃毛）
    lit(c, (p) => thManePath(p, mx, my - 10, 22, t + 2, 13, sway * 0.6, 0.2), '#f7c64e', { hi: MANE_HI, shade: '#c9862a', rim: 3, sh: 7, dx: 5, lw: lw * 0.8 });
    // 站著的時候，屁股比鬃毛近，蓋在鬃毛前面
    if (u > 0.5) {
      const ka = cl((u - 0.5) / 0.35);
      const cy = lerp(-32, -62, u);
      c.save();
      c.globalAlpha *= ka;
      paint(c, (p) => p.ellipse(0, cy + 2, lerp(46, 30, u), 25, 0, 0, PI2), LION_BODY, { shade: LION_BODY_S, cel: [9, 6], lw, hl: [-12, cy - 10, 8, 4], hlA: 0.2 });
      c.strokeStyle = A.c('rgba(90,60,30,0.5)');
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, cy + 27);
      c.quadraticCurveTo(1, cy + 16, 0, cy + 6);
      c.stroke();
      c.restore();
    }
    // 尾巴：垂在後腿中間，走路時左右擺
    if (u > 0.5) {
      const ka = cl((u - 0.5) / 0.4);
      const sw = Math.sin(ph * 0.5 + 0.6) * 8 * wa + Math.sin(t * 1.3) * 2;
      c.save();
      c.globalAlpha *= ka;
      c.lineCap = 'round';
      const tail = (p) => {
        p.moveTo(0, -44);
        p.quadraticCurveTo(sw * 0.4, -26, sw, -14);
      };
      c.strokeStyle = A.outline();
      c.lineWidth = 7.5;
      c.beginPath();
      tail(c);
      c.stroke();
      c.strokeStyle = A.c(LION_BODY);
      c.lineWidth = 4;
      c.beginPath();
      tail(c);
      c.stroke();
      paint(c, (p) => p.ellipse(sw, -12, 5, 7, sw * 0.03, 0, PI2), '#8a5a2c', { shade: '#63401e', cel: [2, 2], lw: 2.2 });
      c.restore();
    }
  }
  const thWithLion = (ctx, x, y, s, fn) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    fn();
    ctx.restore();
  };

  // 石殼：前面那一半（坐著的獅子形狀，上緣碎成鋸齒）
  const RIM_F = [[-60, -52], [-44, -56], [-34, -50], [-24, -60], [-14, -54], [-4, -63], [6, -56], [16, -64], [26, -54], [36, -60], [46, -52], [60, -56]];
  const RIM_B = [[-50, -66], [-34, -74], [-20, -70], [-8, -79], [4, -72], [16, -80], [30, -71], [50, -68]];
  function thShellClip(c, rim) {
    c.beginPath();
    c.moveTo(-80, 40);
    rim.forEach(([x, y]) => c.lineTo(x, y));
    c.lineTo(80, 40);
    c.closePath();
    c.clip();
  }
  function thShellShape(p) {
    thBodyPath(p, 0, 3);
  }
  function thShellFront(c) {
    c.save();
    c.translate(TH.x, TH.y);
    c.scale(TH.s, TH.s);
    c.save();
    thShellClip(c, RIM_F);
    c.beginPath();
    thShellShape(c);
    c.lineWidth = 5.2;
    c.strokeStyle = TH_LINE;
    c.lineJoin = 'round';
    c.stroke();
    c.beginPath();
    thShellShape(c);
    c.fillStyle = STONE;
    c.fill();
    c.clip();
    c.fillStyle = STONE_S;
    c.save();
    c.translate(-12, -8);
    c.beginPath();
    thShellShape(c);
    c.rect(-200, -300, 400, 600);
    c.fill('evenodd');
    c.restore();
    // 石頭的紋路和苔
    c.strokeStyle = 'rgba(20,24,34,0.4)';
    c.lineWidth = 1.2;
    const r = U.seeded(77);
    for (let i = 0; i < 12; i++) {
      const x0 = -44 + r() * 88;
      const y0 = -80 + r() * 70;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x0 + (r() - 0.5) * 14, y0 + 5 + r() * 8);
      c.lineTo(x0 + (r() - 0.5) * 16, y0 + 12 + r() * 8);
      c.stroke();
    }
    c.fillStyle = 'rgba(210,222,240,0.2)';
    c.beginPath();
    c.ellipse(-24, -38, 10, 16, 0.3, 0, PI2);
    c.fill();
    c.restore();
    // 獅子的形狀：兩邊大腿的輪廓、背脊的凹線
    c.save();
    c.beginPath();
    thShellShape(c);
    c.clip();
    c.strokeStyle = 'rgba(28,34,48,0.55)';
    c.lineWidth = 2;
    c.lineCap = 'round';
    [-1, 1].forEach((sd) => {
      c.beginPath();
      c.moveTo(sd * 12, -4);
      c.bezierCurveTo(sd * 18, -34, sd * 40, -44, sd * 47, -30);
      c.stroke();
    });
    c.beginPath();
    c.moveTo(0, -4);
    c.quadraticCurveTo(-2, -30, 0, -60);
    c.stroke();
    c.strokeStyle = 'rgba(220,230,246,0.25)';
    c.beginPath();
    c.moveTo(-14, -6);
    c.bezierCurveTo(-20, -32, -38, -40, -44, -28);
    c.stroke();
    c.restore();
    // 石頭尾巴：繞在右邊屁股旁
    paint(c, (p) => {
      p.moveTo(30, -6);
      p.quadraticCurveTo(58, -2, 60, -20);
      p.quadraticCurveTo(62, -30, 54, -34);
      p.quadraticCurveTo(50, -24, 50, -18);
      p.quadraticCurveTo(46, -10, 28, -14);
      p.closePath();
    }, STONE, { shade: STONE_S, cel: [4, 3], lw: 2.3, line: TH_LINE });
    paint(c, (p) => p.ellipse(56, -34, 6, 8, 0.4, 0, PI2), '#7b8292', { shade: STONE_S, cel: [2, 2], lw: 2.3, line: TH_LINE });
    // 鋸齒的上緣（斷面，亮一點）
    c.save();
    c.beginPath();
    thShellShape(c);
    c.clip();
    c.beginPath();
    RIM_F.forEach(([x, y], i) => (i ? c.lineTo(x, y + 3) : c.moveTo(x, y + 3)));
    c.strokeStyle = '#b3bccb';
    c.lineWidth = 3;
    c.stroke();
    c.beginPath();
    RIM_F.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = TH_LINE;
    c.lineWidth = 2.4;
    c.lineJoin = 'round';
    c.stroke();
    c.restore();
    c.restore();
  }
  // 石殼：後面那一半（胸口那側的內壁）＋空心的黑
  function thShellBack(c) {
    c.save();
    c.translate(TH.x, TH.y);
    c.scale(TH.s, TH.s);
    c.save();
    thShellClip(c, RIM_B);
    c.beginPath();
    thShellShape(c);
    c.lineWidth = 5.2;
    c.strokeStyle = TH_LINE;
    c.lineJoin = 'round';
    c.stroke();
    c.beginPath();
    thShellShape(c);
    c.fillStyle = '#5a6172';
    c.fill();
    c.clip();
    const g = c.createRadialGradient(0, -62, 2, 0, -62, 40);
    g.addColorStop(0, '#07090e');
    g.addColorStop(0.6, '#161a24');
    g.addColorStop(1, 'rgba(22,26,36,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, -62, 36, 14, 0, 0, PI2);
    c.fill();
    c.restore();
    c.beginPath();
    RIM_B.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = TH_LINE;
    c.lineWidth = 2.4;
    c.lineJoin = 'round';
    c.stroke();
    c.restore();
  }

  function thVignette(c) {
    const g = c.createRadialGradient(640, 330, 200, 640, 360, 820);
    g.addColorStop(0, 'rgba(4,6,12,0)');
    g.addColorStop(0.6, 'rgba(4,6,12,0.35)');
    g.addColorStop(1, 'rgba(4,6,12,0.85)');
    c.fillStyle = g;
    c.fillRect(-80, -50, 1440, 830);
  }

  Object.assign(DEFS, {
    thHall: { ...FULL, kmax: 1.4, draw: thHall },
    thThrone: { ox: 420, oy: 160, w: 740, h: 560, kmax: 1.5, draw: thThrone },
    thShell: { ox: 640, oy: 290, w: 300, h: 240, kmax: 1.6, draw: thShellFront },
    thShellB: { ox: 640, oy: 290, w: 300, h: 240, kmax: 1.6, draw: thShellBack },
    thVig: { ...FULL, kmax: 0.8, draw: thVignette },
  });

  // 每個鏡頭用到的圖層（用來預先準備、用完釋放）
  const SHOT_LAYERS = {
    throne: ['thHall', 'thShellB', 'thShell', 'thThrone', 'thVig'],
    sky: ['ringA', 'ringB', 'ringC', 'bandFar', 'bandMid', 'bandNear', 'farIsles', 'isle', 'chunk'],
    tree: ['ringA', 'ringB', 'bandFar', 'cyBack', 'cyFloor', 'treeTrunk', 'treeCanopy', 'cyFore'],
    nap: ['bandFar', 'napBack', 'napTree', 'napFront'],
    wind: ['ringA', 'ringB', 'bandFar', 'cyBack', 'cyFloor', 'treeTrunk', 'treeCanopy', 'cyFore'],
    scatter: ['ringA', 'ringB', 'ringC', 'bandFar', 'bandMid', 'bandNear', 'farIsles', 'isle', 'chunk'],
    fall: ['lands', 'puffA', 'puffB', 'puffC'],
    wake: ['isle', 'fwFar', 'fwMid', 'fwFront'],
    title: ['isle', 'fwFar', 'fwMid', 'fwFront'],
  };

  // ════════ 即時的小東西 ════════
  function cub(ctx, x, y, s, dir, st, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(s, s);
    A.drawLion(ctx, 0, 0, dir, st);
    ctx.restore();
  }

  function zzz(ctx, x, y, t, s) {
    ctx.save();
    ctx.font = 'bold 20px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.42 + i / 3) % 1;
      const a = Math.sin(k * Math.PI);
      ctx.globalAlpha = a * 0.95;
      const px = x + k * 46 * s + Math.sin(k * 7 + i) * 6;
      const py = y - k * 70 * s;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale((0.7 + k * 0.8) * s, (0.7 + k * 0.8) * s);
      ctx.rotate(-0.15);
      ctx.lineWidth = 4;
      ctx.strokeStyle = A.OUT;
      ctx.strokeText('z', 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('z', 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function petals(ctx, t, n, box, wind, seed, cols) {
    const [x0, y0, w, h] = box;
    for (let i = 0; i < n; i++) {
      const hs = hash(i * 3.1 + seed);
      const sp = 0.5 + hash(i * 7.7 + seed) * 0.8;
      const k = (t * 0.06 * sp * (1 + wind * 3) + hs) % 1;
      const x = x0 + ((hash(i * 1.3 + seed) * w + k * wind * w * 2.2) % (w + 60)) - 30 + Math.sin(t * 1.3 + i) * 20 * (1 - wind);
      const y = y0 + (k * h * (1 - wind * 0.6) + hash(i * 5.1 + seed) * h * wind) % h;
      const rot = t * (1.5 + hs * 2) + i;
      const sz = 3 + hs * 3.5;
      ctx.fillStyle = cols[i % cols.length];
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.ellipse(x, y, sz * (0.6 + 0.4 * Math.abs(Math.cos(rot))), sz * 0.55, rot * 0.5, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function motes(ctx, t, n, box, rgb, seed) {
    const [x0, y0, w, h] = box;
    ctx.fillStyle = 'rgb(' + rgb + ')';
    for (let i = 0; i < n; i++) {
      const k = (t * 0.03 * (0.6 + hash(i + seed) * 0.8) + hash(i * 2.3 + seed)) % 1;
      const x = x0 + hash(i * 4.7 + seed) * w + Math.sin(t * 0.7 + i) * 18;
      const y = y0 + h - k * h;
      const a = Math.sin(k * Math.PI) * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7));
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + hash(i * 9.1 + seed) * 1.6, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function raysPaint(ctx, x, y, ang, list, len, rgb, a) {
    ctx.save();
    list.forEach(([off, wd, aa], i) => {
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const px = -dy;
      const py = dx;
      const sx = x + px * off;
      const sy = y + py * off;
      const g = ctx.createLinearGradient(sx, sy, sx + dx * len, sy + dy * len);
      g.addColorStop(0, 'rgba(' + rgb + ',' + (a * aa).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx - px * wd * 0.3, sy - py * wd * 0.3);
      ctx.lineTo(sx + px * wd * 0.3, sy + py * wd * 0.3);
      ctx.lineTo(sx + dx * len + px * wd, sy + dy * len + py * wd);
      ctx.lineTo(sx + dx * len - px * wd, sy + dy * len - py * wd);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }  // 光束也先畫成半解析度的圖，每幀只調透明度
  const RAYC = {};
  function rays(ctx, x, y, ang, list, len, rgb, a) {
    if (a <= 0.01) return;
    const key = [x, y, ang, len, rgb, JSON.stringify(list)].join('|');
    let c = RAYC[key];
    if (!c) {
      c = RAYC[key] = newCv(1280, 720);
      const g = c.getContext('2d');
      raysPaint(g, x, y, ang, list, len, rgb, 1);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= Math.min(1, a);
    ctx.drawImage(c, 0, 0, W(), H());
    ctx.restore();
  }


  function birds(ctx, t, x0, y0, spd) {
    ctx.strokeStyle = 'rgba(80,60,70,0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    [[0, 0], [-16, -8], [-18, 9], [-34, 2]].forEach(([dx, dy], i) => {
      const x = x0 + t * spd + dx;
      const y = y0 + dy + Math.sin(t * 1.3 + i) * 3;
      const f = Math.sin(t * 8 + i * 1.3) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - f);
      ctx.quadraticCurveTo(x - 2, y - 2, x, y + 1);
      ctx.quadraticCurveTo(x + 2, y - 2, x + 6, y - f);
      ctx.stroke();
    });
  }

  // 葉子留下的光尾：pos(u) 回傳 [x, y]
  function comet(ctx, pos, u, i, size, fade) {
    const L = LEAVES[i];
    const a = fade == null ? 1 : fade;
    if (a <= 0.01) return;
    ctx.save();
    ctx.lineCap = 'round';
    const pts = [pos(u)];
    for (let j = 1; j <= 16; j++) {
      const uu = u - j * 0.016;
      if (uu < 0) break;
      pts.push(pos(uu));
    }
    for (let pass = 0; pass < 2; pass++) {
      if (pass) ctx.globalCompositeOperation = 'lighter';
      for (let j = 1; j < pts.length; j++) {
        const k = 1 - j / 17;
        ctx.globalAlpha = a * k * (pass ? 0.75 : 0.85);
        ctx.strokeStyle = pass ? '#ffffff' : 'rgb(' + L.rgb + ')';
        ctx.lineWidth = pass ? size * 0.28 * k + 0.5 : size * 1.1 * k + 1.5;
        ctx.beginPath();
        ctx.moveTo(pts[j - 1][0], pts[j - 1][1]);
        ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
    }
    ctx.restore();
    const p = pts[0];
    haze(ctx, p[0], p[1], size * 3.2, L.rgb, a * 0.8);
    glow(ctx, p[0], p[1], size * 4, L.rgb, a * 0.7);
    glow(ctx, p[0], p[1], size * 1.6, '255,255,255', a * 0.8);
    ctx.save();
    ctx.globalAlpha *= a;
    leafGem(ctx, p[0], p[1], size, L.col, u * 14 + i);
    ctx.restore();
  }

  // 樹上發光的五片葉子
  function treeLeaves(ctx, ox, oy, s, t, o) {
    o = o || {};
    for (let i = 0; i < 5; i++) {
      if (o.gone && o.gone[i]) continue;
      const [lx, ly] = TREE_LEAVES[i];
      const x = ox + lx * s + (o.dx ? o.dx(ly * s) : 0);
      const y = oy + ly * s;
      const L = LEAVES[i];
      const pulse = 0.75 + Math.sin(t * 2.2 + i * 1.3) * 0.25;
      const big = i === 4 ? 1.35 : 1;
      glow(ctx, x, y, 70 * s * big * pulse * (o.glow || 1), L.rgb, 0.55 * (o.alpha == null ? 1 : o.alpha));
      glow(ctx, x, y, 26 * s * big, '255,255,255', 0.35 * pulse);
      const shake = o.shake ? Math.sin(t * 40 + i * 3) * o.shake[i] : 0;
      leafGem(ctx, x, y + Math.sin(t * 1.6 + i) * 2 * s, 17 * s * big, L.col, Math.sin(t * 1.2 + i * 2) * 0.12 + shake);
      for (let j = 0; j < 3; j++) {
        const a = t * 1.1 + j * 2.1 + i;
        sparkle(ctx, x + Math.cos(a) * 28 * s * big, y + Math.sin(a * 1.3) * 22 * s * big, 4 * s + 1.5, 0.5 + Math.sin(t * 3 + j * 2 + i) * 0.5, '#fffbe0');
      }
    }
  }

  // ════════ 八個鏡頭 ════════
  const SKY_DAWN = [[0, '#7aa8e6'], [0.42, '#bcd6f2'], [0.7, '#fde4c4'], [1, '#ffd6a0']];
  const SKY_STORM = [[0, '#5e6fb8'], [0.45, '#a9a6d8'], [0.72, '#f0c6c0'], [1, '#ffc49a']];

  function isleAt(t, storm) {
    const bob = Math.sin(t * 0.9) * 5;
    if (!storm) return { x: 640, y: 330 + bob, rot: 0, s: 0.78 };
    const k = sm(0.2, 4, t);
    return { x: 640 + Math.sin(t * 17) * 2 * k, y: 330 + bob + k * 14, rot: -0.035 * k, s: 0.78 };
  }
  function isleLeafPos(I, i) {
    const [lx, ly] = TREE_LEAVES[i];
    const x = lx * ISLE_TREE_S * I.s;
    const y = (ly * ISLE_TREE_S + ISLE_TREE_Y) * I.s;
    const cs = Math.cos(I.rot);
    const sn = Math.sin(I.rot);
    return [I.x + x * cs - y * sn, I.y + x * sn + y * cs];
  }

  function shotSky(ctx, t, storm) {
    const C = storm
      ? { x: 640, y: 350, z: lerp(1.1, 1.0, sm(0, 6, t)), sx: Math.sin(t * 23) * 3 * sm(0.2, 1, t), sy: Math.cos(t * 19) * 2 * sm(0.2, 1, t) }
      : { x: 640, y: lerp(372, 340, sm(0, 7.5, t)), z: lerp(1.0, 1.1, sm(0, 7.5, t)) };
    sky(ctx, storm ? SKY_STORM : SKY_DAWN, [640, 470, 620, '255,238,200', storm ? 0.45 : 0.75]);
    // 天上慢慢轉的時鐘環
    cam(ctx, C, 0.12, () => {
      ctx.save();
      ctx.globalAlpha = storm ? 0.3 : 0.42;
      const sp = storm ? 3 : 1;
      blitAt(ctx, 'ringA', 640, 270, 1, t * 0.03 * sp);
      blitAt(ctx, 'ringB', 640, 270, 1, -t * 0.05 * sp);
      blitAt(ctx, 'ringC', 1090, 140, 1, t * 0.08 * sp);
      ctx.restore();
    });
    cam(ctx, C, 0.22, () => {
      blit(ctx, 'farIsles', 0, Math.sin(t * 0.7) * 4);
      if (!storm) birds(ctx, t, 180, 190, 26);
    });
    cam(ctx, C, 0.35, () => {
      band(ctx, 'bandFar', t * (storm ? 40 : 8), 420, 80);
    });
    // 光束
    rays(ctx, 180, -60, 1.1, [[0, 60, 0.5], [160, 90, 0.35], [330, 70, 0.4], [520, 110, 0.25]], 900, '255,246,220', (storm ? 0.25 : 0.55) * (0.8 + Math.sin(t * 0.8) * 0.2));
    const I = isleAt(t, storm);
    cam(ctx, C, 0.7, () => {
      ctx.save();
      ctx.translate(I.x, I.y);
      ctx.scale(I.s, I.s);
      ctx.translate(-I.x, -I.y);
      // 瀑布
      ctx.save();
      const wx = I.x + 236;
      const wy = I.y + 14;
      const g = ctx.createLinearGradient(0, wy, 0, wy + 220);
      g.addColorStop(0, 'rgba(210,240,255,0.9)');
      g.addColorStop(1, 'rgba(210,240,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(wx - 7, wy, 14, 220);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.9 + i / 6) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.fillRect(wx - 3, wy + k * 200, 3, 16);
      }
      ctx.restore();
      // 跟著漂的小碎岩
      [[-200, 250, 0.9, 0], [180, 290, 0.7, 2], [40, 380, 0.55, 4]].forEach(([dx, dy, s, ph]) => {
        blitAt(ctx, 'chunk', I.x + dx, I.y + dy + Math.sin(t * 1.2 + ph) * 8 + (storm ? t * 20 * s : 0), s, storm ? t * 0.3 : 0);
      });
      glow(ctx, I.x + 8, I.y + 336, 50, '255,220,140', 0.6 + Math.sin(t * 2) * 0.15);
      const tx = I.x;
      const ty = I.y - 150;
      glow(ctx, tx, ty, 190, '255,236,170', (storm ? 0.25 : 0.45) + Math.sin(t * 1.5) * 0.08);
      blitAt(ctx, 'isle', I.x, I.y, 1, I.rot);
      ctx.restore();
      if (!storm) {
        for (let i = 0; i < 5; i++) {
          const [x, y] = isleLeafPos(I, i);
          glow(ctx, x, y, 22, LEAVES[i].rgb, 0.8 + Math.sin(t * 2.4 + i) * 0.2);
          leafGem(ctx, x, y, i === 4 ? 8.5 : 6.5, LEAVES[i].col, Math.sin(t + i) * 0.2);
        }
      }
      if (storm) stormLeaves(ctx, t, I);
    });
    cam(ctx, C, 0.85, () => {
      band(ctx, 'bandMid', t * (storm ? 70 : 16), 560, 80);
      if (storm) stormCub(ctx, t, I);
    });
    cam(ctx, C, 1.1, () => {
      band(ctx, 'bandNear', t * (storm ? 110 : 26), 650, 120);
    });
    motes(ctx, t, 30, [0, 60, W(), H() - 120], '255,244,200', 1);
    if (storm) {
      windStreaks(ctx, t, 1, 0.8);
      petals(ctx, t, 50, [-40, 40, W() + 80, H() - 80], 1, 7, ['#ffc6dc', '#ffe39a', '#fff6ea']);
    }
  }

  // 散開的五道光（在遠景的浮島鏡頭裡）
  const SCATTER = [
    { end: [-140, 700], ctl: [200, 60] },
    { end: [1440, 740], ctl: [1080, 60] },
    { end: [300, 860], ctl: [420, 100] },
    { end: [1010, 880], ctl: [900, 80] },
    { end: [700, -160], ctl: [560, 40] },
  ];
  function stormLeaves(ctx, t, I) {
    for (let i = 0; i < 5; i++) {
      const t0 = 0.3 + [0, 0.3, 0.55, 0.8, 1.15][i];
      const u = cl((t - t0) / 2.2);
      const [sx, sy] = isleLeafPos(I, i);
      if (u <= 0) {
        glow(ctx, sx, sy, 24, LEAVES[i].rgb, 0.9);
        leafGem(ctx, sx, sy, i === 4 ? 8.5 : 6.5, LEAVES[i].col, Math.sin(t * 30 + i) * 0.3);
        continue;
      }
      const S = SCATTER[i];
      const pos = (uu) => {
        const e = Math.pow(uu, 1.25);
        const a = 1 - e;
        return [a * a * sx + 2 * a * e * S.ctl[0] + e * e * S.end[0], a * a * sy + 2 * a * e * S.ctl[1] + e * e * S.end[1]];
      };
      if (u < 0.08) glow(ctx, sx, sy, 90 * (1 - u / 0.08), '255,255,255', 0.9);
      comet(ctx, pos, u, i, 9, 1 - sm(0.9, 1, u));
    }
  }
  // 被吹下浮島的小獅子（遠景）
  function stormCub(ctx, t, I) {
    const t0 = 3.0;
    if (t < t0) return;
    const u = t - t0;
    const x = I.x + 296 * I.s + u * 80;
    const y = I.y - 30 - u * 70 + u * u * 130;
    cub(ctx, x, y, 0.62, 1, { state: 'fall', t: t, p: 0 }, u * 2.6);
  }

  function windStreaks(ctx, t, I, a) {
    if (I <= 0.01) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const sp = 0.6 + hash(i * 2.2) * 0.7;
      const k = (t * 0.55 * sp + hash(i * 5.5)) % 1;
      const y = 80 + hash(i * 3.3) * (H() - 160);
      const len = 120 + hash(i * 7.7) * 220;
      const x = -300 + k * (W() + 600);
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.55 * I * a;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 + hash(i) * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len * 0.5, y - 10 - hash(i * 9) * 16, x + len, y + Math.sin(t * 2 + i) * 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 中景的樹（第二、四鏡）
  const TREE_X = 640;
  const TREE_Y = 632;
  const TREE_S = 0.95;
  function shotTree(ctx, t, wind) {
    const I = wind ? sm(0.2, 1.6, t) : 0;
    const C = wind
      ? { x: 640, y: 390, z: 1.08 + sm(2, 3.6, t) * 0.05, sx: Math.sin(t * 31) * 4 * I, sy: Math.cos(t * 27) * 3 * I }
      : { x: lerp(640, 640, 0), y: lerp(430, 346, sm(0.4, 6.4, t)), z: lerp(1.22, 1.03, sm(0.4, 6.4, t)) };
    sky(ctx, wind ? SKY_STORM : SKY_DAWN, [640, 420, 560, '255,238,200', 0.6]);
    cam(ctx, C, 0.1, () => {
      ctx.save();
      ctx.globalAlpha = 0.3;
      blitAt(ctx, 'ringA', 640, 250, 1.15, t * 0.025 * (1 + I * 4));
      blitAt(ctx, 'ringB', 640, 250, 1.15, -t * 0.04 * (1 + I * 4));
      ctx.restore();
    });
    cam(ctx, C, 0.3, () => {
      band(ctx, 'bandFar', t * (8 + I * 60), 410, 80);
    });
    cam(ctx, C, 0.6, () => blit(ctx, 'cyBack'));
    rays(ctx, 300, -80, 1.15, [[0, 50, 0.5], [180, 80, 0.35], [380, 60, 0.4]], 900, '255,246,220', 0.4 * (1 - I * 0.6));
    const gone = [];
    const shake = [];
    const rel = [];
    for (let i = 0; i < 5; i++) {
      rel[i] = 2.0 + i * 0.28;
      gone[i] = wind && t > rel[i];
      shake[i] = wind ? sm(0.8, rel[i], t) * 0.5 : 0;
    }
    cam(ctx, C, 1, () => {
      blit(ctx, 'cyFloor');
      // 葉子的光順著樹幹流進地底（它們讓神殿浮著）
      if (!wind) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
          const [lx, ly] = TREE_LEAVES[i];
          const sx = TREE_X + lx * TREE_S;
          const sy = TREE_Y + ly * TREE_S;
          for (let j = 0; j < 3; j++) {
            const k = (t * 0.28 + j / 3 + i * 0.13) % 1;
            let x;
            let y;
            if (k < 0.5) {
              const u = k / 0.5;
              x = lerp(sx, TREE_X, u * u);
              y = lerp(sy, TREE_Y - 300, u);
            } else {
              const u = (k - 0.5) / 0.5;
              x = TREE_X + Math.sin(u * 6 + i) * 6;
              y = lerp(TREE_Y - 300, TREE_Y + 10, u);
            }
            glow(ctx, x, y, 16, LEAVES[i].rgb, Math.sin(k * Math.PI) * 0.8 * sm(0.5, 2, t));
          }
        }
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + pulse * 0.25;
        ctx.strokeStyle = '#ffe9a0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(640, 640, 330, 52, 0, 0, PI2);
        ctx.stroke();
        ctx.restore();
      }
      glow(ctx, TREE_X, TREE_Y - 170 * TREE_S, 60, '255,220,140', 0.5 + Math.sin(t * 2) * 0.15);
      blit(ctx, 'treeTrunk', TREE_X, TREE_Y);
      // 樹冠隨風擺
      const lean = wind ? -(0.05 * I + Math.sin(t * 5.5) * 0.035 * I + Math.sin(t * 13) * 0.01 * I) : Math.sin(t * 0.8) * 0.006;
      const pivot = TREE_Y - 300 * TREE_S;
      const skewX = (yy) => (yy - pivot) * lean;
      ctx.save();
      ctx.translate(TREE_X, pivot);
      ctx.transform(1, 0, lean, 1, 0, 0);
      ctx.translate(-TREE_X, -pivot);
      const Lc = layer('treeCanopy');
      ctx.drawImage(Lc.c, TREE_X + Lc.x, TREE_Y + Lc.y, Lc.w, Lc.h);
      ctx.restore();
      const dimGlow = wind ? 1 - sm(2, 3.4, t) * 0.6 : 1;
      treeLeaves(ctx, TREE_X, TREE_Y, TREE_S, t, { gone, shake, glow: dimGlow, dx: (yy) => skewX(TREE_Y + yy) });
      if (wind) {
        if (t < 3.5) windCub(ctx, t, I);
        for (let i = 0; i < 5; i++) {
          if (t < rel[i]) continue;
          const [lx, ly] = TREE_LEAVES[i];
          const sx = TREE_X + lx * TREE_S + skewX(TREE_Y + ly * TREE_S);
          const sy = TREE_Y + ly * TREE_S;
          const dirs = [[-900, 300], [1000, -120], [-800, -420], [1000, 280], [120, -900]];
          const u = cl((t - rel[i]) / 1.3);
          const pos = (uu) => {
            const e = uu * uu;
            return [sx + dirs[i][0] * e + Math.sin(uu * 5) * 30, sy + dirs[i][1] * e - Math.sin(uu * 3) * 60];
          };
          const f = cl((t - rel[i]) / 0.35);
          if (f < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - f;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4 * (1 - f) + 1;
            ctx.beginPath();
            ctx.arc(sx, sy, 10 + f * 60, 0, PI2);
            ctx.stroke();
            ctx.restore();
            glow(ctx, sx, sy, 80, LEAVES[i].rgb, 1 - f);
          }
          comet(ctx, pos, u, i, 16, 1 - sm(0.85, 1, u));
        }
      }
      blit(ctx, 'cyFore');
      if (wind && t >= 3.5) windCub(ctx, t, I);
    });
    petals(ctx, t, wind ? 80 : 26, [-40, 40, W() + 80, H() - 60], wind ? I : 0, 3, ['#ffc6dc', '#ffe39a', '#fff6ea', '#9ad886']);
    motes(ctx, t, 26, [0, 80, W(), H() - 140], '255,244,200', 2);
    if (wind) {
      windStreaks(ctx, t, I, 1);
      ctx.fillStyle = 'rgba(60,40,110,' + (0.12 * I).toFixed(3) + ')';
      ctx.fillRect(0, 0, W(), H());
    }
  }

  // 第四鏡：樹下的小獅子被風驚醒、抓不住、被吹走
  function windCub(ctx, t, I) {
    const x0 = 780;
    const y0 = TREE_Y + 6;
    if (t < 1.0) {
      const br = 1 + Math.sin(t * 2.4) * 0.02;
      ctx.save();
      ctx.translate(x0, y0);
      ctx.scale(1, br);
      cub(ctx, 0, 0, 1.05, -1, { state: 'idle', t: 0.05, p: 0, onGround: true });
      ctx.restore();
      return;
    }
    if (t < 3.5) {
      const st = t < 1.5 ? { state: 'idle', t: 1.0, p: 0, onGround: true } : { state: 'hurt', t, p: 0, onGround: true };
      const slide = sm(1.5, 3.5, t) * 36;
      cub(ctx, x0 + slide + Math.sin(t * 30) * 1.5 * I, y0, 1.05, -1, st, t < 1.5 ? 0 : 0.12);
      if (t > 1.0 && t < 1.8) {
        ctx.save();
        ctx.globalAlpha = sm(1.0, 1.15, t) * (1 - sm(1.6, 1.8, t));
        G.hud.text(ctx, '！', x0 - 20, y0 - 104, 30, '#ffe45a', 'center');
        ctx.restore();
      }
      return;
    }
    const u = t - 3.5;
    const x = x0 + 36 + u * 260 + u * u * 120;
    const y = y0 - u * 220 + u * u * 30;
    cub(ctx, x, y, 1.05 + u * 0.25, -1, { state: 'fall', t, p: 0 }, u * 3.2);
  }

  // 第三鏡：午睡特寫
  function shotNap(ctx, t) {
    const C = { x: lerp(640, 740, sm(0, 7, t)), y: lerp(372, 440, sm(0, 7, t)), z: lerp(1.0, 1.14, sm(0, 7, t)) };
    sky(ctx, SKY_DAWN, [900, 300, 600, '255,238,200', 0.7]);
    cam(ctx, C, 0.25, () => {
      band(ctx, 'bandFar', t * 6, 350, 80);
    });
    cam(ctx, C, 0.5, () => blit(ctx, 'napBack'));
    // 景深：後景蓋一層淡霧
    ctx.fillStyle = 'rgba(255,246,230,0.22)';
    ctx.fillRect(0, 0, W(), H());
    cam(ctx, C, 1, () => {
      blit(ctx, 'napTree');
      // 樹上葉子灑下來的光斑
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      [[700, 630, 90, 0], [960, 660, 70, 1], [560, 600, 60, 2], [1080, 610, 50, 3]].forEach(([x, y, r, i]) => {
        const a = 0.22 + Math.sin(t * 1.3 + i * 2) * 0.08;
        ctx.save();
        ctx.translate(x + Math.sin(t * 0.6 + i) * 10, y);
        ctx.scale(1, 0.3);
        ctx.globalAlpha = a;
        ctx.drawImage(glowSpr(LEAVES[i === 3 ? 4 : i].rgb), -r, -r, r * 2, r * 2);
        ctx.restore();
      });
      ctx.restore();
      // 睡覺的小獅子
      const cx = 820;
      const cy = 672;
      const br = Math.sin(t * 2.2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + br * 0.012, 1 - br * 0.02);
      const land = sm(4.6, 5.0, t);
      cub(ctx, 0, 0, 2.3, 1, { state: 'idle', t: 0.05, p: 0, onGround: true }, 0.05 + Math.sin(t * 1.1) * 0.02 + (t > 5 ? Math.max(0, Math.sin((t - 5) * 12)) * 0.03 * (1 - sm(5, 5.6, t)) : 0));
      ctx.restore();
      // 一片花瓣慢慢飄下，停在鼻子上
      const nose = [cx + 60, cy - 88];
      const u = sm(0.8, 5.0, t);
      const px = lerp(cx - 150, nose[0], u) + Math.sin(t * 2.2) * 40 * (1 - u);
      const py = lerp(cy - 460, nose[1], u);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.sin(t * 3) * 0.8 * (1 - land) + 0.4);
      paint(ctx, (p) => p.ellipse(0, 0, 9, 5.5, 0, 0, PI2), '#ffc2d8', { shade: '#f096b8', cel: [0, 2], lw: 2 });
      ctx.restore();
      zzz(ctx, cx + 30, cy - 150, t, 1.3);
      blit(ctx, 'napFront');
    });
    petals(ctx, t, 18, [-40, 40, W() + 80, H() - 60], 0, 5, ['#ffc6dc', '#ffe39a', '#fff6ea']);
    motes(ctx, t, 24, [300, 60, 900, H() - 160], '255,244,200', 3);
    // 從上方灑下的暖光
    glow(ctx, 520, 40, 420, '255,236,170', 0.35);
  }

  // 第六鏡：穿過雲層往下掉
  function shotFall(ctx, t) {
    const reveal = sm(1.4, 5.4, t);
    sky(ctx, [[0, '#6ea6e6'], [0.5, '#a8d2f4'], [1, '#e2f2ff']]);
    // 底下的大地慢慢出現
    const lk = lerp(0.8, 1.05, reveal);
    const ly = lerp(760, 250, reveal);
    ctx.save();
    ctx.translate(640, ly);
    ctx.scale(lk, lk);
    blit(ctx, 'lands', -800, 0);
    // 散落到各地的光
    const tg = [LAND.forest, LAND.sea, LAND.canyon, LAND.snow];
    for (let i = 0; i < 4; i++) {
      const t0 = 3 + i * 0.35;
      const u = cl((t - t0) / 2.2);
      if (u <= 0) continue;
      const [ex, ey] = [tg[i][0] - 800, tg[i][1]];
      const pos = (uu) => [lerp(ex * 0.5, ex, uu), lerp(-240, ey, uu * uu)];
      if (u < 1) comet(ctx, pos, u, i, 6, 1);
      else {
        glow(ctx, ex, ey, 40 + Math.sin(t * 4 + i) * 6, LEAVES[i].rgb, 0.9);
        glow(ctx, ex, ey, 14, '255,255,255', 0.8);
      }
    }
    ctx.restore();
    // 金色心葉往上飄回雲的上面
    if (t > 3.6) {
      const u = cl((t - 3.6) / 2.5);
      comet(ctx, (uu) => [lerp(1000, 1160, uu), lerp(520, -40, uu)], u, 4, 6, 1 - sm(0.8, 1, u));
    }
    // 往上衝的雲
    const clouds = ['puffC', 'puffB', 'puffA'];
    const n = 16;
    const drawPuffs = (front) => {
      for (let i = 0; i < n; i++) {
        const d = 0.4 + hash(i * 3.7) * 1.3;
        const isFront = d > 1.25;
        if (isFront !== front) continue;
        const life = 1 - sm(1.2, 4.2, t) * (0.55 + hash(i * 1.9) * 0.6);
        if (life <= 0.05) continue;
        const span = H() + 500;
        const k = (t * (0.25 + d * 0.45) + hash(i * 6.1)) % 1;
        const y = H() + 250 - k * span;
        let x = hash(i * 8.3) * (W() + 200) - 100;
        if (isFront && Math.abs(x - 640) < 280) x += x < 640 ? -280 : 280;
        const id = clouds[Math.min(2, Math.floor(d / 0.6))];
        ctx.save();
        ctx.globalAlpha = (isFront ? 0.85 : 0.95) * Math.min(1, life * 1.4);
        blitAt(ctx, id, x, y, 0.5 + d * 0.5);
        ctx.restore();
      }
    };
    drawPuffs(false);
    // 速度線
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const k = (t * (1.8 + hash(i) * 1.4) + hash(i * 4.4)) % 1;
      let x = hash(i * 2.9) * (W() - 500);
      if (x > W() / 2 - 250) x += 500;
      const y = H() + 100 - k * (H() + 300);
      const len = 50 + hash(i * 5.3) * 90;
      ctx.globalAlpha = 0.5 * Math.sin(k * Math.PI);
      ctx.lineWidth = 2 + hash(i * 7.1) * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + len);
      ctx.stroke();
    }
    ctx.restore();
    // 小獅子（翻滾，但是很可愛）
    const cx = 640 + Math.sin(t * 1.3) * 60;
    const cy = 330 + Math.sin(t * 2.1) * 16 - reveal * 30;
    const rot = Math.sin(t * 1.7) * 0.6 + t * 0.9;
    glow(ctx, cx, cy - 40, 120, '255,250,230', 0.25);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const k = (t * 2.2 + i / 5) % 1;
      const x = cx - 70 + i * 34;
      const y = cy - 40 - k * 120;
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 6, y - 20, x, y - 44);
      ctx.stroke();
    }
    ctx.restore();
    const hurt = Math.floor(t / 0.9) % 3 === 1;
    cub(ctx, cx, cy + 40, 2.1, 1, { state: hurt ? 'hurt' : 'fall', t, p: 0 }, rot);
    // 飛出去的淚珠
    const tk = (t * 1.4) % 1;
    ctx.save();
    ctx.globalAlpha = Math.sin(tk * Math.PI) * 0.9;
    paint(ctx, (p) => p.ellipse(cx - 30 - tk * 40, cy - 90 - tk * 70, 4, 6, 0.4, 0, PI2), '#bfe6ff', { lw: 1.6 });
    ctx.restore();
    drawPuffs(true);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.3 * (1 - sm(0, 0.8, t))).toFixed(3) + ')';
    ctx.fillRect(0, 0, W(), H());
  }

  // 第七、八鏡：陌生的森林
  function shotWake(ctx, t, title) {
    const up = title ? 1 : sm(3.0, 6.6, t);
    const C = title
      ? { x: 640, y: 360, z: lerp(1.0, 1.04, sm(0, 6, t)) }
      : { x: lerp(560, 640, up), y: lerp(530, 360, up), z: lerp(1.5, 1.0, up) };
    sky(ctx, [[0, '#8fcaf6'], [0.35, '#cfeaff'], [0.7, '#fff6dc'], [1, '#fff0c8']]);
    // 天上的神殿，正在往下沉
    const tt = title ? 8 + t : t;
    cam(ctx, C, 0.15, () => {
      const sink = tt * 1.6;
      const x = 860;
      const y = 138 + sink;
      glow(ctx, x, y - 20, 90, '255,226,150', 0.55 + Math.sin(tt * 2) * 0.1);
      blitAt(ctx, 'isle', x, y, 0.2, -0.05 - tt * 0.002);
      ctx.fillStyle = 'rgba(150,120,100,0.8)';
      for (let i = 0; i < 6; i++) {
        const k = (tt * 0.2 + i / 6) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.fillRect(x - 40 + hash(i) * 80, y + 30 + k * 60, 2.5, 2.5);
      }
      ctx.globalAlpha = 1;
    });
    cam(ctx, C, 0.35, () => blit(ctx, 'fwFar'));
    cam(ctx, C, 0.65, () => blit(ctx, 'fwMid'));
    rays(ctx, 860, -40, 2.1, [[-120, 40, 0.5], [-40, 70, 0.6], [60, 50, 0.45], [150, 90, 0.35]], 900, '255,246,210', 0.5 + Math.sin(t * 0.9) * 0.1);
    cam(ctx, C, 1, () => {
      blit(ctx, 'fwFront');
      const x = 560;
      const y = 606;
      if (title) {
        cub(ctx, x, y, 1.9, 1, { state: 'idle', t: t + 1, p: 0, onGround: true }, -0.1);
      } else if (t < 2.5) {
        // 側躺，眨眼
        const open = (t > 1.3 && t < 1.55) || t > 1.85;
        const br = Math.sin(t * 2.2) * 0.02;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1.9, 1.9);
        A.groundShadow(ctx, 0, 0, 30);
        ctx.translate(-4, -14);
        ctx.rotate(-Math.PI / 2 * 0.9 + (t > 1.85 ? sm(1.85, 2.5, t) * 0.25 : 0));
        ctx.translate(0, 14);
        ctx.scale(1, 1 + br);
        A.drawLion(ctx, 0, 0, 1, { state: 'idle', t: open ? 1.0 : 0.05, p: 0 });
        ctx.restore();
      } else {
        // 跳起來、抬頭看
        const h = t < 3.0 ? Math.sin(((t - 2.5) / 0.5) * Math.PI) * 30 : 0;
        const st = t < 3.0 ? { state: 'jump', t, p: 0 } : { state: 'idle', t, p: 0, onGround: true };
        const look = -0.14 * sm(3.4, 4.2, t);
        cub(ctx, x, y - h, 1.9, 1, st, look);
        if (t > 4.2 && t < 6.4) {
          ctx.save();
          ctx.globalAlpha = sm(4.2, 4.5, t) * (1 - sm(6.0, 6.4, t));
          G.hud.text(ctx, '…？', x + 44, y - 170 - sm(4.2, 4.5, t) * 8, 26, '#ffffff', 'center');
          ctx.restore();
        }
      }
      // 小獅子前面的草
      grassTuft(ctx, x - 60, y + 14, 1.3);
      grassTuft(ctx, x + 70, y + 16, 1.1);
    });
    // 蝴蝶
    for (let i = 0; i < 2; i++) {
      const k = t * 0.12 + i * 0.5;
      const bx = 300 + ((k * 900) % 900) + Math.sin(t * 1.5 + i) * 40;
      const by = 470 + Math.sin(t * 2 + i * 3) * 50 - i * 60;
      const f = Math.abs(Math.sin(t * 12 + i));
      cam(ctx, C, 0.9, () => {
        ctx.save();
        ctx.translate(bx, by);
        const col = i ? '#ffd35a' : '#9ad6ff';
        paint(ctx, (p) => {
          p.ellipse(-5, -3, 6, 5 * f + 1, -0.4, 0, PI2);
          p.moveTo(11, -3);
          p.ellipse(5, -3, 6, 5 * f + 1, 0.4, 0, PI2);
        }, col, { lw: 1.4 });
        ctx.restore();
      });
    }
    motes(ctx, t, 34, [500, 100, 600, H() - 200], '255,250,210', 4);
    petals(ctx, t, 10, [-40, 40, W() + 80, H() - 60], 0, 9, ['#9ad886', '#c8e89a']);
    if (title) titleCard(ctx, t);
  }

  function titleCard(ctx, t) {
    // 暗角，讓字浮出來
    const v = sm(0.2, 1.6, t) * 0.62;
    const g = ctx.createRadialGradient(640, 360, 120, 640, 360, 760);
    g.addColorStop(0, 'rgba(20,14,30,' + (v * 0.55).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(20,14,30,' + v.toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W(), H());
    const a = sm(0.6, 1.8, t);
    const text = IX.text || '';
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(640, 300 - (1 - a) * 10);
    glow(ctx, 0, 0, 260, '255,220,150', 0.28 * a);
    ctx.font = 'bold 44px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(40,22,12,0.75)';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = '#fff4d8';
    ctx.fillText(text, 0, 0);
    ctx.restore();
    // 五片葉子一片一片亮起
    for (let i = 0; i < 5; i++) {
      const k = sm(1.6 + i * 0.28, 2.1 + i * 0.28, t);
      if (k <= 0) continue;
      const x = 640 + (i - 2) * 72;
      const y = 376 - (1 - k) * 12;
      ctx.save();
      ctx.globalAlpha = k;
      glow(ctx, x, y, 42, LEAVES[i].rgb, 0.7 + Math.sin(t * 2.5 + i) * 0.2);
      leafGem(ctx, x, y, i === 4 ? 22 : 18, LEAVES[i].col, Math.sin(t * 1.4 + i) * 0.12);
      ctx.restore();
      if (k < 1) sparkle(ctx, x, y, 22 * (1 - k) + 4, 1 - k, '#ffffff');
    }
    const b = sm(3.4, 4.4, t);
    if (b > 0) {
      ctx.save();
      ctx.globalAlpha = b * 0.9;
      G.hud.text(ctx, '— 小獅子的冒險 —', 640, 428, 20, '#ffe6b0', 'center');
      ctx.restore();
    }
  }

  // 第零鏡：一百年前，王座廳
  // 掉下來的石片：[相對獅子的位置 x, y, 大小, 何時剝落]
  const TH_BITS = [];
  for (let i = 0; i < 18; i++) {
    const onMane = i < 12;
    TH_BITS.push({
      x: (hash(i * 3.3 + 1) - 0.5) * (onMane ? 62 : 90),
      y: onMane ? -58 - hash(i * 5.1 + 2) * 16 : -54 - hash(i * 5.1 + 2) * 6,
      r: (onMane ? 6 : 6) + hash(i * 7.7 + 3) * 4,
      at: onMane ? 1.5 + hash(i * 2.9 + 4) * 1.7 : 2.1 + hash(i * 2.9 + 4) * 0.9,
      vx: (hash(i * 9.1 + 5) - 0.5) * 220,
      vy: -60 - hash(i * 4.4 + 6) * 150,
      land: 596 + hash(i * 6.6 + 7) * 52,
      spin: (hash(i * 8.8 + 8) - 0.5) * 12,
      onMane,
    });
  }
  function stoneBit(ctx, x, y, r, rot, i, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (a != null) ctx.globalAlpha *= a;
    paint(ctx, (p) => {
      for (let k = 0; k < 6; k++) {
        const an = (k / 6) * PI2;
        const rr = r * (0.65 + hash(i * 11 + k) * 0.5);
        if (k) p.lineTo(Math.cos(an) * rr, Math.sin(an) * rr * 0.8);
        else p.moveTo(Math.cos(an) * rr, Math.sin(an) * rr * 0.8);
      }
      p.closePath();
    }, STONE, { shade: STONE_S, cel: [r * 0.35, r * 0.3], lw: Math.max(1.2, r * 0.18), line: TH_LINE });
    ctx.restore();
  }
  const G_FALL = 1500;
  function thBits(ctx, t, lift, shake, attachedOnly) {
    const S = TH.s;
    TH_BITS.forEach((b, i) => {
      const x0 = TH.x + (b.x + shake) * S;
      const y0 = TH.y + (b.y + (b.onMane ? lift : 0)) * S;
      const r = b.r * S;
      if (t < b.at) {
        if (attachedOnly) stoneBit(ctx, x0, y0, r, i * 1.7, i);
        return;
      }
      if (attachedOnly) return;
      const tau = t - b.at;
      const tl = (-b.vy + Math.sqrt(b.vy * b.vy + 2 * G_FALL * (b.land - y0))) / G_FALL;
      if (tau < tl) {
        stoneBit(ctx, x0 + b.vx * tau, y0 + b.vy * tau + 0.5 * G_FALL * tau * tau, r, i * 1.7 + b.spin * tau, i);
        return;
      }
      // 摔碎：幾塊小碎片噴開＋一團灰
      const ts = tau - tl;
      if (ts > 1.4) return;
      const lx = x0 + b.vx * tl;
      haze(ctx, lx, b.land - 8, 26 + ts * 70, '150,162,186', 0.4 * (1 - sm(0, 1.4, ts)));
      if (ts > 0.7) return;
      for (let j = 0; j < 4; j++) {
        const an = -Math.PI * (0.1 + 0.8 * hash(i * 5 + j));
        const sp = 70 + hash(i * 7 + j) * 150;
        const sx = lx + Math.cos(an) * sp * ts;
        const sy = Math.min(b.land + 6, b.land + Math.sin(an) * sp * ts + 0.5 * 1100 * ts * ts);
        stoneBit(ctx, sx, sy, r * 0.38, j + ts * 9, i * 4 + j, 1 - sm(0.35, 0.7, ts));
      }
    });
  }

  function shotThrone(ctx, t) {
    const push = sm(0, 7.8, t);
    const C = { x: lerp(650, 680, push), y: lerp(372, 356, push), z: lerp(1.0, 1.1, push) };
    ctx.fillStyle = '#0b0e16';
    ctx.fillRect(0, 0, W(), H());
    cam(ctx, C, 0.7, () => blit(ctx, 'thHall'));
    // 高窗斜射進來的冷光
    rays(ctx, 330, 30, 0.66, [[-40, 34, 0.5], [0, 60, 0.7], [56, 40, 0.45]], 760, '170,196,240', 0.3 + Math.sin(t * 0.7) * 0.05);
    // 動作
    const rise = sm(1.9, 3.1, t);
    const shake = t > 1.2 && t < 3.0 ? Math.sin(t * 57) * 0.9 * sm(1.2, 1.6, t) * (1 - sm(2.6, 3.0, t)) : 0;
    const lift = -Math.sin(rise * Math.PI) * 9;
    const bob = -3 * sm(1.0, 1.8, t) + (rise > 0 ? 3 * sm(1.8, 3.4, t) : 0);
    const tw = t - 3.9;
    let d = TH.d;
    let wa = 0;
    let ph = 0;
    if (tw > 0) {
      const v = 1.35;
      const dist = tw < 0.7 ? (v * tw * tw) / 1.4 : v * (tw - 0.35);
      d = TH.d + dist;
      wa = sm(0, 0.6, tw);
      ph = dist * 8.5;
    }
    const X = lerp(TH.X0, -0.42, sm(1.2, 2.6, d));
    const hgt = 0.2 * (1 - sm(1.5, 2.15, d));
    const lx = TH.vx + (400 * X) / d;
    const ly = TH.hz + (400 * (1 - hgt)) / d + (tw > 0 ? -Math.abs(Math.sin(ph)) * 3 * wa * (TH.d / d) : 0);
    const ls = (TH.s * TH.d) / d;
    const fog = sm(1.4, 5.4, d) * 0.82;
    const fade = 1 - sm(4.6, 6.0, d) * 0.85;
    const fl = lerp(1, 0.7, sm(1.15, 3, d));
    // 空了的石殼：先畫內壁，獅子在它裡面／前面走開
    cam(ctx, C, 1, () => blit(ctx, 'thShellB'));
    cam(ctx, C, fl, () => {
      // 他身上的金色，是這裡唯一的暖色
      glow(ctx, lx, ly + (-112 + lift) * ls, 150 * ls, '255,196,96', 0.2 * fade * (1 - fog));
      const m0 = A.mode;
      const mc = A.modeColor;
      const ma = A.modeAmt;
      if (fog > 0.01) {
        A.mode = 'tint';
        A.modeColor = '#323b4e';
        A.modeAmt = fog;
      }
      try {
        ctx.save();
        ctx.globalAlpha = fade;
        thWithLion(ctx, lx + shake * ls, ly + lift * ls, ls, () => goldLion(ctx, t, rise, ph, wa, bob));
        ctx.restore();
      } finally {
        A.mode = m0;
        A.modeColor = mc;
        A.modeAmt = ma;
      }
    });
    cam(ctx, C, 1, () => {
      blit(ctx, 'thShell');
      // 石殼上的新裂縫
      const ca = sm(1.2, 2.2, t);
      if (ca > 0) {
        ctx.save();
        ctx.translate(TH.x, TH.y);
        ctx.scale(TH.s, TH.s);
        ctx.globalAlpha = ca;
        ctx.lineJoin = 'round';
        [[[-4, -62], [-8, -48], [-2, -38], [-10, -26]], [[26, -56], [32, -44], [28, -34]], [[-30, -56], [-36, -42], [-32, -30]], [[16, -62], [20, -50], [14, -42], [22, -30]]].forEach((ln) => {
          [['rgba(200,215,240,0.4)', 1.3], [TH_LINE, 0.6]].forEach(([col, w]) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = w;
            ctx.beginPath();
            ln.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.stroke();
          });
        });
        ctx.restore();
      }
      // 還黏在他身上的石片
      thBits(ctx, t, lift, shake, true);
      blit(ctx, 'thThrone');
      // 石片落下、碎掉
      thBits(ctx, t, lift, shake, false);
      // 落下的細沙
      if (t > 1.3 && t < 4.2) {
        const sa = sm(1.3, 1.8, t) * (1 - sm(3.4, 4.2, t));
        ctx.fillStyle = 'rgba(190,200,220,' + (0.8 * sa).toFixed(3) + ')';
        for (let i = 0; i < 26; i++) {
          const k = (t * (0.9 + hash(i * 1.7) * 0.8) + hash(i * 3.9)) % 1;
          const x = TH.x + (hash(i * 5.3) - 0.5) * 180;
          const y = 350 + k * 280;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    });
    // 光裡的灰塵
    motes(ctx, t, 44, [300, 60, 560, 560], '196,210,238', 17);
    blit(ctx, 'thVig');
  }

  const SHOTS = {
    throne: { draw: shotThrone, dur: 7.8, trans: 'black', out: 'black' },
    sky: { draw: (c, t) => shotSky(c, t, false), dur: 7.5, trans: 'fade' },
    tree: { draw: (c, t) => shotTree(c, t, false), dur: 7.5, trans: 'fade' },
    nap: { draw: shotNap, dur: 7, trans: 'fade' },
    wind: { draw: (c, t) => shotTree(c, t, true), dur: 6.2, trans: 'quick' },
    scatter: { draw: (c, t) => shotSky(c, t, true), dur: 6.2, trans: 'flash' },
    fall: { draw: shotFall, dur: 6.8, trans: 'quick' },
    wake: { draw: (c, t) => shotWake(c, t, false), dur: 8, trans: 'black' },
    title: { draw: (c, t) => shotWake(c, t, true), dur: 6.5, trans: 'fade' },
  };
  const TRANS_T = { fade: 1.1, quick: 0.5, flash: 1.0, black: 1.8 };
  // 音效提示：[鏡頭, 秒, 音效或函式]
  const CUES = [
    ['throne', 0.05, () => G.music.stop(1.6)],
    ['throne', 1.25, 'rockHit'],
    ['throne', 1.95, 'slam'],
    ['throne', 2.3, 'rockHit'],
    ['throne', 2.85, 'rockHit'],
    ['throne', 3.3, 'land'],
    ['throne', 4.5, 'land'],
    ['throne', 5.2, 'land'],
    ['sky', 0.05, () => G.music.current() || G.music.play('title')],
    ['wind', 0.2, 'heavyWind'],
    ['wind', 1.0, 'jump'],
    ['wind', 2.0, 'spiritShot'],
    ['wind', 2.56, 'spiritShot'],
    ['wind', 3.12, 'spiritShot'],
    ['wind', 3.5, 'heavyWind'],
    ['scatter', 0.1, 'heavyWind'],
    ['scatter', 0.4, 'sweep'],
    ['fall', 0.05, 'sweep'],
    ['wake', 0.3, () => G.music.play('forest')],
    ['wake', 2.5, 'jump'],
    ['title', 1.6, 'quest'],
  ];
  const shotOf = (page) => SHOTS[page && page.shot] || SHOTS.sky;

  function drawShot(ctx, idx, t) {
    const pages = G.data.story.intro;
    const page = pages[Math.max(0, Math.min(idx, pages.length - 1))];
    ctx.save();
    try {
      shotOf(page).draw(ctx, t);
    } finally {
      ctx.restore();
    }
  }

  // 預先準備接下來兩頁用到的圖層（每幀最多一張），用完的釋放
  function prepare(idx, force) {
    const pages = G.data.story.intro;
    const want = {};
    for (let i = idx; i < Math.min(pages.length, idx + 2); i++) (SHOT_LAYERS[pages[i].shot] || []).forEach((id) => (want[id] = true));
    for (let i = idx + 2; i < pages.length; i++) (SHOT_LAYERS[pages[i].shot] || []).forEach((id) => (want[id] = want[id] || 'later'));
    if (!(IX.trans && IX.trans.need)) for (const id in IX.L) if (!want[id]) delete IX.L[id];
    if (!IX.ready) return;
    for (const id in want) {
      if (want[id] === true && !IX.L[id]) {
        layer(id);
        if (!force) return;
      }
    }
  }

  function caption(ctx, text, t, fade) {
    const a = sm(0.35, 1.2, t) * (fade == null ? 1 : fade);
    if (a <= 0) return;
    const y = H() - BAR / 2 - 2 + (1 - a) * 6;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = 'bold 25px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,190,90,0.45)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#fff3da';
    ctx.fillText(text, W() / 2, y);
    ctx.restore();
  }

  function frame(ctx, idx, n, gt) {
    const b = BAR * sm(0, 1.4, gt);
    ctx.fillStyle = '#07050b';
    ctx.fillRect(0, 0, W(), b);
    ctx.fillRect(0, H() - b, W(), b);
    // 金色細線
    const g = ctx.createLinearGradient(0, 0, W(), 0);
    g.addColorStop(0, 'rgba(232,184,74,0)');
    g.addColorStop(0.5, 'rgba(232,184,74,0.55)');
    g.addColorStop(1, 'rgba(232,184,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, b - 1, W(), 1);
    ctx.fillRect(0, H() - b, W(), 1);
    // 頁數小點與提示
    const ha = sm(0.8, 2, gt);
    ctx.save();
    ctx.globalAlpha = ha;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i === idx ? '#ffd35a' : i < idx ? 'rgba(255,211,90,0.45)' : 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(28 + i * 16, b / 2, i === idx ? 4 : 3, 0, PI2);
      ctx.fill();
    }
    ctx.font = '13px ' + A.FONT;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('按任意鍵繼續 · Esc 跳過', W() - 22, b / 2);
    ctx.restore();
  }

  const S = (G.scenes = {
    introIdx: 0,
    introT: 0,
    titleT: 0,
    titleEl: null,

    toTitle() {
      G.scene = 'title';
      this.titleSave = null;
      this.titleT = 0;
      G.ui.closeAll();
      G.hud.reset();
      G.music.play('title');
      this.showTitle();
    },

    showTitle() {
      this.hideTitle();
      const el = document.createElement('div');
      el.className = 'title-screen';
      const save = G.save.peek();
      let cont = '';
      if (save && save.player) {
        const m = save.pos && G.data.maps[save.pos.map] ? G.data.maps[save.pos.map].name : '營地';
        cont = '<button class="primary big" data-t="continue">繼續遊戲<small>Lv.' + save.player.level + ' · ' + m + ' · ' + U.fmtTime(save.player.playTime || 0) + '</small></button>';
      }
      const old = !save && G.save.outdated() ? '<div class="old-save">遊戲已經大改版（等級、怪物、委託都重新設計），舊存檔無法繼續，請開新遊戲。</div>' : '';
      el.innerHTML = old +
        '<div class="logo"><div class="name">小獅子的冒險</div><div class="sub">一隻小獅子，往天空的家爬回去</div></div>' +
        '<div class="tbtns">' + cont +
        '<button class="' + (cont ? '' : 'primary ') + 'big" data-t="new">' + (cont ? '新遊戲' : '開始冒險') + '</button>' +
        '<button data-t="keys">按鍵設定</button><button data-t="demo">試玩模式（所有形態與技能）</button></div>' +
        '<div class="hint">方向鍵移動 · ' + G.input.label('jump') + ' 跳躍 · ' + G.input.label('attack') + ' 攻擊 · ↑ 爬繩／對話／傳送門 · Esc 選單</div>' +
        '<div class="ver">M1 試玩版' + (G.debug ? ' · 除錯模式' : '') + '</div>';
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-t]');
        if (!b) return;
        G.audio.unlock();
        G.audio.play('ui');
        const t = b.getAttribute('data-t');
        if (t === 'continue') this.continueGame();
        else if (t === 'new') {
          if (save && !b.classList.contains('confirm')) {
            b.classList.add('confirm');
            b.innerHTML = '再按一次：覆蓋目前存檔';
            return;
          }
          G.save.clear();
          this.newGame();
        } else if (t === 'keys') {
          G.ui.open('keys');
        } else if (t === 'demo') {
          G.demo.start();
        }
      });
      document.getElementById('ui').appendChild(el);
      this.titleEl = el;
    },

    hideTitle() {
      if (this.titleEl) this.titleEl.remove();
      this.titleEl = null;
    },

    newGame() {
      G.tutorial.active = false;
      this.hideTitle();
      G.ui.closeAll();
      G.player.newGame();
      G.quests.reset();
      G.world.resetProgress();
      G.hud.reset();
      G.scene = 'intro';
      this.introIdx = 0;
      this.introT = 0;
    },

    continueGame() {
      G.tutorial.active = false;
      const data = G.save.peek();
      if (!data) return this.newGame();
      this.hideTitle();
      G.hud.reset();
      let r;
      try {
        r = G.save.apply(data);
      } catch (e) {
        console.error(e);
        G.hud.toast('存檔讀取失敗，從營地開始', '#ff9a9a');
        r = { map: '1-1', entry: 'camp' };
      }
      this.startPlay(r.map, r.entry);
    },

    startPlay(mapId, entry) {
      G.scene = 'play';
      G.world.fade = 1;
      G.world.fadeDir = -1;
      G.world.load(mapId, entry);
      G.save.write();
    },

    // ── 開場（畫面與鏡頭在上面的「開場動畫」區） ──
    introPage() {
      const p = G.data.story.intro;
      return p[Math.max(0, Math.min(this.introIdx, p.length - 1))];
    },

    // 測試用：直接跳到第 i 頁的第 t 秒
    introGo(i, t) {
      this.introIdx = i;
      this.introT = t || 0;
      IX.trans = null;
      IX.gt = Math.max(IX.gt || 0, 3);
    },

    updateIntro(dt) {
      if (!IX.started) {
        IX.started = true;
        IX.gt = 0;
        IX.trans = null;
      }
      const t0 = this.introT;
      this.introT += dt;
      IX.gt += dt;
      const shot = this.introPage().shot;
      CUES.forEach(([s, at, what]) => {
        if (s !== shot || t0 >= at || this.introT < at) return;
        if (typeof what === 'function') what();
        else G.audio.play(what);
      });
      if (IX.gt > 0.3) prepare(this.introIdx);
      const I = G.input;
      if (I.escPressed) return this.endIntro();
      const dur = shotOf(this.introPage()).dur;
      if (((I.anyPressed || this.clicked) && this.introT > 0.6) || this.introT > dur) this.nextIntroPage();
      this.clicked = false;
    },

    nextIntroPage() {
      const pages = G.data.story.intro;
      const from = this.introIdx;
      const fromT = this.introT;
      this.introIdx++;
      this.introT = 0;
      if (this.introIdx >= pages.length) return this.endIntro();
      const type = shotOf(pages[from]).out || shotOf(pages[this.introIdx]).trans;
      IX.trans = { type, from, fromT, need: true, d: TRANS_T[type] || 1, text: pages[from].shot === 'title' ? '' : pages[from].text };
    },

    endIntro() {
      IX.L = {};
      IX.snap = null;
      IX.trans = null;
      IX.started = false;
      IX.ready = false;
      G.tutorial.active = true; // 先標記，進地圖時的章節劇情會等教學結束再出現
      this.startPlay('1-1', 'start');
      G.tutorial.start();
    },

    drawIntro(ctx) {
      const pages = G.data.story.intro;
      const idx = Math.min(this.introIdx, pages.length - 1);
      const page = pages[idx];
      const t = this.introT;
      const WW = G.W;
      const HH = G.H;
      if (!IX.ready) {
        IX.k = ctx.getTransform ? ctx.getTransform().a : 1;
        IX.ready = true;
      }
      IX.text = page.text;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, WW, HH);
      const tr = IX.trans;
      if (tr && tr.need) {
        // 換頁的那一幀：先畫一次上一頁，存成快照，之後讓它淡出
        drawShot(ctx, tr.from, tr.fromT);
        const cv = ctx.canvas;
        if (!IX.snap || IX.snap.width !== cv.width || IX.snap.height !== cv.height) IX.snap = newCv(cv.width, cv.height);
        const sx = IX.snap.getContext('2d');
        sx.clearRect(0, 0, cv.width, cv.height);
        sx.drawImage(cv, 0, 0);
        tr.need = false;
      }
      drawShot(ctx, idx, t);
      if (tr && !tr.need) {
        if (t >= tr.d) IX.trans = null;
        else {
          const cw = ctx.canvas.width;
          const ch = ctx.canvas.height;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (tr.type === 'black') {
            if (t < 0.6) {
              ctx.drawImage(IX.snap, 0, 0);
              ctx.fillStyle = 'rgba(0,0,0,' + sm(0, 0.6, t).toFixed(3) + ')';
            } else ctx.fillStyle = 'rgba(0,0,0,' + (1 - sm(0.6, tr.d, t)).toFixed(3) + ')';
            ctx.fillRect(0, 0, cw, ch);
          } else if (tr.type === 'flash') {
            ctx.globalAlpha = 1 - sm(0, 0.12, t);
            ctx.drawImage(IX.snap, 0, 0);
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(255,252,240,' + (0.95 * (1 - sm(0.06, tr.d, t))).toFixed(3) + ')';
            ctx.fillRect(0, 0, cw, ch);
          } else {
            ctx.globalAlpha = 1 - sm(0, tr.d, t);
            ctx.drawImage(IX.snap, 0, 0);
          }
          ctx.restore();
        }
      }
      // 開頭從黑畫面淡入；最後一頁結束前淡出（進遊戲時地圖再淡入）
      let black = idx === 0 ? 1 - sm(0.1, 1.8, IX.gt) : 0;
      const dur = shotOf(page).dur;
      if (idx === pages.length - 1) black = Math.max(black, sm(dur - 1.1, dur - 0.1, t));
      if (black > 0) {
        ctx.fillStyle = 'rgba(0,0,0,' + black.toFixed(3) + ')';
        ctx.fillRect(0, 0, WW, HH);
      }
      frame(ctx, idx, pages.length, IX.gt);
      if (tr && tr.text && t < 0.5) caption(ctx, tr.text, 2, 1 - t / 0.5);
      if (page.shot !== 'title') caption(ctx, page.text, t);
    },

    // ── 標題背景 ──
    drawTitle(ctx, dt) {
      this.titleT += dt;
      const map = G.data.maps['1-2'];
      if (!map._theme) A.prepareMap(map);
      const cam = { x: this.titleT * 30, y: map.h - G.H };
      A.drawBackground(ctx, map, cam, this.titleT);
      ctx.fillStyle = '#7bbf4a';
      ctx.fillRect(0, G.H - 140, G.W, 14);
      ctx.fillStyle = '#9a6a42';
      ctx.fillRect(0, G.H - 128, G.W, 128);
      // 星楓樹：存檔裡拿到幾片葉子，樹上就亮幾盞
      const save = this.titleSave || (this.titleSave = G.save.peek() || {});
      const got = (save.world && save.world.flags && save.world.flags.leaves) || {};
      if (save.world && save.world.flags && save.world.flags.starleaf1 && !save.world.flags.leaves) got[1] = true;
      this.drawStarTree(ctx, G.W - 190, G.H - 140, got, this.titleT);
      const leaves = [1, 2, 3, 4, 5].map((ch) => (got[ch] ? G.data.story.chapters[ch].leaf.color : null));
      ctx.save();
      ctx.translate(G.W / 2 - 250, G.H - 140);
      ctx.scale(2, 2);
      A.drawLion(ctx, 0, 0, 1, { state: 'walk', t: this.titleT, p: 0, onGround: true, form: (save.player && save.player.form) || 'base', leaves });
      ctx.restore();
      [['snail', 1, 380, 1.6], ['mushroom', 1, 520, 1.6], ['sprite', 2, 250, 1.5]].forEach(([art, stage, dx, sc], i) => {
        const m = { def: { art, stage, name: '' }, x: G.W / 2 + dx, y: G.H - 140, dir: -1, t: this.titleT + i, w: 40, h: 40, scale: sc, onGround: true, vy: 0, hurtT: 0, hurtFlash: 0, dead: false, deadT: 0 };
        A.drawMonster(ctx, m);
      });
      A.drawAtmosphere(ctx, map, cam, this.titleT);
    },

    drawStarTree(ctx, x, y, got, t) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = A.c('#6b4a30');
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.quadraticCurveTo(-8, -120, -40, -210);
      ctx.lineTo(-26, -214);
      ctx.quadraticCurveTo(4, -150, 8, -200);
      ctx.lineTo(20, -196);
      ctx.quadraticCurveTo(14, -110, 22, 0);
      ctx.closePath();
      ctx.fill();
      const n = Object.keys(got).length;
      const green = n >= 5 ? '#ffb8d8' : '#5f9a52';
      A.shape(ctx, (c) => {
        [[-70, -230, 60], [0, -270, 70], [70, -226, 58], [-30, -200, 54], [40, -190, 50]].forEach(([cx, cy, r]) => { c.moveTo(cx + r, cy); c.arc(cx, cy, r, 0, Math.PI * 2); });
      }, green, n >= 5 ? '#e890b8' : '#4a7e40', { noStroke: true, hl: false });
      const spots = [[-70, -240], [60, -236], [-20, -290], [30, -200], [0, -250]];
      [1, 2, 3, 4, 5].forEach((ch, i) => {
        const [lx, ly] = spots[i];
        const on = got[ch];
        const col = G.data.story.chapters[ch].leaf.color;
        if (on) {
          const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 34);
          g.addColorStop(0, 'rgba(255,255,230,0.9)');
          g.addColorStop(1, 'rgba(255,255,200,0)');
          ctx.fillStyle = g;
          ctx.globalAlpha = 0.7 + Math.sin(t * 2 + i) * 0.2;
          ctx.beginPath();
          ctx.arc(lx, ly, 34, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.save();
        ctx.translate(lx, ly + Math.sin(t * 1.5 + i) * 2);
        ctx.globalAlpha = on ? 1 : 0.35;
        A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, 13), on ? col : '#3e5a36', null, { lw: 2, hl: false });
        ctx.restore();
      });
      ctx.restore();
    },
  });

  document.addEventListener('mousedown', () => {
    if (G.story.cer && G.story.cer.t > 5) G.story.clicked = true;
    if (G.scene === 'intro') S.clicked = true;
  });
})();
