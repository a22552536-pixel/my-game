// 終章怪物動作重做的特效（邏輯在 js/game/mobmotion5.js，這裡只讀 G.mobMotion5、怪物與玩家身上的表現欄位）：
//   虛空鯨：大裂縫（裂紋預警 → 張開的星空裂口、發光的鋸齒邊、被吸進去的星塵）、瞬移的小裂縫、玩家被吸時的拉扯線
//   鏡麒麟：分身（本體的樣子、半透明、稜鏡色差邊、閃爍）、玻璃碎片、六角鏡面、折射光的點線預警與光束
//   時停蝶：地上＋空中的錶盤預警（滴答的指針、金粉）、停住的空間、被停住的玩家（灰褐色、錶環、懸停的粒子）
//   時之聖甲蟲：日晷（地上的錶面、掃過去的影子指針、太陽盤投下的光）、被快轉的怪物（速度線、快轉的小錶盤）
//   時之鳳凰：倒流（倒燃的火痕、往上流的沙、舊位置的殘影收回來）、沙漏印記、沙漏羽（停在半空時的錶環與瞄準線）
//   銜尾蛇：符文軌道、輪迴的符文閃光、永劫回歸的縮小符文圈
//   重力魔眼：重力崩塌的透鏡（暗色環、往內捲的星光螺旋、浮起繞轉的碎石、中心的崩塌圈）、內爆、玩家身上的重力壓線
//   雙生天馬：飛上天的星光羽毛、畫面頂端的小星、落點星印與光柱、俯衝的光痕、貼地的衝擊波
//   星座魚：流星的星印預警、斜落的發光岩塊與星尾、爆開的星屑、唱歌時的光、游過的星塵、星座線
// 畫在 A.skillFx 的 back（地面上的東西）與 front（其餘）兩層；另外包住 A.drawMonster 畫分身、隱形、快轉、俯衝。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const TAU = Math.PI * 2;
  const PI = Math.PI;
  const lite = () => !!G.lowFx;
  const R = (a, b) => a + (b - a) * Math.random();
  const MM = () => G.mobMotion5;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
  const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const rgba = (c, a) => 'rgba(' + c + ',' + clamp(a, 0, 1).toFixed(3) + ')';

  // ── 粒子池 ──
  // 0 玻璃片 1 金粉 2 符文 3 星光 4 沙 5 火星 6 碎石 7 虛空塵 8 星羽
  const N = 420;
  const PS = [];
  for (let i = 0; i < N; i++) PS.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, rot: 0, vr: 0, g: 0, drag: 0, c: '255,255,255', h: 0 });
  let live = 0;
  let pi = 0;
  function spawn(k, x, y, vx, vy, life, s, c) {
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
      q.c = c || '255,255,255';
      q.h = Math.random();
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
  function blob(ctx, col, x, y, r, a) {
    if (a <= 0.01 || r <= 0) return;
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * Math.min(1, a);
    ctx.drawImage(glow(col), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = ga;
  }
  function star4(ctx, x, y, r, col, a) {
    ctx.fillStyle = rgba(col, a);
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }
  function star5(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + (i / 10) * TAU - PI / 2;
      const rr = i % 2 ? r * 0.42 : r;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  const PRISM = ['255,120,140', '255,210,120', '150,255,170', '120,220,255', '190,150,255'];

  // ── 事件 → 粒子 ──
  const pops = []; // 小裂縫、閃光等短暫的東西 {k,x,y,t,life,big}
  function readEvents() {
    const M = MM();
    const L = lite();
    for (const e of M.ev) {
      if (e.k === 'glass') {
        const n = Math.round((e.n || 8) * (L ? 0.5 : 1));
        for (let i = 0; i < n; i++) {
          const a = R(0, TAU);
          const v = R(80, e.big ? 300 : 200);
          const q = spawn(0, e.x + R(-24, 24), e.y + R(-30, 30), Math.cos(a) * v, Math.sin(a) * v - 80, R(0.5, 0.9), R(4, e.big ? 10 : 7), e.gold ? '255,226,150' : PRISM[i % 5]);
          if (q) q.g = 520;
        }
        pops.push({ k: 'glassflash', x: e.x, y: e.y, t: 0, life: 0.25 });
      } else if (e.k === 'riftpop') pops.push({ k: 'riftpop', x: e.x, y: e.y, t: 0, life: 0.45 });
      else if (e.k === 'loopflash') {
        pops.push({ k: 'loopflash', x: e.x, y: e.y, t: 0, life: 0.4 });
        for (let i = 0; i < (L ? 6 : 14); i++) {
          const a = R(0, TAU);
          spawn(2, e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, Math.cos(a) * R(60, 160), Math.sin(a) * R(60, 160) - 40, R(0.4, 0.7), R(3, 5), i % 2 ? '184,255,240' : '255,230,160');
        }
      } else if (e.k === 'rwstart') pops.push({ k: 'rwring', x: e.x, y: e.y, t: 0, life: 1.0, rev: true });
      else if (e.k === 'rwsnap') {
        pops.push({ k: 'rwring', x: e.x, y: e.y, t: 0, life: 0.45 });
        for (let i = 0; i < (L ? 6 : 14); i++) spawn(4, e.x + R(-30, 30), e.y + R(-10, 30), R(-20, 20), R(-160, -60), R(0.5, 0.9), R(2, 3.5), '255,220,140');
      } else if (e.k === 'featherfreeze') pops.push({ k: 'fring', x: e.x, y: e.y, t: 0, life: 0.3 });
      else if (e.k === 'markclose') pops.push({ k: 'markclose', x: e.x, y: e.y, t: 0, life: 0.35 });
      else if (e.k === 'implode') {
        pops.push({ k: 'implode', x: e.x, y: e.y, t: 0, life: 0.45 });
        for (let i = 0; i < (L ? 8 : 20); i++) {
          const a = R(0, TAU);
          const v = R(160, 380);
          const q = spawn(6, e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, Math.cos(a) * v, Math.sin(a) * v - 60, R(0.6, 1.0), R(3, 7), '90,70,130');
          if (q) q.g = 600;
        }
      } else if (e.k === 'stomp') {
        pops.push({ k: 'stomp', x: e.x, y: e.y, t: 0, life: 0.4 });
        for (let i = 0; i < (L ? 6 : 14); i++) {
          const a = -PI / 2 + R(-1.2, 1.2);
          const q = spawn(3, e.x + R(-20, 20), e.y - 4, Math.cos(a) * R(80, 260), Math.sin(a) * R(80, 260), R(0.4, 0.7), R(3, 6), i % 2 ? '255,236,160' : '220,210,255');
          if (q) q.g = 400;
        }
      } else if (e.k === 'meteor') {
        pops.push({ k: 'meteor', x: e.x, y: e.y, t: 0, life: e.big ? 0.5 : 0.35, big: e.big });
        const n = (e.big ? 18 : 9) * (L ? 0.5 : 1);
        for (let i = 0; i < n; i++) {
          const a = -PI / 2 + R(-1.3, 1.3);
          const v = R(90, e.big ? 330 : 230);
          const q = spawn(i % 3 ? 3 : 6, e.x + R(-10, 10), e.y - 4, Math.cos(a) * v, Math.sin(a) * v, R(0.35, 0.7), R(2.5, e.big ? 6 : 4.5), i % 2 ? '255,230,150' : '140,210,255');
          if (q) q.g = 500;
        }
      }
    }
    M.ev.length = 0;
  }

  // ── 每幀：粒子與持續的噴發 ──
  function step(dt) {
    const M = MM();
    if (!M) return;
    readEvents();
    const L = lite();
    const P = G.player;
    for (const q of PS) {
      if (!q.on) continue;
      q.t += dt;
      if (q.t >= q.life) {
        q.on = false;
        live--;
        continue;
      }
      q.vy += q.g * dt;
      if (q.drag) {
        const f = Math.max(0, 1 - q.drag * dt);
        q.vx *= f;
        q.vy *= f;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      pops[i].t += dt;
      if (pops[i].t >= pops[i].life) pops.splice(i, 1);
    }
    const rate = L ? 0.4 : 1;
    // 虛空裂縫：被吸進去的星塵
    for (const r of M.rifts) {
      if (r.t < r.tele * 0.5 || r.t > r.tele + r.pull) continue;
      if (Math.random() < 0.9 * rate) {
        const a = R(0, TAU);
        const d = R(70, 150);
        const q = spawn(7, r.x + Math.cos(a) * d, r.y + Math.sin(a) * d * 0.9, 0, 0, R(0.45, 0.7), R(1.5, 3), Math.random() < 0.5 ? '232,160,255' : '255,242,200');
        if (q) {
          q.vx = (r.x - q.x) / q.life;
          q.vy = (r.y - q.y) / q.life;
        }
      }
    }
    // 時停：金粉
    for (const s of M.stops) {
      if (s.t > s.tele + s.hold) continue;
      if (Math.random() < (s.fired ? 0.5 : 1.2) * rate) {
        const a = R(0, TAU);
        const d = R(0.2, 1) * s.r;
        const q = spawn(1, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, s.fired ? 0 : R(-10, 10), s.fired ? 0 : R(-30, -10), s.fired ? R(0.8, 1.2) : R(0.6, 1.0), R(1.2, 2.6), '255,226,150');
        if (q) q.stop = s;
      }
    }
    // 被停住的玩家：懸停的粒子
    if (P.m5stop && Math.random() < 0.5 * rate) spawn(1, P.x + R(-26, 26), P.y - R(6, 70), 0, 0, R(0.5, 0.9), R(1.2, 2.2), '230,210,170');
    // 重力：碎石從地上浮起來
    for (const w of M.wells) {
      if (w.t > w.tele + w.dur) continue;
      if (Math.random() < 0.6 * rate) {
        const q = spawn(6, w.x + R(-w.r, w.r) * 0.9, w.gy - 2, 0, R(-120, -60), R(0.5, 0.9), R(2, 4), '110,90,150');
        if (q) q.drag = 1;
      }
    }
    // 倒流：往上流的沙、倒燃的火星
    for (const m of G.world.monsters) {
      if (m.dead) continue;
      if (m.id === 'hourowl' && m.fx.rewind) {
        const y = m.y - (m.hover || 0) - 50;
        if (Math.random() < 1.4 * rate) spawn(4, m.x + R(-40, 40), y + R(10, 50), R(-8, 8), R(-150, -80), R(0.5, 0.9), R(1.6, 3), '255,214,130');
        if (m.rwPath && Math.random() < 1.0 * rate) {
          const p = m.rwPath[Math.min(m.rwPath.length - 1, Math.floor(R(m.rwK || 0, 1) * (m.rwPath.length - 1)) + 1)];
          if (p) {
            const q = spawn(5, p[0] + R(-10, 10), m.y - p[1] - 50 + R(-10, 10), 0, R(20, 60), R(0.3, 0.6), R(2, 4), Math.random() < 0.5 ? '255,154,52' : '255,217,94');
            if (q) q.drag = 2;
          }
        }
      }
      // 天馬：飛上天時的星光羽毛、俯衝的星尾
      if (m.id === 'parallelfox' && (m.fx.soar || m.fx.dive) && (m.hover || 0) < 700 && Math.random() < 0.9 * rate) {
        const q = spawn(8, m.x + R(-20, 20), m.y - (m.hover || 0) - R(10, 60), R(-30, 30), m.fx.dive ? R(-60, -20) : R(20, 80), R(0.6, 1.1), R(3, 5), Math.random() < 0.5 ? '255,236,170' : '220,230,255');
        if (q) q.drag = 1.5;
      }
      // 星座魚：游過的星塵
      if (m.id === 'constellfish' && Math.abs(m.vx) > 20 && Math.random() < 0.8 * rate) {
        const q = spawn(3, m.x - m.dir * 50 + R(-8, 8), m.y - (m.hover || 0) - 40 + R(-14, 14), -m.dir * R(10, 40), R(-10, 10), R(0.6, 1.1), R(2, 3.5), Math.random() < 0.5 ? '255,236,150' : '150,210,255');
        if (q) q.drag = 1;
      }
      if (m.id === 'constellfish' && m.fx.sing > 0.3 && Math.random() < 0.6 * rate) {
        const q = spawn(3, m.x + R(-30, 30), m.y - (m.hover || 0) - 60, R(-20, 20), R(-70, -40), R(0.6, 0.9), R(2.5, 4), '255,236,150');
        if (q) q.drag = 0.5;
      }
      // 被快轉的怪物：身後的風痕
      if (m.hasteT > 0 && Math.abs(m.vx) > 10 && Math.random() < 0.4 * rate) spawn(1, m.x - U.sign(m.vx) * 30, m.y - (m.hover || 0) - R(10, m.h * (m.scale || 1)), -U.sign(m.vx) * 60, 0, 0.3, R(1.5, 2.5), '255,214,120');
    }
  }

  // ═════ 虛空裂縫 ═════
  function riftShape(ctx, r, w, h) {
    const n = 14;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const y = -h / 2 + u * h;
      const env = Math.sin(u * PI);
      const j = (hash(r.seed + i) - 0.5) * 0.9;
      const x = w * env * (0.6 + 0.4 * Math.abs(j) * 2) + (i % 2 ? 3 : -2) * env;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    for (let i = n; i >= 0; i--) {
      const u = i / n;
      const y = -h / 2 + u * h;
      const env = Math.sin(u * PI);
      const j = (hash(r.seed + 50 + i) - 0.5) * 0.9;
      const x = -w * env * (0.6 + 0.4 * Math.abs(j) * 2) - (i % 2 ? -2 : 3) * env;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function drawRift(ctx, r, t) {
    const k = r.t;
    const tele = r.tele;
    const endP = r.tele + r.pull;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.tilt);
    if (k < tele) {
      // 裂紋一段一段長出來（鋸齒線），邊上迸出細火花
      const g = ease(k / tele);
      const h = r.h * (0.25 + 0.75 * g);
      blob(ctx, '192,122,255', 0, 0, 30 + g * 50, 0.35 + g * 0.3);
      ctx.strokeStyle = rgba('232,200,255', 0.5 + 0.5 * g);
      ctx.lineWidth = 1.5 + g * 2;
      ctx.beginPath();
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const x = (hash(r.seed + i * 3) - 0.5) * 14 * g;
        const y = -h / 2 + u * h;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      // 分叉的小裂紋
      ctx.lineWidth = 1;
      for (let i = 2; i < 9; i += 2) {
        const y = -h / 2 + (i / 10) * h;
        const s = i % 4 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s * 14 * g, y - 8 * g);
        ctx.stroke();
      }
      // 最後 0.15 秒閃一下
      if (k > tele - 0.15) blob(ctx, '255,255,255', 0, 0, 40, 0.5 * Math.sin(((k - tele + 0.15) / 0.15) * PI));
      ctx.restore();
      return;
    }
    let open;
    if (k < endP) open = Math.min(1, (k - tele) / 0.18);
    else open = Math.max(0, 1 - (k - endP) / r.close);
    const w = 8 + 28 * ease(open);
    const h = r.h * (0.85 + 0.15 * open);
    // 外面的光暈
    blob(ctx, '138,80,255', 0, 0, h * 0.75, 0.55 * open);
    // 裂口：深色星空
    riftShape(ctx, r, w, h);
    const gr = ctx.createLinearGradient(-w, 0, w, 0);
    gr.addColorStop(0, '#1a0838');
    gr.addColorStop(0.5, '#03010a');
    gr.addColorStop(1, '#1a0838');
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 裡面的星空（慢慢旋進去）
    const nS = lite() ? 10 : 22;
    for (let i = 0; i < nS; i++) {
      const u = (hash(r.seed + i * 7) + t * 0.08 * (i % 3 ? 1 : -1)) % 1;
      const y = -h / 2 + u * h;
      const x = (hash(r.seed + i * 11) - 0.5) * w * 1.6;
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + i);
      ctx.fillStyle = i % 4 === 0 ? rgba('255,226,160', tw) : i % 3 === 0 ? rgba('90,232,255', tw) : rgba('255,255,255', tw);
      ctx.fillRect(x - 1, y - 1, i % 5 === 0 ? 2.6 : 1.6, i % 5 === 0 ? 2.6 : 1.6);
    }
    blob(ctx, '255,106,208', (Math.sin(t) * w) / 3, -h * 0.15, w * 1.2, 0.35);
    blob(ctx, '90,232,255', (-Math.sin(t * 0.7) * w) / 3, h * 0.2, w, 0.3);
    ctx.restore();
    // 發光的鋸齒邊
    riftShape(ctx, r, w, h);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba('192,122,255', 0.5 * open);
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = rgba('240,210,255', 0.95 * open);
    ctx.lineWidth = 2;
    ctx.stroke();
    // 吸引中：往內收的環
    if (k < endP && !lite()) {
      for (let i = 0; i < 3; i++) {
        const q = 1 - ((t * 1.3 + i / 3) % 1);
        ctx.strokeStyle = rgba('200,160,255', (1 - q) * 0.45 * open);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, w + 20 + q * 90, (h / 2) * (0.7 + q * 0.5), 0, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawPullLines(ctx, P, v, t) {
    const d = U.sign(v);
    const a = Math.min(1, Math.abs(v) / 165);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const q = (t * 2.2 + i / 5) % 1;
      const y = P.y - 10 - i * 12;
      const x = P.x - d * (40 - q * 70);
      ctx.strokeStyle = rgba('200,160,255', (1 - q) * 0.7 * a);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + d * 18, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ═════ 鏡麒麟：鏡面、折射光 ═════
  function hexPath(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, -h / 2 + w * 0.35);
    ctx.lineTo(w / 2, h / 2 - w * 0.35);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-w / 2, h / 2 - w * 0.35);
    ctx.lineTo(-w / 2, -h / 2 + w * 0.35);
    ctx.closePath();
  }
  function drawPane(ctx, p, t) {
    const inK = ease(Math.min(1, p.t / 0.25));
    const outK = clamp((p.life - p.t) / 0.3, 0, 1);
    const a = Math.min(inK, outK);
    if (a <= 0) return;
    const w = 36;
    const h = p.h * inK;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot + Math.sin(t * 1.5 + p.seed) * 0.03);
    ctx.globalAlpha *= a;
    blob(ctx, '190,236,255', 0, 0, h * 0.6, 0.45);
    hexPath(ctx, w, h);
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, 'rgba(230,248,255,0.55)');
    g.addColorStop(0.5, 'rgba(140,200,240,0.3)');
    g.addColorStop(1, 'rgba(210,240,255,0.5)');
    ctx.fillStyle = g;
    ctx.fill();
    // 稜鏡色的邊
    const e = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    PRISM.forEach((c, i) => e.addColorStop(i / 4, rgba(c, 0.95)));
    ctx.strokeStyle = e;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 斜斜的反光
    ctx.save();
    hexPath(ctx, w, h);
    ctx.clip();
    const sx = ((t * 0.6 + p.seed) % 1.6) - 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(sx * w - 6, -h / 2);
    ctx.lineTo(sx * w + 4, -h / 2);
    ctx.lineTo(sx * w - 14, h / 2);
    ctx.lineTo(sx * w - 24, h / 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function polyline(ctx, pts, upto) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (upto != null && i > upto) {
        const f = upto - (i - 1);
        const a = pts[i - 1];
        const b = pts[i];
        if (f > 0) ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
        break;
      }
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
  }
  function drawBeam(ctx, b, t) {
    const pts = b.pts;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (b.t < b.tele) {
      // 點線預警：一段一段描出來（0.25 秒內畫完整條），之後整條閃爍；最後 0.2 秒變亮
      const k = b.t / b.tele;
      const draw = Math.min(1, b.t / 0.25) * (pts.length - 1);
      const late = b.t > b.tele - 0.2;
      ctx.strokeStyle = rgba('220,245,255', late ? 0.6 + 0.4 * Math.sin(b.t * 60) : 0.45 + 0.3 * k);
      ctx.lineWidth = 1.6 + k * 1.4;
      ctx.setLineDash([3, 7]);
      ctx.lineDashOffset = -t * 50;
      polyline(ctx, pts, draw);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 1; i < pts.length - 1; i++) blob(ctx, '220,245,255', pts[i][0], pts[i][1], 10 + 8 * k, 0.8);
      // 終點：玩家原本的位置
      const e = pts[pts.length - 1];
      ctx.strokeStyle = rgba('220,245,255', 0.5 + 0.4 * k);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e[0], e[1], 22 - 8 * k, 0, TAU);
      ctx.stroke();
      blob(ctx, '220,245,255', pts[0][0], pts[0][1], 8 + 12 * k, 0.9);
    } else {
      const k = clamp(1 - (b.t - b.tele) / (b.life - b.tele), 0, 1);
      const w = 14 * k + 3;
      if (!lite()) {
        PRISM.forEach((c, i) => {
          ctx.strokeStyle = rgba(c, 0.35 * k);
          ctx.lineWidth = w + 10;
          ctx.save();
          ctx.translate((i - 2) * 1.5, (i - 2) * 1.5);
          polyline(ctx, pts);
          ctx.stroke();
          ctx.restore();
        });
      }
      ctx.strokeStyle = rgba('200,240,255', 0.7 * k);
      ctx.lineWidth = w + 4;
      polyline(ctx, pts);
      ctx.stroke();
      ctx.strokeStyle = rgba('255,255,255', k);
      ctx.lineWidth = Math.max(1.5, w * 0.45);
      polyline(ctx, pts);
      ctx.stroke();
      for (let i = 1; i < pts.length; i++) blob(ctx, '255,255,255', pts[i][0], pts[i][1], 26 * k + 8, 0.9 * k);
    }
    ctx.restore();
  }
  function drawCBeam(ctx, b, t) {
    ctx.save();
    ctx.lineCap = 'round';
    if (b.t < b.tele) {
      ctx.strokeStyle = rgba('200,235,255', 0.25);
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -t * 40;
    } else {
      const k = clamp(1 - (b.t - b.tele) / (b.life - b.tele), 0, 1);
      ctx.strokeStyle = rgba('210,240,255', 0.4 * k);
      ctx.lineWidth = 2 + 4 * k;
    }
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    ctx.restore();
  }

  // ═════ 時停：錶盤 ═════
  function clockFace(ctx, x, y, r, a, t, hands, gold, ticks) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = rgba(gold, 0.9 * a);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba(gold, 0.45 * a);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 9, 0, TAU);
    ctx.stroke();
    const n = ticks || 12;
    for (let i = 0; i < n; i++) {
      const q = (i / n) * TAU;
      const big = i % 3 === 0;
      ctx.lineWidth = big ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(q) * (r - (big ? 16 : 11)), Math.sin(q) * (r - (big ? 16 : 11)));
      ctx.lineTo(Math.cos(q) * (r - 3), Math.sin(q) * (r - 3));
      ctx.stroke();
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('255,244,210', a);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(hands[0]) * r * 0.5, Math.sin(hands[0]) * r * 0.5);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(hands[1]) * r * 0.8, Math.sin(hands[1]) * r * 0.8);
    ctx.stroke();
    ctx.fillStyle = rgba('255,244,210', a);
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function stopHands(s) {
    // 滴答：秒針一格一格跳（每 0.075 秒一格），停住後指針不動
    const tt = Math.min(s.t, s.tele);
    const step = Math.floor(tt / 0.075);
    return [-PI / 2 + tt * 1.2, -PI / 2 + step * (TAU / 12)];
  }
  function drawStopBack(ctx, s, t) {
    const a = s.t < s.tele ? Math.min(1, s.t / 0.2) : s.t < s.tele + s.hold ? 1 : clamp(1 - (s.t - s.tele - s.hold) / s.fade, 0, 1);
    ctx.save();
    ctx.translate(s.x, s.gy);
    ctx.scale(1, 0.24);
    if (s.fired) {
      ctx.fillStyle = rgba('120,96,60', 0.18 * a);
      ctx.beginPath();
      ctx.arc(0, 0, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = rgba('255,214,120', 0.75 * a);
    ctx.lineWidth = 3 / 0.24;
    ctx.beginPath();
    ctx.arc(0, 0, s.r, 0, TAU);
    ctx.stroke();
    // 預警時的倒數弧：跑完一圈就停
    if (!s.fired) {
      ctx.strokeStyle = rgba('255,244,200', 0.95);
      ctx.lineWidth = 5 / 0.24;
      ctx.beginPath();
      ctx.arc(0, 0, s.r, -PI / 2, -PI / 2 + (s.t / s.tele) * TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawStopFront(ctx, s, t) {
    const hold = s.fired && s.t < s.tele + s.hold;
    const a = !s.fired ? Math.min(1, s.t / 0.2) * (0.55 + 0.45 * (s.t / s.tele)) : hold ? 1 : clamp(1 - (s.t - s.tele - s.hold) / s.fade, 0, 1);
    if (a <= 0) return;
    if (hold) {
      // 停住的空間：圈裡是一片淡淡的灰褐色（局部，不是全螢幕）
      ctx.save();
      ctx.fillStyle = rgba('150,120,80', 0.14);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (!s.fired) blob(ctx, '255,214,120', s.x, s.y, s.r * 0.9, 0.12 + 0.18 * (s.t / s.tele));
    clockFace(ctx, s.x, s.y, s.r, a * (hold ? 0.95 : 0.8), t, stopHands(s), '255,214,120');
    if (!s.fired && s.t > s.tele - 0.2) blob(ctx, '255,244,200', s.x, s.y, s.r * 0.5, 0.35 * Math.sin(((s.t - s.tele + 0.2) / 0.2) * PI));
  }
  function drawFrozenPlayer(ctx, P, t) {
    const S = P.m5stop;
    const k = clamp(S.t / 1.0, 0, 1);
    let state = 'idle';
    let p = 0;
    if (P.action) {
      state = P.action.type === 'attack' ? 'attack' : P.action.type === 'lockon' ? 'cast' : P.action.type;
      p = P.action.t / P.action.dur;
    } else if (P.hurtT > 0) state = 'hurt';
    else if (!P.onGround) state = P.vy < 0 ? 'jump' : 'fall';
    const pm = A.mode;
    const pc = A.modeColor;
    const pa = A.modeAmt;
    ctx.save();
    ctx.globalAlpha = 0.72;
    A.mode = 'tint';
    A.modeColor = '#a89478';
    A.modeAmt = 0.85;
    try {
      A.drawLion(ctx, P.x, P.y, P.dir, { state, t: P.t, p, form: P.form, onGround: P.onGround });
    } finally {
      A.mode = pm;
      A.modeColor = pc;
      A.modeAmt = pa;
    }
    ctx.restore();
    // 錶環：剩下的時間是一圈金色的弧
    const cy = P.y - 34;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,226,150,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(P.x, cy, 44, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,170,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(P.x, cy, 44, -PI / 2, -PI / 2 + k * TAU);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const q = (i / 12) * TAU;
      ctx.strokeStyle = 'rgba(255,226,150,0.7)';
      ctx.lineWidth = i % 3 ? 1 : 2;
      ctx.beginPath();
      ctx.moveTo(P.x + Math.cos(q) * 38, cy + Math.sin(q) * 38);
      ctx.lineTo(P.x + Math.cos(q) * 44, cy + Math.sin(q) * 44);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ═════ 聖甲蟲：日晷 ═════
  function drawDial(ctx, d, t) {
    const inA = Math.min(1, d.t / d.push);
    const outA = clamp((d.life - d.t) / 0.5, 0, 1);
    const a = Math.min(inA, outA);
    const m = d.m;
    // 太陽盤投下的光
    if (m && !m.dead && d.t < d.push + d.sweep) {
      const sx = m.x + (m.dir || 1) * 6;
      const sy = m.y - 70 * (m.scale || 1);
      const g = ctx.createLinearGradient(sx, sy, sx, d.y);
      g.addColorStop(0, rgba('255,236,160', 0.35 * a));
      g.addColorStop(1, rgba('255,214,120', 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy);
      ctx.lineTo(sx + 10, sy);
      ctx.lineTo(sx + d.r * 0.6, d.y);
      ctx.lineTo(sx - d.r * 0.6, d.y);
      ctx.closePath();
      ctx.fill();
      blob(ctx, '255,226,140', sx, sy, 34, 0.7 * a);
    }
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(1, 0.26);
    ctx.fillStyle = rgba('255,214,120', 0.1 * a);
    ctx.beginPath();
    ctx.arc(0, 0, d.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba('255,208,90', 0.85 * a);
    ctx.lineWidth = 3 / 0.26;
    ctx.stroke();
    ctx.strokeStyle = rgba('255,208,90', 0.4 * a);
    ctx.lineWidth = 1.5 / 0.26;
    ctx.beginPath();
    ctx.arc(0, 0, d.r * 0.82, 0, TAU);
    ctx.stroke();
    // 時刻刻度（只畫後半圈：日晷的錶面）
    for (let i = 0; i <= 12; i++) {
      const q = PI + (i / 12) * PI;
      ctx.strokeStyle = rgba('255,226,150', 0.8 * a);
      ctx.lineWidth = (i % 3 ? 2 : 4) / 0.26;
      ctx.beginPath();
      ctx.moveTo(Math.cos(q) * d.r * 0.84, Math.sin(q) * d.r * 0.84);
      ctx.lineTo(Math.cos(q) * d.r * 0.98, Math.sin(q) * d.r * 0.98);
      ctx.stroke();
    }
    // 影子指針：從左掃到右，後面拖一片陰影
    const k = clamp((d.t - d.push) / d.sweep, 0, 1);
    if (d.t >= d.push) {
      const q = PI + k * PI;
      ctx.fillStyle = rgba('60,36,20', 0.28 * a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, d.r * 0.97, PI, q);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba('40,24,12', 0.8 * a);
      ctx.lineWidth = 7 / 0.26;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(q) * d.r * 0.97, Math.sin(q) * d.r * 0.97);
      ctx.stroke();
      ctx.strokeStyle = rgba('255,236,170', 0.8 * a);
      ctx.lineWidth = 2 / 0.26;
      ctx.stroke();
    }
    ctx.restore();
  }
  // 被快轉的怪物：速度線＋快轉的小錶盤（畫在怪物後面）
  function drawHaste(ctx, m, t) {
    const sc = m.scale || 1;
    const y0 = m.y - (m.hover || 0);
    const h = m.h * sc;
    const d = U.sign(m.vx) || m.dir || 1;
    const a = Math.min(1, m.hasteT / 0.5);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const q = (t * 3 + i * 0.27) % 1;
      const y = y0 - h * (0.2 + i * 0.2);
      const x = m.x - d * (m.w * sc * 0.45 + q * 30);
      ctx.strokeStyle = rgba('255,214,120', (1 - q) * 0.75 * a);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - d * 22, y);
      ctx.stroke();
    }
    const cx = m.x - d * m.w * sc * 0.25;
    const cy = y0 - h - 14;
    clockFace(ctx, cx, cy, 11, 0.85 * a, t, [t * 9, t * 26], '255,214,120', 4);
    ctx.restore();
  }

  // ═════ 時之鳳凰 ═════
  function drawRewind(ctx, m, t) {
    const P = m.rwPath;
    if (!P || P.length < 2) return;
    const k = m.rwK || 0;
    const hv = (p) => m.y - p[1] - 50;
    // 倒燃的火痕：從現在的位置往「還沒倒回去」的舊位置拖出去，越遠越淡
    const f = k * (P.length - 1);
    const i0 = Math.min(P.length - 1, Math.floor(f) + 1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? 'rgba(255,248,216,0.8)' : 'rgba(255,120,40,0.45)';
      ctx.lineWidth = pass ? 3 : 12;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - (m.hover || 0) - 50);
      for (let i = i0; i < P.length; i++) ctx.lineTo(P[i][0], hv(P[i]));
      ctx.stroke();
    }
    // 錶面倒轉的小箭頭沿路
    for (let i = i0; i < P.length; i += 3) blob(ctx, '255,180,80', P[i][0], hv(P[i]), 14, 0.5);
    ctx.restore();
    // 舊位置的殘影：在路線盡頭等著，本體倒回去和它重疊
    const end = P[P.length - 1];
    const ghost = Object.create(m);
    Object.assign(ghost, { x: end[0], hover: end[1], fx: Object.assign({}, m.fx, { rewind: 0 }), hurtFlash: 0, hurtT: 0, elite: false, shiny: false, V: null, variant: null, dead: false, deadT: 0, squash: 0, pull: 0, rcl: 0 });
    ctx.save();
    ctx.globalAlpha = 0.28 + 0.2 * k;
    const pm = A.mode;
    A.mode = 'tint';
    A.modeColor = '#ffd98a';
    A.modeAmt = 0.6;
    try {
      rawDraw(ctx, ghost);
    } finally {
      A.mode = pm;
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function drawHourglass(ctx, m, t) {
    const k = m.fx.hglass || 0;
    const x = m.x + (m.dir || 1) * 44;
    const y = m.y - (m.hover || 0) - 56;
    const s = 0.6 + 0.4 * ease(k);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha *= Math.min(1, k * 2);
    blob(ctx, '255,217,138', 0, 0, 40, 0.6);
    clockFace(ctx, 0, 0, 30, 0.8, t, [-t * 3, -t * 9], '255,217,138', 12);
    ctx.fillStyle = 'rgba(255,240,200,0.35)';
    ctx.strokeStyle = 'rgba(255,226,150,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -18);
    ctx.lineTo(11, -18);
    ctx.lineTo(2, 0);
    ctx.lineTo(11, 18);
    ctx.lineTo(-11, 18);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 沙：上半的沙往下流
    ctx.fillStyle = 'rgba(255,200,90,0.95)';
    const top = 1 - k;
    ctx.beginPath();
    ctx.moveTo(-8 * top, -2 - 13 * top);
    ctx.lineTo(8 * top, -2 - 13 * top);
    ctx.lineTo(0, -1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-9 * k, 17);
    ctx.lineTo(9 * k, 17);
    ctx.lineTo(0, 17 - 12 * k);
    ctx.fill();
    ctx.fillRect(-0.6, -1, 1.2, 17);
    ctx.restore();
  }
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.PROJ_DRAW.hourfeather = function (ctx, p, t) {
    // 呼叫時 ctx 已經平移到投射物的位置（js/art/npcs.js 的 drawProjectile）：這裡用區域座標
    const a = p.t > p.life - (p.fade || 0.25) ? clamp((p.life - p.t) / (p.fade || 0.25), 0, 1) : 1;
    ctx.save();
    ctx.globalAlpha *= a;
    if (p.ph === 'hold') {
      const v = p.vol;
      const k = (p.t - 0.3) / 0.6;
      // 停在半空：小錶環＋往「停住那一刻玩家的位置」的瞄準線
      ctx.strokeStyle = rgba('255,226,150', 0.35 + 0.5 * k);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(v.tx - p.x, v.ty - p.y);
      ctx.stroke();
      ctx.setLineDash([]);
      clockFace(ctx, 0, 0, 15, 0.9, t, [-PI / 2, -PI / 2 + k * TAU], '255,226,150', 4);
    }
    blob(ctx, '255,170,70', 0, 0, 20, 0.55);
    ctx.rotate(p.ang || 0);
    // 羽毛：金橘色的羽片、白色的羽軸
    ctx.fillStyle = '#ffb35a';
    ctx.strokeStyle = '#7a2a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.quadraticCurveTo(2, -8, -12, -4);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-12, 4);
    ctx.quadraticCurveTo(2, 8, 14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe6a0';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.quadraticCurveTo(4, -4, -4, -2);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff8e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(13, 0);
    ctx.stroke();
    ctx.restore();
    if (p.ph === 'go' && Math.random() < 0.5) {
      const q = spawn(4, p.x, p.y, -p.vx * 0.05, -p.vy * 0.05 - 20, 0.4, 2, '255,214,130');
      if (q) q.drag = 2;
    }
  };

  // ═════ 銜尾蛇 ═════
  function drawLoop(ctx, l, t) {
    const m = l.m;
    const S = m && m.ou;
    const map = G.world.map;
    const a = Math.min(1, l.t / 0.25) * clamp((l.life - l.t) / 0.3, 0, 1);
    if (a <= 0) return;
    const x0 = l.x0;
    const x1 = l.x1;
    const dir = Math.sign(x1 - x0) || 1;
    const n = Math.max(2, Math.floor(Math.abs(x1 - x0) / 26));
    const done = S && S.ph === 'roll' ? Math.min(1, S.t / S.dur) : S && S.pass === 2 && S.ph !== 'roll' && S.ph !== 'appear' ? 1 : S && S.pass === 1 && S.ph !== 'wind' ? 1 : 0;
    const second = !!(S && S.pass === 2);
    ctx.save();
    // 軌道本身：沿著地表的一條帶子（暗底＋亮線），走過的部分變亮
    const col0 = second ? '255,230,160' : '184,255,240';
    const band = (from, to, w, c) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath();
      const m2 = Math.max(2, Math.ceil(Math.abs(to - from) / 12));
      for (let i = 0; i <= m2; i++) {
        const x = from + ((to - from) * i) / m2;
        const y = G.physics.surfaceY(map, l.plat, x) - 4;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    };
    ctx.lineCap = 'round';
    ctx.globalAlpha = a;
    band(x0, x1, 12, 'rgba(14,40,60,0.45)');
    band(x0, x1, 3, rgba(col0, 0.55 + 0.25 * Math.sin(t * 6)));
    if (done > 0) band(x0, x0 + (x1 - x0) * done, 6, rgba(col0, 0.9));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = x0 + (x1 - x0) * u;
      const y = G.physics.surfaceY(map, l.plat, x) - 14;
      const lit = u <= done;
      const pulse = 0.5 + 0.5 * Math.sin(t * 5 - i * 0.6);
      const col = second ? '255,230,160' : '184,255,240';
      ctx.globalAlpha = a * (lit ? 0.95 : 0.45 + 0.3 * pulse);
      // 符文：小圓環＋一劃
      ctx.strokeStyle = 'rgba(14,40,60,0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 7, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = rgba(col, 1);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.beginPath();
      const g = Math.floor(hash(i + 3) * 3);
      if (g === 0) {
        ctx.moveTo(x - 3, y - 5);
        ctx.lineTo(x + 3, y - 1);
      } else if (g === 1) {
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x, y);
      } else {
        ctx.moveTo(x - 3, y - 2);
        ctx.lineTo(x + 3, y - 5);
      }
      ctx.stroke();
      if (lit && !lite()) blob(ctx, col, x, y, 9, 0.35);
    }
    // 方向箭頭（起點）＋輪迴的弧（終點回到起點）
    ctx.globalAlpha = a * 0.8;
    const y0 = G.physics.surfaceY(map, l.plat, x0) - 14;
    ctx.fillStyle = 'rgba(184,255,240,0.9)';
    ctx.beginPath();
    ctx.moveTo(x0 + dir * 22, y0);
    ctx.lineTo(x0 + dir * 10, y0 - 6);
    ctx.lineTo(x0 + dir * 10, y0 + 6);
    ctx.fill();
    const mid = (x0 + x1) / 2;
    const ym = Math.min(y0, G.physics.surfaceY(map, l.plat, x1) - 14) - 60;
    ctx.strokeStyle = rgba('184,255,240', 0.45 + (second ? 0.35 : 0));
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 7]);
    ctx.lineDashOffset = t * 30 * dir;
    ctx.beginPath();
    ctx.moveTo(x1, G.physics.surfaceY(map, l.plat, x1) - 16);
    ctx.quadraticCurveTo(mid, ym, x0, y0 - 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  function drawMark(ctx, k, t) {
    const q = clamp(k.t / k.life, 0, 1);
    const r = 70 - 40 * q;
    const a = k.t < k.life ? Math.min(1, k.t / 0.2) : clamp(1 - (k.t - k.life) / 0.3, 0, 1);
    ctx.save();
    ctx.translate(k.x, k.y - 2);
    ctx.scale(1, 0.3);
    ctx.strokeStyle = rgba(q > 0.75 ? '255,140,120' : '184,255,240', 0.9 * a);
    ctx.lineWidth = 3 / 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 1.5 / 0.3;
    ctx.strokeStyle = rgba('255,230,160', 0.8 * a);
    ctx.beginPath();
    ctx.arc(0, 0, r - 10, -PI / 2, -PI / 2 + (1 - q) * TAU);
    ctx.stroke();
    // 繞圈的符文點
    for (let i = 0; i < 8; i++) {
      const g = (i / 8) * TAU + t * 1.5;
      ctx.fillStyle = rgba('184,255,240', 0.9 * a);
      ctx.fillRect(Math.cos(g) * r - 2, Math.sin(g) * r - 6, 4, 12);
    }
    ctx.restore();
  }

  // ═════ 重力魔眼：重力崩塌 ═════
  function drawWellBack(ctx, w, t) {
    const tele = w.t < w.tele;
    const k = tele ? ease(w.t / w.tele) : 1;
    const end = w.tele + w.dur;
    const a = w.t < end ? 1 : clamp(1 - (w.t - end) / w.fade, 0, 1);
    if (a <= 0) return;
    const r = w.r * (0.35 + 0.65 * k);
    ctx.save();
    ctx.globalAlpha *= a;
    // 暗色透鏡：環帶變暗、邊上一圈紫光
    const g = ctx.createRadialGradient(w.x, w.y, r * 0.2, w.x, w.y, r);
    g.addColorStop(0, 'rgba(20,8,40,0)');
    g.addColorStop(0.6, 'rgba(20,8,40,0.18)');
    g.addColorStop(0.9, 'rgba(40,14,80,0.38)');
    g.addColorStop(1, 'rgba(138,80,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w.x, w.y, r, 0, TAU);
    ctx.fill();
    // 扭曲的環（晃動的橢圓）
    for (let i = 0; i < (lite() ? 2 : 4); i++) {
      const q = 1 - ((t * (tele ? 0.5 : 0.9) + i / 4) % 1);
      const rr = r * (0.3 + 0.7 * q);
      ctx.strokeStyle = rgba(i % 2 ? '200,160,255' : '138,240,255', (1 - q) * 0.55 + 0.1);
      ctx.lineWidth = 1.5 + (1 - q) * 2;
      ctx.beginPath();
      ctx.ellipse(w.x, w.y, rr * (1 + Math.sin(t * 3 + i) * 0.04), rr * (0.92 + Math.cos(t * 2.5 + i) * 0.05), t * 0.3 + i, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba('192,122,255', 0.8);
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 8]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath();
    ctx.arc(w.x, w.y, r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    // 往內捲的星光螺旋
    const nS = lite() ? 8 : 18;
    for (let i = 0; i < nS; i++) {
      const q = (t * (tele ? 0.45 : 0.9) + i / nS) % 1;
      const rr = r * (1 - q);
      const ang = i * 2.4 + q * 4;
      const x = w.x + Math.cos(ang) * rr;
      const y = w.y + Math.sin(ang) * rr;
      const x2 = w.x + Math.cos(ang - 0.25) * (rr + 16);
      const y2 = w.y + Math.sin(ang - 0.25) * (rr + 16);
      ctx.strokeStyle = rgba(i % 3 ? '239,224,255' : '255,226,150', q * 0.9);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    // 繞著轉的碎石（崩塌時往中心收）
    const pull = w.t > w.tele ? clamp((w.t - w.tele) / w.dur, 0, 1) : 0;
    const nR = lite() ? 5 : 10;
    for (let i = 0; i < nR; i++) {
      const ang = t * (1.2 + pull * 2) + (i / nR) * TAU;
      const rr = r * (0.55 + 0.35 * hash(w.seed + i)) * (1 - pull * 0.55);
      const x = w.x + Math.cos(ang) * rr;
      const y = w.y + Math.sin(ang) * rr * 0.8;
      const s = 3 + hash(w.seed + i * 3) * 4;
      ctx.fillStyle = '#4a3e5a';
      ctx.strokeStyle = '#1a1030';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const b = ang * 2 + (j / 5) * TAU;
        const pr = s * (0.75 + hash(i * 7 + j) * 0.4);
        j ? ctx.lineTo(x + Math.cos(b) * pr, y + Math.sin(b) * pr) : ctx.moveTo(x + Math.cos(b) * pr, y + Math.sin(b) * pr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // 崩塌圈：眼睛正下方 70px（地上的標記）
    if (w.t < end) {
      ctx.save();
      ctx.translate(w.x, w.gy - 2);
      ctx.scale(1, 0.26);
      ctx.strokeStyle = rgba('255,120,200', 0.4 + 0.5 * pull);
      ctx.lineWidth = 3 / 0.26;
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = rgba('120,40,160', 0.12 + 0.2 * pull);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  function drawHeavy(ctx, P, t) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const q = (t * 2.6 + i / 6) % 1;
      const x = P.x - 26 + (i % 3) * 26 + (i > 2 ? 13 : 0);
      const y = P.y - 100 + q * 70;
      ctx.strokeStyle = rgba('180,110,255', (1 - q) * 0.8);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 16);
      ctx.moveTo(x - 4, y + 11);
      ctx.lineTo(x, y + 16);
      ctx.lineTo(x + 4, y + 11);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ═════ 雙生天馬：落點、衝擊波 ═════
  function drawSpotBack(ctx, s, t) {
    const pre = !s.landed;
    const k = pre ? clamp(s.t / s.tele, 0, 1) : 1;
    const a = pre ? Math.min(1, s.t / 0.15) : clamp(1 - (s.t - s.landT) / 0.35, 0, 1);
    if (a > 0) {
      ctx.save();
      ctx.translate(s.x, s.gy - 2);
      ctx.globalAlpha *= a;
      // 天上垂下來的細光柱
      if (pre) {
        const g = ctx.createLinearGradient(0, -520, 0, 0);
        g.addColorStop(0, 'rgba(255,236,170,0)');
        g.addColorStop(1, rgba('255,236,170', 0.25 + 0.35 * k));
        ctx.fillStyle = g;
        const bw = 3 + 6 * k;
        ctx.fillRect(-bw / 2, -520, bw, 520);
      }
      ctx.scale(1, 0.26);
      const r = s.r * (1.25 - 0.25 * k);
      ctx.fillStyle = 'rgba(30,20,64,0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba('255,226,150', 0.1 + 0.15 * k);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba('255,236,170', 0.9);
      ctx.lineWidth = 3 / 0.26;
      ctx.stroke();
      ctx.strokeStyle = rgba('216,200,255', 0.8);
      ctx.lineWidth = 1.5 / 0.26;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, TAU);
      ctx.stroke();
      // 星印：五角星，隨時間轉；倒數弧
      ctx.lineWidth = 2 / 0.26;
      ctx.strokeStyle = rgba('255,244,210', 0.9);
      star5(ctx, 0, 0, r * 0.72, t * 0.8 + s.seed);
      ctx.stroke();
      if (pre) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 5 / 0.26;
        ctx.beginPath();
        ctx.arc(0, 0, r, -PI / 2, -PI / 2 + k * TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
    // 貼地的衝擊波（兩邊各一道低矮的弧）
    if (s.waves && s.waves.r < 160) {
      const w = s.waves;
      const q = w.r / 160;
      for (const d of [-1, 1]) {
        const x = s.x + d * w.r;
        ctx.save();
        ctx.strokeStyle = rgba('255,236,170', 0.9 * (1 - q * 0.6));
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - d * 16, w.y);
        ctx.quadraticCurveTo(x + d * 2, w.y - 22, x + d * 8, w.y);
        ctx.stroke();
        ctx.strokeStyle = rgba('216,200,255', 0.7 * (1 - q * 0.6));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - d * 28, w.y);
        ctx.quadraticCurveTo(x - d * 10, w.y - 12, x - d * 4, w.y);
        ctx.stroke();
        blob(ctx, '255,236,170', x, w.y - 8, 16, 0.5);
        ctx.restore();
      }
    }
  }

  // ═════ 星座魚：流星、星座線 ═════
  const MH = 460; // 流星從多高落下
  function drawMeteorWarn(ctx, q, t) {
    const k = clamp(q.t / q.tele, 0, 1);
    const a = q.t < q.tele ? Math.min(1, q.t / 0.12) : 0;
    if (a <= 0) return;
    ctx.save();
    ctx.translate(q.x, q.gy - 2);
    ctx.scale(1, 0.28);
    ctx.globalAlpha *= a;
    // 深色底：淺色地面上也看得清楚
    ctx.fillStyle = 'rgba(24,18,60,0.32)';
    ctx.beginPath();
    ctx.arc(0, 0, q.r + 4, 0, TAU);
    ctx.fill();
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, q.r);
    g.addColorStop(0, rgba('255,226,150', 0.1 + 0.25 * k));
    g.addColorStop(1, rgba('120,190,255', 0.12));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, q.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba('140,210,255', 0.85);
    ctx.lineWidth = (q.big ? 3 : 2) / 0.28;
    ctx.stroke();
    ctx.strokeStyle = rgba('255,236,160', 0.95);
    ctx.lineWidth = (q.big ? 4 : 3) / 0.28;
    ctx.beginPath();
    ctx.arc(0, 0, q.r, -PI / 2, -PI / 2 + k * TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba('255,244,210', 0.75);
    ctx.lineWidth = 1.5 / 0.28;
    star5(ctx, 0, 0, q.r * 0.65, -t * 0.6 + q.seed);
    ctx.stroke();
    ctx.restore();
  }
  function meteorPos(q) {
    const k = clamp((q.t - (q.tele - q.fall)) / q.fall, 0, 1);
    const sx = q.x - q.side * MH * 0.55;
    const sy = q.gy - MH;
    return [sx + (q.x - sx) * k, sy + (q.gy - sy) * k, k];
  }
  function drawMeteor(ctx, q, t) {
    if (q.t < q.tele - q.fall || q.t >= q.tele) return;
    const [x, y] = meteorPos(q);
    const r = q.big ? 15 : 9;
    const dx = q.side * MH * 0.55;
    const dy = MH;
    const L = Math.hypot(dx, dy);
    const ux = dx / L;
    const uy = dy / L;
    const tl = q.big ? 150 : 100;
    ctx.save();
    // 星尾
    const g = ctx.createLinearGradient(x, y, x - ux * tl, y - uy * tl);
    g.addColorStop(0, 'rgba(255,240,190,0.95)');
    g.addColorStop(0.4, 'rgba(140,210,255,0.5)');
    g.addColorStop(1, 'rgba(90,120,255,0)');
    ctx.strokeStyle = g;
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - ux * tl, y - uy * tl);
    ctx.stroke();
    for (let i = 1; i < 5; i++) star4(ctx, x - ux * tl * (i / 5) + Math.sin(t * 9 + i) * 5, y - uy * tl * (i / 5), 4 - i * 0.5, i % 2 ? '255,236,160' : '160,220,255', 0.9 - i * 0.15);
    blob(ctx, '255,226,150', x, y, r * 3, 0.7);
    // 圓圓的發光岩塊
    ctx.fillStyle = '#5a4a7a';
    ctx.strokeStyle = '#2a1e44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let j = 0; j < 7; j++) {
      const b = (j / 7) * TAU + t * 3;
      const pr = r * (0.85 + hash(q.seed + j) * 0.25);
      j ? ctx.lineTo(x + Math.cos(b) * pr, y + Math.sin(b) * pr) : ctx.moveTo(x + Math.cos(b) * pr, y + Math.sin(b) * pr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,226,150,0.9)';
    ctx.beginPath();
    ctx.arc(x + ux * r * 0.3, y + uy * r * 0.3, r * 0.55, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(x + ux * r * 0.4, y + uy * r * 0.4, r * 0.25, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function drawStars(ctx, s, t) {
    const E = s.edges.length;
    const pre = s.t < s.tele;
    const k = clamp(s.t / s.tele, 0, 1);
    const fa = pre ? 1 : clamp(1 - (s.t - s.tele) / (s.life - s.tele), 0, 1);
    ctx.save();
    ctx.lineCap = 'round';
    s.edges.forEach((e, i) => {
      const a = s.pts[e[0]];
      const b = s.pts[e[1]];
      const f = pre ? clamp(k * E * 1.15 - i, 0, 1) : 1;
      if (f <= 0) return;
      const x2 = a[0] + (b[0] - a[0]) * f;
      const y2 = a[1] + (b[1] - a[1]) * f;
      if (pre) {
        ctx.strokeStyle = rgba('180,220,255', 0.55 + 0.35 * k);
        ctx.lineWidth = 1.6;
        ctx.setLineDash([2, 5]);
      } else {
        ctx.setLineDash([]);
        ctx.strokeStyle = rgba('255,244,200', fa);
        ctx.lineWidth = 2 + 7 * fa;
      }
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (!pre) {
        ctx.strokeStyle = rgba('140,210,255', 0.5 * fa);
        ctx.lineWidth = 14 * fa + 2;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });
    ctx.setLineDash([]);
    s.pts.forEach((p, i) => {
      const tw = 0.7 + 0.3 * Math.sin(t * 8 + i);
      blob(ctx, '255,236,160', p[0], p[1], 14, 0.6 * fa);
      star4(ctx, p[0], p[1], 7 * tw + (pre ? 0 : 3), '255,250,220', fa);
    });
    ctx.restore();
  }

  // ═════ 短暫的閃光 ═════
  function drawPops(ctx, t) {
    for (const p of pops) {
      const k = p.t / p.life;
      if (p.k === 'riftpop') {
        ctx.save();
        ctx.translate(p.x, p.y);
        const o = Math.sin(k * PI);
        blob(ctx, '192,122,255', 0, 0, 50, 0.6 * o);
        ctx.fillStyle = rgba('10,4,24', 0.9 * o);
        ctx.strokeStyle = rgba('240,210,255', o);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 * o + 1, 40 * o + 2, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (p.k === 'glassflash') blob(ctx, '220,245,255', p.x, p.y, 50, 0.6 * (1 - k));
      else if (p.k === 'loopflash') {
        ctx.save();
        ctx.strokeStyle = rgba('184,255,240', 1 - k);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20 + k * 40, 0, TAU);
        ctx.stroke();
        ctx.restore();
        blob(ctx, '184,255,240', p.x, p.y, 50, 0.7 * (1 - k));
      } else if (p.k === 'rwring') {
        ctx.save();
        const rr = p.rev ? 110 - k * 80 : 30 + k * 80;
        ctx.strokeStyle = rgba('255,217,138', 0.8 * (p.rev ? Math.sin(k * PI) : 1 - k));
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, TAU);
        ctx.stroke();
        // 逆轉的箭頭
        if (p.rev) {
          for (let i = 0; i < 3; i++) {
            const a = -t * 4 + (i / 3) * TAU;
            const x = p.x + Math.cos(a) * rr;
            const y = p.y + Math.sin(a) * rr;
            ctx.fillStyle = rgba('255,217,138', 0.9 * Math.sin(k * PI));
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a - PI / 2) * 9, y + Math.sin(a - PI / 2) * 9);
            ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
            ctx.lineTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5);
            ctx.fill();
          }
        }
        ctx.restore();
        if (!p.rev) blob(ctx, '255,226,150', p.x, p.y, 60, 0.6 * (1 - k));
      } else if (p.k === 'fring') {
        ctx.save();
        ctx.strokeStyle = rgba('255,226,150', 1 - k);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8 + k * 16, 0, TAU);
        ctx.stroke();
        ctx.restore();
      } else if (p.k === 'markclose') blob(ctx, '184,255,240', p.x, p.y - 6, 40, 0.8 * (1 - k));
      else if (p.k === 'implode') {
        // 內爆：先往內收再炸開（局部）
        const r = k < 0.35 ? 110 * (1 - k / 0.35) + 10 : 10 + (k - 0.35) * 200;
        blob(ctx, '192,122,255', p.x, p.y, r + 30, 0.8 * (1 - k));
        blob(ctx, '255,255,255', p.x, p.y, 36, k < 0.35 ? 0.9 : 0.9 * (1 - k));
        ctx.save();
        ctx.strokeStyle = rgba('240,210,255', 1 - k);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();
        ctx.restore();
      } else if (p.k === 'stomp') {
        ctx.save();
        ctx.translate(p.x, p.y - 2);
        ctx.scale(1, 0.3);
        ctx.strokeStyle = rgba('255,236,170', 1 - k);
        ctx.lineWidth = 4 / 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, 20 + k * 70, 0, TAU);
        ctx.stroke();
        ctx.restore();
        blob(ctx, '255,236,170', p.x, p.y - 20, 60, 0.7 * (1 - k));
      } else if (p.k === 'meteor') {
        const r = p.big ? 90 : 50;
        blob(ctx, '255,226,150', p.x, p.y - 10, r * (0.6 + k * 0.6), 0.85 * (1 - k));
        ctx.save();
        ctx.translate(p.x, p.y - 2);
        ctx.scale(1, 0.3);
        ctx.strokeStyle = rgba('160,220,255', 1 - k);
        ctx.lineWidth = 3 / 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.3 + k * 0.8), 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  function drawParticles(ctx) {
    for (const q of PS) {
      if (!q.on) continue;
      const k = q.t / q.life;
      const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      if (q.k === 0) {
        // 玻璃片：旋轉的三角形、邊上閃一下
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.fillStyle = rgba('225,245,255', 0.75 * a);
        ctx.strokeStyle = rgba(q.c, a);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-q.s, -q.s * 0.4);
        ctx.lineTo(q.s * 0.8, -q.s * 0.6);
        ctx.lineTo(q.s * 0.1, q.s * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (q.k === 6) {
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.fillStyle = rgba('74,62,90', a);
        ctx.strokeStyle = rgba('26,16,48', a);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-q.s, 0);
        ctx.lineTo(-q.s * 0.3, -q.s * 0.8);
        ctx.lineTo(q.s * 0.9, -q.s * 0.3);
        ctx.lineTo(q.s * 0.5, q.s * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (q.k === 3 || q.k === 8) {
        if (q.k === 8) {
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.rot * 0.3);
          ctx.fillStyle = rgba(q.c, 0.85 * a);
          ctx.beginPath();
          ctx.ellipse(0, 0, q.s * 1.6, q.s * 0.5, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        } else star4(ctx, q.x, q.y, q.s, q.c, a);
      } else if (q.k === 2) {
        ctx.strokeStyle = rgba(q.c, a);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.s, 0, TAU);
        ctx.moveTo(q.x, q.y - q.s * 1.6);
        ctx.lineTo(q.x, q.y + q.s * 1.6);
        ctx.stroke();
      } else {
        // 金粉、沙、火星、虛空塵：小圓點（時停的圈裡金粉停在半空）
        const s = q.stop;
        if (s && s.fired && s.t < s.tele + s.hold) q.t = Math.min(q.t, q.life * 0.5);
        // 圓點（以前是小方塊，飄在畫面上像壞掉的像素）
        ctx.fillStyle = rgba(q.c, a);
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.s * 0.55, 0, TAU);
        ctx.fill();
      }
    }
  }

  // ═════ 包住 A.drawMonster：分身、隱形、快轉、俯衝、天上的小星、唱歌的光 ═════
  const rawDraw = A.drawMonster;
  A.drawMonster = function (ctx, m) {
    const fx = m.fx || {};
    const t = G.time || 0;
    if (m.dead || !fx) return rawDraw(ctx, m);
    // 天馬飛出畫面：畫成畫面頂端的一顆小星
    if (fx.soar && (m.hover || 0) > 380 && !m.dead) {
      const cam = G.cam || { y: 0 };
      const y = Math.max(cam.y + 22, m.y - m.hover);
      ctx.save();
      blob(ctx, '255,236,170', m.x, y, 26, 0.9);
      star4(ctx, m.x, y, 9 + Math.sin(t * 12) * 2, '255,255,240', 1);
      ctx.restore();
      return;
    }
    if (m.hasteT > 0 && !m.illusion) drawHaste(ctx, m, t);
    if (fx.dive) {
      // 俯衝的光痕
      const y = m.y - (m.hover || 0);
      const g = ctx.createLinearGradient(m.x, y - 260, m.x, y);
      g.addColorStop(0, 'rgba(255,236,170,0)');
      g.addColorStop(1, 'rgba(255,248,220,0.85)');
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(m.x - 14, y - 260, 28, 230);
      ctx.restore();
    }
    if (m.id === 'constellfish' && fx.sing > 0) {
      const y = m.y - (m.hover || 0) - m.h * (m.scale || 1) * 0.5;
      blob(ctx, '255,226,150', m.x, y, 90, 0.45 * fx.sing);
      blob(ctx, '140,210,255', m.x, y, 60, 0.35 * fx.sing);
    }
    let a = fx.m5a != null ? clamp(fx.m5a, 0, 1) : 1;
    if (m.m5copy) {
      // 分身：本體的樣子，半透明、比本體多閃一點
      const fl = 0.7 + Math.sin(t * 7 + (m.seed || 0)) * 0.06 + (hash(Math.floor(t * 9) + (m.seed || 0)) > 0.9 ? -0.25 : 0);
      a *= fl;
      if (a <= 0.02) return;
      ctx.save();
      if (!lite()) {
        // 稜鏡色差邊：紅、青兩道錯開的淡影
        const pm = A.mode;
        const pc = A.modeColor;
        const pa = A.modeAmt;
        try {
          A.mode = 'tint';
          A.modeAmt = 0.9;
          A.modeColor = '#ff7ab0';
          ctx.globalAlpha = a * 0.3;
          ctx.translate(-2.5, 0);
          rawDraw(ctx, m);
          A.modeColor = '#7ae8ff';
          ctx.globalAlpha = a * 0.3;
          ctx.translate(5, 0);
          rawDraw(ctx, m);
          ctx.translate(-2.5, 0);
        } finally {
          A.mode = pm;
          A.modeColor = pc;
          A.modeAmt = pa;
        }
      }
      ctx.globalAlpha = a;
      rawDraw(ctx, m);
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }
    if (a < 0.999) {
      if (a <= 0.02) return;
      ctx.save();
      ctx.globalAlpha = a;
      rawDraw(ctx, m);
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }
    return rawDraw(ctx, m);
  };

  // ═════ 圖層 ═════
  function drawBack(ctx) {
    const M = MM();
    const t = G.time || 0;
    for (const d of M.dials) drawDial(ctx, d, t);
    for (const w of M.wells) drawWellBack(ctx, w, t);
    for (const s of M.stops) drawStopBack(ctx, s, t);
    for (const l of M.loops) drawLoop(ctx, l, t);
    for (const k of M.marks) drawMark(ctx, k, t);
    for (const s of M.spots) drawSpotBack(ctx, s, t);
    for (const q of M.meteors) drawMeteorWarn(ctx, q, t);
    for (const r of M.rifts) drawRift(ctx, r, t);
    for (const p of M.panes) drawPane(ctx, p, t);
  }
  function drawFront(ctx) {
    const M = MM();
    const t = G.time || 0;
    const P = G.player;
    for (const b of M.cbeams) drawCBeam(ctx, b, t);
    for (const b of M.beams) drawBeam(ctx, b, t);
    for (const s of M.stops) drawStopFront(ctx, s, t);
    for (const s of M.stars) drawStars(ctx, s, t);
    for (const q of M.meteors) drawMeteor(ctx, q, t);
    for (const m of G.world.monsters) {
      if (m.dead) continue;
      if (m.id === 'hourowl') {
        if (m.fx.rewind && m.rwPath) drawRewind(ctx, m, t);
        if (m.fx.hglass > 0) drawHourglass(ctx, m, t);
      }
    }
    drawPops(ctx, t);
    drawParticles(ctx);
    if (P && P.alive && P.alive()) {
      if (M.pull) drawPullLines(ctx, P, M.pull, t);
      if (P.m5heavy > 0) drawHeavy(ctx, P, t);
      if (P.m5stop) drawFrozenPlayer(ctx, P, t);
    }
  }
  function anyLive() {
    const M = MM();
    if (!M) return false;
    const P = G.player;
    if (live || pops.length || M.ev.length || M.rifts.length || M.stops.length || M.panes.length || M.beams.length || M.cbeams.length || M.dials.length || M.loops.length || M.marks.length || M.wells.length || M.spots.length || M.meteors.length || M.stars.length || M.pull) return true;
    if (P && (P.m5stop || P.m5heavy > 0)) return true;
    const mons = G.world.monsters;
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (m.id === 'hourowl' || m.id === 'constellfish' || m.id === 'parallelfox' || m.hasteT > 0) return true;
    }
    return false;
  }
  if (A.skillFx) {
    A.skillFx.add({
      live: anyLive,
      step(dt) {
        if (!G.world || !G.world.monsters || !MM()) return;
        step(dt);
      },
      back: drawBack,
      front: drawFront,
      clear() {
        for (const q of PS) q.on = false;
        live = 0;
        pops.length = 0;
      },
    });
  }
})();
