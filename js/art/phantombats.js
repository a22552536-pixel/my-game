// 瞬影百擊的小蝙蝠黑影：每次瞬移、以及開招／收招時，從身邊炸出一群黑色小蝙蝠，拍著翅膀往外、往上飛散後淡掉。
// 由 js/game/skills3.js 的 phantom 呼叫 A.phantomBats.burst(x, y, n, dir)。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const L = [];
  const MAX = 90;

  function burst(x, y, n, dir) {
    if (G.lowFx) n = Math.ceil(n / 2);
    for (let i = 0; i < n && L.length < MAX; i++) {
      // 大多往上半圈飛，略偏向 dir（有給的話）
      let a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      if (dir) a += dir * 0.35;
      const sp = 140 + Math.random() * 220;
      L.push({
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 30,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        t: 0,
        life: 0.55 + Math.random() * 0.45,
        s: 1.0 + Math.random() * 0.7,
        ph: Math.random() * TAU,
        fq: 26 + Math.random() * 10,
        wob: (Math.random() - 0.5) * 6,
      });
    }
  }

  function step(dt) {
    for (let i = L.length - 1; i >= 0; i--) {
      const b = L[i];
      b.t += dt;
      // 慢下來、左右飄一下（像蝙蝠亂飛）
      b.vx = b.vx * (1 - 1.6 * dt) + Math.sin(b.t * 9 + b.ph) * b.wob * 30 * dt * 10;
      b.vy = b.vy * (1 - 1.6 * dt) - 40 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.t > b.life) L.splice(i, 1);
    }
  }

  // 一隻蝙蝠剪影：身體＋兩片鋸齒翼，flap 0..1 控制翅膀上下
  function bat(ctx, b) {
    const k = b.t / b.life;
    const a = k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.5) / 0.5);
    if (a <= 0) return;
    const flap = Math.sin(b.t * b.fq + b.ph);
    const s = b.s * (1 - k * 0.3);
    const face = b.vx >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(s * face, s);
    ctx.globalAlpha = a;
    const wy = flap * 7; // 翼尖的上下
    ctx.beginPath();
    // 左翼
    ctx.moveTo(-2, -1);
    ctx.quadraticCurveTo(-8, -6 - wy * 0.6, -15, -3 - wy);
    ctx.lineTo(-12, 1 - wy * 0.4);
    ctx.lineTo(-9, 0 - wy * 0.2);
    ctx.lineTo(-6, 3);
    ctx.lineTo(-2, 2);
    // 右翼
    ctx.lineTo(2, 2);
    ctx.lineTo(6, 3);
    ctx.lineTo(9, 0 - wy * 0.2);
    ctx.lineTo(12, 1 - wy * 0.4);
    ctx.lineTo(15, -3 - wy);
    ctx.quadraticCurveTo(8, -6 - wy * 0.6, 2, -1);
    ctx.closePath();
    ctx.fillStyle = '#15101f';
    ctx.fill();
    // 身體與耳朵
    ctx.beginPath();
    ctx.ellipse(0, 0.5, 2.6, 3.6, 0, 0, TAU);
    ctx.moveTo(-2, -2.5);
    ctx.lineTo(-1.6, -5.5);
    ctx.lineTo(-0.4, -3);
    ctx.moveTo(2, -2.5);
    ctx.lineTo(1.6, -5.5);
    ctx.lineTo(0.4, -3);
    ctx.fill();
    // 一點紅眼
    ctx.fillStyle = '#ff3a5a';
    ctx.fillRect(0.6, -1.2, 1.1, 1.1);
    ctx.restore();
  }

  function draw(ctx) {
    // 淡淡的紫黑殘影在底下，讓蝙蝠群在亮背景上也看得出來
    for (const b of L) {
      const k = b.t / b.life;
      if (k > 0.6) continue;
      ctx.globalAlpha = 0.18 * (1 - k / 0.6);
      ctx.fillStyle = '#5a2a8a';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 9 * b.s, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const b of L) bat(ctx, b);
    ctx.globalAlpha = 1;
  }

  A.phantomBats = { burst };
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
