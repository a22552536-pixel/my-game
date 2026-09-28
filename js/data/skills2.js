// 二轉到四轉的技能。機制與特效設計見 DESIGN.md 第 16 節。
// 新的 type 由 js/game/skills2.js 執行：
//   dash（沿用）  衝刺並撞到最多 targets 隻；invuln 過程無敵、ghost 殘影顏色、hitFx 命中特效
//   quake        地震：same 同一層平台（或 screen 畫面內地面）最多 targets 隻
//   stun         周圍 radius 內的怪暈眩 stun 秒
//   rain         從天而降，鎖定最多 targets 隻，每隻 repeat 下；fx：star／pillar／aurora／thunder
//   chain        在目標之間連跳的雷擊，每隻 repeat 下
//   blink        往按住的方向瞬移 dist
//   boomerang    飛出去再飛回來的羽刃，每隻最多被打 2 下
//   buff         增益 buff: { key, v, time }；cd 冷卻
//   heal         回復 pct 的 HP；cd 冷卻
//   passive      被動（value(lv) 回傳數值）
(function () {
  'use strict';
  const pct = (v) => Math.round(v * 100) + '%';
  const lin = (a, b) => (lv) => a + b * (lv - 1);
  const mpf = (a, step) => (lv) => a + Math.floor((lv - 1) / (step || 3));

  Object.assign(G.data.skills, {
    // ── 力量 二轉：鋼鬃獅 ──
    chargeSlam: {
      name: '衝鋒撞擊', form: 'might2', maxLv: 10, icon: 'chargeSlam', type: 'dash',
      mp: mpf(10), mult: lin(1.8, 0.12), targets: 8, dashSpeed: 900, dashTime: 0.35,
      ghost: '#c8d4e6', hitFx: 'steel', knock: 520,
      desc: (lv) => '鋼板鬃毛向前衝撞 0.35 秒，推開最多 8 隻，各 ' + pct(1.8 + 0.12 * (lv - 1)),
    },
    lionRoar: {
      name: '雄獅怒吼', form: 'might2', maxLv: 10, icon: 'lionRoar', type: 'buff',
      mp: mpf(14, 2), buff: (lv) => ({ key: 'atk', v: 0.15 + 0.012 * lv, time: 60 }), cd: 5, aura: '#ff6a4a',
      desc: (lv) => '怒吼激發鬥志：60 秒內攻擊 +' + pct(0.15 + 0.012 * lv),
    },
    steelMane: {
      name: '鋼鬃', form: 'might2', maxLv: 10, icon: 'steelMane', type: 'passive',
      value: (lv) => ({ hp: 0.02 * lv }),
      desc: (lv) => '被動：HP 上限 +' + pct(0.02 * lv),
    },
    // ── 力量 三轉：山王獅 ──
    quakeStrike: {
      name: '裂地震擊', form: 'might3', maxLv: 10, icon: 'quakeStrike', type: 'quake',
      mp: mpf(16), mult: lin(2.2, 0.14), targets: 12, same: true, castTime: 0.55, hitAt: 0.3,
      desc: (lv) => '重踏地面，震波沿著平台傳開：同一層最多 12 隻，各 ' + pct(2.2 + 0.14 * (lv - 1)),
    },
    kingAura: {
      name: '王者威壓', form: 'might3', maxLv: 10, icon: 'kingAura', type: 'stun',
      mp: mpf(14), radius: 300, stun: (lv) => 1.5 + 0.1 * lv, mult: lin(0.8, 0.05), cd: 8, castTime: 0.5, hitAt: 0.22,
      desc: (lv) => '散發王者之氣：周圍 300 內的怪暈眩 ' + (1.5 + 0.1 * lv).toFixed(1) + ' 秒（冷卻 8 秒）',
    },
    unyielding: {
      name: '不屈', form: 'might3', maxLv: 10, icon: 'unyielding', type: 'passive',
      value: (lv) => ({ cd: 90 - 3 * lv }),
      desc: (lv) => '被動：受到致命傷時保留 1 HP 並無敵 1.5 秒（每 ' + (90 - 3 * lv) + ' 秒一次）',
    },
    // ── 力量 四轉：震岳獅皇 ──
    mountainQuake: {
      name: '震岳', form: 'might4', maxLv: 10, icon: 'mountainQuake', type: 'quake',
      mp: mpf(24), mult: lin(3.2, 0.18), targets: 15, screen: true, castTime: 0.7, hitAt: 0.42, lava: true,
      desc: (lv) => '跳起砸地，熔岩從裂縫噴出：畫面內地面上最多 15 隻，各 ' + pct(3.2 + 0.18 * (lv - 1)),
    },
    lionSoul: {
      name: '獅皇之魂', form: 'might4', maxLv: 10, icon: 'lionSoul', type: 'buff',
      mp: mpf(20, 2), buff: (lv) => ({ key: 'soul', v: 0.4 + 0.01 * lv, time: 20 }), cd: 90, aura: '#ff9a3a',
      desc: (lv) => '熔岩裂紋全亮：20 秒內受到的傷害 -' + pct(0.4 + 0.01 * lv) + '（冷卻 90 秒）',
    },
    hundredBattles: {
      name: '百戰', form: 'might4', maxLv: 10, icon: 'hundredBattles', type: 'passive',
      value: (lv) => ({ heal: 0.005 + 0.0005 * lv }),
      desc: (lv) => '被動：每打倒一隻怪回復 ' + ((0.005 + 0.0005 * lv) * 100).toFixed(1) + '% HP',
    },

    // ── 法術 二轉：星鬃獅 ──
    starRain: {
      name: '星雨', form: 'magic2', maxLv: 10, icon: 'starRain', type: 'rain', fx: 'star',
      mp: mpf(12), mult: lin(1.6, 0.1), targets: 6, repeat: 1, radius: 560, castTime: 0.5, hitAt: 0.2,
      desc: (lv) => '6 顆星星各自追向不同的敵人，各 ' + pct(1.6 + 0.1 * (lv - 1)),
    },
    blink: {
      name: '瞬移', form: 'magic2', maxLv: 10, icon: 'blink', type: 'blink',
      mp: (lv) => Math.max(3, 8 - Math.floor(lv / 2)), dist: (lv) => 150 + 6 * lv, cd: 0.4,
      desc: (lv) => '往按住的方向（上下左右）瞬間移動 ' + (150 + 6 * lv) + '，可以穿過平台',
    },
    manaSpring: {
      name: '靈泉', form: 'magic2', maxLv: 10, icon: 'manaSpring', type: 'passive',
      value: (lv) => ({ mpRegen: 0.05 * lv }),
      desc: (lv) => '被動：MP 自然回復 +' + pct(0.05 * lv),
    },
    // ── 法術 三轉：天輝獅 ──
    meteor: {
      name: '天輝流星', form: 'magic3', maxLv: 10, icon: 'meteor', type: 'rain', fx: 'pillar',
      mp: mpf(22), mult: lin(2.0, 0.12), targets: 15, repeat: 1, radius: 900, castTime: 0.7, hitAt: 0.4, flash: true,
      desc: (lv) => '天空落下光柱：畫面內最多 15 隻，各 ' + pct(2.0 + 0.12 * (lv - 1)),
    },
    halo: {
      name: '光環', form: 'magic3', maxLv: 10, icon: 'halo', type: 'buff',
      mp: mpf(16, 2), buff: (lv) => ({ key: 'atk', v: 0.18 + 0.012 * lv, time: 60 }), cd: 5, aura: '#ffe36a',
      desc: (lv) => '頭上光環變大：60 秒內傷害 +' + pct(0.18 + 0.012 * lv),
    },
    resonance: {
      name: '共鳴', form: 'magic3', maxLv: 10, icon: 'resonance', type: 'passive',
      value: (lv) => ({ crit: 0.015 * lv }),
      desc: (lv) => '被動：黑閃率 +' + pct(0.015 * lv),
    },
    // ── 法術 四轉：極光獅神 ──
    auroraVeil: {
      name: '極光帷幕', form: 'magic4', maxLv: 10, icon: 'auroraVeil', type: 'rain', fx: 'aurora',
      mp: mpf(28), mult: lin(1.8, 0.1), targets: 15, repeat: 3, radius: 900, castTime: 0.8, hitAt: 0.35, slow: 3,
      desc: (lv) => '極光捲過畫面：最多 15 隻，3 段各 ' + pct(1.8 + 0.1 * (lv - 1)) + '，並緩速 3 秒',
    },
    healLight: {
      name: '治癒之光', form: 'magic4', maxLv: 10, icon: 'healLight', type: 'heal',
      mp: mpf(20, 2), pct: (lv) => 0.3 + 0.01 * lv, cd: 30,
      desc: (lv) => '回復 ' + pct(0.3 + 0.01 * lv) + ' HP（冷卻 30 秒）',
    },
    omniscience: {
      name: '萬象', form: 'magic4', maxLv: 10, icon: 'omniscience', type: 'passive',
      value: (lv) => ({ mpCut: 0.03 * lv }),
      desc: (lv) => '被動：所有技能的 MP 消耗 -' + pct(0.03 * lv),
    },

    // ── 敏捷 二轉：影鬃獅 ──
    shadowStep: {
      name: '影刃穿刺', form: 'agile2', maxLv: 10, icon: 'shadowStep', type: 'bolt', proj: 'shadowblade',
      mp: mpf(9), mult: lin(2.0, 0.12), count: 1, pierce: 5, speed: 820, reach: 640, castTime: 0.36, fireAt: 0.12, knock: 160,
      desc: (lv) => '擲出一把黑影長刃，貫穿一直線上最多 5 隻怪，各 ' + pct(2.0 + 0.12 * (lv - 1)),
    },
    boomerang: {
      name: '迴旋羽刃', form: 'agile2', maxLv: 10, icon: 'boomerang', type: 'boomerang',
      mp: mpf(10), mult: lin(1.4, 0.08), targets: 6, speed: 700, reach: 360, castTime: 0.32, fireAt: 0.1,
      desc: (lv) => '擲出旋轉羽刃，飛出去再飛回來：最多 6 隻，各打 2 下 ' + pct(1.4 + 0.08 * (lv - 1)),
    },
    afterimage: {
      name: '殘影', form: 'agile2', maxLv: 10, icon: 'afterimage', type: 'passive',
      value: (lv) => ({ dodge: 0.02 * lv }),
      desc: (lv) => '被動：' + pct(0.02 * lv) + ' 機率閃避攻擊，留下一個殘影',
    },
    // ── 敏捷 三轉：雷影獅 ──
    thunderCombo: {
      name: '雷刃連鎖', form: 'agile3', maxLv: 10, icon: 'thunderCombo', type: 'chain', thrown: true, hop: 0.12, hold: 1.8,
      mp: mpf(16), mult: lin(0.9, 0.05), targets: 3, repeat: 6, radius: 360, castTime: 0.7, hitAt: 0.12,
      desc: (lv) => '擲出鎖鏈苦無，把最多 3 隻敵人串起來定住 1.8 秒，鎖鏈持續通電：每隻 6 下 ' + pct(0.9 + 0.05 * (lv - 1)) + '，每一下都能打出黑閃',
    },
    shadowClone: {
      name: '分身', form: 'agile3', maxLv: 10, icon: 'shadowClone', type: 'buff',
      mp: mpf(18, 2), buff: (lv) => ({ key: 'clone', v: 0.3 + 0.02 * lv, time: 60 }), cd: 5, aura: '#ffd42a',
      desc: (lv) => '雷影分身跟在身邊：60 秒內每次攻擊追加一下 ' + pct(0.3 + 0.02 * lv) + ' 的傷害',
    },
    lethal: {
      name: '致命', form: 'agile3', maxLv: 10, icon: 'lethal', type: 'passive',
      value: (lv) => ({ critDmg: 0.05 * lv }),
      desc: (lv) => '被動：黑閃傷害 +' + pct(0.05 * lv),
    },
    // ── 敏捷 四轉：閃霆獅王 ──
    thousandBolts: {
      name: '千雷', form: 'agile4', maxLv: 10, icon: 'thousandBolts', type: 'rain', fx: 'thunder',
      mp: mpf(26), mult: lin(1.2, 0.07), targets: 10, repeat: 4, radius: 900, castTime: 0.8, hitAt: 0.3, flash: true,
      desc: (lv) => '10 道落雷同時劈下：畫面內最多 10 隻，各 4 下 ' + pct(1.2 + 0.07 * (lv - 1)),
    },
    stormRush: {
      name: '疾霆', form: 'agile4', maxLv: 10, icon: 'stormRush', type: 'buff',
      mp: mpf(20, 2), buff: (lv) => ({ key: 'storm', v: 0.1 + 0.01 * lv, time: 30 }), cd: 45, aura: '#5ab8ff',
      desc: (lv) => '雷雲全亮：30 秒內黑閃率 +' + pct(0.1 + 0.01 * lv) + '、移動速度 +30%（冷卻 45 秒）',
    },
    hunterInstinct: {
      name: '獵手本能', form: 'agile4', maxLv: 10, icon: 'hunterInstinct', type: 'passive',
      value: (lv) => ({ execute: 0.04 * lv }),
      desc: (lv) => '被動：對 HP 低於 30% 的怪，傷害 +' + pct(0.04 * lv),
    },
  });
})();
