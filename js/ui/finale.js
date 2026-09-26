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
      if (this.finaleI > lines.length) {
        this.close('finale');
        G.world.flags.gameCleared = true;
        G.save.write();
        G.hud.toast('冒險還沒結束——世界裡的大家都還在，隨時回去看看他們吧', '#ffd35a');
        return 'keep';
      }
      G.audio.play('ui');
    },
    r_finale() {
      const lines = G.data.story.ending;
      const i = this.finaleI || 0;
      if (i >= lines.length) {
        const P = G.player;
        return '<div class="panel ending finale"><div class="body">' +
          '<img class="leaf" src="' + G.art.iconURL('starleaf', '#ffd35a') + '">' +
          '<div class="big">小獅子的冒險　完</div>' +
          '<div class="txt">謝謝你陪小獅子走完這一趟。<br>五片星楓葉、五座營地、一路上的每一個人。<br><br>沒有誰需要變成石頭。<br>一百年，很快的——但這一次，大家都在。</div>' +
          '<div class="dim">遊玩時間 ' + G.util.fmtTime(P.playTime) + ' · Lv.' + P.level + '</div>' +
          '<button class="primary" data-act="finaleNext">繼續冒險</button></div></div>';
      }
      return '<div class="panel ending finale"><div class="body">' +
        '<div class="dim">結局　' + (i + 1) + ' / ' + lines.length + '</div>' +
        '<div class="txt">' + esc(lines[i]) + '</div>' +
        '<button class="primary" data-act="finaleNext">' + (i === lines.length - 1 ? '……' : '下一頁') + '</button></div></div>';
    },
  });
})();
