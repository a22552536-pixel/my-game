// 五轉「星楓獅王」的兩招。三條路線的技能頁都能用。
//   冥道殘月破（群體）：射出一道月牙，張開成完全圓形的黑洞（裡面是星辰與銀河），把敵人吸進去連續傷害，最後闔上爆開。
//   地爆天星（單體）：黑色核心往前扔，把目標吸過來定住，接著 10 發黑閃，每一發都是一次重擊。
(function () {
  'use strict';
  const K = G.data.skills;
  const pct = (v) => Math.round(v * 100) + '%';
  const lin = (a, b) => (lv) => a + b * (lv - 1);
  const mpf = (a, step) => (lv) => a + Math.floor((lv - 1) / (step || 3));

  Object.assign(K, {
    meidou: {
      name: '冥道殘月破', form: 'apex', maxLv: 10, icon: 'meidou', type: 'meidou',
      mp: mpf(40), mult: lin(4.8, 0.24), tickMult: lin(1.8, 0.1), closeMult: lin(10.0, 0.6),
      travel: 380, radius: 210, open: 1.4, tick: 0.2, targets: 15, castTime: 0.95, cd: 10,
      desc: (lv) => '射出一道月牙（' + pct(4.8 + 0.24 * (lv - 1)) + '），停下後張開成圓形黑洞，把半徑 210 內最多 15 隻敵人吸進去，每 0.2 秒 ' + pct(1.8 + 0.1 * (lv - 1)) + '，闔上時再 ' + pct(10.0 + 0.6 * (lv - 1)) + '（冷卻 10 秒）',
    },
    chibaku: {
      name: '地爆天星', form: 'apex', maxLv: 10, icon: 'chibaku', type: 'chibaku',
      mp: mpf(45), mult: lin(4.8, 0.26), hits: 10, finalMult: lin(18.0, 1.0), radius: 650, castTime: 0.6, cd: 12,
      desc: (lv) => '把黑色核心往前扔，附近最強的 1 隻敵人被吸過去定住，接著 10 發黑閃：前 9 發各 ' + pct(4.8 + 0.26 * (lv - 1)) + '，最後一發 ' + pct(18.0 + 1.0 * (lv - 1)) + '（冷卻 12 秒）',
    },
  });
})();
