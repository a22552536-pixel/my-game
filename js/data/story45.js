// 第四章「霜鈴雪峰」、終章「時空間神殿」：NPC、委託、商店、裝備、章節文字（v3）。劇情的唯一依據是 docs/STORY.md。
// 必須在 js/data/progression.js 之前載入（委託經驗依等級帶縮放、商店自動上架當章裝備）。
// NPC 的人物弧線（依委託／Boss 變化的台詞）寫在 js/data/npcstory45.js。
//
// 故事主軸（v3）
//   第四章：霜靈讓整座山停下來，不付。沒有人老，也沒有孩子出生；白角鹿被凍在冰裡三年。打倒他，山又開始變老。
//   終章：老陸龜說出天上的立場（時鐘要的比收的少；多的那一份讓神殿浮著，也長出了你）。
//   時間醒來保護樹，你和灰鬃一起打倒它；時鐘停了。你把心葉放回樹上。單一、中性的結局。
// 字數規則見 STORY.md 第 0 節：NPC 每頁最多 2 行、每行最多 20 字；委託 offer 3 行（說清楚為什麼要去）、progress／done 各 1 行。
(function () {
  'use strict';
  const D = G.data;
  const I = D.items;

  // ── 裝備：第四章 tier 7（Lv38）、8（Lv44），終章 tier 9（Lv50）、10（Lv55）──
  const tiers = {
    7: { req: 38, n: ['霜鈴', '雪豹', '冰晶', '白鹿', '符文', '結界', '巫女', '鐘聲', '極光'] },
    8: { req: 44, n: ['霜靈', '影狼', '冰瀑', '犛牛', '雪息', '冰盾', '神社', '心核', '千鈴'] },
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
    foxmiko: { name: '狐狸巫女', art: 'foxmiko', role: 'quest', talk: [{ text: ['鈴鐺在響。\n這座山，三年沒有春天了。'] }] },
    yakelder: { name: '犛牛長老', art: 'yakelder', role: 'shop', shop: 'yakelder', shopName: '犛牛長老的雜貨舖', talk: [{ text: ['要上山？先把東西帶夠。哞。'] }] },
    harekid: { name: '雪兔小孩', art: 'harekid', role: 'quest', talk: [{ text: ['我三年前就是這麼高。\n現在也是。'] }] },
    marmot: { name: '土撥鼠獵人', art: 'marmot', role: 'quest', talk: [{ text: ['噓。\n我在這裡等春天，等了三個冬天。'] }] },
    snowleopard: { name: '雪豹劍士', art: 'snowleopard', role: 'quest', talk: [{ text: ['別靠太近。\n我的劍不認得朋友。'] }] },
    crane: { name: '丹頂鶴', art: 'crane', role: 'shop', shop: 'crane', shopName: '丹頂鶴的藥箱', talk: [{ text: ['凍傷的地方別急著烤火。\n慢慢暖，才不會壞死。'] }] },
    whitedeer: { name: '白角鹿', art: 'whitedeer', role: 'quest', talk: [{ text: ['我睡了多久？\n……我的孩子，長大了嗎？'] }] },
    tortoisesage: {
      name: '老陸龜賢者', art: 'tortoisesage', role: 'quest',
      talk: [
        { text: ['……回來了啊。\n這一次，又是一百年。'] },
        { if: { done: 'q72' }, text: ['時鐘要的，比收的少。\n多的那一份，讓神殿浮著，也長出了你。'] },
      ],
    },
    sphinxcat: { name: '斯芬克斯貓', art: 'sphinxcat', role: 'shop', shop: 'sphinxcat', shopName: '斯芬克斯的謎之舖', talk: [{ text: ['什麼東西，越老越貪吃？\n……先買東西吧。'] }] },
    // 雲鬃的靈：一百年前、還沒下山的雲鬃（倒轉庭園時間倒著走）。只說很少的話。
    cloudmane: { name: '雲鬃的靈', art: 'cloudmane', role: 'quest', talk: [{ text: ['葉子都收齊了。\n明天，我就下山。'] }] },
  });

  // ── 委託 ──
  const Q = D.quests;
  Object.assign(Q, {
    // 第四章　霜鈴雪峰
    q60: {
      name: '學人走路的東西', npc: 'harekid', req: { lv: 38 }, type: 'kill', target: 'echoferret', count: 12,
      reward: { exp: 2600, gold: 900 },
      lines: {
        offer: '我每天去村口，等哥哥從山上下來。\n鎌鼬在雪原上亂砍，大人不准我去了。\n幫我趕走 12 隻，我想去村口等。',
        progress: '牠砍完別站原地，殘影會再砍一次。',
        done: '村口安全了。金葉給你。',
      },
    },
    q61: {
      name: '會響的鼓', npc: 'yakelder', req: { lv: 40 }, type: 'collect', item: 'drumskin', count: 6,
      reward: { exp: 2900, equip: { base: 'claw7', rarity: 'rare' } },
      lines: {
        offer: '村裡的祭典鼓，冬天被凍裂了。\n三年沒辦祭典，大家都快忘了日子。\n拿 6 塊雷獸的鼓皮回來，我來補。',
        progress: '牠擂鼓時，地面一波波震過來。跳。',
        done: '好皮。這爪套我用不到了，拿去。',
      },
    },
    q62: {
      name: '等不到的春天', npc: 'marmot', req: { lv: 41 }, type: 'kill', target: 'avalanchehare', count: 12,
      reward: { exp: 3100, gold: 1000 },
      lines: {
        offer: '三個冬天，村裡的存糧快見底了。\n雪男把我下的陷阱全滾平了。\n幫我打 12 隻，我才能再去下套。',
        progress: '雪球會越滾越大。跳過去，別硬擋。',
        done: '三年了，這裡的雪一片也沒融過。',
      },
    },
    q63: {
      name: '影子的債', npc: 'snowleopard', req: { lv: 43 }, type: 'kill', target: 'shadowwolf', count: 12,
      reward: { exp: 3400, equip: { base: 'mane7', rarity: 'rare' } },
      lines: {
        offer: '搭檔的墳，就在冰瀑那條路上。\n每次去看他，都被影子圍住。\n幫我砍 12 隻影之芬里爾。',
        progress: '地上有影子滑過來，就往旁邊跳。',
        done: '這鬃飾是他的。你戴著往上走。',
      },
    },
    // q64（實際台詞由 rebalance.js 的 FBQ 覆蓋成野外魔王委託，這裡保持一致）
    q64: {
      name: '睡在參道上的旅人', npc: 'crane', req: { lv: 45 }, type: 'kill', target: 'dreamsheep', count: 12,
      reward: { exp: 3700, gold: 1200 },
      lines: {
        offer: '參道深處那座冰像，前幾天醒了。\n上山的旅人被打傷，全抬到我這裡。\n藥不夠用了。去把冰像打倒吧。',
        progress: '紫色的霧裡會變慢。先離開霧，再打。',
        done: '大家都醒了。',
      },
    },
    q65: {
      name: '結界的破洞', npc: 'foxmiko', req: { lv: 46 }, type: 'collect', item: 'sealtalisman', count: 6,
      reward: { exp: 4000, equip: { base: 'charm8', rarity: 'rare' } },
      lines: {
        offer: '村子外的結界破了，暴風雪灌進來。\n九尾封印狐身上的封符，還能拿來補。\n去千鈴參道，帶 6 張回來。',
        progress: '牠身邊浮起三團狐火，就是要放了。',
        done: '這是我奶奶的字。護符給你。',
      },
    },
    q66: {
      name: '心的藥', npc: 'crane', req: { lv: 47 }, type: 'collect', item: 'lifecrystal', count: 6,
      reward: { exp: 4200, equip: { base: 'mane8', rarity: 'rare' } },
      lines: {
        offer: '冰裡的白鹿還有心跳，很慢很慢。\n要化開冰，得先讓她的心暖起來。\n古松樹靈的心會跳，也會發熱。拿 6 片。',
        progress: '等牠樹皮打開、露出紅色的心再打。',
        done: '夠了。我跟在你後面上山。',
      },
    },
    q67: {
      name: '不會停的鐘聲', npc: 'foxmiko', req: { lv: 47 }, type: 'boss', target: 'frostSpirit', count: 1, main: true,
      reward: { exp: 9000, gold: 2500 },
      lines: {
        offer: '霜靈讓這座山停下來了。\n三年，沒有人老，也沒有孩子出生。\n葉子在山頂，在他身上。去吧。',
        progress: '冰柱落下前，地上會先發亮。',
        done: '雲上的階梯，打開了。',
        epilogue: ['鐘聲又響了。', '從今天起，山上的人又會變老。'],
      },
    },

    // 終章　時空間神殿
    q70: {
      name: '掃不完的前庭', npc: 'tortoisesage', req: { lv: 50 }, type: 'kill', target: 'hourowl', count: 12,
      reward: { exp: 4800, gold: 1500 },
      lines: {
        offer: '時之鳳凰落過的地方，石板都燒裂了。\n神殿又沉了一點，經不起再裂。\n幫老頭子趕走 12 隻吧。',
        progress: '牠血少時會重生一次。再打一次就好。',
        done: '乾淨了。這前庭，我掃了一千年。',
      },
    },
    q71: {
      name: '迴廊的鏡子', npc: 'sphinxcat', req: { lv: 51 }, type: 'collect', item: 'mirrorshard', count: 8,
      reward: { exp: 5200, equip: { base: 'claw9', rarity: 'rare' } },
      lines: {
        offer: '回憶迴廊的燈，靠鏡子一面面傳光。\n鏡子裂了，我進貨的路一片黑。\n鏡麒麟的鏡鱗能補。拿 8 片來。',
        progress: '分不出真假，就兩隻都打。',
        done: '迴廊又亮了。爪套給你。',
      },
    },
    q72: {
      name: '停住的午後', npc: 'tortoisesage', req: { lv: 52 }, type: 'kill', target: 'stopmoth', count: 12,
      reward: { exp: 5500, equip: { base: 'mane9', rarity: 'rare' } },
      lines: {
        offer: '時停蝶飛過的地方，水也停住不流。\n樹要喝的水，從迴廊那邊引過來。\n水渠停了三天了。幫我打 12 隻。',
        progress: '地上金色的圓是牠的領域，別進去。',
        done: '水又開始流了。',
      },
    },
    q73: {
      name: '最後一題', npc: 'sphinxcat', req: { lv: 53 }, type: 'kill', target: 'clocksnail', count: 8,
      reward: { exp: 5800, gold: 1800 },
      lines: {
        offer: '聖甲蟲把走廊的時間弄得忽快忽慢。\n我的貨，有的放一夜就爛了。\n去打 8 隻，不然這家店開不下去。',
        progress: '牠放出金色光圈後，先打牠。',
        done: '貨放得住了。金葉你收著。',
      },
    },
    q74: {
      name: '繞一圈又回來', npc: 'cloudmane', req: { lv: 54 }, type: 'kill', target: 'ouroboros', count: 12,
      reward: { exp: 6200, equip: { base: 'charm9', rarity: 'rare' } },
      lines: {
        offer: '明天，我就要下山了。\n銜尾蛇盤在下去的路上，繞不過去。\n幫我打倒 12 隻吧。',
        progress: '牠變成車輪時很硬。等牠停下來。',
        done: '……一百年後，又是你。',
      },
    },
    q75: {
      name: '通往哪裡的門', npc: 'cloudmane', req: { lv: 55 }, type: 'collect', item: 'riftcloth', count: 6,
      reward: { exp: 6600, equip: { base: 'claw10', rarity: 'rare' } },
      lines: {
        offer: '五片葉子，都是我從地上收回來的。\n可是我從沒看過，那裡長什麼樣子。\n虛空鯨鬚能摸到很遠的地方。拿 6 根。',
        progress: '牠潛進裂縫，會從你背後游出來。',
        done: '原來，是這個樣子。',
      },
    },
    // q76（實際台詞由 rebalance.js 的 FBQ 覆蓋成野外魔王委託，這裡保持一致）
    q76: {
      name: '哪一個是真的', npc: 'sphinxcat', req: { lv: 56 }, type: 'kill', target: 'parallelfox', count: 12,
      reward: { exp: 7000, equip: { base: 'mane10', rarity: 'rare' } },
      lines: {
        offer: '星之階梯，晚上靠星星照路。\n星蝕魔龍把星星一顆顆吞了，路黑了。\n已經有人踩空，掉下雲海。去打倒牠。',
        progress: '打碎假的，真的就會現形。',
        done: '你分得出真假了。',
      },
    },
    q77: {
      name: '時間的帳', npc: 'tortoisesage', req: { lv: 56 }, type: 'boss', target: 'timeItself', count: 1, main: true,
      reward: { exp: 14000, gold: 5000 },
      lines: {
        offer: '時間醒了，擋在樹的前面。\n心葉在它身上。不拿回來，樹撐不過今年。\n灰鬃也在那裡。去吧，孩子。',
        progress: '看清楚地上的光。灰鬃會替你擋一次。',
        done: '心葉在你手上。',
        epilogue: ['……停了。', '孩子，心葉在你手上。'],
      },
    },
  });

  // ── 章節文字 ──
  // 第四章：霜靈的遺言 → Boss 倒下文字 → 狐狸巫女的收尾（q67 epilogue）→ 章末卡。
  // 終章：時間的遺言 → Boss 倒下文字（時鐘停了）→ 老陸龜的收尾（q77 epilogue）→ 章末卡 → 結局頁（js/ui/finale.js）。
  const ch = D.story.chapters;
  Object.assign(ch[4], {
    tone: '停下來',
    hook: '這座山，三年沒有春天。小鹿的媽媽在冰裡。',
    freed: '霜靈碎成雪。冰，開始裂了。',
    end: {
      title: '第四章　完・霜白星楓葉',
      text: '冰化了。白角鹿醒來，已經過了三年。\n灰鬃看著融雪：「他至少試過。」\n雲上的階梯，打開了。',
    },
  });
  Object.assign(ch[5], {
    no: '終章', name: '時空間神殿', sub: '時間的盡頭',
    tone: '時鐘',
    hook: '階梯的盡頭，是那棵樹。灰鬃走在你旁邊。',
    boss: 'timeItself',
    leaf: { name: '金色星楓心葉', color: '#ffd35a', power: '心', gift: '黑閃變成金色閃電、額頭的星楓之冠完成' },
    freed: '時間碎成星沙。滴答聲，停了。',
    end: {
      title: '終章　完・金色星楓心葉',
      text: '灰鬃要你把心葉丟下雲海。\n老陸龜要你把它放回樹上。\n四周的聲音，全停了。',
    },
  });
  for (const k of [4, 5]) {
    const c = ch[k];
    D.story.regions[k] = { no: c.no, name: c.name, sub: c.sub, hook: c.hook };
    D.story.bossDefeated[c.boss] = c.freed;
  }
  delete D.story.bossDefeated.stoneGuardian;
  // 結局（STORY.md 第 3 節，單一、中性）：一頁一行，最多 6 頁，最後一句固定。
  // 第 1 頁是時鐘停住的畫面（js/ui/finale.js 做效果），第 2 頁放回心葉、時鐘恢復。
  D.story.ending = [
    '很安靜。像那座停住的山。',
    '你把心葉放回樹上。時鐘又開始轉。',
    '灰鬃看著你，沒有說話，走下了階梯。',
    '老陸龜說：「謝謝。」你沒有回答。',
    '有的營地讓你進門，有的不讓。',
    '明年春天還是會來。有人替它付了錢。',
  ];
  D.story.recall.frostSpirit = '（回憶）鐘聲停著。山上沒有人變老。';
  D.story.recall.timeItself = '（回憶）滴答聲，又響起來了。';
  // 霜靈：停下來的立場。
  D.story.bossWords.frostSpirit = ['……鐘，又要響了。', '停住的三年，這座山沒有人老。', '從明天起，又要開始失去了。'];
  // 時間：時鐘本身。不說教。
  D.story.bossWords.timeItself = ['……滴。', '我老了。每一次，都要得更多。', '停下來，就沒有明年。'];
})();
