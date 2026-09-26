// 技能資料。每個技能最高 10 級，每升一級得 1 點 SP。
// 數值用函式表示，方便依技能等級計算。
G.data.skills = {
  pounce: {
    name: '飛撲',
    form: 'base',
    maxLv: 10,
    icon: 'pounce',
    type: 'dash',
    mp: (lv) => 5 + lv,
    mult: (lv) => 1.5 + 0.12 * (lv - 1),
    targets: 3,
    dashSpeed: 720,
    dashTime: 0.2,
    desc: (lv) => '向前飛撲，撞到的敵人最多 3 隻，各受到 ' + Math.round((1.5 + 0.12 * (lv - 1)) * 100) + '% 傷害',
  },
  roar: {
    name: '小吼',
    form: 'base',
    maxLv: 10,
    icon: 'roar',
    type: 'area',
    mp: (lv) => 8 + lv,
    mult: (lv) => 1.15 + 0.1 * (lv - 1),
    targets: 4,
    range: { w: 180, h: 110 },
    castTime: 0.45,
    hitAt: 0.14,
    knock: 320,
    desc: (lv) => '朝前方大吼，最多 4 隻敵人各受到 ' + Math.round((1.15 + 0.1 * (lv - 1)) * 100) + '% 傷害並被震退',
  },
};

// 普通攻擊（不佔技能點）
G.data.basicAttack = {
  name: '爪擊',
  mult: 1.0,
  range: { w: 78, h: 60 },
  targets: 1,
  duration: 0.38,
  hitAt: 0.11,
  knock: 150,
};
