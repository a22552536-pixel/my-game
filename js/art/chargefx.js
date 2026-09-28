// 衝鋒撞擊（力量二轉）的特效：起跑時腳後的踢土、衝刺時身前一道角狀的「氣勁盾」（空氣＋碎土擠成的楔形）、
// 身後的速度線、貼地刮出的火花和塵土、地上的刮痕；撞到敵人時在那一點炸開震波環、碎石、局部小閃光，
// 被撞飛的敵人頭上冒一顆撞擊星。純視覺，數值不變。
// 由 js/game/player.js（衝鋒開始）與 js/game/combat.js（每撞到一隻）呼叫 A.chargeFx.start()／hit()。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const OUTC = '#4a2e1f';
  const lite = () => !!G.lowFx;
  const R = (a, b) => a + (b - a) * Math.random();

  // ── 粒子池（不在畫的時候產生新物件） ──
  // k: 0 塵土團 1 火花 2 碎石 3 速度線 4 小土塊
  const N = 140;
  const PS = [];
  for (let i = 0; i < N; i++) PS.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, rot: 0, vr: 0, g: 0, floor: 1e9, c: 0, pts: null });
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
      q.rot = Math.random() * TAU;
      q.vr = R(-10, 10);
      q.g = 0;
      q.floor = 1e9;
      q.c = (Math.random() * 3) | 0;
      if (k === 2 && !q.pts) {
        q.pts = [];
        const n = 5 + ((Math.random() * 2) | 0);
        for (let m = 0; m < n; m++) {
          const aa = (m / n) * TAU;
          const r = 0.7 + Math.random() * 0.5;
          q.pts.push(Math.cos(aa) * r, Math.sin(aa) * r);
        }
      }
      return q;
    }
    return null;
  }

  // 目前這一次衝鋒（同時只會有一次）
  const C = { on: false, t: 0, dur: 0.35, dir: 1, trail: [], trailT: 0, end: -1, emitT: 0, lastGx: 0 };
  // 命中：震波環＋閃光＋撞擊星
  const H = [];

  function P() {
    return G.player;
  }
  function dashing() {
    const a = P().action;
    return !!(a && a.type === 'dash' && a.id === 'chargeSlam');
  }

  function start(pl, S) {
    C.on = true;
    C.t = 0;
    C.dur = (S && S.dashTime) || 0.35;
    C.dir = pl.dir;
    C.trail.length = 0;
    C.end = -1;
    C.emitT = 0;
    C.lastGx = pl.x;
    const d = pl.dir;
    if (pl.onGround) {
      // 起跑：後腳往後踢起一大團土
      const nD = lite() ? 4 : 8;
      for (let i = 0; i < nD; i++) {
        const q = spawn(0, pl.x - d * R(4, 22), pl.y - R(2, 8), -d * R(80, 240), -R(30, 130), R(0.4, 0.65), R(7, 13));
        if (q) q.g = 120;
      }
      const nC = lite() ? 3 : 7;
      for (let i = 0; i < nC; i++) {
        const q = spawn(4, pl.x - d * R(0, 14), pl.y - 3, -d * R(160, 360), -R(160, 360), R(0.45, 0.7), R(2, 3.6));
        if (q) {
          q.g = 1300;
          q.floor = pl.y - 1;
        }
      }
    }
  }

  function hit(m, dir) {
    if (!m) return;
    const sc = m.scale || 1;
    const hh = (m.h || 40) * sc;
    const x = m.x - dir * Math.min(24, (m.w || 40) * sc * 0.4);
    const y = m.y - (m.hover || 0) - hh * 0.5;
    const e = { m, x, y, gy: m.y - (m.hover || 0), dir, t: 0, hh, sx: m.x, sy: m.y - (m.hover || 0) - hh - 6 };
    H.push(e);
    if (H.length > 10) H.shift();
    // 碎石往前上方飛
    const nR = lite() ? 4 : 8;
    for (let i = 0; i < nR; i++) {
      const a = -Math.PI / 2 + dir * R(0.3, 1.25);
      const sp = R(240, 480);
      const q = spawn(2, x + dir * 6, y + R(-10, 14), Math.cos(a) * sp, Math.sin(a) * sp, R(0.55, 0.85), R(3.5, 7));
      if (q) {
        q.g = 1300;
        q.floor = e.gy;
      }
    }
    const nS = lite() ? 3 : 7;
    for (let i = 0; i < nS; i++) {
      const a = R(-Math.PI, Math.PI);
      const sp = R(260, 520);
      const q = spawn(1, x, y, Math.cos(a) * sp + dir * 120, Math.sin(a) * sp, R(0.16, 0.3), R(1.6, 2.6));
      if (q) q.g = 500;
    }
    if (!lite()) {
      for (let i = 0; i < 4; i++) {
        const q = spawn(0, x + R(-14, 14), e.gy - R(4, 12), dir * R(20, 110), -R(10, 50), R(0.45, 0.7), R(9, 15));
        if (q) q.g = -20;
      }
    }
    G.fx.shake(3, 0.1);
  }

  function step(dt) {
    const pl = P();
    // 衝鋒進行中：刮地火花、塵土、速度線、刮痕
    if (C.on) {
      C.t += dt;
      const on = dashing();
      if (!on && C.end < 0) C.end = C.t;
      if (on && pl) {
        const d = pl.dir;
        C.dir = d;
        C.emitT -= dt;
        if (C.emitT <= 0) {
          C.emitT = lite() ? 0.045 : 0.022;
          const cy = pl.y - (pl.h || 60) * 0.5;
          // 速度線：身後、各種高度
          const ns = lite() ? 1 : 2;
          for (let i = 0; i < ns; i++) spawn(3, pl.x - d * R(24, 60), cy + R(-(pl.h || 60) * 0.5, (pl.h || 60) * 0.45), -d * R(40, 120), 0, R(0.12, 0.2), R(40, 90));
          if (pl.onGround) {
            // 貼地刮出來的火花（往後上方噴）與塵土
            const nsp = lite() ? 1 : 3;
            for (let i = 0; i < nsp; i++) {
              const q = spawn(1, pl.x - d * R(4, 16), pl.y - 2, -d * R(180, 420), -R(60, 260), R(0.18, 0.32), R(1.4, 2.4));
              if (q) {
                q.g = 900;
                q.floor = pl.y - 1;
              }
            }
            const q = spawn(0, pl.x - d * R(10, 26), pl.y - R(3, 9), -d * R(40, 120), -R(10, 50), R(0.35, 0.55), R(6, 11));
            if (q) q.g = -30;
            if (!lite() && Math.random() < 0.5) {
              const r = spawn(4, pl.x - d * 8, pl.y - 3, -d * R(100, 260), -R(120, 260), R(0.4, 0.6), R(1.8, 3));
              if (r) {
                r.g = 1300;
                r.floor = pl.y - 1;
              }
            }
          }
        }
        // 地上的刮痕：每 10px 記一點（跟著地形高低）
        if (pl.onGround && (C.trail.length === 0 || Math.abs(pl.x - C.trail[C.trail.length - 2]) > 10)) {
          if (C.trail.length < 120) C.trail.push(pl.x - d * 6, pl.y);
        }
      }
      if (C.end >= 0 && C.t - C.end > 0.8) C.on = false;
    }
    for (let i = H.length - 1; i >= 0; i--) {
      const e = H[i];
      e.t += dt;
      // 撞擊星跟著怪物頭頂走
      const m = e.m;
      if (m && !m.dead) {
        const sc = m.scale || 1;
        e.sx = m.x;
        e.sy = m.y - (m.hover || 0) - (m.h || 40) * sc - 6;
      }
      if (e.t > 0.75) H.splice(i, 1);
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
        if (q.k === 0 || q.k === 3) {
          const dr = Math.max(0, 1 - 3 * dt);
          q.vx *= dr;
          q.vy *= dr;
        }
        q.vy += q.g * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.rot += q.vr * dt;
        if (q.y > q.floor) {
          q.y = q.floor;
          q.vy *= -0.3;
          q.vx *= 0.6;
        }
      }
    }
  }

  const DUST = ['#d9c3a0', '#c8ad86', '#e6d6bb'];
  const ROCK = ['#9a7b5a', '#b8966c', '#6e5236'];

  function back(ctx) {
    // 刮痕（地上）
    const tr = C.trail;
    if (C.on && tr.length >= 4) {
      const fa = C.end < 0 ? 1 : Math.max(0, 1 - (C.t - C.end) / 0.7);
      if (fa > 0) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(tr[0], tr[1] - 1);
        for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1] - 1);
        ctx.globalAlpha = 0.55 * fa;
        ctx.strokeStyle = '#3a2618';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.globalAlpha = 0.7 * fa;
        ctx.strokeStyle = '#ffcf7a';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // 塵土團（在角色後面）
    if (!live) return;
    for (const q of PS) {
      if (!q.on || q.k !== 0) continue;
      const k = q.t / q.life;
      const r = q.s * (0.6 + k * 1.3);
      ctx.globalAlpha = 0.6 * (1 - k);
      ctx.fillStyle = DUST[q.c];
      ctx.beginPath();
      ctx.arc(q.x, q.y, r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.25 * (1 - k);
      ctx.strokeStyle = OUTC;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 身前的角狀氣勁盾（本地座標：原點在身體中心，+x 是前方）
  function wedge(ctx, s, a, t) {
    const wob = Math.sin(t * 60) * 1.5;
    const shape = (k) => {
      ctx.beginPath();
      ctx.moveTo(10 * k, -38 * k);
      ctx.quadraticCurveTo(46 * k, -26 * k, 70 * k + wob, -2 * k);
      ctx.quadraticCurveTo(72 * k + wob, 2 * k, 66 * k + wob, 6 * k);
      ctx.quadraticCurveTo(44 * k, 28 * k, 10 * k, 38 * k);
      ctx.quadraticCurveTo(30 * k, 0, 10 * k, -38 * k);
      ctx.closePath();
    };
    // 外層：半透明鋼藍色的氣
    const g = ctx.createLinearGradient(10, 0, 72, 0);
    g.addColorStop(0, 'rgba(170,196,230,0)');
    g.addColorStop(0.45, 'rgba(200,218,242,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.globalAlpha = a;
    shape(1.08 * s);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.globalAlpha = a * 0.85;
    ctx.strokeStyle = OUTC;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    // 內層：白熱的尖角
    ctx.globalAlpha = a;
    ctx.save();
    ctx.translate(22 * s, 0);
    shape(0.7 * s);
    ctx.fillStyle = 'rgba(255,246,214,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,122,0.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
    // 沿著盾面往後流的氣流線
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ph = (t * 7 + i / 3) % 1;
      const side = i % 2 ? 1 : -1;
      const off = (14 + i * 7) * side;
      ctx.globalAlpha = a * (1 - ph) * 0.9;
      ctx.beginPath();
      ctx.moveTo((64 - ph * 30) * s, off * 0.3 * s);
      ctx.quadraticCurveTo((40 - ph * 40) * s, (off + side * 10) * s, (4 - ph * 50) * s, (off + side * 20) * s);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function star(ctx, x, y, r, rot, n, inner) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const rr = i % 2 ? r * inner : r;
      const a = rot + (i / (n * 2)) * TAU;
      i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function front(ctx) {
    const pl = P();
    // 氣勁盾
    if (C.on && pl) {
      const on = C.end < 0;
      const a = on ? Math.min(1, C.t / 0.05) : Math.max(0, 1 - (C.t - C.end) / 0.12);
      if (a > 0.01) {
        const d = C.dir;
        ctx.save();
        ctx.translate(pl.x + d * 8, pl.y - (pl.h || 60) * 0.5 + 2);
        ctx.scale(d, 1);
        wedge(ctx, 1 + (on ? 0 : (1 - a) * 0.3), a, G.time);
        ctx.restore();
      }
    }
    // 命中：局部小閃光、震波環、爆星
    for (const e of H) {
      const t = e.t;
      if (t < 0.16) {
        ctx.globalCompositeOperation = 'lighter';
        const rr = 64;
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, rr);
        g.addColorStop(0, 'rgba(255,244,210,' + (0.85 * (1 - t / 0.16)).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,190,90,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, rr, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      // 漫畫式的爆星（撞到的那一點）
      if (t < 0.22) {
        const k = t / 0.22;
        const r = 26 + 16 * Math.min(1, t / 0.06);
        ctx.globalAlpha = 1 - k * k;
        star(ctx, e.x, e.y, r, e.dir * 0.3, 7, 0.52);
        ctx.fillStyle = '#fff4c8';
        ctx.fill();
        ctx.strokeStyle = OUTC;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        star(ctx, e.x, e.y, r * 0.55, e.dir * 0.3 + 0.2, 7, 0.5);
        ctx.fillStyle = '#ffc24a';
        ctx.fill();
      }
      // 震波環（兩圈：直立的撞擊環＋地面的扁環）
      if (t < 0.4) {
        const k = t / 0.4;
        const ek = 1 - (1 - k) * (1 - k);
        const r = 14 + ek * 70;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.ellipse(e.x + e.dir * ek * 10, e.y, r * 0.55, r, 0, 0, TAU);
        ctx.strokeStyle = OUTC;
        ctx.lineWidth = 7 * (1 - k) + 2;
        ctx.stroke();
        ctx.strokeStyle = '#fff0c8';
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.stroke();
        const r2 = 16 + ek * 84;
        ctx.beginPath();
        ctx.ellipse(e.x, e.gy - 2, r2, r2 * 0.2, 0, 0, TAU);
        ctx.strokeStyle = 'rgba(74,46,31,' + (0.6 * (1 - k)).toFixed(3) + ')';
        ctx.lineWidth = 5 * (1 - k) + 1.5;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,226,160,' + (0.9 * (1 - k)).toFixed(3) + ')';
        ctx.lineWidth = 2.5 * (1 - k) + 0.8;
        ctx.stroke();
      }
      // 頭上的撞擊星（轉兩圈就消失）
      if (t > 0.05 && t < 0.75) {
        const k = (t - 0.05) / 0.7;
        const a = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
        ctx.globalAlpha = a;
        for (let i = 0; i < 2; i++) {
          const ang = t * 9 + i * Math.PI;
          const sx = e.sx + Math.cos(ang) * 16;
          const sy = e.sy + Math.sin(ang) * 5 - 4;
          const r = 6.5 * (i ? 0.8 : 1) * (0.85 + 0.15 * Math.sin(t * 20));
          star(ctx, sx, sy, r, t * 6, 5, 0.45);
          ctx.fillStyle = '#ffe066';
          ctx.fill();
          ctx.strokeStyle = OUTC;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    if (!live) return;
    // 速度線、火花、碎石、小土塊
    ctx.lineCap = 'round';
    for (const q of PS) {
      if (!q.on || q.k === 0) continue;
      const k = q.t / q.life;
      if (q.k === 3) {
        const dx = q.vx < 0 ? 1 : -1;
        const x0 = q.x;
        const x1 = q.x - dx * q.s * (1 - k * 0.5);
        ctx.globalAlpha = 0.55 * (1 - k);
        ctx.strokeStyle = OUTC;
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(x0, q.y);
        ctx.lineTo(x1, q.y);
        ctx.stroke();
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#f4f7ff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else if (q.k === 1) {
        const sp = Math.hypot(q.vx, q.vy) || 1;
        const l = Math.min(14, sp * 0.028);
        ctx.globalAlpha = 1 - k * k;
        ctx.strokeStyle = k < 0.4 ? '#fffbe6' : '#ffc24a';
        ctx.lineWidth = q.s;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - (q.vx / sp) * l, q.y - (q.vy / sp) * l);
        ctx.stroke();
      } else if (q.k === 2) {
        ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        const cs = Math.cos(q.rot) * q.s;
        const sn = Math.sin(q.rot) * q.s;
        const pts = q.pts;
        ctx.beginPath();
        for (let j = 0; j < pts.length; j += 2) {
          const px = q.x + pts[j] * cs - pts[j + 1] * sn;
          const py = q.y + pts[j] * sn + pts[j + 1] * cs;
          j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = ROCK[q.c];
        ctx.fill();
        ctx.strokeStyle = OUTC;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else if (q.k === 4) {
        ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        ctx.fillStyle = ROCK[q.c];
        ctx.strokeStyle = OUTC;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(q.x - q.s, q.y - q.s, q.s * 2, q.s * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  A.chargeFx = { start, hit };
  if (A.skillFx) {
    A.skillFx.add({
      live: () => C.on || H.length > 0 || live > 0,
      step,
      back,
      front,
      clear() {
        C.on = false;
        C.trail.length = 0;
        H.length = 0;
        for (const q of PS) q.on = false;
        live = 0;
      },
    });
  }
})();
