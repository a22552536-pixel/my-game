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

  // ── 越後面的章節，一般怪越大（整體縮放，碰撞框與血條跟著變）──
  const sizeFor = (lv) => (lv <= 10 ? 1 : lv <= 20 ? 1.1 : lv <= 30 ? 1.2 : lv <= 40 ? 1.32 : 1.45);
  for (const id in D.monsters) {
    const d = D.monsters[id];
    if (!d.lv || d.boss || d.fieldBoss) continue;
    d.sizeMul = sizeFor(d.lv);
  }
  // 本來就是大型生物的，再個別放大
  const bigBody = { avalanchehare: 1.22, crystalowl: 1.18, musicturtle: 1.3, dreamsheep: 1.1, pouchroo: 1.3, drumyak: 1.2, heartcedar: 1.15, mirrordeer: 1.15, shieldbear: 1.1 };
  for (const id in bigBody) if (D.monsters[id]) D.monsters[id].sizeMul = (D.monsters[id].sizeMul || 1) * bigBody[id];
  // ── 越後面的章節，地圖上的怪越多（緩緩加密）──
  const densityFor = { 1: 1, 2: 1.15, 3: 1.3, 4: 1.45, 5: 1.6 };
  // 以第一章同位置的地圖（1-2、1-3、1-4）為基準，總數乘上倍率，多出來的平均分給各組
  const total = (m) => (m.mobs || []).reduce((t, g) => t + g.n, 0);
  for (const mid in D.maps) {
    const map = D.maps[mid];
    const k = densityFor[map.region] || 1;
    const base = D.maps['1-' + mid.split('-')[1]];
    if (k === 1 || !base || map.type === 'boss' || map.type === 'camp' || !(map.mobs || []).length) continue;
    const target = Math.round(total(base) * k);
    for (let i = 0; total(map) < target; i = (i + 1) % map.mobs.length) map.mobs[i].n++;
  }

  // ── 野外魔王要比章節 Boss 弱很多：血量約該章 Boss 的 30%、攻擊跟一般怪同級 ──
  for (const mid in D.fieldBosses || {}) {
    const fb = D.monsters[D.fieldBosses[mid]];
    const region = D.maps[mid] && D.maps[mid].region;
    const boss = region && D.monsters[D.story.chapters[region].boss];
    if (!fb || !boss || !boss.hp) continue;
    fb.hpMul = Math.max(8, (boss.hp * 0.3) / B.monsterHp(fb.lv));
    fb.atkMul = 1.0;
  }
  // 改版前（v1.3）的野外魔王數值：章節 Boss（霜靈、時間）召喚出來的野外魔王照舊用這一組（js/game/fieldboss.js legacyStats）
  for (const mid in D.fieldBosses || {}) {
    const fb = D.monsters[D.fieldBosses[mid]];
    if (fb) fb.base = { hpMul: fb.hpMul, atkMul: fb.atkMul || 1, touchK: fb.touchK };
  }

  // ── 章節傷害倍率（使用者回饋：第三章 HP 已經破千，小怪的傷害還跟第一章差不多）──
  //   玩家最大 HP 隨等級＋進化＋裝備＋星楓葉成長得比 monsterAtk（3 + 1.75·lv）快：改版前小怪一下只佔最大 HP 的
  //   第一章 4%、第二章 3.2%、第三章 3.7%、第四章 2.5%、終章 2.3%（三條路線平均、當章商店稀有裝 +2；aggro/hp2.js）。
  //   目標：一下約 8～12%（第一章新手區不動）。但小怪不能比該章 Boss 還痛：倍率上限＝「站在 Boss 等級的小怪，身體碰撞剛好等於
  //   Boss 的基本一擊（atk ×1.0；Boss 的重招是 ×1.45～1.6、第二階段再 ×1.25）」＝ boss.atk ÷ monsterAtk(boss.lv)。
  //   CH_ATK 是想要的倍率，實際 = min(CH_ATK, 上限)：第一章 1.27（Lv5 以上；Lv1～4 的新手區怪維持 1）、第二章 2.14、第三章 2.0、
  //   第四章 1.63、終章 1.54（第四章、終章被 Boss 的攻擊力卡住）。
  //   倍率記在 d.chAtk，由 monster.js 乘上去；章節 Boss 地圖裡召喚出來的小怪不乘（章節 Boss 戰的難度維持原樣）。
  const CH_ATK = { 1: 1.65, 2: 2.15, 3: 2.2, 4: 3.0, 5: 3.5 };
  const chapterOfLv = (lv) => (lv <= 10 ? 1 : lv <= 20 ? 2 : lv <= 30 ? 3 : lv <= 40 ? 4 : 5);
  const chCap = {};
  for (const r in CH_ATK) {
    const boss = D.monsters[D.story.chapters[r].boss];
    chCap[r] = boss && boss.atk ? Math.min(CH_ATK[r], boss.atk / B.monsterAtk(boss.lv)) : 1;
  }
  B.chapterAtk = chCap;
  for (const id in D.monsters) {
    const d = D.monsters[id];
    if (!d.lv || d.boss || d.fieldBoss) continue;
    const r = chapterOfLv(d.lv);
    const boss = D.monsters[D.story.chapters[r].boss];
    // 本來就比較痛的怪（atkMul > 1）另外壓一次：就算站在 Boss 的等級，身體碰撞也不超過 Boss 的基本一擊
    const cap = boss && boss.atk ? boss.atk / (B.monsterAtk(boss.lv) * Math.max(1, d.atkMul || 1)) : chCap[r];
    d.chAtk = d.lv <= 4 ? 1 : Math.max(1, Math.round(Math.min(chCap[r], cap) * 100) / 100);
  }
  // ── 章節血量倍率（使用者回饋：一進第四章，千斤錘一下就沒有怪活得下來）──
  //   技能倍率跟著轉數長得比 monsterHp 快（又沒有冷卻）：改版前，典型等級的玩家（三條路線、當章商店稀有裝 +2、技能 Lv5）
  //   用當章的中階單體技（取三條路線的中位數：第二章 重爪、第三章 冰霜長槍、第四章 千斤錘、終章 獅王連斬）打一隻一般怪，
  //   第一章 1.3 下、第二章 1.2、第三章 1.3、第四章 0.5、終章 0.4（aggro/htk.js）。
  //   目標：第一章 2 下、第二三章 3 下、第四章與終章 4 下 → 倍率 1.55／2.45／2.3／7.7／9.3（Lv1～4 的新手區怪維持 1）。
  //   普通攻擊（×1.0）因此要 5／10／13／39／47 下：後期主要靠技能，MP 與藥水變成真正的資源。
  //   倍率記在 d.chHp，由 monster.js 乘上去；章節 Boss 地圖裡召喚出來的小怪不乘（章節 Boss 戰維持原樣）。
  const CH_HP = { 1: 1.55, 2: 2.45, 3: 2.3, 4: 7.7, 5: 9.3 };
  const CH_HITS = { 1: 2, 2: 3, 3: 3, 4: 4, 5: 4 };
  B.chapterHp = CH_HP;
  for (const id in D.monsters) {
    const d = D.monsters[id];
    if (!d.lv || d.boss || d.fieldBoss) continue;
    d.chHp = d.lv <= 4 ? 1 : CH_HP[chapterOfLv(d.lv)];
  }
  // 野外魔王的血量：約 30 次中階技能（實戰邊閃邊打，約 60～90 秒）＝ 所在地圖小怪平均血量 × 30 ÷ 該章目標下數；不低於原本。
  const FB_CASTS = 30;
  for (const mid in D.fieldBosses || {}) {
    const fb = D.monsters[D.fieldBosses[mid]];
    const map = D.maps[mid];
    const region = map && map.region;
    if (!fb || !region) continue;
    const ids = (map.mobs || []).map((g) => g.m).filter((id) => D.monsters[id]);
    if (!ids.length) continue;
    const avgHp = ids.reduce((t, id) => t + B.monsterHp(D.monsters[id].lv) * (D.monsters[id].hpMul || 1) * (D.monsters[id].chHp || 1), 0) / ids.length;
    fb.hpMul = Math.max(fb.hpMul || 1, (avgHp * FB_CASTS) / CH_HITS[region] / B.monsterHp(fb.lv));
  }
  // 野外魔王（第二章起）：有預警的招式（atk × skillK 1.5）≈ 所在地圖小怪一下的 1.5 倍，
  // 但不超過該章 Boss 的基本一擊（atk × skillK ≤ boss.atk），也不低於原本的攻擊力。
  for (const mid in D.fieldBosses || {}) {
    const fb = D.monsters[D.fieldBosses[mid]];
    const map = D.maps[mid];
    const region = map && map.region;
    const boss = region && D.monsters[D.story.chapters[region].boss];
    if (!fb || !boss || region < 2) continue;
    const ids = (map.mobs || []).map((g) => g.m).filter((id) => D.monsters[id]);
    if (!ids.length) continue;
    const avg = ids.reduce((t, id) => t + B.monsterAtk(D.monsters[id].lv) * (D.monsters[id].atkMul || 1) * (D.monsters[id].chAtk || 1), 0) / ids.length;
    const sk = fb.skillK || 1.5;
    const cur = B.monsterAtk(fb.lv) * (fb.atkMul || 1);
    const want = Math.max(cur, Math.min((avg * 1.5) / sk, boss.atk / sk));
    fb.atkMul = want / B.monsterAtk(fb.lv);
    // 身體碰撞 0.5 → 1.0 倍（≈ 該章 Boss 基本一擊的 2/3）：原本高防禦時只剩個位數
    fb.touchK = Math.max(fb.touchK || 0.5, 1.0);
  }
  // 第一章的苔冠鱷王：原本身體碰撞只有 0.5 倍，比路上的小怪還不痛。
  // 改成：攻擊力 ≈ 1-4 小怪平均的 1.5 倍（但不超過菇菇女王），碰撞吃滿攻擊力；
  // 有預警的招式不再額外乘 1.5，最重的一招（1.4 倍）也打不贏女王最重的一下。
  (function () {
    const fb = D.monsters.fb_shroom;
    const queen = D.monsters.queenShroom;
    const map = D.maps['1-4'];
    if (!fb || !queen || !map) return;
    const ids = (map.mobs || []).map((g) => g.m).filter((id) => D.monsters[id]);
    if (!ids.length) return;
    const avg = ids.reduce((t, id) => t + B.monsterAtk(D.monsters[id].lv) * (D.monsters[id].atkMul || 1) * (D.monsters[id].chAtk || 1), 0) / ids.length;
    const want = Math.min(avg * 1.5, (queen.atk || B.monsterAtk(queen.lv)) * 0.95);
    fb.atkMul = want / B.monsterAtk(fb.lv);
    fb.touchK = 1.0;
    fb.skillK = 1.0;
    // 改版前的算法（小怪沒有章節倍率）：章節 Boss 召喚的苔冠鱷王照舊用這個
    const avg0 = ids.reduce((t, id) => t + B.monsterAtk(D.monsters[id].lv) * (D.monsters[id].atkMul || 1), 0) / ids.length;
    if (fb.base) Object.assign(fb.base, { atkMul: Math.min(avg0 * 1.5, (queen.atk || B.monsterAtk(queen.lv)) * 0.95) / B.monsterAtk(fb.lv), touchK: 1.0 });
  })();

  // ── 每章一個委託改成「討伐野外魔王」（發委託的 NPC 在該章營地，先接委託才會遇到魔王）──
  const FBQ = {
    q24: ['fb_shroom', '苔冠鱷王', '根洞下面的積水潭，是我挖礦的路。\n苔冠鱷王趴在那裡，工具全被拖下水。\n我的爪子只會挖土。幫我打倒牠。', '嘴巴越張越開，就是要噴毒霧了。', '積水潭安靜了。金葉跟硬殼果收好。'],
    q36: ['fb_kraken', '沉船海魔', '潮退得太遠，沉船海魔爬上了礁岩。\n補給船一出港，就被牠拖下海。\n各營地的藥和糧都在船上。打倒牠。', '地上發亮的地方，觸手要冒出來了。', '補給線保住了。漿果算我請你。'],
    q57: ['fb_balrog', '熔岩河的炎魔', '我的礦坑，就在熔岩河床上。\n河床醒了一頭炎魔，燒掉了兩座坑。\n谷裡的鍋和鎬都靠這座礦。打倒牠。', '牠飛上天，就是要俯衝了。看警示線。', '河床的岩漿，退了一截。'],
    q64: ['fb_zakum', '千手冰像', '參道深處那座冰像，前幾天醒了。\n上山的旅人被打傷，全抬到我這裡。\n藥不夠用了。去把冰像打倒吧。', '看紅圈和紅線，手掌會從四面八方打過來。', '冰像睡了。旅人可以上山了。'],
    // 終章節奏 v1.5：q76 是時之王座的最後一道封印（見檔尾「終章節奏」）
    q76: ['fb_voiddragon', '吞星的龍', '最後一道封印，是天上的星星排成的。\n星蝕魔龍把星星吞了，封印解不開。\n去星之階梯，把那條龍打倒。', '別硬撐黑洞球，先跑開。', '五道封印都開了。王座的門打開了。'],
  };
  for (const qid in FBQ) {
    const q = D.quests[qid];
    const [fbId, name, offer, progress, done] = FBQ[qid];
    const fb = D.monsters[fbId];
    if (!q || !fb) continue;
    q.name = name;
    q.type = 'kill';
    q.target = fbId;
    q.count = 1;
    delete q.item;
    q.req = Object.assign({}, q.req, { lv: Math.max(1, fb.lv - 1) });
    q.lines = Object.assign({}, q.lines, { offer, progress, done });
  }

  // ── 委託：需求等級、經驗（依新舊等級帶的比例）──
  for (const qid in D.quests) {
    const q = D.quests[qid];
    if (q.req && q.req.lv && !FBQ[qid]) q.req.lv = f(q.req.lv);
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

  // ── 剛到新章節的營地就有事做：比上一章 Boss 低一級（約 9／19／29／39）就能接營地的前兩個委託，
  //    接著一兩級再開下一個，不用先在野外空打怪升級 ──
  const ARRIVE = { q30: 9, q31: 9, q32: 10, q33: 12, q50: 19, q51: 19, q52: 20, q53: 22, q60: 29, q61: 29, q62: 31, q70: 39, q71: 39, q72: 41 };
  for (const qid in ARRIVE) {
    const q = D.quests[qid];
    if (q && q.req) q.req.lv = Math.min(q.req.lv || 99, ARRIVE[qid]);
  }

  // ── 節奏 v1.4（使用者回饋：打完寄居蟹 Lv23、打完熔岩甲龜 Lv34；應該剛好 20、30 左右）──
  //   模擬（aggro/sim.js）：做完該章 Boss 前的委託＋委託要的擊殺＋額外擊殺（委託擊殺數 ×1.5）＋野外魔王打兩次，
  //   改版前打完 Boss 是 Lv11.6／22.7／33.0／43.2（和使用者的 23、34 吻合）。抵達 Boss 時其實只高 0.5～1.5 級（委託的需求等級把進度卡住），
  //   多出來的主要是：打完 Boss 的 Boss 經驗＋主線 Boss 委託經驗（約 +2 級）、野外魔王（一隻 25 倍一般怪），而且每章往下一章累積。
  //   星楓葉的祝福（js/game/pacing.js）本來就會把不足的補到該章上限（10／20／30／40），所以：
  //   章節 Boss 經驗 ×0.2、主線 Boss 委託（q4／q35／q56／q67／q77）經驗 ×0.1；野外魔王的經驗 25 → 10 倍一般怪（js/game/fieldboss.js）。
  //   結果（同一個模型）：打完 Boss 是 Lv10.2／20.6／30.7／40.9（打得少一點的玩家：10.1／20.5／30.6／40.4），抵達 Boss 時 Lv10／20.3／30.4／40.6。
  const PACE_BOSS_EXP = 0.2;
  const PACE_MAIN_QUEST = 0.1;
  for (const r in chapters) {
    const b = D.monsters[chapters[r].boss];
    if (b && b.exp) b.exp = Math.max(1, Math.round(b.exp * PACE_BOSS_EXP));
  }
  for (const qid in D.quests) {
    const q = D.quests[qid];
    if (q.type === 'boss' && q.reward && q.reward.exp) q.reward.exp = Math.max(5, Math.round(q.reward.exp * PACE_MAIN_QUEST));
  }

  // ── 經濟 v1.4（使用者回饋：第三章打完身上有 35,000 金葉，沒地方花）──
  //   收入模擬（aggro/gold.js，擊殺數用 sim.js 的模型）：第一～三章約 4.4k／14.4k／25.1k，累計 44k；
  //   一般花費（每一級商店裝買兩件、藥水、強化到 +3）到第三章底約 14.6k → 身上剩 ~29k，跟使用者的 35k 同一個量級。
  //   收入：一般怪掉的金葉 第一章 ×0.7、第二章起 ×0.5；材料賣價 ×0.7；委託金葉 ×0.8；
  //         寶箱 randi(60,120)·r² → randi(40,80)·r(r+1)/2（js/game/loot.js）；野外魔王 等級×(1～1.8)×20 → ×12（js/game/fieldboss.js）。
  //   花費：強化上限 +5 → +10，+6 起每級費用大幅上升（一件第六級裝備 +6～+10 共約 4 萬）；
  //         各章營地商店賣「神祕裝備箱」（當章等級、稀有以上，G.loot.randomEquip(等級, 'chest')）：1,500／4,000／9,000／18,000／30,000。
  //   結果：第三章底收入累計約 26k，扣掉一般花費剩 ~11k（目標 8～12k）；多的錢可以買裝備箱、強化 +6 以上。
  const GOLD_K = { 1: 0.7, 2: 0.5, 3: 0.5, 4: 0.5, 5: 0.5 };
  for (const id in D.monsters) {
    const d = D.monsters[id];
    if (!d.lv || d.boss || d.fieldBoss || !d.drops || !d.drops.gold) continue;
    const k = GOLD_K[chapterOfLv(d.lv)];
    d.drops.gold = d.drops.gold.map((g) => Math.max(1, Math.round(g * k)));
  }
  for (const k in D.items.materials) {
    const m = D.items.materials[k];
    if (m.price) m.price = Math.max(1, Math.round(m.price * 0.7));
  }
  for (const qid in D.quests) {
    const q = D.quests[qid];
    if (q.reward && q.reward.gold) q.reward.gold = Math.round((q.reward.gold * 0.8) / 10) * 10;
  }
  D.items.chestGold = (r) => 60 * ((r * (r + 1)) / 2); // 平均值（寶箱實際是 randi(40,80)·r(r+1)/2）
  B.fbGoldK = 12;
  // 強化 +1～+5 照舊（10 × 等級 ×（目前 +N + 1）），+6 起：60 × 等級 ×（N + 1）× 1.5^(N − 5)
  B.enhanceMax = 10;
  B.enhanceCost = (item) => {
    const t = item.tier || 1;
    const n = item.plus || 0;
    if (n < 5) return 10 * t * (n + 1);
    return Math.round((60 * t * (n + 1) * Math.pow(1.5, n - 5)) / 10) * 10;
  };
  // 神祕裝備箱：各章營地商店
  const BOX = { owl: [1, 8, 1500], gull: [2, 18, 4000], capybara: [3, 28, 9000], yakelder: [4, 38, 18000], sphinxcat: [5, 48, 30000] };
  for (const sid in BOX) {
    const list = sid === 'owl' ? D.items.shops.owl : D.items.moreShops[sid];
    if (!list || list.some((g) => g.type === 'box')) continue;
    const [r, lv, price] = BOX[sid];
    list.push({ type: 'box', level: lv, table: 'chest', price, name: '神祕裝備箱', desc: '第' + ['', '一', '二', '三', '四', '五'][r] + '章等級的隨機裝備（稀有以上）' });
  }

  // ── 終章節奏 v1.5（使用者定案）：前半跟灰鬃去找雲鬃、五轉；後半回營地解開時之王座的封印 ──
  //   抵達（約 Lv40）→ 灰鬃 q78（到回憶迴廊）→ q79（到倒轉庭園）→ 雲鬃 q74、q80（可同時接）→ q75 → 雲鬃的傳承、五轉（Lv45）
  //   → 營地的五道封印 q70 → q71 → q72 → q73 → q76（等級一級一級開）→ 封印全開，Boss 委託 q77 才能接、王座的門才開。
  //   打怪由簡單到難：時之鳳凰 41、鏡麒麟 42、時停蝶 43｜銜尾蛇 44、時之聖甲蟲 45、虛空鯨 46、雙生天馬 48、星蝕魔龍 49（野外魔王）。
  //   經驗：終章（不含 Boss 委託）總量維持 19,359（和改版前一樣），前半多給、後半少給：
  //   模擬（同 aggro/sim.js 的模型，Lv40 出發，額外擊殺 ×0.5～1.5）：交 q75 時 Lv44.4～45.4（不足 45 由雲鬃的傳承補到 45，js/game/pacing.js），
  //   交 q76（抵達 Boss）時 Lv49.0～50，和改版前（49.1～49.5）一樣。
  //   灰鬃第一次出現在第三章，所以這裡直接指定委託屬於終章（region 5），委託經驗才不會被第三章的等級帶打折。
  const CH5 = {
    q78: [39, 400], q79: [39, 400], q74: [39, 3000], q80: [39, 3300], q75: [40, 3600],
    q70: [44, 1600], q71: [44, 1700], q72: [45, 1750], q73: [46, 1800], q76: [48, 1809],
  };
  for (const qid in CH5) {
    const q = D.quests[qid];
    if (!q) continue;
    q.region = 5;
    q.chapter = 5;
    q.req = Object.assign({}, q.req, { lv: CH5[qid][0] });
    q.reward = Object.assign({}, q.reward, { exp: CH5[qid][1] });
  }
  // Boss 委託的經驗維持改版前（659）：progression.js 依整章委託比例分配，新增 q80 會讓它變少
  if (D.quests.q77) Object.assign(D.quests.q77, { chapter: 5, reward: Object.assign({}, D.quests.q77.reward, { exp: 659 }) });
  // ── 委託的需求等級壓低（使用者回饋：第一章打到 9～10 等，還不知道有委託沒接）──
  //   每章的一般委託都在該章前段就能接（章起點 +0～2 級），野外魔王委託一進章節就能接（使用者要求）；只會「降低」，不會提高。
  //   Boss 委託、終章灰鬃／雲鬃的主線不動；終章營地的封印委託本來就卡在五轉（q75）之後，只把等級拉齊到 44～45。
  const EARLY = {
    q2: 2, q9: 2, q20: 2, q22: 2, q21: 3, q23: 3, q25: 4, q24: 2,
    q30: 9, q31: 9, q32: 10, q33: 10, q34: 11, q36: 9,
    q50: 19, q51: 19, q52: 19, q53: 20, q54: 20, q55: 21, q57: 19,
    q60: 29, q61: 29, q62: 29, q63: 30, q65: 30, q66: 31, q64: 29,
    q70: 44, q71: 44, q72: 44, q73: 45, q76: 44,
  };
  for (const qid in EARLY) {
    const q = D.quests[qid];
    if (q && q.req && q.req.lv) q.req.lv = Math.min(q.req.lv, EARLY[qid]);
  }
  B.apexSP = 2; // 五轉送 2 點：冥道殘月破、地爆天星各 1 點，一進五轉就能全部學滿（js/data/skillcap.js）
})();
