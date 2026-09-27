// NPC 與敘事文字。劇情的唯一依據是 docs/STORY.md（劇情聖經 v3，寫實、兩層反轉、單一中性結局）。
// talk：NPC 的閒聊台詞，依進度切換。每一組可以加上條件，符合條件的最後一組會被使用：
//   { done: '任務 id' }  任務已完成
//   { level: n }         等級達到 n
//   { flag: '旗標' }     例如 queenShroomDefeated
// 這裡是第一～三章 NPC 的基本台詞；人物弧線（依委託／Boss 變化的台詞）在 js/data/npcstory.js，會覆蓋這裡。
G.data.npcs = {
  owl: {
    name: '貓頭鷹商人',
    art: 'owl',
    role: 'shop',
    shop: 'owl',
    shopName: '貓頭鷹的小舖',
    talk: [
      { text: ['旅途要帶夠果子和花蜜。\n用不到的裝備，也可以賣給我。', '怪物掉的露珠、菇傘、樹皮，\n拿來換東西，比直接賣掉划算。咕。'] },
      { if: { done: 'q2' }, text: ['孢子粉做的花蜜，客人說好喝。'] },
      { if: { flag: 'queenShroomDefeated' }, text: ['女王的孢子冠？拿一片來，\n再加 5 根燈芯，跟你換女王的寶物。', '女王以前常來買花蜜。\n這幾天，花蜜賣不太掉。'] },
    ],
  },
  hedgehog: {
    name: '刺蝟婆婆',
    art: 'hedgehog',
    role: 'quest',
    talk: [
      { text: ['從天上掉下來的吧。婆婆看見了。\n森林很大，別急。'] },
      { if: { flag: 'queenShroomDefeated' }, text: ['葉子在你身上發光呢。\n今年的花，謝得早了一點。'] },
      { if: { flag: 'lavaTortoiseDefeated' }, text: ['他走得很快。\n一個冬天。'] },
    ],
  },
  frog: {
    name: '青蛙採集家',
    art: 'frog',
    role: 'talk',
    talk: [
      { text: ['特別大隻的別硬打。\n牠掉的東西也特別好。呱。', '最上層有橡實鼠，跑得很快。'] },
      { if: { level: 6 }, text: ['深谷的小野豬脾氣很差。\n你可以去了吧？'] },
    ],
  },
  fawn: {
    name: '迷路的小鹿',
    art: 'fawn',
    role: 'talk',
    talk: [
      { text: ['你有看到很大的白色鹿嗎？\n那是我媽媽。', '左邊那朵紅色大蘑菇，\n可以把人彈得很高。'] },
      { if: { flag: 'queenShroomDefeated' }, text: ['聽說媽媽在很冷的雪山上。\n你先到的話，跟她說我很好。'] },
    ],
  },
  mole: {
    name: '鼴鼠礦工',
    art: 'mole',
    role: 'shop',
    shop: 'mole',
    shopName: '鼴鼠的補給站',
    talk: [
      { text: ['女王跳起來，地面會震出一道波。\n跟著跳就躲得掉。', '紫色的孢子雲會讓你變慢，\n別站在裡面。'] },
      { if: { flag: 'queenShroomDefeated' }, text: ['根洞安靜了。\n土，比上個月硬。'] },
    ],
  },
  turtle: {
    name: '龜爺爺',
    art: 'turtle',
    role: 'talk',
    talk: [
      { text: ['呵呵……又一隻從天上掉下來的。\n坐吧，茶還熱著。'] },
      { if: { flag: 'queenShroomDefeated' }, text: ['往海的方向走吧。\n慢慢走。'] },
    ],
  },
  hedgekid: {
    name: '小栗',
    art: 'hedgekid',
    role: 'talk',
    talk: [
      { text: ['你是獅子？真的嗎？你會吼嗎？'] },
      { if: { level: 4 }, text: ['營地左邊撿到的橡實，\n吃了會變很有力氣。'] },
      { if: { flag: 'queenShroomDefeated' }, text: ['菇菇一直在哭。\n你是不是打了女王？'] },
    ],
  },
  mushgirl: {
    name: '菇菇',
    art: 'mushgirl',
    role: 'talk',
    talk: [
      { text: ['女王大人的宮裡，一直是春天。\n她已經不認得我了。'] },
      { if: { flag: 'queenShroomDefeated' }, text: ['我在根洞口種了花。\n今年的花，謝得好早。'] },
    ],
  },
  // ═════════ 第二章 潮風海岬 ═════════
  seal: {
    name: '海豹爺爺',
    art: 'seal',
    role: 'quest',
    talk: [
      { text: ['燈塔？三天沒亮了。\n巢灣的老蟹，背走了那道藍光。'] },
      { if: { flag: 'hermitCrabDefeated' }, text: ['燈塔我點起來了。\n潮水沒有回來。'] },
    ],
  },
  otter: {
    name: '海獺漁夫',
    art: 'otter',
    role: 'quest',
    talk: [
      { text: ['新面孔？\n我是這一帶最會釣魚的海獺。'] },
      { if: { flag: 'hermitCrabDefeated' }, text: ['老蟹以前常偷我的魚。\n以後沒人偷了。'] },
    ],
  },
  gullmerchant: {
    name: '海鷗商人',
    art: 'gullmerchant',
    role: 'shop',
    shop: 'gull',
    shopName: '海鷗的雜貨舖',
    talk: [
      { text: ['要買什麼？藥水、羽毛都有。\n材料拿來，我跟你換好東西。嘎。'] },
      { if: { flag: 'hermitCrabDefeated' }, text: ['燈塔的碎片？拿來，\n我用燈塔的寶物跟你換。'] },
    ],
  },
  pufferkid: {
    name: '小河豚',
    art: 'pufferkid',
    role: 'quest',
    talk: [
      { text: ['我生氣的時候會變很大。噗——\n可是變大也不會發光。'] },
      { if: { flag: 'hermitCrabDefeated' }, text: ['老蟹爺爺以前讓我躲在殼裡。'] },
    ],
  },
  starfish: {
    name: '海星',
    art: 'starfish',
    role: 'quest',
    talk: [
      { text: ['今天的太陽也好舒服……呼啊。'] },
      { if: { level: 15 }, text: ['海星斷了手，會再長出來。\n有些東西不會。'] },
    ],
  },
  octopus: {
    name: '章魚畫家',
    art: 'octopus',
    role: 'quest',
    talk: [
      { text: ['別動，就這個角度。\n你的鬃毛在夕陽下很好看。'] },
      { if: { flag: 'hermitCrabDefeated' }, text: ['潮退得太遠了。\n海岸線，每天都要重畫一次。'] },
    ],
  },
  pelican: {
    name: '鵜鶘補給員',
    art: 'pelican',
    role: 'shop',
    shop: 'pelican',
    shopName: '鵜鶘的嘴巴補給站',
    talk: [
      { text: ['老蟹的浪會從兩邊打過來，\n記得跳。', '他縮進燈塔的時候，\n繞到背後打那扇窗戶。'] },
      { if: { level: 17 }, text: ['有隻灰色的小獸，\n問我有沒有看過會發光的葉子。'] },
    ],
  },

  // ═════════ 第三章 赤岩峽谷 ═════════
  oldmonkey: {
    name: '老猴子',
    art: 'oldmonkey',
    role: 'quest',
    talk: [
      { text: ['泡個溫泉吧，你的毛都結塊了。\n火山最近醒了。'] },
      { if: { level: 24 }, text: ['峽谷深處有一座石獅像。\n有人朝它吐口水，有人替它擦灰。'] },
      { if: { flag: 'lavaTortoiseDefeated' }, text: ['火山睡了。\n溫泉，涼了一點。'] },
    ],
  },
  capybara: {
    name: '水豚掌櫃',
    art: 'capybara',
    role: 'shop',
    shop: 'capybara',
    shopName: '水豚溫泉屋',
    talk: [
      { text: ['……歡迎光臨……\n要泡湯，還是買東西……慢慢來……'] },
    ],
  },
  redpanda: {
    name: '小熊貓廚師',
    art: 'redpanda',
    role: 'quest',
    talk: [
      { text: ['只要有溫泉，什麼都能煮。\n火山一醒，客人都不敢來了。'] },
      { if: { flag: 'lavaTortoiseDefeated' }, text: ['客人回來了。\n溫泉蛋，要煮得比以前久。'] },
    ],
  },
  meerkat: {
    name: '狐獴小哨兵',
    art: 'meerkat',
    role: 'quest',
    talk: [
      { text: ['報告，東邊沒有異狀。\n西邊有一隻灰色的，溜進谷裡了。'] },
    ],
  },
  parrot: {
    name: '鸚鵡嚮導',
    art: 'parrot',
    role: 'quest',
    talk: [
      { text: ['赤岩裂谷！蒸氣隘道！嘎！\n帶路要收費。先幫我趕走猴子。'] },
    ],
  },
  goat: {
    name: '山羊採藥人',
    art: 'goat',
    role: 'quest',
    talk: [
      { text: ['蒸氣隘道的藥草，\n要泡過地熱才長得出來。'] },
    ],
  },
  greymane: {
    name: '灰鬃',
    art: 'greymane',
    role: 'quest',
    talk: [
      { text: ['……你也在找葉子。\n別擋我的路。'] },
      { if: { done: 'q54' }, text: ['我的村子，上一個百年就收乾了。\n我媽媽，在一個冬天裡老死。'] },
      { if: { flag: 'lavaTortoiseDefeated' }, text: ['上一隻獅子，\n也是這樣笑著走的。'] },
    ],
  },
  armadillo: {
    name: '犰狳礦工',
    art: 'armadillo',
    role: 'shop',
    shop: 'armadillo',
    shopName: '犰狳的坑道補給',
    talk: [
      { text: ['甲龜噴發前，地上會先出現黑影。\n看到影子就跑。', '牠縮殼翻滾會撞牆反彈，\n站在平台上就安全了。'] },
    ],
  },

  squirrel: {
    name: '松鼠信差',
    art: 'squirrel',
    role: 'travel',
    talk: [
      { text: ['我跑遍每一個營地。\n找到下一個營地，就能叫我帶路。'] },
      { if: { flag: 'queenShroomDefeated' }, text: ['營地裡有人在哭，\n也有人鬆了一口氣。'] },
    ],
  },
};

