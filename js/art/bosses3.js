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

  // ───────── 離屏快取：不隨時間變的大塊（身體、臉、鹿角、鐘、光環、錶環）畫一次就重複貼 ─────────
  // raw＝不經過 A.c() 的純效果圖（光環、錶環），閃白、染色時不用重畫。
  // key 包含：零件名、裝置上的縮放（0.25 一級）、受擊閃白／殘影染色的模式，所以閃白、染色也對。
  const SPR = new Map();
  function sprite(key, s, x0, y0, w, h, fn, raw) {
    const q = clamp(Math.round(s * 4) / 4, 0.5, 3);
    const md = A.mode && !raw ? A.mode + (A.mode === 'tint' ? A.modeColor : '') + ((A.modeAmt || 0) * 4).toFixed(0) : '';
    const k = key + '|' + q + '|' + md;
    let c = SPR.get(k);
    if (!c) {
      if (SPR.size > 90) SPR.delete(SPR.keys().next().value);
      c = document.createElement('canvas');
      c.width = Math.ceil(w * q) + 4;
      c.height = Math.ceil(h * q) + 4;
      const g = c.getContext('2d');
      g.scale(q, q);
      g.translate(-x0 + 2 / q, -y0 + 2 / q);
      fn(g);
      c._q = q;
      c._x = x0 - 2 / q;
      c._y = y0 - 2 / q;
      SPR.set(k, c);
    }
    return c;
  }
  function blit(ctx, c) {
    ctx.drawImage(c, c._x, c._y, c.width / c._q, c.height / c._q);
  }
  // 目前 ctx 的縮放（快取的解析度用）
  function devScale(ctx) {
    const T = ctx.getTransform();
    return Math.hypot(T.a, T.b);
  }
  function inkWrap(fn, ink) {
    return function (ctx, m) {
      const o = A.OUT;
      A.OUT = ink;
      try {
        return fn(ctx, m);
      } finally {
        A.OUT = o;
      }
    };
  }

  // ═════════════════════════ 霜靈 ═════════════════════════
  // 讓山上的時間停下來的山靈：高大的冰雪神鹿。身體是一層層半透明的冰（深處睡著白角鹿，小鹿的媽媽），
  // 臉像一張冰雕的面具（沒有瞳孔、只有靜靜發光的眼），鹿角是透明的冰枝，枝梢掛著金色小鈴；
  // 角上用注連繩吊著神社的巨鐘。身後：緩緩轉動的雪花幾何光環、極光、地面一圈圈「靜止」的波紋，
  // 還有懸在半空不動的雪花——只有牠出招時才會動起來。
  // 第二階段「裂鐘」：鐘裂開透光、冰變深藍並裂出冷光、光環碎裂加速、雪花再也停不下來。
  const FS = {
    ink: '#1f2350',
    snow: '#ffffff', snowS: '#cfe0ee',
    teal: '#9fe6dc', tealD: '#4b9aa6', indigo: '#262b64', indigoD: '#141838',
    gold: '#e8c66e', goldD: '#a47e36', verm: '#d8473a', vermD: '#94281f',
    rope: '#ecdcaa', ropeS: '#b89a5c',
    bronze: '#3d6a64', bronzeL: '#6f9f90', bronzeD: '#1d3838',
  };
  function fsPal(P2) {
    return P2
      ? { i0: '#e8f3ff', i1: '#aacdf0', i2: '#5379c4', i3: '#1c2462', leg: '#b4d2f2', legS: '#5271b8', far: '#7f9fd6', farS: '#3d5698', glow: '120,230,255', core: '#8ff4ff' }
      : { i0: '#f8fcff', i1: '#d6ecf5', i2: '#8fb9d8', i3: '#39508e', leg: '#dcecf7', legS: '#88a9d0', far: '#9db8da', farS: '#5d78aa', glow: '190,245,240', core: '#e6fffb' };
  }

  // 身體的輪廓（順時針）
  const FS_BODY = [
    [-160, -190, -168, -236, -124, -252, -70, -250],
    [-70, -250, -16, -250, 10, -286, 70, -288],
    [70, -288, 128, -286, 158, -230, 154, -170],
    [154, -170, 150, -122, 112, -100, 66, -104],
    [66, -104, 20, -110, -26, -128, -66, -126],
    [-66, -126, -120, -122, -156, -142, -160, -190],
  ];

  // 冰裡睡著的白角鹿：沒有描邊的淡淡剪影，像凍在冰河深處的光
  function sleepingDoe(g, x, y, s, a) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.globalAlpha *= a;
    g.fillStyle = A.c('#fffaf0');
    g.beginPath();
    g.ellipse(-6, 8, 62, 26, -0.04, 0, TAU);
    g.moveTo(30, -4);
    g.quadraticCurveTo(52, -24, 64, -4);
    g.quadraticCurveTo(52, 8, 34, 12);
    g.closePath();
    g.moveTo(-70, 26);
    g.ellipse(-44, 26, 26, 8, 0, 0, TAU);
    g.moveTo(40, 30);
    g.ellipse(18, 30, 24, 7, 0, 0, TAU);
    g.fill();
    // 頭靠在前腳上
    g.beginPath();
    g.ellipse(64, 8, 17, 12, 0.25, 0, TAU);
    g.ellipse(80, 14, 9, 6, 0.3, 0, TAU);
    g.fill();
    // 背上的小白點、閉著的眼、小角
    g.globalAlpha *= 0.8;
    g.strokeStyle = A.c('#7fb8cc');
    g.lineWidth = 1.4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(60, 5);
    g.quadraticCurveTo(65, 8, 70, 5);
    g.moveTo(56, -2);
    g.quadraticCurveTo(50, -18, 38, -24);
    g.moveTo(51, -12);
    g.lineTo(56, -20);
    g.stroke();
    g.fillStyle = A.c('#dcefff');
    [[-30, -4], [-12, -10], [8, -8], [-44, 6]].forEach(([p, q]) => {
      g.beginPath();
      g.arc(p, q, 3.2, 0, TAU);
      g.fill();
    });
    g.restore();
  }

  // 身體（快取）：半透明冰層＋心口的冷光＋睡著的白角鹿＋切面折射＋背上的積雪
  function fsTorso(g, P2, dead) {
    const C = fsPal(P2);
    const body = smooth(cubPts(FS_BODY, 8));
    const bg = g.createLinearGradient(0, -290, 0, -100);
    [C.i0, C.i1, C.i2, C.i3].forEach((c, i) => bg.addColorStop([0, 0.3, 0.7, 1][i], A.c(c)));
    g.fillStyle = bg;
    g.beginPath();
    body(g);
    g.fill();
    g.save();
    g.beginPath();
    body(g);
    g.clip();
    // 心口的冷光
    if (!dead) glow(g, -44, -176, 150, C.glow, P2 ? 0.7 : 0.6);
    sleepingDoe(g, -52, -176, 1.08, dead ? 0.85 : 0.6);
    // 一層層的冰板（亮面、暗面）
    const facet = (pts, col) => {
      g.fillStyle = col;
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath();
      g.fill();
    };
    const FL = 'rgba(255,255,255,0.26)';
    const FD = P2 ? 'rgba(20,30,110,0.32)' : 'rgba(40,60,140,0.2)';
    facet([[-172, -206], [-112, -264], [-80, -204], [-136, -158]], FL);
    facet([[-14, -264], [66, -298], [46, -214], [-2, -206]], FL);
    facet([[86, -284], [160, -218], [98, -184]], FL);
    facet([[-172, -186], [-136, -158], [-122, -108], [-172, -124]], FD);
    facet([[44, -214], [98, -184], [162, -118], [64, -92], [22, -138]], FD);
    facet([[-122, -108], [-60, -120], [-92, -98]], FD);
    facet([[-80, -204], [-14, -160], [22, -138], [-40, -118], [-110, -130]], 'rgba(160,230,230,0.12)');
    // 切面的稜線（冰的厚度）＋折射的細光
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = P2 ? 'rgba(40,60,150,0.5)' : 'rgba(60,90,160,0.38)';
    g.lineWidth = 1.2;
    g.beginPath();
    [[[-112, -264], [-80, -204], [-136, -158], [-122, -108]], [[-80, -204], [-14, -160], [-2, -206], [-14, -264]], [[-14, -160], [22, -138], [46, -214], [66, -298]], [[22, -138], [64, -94]], [[46, -214], [98, -184], [160, -218]]].forEach((ln) => {
      ln.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    });
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 1.3;
    g.beginPath();
    [[[-108, -258], [-84, -210]], [[-10, -258], [0, -214]], [[70, -290], [50, -222]], [[92, -278], [150, -222]], [[-160, -196], [-132, -164]]].forEach((ln) => {
      g.moveTo(ln[0][0], ln[0][1]);
      g.lineTo(ln[1][0], ln[1][1]);
    });
    g.stroke();
    // 稜鏡般的彩色折射（很淡）
    [['170,255,240', -0.5], ['200,190,255', 0.4]].forEach(([c, o], i) => {
      g.strokeStyle = rgba(c, 0.45);
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(-60 + i * 90 + o * 8, -250);
      g.lineTo(-100 + i * 90 + o * 8, -130);
      g.stroke();
    });
    // 冰河的層理
    g.strokeStyle = P2 ? 'rgba(30,50,150,0.35)' : 'rgba(60,100,180,0.24)';
    [[-134, 2.4], [-120, 3.2], [-106, 2]].forEach(([y0, lw], i) => {
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(-180, y0);
      g.bezierCurveTo(-90, y0 - 16 + i * 4, -20, y0 + 14, 40, y0 - 4);
      g.bezierCurveTo(80, y0 - 14, 120, y0 - 30, 170, y0 - 44);
      g.stroke();
    });
    // 第二階段：冰裡裂出的冷光
    if (P2 && !dead) {
      g.beginPath();
      g.moveTo(-66, -266);
      g.lineTo(-48, -218);
      g.lineTo(-70, -186);
      g.lineTo(-60, -146);
      g.moveTo(-48, -218);
      g.lineTo(-8, -206);
      g.lineTo(10, -178);
      g.moveTo(104, -250);
      g.lineTo(88, -200);
      g.lineTo(108, -156);
      g.moveTo(-126, -222);
      g.lineTo(-108, -192);
      g.strokeStyle = rgba('120,230,255', 0.45);
      g.lineWidth = 7;
      g.stroke();
      g.strokeStyle = A.c('#effdff');
      g.lineWidth = 1.8;
      g.stroke();
    }
    // 肩與後腿上一層層疊起的冰甲
    const plate = (x, y, w, h, rot, a) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.beginPath();
      g.moveTo(-w, 0);
      g.quadraticCurveTo(-w * 0.5, -h, w * 0.2, -h * 0.9);
      g.quadraticCurveTo(w * 0.9, -h * 0.6, w, h * 0.2);
      g.quadraticCurveTo(0, -h * 0.3, -w, 0);
      g.closePath();
      g.fillStyle = rgba(P2 ? '200,225,255' : '240,252,255', a);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(-w * 0.9, -h * 0.1);
      g.quadraticCurveTo(-w * 0.5, -h, w * 0.2, -h * 0.9);
      g.stroke();
      g.strokeStyle = P2 ? 'rgba(30,50,140,0.45)' : 'rgba(60,90,160,0.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(w, h * 0.2);
      g.quadraticCurveTo(0, -h * 0.3, -w, 0);
      g.stroke();
      g.restore();
    };
    [[108, -176, 40, 26, -0.5, 0.35], [96, -206, 44, 28, -0.35, 0.4], [80, -238, 46, 30, -0.2, 0.45], [58, -262, 40, 24, -0.1, 0.4]].forEach((q) => plate(...q));
    [[-128, -152, 34, 22, 0.5, 0.3], [-130, -182, 40, 26, 0.3, 0.35], [-118, -212, 42, 26, 0.1, 0.4]].forEach((q) => plate(...q));
    // 內側的亮邊（冰的厚度）
    g.save();
    g.translate(3, 6);
    g.beginPath();
    body(g);
    g.strokeStyle = 'rgba(255,255,255,0.65)';
    g.lineWidth = 5;
    g.stroke();
    g.restore();
    g.restore();
    // 背上的積雪（山稜）
    const ridge = [];
    [FS_BODY[0], FS_BODY[1]].forEach((sg, j) => {
      for (let i = j ? 1 : 3; i <= 10; i++) ridge.push(cub(sg, i / 10));
    });
    const n = ridge.length;
    const up = ridge.map((p, i) => [p[0], p[1] - (2 + Math.sin((i / (n - 1)) * PI) * 9) * (0.8 + 0.4 * hash(i + 40))]);
    const lo = ridge.map((p, i) => [p[0], p[1] + 5 + (i % 3) * 3]).reverse();
    sh(g, smooth(up.concat(lo)), FS.snow, FS.snowS, { lw: 1.8, cel: [2, 3] });
    // 外輪廓
    g.beginPath();
    body(g);
    g.strokeStyle = A.outline();
    g.lineWidth = 2.6;
    g.lineJoin = 'round';
    g.stroke();
  }

  // 臉（快取）：冰雕的面具。沒有瞳孔，眼窩裡的光另外畫
  function fsHead(g, P2) {
    const C = fsPal(P2);
    // 耳朵：往後掠的冰片
    [[0, 0], [10, -6]].forEach(([dx, dy], i) => {
      sh(g, (c) => {
        c.moveTo(-12 + dx, -18 + dy);
        c.lineTo(-74 + dx * 0.6, -44 + dy);
        c.lineTo(-58 + dx * 0.6, -30 + dy);
        c.lineTo(-10 + dx, -2 + dy);
        c.closePath();
      }, i ? C.i1 : C.far, i ? C.i2 : C.farS, { lw: 2, cel: [0, 3] });
    });
    g.fillStyle = rgba('160,235,225', 0.55);
    g.beginPath();
    g.moveTo(-20, -12);
    g.lineTo(-62, -40);
    g.lineTo(-24, -6);
    g.closePath();
    g.fill();
    // 面具的形：長而方正的鹿臉
    const head = (c) => {
      c.moveTo(-36, 4);
      c.lineTo(-30, -26);
      c.quadraticCurveTo(-8, -44, 22, -38);
      c.lineTo(60, -22);
      c.quadraticCurveTo(86, -12, 93, 2);
      c.quadraticCurveTo(95, 14, 84, 22);
      c.lineTo(58, 30);
      c.quadraticCurveTo(20, 38, -12, 32);
      c.quadraticCurveTo(-32, 24, -36, 4);
      c.closePath();
    };
    const hg = g.createLinearGradient(0, -42, 0, 34);
    hg.addColorStop(0, A.c('#ffffff'));
    hg.addColorStop(0.5, A.c(C.i1));
    hg.addColorStop(1, A.c(C.i2));
    g.fillStyle = hg;
    g.beginPath();
    head(g);
    g.fill();
    g.save();
    g.clip();
    // 面：額頭亮面、頰的暗面、口鼻的深藍
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.moveTo(-26, -24);
    g.lineTo(20, -38);
    g.lineTo(58, -22);
    g.lineTo(30, -16);
    g.lineTo(-6, -8);
    g.closePath();
    g.fill();
    g.fillStyle = P2 ? 'rgba(20,30,110,0.28)' : 'rgba(40,70,150,0.18)';
    g.beginPath();
    g.moveTo(-36, 10);
    g.lineTo(10, 4);
    g.lineTo(60, 30);
    g.lineTo(-20, 36);
    g.closePath();
    g.fill();
    const mg = g.createLinearGradient(56, 0, 96, 0);
    mg.addColorStop(0, 'rgba(38,43,100,0)');
    mg.addColorStop(1, rgba('38,43,100', 0.75));
    g.fillStyle = mg;
    g.fillRect(50, -30, 50, 70);
    // 刻線：鼻樑、頰骨
    g.strokeStyle = rgba('50,80,160', 0.5);
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(-4, -8);
    g.lineTo(34, -14);
    g.lineTo(80, -6);
    g.stroke();
    g.restore();
    g.beginPath();
    head(g);
    g.strokeStyle = A.outline();
    g.lineWidth = 2.4;
    g.lineJoin = 'round';
    g.stroke();
    // 朱紅的神紋：從眼角往後掠的一道、眉上兩點
    sh(g, (c) => {
      c.moveTo(6, -6);
      c.quadraticCurveTo(-14, -10, -30, -22);
      c.quadraticCurveTo(-12, -4, 8, -2);
      c.closePath();
    }, FS.verm, null, { noStroke: true });
    g.fillStyle = A.c(FS.verm);
    [[8, -24], [22, -27]].forEach(([x, y]) => {
      g.beginPath();
      g.ellipse(x, y, 3.2, 1.8, -0.2, 0, TAU);
      g.fill();
    });
    // 額頭的金色雪紋
    g.save();
    g.translate(-8, -28);
    g.strokeStyle = A.c(FS.gold);
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
      g.moveTo(Math.cos(a) * 4 + Math.cos(a + 0.9) * 2.6, Math.sin(a) * 4 + Math.sin(a + 0.9) * 2.6);
      g.lineTo(Math.cos(a) * 4, Math.sin(a) * 4);
    }
    g.stroke();
    g.restore();
    // 眼窩（深）
    sh(g, (c) => {
      c.moveTo(4, -6);
      c.quadraticCurveTo(18, -18, 36, -12);
      c.quadraticCurveTo(24, -1, 4, -6);
      c.closePath();
    }, FS.indigoD, null, { lw: 1.8 });
    // 鼻孔
    g.strokeStyle = A.c(FS.indigoD);
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(84, 4);
    g.lineTo(90, 8);
    g.stroke();
    // 眉上的霜冠
    sh(g, (c) => {
      [[-2, -32, -22, -56], [10, -36, -2, -64], [22, -34, 14, -54]].forEach(([x0, y0, x1, y1]) => {
        c.moveTo(x0 - 5, y0 + 3);
        c.lineTo(x1, y1);
        c.lineTo(x0 + 5, y0 + 1);
        c.closePath();
      });
    }, '#f6fcff', C.i1, { lw: 1.6, cel: [2, 0] });
  }

  // ── 鹿角：透明的冰枝，往後、往上張開 ──
  const FS_ANT = [
    { p: [0, 0, -10, -40, -44, -70], w0: 20, w1: 15 },
    { p: [-44, -70, -100, -104, -176, -108], w0: 15, w1: 8 },
    { p: [-176, -108, -214, -110, -240, -136], w0: 8, w1: 1.4 },
    { p: [-4, -22, 30, -30, 52, -66], w0: 11, w1: 1.4 },
    { p: [30, -36, 46, -40, 62, -46], w0: 5, w1: 1.1 },
    { p: [-24, -56, -8, -92, 4, -128], w0: 10, w1: 1.4 },
    { p: [-12, -96, 4, -104, 18, -114], w0: 4.5, w1: 1.1 },
    { p: [-58, -80, -54, -120, -42, -160], w0: 10, w1: 1.4 },
    { p: [-52, -122, -66, -138, -72, -156], w0: 4.5, w1: 1.1 },
    { p: [-98, -100, -104, -132, -96, -164], w0: 9, w1: 1.4 },
    { p: [-138, -106, -150, -134, -146, -166], w0: 8, w1: 1.3 },
    { p: [-176, -108, -190, -128, -198, -156], w0: 7, w1: 1.2 },
    { p: [-120, -104, -126, -118, -120, -134], w0: 4, w1: 1.1 },
  ];
  const FS_HANG = qpt(FS_ANT[1].p, 0.3); // 巨鐘掛在這裡
  const FS_BELLS = [qpt(FS_ANT[1].p, 0.62), qpt(FS_ANT[1].p, 0.9), qpt(FS_ANT[0].p, 0.55)];
  // 分叉處長出的冰晶簇
  const FS_XTAL = [[-58, -84, 1], [-100, -102, 0.8], [-24, -58, 0.7], [-176, -110, 0.8]];
  function fsAntler(g, far, P2) {
    const segs = FS_ANT.map((s) => taperPts(s.p, s.w0, s.w1, 9));
    const all = (c) => segs.forEach((sp) => poly(sp)(c));
    // 透明的冰：上亮下透
    const gr = g.createLinearGradient(0, -160, 0, 0);
    gr.addColorStop(0, far ? 'rgba(200,225,245,0.7)' : 'rgba(250,255,255,0.92)');
    gr.addColorStop(1, far ? 'rgba(110,150,200,0.6)' : P2 ? 'rgba(130,190,240,0.72)' : 'rgba(170,225,235,0.7)');
    g.fillStyle = gr;
    g.beginPath();
    all(g);
    g.fill();
    // 內芯的亮線（光在冰裡走）
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = far ? 'rgba(235,245,255,0.55)' : 'rgba(255,255,255,0.95)';
    FS_ANT.forEach((s) => {
      g.lineWidth = Math.max(1, s.w0 * 0.2);
      g.beginPath();
      g.moveTo(s.p[0] - 1, s.p[1]);
      g.quadraticCurveTo(s.p[2] - 1, s.p[3], s.p[4], s.p[5]);
      g.stroke();
    });
    // 一側的青色折射
    g.strokeStyle = far ? 'rgba(90,140,190,0.5)' : rgba('80,190,200', 0.6);
    g.lineWidth = 1.2;
    g.beginPath();
    FS_ANT.forEach((s) => {
      if (s.w0 < 6) return;
      g.moveTo(s.p[0] + s.w0 * 0.3, s.p[1] + 2);
      g.quadraticCurveTo(s.p[2] + s.w0 * 0.3, s.p[3] + 2, s.p[4] + s.w1 * 0.3, s.p[5] + 2);
    });
    g.stroke();
    g.strokeStyle = A.outline();
    g.lineWidth = far ? 1.6 : 2;
    g.beginPath();
    all(g);
    g.stroke();
    // 主枝下垂的冰柱
    g.fillStyle = A.c(far ? '#c8daf0' : '#f2fbff');
    g.beginPath();
    [0.2, 0.45, 0.7, 0.9].forEach((u, i) => {
      const p = qpt(FS_ANT[1].p, u);
      const l = 10 + (i % 2) * 8;
      g.moveTo(p[0] - 3, p[1] + 4);
      g.lineTo(p[0], p[1] + 4 + l);
      g.lineTo(p[0] + 3, p[1] + 4);
      g.closePath();
    });
    g.fill();
    g.lineWidth = 1;
    g.stroke();
    // 分叉處的冰晶簇（細長的六角柱）
    FS_XTAL.forEach(([x, y, s], j) => {
      [[-0.5, 18], [0.1, 26], [0.6, 16]].forEach(([a, l], i) => {
        const b = -PI / 2 + a + (j % 2 ? 0.15 : -0.1);
        const L = l * s;
        const w = 3.2 * s;
        const cx = Math.cos(b);
        const sy = Math.sin(b);
        const pts = [[x - sy * w, y + cx * w], [x - sy * w + cx * L * 0.8, y + cx * w + sy * L * 0.8], [x + cx * L, y + sy * L], [x + sy * w + cx * L * 0.8, y - cx * w + sy * L * 0.8], [x + sy * w, y - cx * w]];
        g.beginPath();
        pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.closePath();
        g.fillStyle = far ? 'rgba(190,215,240,0.8)' : i === 1 ? 'rgba(255,255,255,0.95)' : 'rgba(190,240,236,0.9)';
        g.fill();
        g.strokeStyle = A.outline();
        g.lineWidth = 1;
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.9)';
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + cx * L * 0.8, y + sy * L * 0.8);
        g.stroke();
      });
    });
    // 角根纏著的注連繩
    if (!far) {
      limb(g, (c) => {
        c.moveTo(-14, -30);
        c.quadraticCurveTo(-2, -22, 12, -34);
      }, 10, FS.rope);
      g.strokeStyle = A.c(FS.ropeS);
      g.lineWidth = 1.2;
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        g.moveTo(-10 + i * 5, -33 + i * 0.6);
        g.lineTo(-7 + i * 5, -27 + i * 0.4);
      }
      g.stroke();
    }
  }

  // 神社的巨鐘（快取）：粗注連繩＋紙垂＋朱紅流蘇；crack 0～1 裂開透光
  function fsBell(g, crack, P2) {
    // 吊繩
    limb(g, (c) => {
      c.moveTo(0, -4);
      c.lineTo(0, 30);
    }, 13, FS.rope);
    g.strokeStyle = A.c(FS.ropeS);
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      g.moveTo(-4.5, -2 + i * 5.5);
      g.quadraticCurveTo(0, 0 + i * 5.5, 4.5, 4 + i * 5.5);
    }
    g.stroke();
    ell(g, 0, -4, 15, 8, FS.rope, FS.ropeS, { lw: 2, hl: false, cel: [0, 3] });
    // 紙垂
    [-1, 1].forEach((d) => {
      sh(g, (c) => {
        c.moveTo(d * 12, -4);
        c.lineTo(d * 21, -3);
        c.lineTo(d * 17, 7);
        c.lineTo(d * 25, 9);
        c.lineTo(d * 20, 20);
        c.lineTo(d * 27, 22);
        c.lineTo(d * 21, 35);
        c.lineTo(d * 16, 23);
        c.lineTo(d * 12, 22);
        c.closePath();
      }, '#ffffff', '#dfe8f2', { lw: 1.3, shadeY: 16 });
    });
    // 朱紅流蘇
    [-1, 1].forEach((d) => {
      g.strokeStyle = A.c(FS.verm);
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(d * 5, 8);
      g.quadraticCurveTo(d * 10, 22, d * 12, 40);
      g.stroke();
      ell(g, d * 12, 42, 4, 3.5, FS.gold, FS.goldD, { lw: 1.4, hl: false });
      sh(g, (c) => {
        c.moveTo(d * 12 - 4, 45);
        c.lineTo(d * 12 - 6, 70);
        c.quadraticCurveTo(d * 12, 74, d * 12 + 6, 70);
        c.lineTo(d * 12 + 4, 45);
        c.closePath();
      }, FS.verm, FS.vermD, { lw: 1.4, cel: [2, 0] });
    });
    const top = 32;
    const H = 92;
    // 龍頭
    sh(g, (c) => {
      c.moveTo(-11, top + 6);
      c.bezierCurveTo(-13, top - 10, 13, top - 10, 11, top + 6);
      c.lineTo(6, top + 6);
      c.bezierCurveTo(7, top - 3, -7, top - 3, -6, top + 6);
      c.closePath();
    }, FS.bronze, FS.bronzeD, { lw: 1.8 });
    const body = (c) => {
      c.moveTo(-27, top + 12);
      c.bezierCurveTo(-27, top - 7, 27, top - 7, 27, top + 12);
      c.bezierCurveTo(30, top + 40, 30, top + H - 24, 35, top + H - 8);
      c.quadraticCurveTo(42, top + H - 4, 42, top + H);
      c.lineTo(-42, top + H);
      c.quadraticCurveTo(-42, top + H - 4, -35, top + H - 8);
      c.bezierCurveTo(-30, top + H - 24, -30, top + 40, -27, top + 12);
      c.closePath();
    };
    const bg = g.createLinearGradient(-42, 0, 42, 0);
    bg.addColorStop(0, A.c(FS.bronzeD));
    bg.addColorStop(0.35, A.c(FS.bronzeL));
    bg.addColorStop(0.6, A.c(FS.bronze));
    bg.addColorStop(1, A.c(FS.bronzeD));
    g.fillStyle = bg;
    g.beginPath();
    body(g);
    g.fill();
    g.save();
    g.clip();
    // 霜
    g.fillStyle = 'rgba(235,250,255,0.55)';
    g.beginPath();
    g.ellipse(0, top + 2, 30, 10, 0, 0, TAU);
    g.fill();
    // 袈裟襷（縱橫的帶）、乳（一格格的圓點）、撞座
    g.strokeStyle = A.c(FS.gold);
    g.globalAlpha = 0.75;
    g.lineWidth = 1.4;
    g.beginPath();
    [top + 20, top + 56, top + H - 12].forEach((y) => {
      g.moveTo(-40, y);
      g.lineTo(40, y);
    });
    g.moveTo(0, top + 20);
    g.lineTo(0, top + 56);
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = A.c('#9cc8b4');
    for (let r = 0; r < 3; r++) {
      for (let cI = 0; cI < 3; cI++) {
        [-1, 1].forEach((d) => {
          g.beginPath();
          g.arc(d * (7 + cI * 7), top + 27 + r * 9, 2, 0, TAU);
          g.fill();
        });
      }
    }
    g.strokeStyle = A.c(FS.gold);
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(0, top + 68, 7, 0, TAU);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.moveTo(Math.cos(a) * 7, top + 68 + Math.sin(a) * 7);
      g.lineTo(Math.cos(a) * 10, top + 68 + Math.sin(a) * 10);
    }
    g.stroke();
    // 裂痕：透出冷光
    if (crack > 0) {
      const L = [[-4, top + 2], [4, top + 22], [-8, top + 40], [6, top + 60], [-2, top + 78], [8, top + H]];
      const n = Math.max(2, Math.round(L.length * crack));
      g.beginPath();
      for (let i = 0; i < n; i++) (i ? g.lineTo : g.moveTo).call(g, L[i][0], L[i][1]);
      if (crack > 0.6) {
        g.moveTo(-8, top + 40);
        g.lineTo(-24, top + 52);
        g.moveTo(6, top + 60);
        g.lineTo(22, top + 70);
      }
      g.strokeStyle = rgba('140,235,255', 0.55);
      g.lineWidth = 7;
      g.stroke();
      g.strokeStyle = A.c('#f2feff');
      g.lineWidth = 1.8;
      g.stroke();
    }
    g.restore();
    g.beginPath();
    body(g);
    g.strokeStyle = A.outline();
    g.lineWidth = 2.2;
    g.lineJoin = 'round';
    g.stroke();
    // 口緣的金邊
    g.strokeStyle = A.c(FS.gold);
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-40, top + H - 2);
    g.lineTo(40, top + H - 2);
    g.stroke();
    // 冰柱
    sh(g, (c) => {
      [[-30, 12], [-14, 18], [4, 10], [22, 16], [34, 8]].forEach(([x, l]) => {
        c.moveTo(x - 4, top + H);
        c.lineTo(x, top + H + l);
        c.lineTo(x + 4, top + H);
        c.closePath();
      });
    }, '#eefaff', '#a8d4ec', { lw: 1.3, cel: [2, 0] });
    void P2;
  }

  // 雪花幾何的光環（快取）：六角的枝晶、同心圓、刻度、金色的點
  function fsHalo(g, P2) {
    const R = 150;
    const wh = P2 ? '200,235,255' : '235,255,252';
    const tl = P2 ? '120,200,255' : '150,230,220';
    const gd = '232,198,110';
    const gg = g.createRadialGradient(0, 0, 10, 0, 0, R);
    gg.addColorStop(0, rgba(tl, 0.16));
    gg.addColorStop(0.7, rgba(tl, 0.06));
    gg.addColorStop(1, rgba(tl, 0));
    g.fillStyle = gg;
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.fill();
    g.lineCap = 'round';
    const ring = (r, col, a, lw, dash) => {
      g.strokeStyle = rgba(col, a);
      g.lineWidth = lw;
      if (dash) g.setLineDash(dash);
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
      g.stroke();
      if (dash) g.setLineDash([]);
    };
    ring(R, wh, 0.55, 1.6, P2 ? [60, 8, 22, 12] : null);
    ring(R - 8, wh, 0.35, 0.8);
    ring(R - 30, gd, 0.55, 1);
    ring(62, wh, 0.4, 0.9);
    ring(24, gd, 0.6, 1);
    // 外圈刻度
    g.strokeStyle = rgba(wh, 0.5);
    g.lineWidth = 0.9;
    g.beginPath();
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU;
      const r0 = i % 6 === 0 ? R - 16 : R - 8;
      g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    g.stroke();
    // 兩個交錯的六角形
    [[100, 0, tl, 0.55], [100, PI / 6, wh, 0.3], [62, PI / 6, tl, 0.45]].forEach(([r, o, col, a]) => {
      g.strokeStyle = rgba(col, a);
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i <= 6; i++) {
        const b = o + (i / 6) * TAU;
        i ? g.lineTo(Math.cos(b) * r, Math.sin(b) * r) : g.moveTo(Math.cos(b) * r, Math.sin(b) * r);
      }
      g.stroke();
    });
    // 六條枝晶
    g.strokeStyle = rgba(wh, 0.7);
    g.lineWidth = 1.3;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -PI / 2 + (i / 6) * TAU;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      g.moveTo(ca * 26, sa * 26);
      g.lineTo(ca * (R - 20), sa * (R - 20));
      [[48, 20], [80, 16], [110, 11]].forEach(([r, l]) => {
        [-1, 1].forEach((d) => {
          const b = a + d * 1.05;
          g.moveTo(ca * r, sa * r);
          g.lineTo(ca * r + Math.cos(b) * l, sa * r + Math.sin(b) * l);
        });
      });
    }
    g.stroke();
    // 金色的點與枝尖的菱形
    g.fillStyle = rgba(gd, 0.85);
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = -PI / 2 + ((i + 0.5) / 12) * TAU;
      g.moveTo(Math.cos(a) * 128 + 1.8, Math.sin(a) * 128);
      g.arc(Math.cos(a) * 128, Math.sin(a) * 128, 1.8, 0, TAU);
    }
    for (let i = 0; i < 6; i++) {
      const a = -PI / 2 + (i / 6) * TAU;
      const x = Math.cos(a) * (R - 20);
      const y = Math.sin(a) * (R - 20);
      g.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
      g.lineTo(x + Math.cos(a + PI / 2) * 3, y + Math.sin(a + PI / 2) * 3);
      g.lineTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5);
      g.lineTo(x - Math.cos(a + PI / 2) * 3, y - Math.sin(a + PI / 2) * 3);
      g.closePath();
    }
    g.fill();
  }

  // 一片雪花（快取，大小 ±16）
  function fsFlake(g, P2) {
    g.strokeStyle = P2 ? 'rgba(210,240,255,0.95)' : 'rgba(255,255,255,0.95)';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const c = Math.cos(a);
      const s = Math.sin(a);
      g.moveTo(0, 0);
      g.lineTo(c * 14, s * 14);
      [-1, 1].forEach((d) => {
        g.moveTo(c * 8, s * 8);
        g.lineTo(c * 8 + Math.cos(a + d * 1) * 5, s * 8 + Math.sin(a + d * 1) * 5);
      });
    }
    g.stroke();
    glow(g, 0, 0, 10, '220,250,255', 0.5);
  }

  // 極光的光幕貼圖（快取，寬 256、高 150；底邊最亮往上淡）
  function fsAuroraTex(g, P2) {
    const cols = P2 ? ['150,100,255', '255,90,200', '90,200,255'] : ['90,240,200', '120,210,255', '170,140,255'];
    const W = 256;
    const H = 150;
    for (let i = 0; i < 32; i++) {
      const s = i / 31;
      const f = s * (cols.length - 1);
      const j = Math.min(cols.length - 2, Math.floor(f));
      const q = f - j;
      const a = cols[j].split(',').map(Number);
      const b = cols[j + 1].split(',').map(Number);
      const col = a.map((v, k) => Math.round(v + (b[k] - v) * q)).join(',');
      const hh = H * (0.55 + 0.45 * Math.sin(s * PI)) * (0.8 + 0.2 * hash(i + 300));
      const fade = Math.min(1, Math.sin(s * PI) * 1.8);
      const gr = g.createLinearGradient(0, H, 0, H - hh);
      gr.addColorStop(0, rgba(col, 0.75 * fade));
      gr.addColorStop(0.35, rgba(col, 0.4 * fade));
      gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr;
      g.fillRect((i * W) / 32, H - hh, W / 32 + 0.6, hh);
    }
    // 縱向的光絲
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 22; i++) {
      const x = 12 + hash(i + 320) * (W - 24);
      g.moveTo(x, H - 2);
      g.lineTo(x, H - 30 - hash(i + 330) * 90);
    }
    g.stroke();
    g.strokeStyle = P2 ? 'rgba(255,225,255,0.6)' : 'rgba(230,255,245,0.6)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(24, H - 1);
    g.lineTo(W - 24, H - 1);
    g.stroke();
  }
  // 極光：沿著曲線一片片貼上去（每片上下飄動）
  function fsAurora(ctx, tex, t, pts, amp, alpha, H) {
    const N = 12;
    const sw = 256 / N;
    const q = tex._q;
    const B = ctx.getTransform();
    ctx.save();
    ctx.globalAlpha *= alpha;
    const at = (s) => {
      const p = cub(pts, s);
      p[1] += Math.sin(t * 1.1 + s * 6) * amp * s;
      p.push(H * (0.8 + 0.2 * Math.sin(t * 1.7 + s * 9)));
      return p;
    };
    let a = at(0);
    for (let i = 1; i <= N; i++) {
      const b = at(i / N);
      ctx.setTransform(B);
      // 把這一片的底邊斜切到 a→b 的線上，高度從 a 的漸變到 b 的（取平均）
      ctx.transform(b[0] - a[0] + 0.6, b[1] - a[1], 0, (a[2] + b[2]) / 2, a[0], a[1]);
      ctx.drawImage(tex, (i - 1) * sw * q + 2, 0, sw * q, tex.height, 0, -1, 1, 1);
      a = b;
    }
    ctx.restore();
  }

  // 霜靈的鹿腳
  function fsLeg(ctx, hx, hy, footX, lift, hind, w, col, colS, P2, far) {
    const fy = -lift;
    const kx = hind ? lerp(hx, footX, 0.4) - 20 : lerp(hx, footX, 0.55) + 6;
    const ky = lerp(hy, fy, hind ? 0.6 : 0.56);
    const fk = fy - 22;
    // 小腿
    sh(ctx, smooth(taperPts([kx, ky, (kx + footX) / 2 + (hind ? -4 : 3), (ky + fk) / 2, footX, fk], w * 0.56, w * 0.36, 6)), col, colS, { cel: [3, 0], lw: 2 });
    // 蹄：深靛色的冰晶，腳踝一圈金環
    const hoof = (c) => {
      c.moveTo(footX - 10, fy - 16);
      c.lineTo(footX + 9, fy - 16);
      c.lineTo(footX + 15, fy - 4);
      c.lineTo(footX + 13, fy);
      c.lineTo(footX - 11, fy);
      c.lineTo(footX - 13, fy - 6);
      c.closePath();
    };
    sh(ctx, hoof, far ? '#3a4278' : FS.indigo, FS.indigoD, { lw: 1.8, cel: [-3, 0] });
    ctx.strokeStyle = 'rgba(190,240,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(footX - 7, fy - 13);
    ctx.lineTo(footX - 9, fy - 3);
    ctx.stroke();
    if (!far) {
      ctx.strokeStyle = A.c(FS.gold);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(footX - 10, fk + 2);
      ctx.lineTo(footX + 10, fk + 1);
      ctx.stroke();
    }
    // 腳踝的霜毛
    sh(ctx, (c) => {
      c.moveTo(footX - 11, fk - 6);
      c.quadraticCurveTo(footX - 22, fy - 10, footX - 18, fy - 12);
      c.quadraticCurveTo(footX - 8, fy - 16, footX, fy - 14);
      c.quadraticCurveTo(footX + 8, fy - 18, footX + 12, fy - 14);
      c.quadraticCurveTo(footX + 11, fk - 2, footX + 8, fk - 8);
      c.closePath();
    }, far ? '#c4d6ec' : '#ffffff', FS.snowS, { lw: 1.6, cel: [2, 2] });
    // 大腿
    const cx = hind ? hx + 24 : hx - 10;
    const cy = lerp(hy, ky, 0.5);
    sh(ctx, smooth(taperPts([hx, hy - 16, cx, cy, kx, ky], w * 2.3, w * 0.62, 8)), col, colS, { cel: [8, 4], lw: 2.2 });
    ctx.strokeStyle = far ? 'rgba(230,240,255,0.4)' : 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - w * 0.6, hy - 6);
    ctx.quadraticCurveTo(cx - w * 0.6, cy, kx - w * 0.2, ky - 10);
    ctx.moveTo(kx - w * 0.15, ky + 6);
    ctx.lineTo(footX - w * 0.12, fk - 6);
    ctx.stroke();
    if (P2 && !far) {
      ctx.strokeStyle = 'rgba(140,240,255,0.85)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx + 4, hy + 6);
      ctx.lineTo(hx - 2, cy);
      ctx.lineTo(kx + 3, ky - 14);
      ctx.stroke();
    }
  }

  // 霜風的鬃：一綹綹尖尖的冰雪鬃毛（像被凍住的風）。locks = [[bx, by, tx, ty, w, bend], ...]
  function lockPath(c, L) {
    const [bx, by, tx, ty, w, bend] = L;
    const dx = tx - bx;
    const dy = ty - by;
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    const mx = (bx + tx) / 2 + nx * bend;
    const my = (by + ty) / 2 + ny * bend;
    c.moveTo(bx + nx * w, by + ny * w);
    c.quadraticCurveTo(mx + nx * w * 0.6, my + ny * w * 0.6, tx, ty);
    c.quadraticCurveTo(mx - nx * w * 0.5, my - ny * w * 0.5, bx - nx * w, by - ny * w);
    c.quadraticCurveTo(bx - (dx / l) * w * 1.3, by - (dy / l) * w * 1.3, bx + nx * w, by + ny * w);
    c.closePath();
  }
  function fsLocks(ctx, locks, y0, y1, cols, lw, hiA) {
    const gr = ctx.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, A.c(cols[0]));
    gr.addColorStop(1, A.c(cols[1]));
    ctx.beginPath();
    locks.forEach((L) => lockPath(ctx, L));
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 每綹中間的亮線
    ctx.strokeStyle = 'rgba(255,255,255,' + hiA + ')';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    locks.forEach(([bx, by, tx, ty, , bend]) => {
      const dx = tx - bx;
      const dy = ty - by;
      const l = Math.hypot(dx, dy) || 1;
      ctx.moveTo(bx + dx * 0.15, by + dy * 0.15);
      ctx.quadraticCurveTo((bx + tx) / 2 - (dy / l) * bend * 0.8, (by + ty) / 2 + (dx / l) * bend * 0.8, bx + dx * 0.8, by + dy * 0.8);
    });
    ctx.stroke();
  }

  // 懸在空中的雪花：時間停著時一動也不動，出招時才動起來（每隻 Boss 各自記住雪花的位置）
  const FS_NF = 26;
  const FS_FLK = new WeakMap();
  function fsFlakes(m, t, mvT, dead) {
    let s = FS_FLK.get(m);
    if (!s) {
      s = { t, mv: mvT, a: [], fall: [] };
      for (let i = 0; i < FS_NF; i++) {
        s.a.push(hash(i + 500) * TAU + t * 0.02);
        s.fall.push(0);
      }
      FS_FLK.set(m, s);
    }
    let dt = t - s.t;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.1) dt = 0.1;
    s.t = t;
    s.mv += (mvT - s.mv) * Math.min(1, dt * 4);
    for (let i = 0; i < FS_NF; i++) {
      s.a[i] += dt * s.mv * (0.35 + hash(i + 510) * 0.6) * (i % 3 ? 1 : -0.7);
      if (dead) s.fall[i] += dt * (90 + hash(i + 520) * 120);
    }
    return s;
  }

  function frostSpiritRaw(ctx, m) {
    const t = m.t || 0;
    const st = m.state;
    const K = (m.h || 300) / 300;
    const p2 = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    const P2 = p2 > 0.5;
    const k = prog(m);
    const portrait = m.x === 0 && m.y === 0 && st === 'recover';
    const dead = !!m.dead;
    const ghost = A.mode === 'tint'; // 時間召喚的殘影：只畫本體

    // ── 姿勢參數 ──
    let rear = 0;
    let headDown = 0;
    let headUp = 0;
    let crouch = 0;
    let glowK = 0;
    let tuck = 0;
    let lean = 0;
    let mvT = 0; // 雪花動起來的程度（0 = 時間靜止）
    if (st === 'tollPrep') {
      rear = k * 0.95;
      headUp = k * 0.4;
      mvT = 0.1;
    } else if (st === 'toll') {
      rear = Math.max(0, (m.stateT || 0) / 0.55 - 0.7);
      crouch = 0.3;
      mvT = 1.6;
    } else if (st === 'spikePrep') {
      headDown = k * 0.8;
      glowK = k;
      crouch = k * 0.3;
      mvT = 0.1;
    } else if (st === 'spikes') {
      headDown = 0.8;
      glowK = 1;
      crouch = 0.3;
      mvT = 1;
    } else if (st === 'rainPrep') {
      headUp = k;
      glowK = k;
      mvT = 0.2;
    } else if (st === 'rain') {
      headUp = 1;
      glowK = 1;
      mvT = 1.4;
    } else if (st === 'chargePrep') {
      headDown = k;
      crouch = k * 0.35;
      lean = -0.05 * k;
      mvT = 0.1;
    } else if (st === 'charge') {
      headDown = 1;
      lean = 0.05;
      mvT = 1.4;
    } else if (st === 'stompPrep') {
      crouch = k * 0.6;
      headDown = 0.3;
      mvT = 0.1;
    } else if (st === 'stompAir') {
      tuck = 1;
      headUp = 0.3;
      mvT = 1.2;
    } else if (st === 'blizzardPrep') {
      rear = k * 0.8;
      headUp = k;
      glowK = k;
      mvT = 0.5 + k;
    } else if (st === 'blizzard') {
      rear = 0.25 + Math.sin(t * 3) * 0.05;
      headUp = 0.8;
      glowK = 1;
      mvT = 2.6;
    } else if (st === 'summon') {
      headUp = 0.6;
      glowK = 0.6;
      mvT = 0.8;
    } else if (st === 'transform') {
      rear = 0.5 * Math.sin(k * PI);
      headUp = 0.7;
      glowK = k;
      mvT = 1.5;
    } else if (st === 'intro') {
      mvT = 1.2 * (1 - k);
      headUp = 0.3 * (1 - k);
    } else if (st === 'recover' && !portrait) {
      crouch = 0.15;
    }
    if (P2 && !dead) {
      if (st === 'move') headUp = Math.max(headUp, 0.25);
      mvT = Math.max(mvT, 0.35);
    }
    if (dead) {
      crouch = 0.6;
      headDown = 0.5;
      rear = 0;
      glowK = 0;
      mvT = 0.2;
    }
    const walking = (st === 'move' && Math.abs(m.vx || 0) > 8) || st === 'charge';
    const gait = st === 'charge' ? t * 16 : t * 6.5;
    const shake = st === 'transform' || st === 'blizzardPrep' ? Math.sin(t * 50) * 2 : 0;
    const bellSwing = m.bellSwing || 0;
    const storm = st === 'blizzard' ? 1 : st === 'blizzardPrep' ? k : 0;
    const wind = dead ? 0 : (P2 ? 1 : 0.2) + storm;
    const C = fsPal(P2);
    const lit = !dead;
    const crackK = P2 ? 1 : st === 'transform' ? k : 0;
    const intro = st === 'intro' ? k * k * (3 - 2 * k) : 1;

    ctx.save();
    ctx.scale(K, K);
    if (portrait) ctx.translate(-120, 40);
    ctx.translate(shake, 0);
    const S = devScale(ctx);

    // ── 身後的抽象效果：靜止的波紋、光環、極光、懸空的雪花 ──
    ctx.fillStyle = 'rgba(12,20,56,' + (0.3 * (1 - tuck * 0.4)).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(10, 2, 190 * (1 - tuck * 0.2), 14, 0, 0, TAU);
    ctx.fill();
    const cy = crouch * 26 + tuck * 10;
    const bob = walking ? Math.abs(Math.sin(gait)) * -6 : Math.sin(t * 1.6) * 2;
    const by = cy + bob;
    const na = headDown * 0.55 - headUp * 0.5;
    const hx = 172 + headDown * 36 - headUp * 16;
    const hy = -306 + by + headDown * 104 - headUp * 22;
    if (!ghost) {
      const fade = dead ? Math.max(0, 1 - (m.deadT || 0) * 0.9) : 1;
      // 地面一圈圈「靜止」的波紋（鐘聲蓄力時往內收）
      ctx.save();
      ctx.lineWidth = 1.2;
      const inward = st === 'tollPrep' ? k : 0;
      for (let i = 0; i < 4; i++) {
        let q = (t * (0.04 + storm * 0.2) + i / 4) % 1;
        if (inward) q = 1 - ((t * 0.9 + i / 4) % 1);
        const rx = 110 + q * 250;
        ctx.strokeStyle = rgba(P2 ? '170,215,255' : '200,250,245', (1 - q) * (0.32 + inward * 0.4) * fade);
        ctx.beginPath();
        ctx.ellipse(0, -1, rx, rx * 0.085, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      if (lit || fade > 0) {
        // 背後的冷光
        glow(ctx, 20, -250, 250, P2 ? '110,160,255' : '200,240,255', ((P2 ? 0.34 : 0.26) + glowK * 0.14) * fade * intro);
        // 雪花幾何的光環（在頭與角的後面，慢慢轉；第二階段轉快、碎開）
        const halo = sprite('fsHalo' + (P2 ? 2 : 1), S, -152, -152, 304, 304, (g) => fsHalo(g, P2), true);
        const hcx = 70 + (hx - 172) * 0.4;
        const hcy = -330 + by + (hy + 306 - by) * 0.3;
        ctx.save();
        ctx.translate(hcx, hcy);
        const hs = (dead ? 1 + (m.deadT || 0) * 0.35 : 1) * (st === 'intro' ? 0.6 + 0.4 * intro : 1);
        ctx.globalAlpha *= (0.7 + glowK * 0.3) * fade * intro;
        ctx.save();
        ctx.rotate(t * (P2 ? 0.14 : 0.04) + storm * t * 0.3);
        ctx.scale(hs, hs);
        blit(ctx, halo);
        ctx.restore();
        ctx.globalAlpha *= 0.7;
        ctx.rotate(-t * (P2 ? 0.22 : 0.07) + PI / 6);
        ctx.scale(0.5 * hs, 0.5 * hs);
        blit(ctx, halo);
        ctx.restore();
        // 極光
        const tex = sprite('fsAur' + (P2 ? 2 : 1), S * 0.6, 0, 0, 256, 150, (g) => fsAuroraTex(g, P2), true);
        const aA = ((P2 ? 0.7 : 0.55) + glowK * 0.15 + storm * 0.2) * fade * intro;
        const amp = 6 + storm * 18 + (P2 ? 8 : 0);
        fsAurora(ctx, tex, t, [-340, -350 + by, -210, -320 + by, -90, -430 + by, 40, -400 + by], amp, aA, 130);
        fsAurora(ctx, tex, t + 2.4, [-290, -262 + by, -170, -244 + by, -70, -318 + by, 20, -296 + by], amp * 0.7, aA * 0.7, 90);
        // 暴風：身後捲起的風
        if (P2 || storm > 0) {
          const sk = Math.max(storm, 0.45) * fade;
          ctx.save();
          ctx.lineCap = 'round';
          for (let i = 0; i < 6; i++) {
            const a0 = t * (1.4 + storm) + i * 1.1;
            const r = 170 + i * 20;
            ctx.strokeStyle = i % 2 ? rgba('255,255,255', 0.35 * sk) : rgba('150,200,255', 0.35 * sk);
            ctx.lineWidth = 1.5 + (i % 3);
            ctx.beginPath();
            ctx.ellipse(0, -190, r, r * 0.4, -0.12, a0, a0 + 0.8 + storm * 0.6);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      // 懸空的雪花
      const fl = fsFlakes(m, t, mvT, dead);
      const fs = sprite('fsFlk' + (P2 ? 2 : 1), S, -16, -16, 32, 32, (g) => fsFlake(g, P2), true);
      const gaF = ctx.globalAlpha;
      ctx.save();
      for (let i = 0; i < FS_NF; i++) {
        const R = 150 + hash(i + 530) * 170;
        const a = fl.a[i];
        let x = Math.cos(a) * R;
        let y = -236 + Math.sin(a) * R * 0.6 + (hash(i + 540) - 0.5) * 60 + fl.fall[i];
        if (st === 'intro') {
          x *= 0.4 + 0.6 * intro;
          y = -236 + (y + 236) * (0.4 + 0.6 * intro);
        }
        if (y > -6) y = -6;
        const sc = 0.3 + hash(i + 550) * 0.5;
        ctx.globalAlpha = gaF * (0.35 + hash(i + 560) * 0.5) * intro * (dead ? fade : 1);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a * 2 + i);
        ctx.scale(sc, sc);
        blit(ctx, fs);
        ctx.restore();
      }
      ctx.restore();
    }

    // 出現：冰從光裡結出來
    ctx.save();
    if (st === 'intro') {
      ctx.globalAlpha *= 0.15 + 0.85 * intro;
      const pg = ctx.createLinearGradient(0, -520, 0, 0);
      pg.addColorStop(0, 'rgba(220,250,255,0)');
      pg.addColorStop(1, rgba('220,250,255', 0.5 * (1 - intro)));
      ctx.fillStyle = pg;
      ctx.fillRect(-120, -520, 240, 520);
    }

    // 整隻往後仰（以後腳為軸）
    const pivotX = -80;
    const rotW = -rear * 0.36 + lean;
    ctx.save();
    ctx.translate(pivotX, 0);
    ctx.rotate(rotW);
    ctx.translate(-pivotX, 0);

    // ── 遠側的腳 ──
    const legY = -150 + by;
    const sw = (ph) => (walking ? Math.sin(gait + ph) : 0);
    const lift = (ph) => (walking ? Math.max(0, Math.sin(gait + ph + PI / 2)) * (st === 'charge' ? 28 : 16) : 0);
    const fLift = rear * 60 + tuck * 50;
    fsLeg(ctx, -104, legY, -110 + sw(PI) * 26, lift(PI) + tuck * 40, true, 23, C.far, C.farS, P2, true);
    fsLeg(ctx, 86, legY - 6, 96 + sw(0) * 30 + rear * 22, lift(0) + fLift, false, 22, C.far, C.farS, P2, true);

    // ── 尾巴 ──
    sh(ctx, (c) => {
      c.moveTo(-154, -216 + by);
      c.quadraticCurveTo(-190, -240 + by + Math.sin(t * 2) * 3, -184, -196 + by);
      c.quadraticCurveTo(-170, -182 + by, -150, -192 + by);
      c.closePath();
    }, '#ffffff', FS.snowS, { lw: 1.8, cel: [3, 3] });

    // ── 身體（快取）──
    ctx.save();
    ctx.translate(0, by);
    blit(ctx, sprite('fsTorso' + (P2 ? 2 : 1) + (dead ? 'd' : ''), S, -186, -312, 362, 226, (g) => fsTorso(g, P2, dead)));
    ctx.restore();

    // ── 近側的腳 ──
    fsLeg(ctx, -76, legY + 4, -70 + sw(0) * 26, lift(0) + tuck * 40, true, 26, C.leg, C.legS, P2, false);
    fsLeg(ctx, 114, legY - 2, 122 + sw(PI) * 30 + rear * 30, lift(PI) + fLift * 1.1, false, 25, C.leg, C.legS, P2, false);

    const wv = (i, f) => Math.sin(t * (0.6 + wind * 2.2) + i * 1.3) * (1.5 + wind * 6) * f;
    // ── 脖子 ──
    const neck = (c) => {
      c.moveTo(6, -282 + by);
      c.quadraticCurveTo(hx - 76, hy - 50, hx - 26, hy - 22);
      c.lineTo(hx + 6, hy + 24);
      c.quadraticCurveTo(hx - 4, hy + 96, 152, -178 + by);
      c.lineTo(64, -206 + by);
      c.closePath();
    };
    const ng = ctx.createLinearGradient(hx - 60, hy - 30, 130, -150 + by);
    ng.addColorStop(0, A.c(C.i0));
    ng.addColorStop(0.6, A.c(C.i1));
    ng.addColorStop(1, A.c(C.i2));
    ctx.fillStyle = ng;
    ctx.beginPath();
    neck(ctx);
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = A.outline();
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(hx - 20, hy + 8);
    ctx.quadraticCurveTo(hx - 40, hy + 60, 120, -196 + by);
    ctx.stroke();

    // ── 遠側的鹿角（順便算出鐘掛的位置）──
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(na);
    ctx.save();
    ctx.translate(-14, -28);
    ctx.scale(0.88, 0.88);
    ctx.rotate(0.12);
    blit(ctx, sprite('fsAntF' + (P2 ? 2 : 1), S, -250, -176, 330, 202, (g) => fsAntler(g, true, P2)));
    const hangDev = ctx.getTransform().transformPoint(new DOMPoint(FS_HANG[0], FS_HANG[1]));
    ctx.restore();
    ctx.restore();
    const hang = ctx.getTransform().inverse().transformPoint(hangDev);

    // ── 霜風的鬃：頸脊往後飄、喉下到胸前垂成一大片 ──
    {
      const CR = [hx - 34, hy - 20, hx - 74, hy - 44, 14, -292 + by];
      const crest = [];
      for (let i = 0; i <= 7; i++) {
        const u = i / 7;
        const p = qpt(CR, u);
        const L = 46 + Math.sin(u * PI) * 22 + wind * 26;
        crest.push([p[0] + 4, p[1] + 10, p[0] - L * (0.75 + wind * 0.15), p[1] - L * (0.55 - wind * 0.25) + wv(i, 1), 12 - u * 2, (i % 2 ? -10 : 6) - wind * 4]);
      }
      fsLocks(ctx, crest, hy - 70, -230 + by, ['#ffffff', P2 ? '#8fb6f0' : '#a8e2dc'], 1.6, 0.8);
      const TH = [hx - 6, hy + 22, hx - 22, hy + 92, 150, -178 + by];
      const back = [];
      const front = [];
      for (let i = 0; i <= 5; i++) {
        const u = i / 5;
        const p = qpt(TH, u);
        const L = 62 + Math.sin(u * PI) * 36;
        const sway = wv(i + 3, 0.8);
        back.push([p[0] - 14, p[1] - 6, p[0] - 50 - u * 36 - wind * 14 + sway, p[1] + L, 22, 14]);
        if (i > 0 && i < 5) front.push([p[0] - 2, p[1] + 2, p[0] - 26 - u * 30 - wind * 12 + sway, p[1] + L * 0.7, 17, 10]);
      }
      fsLocks(ctx, back, hy, -90 + by, [P2 ? '#b8d4f8' : '#d4f2ee', P2 ? '#4f72c0' : '#6fa8c0'], 1.6, 0.6);
      fsLocks(ctx, front, hy + 20, -110 + by, ['#ffffff', P2 ? '#9ec0f4' : '#bfe8e4'], 1.4, 0.9);
    }

    // ── 頸根的注連繩（垂成一道弧，掛著紙垂）──
    {
      const RP = [34, -288 + by, 70, -140 + by, 168, -206 + by];
      limb(ctx, (c) => {
        c.moveTo(RP[0], RP[1]);
        c.quadraticCurveTo(RP[2], RP[3], RP[4], RP[5]);
      }, 12, FS.rope);
      ctx.strokeStyle = A.c(FS.ropeS);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 1; i < 12; i++) {
        const p = qpt(RP, i / 12);
        const d = qtan(RP, i / 12);
        ctx.moveTo(p[0] - d[1] * 3.5 - d[0] * 3, p[1] + d[0] * 3.5 - d[1] * 3);
        ctx.lineTo(p[0] + d[1] * 3.5 + d[0] * 3, p[1] - d[0] * 3.5 + d[1] * 3);
      }
      ctx.stroke();
      [0.28, 0.5, 0.74].forEach((u, i) => {
        const p = qpt(RP, u);
        const sway = Math.sin(t * (0.8 + wind) + i) * (0.6 + wind * 2);
        sh(ctx, (c) => {
          const x = p[0];
          const y = p[1] + 4;
          c.moveTo(x - 4, y);
          c.lineTo(x + 5, y);
          c.lineTo(x + 1 + sway * 0.3, y + 9);
          c.lineTo(x + 8 + sway * 0.5, y + 11);
          c.lineTo(x + 3 + sway * 0.7, y + 21);
          c.lineTo(x + 9 + sway, y + 23);
          c.lineTo(x + 2 + sway, y + 34);
          c.lineTo(x - 2 + sway * 0.7, y + 23);
          c.lineTo(x - 6 + sway * 0.5, y + 21);
          c.lineTo(x - 2 + sway * 0.3, y + 11);
          c.lineTo(x - 7, y + 9);
          c.closePath();
        }, '#ffffff', '#dfe8f2', { lw: 1.1, shadeY: p[1] + 26 });
      });
    }

    // ── 巨鐘：永遠朝正下方垂 ──
    const swing = (Math.sin(t * 7) * 0.4 * bellSwing + Math.sin(t * 1.1) * 0.04) * (dead ? 0.2 : 1);
    const ring = clamp(bellSwing, 0, 1.4) * (dead ? 0 : 1);
    ctx.save();
    ctx.translate(hang.x, hang.y);
    ctx.rotate(swing - rotW);
    if (ring > 0.2 && !ghost) glow(ctx, 0, 90, 100 + ring * 50, P2 ? '150,220,255' : '215,250,245', 0.4 * ring);
    const ck = crackK >= 1 ? 1 : crackK > 0.5 ? 0.66 : crackK > 0.1 ? 0.33 : 0;
    blit(ctx, sprite('fsBell' + ck + (P2 ? 2 : 1), S, -50, -22, 100, 170, (g) => fsBell(g, ck, P2)));
    if (P2 && lit && !ghost) glow(ctx, 0, 80, 40, '140,235,255', 0.35 + Math.sin(t * 4) * 0.1);
    ctx.restore();

    // ── 頭（快取的面具）＋眼裡的光 ──
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(na);
    ctx.scale(1.12, 1.12);
    blit(ctx, sprite('fsHead' + (P2 ? 2 : 1), S * 1.12, -82, -70, 182, 118, (g) => fsHead(g, P2)));
    const ex = 20;
    const ey = -9;
    if (!dead) {
      const flash = m.hurtFlash > 0.05;
      const dim = m.blink && st === 'move' && !P2 ? 0.35 : 1;
      const eg = P2 ? '120,235,255' : '190,255,245';
      if (!ghost) glow(ctx, ex, ey, 24 + glowK * 14 + (P2 ? 8 : 0), eg, (0.55 + glowK * 0.3) * dim);
      ctx.fillStyle = A.c(flash ? '#ffffff' : P2 ? '#6fe6ff' : '#9ff0e6');
      ctx.globalAlpha *= dim;
      ctx.beginPath();
      ctx.moveTo(6, -6.5);
      ctx.quadraticCurveTo(18, -16, 33, -11.5);
      ctx.quadraticCurveTo(22, -3, 6, -6.5);
      ctx.fill();
      ctx.fillStyle = A.c('#ffffff');
      ctx.beginPath();
      ctx.ellipse(21, -9.5, 7, 2.4, -0.18, 0, TAU);
      ctx.fill();
      // 拖在眼後的冷光
      const angry = st !== 'move' || P2;
      if (angry && !ghost) {
        ctx.strokeStyle = rgba(eg, P2 ? 0.75 : 0.35 + glowK * 0.35);
        ctx.lineWidth = P2 ? 2.4 : 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(6, -6);
        ctx.quadraticCurveTo(-14, -8 + Math.sin(t * 5) * 1.5, -(P2 ? 46 : 32), -18);
        ctx.stroke();
      }
      ctx.globalAlpha /= dim;
      // 鼻息的白霧
      if (!ghost) {
        const open = st === 'tollPrep' || st === 'blizzardPrep' || st === 'blizzard' || st === 'rain' || st === 'transform' || P2;
        const big = open ? (st === 'blizzard' || st === 'blizzardPrep' || P2 ? 1.5 : 1) : 0.45;
        const gaB = ctx.globalAlpha;
        ctx.save();
        const nb = open ? 6 : 3;
        for (let i = 0; i < nb; i++) {
          const q = (t * 1.2 + i / nb) % 1;
          ctx.globalAlpha = gaB * (1 - q) * 0.45 * Math.min(1, big + 0.3);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(94 + q * 50 * big, 12 + Math.sin(i + t) * 3 - q * 10 * big, (3 + q * 10) * big, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    // 近側的鹿角
    ctx.save();
    ctx.translate(2, -26);
    ctx.scale(0.86, 0.86);
    if (glowK > 0 && !ghost) glow(ctx, -70, -80, 150, C.glow, 0.4 * glowK);
    blit(ctx, sprite('fsAntN' + (P2 ? 2 : 1), S, -250, -176, 330, 202, (g) => fsAntler(g, false, P2)));
    // 枝上的金鈴（跟著鐘聲一起搖）
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    FS_BELLS.forEach((p, i) => {
      const a = -na - rotW + Math.sin(t * 2 + i) * 0.08 + Math.sin(t * 9 + i) * 0.35 * ring;
      const bx = p[0] + Math.sin(a) * 12;
      const byy = p[1] + Math.cos(a) * 12;
      ctx.strokeStyle = A.c(FS.verm);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(bx, byy);
      ctx.stroke();
      ell(ctx, bx, byy + 3, 4.2, 4.2, FS.gold, FS.goldD, { lw: 1.2, hl: false, cel: [1, 1.5] });
    });
    ctx.restore();
    ctx.restore();

    // ── 招式的附加效果 ──
    if (lit) {
      if (st === 'spikePrep' || st === 'spikes') {
        const g = st === 'spikes' ? 1 : k;
        sh(ctx, (c) => {
          [[-120, 18], [-88, 26], [64, 24], [100, 32], [140, 20]].forEach(([x, h], i) => {
            const hh = h * g;
            c.moveTo(x - 7, 2);
            c.lineTo(x + (i % 2 ? 3 : -3), -hh);
            c.lineTo(x + 7, 2);
            c.closePath();
          });
        }, '#eefaff', '#a8d4ec', { lw: 1.4, cel: [3, 0] });
      }
      if (st === 'charge' || st === 'chargePrep') {
        const g = st === 'charge' ? 1 : k * 0.5;
        const gaC = ctx.globalAlpha;
        ctx.save();
        for (let i = 0; i < 5; i++) {
          const q = (t * 3 + i / 5) % 1;
          ctx.globalAlpha = gaC * (1 - q) * 0.45 * g;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(-130 - q * 110, -10 - q * 18 - (i % 3) * 8, 14 + q * 22, 7 + q * 8, 0, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = gaC;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * g).toFixed(3) + ')';
        ctx.lineWidth = 2;
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
    ctx.restore(); // 出現的淡入
    ctx.restore();
  }
  const frostSpirit = inkWrap(frostSpiritRaw, FS.ink);

  // ═════════════════════════ 時間 ═════════════════════════
  // 世界的時鐘本身：不善也不惡的記帳者。外形是神殿裡的巨大石獅（歷代守葉獸的輪廓），端坐在漂浮的石台上，
  // 五官極簡、雙眼闔著——只有出招時才睜開（沒有眼白，整顆是光）。
  // 身後是日蝕的黑盤，一圈圈錶環與星盤環以不同的速度、不同的傾角轉動（金色細線的羅馬數字與齒輪），
  // 光像水一樣流過，細沙在空中漂。錶環的轉動跟著「星沙的時間」：時停時凍住、倒轉時倒著轉。
  // 第二階段「無盡星空」：石殼裂開，裡面是星空；錶環碎成一段段弧，發狂似地亂轉。
  // 錶盤中心 (0,-228) 要和 boss3.js 的 pivot() 一致。
  const TS = {
    ink: '#241c3e',
    stone: '#c9b99c', stoneL: '#e6dac2', stoneS: '#a08e72', stoneD: '#76674f', stoneDD: '#4f4434',
    gold: '#ecca78', goldL: '#fff0c4', goldD: '#a8803a',
    void: '#120d30', void2: '#3a2a7c',
  };
  const NUM = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const SERIF = '"Times New Roman", "Noto Serif TC", "Noto Serif", Georgia, serif';

  // ── 抽象的環（快取，全部用原色，不受閃白影響）──
  // 日蝕：黑盤＋亮邊＋光冕
  function tsEclipse(g, P2) {
    const R = 150;
    const cor = P2 ? '235,120,220' : '255,214,140';
    const cg = g.createRadialGradient(0, 0, R * 0.95, 0, 0, R * 1.62);
    cg.addColorStop(0, rgba(cor, 0.55));
    cg.addColorStop(0.25, rgba(cor, 0.2));
    cg.addColorStop(1, rgba(cor, 0));
    g.fillStyle = cg;
    g.beginPath();
    g.arc(0, 0, R * 1.62, 0, TAU);
    g.fill();
    // 細細的光刺
    g.lineCap = 'round';
    g.strokeStyle = rgba(P2 ? '255,190,240' : '255,236,190', 0.35);
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU + hash(i + 700) * 0.05;
      const L = R * (1.12 + hash(i + 710) * (i % 4 ? 0.22 : 0.5));
      g.moveTo(Math.cos(a) * (R + 4), Math.sin(a) * (R + 4));
      g.lineTo(Math.cos(a) * L, Math.sin(a) * L);
    }
    g.stroke();
    // 黑盤
    const dg = g.createRadialGradient(-R * 0.25, -R * 0.2, 4, 0, 0, R);
    dg.addColorStop(0, P2 ? '#3a2070' : '#262050');
    dg.addColorStop(0.7, P2 ? '#1a0e40' : '#141030');
    dg.addColorStop(1, '#0a0820');
    g.fillStyle = dg;
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.fill();
    // 盤面上淡淡的星
    for (let i = 0; i < 40; i++) {
      const a = hash(i + 720) * TAU;
      const r = Math.sqrt(hash(i + 730)) * (R - 8);
      g.fillStyle = rgba('255,246,220', 0.25 + hash(i + 740) * 0.5);
      g.beginPath();
      g.arc(Math.cos(a) * r, Math.sin(a) * r, 0.6 + hash(i + 750) * 1.1, 0, TAU);
      g.fill();
    }
    // 亮邊（鑽石環）
    g.strokeStyle = rgba(P2 ? '255,200,245' : '255,244,210', 0.9);
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.stroke();
    g.strokeStyle = rgba(cor, 0.5);
    g.lineWidth = 6;
    g.beginPath();
    g.arc(0, 0, R + 3, 0, TAU);
    g.stroke();
  }
  // 環上的斷口：第二階段的環碎成一段段弧
  function brokenArc(g, r, P2, seed, fn) {
    if (!P2) {
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
      fn();
      return;
    }
    let a = hash(seed) * 0.4;
    let i = 0;
    while (a < TAU - 0.05) {
      const len = 0.35 + hash(seed + i * 3 + 1) * 0.9;
      const off = (hash(seed + i * 3 + 2) - 0.5) * 10;
      g.beginPath();
      g.arc(0, 0, r + off, a, Math.min(TAU, a + len));
      fn();
      a += len + 0.08 + hash(seed + i * 3 + 3) * 0.18;
      i++;
    }
  }
  // 主錶盤：刻度＋羅馬數字（flip：整隻被 dir 翻過來時數字要翻回來）
  function tsDial(g, P2, flip, hot) {
    const R = 172;
    const gc = P2 ? '255,226,190' : '240,208,130';
    g.lineCap = 'round';
    brokenArc(g, R, P2, 11, () => {
      g.strokeStyle = rgba(gc, 0.9);
      g.lineWidth = 1.6;
      g.stroke();
    });
    brokenArc(g, R - 7, P2, 23, () => {
      g.strokeStyle = rgba(gc, 0.5);
      g.lineWidth = 0.8;
      g.stroke();
    });
    brokenArc(g, R - 44, P2, 37, () => {
      g.strokeStyle = rgba(gc, 0.45);
      g.lineWidth = 0.8;
      g.stroke();
    });
    g.strokeStyle = rgba(gc, 0.85);
    for (let i = 0; i < 60; i++) {
      if (P2 && hash(i + 800) < 0.25) continue;
      const a = -PI / 2 + (i / 60) * TAU;
      const big = i % 5 === 0;
      g.lineWidth = big ? 1.6 : 0.8;
      g.beginPath();
      g.moveTo(Math.cos(a) * (R - 8), Math.sin(a) * (R - 8));
      g.lineTo(Math.cos(a) * (R - (big ? 20 : 14)), Math.sin(a) * (R - (big ? 20 : 14)));
      g.stroke();
    }
    g.font = 'bold 19px ' + SERIF;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const a = -PI / 2 + (i / 12) * TAU;
      const rr = R - 32 + (P2 ? (hash(i + 820) - 0.5) * 16 : 0);
      g.save();
      g.translate(Math.cos(a) * rr * flip, Math.sin(a) * rr);
      g.rotate((a + PI / 2) * flip + (P2 ? (hash(i + 830) - 0.5) * 0.6 : 0));
      g.scale(flip, 1);
      if (hot) glow(g, 0, 0, 22, '255,140,220', 0.8);
      g.lineWidth = 3;
      g.lineJoin = 'round';
      g.strokeStyle = 'rgba(20,12,44,0.75)';
      g.strokeText(NUM[i], 0, 0);
      g.fillStyle = hot ? '#ffe4f6' : P2 ? '#ffe8d0' : '#f2d898';
      g.fillText(NUM[i], 0, 0);
      g.restore();
    }
  }
  // 齒輪環：外緣一圈細齒
  function tsGear(g, P2) {
    const R = 204;
    const gc = P2 ? '255,200,230' : '236,202,120';
    g.strokeStyle = rgba(gc, 0.75);
    g.lineWidth = 1.2;
    g.lineJoin = 'round';
    const n = 72;
    const segs = P2 ? 6 : 1;
    for (let sI = 0; sI < segs; sI++) {
      const a0 = (sI / segs) * TAU + (P2 ? 0.1 : 0);
      const a1 = a0 + TAU / segs - (P2 ? 0.25 : 0);
      const off = P2 ? (hash(sI + 840) - 0.5) * 14 : 0;
      g.beginPath();
      let first = true;
      for (let i = 0; i <= n * 4; i++) {
        const a = (i / (n * 4)) * TAU;
        if (a < a0 || a > a1) continue;
        const rr = (i % 4 < 2 ? R : R - 7) + off;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        first ? g.moveTo(x, y) : g.lineTo(x, y);
        first = false;
      }
      g.stroke();
      g.beginPath();
      g.arc(0, 0, R - 12 + off, a0, a1);
      g.stroke();
    }
    // 輪輻上的小圓
    g.fillStyle = rgba(gc, 0.7);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.beginPath();
      g.arc(Math.cos(a) * (R - 22), Math.sin(a) * (R - 22), 2.2, 0, TAU);
      g.fill();
    }
  }
  // 星盤環：雙線的帶子，中間刻度與星符（傾斜著畫）
  function tsBand(g, P2, R, glyphs) {
    const gc = P2 ? '255,190,235' : '246,222,160';
    brokenArc(g, R, P2, R, () => {
      g.strokeStyle = rgba(gc, 0.75);
      g.lineWidth = 1.4;
      g.stroke();
    });
    brokenArc(g, R - 12, P2, R + 5, () => {
      g.strokeStyle = rgba(gc, 0.5);
      g.lineWidth = 0.9;
      g.stroke();
    });
    g.strokeStyle = rgba(gc, 0.55);
    g.lineWidth = 0.8;
    g.beginPath();
    for (let i = 0; i < 90; i++) {
      if (P2 && hash(i + R) < 0.3) continue;
      const a = (i / 90) * TAU;
      const r0 = i % 5 ? R - 4 : R - 12;
      g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    g.stroke();
    if (glyphs) {
      g.fillStyle = rgba(gc, 0.9);
      g.strokeStyle = rgba(gc, 0.9);
      g.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const a = ((i + 0.5) / 12) * TAU;
        const x = Math.cos(a) * (R + 12);
        const y = Math.sin(a) * (R + 12);
        g.beginPath();
        if (i % 3 === 0) {
          g.arc(x, y, 3.5, 0, TAU);
          g.stroke();
          g.beginPath();
          g.arc(x, y, 1.2, 0, TAU);
          g.fill();
        } else if (i % 3 === 1) {
          starPath(g, x, y, 4.5, 1.6, 4);
          g.fill();
        } else {
          g.arc(x, y, 3.6, -PI * 0.7, PI * 0.7);
          g.arc(x + 1.8, y, 3, PI * 0.6, -PI * 0.6, true);
          g.fill();
        }
      }
    }
  }
  // 時針（快取，沿 +x）
  const TS_HANDS = {
    hour: { len: 170 },
    minute: { len: 236 },
    second: { len: 250 },
    fate: { len: 200 },
  };
  function tsHand(g, kind, P2) {
    const len = TS_HANDS[kind].len;
    const gold = P2 ? '#f8e0a8' : TS.gold;
    const out = A.outline();
    const fillStroke = (path, fill, lw) => {
      g.beginPath();
      path(g);
      g.fillStyle = A.c(fill);
      g.fill();
      g.strokeStyle = out;
      g.lineWidth = lw || 1.2;
      g.lineJoin = 'round';
      g.stroke();
    };
    if (kind === 'hour') {
      fillStroke((c) => {
        c.moveTo(-26, -3.5);
        c.lineTo(len - 40, -2.5);
        c.lineTo(len - 26, -10);
        c.lineTo(len, 0);
        c.lineTo(len - 26, 10);
        c.lineTo(len - 40, 2.5);
        c.lineTo(-26, 3.5);
        c.closePath();
      }, gold, 1.3);
      // 鏤空的日輪
      g.strokeStyle = out;
      g.lineWidth = 4.5;
      g.beginPath();
      g.arc(len * 0.45, 0, 13, 0, TAU);
      g.stroke();
      g.strokeStyle = A.c(gold);
      g.lineWidth = 2.4;
      g.stroke();
      g.lineWidth = 1.2;
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        g.moveTo(len * 0.45 + Math.cos(a) * 15, Math.sin(a) * 15);
        g.lineTo(len * 0.45 + Math.cos(a) * 20, Math.sin(a) * 20);
      }
      g.stroke();
      g.fillStyle = A.c(P2 ? '#ff9ad8' : '#fff0c4');
      g.beginPath();
      g.arc(len * 0.45, 0, 3.2, 0, TAU);
      g.fill();
    } else if (kind === 'minute') {
      fillStroke((c) => {
        c.moveTo(-30, -2.5);
        c.lineTo(len - 30, -2);
        c.lineTo(len - 34, -8);
        c.lineTo(len, 0);
        c.lineTo(len - 34, 8);
        c.lineTo(len - 30, 2);
        c.lineTo(-30, 2.5);
        c.closePath();
      }, gold, 1.2);
      // 新月
      fillStroke((c) => {
        c.arc(len * 0.52, 0, 11, 0, TAU);
        c.moveTo(len * 0.52 + 11, -3);
        c.arc(len * 0.52 + 5, -3, 8.5, 0, TAU, true);
      }, '#fff0c4', 1.1);
    } else if (kind === 'second') {
      fillStroke((c) => {
        c.moveTo(-50, -1.6);
        c.lineTo(len, -0.8);
        c.lineTo(len, 0.8);
        c.lineTo(-50, 1.6);
        c.closePath();
      }, P2 ? '#ff8aa8' : '#e0685a', 1);
      fillStroke((c) => starPath(c, -50, 0, 10, 4, 4), P2 ? '#ff8aa8' : '#e0685a', 1);
      g.strokeStyle = A.c(P2 ? '#ff8aa8' : '#e0685a');
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(len - 22, 0, 5, 0, TAU);
      g.stroke();
    } else {
      fillStroke((c) => {
        c.moveTo(-20, -2.5);
        c.lineTo(len - 30, -2);
        c.lineTo(len - 30, 2);
        c.lineTo(-20, 2.5);
        c.closePath();
      }, P2 ? '#e8d4ff' : '#d8ccf4', 1.1);
      fillStroke((c) => starPath(c, len * 0.45, 0, 9, 3.2, 4), '#fff0c4', 1);
      fillStroke((c) => {
        c.arc(len - 14, 0, 17, -PI * 0.75, PI * 0.75);
        c.arc(len - 22, 0, 14, PI * 0.6, -PI * 0.6, true);
        c.closePath();
      }, '#fff0c4', 1.2);
    }
  }

  // ── 石獅的形（順時針的多邊形，第一階段逐塊畫，第二階段拼成星空的剪影）──
  const TL = (() => {
    const hx = 62;
    const hy = -250;
    const maneP = (r0, amp, n, ph) => {
      const P = [];
      for (let i = 0; i < 160; i++) {
        const a = (i / 160) * TAU;
        const f = (((a * n) / TAU + ph) % 1 + 1) % 1;
        const lobe = Math.pow(1 - Math.abs(f - 0.5) * 2, 1.4);
        const r = r0 + lobe * amp;
        P.push([hx - 14 + Math.cos(a) * r, hy + 8 + Math.sin(a) * r * 0.95]);
      }
      return cw(P);
    };
    return {
      hx,
      hy,
      tail: taperPts([-150, -64, -206, -60, -204, -112], 18, 11, 12),
      tuft: ellPts(-202, -120, 16, 14, 0, 18),
      legF: taperPts([40, -170, 38, -110, 44, -62], 36, 32, 8),
      pawF: ellPts(52, -58, 26, 11, 0, 20),
      torso: cubPts([
        [-150, -84, -162, -150, -110, -206, -40, -214],
        [-40, -214, 20, -224, 86, -214, 112, -178],
        [112, -178, 128, -146, 122, -96, 106, -62],
        [106, -62, 60, -52, -40, -50, -110, -52],
        [-110, -52, -140, -56, -148, -70, -150, -84],
      ], 8),
      haunch: ellPts(-94, -106, 74, 58, -0.12, 32),
      hpaw: ellPts(-30, -58, 34, 11, 0, 20),
      legN: taperPts([92, -168, 96, -110, 100, -62], 42, 36, 8),
      pawN: ellPts(108, -58, 30, 12, 0, 20),
      mane: maneP(90, 26, 20, 0),
      mane2: maneP(72, 16, 20, 0.5),
      head: cubPts([
        [hx - 44, hy - 10, hx - 46, hy - 42, hx - 16, hy - 54, hx + 14, hy - 52],
        [hx + 14, hy - 52, hx + 40, hy - 50, hx + 58, hy - 34, hx + 60, hy - 10],
        [hx + 60, hy - 10, hx + 62, hy + 20, hx + 40, hy + 44, hx + 10, hy + 46],
        [hx + 10, hy + 46, hx - 24, hy + 46, hx - 44, hy + 22, hx - 44, hy - 10],
      ], 8),
      muzzle: cubPts([
        [hx + 16, hy + 8, hx + 30, hy - 4, hx + 64, hy - 2, hx + 74, hy + 12],
        [hx + 74, hy + 12, hx + 80, hy + 28, hx + 64, hy + 44, hx + 40, hy + 46],
        [hx + 40, hy + 46, hx + 20, hy + 46, hx + 10, hy + 30, hx + 16, hy + 8],
      ], 8),
    };
  })();
  const TL_ORDER = ['tail', 'tuft', 'legF', 'pawF', 'torso', 'haunch', 'hpaw', 'legN', 'pawN', 'mane', 'head', 'muzzle'];

  // 石台（漂浮的神殿基座）
  function tsSlab(g, x0, x1, P2, seed) {
    const top = -50;
    const front = [[x0, top], [x1, top], [x1 + 8, top + 10], [x1 + 8, top + 24]];
    const n = 7;
    for (let i = n; i >= 0; i--) {
      const x = lerp(x0 + 6, x1 + 8, i / n);
      front.push([x, top + 24 + 30 * (0.35 + hash(seed + i) * 0.4) * Math.sin(((i + 0.5) / (n + 1)) * PI)]);
    }
    front.push([x0 + 4, top + 22]);
    const gr = g.createLinearGradient(0, top, 0, top + 50);
    gr.addColorStop(0, A.c(TS.stoneS));
    gr.addColorStop(1, A.c(TS.stoneDD));
    g.fillStyle = gr;
    g.beginPath();
    poly(front)(g);
    g.fill();
    g.strokeStyle = A.outline();
    g.lineWidth = 1.8;
    g.lineJoin = 'round';
    g.stroke();
    sh(g, (c) => {
      c.moveTo(x0, top);
      c.lineTo(x1, top);
      c.lineTo(x1 + 8, top + 10);
      c.lineTo(x0 + 6, top + 10);
      c.closePath();
    }, TS.stoneL, null, { lw: 1.6 });
    // 正面的金色刻紋（回紋）
    g.strokeStyle = A.c(P2 ? '#f6d8a0' : TS.gold);
    g.globalAlpha *= 0.85;
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(x0 + 8, top + 14);
    g.lineTo(x1 + 6, top + 14);
    g.moveTo(x0 + 8, top + 21);
    g.lineTo(x1 + 6, top + 21);
    for (let x = x0 + 14; x < x1; x += 16) {
      g.moveTo(x, top + 21);
      g.lineTo(x, top + 16);
      g.lineTo(x + 6, top + 16);
      g.lineTo(x + 6, top + 19);
    }
    g.stroke();
    g.globalAlpha /= 0.85;
  }

  // 石像（快取）。第一階段：溫暖的石頭；crack：裂縫裡透出的星沙光
  function tsStone(g) {
    const L = TL;
    tsSlab(g, -182, 158, false, 3);
    const stoneGrad = (y0, y1) => {
      const gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, A.c(TS.stoneL));
      gr.addColorStop(0.45, A.c(TS.stone));
      gr.addColorStop(1, A.c(TS.stoneS));
      return gr;
    };
    const part = (pts, y0, y1, lw, dark) => {
      g.beginPath();
      poly(pts)(g);
      g.fillStyle = dark ? A.c(TS.stoneS) : stoneGrad(y0, y1);
      g.fill();
      g.strokeStyle = A.outline();
      g.lineWidth = lw || 2;
      g.lineJoin = 'round';
      g.stroke();
    };
    // 尾巴：沿著石台繞到前面，末端一撮捲起
    part(L.tail, -120, -50, 1.8, true);
    part(L.tuft, -134, -106, 1.8);
    part(L.legF, -170, -50, 1.8, true);
    part(L.pawF, -70, -46, 1.8, true);
    part(L.torso, -224, -50, 2.2);
    // 身體的刻線：肩胛、肋
    g.strokeStyle = A.c(TS.stoneD);
    g.lineWidth = 1.3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(34, -206);
    g.quadraticCurveTo(70, -170, 70, -110);
    g.moveTo(-20, -196);
    g.quadraticCurveTo(0, -150, -8, -96);
    g.stroke();
    part(L.haunch, -164, -48, 2.2);
    g.strokeStyle = A.c(TS.stoneD);
    g.beginPath();
    g.arc(-94, -106, 50, -2.4, -1.0);
    g.stroke();
    part(L.hpaw, -70, -46, 1.8);
    part(L.legN, -168, -50, 2);
    part(L.pawN, -70, -46, 1.8);
    // 腳趾的刻線、金色的腕環
    g.strokeStyle = A.c(TS.stoneD);
    g.lineWidth = 1.2;
    g.beginPath();
    [98, 108, 118, -38, -26].forEach((x) => {
      g.moveTo(x, -64);
      g.lineTo(x + 1, -50);
    });
    g.stroke();
    [[76, -98, 44], [22, -100, 36]].forEach(([x, y, w], i) => {
      g.fillStyle = A.c(i ? TS.goldD : TS.gold);
      g.fillRect(x, y, w, 6);
      g.strokeStyle = A.outline();
      g.lineWidth = 1.1;
      g.strokeRect(x, y, w, 6);
    });
    // 鬃：兩層放射的石雕（像日輪）
    part(L.mane, -360, -140, 2.2);
    g.save();
    g.beginPath();
    poly(L.mane)(g);
    g.clip();
    g.strokeStyle = A.c(TS.stoneS);
    g.lineWidth = 1.4;
    g.beginPath();
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * TAU;
      g.moveTo(L.hx - 14 + Math.cos(a) * 76, L.hy + 8 + Math.sin(a) * 72);
      g.lineTo(L.hx - 14 + Math.cos(a) * 118, L.hy + 8 + Math.sin(a) * 112);
    }
    g.stroke();
    g.restore();
    part(L.mane2, -340, -160, 1.6);
    g.save();
    g.beginPath();
    poly(L.mane2)(g);
    g.clip();
    g.strokeStyle = A.c(TS.stoneS);
    g.lineWidth = 1.2;
    g.beginPath();
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * TAU + PI / 32;
      g.moveTo(L.hx - 14 + Math.cos(a) * 54, L.hy + 8 + Math.sin(a) * 52);
      g.lineTo(L.hx - 14 + Math.cos(a) * 88, L.hy + 8 + Math.sin(a) * 84);
    }
    g.stroke();
    g.restore();
    // 頸下的金色領環（刻著錶的刻度）
    g.save();
    g.strokeStyle = A.c(TS.gold);
    g.lineWidth = 2;
    g.beginPath();
    g.arc(L.hx - 14, L.hy + 8, 60, 0.35, 2.2);
    g.stroke();
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = 0.35 + (i / 12) * 1.85;
      g.moveTo(L.hx - 14 + Math.cos(a) * 60, L.hy + 8 + Math.sin(a) * 60);
      g.lineTo(L.hx - 14 + Math.cos(a) * 66, L.hy + 8 + Math.sin(a) * 66);
    }
    g.stroke();
    g.restore();
    // 臉：寬額、長鼻樑，一切都很安靜
    part(L.head, -306, -204, 2.2);
    g.fillStyle = 'rgba(255,248,230,0.35)';
    g.beginPath();
    g.moveTo(L.hx - 36, L.hy - 30);
    g.quadraticCurveTo(L.hx, L.hy - 56, L.hx + 44, L.hy - 36);
    g.lineTo(L.hx + 20, L.hy - 20);
    g.closePath();
    g.fill();
    g.beginPath();
    poly(L.muzzle)(g);
    g.fillStyle = stoneGrad(-262, -200);
    g.fill();
    g.strokeStyle = A.outline();
    g.lineWidth = 1.6;
    g.beginPath();
    const mz = L.muzzle;
    const i0 = Math.floor(mz.length * 0.2);
    const i1 = Math.floor(mz.length * 0.62);
    for (let i = i0; i <= i1; i++) (i > i0 ? g.lineTo : g.moveTo).call(g, mz[i][0], mz[i][1]);
    g.stroke();
    // 鼻樑與鼻
    g.strokeStyle = A.c(TS.stoneD);
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(L.hx + 22, L.hy - 22);
    g.quadraticCurveTo(L.hx + 30, L.hy - 6, L.hx + 52, L.hy + 2);
    g.stroke();
    sh(g, (c) => {
      c.moveTo(L.hx + 56, L.hy + 2);
      c.quadraticCurveTo(L.hx + 70, L.hy - 1, L.hx + 76, L.hy + 9);
      c.quadraticCurveTo(L.hx + 70, L.hy + 17, L.hx + 60, L.hy + 14);
      c.closePath();
    }, TS.stoneD, TS.stoneDD, { lw: 1.4, shadeY: L.hy + 10 });
    // 額上的楓葉印（守葉獸的記號）
    sh(g, (c) => A.mapleLeafPath(c, L.hx + 4, L.hy - 32, 10), TS.gold, TS.goldD, { lw: 1.3, cel: [1.5, 1.5] });
    // 風化的斑點與細裂
    g.fillStyle = A.c(TS.stoneS);
    for (let i = 0; i < 30; i++) {
      const x = -150 + hash(i + 900) * 260;
      const y = -210 + hash(i + 910) * 150;
      g.globalAlpha = 0.35;
      g.beginPath();
      g.arc(x, y, 0.8 + hash(i + 920) * 1.6, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  // 裂縫（快取）：深色的線＋裡面的星沙光
  const TS_CRACKS = [
    [[-146, -96], [-128, -112], [-104, -120]],
    [[-40, -212], [-30, -190], [-44, -170], [-30, -140]],
    [[-24, -138], [-30, -110], [-10, -96]],
    [[40, -214], [52, -196], [44, -176]],
    [[-160, -70], [-140, -60]],
    [[18, -262], [8, -242], [16, -226]],
    [[110, -176], [96, -150], [104, -124]],
  ];
  const TS_CRACKS2 = [
    [[-140, -130], [-100, -176], [-40, -190]],
    [[110, -176], [90, -210], [60, -250]],
    [[-60, -300], [-20, -276], [-30, -236]],
    [[-80, -80], [-40, -100], [0, -80]],
    [[120, -100], [140, -150], [150, -200]],
  ];
  function tsCracks(g, big) {
    const lines = big ? TS_CRACKS.concat(TS_CRACKS2) : TS_CRACKS;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    lines.forEach((ln) => ln.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))));
    g.strokeStyle = rgba('255,220,150', big ? 0.5 : 0.25);
    g.lineWidth = big ? 6 : 4;
    g.stroke();
    g.strokeStyle = A.c(TS.stoneDD);
    g.lineWidth = 1.8;
    g.stroke();
    g.strokeStyle = rgba('255,236,180', 0.9);
    g.lineWidth = big ? 1.2 : 0.8;
    g.stroke();
  }
  // 第二階段（快取）：石殼碎了，剪影裡是星空；還剩半張臉、前腳、後腿的石殼
  function tsCosmos(g) {
    const L = TL;
    const U = (c) => TL_ORDER.forEach((n) => poly(L[n])(c));
    g.save();
    g.lineJoin = 'round';
    g.beginPath();
    U(g);
    g.strokeStyle = 'rgba(200,150,255,0.45)';
    g.lineWidth = 12;
    g.stroke();
    g.strokeStyle = A.outline();
    g.lineWidth = 4.8;
    g.stroke();
    g.clip();
    const bg = g.createRadialGradient(-10, -170, 10, -20, -160, 260);
    bg.addColorStop(0, '#5a3aa8');
    bg.addColorStop(0.45, '#241860');
    bg.addColorStop(1, '#0a0620');
    g.fillStyle = bg;
    g.fillRect(-230, -380, 420, 360);
    g.globalCompositeOperation = 'lighter';
    [[-90, -120, 110, '255,110,200', 0.28], [40, -180, 120, '90,190,255', 0.22], [-30, -240, 90, '160,130,255', 0.3]].forEach(([x, y, r, c, a]) => glow(g, x, y, r, c, a));
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 140; i++) {
      const x = -220 + hash(i + 1000) * 400;
      const y = -370 + hash(i + 1010) * 340;
      g.fillStyle = rgba('255,248,228', 0.3 + hash(i + 1020) * 0.7);
      g.beginPath();
      g.arc(x, y, 0.5 + hash(i + 1030) * 1.4, 0, TAU);
      g.fill();
    }
    // 裡面轉動的齒輪（淡淡的金線）
    g.strokeStyle = 'rgba(240,205,130,0.4)';
    g.lineWidth = 1.2;
    [[-70, -120, 50, 12], [4, -160, 34, 9], [60, -96, 26, 8], [-120, -70, 28, 8]].forEach(([x, y, r, n]) => {
      g.beginPath();
      gearPath(g, x, y, r, n, 0);
      g.stroke();
    });
    // 星座線：沿著獅子的骨架
    const cons = [[-196, -120], [-150, -150], [-94, -106], [-30, -58], [-40, -200], [40, -214], [96, -160], [100, -62], [44, -58], [34, -150]];
    g.strokeStyle = 'rgba(255,230,160,0.7)';
    g.lineWidth = 1.2;
    g.beginPath();
    [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [6, 7], [5, 9], [9, 8]].forEach(([a, b]) => {
      g.moveTo(cons[a][0], cons[a][1]);
      g.lineTo(cons[b][0], cons[b][1]);
    });
    g.stroke();
    cons.forEach(([x, y]) => {
      glow(g, x, y, 9, '255,240,200', 0.8);
      sparkle(g, x, y, 4, '#ffffff');
    });
    g.restore();
    // 還黏在身上的石殼
    const shell = (clipPts, part) => {
      g.save();
      g.beginPath();
      poly(clipPts)(g);
      g.clip();
      const gr = g.createLinearGradient(0, -320, 0, -40);
      gr.addColorStop(0, A.c(TS.stoneL));
      gr.addColorStop(1, A.c(TS.stoneS));
      g.beginPath();
      poly(part)(g);
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = A.outline();
      g.lineWidth = 2;
      g.stroke();
      g.restore();
      // 斷面：亮金色的邊
      g.save();
      g.beginPath();
      poly(part)(g);
      g.clip();
      g.beginPath();
      poly(clipPts)(g);
      g.strokeStyle = 'rgba(255,220,150,0.8)';
      g.lineWidth = 4;
      g.stroke();
      g.strokeStyle = A.outline();
      g.lineWidth = 1.6;
      g.stroke();
      g.restore();
    };
    const hx = L.hx;
    const hy = L.hy;
    shell([[hx - 60, hy - 70], [hx + 90, hy - 70], [hx + 90, hy + 60], [hx - 10, hy + 60], [hx - 22, hy + 34], [hx - 8, hy + 12], [hx - 30, hy - 8], [hx - 14, hy - 36]], L.head);
    shell([[hx + 8, hy - 10], [hx + 100, hy - 10], [hx + 100, hy + 60], [hx + 8, hy + 60]], L.muzzle);
    shell([[70, -130], [140, -130], [140, -30], [70, -30], [74, -60], [96, -76], [84, -100]], L.pawN);
    shell([[-200, -140], [-120, -160], [-96, -130], [-116, -110], [-100, -80], [-200, -40]], L.haunch);
    // 鼻、楓葉印
    sh(g, (c) => {
      c.moveTo(hx + 56, hy + 2);
      c.quadraticCurveTo(hx + 70, hy - 1, hx + 76, hy + 9);
      c.quadraticCurveTo(hx + 70, hy + 17, hx + 60, hy + 14);
      c.closePath();
    }, TS.stoneDD, null, { lw: 1.4 });
    sh(g, (c) => A.mapleLeafPath(c, hx + 4, hy - 32, 10), '#ffe9a0', '#f0b050', { lw: 1.3, cel: [1.5, 1.5] });
  }
  // 星系（快取）：放在鬃的位置慢慢轉
  function tsGalaxy(g) {
    glow(g, 0, 0, 80, '255,150,220', 0.35);
    for (let arm = 0; arm < 3; arm++) {
      for (let i = 0; i < 30; i++) {
        const q = i / 30;
        const a = arm * (TAU / 3) + q * 4.2;
        const r = 8 + q * 80;
        g.fillStyle = rgba(arm === 1 ? '255,200,240' : '215,205,255', 0.9 - q * 0.6);
        g.beginPath();
        g.arc(Math.cos(a) * r, Math.sin(a) * r * 0.9, 2.4 - q * 1.2, 0, TAU);
        g.fill();
      }
    }
    glow(g, 0, 0, 18, '255,250,230', 0.9);
  }

  function timeItselfRaw(ctx, m) {
    const t = m.t || 0;
    const st = m.state;
    const K = (m.h || 380) / 380;
    const p2 = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    const P2 = p2 > 0.5;
    const k = prog(m);
    const portrait = m.x === 0 && m.y === 0 && st === 'recover';
    const dead = !!m.dead;
    const deadT = m.deadT || 0;
    const bob = Math.sin(t * 1.2) * 6;

    // ── 姿勢 ──
    let glowK = 0;
    let eyeK = 0;
    let spin = 0;
    let shake = 0;
    let hot = 0; // 十二時：數字發光
    const idleA = [-PI * 0.78 + Math.sin(t * 0.8) * 0.08, -PI * 0.2 + Math.sin(t * 0.9 + 1) * 0.08, Math.floor(t * 2) * (TAU / 60), PI * 0.18 + Math.sin(t * 0.7) * 0.06];
    let A4 = idleA.slice();
    let hide = -1; // 被預警畫走的那根針
    const dirL = m.dir || 1;
    const loc = (wx) => ((wx - (m.x || 0)) * dirL) / K;
    const toGround = (wx) => Math.atan2(228 + bob, loc(wx));
    let ts = t; // 星沙的時間：時停時凍住、倒轉時往回流
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
      glowK = 0.5;
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
      spin = k * k * t * 2;
    }
    if (dead) A4 = [PI * 0.55, PI * 0.45, PI * 0.6, PI * 0.4];
    // 眼睛只在預警與出招時睜開（預警一開始就很快睜大），平常閉著
    const ATK_ST = ['sweepPrep', 'sweep', 'stab', 'stopPrep', 'stop', 'rewindPrep', 'rewind', 'clockworkPrep', 'clockwork', 'echo', 'transform'];
    const openK = dead || portrait || !ATK_ST.includes(st) ? 0 : /Prep$/.test(st) ? clamp(k * 5, 0.25, 1) : 1;
    const intro = st === 'intro' ? k * k * (3 - 2 * k) : 1;
    const fade = dead ? Math.max(0, 1 - deadT * 0.7) : 1;
    const ghost = A.mode === 'tint';

    ctx.save();
    ctx.scale(K, K);
    if (portrait) ctx.translate(-50, 120);
    ctx.translate(shake, bob);
    const S = devScale(ctx);
    const ga = ctx.globalAlpha;

    // ── 身後：日蝕、錶環、星盤環、流光、細沙 ──
    if (!ghost) {
      ctx.save();
      ctx.translate(0, -228);
      const sc0 = (st === 'intro' ? 0.7 + 0.3 * intro : 1) * (dead ? 1 + deadT * 0.25 : 1);
      ctx.scale(sc0, sc0);
      ctx.globalAlpha = ga * intro * fade;
      const pk = P2 ? 2 : 1;
      const wild = P2 ? 1 : 0;
      const rt = ts; // 環跟著星沙的時間轉
      // 日蝕
      ctx.save();
      ctx.rotate(rt * 0.02);
      blit(ctx, sprite('tsEcl' + pk, S * sc0, -250, -250, 500, 500, (g) => tsEclipse(g, P2), true));
      ctx.restore();
      if (glowK > 0) glow(ctx, 0, 0, 200, P2 ? '255,140,220' : '255,220,150', 0.25 * glowK);
      // 傾斜的星盤環（前後兩條，速度、傾角都不一樣）
      const band = (R, glyphs, axis, squash, rot, a) => {
        ctx.save();
        ctx.globalAlpha = ga * intro * fade * a;
        ctx.rotate(axis);
        ctx.scale(1, squash);
        ctx.rotate(rot);
        blit(ctx, sprite('tsBand' + R + pk, S * sc0, -R - 20, -R - 20, R * 2 + 40, R * 2 + 40, (g) => tsBand(g, P2, R, glyphs), true));
        ctx.restore();
      };
      band(246, true, -0.38 + wild * Math.sin(t * 0.9) * 0.3, 0.3 + wild * 0.1 * Math.sin(t * 1.3), rt * 0.12 + spin * 0.3 + wild * t * 0.9, 0.8);
      band(222, false, 0.52 + wild * Math.sin(t * 0.7 + 1) * 0.35, 0.2, -rt * 0.09 - spin * 0.2 - wild * t * 1.3, 0.65);
      // 齒輪環
      ctx.save();
      ctx.globalAlpha = ga * intro * fade * 0.8;
      ctx.rotate(-rt * 0.04 - spin * 0.15 - wild * t * 0.7);
      blit(ctx, sprite('tsGear' + pk, S * sc0, -220, -220, 440, 440, (g) => tsGear(g, P2), true));
      ctx.restore();
      // 主錶盤（數字）
      ctx.save();
      ctx.rotate(wild * (Math.sin(t * 0.8) * 0.4 + t * 0.35) + spin * 0.05);
      blit(ctx, sprite('tsDial' + pk + (dirL < 0 ? 'f' : ''), S * sc0, -190, -190, 380, 380, (g) => tsDial(g, P2, dirL < 0 ? -1 : 1, false), true));
      if (hot > 0) {
        ctx.globalAlpha = ga * intro * fade * hot * (0.7 + 0.3 * Math.sin(t * 8));
        blit(ctx, sprite('tsDialH' + pk + (dirL < 0 ? 'f' : ''), S * sc0, -190, -190, 380, 380, (g) => tsDial(g, P2, dirL < 0 ? -1 : 1, true), true));
      }
      ctx.restore();
      // 內圈的小星盤環
      band(128, false, 0.95 + wild * t * 0.5, 0.5, rt * 0.3 + spin * 0.5 + wild * t * 2, 0.55);
      ctx.restore();

      // 像水一樣流下來的光（虛線跟著星沙的時間流動；時停不動、倒轉往上流）
      ctx.save();
      ctx.globalAlpha = ga * intro * fade;
      ctx.lineCap = 'round';
      const streams = [
        [-150, -420, -300, -240, -120, -40, -40, 20],
        [150, -430, 290, -250, 110, -60, 40, 24],
        [-60, -440, -200, -330, -60, -140, -110, 10],
      ];
      streams.forEach((s, i) => {
        if (i === 2 && !P2) return;
        ctx.beginPath();
        ctx.moveTo(s[0], s[1]);
        ctx.bezierCurveTo(s[2], s[3], s[4], s[5], s[6], s[7]);
        ctx.strokeStyle = rgba(P2 ? '220,170,255' : '255,236,190', 0.1);
        ctx.lineWidth = 12;
        ctx.stroke();
        ctx.setLineDash([60, 26, 14, 30]);
        ctx.lineDashOffset = -ts * (50 + i * 12);
        ctx.strokeStyle = rgba(P2 ? '240,210,255' : '255,246,220', 0.55);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.setLineDash([]);
      });
      ctx.restore();
    }

    // 四根時針（在石獅後面，伸得比身體長）
    ctx.save();
    ctx.globalAlpha = ga * intro;
    ctx.translate(0, -228);
    const kinds = ['hour', 'minute', 'second', 'fate'];
    for (let i = 3; i >= 0; i--) {
      if (i === hide) continue;
      ctx.save();
      ctx.rotate(A4[i]);
      const gk = glowK * (i === 2 ? 0.4 : 1);
      if (gk > 0 && !ghost) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = P2 ? rgba('255,170,230', 0.4 * gk) : rgba('255,225,140', 0.4 * gk);
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(TS_HANDS[kinds[i]].len, 0);
        ctx.stroke();
        ctx.restore();
      }
      blit(ctx, sprite('tsHand' + kinds[i] + (P2 ? 2 : 1), S, -60, -24, TS_HANDS[kinds[i]].len + 70, 48, (g) => tsHand(g, kinds[i], P2)));
      ctx.restore();
    }
    ell(ctx, 0, 0, 13, 13, TS.gold, TS.goldD, { lw: 1.6, hl: false, cel: [2, 2] });
    ell(ctx, 0, 0, 5, 5, P2 ? '#ff9ad8' : '#fff0c4', null, { lw: 1.2, hl: false });
    ctx.restore();

    // ── 石像 ──
    const hx = TL.hx;
    const hy = TL.hy;
    ctx.save();
    if (st === 'intro') {
      ctx.globalAlpha = ga * (0.1 + 0.9 * intro);
      ctx.translate(0, (1 - intro) * 30);
    }
    const sandFall = (x, y, w, len, seed) => {
      if (dead || ghost) return;
      const g2 = ctx.createLinearGradient(0, y, 0, y + len);
      g2.addColorStop(0, 'rgba(255,230,160,0.16)');
      g2.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x + w * 0.8, y + len);
      ctx.lineTo(x - w * 0.8, y + len);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const q = (((ts * 0.9 + hash(seed + i)) % 1) + 1) % 1;
        dot(x + (hash(seed + i + 5) - 0.5) * w * (1 + q), y + q * len, 1 + hash(seed + i + 2), 1 - q);
      }
      dotFlush(ctx, '#fff0b0');
    };
    if (!P2) {
      blit(ctx, sprite('tsStone', S, -230, -370, 410, 400, (g) => tsStone(g)));
      // 裂縫：平常就有細細的金光，變身時裂開
      const crackGrow = clamp(p2 * 2, 0, 1);
      ctx.save();
      ctx.globalAlpha = ga * (0.55 + glowK * 0.35 + Math.sin(t * 2) * 0.1);
      blit(ctx, sprite('tsCrk', S, -210, -310, 380, 300, (g) => tsCracks(g, false)));
      if (crackGrow > 0) {
        ctx.globalAlpha = ga * crackGrow;
        blit(ctx, sprite('tsCrk2', S, -210, -310, 380, 300, (g) => tsCracks(g, true)));
      }
      ctx.restore();
      sandFall(-40, -8, 14, 60, 11);
      sandFall(80, -14, 10, 48, 23);
    } else {
      // 碎成三塊的石台
      [[-182, -80, 18, 0, 3], [-70, 40, 26, 1.3, 7], [52, 158, 14, 2.6, 11]].forEach(([x0, x1, dy, ph, sd]) => {
        const fl = Math.sin(t * 1.1 + ph) * 6 + (dead ? deadT * 40 : 0);
        ctx.save();
        ctx.translate((x0 + x1) / 2, dy + fl);
        ctx.rotate(Math.sin(t * 0.7 + ph) * 0.06 + (ph - 1.3) * 0.05);
        ctx.translate(-(x0 + x1) / 2, 0);
        blit(ctx, sprite('tsSlab' + sd, S, x0 - 4, -54, x1 - x0 + 20, 60, (g) => tsSlab(g, x0, x1, true, sd)));
        ctx.restore();
        sandFall((x0 + x1) / 2, dy + fl + 6, 12, 60, sd * 3);
      });
      blit(ctx, sprite('tsCosmos', S, -236, -384, 420, 364, (g) => tsCosmos(g)));
      if (!ghost) {
        // 鬃的位置：一團慢慢轉的星系
        ctx.save();
        ctx.translate(-40, -140);
        ctx.rotate(t * 0.3);
        ctx.scale(0.9, 0.75);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = ga * 0.8 * fade;
        blit(ctx, sprite('tsGal', S, -90, -90, 180, 180, (g) => tsGalaxy(g), true));
        ctx.restore();
        // 星空裡流動的星沙
        for (let i = 0; i < 30; i++) {
          const q = (((ts * 0.2 + hash(i + 600)) % 1) + 1) % 1;
          const path = i % 2 ? [40, -200, 110, -150, 100, -64] : [-40, -210, -150, -150, -60, -60];
          const p = qpt(path, q);
          dot(p[0] + (hash(i) - 0.5) * 14, p[1], 1.2 + hash(i + 3) * 1.2, Math.sin(q * PI) * fade);
        }
        dotFlush(ctx, '#ffe9a0');
        // 周圍漂浮的石殼碎片
        ctx.fillStyle = A.c(TS.stone);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 9; i++) {
          const a = t * (0.2 + hash(i) * 0.2) + i * 0.7;
          const r = 190 + hash(i + 3) * 60 + (dead ? deadT * 80 : 0);
          const x = Math.cos(a) * r;
          const y = -180 + Math.sin(a) * r * 0.55;
          const s = 4 + hash(i + 5) * 6;
          const rot = t * (hash(i + 8) - 0.5) * 2 + i;
          const c = Math.cos(rot);
          const sn = Math.sin(rot);
          const P = [[-s, -s * 0.4], [-s * 0.2, -s], [s, -s * 0.3], [s * 0.5, s * 0.8], [-s * 0.7, s * 0.6]];
          ctx.beginPath();
          P.forEach(([px, py], j) => {
            const X = x + px * c - py * sn;
            const Y = y + px * sn + py * c;
            j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    // 變身：石殼碎片往外飛
    if (st === 'transform' && !ghost) {
      ctx.fillStyle = A.c(TS.stoneS);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 12; i++) {
        const q = clamp(k * 1.6 - hash(i + 60) * 0.6, 0, 1);
        if (q <= 0) continue;
        const a = hash(i + 61) * TAU;
        const x = -20 + Math.cos(a) * (40 + q * 200);
        const y = -170 + Math.sin(a) * (30 + q * 140) + q * q * 60;
        const s = 5 + hash(i + 62) * 8;
        ctx.globalAlpha = ga * (1 - q);
        ctx.beginPath();
        ctx.moveTo(x - s, y);
        ctx.lineTo(x, y - s * 0.8);
        ctx.lineTo(x + s, y + s * 0.2);
        ctx.lineTo(x - s * 0.2, y + s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = ga;
    }

    // ── 臉：閉著的眼、預警時睜開的光 ──
    const roar = !dead && (eyeK > 0.6 || st === 'transform');
    if (roar) {
      const mouth = (c) => {
        c.moveTo(hx + 22, hy + 30);
        c.quadraticCurveTo(hx + 48, hy + 24, hx + 70, hy + 28);
        c.quadraticCurveTo(hx + 56, hy + 46, hx + 30, hy + 40);
        c.closePath();
      };
      sh(ctx, mouth, TS.void, null, { lw: 1.6 });
      if (!ghost) {
        ctx.save();
        ctx.beginPath();
        mouth(ctx);
        ctx.clip();
        glow(ctx, hx + 46, hy + 34, 20, P2 ? '255,160,230' : '255,220,140', 0.8);
        ctx.restore();
      }
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 34, hy + 33);
      ctx.quadraticCurveTo(hx + 50, hy + 35, hx + 64, hy + 31);
      ctx.stroke();
    }
    const eyes = [[hx + 4, hy - 8, 1.15, 1], [hx + 38, hy - 10, 0.92, -1]];
    eyes.forEach(([x, y, s, d]) => {
      const col = P2 ? '225,190,255' : '255,220,130';
      if (dead || openK <= 0.02) {
        // 闔著的眼：石刻的眼瞼，縫裡透一點點光
        if (!dead && !ghost) {
          ctx.strokeStyle = rgba(col, 0.7);
          ctx.lineWidth = 1.4 * s;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - 10 * s, y + 1 * s * d);
          ctx.quadraticCurveTo(x, y + 6 * s, x + 10 * s, y + 2 * s * d);
          ctx.stroke();
        }
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 12 * s, y - 1 * s * d);
        ctx.quadraticCurveTo(x, y + 5 * s, x + 12 * s, y + 1 * s * d);
        ctx.stroke();
      } else {
        const hs = openK;
        if (!ghost) glow(ctx, x, y, (26 + eyeK * 22) * s, col, (0.6 + eyeK * 0.35) * hs);
        const eyeP = (c) => {
          c.moveTo(x - 12 * s, y - 1 * s * d);
          c.quadraticCurveTo(x, y - 8 * s * hs, x + 12 * s, y + 1 * s * d);
          c.quadraticCurveTo(x, y + 7 * s * hs, x - 12 * s, y - 1 * s * d);
          c.closePath();
        };
        // 沒有眼白、沒有瞳孔：整顆是光
        const flashE = m.hurtFlash > 0.05;
        const ig = ctx.createRadialGradient(x, y, 0.5 * s, x, y, 12 * s);
        ig.addColorStop(0, A.c('#ffffff'));
        ig.addColorStop(0.35, A.c(P2 ? '#f0dcff' : '#fff2b8'));
        ig.addColorStop(1, A.c(P2 ? '#a070f0' : '#f0a830'));
        ctx.beginPath();
        eyeP(ctx);
        ctx.fillStyle = flashE ? '#ffffff' : ig;
        ctx.fill();
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round';
        ctx.stroke();
        if (openK > 0.5 && (P2 || eyeK > 0.6) && !ghost) {
          ctx.strokeStyle = rgba(col, 0.65);
          ctx.lineWidth = 2.2 * s;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - 10 * s, y);
          ctx.quadraticCurveTo(x - 26 * s, y - 4 + Math.sin(t * 6) * 2, x - 42 * s, y - 12);
          ctx.stroke();
        }
      }
      // 石眉：一道平靜的刻線
      ctx.strokeStyle = A.c(TS.stoneD);
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 13 * s, y - 10 * s + (d < 0 ? 1 : 0));
      ctx.quadraticCurveTo(x, y - 16 * s, x + 13 * s, y - 11 * s + (d < 0 ? 0 : 1));
      ctx.stroke();
    });
    if (!dead && (P2 || glowK > 0.3) && !ghost) glow(ctx, hx + 4, hy - 32, 30, '255,230,150', 0.45);
    ctx.restore(); // 出現的淡入

    // 身體下方飄出的細沙（懸空）
    if (!dead && !ghost) {
      for (let i = 0; i < 22; i++) {
        const q = (((ts * 0.35 + hash(i + 11)) % 1) + 1) % 1;
        dot(-180 + hash(i) * 360 + Math.sin(q * 5 + i) * 10, 10 - q * 60 - hash(i + 30) * 380, 1 + hash(i + 2) * 1.3, Math.sin(q * PI) * 0.7 * intro);
      }
      dotFlush(ctx, P2 ? '#f0dcff' : '#ffe9a0');
    }
    ctx.restore();
  }
  const timeItself = inkWrap(timeItselfRaw, TS.ink);

  Object.assign(A.MONSTER_DRAW, { frostSpirit, timeItself });
})();
