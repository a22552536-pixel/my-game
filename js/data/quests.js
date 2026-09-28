// 任務資料。type：kill 打倒、collect 收集、boss 討伐、visit 前往某張地圖。
// 每位 NPC 一個委託（主線另計）。完成這一章所有委託之後，Boss 房的傳送門才會打開。
//   第一章 9＋主線：刺蝟婆婆、龜爺爺、青蛙、貓頭鷹、松鼠、小栗、小鹿、鼴鼠、菇菇
//   第二章 6＋主線：海獺、海鷗商人、海星、小河豚、章魚、鵜鶘
//   第三章 7＋主線：水豚、狐獴、鸚鵡、小熊貓、灰鬃、山羊、犰狳
// 任務 id 沿用舊存檔的編號。
G.data.quests = {
  // ── 刺蝟婆婆：蝸牛系 ──
  q1: {
    name: '森林的清潔工',
    npc: 'hedgehog',
    req: { lv: 1 },
    type: 'kill',
    target: 'dewsnail',
    count: 10,
    reward: { exp: 60, gold: 80 },
    lines: {
      offer: '露珠蝸把營地的菜苗啃光了。\n今年冬天長，存糧撐不到春天。\n去營地左邊，幫婆婆趕走 10 隻。',
      progress: '露珠蝸跑不快，你也不用跑。',
      done: '菜苗保住了。金葉拿去買果子吧。',
    },
  },
  q4: {
    name: '森林的女王',
    npc: 'hedgehog',
    req: { lv: 8 },
    type: 'boss',
    target: 'queenShroom',
    count: 1,
    main: true,
    reward: { exp: 900, gold: 300 },
    lines: {
      offer: '你要找的綠光，在古樹根洞最深處。\n菇菇女王拿著它，宮廷才四季如春。\n她不會交出來。去殿堂找她吧。',
      progress: '殿堂在根洞最右邊。她跳，你也跳。',
      done: '……辛苦了。葉子在你的鬃毛上發光。',
      epilogue: ['……呼，婆婆總算趕上了。', '女王走的時候，孢子飄滿了根洞，像下雪。', '往海邊去吧。婆婆在營地留著燈。'],
    },
  },

  // ── 貓頭鷹商人：菇系 ──
  q2: {
    name: '藥水的原料',
    npc: 'owl',
    req: { lv: 3, quest: 'q1' },
    type: 'collect',
    item: 'spore',
    count: 8,
    reward: { exp: 100, potions: { mp: 5 } },
    lines: {
      offer: '冬天拖得長，咳嗽的人越來越多。\n藥水要拿孢子粉當底，存貨見底了。\n去蘑菇林地，從小傘菇收 8 包。',
      progress: '小傘菇會跳，別追丟了。',
      done: '品質不錯。帳本上記你一筆：守信用。',
    },
  },

  // ── 松鼠信差：草精系 ──
  q9: {
    name: '種子搬家',
    npc: 'squirrel',
    req: { lv: 4 },
    type: 'collect',
    item: 'seedshell',
    count: 6,
    reward: { exp: 110, gold: 60 },
    lines: {
      offer: '上次過河，郵包進水，信全糊了。\n種子殼又硬又不透水，拿來裝信剛好。\n林地的種子精身上有，帶 6 個來。',
      progress: '種子精跳來跳去，我也追不到。',
      done: '這下過河，信也不會濕了。',
    },
  },

  // ── 松鼠信差：跑腿探索 ──

  // ── 龜爺爺：講古 ──
  q20: {
    name: '露珠泡的茶',
    npc: 'turtle',
    req: { lv: 2 },
    type: 'collect',
    item: 'dew',
    count: 5,
    reward: { exp: 50, potions: { hp: 5 } },
    lines: {
      offer: '老頭子咳了一整個冬天。\n婆婆說，露珠泡的茶最潤喉。\n幫我收 5 顆露珠蝸殼上的露珠。',
      progress: '不急。露珠又不會跑。',
      done: '好茶。……喝慢一點，才喝得久。',
    },
  },

  // ── 青蛙採集家（蘑菇林地）──
  q22: {
    name: '吵鬧的鄰居',
    npc: 'frog',
    req: { lv: 2 },
    type: 'kill',
    target: 'capshroom',
    count: 12,
    reward: { exp: 90, gold: 70 },
    lines: {
      offer: '我靠在林地採野花、野菜過冬。\n小傘菇越長越多，把花田踩爛了。\n幫我打 12 隻，讓我採完這一季。',
      progress: '牠們跳起來的時候最好打。',
      done: '花田保住了。這些金葉是賣野花賺的，呱。',
    },
  },

  // ── 小栗：刺蝟婆婆的孫子 ──
  q21: {
    name: '軟軟的床',
    npc: 'hedgekid',
    req: { lv: 5 },
    type: 'collect',
    item: 'moss',
    count: 4,
    reward: { exp: 120, potions: { acorn: 2 } },
    lines: {
      offer: '冬天好長，我晚上冷到睡不著。\n奶奶把她的毯子給我，自己在發抖。\n幫我拿 4 塊橡實鼠絨毛，我自己做床。',
      progress: '橡實鼠在林地上面，還有深谷裡。',
      done: '好軟！力量橡實給你，是我的寶物。',
    },
  },

  // ── 迷路的小鹿（木漏日深谷）──
  q23: {
    name: '給媽媽的項鍊',
    npc: 'fawn',
    req: { lv: 6 },
    type: 'collect',
    item: 'vine',
    count: 6,
    reward: { exp: 200, potions: { hpL: 3 } },
    lines: {
      offer: '媽媽走的那天，留給我一顆鈴鐺。\n綁鈴鐺的繩子斷了，我怕弄丟它。\n藤尾蜥的藤很韌，幫我拿 6 條？',
      progress: '藤尾蜥甩尾巴很痛，要小心喔。',
      done: '編好了。你走得比我遠，先替我帶著。',
    },
  },

  // ── 鼴鼠礦工（古樹根洞）──
  // q24（實際台詞由 rebalance.js 的 FBQ 覆蓋成野外魔王委託，這裡保持一致）
  q24: {
    name: '根洞的落石',
    npc: 'mole',
    req: { lv: 7 },
    type: 'kill',
    target: 'woodsnail',
    count: 10,
    reward: { exp: 280, potions: { nut: 2 }, gold: 120 },
    lines: {
      offer: '根洞下面的積水潭，是我挖礦的路。\n苔冠鱷王趴在那裡，工具全被拖下水。\n我的爪子只會挖土。幫我打倒牠。',
      progress: '牠縮殼時打不動，等牠探頭再打。',
      done: '積水潭安靜了。金葉跟硬殼果收好。',
    },
  },

  // ── 菇菇：女王的侍女 ──
  q25: {
    name: '給女王的花',
    npc: 'mushgirl',
    req: { lv: 9 },
    type: 'collect',
    item: 'petal',
    count: 5,
    reward: { exp: 320, equip: { base: 'charm2', rarity: 'rare' } },
    lines: {
      offer: '宮廷每年都辦春宴，今年也不能少。\n桌上的花，外面的林子已經採不到了。\n根洞深處的花瓣蝶，幫我收 5 片。',
      progress: '花瓣蝶在根洞最深處，花瓣會割人。',
      done: '好香。這個護符，是女王大人送我的。',
    },
  },

  // ═════════ 第二章 潮風海岬（Lv 11–20）═════════
  q30: {
    name: '今天的晚餐', npc: 'otter', req: { lv: 11 }, type: 'kill', target: 'sandcrab', count: 12,
    reward: { exp: 450, gold: 220 },
    lines: {
      offer: '燈塔岬的人，冬天全靠我的魚。\n卷軸寄居蟹一射符文，魚群就散了。\n幫我趕走 12 隻，晚餐分你一份！',
      progress: '牠射的光會拐彎追你，別站著看。',
      done: '魚回來了！金葉拿去。',
    },
  },
  q31: {
    name: '亮晶晶的貨', npc: 'gullmerchant', req: { lv: 12 }, type: 'collect', item: 'jellydrop', count: 8,
    reward: { exp: 500, potions: { mpL: 3 } },
    lines: {
      offer: '燈塔三天沒亮，夜裡的船不敢出港。\n鬼火芯裝進瓶子，能掛在船頭當燈。\n去抓鬼火水母，收 8 顆回來。',
      progress: '鬼火熄掉時牠會瞬移，亮起來會電人。',
      done: '品質一流。大藍花蜜拿去。',
    },
  },
  q32: {
    name: '曬太陽的好位置', npc: 'starfish', req: { lv: 13 }, type: 'kill', target: 'gullchick', count: 12,
    reward: { exp: 560, gold: 260 },
    lines: {
      offer: '巫師海鷗整天壓在潮池上……\n撿貝的小傢伙，被牠壓傷兩個了……\n幫忙趕走 12 隻……我動作太慢……',
      progress: '看到斗篷的影子就躲……牠會壓下來……',
      done: '……潮池，又有人來撿貝了……',
    },
  },
  q35: {
    name: '燈塔的光', npc: 'seal', req: { lv: 15 }, type: 'boss', target: 'hermitCrab', count: 1, main: true,
    reward: { exp: 3000, gold: 800 },
    lines: {
      offer: '燈塔三天沒亮了，光在老蟹的殼上。\n他躲在浪花礁岩後面的巢灣。\n去跟他打一場。他這人，只認拳頭。',
      progress: '他縮進燈塔時，繞到背後打那扇窗。',
      done: '……他笑著走的？像他。',
      epilogue: ['……老骨頭划得慢，你們打完啦。', '吵了五十年。明天起來，不知道要罵誰。', '往東是赤岩峽谷。那裡的火山醒了。'],
    },
  },
  q33: {
    name: '礁岩的記號', npc: 'pufferkid', req: { lv: 15 }, type: 'collect', item: 'glowgel', count: 5,
    reward: { exp: 700, potions: { acorn: 2 } },
    lines: {
      offer: '燈塔不亮，爸爸的船昨晚擦到礁岩。\n槍尖綁著飄帶，插在礁上當記號。\n幫我拿 5 支！我游不了那麼遠。',
      progress: '牠會從天上斜斜衝下來，小心！',
      done: '插好了，晚上也看得到飄帶。橡實給你。',
    },
  },
  q34: {
    name: '畫不完的海', npc: 'octopus', req: { lv: 16 }, type: 'collect', item: 'shellpiece', count: 6,
    reward: { exp: 800, equip: { base: 'charm3', rarity: 'rare' } },
    lines: {
      offer: '我替船家畫海圖，換一口飯吃。\n鸚鵡螺碎殼磨成粉，是最耐水的顏料。\n幫我拿 6 片，這批圖月底要交。',
      progress: '符文全亮起來就會炸，快跑！',
      done: '顏色調出來了。這個護符送你。',
    },
  },
  // q36（實際台詞由 rebalance.js 的 FBQ 覆蓋成野外魔王委託，這裡保持一致）
  q36: {
    name: '補給線', npc: 'pelican', req: { lv: 18 }, type: 'kill', target: 'coralcrab', count: 12,
    reward: { exp: 1100, potions: { hpL: 5 } },
    lines: {
      offer: '潮退得太遠，沉船海魔爬上了礁岩。\n補給船一出港，就被牠拖下海。\n各營地的藥和糧都在船上。打倒牠。',
      progress: '牠跳起來就要蓋封印，法陣別踩！',
      done: '補給線保住了！漿果算我請你。',
    },
  },

  // ═════════ 第三章 赤岩峽谷（Lv 21–30）═════════
  q50: {
    name: '溫泉毛巾', npc: 'capybara', req: { lv: 21 }, type: 'collect', item: 'towel', count: 8,
    reward: { exp: 1100, potions: { hpXL: 2 } },
    lines: {
      offer: '……打熱水的鐵桶……全沉到泉底了……\n……引力水晶放下去……鐵就上來了……\n……幫我拿 8 顆……不急……',
      progress: '……被吸過去……就往反方向走……',
      done: '……鐵桶回來了……今天的湯免費……',
    },
  },
  q51: {
    name: '放哨', npc: 'meerkat', req: { lv: 22 }, type: 'kill', target: 'pebble', count: 15,
    reward: { exp: 1200, gold: 500 },
    lines: {
      offer: '報告！狂戰士岩堵住了谷口的路！\n運柴的隊伍兩天沒進來，灶快斷火了！\n請求支援，目標 15 隻！',
      progress: '報告！牠氣到冒煙就會衝過來！',
      done: '報告！運柴隊進谷了。敬禮！',
    },
  },
  q52: {
    name: '帶路費', npc: 'parrot', req: { lv: 23 }, type: 'kill', target: 'springmonkey', count: 12,
    reward: { exp: 1400, gold: 600 },
    lines: {
      offer: '引力犰狳一靠近，指南針就亂轉！亂轉！\n上個月，有兩個客人在裂谷走丟了！\n幫我趕走 12 隻，帶路免費！',
      progress: '牠縮成球滾過來就跳！跳！',
      done: '指南針指北了！指北了！',
    },
  },
  q53: {
    name: '燒烤料理', npc: 'redpanda', req: { lv: 24 }, type: 'collect', item: 'emberscale', count: 8,
    reward: { exp: 1600, potions: { acorn: 3 } },
    lines: {
      offer: '柴火運不進來，灶常常點不著。\n炎劍碎片一碰就著，拿來引火最好。\n幫我拿 8 片，客人還等著吃飯。',
      progress: '牠會帶著火衝過來，火痕別踩！',
      done: '火升起來了。秘密調味料送你。',
    },
  },
  q54: {
    name: '誰比較快', npc: 'greymane', req: { lv: 25 }, type: 'kill', target: 'moltenlizard', count: 15,
    reward: { exp: 1900, gold: 700 },
    lines: {
      offer: '……三頭術士蛇守著往河床的路。\n我要過去，你也要過去。\n比一場。誰先打倒 15 隻，輸的別跟來。',
      progress: '……三顆頭一起噴火，你連這都躲不掉？',
      done: '……算你厲害。我不需要金葉。',
    },
  },
  q55: {
    name: '蒸氣裡的藥草', npc: 'goat', req: { lv: 26 }, type: 'collect', item: 'rockheart', count: 6,
    reward: { exp: 2100, equip: { base: 'charm5', rarity: 'rare' } },
    lines: {
      offer: '灰色的那孩子，前爪燙傷，一直沒好。\n燙傷藥要磨得很細，我的石臼裂了。\n戰鎚碎片夠重夠硬，幫我拿 6 顆。',
      progress: '牠落地震出波的時候，跟著跳。',
      done: '他收下了，說了謝謝。很小聲。',
    },
  },
  q56: {
    name: '醒來的火山', npc: 'oldmonkey', req: { lv: 27 }, type: 'boss', target: 'lavaTortoise', count: 1, main: true,
    reward: { exp: 6000, gold: 1500 },
    lines: {
      offer: '葉子掉進甲龜背上的火山口。\n牠醒了以後，谷裡天天地震、落石。\n……孩子，峽谷交給你了。',
      progress: '看到地上的影子就跑；牠翻滾時跳上平台。',
      done: '火山睡著了。辛苦了，孩子。',
      epilogue: ['……火山睡了。七十年，第一次這麼安靜。', '回營地吧。前面的路，會越來越冷。'],
    },
  },
  // q57（實際台詞由 rebalance.js 的 FBQ 覆蓋成野外魔王委託，這裡保持一致）
  q57: {
    name: '坑道裡的熱氣', npc: 'armadillo', req: { lv: 28 }, type: 'kill', target: 'fireiguana', count: 12,
    reward: { exp: 2600, potions: { hpXL: 3 } },
    lines: {
      offer: '我的礦坑，就在熔岩河床上。\n河床醒了一頭炎魔，燒掉了兩座坑。\n谷裡的鍋和鎬都靠這座礦。打倒牠。',
      progress: '牠低頭就是要衝了，快閃！',
      done: '坑道保住了。',
    },
  },
};
