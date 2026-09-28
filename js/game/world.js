// 目前地圖上的所有東西：載入、更新、繪製、切換地圖。
(function () {
  'use strict';
  const SY = (map, i, x) => G.physics.surfaceY(map, i, x);
  const U = G.util;

  const W = (G.world = {
    map: null,
    mapId: null,
    monsters: [],
    drops: [],
    projectiles: [],
    zones: [],
    npcs: [],
    chests: [],
    respawns: [],
    boss: null,
    flags: {},
    visited: {},
    openedChests: {},
    t: 0,
    fade: 0,
    fadeDir: 0,
    pending: null,
    saveT: 0,
    deathT: -1,

    resetProgress() {
      this.flags = {};
      this.visited = {};
      this.openedChests = {};
    },

    load(mapId, entry) {
      const map = G.data.maps[mapId];
      if (!map) throw new Error('找不到地圖 ' + mapId);
      // 土地變老：強度在進地圖時依旗標決定（背景、地形快取看到強度變了就重建）
      map._aged = G.art.agedLevel ? G.art.agedLevel(map, this.flags) : 0;
      G.physics.terrain(map); // 地面起伏（繩子下端跟著地表）
      if (!map._theme) G.art.prepareMap(map);
      this.map = map;
      this.mapId = mapId;
      this.monsters = [];
      this.drops = [];
      this.projectiles = [];
      this.zones = [];
      this.respawns = [];
      this.boss = null;
      G.fx.reset();
      G.skillExec.reset();
      G.skillExec.resetZones();
      if (G.mobAbil) G.mobAbil.reset();
      G.music.forMap(map);

      this.npcs = (map.npcs || []).filter((n) => (!n.flag || this.flags[n.flag]) && (!n.noFlag || !this.flags[n.noFlag])).map((n) => ({ id: n.id, def: G.data.npcs[n.id], x: n.x, y: SY(map, n.p, n.x) }));
      this.chests = (map.chests || []).map((c) => ({ id: c.id, x: c.x, y: SY(map, c.p, c.x), opened: !!this.openedChests[c.id] }));
      this.springs = (map.springs || []).map((s) => ({ x: s.x, p: s.p, y: SY(map, s.p, s.x), power: s.power, squash: 0 }));
      this.signs = (map.signs || []).map((s) => ({ x: s.x, y: SY(map, s.p, s.x), text: s.text }));
      this.critters = [];
      const th = map.theme;
      let nC = th === 'rootCave' ? 14 : ['queenHall', 'crabNest', 'lavaBed', 'volcanoNest', 'reef', 'snowCamp', 'snowField', 'iceFall', 'bellShrine', 'frostAltar', 'starStair', 'timeThrone', 'timeCorridor'].indexOf(th) >= 0 ? 0 : 6;
      if (map._aged) nC = Math.round(nC * (1 - 0.8 * map._aged)); // 變老的土地：蝴蝶、螢火蟲少掉大半
      for (let i = 0; i < nC; i++) {
        this.critters.push({
          kind: th === 'rootCave' ? 'firefly' : 'butterfly',
          x: U.rand(100, map.w - 100), y: U.rand(map.h * 0.3, map.h - 140),
          vx: 0, vy: 0, seed: Math.random() * 6, flee: false, color: U.pick(['#ffd35a', '#ff9fc4', '#8fd3f4', '#ffffff']),
        });
      }

      (map.mobs || []).forEach((g, gi) => {
        for (let i = 0; i < g.n; i++) this.spawnFromGroup(gi);
      });
      (map.elites || []).forEach((e) => {
        this.monsters.push(new G.Monster(e.m, e.p, e.x, { elite: true, spawn: { elite: e } }));
      });

      // 放置玩家
      const P = G.player;
      P.resetBody();
      let px, pp;
      if (entry && typeof entry === 'object') {
        px = entry.x;
        pp = G.physics.platformBelow(map, entry.x, entry.y - 5);
        if (pp < 0) pp = 0;
      } else if (entry === 'camp' && map.camp) {
        px = (map.camp.x1 + map.camp.x2) / 2;
        pp = 0;
      } else {
        const portal = (map.portals || []).find((p) => p.id === entry);
        if (portal) {
          px = portal.x;
          pp = portal.p;
        } else {
          const st = map.start || { x: 200, p: 0 };
          px = st.x;
          pp = st.p;
        }
      }
      P.x = px;
      P.y = SY(map, pp, px);
      P.plat = pp;
      P.onGround = true;
      P.invT = Math.max(P.invT, 1);

      if (map.boss) this.boss = new G.bosses[map.boss.m](map.boss.x);
      // 漂浮的金葉：飄在空中，走過去就撿到
      (map.leaves || []).forEach(([x, y]) => this.drops.push({ kind: 'gold', amount: 5, x, y, vx: 0, vy: 0, onGround: true, float: true, plat: 0, ignorePlat: -1, ignoreT: 0, halfW: 10, t: 1, bob: x * 0.01, announced: true }));

      this.snapCamera();
      if (!this.visited[mapId]) {
        const firstInRegion = !Object.keys(this.visited).some((id) => G.data.maps[id] && G.data.maps[id].region === map.region);
        this.visited[mapId] = true;
        if (firstInRegion) G.hud.regionCard(map.region);
      }
      G.hud.mapTitle(map.name);
      G.quests.onVisit(mapId);
    },

    spawnFromGroup(gi, avoid) {
      const map = this.map;
      const g = map.mobs[gi];
      const p = map.platforms[g.p];
      const x1 = Math.max(p[0] + 40, g.x1 != null ? g.x1 : -Infinity);
      const x2 = Math.min(p[1] - 40, g.x2 != null ? g.x2 : Infinity);
      let x = U.rand(x1, Math.max(x1 + 1, x2));
      // 重生避讓：不要生在玩家旁邊（清完一圈又冒一圈，是被圍毆的主因）
      if (avoid) {
        const P = G.player;
        const close = (xx) => Math.abs(xx - P.x) < 350 && Math.abs(P.y - SY(map, g.p, xx)) < 160;
        for (let k = 0; k < 8 && close(x); k++) x = U.rand(x1, Math.max(x1 + 1, x2));
        if (close(x)) return null;
      }
      const m = new G.Monster(g.m, g.p, x, { spawn: { group: gi } });
      this.monsters.push(m);
      return m;
    },

    spawnAdd(id, x) {
      const map = this.map;
      const p = map.platforms[0];
      const m = new G.Monster(id, 0, U.clamp(x, p[0] + 40, p[1] - 40), { noVariant: true });
      m.isAdd = true;
      m.aggroT = 30;
      m.shiny = false;
      m.exp = Math.round(m.exp * 0.5);
      this.monsters.push(m);
      G.fx.burst(m.x, m.y - 20, ['#d8b0f0', '#fff', '#f2a36a'], 14, 220);
    },

    changeMap(to, entry) {
      if (this.fadeDir !== 0) return;
      this.pending = { to, entry };
      this.fadeDir = 1;
      G.audio.play('portal');
    },

    tryPortal() {
      const P = G.player;
      if (!P.onGround) return false;
      for (const p of this.map.portals || []) {
        if (Math.abs(P.x - p.x) < 36 && P.plat === p.p) {
          // Boss 房：這一章的委託全部完成才開（已經打倒過就可以直接進去挑戰回憶）
          const dest = G.data.maps[p.to];
          if (dest && dest.type === 'boss' && !this.flags[dest.boss.m + 'Defeated'] && !(G.demo && G.demo.active)) {
            const pr = G.quests.chapterProgress(dest.region);
            if (pr.done < pr.total) {
              G.hud.toast('封印還沒解開：完成這一章所有 NPC 的委託（' + pr.done + ' / ' + pr.total + '）', '#ffd84a');
              G.audio.play('error');
              return true;
            }
          }
          if (p.req && !this.flags[p.req]) {
            G.hud.toast(p.reqText || '這條路還沒開', '#ffd84a');
            G.audio.play('error');
            return true;
          }
          if (G.tutorial.blocking()) {
            G.hud.toast('先完成畫面上方的操作教學，傳送門才會開', '#ffd84a');
            G.audio.play('error');
            return true;
          }
          this.changeMap(p.to, p.target);
          return true;
        }
      }
      return false;
    },

    tryTalk() {
      const P = G.player;
      for (const n of this.npcs) {
        if (Math.abs(P.x - n.x) < 64 && Math.abs(P.y - n.y) < 40) {
          G.ui.openDialogue(n);
          G.tutorial.on('talk');
          return true;
        }
      }
      for (const s of this.signs) {
        if (Math.abs(P.x - s.x) < 40 && Math.abs(P.y - s.y) < 30) {
          G.hud.story(s.text);
          G.audio.play('ui');
          return true;
        }
      }
      for (const c of this.chests) {
        if (!c.opened && Math.abs(P.x - c.x) < 44 && Math.abs(P.y - c.y) < 30) {
          c.opened = true;
          this.openedChests[c.id] = true;
          G.loot.dropFromChest(c);
          G.audio.play('chest');
          G.fx.burst(c.x, c.y - 20, ['#ffe066', '#fff'], 20, 300);
          G.hud.toast('發現隱藏寶箱！', '#ffe066');
          G.save.write();
          return true;
        }
      }
      return false;
    },

    // ── 事件 ──
    onMonsterKilled(m) {
      // 幻影、鏡像、平行世界的假身：碎掉就沒了，不給經驗和掉落
      if (m.illusion) return;
      G.codex.note('mobs', m.id);
      const hb = G.player.passive('hundredBattles');
      if (hb && G.player.alive()) {
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + Math.max(1, Math.round(G.player.maxHp * hb.heal)));
        G.fx.particles.push({ x: m.x, y: m.y - 30, vx: (G.player.x - m.x) * 2, vy: -120, life: 0.45, t: 0, size: 5, color: '#ff6a5a', grav: 0, shape: 'circle', drag: 0 });
      }
      G.player.gainExp(Math.max(1, Math.round(m.exp * G.data.balance.expPenalty(G.player.level, m.level))));
      G.quests.onKill(m.id);
      G.loot.dropFromMonster(m);
      if (m.spawn && !m.isAdd) {
        this.respawns.push({ spawn: m.spawn, t: m.elite ? 60 : G.data.balance.respawnTime });
      }
    },

    onBossKilled(b) {
      G.codex.note('mobs', b.id);
      G.player.gainExp(b.exp);
      G.quests.onKill(b.id);
      G.loot.dropFromBoss(b);
      this.monsters.forEach((m) => {
        if (m.isAdd && !m.dead) m.takeDamage(m.hp, 1, 0, false);
      });
      this.projectiles.length = 0;
      this.zones.length = 0;
      const first = !this.flags[b.id + 'Defeated'];
      this.flags[b.id + 'Defeated'] = true;
      if (!first || b.recall || !G.data.story.bossWords[b.id]) G.hud.story(b.recall ? G.data.story.recallEnd : G.data.story.bossDefeated[b.id] || '');
      G.music.play(G.music.songFor({ region: this.map.region }));
      G.save.write();
      if (first) {
        const region = this.map.region;
        // Boss 倒下後先說出來龍去脈，再開始拿葉子的儀式（在這之前內心的聲音先等著）
        G.cut.pendingTalk = true;
        setTimeout(() => {
          G.cut.pendingTalk = false;
          if (G.scene !== 'play') return;
          if (G.cut.startBossTalk(b, region)) return;
          if (!G.story.hasLeaf(region)) {
            G.story.pendingEnd = region;
            const i = this.drops.findIndex((d) => d.kind === 'starleaf');
            if (i >= 0) this.drops.splice(i, 1);
            G.story.gainLeaf(region);
          } else {
            G.ui.endChapter = region;
            G.ui.open('m1end');
          }
        }, 1800);
      }
    },

    onPlayerDeath() {
      this.deathT = 1.3;
    },

    respawnPlayer() {
      const P = G.player;
      P.resetBody();
      P.hp = P.maxHp;
      P.mp = P.maxMp;
      P.invT = 2;
      // 營地補給：倒下回營時，紅藍至少補到 3／2 瓶，避免「沒藥 → 再倒下」的死循環
      const kit = { hp: 3, mp: 2 };
      let gave = false;
      for (const k in kit) if ((P.potions[k] || 0) < kit[k]) { P.potions[k] = kit[k]; gave = true; }
      if (gave) setTimeout(() => G.hud && G.hud.toast('營地的夥伴塞了幾瓶紅漿果和藍花蜜給你', '#ffb0a0'), 600);
      const camp = G.data.camps[this.map.region] || '1-1';
      this.load(camp, 'camp');
      G.save.write();
    },

    // ── 更新 ──
    update(dt) {
      this.t += dt;

      if (this.fadeDir === 1) {
        this.fade = Math.min(1, this.fade + dt * 4);
        if (this.fade >= 1) {
          this.load(this.pending.to, this.pending.entry);
          this.pending = null;
          this.fadeDir = -1;
          G.save.write();
        }
        return;
      }
      if (this.fadeDir === -1) {
        this.fade = Math.max(0, this.fade - dt * 3);
        if (this.fade <= 0) this.fadeDir = 0;
      }

      if (this.deathT > 0) {
        this.deathT -= dt;
        if (this.deathT <= 0) G.ui.open('death');
      }

      if (G.fx.hitstop > 0) return;

      G.player.update(dt);

      for (let i = this.monsters.length - 1; i >= 0; i--) {
        if (this.monsters[i].update(dt)) this.monsters.splice(i, 1);
      }
      if (this.boss && this.boss.update(dt)) this.boss = null;

      this.updateProjectiles(dt);
      this.updateZones(dt);
      if (G.mobAbil) G.mobAbil.tick(dt);

      for (let i = this.respawns.length - 1; i >= 0; i--) {
        const r = this.respawns[i];
        r.t -= dt;
        if (r.t > 0) continue;
        this.respawns.splice(i, 1);
        if (r.spawn.elite) {
          const e = r.spawn.elite;
          this.monsters.push(new G.Monster(e.m, e.p, e.x, { elite: true, spawn: r.spawn }));
        } else {
          const m = this.spawnFromGroup(r.spawn.group, true);
          if (!m) {
            r.t = 2;
            this.respawns.push(r);
            continue;
          }
          G.fx.burst(m.x, m.y - 16, ['#fff', '#e8ffd8'], 8, 120, { life: 0.4 });
        }
      }

      this.updateMapToys(dt);
      G.loot.update(dt);
      this.updateCamera(dt);

      this.saveT += dt;
      if (this.saveT >= G.data.balance.autosaveInterval) {
        this.saveT = 0;
        G.save.write();
      }
    },

    updateMapToys(dt) {
      const P = G.player;
      // 彈跳菇
      for (const s of this.springs) {
        if (s.squash > 0) s.squash -= dt * 4;
        if (P.alive() && P.onGround && P.plat === s.p && Math.abs(P.x - s.x) < 28 && P.climbing < 0) {
          P.vy = -s.power;
          P.onGround = false;
          s.squash = 1;
          G.audio.play('boing');
          G.fx.burst(s.x, s.y - 30, ['#ffffff', '#ffd0c0'], 8, 200, { angle: -Math.PI / 2, spread: 0.8 });
        }
      }
      // 小生物：靠近就飛走
      for (const c of this.critters) {
        const d = U.dist(c.x, c.y, P.x, P.y - 30);
        if (!c.flee && d < 90) {
          c.flee = true;
          c.vx = U.sign(c.x - P.x) * U.rand(120, 200);
          c.vy = -U.rand(120, 220);
        }
        if (c.flee) {
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          if (c.y < -40) {
            c.flee = false;
            c.x = U.rand(100, this.map.w - 100);
            c.y = this.map.h - U.rand(160, 400);
          }
        } else {
          c.x += Math.sin(this.t * 0.8 + c.seed) * 20 * dt;
          c.y += Math.cos(this.t * 1.1 + c.seed * 2) * 14 * dt;
        }
      }
      // 營火旁回復
      const camp = this.map.camp;
      if (camp && P.alive() && P.onGround && P.plat === 0 && P.x > camp.x1 && P.x < camp.x2) {
        this.campT = (this.campT || 0) + dt;
        if (this.campT >= 1) {
          this.campT = 0;
          if (P.hp < P.maxHp || P.mp < P.maxMp) {
            P.hp = Math.min(P.maxHp, P.hp + Math.ceil(P.maxHp * 0.04));
            P.mp = Math.min(P.maxMp, P.mp + Math.ceil(P.maxMp * 0.04));
            G.fx.text(P.x, P.y - 80, '+', '#9fffb0', 18, 0.6);
          }
        }
      }
    },

    updateProjectiles(dt) {
      const P = G.player;
      const gmap = this.map;
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.t += dt;
        if (p.grav) p.vy += p.grav * dt;
        // 怪物投射物：會拐彎追人（符文飛彈）、上下飄（音符）
        if (p.owner === 'monster' && p.homing && P.alive()) {
          const a = Math.atan2(P.y - 30 - p.y, P.x - p.x);
          const sp = Math.hypot(p.vx, p.vy);
          const cur = Math.atan2(p.vy, p.vx);
          let da = a - cur;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          const na = cur + U.clamp(da, -p.homing * dt, p.homing * dt);
          p.vx = Math.cos(na) * sp;
          p.vy = Math.sin(na) * sp;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // 起伏的地面：一開始就貼著地面、水平前進的東西（Boss 的浪、地面衝擊波）一路貼著地表走
        if (p.gnd == null) {
          const x0 = p.x - p.vx * dt;
          const B = this.boss;
          p.gnd = !p.vy && !p.grav && p.owner === 'boss' && G.physics.terrain(gmap) && (Math.abs(p.y - G.physics.groundY(gmap, x0)) < 1.5 || (B && B.onGround && B.plat === 0 && Math.abs(p.y - B.y) < 1.5)) ? 1 : 0;
        }
        if (p.gnd && !p.vy) p.y = G.physics.groundY(gmap, p.x);
        if (p.onTick) p.onTick(p, dt);
        if (p.owner === 'monster' && p.wave) p.y += Math.cos(p.t * 8 + (p.seed || 0)) * p.wave * 8 * dt;
        let remove = p.t > p.life || p.x < -50 || p.x > this.map.w + 50;
        // 純特效的投射物（落下的巨錘、流星、冰片）：只會移動，不會打到誰
        if (p.owner === 'fx') {
          if (p.t > p.life) this.projectiles.splice(i, 1);
          continue;
        }
        if (p.owner === 'player') {
          if (p.custom) {
            if (G.skillExec.updateShot(p, dt) || p.t > p.life) this.projectiles.splice(i, 1);
            continue;
          }
          if (p.boomerang) {
            if (G.skillExec.updateBoomerang(p, dt) || p.t > p.life) this.projectiles.splice(i, 1);
            continue;
          }
          if (!remove) {
            for (const m of G.combat.targets()) {
              if (p.pierce && p.hitSet && p.hitSet.has(m)) continue;
              const hb = m.hitbox();
              const cx = U.clamp(p.x, hb.x, hb.x + hb.w);
              const cy = U.clamp(p.y, hb.y, hb.y + hb.h);
              if (U.dist(cx, cy, p.x, p.y) < p.r) {
                const S = G.data.skills[p.id];
                if (p.pierce) {
                  // 貫穿：打到就記下來，繼續往前飛
                  p.hitSet = p.hitSet || new Set();
                  p.hitSet.add(m);
                  G.combat.hitMonster(m, S.mult(p.lv), { knock: S.knock, sound: 'feather' });
                  G.fx.burst(p.x, p.y, ['#b88aff', '#2e1f44', '#ffffff'], 8, 220);
                  if (p.hitSet.size >= p.pierce) remove = true;
                  continue;
                }
                G.combat.hitMonster(m, S.mult(p.lv), { knock: S.knock, sound: p.kind });
                G.fx.burst(p.x, p.y, p.kind === 'spirit' ? ['#8ff0e8', '#ffffff', '#5fd0c8'] : ['#d8ff9a', '#ffffff'], 10, 240);
                remove = true;
                break;
              }
            }
          }
          if (p.kind === 'spirit' && Math.random() < 0.7) G.fx.particles.push({ x: p.x, y: p.y + U.rand(-4, 4), vx: -p.dir * 40, vy: U.rand(-20, 20), life: 0.35, t: 0, size: U.rand(2, 4), color: '#8ff0e8', grav: 0, shape: 'circle', drag: 2 });
          if (remove) this.projectiles.splice(i, 1);
          continue;
        }
        const ground = p.kind === 'lavaRock' || p.kind === 'sporeBomb' ? G.physics.groundY(gmap, p.x) : 0;
        if (p.kind === 'lavaRock' && p.y >= ground) {
          // 熔岩落石：砸在地上留下一灘熔岩
          this.zones.push({ kind: 'lava', x: p.x, y: ground, r: 60, t: 0, life: 4, tick: 0, pct: 0.05, noSlow: true });
          G.fx.burst(p.x, ground - 10, ['#ff7a2a', '#ffd35a', '#3a2a24'], 14, 260, { angle: -Math.PI / 2, spread: 1.2 });
          G.fx.shake(5, 0.15);
          G.audio.play('rockHit');
          if (P.alive() && Math.abs(P.x - p.x) < 50 && Math.abs(P.y - ground) < 60) P.hurt(p.dmg, p.x);
          remove = true;
        }
        if (p.kind === 'sporeBomb' && p.y >= ground) {
          this.zones.push({ x: p.x, y: ground, r: 70, t: 0, life: 4.5, tick: 0, dmg: p.dmg });
          G.fx.burst(p.x, ground - 10, ['#c9a0e8', '#e8d0ff'], 12, 200, { angle: -Math.PI / 2, spread: 1.2 });
          G.audio.play('spore');
          remove = true;
        }
        if (!remove && P.alive()) {
          const hb = P.hitbox();
          let hit = false;
          if (p.kind === 'wave' || p.kind === 'tide') {
            hit = !p.hitDone && U.overlap({ x: p.x - 22, y: p.y - p.h, w: 44, h: p.h }, hb);
          } else {
            const cx = U.clamp(p.x, hb.x, hb.x + hb.w);
            const cy = U.clamp(p.y, hb.y, hb.y + hb.h);
            hit = U.dist(cx, cy, p.x, p.y) < p.r;
          }
          if (hit) {
            if (P.hurt(p.dmg, p.x - p.vx * 0.01)) {
              G.fx.burst(p.x, p.y, ['#fff', '#ffe0a0'], 8, 180);
              if (p.slow) P.slowT = Math.max(P.slowT || 0, p.slow);
              if (p.push) P.x += p.push * 0.25;
            }
            if (p.kind === 'wave' || p.kind === 'tide') p.hitDone = true;
            else remove = true;
          }
        }
        if (remove) this.projectiles.splice(i, 1);
      }
    },

    updateZones(dt) {
      const P = G.player;
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        z.t += dt;
        if (z.t >= z.life) {
          this.zones.splice(i, 1);
          continue;
        }
        if (z.visual) continue;
        if (P.alive() && Math.abs(P.x - z.x) < z.r && Math.abs(P.y - z.y) < 70) {
          if (!z.noSlow) P.slowT = 0.2;
          z.tick -= dt;
          if (z.tick <= 0) {
            z.tick = 0.7;
            P.hurt(Math.max(1, Math.round(P.maxHp * (z.pct || 0.03))), null, { noKnock: true, ignoreInv: true });
          }
        }
      }
    },

    // ── 相機 ──
    cameraTarget() {
      const P = G.player;
      return {
        x: U.clamp(P.x - G.W / 2, 0, Math.max(0, this.map.w - G.W)),
        y: U.clamp(P.y - G.H * 0.6, 0, Math.max(0, this.map.h - G.H) + 60),
      };
    },
    snapCamera() {
      const t = this.cameraTarget();
      G.cam.x = t.x;
      G.cam.y = t.y;
    },
    updateCamera(dt) {
      const t = this.cameraTarget();
      G.cam.x += (t.x - G.cam.x) * Math.min(1, dt * 7);
      G.cam.y += (t.y - G.cam.y) * Math.min(1, dt * 5);
    },

    // ── 繪製 ──
    draw(ctx) {
      const map = this.map;
      const t = this.t;
      const cam = G.cam;
      G.art.drawBackground(ctx, map, cam, t);

      ctx.save();
      ctx.translate(-Math.round(cam.x + G.fx.shakeX + G.fx.kickX), -Math.round(cam.y + G.fx.shakeY + G.fx.kickY));

      const P = G.player;
      map.ropes.forEach((r) => {
        const near = P.climbing < 0 && Math.abs(P.x - r[0]) < 70 && P.y >= r[1] - 10 && P.y <= r[2] + 10;
        G.art.drawRope(ctx, r, t, near);
      });
      G.art.drawPlatforms(ctx, map, cam);
      // 繩子翻過上層平台正面的那一段、平台表面上的固定樁、下端落地的盤繩（要蓋在平台前面）
      if (G.art.drawRopeFronts) G.art.drawRopeFronts(ctx, map, t, cam);
      G.art.drawProps(ctx, map, cam, t);
      (map.portals || []).forEach((p) => {
        const dest = G.data.maps[p.to];
        let label = dest && dest.name;
        if (dest && dest.type === 'boss' && !this.flags[dest.boss.m + 'Defeated']) {
          const pr = G.quests.chapterProgress(dest.region);
          if (pr.done < pr.total) label += '（封印 ' + pr.done + '/' + pr.total + '）';
        }
        if (p.req && !this.flags[p.req]) label += '（未開放）';
        G.art.drawPortal(ctx, p.x, SY(map, p.p, p.x), t, label);
      });
      if (map.camp) {
        G.art.drawCampHouses(ctx, map.camp.x1, map.camp.x2, map.platforms[0][2], t, map.region);
        this.drawCamp(ctx, map, t);
      }
      this.signs.forEach((s) => G.art.drawSign(ctx, s.x, s.y));
      this.springs.forEach((s) => G.art.drawSpring(ctx, s.x, s.y, s.squash, t));
      this.critters.forEach((c) => G.art.drawCritter(ctx, c, t));
      this.chests.forEach((c) => G.art.drawChest(ctx, c, t));
      this.npcs.forEach((n) => G.art.drawNpc(ctx, n, t, G.quests.marker(n.id)));
      this.zones.forEach((z) => {
        // 起伏的地面：貼在地上的區域（岩漿池、毒雲、焦痕……）跟著坡度斜切（直立的火焰、煙還是直的）
        if (z.kind === 'quake' && G.physics.terrain(map) && Math.abs(z.y - G.physics.groundY(map, z.x)) < 3) {
          // 往兩側擴散的震波：左右兩半各自對齊浪頭那裡的地表
          for (let s = -1; s <= 1; s += 2) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(s < 0 ? z.x - 4000 : z.x, z.y - 400, 4000, 800);
            ctx.clip();
            ctx.translate(0, G.physics.groundY(map, z.x + s * z.r) - z.y);
            G.art.drawZone(ctx, z, t);
            ctx.restore();
          }
          return;
        }
        const k = G.physics.groundShear(map, z.x, z.y, z.r);
        if (!k) return G.art.drawZone(ctx, z, t);
        ctx.save();
        ctx.transform(1, k, 0, 1, 0, -k * z.x);
        G.art.drawZone(ctx, z, t);
        ctx.restore();
      });
      G.loot.draw(ctx, t);
      this.monsters.forEach((m) => m.draw(ctx));
      if (this.boss) {
        this.boss.draw(ctx);
        if (!this.boss.dead && G.art.drawStatus) G.art.drawStatus(ctx, this.boss, this.boss.t);
      }
      G.fx.drawGhosts(ctx);
      G.player.draw(ctx);
      this.projectiles.forEach((p) => G.art.drawProjectile(ctx, p, t));
      G.art.drawForeground(ctx, map, cam, t);
      G.fx.drawWorld(ctx);

      if (G.opts.showHitboxes) this.drawHitboxes(ctx);
      ctx.restore();

      G.art.drawAtmosphere(ctx, map, cam, t);
    },

    drawCamp(ctx, map, t) {
      // 營火
      const x = (map.camp.x1 + map.camp.x2) / 2 - 20;
      const y = G.physics.groundY(map, x);
      ctx.save();
      ctx.translate(x, y);
      const g = ctx.createRadialGradient(0, -20, 4, 0, -20, 120);
      g.addColorStop(0, 'rgba(255,190,90,0.35)');
      g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -20, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6b4428';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-16, -2);
      ctx.lineTo(14, -10);
      ctx.moveTo(16, -2);
      ctx.lineTo(-14, -10);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const h = 22 + Math.sin(t * 9 + i * 2) * 6 - i * 4;
        ctx.fillStyle = ['#ff8a3a', '#ffc24a', '#fff0a0'][i];
        ctx.beginPath();
        ctx.moveTo(-10 + i * 3, -6);
        ctx.quadraticCurveTo(0, -6 - h * 1.4, 10 - i * 3, -6);
        ctx.fill();
      }
      ctx.restore();
      if (Math.random() < 0.1) G.fx.burst(x, y - 20, '#ffcf6a', 1, 40, { grav: -60, life: 1 });
    },

    drawHitboxes(ctx) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#0f0';
      const hb = G.player.hitbox();
      ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
      ctx.strokeStyle = '#f00';
      this.monsters.forEach((m) => {
        const b = m.hitbox();
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      });
      if (this.boss) {
        const b = this.boss.hitbox();
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }
      ctx.strokeStyle = '#ff0';
      this.map.platforms.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p[0], p[2]);
        ctx.lineTo(p[1], p[2]);
        ctx.stroke();
      });
    },
  });

  W.resetProgress();
})();
