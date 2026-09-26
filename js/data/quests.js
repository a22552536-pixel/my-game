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
      epilogue: ['……呼，婆婆的腳程慢，總算趕上了。', '女王走的時候，孢子飄滿了整個根洞，像下了一場很輕很輕的雪。', '她本來是這片森林最溫柔的菇，是那片葉子太亮，把她的心照迷路了。', '菇菇那孩子，婆婆會帶她來根洞口種花。女王交代的事，森林不會忘。', '你鬃毛上的綠光，是女王還給你的，也是森林借給你的。好好帶著它。', '往海邊去吧，第二片葉子落在燈塔那頭。婆婆在營地替你留著燈。'],
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
      offer: '嘿嘿，我在收集種子殼，拿來裝信剛剛好！蘑菇林地的種子精身上就有，幫我帶 6 個回來？',
      progress: '種子精跳來跳去的對吧？我也追不到牠們，嘿嘿。',
      done: '哇，每個都圓圓的！以後我的信都用種子殼裝。謝啦！',
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

  // ═════════ 第二章 潮風海岬（Lv 11–20）═════════
  q30: {
    name: '今天的晚餐', npc: 'otter', req: { lv: 11 }, type: 'kill', target: 'sandcrab', count: 12,
    reward: { exp: 450, gold: 220 },
    lines: {
      offer: '哎呀，今天一條魚都沒釣到！沙粒蟹把魚都嚇跑了！幫我趕走 12 隻，晚餐分你一半——雖然現在是零條的一半。',
      progress: '沙粒蟹橫著走，你也橫著追！哈哈！',
      done: '魚回來了！魚回來了！這些金葉是……上次釣到的金魚換的。真的！',
    },
  },
  q31: {
    name: '亮晶晶的貨', npc: 'gullmerchant', req: { lv: 12 }, type: 'collect', item: 'jellydrop', count: 8,
    reward: { exp: 500, potions: { mpL: 3 } },
    lines: {
      offer: '嘎！泡泡水母的凝膠做成的果凍，是燈塔岬的名產！幫我收 8 份，嘎！',
      progress: '泡泡水母慢吞吞的，很好抓，嘎！',
      done: '嘎嘎！品質一流！這幾瓶大藍花蜜拿去，做生意要講義氣！',
    },
  },
  q32: {
    name: '曬太陽的好位置', npc: 'starfish', req: { lv: 13 }, type: 'kill', target: 'gullchick', count: 12,
    reward: { exp: 560, gold: 260 },
    lines: {
      offer: '呼啊……海鷗雛一直在我身上跳……可以請牠們換個地方玩嗎……12 隻就好……',
      progress: '呼啊……還有好幾隻在跳……',
      done: '呼啊……終於可以躺平了……這些金葉是退潮時撿的……拿去吧……',
    },
  },
  q35: {
    name: '燈塔的光', npc: 'seal', req: { lv: 15 }, type: 'boss', target: 'hermitCrab', count: 1, main: true,
    reward: { exp: 3000, gold: 800 },
    lines: {
      offer: '那個臭老蟹在浪花礁岩後面的巢灣。你去……你去跟他打一場。他會很高興的，他一直想再痛快打一架。',
      progress: '他縮進燈塔裡的時候，正面打不動。繞到背後，打那扇窗，我以前就是那樣贏他的。',
      done: '……他笑著走的？哈……像他。這份獎勵收下。燈塔，我會替他亮著。',
      epilogue: ['……嘿，老骨頭划水划得慢，你們已經打完啦。', '那臭老蟹，年輕時跟我搶燈塔搶了一整個夏天。我守燈，他守浪，誰也不服誰。', '他說燈塔歸我了？……傻瓜，燈塔從來不是誰的，是給迷路的船看的。', '可我知道他為什麼想發光。他只是想讓人記得，這片海上也有他。', '今晚我會多點一盞燈，照著他沉下去的那片浪。', '小獅子，往東是赤岩峽谷，那裡的火山醒了。帶著他的藍光去吧，他會喜歡的。'],
    },
  },
  q33: {
    name: '我也想發光', npc: 'pufferkid', req: { lv: 15 }, type: 'collect', item: 'glowgel', count: 5,
    reward: { exp: 700, potions: { acorn: 2 } },
    lines: {
      offer: '燈籠水母的螢光液塗在身上，是不是就會發光？你幫我拿 5 瓶！我、我不是怕去，我是在忙！',
      progress: '燈籠水母碰到會電人喔！你小心！……我才沒有擔心你！',
      done: '噗——！我發光了！我發光了！這個給你，是我最寶貝的力量橡實！',
    },
  },
  q34: {
    name: '畫不完的海', npc: 'octopus', req: { lv: 16 }, type: 'collect', item: 'shellpiece', count: 6,
    reward: { exp: 800, equip: { base: 'charm3', rarity: 'rare' } },
    lines: {
      offer: '我需要貝殼片當調色盤！貝甲蟹背上的扇貝最漂亮，幫我拿 6 片！',
      progress: '貝甲蟹縮起來的時候打不動，等牠探出頭再打！',
      done: '噢！這個光澤！我要畫一百幅畫！這個護符送你，是我畫第一幅畫時戴的。',
    },
  },
  q36: {
    name: '補給線', npc: 'pelican', req: { lv: 18 }, type: 'kill', target: 'coralcrab', count: 12,
    reward: { exp: 1100, potions: { hpL: 5 } },
    lines: {
      offer: '珊瑚蟹一直衝撞我的補給箱！幫我教訓 12 隻，大紅漿果算我請你！',
      progress: '珊瑚蟹被打之後會衝過來，閃開再打！',
      done: '補給線保住了！來，張開嘴——不對，是我張開嘴，給你拿漿果。',
    },
  },

  // ═════════ 第三章 赤岩峽谷（Lv 21–30）═════════
  q50: {
    name: '溫泉毛巾', npc: 'capybara', req: { lv: 21 }, type: 'collect', item: 'towel', count: 8,
    reward: { exp: 1100, potions: { hpXL: 2 } },
    lines: {
      offer: '……溫泉猴……把我的毛巾都拿去頂在頭上了……拿 8 條回來……不急……',
      progress: '……慢慢來……溫泉不會跑……',
      done: '……謝謝……這兩顆特大漿果……泡完溫泉再吃……最好吃……',
    },
  },
  q51: {
    name: '放哨', npc: 'meerkat', req: { lv: 22 }, type: 'kill', target: 'pebble', count: 15,
    reward: { exp: 1200, gold: 500 },
    lines: {
      offer: '報告！碎石丸一直滾進溫泉谷！請求支援！目標：15 隻！',
      progress: '報告！碎石丸滾起來很快！請注意閃避！',
      done: '報告！任務完成！……我可以跟你敬禮嗎？敬禮！',
    },
  },
  q52: {
    name: '帶路費', npc: 'parrot', req: { lv: 23 }, type: 'kill', target: 'springmonkey', count: 12,
    reward: { exp: 1400, gold: 600 },
    lines: {
      offer: '嘎！溫泉猴一直丟石頭！丟石頭！幫我趕走 12 隻，帶路免費！免費！',
      progress: '靠近再打！靠近再打！牠們只會遠遠丟！',
      done: '嘎！安靜了！安靜了！這些金葉拿去！拿去！',
    },
  },
  q53: {
    name: '燒烤料理', npc: 'redpanda', req: { lv: 24 }, type: 'collect', item: 'emberscale', count: 8,
    reward: { exp: 1600, potions: { acorn: 3 } },
    lines: {
      offer: '火苗蜥的鱗片是最好的炭！不用火也能烤！幫我拿 8 片，我要做新菜！',
      progress: '火苗蜥很溫馴，不會主動攻擊你的！',
      done: '好燙好燙！完美的炭！這三顆力量橡實是我的秘密調味料，送你！',
    },
  },
  q54: {
    name: '誰比較快', npc: 'greymane', req: { lv: 25 }, type: 'kill', target: 'moltenlizard', count: 15,
    reward: { exp: 1900, gold: 700 },
    lines: {
      offer: '……來比一場。誰先打倒 15 隻熔尾蜥，誰就是比較強的那個。輸的人，別再跟著我。',
      progress: '……慢死了。',
      done: '……算你厲害。拿去，我不需要金葉。',
    },
  },
  q55: {
    name: '蒸氣裡的藥草', npc: 'goat', req: { lv: 26 }, type: 'collect', item: 'rockheart', count: 6,
    reward: { exp: 2100, equip: { base: 'charm5', rarity: 'rare' } },
    lines: {
      offer: '咩……岩塊怪身體裡的岩心，磨成粉可以治燙傷。那隻灰色的小獅子需要它。幫我拿 6 顆。',
      progress: '岩塊怪很硬，縮起來的時候要等牠。',
      done: '咩……謝謝你。那孩子嘴巴很壞，可是他收下藥的時候，說了謝謝。這護符你拿著。',
    },
  },
  q56: {
    name: '醒來的火山', npc: 'oldmonkey', req: { lv: 27 }, type: 'boss', target: 'lavaTortoise', count: 1, main: true,
    reward: { exp: 6000, gold: 1500 },
    lines: {
      offer: '甲龜是這座峽谷的老住民，平常溫溫吞吞的。葉子掉進牠背上的火山口，火山就醒了。……孩子，峽谷交給你了。',
      progress: '看到地上的影子就跑，落石之後會留下熔岩。牠翻滾的時候，跳上平台。',
      done: '火山睡著了。……辛苦你了，孩子。泡個溫泉再走吧。',
      epilogue: ['……火山安靜了。老猴子在峽谷活了七十年，第一次聽見它睡得這麼沉。', '甲龜是峽谷最老的住民，牠背上的火，本來只是用來溫暖我們的溫泉。', '葉子讓那把火燒過了頭。牠一直忍著、一直等，等的就是你。', '那隻灰色的小獅子……我也看見了。牠不是壞孩子，牠只是也想要一個家。', '峽谷深處那座石獅像，長得跟你一模一樣。孩子，那裡有你還不知道的故事。', '先回營地泡個溫泉吧。前面的路會越來越冷，你要帶著這份溫度走。'],
    },
  },
  q57: {
    name: '坑道裡的熱氣', npc: 'armadillo', req: { lv: 28 }, type: 'kill', target: 'fireiguana', count: 12,
    reward: { exp: 2600, potions: { hpXL: 3 } },
    lines: {
      offer: '喀啦，炎鬣蜥對著坑道噴火，我都快變成烤犰狳了！打 12 隻！',
      progress: '牠張開頸圈的時候就是要噴火了，快閃！',
      done: '喀啦喀啦！涼快多了！特大漿果收好，火山巢裡用得到！',
    },
  },
};

// 經驗值倍率（見 balance.expScale）
(function () {
  const k = G.data.balance.expScale;
  for (const id in G.data.quests) {
    const r = G.data.quests[id].reward;
    if (r && r.exp) r.exp = Math.round(r.exp * k);
  }
})();
