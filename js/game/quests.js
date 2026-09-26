// 任務狀態：undefined（未接）→ active（進行中）→ ready（可回報）→ done（完成）。
(function () {
  'use strict';

  const Q = (G.quests = {
    state: {},
    progress: {},

    reset() {
      this.state = {};
      this.progress = {};
    },

    def(id) {
      return G.data.quests[id];
    },

    available(id) {
      const q = this.def(id);
      if (this.state[id]) return false;
      if (G.player.level < (q.req.lv || 1)) return false;
      if (q.req.quest && this.state[q.req.quest] !== 'done') return false;
      return true;
    },

    // 任務屬於哪一章：看發任務的 NPC 最早出現在哪張地圖
    chapterOf(id) {
      const npc = this.def(id).npc;
      for (const mid of G.data.mapOrder) {
        const m = G.data.maps[mid];
        if ((m.npcs || []).some((n) => n.id === npc)) return m.region;
      }
      return 1;
    },

    // 這一章的委託（不含主線）完成了幾個
    chapterProgress(region) {
      let total = 0;
      let done = 0;
      for (const id in G.data.quests) {
        if (this.def(id).main || this.chapterOf(id) !== region) continue;
        total++;
        if (this.state[id] === 'done') done++;
      }
      return { done, total };
    },

    forNpc(npcId) {
      const out = [];
      for (const id in G.data.quests) if (this.def(id).npc === npcId) out.push(id);
      return out;
    },

    // NPC 頭上的符號：? 可回報、! 有新任務
    marker(npcId) {
      const ids = this.forNpc(npcId);
      if (ids.some((id) => this.state[id] === 'ready')) return '?';
      if (ids.some((id) => this.available(id))) return '!';
      return null;
    },

    accept(id) {
      const q = this.def(id);
      this.state[id] = 'active';
      this.progress[id] = 0;
      if (q.type === 'collect') {
        this.progress[id] = Math.min(q.count, G.player.questItems[q.item] || 0);
        this.check(id);
      }
      G.audio.play('quest');
      G.hud.toast('接受任務「' + q.name + '」', '#9fe0ff');
      G.save.write();
    },

    check(id) {
      const q = this.def(id);
      if (this.state[id] === 'active' && this.progress[id] >= q.count) {
        this.state[id] = 'ready';
        G.hud.toast('任務「' + q.name + '」完成！回去找' + G.data.npcs[q.npc].name, '#7dff7a');
        G.audio.play('quest');
      }
    },

    turnIn(id) {
      const q = this.def(id);
      const P = G.player;
      if (this.state[id] !== 'ready') return;
      if (q.reward.equip && P.bag.length >= G.data.balance.bagSize) {
        G.hud.toast('背包已滿，先整理一下再來領獎勵', '#ff9a9a');
        G.audio.play('error');
        return false;
      }
      this.state[id] = 'done';
      if (q.type === 'collect') P.questItems[q.item] = Math.max(0, (P.questItems[q.item] || 0) - q.count);
      const r = q.reward;
      if (r.gold) P.gold += r.gold;
      if (r.potions) for (const k in r.potions) P.potions[k] = (P.potions[k] || 0) + r.potions[k];
      if (r.equip) {
        const it = G.loot.makeEquip(r.equip.base, r.equip.rarity);
        it.isNew = true;
        P.bag.push(it);
        G.hud.toast('獲得「' + it.name + '」', G.data.items.rarity[it.rarity].color);
      }
      G.fx.pillar(P.x, P.y, 'rgba(140,255,160,0.8)', 1.0, 70);
      G.audio.play('quest');
      if (r.exp) P.gainExp(Math.max(1, Math.round(r.exp * G.data.balance.questExpMult(P.level, q.region))));
      G.save.write();
      return true;
    },

    onVisit(mapId) {
      for (const id in this.state) {
        const q = this.def(id);
        if (this.state[id] === 'active' && q.type === 'visit' && q.target === mapId) {
          this.progress[id] = 1;
          this.check(id);
        }
      }
    },

    // NPC 依進度說不同的話
    npcLine(npcId) {
      const talk = G.data.npcs[npcId].talk || [];
      let pick = null;
      talk.forEach((g) => {
        const c = g.if;
        if (!c) pick = g;
        else if (c.done && this.state[c.done] === 'done') pick = g;
        else if (c.level && G.player.level >= c.level) pick = g;
        else if (c.flag && G.world.flags[c.flag]) pick = g;
      });
      return pick ? G.util.pick(pick.text) : '……';
    },

    onKill(monsterId) {
      for (const id in this.state) {
        const q = this.def(id);
        if (this.state[id] !== 'active') continue;
        if ((q.type === 'kill' || q.type === 'boss') && q.target === monsterId) {
          this.progress[id]++;
          if (q.type === 'kill') G.fx.text(G.player.x, G.player.y - 100, q.name + ' ' + Math.min(this.progress[id], q.count) + '/' + q.count, '#9fe0ff', 14, 0.9);
          this.check(id);
        }
      }
    },

    collectActive(item) {
      for (const id in this.state) {
        const q = this.def(id);
        if (this.state[id] === 'active' && q.type === 'collect' && q.item === item) return true;
      }
      return false;
    },

    // 會掉這個材料的怪物名稱
    sources(item) {
      return Object.keys(G.data.monsters).filter((k) => {
        const d = G.data.monsters[k].drops;
        return d && (d.mats || []).some((m) => m[0] === item);
      }).map((k) => G.data.monsters[k].name);
    },

    // 材料被賣掉或拿去交換後，重新對一次收集任務的進度
    recount() {
      for (const id in this.state) {
        const q = this.def(id);
        const st = this.state[id];
        if (q.type !== 'collect' || (st !== 'active' && st !== 'ready')) continue;
        this.progress[id] = Math.min(q.count, G.player.questItems[q.item] || 0);
        if (st === 'ready' && this.progress[id] < q.count) this.state[id] = 'active';
        else this.check(id);
      }
    },

    // 身上有進行中的收集任務要這個材料時，回傳還需要保留的數量
    reserved(item) {
      let n = 0;
      for (const id in this.state) {
        const q = this.def(id);
        if (q.type === 'collect' && q.item === item && (this.state[id] === 'active' || this.state[id] === 'ready')) n += q.count;
      }
      return n;
    },

    onCollect(item) {
      let hit = false;
      for (const id in this.state) {
        const q = this.def(id);
        if (this.state[id] !== 'active' || q.type !== 'collect' || q.item !== item) continue;
        hit = true;
        this.progress[id] = Math.min(q.count, G.player.questItems[item] || 0);
        G.fx.text(G.player.x, G.player.y - 100, G.data.items.questItems[item].name + ' ' + this.progress[id] + '/' + q.count, '#9fe0ff', 14, 0.9);
        this.check(id);
      }
      return hit;
    },

    // 追蹤欄用
    tracked() {
      const out = [];
      for (const id in this.state) {
        const st = this.state[id];
        if (st !== 'active' && st !== 'ready') continue;
        const q = this.def(id);
        out.push({ id, name: q.name, ready: st === 'ready', main: !!q.main, text: st === 'ready' ? '回報 ' + G.data.npcs[q.npc].name : this.goalText(id) });
      }
      // 可回報的排前面、主線其次，最多顯示 5 個
      out.sort((a, b) => (b.ready - a.ready) || (b.main - a.main));
      return out.slice(0, 5);
    },

    goalText(id) {
      const q = this.def(id);
      const n = Math.min(this.progress[id] || 0, q.count);
      if (q.type === 'kill') return '打倒 ' + G.data.monsters[q.target].name + ' ' + n + '/' + q.count;
      if (q.type === 'collect') {
        const from = this.sources(q.item);
        return '收集 ' + G.data.items.questItems[q.item].name + ' ' + n + '/' + q.count + '（' + from.join('、') + '）';
      }
      if (q.type === 'boss') return '討伐 ' + G.data.monsters[q.target].name;
      if (q.type === 'visit') return '前往 ' + G.data.maps[q.target].name;
      return '';
    },
  });

  Q.reset();
})();
