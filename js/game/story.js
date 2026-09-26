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
      G.hud.toast('獲得「' + d.name + '」！星楓葉 ' + this.count() + '/5　HP、攻擊永久 +' + Math.round(this.BONUS * 100) + '%', '#ffe066');
      G.fx.pillar(P.x, P.y, 'rgba(255,230,120,0.95)', 1.6, 110);
      G.audio.play('victory');
      P.recalc();
      if (this.count() >= 5) G.world.flags.allLeaves = true;
      G.save.write();
    },

    mult() {
      return 1 + this.count() * this.BONUS;
    },
  });
  S.U = G.util;
})();
