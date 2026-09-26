// 五轉技能的執行與特效（資料在 js/data/skills5.js）。
// 兩招都是好幾秒的大演出，狀態放在 ults 裡，每幀由 tick3 推進、由 fx.drawCuts 畫出來。
//   冥道殘月破：月牙射出 → 張開成完全圓形的黑洞（裡面是星辰與銀河）→ 把敵人吸進去連續傷害 → 闔上爆開
//   地爆天星：黑色核心往前扔 → 目標被吸到核心旁定住 → 10 發黑閃，每一發都是一次重擊
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

  // 黑洞裡的宇宙：三層往同一個方向流動的星星（遠的慢、近的快）＋好幾個各自旋轉、漂移的小銀河
  const STARS = [];
  for (let i = 0; i < 220; i++) {
    const layer = i % 3;
    STARS.push({ x: U.rand(-1, 1), y: U.rand(-1, 1), layer, s: layer === 2 ? U.rand(1.2, 2.2) : layer === 1 ? U.rand(0.8, 1.4) : U.rand(0.4, 0.9), tw: Math.random() * TAU, c: U.pick(['255,255,255', '255,255,255', '205,220,255', '255,228,240', '220,200,255']) });
  }
  const GAL_COLORS = [['255,200,240', '190,120,255'], ['200,225,255', '110,150,255'], ['255,235,200', '255,150,120'], ['220,255,245', '100,210,220'], ['255,255,255', '200,170,255']];
  const GALAXIES = [];
  for (let i = 0; i < 7; i++) {
    const dots = [];
    const arms = 2 + (i % 2);
    for (let k = 0; k < 46; k++) {
      const t = k / 46;
      const arm = k % arms;
      dots.push({ a: (arm / arms) * TAU + t * 4.2 + U.rand(-0.3, 0.3), d: 0.12 + t * 0.9 + U.rand(-0.05, 0.05), s: U.rand(0.5, 1.4) * (1.1 - t * 0.6) });
    }
    GALAXIES.push({
      x: U.rand(-0.8, 0.8), y: U.rand(-0.8, 0.8), size: i < 2 ? U.rand(0.26, 0.34) : U.rand(0.1, 0.2),
      tilt: U.rand(0, Math.PI), flat: U.rand(0.3, 0.65), spin: U.rand(0.4, 1.1) * (i % 2 ? 1 : -1),
      vx: U.rand(-0.06, -0.02), vy: U.rand(0.01, 0.04), col: GAL_COLORS[i % GAL_COLORS.length], dots,
    });
  }
  const wrap = (v) => ((((v + 1.25) % 2.5) + 2.5) % 2.5) - 1.25;

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
        ults.push({ kind: 'meidou', phase: 'fly', x: P.x + P.dir * 50, y: P.y - 60, x0: P.x + P.dir * 50, dir: P.dir, t: 0, pt: 0, lv: a.lv, S, hit: [], tickT: 0, r: 0, spin: 0, size: 70, trail: [] });
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
        G.fx.iaiDim = 0.35;
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
        // 核心往前扔到半路；Boss 太重，核心直接飛到牠身上
        const dir = U.sign(m.x - P.x) || P.dir;
        const gap = Math.abs(m.x - P.x);
        const tx = m.isBoss ? m.x : P.x + dir * Math.max(90, Math.min(260, gap * 0.5));
        ults.push({ kind: 'chibaku', phase: 'throw', m, S, lv: a.lv, t: 0, pt: 0, dir, sx: P.x + dir * 20, sy: P.y - 50, tx, ty: midY(m), ox: P.x + dir * 20, oy: P.y - 50, R: 7, n: 0, flashT: 0, spin: 0, dust: [] });
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
      u.spin += dt * (u.phase === 'open' ? 0.9 : 0);
      if (u.phase === 'fly') {
        // 月牙往前射出、越飛越大，經過的敵人各打一下
        const k = Math.min(1, u.pt / 0.42);
        u.trail.unshift({ x: u.x, size: u.size });
        if (u.trail.length > 5) u.trail.pop();
        u.x = u.x0 + u.dir * S.travel * (1 - Math.pow(1 - k, 2.2));
        u.size = 70 + 170 * k;
        G.combat.targets().forEach((m) => {
          if (u.hit.indexOf(m) >= 0) return;
          if (Math.abs(m.x - u.x) < 50 + m.w * 0.4 && Math.abs(midY(m) - u.y) < u.size * 0.6) {
            u.hit.push(m);
            G.combat.hitMonster(m, S.mult(u.lv), { knock: 0, sound: 'spirit' });
          }
        });
        if (k >= 1) {
          u.phase = 'open';
          u.pt = 0;
          u.trail.length = 0;
          G.audio.play('bossWarn');
          G.fx.shake(12, 0.3);
          G.fx.ring(u.x, u.y, 'rgba(210,190,255,0.9)', R * 1.25, 0.4, 6);
        }
        return false;
      }
      if (u.phase === 'open') {
        // 黑洞張開：把敵人往中心吸，連續傷害
        u.r = R * (1 - Math.pow(1 - Math.min(1, u.pt / 0.28), 3));
        G.fx.iaiDim = Math.max(G.fx.iaiDim, 0.3);
        G.fx.shake(2.5, 0.05);
        inside().forEach((m) => {
          if (!m.isBoss) {
            m.x += (u.x - m.x) * Math.min(1, dt * 3.5);
            m.vx = 0;
            m.stunT = Math.max(m.stunT || 0, 0.3);
          }
        });
        u.tickT -= dt;
        if (u.tickT <= 0 && u.pt > 0.25) {
          u.tickT = S.tick;
          inside().forEach((m) => G.combat.hitMonster(m, S.tickMult(u.lv), { knock: 0, sound: 'spirit', noFx: true }));
        }
        // 外面的光點被吸進去
        for (let k = 0; k < 2; k++) {
          const ang = Math.random() * TAU;
          const d = u.r * U.rand(1.15, 1.7);
          G.fx.particles.push({ x: u.x + Math.cos(ang) * d, y: u.y + Math.sin(ang) * d, vx: -Math.cos(ang) * d * 2.4, vy: -Math.sin(ang) * d * 2.4, life: 0.38, t: 0, size: U.rand(1.5, 3), color: U.pick(['#ffffff', '#d8c8ff']), grav: 0, shape: 'circle', drag: 0 });
        }
        if (u.pt >= S.open) {
          u.phase = 'close';
          u.pt = 0;
          G.audio.play('sweep');
        }
        return false;
      }
      if (u.phase === 'close') {
        // 闔上：圓縮成一道細縫，然後爆開
        u.r = R * Math.max(0, 1 - u.pt / 0.2);
        if (u.pt >= 0.2 && !u.boom) {
          u.boom = true;
          G.audio.play('thunder');
          G.fx.shake(18, 0.45);
          G.fx.addHitstop(0.12);
          G.fx.screenFlash('#ffffff', 0.55);
          G.fx.cut(u.x, u.y, 0, R * 2.6, { w: 9, life: 0.45, grow: 0.03, col: '200,170,255' });
          G.fx.ring(u.x, u.y, 'rgba(255,255,255,0.95)', R * 1.6, 0.45, 8);
          G.fx.ring(u.x, u.y, 'rgba(150,110,255,0.85)', R * 2.2, 0.6, 5);
          G.fx.burst(u.x, u.y, ['#ffffff', '#c8b0ff', '#8fb0ff'], 40, 620);
          inside().forEach((m) => G.combat.hitMonster(m, S.closeMult(u.lv), { knock: 480, heavy: true, sound: 'double' }));
        }
        return u.pt >= 0.5;
      }
      return true;
    },

    tickChibaku(u, dt) {
      const S = u.S;
      const m = u.m;
      u.spin += dt * 3;
      if (!alive(m) && u.phase !== 'end') {
        u.phase = 'end';
        u.pt = 0;
      }
      if (u.phase === 'throw') {
        // 核心沿著弧線飛出去
        const k = Math.min(1, u.pt / 0.34);
        u.ox = u.sx + (u.tx - u.sx) * k;
        u.oy = u.sy + (u.ty - u.sy) * k - Math.sin(k * Math.PI) * 70;
        if (k >= 1) {
          u.phase = 'pull';
          u.pt = 0;
          G.audio.play('bossWarn');
          G.fx.ring(u.ox, u.oy, 'rgba(255,60,80,0.8)', 160, 0.4, 4);
          G.fx.shake(6, 0.25);
        }
        return false;
      }
      if (u.phase === 'pull') {
        // 核心張開引力，目標被吸過來
        u.R = 7 + 11 * Math.min(1, u.pt / 0.3);
        m.vx = 0;
        m.stunT = Math.max(m.stunT || 0, 0.3);
        if (!m.isBoss) {
          m.x += (u.ox - m.x) * Math.min(1, dt * 6);
          m.squash = 0.6;
        }
        u.oy += (midY(m) - u.oy) * Math.min(1, dt * 8);
        if (Math.random() < 0.7) {
          const ang = Math.random() * TAU;
          const d = U.rand(90, 170);
          G.fx.particles.push({ x: u.ox + Math.cos(ang) * d, y: u.oy + Math.sin(ang) * d, vx: -Math.cos(ang) * d * 3, vy: -Math.sin(ang) * d * 3, life: 0.3, t: 0, size: U.rand(1.5, 3), color: U.pick(['#ffd0d8', '#ffffff', '#ff5a6a']), grav: 0, shape: 'circle', drag: 0 });
        }
        if (u.pt >= 0.55 && (m.isBoss || Math.abs(m.x - u.ox) < 12)) {
          u.phase = 'flash';
          u.pt = 0;
          u.flashT = 0.12;
        } else if (u.pt >= 1.0) {
          u.phase = 'flash';
          u.pt = 0;
          u.flashT = 0.12;
        }
        return false;
      }
      if (u.phase === 'flash') {
        // 10 發黑閃，每一發都是一次重擊
        m.vx = 0;
        m.stunT = Math.max(m.stunT || 0, 0.3);
        if (!m.isBoss) m.x += (u.ox - m.x) * Math.min(1, dt * 10);
        u.ox += (m.x - u.ox) * Math.min(1, dt * 10);
        u.oy += (midY(m) - u.oy) * Math.min(1, dt * 10);
        u.flashT -= dt;
        if (u.flashT <= 0 && u.n < S.hits) {
          const last = u.n === S.hits - 1;
          u.flashT = last ? 0.3 : 0.15;
          const bx = u.ox + U.rand(-18, 18);
          const by = u.oy + U.rand(-18, 18);
          const big = last ? 5.5 : 2.8 + u.n * 0.15;
          G.fx.blackFlash(bx, by, u.n % 2 ? -1 : 1, big);
          G.fx.darkFlash = 0.16;
          G.fx.impact(bx, by, last ? 150 : 80, '#ff3a4a');
          G.fx.ring(bx, by, 'rgba(20,0,10,0.9)', last ? 260 : 120, last ? 0.4 : 0.22, last ? 10 : 6);
          G.fx.kick((u.n % 2 ? -1 : 1) * 10, -3);
          if (alive(m)) G.combat.hitMonster(m, last ? S.finalMult(u.lv) : S.mult(u.lv), { knock: last ? 560 : 0, heavy: true, sound: 'crit' });
          G.audio.play('crit');
          if (last) G.audio.play('thunder');
          G.fx.addHitstop(last ? 0.16 : 0.08);
          G.fx.shake(last ? 20 : 12, last ? 0.45 : 0.14);
          u.n++;
          if (last) {
            u.phase = 'end';
            u.pt = 0;
          }
        }
        return false;
      }
      // 核心向內塌縮、消失
      return u.pt >= 0.35;
    },

    // ── 畫在世界座標上（由 fx.drawCuts 呼叫，在變暗之後、刀痕之前） ──
    drawUlt(ctx) {
      if (!ults.length) return;
      for (const u of ults) {
        ctx.save();
        if (u.kind === 'crescentTrace') this.drawTrace(ctx, u);
        else if (u.kind === 'meidou') this.drawMeidou(ctx, u);
        else if (u.kind === 'chibaku') this.drawChibaku(ctx, u);
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },

    // 起手：刀尖劃出的細月牙
    drawTrace(ctx, u) {
      const k = Math.min(1, u.t / 0.3);
      const fade = u.t > 0.3 ? Math.max(0, 1 - (u.t - 0.3) / 0.15) : 1;
      ctx.translate(u.x, u.y);
      ctx.scale(u.dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 58, -Math.PI * 0.7, -Math.PI * 0.7 + Math.PI * 1.35 * k);
      ctx.strokeStyle = 'rgba(200,170,255,' + (0.5 * fade).toFixed(3) + ')';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + fade.toFixed(3) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
    },

    // 月牙：黑色的新月，外緣一圈白光
    crescent(ctx, s, alpha) {
      const r1 = s * 0.5;
      const off = s * 0.24;
      ctx.beginPath();
      ctx.arc(0, 0, r1, -Math.PI / 2, Math.PI / 2);
      ctx.arc(-off, 0, Math.sqrt(r1 * r1 + off * off) * 0.97, Math.atan2(r1, off), -Math.atan2(r1, off), true);
      ctx.closePath();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#07040f';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(200,180,255,0.9)';
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.globalAlpha = 1;
    },

    drawMeidou(ctx, u) {
      if (u.phase === 'fly') {
        // 殘影
        u.trail.forEach((tr, i) => {
          ctx.save();
          ctx.translate(tr.x, u.y);
          ctx.scale(u.dir, 1);
          this.crescent(ctx, tr.size, 0.25 * (1 - i / u.trail.length));
          ctx.restore();
        });
        ctx.translate(u.x, u.y);
        ctx.scale(u.dir, 1);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, u.size * 0.2, 0, 0, u.size * 0.8);
        g.addColorStop(0, 'rgba(150,110,255,0.3)');
        g.addColorStop(1, 'rgba(150,110,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, u.size * 0.8, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        this.crescent(ctx, u.size, 1);
        return;
      }
      const r = u.r;
      if (r <= 0.5) return;
      ctx.translate(u.x, u.y);
      // 外圈柔光
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.45);
      halo.addColorStop(0, 'rgba(170,140,255,0.5)');
      halo.addColorStop(1, 'rgba(170,140,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.45, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // 完全圓形的黑洞：深空漸層
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      const space = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      space.addColorStop(0, '#1a1030');
      space.addColorStop(0.35, '#0a0616');
      space.addColorStop(0.85, '#03020a');
      space.addColorStop(1, '#120a26');
      ctx.fillStyle = space;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      const T = u.t;
      // 星星：三層以不同速度往左下流動，像在宇宙裡前進
      for (const st of STARS) {
        const sp = [0.05, 0.11, 0.22][st.layer];
        const x = wrap(st.x - T * sp) * r;
        const y = wrap(st.y + T * sp * 0.45) * r;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(T * (2 + st.layer) + st.tw));
        ctx.fillStyle = 'rgba(' + st.c + ',' + tw.toFixed(3) + ')';
        if (st.layer === 2 && st.s > 1.8) {
          ctx.fillRect(x - st.s * 2.2, y - 0.5, st.s * 4.4, 1);
          ctx.fillRect(x - 0.5, y - st.s * 2.2, 1, st.s * 4.4);
        }
        ctx.beginPath();
        ctx.arc(x, y, st.s, 0, TAU);
        ctx.fill();
      }
      // 銀河：每一個各自旋轉，慢慢漂過黑洞
      for (const gx of GALAXIES) {
        const cx = wrap(gx.x + T * gx.vx) * r;
        const cy = wrap(gx.y + T * gx.vy) * r;
        const R = gx.size * r;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(gx.tilt);
        ctx.scale(1, gx.flat);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
        glow.addColorStop(0, 'rgba(' + gx.col[0] + ',0.55)');
        glow.addColorStop(0.35, 'rgba(' + gx.col[1] + ',0.22)');
        glow.addColorStop(1, 'rgba(' + gx.col[1] + ',0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, TAU);
        ctx.fill();
        const rot = T * gx.spin;
        ctx.fillStyle = 'rgba(' + gx.col[0] + ',0.6)';
        for (const d of gx.dots) {
          const a = d.a + rot;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * d.d * R, Math.sin(a) * d.d * R, d.s, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1.2, R * 0.07), 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      // 偶爾劃過的流星
      const ms = (T * 1.3) % 1;
      if (ms < 0.25) {
        const k = ms / 0.25;
        const sx = r * (0.7 - k * 1.6);
        const sy = r * (-0.5 + k * 0.7);
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + r * 0.18, sy - r * 0.08);
        ctx.stroke();
      }
      ctx.restore();
      // 被吸進去的敵人：淡紫色的影子在裡面旋轉
      const A = G.art;
      G.combat.targets().forEach((m) => {
        const d = U.dist(m.x, midY(m), u.x, u.y);
        if (d > r) return;
        ctx.save();
        ctx.translate(m.x - u.x, midY(m) - u.y);
        ctx.rotate(u.t * 2.5);
        ctx.scale(0.75, 0.75);
        ctx.globalAlpha = 0.4;
        const fake = Object.assign(Object.create(m), { x: 0, y: m.h * (m.scale || 1) * 0.5, dead: false, deadT: 0, hurtFlash: 0, squash: 0, shiny: false, V: null });
        A.mode = 'tint';
        A.modeColor = '#d8ccff';
        A.modeAmt = 0.85;
        try {
          A.drawMonster(ctx, fake);
        } catch (e) {
          // 某些怪物的畫法依賴自身狀態，畫不出來就略過
        }
        A.mode = null;
        ctx.restore();
      });
      // 邊緣：乾淨的一圈白光
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(200,180,255,0.85)';
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      // 闔上時的一道白縫
      if (u.phase === 'close') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(-u.S.radius * 1.2, -2.5, u.S.radius * 2.4, 5);
      }
    },

    // 地爆天星的核心：純黑的球、細白邊，外面一圈旋轉的紅色吸積環
    drawChibaku(ctx, u) {
      const x = u.ox;
      const y = u.oy;
      let R = u.R;
      if (u.phase === 'end') R *= Math.max(0, 1 - u.pt / 0.25);
      if (R <= 0.3) return;
      ctx.translate(x, y);
      // 引力場：往內收縮的細圈
      if (u.phase === 'pull' || u.phase === 'flash') {
        for (let i = 0; i < 3; i++) {
          const k = (u.t * 1.6 + i / 3) % 1;
          ctx.beginPath();
          ctx.arc(0, 0, R + (1 - k) * 110, 0, TAU);
          ctx.strokeStyle = 'rgba(255,90,110,' + (0.35 * k).toFixed(3) + ')';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      // 柔光
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 3);
      g.addColorStop(0, 'rgba(255,40,70,0.5)');
      g.addColorStop(1, 'rgba(255,40,70,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R * 3, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // 吸積環（後半）
      const ring = (front) => {
        ctx.save();
        ctx.rotate(-0.35);
        ctx.scale(1, 0.28);
        ctx.beginPath();
        ctx.arc(0, 0, R * 2, front ? 0 : Math.PI, front ? Math.PI : TAU);
        ctx.lineWidth = R * 0.9;
        ctx.strokeStyle = 'rgba(255,70,90,0.55)';
        ctx.stroke();
        ctx.lineWidth = R * 0.3;
        ctx.strokeStyle = 'rgba(255,220,225,0.9)';
        ctx.stroke();
        ctx.restore();
      };
      ring(false);
      // 核心
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(255,235,240,0.95)';
      ctx.stroke();
      // 吸積環（前半）
      ring(true);
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
