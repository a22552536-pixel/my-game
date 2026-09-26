// 任務資料。type：kill 打倒、collect 收集、boss 討伐、visit 前往某張地圖。
// 第一區：每位 NPC 都有自己的任務（營地 6 位＋狩獵場 3 位），照等級錯開解鎖：
//   Lv1 刺蝟婆婆（露珠蝸）      Lv2 龜爺爺（露珠）        Lv2 青蛙（小傘菇，蘑菇林地）
//   Lv3 貓頭鷹（孢子粉）        Lv4 松鼠（種子殼）        Lv5 小栗（柔軟青苔）
//   Lv5 松鼠（送信到深谷）      Lv6 松鼠（嫩芽精）        Lv6 小鹿（嫩芽藤蔓，木漏日深谷）
//   Lv7 鼴鼠（古木蝸，古樹根洞）Lv8 貓頭鷹（發光燈芯）    Lv8 主線「森林的女王」
//   Lv9 菇菇（花冠花瓣）
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
      offer: '露珠蝸把小徑的草都啃光了……幫婆婆趕走 10 隻好嗎？牠們就在營地左邊。',
      progress: '露珠蝸還在啃草呢，慢慢來，別累著了。',
      done: '哎呀，小徑乾淨多了！這些金葉拿去買果子吃吧。',
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
      offer: '你在找天上掉下來的葉子？……那道綠光落在古樹根洞的盡頭，被菇菇女王吞了下去，從此她就變了個人。葉子吞下去就拿不出來了……孩子，你明白婆婆的意思嗎？',
      progress: '女王的殿堂在古樹根洞的最右邊。她跳起來的時候，記得跟著跳。',
      done: '……辛苦你了。這片葉子認得你呢，在你的鬃毛上發光。別忘了她，好嗎？',
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
      offer: '咕。藍花蜜要加一點孢子粉才夠香。蘑菇林地的小傘菇身上就有，帶 8 包回來，我分你幾瓶。',
      progress: '咕咕，孢子粉還不夠。小傘菇會跳，別追丟了。',
      done: '咕！品質不錯。這幾瓶藍花蜜是你的了，做生意要講信用。',
    },
  },
  q8: {
    name: '會發光的燈芯',
    npc: 'owl',
    req: { lv: 8, quest: 'q3' },
    type: 'collect',
    item: 'wick',
    count: 5,
    reward: { exp: 380, equip: { base: 'charm2', rarity: 'rare' } },
    lines: {
      offer: '咕，晚上擺攤太暗了。古樹根洞的提燈菇身上有會發光的燈芯，帶 5 根回來，我拿好東西跟你換。',
      progress: '提燈菇會從遠處丟孢子，靠近一點再打，咕。',
      done: '咕咕咕！這樣晚上也能做生意了。這個護符給你，是我壓箱底的貨。',
    },
  },

  // ── 松鼠信差：草精系 ──
  q9: {
    name: '種子搬家',
    npc: 'squirrel',
    req: { lv: 4, quest: 'q2' },
    type: 'collect',
    item: 'seedshell',
    count: 6,
    reward: { exp: 110, gold: 60 },
    lines: {
      offer: '嘿嘿，我在收集種子殼，拿來裝信剛剛好！蘑菇林地的種子精身上就有，幫我帶 6 個回來？',
      progress: '種子精跳來跳去的對吧？我也追不到牠們，嘿嘿。',
      done: '哇，每個都圓圓的！以後我的信都用種子殼裝。謝啦！',
    },
  },
  q3: {
    name: '不安分的草精',
    npc: 'squirrel',
    req: { lv: 6, quest: 'q11' },
    type: 'kill',
    target: 'sproutling',
    count: 15,
    reward: { exp: 300, gold: 150, equip: { base: 'claw2', rarity: 'rare' } },
    lines: {
      offer: '送信的時候一直被嫩芽精用藤鞭打，屁股好痛！牠們住在木漏日深谷和古樹根洞，拜託教訓 15 隻！',
      progress: '嫩芽精的藤鞭很長，別站在牠正前方喔！',
      done: '終於可以安心送信了！這副石爪套是客人寄錯地址的，送你吧，嘿嘿。',
    },
  },

  // ── 松鼠信差：跑腿探索 ──
  q11: {
    name: '送信到深谷',
    npc: 'squirrel',
    req: { lv: 5, quest: 'q9' },
    type: 'visit',
    target: '1-3',
    count: 1,
    reward: { exp: 90, gold: 50 },
    lines: {
      offer: '我今天信太多了，幫我跑一趟木漏日深谷好不好？走到那裡就算送到了！',
      progress: '木漏日深谷在蘑菇林地的右邊，一直往右走就對了！',
      done: '送到了？太快了吧！你是不是也會飛呀？',
    },
  },

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
      offer: '呵呵……老頭子想喝一杯露珠泡的茶。露珠蝸殼上的露珠最乾淨，幫我收 5 顆好嗎？喝茶的時候，我講個故事給你聽。',
      progress: '不急不急，露珠又不會跑。……好吧，蝸牛會跑，但跑得很慢。',
      done: '好茶。……一百年前，也有一隻小獅子坐在這裡喝茶。牠的鬃毛是金色的，話很少，喝完就走了。這個故事，我們以後慢慢講。',
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
      offer: '呱！小傘菇整天在我頭上跳來跳去，我的採集籃都被踩扁了。幫我打 12 隻，讓牠們安靜一點，呱。',
      progress: '牠們跳起來的時候最好打，呱。',
      done: '終於安靜了，呱呱！這些金葉是我賣蘑菇……呃，賣野花賺的，拿去吧。',
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
      offer: '我想做一張跟奶奶一樣軟的床！苔殼蝸背上的青苔最軟了，可是奶奶不讓我去……你幫我拿 4 塊好不好？拜託拜託！',
      progress: '苔殼蝸在蘑菇林地的上面，還有深谷裡！你好厲害喔，什麼都知道。',
      done: '哇——好軟！這兩顆力量橡實給你，是我的寶物喔！吃了會變很有力氣！',
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
      offer: '我想編一條項鍊，等找到媽媽的時候送給她。嫩芽精的藤蔓會自己捲起來，編起來一定很漂亮……你可以幫我拿 6 條嗎？',
      progress: '嫩芽精的鞭子很痛，你要小心喔。',
      done: '好漂亮……媽媽一定會喜歡。如果、如果你比我先找到她，可以幫我把項鍊交給她嗎？我先幫你保管，等你要出發的時候再拿給你。',
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
      offer: '嘿咻，古木蝸一縮殼就滾來滾去，把我挖好的坑道都撞塌了。幫我打 10 隻，補給算你便宜點……好啦，送你兩顆硬殼果。',
      progress: '牠縮進殼裡的時候打不動，等牠探出頭再打，嘿咻。',
      done: '坑道保住了！硬殼果收好，進女王殿堂前吃一顆，挨打會少痛一點。',
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
      offer: '女王大人最喜歡花冠精的花瓣了……你可以幫我收 5 片嗎？我想做成花束。也許聞到花香，女王大人會想起我。',
      progress: '花冠精住在古樹根洞的最深處，牠們會丟花瓣……好痛的那種。',
      done: '好香……謝謝你。這個護符是女王大人以前送我的，你帶著吧。如果你見到她……請把花香帶給她。',
    },
  },
};
