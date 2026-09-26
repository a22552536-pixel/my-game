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
        P.bag.push(it);
        G.hud.toast('獲得「' + it.name + '」', G.data.items.rarity[it.rarity].color);
      }
      G.fx.pillar(P.x, P.y, 'rgba(140,255,160,0.8)', 1.0, 70);
      G.audio.play('quest');
      if (r.exp) P.gainExp(r.exp);
      G.save.write();
      return true;
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

    onCollect(item) {
      for (const id in this.state) {
        const q = this.def(id);
        if (this.state[id] !== 'active' || q.type !== 'collect' || q.item !== item) continue;
        this.progress[id] = Math.min(q.count, G.player.questItems[item] || 0);
        G.fx.text(G.player.x, G.player.y - 100, G.data.items.questItems[item].name + ' ' + this.progress[id] + '/' + q.count, '#9fe0ff', 14, 0.9);
        this.check(id);
      }
    },

    // 追蹤欄用
    tracked() {
      const out = [];
      for (const id in this.state) {
        const st = this.state[id];
        if (st !== 'active' && st !== 'ready') continue;
        const q = this.def(id);
        out.push({ id, name: q.name, ready: st === 'ready', text: st === 'ready' ? '回報 ' + G.data.npcs[q.npc].name : this.goalText(id) });
      }
      return out;
    },

    goalText(id) {
      const q = this.def(id);
      const n = Math.min(this.progress[id] || 0, q.count);
      if (q.type === 'kill') return '打倒 ' + G.data.monsters[q.target].name + ' ' + n + '/' + q.count;
      if (q.type === 'collect') return '收集 ' + G.data.items.questItems[q.item].name + ' ' + n + '/' + q.count;
      if (q.type === 'boss') return '討伐 ' + G.data.monsters[q.target].name;
      return '';
    },
  });

  Q.reset();
})();
