// 結局（v1.1）：終章的章節卡之後，一頁一頁播放結局，最後是感謝名單。之後可以繼續在世界裡自由冒險。
(function () {
  'use strict';
  const UI = G.ui;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const baseEnd = UI.r_m1end;

  Object.assign(UI, {
    r_m1end() {
      const html = baseEnd.call(this);
      if ((this.endChapter || 1) !== 5) return html;
      return html.replace('data-act="close">繼續冒險', 'data-act="finale">看結局');
    },
    a_finale() {
      this.close('m1end');
      this.finaleI = 0;
      this.open('finale');
      return 'keep';
    },
    a_finaleNext() {
      const lines = G.data.story.ending;
      this.finaleI = (this.finaleI || 0) + 1;
      // 第二頁「你把心葉放回樹上。時鐘又開始轉。」：停住的世界恢復顏色與聲音
      if (G.cut && G.cut.resumeClock) G.cut.resumeClock();
      // 最後一句之後直接回到遊戲：不打「完」、不道謝、不跳提示（在平淡中結束）
      if (this.finaleI >= lines.length) {
        this.close('finale');
        G.world.flags.gameCleared = true;
        G.save.write();
        return 'keep';
      }
      G.audio.play('ui');
    },
    r_finale() {
      const lines = G.data.story.ending;
      const i = this.finaleI || 0;
      return '<div class="panel ending finale"><div class="body">' +
        '<div class="dim">結局　' + (i + 1) + ' / ' + lines.length + '</div>' +
        '<div class="txt">' + esc(lines[i]) + '</div>' +
        '<button class="primary" data-act="finaleNext">' + (i === lines.length - 1 ? '……' : '下一頁') + '</button></div></div>';
    },
  });
})();
