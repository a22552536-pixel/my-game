// 區域 1 Boss：菇菇女王。
// 招式：跳躍砸地（地面震波，要跳起來躲）、孢子彈（落地形成緩速毒雲）、召喚小傘菇。
// 血量低於一半進入狂暴：更快、冷卻更短、砸地變成兩波。
(function () {
  'use strict';
  const U = G.util;

  function Queen(x) {
    const d = G.data.monsters.queenShroom;
    const map = G.world.map;
    this.id = 'queenShroom';
    this.def = d;
    this.isBoss = true;
    this.scale = 1;
    this.w = d.w;
    this.h = d.h;
    this.halfW = d.w / 2;
    this.level = d.lv;
    this.maxHp = d.hp;
    this.hp = d.hp;
    this.atk = d.atk;
    this.armor = d.def;
    this.exp = d.exp;
    this.x = x;
    this.y = map.platforms[0][2];
    this.vx = 0;
    this.vy = 0;
    this.dir = -1;
    this.onGround = true;
    this.plat = 0;
    this.ignorePlat = -1;
    this.ignoreT = 0;
    this.t = 0;
    this.state = 'intro';
    this.stateT = 1.6;
    this.enraged = false;
    this.hurtFlash = 0;
    this.dead = false;
    this.deadT = 0;
    this.stackN = 0;
    this.stackT = 0;
    this.touchCd = 0;
    this.pendingWave = 0;
    this.blink = false;
    G.audio.play('bossWarn');
    G.hud.bossBanner(d.name);
  }

  Queen.prototype.hitbox = function () {
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
  };
  Queen.prototype.nextStack = G.Monster.prototype.nextStack;

  Queen.prototype.takeDamage = function (dmg) {
    if (this.dead) return 0;
    this.hp -= dmg;
    this.hurtFlash = 0.08;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.deadT = 0.0001;
      this.state = 'dead';
      G.audio.play('slam');
      G.fx.shake(14, 0.6);
      G.fx.addHitstop(0.25);
      G.world.onBossKilled(this);
    }
    return dmg;
  };

  Queen.prototype.setState = function (s, t) {
    this.state = s;
    this.stateT = t;
  };

  Queen.prototype.update = function (dt) {
    const P = G.player;
    const map = G.world.map;
    this.t += dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.stackT > 0) this.stackT -= dt;
    if (this.touchCd > 0) this.touchCd -= dt;
    this.blink = Math.sin(this.t * 1.3) > 0.985;

    if (this.dead) {
      this.deadT += dt;
      if (Math.random() < 0.5) {
        G.fx.burst(this.x + U.rand(-80, 80), this.y - U.rand(20, 180), ['#fff', '#ff9fd0', '#ffd35a'], 6, 240);
      }
      return this.deadT > 2.2;
    }

    if (!this.enraged && this.hp < this.maxHp * 0.5) {
      this.enraged = true;
      G.hud.toast('菇菇女王發怒了！', '#ff7a7a');
      G.fx.screenFlash('#ff6a6a', 0.35);
      G.fx.shake(8, 0.4);
      G.audio.play('bossWarn');
    }
    const cd = this.enraged ? 0.65 : 1;
    const spd = this.enraged ? 1.45 : 1;
    const dx = P.x - this.x;

    if (this.pendingWave > 0) {
      this.pendingWave -= dt;
      if (this.pendingWave <= 0) this.spawnWaves();
    }

    this.stateT -= dt;
    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('walk', 1.2);
        break;
      case 'walk':
        this.dir = U.sign(dx);
        this.vx = Math.abs(dx) > 90 ? this.dir * this.def.speed * spd : 0;
        if (this.stateT <= 0) this.chooseAttack();
        break;
      case 'slamPrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.vy = -980;
          this.onGround = false;
          this.vx = U.clamp(dx / 1.1, -320, 320);
          this.setState('slamAir', 3);
        }
        break;
      case 'slamAir':
        if (this.onGround) {
          this.vx = 0;
          this.spawnWaves();
          if (this.enraged) this.pendingWave = 0.45;
          this.setState('recover', 0.9 * cd);
        }
        break;
      case 'spore':
        this.vx = 0;
        if (this.stateT <= 0) {
          const n = this.enraged ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const tx = U.clamp(P.x + (i - (n - 1) / 2) * 130 + U.rand(-30, 30), 60, map.w - 60);
            const sx = this.x + this.dir * 40;
            const sy = this.y - 170;
            const tflight = 1.0 + i * 0.08;
            G.world.projectiles.push({
              kind: 'sporeBomb', x: sx, y: sy,
              vx: (tx - sx) / tflight,
              vy: (map.platforms[0][2] - sy - 0.5 * 1200 * tflight * tflight) / tflight,
              grav: 1200, r: 12, dmg: Math.round(this.atk * 0.6), life: 3, t: 0, owner: 'boss', seed: 0,
            });
          }
          G.audio.play('spore');
          this.setState('recover', 0.7 * cd);
        }
        break;
      case 'summon':
        this.vx = 0;
        if (this.stateT <= 0) {
          const n = this.enraged ? 3 : 2;
          for (let i = 0; i < n; i++) G.world.spawnAdd('capshroom', this.x + (i - (n - 1) / 2) * 90 + this.dir * 60);
          G.audio.play('quest');
          this.setState('recover', 0.6 * cd);
        }
        break;
      case 'recover':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('walk', U.rand(1.3, 2.2) * cd);
        break;
    }

    G.physics.step(this, dt, map, { gravScale: this.state === 'slamAir' && this.vy > 0 ? 1.8 : 1, onlyPlat: 0 });

    if (P.alive() && this.touchCd <= 0 && U.overlap(this.hitbox(), P.hitbox())) {
      if (P.hurt(this.atk, this.x)) this.touchCd = 0.6;
    }
    return false;
  };

  Queen.prototype.chooseAttack = function () {
    const adds = G.world.monsters.filter((m) => !m.dead).length;
    const table = { slam: 45, spore: 35 };
    if (adds < 4) table.summon = 25;
    const pick = U.weighted(table);
    if (pick === 'slam') {
      this.setState('slamPrep', 0.8);
      G.audio.play('bossWarn');
      G.fx.text(this.x, this.y - this.h - 70, '！', '#ff5a5a', 42, 0.8);
    } else if (pick === 'spore') {
      this.setState('spore', 0.8);
    } else {
      this.setState('summon', 0.9);
    }
  };

  Queen.prototype.spawnWaves = function () {
    const spd = this.enraged ? 520 : 430;
    [-1, 1].forEach((d) => {
      G.world.projectiles.push({
        kind: 'wave', x: this.x + d * 70, y: this.y, vx: d * spd, vy: 0, dir: d,
        h: 44, r: 22, dmg: Math.round(this.atk * 1.3), life: 6, t: 0, owner: 'boss', seed: 0,
      });
    });
    G.fx.shake(12, 0.35);
    G.fx.burst(this.x, this.y - 6, ['#c9a878', '#a8845a', '#fff0d6'], 26, 380, { angle: -Math.PI / 2, spread: 1.4 });
    G.audio.play('slam');
  };

  Queen.prototype.draw = function (ctx) {
    if (this.state === 'slamPrep') {
      // 預警：地面紅圈
      const k = 1 - this.stateT / 0.8;
      ctx.fillStyle = 'rgba(255,60,60,' + (0.15 + 0.2 * k).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 140 + 120 * k, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    G.art.drawMonster(ctx, this);
  };

  G.bosses = { queenShroom: Queen };
})();
