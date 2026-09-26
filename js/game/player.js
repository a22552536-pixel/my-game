// 主角小鬃：移動、爬繩、攻擊、技能、受擊、成長。
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
      this.hotbar = ['pounce', 'roar', null, null, null, null];
      this.equip = { claw: G.loot.makeEquip('claw1', 'common', { atk: 4 }), mane: null, charm: null };
      this.bag = [];
      this.potions = { hp: 5, mp: 3 };
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
      this.maxHp = Math.round(hp);
      this.maxMp = Math.round(mp);
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
        this.sp++;
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
        G.hud.toast('等級提升到 Lv.' + this.level + '！獲得 ' + ups + ' 點技能點（按 ' + I.label('skills') + ' 分配）', '#ffe14a');
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

      if (this.dead) {
        this.deadT += dt;
        this.vx *= 0.9;
        G.physics.step(this, dt, map);
        return;
      }

      // 緩慢自然回復
      this.regenT += dt;
      if (this.regenT >= 5) {
        this.regenT = 0;
        this.hp = Math.min(this.maxHp, this.hp + Math.max(1, Math.round(this.maxHp * 0.02)));
        this.mp = Math.min(this.maxMp, this.mp + Math.max(1, Math.round(this.maxMp * 0.03)));
      }

      const canControl = this.hurtT <= 0 && !G.ui.blocking();
      const L = canControl && I.isDown('left');
      const R = canControl && I.isDown('right');
      const Up = canControl && I.isDown('up');
      const Dn = canControl && I.isDown('down');
      const inputX = (R ? 1 : 0) - (L ? 1 : 0);

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
          else G.hud.toast('技能欄 ' + (i + 1) + ' 是空的。按 ' + I.label('skills') + ' 打開技能視窗設定', '#ddd');
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
            this.vy = -B().jumpVel;
            this.onGround = false;
            G.audio.play('jump');
          }
        }
      }
    },

    updateMove(dt, inputX, canControl, Dn) {
      const b = B();
      const speed = b.walkSpeed * (this.slowT > 0 ? 0.55 : 1);
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

    useSkill(id) {
      const S = G.data.skills[id];
      const lv = this.skills[id] || 0;
      if (!S) return;
      if (lv <= 0) {
        G.hud.toast(S.name + ' 還沒學會。按 ' + I.label('skills') + ' 用技能點學習', '#ddd');
        G.audio.play('error');
        return;
      }
      const cost = S.mp(lv);
      if (this.mp < cost) {
        G.hud.toast('MP 不足', '#8fc0ff');
        G.audio.play('error');
        return;
      }
      this.mp -= cost;
      if (S.type === 'dash') {
        this.action = { type: 'dash', id, lv, t: 0, dur: S.dashTime, hits: [] };
        this.vx = this.dir * S.dashSpeed;
        this.vy = Math.min(this.vy, 0) * 0.3;
        G.audio.play('skill');
        G.fx.burst(this.x, this.y - 10, ['#fff3c0', '#ffd27a'], 8, 160, { angle: this.dir > 0 ? Math.PI : 0, spread: 0.6 });
      } else if (S.type === 'area') {
        this.action = { type: 'roar', id, lv, t: 0, dur: S.castTime, hitAt: S.hitAt, done: false };
        G.audio.play('roar');
      }
    },

    updateAction(dt) {
      const a = this.action;
      a.t += dt;
      if (a.type === 'attack') {
        if (!a.done && a.t >= a.hitAt) {
          a.done = true;
          const BA = G.data.basicAttack;
          const box = this.frontBox(BA.range.w, BA.range.h);
          G.fx.slash(this.x + this.dir * 34, this.y - 30, this.dir, 30, '#fff8e0', 'claw');
          G.combat.playerHit(box, BA.targets, BA.mult, { knock: BA.knock, heavy: false });
        }
      } else if (a.type === 'roar') {
        if (!a.done && a.t >= a.hitAt) {
          a.done = true;
          const S = G.data.skills[a.id];
          const box = this.frontBox(S.range.w, S.range.h);
          for (let i = 0; i < 3; i++) {
            G.fx.rings.push({ x: this.x + this.dir * 30, y: this.y - 36, color: 'rgba(255,240,180,0.9)', r: 10, maxR: 90 + i * 40, t: -i * 0.06, life: 0.35, w: 5 - i });
          }
          G.fx.shake(3, 0.15);
          G.combat.playerHit(box, S.targets, S.mult(a.lv), { knock: S.knock, heavy: true });
        }
      } else if (a.type === 'dash') {
        const S = G.data.skills[a.id];
        this.vx = this.dir * S.dashSpeed * (1 - (a.t / a.dur) * 0.4);
        this.vy = 0;
        if (Math.random() < 0.6) G.fx.burst(this.x - this.dir * 20, this.y - 20, ['#fff3c0', '#ffe39a'], 1, 60, { life: 0.3, grav: 0 });
        const box = { x: this.x - 26, y: this.y - this.h, w: 52, h: this.h };
        G.combat.playerDashHit(box, a, S.targets, S.mult(a.lv));
        if (a.t >= a.dur) this.vx = this.dir * 120;
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

    usePotion(kind) {
      if (this.potCd > 0) return;
      if ((this.potions[kind] || 0) <= 0) {
        G.hud.toast((kind === 'hp' ? '紅漿果' : '藍花蜜') + '用完了', '#ddd');
        G.audio.play('error');
        return;
      }
      if (kind === 'hp' && this.hp >= this.maxHp) return;
      if (kind === 'mp' && this.mp >= this.maxMp) return;
      const def = G.data.items.potions[kind];
      this.potions[kind]--;
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
      const dmg = Math.max(1, Math.round(raw * U.rand(0.9, 1.1) - this.def * b.defFactor));
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
      let state = 'idle';
      let p = 0;
      if (this.dead) state = 'dead';
      else if (this.climbing >= 0) state = 'climb';
      else if (this.action) {
        state = this.action.type === 'attack' ? 'attack' : this.action.type;
        p = this.action.t / this.action.dur;
      } else if (this.hurtT > 0) state = 'hurt';
      else if (!this.onGround) state = this.vy < 0 ? 'jump' : 'fall';
      else if (Math.abs(this.vx) > 20) state = 'walk';

      if (this.invT > 0 && !this.dead && Math.floor(this.invT * 12) % 2 === 0) ctx.globalAlpha = 0.45;
      G.art.drawLion(ctx, this.x, this.y, this.dir, {
        state,
        t: state === 'climb' ? this.climbAnim : this.t,
        p,
        moving: state === 'climb' && (I.isDown('up') || I.isDown('down')),
        onGround: this.onGround,
      });
      ctx.globalAlpha = 1;
      if (!this.dead) G.art.nameTag(ctx, this.x, this.y + 14, '小鬃', '#fff');
    },
  });

  // 目前還活著的判斷（其他模組使用）
  P.alive = function () {
    return !this.dead;
  };
})();
