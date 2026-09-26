// 主線進度：星楓葉的收集與加成。
(function () {
  'use strict';

  const S = (G.story = {
    // 每片葉子：HP、攻擊各 +4%
    BONUS: 0.04,

    leaves() {
      const f = G.world.flags;
      if (!f.leaves) f.leaves = {};
      if (f.starleaf1) f.leaves[1] = true; // 舊存檔
      return f.leaves;
    },

    hasLeaf(ch) {
      return !!this.leaves()[ch];
    },

    count() {
      return Object.keys(this.leaves()).length;
    },

    leafDef(ch) {
      return G.data.story.chapters[ch].leaf;
    },

    gainLeaf(ch) {
      const P = G.player;
      this.leaves()[ch] = true;
      G.world.flags.starleaf1 = true; // 進化條件沿用
      const d = this.leafDef(ch);
      G.hud.toast('獲得「' + d.name + '」！星楓葉 ' + this.count() + '/5', '#ffe066');
      setTimeout(() => G.hud.toast('葉子的力量：' + d.gift + '；HP、攻擊永久 +' + Math.round(this.BONUS * 100) + '%', '#d8ffb0'), 900);
      setTimeout(() => G.hud.toast('可以重新進入 Boss 房挑戰「回憶」', '#e0c8ff'), 1800);
      G.fx.pillar(P.x, P.y, 'rgba(255,230,120,0.95)', 1.6, 110);
      G.audio.play('victory');
      P.recalc();
      if (this.count() >= 5) G.world.flags.allLeaves = true;
      G.save.write();
    },

    mult() {
      return 1 + this.count() * this.BONUS;
    },

    // 每片葉子各自的能力（拿到那一章就生效，不用等到最後）
    hpRegenMult() { return this.hasLeaf(1) ? 2 : 1; },
    mpRegenMult() { return this.hasLeaf(2) ? 1.6 : 1; },
    critBonus() { return this.hasLeaf(3) ? 0.3 : 0; },
    guard() { return this.hasLeaf(4) ? 0.1 : 0; },
    goldCrit() { return this.hasLeaf(5); },

    // 獅子額頭的小葉子（依章節順序，沒拿到的留空）
    crownColors() {
      return [1, 2, 3, 4, 5].map((ch) => (this.hasLeaf(ch) ? this.leafDef(ch).color : null));
    },
  });
  S.U = G.util;
})();
