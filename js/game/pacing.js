// 節奏 v1.3 的遊戲掛勾（資料在 js/data/rebalance.js）：
//   打倒章節 Boss 時，經驗不夠就用「星楓葉的祝福」補到剛好可以進化；
//   完成雲鬃的最後一個委託「停住的午後」（q75）得到五轉的傳承（等級不到 45 就補到 45：終章前半結束時五轉）；
//   第一次到終章營地時，提醒灰鬃在等你（終章節奏 v1.5：灰鬃 → 雲鬃 → 五轉 → 營地的封印 → Boss，見 js/data/rebalance.js）；
//   舊存檔（終章進行到一半）的轉換：見檔尾 migrate；
//   第一次到第二章營地時，提醒松鼠信差可以在營地之間傳送。
(function () {
  'use strict';
  const W = G.world;
  const P = () => G.player;

  const baseBossKilled = W.onBossKilled;
  W.onBossKilled = function (b) {
    const first = !this.flags[b.id + 'Defeated'];
    baseBossKilled.call(this, b);
    if (!first || b.recall) return;
    const chs = G.data.story.chapters;
    const r = Object.keys(chs).find((k) => chs[k].boss === b.id);
    const band = r && G.data.balance.bands[r];
    const p = P();
    if (!band || +r >= 5 || p.level >= band[1]) return;
    // 補到剛好升上該章上限等級（= 下一轉的等級）
    let gap = p.expNeed() - p.exp;
    for (let l = p.level + 1; l < band[1]; l++) gap += G.data.balance.expToNext(l);
    setTimeout(() => {
      if (G.scene !== 'play') return;
      G.hud.toast('星楓葉的祝福：葉子的光流進身體裡……', '#ffe14a');
      p.gainExp(Math.max(1, gap));
    }, 600);
  };

  const baseTurnIn = G.quests.turnIn;
  G.quests.turnIn = function (id) {
    const res = baseTurnIn.apply(this, arguments);
    if (id === 'q75' && this.state[id] === 'done' && !W.flags.apexBlessing) {
      W.flags.apexBlessing = true;
      const p = P();
      const lv = G.data.balance.evolveLv[4];
      G.hud.toast('雲鬃把守葉獸的力量傳給了你……', '#ffe14a');
      // 雲鬃的傳承：經驗不夠就補到剛好可以五轉（終章前半結束時一定五轉）
      if (p.level < lv) {
        let gap = p.expNeed() - p.exp;
        for (let l = p.level + 1; l < lv; l++) gap += G.data.balance.expToNext(l);
        p.gainExp(Math.max(1, gap));
      }
      if (G.evolve.canEvolve()) {
        G.hud.toast('可以進行五轉了！五轉技能各 1 點就是完整的', '#ffe14a');
        G.cut.pendingVoice = true;
      }
      G.save.write();
    }
    return res;
  };

  const baseLoad = W.load;
  W.load = function (mapId, entry) {
    const out = baseLoad.apply(this, arguments);
    const map = this.map;
    // 身上有「討伐野外魔王」的委託：進到牠的地圖就不用等冷卻
    const fbId = G.data.fieldBosses && G.data.fieldBosses[mapId];
    if (fbId && G.fieldBoss) {
      const Q = G.data.quests;
      const want = Object.keys(Q).some((id) => Q[id].target === fbId && G.quests.state[id] === 'active');
      if (want) G.fieldBoss.clearCooldown(fbId);
    }
    // 終章：第一次到神殿前庭，灰鬃在等你（營地的委託要等雲鬃的傳承之後）
    if (map && map.type === 'camp' && map.region === 5 && !this.flags.ch5GuideHint && !G.quests.state.q78 && !this.flags.apexBlessing && !(G.demo && G.demo.active)) {
      this.flags.ch5GuideHint = true;
      setTimeout(() => G.scene === 'play' && G.hud.toast('灰鬃在營地等你。他頭上有「！」', '#ffd35a'), 2500);
    }
    if (map && map.type === 'camp' && map.region === 2 && !this.flags.squirrelHint) {
      this.flags.squirrelHint = true;
      setTimeout(() => G.scene === 'play' && G.hud.toast('松鼠信差也跑來了！找牠就能在去過的營地之間傳送，隨時回森林看看大家', '#ffd35a'), 2500);
    }
    return out;
  };

  // ── 舊存檔的轉換（終章節奏 v1.5）──
  //   五轉技能改成各 1 級：多的點數由 save.js 的 clean 退回；五轉多送的 1 點補給已經五轉的存檔（每一頁都補）。
  //   已經拿到雲鬃傳承的存檔：灰鬃的帶路（q78、q79）直接算完成，營地的封印照常。
  //   已經在做的營地委託：目標換了，收集類重新對一次身上的材料；擊殺類保留進度（不超過需要的數量）。
  function migrate() {
    const F = W.flags;
    const S = G.quests.state;
    const p = P();
    const Q = G.data.quests;
    if (S.q75 === 'done') F.apexBlessing = true;
    if (F.apexBlessing || F.timeItselfDefeated) ['q78', 'q79'].forEach((id) => { if (S[id] !== 'done') S[id] = 'done'; });
    if (G.data.forms[p.form] && G.data.forms[p.form].apex && !F.apexSP2) {
      F.apexSP2 = true;
      G.formSwitch.addSP(p, Math.max(0, (G.data.balance.apexSP || 1) - 1));
    }
    for (const id of ['q70', 'q71', 'q72', 'q73', 'q74', 'q75', 'q76', 'q80']) {
      if (!Q[id] || (S[id] !== 'active' && S[id] !== 'ready')) continue;
      G.quests.progress[id] = Math.min(Q[id].count, G.quests.progress[id] || 0);
      if (S[id] === 'ready' && G.quests.progress[id] < Q[id].count) S[id] = 'active';
    }
    G.quests.recount();
  }
  const baseApply = G.save.apply;
  G.save.apply = function () {
    const out = baseApply.apply(this, arguments);
    migrate();
    return out;
  };
  G.pacing = { migrate };
})();
