// 技能 v3 的執行（資料在 js/data/skills3.js）。
// 另外處理：自訂投射物（爆炸、貫穿、冰凍、燃燒、沿地面滾、多段）、怪物的燃燒／冰凍狀態、會傷害怪物的地面區域。
(function () {
  'use strict';
  const U = G.util;
  const X = G.skillExec;
  const alive = (m) => X.alive(m);
  const midY = (m) => m.y - m.h * (m.scale || 1) * 0.5;

  // 從 (x1,y1) 到 (x2,y2) 的一道閃電（用 fx.bolts 的畫法）
  function zap(x1, y1, x2, y2, w, life) {
    const pts = [[x1, y1]];
    const n = Math.max(3, Math.round(Math.hypot(x2 - x1, y2 - y1) / 28));
    for (let i = 1; i < n; i++) {
      const k = i / n;
      pts.push([x1 + (x2 - x1) * k + U.rand(-12, 12), y1 + (y2 - y1) * k + U.rand(-12, 12)]);
    }
    pts.push([x2, y2]);
    G.fx.bolts.push({ pts, t: 0, life: life || 0.22, w: w || 5 });
  }

  // 對怪物加狀態
  function burn(m, sec, dmg) {
    if (!alive(m)) return;
    m.burnT = Math.max(m.burnT || 0, sec);
    m.burnDmg = Math.max(m.burnDmg || 0, dmg);
  }
  function freeze(m, sec) {
    if (!alive(m) || m.isBoss) return;
    m.frozenT = Math.max(m.frozenT || 0, sec);
  }

  // 地面上的傷害區域（流星燒過的地面、暴風雪）
  const zones = [];
  X.zones3 = zones;

  Object.assign(X, {
    zap,
    burn,
    freeze,

    // ── 通用投射物 ──
    shot: {
      start(P, S, id, lv) {
        P.action = { type: 'shotCast', id, lv, t: 0, dur: S.castTime, fired: 0 };
        P.glowT = 0.3;
        G.audio.play(S.proj === 'flame' ? 'charge' : S.proj === 'icelance' ? 'spiritShot' : S.proj === 'boulder' ? 'heavyWind' : 'featherShot');
      },
    },
    shotCast: {
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.fired || a.t < S.fireAt) return;
        a.fired = 1;
        X.fire(P, S, a.lv, 0, { id: a.id });
      },
    },

    fire(P, S, lv, angle, opts) {
      opts = opts || {};
      const sp = S.speed;
      const dir = P.dir;
      const ang = angle || 0;
      const vx = Math.cos(ang) * sp * dir;
      const vy = Math.sin(ang) * sp;
      const ground = S.rolling;
      const y = ground ? P.y - (S.r || 30) : P.y - 34;
      G.world.projectiles.push({
        kind: opts.kind || S.proj, owner: 'player', custom: true, id: opts.id || S.id, lv,
        x: P.x + dir * 34, y, vx, vy, dir, r: S.r || 12, t: 0, life: (opts.reach || S.reach) / sp,
        seed: Math.random() * 6, rot: 0, hits: new Map(), hitCount: 0, plat: P.plat,
      });
      if (S.proj === 'boulder') G.fx.shake(6, 0.2);
    },

    // world.updateProjectiles 對 custom 投射物呼叫；回傳 true 表示要移除
    updateShot(p, dt) {
      const S = G.data.skills[p.id];
      if (!S) return true;
      const map = G.world.map;
      if (S.rolling) {
        // 沿著所在的平台滾，掉出平台就往下掉
        p.rot += (p.vx * dt) / (p.r || 30);
        const pl = map.platforms[p.plat];
        if (pl && (p.x < pl[0] || p.x > pl[1])) {
          p.vy += 1600 * dt;
          if (p.y > map.platforms[0][2] - p.r) {
            p.y = map.platforms[0][2] - p.r;
            p.vy = 0;
            p.plat = 0;
          }
        }
        if (Math.random() < 0.5) G.fx.dust(p.x - p.dir * p.r * 0.6, p.y + p.r, p.dir, 1);
      }
      if (S.proj === 'flame' && Math.random() < 0.8) G.fx.particles.push({ x: p.x - p.dir * 8, y: p.y + U.rand(-5, 5), vx: -p.dir * 60, vy: U.rand(-40, 10), life: 0.35, t: 0, size: U.rand(3, 6), color: U.pick(['#ffb03a', '#ff6a2a', '#ffe07a']), grav: -40, shape: 'circle', drag: 2 });
      if (S.proj === 'icelance' && Math.random() < 0.6) G.fx.particles.push({ x: p.x - p.dir * 30, y: p.y + U.rand(-4, 4), vx: -p.dir * 30, vy: 0, life: 0.4, t: 0, size: 3, color: '#dff4ff', grav: 0, shape: 'star', drag: 1 });
      if (S.proj === 'bigShuriken' && Math.random() < 0.4) G.fx.particles.push({ x: p.x + U.rand(-50, 50), y: p.y + U.rand(-50, 50), vx: -p.dir * 80, vy: 0, life: 0.4, t: 0, size: 2, color: 'rgba(200,255,200,0.8)', grav: 0, shape: 'circle', drag: 1 });
      for (const m of G.combat.targets()) {
        const hb = m.hitbox();
        const cx = U.clamp(p.x, hb.x, hb.x + hb.w);
        const cy = U.clamp(p.y, hb.y, hb.y + hb.h);
        if (U.dist(cx, cy, p.x, p.y) >= p.r) continue;
        const rec = p.hits.get(m);
        if (S.multiHit) {
          // 多段：同一隻每隔一段時間再削一下
          if (rec && (rec.n >= S.maxHits || p.t - rec.last < S.multiHit)) continue;
          p.hits.set(m, { n: (rec ? rec.n : 0) + 1, last: p.t });
          G.combat.hitMonster(m, S.mult(p.lv), { knock: S.knock || 0, sound: 'feather' });
          continue;
        }
        if (rec) continue;
        p.hits.set(m, { n: 1, last: p.t });
        p.hitCount++;
        G.combat.hitMonster(m, S.mult(p.lv), { knock: S.knock || 0, heavy: !!S.heavy, sound: S.proj === 'boulder' ? 'rock' : S.proj === 'flame' ? 'spirit' : 'feather' });
        if (S.freeze) {
          freeze(m, S.freeze);
          G.fx.burst(p.x, p.y, ['#dff4ff', '#8fd8ff', '#ffffff'], 10, 220, { shape: 'star', size: 4 });
        }
        if (S.explode) {
          // 爆炸：打中的地方炸開，旁邊的敵人也受傷並燃燒
          G.fx.ring(p.x, p.y, 'rgba(255,150,60,0.95)', S.explode, 0.3, 6);
          G.fx.impact(p.x, p.y, 90, '#ffb03a');
          G.fx.burst(p.x, p.y, ['#ff6a2a', '#ffb03a', '#ffe07a', '#5a3a2a'], 22, 320);
          G.fx.shake(5, 0.15);
          G.audio.play('thunder');
          burn(m, S.burn, Math.max(1, Math.round(G.player.atk * 0.25)));
          G.combat.targets().forEach((o) => {
            if (o !== m && U.dist(o.x, midY(o), p.x, p.y) < S.explode) {
              G.combat.hitMonster(o, S.mult(p.lv) * S.splash, { knock: 120, sound: 'spirit' });
              burn(o, S.burn, Math.max(1, Math.round(G.player.atk * 0.25)));
            }
          });
          return true;
        }
        if (p.hitCount >= (S.pierce || 1)) return true;
      }
      return false;
    },

    // ── 力量 ──
    uppercut: {
      start(P, S, id, lv) {
        P.action = { type: 'uppercut', id, lv, t: 0, dur: S.castTime, n: 0, hit: [] };
        P.vy = -720;
        P.onGround = false;
        P.glowT = 0.5;
        G.fx.dust(P.x, P.y, P.dir, 10);
        G.audio.play('heavyWind');
      },
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        const at = [0.06, 0.16, 0.26];
        while (a.n < S.hits && a.t >= at[a.n]) {
          const box = { x: P.dir > 0 ? P.x - 10 : P.x - 110, y: P.y - 190, w: 120, h: 210 };
          G.fx.slash(P.x + P.dir * 40, P.y - 70 - a.n * 20, P.dir, 50, a.n % 2 ? '#ffd27a' : '#ffffff', 'wide');
          G.fx.streak(P.x + P.dir * 40, P.y - 20, -Math.PI / 2, 140, '#fff0b0', 7);
          const list = G.combat.targets().filter((m) => U.overlap(box, m.hitbox())).slice(0, S.targets);
          list.forEach((m) => {
            G.combat.hitMonster(m, S.mult(a.lv), { knock: 0, heavy: true, sound: 'rock' });
            if (!m.isBoss && alive(m)) {
              m.vy = -520;
              m.onGround = false;
            }
          });
          a.n++;
        }
      },
    },

    hammer: {
      start(P, S, id, lv) {
        const list = G.combat.targets().filter((m) => U.sign(m.x - P.x) === P.dir && Math.abs(m.x - P.x) < S.range && Math.abs(m.y - P.y) < 200)
          .sort((p, q) => Math.abs(p.x - P.x) - Math.abs(q.x - P.x));
        const tg = list[0];
        const tx = tg ? tg.x : P.x + P.dir * 160;
        const ty = tg ? tg.y : P.y;
        P.action = { type: 'hammerCast', id, lv, t: 0, dur: S.castTime };
        P.glowT = 0.7;
        G.audio.play('charge');
        // 巨錘從天上掉下來
        G.world.projectiles.push({ kind: 'hammer', owner: 'fx', x: tx, y: ty - 520, vx: 0, vy: 1500, t: 0, life: 0.34, dir: P.dir, seed: 0, r: 0 });
        X.later(0.34, () => {
          G.fx.shake(16, 0.45);
          G.fx.addHitstop(0.12);
          G.fx.ring(tx, ty - 10, 'rgba(255,230,160,0.95)', 150, 0.35, 8);
          G.fx.burst(tx, ty - 8, ['#b8a07a', '#8a7050', '#fff0d0'], 30, 380, { angle: -Math.PI / 2, spread: 1.4, shape: 'square', size: 6 });
          G.audio.play('slam');
          if (tg && alive(tg)) {
            G.combat.hitMonster(tg, S.mult(lv), { knock: 0, heavy: true, sound: 'rock' });
            if (!tg.isBoss && alive(tg)) tg.stunT = S.stun;
          }
          G.combat.targets().forEach((o) => {
            if (o !== tg && Math.abs(o.x - tx) < 160 && Math.abs(o.y - ty) < 80) G.combat.hitMonster(o, S.mult(lv) * S.splash, { knock: 200, sound: 'rock' });
          });
        });
      },
    },
    hammerCast: { update() {} },

    brandish: {
      start(P, S, id, lv) {
        P.action = { type: 'brandish', id, lv, t: 0, dur: S.castTime, n: 0 };
        P.glowT = 0.6;
        G.audio.play('sweep');
      },
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        while (a.n < S.hits && a.t >= 0.05 + a.n * 0.075) {
          const box = P.frontBox(S.range.w, S.range.h);
          const up = a.n % 2 === 0;
          G.fx.slash(P.x + P.dir * (60 + (a.n % 3) * 20), P.y - 34 + (up ? -14 : 14), up ? P.dir : -P.dir, 58, a.n % 2 ? '#ffd35a' : '#fff6d0', 'wide');
          const list = G.combat.targets().filter((m) => U.overlap(box, m.hitbox()))
            .sort((p, q) => Math.abs(p.x - P.x) - Math.abs(q.x - P.x)).slice(0, S.targets);
          list.forEach((m) => G.combat.hitMonster(m, S.mult(a.lv), { knock: a.n === S.hits - 1 ? 380 : 20, heavy: a.n === S.hits - 1, sound: 'double' }));
          if (a.n === S.hits - 1) G.fx.shake(8, 0.2);
          a.n++;
        }
      },
    },

    // ── 法術 ──
    chainL: {
      start(P, S, id, lv) {
        P.action = { type: 'chainLCast', id, lv, t: 0, dur: S.castTime, done: false };
        P.glowT = 0.4;
        G.audio.play('charge');
      },
    },
    chainLCast: {
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.done || a.t < S.hitAt) return;
        a.done = true;
        const first = X.nearTargets(P, S.radius, 1)[0];
        if (!first) {
          G.hud.toast('附近沒有目標', '#cfe');
          return;
        }
        const chain = [first];
        while (chain.length < S.bounces) {
          const last = chain[chain.length - 1];
          const nx = G.combat.targets().filter((m) => chain.indexOf(m) < 0 && U.dist(m.x, midY(m), last.x, midY(last)) < S.jump)
            .sort((p, q) => U.dist(p.x, p.y, last.x, last.y) - U.dist(q.x, q.y, last.x, last.y))[0];
          if (!nx) break;
          chain.push(nx);
        }
        G.audio.play('thunder');
        let px = P.x + P.dir * 20;
        let py = P.y - 44;
        chain.forEach((m, i) => {
          const fx = px;
          const fy = py;
          X.later(i * 0.07, () => {
            if (!alive(m)) return;
            zap(fx, fy, m.x, midY(m), 6 - i, 0.26);
            G.fx.burst(m.x, midY(m), ['#fff6a8', '#ffffff', '#8fd8ff'], 8, 220);
            G.combat.hitMonster(m, S.mult(a.lv) * Math.pow(0.82, i), { knock: 40, sound: 'spirit' });
          });
          px = m.x;
          py = midY(m);
        });
      },
    },

    meteorT: {
      start(P, S, id, lv) {
        // 找敵人最密集的地方
        const list = X.nearTargets(P, S.radius, 30);
        let best = null;
        let bestN = -1;
        list.forEach((m) => {
          const n = list.filter((o) => Math.abs(o.x - m.x) < S.blast && Math.abs(o.y - m.y) < 120).length;
          if (n > bestN) {
            bestN = n;
            best = m;
          }
        });
        const tx = best ? best.x : P.x + P.dir * 300;
        const ty = best ? best.y : P.y;
        P.action = { type: 'meteorCast', id, lv, t: 0, dur: S.castTime };
        P.glowT = 0.8;
        G.fx.sparkle(P.x, P.y - 50, '#ffd35a', 14, 36);
        G.audio.play('charge');
        const fall = 0.75;
        G.world.projectiles.push({ kind: 'meteor', owner: 'fx', x: tx - 260, y: ty - 560, vx: 260 / fall, vy: 560 / fall, t: 0, life: fall, dir: 1, seed: 0, r: 0 });
        X.later(fall, () => {
          G.fx.shake(18, 0.5);
          G.fx.addHitstop(0.1);
          G.fx.screenFlash('#ffcf8a', 0.4);
          G.fx.ring(tx, ty - 20, 'rgba(255,160,60,0.95)', S.blast, 0.45, 10);
          G.fx.impact(tx, ty - 30, 180, '#ffb03a');
          G.fx.burst(tx, ty - 10, ['#ff6a2a', '#ffb03a', '#ffe07a', '#3a2a24'], 40, 460, { angle: -Math.PI / 2, spread: 1.5 });
          G.audio.play('slam');
          G.combat.targets().forEach((o) => {
            if (Math.abs(o.x - tx) < S.blast && Math.abs(o.y - ty) < 140) {
              G.combat.hitMonster(o, S.mult(lv), { knock: 300, heavy: true, sound: 'rock' });
              burn(o, 3, Math.max(1, Math.round(G.player.atk * 0.3)));
            }
          });
          zones.push({ kind: 'fire', x: tx, y: ty, r: S.blast * 0.8, t: 0, life: S.burnZone, tick: 0, every: 0.5, mult: S.mult(lv) * 0.12 });
        });
      },
    },
    meteorCast: { update() {} },

    blizzardT: {
      start(P, S, id, lv) {
        P.action = { type: 'blizzardCast', id, lv, t: 0, dur: S.castTime };
        G.audio.play('spiritShot');
        const cx = P.x + P.dir * (S.width / 2 + 40);
        zones.push({ kind: 'blizzard', x: cx, y: P.y, r: S.width / 2, t: 0, life: S.time, tick: 0, every: S.tick, mult: S.mult(lv), targets: S.targets, snowT: 0 });
      },
    },
    blizzardCast: { update() {} },

    judge: {
      start(P, S, id, lv) {
        P.action = { type: 'judgeCast', id, lv, t: 0, dur: S.castTime, done: false };
        P.glowT = 0.8;
        G.fx.sparkle(P.x, P.y - 50, '#fff6a8', 14, 36);
        G.audio.play('charge');
      },
    },
    judgeCast: {
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.done || a.t < S.hitAt) return;
        a.done = true;
        // 最強的目標：Boss 優先，其次 HP 最多的
        const list = X.nearTargets(P, S.radius, 40).sort((p, q) => (q.isBoss ? 1e9 : q.hp) - (p.isBoss ? 1e9 : p.hp));
        const m = list[0];
        if (!m) {
          G.hud.toast('附近沒有目標', '#cfe');
          return;
        }
        for (let i = 0; i < 5; i++) G.fx.bolt(m.x + U.rand(-14, 14), m.y - 640, m.y - 4);
        G.fx.pillar(m.x, m.y, 'rgba(255,250,200,0.95)', 0.5, 80);
        G.fx.screenFlash('#fffbe0', 0.5);
        G.fx.shake(14, 0.4);
        G.fx.addHitstop(0.14);
        G.audio.play('thunder');
        G.combat.hitMonster(m, S.mult(a.lv), { knock: 0, heavy: true, sound: 'spirit' });
        if (!m.isBoss && alive(m)) m.stunT = S.stun;
      },
    },

    auroraS: {
      start(P, S, id, lv) {
        P.action = { type: 'auroraCast', id, lv, t: 0, dur: S.castTime, done: false };
        P.glowT = 0.9;
        G.audio.play('evolve');
      },
    },
    auroraCast: {
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.done || a.t < S.hitAt) return;
        a.done = true;
        const cols = ['rgba(120,255,210,0.9)', 'rgba(200,150,255,0.9)', 'rgba(120,200,255,0.9)'];
        for (let w = 0; w < S.waves; w++) {
          X.later(w * 0.28, () => {
            G.fx.ring(P.x, P.y - 40, cols[w % 3], S.radius, 0.5, 10);
            G.fx.ring(P.x, P.y - 40, 'rgba(255,255,255,0.7)', S.radius * 0.7, 0.4, 4);
            X.nearTargets(P, S.radius, S.targets).forEach((m) => {
              G.fx.pillar(m.x, m.y, cols[(w + 1) % 3], 0.35, 40);
              G.combat.hitMonster(m, S.mult(a.lv), { knock: 60, sound: 'spirit' });
              if (!m.isBoss) m.slowT = S.slow;
            });
          });
        }
      },
    },

    // ── 敏捷 ──
    flip: {
      start(P, S, id, lv) {
        P.action = { type: 'flipCast', id, lv, t: 0, dur: S.castTime, fired: 0 };
        P.vx = -P.dir * 440;
        P.vy = -560;
        P.onGround = false;
        P.invT = Math.max(P.invT, 0.4);
        G.audio.play('jump');
        G.fx.ghost(P.x, P.y, P.dir, { state: 'jump', t: P.t, p: 0, form: P.form }, '#b8e070');
      },
    },
    flipCast: {
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        P.vx = -P.dir * 440 * Math.max(0, 1 - a.t * 1.5);
        while (a.fired < S.count && a.t >= 0.08 + a.fired * 0.09) {
          X.fire(P, { proj: 'shuriken', speed: S.speed, reach: S.reach, r: 12, pierce: 1 }, a.lv, (a.fired ? 0.12 : -0.05), { id: a.id });
          a.fired++;
          G.audio.play('featherShot');
        }
      },
    },

    bladeRainT: {
      start(P, S, id, lv) {
        P.action = { type: 'bladeRainCast', id, lv, t: 0, dur: S.castTime, fired: false };
        P.vy = -680;
        P.onGround = false;
        P.invT = Math.max(P.invT, 0.3);
        G.audio.play('jump');
      },
    },
    bladeRainCast: {
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.fired || a.t < 0.26) return;
        a.fired = true;
        // 從空中往下方扇形擲出
        for (let i = 0; i < S.count; i++) {
          const ang = 0.25 + (i / (S.count - 1)) * 1.15; // 往前下方
          X.fire(P, { proj: 'shuriken', speed: S.speed, reach: 620, r: 13, pierce: 1 }, a.lv, ang, { id: a.id });
        }
        G.fx.ring(P.x, P.y - 30, 'rgba(220,240,255,0.9)', 60, 0.25, 4);
        G.audio.play('featherShot');
        P.vy = Math.min(P.vy, -200);
      },
    },

    phantom: {
      start(P, S, id, lv) {
        const list = X.nearTargets(P, S.radius, S.targets);
        if (!list.length) {
          G.hud.toast('附近沒有目標', '#cfe');
          P.mp += S.mp(lv);
          return;
        }
        const dur = list.length * 0.16 + 0.3;
        P.action = { type: 'phantomCast', id, lv, t: 0, dur };
        P.invT = Math.max(P.invT, dur + 0.3);
        G.audio.play('charge');
        list.forEach((m, i) => {
          X.later(i * 0.16, () => {
            if (!alive(m)) return;
            G.fx.ghost(P.x, P.y, P.dir, { state: 'dash', t: P.t, p: 0, form: P.form }, '#5ab8ff');
            const side = i % 2 ? 1 : -1;
            P.x = U.clamp(m.x + side * 44, 20, G.world.map.w - 20);
            P.y = m.y;
            P.dir = -side;
            P.vy = 0;
            G.fx.sparkle(P.x, P.y - 30, '#bfe0ff', 6, 20);
            for (let k = 0; k < S.hits; k++) {
              X.later(k * 0.04, () => {
                if (!alive(m)) return;
                G.fx.slash(m.x, midY(m) + U.rand(-12, 12), k % 2 ? 1 : -1, 36, k % 2 ? '#bfe0ff' : '#ffffff', 'claw');
                G.combat.hitMonster(m, S.mult(lv), { knock: 0, sound: 'double' });
              });
            }
          });
        });
      },
    },
    phantomCast: { update() {} },

    // ── 地面區域與怪物狀態，每幀由 player.update 呼叫 ──
    tick3(dt) {
      for (let i = zones.length - 1; i >= 0; i--) {
        const z = zones[i];
        z.t += dt;
        if (z.t >= z.life) {
          zones.splice(i, 1);
          continue;
        }
        if (z.kind === 'blizzard') {
          z.snowT -= dt;
          if (z.snowT <= 0) {
            z.snowT = 0.025;
            G.world.projectiles.push({ kind: 'iceShard', owner: 'fx', x: z.x + U.rand(-z.r, z.r), y: z.y - U.rand(260, 420), vx: -60, vy: 900, t: 0, life: 0.4, dir: 1, seed: Math.random() * 6, r: 0 });
            if (Math.random() < 0.3) G.fx.particles.push({ x: z.x + U.rand(-z.r, z.r), y: z.y - U.rand(0, 200), vx: -80, vy: 60, life: 0.8, t: 0, size: 3, color: '#ffffff', grav: 0, shape: 'star', drag: 0 });
          }
        } else if (Math.random() < 0.4) {
          G.fx.particles.push({ x: z.x + U.rand(-z.r, z.r), y: z.y - 4, vx: 0, vy: -U.rand(40, 90), life: 0.6, t: 0, size: U.rand(3, 6), color: U.pick(['#ff6a2a', '#ffb03a']), grav: -20, shape: 'circle', drag: 1 });
        }
        z.tick -= dt;
        if (z.tick > 0) continue;
        z.tick = z.every;
        const list = G.combat.targets().filter((m) => Math.abs(m.x - z.x) < z.r && Math.abs(m.y - z.y) < 140).slice(0, z.targets || 20);
        list.forEach((m) => {
          G.combat.hitMonster(m, z.mult, { knock: 0, sound: 'spirit', noFx: true });
          if (z.kind === 'blizzard') {
            if (!m.isBoss) m.slowT = 1;
            if (Math.random() < 0.12) freeze(m, 1.2);
          } else burn(m, 1.5, Math.max(1, Math.round(G.player.atk * 0.2)));
        });
      }
    },

    // 怪物身上的燃燒、冰凍（由 monster.update 呼叫）；回傳 true 表示這一幀不能動
    status(m, dt) {
      if (m.burnT > 0) {
        m.burnT -= dt;
        m.burnTick = (m.burnTick || 0) - dt;
        if (m.burnTick <= 0) {
          m.burnTick = 0.5;
          const d = m.takeDamage(m.burnDmg || 1, 0, 0, false);
          if (d) G.fx.damage(m.x + U.rand(-8, 8), m.y - m.h * (m.scale || 1) - 6, d, 'normal', m.nextStack ? m.nextStack() : 0);
        }
      }
      if (m.frozenT > 0) {
        m.frozenT -= dt;
        m.vx = 0;
        m.attackT = 0;
        return true;
      }
      return false;
    },
  });

  X.resetZones = () => (zones.length = 0);
})();
