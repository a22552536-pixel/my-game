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

  // ── 天上的虛空裂縫：一道直立、邊緣鋸齒的黑紫色裂口，裡面是星空，邊緣發紫光，周圍的光點往裡面吸 ──
  const RF = [];
  function rift(x, y, dur) {
    const edge = [];
    const n = 14;
    for (let i = 0; i <= n; i++) edge.push((Math.random() - 0.5) * 0.5);
    const stars = [];
    for (let i = 0; i < 18; i++) stars.push([(Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.8, Math.random()]);
    RF.push({ x, y, t: 0, life: dur, edge, stars, motes: [] });
  }
  function riftStep(dt) {
    for (let i = RF.length - 1; i >= 0; i--) {
      const r = RF[i];
      r.t += dt;
      if (!lite() && Math.random() < 0.6) {
        const a = Math.random() * TAU;
        const d = 120 + Math.random() * 80;
        r.motes.push({ x: r.x + Math.cos(a) * d, y: r.y + Math.sin(a) * d, t: 0 });
      }
      for (let j = r.motes.length - 1; j >= 0; j--) {
        const m = r.motes[j];
        m.t += dt;
        m.x += (r.x - m.x) * Math.min(1, dt * 3.5);
        m.y += (r.y - m.y) * Math.min(1, dt * 3.5);
        if (m.t > 0.8) r.motes.splice(j, 1);
      }
      if (r.t > r.life + 0.4) RF.splice(i, 1);
    }
  }
  function riftDraw(ctx) {
    const t = G.time || 0;
    for (const r of RF) {
      const open = Math.min(1, r.t / 0.5) * (r.t > r.life ? Math.max(0, 1 - (r.t - r.life) / 0.4) : 1);
      if (open <= 0) continue;
      const H = 210;
      const W = 70 * open;
      const n = r.edge.length - 1;
      const path = () => {
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          const y = r.y - H / 2 + k * H;
          const w = W * Math.sin(k * Math.PI) * (1 + r.edge[i] * 0.6);
          i ? ctx.lineTo(r.x - w / 2, y) : ctx.moveTo(r.x - w / 2, y);
        }
        for (let i = n; i >= 0; i--) {
          const k = i / n;
          const y = r.y - H / 2 + k * H;
          const w = W * Math.sin(k * Math.PI) * (1 - r.edge[i] * 0.6);
          ctx.lineTo(r.x + w / 2, y);
        }
        ctx.closePath();
      };
      ctx.save();
      const g = ctx.createRadialGradient(r.x, r.y, 10, r.x, r.y, 200);
      g.addColorStop(0, 'rgba(150,90,255,' + (0.35 * open).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(150,90,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 200, 0, TAU);
      ctx.fill();
      path();
      ctx.fillStyle = '#0a0418';
      ctx.fill();
      ctx.save();
      path();
      ctx.clip();
      for (const s of r.stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 4 + s[2] * 10);
        ctx.fillStyle = 'rgba(220,210,255,' + (0.4 + 0.6 * tw).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(r.x + s[0] * W, r.y + s[1] * H * 0.5, 1 + s[2] * 1.6, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      path();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(40,10,80,0.9)';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,150,255,' + (0.7 + 0.3 * Math.sin(t * 9)).toFixed(3) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(210,180,255,0.85)';
      for (const m of r.motes) {
        ctx.globalAlpha = Math.max(0, 1 - m.t / 0.8);
        ctx.beginPath();
        ctx.arc(m.x, m.y, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  A.timeWarp = { show, rift };
  if (A.skillFx) {
    A.skillFx.add({
      live: () => RF.length > 0,
      step: riftStep,
      back: riftDraw,
      clear() {
        RF.length = 0;
      },
    });
  }
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
