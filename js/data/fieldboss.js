// 野外魔王（v1.2）：每章一隻，在該章最後一張狩獵地圖定時出現的魔化巨獸。規格：docs/SPEC-fieldboss.md
// 必須在 js/data/mobs45.js 之後、js/data/progression.js 之前載入。
// 出現、招式、血條、掉落、冷卻：js/game/fieldboss.js（能力掛在 G.mobAbil）。
// 數值：攻擊 1.3 倍；血量原訂約一般怪 25 倍，但實測同等級玩家 7～19 秒就打完，
// 所以依章節調成 50～130 倍（後期玩家的範圍技成長快），讓不閃招的站樁打法約 35～45 秒、正常邊閃邊打約 40～70 秒。
// 經驗、金幣、必掉的裝備與藥水在 js/game/fieldboss.js 發放
// （這裡的 drops 只留空殼，progression.js 的一般怪掉落調整不會影響它們）。
(function () {
  'use strict';
  const M = G.data.monsters;
  const add = (id, o) => {
    M[id] = Object.assign({ fieldBoss: true, band: true, behavior: 'aggressive', sight: 900, hpMul: 25, atkMul: 1.3, drops: {} }, o);
  };

  add('fb_shroom', { hpMul: 50, name: '苔冠蛙王', lv: 12, art: 'fb_shroom', map: '1-4', abilities: ['fbShroom'], speed: 55, w: 240, h: 190, fallback: ['mushroom', 2] });
  add('fb_kraken', { hpMul: 55, name: '沉船海魔', lv: 25, art: 'fb_kraken', map: '2-4', abilities: ['fbKraken'], speed: 45, w: 240, h: 170, fallback: ['bulbjelly', 0] });
  add('fb_balrog', { hpMul: 65, name: '赤焰炎魔', lv: 37, art: 'fb_balrog', map: '3-4', abilities: ['fbBalrog'], speed: 60, w: 230, h: 260, fallback: ['potgoat', 0] });
  add('fb_zakum', { hpMul: 100, name: '千手冰像', lv: 49, art: 'fb_zakum', map: '4-4', abilities: ['fbZakum'], speed: 0, w: 260, h: 300, fallback: ['shieldbear', 0] });
  add('fb_voiddragon', { hpMul: 130, name: '星蝕魔龍', lv: 59, art: 'fb_voiddragon', map: '5-4', abilities: ['fbVoid'], speed: 50, w: 300, h: 220, fallback: ['constellfish', 0] });

  // 地圖 → 魔王（js/game/fieldboss.js 用）
  G.data.fieldBosses = { '1-4': 'fb_shroom', '2-4': 'fb_kraken', '3-4': 'fb_balrog', '4-4': 'fb_zakum', '5-4': 'fb_voiddragon' };
})();
