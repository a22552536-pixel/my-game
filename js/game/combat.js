// 傷害計算與命中回饋。
(function () {
  'use strict';
  const U = G.util;

  G.combat = {
    roll(atk, mult, targetDef, crit) {
      const b = G.data.balance;
      const isCrit = Math.random() < crit;
      let d = atk * mult * U.rand(b.dmgVariance[0], b.dmgVariance[1]);
      if (isCrit) d *= b.critMult;
      d -= targetDef * b.defFactor;
      return { dmg: Math.max(1, Math.round(d)), crit: isCrit };
    },

    // 所有可以被打的目標（一般怪 + Boss）
    targets() {
      const list = G.world.monsters.filter((m) => !m.dead);
      if (G.world.boss && !G.world.boss.dead) list.push(G.world.boss);
      return list;
    },

    playerHit(box, maxTargets, mult, opts) {
      const P = G.player;
      const hits = this.targets()
        .filter((m) => U.overlap(box, m.hitbox()))
        .sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x))
        .slice(0, maxTargets);
      hits.forEach((m) => this.hitMonster(m, mult, opts));
      return hits.length;
    },

    playerDashHit(box, action, maxTargets, mult) {
      if (action.hits.length >= maxTargets) return;
      for (const m of this.targets()) {
        if (action.hits.length >= maxTargets) break;
        if (action.hits.indexOf(m) >= 0) continue;
        if (!U.overlap(box, m.hitbox())) continue;
        action.hits.push(m);
        this.hitMonster(m, mult, { knock: 260, heavy: true });
      }
    },

    hitMonster(m, mult, opts) {
      opts = opts || {};
      const P = G.player;
      const b = G.data.balance;
      const r = this.roll(P.atk, mult, m.armor, P.crit);
      const dir = U.sign(m.x - P.x);
      const dealt = m.takeDamage(r.dmg, dir, opts.knock || 0, r.crit);
      const stack = m.nextStack();
      G.fx.damage(m.x, m.y - m.h * (m.scale || 1) - 10, dealt, r.crit ? 'crit' : 'normal', stack);

      const cx = m.x;
      const cy = m.y - m.h * (m.scale || 1) * 0.5;
      G.fx.burst(cx, cy, r.crit ? ['#fff', '#ffd27a', '#ff8a3a'] : ['#fff', '#fff3c0'], r.crit ? 12 : 7, r.crit ? 320 : 220, { life: 0.35 });
      G.fx.ring(cx, cy, 'rgba(255,255,255,0.8)', r.crit ? 50 : 34, 0.18, 3);
      if (r.crit) {
        G.fx.addHitstop(b.hitstop.heavy);
        G.fx.shake(b.shake.crit[0], b.shake.crit[1]);
        G.audio.play('crit');
      } else if (opts.heavy) {
        G.fx.addHitstop(b.hitstop.heavy * 0.8);
        G.fx.shake(b.shake.heavy[0] * 0.6, b.shake.heavy[1]);
        G.audio.play('heavy');
      } else {
        G.fx.addHitstop(b.hitstop.normal);
        G.audio.play('hit');
      }

      // 傳說特效
      if (P.specials.leech) {
        const heal = Math.max(1, Math.round(dealt * 0.03));
        if (P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + heal);
      }
      if (P.specials.thunder && !m.dead && Math.random() < 0.1) {
        const t = this.roll(P.atk, 1.0, m.armor, 0);
        const d2 = m.takeDamage(t.dmg, dir, 0, false);
        G.fx.bolt(m.x, m.y - 360, m.y - 10);
        G.fx.damage(m.x, m.y - m.h * (m.scale || 1) - 10, d2, 'crit', m.nextStack());
        G.fx.screenFlash('#fffbd0', 0.25);
        G.audio.play('thunder');
      }
      return dealt;
    },
  };
})();
