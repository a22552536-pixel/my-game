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
  forms: {
    base: { name: '小鬃', hp: 1, mp: 1, atk: 1, crit: 0.05 },
  },
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
  critMult: 1.5,
  dmgVariance: [0.85, 1.0],
  defFactor: 0.5,

  // ── 怪物 ──
  monsterHp: (lv) => Math.round(12 * Math.pow(lv, 1.15)),
  monsterAtk: (lv) => Math.round(4 + lv * 2.2),
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
