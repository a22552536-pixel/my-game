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
    const avg = ids.reduce((t, id) => t + B.monsterAtk(D.monsters[id].lv) * (D.monsters[id].atkMul || 1), 0) / ids.length;
    const want = Math.min(avg * 1.5, (queen.atk || B.monsterAtk(queen.lv)) * 0.95);
    fb.atkMul = want / B.monsterAtk(fb.lv);
    fb.touchK = 1.0;
    fb.skillK = 1.0;
  })();

  // ── 每章一個委託改成「討伐野外魔王」（發委託的 NPC 就在野外魔王那張地圖上）──
  const FBQ = {
    q24: ['fb_shroom', '苔冠鱷王', '根洞下面的積水潭，是我挖礦的路。\n苔冠鱷王趴在那裡，工具全被拖下水。\n我的爪子只會挖土。幫我打倒牠。', '嘴巴越張越開，就是要噴毒霧了。', '積水潭安靜了。金葉跟硬殼果收好。'],
    q36: ['fb_kraken', '沉船海魔', '潮退得太遠，沉船海魔爬上了礁岩。\n補給船一出港，就被牠拖下海。\n各營地的藥和糧都在船上。打倒牠。', '地上發亮的地方，觸手要冒出來了。', '補給線保住了。漿果算我請你。'],
    q57: ['fb_balrog', '熔岩河的炎魔', '我的礦坑，就在熔岩河床上。\n河床醒了一頭炎魔，燒掉了兩座坑。\n谷裡的鍋和鎬都靠這座礦。打倒牠。', '牠飛上天，就是要俯衝了。看警示線。', '河床的岩漿，退了一截。'],
    q64: ['fb_zakum', '千手冰像', '參道深處那座冰像，前幾天醒了。\n上山的旅人被打傷，全抬到我這裡。\n藥不夠用了。去把冰像打倒吧。', '看紅圈和紅線，手掌會從四面八方打過來。', '冰像睡了。旅人可以上山了。'],
    q76: ['fb_voiddragon', '吞星的龍', '星之階梯，晚上靠星星照路。\n星蝕魔龍把星星一顆顆吞了，路黑了。\n已經有人踩空，掉下雲海。去打倒牠。', '別硬撐黑洞球，先跑開。', '被吃掉的星星，回不來了。'],
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
})();
