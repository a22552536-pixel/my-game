// 第四章怪物動作重做的特效（邏輯在 js/game/mobmotion.js，這裡只讀 G.mobMotion 與怪物身上的表現欄位）：
//   鐮鼬：地上的風線預警（m.wl）、疾衝時拖出的風痕與雪屑
//   白澤：天上的雲點路線（m.sky）、奔馳時蹄下一朵朵雲
//   鎧武者亡靈：居合的紅色預警線（m.iaiLine）、白／朱紅的斬痕殘影（MM.iai）
//   雷獸：落雷前地上閃爍的電痕、落雷、局部閃光、焦痕與火花（MM.bolts）
//   影之芬里爾：奔跑時身後的黑霧、地上擴散的影池與冒出的影刃（MM.pools）
//   雪女：地上的扇形預警、暴風雪的雪流（m.bz）、玩家身上的霜色（MM.frost）
//   古松樹靈：瞄準線（m.pcLine）、樹瘤的光、松果、松鱗與松針、樹皮屑（MM.cones）
//   九尾封印狐：大顆的狐火（MM.orbs）
//   雪男：滾動變大的雪球、炸開的雪晶（MM.balls、MM.shards）
// 畫在 A.skillFx 的 back（地面上的東西）與 front（其餘）兩層。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const TAU = Math.PI * 2;
  const lite = () => !!G.lowFx;
  const R = (a, b) => a + (b - a) * Math.random();
  const MM = () => G.mobMotion;
  const OUT = () => (A.outline ? A.outline() : '#4a2e1f');

  // ── 粒子池 ──
  // 0 風痕 1 雲朵 2 火花 3 黑霧 4 樹皮屑 5 松鱗 6 松針 7 雪流 8 雪團 9 狐火星
  const N = 360;
  const PS = [];
  for (let i = 0; i < N; i++) PS.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, rot: 0, vr: 0, g: 0, drag: 0 });
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
      q.rot = R(0, TAU);
      q.vr = R(-8, 8);
      q.g = 0;
      q.drag = 0;
      return q;
    }
    return null;
  }

  const glow = (() => {
    const cache = {};
    return (col) => {
      if (cache[col]) return cache[col];
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(' + col + ',1)');
      g.addColorStop(0.35, 'rgba(' + col + ',0.45)');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
      return (cache[col] = c);
    };
  })();
  function blob(ctx, img, x, y, r, a) {
    if (a <= 0.01 || r <= 0) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  }
  const SMOKE = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(26,20,48,0.7)');
    g.addColorStop(0.6, 'rgba(30,22,56,0.3)');
    g.addColorStop(1, 'rgba(30,22,56,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return c;
  })();
  const CLOUD = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(236,244,255,0.6)');
    g.addColorStop(1, 'rgba(220,232,250,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return c;
  })();

  // ── 每幀：取樣怪物的動作、消化事件、推進粒子 ──
  const prevX = new WeakMap();
  const emitT = new WeakMap();
  const boltPts = new WeakMap();
  let lastT = -1;
  function step(dt) {
    const M = MM();
    if (!M) return;
    const mons = G.world.monsters;
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (m.dead) continue;
      const id = m.id;
      if (id !== 'echoferret' && id !== 'crystalowl' && id !== 'shadowwolf' && id !== 'dreamsheep') continue;
      const px = prevX.has(m) ? prevX.get(m) : m.x;
      prevX.set(m, m.x);
      const v = dt > 0 ? (m.x - px) / dt : 0;
      let e = (emitT.get(m) || 0) - dt;
      const fx = m.fx || {};
      const sc = m.scale || 1;
      if (id === 'echoferret' && Math.abs(v) > 280) {
        // 風痕：身後拉出一條條淡青白的細線，偶爾捲起雪屑
        const d = Math.sign(v);
        const n = lite() ? 1 : 2;
        for (let j = 0; j < n; j++) {
          const q = spawn(0, m.x - d * R(10, 40), m.y - R(6, 44) * sc, -d * R(40, 120), R(-20, 10), R(0.22, 0.4), Math.min(90, Math.abs(v) * R(0.04, 0.07)));
          if (q) q.rot = d;
        }
        if (!lite() && Math.random() < 0.5) {
          const q = spawn(8, m.x - d * 20, m.y - 4, -d * R(30, 90), -R(20, 70), R(0.3, 0.5), R(3, 6));
          if (q) q.g = 160;
        }
      } else if (id === 'crystalowl' && (fx.gallop || 0) > 0.4) {
        e -= 0;
        if (e <= 0) {
          e = lite() ? 0.14 : 0.07;
          const hv = m.hover || 0;
          const d = m.dir || 1;
          const q = spawn(1, m.x + d * R(-22, 16) * sc, m.y - hv + R(-2, 4), -d * R(20, 60), R(-6, 10), R(0.45, 0.7), R(7, 11));
          if (q) q.drag = 2;
        }
      } else if (id === 'shadowwolf' && (fx.run || 0) > 0.5) {
        if (e <= 0) {
          e = lite() ? 0.1 : 0.045;
          const d = Math.sign(v) || m.dir || 1;
          const q = spawn(3, m.x - d * R(30, 50) * sc, m.y - R(10, 40) * sc, -d * R(20, 60), -R(10, 30), R(0.5, 0.8), R(9, 14));
          if (q) q.drag = 1.5;
        }
      } else if (id === 'dreamsheep' && m.bz && m.bz.ph === 'blow') {
        // 暴風雪：密集的橫向雪流
        const B = m.bz;
        const n = lite() ? 3 : 9;
        for (let j = 0; j < n; j++) {
          const dx = R(0, 60);
          const q = spawn(7, B.x + B.dir * (20 + dx), B.y - 44 + R(-30, 30), B.dir * R(750, 1100), R(-50, 50), R(0.35, 0.5), R(14, 34));
          if (q) q.rot = B.dir;
        }
      } else if (id === 'dreamsheep' && m.bz && m.bz.ph === 'tele' && !lite() && Math.random() < 0.6) {
        // 預警：身前捲起一團旋轉的雪
        const B = m.bz;
        const a = R(0, TAU);
        const q = spawn(8, B.x + B.dir * 40 + Math.cos(a) * 30, B.y - 44 + Math.sin(a) * 22, -Math.sin(a) * 90 + B.dir * 30, Math.cos(a) * 60, R(0.3, 0.5), R(2, 4));
        if (q) q.drag = 1;
      }
      emitT.set(m, e);
    }
    // 雪球的尾巴
    for (const b of M.balls || []) {
      if (Math.random() < (lite() ? 0.25 : 0.6)) {
        const q = spawn(8, b.x - b.dir * b.r * 0.6, b.y - R(0, b.r * 0.5), -b.dir * R(20, 70), -R(20, 60), R(0.35, 0.6), R(4, 4 + b.r * 0.2));
        if (q) q.g = 120;
      }
      // 沾上的小東西
      if (b.bits.length < 9 && b.dist > (b.bits.length + 1) * 45) b.bits.push({ a: R(0, TAU), rr: R(0.35, 0.85), k: (Math.random() * 3) | 0, s: R(0.8, 1.3) });
    }
    // 事件
    for (const e of M.ev) {
      if (e.k === 'bark') {
        for (let j = 0; j < (lite() ? 1 : 3); j++) {
          const q = spawn(4, e.x, e.y, e.dir * R(60, 200), -R(80, 220), R(0.5, 0.8), R(3, 5));
          if (q) q.g = 900;
        }
      } else if (e.k === 'cone') {
        for (let j = 0; j < (lite() ? 2 : 5); j++) {
          const a = R(0, TAU);
          const sp = R(60, 200);
          const q = spawn(j % 2 ? 6 : 5, e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp - 80, R(0.4, 0.7), R(3, 5));
          if (q) q.g = 800;
        }
      } else if (e.k === 'foxpop' || e.k === 'foxlit') {
        for (let j = 0; j < (lite() ? 2 : e.k === 'foxpop' ? 7 : 4); j++) {
          const a = R(0, TAU);
          const sp = R(40, 160);
          spawn(9, e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R(0.25, 0.45), R(2, 3.5));
        }
      } else if (e.k === 'snowburst') {
        SB.push({ x: e.x, y: e.y, r: e.r, t: 0 });
        for (let j = 0; j < (lite() ? 4 : 10); j++) {
          const a = R(0, TAU);
          const sp = R(60, 220);
          const q = spawn(8, e.x + Math.cos(a) * e.r * 0.5, e.y + Math.sin(a) * e.r * 0.5, Math.cos(a) * sp, Math.sin(a) * sp - 40, R(0.4, 0.7), R(6, 12));
          if (q) q.drag = 2.5;
        }
      }
    }
    M.ev.length = 0;
    for (let i = SB.length - 1; i >= 0; i--) {
      SB[i].t += dt;
      if (SB[i].t > 0.25) SB.splice(i, 1);
    }
    // 落雷：劈下的那一刻噴火花
    for (const b of M.bolts) {
      if (b.struck && !b.fxDone) {
        b.fxDone = true;
        for (let j = 0; j < (lite() ? 4 : 9); j++) {
          const a = -Math.PI / 2 + R(-1.3, 1.3);
          const sp = R(160, 380);
          const q = spawn(2, b.x, b.y - 4, Math.cos(a) * sp, Math.sin(a) * sp, R(0.25, 0.45), R(5, 9));
          if (q) q.g = 1100;
        }
      }
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
        if (q.drag) {
          const d = Math.max(0, 1 - q.drag * dt);
          q.vx *= d;
          q.vy *= d;
        }
        q.vy += q.g * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.rot += q.vr * dt;
      }
    }
  }
  const SB = []; // 雪球炸開的白光

  // ── 地面層 ──
  function drawBack(ctx) {
    const M = MM();
    if (!M) return;
    const now = G.time;
    const mons = G.world.monsters;
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (m.dead) continue;
      if (m.wl) windLine(ctx, m.wl, now);
      if (m.sky) skyPath(ctx, m.sky, now);
      if (m.iaiLine) iaiLine(ctx, m.iaiLine, now);
      if (m.pcLine) aimLine(ctx, m.pcLine, now);
      if (m.bz && m.bz.ph === 'tele') coneMark(ctx, m.bz);
    }
    for (const b of M.bolts) boltMark(ctx, b);
    for (const q of M.pools) poolStain(ctx, q);
    // 黑霧在最底
    if (live) {
      for (const q of PS) {
        if (!q.on || q.k !== 3) continue;
        const k = q.t / q.life;
        const r = q.s * (1 + k);
        ctx.globalAlpha = 0.8 * (1 - k) * Math.min(1, q.t * 10);
        ctx.drawImage(SMOKE, q.x - r, q.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  // 鐮鼬的風線：貼地的一條淡青光帶，上面有往衝刺方向流動的「〉」，越接近出發越亮
  function windLine(ctx, w, now) {
    const age = now - w.t0;
    if (age > w.dur + 0.18 || age < 0) return;
    const k = Math.min(1, age / w.dur);
    const out = age > w.dur ? 1 - (age - w.dur) / 0.18 : 1;
    const x0 = w.x0;
    const x1 = w.x1;
    const d = Math.sign(x1 - x0) || 1;
    const L = Math.abs(x1 - x0);
    const y = w.y - 3;
    const a = (0.35 + 0.55 * k) * out;
    ctx.save();
    ctx.lineCap = 'round';
    // 暗底（在亮的地面上也看得到）＋光帶
    ctx.globalAlpha = a * 0.35;
    ctx.strokeStyle = 'rgba(16,40,56,1)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.globalAlpha = a * 0.7;
    ctx.strokeStyle = 'rgba(160,240,230,1)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.strokeStyle = k > 0.8 && Math.floor(now * 30) % 2 ? '#ffffff' : '#e8fffb';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    // 流動的〉
    const sp = 18;
    const off = (now * 420) % 46;
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * out).toFixed(3) + ')';
    ctx.beginPath();
    for (let s = off; s < L; s += 46) {
      const x = x0 + d * s;
      const fade = Math.min(1, s / 40, (L - s) / 40);
      if (fade <= 0) continue;
      ctx.moveTo(x - d * 8, y - 7 * fade);
      ctx.lineTo(x, y);
      ctx.lineTo(x - d * 8, y + 5 * fade);
    }
    ctx.stroke();
    // 起點、終點的短直槓
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(200,255,248,' + a.toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(x1, y - 12);
    ctx.lineTo(x1, y + 4);
    ctx.moveTo(x0, y - 8);
    ctx.lineTo(x0, y + 4);
    ctx.stroke();
    ctx.restore();
    void sp;
  }

  // 白澤的路線：天上一顆顆淡淡的雲點，從起點依序浮出
  function skyPath(ctx, s, now) {
    const age = now - s.t0;
    if (age > s.dur + 0.2 || age < 0) return;
    const L = Math.abs(s.x1 - s.x0);
    const d = Math.sign(s.x1 - s.x0) || 1;
    const n = Math.max(3, Math.round(L / 40));
    const shown = Math.min(n, Math.floor((age / 0.42) * n) + 1);
    const out = age > s.dur ? 1 - (age - s.dur) / 0.2 : 1;
    for (let i = 0; i < shown; i++) {
      const x = s.x0 + d * (i + 1) * (L / n);
      const r = 5 + Math.sin(i * 1.7) * 1.5;
      blob(ctx, CLOUD, x, s.y + Math.sin(now * 4 + i) * 2, r * 1.6, 0.55 * out);
    }
    ctx.globalAlpha = 1;
  }

  // 居合的預警：一條很細的紅線（刀要走的路），閃爍、越來越亮
  function iaiLine(ctx, l, now) {
    const age = now - l.t0;
    if (age > l.dur + 0.05 || age < 0) return;
    const k = Math.min(1, age / l.dur);
    const fl = Math.floor(now * 24) % 2 ? 1 : 0.7;
    const y = l.y - 50;
    ctx.save();
    ctx.globalAlpha = (0.25 + 0.5 * k) * fl;
    ctx.strokeStyle = 'rgba(255,40,50,1)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(l.x0, y);
    ctx.lineTo(l.x1, y);
    ctx.stroke();
    ctx.globalAlpha = (0.55 + 0.45 * k) * fl;
    ctx.strokeStyle = '#ff5a5a';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // 地上的紅線與終點刻痕
    ctx.globalAlpha = 0.5 + 0.4 * k;
    ctx.beginPath();
    ctx.moveTo(l.x0, l.y - 2);
    ctx.lineTo(l.x1, l.y - 2);
    ctx.moveTo(l.x1, l.y - 12);
    ctx.lineTo(l.x1, l.y + 2);
    ctx.stroke();
    ctx.restore();
  }

  // 古松的瞄準線：從樹瘤射出、鎖定的細線（虛線往前流），預警結束後很快淡掉
  function aimLine(ctx, l, now) {
    const age = now - l.t0;
    if (age > l.dur + 0.25 || age < 0) return;
    const k = Math.min(1, age / l.dur);
    const out = age > l.dur ? 1 - (age - l.dur) / 0.25 : 1;
    const ex = l.x + Math.cos(l.a) * l.len * Math.min(1, k * 3);
    const ey = l.y + Math.sin(l.a) * l.len * Math.min(1, k * 3);
    ctx.save();
    ctx.globalAlpha = (0.3 + 0.5 * k) * out;
    ctx.strokeStyle = 'rgba(255,150,60,1)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(l.x, l.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.globalAlpha = (0.6 + 0.4 * k) * out;
    ctx.strokeStyle = '#fff0c0';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -now * 80;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 雪女的扇形：地上一片往前張開的淡青色
  function coneMark(ctx, B) {
    const k = Math.min(1, B.t / 0.6);
    const x0 = B.x + B.dir * 10;
    const x1 = B.x + B.dir * B.len * (0.3 + 0.7 * k);
    const y = B.y;
    ctx.save();
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(110,180,250,' + (0.55 * k).toFixed(3) + ')');
    g.addColorStop(0.8, 'rgba(120,190,250,' + (0.3 * k).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(120,190,250,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, y - 3);
    ctx.lineTo(x1, y - 16);
    ctx.lineTo(x1, y + 6);
    ctx.lineTo(x0, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,130,210,' + (0.6 * k).toFixed(3) + ')';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    // 往前吹的細線
    ctx.strokeStyle = 'rgba(240,250,255,' + (0.7 * k).toFixed(3) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const off = (G.time * 300) % 40;
    for (let s = off; s < Math.abs(x1 - x0); s += 40) {
      const x = x0 + B.dir * s;
      const f = s / Math.abs(x1 - x0 || 1);
      ctx.moveTo(x, y - 2 - f * 8);
      ctx.lineTo(x + B.dir * 14, y - 2 - f * 9);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 落雷前地上的電痕：閃爍的橢圓＋從地面冒出來的小電弧
  function boltMark(ctx, b) {
    if (b.t < 0) return;
    if (!b.struck) {
      const k = Math.min(1, b.t / b.tele);
      const fl = Math.random() < 0.25 + 0.5 * k ? 1 : 0.35;
      ctx.save();
      ctx.globalAlpha = (0.3 + 0.6 * k) * fl;
      ctx.strokeStyle = '#ffe45a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 2, 16 + 16 * k, 4 + 3 * k, 0, 0, TAU);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      blob(ctx, glow('255,230,120'), b.x, b.y - 4, 22 + 18 * k, 0.35 * k * fl);
      ctx.globalAlpha = 0.9 * fl;
      ctx.strokeStyle = '#fff8d0';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      const n = lite() ? 2 : 3 + Math.floor(k * 3);
      for (let i = 0; i < n; i++) {
        let x = b.x + R(-22, 22) * (0.6 + k);
        let y = b.y - 2;
        ctx.moveTo(x, y);
        for (let j = 0; j < 3; j++) {
          x += R(-6, 6);
          y -= R(4, 10) * (0.6 + k);
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();
    } else {
      // 焦痕
      const a = Math.max(0, 1 - (b.t - b.tele) / 0.6);
      ctx.save();
      ctx.globalAlpha = 0.6 * a;
      ctx.fillStyle = '#1e1810';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 1, 26, 5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  // 影池：往外擴散的一灘黑，邊緣閃紫光
  function poolStain(ctx, q) {
    if (q.t < 0) return;
    const k = Math.min(1, q.t / q.tele);
    const out = q.burst ? Math.max(0, 1 - (q.t - q.tele - 0.3) / 0.4) : 1;
    if (out <= 0) return;
    const rx = 12 + 44 * Math.sqrt(k);
    const ry = 4 + 8 * Math.sqrt(k);
    ctx.save();
    ctx.globalAlpha = 0.85 * out;
    ctx.fillStyle = '#0e0818';
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * TAU;
      const w = 1 + Math.sin(a * 3 + q.seed + G.time * 3) * 0.08;
      const x = q.x + Math.cos(a) * rx * w;
      const y = q.y - 1 + Math.sin(a) * ry * w;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.fill();
    ctx.globalAlpha = (0.4 + 0.5 * k) * out;
    ctx.strokeStyle = '#9a6aff';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // 邊上的紫色光點
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < (lite() ? 2 : 4); i++) {
      const a = q.seed + i * 1.7 + G.time * (1.5 + i * 0.3);
      const x = q.x + Math.cos(a) * rx;
      const y = q.y - 1 + Math.sin(a) * ry;
      const tw = 0.5 + 0.5 * Math.sin(G.time * 12 + i * 2);
      blob(ctx, glow('190,140,255'), x, y, 6 + 4 * tw, k * tw * out);
    }
    ctx.restore();
  }

  // ── 前景層 ──
  function drawFront(ctx) {
    const M = MM();
    if (!M) return;
    for (const b of M.bolts) boltStrike(ctx, b);
    for (const s of M.iai) iaiSlash(ctx, s);
    for (const q of M.pools) poolBlades(ctx, q);
    for (const b of M.balls || []) snowball(ctx, b);
    for (const e of SB) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      blob(ctx, glow('255,255,255'), e.x, e.y, e.r * 1.8 * (1 + e.t * 2), 0.9 * (1 - e.t / 0.25));
      ctx.restore();
    }
    for (const s of M.shards || []) shard(ctx, s);
    for (let i = 0; i < G.world.monsters.length; i++) {
      const m = G.world.monsters[i];
      if (m.bz && m.bz.ph === 'blow' && !m.dead) blizzardBand(ctx, m.bz);
    }
    for (const c of M.cones) pinecone(ctx, c);
    for (const o of M.orbs) foxOrb(ctx, o);
    // 古松樹瘤的光；雪男手上拍著的小雪球
    const mons = G.world.monsters;
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (m.id === 'avalanchehare' && m.kkT > 0 && !m.dead) {
        const k = 1 - m.kkT / 0.5;
        const r = 4 + 13 * Math.min(1, k * 1.2);
        const bx = m.x + (m.dir || 1) * (28 + k * 6);
        const by = m.y - 16 - r * 0.6 + Math.sin(k * 30) * 1.5 * (1 - k);
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, TAU);
        ctx.fillStyle = '#f4f8ff';
        ctx.fill();
        ctx.fillStyle = 'rgba(150,175,215,0.4)';
        ctx.beginPath();
        ctx.arc(bx + r * 0.3, by + r * 0.3, r * 0.8, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, TAU);
        ctx.strokeStyle = OUT();
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
        if (Math.random() < 0.35) {
          const q = spawn(8, bx + R(-r, r), m.y - 4, R(-40, 40), -R(40, 110), R(0.3, 0.5), R(3, 5));
          if (q) q.g = 300;
        }
      }
      if (m.dead || !(m.fx && m.fx.knot > 0.02) || !m.pcS) continue;
      const k = m.fx.knot;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pul = 0.8 + 0.2 * Math.sin(G.time * 18);
      blob(ctx, glow('255,190,90'), m.pcS.x, m.pcS.y, 14 + 18 * k * pul + (m.fx.recoil || 0) * 8, 0.8 * k);
      ctx.restore();
    }
    drawParticles(ctx);
    if (M.frost > 0) frostTint(ctx, M.frost);
    ctx.globalAlpha = 1;
  }

  // 暴風雪的主體：從袖口往前張開的一大片半透明雪風（邊緣波動），疊在雪流底下
  function blizzardBand(ctx, B) {
    const a = Math.min(1, B.t / 0.15) * Math.min(1, (1.2 - B.t) / 0.25);
    if (a <= 0) return;
    const x0 = B.x + B.dir * 16;
    const x1 = B.x + B.dir * B.len;
    const y = B.y - 44;
    ctx.save();
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(215,236,255,' + (0.7 * a).toFixed(3) + ')');
    g.addColorStop(0.55, 'rgba(160,205,245,' + (0.42 * a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(150,200,245,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const w = 10 + k * 46 + Math.sin(G.time * 14 + k * 9) * 5;
      const x = x0 + (x1 - x0) * k;
      i ? ctx.lineTo(x, y - w) : ctx.moveTo(x, y - w);
    }
    for (let i = n; i >= 0; i--) {
      const k = i / n;
      const w = 10 + k * 40 + Math.sin(G.time * 12 + k * 7 + 2) * 5;
      ctx.lineTo(x0 + (x1 - x0) * k, y + w);
    }
    ctx.closePath();
    ctx.fill();
    // 捲動的風紋
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * a).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let j = 0; j < 4; j++) {
      const off = ((G.time * 700 + j * 110) % (B.len - 20)) + 20;
      const x = B.x + B.dir * off;
      const yy = y + (j - 1.5) * (8 + off * 0.06);
      ctx.moveTo(x - B.dir * 36, yy);
      ctx.quadraticCurveTo(x - B.dir * 10, yy - 8, x + B.dir * 6, yy - 2);
    }
    ctx.stroke();
    ctx.restore();
  }

  function boltStrike(ctx, b) {
    if (!b.struck) return;
    const age = b.t - b.tele;
    if (age > 0.24) return;
    let pts = boltPts.get(b);
    if (!pts) {
      pts = [];
      let x = b.x;
      const top = b.y - 480;
      for (let y = top; y < b.y; y += 22) {
        pts.push(x, y);
        x = b.x + R(-16, 16);
      }
      pts.push(b.x, b.y);
      // 一條分岔
      const bi = 2 * (4 + ((Math.random() * 8) | 0));
      pts.branch = [pts[bi] || b.x, pts[bi + 1] || b.y - 200];
      boltPts.set(b, pts);
    }
    const a = age < 0.06 ? 1 : Math.max(0, 1 - (age - 0.06) / 0.18);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 局部閃光（不閃全畫面）
    blob(ctx, glow('255,240,170'), b.x, b.y - 30, 90 * (1 + age * 2), 0.8 * a);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      if (pts.branch) {
        ctx.moveTo(pts.branch[0], pts.branch[1]);
        ctx.lineTo(pts.branch[0] + 30, pts.branch[1] + 40);
        ctx.lineTo(pts.branch[0] + 22, pts.branch[1] + 80);
      }
    };
    path();
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.5 * a;
    ctx.strokeStyle = '#ffd54a';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#fffbe6';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.restore();
  }

  // 居合的斬痕：一道白芯、朱紅外緣的細長斬線，停 0.25 秒後淡出
  function iaiSlash(ctx, s) {
    const a = s.t < 0.25 ? 1 : Math.max(0, 1 - (s.t - 0.25) / 0.3);
    if (a <= 0) return;
    const d = Math.sign(s.x1 - s.x0) || 1;
    const L = Math.abs(s.x1 - s.x0);
    const grow = Math.min(1, s.t / 0.04);
    const xe = s.x0 + d * L * grow;
    ctx.save();
    ctx.globalAlpha = a * 0.8;
    ctx.fillStyle = '#c0142a';
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y + 2);
    ctx.quadraticCurveTo((s.x0 + xe) / 2, s.y - 7, xe, s.y - 1);
    ctx.quadraticCurveTo((s.x0 + xe) / 2, s.y + 1, s.x0, s.y + 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x0 + d * 10, s.y);
    ctx.quadraticCurveTo((s.x0 + xe) / 2, s.y - 4.5, xe, s.y - 1);
    ctx.stroke();
    blob(ctx, glow('255,120,120'), xe, s.y - 1, 16, 0.6 * a);
    ctx.restore();
  }

  // 影刃：2–4 把黑紫色的刃從影池冒出來，停一下，沉回去
  function poolBlades(ctx, q) {
    if (!q.burst) return;
    const age = q.t - q.tele;
    if (age > 0.55) return;
    const up = age < 0.07 ? age / 0.07 : age < 0.2 ? 1 : Math.max(0, 1 - (age - 0.2) / 0.3);
    ctx.save();
    for (let i = 0; i < q.n; i++) {
      const f = q.n > 1 ? i / (q.n - 1) - 0.5 : 0;
      const x = q.x + f * 58 + Math.sin(q.seed + i) * 5;
      const h = (56 + ((i * 37 + q.seed * 10) % 22)) * up;
      const lean = f * 0.5 + Math.sin(q.seed * 3 + i) * 0.12;
      const w = 7 + (i % 2) * 2;
      const tx = x + Math.sin(lean) * h;
      const ty = q.y - Math.cos(lean) * h;
      ctx.beginPath();
      ctx.moveTo(x - w, q.y);
      ctx.quadraticCurveTo(x - w * 0.4 + (tx - x) * 0.5, q.y - h * 0.55, tx, ty);
      ctx.quadraticCurveTo(x + w * 0.9 + (tx - x) * 0.4, q.y - h * 0.4, x + w, q.y);
      ctx.closePath();
      ctx.fillStyle = '#140a24';
      ctx.fill();
      ctx.strokeStyle = '#8f5cf0';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(210,180,255,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.3, q.y - 4);
      ctx.quadraticCurveTo(x + (tx - x) * 0.45, q.y - h * 0.5, tx, ty);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function snowball(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y - b.r);
    // 影子
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#35405a';
    ctx.beginPath();
    ctx.ellipse(0, b.r - 1, b.r * 0.9, 4, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.rotate(b.rot);
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, TAU);
    ctx.fillStyle = '#f4f8ff';
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 背光面
    ctx.rotate(-b.rot);
    ctx.fillStyle = 'rgba(150,175,215,0.45)';
    ctx.beginPath();
    ctx.arc(b.r * 0.35, b.r * 0.35, b.r * 1.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-b.r * 0.35, -b.r * 0.4, b.r * 0.35, 0, TAU);
    ctx.fill();
    ctx.rotate(b.rot);
    // 滾動的雪紋
    ctx.strokeStyle = 'rgba(170,190,225,0.8)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      ctx.moveTo(Math.cos(a) * b.r * 0.2, Math.sin(a) * b.r * 0.2);
      ctx.quadraticCurveTo(Math.cos(a + 0.6) * b.r * 0.7, Math.sin(a + 0.6) * b.r * 0.7, Math.cos(a + 0.4) * b.r * 1.05, Math.sin(a + 0.4) * b.r * 1.05);
    }
    ctx.stroke();
    // 沾上的石子、樹枝
    for (const t of b.bits) {
      const x = Math.cos(t.a) * b.r * t.rr;
      const y = Math.sin(t.a) * b.r * t.rr;
      if (t.k === 0) {
        ctx.fillStyle = '#7a7f8c';
        ctx.beginPath();
        ctx.ellipse(x, y, 3.2 * t.s, 2.4 * t.s, t.a, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#3b3d48';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (t.k === 1) {
        ctx.strokeStyle = '#6b4a2e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 6 * t.s * Math.cos(t.a), y - 6 * t.s * Math.sin(t.a));
        ctx.lineTo(x + 6 * t.s * Math.cos(t.a), y + 6 * t.s * Math.sin(t.a));
        ctx.lineTo(x + 8 * t.s * Math.cos(t.a + 0.6), y + 8 * t.s * Math.sin(t.a + 0.6));
        ctx.stroke();
      } else {
        ctx.fillStyle = '#5c8a54';
        ctx.beginPath();
        ctx.ellipse(x, y, 3.5 * t.s, 1.6 * t.s, t.a + 1, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, TAU);
    ctx.strokeStyle = OUT();
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  }

  // 雪晶：六臂的小雪花（淡青描邊），拖一小段軌跡
  function shard(ctx, s) {
    const a = Math.min(1, (s.life - s.t) / 0.25);
    ctx.save();
    ctx.globalAlpha = a * 0.35;
    ctx.strokeStyle = '#dff2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 0.05, s.y - s.vy * 0.05);
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#4a78a8';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const an = (i / 3) * Math.PI;
      ctx.moveTo(-Math.cos(an) * s.s, -Math.sin(an) * s.s);
      ctx.lineTo(Math.cos(an) * s.s, Math.sin(an) * s.s);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  function pinecone(ctx, c) {
    ctx.save();
    // 軌跡：一小段松針綠線＋琥珀色樹液點
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#6a9a4a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x - c.vx * 0.045, c.y - c.vy * 0.045);
    ctx.stroke();
    ctx.fillStyle = '#e8a23a';
    ctx.beginPath();
    ctx.arc(c.x - c.vx * 0.03, c.y - c.vy * 0.03 + 2, 1.6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5.5, 0, 0, TAU);
    ctx.fillStyle = '#8a5a32';
    ctx.fill();
    ctx.strokeStyle = '#3a2414';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 鱗片
    ctx.strokeStyle = '#c08a52';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(i * 4 - 2, -4);
      ctx.lineTo(i * 4, 0);
      ctx.lineTo(i * 4 - 2, 4);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 狐火：藍白的芯、一片片搖曳的舌狀火焰（往移動反方向拖）、淡淡的軌跡
  function foxOrb(ctx, o) {
    const lit = o.ph === 'charge' ? o.lit : 1;
    if (lit <= 0.01) return;
    const fade = o.ph === 'fly' ? Math.min(1, (o.life - o.t) / 0.45) : 1;
    const S = 1.7 * (0.4 + 0.6 * lit);
    const sp = Math.hypot(o.vx, o.vy);
    const back = sp > 20 ? Math.atan2(-o.vy, -o.vx) : -Math.PI / 2 - Math.PI / 2; // 靜止時火舌往上
    const up = sp > 20 ? back : -Math.PI / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 軌跡
    if (o.trail.length > 4 && !lite()) {
      ctx.globalAlpha = 0.35 * fade;
      ctx.strokeStyle = '#6fd8ff';
      ctx.lineWidth = 5 * S * 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(o.trail[0], o.trail[1]);
      for (let i = 2; i < o.trail.length; i += 2) ctx.lineTo(o.trail[i], o.trail[i + 1]);
      ctx.stroke();
    }
    blob(ctx, glow('70,150,255'), o.x, o.y, 17 * S, 0.8 * fade);
    ctx.globalCompositeOperation = 'source-over'; // 火焰用一般疊色＋描邊：在雪地、白尾巴前面也看得清楚
    // 舌狀火焰
    const n = 4;
    for (let i = 0; i < n; i++) {
      const fl = Math.sin(G.time * 22 + o.seed + i * 1.9);
      const a = up + (i - (n - 1) / 2) * 0.45 + fl * 0.12;
      const L = (9 + 4 * Math.abs(fl) + (i === 1 || i === 2 ? 4 : 0)) * S;
      const w = 3.6 * S;
      const bx = o.x + Math.cos(a) * 2;
      const by = o.y + Math.sin(a) * 2;
      const tx = o.x + Math.cos(a) * L;
      const ty = o.y + Math.sin(a) * L;
      const nx = -Math.sin(a) * w;
      const ny = Math.cos(a) * w;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = i % 2 ? '#2f86f0' : '#55b8ff';
      ctx.beginPath();
      ctx.moveTo(bx + nx, by + ny);
      ctx.quadraticCurveTo(o.x + Math.cos(a) * L * 0.6 + nx * 0.9, o.y + Math.sin(a) * L * 0.6 + ny * 0.9, tx, ty);
      ctx.quadraticCurveTo(o.x + Math.cos(a) * L * 0.6 - nx * 0.9, o.y + Math.sin(a) * L * 0.6 - ny * 0.9, bx - nx, by - ny);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,50,120,0.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    // 芯（淡藍的內圈＋白芯）
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#9fe0ff';
    ctx.beginPath();
    ctx.arc(o.x, o.y, 7.5 * S, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(o.x, o.y, 5 * S * (0.9 + 0.1 * Math.sin(G.time * 30 + o.seed)), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles(ctx) {
    if (!live) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const q of PS) {
      if (!q.on || q.k === 3) continue;
      const k = q.t / q.life;
      const a = 1 - k;
      switch (q.k) {
        case 0: // 風痕
          ctx.globalAlpha = 0.7 * a;
          ctx.strokeStyle = '#e8fffa';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.quadraticCurveTo(q.x - q.rot * q.s * 0.5, q.y - 3, q.x - q.rot * q.s, q.y + 1);
          ctx.stroke();
          break;
        case 1: // 雲朵
          blob(ctx, CLOUD, q.x, q.y, q.s * (1 + k * 0.8), 0.85 * a);
          break;
        case 2: // 火花
          ctx.globalAlpha = a;
          ctx.strokeStyle = '#ffe98a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(q.x - q.vx * 0.02, q.y - q.vy * 0.02);
          ctx.stroke();
          break;
        case 4: // 樹皮屑
          ctx.globalAlpha = a;
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.rot);
          ctx.fillStyle = '#6e4a2a';
          ctx.fillRect(-q.s, -q.s * 0.5, q.s * 2, q.s);
          ctx.strokeStyle = '#2e1c10';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(-q.s, -q.s * 0.5, q.s * 2, q.s);
          ctx.restore();
          break;
        case 5: // 松鱗
          ctx.globalAlpha = a;
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.rot);
          ctx.fillStyle = '#9a6a3a';
          ctx.beginPath();
          ctx.moveTo(-q.s, 0);
          ctx.lineTo(0, -q.s * 0.8);
          ctx.lineTo(q.s, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        case 6: // 松針
          ctx.globalAlpha = a;
          ctx.strokeStyle = '#5a8a3e';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(q.x - Math.cos(q.rot) * q.s, q.y - Math.sin(q.rot) * q.s);
          ctx.lineTo(q.x + Math.cos(q.rot) * q.s, q.y + Math.sin(q.rot) * q.s);
          ctx.stroke();
          break;
        case 7: // 雪流（淡藍的邊讓白雪在雪地上也看得到）
          ctx.globalAlpha = 0.85 * a;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(q.x - q.rot * q.s, q.y);
          ctx.strokeStyle = 'rgba(90,140,200,0.55)';
          ctx.lineWidth = 3.4;
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.fillStyle = '#eaf6ff';
          ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
          break;
        case 8: // 雪團
          blob(ctx, CLOUD, q.x, q.y, q.s * (1 + k), 0.8 * a);
          break;
        case 9: // 狐火星
          ctx.globalAlpha = a;
          ctx.fillStyle = '#bff0ff';
          ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
          break;
        default:
          break;
      }
    }
    ctx.restore();
  }

  // 玩家被吹飛時身上的霜色：同一隻獅子染成淡青，疊在玩家上面
  function frostTint(ctx, f) {
    const P = G.player;
    if (!P || P.dead) return;
    let state = 'idle';
    let p = 0;
    if (P.action) {
      state = P.action.type === 'attack' ? 'attack' : P.action.type === 'lockon' ? 'cast' : P.action.type;
      p = P.action.t / P.action.dur;
    } else if (P.hurtT > 0) state = 'hurt';
    else if (!P.onGround) state = P.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(P.vx) > 20) state = 'walk';
    const pm = A.mode;
    const pc = A.modeColor;
    const pa = A.modeAmt;
    ctx.save();
    ctx.globalAlpha = 0.4 * Math.min(1, f / 0.4);
    A.mode = 'tint';
    A.modeColor = '#9fd6ff';
    A.modeAmt = 0.6;
    try {
      A.drawLion(ctx, P.x, P.y, P.dir, { state, t: P.t, p, form: P.form, onGround: P.onGround });
    } finally {
      A.mode = pm;
      A.modeColor = pc;
      A.modeAmt = pa;
    }
    ctx.restore();
    // 身上的冰屑
    if (Math.random() < 0.5) {
      const q = spawn(8, P.x + R(-16, 16), P.y - R(10, 60), R(-30, 30), R(-20, 20), R(0.3, 0.5), R(2, 4));
      if (q) q.drag = 2;
    }
  }

  function anyLive() {
    const M = MM();
    if (!M) return false;
    if (live || SB.length || M.bolts.length || M.pools.length || M.iai.length || M.cones.length || M.orbs.length || M.frost > 0 || (M.balls && M.balls.length) || (M.shards && M.shards.length)) return true;
    const mons = G.world.monsters;
    for (let i = 0; i < mons.length; i++) {
      const id = mons[i].id;
      if (id === 'echoferret' || id === 'crystalowl' || id === 'shadowwolf' || id === 'dreamsheep' || id === 'heartcedar' || id === 'shieldbear' || id === 'avalanchehare') return true;
    }
    return false;
  }

  if (A.skillFx) {
    A.skillFx.add({
      live: anyLive,
      step(dt) {
        if (!G.world || !G.world.monsters) return;
        step(dt);
        lastT = G.time;
      },
      back: drawBack,
      front: drawFront,
      clear() {
        for (const q of PS) q.on = false;
        live = 0;
        SB.length = 0;
      },
    });
  }
  void lastT;
})();
