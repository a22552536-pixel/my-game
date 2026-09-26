// 一般怪物與菁英怪的 AI。怪物只在自己的平台上活動（楓之谷式）。
(function () {
  'use strict';
  const U = G.util;

  function Monster(id, plat, x, opts) {
    opts = opts || {};
    const d = G.data.monsters[id];
    const b = G.data.balance;
    const map = G.world.map;
    const p = map.platforms[plat];
    this.id = id;
    this.def = d;
    this.elite = !!opts.elite;
    this.shiny = !this.elite && Math.random() < b.shinyChance;
    this.scale = this.elite ? b.eliteScale : 1;
    this.w = d.w;
    this.h = d.h;
    this.halfW = (d.w * this.scale) / 2;
    this.level = d.lv;
    this.maxHp = Math.round(b.monsterHp(d.lv) * (d.hpMul || 1) * (this.elite ? b.eliteHpMult : 1));
    this.hp = this.maxHp;
    this.atk = Math.round(b.monsterAtk(d.lv) * (d.atkMul || 1) * (this.elite ? b.eliteAtkMult : 1));
    this.armor = b.monsterDef(d.lv);
    this.exp = Math.round(b.monsterExp(d.lv) * (this.elite ? b.eliteExpMult : 1) * (this.shiny ? b.shinyExpMult : 1));
    this.x = x;
    this.y = p[2];
    this.vx = 0;
    this.vy = 0;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.onGround = true;
    this.plat = plat;
    this.ignorePlat = -1;
    this.ignoreT = 0;
    this.spawn = opts.spawn || null;
    this.t = Math.random() * 10;
    this.state = 'walk';
    this.stateT = U.rand(1, 3);
    this.aggroT = 0;
    this.hurtT = 0;
    this.hurtFlash = 0;
    this.hpShowT = 0;
    this.landT = 0;
    this.hopCd = U.rand(0.3, 1.2);
    this.atkCd = U.rand(0.5, 1.5);
    this.attackT = 0;
    this.attackPhase = null;
    this.shellT = 0;
    this.chargeT = 0;
    this.angry = false;
    this.blink = false;
    this.dead = false;
    this.deadT = 0;
    this.stackN = 0;
    this.stackT = 0;
    this.touchCd = 0;
    this.squash = 0;
    this.abil = {};
    (d.abilities || []).forEach((a) => (this.abil[a] = true));
  }

  Monster.prototype.hitbox = function () {
    const s = this.scale;
    return { x: this.x - (this.w * s) / 2, y: this.y - this.h * s, w: this.w * s, h: this.h * s };
  };

  Monster.prototype.nextStack = function () {
    if (this.stackT > 0) this.stackN++;
    else this.stackN = 0;
    this.stackT = 0.25;
    return this.stackN;
  };

  Monster.prototype.bounds = function () {
    const p = G.world.map.platforms[this.plat];
    const hw = this.halfW;
    return [p[0] + hw, p[1] - hw];
  };

  Monster.prototype.takeDamage = function (dmg, dir, knock, crit) {
    if (this.dead) return 0;
    if (this.shellT > 0) dmg = Math.max(1, Math.round(dmg * 0.3));
    this.hp -= dmg;
    this.hurtFlash = 0.1;
    this.hpShowT = 4;
    this.aggroT = G.data.balance.aggroTime;
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      return dmg;
    }
    // 古木蝸：被打有機率縮進殼裡
    if (this.abil.shell && this.shellT <= 0 && Math.random() < 0.35) {
      this.shellT = 1.6;
      this.vx = 0;
      G.fx.text(this.x, this.y - this.h - 20, '縮殼！', '#e3c28a', 16, 0.8);
      return dmg;
    }
    if (this.shellT > 0) return dmg;
    if (knock > 0 && this.attackPhase !== 'strike') {
      const k = knock * (this.elite ? 0.4 : 1);
      this.vx = dir * k;
      this.hurtT = 0.28;
      this.attackT = 0;
      this.attackPhase = null;
      if (!this.onGround) this.vy = Math.min(this.vy, -80);
    }
    this.dir = -dir;
    // 斑點菇：被打之後衝撞
    if (this.abil.charge && this.chargeT <= 0 && Math.random() < 0.5) {
      this.chargeT = 1.1;
      this.angry = true;
    }
    return dmg;
  };

  Monster.prototype.die = function () {
    this.dead = true;
    this.deadT = 0.0001;
    this.vx = 0;
    G.audio.play('die');
    G.fx.burst(this.x, this.y - this.h * 0.5 * this.scale, ['#fff', '#fff6c8', '#ffe39a'], 14, 260);
    G.world.onMonsterKilled(this);
  };

  Monster.prototype.sameLevelAs = function (P) {
    return Math.abs(P.y - this.y) < 50 && P.climbing < 0;
  };

  Monster.prototype.update = function (dt) {
    const P = G.player;
    const d = this.def;
    this.t += dt;
    if (this.stackT > 0) this.stackT -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.hpShowT > 0) this.hpShowT -= dt;
    if (this.landT > 0) this.landT -= dt;
    if (this.touchCd > 0) this.touchCd -= dt;
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 7);
    this.blink = Math.sin(this.t * 1.7 + this.x) > 0.985;

    if (this.dead) {
      this.deadT += dt;
      return this.deadT >= 0.5;
    }

    if (this.aggroT > 0) this.aggroT -= dt;
    if (d.behavior === 'aggressive' && P.alive() && this.sameLevelAs(P) && Math.abs(P.x - this.x) < (d.sight || 300)) {
      this.aggroT = Math.max(this.aggroT, 2);
    }
    const aggro = this.aggroT > 0 && P.alive();
    const [minX, maxX] = this.bounds();
    const speed = d.speed;

    if (this.shellT > 0) {
      this.shellT -= dt;
      this.vx = 0;
    } else if (this.hurtT > 0) {
      this.hurtT -= dt;
      this.vx *= Math.pow(0.02, dt);
    } else if (this.attackT > 0) {
      this.updateAttack(dt);
    } else if (this.chargeT > 0) {
      this.chargeT -= dt;
      this.dir = U.sign(P.x - this.x);
      this.vx = this.dir * speed * 3.2;
      if (Math.random() < 0.3) G.fx.burst(this.x - this.dir * 20, this.y - 4, '#d9c7a0', 1, 60, { life: 0.3, grav: 0 });
      if (this.chargeT <= 0) this.angry = false;
    } else {
      // 決定是否發動攻擊
      if (this.atkCd > 0) this.atkCd -= dt;
      const dx = P.x - this.x;
      const dy = P.y - this.y;
      if (aggro && this.atkCd <= 0) {
        if (this.abil.ranged && Math.abs(dx) < d.projectile.range && Math.abs(dy) < 220) {
          this.startAttack('ranged');
        } else if (this.abil.whip && Math.abs(dx) < 100 && Math.abs(dy) < 50) {
          this.startAttack('whip');
        }
      }
      if (this.attackT <= 0) {
        if (aggro && this.sameLevelAs(P) && Math.abs(dx) > 14) {
          this.dir = U.sign(dx);
          const keepAway = this.abil.ranged && Math.abs(dx) < 160;
          this.vx = keepAway ? 0 : this.dir * speed * 1.35;
        } else {
          this.stateT -= dt;
          if (this.stateT <= 0) {
            if (this.state === 'walk') {
              this.state = 'idle';
              this.stateT = U.rand(0.8, 2);
            } else {
              this.state = 'walk';
              this.stateT = U.rand(1.2, 3.2);
              if (Math.random() < 0.5) this.dir *= -1;
            }
          }
          this.vx = this.state === 'walk' ? this.dir * speed : 0;
        }
        // 會跳的怪
        if (this.abil.hop && this.onGround && Math.abs(this.vx) > 1) {
          this.hopCd -= dt;
          if (this.hopCd <= 0) {
            this.vy = -U.rand(260, 340);
            this.onGround = false;
            this.hopCd = U.rand(0.5, 1.1);
          }
        }
      }
    }

    // 不離開自己的平台
    const nx = this.x + this.vx * dt;
    if (nx < minX || nx > maxX) {
      this.vx = 0;
      this.x = U.clamp(this.x, minX, maxX);
      if (this.state === 'walk' && this.chargeT <= 0 && !aggro) this.dir *= -1;
      if (this.chargeT > 0) {
        this.chargeT = 0;
        this.angry = false;
      }
    }
    const wasAir = !this.onGround;
    const plat = this.plat;
    G.physics.step(this, dt, G.world.map);
    // 萬一被擊飛到別的平台，就把那個平台當成新家
    if (!this.onGround && this.y > G.world.map.platforms[plat][2] + 400) this.plat = 0;
    if (wasAir && this.onGround) this.landT = 0.15;
    this.x = U.clamp(this.x, this.bounds()[0], this.bounds()[1]);

    // 碰撞傷害
    if (P.alive() && this.touchCd <= 0 && U.overlap(this.hitbox(), P.hitbox())) {
      if (P.hurt(this.atk, this.x)) this.touchCd = 0.5;
    }
    return false;
  };

  Monster.prototype.startAttack = function (kind) {
    const P = G.player;
    this.attackKind = kind;
    this.attackPhase = 'wind';
    this.attackT = kind === 'whip' ? 0.35 : 0.45;
    this.vx = 0;
    this.dir = U.sign(P.x - this.x);
  };

  Monster.prototype.updateAttack = function (dt) {
    const P = G.player;
    const d = this.def;
    this.vx = 0;
    this.attackT -= dt;
    if (this.attackT > 0) return;
    if (this.attackPhase === 'wind') {
      if (this.attackKind === 'whip') {
        this.attackPhase = 'strike';
        this.attackT = 0.22;
        const box = { x: this.dir > 0 ? this.x : this.x - 96, y: this.y - 50, w: 96, h: 44 };
        if (P.alive() && U.overlap(box, P.hitbox())) P.hurt(Math.round(this.atk * 1.2), this.x);
        G.audio.play('swing');
      } else {
        const pr = d.projectile;
        const sx = this.x + this.dir * 20;
        const sy = this.y - this.h * this.scale * 0.7;
        const tx = P.x;
        const ty = P.y - 30;
        const base = Math.atan2(ty - sy, tx - sx);
        const n = pr.count || 1;
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.16;
          G.world.projectiles.push({
            kind: pr.kind, x: sx, y: sy,
            vx: Math.cos(a) * pr.speed, vy: Math.sin(a) * pr.speed,
            r: 10, dmg: this.atk, life: 2.2, t: 0, seed: Math.random() * 6, owner: 'monster',
          });
        }
        G.audio.play('spore');
        this.attackPhase = 'recover';
        this.attackT = 0.3;
      }
    } else {
      this.attackPhase = null;
      this.attackT = 0;
      this.atkCd = d.projectile ? d.projectile.cd * U.rand(0.8, 1.2) : U.rand(1.4, 2);
    }
  };

  Monster.prototype.draw = function (ctx) {
    G.art.drawMonster(ctx, this);
    if (this.dead) return;
    const top = this.y - this.h * this.scale - 12;
    if (this.hpShowT > 0 || this.elite) {
      const w = Math.max(40, this.w * this.scale);
      ctx.fillStyle = 'rgba(20,10,5,0.75)';
      ctx.fillRect(this.x - w / 2 - 1, top - 1, w + 2, 7);
      ctx.fillStyle = '#e8433a';
      ctx.fillRect(this.x - w / 2, top, w * (this.hp / this.maxHp), 5);
    }
    if (this.elite || this.shiny) {
      const label = (this.elite ? '菁英 ' : '閃光 ') + this.def.name;
      G.art.nameTag(ctx, this.x, this.y + 14, label, this.elite ? '#8fd0ff' : '#ffe066');
    } else if (this.hpShowT > 0) {
      G.art.nameTag(ctx, this.x, this.y + 14, 'Lv.' + this.level + ' ' + this.def.name, '#fff');
    }
  };

  G.Monster = Monster;
})();
