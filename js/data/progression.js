// 進度與經濟（v0.9）。在所有資料檔之後載入，統一調整：
//   章節等級帶：第一章 1–12、第二章 13–25、第三章 26–37、第四章 38–50、終章 50–60（進終章時剛好五轉）。
//   經驗：委託約佔每章所需的 55%、Boss 10%，其餘 35% 靠打怪（每章整體約 30 分鐘，委託之外大約多打 60 隻）。
//   沒有冷卻時間：所有招式只靠 MP 限制，難度交給怪物。
//   藥水：怪物很少掉，第二章起的委託不再送藥水 → 要去商店買。
//   裝備：怪物很少掉，一掉就是史詩以上；平常的裝備靠委託與商店。
(function () {
  'use strict';
  const D = G.data;
  const B = D.balance;

  B.bands = { 1: [1, 12], 2: [13, 25], 3: [26, 37], 4: [38, 50], 5: [50, 60] };
  B.questShare = 0.55;
  B.bossShare = 0.1;

  // 舊版第二、三章的等級（11–20、21–30）搬到新的等級帶
  const remap = (lv) => (lv >= 21 && lv <= 32 ? Math.round(26 + ((lv - 21) * 11) / 9) : lv >= 11 && lv <= 20 ? Math.round(13 + ((lv - 11) * 12) / 9) : lv);
  B.remapLv = remap;

  let cum = [0];
  for (let l = 1; l <= 60; l++) cum[l] = cum[l - 1] + B.expToNext(l);
  const bandNeed = (r) => cum[B.bands[r][1] - 1] - cum[Math.max(0, B.bands[r][0] - 2)];

  // ── 第二、三章換成新怪物（js/data/mobs23.js）：地圖、委託、材料、交換、對話裡的舊名字一起換掉 ──
  const MR = D.mobRemap || {};
  const TR = D.matRemap || {};
  const nameSwap = [];
  for (const o in MR) if (D.monsters[o] && D.monsters[MR[o]]) nameSwap.push([D.monsters[o].name, D.monsters[MR[o]].name]);
  for (const o in TR) if (D.items.materials[o] && D.newMaterials[TR[o]]) nameSwap.push([D.items.materials[o].name, D.newMaterials[TR[o]].name]);
  nameSwap.sort((a, b) => b[0].length - a[0].length);
  const swapText = (s) => nameSwap.reduce((acc, [a, b]) => acc.split(a).join(b), s);
  const deepSwap = (o, depth) => {
    if (!o || depth > 6) return;
    for (const k in o) {
      if (typeof o[k] === 'string') o[k] = swapText(o[k]);
      else if (typeof o[k] === 'object') deepSwap(o[k], depth + 1);
    }
  };
  for (const mid in D.maps) (D.maps[mid].mobs || []).concat(D.maps[mid].elites || []).forEach((g) => {
    if (MR[g.m]) g.m = MR[g.m];
  });
  for (const qid in D.quests) {
    const q = D.quests[qid];
    if (MR[q.target]) q.target = MR[q.target];
    if (TR[q.item]) q.item = TR[q.item];
    deepSwap(q, 0);
  }
  deepSwap(D.npcs, 0);
  if (D.story) deepSwap(D.story.regions, 0);
  for (const o in TR) delete D.items.materials[o];
  Object.assign(D.items.materials, D.newMaterials || {});
  (D.items.trades || []).forEach((t) => {
    const need = {};
    for (const k in t.need) need[TR[k] || k] = t.need[k];
    t.need = need;
  });
  for (const o in MR) delete D.monsters[o];

  // ── 怪物等級 ──
  for (const id in D.monsters) {
    const d = D.monsters[id];
    if (d.boss) continue;
    if (!d.band && d.lv >= 11 && d.lv <= 30) d.lv = remap(d.lv);
    // 一般怪不掉藥水（精英、變種怪才有機會）→ 藥水要去商店買
    if (d.drops && d.drops.potion) d.drops.potion = 0;
    if (d.drops && d.drops.equip) d.drops.equip = 0.004;
  }
  // Boss：等級對齊章節尾，血量、攻擊跟著等級放大
  const bossLv = { hermitCrab: 25, lavaTortoise: 37 };
  for (const id in bossLv) {
    const d = D.monsters[id];
    if (!d) continue;
    const k = B.monsterHp(bossLv[id]) / B.monsterHp(d.lv);
    d.hp = Math.round(d.hp * k);
    d.atk = Math.round(d.atk * (B.monsterAtk(bossLv[id]) / B.monsterAtk(d.lv)));
    d.lv = bossLv[id];
  }

  // ── 裝備需求等級 ──
  const reqMap = { 6: 7, 8: 8, 11: 13, 16: 19, 18: 22, 21: 26, 26: 32, 28: 34 };
  for (const id in D.items.bases) {
    const b = D.items.bases[id];
    if (reqMap[b.req]) b.req = reqMap[b.req];
  }
  if (D.items.uniques) for (const id in D.items.uniques) {
    const u = D.items.uniques[id];
    if (reqMap[u.req]) u.req = reqMap[u.req];
  }
  D.items.tierForLevel = (lv) => (lv >= 32 ? 6 : lv >= 26 ? 5 : lv >= 19 ? 4 : lv >= 13 ? 3 : lv >= 7 ? 2 : 1);
  // 怪物掉的裝備很少，但一掉就是好東西
  D.items.rarityTables.normal = { epic: 80, legendary: 20 };
  D.items.rarityTables.elite = { epic: 85, legendary: 15 };

  // ── 委託：需求等級、經驗、藥水獎勵 ──
  const npcRegion = {};
  for (const mid in D.maps) (D.maps[mid].npcs || []).forEach((n) => {
    if (!(n.id in npcRegion)) npcRegion[n.id] = D.maps[mid].region;
  });
  const sum = {};
  for (const qid in D.quests) {
    const q = D.quests[qid];
    const r = npcRegion[q.npc];
    q.region = r;
    if (q.req && q.req.lv >= 11) q.req.lv = remap(q.req.lv);
    if (r >= 2 && q.reward && q.reward.potions) delete q.reward.potions;
    if (q.reward && q.reward.exp) sum[r] = (sum[r] || 0) + q.reward.exp;
  }
  for (const qid in D.quests) {
    const q = D.quests[qid];
    const r = q.region;
    if (!q.reward || !q.reward.exp || !B.bands[r] || !sum[r]) continue;
    q.reward.exp = Math.max(5, Math.round((q.reward.exp / sum[r]) * bandNeed(r) * B.questShare));
  }
  // Boss 經驗
  const chapters = (D.story && D.story.chapters) || {};
  for (const r in chapters) {
    const b = D.monsters[chapters[r].boss];
    if (b && B.bands[r]) b.exp = Math.round(bandNeed(+r) * B.bossShare);
  }

  // ── 等級差懲罰（楓之谷式）──
  // 打怪：比怪高 3 級以上，經驗每級少 15%（最低 5%）；比怪低，最多多給 20%。
  B.expPenalty = (pl, ml) => {
    const d = pl - ml;
    if (d <= 2) return 1 + Math.min(0.2, Math.max(0, -d * 0.04));
    return Math.max(0.05, 1 - (d - 2) * 0.15);
  };
  // 委託：超過該章等級帶上限，每多 1 級少 20%（最低 10%）
  B.questExpMult = (pl, region) => {
    const band = B.bands[region];
    if (!band || pl <= band[1]) return 1;
    return Math.max(0.1, 1 - (pl - band[1]) * 0.2);
  };

  // ── 材料交換不再換藥水：改換力量橡實／硬殼果（戰鬥增益），藥水只在商店買 ──
  (D.items.trades || []).forEach((t) => {
    if (t.give && t.give.potion && /^(hp|mp)/.test(t.give.potion)) t.give.potion = /^hp/.test(t.give.potion) ? 'nut' : 'acorn';
  });

  // ── 商店的裝備：每個營地／補給站都賣當章的三件（爪套、鬃飾、護符），平常的裝備從這裡來 ──
  const shopTiers = { owl: [2], gull: [3], pelican: [4], capybara: [5], armadillo: [6] };
  const shopOf = (id) => (id === 'owl' ? D.items.shops.owl : D.items.moreShops[id]);
  for (const sid in shopTiers) {
    const list = shopOf(sid);
    if (!list) continue;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].type === 'equip') list.splice(i, 1);
    shopTiers[sid].forEach((t) => {
      ['claw', 'mane', 'charm'].forEach((slot) => {
        const base = D.items.bases[slot + t];
        if (!base) return;
        const fixed = {};
        for (const k in base.stats) fixed[k] = k === 'crit' ? Math.round(base.stats[k] * 1.15 * 1000) / 1000 : Math.round(base.stats[k] * 1.15);
        list.push({ type: 'equip', base: slot + t, rarity: 'rare', fixed, price: Math.round(110 * Math.pow(t, 1.55) / 10) * 10 });
      });
    });
  }

  // ── 裝備強化：+1～+5，一定成功，每級 +8% 基礎能力；費用很輕 ──
  B.enhanceMax = 5;
  B.enhancePct = 0.08;
  B.enhanceCost = (item) => 10 * (item.tier || 1) * ((item.plus || 0) + 1);

  // ── MP 消耗大幅降低：不要因為沒魔而卡住手感 ──
  for (const id in D.skills) {
    const S = D.skills[id];
    const mp = S.mp;
    if (typeof mp === 'function') S.mp = (lv) => Math.max(1, Math.round(mp(lv) * 0.4));
  }

  // ── 沒有冷卻時間 ──
  for (const id in D.skills) {
    const S = D.skills[id];
    delete S.cd;
    const desc = S.desc;
    if (typeof desc === 'function') S.desc = (lv) => desc(lv).replace(/，冷卻 [\d.]+ 秒/g, '').replace(/（冷卻 [\d.]+ 秒）/g, '');
  }
})();
