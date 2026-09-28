// 第四章、終章怪物的能力（v1.1）。設計同 mobabil.js：自然物＋劍與魔法的概念，概念變成行為。
// 規格：docs/SPEC-monsters.md。表現旗標放在 m.fx（美術在 js/art/monsters5.js、monsters6.js）。
// 新增的掛勾：dmgMul(m, dir) → 受到傷害的倍率（dir 是擊退方向，= -m.dir 代表從正面打過來）。
(function () {
  'use strict';
  const U = G.util;
  const AB = G.mobAbil;
  const midY = (m) => m.y - (m.hover || 0) - m.h * (m.scale || 1) * 0.5;
  const near = (m, P, dx, dy) => Math.abs(P.x - m.x) < dx && Math.abs(P.y - m.y) < (dy || 60) && P.climbing < 0;
  const hitIf = (P, box, dmg, fromX) => {
    if (P.alive() && U.overlap(box, P.hitbox())) P.hurt(dmg, fromX);
  };
  const slowP = (P, t, mul) => {
    P.slowT = Math.max(P.slowT || 0, t);
    P.slowMul = Math.min(P.slowMul || 0.55, mul);
  };
  const zone = (o) => {
    const z = Object.assign({ t: 0, visual: true }, o);
    G.world.zones.push(z);
    return z;
  };
  const say = (m, text, color) => G.fx.text(m.x, m.y - (m.hover || 0) - m.h * (m.scale || 1) - 22, text, color, 16, 0.9);
  const inZone = (P, z, dy) => P.alive() && Math.abs(P.x - z.x) < z.r && Math.abs(P.y - z.y) < (dy || 90);
  // 地上的波、殘影、星線……每幀在 tick 裡推進
  const waves = [];
  const echoes = [];
  const lines = [];
  const fields = [];

  // 造一個幻影（鏡像鹿、平行狐）：打一下就碎、不給經驗與掉落
  const illusion = (m, dx, flag) => {
    const [lo, hi] = m.bounds();
    const c = new G.Monster(m.id, m.plat, U.clamp(m.x + dx, lo, hi), { noVariant: true });
    c.isChild = true;
    c.illusion = true;
    c.fx = c.fx || {};
    c.fx[flag] = true;
    c.maxHp = c.hp = 1;
    c.exp = 0;
    c.atk = Math.round(m.atk * 0.5);
    c.aggroT = 4;
    c.lifeT = 9;
    c.hover = m.hover;
    G.world.monsters.push(c);
    G.fx.sparkle(c.x, c.y - c.h * 0.5, flag === 'copy' ? '#bfe8ff' : '#b8a0ff', 10, 40);
    return c;
  };
  const tickIllusion = (m, dt) => {
    if (!m.illusion) return false;
    m.lifeT -= dt;
    if (m.lifeT <= 0 && !m.dead) m.takeDamage(m.hp + 1, 1, 0, false);
    return true;
  };

  // 九尾狐的尾尖（美術座標：原點腳底、面向右；蓄力時尾巴張開的第 3、5、7 條尾巴的尖端）＋ 尾巴的方向
  const FOX_TIPS = [
    [-108, -54, 3.32],
    [-76, -115, 4.06],
    [-10, -129, 4.79],
  ];
  function foxTick(p) {
    // 先往外飄 0.3 秒，之後開始追人並加速到 270。
    // 轉向上限＝側向加速度 600 ÷ 速度（慢的時候轉得快、全速時每秒只轉約 2.2 弧度 → 跑動、跳躍閃得掉）
    const sp = Math.hypot(p.vx, p.vy) || 1;
    const want = p.t < 0.3 ? 80 : Math.min(270, 80 + (p.t - 0.3) * 260);
    p.vx *= want / sp;
    p.vy *= want / sp;
    p.homing = p.t < 0.3 ? 0 : Math.min(6, 600 / want);
  }

  // ── v1.6 通用的「蓄力 → 放招」能力（遠程技能用）──
  // c: { flag, wind, rec, cd:[a,b], cd0:[a,b], range, dy, cond(m,P), start(m,P,st), fire(m,P,st), windTick(m,dt,P,st), noIllusion }
  // 表現旗標：m.fx[flag] 蓄力時 0→1、放招後 1→0；m.attackPhase 'wind' → 'strike' → null。
  const MA = G.mobAtk;
  function cast(name, c) {
    return {
      update(m, dt, P, aggro) {
        if (c.noIllusion !== false && m.illusion) return false;
        const st = m[name + 'St'] || (m[name + 'St'] = { ph: null, t: 0, cd: U.rand(c.cd0[0], c.cd0[1]) });
        if (c.always) c.always(m, dt, P, st);
        if (st.ph === 'wind') {
          if (MA.interrupted(m)) {
            st.ph = null;
            m.fx[c.flag] = 0;
            (st.zs || []).forEach(MA.kill);
            MA.unlock(m, name);
            if (c.cancel) c.cancel(m, st);
            st.cd = U.rand(1, 1.6);
            return false;
          }
          st.t -= dt;
          m.vx = 0;
          m.fx[c.flag] = Math.min(1, 1 - st.t / c.wind);
          if (c.windTick) c.windTick(m, dt, P, st);
          if (st.t <= 0) {
            st.ph = 'rec';
            st.t = c.rec;
            m.attackPhase = 'strike';
            c.fire(m, P, st);
          }
          return true;
        }
        if (st.ph === 'rec') {
          st.t -= dt;
          m.fx[c.flag] = Math.max(0, st.t / c.rec);
          if (c.recTick) {
            // recTick 回傳 true：招式還在進行（例如衝刺中），收招時間先暫停
            if (c.recTick(m, dt, P, st)) {
              st.t = Math.max(st.t, 0.01);
              m.fx[c.flag] = 1;
            }
          } else m.vx = 0;
          if (st.t <= 0) {
            st.ph = null;
            m.fx[c.flag] = 0;
            m.attackPhase = null;
            MA.unlock(m, name);
            if (c.done) c.done(m, st);
          }
          return true;
        }
        st.cd -= dt;
        if (aggro && st.cd <= 0 && !MA.busy(m) && near(m, P, c.range, c.dy || 80) && (!c.cond || c.cond(m, P))) {
          st.cd = U.rand(c.cd[0], c.cd[1]);
          st.ph = 'wind';
          st.t = c.wind;
          st.zs = [];
          m.dir = U.sign(P.x - m.x) || m.dir;
          m.attackPhase = 'wind';
          m.vx = 0;
          MA.lock(m, name);
          c.start(m, P, st);
          return true;
        }
        return false;
      },
      onDie(m) {
        const st = m[name + 'St'];
        if (!st) return;
        (st.zs || []).forEach(MA.kill);
        if (c.cancel) c.cancel(m, st);
        MA.unlock(m, name);
      },
    };
  }
  // 朝玩家身體中心的角度
  const aimAt = (x, y, P) => Math.atan2(P.y - 30 - y, P.x - x);
  // 固定時間後自己淡出的投射物用這個欄位：fade（秒），美術在 js/art/mobfx.js
  const shot = (o) => {
    const p = Object.assign({ t: 0, seed: Math.random() * 6, owner: 'monster', r: 10 }, o);
    G.world.projectiles.push(p);
    return p;
  };
  // 時停蝶的時針：懸空瞄準一段時間後才射出
  function handTick(p) {
    if (p.t < p.hold) {
      const P = G.player;
      if (P.alive()) p.ang = Math.atan2(P.y - 30 - p.y, P.x - p.x);
      p.vx = p.vy = 0;
    } else if (!p.shot) {
      p.shot = true;
      p.vx = Math.cos(p.ang) * p.speed;
      p.vy = Math.sin(p.ang) * p.speed;
      G.audio.play('featherShot');
    }
  }
  // 聖甲蟲的太陽輪：貼著平台滾，滾出平台就熄掉，一路留下焦痕
  function wheelTick(p, d) {
    if (p.gnd) p.base = G.physics.surfaceY(G.world.map, p.gp, p.x); // 起伏的地形：貼著表面滾
    p.y = p.base - p.r;
    p.spin += (p.vx / p.r) * d;
    if (p.x < p.lo || p.x > p.hi) p.life = Math.min(p.life, p.t + 0.05);
    if (Math.abs(p.x - p.lastMark) > 46) {
      p.lastMark = p.x;
      G.world.zones.push({ kind: 'sunscorch', x: p.x, y: p.base, r: 20, t: 0, life: 0.9, visual: true });
    }
  }

  Object.assign(AB, {
    // ═════ 第四章　霜鈴雪峰 ═════
    // 鎌鼬：撲咬後 1 秒，殘影在原地再咬一次
    echo: {
      // 鎌鼬：像一道風刃一樣高速穿過玩家（從這一側掠到另一側），掠過的整段路徑都算傷害；
      // 穿過去之後頓一下，再反向掠回來一次。終點留下殘影，1 秒後再咬一次。
      update(m, dt, P, aggro) {
        const pass = (from) => {
          const [lo, hi] = m.bounds();
          const tx = U.clamp(P.x + m.dir * 150, lo, hi);
          m.lgFrom = from;
          m.lgTo = tx;
          m.lgT = 0;
          m.lgDur = Math.max(0.12, Math.abs(tx - from) / 1500);
          m.lgHit = false;
          m.fx.dash = true;
          m.attackPhase = 'strike';
          G.audio.play('swing');
        };
        if (m.lgWind > 0) {
          m.lgWind -= dt;
          m.vx = 0;
          m.attackPhase = 'wind';
          if (m.lgWind <= 0) {
            m.lgPasses = 2;
            pass(m.x);
          }
          return true;
        }
        if (m.lgDur > 0) {
          const prev = m.x;
          m.lgT += dt;
          const k = Math.min(1, m.lgT / m.lgDur);
          m.x = m.lgFrom + (m.lgTo - m.lgFrom) * k;
          m.vx = 0;
          // 掃過的整段都算：這一幀從 prev 到 m.x 的長條
          const x0 = Math.min(prev, m.x) - 30;
          const w = Math.abs(m.x - prev) + 60;
          if (!m.lgHit && P.alive() && U.overlap({ x: x0, y: m.y - 50, w, h: 50 }, P.hitbox())) {
            m.lgHit = true;
            P.hurt(Math.round(m.atk * 1.1), prev);
          }
          if (k >= 1) {
            m.lgDur = 0;
            m.lgPasses -= 1;
            if (m.lgPasses > 0) {
              // 頓一下，轉身再掠回來
              m.lgPause = 0.35;
              m.fx.dash = false;
              m.attackPhase = 'wind';
            } else {
              m.fx.dash = false;
              m.attackPhase = null;
              const z = zone({ kind: 'echoghost', x: m.x, y: m.y, dir: m.dir, r: 40, life: 1.2, w: m.w, h: m.h });
              echoes.push({ z, dmg: Math.round(m.atk * 0.9), hit: false });
            }
          }
          return true;
        }
        if (m.lgPause > 0) {
          m.lgPause -= dt;
          m.vx = 0;
          if (m.lgPause <= 0) {
            m.dir = U.sign(P.x - m.x) || -m.dir;
            pass(m.x);
          }
          return true;
        }
        m.lgCd = (m.lgCd == null ? U.rand(1, 2) : m.lgCd) - dt;
        if (aggro && m.lgCd <= 0 && near(m, P, 320)) {
          m.lgCd = U.rand(2.8, 3.6);
          m.lgWind = 0.45;
          m.dir = U.sign(P.x - m.x) || m.dir;
          return true;
        }
        return false;
      },
    },
    // 白澤：懸空，施法射出追蹤的水晶光球（射擊本身交給 ranged）
    orbcast: {
      init(m) {
        m.hover = 120;
      },
      update(m, dt) {
        m.hover = 120 + Math.sin(m.t * 2) * 12;
        const casting = m.attackT > 0 && m.attackKind === 'ranged';
        m.fx.cast = casting ? Math.min(1, (m.fx.cast || 0) + dt * 4) : Math.max(0, (m.fx.cast || 0) - dt * 2);
      },
    },
    // 雪男：踢出一顆沿地面滾、越滾越大的雪球
    avalanche: {
      update(m, dt, P, aggro) {
        if (m.kkT > 0) {
          m.kkT -= dt;
          m.vx = 0;
          m.fx.kick = Math.min(1, (0.5 - m.kkT) * 3);
          m.attackPhase = m.kkT > 0.15 ? 'wind' : 'strike';
          if (m.kkT <= 0.15 && !m.kkDone) {
            m.kkDone = true;
            const base = m.y;
            const gnd = m.onGround;
            const gpl = m.plat;
            G.audio.play('swing');
            G.world.projectiles.push({
              kind: 'snowball', x: m.x + m.dir * 30, y: base - 14, vx: m.dir * 250, vy: 0, r: 14, dmg: Math.round(m.atk * 1.2), life: 2.8, t: 0, seed: Math.random() * 6, owner: 'monster',
              onTick(p, d) {
                p.r = Math.min(42, p.r + 12 * d);
                const pf = G.world.map.platforms[gpl];
                p.y = (gnd && pf && p.x >= pf[0] && p.x <= pf[1] ? G.physics.surfaceY(G.world.map, gpl, p.x) : base) - p.r;
              },
            });
          }
          if (m.kkT <= 0) {
            m.attackPhase = null;
            m.fx.kick = 0;
          }
          return true;
        }
        m.kkCd = (m.kkCd == null ? U.rand(1, 2.5) : m.kkCd) - dt;
        if (aggro && m.kkCd <= 0 && near(m, P, 440, 80)) {
          m.kkCd = U.rand(3.2, 4);
          m.kkT = 0.5;
          m.kkDone = false;
          m.dir = U.sign(P.x - m.x) || m.dir;
          return true;
        }
        return false;
      },
    },
    // 雷獸：擂三下鼓，每一下沿地面送出一道符文震波
    drum: {
      update(m, dt, P, aggro) {
        if (m.fx.beat > 0) m.fx.beat = Math.max(0, m.fx.beat - dt * 4);
        if (m.beats > 0) {
          m.vx = 0;
          m.beatT -= dt;
          if (m.beatT <= 0) {
            m.beats--;
            m.beatT = 0.62;
            m.fx.beat = 1;
            G.fx.shake(3, 0.1);
            G.audio.play('heavy');
            const z = zone({ kind: 'runewave', x: m.x, y: m.y, r: 24, life: 0.8 });
            waves.push({ z, dmg: Math.round(m.atk * 1.1), hit: false, speed: 440 });
          }
          return true;
        }
        m.drCd = (m.drCd == null ? U.rand(1.5, 3) : m.drCd) - dt;
        if (aggro && m.drCd <= 0 && m.onGround && near(m, P, 480, 80)) {
          m.drCd = U.rand(4.5, 5.5);
          m.beats = 3;
          m.beatT = 0.35;
          return true;
        }
        return false;
      },
    },
    // 影之芬里爾：影子脫離本體滑到玩家腳下，冒出來咬人並定身
    shadow: {
      update(m, dt, P, aggro) {
        const s = m.shade;
        if (s) {
          m.fx.shadowless = true;
          if (s.z.bite == null) {
            // 貼地滑向玩家
            const dx = P.x - s.z.x;
            s.z.x += U.clamp(dx, -330 * dt, 330 * dt);
            s.t += dt;
            if (Math.abs(dx) < 16 || s.t > 1.7) s.z.bite = 0;
          } else {
            s.z.bite = Math.min(1, s.z.bite + dt * 2.6);
            if (s.z.bite >= 0.6 && !s.hit) {
              s.hit = true;
              G.audio.play('swing');
              if (P.alive() && P.onGround && Math.abs(P.x - s.z.x) < 46 && Math.abs(P.y - s.z.y) < 40) {
                P.hurt(Math.round(m.atk * 1.2), s.z.x);
                slowP(P, 1.1, 0.15);
                G.fx.text(P.x, P.y - 70, '被影子咬住了！', '#b8a0ff', 15, 0.8);
              }
            }
            if (s.z.bite >= 1) {
              s.z.life = s.z.t + 0.2;
              m.shade = null;
              m.fx.shadowless = false;
            }
          }
        }
        m.shCd = (m.shCd == null ? U.rand(2, 3.5) : m.shCd) - dt;
        if (!m.shade && aggro && m.shCd <= 0 && near(m, P, 500, 80)) {
          m.shCd = U.rand(5, 6);
          m.shade = { z: zone({ kind: 'wolfshadow', x: m.x, y: m.y, r: 40, life: 5, dir: m.dir }), t: 0, hit: false };
          G.audio.play('portal');
        }
        return false;
      },
      onDie(m) {
        if (m.shade) m.shade.z.life = 0;
      },
    },
    // 雪女：吐出睡意的寒霧，玩家在霧裡變得很慢
    sleep: {
      update(m, dt, P, aggro) {
        if (m.fx.puff > 0) m.fx.puff = Math.max(0, m.fx.puff - dt * 1.5);
        m.slCd = (m.slCd == null ? U.rand(1, 3) : m.slCd) - dt;
        if (aggro && m.slCd <= 0 && near(m, P, 360, 80)) {
          m.slCd = U.rand(5, 6);
          m.fx.puff = 1;
          G.audio.play('spore');
          fields.push({ z: zone({ kind: 'sleepfog', x: m.x, y: m.y, r: 130, life: 3.6 }), fn: (P2) => slowP(P2, 0.25, 0.42) });
          say(m, '咩～好睏……', '#c8a8ff');
        }
        return false;
      },
    },
    // 九尾封印狐（v1.4 起不再封技能）：身邊浮出三團狐火，蓄力後追著玩家飛過去
    foxfire: {
      update(m, dt, P, aggro) {
        if (m.ffT > 0) {
          m.ffT -= dt;
          m.vx = 0;
          m.fx.aura = Math.min(1, (m.fx.aura || 0) + dt * 2.5);
          m.attackPhase = 'wind';
          if (m.ffT <= 0) {
            m.attackPhase = null;
            m.fx.aura = 0;
            G.audio.play('spiritShot');
            // v1.6：三團狐火從尾尖飛出（身後、上方，扇形張開），先往外飄 0.3 秒，再以有上限的轉向追玩家，最後淡出
            const sc = m.scale || 1;
            const hv = m.hover || 0;
            for (let k = 0; k < 3; k++) {
              const tip = FOX_TIPS[k];
              const x = m.x + m.dir * tip[0] * sc;
              const y = m.y - hv + tip[1] * sc;
              const ox = m.dir * Math.cos(tip[2]);
              const oy = Math.sin(tip[2]);
              G.world.projectiles.push({ kind: 'foxfire', x, y, vx: ox * 80, vy: oy * 80, r: 11, dmg: Math.round(m.atk * 0.8), life: 3.2, fade: 0.45, t: 0, seed: k * 2, owner: 'monster', homing: 0, onTick: foxTick });
              G.fx.burst(x, y, ['#8ff0e8', '#ffffff'], 4, 90);
            }
          }
          return true;
        }
        if ((m.fx.aura || 0) > 0) m.fx.aura = Math.max(0, m.fx.aura - dt * 3);
        m.ffCd = (m.ffCd == null ? U.rand(1.5, 3) : m.ffCd) - dt;
        if (aggro && m.ffCd <= 0 && near(m, P, 460, 160)) {
          m.ffCd = U.rand(3.8, 4.6);
          m.ffT = 0.9;
          m.dir = U.sign(P.x - m.x) || m.dir;
          say(m, '狐火！', '#ffcf6a');
          return true;
        }
        return false;
      },
    },
    // 古松樹靈：心臟規律打開；關著時很硬，打開時很脆
    heart: {
      init(m) {
        m.hcT = U.rand(2, 3.5);
        m.fx.open = 0;
      },
      update(m, dt) {
        m.hcT -= dt;
        if (m.hcT <= 0) {
          m.hcOpen = !m.hcOpen;
          m.hcT = m.hcOpen ? 2.2 : 3.4;
          if (m.hcOpen) say(m, '心核打開了！', '#ff9ab0');
        }
        m.fx.open = m.hcOpen ? Math.min(1, m.fx.open + dt * 4) : Math.max(0, m.fx.open - dt * 4);
        m.fx.beat = Math.max(0, Math.sin(m.t * (m.hcOpen ? 9 : 4)));
      },
      dmgMul(m) {
        return m.fx.open > 0.5 ? 1.5 : 0.2;
      },
    },
    // 狛犬：正面舉盾（只受 30%），盾擊衝撞之後盾放下、露出破綻
    shield: {
      init(m) {
        m.fx.guard = true;
      },
      update(m, dt, P, aggro) {
        if (m.fx.bash > 0 && !(m.bsT > 0)) m.fx.bash = Math.max(0, m.fx.bash - dt * 3);
        if (m.bsWind > 0) {
          m.bsWind -= dt;
          m.vx = 0;
          m.attackPhase = 'wind';
          m.fx.guard = true;
          if (m.bsWind <= 0) {
            m.bsT = 0.6;
            m.bsHit = false;
            m.attackPhase = 'strike';
            G.audio.play('heavy');
          }
          return true;
        }
        if (m.bsT > 0) {
          m.bsT -= dt;
          m.fx.bash = 1;
          m.vx = m.dir * m.def.speed * 4.2;
          if (!m.bsHit && P.alive() && U.overlap({ x: m.x + (m.dir > 0 ? 0 : -70), y: m.y - 90, w: 70, h: 90 }, P.hitbox())) {
            m.bsHit = true;
            P.hurt(Math.round(m.atk * 1.3), m.x);
            P.x += m.dir * 40;
          }
          if (m.bsT <= 0) {
            m.attackPhase = 'recover';
            m.bsRec = 1.1;
            m.fx.guard = false;
          }
          return true;
        }
        if (m.bsRec > 0) {
          m.bsRec -= dt;
          m.vx = 0;
          if (m.bsRec <= 0) {
            m.attackPhase = null;
            m.fx.guard = true;
          }
          return true;
        }
        m.bsCd = (m.bsCd == null ? U.rand(1.5, 3) : m.bsCd) - dt;
        if (aggro && m.bsCd <= 0 && near(m, P, 320, 80)) {
          m.bsCd = U.rand(3.4, 4.2);
          m.bsWind = 0.55;
          m.dir = U.sign(P.x - m.x) || m.dir;
          return true;
        }
        return false;
      },
      dmgMul(m, dir) {
        if (!m.fx.guard || dir !== -m.dir) return 1;
        if (!(m.blockMsg > m.t)) {
          m.blockMsg = m.t + 1.2;
          say(m, '擋住了！繞到背後', '#bfe8ff');
        }
        return 0.3;
      },
    },

    // ═════ 終章　時空間神殿 ═════
    // 時之鳳凰：血第一次掉到 40% 以下時，沙往回流，血回到 3 秒前
    rewind: {
      init(m) {
        m.hover = 130;
        m.hist = [];
        m.histT = 0;
      },
      invuln(m) {
        return m.rwT > 0;
      },
      update(m, dt) {
        m.hover = 130 + Math.sin(m.t * 2.3) * 10;
        m.fx.sand = m.hp / m.maxHp;
        m.histT -= dt;
        if (m.histT <= 0) {
          m.histT = 0.25;
          m.hist.push(m.hp);
          if (m.hist.length > 12) m.hist.shift();
        }
        if (m.rwT > 0) {
          m.rwT -= dt;
          m.vx = 0;
          m.fx.rewind = 1;
          m.hp = Math.min(m.maxHp, m.hp + (m.rwTo - m.rwFrom) * (dt / 1.0));
          if (m.rwT <= 0) {
            m.hp = m.rwTo;
            m.fx.rewind = 0;
          }
          return true;
        }
        if (!m.rwUsed && m.hp < m.maxHp * 0.4 && !m.dead) {
          m.rwUsed = true;
          m.rwT = 1.0;
          m.rwFrom = m.hp;
          m.rwTo = Math.max(m.hp, m.hist[0] || m.hp);
          say(m, '時光倒流！', '#ffd98a');
          G.audio.play('portal');
          G.fx.ring(m.x, midY(m), 'rgba(255,220,140,0.9)', 110, 0.6, 4);
          return true;
        }
        return false;
      },
    },
    // 鏡麒麟：造出一隻鏡像分身（打一下就碎）
    mirror: {
      update(m, dt, P, aggro) {
        if (tickIllusion(m, dt)) return false;
        m.mrCd = (m.mrCd == null ? U.rand(1, 2) : m.mrCd) - dt;
        if (aggro && m.mrCd <= 0 && (!m.copy || m.copy.dead)) {
          m.mrCd = U.rand(7, 8.5);
          m.copy = illusion(m, (Math.random() < 0.5 ? -1 : 1) * 90, 'copy');
          say(m, '鏡像！', '#bfe8ff');
          G.audio.play('portal');
        }
        return false;
      },
      onDie(m) {
        if (m.copy && !m.copy.dead) m.copy.takeDamage(m.copy.hp + 1, 1, 0, false);
        if (m.illusion) G.fx.burst(m.x, m.y - m.h * 0.5, ['#dff4ff', '#9ad8ff', '#ffffff'], 16, 260);
      },
    },
    // 時停蝶：在玩家腳下放出時停領域
    timestop: {
      init(m) {
        m.hover = 110;
      },
      update(m, dt, P, aggro) {
        m.hover = 110 + Math.sin(m.t * 3) * 14;
        if (m.tsT > 0) {
          m.tsT -= dt;
          m.vx = 0;
          m.fx.tick = Math.min(1, (0.7 - m.tsT) / 0.7);
          if (m.tsT <= 0) {
            m.fx.tick = 0;
            fields.push({ z: zone({ kind: 'timefield', x: m.tsX, y: m.tsY, r: 120, life: 3 }), fn: (P2) => slowP(P2, 0.25, 0.22) });
            G.audio.play('bossWarn');
          }
          return true;
        }
        m.tmCd = (m.tmCd == null ? U.rand(1.5, 3) : m.tmCd) - dt;
        if (aggro && m.tmCd <= 0 && near(m, P, 440, 220)) {
          m.tmCd = U.rand(6, 7);
          m.tsT = 0.7;
          m.tsX = P.x;
          m.tsY = P.onGround ? P.y : G.physics.surfaceY(G.world.map, P.plat >= 0 ? P.plat : 0, P.x);
          say(m, '滴答——', '#ffe6a0');
          return true;
        }
        return false;
      },
    },
    // 銜尾蛇：咬住尾巴變成車輪高速滾動（滾動時只受 50%）
    ouro: {
      update(m, dt, P, aggro) {
        if (m.whWind > 0) {
          m.whWind -= dt;
          m.vx = 0;
          m.fx.wheel = true;
          if (m.whWind <= 0) {
            m.whT = 1.7;
            G.audio.play('sweep');
          }
          return true;
        }
        if (m.whT > 0) {
          m.whT -= dt;
          const [lo, hi] = m.bounds();
          if ((m.x <= lo + 2 && m.dir < 0) || (m.x >= hi - 2 && m.dir > 0)) m.dir = -m.dir;
          m.vx = m.dir * m.def.speed * 4.5;
          m.whHit = (m.whHit || 0) - dt;
          if (m.whHit <= 0 && P.alive() && U.overlap(m.hitbox(), P.hitbox())) {
            m.whHit = 0.5;
            P.hurt(Math.round(m.atk * 1.3), m.x);
          }
          if (m.whT <= 0) m.fx.wheel = false;
          return true;
        }
        m.whCd = (m.whCd == null ? U.rand(1.5, 3) : m.whCd) - dt;
        if (aggro && m.whCd <= 0 && near(m, P, 460, 80)) {
          m.whCd = U.rand(4.5, 5.5);
          m.whWind = 0.6;
          m.dir = U.sign(P.x - m.x) || m.dir;
          return true;
        }
        return false;
      },
      dmgMul(m) {
        return m.fx.wheel ? 0.5 : 1;
      },
    },
    // 時之聖甲蟲：替周圍的同伴施加速魔法
    haste: {
      update(m, dt, P, aggro) {
        if (m.gsT > 0) {
          m.gsT -= dt;
          m.vx = 0;
          m.fx.gear = 1;
          if (m.gsT <= 0) {
            m.fx.gear = 0;
            G.fx.ring(m.x, m.y - m.h * 0.5, 'rgba(255,214,120,0.9)', 360, 0.5, 3);
            G.world.monsters.filter((o) => !o.dead && o !== m && Math.abs(o.x - m.x) < 360 && Math.abs(o.y - m.y) < 200).forEach((o) => {
              o.hasteT = 5;
              G.fx.text(o.x, o.y - o.h * (o.scale || 1) - 20, '加速！', '#ffd35a', 14, 0.7);
            });
          }
          return true;
        }
        m.gCd2 = (m.gCd2 == null ? U.rand(2, 4) : m.gCd2) - dt;
        if (aggro && m.gCd2 <= 0) {
          m.gCd2 = U.rand(6.5, 7.5);
          m.gsT = 1.1;
          G.audio.play('portal');
          return true;
        }
        return false;
      },
    },
    // 虛空鯨：潛進次元裂縫消失，從玩家背後的次元門跳出來踢人
    portal: {
      invuln(m) {
        return (m.fx.warp || 0) > 0.6;
      },
      update(m, dt, P, aggro) {
        if (m.wpT > 0) {
          m.wpT -= dt;
          m.vx = 0;
          const k = 1.35 - m.wpT;
          if (k < 0.4) m.fx.warp = k / 0.4;
          else if (!m.wpMoved) {
            m.wpMoved = true;
            const [lo, hi] = m.bounds();
            m.x = U.clamp(m.wpX, lo, hi);
            m.dir = U.sign(P.x - m.x) || m.dir;
            G.audio.play('portal');
          } else if (k < 0.75) m.fx.warp = Math.max(0, 1 - (k - 0.4) / 0.3);
          else {
            m.fx.warp = 0;
            m.attackPhase = 'strike';
            if (!m.wpHit && k > 0.85) {
              m.wpHit = true;
              G.audio.play('swing');
              hitIf(P, { x: m.x + (m.dir > 0 ? 0 : -90), y: m.y - 80, w: 90, h: 80 }, Math.round(m.atk * 1.3), m.x);
            }
          }
          if (m.wpT <= 0) {
            m.attackPhase = null;
            m.fx.warp = 0;
          }
          return true;
        }
        m.wpCd = (m.wpCd == null ? U.rand(1.5, 3) : m.wpCd) - dt;
        if (aggro && m.wpCd <= 0 && near(m, P, 520, 80)) {
          m.wpCd = U.rand(4.5, 5.5);
          m.wpT = 1.35;
          m.wpMoved = false;
          m.wpHit = false;
          m.wpX = P.x - (P.dir || 1) * 80;
          zone({ kind: 'rift', x: m.wpX, y: m.y, r: 40, life: 1.0 });
          return true;
        }
        return false;
      },
    },
    // 重力魔眼：把玩家往自己吸
    gravity: {
      init(m) {
        m.hover = 120;
      },
      update(m, dt, P, aggro) {
        m.hover = 120 + Math.sin(m.t * 1.8) * 14;
        if (m.gpT > 0) {
          m.gpT -= dt;
          m.vx = 0;
          m.fx.pull = true;
          if (P.alive() && Math.abs(P.x - m.x) < 460 && Math.abs(P.y - m.y) < 200) P.x += U.sign(m.x - P.x) * 125 * dt;
          if (m.gpT <= 0) m.fx.pull = false;
          return true;
        }
        m.gpCd = (m.gpCd == null ? U.rand(2, 3.5) : m.gpCd) - dt;
        if (aggro && m.gpCd <= 0 && near(m, P, 460, 200)) {
          m.gpCd = U.rand(5, 6);
          m.gpT = 1.8;
          G.audio.play('portal');
          return true;
        }
        return false;
      },
    },
    // 雙生天馬：分出平行世界的假身；打碎假身，真身會現形（踉蹌、變脆）
    parallel: {
      update(m, dt, P, aggro) {
        if (tickIllusion(m, dt)) return false;
        if (m.exposeT > 0) m.exposeT -= dt;
        m.fx.twin = !!(m.twin && !m.twin.dead);
        m.plCd = (m.plCd == null ? 0.5 : m.plCd) - dt;
        if (aggro && m.plCd <= 0 && !m.fx.twin) {
          m.plCd = U.rand(8, 9);
          m.twin = illusion(m, (Math.random() < 0.5 ? -1 : 1) * 110, 'fake');
          m.twin.parent = m;
          // 真假交換位置，讓人猜
          if (Math.random() < 0.5) {
            const x = m.x;
            m.x = m.twin.x;
            m.twin.x = x;
          }
          say(m, '哪一個是真的？', '#c8b0ff');
        }
        return false;
      },
      onDie(m) {
        if (m.illusion && m.parent && !m.parent.dead) {
          const r = m.parent;
          r.exposeT = 3;
          r.hurtT = 1.2;
          r.vx = 0;
          G.fx.text(r.x, r.y - r.h - 22, '現形了！', '#ffd35a', 16, 0.9);
          G.fx.burst(m.x, m.y - m.h * 0.5, ['#b8a0ff', '#6a5aff', '#ffffff'], 14, 240);
        }
        if (!m.illusion && m.twin && !m.twin.dead) m.twin.takeDamage(m.twin.hp + 1, 1, 0, false);
      },
      dmgMul(m) {
        return m.exposeT > 0 ? 1.5 : 1;
      },
    },
    // 星座魚：灑下星星，再把星星連成線，線會傷人
    constell: {
      init(m) {
        m.hover = 140;
      },
      update(m, dt, P, aggro) {
        m.hover = 140 + Math.sin(m.t * 2) * 12;
        if (m.csT > 0) {
          m.csT -= dt;
          m.vx = 0;
          m.fx.link = Math.min(1, (m.fx.link || 0) + dt * 2);
          if (m.csT <= 0) m.fx.link = 0;
          return true;
        }
        m.csCd = (m.csCd == null ? U.rand(2, 3.5) : m.csCd) - dt;
        if (aggro && m.csCd <= 0 && near(m, P, 520, 260)) {
          m.csCd = U.rand(5.5, 6.5);
          m.csT = 0.8;
          const gy = P.onGround ? P.y : m.y;
          const n = 4;
          const pts = [];
          for (let i = 0; i < n; i++) pts.push({ x: P.x + (i - (n - 1) / 2) * U.rand(80, 110), y: gy - U.rand(10, 90) });
          const stars = pts.map((pt) => {
            const s = { kind: 'star', x: m.x, y: midY(m), vx: 0, vy: 0, r: 10, dmg: 0, life: 3.2, t: 0, seed: Math.random() * 6, owner: 'fx', tx: pt.x, ty: pt.y };
            s.onTick = (p, d) => {
              p.x += (p.tx - p.x) * Math.min(1, d * 6);
              p.y += (p.ty - p.y) * Math.min(1, d * 6);
            };
            G.world.projectiles.push(s);
            return s;
          });
          for (let i = 0; i < n - 1; i++) {
            const z = zone({ kind: 'starline', x: (pts[i].x + pts[i + 1].x) / 2, y: gy, x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y, r: 60, life: 2.4 });
            lines.push({ z, dmg: Math.round(m.atk * 1.0), hit: false });
          }
          G.audio.play('bossWarn');
          void stars;
          return true;
        }
        return false;
      },
    },

    // ═════ v1.6：第四章、終章補上的技能攻擊 ═════
    // 雪女：抽出髮上的冰簪，一次擲出三根（窄扇形）。預警：0.7 秒蓄力（fx.pin）＋手邊的冰光
    icepin: cast('icepin', {
      flag: 'pin', wind: 0.7, rec: 0.35, cd0: [1.5, 3], cd: [3.6, 4.6], range: 430, dy: 120,
      start(m, P, st) {
        st.hx = m.x + m.dir * 22;
        st.hy = m.y - m.h * (m.scale || 1) * 0.78;
        st.zs.push(MA.charge(st.hx, st.hy, 26, 0.7, '190,235,255'));
        say(m, '冰簪！', '#bfe8ff');
      },
      fire(m, P, st) {
        const a0 = aimAt(st.hx, st.hy, P);
        for (let i = -1; i <= 1; i++) {
          const a = a0 + i * 0.13;
          shot({ kind: 'icepin', x: st.hx, y: st.hy, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, r: 8, dmg: Math.round(m.atk * 0.7), life: 1.5, fade: 0.2, slow: 0.6 });
        }
        G.audio.play('featherShot');
      },
    }),
    // 時之鳳凰（朱雀）：張開雙翼，扇形灑出火焰羽與時之沙羽。預警：0.8 秒展翼（fx.wings）＋身上的火光
    phoenixfan: cast('phoenixfan', {
      flag: 'wings', wind: 0.8, rec: 0.45, cd0: [2, 3.5], cd: [4.6, 5.6], range: 440, dy: 260,
      start(m, P, st) {
        st.zs.push(MA.charge(m.x, midY(m), 46, 0.8, '255,150,70'));
        say(m, '朱雀之羽！', '#ffb35a');
        G.audio.play('fire');
      },
      fire(m, P, st) {
        const y = midY(m);
        const a0 = aimAt(m.x, y, P);
        for (let i = -2; i <= 2; i++) {
          const a = a0 + i * 0.2;
          shot({ kind: 'flamefeather', x: m.x + Math.cos(a) * 20, y: y + Math.sin(a) * 20, vx: Math.cos(a) * 290, vy: Math.sin(a) * 290, r: 9, dmg: Math.round(m.atk * 0.7), life: 1.9, fade: 0.3, sand: i % 2 !== 0 });
        }
        G.fx.burst(m.x, y, ['#ffd35a', '#ff7a2a', '#fff2c0'], 14, 260);
        G.audio.play('sweep');
      },
    }),
    // 鏡麒麟：角上聚光，射出一道斜斜的稜鏡光束。預警：0.8 秒細線瞄準（fx.horn；光束線在瞄準那一刻就固定）
    prism: cast('prism', {
      flag: 'horn', wind: 0.8, rec: 0.4, cd0: [2, 3.5], cd: [4.2, 5.2], range: 420, dy: 120,
      start(m, P, st) {
        const sc = m.scale || 1;
        st.x1 = m.x + m.dir * m.w * sc * 0.4;
        st.y1 = m.y - m.h * sc * 0.9;
        let a = aimAt(st.x1, st.y1, P);
        // 只往前方射（不往背後）
        if (m.dir > 0) a = U.clamp(a, -0.9, 0.9);
        else a = a > 0 ? U.clamp(a, Math.PI - 0.9, Math.PI) : U.clamp(a, -Math.PI, -Math.PI + 0.9);
        let len = 420;
        // 打到地面就停
        if (Math.sin(a) > 0.01) len = Math.min(len, (m.y - st.y1) / Math.sin(a));
        st.x2 = st.x1 + Math.cos(a) * len;
        st.y2 = st.y1 + Math.sin(a) * len;
        st.beam = { kind: 'prismbeam', x: (st.x1 + st.x2) / 2, y: m.y, x1: st.x1, y1: st.y1, x2: st.x2, y2: st.y2, r: 210, t: 0, life: 1.1, fire: 0.8, visual: true };
        G.world.zones.push(st.beam);
        st.zs.push(st.beam);
        G.audio.play('charge');
      },
      fire(m, P, st) {
        G.audio.play('thunder');
        G.fx.shake(3, 0.1);
        st.beamHit = false;
      },
      // 光束亮著的前 0.15 秒有傷害
      recTick(m, dt, P, st) {
        m.vx = 0;
        if (!st.beamHit && st.t > 0.4 - 0.15 && P.alive() && MA.segDist(P.x, P.y - 30, st.x1, st.y1, st.x2, st.y2) < 30) {
          st.beamHit = true;
          P.hurt(Math.round(m.atk * 1.3), m.x);
        }
        return false;
      },
    }),
    // 時停蝶：身邊浮出三根時針，停在空中瞄準玩家（0.6～0.9 秒），然後依序射出。預警：時針懸停＋瞄準線（fx.hands）
    clockhand: cast('clockhand', {
      flag: 'hands', wind: 0.6, rec: 0.5, cd0: [1.5, 3], cd: [4.2, 5.2], range: 440, dy: 240,
      start(m, P, st) {
        const y = midY(m);
        say(m, '指針——', '#ffe6a0');
        G.audio.play('ui');
        for (let k = 0; k < 3; k++) {
          const a = -Math.PI / 2 + (k - 1) * 0.9;
          shot({ kind: 'clockhand', x: m.x + Math.cos(a) * 75, y: y + Math.sin(a) * 60, vx: 0, vy: 0, r: 9, dmg: Math.round(m.atk * 0.75), hold: 0.6 + k * 0.15, speed: 430, ang: 0, shot: false, life: 0.6 + k * 0.15 + 1.3, fade: 0.2, onTick: handTick });
        }
      },
      fire() {},
    }),
    // 銜尾蛇的毒牙撲咬：用通用 strike（資料在 mobs45.js），這裡不用另外寫
    // 時之聖甲蟲：把背上的太陽盤推出去，變成貼地滾動、會燒人的太陽輪。預警：0.8 秒推盤（fx.disc）＋盤上的光＋地上的預警帶
    sundisc: cast('sundisc', {
      flag: 'disc', wind: 0.8, rec: 0.5, cd0: [1.5, 3], cd: [4.2, 5.2], range: 480, dy: 60,
      cond: (m) => m.onGround,
      always(m, dt) {
        if (m.discT > 0) {
          m.discT -= dt;
          m.fx.discOut = m.discT > 0;
        }
      },
      start(m, P, st) {
        const sc = m.scale || 1;
        st.zs.push(MA.charge(m.x + m.dir * 30 * sc, m.y - 44 * sc, 34, 0.8, '255,210,90'));
        const [lo, hi] = m.bounds();
        const hw = m.halfW || 0;
        const end = m.dir > 0 ? Math.min(hi + hw, m.x + 520) : Math.max(lo - hw, m.x - 520);
        st.zs.push(MA.warn(m.x + m.dir * 30, end, m.y, 0.8, '255,190,70', 44));
        G.audio.play('charge');
      },
      fire(m, P, st) {
        const [lo, hi] = m.bounds();
        const hw = m.halfW || 0;
        shot({ kind: 'sunwheel', x: m.x + m.dir * 40, y: m.y - 26, base: m.y, gnd: m.onGround, gp: m.plat, vx: m.dir * 270, vy: 0, r: 26, dmg: Math.round(m.atk * 1.3), life: 2.2, fade: 0.25, spin: 0, lo: lo - hw, hi: hi + hw, lastMark: m.x, onTick: wheelTick });
        m.discT = 2.2;
        m.fx.discOut = true;
        G.audio.play('fire');
        G.fx.burst(m.x + m.dir * 40, m.y - 22, ['#ffd35a', '#ff9a3a', '#ffffff'], 10, 200);
      },
    }),
    // 雙生天馬：自己和鏡像的分身各站玩家一邊（以玩家為中心對稱），蓄力後同時衝過來交錯而過，蹄印是會燙人的星光。
    // 預警：0.8 秒揚蹄（fx.gallop 0→1）＋兩匹馬之間的地上星光預警帶；衝刺時 fx.charging = true。
    twincharge: cast('twincharge', {
      flag: 'gallop', wind: 0.8, rec: 0.9, cd0: [2, 3], cd: [6, 7], range: 360, dy: 60,
      cond: (m, P) => m.onGround && P.onGround && Math.abs(P.x - m.x) > 90,
      start(m, P, st) {
        // 分身：以玩家為中心的鏡像位置（分身是幻影，只要夾在平台上就好，不受本體的活動範圍限制）
        const pf = G.world.map.platforms[m.plat];
        const lo = pf[0] + 30;
        const hi = pf[1] - 30;
        st.ax = m.x;
        st.bx = U.clamp(2 * P.x - m.x, lo, hi);
        if (Math.abs(st.bx - P.x) < 80) st.bx = U.clamp(P.x + U.sign(P.x - m.x) * 160, lo, hi);
        st.y = m.y;
        st.ghost = { kind: 'twinghost', x: st.bx, y: G.physics.surfaceY(G.world.map, m.plat, st.bx), r: 50, t: 0, life: 3, dir: -m.dir, src: m, visual: true, k: 0 };
        G.world.zones.push(st.ghost);
        st.zs.push(st.ghost);
        const lane = MA.warn(st.ax, st.bx, m.y, 0.8, '200,170,255', 70);
        lane.dir = 0; // 兩匹馬對衝，不畫單一方向的箭頭
        st.zs.push(lane);
        st.hitA = st.hitB = st.hitP = false;
        say(m, '雙星衝鋒！', '#e0c8ff');
        G.fx.sparkle(st.bx, m.y - 40, '#d8c8ff', 12, 40);
        G.audio.play('portal');
      },
      windTick(m, dt, P, st) {
        st.ghost.k = m.fx.gallop;
      },
      fire(m, P, st) {
        st.run = 0;
        st.dist = Math.abs(st.bx - st.ax);
        st.lastA = st.ax;
        st.lastB = st.bx;
        m.fx.charging = true;
        st.ghost.charging = true;
        st.ghost.life = st.ghost.t + 1.4;
        G.audio.play('charge');
      },
      recTick(m, dt, P, st) {
        if (!m.fx.charging) {
          m.vx = 0;
          return false;
        }
        const sp = 720;
        st.run += sp * dt;
        const k = Math.min(1, st.run / (st.dist + 60));
        const s = U.sign(st.bx - st.ax) || m.dir;
        const [lo, hi] = m.bounds();
        m.dir = s;
        m.x = U.clamp(st.ax + s * st.run, lo, hi);
        m.vx = 0;
        st.ghost.x = st.bx - s * st.run;
        st.ghost.dir = -s;
        st.ghost.y = G.physics.surfaceY(G.world.map, m.plat, st.ghost.x);
        // 衝撞（本體、分身各打一次）＋星光蹄印
        const hb = P.hitbox();
        if (!st.hitA && P.alive() && U.overlap({ x: m.x - 40, y: m.y - 64, w: 80, h: 64 }, hb)) {
          st.hitA = true;
          P.hurt(Math.round(m.atk * 1.2), m.x);
        }
        if (!st.hitB && P.alive() && U.overlap({ x: st.ghost.x - 40, y: st.ghost.y - 64, w: 80, h: 64 }, hb)) {
          st.hitB = true;
          P.hurt(Math.round(m.atk * 1.2), st.ghost.x);
        }
        for (const w of ['A', 'B']) {
          const x = w === 'A' ? m.x : st.ghost.x;
          if (Math.abs(x - st['last' + w]) > 44) {
            st['last' + w] = x;
            const z = { kind: 'hoofstar', x, y: w === 'A' ? m.y : st.ghost.y, r: 18, t: 0, life: 1.1, visual: true, seed: Math.random() * 6 };
            G.world.zones.push(z);
            st.zs.push(z);
          }
        }
        // 蹄印燙腳：踩在剛留下的蹄印上（整招只燙一次）
        if (!st.hitP && P.alive() && P.onGround && Math.abs(P.y - st.y) < 60) {
          for (const z of st.zs) {
            if (z.kind === 'hoofstar' && z.t > 0.15 && z.t < z.life && Math.abs(P.x - z.x) < 20) {
              st.hitP = true;
              P.hurt(Math.round(m.atk * 0.35), z.x, { noKnock: true });
              break;
            }
          }
        }
        if (k >= 1) {
          m.fx.charging = false;
          st.ghost.charging = false;
          st.ghost.life = st.ghost.t + 0.35;
          G.fx.burst(m.x, m.y - 30, ['#ffffff', '#d8c8ff', '#ffe6a0'], 10, 200);
          st.t = 0.4;
          return false;
        }
        return true;
      },
      cancel(m) {
        m.fx.charging = false;
      },
    }),
    // 星座魚：嘴裡聚起一顆星，吐出會追人的星星（轉向有上限、會淡出）。預警：0.6 秒（fx.spit）＋嘴邊的星光
    starspit: cast('starspit', {
      flag: 'spit', wind: 0.6, rec: 0.35, cd0: [3, 4.5], cd: [4.2, 5.2], range: 500, dy: 280,
      start(m, P, st) {
        const sc = m.scale || 1;
        st.hx = m.x + m.dir * m.w * sc * 0.42;
        st.hy = midY(m);
        st.zs.push(MA.charge(st.hx, st.hy, 30, 0.6, '255,236,150'));
        G.audio.play('charge');
      },
      fire(m, P, st) {
        const a = aimAt(st.hx, st.hy, P);
        shot({ kind: 'homingstar', x: st.hx, y: st.hy, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 13, dmg: Math.round(m.atk * 1.1), life: 3.2, fade: 0.4, homing: 1.5 });
        G.audio.play('spiritShot');
      },
    }),
  });

  // 每幀推進：地面波、殘影、星線、領域
  const baseTick = AB.tick;
  const baseReset = AB.reset;
  AB.tick = function (dt) {
    baseTick.call(AB, dt);
    const P = G.player;
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.z.r += w.speed * dt;
      if (!w.hit && P.alive() && P.onGround && Math.abs(P.y - w.z.y) < 30 && Math.abs(Math.abs(P.x - w.z.x) - w.z.r) < 26) {
        w.hit = true;
        P.hurt(w.dmg, w.z.x);
      }
      if (w.z.t >= w.z.life) waves.splice(i, 1);
    }
    for (let i = echoes.length - 1; i >= 0; i--) {
      const e = echoes[i];
      if (!e.hit && e.z.t >= 1.0) {
        e.hit = true;
        G.audio.play('swing');
        hitIf(P, { x: e.z.x - 40 + e.z.dir * 20, y: e.z.y - 50, w: 80, h: 50 }, e.dmg, e.z.x);
      }
      if (e.z.t >= e.z.life) echoes.splice(i, 1);
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      const z = l.z;
      if (!l.hit && z.t > z.life - 0.4 && P.alive()) {
        // 玩家身體中心到線段的距離
        const px = P.x;
        const py = P.y - 30;
        const vx = z.x2 - z.x1;
        const vy = z.y2 - z.y1;
        const k = U.clamp(((px - z.x1) * vx + (py - z.y1) * vy) / (vx * vx + vy * vy || 1), 0, 1);
        if (U.dist(px, py, z.x1 + vx * k, z.y1 + vy * k) < 34) {
          l.hit = true;
          P.hurt(l.dmg, z.x);
        }
      }
      if (z.t >= z.life) lines.splice(i, 1);
    }
    for (let i = fields.length - 1; i >= 0; i--) {
      const f = fields[i];
      if (inZone(P, f.z)) f.fn(P);
      if (f.z.t >= f.z.life) fields.splice(i, 1);
    }
    for (const m of G.world.monsters) if (m.hasteT > 0) m.hasteT -= dt;
  };
  AB.reset = function () {
    baseReset.call(AB);
    waves.length = echoes.length = lines.length = fields.length = 0;
  };

  // 傷害倍率掛勾
  G.mobAbilHooks.dmgMul = function (m, dir) {
    let k = 1;
    for (const a in m.abil) if (AB[a] && AB[a].dmgMul) k *= AB[a].dmgMul(m, dir);
    return k;
  };
})();
