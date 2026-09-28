// 衝鋒撞擊（力量二轉）的特效「三劍隨行」：起跑瞬間三把鋼金色的幻影巨劍在身前亮起（上前、正前、下前排成矛頭），
// 衝刺時劍陣貼在獅子前方一起往前衝（各自錯拍微微浮動、拖出細亮的氣流尾跡，身後少量速度線）；
// 撞到敵人時三把劍依序刺穿過去，留下三道交叉的斬痕（白芯金邊）、一圈小撞擊環和幾顆鋼火花；
// 衝刺結束時三把劍轉一圈，碎成光點消失。純視覺，數值不變。
// 由 js/game/player.js（衝鋒開始）與 js/game/combat.js（每撞到一隻）呼叫 A.chargeFx.start()／hit()。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const OUTC = '#4a2e1f';
  const lite = () => !!G.lowFx;
  const R = (a, b) => a + (b - a) * Math.random();
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const eOut = (k) => 1 - (1 - k) * (1 - k);
  const eInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
  const lerpA = (a, b, k) => {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return a + d * k;
  };

  // ── 劍的圖（預先畫進離屏畫布；原點＝劍的中心，+x 指向劍尖） ──
  // 範圍 x -46..50、y -18..18，2 倍解析度
  const SW = 96;
  const SH = 36;
  const OX = 46;
  const OY = 18;
  const K = 2;
  function mkCanvas() {
    const c = document.createElement('canvas');
    c.width = SW * K;
    c.height = SH * K;
    const x = c.getContext('2d');
    x.scale(K, K);
    x.translate(OX, OY);
    return [c, x];
  }
  function bladePath(c) {
    c.beginPath();
    c.moveTo(-12, -6.4);
    c.lineTo(31, -5.6);
    c.lineTo(46, 0);
    c.lineTo(31, 5.6);
    c.lineTo(-12, 6.4);
    c.closePath();
  }
  function guardPath(c) {
    c.beginPath();
    c.moveTo(-18, -12);
    c.quadraticCurveTo(-19, -17, -14.5, -16.5);
    c.quadraticCurveTo(-10, -16, -11, -12);
    c.lineTo(-11, 12);
    c.quadraticCurveTo(-10, 16, -14.5, 16.5);
    c.quadraticCurveTo(-19, 17, -18, 12);
    c.closePath();
  }
  function drawSword(c) {
    c.lineJoin = 'round';
    c.lineCap = 'round';
    // 握柄（纏繩）
    c.fillStyle = '#6b3f22';
    c.fillRect(-36, -3.3, 18, 6.6);
    c.strokeStyle = '#c08a55';
    c.lineWidth = 1.3;
    for (let x = -34; x < -18; x += 4) {
      c.beginPath();
      c.moveTo(x, 3.2);
      c.lineTo(x + 2.6, -3.2);
      c.stroke();
    }
    c.strokeStyle = OUTC;
    c.lineWidth = 1.6;
    c.strokeRect(-36, -3.3, 18, 6.6);
    // 柄頭
    c.beginPath();
    c.arc(-39.5, 0, 4.4, 0, TAU);
    c.fillStyle = '#f2c14e';
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(-40.5, -1.2, 1.5, 0, TAU);
    c.fillStyle = '#fff1c0';
    c.fill();
    // 劍身：上半亮、下半暗的鋼色
    bladePath(c);
    c.fillStyle = '#b9c5d6';
    c.fill();
    c.beginPath();
    c.moveTo(-12, -6.4);
    c.lineTo(31, -5.6);
    c.lineTo(46, 0);
    c.lineTo(-12, 0);
    c.closePath();
    c.fillStyle = '#eef3fa';
    c.fill();
    // 血槽
    c.strokeStyle = '#7d8aa0';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(-9, 0.4);
    c.lineTo(25, 0.4);
    c.stroke();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-9, -1.6);
    c.lineTo(25, -1.6);
    c.stroke();
    // 刃口的金色細線
    c.strokeStyle = 'rgba(255,205,110,0.9)';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-10, 5.2);
    c.lineTo(31, 4.5);
    c.lineTo(43.5, 0);
    c.stroke();
    bladePath(c);
    c.strokeStyle = OUTC;
    c.lineWidth = 1.9;
    c.stroke();
    // 金色護手＋琥珀寶石
    guardPath(c);
    c.fillStyle = '#f2c14e';
    c.fill();
    c.save();
    guardPath(c);
    c.clip();
    c.fillStyle = '#c98e2a';
    c.fillRect(-20, 4, 12, 14);
    c.fillStyle = '#fff0b8';
    c.fillRect(-17.5, -15, 2, 12);
    c.restore();
    guardPath(c);
    c.strokeStyle = OUTC;
    c.lineWidth = 1.7;
    c.stroke();
    c.beginPath();
    c.arc(-14.5, 0, 2.8, 0, TAU);
    c.fillStyle = '#ff9a3c';
    c.fill();
    c.lineWidth = 1.2;
    c.stroke();
  }
  // 劍的剪影（上色後當光暈／閃白用）
  function silhouette(src, color) {
    const [c, x] = mkCanvas();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  let SPR = null;
  let HALO = null;
  let WHITE = null;
  function sprites() {
    if (SPR) return;
    const [c, x] = mkCanvas();
    drawSword(x);
    SPR = c;
    HALO = silhouette(c, '#ffc860');
    WHITE = silhouette(c, '#fffaf0');
  }

  // ── 粒子池（不在畫的時候產生新物件） ──
  // k: 1 鋼火花 3 速度線 5 光點
  const N = 120;
  const PS = [];
  for (let i = 0; i < N; i++) PS.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, g: 0, dr: 0, c: 0 });
  let live = 0;
  let pi = 0;
  function spawn(k, x, y, vx, vy, life, s) {
    for (let j = 0; j < N; j++) {
      const q = PS[(pi + j) % N];
      if (q.on) continue;
      pi = (pi + j + 1) % N;
      live++;
      q.on = true;
      q.k = k;
      q.x = x;
      q.y = y;
      q.vx = vx;
      q.vy = vy;
      q.t = 0;
      q.life = life;
      q.s = s;
      q.g = 0;
      q.dr = 0;
      q.c = (Math.random() * 3) | 0;
      return q;
    }
    return null;
  }

  // ── 三把劍 ──
  // fx／fy：相對身體中心的位置（fx 往前為正）；tilt：劍尖朝下為正；cut：刺穿時的斬痕角度（相對前方）；cy：斬痕中心的高低（× 怪物身高）
  const NT = 10;
  const SWORDS = [
    { fx: 60, fy: -46, tilt: 0.1, sc: 0.96, ph: 0, cut: 0.62, cy: -0.16 },
    { fx: 84, fy: -4, tilt: 0, sc: 1.14, ph: 2.1, cut: -0.06, cy: 0 },
    { fx: 60, fy: 24, tilt: -0.1, sc: 0.96, ph: 4.2, cut: -0.62, cy: 0.14 },
  ].map((s) => Object.assign(s, { x: 0, y: 0, a: 0, sx: 0, sy: 0, sa: 0, st: null, nx: null, tr: new Float32Array(NT * 3), tn: 0, th: 0 }));
  const ST_T = 0.24; // 一次刺擊的總時間
  const SPIN = 0.22; // 結束時轉一圈的時間
  const FADE = 0.09; // 轉完之後碎掉的時間
  const C = { on: false, t: 0, dir: 1, end: -1, emitT: 0, shattered: false };
  // 斬痕與撞擊環：{ k: 0 斬痕 1 環, x, y, a, len, t }
  const CUTS = [];

  function P() {
    return G.player;
  }
  function dashing() {
    const pl = P();
    const a = pl && pl.action;
    return !!(a && a.type === 'dash' && a.id === 'chargeSlam');
  }
  function bodyC(pl) {
    return [pl.x, pl.y - (pl.h || 58) * 0.5];
  }
  // 劍在陣形裡的位置（世界座標）
  function slot(s, pl, d, t) {
    const [cx, cy] = bodyC(pl);
    s.sx = cx + d * s.fx;
    s.sy = cy + s.fy + Math.sin(t * 13 + s.ph) * 2.6;
    s.sa = d > 0 ? s.tilt : Math.PI - s.tilt;
  }

  function start(pl, S) {
    sprites();
    C.on = true;
    C.t = 0;
    C.dir = pl.dir;
    C.end = -1;
    C.emitT = 0;
    C.shattered = false;
    for (const s of SWORDS) {
      slot(s, pl, pl.dir, 0);
      s.x = s.sx;
      s.y = s.sy;
      s.a = s.sa;
      s.st = null;
      s.nx = null;
      s.tn = 0;
      s.th = 0;
    }
  }

  function hit(m, dir) {
    if (!m || !C.on) return;
    const sc = m.scale || 1;
    const hh = (m.h || 40) * sc;
    const tx = m.x - dir * Math.min(10, (m.w || 40) * sc * 0.2);
    const ty = m.y - (m.hover || 0) - hh * 0.5;
    const L = Math.max(34, Math.min(62, hh * 0.9 + 12));
    SWORDS.forEach((s, i) => {
      const a = dir > 0 ? s.cut : Math.PI - s.cut;
      const st = { t: -i * 0.055, tx, ty: ty + s.cy * hh, a, L, cut: false, ox: 0, oy: 0, oa: 0 };
      if (s.st && s.st.t < ST_T) s.nx = st;
      else s.st = st;
    });
    CUTS.push({ k: 1, x: tx, y: ty, a: 0, len: 0, t: -0.06 });
    while (CUTS.length > 24) CUTS.shift();
  }

  // 刺擊：0～0.2 移到斬痕起點、0.2～0.5 沿斬痕刺穿、0.5～1 回到陣形
  function strikePose(s, st) {
    const k = st.t / ST_T;
    const ux = Math.cos(st.a);
    const uy = Math.sin(st.a);
    const x0 = st.tx - ux * st.L;
    const y0 = st.ty - uy * st.L;
    const x1 = st.tx + ux * st.L * 0.9;
    const y1 = st.ty + uy * st.L * 0.9;
    if (k < 0.2) {
      const e = eOut(k / 0.2);
      s.x = st.ox + (x0 - st.ox) * e;
      s.y = st.oy + (y0 - st.oy) * e;
      s.a = lerpA(st.oa, st.a, e);
    } else if (k < 0.5) {
      const e = eOut((k - 0.2) / 0.3);
      s.x = x0 + (x1 - x0) * e;
      s.y = y0 + (y1 - y0) * e;
      s.a = st.a;
    } else {
      const e = eInOut((k - 0.5) / 0.5);
      s.x = x1 + (s.sx - x1) * e;
      s.y = y1 + (s.sy - y1) * e;
      s.a = lerpA(st.a, s.sa, e);
    }
  }

  function step(dt) {
    const pl = P();
    if (C.on && pl) {
      C.t += dt;
      const on = dashing();
      if (!on && C.end < 0) C.end = C.t;
      if (on) C.dir = pl.dir;
      const d = C.dir;
      const te = C.end < 0 ? 0 : C.t - C.end;
      // 結束：轉一圈 → 碎成光點
      if (C.end >= 0 && te >= SPIN && !C.shattered) {
        C.shattered = true;
        const n = lite() ? 3 : 7;
        for (const s of SWORDS) {
          const ux = Math.cos(s.a);
          const uy = Math.sin(s.a);
          for (let i = 0; i < n; i++) {
            const f = R(-38, 44) * s.sc;
            const q = spawn(5, s.x + ux * f, s.y + uy * f, R(-70, 70) + d * 40, R(-90, 30), R(0.35, 0.6), R(1.6, 3));
            if (q) {
              q.g = -40;
              q.dr = 3;
            }
          }
        }
      }
      for (const s of SWORDS) {
        slot(s, pl, d, C.t);
        let base = true;
        if (s.st) {
          const st = s.st;
          if (st.t <= 0 && st.t + dt > 0) {
            st.ox = s.x;
            st.oy = s.y;
            st.oa = s.a;
          }
          st.t += dt;
          if (st.t > 0) {
            if (!st.cut && st.t >= ST_T * 0.2) {
              st.cut = true;
              CUTS.push({ k: 0, x: st.tx, y: st.ty, a: st.a, len: st.L, t: 0 });
              const ns = lite() ? 2 : 4;
              for (let i = 0; i < ns; i++) {
                const aa = st.a + R(-0.9, 0.9);
                const sp = R(220, 420);
                const q = spawn(1, st.tx, st.ty, Math.cos(aa) * sp, Math.sin(aa) * sp - 60, R(0.14, 0.26), R(1.4, 2.3));
                if (q) q.g = 700;
              }
            }
            if (st.t >= ST_T) {
              s.st = s.nx;
              s.nx = null;
            } else {
              strikePose(s, st);
              base = false;
            }
          }
        }
        if (base) {
          // 平常：很快地追上陣形位置（衝刺時幾乎貼死）
          const f = 1 - Math.exp(-dt * 40);
          s.x += (s.sx - s.x) * f;
          s.y += (s.sy - s.y) * f;
          s.a = lerpA(s.a, s.sa, f);
        }
        // 尾跡：記錄護手的位置
        const j = s.th * 3;
        s.tr[j] = s.x - Math.cos(s.a) * 12 * s.sc;
        s.tr[j + 1] = s.y - Math.sin(s.a) * 12 * s.sc;
        s.tr[j + 2] = C.t;
        s.th = (s.th + 1) % NT;
        if (s.tn < NT) s.tn++;
      }
      // 身後的淡速度線
      if (on) {
        C.emitT -= dt;
        if (C.emitT <= 0) {
          C.emitT = lite() ? 0.06 : 0.03;
          const h = pl.h || 58;
          const cy = bodyC(pl)[1];
          spawn(3, pl.x - d * R(20, 50), cy + R(-h * 0.5, h * 0.45), -d * R(40, 110), 0, R(0.12, 0.2), R(36, 80));
        }
      }
      if (C.shattered && te >= SPIN + FADE + 0.05) C.on = false;
    }
    for (let i = CUTS.length - 1; i >= 0; i--) {
      CUTS[i].t += dt;
      if (CUTS[i].t > 0.34) CUTS.splice(i, 1);
    }
    if (live) {
      for (const q of PS) {
        if (!q.on) continue;
        q.t += dt;
        if (q.t >= q.life) {
          q.on = false;
          live--;
          continue;
        }
        if (q.k === 3 || q.dr) {
          const dr = Math.max(0, 1 - (q.dr || 3) * dt);
          q.vx *= dr;
          q.vy *= dr;
        }
        q.vy += q.g * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
    }
  }

  // 劍整體的透明度（出現 0.08 秒淡入、結束時轉完再淡掉）
  function swordAlpha() {
    if (!C.on) return 0;
    const a0 = clamp01(C.t / 0.08);
    if (C.end < 0) return a0;
    const te = C.t - C.end;
    if (te < SPIN) return a0;
    return a0 * clamp01(1 - (te - SPIN) / FADE);
  }

  function back(ctx) {
    if (C.on) {
      const al = swordAlpha();
      // 劍的氣流尾跡（細、亮、越後面越細越淡）
      if (al > 0.02) {
        const maxAge = lite() ? 0.06 : 0.1;
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (const s of SWORDS) {
          let px = s.x - Math.cos(s.a) * 12 * s.sc;
          let py = s.y - Math.sin(s.a) * 12 * s.sc;
          for (let i = 1; i < s.tn; i++) {
            const j = ((s.th - 1 - i + NT * 2) % NT) * 3;
            const age = C.t - s.tr[j + 2];
            if (age > maxAge) break;
            const x = s.tr[j];
            const y = s.tr[j + 1];
            const f = 1 - age / maxAge;
            ctx.globalAlpha = al * f * 0.55;
            ctx.strokeStyle = '#ffb84a';
            ctx.lineWidth = 5 * f * s.sc + 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.globalAlpha = al * f;
            ctx.strokeStyle = '#fff6dc';
            ctx.lineWidth = 1.8 * f * s.sc + 0.6;
            ctx.stroke();
            px = x;
            py = y;
          }
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }
    if (!live) return;
    // 速度線（在角色後面）
    ctx.lineCap = 'round';
    for (const q of PS) {
      if (!q.on || q.k !== 3) continue;
      const k = q.t / q.life;
      const dx = q.vx < 0 ? 1 : -1;
      const x1 = q.x - dx * q.s * (1 - k * 0.5);
      ctx.globalAlpha = 0.3 * (1 - k);
      ctx.strokeStyle = OUTC;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(x1, q.y);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * (1 - k);
      ctx.strokeStyle = '#f4f7ff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 四角閃光
  function glint(ctx, x, y, r, a) {
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.fill();
  }

  function drawSwords(ctx) {
    const al = swordAlpha();
    if (al <= 0.01 || !SPR) return;
    const t = C.t;
    const te = C.end < 0 ? -1 : t - C.end;
    const appear = clamp01(t / 0.12);
    const spinK = te < 0 ? 0 : clamp01(te / SPIN);
    const fadeK = te < SPIN ? 0 : clamp01((te - SPIN) / FADE);
    const d = C.dir;
    SWORDS.forEach((s, i) => {
      // 出現：從稍後方、小一點滑進位置；結束：原地轉一圈、碎掉前微微膨脹
      const ap = eOut(clamp01((t - i * 0.02) / 0.1));
      const sc = s.sc * (0.7 + 0.3 * ap) * (1 + fadeK * 0.15);
      const a = s.a + d * TAU * eInOut(spinK);
      const x = s.x - d * (1 - ap) * 22;
      ctx.save();
      ctx.translate(x, s.y);
      ctx.rotate(a);
      ctx.scale(sc, sc);
      // 幻影光暈
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = al * (lite() ? 0.3 : 0.4);
      ctx.drawImage(HALO, -OX * 1.12, -OY * 1.3, SW * 1.12, SH * 1.3);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = al * 0.94;
      ctx.drawImage(SPR, -OX, -OY, SW, SH);
      // 出現時與碎掉前的閃白
      const wf = Math.max(1 - appear, fadeK);
      if (wf > 0.02) {
        ctx.globalAlpha = al * wf * 0.9;
        ctx.drawImage(WHITE, -OX, -OY, SW, SH);
      }
      ctx.restore();
      // 出現時沿著劍身滑過去的一顆閃光
      if (appear < 1) {
        const f = -30 + eOut(appear) * 76;
        const gx = x + Math.cos(a) * f * sc;
        const gy = s.y + Math.sin(a) * f * sc;
        glint(ctx, gx, gy, 9 + 7 * Math.sin(appear * Math.PI), al * (1 - appear * 0.6));
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawCuts(ctx) {
    for (const c of CUTS) {
      if (c.t <= 0) continue;
      if (c.k === 1) {
        // 小撞擊環
        const k = clamp01(c.t / 0.26);
        if (k >= 1) continue;
        const r = 10 + eOut(k) * 34;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, r * 0.7, r, 0, 0, TAU);
        ctx.strokeStyle = OUTC;
        ctx.lineWidth = 4 * (1 - k) + 1.2;
        ctx.stroke();
        ctx.strokeStyle = '#ffe6a8';
        ctx.lineWidth = 2.4 * (1 - k) + 0.6;
        ctx.stroke();
        continue;
      }
      // 斬痕：0.05 秒內從起點劃到終點，之後變細淡出
      const grow = eOut(clamp01(c.t / 0.05));
      const fade = clamp01((c.t - 0.08) / 0.22);
      if (fade >= 1) continue;
      const ux = Math.cos(c.a);
      const uy = Math.sin(c.a);
      const L = c.len * 1.15;
      const x0 = c.x - ux * L;
      const y0 = c.y - uy * L;
      const x1 = x0 + ux * L * 2 * grow;
      const y1 = y0 + uy * L * 2 * grow;
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      const w = (5.5 * (1 - fade) + 0.8) * (0.6 + 0.4 * grow);
      const lens = (ww) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(mx - uy * ww, my + ux * ww, x1, y1);
        ctx.quadraticCurveTo(mx + uy * ww, my - ux * ww, x0, y0);
        ctx.closePath();
      };
      ctx.globalAlpha = 1 - fade * fade;
      lens(w * 1.9);
      ctx.fillStyle = '#ffb437';
      ctx.fill();
      ctx.strokeStyle = 'rgba(74,46,31,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      lens(w * 0.8);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function front(ctx) {
    drawSwords(ctx);
    drawCuts(ctx);
    if (!live) return;
    ctx.lineCap = 'round';
    for (const q of PS) {
      if (!q.on) continue;
      const k = q.t / q.life;
      if (q.k === 1) {
        // 鋼火花
        const sp = Math.hypot(q.vx, q.vy) || 1;
        const l = Math.min(12, sp * 0.026);
        ctx.globalAlpha = 1 - k * k;
        ctx.strokeStyle = k < 0.35 ? '#ffffff' : q.c ? '#dfe8f5' : '#ffc24a';
        ctx.lineWidth = q.s;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - (q.vx / sp) * l, q.y - (q.vy / sp) * l);
        ctx.stroke();
      } else if (q.k === 5) {
        // 碎成的光點
        const a = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = '#ffb84a';
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.s * 2.2, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = a;
        ctx.fillStyle = q.c ? '#fff6dc' : '#ffe08a';
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.s * (1 - k * 0.5), 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
  }

  A.chargeFx = { start, hit };
  if (A.skillFx) {
    A.skillFx.add({
      live: () => C.on || CUTS.length > 0 || live > 0,
      step,
      back,
      front,
      clear() {
        C.on = false;
        CUTS.length = 0;
        for (const s of SWORDS) {
          s.st = null;
          s.nx = null;
          s.tn = 0;
        }
        for (const q of PS) q.on = false;
        live = 0;
      },
    });
  }
})();
