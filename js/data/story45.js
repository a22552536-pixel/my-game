// 第四章「霜鈴雪峰」、終章「時空間神殿」：NPC、委託、商店、裝備、章節文字（v1.1）。
// 必須在 js/data/progression.js 之前載入（委託經驗依等級帶縮放、商店自動上架當章裝備）。
// NPC 的人物弧線（依委託／Boss 變化的台詞）寫在 js/data/npcstory45.js。
//
// 故事主軸
//   第四章：山頂的神鐘每一百年響一次，替找東西的人指路。霜白星楓葉掉在鐘上，守山的霜靈想「讓鐘聲永遠不停、
//   讓村子永遠不被暴風雪吞掉」——葉子把這份心願放大成「把一切凍住，就永遠不會失去」。白角鹿為了敲鐘叫回孩子，被凍進冰裡。
//   狐狸巫女知道守葉獸的宿命：收齊葉子的守葉獸，要留在樹下變成石頭。
//   終章：浮空遺跡是一座時空間神殿，靠「借來的時間」浮在雲上。每一百年，時間本身來收帳——收齊葉子的守葉獸要付出自己的時間，
//   變成石頭，遺跡才能再浮一百年。王座廳裡的石獅像，全是歷代的守葉獸；最新的一尊是雲鬃。
//   這一次，灰鬃站到你身邊；一路上幫過的每個人，各分一點點時間給你——輪迴被打破，沒有誰需要變成石頭。
(function () {
  'use strict';
  const D = G.data;
  const I = D.items;

  // ── 裝備：第四章 tier 7（Lv38）、8（Lv44），終章 tier 9（Lv50）、10（Lv55）──
  const tiers = {
    7: { req: 38, n: ['霜鈴', '雪豹', '冰晶', '白鹿', '符文', '結界', '巫女', '鐘聲', '極光'] },
    8: { req: 44, n: ['霜靈', '影狼', '冰瀑', '犛牛', '夢咒', '冰盾', '神社', '心核', '千鈴'] },
    9: { req: 50, n: ['時之', '鏡晶', '星沙', '沙漏', '神殿', '錶盤', '輪迴', '齒輪', '雲海'] },
    10: { req: 55, n: ['星座', '次元', '平行', '重力', '王座', '永恆', '星楓', '黎明', '心葉'] },
  };
  const tint = { 7: ['#dff4ff', '#e8f0ff', '#9ad8ff'], 8: ['#bfe8ff', '#6a5a8a', '#ff9ab0'], 9: ['#ffd98a', '#bfe8ff', '#e0b060'], 10: ['#b8a0ff', '#ffe6a0', '#ffd35a'] };
  const S = {
    7: { atk: 44, hp: 420, def: 22, mp: 140, crit: 0.09, cb: 0.1, ch: 360, mb: 220, mc: 34, cmp: 220, cc: 0.12 },
    8: { atk: 53, hp: 510, def: 26, mp: 170, crit: 0.1, cb: 0.11, ch: 450, mb: 270, mc: 40, cmp: 270, cc: 0.13 },
    9: { atk: 63, hp: 610, def: 30, mp: 205, crit: 0.11, cb: 0.12, ch: 550, mb: 320, mc: 46, cmp: 330, cc: 0.14 },
    10: { atk: 74, hp: 720, def: 34, mp: 240, crit: 0.12, cb: 0.13, ch: 660, mb: 380, mc: 52, cmp: 390, cc: 0.15 },
  };
  for (const t in tiers) {
    const T = tiers[t];
    const s = S[t];
    const n = T.n;
    const c = tint[t];
    const r = (x) => Math.round(x);
    Object.assign(I.bases, {
      ['claw' + t]: { slot: 'claw', name: n[0] + '爪套', req: T.req, tier: +t, tint: c[0], stats: { atk: s.atk } },
      ['claw' + t + 'b']: { slot: 'claw', name: n[1] + '爪套', req: T.req, tier: +t, tint: c[1], stats: { atk: r(s.atk * 0.8), crit: s.cb } },
      ['claw' + t + 'c']: { slot: 'claw', name: n[2] + '爪套', req: T.req, tier: +t, tint: c[2], stats: { atk: r(s.atk * 0.8), hp: s.ch } },
      ['mane' + t]: { slot: 'mane', name: n[3] + '鬃飾', req: T.req, tier: +t, tint: c[0], stats: { hp: s.hp, def: s.def } },
      ['mane' + t + 'b']: { slot: 'mane', name: n[4] + '鬃飾', req: T.req, tier: +t, tint: c[1], stats: { hp: r(s.hp * 0.7), mp: s.mb } },
      ['mane' + t + 'c']: { slot: 'mane', name: n[5] + '鬃飾', req: T.req, tier: +t, tint: c[2], stats: { hp: r(s.hp * 0.6), def: s.mc } },
      ['charm' + t]: { slot: 'charm', name: n[6] + '護符', req: T.req, tier: +t, tint: c[0], stats: { crit: s.crit, mp: s.mp } },
      ['charm' + t + 'b']: { slot: 'charm', name: n[7] + '護符', req: T.req, tier: +t, tint: c[1], stats: { mp: s.cmp } },
      ['charm' + t + 'c']: { slot: 'charm', name: n[8] + '護符', req: T.req, tier: +t, tint: c[2], stats: { crit: s.cc } },
    });
  }
  Object.assign(I.uniques, {
    frostAntler: { boss: 'frostSpirit', slot: 'claw', name: '霜靈之角', req: 46, tier: 8, tint: '#dff4ff', stats: { atk: 64, crit: 0.1 }, special: 'thunder' },
    bellMantle: { boss: 'frostSpirit', slot: 'mane', name: '神鐘披風', req: 46, tier: 8, tint: '#bfe8ff', stats: { hp: 640, def: 34 }, special: 'leech' },
    whiteBell: { boss: 'frostSpirit', slot: 'charm', name: '白鹿的鈴鐺', req: 46, tier: 8, tint: '#ffffff', stats: { crit: 0.14, mp: 220 }, special: 'focus' },
    clockHand: { boss: 'timeItself', slot: 'claw', name: '時針之爪', req: 58, tier: 10, tint: '#ffd35a', stats: { atk: 88, crit: 0.12 }, special: 'thunder' },
    starMane: { boss: 'timeItself', slot: 'mane', name: '星沙鬃飾', req: 58, tier: 10, tint: '#b8a0ff', stats: { hp: 860, def: 42 }, special: 'leech' },
    maplePendant: { boss: 'timeItself', slot: 'charm', name: '星楓懷錶', req: 58, tier: 10, tint: '#ffe6a0', stats: { crit: 0.17, mp: 300 }, special: 'focus' },
  });
  Object.assign(I.materials, {
    frostbell: { name: '霜鈴碎片', price: 900, desc: '神鐘裂開時掉下來的一片，貼在耳邊還聽得到鐘聲。' },
    timeshard: { name: '時之碎片', price: 1500, desc: '時間本身碎掉的一角，裡面的星沙還在往上流。' },
  });
  I.trades.push(
    { shop: 'yakelder', need: { phantomgem: 6, owlcrystal: 4 }, give: { potion: 'mpXL', n: 3 } },
    { shop: 'yakelder', need: { runepaper: 6 }, give: { potion: 'hpXL', n: 3 } },
    { shop: 'yakelder', need: { drumskin: 4, shadowfur: 3 }, give: { potion: 'acorn', n: 3 } },
    { shop: 'yakelder', need: { dreamwool: 5 }, give: { potion: 'nut', n: 3 } },
    { shop: 'yakelder', need: { sealtalisman: 4, lifecrystal: 3 }, give: { equip: 'chest', name: '神祕裝備（稀有以上）' } },
    { shop: 'yakelder', need: { frostbell: 1, shieldshard: 5 }, give: { unique: 'frostSpirit', name: '神鐘的寶物（獨特裝備）' } },
    { shop: 'sphinxcat', need: { timesand: 6, mirrorshard: 4 }, give: { potion: 'mpXL', n: 4 } },
    { shop: 'sphinxcat', need: { clockwing: 6 }, give: { potion: 'hpXL', n: 4 } },
    { shop: 'sphinxcat', need: { ouroscale: 4, brassgear: 3 }, give: { potion: 'acorn', n: 4 } },
    { shop: 'sphinxcat', need: { riftcloth: 5 }, give: { potion: 'nut', n: 4 } },
    { shop: 'sphinxcat', need: { darkstar: 4, twintail: 3 }, give: { equip: 'chest', name: '神祕裝備（稀有以上）' } },
    { shop: 'sphinxcat', need: { stardust: 5 }, give: { potion: 'feather', n: 5 } },
    { shop: 'sphinxcat', need: { timeshard: 1, stardust: 5 }, give: { unique: 'timeItself', name: '時間的寶物（獨特裝備）' } },
  );
  const pots = (ids) => ids.map((id) => ({ type: 'potion', id }));
  Object.assign(I.moreShops, {
    yakelder: pots(['hpL', 'mpL', 'hpXL', 'mpXL', 'acorn', 'nut', 'feather']),
    crane: pots(['hpL', 'mpL', 'hpXL', 'mpXL', 'feather']),
    sphinxcat: pots(['hpXL', 'mpXL', 'acorn', 'nut', 'feather']),
  });

  // ── NPC ──
  Object.assign(D.npcs, {
    foxmiko: { name: '狐狸巫女', art: 'foxmiko', role: 'quest', talk: [{ text: ['……鈴鐺在響。是在叫你呢，守葉獸大人。'] }] },
    yakelder: { name: '犛牛長老', art: 'yakelder', role: 'shop', shop: 'yakelder', shopName: '犛牛長老的雜貨舖', talk: [{ text: ['哞。要上山？先把東西帶夠。'] }] },
    harekid: { name: '雪兔小孩', art: 'harekid', role: 'quest', talk: [{ text: ['你、你是真的吧？不是會學人走路的那個吧？'] }] },
    marmot: { name: '土撥鼠獵人', art: 'marmot', role: 'quest', talk: [{ text: ['噓。雪原上的東西，耳朵比你還靈。'] }] },
    snowleopard: { name: '雪豹劍士', art: 'snowleopard', role: 'quest', talk: [{ text: ['……別靠太近。我的劍不認得朋友。'] }] },
    crane: { name: '丹頂鶴', art: 'crane', role: 'shop', shop: 'crane', shopName: '丹頂鶴的藥箱', talk: [{ text: ['旅人，受傷了嗎？我這裡有藥。'] }] },
    whitedeer: { name: '白角鹿', art: 'whitedeer', role: 'quest', talk: [{ text: ['謝謝你，孩子。……謝謝你把我的孩子，帶到這麼遠的地方。'] }] },
    tortoisesage: { name: '老陸龜賢者', art: 'tortoisesage', role: 'quest', talk: [{ text: ['……回來了啊。這一次，又是一百年。'] }] },
    sphinxcat: { name: '斯芬克斯貓', art: 'sphinxcat', role: 'shop', shop: 'sphinxcat', shopName: '斯芬克斯的謎之舖', talk: [{ text: ['喵。什麼東西早上四隻腳，中午兩隻腳……算了，買東西嗎？'] }] },
    cloudmane: { name: '雲鬃的靈', art: 'cloudmane', role: 'quest', talk: [{ text: ['……你長大了。'] }] },
  });

  // ── 委託 ──
  const Q = D.quests;
  Object.assign(Q, {
    // 第四章　霜鈴雪峰
    q60: {
      name: '學人走路的東西', npc: 'harekid', req: { lv: 38 }, type: 'kill', target: 'echoferret', count: 12,
      reward: { exp: 2600, gold: 900 },
      lines: {
        offer: '昨天晚上，我在雪地上走，後面一直有一樣的腳步聲……\n我停，它也停；我跑，它晚一下下才跑。\n是鎌鼬！風一吹就砍過來，砍完，殘影還會再砍一次！幫我趕走 12 隻……拜託。',
        progress: '牠衝過來砍完之後，不要站在原地！殘影會在原地再砍一次！',
        done: '腳步聲不見了！……我今天可以自己走回家了。\n這些金葉是我存了一整個冬天的，給你。',
      },
    },
    q61: {
      name: '會響的鼓', npc: 'yakelder', req: { lv: 40 }, type: 'collect', item: 'drumskin', count: 6,
      reward: { exp: 2900, equip: { base: 'claw7', rarity: 'rare' } },
      lines: {
        offer: '哞。村子的祭典鼓破了。以前一敲，山上的鐘就會回一聲。\n雷獸背上的雷鼓皮最好，一敲就打雷。拿 6 塊回來。',
        progress: '牠擂鼓的時候，地面會一波一波震過來。跳。',
        done: '……哞。好皮。\n這爪套是我年輕時用的。現在我只用得動算盤了，你拿去。',
      },
    },
    q62: {
      name: '等不到的春天', npc: 'marmot', req: { lv: 41 }, type: 'kill', target: 'avalanchehare', count: 12,
      reward: { exp: 3100, gold: 1000 },
      lines: {
        offer: '我在這裡等春天，等了三個冬天。\n春天沒來，小雪男倒是越來越多，踢著雪球把我的陷阱都滾平了。\n幫我打 12 隻。',
        progress: '雪球會越滾越大。跳過去，別硬擋。',
        done: '……做得好。\n你知道嗎，雪原上的雪，三年來一片都沒融過。\n不是天氣冷。是山上的什麼東西，把時間凍住了。',
      },
    },
    q63: {
      name: '影子的債', npc: 'snowleopard', req: { lv: 43 }, type: 'kill', target: 'shadowwolf', count: 12,
      reward: { exp: 3400, equip: { base: 'mane7', rarity: 'rare' } },
      lines: {
        offer: '我的搭檔，在這條鈴道上被影子咬住，然後……被暴風雪吞掉了。\n影之芬里爾的影子會脫離身體，貼著地面滑過來。\n我一個人砍不完。你幫我砍 12 隻。',
        progress: '看到地上有影子朝你滑過來，就往旁邊跳。被咬住，就走不動了。',
        done: '……夠了。\n我不是為了報仇。我只是想讓這條路，下一個人能走得過去。\n這個鬃飾是他的。他會希望有人戴著它往上走。',
      },
    },
    q64: {
      name: '睡在參道上的旅人', npc: 'crane', req: { lv: 45 }, type: 'kill', target: 'dreamsheep', count: 12,
      reward: { exp: 3700, gold: 1200 },
      lines: {
        offer: '參道上好多旅人睡倒了，叫都叫不醒。\n是夢咒綿羊的霧。在雪地裡睡著，會再也醒不來的。\n請你趕走 12 隻，我去一個一個把他們叫醒。',
        progress: '紫色的霧裡會變得很慢。先離開霧，再打。',
        done: '大家都醒了。有個旅人醒來第一句話是「媽媽」……\n我忍不住想，那隻被凍住的白鹿，是不是也在做夢。',
      },
    },
    q65: {
      name: '結界的破洞', npc: 'foxmiko', req: { lv: 46 }, type: 'collect', item: 'sealtalisman', count: 6,
      reward: { exp: 4000, equip: { base: 'charm8', rarity: 'rare' } },
      lines: {
        offer: '神社的結界破了好幾個洞，暴風雪就從那裡灌進村子。\n九尾封印狐的尾巴上貼著古老的封符，是以前的巫女寫的。\n請帶 6 張回來。……牠會放出追人的狐火，請小心。',
        progress: '牠身邊浮起三團狐火時，就是要放了。狐火會拐彎，邊跑邊躲。',
        done: '……這是我奶奶的字。\n一百年前，她也寫過一模一樣的符，送一隻金色的獅子上山。\n這個護符給你。……請你，一定要回頭看看我們。',
      },
    },
    q66: {
      name: '心的藥', npc: 'crane', req: { lv: 47 }, type: 'collect', item: 'lifecrystal', count: 6,
      reward: { exp: 4200, equip: { base: 'mane8', rarity: 'rare' } },
      lines: {
        offer: '古木樹靈的御神木之心，可以讓凍僵的心跳重新暖起來。\n如果你打算救冰裡的白鹿，我們需要它。拿 6 片來。\n牠的心核只有打開的時候才打得動。',
        progress: '看牠胸口。樹皮打開、露出紅色的心，那時候再打。',
        done: '夠了，足夠讓一顆心重新跳起來。\n去吧。我會跟在你後面上山——等你打贏的那一刻，我要第一個跑到白鹿身邊。',
      },
    },
    q67: {
      name: '不會停的鐘聲', npc: 'foxmiko', req: { lv: 47 }, type: 'boss', target: 'frostSpirit', count: 1, main: true,
      reward: { exp: 9000, gold: 2500 },
      lines: {
        offer: '霜靈是守這座山的神。牠一直守著神鐘，守著村子。\n霜白星楓葉落在鐘上之後，牠想讓鐘聲永遠不停，想讓暴風雪永遠吞不掉村子……\n想著想著，就把整座山都凍住了。連來敲鐘的白鹿，也一起。\n守葉獸大人，請讓鐘聲停下來。然後……讓它重新響起。',
        progress: '鐘響的時候，會有一圈一圈的震波。牠頭頂的冰柱落下前，地上會先發亮。',
        done: '鐘聲停了，然後又響了——這一次是春天的聲音。\n……謝謝你。',
        epilogue: [
          '……鐘聲停了。然後，又響了一次。這一次，是春天的聲音。',
          '霜靈不是壞神。牠只是太愛這座山，愛到想把每一片雪都留住。',
          '葉子讓那份愛變成了「永遠」。可是永遠不融的雪，就不是雪了，是牢。',
          '白角鹿醒了。丹頂鶴正在替她暖心，小鹿……小鹿就在參道下面等。',
          '守葉獸大人，我必須告訴你一件事。奶奶說過：收齊五片葉子的守葉獸，要留在樹下，變成石頭守著它。',
          '一百年前的雲鬃，就是這樣上去的。他最後一次經過這裡，沒有回頭。',
          '……我不想再送一隻獅子上山了。可是雲上的階梯，已經為你打開了。',
          '請你，一定要回頭看看我們。',
        ],
      },
    },

    // 終章　時空間神殿
    q70: {
      name: '掃不完的前庭', npc: 'tortoisesage', req: { lv: 50 }, type: 'kill', target: 'hourowl', count: 12,
      reward: { exp: 4800, gold: 1500 },
      lines: {
        offer: '……我掃這座前庭，掃了三百年。\n時之鳳凰一燒起來，時間就往回流，剛掃乾淨的地又髒了。\n孩子，幫老頭子趕走 12 隻吧。',
        progress: '牠血少的時候會浴火重生，把時間倒回去一次。別急，再打一次就好。',
        done: '……乾淨了。這次，應該能乾淨個一百年吧。\n呵呵。在這裡，一百年只是一個下午。',
      },
    },
    q71: {
      name: '謎題的答案', npc: 'sphinxcat', req: { lv: 51 }, type: 'collect', item: 'mirrorshard', count: 8,
      reward: { exp: 5200, equip: { base: 'claw9', rarity: 'rare' } },
      lines: {
        offer: '喵。猜謎：什麼東西，你看它的時候，它也在看你？\n……答案是鏡子。好，那請你幫我拿 8 片麒麟鏡鱗，喵。\n鏡麒麟會變出一隻假的自己，假的一打就碎。',
        progress: '分不出真假的話，就兩隻都打。碎掉的那隻，就是假的，喵。',
        done: '喵～亮晶晶。這把爪套給你，是上一個猜對謎題的客人留下的。\n……那是一百年前，一隻金色的獅子。牠猜對了所有的謎，只有一題答不出來。',
      },
    },
    q72: {
      name: '停住的午後', npc: 'tortoisesage', req: { lv: 52 }, type: 'kill', target: 'stopmoth', count: 12,
      reward: { exp: 5500, equip: { base: 'mane9', rarity: 'rare' } },
      lines: {
        offer: '時停蝶的翅膀是兩個錶盤。牠一振翅，那一塊地方的時間就停了。\n迴廊裡有好多東西停在半空中，花瓣、雨滴、還有……某個人的眼淚。\n幫我打 12 隻。',
        progress: '地上出現金色的圓，就是牠的領域。進去就會慢得像我一樣。',
        done: '……眼淚掉下來了。\n孩子，你知道嗎？停住的時間不會消失。它只是在等，等有人讓它繼續走。',
      },
    },
    q73: {
      name: '最後一題', npc: 'sphinxcat', req: { lv: 53 }, type: 'kill', target: 'clocksnail', count: 8,
      reward: { exp: 5800, gold: 1800 },
      lines: {
        offer: '喵。時之聖甲蟲推著太陽盤，會替旁邊的怪物加速，走廊裡的時間都亂掉了。打 8 隻。\n……然後，我想問你那隻金色獅子答不出來的那一題。',
        progress: '牠放出金色光圈之後，周圍的怪物會變快。先打牠。',
        done: '喵。好，最後一題：\n「如果只有一個人留下，大家就能得救——那個人，一定要是你嗎？」\n……金色的獅子說「是」。然後就走進王座廳了。你呢？先別回答，喵。',
      },
    },
    q74: {
      name: '繞一圈又回來', npc: 'cloudmane', req: { lv: 54 }, type: 'kill', target: 'ouroboros', count: 12,
      reward: { exp: 6200, equip: { base: 'charm9', rarity: 'rare' } },
      lines: {
        offer: '這座庭園的時間是倒著走的，所以我才能在這裡跟你說話。\n銜尾蛇咬著自己的尾巴，繞一圈又回到起點……就像守葉獸的命運。\n打倒 12 隻吧。我想看看，繞不出去的圈，能不能被打斷。',
        progress: '牠變成車輪的時候很硬。等牠停下來，再打。',
        done: '……斷了。原來圈，是可以斷的。\n一百年前的我，要是也想到這一點就好了。',
      },
    },
    q75: {
      name: '通往哪裡的門', npc: 'cloudmane', req: { lv: 55 }, type: 'collect', item: 'riftcloth', count: 6,
      reward: { exp: 6600, equip: { base: 'claw10', rarity: 'rare' } },
      lines: {
        offer: '虛空鯨肚子裡的裂縫通往很多地方。我想用牠的鯨鬚做一個小小的門，讓一封信可以送到森林。\n給刺蝟婆婆的。我欠她一句話，欠了一百年。\n拿 6 根虛空鯨鬚給我。',
        progress: '牠潛進裂縫的時候，會從你背後游出來。先轉身。',
        done: '……信寫好了。只有一句：「對不起，我沒有回頭。」\n松鼠說，這次他跑得到。……謝謝你，孩子。',
      },
    },
    q76: {
      name: '哪一個是真的', npc: 'sphinxcat', req: { lv: 56 }, type: 'kill', target: 'parallelfox', count: 12,
      reward: { exp: 7000, equip: { base: 'mane10', rarity: 'rare' } },
      lines: {
        offer: '喵。平行狐會變出另一個世界的自己。只有一隻是真的。\n星之階梯上全是牠們。打 12 隻，真的那種，喵。',
        progress: '打碎假的，真的就會現形，那時候最脆弱。',
        done: '喵。你已經分得出真假了。\n那你也分得出來吧——「一定要一個人留下」，是真的，還是假的？',
      },
    },
    q77: {
      name: '時間的帳', npc: 'tortoisesage', req: { lv: 56 }, type: 'boss', target: 'timeItself', count: 1, main: true,
      reward: { exp: 14000, gold: 5000 },
      lines: {
        offer: '這座神殿浮在雲上，靠的是借來的時間。\n每一百年，時間本身會來收帳。收齊葉子的守葉獸，要把自己的時間交出去，變成石頭——\n王座廳裡那一排石獅，全是你的前輩。最新的那一尊，是雲鬃。\n……孩子，老頭子活了一千年，第一次希望，這筆帳可以不用還。',
        progress: '時間會讓一切變慢、倒轉。看清楚地上的光，那是它下一步要去的地方。灰鬃會替你擋一次。',
        done: '……帳，還清了。不是用石頭，是用大家的時間。',
        epilogue: [
          '……時間停下來了。不是被凍住的那種停，是休息的那種停。',
          '孩子，你聽到了嗎？剛才那一瞬間，好多聲音。',
          '刺蝟婆婆、龜爺爺、菇菇、海豹、老猴子、小鹿和她媽媽、狐狸巫女……每一個你幫過的人，都各給了你一點點時間。',
          '一個人要付一百年，好重。可是分給這麼多人，一個人只要一天。',
          '看，石獅像一尊一尊裂開了。雲鬃在最後面……他正在回頭看你。',
          '灰鬃的島也浮起來了。那孩子別過頭去，說他沒有哭。',
          '一千年來，這是第一次沒有人需要留下。',
          '……回家吧，守葉獸。然後，隨時可以再出發。',
        ],
      },
    },
  });

  // ── 章節文字 ──
  const ch = D.story.chapters;
  Object.assign(ch[4], {
    hook: '雪山上的神鐘一直響個不停，整座山被凍住了三年。小鹿的媽媽，被凍在霜靈的冰裡。',
    freed: '霜靈碎成滿天雪花，冰裡的白角鹿睜開眼睛。你把小鹿編的藤蔓項鍊掛在她脖子上——她哭了，然後笑了。狐狸巫女卻悄悄說：「守葉獸收齊葉子後，要留在樹下，變成石頭守著它。」',
    end: {
      title: '第四章　完・霜白星楓葉',
      text: '雪開始融了。土撥鼠說，他等到春天了。\n小鹿跟媽媽回到了森林，臨走前，她把藤蔓項鍊掛回你的脖子上：「換你帶著，就不會迷路。」\n\n狐狸巫女說，收齊五片葉子的守葉獸，要留在樹下變成石頭。一百年前的雲鬃，就是這樣上去的。\n\n雲上的階梯打開了。最後一片葉子，在時間的盡頭。',
    },
  });
  Object.assign(ch[5], {
    no: '終章', name: '時空間神殿', sub: '時間的盡頭',
    tone: '壯闊、傳承、釋懷',
    hook: '時間本身每一百年來收一次帳——收齊葉子的守葉獸，要變成石頭。',
    boss: 'timeItself',
    leaf: { name: '金色星楓心葉', color: '#ffd35a', power: '心', gift: '黑閃變成金色閃電、額頭的星楓之冠完成' },
    freed: '時間的石殼碎成星沙。王座廳裡的石獅一尊一尊裂開，最後面的雲鬃睜開眼睛——這一次，他回頭看了你。',
    end: {
      title: '終章　完・金色星楓心葉',
      text: '五片星楓葉回到樹上。\n一百年的時間，由一路上的每一個人，一人一天分著付了。\n\n龜爺爺給了一個下雨的午後；貓頭鷹給了沒有客人的那一天；\n小鹿給了找媽媽時最冷的那一天；刺蝟婆婆給了看著金色獅子走遠的那一天。\n\n沒有誰需要變成石頭。',
    },
  });
  for (const k of [4, 5]) {
    const c = ch[k];
    D.story.regions[k] = { no: c.no, name: c.name, sub: c.sub, hook: c.hook };
    D.story.bossDefeated[c.boss] = c.freed;
  }
  delete D.story.bossDefeated.stoneGuardian;
  D.story.ending = [
    '五片星楓葉回到樹上，星楓樹開滿了花。神殿緩緩升回雲海之上。',
    '王座廳裡的石獅一尊一尊醒過來。最老的那一位伸了個懶腰，說牠睡了九百年，腰好痠。',
    '雲鬃走下王座，在你面前停了很久。「……一百年前，我一次也沒有回頭。」他說。「所以這一次，換我來送你。」',
    '灰鬃的島浮起來了。他把一朵星楓花種在島上，別過頭說：「……下次比賽，我不會輸。」',
    '森林裡，刺蝟婆婆收到一封只有一句話的信。她讀了三遍，然後笑著把信夾進了相簿。',
    '海岬的燈塔亮著；峽谷的溫泉冒著煙；雪峰上，鐘聲在春天響起；小鹿追著媽媽跑。',
    '守葉獸不再需要留下。每一百年，星楓風還是會吹——只是這一次，是帶大家來雲上看看。',
    '小獅子站在神殿的邊緣，往下看。',
    '家，原來一直都在下面。',
  ];
  D.story.recall.frostSpirit = '（回憶）鐘聲又響了起來。這是葉子記住的那個冬天。';
  D.story.recall.timeItself = '（回憶）錶盤又開始轉。時間記得你，就像你記得它。';
  D.story.bossWords.frostSpirit = [
    '……鐘聲……停了……',
    '我守這座山，守了一千個冬天。每一年都有人被暴風雪帶走，每一年我都只能聽著鐘聲送他們走。',
    '那片白色的葉子落在鐘上的時候，它說：「只要讓一切停下來，就再也不會失去。」',
    '所以我凍住了雪、凍住了風、凍住了鐘聲……連那頭來敲鐘的白鹿，也凍住了。她一直在叫一個孩子的名字。',
    '守葉獸，你不怕失去嗎？……不，你怕。可是你還是往前走。',
    '……把葉子拿去吧。告訴那頭白鹿，鐘會為她的孩子，再響一次。',
  ];
  D.story.bossWords.timeItself = [
    '……我不恨你們。我只是記帳。',
    '天上的島要浮著，就要有時間；時間不會憑空而來。一千年來，每一隻守葉獸都懂這個道理。',
    '雲鬃也懂。他站在我面前，說「拿我的吧」，然後就變成了石頭。',
    '可是你身上……有好多人的時間。一片森林、一座燈塔、一條峽谷、一整座雪山的時間，一點一點，全都是給你的。',
    '一個人的一百年，我收得下。這麼多人的一天……我不知道該怎麼收。',
    '……帳，算清了。去吧，守葉獸。時間會繼續走——這一次，不用誰停下來。',
  ];
})();
