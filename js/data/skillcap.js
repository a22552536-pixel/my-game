// 技能等級上限（v1.3）：每一轉的技能「全部點滿」剛好 11 點。
// 升一級給 1 點、進化只送 1 點（拿來學新技能），所以一轉的技能要升到 Lv20（下一轉）才剛好點滿，以此類推。
//   基本技能（飛撲、小吼）：各 5 級（飛撲開局 1 級），Lv2～10 的 9 點剛好點滿。
//   每一轉：被動 3 級；主動技分剩下的 8 點（2 招各 4 級，3 招是 3／3／2）。
//   五轉（Lv45）：冥道殘月破 3 級、地爆天星 3 級，Lv50 點滿。
// 等級變少，但點滿時的效果跟原本 10 級一樣：把新的等級換算回原本的 1～10 級再算數值。
(function () {
  'use strict';
  const K = G.data.skills;
  const OLD_MAX = 10;
  // 刪掉沒特色、跟其他技能重疊的技能（每轉 13 點會自動分給剩下的技能；舊存檔退點）
  ['boulderRoll', 'maneSweep', 'flameBolt', 'featherThrow', 'shadowStep', 'bladeRain'].forEach((id) => delete K[id]);
  const caps = { pounce: 5, roar: 5, meidou: 3, chibaku: 3 };
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
    const budget = 11 - (ids.length - act.length) * 3;
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
