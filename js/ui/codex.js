// 圖鑑：用過的形態、打倒過的怪物才會記下來；其他都是黑色剪影。
(function () {
  'use strict';

  const X = (G.codex = {
    data() {
      const f = G.world.flags;
      if (!f.codex) f.codex = { forms: {}, mobs: {} };
      return f.codex;
    },

    note(kind, id) {
      if (!id || (G.demo && G.demo.active) || G.scene !== 'play') return;
      const d = this.data();
      if (d[kind][id]) return;
      d[kind][id] = 1;
      // 第一次記下來時提醒一下（小獅子本來就認得自己）
      if (id !== 'base') {
        const name = kind === 'forms' ? G.data.forms[id] && G.data.forms[id].name : G.data.monsters[id] && G.data.monsters[id].name;
        if (name) G.hud.toast('圖鑑新增：' + name, '#9fd0ff');
      }
    },

    known() {
      return this.data();
    },

    // 圖鑑上會出現的全部項目
    counts() {
      const d = this.data();
      const forms = Object.keys(G.data.forms);
      const mobs = ['dewsnail', 'mosssnail', 'woodsnail', 'capshroom', 'spotshroom', 'lampshroom', 'seedling', 'sproutling', 'flowerling',
        'postcrab', 'bulbjelly', 'umbrellagull', 'alarmurchin', 'kiteray', 'blockcoral', 'stampstar', 'accordioneel', 'musicturtle',
        'matchlizard', 'angerrock', 'magnetdillo', 'candlesnake', 'weightbeetle', 'bellowsbat', 'potgoat', 'moodchameleon', 'mapvulture',
        'echoferret', 'crystalowl', 'avalanchehare', 'drumyak', 'shadowwolf', 'dreamsheep', 'silencefox', 'heartcedar', 'shieldbear',
        'hourowl', 'mirrordeer', 'stopmoth', 'ouroboros', 'clocksnail', 'pouchroo', 'gravjelly', 'parallelfox', 'constellfish',
        'queenShroom', 'hermitCrab', 'lavaTortoise', 'frostSpirit', 'timeItself',
        'fb_shroom', 'fb_kraken', 'fb_balrog', 'fb_zakum', 'fb_voiddragon'].filter((id) => G.data.monsters[id]);
      return {
        forms: forms.filter((id) => d.forms[id]).length,
        formsAll: forms.length,
        mobs: mobs.filter((id) => d.mobs[id]).length,
        mobsAll: mobs.length,
      };
    },
  });

  G.ui.r_codex = function () {
    const c = X.counts();
    return this.frame('圖鑑', '<div class="codex-sum">形態 <b>' + c.forms + ' / ' + c.formsAll + '</b>　·　怪物 <b>' + c.mobs + ' / ' + c.mobsAll + '</b>　<span>用過的形態、打倒過的怪物才會現身</span></div>' +
      '<div class="gallery-wrap"><canvas class="gallery-canvas codex-canvas" width="' + G.gallery.W + '" height="' + G.gallery.H + '"></canvas></div>', 'gallery');
  };
})();
