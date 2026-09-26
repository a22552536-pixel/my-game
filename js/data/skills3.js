// 技能 v3：三條路線的玩法拉開。
//   力量（劍士）：貼身物理技，每招樣子都不同：重擊、橫掃、衝撞、升龍、震地、千斤錘、連斬、滾石。
//   法術（法師）：火、雷、冰、流星四種元素，站遠打，有燃燒、冰凍、緩速等狀態。
//   敏捷（盜賊）：移動兼攻擊（後空翻、影遁、瞬影），加上各種飛鏢（連射、迴旋、扇形、風魔手裡劍）。
// 每條路線都有單體高傷、群體、不同距離，增益只有一個；沒有全畫面的技能。
// 這個檔案覆蓋 skills.js／skills2.js 裡的同名技能，並移除舊的。
(function () {
  'use strict';
  const K = G.data.skills;
  const pct = (v) => Math.round(v * 100) + '%';
  const lin = (a, b) => (lv) => a + b * (lv - 1);
  const mpf = (a, step) => (lv) => a + Math.floor((lv - 1) / (step || 3));

  // 被新技能取代的舊技能
  ['spiritBolt', 'spiritClaw', 'kingAura', 'mountainQuake', 'lionSoul', 'starRain', 'halo', 'healLight', 'auroraVeil', 'thousandBolts', 'stormRush'].forEach((id) => delete K[id]);

  // 調整保留技能所屬的轉數
  K.lionRoar.form = 'might2';

  Object.assign(K, {
    // ═════════ 力量 ═════════
    risingClaw: {
      name: '升龍爪', form: 'might2', maxLv: 10, icon: 'risingClaw', type: 'uppercut',
      mp: mpf(9), mult: lin(1.3, 0.08), targets: 3, hits: 3, castTime: 0.55,
      desc: (lv) => '往上躍起連續上勾 3 下，把最多 3 隻敵人打上天，各 ' + pct(1.3 + 0.08 * (lv - 1)) + '（打得到上一層平台）',
    },
    hammerDrop: {
      name: '千斤錘', form: 'might3', maxLv: 10, icon: 'hammerDrop', type: 'hammer',
      mp: mpf(16), mult: lin(6.0, 0.35), range: 380, stun: 2, splash: 0.4, castTime: 0.7, cd: 4,
      desc: (lv) => '從天上砸下一把巨錘：前方 1 隻敵人 ' + pct(6.0 + 0.35 * (lv - 1)) + ' 並暈眩 2 秒，旁邊的敵人受到四成震波（冷卻 4 秒）',
    },
    lionBrandish: {
      name: '獅王連斬', form: 'might4', maxLv: 10, icon: 'lionBrandish', type: 'brandish',
      mp: mpf(18), mult: lin(1.5, 0.08), targets: 3, hits: 6, range: { w: 260, h: 120 }, castTime: 0.72,
      desc: (lv) => '居合：一瞬間拔刀衝過前方，最多 3 隻敵人身上浮現 6 段刀痕，各 ' + pct(1.5 + 0.08 * (lv - 1)) + '（衝刺時無敵）',
    },
    boulderRoll: {
      name: '巨岩滾擊', form: 'might4', maxLv: 10, icon: 'boulderRoll', type: 'shot', proj: 'boulder',
      mp: mpf(20), mult: lin(3.0, 0.15), speed: 520, reach: 900, r: 36, pierce: 99, rolling: true, knock: 520, heavy: true, castTime: 0.5, fireAt: 0.22,
      desc: (lv) => '推出一顆巨岩沿著地面滾過去，壓過的每隻敵人 ' + pct(3.0 + 0.15 * (lv - 1)) + ' 並擊飛',
    },

    // ═════════ 法術 ═════════
    flameBolt: {
      name: '火焰彈', form: 'magic1', maxLv: 10, icon: 'flameBolt', type: 'shot', proj: 'flame',
      mp: mpf(5), mult: lin(2.0, 0.14), speed: 640, reach: 560, r: 14, explode: 90, splash: 0.6, burn: 3, castTime: 0.36, fireAt: 0.12, knock: 180,
      desc: (lv) => '射出火球，命中 ' + pct(2.0 + 0.14 * (lv - 1)) + ' 並在周圍爆炸，被炸到的敵人燃燒 3 秒',
    },
    chainLightning: {
      name: '雷光鏈', form: 'magic1', maxLv: 10, icon: 'chainLightning', type: 'chainL',
      mp: mpf(8), mult: lin(1.7, 0.1), bounces: 4, radius: 460, jump: 260, castTime: 0.4, hitAt: 0.12,
      desc: (lv) => '閃電打中最近的敵人後再跳向另外 3 隻，第一下 ' + pct(1.7 + 0.1 * (lv - 1)) + '，每跳一次弱一點',
    },
    iceLance: {
      name: '冰霜長槍', form: 'magic2', maxLv: 10, icon: 'iceLance', type: 'shot', proj: 'icelance',
      mp: mpf(10), mult: lin(2.4, 0.14), speed: 900, reach: 700, r: 16, pierce: 4, freeze: 1.6, castTime: 0.4, fireAt: 0.14, knock: 60,
      desc: (lv) => '擲出冰槍，貫穿一直線上最多 4 隻，各 ' + pct(2.4 + 0.14 * (lv - 1)) + ' 並冰凍 1.6 秒',
    },
    meteor: {
      name: '天輝流星', form: 'magic3', maxLv: 10, icon: 'meteor', type: 'meteorT',
      mp: mpf(22), mult: lin(4.0, 0.22), radius: 700, blast: 180, burnZone: 3, castTime: 0.6, hitAt: 0.2, cd: 5,
      desc: (lv) => '召喚一顆大流星砸向敵人最密集的地方：範圍 180 內 ' + pct(4.0 + 0.22 * (lv - 1)) + '，落地後燃燒 3 秒（冷卻 5 秒）',
    },
    blizzard: {
      name: '暴風雪', form: 'magic3', maxLv: 10, icon: 'blizzard', type: 'blizzardT',
      mp: mpf(18), mult: lin(0.7, 0.04), width: 380, time: 2.4, tick: 0.3, targets: 8, castTime: 0.5, hitAt: 0.15,
      desc: (lv) => '在前方降下暴風雪 2.4 秒：範圍內最多 8 隻，每 0.3 秒 ' + pct(0.7 + 0.04 * (lv - 1)) + '、緩速，有機率冰凍',
    },
    magicSurge: {
      name: '魔力增幅', form: 'magic3', maxLv: 10, icon: 'magicSurge', type: 'buff',
      mp: mpf(16, 2), buff: (lv) => ({ key: 'atk', v: 0.18 + 0.012 * lv, time: 60 }), cd: 5, aura: '#b8a0ff',
      desc: (lv) => '符文環繞：60 秒內傷害 +' + pct(0.18 + 0.012 * lv),
    },
    thunderJudge: {
      name: '雷霆審判', form: 'magic4', maxLv: 10, icon: 'thunderJudge', type: 'judge',
      mp: mpf(24), mult: lin(9.0, 0.5), radius: 620, stun: 1, castTime: 0.7, hitAt: 0.45, cd: 6,
      desc: (lv) => '一道巨雷劈中附近最強的敵人：' + pct(9.0 + 0.5 * (lv - 1)) + ' 並麻痺 1 秒（冷卻 6 秒）',
    },
    auroraStorm: {
      name: '極光風暴', form: 'magic4', maxLv: 10, icon: 'auroraStorm', type: 'auroraS',
      mp: mpf(26), mult: lin(1.6, 0.09), radius: 480, waves: 3, targets: 10, slow: 3, castTime: 0.7, hitAt: 0.25,
      desc: (lv) => '極光在身邊捲成風暴：半徑 480 內最多 10 隻，3 波各 ' + pct(1.6 + 0.09 * (lv - 1)) + ' 並緩速',
    },

    // ═════════ 敏捷 ═════════
    featherThrow: {
      name: '迴身飛燕', form: 'agile1', maxLv: 10, icon: 'featherThrow', type: 'flip',
      mp: mpf(5), mult: lin(1.2, 0.08), count: 2, speed: 820, reach: 520, castTime: 0.45,
      desc: (lv) => '往後空翻拉開距離，同時往前擲出 2 枚飛鏢，各 ' + pct(1.2 + 0.08 * (lv - 1)) + '（翻身時無敵）',
    },
    shadowStep: {
      name: '影遁斬', form: 'agile2', maxLv: 10, icon: 'shadowStep', type: 'dash',
      mp: mpf(9), mult: lin(2.0, 0.12), targets: 6, dashSpeed: 1150, dashTime: 0.24,
      invuln: true, ghost: '#5a3e78', hitFx: 'shadow', knock: 180,
      desc: (lv) => '化成黑影往前穿過最多 6 隻敵人（過程無敵），穿過後斬痕才爆開，各 ' + pct(2.0 + 0.12 * (lv - 1)),
    },
    bladeRain: {
      name: '天降飛刃', form: 'agile3', maxLv: 10, icon: 'bladeRain', type: 'bladeRainT',
      mp: mpf(14), mult: lin(1.1, 0.06), count: 7, speed: 760, castTime: 0.6,
      desc: (lv) => '一躍而起，往下方扇形擲出 7 枚手裡劍，各 ' + pct(1.1 + 0.06 * (lv - 1)),
    },
    windShuriken: {
      name: '風魔手裡劍', form: 'agile4', maxLv: 10, icon: 'windShuriken', type: 'shot', proj: 'bigShuriken',
      mp: mpf(22), mult: lin(0.9, 0.05), speed: 260, reach: 820, r: 64, pierce: 99, multiHit: 0.22, maxHits: 8, knock: 20, castTime: 0.5, fireAt: 0.2,
      desc: (lv) => '擲出巨大的風魔手裡劍慢慢往前轉，經過的敵人每 0.22 秒被削一下（最多 8 下），每下 ' + pct(0.9 + 0.05 * (lv - 1)),
    },
    phantomStrike: {
      name: '瞬影百擊', form: 'agile4', maxLv: 10, icon: 'phantomStrike', type: 'phantom',
      mp: mpf(24), mult: lin(1.4, 0.08), targets: 6, hits: 3, radius: 520, cd: 5,
      desc: (lv) => '在附近最多 6 隻敵人之間瞬移，每隻斬 3 下，各 ' + pct(1.4 + 0.08 * (lv - 1)) + '（過程無敵，冷卻 5 秒）',
    },
  });

  // 保留下來的技能：說明跟著新的定位調整
  K.thunderCombo.form = 'agile3';
  K.boomerang.form = 'agile2';
})();
