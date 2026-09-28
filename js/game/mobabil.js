// 第二、三章新怪物的能力（v0.9）：疊上去的概念變成行為。
// 每個能力可以有：init(m)、update(m, dt, P, aggro) → 回傳 true 表示這一幀由能力自己控制移動、
// onHurt(m, dmg, dir)、onDie(m)、invuln(m) → 回傳 true 表示現在打不到。
// 表現用的旗標放在 m.fx（美術依照 js/art/monsters3.js、monsters4.js 畫）。
(function () {
  'use strict';
  const U = G.util;
  const midY = (m) => m.y - (m.hover || 0) - m.h * (m.scale || 1) * 0.5;
  const near = (m, P, dx, dy) => Math.abs(P.x - m.x) < dx && Math.abs(P.y - m.y) < (dy || 60) && P.climbing < 0;
  const hitIf = (P, box, dmg, fromX) => {
    if (P.alive() && U.overlap(box, P.hitbox())) P.hurt(dmg, fromX);
  };
  const shots = (m, kind, n, speed, dmgK, opts) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (opts && opts.a0 || 0);
      G.world.projectiles.push(Object.assign({ kind, x: m.x, y: midY(m), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 10, dmg: Math.round(m.atk * dmgK), life: 1.2, t: 0, seed: Math.random() * 6, owner: 'monster' }, opts || {}));
    }
  };
  const quakes = [];

  // ── v1.6 共用的招式工具（第三章起每隻怪都有技能攻擊）──
  // 規則：每一招都有 0.5～1 秒的預警（姿勢旗標 m.fx.* ＋ 地上的預警區 mobwarn／蓄力光 mobcharge），傷害 = m.atk × 倍率。
  // m.abLock：某個能力正在出招時鎖住，其他能力這段期間不會開新招（被動效果照常）。
  const MA = (G.mobAtk = {
    midY,
    near,
    hitIf,
    // 其他能力或普通攻擊正在進行中
    busy(m) {
      return !!(m.abLock || m.abBusy || m.attackT > 0 || m.chargeT > 0 || m.dead);
    },
    lock(m, name) {
      m.abLock = name;
    },
    unlock(m, name) {
      if (m.abLock === name) m.abLock = null;
    },
    // 地上的預警帶（x1～x2），顏色是 'r,g,b'
    warn(x1, x2, y, life, col, h) {
      const z = { kind: 'mobwarn', x: (x1 + x2) / 2, y, x1: Math.min(x1, x2), x2: Math.max(x1, x2), dir: Math.sign(x2 - x1), h: h || 70, r: Math.abs(x2 - x1) / 2, t: 0, life, col: col || '255,90,60', visual: true };
      G.world.zones.push(z);
      return z;
    },
    // 聚在某一點的蓄力光（投射物要從這裡射出來）
    charge(x, y, r, life, col) {
      const z = { kind: 'mobcharge', x, y, r, t: 0, life, col: col || '255,200,120', visual: true };
      G.world.zones.push(z);
      return z;
    },
    kill(z) {
      if (z) z.life = Math.min(z.life, z.t);
    },
    // 被擊退打斷蓄力（monster.js 擊退時會把 attackPhase 清成 null）
    interrupted(m) {
      return m.attackPhase !== 'wind';
    },
    // 點到線段的距離
    segDist(px, py, x1, y1, x2, y2) {
      const vx = x2 - x1;
      const vy = y2 - y1;
      const k = U.clamp(((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy || 1), 0, 1);
      return U.dist(px, py, x1 + vx * k, y1 + vy * k);
    },
  });

  // strike 的打擊框：從身體中心稍後方，到身體前緣再往前 reach（extra＝突進距離）；高度跟著體型放大
  const strikeBox = (m, S, extra) => {
    const sc = m.scale || 1;
    const hw = (m.w * sc) / 2;
    const back = hw * 0.3;
    const len = back + hw + S.reach + extra;
    const h = S.h * sc;
    return { x: m.dir > 0 ? m.x - back : m.x + back - len, y: m.y - (m.hover || 0) - h, w: len, h };
  };

  const AB = (G.mobAbil = {
    // ── 第二章 ──
    mail: {
      update(m) {
        m.fx.throwing = m.attackT > 0 && m.attackKind === 'ranged' ? 1 : Math.max(0, (m.fx.throwing || 0) - 0.05);
      },
    },
    flicker: {
      init(m) {
        m.flickT = U.rand(2, 4);
      },
      invuln(m) {
        return (m.fx.lightOff || 0) > 0.6;
      },
      update(m, dt, P) {
        m.flickT -= dt;
        if (m.fx.flash > 0) m.fx.flash = Math.max(0, m.fx.flash - dt * 3);
        if (m.flickT > 0) {
          m.fx.lightOff = Math.max(0, (m.fx.lightOff || 0) - dt * 4);
          return false;
        }
        // 熄燈 → 瞬移 → 亮起來時放一圈電光
        const k = -m.flickT;
        m.vx = 0;
        if (k < 0.35) m.fx.lightOff = Math.min(1, k / 0.35);
        else if (!m.flickJumped) {
          m.flickJumped = true;
          const [lo, hi] = m.bounds();
          m.x = U.clamp(m.x + (Math.random() < 0.5 ? -1 : 1) * U.rand(90, 150), lo, hi);
        }
        if (k > 0.8) {
          m.flickT = U.rand(3.5, 5);
          m.flickJumped = false;
          m.fx.lightOff = 0;
          m.fx.flash = 1;
          G.fx.ring(m.x, midY(m), 'rgba(255,240,140,0.9)', 90, 0.3, 4);
          G.audio.play('thunder');
          if (P.alive() && U.dist(P.x, P.y - 30, m.x, midY(m)) < 95) P.hurt(Math.round(m.atk * 1.1), m.x);
        }
        return true;
      },
    },
    glide: {
      init(m) {
        m.hover = 0;
        m.glideCd = U.rand(1, 3);
      },
      update(m, dt, P, aggro) {
        if (m.glidePhase === 'up') {
          m.hover = Math.min(170, m.hover + 380 * dt);
          m.dir = U.sign(P.x - m.x) || m.dir;
          m.vx = m.dir * m.def.speed * 1.4;
          if (m.hover >= 170) m.glidePhase = 'glide';
          m.fx.gliding = false;
          return true;
        }
        if (m.glidePhase === 'glide') {
          m.fx.gliding = true;
          m.hover = Math.max(0, m.hover - 70 * dt);
          m.dir = U.sign(P.x - m.x) || m.dir;
          m.vx = m.dir * m.def.speed * 0.9;
          if (m.hover <= 0) {
            m.glidePhase = null;
            m.fx.gliding = false;
            m.glideCd = U.rand(2.5, 4);
            G.fx.dust(m.x, m.y, 1, 6);
            hitIf(P, { x: m.x - 50, y: m.y - 40, w: 100, h: 40 }, Math.round(m.atk * 1.2), m.x);
          }
          return true;
        }
        m.glideCd -= dt;
        if (aggro && m.glideCd <= 0 && m.onGround) {
          m.glidePhase = 'up';
          G.audio.play('jump');
          return true;
        }
        return false;
      },
    },
    alarm: {
      update(m, dt, P) {
        if (m.ringT > 0) {
          m.ringT -= dt;
          m.vx = 0;
          m.fx.ring = 1 - m.ringT / 1.2;
          if (Math.random() < 0.2) G.audio.play('ui');
          if (m.ringT <= 0) {
            m.fx.ring = 0;
            m.alarmCd = 3;
            shots(m, 'spike', 8, 330, 0.9, { life: 0.9, r: 9 });
            G.fx.ring(m.x, midY(m), 'rgba(255,230,160,0.9)', 70, 0.25, 3);
            G.audio.play('sweep');
          }
          return true;
        }
        m.alarmCd = (m.alarmCd || 0) - dt;
        m.fx.ring = 0;
        if (m.alarmCd <= 0 && P.alive() && near(m, P, 160)) {
          m.nearT = (m.nearT || 0) + dt;
          if (m.nearT > 0.6) {
            m.nearT = 0;
            m.ringT = 1.2;
            G.fx.text(m.x, m.y - m.h - 24, '鈴鈴鈴！', '#ffe066', 16, 0.9);
          }
        } else m.nearT = 0;
        return false;
      },
    },
    kite: {
      init(m) {
        m.hover = 110;
        m.kiteCd = U.rand(2, 4);
      },
      update(m, dt, P, aggro) {
        if (m.diveT > 0) {
          m.diveT -= dt;
          const k = 1 - m.diveT / 0.9;
          m.hover = k < 0.5 ? 110 * (1 - k * 2) + 8 : 8 + 110 * (k - 0.5) * 2;
          m.vx = m.dir * m.def.speed * 3;
          m.fx.dive = k < 0.5;
          if (m.diveT <= 0) m.fx.dive = false;
          return true;
        }
        m.hover = 110 + Math.sin(m.t * 2) * 22;
        m.kiteCd -= dt;
        if (aggro && m.kiteCd <= 0 && Math.abs(P.x - m.x) < 320) {
          m.kiteCd = U.rand(3, 4.5);
          m.diveT = 0.9;
          m.dir = U.sign(P.x - m.x) || m.dir;
          G.audio.play('swing');
          return true;
        }
        return false;
      },
    },
    split: {
      onDie(m) {
        if (m.isChild) return;
        for (const s of [-1, 1]) {
          const c = new G.Monster(m.id, m.plat, m.x + s * 18, { noVariant: true });
          c.isChild = true;
          c.scale = 0.6 * (m.def.sizeMul || 1);
          c.halfW = (c.w * c.scale) / 2;
          c.maxHp = c.hp = Math.max(1, Math.round(m.maxHp * 0.25));
          c.exp = Math.round(m.exp * 0.25);
          c.vx = s * 160;
          c.vy = -260;
          c.onGround = false;
          c.aggroT = 3;
          G.world.monsters.push(c);
        }
        G.fx.text(m.x, m.y - m.h - 20, '喀啦！', '#ffd35a', 16, 0.8);
      },
    },
    stamp: {
      update(m, dt, P, aggro) {
        if (m.fx.slam > 0) m.fx.slam = Math.max(0, m.fx.slam - dt * 3);
        if (m.stamping) {
          if (m.onGround && m.airT > 0.15) {
            m.stamping = false;
            m.fx.slam = 1;
            m.vx = 0;
            G.world.zones.push({ kind: 'ink', x: m.x, y: m.y, r: 60, t: 0, life: 3.2, tick: 0.2, pct: 0.035 });
            G.fx.shake(3, 0.1);
            G.audio.play('heavy');
            hitIf(P, { x: m.x - 50, y: m.y - 50, w: 100, h: 50 }, Math.round(m.atk * 1.3), m.x);
          }
          m.airT += dt;
          return true;
        }
        m.stampCd = (m.stampCd == null ? U.rand(1, 2) : m.stampCd) - dt;
        if (aggro && m.onGround && m.stampCd <= 0 && near(m, P, 300)) {
          m.stampCd = U.rand(2.2, 3);
          m.stamping = true;
          m.airT = 0;
          m.dir = U.sign(P.x - m.x) || m.dir;
          m.vy = -560;
          m.vx = U.clamp((P.x - m.x) * 1.4, -320, 320);
          m.onGround = false;
          return true;
        }
        return false;
      },
    },
    stretch: {
      update(m, dt, P, aggro) {
        if (m.strT > 0) {
          m.strT -= dt;
          m.vx = 0;
          const t = 1.1 - m.strT;
          // 0～0.45 擠短蓄力、0.45～0.6 猛然拉長、0.6～0.85 停著、之後收回
          m.fx.stretch = t < 0.45 ? 0 : t < 0.6 ? (t - 0.45) / 0.15 : t < 0.85 ? 1 : Math.max(0, 1 - (t - 0.85) / 0.25);
          m.attackPhase = t < 0.45 ? 'wind' : 'strike';
          if (t >= 0.5 && !m.strHit) {
            m.strHit = true;
            G.audio.play('swing');
            const box = { x: m.dir > 0 ? m.x : m.x - 240, y: m.y - 42, w: 240, h: 40 };
            hitIf(P, box, Math.round(m.atk * 1.3), m.x);
          }
          if (m.strT <= 0) {
            m.attackPhase = null;
            m.fx.stretch = 0;
          }
          return true;
        }
        m.strCd = (m.strCd == null ? 1 : m.strCd) - dt;
        if (aggro && m.strCd <= 0 && near(m, P, 250)) {
          m.strCd = U.rand(2, 2.8);
          m.strT = 1.1;
          m.strHit = false;
          m.dir = U.sign(P.x - m.x) || m.dir;
          return true;
        }
        return false;
      },
    },
    melody: {
      update(m, dt, P, aggro) {
        m.fx.playing = aggro || m.attackT > 0;
      },
    },

    // ── 第三章 ──
    ignite: {
      update(m, dt, P, aggro) {
        if (m.dashT > 0) {
          m.dashT -= dt;
          m.fx.lit = true;
          m.vx = m.dir * m.def.speed * 4;
          if (Math.abs(m.x - (m.lastTrail || -9999)) > 46) {
            m.lastTrail = m.x;
            G.world.zones.push({ kind: 'firetrail', x: m.x - m.dir * 20, y: m.y, r: 26, t: 0, life: 2.4, tick: 0.3, pct: 0.03, noSlow: true });
          }
          return true;
        }
        if (m.windT > 0) {
          m.windT -= dt;
          m.vx = 0;
          m.attackPhase = 'wind';
          if (m.windT <= 0) {
            m.attackPhase = null;
            m.dashT = 0.9;
            G.audio.play('fire');
          }
          return true;
        }
        m.fx.lit = false;
        m.igCd = (m.igCd == null ? U.rand(1, 3) : m.igCd) - dt;
        if (aggro && m.igCd <= 0 && near(m, P, 380)) {
          m.igCd = U.rand(3.2, 4.2);
          m.windT = 0.45;
          m.dir = U.sign(P.x - m.x) || m.dir;
          G.fx.burst(m.x + m.dir * 24, m.y - 10, ['#ffd35a', '#ff7a2a'], 8, 160);
          return true;
        }
        return false;
      },
    },
    rage: {
      init(m) {
        m.fx.rage = 0;
        m.baseScale = m.scale;
        m.baseAtk = m.atk;
      },
      onHurt(m) {
        if (m.chargeT > 0) return;
        m.fx.rage = Math.min(5, (m.fx.rage || 0) + 1);
        m.scale = m.baseScale * (1 + m.fx.rage * 0.08);
        m.halfW = (m.w * m.scale) / 2;
        m.atk = Math.round(m.baseAtk * (1 + m.fx.rage * 0.1));
        if (m.fx.rage >= 5) {
          m.chargeT = 1.4;
          m.angry = true;
          G.fx.text(m.x, m.y - m.h * m.scale - 20, '氣炸了！', '#ff5a3a', 18, 0.9);
          m.fx.rage = 2;
        }
      },
    },
    magnet: {
      update(m, dt, P, aggro) {
        if (m.fx.pulse > 0) m.fx.pulse = Math.max(0, m.fx.pulse - dt * 3);
        if (m.pullT > 0) {
          m.pullT -= dt;
          m.vx = 0;
          m.fx.pulling = true;
          if (P.alive() && near(m, P, 420, 80)) P.x += U.sign(m.x - P.x) * 150 * dt;
          if (m.pullT <= 0) {
            m.fx.pulling = false;
            // v1.6：吸完之後背甲的水晶炸出一圈磁暴（預警＝吸引的 1.2 秒＋地上的紫圈）
            m.fx.pulse = 1;
            G.fx.ring(m.x, midY(m), 'rgba(190,140,255,0.95)', 100, 0.3, 5);
            G.fx.burst(m.x, midY(m), ['#c9a0ff', '#ffffff', '#7a5ad8'], 12, 260);
            G.audio.play('thunder');
            if (P.alive() && Math.abs(P.x - m.x) < 95 && Math.abs(P.y - m.y) < 80) P.hurt(Math.round(m.atk * 1.1), m.x);
            m.rollT = 1.3;
            m.dir = U.sign(P.x - m.x) || m.dir;
          }
          return true;
        }
        if (m.rollT > 0) {
          m.rollT -= dt;
          m.fx.rolling = true;
          m.vx = m.dir * m.def.speed * 3.6;
          if (m.rollT <= 0) m.fx.rolling = false;
          return true;
        }
        m.magCd = (m.magCd == null ? U.rand(1, 3) : m.magCd) - dt;
        if (aggro && m.magCd <= 0 && near(m, P, 420, 80)) {
          m.magCd = U.rand(4, 5);
          m.pullT = 1.2;
          G.world.zones.push({ kind: 'magring', x: m.x, y: m.y, r: 95, t: 0, life: 1.2, visual: true });
          G.audio.play('portal');
          return true;
        }
        return false;
      },
    },
    candle: {
      init(m) {
        m.fx.flames = 3;
      },
      update(m, dt) {
        if (m.attackPhase === 'recover') m.fx.flames = 0;
        else if (m.fx.flames < 3) {
          m.flameT = (m.flameT || 0) + dt;
          if (m.flameT > 0.5) {
            m.flameT = 0;
            m.fx.flames++;
          }
        }
      },
    },
    quake: {
      update(m, dt, P) {
        if (m.jumping) {
          m.airT += dt;
          m.fx.jump = true;
          if (m.onGround && m.airT > 0.2) {
            m.jumping = false;
            m.fx.jump = false;
            m.vx = 0;
            G.fx.shake(6, 0.2);
            G.audio.play('rockHit');
            // 兩道沿地面往外擴散的震波（跳起來就躲得掉）
            const z = { kind: 'quake', x: m.x, y: m.y, r: 20, t: 0, life: 0.7, visual: true };
            G.world.zones.push(z);
            quakes.push({ z, m, hit: false, dmg: Math.round(m.atk * 1.3) });
          }
          return true;
        }
        m.qCd = (m.qCd == null ? U.rand(1, 3) : m.qCd) - dt;
        if (m.qCd <= 0 && m.onGround && P.alive() && near(m, P, 420, 80)) {
          m.qCd = U.rand(3.2, 4.2);
          m.jumping = true;
          m.airT = 0;
          m.vy = -640;
          m.vx = 0;
          m.onGround = false;
          return true;
        }
        return false;
      },
    },
    gust: {
      init(m) {
        m.hover = 100;
      },
      update(m, dt, P, aggro) {
        m.hover = 100 + Math.sin(m.t * 3) * 14;
        if (m.blowT > 0) {
          m.blowT -= dt;
          m.vx = 0;
          m.fx.blow = Math.min(1, (1.2 - m.blowT) * 3);
          m.gustT = (m.gustT || 0) - dt;
          if (m.gustT <= 0) {
            m.gustT = 0.25;
            const a = Math.atan2(P.y - 30 - midY(m), P.x - m.x) + U.rand(-0.15, 0.15);
            G.world.projectiles.push({ kind: 'gust', x: m.x + m.dir * 20, y: midY(m), vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, r: 20, dmg: Math.round(m.atk * 0.5), life: 1.2, t: 0, seed: Math.random() * 6, owner: 'monster', push: m.dir * 260 });
          }
          if (m.blowT <= 0) m.fx.blow = 0;
          return true;
        }
        m.gCd = (m.gCd == null ? U.rand(1, 3) : m.gCd) - dt;
        if (aggro && m.gCd <= 0 && Math.abs(P.x - m.x) < 400) {
          m.gCd = U.rand(3.5, 4.5);
          m.blowT = 1.2;
          m.dir = U.sign(P.x - m.x) || m.dir;
          G.audio.play('sweep');
          return true;
        }
        return false;
      },
    },
    potcharge: {
      update(m, dt, P, aggro) {
        if (m.pcWind > 0) {
          m.pcWind -= dt;
          m.vx = 0;
          m.attackPhase = 'wind';
          if (m.pcWind <= 0) {
            m.attackPhase = null;
            m.chargeT = 1.0;
            m.angry = true;
            m.fx.charge = true;
          }
          return true;
        }
        if (m.chargeT <= 0) m.fx.charge = false;
        m.pcCd = (m.pcCd == null ? U.rand(1, 3) : m.pcCd) - dt;
        if (aggro && m.chargeT <= 0 && m.pcCd <= 0 && near(m, P, 380)) {
          m.pcCd = U.rand(3, 4);
          m.pcWind = 0.5;
          m.dir = U.sign(P.x - m.x) || m.dir;
          return true;
        }
        return false;
      },
    },
    shatter: {
      onDie(m) {
        shots(m, 'shard', 7, 360, 0.7, { life: 0.8, grav: 900, r: 9, a0: Math.PI });
        G.audio.play('rockHit');
      },
    },
    mood: {
      init(m) {
        m.fx.mood = U.pick(['red', 'blue', 'yellow']);
        m.moodT = U.rand(3, 5);
      },
      update(m, dt, P) {
        m.moodT -= dt;
        if (m.moodT <= 0) {
          const next = ['red', 'blue', 'yellow'].filter((x) => x !== m.fx.mood);
          m.fx.mood = U.pick(next);
          m.moodT = U.rand(4, 5.5);
          G.fx.text(m.x, m.y - m.h - 22, { red: '火之元素！', blue: '水之元素……', yellow: '光之元素！' }[m.fx.mood], { red: '#ff6a5a', blue: '#7ab8ff', yellow: '#ffe066' }[m.fx.mood], 16, 0.9);
        }
        // 紅（火）：主動衝撞；藍（水）：遠遠吐水彈；黃（光）：替旁邊的同伴回血
        m.abil.ranged = m.fx.mood === 'blue';
        m.moodAggro = m.fx.mood === 'red';
        if (m.fx.mood === 'red' && m.chargeT <= 0 && P.alive() && near(m, P, 300)) {
          m.redCd = (m.redCd || 0) - dt;
          if (m.redCd <= 0) {
            m.redCd = 2.5;
            m.chargeT = 1.1;
            m.angry = true;
          }
        }
        if (m.fx.mood === 'yellow') {
          m.healT2 = (m.healT2 || 0) - dt;
          if (m.healT2 <= 0) {
            m.healT2 = 2;
            G.world.monsters.filter((o) => !o.dead && o.hp < o.maxHp && Math.abs(o.x - m.x) < 260 && Math.abs(o.y - m.y) < 160).forEach((o) => {
              const n = Math.round(o.maxHp * 0.08);
              o.hp = Math.min(o.maxHp, o.hp + n);
              G.fx.text(o.x, o.y - o.h * (o.scale || 1) - 20, '+' + n, '#ffe066', 14, 0.7);
            });
          }
        }
        return false;
      },
    },
    mark: {
      init(m) {
        m.hover = 150;
        m.mkCd = U.rand(2, 4);
      },
      update(m, dt, P, aggro) {
        if (m.markT > 0) {
          m.markT -= dt;
          // 先在目標上方盤旋，然後俯衝到 X 上
          if (m.markT > 0.45) {
            m.hover = 150;
            m.dir = U.sign(m.markX - m.x) || m.dir;
            m.vx = U.clamp((m.markX - m.x) * 3, -260, 260);
            m.fx.dive = false;
          } else {
            m.fx.dive = true;
            m.hover = Math.max(0, m.hover - 600 * dt);
            m.vx = U.clamp((m.markX - m.x) * 8, -520, 520);
            if (m.hover <= 0 && !m.mkHit) {
              m.mkHit = true;
              G.fx.shake(5, 0.15);
              G.audio.play('heavy');
              G.fx.burst(m.x, m.y - 10, ['#e8d4a8', '#8a6a4a'], 10, 220);
              hitIf(P, { x: m.markX - 60, y: m.y - 70, w: 120, h: 70 }, Math.round(m.atk * 1.5), m.x);
            }
          }
          if (m.markT <= 0) {
            m.fx.dive = false;
            m.riseT = 0.6;
          }
          return true;
        }
        if (m.riseT > 0) {
          m.riseT -= dt;
          m.hover = Math.min(150, m.hover + 300 * dt);
          m.vx = 0;
          return true;
        }
        m.hover = 150 + Math.sin(m.t * 2.2) * 12;
        m.mkCd -= dt;
        if (aggro && m.mkCd <= 0 && P.alive() && near(m, P, 460, 80)) {
          m.mkCd = U.rand(4, 5);
          m.markT = 1.7;
          m.mkHit = false;
          m.markX = P.x;
          G.world.zones.push({ kind: 'xmark', x: P.x, y: m.y, r: 50, t: 0, life: 1.7, visual: true });
          G.audio.play('bossWarn');
          return true;
        }
        return false;
      },
    },

    // ── 通用的近戰技能（v1.6）：蓄力 → 出手（可帶突進）→ 收招。參數在怪物資料的 strike：
    //    { flag, range, wind, act, rec, reach, h, lunge, dmg, cd:[a,b], sound, col, shake }
    //    表現旗標：m.fx[flag] 0→1（蓄力）、1（出手）、1→0（收招）；m.attackPhase 'wind'／'strike'／'recover'。
    strike: {
      update(m, dt, P, aggro) {
        const S = m.def.strike;
        if (!S || m.illusion) return false;
        const st = m.stk || (m.stk = { ph: null, t: 0, cd: U.rand(1, 2) });
        if (st.ph) {
          if (st.ph === 'wind' && MA.interrupted(m)) {
            st.ph = null;
            m.fx[S.flag] = 0;
            MA.kill(st.z);
            MA.unlock(m, 'strike');
            st.cd = U.rand(1, 1.6);
            return false;
          }
          st.t -= dt;
          m.vx = 0;
          if (st.ph === 'wind') {
            m.fx[S.flag] = Math.min(1, 1 - st.t / S.wind);
            if (st.t <= 0) {
              st.ph = 'strike';
              st.t = S.act;
              st.hit = false;
              m.attackPhase = 'strike';
              G.audio.play(S.sound || 'swing');
              if (S.shake) G.fx.shake(S.shake, 0.12);
              if (!S.lunge) G.fx.burst(m.x + m.dir * S.reach * 0.6, m.y - 8, ['#e8d4a8', '#8a6a4a', '#ffffff'], 10, 220, { angle: -Math.PI / 2, spread: 1.4 });
            }
          } else if (st.ph === 'strike') {
            m.fx[S.flag] = 1;
            if (S.lunge) m.vx = m.dir * S.lunge;
            const box = strikeBox(m, S, 0);
            if (!st.hit && P.alive() && U.overlap(box, P.hitbox())) {
              st.hit = true;
              P.hurt(Math.round(m.atk * S.dmg), m.x);
            }
            if (st.t <= 0) {
              st.ph = 'rec';
              st.t = S.rec;
              m.attackPhase = 'recover';
            }
          } else {
            m.fx[S.flag] = Math.max(0, st.t / S.rec);
            if (st.t <= 0) {
              st.ph = null;
              m.fx[S.flag] = 0;
              m.attackPhase = null;
              MA.unlock(m, 'strike');
            }
          }
          return true;
        }
        st.cd -= dt;
        if (aggro && st.cd <= 0 && m.onGround && !MA.busy(m) && near(m, P, S.range, 70)) {
          st.cd = U.rand(S.cd[0], S.cd[1]);
          st.ph = 'wind';
          st.t = S.wind;
          m.dir = U.sign(P.x - m.x) || m.dir;
          m.attackPhase = 'wind';
          m.vx = 0;
          MA.lock(m, 'strike');
          // 預警帶：出手框＋突進的距離
          const b = strikeBox(m, S, (S.lunge || 0) * S.act);
          st.z = m.dir > 0 ? MA.warn(b.x, b.x + b.w, m.y, S.wind + S.act * 0.5, S.col, b.h) : MA.warn(b.x + b.w, b.x, m.y, S.wind + S.act * 0.5, S.col, b.h);
          return true;
        }
        return false;
      },
    },

    // 每幀：推進地面震波（只打在地上的人）
    tick(dt) {
      const P = G.player;
      for (let i = quakes.length - 1; i >= 0; i--) {
        const q = quakes[i];
        q.z.r += 520 * dt;
        if (!q.hit && P.alive() && P.onGround && (P.plat === q.m.plat || Math.abs(P.y - q.z.y) < 30) && Math.abs(Math.abs(P.x - q.z.x) - q.z.r) < 26) {
          q.hit = true;
          P.hurt(q.dmg, q.z.x);
        }
        if (q.z.t >= q.z.life) quakes.splice(i, 1);
      }
    },
    reset() {
      quakes.length = 0;
    },
  });

  // 給 monster.js 用的包裝
  G.mobAbilHooks = {
    init(m) {
      m.fx = m.fx || {};
      for (const a in m.abil) if (AB[a] && AB[a].init) AB[a].init(m);
    },
    update(m, dt, P, aggro) {
      let custom = false;
      // 有能力正在出招（m.abLock）時，其他能力照樣更新被動效果，但不會開新招
      for (const a in m.abil) {
        if (!AB[a] || !AB[a].update) continue;
        m.abBusy = custom;
        if (AB[a].update(m, dt, P, aggro && (!m.abLock || m.abLock === a))) custom = true;
      }
      m.abBusy = false;
      return custom;
    },
    onHurt(m, dmg, dir) {
      for (const a in m.abil) if (AB[a] && AB[a].onHurt) AB[a].onHurt(m, dmg, dir);
    },
    onDie(m) {
      for (const a in m.abil) if (AB[a] && AB[a].onDie) AB[a].onDie(m);
    },
    invuln(m) {
      for (const a in m.abil) if (AB[a] && AB[a].invuln && AB[a].invuln(m)) return true;
      return false;
    },
  };
})();
