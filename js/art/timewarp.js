// 「時間」的時間技中招特效：玩家背後浮出一個扭曲的大時鐘（和時停蝶的錶盤同一個語彙，但放大、換顏色、整個被扭轉）。
//   rewind（時間倒退）：紫色，指針飛快倒轉，整個錶盤逆時針捲起來
//   freeze（時間暫停）：金色，指針停住只微微顫動，錶盤僵在扭曲的那一刻
//   slow（時間放緩）：青綠色，指針慢慢爬，錶盤像水面一樣緩慢起伏
// 由 js/game/boss3.js（TimeItself）在中招那一刻呼叫 A.timeWarp.show(kind, 秒數)；錶盤跟著玩家走。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const lite = () => !!G.lowFx;
  const COL = {
    rewind: { rim: '#b48aff', dark: '#3a2466', glow: '180,138,255', hand: '#f0e6ff', num: '#e0d0ff' },
    freeze: { rim: '#ffd86a', dark: '#5a4210', glow: '255,216,106', hand: '#fffbe8', num: '#fff0c0' },
    slow: { rim: '#6ad8c8', dark: '#12463e', glow: '106,216,200', hand: '#e8fff8', num: '#c8fff0' },
  };
  const NUM = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const L = [];

  function show(kind, dur) {
    if (!COL[kind]) return;
    // 同一種還在就延長，不疊兩個
    const cur = L.find((e) => e.kind === kind);
    if (cur) {
      cur.life = Math.max(cur.life, cur.t + dur);
      return;
    }
    L.push({ kind, t: 0, life: dur, seed: Math.random() * 10 });
  }

  function step(dt) {
    for (let i = L.length - 1; i >= 0; i--) {
      L[i].t += dt;
      if (L[i].t > L[i].life + 0.35) L.splice(i, 1);
    }
  }

  function draw(ctx) {
    const P = G.player;
    if (!P || !L.length) return;
    const t = G.time || 0;
    for (const e of L) {
      const c = COL[e.kind];
      const kin = Math.min(1, e.t / 0.22);
      const kout = e.t > e.life ? Math.max(0, 1 - (e.t - e.life) / 0.35) : 1;
      const a = kin * kout;
      if (a <= 0) continue;
      const R = 150 * (0.7 + 0.3 * kin);
      const cx = P.x;
      const cy = P.y - 44;
      // 扭曲：半徑隨角度起伏、角度隨半徑旋轉（越外圈扭越多）
      const spin = e.kind === 'rewind' ? -e.t * 2.4 : e.kind === 'slow' ? e.t * 0.25 : 0;
      const tw = e.kind === 'freeze' ? 0.35 : e.kind === 'rewind' ? 0.55 : 0.3;
      const wob = e.kind === 'freeze' ? 0 : t;
      const pt = (th, r) => {
        const k = r / R;
        const th2 = th + spin + tw * k * k * Math.sin(k * 3.2 + wob * 1.7 + e.seed);
        const r2 = r * (1 + 0.09 * Math.sin(3 * th + wob * 2.3 + e.seed) * k);
        return [cx + Math.cos(th2) * r2, cy + Math.sin(th2) * r2];
      };
      const ring = (r) => {
        const n = lite() ? 40 : 72;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const p = pt((i / n) * TAU, r);
          i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
        }
      };
      ctx.save();
      // 底光
      const g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.15);
      g.addColorStop(0, 'rgba(' + c.glow + ',' + (0.28 * a).toFixed(3) + ')');
      g.addColorStop(0.7, 'rgba(' + c.glow + ',' + (0.12 * a).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + c.glow + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.15, 0, TAU);
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // 外圈（暗色描邊＋亮色）、內圈
      ctx.globalAlpha = a * 0.8;
      ring(R);
      ctx.strokeStyle = c.dark;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = c.rim;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.globalAlpha = a * 0.5;
      ring(R * 0.78);
      ctx.lineWidth = 2;
      ctx.stroke();
      // 刻度：60 格小點＋12 格長刻度
      ctx.globalAlpha = a * 0.75;
      for (let i = 0; i < 60; i++) {
        const th = (i / 60) * TAU - Math.PI / 2;
        const big = i % 5 === 0;
        const p0 = pt(th, R * (big ? 0.84 : 0.9));
        const p1 = pt(th, R * 0.96);
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.strokeStyle = c.rim;
        ctx.lineWidth = big ? 3 : 1.2;
        ctx.stroke();
      }
      // 羅馬數字（跟著扭曲的位置，字本身也斜）
      if (!lite()) {
        ctx.font = 'bold 15px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 12; i++) {
          const th = (i / 12) * TAU - Math.PI / 2;
          const p = pt(th, R * 0.68);
          ctx.save();
          ctx.translate(p[0], p[1]);
          ctx.rotate(Math.sin(th * 2 + wob + e.seed) * 0.35 + spin * 0.5);
          ctx.fillStyle = c.num;
          ctx.globalAlpha = a * 0.7;
          ctx.fillText(NUM[i], 0, 0);
          ctx.restore();
        }
      }
      // 指針：倒退＝飛快倒轉；暫停＝停住微顫；放緩＝慢慢爬
      const hand = (ang, len, w) => {
        const n = 10;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const p = pt(ang, (len * i) / n);
          i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
        }
        ctx.strokeStyle = c.dark;
        ctx.lineWidth = w + 3;
        ctx.stroke();
        ctx.strokeStyle = c.hand;
        ctx.lineWidth = w;
        ctx.stroke();
      };
      const jit = e.kind === 'freeze' ? Math.sin(t * 60) * 0.02 : 0;
      const rate = e.kind === 'rewind' ? -9 : e.kind === 'slow' ? 0.35 : 0;
      const base = e.seed - Math.PI / 2;
      ctx.globalAlpha = a * 0.9;
      hand(base + e.t * rate + jit, R * 0.5, 5);
      hand(base * 2.3 + e.t * rate * 6 + jit, R * 0.78, 3);
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, TAU);
      ctx.fillStyle = c.rim;
      ctx.fill();
      ctx.restore();
    }
  }

  A.timeWarp = { show };
  if (A.skillFx) {
    A.skillFx.add({
      live: () => L.length > 0,
      step,
      back: draw,
      clear() {
        L.length = 0;
      },
    });
  }
})();
