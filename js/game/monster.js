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
    this.shiny = !this.elite && !opts.noVariant && Math.random() < b.shinyChance;
    this.variant = null;
    if (!this.elite && !this.shiny && !opts.noVariant) {
      let r = Math.random();
      for (const k in b.variants) {
        r -= b.variants[k].chance;
        if (r < 0) {
          this.variant = k;
          break;
        }
      }
    }
    const V = this.variant ? b.variants[this.variant] : null;
    this.V = V;
    this.scale = (d.sizeMul || 1) * (this.elite ? b.eliteScale : V ? V.scale || 1 : 1);
    this.w = d.w;
    this.h = d.h;
    this.halfW = (d.w * this.scale) / 2;
    this.level = d.lv;
    this.maxHp = Math.round(b.monsterHp(d.lv) * (d.hpMul || 1) * (this.elite ? b.eliteHpMult : 1) * (V ? V.hp || 1 : 1));
    this.hp = this.maxHp;
    this.atk = Math.round(b.monsterAtk(d.lv) * (d.atkMul || 1) * (this.elite ? b.eliteAtkMult : 1) * (V ? V.atk || 1 : 1));
    this.armor = b.monsterDef(d.lv);
    this.exp = Math.round(b.monsterExp(d.lv) * (this.elite ? b.eliteExpMult : 1) * (this.shiny ? b.shinyExpMult : 1) * (V ? V.exp || 1 : 1));
    this.x = x;
    this.y = G.physics.surfaceY(map, plat, x);
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
    this.fx = {};
    if (G.mobAbilHooks) G.mobAbilHooks.init(this);
  }

  Monster.prototype.hitbox = function () {
    const s = this.scale;
    const hv = this.hover || 0;
    return { x: this.x - (this.w * s) / 2, y: this.y - this.h * s - hv, w: this.w * s, h: this.h * s };
  };

  Monster.prototype.nextStack = function () {
    if (this.stackT > 0) this.stackN++;
    else this.stackN = 0;
    this.stackT = 0.25;
    return this.stackN;
  };

  Monster.prototype.bounds = function () {
    const map = G.world.map;
    const p = map.platforms[this.plat];
    const hw = this.halfW;
    let lo = p[0] + hw;
    let hi = p[1] - hw;
    // 有指定活動範圍的怪（例如營地附近）不會走出範圍
    const g = this.spawn && this.spawn.group != null ? map.mobs[this.spawn.group] : null;
    if (g && g.p === this.plat) {
      if (g.x1 != null) lo = Math.max(lo, g.x1);
      if (g.x2 != null) hi = Math.min(hi, g.x2);
    }
    return [lo, hi];
  };

  Monster.prototype.takeDamage = function (dmg, dir, knock, crit) {
    if (this.dead) return 0;
    // 能力造成的無敵（例如鬼火水母熄滅的瞬間）
    if (G.mobAbilHooks && G.mobAbilHooks.invuln(this)) return 0;
    if (this.shellT > 0) dmg = Math.max(1, Math.round(dmg * 0.3));
    // 能力造成的傷害倍率（心核打開／冰盾正面／車輪滾動……）
    if (G.mobAbilHooks && G.mobAbilHooks.dmgMul) dmg = Math.max(1, Math.round(dmg * G.mobAbilHooks.dmgMul(this, dir)));
    this.hp -= dmg;
    this.hurtFlash = 0.1;
    this.hpShowT = 4;
    this.aggroT = G.data.balance.aggroTime;
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      return dmg;
    }
    if (G.mobAbilHooks) G.mobAbilHooks.onHurt(this, dmg, dir);
    // 樹皮龜：被打有機率縮進殼裡
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
    // 小野豬：被打之後衝撞
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
    // 擊殺回饋（擊殺聲、碎屑、經驗值光點、連殺數）在 js/game/feel.js
    if (G.feel) G.feel.onKill(this);
    else G.audio.play('die');
    G.fx.burst(this.x, this.y - this.h * 0.5 * this.scale, ['#fff', '#fff6c8', '#ffe39a'], 14, 260);
    if (G.mobAbilHooks) G.mobAbilHooks.onDie(this);
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

    // 燃燒、冰凍
    if (G.skillExec.status(this, dt)) {
      G.physics.step(this, dt, G.world.map);
      return false;
    }
    if (this.dead) return false;
    // 暈眩：不能動也不能攻擊
    if (this.stunT > 0) {
      this.stunT -= dt;
      this.vx = 0;
      this.attackT = 0;
      if (Math.random() < 0.08) G.fx.text(this.x + U.rand(-10, 10), this.y - this.h * (this.scale || 1) - 16, '★', '#ffe066', 14, 0.5);
      G.physics.step(this, dt, G.world.map);
      return false;
    }
    if (this.slowT > 0) this.slowT -= dt;
    // 溫泉石像：每隔幾秒替附近受傷的同伴回血
    if (this.abil.heal) {
      if (this.healT > 0) this.healT -= dt;
      this.healCd = (this.healCd == null ? U.rand(2, 4) : this.healCd) - dt;
      if (this.healCd <= 0) {
        this.healCd = 4.5;
        const hurt = G.world.monsters.filter((o) => !o.dead && o !== this && o.hp < o.maxHp && Math.abs(o.x - this.x) < 280 && Math.abs(o.y - this.y) < 160);
        if (hurt.length) {
          this.healT = 0.8;
          hurt.forEach((o) => {
            const n = Math.round(o.maxHp * 0.12);
            o.hp = Math.min(o.maxHp, o.hp + n);
            G.fx.text(o.x, o.y - o.h * (o.scale || 1) - 20, '+' + n, '#8fff9a', 14, 0.8);
            G.fx.sparkle(o.x, o.y - o.h * 0.5, '#b8ffb0', 5, 20);
          });
        }
      }
    }
    if (this.aggroT > 0) this.aggroT -= dt;
    if ((d.behavior === 'aggressive' || (this.V && this.V.aggressive)) && P.alive() && this.sameLevelAs(P) && Math.abs(P.x - this.x) < (d.sight || 300)) {
      this.aggroT = Math.max(this.aggroT, 2);
    }
    if (this.moodAggro && P.alive() && this.sameLevelAs(P) && Math.abs(P.x - this.x) < 320) this.aggroT = Math.max(this.aggroT, 2);
    const aggro = this.aggroT > 0 && P.alive();
    const [minX, maxX] = this.bounds();
    const speed = d.speed * (this.V ? this.V.speed || 1 : 1) * (this.slowT > 0 ? 0.5 : 1) * (this.hasteT > 0 ? 1.6 : 1);
    // 被冥道殘月破的黑洞吸住：不動、不受重力，位置由技能控制
    if (this.sucked) {
      this.vx = 0;
      this.vy = 0;
      return false;
    }
    // 新怪物的能力：回傳 true 時這一幀由能力自己控制移動
    const custom = this.hurtT <= 0 && G.mobAbilHooks ? G.mobAbilHooks.update(this, dt, P, aggro) : false;

    if (custom) {
      // 能力自己控制
    } else if (this.shellT > 0) {
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
    if (this.onGround && this.plat === 0) this.y = G.physics.groundY(G.world.map, this.x); // 起伏的地面：夾回範圍後貼回地表

    // 碰撞傷害
    if (P.alive() && this.touchCd <= 0 && U.overlap(this.hitbox(), P.hitbox())) {
      if (P.hurt(this.atk, this.x)) {
        this.touchCd = 0.5;
        if (G.variantHooks) G.variantHooks.onHit(this);
      }
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
        if (P.alive() && U.overlap(box, P.hitbox()) && P.hurt(Math.round(this.atk * 1.2), this.x) && G.variantHooks) G.variantHooks.onHit(this);
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
            homing: pr.homing, wave: pr.wave, slow: pr.slow, grav: pr.grav, baseY: sy,
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

  // 省效能模式（手機）：一般怪物畫進自己的小畫布，每 3 幀才重畫一次，中間只貼圖（位置每幀都跟著走）；
  // 被打中、壓扁、死亡淡出時每幀重畫，打擊感不變。美術函式本身不用改。
  let cacheSeq = 0;
  function drawCached(m, ctx) {
    const k = ctx.getTransform().a || 1;
    const sc = m.scale || 1;
    const half = Math.ceil(Math.max(m.w || 60, m.h || 60) * sc * 1.1 + 40);
    const top = Math.ceil((m.h || 60) * sc * 1.7 + 70 + (m.hover || 0));
    const bot = 40;
    const W = half * 2;
    const H = top + bot;
    let c = m._cache;
    if (!c || c.k !== k || c.W !== W || c.H !== H) {
      const cv = c && c.cv ? c.cv : document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(W * k));
      cv.height = Math.max(1, Math.ceil(H * k));
      c = m._cache = { cv, x: cv.getContext('2d'), k, W, H, n: (cacheSeq++ % 3), ok: false };
    }
    c.n++;
    // 野外魔王：一直被打，所以不看受擊閃光，固定每 2 幀重畫一次
    const redraw = m.fieldBoss ? c.n % 2 === 0 || (m.fx && m.fx.spawn > 0) : c.n % 3 === 0 || m.hurtFlash > 0 || m.squash > 0 || m.deadT > 0 || m.pull;
    if (!c.ok || redraw) {
      const x = c.x;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, c.cv.width, c.cv.height);
      x.setTransform(k, 0, 0, k, (half - m.x) * k, (top - m.y) * k);
      G.art.drawMonster(x, m);
      c.ok = true;
    }
    ctx.drawImage(c.cv, m.x - half, m.y - top, W, H);
  }

  Monster.prototype.draw = function (ctx) {
    // 畫面外很遠的一般怪物不畫（Boss、野外魔王、菁英一律照畫；招式預警可能畫得很遠，所以邊界留很寬；
    // 省效能模式邊界縮小）。畫面外本來就看不到，桌機畫面不變
    if (!this.isBoss && !this.fieldBoss && !this.elite && !(this.def && this.def.boss) && G.cam) {
      const half = Math.max(this.w || 60, this.h || 60) * (this.scale || 1);
      const pad = half + (G.lowFx ? 220 : 700);
      if (this.x + pad < G.cam.x || this.x - pad > G.cam.x + G.W) return;
    }
    if (G.lowFx && !G.noMobCache && (this.fieldBoss || (!this.isBoss && !(this.def && this.def.boss)))) drawCached(this, ctx);
    else G.art.drawMonster(ctx, this);
    if (!this.dead && G.art.drawStatus) G.art.drawStatus(ctx, this, this.t);
    if (this.dead) return;
    const top = this.y - this.h * this.scale - 12;
    if (this.hpShowT > 0 || this.elite) {
      const w = Math.max(40, this.w * this.scale);
      ctx.fillStyle = 'rgba(20,10,5,0.75)';
      ctx.fillRect(this.x - w / 2 - 1, top - 1, w + 2, 7);
      ctx.fillStyle = '#e8433a';
      ctx.fillRect(this.x - w / 2, top, w * (this.hp / this.maxHp), 5);
    }
    if (this.elite || this.shiny || this.V) {
      const label = (this.elite ? '菁英 ' : this.shiny ? '閃光 ' : this.V.name + ' ') + this.def.name;
      G.art.nameTag(ctx, this.x, this.y + 14, label, this.elite ? '#8fd0ff' : this.shiny ? '#ffe066' : this.V.color);
    } else {
      G.art.nameTag(ctx, this.x, this.y + 14, 'Lv.' + this.level + ' ' + this.def.name, '#fff');
    }
  };

  G.Monster = Monster;
})();
