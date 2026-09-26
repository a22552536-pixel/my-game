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
  },

  // Boss 限定的獨特裝備（數值固定、名字固定、一定帶特效）
  uniques: {
    queenScepter: { slot: 'claw', name: '女王的蘑菇權杖', req: 8, tier: 2, tint: '#ff7ac0', stats: { atk: 15, crit: 0.05 }, special: 'thunder' },
    queenFrill: { slot: 'mane', name: '女王的傘褶頸圈', req: 8, tier: 2, tint: '#c2408f', stats: { hp: 120, def: 8 }, special: 'leech' },
    crownShard: { slot: 'charm', name: '皇冠碎片', req: 8, tier: 2, tint: '#ffd35a', stats: { crit: 0.08, mp: 30 }, special: 'focus' },
  },

  // 依怪物等級決定掉哪一級裝備
  tierForLevel(lv) {
    return lv >= 6 ? 2 : 1;
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
  },
  // 怪物掉落消耗品的權重
  potionDrops: { hp: 50, mp: 30, hpL: 6, mpL: 4, acorn: 4, nut: 3, feather: 3 },

  // 材料：怪物掉的小東西。收在背包的「材料」欄，可以賣錢、交任務，或在貓頭鷹的小舖換東西。
  materials: {
    dew: { name: '露珠', price: 3, desc: '露珠蝸殼上滾下來的水珠，冰冰涼涼的。' },
    spore: { name: '孢子粉', price: 4, desc: '小傘菇和斑點菇身上抖下來的粉，聞起來像麵包。' },
    seedshell: { name: '種子殼', price: 5, desc: '種子精換下來的殼，圓圓硬硬的。' },
    moss: { name: '柔軟青苔', price: 7, desc: '苔殼蝸背上的青苔，摸起來像地毯。' },
    cap: { name: '斑點菇傘', price: 8, desc: '斑點菇脫落的傘蓋碎片，紅底白點。' },
    vine: { name: '嫩芽藤蔓', price: 9, desc: '嫩芽精的藤鞭，還會自己捲起來。' },
    bark: { name: '古木殼片', price: 12, desc: '古木蝸殼上剝落的樹皮，很結實。' },
    wick: { name: '發光燈芯', price: 13, desc: '提燈菇的燈芯，拔下來還會亮很久。' },
    petal: { name: '花冠花瓣', price: 14, desc: '花冠精的花瓣，香味好幾天都不會散。' },
    queencap: { name: '女王的孢子冠', price: 150, desc: '菇菇女王頭上掉下來的一小片冠，閃著粉紅色的光。' },
  },

  // 貓頭鷹的以物易物：拿材料換東西，划算程度比直接賣掉高一截
  trades: [
    { need: { dew: 6, spore: 4 }, give: { potion: 'mp', n: 5 } },
    { need: { seedshell: 5, moss: 3 }, give: { potion: 'hpL', n: 3 } },
    { need: { cap: 5 }, give: { potion: 'acorn', n: 1 } },
    { need: { bark: 4 }, give: { potion: 'nut', n: 1 } },
    { need: { vine: 4 }, give: { potion: 'feather', n: 2 } },
    { need: { wick: 3, petal: 3 }, give: { equip: 'chest', name: '神祕裝備（稀有以上）' } },
    { need: { queencap: 1, wick: 5 }, give: { unique: true, name: '女王的寶物（獨特裝備）' } },
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
