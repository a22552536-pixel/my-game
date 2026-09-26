// 任務資料。type：kill 打倒、collect 收集、boss 討伐、visit 前往某張地圖。
// 每個怪物系列有一條 3 段的任務鏈，分給三位 NPC：
//   刺蝟婆婆：蝸牛系 + 主線      貓頭鷹商人：菇系      松鼠信差：草精系 + 跑腿探索
// 任務 id 沿用舊存檔的 q1～q4，新任務從 q5 開始。
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
  q5: {
    name: '青苔地毯',
    npc: 'hedgehog',
    req: { lv: 4, quest: 'q1' },
    type: 'collect',
    item: 'moss',
    count: 6,
    reward: { exp: 150, potions: { hp: 5 } },
    lines: {
      offer: '婆婆的窩冬天好冷。苔殼蝸背上的青苔又軟又暖，幫我帶 6 片回來好嗎？蘑菇林地的上層就有。',
      progress: '青苔要挑乾淨的喔，婆婆的鼻子很靈的。',
      done: '好軟呀……今年冬天不怕冷了。這些紅漿果收下吧。',
    },
  },
  q6: {
    name: '會走路的樹樁',
    npc: 'hedgehog',
    req: { lv: 8, quest: 'q5' },
    type: 'kill',
    target: 'woodsnail',
    count: 8,
    reward: { exp: 350, gold: 150, equip: { base: 'mane2', rarity: 'rare' } },
    lines: {
      offer: '古樹根洞裡有背著樹樁的古木蝸，牠們會把小動物的洞口堵住。打倒 8 隻，把路清出來吧。',
      progress: '古木蝸被打會縮進殼裡，等牠探出頭再打，比較省力。',
      done: '路通了，小動物們都在謝謝你呢。這是婆婆織的鬃飾，戴上會暖和一點。',
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
    req: { lv: 2 },
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
  q7: {
    name: '脾氣不好的斑點菇',
    npc: 'owl',
    req: { lv: 5, quest: 'q2' },
    type: 'kill',
    target: 'spotshroom',
    count: 12,
    reward: { exp: 220, gold: 120 },
    lines: {
      offer: '咕……斑點菇把我的貨車撞翻了，還在木漏日深谷橫衝直撞。教訓 12 隻，運費我照付。',
      progress: '斑點菇被打會直直衝過來，跳起來就躲得掉，咕。',
      done: '咕咕，貨車終於能上路了。這是說好的運費。',
    },
  },
  q8: {
    name: '會發光的燈芯',
    npc: 'owl',
    req: { lv: 9, quest: 'q7' },
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
    req: { lv: 3 },
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
    req: { lv: 6, quest: 'q9' },
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
  q10: {
    name: '花冠的祕密',
    npc: 'squirrel',
    req: { lv: 9, quest: 'q3' },
    type: 'collect',
    item: 'petal',
    count: 5,
    reward: { exp: 380, potions: { hp: 10 } },
    lines: {
      offer: '聽說花冠精頭上的花瓣可以寫信給很遠很遠的人……說不定能寄到天上喔？幫我收集 5 片！',
      progress: '花冠精會丟花瓣，被打到還挺痛的吧？',
      done: '好香……我試著寫一封信給天上的你的家人好了。這些紅漿果是謝禮！',
    },
  },

  // ── 松鼠信差：跑腿探索 ──
  q11: {
    name: '送信到深谷',
    npc: 'squirrel',
    req: { lv: 3 },
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
  q12: {
    name: '根洞的回音',
    npc: 'squirrel',
    req: { lv: 6, quest: 'q11' },
    type: 'visit',
    target: '1-4',
    count: 1,
    reward: { exp: 160, gold: 80 },
    lines: {
      offer: '古樹根洞裡有人在喊「有沒有信」……我不敢進去，你幫我去看看？',
      progress: '古樹根洞在木漏日深谷再往右。裡面有點暗，小心腳下！',
      done: '原來是回音啊……害我緊張了一整天，嘿嘿。謝謝你！',
    },
  },
};
