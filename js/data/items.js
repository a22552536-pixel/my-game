// 裝備、藥水、稀有度與掉落機率。
G.data.items = {
  slots: {
    claw: '爪套',
    mane: '鬃飾',
    charm: '護符',
  },

  // 基礎裝備。每個區域有前後兩個等級。
  // 每個欄位每一級有三種：主打攻擊／黑閃／耐打（或 MP），外觀用顏色區分
  bases: {
    claw1: { slot: 'claw', name: '木爪套', req: 1, tier: 1, stats: { atk: 4 } },
    claw1b: { slot: 'claw', name: '橡實爪套', req: 1, tier: 1, tint: '#c8903a', stats: { atk: 3, crit: 0.03 } },
    claw1c: { slot: 'claw', name: '藤蔓爪套', req: 1, tier: 1, tint: '#6ab04a', stats: { atk: 3, hp: 20 } },
    mane1: { slot: 'mane', name: '草編鬃飾', req: 1, tier: 1, stats: { hp: 30, def: 2 } },
    mane1b: { slot: 'mane', name: '蒲公英鬃飾', req: 1, tier: 1, tint: '#ffe066', stats: { hp: 20, mp: 15 } },
    mane1c: { slot: 'mane', name: '蝸殼鬃飾', req: 1, tier: 1, tint: '#8fd3f4', stats: { hp: 15, def: 4 } },
    charm1: { slot: 'charm', name: '橡果護符', req: 1, tier: 1, stats: { crit: 0.02, mp: 10 } },
    charm1b: { slot: 'charm', name: '露水護符', req: 1, tier: 1, tint: '#6ab0ff', stats: { mp: 22 } },
    charm1c: { slot: 'charm', name: '幸運草護符', req: 1, tier: 1, tint: '#5ac05a', stats: { crit: 0.04 } },
    claw2: { slot: 'claw', name: '石爪套', req: 6, tier: 2, stats: { atk: 9 } },
    claw2b: { slot: 'claw', name: '毒菇爪套', req: 6, tier: 2, tint: '#e0503a', stats: { atk: 7, crit: 0.05 } },
    claw2c: { slot: 'claw', name: '樹根爪套', req: 6, tier: 2, tint: '#8a5a34', stats: { atk: 7, hp: 50 } },
    mane2: { slot: 'mane', name: '苔絨鬃飾', req: 6, tier: 2, stats: { hp: 70, def: 5 } },
    mane2b: { slot: 'mane', name: '花冠鬃飾', req: 6, tier: 2, tint: '#ff9fc4', stats: { hp: 45, mp: 35 } },
    mane2c: { slot: 'mane', name: '古木鬃飾', req: 6, tier: 2, tint: '#8a5a34', stats: { hp: 40, def: 9 } },
    charm2: { slot: 'charm', name: '露珠護符', req: 6, tier: 2, stats: { crit: 0.04, mp: 25 } },
    charm2b: { slot: 'charm', name: '燈芯護符', req: 6, tier: 2, tint: '#c8f06a', stats: { mp: 45 } },
    charm2c: { slot: 'charm', name: '星光護符', req: 6, tier: 2, tint: '#ffe066', stats: { crit: 0.07 } },
    // 第二章 潮風海岬
    claw3: { slot: 'claw', name: '貝殼爪套', req: 11, tier: 3, tint: '#f0d8c0', stats: { atk: 14 } },
    claw3b: { slot: 'claw', name: '珊瑚爪套', req: 11, tier: 3, tint: '#ff8a7a', stats: { atk: 11, crit: 0.06 } },
    claw3c: { slot: 'claw', name: '海草爪套', req: 11, tier: 3, tint: '#4a9a6a', stats: { atk: 11, hp: 90 } },
    mane3: { slot: 'mane', name: '貝殼鬃飾', req: 11, tier: 3, tint: '#f0d8c0', stats: { hp: 120, def: 8 } },
    mane3b: { slot: 'mane', name: '浪花鬃飾', req: 11, tier: 3, tint: '#8fd8ff', stats: { hp: 80, mp: 60 } },
    mane3c: { slot: 'mane', name: '珍珠鬃飾', req: 11, tier: 3, tint: '#fff6ff', stats: { hp: 70, def: 13 } },
    charm3: { slot: 'charm', name: '海螺護符', req: 11, tier: 3, tint: '#f0c8a0', stats: { crit: 0.05, mp: 40 } },
    charm3b: { slot: 'charm', name: '月光護符', req: 11, tier: 3, tint: '#c8d8ff', stats: { mp: 70 } },
    charm3c: { slot: 'charm', name: '羅盤護符', req: 11, tier: 3, tint: '#d8b04a', stats: { crit: 0.08 } },
    claw4: { slot: 'claw', name: '鐵錨爪套', req: 16, tier: 4, tint: '#9aa8b8', stats: { atk: 20 } },
    claw4b: { slot: 'claw', name: '鯊齒爪套', req: 16, tier: 4, tint: '#e8f0f8', stats: { atk: 16, crit: 0.07 } },
    claw4c: { slot: 'claw', name: '船纜爪套', req: 16, tier: 4, tint: '#c8a070', stats: { atk: 16, hp: 140 } },
    mane4: { slot: 'mane', name: '燈塔鬃飾', req: 16, tier: 4, tint: '#e84a3a', stats: { hp: 180, def: 11 } },
    mane4b: { slot: 'mane', name: '信天翁鬃飾', req: 16, tier: 4, tint: '#ffffff', stats: { hp: 120, mp: 90 } },
    mane4c: { slot: 'mane', name: '珊瑚鬃飾', req: 16, tier: 4, tint: '#ff8a7a', stats: { hp: 110, def: 17 } },
    charm4: { slot: 'charm', name: '海星護符', req: 16, tier: 4, tint: '#ff9fc4', stats: { crit: 0.06, mp: 60 } },
    charm4b: { slot: 'charm', name: '潮汐護符', req: 16, tier: 4, tint: '#5ab8ff', stats: { mp: 100 } },
    charm4c: { slot: 'charm', name: '航海護符', req: 16, tier: 4, tint: '#d8b04a', stats: { crit: 0.09 } },
    // 第三章 赤岩峽谷
    claw5: { slot: 'claw', name: '赤岩爪套', req: 21, tier: 5, tint: '#d85a3a', stats: { atk: 27 } },
    claw5b: { slot: 'claw', name: '火苗爪套', req: 21, tier: 5, tint: '#ffb03a', stats: { atk: 22, crit: 0.08 } },
    claw5c: { slot: 'claw', name: '猴毛爪套', req: 21, tier: 5, tint: '#c86a3a', stats: { atk: 22, hp: 200 } },
    mane5: { slot: 'mane', name: '紅岩鬃飾', req: 21, tier: 5, tint: '#d85a3a', stats: { hp: 250, def: 14 } },
    mane5b: { slot: 'mane', name: '溫泉鬃飾', req: 21, tier: 5, tint: '#8fe8d8', stats: { hp: 170, mp: 130 } },
    mane5c: { slot: 'mane', name: '岩塊鬃飾', req: 21, tier: 5, tint: '#9a8a7a', stats: { hp: 150, def: 22 } },
    charm5: { slot: 'charm', name: '火晶護符', req: 21, tier: 5, tint: '#ff7a3a', stats: { crit: 0.07, mp: 85 } },
    charm5b: { slot: 'charm', name: '湯花護符', req: 21, tier: 5, tint: '#fff0c8', stats: { mp: 135 } },
    charm5c: { slot: 'charm', name: '猴王護符', req: 21, tier: 5, tint: '#ffd35a', stats: { crit: 0.1 } },
    claw6: { slot: 'claw', name: '黑曜爪套', req: 26, tier: 6, tint: '#3a3444', stats: { atk: 35 } },
    claw6b: { slot: 'claw', name: '熔尾爪套', req: 26, tier: 6, tint: '#ff5a2a', stats: { atk: 28, crit: 0.09 } },
    claw6c: { slot: 'claw', name: '山魈爪套', req: 26, tier: 6, tint: '#e84a5a', stats: { atk: 28, hp: 280 } },
    mane6: { slot: 'mane', name: '熔岩鬃飾', req: 26, tier: 6, tint: '#ff7a2a', stats: { hp: 330, def: 18 } },
    mane6b: { slot: 'mane', name: '蒸氣鬃飾', req: 26, tier: 6, tint: '#e8e8f0', stats: { hp: 230, mp: 175 } },
    mane6c: { slot: 'mane', name: '火山鬃飾', req: 26, tier: 6, tint: '#5a3a2a', stats: { hp: 200, def: 28 } },
    charm6: { slot: 'charm', name: '甲龜護符', req: 26, tier: 6, tint: '#6a8a4a', stats: { crit: 0.08, mp: 110 } },
    charm6b: { slot: 'charm', name: '硫磺護符', req: 26, tier: 6, tint: '#e8e06a', stats: { mp: 175 } },
    charm6c: { slot: 'charm', name: '烈焰護符', req: 26, tier: 6, tint: '#ff4a2a', stats: { crit: 0.11 } },
  },

  // Boss 限定的獨特裝備（數值固定、名字固定、一定帶特效）
  uniques: {
    queenScepter: { slot: 'claw', name: '女王的蘑菇權杖', req: 8, tier: 2, tint: '#ff7ac0', stats: { atk: 15, crit: 0.05 }, special: 'thunder' },
    queenFrill: { slot: 'mane', name: '女王的傘褶頸圈', req: 8, tier: 2, tint: '#c2408f', stats: { hp: 120, def: 8 }, special: 'leech' },
    crownShard: { slot: 'charm', name: '皇冠碎片', req: 8, tier: 2, tint: '#ffd35a', stats: { crit: 0.08, mp: 30 }, special: 'focus' },
    tideClaw: { boss: 'hermitCrab', slot: 'claw', name: '潮汐巨鉗', req: 18, tier: 4, tint: '#ff8a5a', stats: { atk: 26, crit: 0.06 }, special: 'thunder' },
    lampShell: { boss: 'hermitCrab', slot: 'mane', name: '老燈塔殼', req: 18, tier: 4, tint: '#e8e0d0', stats: { hp: 260, def: 16 }, special: 'leech' },
    beaconCharm: { boss: 'hermitCrab', slot: 'charm', name: '燈塔之光', req: 18, tier: 4, tint: '#ffe066', stats: { crit: 0.1, mp: 80 }, special: 'focus' },
    magmaClaw: { boss: 'lavaTortoise', slot: 'claw', name: '熔岩龜爪', req: 28, tier: 6, tint: '#ff5a2a', stats: { atk: 44, crit: 0.07 }, special: 'thunder' },
    volcanoShell: { boss: 'lavaTortoise', slot: 'mane', name: '火山甲殼', req: 28, tier: 6, tint: '#5a3a2a', stats: { hp: 460, def: 26 }, special: 'leech' },
    emberHeart: { boss: 'lavaTortoise', slot: 'charm', name: '餘燼之心', req: 28, tier: 6, tint: '#ff9a3a', stats: { crit: 0.12, mp: 140 }, special: 'focus' },
  },

  // 依怪物等級決定掉哪一級裝備
  tierForLevel(lv) {
    return lv >= 26 ? 6 : lv >= 21 ? 5 : lv >= 16 ? 4 : lv >= 11 ? 3 : lv >= 6 ? 2 : 1;
  },
  basesOfTier(tier) {
    const out = [];
    for (const id in this.bases) if (this.bases[id].tier === tier) out.push(id);
    return out;
  },

  rarity: {
    // color 用在遊戲畫面（深色背景），text 用在視窗（米色背景）
    common: { name: '普通', color: '#e6e0d4', text: '#6b5a45', mult: 1.0, order: 0 },
    rare: { name: '稀有', color: '#4da3ff', text: '#1f6fd0', mult: 1.15, order: 1 },
    epic: { name: '史詩', color: '#b46bff', text: '#8a3fd0', mult: 1.35, order: 2 },
    legendary: { name: '傳說', color: '#ffb62e', text: '#c77800', mult: 1.6, order: 3 },
  },

  // 稀有度機率（權重）
  rarityTables: {
    normal: { common: 72, rare: 21, epic: 6, legendary: 1 },
    elite: { rare: 75, epic: 21, legendary: 4 },
    shiny: { epic: 85, legendary: 15 },
    boss: { epic: 70, legendary: 30 },
    chest: { rare: 70, epic: 26, legendary: 4 },
  },

  // 史詩以上多一條副屬性，數值依裝備等級放大
  substats: [
    { stat: 'atk', min: 1, max: 3 },
    { stat: 'hp', min: 12, max: 30 },
    { stat: 'def', min: 1, max: 3 },
    { stat: 'crit', min: 0.01, max: 0.03 },
    { stat: 'mp', min: 6, max: 18 },
  ],

  // 傳說特殊效果
  specials: {
    thunder: { name: '落雷', desc: '攻擊時 10% 機率落雷，追加 100% 傷害' },
    leech: { name: '吸血', desc: '造成傷害的 3% 轉為 HP' },
    swift: { name: '輕盈', desc: '移動速度 +10%' },
    focus: { name: '專注', desc: '黑閃時回復 3 MP' },
  },

  statNames: { atk: '攻擊', hp: 'HP', mp: 'MP', def: '防禦', crit: '黑閃率' },

  // 比較用分數：綠色箭頭依這個判斷
  score(stats) {
    stats = stats || {};
    return (stats.atk || 0) * 3 + (stats.hp || 0) * 0.3 + (stats.def || 0) * 1 + (stats.crit || 0) * 300 + (stats.mp || 0) * 0.2;
  },

  // 消耗品（藥水、增益果實、回家羽毛）
  potions: {
    hp: { name: '紅漿果', desc: '回復 150 HP', kind: 'hp', heal: 150, price: 12, icon: 'hpPot' },
    mp: { name: '藍花蜜', desc: '回復 80 MP', kind: 'mp', heal: 80, price: 15, icon: 'mpPot' },
    hpL: { name: '大紅漿果', desc: '回復 400 HP', kind: 'hp', heal: 400, price: 40, icon: 'hpPotL' },
    mpL: { name: '大藍花蜜', desc: '回復 200 MP', kind: 'mp', heal: 200, price: 45, icon: 'mpPotL' },
    acorn: { name: '力量橡實', desc: '90 秒內攻擊 +20%', kind: 'buff', buff: 'atk', value: 0.2, time: 90, price: 80, icon: 'acorn' },
    nut: { name: '硬殼果', desc: '90 秒內受到的傷害 -20%', kind: 'buff', buff: 'guard', value: 0.2, time: 90, price: 80, icon: 'nut' },
    feather: { name: '回家羽毛', desc: '立刻回到這一區的營地', kind: 'home', price: 30, icon: 'feather' },
    hpXL: { name: '特大紅漿果', desc: '回復 1000 HP', kind: 'hp', heal: 1000, price: 95, icon: 'hpPotL' },
    mpXL: { name: '特大藍花蜜', desc: '回復 500 MP', kind: 'mp', heal: 500, price: 105, icon: 'mpPotL' },
  },
  // 怪物掉落消耗品的權重
  potionDrops: { hp: 50, mp: 30, hpL: 6, mpL: 4, acorn: 4, nut: 3, feather: 3 },

  // 材料：怪物掉的小東西。收在背包的「材料」欄，可以賣錢、交任務，或在貓頭鷹的小舖換東西。
  materials: {
    dew: { name: '露珠', price: 3, desc: '露珠蝸殼上滾下來的水珠，冰冰涼涼的。' },
    spore: { name: '孢子粉', price: 4, desc: '小傘菇身上抖下來的粉，聞起來像麵包。' },
    seedshell: { name: '種子殼', price: 5, desc: '種子精換下來的殼，圓圓硬硬的。' },
    moss: { name: '橡實鼠絨毛', price: 7, desc: '橡實鼠尾巴上的絨毛，軟得像雲。' },
    cap: { name: '野豬鬃', price: 8, desc: '小野豬背上的硬鬃，拿來刷鞋子剛剛好。' },
    vine: { name: '藤尾', price: 9, desc: '藤尾蜥的尾巴藤蔓，還會自己捲起來。' },
    bark: { name: '樹皮甲片', price: 12, desc: '樹皮龜殼上剝落的樹皮，很結實。' },
    wick: { name: '螢光囊', price: 13, desc: '提燈螢的發光囊，拔下來還會亮很久。' },
    petal: { name: '蝶翅花瓣', price: 14, desc: '花瓣蝶翅膀上的花瓣，香味好幾天都不會散。' },
    queencap: { name: '女王的孢子冠', price: 150, desc: '菇菇女王頭上掉下來的一小片冠，閃著粉紅色的光。' },
    // 第二章
    sandgrain: { name: '沙粒', price: 14, desc: '沙粒蟹殼縫裡的細沙，在陽光下亮晶晶的。' },
    jellydrop: { name: '水母凝膠', price: 15, desc: '泡泡水母留下的凝膠，冰冰QQ的。' },
    gullfeather: { name: '海鷗羽毛', price: 16, desc: '海鷗雛掉的絨毛，軟得像雲。' },
    shellpiece: { name: '貝殼片', price: 19, desc: '貝甲蟹背上的扇貝碎片。' },
    glowgel: { name: '螢光液', price: 20, desc: '燈籠水母體內會發光的液體。' },
    foam: { name: '浪花泡沫', price: 21, desc: '浪花鷗翅膀上甩下來的泡沫，不會破。' },
    coralbranch: { name: '珊瑚枝', price: 25, desc: '珊瑚蟹背上長出來的紅珊瑚。' },
    moonpearl: { name: '月光珍珠', price: 27, desc: '月光水母身體裡的小珍珠，晚上會發光。' },
    plume: { name: '信天翁長羽', price: 28, desc: '帆翼信天翁的長羽毛，像一面小帆。' },
    lampshard: { name: '燈塔碎片', price: 320, desc: '潮汐寄居蟹背上那座老燈塔的碎片，還帶著一點光。' },
    // 第三章
    emberscale: { name: '火苗鱗片', price: 30, desc: '火苗蜥尾巴附近的鱗片，摸起來溫溫的。' },
    pebble: { name: '碎石核', price: 31, desc: '碎石丸的核心，滾起來很順。' },
    towel: { name: '小毛巾', price: 32, desc: '溫泉猴頭上的小毛巾，有硫磺的味道。' },
    magmashard: { name: '熔尾碎片', price: 36, desc: '熔尾蜥尾巴剝落的熔岩殼。' },
    rockheart: { name: '岩心', price: 37, desc: '岩塊怪身體裡最硬的那一塊。' },
    redfur: { name: '赤毛', price: 38, desc: '赤毛猴的紅毛，一束一束的。' },
    fang: { name: '炎鬣牙', price: 44, desc: '炎鬣蜥的牙齒，尖端還在冒煙。' },
    springstone: { name: '溫泉石', price: 45, desc: '溫泉石像頭上碗裡的小石頭，泡過溫泉。' },
    maskshard: { name: '木面具碎片', price: 46, desc: '山魈頭目面具上的碎片，刻著奇怪的花紋。' },
    volcanocore: { name: '火山核心', price: 560, desc: '熔岩甲龜背上火山的核心，還在發燙。' },
  },

  // 貓頭鷹的以物易物：拿材料換東西，划算程度比直接賣掉高一截
  trades: [
    { need: { dew: 6, spore: 4 }, give: { potion: 'mp', n: 5 } },
    { need: { seedshell: 5, moss: 3 }, give: { potion: 'hpL', n: 3 } },
    { need: { cap: 5 }, give: { potion: 'acorn', n: 1 } },
    { need: { bark: 4 }, give: { potion: 'nut', n: 1 } },
    { need: { vine: 4 }, give: { potion: 'feather', n: 2 } },
    { need: { wick: 3, petal: 3 }, give: { equip: 'chest', name: '神祕裝備（稀有以上）' } },
    { need: { queencap: 1, wick: 5 }, give: { unique: 'queenShroom', name: '女王的寶物（獨特裝備）' } },
    // 海鷗商人（燈塔岬）
    { shop: 'gull', need: { sandgrain: 6, jellydrop: 4 }, give: { potion: 'mpL', n: 4 } },
    { shop: 'gull', need: { gullfeather: 6 }, give: { potion: 'feather', n: 3 } },
    { shop: 'gull', need: { shellpiece: 5, glowgel: 3 }, give: { potion: 'hpL', n: 5 } },
    { shop: 'gull', need: { foam: 5 }, give: { potion: 'acorn', n: 2 } },
    { shop: 'gull', need: { coralbranch: 4, moonpearl: 3 }, give: { equip: 'chest', name: '神祕裝備（稀有以上）' } },
    { shop: 'gull', need: { plume: 5 }, give: { potion: 'nut', n: 2 } },
    { shop: 'gull', need: { lampshard: 1, moonpearl: 5 }, give: { unique: 'hermitCrab', name: '燈塔的寶物（獨特裝備）' } },
    // 水豚掌櫃（溫泉谷）
    { shop: 'capybara', need: { emberscale: 6, pebble: 4 }, give: { potion: 'mpXL', n: 2 } },
    { shop: 'capybara', need: { towel: 6 }, give: { potion: 'hpXL', n: 2 } },
    { shop: 'capybara', need: { magmashard: 5, rockheart: 3 }, give: { potion: 'acorn', n: 3 } },
    { shop: 'capybara', need: { redfur: 5 }, give: { potion: 'nut', n: 3 } },
    { shop: 'capybara', need: { fang: 4, springstone: 3 }, give: { equip: 'chest', name: '神祕裝備（稀有以上）' } },
    { shop: 'capybara', need: { maskshard: 5 }, give: { potion: 'feather', n: 4 } },
    { shop: 'capybara', need: { volcanocore: 1, fang: 5 }, give: { unique: 'lavaTortoise', name: '火山的寶物（獨特裝備）' } },
  ],

  // 營地商店
  shops: {
    owl: [
      { type: 'potion', id: 'hp' },
      { type: 'potion', id: 'mp' },
      { type: 'potion', id: 'hpL' },
      { type: 'potion', id: 'mpL' },
      { type: 'potion', id: 'acorn' },
      { type: 'potion', id: 'nut' },
      { type: 'potion', id: 'feather' },
      { type: 'equip', base: 'claw2', rarity: 'rare', fixed: { atk: 10 }, price: 450 },
      { type: 'equip', base: 'mane2', rarity: 'rare', fixed: { hp: 80, def: 6 }, price: 400 },
    ],
  },

  // 其他營地與狩獵場的商店
  moreShops: {
    gull: [
      { type: 'potion', id: 'hp' }, { type: 'potion', id: 'mp' }, { type: 'potion', id: 'hpL' }, { type: 'potion', id: 'mpL' },
      { type: 'potion', id: 'acorn' }, { type: 'potion', id: 'nut' }, { type: 'potion', id: 'feather' },
      { type: 'equip', base: 'claw3', rarity: 'rare', fixed: { atk: 17 }, price: 1200 },
      { type: 'equip', base: 'mane3', rarity: 'rare', fixed: { hp: 140, def: 10 }, price: 1100 },
      { type: 'equip', base: 'charm4', rarity: 'rare', fixed: { crit: 0.07, mp: 70 }, price: 1800 },
    ],
    pelican: [
      { type: 'potion', id: 'hp' }, { type: 'potion', id: 'mp' }, { type: 'potion', id: 'hpL' }, { type: 'potion', id: 'mpL' }, { type: 'potion', id: 'feather' },
    ],
    capybara: [
      { type: 'potion', id: 'hpL' }, { type: 'potion', id: 'mpL' }, { type: 'potion', id: 'hpXL' }, { type: 'potion', id: 'mpXL' },
      { type: 'potion', id: 'acorn' }, { type: 'potion', id: 'nut' }, { type: 'potion', id: 'feather' },
      { type: 'equip', base: 'claw5', rarity: 'rare', fixed: { atk: 31 }, price: 3200 },
      { type: 'equip', base: 'mane5', rarity: 'rare', fixed: { hp: 290, def: 16 }, price: 3000 },
      { type: 'equip', base: 'charm6', rarity: 'rare', fixed: { crit: 0.09, mp: 125 }, price: 4600 },
    ],
    armadillo: [
      { type: 'potion', id: 'hpL' }, { type: 'potion', id: 'mpL' }, { type: 'potion', id: 'hpXL' }, { type: 'potion', id: 'mpXL' }, { type: 'potion', id: 'feather' },
    ],
  },

  // 鼴鼠礦工在 Boss 門口賣補給
  moleShop: [
    { type: 'potion', id: 'hp' },
    { type: 'potion', id: 'mp' },
    { type: 'potion', id: 'hpL' },
    { type: 'potion', id: 'mpL' },
    { type: 'potion', id: 'feather' },
  ],

  sellPrice(item) {
    const r = this.rarity[item.rarity] || this.rarity.common;
    return Math.round(item.req * 6 * r.mult * r.mult + 5);
  },
};
G.data.items.questItems = G.data.items.materials; // 舊名稱，任務和存檔仍用這個 key
