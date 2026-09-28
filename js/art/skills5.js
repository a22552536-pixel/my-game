// 五轉技能圖示：冥道殘月破、地爆天星。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;

  function glow(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  Object.assign(A.ICON, {
    // 黑色的殘月，外緣發著紫白光，後面是張開的冥道
    meidou(ctx) {
      glow(ctx, 2, 0, 19, '160,120,255', 0.55);
      A.shape(ctx, (c) => c.arc(4, 0, 11, 0, TAU), '#0a0612', null, { lw: 2, hl: false });
      ctx.strokeStyle = A.c('#c8b0ff');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(4, 0, 11, 0, TAU);
      ctx.stroke();
      A.shape(ctx, (c) => {
        c.arc(-2, 0, 15, -Math.PI / 2, Math.PI / 2);
        c.arc(-8, 0, 13.8, Math.PI / 2, -Math.PI / 2, true);
        c.closePath();
      }, '#140a24', null, { lw: 2, hl: false });
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-2, 0, 15, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = A.c('#ffffff');
      [[5, -4], [8, 3], [2, 5], [6, -8]].forEach(([x, y]) => ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6));
    },
    // 冷色的岩石星球（多面碎岩、左上受光）＋一道細的黑閃裂紋（黑芯、暗紅細邊）
    chibaku(ctx) {
      glow(ctx, 0, 0, 20, '150,170,210', 0.3);
      A.shape(ctx, (c) => c.arc(0, 1, 13, 0, TAU), '#4a4f59', '#2a2d34', { lw: 2, hl: false });
      // 幾塊受光的石面（左上亮、右下暗）
      const plate = (pts, col) => {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.fillStyle = A.c(col);
        ctx.fill();
        ctx.strokeStyle = A.c('#1c1e24');
        ctx.lineWidth = 0.8;
        ctx.stroke();
      };
      plate([[-11, -4], [-6, -10], [0, -11], [-2, -4], [-8, 0]], '#8a93a3');
      plate([[1, -11], [8, -8], [6, -2], [-1, -3]], '#6c7483');
      plate([[-11, 0], [-6, 2], [-5, 9], [-10, 6]], '#5d6472');
      plate([[7, 0], [12, 3], [8, 10], [3, 8]], '#353941');
      plate([[-3, 5], [3, 9], [-1, 13], [-5, 11]], '#3e434c');
      ctx.strokeStyle = A.c('#c8d2e4');
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 1, 11.4, Math.PI * 1.08, Math.PI * 1.42);
      ctx.stroke();
      // 黑閃：從右上劈進石球、在中間分岔
      const crack = (pts, w) => {
        ctx.lineJoin = 'miter';
        ctx.lineCap = 'round';
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.strokeStyle = A.c('#c8102c');
        ctx.lineWidth = w + 1.1;
        ctx.stroke();
        ctx.strokeStyle = A.c('#060206');
        ctx.lineWidth = w;
        ctx.stroke();
      };
      crack([[17, -15], [12, -10], [13, -7], [7, -4], [5, 1], [0, 2], [-2, 6], [-7, 8]], 1.6);
      crack([[5, 1], [7, 6], [5, 9]], 0.8);
      crack([[12, -10], [16, -8]], 0.7);
      crack([[0, 2], [-5, -1]], 0.7);
    },
  });
})();

