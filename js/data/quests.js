// 任務資料。type：kill 打倒、collect 收集、boss 討伐、visit 前往某張地圖。
// 第一區共 7 個任務，照等級一個接一個解鎖，同時最多 2 個在進行（主線另計）：
//   Lv1 露珠蝸 → Lv3 孢子粉 → Lv4 種子殼 → Lv5 送信到深谷 → Lv6 嫩芽精 → Lv8 發光燈芯
//   Lv8 起可以接主線「森林的女王」
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
      offer: '你想回天上？……古樹根洞的盡頭住著菇菇女王，她守著一片會發光的星楓葉。打倒她，也許你就能往上走了。',
      progress: '女王的殿堂在古樹根洞的最右邊。她跳起來的時候，記得跟著跳。',
      done: '真的是星楓葉……它認得你呢。往上的路，就交給你自己了。',
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
};
