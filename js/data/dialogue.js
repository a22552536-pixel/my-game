// NPC 與敘事文字。
G.data.npcs = {
  owl: {
    name: '貓頭鷹商人',
    art: 'owl',
    role: 'shop',
    shop: 'owl',
    lines: ['咕咕，旅途要帶夠果子和花蜜。', '嗯？不要的裝備也可以賣給我，咕。'],
  },
  hedgehog: {
    name: '刺蝟婆婆',
    art: 'hedgehog',
    role: 'quest',
    lines: ['小獅子，你是從天上掉下來的吧？婆婆看見了喔。', '森林很大，別急。'],
  },
  squirrel: {
    name: '松鼠信差',
    art: 'squirrel',
    role: 'travel',
    lines: ['我跑遍每一個營地！等你找到下一個營地，就能叫我帶你過去。', '現在只知道這個營地……森林外面長什麼樣子呢？'],
  },
};

G.data.story = {
  intro: [
    { scene: 'storm', text: '雲海之上，有一座漂浮的遺跡。小鬃就在那裡出生。' },
    { scene: 'fall', text: '某一天，一陣暴風把牠吹離了家，一路往下墜……' },
    { scene: 'wake', text: '醒來時，四周是陌生的森林。抬頭望去，家在很高、很高的地方。' },
  ],
  regions: {
    1: { name: '苔光森林', sub: '陽光從葉縫間灑落的地方' },
  },
  bossDefeated: {
    queenShroom: '菇菇女王倒下了。一片星楓葉輕輕飄落，停在小鬃的鬃毛上，微微發著光。',
  },
  m1End: {
    title: '第一片星楓葉',
    text: '星楓葉的光芒在體內流動，小鬃感覺自己快要改變了……\n\n這是 M1 試玩版的終點。一轉進化將在下一個版本開放。\n你可以繼續練等、刷裝備，女王菇在你重新進入殿堂時會再次出現。',
  },
};
