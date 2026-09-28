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
        if (S && S.hitFx === 'steel' && G.art.chargeFx) G.art.chargeFx.hit(m, U.sign(m.x - G.player.x) || G.player.dir);
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
          // 身邊的影子分身（js/art/shadowclone.js）影步過去出手；分身不在時只留一道暗紫色的爪痕（不再畫黃色的主角殘影）
          if (!(G.art.shadowCloneFx && G.art.shadowCloneFx.strike(m))) G.fx.slash(m.x, m.y - (m.hover || 0) - (m.h || 40) * (m.scale || 1) * 0.5, U.sign(m.x - P.x) || 1, 30, '#7a5aa8', 'claw');
          this.hitMonster(m, mult * v, Object.assign({}, opts, { clone: true, knock: 0 }));
        });
      }
      const r = this.roll(P.atk, mult, m.armor, P.crit);
      const dir = U.sign(m.x - P.x);
      const dealt = m.takeDamage(r.dmg, dir, opts.knock || 0, r.crit);
      const stack = m.nextStack();
      // 普攻（沒有指定音色、不是重擊）用一般數字；技能用技能數字；暴擊另外一種
      const basic = opts.sound === undefined && !opts.heavy;
      G.fx.damage(m.x, m.y - (m.hover || 0) - m.h * (m.scale || 1) - 10, dealt, r.crit ? 'crit' : basic ? 'normal' : 'skill', stack, dir);
      // 打擊感：命中聲（材質＋強度）、目標後仰、碎屑（js/game/feel.js）；這一下打死的話算「最後一擊」，
      // 命中停頓也多停一點（連續打死好幾隻時照 hsCool 規則只補兩成，不會一頓一頓）
      const killed = m.dead && dealt > 0;
      const tier = r.crit ? 2 : killed && !opts.noFx ? 4 : opts.heavy ? 3 : basic ? 0 : 1;

      const cx = m.x;
      // 飛行怪（hover）：命中特效打在身體上，不是影子上
      const cy = m.y - (m.hover || 0) - m.h * (m.scale || 1) * 0.5;
      // 持續型的多段傷害（例如冥道殘月破的黑洞）：只留小火花，不震畫面、不頓格、不推鏡頭
      if (opts.noFx) {
        m.squash = 1;
        if (killed && G.feel) G.feel.onHit(m, 1, opts, dir, true);
        G.fx.burst(cx, cy, r.crit ? ['#ffffff', '#ffd27a'] : ['#ffffff', '#d8c8ff'], r.crit ? 4 : 2, 160, { life: 0.25 });
      } else {
      // 暴擊（黑閃）的命中光改成冷硬的白＋暗紅，不再是金黃色的星星，黑色閃電才是主角
      G.fx.burst(cx, cy, r.crit ? ['#fff', '#ff5a6a'] : ['#fff', '#fff3c0'], r.crit ? 5 : 7, r.crit ? 300 : 220, { life: 0.3 });
      if (!r.crit) G.fx.ring(cx, cy, 'rgba(255,255,255,0.8)', 34, 0.18, 3);
      G.fx.impact(cx + U.rand(-8, 8), cy + U.rand(-8, 8), r.crit ? 38 : opts.heavy ? 58 : 44, r.crit ? '#ff3a4a' : opts.heavy ? '#ffe08a' : '#fff3c8');
      G.fx.streak(cx, cy, dir > 0 ? U.rand(-0.7, -0.3) : Math.PI + U.rand(0.3, 0.7), r.crit ? 120 : 95, r.crit ? '#ffffff' : '#ffffff', r.crit ? 7 : 6);
      if (!opts.calm) G.fx.kick(dir * (r.crit ? 7 : opts.heavy ? 5 : 3), r.crit ? -2 : 0);
      if (!opts.noSquash) m.squash = 1; // 雷刃連鎖等連打技能不壓扁怪物
      // 地爆天星的每一發都是黑閃（大一號、閃電繞著石球）；其他攻擊只有暴擊才是黑閃，繞著怪物的身體
      const chi = opts.sound === 'crit' && G.skillExec.ults ? G.skillExec.ults.find((u) => u.kind === 'chibaku' && u.m === m) : null;
      if (chi) G.fx.blackFlash(chi.hitX != null ? chi.hitX : cx, chi.hitY != null ? chi.hitY : cy, dir, chi.n >= chi.S.hits - 1 ? 2.3 : 1.5, chi.size * 0.8);
      if (r.crit) {
        // 黑閃：命中點空間扭曲、細碎分岔的黑色閃電
        if (!chi) G.fx.blackFlash(cx, cy, dir, 1, Math.max(14, Math.min(70, Math.max(m.w || 40, m.h || 40) * (m.scale || 1) * 0.45)));
        if (P.specials.focus) P.mp = Math.min(P.maxMp, P.mp + 3);
        G.fx.addHitstop(opts.calm ? 0.03 : killed ? 0.13 : 0.12);
        // 黑閃不震畫面（常常連發，整個畫面一直抖會累）：特效只留在命中點附近
      } else if (opts.heavy) {
        G.fx.addHitstop(Math.max(b.hitstop.heavy * 0.8, killed ? 0.09 : 0));
        if (!chi) G.fx.shake(b.shake.heavy[0] * 0.6, b.shake.heavy[1]);
      } else {
        G.fx.addHitstop(opts.calm ? 0 : killed ? 0.085 : b.hitstop.normal);
      }
      if (G.feel) G.feel.onHit(m, tier, opts, dir, killed);
      else G.audio.play(r.crit ? 'crit' : opts.heavy ? 'heavy' : 'hit');
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
