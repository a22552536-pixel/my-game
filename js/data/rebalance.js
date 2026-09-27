// 節奏 v1.3（使用者定案）：每章 Boss 打完剛好進化一次，五轉在終章中段由雲鬃傳承。
//   等級帶：第一章 1–10、第二章 10–20、第三章 20–30、第四章 30–40、終章 40–50（五轉 Lv45）。
//   舊的等級帶是 12／25／37／50／60，這裡把所有怪物、Boss、野外魔王、委託、裝備的等級按比例搬到新的等級帶，
//   寫死數值的 Boss（血量、攻擊、防禦）跟著等級一起縮放；委託與 Boss 的經驗依新的等級帶重算。
// 必須在所有資料檔（含 npcstory45.js）之後載入。進化條件與 Boss 的經驗補足在 js/game/pacing.js。
(function () {
  'use strict';
  const D = G.data;
  const B = D.balance;
  const OLD = [1, 12, 25, 37, 50, 60];
  const NEW = [1, 10, 20, 30, 40, 50];
  const lerp = (from, to, x) => {
    if (x <= from[0]) return to[0];
    for (let i = 1; i < from.length; i++) {
      if (x <= from[i]) return to[i - 1] + ((x - from[i - 1]) * (to[i] - to[i - 1])) / (from[i] - from[i - 1]);
    }
    return to[to.length - 1] + (x - from[from.length - 1]);
  };
  const f = (lv) => Math.max(1, Math.round(lerp(OLD, NEW, lv)));
  const finv = (lv) => lerp(NEW, OLD, lv);
  B.remapPacing = f;

  // 舊的等級帶所需經驗（委託經驗按比例換算用）
  const cum = [0];
  for (let l = 1; l <= 60; l++) cum[l] = cum[l - 1] + B.expToNext(l);
  const need = (band) => cum[band[1] - 1] - cum[Math.max(0, band[0] - 1)];
  const oldBands = B.bands;
  B.bands = { 1: [1, 10], 2: [10, 20], 3: [20, 30], 4: [30, 40], 5: [40, 50] };
  B.evolveLv = [10, 20, 30, 40, 45];
  B.levelCap = 50;

  // ── 怪物、Boss、野外魔王 ──
  for (const id in D.monsters) {
    const d = D.monsters[id];
    if (!d.lv) continue;
    const o = d.lv;
    const n = f(o);
    if (n === o) continue;
    if (d.hp) d.hp = Math.round(d.hp * (B.monsterHp(n) / B.monsterHp(o)));
    if (d.atk) d.atk = Math.round(d.atk * (B.monsterAtk(n) / B.monsterAtk(o)));
    if (d.def) d.def = Math.round((d.def * n) / o);
    d.lv = n;
  }
  // 第一章 Boss：使用者 Lv11 還打不到半血就倒 → 招式不變，傷害再低一些
  if (D.monsters.queenShroom) D.monsters.queenShroom.atk = Math.round(D.monsters.queenShroom.atk * 0.7);

  // ── 委託：需求等級、經驗（依新舊等級帶的比例）──
  for (const qid in D.quests) {
    const q = D.quests[qid];
    if (q.req && q.req.lv) q.req.lv = f(q.req.lv);
    const r = q.region;
    if (q.reward && q.reward.exp && oldBands[r] && B.bands[r]) q.reward.exp = Math.max(5, Math.round((q.reward.exp * need(B.bands[r])) / need(oldBands[r])));
  }
  // Boss 經驗：該章所需經驗的 10%
  const chapters = D.story.chapters;
  for (const r in chapters) {
    const b = D.monsters[chapters[r].boss];
    if (b && B.bands[r]) b.exp = Math.round(need(B.bands[r]) * B.bossShare);
  }

  // ── 裝備需求等級與掉落等級 ──
  for (const id in D.items.bases) D.items.bases[id].req = f(D.items.bases[id].req);
  for (const id in D.items.uniques) D.items.uniques[id].req = f(D.items.uniques[id].req);
  const tierOld = D.items.tierForLevel;
  D.items.tierForLevel = (lv) => tierOld(Math.round(finv(lv)));
})();
