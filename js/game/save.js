// 自動存檔（localStorage）。
(function () {
  'use strict';
  const KEY = 'xiaozong_save_v1';
  const VERSION = 1;

  G.save = {
    exists() {
      return !!G.store.get(KEY);
    },

    peek() {
      return G.store.get(KEY);
    },

    write() {
      if (G.scene !== 'play' || !G.world.map) return false;
      if (G.demo && G.demo.active) return false; // 試玩模式不存檔
      const P = G.player;
      const data = {
        v: VERSION,
        savedAt: Date.now(),
        player: {
          level: P.level, exp: P.exp, form: P.form, sp: P.sp,
          hp: Math.max(1, Math.round(P.hp)), mp: Math.round(P.mp),
          gold: P.gold, skills: P.skills, hotbar: P.hotbar,
          equip: P.equip, bag: P.bag, potions: P.potions, buffs: P.buffs,
          questItems: P.questItems, playTime: P.playTime, pages: P.pages || null, apexLine: P.apexLine || null,
        },
        pos: P.dead ? null : { map: G.world.mapId, x: Math.round(P.x), y: Math.round(P.y) },
        lastCamp: G.data.camps[G.world.map.region] || '1-1',
        quests: { state: G.quests.state, progress: G.quests.progress },
        world: { flags: G.world.flags, visited: G.world.visited, openedChests: G.world.openedChests },
      };
      const ok = G.store.set(KEY, data);
      if (ok) G.hud.saveIcon();
      return ok;
    },

    // 回傳要載入的地圖與位置
    apply(data) {
      const P = G.player;
      P.newGame();
      const d = data.player;
      Object.assign(P, {
        level: d.level, exp: d.exp, form: d.form || 'base', sp: d.sp,
        gold: d.gold, skills: Object.assign({}, P.skills, d.skills), hotbar: d.hotbar || P.hotbar,
        equip: d.equip || P.equip, bag: d.bag || [], potions: d.potions || { hp: 0, mp: 0 }, buffs: d.buffs || {},
        questItems: d.questItems || {}, playTime: d.playTime || 0,
      });
      P.pages = d.pages || null;
      P.apexLine = d.apexLine || null;
      // 技能改版：已經不存在的技能退回技能點，技能欄清掉
      const clean = (pg) => {
        for (const id in pg.skills) {
          if (!G.data.skills[id]) {
            pg.sp += pg.skills[id] || 0;
            delete pg.skills[id];
          }
        }
        pg.hotbar = (pg.hotbar || []).map((id) => (id && G.data.skills[id] ? id : null));
      };
      const cur = { skills: P.skills, sp: P.sp, hotbar: P.hotbar };
      clean(cur);
      P.sp = cur.sp;
      P.hotbar = cur.hotbar;
      if (P.pages) for (const l in P.pages) clean(P.pages[l]);
      G.formSwitch.ensurePages(P); // 舊存檔：一轉之後補上三條路線的技能頁
      P.recalc();
      P.hp = Math.min(P.maxHp, d.hp || P.maxHp);
      P.mp = Math.min(P.maxMp, d.mp || P.maxMp);
      G.quests.state = {};
      G.quests.progress = {};
      const qs = (data.quests && data.quests.state) || {};
      for (const id in qs) {
        if (!G.data.quests[id]) continue;
        G.quests.state[id] = qs[id];
        G.quests.progress[id] = (data.quests.progress || {})[id] || 0;
      }
      G.world.flags = (data.world && data.world.flags) || {};
      G.world.visited = (data.world && data.world.visited) || {};
      G.world.openedChests = (data.world && data.world.openedChests) || {};
      if (data.pos && G.data.maps[data.pos.map]) return { map: data.pos.map, entry: { x: data.pos.x, y: data.pos.y } };
      return { map: data.lastCamp || '1-1', entry: 'camp' };
    },

    clear() {
      G.store.remove(KEY);
    },
  };
})();
