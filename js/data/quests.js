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
      offer: '露珠蝸把小徑的草啃光了。\n營地左邊，幫婆婆趕走 10 隻。',
      progress: '露珠蝸跑不快，你也不用跑。',
      done: '小徑乾淨了。金葉拿去買果子吧。',
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
      offer: '綠光落在古樹根洞的盡頭。\n女王拿著它，不會給你的。',
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
      offer: '藍花蜜要加孢子粉才香。\n小傘菇身上就有，帶 8 包回來。',
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
      offer: '種子殼拿來裝信剛剛好。\n林地的種子精身上有，幫我帶 6 個？',
      progress: '種子精跳來跳去，我也追不到。',
      done: '以後我的信都用種子殼裝，嘿嘿。',
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
      offer: '老頭子想喝露珠泡的茶。\n幫我收 5 顆露珠蝸殼上的露珠。',
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
      offer: '小傘菇整天在我頭上跳。\n幫我打 12 隻，讓牠們安靜一點。',
      progress: '牠們跳起來的時候最好打。',
      done: '安靜了。金葉是賣「野花」賺的，呱。',
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
      offer: '我想做一張跟奶奶一樣軟的床。\n幫我拿 4 塊橡實鼠的絨毛，別說喔。',
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
      offer: '我想編一條項鍊，找到媽媽時送她。\n幫我拿 6 條藤尾蜥的尾巴藤蔓？',
      progress: '藤尾蜥甩尾巴很痛，要小心喔。',
      done: '好漂亮。你先帶著，見到媽媽就給她。',
    },
  },

  // ── 鼴鼠礦工（古樹根洞）──
  q24: {
    name: '根洞的落石',
    npc: 'mole',
    req: { lv: 7 },
    type: 'kill',
    target: 'woodsnail',
    count: 10,
    reward: { exp: 280, potions: { nut: 2 }, gold: 120 },
    lines: {
      offer: '樹皮龜滾來滾去，把坑道撞塌了。\n幫我打 10 隻。',
      progress: '牠縮殼時打不動，等牠探頭再打。',
      done: '坑道保住了。進殿堂前吃顆硬殼果。',
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
      offer: '女王大人最喜歡花瓣蝶的花瓣。\n幫我收 5 片，我想做成花束。',
      progress: '花瓣蝶在根洞最深處，花瓣會割人。',
      done: '好香。這個護符，是女王大人送我的。',
    },
  },

  // ═════════ 第二章 潮風海岬（Lv 11–20）═════════
  q30: {
    name: '今天的晚餐', npc: 'otter', req: { lv: 11 }, type: 'kill', target: 'sandcrab', count: 12,
    reward: { exp: 450, gold: 220 },
    lines: {
      offer: '卷軸寄居蟹亂射符文，魚都嚇跑了。\n幫我趕走 12 隻，晚餐分你一半！',
      progress: '牠射的光會拐彎追你，別站著看。',
      done: '魚回來了！金葉拿去。',
    },
  },
  q31: {
    name: '亮晶晶的貨', npc: 'gullmerchant', req: { lv: 12 }, type: 'collect', item: 'jellydrop', count: 8,
    reward: { exp: 500, potions: { mpL: 3 } },
    lines: {
      offer: '鬼火芯裝進瓶子，晚上會自己亮。\n燈塔不亮，大家搶著買。收 8 顆。',
      progress: '鬼火熄掉時牠會瞬移，亮起來會電人。',
      done: '品質一流。大藍花蜜拿去。',
    },
  },
  q32: {
    name: '曬太陽的好位置', npc: 'starfish', req: { lv: 13 }, type: 'kill', target: 'gullchick', count: 12,
    reward: { exp: 560, gold: 260 },
    lines: {
      offer: '呼啊……巫師海鷗擋住我的太陽……\n請牠們換個地方飄……12 隻就好……',
      progress: '看到斗篷的影子就躲……牠會壓下來……',
      done: '呼啊……太陽回來了……',
    },
  },
  q35: {
    name: '燈塔的光', npc: 'seal', req: { lv: 15 }, type: 'boss', target: 'hermitCrab', count: 1, main: true,
    reward: { exp: 3000, gold: 800 },
    lines: {
      offer: '老蟹在浪花礁岩後面的巢灣。\n去跟他打一場。他會高興的。',
      progress: '他縮進燈塔時，繞到背後打那扇窗。',
      done: '……他笑著走的？像他。',
      epilogue: ['……老骨頭划得慢，你們打完啦。', '吵了五十年。明天起來，不知道要罵誰。', '往東是赤岩峽谷。那裡的火山醒了。'],
    },
  },
  q33: {
    name: '我也想發光', npc: 'pufferkid', req: { lv: 15 }, type: 'collect', item: 'glowgel', count: 5,
    reward: { exp: 700, potions: { acorn: 2 } },
    lines: {
      offer: '槍騎魟魚的斷槍尖綁在身上，能飛嗎？\n幫我拿 5 支！我、我是在忙！',
      progress: '牠會從天上斜斜衝下來，小心！',
      done: '噗——我飄起來一點點了！橡實給你。',
    },
  },
  q34: {
    name: '畫不完的海', npc: 'octopus', req: { lv: 16 }, type: 'collect', item: 'shellpiece', count: 6,
    reward: { exp: 800, equip: { base: 'charm3', rarity: 'rare' } },
    lines: {
      offer: '我的下一幅畫要畫「爆炸」！\n幫我拿 6 顆符文鸚鵡螺的碎殼。',
      progress: '符文全亮起來就會炸，快跑！',
      done: '亮晶晶的！這個護符送你。',
    },
  },
  q36: {
    name: '補給線', npc: 'pelican', req: { lv: 18 }, type: 'kill', target: 'coralcrab', count: 12,
    reward: { exp: 1100, potions: { hpL: 5 } },
    lines: {
      offer: '封印海星在補給箱上蓋封印。\n幫我教訓 12 隻！',
      progress: '牠跳起來就要蓋封印，法陣別踩！',
      done: '補給線保住了！漿果算我請你。',
    },
  },

  // ═════════ 第三章 赤岩峽谷（Lv 21–30）═════════
  q50: {
    name: '溫泉毛巾', npc: 'capybara', req: { lv: 21 }, type: 'collect', item: 'towel', count: 8,
    reward: { exp: 1100, potions: { hpXL: 2 } },
    lines: {
      offer: '……引力犰狳……把鐵桶都吸走了……\n……拿 8 顆引力水晶回來……不急……',
      progress: '……被吸過去……就往反方向走……',
      done: '……鐵桶回來了……今天的湯免費……',
    },
  },
  q51: {
    name: '放哨', npc: 'meerkat', req: { lv: 22 }, type: 'kill', target: 'pebble', count: 15,
    reward: { exp: 1200, gold: 500 },
    lines: {
      offer: '報告！狂戰士岩在谷口越吵越大顆！\n請求支援，目標 15 隻！',
      progress: '報告！牠氣到冒煙就會衝過來！',
      done: '報告！谷口恢復安靜。敬禮！',
    },
  },
  q52: {
    name: '帶路費', npc: 'parrot', req: { lv: 23 }, type: 'kill', target: 'springmonkey', count: 12,
    reward: { exp: 1400, gold: 600 },
    lines: {
      offer: '引力犰狳把指南針吸壞了！壞了！\n趕走 12 隻，帶路免費！免費！',
      progress: '牠縮成球滾過來就跳！跳！',
      done: '指南針會轉了！會轉了！',
    },
  },
  q53: {
    name: '燒烤料理', npc: 'redpanda', req: { lv: 24 }, type: 'collect', item: 'emberscale', count: 8,
    reward: { exp: 1600, potions: { acorn: 3 } },
    lines: {
      offer: '炎劍蜥背上的碎片，一碰就著。\n幫我拿 8 片，我要做新菜。',
      progress: '牠會帶著火衝過來，火痕別踩！',
      done: '完美的火種！秘密調味料送你。',
    },
  },
  q54: {
    name: '誰比較快', npc: 'greymane', req: { lv: 25 }, type: 'kill', target: 'moltenlizard', count: 15,
    reward: { exp: 1900, gold: 700 },
    lines: {
      offer: '……來比一場。誰先打倒 15 隻三頭術士蛇。\n輸的人，別再跟著我。',
      progress: '……三顆頭一起噴火，你連這都躲不掉？',
      done: '……算你厲害。我不需要金葉。',
    },
  },
  q55: {
    name: '蒸氣裡的藥草', npc: 'goat', req: { lv: 26 }, type: 'collect', item: 'rockheart', count: 6,
    reward: { exp: 2100, equip: { base: 'charm5', rarity: 'rare' } },
    lines: {
      offer: '戰鎚甲蟲的碎片，能治燙傷。\n灰色的孩子需要 6 顆。他不會開口。',
      progress: '牠落地震出波的時候，跟著跳。',
      done: '他收下了，說了謝謝。很小聲。',
    },
  },
  q56: {
    name: '醒來的火山', npc: 'oldmonkey', req: { lv: 27 }, type: 'boss', target: 'lavaTortoise', count: 1, main: true,
    reward: { exp: 6000, gold: 1500 },
    lines: {
      offer: '葉子掉進甲龜背上的火山口，火山醒了。\n……孩子，峽谷交給你了。',
      progress: '看到地上的影子就跑；牠翻滾時跳上平台。',
      done: '火山睡著了。辛苦了，孩子。',
      epilogue: ['……火山睡了。七十年，第一次這麼安靜。', '回營地吧。前面的路，會越來越冷。'],
    },
  },
  q57: {
    name: '坑道裡的熱氣', npc: 'armadillo', req: { lv: 28 }, type: 'kill', target: 'fireiguana', count: 12,
    reward: { exp: 2600, potions: { hpXL: 3 } },
    lines: {
      offer: '重鎧山羊一直用頭撞我的坑道。\n幫我打 12 隻！',
      progress: '牠低頭就是要衝了，快閃！',
      done: '坑道保住了。',
    },
  },
};
