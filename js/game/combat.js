// 傷害計算與命中回饋。
(function () {
  'use strict';
  const U = G.util;

  G.combat = {
    roll(atk, mult, targetDef, crit) {
      const b = G.data.balance;
      const isCrit = Math.random() < crit;
      let d = atk * mult * U.rand(b.dmgVariance[0], b.dmgVariance[1]);
      const lethal = G.player.passive('lethal');
      if (isCrit) d *= b.critMult + G.story.critBonus() + (lethal ? lethal.critDmg : 0);
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

    playerDashHit(box, action, maxTargets, mult, S) {
      if (action.hits.length >= maxTargets) return;
      for (const m of this.targets()) {
        if (action.hits.length >= maxTargets) break;
        if (action.hits.indexOf(m) >= 0) continue;
        if (!U.overlap(box, m.hitbox())) continue;
        action.hits.push(m);
        if (S && S.hitFx === 'shadow') {
          // 影步：穿過去之後斬痕才爆開
          G.fx.slash(m.x, m.y - m.h * 0.5, 1, 30, '#b88aff', 'claw');
          G.skillExec.later(0.22, () => {
            if (!G.skillExec.alive(m)) return;
            G.fx.slash(m.x, m.y - m.h * 0.5, -1, 44, '#8a5ad0', 'wide');
            G.fx.burst(m.x, m.y - m.h * 0.5, ['#b88aff', '#2e1f44', '#ffffff'], 12, 260);
            this.hitMonster(m, mult, { knock: S.knock, heavy: true, sound: 'double' });
          });
          continue;
        }
        if (S && S.hitFx === 'steel') G.fx.burst(m.x, m.y - m.h * 0.5, ['#ffd27a', '#ffffff', '#c8d4e6'], 10, 300, { shape: 'square', size: 3 });
        this.hitMonster(m, mult, { knock: (S && S.knock) || 260, heavy: true, sound: S && S.hitFx === 'steel' ? 'rock' : undefined });
      }
    },

    hitMonster(m, mult, opts) {
      opts = opts || {};
      const P = G.player;
      const b = G.data.balance;
      const hunt = P.passive('hunterInstinct');
      if (hunt && m.maxHp && m.hp < m.maxHp * 0.3) mult *= 1 + hunt.execute;
      // 分身：追加一下較弱的攻擊
      if (P.buffs && P.buffs.clone && !opts.clone) {
        const v = P.buffs.clone.v;
        G.skillExec.later(0.12, () => {
          if (!G.skillExec.alive(m)) return;
          G.fx.ghost(m.x - U.sign(m.x - P.x) * 40, P.y, U.sign(m.x - P.x), { state: 'attack', t: P.t, p: 0.5, form: P.form }, '#ffe44a');
          this.hitMonster(m, mult * v, Object.assign({}, opts, { clone: true, knock: 0 }));
        });
      }
      const r = this.roll(P.atk, mult, m.armor, P.crit);
      const dir = U.sign(m.x - P.x);
      const dealt = m.takeDamage(r.dmg, dir, opts.knock || 0, r.crit);
      const stack = m.nextStack();
      G.fx.damage(m.x, m.y - m.h * (m.scale || 1) - 10, dealt, r.crit ? 'crit' : 'normal', stack);

      const cx = m.x;
      const cy = m.y - m.h * (m.scale || 1) * 0.5;
      G.fx.burst(cx, cy, r.crit ? ['#fff', '#ffd27a', '#ff8a3a'] : ['#fff', '#fff3c0'], r.crit ? 12 : 7, r.crit ? 320 : 220, { life: 0.35 });
      G.fx.ring(cx, cy, 'rgba(255,255,255,0.8)', r.crit ? 50 : 34, 0.18, 3);
      G.fx.impact(cx + U.rand(-8, 8), cy + U.rand(-8, 8), r.crit ? 78 : opts.heavy ? 58 : 44, r.crit ? '#ffc23a' : opts.heavy ? '#ffe08a' : '#fff3c8');
      G.fx.streak(cx, cy, dir > 0 ? U.rand(-0.7, -0.3) : Math.PI + U.rand(0.3, 0.7), r.crit ? 130 : 95, r.crit ? '#ffe7a0' : '#ffffff', r.crit ? 9 : 6);
      if (r.crit) G.fx.burst(cx, cy, ['#ffe066', '#ffffff'], 6, 380, { shape: 'star', size: 5, life: 0.4, grav: 300 });
      G.fx.kick(dir * (r.crit ? 7 : opts.heavy ? 5 : 3), r.crit ? -2 : 0);
      m.squash = 1;
      if (r.crit) {
        // 黑閃：命中點迸出幾道短閃電
        G.fx.blackFlash(cx, cy, dir);
        if (P.specials.focus) P.mp = Math.min(P.maxMp, P.mp + 3);
        G.fx.addHitstop(0.13);
        G.fx.shake(b.shake.crit[0] + 3, b.shake.crit[1] + 0.05);
        G.audio.play('crit');
      } else if (opts.heavy) {
        G.fx.addHitstop(b.hitstop.heavy * 0.8);
        G.fx.shake(b.shake.heavy[0] * 0.6, b.shake.heavy[1]);
        G.audio.play(opts.sound === 'rock' ? 'rockHit' : opts.sound === 'sweep' ? 'sweepHit' : 'heavy');
      } else {
        G.fx.addHitstop(b.hitstop.normal);
        const snd = { spirit: 'spiritHit', feather: 'featherHit', double: 'claw' }[opts.sound];
        G.audio.play(snd || 'hit');
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
