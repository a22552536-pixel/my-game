// Boss 共用工具（G.BossKit）＋ 區域 1 Boss：菇菇女王。
//
// 所有 Boss 都有：
//   · 第二階段：血量 ≤ 50% 時變身（變身中無敵、會把玩家震開），之後更快、招式更多。
//   · 軟狂暴：打太久（furyAt 秒）之後攻擊變重、節奏變快。
//   · 地面預警（hz）：紅圈、光柱、落石影子……時間到才爆開，畫在 Boss 前面。
//   · 跳躍：用拋物線算好落點，只會落在指定的平台上，不會卡在平台外面。
//   · this.threats：目前的危險範圍（給自動測試用，也方便除錯）。
//
// 菇菇女王：
//   第一階段：跳躍前進、王者砸地（震波要跳）、孢子彈（毒雲）、裙擺旋轉衝刺、跳上平台灑孢子雨再俯衝下來、召喚小傘菇。
//   第二階段「真正的女王」：傘蓋變成深紅、皇冠浮起。多了三連砸、旋轉來回兩趟（留下毒雲）、
//     大招「孢子風暴」——站上側邊平台，整個地面分兩波冒出孢子柱（第二波蓋住第一波的空隙，要邊看邊移動；爬上平台最安全）。
(function () {
  'use strict';
  const U = G.util;
  // 危險區的中心 x（掉落物／預警圈用 x；橫掃用目前位置；區域用兩端中點）
  const hzX = (h) => (typeof h.x === 'number' ? h.x : typeof h.x0 === 'number' ? h.x0 : typeof h.x1 === 'number' && typeof h.x2 === 'number' ? (h.x1 + h.x2) / 2 : null);
  // 起伏的地面：放在地面高度的危險區（y 等於平地高度、Boss 腳下的地面、或落點的地面）改成貼著落點的地表
  function groundHz(boss, h) {
    const map = G.world.map;
    if (!map || typeof h.y !== 'number' || h.noGnd || !G.physics.terrain(map)) return;
    const x = hzX(h);
    if (x == null || isNaN(x)) return;
    const g = G.physics.groundY(map, x);
    if (Math.abs(h.y - map.platforms[0][2]) < 1.5 || Math.abs(h.y - g) < 1.5 || Math.abs(h.y - G.physics.groundY(map, boss.x)) < 1.5) {
      h.gnd = true;
      h.y = g;
    }
  }

  // ───────────────────────── 共用 ─────────────────────────
  const Kit = (G.BossKit = {});

  Kit.init = function (b, id, x) {
    const d = G.data.monsters[id];
    const map = G.world.map;
    Object.assign(b, {
      id, def: d, isBoss: true, scale: 1, S: d.sizeK || 1, A: d.atkK || d.sizeK || 1, w: d.w, h: d.h, halfW: d.w / 2, level: d.lv,
      maxHp: d.hp, hp: d.hp, atk: d.atk, armor: d.def, exp: d.exp,
      x, y: G.physics.groundY(map, x), vx: 0, vy: 0, dir: -1, onGround: true, plat: 0, ignorePlat: -1, ignoreT: 0,
      t: 0, state: 'intro', stateT: 1.6, stateT0: 1.6, enraged: false, phase: 1, p2k: 0, hurtFlash: 0, dead: false, deadT: 0,
      // S：體型倍率（bosses.js 的 sizeK）。跟身體大小有關的固定距離都要乘上它。
      // A：攻擊範圍的倍率（bosses.js 的 atkK）。預警圈、落地判定、岩漿池這類攻擊範圍乘它。
      stackN: 0, stackT: 0, touchCd: 0, squash: 0, blink: false,
      hz: [], threats: [], fightT: 0, fury: false, lastAtk: 'touch', air: null, airT: 0, lastPick: '', pickT: {},
    });
    b.recall = !!G.world.flags[id + 'Defeated'];
    if (b.recall) {
      b.maxHp = b.hp = Math.round(d.hp * 1.6);
      b.atk = Math.round(d.atk * 1.3);
      b.exp = Math.round(d.exp * 0.5);
    }
    b.baseAtk = b.atk;
    b.furyAt = d.furyAt || 150;
    G.audio.play('bossWarn');
    G.hud.bossBanner(b.recall ? '回憶・' + d.name : d.name);
    if (b.recall) G.hud.story(G.data.story.recall[id] || '');
  };

  Kit.proto = {
    hitbox() {
      return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
    },
    nextStack: G.Monster.prototype.nextStack,
    setState(s, t) {
      this.state = s;
      this.stateT = t;
      this.stateT0 = t || 1;
      this.sub = 0;
    },
    prog() {
      return U.clamp(1 - this.stateT / this.stateT0, 0, 1);
    },
    takeDamage(dmg, dir) {
      if (this.dead) return 0;
      if (this.state === 'transform') {
        if (!this.immT || this.t - this.immT > 0.6) {
          this.immT = this.t;
          G.fx.text(this.x, this.y - this.h - 20, '無敵', '#e8d8ff', 18, 0.6);
        }
        return 0;
      }
      if (this.guard) {
        dmg = this.guard(dmg, dir);
        if (dmg <= 0) return 0;
      }
      this.hp -= dmg;
      this.hurtFlash = 0.08;
      if (this.hp <= 0) this.die();
      else if (this.phase === 1 && this.hp <= this.maxHp * 0.5) this.wantPhase2 = true;
      return dmg;
    },
    die() {
      this.hp = 0;
      this.dead = true;
      this.deadT = 0.0001;
      this.state = 'dead';
      this.vx = 0;
      this.hz.length = 0;
      this.threats.length = 0;
      G.audio.play('slam');
      G.fx.shake(14, 0.6);
      G.fx.addHitstop(0.25);
      // 下一次 update 才通知世界：Boss 可能是在 world.updateProjectiles 的迴圈裡被打死的，
      // onBossKilled 會清空投射物陣列，在迴圈中途清空會讓迴圈讀到 undefined。
      this.killPending = true;
    },
    // 每個 Boss 的 update 在死亡分支裡呼叫
    flushKill() {
      if (!this.killPending) return;
      this.killPending = false;
      G.world.onBossKilled(this);
    },
    // 每幀共用的計時；回傳 true 表示這一幀被定住（冰凍、暈眩）
    tick(dt) {
      this.t += dt;
      if (this.hurtFlash > 0) this.hurtFlash -= dt;
      if (this.stackT > 0) this.stackT -= dt;
      if (this.touchCd > 0) this.touchCd -= dt;
      if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 7);
      this.blink = Math.sin(this.t * 1.3) > 0.985;
      if (this.dead) return false;
      if (this.state !== 'transform') this.p2k = this.phase === 2 ? 1 : 0;
      this.fightT += dt;
      if (!this.fury && this.fightT > this.furyAt) {
        this.fury = true;
        this.atk = Math.round(this.baseAtk * 1.25);
        // 不跳文字、不閃全畫面（使用者：不要「攻擊變重」之類的話），只是悄悄變兇
      }
      let frozen = G.skillExec.status(this, dt);
      if (this.stunT > 0) {
        this.stunT -= dt;
        frozen = true;
      }
      if (this.slowT > 0) this.slowT -= dt;
      this.updateHz(dt);
      return frozen;
    },
    cd() {
      return (this.phase === 2 ? 0.72 : 1) * (this.fury ? 0.75 : 1);
    },
    spd() {
      return (this.phase === 2 ? 1.3 : 1) * (this.slowT > 0 ? 0.7 : 1) * (this.fury ? 1.1 : 1);
    },
    dmg(mult) {
      return Math.round(this.atk * mult);
    },
    hit(mult, fromX, src, opts) {
      const P = G.player;
      if (!P.alive()) return false;
      this.lastAtk = src || this.state;
      return P.hurt(this.dmg(mult), fromX, opts);
    },
    touch(mult) {
      const P = G.player;
      if (P.alive() && this.touchCd <= 0 && U.overlap(this.hitbox(), P.hitbox())) {
        this.lastAtk = 'touch:' + this.state;
        if (P.hurt(this.dmg(mult || 0.5), this.x)) this.touchCd = 0.6;
      }
    },
    // 台詞畫在 Boss 血條下方的專用欄位（js/ui/hud.js bossLine），不會跟提示訊息疊在一起
    say(text, color) {
      G.hud.bossLine(text, color || '#fff3c0');
    },
    // 物理：只會停在「目前這一塊」或「跳躍目標」的平台上
    phys(dt, gravScale) {
      const map = G.world.map;
      const P = map.platforms;
      if (this.onGround && this.plat !== 0) {
        const p = P[this.plat];
        const nx = this.x + this.vx * dt;
        if (nx < p[0] + 24 || nx > p[1] - 24) this.vx = 0;
      }
      if (this.air) {
        this.air.t += dt;
        if (this.air.t >= this.air.T) this.vx = 0;
      }
      const only = this.onGround ? this.plat : this.air ? this.air.plat : 0;
      const landed = G.physics.step(this, dt, map, { onlyPlat: only, gravScale: gravScale || (this.air && this.air.gs) || 1 });
      if (this.onGround) {
        this.airT = 0;
        if (landed) this.air = null;
      } else {
        this.airT += dt;
        // 保險：在空中太久（理論上不會發生）就直接放回地面
        if (this.airT > 3.5) {
          this.y = G.physics.groundY(map, this.x);
          this.vy = 0;
          this.vx = 0;
          this.onGround = true;
          this.plat = 0;
          this.air = null;
          this.airT = 0;
          this.x = U.clamp(this.x, this.halfW, map.w - this.halfW);
          return true;
        }
      }
      return landed;
    },
    // 算好拋物線，T 秒後落在平台 tp 的 tx 上
    leap(tx, tp, T, gs) {
      const map = G.world.map;
      const p = map.platforms[tp];
      gs = gs || 1;
      const lo = tp === 0 ? this.halfW + 10 : p[0] + 40;
      const hi = tp === 0 ? map.w - this.halfW - 10 : p[1] - 40;
      tx = U.clamp(tx, lo, hi);
      const g = G.data.balance.gravity * gs;
      this.vx = (tx - this.x) / T;
      this.vy = (G.physics.surfaceY(map, tp, tx) - this.y - 0.5 * g * T * T) / T;
      this.onGround = false;
      this.air = { plat: tp, tx, T, t: 0, gs };
      if (Math.abs(tx - this.x) > 4) this.dir = U.sign(tx - this.x);
      return tx;
    },
    // 地面高度（起伏的地面：預設是 Boss 腳下）
    groundY(x) {
      return G.physics.groundY(G.world.map, x == null ? this.x : x);
    },
    // 玩家站在哪一塊平台（-1 表示在空中／繩子上）
    playerPlat() {
      const P = G.player;
      return P.onGround ? P.plat : G.physics.platformBelow(G.world.map, P.x, P.y - 2);
    },
    // 挑招：權重表，同一招不連續出，特定招有自己的間隔
    pick(table, gaps) {
      const now = this.fightT;
      const tb = {};
      for (const k in table) {
        if (table[k] <= 0) continue;
        if (gaps && gaps[k] && this.pickT[k] != null && now - this.pickT[k] < gaps[k]) continue;
        tb[k] = k === this.lastPick ? table[k] * 0.25 : table[k];
      }
      const keys = Object.keys(tb);
      const p = keys.length ? U.weighted(tb) : Object.keys(table)[0];
      this.lastPick = p;
      this.pickT[p] = now;
      return p;
    },
    addsAlive() {
      return G.world.monsters.filter((m) => !m.dead && m.isAdd).length;
    },
    warn(big) {
      G.audio.play('bossWarn');
      G.fx.text(this.x, this.y - this.h - 60, big ? '！！' : '！', big ? '#ff3a3a' : '#ff5a5a', big ? 54 : 42, 0.8);
    },
    // ── 地面預警、光柱、落石、火焰區 ──
    addHz(h) {
      h.t = 0;
      groundHz(this, h);
      this.hz.push(h);
      return h;
    },
    updateHz(dt) {
      const P = G.player;
      const ph = P.hitbox();
      this.threats.length = 0;
      for (let i = this.hz.length - 1; i >= 0; i--) {
        const h = this.hz[i];
        h.t += dt;
        if (h.gnd) h.y = G.physics.groundY(G.world.map, hzX(h));
        const done = HZ[h.type].update.call(this, h, dt, P, ph);
        if (h.gnd) h.y = G.physics.groundY(G.world.map, hzX(h)); // 移動中的（橫掃）跟上這一幀的位置
        if (done) this.hz.splice(i, 1);
      }
    },
    drawHz(ctx) {
      if (this.dead) return;
      const map = G.world.map;
      for (const h of this.hz) {
        // 貼在起伏地面上的預警圈／爆炸：跟著坡度斜切
        const k = h.gnd ? G.physics.groundShear(map, hzX(h), h.y, h.r || 60) : 0;
        if (!k) {
          HZ[h.type].draw.call(this, ctx, h);
          continue;
        }
        const x = hzX(h);
        ctx.save();
        ctx.transform(1, k, 0, 1, 0, -k * x);
        HZ[h.type].draw.call(this, ctx, h);
        ctx.restore();
      }
    },
  };

  const STY = {
    spore: { fill: '255,70,190', edge: '#ff46be', core: ['#e8c8ff', '#b070e0', '#ffffff'] },
    claw: { fill: '255,70,60', edge: '#ff4a3a', core: ['#ffffff', '#8fd8ff', '#e8d8b0'] },
    beam: { fill: '255,230,120', edge: '#ffd84a', core: ['#fffbe0', '#ffe066', '#ffffff'] },
    lava: { fill: '255,90,30', edge: '#ff6a1e', core: ['#ffd35a', '#ff7a2a', '#3a2a24'] },
    water: { fill: '80,170,255', edge: '#4ab0ff', core: ['#ffffff', '#8fd8ff', '#5ab0e8'] },
  };
  Kit.STY = STY;

  // 預警圈：半透明填色＋內縮的時間圈＋亮色描邊（白色內線，任何地板上都看得清楚）＋往上的淡光柱
  Kit.drawTele = function (ctx, x, y, r, k, s, hgt, t) {
    ctx.save();
    if (hgt) {
      const g = ctx.createLinearGradient(0, y - hgt, 0, y);
      g.addColorStop(0, 'rgba(' + s.fill + ',0)');
      g.addColorStop(1, 'rgba(' + s.fill + ',' + (0.08 + 0.26 * k).toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(x - r * 0.85, y - hgt, r * 1.7, hgt);
    }
    ctx.fillStyle = 'rgba(' + s.fill + ',' + (0.2 + 0.25 * k).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x, y, r, 12 + 3 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(' + s.fill + ',0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * k, (12 + 3 * k) * k + 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    const pulse = 0.75 + 0.25 * Math.sin((t || 0) * (10 + 14 * k));
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(' + s.fill + ',' + pulse.toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x, y, r, 13 + 3 * k, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * k).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x, y, r - 3, 10 + 3 * k, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const HZ = (Kit.HZ = {
    // 地面預警：delay 秒後在 [x-r, x+r] 爆開（高度 hgt）
    mark: {
      update(h, dt, P, ph) {
        const y = h.y;
        if (!h.fired) {
          this.threats.push({ x1: h.x - h.r, x2: h.x + h.r, y, t: h.delay - h.t, kind: 'area' });
          if (h.t >= h.delay) {
            h.fired = true;
            // 起伏的地面：圈內比圈中心低的地表也打得到
            const yb = h.gnd ? Math.max(y, G.physics.groundY(G.world.map, U.clamp(P.x, h.x - h.r, h.x + h.r))) : y;
            const box = { x: h.x - h.r, y: y - (h.hgt || 150), w: h.r * 2, h: (h.hgt || 150) + 6 + (yb - y) };
            if (P.alive() && U.overlap(box, ph)) this.hit(h.mult, h.x, h.src || 'mark', h.noKnock ? { noKnock: true } : null);
            const s = STY[h.style] || STY.claw;
            G.fx.burst(h.x, y - 8, s.core, h.small ? 8 : 16, h.small ? 220 : 340, { angle: -Math.PI / 2, spread: 0.9 });
            if (!h.quiet) {
              G.fx.shake(h.small ? 3 : 6, 0.15);
              G.audio.play(h.sound || 'rockHit');
            }
            if (h.onFire) h.onFire.call(this, h);
          }
          return false;
        }
        return h.t >= h.delay + (h.linger || 0.45);
      },
      draw(ctx, h) {
        const s = STY[h.style] || STY.claw;
        const y = h.y;
        if (!h.fired) {
          const k = U.clamp(h.t / h.delay, 0, 1);
          Kit.drawTele(ctx, h.x, y, h.r, k, s, h.hgt || 150, h.t);
          return;
        }
        const q = U.clamp((h.t - h.delay) / (h.linger || 0.45), 0, 1);
        if (Kit.drawBurst[h.style]) Kit.drawBurst[h.style](ctx, h, q);
      },
    },
    // 沿著地面移動的光束／地裂（可以跳過去）
    sweep: {
      update(h, dt, P, ph) {
        const d = U.sign(h.x1 - h.x0);
        if (h.t < (h.delay || 0)) {
          h.x = h.x0;
          if ((P.x - h.x0) * d > -40) this.threats.push({ x1: P.x - 5, x2: P.x + 5, y: h.y, t: (h.delay - h.t) + Math.abs(P.x - h.x0) / h.speed, kind: 'jump' });
          return false;
        }
        h.x = h.x0 + d * h.speed * (h.t - (h.delay || 0));
        const done = (h.x - h.x1) * d >= 0;
        const box = { x: h.x - (h.hw || 24), y: h.y - h.hgt, w: (h.hw || 24) * 2, h: h.hgt };
        if (!h.hitDone && P.alive() && U.overlap(box, ph)) {
          if (this.hit(h.mult, h.x - d * 30, h.src || 'sweep')) h.hitDone = true;
        }
        const ahead = (P.x - h.x) * d;
        if (ahead > -10) this.threats.push({ x1: P.x - 5, x2: P.x + 5, y: h.y, t: ahead / h.speed, kind: 'jump' });
        if (h.trail && Math.random() < 0.6) {
          const s = STY[h.style] || STY.beam;
          G.fx.burst(h.x, h.y - 6, s.core, 1, 120, { angle: -Math.PI / 2, spread: 0.6, life: 0.4 });
        }
        return done;
      },
      draw(ctx, h) {
        if (Kit.drawSweep[h.style]) Kit.drawSweep[h.style].call(this, ctx, h);
      },
    },
    // 從天上掉下來的東西：先有影子，delay 秒後落地
    rock: {
      update(h, dt, P, ph) {
        const y = h.y;
        if (!h.fired) {
          this.threats.push({ x1: h.x - h.r, x2: h.x + h.r, y, t: h.delay - h.t, kind: 'area' });
          if (h.t >= h.delay) {
            h.fired = true;
            const yy = h.gnd ? G.physics.groundY(G.world.map, P.x) : y;
            if (P.alive() && Math.abs(P.x - h.x) < h.r + 14 && P.y > yy - 90 && P.y <= yy + 4) this.hit(h.mult, h.x, h.src || 'rock');
            const s = STY[h.style] || STY.lava;
            G.fx.burst(h.x, y - 10, s.core, 14, 280, { angle: -Math.PI / 2, spread: 1.2 });
            G.fx.shake(5, 0.15);
            G.audio.play('rockHit');
            if (h.pool) G.world.zones.push({ kind: 'lava', x: h.x, y, r: h.pool, t: 0, life: h.poolLife || 3.5, tick: 0.3, pct: 0.045, noSlow: true });
            if (h.cloud) G.world.zones.push({ x: h.x, y, r: h.cloud, t: 0, life: 3, tick: 0.3, pct: 0.03 });
          }
          return false;
        }
        return h.t >= h.delay + 0.3;
      },
      draw(ctx, h) {
        const y = h.y;
        const s = STY[h.style] || STY.lava;
        if (h.fired) {
          const q = U.clamp((h.t - h.delay) / 0.3, 0, 1);
          ctx.save();
          ctx.globalAlpha = 1 - q;
          ctx.strokeStyle = s.edge;
          ctx.lineWidth = 5 * (1 - q) + 1;
          ctx.beginPath();
          ctx.ellipse(h.x, y, h.r * (0.8 + q), 10 + q * 8, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          return;
        }
        const k = U.clamp(h.t / h.delay, 0, 1);
        ctx.save();
        ctx.fillStyle = 'rgba(30,8,0,' + (0.2 + 0.4 * k).toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(h.x, y, h.r * (0.45 + 0.55 * k), 6 + 6 * k, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        Kit.drawTele(ctx, h.x, y, h.r, k, s, 0, h.t);
        // 最後 0.35 秒看得到東西掉下來
        const fall = 0.35;
        const left = h.delay - h.t;
        if (left < fall && Kit.drawFaller[h.style]) {
          const f = 1 - left / fall;
          Kit.drawFaller[h.style](ctx, h.x + (1 - f) * (h.drift || 0), y - (1 - f) * 620, h, f);
        }
      },
    },
    // 持續傷害區（噴火、毒霧）：在裡面每 tickT 秒吃一次傷害
    area: {
      update(h, dt, P, ph) {
        const on = h.t >= (h.delay || 0);
        if (h.follow) h.follow.call(this, h);
        const lo = Math.min(h.x1, h.x2);
        const hi = Math.max(h.x1, h.x2);
        this.threats.push({ x1: lo, x2: hi, y: h.y, t: on ? 0 : h.delay - h.t, kind: 'area' });
        if (on && P.alive()) {
          h.tk = (h.tk || 0) - dt;
          if (h.tk <= 0 && U.overlap({ x: lo, y: h.y - h.hgt, w: hi - lo, h: h.hgt }, ph)) {
            h.tk = h.tickT || 0.5;
            this.hit(h.mult, h.from != null ? h.from : (lo + hi) / 2, h.src || 'area', h.noKnock ? { noKnock: true } : null);
          }
        }
        return h.t >= (h.delay || 0) + h.life;
      },
      draw(ctx, h) {
        if (Kit.drawArea[h.style]) Kit.drawArea[h.style].call(this, ctx, h);
      },
    },
  });

  // ── 各種預警爆開的樣子 ──
  Kit.drawBurst = {
    spore(ctx, h, q) {
      // 地面冒出一根孢子柱
      const y = h.y;
      const hh = (h.hgt || 150) * Math.min(1, q * 4) * (1 - q * 0.3);
      ctx.save();
      ctx.globalAlpha = 1 - q * q;
      const g = ctx.createLinearGradient(0, y - hh, 0, y);
      g.addColorStop(0, 'rgba(230,200,255,0)');
      g.addColorStop(0.3, 'rgba(200,140,255,0.75)');
      g.addColorStop(1, 'rgba(150,70,210,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(h.x - h.r * 0.7, y);
      ctx.quadraticCurveTo(h.x - h.r * 0.35, y - hh * 0.6, h.x - h.r * 0.2, y - hh);
      ctx.lineTo(h.x + h.r * 0.2, y - hh);
      ctx.quadraticCurveTo(h.x + h.r * 0.35, y - hh * 0.6, h.x + h.r * 0.7, y);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = h.x + Math.sin(i * 2.3 + h.x) * h.r * 0.5;
        const b = y - hh * ((i * 0.37 + q * 1.6) % 1);
        ctx.fillStyle = i % 2 ? '#ffffff' : '#e8c8ff';
        ctx.beginPath();
        ctx.arc(a, b, 3 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    claw(ctx, h, q) {
      const y = h.y;
      ctx.save();
      ctx.globalAlpha = 1 - q;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6 * (1 - q) + 1;
      ctx.beginPath();
      ctx.ellipse(h.x, y, h.r * (0.7 + q * 0.6), 12 + q * 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(143,216,255,0.9)';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(h.x + i * 24, y - 4);
        ctx.lineTo(h.x + i * 34 * (1 + q), y - 40 - q * 50 + Math.abs(i) * 10);
        ctx.stroke();
      }
      ctx.restore();
    },
    beam(ctx, h, q) {
      // 從天而降的光柱
      const y = h.y;
      ctx.save();
      ctx.globalAlpha = (1 - q) * 0.9;
      const w = h.r * (1.1 - q * 0.6);
      const g = ctx.createLinearGradient(h.x - w, 0, h.x + w, 0);
      g.addColorStop(0, 'rgba(255,240,150,0)');
      g.addColorStop(0.5, 'rgba(255,255,230,1)');
      g.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(h.x - w, y - 700, w * 2, 700);
      ctx.fillStyle = 'rgba(255,250,210,' + (0.7 * (1 - q)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(h.x, y, h.r * (1 + q * 0.5), 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    lava(ctx, h, q) {
      // 熔岩噴泉
      const y = h.y;
      const hh = (h.hgt || 150) * Math.min(1, q * 5) * (1 - q * 0.5);
      ctx.save();
      ctx.globalAlpha = 1 - q * q;
      const g = ctx.createLinearGradient(0, y - hh, 0, y);
      g.addColorStop(0, 'rgba(255,240,160,0.2)');
      g.addColorStop(0.25, 'rgba(255,190,60,0.95)');
      g.addColorStop(1, 'rgba(230,70,20,1)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(h.x - h.r * 0.75, y);
      ctx.quadraticCurveTo(h.x - h.r * 0.3, y - hh * 0.5, h.x - h.r * 0.15 + Math.sin(h.t * 30) * 4, y - hh);
      ctx.quadraticCurveTo(h.x, y - hh - 16, h.x + h.r * 0.15, y - hh);
      ctx.quadraticCurveTo(h.x + h.r * 0.3, y - hh * 0.5, h.x + h.r * 0.75, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff0a0';
      ctx.beginPath();
      ctx.ellipse(h.x, y - hh * 0.4, h.r * 0.18, hh * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    water(ctx, h, q) {
      const y = h.y;
      const hh = (h.hgt || 150) * Math.min(1, q * 5) * (1 - q * 0.4);
      ctx.save();
      ctx.globalAlpha = 1 - q * q;
      const g = ctx.createLinearGradient(0, y - hh, 0, y);
      g.addColorStop(0, 'rgba(230,250,255,0.3)');
      g.addColorStop(1, 'rgba(70,160,240,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(h.x - h.r * 0.7, y);
      ctx.quadraticCurveTo(h.x - h.r * 0.3, y - hh * 0.6, h.x, y - hh);
      ctx.quadraticCurveTo(h.x + h.r * 0.3, y - hh * 0.6, h.x + h.r * 0.7, y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };
  Kit.drawSweep = {};
  Kit.drawArea = {};
  Kit.drawFaller = {
    spore(ctx, x, y, h, f) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(f * 6);
      G.art.ellipse(ctx, 0, 0, 11, 11, '#c9a0e8', '#9a70c0', { lw: 2.2 });
      G.art.ellipse(ctx, -3, -3, 3, 3, '#ffffff', null, { noStroke: true, hl: false });
      ctx.restore();
    },
  };

  // ── 共用的變身（第二階段）流程 ──
  Kit.startTransform = function (b, dur, msg) {
    b.wantPhase2 = false;
    b.hz.length = 0;
    b.vx = 0;
    b.setState('transform', dur);
    b.p2k = 0;
    G.hud.bossLine(msg, '#ff9a9a');
    G.audio.play('bossWarn');
    G.fx.shake(8, 0.5);
  };
  Kit.updateTransform = function (b, dt, colors) {
    b.vx = 0;
    b.p2k = b.prog();
    if (Math.random() < 0.6) G.fx.burst(b.x + U.rand(-b.w * 0.5, b.w * 0.5), b.y - U.rand(10, b.h), colors, 2, 160, { grav: -120, life: 0.6 });
    if (b.stateT <= 0) {
      b.phase = 2;
      b.enraged = true;
      b.p2k = 1;
      G.fx.screenFlash(colors[0], 0.5);
      G.fx.shake(16, 0.6);
      G.fx.ring(b.x, b.y - b.h * 0.5, colors[1], 380 * (b.S || 1), 0.6, 10);
      G.fx.burst(b.x, b.y - b.h * 0.5, colors, 60, 520);
      G.audio.play('slam');
      // 變身的衝擊波把玩家震開
      const P = G.player;
      if (P.alive() && Math.abs(P.x - b.x) < b.w * 0.5 + 170 && Math.abs(P.y - b.y) < 200) b.hit(0.6, b.x, 'transform');
      return true;
    }
    return false;
  };

  // ───────────────────────── 菇菇女王 ─────────────────────────
  function Queen(x) {
    Kit.init(this, 'queenShroom', x);
    this.hopT = 0;
    this.slamsLeft = 0;
    this.spinLeft = 0;
  }
  Object.assign(Queen.prototype, Kit.proto);

  const QCOL = ['#ff5a8a', '#c040ff', '#ffd35a', '#ffffff'];

  Queen.prototype.update = function (dt) {
    const P = G.player;
    const map = G.world.map;
    const frozen = this.tick(dt);

    if (this.dead) {
      this.flushKill();
      this.deadT += dt;
      if (Math.random() < 0.5) {
        G.fx.burst(this.x + U.rand(-100, 100) * this.S, this.y - U.rand(20, 240) * this.S, ['#fff', '#ff9fd0', '#ffd35a'], 6, 240);
      }
      if (!this.onGround) this.phys(dt);
      return this.deadT > 2.2;
    }
    if (frozen) {
      this.vx = 0;
      this.phys(dt);
      return false;
    }
    if (this.wantPhase2 && this.onGround && this.state !== 'transform') {
      Kit.startTransform(this, 1.8, '菇菇女王：「……你們，都想搶走這片葉子嗎！」');
    }

    const spd = this.spd();
    const dx = P.x - this.x;
    this.stateT -= dt;
    let gs = 0;

    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('move', 0.6);
        break;

      case 'transform':
        if (Kit.updateTransform(this, dt, QCOL)) {
          this.say('跪下！', '#ffb0d8');
          this.setState('move', 0.3);
          this.forceNext = 'storm';
        }
        break;

      // 一跳一跳地逼近（在平台上就直接跳下來）
      case 'move': {
        if (this.onGround && this.plat !== 0) {
          this.leap(P.x - U.sign(dx) * 140 * this.S, 0, 0.6);
          this.setState('fall', 2);
          break;
        }
        this.dir = U.sign(dx) || this.dir;
        if (this.onGround) {
          this.vx *= 0.7;
          this.hopT -= dt;
          if (this.hopT <= 0 && Math.abs(dx) > 150 * this.S) {
            this.vy = -460;
            this.vx = this.dir * this.def.speed * spd * 1.5;
            this.onGround = false;
            this.air = { plat: 0, T: 99, t: 0, gs: 1.3 };
            this.hopT = 0.12;
          }
        }
        if (this.stateT <= 0 && this.onGround) this.chooseAttack();
        break;
      }
      case 'fall':
        if (this.onGround) this.setState('recover', 0.3);
        break;

      // ── 王者砸地 ──
      case 'slamPrep':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        if (this.stateT <= 0) {
          const pp = this.playerPlat();
          const tp = pp > 0 ? pp : 0;
          this.slamX = this.leap(P.x + P.vx * 0.25, tp, this.phase === 2 ? 0.62 : 0.72, 1.2);
          this.slamPlat = tp;
          this.setState('slamAir', 3);
        }
        break;
      case 'slamAir':
        if (this.air) this.threats.push({ x1: this.slamX - this.w * 0.5, x2: this.slamX + this.w * 0.5, y: G.physics.surfaceY(G.world.map, this.slamPlat, this.slamX), t: Math.max(0, this.air.T - this.air.t), kind: 'area' });
        if (this.onGround) {
          this.vx = 0;
          this.squash = 1;
          this.landHit(1.4);
          this.spawnWaves(this.phase === 2 ? 540 : 460);
          if (this.slamsLeft > 0) {
            this.slamsLeft--;
            this.setState('slamPrep', 0.28);
          } else this.setState('recover', 0.55 * this.cd());
        }
        break;

      // ── 孢子彈（落地變毒雲）──
      case 'spore':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        if (this.stateT <= 0) {
          const n = this.phase === 2 ? 5 : 3;
          this.lastAtk = 'spore';
          for (let i = 0; i < n; i++) {
            const tx = U.clamp(P.x + (i - (n - 1) / 2) * 120 + U.rand(-25, 25), 60, map.w - 60);
            const sx = this.x + this.dir * 50 * this.S;
            const sy = this.y - this.h * 0.85;
            const tf = 0.85 + i * 0.07;
            G.world.projectiles.push({
              kind: 'sporeBomb', x: sx, y: sy, vx: (tx - sx) / tf,
              vy: (this.groundY(tx) - sy - 0.5 * 1200 * tf * tf) / tf,
              grav: 1200, r: 14, dmg: this.dmg(0.7), life: 3, t: 0, owner: 'boss', seed: 0,
            });
          }
          G.audio.play('spore');
          this.setState('recover', 0.5 * this.cd());
        }
        break;

      // ── 裙擺旋轉衝刺 ──
      case 'spinPrep':
        this.vx = -this.dir * 40;
        if (this.stateT <= 0) {
          this.spinFrom = this.x;
          this.setState('spin', 1.6);
          G.audio.play('sweep');
        }
        this.threats.push(this.spinThreat());
        break;
      case 'spin': {
        const sp = (this.phase === 2 ? 820 : 700) * (this.slowT > 0 ? 0.7 : 1);
        this.vx = this.dir * sp;
        this.threats.push(this.spinThreat());
        if (Math.random() < 0.7) G.fx.burst(this.x - this.dir * 60 * this.S, this.y - 10, ['#ff9fd0', '#fff0dc', '#c9a0e8'], 1, 120, { life: 0.35 });
        if (this.phase === 2) {
          this.trailT = (this.trailT || 0) - dt;
          if (this.trailT <= 0) {
            this.trailT = 0.16;
            G.world.zones.push({ x: this.x, y: this.groundY(), r: 46 * this.S, t: 0, life: 2.4, tick: 0.35, pct: 0.025 });
          }
        }
        const gone = Math.abs(this.x - this.spinFrom) > 640;
        const wall = this.x < this.halfW + 30 || this.x > map.w - this.halfW - 30;
        if (gone || wall || this.stateT <= 0) {
          if (this.spinLeft > 0) {
            this.spinLeft--;
            this.dir *= -1;
            this.spinFrom = this.x;
            this.vx = 0;
            this.setState('spinPrep', 0.3);
          } else {
            this.vx = 0;
            this.setState('recover', 0.6 * this.cd());
          }
        }
        break;
      }

      // ── 跳上平台、灑孢子雨，再俯衝下來 ──
      case 'perchPrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          const tp = this.perchPlat();
          const p = map.platforms[tp];
          this.leap((p[0] + p[1]) / 2 + U.rand(-40, 40), tp, 0.75);
          this.setState('perchAir', 3);
        }
        break;
      case 'perchAir':
        if (this.onGround) {
          this.squash = 1;
          G.fx.burst(this.x, this.y - 6, ['#fff0dc', '#c9a878'], 12, 220, { angle: -Math.PI / 2, spread: 1.2 });
          this.setState('rain', this.phase === 2 ? 2.1 : 1.7);
          this.rainT = 0.1;
        }
        break;
      case 'rain':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        this.rainT -= dt;
        if (this.rainT <= 0) {
          this.rainT = this.phase === 2 ? 0.2 : 0.3;
          const lead = P.x + P.vx * 0.5 + U.rand(-50, 50);
          this.addHz({ type: 'rock', style: 'spore', x: U.clamp(lead, 40, map.w - 40), y: this.groundY(), r: 48, delay: 0.85, mult: 0.8, src: 'sporeRain', cloud: this.phase === 2 ? 40 : 0, drift: U.rand(-60, 60) });
          G.fx.burst(this.x, this.y - this.h, ['#e8c8ff', '#c070ff'], 4, 200, { angle: -Math.PI / 2, spread: 0.5 });
        }
        if (this.stateT <= 0) {
          this.setState('divePrep', 0.4);
          this.warn();
        }
        break;
      case 'divePrep':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        if (this.stateT <= 0) {
          this.slamX = this.leap(P.x, 0, 0.55, 1.2);
          this.slamPlat = 0;
          this.slamsLeft = 0;
          this.setState('slamAir', 3);
        }
        break;

      // ── 召喚小傘菇 ──
      case 'summon':
        this.vx = 0;
        if (this.stateT <= 0) {
          const n = this.phase === 2 ? 3 : 2;
          for (let i = 0; i < n; i++) G.world.spawnAdd('capshroom', this.x + ((i - (n - 1) / 2) * 110 + this.dir * 60) * this.S);
          G.audio.play('quest');
          this.setState('recover', 0.4 * this.cd());
        }
        break;

      // ── 大招：孢子風暴（第二階段）──
      case 'stormPrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          // 站上離玩家比較遠的側邊平台（中間的高平台留給玩家躲）
          const tp = this.perchPlat();
          const p = map.platforms[tp];
          this.leap((p[0] + p[1]) / 2, tp, 0.8);
          this.setState('stormAir', 3);
        }
        break;
      case 'stormAir':
        if (this.onGround) {
          this.squash = 1;
          this.setState('storm', 3.4);
          this.say('孢子風暴！', '#e8c8ff');
          G.hud.toast('地面會分兩波冒出孢子柱！看準空隙移動（平台上比較安全）', '#e8c8ff');
          G.audio.play('bossWarn');
          const gy = this.groundY();
          const W = 150;
          const gap = 110;
          const off = U.rand(0, W + gap);
          // 第一波：一條條孢子柱；第二波：錯開半格，蓋住第一波的空隙
          for (let x = -off; x < map.w + W; x += W + gap) {
            const cx = x + W / 2;
            if (cx > 0 && cx < map.w) this.addHz({ type: 'mark', style: 'spore', x: cx, y: gy, r: W / 2, delay: 1.5, mult: 1.35, src: 'storm', hgt: 170, sound: 'spore', small: true });
            const cx2 = cx + (W + gap) / 2;
            if (cx2 > 0 && cx2 < map.w) this.addHz({ type: 'mark', style: 'spore', x: cx2, y: gy, r: W / 2, delay: 2.35, mult: 1.35, src: 'storm', hgt: 170, sound: 'spore', small: true, quiet: true });
          }
        }
        break;
      case 'storm':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        if (Math.random() < 0.5) G.fx.burst(this.x + U.rand(-80, 80) * this.S, this.y - this.h * 0.9, ['#e8c8ff', '#c070ff', '#ffffff'], 1, 160, { grav: -60, life: 0.8 });
        if (this.stateT <= 0) {
          this.setState('divePrep', 0.35);
          this.warn();
        }
        break;

      case 'recover':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('move', U.rand(0.35, 0.8) * this.cd());
        break;
    }

    this.phys(dt, gs || undefined);

    const noTouch = this.state === 'transform' || this.state === 'intro';
    if (!noTouch) this.touch(this.state === 'spin' ? 1.1 : 0.5);
    return false;
  };

  Queen.prototype.spinThreat = function () {
    const map = G.world.map;
    const end = U.clamp(this.x + this.dir * 700, this.halfW, map.w - this.halfW);
    return { x1: Math.min(this.x, end) - this.w * 0.5, x2: Math.max(this.x, end) + this.w * 0.5, y: this.y, t: this.state === 'spinPrep' ? this.stateT : 0, kind: 'area' };
  };

  // 落地時壓到玩家
  Queen.prototype.landHit = function (mult) {
    const P = G.player;
    const box = { x: this.x - this.w * 0.6, y: this.y - this.h * 0.6, w: this.w * 1.2, h: this.h * 0.6 + 6 };
    if (P.alive() && U.overlap(box, P.hitbox())) this.hit(mult, this.x, 'slamLand');
  };

  Queen.prototype.perchPlat = function () {
    const P = G.player;
    const map = G.world.map;
    // 挑離玩家比較遠的側邊平台。
    // （v1.6 體型放大後女王站上中間的高平台，頭會超出畫面上緣，所以只用兩側平台。）
    const l = map.platforms[1];
    const r = map.platforms[2];
    return Math.abs(P.x - (l[0] + l[1]) / 2) > Math.abs(P.x - (r[0] + r[1]) / 2) ? 1 : 2;
  };

  Queen.prototype.chooseAttack = function () {
    const adds = this.addsAlive();
    let pick = this.forceNext;
    this.forceNext = null;
    if (!pick) {
      const table = this.phase === 1
        ? { slam: 30, spore: 20, spin: 24, perch: 18, summon: adds < 2 ? 10 : 0 }
        : { slam: 18, triple: 16, spore: 14, spin: 20, perch: 16, storm: 16, summon: adds < 3 ? 7 : 0 };
      pick = this.pick(table, { storm: 16, summon: 14, perch: 7 });
    } else this.pickT[pick] = this.fightT;
    const f = this.fury ? 0.85 : 1;
    if (pick === 'slam' || pick === 'triple') {
      this.slamsLeft = pick === 'triple' ? 2 : 0;
      this.setState('slamPrep', (this.phase === 2 ? 0.5 : 0.62) * f);
      this.warn();
    } else if (pick === 'spore') {
      this.setState('spore', 0.6 * f);
    } else if (pick === 'spin') {
      this.dir = U.sign(G.player.x - this.x) || this.dir;
      this.spinLeft = this.phase === 2 ? 1 : 0;
      this.setState('spinPrep', 0.6 * f);
      this.warn();
    } else if (pick === 'perch') {
      this.setState('perchPrep', 0.35);
    } else if (pick === 'storm') {
      this.setState('stormPrep', 0.5);
      this.warn(true);
    } else {
      this.setState('summon', 0.7);
    }
  };

  Queen.prototype.spawnWaves = function (spd) {
    this.lastAtk = 'wave';
    const y = this.y;
    [-1, 1].forEach((d) => {
      G.world.projectiles.push({
        kind: 'wave', x: this.x + d * 80 * this.S, y, vx: d * spd, vy: 0, dir: d,
        h: 46, r: 22, dmg: this.dmg(1.1), life: 5, t: 0, owner: 'boss', seed: 0,
      });
    });
    G.fx.shake(12, 0.35);
    G.fx.burst(this.x, y - 6, ['#c9a878', '#a8845a', '#fff0d6'], 26, 380, { angle: -Math.PI / 2, spread: 1.4 });
    G.audio.play('slam');
  };

  Queen.prototype.draw = function (ctx) {
    const y = this.y;
    if (!this.dead) {
      if (this.state === 'slamPrep' || this.state === 'divePrep' || (this.state === 'slamAir' && this.air)) {
        // 預警：落點的紅圈
        const k = this.state === 'slamAir' ? 1 : this.prog();
        const tx = this.state === 'slamAir' ? this.slamX : G.player.x;
        const ty = this.state === 'slamAir' ? G.physics.surfaceY(G.world.map, this.slamPlat || 0, tx) : this.groundY(tx);
        Kit.drawTele(ctx, tx, ty, this.w * 0.6, k, STY.claw, 0, this.t);
      }
      if (this.state === 'spinPrep' || this.state === 'spin') {
        const th = this.spinThreat();
        const k = this.state === 'spin' ? 0.5 : this.prog();
        ctx.fillStyle = 'rgba(255,60,150,' + (0.18 + 0.25 * k).toFixed(3) + ')';
        ctx.fillRect(th.x1, y - 9, th.x2 - th.x1, 12);
        // 箭頭
        ctx.fillStyle = 'rgba(255,90,170,' + (0.55 + 0.4 * k).toFixed(3) + ')';
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        for (let i = 1; i <= 4; i++) {
          const ax = this.x + this.dir * (this.w * 0.5 + i * 110);
          ctx.beginPath();
          ctx.moveTo(ax + this.dir * 22, y - 14);
          ctx.lineTo(ax - this.dir * 6, y - 26);
          ctx.lineTo(ax - this.dir * 6, y - 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
      if (this.state === 'transform' || this.state === 'storm' || this.state === 'stormAir') {
        const r = (200 + Math.sin(this.t * 6) * 12) * this.S;
        const g = ctx.createRadialGradient(this.x, y - this.h * 0.5, 10, this.x, y - this.h * 0.5, r);
        g.addColorStop(0, 'rgba(210,120,255,0.35)');
        g.addColorStop(1, 'rgba(210,120,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, y - this.h * 0.5, r, 0, Math.PI * 2);
        ctx.fill();
      }
      this.drawHz(ctx);
    }
    G.art.drawMonster(ctx, this);
  };

  G.bosses = { queenShroom: Queen };
})();