// 主線故事。唯一依據是 docs/STORY.md（劇情聖經 v3：寫實、兩層反轉、沒有對錯、單一中性結局）。
// 字數規則（STORY.md 第 0 節）：Boss 遺言最多 3 句、章末卡最多 3 行、每行不超過 20 個全形字。
// 真相靠畫面（土地變老、龜爺爺的空椅子、停住的時鐘），這裡的字只補一刀，不解釋。
// 第四章、終章的章節文字、Boss 遺言與結局寫在 js/data/story45.js，會覆蓋這裡的 chapters[4]、chapters[5] 與 ending。
G.data.story = {
  intro: [
    { shot: 'throne', text: '一百年前，上一隻守葉獸走下了王座。' },
    { shot: 'sky', text: '雲海上，有一座浮著的神殿。' },
    { shot: 'tree', text: '神殿中央的樹，是這個世界的時鐘。' },
    { shot: 'nap', text: '樹下，睡著新的守葉獸。' },
    { shot: 'wind', text: '一百年到了。' },
    { shot: 'scatter', text: '五片葉子，落向地上。' },
    { shot: 'fall', text: '他也跟著落了下去。' },
    { shot: 'wake', text: '醒來時，神殿正在下沉。' },
    { shot: 'title', text: '把葉子帶回去。' },
  ],

  // 每一章 = 一個區域。leaf 是打倒該章 Boss 拿到的星楓葉，bonus 是永久加成
  chapters: {
    1: {
      no: '第一章', name: '苔光森林', sub: '陽光從葉縫間灑落的地方',
      tone: '出發',
      hook: '菇菇女王的冠上，有一片發光的葉子。',
      boss: 'queenShroom',
      leaf: { name: '苔綠星楓葉', color: '#7ad86a', power: '生長', gift: 'HP 自然回復加倍' },
      freed: '綠光離開了女王的冠。她散成一陣孢子。',
      end: {
        title: '第一章　完・苔綠星楓葉',
        text: '葉子回來了，女王沒有。\n根洞口的花，今年謝得早。\n下一片光，落在海的方向。',
      },
    },
    2: {
      no: '第二章', name: '潮風海岬', sub: '燈塔熄滅了的海岸',
      tone: '驕傲',
      hook: '燈塔熄了。老寄居蟹背著一片發光的葉子。',
      boss: 'hermitCrab',
      leaf: { name: '潮藍星楓葉', color: '#5ab8ff', power: '潮汐', gift: 'MP 自然回復 +60%' },
      freed: '老蟹把發光的殼推到你腳邊，走進了浪裡。',
      end: {
        title: '第二章　完・潮藍星楓葉',
        text: '燈塔又亮了。潮水沒有回來。\n有一隻灰色的小獸，也在找葉子。\n下一片光，落在紅色的山谷。',
      },
    },
    3: {
      no: '第三章', name: '赤岩峽谷', sub: '石頭會冒煙的地方',
      tone: '對立',
      hook: '火山醒了。一隻灰色的小獸，比你早到。',
      boss: 'lavaTortoise',
      leaf: { name: '赤焰星楓葉', color: '#ff7a3a', power: '火', gift: '黑閃傷害 +30%' },
      freed: '灰鬃搶先撲向葉子。他的爪子冒出一縷白煙。',
      end: {
        title: '第三章　完・赤焰星楓葉',
        text: '灰鬃看著燙傷的爪子。\n「上一隻獅子，也是這樣笑著走的。」\n下一片光，落在會響鈴鐺的雪山。',
      },
    },
    // 第四章、終章：章節文字在 js/data/story45.js
    4: {
      no: '第四章', name: '霜鈴雪峰', sub: '風一吹，鈴鐺就響的山',
      tone: '停下來',
      hook: '這座山，三年沒有春天。',
      boss: 'frostSpirit',
      leaf: { name: '霜白星楓葉', color: '#dff4ff', power: '霜', gift: '受到的傷害 -10%' },
      freed: '霜靈碎成雪。冰，開始裂了。',
    },
    5: {
      no: '終章', name: '浮空遺跡', sub: '回家的路',
      tone: '時鐘',
      hook: '雲上的階梯盡頭，是那棵樹。',
      boss: 'stoneGuardian',
      leaf: { name: '金色星楓心葉', color: '#ffd35a', power: '心', gift: '黑閃變成金色閃電、額頭的星楓之冠完成' },
      freed: '',
    },
  },

  // 結局：真正的結局在 js/data/story45.js（D.story.ending 會被覆蓋）
  ending: ['明年春天還是會來。有人替它付了錢。'],

  // 回憶模式：打倒過的 Boss 再進去，是一場更強的回憶
  recall: {
    queenShroom: '（回憶）根洞裡，又是四季如春。',
    hermitCrab: '（回憶）葉子記得的老蟹，腿還是好的。',
    lavaTortoise: '（回憶）峽谷裡，又沒有冬天了。',
  },
  recallEnd: '回憶散了。四周只剩安靜。',

  // Boss 倒下時的遺言（最多 3 句）。握葉者把年歲留在身邊，是從身邊的人身上扣的。
  bossWords: {
    queenShroom: ['……光，離開了。好冷。', '戴著它，宮裡一直是春天。', '外面的森林……還好嗎？'],
    hermitCrab: ['哈。好一場架。', '背著它，我的腿又好了三年。', '潮水退那麼遠……是在等我吧。'],
    lavaTortoise: ['……火，熄了。', '背著它，峽谷好幾年沒有冬天。', '你拿走的，是他們的明年。'],
  },

  // 每 10 級的進化：內心的聲音。小獅子的力量是地上多付的那一份年歲（STORY.md 第 3 節第二層反轉）。
  // 第一次讀是祝福，反轉之後再讀是帳單。第五轉是雲鬃的靈。
  innerVoice: {
    1: ['森林今年，多給了一點。', '收下吧。那是你的。'],
    2: ['潮水退下去的那一截，', '長成了你的爪子。'],
    3: ['每一年都有剩的。', '剩的，都到了你身上。'],
    4: ['停住的山，什麼也給不了。', '別的地方，替它多給了。'],
    5: ['這份力量，你知道是誰的嗎？', '我知道。我也收下了。'],
  },

  // 舊欄位：區域標題卡用
  regions: {},
  bossDefeated: {},
};
for (const k in G.data.story.chapters) {
  const c = G.data.story.chapters[k];
  G.data.story.regions[k] = { no: c.no, name: c.name, sub: c.sub, hook: c.hook };
  G.data.story.bossDefeated[c.boss] = c.freed;
}
G.data.story.m1End = G.data.story.chapters[1].end;
