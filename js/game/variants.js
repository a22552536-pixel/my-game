// 怪物特質的行為（v1.5）：同一種怪物會出現不同的「個性」。定義在 js/data/balance.js 的 variants。
//   虛空：會短距離瞬移。中毒：打到你會持續掉血，走過的地方留下毒灘。
//   猥瑣：打到你會偷金葉然後逃跑，打倒牠會連本帶利掉回來。
//   偽善：看起來很友善、不會追你；你一靠近就背刺（傷害加倍），然後翻臉變憤怒。
(function () {
  'use strict';
  const U = G.util;
  const topY = (m) => m.y - (m.hover || 0) - m.h * (m.scale || 1);
  const midY = (m) => m.y - (m.hover || 0) - m.h * (m.scale || 1) * 0.5;
  const say = (m, text, color) => G.fx.text(m.x, topY(m) - 18, text, color, 15, 0.9);

  G.variantHooks = {
    // 怪物近身打中玩家之後
    onHit(m) {
      const V = m.V;
      const P = G.player;
      if (!V || m.dead) return;
      if (V.poison) {
        if (!(P.poisonT > 0)) G.fx.text(P.x, P.y - 90, '中毒了！', '#9af07a', 16, 0.9);
        P.poisonT = 3.2;
      }
      if (V.thief && !(m.fleeT > 0)) {
        const n = Math.min(P.gold, Math.round(5 + (m.level || 1) * 2));
        if (n > 0) {
          P.gold -= n;
          m.stolen = (m.stolen || 0) + n;
          G.fx.text(P.x, P.y - 80, '-' + n + ' 金葉', '#ffd35a', 16, 1);
          say(m, '嘿嘿嘿……', '#e8d49a');
          G.audio.play('pickup');
        }
        m.fleeT = 2.6;
      }
    },
  };

  const MP = G.Monster.prototype;
  const baseUpdate = MP.update;
  MP.update = function (dt) {
    const V = this.V;
    if (!V || this.dead) return baseUpdate.call(this, dt);
    const P = G.player;
    const prevX = this.x;
    // 偽善：翻臉之前不追人
    if (V.twoFaced && !this.revealed) this.aggroT = 0;
    const removed = baseUpdate.call(this, dt);
    if (removed || this.dead) return removed;
    const [lo, hi] = this.bounds();

    // 猥瑣：偷完就跑
    if (this.fleeT > 0) {
      this.fleeT -= dt;
      const away = U.sign(this.x - P.x) || this.dir;
      this.dir = away;
      this.x = U.clamp(prevX + away * this.def.speed * 2.2 * dt, lo, hi);
      this.aggroT = 0;
    }

    // 虛空：每隔幾秒短距離瞬移
    if (V.blink) {
      this.blinkT = (this.blinkT == null ? U.rand(2, 4) : this.blinkT) - dt;
      if (this.blinkFade > 0) this.blinkFade -= dt;
      if (this.blinkT <= 0 && this.aggroT > 0 && this.onGround) {
        this.blinkT = U.rand(3.5, 5.5);
        G.fx.burst(this.x, midY(this), ['#2a1250', '#b89aff', '#ffffff'], 12, 200, { life: 0.4 });
        this.x = U.clamp(this.x + (Math.random() < 0.5 ? -1 : 1) * U.rand(90, 150), lo, hi);
        this.blinkFade = 0.35;
        G.fx.burst(this.x, midY(this), ['#2a1250', '#b89aff'], 10, 160, { life: 0.35 });
        G.audio.play('portal');
      }
    }

    // 中毒：走過的地方留下毒灘
    if (V.poison && this.onGround && Math.abs(this.x - prevX) > 0.1) {
      this.poolT = (this.poolT || 0) - dt;
      if (this.poolT <= 0) {
        this.poolT = 2.4;
        G.world.zones.push({ kind: 'poisonpool', x: this.x, y: this.y, r: 34 * (this.scale || 1), t: 0, life: 3.2, tick: 0.4, pct: 0.012, noSlow: true });
      }
    }

    // 偽善：玩家一靠近就背刺，然後翻臉
    if (V.twoFaced && !this.revealed && P.alive() && Math.abs(P.x - this.x) < 90 && Math.abs(P.y - this.y) < 60) {
      this.revealed = true;
      P.hurt(Math.round(this.atk * 1.8), this.x);
      say(this, '（笑）……騙你的。', '#ff8a8a');
      G.fx.shake(4, 0.15);
      G.audio.play('swing');
      this.V = Object.assign({}, V, { tint: '#8a1020', tintAmt: 0.35, aggressive: true, color: '#ff7a6a' });
      this.atk = Math.round(this.atk * 1.2);
      this.aggroT = 30;
    }
    return removed;
  };

  // 玩家中毒：每 0.6 秒掉一點血（無視無敵、不會被擊退）
  const baseP = G.player.update;
  G.player.update = function (dt) {
    const out = baseP.apply(this, arguments);
    if (this.dead) this.poisonT = 0;
    if (this.poisonT > 0) {
      this.poisonT -= dt;
      this.poisonTick = (this.poisonTick || 0) - dt;
      if (this.poisonTick <= 0) {
        this.poisonTick = 0.6;
        // 毒無視防禦：直接扣最大血量的 1.5%
        const n = Math.max(1, Math.round(this.maxHp * 0.015));
        if (!G.opts.godMode) {
          this.hp -= n;
          G.fx.damage(this.x, this.y - 70, n, 'player');
          if (this.hp <= 0) this.die();
        }
        G.fx.particles.push({ x: this.x + U.rand(-10, 10), y: this.y - 40, vx: 0, vy: -50, life: 0.5, t: 0, size: 4, color: 'rgba(130,230,90,0.8)', grav: 0, shape: 'circle', drag: 0 });
      }
    }
    return out;
  };

  // 猥瑣：打倒牠，偷走的金葉連本帶利掉回來
  const baseKilled = G.world.onMonsterKilled;
  G.world.onMonsterKilled = function (m) {
    baseKilled.call(this, m);
    if (m.stolen > 0 && G.loot && G.loot.spawn) {
      G.loot.spawn('gold', m.x, m.y - 20, { amount: Math.round(m.stolen * 1.5) });
      G.fx.text(m.x, m.y - 60, '金葉還你！', '#ffd35a', 15, 0.9);
    }
  };
})();
