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
        if (p[2] - u.oy <= 160) s = { i, x0: p[0], x1: p[1], y: p[2], ground: i === 0 };
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
            ctx.drawImage(f.ground, sx, 0, ex - sx, f.depth, f.gx + sx, f.gy, ex - sx, f.depth);
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
  function surfY(x, y0) {
    const map = G.world && G.world.map;
    if (!map || !G.physics) return null;
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
        y = clamp(y + rr(-2.2, 2.2), p[2] + 2, p[2] + (p === G.world.map.platforms[0] ? 11 : 7));
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
