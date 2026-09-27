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
    name: '橡實鼠', lv: 5, art: 'acornmouse', stage: 1, behavior: 'passive',
    speed: 32, w: 50, h: 38, hpMul: 1.25, atkMul: 1,
    drops: { gold: [5, 11], equip: 0.04, potion: 0.05, mats: [['moss', 0.38]] },
  },
  spotshroom: {
    name: '小野豬', lv: 6, art: 'boarlet', stage: 1, behavior: 'passive', abilities: ['charge'],
    speed: 50, w: 50, h: 56, hpMul: 1.1, atkMul: 1.1,
    drops: { gold: [6, 13], equip: 0.04, potion: 0.05, mats: [['cap', 0.35], ['spore', 0.3]] },
  },
  sproutling: {
    name: '藤尾蜥', lv: 7, art: 'vinelizard', stage: 1, behavior: 'aggressive', abilities: ['whip'],
    speed: 62, w: 40, h: 56, hpMul: 1, atkMul: 1.1, sight: 280,
    drops: { gold: [7, 15], equip: 0.04, potion: 0.05, mats: [['vine', 0.38]] },
  },
  woodsnail: {
    name: '樹皮龜', lv: 8, art: 'barkturtle', stage: 1, behavior: 'passive', abilities: ['shell'],
    speed: 34, w: 62, h: 50, hpMul: 1.45, atkMul: 1.05,
    drops: { gold: [9, 18], equip: 0.045, potion: 0.05, mats: [['bark', 0.38]] },
  },
  lampshroom: {
    name: '提燈螢', lv: 9, art: 'lanternfly', stage: 1, behavior: 'aggressive', abilities: ['ranged'],
    speed: 45, w: 54, h: 66, hpMul: 1.1, atkMul: 1.05, sight: 420,
    projectile: { kind: 'spore', speed: 300, cd: 2.6, range: 420 },
    drops: { gold: [10, 20], equip: 0.045, potion: 0.06, mats: [['wick', 0.38]] },
  },
  flowerling: {
    name: '花瓣蝶', lv: 10, art: 'petalfly', stage: 1, behavior: 'aggressive', abilities: ['ranged'],
    speed: 55, w: 48, h: 66, hpMul: 1.15, atkMul: 1.05, sight: 440,
    projectile: { kind: 'petal', speed: 380, cd: 2.2, range: 440, count: 3 },
    drops: { gold: [11, 22], equip: 0.045, potion: 0.06, mats: [['petal', 0.38]] },
  },

  // ── 區域 2 潮風海岬（Lv 11–20）──
  sandcrab: {
    name: '沙粒蟹', lv: 11, art: 'crab', stage: 1, behavior: 'passive',
    speed: 70, w: 40, h: 30, hpMul: 0.95, atkMul: 1,
    drops: { gold: [12, 22], equip: 0.04, potion: 0.05, mats: [['sandgrain', 0.4]] },
  },
  bubblejelly: {
    name: '泡泡水母', lv: 12, art: 'jelly', stage: 1, behavior: 'passive',
    speed: 30, w: 40, h: 48, hpMul: 1.05, atkMul: 1,
    drops: { gold: [13, 24], equip: 0.04, potion: 0.05, mats: [['jellydrop', 0.4]] },
  },
  gullchick: {
    name: '海鷗雛', lv: 13, art: 'gull', stage: 1, behavior: 'passive', abilities: ['hop'],
    speed: 50, w: 38, h: 42, hpMul: 1, atkMul: 1,
    drops: { gold: [14, 26], equip: 0.04, potion: 0.05, mats: [['gullfeather', 0.4]] },
  },
  shellcrab: {
    name: '貝甲蟹', lv: 14, art: 'crab', stage: 2, behavior: 'passive', abilities: ['shell'],
    speed: 45, w: 52, h: 42, hpMul: 1.3, atkMul: 1,
    drops: { gold: [16, 30], equip: 0.045, potion: 0.05, mats: [['shellpiece', 0.38]] },
  },
  lanternjelly: {
    name: '燈籠水母', lv: 15, art: 'jelly', stage: 2, behavior: 'aggressive',
    speed: 40, w: 46, h: 58, hpMul: 1.05, atkMul: 1.2, sight: 260,
    drops: { gold: [17, 32], equip: 0.045, potion: 0.055, mats: [['glowgel', 0.38]] },
  },
  wavegull: {
    name: '浪花鷗', lv: 16, art: 'gull', stage: 2, behavior: 'aggressive', abilities: ['hop'],
    speed: 70, w: 48, h: 52, hpMul: 1.05, atkMul: 1.1, sight: 300,
    drops: { gold: [18, 34], equip: 0.045, potion: 0.055, mats: [['foam', 0.38]] },
  },
  coralcrab: {
    name: '珊瑚蟹', lv: 18, art: 'crab', stage: 3, behavior: 'passive', abilities: ['charge'],
    speed: 50, w: 64, h: 54, hpMul: 1.4, atkMul: 1.1,
    drops: { gold: [20, 38], equip: 0.05, potion: 0.06, mats: [['coralbranch', 0.38]] },
  },
  moonjelly: {
    name: '月光水母', lv: 19, art: 'jelly', stage: 3, behavior: 'aggressive', abilities: ['ranged'],
    speed: 35, w: 54, h: 68, hpMul: 1.1, atkMul: 1.05, sight: 440,
    projectile: { kind: 'zap', speed: 320, cd: 2.4, range: 440 },
    drops: { gold: [21, 40], equip: 0.05, potion: 0.06, mats: [['moonpearl', 0.36]] },
  },
  albatross: {
    name: '帆翼信天翁', lv: 20, art: 'gull', stage: 3, behavior: 'aggressive', abilities: ['ranged'],
    speed: 60, w: 66, h: 62, hpMul: 1.2, atkMul: 1.05, sight: 460,
    projectile: { kind: 'gullfeather', speed: 380, cd: 2.2, range: 460, count: 3 },
    drops: { gold: [22, 42], equip: 0.05, potion: 0.06, mats: [['plume', 0.36]] },
  },

  // ── 區域 3 赤岩峽谷（Lv 21–30）──
  flamelizard: {
    name: '火苗蜥', lv: 21, art: 'lizard', stage: 1, behavior: 'passive',
    speed: 60, w: 44, h: 34, hpMul: 1, atkMul: 1,
    drops: { gold: [24, 44], equip: 0.045, potion: 0.055, mats: [['emberscale', 0.4]] },
  },
  pebble: {
    name: '碎石丸', lv: 22, art: 'rock', stage: 1, behavior: 'passive', abilities: ['charge'],
    speed: 45, w: 34, h: 32, hpMul: 1.15, atkMul: 1,
    drops: { gold: [25, 46], equip: 0.045, potion: 0.055, mats: [['pebble', 0.4]] },
  },
  springmonkey: {
    name: '溫泉猴', lv: 23, art: 'monkey', stage: 1, behavior: 'aggressive', abilities: ['ranged'],
    speed: 55, w: 40, h: 46, hpMul: 0.95, atkMul: 1, sight: 380,
    projectile: { kind: 'pebbleShot', speed: 360, cd: 2.4, range: 380 },
    drops: { gold: [26, 48], equip: 0.045, potion: 0.055, mats: [['towel', 0.4]] },
  },
  moltenlizard: {
    name: '熔尾蜥', lv: 24, art: 'lizard', stage: 2, behavior: 'aggressive', abilities: ['whip'],
    speed: 62, w: 56, h: 42, hpMul: 1.1, atkMul: 1.1, sight: 280,
    drops: { gold: [28, 52], equip: 0.05, potion: 0.06, mats: [['magmashard', 0.38]] },
  },
  rockling: {
    name: '岩塊怪', lv: 25, art: 'rock', stage: 2, behavior: 'passive', abilities: ['shell'],
    speed: 34, w: 54, h: 52, hpMul: 1.5, atkMul: 1.05,
    drops: { gold: [29, 54], equip: 0.05, potion: 0.06, mats: [['rockheart', 0.38]] },
  },
  redmonkey: {
    name: '赤毛猴', lv: 26, art: 'monkey', stage: 2, behavior: 'aggressive', abilities: ['hop'],
    speed: 80, w: 48, h: 56, hpMul: 1.05, atkMul: 1.15, sight: 320,
    drops: { gold: [30, 56], equip: 0.05, potion: 0.06, mats: [['redfur', 0.38]] },
  },
  fireiguana: {
    name: '炎鬣蜥', lv: 28, art: 'lizard', stage: 3, behavior: 'aggressive', abilities: ['ranged'],
    speed: 50, w: 68, h: 52, hpMul: 1.2, atkMul: 1.1, sight: 360,
    projectile: { kind: 'fireball', speed: 300, cd: 2.2, range: 300, count: 2 },
    drops: { gold: [33, 60], equip: 0.055, potion: 0.065, mats: [['fang', 0.36]] },
  },
  springstatue: {
    name: '溫泉石像', lv: 29, art: 'rock', stage: 3, behavior: 'passive', abilities: ['heal'],
    speed: 26, w: 60, h: 76, hpMul: 1.6, atkMul: 1.05,
    drops: { gold: [34, 62], equip: 0.055, potion: 0.065, mats: [['springstone', 0.36]] },
  },
  mandrill: {
    name: '山魈頭目', lv: 30, art: 'monkey', stage: 3, behavior: 'aggressive', abilities: ['charge'],
    speed: 60, w: 64, h: 72, hpMul: 1.45, atkMul: 1.15, sight: 360,
    drops: { gold: [36, 66], equip: 0.06, potion: 0.07, mats: [['maskshard', 0.36]] },
  },

  // ── Boss ──
  hermitCrab: {
    name: '潮汐寄居蟹', lv: 22, art: 'hermitCrab', boss: true,
    w: 190, h: 170, hp: 12500, atk: 88, def: 18, exp: 2600, speed: 80,
    drops: { gold: [600, 800] },
  },
  lavaTortoise: {
    name: '熔岩甲龜', lv: 32, art: 'lavaTortoise', boss: true,
    w: 230, h: 160, hp: 24000, atk: 128, def: 26, exp: 6000, speed: 55,
    drops: { gold: [1000, 1400] },
  },
  queenShroom: {
    name: '菇菇女王', lv: 12, art: 'queen', boss: true,
    w: 150, h: 190, hp: 3000, atk: 46, def: 10, exp: 900, speed: 70,
    drops: { gold: [250, 350] },
  },
};
