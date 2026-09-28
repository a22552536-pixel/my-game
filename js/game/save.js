// 自動存檔（localStorage）。
(function () {
  'use strict';
  const KEY = 'xiaozong_save_v1';
  // v2：第二章起的怪物、委託、等級帶全部改版，舊存檔（v1）不能繼續，要開新遊戲
  const VERSION = 3;
  const current = () => {
    const d = G.store.get(KEY);
    return d && (d.v || 1) >= VERSION ? d : null;
  };

  G.save = {
    exists() {
      return !!current();
    },

    // 有舊版本的存檔（標題畫面提示要開新遊戲）
    outdated() {
      const d = G.store.get(KEY);
      return !!(d && (d.v || 1) < VERSION);
    },

    peek() {
      return current();
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
          equip: P.equip, bag: P.bag, potions: P.potions, buffs: P.buffs, potPref: P.potPref || null,
          questItems: P.questItems, playTime: P.playTime, pages: P.pages || null, apexLine: P.apexLine || null,
          ultSlots: 1, // 五轉大招已經改成放在技能欄（舊存檔沒有這個標記）
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
        equip: d.equip || P.equip, bag: d.bag || [], potions: d.potions || { hp: 0, mp: 0 }, buffs: d.buffs || {}, potPref: d.potPref || { hp: 'hp', mp: 'mp' },
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
          } else if ((pg.skills[id] || 0) > G.data.skills[id].maxLv) {
            // 技能等級上限調低了：多出來的點數退回（飛撲的第 1 級是送的，不退）
            pg.sp += pg.skills[id] - G.data.skills[id].maxLv;
            pg.skills[id] = G.data.skills[id].maxLv;
          }
        }
        pg.hotbar = (pg.hotbar || []).slice(0, G.data.keys.skillSlots.length).map((id) => (id && G.data.skills[id] ? id : null));
        while (pg.hotbar.length < G.data.keys.skillSlots.length) pg.hotbar.push(null);
        // 舊存檔：五轉大招原本用專屬按鍵、不在技能欄裡，已經學會的就放進空格（沒有空格就留給玩家自己在技能視窗放）
        if (!d.ultSlots) ['meidou', 'chibaku'].forEach((u) => {
          if ((pg.skills[u] || 0) <= 0 || pg.hotbar.indexOf(u) >= 0) return;
          const free = pg.hotbar.indexOf(null);
          if (free >= 0) pg.hotbar[free] = u;
        });
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
