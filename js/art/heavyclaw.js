// 重爪（力量一轉）的命中特效：三道由上往下撕開的粗爪痕（岩色、帶描邊、白熱芯）、命中點的小光、
// 飛出去的碎岩、腳前的地裂和塵土。由 js/game/player.js 在重爪命中那一刻呼叫 A.heavyClawFx.hit()。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const L = [];
  const lite = () => !!G.lowFx;

  function hit(x, y, dir, gy) {
    const e = { x, y, dir, gy, t: 0, rocks: [], cracks: [], dust: [] };
    const nR = lite() ? 4 : 8;
    for (let i = 0; i < nR; i++) {
      const a = -Math.PI / 2 + dir * (0.35 + Math.random() * 1.0) + (Math.random() - 0.5) * 0.3;
      const sp = 260 + Math.random() * 280;
      const s = 3.5 + Math.random() * 5;
      const pts = [];
      const n = 5 + ((Math.random() * 2) | 0);
      for (let k = 0; k < n; k++) {
        const aa = (k / n) * TAU;
        const r = s * (0.7 + Math.random() * 0.5);
        pts.push(Math.cos(aa) * r, Math.sin(aa) * r);
      }
      e.rocks.push({ x: x + dir * 10, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 16, pts, tone: i % 3 });
    }
    // 地裂：從腳前往前方裂開兩三道折線
    const nc = lite() ? 2 : 3;
    for (let i = 0; i < nc; i++) {
      const seg = [];
      let cx = x - dir * 6;
      let cy = gy;
      for (let k = 0; k < 5; k++) {
        cx += dir * (10 + Math.random() * 14);
        cy = gy + (Math.random() - 0.5) * 5;
        seg.push(cx, cy);
      }
      e.cracks.push(seg);
    }
    for (let i = 0; i < (lite() ? 2 : 4); i++) e.dust.push({ x: x + dir * (i * 16 - 8), r: 10 + Math.random() * 8, vx: dir * (30 + Math.random() * 50) });
    L.push(e);
  }

  function step(dt) {
    for (let i = L.length - 1; i >= 0; i--) {
      const e = L[i];
      e.t += dt;
      for (const r of e.rocks) {
        r.vy += 1300 * dt;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.rot += r.vr * dt;
      }
      if (e.t > 0.9) L.splice(i, 1);
    }
  }

  // 一道爪痕：以 (x0,y0) → (x1,y1) 的弧線為中心、兩頭尖、中間粗的月牙
  function gouge(ctx, x0, y0, x1, y1, bend, w, k) {
    const mx = (x0 + x1) / 2 + bend;
    const my = (y0 + y1) / 2;
    const ex = x0 + (x1 - x0) * k;
    const ey = y0 + (y1 - y0) * k;
    const cmx = x0 + (mx - x0) * Math.min(1, k * 2);
    const cmy = y0 + (my - y0) * Math.min(1, k * 2);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cmx - w, cmy, ex, ey);
    ctx.quadraticCurveTo(cmx + w, cmy, x0, y0);
    ctx.closePath();
  }

  function draw(ctx) {
    for (const e of L) {
      const t = e.t;
      const d = e.dir;
      // 地裂（先畫，在爪痕和碎岩底下）
      const ca = Math.max(0, 1 - Math.max(0, t - 0.35) / 0.5);
      if (ca > 0) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const seg of e.cracks) {
          const nShow = Math.min(seg.length / 2, Math.floor(t / 0.02) + 1);
          ctx.beginPath();
          ctx.moveTo(e.x - d * 6, e.gy);
          for (let k = 0; k < nShow; k++) ctx.lineTo(seg[k * 2], seg[k * 2 + 1]);
          ctx.globalAlpha = ca * 0.85;
          ctx.strokeStyle = '#2a1c12';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.globalAlpha = ca * 0.6;
          ctx.strokeStyle = '#ffb45a';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      // 塵土
      for (const u of e.dust) {
        const k = Math.min(1, t / 0.7);
        const r = u.r * (1 + k * 1.6);
        ctx.globalAlpha = 0.45 * (1 - k);
        ctx.fillStyle = '#b89a74';
        ctx.beginPath();
        ctx.arc(u.x + u.vx * t, e.gy - 6 - k * 14, r, 0, TAU);
        ctx.fill();
      }
      // 命中點的小光（局部，不閃全畫面）
      if (t < 0.22) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 70);
        g.addColorStop(0, 'rgba(255,236,190,' + (0.85 * (1 - t / 0.22)).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 70, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      // 三道爪痕：0.07 秒劃開，停一下，0.35 秒淡出
      const k = Math.min(1, t / 0.07);
      const a = t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.35);
      if (a > 0) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(1.7, 1.7);
        ctx.translate(-e.x, -e.y);
        for (let i = 0; i < 3; i++) {
          const off = (i - 1) * 15;
          const x0 = e.x - d * 34 + off * 0.4;
          const y0 = e.y - 44 + off;
          const x1 = e.x + d * 40 + off * 0.4;
          const y1 = e.y + 26 + off;
          const bend = d * 10;
          const w = 7 - Math.abs(i - 1) * 1.5;
          ctx.globalAlpha = a;
          gouge(ctx, x0, y0, x1, y1, bend, w + 2.5, k);
          ctx.fillStyle = '#2a1c12';
          ctx.fill();
          gouge(ctx, x0, y0, x1, y1, bend, w, k);
          ctx.fillStyle = '#e8a24a';
          ctx.fill();
          gouge(ctx, x0, y0, x1, y1, bend, w * 0.4, k);
          ctx.fillStyle = '#fff4d8';
          ctx.fill();
        }
        ctx.restore();
      }
      // 碎岩
      const ra = Math.max(0, 1 - Math.max(0, t - 0.45) / 0.45);
      if (ra > 0) {
        ctx.globalAlpha = ra;
        for (const r of e.rocks) {
          const cs = Math.cos(r.rot);
          const sn = Math.sin(r.rot);
          ctx.beginPath();
          for (let q = 0; q < r.pts.length; q += 2) {
            const px = r.x + r.pts[q] * cs - r.pts[q + 1] * sn;
            const py = r.y + r.pts[q] * sn + r.pts[q + 1] * cs;
            q ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = ['#9a7b5a', '#b8966c', '#6e5236'][r.tone];
          ctx.fill();
          ctx.strokeStyle = '#2a1c12';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  A.heavyClawFx = { hit };
  if (A.skillFx) {
    A.skillFx.add({
      live: () => L.length > 0,
      step,
      front: draw,
      clear() {
        L.length = 0;
      },
    });
  }
})();
