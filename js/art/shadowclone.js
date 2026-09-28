// 分身（敏捷三轉，buff key 'clone'）：buff 期間身邊站著一隻紫黑半透明的影子小獅子（雷影分身）。
// 站在玩家斜後方約 50px，慢半拍地跟著走、跳，姿勢和玩家同步（同一個 A.drawLion，染成紫黑色、先畫到離屏畫布再整張半透明貼上，
// 所以不會看到身體零件互相疊出來的深淺）；身上一直冒淡淡的黑紫煙。buff 剩 3 秒時開始閃爍，結束時噗地散成一團煙。
// 分身的追加攻擊（js/game/combat.js 的 clone 追擊，傷害邏輯沒動）發生時，分身會影步到目標身邊擺出攻擊姿勢，
// 在目標身上留下一道紫黑帶金邊的斬痕，然後再飄回玩家身後。純視覺。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const TAU = Math.PI * 2;
  const lite = () => !!G.lowFx;
  const R = (a, b) => a + (b - a) * Math.random();

  const S = { on: false, vis: 0, x: 0, y: 0, dir: 1, st: null, wispT: 0, gone: 0, fl: 1 };
  const SL = []; // 斬痕
  // 煙：0 身上冒的細煙 1 出現／消失的一大團
  const N = 70;
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
  function puff(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = R(0, TAU);
      const sp = R(40, 140);
      spawn(1, x + Math.cos(a) * 10, y - 30 + Math.sin(a) * 16, Math.cos(a) * sp, Math.sin(a) * sp * 0.7 - 30, R(0.4, 0.7), R(12, 20));
    }
  }

  const SMOKE = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(46,24,66,0.75)');
    g.addColorStop(0.55, 'rgba(34,18,50,0.35)');
    g.addColorStop(1, 'rgba(24,12,36,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return c;
  })();

  // 離屏畫布：分身整隻先畫在這裡
  const OW = 300;
  const OH = 300;
  const FX = 150;
  const FY = 240;
  let oc = null;
  let ox = null;
  let rc = null; // 輪廓用：分身剪影填成紫色
  let rx = null;

  function buff() {
    const P = G.player;
    return P && !P.dead && P.buffs && P.buffs.clone ? P.buffs.clone : null;
  }

  // 由 js/game/combat.js 的分身追擊呼叫：分身影步到目標身邊出手。回傳 false 表示分身不在（讓呼叫端用舊的殘影）
  function strike(m) {
    if (!S.on || !m) return false;
    const P = G.player;
    const side = U.sign(m.x - P.x) || P.dir;
    const reach = (m.w || 40) * (m.scale || 1) * 0.5 + 22;
    const tx = m.x - side * reach;
    const ty = m.onGround === false || m.hover ? P.y : m.y;
    const my = m.y - (m.hover || 0) - (m.h || 40) * (m.scale || 1) * 0.5;
    if (S.st && S.st.m === m && S.st.t < 0.3) S.st.t = Math.min(S.st.t, 0.06);
    else {
      if (Math.abs(tx - S.x) > 120 && !lite()) puff(S.x, S.y, 3);
      S.st = { m, t: 0, tx, ty, dir: side };
    }
    const e = { x: m.x, y: my, t: 0, a: side > 0 ? R(-0.9, -0.4) : R(0.4, 0.9) + Math.PI, len: R(52, 68) };
    SL.push(e);
    if (SL.length > 8) SL.shift();
    return true;
  }

  // 玩家目前的姿勢（和 player.draw 同一套判斷）
  function playerPose(P) {
    let state = 'idle';
    let p = 0;
    if (P.climbing >= 0) state = 'climb';
    else if (P.action) {
      state = P.action.type === 'attack' ? 'attack' : P.action.type === 'lockon' ? 'cast' : P.action.type;
      p = P.action.t / P.action.dur;
    } else if (P.hurtT > 0) state = 'hurt';
    else if (!P.onGround) state = P.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(P.vx) > 20) state = 'walk';
    return { state, t: state === 'climb' ? P.climbAnim : P.t - 0.08, p, form: P.form, onGround: P.onGround };
  }

  function step(dt) {
    const P = G.player;
    const b = buff();
    if (b && !S.on) {
      S.on = true;
      S.vis = 0;
      S.dir = P.dir;
      S.x = P.x - P.dir * 52;
      S.y = P.y;
      S.st = null;
      puff(S.x, S.y, lite() ? 4 : 9);
    } else if (!b && S.on) {
      S.on = false;
      puff(S.x, S.y, lite() ? 6 : 14);
      S.gone = 0.25;
    }
    if (S.gone > 0) S.gone -= dt;
    if (S.on) {
      S.vis = Math.min(1, S.vis + dt * 4);
      let tx = P.x - P.dir * 52;
      let ty = P.y;
      let rate = 7;
      if (S.st) {
        S.st.t += dt;
        if (S.st.t < 0.3) {
          tx = S.st.tx;
          ty = S.st.ty;
          rate = 26;
        }
        if (S.st.t > 0.36) S.st = null;
      }
      const k = Math.min(1, dt * rate);
      S.x += (tx - S.x) * k;
      S.y += (ty - S.y) * Math.min(1, dt * (rate + 5));
      S.dir = S.st ? S.st.dir : P.dir;
      // 身上冒的細煙
      S.wispT -= dt;
      if (S.wispT <= 0) {
        S.wispT = lite() ? 0.16 : 0.07;
        spawn(0, S.x + R(-18, 18), S.y - R(10, 56), R(-12, 12) - (P.vx || 0) * 0.15, R(-50, -24), R(0.5, 0.9), R(6, 11));
      }
      // 快結束時閃爍（越接近結束閃得越快）
      S.fl = b.t < 3 ? (Math.sin(G.time * (12 + (3 - b.t) * 8)) > -0.3 ? 1 : 0.22) : 1;
    }
    for (let i = SL.length - 1; i >= 0; i--) {
      SL[i].t += dt;
      if (SL[i].t > 0.3) SL.splice(i, 1);
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
        const d = 1 - Math.min(1, 2.2 * dt);
        q.vx *= d;
        q.vy *= d;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
    }
  }

  function drawSmoke(ctx) {
    if (!live) return;
    for (const q of PS) {
      if (!q.on) continue;
      const k = q.t / q.life;
      const r = q.s * (1 + k * (q.k ? 1.2 : 0.8));
      ctx.globalAlpha = (q.k ? 0.9 : 0.55) * (1 - k) * (q.k ? 1 : Math.min(1, q.t * 8));
      ctx.drawImage(SMOKE, q.x - r, q.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawClone(ctx) {
    const P = G.player;
    if (!oc) {
      oc = document.createElement('canvas');
      ox = oc.getContext('2d');
      rc = document.createElement('canvas');
      rx = rc.getContext('2d');
    }
    const tr = ctx.getTransform();
    const sc = Math.min(2, Math.max(0.5, Math.hypot(tr.a, tr.b) || 1));
    const w = Math.ceil(OW * sc);
    const h = Math.ceil(OH * sc);
    if (oc.width !== w || oc.height !== h) {
      oc.width = rc.width = w;
      oc.height = rc.height = h;
    }
    ox.setTransform(1, 0, 0, 1, 0, 0);
    ox.globalCompositeOperation = 'source-over';
    ox.globalAlpha = 1;
    ox.clearRect(0, 0, w, h);
    ox.setTransform(sc, 0, 0, sc, 0, 0);
    const st = playerPose(P);
    if (S.st && S.st.t < 0.3) {
      st.state = 'attack';
      st.p = Math.min(1, S.st.t / 0.26);
    }
    const pm = A.mode;
    const pc = A.modeColor;
    const pa = A.modeAmt;
    A.mode = 'tint';
    A.modeColor = '#2c1842';
    A.modeAmt = 0.8;
    try {
      A.drawLion(ox, FX, FY - (P.y - S.y) * 0, S.dir, st);
    } finally {
      A.mode = pm;
      A.modeColor = pc;
      A.modeAmt = pa;
    }
    // 由上往下：頂上一點紫光、腳下沉進黑色
    ox.setTransform(1, 0, 0, 1, 0, 0);
    ox.globalCompositeOperation = 'source-atop';
    const g = ox.createLinearGradient(0, h * 0.35, 0, h * 0.82);
    g.addColorStop(0, 'rgba(150,96,220,0.32)');
    g.addColorStop(0.6, 'rgba(40,20,60,0.1)');
    g.addColorStop(1, 'rgba(8,4,14,0.55)');
    ox.fillStyle = g;
    ox.fillRect(0, 0, w, h);
    ox.globalCompositeOperation = 'source-over';
    // 紫色剪影（拿來描一圈發光的輪廓，讓分身在暗的背景上也看得清楚）
    rx.globalCompositeOperation = 'source-over';
    rx.clearRect(0, 0, w, h);
    rx.drawImage(oc, 0, 0);
    rx.globalCompositeOperation = 'source-in';
    rx.fillStyle = '#b07cff';
    rx.fillRect(0, 0, w, h);

    const a = 0.74 * S.vis * S.fl;
    // 腳下的影子
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = '#140a1e';
    ctx.beginPath();
    ctx.ellipse(S.x, S.y - 1, 26, 5, 0, 0, TAU);
    ctx.fill();
    // 一圈淡紫的外光
    ctx.globalAlpha = a * 0.35;
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(S.x, S.y - 36, 6, S.x, S.y - 36, 62);
    gl.addColorStop(0, 'rgba(120,70,190,0.55)');
    gl.addColorStop(1, 'rgba(90,40,160,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(S.x - 62, S.y - 98, 124, 124);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a * 0.55;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const dx = i === 0 ? -1.8 : i === 1 ? 1.8 : 0;
      const dy = i === 2 ? -1.8 : i === 3 ? 1.4 : 0;
      ctx.drawImage(rc, S.x - FX + dx, S.y - FY + dy, OW, OH);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a;
    ctx.drawImage(oc, S.x - FX, S.y - FY, OW, OH);
    // 眼睛的一點金光（雷影）
    ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(G.time * 6));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ffd42a';
    ctx.beginPath();
    ctx.arc(S.x + S.dir * 14, S.y - 46, 2.2, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawSlashes(ctx) {
    for (const e of SL) {
      const k = Math.min(1, e.t / 0.06);
      const a = e.t < 0.1 ? 1 : Math.max(0, 1 - (e.t - 0.1) / 0.2);
      const L = e.len * k;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.a);
      ctx.globalAlpha = a * 0.85;
      ctx.beginPath();
      ctx.moveTo(-L / 2, 0);
      ctx.quadraticCurveTo(0, -15, L / 2, 0);
      ctx.quadraticCurveTo(0, -4, -L / 2, 0);
      ctx.fillStyle = '#1e0e2c';
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(-L / 2, 0);
      ctx.quadraticCurveTo(0, -15, L / 2, 0);
      ctx.strokeStyle = '#ffd42a';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-L * 0.4, -2);
      ctx.quadraticCurveTo(0, -10, L * 0.4, -2);
      ctx.strokeStyle = 'rgba(190,140,255,0.8)';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  A.shadowCloneFx = { strike, active: () => S.on, state: () => S };
  if (A.skillFx) {
    A.skillFx.add({
      live: () => S.on || live > 0 || SL.length > 0 || !!buff(),
      step,
      back(ctx) {
        drawSmoke(ctx);
        if (S.on && !(G.evolve && G.evolve.anim)) drawClone(ctx);
      },
      front: drawSlashes,
      clear() {
        // 換地圖：分身直接在新位置重新出現（buff 還在的話）
        S.on = false;
        S.st = null;
        SL.length = 0;
        for (const q of PS) q.on = false;
        live = 0;
      },
    });
  }
})();
