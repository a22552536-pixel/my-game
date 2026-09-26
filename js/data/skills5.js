// 五轉「星楓獅王」的兩招。三條路線的技能頁都能用。
//   冥道殘月破（群體）：斬出一道黑色殘月飛出去，張開成吞噬一切的冥道，把敵人吸進去連續削，最後闔上爆開。
//   地爆天星（單體）：丟出一顆黑色核心吸住目標，四周的岩石飛過去把牠封成石球，接著連續 8 發大黑閃，最後整顆炸開。
(function () {
  'use strict';
  const K = G.data.skills;
  const pct = (v) => Math.round(v * 100) + '%';
  const lin = (a, b) => (lv) => a + b * (lv - 1);
  const mpf = (a, step) => (lv) => a + Math.floor((lv - 1) / (step || 3));

  Object.assign(K, {
    meidou: {
      name: '冥道殘月破', form: 'apex', maxLv: 10, icon: 'meidou', type: 'meidou',
      mp: mpf(40), mult: lin(2.4, 0.12), tickMult: lin(0.9, 0.05), closeMult: lin(5.0, 0.3),
      travel: 380, radius: 210, open: 1.4, tick: 0.2, targets: 15, castTime: 0.95, cd: 10,
      desc: (lv) => '斬出一道黑色殘月往前飛（' + pct(2.4 + 0.12 * (lv - 1)) + '），停下後張開成冥道，把半徑 210 內最多 15 隻敵人吸進去，每 0.2 秒 ' + pct(0.9 + 0.05 * (lv - 1)) + '，闔上時再 ' + pct(5.0 + 0.3 * (lv - 1)) + '（冷卻 10 秒）',
    },
    chibaku: {
      name: '地爆天星', form: 'apex', maxLv: 10, icon: 'chibaku', type: 'chibaku',
      mp: mpf(45), mult: lin(2.6, 0.14), hits: 8, finalMult: lin(12.0, 0.7), radius: 650, castTime: 0.6, cd: 12,
      desc: (lv) => '丟出黑色核心吸住附近最強的 1 隻敵人，四周岩石飛過去把牠封成石球，連續 8 發大黑閃各 ' + pct(2.6 + 0.14 * (lv - 1)) + '，最後整顆炸開 ' + pct(12.0 + 0.7 * (lv - 1)) + '（冷卻 12 秒）',
    },
  });
})();
