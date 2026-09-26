// 主角小獅子：移動、爬繩、攻擊、技能、受擊、成長。
(function () {
  'use strict';
  const U = G.util;
  const B = () => G.data.balance;
  const I = G.input;

  const P = (G.player = {
    // 位置與物理
    x: 0, y: 0, vx: 0, vy: 0, dir: 1,
    onGround: false, plat: 0, ignorePlat: -1, ignoreT: 0, halfW: 16,
    w: 34, h: 58,
    climbing: -1,
    // 狀態
    action: null, hurtT: 0, invT: 0, dead: false, deadT: 0, t: 0, landT: 0,
    potCd: 0, slowT: 0, regenT: 0, climbAnim: 0,
    // 成長
    level: 1, exp: 0, form: 'base', sp: 0,
    hp: 1, mp: 1, maxHp: 1, maxMp: 1, atk: 1, def: 0, crit: 0.05,
    gold: 0,
    skills: {},
    hotbar: [null, null, null, null, null, null],
    equip: { claw: null, mane: null, charm: null },
    bag: [],
    potions: { hp: 0, mp: 0 },
    questItems: {},
    specials: {},
    playTime: 0,

    newGame() {
      this.level = 1;
      this.exp = 0;
      this.form = 'base';
      this.sp = 0;
      this.gold = 50;
      this.skills = {};
      for (const id in G.data.skills) if (G.data.skills[id].form === 'base') this.skills[id] = 0;
      this.skills.pounce = 1;
      this.pages = null;
      this.apexLine = null;
      this.formCd = 0;
      this.hotbar = ['pounce', 'roar', null, null, null, null];
      this.equip = { claw: G.loot.makeEquip('claw1', 'common', { atk: 4 }), mane: null, charm: null };
      this.bag = [];
      this.potions = { hp: 5, mp: 3 };
      this.buffs = {};
      this.questItems = {};
      this.playTime = 0;
      this.resetBody();
      this.recalc();
      this.hp = this.maxHp;
      this.mp = this.maxMp;
    },

    resetBody() {
      this.vx = this.vy = 0;
      this.action = null;
      this.hurtT = 0;
      this.invT = 0;
      this.dead = false;
      this.deadT = 0;
      this.climbing = -1;
      this.slowT = 0;
      this.ignorePlat = -1;
      this.delayed = [];
    },

    recalc() {
      const s = B().playerStats(this.level, this.form);
      let hp = s.maxHp, mp = s.maxMp, atk = s.atk, def = s.def, crit = s.crit;
      this.specials = {};
      for (const slot in this.equip) {
        const it = this.equip[slot];
        if (!it) continue;
        const st = G.loot.totalStats(it);
        hp += st.hp || 0;
        mp += st.mp || 0;
        atk += st.atk || 0;
        def += st.def || 0;
        crit += st.crit || 0;
        if (it.special) this.specials[it.special] = true;
      }
      const steel = this.passive('steelMane');
      if (steel) hp *= 1 + steel.hp;
      const reso = this.passive('resonance');
      if (reso) crit += reso.crit;
      if (this.buffs && this.buffs.storm) crit += this.buffs.storm.v;
      const lm = G.story ? G.story.mult() : 1;
      hp *= lm;
      atk *= lm;
      this.maxHp = Math.round(hp);
      this.maxMp = Math.round(mp);
      if (this.buffs && this.buffs.atk) atk *= 1 + this.buffs.atk.v;
      this.atk = atk;
      this.def = def;
      this.crit = Math.min(0.8, crit);
      this.hp = Math.min(this.hp, this.maxHp);
      this.mp = Math.min(this.mp, this.maxMp);
    },

    expNeed() {
      return B().expToNext(this.level);
    },

    gainExp(n) {
      if (n <= 0) return;
      if (this.level >= B().levelCap) return;
      this.exp += n;
      G.fx.text(this.x, this.y - 90, '+' + n + ' EXP', '#fff3a0', 16, 0.9);
      let ups = 0;
      while (this.exp >= this.expNeed() && this.level < B().levelCap) {
        this.exp -= this.expNeed();
        this.level++;
        G.formSwitch.addSP(this, 1);
        ups++;
      }
      if (ups > 0) {
        this.recalc();
        this.hp = this.maxHp;
        this.mp = this.maxMp;
        G.fx.pillar(this.x, this.y, 'rgba(255,220,90,0.9)', 1.4, 90);
        G.fx.sparkle(this.x, this.y - 30, '#ffe680', 24, 40);
        G.fx.ring(this.x, this.y - 30, '#fff3a0', 120, 0.5, 5);
        G.fx.text(this.x, this.y - 120, 'LEVEL UP!', '#ffe14a', 34, 1.8);
        G.audio.play('levelup');
        G.hud.toast('等級提升到 Lv.' + this.level + '！獲得 ' + ups + ' 點技能點（點左上角的「技能」圖示分配）', '#ffe14a');
        if (G.evolve.canEvolve()) {
          G.hud.toast('胸口有什麼在發燙……好像聽見了自己的聲音', '#ffb0f0');
          G.cut.pendingVoice = true;
        }
        G.save.write();
      }
    },

    // ── 每幀更新 ──
    update(dt) {
      const map = G.world.map;
      this.t += dt;
      this.playTime += dt;
      if (this.invT > 0) this.invT -= dt;
      if (this.hurtT > 0) this.hurtT -= dt;
      if (this.potCd > 0) this.potCd -= dt;
      if (this.landT > 0) this.landT -= dt;
      if (this.slowT > 0) this.slowT -= dt;
      if (this.glowT > 0) this.glowT -= dt;
      G.skillExec.tick(this, dt);
      if (this.buffs) {
        let changed = false;
        for (const k in this.buffs) {
          this.buffs[k].t -= dt;
          if (this.buffs[k].t <= 0) {
            delete this.buffs[k];
            changed = true;
          }
        }
        if (changed) this.recalc();
      }

      if (this.dead) {
        this.deadT += dt;
        this.vx *= 0.9;
        G.physics.step(this, dt, map);
        return;
      }

      // 自然回復：HP 慢、MP 快
      const b = B();
      this.regenT += dt;
      this.mpRegenT = (this.mpRegenT || 0) + dt;
      if (this.regenT >= b.hpRegen.every) {
        this.regenT = 0;
        this.hp = Math.min(this.maxHp, this.hp + Math.max(1, Math.round(this.maxHp * b.hpRegen.pct * G.story.hpRegenMult())));
      }
      if (this.mpRegenT >= b.mpRegen.every) {
        this.mpRegenT = 0;
        this.mp = Math.min(this.maxMp, this.mp + Math.max(1, Math.round(this.maxMp * b.mpRegen.pct * G.story.mpRegenMult())));
      }

      const canControl = this.hurtT <= 0 && !G.ui.blocking();
      const L = canControl && I.isDown('left');
      const R = canControl && I.isDown('right');
      const Up = canControl && I.isDown('up');
      const Dn = canControl && I.isDown('down');
      const inputX = (R ? 1 : 0) - (L ? 1 : 0);

      this.updateDelayed(dt);
      if (canControl) this.handleActions(inputX, Dn);

      if (this.climbing >= 0) {
        this.updateClimb(dt, inputX, Up, Dn, canControl);
        return;
      }

      // 往上：傳送門 → NPC → 繩子
      if (canControl && I.wasPressed('up')) {
        if (G.world.tryPortal()) return;
        if (G.world.tryTalk()) return;
      }
      if (canControl && Up && !this.action) this.tryGrabRope(false);
      if (canControl && Dn && this.onGround && !this.action && I.wasPressed('down')) this.tryGrabRope(true);
      if (this.climbing >= 0) return;

      this.updateMove(dt, inputX, canControl, Dn);

      if (this.action) this.updateAction(dt);

      const landed = G.physics.step(this, dt, map, { noGravity: this.action && this.action.type === 'dash' });
      if (landed) {
        this.landT = 0.12;
        if (this.hurtT <= 0) G.audio.play('land');
      }
    },

    handleActions(inputX, Dn) {
      if (I.wasPressed('hpPot')) this.usePotion('hp');
      if (I.wasPressed('mpPot')) this.usePotion('mp');
      if (this.action) return;
      if (this.climbing >= 0) return;
      if (I.wasPressed('attack')) {
        this.startAttack();
        return;
      }
      const slots = G.data.keys.skillSlots;
      for (let i = 0; i < slots.length; i++) {
        if (I.wasPressed(slots[i])) {
          const id = this.hotbar[i];
          if (id) this.useSkill(id);
          else G.hud.toast('技能欄 ' + (i + 1) + ' 是空的。點左上角的「技能」圖示來設定', '#ddd');
          return;
        }
      }
      if (I.wasPressed('jump')) {
        if (this.onGround) {
          if (Dn && this.plat !== 0) {
            // 往下跳穿平台
            this.ignorePlat = this.plat;
            this.ignoreT = 0.3;
            this.onGround = false;
            this.vy = 60;
          } else {
            const gj = this.passive('galeStep');
            this.vy = -B().jumpVel * (gj ? 1 + gj.speed * 0.5 : 1);
            this.onGround = false;
            G.audio.play('jump');
          }
        }
      }
    },

    updateMove(dt, inputX, canControl, Dn) {
      const b = B();
      const gale = this.passive('galeStep');
      const speed = b.walkSpeed * (this.slowT > 0 ? 0.55 : 1) * (gale ? 1 + gale.speed : 1) * (this.specials.swift ? 1.1 : 1) * (this.buffs && this.buffs.storm ? 1.3 : 1);
      if (this.action && this.action.type === 'dash') return;
      if (this.onGround) {
        let target = inputX * speed;
        if (this.action || Dn) target = 0; // 地面攻擊或蹲下時不移動
        const acc = b.groundAccel * dt;
        if (this.vx < target) this.vx = Math.min(target, this.vx + acc);
        else if (this.vx > target) this.vx = Math.max(target, this.vx - acc);
        if (inputX && !this.action) this.dir = inputX;
      } else if (canControl && inputX) {
        const target = inputX * speed;
        const acc = b.airAccel * dt;
        if (this.vx < target) this.vx = Math.min(target, this.vx + acc);
        else if (this.vx > target) this.vx = Math.max(target, this.vx - acc);
        if (!this.action) this.dir = inputX;
      }
    },

    // ── 繩子 ──
    tryGrabRope(fromTop) {
      const map = G.world.map;
      for (let i = 0; i < map.ropes.length; i++) {
        const r = map.ropes[i];
        if (Math.abs(this.x - r[0]) > 18) continue;
        if (fromTop) {
          if (this.onGround && Math.abs(this.y - r[1]) < 2) {
            this.startClimb(i, r[1] + 14);
            return true;
          }
        } else if (this.y <= r[2] + 4 && this.y > r[1] + 8) {
          this.startClimb(i, this.y - (this.onGround ? 6 : 0));
          return true;
        }
      }
      return false;
    },

    startClimb(i, y) {
      const r = G.world.map.ropes[i];
      this.climbing = i;
      this.x = r[0];
      this.y = y;
      this.vx = this.vy = 0;
      this.onGround = false;
      this.action = null;
    },

    updateClimb(dt, inputX, Up, Dn, canControl) {
      const map = G.world.map;
      const r = map.ropes[this.climbing];
      if (canControl && I.wasPressed('jump') && inputX) {
        this.climbing = -1;
        this.vx = inputX * B().ropeJumpVx;
        this.vy = -B().ropeJumpVy;
        this.dir = inputX;
        G.audio.play('jump');
        return;
      }
      const v = (Dn ? 1 : 0) - (Up ? 1 : 0);
      this.y += v * B().climbSpeed * dt;
      if (v) this.climbAnim += dt;
      if (this.y <= r[1]) {
        const pi = G.physics.platformAt(map, this.x, r[1]);
        this.climbing = -1;
        this.y = r[1];
        if (pi >= 0) {
          this.onGround = true;
          this.plat = pi;
        }
        this.vy = 0;
      } else if (this.y >= r[2]) {
        this.climbing = -1;
        this.y = r[2];
        const pi = G.physics.platformAt(map, this.x, r[2]);
        if (pi >= 0) {
          this.onGround = true;
          this.plat = pi;
        }
        this.vy = 0;
      }
    },

    // ── 攻擊與技能 ──
    startAttack() {
      const a = G.data.basicAttack;
      this.action = { type: 'attack', t: 0, dur: a.duration, hitAt: a.hitAt, done: false };
      G.audio.play('swing');
    },

    skillLv(id) {
      return this.skills[id] || 0;
    },
    passive(id) {
      const lv = this.skillLv(id);
      return lv > 0 ? G.data.skills[id].value(lv) : null;
    },

    useSkill(id) {
      const S = G.data.skills[id];
      const lv = this.skills[id] || 0;
      if (!S) return;
      if (S.type === 'passive') {
        G.hud.toast(S.name + ' 是被動技能，學會後自動生效', '#ddd');
        return;
      }
      if (lv <= 0) {
        G.hud.toast(S.name + ' 還沒學會。點左上角的「技能」圖示學習', '#ddd');
        G.audio.play('error');
        return;
      }
      this.cds = this.cds || {};
      if (this.cds[id] > 0) {
        G.hud.toast(S.name + ' 冷卻中（' + Math.ceil(this.cds[id]) + ' 秒）', '#ddd');
        return;
      }
      const omni = this.passive('omniscience');
      const cost = Math.max(1, Math.round(S.mp(lv) * (omni ? 1 - omni.mpCut : 1)));
      if (this.mp < cost) {
        G.hud.toast('MP 不足', '#8fc0ff');
        G.audio.play('error');
        return;
      }
      this.mp -= cost;
      if (S.cd) this.cds[id] = S.cd;
      const ex = G.skillExec[S.type];
      if (ex && ex.start) {
        ex.start(this, S, id, lv);
        return;
      }
      if (S.type === 'dash') {
        this.action = { type: 'dash', id, lv, t: 0, dur: S.dashTime, hits: [], ghostT: 0 };
        if (S.invuln) this.invT = Math.max(this.invT, S.dashTime + 0.15);
        this.glowT = 0.35;
        if (this.onGround) G.fx.dust(this.x, this.y, this.dir, 10);
        this.vx = this.dir * S.dashSpeed;
        this.vy = Math.min(this.vy, 0) * 0.3;
        G.audio.play('skill');
        G.fx.burst(this.x, this.y - 10, ['#fff3c0', '#ffd27a'], 8, 160, { angle: this.dir > 0 ? Math.PI : 0, spread: 0.6 });
      } else if (S.type === 'area') {
        this.action = { type: 'roar', id, lv, t: 0, dur: S.castTime, hitAt: S.hitAt, done: false };
        this.glowT = 0.5;
        G.fx.sparkle(this.x, this.y - 40, '#fff0b0', 8, 26);
        G.audio.play('roar');
      } else if (S.type === 'melee') {
        this.action = { type: 'strike', id, lv, t: 0, dur: S.castTime, hitIdx: 0 };
        this.glowT = 0.3;
        G.audio.play(S.fx === 'rock' ? 'heavyWind' : S.fx === 'sweep' ? 'sweep' : 'swing');
      } else if (S.type === 'bolt') {
        this.action = { type: 'cast', id, lv, t: 0, dur: S.castTime, fired: 0 };
        this.glowT = 0.3;
        G.audio.play('charge');
      } else if (S.type === 'lockon') {
        this.action = { type: 'lockon', id, lv, t: 0, dur: S.castTime, done: false };
        this.glowT = 0.5;
        G.fx.sparkle(this.x, this.y - 40, '#8ff0e8', 10, 30);
        G.audio.play('charge');
      }
    },

    // 延遲命中（靈爪的第二下等）
    updateDelayed(dt) {
      if (!this.delayed || !this.delayed.length) return;
      for (let i = this.delayed.length - 1; i >= 0; i--) {
        const d = this.delayed[i];
        d.t -= dt;
        if (d.t > 0) continue;
        this.delayed.splice(i, 1);
        if (!d.m.dead) d.fn(d.m);
      }
    },

    updateAction(dt) {
      const a = this.action;
      a.t += dt;
      const ex = G.skillExec[a.type];
      if (ex && ex.update) {
        ex.update(this, a, dt);
        if (a.t >= a.dur) this.action = null;
        return;
      }
      if (a.type === 'strike') {
        const S = G.data.skills[a.id];
        while (a.hitIdx < S.hits.length && a.t >= S.hits[a.hitIdx]) {
          const box = this.frontBox(S.range.w, S.range.h);
          const fxX = this.x + this.dir * 40;
          const fxY = this.y - 30;
          if (S.fx === 'rock') {
            G.fx.slash(fxX, fxY, this.dir, 40, '#e8d0a8', 'wide');
            G.fx.burst(fxX + this.dir * 20, fxY, ['#9a7b5a', '#c8aa80', '#6e5236'], 10, 280, { shape: 'square', size: 6 });
          } else if (S.fx === 'sweep') {
            G.fx.slash(this.x + this.dir * 60, fxY, this.dir, 80, '#fff0d0', 'wide');
            G.fx.slash(this.x + this.dir * 70, fxY + 6, this.dir, 64, 'rgba(210,180,130,0.9)', 'wide');
            G.fx.dust(this.x + this.dir * 40, this.y, -this.dir, 10);
          } else {
            G.fx.slash(fxX, fxY - 4 + a.hitIdx * 10, this.dir, 30, a.hitIdx ? '#d8ff9a' : '#ffffff', 'claw');
          }
          const n = G.combat.playerHit(box, S.targets, S.mult(a.lv), { knock: S.knock, heavy: !!S.heavy, sound: S.fx });
          if (n && S.fx === 'rock') {
            G.fx.shake(6, 0.2);
          }
          a.hitIdx++;
        }
      } else if (a.type === 'cast') {
        const S = G.data.skills[a.id];
        while (a.fired < S.count && a.t >= S.fireAt + a.fired * (S.rapid ? 0.07 : 0.08)) {
          const spread = S.count > 1 && !S.rapid ? (a.fired - (S.count - 1) / 2) * 10 : 0;
          G.world.projectiles.push({
            kind: S.proj, owner: 'player', id: a.id, lv: a.lv,
            x: this.x + this.dir * 30, y: this.y - 34 + spread,
            vx: this.dir * S.speed, vy: 0, dir: this.dir,
            r: S.proj === 'spirit' ? 12 : S.pierce ? 16 : 9, life: S.reach / S.speed, t: 0, seed: Math.random() * 6, pierce: S.pierce || 0,
          });
          G.audio.play(S.proj === 'spirit' ? 'spiritShot' : 'featherShot');
          a.fired++;
        }
      } else if (a.type === 'lockon') {
        const S = G.data.skills[a.id];
        if (!a.done && a.t >= S.hitAt) {
          a.done = true;
          const list = G.combat.targets()
            .filter((m) => U.dist(m.x, m.y - 30, this.x, this.y - 30) < S.radius)
            .sort((p, q) => U.dist(p.x, p.y, this.x, this.y) - U.dist(q.x, q.y, this.x, this.y))
            .slice(0, S.targets);
          if (!list.length) G.hud.toast('附近沒有目標', '#cfe');
          this.delayed = this.delayed || [];
          list.forEach((m, i) => {
            for (let k = 0; k < S.repeat; k++) {
              this.delayed.push({
                m, t: i * 0.05 + k * 0.12,
                fn: (mm) => {
                  const cy = mm.y - mm.h * (mm.scale || 1) * 0.5;
                  G.fx.slash(mm.x, cy, k ? -1 : 1, 26, '#8ff0e8', 'claw');
                  G.combat.hitMonster(mm, S.mult(a.lv), { knock: 60, sound: 'spirit' });
                },
              });
            }
          });
        }
      }
      if (a.type === 'attack') {
        if (!a.done && a.t >= a.hitAt) {
          a.done = true;
          const BA = G.data.basicAttack;
          const box = this.frontBox(BA.range.w, BA.range.h);
          G.fx.slash(this.x + this.dir * 34, this.y - 30, this.dir, 34, '#fff8e0', 'claw');
          G.fx.slash(this.x + this.dir * 38, this.y - 30, this.dir, 26, 'rgba(255,214,120,0.9)', 'claw');
          G.combat.playerHit(box, BA.targets, BA.mult, { knock: BA.knock, heavy: false });
        }
      } else if (a.type === 'roar') {
        if (!a.done && a.t >= a.hitAt) {
          a.done = true;
          const S = G.data.skills[a.id];
          const box = this.frontBox(S.range.w, S.range.h);
          const mx = this.x + this.dir * 26;
          const my = this.y - 38;
          for (let i = 0; i < 3; i++) G.fx.wave(mx, my, this.dir, S.range.w * (0.75 + i * 0.25), '255,236,170', i * 0.07);
          G.fx.impact(mx, my, 60, '#fff0b0');
          // 被吼飛的葉子與塵土
          for (let i = 0; i < 14; i++) {
            G.fx.particles.push({
              x: mx + U.rand(0, 40) * this.dir, y: my + U.rand(-40, 40),
              vx: this.dir * U.rand(250, 650), vy: U.rand(-120, 80),
              life: U.rand(0.35, 0.7), t: 0, size: U.rand(3, 6),
              color: U.pick(['#9fd66a', '#c8e89a', '#fff3c0']), grav: 150, shape: 'square', drag: 2.5,
            });
          }
          G.fx.shake(5, 0.2);
          G.fx.kick(this.dir * 6, 0);
          G.combat.playerHit(box, S.targets, S.mult(a.lv), { knock: S.knock, heavy: true });
        }
      } else if (a.type === 'dash') {
        const S = G.data.skills[a.id];
        this.vx = this.dir * S.dashSpeed * (1 - (a.t / a.dur) * 0.4);
        this.vy = 0;
        a.ghostT -= dt;
        if (a.ghostT <= 0) {
          a.ghostT = 0.035;
          G.fx.ghost(this.x, this.y, this.dir, { state: 'dash', t: this.t, p: 0, form: this.form }, S.ghost || '#ffd98a');
        }
        // 速度線
        G.fx.streak(this.x - this.dir * U.rand(30, 70), this.y - U.rand(10, 55), this.dir > 0 ? 0 : Math.PI, U.rand(50, 90), 'rgba(255,245,210,0.9)', 2);
        const box = { x: this.x - 26, y: this.y - this.h, w: 52, h: this.h };
        G.combat.playerDashHit(box, a, S.targets, S.mult(a.lv), S);
        if (a.t >= a.dur) {
          this.vx = this.dir * 120;
          G.fx.ring(this.x + this.dir * 20, this.y - 28, 'rgba(255,240,190,0.9)', 46, 0.2, 3);
          if (this.onGround) G.fx.dust(this.x, this.y, -this.dir, 6);
        }
      }
      if (a.t >= a.dur) this.action = null;
    },

    frontBox(w, h) {
      const cy = this.y - 30;
      return { x: this.dir > 0 ? this.x - 8 : this.x - w + 8, y: cy - h / 2, w, h };
    },

    hitbox() {
      return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
    },

    // 快捷鍵 1／2：先用小的，用完再用大的
    usePotion(kind) {
      const big = kind + 'L';
      const xl = kind + 'XL';
      if ((this.potions[kind] || 0) <= 0 && (this.potions[big] || 0) > 0) return this.useItem(big);
      if ((this.potions[kind] || 0) <= 0 && (this.potions[xl] || 0) > 0) return this.useItem(xl);
      if ((this.potions[kind] || 0) <= 0) {
        G.hud.toast((kind === 'hp' ? '紅漿果' : '藍花蜜') + '用完了', '#ddd');
        G.audio.play('error');
        return;
      }
      return this.useItem(kind);
    },

    useItem(id) {
      const def = G.data.items.potions[id];
      if (!def || (this.potions[id] || 0) <= 0) return;
      if (def.kind === 'buff') {
        this.potions[id]--;
        this.buffs = this.buffs || {};
        this.buffs[def.buff] = { v: def.value, t: def.time, icon: def.icon, name: def.name };
        this.recalc();
        G.fx.pillar(this.x, this.y, def.buff === 'atk' ? 'rgba(255,140,80,0.8)' : 'rgba(140,200,255,0.8)', 0.8, 60);
        G.hud.toast(def.name + '：' + def.desc, '#ffd0a0');
        G.audio.play('potion');
        return;
      }
      if (def.kind === 'home') {
        this.potions[id]--;
        G.ui.closeAll();
        const camp = G.data.camps[G.world.map.region] || '1-1';
        G.world.changeMap(camp, 'camp');
        return;
      }
      const kind = def.kind;
      if (this.potCd > 0) return;
      if (kind === 'hp' && this.hp >= this.maxHp) return;
      if (kind === 'mp' && this.mp >= this.maxMp) return;
      this.potions[id]--;
      this.potCd = B().potionCooldown;
      if (kind === 'hp') {
        const n = Math.min(def.heal, this.maxHp - this.hp);
        this.hp += n;
        G.fx.damage(this.x, this.y - 70, n, 'heal');
      } else {
        const n = Math.min(def.heal, this.maxMp - this.mp);
        this.mp += n;
        G.fx.damage(this.x, this.y - 70, n, 'mp');
      }
      G.audio.play('potion');
    },

    // ── 受擊 ──
    hurt(raw, fromX, opts) {
      opts = opts || {};
      if (this.dead || (this.invT > 0 && !opts.ignoreInv) || G.opts.godMode) return false;
      const b = B();
      const ai = this.passive('afterimage');
      if (ai && !opts.ignoreInv && Math.random() < ai.dodge) {
        G.fx.ghost(this.x - this.dir * 24, this.y, this.dir, { state: 'idle', t: this.t, p: 0, form: this.form }, '#8a6aa8');
        G.fx.text(this.x, this.y - 80, 'Miss', '#d8c8ff', 18, 0.7);
        this.invT = 0.35;
        return false;
      }
      let dmg = Math.max(1, Math.round(raw * U.rand(0.9, 1.1) - this.def * b.defFactor));
      if (this.buffs && this.buffs.soul) dmg = Math.max(1, Math.round(dmg * (1 - this.buffs.soul.v)));
      const rock = this.passive('rockSkin');
      if (rock) dmg = Math.max(1, Math.round(dmg * (1 - rock.reduce)));
      if (this.buffs && this.buffs.guard) dmg = Math.max(1, Math.round(dmg * (1 - this.buffs.guard.v)));
      if (G.story.guard()) dmg = Math.max(1, Math.round(dmg * (1 - G.story.guard())));
      const shield = this.passive('manaShield');
      if (shield && this.mp > 0) {
        const take = Math.min(Math.floor(this.mp), Math.round(dmg * shield.absorb));
        this.mp -= take;
        dmg -= take;
        if (take > 0) G.fx.damage(this.x + 20, this.y - 70, take, 'mp');
      }
      if (rock && Math.random() < rock.steady) opts = Object.assign({}, opts, { noKnock: true, steady: true });
      const uny = this.passive('unyielding');
      if (uny && dmg >= this.hp && !(this.unyCd > 0)) {
        dmg = Math.max(0, Math.ceil(this.hp) - 1);
        this.unyCd = uny.cd;
        this.invT = 1.5;
        G.fx.screenFlash('#ffe066', 0.4);
        G.fx.text(this.x, this.y - 100, '不屈！', '#ffe066', 24, 1);
        this.hp -= dmg;
        return true;
      }
      this.hp -= dmg;
      G.fx.damage(this.x, this.y - 70, dmg, 'player');
      if (opts.ignoreInv) {
        if (this.hp <= 0) this.die();
        return true;
      }
      G.audio.play('hurt');
      G.fx.burst(this.x, this.y - 30, ['#ffffff', '#ffb0b0'], 6, 180);
      this.invT = b.invincible;
      if (!opts.noKnock) {
        const d = fromX != null ? U.sign(this.x - fromX) : -this.dir;
        this.vx = d * b.hurtKnockX;
        this.vy = -b.hurtKnockY;
        this.onGround = false;
        this.climbing = -1;
        this.hurtT = b.hurtStun;
        this.action = null;
      }
      if (this.hp <= 0) this.die();
      return true;
    },

    die() {
      this.hp = 0;
      this.dead = true;
      this.deadT = 0;
      this.action = null;
      this.climbing = -1;
      G.audio.play('die');
      G.world.onPlayerDeath();
    },

    // ── 繪製 ──
    draw(ctx) {
      if (G.evolve.anim) return;
      let state = 'idle';
      let p = 0;
      if (this.dead) state = 'dead';
      else if (this.climbing >= 0) state = 'climb';
      else if (this.action) {
        state = this.action.type === 'attack' ? 'attack' : this.action.type === 'lockon' ? 'cast' : this.action.type;
        p = this.action.t / this.action.dur;
      } else if (this.hurtT > 0) state = 'hurt';
      else if (!this.onGround) state = this.vy < 0 ? 'jump' : 'fall';
      else if (Math.abs(this.vx) > 20) state = 'walk';

      if (this.glowT > 0) {
        // 施放技能時身上的光
        const k = this.glowT;
        const g = ctx.createRadialGradient(this.x, this.y - 34, 4, this.x, this.y - 34, 70);
        g.addColorStop(0, 'rgba(255,240,170,' + Math.min(0.7, k * 1.6).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 34, 70, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.invT > 0 && !this.dead && Math.floor(this.invT * 12) % 2 === 0) ctx.globalAlpha = 0.45;
      G.art.drawLion(ctx, this.x, this.y, this.dir, {
        state,
        t: state === 'climb' ? this.climbAnim : this.t,
        p,
        moving: state === 'climb' && (I.isDown('up') || I.isDown('down')),
        form: this.form,
        onGround: this.onGround,
        leaves: G.story.crownColors(),
      });
      ctx.globalAlpha = 1;
      if (!this.dead) G.art.nameTag(ctx, this.x, this.y + 14, '小獅子', '#fff');
    },
  });

  // 目前還活著的判斷（其他模組使用）
  P.alive = function () {
    return !this.dead;
  };
})();
