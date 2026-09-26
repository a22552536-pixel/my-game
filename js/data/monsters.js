// 怪物資料。HP、攻擊、經驗值依等級自動計算，再乘上各自的倍率。
// behavior：
//   passive  被打才會追
//   aggressive 看到玩家就追
// 額外能力（abilities）：hop 會跳、charge 被打後衝撞、shell 會縮殼、
//   ranged 遠程、whip 近身藤鞭
// drops.mats：[材料 id, 機率]；材料會進背包，可以賣錢、交給任務或在貓頭鷹那裡換東西。
G.data.monsters = {
  // ── 區域 1 苔光森林 ──
  dewsnail: {
    name: '露珠蝸', lv: 1, art: 'snail', stage: 1, behavior: 'passive',
    speed: 28, w: 42, h: 30, hpMul: 1, atkMul: 1,
    drops: { gold: [2, 5], equip: 0.035, potion: 0.04, mats: [['dew', 0.4]] },
  },
  capshroom: {
    name: '小傘菇', lv: 2, art: 'mushroom', stage: 1, behavior: 'passive', abilities: ['hop'],
    speed: 55, w: 40, h: 44, hpMul: 1, atkMul: 1,
    drops: { gold: [3, 7], equip: 0.035, potion: 0.04, mats: [['spore', 0.4]] },
  },
  seedling: {
    name: '種子精', lv: 3, art: 'sprite', stage: 1, behavior: 'passive', abilities: ['hop'],
    speed: 50, w: 36, h: 42, hpMul: 0.95, atkMul: 1,
    drops: { gold: [3, 8], equip: 0.035, potion: 0.04, mats: [['seedshell', 0.4]] },
  },
  mosssnail: {
    name: '苔殼蝸', lv: 5, art: 'snail', stage: 2, behavior: 'passive',
    speed: 32, w: 50, h: 38, hpMul: 1.25, atkMul: 1,
    drops: { gold: [5, 11], equip: 0.04, potion: 0.05, mats: [['moss', 0.38]] },
  },
  spotshroom: {
    name: '斑點菇', lv: 6, art: 'mushroom', stage: 2, behavior: 'passive', abilities: ['charge'],
    speed: 50, w: 50, h: 56, hpMul: 1.1, atkMul: 1.1,
    drops: { gold: [6, 13], equip: 0.04, potion: 0.05, mats: [['cap', 0.35], ['spore', 0.3]] },
  },
  sproutling: {
    name: '嫩芽精', lv: 7, art: 'sprite', stage: 2, behavior: 'aggressive', abilities: ['whip'],
    speed: 62, w: 40, h: 56, hpMul: 1, atkMul: 1.1, sight: 280,
    drops: { gold: [7, 15], equip: 0.04, potion: 0.05, mats: [['vine', 0.38]] },
  },
  woodsnail: {
    name: '古木蝸', lv: 8, art: 'snail', stage: 3, behavior: 'passive', abilities: ['shell'],
    speed: 34, w: 62, h: 50, hpMul: 1.45, atkMul: 1.05,
    drops: { gold: [9, 18], equip: 0.045, potion: 0.05, mats: [['bark', 0.38]] },
  },
  lampshroom: {
    name: '提燈菇', lv: 9, art: 'mushroom', stage: 3, behavior: 'aggressive', abilities: ['ranged'],
    speed: 45, w: 54, h: 66, hpMul: 1.1, atkMul: 1.05, sight: 420,
    projectile: { kind: 'spore', speed: 300, cd: 2.6, range: 420 },
    drops: { gold: [10, 20], equip: 0.045, potion: 0.06, mats: [['wick', 0.38]] },
  },
  flowerling: {
    name: '花冠精', lv: 10, art: 'sprite', stage: 3, behavior: 'aggressive', abilities: ['ranged'],
    speed: 55, w: 48, h: 66, hpMul: 1.15, atkMul: 1.05, sight: 440,
    projectile: { kind: 'petal', speed: 380, cd: 2.2, range: 440, count: 3 },
    drops: { gold: [11, 22], equip: 0.045, potion: 0.06, mats: [['petal', 0.38]] },
  },

  // ── Boss ──
  queenShroom: {
    name: '菇菇女王', lv: 12, art: 'queen', boss: true,
    w: 150, h: 190, hp: 3000, atk: 46, def: 10, exp: 900, speed: 70,
    drops: { gold: [250, 350] },
  },
};
