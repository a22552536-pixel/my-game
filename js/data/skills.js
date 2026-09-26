// 技能資料。每個技能最高 10 級，每升一級得 1 點 SP。
// 數值用函式表示，方便依技能等級計算。
G.data.skills = {
  pounce: {
    name: '飛撲',
    form: 'base',
    maxLv: 10,
    icon: 'pounce',
    type: 'dash',
    mp: (lv) => 4 + Math.floor((lv - 1) / 3),
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
    mp: (lv) => 6 + Math.round(((lv - 1) * 4) / 9),
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

// ── 一轉技能 ──
// type：melee 近身（可多段）、bolt 投射物、lockon 鎖定目標、passive 被動
Object.assign(G.data.skills, {
  // 力量：岩鬃獅
  heavyClaw: {
    name: '重爪', form: 'might1', maxLv: 10, icon: 'heavyClaw', type: 'melee', fx: 'rock',
    mp: (lv) => 6 + Math.floor((lv - 1) / 3),
    mult: (lv) => 2.6 + 0.15 * (lv - 1),
    targets: 1, range: { w: 104, h: 74 }, castTime: 0.42, hits: [0.16], knock: 560, heavy: true,
    desc: (lv) => '用岩石般的前爪重擊 1 隻敵人，' + Math.round((2.6 + 0.15 * (lv - 1)) * 100) + '% 傷害，把牠打飛',
  },
  maneSweep: {
    name: '鬃風橫掃', form: 'might1', maxLv: 10, icon: 'maneSweep', type: 'melee', fx: 'sweep',
    mp: (lv) => 8 + Math.floor((lv - 1) / 3),
    mult: (lv) => 1.5 + 0.1 * (lv - 1),
    targets: 6, range: { w: 220, h: 104 }, castTime: 0.46, hits: [0.16], knock: 300, heavy: true,
    desc: (lv) => '甩動岩石鬃毛橫掃前方，最多 6 隻各受到 ' + Math.round((1.5 + 0.1 * (lv - 1)) * 100) + '% 傷害',
  },
  rockSkin: {
    name: '岩皮', form: 'might1', maxLv: 10, icon: 'rockSkin', type: 'passive',
    value: (lv) => ({ reduce: 0.05 + 0.01 * lv, steady: 0.1 + 0.02 * lv }),
    desc: (lv) => '被動：受到的傷害 -' + Math.round((0.05 + 0.01 * lv) * 100) + '%，' + Math.round((0.1 + 0.02 * lv) * 100) + '% 機率不被擊退',
  },

  // 法術：靈鬃獅
  spiritBolt: {
    name: '靈光彈', form: 'magic1', maxLv: 10, icon: 'spiritBolt', type: 'bolt', proj: 'spirit',
    mp: (lv) => 5 + Math.floor((lv - 1) / 3),
    mult: (lv) => 2.2 + 0.15 * (lv - 1),
    count: 1, speed: 680, reach: 620, castTime: 0.36, fireAt: 0.12, knock: 220,
    desc: (lv) => '射出一顆靈火彈，命中第一隻敵人造成 ' + Math.round((2.2 + 0.15 * (lv - 1)) * 100) + '% 傷害',
  },
  spiritClaw: {
    name: '靈爪', form: 'magic1', maxLv: 10, icon: 'spiritClaw', type: 'lockon',
    mp: (lv) => 8 + Math.floor((lv - 1) / 3),
    mult: (lv) => 1.1 + 0.08 * (lv - 1),
    targets: 4, radius: 460, repeat: 2, castTime: 0.46, hitAt: 0.18,
    desc: (lv) => '靈火之爪直接抓向附近最多 4 隻敵人（無視地形），各打 2 下 ' + Math.round((1.1 + 0.08 * (lv - 1)) * 100) + '%',
  },
  manaShield: {
    name: '鬃光護盾', form: 'magic1', maxLv: 10, icon: 'manaShield', type: 'passive',
    value: (lv) => ({ absorb: 0.3 + 0.03 * lv }),
    desc: (lv) => '被動：受到傷害時，' + Math.round((0.3 + 0.03 * lv) * 100) + '% 改由 MP 承擔',
  },

  // 敏捷：風鬃獅
  // 敏捷路線全部以投刃為主，沒有近戰技能
  doubleClaw: {
    name: '疾刃連射', form: 'agile1', maxLv: 10, icon: 'doubleClaw', type: 'bolt', proj: 'feather',
    mp: (lv) => 4 + Math.floor((lv - 1) / 3),
    mult: (lv) => 0.95 + 0.06 * (lv - 1),
    count: 3, rapid: true, speed: 900, reach: 480, castTime: 0.34, fireAt: 0.05, knock: 60,
    desc: (lv) => '快速連續擲出 3 枚短羽刃，各 ' + Math.round((0.95 + 0.06 * (lv - 1)) * 100) + '%',
  },
  featherThrow: {
    name: '羽刃投擲', form: 'agile1', maxLv: 10, icon: 'featherThrow', type: 'bolt', proj: 'feather',
    mp: (lv) => 5 + Math.floor((lv - 1) / 3),
    mult: (lv) => 1.1 + 0.07 * (lv - 1),
    count: 2, speed: 760, reach: 560, castTime: 0.3, fireAt: 0.08, knock: 90,
    desc: (lv) => '丟出 2 枚風之羽刃，各造成 ' + Math.round((1.1 + 0.07 * (lv - 1)) * 100) + '% 傷害',
  },
  galeStep: {
    name: '疾風', form: 'agile1', maxLv: 10, icon: 'galeStep', type: 'passive',
    value: (lv) => ({ speed: 0.05 + 0.01 * lv }),
    desc: (lv) => '被動：移動速度與跳躍力 +' + Math.round((0.05 + 0.01 * lv) * 100) + '%',
  },
});
