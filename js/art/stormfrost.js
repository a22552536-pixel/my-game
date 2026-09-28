// 雷鼓與冰（三個特效，全部登記在 A.skillFx）：
//   A.raijinDrums —— 雷霆審判：身後一圈雷神的太鼓（紅漆鼓框、米白鼓面、鼓面上黑色的三巴鉤玉），
//                   每劈一道鼓就一縮一彈、發光，鼓與鼓之間爬著電，鉤玉一直轉。由 art/skills3.js 的 judgeFx 呼叫。
//   A.auroraIce  —— 極光風暴：被掃到的怪物包在半透明的冰晶裡（比例不變、不壓扁），緩速結束時冰碎成碎片。
//                   由 art/skills5.js 的 auroraFx.hit 登記、art/monsters.js 查詢（冰住時不做受擊壓扁／後仰）。
//   A.frostGust  —— 霜靈的暴風雪：預警（地面風道、鐘在鹿角上搖響、雪往鐘捲進去）、吹出去的強風、
//                   玩家被凍在冰塊裡飛出去、落地後冰塊碎掉。由 js/game/boss3.js 呼叫。
(function () {
  'use strict';
  const A = G.art;
  if (!A.skillFx) return;
  const TAU = Math.PI * 2;
  const PI = Math.PI;
  let seed = 424242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const rr = (a, b) => a + (b - a) * rnd();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const eOut = (k) => 1 - (1 - k) * (1 - k);
  const eBack = (k) => {
    const c = 1.9;
    return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  };
  const lite = () => !!G.lowFx;
  const OUTC = '#2a1a22';
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
  const GLOW_B = radial(96, [[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(210,232,255,0.85)'], [0.5, 'rgba(120,170,255,0.3)'], [1, 'rgba(60,110,255,0)']]);
  const GLOW_G = radial(96, [[0, 'rgba(255,240,190,0.85)'], [0.4, 'rgba(255,200,90,0.3)'], [1, 'rgba(255,170,60,0)']]);
  const FROST = radial(64, [[0, 'rgba(240,255,255,0.95)'], [0.4, 'rgba(160,230,255,0.4)'], [1, 'rgba(150,200,255,0)']]);
  const PUFF = radial(64, [[0, 'rgba(250,253,255,0.9)'], [0.55, 'rgba(225,242,255,0.45)'], [1, 'rgba(210,235,255,0)']]);

  // 鋸齒電弧：寫進 buf（x,y 交錯），回傳點數
  function jag(buf, off, x0, y0, x1, y1, n, amp) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const o = i === 0 || i === n - 1 ? 0 : rr(-1, 1) * amp;
      buf[off + i * 2] = x0 + dx * k + nx * o;
      buf[off + i * 2 + 1] = y0 + dy * k + ny * o;
    }
    return n;
  }
  function bolt(ctx, buf, off, n, w, a) {
    if (a <= 0.01 || n < 2) return;
    ctx.beginPath();
    ctx.moveTo(buf[off], buf[off + 1]);
    for (let i = 1; i < n; i++) ctx.lineTo(buf[off + i * 2], buf[off + i * 2 + 1]);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = a * 0.55;
    ctx.strokeStyle = '#7fa8ff';
    ctx.lineWidth = w * 3.2;
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#eef5ff';
    ctx.lineWidth = w;
    ctx.stroke();
  }

  // ═══════════════════════ 雷鼓（雷霆審判） ═══════════════════════
  // 太鼓：正面看鼓面，右下露出一點鼓身。3 倍解析度預先畫好；鼓面上的鉤玉另外一張，畫的時候旋轉。
  const DS = 3;
  const DR = 18; // 鼓框半徑（世界座標）
  const HR = DR * 0.74; // 鼓面半徑
  const DRUM = (() => {
    const R = DR * DS;
    const S = Math.ceil(R * 2.8);
    const cv = mk(S);
    const c = cv.getContext('2d');
    const cx = S / 2 - R * 0.12;
    const cy = S / 2 - R * 0.12;
    const bx = cx + R * 0.2;
    const by = cy + R * 0.3;
    const lw = 2.2 * DS;
    // 鼓身（圓筒）：先描邊再塗
    c.fillStyle = OUTC;
    c.beginPath();
    c.arc(bx, by, R + lw / 2, 0, TAU);
    c.fill();
    c.strokeStyle = OUTC;
    c.lineWidth = R * 2 + lw;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(bx, by);
    c.stroke();
    const shell = c.createLinearGradient(bx - R, by, bx + R, by);
    shell.addColorStop(0, '#5a1c14');
    shell.addColorStop(0.55, '#8e2e1c');
    shell.addColorStop(1, '#4a1610');
    c.fillStyle = shell;
    c.beginPath();
    c.arc(bx, by, R, 0, TAU);
    c.fill();
    c.strokeStyle = shell;
    c.lineWidth = R * 2;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(bx, by);
    c.stroke();
    // 鼓身的木紋與金箍
    c.strokeStyle = 'rgba(30,8,6,0.35)';
    c.lineWidth = DS * 0.8;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(cx + (bx - cx) * (0.3 + i * 0.25), cy + (by - cy) * (0.3 + i * 0.25), R * 0.98, -0.1, 1.7);
      c.stroke();
    }
    c.strokeStyle = '#e0a93e';
    c.lineWidth = R * 0.13;
    c.beginPath();
    c.arc(cx + (bx - cx) * 0.62, cy + (by - cy) * 0.62, R * 0.99, -0.25, 1.85);
    c.stroke();
    // 鼓框（紅漆）
    const rim = c.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.2, cx, cy, R);
    rim.addColorStop(0, '#ef6a44');
    rim.addColorStop(0.6, '#c93a24');
    rim.addColorStop(1, '#8e2616');
    c.fillStyle = rim;
    c.beginPath();
    c.arc(cx, cy, R, 0, TAU);
    c.fill();
    c.strokeStyle = OUTC;
    c.lineWidth = lw;
    c.stroke();
    c.strokeStyle = 'rgba(255,190,150,0.8)';
    c.lineWidth = R * 0.07;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(cx, cy, R * 0.9, PI * 1.05, PI * 1.5);
    c.stroke();
    // 鼓釘
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      c.beginPath();
      c.arc(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86, R * 0.06, 0, TAU);
      c.fillStyle = '#ffd97a';
      c.fill();
      c.strokeStyle = OUTC;
      c.lineWidth = DS * 0.6;
      c.stroke();
    }
    // 鼓面（米白皮，右下有一點陰影）
    const Rs = HR * DS;
    c.save();
    c.beginPath();
    c.arc(cx, cy, Rs, 0, TAU);
    c.clip();
    c.fillStyle = '#e2d2ac';
    c.fillRect(cx - Rs, cy - Rs, Rs * 2, Rs * 2);
    const hd = c.createRadialGradient(cx - Rs * 0.25, cy - Rs * 0.28, Rs * 0.1, cx, cy, Rs * 1.05);
    hd.addColorStop(0, '#fffaec');
    hd.addColorStop(0.7, '#f3e8cc');
    hd.addColorStop(1, '#d6c49a');
    c.fillStyle = hd;
    c.beginPath();
    c.arc(cx - Rs * 0.05, cy - Rs * 0.05, Rs, 0, TAU);
    c.fill();
    c.restore();
    c.strokeStyle = '#8e6c46';
    c.lineWidth = DS * 0.9;
    c.beginPath();
    c.arc(cx, cy, Rs, 0, TAU);
    c.stroke();
    return { c: cv, w: S / DS, ox: cx / DS, oy: cy / DS };
  })();
  // 三巴（黑色的三個鉤玉）：圓圓的頭＋沿著鼓面外圈掃出去、越來越細的尾巴，尾巴繞過下一個頭的外側（中間留一道米白的縫）
  const TD = 0.38; // 頭中心離圓心
  const TH = 0.25; // 頭半徑
  function tomoeTail(c, r, a) {
    const phi = 2.3;
    const N = 18;
    const ro = 0.96;
    const r0 = TD + TH;
    const i0 = TD - TH;
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const an = a + u * phi;
      const k = Math.min(1, u / 0.45);
      const rr_ = (r0 + (ro - r0) * (1 - (1 - k) * (1 - k))) * r;
      if (i === 0) c.moveTo(Math.cos(an) * rr_, Math.sin(an) * rr_);
      else c.lineTo(Math.cos(an) * rr_, Math.sin(an) * rr_);
    }
    for (let i = N; i >= 0; i--) {
      const u = i / N;
      const an = a + u * phi;
      const rr_ = (i0 + (ro - 0.012 - i0) * Math.pow(u, 0.8)) * r;
      c.lineTo(Math.cos(an) * rr_, Math.sin(an) * rr_);
    }
    c.closePath();
  }
  const TOMOE = (() => {
    const R = HR * DS;
    const S = Math.ceil(R * 2 + 4);
    const cv = mk(S);
    const c = cv.getContext('2d');
    c.translate(S / 2, S / 2);
    const r = R * 0.94;
    c.fillStyle = '#141018';
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU;
      tomoeTail(c, r, a);
      c.fill();
      c.beginPath();
      c.arc(Math.cos(a) * TD * r, Math.sin(a) * TD * r, TH * r, 0, TAU);
      c.fill();
    }
    // 頭上一點墨光（不是純剪影）
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU;
      c.beginPath();
      c.arc(Math.cos(a) * TD * r - TH * r * 0.3, Math.sin(a) * TD * r - TH * r * 0.35, TH * r * 0.28, 0, TAU);
      c.fillStyle = 'rgba(120,120,150,0.5)';
      c.fill();
    }
    return { c: cv, w: S / DS };
  })();

  const RD = { n: 8 };
  // 第 i 面鼓的位置：身後一個上方的大弧（開口朝下，像雷神背上的鼓環）
  function drumPos(e, P, i, n, out) {
    const t = e.t;
    const a = eBack(clamp(t / 0.26, 0, 1));
    const cx = P.x - (P.dir || 1) * 8;
    const cy = P.y - 80;
    const k = n > 1 ? i / (n - 1) : 0.5;
    const ang = PI * 0.8 + k * PI * 1.4 + 0.05 * Math.sin(t * 1.7);
    const R = 102 * a;
    const Ry = 88 * a;
    const f = drumsOutOf(e);
    out.cx = cx;
    out.cy = cy;
    out.x = cx + Math.cos(ang) * R;
    out.y = cy + Math.sin(ang) * Ry + Math.sin(t * 3.2 + i * 1.3) * 2 - (1 - f) * 22;
    return out;
  }
  function drumsOutOf(e) {
    if (e.done) return clamp(1 - (e.t - e.lastHit - 0.35) / 0.4, 0, 1);
    if (e.fz && e.hitT < 0) return clamp(1 - (e.t - e.hitAt - 0.25) / 0.35, 0, 1);
    return 1;
  }
  const DPQ = { x: 0, y: 0, cx: 0, cy: 0 };
  const DX = new Float32Array(10);
  const DY = new Float32Array(10);
  const CH = new Float32Array(2 * 7 * 10);
  function drumsBack(ctx, e, P, out) {
    if (out <= 0) return true;
    const t = e.t;
    const n = lite() ? 6 : 8;
    const hk = e.hitT >= 0 ? t - e.lastHit : -1;
    // 劈中的那一下：所有鼓一起一縮一彈
    const sp = hk >= 0 ? Math.max(0, 1 - hk / (e.lastBig ? 0.3 : 0.18)) * (e.lastBig ? 1 : 0.75) : 0;
    for (let i = 0; i < n; i++) {
      drumPos(e, P, i, n, DPQ);
      DX[i] = DPQ.x;
      DY[i] = DPQ.y;
    }
    const cx = DPQ.cx;
    const cy = DPQ.cy;
    const a = eBack(clamp(t / 0.26, 0, 1));
    // 背後的光
    ctx.globalCompositeOperation = 'lighter';
    const gr = 130 * a * (1 + 0.25 * sp);
    ctx.globalAlpha = out * (0.3 + 0.35 * sp);
    ctx.drawImage(GLOW_G, cx - gr, cy - gr * 0.9, gr * 2, gr * 1.8);
    // 鼓環：串起所有鼓的漆木圈
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = out;
    if (a > 0.05) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + Math.sin(t * 3.2) * 1.5, 102 * a, 88 * a, 0, PI * 0.8 + 0.05 * Math.sin(t * 1.7), PI * 2.2 + 0.05 * Math.sin(t * 1.7));
      ctx.lineCap = 'round';
      ctx.strokeStyle = OUTC;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = '#7e2618';
      ctx.lineWidth = 4.6;
      ctx.stroke();
      ctx.strokeStyle = sp > 0.1 ? '#fff0b0' : '#e0a93e';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // 鼓與鼓之間的電：一直細細地爬，劈下的瞬間變粗變亮
    const beating = !e.done && !e.fz && t > 0.1;
    const bi = beating ? e.beatI % n : -1;
    const bk = beating ? 1 - (((t - 0.1) / 0.048) % 1) : 0;
    if (t > 0.15 && (!lite() || sp > 0 || beating)) {
      ctx.globalCompositeOperation = 'lighter';
      if (!e._rdT || t - e._rdT > 0.05) {
        e._rdT = t;
        e._rdS = rnd();
      }
      const s0 = seed;
      seed = 1 + Math.floor((e._rdS || 0.5) * 2147483640);
      for (let i = 0; i < n - 1; i++) {
        const on = sp > 0 || i === bi || rnd() < 0.45;
        if (!on) continue;
        jag(CH, i * 14, DX[i], DY[i], DX[i + 1], DY[i + 1], 7, 7);
        const w = 1 + sp * 1.4 + (i === bi ? bk * 0.8 : 0);
        bolt(ctx, CH, i * 14, 7, w, out * (0.35 + 0.65 * Math.max(sp, i === bi ? bk : 0.3)));
      }
      seed = s0;
    }
    // 鉤玉：一直轉；每劈一道就被甩快一下
    const kick = e.nS ? (e.nS - 1 + eOut(clamp(hk / 0.3, 0, 1))) * 1.6 : 0;
    const rot = t * 2.6 + kick;
    for (let i = 0; i < n; i++) {
      const si = eBack(clamp((t - 0.02 - i * 0.022) / 0.16, 0, 1));
      if (si <= 0.01) continue;
      const p = i === bi ? bk : 0;
      const q = Math.max(sp, p * 0.6);
      // 一縮一彈：被敲的瞬間扁一點、寬一點，接著彈回來
      const wob = Math.sin(q * PI);
      const sx = si * (1 + 0.16 * wob) * (0.7 + 0.3 * out);
      const sy = si * (1 - 0.13 * wob + 0.05 * q * q) * (0.7 + 0.3 * out);
      const x = DX[i];
      const y = DY[i];
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = out;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx, sy);
      ctx.drawImage(DRUM.c, -DRUM.ox, -DRUM.oy, DRUM.w, DRUM.w);
      ctx.rotate(rot + i * 0.7);
      ctx.drawImage(TOMOE.c, -TOMOE.w / 2, -TOMOE.w / 2, TOMOE.w, TOMOE.w);
      ctx.restore();
      // 鼓面高光（不跟著鉤玉轉）
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(x, y, HR * 0.8 * sx, HR * 0.8 * sy, 0, PI * 1.12, PI * 1.42);
      ctx.stroke();
      const ga = 0.7 * p + 0.95 * sp;
      if (ga > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, ga) * out;
        const r = 26 * si;
        ctx.drawImage(GLOW_B, x - r, y - r, r * 2, r * 2);
      }
    }
    // 每劈一道，每面鼓往天上射一道電（judgeFx 用同一套鼓的位置算好的）
    const dd = e.lastBig ? 0.2 : 0.11;
    if (e.dn && hk >= 0 && hk < dd && e.db) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < e.dn; i++) bolt(ctx, e.db, i * 14, 7, 1.5, (1 - hk / dd) * out);
    }
    return true;
  }
  A.raijinDrums = {
    _sprites: { drum: DRUM, tomoe: TOMOE },
    // judgeFx 的 drumPos 換成這一套（敲鼓火花、往天上射的電也從這裡出）
    pos: (e, P, i, n, out) => drumPos(e, P, i, n, out),
    // 畫整圈鼓；回傳 true 表示已經畫好（judgeFx 就不畫舊的鼓）
    back: drumsBack,
  };

  // ═══════════════════════ 碎冰（共用） ═══════════════════════
  const SH = [];
  for (let i = 0; i < 110; i++) SH.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, s: 1, t: 0, life: 1, floor: 0, k: 0 });
  let shN = 0;
  function shard(x, y, vx, vy, s, life, floor, k) {
    for (const q of SH) {
      if (q.on) continue;
      q.on = true;
      shN++;
      q.x = x;
      q.y = y;
      q.vx = vx;
      q.vy = vy;
      q.r = rr(0, TAU);
      q.vr = rr(-14, 14);
      q.s = s;
      q.t = 0;
      q.life = life;
      q.floor = floor;
      q.k = k || 0; // 0 碎冰 1 雪霧 2 冰晶閃光
      return q;
    }
    return null;
  }
  function stepShards(dt) {
    if (!shN) return;
    for (const q of SH) {
      if (!q.on) continue;
      q.t += dt;
      if (q.t >= q.life) {
        q.on = false;
        shN--;
        continue;
      }
      if (q.k === 1) {
        q.vx *= 1 - Math.min(1, dt * 2.5);
        q.vy = q.vy * (1 - Math.min(1, dt * 2.5)) - 20 * dt;
      } else {
        q.vy += 1500 * dt;
        q.r += q.vr * dt;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.k === 0 && q.y > q.floor) {
        q.y = q.floor;
        q.vy *= -0.3;
        q.vx *= 0.6;
        q.vr *= 0.5;
      }
    }
  }
  function drawShards(ctx) {
    if (!shN) return;
    for (const q of SH) {
      if (!q.on) continue;
      const k = q.t / q.life;
      if (q.k === 1) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (1 - k) * 0.75;
        const r = q.s * (1 + k * 1.2);
        ctx.drawImage(PUFF, q.x - r, q.y - r, r * 2, r * 2);
        continue;
      }
      if (q.k === 2) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - k);
        const r = q.s * 2.2;
        ctx.drawImage(FROST, q.x - r, q.y - r, r * 2, r * 2);
        continue;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      const s = q.s;
      const c = Math.cos(q.r);
      const sn = Math.sin(q.r);
      const px = (u, v) => q.x + u * c - v * sn;
      const py = (u, v) => q.y + u * sn + v * c;
      ctx.beginPath();
      ctx.moveTo(px(-s, -s * 0.4), py(-s, -s * 0.4));
      ctx.lineTo(px(s * 1.1, -s * 0.2), py(s * 1.1, -s * 0.2));
      ctx.lineTo(px(-s * 0.2, s * 0.8), py(-s * 0.2, s * 0.8));
      ctx.closePath();
      ctx.fillStyle = 'rgba(205,240,255,0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,70,110,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(px(-s * 0.6, -s * 0.25), py(-s * 0.6, -s * 0.25));
      ctx.lineTo(px(s * 0.5, -s * 0.15), py(s * 0.5, -s * 0.15));
      ctx.stroke();
    }
  }
  function burstIce(cx, cy, w, h, floor, n) {
    const L = lite();
    n = Math.round(n * (L ? 0.45 : 1));
    for (let i = 0; i < n; i++) {
      const a = -PI / 2 + rr(-1.4, 1.4);
      const sp = rr(150, 420);
      shard(cx + rr(-0.5, 0.5) * w, cy + rr(-0.5, 0.5) * h, Math.cos(a) * sp, Math.sin(a) * sp, rr(3, 7) * clamp(w / 70, 0.8, 1.6), rr(0.55, 0.9), floor, 0);
    }
    for (let i = 0; i < (L ? 2 : 5); i++) shard(cx + rr(-0.4, 0.4) * w, cy + rr(-0.3, 0.4) * h, rr(-60, 60), rr(-50, -10), rr(16, 26) * clamp(w / 70, 0.8, 1.8), rr(0.5, 0.8), floor, 1);
    for (let i = 0; i < (L ? 2 : 6); i++) shard(cx + rr(-0.5, 0.5) * w, cy + rr(-0.5, 0.5) * h, rr(-40, 40), rr(-90, -30), rr(3, 5), rr(0.3, 0.5), floor, 2);
  }

  // ═══════════════════════ 冰殼（怪物、玩家共用的畫法） ═══════════════════════
  // 形狀：底邊平、兩側與頂端參差的晶面；座標用 (u, v)：u -0.5..0.5（寬）、v 0..1（高，0 是腳底）
  function makeShell() {
    const pts = [];
    pts.push([-0.5, 0]);
    const nL = 3;
    for (let i = 1; i <= nL; i++) pts.push([-0.5 - rr(0.0, 0.07), (i / (nL + 1)) * 0.85 + rr(-0.04, 0.04)]);
    // 頂端：幾個尖晶
    const nT = 4;
    for (let i = 0; i <= nT; i++) {
      const u = -0.46 + (i / nT) * 0.92;
      const peak = i % 2 === 1;
      pts.push([u + rr(-0.03, 0.03), peak ? 1.02 + rr(0.02, 0.12) : 0.9 + rr(-0.03, 0.05)]);
    }
    for (let i = nL; i >= 1; i--) pts.push([0.5 + rr(0.0, 0.07), (i / (nL + 1)) * 0.85 + rr(-0.04, 0.04)]);
    pts.push([0.5, 0]);
    // 晶面的折線：從內部幾個點連到外框頂點
    const fac = [];
    const cN = 2;
    for (let c = 0; c < cN; c++) {
      const ix = rr(-0.22, 0.22);
      const iy = rr(0.3, 0.7);
      for (let j = 0; j < 3; j++) {
        const p = pts[Math.floor(rr(1, pts.length - 1))];
        fac.push([ix, iy, p[0], p[1]]);
      }
    }
    // 往外長的晶簇：左右下方、頂端
    const spk = [];
    const sides = [[-0.5, 0.12, PI + 0.5], [0.5, 0.18, -0.45], [-0.3, 0.98, -PI / 2 - 0.35], [0.28, 1.0, -PI / 2 + 0.3], [0.52, 0.55, -0.15]];
    for (const s of sides) spk.push({ u: s[0], v: s[1], a: s[2] + rr(-0.15, 0.15), len: rr(0.18, 0.3), wd: rr(0.07, 0.11) });
    // 閃光的位置
    const gl = [[rr(-0.3, -0.1), rr(0.65, 0.85)], [rr(0.1, 0.3), rr(0.3, 0.5)]];
    return { pts, fac, spk, gl, ph: rr(0, TAU) };
  }
  // cx：中心 x；fy：底（腳）y；W、H：冰殼大小；grow：由下往上長出來 0..1；a：整體透明度；crack 0..1：裂紋
  function drawShell(ctx, sh, cx, fy, W, H, t, grow, a, crack, dense) {
    if (a <= 0.01) return;
    const X = (u) => cx + u * W;
    const Y = (v) => fy - v * H;
    ctx.save();
    if (grow < 1) {
      ctx.beginPath();
      ctx.rect(cx - W * 2, fy - H * 1.4 * grow - 2, W * 4, H * 1.4 * grow + 40);
      ctx.clip();
    }
    const L = lite();
    ctx.globalCompositeOperation = 'source-over';
    // 往外長的晶簇（冰殼後面）
    for (const s of sh.spk) {
      const bx = X(s.u);
      const by = Y(s.v);
      const len = s.len * Math.max(W, H * 0.8);
      const wd = s.wd * Math.max(W, H * 0.8);
      const ca = Math.cos(s.a);
      const sa = Math.sin(s.a);
      const tx = bx + ca * len;
      const ty = by + sa * len;
      const nx = -sa * wd;
      const ny = ca * wd;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(bx + nx, by + ny);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx - nx, by - ny);
      ctx.closePath();
      ctx.fillStyle = 'rgba(170,222,255,0.62)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,60,100,0.6)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // 亮面
      ctx.beginPath();
      ctx.moveTo(bx + nx * 0.9, by + ny * 0.9);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx, by);
      ctx.closePath();
      ctx.fillStyle = 'rgba(240,252,255,0.55)';
      ctx.fill();
    }
    // 冰殼本體
    const path = () => {
      ctx.beginPath();
      const p = sh.pts;
      ctx.moveTo(X(p[0][0]), Y(p[0][1]));
      for (let i = 1; i < p.length; i++) ctx.lineTo(X(p[i][0]), Y(p[i][1]));
      ctx.closePath();
    };
    path();
    const g = ctx.createLinearGradient(0, fy - H, 0, fy);
    const dk = dense ? 1.45 : 1;
    g.addColorStop(0, 'rgba(225,248,255,' + (0.34 * dk).toFixed(3) + ')');
    g.addColorStop(0.5, 'rgba(160,220,255,' + (0.28 * dk).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(120,190,245,' + (0.42 * dk).toFixed(3) + ')');
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(28,54,96,0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(235,252,255,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 晶面的折線、流過去的反光（剪在冰殼裡）
    ctx.save();
    path();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const f of sh.fac) {
      ctx.moveTo(X(f[0]), Y(f[1]));
      ctx.lineTo(X(f[2]), Y(f[3]));
    }
    ctx.stroke();
    if (!L) {
      const sw = ((t * 0.45 + sh.ph) % 1.6) - 0.3;
      const sx = cx - W * 0.8 + sw * W * 1.6;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a * 0.35;
      ctx.fillStyle = 'rgba(220,245,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(sx, fy + 4);
      ctx.lineTo(sx + W * 0.14, fy + 4);
      ctx.lineTo(sx + W * 0.14 + H * 0.5, fy - H * 1.2);
      ctx.lineTo(sx + H * 0.5, fy - H * 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // 裂紋（快碎了）
    if (crack > 0) {
      ctx.globalAlpha = a * Math.min(1, crack * 1.4);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      const n = 2 + Math.floor(crack * 4);
      for (let i = 0; i < n; i++) {
        const a0 = sh.ph + i * 2.3;
        let x = cx + Math.cos(a0) * W * 0.1;
        let y = fy - H * 0.5 + Math.sin(a0) * H * 0.1;
        ctx.moveTo(x, y);
        for (let j = 0; j < 3; j++) {
          const d = a0 + Math.sin(i * 3.1 + j * 1.7) * 0.6;
          x += Math.cos(d) * W * 0.16 * crack;
          y += Math.sin(d) * H * 0.14 * crack;
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
    // 腳下的霜（白色的霜堆）
    ctx.globalAlpha = a;
    ctx.fillStyle = '#f4fbff';
    ctx.strokeStyle = 'rgba(60,100,150,0.5)';
    ctx.lineWidth = 1;
    const nb = L ? 4 : 7;
    ctx.beginPath();
    for (let i = 0; i < nb; i++) {
      const u = -0.62 + (i / (nb - 1)) * 1.24;
      const r = (0.06 + 0.035 * Math.sin(i * 2.7 + sh.ph)) * W + 2;
      ctx.moveTo(X(u) + r, fy + 1);
      ctx.arc(X(u), fy + 1, r, 0, PI, true);
    }
    ctx.fill();
    ctx.stroke();
    // 冰殼邊上的霜點
    if (!L) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const p = sh.pts;
      for (let i = 1; i < p.length - 1; i += 2) {
        ctx.beginPath();
        ctx.arc(X(p[i][0]) * 0.9 + cx * 0.1, Y(p[i][1]) * 0.94 + fy * 0.06, 1.6, 0, TAU);
        ctx.fill();
      }
    }
    // 閃光
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < sh.gl.length; i++) {
      const tw = Math.max(0, Math.sin(t * 3.4 + sh.ph + i * 2.6));
      if (tw <= 0.05) continue;
      const x = X(sh.gl[i][0]);
      const y = Y(sh.gl[i][1]);
      const s = 3 + 5 * tw;
      ctx.globalAlpha = a * tw;
      ctx.drawImage(FROST, x - s * 1.4, y - s * 1.4, s * 2.8, s * 2.8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - s, y - 0.7, s * 2, 1.4);
      ctx.fillRect(x - 0.7, y - s, 1.4, s * 2);
    }
    ctx.restore();
  }

  // ═══════════════════════ 極光風暴：怪物冰封 ═══════════════════════
  const IC = [];
  function hbOf(m) {
    if (m.hitbox) return m.hitbox();
    const sc = m.scale || 1;
    return { x: m.x - (m.w || 40) * sc * 0.5, y: m.y - (m.h || 40) * sc, w: (m.w || 40) * sc, h: (m.h || 40) * sc };
  }
  function iceAdd(m) {
    if (!m || m.dead || m.isBoss || m.fieldBoss || (m.def && m.def.boss)) return;
    for (const c of IC) {
      if (c.m === m) {
        c.hitT = 0;
        return;
      }
    }
    if (IC.length >= 16) return;
    const hb = hbOf(m);
    IC.push({ m, t: 0, hitT: 0, sh: makeShell(), w: hb.w, h: hb.h });
    // 凍住的一瞬間：一小團雪霧、幾點冰晶
    const cx = hb.x + hb.w / 2;
    const fy = hb.y + hb.h;
    for (let i = 0; i < (lite() ? 1 : 3); i++) shard(cx + rr(-0.5, 0.5) * hb.w, fy - rr(0, hb.h), rr(-40, 40), rr(-40, -10), rr(12, 20), rr(0.4, 0.6), fy, 1);
  }
  function iceOn(m) {
    if (!m || !IC.length) return false;
    for (const c of IC) if (c.m === m) return true;
    return false;
  }
  function iceStep(dt) {
    for (let i = IC.length - 1; i >= 0; i--) {
      const c = IC[i];
      c.t += dt;
      c.hitT += dt;
      const m = c.m;
      if (m.dead || !(m.slowT > 0) || c.t > 12) {
        // 冰碎掉
        const hb = hbOf(m);
        if (!m.dead || m.deadT < 0.3) burstIce(hb.x + hb.w / 2, hb.y + hb.h * 0.5, hb.w * 1.1, hb.h, hb.y + hb.h, 12);
        IC.splice(i, 1);
        if (!m.dead && G.audio && !c.quiet) G.audio.play('rockHit');
      }
    }
  }
  function iceDraw(ctx) {
    const t = G.time || 0;
    for (const c of IC) {
      const m = c.m;
      // 冰殼改用技能原本的冰凍畫法（js/art/skills3.js A.drawStatus），這裡不再另外畫一層
      if (m.frozenT > 0 || A.drawStatus) continue;
      const hb = hbOf(m);
      const W = hb.w * 1.16 + 14;
      const H = hb.h * 1.08 + 12;
      const grow = eOut(clamp(c.t / 0.2, 0, 1));
      const left = m.slowT;
      const crack = left < 0.5 ? 1 - left / 0.5 : 0;
      const a = left < 0.25 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 20)) : 1;
      drawShell(ctx, c.sh, hb.x + hb.w / 2, hb.y + hb.h + (m.hover ? 0 : 2), W, H, t, grow, a, crack);
    }
  }
  A.auroraIce = {
    // 這一波打中了 m（之後緩速期間都包在冰裡；Boss、野外魔王不包）
    add: iceAdd,
    // m 現在是不是包在冰裡（art/monsters.js：冰住的怪不做受擊壓扁、後仰）
    on: iceOn,
  };

  // ═══════════════════════ 霜靈：暴風雪的強風 ═══════════════════════
  // 預警：boss.gustLane = { x0, dir, len, h0, h1 }（地面上的風道：離 Boss 越遠越高一點）
  function laneTop(L, x) {
    const map = G.world.map;
    const dist = Math.abs(x - L.x0);
    return G.physics.groundY(map, clamp(x, 1, map.w - 1)) - (L.h0 + (L.h1 - L.h0) * clamp(dist / L.len, 0, 1));
  }
  function tele(ctx, b) {
    const L = b.gustLane;
    if (!L || b.dead) return;
    const prep = b.state === 'blizzardPrep';
    const gust = b.gust;
    if (!prep && !gust) return;
    const k = prep ? b.prog() : 1;
    const t = b.t;
    const gy = b.groundY();
    const x0 = L.x0;
    const dir = L.dir;
    const x1 = x0 + dir * L.len;
    const map = G.world.map;
    const xe = clamp(x1, 0, map.w);
    ctx.save();
    // 1) 風道：地面上一條藍色帶子（雪地很亮，所以用深一點的藍＋深色描邊，才看得清）
    const fade = gust ? clamp(1 - gust.t / 0.35, 0, 1) : 1;
    if (fade > 0) {
      const topAt = (x) => laneTop(L, x);
      const band = () => {
        ctx.beginPath();
        ctx.moveTo(x0, gy + 2);
        ctx.lineTo(x0, topAt(x0));
        ctx.lineTo(xe, topAt(xe));
        ctx.lineTo(xe, gy + 2);
        ctx.closePath();
      };
      const g = ctx.createLinearGradient(x0, 0, xe, 0);
      const base = (0.2 + 0.22 * k) * fade;
      g.addColorStop(0, 'rgba(40,130,225,' + (base * 1.25).toFixed(3) + ')');
      g.addColorStop(0.75, 'rgba(50,140,230,' + base.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(60,150,235,' + (base * 0.4).toFixed(3) + ')');
      band();
      ctx.fillStyle = g;
      ctx.fill();
      // 帶子裡往外流的斜紋
      ctx.save();
      band();
      ctx.clip();
      ctx.globalAlpha = fade * (0.18 + 0.2 * k);
      ctx.strokeStyle = '#e6f6ff';
      ctx.lineWidth = 7;
      const sp = 46;
      const o = ((t * 200) % sp) * dir;
      const hh = L.h1 + 10;
      ctx.beginPath();
      for (let d = -sp; d < L.len + sp; d += sp) {
        const x = x0 + dir * d + o;
        ctx.moveTo(x, gy + 4);
        ctx.lineTo(x - dir * hh * 0.6, gy - hh);
      }
      ctx.stroke();
      ctx.restore();
      // 上緣：深色描邊＋亮青色虛線，快吹的時候閃
      const blink = k > 0.7 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 16)) : 0.9;
      ctx.globalAlpha = fade * blink;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(16,44,86,0.75)';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(x0, topAt(x0));
      ctx.lineTo(xe, topAt(xe));
      ctx.stroke();
      ctx.setLineDash([16, 10]);
      ctx.lineDashOffset = t * 120 * dir;
      ctx.strokeStyle = '#bff2ff';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.setLineDash([]);
      // 地面亮線
      ctx.globalAlpha = fade * (0.6 + 0.4 * k);
      ctx.strokeStyle = 'rgba(16,44,86,0.7)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x0, gy - 1);
      ctx.lineTo(xe, gy - 1);
      ctx.stroke();
      ctx.strokeStyle = '#7fd4ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // 風向箭頭：一排往外流的 >>>（深色描邊）
      if (prep) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const step = 130;
        const off = (t * 280) % step;
        for (let d = 70 + off; d < L.len - 30; d += step) {
          const x = x0 + dir * d;
          if (x < 20 || x > map.w - 20) continue;
          const yy = G.physics.groundY(map, x) - L.h0 * 0.5;
          const s = 18 + 8 * k;
          ctx.globalAlpha = fade * (0.55 + 0.45 * k) * (1 - 0.6 * (d / L.len));
          ctx.beginPath();
          ctx.moveTo(x - dir * s, yy - s);
          ctx.lineTo(x, yy);
          ctx.lineTo(x - dir * s, yy + s);
          ctx.strokeStyle = 'rgba(16,44,86,0.85)';
          ctx.lineWidth = 8;
          ctx.stroke();
          ctx.strokeStyle = '#f4fcff';
          ctx.lineWidth = 3.6;
          ctx.stroke();
        }
        // 風道裡的風絲
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        const nL = lite() ? 5 : 11;
        for (let i = 0; i < nL; i++) {
          const ph = (t * (0.9 + (i % 3) * 0.25) + i * 0.37) % 1;
          const d = ph * L.len;
          const x = x0 + dir * d;
          const hh2 = L.h0 * (0.15 + 0.7 * ((i * 0.618) % 1));
          const yy = gy - hh2;
          ctx.globalAlpha = fade * k * 0.7 * Math.sin(ph * PI);
          ctx.beginPath();
          ctx.moveTo(x - dir * 44, yy);
          ctx.quadraticCurveTo(x - dir * 20, yy - 5, x, yy);
          ctx.stroke();
        }
      }
    }
    // 2) 鹿角上的鐘在搖：一圈圈往外的音環；雪往鐘捲進去
    if (prep) {
      const bx = b.x + b.dir * 20;
      const by = b.y - b.h * 0.95;
      for (let i = 0; i < 3; i++) {
        const ph = (t * 2.4 + i / 3) % 1;
        const r = 26 + ph * 120;
        ctx.globalAlpha = (1 - ph) * (0.45 + 0.5 * k);
        ctx.beginPath();
        ctx.ellipse(bx, by, r, r * 0.7, 0, 0, TAU);
        ctx.strokeStyle = 'rgba(30,80,140,0.55)';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = '#f0fbff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      const n = lite() ? 14 : 30;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(40,90,150,0.55)';
      ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.85 + i / n) % 1;
        const r = 340 * (1 - ph) + 20;
        const an = i * 2.39996 + ph * 4.2;
        const x = bx + Math.cos(an) * r;
        const y = by + Math.sin(an) * r * 0.55;
        ctx.globalAlpha = Math.min(1, ph * 2.2) * (0.55 + 0.45 * k);
        ctx.beginPath();
        ctx.ellipse(x, y, 3 + (i % 3), 2 + (i % 2), an + PI / 2, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 吹出去的強風（front 層）
  const GU = [];
  function blast(x0, gy, dir, len, h0) {
    GU.push({ x0, gy, dir, len, h0, t: 0, streaks: Array.from({ length: lite() ? 7 : 16 }, () => ({ v: rr(0.05, 0.95), sp: rr(0.8, 1.25), l: rr(80, 190) })) });
    for (let i = 0; i < (lite() ? 4 : 10); i++) shard(x0 + dir * rr(40, 200), gy - rr(10, h0), dir * rr(300, 700), rr(-60, 20), rr(14, 26), rr(0.5, 0.8), gy, 1);
  }
  function stepGust(dt) {
    for (let i = GU.length - 1; i >= 0; i--) {
      GU[i].t += dt;
      if (GU[i].t > 0.9) GU.splice(i, 1);
    }
  }
  function drawGust(ctx) {
    for (const g of GU) {
      const front = g.t * GUST_SPEED;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      for (const s of g.streaks) {
        const d = front * s.sp - s.v * 120;
        if (d < 0 || d > g.len) continue;
        const x = g.x0 + g.dir * d;
        const y = g.gy - s.v * g.h0 * 1.1;
        const a = clamp(1 - g.t / 0.9, 0, 1) * (1 - d / g.len * 0.6);
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 + 2 * (1 - s.v);
        ctx.beginPath();
        ctx.moveTo(x - g.dir * s.l, y + 4);
        ctx.quadraticCurveTo(x - g.dir * s.l * 0.4, y - 6, x, y);
        ctx.stroke();
      }
    }
  }
  const GUST_SPEED = 1900;

  // 冰塊裡的玩家
  let IB = null;
  function freeze(P, dur) {
    IB = { P, t: 0, dur, sh: makeShell(), px: P.x, py: P.y, trail: 0, crack: 0, landed: false };
    shard(P.x, P.y - 40, 0, -20, 30, 0.5, P.y, 1);
  }
  function crackIce(n) {
    if (IB) IB.crack = clamp(n, 0, 1);
  }
  function landIce(x, y, hard) {
    const n = lite() ? 3 : 7;
    for (let i = 0; i < n; i++) shard(x + rr(-30, 30), y - rr(0, 10), rr(-160, 160), rr(-120, -30), rr(14, 24), rr(0.4, 0.7), y, 1);
    if (hard) for (let i = 0; i < (lite() ? 3 : 7); i++) shard(x + rr(-20, 20), y - rr(10, 60), rr(-200, 200), rr(-380, -120), rr(2.5, 5), rr(0.4, 0.7), y, 0);
  }
  function shatter(x, y) {
    if (!IB) return;
    IB = null;
    burstIce(x, y - 36, 64, 76, y, 18);
  }
  function stepIB(dt) {
    if (!IB) return;
    const P = IB.P;
    IB.t += dt;
    if (IB.t > IB.dur + 0.4 || P !== G.player || P.dead) {
      IB = null;
      return;
    }
    // 飛行中拖著雪霧；貼地滑行時噴雪
    const vx = (P.x - IB.px) / Math.max(dt, 1e-4);
    IB.px = P.x;
    IB.py = P.y;
    IB.trail -= dt;
    if (IB.trail <= 0 && Math.abs(vx) > 60) {
      IB.trail = lite() ? 0.07 : 0.03;
      const d = Math.sign(vx);
      shard(P.x - d * 30, P.y - rr(10, 60), -d * rr(20, 80), rr(-30, 10), rr(12, 20), rr(0.35, 0.6), P.y, 1);
      if (P.onGround) shard(P.x - d * 26, P.y - 2, -d * rr(80, 220), rr(-160, -60), rr(2, 4), rr(0.3, 0.5), P.y, 0);
    }
  }
  function drawIB(ctx) {
    if (!IB) return;
    const P = IB.P;
    const t = G.time || 0;
    const grow = eOut(clamp(IB.t / 0.12, 0, 1));
    // 冰塊稍微歪著晃（被吹著走）
    const shake = IB.crack > 0 ? Math.sin(t * 60) * 1.5 * IB.crack : 0;
    ctx.save();
    ctx.translate(P.x + shake, P.y);
    ctx.rotate(Math.sin(IB.t * 9) * 0.05);
    // 淡淡的藍（冰塊的顏色蓋在小獅子身上）
    drawShell(ctx, IB.sh, 0, 2, 104, 112, t, grow, 1, IB.crack, true);
    ctx.restore();
  }

  A.frostGust = {
    // 預警（boss3.js 的 FrostSpirit.draw 在 blizzardPrep 期間呼叫）
    tele,
    // 強風吹出去（x0 起點、gy 地面、dir 方向、len 長度、h0 風道高度）
    blast,
    // 玩家被凍住（dur：最長冰凍秒數）
    freeze,
    // 猛按方向鍵：冰塊裂開的程度 0..1
    crack: crackIce,
    // 落地（hard：撞到場地邊緣）
    land: landIce,
    // 冰塊碎掉
    shatter,
    SPEED: GUST_SPEED,
  };

  // ═══════════════════════ 時間：快轉的時針、野外魔王殘影 ═══════════════════════
  const HMUL = [1, 1.4, 1.9, 0.75];
  function handBlur(ctx, m, A4, lens, hide) {
    const v = m.handV || 0;
    const st = m.state;
    if (Math.abs(v) < 2 || st === 'stop' || st === 'stopPrep') return;
    const sp = clamp(Math.abs(v) / 17, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      if (i === hide || (st === 'stab' && i === 0) || (st === 'sweepPrep' && i === 1)) continue;
      const a = A4[i];
      const da = clamp(-v * HMUL[i] * 0.075, -1.5, 1.5);
      const L = lens[i] * 0.96;
      const g = ctx.createRadialGradient(0, 0, 20, 0, 0, L);
      g.addColorStop(0, 'rgba(200,176,255,0)');
      g.addColorStop(0.6, 'rgba(210,190,255,' + (0.1 * sp).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,236,170,' + (0.28 * sp).toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, L, a + da, a, da > 0);
      ctx.closePath();
      ctx.fill();
      // 針尖劃過的亮弧
      ctx.globalAlpha = 0.55 * sp;
      ctx.strokeStyle = '#fff3c0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, L, a + da * 0.8, a, da > 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  A.timeHands = {
    // 四根針各自的轉速倍率（時、分、秒、命運）
    MUL: HMUL,
    blur: handBlur,
  };
  // 野外魔王殘影：腳下一圈錶盤光＋剩下時間的金色弧；最後 3 秒冒星沙
  let sandT = 0;
  function echoMarks(ctx, dt) {
    const W = G.world;
    if (!W || !W.boss || W.boss.id !== 'timeItself') return;
    const t = G.time || 0;
    for (const m of W.monsters) {
      if (m.dead || m.sumLife == null) continue;
      const hb = hbOf(m);
      const cx = hb.x + hb.w / 2;
      const fy = m.y;
      const r = Math.max(60, hb.w * 0.55);
      const k = clamp(m.sumLife / (m.sumLife0 || 15), 0, 1);
      const last = m.sumLife < 3;
      ctx.save();
      ctx.translate(cx, fy);
      ctx.scale(1, 0.24);
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#c8b0ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = last ? 0.6 + 0.4 * Math.abs(Math.sin(t * 10)) : 0.9;
      ctx.strokeStyle = last ? '#ffffff' : '#ffe38a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, r, -PI / 2, -PI / 2 + TAU * k);
      ctx.stroke();
      ctx.restore();
    }
  }
  function echoSand(dt) {
    const W = G.world;
    if (!W || !W.boss || W.boss.id !== 'timeItself') return;
    sandT -= dt;
    if (sandT > 0) return;
    sandT = lite() ? 0.12 : 0.05;
    for (const m of W.monsters) {
      if (m.dead || m.sumLife == null || m.sumLife >= 3) continue;
      const hb = hbOf(m);
      shard(hb.x + rr(0, 1) * hb.w, hb.y + rr(0.2, 1) * hb.h, rr(-20, 20), rr(-120, -50), rr(2.5, 4.5), rr(0.5, 0.9), 1e9, 2);
    }
  }
  const hasEcho = () => !!(G.world && G.world.boss && G.world.boss.id === 'timeItself' && G.world.monsters.some((m) => !m.dead && m.sumLife != null));

  A.skillFx.add({
    live: () => IC.length > 0 || shN > 0 || GU.length > 0 || !!IB || hasEcho(),
    step(dt) {
      iceStep(dt);
      stepShards(dt);
      stepGust(dt);
      stepIB(dt);
      echoSand(dt);
    },
    front(ctx) {
      echoMarks(ctx);
      if (IC.length) iceDraw(ctx);
      if (GU.length) drawGust(ctx);
      if (IB) drawIB(ctx);
      drawShards(ctx);
    },
    clear() {
      IC.length = 0;
      GU.length = 0;
      IB = null;
      for (const q of SH) q.on = false;
      shN = 0;
    },
  });
})();
