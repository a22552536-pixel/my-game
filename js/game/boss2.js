// 第二、三章的 Boss。
//   潮汐寄居蟹：潮浪橫掃（要跳）、巨鉗重砸（地上先出現紅圈）、縮進燈塔殼（正面打不動，要繞到背後打窗口），殼裡的燈光會掃過地面。
//   熔岩甲龜：火山噴發（落石前地上先出現影子，落地留下熔岩池）、縮殼翻滾衝撞、發怒後叫碎石丸幫忙。
(function () {
  'use strict';
  const U = G.util;

  // 共用的初始化（跟菇菇女王一樣的欄位，另外處理回憶模式）
  function initBoss(b, id, x) {
    const d = G.data.monsters[id];
    const map = G.world.map;
    Object.assign(b, {
      id, def: d, isBoss: true, scale: 1, w: d.w, h: d.h, halfW: d.w / 2, level: d.lv,
      maxHp: d.hp, hp: d.hp, atk: d.atk, armor: d.def, exp: d.exp,
      x, y: map.platforms[0][2], vx: 0, vy: 0, dir: -1, onGround: true, plat: 0, ignorePlat: -1, ignoreT: 0,
      t: 0, state: 'intro', stateT: 1.6, enraged: false, hurtFlash: 0, dead: false, deadT: 0,
      stackN: 0, stackT: 0, touchCd: 0, squash: 0, blink: false,
    });
    b.recall = !!G.world.flags[id + 'Defeated'];
    if (b.recall) {
      b.maxHp = b.hp = Math.round(d.hp * 1.6);
      b.atk = Math.round(d.atk * 1.3);
      b.exp = Math.round(d.exp * 0.5);
    }
    G.audio.play('bossWarn');
    G.hud.bossBanner(b.recall ? '回憶・' + d.name : d.name);
    if (b.recall) G.hud.story(G.data.story.recall[id] || '');
  }

  const common = {
    hitbox() {
      return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
    },
    nextStack: G.Monster.prototype.nextStack,
    setState(s, t) {
      this.state = s;
      this.stateT = t;
    },
    die() {
      this.hp = 0;
      this.dead = true;
      this.deadT = 0.0001;
      this.state = 'dead';
      G.audio.play('slam');
      G.fx.shake(14, 0.6);
      G.fx.addHitstop(0.25);
      G.world.onBossKilled(this);
    },
    tickCommon(dt) {
      this.t += dt;
      if (this.hurtFlash > 0) this.hurtFlash -= dt;
      if (this.stackT > 0) this.stackT -= dt;
      if (this.touchCd > 0) this.touchCd -= dt;
      if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 7);
      this.blink = Math.sin(this.t * 1.3) > 0.985;
    },
    touch(mult) {
      const P = G.player;
      if (P.alive() && this.touchCd <= 0 && U.overlap(this.hitbox(), P.hitbox())) {
        if (P.hurt(Math.round(this.atk * (mult || 1)), this.x)) this.touchCd = 0.6;
      }
    },
    enrageCheck(msg) {
      if (!this.enraged && this.hp < this.maxHp * 0.5) {
        this.enraged = true;
        G.hud.toast(msg, '#ff7a7a');
        G.fx.screenFlash('#ff6a6a', 0.35);
        G.fx.shake(8, 0.4);
        G.audio.play('bossWarn');
      }
    },
    warn() {
      G.audio.play('bossWarn');
      G.fx.text(this.x, this.y - this.h - 70, '！', '#ff5a5a', 42, 0.8);
    },
  };

  // ───────── 潮汐寄居蟹 ─────────
  function HermitCrab(x) {
    initBoss(this, 'hermitCrab', x);
    this.beamX = x;
    this.slamX = 0;
  }
  Object.assign(HermitCrab.prototype, common);

  HermitCrab.prototype.takeDamage = function (dmg, dir) {
    if (this.dead) return 0;
    // 縮在燈塔裡：正面打不動，要從背後打窗口
    if (this.state === 'shell') {
      const fromBack = dir === this.dir;
      if (!fromBack) {
        if (!this.blockMsgT || this.t - this.blockMsgT > 0.8) {
          this.blockMsgT = this.t;
          G.fx.text(this.x - this.dir * 60, this.y - 120, '擋住了！繞到背後', '#bfe8ff', 16, 0.9);
        }
        G.audio.play('rockHit');
        return 0;
      }
      dmg = Math.round(dmg * 1.5);
      G.fx.burst(this.x - this.dir * 70, this.y - 110, ['#fff6a8', '#ffffff'], 8, 200);
    }
    this.hp -= dmg;
    this.hurtFlash = 0.08;
    if (this.hp <= 0) this.die();
    return dmg;
  };

  HermitCrab.prototype.update = function (dt) {
    const P = G.player;
    const map = G.world.map;
    this.tickCommon(dt);
    if (this.dead) {
      this.deadT += dt;
      if (Math.random() < 0.5) G.fx.burst(this.x + U.rand(-80, 80), this.y - U.rand(20, 160), ['#fff', '#8fd8ff', '#ffd35a'], 6, 240);
      return this.deadT > 2.2;
    }
    this.enrageCheck('潮汐寄居蟹：「老子還沒認真呢！」');
    const cd = this.enraged ? 0.7 : 1;
    const spd = this.enraged ? 1.4 : 1;
    const dx = P.x - this.x;
    this.stateT -= dt;
    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('walk', 1.2);
        break;
      case 'walk':
        this.dir = U.sign(dx);
        this.vx = Math.abs(dx) > 110 ? this.dir * this.def.speed * spd : 0;
        if (this.stateT <= 0) this.chooseAttack();
        break;
      case 'tidePrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.spawnTide();
          this.setState('tide', 0.5);
        }
        break;
      case 'tide':
        this.vx = 0;
        if (this.stateT <= 0) {
          if (this.enraged && !this.secondTide) {
            this.secondTide = true;
            this.setState('tidePrep', 0.5);
          } else {
            this.secondTide = false;
            this.setState('recover', 0.8 * cd);
          }
        }
        break;
      case 'clawPrep':
        this.vx = 0;
        this.dir = U.sign(this.slamX - this.x) || this.dir;
        if (this.stateT <= 0) {
          this.setState('clawSlam', 0.35);
          const box = { x: this.slamX - 90, y: this.y - 120, w: 180, h: 120 };
          if (P.alive() && U.overlap(box, P.hitbox())) P.hurt(Math.round(this.atk * 1.6), this.slamX);
          G.fx.shake(14, 0.35);
          G.fx.burst(this.slamX, this.y - 6, ['#e8d8b0', '#8fd8ff', '#ffffff'], 24, 360, { angle: -Math.PI / 2, spread: 1.3 });
          G.audio.play('slam');
        }
        break;
      case 'clawSlam':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('recover', 0.7 * cd);
        break;
      case 'shell': {
        this.vx = 0;
        // 燈塔的光在地面上來回掃
        const span = 520;
        this.beamX = this.x + Math.sin(this.t * (this.enraged ? 2.2 : 1.6)) * span;
        if (P.alive() && Math.abs(P.x - this.beamX) < 46 && P.onGround && !this.beamCd) {
          P.hurt(Math.round(this.atk * 0.7), this.beamX, { noKnock: false });
          this.beamCd = 0.8;
        }
        if (this.beamCd) {
          this.beamCd -= dt;
          if (this.beamCd <= 0) this.beamCd = 0;
        }
        if (this.stateT <= 0) {
          G.hud.toast('寄居蟹從燈塔裡爬出來了', '#bfe8ff');
          this.setState('recover', 0.6);
        }
        break;
      }
      case 'recover':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('walk', U.rand(1.2, 2) * cd);
        break;
    }
    G.physics.step(this, dt, map, { onlyPlat: 0 });
    if (this.state !== 'shell') this.touch(1);
    return false;
  };

  HermitCrab.prototype.chooseAttack = function () {
    const P = G.player;
    const adds = G.world.monsters.filter((m) => !m.dead).length;
    const table = { tide: 40, claw: 40, shell: 22 };
    if (this.enraged && adds < 4) table.summon = 18;
    const pick = U.weighted(table);
    if (pick === 'tide') {
      this.setState('tidePrep', 0.9);
      this.warn();
    } else if (pick === 'claw') {
      this.slamX = U.clamp(P.x, 100, G.world.map.w - 100);
      this.setState('clawPrep', 0.75);
      this.warn();
    } else if (pick === 'shell') {
      G.hud.toast('寄居蟹縮進燈塔裡了！繞到背後打窗口', '#bfe8ff');
      this.setState('shell', this.enraged ? 4 : 3.2);
    } else {
      for (let i = 0; i < 2; i++) G.world.spawnAdd('sandcrab', this.x + (i ? 1 : -1) * 90);
      G.audio.play('quest');
      this.setState('recover', 0.6);
    }
  };

  HermitCrab.prototype.spawnTide = function () {
    const spd = this.enraged ? 500 : 420;
    [-1, 1].forEach((d) => {
      G.world.projectiles.push({
        kind: 'tide', x: this.x + d * 90, y: this.y, vx: d * spd, vy: 0, dir: d,
        h: 60, r: 26, dmg: Math.round(this.atk * 1.3), life: 6, t: 0, owner: 'boss', seed: 0,
      });
    });
    G.fx.shake(10, 0.3);
    G.fx.burst(this.x, this.y - 10, ['#8fd8ff', '#ffffff', '#5ab0e8'], 26, 360, { angle: -Math.PI / 2, spread: 1.4 });
    G.audio.play('sweep');
  };

  HermitCrab.prototype.draw = function (ctx) {
    const y = this.y;
    if (this.state === 'tidePrep') {
      const k = 1 - this.stateT / 0.9;
      ctx.fillStyle = 'rgba(90,180,255,' + (0.12 + 0.18 * k).toFixed(3) + ')';
      ctx.fillRect(0, y - 8, G.world.map.w, 10);
    }
    if (this.state === 'clawPrep') {
      const k = 1 - this.stateT / 0.75;
      ctx.fillStyle = 'rgba(255,60,60,' + (0.15 + 0.25 * k).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(this.slamX, y, 90, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.state === 'shell') {
      // 燈光：從燈塔頂端打到地面
      const lx = this.x;
      const ly = y - this.h + 10;
      const g = ctx.createLinearGradient(lx, ly, this.beamX, y);
      g.addColorStop(0, 'rgba(255,250,200,0.55)');
      g.addColorStop(1, 'rgba(255,240,150,0.25)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(lx - 8, ly);
      ctx.lineTo(this.beamX - 46, y);
      ctx.lineTo(this.beamX + 46, y);
      ctx.lineTo(lx + 8, ly);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,245,170,0.5)';
      ctx.beginPath();
      ctx.ellipse(this.beamX, y, 50, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    G.art.drawMonster(ctx, this);
  };

  // ───────── 熔岩甲龜 ─────────
  function LavaTortoise(x) {
    initBoss(this, 'lavaTortoise', x);
    this.rollAngle = 0;
    this.shadows = [];
    this.bounces = 0;
  }
  Object.assign(LavaTortoise.prototype, common);

  LavaTortoise.prototype.takeDamage = function (dmg) {
    if (this.dead) return 0;
    this.hp -= dmg;
    this.hurtFlash = 0.08;
    if (this.hp <= 0) this.die();
    return dmg;
  };

  LavaTortoise.prototype.update = function (dt) {
    const P = G.player;
    const map = G.world.map;
    this.tickCommon(dt);
    // 落石的影子：時間到了才掉下來
    for (let i = this.shadows.length - 1; i >= 0; i--) {
      const s = this.shadows[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.shadows.splice(i, 1);
        G.world.projectiles.push({
          kind: 'lavaRock', x: s.x, y: this.y - 520, vx: 0, vy: 900, grav: 0,
          r: 22, dmg: Math.round(this.atk * 1.1), life: 2, t: 0, owner: 'boss', seed: Math.random() * 6,
        });
      }
    }
    if (this.dead) {
      this.deadT += dt;
      if (Math.random() < 0.5) G.fx.burst(this.x + U.rand(-90, 90), this.y - U.rand(20, 150), ['#fff', '#ff9a3a', '#ffd35a'], 6, 240);
      return this.deadT > 2.2;
    }
    this.enrageCheck('熔岩甲龜背上的火山噴得更兇了！');
    const cd = this.enraged ? 0.7 : 1;
    const dx = P.x - this.x;
    this.stateT -= dt;
    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('walk', 1.4);
        break;
      case 'walk':
        this.dir = U.sign(dx);
        this.vx = Math.abs(dx) > 120 ? this.dir * this.def.speed * (this.enraged ? 1.3 : 1) : 0;
        if (this.stateT <= 0) this.chooseAttack();
        break;
      case 'eruptPrep':
        this.vx = 0;
        if (Math.random() < 0.3) G.fx.burst(this.x, this.y - this.h, ['#5a4a44', '#8a7a70'], 2, 80, { angle: -Math.PI / 2, spread: 0.5 });
        if (this.stateT <= 0) {
          this.erupt();
          this.setState('erupt', 0.6);
        }
        break;
      case 'erupt':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('recover', 0.9 * cd);
        break;
      case 'rollPrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.bounces = this.enraged ? 3 : 2;
          this.dir = U.sign(dx) || 1;
          this.setState('roll', 4);
        }
        break;
      case 'roll': {
        const sp = this.enraged ? 620 : 520;
        this.vx = this.dir * sp;
        this.rollAngle += (this.dir * sp * dt) / 70;
        if (Math.random() < 0.5) G.fx.burst(this.x - this.dir * 60, this.y - 6, ['#ff9a3a', '#5a3a2a'], 1, 80, { life: 0.3 });
        const nx = this.x + this.vx * dt;
        if (nx < 130 || nx > map.w - 130) {
          this.dir *= -1;
          this.bounces--;
          G.fx.shake(10, 0.25);
          G.audio.play('rockHit');
          if (this.bounces <= 0) {
            this.vx = 0;
            this.setState('recover', 1.0 * cd);
          }
        }
        if (this.stateT <= 0) this.setState('recover', 0.8);
        break;
      }
      case 'summon':
        this.vx = 0;
        if (this.stateT <= 0) {
          for (let i = 0; i < 2; i++) G.world.spawnAdd('pebble', this.x + (i ? 1 : -1) * 110);
          G.audio.play('quest');
          this.setState('recover', 0.6);
        }
        break;
      case 'recover':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('walk', U.rand(1.3, 2.2) * cd);
        break;
    }
    G.physics.step(this, dt, map, { onlyPlat: 0 });
    this.touch(this.state === 'roll' ? 1.5 : 1);
    return false;
  };

  LavaTortoise.prototype.chooseAttack = function () {
    const adds = G.world.monsters.filter((m) => !m.dead).length;
    const table = { erupt: 45, roll: 35 };
    if (this.enraged && adds < 4) table.summon = 20;
    const pick = U.weighted(table);
    if (pick === 'erupt') {
      this.setState('eruptPrep', 1.0);
      this.warn();
    } else if (pick === 'roll') {
      this.setState('rollPrep', 0.7);
      this.warn();
    } else {
      this.setState('summon', 0.8);
    }
  };

  LavaTortoise.prototype.erupt = function () {
    const P = G.player;
    const map = G.world.map;
    const n = this.enraged ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const x = i === 0 ? P.x : U.clamp(P.x + U.rand(-420, 420), 80, map.w - 80);
      this.shadows.push({ x, t: 0.9 + i * 0.12, max: 0.9 + i * 0.12 });
    }
    G.fx.shake(12, 0.4);
    G.fx.burst(this.x, this.y - this.h, ['#ff7a2a', '#ffd35a', '#3a2a24'], 30, 420, { angle: -Math.PI / 2, spread: 0.8 });
    G.audio.play('slam');
  };

  LavaTortoise.prototype.draw = function (ctx) {
    const y = this.y;
    this.shadows.forEach((s) => {
      const k = 1 - s.t / s.max;
      ctx.fillStyle = 'rgba(40,10,0,' + (0.2 + 0.35 * k).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(s.x, y, 20 + 30 * k, 6 + 5 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    if (this.state === 'rollPrep') {
      const k = 1 - this.stateT / 0.7;
      ctx.fillStyle = 'rgba(255,60,60,' + (0.12 + 0.2 * k).toFixed(3) + ')';
      ctx.fillRect(0, y - 8, G.world.map.w, 10);
    }
    G.art.drawMonster(ctx, this);
  };

  Object.assign(G.bosses, { hermitCrab: HermitCrab, lavaTortoise: LavaTortoise });
})();
