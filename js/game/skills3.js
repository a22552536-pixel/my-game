// 技能 v3 的執行（資料在 js/data/skills3.js）。
// 另外處理：自訂投射物（爆炸、貫穿、冰凍、燃燒、沿地面滾、多段）、怪物的燃燒／冰凍狀態、會傷害怪物的地面區域。
(function () {
  'use strict';
  const U = G.util;
  const X = G.skillExec;
  const alive = (m) => X.alive(m);
  const midY = (m) => m.y - m.h * (m.scale || 1) * 0.5;
  // 「最強」的排序：Boss 優先，其次 HP 最多
  const strongest = (p, q) => (q.isBoss ? 1e9 : q.hp) - (p.isBoss ? 1e9 : p.hp);

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
        if (G.art.dragonFx) G.art.dragonFx.begin(P); // 純視覺：盤旋而上的金色能量龍
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
          G.fx.shake(16, 0.45, true);
          G.fx.addHitstop(0.12, true);
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

    // 居合：蓄勢（畫面變暗、刀光一閃）→ 拔刀瞬間衝過去 → 空中浮現大量刀痕 → 納刀一起爆開
    brandish: {
      start(P, S, id, lv) {
        P.action = { type: 'brandish', id, lv, t: 0, dur: S.castTime, n: 0, phase: 0, list: [] };
        P.vx = 0;
        P.glowT = 0.35;
        G.fx.iaiDim = 0.42;
        G.audio.play('charge');
        // 刀光一閃
        G.fx.impact(P.x + P.dir * 14, P.y - 30, 40, '#fff6d0');
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          G.fx.particles.push({ x: P.x + Math.cos(ang) * 70, y: P.y - 30 + Math.sin(ang) * 50, vx: -Math.cos(ang) * 260, vy: -Math.sin(ang) * 190, life: 0.2, t: 0, size: 2.5, color: '#ffe9a8', grav: 0, shape: 'circle', drag: 0 });
        }
      },
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        const DRAW = 0.2;
        // 蓄勢：定住不動
        if (a.t < DRAW) {
          P.vx = 0;
          return;
        }
        // 拔刀：鎖定目標、瞬間衝出
        if (a.phase === 0) {
          a.phase = 1;
          const box = P.frontBox(S.range.w, S.range.h);
          a.list = G.combat.targets().filter((m) => U.overlap(box, m.hitbox()))
            .sort((p, q) => Math.abs(p.x - P.x) - Math.abs(q.x - P.x)).slice(0, S.targets);
          a.x0 = P.x;
          // 衝到最遠那隻目標的後面（沒有目標就往前衝一小段）
          const far = a.list.reduce((v, m) => Math.max(v, (m.x - P.x) * P.dir), 0);
          a.dashV = U.clamp(far + 70, 120, S.range.w + 40) / 0.09;
          P.invT = Math.max(P.invT || 0, 0.4);
          G.audio.play('sweep');
          G.fx.screenFlash('#ffffff', 0.25);
          G.fx.shake(5, 0.12);
        }
        if (a.t < DRAW + 0.09) {
          P.vx = P.dir * a.dashV;
          P.vy = 0;
          G.fx.ghost(P.x, P.y, P.dir, { state: 'dash', t: P.t, p: 0, form: P.form }, '#fff0c0');
          return;
        }
        if (a.phase === 1) {
          a.phase = 2;
          P.vx = P.dir * 60;
          // 劃過的那一刀：從起點拉到終點的長線
          const len = Math.abs(P.x - a.x0) + 160;
          G.fx.cut((a.x0 + P.x) / 2, P.y - 32, 0, len, { w: 5, life: 0.5, grow: 0.03 });
          G.fx.dust(P.x, P.y, -P.dir, 8);
        }
        // 刀痕一道道在整片區域浮現（散開，不疊成一團），每一段算一下傷害
        const t0 = DRAW + 0.12;
        while (a.n < S.hits && a.t >= t0 + a.n * 0.05) {
          const last = a.n === S.hits - 1;
          const live = a.list.filter(alive);
          // 刀痕範圍：涵蓋所有目標；沒打到目標就在前方空揮
          let x0 = P.x + P.dir * 40;
          let x1 = P.x + P.dir * 200;
          let yc = P.y - 36;
          if (live.length) {
            x0 = Math.min.apply(null, live.map((m) => m.x)) - 50;
            x1 = Math.max.apply(null, live.map((m) => m.x)) + 50;
            yc = live.reduce((v, m) => v + midY(m), 0) / live.length;
          }
          const lo = Math.min(x0, x1);
          const span = Math.abs(x1 - x0);
          // 刀痕停在空中，到納刀那一下才一起消失
          const hold = (S.hits - 1 - a.n) * 0.05 + 0.2;
          for (let k = 0; k < 4; k++) {
            const ang = U.rand(-1.2, 1.2) + (k % 2 ? Math.PI / 2 : 0);
            G.fx.cut(lo + U.rand(0, span), yc + U.rand(-30, 30), ang, U.rand(150, 230), { w: U.rand(2.2, 3.4), life: hold, grow: 0.03 });
          }
          live.forEach((m) => {
            G.combat.hitMonster(m, S.mult(a.lv), { knock: last ? 420 : 0, heavy: last, sound: a.n % 2 ? 'double' : 'hit' });
          });
          if (!last) G.audio.play('sweep');
          a.n++;
          // 納刀：最後一下整片爆開
          if (last) {
            G.fx.shake(10, 0.25, true);
            G.fx.addHitstop(0.06, true);
            const cx = (lo + lo + span) / 2;
            G.fx.cut(cx, yc, -0.3, span + 140, { w: 6, life: 0.42, grow: 0.025 });
            G.fx.cut(cx, yc, 0.3, span + 140, { w: 6, life: 0.42, grow: 0.025, delay: 0.035 });
            live.forEach((m) => {
              G.fx.impact(m.x, midY(m), 46, '#fff6d0');
              G.fx.burst(m.x, midY(m), ['#ffffff', '#ffe08a', '#ffb347'], 12, 340);
            });
          }
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
        // 寫實的隕石、撞擊坑、噴飛岩塊都在 art/skills5.js 的 meteorFx；不閃全螢幕、震動收小
        const mfx = G.art.meteorFx ? G.art.meteorFx.cast({ x: tx, y: ty, from: P.x <= tx ? -1 : 1, fall, blast: S.blast, burn: S.burnZone }) : null;
        if (!mfx) G.world.projectiles.push({ kind: 'meteor', owner: 'fx', x: tx - 260, y: ty - 560, vx: 260 / fall, vy: 560 / fall, t: 0, life: fall, dir: 1, seed: 0, r: 0 });
        X.later(fall, () => {
          G.fx.shake(9, 0.4, true);
          G.fx.addHitstop(0.08, true);
          if (mfx) G.art.meteorFx.impact(mfx);
          else {
            G.fx.ring(tx, ty - 20, 'rgba(255,160,60,0.95)', S.blast, 0.45, 10);
            G.fx.impact(tx, ty - 30, 180, '#ffb03a');
            G.fx.burst(tx, ty - 10, ['#ff6a2a', '#ffb03a', '#ffe07a', '#3a2a24'], 40, 460, { angle: -Math.PI / 2, spread: 1.5 });
          }
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
        // 純視覺：先猜會劈哪幾隻（跟真正劈的時候同一套挑法），雷雲先在它們頭上聚起來；真正的目標每一道劈下時才決定
        if (G.art.judgeFx) {
          const pre = X.nearTargets(P, S.radius, 40).sort(strongest).slice(0, S.strikes || 1);
          P.action.fx = G.art.judgeFx.begin(P, pre, S.hitAt);
        }
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
        // 五連劈：每一道劈向範圍內還沒被這次劈過的最強目標（Boss 優先，其次 HP 最多）；目標不夠就再劈最強的
        const n = S.strikes || 1;
        const hit = new Set();
        const fx = a.fx;
        const lv = a.lv;
        const strike = (i) => {
          const list = X.nearTargets(P, S.radius, 40).sort(strongest);
          const m = list.find((o) => !hit.has(o)) || list[0];
          const last = i === n - 1;
          if (!m) {
            if (i === 0) {
              if (G.art.judgeFx) G.art.judgeFx.fizzle(fx);
              G.hud.toast('附近沒有目標', '#cfe');
            } else if (G.art.judgeFx) G.art.judgeFx.finish(fx);
            return false;
          }
          // 雷柱、雷雲、焦坑都在 art/skills3.js 的 judgeFx；不閃全螢幕、震動收小
          if (G.art.judgeFx) G.art.judgeFx.strike(fx, m, last);
          else for (let k = 0; k < (last ? 5 : 2); k++) G.fx.bolt(m.x + U.rand(-14, 14), m.y - 640, m.y - 4);
          G.fx.shake(last ? 7 : 3, last ? 0.3 : 0.12);
          G.fx.addHitstop(last ? 0.1 : i ? 0.025 : 0.05);
          G.audio.play('thunder');
          const first = !hit.has(m);
          hit.add(m);
          G.combat.hitMonster(m, S.mult(lv) * (S.strikeK || 1), { knock: 0, heavy: last, sound: 'spirit' });
          // 麻痺只在第一次被劈中時給
          if (first && !m.isBoss && alive(m)) m.stunT = S.stun;
          return true;
        };
        if (!strike(0)) return;
        for (let i = 1; i < n; i++) {
          X.later(i * (S.every || 0.2), () => {
            // 連劈途中換了地圖／死掉就不劈了
            if (G.player !== P || P.dead) return;
            strike(i);
          });
        }
      },
    },

    auroraS: {
      start(P, S, id, lv) {
        P.action = { type: 'auroraCast', id, lv, t: 0, dur: S.castTime, done: false };
        // 極光簾幕、漩渦、每一波、敵人身上的冰霜微光都在 art/skills5.js 的 auroraFx
        if (G.art.auroraFx) P.action.fx = G.art.auroraFx.begin(P, S);
        P.glowT = 0.9;
        G.audio.play('evolve');
      },
    },
    auroraCast: {
      update(P, a, dt) {
        const S = G.data.skills[a.id];
        if (a.done || a.t < S.hitAt) return;
        a.done = true;
        const AF = G.art.auroraFx;
        const fx = a.fx;
        const cols = ['rgba(120,255,210,0.9)', 'rgba(200,150,255,0.9)', 'rgba(120,200,255,0.9)'];
        for (let w = 0; w < S.waves; w++) {
          X.later(w * 0.28, () => {
            if (AF) AF.wave(fx, w);
            else {
              G.fx.ring(P.x, P.y - 40, cols[w % 3], S.radius, 0.5, 10);
              G.fx.ring(P.x, P.y - 40, 'rgba(255,255,255,0.7)', S.radius * 0.7, 0.4, 4);
            }
            X.nearTargets(P, S.radius, S.targets).forEach((m) => {
              if (AF) AF.hit(m, w);
              else G.fx.pillar(m.x, m.y, cols[(w + 1) % 3], 0.35, 40);
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
      if (m.heldT > 0) {
        m.heldT -= dt;
        m.vx = 0;
        m.attackT = 0;
        return true;
      }
      return false;
    },
  });

  X.resetZones = () => {
    zones.length = 0;
    if (G.art.skillFx) G.art.skillFx.clear();
  };

  // 技能大特效的兩個圖層（art/skills3.js 的 A.skillFx）：
  //   back —— 在怪物與玩家後面（掛在 loot.draw 前面，world.draw 每幀都會呼叫）
  //   front —— 在粒子之後、傷害數字之前（掛在 fx.drawCuts 前面）
  if (G.loot && G.loot.draw) {
    const lootDraw = G.loot.draw;
    G.loot.draw = function (ctx) {
      if (G.art.skillFx) G.art.skillFx.back(ctx);
      return lootDraw.apply(this, arguments);
    };
  }
  const drawCuts = G.fx.drawCuts;
  G.fx.drawCuts = function (ctx) {
    if (G.art.skillFx) G.art.skillFx.front(ctx);
    return drawCuts.apply(this, arguments);
  };
})();
