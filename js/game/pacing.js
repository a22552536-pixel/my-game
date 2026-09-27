// 節奏 v1.3 的遊戲掛勾（資料在 js/data/rebalance.js）：
//   打倒章節 Boss 時，經驗不夠就用「星楓葉的祝福」補到剛好可以進化；
//   完成雲鬃的委託「通往哪裡的門」（q75）得到五轉的傳承；
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
      G.hud.toast('雲鬃把守葉獸的力量傳給了你——Lv45 就能進行五轉', '#ffe14a');
      if (G.evolve.canEvolve()) G.cut.pendingVoice = true;
      G.save.write();
    }
    return res;
  };

  const baseLoad = W.load;
  W.load = function (mapId, entry) {
    const out = baseLoad.apply(this, arguments);
    const map = this.map;
    if (map && map.type === 'camp' && map.region === 2 && !this.flags.squirrelHint) {
      this.flags.squirrelHint = true;
      setTimeout(() => G.scene === 'play' && G.hud.toast('松鼠信差也跑來了！找牠就能在去過的營地之間傳送，隨時回森林看看大家', '#ffd35a'), 2500);
    }
    return out;
  };
})();
