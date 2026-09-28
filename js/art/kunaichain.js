// 雷刃連鎖（敏捷三轉）：一把刃口纏著雷電的苦無，尾端拖著一條看得到一節節鐵環的黑鐵鎖鏈。
// 苦無擲出後照著命中順序在目標之間來回甩打，每一跳都會旋轉；鎖鏈每一跳都「啪」地繃直，一道電流沿著鏈環跑過去；
// 打中時留下交叉的雷斬痕與火花；最後一擊之後鎖鏈把苦無收回玩家手上。
// 和雷光鏈（純電弧）刻意做成不同的東西：主體是金屬苦無＋鎖鏈，電只是纏在刃上、沿著鏈子跑。
// 純視覺：目標、跳數、節奏（每下 0.045 秒）、傷害全都還是 js/game/skills2.js chain 在算。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const TAU = Math.PI * 2;
  const lite = () => !!G.lowFx;
  const R = (a, b) => a + (b - a) * Math.random();
  const HOP = 0.045; // 和 skills2.js chain 的 X.later(n * 0.045) 一致

  // ── 粒子池：0 火花（短線） 1 電屑（小十字） ──
  const N = 120;
  const PS = [];
  for (let i = 0; i < N; i++) PS.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1 });
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
      return q;
    }
    return null;
  }

  // 目前的一次施放（同時只會有一次；再施放就重來）
  const C = { on: false, t: 0, hand: null, tg: [], n: 0, end: 0, dir: 1, pulses: [], lastHop: -1, spin: 0, retract: 0.24, linger: 0.07 };
  const SL = []; // 雷斬痕
  const midY = (m) => m.y - (m.hover || 0) - (m.h || 40) * (m.scale || 1) * 0.5;

  function handPos() {
    const P = G.player;
    return [P.x + P.dir * 22, P.y - 36];
  }
  function tgPos(g) {
    const m = g.m;
    if (m && !m.dead && G.world.monsters.indexOf(m) >= 0) {
      g.x = m.x;
      g.y = midY(m);
    }
    return g;
  }

  // 由 skills2.js chain 在出手那一刻呼叫：list 就是命中順序（list[0], list[1], … 重複 repeat 輪）
  function cast(P, list, repeat) {
    C.on = true;
    C.t = 0;
    C.dir = P.dir;
    C.tg = list.map((m) => ({ m, x: m.x, y: midY(m) }));
    C.n = list.length * repeat;
    C.end = (C.n - 1) * HOP;
    C.pulses.length = 0;
    C.lastHop = -1;
    C.spin = 0;
    const h = handPos();
    // 出手：手上爆一小團電屑
    for (let i = 0; i < (lite() ? 3 : 7); i++) spawn(1, h[0], h[1], R(-160, 160) + P.dir * 120, R(-160, 60), R(0.15, 0.3), R(2, 3.5));
  }

  // 第 i 跳的落點（i = -1 是手）
  function hopPt(i) {
    if (i < 0) return handPos();
    const g = tgPos(C.tg[i % C.tg.length]);
    return [g.x, g.y];
  }

  // 苦無目前的位置、朝向；另外回傳鎖鏈要經過的點（手 → 已經纏過的目標 → 苦無）
  const KP = { x: 0, y: 0, a: 0, spin: 0, phase: 'fly' };
  const path = [];
  function kunaiState() {
    const t = C.t;
    path.length = 0;
    const h = handPos();
    path.push(h[0], h[1]);
    if (t <= C.end + C.linger) {
      // 第 j 跳在 j*HOP 抵達；在 (j-1)*HOP..j*HOP 之間從上一點飛過去（第 0 跳是瞬間擲出）
      const j = Math.min(C.n - 1, Math.max(0, Math.ceil(t / HOP)));
      const k = j === 0 ? 1 : Math.min(1, (t - (j - 1) * HOP) / HOP);
      const a = hopPt(j - 1);
      const b = hopPt(j);
      let x = a[0] + (b[0] - a[0]) * k;
      let y = a[1] + (b[1] - a[1]) * k;
      // 同一個目標連打（只有一隻時）：苦無彈出去再刺回來
      if (Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) < 4) {
        const s = Math.sin(k * Math.PI);
        x += -C.dir * s * 34;
        y -= s * 22;
      }
      KP.x = x;
      KP.y = y;
      KP.a = Math.atan2(b[1] - a[1], b[0] - a[0] || C.dir);
      KP.phase = 'fly';
      // 鎖鏈：第一輪經過的目標依序纏住（最多纏住全部目標），之後苦無在已纏的目標之間來回甩
      const wrapped = Math.min(C.tg.length, j);
      for (let i = 0; i < wrapped - (j < C.tg.length ? 0 : 1); i++) {
        const p = hopPt(i);
        path.push(p[0], p[1]);
      }
      if (j >= C.tg.length) {
        // 已纏滿：鏈子經過全部目標，苦無從最後一個被纏的點延伸出去
        const last = hopPt(C.tg.length - 1);
        path.push(last[0], last[1]);
      }
      path.push(x, y);
    } else {
      // 收回：鏈子沿原路往手上縮，苦無跟著倒飛回來
      const k = Math.min(1, (t - C.end - C.linger) / C.retract);
      const e = k * k * (3 - 2 * k);
      const last = hopPt(C.n - 1);
      KP.x = last[0] + (h[0] - last[0]) * e;
      KP.y = last[1] + (h[1] - last[1]) * e;
      KP.a = Math.atan2(last[1] - h[1], last[0] - h[0]);
      KP.phase = 'back';
      path.push(KP.x, KP.y);
    }
    KP.spin = C.spin;
    return KP;
  }

  function hit(x, y, dir) {
    const e = { x, y, t: 0, a: R(-0.5, 0.5) + (dir > 0 ? -0.8 : 0.8), a2: 0, len: R(46, 60), seg: [] };
    e.a2 = e.a + R(1.2, 1.7) * (Math.random() < 0.5 ? 1 : -1);
    // 斬痕上的鋸齒電紋（相對座標，沿第一道斬痕）
    for (let i = 0; i <= 6; i++) e.seg.push((i / 6 - 0.5) * e.len, i === 0 || i === 6 ? 0 : R(-5, 5));
    SL.push(e);
    if (SL.length > 12) SL.shift();
    const n = lite() ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const a = R(0, TAU);
      const sp = R(180, 420);
      spawn(0, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 80, R(0.18, 0.34), R(5, 9));
    }
    if (!lite()) for (let i = 0; i < 3; i++) spawn(1, x + R(-14, 14), y + R(-14, 14), R(-60, 60), R(-90, -20), R(0.2, 0.36), R(2, 3.2));
  }

  function step(dt) {
    if (C.on) {
      C.t += dt;
      // 每一跳抵達：鎖鏈繃直、一道電流沿鏈跑、打中的地方爆雷斬
      const j = Math.min(C.n - 1, Math.floor(C.t / HOP + 1e-6));
      while (C.lastHop < j && C.t <= C.end + 0.02) {
        C.lastHop++;
        const p = hopPt(C.lastHop);
        const prev = hopPt(C.lastHop - 1);
        const gm = C.tg[C.lastHop % C.tg.length].m;
        if (!gm || !gm.dead) hit(p[0], p[1], U.sign(p[0] - prev[0]) || C.dir);
        C.pulses.push({ t: 0, life: 0.14 });
        if (C.pulses.length > 6) C.pulses.shift();
      }
      C.spin += dt * (C.t <= C.end ? 38 : 26);
      for (let i = C.pulses.length - 1; i >= 0; i--) {
        C.pulses[i].t += dt;
        if (C.pulses[i].t > C.pulses[i].life) C.pulses.splice(i, 1);
      }
      if (C.t > C.end + C.linger + C.retract) {
        C.on = false;
        const h = handPos();
        for (let i = 0; i < (lite() ? 2 : 5); i++) spawn(1, h[0], h[1], R(-120, 120), R(-140, 20), R(0.15, 0.28), R(2, 3));
      }
    }
    for (let i = SL.length - 1; i >= 0; i--) {
      SL[i].t += dt;
      if (SL[i].t > 0.32) SL.splice(i, 1);
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
        q.vx *= 1 - Math.min(1, 3 * dt);
        q.vy = q.vy * (1 - Math.min(1, 3 * dt)) + 900 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
    }
  }

  // ── 畫：鎖鏈（一節節的鐵環：正面的橢圓環、側面的短棒交替） ──
  const LINK = 10;
  const pts = []; // 沿鏈子的取樣點 x,y,角度,累積長度
  function sampleChain(slack) {
    pts.length = 0;
    let acc = 0;
    for (let i = 0; i + 3 < path.length; i += 2) {
      const x0 = path[i];
      const y0 = path[i + 1];
      const x1 = path[i + 2];
      const y1 = path[i + 3];
      const L = Math.hypot(x1 - x0, y1 - y0);
      if (L < 1) continue;
      const n = Math.max(1, Math.round(L / LINK));
      const a = Math.atan2(y1 - y0, x1 - x0);
      const nx = -Math.sin(a);
      const ny = Math.cos(a);
      for (let s = 0; s < n; s++) {
        const k = s / n;
        // 繃直的瞬間：一段衰減的抖動（只有最後一段，也就是正在甩的那段）
        const w = i + 4 >= path.length ? Math.sin(k * Math.PI) * Math.sin(k * 14 - C.t * 60) * slack : 0;
        const sag = i + 4 >= path.length ? Math.sin(k * Math.PI) * slack * 1.4 : 0;
        pts.push(x0 + (x1 - x0) * k + nx * w, y0 + (y1 - y0) * k + ny * w + sag, a, acc + L * k);
      }
      acc += L;
    }
    const ex = path[path.length - 2];
    const ey = path[path.length - 1];
    pts.push(ex, ey, pts.length ? pts[pts.length - 2] : 0, acc);
    return acc;
  }

  function drawChain(ctx, total) {
    ctx.lineCap = 'round';
    for (let i = 0; i + 4 < pts.length; i += 4) {
      const x = (pts[i] + pts[i + 4]) / 2;
      const y = (pts[i + 1] + pts[i + 5]) / 2;
      const a = Math.atan2(pts[i + 5] - pts[i + 1], pts[i + 4] - pts[i]);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      if (((i / 4) | 0) % 2 === 0) {
        // 正面的環：深色鐵、上緣一點高光
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.4, 3.6, 0, 0, TAU);
        ctx.strokeStyle = '#1c1a24';
        ctx.lineWidth = 3.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.4, 3.6, 0, 0, TAU);
        ctx.strokeStyle = '#4e4c5e';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, -0.4, 5.4, 2.6, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.strokeStyle = '#a8acc4';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // 側面的環：一根短棒
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.strokeStyle = '#1c1a24';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = '#5a586c';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-4, -0.8);
        ctx.lineTo(4, -0.8);
        ctx.strokeStyle = '#b8bcd2';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 沿鏈跑的電流：一段一段的鋸齒電弧（亮頭＋衰減尾巴），畫在鏈子上面
  function drawPulse(ctx, total, head, alpha) {
    if (total < 1) return;
    const tail = 90;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < pts.length; i += 4) {
      const d = pts[i + 3];
      if (d < head - tail || d > head) continue;
      const j = (Math.random() - 0.5) * 7;
      const a = pts[i + 2];
      const x = pts[i] - Math.sin(a) * j;
      const y = pts[i + 1] + Math.cos(a) * j;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    if (started) {
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = '#ffd23a';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#fffbe0';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    // 電流頭的亮點
    for (let i = 0; i < pts.length; i += 4) {
      if (pts[i + 3] >= head) {
        const g = ctx.createRadialGradient(pts[i], pts[i + 1], 0, pts[i], pts[i + 1], 18);
        g.addColorStop(0, 'rgba(255,250,210,' + (0.9 * alpha).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(pts[i] - 18, pts[i + 1] - 18, 36, 36);
        break;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // 苦無：菱形刃（黑鋼＋磨亮的刃口）、纏布的柄、尾端的圓環；刃口纏著鋸齒雷光
  function drawKunai(ctx, x, y, rot, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(1.35, 1.35);
    ctx.globalAlpha = alpha;
    // 刃上的雷光（先畫在底下當光暈）
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(8, 0, 0, 8, 0, 30);
    g.addColorStop(0, 'rgba(255,240,150,0.75)');
    g.addColorStop(1, 'rgba(255,200,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-22, -30, 60, 60);
    ctx.globalCompositeOperation = 'source-over';
    // 尾環
    ctx.beginPath();
    ctx.arc(-17, 0, 4.6, 0, TAU);
    ctx.strokeStyle = '#1c1a24';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = '#6a687c';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 柄（纏布）
    ctx.fillStyle = '#2a2230';
    ctx.strokeStyle = '#140f18';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.rect(-13, -2.6, 12, 5.2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#6b3a8a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(-12 + i * 3, -2.6);
      ctx.lineTo(-10 + i * 3, 2.6);
    }
    ctx.stroke();
    // 刃：菱形、上半亮下半暗
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    ctx.lineTo(8, -6.4);
    ctx.lineTo(26, 0);
    ctx.lineTo(8, 6.4);
    ctx.closePath();
    ctx.fillStyle = '#3a3a4a';
    ctx.fill();
    ctx.strokeStyle = '#120e16';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    ctx.lineTo(8, -6.4);
    ctx.lineTo(26, 0);
    ctx.closePath();
    ctx.fillStyle = '#8e92aa';
    ctx.fill();
    // 中脊
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(24, 0);
    ctx.strokeStyle = '#e4e8f6';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // 刃口的鋸齒雷（每幀重擲）
    ctx.globalCompositeOperation = 'lighter';
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(-1, 0);
      for (let i = 1; i <= 5; i++) {
        const k = i / 5;
        const bx = -1 + 27 * k;
        const by = s * (k < 0.33 ? 6.4 * (k / 0.33) : 6.4 * (1 - (k - 0.33) / 0.67)) + s * R(1, 5);
        ctx.lineTo(bx, by);
      }
      ctx.lineTo(31 + R(0, 6), R(-2, 2));
      ctx.strokeStyle = 'rgba(255,214,60,0.55)';
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.strokeStyle = '#fffbe0';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  function drawSlashes(ctx) {
    for (const e of SL) {
      const k = Math.min(1, e.t / 0.05);
      const a = e.t < 0.12 ? 1 : Math.max(0, 1 - (e.t - 0.12) / 0.2);
      ctx.save();
      ctx.translate(e.x, e.y);
      for (let s = 0; s < 2; s++) {
        const ang = s ? e.a2 : e.a;
        const L = e.len * (s ? 0.8 : 1) * k;
        ctx.save();
        ctx.rotate(ang);
        // 月牙形的斬痕（兩頭尖）：暗紫邊＋黃白芯
        const w = 5.5 * (s ? 0.8 : 1);
        ctx.beginPath();
        ctx.moveTo(-L / 2, 0);
        ctx.quadraticCurveTo(0, -w * 2, L / 2, 0);
        ctx.quadraticCurveTo(0, -w * 0.4, -L / 2, 0);
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = '#3a1f52';
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.moveTo(-L / 2, 0);
        ctx.quadraticCurveTo(0, -w * 1.4, L / 2, 0);
        ctx.quadraticCurveTo(0, -w * 0.6, -L / 2, 0);
        ctx.fillStyle = '#ffe66a';
        ctx.fill();
        // 沿斬痕爬的電紋
        if (!s && a > 0.3) {
          ctx.beginPath();
          for (let i = 0; i < e.seg.length; i += 2) {
            const x = e.seg[i] * k;
            const y = e.seg[i + 1] - w * 0.9 + R(-1.5, 1.5);
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.strokeStyle = '#fffbe8';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(ctx) {
    if (!live) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const q of PS) {
      if (!q.on) continue;
      const a = 1 - q.t / q.life;
      ctx.globalAlpha = a;
      if (q.k === 0) {
        const sp = Math.hypot(q.vx, q.vy) || 1;
        const l = q.s * Math.min(1.6, sp / 200);
        ctx.strokeStyle = '#ffe070';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - (q.vx / sp) * l, q.y - (q.vy / sp) * l);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#fff6c0';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(q.x - q.s, q.y);
        ctx.lineTo(q.x + q.s, q.y);
        ctx.moveTo(q.x, q.y - q.s);
        ctx.lineTo(q.x, q.y + q.s);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function draw(ctx) {
    if (C.on) {
      const k = kunaiState();
      // 鏈子的鬆弛量：剛到一跳時最大，0.04 秒內繃直
      const since = C.t - Math.max(0, C.lastHop) * HOP;
      const slack = KP.phase === 'fly' ? Math.max(0, 1 - since / 0.04) * 7 : 3;
      const total = sampleChain(slack);
      const fade = KP.phase === 'back' ? 1 : 1;
      ctx.globalAlpha = fade;
      drawChain(ctx, total);
      // 每一跳一道電流從手沿鏈子跑到苦無
      for (const p of C.pulses) drawPulse(ctx, total, total * Math.min(1, p.t / (p.life * 0.6)) + 20, 1 - Math.max(0, p.t - p.life * 0.6) / (p.life * 0.4));
      // 平時鏈子上零星的小電花
      if (!lite() && KP.phase === 'fly' && pts.length > 8) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#ffe98a';
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        for (let n = 0; n < 3; n++) {
          const i = ((Math.random() * (pts.length / 4 - 1)) | 0) * 4;
          ctx.moveTo(pts[i], pts[i + 1]);
          ctx.lineTo(pts[i] + R(-7, 7), pts[i + 1] + R(-8, 4));
          ctx.lineTo(pts[i] + R(-9, 9), pts[i + 1] + R(-12, 8));
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      // 苦無：飛行時沿方向＋一圈圈旋轉（每跳轉約一圈），收回時尾環朝前倒飛
      const rot = k.phase === 'back' ? k.a : k.a + (C.t <= C.end ? Math.sin(k.spin) * 0.4 + k.spin : 0);
      // 殘影
      if (!lite()) for (let i = 1; i <= 2; i++) drawKunai(ctx, k.x - Math.cos(k.a) * i * 10, k.y - Math.sin(k.a) * i * 10, rot - i * 0.7, 0.28 / i);
      drawKunai(ctx, k.x, k.y, rot, 1);
    }
    drawSlashes(ctx);
    drawParticles(ctx);
  }

  A.kunaiChainFx = { cast, active: () => C.on };
  if (A.skillFx) {
    A.skillFx.add({
      live: () => C.on || SL.length > 0 || live > 0,
      step,
      front: draw,
      clear() {
        C.on = false;
        SL.length = 0;
        for (const q of PS) q.on = false;
        live = 0;
      },
    });
  }
})();
