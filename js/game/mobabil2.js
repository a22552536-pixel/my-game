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

  Object.assign(AB, {
    // ═════ 第四章　霜鈴雪峰 ═════
    // 殘影雪貂：撲咬後 1 秒，殘影在原地再咬一次
    echo: {
      update(m, dt, P, aggro) {
        if (m.lgWind > 0) {
          m.lgWind -= dt;
          m.vx = 0;
          m.attackPhase = 'wind';
          if (m.lgWind <= 0) {
            m.attackPhase = 'strike';
            m.lgT = 0.28;
            m.lgHit = false;
            m.fx.dash = true;
            m.lgX = m.x;
            G.audio.play('swing');
          }
          return true;
        }
        if (m.lgT > 0) {
          m.lgT -= dt;
          m.vx = m.dir * m.def.speed * 6;
          if (!m.lgHit && P.alive() && U.overlap({ x: m.x - 34, y: m.y - 50, w: 68, h: 50 }, P.hitbox())) {
            m.lgHit = true;
            P.hurt(Math.round(m.atk * 1.1), m.x);
          }
          if (m.lgT <= 0) {
            m.fx.dash = false;
            m.attackPhase = null;
            // 殘影留在撲擊的終點，1 秒後再咬一次
            const z = zone({ kind: 'echoghost', x: m.x, y: m.y, dir: m.dir, r: 40, life: 1.2, w: m.w, h: m.h });
            echoes.push({ z, dmg: Math.round(m.atk * 0.9), hit: false });
          }
          return true;
        }
        m.lgCd = (m.lgCd == null ? U.rand(1, 2) : m.lgCd) - dt;
        if (aggro && m.lgCd <= 0 && near(m, P, 230)) {
          m.lgCd = U.rand(2.6, 3.4);
          m.lgWind = 0.4;
          m.dir = U.sign(P.x - m.x) || m.dir;
          return true;
        }
        return false;
      },
    },
    // 水晶球雪鴞：懸空，施法射出追蹤的水晶光球（射擊本身交給 ranged）
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
    // 雪崩符兔：踢出一顆沿地面滾、越滾越大的雪球
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
            G.audio.play('swing');
            G.world.projectiles.push({
              kind: 'snowball', x: m.x + m.dir * 30, y: base - 14, vx: m.dir * 250, vy: 0, r: 14, dmg: Math.round(m.atk * 1.2), life: 2.8, t: 0, seed: Math.random() * 6, owner: 'monster',
              onTick(p, d) {
                p.r = Math.min(42, p.r + 12 * d);
                p.y = base - p.r;
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
    // 戰鼓犛牛：擂三下鼓，每一下沿地面送出一道符文震波
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
    // 影縛狼：影子脫離本體滑到玩家腳下，冒出來咬人並定身
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
    // 夢咒綿羊：放出睡意霧，玩家在霧裡變得很慢
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
    // 封印狐：張開封印結界，玩家在結界裡不能放技能
    seal: {
      update(m, dt, P, aggro) {
        if (m.sealZ) {
          m.sealZ.x = m.x;
          m.sealZ.y = m.y;
          m.fx.aura = Math.min(1, (m.fx.aura || 0) + dt * 3);
          if (m.sealZ.t >= m.sealZ.life) m.sealZ = null;
        } else m.fx.aura = Math.max(0, (m.fx.aura || 0) - dt * 3);
        m.seCd = (m.seCd == null ? U.rand(2, 4) : m.seCd) - dt;
        if (!m.sealZ && aggro && m.seCd <= 0 && near(m, P, 300, 80)) {
          m.seCd = U.rand(6.5, 7.5);
          m.sealZ = zone({ kind: 'sealfield', x: m.x, y: m.y, r: 150, life: 3.2 });
          fields.push({ z: m.sealZ, fn: (P2) => (P2.silenceT = Math.max(P2.silenceT || 0, 0.35)) });
          G.audio.play('bossWarn');
          say(m, '封！', '#e0c0ff');
        }
        return false;
      },
      onDie(m) {
        if (m.sealZ) m.sealZ.life = 0;
      },
    },
    // 心核雪松：心臟規律打開；關著時很硬，打開時很脆
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
    // 冰盾熊：正面舉盾（只受 30%），盾擊衝撞之後盾放下、露出破綻
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
    // 沙漏鴞：血第一次掉到 40% 以下時，沙往回流，血回到 3 秒前
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
    // 鏡像鹿：造出一隻鏡像分身（打一下就碎）
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
          m.tsY = P.onGround ? P.y : G.world.map.platforms[P.plat >= 0 ? P.plat : 0][2];
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
    // 時計蝸牛：替周圍的同伴施加速魔法
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
    // 次元袋鼠：跳進袋子消失，從玩家背後的次元門跳出來踢人
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
    // 重力水母：把玩家往自己吸
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
    // 平行狐：分出平行世界的假身；打碎假身，真身會現形（踉蹌、變脆）
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
