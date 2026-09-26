// 裝備、藥水、稀有度與掉落機率。
G.data.items = {
  slots: {
    claw: '爪套',
    mane: '鬃飾',
    charm: '護符',
  },

  // 基礎裝備。每個區域有前後兩個等級。
  bases: {
    claw1: { slot: 'claw', name: '木爪套', req: 1, tier: 1, stats: { atk: 4 } },
    mane1: { slot: 'mane', name: '草編鬃飾', req: 1, tier: 1, stats: { hp: 30, def: 2 } },
    charm1: { slot: 'charm', name: '橡果護符', req: 1, tier: 1, stats: { crit: 0.02, mp: 10 } },
    claw2: { slot: 'claw', name: '石爪套', req: 6, tier: 2, stats: { atk: 9 } },
    mane2: { slot: 'mane', name: '苔絨鬃飾', req: 6, tier: 2, stats: { hp: 70, def: 5 } },
    charm2: { slot: 'charm', name: '露珠護符', req: 6, tier: 2, stats: { crit: 0.04, mp: 25 } },
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
  },

  statNames: { atk: '攻擊', hp: 'HP', mp: 'MP', def: '防禦', crit: '爆擊率' },

  // 比較用分數：綠色箭頭依這個判斷
  score(stats) {
    stats = stats || {};
    return (stats.atk || 0) * 3 + (stats.hp || 0) * 0.3 + (stats.def || 0) * 1 + (stats.crit || 0) * 300 + (stats.mp || 0) * 0.2;
  },

  potions: {
    hp: { name: '紅漿果', desc: '回復 150 HP', heal: 150, price: 20 },
    mp: { name: '藍花蜜', desc: '回復 80 MP', heal: 80, price: 25 },
  },

  questItems: {
    spore: { name: '孢子粉' },
  },

  // 營地商店
  shops: {
    owl: [
      { type: 'potion', id: 'hp' },
      { type: 'potion', id: 'mp' },
      { type: 'equip', base: 'claw2', rarity: 'rare', fixed: { atk: 10 }, price: 450 },
      { type: 'equip', base: 'mane2', rarity: 'rare', fixed: { hp: 80, def: 6 }, price: 400 },
    ],
  },

  sellPrice(item) {
    const r = this.rarity[item.rarity] || this.rarity.common;
    return Math.round(item.req * 6 * r.mult * r.mult + 5);
  },
};
