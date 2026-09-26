// 五轉技能的執行與特效（資料在 js/data/skills5.js）。
// 兩招都是好幾秒的大演出，狀態放在 ults 裡，每幀由 tick3 推進、由 fx.drawCuts 畫出來。
(function () {
  'use strict';
  const U = G.util;
  const X = G.skillExec;
  const TAU = Math.PI * 2;
  const alive = (m) => X.alive(m);
  const midY = (m) => m.y - m.h * (m.scale || 1) * 0.5;
  const ults = [];

  // 沒有目標時退回 MP 和冷卻
  function refund(P, S, id, lv) {
    const omni = P.passive('omniscience');
    P.mp = Math.min(P.maxMp, P.mp + Math.max(1, Math.round(S.mp(lv) * (omni ? 1 - omni.mpCut : 1))));
    if (P.cds) P.cds[id] = 0;
  }

  // 一顆小碎石粒子
  function rock(x, y, vx, vy, life, size) {
    G.fx.particles.push({ x, y, vx, vy, life, t: 0, size: size || U.rand(3, 6), color: U.pick(['#6a5a4a', '#8a7660', '#4e4034', '#a08a6a']), grav: 900, shape: 'square', drag: 0.5 });
  }

  Object.assign(X, {
    ults,

    // ═════════ 冥道殘月破 ═════════
    meidou: {
      start(P, S, id, lv) {
        P.action = { type: 'meidouCast', id, lv, t: 0, dur: S.castTime, done: false };
        P.vx = 0;
        P.glowT = 0.9;
        P.invT = Math.max(P.invT || 0, 0.6);
        G.fx.iaiDim = 0.55;
        G.audio.play('charge');
        // 刀尖畫出一道細細的月牙
        ults.push({ kind: 'crescentTrace', x: P.x + P.dir * 10, y: P.y - 44, dir: P.dir, t: 0, life: 0.45 });
      },
    },
    meidouCast: {
      update(P, a, dt) {
        P.vx = 0;
        if (a.done || a.t < 0.38) return;
        a.done = true;
        const S = G.data.skills[a.id];
        G.audio.play('sweep');
        G.audio.play('portal');
        G.fx.shake(10, 0.25);
        G.fx.screenFlash('#e8e0ff', 0.35);
        ults.push({
          kind: 'meidou', phase: 'fly', x: P.x + P.dir * 50, y: P.y - 60, x0: P.x + P.dir * 50, dir: P.dir, t: 0, pt: 0,
          lv: a.lv, S, hit: [], tickT: 0, r: 0, spin: 0, motes: [],
        });
      },
    },

    // ═════════ 地爆天星 ═════════
    chibaku: {
      start(P, S, id, lv) {
        const list = G.combat.targets().filter((m) => U.dist(m.x, midY(m), P.x, P.y - 30) < S.radius);
        // 優先 Boss，其次血量最多的
        list.sort((p, q) => (q.isBoss ? 1e9 : 0) + q.maxHp - ((p.isBoss ? 1e9 : 0) + p.maxHp));
        const m = list[0];
        if (!m) {
          refund(P, S, id, lv);
          G.hud.toast('附近沒有目標', '#cfe');
          return;
        }
        P.action = { type: 'chibakuCast', id, lv, t: 0, dur: S.castTime, done: false, m };
        P.vx = 0;
        P.glowT = 0.6;
        G.fx.iaiDim = 0.4;
        G.audio.play('charge');
      },
    },
    chibakuCast: {
      update(P, a, dt) {
        P.vx = 0;
        if (a.done || a.t < 0.25) return;
        a.done = true;
        const S = G.data.skills[a.id];
        const m = a.m;
        if (!alive(m)) return;
        G.audio.play('portal');
        ults.push({
          kind: 'chibaku', phase: 'throw', m, S, lv: a.lv, t: 0, pt: 0,
          ox: P.x + P.dir * 20, oy: P.y - 50, sx: P.x + P.dir * 20, sy: P.y - 50,
          orbR: 8, shell: [], rocks: [], n: 0, slashT: 0,
          size: Math.max(34, Math.min(120, Math.max(m.w, m.h) * (m.scale || 1) * 0.6 + 18)),
        });
      },
    },

    // ── 每幀推進 ──
    tickUlt(dt) {
      for (let i = ults.length - 1; i >= 0; i--) {
        const u = ults[i];
        u.t += dt;
        u.pt += dt;
        const done = u.kind === 'meidou' ? this.tickMeidou(u, dt) : u.kind === 'chibaku' ? this.tickChibaku(u, dt) : u.t >= u.life;
        if (done) ults.splice(i, 1);
      }
    },

    tickMeidou(u, dt) {
      const S = u.S;
      const R = S.radius;
      const inside = () => G.combat.targets().filter((m) => U.dist(m.x, midY(m), u.x, u.y) < R + m.w * 0.3).slice(0, S.targets);
      u.spin += dt * (u.phase === 'open' ? 2.4 : 6);
      if (u.phase === 'fly') {
        // 殘月往前飛、慢慢變大，經過的敵人各打一下
        const k = Math.min(1, u.pt / 0.42);
        u.x = u.x0 + u.dir * S.travel * (1 - Math.pow(1 - k, 2.2));
        u.size = 70 + 150 * k;
        G.combat.targets().forEach((m) => {
          if (u.hit.indexOf(m) >= 0) return;
          if (Math.abs(m.x - u.x) < 50 + m.w * 0.4 && Math.abs(midY(m) - u.y) < u.size * 0.6) {
            u.hit.push(m);
            G.combat.hitMonster(m, S.mult(u.lv), { knock: 0, sound: 'spirit' });
            G.fx.cut(m.x, midY(m), U.rand(1.2, 1.9), 150, { w: 4, life: 0.3, col: '190,160,255' });
          }
        });
        if (Math.random() < 0.8) G.fx.particles.push({ x: u.x - u.dir * 20, y: u.y + U.rand(-u.size * 0.4, u.size * 0.4), vx: -u.dir * 200, vy: U.rand(-40, 40), life: 0.4, t: 0, size: U.rand(2, 4), color: U.pick(['#c8b0ff', '#ffffff', '#3a2466']), grav: 0, shape: 'circle', drag: 1 });
        if (k >= 1) {
          u.phase = 'open';
          u.pt = 0;
          G.audio.play('bossWarn');
          G.fx.shake(12, 0.3);
          G.fx.ring(u.x, u.y, 'rgba(200,170,255,0.95)', R * 1.2, 0.35, 8);
        }
        return false;
      }
      if (u.phase === 'open') {
        // 冥道張開：把敵人吸過來，連續削
        u.r = R * Math.min(1, u.pt / 0.22);
        G.fx.iaiDim = Math.max(G.fx.iaiDim, 0.3);
        G.fx.shake(3, 0.05);
        inside().forEach((m) => {
          if (!m.isBoss) {
            m.x += (u.x - m.x) * Math.min(1, dt * 3.5);
            m.vx = 0;
            m.stunT = Math.max(m.stunT || 0, 0.3);
          }
        });
        u.tickT -= dt;
        if (u.tickT <= 0 && u.pt > 0.2) {
          u.tickT = S.tick;
          inside().forEach((m) => {
            G.combat.hitMonster(m, S.tickMult(u.lv), { knock: 0, sound: 'spirit', noFx: true });
            G.fx.cut(m.x + U.rand(-20, 20), midY(m) + U.rand(-20, 20), U.rand(0, Math.PI), U.rand(60, 110), { w: 2.4, life: 0.22, col: '170,130,255' });
          });
        }
        // 往中心捲進去的星塵
        for (let k = 0; k < 3; k++) {
          const ang = Math.random() * TAU;
          const d = u.r * U.rand(1.05, 1.6);
          G.fx.particles.push({ x: u.x + Math.cos(ang) * d, y: u.y + Math.sin(ang) * d, vx: -Math.cos(ang) * d * 2.2, vy: -Math.sin(ang) * d * 2.2, life: 0.42, t: 0, size: U.rand(1.5, 3.5), color: U.pick(['#ffffff', '#c8b0ff', '#8a6ad8']), grav: 0, shape: 'circle', drag: 0 });
        }
        if (u.pt >= S.open) {
          u.phase = 'close';
          u.pt = 0;
          G.audio.play('sweep');
        }
        return false;
      }
      if (u.phase === 'close') {
        // 闔上：縮成一道細縫，然後爆開
        u.r = R * Math.max(0, 1 - u.pt / 0.18);
        if (u.pt >= 0.18 && !u.boom) {
          u.boom = true;
          G.audio.play('thunder');
          G.fx.shake(18, 0.45);
          G.fx.addHitstop(0.12);
          G.fx.screenFlash('#ffffff', 0.8);
          G.fx.cut(u.x, u.y, 0, R * 2.6, { w: 10, life: 0.5, grow: 0.03, col: '200,170,255' });
          G.fx.ring(u.x, u.y, 'rgba(255,255,255,0.95)', R * 1.6, 0.45, 10);
          G.fx.ring(u.x, u.y, 'rgba(150,110,255,0.9)', R * 2.2, 0.6, 6);
          G.fx.burst(u.x, u.y, ['#ffffff', '#c8b0ff', '#2a1850'], 40, 620);
          inside().forEach((m) => G.combat.hitMonster(m, S.closeMult(u.lv), { knock: 480, heavy: true, sound: 'double' }));
        }
        return u.pt >= 0.5;
      }
      return true;
    },

    tickChibaku(u, dt) {
      const S = u.S;
      const m = u.m;
      const tx = () => m.x;
      const ty = () => midY(m);
      if (!alive(m) && u.phase !== 'burst') {
        u.phase = 'burst';
        u.pt = 0;
      }
      if (u.phase === 'throw') {
        // 黑色核心飛到目標身上
        const k = Math.min(1, u.pt / 0.32);
        u.ox = u.sx + (tx() - u.sx) * k;
        u.oy = u.sy + (ty() - u.sy) * k - Math.sin(k * Math.PI) * 80;
        if (k >= 1) {
          u.phase = 'pull';
          u.pt = 0;
          G.audio.play('bossWarn');
          G.fx.ring(u.ox, u.oy, 'rgba(40,20,60,0.9)', 260, 0.5, 10);
          G.fx.shake(8, 0.3);
        }
        return false;
      }
      // 吸住：目標被定住（Boss 也一樣定住）
      if (u.phase !== 'burst') {
        u.ox = tx();
        u.oy = ty();
        m.vx = 0;
        m.stunT = Math.max(m.stunT || 0, 0.3);
        if (!m.isBoss) m.frozenT = Math.max(m.frozenT || 0, 0.1);
      }
      if (u.phase === 'pull') {
        u.orbR = 8 + 14 * Math.min(1, u.pt / 0.5);
        G.fx.iaiDim = Math.max(G.fx.iaiDim, 0.25);
        G.fx.shake(4, 0.05);
        // 四周的地面裂開，岩石飛過去黏在外殼上
        if (u.shell.length < 26 && Math.random() < 0.55) {
          const side = Math.random() < 0.5 ? -1 : 1;
          u.rocks.push({ x: u.ox + side * U.rand(120, 320), y: G.player.y + U.rand(-10, 20), t: 0, a: Math.random() * TAU, s: U.rand(0.7, 1.3) });
          rock(u.rocks[u.rocks.length - 1].x, G.player.y, U.rand(-80, 80), U.rand(-300, -120), 0.5);
        }
        for (let i = u.rocks.length - 1; i >= 0; i--) {
          const r = u.rocks[i];
          r.t += dt;
          const k = Math.min(1, r.t / 0.35);
          r.x += (u.ox - r.x) * Math.min(1, dt * 7);
          r.y += (u.oy - r.y) * Math.min(1, dt * 7);
          if (k >= 1 || U.dist(r.x, r.y, u.ox, u.oy) < u.size * 0.9) {
            u.rocks.splice(i, 1);
            u.shell.push({ a: r.a, d: U.rand(0.75, 1.05), s: r.s, rot: Math.random() * TAU });
            G.audio.play('rock');
          }
        }
        if (u.pt >= 1.1) {
          u.phase = 'slash';
          u.pt = 0;
          u.rocks.length = 0;
          while (u.shell.length < 22) u.shell.push({ a: Math.random() * TAU, d: U.rand(0.75, 1.05), s: U.rand(0.7, 1.3), rot: Math.random() * TAU });
          G.fx.shake(10, 0.2);
        }
        return false;
      }
      if (u.phase === 'slash') {
        // 石球被封住後，一發接一發的大黑閃在上面炸開
        u.slashT -= dt;
        if (u.slashT <= 0 && u.n < S.hits) {
          u.slashT = 0.14;
          const bx = u.ox + U.rand(-0.45, 0.45) * u.size;
          const by = u.oy + U.rand(-0.45, 0.45) * u.size;
          G.fx.blackFlash(bx, by, Math.random() < 0.5 ? -1 : 1, 2.6 + u.n * 0.12);
          G.fx.darkFlash = 0.16;
          G.fx.impact(bx, by, 60, '#ff3a4a');
          for (let k = 0; k < 4; k++) rock(u.ox + U.rand(-u.size, u.size), u.oy + U.rand(-u.size, u.size), U.rand(-300, 300), U.rand(-360, 60), 0.5, U.rand(2, 5));
          if (alive(m)) G.combat.hitMonster(m, S.mult(u.lv), { knock: 0, sound: 'crit' });
          G.audio.play('crit');
          G.fx.addHitstop(0.05);
          G.fx.shake(9, 0.1);
          u.n++;
        }
        if (u.n >= S.hits && u.slashT <= 0) {
          u.phase = 'burst';
          u.pt = 0;
          // 最後一發前的停頓
          G.fx.iaiDim = 0.5;
        }
        return false;
      }
      // 炸開
      if (!u.boom && u.pt >= 0.2) {
        u.boom = true;
        G.audio.play('thunder');
        G.fx.shake(20, 0.5);
        G.fx.addHitstop(0.14);
        G.fx.screenFlash('#ffffff', 0.85);
        G.fx.cut(u.ox, u.oy, -0.6, u.size * 3 + 160, { w: 9, life: 0.45, grow: 0.025 });
        G.fx.cut(u.ox, u.oy, 0.6, u.size * 3 + 160, { w: 9, life: 0.45, grow: 0.025, delay: 0.04 });
        G.fx.ring(u.ox, u.oy, 'rgba(255,255,255,0.95)', u.size * 3, 0.4, 10);
        G.fx.ring(u.ox, u.oy, 'rgba(120,90,60,0.9)', u.size * 4.5, 0.6, 6);
        G.fx.impact(u.ox, u.oy, 120, '#ffffff');
        G.fx.blackFlash(u.ox, u.oy, 1, 4.5);
        G.fx.darkFlash = 0.16;
        G.fx.burst(u.ox, u.oy, ['#ffffff', '#ffe08a', '#ff9a3a'], 30, 600);
        u.shell.forEach((s) => rock(u.ox + Math.cos(s.a) * u.size * s.d, u.oy + Math.sin(s.a) * u.size * s.d, Math.cos(s.a) * U.rand(300, 700), Math.sin(s.a) * U.rand(300, 700) - 200, 0.9, U.rand(5, 9) * s.s));
        u.shell.length = 0;
        if (alive(m)) G.combat.hitMonster(m, S.finalMult(u.lv), { knock: 560, heavy: true, sound: 'double' });
      }
      return u.pt >= 0.6;
    },

    // ── 畫在世界座標上（由 fx.drawCuts 呼叫，在變暗之後、刀痕之前） ──
    drawUlt(ctx) {
      if (!ults.length) return;
      const A = G.art;
      for (const u of ults) {
        ctx.save();
        if (u.kind === 'crescentTrace') this.drawTrace(ctx, u);
        else if (u.kind === 'meidou') this.drawMeidou(ctx, u);
        else if (u.kind === 'chibaku') this.drawChibaku(ctx, u, A);
        ctx.restore();
      }
    },

    // 起手：刀尖劃出的細月牙
    drawTrace(ctx, u) {
      const k = Math.min(1, u.t / 0.3);
      const fade = u.t > 0.3 ? 1 - (u.t - 0.3) / 0.15 : 1;
      ctx.translate(u.x, u.y);
      ctx.scale(u.dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(200,170,255,' + (0.5 * fade).toFixed(3) + ')';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 58, -Math.PI * 0.7, -Math.PI * 0.7 + Math.PI * 1.35 * k);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + fade.toFixed(3) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
    },

    // 殘月：黑色的月牙，外緣發著紫白色的光；張開後變成吞噬一切的黑洞
    drawMeidou(ctx, u) {
      ctx.translate(u.x, u.y);
      if (u.phase === 'fly') {
        const s = u.size;
        ctx.scale(u.dir, 1);
        // 外光
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 0.75);
        g.addColorStop(0, 'rgba(150,110,255,0.35)');
        g.addColorStop(1, 'rgba(150,110,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.75, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        // 月牙本體（兩個圓相減）
        const crescent = (r1, off) => {
          ctx.beginPath();
          ctx.arc(0, 0, r1, -Math.PI / 2, Math.PI / 2);
          ctx.arc(-off, 0, Math.sqrt(r1 * r1 + 0) * 0.92, Math.PI / 2, -Math.PI / 2, true);
          ctx.closePath();
        };
        crescent(s * 0.5, s * 0.22);
        ctx.fillStyle = '#0a0612';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(210,190,255,0.95)';
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        // 月牙裡的星
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i + 0.5) * (Math.PI / 7);
          const r = s * 0.4;
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(u.t * 20 + i);
          ctx.fillRect(Math.cos(a) * r - 1, Math.sin(a) * r - 1, 2, 2);
        }
        ctx.globalAlpha = 1;
        return;
      }
      const r = u.r;
      if (r <= 0.5) return;
      // 冥道：外圈的光暈
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.5);
      halo.addColorStop(0, 'rgba(160,120,255,0.55)');
      halo.addColorStop(1, 'rgba(160,120,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.5, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // 撕開的邊緣：鋸齒狀
      ctx.beginPath();
      const n = 48;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU + u.spin * 0.2;
        const rr = r * (1 + 0.06 * Math.sin(a * 7 + u.t * 9) + 0.04 * Math.sin(a * 13 - u.t * 6));
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr * 0.92;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      core.addColorStop(0, '#000000');
      core.addColorStop(0.75, '#07040e');
      core.addColorStop(1, '#241640');
      ctx.fillStyle = core;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(200,170,255,0.9)';
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      // 裡面：往中心旋轉的星塵與渦紋
      ctx.save();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      for (let arm = 0; arm < 4; arm++) {
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
          const k = i / 24;
          const a = arm * (TAU / 4) + k * 4 - u.spin;
          const rr = r * (1 - k) * 0.95;
          const x = Math.cos(a) * rr;
          const y = Math.sin(a) * rr;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = 'rgba(140,100,230,0.35)';
        ctx.lineWidth = 7;
        ctx.stroke();
      }
      for (let i = 0; i < 36; i++) {
        const a = i * 2.39996 - u.spin * (1 + (i % 3) * 0.3);
        const rr = r * (((i * 0.137 + u.t * 0.35) % 1));
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.5 * (rr / r)).toFixed(3) + ')';
        ctx.fillRect(Math.cos(a) * rr - 1.2, Math.sin(a) * rr - 1.2, 2.4, 2.4);
      }
      ctx.restore();
      // 闔上時的一道白縫
      if (u.phase === 'close') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(-u.S.radius * 1.2, -3, u.S.radius * 2.4, 6);
      }
    },

    // 地爆天星：黑色核心 → 吸過去的岩石 → 石球外殼
    drawChibaku(ctx, u, A) {
      if (u.phase === 'burst' && u.boom) return;
      const x = u.ox;
      const y = u.oy;
      // 重力扭曲的暗圈
      if (u.phase !== 'throw') {
        const k = Math.min(1, u.t / 0.6);
        const g = ctx.createRadialGradient(x, y, u.size * 0.3, x, y, u.size * 2.6);
        g.addColorStop(0, 'rgba(20,10,30,' + (0.45 * k).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(20,10,30,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, u.size * 2.6, 0, TAU);
        ctx.fill();
        // 被吸過去的氣流線
        ctx.strokeStyle = 'rgba(200,180,255,0.35)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = i * (TAU / 8) + u.t * 1.5;
          const r0 = u.size * (2.4 - ((u.t * 1.6 + i * 0.13) % 1) * 1.3);
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
          ctx.lineTo(x + Math.cos(a + 0.3) * (r0 - 30), y + Math.sin(a + 0.3) * (r0 - 30));
          ctx.stroke();
        }
      }
      // 飛過去的岩石
      u.rocks.forEach((r) => this.rockShape(ctx, r.x, r.y, 11 * r.s, r.a + r.t * 8));
      // 外殼
      if (u.shell.length) {
        const pulse = u.phase === 'slash' ? 1 + Math.sin(u.t * 40) * 0.03 : 1;
        // 石球底色
        if (u.shell.length > 14) {
          ctx.fillStyle = A.c('#4e4034');
          ctx.beginPath();
          ctx.arc(x, y, u.size * 0.9 * pulse, 0, TAU);
          ctx.fill();
        }
        u.shell.forEach((s) => this.rockShape(ctx, x + Math.cos(s.a) * u.size * s.d * pulse, y + Math.sin(s.a) * u.size * s.d * pulse, 13 * s.s * (u.size / 60 + 0.5), s.rot));
        // 石縫裡透出的紅光（黑閃越打越亮）
        if (u.phase === 'slash' || u.phase === 'burst') {
          const k = u.phase === 'burst' ? 1 : u.n / u.S.hits;
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(x, y, 0, x, y, u.size * 1.2);
          g.addColorStop(0, 'rgba(255,60,80,' + (0.6 * k).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(160,0,30,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, u.size * 1.2, 0, TAU);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      // 黑色核心
      if (u.phase === 'throw' || u.phase === 'pull') {
        const R = u.orbR;
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y, R * 0.8, x, y, R * 2.2);
        g.addColorStop(0, 'rgba(180,140,255,0.6)');
        g.addColorStop(1, 'rgba(180,140,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, R * 2.2, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#05020a';
        ctx.beginPath();
        ctx.arc(x, y, R, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(230,215,255,0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },

    rockShape(ctx, x, y, r, rot) {
      const A = G.art;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = A.c('#8a7660');
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.3);
      ctx.lineTo(-r * 0.4, -r);
      ctx.lineTo(r * 0.6, -r * 0.8);
      ctx.lineTo(r, 0);
      ctx.lineTo(r * 0.5, r * 0.85);
      ctx.lineTo(-r * 0.6, r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = A.c('#6a5a4a');
      ctx.beginPath();
      ctx.moveTo(r * 0.5, r * 0.85);
      ctx.lineTo(r, 0);
      ctx.lineTo(r * 0.2, r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  });

  // 接到 tick3（player.update 每幀呼叫）與換圖時的清除
  const tick3 = X.tick3;
  X.tick3 = function (dt) {
    tick3.call(this, dt);
    this.tickUlt(dt);
  };
  const reset = X.resetZones;
  X.resetZones = function () {
    reset();
    ults.length = 0;
  };
})();
