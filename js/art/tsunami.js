// 海嘯浪（潮汐寄居蟹的潮浪 kind 'tide' 投射物、Boss 的水浪橫掃 sweep style 'water'：大海嘯、時間本身的回聲潮浪）。
// 一道高高捲起的浪牆：深藍→青綠的浪身（有深度漸層）、半透明的浪面、往前捲下來的白色浪頭、浪唇上飛出去的水花、
// 浪腳翻滾的白沫、卡在浪裡的海草和木片；後面留下濕掉的地面和水窪；前面地上先有一條被吸回去的退水線。
// 只負責畫：命中範圍、速度、時間、傷害都在原本的程式裡（world.js 的 tide、boss.js 的 sweep）沒有改。
// 浪身可以比命中範圍高，但「會打到人」的下半段（命中高度以下）是實心的深色水牆＋浪腳白沫，一眼看得出來。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const OUTW = '#15304a'; // 水的深色描邊
  const lite = () => !!G.lowFx;
  const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  // 地面高低（本地座標 lx → 相對於浪腳的 y 位移）；沒有地形或不貼地時是 0
  let offFn = null;
  const off = (lx) => (offFn ? offFn(lx) : 0);

  // 浪的輪廓（本地座標：原點在浪腳中心，+x 是前進方向，往上是 -y）
  //   F：命中範圍的前緣（半寬）；Hh：命中高度；V：畫出來的高度
  function geo(F, Hh, V, w) {
    const T = -(V * 1.45 + 50);
    const lipTipY = -Hh * 0.95;
    return {
      T,
      Pa: [-F - V * 0.3, -V * 0.8],
      c1: [-F * 0.2 + w, -V * 1.06],
      c2: [F + V * 0.4 + w, -V * 1.04],
      Pb: [F + V * 0.36 + w, -V * 0.8],
      l1: [F + V * 0.46 + w, -V * 0.62],
      l2: [F + V * 0.32 + w, lipTipY - 6],
      Lt: [F + V * 0.2 + w * 0.6, lipTipY],
      Ii: [F + V * 0.04, Math.min(-V * 0.66, lipTipY - V * 0.1)],
      Fb: [F + 12, 0],
    };
  }
  function bodyPath(ctx, g, V, n) {
    const T = g.T;
    ctx.beginPath();
    ctx.moveTo(T, off(T));
    ctx.bezierCurveTo(T * 0.7, off(T * 0.7) - V * 0.12, T * 0.45, -V * 0.4, g.Pa[0], g.Pa[1]);
    ctx.bezierCurveTo(g.c1[0], g.c1[1], g.c2[0], g.c2[1], g.Pb[0], g.Pb[1]);
    ctx.bezierCurveTo(g.l1[0], g.l1[1], g.l2[0], g.l2[1], g.Lt[0], g.Lt[1]);
    ctx.quadraticCurveTo(g.Lt[0] - V * 0.1, g.Lt[1] - V * 0.02, g.Ii[0], g.Ii[1]);
    ctx.bezierCurveTo(g.Ii[0] - V * 0.1, g.Ii[1] + V * 0.2, g.Fb[0] - 10, -V * 0.18, g.Fb[0], off(g.Fb[0]));
    // 底邊：沿著地面取樣
    for (let i = 1; i <= n; i++) {
      const x = g.Fb[0] + ((T - g.Fb[0]) * i) / n;
      ctx.lineTo(x, off(x) + 2);
    }
    ctx.closePath();
  }
  function cub(p0, p1, p2, p3, k, out) {
    const u = 1 - k;
    out[0] = u * u * u * p0[0] + 3 * u * u * k * p1[0] + 3 * u * k * k * p2[0] + k * k * k * p3[0];
    out[1] = u * u * u * p0[1] + 3 * u * u * k * p1[1] + 3 * u * k * k * p2[1] + k * k * k * p3[1];
    return out;
  }
  const tmp = [0, 0];

  // 退水線：浪（或蟹）前方地上的一條薄水膜，水紋往浪的方向被吸回去
  function recede(ctx, x0, len, a, t) {
    if (a <= 0.01) return;
    const n = 10;
    const g = ctx.createLinearGradient(x0, 0, x0 + len, 0);
    g.addColorStop(0, 'rgba(110,205,250,' + (0.9 * a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(110,205,250,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = x0 + (len * i) / n;
      ctx.lineTo(x, off(x) - 6);
    }
    for (let i = n; i >= 0; i--) {
      const x = x0 + (len * i) / n;
      ctx.lineTo(x, off(x) + 1.5);
    }
    ctx.closePath();
    ctx.fill();
    // 水面的亮邊
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = x0 + (len * i) / n;
      ctx.lineTo(x, off(x) - 6);
    }
    const g2 = ctx.createLinearGradient(x0, 0, x0 + len, 0);
    g2.addColorStop(0, 'rgba(240,252,255,' + (0.9 * a).toFixed(3) + ')');
    g2.addColorStop(1, 'rgba(240,252,255,0)');
    ctx.strokeStyle = g2;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 被吸回去的小水紋（往 x0 移動）
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(235,250,255,0.9)';
    ctx.lineWidth = 2.2;
    const m = lite() ? 4 : 7;
    for (let i = 0; i < m; i++) {
      const q = (t * 1.7 + i / m) % 1;
      const x = x0 + len * (1 - q);
      ctx.globalAlpha = a * Math.sin(q * Math.PI) * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, off(x) - 1.5);
      ctx.lineTo(x + 12 + 16 * (1 - q), off(x) - 1.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 濕掉的地面＋水窪：本地座標 lx 從 from（浪尾）往後到 to（出發點）
  function wetTrail(ctx, from, to, wx, dir, a) {
    if (to >= from - 4) return;
    const len = Math.min(from - to, 900);
    const end = from - len;
    const n = Math.max(2, Math.ceil(len / 40));
    const g = ctx.createLinearGradient(from, 0, end, 0);
    g.addColorStop(0, 'rgba(30,70,100,' + (0.55 * a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(30,70,100,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = from - (len * i) / n;
      ctx.lineTo(x, off(x) - 3);
    }
    for (let i = n; i >= 0; i--) {
      const x = from - (len * i) / n;
      ctx.lineTo(x, off(x) + 2);
    }
    ctx.closePath();
    ctx.fill();
    // 濕地面的反光
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = from - (len * i) / n;
      ctx.lineTo(x, off(x) - 2.5);
    }
    const gl = ctx.createLinearGradient(from, 0, end, 0);
    gl.addColorStop(0, 'rgba(200,240,255,' + (0.6 * a).toFixed(3) + ')');
    gl.addColorStop(1, 'rgba(200,240,255,0)');
    ctx.strokeStyle = gl;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 水窪：固定在世界座標上（每 90px 一格、看雜湊決定有沒有）
    const step = 90;
    const w0 = wx + from * dir;
    const w1 = wx + end * dir;
    const lo = Math.ceil(Math.min(w0, w1) / step);
    const hi = Math.floor(Math.max(w0, w1) / step);
    for (let c = lo; c <= hi; c++) {
      const h = hash(c);
      if (h < 0.35) continue;
      const pwx = c * step + (hash(c + 7) - 0.5) * 40;
      const lx = (pwx - wx) * dir;
      const fa = a * Math.max(0, 1 - (from - lx) / 700);
      if (fa <= 0.02) continue;
      const rw = 12 + h * 22;
      const y = off(lx) - 1;
      ctx.globalAlpha = fa;
      ctx.beginPath();
      ctx.ellipse(lx, y, rw, 3.4 + h * 2, 0, 0, TAU);
      ctx.fillStyle = 'rgba(70,140,190,0.6)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(21,48,74,0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(235,250,255,0.85)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(lx - rw * 0.5, y - 1);
      ctx.lineTo(lx + rw * 0.1, y - 1.4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 主體：浪牆（呼叫前 ctx 已經平移到浪腳、依方向鏡像）
  function wave(ctx, F, Hh, V, t, a, seed) {
    const w = Math.sin(t * 5 + seed) * V * 0.025;
    const g = geo(F, Hh, V, w);
    const lo = lite();
    const nB = lo ? 8 : 14;
    ctx.globalAlpha = a;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // 浪身：深度漸層（上淺下深）
    bodyPath(ctx, g, V, nB);
    const gv = ctx.createLinearGradient(0, -V, 0, 0);
    gv.addColorStop(0, '#5fd0d8');
    gv.addColorStop(0.35, '#2296b4');
    gv.addColorStop(0.72, '#12557f');
    gv.addColorStop(1, '#0b2f52');
    ctx.fillStyle = gv;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 浪尾越後面越暗、越低
    const gh = ctx.createLinearGradient(g.T, 0, g.Pa[0], 0);
    gh.addColorStop(0, 'rgba(8,36,64,0.55)');
    gh.addColorStop(1, 'rgba(8,36,64,0)');
    ctx.fillStyle = gh;
    ctx.fillRect(g.T - 4, -V * 1.2, g.Pa[0] - g.T + 4, V * 1.3);
    // 半透明的浪面：靠前緣的一條，光透過薄水變亮
    const gf = ctx.createLinearGradient(g.Ii[0] - V * 0.45, 0, g.Fb[0] + 4, 0);
    gf.addColorStop(0, 'rgba(140,235,235,0)');
    gf.addColorStop(0.7, 'rgba(140,235,235,0.38)');
    gf.addColorStop(1, 'rgba(210,255,250,0.6)');
    ctx.fillStyle = gf;
    ctx.fillRect(g.Ii[0] - V * 0.45, -V * 1.1, V * 0.6 + 20, V * 1.1);
    // 浪裡的流線（跟著捲的方向）
    ctx.strokeStyle = 'rgba(190,245,250,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const k = 0.3 + i * 0.17;
      const sh = Math.sin(t * 3 + i * 2 + seed) * 4;
      ctx.beginPath();
      ctx.moveTo(g.T * (0.75 - i * 0.12), -V * k * 0.5 + sh);
      ctx.quadraticCurveTo(-F - V * 0.2, -V * (k + 0.15) + sh, g.Ii[0] - V * 0.08, -V * (k + 0.22));
      ctx.stroke();
    }
    // 卡在浪裡的海草和木片（在浪裡慢慢翻轉）
    const nd = lo ? 2 : 4;
    for (let i = 0; i < nd; i++) {
      const bx = -F - V * (0.2 + i * 0.32) + Math.sin(t * 1.3 + i) * 6;
      const by = -V * (0.3 + 0.12 * ((i * 3) % 4)) + Math.cos(t * 1.7 + i * 2) * 5;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(t * (i % 2 ? 1.6 : -1.2) + i);
      if (i % 2 === 0) {
        // 海草：一條扭來扭去的綠帶
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.bezierCurveTo(-4, -7 + Math.sin(t * 6 + i) * 3, 3, 7, 10, -2);
        ctx.strokeStyle = OUTW;
        ctx.lineWidth = 4.6;
        ctx.stroke();
        ctx.strokeStyle = '#4fae5a';
        ctx.lineWidth = 2.6;
        ctx.stroke();
      } else {
        // 木片
        ctx.beginPath();
        ctx.rect(-7, -2.5, 14, 5);
        ctx.fillStyle = '#b08a5a';
        ctx.fill();
        ctx.strokeStyle = OUTW;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }
    // 命中高度以下：實心的水牆＋一排翻滾的白沫（讓「會打到的部分」清楚）
    ctx.fillStyle = 'rgba(8,40,72,0.28)';
    ctx.fillRect(g.T, -Hh, g.Fb[0] - g.T + 20, Hh + 6);
    ctx.restore();
    // 描邊
    bodyPath(ctx, g, V, nB);
    ctx.strokeStyle = OUTW;
    ctx.lineWidth = 3;
    ctx.stroke();
    // 浪頭：沿著浪頂＋浪唇的一條粗白沫（先描深色邊再填白）
    const crest = () => {
      ctx.beginPath();
      ctx.moveTo(g.Pa[0] + V * 0.12, g.Pa[1] - V * 0.08);
      ctx.bezierCurveTo(g.c1[0], g.c1[1] + 2, g.c2[0], g.c2[1] + 2, g.Pb[0], g.Pb[1]);
      ctx.bezierCurveTo(g.l1[0], g.l1[1], g.l2[0], g.l2[1], g.Lt[0], g.Lt[1]);
    };
    const fw = Math.max(7, V * 0.085);
    crest();
    ctx.strokeStyle = OUTW;
    ctx.lineWidth = fw + 4;
    ctx.stroke();
    crest();
    ctx.strokeStyle = '#f4fdff';
    ctx.lineWidth = fw;
    ctx.stroke();
    // 浪頭下緣的泡泡（一顆顆的扇形邊）
    const nb = lo ? 6 : 11;
    for (let i = 0; i < nb; i++) {
      const k = 0.12 + (i / nb) * 0.85;
      cub(g.Pa, g.c1, g.c2, g.Pb, k, tmp);
      const r = fw * (0.42 + 0.22 * Math.sin(t * 9 + i * 1.7 + seed));
      const yy = tmp[1] + fw * 0.45 + 1;
      ctx.beginPath();
      ctx.arc(tmp[0], yy, r, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(21,48,74,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    // 浪唇下面的陰影一線（捲起來的空洞）
    ctx.beginPath();
    ctx.moveTo(g.Lt[0], g.Lt[1]);
    ctx.quadraticCurveTo(g.Lt[0] - V * 0.1, g.Lt[1] - V * 0.02, g.Ii[0], g.Ii[1]);
    ctx.strokeStyle = 'rgba(210,255,255,0.8)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 浪面上一條細亮邊
    ctx.beginPath();
    ctx.moveTo(g.Ii[0] - 2, g.Ii[1] + 6);
    ctx.bezierCurveTo(g.Ii[0] - V * 0.1, g.Ii[1] + V * 0.2, g.Fb[0] - 12, -V * 0.18, g.Fb[0] - 3, -Hh * 0.2);
    ctx.strokeStyle = 'rgba(230,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 浪腳：往前翻滾的白沫（貼地的一整排，前緣最多最高 → 會打到人的地方）
    const nf = lo ? 5 : 9;
    for (let i = 0; i < nf; i++) {
      const k = i / (nf - 1);
      const x = g.Fb[0] + 4 - k * (g.Fb[0] - g.T) * 0.55 + Math.sin(t * 11 + i * 2.3) * 3;
      const big = 1 - k * 0.65;
      const r = (6 + V * 0.05) * big * (0.8 + 0.25 * Math.sin(t * 13 + i * 1.3 + seed));
      const y = off(x) - r * 0.6 - Math.abs(Math.sin(t * 7 + i)) * 3 * big;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = i % 3 === 1 ? '#dff6fb' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = OUTW;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    // 前緣的沫柱：從地面往上翻到命中高度一半
    const nc = lo ? 3 : 5;
    for (let i = 0; i < nc; i++) {
      const q = (t * 2.2 + i / nc) % 1;
      const x = g.Fb[0] + 2 + Math.sin(i * 2.1 + t * 6) * 5;
      const y = off(x) - q * Hh * 0.6;
      const r = (4 + V * 0.03) * (1 - q * 0.5);
      ctx.globalAlpha = a * (1 - q * 0.7);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(21,48,74,0.7)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // 水花：從浪唇往前上方飛出去、再落下
    const nd2 = lo ? 4 : 9;
    for (let i = 0; i < nd2; i++) {
      const q = (t * 1.5 + i * 0.618 + seed) % 1;
      const hs = hash(i + 3);
      const sx = g.Pb[0] - V * 0.05 * hs;
      const sy = g.Pb[1] - V * 0.04;
      const vx = V * (0.35 + hs * 0.6);
      const vy = -V * (0.45 + hash(i + 11) * 0.5);
      const x = sx + vx * q;
      const y = sy + vy * q + V * 1.3 * q * q;
      const r = (1.6 + hs * 2.6) * (1 - q * 0.4) * (V > 150 ? 1.4 : 1);
      ctx.globalAlpha = a * (1 - q);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = hs > 0.5 ? '#ffffff' : '#bff0f6';
      ctx.fill();
      ctx.strokeStyle = OUTW;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // 浪頂的霧氣
    if (!lo) {
      for (let i = 0; i < 4; i++) {
        const q = (t * 0.9 + i / 4) % 1;
        const x = g.c1[0] + (g.Pb[0] - g.c1[0]) * (i / 3) - q * V * 0.3;
        const y = g.c1[1] + V * 0.1 - q * V * 0.25;
        ctx.globalAlpha = a * 0.35 * Math.sin(q * Math.PI);
        ctx.beginPath();
        ctx.arc(x, y, V * 0.08 + q * V * 0.08, 0, TAU);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    return g;
  }

  // 完整的一道浪（含後面的濕地、前面的退水線）。wx：浪腳世界 x；dir：方向；fromWx：出發點世界 x
  function full(ctx, wx, dir, F, Hh, V, t, a, seed, fromWx, gOff) {
    offFn = gOff;
    const T = -(V * 1.45 + 50);
    ctx.save();
    ctx.scale(dir, 1);
    if (fromWx != null) wetTrail(ctx, T + 30, (fromWx - wx) * dir, wx, dir, a);
    recede(ctx, F + 16, 70 + V * 0.5, a * 0.9, t);
    wave(ctx, F, Hh, V, t, a, seed);
    ctx.restore();
    offFn = null;
  }

  // ── 寄居蟹的潮浪（kind 'tide'）：ctx 已平移到 (p.x, p.y) ──
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.PROJ_DRAW.tide = function (ctx, p, t) {
    const d = p.dir || 1;
    if (p.fx0 == null) p.fx0 = p.x - p.vx * (p.t || 0);
    const Hh = p.h || 60;
    const map = G.world && G.world.map;
    const gOff = p.gnd && map ? (lx) => G.physics.groundY(map, p.x + lx * d) - p.y : null;
    const a = p.hitDone ? 0.92 : 1;
    // 命中範圍：x ±22、高 p.h（world.js）
    full(ctx, p.x, d, 22, Hh, Hh * 1.9, G.time, a, (p.fx0 || 0) * 0.01, p.fx0, gOff);
  };

  // ── Boss 的水浪橫掃（sweep style 'water'）：大海嘯（hgt 128）、時間回聲的潮浪（hgt 62） ──
  //   命中範圍：x ±hw、高 hgt（boss.js 的 sweep）
  A.tsunami = {
    sweep(ctx, h) {
      const U = G.util;
      const d = U.sign(h.x1 - h.x0) || 1;
      const y = h.y;
      const Hh = h.hgt;
      const F = h.hw || 24;
      const V = Hh * (Hh > 100 ? 1.6 : 1.9);
      const t = G.time;
      ctx.save();
      if (h.t < (h.delay || 0)) {
        // 還沒出來：出發點的水先往後退（退水線），再慢慢隆起一道浪
        const k = U.clamp(h.t / h.delay, 0, 1);
        ctx.translate(h.x0, y);
        ctx.save();
        ctx.scale(d, 1);
        offFn = null;
        recede(ctx, 0, 180 + 160 * k, Math.min(1, k * 2), t);
        ctx.restore();
        if (k > 0.25) {
          const kk = (k - 0.25) / 0.75;
          full(ctx, h.x0, d, F, Hh * kk, V * kk, t, kk, 0, null, null);
        }
        ctx.restore();
        return;
      }
      ctx.translate(h.x, y);
      full(ctx, h.x, d, F, Hh, V, t, 1, (h.x0 || 0) * 0.01, h.x0, null);
      ctx.restore();
    },
    // 寄居蟹準備潮浪時：蟹左右兩側地上的水往蟹這邊退（配合原本的藍色預警帶）
    tele(ctx, cx, y, k, gnd) {
      const map = G.world && G.world.map;
      const t = G.time;
      [-1, 1].forEach((d) => {
        ctx.save();
        ctx.translate(cx, y);
        ctx.scale(d, 1);
        offFn = gnd && map ? (lx) => G.physics.groundY(map, cx + lx * d) - y : null;
        // 水被吸回去：濕掉的地面留在外面，水邊（白色泡沫線）一路往蟹這邊退
        const far = 620;
        const E = 70 + (far - 70) * (1 - k * 0.85);
        const n = 14;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const x = 60 + ((far - 60) * i) / n;
          ctx.lineTo(x, off(x) - 3);
        }
        for (let i = n; i >= 0; i--) {
          const x = 60 + ((far - 60) * i) / n;
          ctx.lineTo(x, off(x) + 2);
        }
        ctx.closePath();
        const gw = ctx.createLinearGradient(60, 0, far, 0);
        gw.addColorStop(0, 'rgba(20,55,90,0.45)');
        gw.addColorStop(1, 'rgba(20,55,90,0)');
        ctx.fillStyle = gw;
        ctx.fill();
        recede(ctx, 60, E - 60, 1, t);
        // 水邊的泡沫
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
          const x = E - i * 9 + Math.sin(t * 9 + i * 2) * 2;
          ctx.beginPath();
          ctx.ellipse(x, off(x) - 4, 9 - i * 2, 4.5 - i * 0.8, 0, 0, TAU);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = OUTW;
          ctx.stroke();
        }
        offFn = null;
        ctx.restore();
      });
    },
  };
})();
