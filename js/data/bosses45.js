// 第四章、終章的 Boss 數值（霜靈、時間）。在 bosses.js 之後載入。
// 邏輯在 js/game/boss3.js，美術在 js/art/bosses3.js。
//
// 數值從前三隻 Boss 外推（queenShroom Lv12 6800/42、hermitCrab Lv25 24000/105、lavaTortoise Lv37 58000/135）：
//   · 血量：玩家每秒輸出大約跟著等級帶成長，目標 90～120 秒（自動測試量到的時間見 boss3.js 開頭）。
//   · 攻擊：玩家回報偏難 → 攻擊只比甲龜高一點點（約怪物同級攻擊的 1.6～1.7 倍，前三隻是 1.75～2.2 倍），
//     預警時間也比前三隻長。
//   · 時間之戰有灰鬃幫忙（每 3 秒左右打一下，約佔總血量的 1 成），血量已經算進去。
// 經驗：progression.js 在這個檔案之前就算完了 Boss 經驗，所以這裡照同一條公式（該章等級帶所需經驗的 10%）自己算。
(function () {
  'use strict';
  const D = G.data;
  const B = D.balance;
  const M = D.monsters;

  function bossExp(r, fallback) {
    if (!B.bands || !B.bands[r] || !B.expToNext) return fallback;
    const cum = [0];
    for (let l = 1; l <= 60; l++) cum[l] = cum[l - 1] + B.expToNext(l);
    const band = B.bands[r];
    return Math.round((cum[band[1] - 1] - cum[Math.max(0, band[0] - 2)]) * (B.bossShare || 0.1));
  }

  // 第四章 Lv50（玩家：四轉、七階裝備、大紅漿果）
  M.frostSpirit = {
    name: '霜靈', lv: 50, art: 'frostSpirit', boss: true,
    w: 290, h: 300, hp: 135000, atk: 148, def: 34, exp: bossExp(4, 5400), speed: 140,
    furyAt: 180,
    drops: { gold: [1600, 2200] },
  };
  // 終章 Lv60（玩家：五轉、八階裝備；灰鬃是盟友）
  M.timeItself = {
    name: '時間', lv: 60, art: 'timeItself', boss: true,
    w: 300, h: 380, hp: 290000, atk: 165, def: 40, exp: bossExp(5, 6500), speed: 120,
    furyAt: 190,
    drops: { gold: [2400, 3200] },
  };
})();
