// 打擊感、爽感、沉浸感（在 world.js 之後載入）：
//   · 怪物材質（決定命中聲、碎屑顏色）
//   · 命中：材質命中聲（強度分級）、目標本身的後仰（往被打的方向）、沿攻擊方向噴的小碎屑
//   · 擊殺：擊殺聲、碎屑＋靈魂光點、經驗值光點飛向玩家（收進去時「叮」一聲）、小小的連殺數
//   · 沉浸：每張地圖的環境音、腳步聲（依地面材質）、爬繩聲
// 不加任何全畫面閃光或震動。
(function () {
  'use strict';
  const U = G.util;
  const A = G.audio;

  // ── 材質對照表：先看怪物 id，再看美術 id（借用美術的新怪也看自己的 id），都沒有就是 flesh ──
  const MAT_ID = {
    // 第一章
    dewsnail: 'shell', capshroom: 'plant', seedling: 'plant', mosssnail: 'flesh', spotshroom: 'flesh', sproutling: 'flesh',
    woodsnail: 'plant', lampshroom: 'shell', flowerling: 'plant', queenShroom: 'plant', fb_shroom: 'flesh',
    // 第二章
    sandcrab: 'shell', bubblejelly: 'slime', gullchick: 'flesh', shellcrab: 'shell', lanternjelly: 'slime', wavegull: 'flesh',
    coralcrab: 'shell', moonjelly: 'slime', albatross: 'flesh', hermitCrab: 'shell', postcrab: 'shell', bulbjelly: 'ghost',
    umbrellagull: 'flesh', alarmurchin: 'shell', kiteray: 'slime', blockcoral: 'shell', stampstar: 'shell', accordioneel: 'slime',
    musicturtle: 'shell', fb_kraken: 'slime',
    // 第三章
    flamelizard: 'flesh', pebble: 'rock', springmonkey: 'flesh', moltenlizard: 'flesh', rockling: 'rock', redmonkey: 'flesh',
    fireiguana: 'flesh', springstatue: 'rock', mandrill: 'flesh', lavaTortoise: 'rock', matchlizard: 'flesh', angerrock: 'rock',
    magnetdillo: 'metal', candlesnake: 'flesh', weightbeetle: 'shell', bellowsbat: 'flesh', potgoat: 'metal', moodchameleon: 'flesh',
    mapvulture: 'flesh', fb_balrog: 'rock',
    // 第四章
    echoferret: 'flesh', crystalowl: 'ice', avalanchehare: 'flesh', drumyak: 'flesh', shadowwolf: 'ghost', dreamsheep: 'ice',
    silencefox: 'ghost', heartcedar: 'plant', shieldbear: 'metal', frostSpirit: 'ice', fb_zakum: 'ice',
    // 終章
    hourowl: 'ghost', mirrordeer: 'ice', stopmoth: 'ghost', ouroboros: 'flesh', clocksnail: 'metal', pouchroo: 'ghost',
    gravjelly: 'slime', parallelfox: 'ghost', constellfish: 'ghost', timeItself: 'ghost', fb_voiddragon: 'ghost',
  };
  const MAT_ART = { snail: 'shell', mushroom: 'plant', sprite: 'plant', barkturtle: 'plant', crab: 'shell', jelly: 'slime', rock: 'rock', lizard: 'flesh', monkey: 'flesh', gull: 'flesh', queen: 'plant' };
  // 碎屑顏色：[碎片, 碎片, 亮點]；wisp：死亡時往上飄的靈魂光點顏色
  const DEBRIS = {
    flesh: { c: ['#fff4e0', '#f2d2b0', '#ffffff'], shape: 'circle', grav: 300, drag: 3, wisp: 'rgba(255,248,220,0.8)' },
    shell: { c: ['#f0a070', '#d86a4a', '#fff0d8'], shape: 'square', grav: 900, drag: 0, wisp: 'rgba(255,236,210,0.75)' },
    rock: { c: ['#9a8a7a', '#6e625a', '#c8b8a0'], shape: 'square', grav: 1100, drag: 0, wisp: 'rgba(255,220,180,0.6)' },
    metal: { c: ['#fff2b0', '#ffd060', '#c8d4e6'], shape: 'square', grav: 700, drag: 1, wisp: 'rgba(230,236,255,0.75)' },
    ice: { c: ['#dff6ff', '#9fdcff', '#ffffff'], shape: 'square', grav: 800, drag: 0, wisp: 'rgba(210,240,255,0.85)' },
    ghost: { c: ['#d8c8ff', '#a888ff', '#ffffff'], shape: 'circle', grav: -80, drag: 2.5, wisp: 'rgba(200,180,255,0.85)' },
    plant: { c: ['#a8e070', '#6cbc4a', '#f0ffd0'], shape: 'circle', grav: 260, drag: 2.5, wisp: 'rgba(230,255,200,0.8)' },
    slime: { c: ['#bdefff', '#7fd6f0', '#ffffff'], shape: 'circle', grav: 900, drag: 0.5, wisp: 'rgba(220,250,255,0.8)' },
  };
  // 地面材質（腳步聲）：先看地圖主題，再看章節
  const GROUND_THEME = { rootCave: 'grass', queenHall: 'stone', shipwreck: 'wood', hotspringCamp: 'stone', frostAltar: 'stone', bellShrine: 'stone' };
  const GROUND_REGION = { 1: 'grass', 2: 'sand', 3: 'stone', 4: 'snow', 5: 'marble' };

  // 經驗值光點：固定大小的物件池（不在每幀配置記憶體）
  const ORB_MAX = 48;
  const orbs = [];
  for (let i = 0; i < ORB_MAX; i++) orbs.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, i: 0, s: 1 });

  const F = (G.feel = {
    DEBRIS,
    MAT_ID,
    streak: 0,
    streakT: 0,
    streakPop: 0,
    stepT: 0,
    ropeT: 0,
    lastMap: null,

    matOf(m) {
      if (!m) return 'flesh';
      if (m._mat) return m._mat;
      const d = m.def || {};
      const id = m.id || d.id;
      let mat = MAT_ID[id] || MAT_ID[d.art] || MAT_ART[d.art];
      if (!mat && d.fallback) mat = MAT_ID[d.fallback[0]] || MAT_ART[d.fallback[0]];
      mat = mat || 'flesh';
      m._mat = mat;
      return mat;
    },

    groundKind() {
      const map = G.world && G.world.map;
      if (!map) return 'grass';
      return GROUND_THEME[map.theme] || GROUND_REGION[map.region] || 'grass';
    },

    pan(x) {
      if (!G.cam) return 0;
      return ((x - (G.cam.x + G.W / 2)) / (G.W / 2)) * 0.6;
    },

    // combat.hitMonster 呼叫：tier 0 普攻、1 技能、2 暴擊、3 重擊、4 最後一擊
    onHit(m, tier, opts, dir, killed) {
      const mat = this.matOf(m);
      A.hit(mat, tier, opts.sound, this.pan(m.x));
      // 目標本身的反應：往被打的方向後仰（Boss 幅度小）
      m.rcl = tier >= 2 ? 1 : 0.75;
      m.rclDir = dir || 1;
      // 沿攻擊方向噴出的小碎屑（材質顏色，不發光）
      const D = DEBRIS[mat];
      const cy = m.y - m.h * (m.scale || 1) * 0.5 - (m.hover || 0);
      const n = tier >= 2 ? 5 : 3;
      G.fx.burst(m.x - dir * 6, cy, D.c, n, tier >= 2 ? 420 : 320, {
        angle: dir > 0 ? -0.35 : Math.PI + 0.35, spread: 0.55, life: 0.35, size: tier >= 2 ? 5 : 4, shape: D.shape, grav: Math.max(300, D.grav), drag: D.drag,
      });
    },

    // monster.die 呼叫
    onKill(m) {
      const mat = this.matOf(m);
      const rank = m.fieldBoss || m.isBoss ? 2 : m.elite || m.shiny ? 1 : 0;
      if (!m.illusion) {
        this.streak = this.streakT > 0 ? this.streak + 1 : 1;
        this.streakT = 3.2;
        this.streakPop = 1;
      }
      A.kill(mat, rank, this.pan(m.x), this.streak);
      const D = DEBRIS[mat];
      const sc = m.scale || 1;
      const cy = m.y - m.h * sc * 0.5 - (m.hover || 0);
      const big = Math.min(2.2, Math.max(0.8, (m.w * sc) / 60));
      G.fx.burst(m.x, cy, D.c, Math.round(8 * big) + rank * 4, 300 + 60 * big, { life: 0.5, size: 5, shape: D.shape, grav: D.grav, drag: D.drag, up: 120 });
      // 靈魂光點：兩三顆慢慢往上飄
      const nw = G.lowFx ? 1 : 2 + rank;
      for (let i = 0; i < nw; i++) {
        G.fx.particles.push({ x: m.x + U.rand(-12, 12), y: cy + U.rand(-8, 8), vx: U.rand(-18, 18), vy: U.rand(-90, -50), life: U.rand(0.5, 0.8), t: 0, size: U.rand(3, 5), color: D.wisp, grav: -40, shape: 'circle', drag: 1.5 });
      }
      // 經驗值光點（純視覺；等級已滿就不噴）
      if (!m.illusion && G.player && G.player.level < G.data.balance.levelCap) this.spawnOrbs(m.x, cy, rank === 2 ? 10 : rank === 1 ? 6 : 3 + (Math.random() < 0.5 ? 1 : 0));
    },

    onBossKill(b) {
      const mat = this.matOf(b);
      A.kill(mat, 2, this.pan(b.x), this.streak);
      if (G.player && G.player.level < G.data.balance.levelCap) this.spawnOrbs(b.x, b.y - b.h * 0.5, 14);
    },

    spawnOrbs(x, y, n) {
      if (G.lowFx) n = Math.ceil(n * 0.6);
      let k = 0;
      for (let i = 0; i < ORB_MAX && k < n; i++) {
        const o = orbs[i];
        if (o.on) continue;
        const a = -Math.PI / 2 + U.rand(-1.1, 1.1);
        const s = U.rand(160, 300);
        o.on = true;
        o.x = x + U.rand(-8, 8);
        o.y = y + U.rand(-8, 8);
        o.vx = Math.cos(a) * s;
        o.vy = Math.sin(a) * s;
        o.t = -k * 0.03;
        o.i = k;
        o.s = U.rand(0.8, 1.2);
        k++;
      }
    },

    // 每幀（fx.update 的最後）
    update(dt) {
      const W = G.world;
      const play = G.scene === 'play' && W && W.map;
      // 環境音
      if (A.ctx && A.amb) {
        if (play) {
          if (W.map !== this.lastMap) {
            this.lastMap = W.map;
            this.streak = 0;
            this.streakT = 0;
            this.clearOrbs();
          }
          const sc = A.amb.THEME[W.map.theme] || A.amb.REGION[W.map.region] || null;
          A.amb.set(sc);
          const cut = G.cut && G.cut.active && G.cut.active();
          const menu = G.ui && G.ui.blocking && G.ui.blocking();
          A.amb.update(dt, (cut ? 0.45 : menu ? 0.6 : 1) * (W.map.type === 'boss' ? 0.6 : 1));
        } else {
          A.amb.update(dt, 0);
        }
      }
      if (!play) return;
      const frozen = G.fx.hitstop > 0;
      // 目標後仰：命中停頓時停在最大的那一格
      if (!frozen) {
        const ms = W.monsters;
        for (let i = 0; i < ms.length; i++) if (ms[i].rcl > 0) ms[i].rcl = Math.max(0, ms[i].rcl - dt * 6.5);
        if (W.boss && W.boss.rcl > 0) W.boss.rcl = Math.max(0, W.boss.rcl - dt * 6.5);
      }
      if (W.boss && W.boss.dead && !W.boss._feelK) {
        W.boss._feelK = true;
        this.onBossKill(W.boss);
      }
      if (this.streakT > 0) {
        this.streakT -= dt;
        if (this.streakT <= 0) this.streak = 0;
      }
      if (this.streakPop > 0) this.streakPop = Math.max(0, this.streakPop - dt * 5);
      this.updateOrbs(dt);
      this.updateSteps(dt);
    },

    clearOrbs() {
      for (let i = 0; i < ORB_MAX; i++) orbs[i].on = false;
    },

    updateOrbs(dt) {
      const P = G.player;
      if (!P) return;
      const px = P.x;
      const py = P.y - 30;
      for (let i = 0; i < ORB_MAX; i++) {
        const o = orbs[i];
        if (!o.on) continue;
        o.t += dt;
        if (o.t < 0) continue;
        if (o.t < 0.28) {
          // 先往外噴開、減速
          o.vy += 500 * dt;
          o.vx *= 1 - 4 * dt;
          o.vy *= 1 - 3 * dt;
        } else {
          // 再被吸向玩家（越來越快）
          const dx = px - o.x;
          const dy = py - o.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const sp = 380 + (o.t - 0.28) * 1600;
          const k = Math.min(1, dt * 10);
          o.vx += ((dx / d) * sp - o.vx) * k;
          o.vy += ((dy / d) * sp - o.vy) * k;
          if (d < 20 || o.t > 1.8) {
            o.on = false;
            A.orbTick(o.i);
            continue;
          }
        }
        o.x += o.vx * dt;
        o.y += o.vy * dt;
      }
    },

    updateSteps(dt) {
      const P = G.player;
      if (!P || P.dead || (G.cut && G.cut.active && G.cut.active())) return;
      if (G.ui && G.ui.blocking && G.ui.blocking()) return;
      if (P.climbing >= 0) {
        // 爬繩：有在動才有聲音
        const ca = P.climbAnim || 0;
        if (ca !== this.ropeA) {
          this.ropeA = ca;
          this.ropeT -= dt;
          if (this.ropeT <= 0) {
            this.ropeT = 0.34;
            A.creak();
          }
        }
        return;
      }
      const sp = Math.abs(P.vx || 0);
      if (!P.onGround || sp < 60) {
        this.stepT = Math.min(this.stepT, 0.08);
        return;
      }
      this.stepT -= dt * Math.min(1.6, sp / 220);
      if (this.stepT <= 0) {
        this.stepT = 0.3;
        A.step(this.groundKind(), 1);
      }
    },

    // 畫在世界座標（fx.drawWorld 的最後）
    drawWorld(ctx) {
      let any = false;
      for (let i = 0; i < ORB_MAX; i++) if (orbs[i].on && orbs[i].t >= 0) {
        any = true;
        break;
      }
      if (any) {
        const TAU = Math.PI * 2;
        // 外圈淡淡的暈（一般混色、低透明度，不是加亮）
        ctx.fillStyle = 'rgba(255,236,140,0.28)';
        ctx.beginPath();
        for (let i = 0; i < ORB_MAX; i++) {
          const o = orbs[i];
          if (!o.on || o.t < 0) continue;
          ctx.moveTo(o.x + 7 * o.s, o.y);
          ctx.arc(o.x, o.y, 7 * o.s, 0, TAU);
        }
        ctx.fill();
        ctx.fillStyle = '#fff3a0';
        ctx.strokeStyle = 'rgba(150,100,10,0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < ORB_MAX; i++) {
          const o = orbs[i];
          if (!o.on || o.t < 0) continue;
          ctx.moveTo(o.x + 3.4 * o.s, o.y);
          ctx.arc(o.x, o.y, 3.4 * o.s, 0, TAU);
        }
        ctx.fill();
        ctx.stroke();
      }
      // 連殺數：5 連殺以上才出現，小小的在頭上
      const P = G.player;
      if (this.streak >= 5 && this.streakT > 0 && P) {
        const a = Math.min(1, this.streakT / 0.6);
        const pop = 1 + this.streakPop * 0.35;
        const big = this.streak % 10 === 0;
        ctx.globalAlpha = a;
        ctx.font = 'bold ' + Math.round((big ? 19 : 16) * pop) + 'px ' + G.art.FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(40,20,10,0.85)';
        const s = this.streak + ' 連殺';
        const y = P.y - 128;
        ctx.strokeText(s, P.x, y);
        ctx.fillStyle = big ? '#ffd84a' : '#fff1c8';
        ctx.fillText(s, P.x, y);
        ctx.globalAlpha = 1;
      }
    },

    orbCount() {
      let n = 0;
      for (let i = 0; i < ORB_MAX; i++) if (orbs[i].on) n++;
      return n;
    },
  });
})();
