// 二轉以後的技能執行（資料在 js/data/skills2.js）。
// player.useSkill 遇到這裡有的 type 就交給 start()，動作進行中每幀呼叫 update()。
// 也放一些被動／增益會用到的小工具（冷卻、延遲命中、分身追擊……）。
(function () {
  'use strict';
  const U = G.util;

  const X = (G.skillExec = {
    timers: [],

    // 延遲執行（震波傳遞、流星落下等）
    later(t, fn) {
      this.timers.push({ t, fn });
    },

    // 每幀從 player.update 呼叫
    tick(P, dt) {
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const k = this.timers[i];
        k.t -= dt;
        if (k.t <= 0) {
          this.timers.splice(i, 1);
          try {
            k.fn();
          } catch (e) { /* 目標可能已經不在了 */ }
        }
      }
      if (P.cds) for (const id in P.cds) if (P.cds[id] > 0) P.cds[id] -= dt;
      if (P.unyCd > 0) P.unyCd -= dt;
      if (P.formCd > 0) P.formCd -= dt;
      if (this.tick3) this.tick3(dt);
    },

    reset() {
      this.timers.length = 0;
    },

    alive(m) {
      return m && !m.dead && (m.isBoss ? G.world.boss === m : G.world.monsters.indexOf(m) >= 0);
    },

    // 畫面內的目標，由近到遠
    nearTargets(P, radius, n, filter) {
      return G.combat.targets()
        .filter((m) => U.dist(m.x, m.y - 30, P.x, P.y - 30) < radius && (!filter || filter(m)))
        .sort((a, b) => U.dist(a.x, a.y, P.x, P.y) - U.dist(b.x, b.y, P.x, P.y))
        .slice(0, n);
    },

    // ── 各種 type ──
    quake: {
      start(P, S, id, lv) {
        P.action = { type: 'quake', id, lv, t: 0, dur: S.castTime, done: false };
        P.glowT = 0.6;
        G.audio.play('heavyWind');
        if (S.screen && P.onGround) {
          P.vy = -520;
          P.onGround = false;
        }
      },
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.done || a.t < S.hitAt) return;
        a.done = true;
        const cam = G.cam;
        const list = G.combat.targets()
          .filter((m) => (S.same ? Math.abs(m.y - P.y) < 36 || (m.onGround && P.onGround && m.plat === P.plat && Math.abs(m.y - P.y) < 130) : m.x > cam.x - 40 && m.x < cam.x + G.W + 40 && m.y > cam.y && m.y < cam.y + G.H + 40))
          .sort((p, q) => Math.abs(p.x - P.x) - Math.abs(q.x - P.x))
          .slice(0, S.targets);
        // 震波：沿著地面往兩邊傳
        const reach = S.screen ? G.W : 520;
        const rocks = !S.lava && G.art.quakeFx;
        if (rocks) {
          // 裂地震擊：一路竄出岩刺（純視覺，art/skills5.js 的 quakeFx）；怪底下的岩刺跟傷害同一時間頂上來
          let far = reach;
          list.forEach((m) => (far = Math.max(far, Math.abs(m.x - P.x) + 60)));
          const tg = list.map((m) => ({ x: m.x, y: m.y, h: m.hitbox ? m.hitbox().h : 60 }));
          G.art.quakeFx.cast({ x: P.x, y: P.y, reach: far, speed: 1100, targets: tg });
        } else for (let d = 0; d <= reach; d += 60) {
          [-1, 1].forEach((s) => {
            X.later(d / 1100, () => {
              const x = P.x + s * d;
              G.fx.burst(x, P.y - 4, S.lava ? ['#ff7a2a', '#ffd35a', '#5a3a2a'] : ['#b8a07a', '#8a7050', '#e8dcc0'], 4, 240, { angle: -Math.PI / 2, spread: 0.8, shape: 'square', size: 5 });
              if (S.lava && d % 180 === 0) G.fx.pillar(x, P.y, 'rgba(255,120,40,0.8)', 0.5, 36);
            });
          });
        }
        G.fx.shake(S.screen ? 16 : rocks ? 8 : 10, S.screen ? 0.6 : 0.4);
        G.fx.addHitstop(0.08);
        if (S.lava) G.fx.screenFlash('#ff9a3a', 0.3);
        G.audio.play('slam');
        list.forEach((m) => {
          X.later(Math.abs(m.x - P.x) / 1100, () => {
            if (!X.alive(m)) return;
            G.combat.hitMonster(m, S.mult(a.lv), { knock: 200, heavy: true, sound: 'rock' });
            if (m.onGround) m.vy = -260;
          });
        });
      },
    },

    stun: {
      start(P, S, id, lv) {
        P.action = { type: 'stun', id, lv, t: 0, dur: S.castTime, done: false };
        P.glowT = 0.6;
        G.audio.play('roar');
      },
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.done || a.t < S.hitAt) return;
        a.done = true;
        G.fx.ring(P.x, P.y - 34, 'rgba(255,215,90,0.95)', S.radius, 0.45, 8);
        G.fx.ring(P.x, P.y - 34, 'rgba(255,245,200,0.8)', S.radius * 0.7, 0.35, 4);
        G.fx.shake(6, 0.25);
        X.nearTargets(P, S.radius, 20).forEach((m) => {
          G.combat.hitMonster(m, S.mult(a.lv), { knock: 0, sound: 'rock' });
          if (!m.isBoss) m.stunT = S.stun(a.lv);
        });
      },
    },

    rain: {
      start(P, S, id, lv) {
        P.action = { type: 'rain', id, lv, t: 0, dur: S.castTime, done: false };
        P.glowT = 0.7;
        G.fx.sparkle(P.x, P.y - 50, S.fx === 'thunder' ? '#a8d8ff' : '#fff3a0', 12, 36);
        G.audio.play('charge');
      },
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.done || a.t < S.hitAt) return;
        a.done = true;
        const list = X.nearTargets(P, S.radius, S.targets);
        if (!list.length) G.hud.toast('附近沒有目標', '#cfe');
        if (S.flash) G.fx.screenFlash(S.fx === 'thunder' ? '#bfe0ff' : '#fffbe0', 0.35);
        if (S.fx === 'aurora') G.fx.screenFlash('#9fffe0', 0.25);
        list.forEach((m, i) => {
          for (let k = 0; k < S.repeat; k++) {
            const delay = i * 0.05 + k * 0.16 + 0.12;
            X.later(delay, () => {
              if (!X.alive(m)) return;
              const cx = m.x;
              const cy = m.y - m.h * (m.scale || 1) * 0.5;
              if (S.fx === 'star') {
                G.fx.streak(cx - 60, cy - 120, Math.atan2(120, 60), 150, '#fff3a0', 6);
                G.fx.burst(cx, cy, ['#fff3a0', '#ffffff', '#b8b0ff'], 8, 200, { shape: 'star', size: 4 });
              } else if (S.fx === 'pillar') {
                G.fx.pillar(cx, m.y, 'rgba(255,245,200,0.9)', 0.45, 48);
              } else if (S.fx === 'aurora') {
                G.fx.pillar(cx, m.y, U.pick(['rgba(120,255,210,0.7)', 'rgba(200,150,255,0.7)', 'rgba(120,200,255,0.7)']), 0.5, 60);
              } else if (S.fx === 'thunder') {
                G.fx.bolt(cx + U.rand(-8, 8), m.y - 420, m.y - 6);
                G.audio.play('thunder');
              }
              G.combat.hitMonster(m, S.mult(a.lv), { knock: 60, sound: 'spirit' });
              if (S.slow && !m.isBoss) m.slowT = S.slow;
            });
          }
        });
      },
    },

    chain: {
      start(P, S, id, lv) {
        P.action = { type: 'chain', id, lv, t: 0, dur: S.castTime, done: false };
        P.glowT = 0.5;
        G.audio.play('charge');
      },
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.done || a.t < S.hitAt) return;
        a.done = true;
        const list = X.nearTargets(P, S.radius, S.targets);
        if (!list.length) G.hud.toast('附近沒有目標', '#cfe');
        const KC = S.thrown && list.length ? G.art.kunaiChainFx : null; // 純視覺：雷刃苦無＋鎖鏈（js/art/kunaichain.js）
        if (KC) KC.cast(P, list, S.repeat);
        else if (S.thrown && list.length) {
          const m0 = list[0];
          const ty = m0.y - m0.h * 0.5;
          G.fx.streak(P.x, P.y - 34, Math.atan2(ty - (P.y - 34), m0.x - P.x), Math.abs(m0.x - P.x) + 20, '#ffe44a', 5);
          G.audio.play('featherShot');
        }
        let n = 0;
        for (let k = 0; k < S.repeat; k++) {
          list.forEach((m, i) => {
            const prev = i ? list[i - 1] : null;
            X.later(n++ * 0.045, () => {
              if (!X.alive(m)) return;
              const cy = m.y - m.h * (m.scale || 1) * 0.5;
              if (!KC) {
                if (prev && X.alive(prev)) G.fx.streak(prev.x, prev.y - prev.h * 0.5, Math.atan2(cy - (prev.y - prev.h * 0.5), m.x - prev.x), Math.abs(m.x - prev.x) + 20, '#ffe44a', 4);
                G.fx.bolt(m.x + U.rand(-10, 10), cy - 60, cy + 10);
              }
              // 連鎖的連打：只有第一下推鏡頭／頓幀，後面的不再推（不然視角一直晃）
              G.combat.hitMonster(m, S.mult(a.lv), { knock: 20, sound: 'double', calm: k > 0 || i > 0, noSquash: true });
            });
          });
        }
      },
    },

    blink: {
      start(P, S, id, lv) {
        const I = G.input;
        const map = G.world.map;
        const dist = S.dist(lv);
        const x0 = P.x;
        const y0 = P.y;
        G.fx.ghost(P.x, P.y, P.dir, { state: 'idle', t: P.t, p: 0, form: P.form }, '#b8b0ff');
        G.fx.sparkle(P.x, P.y - 30, '#d8d0ff', 10, 26);
        if (I.isDown('up') || I.isDown('down')) {
          const up = I.isDown('up');
          let best = -1;
          map.platforms.forEach((pl, i) => {
            if (P.x < pl[0] || P.x > pl[1]) return;
            const sy = G.physics.surfaceY(map, i, P.x);
            const dy = up ? P.y - sy : sy - P.y;
            if (dy > 8 && dy <= dist + 40 && (best < 0 || Math.abs(G.physics.surfaceY(map, best, P.x) - P.y) > dy)) best = i;
          });
          if (best >= 0) {
            P.y = G.physics.surfaceY(map, best, P.x);
            P.plat = best;
            P.onGround = true;
            P.vy = 0;
          } else if (up) {
            P.y -= dist * 0.6;
            P.vy = -200;
            P.onGround = false;
          }
        } else {
          P.x = U.clamp(P.x + P.dir * dist, 20, map.w - 20);
          P.onGround = false;
          P.vy = Math.min(P.vy, 0);
        }
        P.climbing = -1;
        P.invT = Math.max(P.invT, 0.25);
        G.fx.burst(P.x, P.y - 30, ['#ffffff', '#b8b0ff', '#fff3a0'], 14, 260, { shape: 'star', size: 4 });
        G.fx.ring(P.x, P.y - 30, 'rgba(200,190,255,0.9)', 50, 0.25, 3);
        G.audio.play('spiritShot');
        if (U.dist(x0, y0, P.x, P.y) < 4) G.hud.toast('那個方向沒有地方可以去', '#cfe');
      },
    },

    boomerang: {
      start(P, S, id, lv) {
        P.action = { type: 'boomerangCast', id, lv, t: 0, dur: S.castTime, fired: false };
        G.audio.play('featherShot');
      },
    },
    boomerangCast: {
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.fired || a.t < S.fireAt) return;
        a.fired = true;
        G.world.projectiles.push({
          kind: 'boomerang', owner: 'player', boomerang: true, id: a.id, lv: a.lv,
          x: P.x + P.dir * 30, y: P.y - 34, vx: P.dir * S.speed, vy: 0, dir: P.dir,
          r: 22, life: (S.reach / S.speed) * 2 + 0.6, t: 0, seed: Math.random() * 6, hits: new Map(), back: false,
        });
      },
    },

    buff: {
      start(P, S, id, lv) {
        const b = S.buff(lv);
        P.buffs = P.buffs || {};
        P.buffs[b.key] = { v: b.v, t: b.time, icon: S.icon, name: S.name };
        P.recalc();
        G.fx.pillar(P.x, P.y, S.aura || '#fff3a0', 0.7, 70);
        G.fx.ring(P.x, P.y - 34, S.aura || '#fff3a0', 90, 0.4, 5);
        G.hud.toast(S.name + '：' + S.desc(lv), '#ffe0b0');
        G.audio.play(b.key === 'atk' || b.key === 'soul' ? 'roar' : 'evolve');
        P.glowT = 0.8;
      },
    },

    heal: {
      start(P, S, id, lv) {
        const n = Math.round(P.maxHp * S.pct(lv));
        P.hp = Math.min(P.maxHp, P.hp + n);
        G.fx.pillar(P.x, P.y, 'rgba(140,255,160,0.85)', 0.8, 70);
        G.fx.sparkle(P.x, P.y - 40, '#b8ffb0', 16, 40);
        G.fx.text(P.x, P.y - 90, '+' + n, '#8fff9a', 22, 1);
        G.audio.play('potion');
      },
    },

    // 迴旋羽刃：由 world.updateProjectiles 呼叫；回傳 true 表示要移除
    updateBoomerang(p, dt) {
      const P = G.player;
      const S = G.data.skills[p.id];
      if (!p.back && p.t >= S.reach / S.speed) {
        p.back = true;
        p.passHit = new Set(); // 回程可以再打一次
      }
      if (p.back) {
        const dx = P.x - p.x;
        const dy = P.y - 34 - p.y;
        const d = Math.hypot(dx, dy) || 1;
        p.vx = (dx / d) * S.speed * 1.1;
        p.vy = (dy / d) * S.speed * 1.1;
        if (d < 30) return true;
      }
      p.passHit = p.passHit || new Set();
      let hitCount = 0;
      p.hits.forEach(() => hitCount++);
      for (const m of G.combat.targets()) {
        if (p.passHit.has(m)) continue;
        const n = p.hits.get(m) || 0;
        if (n >= 2) continue;
        if (!p.hits.has(m) && hitCount >= S.targets) continue;
        const hb = m.hitbox();
        const cx = U.clamp(p.x, hb.x, hb.x + hb.w);
        const cy = U.clamp(p.y, hb.y, hb.y + hb.h);
        if (U.dist(cx, cy, p.x, p.y) < p.r) {
          p.passHit.add(m);
          p.hits.set(m, n + 1);
          G.combat.hitMonster(m, S.mult(p.lv), { knock: 80, sound: 'feather' });
        }
      }
      if (Math.random() < 0.6) G.fx.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.25, t: 0, size: 3, color: 'rgba(200,160,255,0.8)', grav: 0, shape: 'circle', drag: 0 });
      return false;
    },
  });

  // 影刃穿刺的畫法
  G.art.PROJ_DRAW.shadowblade = function (ctx, p, t) {
    const A = G.art;
    ctx.scale(p.dir, 1);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#5a3e78';
    ctx.fillRect(-60, -3, 40, 6);
    ctx.globalAlpha = 1;
    A.shape(ctx, (c) => { c.moveTo(22, 0); c.lineTo(-4, -7); c.lineTo(-18, -2); c.lineTo(-18, 2); c.lineTo(-4, 7); c.closePath(); }, '#2e1f44', '#1a1028', { lw: 2, hl: false });
    ctx.strokeStyle = '#c8a0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, 0);
    ctx.stroke();
  };

  // 迴旋羽刃的畫法
  G.art.PROJ_DRAW = G.art.PROJ_DRAW || {};
  G.art.PROJ_DRAW.boomerang = function (ctx, p, t) {
    const A = G.art;
    ctx.rotate(t * 18 + p.seed);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 3);
      A.shape(ctx, (c) => { c.moveTo(0, 0); c.quadraticCurveTo(10, -6, 20, -2); c.quadraticCurveTo(10, 4, 0, 0); c.closePath(); }, '#b89aff', '#7a5ad0', { lw: 2, hl: false });
      ctx.restore();
    }
    A.ellipse(ctx, 0, 0, 4, 4, '#fff6ff', null, { lw: 1.6, hl: false });
  };
})();
