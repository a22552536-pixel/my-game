// 開場動畫的「繪畫質感」工具：噪聲材質、圓柱體打光的樹幹與樹根、一片片小葉堆出來的樹冠、
// 有層理與垂根的浮島岩體、體積感的雲。全部只在圖層快取時畫一次（js/ui/scenes.js 的 DEFS 用），
// 每幀只貼圖。光一律從左上方來（跟天空的太陽同一邊）。
(function () {
  'use strict';
  const U = G.util;
  const A = G.art;
  const PI2 = Math.PI * 2;
  const OA = (G.openArt = {});

  const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  OA.cv = cv;
  // ── 顏色 ──
  const hex = (h) => U.hexToRgb(h);
  const RGBC = new Map();
  const rgb = (a, al) => (al == null ? rgbq(a) : 'rgba(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ',' + (al < 0 ? 0 : al > 1 ? 1 : al).toFixed(3) + ')');
  function rgbq(a) {
    const k = ((a[0] & 252) << 16) | ((a[1] & 252) << 8) | (a[2] & 252);
    let v = RGBC.get(k);
    if (!v) RGBC.set(k, (v = 'rgb(' + (a[0] & 252) + ',' + (a[1] & 252) + ',' + (a[2] & 252) + ')'));
    return v;
  }
  const mixA = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // 多段色階：stops = [[t, [r,g,b]], ...]
  function ramp(stops, t) {
    if (t <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const k = (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
        return mixA(stops[i - 1][1], stops[i][1], k);
      }
    }
    return stops[stops.length - 1][1];
  }
  OA.hex = hex;
  OA.rgb = rgb;
  OA.mix = mixA;
  OA.ramp = ramp;
  const P = (list) => list.map(([t, h]) => [t, typeof h === 'string' ? hex(h) : h]);
  OA.P = P;

  // 光的方向（x 右、y 下、z 朝鏡頭）：左上前方
  const LIGHT = (() => {
    const v = [-0.62, -0.5, 0.6];
    const l = Math.hypot(v[0], v[1], v[2]);
    return v.map((q) => q / l);
  })();
  OA.LIGHT = LIGHT;

  // ── 噪聲 ──
  function ihash(x, y, s) {
    let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967295;
  }
  function vnoise(x, y, s, per) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    let x0 = xi;
    let x1 = xi + 1;
    let y0 = yi;
    let y1 = yi + 1;
    if (per) {
      x0 = ((x0 % per) + per) % per;
      x1 = ((x1 % per) + per) % per;
      y0 = ((y0 % per) + per) % per;
      y1 = ((y1 % per) + per) % per;
    }
    const a = ihash(x0, y0, s);
    const b = ihash(x1, y0, s);
    const c = ihash(x0, y1, s);
    const d = ihash(x1, y1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s, oct) {
    let v = 0;
    let amp = 0.5;
    let f = 1;
    let tot = 0;
    for (let i = 0; i < (oct || 4); i++) {
      v += vnoise(x * f, y * f, s + i * 17) * amp;
      tot += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return v / tot;
  }
  OA.noise = vnoise;
  OA.fbm = fbm;

  // 可以無縫鋪的材質貼圖（灰階，128 為中性，拿來做 soft-light / overlay）
  const TEX = {};
  function tile(kind) {
    if (TEX[kind]) return TEX[kind];
    const S = kind === 'fbm' ? 192 : 128;
    const c = cv(S, S);
    const x = c.getContext('2d');
    const img = x.createImageData(S, S);
    const d = img.data;
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        let v;
        if (kind === 'grain') v = 128 + (ihash(i, j, 7) - 0.5) * 120;
        else if (kind === 'fbm') {
          // 四層週期雜訊（週期 4、8、16、32 格）
          let s = 0;
          let a = 0.5;
          let tot = 0;
          for (let o = 0; o < 4; o++) {
            const per = 3 << o;
            s += vnoise((i / S) * per, (j / S) * per, 31 + o, per) * a;
            tot += a;
            a *= 0.55;
          }
          v = 128 + (s / tot - 0.5) * 300;
        } else if (kind === 'streak') {
          // 直向的纖維（樹皮、岩壁上的流痕）
          let s = 0;
          let a = 0.5;
          let tot = 0;
          for (let o = 0; o < 3; o++) {
            const px = 8 << o;
            const py = 2 << o;
            s += vnoise((i / S) * px, (j / S) * py, 57 + o, 0) * a;
            tot += a;
            a *= 0.5;
          }
          // 讓上下接得起來：跟自己翻轉的版本混
          v = 128 + (s / tot - 0.5) * 280;
        }
        const q = (j * S + i) * 4;
        d[q] = d[q + 1] = d[q + 2] = v < 0 ? 0 : v > 255 ? 255 : v;
        d[q + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return (TEX[kind] = c);
  }
  OA.tile = tile;

  // 在目前的路徑／clip 範圍內鋪材質（範圍內必須已經是不透明的）
  // o: { fbm, grain, streak, scale, op }
  OA.texture = function (c, x, y, w, h, o) {
    c.save();
    const sc = o.scale || 1;
    c.globalCompositeOperation = 'source-atop';
    for (const k of ['fbm', 'streak', 'grain']) {
      const a = o[k];
      if (!a) continue;
      const pat = c.createPattern(aTile(k), 'repeat');
      const s = k === 'grain' ? o.grainScale || 1 : sc;
      if (pat.setTransform) {
        const an = k === 'grain' ? 0 : o.angle || 0;
        pat.setTransform(new DOMMatrix([s * Math.cos(an), s * Math.sin(an), -s * Math.sin(an), s * Math.cos(an), x, y]));
      }
      c.globalAlpha = a * 0.55;
      c.fillStyle = pat;
      c.fillRect(x, y, w, h);
    }
    c.restore();
  };

  // 整張圖層的收尾：只在有東西的像素上加顆粒與斑駁。
  // 用「黑或白、帶透明度」的貼圖以 source-atop 蓋上去（不用 soft-light：軟體繪圖時那個很慢）
  const ATILE = {};
  function aTile(kind) {
    if (ATILE[kind]) return ATILE[kind];
    const src = tile(kind);
    const S = src.width;
    const d0 = src.getContext('2d').getImageData(0, 0, S, S).data;
    const c = cv(S, S);
    const x = c.getContext('2d');
    const img = x.createImageData(S, S);
    const d = img.data;
    for (let i = 0; i < S * S; i++) {
      const v = (d0[i * 4] - 128) / 128;
      const w = v > 0 ? 255 : 0;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = w;
      d[i * 4 + 3] = Math.min(255, Math.abs(v) * 255);
    }
    x.putImageData(img, 0, 0);
    return (ATILE[kind] = c);
  }
  OA.finish = function (canvas, o) {
    if (!o) return;
    const c = canvas.getContext('2d');
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    for (const k of ['fbm', 'grain']) {
      if (!o[k]) continue;
      const pat = c.createPattern(aTile(k), 'repeat');
      const sc = k === 'grain' ? 1 : o.scale || 1.5;
      if (pat.setTransform) pat.setTransform(new DOMMatrix([sc, 0, 0, sc, 0, 0]));
      c.globalAlpha = o[k] * 0.5;
      c.fillStyle = pat;
      c.fillRect(0, 0, canvas.width, canvas.height);
    }
    c.restore();
  };

  // 柔光圓（快取）
  const GL = {};
  function glowSpr(rgbS, hard) {
    const key = rgbS + (hard ? 'h' : '');
    if (GL[key]) return GL[key];
    const c = cv(64, 64);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(' + rgbS + ',1)');
    g.addColorStop(hard ? 0.55 : 0.3, 'rgba(' + rgbS + ',' + (hard ? 0.8 : 0.45) + ')');
    g.addColorStop(1, 'rgba(' + rgbS + ',0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return (GL[key] = c);
  }
  OA.glowSpr = glowSpr;
  function soft(c, x, y, rx, ry, rgbS, a, op) {
    if (a <= 0.003) return;
    c.save();
    if (op) c.globalCompositeOperation = op;
    c.globalAlpha *= Math.min(1, a);
    c.drawImage(glowSpr(rgbS), x - rx, y - ry, rx * 2, ry * 2);
    c.restore();
  }
  OA.soft = soft;

  // 目前的放大倍率（圖層快取時 c 已經被 scale 過）
  const pxScale = (c) => {
    const m = c.getTransform();
    return Math.hypot(m.a, m.b) || 1;
  };
  OA.pxScale = pxScale;

  // ════════ 管狀物：樹幹、樹根、枝條 ════════
  // sp：沿中心線的點 [[x, y, 半寬], ...]（由粗的一端往細的一端）
  // o：{ pal: 色階, strands, bark: 0..1, seed, moss, rim: [r,g,b], rimA, ao: (u)=>暗度, grooveCol, knots }
  function resample(sp, step) {
    const out = [sp[0]];
    for (let i = 1; i < sp.length; i++) {
      const a = sp[i - 1];
      const b = sp[i];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(d / step));
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      }
    }
    return out;
  }
  // 平滑的曲線：控制點 → Catmull-Rom 取樣
  function spline(ctrl, per) {
    const out = [];
    const n = ctrl.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)];
      const p1 = ctrl[i];
      const p2 = ctrl[i + 1];
      const p3 = ctrl[Math.min(n - 1, i + 2)];
      for (let k = 0; k < per; k++) {
        const t = k / per;
        const t2 = t * t;
        const t3 = t2 * t;
        const f = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])]);
      }
    }
    out.push(ctrl[n - 1].slice());
    return out;
  }
  OA.spline = spline;

  function frames(sp) {
    const N = [];
    for (let i = 0; i < sp.length; i++) {
      const a = sp[Math.max(0, i - 1)];
      const b = sp[Math.min(sp.length - 1, i + 1)];
      let tx = b[0] - a[0];
      let ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
      N.push([-ty, tx, tx, ty]);
    }
    return N;
  }
  function tubeEdge(sp, N, u, wob) {
    const pts = [];
    for (let i = 0; i < sp.length; i++) {
      const uu = wob ? u + wob(i, u) : u;
      pts.push([sp[i][0] + N[i][0] * uu * sp[i][2], sp[i][1] + N[i][1] * uu * sp[i][2]]);
    }
    return pts;
  }
  const BARK = P([[0, '#1b120d'], [0.3, '#3a2819'], [0.55, '#5e4430'], [0.78, '#8a6a4a'], [1, '#c9a578']]);
  OA.BARK = BARK;
  OA.tube = function (c, ctrl, o) {
    o = o || {};
    const ps = pxScale(c);
    const r = U.seeded(o.seed || 1);
    const step = Math.max(2, 4 / ps);
    const sp = resample(ctrl, step);
    const N = frames(sp);
    const pal = o.pal || BARK;
    const maxW = sp.reduce((m, q) => Math.max(m, q[2]), 0);
    const strands = o.strands || Math.max(8, Math.min(40, Math.round((maxW * ps) / 2.6)));
    // 大尺度的扭曲（樹幹的節、瘤）
    const s0 = (o.seed || 1) * 13;
    const wob = o.gnarl ? (i, u) => (fbm(i * step * 0.012, u * 1.3 + 3, s0, 2) - 0.5) * o.gnarl * (1 - u * u) : null;
    // 輪廓
    const L = tubeEdge(sp, N, -1, null);
    const R = tubeEdge(sp, N, 1, null);
    const outline = (p) => {
      p.moveTo(L[0][0], L[0][1]);
      for (const q of L) p.lineTo(q[0], q[1]);
      for (let i = R.length - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]);
      p.closePath();
    };
    // 起點淡入（枝條從樹幹裡長出來）：底色與色帶用沿著中心線的透明漸層，之後的東西都只蓋在已經有的像素上
    let fadeI = 0;
    let fillOf = (col) => rgb(col);
    if (o.fade && o.fade[0]) {
      let acc = 0;
      while (fadeI < sp.length - 1 && acc < o.fade[0]) {
        acc += Math.hypot(sp[fadeI + 1][0] - sp[fadeI][0], sp[fadeI + 1][1] - sp[fadeI][1]);
        fadeI++;
      }
      const a0 = sp[0];
      const a1 = sp[fadeI];
      fillOf = (col) => {
        const g = c.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
        g.addColorStop(0, rgb(col, 0));
        g.addColorStop(1, rgb(col, 1));
        return g;
      };
    }
    c.save();
    c.beginPath();
    outline(c);
    c.fillStyle = fillOf(ramp(pal, 0.28));
    c.fill();
    c.clip();
    // 一條一條的縱向色帶：圓柱體的受光
    const LV = o.L || LIGHT;
    const shadeAt = (u) => {
      const nz = Math.sqrt(Math.max(0, 1 - u * u));
      // 法線在畫面上的方向用中間那一段的 N 來近似
      const mid = N[(N.length / 2) | 0];
      const lam = mid[0] * u * LV[0] + mid[1] * u * LV[1] + nz * LV[2];
      return lam;
    };
    for (let s = 0; s < strands; s++) {
      const u0 = -1.02 + (2.04 * s) / strands;
      const u1 = -1.02 + (2.04 * (s + 1)) / strands;
      const um = (u0 + u1) / 2;
      let lam = shadeAt(Math.max(-1, Math.min(1, um)));
      let t = cl(0.42 + lam * 0.62);
      // 背光面不會全黑：地面與天空的反光
      t = Math.max(t, 0.14 + 0.12 * Math.pow(Math.abs(um), 6));
      const col = ramp(pal, cl(t * (o.lit == null ? 1 : o.lit)));
      const e0 = tubeEdge(sp, N, u0, wob);
      const e1 = tubeEdge(sp, N, u1 + 0.02, wob);
      c.beginPath();
      c.moveTo(e0[0][0], e0[0][1]);
      for (const q of e0) c.lineTo(q[0], q[1]);
      for (let i = e1.length - 1; i >= 0; i--) c.lineTo(e1[i][0], e1[i][1]);
      c.closePath();
      c.fillStyle = fillOf(col);
      c.fill();
    }
    if (fadeI) c.globalCompositeOperation = 'source-atop';
    // 沿長度的明暗（根部、分岔處、被樹冠遮住的地方）
    if (o.ao) {
      for (let i = 0; i < sp.length - 1; i += 2) {
        const a = o.ao(i / (sp.length - 1));
        if (a <= 0.01) continue;
        const j = Math.min(sp.length - 1, i + 3);
        c.beginPath();
        c.moveTo(sp[i][0] - N[i][0] * sp[i][2] * 1.2, sp[i][1] - N[i][1] * sp[i][2] * 1.2);
        c.lineTo(sp[i][0] + N[i][0] * sp[i][2] * 1.2, sp[i][1] + N[i][1] * sp[i][2] * 1.2);
        c.lineTo(sp[j][0] + N[j][0] * sp[j][2] * 1.2, sp[j][1] + N[j][1] * sp[j][2] * 1.2);
        c.lineTo(sp[j][0] - N[j][0] * sp[j][2] * 1.2, sp[j][1] - N[j][1] * sp[j][2] * 1.2);
        c.closePath();
        c.fillStyle = 'rgba(10,6,12,' + a.toFixed(3) + ')';
        c.fill();
      }
    }
    // 樹皮：縱向的裂溝（中間寬、兩端尖的一條條暗縫），裂溝旁邊被光擦亮的樹皮稜
    const bark = o.bark == null ? 1 : o.bark;
    if (bark > 0) {
      const ng = Math.round(strands * 0.8 * bark) + 3;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      for (let g = 0; g < ng; g++) {
        const ub = -0.96 + r() * 1.92;
        const fz = Math.sqrt(1 - ub * ub);
        const ph = r() * 100;
        const lamB = shadeAt(ub);
        let i = Math.max(fadeI, Math.floor(r() * sp.length * 0.3));
        while (i < sp.length - 2) {
          const len = Math.floor((24 + r() * 100) / step);
          const e = Math.min(sp.length - 1, i + len);
          const L2 = [];
          const R2 = [];
          const wmax = (maxW * 0.028 + 0.4) * (0.5 + r()) * (o.groove || 1);
          for (let k = i; k <= e; k++) {
            const uu = ub + (fbm(k * step * 0.012, ph, s0 + 5, 2) - 0.5) * 0.22 + (wob ? wob(k, ub) : 0);
            const f = Math.sin(((k - i) / Math.max(1, e - i)) * Math.PI);
            const hw = (wmax * (0.25 + 0.75 * Math.pow(f, 0.7)) * fz) / sp[k][2];
            const q = sp[k];
            L2.push([q[0] + N[k][0] * (uu - hw) * q[2], q[1] + N[k][1] * (uu - hw) * q[2]]);
            R2.push([q[0] + N[k][0] * (uu + hw) * q[2], q[1] + N[k][1] * (uu + hw) * q[2]]);
          }
          c.beginPath();
          L2.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
          for (let k = R2.length - 1; k >= 0; k--) c.lineTo(R2[k][0], R2[k][1]);
          c.closePath();
          c.fillStyle = rgb(ramp(pal, cl(0.03 + lamB * 0.1)), 0.75 * Math.min(1, bark));
          c.fill();
          // 裂溝迎光那側的樹皮稜（往光的方向偏）
          if (lamB > 0.1) {
            c.beginPath();
            L2.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
            c.strokeStyle = rgb(ramp(pal, cl(0.75 + lamB * 0.25)), 0.3 * Math.min(1, bark) * lamB);
            c.lineWidth = Math.max(0.5 / ps, wmax * 0.45);
            c.stroke();
          }
          i = e + Math.floor((6 + r() * 30) / step);
        }
      }
      // 樹皮塊之間的橫紋
      const nc = bark >= 1 ? Math.round(sp.length * 0.06 * bark) : 0;
      for (let k = 0; k < nc; k++) {
        const i = Math.floor(r() * (sp.length - 1));
        const ua = -0.9 + r() * 1.5;
        const ub = ua + 0.12 + r() * 0.25;
        const q0 = sp[i];
        c.beginPath();
        for (let s = 0; s <= 4; s++) {
          const uu = ua + ((ub - ua) * s) / 4;
          const yy = Math.sin((s / 4) * Math.PI) * q0[2] * 0.03;
          const px = q0[0] + N[i][0] * uu * q0[2] + N[i][2] * yy;
          const py = q0[1] + N[i][1] * uu * q0[2] + N[i][3] * yy;
          s ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.strokeStyle = rgb(ramp(pal, 0.05), 0.45 * bark);
        c.lineWidth = Math.max(0.5 / ps, maxW * 0.018);
        c.stroke();
      }
    }
    // 瘤與樹洞
    for (let k = 0; k < (o.knots || 0); k++) {
      const i = Math.floor(sp.length * (0.2 + r() * 0.6));
      const uu = -0.5 + r() * 0.9;
      const q = sp[i];
      const kx = q[0] + N[i][0] * uu * q[2];
      const ky = q[1] + N[i][1] * uu * q[2];
      const kr = q[2] * (0.12 + r() * 0.1);
      const ang = Math.atan2(N[i][3], N[i][2]);
      for (let ring = 2; ring >= 1; ring--) {
        c.beginPath();
        c.ellipse(kx, ky, kr * (0.6 + ring * 0.5), kr * (1.6 + ring * 0.9), ang - Math.PI / 2, 0, PI2);
        c.strokeStyle = rgb(ramp(pal, ring === 2 ? 0.75 : 0.12), ring === 2 ? 0.16 : 0.3);
        c.lineWidth = Math.max(0.6 / ps, kr * 0.16);
        c.stroke();
      }
      const g = c.createRadialGradient(kx + kr * 0.15, ky + kr * 0.2, 0, kx, ky, kr * 1.1);
      g.addColorStop(0, 'rgba(10,6,4,0.8)');
      g.addColorStop(1, 'rgba(20,12,8,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(kx, ky, kr * 0.45, kr * 1.3, ang - Math.PI / 2, 0, PI2);
      c.fill();
    }
    // 材質
    const bx = sp.reduce((m, q) => [Math.min(m[0], q[0] - q[2]), Math.min(m[1], q[1] - q[2]), Math.max(m[2], q[0] + q[2]), Math.max(m[3], q[1] + q[2])], [1e9, 1e9, -1e9, -1e9]);
    const ta = o.texA == null ? 1 : o.texA;
    const dirA = Math.atan2(sp[sp.length - 1][1] - sp[0][1], sp[sp.length - 1][0] - sp[0][0]) + Math.PI / 2;
    OA.texture(c, bx[0] - 4, bx[1] - 4, bx[2] - bx[0] + 8, bx[3] - bx[1] + 8, { fbm: 0.5 * ta, streak: maxW * ps > 40 && bark >= 1 ? 0.28 * bark * ta : 0, scale: Math.max(0.6, 1.4 / ps), angle: dirA });
    // 苔：一塊一塊長在朝光、朝上的那一面，每塊是很多細小的葉點
    if (o.moss) {
      const mp = P([[0, '#1a3018'], [0.45, '#3f6a2a'], [0.8, '#86a844'], [1, '#c8d880']]);
      const M = c.getTransform();
      const lp = leafPath('oval');
      const np = Math.round(sp.length * o.moss * 0.12) + 1;
      for (let k = 0; k < np; k++) {
        const i0 = Math.floor(r() * sp.length);
        if ((o.mossAt && !o.mossAt(i0 / (sp.length - 1))) || i0 < fadeI * 1.5) continue;
        const u0 = -0.95 + Math.pow(r(), 1.5) * 0.9;
        const len = Math.floor(sp.length * (0.02 + r() * 0.08));
        const nd = Math.min(260, Math.round(len * sp[i0][2] * 0.35) + 6);
        for (let j = 0; j < nd; j++) {
          const i = Math.max(0, Math.min(sp.length - 1, i0 + Math.floor((r() - 0.3) * len)));
          const q = sp[i];
          const uu = Math.max(-1, u0 + (r() - 0.5) * 0.35 * (1 + r()));
          const px = q[0] + N[i][0] * uu * q[2];
          const py = q[1] + N[i][1] * uu * q[2];
          const lam = shadeAt(uu);
          c.fillStyle = rgb(ramp(mp, cl(0.25 + lam * 0.55 + (r() - 0.5) * 0.35)), 0.9);
          dab(c, M, lp, px, py, Math.max(0.9 / ps, q[2] * (0.02 + r() * 0.035)), r() * PI2);
        }
      }
      c.setTransform(M);
    }
    c.restore();
    // 背光那一側：天空的冷色反光
    if (o.rim !== false) {
      const rc = o.rim || [150, 175, 215];
      c.save();
      c.beginPath();
      outline(c);
      c.clip();
      if (fadeI) c.globalCompositeOperation = 'source-atop';
      const e = tubeEdge(sp, N, 0.94, null);
      c.beginPath();
      e.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
      c.strokeStyle = rgb(rc, o.rimA == null ? 0.22 : o.rimA);
      c.lineWidth = Math.max(1 / ps, maxW * 0.1);
      c.stroke();
      // 迎光那一側的暖色亮邊
      const e2 = tubeEdge(sp, N, -0.9, null);
      c.beginPath();
      e2.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
      c.strokeStyle = rgb(o.sun || [255, 226, 170], o.sunA == null ? 0.18 : o.sunA);
      c.lineWidth = Math.max(1 / ps, maxW * 0.08);
      c.stroke();
      c.restore();
    }
    return { sp, N, outline };
  };

  // ════════ 樹冠：一片片小葉堆成的葉團 ════════
  const LEAFP = {};
  function leafPath(kind) {
    if (LEAFP[kind]) return LEAFP[kind];
    const p = new Path2D();
    if (kind === 'maple') A.mapleLeafPath(p, 0, 0, 1);
    else if (kind === 'blade') {
      p.moveTo(0, -1);
      p.quadraticCurveTo(0.42, -0.1, 0, 1);
      p.quadraticCurveTo(-0.42, -0.1, 0, -1);
    } else {
      // 圓一點的葉（遠處的樹）
      p.moveTo(0, -1);
      p.bezierCurveTo(0.7, -0.7, 0.7, 0.6, 0, 1);
      p.bezierCurveTo(-0.7, 0.6, -0.7, -0.7, 0, -1);
    }
    return (LEAFP[kind] = p);
  }
  OA.leafPath = leafPath;
  // 快速畫一片葉子：直接組好矩陣，不用 save/restore
  OA.nDab = 0;
  function dab(c, M, path, x, y, s, rot) {
    OA.nDab++;
    const cs = Math.cos(rot) * s;
    const sn = Math.sin(rot) * s;
    c.setTransform(M.a * cs + M.c * sn, M.b * cs + M.d * sn, -M.a * sn + M.c * cs, -M.b * sn + M.d * cs, M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f);
    c.fill(path);
  }
  OA.dab = dab;
  const FOL = P([[0, '#0b1f1b'], [0.22, '#153a2b'], [0.45, '#2b5e34'], [0.66, '#4f8a38'], [0.84, '#93b84a'], [1, '#e6e59a']]);
  OA.FOL = FOL;
  // clusters: [[x, y, R, depth(0 遠..1 近)], ...]
  // o: { pal, leaf, size(px), density, seed, box:[x0,y0,x1,y1] 整個樹冠（上亮下暗）, warm: 秋葉比例, glow: 發光葉數, flat: 下緣壓平 }
  OA.foliage = function (c, clusters, o) {
    o = o || {};
    const ps = pxScale(c);
    const r = U.seeded(o.seed || 3);
    const pal = o.pal || FOL;
    const path = leafPath(o.leaf || 'maple');
    const size = (o.size || 6.5) / ps;
    const box = o.box;
    const M = c.getTransform();
    const list = clusters.slice().sort((a, b) => (a[3] || 0) - (b[3] || 0));
    const warmCols = o.warmCols || [hex('#e0a040'), hex('#d8682c'), hex('#f2cf62')];
    for (const [cx, cy, R, depth0] of list) {
      const depth = depth0 == null ? 1 : depth0;
      // 葉團投在後面的影子
      c.setTransform(M);
      soft(c, cx + R * 0.18, cy + R * 0.42, R * 1.15, R * 0.8, o.aoRgb || '6,16,14', (o.ao == null ? 0.55 : o.ao) * (0.6 + depth * 0.4));
      const n = Math.round(((R * R * ps * ps) / ((size * ps) * (size * ps))) * (o.density || 1.6)) + 12;
      for (let i = 0; i < n; i++) {
        // 越外圈越稀：邊緣自然碎開
        const a = r() * PI2;
        let d = Math.sqrt(r());
        if (r() < 0.12) d = 0.9 + r() * 0.25;
        const dx = Math.cos(a) * d;
        let dy = Math.sin(a) * d * 0.9;
        if (o.flat && dy > 0.55) dy = 0.55 + (dy - 0.55) * 0.4;
        const x = cx + dx * R;
        const y = cy + dy * R;
        // 球面法線
        const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
        const LV = o.L || LIGHT;
        let lam = dx * LV[0] + dy * LV[1] + nz * LV[2];
        // 整個樹冠的上下左右（上、左亮；底部被自己遮住）
        let g = 0;
        if (box) {
          const gy = (y - box[1]) / (box[3] - box[1]);
          const gx = (x - box[0]) / (box[2] - box[0]);
          g = (0.5 - gy) * 0.55 + (0.5 - gx) * 0.25 * (o.L && o.L[0] > 0 ? -1 : 1);
        }
        let t = 0.42 + lam * 0.4 + g + (depth - 0.5) * 0.22 + (r() - 0.5) * (o.jit == null ? 0.16 : o.jit);
        t = cl(t * (o.lit || 1) + (o.lift || 0));
        let col = ramp(pal, t);
        if (o.air) col = mixA(col, o.air[0], o.air[1] * (1 - depth * 0.6));
        const warm = o.warm || 0;
        if (warm && r() < warm * (0.3 + t)) col = mixA(col, warmCols[(r() * warmCols.length) | 0], 0.45 + r() * 0.3);
        c.fillStyle = rgb(col);
        const s = size * (0.65 + r() * 0.75) * (o.sizeK ? o.sizeK(depth) : 1);
        dab(c, M, path, x, y, s, r() * PI2);
      }
      // 迎光的葉尖：幾片小亮葉
      const nh = Math.round(n * 0.08);
      for (let i = 0; i < nh; i++) {
        const a = -Math.PI * (0.55 + r() * 0.55);
        const d = 0.55 + r() * 0.45;
        const x = cx + Math.cos(a) * d * R;
        const y = cy + Math.sin(a) * d * R * 0.9;
        c.fillStyle = rgb(ramp(pal, cl(0.86 + r() * 0.14 + (depth - 1) * 0.3)), 0.9);
        dab(c, M, path, x, y, size * (0.5 + r() * 0.5), r() * PI2);
      }
    }
    c.setTransform(M);
    // 會發光的星葉（快取在圖層裡）
    if (o.glow && box) {
      for (let i = 0; i < o.glow; i++) {
        const cl2 = clusters[(r() * clusters.length) | 0];
        const a = r() * PI2;
        const d = Math.sqrt(r()) * 0.85;
        const x = cl2[0] + Math.cos(a) * d * cl2[2];
        const y = cl2[1] + Math.sin(a) * d * cl2[2] * 0.9;
        const gs = size * (1.5 + r() * 1.5);
        soft(c, x, y, gs * 2.6, gs * 2.6, o.glowRgb || '255,236,160', 0.35, 'lighter');
        c.fillStyle = rgb(mixA(hex('#fff2b0'), hex('#ffffff'), r()), 0.95);
        dab(c, M, path, x, y, gs * 0.55, r() * PI2);
        c.setTransform(M);
      }
    }
  };

  // ════════ 雲：一顆顆有受光的柔邊球 ════════
  const PUFF = {};
  // pal: [亮, 中, 暗, 反光]；回傳 128px 的球
  function puffSprite(pal, key) {
    if (PUFF[key]) return PUFF[key];
    const S = 128;
    const c = cv(S, S);
    const x = c.getContext('2d');
    const img = x.createImageData(S, S);
    const d = img.data;
    const [li, mi, sh, bo] = pal.map(hex);
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        const dx = (i + 0.5) / (S / 2) - 1;
        const dy = (j + 0.5) / (S / 2) - 1;
        const dd = dx * dx + dy * dy;
        if (dd >= 1) continue;
        // 邊緣稍微破碎
        const nn = fbm(i * 0.09, j * 0.09, 5, 3);
        const edge = Math.sqrt(dd) + (nn - 0.5) * 0.22;
        const al = Math.pow(cl((1 - edge) / 0.4), 1.4);
        if (al <= 0) continue;
        const nz = Math.sqrt(1 - dd);
        const lam = dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2];
        // 包覆光（雲會透光）
        const wrap = cl((lam + 0.7) / 1.5);
        // 每顆球自己的明暗很淡（整團雲的明暗另外做），只在右下緣帶一點陰影
        let col = wrap > 0.5 ? mixA(mi, li, (wrap - 0.5) / 0.5) : mixA(mixA(sh, mi, 0.45), mi, wrap / 0.5);
        // 底部的反光（下面是雲海）
        const bounce = cl(dy * 0.9) * (1 - wrap) * 0.55;
        col = mixA(col, bo, bounce);
        // 內部細微的明暗
        col = mixA(col, nn > 0.5 ? li : sh, Math.abs(nn - 0.5) * 0.15);
        const q = (j * S + i) * 4;
        d[q] = col[0];
        d[q + 1] = col[1];
        d[q + 2] = col[2];
        d[q + 3] = al * 255;
      }
    }
    x.putImageData(img, 0, 0);
    return (PUFF[key] = c);
  }
  OA.puffSprite = puffSprite;
  // 一團積雲：由下往上、由大到小一顆顆疊（上面的小球是捲起來的雲頂）
  // balls: [[x, y, r], ...]
  OA.cloudBalls = function (c, balls, pal, key) {
    const spr = puffSprite(pal, key || pal.join());
    const list = balls.slice().sort((a, b) => b[1] + b[2] * 0.3 - (a[1] + a[2] * 0.3));
    for (const [x, y, rr] of list) c.drawImage(spr, x - rr, y - rr, rr * 2, rr * 2);
  };
  // 一團積雲的球：底部平、頂端一層層長出小捲
  OA.cumulus = function (r, x, y, w, h) {
    const out = [];
    const n = Math.max(2, Math.round(w / (h * 0.9)));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const hump = Math.sin(u * Math.PI);
      const rr = h * (0.36 + 0.32 * hump) * (0.85 + r() * 0.3);
      out.push([x - w / 2 + u * w + (r() - 0.5) * w * 0.08, y - rr * 0.45 - hump * h * 0.12, rr]);
    }
    // 雲頂的捲：比主體小一號，沿著上緣
    for (let i = 0; i < n + 2; i++) {
      const u = 0.12 + r() * 0.76;
      const hump = Math.sin(u * Math.PI);
      const rr = h * (0.2 + r() * 0.16);
      out.push([x - w / 2 + u * w, y - h * (0.35 + hump * 0.5) + r() * h * 0.15, rr]);
    }
    // 底部：扁平的一排
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      out.push([x - w / 2 + u * w, y + h * 0.02, h * (0.3 + r() * 0.08)]);
    }
    return out;
  };

  // ════════ 浮島的岩體（倒掛的山） ════════
  const ROCKP = P([[0, '#24171f'], [0.2, '#3d2a2f'], [0.4, '#634539'], [0.6, '#8e6a52'], [0.8, '#b99474'], [1, '#e8cfa6']]);
  OA.ROCKP = ROCKP;
  // o: { pal, seed, roots(0..1), crystals(bool), top: 草皮色, haze }
  OA.rockIsle = function (c, w, d, seed, o) {
    o = o || {};
    const ps = pxScale(c);
    const r = U.seeded(seed * 7 + 3);
    const pal = o.pal || ROCKP;
    const s0 = seed * 31;
    const k = Math.max(0.3, w / 640); // 細節的尺度
    // ── 外形：幾根倒掛的岩錐（主錐最深，兩側較短），各自有圓錐的受光 ──
    const lobes = [];
    const tipX = (r() - 0.4) * w * 0.1;
    lobes.push({ cx: 0, top: w * 0.5, depth: d, tipX, main: true });
    const ns = w > 120 ? 2 + ((r() * 2) | 0) : 1;
    for (let i = 0; i < ns; i++) {
      const sd = i % 2 ? 1 : -1;
      const cx = sd * w * (0.14 + r() * 0.1);
      const top = Math.min(w * (0.2 + r() * 0.1), w * 0.5 - Math.abs(cx));
      lobes.push({ cx, top, depth: d * (0.45 + r() * 0.3), tipX: cx + sd * w * (0.03 + r() * 0.06), back: i < 2 });
    }
    // 前面再加一兩根小的
    if (w > 200) {
      for (let i = 0; i < 2; i++) {
        const cx = (r() - 0.5) * w * 0.5;
        lobes.push({ cx, top: w * (0.1 + r() * 0.06), depth: d * (0.3 + r() * 0.25), tipX: cx + (r() - 0.5) * w * 0.05, front: true });
      }
    }
    const lobeSpine = (L, idx) => {
      const pts = [];
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const prof = Math.pow(1 - u, 0.85 + (L.main ? 0 : 0.2)) * (1 + 0.1 * Math.sin(u * Math.PI));
        const nx = (fbm(u * 3, idx * 5.3, s0 + 21, 3) - 0.5) * L.top * 0.35 * Math.sin(u * Math.PI);
        const hw = Math.max(0.6, L.top * prof * (0.85 + fbm(u * 5, idx * 2.1, s0 + 22, 3) * 0.3));
        pts.push([L.cx + (L.tipX - L.cx) * Math.pow(u, 1.3) + nx, u * L.depth, hw]);
      }
      pts[0][1] = -1;
      return spline(pts, 3);
    };
    const halfW = (y) => {
      const u = cl(y / d);
      return Math.max(1, Math.pow(1 - u, 0.85) * (w / 2));
    };
    const topY = (x) => (fbm(x * 0.02 + 7, 0.5, s0 + 3, 2) - 0.5) * Math.max(3, w * 0.01);
    // 所有岩錐的聯集（拿來當 clip）
    const spines = lobes.map(lobeSpine);
    const lobePath = (sp) => (p) => {
      const N = frames(sp);
      const L = tubeEdge(sp, N, -1, null);
      const R = tubeEdge(sp, N, 1, null);
      p.moveTo(L[0][0], L[0][1]);
      for (const q of L) p.lineTo(q[0], q[1]);
      for (let i = R.length - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]);
      p.closePath();
    };
    const path = (p) => spines.forEach((sp) => lobePath(sp)(p));
    const tip = [tipX, d * 1.0];
    // ── 垂根 ──
    const rootCol = P([[0, '#1a110e'], [0.5, '#3e2b1f'], [1, '#8a6a4a']]);
    const hangRoots = (front) => {
      if (!o.roots) return;
      const nr = Math.round((w / (front ? 22 : 18)) * o.roots);
      const rr = U.seeded(seed * 5 + (front ? 1 : 2));
      const M = c.getTransform();
      const lp = leafPath('oval');
      c.lineCap = 'round';
      c.lineJoin = 'round';
      for (let i = 0; i < nr; i++) {
        // 多半從上緣附近、靠外側的地方垂下
        const side = rr() < 0.5 ? -1 : 1;
        const ex = Math.pow(rr(), 0.6);
        const yStart = rr() < 0.7 ? rr() * d * 0.08 : rr() * d * 0.4;
        const hw = halfW(yStart);
        const x0 = side * ex * hw * 0.96;
        const len = d * (0.1 + Math.pow(rr(), 1.8) * 0.8) * (front ? 1 : 0.85);
        const thick = (0.4 + Math.pow(rr(), 3) * 2.4) * k * 1.4;
        const pts = [];
        let x = x0;
        let y = yStart;
        let dir = side * (0.05 + rr() * 0.25);
        const steps = Math.max(6, Math.round(len / 12));
        for (let j = 0; j <= steps; j++) {
          pts.push([x, y]);
          dir = dir * 0.8 + (rr() - 0.5) * 0.35;
          x += dir * (len / steps);
          y += len / steps;
        }
        const col = ramp(rootCol, cl((front ? 0.35 : 0.2) + rr() * 0.25 - (side > 0 ? 0.1 : 0)));
        // 由粗到細：一條漸細的帶子（一次填滿）
        {
          const Lf = [];
          const Rt = [];
          for (let j = 0; j < pts.length; j++) {
            const a0 = pts[Math.max(0, j - 1)];
            const a1 = pts[Math.min(pts.length - 1, j + 1)];
            let nx = -(a1[1] - a0[1]);
            let ny = a1[0] - a0[0];
            const l = Math.hypot(nx, ny) || 1;
            nx /= l;
            ny /= l;
            const hw = Math.max(0.3 / ps, (thick * (1 - (j / pts.length) * 0.85)) / 2);
            Lf.push([pts[j][0] - nx * hw, pts[j][1] - ny * hw]);
            Rt.push([pts[j][0] + nx * hw, pts[j][1] + ny * hw]);
          }
          c.beginPath();
          Lf.forEach((q, j) => (j ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
          for (let j = Rt.length - 1; j >= 0; j--) c.lineTo(Rt[j][0], Rt[j][1]);
          c.closePath();
          c.fillStyle = rgb(col, front ? 0.95 : 0.8);
          c.fill();
          if (thick * ps > 2.5 && side < 0) {
            c.beginPath();
            pts.forEach((q, j) => (j ? c.lineTo(q[0] - thick * 0.22, q[1]) : c.moveTo(q[0] - thick * 0.22, q[1])));
            c.strokeStyle = 'rgba(230,190,140,0.22)';
            c.lineWidth = Math.max(0.4 / ps, thick * 0.25);
            c.stroke();
          }
        }
        // 分出去的細根
        if (thick * ps > 1.2) {
          for (let b = 0; b < 2; b++) {
            const j0 = Math.floor(pts.length * (0.25 + rr() * 0.5));
            let bx = pts[j0][0];
            let by = pts[j0][1];
            let bd = (rr() - 0.5) * 1.2;
            c.beginPath();
            c.moveTo(bx, by);
            const bl = len * (0.1 + rr() * 0.25);
            for (let q = 0; q < 5; q++) {
              bd = bd * 0.7 + (rr() - 0.5) * 0.4;
              bx += bd * bl * 0.2;
              by += bl * 0.2;
              c.lineTo(bx, by);
            }
            c.strokeStyle = rgb(col, 0.6);
            c.lineWidth = Math.max(0.4 / ps, thick * 0.3);
            c.stroke();
          }
        }
        // 藤上的小葉
        if (o.vines !== false && rr() < 0.35) {
          const nl = Math.round((len * ps) / 7);
          for (let q = 0; q < nl; q++) {
            const j = Math.floor((pts.length - 1) * Math.pow(q / nl, 1.2) * 0.9);
            const t = cl(0.3 + rr() * 0.45 - (q / nl) * 0.2 + (side < 0 ? 0.12 : -0.05));
            c.fillStyle = rgb(ramp(FOL, t));
            dab(c, M, lp, pts[j][0] + (rr() - 0.5) * 5 / ps, pts[j][1] + rr() * 3 / ps, (1.6 + rr() * 2) / ps * Math.max(0.9, k), rr() * PI2);
          }
          c.setTransform(M);
        }
      }
    };
    hangRoots(false);
    // 整體的外框：岩錐不能超出上緣、也不能比島還寬
    const hull = (p) => {
      p.moveTo(-w / 2 - 1, -1);
      for (let q = 0; q <= 16; q++) {
        const y = (d * q) / 16;
        p.lineTo(-(w / 2) * (1 - 0.3 * (q / 16)) - (fbm(q * 0.5, 1, s0 + 61, 2) - 0.5) * w * 0.08, y);
      }
      for (let q = 16; q >= 0; q--) {
        const y = (d * q) / 16;
        p.lineTo((w / 2) * (1 - 0.3 * (q / 16)) + (fbm(q * 0.5, 2, s0 + 61, 2) - 0.5) * w * 0.08, y);
      }
      p.closePath();
    };
    c.save();
    c.beginPath();
    hull(c);
    c.clip();
    // ── 岩錐：後面的先畫，暗一點 ──
    const order = lobes.map((L, i) => i).sort((a, b) => (lobes[a].back ? 0 : lobes[a].main ? 1 : 2) - (lobes[b].back ? 0 : lobes[b].main ? 1 : 2));
    order.forEach((i) => {
      const L = lobes[i];
      OA.tube(c, spines[i], {
        pal,
        seed: seed * 13 + i,
        bark: 0.2,
        groove: 0.8,
        strands: Math.max(8, Math.min(28, Math.round(L.top * ps / 10))),
        lit: L.back ? 0.78 : 1,
        rim: o.airRgb || [196, 180, 220],
        rimA: 0.3,
        sunA: 0.22,
        texA: 0.45,
        ao: (u) => (u < 0.08 ? 0.35 * (1 - u / 0.08) : 0),
      });
      // 岩錐之間的陰影
      if (!L.main) {
        c.save();
        c.beginPath();
        lobePath(spines[i])(c);
        c.clip();
        const g = c.createLinearGradient(0, 0, 0, L.depth);
        g.addColorStop(0, 'rgba(20,10,24,0.0)');
        g.addColorStop(1, 'rgba(20,10,24,' + (L.back ? 0.35 : 0.15) + ')');
        c.fillStyle = g;
        c.fillRect(L.cx - L.top * 2, 0, L.top * 4, L.depth * 1.05);
        c.restore();
      }
    });
    // ── 整體的受光、層理、切面、材質（clip 在聯集裡） ──
    c.save();
    c.beginPath();
    path(c);
    c.clip();
    const gy = c.createLinearGradient(0, 0, 0, d);
    gy.addColorStop(0, 'rgba(255,226,186,0.1)');
    gy.addColorStop(0.4, 'rgba(60,40,50,0.08)');
    gy.addColorStop(1, 'rgba(26,14,36,0.6)');
    c.fillStyle = gy;
    c.fillRect(-w, -20, w * 2, d * 1.2);
    // 岩層：環繞岩錐的一圈圈岩架。從斜上方看，前半圈是往下彎的弧（上緣亮、下緣投影），斷斷續續
    const nL = Math.max(3, Math.round(d / 34));
    for (let kk = 0; kk < nL; kk++) {
      const y0 = d * (0.05 + (kk / nL) * 0.8) + (r() - 0.5) * d * 0.05;
      const hw = halfW(y0) * 1.05;
      const bow = hw * 0.1;
      const ly = (x) => y0 + bow * Math.sqrt(Math.max(0, 1 - (x / hw) * (x / hw))) + (fbm(x * 0.03 / k, kk * 3.1, s0 + 40, 3) - 0.5) * d * 0.035;
      const step = Math.max(2, 5 / ps);
      let x = -hw * (0.9 + r() * 0.1);
      while (x < hw) {
        const seg = hw * (0.15 + r() * 0.45);
        const x1 = Math.min(hw, x + seg);
        const sh = (d * 0.012 + 1.5 / ps) * (0.6 + r());
        c.beginPath();
        for (let xx = x; xx <= x1; xx += step) c.lineTo(xx, ly(xx));
        for (let xx = x1; xx >= x; xx -= step) c.lineTo(xx, ly(xx) + sh * Math.sin(((xx - x) / (x1 - x)) * Math.PI));
        c.closePath();
        c.fillStyle = 'rgba(22,12,24,0.28)';
        c.fill();
        c.beginPath();
        for (let xx = x; xx <= x1; xx += step) c.lineTo(xx, ly(xx) - 0.6 / ps);
        const lx = (x + x1) / 2 / hw;
        c.strokeStyle = 'rgba(255,230,194,' + (0.22 * cl(0.75 - lx * 0.8)).toFixed(3) + ')';
        c.lineWidth = Math.max(0.6 / ps, d * 0.003 + 0.2);
        c.stroke();
        x = x1 + hw * (0.1 + r() * 0.35);
      }
    }
    // 切面：大小不一的岩塊，各自受光不同
    const nf = Math.round((w * d) / (1400 * k * k)) + 6;
    for (let i = 0; i < nf; i++) {
      const y = Math.pow(r(), 0.9) * d * 0.95;
      const hw = halfW(y);
      const x = (r() * 2 - 1) * hw;
      const fs = (5 + r() * 16) * k;
      const nx = (r() - 0.5) * 1.6 + (x / hw) * 0.5;
      const ny = (r() - 0.5) * 1.2;
      const nz = 0.7;
      const l = Math.hypot(nx, ny, nz);
      const lam = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / l;
      const lx = x / hw;
      c.beginPath();
      const kk = 4 + ((r() * 3) | 0);
      const ang = r() * PI2;
      for (let j = 0; j < kk; j++) {
        const a = ang + (j / kk) * PI2 + (r() - 0.5) * 0.6;
        const rr = fs * (0.6 + r() * 0.5);
        c.lineTo(x + Math.cos(a) * rr * 1.2, y + Math.sin(a) * rr * 0.8);
      }
      c.closePath();
      const base = 0.5 - lx * 0.2 - (y / d) * 0.25;
      c.fillStyle = rgb(ramp(pal, cl(base + lam * 0.35)), 0.16);
      c.fill();
    }
    // 金色的礦脈：細細的、斷續的亮點
    if (o.crystals !== false) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let kk = 0; kk < 2; kk++) {
        let vx = (r() - 0.5) * w * 0.4;
        let vy = d * (0.15 + r() * 0.25);
        for (let j = 0; j < 22; j++) {
          vx += (r() - 0.5) * w * 0.02;
          vy += d * 0.018;
          if (vy > d * 0.9 || Math.abs(vx) > halfW(vy) * 0.8) break;
          if (r() < 0.4) continue;
          const gr = (1 + r() * 2) * k;
          soft(c, vx, vy, gr * 3, gr * 3, '255,200,110', 0.35);
          c.fillStyle = 'rgba(255,236,170,0.8)';
          c.fillRect(vx - gr * 0.3, vy - gr * 0.3, gr * 0.6, gr * 0.6);
        }
      }
      c.restore();
    }
    // 頂緣下的土層與陰影（草皮的底下）
    const sd = Math.max(8, d * 0.08);
    const soil = c.createLinearGradient(0, 0, 0, sd);
    soil.addColorStop(0, 'rgba(40,24,18,0.9)');
    soil.addColorStop(0.4, 'rgba(60,38,26,0.5)');
    soil.addColorStop(1, 'rgba(60,38,26,0)');
    c.fillStyle = soil;
    c.fillRect(-w, -10, w * 2, sd + 10);
    OA.texture(c, -w / 2 - 10, -20, w + 20, d * 1.1 + 30, { fbm: 0.4, grain: 0.3, scale: Math.max(0.35, k * 0.7) });
    // 底部來自雲海的反光
    const bnc = c.createLinearGradient(0, d * 0.45, 0, d);
    bnc.addColorStop(0, 'rgba(255,190,170,0)');
    bnc.addColorStop(1, rgb(o.bounce || [255, 196, 176], 0.28));
    c.fillStyle = bnc;
    c.globalCompositeOperation = 'screen';
    c.fillRect(-w, d * 0.45, w * 2, d * 0.6);
    c.restore();
    c.restore();
    hangRoots(true);
    // 底端的晶石（發光）
    if (o.crystals !== false) {
      const cs = Math.max(3, d * 0.04);
      soft(c, tip[0], tip[1] + cs * 0.6, cs * 5, cs * 5, '255,214,130', 0.5, 'lighter');
      [[0, 1, 1], [-0.7, 0.6, 0.62], [0.65, 0.5, 0.55]].forEach(([ox, oy, kk]) => {
        const x = tip[0] + ox * cs;
        const y = tip[1] - cs * 0.6 + oy * cs * 0.3;
        const h = cs * 2.2 * kk;
        const ww = cs * 0.5 * kk;
        c.save();
        c.translate(x, y);
        c.rotate(ox * 0.35);
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(ww, h * 0.25);
        c.lineTo(ww * 0.6, -h * 0.1);
        c.lineTo(-ww * 0.6, -h * 0.1);
        c.lineTo(-ww, h * 0.25);
        c.closePath();
        const g = c.createLinearGradient(-ww, 0, ww, 0);
        g.addColorStop(0, '#fff6d0');
        g.addColorStop(0.5, '#f5c460');
        g.addColorStop(1, '#a86a28');
        c.fillStyle = g;
        c.fill();
        c.fillStyle = 'rgba(255,255,240,0.7)';
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(-ww * 0.2, h * 0.25);
        c.lineTo(-ww * 0.5, h * 0.2);
        c.closePath();
        c.fill();
        c.restore();
      });
    }
    // ── 頂面：草皮的邊，往下垂一點的苔 ──
    const top = o.top === false ? null : P(o.topPal || [[0, '#203a1c'], [0.4, '#4a7430'], [0.75, '#8aae48'], [1, '#d6de88']]);
    if (top) {
      const M = c.getTransform();
      const bl = leafPath('blade');
      const rr2 = U.seeded(seed * 11 + 5);
      const th = Math.max(2.5, w * 0.014);
      // 草皮的厚度（前緣）
      c.fillStyle = rgb(ramp(top, 0.22));
      c.beginPath();
      c.moveTo(-w / 2 - 2, 0);
      for (let q = 0; q <= 40; q++) {
        const x = -w / 2 + (w * q) / 40;
        c.lineTo(x, topY(x) + th + (fbm(x * 0.05 / k, 2, s0 + 9, 2) - 0.3) * th * 1.4);
      }
      c.lineTo(w / 2 + 2, 0);
      for (let q = 40; q >= 0; q--) {
        const x = -w / 2 + (w * q) / 40;
        c.lineTo(x, topY(x) - th * 0.6);
      }
      c.closePath();
      c.fill();
      // 垂下來的苔簾
      const nm = Math.round(w / 30);
      for (let i = 0; i < nm; i++) {
        const x = -w * 0.47 + rr2() * w * 0.94;
        const len = Math.max(4, w * (0.015 + Math.pow(rr2(), 2) * 0.06));
        const g = c.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, rgb(ramp(top, 0.32), 0.95));
        g.addColorStop(1, rgb(ramp(top, 0.15), 0));
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x - len * 0.4, th * 0.5);
        c.quadraticCurveTo(x - len * 0.15, len * 0.6, x, len);
        c.quadraticCurveTo(x + len * 0.2, len * 0.5, x + len * 0.45, th * 0.5);
        c.closePath();
        c.fill();
      }
      const nb = Math.round((w * ps) / 1.3);
      for (let i = 0; i < nb; i++) {
        const x = -w / 2 + rr2() * w;
        const y = topY(x) + (rr2() - 0.35) * th * 2;
        const lx = (x + w / 2) / w;
        const t = cl(0.35 + (1 - lx) * 0.35 + (rr2() - 0.5) * 0.4 - (y > th * 0.3 ? 0.18 : 0));
        c.fillStyle = rgb(ramp(top, t));
        const s = Math.max(1.1 / ps, Math.min(5, w * 0.009)) * (0.7 + rr2() * 0.8);
        dab(c, M, bl, x, y - s * 0.6, s, (rr2() - 0.5) * 0.9);
      }
      c.setTransform(M);
    }
    return { path, topY, halfW, tip };
  };

  // ════════ 星楓樹（世界的時鐘） ════════
  // 原點＝樹幹底部中心，單位跟舊的 starTree(s = 1) 一樣。part：'trunk'（樹幹＋板根）、'canopy'（主枝＋樹冠）、或全部
  const TBARK = P([[0, '#140e0c'], [0.22, '#2e231c'], [0.45, '#54443a'], [0.68, '#7f6c5a'], [0.86, '#ab9678'], [1, '#e2cfa4']]);
  const TFOL = P([[0, '#08201d'], [0.2, '#0f3a2e'], [0.42, '#22603a'], [0.62, '#468a3c'], [0.8, '#8cb84e'], [0.93, '#d2dc84'], [1, '#fff4c0']]);
  OA.TBARK = TBARK;
  OA.TFOL = TFOL;
  const TREE_ROOTS = [
    // [起點 x, 起點 y, 往外的方向(-1/1), 長度, 粗, 前面?, 下彎]
    [-30, -80, -1, 230, 30, 0, 12],
    [34, -76, 1, 250, 30, 0, 10],
    [-40, -40, -1, 150, 26, 1, 22],
    [44, -44, 1, 170, 24, 1, 20],
    [-12, -60, -1, 90, 22, 1, 30],
    [18, -50, 1, 110, 20, 1, 32],
    [-20, -100, -1, 300, 16, 0, 4],
    [26, -96, 1, 290, 14, 0, 2],
  ];
  function rootSpine(x0, y0, dir, len, th, drop, seed) {
    const r = U.seeded(seed);
    const pts = [[x0, y0, th]];
    const n = 7;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      // 先往外、往下彎到地面，再貼著地面爬
      const x = x0 + dir * len * Math.pow(u, 0.85);
      const ground = drop * Math.pow(u, 0.6) + (r() - 0.5) * 6;
      const y = y0 + (ground - y0) * Math.min(1, u * 2.2) + Math.sin(u * 7 + seed) * 3;
      pts.push([x, y, Math.max(th * 0.22, th * Math.pow(1 - u, 1.1) + 1)]);
    }
    return spline(pts, 5);
  }
  const TREE_LIMBS = [
    [[-6, -300, 30], [-40, -340, 26], [-100, -372, 19], [-170, -404, 13], [-230, -432, 8], [-270, -446, 5]],
    [[4, -310, 32], [14, -370, 26], [2, -440, 18], [-14, -510, 11], [-6, -590, 6]],
    [[10, -300, 28], [52, -336, 24], [120, -370, 17], [190, -398, 11], [250, -420, 7], [290, -428, 4]],
    [[-8, -320, 22], [-44, -392, 16], [-84, -470, 11], [-120, -540, 5]],
    [[10, -324, 20], [56, -400, 15], [100, -480, 9], [134, -548, 5]],
    [[-110, -376, 9], [-150, -350, 7], [-196, -334, 4]],
    [[132, -374, 9], [180, -352, 6], [224, -340, 3]],
    [[-60, -356, 8], [-60, -420, 6], [-40, -480, 3]],
    [[70, -358, 8], [84, -430, 6], [70, -490, 3]],
  ];
  function canopyClusters(seed) {
    const r = U.seeded(seed);
    const out = [];
    // 圓頂：上層（後面）
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (1.05 + (i / 25) * 0.9) + (r() - 0.5) * 0.12;
      const rx = 250 + r() * 40;
      const ry = 150 + r() * 30;
      out.push([Math.cos(a) * rx, -440 + Math.sin(a) * ry, 58 + r() * 30, 0.1 + r() * 0.3]);
    }
    // 中層
    for (let i = 0; i < 22; i++) {
      const x = (r() * 2 - 1) * 260;
      const y = -470 + (r() - 0.5) * 150 - (1 - Math.abs(x) / 260) * 40;
      out.push([x, y, 56 + r() * 26, 0.35 + r() * 0.3]);
    }
    // 下緣的裙擺（前面）
    for (let i = 0; i < 14; i++) {
      const u = i / 13;
      const x = -300 + u * 600 + (r() - 0.5) * 30;
      const y = -370 + Math.pow(Math.abs(x) / 300, 2) * 18 + (r() - 0.5) * 20;
      out.push([x, y, 44 + r() * 22, 0.65 + r() * 0.3]);
    }
    // 前面幾團比較大的
    [[-150, -420, 70], [150, -416, 70], [0, -430, 78], [-70, -520, 64], [80, -522, 62], [-240, -410, 56], [250, -404, 54], [-60, -372, 44], [10, -366, 46], [70, -374, 42]].forEach(([x, y, R]) => out.push([x + (r() - 0.5) * 16, y + (r() - 0.5) * 16, R, 0.75 + r() * 0.25]));
    return out;
  }
  OA.worldTree = function (c, part, o) {
    o = o || {};
    const ps = pxScale(c);
    const seed = o.seed || 7;
    const doTrunk = () => {
      // 地面的影子
      soft(c, 0, 6, 320, 40, '10,8,6', 0.55);
      soft(c, 0, 2, 150, 22, '8,6,4', 0.6);
      // 板根：後面的先畫（暗一點），前面的後畫；起點都藏在樹幹裡
      const rk = o.rootK || 1;
      [0, 1].forEach((fr) => TREE_ROOTS.forEach((R, i) => {
        if (R[5] !== fr) return;
        OA.tube(c, rootSpine(R[0], R[1], R[2], R[3] * rk, R[4], R[6], seed + i), { pal: TBARK, seed: seed * 3 + i, bark: 0.8, moss: fr ? 0.7 : 0.5, mossAt: (u) => u > 0.2, lit: fr ? 1 : 0.85, ao: (u) => (fr ? 0.1 : 0.25) * u, rimA: 0.14 });
      }));
      // 樹幹：底部往外鼓成板根
      const trunk = [];
      const pts = [[0, 24, 96], [0, -8, 80], [-3, -50, 62], [-4, -100, 52], [2, -150, 47], [-4, -200, 45], [4, -250, 46], [0, -300, 44], [-2, -345, 40], [0, -372, 36]];
      pts.forEach((q) => trunk.push(q));
      const sp = spline(trunk, 8);
      OA.tube(c, sp, {
        pal: TBARK, seed: seed * 7, bark: 1.1, gnarl: 0.28, knots: 2, moss: 0.15, mossAt: (u) => u < 0.45, groove: 1.1,
        ao: (u) => (u < 0.12 ? 0.3 * (1 - u / 0.12) : u > 0.8 ? (u - 0.8) * 1.6 : 0),
      });
      // 樹幹上的星楓紋：刻進樹皮、微微發光
      c.save();
      c.translate(-4, -172);
      soft(c, 0, 0, 40, 46, '255,210,120', 0.4, 'lighter');
      c.beginPath();
      A.mapleLeafPath(c, 0, 0, 17);
      c.fillStyle = 'rgba(40,24,12,0.55)';
      c.fill();
      c.lineJoin = 'round';
      c.strokeStyle = 'rgba(255,214,130,0.85)';
      c.lineWidth = Math.max(0.8 / ps, 1.6);
      c.stroke();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = 'rgba(255,200,110,0.4)';
      c.lineWidth = Math.max(2 / ps, 4);
      c.stroke();
      c.restore();
      // 樹幹腳下的土堆：蓋住樹幹與板根的切口
      {
        const r3 = U.seeded(seed + 77);
        const M3 = c.getTransform();
        const bl = leafPath('blade');
        const lp = leafPath('oval');
        soft(c, 0, 16, 150, 20, '26,18,12', 0.8);
        for (let q = 0; q < 420; q++) {
          const gx = (r3() - 0.5) * 240 * (0.6 + r3() * 0.4);
          const gy = 12 + (r3() - 0.3) * 16 + Math.abs(gx) * 0.04;
          const lx = gx / 120;
          const moss = r3() < 0.65;
          const t = cl(0.3 + (-lx) * 0.2 + (r3() - 0.4) * 0.5 - (gy - 10) * 0.02);
          c.fillStyle = moss ? rgb(ramp(TFOL, t * 0.9)) : rgb(mixA(hex('#3a2a1c'), hex('#8a6a44'), t));
          dab(c, M3, moss ? bl : lp, gx, gy, moss ? 2.5 + r3() * 3.5 : 1.5 + r3() * 2, moss ? (r3() - 0.5) * 0.9 : r3() * PI2);
        }
        c.setTransform(M3);
      }
      // 根沒入土裡的地方：一小撮土與草
      {
        const r2 = U.seeded(seed + 55);
        const M2 = c.getTransform();
        const bl = leafPath('blade');
        TREE_ROOTS.forEach((R) => {
          const ex = R[0] + R[2] * R[3] * rk;
          const ey = R[6];
          soft(c, ex, ey + 2, R[4] * 1.4, R[4] * 0.5, '30,22,14', 0.45);
          for (let q = 0; q < 6; q++) {
            const gx = ex + (r2() - 0.5) * R[4] * 1.6;
            const gy = ey + 2 + (r2() - 0.5) * 4;
            c.fillStyle = rgb(ramp(TFOL, 0.35 + r2() * 0.45));
            dab(c, M2, bl, gx, gy - 3, 3 + r2() * 3, (r2() - 0.5) * 0.8);
          }
          c.setTransform(M2);
        });
      }
      // 根之間的土、落葉、小石頭
      const r = U.seeded(seed + 101);
      const M = c.getTransform();
      const lp = leafPath('maple');
      for (let i = 0; i < 70; i++) {
        const x = (r() - 0.5) * 460;
        const y = 4 + r() * 22;
        const col = r() < 0.5 ? mixA(hex('#6a5030'), hex('#c89048'), r()) : mixA(hex('#34502a'), hex('#86a040'), r());
        c.fillStyle = rgb(col, 0.85);
        const ss = 2 + r() * 3;
        const cs = Math.cos(r() * PI2) * ss;
        const sn = Math.sin(r() * PI2) * ss;
        c.setTransform(M.a * cs, M.b * cs, M.c * sn * 0.4 + M.a * -sn * 0.4, M.d * cs * 0.5, M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f);
        c.fill(lp);
      }
      c.setTransform(M);
    };
    const box = [-340, -660, 340, -330];
    const cls = canopyClusters(seed + 5);
    const back = cls.filter((q) => q[3] < 0.45);
    const front = cls.filter((q) => q[3] >= 0.45);
    const doBack = () => {
      // 樹冠後面的暈光（這棵樹自己在發光）
      soft(c, 0, -480, 400, 260, '255,236,170', 0.22, 'lighter');
      OA.foliage(c, back, { pal: TFOL, box, seed: seed + 11, size: o.leafPx || 7.5, density: 0.9, jit: o.jit, lit: 0.9, lift: 0.04, warm: 0.04, ao: 0.3, air: [hex('#8fb0b8'), 0.3] });
      // 主枝
    };
    const doLimbs = () => {
      TREE_LIMBS.forEach((L, i) => {
        OA.tube(c, spline(L, 6), { pal: TBARK, seed: seed * 11 + i, bark: 0.6, gnarl: 0.2, texA: 0.5, lit: 0.85, ao: (u) => 0.2 + u * 0.25, rimA: 0.1, sunA: 0.12, moss: 0.2 });
      });
    };
    const doErase = () => {
      // 枝條的根部淡掉，露出底下（另一個圖層）的樹幹頂端，兩個圖層才接得起來
      c.save();
      c.globalCompositeOperation = 'destination-out';
      const eg = c.createLinearGradient(0, -300, 0, -352);
      eg.addColorStop(0, 'rgba(0,0,0,1)');
      eg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = eg;
      c.fillRect(-90, -360, 180, 130);
      c.restore();
    };
    const doFront = () => {
      OA.foliage(c, front, { pal: TFOL, box, seed: seed + 13, size: o.leafPx || 7.5, density: 1.5, jit: o.jit, warm: o.warm == null ? 0.06 : o.warm, lift: 0.03, air: [hex('#a8c4c0'), 0.12], glow: o.glow == null ? 14 : o.glow, ao: 0.5 });
      // 樹冠下緣垂下來的一串串葉子
      const r = U.seeded(seed + 17);
      const M = c.getTransform();
      const lp = leafPath('maple');
      for (let k = 0; k < 26; k++) {
        const x = (r() - 0.5) * 560;
        const y0 = -372 + Math.pow(Math.abs(x) / 300, 2) * 20 + r() * 20;
        const len = 20 + r() * 60;
        c.strokeStyle = 'rgba(40,30,22,0.7)';
        c.lineWidth = Math.max(0.6 / ps, 1);
        c.beginPath();
        c.moveTo(x, y0);
        c.quadraticCurveTo(x + 5, y0 + len * 0.5, x + 2, y0 + len);
        c.stroke();
        const nl = Math.round(len / 7);
        for (let q = 0; q < nl; q++) {
          const t = cl(0.25 + r() * 0.35);
          c.fillStyle = rgb(ramp(TFOL, t));
          dab(c, M, lp, x + 2 + (r() - 0.5) * 6, y0 + (len * (q + 0.5)) / nl, 3.5 + r() * 2.5, Math.PI + (r() - 0.5) * 1.2);
        }
        c.setTransform(M);
      }
    };
    // 分開的圖層：樹幹一層、樹冠一層（樹冠在風裡會擺）；整棵一起畫時，枝條藏在樹幹後面
    if (part === 'trunk') doTrunk();
    else if (part === 'canopy') {
      doBack();
      doLimbs();
      doErase();
      doFront();
    } else {
      doBack();
      doLimbs();
      doTrunk();
      doFront();
    }
  };


  // 把 fn 畫的東西染上空氣色（大氣透視）：畫在暫存畫布、只在有東西的地方蓋一層霧色，再貼回來
  OA.hazed = function (c, rgbS, a, fn, grad) {
    const cvs = c.canvas;
    const t = cv(cvs.width, cvs.height);
    const x = t.getContext('2d');
    x.setTransform(c.getTransform());
    fn(x);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    if (grad) {
      const g = x.createLinearGradient(0, grad[0] * t.height, 0, grad[1] * t.height);
      g.addColorStop(0, 'rgba(' + rgbS + ',' + a[0] + ')');
      g.addColorStop(1, 'rgba(' + rgbS + ',' + a[1] + ')');
      x.fillStyle = g;
    } else x.fillStyle = 'rgba(' + rgbS + ',' + a + ')';
    x.fillRect(0, 0, t.width, t.height);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(t, 0, 0);
    c.restore();
  };
  // 小樹（遠處浮島上的）：一根樹幹＋幾團葉
  OA.smallTree = function (c, x, y, h, seed) {
    const r = U.seeded(seed);
    OA.tube(c, spline([[x, y + 2, h * 0.07], [x + (r() - 0.5) * h * 0.1, y - h * 0.4, h * 0.05], [x + (r() - 0.5) * h * 0.15, y - h * 0.7, h * 0.03]], 5), { pal: TBARK, bark: 0.3, seed, rim: false });
    const cls = [];
    for (let i = 0; i < 7; i++) cls.push([x + (r() - 0.5) * h * 0.55, y - h * (0.7 + r() * 0.3), h * (0.16 + r() * 0.1), r()]);
    OA.foliage(c, cls, { pal: TFOL, box: [x - h * 0.4, y - h * 1.1, x + h * 0.4, y - h * 0.5], seed: seed + 1, size: 3.2, density: 1.4, leaf: 'oval', ao: 0.3 });
  };

  OA.light = (x, y, z) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
  };
  // 一顆大石頭（半埋在土裡）：球面受光＋切面＋頂上的苔
  OA.boulder = function (c, x, y, rx, ry, seed, o) {
    o = o || {};
    const r = U.seeded(seed);
    const LV = o.L || LIGHT;
    const pal = o.pal || P([[0, '#1e1f26'], [0.3, '#3d414c'], [0.55, '#6a6e78'], [0.8, '#9ea2a8'], [1, '#d8d8d0']]);
    const pts = [];
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      const k = 0.9 + fbm(i * 0.4, 1, seed, 2) * 0.2;
      pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
    }
    const path = (p) => {
      pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
      p.closePath();
    };
    c.save();
    c.beginPath();
    path(c);
    c.fillStyle = rgb(ramp(pal, 0.45));
    c.fill();
    c.clip();
    // 球面受光：幾圈往光的方向偏的放射漸層
    const g = c.createRadialGradient(x + LV[0] * rx * 0.5, y - ry * 0.6, rx * 0.05, x, y - ry * 0.2, rx * 1.2);
    g.addColorStop(0, rgb(ramp(pal, 0.9)));
    g.addColorStop(0.45, rgb(ramp(pal, 0.55)));
    g.addColorStop(1, rgb(ramp(pal, 0.15)));
    c.fillStyle = g;
    c.fillRect(x - rx * 1.2, y - ry * 1.2, rx * 2.4, ry * 1.3);
    // 切面
    for (let i = 0; i < 40; i++) {
      const px = x + (r() * 2 - 1) * rx * 0.9;
      const py = y - r() * ry * 0.95;
      const fs = rx * (0.06 + r() * 0.14);
      const nx = (r() - 0.5) * 1.4;
      const ny = (r() - 0.5) * 1.2 - 0.3;
      const l = Math.hypot(nx, ny, 0.8);
      const lam = (nx * LV[0] + ny * LV[1] + 0.8 * LV[2]) / l;
      c.beginPath();
      const k = 5;
      const a0 = r() * PI2;
      for (let j = 0; j < k; j++) {
        const a = a0 + (j / k) * PI2 + (r() - 0.5) * 0.5;
        c.lineTo(px + Math.cos(a) * fs * 1.2, py + Math.sin(a) * fs * 0.8);
      }
      c.closePath();
      c.fillStyle = rgb(ramp(pal, cl(0.4 + lam * 0.4 - (py - (y - ry)) / ry * 0.2)), 0.25);
      c.fill();
    }
    OA.texture(c, x - rx * 1.2, y - ry * 1.2, rx * 2.4, ry * 1.3, { fbm: 0.6, grain: 0.35, scale: 0.6 });
    // 地面接觸的陰影
    const ao = c.createLinearGradient(0, y - ry * 0.25, 0, y);
    ao.addColorStop(0, 'rgba(10,12,8,0)');
    ao.addColorStop(1, 'rgba(10,12,8,0.55)');
    c.fillStyle = ao;
    c.fillRect(x - rx * 1.2, y - ry * 0.3, rx * 2.4, ry * 0.4);
    c.restore();
    // 頂上的苔
    if (o.moss) {
      const cls = [];
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.15 + r() * 0.7);
        cls.push([x + Math.cos(a) * rx * 0.75, y + Math.sin(a) * ry * 0.85, rx * (0.16 + r() * 0.12), 0.5 + r() * 0.5]);
      }
      OA.foliage(c, cls, { pal: P([[0, '#10240f'], [0.35, '#2f5a22'], [0.65, '#5f8f34'], [0.88, '#a8c85a'], [1, '#e8f0a0']]), leaf: 'oval', size: 3.2, density: 2.2, box: [x - rx, y - ry * 1.2, x + rx, y], seed: seed + 3, L: LV, ao: 0.2, flat: true });
    }
  };

  // 小碎石：幾個受光不同的切面（遠處、很小的時候用，比整座岩體便宜很多）
  OA.chip = function (c, x, y, rs, seed, o) {
    o = o || {};
    const r = U.seeded(seed);
    const pal = o.pal || ROCKP;
    const n = 6;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI2 + (r() - 0.5) * 0.6;
      const k = 0.7 + r() * 0.3;
      pts.push([x + Math.cos(a) * rs * k * 1.2, y + Math.sin(a) * rs * k * (a > 0 && a < Math.PI ? 1.1 : 0.55)]);
    }
    c.beginPath();
    pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
    c.closePath();
    const g = c.createLinearGradient(x - rs, y - rs, x + rs, y + rs);
    g.addColorStop(0, rgb(ramp(pal, 0.85)));
    g.addColorStop(0.5, rgb(ramp(pal, 0.5)));
    g.addColorStop(1, rgb(ramp(pal, 0.15)));
    c.fillStyle = g;
    c.fill();
    c.fillStyle = rgb(ramp(o.top || TFOL, 0.6), 0.9);
    c.beginPath();
    c.ellipse(x - rs * 0.1, y - rs * 0.45, rs * 0.9, rs * 0.22, 0, 0, PI2);
    c.fill();
  };
})();
