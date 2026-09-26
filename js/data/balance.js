// 平衡數值。所有「感覺不對」的地方先來這裡調。
G.data.balance = {
  // ── 移動手感（楓之谷式：固定跳躍弧線、重力偏重）──
  gravity: 2100,
  maxFall: 950,
  walkSpeed: 215,
  groundAccel: 2400,
  airAccel: 420,
  jumpVel: 700,
  climbSpeed: 160,
  ropeJumpVx: 190,
  ropeJumpVy: 430,

  // ── 受擊 ──
  hurtKnockX: 260,
  hurtKnockY: 330,
  hurtStun: 0.28,
  invincible: 1.5,

  // ── 打擊感 ──
  hitstop: { normal: 0.05, heavy: 0.09 },
  shake: { heavy: [5, 0.18], crit: [3, 0.12], boss: [12, 0.35] },

  // ── 成長 ──
  levelCap: 60,
  expToNext: (lv) => Math.floor(10 * Math.pow(lv, 1.6)) + 5,
  // 各形態的能力倍率。進化每升一轉，攻擊再乘上一點。
  forms: (function () {
    const f = { base: { hp: 1, mp: 1, atk: 1, crit: 0.2 } };
    for (let k = 1; k <= 4; k++) {
      f['might' + k] = { hp: 1.4 + 0.1 * (k - 1), mp: 0.6, atk: 1.15 + 0.08 * (k - 1), crit: 0.2 };
      f['magic' + k] = { hp: 0.8, mp: 1.8 + 0.1 * (k - 1), atk: 1.2 + 0.08 * (k - 1), crit: 0.23 };
      f['agile' + k] = { hp: 1.0, mp: 0.9, atk: 1.1 + 0.08 * (k - 1), crit: 0.33 + 0.02 * (k - 1) };
    }
    // 五轉：三條路線匯集，各項都取高
    f.apex = { hp: 1.5, mp: 1.6, atk: 1.5, crit: 0.32 };
    return f;
  })(),
  playerStats(lv, form) {
    const c = this.forms[form] || this.forms.base;
    return {
      maxHp: Math.round((50 + 16 * lv) * c.hp),
      maxMp: Math.round((30 + 9 * lv) * c.mp),
      atk: (5 + 2 * lv) * c.atk,
      def: lv * 0.5,
      crit: c.crit,
    };
  },
  critMult: 1.6,
  dmgVariance: [0.85, 1.0],
  defFactor: 0.5,

  // ── 怪物 ──
  // 第二章（Lv11）開始，怪物的血量、攻擊跟著等級加速成長：
  // 一轉之後有範圍技、裝備與任務經驗也讓玩家變強得快，原本的曲線到第二章會顯得太軟。
  monsterHp: (lv) => Math.round(12 * Math.pow(lv, 1.15) * (1 + 0.045 * Math.min(10, Math.max(0, lv - 10)) + 0.012 * Math.max(0, lv - 20))),
  monsterAtk: (lv) => Math.round(4 + lv * 2.2 + 1.1 * Math.min(10, Math.max(0, lv - 10)) + 0.5 * Math.max(0, lv - 20)),
  monsterDef: (lv) => Math.round(lv * 0.8),
  monsterExp: (lv) => 3 * lv,
  respawnTime: 7,
  aggroTime: 8,
  eliteHpMult: 5,
  eliteAtkMult: 1.4,
  eliteExpMult: 4,
  eliteScale: 1.45,
  shinyChance: 0.01,
  shinyExpMult: 5,
  // 變異個體：同一種怪的變體，不用重新設計，靠大小、色調、動作做出差異
  variants: {
    giant: { chance: 0.04, name: '巨大', color: '#ffb070', scale: 1.45, hp: 3, atk: 1.3, exp: 3, speed: 0.8, loot: 'elite' },
    tiny: { chance: 0.04, name: '迷你', color: '#b0f0ff', scale: 0.65, hp: 0.6, atk: 0.8, exp: 2, speed: 1.7, loot: 'gold' },
    rage: { chance: 0.03, name: '狂暴', color: '#ff7a6a', tint: '#ff3a2a', tintAmt: 0.38, hp: 1.6, atk: 1.6, exp: 2.5, speed: 1.4, aggressive: true, loot: 'elite' },
    ghost: { chance: 0.02, name: '幽靈', color: '#c8d8ff', tint: '#b8c8ff', tintAmt: 0.5, alpha: 0.6, hp: 1.3, atk: 1.2, exp: 3, speed: 1.1, float: true, loot: 'elite' },
  },

  // ── 掉落 ──
  pickupDelay: 0.35,
  magnetRadius: 80,
  dropLifetime: 120,
  potionCooldown: 0.5,
  bagSize: 30,

  // ── 自然回復 ──
  hpRegen: { every: 5, pct: 0.02 },
  mpRegen: { every: 2, pct: 0.02 },

  // ── 其他 ──
  autosaveInterval: 30,
};
