// 第二、三章的 Boss（共用工具在 boss.js 的 G.BossKit）。
//
// 潮汐寄居蟹（背著老燈塔的寄居蟹，海豹燈塔守的老對手，一直想「亮一次」；打得很開心，一直在笑）
//   第一階段：橫著快速碎步移動、潮浪橫掃（要跳）、巨鉗重砸（紅圈）、縮進燈塔（正面打不動，要繞到背後打窗口，燈光會掃地）、
//     跳上平台用燈光點名轟炸再腹部壓下來、大招「燈塔巨光」——燈光沿著地面來回掃兩趟（要抓時機跳過）。
//   第二階段「燈塔全開」：燈變成橘紅色、全身冒蒸氣。巨鉗改成三連砸、燈光掃三趟、縮殼時兩道光，
//     大招「大海嘯」——左右兩道高浪（跳不過，要爬上平台或硬吃）。
//
// 熔岩甲龜（背著火山的大烏龜，等了葉之守護者一百年）
//   第一階段：沉重地走、不時跳一下踩地、火山噴發（落石影子、熔岩池）、縮殼彈跳滾撞（抓準時機從底下鑽過）、
//     噴火（前方一長條）、踩地裂（沿地面跑的熔岩裂縫，要跳）、縮殼砲彈（高高飛起砸在玩家頭上，平台也躲不掉）。
//   第二階段「百年之火」：火山整個爆開、殼的裂縫全亮。滾撞更多次、踩地裂兩波、砲彈兩連、叫狂戰士岩幫忙，
//     大招「流星火雨」——三秒多的落石雨，一半追著玩家、一半隨機，落地留下熔岩池。
(function () {
  'use strict';
  const U = G.util;
  const Kit = G.BossKit;

  // ───────── 共用的畫法：沿地面掃過的光、浪、地裂；噴火區；落石 ─────────
  Kit.drawSweep.beam = function (ctx, h) {
    if (h.t < (h.delay || 0)) return;
    const y = h.y;
    const hw = h.hw || 24;
    const lx = this.x - this.dir * this.w * 0.12;
    const ly = this.y - this.h * 0.92;
    ctx.save();
    // 外層柔光
    ctx.globalCompositeOperation = 'lighter';
    const g0 = ctx.createLinearGradient(lx, ly, h.x, y);
    g0.addColorStop(0, 'rgba(255,240,170,0.35)');
    g0.addColorStop(1, 'rgba(255,220,120,0.25)');
    ctx.fillStyle = g0;
    ctx.beginPath();
    ctx.moveTo(lx - 22, ly);
    ctx.lineTo(h.x - hw * 2.4, y);
    ctx.lineTo(h.x + hw * 2.4, y);
    ctx.lineTo(lx + 22, ly);
    ctx.closePath();
    ctx.fill();
    // 主光束
    const g = ctx.createLinearGradient(lx, ly, h.x, y);
    g.addColorStop(0, 'rgba(255,255,230,0.9)');
    g.addColorStop(1, 'rgba(255,240,160,0.7)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(lx - 9, ly);
    ctx.lineTo(h.x - hw, y);
    ctx.lineTo(h.x + hw, y);
    ctx.lineTo(lx + 9, ly);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // 地面上的亮點（打到人的部分）
    const gg = ctx.createLinearGradient(0, y - h.hgt, 0, y);
    gg.addColorStop(0, 'rgba(255,255,220,0)');
    gg.addColorStop(1, 'rgba(255,255,220,0.95)');
    ctx.fillStyle = gg;
    ctx.fillRect(h.x - hw, y - h.hgt, hw * 2, h.hgt);
    ctx.fillStyle = 'rgba(255,255,240,0.95)';
    ctx.beginPath();
    ctx.ellipse(h.x, y, hw * 2, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,80,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  };
  Kit.drawSweep.water = function (ctx, h) {
    const y = h.y;
    const d = U.sign(h.x1 - h.x0);
    if (h.t < (h.delay || 0)) {
      // 還沒出來：地圖邊緣先湧起水花＋警告箭頭
      const k = h.t / h.delay;
      ctx.save();
      ctx.fillStyle = 'rgba(80,170,255,' + (0.15 + 0.3 * k).toFixed(3) + ')';
      ctx.fillRect(h.x0 - (d > 0 ? 0 : 160), y - h.hgt * k, 160, h.hgt * k);
      ctx.restore();
      return;
    }
    const x = h.x;
    const H = h.hgt;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(d, 1);
    // 浪身（往後拖一段）
    const g = ctx.createLinearGradient(0, -H, 0, 0);
    g.addColorStop(0, 'rgba(160,225,255,0.95)');
    g.addColorStop(1, 'rgba(40,120,210,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-260, 0);
    ctx.lineTo(-260, -H * 0.55);
    ctx.quadraticCurveTo(-120, -H * 0.75, -30, -H * 0.98);
    ctx.quadraticCurveTo(30, -H * 1.12, 44, -H * 0.72);
    ctx.quadraticCurveTo(20, -H * 0.82, 14, -H * 0.55);
    ctx.quadraticCurveTo(40, -H * 0.2, 30, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e4a7a';
    ctx.lineWidth = 3;
    ctx.stroke();
    // 浪花
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const a = (h.t * 5 + i * 0.9) % 1;
      ctx.beginPath();
      ctx.arc(20 - i * 16 + Math.sin(h.t * 9 + i) * 4, -H * (0.95 - i * 0.04) - a * 12, 7 - i * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-240, -H * 0.4);
    ctx.quadraticCurveTo(-150, -H * 0.5 + Math.sin(h.t * 8) * 5, -60, -H * 0.62);
    ctx.stroke();
    ctx.restore();
  };
  Kit.drawSweep.lava = function (ctx, h) {
    if (h.t < (h.delay || 0)) return;
    const y = h.y;
    ctx.save();
    // 裂縫：從起點一路到現在的位置
    ctx.strokeStyle = 'rgba(60,20,10,0.9)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const n = Math.max(2, Math.floor(Math.abs(h.x - h.x0) / 26));
    for (let i = 0; i <= n; i++) {
      const x = h.x0 + ((h.x - h.x0) * i) / n;
      const yy = y - 2 + (i % 2 ? -3 : 3);
      i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ffb43a';
    ctx.lineWidth = 3;
    ctx.stroke();
    // 前端噴出來的熔岩
    const hh = h.hgt;
    const g = ctx.createLinearGradient(0, y - hh, 0, y);
    g.addColorStop(0, 'rgba(255,230,140,0.1)');
    g.addColorStop(0.4, 'rgba(255,160,50,0.95)');
    g.addColorStop(1, 'rgba(220,60,20,1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(h.x - 26, y);
    ctx.quadraticCurveTo(h.x - 12, y - hh * 0.6, h.x + Math.sin(h.t * 40) * 5, y - hh);
    ctx.quadraticCurveTo(h.x + 12, y - hh * 0.6, h.x + 26, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  Kit.drawArea.fire = function (ctx, h) {
    const on = h.t >= (h.delay || 0);
    const lo = Math.min(h.x1, h.x2);
    const hi = Math.max(h.x1, h.x2);
    const y = h.y;
    ctx.save();
    if (!on) {
      const k = h.t / h.delay;
      ctx.fillStyle = 'rgba(255,90,30,' + (0.1 + 0.25 * k).toFixed(3) + ')';
      ctx.fillRect(lo, y - 8, hi - lo, 10);
      ctx.restore();
      return;
    }
    const left = h.life - (h.t - (h.delay || 0));
    const a = Math.min(1, left * 4, (h.t - (h.delay || 0)) * 8);
    ctx.globalAlpha = a;
    const d = U.sign(h.x2 - h.x1) || 1;
    // 火焰長條：靠嘴的一端高、尾端低
    for (let i = 0; i < 16; i++) {
      const f = i / 15;
      const x = h.x1 + (h.x2 - h.x1) * f;
      const hh = h.hgt * (1 - f * 0.45) * (0.75 + 0.25 * Math.sin(h.t * 22 + i * 1.7));
      const r = 26 + (1 - f) * 12;
      const g = ctx.createRadialGradient(x, y - hh * 0.45, 2, x, y - hh * 0.45, r * 1.6);
      g.addColorStop(0, 'rgba(255,245,170,0.95)');
      g.addColorStop(0.45, 'rgba(255,150,40,0.8)');
      g.addColorStop(1, 'rgba(220,50,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x + d * Math.sin(h.t * 17 + i) * 6, y - hh * 0.45, r * 1.2, hh * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  Kit.drawFaller.lava = function (ctx, x, y, h, f) {
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    g.addColorStop(0, 'rgba(255,200,80,0.8)');
    g.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -10, 46, 0, Math.PI * 2);
    ctx.fill();
    // 拖尾
    ctx.fillStyle = 'rgba(255,150,50,0.5)';
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.lineTo(0, -120);
    ctx.lineTo(14, -6);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(f * 5 + (h.seed || 0));
    G.art.shape(ctx, (c) => {
      c.moveTo(-18, -4);
      c.lineTo(-10, -18);
      c.lineTo(8, -17);
      c.lineTo(19, -3);
      c.lineTo(10, 15);
      c.lineTo(-12, 13);
      c.closePath();
    }, '#5a3a30', '#3a2420', { lw: 3 });
    ctx.strokeStyle = '#ffb43a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(2, 0);
    ctx.lineTo(-4, 9);
    ctx.moveTo(2, 0);
    ctx.lineTo(11, -6);
    ctx.stroke();
    ctx.restore();
  };

  // ═════════════════ 潮汐寄居蟹 ═════════════════
  const CCOL = ['#ffb04a', '#ff7a3a', '#fff6a8', '#8fd8ff'];

  function HermitCrab(x) {
    Kit.init(this, 'hermitCrab', x);
    this.beamX = x;
    this.beam2X = x;
    this.burstT = 0;
    this.comboLeft = 0;
  }
  Object.assign(HermitCrab.prototype, Kit.proto);

  // 縮在燈塔裡：正面打不動，要從背後打窗口（打背後 1.5 倍）
  HermitCrab.prototype.guard = function (dmg, dir) {
    if (this.state !== 'shell') return dmg;
    const fromBack = dir === this.dir;
    if (!fromBack) {
      if (!this.blockMsgT || this.t - this.blockMsgT > 0.8) {
        this.blockMsgT = this.t;
        G.fx.text(this.x - this.dir * 60, this.y - 140, '擋住了！繞到背後', '#bfe8ff', 16, 0.9);
      }
      G.audio.play('rockHit');
      return 0;
    }
    G.fx.burst(this.x - this.dir * 90, this.y - 150, ['#fff6a8', '#ffffff'], 8, 200);
    return Math.round(dmg * 1.5);
  };

  HermitCrab.prototype.update = function (dt) {
    const P = G.player;
    const map = G.world.map;
    const frozen = this.tick(dt);
    if (this.dead) {
      this.flushKill();
      this.deadT += dt;
      if (Math.random() < 0.5) G.fx.burst(this.x + U.rand(-110, 110), this.y - U.rand(20, 220), ['#fff', '#8fd8ff', '#ffd35a'], 6, 240);
      if (!this.onGround) this.phys(dt);
      return this.deadT > 2.2;
    }
    if (frozen) {
      this.vx = 0;
      this.phys(dt);
      return false;
    }
    if (this.wantPhase2 && this.onGround && this.state !== 'transform' && this.state !== 'shell') {
      Kit.startTransform(this, 1.9, '潮汐寄居蟹：「哈哈哈哈！好久沒這麼過癮了！燈塔——全開！」');
      this.say('哈哈哈哈！', '#ffe9a0');
    }
    const spd = this.spd();
    const dx = P.x - this.x;
    this.stateT -= dt;

    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.say('來啊，小鬼！', '#ffe9a0');
          this.setState('move', 0.6);
        }
        break;

      case 'transform':
        if (Kit.updateTransform(this, dt, CCOL)) {
          this.setState('move', 0.3);
          this.forceNext = 'tsunami';
        }
        break;

      // 橫著走：一小段一小段地快速碎步，保持在玩家附近
      case 'move': {
        if (this.onGround && this.plat !== 0) {
          this.leap(P.x - U.sign(dx) * 180, 0, 0.6);
          this.setState('fall', 2);
          break;
        }
        this.dir = U.sign(dx) || this.dir;
        this.burstT -= dt;
        if (this.burstT <= 0) {
          const want = Math.abs(dx) > 230 ? U.sign(dx) : Math.abs(dx) < 150 ? -U.sign(dx) : 0;
          this.scuttle = want || (Math.random() < 0.5 ? -1 : 1);
          this.burstT = 0.5;
        }
        this.vx = this.burstT > 0.2 ? this.scuttle * this.def.speed * spd * 2.3 : this.vx * 0.8;
        if (this.stateT <= 0 && this.onGround) this.chooseAttack();
        break;
      }
      case 'fall':
        if (this.onGround) this.setState('recover', 0.3);
        break;

      // ── 潮浪橫掃 ──
      case 'tidePrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.spawnTide(this.phase === 2 ? 540 : 460, 60);
          this.setState('tide', 0.45);
        }
        break;
      case 'tide':
        this.vx = 0;
        if (this.stateT <= 0) {
          if (this.phase === 2 && !this.secondTide) {
            this.secondTide = true;
            this.setState('tidePrep', 0.35);
          } else {
            this.secondTide = false;
            this.setState('recover', 0.5 * this.cd());
          }
        }
        break;

      // ── 巨鉗重砸（第二階段三連）──
      case 'clawPrep': {
        const tx = this.slamX - this.dir * (this.w * 0.5 + 10);
        this.vx = U.clamp((tx - this.x) * 6, -700, 700);
        if (this.stateT <= 0) {
          this.vx = 0;
          this.setState('clawSlam', 0.25);
          G.fx.shake(12, 0.3);
          G.audio.play('slam');
        }
        break;
      }
      case 'clawSlam':
        this.vx = 0;
        if (this.stateT <= 0) {
          if (this.comboLeft > 0) {
            this.comboLeft--;
            this.clawAt(G.player.x, 0.5);
          } else this.setState('recover', 0.55 * this.cd());
        }
        break;

      // ── 縮進燈塔 ──
      case 'shell': {
        this.vx = 0;
        const span = 560;
        const w = this.phase === 2 ? 2.3 : 1.7;
        this.beamX = this.x + Math.sin(this.t * w) * span;
        this.beam2X = this.x - Math.sin(this.t * w) * span;
        const beams = this.phase === 2 ? [this.beamX, this.beam2X] : [this.beamX];
        this.beamCd = Math.max(0, (this.beamCd || 0) - dt);
        beams.forEach((bx) => {
          if (Math.abs(P.x - bx) < 110) this.threats.push({ x1: P.x - 5, x2: P.x + 5, y: this.y, t: Math.abs(P.x - bx) / (span * w) * 1.2, kind: 'jump' });
          if (P.alive() && Math.abs(P.x - bx) < 46 && P.onGround && P.y > this.y - 20 && !this.beamCd) {
            this.hit(0.75, bx, 'shellBeam');
            this.beamCd = 0.8;
          }
        });
        if (this.stateT <= 0) {
          this.say('嘿嘿，出來透透氣！', '#bfe8ff');
          this.setState('recover', 0.4);
        }
        break;
      }

      // ── 跳上平台、燈光點名轟炸、腹部壓下來 ──
      case 'perchPrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          const tp = this.perchPlat();
          const p = map.platforms[tp];
          this.leap((p[0] + p[1]) / 2 + U.rand(-40, 40), tp, 0.7);
          this.setState('perchAir', 3);
        }
        break;
      case 'perchAir':
        if (this.onGround) {
          this.squash = 1;
          this.setState('barrage', this.phase === 2 ? 2.3 : 1.8);
          this.rainT = 0.15;
          this.say('照你！照你！', '#fff3a0');
        }
        break;
      case 'barrage':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        this.rainT -= dt;
        if (this.rainT <= 0) {
          this.rainT = this.phase === 2 ? 0.3 : 0.42;
          const tx = U.clamp(P.x + P.vx * 0.45 + U.rand(-30, 30), 50, map.w - 50);
          const pp = this.playerPlat();
          const ty = map.platforms[pp >= 0 ? pp : 0][2];
          this.addHz({ type: 'mark', style: 'beam', x: tx, y: ty, r: 62, delay: 0.75, mult: 0.85, src: 'barrage', hgt: 200, sound: 'thunder', small: true });
        }
        if (this.stateT <= 0) {
          this.setState('flopPrep', 0.45);
          this.warn();
        }
        break;
      case 'flopPrep':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        if (this.stateT <= 0) {
          this.slamX = this.leap(P.x, 0, 0.6, 1.2);
          this.slamPlat = 0;
          this.setState('flopAir', 3);
        }
        break;
      case 'flopAir':
        if (this.air) this.threats.push({ x1: this.slamX - this.w * 0.55, x2: this.slamX + this.w * 0.55, y: this.groundY(), t: Math.max(0, this.air.T - this.air.t), kind: 'area' });
        if (this.onGround) {
          this.squash = 1;
          this.landHit(1.4);
          this.spawnTide(420, 50);
          this.setState('recover', 0.6 * this.cd());
        }
        break;

      // ── 大招：燈塔巨光（光沿著地面來回掃）──
      case 'beamPrep':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        if (Math.random() < 0.5) G.fx.burst(this.x - this.dir * this.w * 0.12, this.y - this.h * 0.92, ['#fffbe0', '#ffe066'], 2, 200);
        if (this.stateT <= 0) {
          const passes = this.phase === 2 ? 3 : 2;
          const sp = this.phase === 2 ? 1000 : 820;
          let delay = 0;
          const L = 30;
          const R = map.w - 30;
          let from = P.x < this.x ? R : L;
          for (let i = 0; i < passes; i++) {
            const to = from === L ? R : L;
            this.addHz({ type: 'sweep', style: 'beam', x0: from, x1: to, x: from, y: this.groundY(), speed: sp, hgt: 72, hw: 26, mult: 1.25, delay, src: 'greatBeam', trail: true });
            delay += Math.abs(to - from) / sp + 0.35;
            from = to;
          }
          this.setState('beam', delay + 0.1);
          G.audio.play('thunder');
        }
        break;
      case 'beam':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('recover', 0.7 * this.cd());
        break;

      // ── 大招：大海嘯（第二階段）──
      case 'tsunamiPrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          const gy = this.groundY();
          const first = P.x < map.w / 2 ? -1 : 1;
          [first, -first].forEach((side, i) => {
            const x0 = side < 0 ? -40 : map.w + 40;
            const x1 = side < 0 ? map.w + 60 : -60;
            this.addHz({ type: 'sweep', style: 'water', x0, x1, x: x0, y: gy, speed: 560, hgt: 128, hw: 40, mult: 1.6, delay: 0.5 + i * 0.9, src: 'tsunami' });
          });
          this.setState('tsunami', 0.5 + 0.9 + (map.w + 100) / 560 + 0.2);
          G.audio.play('sweep');
        }
        break;
      case 'tsunami':
        this.vx = 0;
        if (Math.random() < 0.3) G.fx.burst(this.x + U.rand(-60, 60), this.y - this.h * 0.8, ['#8fd8ff', '#ffffff'], 1, 120, { grav: -40, life: 0.6 });
        if (this.stateT <= 0) this.setState('recover', 0.5);
        break;

      // ── 叫卷軸寄居蟹來幫忙 ──
      case 'summon':
        this.vx = 0;
        if (this.stateT <= 0) {
          const id = G.data.monsters.postcrab ? 'postcrab' : null;
          if (id) for (let i = 0; i < 2; i++) G.world.spawnAdd(id, this.x + (i ? 1 : -1) * 130);
          this.say('小的們，上！', '#ffe9a0');
          G.audio.play('quest');
          this.setState('recover', 0.4);
        }
        break;

      case 'recover':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('move', U.rand(0.4, 0.9) * this.cd());
        break;
    }
    this.phys(dt);
    const noTouch = this.state === 'transform' || this.state === 'intro' || this.state === 'shell';
    if (!noTouch) this.touch(0.5);
    return false;
  };

  HermitCrab.prototype.landHit = function (mult) {
    const P = G.player;
    const box = { x: this.x - this.w * 0.6, y: this.y - this.h * 0.5, w: this.w * 1.2, h: this.h * 0.5 + 6 };
    if (P.alive() && U.overlap(box, P.hitbox())) this.hit(mult, this.x, 'flopLand');
  };

  HermitCrab.prototype.perchPlat = function () {
    const P = G.player;
    const map = G.world.map;
    if (Math.random() < 0.35) return 3;
    const l = map.platforms[1];
    const r = map.platforms[2];
    return Math.abs(P.x - (l[0] + l[1]) / 2) > Math.abs(P.x - (r[0] + r[1]) / 2) ? 1 : 2;
  };

  // 在 x 放一個巨鉗的紅圈，prep 秒後砸下（蟹會先衝到旁邊）
  HermitCrab.prototype.clawAt = function (x, prep) {
    const map = G.world.map;
    this.slamX = U.clamp(x, 100, map.w - 100);
    this.dir = U.sign(this.slamX - this.x) || this.dir;
    this.addHz({ type: 'mark', style: 'claw', x: this.slamX, y: this.groundY(), r: 100, delay: prep, mult: 1.45, src: 'claw', hgt: 140, sound: 'slam' });
    this.setState('clawPrep', prep);
  };

  HermitCrab.prototype.chooseAttack = function () {
    const adds = this.addsAlive();
    let pick = this.forceNext;
    this.forceNext = null;
    if (!pick) {
      const table = this.phase === 1
        ? { tide: 22, claw: 24, shell: 14, perch: 16, beam: 14, summon: adds < 2 ? 6 : 0 }
        : { tide: 16, combo: 22, shell: 10, perch: 14, beam: 12, tsunami: 14, summon: adds < 2 ? 8 : 0 };
      pick = this.pick(table, { beam: this.phase === 2 ? 13 : 16, tsunami: 20, shell: 10, summon: 16, perch: 7 });
    } else this.pickT[pick] = this.fightT;
    const f = this.fury ? 0.85 : 1;
    if (pick === 'tide') {
      this.setState('tidePrep', 0.7 * f);
      this.warn();
    } else if (pick === 'claw' || pick === 'combo') {
      this.comboLeft = pick === 'combo' ? 2 : 0;
      this.clawAt(G.player.x, (pick === 'combo' ? 0.6 : 0.72) * f);
      this.warn();
    } else if (pick === 'shell') {
      G.hud.toast('寄居蟹縮進燈塔裡了！繞到背後打窗口', '#bfe8ff');
      this.setState('shell', this.phase === 2 ? 3.6 : 3);
    } else if (pick === 'perch') {
      this.setState('perchPrep', 0.3);
    } else if (pick === 'beam') {
      this.say('哈哈哈！看好了，這就是老子的光！', '#fff3a0');
      G.hud.toast('燈光要沿著地面掃過來了！抓準時機跳過去', '#fff3a0');
      this.setState('beamPrep', 1.3 * f);
      this.warn(true);
    } else if (pick === 'tsunami') {
      this.say('浪來啦！爬高一點，小鬼！', '#bfe8ff');
      G.hud.toast('大海嘯！浪太高跳不過——爬上平台，或是準備喝藥水！', '#8fd8ff');
      this.setState('tsunamiPrep', 1.6);
      this.warn(true);
    } else {
      this.setState('summon', 0.6);
    }
  };

  HermitCrab.prototype.spawnTide = function (spd, h) {
    this.lastAtk = 'tide';
    [-1, 1].forEach((d) => {
      G.world.projectiles.push({
        kind: 'tide', x: this.x + d * 110, y: this.y, vx: d * spd, vy: 0, dir: d,
        h, r: 26, dmg: this.dmg(1.1), life: 6, t: 0, owner: 'boss', seed: 0,
      });
    });
    G.fx.shake(10, 0.3);
    G.fx.burst(this.x, this.y - 10, ['#8fd8ff', '#ffffff', '#5ab0e8'], 26, 360, { angle: -Math.PI / 2, spread: 1.4 });
    G.audio.play('sweep');
  };

  HermitCrab.prototype.draw = function (ctx) {
    const y = this.y;
    if (!this.dead) {
      if (this.state === 'tidePrep') {
        const k = this.prog();
        ctx.fillStyle = 'rgba(90,180,255,' + (0.12 + 0.18 * k).toFixed(3) + ')';
        ctx.fillRect(0, y - 8, G.world.map.w, 10);
      }
      if (this.state === 'flopPrep' || (this.state === 'flopAir' && this.air)) {
        const tx = this.state === 'flopAir' ? this.slamX : G.player.x;
        Kit.drawTele(ctx, tx, this.groundY(), this.w * 0.6, this.state === 'flopAir' ? 1 : this.prog(), Kit.STY.claw, 0, this.t);
      }
      if (this.state === 'shell') {
        const beams = this.phase === 2 ? [this.beamX, this.beam2X] : [this.beamX];
        beams.forEach((bx) => {
          const lx = this.x;
          const ly = y - this.h * 0.86;
          const g = ctx.createLinearGradient(lx, ly, bx, y);
          g.addColorStop(0, 'rgba(255,250,200,0.6)');
          g.addColorStop(1, 'rgba(255,240,150,0.3)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(lx - 8, ly);
          ctx.lineTo(bx - 46, y);
          ctx.lineTo(bx + 46, y);
          ctx.lineTo(lx + 8, ly);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(255,245,170,0.55)';
          ctx.beginPath();
          ctx.ellipse(bx, y, 50, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      if (this.state === 'beamPrep') {
        // 燈越來越亮，地面上先畫出光會走的路
        const k = this.prog();
        ctx.fillStyle = 'rgba(255,240,150,' + (0.1 + 0.25 * k).toFixed(3) + ')';
        ctx.fillRect(0, y - 6, G.world.map.w, 8);
      }
      if (this.state === 'tsunamiPrep') {
        const k = this.prog();
        ctx.fillStyle = 'rgba(60,150,255,' + (0.1 + 0.25 * k).toFixed(3) + ')';
        ctx.fillRect(0, y - 128 * k, G.world.map.w, 128 * k);
      }
      this.drawHz(ctx);
    }
    G.art.drawMonster(ctx, this);
  };

  // ═════════════════ 熔岩甲龜 ═════════════════
  const TCOL = ['#ff7a2a', '#ffd35a', '#ff3a1e', '#3a2a24'];

  function LavaTortoise(x) {
    Kit.init(this, 'lavaTortoise', x);
    this.rollAngle = 0;
    this.hopT = 1;
    this.bounces = 0;
    this.cannonLeft = 0;
  }
  Object.assign(LavaTortoise.prototype, Kit.proto);

  // 縮成殼（滾、砲彈）時身體變小、變圓
  LavaTortoise.prototype.hitbox = function () {
    if (this.state === 'roll' || this.state === 'cannonAir') {
      const r = this.h * 0.46;
      return { x: this.x - r, y: this.y - r * 2, w: r * 2, h: r * 2 };
    }
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
  };

  LavaTortoise.prototype.update = function (dt) {
    const P = G.player;
    const map = G.world.map;
    const frozen = this.tick(dt);
    if (this.dead) {
      this.flushKill();
      this.deadT += dt;
      if (Math.random() < 0.5) G.fx.burst(this.x + U.rand(-120, 120), this.y - U.rand(20, 200), ['#fff', '#ff9a3a', '#ffd35a'], 6, 240);
      if (!this.onGround) this.phys(dt);
      return this.deadT > 2.2;
    }
    if (frozen) {
      this.vx = 0;
      this.phys(dt);
      return false;
    }
    if (this.wantPhase2 && this.onGround && this.state !== 'transform' && this.state !== 'roll') {
      Kit.startTransform(this, 2.0, '熔岩甲龜：「一百年了……我等的就是這一刻！」');
    }
    const spd = this.spd();
    const dx = P.x - this.x;
    this.stateT -= dt;
    const was = this.onGround;

    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('move', 0.8);
        break;

      case 'transform':
        if (Math.random() < 0.05) this.addHz({ type: 'rock', style: 'lava', x: U.rand(80, map.w - 80), y: this.groundY(), r: 40, delay: 0.9, mult: 0.6, src: 'transformRock', seed: Math.random() * 6 });
        if (Kit.updateTransform(this, dt, TCOL)) {
          this.say('百年之火！', '#ffb43a');
          this.setState('move', 0.3);
          this.forceNext = 'meteor';
        }
        break;

      // 沉重地走，每隔一下跳起來踩地
      case 'move': {
        if (this.onGround && this.plat !== 0) {
          this.leap(P.x - U.sign(dx) * 200, 0, 0.65);
          this.setState('fall', 2);
          break;
        }
        this.dir = U.sign(dx) || this.dir;
        if (this.onGround) {
          this.vx = Math.abs(dx) > 190 ? this.dir * this.def.speed * spd : 0;
          this.hopT -= dt;
          if (this.hopT <= 0 && Math.abs(dx) > 260) {
            this.hopT = this.phase === 2 ? 0.7 : 1.0;
            this.vy = -560;
            this.vx = this.dir * this.def.speed * spd * 2.2;
            this.onGround = false;
            this.air = { plat: 0, T: 99, t: 0, gs: 1.3 };
          }
        }
        if (this.stateT <= 0 && this.onGround) this.chooseAttack();
        break;
      }
      case 'fall':
        if (this.onGround) this.setState('recover', 0.3);
        break;

      // ── 火山噴發 ──
      case 'eruptPrep':
        this.vx = 0;
        if (Math.random() < 0.3) G.fx.burst(this.x, this.y - this.h, ['#5a4a44', '#8a7a70'], 2, 80, { angle: -Math.PI / 2, spread: 0.5 });
        if (this.stateT <= 0) {
          this.erupt(this.phase === 2 ? 8 : 6);
          this.setState('erupt', 0.5);
        }
        break;
      case 'erupt':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('recover', 0.6 * this.cd());
        break;

      // ── 縮殼彈跳滾撞 ──
      case 'rollPrep':
        this.vx = 0;
        this.rollAngle += this.dir * dt * 4 * this.prog();
        if (this.stateT <= 0) {
          this.bounces = this.phase === 2 ? 2 : 1;
          this.dir = U.sign(dx) || 1;
          this.setState('roll', 6);
          G.audio.play('sweep');
        }
        break;
      case 'roll': {
        const sp = (this.phase === 2 ? 760 : 640) * (this.slowT > 0 ? 0.7 : 1);
        this.vx = this.dir * sp;
        this.rollAngle += (this.dir * sp * dt) / (this.h * 0.46);
        if (this.onGround) {
          // 落地就彈起來：抓準時機可以從底下鑽過去
          this.vy = -780;
          this.onGround = false;
          this.air = { plat: 0, T: 99, t: 0, gs: 1 };
          G.fx.shake(5, 0.12);
          G.fx.burst(this.x, this.y - 6, ['#ff9a3a', '#5a3a2a', '#ffd35a'], 8, 200, { angle: -Math.PI / 2, spread: 1 });
          G.audio.play('rockHit');
          if (this.phase === 2) G.world.zones.push({ kind: 'lava', x: this.x, y: this.y, r: 40, t: 0, life: 2.2, tick: 0.3, pct: 0.035, noSlow: true });
        }
        const nx = this.x + this.vx * dt;
        if (nx < this.halfW + 12 || nx > map.w - this.halfW - 12) {
          this.dir *= -1;
          this.bounces--;
          G.fx.shake(10, 0.25);
          G.audio.play('rockHit');
          if (this.bounces < 0) this.stopAfter = 420;
          this.rollFrom = this.x;
        }
        if (this.stopAfter && Math.abs(this.x - this.rollFrom) > this.stopAfter) this.stopRoll = true;
        const th = { x1: Math.min(this.x, this.x + this.dir * 500), x2: Math.max(this.x, this.x + this.dir * 500), y: this.y, t: 0.3, kind: 'area' };
        this.threats.push(th);
        if ((this.stopRoll || this.stateT <= 0) && this.onGround === false && this.vy > 0 && this.y > this.groundY() - 30) {
          this.stopRoll = false;
          this.stopAfter = 0;
          this.vx = 0;
          this.setState('rollEnd', 0.5 * this.cd());
        }
        break;
      }
      case 'rollEnd':
        this.vx = 0;
        if (this.onGround && this.stateT <= 0) this.setState('recover', 0.3);
        break;

      // ── 噴火 ──
      case 'breathPrep':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        if (this.stateT <= 0) {
          const len = this.phase === 2 ? 540 : 440;
          const self = this;
          this.addHz({
            type: 'area', style: 'fire', x1: 0, x2: 0, y: this.y, hgt: 130, life: 1.2, delay: 0, mult: 0.85, tickT: 0.4, src: 'breath', len,
            follow(h) {
              h.x1 = self.x + self.dir * self.w * 0.42;
              h.x2 = h.x1 + self.dir * h.len;
              h.from = self.x;
              h.y = self.y;
            },
          });
          this.setState('breath', 1.2);
          G.audio.play('roar');
        }
        break;
      case 'breath':
        this.vx = 0;
        if (this.stateT <= 0) {
          if (this.phase === 2) {
            // 燒過的地面留下火
            for (let i = 1; i <= 3; i++) G.world.zones.push({ kind: 'lava', x: this.x + this.dir * (this.w * 0.4 + i * 140), y: this.y, r: 45, t: 0, life: 2.5, tick: 0.3, pct: 0.035, noSlow: true });
          }
          this.setState('recover', 0.55 * this.cd());
        }
        break;

      // ── 踩地裂 ──
      case 'quakePrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.quake();
          this.quakeLeft = this.phase === 2 ? 1 : 0;
          this.setState('quake', 0.5);
        }
        break;
      case 'quake':
        this.vx = 0;
        if (this.stateT <= 0) {
          if (this.quakeLeft > 0) {
            this.quakeLeft--;
            this.setState('quakePrep', 0.35);
          } else this.setState('recover', 0.5 * this.cd());
        }
        break;

      // ── 縮殼砲彈 ──
      case 'cannonPrep':
        this.vx = 0;
        this.rollAngle += this.dir * dt * 6 * this.prog();
        if (this.stateT <= 0) {
          const pp = this.playerPlat();
          const tp = pp > 0 ? pp : 0;
          const T = 0.85;
          this.slamX = this.leap(P.x + P.vx * 0.3, tp, T, 1);
          this.slamPlat = tp;
          this.addHz({ type: 'mark', style: 'lava', x: this.slamX, y: map.platforms[tp][2], r: 130, delay: T, mult: 1.45, src: 'cannon', hgt: 160, sound: 'slam' });
          this.setState('cannonAir', 3);
          G.audio.play('sweep');
        }
        break;
      case 'cannonAir':
        this.rollAngle += this.dir * dt * 14;
        if (this.onGround) {
          this.squash = 1;
          G.fx.shake(14, 0.35);
          for (let i = 0; i < 2; i++) this.addHz({ type: 'rock', style: 'lava', x: U.clamp(this.x + (i ? 1 : -1) * U.rand(170, 300), 60, map.w - 60), y: this.groundY(), r: 38, delay: 0.7, mult: 0.7, src: 'cannonRock', seed: Math.random() * 6 });
          if (this.cannonLeft > 0) {
            this.cannonLeft--;
            this.setState('cannonPrep', 0.35);
          } else this.setState('cannonEnd', 0.6 * this.cd());
        }
        break;
      case 'cannonEnd':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('recover', 0.2);
        break;

      // ── 大招：流星火雨（第二階段）──
      case 'meteorPrep':
        this.vx = 0;
        if (Math.random() < 0.6) G.fx.burst(this.x, this.y - this.h, ['#ff7a2a', '#ffd35a', '#3a2a24'], 2, 200, { angle: -Math.PI / 2, spread: 0.4 });
        if (this.stateT <= 0) {
          this.setState('meteor', 3.6);
          this.rainT = 0;
          this.rainN = 0;
          G.fx.screenFlash('#ff7a2a', 0.3);
          G.fx.shake(14, 0.5);
          G.audio.play('slam');
        }
        break;
      case 'meteor':
        this.vx = 0;
        this.rainT -= dt;
        if (this.rainT <= 0 && this.stateT > 0.9) {
          this.rainT = 0.19;
          this.rainN++;
          const aim = this.rainN % 2 === 1;
          const x = aim ? P.x + P.vx * 0.5 + U.rand(-40, 40) : U.rand(60, map.w - 60);
          const pp = this.playerPlat();
          const ty = aim && pp > 0 ? map.platforms[pp][2] : this.groundY();
          this.addHz({ type: 'rock', style: 'lava', x: U.clamp(x, 50, map.w - 50), y: ty, r: 48, delay: 0.9, mult: 1.05, src: 'meteor', pool: this.rainN % 3 === 0 && ty === this.groundY() ? 55 : 0, seed: Math.random() * 6, drift: U.rand(-160, 160) });
          G.fx.burst(this.x, this.y - this.h, ['#ff7a2a', '#ffd35a'], 3, 320, { angle: -Math.PI / 2, spread: 0.5 });
        }
        if (this.stateT <= 0) this.setState('recover', 0.5);
        break;

      // ── 叫狂戰士岩幫忙 ──
      case 'summon':
        this.vx = 0;
        if (this.stateT <= 0) {
          const id = G.data.monsters.angerrock ? 'angerrock' : null;
          if (id) for (let i = 0; i < 2; i++) G.world.spawnAdd(id, this.x + (i ? 1 : -1) * 150);
          G.audio.play('quest');
          this.setState('recover', 0.4);
        }
        break;

      case 'recover':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('move', U.rand(0.5, 1.0) * this.cd());
        break;
    }
    this.phys(dt);
    if (!was && this.onGround && this.state === 'move') {
      // 跳起來踩地：小小的震動
      G.fx.shake(6, 0.15);
      G.fx.burst(this.x, this.y - 6, ['#8a6a50', '#5a3a2a'], 10, 200, { angle: -Math.PI / 2, spread: 1.3 });
      G.audio.play('rockHit');
    }
    const noTouch = this.state === 'transform' || this.state === 'intro';
    if (!noTouch) this.touch(this.state === 'roll' ? 1.1 : this.state === 'cannonAir' ? 1.2 : 0.5);
    return false;
  };

  LavaTortoise.prototype.chooseAttack = function () {
    const adds = this.addsAlive();
    let pick = this.forceNext;
    this.forceNext = null;
    if (!pick) {
      const table = this.phase === 1
        ? { erupt: 22, roll: 16, breath: 20, quake: 18, cannon: 18 }
        : { erupt: 12, roll: 15, breath: 15, quake: 15, cannon: 16, meteor: 16, summon: adds < 2 ? 8 : 0 };
      pick = this.pick(table, { meteor: 18, summon: 16, roll: 6 });
    } else this.pickT[pick] = this.fightT;
    const f = this.fury ? 0.85 : 1;
    if (pick === 'erupt') {
      this.setState('eruptPrep', 0.85 * f);
      this.warn();
    } else if (pick === 'roll') {
      this.setState('rollPrep', 0.65 * f);
      this.warn();
    } else if (pick === 'breath') {
      this.setState('breathPrep', 0.7 * f);
    } else if (pick === 'quake') {
      this.setState('quakePrep', 0.7 * f);
      this.warn();
    } else if (pick === 'cannon') {
      this.cannonLeft = this.phase === 2 ? 1 : 0;
      this.setState('cannonPrep', 0.55 * f);
      this.warn();
    } else if (pick === 'meteor') {
      this.say('百年的火，全部給你！', '#ffb43a');
      G.hud.toast('流星火雨！看地上的影子，一直移動！', '#ffb43a');
      this.setState('meteorPrep', 1.2);
      this.warn(true);
    } else {
      this.setState('summon', 0.6);
    }
  };

  LavaTortoise.prototype.erupt = function (n) {
    const P = G.player;
    const map = G.world.map;
    this.lastAtk = 'erupt';
    for (let i = 0; i < n; i++) {
      const x = i === 0 ? P.x : U.clamp(P.x + U.rand(-460, 460), 80, map.w - 80);
      this.addHz({ type: 'rock', style: 'lava', x, y: this.groundY(), r: 46, delay: 0.8 + i * 0.12, mult: 1.0, src: 'erupt', pool: 55, seed: Math.random() * 6, drift: U.rand(-120, 120) });
    }
    G.fx.shake(12, 0.4);
    G.fx.burst(this.x, this.y - this.h, ['#ff7a2a', '#ffd35a', '#3a2a24'], 30, 420, { angle: -Math.PI / 2, spread: 0.8 });
    G.audio.play('slam');
  };

  LavaTortoise.prototype.quake = function () {
    const map = G.world.map;
    const gy = this.groundY();
    [-1, 1].forEach((d) => {
      const x0 = this.x + d * this.w * 0.45;
      this.addHz({ type: 'sweep', style: 'lava', x0, x1: d < 0 ? 0 : map.w, x: x0, y: gy, speed: this.phase === 2 ? 600 : 520, hgt: 62, hw: 24, mult: 1.1, delay: 0, src: 'quake', trail: true });
    });
    this.squash = 1;
    G.fx.shake(14, 0.35);
    G.fx.burst(this.x, gy - 6, ['#8a6a50', '#ff9a3a', '#3a2a24'], 30, 380, { angle: -Math.PI / 2, spread: 1.4 });
    G.audio.play('slam');
  };

  LavaTortoise.prototype.draw = function (ctx) {
    const y = this.y;
    if (!this.dead) {
      if (this.state === 'rollPrep' || this.state === 'roll') {
        const k = this.state === 'roll' ? 0.4 : this.prog();
        ctx.fillStyle = 'rgba(255,60,60,' + (0.1 + 0.2 * k).toFixed(3) + ')';
        ctx.fillRect(0, this.groundY() - 8, G.world.map.w, 10);
      }
      if (this.state === 'breathPrep') {
        const k = this.prog();
        const len = this.phase === 2 ? 540 : 440;
        const x1 = this.x + this.dir * this.w * 0.42;
        ctx.fillStyle = 'rgba(255,110,40,' + (0.12 + 0.3 * k).toFixed(3) + ')';
        ctx.fillRect(Math.min(x1, x1 + this.dir * len), y - 8, len, 10);
      }
      if (this.state === 'quakePrep') {
        const k = this.prog();
        ctx.fillStyle = 'rgba(255,90,30,' + (0.1 + 0.22 * k).toFixed(3) + ')';
        ctx.fillRect(0, this.groundY() - 8, G.world.map.w, 10);
      }
      if (this.state === 'meteorPrep' || this.state === 'meteor' || this.state === 'transform') {
        // 天空被火山照紅
        const cam = G.cam;
        ctx.fillStyle = 'rgba(255,70,20,' + (this.state === 'meteor' ? 0.12 : 0.08 * this.prog()).toFixed(3) + ')';
        ctx.fillRect(cam.x - 50, cam.y - 50, G.W + 100, G.H + 100);
      }
      this.drawHz(ctx);
    }
    G.art.drawMonster(ctx, this);
  };

  Object.assign(G.bosses, { hermitCrab: HermitCrab, lavaTortoise: LavaTortoise });
})();
