// 技能等級上限：每一轉的技能「全部點滿」剛好 13 點。
// 升一級給 1 點、進化再給 3 點，所以兩轉之間正好拿得到 13 點——升到下一轉之前，這一轉的技能一定點得滿。
//   基本技能（飛撲、小吼）：各 5 級，Lv10 前點滿。
//   每一轉：被動 3 級；主動技分剩下的 10 點（2 招各 5 級，3 招是 4／3／3）。
//   五轉：冥道殘月破 7 級、地爆天星 6 級。
// 等級變少，但點滿時的效果跟原本 10 級一樣：把新的等級換算回原本的 1～10 級再算數值。
(function () {
  'use strict';
  const K = G.data.skills;
  const OLD_MAX = 10;
  // 刪掉沒特色、跟其他技能重疊的技能（每轉 13 點會自動分給剩下的技能；舊存檔退點）
  ['boulderRoll', 'maneSweep', 'flameBolt', 'featherThrow', 'shadowStep', 'bladeRain'].forEach((id) => delete K[id]);
  const caps = { pounce: 5, roar: 5, meidou: 7, chibaku: 6 };
  const byForm = {};
  for (const id in K) {
    const f = K[id].form;
    if (f === 'base' || f === 'apex') continue;
    (byForm[f] = byForm[f] || []).push(id);
  }
  for (const f in byForm) {
    const ids = byForm[f];
    const act = ids.filter((id) => K[id].type !== 'passive');
    ids.filter((id) => K[id].type === 'passive').forEach((id) => (caps[id] = 3));
    const budget = 13 - (ids.length - act.length) * 3;
    act.forEach((id, i) => (caps[id] = Math.floor(budget / act.length) + (i < budget % act.length ? 1 : 0)));
  }
  for (const id in caps) {
    const S = K[id];
    if (!S || S.maxLv === caps[id]) continue;
    const max = caps[id];
    const scale = (lv) => 1 + ((lv - 1) * (OLD_MAX - 1)) / (max - 1);
    for (const key in S) {
      const fn = S[key];
      if (typeof fn !== 'function') continue;
      S[key] = (lv, ...rest) => fn(typeof lv === 'number' ? scale(lv) : lv, ...rest);
    }
    S.maxLv = max;
  }
  G.data.skillCaps = caps;
})();
