// 裝備生成、掉落物、撿取。
(function () {
  'use strict';
  const U = G.util;
  const D = () => G.data.items;
  let uidSeq = Date.now() % 100000;

  const L = (G.loot = {
    rollRarity(table) {
      return U.weighted(D().rarityTables[table] || D().rarityTables.normal);
    },

    // 生成一件裝備；fixed 用來指定固定數值（起始裝備、商店、任務獎勵）
    makeEquip(baseId, rarity, fixed) {
      const base = D().bases[baseId];
      const R = D().rarity[rarity];
      const stats = {};
      for (const k in base.stats) {
        if (fixed && fixed[k] != null) {
          stats[k] = fixed[k];
          continue;
        }
        const v = base.stats[k] * R.mult * U.rand(0.88, 1.12);
        stats[k] = k === 'crit' ? Math.round(v * 1000) / 1000 : Math.max(1, Math.round(v));
      }
      const item = {
        uid: 'i' + uidSeq++,
        base: baseId,
        slot: base.slot,
        name: base.name,
        req: base.req,
        tier: base.tier,
        rarity,
        stats,
        sub: null,
        special: null,
        tint: base.tint || null,
      };
      if (!fixed && (rarity === 'epic' || rarity === 'legendary')) {
        const s = U.pick(D().substats);
        const mul = base.tier;
        let v = U.rand(s.min, s.max) * mul;
        v = s.stat === 'crit' ? Math.round(v * 1000) / 1000 : Math.max(1, Math.round(v));
        item.sub = { stat: s.stat, value: v };
      }
      if (!fixed && rarity === 'legendary') {
        const keys = Object.keys(D().specials);
        item.special = U.pick(keys);
        item.name = base.name + '·' + D().specials[item.special].name;
      }
      return item;
    },

    // 某隻 Boss 的獨特裝備（沒標 boss 的是菇菇女王的）
    uniquesOf(bossId) {
      const U2 = D().uniques;
      const list = Object.keys(U2).filter((k) => (U2[k].boss || 'queenShroom') === bossId);
      return list.length ? list : Object.keys(U2);
    },
    makeUnique(id) {
      const u = D().uniques[id];
      return {
        uid: 'i' + uidSeq++, base: id, slot: u.slot, name: u.name, req: u.req, tier: u.tier,
        rarity: 'legendary', stats: Object.assign({}, u.stats), sub: null, special: u.special, tint: u.tint, unique: true,
      };
    },

    rollPotion() {
      return U.weighted(D().potionDrops);
    },

    // 強化後的基礎能力：每級 +8%
    enhanced(item) {
      const out = Object.assign({}, item.stats);
      const k = 1 + (item.plus || 0) * (G.data.balance.enhancePct || 0);
      if (k !== 1) for (const s in out) out[s] = s === 'crit' ? Math.round(out[s] * k * 1000) / 1000 : Math.round(out[s] * k);
      return out;
    },

    totalStats(item) {
      const out = this.enhanced(item);
      if (item.sub) out[item.sub.stat] = (out[item.sub.stat] || 0) + item.sub.value;
      return out;
    },

    fmtStat(k, v) {
      const name = D().statNames[k] || k;
      if (k === 'crit') return name + ' +' + (v * 100).toFixed(1) + '%';
      return name + ' +' + v;
    },

    randomEquip(level, table) {
      const tier = D().tierForLevel(level);
      const pool = D().basesOfTier(tier);
      return this.makeEquip(U.pick(pool), this.rollRarity(table));
    },

    // ── 掉落物實體 ──
    spawn(kind, x, y, data) {
      G.world.drops.push(Object.assign({
        kind, x, y,
        vx: U.rand(-140, 140),
        vy: U.rand(-460, -340),
        onGround: false, plat: 0, ignorePlat: -1, ignoreT: 0, halfW: 10,
        t: 0, bob: Math.random() * 6,
      }, data || {}));
    },

    dropFromMonster(m) {
      const d = m.def.drops || {};
      const x = m.x;
      const y = m.y - 20;
      if (d.gold) this.spawn('gold', x, y, { amount: U.randi(d.gold[0], d.gold[1]) * (m.elite ? 4 : 1) * (m.shiny ? 5 : 1) });
      if (m.shiny) {
        this.spawn('equip', x, y, { item: this.randomEquip(m.level, 'shiny') });
      } else if (m.V && m.V.loot === 'elite' && Math.random() < 0.2) {
        this.spawn('equip', x, y, { item: this.randomEquip(m.level, 'elite') });
      } else if (m.V && m.V.loot === 'gold') {
        this.spawn('gold', x, y, { amount: U.randi(d.gold[0], d.gold[1]) * 4 });
      } else if (m.elite && Math.random() < 0.3) {
        this.spawn('equip', x, y, { item: this.randomEquip(m.level, 'elite') });
      } else if (d.equip && Math.random() < d.equip) {
        this.spawn('equip', x, y, { item: this.randomEquip(m.level, 'normal') });
      }
      // 藥水：一般怪偶爾掉小瓶紅藍（補缺口，不夠囤），精英、變種怪機率高、種類多
      if (m.elite || m.V) {
        if (Math.random() < 0.25) this.spawn('potion', x, y, { potion: this.rollPotion() });
      } else if (d.potion && Math.random() < d.potion) {
        this.spawn('potion', x, y, { potion: Math.random() < 0.62 ? 'hp' : 'mp' });
      }
      // 材料：身上有對應的收集任務時更容易掉
      (d.mats || []).forEach(([id, chance]) => {
        const c = G.quests.collectActive(id) ? Math.max(chance, 0.6) : chance;
        if (Math.random() < c * (m.V ? 2 : 1)) this.spawn('quest', x, y, { qitem: id });
      });
    },

    dropFromBoss(b) {
      const d = b.def.drops || {};
      for (let i = 0; i < 4; i++) this.spawn('gold', b.x + U.rand(-60, 60), b.y - 120, { amount: Math.round(U.randi(d.gold[0], d.gold[1]) / 4) });
      this.spawn('equip', b.x - 30, b.y - 120, { item: this.randomEquip(b.level - 2, 'boss') });
      this.spawn('equip', b.x + 30, b.y - 120, { item: this.randomEquip(b.level - 2, 'boss') });
      this.spawn('potion', b.x, b.y - 120, { potion: 'hpL', count: 3 });
      if (Math.random() < 0.35) this.spawn('equip', b.x, b.y - 130, { item: this.makeUnique(U.pick(this.uniquesOf(b.id))) });
      const ch = G.world.map.region;
      if (!G.story.hasLeaf(ch)) this.spawn('starleaf', b.x, b.y - 140, { chapter: ch });
      this.spawn('quest', b.x + 50, b.y - 120, { qitem: { hermitCrab: 'lampshard', lavaTortoise: 'volcanocore', frostSpirit: 'frostbell', timeItself: 'timeshard' }[b.id] || 'queencap' });
    },

    // 寶箱：金葉和藥水，不掉裝備
    dropFromChest(ch) {
      const r = (G.world.map && G.world.map.region) || 1;
      // 經濟 v1.4：randi(60,120)·r² → randi(40,80)·r(r+1)/2（第三章一箱平均 810 → 360；見 js/data/rebalance.js）
      this.spawn('gold', ch.x - 12, ch.y - 30, { amount: Math.round((U.randi(40, 80) * r * (r + 1)) / 2) });
      this.spawn('potion', ch.x, ch.y - 30, { potion: 'hp', count: 3 });
      this.spawn('potion', ch.x + 12, ch.y - 30, { potion: 'mp', count: 2 });
    },

    rarityOf(dr) {
      return dr.kind === 'equip' ? dr.item.rarity : null;
    },

    update(dt) {
      const P = G.player;
      const b = G.data.balance;
      const map = G.world.map;
      const list = G.world.drops;
      for (let i = list.length - 1; i >= 0; i--) {
        const dr = list[i];
        dr.t += dt;
        if (!dr.announced) {
          dr.announced = true;
          this.announce(dr);
        }
        if (dr.t > b.dropLifetime) {
          list.splice(i, 1);
          continue;
        }
        const pcx = P.x;
        const pcy = P.y - 28;
        const dist = U.dist(dr.x, dr.y - 10, pcx, pcy);
        if (!P.dead && dr.t > b.pickupDelay && dist < b.magnetRadius && !dr.blocked) {
          // 被吸向玩家
          const k = Math.min(1, dt * 12);
          dr.x += (pcx - dr.x) * k;
          dr.y += (pcy + 10 - dr.y) * k;
          dr.onGround = false;
          if (dist < 26) {
            if (this.collect(dr)) list.splice(i, 1);
            else dr.blocked = true;
          }
          continue;
        }
        if (dr.blocked && dist > b.magnetRadius * 1.5) dr.blocked = false;
        if (dr.float) continue;
        if (!dr.onGround) {
          G.physics.step(dr, dt, map);
          if (dr.onGround) dr.vx = 0;
        }
      }
    },

    announce(dr) {
      const r = this.rarityOf(dr);
      if (r === 'rare') G.audio.play('rare');
      else if (r === 'epic') G.audio.play('epic');
      else if (r === 'legendary') {
        G.audio.play('legendary');
        G.fx.shake(4, 0.25);
        G.fx.screenFlash('#fff2c0', 0.3);
      }
      if (dr.kind === 'starleaf') G.audio.play('legendary');
    },

    collect(dr) {
      const P = G.player;
      const I = D();
      switch (dr.kind) {
        case 'gold':
          P.gold += dr.amount;
          G.fx.text(P.x, P.y - 80, '+' + dr.amount + ' 金葉', '#ffd84a', 15, 0.8);
          G.audio.play('coin');
          return true;
        case 'potion': {
          const n = dr.count || 1;
          P.potions[dr.potion] = (P.potions[dr.potion] || 0) + n;
          G.hud.toast('獲得 ' + I.potions[dr.potion].name + ' ×' + n, '#ffb0a0');
          G.audio.play('pickup');
          return true;
        }
        case 'quest':
          P.questItems[dr.qitem] = (P.questItems[dr.qitem] || 0) + 1;
          if (!G.quests.onCollect(dr.qitem)) G.fx.text(P.x, P.y - 90, '+' + I.materials[dr.qitem].name, '#d8f0b0', 13, 0.7);
          G.audio.play('pickup');
          return true;
        case 'starleaf':
          G.story.gainLeaf(dr.chapter || 1);
          return true;
        case 'equip': {
          if (P.bag.length >= G.data.balance.bagSize) {
            G.hud.toast('背包已滿！到營地賣掉一些裝備吧', '#ff9a9a');
            G.audio.play('error');
            return false;
          }
          dr.item.isNew = true;
          P.bag.push(dr.item);
          const R = I.rarity[dr.item.rarity];
          G.hud.toast('獲得 ' + R.name + '「' + dr.item.name + '」', R.color);
          G.audio.play('pickup');
          if (R.order >= 2) G.save.write();
          return true;
        }
      }
      return true;
    },

    draw(ctx, t) {
      for (const dr of G.world.drops) {
        const r = this.rarityOf(dr);
        const bob = dr.onGround ? Math.sin(t * 3 + dr.bob) * 3 - 4 : 0;
        const y = dr.y - 12 + bob;
        if (dr.onGround && (r && r !== 'common' || dr.kind === 'starleaf')) {
          // 稀有度光柱
          const col = dr.kind === 'starleaf' ? '255,230,120' : r === 'rare' ? '77,163,255' : r === 'epic' ? '180,107,255' : '255,182,46';
          const h = r === 'rare' ? 90 : r === 'legendary' ? 260 : 210;
          const g = ctx.createLinearGradient(0, dr.y - h, 0, dr.y);
          g.addColorStop(0, 'rgba(' + col + ',0)');
          g.addColorStop(1, 'rgba(' + col + ',' + (0.45 + Math.sin(t * 4) * 0.12).toFixed(3) + ')');
          ctx.fillStyle = g;
          const bw = r === 'rare' ? 24 : 34;
          ctx.fillRect(dr.x - bw / 2, dr.y - h, bw, h);
          if (Math.random() < 0.08) G.fx.sparkle(dr.x, dr.y - 20, 'rgba(' + col + ',1)', 1, 10);
        }
        let icon = dr.kind;
        if (dr.kind === 'equip') icon = dr.item.slot;
        else if (dr.kind === 'potion') icon = D().potions[dr.potion].icon;
        else if (dr.kind === 'quest') icon = dr.qitem;
        if (dr.kind === 'equip') {
          const R = D().rarity[dr.item.rarity];
          ctx.fillStyle = R.color;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(dr.x, y, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        const spin = dr.onGround ? 1 : Math.cos(dr.t * 14);
        ctx.save();
        ctx.translate(dr.x, y);
        ctx.scale(dr.kind === 'gold' ? spin : 1, 1);
        if (dr.kind === 'equip' && dr.item.tint) {
          G.art.mode = 'tint';
          G.art.modeColor = dr.item.tint;
          G.art.modeAmt = 0.45;
        }
        G.art.drawIcon(ctx, icon, 0, 0, dr.kind === 'gold' ? 0.8 : 0.9);
        G.art.mode = null;
        ctx.restore();
      }
    },
  });
})();
