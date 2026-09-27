// 第四章「霜鈴雪峰」、終章「時空間神殿」：NPC、委託、商店、裝備、章節文字（v2）。劇情的唯一依據是 docs/STORY.md。
// 必須在 js/data/progression.js 之前載入（委託經驗依等級帶縮放、商店自動上架當章裝備）。
// NPC 的人物弧線（依委託／Boss 變化的台詞）寫在 js/data/npcstory45.js。
//
// 故事主軸
//   第四章：霜靈看穿了葉子在做什麼——它在收這座山的時間——於是把整座山凍住，不讓它再收走任何一天。白角鹿被凍在冰裡。
//   打倒霜靈之後是第一次反轉：狐狸巫女的紀錄（葉子是收割、神殿靠地上的時間浮著、守葉獸要坐上王座變成石頭），
//   灰鬃說出「一百年前，雲鬃收走了我家的時間」，邀你一起上神殿打倒收帳的「時間」。
//   終章：打倒時間之後是第二次反轉（依序：時間的遺言 → Boss 倒下文字 → 老陸龜的收尾 → 章末卡 → 結局頁）：
//   帳還在；王座廳最後一尊石獅是空殼；灰鬃就是一百年前從王座上逃走的雲鬃。這一百年的稅由大家一人一天付清，
//   雲鬃欠的一百年由他自己坐回王座付。雲鬃的靈（5-3）是一百年前、還沒逃走的他，不知道自己後來逃了。
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
    foxmiko: { name: '狐狸巫女', art: 'foxmiko', role: 'quest', talk: [{ text: ['……鈴鐺在響。是在叫你呢，守葉獸大人。', '這座村子的鈴，是為找東西的人響的。'] }] },
    yakelder: { name: '犛牛長老', art: 'yakelder', role: 'shop', shop: 'yakelder', shopName: '犛牛長老的雜貨舖', talk: [{ text: ['哞。要上山？先把東西帶夠。', '這座山不會因為你是守葉獸，就對你客氣。'] }] },
    harekid: { name: '雪兔小孩', art: 'harekid', role: 'quest', talk: [{ text: ['你、你是真的吧？不是會學人走路的那個吧？'] }] },
    marmot: { name: '土撥鼠獵人', art: 'marmot', role: 'quest', talk: [{ text: ['噓。雪原上的東西，耳朵比你還靈。', '我在這裡等春天，等了三個冬天。'] }] },
    snowleopard: { name: '雪豹劍士', art: 'snowleopard', role: 'quest', talk: [{ text: ['……別靠太近。我的劍不認得朋友。'] }] },
    crane: { name: '丹頂鶴', art: 'crane', role: 'shop', shop: 'crane', shopName: '丹頂鶴的藥箱', talk: [{ text: ['旅人，受傷了嗎？我這裡有藥。', '凍傷的地方別急著烤火。慢慢暖，才不會壞死。'] }] },
    whitedeer: { name: '白角鹿', art: 'whitedeer', role: 'quest', talk: [{ text: ['謝謝你，孩子。……謝謝你把我的孩子，帶到這麼遠的地方。'] }] },
    tortoisesage: { name: '老陸龜賢者', art: 'tortoisesage', role: 'quest', talk: [{ text: ['……回來了啊。', '這一次，又是一百年。'] }] },
    sphinxcat: { name: '斯芬克斯貓', art: 'sphinxcat', role: 'shop', shop: 'sphinxcat', shopName: '斯芬克斯的謎之舖', talk: [{ text: ['喵。一定要有人留下——這句話，是誰說的？', '……不急著答。先買東西吧。'] }] },
    // 雲鬃的靈：一百年前、還沒從王座上站起來的雲鬃。他真心相信自己會留下，不知道自己後來逃了。
    cloudmane: { name: '雲鬃的靈', art: 'cloudmane', role: 'quest', talk: [{ text: ['……你來了。這座庭園的時間是倒著走的，所以一百年前的我，才能在這裡跟你說話。', '葉子都收齊了。明天，我就上去。', '一百年後，我會坐在王座上等你。'] }] },
  });

  // ── 委託 ──
  const Q = D.quests;
  Object.assign(Q, {
    // 第四章　霜鈴雪峰
    q60: {
      name: '學人走路的東西', npc: 'harekid', req: { lv: 38 }, type: 'kill', target: 'echoferret', count: 12,
      reward: { exp: 2600, gold: 900 },
      lines: {
        offer: '昨天晚上在雪地上走，後面一直有一樣的腳步聲。\n我停，它也停；我跑，它晚一下下才跑。\n是鎌鼬。風一吹就砍過來，砍完，殘影還會在原地再砍一次。幫我趕走 12 隻……拜託。',
        progress: '牠衝過來砍完之後，別站在原地。殘影會再砍一次。',
        done: '腳步聲不見了。……今天我可以自己走回家了。\n這些金葉是我存了一整個冬天的。給你。',
      },
    },
    q61: {
      name: '會響的鼓', npc: 'yakelder', req: { lv: 40 }, type: 'collect', item: 'drumskin', count: 6,
      reward: { exp: 2900, equip: { base: 'claw7', rarity: 'rare' } },
      lines: {
        offer: '哞。村子的祭典鼓破了。以前一敲，山上的鐘就會回一聲。\n雷獸背上的雷鼓皮最好。拿 6 塊回來。',
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
        done: '……做得好。\n雪原上的雪，三年來一片都沒融過。\n不是天氣冷。是山上有什麼東西，不肯讓日子往前走。',
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
        offer: '霜靈是守這座山的神。三年前，霜白星楓葉落在神鐘上，牠就把整座山凍住了。\n連來敲鐘、想叫孩子回家的白鹿，也一起凍在冰裡。\n守葉獸大人，請讓鐘聲停下來。然後……讓它重新響起。',
        progress: '鐘響的時候，會有一圈一圈的震波。牠頭頂的冰柱落下前，地上會先發亮。',
        done: '鐘聲停了，然後又響了一次。這一次，是春天的聲音。\n神社的紀錄，我會全部告訴你。你有權利知道。',
        epilogue: [
          '……鐘聲停了。然後又響了一次。這一次，是春天的聲音。',
          '白角鹿醒了，丹頂鶴正在替她暖心。小鹿……小鹿就在參道下面等。',
          '守葉獸大人，霜靈最後說的話，我都聽見了。神社裡有一本紀錄，奶奶不准我看。我看了。',
          '星楓葉落在哪裡，就從哪裡收時間。花期、潮水、冬天的長短，一點一點，收到天上去。',
          '雲上的神殿之所以浮著，是因為地上一直在付。',
          '收齊葉子的守葉獸，要坐上王座，變成石頭。紀錄的最後一頁，畫著一整列石獅。',
          '一百年前，奶奶送一隻金色的獅子上山。她記了一輩子他的背影。',
          '……我不想再送一隻獅子上山了。可是雲上的階梯，已經為你打開了。',
        ],
      },
    },

    // 終章　時空間神殿
    q70: {
      name: '掃不完的前庭', npc: 'tortoisesage', req: { lv: 50 }, type: 'kill', target: 'hourowl', count: 12,
      reward: { exp: 4800, gold: 1500 },
      lines: {
        offer: '……我掃這座前庭，掃了很久很久。\n時之鳳凰一燒起來，時間就往回流，剛掃乾淨的地又髒了。\n孩子，幫老頭子趕走 12 隻吧。',
        progress: '牠血少的時候會浴火重生，把時間倒回去一次。別急，再打一次就好。',
        done: '……乾淨了。\n掃地掃久了就知道，灰塵吹得再遠，最後都會落回原來的地方。\n逃得最遠的人，最後也都會回到出發的地方。',
      },
    },
    q71: {
      name: '謎題的答案', npc: 'sphinxcat', req: { lv: 51 }, type: 'collect', item: 'mirrorshard', count: 8,
      reward: { exp: 5200, equip: { base: 'claw9', rarity: 'rare' } },
      lines: {
        offer: '喵。猜謎：什麼東西，你看它的時候，它也在看你？\n……答案是鏡子。好，那請你幫我拿 8 片麒麟鏡鱗，喵。\n鏡麒麟會變出一隻假的自己，假的一打就碎。',
        progress: '分不出真假的話，就兩隻都打。碎掉的那隻，就是假的，喵。',
        done: '喵，亮晶晶。這把爪套給你，是上一個猜謎的客人留下的。\n一百年前，一隻金色的獅子。他全部答對了，只有一題，答得太快。',
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
        offer: '喵。時之聖甲蟲推著太陽盤，會替旁邊的怪物加速，走廊裡的時間都亂掉了。打 8 隻。\n……然後，我想問你那隻金色獅子答得太快的那一題。',
        progress: '牠放出金色光圈之後，周圍的怪物會變快。先打牠。',
        done: '喵。好，最後一題：\n「如果只有一個人留下，大家就能得救——那個人，一定要是你嗎？」\n……金色的獅子說「是」。然後就走進王座廳了。你呢？先別回答，喵。',
      },
    },
    q74: {
      name: '繞一圈又回來', npc: 'cloudmane', req: { lv: 54 }, type: 'kill', target: 'ouroboros', count: 12,
      reward: { exp: 6200, equip: { base: 'charm9', rarity: 'rare' } },
      lines: {
        offer: '這座庭園的時間是倒著走的，所以我才能在這裡跟你說話。\n銜尾蛇咬著自己的尾巴，繞一圈又回到起點。守葉獸也是：下來，收葉子，上去，坐下。\n打倒 12 隻吧。我想看看，一個圈被打斷是什麼樣子。',
        progress: '牠變成車輪的時候很硬。等牠停下來，再打。',
        done: '……斷了。原來圈是可以斷的。\n不過，我不會斷。答應過的事，我會做完。',
      },
    },
    q75: {
      name: '通往哪裡的門', npc: 'cloudmane', req: { lv: 55 }, type: 'collect', item: 'riftcloth', count: 6,
      reward: { exp: 6600, equip: { base: 'claw10', rarity: 'rare' } },
      lines: {
        offer: '下山收葉子的時候，森林裡有一隻小刺蝟，跟了我半座森林。\n她問我還會不會回來。我說會。……那是謊話。\n我想用虛空鯨鬚做一扇小門，把一封信送下去給她。拿 6 根給我。',
        progress: '牠潛進裂縫的時候，會從你背後游出來。先轉身。',
        done: '……信寫好了。只有一句。\n不給你看。那是給她的。\n松鼠說，這麼遠的信，他也跑得到。',
      },
    },
    q76: {
      name: '哪一個是真的', npc: 'sphinxcat', req: { lv: 56 }, type: 'kill', target: 'parallelfox', count: 12,
      reward: { exp: 7000, equip: { base: 'mane10', rarity: 'rare' } },
      lines: {
        offer: '喵。平行狐會變出另一個世界的自己。只有一隻是真的。\n星之階梯上全是牠們。打 12 隻，真的那種，喵。',
        progress: '打碎假的，真的就會現形，那時候最脆弱。',
        done: '喵。你已經分得出真假了。\n那你也分得出來吧——「一定要有人留下」，是誰說的？',
      },
    },
    q77: {
      name: '時間的帳', npc: 'tortoisesage', req: { lv: 56 }, type: 'boss', target: 'timeItself', count: 1, main: true,
      reward: { exp: 14000, gold: 5000 },
      lines: {
        offer: '這座神殿浮在雲上，靠的是地上的時間。每一百年，時間本身會來收一次帳。\n收不齊的，由守葉獸補——坐上王座，變成石頭。那一排石獅，全是你的前輩。最後那一尊，是雲鬃留下的。\n……有些帳，要本人來結。老頭子只能送你到門口。',
        progress: '時間會讓一切變慢、倒轉。看清楚地上的光，那是它下一步要去的地方。灰鬃會替你擋一次。',
        done: '……帳結清了。用的是大家的一天，和一個人的一百年。',
        epilogue: [
          '……那一尊，是空的。',
          '一百年前的那個晚上，我聽見石頭碎在地上的聲音。趕到的時候，王座上只剩下這層殼。',
          '老頭子每天都掃它。掃了一百年，一次也沒有跟誰說過。',
          '老頭子早就知道了。你們踏上前庭的那一刻，我就認出他了。',
          '我說過，有些帳，要本人來結。別人替他說出口，就不算數了。',
          '（老陸龜轉過身，對著你的身後。）……說吧，孩子。一百年了。',
        ],
      },
    },
  });

  // ── 章節文字 ──
  // 第一次反轉：霜靈的遺言 → Boss 倒下文字 → 狐狸巫女的收尾（q67 epilogue）→ 第四章章末卡（灰鬃）。
  // 第二次反轉：時間的遺言 → Boss 倒下文字 → 老陸龜的收尾（q77 epilogue）→ 終章章末卡（灰鬃的自白）→ 結局頁。
  const ch = D.story.chapters;
  Object.assign(ch[4], {
    tone: '驚險、團圓、真相',
    hook: '雪峰上的神鐘響了三年沒停，整座山被凍住了。小鹿的媽媽，在霜靈的冰裡。',
    freed: '霜靈碎成滿天的雪。冰一片一片裂開，白角鹿倒在雪地上，還有呼吸。你把小鹿編的藤蔓項鍊掛在她脖子上。她看了很久，認出那是誰的手藝，然後哭了。',
    end: {
      title: '第四章　完・霜白星楓葉',
      text: '雪開始融了。土撥鼠說，他等到春天了。\n小鹿跟媽媽回森林之前，把藤蔓項鍊掛回你的脖子上：「換你戴著，就不會迷路。」\n\n灰鬃在神社的石階上等你。\n「一百年前，雲鬃收走了我家的時間，它就開始沉了。」\n「葉子不是讓牠們發瘋的東西。葉子是在收帳。你打倒的每一個，都是在替自己的土地擋刀。」\n「不要把葉子放回樹上。把它們帶到王座廳。收帳的在那裡。」\n「我們一起把它打倒——沒有收帳的，就沒有帳。」\n\n雲上的階梯打開了。這一次，他走在你旁邊。',
    },
  });
  Object.assign(ch[5], {
    no: '終章', name: '時空間神殿', sub: '時間的盡頭',
    tone: '追擊、真相、償還',
    hook: '雲上的階梯盡頭是王座廳。收帳的在那裡。這一次，灰鬃走在你旁邊。',
    boss: 'timeItself',
    leaf: { name: '金色星楓心葉', color: '#ffd35a', power: '心', gift: '黑閃變成金色閃電、額頭的星楓之冠完成' },
    freed: '時間碎成星沙。同一刻，王座廳最後一尊石獅從頭頂裂到腳底——裡面是空的。只剩一層殼，還保持著一頭獅子從王座上站起來的姿勢。你回過頭。灰鬃站在你身後，沒有看你。他在看那層殼。',
    end: {
      title: '終章　完・金色星楓心葉',
      text: '「我跟你說的，每一句都是真的。我只是沒說，雲鬃是誰。」\n「一百年前，坐在那張椅子上的是我。石頭長到膝蓋的時候，我站了起來。時間收回了我的一百年，鬃毛是那時候變灰的。」\n「花謝得早、海退得遠、山被凍住，都是我欠的帳。女王、老蟹、甲龜、霜靈，是替我付的。」\n「葉子會燙我，所以我需要你。打輸了，被收下的會是你。」\n「我知道。我還是帶你來了。」\n\n你往空的王座走過去。一隻灰色的爪子按住了你的肩膀。\n「那是我的位子。」',
    },
  });
  for (const k of [4, 5]) {
    const c = ch[k];
    D.story.regions[k] = { no: c.no, name: c.name, sub: c.sub, hook: c.hook };
    D.story.bossDefeated[c.boss] = c.freed;
  }
  delete D.story.bossDefeated.stoneGuardian;
  // 結局頁（js/ui/finale.js 一頁一頁播放，文字不換行，靠寬度自動斷行）：第二次反轉的收尾與尾聲。一頁最多三行。
  D.story.ending = [
    '「這一百年的，大家已經替你付了。」灰鬃說。「你一路上幫過的每一個人，各分了你一天。」',
    '龜爺爺給了一個下雨的午後。小鹿給了找媽媽時最冷的那一天。刺蝟婆婆給了看著金色獅子走遠的那一天。',
    '「一個人的一百年很重。分給這麼多人，一個人只要一天。」「可是我欠的那一百年，沒有人能分。」「那一筆，寫的是我的名字。」',
    '他走上台階，坐了下來。動作很慢，像回到一張坐過很久的椅子。',
    '石頭從腳往上長。長到膝蓋的時候，他沒有動。',
    '灰色的鬃毛從根部開始，一點一點，變回了金色。',
    '石頭長到喉嚨的時候，他回過頭，看了你一眼。',
    '然後，就不動了。王座廳的那一排石獅，這一次，沒有空位。',
    '你回到地上，一塊土地一塊土地地走，把真相說給每一個人聽。有人哭，有人罵你，也有人很久都沒有說話。',
    '最後大家說好：下一個一百年，不讓葉子替誰去收，每個人自己分一天出來。星楓樹的葉子，這一次留在了枝頭上。',
    '刺蝟婆婆收到一封只有一句話的信，署名雲鬃。「對不起，我不會回來了。」她讀了很久，說：「笨蛋。你明明一直都在。」',
    '龜爺爺把那杯放了一百年的茶端起來。「涼透了。」他還是一口一口，把它喝完了。',
    '森林的花，今年晚了幾天才謝。潮水慢慢漲回來了。峽谷的溫泉冒著煙；雪峰上，小鹿追著媽媽跑。',
    '你有時候會回到神殿，在最後那尊石獅前面坐一下。守葉獸都長著同一張臉。只有他的頭，是轉過來的。',
    '小獅子站在神殿的邊緣，往下看。',
    '家，原來一直都在下面。',
  ];
  D.story.recall.frostSpirit = '（回憶）鐘聲又響了。葉子記得的那個冬天，一天也沒有少。';
  D.story.recall.timeItself = '（回憶）錶盤又開始轉。它不恨你。它只是把帳，又翻回了那一頁。';
  // 霜靈：第一次反轉的開端。他是唯一看穿葉子在做什麼、而且反抗的守葉者。
  D.story.bossWords.frostSpirit = [
    '……鐘，停了。',
    '我守這座山一千個冬天。雪化、花開、有人老去，一年一年，都是我數過去的。',
    '三年前，那片白色的葉子落在鐘上。我聽見它也在數。只是它數的，是這座山剩下的日子。',
    '它數得太快了。一年，要收走兩年。',
    '所以我讓雪停下來，讓風停下來，讓鐘聲停下來。什麼都不動，它就數不下去。',
    '我讓一切停下來，是為了不讓那片葉子再從這座山收走任何一天。',
    '可是連那頭來敲鐘的白鹿，也一起停在冰裡了。她一直在叫孩子的名字。……那是我的罪。',
    '守葉獸。你把葉子帶回去，它就會繼續數。你不知道嗎？……你現在知道了。',
  ];
  // 時間：第二次反轉的第 1、2 步。你打贏的是記帳的，帳還在；它對灰鬃說話。
  D.story.bossWords.timeItself = [
    '……好。你贏了。',
    '我不恨你們。我從來不恨誰。我只是記帳的。',
    '神殿要浮著，季節要轉，都要用時間付。每一百年，我來收一次。一百年份。',
    '本來不重。五片葉子，五塊土地，花期短幾天，冬天長幾天。土地付得起。',
    '這一次，收的是兩倍。因為上一次的，沒有付。',
    '你身上帶著好多人的時間。一片森林、一座燈塔、一條峽谷、一整座雪山，一人一天。這一百年的，夠了。',
    '可是上一次的那一百年，不是他們欠的。',
    '你打贏的，是記帳的。帳還在。',
    '（它沒有再看你。它看著你的身後。）',
    '雲鬃。一百年了。你的位子還空著。',
  ];
})();