// ═════════ 地爆天星：寫實、冰冷、沉重的岩石特效 ═════════
// 石頭是事先畫好的一組多面碎岩圖（玄武岩、板岩、深灰、灰褐），之後只做旋轉縮放貼圖。
// 被吸住的石頭一顆顆「鎖」進離屏畫布（烘焙），石球每幀只貼兩三張圖。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  let seed = 7331;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const rr = (a, b) => a + (b - a) * rnd();
  const ri = (a, b) => Math.floor(rr(a, b + 1));
  const mk = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h || w;
    return c;
  };
  // 光從左上前方來
  const L3 = (() => {
    const v = [-0.5, -0.68, 0.55];
    const l = Math.hypot(v[0], v[1], v[2]);
    return v.map((q) => q / l);
  })();
  const HI = [172, 184, 204]; // 冷藍灰的受光面
  const LO = [8, 9, 13]; // 背光面
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const rgb = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')';
  const ROCK = [[66, 69, 76], [70, 77, 88], [64, 64, 67], [74, 68, 62], [54, 57, 64]]; // 玄武岩、板岩、深灰、灰褐、深玄武
  const EARTH = [[64, 56, 49], [56, 51, 46]]; // 撕下來的土塊（去飽和的深褐）
  // 明暗：l 從 -1 到 1，背光沉到近黑，受光推向冷灰藍
  const tone = (base, l, hiK) => {
    const t = Math.max(0.12, Math.min(1, (l + 0.25) / 1.15));
    return t < 0.5 ? mix(LO, base, t * 2) : mix(base, HI, (t - 0.5) * 2 * hiK);
  };

  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [];
    const up = [];
    for (const q of p) {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
      lo.push(q);
    }
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
      up.push(q);
    }
    lo.pop();
    up.pop();
    return lo.concat(up);
  }
  // 用一條直線把凸多邊形切成兩塊
  function split(poly, px, py, nx, ny) {
    const a = [];
    const b = [];
    for (let i = 0; i < poly.length; i++) {
      const c = poly[i];
      const d = poly[(i + 1) % poly.length];
      const dc = (c[0] - px) * nx + (c[1] - py) * ny;
      const dd = (d[0] - px) * nx + (d[1] - py) * ny;
      (dc >= 0 ? a : b).push(c);
      if (dc >= 0 !== dd >= 0) {
        const t = dc / (dc - dd);
        const q = [c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t];
        a.push(q);
        b.push(q);
      }
    }
    return [a, b];
  }
  const area = (p) => {
    let s = 0;
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length];
      s += p[i][0] * q[1] - q[0] * p[i][1];
    }
    return Math.abs(s / 2);
  };
  const centroid = (p) => {
    let x = 0;
    let y = 0;
    p.forEach((q) => {
      x += q[0];
      y += q[1];
    });
    return [x / p.length, y / p.length];
  };

  // 外形：稜角分明、帶崩口的多邊形
  function shape(type) {
    let n, ax = 1, ay = 1, j0 = 0.8;
    if (type === 'slab') { n = ri(6, 8); ax = rr(1.35, 1.7); ay = rr(0.48, 0.66); j0 = 0.84; }
    else if (type === 'shard') { n = ri(4, 6); ax = rr(1.1, 1.45); ay = rr(0.5, 0.8); j0 = 0.6; }
    else if (type === 'gravel') { n = ri(5, 7); j0 = 0.66; }
    else if (type === 'clump') { n = ri(11, 14); ax = rr(1.1, 1.3); ay = rr(0.72, 0.88); j0 = 0.7; }
    else n = ri(8, 11);
    const tilt = rr(-0.5, 0.5);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = ((i + rr(-0.3, 0.3)) / n) * TAU;
      let r = rr(j0, 1);
      if (type !== 'gravel' && rnd() < 0.18) r *= 0.72; // 崩掉一角
      const x = Math.cos(a) * r * ax;
      const y = Math.sin(a) * r * ay;
      pts.push([x * ct - y * st, x * st + y * ct]);
    }
    let m = 0;
    pts.forEach((p) => (m = Math.max(m, Math.hypot(p[0], p[1]))));
    return pts.map((p) => [p[0] / m, p[1] / m]);
  }
  const path = (c, pts, R, cx, cy) => {
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(cx + p[0] * R, cy + p[1] * R) : c.moveTo(cx + p[0] * R, cy + p[1] * R)));
    c.closePath();
  };

  // 一顆碎岩：隨機切出的平面（各自受光不同）、層理、裂縫、顆粒、朝光的冷色稜線
  function makeRock(type) {
    const R = type === 'gravel' ? 22 : 48;
    const pad = type === 'clump' ? 1.5 : 1.1;
    const S = Math.ceil(R * 2 * pad);
    const cv = mk(S);
    const c = cv.getContext('2d');
    const cx = S / 2;
    const cy = S / 2;
    const clump = type === 'clump';
    const base = clump ? EARTH[ri(0, 1)] : ROCK[ri(0, ROCK.length - 1)];
    const pts = shape(type);
    c.lineJoin = 'miter';
    // 樹根（土塊才有），從下緣垂出來
    if (clump) {
      c.lineCap = 'round';
      for (let i = 0; i < ri(5, 8); i++) {
        const a = rr(0.35, Math.PI - 0.35);
        let x = cx + Math.cos(a) * R * 0.7;
        let y = cy + Math.sin(a) * R * 0.55;
        c.beginPath();
        c.moveTo(x, y);
        let dir = a + rr(-0.3, 0.3);
        const len = rr(0.4, 0.8) * R;
        for (let k = 0; k < 6; k++) {
          dir += rr(-0.45, 0.45);
          x += (Math.cos(dir) * len) / 6;
          y += (Math.sin(dir) * len) / 6;
          c.lineTo(x, y);
        }
        c.strokeStyle = rgb([72, 66, 58], 0.85);
        c.lineWidth = rr(0.8, 1.8);
        c.stroke();
      }
    }
    path(c, pts, R, cx, cy);
    c.fillStyle = rgb(base);
    c.fill();
    c.save();
    path(c, pts, R, cx, cy);
    c.clip();
    // 切面：把外形的凸包隨機切成好幾塊平面
    let pieces = [hull(pts)];
    const cuts = type === 'gravel' ? ri(2, 3) : clump ? ri(3, 4) : ri(5, 8);
    for (let i = 0; i < cuts; i++) {
      pieces.sort((p, q) => area(q) - area(p));
      const big = pieces.shift();
      const ce = centroid(big);
      const a = rr(0, Math.PI);
      const parts = split(big, ce[0] + rr(-0.15, 0.15), ce[1] + rr(-0.15, 0.15), Math.cos(a), Math.sin(a));
      parts.forEach((p) => p.length >= 3 && pieces.push(p));
    }
    pieces.forEach((p) => {
      const ce = centroid(p);
      let nx = ce[0] * 1.15 + rr(-0.5, 0.5);
      let ny = ce[1] * 1.15 + rr(-0.5, 0.5);
      let nz = rr(0.55, 1.1);
      const nl = Math.hypot(nx, ny, nz);
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const l = nx * L3[0] + ny * L3[1] + nz * L3[2];
      path(c, p, R, cx, cy);
      c.fillStyle = rgb(tone(base, l * 1.2 - 0.1, clump ? 0.35 : 0.8));
      c.fill();
      c.strokeStyle = l > 0.35 ? 'rgba(190,202,222,0.22)' : 'rgba(4,5,8,0.5)';
      c.lineWidth = 0.9;
      c.stroke();
    });
    // 體積感：右下整體壓暗
    const g = c.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.15, cx, cy, R * 1.1);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(3,4,7,0.55)');
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
    // 層理：斷斷續續的平行細線
    if (type !== 'gravel') {
      const th = type === 'slab' ? rr(-0.12, 0.12) : rr(-0.7, 0.7);
      const gap = rr(0.11, 0.2) * R;
      c.save();
      c.translate(cx, cy);
      c.rotate(th);
      for (let y = -R; y < R; y += gap * rr(0.7, 1.3)) {
        if (rnd() < 0.35) continue;
        const x0 = rr(-R, 0);
        const x1 = x0 + rr(0.5, 1.5) * R;
        c.beginPath();
        c.moveTo(x0, y);
        c.lineTo(x1, y + rr(-1.5, 1.5));
        c.strokeStyle = clump ? 'rgba(18,14,10,0.35)' : 'rgba(5,6,9,0.4)';
        c.lineWidth = rr(0.6, 1.3);
        c.stroke();
        c.beginPath();
        c.moveTo(x0, y + 1.2);
        c.lineTo(x1, y + 1.2);
        c.strokeStyle = 'rgba(176,190,214,0.09)';
        c.lineWidth = 0.7;
        c.stroke();
      }
      c.restore();
    }
    // 顆粒
    for (let i = 0; i < (type === 'gravel' ? 30 : 140); i++) {
      c.fillStyle = rnd() < 0.55 ? 'rgba(0,0,0,0.2)' : 'rgba(186,198,218,0.09)';
      const s = rr(0.6, 1.7);
      c.fillRect(cx + rr(-R, R), cy + rr(-R, R), s, s);
    }
    // 斑駁：幾塊色調略不同的不規則色斑
    for (let i = 0; i < (type === 'gravel' ? 2 : 7); i++) {
      path(c, shape('gravel'), rr(0.12, 0.3) * R, cx + rr(-0.7, 0.7) * R, cy + rr(-0.7, 0.7) * R);
      c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.12)' : clump ? 'rgba(120,104,90,0.1)' : 'rgba(150,166,190,0.08)';
      c.fill();
    }
    // 土塊裡夾的小石子
    if (clump) {
      for (let i = 0; i < 7; i++) {
        const sp = shape('gravel');
        path(c, sp, rr(2.5, 5.5), cx + rr(-0.6, 0.6) * R, cy + rr(-0.4, 0.5) * R);
        c.fillStyle = rgb(tone(ROCK[ri(0, 4)], rr(-0.3, 0.7), 0.7));
        c.fill();
      }
    }
    // 裂縫：從邊緣往裡劈
    if (type !== 'gravel') {
      for (let i = 0; i < ri(1, 2); i++) {
        const p0 = pts[ri(0, pts.length - 1)];
        let x = cx + p0[0] * R;
        let y = cy + p0[1] * R;
        let dir = Math.atan2(-p0[1], -p0[0]) + rr(-0.5, 0.5);
        c.beginPath();
        c.moveTo(x, y);
        for (let k = 0; k < ri(3, 5); k++) {
          dir += rr(-0.55, 0.55);
          const st = rr(0.1, 0.22) * R;
          x += Math.cos(dir) * st;
          y += Math.sin(dir) * st;
          c.lineTo(x, y);
        }
        c.strokeStyle = 'rgba(2,2,5,0.8)';
        c.lineWidth = rr(0.9, 1.6);
        c.stroke();
      }
    }
    c.restore();
    // 外緣：深色描邊；朝光的邊拉一條冷色細亮線
    path(c, pts, R, cx, cy);
    c.strokeStyle = 'rgba(3,4,7,0.92)';
    c.lineWidth = 1.5;
    c.stroke();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      let nx = b[1] - a[1];
      let ny = -(b[0] - a[0]);
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;
      if (nx * a[0] + ny * a[1] < 0) {
        nx = -nx;
        ny = -ny;
      }
      const l = (nx * L3[0] + ny * L3[1]) / Math.hypot(L3[0], L3[1]);
      if (l < 0.3) continue;
      c.beginPath();
      c.moveTo(cx + a[0] * (R - 1.3), cy + a[1] * (R - 1.3));
      c.lineTo(cx + b[0] * (R - 1.3), cy + b[1] * (R - 1.3));
      c.strokeStyle = 'rgba(196,208,228,' + (0.5 * l * (clump ? 0.35 : 1)).toFixed(2) + ')';
      c.lineWidth = 1;
      c.stroke();
    }
    // 石材的顆粒：逐像素的細雜訊＋2×2 的粗顆粒（冷色偏移）
    const img = c.getImageData(0, 0, S, S);
    const px = img.data;
    const coarse = new Float32Array(Math.ceil(S / 2) * Math.ceil(S / 2)).map(() => rr(-1, 1));
    for (let yy = 0; yy < S; yy++) {
      for (let xx = 0; xx < S; xx++) {
        const i = (yy * S + xx) * 4;
        if (px[i + 3] < 8) continue;
        const n = rr(-9, 9) + coarse[(yy >> 1) * Math.ceil(S / 2) + (xx >> 1)] * 7;
        px[i] += n;
        px[i + 1] += n;
        px[i + 2] += n * 1.1;
      }
    }
    c.putImageData(img, 0, 0);
    // 剪影（烘焙石球時拿來做石縫的陰影與縫光）
    const sil = mk(S);
    const sc = sil.getContext('2d');
    sc.drawImage(cv, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = '#030306';
    sc.fillRect(0, 0, S, S);
    // 鎖進石球時用的版本：自帶往右下偏的深色影子（石塊之間的深縫），再依球面位置分成冷亮／原色／沉黑
    const packed = (col) => {
      const t = mk(S);
      const tc = t.getContext('2d');
      tc.globalAlpha = 0.6;
      tc.drawImage(sil, 1.5, 2, S * 1.04, S * 1.04);
      tc.globalAlpha = 1;
      const o = mk(S);
      const oc = o.getContext('2d');
      oc.drawImage(cv, 0, 0);
      if (col) {
        oc.globalCompositeOperation = 'source-atop';
        oc.fillStyle = col;
        oc.fillRect(0, 0, S, S);
      }
      tc.drawImage(o, 0, 0);
      return t;
    };
    const vsil = mk(S);
    const vc = vsil.getContext('2d');
    vc.drawImage(sil, 0, 0);
    vc.globalCompositeOperation = 'source-in';
    vc.fillStyle = 'rgb(150,136,255)';
    vc.fillRect(0, 0, S, S);
    return { c: cv, sil, vsil, lit: packed('rgba(176,194,224,0.16)'), mid: packed(null), dark: packed('rgba(3,4,8,0.45)'), S, R };
  }

  function radial(size, stops) {
    const cv = mk(size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  }

  // ── 模組載入時一次畫好所有素材 ──
  const SPR = { boulder: [], slab: [], shard: [], gravel: [], clump: [] };
  Object.keys(SPR).forEach((k) => {
    for (let i = 0; i < (k === 'clump' ? 3 : 6); i++) SPR[k].push(makeRock(k));
  });
  const SMALL = SPR.gravel.concat(SPR.shard);
  A.rockSpr = { SPR, SMALL }; // 天輝流星的噴飛岩塊、隕石本體也用這組碎岩圖
  const PUFF = radial(64, [[0, 'rgba(124,130,142,0.5)'], [0.5, 'rgba(108,114,126,0.28)'], [1, 'rgba(96,102,114,0)']]);
  const PUFF_D = radial(64, [[0, 'rgba(46,48,56,0.55)'], [0.55, 'rgba(42,44,52,0.26)'], [1, 'rgba(40,42,50,0)']]);
  const GLOW = radial(128, [[0, 'rgba(232,236,255,1)'], [0.3, 'rgba(176,166,255,0.6)'], [0.65, 'rgba(96,72,200,0.16)'], [1, 'rgba(60,40,140,0)']]);
  // 球體明暗：左上冷亮、右下沉入黑暗（只疊在石頭上）
  const SHADE = mk(256);
  (() => {
    const c = SHADE.getContext('2d');
    let g = c.createRadialGradient(80, 72, 4, 90, 84, 118);
    g.addColorStop(0, 'rgba(180,196,224,0.34)');
    g.addColorStop(0.55, 'rgba(176,192,220,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    g = c.createRadialGradient(98, 92, 30, 128, 128, 128);
    g.addColorStop(0, 'rgba(3,4,8,0)');
    g.addColorStop(0.62, 'rgba(3,4,8,0.14)');
    g.addColorStop(1, 'rgba(3,4,8,0.66)');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  })();
  // 核心的碎石基質：塞滿碎石的深色圓，讓中心從一開始就是石頭。
  // 縫光畫在碎石底下，只從碎石之間漏出來；預先做好幾個亮度等級，每幀只貼一張。
  const GRAVEL_AT = [];
  for (let i = 0; i < 190; i++) {
    const a = rr(0, TAU);
    GRAVEL_AT.push({ s: SMALL[i % SMALL.length], x: 96 + Math.cos(a) * Math.sqrt(rnd()) * 98, y: 96 + Math.sin(a) * Math.sqrt(rnd()) * 98, z: rr(16, 32), rot: rr(0, TAU) });
  }
  const LV = [0, 0.25, 0.45, 0.7, 1];
  const MATRIX_LV = LV.map((k) => {
    const cv = mk(192);
    const c = cv.getContext('2d');
    c.beginPath();
    c.arc(96, 96, 94, 0, TAU);
    c.fillStyle = '#121318';
    c.fill();
    c.save();
    c.clip();
    if (k) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = k;
      c.drawImage(GLOW, 0, 0, 192, 192);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    }
    GRAVEL_AT.forEach((g) => {
      c.save();
      c.translate(g.x, g.y);
      c.rotate(g.rot);
      c.drawImage(g.s.dark, -g.z / 2, -g.z / 2, g.z, g.z);
      c.restore();
    });
    c.restore();
    return cv;
  });

  // 每顆石頭的外觀由遊戲邏輯裡的隨機大小 s 決定：同一顆石頭飛行中、黏上去、被甩出來都長一樣
  function vis(o, size) {
    if (o._v && o._v.size === size) return o._v;
    const h = Math.abs(Math.sin(o.s * 9301.7 + (o.tone || 0) * 17.3) * 43758.5) % 1;
    const h2 = (h * 7.13) % 1;
    let list;
    let k;
    if (o.kind === 'chunk') {
      list = h < 0.4 ? SPR.clump : SPR.slab;
      k = 1.0 + h2 * 0.25;
    } else if (o.s < 0.82) {
      list = h < 0.5 ? SPR.shard : SPR.gravel;
      k = 0.42 + h2 * 0.18;
    } else if (o.s < 1.1) {
      list = h < 0.6 ? SPR.boulder : SPR.shard;
      k = 0.72 + h2 * 0.2;
    } else {
      list = h < 0.5 ? SPR.slab : SPR.boulder;
      k = 1.2 + h2 * 0.25;
    }
    o._v = { spr: list[Math.floor(h2 * 997) % list.length], size, r: size * 0.21 * k + 3, big: k > 1.1 };
    return o._v;
  }
  function blit(ctx, spr, x, y, r, rot, alpha) {
    const w = (spr.S * r) / spr.R;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(spr.c, -w / 2, -w / 2, w, w);
    ctx.restore();
  }

  // ── 每個地爆天星自己的狀態（掛在 u._fx 上） ──
  const RES = 1;
  function state(u) {
    if (u._fx) return u._fx;
    const side = Math.ceil(u.size * 3 * RES);
    u._fx = {
      lt: u.t, side, raw: mk(side),
      baked: new Set(), nPuff: 0, covered: false, parts: [], waves: [],
      chunks: [], jolt: 0, jx: 0, jy: 0, hitK: 0, flashK: 0, lastN: 0, sqStep: -1, ended: false,
      ground: null, pits: null, span: null, depth: GH, gx: 0, gy: 0, pitN: 0,
    };
    return u._fx;
  }
  function puff(f, x, y, vx, vy, size, life, dark) {
    if (f.nPuff < 36) f.nPuff++, f.parts.push({ p: 1, x, y, vx, vy, s0: size, t: 0, life, dark });
  }
  function grit(f, x, y, vx, vy) {
    if (f.parts.length < 130) f.parts.push({ p: 0, x, y, vx, vy, s0: rr(1.5, 3.6), t: 0, life: rr(0.5, 0.9), c: ['#2b2d33', '#3c4048', '#1c1d22', '#5a606a'][ri(0, 3)] });
  }

  // 地面：從拉扯點往兩側、往下劈開的暗色裂縫（縫底一絲冷光）
  const GW = 820;
  const GH = 90;
  const GOY = 20;
  // 拉扯點底下真正能站的表面：跟落地同一套規則（x 在平台範圍內、表面在這一點或更下面、最近的那一層）。
  // 往下 160px 內沒有平台（半空中）就回傳 null：不畫地面裂縫，石塊改成從空中飛來。
  function surface(u) {
    if (u.surf !== undefined) return u.surf;
    const map = G.world && G.world.map;
    let s = null;
    if (map && G.physics && G.physics.platformBelow) {
      const i = G.physics.platformBelow(map, u.ox, u.oy);
      if (i >= 0) {
        const p = map.platforms[i];
        const sy = G.physics.surfaceY ? G.physics.surfaceY(map, i, u.ox) : p[2];
        if (sy - u.oy <= 160) s = { i, x0: p[0], x1: p[1], y: sy, ground: i === 0 };
      }
    }
    u.surf = s;
    return s;
  }
  function makeGround(f, u) {
    const surf = surface(u);
    if (!surf) {
      f.ground = false;
      return;
    }
    const cv = mk(GW, GH);
    const c = cv.getContext('2d');
    const ox = GW / 2;
    c.lineCap = 'round';
    c.lineJoin = 'miter';
    const crack = (x, y, dir, len, w, depth) => {
      const pts = [[x, y]];
      const n = Math.max(3, Math.round(len / 14));
      const d0 = dir;
      for (let i = 1; i <= n; i++) {
        dir = d0 + rr(-0.5, 0.5);
        x += Math.cos(dir) * (len / n);
        y += Math.sin(dir) * (len / n);
        if (y < GOY + 1) y = GOY + 1;
        pts.push([x, y]);
      }
      // 裂口是一條兩側參差的楔形（越往外越細），先畫一圈很淡的冷光
      const poly = (wk) => {
        c.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const k = 1 - i / (pts.length - 1);
          c[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1] - (w * k * wk) / 2 - rr(0, 0.8));
        }
        for (let i = pts.length - 1; i >= 0; i--) {
          const k = 1 - i / (pts.length - 1);
          c.lineTo(pts[i][0], pts[i][1] + (w * k * wk) / 2 + rr(0, 0.8));
        }
        c.closePath();
      };
      poly(3.2);
      c.fillStyle = 'rgba(120,110,210,0.08)';
      c.fill();
      poly(1);
      c.fillStyle = 'rgba(8,8,12,0.9)';
      c.fill();
      // 縫底的冷光
      c.beginPath();
      pts.slice(0, Math.ceil(pts.length * 0.6)).forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.strokeStyle = 'rgba(196,204,255,0.28)';
      c.lineWidth = 0.8;
      c.stroke();
      // 裂口上緣崩起的一線淺色斷面
      c.beginPath();
      pts.forEach((p, i) => {
        const k = 1 - i / (pts.length - 1);
        c[i ? 'lineTo' : 'moveTo'](p[0], p[1] - (w * k) / 2 - 1);
      });
      c.strokeStyle = 'rgba(150,158,172,0.22)';
      c.lineWidth = 1;
      c.stroke();
      if (depth < 1 && len > 90) {
        const p = pts[ri(1, pts.length - 2)];
        crack(p[0], p[1], dir + rr(0.45, 0.9) * (dir > Math.PI / 2 ? -1 : 1), len * rr(0.3, 0.45), w * 0.5, depth + 1);
      }
    };
    // 拉扯點底下的地面被拉得往上鼓：一片陰影
    const g = c.createRadialGradient(ox, GOY + 6, 4, ox, GOY + 6, 170);
    g.addColorStop(0, 'rgba(10,10,16,0.5)');
    g.addColorStop(1, 'rgba(10,10,16,0)');
    c.fillStyle = g;
    c.fillRect(ox - 170, GOY - 2, 340, 110);
    for (let s = -1; s <= 1; s += 2) {
      const ang = (a) => (s > 0 ? a : Math.PI - a);
      crack(ox + s * 4, GOY + 2, ang(rr(0.04, 0.12)), rr(290, 380), 6, 0);
      crack(ox + s * 8, GOY + 4, ang(rr(0.35, 0.55)), rr(120, 180), 5, 0);
      crack(ox + s * 3, GOY + 6, ang(rr(1.0, 1.25)), rr(55, 85), 4.5, 1);
    }
    f.ground = cv;
    f.pits = cv; // 坑直接畫進同一張地面圖
    f.gx = Math.round(u.ox - ox);
    f.gy = Math.round(surf.y - GOY);
    // 只畫在平台的水平範圍內；浮空平台很薄，裂縫只往下劈一點點
    f.span = [surf.x0, surf.x1];
    f.depth = surf.ground ? GH : GOY + 16;
  }
  // 被撕走一塊的坑：參差的黑色缺口、翻起的斷面、四周碎屑
  function pit(f, x) {
    const lx = x - f.gx;
    if (lx < 30 || lx > GW - 30) return;
    const c = f.pits.getContext('2d');
    const w = rr(12, 24);
    const d = rr(7, 14);
    c.beginPath();
    c.moveTo(lx - w, GOY);
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      c.lineTo(lx - w + 2 * w * t + rr(-3, 3), GOY + Math.sin(t * Math.PI) * d * rr(0.6, 1.15));
    }
    c.lineTo(lx + w, GOY);
    c.closePath();
    c.fillStyle = 'rgba(16,16,20,0.7)';
    c.fill();
    c.beginPath();
    c.moveTo(lx - w, GOY);
    c.lineTo(lx + w, GOY);
    c.strokeStyle = 'rgba(128,134,146,0.35)';
    c.lineWidth = 1;
    c.stroke();
    for (let i = 0; i < 3; i++) {
      const s = SMALL[ri(0, SMALL.length - 1)];
      const z = rr(5, 9);
      c.drawImage(s.c, lx + rr(-w * 1.8, w * 1.8) - z / 2, GOY - z * 0.75, z, z);
    }
  }

  // 把一顆定位好的石頭烘進石球（座標：石球中心、以 u.size 為單位）
  function bakeOne(f, u, sh) {
    const v = vis(sh, u.size);
    const C = f.side / 2;
    const U2 = u.size * RES;
    const rc = f.raw.getContext('2d');
    const put = (spr, a, d, r, rot, main) => {
      const x = C + Math.cos(a) * d * U2;
      const y = C + Math.sin(a) * d * U2;
      const w = (spr.S * r * RES) / spr.R;
      const draw = (c, img, s, dx, dy, al) => {
        c.save();
        c.translate(x + dx, y + dy);
        c.rotate(rot);
        if (al < 1) c.globalAlpha = al;
        c.drawImage(img, (-w * s) / 2, (-w * s) / 2, w * s, w * s);
        c.restore();
      };
      // 深處的石塊：外圍一圈冷紫光，被後來的石塊壓住後只剩石塊之間的縫在發光
      if (main && d < 0.85) draw(rc, spr.vsil, 1.12, 0, 0, 0.35 + 0.5 * (0.85 - d));
      // 石塊本體（自帶影子）：依它在球面上的位置挑明暗版本（左上冷亮、右下與深處沉黑）
      const l = (Math.cos(a) * -0.6 + Math.sin(a) * -0.8) * d;
      draw(rc, l > 0.3 ? spr.lit : l < -0.3 || d < 0.45 ? spr.dark : spr.mid, 1, 0, 0, 1);
    };
    // 旁邊塞一塊碎石，把縫補得更密
    // 第三顆石頭進來時，核心已經被壓進幾塊大岩塊：中心從此是實心的石頭
    if (f.baked.size === 2) {
      for (let i = 0; i < 6; i++) {
        const list = i % 2 ? SPR.boulder : SPR.slab;
        put(list[(Math.random() * list.length) | 0], rr(0, TAU), i ? rr(0.2, 0.45) : 0, u.size * rr(0.3, 0.4), rr(0, TAU), false);
      }
    }
    const s = SMALL[(Math.random() * SMALL.length) | 0];
    put(s, sh.a + rr(-0.4, 0.4), Math.min(1, sh.d * rr(0.75, 1.0)), u.size * rr(0.1, 0.16), rr(0, TAU), false);
    // 鎖進石球的石塊畫得比飛行時大一點：壓扁、擠在一起的大岩塊
    put(v.spr, sh.a, sh.d, v.r * 1.2 + u.size * 0.04, sh.rot, true);
    f.baked.add(sh);
  }
  // 一圈往外推的塵：衝擊波
  function dustRing(f, x, y, r, n, sp, big) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rr(-0.2, 0.2);
      const v = sp * rr(0.7, 1.2);
      puff(f, x + Math.cos(a) * r, y + Math.sin(a) * r, Math.cos(a) * v, Math.sin(a) * v * 0.8, rr(14, 24) * big, rr(0.45, 0.85), rnd() < 0.4);
    }
  }

  A.chibakuFx = {
    surface, // 遊戲邏輯用它決定石塊從地面撕起來還是從空中飛來
    spr: SPR, // 預先畫好的碎岩圖（除錯、預覽用）
    draw(ctx, u) {
      const f = state(u);
      const dt = Math.max(0, Math.min(0.05, u.t - f.lt));
      f.lt = u.t;
      const size = u.size;
      const ph = u.phase;
      const x = u.ox;
      const y = u.oy;
      const active = ph === 'pull' || ph === 'squeeze' || ph === 'flash';

      // ── 事件：石塊離地、鎖進石球、壓縮、黑閃、崩解 ──
      if (f.ground === null && ph !== 'throw') makeGround(f, u);
      u.rocks.forEach((r) => {
        if (r._seen) return;
        r._seen = true;
        if (r.air) {
          // 從空中飛來的碎石：只帶一小團塵
          puff(f, r.x, r.y, rr(-20, 20), rr(-20, 20), rr(10, 16), rr(0.4, 0.7), rnd() < 0.5);
          return;
        }
        const gy = u.surf ? u.surf.y : r.y + 4;
        if (f.ground && f.pitN++ % 3 === 0) pit(f, r.x);
        puff(f, r.x + rr(-10, 10), gy - rr(4, 10), rr(-30, 30), rr(-60, -20), rr(18, 28), rr(0.6, 1.0), rnd() < 0.5);
        for (let i = 0; i < 4; i++) grit(f, r.x + rr(-10, 10), gy - 4, rr(-80, 80), rr(-260, -120));
      });
      // 黑閃震掉的石頭不從烘好的石球裡挖掉：看起來是表面崩落的碎塊，石球始終是實心的一整顆
      u.shell.forEach((sh) => {
        if (f.baked.has(sh) || sh.t < 0.18) return;
        bakeOne(f, u, sh);
        const big = sh._v.big;
        f.jolt = Math.min(1.6, f.jolt + (big ? 0.9 : 0.35));
        f.jx = -Math.cos(sh.a);
        f.jy = -Math.sin(sh.a);
        const ex = x + Math.cos(sh.a) * sh.d * size * 1.05;
        const ey = y + Math.sin(sh.a) * sh.d * size * 1.05;
        for (let i = 0; i < (big ? 3 : 1); i++) puff(f, ex, ey, Math.cos(sh.a) * rr(30, 90), Math.sin(sh.a) * rr(30, 90), rr(12, 20) * (big ? 1.4 : 1), rr(0.45, 0.8), false);
        for (let i = 0; i < (big ? 5 : 2); i++) grit(f, ex, ey, Math.cos(sh.a + rr(-0.8, 0.8)) * rr(80, 220), Math.sin(sh.a + rr(-0.8, 0.8)) * rr(80, 220) - 60);
      });
      if (f.baked.size >= 5) f.covered = true;
      // 壓縮：石頭越多越緊；擠壓階段一格一格地往內咬
      let comp = 1.03 - 0.07 * Math.min(1, f.baked.size / 34);
      if (ph === 'squeeze' || ph === 'flash' || ph === 'end') {
        const k = ph === 'squeeze' ? Math.min(1, u.pt / 0.55) : 1;
        const step = Math.min(4, Math.floor(k * 5));
        const sk = ph === 'squeeze' ? Math.min(1, (step + Math.min(1, ((k * 5) % 1) / 0.2)) / 5) : 1;
        if (ph === 'squeeze' && step > f.sqStep) {
          f.sqStep = step;
          f.jolt = Math.min(1.6, f.jolt + 0.9);
          const a0 = rr(0, TAU);
          f.jx = Math.cos(a0);
          f.jy = Math.sin(a0);
          f.flashK = Math.max(f.flashK, 0.3 + step * 0.1);
          dustRing(f, x, y, size * 0.85, 7, 60, 1);
          for (let i = 0; i < 6; i++) {
            const a = rr(0, TAU);
            grit(f, x + Math.cos(a) * size * 0.85, y + Math.sin(a) * size * 0.85, Math.cos(a) * rr(60, 180), Math.sin(a) * rr(60, 180));
          }
        }
        comp = 0.96 * (1 - 0.19 * sk);
      }
      if (u.n > f.lastN) {
        const last = u.n >= u.S.hits;
        f.lastN = u.n;
        f.hitK = last ? 1.6 : 1;
        f.flashK = last ? 1.4 : 0.9;
        f.jolt = Math.min(1.8, f.jolt + 1);
        f.jx = u.n % 2 ? 1 : -1;
        f.jy = rr(-0.4, 0.4);
        f.waves.push({ x, y, r0: size * 0.7, r1: size * 2, t: 0, life: 0.28 });
        // Boss：黑閃打在牠靠近石球的那一側 → 那裡也迸一團塵和碎石
        if (u.hitX !== undefined && Math.hypot(u.hitX - x, u.hitY - y) > size) {
          dustRing(f, u.hitX, u.hitY, 10, 5, 120, 1.1);
          for (let i = 0; i < 6; i++) grit(f, u.hitX, u.hitY, rr(-300, 300), rr(-320, 60));
        }
        dustRing(f, x, y, size * 0.8, 6, 130, 1);
        for (let i = 0; i < 6; i++) {
          const a = rr(0, TAU);
          grit(f, x + Math.cos(a) * size * 0.8, y + Math.sin(a) * size * 0.8, Math.cos(a) * rr(150, 360), Math.sin(a) * rr(150, 360) - 80);
        }
      }
      if (ph === 'end' && !f.ended) {
        // 崩解：沉重的一聲，塵土與碎石往下灑
        f.ended = true;
        f.flashK = 0;
        f.waves.push({ x, y, r0: size * 0.6, r1: size * 3.6, t: 0, life: 0.6 });
        dustRing(f, x, y, size * 0.5, 16, 240, 1.7);
        for (let i = 0; i < 12; i++) puff(f, x + rr(-size, size) * 0.8, y + rr(-size, size) * 0.8, rr(-60, 60), rr(-20, 60), rr(30, 50), rr(0.8, 1.1), i % 2 === 0);
        // 整顆石球的碎塊往外崩飛
        for (let i = 0; i < 15; i++) {
          const a = rr(0, TAU);
          const sp = rr(200, 620);
          const list = i % 3 ? SMALL : SPR.boulder;
          f.chunks.push({ x: x + Math.cos(a) * size * rr(0.2, 0.8), y: y + Math.sin(a) * size * rr(0.2, 0.8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 260, rot: rr(0, TAU), vr: rr(-10, 10), spr: list[ri(0, list.length - 1)], r: size * (i % 3 ? rr(0.07, 0.13) : rr(0.14, 0.22)), t: 0, life: rr(0.8, 1.1) });
        }
        // 碎屑交給全域粒子：石球消失後還繼續往下灑一陣子
        const P = G.fx.particles;
        for (let i = 0; i < 50; i++) {
          const a = rr(0, TAU);
          const sp = rr(120, 520);
          P.push({ x: x + Math.cos(a) * size * 0.5, y: y + Math.sin(a) * size * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 220, life: rr(0.7, 1.4), t: 0, size: rr(2, 5.5), color: ['#2b2d33', '#3c4048', '#1c1d22', '#565c66', '#6c727c'][i % 5], grav: 1100, shape: 'square', drag: 0.6 });
        }
        for (let i = 0; i < 8; i++) P.push({ x: x + rr(-size, size), y: y + rr(-size * 0.5, size * 0.5), vx: rr(-50, 50), vy: rr(-20, 40), life: rr(1.3, 1.9), t: 0, size: rr(12, 20), color: 'rgba(96,102,114,0.3)', grav: 20, shape: 'circle', drag: 1.2 });
      }

      // ── 更新自己的粒子 ──
      f.jolt *= Math.exp(-dt * 14);
      f.hitK = Math.max(0, f.hitK - dt * 5);
      f.flashK = Math.max(0, f.flashK - dt * 3.5);
      for (let i = f.parts.length - 1; i >= 0; i--) {
        const p = f.parts[i];
        p.t += dt;
        if (p.t >= p.life) {
          if (p.p) f.nPuff--;
          f.parts.splice(i, 1);
          continue;
        }
        if (p.p) {
          const dr = 1 - Math.min(1, dt * 2.4);
          p.vx *= dr;
          p.vy = p.vy * dr + 22 * dt;
        } else p.vy += 900 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      if (dt > 0) {
        // 飛行中的石塊一路掉碎屑、拖著塵
        u.rocks.forEach((r) => {
          if (rnd() < 0.12) grit(f, r.x, r.y, r.vx * 0.1 + rr(-30, 30), rr(0, 60));
          if (rnd() < 0.05) puff(f, r.x, r.y, r.vx * 0.05, r.vy * 0.05, rr(8, 14), rr(0.35, 0.6), false);
        });
      }
      for (let i = f.chunks.length - 1; i >= 0; i--) {
        const c = f.chunks[i];
        c.t += dt;
        c.vy += 1400 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.vr * dt;
        if (c.t >= c.life) f.chunks.splice(i, 1);
      }
      for (let i = f.waves.length - 1; i >= 0; i--) {
        f.waves[i].t += dt;
        if (f.waves[i].t >= f.waves[i].life) f.waves.splice(i, 1);
      }

      // ── 繪製 ──
      // 1. 地面：裂縫（從中心往外裂開）、被撕走的坑
      if (f.ground) {
        const ga = ph === 'end' ? Math.max(0, 1 - u.pt / 1.1) : 1;
        if (ga > 0) {
          const reveal = Math.min(1, (ph === 'pull' ? u.pt : 1) / 0.4);
          const w = Math.round(GW * (0.1 + 0.9 * reveal));
          // 裂開的範圍 ∩ 平台的水平範圍（不能懸在半空中）
          const sx = Math.max((GW - w) >> 1, Math.ceil(f.span[0] - f.gx));
          const ex = Math.min((GW + w) >> 1, Math.floor(f.span[1] - f.gx));
          if (ex - sx > 1) {
            ctx.save();
            ctx.globalAlpha = ga;
            // 起伏的地面：裂縫圖切成直條貼著地表
            if (u.surf && u.surf.ground && G.physics.drawOnGround) G.physics.drawOnGround(ctx, G.world.map, f.ground, sx, 0, ex - sx, f.depth, f.gx + sx, f.gy, u.ox);
            else ctx.drawImage(f.ground, sx, 0, ex - sx, f.depth, f.gx + sx, f.gy, ex - sx, f.depth);
            ctx.restore();
          }
        }
      }
      // 3. 核心：冷黑的小球；石頭一蓋上來就再也看不到
      if (!f.covered && u.R > 0.3 && ph !== 'end') {
        const R = u.R;
        const coreA = 1 - f.baked.size / 5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = coreA * 0.3;
        ctx.drawImage(GLOW, x - R * 3, y - R * 3, R * 6, R * 6);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = coreA;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, TAU);
        ctx.fillStyle = '#050409';
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(210,214,255,0.75)';
        ctx.stroke();
        if (ph === 'pull') {
          for (let i = 0; i < 2; i++) {
            const k = (u.t * 1.4 + i / 2) % 1;
            ctx.beginPath();
            ctx.arc(x, y, R + (1 - k) * 110, 0, TAU);
            ctx.strokeStyle = 'rgba(170,160,230,' + (0.2 * k).toFixed(3) + ')';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      // 4. 石球
      const endK = ph === 'end' ? 1 - u.pt / 0.1 : 1;
      if ((f.baked.size || u.shell.length) && endK > 0) {
        const j = f.jolt * (1.5 + size * 0.025);
        const trem = ph === 'squeeze' ? 0.6 + 1.6 * Math.min(1, u.pt / 0.55) : ph === 'flash' ? 0.9 : 0;
        const sc = comp * (1 - 0.035 * f.hitK) * (1 + (1 - endK) * 0.3);
        ctx.save();
        ctx.translate(x + f.jx * j + (trem ? rr(-trem, trem) : 0), y + f.jy * j + (trem ? rr(-trem, trem) : 0));
        ctx.scale(sc, sc);
        if (endK < 1) ctx.globalAlpha = endK;
        if (f.baked.size) {
          const w = f.side / RES;
          // 中心的碎石基質（石頭一多就填滿整顆球）→ 烘好的石塊
          const mr = size * 0.98 * Math.min(1, (f.baked.size + 2) / 7);
          const sa = (ph === 'pull' ? 0.25 : ph === 'squeeze' ? 0.3 + 0.35 * Math.min(1, u.pt / 0.55) : ph === 'flash' ? 0.6 + 0.3 * (u.n / u.S.hits) : 0) + 0.8 * f.flashK;
          let lv = 0;
          while (lv < LV.length - 1 && LV[lv + 1] <= sa + 0.1) lv++;
          ctx.drawImage(MATRIX_LV[lv], -mr, -mr, mr * 2, mr * 2);
          ctx.drawImage(f.raw, -w / 2, -w / 2, w, w);
          // 黑閃打進去的瞬間：冷光從石球內部往外透
          if (f.flashK > 0.05) {
            const gr = size * 0.95;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(0.6, 0.4 * f.flashK);
            ctx.drawImage(GLOW, -gr, -gr, gr * 2, gr * 2);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        // 還在撞進定位的石頭：從外面加速砸進來
        u.shell.forEach((sh) => {
          if (f.baked.has(sh)) return;
          const v = vis(sh, size);
          const e = Math.min(1, sh.t / 0.18) ** 2;
          const d = size * sh.d * (1.3 - 0.3 * e);
          let da = sh.a - (sh.a0 === undefined ? sh.a : sh.a0);
          da = Math.atan2(Math.sin(da), Math.cos(da));
          const a = sh.a - da * (1 - e);
          blit(ctx, v.spr, Math.cos(a) * d, Math.sin(a) * d, v.r, sh.rot, 1);
        });
        ctx.restore();
      }
      // 5. 飛進來的石塊、崩解後飛散的石塊
      u.rocks.forEach((r) => {
        const v = vis(r, size);
        blit(ctx, v.spr, r.x, r.y, v.r * (0.6 + 0.4 * Math.min(1, r.t / 0.12)), r.rot, r.air ? Math.min(1, r.t / 0.12) : 1);
      });
      u.flying.forEach((fl) => {
        const v = vis(fl, size);
        blit(ctx, v.spr, fl.x, fl.y, v.r, fl.rot, Math.min(1, (fl.life - fl.t) * 3));
      });
      f.chunks.forEach((c) => blit(ctx, c.spr, c.x, c.y, c.r, c.rot, Math.min(1, (c.life - c.t) * 4)));
      // 6. 塵與碎屑
      if (f.parts.length) {
        ctx.save();
        for (const p of f.parts) {
          const k = p.t / p.life;
          if (p.p) {
            const s = p.s0 * (0.55 + 0.9 * Math.sqrt(k));
            ctx.globalAlpha = (1 - k) * (k < 0.15 ? k / 0.15 : 1);
            ctx.drawImage(p.dark ? PUFF_D : PUFF, p.x - s, p.y - s, s * 2, s * 2);
          } else {
            ctx.globalAlpha = Math.min(1, (1 - k) * 3);
            ctx.fillStyle = p.c;
            ctx.fillRect(p.x - p.s0 / 2, p.y - p.s0 / 2, p.s0, p.s0 * 0.75);
          }
        }
        ctx.restore();
      }
      // 7. 震波：一道很細的冷白圈，靠塵環撐出重量
      if (f.waves.length) {
        ctx.save();
        for (const wv of f.waves) {
          const k = wv.t / wv.life;
          const r = wv.r0 + (wv.r1 - wv.r0) * (1 - (1 - k) * (1 - k));
          ctx.beginPath();
          ctx.arc(wv.x, wv.y, r, 0, TAU);
          ctx.strokeStyle = 'rgba(214,220,255,' + (0.3 * (1 - k)).toFixed(3) + ')';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      }
    },
  };

  // ═════════ 裂地震擊：沿著平台一路竄出來的岩刺 ═════════
  // 岩刺用跟地爆天星同一套寫實碎岩畫法（切面受光、層理、顆粒、裂縫），外圈再加一道遊戲一貫的深色粗描邊。
  // 一律「從地裡長出來」：每幀只貼出地面以上的那一段（來源裁切，不用 clip），底部永遠壓在那一點的平台表面上。
  // 兩種尺寸：一般岩刺（參考高 60）、打中怪的大岩刺（參考高 112），各自的描邊粗細不同，縮放後都接近 2～3px。
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const SPK = 1.6; // 岩刺圖的解析度（畫布像素／世界像素）
  const QOUT = [34, 26, 22]; // 深棕黑描邊（跟遊戲的 #4a2e1f 同色系、壓暗一些，放在灰色岩石上才不會發紅）
  function spikePts(cx, by, bw, h, lean, n, jag, flat) {
    const pts = [[cx - bw / 2, by + 8]];
    const tipX = cx + lean * bw;
    for (let i = 0; i < n; i++) {
      const k = i / n;
      const w = (bw / 2) * Math.pow(1 - k, flat ? 0.35 : 0.9);
      pts.push([cx + (tipX - cx) * k - w * (1 + rr(-jag, jag)), by - h * k + rr(-0.03, 0.03) * h]);
    }
    if (flat) {
      // 斷掉的平頂：兩三個參差的點
      const tw = bw * rr(0.22, 0.32);
      pts.push([tipX - tw, by - h * rr(0.9, 0.97)]);
      pts.push([tipX - tw * 0.2, by - h]);
      pts.push([tipX + tw * 0.5, by - h * rr(0.93, 0.99)]);
      pts.push([tipX + tw, by - h * rr(0.86, 0.94)]);
    } else pts.push([tipX, by - h]);
    for (let i = n - 1; i >= 1; i--) {
      const k = i / n;
      const w = (bw / 2) * Math.pow(1 - k, flat ? 0.35 : 0.9);
      pts.push([cx + (tipX - cx) * k + w * (1 + rr(-jag, jag)), by - h * k + rr(-0.03, 0.03) * h]);
    }
    pts.push([cx + bw / 2, by + 8]);
    return pts;
  }
  const polyPath = (c, p) => {
    c.beginPath();
    p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
    c.closePath();
  };
  // 把一個岩刺多邊形畫成多面受光的石頭（畫在 c 上，只畫在多邊形裡）
  function facetRock(c, pts, base, axisX, halfW, cuts) {
    c.save();
    polyPath(c, pts);
    c.fillStyle = rgb(base);
    c.fill();
    c.clip();
    let pieces = [hull(pts)];
    for (let i = 0; i < cuts; i++) {
      pieces.sort((p, q) => area(q) - area(p));
      const big = pieces.shift();
      const ce = centroid(big);
      // 大多是斜的縱切：切出岩刺的稜面
      const a = rnd() < 0.7 ? rr(-0.5, 0.5) : rr(1.2, 1.9);
      const parts = split(big, ce[0] + rr(-3, 3), ce[1] + rr(-3, 3), Math.cos(a), Math.sin(a));
      parts.forEach((p) => p.length >= 3 && pieces.push(p));
    }
    pieces.forEach((p) => {
      const ce = centroid(p);
      let nx = ((ce[0] - axisX) / halfW) * 0.9 + rr(-0.3, 0.3);
      let ny = rr(-0.55, 0.05);
      let nz = rr(0.5, 1.0);
      const nl = Math.hypot(nx, ny, nz);
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const l = nx * L3[0] + ny * L3[1] + nz * L3[2];
      polyPath(c, p);
      c.fillStyle = rgb(tone(base, l * 1.25 - 0.05, 0.75));
      c.fill();
      c.strokeStyle = l > 0.35 ? 'rgba(200,206,220,0.22)' : 'rgba(6,5,6,0.5)';
      c.lineWidth = 0.9;
      c.stroke();
    });
    c.restore();
  }
  function makeSpike(type, REF, OW) {
    const K = SPK;
    const W = Math.ceil(REF * 1.05 * K);
    const H = Math.ceil((REF + 14) * K);
    const cv = mk(W, H);
    const c = cv.getContext('2d');
    c.scale(K, K);
    const cx = W / K / 2;
    const by = H / K - 6; // 地面線（以下會被裁掉）
    const base = rnd() < 0.3 ? [86, 76, 66] : ROCK[ri(0, ROCK.length - 1)];
    const polys = [];
    if (type === 'pillar') polys.push({ p: spikePts(cx, by, REF * rr(0.42, 0.5), REF * rr(0.72, 0.8), rr(-0.08, 0.08), 5, 0.1, true), ax: cx, hw: REF * 0.23 });
    else {
      const lean = rr(-0.28, 0.28);
      polys.push({ p: spikePts(cx + rr(-2, 2), by, REF * rr(0.34, 0.42), REF * rr(0.92, 1), lean, 5, 0.16, false), ax: cx, hw: REF * 0.19 });
      if (type === 'cluster') {
        const s = rnd() < 0.5 ? -1 : 1;
        const sx = cx + s * REF * 0.2;
        polys.unshift({ p: spikePts(sx, by, REF * 0.26, REF * rr(0.45, 0.58), s * rr(0.35, 0.6), 4, 0.18, false), ax: sx, hw: REF * 0.13 });
      }
    }
    // 本體（先畫在另一張圖上，外框再用膨脹的剪影描）
    const body = mk(W, H);
    const bc = body.getContext('2d');
    bc.scale(K, K);
    polys.forEach((q) => facetRock(bc, q.p, base, q.ax, q.hw, type === 'pillar' ? ri(6, 8) : ri(5, 7)));
    // 小岩刺壓在大岩刺前面：交界描一條暗線
    if (polys.length > 1) {
      polyPath(bc, polys[0].p);
      bc.strokeStyle = 'rgba(20,14,12,0.75)';
      bc.lineWidth = 1.3;
      bc.save();
      bc.clip();
      bc.stroke();
      bc.restore();
    }
    bc.globalCompositeOperation = 'source-atop';
    // 層理
    const th = type === 'pillar' ? rr(-0.1, 0.1) : rr(-0.9, -0.3) * (rnd() < 0.5 ? 1 : -1);
    bc.save();
    bc.translate(cx, by - REF * 0.5);
    bc.rotate(th);
    for (let y = -REF; y < REF; y += REF * rr(0.08, 0.14)) {
      if (rnd() < 0.35) continue;
      const x0 = rr(-REF * 0.5, 0);
      bc.beginPath();
      bc.moveTo(x0, y);
      bc.lineTo(x0 + rr(0.3, 0.8) * REF, y + rr(-1, 1));
      bc.strokeStyle = 'rgba(8,7,8,0.38)';
      bc.lineWidth = rr(0.6, 1.1);
      bc.stroke();
    }
    bc.restore();
    // 裂縫
    for (let i = 0; i < 2; i++) {
      let x = cx + rr(-0.12, 0.12) * REF;
      let y = by - REF * rr(0.15, 0.7);
      let d = rr(-2.2, -0.9);
      bc.beginPath();
      bc.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        d += rr(-0.5, 0.5);
        x += Math.cos(d) * REF * 0.08;
        y += Math.sin(d) * REF * 0.08;
        bc.lineTo(x, y);
      }
      bc.strokeStyle = 'rgba(4,3,4,0.75)';
      bc.lineWidth = 1.1;
      bc.stroke();
    }
    // 右半邊整體壓暗（體積感）、根部沾著的泥土
    let g = bc.createLinearGradient(cx - REF * 0.25, 0, cx + REF * 0.3, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(4,4,8,0.4)');
    bc.fillStyle = g;
    bc.fillRect(0, 0, W, H);
    g = bc.createLinearGradient(0, by - REF * 0.32, 0, by);
    g.addColorStop(0, 'rgba(52,38,26,0)');
    g.addColorStop(1, 'rgba(52,38,26,0.75)');
    bc.fillStyle = g;
    bc.fillRect(0, 0, W, H);
    for (let i = 0; i < 18; i++) {
      bc.fillStyle = rnd() < 0.5 ? 'rgba(70,54,40,0.55)' : 'rgba(40,30,22,0.5)';
      const s = rr(1, 3);
      bc.fillRect(cx + rr(-0.25, 0.25) * REF, by - rr(0, 0.25) * REF, s, s);
    }
    // 朝光的稜線（左上）
    polys.forEach((q) => {
      const p = q.p;
      for (let i = 1; i < p.length - 1; i++) {
        const a = p[i];
        const b = p[i + 1];
        const nx = b[1] - a[1];
        const ny = -(b[0] - a[0]);
        const nl = Math.hypot(nx, ny) || 1;
        const l = ((nx / nl) * L3[0] + (ny / nl) * L3[1]) / Math.hypot(L3[0], L3[1]);
        if (l < 0.3 || a[1] > by - 4) continue;
        bc.beginPath();
        bc.moveTo(a[0] + 1, a[1] + 0.8);
        bc.lineTo(b[0] + 1, b[1] + 0.8);
        bc.strokeStyle = 'rgba(206,214,230,' + (0.45 * l).toFixed(2) + ')';
        bc.lineWidth = 1;
        bc.stroke();
      }
    });
    bc.globalCompositeOperation = 'source-over';
    // 石材顆粒
    const img = bc.getImageData(0, 0, W, H);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 8) continue;
      const n = rr(-10, 10);
      px[i] += n;
      px[i + 1] += n;
      px[i + 2] += n * 1.05;
    }
    bc.putImageData(img, 0, 0);
    // 外框：把剪影往八個方向推開、塗成深色，墊在本體下面
    const sil = mk(W, H);
    const sc = sil.getContext('2d');
    sc.drawImage(body, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = rgb(QOUT);
    sc.fillRect(0, 0, W, H);
    const o = OW * K;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(sil, Math.cos(a) * o, Math.sin(a) * o);
    }
    c.drawImage(body, 0, 0);
    // 找出岩刺最高點（裁切用）
    let top = 0;
    polys.forEach((q) => q.p.forEach((p) => (top = Math.max(top, by - p[1]))));
    return { c: cv, W, H, by: by * K, top: (top + OW) * K, bwTop: 0 };
  }
  const QS = { S: [], L: [] };
  [['spike', 4], ['pillar', 3], ['cluster', 2]].forEach(([t, n]) => {
    for (let i = 0; i < n; i++) QS.S.push(makeSpike(t, 60, 2.1));
  });
  [['spike', 3], ['cluster', 2], ['pillar', 1]].forEach(([t, n]) => {
    for (let i = 0; i < n; i++) QS.L.push(makeSpike(t, 112, 2.3));
  });
  const PUFF_E = radial(64, [[0, 'rgba(150,134,112,0.55)'], [0.5, 'rgba(136,120,100,0.3)'], [1, 'rgba(126,110,92,0)']]);
  const SHADOW = radial(64, [[0, 'rgba(20,14,10,0.6)'], [0.6, 'rgba(20,14,10,0.3)'], [1, 'rgba(20,14,10,0)']]);

  // 粒子池：塵（p=1）、碎屑（p=0）、碎石塊（p=2，用 SMALL 的碎岩圖、會在地面彈一下）
  const QP = [];
  for (let i = 0; i < 260; i++) QP.push({ on: false, p: 0, x: 0, y: 0, vx: 0, vy: 0, s0: 1, t: 0, life: 1, c: '', floor: 1e9, rot: 0, vr: 0, spr: null, b: 0 });
  let qpI = 0;
  let qpN = 0;
  function qp(p, x, y, vx, vy, s, life) {
    for (let j = 0; j < QP.length; j++) {
      const q = QP[(qpI + j) % QP.length];
      if (q.on) continue;
      qpI = (qpI + j + 1) % QP.length;
      qpN++;
      q.on = true;
      q.p = p;
      q.x = x;
      q.y = y;
      q.vx = vx;
      q.vy = vy;
      q.s0 = s;
      q.t = 0;
      q.life = life;
      q.floor = 1e9;
      q.rot = rr(0, TAU);
      q.vr = rr(-8, 8);
      q.b = 0;
      q.c = ['#3a3430', '#4e4640', '#2a2522', '#6a6058'][ri(0, 3)];
      q.spr = p === 2 ? SMALL[ri(0, SMALL.length - 1)] : null;
      return q;
    }
    return null;
  }

  const QK = [];
  // 某個 x 上、跟 y0 同一層的平台表面（沒有平台 → null）
  let qGround = false; // 這一次震地是不是從（起伏的）地面發出的：是的話整條地裂都貼著地表
  function surfY(x, y0) {
    const map = G.world && G.world.map;
    if (!map || !G.physics) return null;
    if (qGround) {
      const p0 = map.platforms[0];
      if (x < p0[0] || x > p0[1]) return null;
      const q = [p0[0], p0[1], G.physics.groundY(map, x)];
      q.gnd = true;
      return q;
    }
    const i = G.physics.platformBelow(map, x, y0 - 40);
    if (i < 0) return null;
    const p = map.platforms[i];
    return Math.abs(p[2] - y0) < 40 ? p : null;
  }
  function dust(x, gy, n, big) {
    const L = G.lowFx;
    for (let i = 0; i < (L ? Math.ceil(n / 2) : n); i++) qp(1, x + rr(-10, 10) * big, gy - rr(2, 10), rr(-70, 70) * big, rr(-60, -15), rr(14, 24) * big, rr(0.5, 0.9));
  }
  function grit(x, gy, n, big) {
    const L = G.lowFx;
    for (let i = 0; i < (L ? Math.ceil(n / 2) : n); i++) {
      const q = qp(0, x + rr(-8, 8), gy - 4, rr(-130, 130) * big, rr(-420, -160) * big, rr(1.8, 3.6), rr(0.5, 0.9));
      if (q) q.floor = gy;
    }
  }
  function chunks(x, y, gy, n, big) {
    const L = G.lowFx;
    for (let i = 0; i < (L ? Math.ceil(n / 2) : n); i++) {
      const q = qp(2, x + rr(-8, 8), y, rr(-160, 160) * big, rr(-380, -140) * big, rr(4, 7.5) * big, rr(0.8, 1.2));
      if (q) q.floor = gy;
    }
  }
  function quakeCast(o) {
    const L = G.lowFx;
    const e = { t: 0, x: o.x, gy: o.y, rocks: [], cracks: [], reach: o.reach, speed: o.speed || 1100 };
    const gmap = G.world && G.world.map;
    qGround = !!(gmap && G.physics && G.physics.groundY && Math.abs(o.y - G.physics.groundY(gmap, o.x)) < 3);
    const tg = o.targets || [];
    // 打中怪的大岩刺：出現時間跟傷害時間一樣（距離 ÷ 震波速度），提早一點點讓尖端剛好頂到
    tg.forEach((m) => {
      const p = surfY(m.x, o.y);
      if (!p) return;
      const h = clamp(m.h * 0.85 + 52, 98, 190);
      const d = Math.abs(m.x - o.x);
      const delay = Math.max(0, d / e.speed - 0.02);
      e.rocks.push({ x: m.x, gy: p[2], h, spr: QS.L[ri(0, QS.L.length - 1)], d: delay, hold: 0.42, big: true, seen: false, gone: false, skirt: skirt(2) });
      // 兩側各一根較矮的陪襯岩刺
      if (!L) {
        [-1, 1].forEach((s) => {
          const x = m.x + s * h * rr(0.32, 0.42);
          const q = surfY(x, o.y);
          if (q) e.rocks.push({ x, gy: q[2], h: h * rr(0.38, 0.5), spr: QS.S[ri(0, QS.S.length - 1)], d: delay + 0.03, hold: 0.36, big: false, seen: false, gone: false, skirt: skirt(1) });
        });
      }
    });
    const step = L ? 70 : 44;
    for (const s of [-1, 1]) {
      let n = 0;
      for (let d = 46 + rr(0, 8); d <= e.reach; d += step * rr(0.85, 1.15)) {
        const x = o.x + s * d;
        const p = surfY(x, o.y);
        if (!p) continue;
        if (tg.some((m) => Math.abs(m.x - x) < 40)) continue;
        const fall = 1 - (d / e.reach) * 0.35;
        const h = (n++ % 2 ? rr(34, 48) : rr(54, 78)) * fall;
        e.rocks.push({ x, gy: p[2], h, spr: QS.S[ri(0, QS.S.length - 1)], d: d / e.speed, hold: rr(0.24, 0.34), big: false, seen: false, gone: false, skirt: skirt(L ? 0 : 1) });
      }
      // 地裂：從腳下沿著平台往外，縫的點每 14px 一個，沒有平台的地方斷開
      const pts = [];
      let y = o.y + 4;
      for (let d = 0; d <= e.reach + 20; d += 14) {
        const x = o.x + s * d;
        const p = surfY(x, o.y);
        if (!p) {
          pts.push(x, NaN, 0);
          continue;
        }
        y = clamp(y + rr(-2.2, 2.2), p[2] + 2, p[2] + (p.gnd || p === G.world.map.platforms[0] ? 11 : 7));
        pts.push(x, y, p[2]);
      }
      // 分叉：往下斜劈幾道短縫
      const br = [];
      for (let i = 3; i < pts.length / 3 - 1; i += ri(3, 5)) {
        if (Number.isNaN(pts[i * 3 + 1])) continue;
        const bx = pts[i * 3];
        const by = pts[i * 3 + 1];
        const len = rr(8, 22);
        const a = rr(0.5, 1.1);
        br.push(bx, by, bx + s * Math.cos(a) * len, by + Math.sin(a) * len * 0.6, pts[i * 3 + 2]);
      }
      e.cracks.push({ s, pts, br });
    }
    // 腳下：重踏的塵與碎石
    dust(o.x, o.y, 8, 1.3);
    grit(o.x, o.y, 10, 1);
    chunks(o.x, o.y - 4, o.y, 3, 0.8);
    e.rocks.sort((a, b) => a.big - b.big);
    QK.push(e);
  }
  function skirt(n) {
    const a = [];
    for (let i = 0; i < n + 1; i++) a.push({ dx: rr(-0.5, 0.5), s: SMALL[ri(0, SMALL.length - 1)], z: rr(0.16, 0.26), rot: rr(0, TAU) });
    return a;
  }
  // 岩刺在時間 lt 的露出比例（0～1）
  function riseK(r, lt) {
    if (lt < 0) return 0;
    if (lt < 0.09) {
      const k = lt / 0.09;
      return 1 - (1 - k) * (1 - k) * (1 - k);
    }
    const c = (lt - 0.09 - r.hold) / 0.3;
    if (c <= 0) return 1;
    if (c >= 1) return 0;
    return 1 - c * c;
  }
  function quakeStep(dt) {
    if (qpN) {
      for (const q of QP) {
        if (!q.on) continue;
        q.t += dt;
        if (q.t >= q.life) {
          q.on = false;
          qpN--;
          continue;
        }
        if (q.p === 1) {
          const d = 1 - Math.min(1, dt * 2.6);
          q.vx *= d;
          q.vy = q.vy * d + 16 * dt;
        } else {
          q.vy += 1300 * dt;
          q.rot += q.vr * dt;
        }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (q.y > q.floor) {
          q.y = q.floor;
          if (q.b++ < 1 && q.vy > 80) {
            q.vy *= -0.28;
            q.vx *= 0.5;
            q.vr *= 0.5;
          } else {
            q.vy = 0;
            q.vx *= 0.7;
            q.vr = 0;
          }
        }
      }
    }
    for (let k = QK.length - 1; k >= 0; k--) {
      const e = QK[k];
      e.t += dt;
      let alive = e.t < e.reach / e.speed + 1.7;
      for (const r of e.rocks) {
        const lt = e.t - r.d;
        if (lt >= 0 && !r.seen) {
          r.seen = true;
          const big = r.big ? 1.4 : 0.8 + r.h / 120;
          dust(r.x, r.gy, r.big ? 5 : 1, big);
          grit(r.x, r.gy, r.big ? 8 : 3, big);
          if (r.big || rnd() < 0.5) chunks(r.x, r.gy - 6, r.gy, r.big ? 4 : 1, big * 0.9);
        }
        if (!r.gone && lt > 0.09 + r.hold) {
          r.gone = true;
          // 崩下來：頂端掉碎石、根部冒塵
          chunks(r.x, r.gy - r.h * 0.6, r.gy, r.big ? 4 : 2, r.big ? 1 : 0.7);
          if (r.big || rnd() < 0.5) dust(r.x, r.gy, r.big ? 3 : 1, r.big ? 1.2 : 0.8);
        }
        if (lt < 0.09 + r.hold + 0.3) alive = true;
      }
      if (!alive) QK.splice(k, 1);
    }
  }
  // 旋轉貼圖不用 save/restore：直接把「基礎矩陣 × 平移 × 旋轉」算好設進去（畫完再設回 B）
  function blitRot(ctx, B, img, x, y, rot, w) {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    ctx.setTransform(B.a * c + B.c * s, B.b * c + B.d * s, B.c * c - B.a * s, B.d * c - B.b * s, B.a * x + B.c * y + B.e, B.b * x + B.d * y + B.f);
    ctx.drawImage(img, -w / 2, -w / 2, w, w);
  }
  function quakeDraw(ctx) {
    ctx.save();
    const B = ctx.getTransform();
    for (const e of QK) {
      const t = e.t;
      // 1. 地裂：跟著震波往外長；1.2 秒後淡掉
      const ca = t < 1.2 ? 1 : Math.max(0, 1 - (t - 1.2) / 0.5);
      if (ca > 0) {
        const front = t * e.speed;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const cr of e.cracks) {
          const p = cr.pts;
          const build = (dy) => {
            ctx.beginPath();
            let pen = false;
            for (let i = 0; i < p.length; i += 3) {
              if (Math.abs(p[i] - e.x) > front) break;
              if (Number.isNaN(p[i + 1])) {
                pen = false;
                continue;
              }
              pen ? ctx.lineTo(p[i], p[i + 1] + dy) : ctx.moveTo(p[i], p[i + 1] + dy);
              pen = true;
            }
            for (let i = 0; i < cr.br.length; i += 5) {
              if (Math.abs(cr.br[i] - e.x) > front) break;
              ctx.moveTo(cr.br[i], cr.br[i + 1] + dy);
              ctx.lineTo(cr.br[i + 2], cr.br[i + 3] + dy);
            }
          };
          build(0);
          ctx.globalAlpha = ca;
          ctx.strokeStyle = 'rgba(24,16,12,0.85)';
          ctx.lineWidth = 2.6;
          ctx.stroke();
          // 縫上緣崩起的淺色斷面
          build(-2);
          ctx.globalAlpha = ca * 0.5;
          ctx.strokeStyle = 'rgba(214,196,160,0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      // 2. 岩刺根部的影子
      for (const r of e.rocks) {
        const k = riseK(r, t - r.d);
        if (k <= 0) continue;
        const w = (r.spr.W / r.spr.top) * r.h * 0.9;
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.drawImage(SHADOW, r.x - w * 0.6, r.gy - 5, w * 1.2, 11);
      }
      // 3. 岩刺：只貼出地面以上的那一段
      for (const r of e.rocks) {
        const lt = t - r.d;
        const k = riseK(r, lt);
        if (k <= 0.01) continue;
        const S = r.spr;
        const sc = r.h / (S.top / SPK); // 世界像素 / 圖的世界像素
        const vis = S.top * k; // 露出的高度（畫布像素）
        const dw = (S.W / SPK) * sc;
        const dh = (vis / SPK) * sc;
        // 竄出來的一瞬間橫向抖一下
        const jit = lt > 0.09 && lt < 0.16 ? Math.sin(lt * 140) * 1.2 : 0;
        ctx.globalAlpha = 1;
        ctx.drawImage(S.c, 0, S.by - S.top, S.W, vis, r.x - dw / 2 + jit, r.gy - dh, dw, dh);
      }
      // 4. 根部的碎石裙：壓在岩刺前面，讓它看起來是從土裡頂出來的
      for (const r of e.rocks) {
        const k = riseK(r, t - r.d);
        if (k <= 0.05) continue;
        const w = (r.spr.W / r.spr.top) * r.h * 0.5;
        for (const q of r.skirt) {
          const z = r.h * q.z * (r.big ? 0.8 : 1);
          blitRot(ctx, B, q.s.c, r.x + q.dx * w, r.gy - z * 0.18, q.rot, z);
        }
      }
      ctx.setTransform(B);
    }
    // 5. 碎石塊、碎屑、塵
    if (qpN) {
      for (const q of QP) {
        if (!q.on || q.p !== 2) continue;
        const k = q.t / q.life;
        ctx.globalAlpha = Math.min(1, (1 - k) * 4);
        blitRot(ctx, B, q.spr.c, q.x, q.y - q.s0 * 0.5, q.rot, (q.spr.S * q.s0) / q.spr.R);
      }
      ctx.setTransform(B);
      for (const q of QP) {
        if (!q.on || q.p !== 0) continue;
        ctx.globalAlpha = Math.min(1, (1 - q.t / q.life) * 3);
        ctx.fillStyle = q.c;
        ctx.fillRect(q.x - q.s0 / 2, q.y - q.s0 / 2, q.s0, q.s0 * 0.75);
      }
      for (const q of QP) {
        if (!q.on || q.p !== 1) continue;
        const k = q.t / q.life;
        const s = q.s0 * (0.55 + 0.9 * Math.sqrt(k));
        ctx.globalAlpha = (1 - k) * (k < 0.15 ? k / 0.15 : 1);
        ctx.drawImage(PUFF_E, q.x - s, q.y - s, s * 2, s * 2);
      }
    }
    ctx.restore();
  }
  A.quakeFx = {
    // o: { x, y（施放者腳下）, reach, speed, targets: [{ x, y, h }] }
    cast: quakeCast,
    spr: QS,
  };
  if (A.skillFx) {
    A.skillFx.add({
      live: () => QK.length > 0 || qpN > 0,
      step: quakeStep,
      front: quakeDraw,
      clear() {
        QK.length = 0;
        for (const q of QP) q.on = false;
        qpN = 0;
      },
    });
  }
})();

// ═════════ 天輝流星：寫實的隕石 ═════════
// 飛行：深色岩殼、裂縫透出熔岩光的隕石（迎風面燒到白熱），拖著白熱→橙→紅→煙的長電漿尾；
//   周圍一圈游離光暈、前緣的弓形激波亮弧，沿路剝落火花與岩殼碎片、留下一條慢慢散開的煙。
// 撞擊：只在落點附近的局部光暈（不閃全螢幕）、火球翻滾成煙柱、地面衝擊波與兩側揚起的塵、
//   噴飛的熾熱岩塊（落在平台表面、彈一下、慢慢冷卻）、熔岩飛沫；地上留下熔岩緣的坑與半埋的隕石殘骸，
//   坑裡燒 3 秒（跟燃燒區域一樣長）。
(function () {
  'use strict';
  const A = G.art;
  if (!A.skillFx) return;
  const TAU = Math.PI * 2;
  const PI = Math.PI;
  let seed = 55117;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const rr = (a, b) => a + (b - a) * rnd();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const eOut = (k) => 1 - (1 - k) * (1 - k);
  const lite = () => !!G.lowFx;
  const mk = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w);
    c.height = Math.ceil(h || w);
    return c;
  };
  function radial(size, stops) {
    const cv = mk(size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  }
  const HOT = radial(128, [[0, 'rgba(255,255,244,1)'], [0.16, 'rgba(255,244,184,0.95)'], [0.42, 'rgba(255,164,64,0.45)'], [1, 'rgba(255,90,20,0)']]);
  const FIRE = radial(128, [[0, 'rgba(255,214,130,0.95)'], [0.35, 'rgba(255,128,40,0.6)'], [0.7, 'rgba(196,58,18,0.2)'], [1, 'rgba(150,36,10,0)']]);
  const ION = radial(128, [[0, 'rgba(255,236,200,0.5)'], [0.45, 'rgba(255,170,110,0.18)'], [0.75, 'rgba(170,190,255,0.08)'], [1, 'rgba(140,170,255,0)']]);
  const SMK = radial(64, [[0, 'rgba(92,86,84,0.62)'], [0.55, 'rgba(78,72,70,0.3)'], [1, 'rgba(66,62,60,0)']]);
  const DUST = radial(64, [[0, 'rgba(146,128,110,0.55)'], [0.55, 'rgba(128,112,96,0.28)'], [1, 'rgba(118,102,88,0)']]);
  const SCORCH = radial(128, [[0, 'rgba(16,10,8,0.9)'], [0.5, 'rgba(30,18,14,0.6)'], [1, 'rgba(34,24,20,0)']]);
  const RS = A.rockSpr || { SPR: { boulder: [] }, SMALL: [] };
  const SMALL = RS.SMALL;

  // 電漿尾：預先畫好的長條（右端是頭、往左漸細漸淡），疊幾層柔邊
  function trailTex(stops, len, hw) {
    const cv = mk(len, hw * 2 + 4);
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, len, 0);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    c.fillStyle = g;
    const cy = hw + 2;
    for (let k = 0; k < 6; k++) {
      const h = hw * (1 - k / 7);
      c.globalAlpha = 0.28;
      c.beginPath();
      c.moveTo(len, cy - h);
      c.bezierCurveTo(len * 0.6, cy - h * 0.95, len * 0.25, cy - h * 0.35, 0, cy);
      c.bezierCurveTo(len * 0.25, cy + h * 0.35, len * 0.6, cy + h * 0.95, len, cy + h);
      c.arc(len, cy, h, PI / 2, -PI / 2, true);
      c.fill();
    }
    return cv;
  }
  const T_OUT = trailTex([[0, 'rgba(90,40,30,0)'], [0.35, 'rgba(170,36,16,0.3)'], [0.7, 'rgba(236,72,24,0.6)'], [1, 'rgba(255,140,56,0.85)']], 512, 30);
  const T_MID = trailTex([[0, 'rgba(255,90,20,0)'], [0.5, 'rgba(255,140,40,0.7)'], [0.85, 'rgba(255,210,110,0.95)'], [1, 'rgba(255,236,170,1)']], 384, 18);
  const T_CORE = trailTex([[0, 'rgba(255,220,120,0)'], [0.55, 'rgba(255,244,200,0.9)'], [1, 'rgba(255,255,250,1)']], 256, 8);

  // 隕石本體：拿一顆多面玄武岩，染成焦黑偏暖的岩殼，再刻上透光的熔岩裂縫
  const HEAD = (() => {
    const src = RS.SPR.boulder[1] || RS.SPR.boulder[0];
    const S = 112;
    const cv = mk(S);
    const c = cv.getContext('2d');
    const R = S * 0.4;
    if (src) c.drawImage(src.c, S / 2 - (src.S * R) / src.R / 2, S / 2 - (src.S * R) / src.R / 2, (src.S * R) / src.R, (src.S * R) / src.R);
    else {
      c.beginPath();
      c.arc(S / 2, S / 2, R, 0, TAU);
      c.fillStyle = '#3a2c28';
      c.fill();
    }
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(70,24,8,0.42)';
    c.fillRect(0, 0, S, S);
    // 熔岩裂縫
    const cr = [
      [[-0.55, -0.35], [-0.15, -0.08], [-0.25, 0.4]],
      [[-0.15, -0.08], [0.35, -0.22], [0.62, 0.12]],
      [[-0.25, 0.4], [0.18, 0.62]],
      [[0.35, -0.22], [0.2, -0.62]],
      [[0.05, 0.15], [0.45, 0.45]],
    ];
    c.lineCap = 'round';
    c.lineJoin = 'round';
    [[5.5, 'rgba(255,90,20,0.55)'], [3, '#ff8a2a'], [1.2, '#ffe68a']].forEach(([w, col]) => {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      cr.forEach((l) => l.forEach((p, i) => (i ? c.lineTo(S / 2 + p[0] * R, S / 2 + p[1] * R) : c.moveTo(S / 2 + p[0] * R, S / 2 + p[1] * R))));
      c.stroke();
    });
    // 幾處熔化的斑
    [[0.3, 0.3, 0.2], [-0.4, 0.1, 0.14], [0.1, -0.4, 0.12]].forEach(([x, y, r]) => {
      const g = c.createRadialGradient(S / 2 + x * R, S / 2 + y * R, 0, S / 2 + x * R, S / 2 + y * R, r * R);
      g.addColorStop(0, 'rgba(255,190,80,0.8)');
      g.addColorStop(1, 'rgba(255,90,20,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
    });
    return { c: cv, S, R };
  })();
  // 熾熱的岩塊：同一組碎岩圖染成燒紅的版本（冷卻時從紅版淡回原本的灰）
  const HOTROCK = SMALL.map((s) => {
    const cv = mk(s.S);
    const c = cv.getContext('2d');
    c.drawImage(s.c, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    const g = c.createRadialGradient(s.S * 0.4, s.S * 0.62, 0, s.S / 2, s.S / 2, s.S * 0.55);
    g.addColorStop(0, 'rgba(255,200,90,0.95)');
    g.addColorStop(0.5, 'rgba(255,100,30,0.7)');
    g.addColorStop(1, 'rgba(120,30,10,0.35)');
    c.fillStyle = g;
    c.fillRect(0, 0, s.S, s.S);
    return cv;
  });

  // ── 粒子池 ──
  // k：0 飛行的煙 1 火花 2 岩殼碎片 3 噴飛岩塊 4 熔岩飛沫 5 撞擊煙柱 6 地面揚塵 7 上升的火星
  const MP = [];
  for (let i = 0; i < 340; i++) MP.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, rot: 0, vr: 0, g: 0, drag: 0, floor: 1e9, x0: -1e9, x1: 1e9, b: 0, land: -1, spr: 0 });
  let mpI = 0;
  let mpN = 0;
  function sp(k, x, y, vx, vy, life, s) {
    for (let j = 0; j < MP.length; j++) {
      const q = MP[(mpI + j) % MP.length];
      if (q.on) continue;
      mpI = (mpI + j + 1) % MP.length;
      mpN++;
      q.on = true;
      q.k = k;
      q.x = x;
      q.y = y;
      q.vx = vx;
      q.vy = vy;
      q.t = 0;
      q.life = life;
      q.s = s;
      q.rot = rr(0, TAU);
      q.vr = rr(-8, 8);
      q.g = 0;
      q.drag = 0;
      q.floor = 1e9;
      q.x0 = -1e9;
      q.x1 = 1e9;
      q.b = 0;
      q.land = -1;
      q.spr = Math.floor(rnd() * Math.max(1, SMALL.length));
      return q;
    }
    return null;
  }
  function stepMP(dt) {
    if (!mpN) return;
    for (const q of MP) {
      if (!q.on) continue;
      q.t += dt;
      if (q.t >= q.life) {
        q.on = false;
        mpN--;
        continue;
      }
      if (q.drag) {
        const d = Math.max(0, 1 - q.drag * dt);
        q.vx *= d;
        q.vy *= d;
      }
      q.vy += q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
      // 飛出平台邊緣就不再有地板（往下掉出去）
      if (q.x < q.x0 || q.x > q.x1) q.floor = 1e9;
      if (q.y > q.floor) {
        q.y = q.floor;
        if (q.land < 0) q.land = q.t;
        if (q.b++ < 1 && q.vy > 90 && q.k === 3) {
          q.vy *= -0.3;
          q.vx *= 0.5;
          q.vr *= 0.5;
        } else {
          q.vy = 0;
          q.vx *= 0.6;
          q.vr = 0;
        }
      }
    }
  }

  const MS = [];
  // 某個 x 上、跟 y0 同一層的平台（沒有 → null）
  function platAt(x, y0) {
    const map = G.world && G.world.map;
    if (!map || !G.physics) return null;
    const i = G.physics.platformBelow(map, x, y0 - 6);
    if (i < 0) return null;
    const p = map.platforms[i];
    const y = G.physics.surfaceY ? G.physics.surfaceY(map, i, x) : p[2];
    return y - y0 < 60 ? { p, i, y } : null;
  }

  function cast(o) {
    const pl = platAt(o.x, o.y);
    const gy = pl ? pl.y : o.y;
    const side = o.from || -1;
    const e = {
      t: 0, fall: o.fall || 0.75, x: o.x, gy, blast: o.blast || 180, burn: o.burn || 3,
      sx: o.x + side * 380, sy: gy - 780, hx: 0, hy: 0, ang: 0, dirx: -side,
      hit: false, ht: 0, ground: !!pl, span0: pl ? pl.p[0] : 0, span1: pl ? pl.p[1] : 0, depth: pl ? (pl.i === 0 ? 150 : 20) : 0,
      smT: 0, spT: 0, chT: 0, emT: 0, bowl: new Float32Array(2 * 11), cr: null, crN: 0, lips: [], rot: rr(0, TAU),
    };
    e.ang = Math.atan2(gy - e.sy, e.x - e.sx);
    e.hx = e.sx;
    e.hy = e.sy;
    MS.push(e);
    return e;
  }
  function headAt(e, k) {
    // 越落越快一點（k^1.15），確保 k=1 時剛好落地
    const kk = Math.pow(clamp(k, 0, 1), 1.15);
    e.hx = e.sx + (e.x - e.sx) * kk;
    e.hy = e.sy + (e.gy - 14 - e.sy) * kk;
  }
  function impact(e) {
    if (e.hit) return;
    e.hit = true;
    e.ht = 0;
    const L = lite();
    const x = e.x;
    const gy = e.gy;
    const Rc = e.blast * 0.4;
    e.Rc = Rc;
    if (e.ground) {
      // 坑：參差的碗，兩側稍微隆起
      for (let i = 0; i <= 10; i++) {
        const k = i / 10;
        e.bowl[i * 2] = x - Rc + 2 * Rc * k + (i && i < 10 ? rr(-3, 3) : 0);
        e.bowl[i * 2 + 1] = gy + Math.sin(k * PI) * Rc * 0.3 * rr(0.8, 1.08);
      }
      // 放射狀的熔岩裂縫
      const nC = L ? 4 : 8;
      e.crN = nC;
      e.cr = new Float32Array(nC * 2 * 6);
      for (let c = 0; c < nC; c++) {
        const s = c % 2 ? 1 : -1;
        const flat = c < 4;
        const a0 = flat ? rr(0.02, 0.12) : rr(0.3, 1.0);
        const ang = s > 0 ? a0 : PI - a0;
        const len = flat ? rr(70, 130) : rr(30, 70);
        let px = x + s * Rc * rr(0.75, 0.95);
        let py = gy + (flat ? 2 : rr(3, 7));
        for (let i = 0; i < 6; i++) {
          e.cr[(c * 6 + i) * 2] = px;
          e.cr[(c * 6 + i) * 2 + 1] = py;
          const d = ang + rr(-0.5, 0.5);
          px += (Math.cos(d) * len) / 5;
          py = Math.max(gy + 1.5, py + (Math.sin(d) * len) / 5);
        }
      }
      // 坑緣翻起的岩塊（坐在地表上）
      e.lips.length = 0;
      const nl = L ? 3 : 7;
      for (let i = 0; i < nl; i++) {
        const s = i % 2 ? 1 : -1;
        const r = rr(6, 12);
        const lx = x + s * Rc * rr(0.85, 1.3);
        if (lx < e.span0 + 4 || lx > e.span1 - 4) continue;
        e.lips.push({ x: lx, r, rot: rr(-0.5, 0.5), spr: Math.floor(rnd() * Math.max(1, SMALL.length)) });
      }
    }
    const fl = e.ground ? gy : 1e9;
    // 噴飛的熾熱岩塊：往兩側拋、落在平台上
    for (let i = 0; i < (L ? 5 : 11); i++) {
      const s = i % 2 ? 1 : -1;
      const q = sp(3, x + rr(-0.4, 0.4) * Rc, gy - 8, s * rr(90, 430), -rr(280, 640), rr(2.2, 3.0), rr(5, 10.5));
      if (!q) break;
      q.g = 1450;
      q.floor = fl;
      q.x0 = e.span0;
      q.x1 = e.span1;
    }
    // 熔岩飛沫
    for (let i = 0; i < (L ? 6 : 16); i++) {
      const a = -PI / 2 + rr(-1.2, 1.2);
      const v = rr(260, 620);
      const q = sp(4, x + rr(-10, 10), gy - 10, Math.cos(a) * v, Math.sin(a) * v, rr(1.0, 1.8), rr(1.6, 3));
      if (!q) break;
      q.g = 1300;
      q.floor = fl;
      q.x0 = e.span0;
      q.x1 = e.span1;
    }
    // 火花
    for (let i = 0; i < (L ? 8 : 22); i++) {
      const a = -PI / 2 + rr(-1.45, 1.45);
      const v = rr(320, 820);
      const q = sp(1, x + rr(-8, 8), gy - 8, Math.cos(a) * v, Math.sin(a) * v, rr(0.25, 0.55), rr(1.2, 2.4));
      if (!q) break;
      q.g = 900;
      q.drag = 1.6;
    }
    // 煙柱：先是被火光照亮的橘色，往上翻滾、變成灰煙
    for (let i = 0; i < (L ? 6 : 14); i++) {
      const q = sp(5, x + rr(-0.6, 0.6) * Rc, gy - rr(10, 40), rr(-90, 90), -rr(60, 240), rr(1.4, 2.4), rr(26, 46));
      if (!q) break;
      q.drag = 1.1;
      q.g = -12;
      q.b = -rr(0, 0.12);
    }
    // 沿著地面往兩側滾的塵
    for (let i = 0; i < (L ? 4 : 10); i++) {
      const s = i % 2 ? 1 : -1;
      const q = sp(6, x + s * Rc * 0.6, gy - rr(4, 14), s * rr(200, 460), -rr(10, 40), rr(0.8, 1.3), rr(16, 28));
      if (!q) break;
      q.drag = 2.4;
    }
  }

  function meteorStep(dt) {
    stepMP(dt);
    const L = lite();
    for (let i = MS.length - 1; i >= 0; i--) {
      const e = MS[i];
      e.t += dt;
      if (!e.hit) {
        headAt(e, e.t / e.fall);
        // 保險：遊戲那邊沒有呼叫 impact（計時器被清掉）也要落地
        if (e.t >= e.fall + 0.08) impact(e);
        const ca = Math.cos(e.ang);
        const sa = Math.sin(e.ang);
        const vx = ca * 1150;
        const vy = sa * 1150;
        // 煙
        e.smT -= dt;
        if (e.smT <= 0) {
          e.smT = L ? 0.05 : 0.022;
          const q = sp(0, e.hx - ca * rr(40, 70), e.hy - sa * rr(40, 70), -vx * 0.06 + rr(-20, 20), -vy * 0.06 + rr(-20, 20), rr(0.9, 1.5), rr(12, 20));
          if (q) q.drag = 1.5;
        }
        // 剝落的火花
        e.spT -= dt;
        if (e.spT <= 0) {
          e.spT = L ? 0.04 : 0.014;
          const a = e.ang + PI + rr(-0.5, 0.5);
          const v = rr(160, 420);
          const q = sp(1, e.hx + rr(-12, 12), e.hy + rr(-12, 12), Math.cos(a) * v + vx * 0.25, Math.sin(a) * v + vy * 0.25, rr(0.18, 0.4), rr(1.2, 2.2));
          if (q) {
            q.g = 400;
            q.drag = 2;
          }
        }
        // 岩殼碎片
        e.chT -= dt;
        if (e.chT <= 0) {
          e.chT = L ? 0.14 : 0.06;
          const a = e.ang + PI + rr(-0.7, 0.7);
          const q = sp(2, e.hx + rr(-10, 10), e.hy + rr(-10, 10), Math.cos(a) * rr(80, 220) + vx * 0.4, Math.sin(a) * rr(80, 220) + vy * 0.4, rr(0.35, 0.6), rr(2, 3.6));
          if (q) {
            q.g = 700;
            q.drag = 1.2;
          }
        }
      } else {
        e.ht += dt;
        // 坑裡還在燒：往上飄的火星
        if (e.ground && e.ht < e.burn) {
          e.emT -= dt;
          if (e.emT <= 0) {
            e.emT = L ? 0.12 : 0.05;
            const q = sp(7, e.x + rr(-1, 1) * e.Rc * 0.9, e.gy + rr(0, 4), rr(-20, 20), -rr(40, 110), rr(0.6, 1.2), rr(1.2, 2.4));
            if (q) q.drag = 0.6;
          }
        }
        if (e.ht > e.burn + 1) MS.splice(i, 1);
      }
    }
  }

  // ── 畫 ──
  function drawHead(ctx, e) {
    const t = e.t;
    const x = e.hx;
    const y = e.hy;
    const k = clamp(t / e.fall, 0, 1);
    const ca = Math.cos(e.ang);
    const sa = Math.sin(e.ang);
    const fk = 1 + 0.08 * Math.sin(t * 47) + 0.05 * Math.sin(t * 83);
    ctx.globalCompositeOperation = 'lighter';
    // 游離光暈
    ctx.globalAlpha = 0.85;
    let r = 150 * fk;
    ctx.drawImage(ION, x - r, y - r, r * 2, r * 2);
    // 電漿尾（旋轉到飛行方向；圖的右端是頭）
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(e.ang);
    const grow = clamp(t / 0.25, 0, 1);
    const w = fk;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(T_OUT, -470 * grow, -30 * 1.5 * w, 490 * grow, 64 * 1.5 * w);
    ctx.globalAlpha = 1;
    ctx.drawImage(T_MID, -300 * grow, -20 * w, 318 * grow, 40 * w);
    ctx.drawImage(T_CORE, -150 * grow, -10, 166 * grow, 20);
    // 尾巴裡順流而下的電漿團（讓尾巴看起來在流動）
    for (let j = 0; j < (lite() ? 2 : 5); j++) {
      const q = (t * 2.6 + j / 5) % 1;
      const px = -30 - q * 320 * grow;
      const py = Math.sin(t * 13 + j * 2.1) * (6 + q * 14);
      const rr2 = (22 - q * 10) * (1 + q);
      ctx.globalAlpha = (1 - q) * 0.55;
      ctx.drawImage(FIRE, px - rr2, py - rr2 * 0.6, rr2 * 2, rr2 * 1.2);
    }
    // 前緣的弓形激波：頭前方一道被壓亮的弧
    ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 60);
    ctx.strokeStyle = 'rgba(255,236,190,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-6, 0, 40, -1.1, 1.1);
    ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255,170,90,0.8)';
    ctx.beginPath();
    ctx.arc(-14, 0, 50, -1.0, 1.0);
    ctx.stroke();
    ctx.restore();
    // 熱浪：頭周圍兩圈淡淡、不停抖動的光環
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = 'rgba(255,220,180,1)';
    ctx.lineWidth = 1.5;
    for (let j = 0; j < 2; j++) {
      ctx.beginPath();
      ctx.ellipse(x - ca * 8, y - sa * 8, 44 + j * 12 + Math.sin(t * 40 + j) * 3, 38 + j * 10 + Math.cos(t * 37 + j) * 3, e.ang, 0, TAU);
      ctx.stroke();
    }
    // 岩體（自轉）
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const RH = 30;
    const sc = RH / HEAD.R;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(e.rot + t * 5);
    ctx.drawImage(HEAD.c, (-HEAD.S / 2) * sc, (-HEAD.S / 2) * sc, HEAD.S * sc, HEAD.S * sc);
    ctx.restore();
    // 迎風面燒到白熱
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.95;
    r = RH * 1.25;
    ctx.drawImage(HOT, x + ca * RH * 0.45 - r, y + sa * RH * 0.45 - r, r * 2, r * 2);
    ctx.globalAlpha = 0.5 + 0.2 * k;
    r = 70 * fk;
    ctx.drawImage(FIRE, x - r, y - r, r * 2, r * 2);
  }

  function drawBack(ctx) {
    for (const e of MS) {
      const x = e.x;
      const gy = e.gy;
      if (!e.hit) {
        // 落點的地面被越照越亮，還有越來越濃的影子
        const k = clamp(e.t / e.fall, 0, 1);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.5 * k;
        ctx.drawImage(SCORCH, x - 60 * k, gy - 8, 120 * k, 16);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 * k * k;
        const r = 60 + 160 * k;
        ctx.drawImage(FIRE, x - r, gy - r * 0.28, r * 2, r * 0.56);
        continue;
      }
      if (!e.ground) continue;
      const ht = e.ht;
      const a = ht < e.burn ? 1 : clamp(1 - (ht - e.burn) / 0.9, 0, 1);
      const heat = clamp(1 - ht / (e.burn + 0.4), 0, 1);
      const Rc = e.Rc;
      ctx.save();
      ctx.beginPath();
      ctx.rect(e.span0, gy - 3, e.span1 - e.span0, e.depth + 3);
      ctx.clip();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      ctx.drawImage(SCORCH, x - Rc * 2.2, gy - Rc * 0.3, Rc * 4.4, Rc * 1.1);
      // 坑
      ctx.beginPath();
      ctx.moveTo(e.bowl[0], gy - 1);
      for (let i = 0; i <= 10; i++) ctx.lineTo(e.bowl[i * 2], e.bowl[i * 2 + 1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(22,12,10,0.94)';
      ctx.fill();
      // 坑底的熔岩：一灘會慢慢冷卻的亮橘
      if (heat > 0) {
        ctx.globalCompositeOperation = 'lighter';
        const fl = 0.85 + 0.15 * Math.sin(ht * 17) * Math.sin(ht * 7.3);
        ctx.globalAlpha = heat * fl;
        ctx.drawImage(FIRE, x - Rc * 0.85, gy + Rc * 0.02, Rc * 1.7, Rc * 0.42);
        ctx.globalAlpha = heat * heat * 0.8;
        ctx.drawImage(HOT, x - Rc * 0.45, gy + Rc * 0.06, Rc * 0.9, Rc * 0.26);
      }
      // 裂縫（先深色、再透出熔岩光）
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let c = 0; c < e.crN; c++) {
        for (let i = 0; i < 6; i++) {
          const j = (c * 6 + i) * 2;
          i ? ctx.lineTo(e.cr[j], e.cr[j + 1]) : ctx.moveTo(e.cr[j], e.cr[j + 1]);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(20,10,8,0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
      if (heat > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = heat * 0.5;
        ctx.strokeStyle = '#ff5a1a';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.globalAlpha = heat;
        ctx.strokeStyle = '#ffc860';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // 坑緣一圈熔岩亮邊
        ctx.beginPath();
        for (let i = 1; i < 10; i++) {
          const j = i * 2;
          i > 1 ? ctx.lineTo(e.bowl[j], e.bowl[j + 1] - 1.5) : ctx.moveTo(e.bowl[j], e.bowl[j + 1] - 1.5);
        }
        ctx.globalAlpha = heat * 0.55;
        ctx.strokeStyle = '#ff7a2a';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.globalAlpha = heat;
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
      // 半埋在坑裡的隕石殘骸（下半截被地面裁掉）
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 60, gy - 80, 120, 80 + Rc * 0.12);
      ctx.clip();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      const sc = 22 / HEAD.R;
      ctx.translate(x + 4, gy + 4);
      ctx.rotate(e.rot);
      ctx.drawImage(HEAD.c, (-HEAD.S / 2) * sc, (-HEAD.S / 2) * sc, HEAD.S * sc, HEAD.S * sc);
      ctx.restore();
      if (heat > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = heat * 0.8;
        ctx.drawImage(FIRE, x - 40, gy - 30, 80, 50);
      }
      // 坑緣翻起的岩塊：坐在地表上，燒紅慢慢退成灰
      ctx.globalCompositeOperation = 'source-over';
      for (const l of e.lips) {
        const s = SMALL[l.spr];
        if (!s) break;
        const w = (s.S * l.r) / s.R;
        ctx.save();
        ctx.translate(l.x, gy - l.r * 0.55);
        ctx.rotate(l.rot);
        ctx.globalAlpha = a;
        ctx.drawImage(s.c, -w / 2, -w / 2, w, w);
        if (heat > 0.02) {
          ctx.globalAlpha = a * heat;
          ctx.drawImage(HOTROCK[l.spr], -w / 2, -w / 2, w, w);
        }
        ctx.restore();
      }
      // 坑裡竄起的火舌（燃燒區域期間）
      if (ht < e.burn) {
        const fa = clamp((e.burn - ht) / 0.6, 0, 1) * clamp(ht / 0.2, 0, 1);
        ctx.globalCompositeOperation = 'lighter';
        const n = lite() ? 3 : 6;
        for (let j = 0; j < n; j++) {
          const fx = x + ((j / (n - 1)) * 2 - 1) * Rc * 0.8;
          const f = 0.5 + 0.5 * Math.sin(ht * (9 + j * 1.7) + j * 2.3);
          const h = (26 + 26 * f) * (1 - Math.abs((j / (n - 1)) * 2 - 1) * 0.45);
          ctx.globalAlpha = fa * (0.45 + 0.35 * f);
          ctx.drawImage(FIRE, fx - h * 0.32, gy - h + 6, h * 0.64, h);
        }
      }
    }
  }

  function drawFront(ctx) {
    // 1. 煙（飛行的煙尾、撞擊的煙柱、地面的塵）
    if (mpN) {
      ctx.globalCompositeOperation = 'source-over';
      for (const q of MP) {
        if (!q.on) continue;
        if (q.k === 0) {
          const k = q.t / q.life;
          const s = q.s * (0.7 + 2.2 * k);
          ctx.globalAlpha = (1 - k) * 0.8;
          ctx.drawImage(SMK, q.x - s, q.y - s, s * 2, s * 2);
        } else if (q.k === 6) {
          const k = q.t / q.life;
          const s = q.s * (0.6 + 1.1 * k);
          ctx.globalAlpha = (1 - k) * 0.85;
          ctx.drawImage(DUST, q.x - s, q.y - s * 0.7, s * 2, s * 1.4);
        }
      }
      for (const q of MP) {
        if (!q.on || q.k !== 5) continue;
        const tt = q.t + q.b;
        if (tt <= 0) continue;
        const k = tt / q.life;
        const s = q.s * (0.55 + 1.3 * Math.sqrt(k));
        ctx.globalAlpha = (1 - k) * Math.min(1, tt / 0.12) * 0.9;
        ctx.drawImage(SMK, q.x - s, q.y - s, s * 2, s * 2);
      }
      // 煙柱裡面透出的火光（早期）
      ctx.globalCompositeOperation = 'lighter';
      for (const q of MP) {
        if (!q.on || q.k !== 5) continue;
        const tt = q.t + q.b;
        if (tt <= 0 || tt > 0.55) continue;
        const k = tt / 0.55;
        const s = q.s * (0.5 + 0.8 * k);
        ctx.globalAlpha = (1 - k) * 0.7;
        ctx.drawImage(FIRE, q.x - s, q.y - s, s * 2, s * 2);
      }
    }
    // 2. 流星本體
    for (const e of MS) if (!e.hit && e.t > 0) drawHead(ctx, e);
    // 3. 岩塊
    if (mpN) {
      ctx.globalCompositeOperation = 'source-over';
      for (const q of MP) {
        if (!q.on || q.k !== 3) continue;
        const s = SMALL[q.spr];
        if (!s) continue;
        const k = q.t / q.life;
        const a = Math.min(1, (1 - k) * 5);
        const w = (s.S * q.s) / s.R;
        const heat = clamp(1 - q.t / 1.6, 0, 1);
        const y = q.land >= 0 ? q.y - q.s * 0.5 : q.y;
        ctx.save();
        ctx.translate(q.x, y);
        ctx.rotate(q.rot);
        ctx.globalAlpha = a;
        ctx.drawImage(s.c, -w / 2, -w / 2, w, w);
        if (heat > 0.02) {
          ctx.globalAlpha = a * heat;
          ctx.drawImage(HOTROCK[q.spr], -w / 2, -w / 2, w, w);
        }
        ctx.restore();
        // 飛行中拖一小段火光
        if (q.land < 0 && heat > 0.1) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = heat * 0.6;
          ctx.strokeStyle = '#ff9a3a';
          ctx.lineWidth = q.s * 0.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(q.x - q.vx * 0.045, q.y - q.vy * 0.045);
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      // 岩殼碎片
      for (const q of MP) {
        if (!q.on || q.k !== 2) continue;
        const k = q.t / q.life;
        ctx.globalAlpha = 1 - k;
        const s = q.s;
        const c = Math.cos(q.rot);
        const sn = Math.sin(q.rot);
        ctx.beginPath();
        ctx.moveTo(q.x + c * s, q.y + sn * s);
        ctx.lineTo(q.x - sn * s * 0.7, q.y + c * s * 0.7);
        ctx.lineTo(q.x - c * s * 0.8, q.y - sn * s * 0.8);
        ctx.closePath();
        ctx.fillStyle = k < 0.4 ? '#8a3a1a' : '#2e2220';
        ctx.fill();
      }
      // 4. 發光的粒子：火花、熔岩飛沫、火星
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const q of MP) {
        if (!q.on) continue;
        const k = q.t / q.life;
        if (q.k === 1) {
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = k < 0.35 ? '#fff2c0' : '#ffae4a';
          ctx.lineWidth = q.s;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03);
          ctx.stroke();
        } else if (q.k === 4) {
          if (q.land < 0) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#ffc860';
            ctx.lineWidth = q.s;
            ctx.beginPath();
            ctx.moveTo(q.x, q.y);
            ctx.lineTo(q.x - q.vx * 0.025, q.y - q.vy * 0.025);
            ctx.stroke();
          } else {
            // 落地的熔岩滴：攤成一小片，慢慢暗掉
            const c = clamp(1 - (q.t - q.land) / 0.9, 0, 1);
            ctx.globalAlpha = c * (1 - k);
            const r = q.s * 3.2;
            ctx.drawImage(FIRE, q.x - r, q.y - r * 0.35, r * 2, r * 0.7);
          }
        } else if (q.k === 7) {
          ctx.globalAlpha = (1 - k) * (0.6 + 0.4 * Math.sin(q.t * 30 + q.rot));
          ctx.fillStyle = k < 0.5 ? '#ffd27a' : '#ff7a2a';
          ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
        }
      }
    }
    // 5. 撞擊：局部的光暈、火球、地面衝擊波
    for (const e of MS) {
      if (!e.hit) continue;
      const ht = e.ht;
      const x = e.x;
      const gy = e.gy;
      ctx.globalCompositeOperation = 'lighter';
      if (ht < 0.5) {
        const k = ht / 0.5;
        const r = 70 + 110 * eOut(Math.min(1, ht / 0.1));
        ctx.globalAlpha = Math.pow(1 - k, 1.8) * 0.75;
        ctx.drawImage(HOT, x - r, gy - 20 - r * 0.8, r * 2, r * 1.6);
        // 往上竄的光柱（撞擊的一瞬間）
        ctx.globalAlpha = Math.pow(1 - k, 2.6) * 0.55;
        ctx.drawImage(HOT, x - 28, gy - 230, 56, 250);
      }
      if (ht < 0.8) {
        // 火球：一團往上翻、邊冷邊散的火
        const k = ht / 0.8;
        const r = 40 + 90 * eOut(Math.min(1, ht / 0.3));
        ctx.globalAlpha = (1 - k) * (1 - k) * 0.8;
        ctx.drawImage(FIRE, x - r, gy - r * 0.9 - 50 * k, r * 2, r * 1.6);
        ctx.globalAlpha = (1 - k) * 0.6;
        const r2 = r * 0.55;
        ctx.drawImage(FIRE, x - r2 + 30 * k, gy - r - 70 * k - r2, r2 * 2, r2 * 2);
      }
      // 地面衝擊波（兩圈）＋空氣中的半圓爆風
      for (let w = 0; w < 2; w++) {
        const k = (ht - w * 0.07) / (0.48 + w * 0.12);
        if (k <= 0 || k >= 1) continue;
        const rx = 30 + e.blast * 1.7 * eOut(k) * (w ? 0.8 : 1);
        ctx.globalAlpha = (1 - k) * (w ? 0.55 : 0.95);
        ctx.strokeStyle = w ? '#ff8a3a' : '#ffe6b0';
        ctx.lineWidth = (w ? 4 : 8) * (1 - k) + 1;
        ctx.beginPath();
        ctx.ellipse(x, gy - 2, rx, rx * 0.14, 0, 0, TAU);
        ctx.stroke();
      }
      const kd = ht / 0.3;
      if (kd < 1) {
        const r = 24 + e.blast * 1.05 * eOut(kd);
        ctx.globalAlpha = (1 - kd) * 0.5;
        ctx.strokeStyle = '#ffd8a0';
        ctx.lineWidth = 5 * (1 - kd) + 1;
        ctx.beginPath();
        ctx.arc(x, gy, r, PI, TAU);
        ctx.stroke();
      }
    }
  }

  A.meteorFx = {
    // o: { x, y（目標腳下）, from（從哪一側飛來：-1 左、1 右）, fall（飛行秒數）, blast, burn }
    cast,
    // 落地（遊戲那邊造成傷害的同一刻呼叫）
    impact(e) {
      if (e) {
        headAt(e, 1);
        impact(e);
      }
    },
  };
  A.skillFx.add({
    live: () => MS.length > 0 || mpN > 0,
    step: meteorStep,
    back: drawBack,
    front: drawFront,
    clear() {
      MS.length = 0;
      for (const q of MP) q.on = false;
      mpN = 0;
    },
  });
})();

// ═════════ 極光風暴 ═════════
// 施法者身邊捲起一層層極光簾幕（下緣亮綠、往上轉青、再轉紫，帶著一條條垂直的光束紋），
// 簾幕沿著橢圓螺旋繞著施法者轉、越轉越緊，形成漩渦；每一波是一圈極光簾往外掃出去（綠、紫、青三色），
// 掃過的敵人身上留下極光冰霜的微光（緩速中的標示）；空中飄著閃爍的光點，地上映著極光的倒影。
// 簾幕是事先畫好的貼圖，每幀只切成一條條垂直的細片沿著曲線貼上去；在施法者後面的那一半畫在 back 層。
(function () {
  'use strict';
  const A = G.art;
  if (!A.skillFx) return;
  const TAU = Math.PI * 2;
  const PI = Math.PI;
  let seed = 90210;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const rr = (a, b) => a + (b - a) * rnd();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const eOut = (k) => 1 - (1 - k) * (1 - k);
  const lite = () => !!G.lowFx;
  const mk = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w);
    c.height = Math.ceil(h || w);
    return c;
  };
  function radial(size, stops) {
    const cv = mk(size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  }
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';

  // 極光簾幕貼圖：橫向可以無縫重複（光束紋用整數頻率的正弦疊出來）
  const CW = 256;
  const CH = 128;
  function curtain(bot, mid, top, seedOff) {
    const strip = mk(1, CH);
    const sc = strip.getContext('2d');
    const g = sc.createLinearGradient(0, CH, 0, 0);
    g.addColorStop(0, rgba(bot, 0));
    g.addColorStop(0.05, 'rgba(206,255,228,0.85)');
    g.addColorStop(0.12, rgba(bot, 0.95));
    g.addColorStop(0.36, rgba(bot, 0.6));
    g.addColorStop(0.62, rgba(mid, 0.38));
    g.addColorStop(0.86, rgba(top, 0.18));
    g.addColorStop(1, rgba(top, 0));
    sc.fillStyle = g;
    sc.fillRect(0, 0, 1, CH);
    const cv = mk(CW, CH);
    const c = cv.getContext('2d');
    const ph = [1.3, 4.1, 2.2, 5.7, 0.4].map((p) => p + seedOff);
    for (let x = 0; x < CW; x++) {
      const u = (x / CW) * TAU;
      const n = 0.5 + 0.22 * Math.sin(u * 3 + ph[0]) + 0.16 * Math.sin(u * 7 + ph[1]) + 0.12 * Math.sin(u * 13 + ph[2]) + 0.1 * Math.sin(u * 29 + ph[3]);
      const n2 = 0.5 + 0.5 * Math.sin(u * 11 + ph[4]) * Math.sin(u * 5 + ph[1]);
      c.globalAlpha = clamp(0.2 + 0.85 * n * n * 1.6, 0.12, 1);
      const y0 = CH * 0.28 * n2; // 光束高低不齊
      c.drawImage(strip, x, y0, 1, CH - y0);
    }
    return cv;
  }
  const GREEN = [110, 255, 180];
  const CYAN = [110, 220, 255];
  const VIOLET = [190, 130, 255];
  const PINK = [255, 140, 220];
  const CUR = [curtain(GREEN, CYAN, VIOLET, 0), curtain(VIOLET, PINK, CYAN, 1.7), curtain(CYAN, GREEN, VIOLET, 3.1)];
  const GLOW = radial(128, [[0, 'rgba(210,255,236,0.9)'], [0.3, 'rgba(120,240,200,0.45)'], [0.65, 'rgba(140,120,255,0.14)'], [1, 'rgba(120,90,255,0)']]);
  const REFL = radial(128, [[0, 'rgba(120,255,200,0.5)'], [0.45, 'rgba(100,200,255,0.22)'], [0.8, 'rgba(170,120,255,0.08)'], [1, 'rgba(170,120,255,0)']]);
  const FROST = radial(64, [[0, 'rgba(236,255,255,0.9)'], [0.4, 'rgba(150,230,255,0.4)'], [1, 'rgba(150,200,255,0)']]);
  const WAVE_C = [GREEN, VIOLET, CYAN];

  // 一段簾幕：沿著一串點（x、地面 y、高度、透明度）切片貼上；front：只畫 z>=0（施法者前面）或 z<0 的片
  const BX = new Float32Array(64);
  const BY = new Float32Array(64);
  const BH = new Float32Array(64);
  const BA = new Float32Array(64);
  const BZ = new Float32Array(64);
  function drawStrip(ctx, tex, n, u0, uLen, front, amul) {
    for (let i = 0; i < n - 1; i++) {
      const z = BZ[i] + BZ[i + 1];
      if (front ? z < 0 : z >= 0) continue;
      const a = (BA[i] + BA[i + 1]) * 0.5 * amul;
      if (a <= 0.01) continue;
      const h = (BH[i] + BH[i + 1]) * 0.5;
      if (h < 2) continue;
      const x0 = Math.min(BX[i], BX[i + 1]);
      const w = Math.abs(BX[i + 1] - BX[i]) + 1.2;
      const y = (BY[i] + BY[i + 1]) * 0.5;
      let sx = (((u0 + (i / (n - 1)) * uLen) % 1) + 1) % 1;
      sx *= CW;
      const sw = Math.max(1, Math.min(CW - sx, (uLen * CW) / (n - 1)));
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(tex, sx, 0, sw, CH, x0, y - h, w, h);
    }
  }

  const AU = [];
  const HIT = [];
  // 光點池
  const MO = [];
  for (let i = 0; i < 90; i++) MO.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, c: 0, ph: 0 });
  let moN = 0;
  function mote(x, y, vx, vy, life, s, c) {
    for (const q of MO) {
      if (q.on) continue;
      q.on = true;
      moN++;
      q.x = x;
      q.y = y;
      q.vx = vx;
      q.vy = vy;
      q.t = 0;
      q.life = life;
      q.s = s;
      q.c = c;
      q.ph = rr(0, TAU);
      return q;
    }
    return null;
  }
  const MOC = ['#c8ffe6', '#9ff0ff', '#d8c0ff', '#ffffff'];

  function begin(P, S) {
    const e = { t: 0, hitAt: S.hitAt || 0.25, radius: S.radius || 480, waves: [], nW: S.waves || 3, every: 0.28, dir: P.dir || 1, moT: 0, end: 0, x: P.x, y: P.y, rib: [] };
    const n = lite() ? 2 : 4;
    for (let i = 0; i < n; i++) e.rib.push({ th: (i / n) * TAU + rr(-0.3, 0.3), sp: rr(2.8, 3.8), span: rr(3.4, 4.4), h: i % 2 ? rr(150, 190) : rr(210, 250), tex: i % 3, u: rr(0, 1), lift: rr(8, 26) });
    e.end = e.hitAt + (e.nW - 1) * e.every + 0.9;
    AU.push(e);
    return e;
  }
  function wave(e, w) {
    if (!e) return;
    e.waves.push({ t: 0, w, u: rr(0, 1) });
    // 波出發的一瞬間，從腳下往上噴一把光點
    const n = lite() ? 4 : 10;
    for (let i = 0; i < n; i++) {
      const a = rr(0, TAU);
      mote(e.x + Math.cos(a) * 30, e.y - 20 - rr(0, 60), Math.cos(a) * rr(60, 200), -rr(40, 160), rr(0.8, 1.4), rr(1.5, 3), i % 4);
    }
  }
  function hit(m, w) {
    if (!m) return;
    for (const h of HIT) {
      if (h.m === m) {
        h.t = 0;
        h.w = w;
        return;
      }
    }
    if (HIT.length >= 24) HIT.shift();
    HIT.push({ m, t: 0, w, ph: rr(0, TAU), u: rr(0, 1) });
  }

  function auroraStep(dt) {
    if (moN) {
      for (const q of MO) {
        if (!q.on) continue;
        q.t += dt;
        if (q.t >= q.life) {
          q.on = false;
          moN--;
          continue;
        }
        const d = 1 - Math.min(1, dt * 1.8);
        q.vx *= d;
        q.vy = q.vy * d - 22 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
    }
    const P = G.player;
    for (let i = AU.length - 1; i >= 0; i--) {
      const e = AU[i];
      e.t += dt;
      if (P) {
        e.x = P.x;
        e.y = P.y;
      }
      for (const wv of e.waves) wv.t += dt;
      if (e.t > e.end + 0.5) {
        AU.splice(i, 1);
        continue;
      }
      // 漩渦裡飄的光點
      e.moT -= dt;
      if (e.moT <= 0 && e.t < e.end) {
        e.moT = lite() ? 0.06 : 0.022;
        const a = rr(0, TAU);
        const r = rr(40, rad(e) * 1.1);
        mote(e.x + Math.cos(a) * r, e.y - 10 - rr(0, 150), -Math.sin(a) * rr(20, 70) * e.dir, -rr(10, 50), rr(0.8, 1.6), rr(1.2, 2.6), Math.floor(rr(0, 4)));
      }
    }
    for (let i = HIT.length - 1; i >= 0; i--) {
      const h = HIT[i];
      h.t += dt;
      const m = h.m;
      const on = m && !m.dead && (m.slowT > 0 || h.t < 0.6);
      if (!on || h.t > 3.4) HIT.splice(i, 1);
    }
  }
  // 漩渦半徑：施法時由內往外張開，最後一波後收掉
  function rad(e) {
    const t = e.t;
    const open = eOut(clamp(t / e.hitAt, 0, 1));
    return 60 + 170 * open + 14 * Math.sin(t * 5);
  }
  function fadeOf(e) {
    const t = e.t;
    return clamp(t / 0.15, 0, 1) * clamp((e.end - t) / 0.5, 0, 1);
  }

  // 螺旋簾幕：一條從外往內捲、繞著施法者轉的極光帶
  function ribbons(ctx, e, front) {
    const fa = fadeOf(e);
    if (fa <= 0) return;
    const R = rad(e);
    const n = lite() ? 18 : 34;
    const cx = e.x;
    const gy = e.y - 6;
    for (const rb of e.rib) {
      const th0 = rb.th + e.t * rb.sp * e.dir;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const th = th0 - u * rb.span * e.dir;
        const r = R * (1.1 - 0.55 * u);
        const s = Math.sin(th);
        BX[i] = cx + Math.cos(th) * r;
        BZ[i] = s;
        BY[i] = gy + s * r * 0.26 - rb.lift - u * 30;
        const taper = Math.pow(Math.sin(PI * clamp(u * 1.05, 0, 1)), 0.7);
        BH[i] = rb.h * taper * (0.75 + 0.25 * Math.sin(e.t * 6 + u * 9 + rb.u * 6)) * (0.6 + 0.4 * fa);
        BA[i] = fa * (0.55 + 0.45 * taper) * (front ? 0.46 : 0.85);
      }
      drawStrip(ctx, CUR[rb.tex], n, rb.u - e.t * 0.35, 1.4, front, 1);
    }
  }
  // 往外掃出去的一圈極光簾
  function waves(ctx, e, front) {
    const n = lite() ? 26 : 44;
    const cx = e.x;
    const gy = e.y - 6;
    for (const wv of e.waves) {
      const k = wv.t / 0.5;
      if (k >= 1) continue;
      const r = 50 + (e.radius - 50) * eOut(k);
      const a = (1 - k) * Math.min(1, wv.t / 0.05);
      const h = 200 * (1 - k * 0.7);
      for (let i = 0; i < n; i++) {
        const th = (i / (n - 1)) * TAU;
        const s = Math.sin(th);
        BX[i] = cx + Math.cos(th) * r;
        BZ[i] = s;
        BY[i] = gy + s * r * 0.2;
        BH[i] = h * (0.8 + 0.2 * Math.sin(th * 5 + wv.t * 12));
        BA[i] = a * (front ? 0.45 : 0.8);
      }
      drawStrip(ctx, CUR[wv.w % 3], n, wv.u, 3, front, 1);
    }
  }
  // 地上的倒影、波在地面上的亮圈
  function groundGlow(ctx, e) {
    const fa = fadeOf(e);
    const cx = e.x;
    const gy = e.y;
    ctx.globalCompositeOperation = 'lighter';
    const R = rad(e) * 1.6;
    ctx.globalAlpha = fa * (0.55 + 0.1 * Math.sin(e.t * 7));
    ctx.drawImage(REFL, cx - R, gy - R * 0.2, R * 2, R * 0.4);
    for (const wv of e.waves) {
      const k = wv.t / 0.5;
      if (k >= 1) continue;
      const r = 50 + (e.radius - 50) * eOut(k);
      const c = WAVE_C[wv.w % 3];
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = rgba(c, 1);
      ctx.lineWidth = 6 * (1 - k) + 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, gy - 2, r, r * 0.2, 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = '#eafff6';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  function hitboxOf(m) {
    if (m.hitbox) return m.hitbox();
    const sc = m.scale || 1;
    return { x: m.x - (m.w || 40) * sc * 0.5, y: m.y - (m.h || 40) * sc, w: (m.w || 40) * sc, h: (m.h || 40) * sc };
  }
  // 被掃到的敵人：剛打中時一道極光從腳下竄起；緩速期間身上一層冰霜極光在流動、冰晶閃爍
  function drawHits(ctx, t) {
    ctx.globalCompositeOperation = 'lighter';
    for (const h of HIT) {
      const m = h.m;
      const hb = hitboxOf(m);
      const cx = hb.x + hb.w / 2;
      const fy = hb.y + hb.h;
      const w = Math.max(40, hb.w * 1.1);
      const k0 = h.t / 0.45;
      if (k0 < 1) {
        // 竄起的光束
        const hh = hb.h * 1.2 + 70;
        ctx.globalAlpha = (1 - k0) * 0.42;
        ctx.drawImage(CUR[h.w % 3], (h.u * CW) % (CW - 40), 0, 40, CH, cx - w * 0.5, fy - hh * eOut(Math.min(1, k0 * 3)), w, hh * eOut(Math.min(1, k0 * 3)));
        const r = Math.max(hb.w, hb.h) * 0.8;
        ctx.globalAlpha = (1 - k0) * (1 - k0) * 0.4;
        ctx.drawImage(GLOW, cx - r, hb.y + hb.h * 0.5 - r, r * 2, r * 2);
      }
      const slow = m.slowT > 0 ? clamp(m.slowT / 0.4, 0, 1) : 0;
      if (slow <= 0) continue;
      // 身上流動的冰霜極光（很淡）
      const pul = 0.5 + 0.5 * Math.sin(t * 4 + h.ph);
      ctx.globalAlpha = slow * (0.22 + 0.14 * pul);
      const sx = ((h.u + t * 0.2) % 1) * (CW - 48);
      ctx.drawImage(CUR[2], sx, 0, 48, CH, cx - w * 0.55, hb.y - 10, w * 1.1, hb.h + 12);
      // 腳下的一圈冷光
      ctx.globalAlpha = slow * 0.5;
      ctx.drawImage(REFL, cx - w * 0.8, fy - 8, w * 1.6, 16);
      // 冰晶：繞著身體慢慢轉、一閃一閃
      const nC = lite() ? 2 : 4;
      for (let i = 0; i < nC; i++) {
        const a = t * 1.3 + h.ph + (i / nC) * TAU;
        const px = cx + Math.cos(a) * w * 0.5;
        const py = hb.y + hb.h * (0.35 + 0.3 * Math.sin(a * 0.7 + i)) + Math.sin(a) * 4;
        const tw = 0.5 + 0.5 * Math.sin(t * 9 + i * 2.1 + h.ph);
        const s = 3 + 3 * tw;
        ctx.globalAlpha = slow * (0.4 + 0.6 * tw) * (Math.cos(a) > -0.2 ? 1 : 0.4);
        ctx.drawImage(FROST, px - s * 1.6, py - s * 1.6, s * 3.2, s * 3.2);
        ctx.fillStyle = '#f0ffff';
        ctx.fillRect(px - s, py - 0.6, s * 2, 1.2);
        ctx.fillRect(px - 0.6, py - s, 1.2, s * 2);
      }
    }
  }
  function drawMotes(ctx) {
    if (!moN) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const q of MO) {
      if (!q.on) continue;
      const k = q.t / q.life;
      const tw = 0.55 + 0.45 * Math.sin(q.t * 14 + q.ph);
      const a = (1 - k) * Math.min(1, q.t / 0.12) * tw;
      ctx.globalAlpha = a * 0.6;
      const s = q.s * 3;
      ctx.drawImage(FROST, q.x - s, q.y - s, s * 2, s * 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = MOC[q.c];
      ctx.fillRect(q.x - q.s * 0.5, q.y - q.s * 0.5, q.s, q.s);
    }
  }

  function auroraBack(ctx) {
    for (const e of AU) {
      groundGlow(ctx, e);
      ctx.globalCompositeOperation = 'lighter';
      // 施法者身後的一團光
      const fa = fadeOf(e);
      const r = 90 + rad(e) * 0.5;
      ctx.globalAlpha = fa * 0.4;
      ctx.drawImage(GLOW, e.x - r, e.y - 70 - r * 0.8, r * 2, r * 1.6);
      ribbons(ctx, e, false);
      waves(ctx, e, false);
    }
  }
  function auroraFront(ctx) {
    for (const e of AU) {
      ctx.globalCompositeOperation = 'lighter';
      ribbons(ctx, e, true);
      waves(ctx, e, true);
    }
    if (HIT.length) drawHits(ctx, G.time || 0);
    drawMotes(ctx);
  }

  A.auroraFx = {
    // 開始施法（S：技能資料，用 hitAt、radius、waves）
    begin,
    // 第 w 波出發（遊戲那邊造成傷害的同一刻）
    wave,
    // 這一波打中了 m（之後緩速期間身上有冰霜極光）
    hit,
  };
  A.skillFx.add({
    live: () => AU.length > 0 || HIT.length > 0 || moN > 0,
    step: auroraStep,
    back: auroraBack,
    front: auroraFront,
    clear() {
      AU.length = 0;
      HIT.length = 0;
      for (const q of MO) q.on = false;
      moN = 0;
    },
  });
})();
