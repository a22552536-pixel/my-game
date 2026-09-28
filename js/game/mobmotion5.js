// 終章怪物的動作重做（虛空鯨、鏡麒麟、時停蝶、時之聖甲蟲、時之鳳凰、銜尾蛇、重力魔眼、雙生天馬、星座魚）。
// 放在自己的檔案、在 js/game/mobmotion.js 之後載入，直接替換／包住 G.mobAbil 裡對應的能力（mobabil2.js 不改）。
// 規則：每一招對玩家都有 ≥0.5 秒的預警；每一下的傷害 ≤ 原本的倍率；硬控（時停、吸引）短、能逃、之後有免疫。
// 表現用的共用狀態放在 G.mobMotion5（js/art/mobmotion5.js 只讀；ev 由美術讀完清掉）。
(function () {
  'use strict';
  const U = G.util;
  const AB = G.mobAbil;
  const MA = G.mobAtk;
  if (!AB || !MA) return;
  const lowFx = () => !!G.lowFx;
  const R = (a, b) => a + (b - a) * Math.random();
  const RI = (a, b) => Math.floor(R(a, b + 1));
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
  const near = (m, P, dx, dy) => Math.abs(P.x - m.x) < dx && Math.abs(P.y - m.y) < (dy || 60) && P.climbing < 0;
  const say = (m, text, color) => G.fx.text(m.x, m.y - (m.hover || 0) - m.h * (m.scale || 1) - 22, text, color, 16, 0.9);
  const midY = (m) => m.y - (m.hover || 0) - m.h * (m.scale || 1) * 0.5;
  const pc = (P) => [P.x, P.y - 30]; // 玩家身體中心
  const groundAt = (P) => (P.onGround ? P.y : G.physics.surfaceY(G.world.map, P.plat >= 0 ? P.plat : 0, P.x));
  const mapW = () => (G.world.map && G.world.map.w) || 3000;

  // ── 執行期改資料（不改 js/data/mobs45.js）──
  const DM = G.data.monsters;
  if (DM.mirrordeer) DM.mirrordeer.abilities = ['mirror', 'prism', 'mirrorpane'];
  if (DM.hourowl) DM.hourowl.abilities = ['ranged', 'rewind', 'phoenixfan', 'hourfeather'];

  const MM = (G.mobMotion5 = {
    rifts: [], // 虛空鯨的裂縫 {x,y,h,tilt,t,tele,pull,close,hit,dmg,m,seed}
    stops: [], // 時停蝶的錶盤 {x,y,r,t,tele,hold,fade,fired,m}
    panes: [], // 鏡麒麟的鏡面 {x,y,h,t,life,rot}
    beams: [], // 鏡面折射光 {pts,t,tele,fire,life,hit,dmg}
    cbeams: [], // 分身的淡稜光 {x1,y1,x2,y2,t,tele,life,hit,dmg}
    dials: [], // 聖甲蟲的日晷 {x,y,r,t,sweep,life,m,done:Set}
    loops: [], // 銜尾蛇的符文軌道 {x0,x1,y,t,life,m}
    marks: [], // 永劫回歸的符文圈 {x,y,t,life,dmg,hit}
    wells: [], // 重力魔眼的透鏡 {x,y,r,t,tele,dur,fade,m}
    spots: [], // 天馬的落點星印 {x,gy,r,t,tele,life,hit,waves:{r,y},landed}
    meteors: [], // 星座魚的流星 {x,gy,r,big,t,tele,fall,life,side,hit,dmg}
    stars: [], // 星座線 {pts,edges,t,tele,flash,life,hit,dmg}
    ev: [], // 一次性事件：{k:'glass'|'riftpop'|'loopflash'|'rwstart'|'rwsnap'|'featherfreeze'|'markclose'|'implode'|'stomp'|'meteor', x, y}
    pull: 0, // 這一幀施加在玩家身上的吸力（px/s，帶正負號；量測與美術用）
  });
  const ev = (o) => {
    if (MM.ev.length < 80) MM.ev.push(o);
  };

  // ═════ 玩家狀態：時停（完全停住 1 秒）、重力（跳躍高度 ×0.5）。之後都有 1.5 秒免疫 ═════
  const P0 = G.player;
  const baseUpdate = P0.update;
  P0.update = function (dt) {
    const S = this.m5stop;
    if (S && !this.dead) {
      // 時間被停住：不能動、不能出招；計時器照走（無敵時間、受擊硬直），位置釘在原地
      S.t -= dt;
      S.el = (S.el || 0) + dt;
      if (this.invT > 0) this.invT -= dt;
      if (this.hurtT > 0) this.hurtT -= dt;
      if (this.potCd > 0) this.potCd -= dt;
      this.x = S.x;
      this.y = S.y;
      this.vx = this.vy = 0;
      if (S.t <= 0) {
        this.m5stop = null;
        this.m5stopImm = 1.5;
        this.m5stopLast = S.el;
        G.fx.ring(this.x, this.y - 30, 'rgba(255,226,150,0.9)', 70, 0.35, 3);
      }
      return;
    }
    if (this.dead) this.m5stop = null;
    if (this.m5stopImm > 0) this.m5stopImm -= dt;
    const g0 = this.onGround;
    const out = baseUpdate.apply(this, arguments);
    if (this.m5heavy > 0) {
      // 重力變重：起跳速度 ×0.72（跳躍高度約 ×0.52），空中多一點往下的重力
      if (g0 && !this.onGround && this.vy < -250 && this.climbing < 0) this.vy *= 0.72;
      if (!this.onGround && this.climbing < 0) this.vy += 500 * dt;
      this.m5heavy -= dt;
      if (this.m5heavy <= 0) this.m5heavy = 0;
    }
    return out;
  };
  const stopped = (P) => !!P.m5stop;

  // ═════ 1. 虛空鯨（pouchroo）：高速大範圍地游、穿小裂縫瞬移；在玩家四周撕開大裂縫把人吸過去 ═════
  // 平常：在玩家 ±450px 的範圍裡以 ~330px/s 一段一段地游（經過玩家頭頂時會拱起來，不會從玩家身上撞過去）；
  //   偶爾潛進小裂縫、從 250–450px 外鑽出來（fx.warp，沿用原本的美術；潛進去時打不到）。
  // 招式：玩家左側／右側／斜上方（有時左右各一個）裂開大裂縫：0.6 秒裂紋預警 → 1.35 秒吸引 → 0.35 秒閉合。
  //   吸力 ≤165px/s，而且一定低於玩家目前的走路速度 ×0.75（被減速時也一樣）；兩個裂縫的吸力加起來也不超過上限。
  //   碰到裂縫中心：atk×1.0，一個裂縫只打一次。原本的背後踢擊（atk×1.3）拿掉了。
  const PULL = 165;
  const RIFT = { tele: 0.6, pull: 1.35, close: 0.35 };
  AB.portal = {
    init(m) {
      m.hover = 30;
      m.homeX = m.x;
    },
    invuln(m) {
      return (m.fx.warp || 0) > 0.6;
    },
    update(m, dt, P, aggro) {
      if (m.illusion) return false;
      const [lo, hi] = m.bounds();
      const W = m.wh || (m.wh = { ph: 'rest', t: R(0.2, 0.6), from: m.x, to: m.x, k: 0, dur: 0, n: 0 });
      // 飄浮高度：平常 16–44px，靠近玩家時拱起來（從頭頂游過去）
      const dxP = Math.abs(m.x - P.x);
      const arc = P.alive() && Math.abs(P.y - m.y) < 140 ? 105 * Math.pow(U.clamp(1 - dxP / 160, 0, 1), 0.7) : 0;
      const hv = 30 + Math.sin(m.t * 1.9) * 14 + arc;
      m.hover += (hv - m.hover) * Math.min(1, dt * 9);
      // 撕裂縫：不打斷游動
      if (m.fx.riftCast > 0) {
        m.fx.riftCast = Math.max(0, m.fx.riftCast - dt);
        m.attackPhase = m.fx.riftCast > 0 ? 'wind' : null;
      }
      m.wpCd = (m.wpCd == null ? R(1.5, 3) : m.wpCd) - dt;
      if (aggro && m.wpCd <= 0 && near(m, P, 620, 220) && !stopped(P)) {
        m.wpCd = R(5.2, 6.4);
        openRifts(m, P);
      }
      // 瞬移
      if (W.ph === 'blink') {
        W.t += dt;
        m.vx = 0;
        if (W.t < 0.28) m.fx.warp = W.t / 0.28;
        else if (!W.moved) {
          W.moved = true;
          ev({ k: 'riftpop', x: m.x, y: m.y - m.hover - 40 });
          m.x = U.clamp(W.to, lo, hi);
          m.dir = U.sign(P.x - m.x) || m.dir;
          ev({ k: 'riftpop', x: m.x, y: m.y - m.hover - 40 });
          G.audio.play('portal');
        } else m.fx.warp = Math.max(0, 1 - (W.t - 0.28) / 0.28);
        if (W.t >= 0.56) {
          m.fx.warp = 0;
          W.ph = 'rest';
          W.t = R(0.1, 0.3);
        }
        return true;
      }
      if (W.ph === 'swim') {
        W.k = Math.min(1, W.k + dt / W.dur);
        const x = W.from + (W.to - W.from) * ease(W.k);
        m.vx = U.clamp((x - m.x) / Math.max(dt, 1e-3), -900, 900);
        m.dir = U.sign(W.to - W.from) || m.dir;
        m.fx.swim = 1;
        if (W.k >= 1) {
          W.ph = 'rest';
          W.t = aggro ? R(0.12, 0.35) : R(0.6, 1.4);
        }
        return true;
      }
      // rest：挑下一個落點
      m.fx.swim = 0;
      m.vx = 0;
      W.t -= dt;
      if (W.t <= 0) {
        const cx = aggro && P.alive() ? P.x : m.homeX;
        const a = Math.max(lo, cx - 450);
        const b = Math.min(hi, cx + 450);
        let tx = m.x;
        for (let i = 0; i < 10; i++) {
          const c = a + Math.random() * Math.max(0, b - a);
          if (Math.abs(c - m.x) < 200) continue;
          if (aggro && Math.abs(c - P.x) < 130) continue;
          tx = c;
          break;
        }
        if (Math.abs(tx - m.x) < 60) {
          W.t = 0.3;
          return true;
        }
        W.n++;
        if (aggro && Math.abs(tx - m.x) > 280 && Math.random() < 0.3) {
          W.ph = 'blink';
          W.t = 0;
          W.to = tx;
          W.moved = false;
        } else {
          W.ph = 'swim';
          W.from = m.x;
          W.to = tx;
          W.k = 0;
          W.dur = Math.max(0.35, Math.abs(tx - m.x) / (aggro ? 330 : 200));
        }
      }
      return true;
    },
    onDie(m) {
      for (const r of MM.rifts) if (r.m === m && r.t < r.tele + r.pull) r.t = Math.max(r.t, r.tele + r.pull);
    },
  };
  function openRifts(m, P) {
    const gy = groundAt(P);
    const sides = [];
    const r = Math.random();
    if (lowFx()) sides.push(r < 0.4 ? 'L' : r < 0.8 ? 'R' : 'D');
    else if (r < 0.26) sides.push('L');
    else if (r < 0.52) sides.push('R');
    else if (r < 0.74) sides.push('D');
    else sides.push('L', 'R');
    const W = mapW();
    for (const s of sides) {
      let x;
      let y;
      let h;
      let tilt = 0;
      if (s === 'D') {
        const d = Math.random() < 0.5 ? -1 : 1;
        x = P.x + d * R(150, 200);
        y = gy - R(185, 215);
        h = R(130, 150);
        tilt = d * 0.45;
      } else {
        const d = s === 'L' ? -1 : 1;
        x = P.x + d * R(190, 250);
        y = gy - R(80, 95);
        h = R(150, 180);
        tilt = d * R(-0.12, 0.12);
      }
      x = U.clamp(x, 60, W - 60);
      MM.rifts.push({ x, y, h, tilt, t: 0, tele: RIFT.tele, pull: RIFT.pull, close: RIFT.close, hit: false, dmg: Math.round(m.atk), m, seed: Math.random() * 100 });
    }
    m.fx.riftCast = RIFT.tele;
    m.attackPhase = 'wind';
    say(m, sides.length > 1 ? '虛空裂開了！' : '虛空裂縫！', '#d0a8ff');
    G.audio.play('portal');
  }
  function tickRifts(dt, P) {
    let px = 0;
    for (let i = MM.rifts.length - 1; i >= 0; i--) {
      const r = MM.rifts[i];
      r.t += dt;
      const life = r.tele + r.pull + r.close;
      if (r.t >= life) {
        MM.rifts.splice(i, 1);
        continue;
      }
      if (r.t < r.tele || r.t >= r.tele + r.pull) continue;
      if (!P.alive() || P.climbing >= 0 || stopped(P)) continue;
      const [cx, cy] = pc(P);
      const dx = r.x - cx;
      const dy = r.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < 600 && Math.abs(dy) < 300) px += U.sign(dx) * U.clamp(1.25 - d / 520, 0.35, 1) * (Math.abs(dx) < 6 ? Math.abs(dx) / 6 : 1);
      // 碰到裂縫中心
      if (!r.hit && Math.abs(dx) < 26 && Math.abs(dy) < r.h * 0.42) {
        r.hit = true;
        if (P.hurt(r.dmg, r.x)) G.fx.burst(r.x, cy, ['#e0c8ff', '#6a3aff', '#ffffff'], 10, 200);
      }
    }
    if (!px || !P.alive() || P.climbing >= 0 || stopped(P)) return 0;
    return U.clamp(px * PULL, -PULL, PULL);
  }

  // ═════ 2. 鏡麒麟（mirrordeer）：4–6 隻鏡像分身＋鏡面折射光 ═════
  // 分身：用本體的美術，半透明（~0.72）、邊緣有淡淡的稜鏡色差、閃爍得比本體多一點。和本體同步（或鏡像）移動、擺同樣的姿勢。
  //   每 2.6 秒「玻璃碎裂」閃一下、全部（含本體）交換位置。分身沒有身體碰撞傷害，打一下就碎成玻璃片。
  //   本體放稜鏡光束時，最多 2 隻分身（省效能 1 隻）跟著射出淡淡的光（atk×0.2，整招最多一下）。
  // 鏡面折射（mirrorpane）：玩家四周立起 2–3 面六角鏡，一道光從角射出、在鏡面之間折來折去，最後落在玩家原本的位置。
  //   預警：整條折線用細點線畫出來 0.85 秒；出手 0.15 秒內碰到任何一段：atk×1.0，一招最多一下。
  const COPY_LIFE = 11;
  function makeCopy(m, x, sign) {
    const c = new G.Monster(m.id, m.plat, x, { noVariant: true });
    c.isChild = true;
    c.illusion = true;
    c.m5copy = true;
    c.src = m;
    c.msign = sign;
    c.maxHp = c.hp = 1;
    if (G.demo) c.demoHp = G.demo.tough; // 試玩的「怪物耐打」不套在分身上：分身永遠一碰就碎
    c.exp = 0;
    c.atk = Math.round(m.atk * 0.2);
    c.aggroT = 30;
    c.lifeT = COPY_LIFE;
    c.dir = m.dir;
    c.t = m.t + R(0.3, 2);
    c.seed = Math.random() * 10;
    c.hover = m.hover;
    G.world.monsters.push(c);
    ev({ k: 'glass', x: c.x, y: c.y - 60, n: 8 });
    return c;
  }
  const liveCopies = (m) => (m.mh ? m.mh.copies.filter((c) => !c.dead) : []);
  AB.mirror = {
    update(m, dt, P, aggro) {
      if (m.illusion) {
        // 分身：跟著本體動、擺一樣的姿勢；沒有身體碰撞傷害
        const s = m.src;
        m.touchCd = 1;
        m.lifeT -= dt;
        if (!s || s.dead || m.lifeT <= 0) {
          if (!m.dead) m.takeDamage(m.hp + 1, 1, 0, false);
          return true;
        }
        m.fx.horn = s.fx.horn || 0;
        m.fx.pane = s.fx.pane || 0;
        m.attackPhase = s.attackPhase;
        m.fx.m5a = s.mh && s.mh.blink ? s.mh.alpha : 1;
        m.vx = s.hurtT > 0 ? 0 : s.vx * m.msign;
        if (!s.mh || !s.mh.blink) m.dir = U.sign(P.x - m.x) || m.dir;
        return true;
      }
      const H = m.mh || (m.mh = { copies: [], shuffleT: 2.6, blink: 0, alpha: 1 });
      H.copies = H.copies.filter((c) => !c.dead);
      // 洗牌：玻璃碎裂閃一下 → 全部交換位置
      if (H.copies.length) {
        if (H.blink > 0) {
          H.blink += dt;
          const k = H.blink;
          H.alpha = k < 0.16 ? 1 - k / 0.16 : Math.min(1, (k - 0.2) / 0.16);
          m.fx.m5a = H.alpha;
          if (k >= 0.16 && !H.swapped) {
            H.swapped = true;
            const all = [m].concat(H.copies);
            const xs = all.map((o) => o.x);
            for (let i = xs.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              const tmp = xs[i];
              xs[i] = xs[j];
              xs[j] = tmp;
            }
            if (xs[0] === m.x && xs.length > 1) {
              const tmp = xs[0];
              xs[0] = xs[1];
              xs[1] = tmp;
            }
            const [lo, hi] = m.bounds(true);
            all.forEach((o, i) => {
              o.x = o === m ? U.clamp(xs[i], lo, hi) : xs[i];
              if (o.onGround) o.y = G.physics.surfaceY(G.world.map, o.plat, o.x);
              o.dir = U.sign(P.x - o.x) || o.dir;
            });
          }
          if (k >= 0.36) {
            H.blink = 0;
            H.alpha = 1;
            m.fx.m5a = 1;
          }
          if (k < 0.36) {
            m.vx = 0;
            return true;
          }
        } else if (!m.abLock && m.attackPhase == null) {
          H.shuffleT -= dt;
          if (H.shuffleT <= 0) {
            H.shuffleT = R(2.4, 3.0);
            H.blink = 1e-4;
            H.swapped = false;
            for (const o of [m].concat(H.copies)) ev({ k: 'glass', x: o.x, y: o.y - 60, n: lowFx() ? 4 : 7 });
            G.audio.play('portal');
          }
        }
      } else m.fx.m5a = 1;
      m.mrCd = (m.mrCd == null ? R(1, 2) : m.mrCd) - dt;
      if (aggro && m.mrCd <= 0 && !H.copies.length && !m.abLock) {
        m.mrCd = R(7.5, 9);
        const n = lowFx() ? 2 : RI(4, 6);
        const [lo, hi] = m.bounds();
        const pf = G.world.map.platforms[m.plat];
        const plo = pf[0] + 40;
        const phi = pf[1] - 40;
        const cx = P.alive() && Math.abs(P.y - m.y) < 200 ? P.x : m.x;
        // 等距的候選位置（相隔 ~120px、離玩家至少 95px、不和本體重疊），打亂後取 n 個
        const cand = [];
        const x0 = cx + R(-30, 30);
        for (let off = -480; off <= 480; off += 120) {
          const c = x0 + off;
          if (c < Math.min(lo, plo) || c > Math.max(hi, phi)) continue;
          if (Math.abs(c - P.x) < 95 || Math.abs(c - m.x) < 100) continue;
          cand.push(c);
        }
        cand.sort((u, v) => Math.abs(u - cx) - Math.abs(v - cx) + R(-60, 60));
        for (const x of cand.slice(0, n)) H.copies.push(makeCopy(m, x, Math.random() < 0.5 ? 1 : -1));
        H.shuffleT = R(1.6, 2.2);
        ev({ k: 'glass', x: m.x, y: m.y - 60, n: 8 });
        say(m, '鏡中之陣！', '#bfe8ff');
        G.audio.play('portal');
      }
      return false;
    },
    onDie(m) {
      if (m.illusion) {
        ev({ k: 'glass', x: m.x, y: m.y - 55, n: lowFx() ? 6 : 12, big: true });
        G.audio.play('portal');
        return;
      }
      for (const c of liveCopies(m)) c.takeDamage(c.hp + 1, 1, 0, false);
      for (const p of MM.panes) if (p.m === m) p.life = Math.min(p.life, p.t + 0.2);
    },
  };
  // 稜鏡光束：本體照舊；分身跟著射淡淡的光
  const basePrism = AB.prism;
  AB.prism = Object.assign({}, basePrism, {
    update(m, dt, P, aggro) {
      if (m.illusion) return false;
      const st0 = m.prismSt;
      const was = st0 && st0.ph;
      const out = basePrism.update.call(this, m, dt, P, aggro);
      const st = m.prismSt;
      if (st && st.ph === 'wind' && was !== 'wind') {
        const cs = liveCopies(m).slice(0, lowFx() ? 1 : 2);
        const grp = { hit: false };
        for (const c of cs) {
          const sc = c.scale || 1;
          const x1 = c.x + (U.sign(P.x - c.x) || 1) * c.w * sc * 0.4;
          const y1 = c.y - c.h * sc * 0.9;
          const a = Math.atan2(P.y - 30 - y1, P.x - x1);
          let len = 420;
          if (Math.sin(a) > 0.01) len = Math.min(len, (c.y - y1) / Math.sin(a));
          MM.cbeams.push({ x1, y1, x2: x1 + Math.cos(a) * len, y2: y1 + Math.sin(a) * len, t: 0, tele: 0.8, life: 1.15, grp, dmg: Math.round(m.atk * 0.2), c });
        }
      }
      return out;
    },
  });
  // 鏡面折射
  const PANE = { wind: 0.95, rec: 0.45, beam: 0.4 };
  AB.mirrorpane = {
    update(m, dt, P, aggro) {
      if (m.illusion) return false;
      const st = m.mpSt || (m.mpSt = { ph: null, t: 0, cd: R(3, 5) });
      if (st.ph === 'wind') {
        if (MA.interrupted(m)) {
          st.ph = null;
          m.fx.pane = 0;
          if (st.beam) st.beam.life = 0;
          for (const p of st.panes) p.life = Math.min(p.life, p.t + 0.25);
          MA.unlock(m, 'mirrorpane');
          st.cd = R(1.2, 1.8);
          return false;
        }
        st.t -= dt;
        m.vx = 0;
        m.fx.pane = Math.min(1, 1 - st.t / PANE.wind);
        m.fx.horn = m.fx.pane;
        if (st.t <= 0) {
          st.ph = 'rec';
          st.t = PANE.rec;
          m.attackPhase = 'strike';
          G.audio.play('thunder');
          G.fx.shake(2.5, 0.1);
        }
        return true;
      }
      if (st.ph === 'rec') {
        st.t -= dt;
        m.vx = 0;
        m.fx.pane = Math.max(0, st.t / PANE.rec);
        m.fx.horn = m.fx.pane;
        if (st.t <= 0) {
          st.ph = null;
          m.fx.pane = m.fx.horn = 0;
          m.attackPhase = null;
          MA.unlock(m, 'mirrorpane');
        }
        return true;
      }
      st.cd -= dt;
      if (aggro && st.cd <= 0 && !MA.busy(m) && near(m, P, 480, 120) && Math.abs(P.x - m.x) > 110 && !(m.mh && m.mh.blink)) {
        st.cd = R(6.5, 8);
        st.ph = 'wind';
        st.t = PANE.wind;
        m.dir = U.sign(P.x - m.x) || m.dir;
        m.attackPhase = 'wind';
        m.vx = 0;
        MA.lock(m, 'mirrorpane');
        startPanes(m, P, st);
        return true;
      }
      return false;
    },
    onDie(m) {
      const st = m.mpSt;
      if (st && st.ph) {
        if (st.beam) st.beam.life = Math.min(st.beam.life, st.beam.t);
        MA.unlock(m, 'mirrorpane');
      }
    },
  };
  function startPanes(m, P, st) {
    const gy = groundAt(P);
    const s = U.sign(P.x - m.x) || 1;
    const W = mapW();
    const cl = (x) => U.clamp(x, 50, W - 50);
    const sc = m.scale || 1;
    const hx = m.x + m.dir * m.w * sc * 0.4;
    const hy = m.y - m.h * sc * 0.9;
    const pts = [[hx, hy]];
    const panes = [];
    const n = lowFx() ? 2 : RI(2, 3);
    const addPane = (x, y, h) => {
      const p = { x: cl(x), y, h, t: 0, life: PANE.wind + PANE.beam + 0.7, m, rot: R(-0.12, 0.12), seed: Math.random() * 10 };
      panes.push(p);
      MM.panes.push(p);
      pts.push([p.x, p.y]);
    };
    addPane(P.x + s * R(160, 210), gy - R(180, 210), 96);
    if (n >= 3) addPane(P.x - s * R(130, 170), gy - R(160, 185), 90);
    addPane(P.x + s * R(215, 260), gy - 58, 110);
    pts.push([P.x, gy - 30]);
    st.panes = panes;
    st.beam = { pts, t: 0, tele: PANE.wind, fire: 0.15, life: PANE.wind + PANE.beam, hit: false, dmg: Math.round(m.atk), m };
    MM.beams.push(st.beam);
    say(m, '鏡光折射！', '#bfe8ff');
    G.audio.play('charge');
  }
  function tickBeams(dt, P) {
    for (let i = MM.panes.length - 1; i >= 0; i--) {
      const p = MM.panes[i];
      p.t += dt;
      if (p.t >= p.life) MM.panes.splice(i, 1);
    }
    const [px, py] = pc(P);
    for (let i = MM.beams.length - 1; i >= 0; i--) {
      const b = MM.beams[i];
      b.t += dt;
      if (b.t >= b.life) {
        MM.beams.splice(i, 1);
        continue;
      }
      if (!b.hit && b.t >= b.tele && b.t < b.tele + b.fire && P.alive()) {
        for (let k = 0; k < b.pts.length - 1; k++) {
          const a = b.pts[k];
          const c = b.pts[k + 1];
          if (MA.segDist(px, py, a[0], a[1], c[0], c[1]) < 26) {
            b.hit = true;
            P.hurt(b.dmg, a[0]);
            break;
          }
        }
      }
    }
    for (let i = MM.cbeams.length - 1; i >= 0; i--) {
      const b = MM.cbeams[i];
      b.t += dt;
      if (b.t >= b.life || (b.c && b.c.dead && b.t < b.tele)) {
        MM.cbeams.splice(i, 1);
        continue;
      }
      if (!b.grp.hit && b.t >= b.tele && b.t < b.tele + 0.12 && P.alive() && MA.segDist(px, py, b.x1, b.y1, b.x2, b.y2) < 22) {
        b.grp.hit = true;
        P.hurt(b.dmg, b.x1, { noKnock: true });
      }
    }
  }

  // ═════ 3. 時停蝶（stopmoth）：小範圍時間停止 1 秒 ═════
  // 預警 0.9 秒：玩家所在位置浮出半徑 120px 的錶盤（地上一圈＋空中一圈），指針滴答轉、金粉。
  // 完成時玩家的身體中心還在圈裡 → 時間停止 1.0 秒（不能動、不能出招；灰褐色、錶環、懸停的粒子），放開後 1.5 秒內不會再被停。
  // 錶盤在停止的 1 秒裡是「停住的空間」：飛進圈裡的怪物投射物也會停在半空，1 秒後照原本的方向繼續飛。
  // 走出圈外（0.9 秒可以走 190px）就完全躲掉。蝶在施法時被打斷／打死，錶盤就碎掉。
  const STOP = { tele: 0.9, hold: 1.0, fade: 0.35, r: 120 };
  AB.timestop = {
    init(m) {
      m.hover = 110;
    },
    update(m, dt, P, aggro) {
      m.hover = 110 + Math.sin(m.t * 3) * 14;
      if (m.tsT > 0) {
        m.tsT -= dt;
        m.vx = 0;
        m.fx.tick = Math.min(1, 1 - m.tsT / STOP.tele);
        m.attackPhase = 'wind';
        if (m.tsT <= 0) {
          m.fx.tick = 0;
          m.attackPhase = null;
        }
        return true;
      }
      m.tmCd = (m.tmCd == null ? R(1.5, 3) : m.tmCd) - dt;
      const busy = MM.stops.some((s) => s.t < s.tele + s.hold);
      if (aggro && m.tmCd <= 0 && near(m, P, 440, 220) && !busy && !(P.m5stopImm > 0) && !stopped(P) && P.alive()) {
        m.tmCd = R(6, 7);
        m.tsT = STOP.tele;
        const gy = groundAt(P);
        MM.stops.push({ x: P.x, y: gy - 48, gy, r: STOP.r, t: 0, tele: STOP.tele, hold: STOP.hold, fade: STOP.fade, fired: false, m, seed: Math.random() * 10 });
        say(m, '滴答——', '#ffe6a0');
        G.audio.play('ui');
        return true;
      }
      return false;
    },
    onDie(m) {
      for (const s of MM.stops) if (s.m === m && !s.fired) s.cancel = true;
    },
  };
  function tickStops(dt, P) {
    const W = G.world;
    for (let i = MM.stops.length - 1; i >= 0; i--) {
      const s = MM.stops[i];
      s.t += dt;
      if (s.cancel && !s.fired) {
        ev({ k: 'glass', x: s.x, y: s.y, n: 6, gold: true });
        MM.stops.splice(i, 1);
        continue;
      }
      if (!s.fired && s.t >= s.tele) {
        s.fired = true;
        G.audio.play('bossWarn');
        const [cx, cy] = pc(P);
        if (P.alive() && !stopped(P) && !(P.m5stopImm > 0) && Math.hypot(cx - s.x, cy - s.y) < s.r) {
          P.m5stop = { t: STOP.hold, x: P.x, y: P.y, el: 0 };
          P.vx = P.vy = 0;
          G.fx.text(P.x, P.y - 92, '時間停止！', '#ffe6a0', 17, 0.9);
        }
      }
      // 停住的空間：怪物投射物停在圈裡
      if (s.fired && s.t < s.tele + s.hold) {
        for (const p of W.projectiles) {
          if (p.owner === 'player' || (p.owner === 'fx' && !p.m5)) continue;
          if (p._ts && p._ts.s === s) {
            p.x = p._ts.x;
            p.y = p._ts.y;
            p.t -= dt;
          } else if (Math.hypot(p.x - s.x, p.y - s.y) < s.r) {
            p._ts = { s, x: p.x, y: p.y };
            p.t -= dt;
          }
        }
      } else if (s.fired) {
        for (const p of W.projectiles) if (p._ts && p._ts.s === s) p._ts = null;
      }
      if (s.t >= s.tele + s.hold + s.fade) MM.stops.splice(i, 1);
    }
  }

  // ═════ 4. 時之聖甲蟲（clocksnail）：日晷加速 ═════
  // 把背上的太陽盤推高（0.4 秒）→ 地上投出半徑 260px 的日晷，一根影子指針在 1.1 秒內從左掃到右；
  // 指針掃過的怪物（含自己）得到 5 秒「快轉」（移動速度 ×1.6，原本的 hasteT），身上有速度線和快轉的小錶盤。
  // 不直接加傷害，也不影響玩家。
  const DIAL = { push: 0.4, sweep: 1.1, fade: 0.5, r: 260 };
  AB.haste = {
    update(m, dt, P, aggro) {
      if (m.gsT > 0) {
        m.gsT -= dt;
        m.vx = 0;
        m.fx.gear = 1;
        m.attackPhase = 'wind';
        if (m.gsT <= 0) {
          m.fx.gear = 0;
          m.attackPhase = null;
        }
        return true;
      }
      m.gCd2 = (m.gCd2 == null ? R(2, 4) : m.gCd2) - dt;
      if (aggro && m.gCd2 <= 0 && !MA.busy(m) && m.onGround) {
        m.gCd2 = R(7, 8);
        m.gsT = DIAL.push + DIAL.sweep;
        MM.dials.push({ x: m.x, y: m.y, r: DIAL.r, t: 0, push: DIAL.push, sweep: DIAL.sweep, life: DIAL.push + DIAL.sweep + DIAL.fade, m, done: new Set(), dir: m.dir });
        say(m, '日晷快轉！', '#ffd35a');
        G.audio.play('portal');
        return true;
      }
      return false;
    },
  };
  function tickDials(dt) {
    for (let i = MM.dials.length - 1; i >= 0; i--) {
      const d = MM.dials[i];
      d.t += dt;
      if (d.t >= d.life) {
        MM.dials.splice(i, 1);
        continue;
      }
      const k = (d.t - d.push) / d.sweep;
      if (k < 0 || k > 1.02) continue;
      // 指針從左（角度 π）掃到右（0）；地上的橢圓只看水平位置：x = cos(角度)·r
      const hx = d.x + Math.cos(Math.PI * (1 - Math.min(1, k))) * d.r;
      for (const o of G.world.monsters) {
        if (o.dead || o.illusion || d.done.has(o)) continue;
        if (Math.abs(o.y - d.y) > 160 || Math.abs(o.x - d.x) > d.r) continue;
        if (o.x <= hx + 4) {
          d.done.add(o);
          o.hasteT = Math.max(o.hasteT || 0, 5);
          G.fx.text(o.x, o.y - (o.hover || 0) - o.h * (o.scale || 1) - 20, '快轉！', '#ffd35a', 14, 0.7);
        }
      }
    }
  }

  // ═════ 5. 時之鳳凰（hourowl）：看得見的時光倒流＋沙漏羽 ═════
  // 倒流（原本的 rewind：血第一次掉到 40% 以下時，血回到 3 秒前）：現在身體也沿著過去 1.5 秒的路線倒著飛回去，
  //   路上留下倒燃的火痕、沙往上流、舊位置的殘影「啪」地收回來（表現在美術）。
  // 沙漏羽（hourfeather）：0.75 秒展翼＋身前浮出沙漏（預警）→ 扇出 5 根羽毛，飛 0.3 秒後在半空停住 0.6 秒
  //   （停住的那一刻記下玩家的位置，畫出瞄準線）→ 全部同時朝那個位置射出。每根 atk×0.7（同朱雀之羽），一輪最多 3 下。
  const baseRewind = AB.rewind;
  AB.rewind = Object.assign({}, baseRewind, {
    update(m, dt, P, aggro) {
      const before = m.rwT > 0;
      const out = baseRewind.update.call(this, m, dt, P, aggro);
      const H = m.posH || (m.posH = []);
      m.posHT = (m.posHT || 0) - dt;
      if (!(m.rwT > 0) && m.posHT <= 0) {
        m.posHT = 0.1;
        H.push([m.x, m.hover || 0]);
        if (H.length > 16) H.shift();
      }
      if (m.rwT > 0 && !before) {
        // 開始倒流：沿著剛才的路線倒回去
        m.rwPath = H.slice().reverse();
        m.rwPath.unshift([m.x, m.hover || 0]);
        m.rwK = 0;
        ev({ k: 'rwstart', x: m.x, y: midY(m) });
      }
      if (m.rwT > 0 && m.rwPath && m.rwPath.length > 1) {
        const k = U.clamp(1 - m.rwT / 1.0, 0, 1);
        m.rwK = k;
        const f = k * (m.rwPath.length - 1);
        const i = Math.min(m.rwPath.length - 2, Math.floor(f));
        const q = f - i;
        const a = m.rwPath[i];
        const b = m.rwPath[i + 1];
        const [lo, hi] = m.bounds();
        m.x = U.clamp(a[0] + (b[0] - a[0]) * q, lo, hi);
        m.hover = a[1] + (b[1] - a[1]) * q;
        m.vx = 0;
      }
      if (before && !(m.rwT > 0) && m.rwPath) {
        ev({ k: 'rwsnap', x: m.x, y: midY(m) });
        m.rwPath = null;
        H.length = 0;
      }
      return out;
    },
  });
  const HF = { wind: 0.75, out: 0.3, hold: 0.6, rec: 0.5, speed: 470, n: 5, cap: 3 };
  AB.hourfeather = {
    update(m, dt, P, aggro) {
      if (m.illusion) return false;
      const st = m.hfSt || (m.hfSt = { ph: null, t: 0, cd: R(3.5, 5.5) });
      if (st.ph === 'wind') {
        if (MA.interrupted(m)) {
          st.ph = null;
          m.fx.wings = 0;
          m.fx.hglass = 0;
          MA.unlock(m, 'hourfeather');
          st.cd = R(1.2, 1.8);
          return false;
        }
        st.t -= dt;
        m.vx = 0;
        m.fx.wings = Math.min(1, 1 - st.t / HF.wind);
        m.fx.hglass = m.fx.wings;
        if (st.t <= 0) {
          st.ph = 'rec';
          st.t = HF.rec;
          m.attackPhase = 'strike';
          fireFeathers(m, P);
        }
        return true;
      }
      if (st.ph === 'rec') {
        st.t -= dt;
        m.vx = 0;
        m.fx.wings = Math.max(0, st.t / HF.rec);
        m.fx.hglass = m.fx.wings;
        if (st.t <= 0) {
          st.ph = null;
          m.fx.wings = m.fx.hglass = 0;
          m.attackPhase = null;
          MA.unlock(m, 'hourfeather');
        }
        return true;
      }
      st.cd -= dt;
      if (aggro && st.cd <= 0 && !MA.busy(m) && !(m.rwT > 0) && near(m, P, 460, 300)) {
        st.cd = R(6.5, 8);
        st.ph = 'wind';
        st.t = HF.wind;
        m.dir = U.sign(P.x - m.x) || m.dir;
        m.attackPhase = 'wind';
        m.vx = 0;
        MA.lock(m, 'hourfeather');
        say(m, '沙漏之羽！', '#ffd98a');
        G.audio.play('charge');
        return true;
      }
      return false;
    },
    onDie(m) {
      MA.unlock(m, 'hourfeather');
    },
  };
  function featherTick(p, dt) {
    const v = p.vol;
    const P = G.player;
    if (p.ph === 'out') {
      const k = Math.max(0, 1 - p.t / HF.out);
      p.vx = p.ox * 300 * k;
      p.vy = p.oy * 300 * k;
      p.ang = Math.atan2(p.oy, p.ox);
      if (p.t >= HF.out) {
        p.ph = 'hold';
        p.vx = p.vy = 0;
        if (!v.aim) {
          // 時間停住的那一刻：記下玩家的位置
          v.aim = true;
          v.tx = P.x;
          v.ty = P.y - 30;
          G.audio.play('ui');
        }
        ev({ k: 'featherfreeze', x: p.x, y: p.y });
      }
    } else if (p.ph === 'hold') {
      p.vx = p.vy = 0;
      p.ang = Math.atan2(v.ty - p.y, v.tx - p.x);
      if (p.t >= HF.out + HF.hold) {
        p.ph = 'go';
        const a = Math.atan2(v.ty - p.y, v.tx - p.x);
        p.vx = Math.cos(a) * HF.speed;
        p.vy = Math.sin(a) * HF.speed;
        p.ang = a;
        if (!v.went) {
          v.went = true;
          G.audio.play('featherShot');
        }
      }
    } else if (p.ph === 'go' && P.alive() && !p.done) {
      const hb = P.hitbox();
      const cx = U.clamp(p.x, hb.x, hb.x + hb.w);
      const cy = U.clamp(p.y, hb.y, hb.y + hb.h);
      if (U.dist(cx, cy, p.x, p.y) < p.r) {
        p.done = true;
        if (v.hits < HF.cap && P.hurt(p.dmg, p.x - p.vx * 0.01)) {
          v.hits++;
          G.fx.burst(p.x, p.y, ['#fff2c0', '#ffb35a'], 8, 180);
        }
        p.life = Math.min(p.life, p.t + 0.05);
      }
    }
  }
  function fireFeathers(m, P) {
    const y = midY(m);
    const a0 = Math.atan2(P.y - 30 - y, P.x - m.x);
    const vol = { hits: 0, aim: false, tx: P.x, ty: P.y - 30 };
    const n = HF.n;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * 0.42;
      G.world.projectiles.push({
        kind: 'hourfeather', m5: true, owner: 'fx', x: m.x + Math.cos(a) * 22, y: y + Math.sin(a) * 22, vx: 0, vy: 0, ox: Math.cos(a), oy: Math.sin(a), ang: a,
        r: 9, dmg: Math.round(m.atk * 0.7), life: HF.out + HF.hold + 1.5, fade: 0.25, t: 0, seed: Math.random() * 6, ph: 'out', vol, onTick: featherTick,
      });
    }
    G.fx.burst(m.x, y, ['#ffd35a', '#fff2c0', '#ff9a3a'], 12, 240);
    G.audio.play('sweep');
    MM.lastVol = vol;
  }

  // ═════ 6. 銜尾蛇（ouroboros）：輪迴之環 ═════
  // 咬住尾巴變成符文輪（預警 0.8 秒：地上從頭到尾亮出一條淡淡的符文軌道）→ 沿著地形滾 350–450px（第一趟）→
  // 終點化成符文消失、在起點重新出現（輪迴）→ 頓 0.35 秒 → 沿著「同一條」軌道再滾一次。每趟最多打一下（atk×1.0）。
  // 被打中的地方留下永劫回歸的符文圈：2 秒內慢慢縮小，縮到底時還站在圈裡：atk×0.5。
  const OU = { wind: 0.8, speed: 620, fade: 0.2, pause: 0.35, rec: 0.5 };
  AB.ouro = {
    invuln(m) {
      return m.ou && (m.ou.ph === 'vanish' || m.ou.ph === 'appear') && (m.fx.m5a || 1) < 0.35;
    },
    update(m, dt, P, aggro) {
      const S = m.ou;
      if (S && S.ph) {
        m.touchCd = Math.max(m.touchCd || 0, 0.1);
        m.fx.wheel = S.ph !== 'rec';
        S.t += dt;
        if (S.ph === 'wind') {
          m.vx = 0;
          m.attackPhase = 'wind';
          if (MA.interrupted(m)) return endOuro(m, S, 1.2);
          if (S.t >= OU.wind) startPass(m, S);
          return true;
        }
        if (S.ph === 'roll') {
          const prev = m.x;
          const k = Math.min(1, S.t / S.dur);
          m.x = S.x0 + (S.x1 - S.x0) * k;
          m.vx = 0;
          m.dir = S.dir;
          m.attackPhase = 'strike';
          const x0 = Math.min(prev, m.x) - 34;
          const w = Math.abs(m.x - prev) + 68;
          if (!S.hit && P.alive() && U.overlap({ x: x0, y: m.y - 74, w, h: 74 }, P.hitbox())) {
            S.hit = true;
            if (P.hurt(Math.round(m.atk), prev)) {
              const gy = groundAt(P);
              MM.marks.push({ x: P.x, y: gy, t: 0, life: 2.0, dmg: Math.round(m.atk * 0.5), hit: false, seed: Math.random() * 10 });
            }
          }
          if (k >= 1) {
            if (S.pass === 1) {
              S.ph = 'vanish';
              S.t = 0;
              ev({ k: 'loopflash', x: m.x, y: m.y - 40 });
              G.audio.play('portal');
            } else {
              S.ph = 'rec';
              S.t = 0;
              m.fx.wheel = false;
              m.attackPhase = 'recover';
            }
          }
          return true;
        }
        if (S.ph === 'vanish') {
          m.vx = 0;
          m.fx.m5a = Math.max(0, 1 - S.t / OU.fade);
          if (S.t >= OU.fade) {
            const [lo, hi] = m.bounds(true);
            m.x = U.clamp(S.x0, lo, hi);
            if (m.onGround) m.y = G.physics.surfaceY(G.world.map, m.plat, m.x);
            S.ph = 'appear';
            S.t = 0;
            ev({ k: 'loopflash', x: m.x, y: m.y - 40 });
          }
          return true;
        }
        if (S.ph === 'appear') {
          m.vx = 0;
          m.x = S.x0;
          m.fx.m5a = Math.min(1, S.t / OU.fade);
          if (S.t >= OU.fade + OU.pause) {
            m.fx.m5a = 1;
            S.pass = 2;
            startPass(m, S);
          }
          return true;
        }
        // rec
        m.vx = 0;
        if (S.t >= OU.rec) return endOuro(m, S, null);
        return true;
      }
      m.whCd = (m.whCd == null ? R(1.5, 3) : m.whCd) - dt;
      if (aggro && m.whCd <= 0 && !MA.busy(m) && m.onGround && near(m, P, 440, 80)) {
        const [lo, hi] = m.bounds();
        let dir = U.sign(P.x - m.x) || m.dir;
        const want = U.clamp(Math.abs(P.x - m.x) + R(140, 220), 350, 450);
        let x1 = U.clamp(m.x + dir * want, lo, hi);
        if (Math.abs(x1 - m.x) < 220) {
          m.whCd = 1;
          return false;
        }
        m.whCd = R(5, 6);
        m.dir = dir;
        m.ou = { ph: 'wind', t: 0, x0: m.x, x1, dir, pass: 1, hit: false, dur: Math.abs(x1 - m.x) / OU.speed };
        m.ou.track = { x0: m.x, x1, plat: m.plat, t: 0, life: OU.wind + (m.ou.dur + OU.fade * 2 + OU.pause) + m.ou.dur + 0.4, m };
        MM.loops.push(m.ou.track);
        m.attackPhase = 'wind';
        m.fx.wheel = true;
        MA.lock(m, 'ouro');
        say(m, '輪迴之環！', '#c8ff9a');
        G.audio.play('charge');
        return true;
      }
      return false;
    },
    dmgMul(m) {
      return m.fx.wheel ? 0.5 : 1;
    },
    onDie(m) {
      if (m.ou && m.ou.track) m.ou.track.life = Math.min(m.ou.track.life, m.ou.track.t + 0.3);
      MA.unlock(m, 'ouro');
    },
  };
  function startPass(m, S) {
    S.ph = 'roll';
    S.t = 0;
    S.hit = false;
    m.x = S.x0;
    m.dir = S.dir;
    G.audio.play('sweep');
  }
  function endOuro(m, S, cd) {
    m.fx.wheel = false;
    m.fx.m5a = 1;
    m.attackPhase = null;
    if (S.track) S.track.life = Math.min(S.track.life, S.track.t + 0.3);
    m.ou = null;
    MA.unlock(m, 'ouro');
    if (cd != null) m.whCd = cd;
    return false;
  }
  function tickLoops(dt, P) {
    for (let i = MM.loops.length - 1; i >= 0; i--) {
      const l = MM.loops[i];
      l.t += dt;
      if (l.t >= l.life) MM.loops.splice(i, 1);
    }
    for (let i = MM.marks.length - 1; i >= 0; i--) {
      const k = MM.marks[i];
      k.t += dt;
      if (!k.hit && k.t >= k.life) {
        k.hit = true;
        ev({ k: 'markclose', x: k.x, y: k.y });
        if (P.alive() && Math.abs(P.x - k.x) < 34 && Math.abs(P.y - k.y) < 50) P.hurt(k.dmg, k.x, { noKnock: true });
      }
      if (k.t >= k.life + 0.3) MM.marks.splice(i, 1);
    }
  }

  // ═════ 7. 重力魔眼（gravjelly）：重力崩塌 ═════
  // 眨眼：每 3–5 秒（隨機）慢慢地、沉重地眨一次（0.25 秒閉上）。原本的 m.blink 跟著 x 變，一移動就眨個不停，這裡改成自己控制 fx.lid。
  // 預警 0.85 秒：眼睛睜到最大、身邊的空間扭曲：半徑 240px 的暗色透鏡圈、往內捲的星光、浮起來繞著轉的碎石。
  // 吸引 1.6 秒：圈裡的玩家被往眼睛正下方拉（≤188px/s，而且 ≤ 目前走路速度 ×0.88 → 往外走一定走得掉）；
  //   在圈裡重力變重（跳躍高度約 ×0.5、下落變快；身上有紫色往下壓的線）。
  // 崩塌：吸引結束時，離中心 70px 內：atk×1.2 一次（局部的內爆閃光），碎石往外飛。之後 1.5 秒內不會再被這招影響。
  const WELL = { tele: 0.85, dur: 1.6, fade: 0.5, r: 240, crush: 70, pull: 188 };
  const eyeY = (m) => m.y - (m.hover || 0) - 60 * (m.scale || 1);
  AB.gravity = {
    init(m) {
      m.hover = 120;
      m.fx.lid = 0.08;
      m.bk = { next: R(3, 5), t: -1 };
    },
    update(m, dt, P, aggro) {
      m.hover = 120 + Math.sin(m.t * 1.8) * 14;
      m.blink = false;
      const bk = m.bk || (m.bk = { next: R(3, 5), t: -1 });
      if (m.gpT > 0) {
        m.fx.wide = true;
        m.fx.lid = 0;
        bk.t = -1;
      } else {
        m.fx.wide = false;
        if (bk.t < 0) {
          bk.next -= dt;
          m.fx.lid = 0.08;
          if (bk.next <= 0) bk.t = 0;
        } else {
          bk.t += dt;
          const t = bk.t;
          m.fx.lid = t < 0.25 ? 0.08 + 0.92 * ease(t / 0.25) : t < 0.35 ? 1 : t < 0.6 ? 1 - 0.92 * ease((t - 0.35) / 0.25) : 0.08;
          if (t >= 0.6) {
            bk.t = -1;
            bk.next = R(3, 5);
          }
        }
      }
      if (m.gpT > 0) {
        m.gpT -= dt;
        m.vx = 0;
        m.fx.pull = true;
        m.attackPhase = m.gpT > WELL.dur ? 'wind' : 'strike';
        if (m.gpT <= 0) {
          m.fx.pull = false;
          m.fx.wide = false;
          m.attackPhase = null;
          MA.unlock(m, 'gravity');
        }
        return true;
      }
      m.gpCd = (m.gpCd == null ? R(2, 3.5) : m.gpCd) - dt;
      if (aggro && m.gpCd <= 0 && near(m, P, 420, 300) && !MA.busy(m) && !(P.m5gravImm > 0)) {
        m.gpCd = R(6.5, 7.5);
        m.gpT = WELL.tele + WELL.dur;
        MA.lock(m, 'gravity');
        MM.wells.push({ x: m.x, y: eyeY(m), gy: m.y, r: WELL.r, t: 0, tele: WELL.tele, dur: WELL.dur, fade: WELL.fade, m, seed: Math.random() * 10, touched: false, crushed: false, dmg: Math.round(m.atk * 1.2) });
        say(m, '重力崩塌！', '#c07aff');
        G.audio.play('portal');
        return true;
      }
      return false;
    },
    onDie(m) {
      MA.unlock(m, 'gravity');
      for (const w of MM.wells) if (w.m === m && w.t < w.tele + w.dur) {
        w.t = w.tele + w.dur;
        w.crushed = true;
      }
    },
  };
  // 回傳這一幀透鏡要加在玩家身上的吸力（px/s，帶正負號）
  function tickWells(dt, P) {
    const [cx, cy] = pc(P);
    let v = 0;
    for (let i = MM.wells.length - 1; i >= 0; i--) {
      const w = MM.wells[i];
      w.t += dt;
      if (w.m && !w.m.dead) {
        w.x = w.m.x;
        w.y = eyeY(w.m);
      }
      if (w.t >= w.tele + w.dur + w.fade) {
        MM.wells.splice(i, 1);
        continue;
      }
      const dx = w.x - cx;
      const inside = P.alive() && Math.hypot(dx, (w.y - cy) * 0.6) < w.r;
      if (!w.crushed && w.t >= w.tele + w.dur) {
        w.crushed = true;
        ev({ k: 'implode', x: w.x, y: w.y, gy: w.gy });
        G.audio.play('heavy');
        G.fx.shake(3, 0.15);
        if (inside && !(P.m5gravImm > 0) && Math.abs(dx) < WELL.crush) P.hurt(w.dmg, w.x);
        if (w.touched) P.m5gravImm = 1.5;
        continue;
      }
      if (w.t < w.tele || w.crushed) continue;
      if (!inside || P.m5gravImm > 0 || stopped(P) || P.climbing >= 0) continue;
      if (!w.touched) G.fx.text(P.x, P.y - 90, '好重……', '#d0a0ff', 15, 0.7);
      w.touched = true;
      P.m5heavy = Math.max(P.m5heavy || 0, 0.15);
      v += U.sign(dx) * WELL.pull * Math.min(1, Math.abs(dx) / 10);
    }
    return v;
  }

  // ═════ 8. 雙生天馬（parallelfox）：流星俯衝 ═════
  // 拍翅直直飛出畫面（留下星光羽毛；在天上時畫成畫面頂端的一顆小星）→ 玩家附近的地上亮出第一個星印（半徑 90px，
  // 天上垂下一道細光柱，預警 0.8 秒）→ 化成一道光俯衝下來、蹄踏落地：落點 60px 內＋沿地面往兩邊各跑 160px 的低矮衝擊波
  // （跳得過去）→ 立刻斜斜地再飛上去 → 第二個星印出現在「第一次落地那一刻玩家的位置」（預警 0.8 秒）→ 第二次俯衝。
  // 傷害 atk×1.0；每個落點（衝擊＋衝擊波合計）最多一下 → 整招最多兩下。原本的「分身對衝」不用了（和鏡麒麟太像）。
  const MD = { up: 0.55, tele: 0.8, dive: 0.2, stomp: 0.22, relaunch: 0.38, rec: 0.6, sky: 720, ring: 90, wave: 160, waveV: 420 };
  AB.twincharge = {
    invuln(m) {
      return !!(m.md && (m.hover || 0) > 260);
    },
    update(m, dt, P, aggro) {
      if (m.illusion) return false;
      const S = m.md;
      if (S) {
        S.t += dt;
        m.vx = 0;
        m.touchCd = Math.max(m.touchCd || 0, 0.1);
        const [lo, hi] = m.bounds(true);
        if (S.ph === 'up' || S.ph === 'relaunch') {
          const dur = S.ph === 'up' ? MD.up : MD.relaunch;
          const k = Math.min(1, S.t / dur);
          m.hover = S.h0 + (MD.sky - S.h0) * k * k;
          m.attackPhase = 'wind';
          m.fx.gallop = 1;
          m.fx.charging = false;
          m.fx.soar = 1;
          if (S.ph === 'relaunch') m.x = U.clamp(S.fromX + (S.spot.x - S.fromX) * ease(k), lo, hi);
          if (S.ph === 'up' && !S.spot && S.t >= 0.12) S.spot = mdSpot(m, P, P.x + R(-35, 35), lo, hi);
          if (k >= 1) {
            S.ph = 'sky';
            S.t = 0;
          }
          return true;
        }
        if (S.ph === 'sky') {
          m.hover = MD.sky;
          m.x = S.spot.x;
          m.fx.soar = 1;
          m.fx.gallop = 0;
          if (S.spot.t >= MD.tele - MD.dive) {
            S.ph = 'dive';
            S.t = 0;
            m.dir = S.spot.dir;
            G.audio.play('charge');
          }
          return true;
        }
        if (S.ph === 'dive') {
          const k = Math.min(1, S.t / MD.dive);
          m.hover = MD.sky * (1 - k * k);
          m.x = S.spot.x;
          m.fx.dive = 1;
          m.fx.soar = 0;
          m.fx.charging = true;
          m.attackPhase = 'strike';
          if (k >= 1) mdLand(m, S, P, lo, hi);
          return true;
        }
        if (S.ph === 'stomp') {
          m.hover = 0;
          m.fx.dive = 0;
          m.fx.charging = false;
          m.attackPhase = 'strike';
          if (S.t >= MD.stomp) {
            if (S.n === 1) {
              S.ph = 'relaunch';
              S.t = 0;
              S.h0 = 0;
              S.fromX = m.x;
              S.spot = S.next;
              m.dir = U.sign(S.spot.x - m.x) || m.dir;
            } else {
              S.ph = 'rec';
              S.t = 0;
              m.attackPhase = 'recover';
            }
          }
          return true;
        }
        // rec
        m.hover = 0;
        m.fx.gallop = Math.max(0, 1 - S.t / MD.rec) * 0.4;
        if (S.t >= MD.rec) return endDive(m, null);
        return true;
      }
      m.pgCd = (m.pgCd == null ? R(2, 3.5) : m.pgCd) - dt;
      if (aggro && m.pgCd <= 0 && !MA.busy(m) && m.onGround && near(m, P, 420, 80)) {
        m.pgCd = R(6.5, 8);
        m.md = { ph: 'up', t: 0, h0: m.hover || 0, n: 0, spot: null, next: null };
        m.attackPhase = 'wind';
        MA.lock(m, 'twincharge');
        say(m, '流星俯衝！', '#ffe6a0');
        G.audio.play('featherShot');
        return true;
      }
      return false;
    },
    onDie(m) {
      if (m.md) endDive(m, null);
    },
  };
  function mdSpot(m, P, x, lo, hi) {
    x = U.clamp(x, lo, hi);
    const s = { x, gy: G.physics.surfaceY(G.world.map, m.plat, x), r: MD.ring, t: 0, tele: MD.tele, life: MD.tele + 0.5, hit: false, dir: U.sign(x - m.x) || m.dir, m, waves: null, seed: Math.random() * 10 };
    MM.spots.push(s);
    return s;
  }
  function mdLand(m, S, P, lo, hi) {
    const sp = S.spot;
    S.n++;
    S.ph = 'stomp';
    S.t = 0;
    m.hover = 0;
    m.x = sp.x;
    sp.landed = true;
    sp.landT = sp.t;
    sp.waves = { r: 0, y: sp.gy };
    ev({ k: 'stomp', x: sp.x, y: sp.gy });
    G.audio.play('heavy');
    G.fx.shake(3, 0.12);
    const [cx, cy] = pc(P);
    if (!sp.hit && P.alive() && Math.abs(cx - sp.x) < 60 && cy > sp.gy - 110 && cy < sp.gy + 20) {
      sp.hit = true;
      P.hurt(Math.round(m.atk), sp.x);
    }
    // 第二個落點：第一次落地那一刻玩家的位置
    if (S.n === 1) S.next = mdSpot(m, P, P.x, lo, hi);
  }
  function endDive(m, cd) {
    const S = m.md;
    m.fx.charging = false;
    m.fx.gallop = 0;
    m.fx.soar = 0;
    m.fx.dive = 0;
    m.hover = 0;
    m.attackPhase = null;
    if (S) for (const s of [S.spot, S.next]) if (s && !s.landed) s.life = Math.min(s.life, s.t);
    m.md = null;
    m.touchCd = Math.max(m.touchCd || 0, 0.6); // 剛落地站在玩家身邊：身體碰撞晚一點才算，整招最多兩下
    MA.unlock(m, 'twincharge');
    if (cd != null) m.pgCd = cd;
    return false;
  }
  function tickSpots(dt, P) {
    for (let i = MM.spots.length - 1; i >= 0; i--) {
      const s = MM.spots[i];
      s.t += dt;
      if (s.waves) {
        const w = s.waves;
        w.r = Math.min(MD.wave, w.r + MD.waveV * dt);
        // 貼地的衝擊波：腳離地 24px 以上就跳過去了
        if (!s.hit && P.alive() && w.r < MD.wave && P.y > w.y - 24 && Math.abs(P.y - w.y) < 40 && (Math.abs(P.x - (s.x - w.r)) < 18 || Math.abs(P.x - (s.x + w.r)) < 18)) {
          s.hit = true;
          P.hurt(Math.round(s.m.atk), s.x);
        }
      }
      if (s.t >= s.life && (!s.waves || s.waves.r >= MD.wave)) MM.spots.splice(i, 1);
      else if (s.landed && s.t >= s.life + 0.6) MM.spots.splice(i, 1);
    }
  }

  // ═════ 9. 星座魚（constellfish）：流星雨（＋偶爾的星座線）═════
  // 平常：在空中一段一段地游（~110px/s、高度 105–165 起伏），身後拖著星塵。
  // 流星雨：有仇恨時，每 0.6–0.9 秒從天上叫下一顆小流星，落在玩家附近：地上的星印（半徑 50px）預警 0.7 秒 →
  //   斜斜落下的圓形發光岩塊＋星光尾巴 → 小爆炸。落點 45px 內、腳貼近地面：atk×0.5（無敵時間擋掉連段）。
  //   約每 6 秒一顆大流星：星印 90px、預警 1.0 秒、atk×1.0。場上同時最多 3 個預警（省效能 2 個）。叫流星時魚會發光、唱歌（fx.sing）。
  // 星座線（原本的招式，改成少用的副招，約 12 秒一次）：4–6 顆星 0.8 秒內一段一段連起來 → 線一閃，碰到：atk×1.0，最多一下。
  const CS = { wind: 0.8, flash: 0.12, fade: 0.45 };
  const MT = { tele: 0.7, bigTele: 1.0, r: 50, bigR: 90, fall: 0.3 };
  const meteorCap = () => (lowFx() ? 2 : 3);
  AB.constell = {
    init(m) {
      m.hover = 140;
    },
    update(m, dt, P, aggro) {
      if (m.fx.sing > 0) m.fx.sing = Math.max(0, m.fx.sing - dt * 1.6);
      const S = m.cs;
      if (S) {
        S.t += dt;
        m.vx = 0;
        m.fx.link = S.t < CS.wind ? Math.min(1, S.t / CS.wind) : Math.max(0, 1 - (S.t - CS.wind) / 0.3);
        if (S.t >= CS.wind + 0.3) {
          m.cs = null;
          m.fx.link = 0;
          m.attackPhase = null;
          MA.unlock(m, 'constell');
          return false;
        }
        m.attackPhase = S.t < CS.wind ? 'wind' : 'strike';
        return true;
      }
      // 流星雨（游動中也會叫）
      if (aggro && P.alive() && Math.abs(P.x - m.x) < 620 && Math.abs(P.y - m.y) < 320 && P.climbing < 0) {
        m.mtT = (m.mtT == null ? R(0.4, 0.9) : m.mtT) - dt;
        m.bigT = (m.bigT == null ? R(4, 6) : m.bigT) - dt;
        const warn = MM.meteors.filter((q) => q.t < q.tele).length;
        if (warn < meteorCap()) {
          if (m.bigT <= 0) {
            m.bigT = R(5.5, 6.5);
            m.mtT = Math.max(m.mtT, 0.5);
            callMeteor(m, P, true);
          } else if (m.mtT <= 0) {
            m.mtT = R(0.6, 0.9);
            callMeteor(m, P, false);
          }
        }
      }
      m.csCd = (m.csCd == null ? R(6, 9) : m.csCd) - dt;
      if (aggro && m.csCd <= 0 && !MA.busy(m) && near(m, P, 520, 260)) {
        m.csCd = R(11, 14);
        m.cs = { t: 0 };
        m.attackPhase = 'wind';
        MA.lock(m, 'constell');
        makeConstellation(m, P);
        G.audio.play('bossWarn');
        return true;
      }
      // 游動
      if (m.abLock && m.abLock !== 'constell') return false;
      const Sw = m.sw || (m.sw = { from: m.x, to: m.x, k: 1, dur: 1, rest: R(0.2, 0.8), home: m.x });
      m.hover += (135 + Math.sin(m.t * 1.3) * 30 - m.hover) * Math.min(1, dt * 4);
      const [lo, hi] = m.bounds();
      if (Sw.k < 1) {
        Sw.k = Math.min(1, Sw.k + dt / Sw.dur);
        const x = Sw.from + (Sw.to - Sw.from) * ease(Sw.k);
        m.vx = U.clamp((x - m.x) / Math.max(dt, 1e-3), -400, 400);
        m.dir = U.sign(Sw.to - Sw.from) || m.dir;
        return true;
      }
      m.vx = 0;
      Sw.rest -= dt;
      if (Sw.rest <= 0) {
        const cx = aggro && P.alive() ? P.x : Sw.home;
        let tx = U.clamp(cx + R(-300, 300), lo, hi);
        if (Math.abs(tx - m.x) < 90) tx = U.clamp(m.x + (Math.random() < 0.5 ? -1 : 1) * 160, lo, hi);
        Sw.from = m.x;
        Sw.to = tx;
        Sw.k = 0;
        Sw.dur = Math.max(0.6, Math.abs(tx - m.x) / 110);
        Sw.rest = R(0.3, 0.9);
      }
      return true;
    },
    onDie(m) {
      if (m.cs) MA.unlock(m, 'constell');
      for (const s of MM.stars) if (s.m === m && s.t < s.tele) s.life = Math.min(s.life, s.t);
      for (const q of MM.meteors) if (q.m === m && q.t < q.tele - q.fall) q.life = Math.min(q.life, q.t);
    },
  };
  function callMeteor(m, P, big) {
    const map = G.world.map;
    const W = mapW();
    const plat = P.plat >= 0 ? P.plat : 0;
    const pf = map.platforms[plat];
    let x = P.x;
    for (let i = 0; i < 8; i++) {
      const c = big || Math.random() < 0.45 ? P.x + R(-25, 25) : P.x + R(-170, 170);
      x = U.clamp(c, Math.max(30, pf[0] + 10), Math.min(W - 30, pf[1] - 10));
      if (!MM.meteors.some((q) => q.t < q.tele && Math.abs(q.x - x) < q.r + 20)) break;
    }
    const gy = G.physics.surfaceY(map, plat, x);
    const side = Math.random() < 0.5 ? -1 : 1;
    const tele = big ? MT.bigTele : MT.tele;
    MM.meteors.push({ x, gy, r: big ? MT.bigR : MT.r, big, t: 0, tele, fall: MT.fall, life: tele + 0.55, side, hit: false, dmg: Math.round(m.atk * (big ? 1 : 0.5)), m, seed: Math.random() * 10 });
    m.fx.sing = 1;
    if (big) say(m, '大流星！', '#ffe6a0');
  }
  function tickMeteors(dt, P) {
    for (let i = MM.meteors.length - 1; i >= 0; i--) {
      const q = MM.meteors[i];
      q.t += dt;
      if (!q.hit && q.t >= q.tele) {
        q.hit = true;
        ev({ k: 'meteor', x: q.x, y: q.gy, big: q.big });
        G.audio.play(q.big ? 'rockHit' : 'spiritShot');
        if (q.big) G.fx.shake(2.5, 0.12);
        if (P.alive() && Math.abs(P.x - q.x) < q.r * 0.9 && P.y > q.gy - (q.big ? 60 : 40) && P.y < q.gy + 30) P.hurt(q.dmg, q.x);
      }
      if (q.t >= q.life) MM.meteors.splice(i, 1);
    }
  }
  function makeConstellation(m, P) {
    const gy = groundAt(P);
    const n = lowFx() ? 4 : RI(4, 6);
    const W = mapW();
    const span = 90 * (n - 1);
    const x0 = P.x - span / 2 + R(-40, 40);
    const pts = [];
    // 低、高交錯（低的星在身體高度，高的在頭頂上方），線之間留有能站的空隙
    const lowFirst = Math.random() < 0.5;
    for (let i = 0; i < n; i++) {
      const low = (i % 2 === 0) === lowFirst;
      pts.push([U.clamp(x0 + i * 90 + R(-18, 18), 40, W - 40), low ? gy - R(22, 44) : gy - R(150, 195)]);
    }
    const edges = [];
    for (let i = 0; i < n - 1; i++) edges.push([i, i + 1]);
    const highs = pts.map((p, i) => i).filter((i) => pts[i][1] < gy - 100);
    if (highs.length >= 2) edges.push([highs[0], highs[highs.length - 1]]);
    MM.stars.push({ pts, edges, t: 0, tele: CS.wind, flash: CS.flash, life: CS.wind + CS.fade, hit: false, dmg: Math.round(m.atk), m, sx: m.x, sy: midY(m) });
  }
  function tickStars(dt, P) {
    const [px, py] = pc(P);
    for (let i = MM.stars.length - 1; i >= 0; i--) {
      const s = MM.stars[i];
      s.t += dt;
      if (s.t >= s.life) {
        MM.stars.splice(i, 1);
        continue;
      }
      if (!s.hit && s.t >= s.tele && s.t < s.tele + s.flash && P.alive()) {
        for (const e of s.edges) {
          const a = s.pts[e[0]];
          const b = s.pts[e[1]];
          if (MA.segDist(px, py, a[0], a[1], b[0], b[1]) < 24) {
            s.hit = true;
            P.hurt(s.dmg, a[0]);
            break;
          }
        }
      }
    }
  }

  // ═════ 每幀推進（接在 mobmotion.js 的 tick 之後）═════
  const baseTick = AB.tick;
  const baseReset = AB.reset;
  AB.tick = function (dt) {
    baseTick.call(AB, dt);
    const P = G.player;
    const vr = tickRifts(dt, P);
    const vw = tickWells(dt, P);
    // 吸力合計：一定低於玩家目前的走路速度（×0.88），被減速時也一樣 → 往外走永遠走得掉
    MM.pull = 0;
    if ((vr || vw) && P.alive() && P.climbing < 0 && !stopped(P)) {
      const walk = G.data.balance.walkSpeed * (P.slowT > 0 ? P.slowMul || 0.55 : 1);
      const cap = Math.min(vw ? WELL.pull : PULL, walk * (vw ? 0.88 : 0.75));
      const v = U.clamp(vr + vw, -cap, cap);
      P.x = U.clamp(P.x + v * dt, 20, mapW() - 20);
      MM.pull = v;
    }
    tickBeams(dt, P);
    tickStops(dt, P);
    tickDials(dt);
    tickLoops(dt, P);
    tickSpots(dt, P);
    tickMeteors(dt, P);
    tickStars(dt, P);
    if (P.m5gravImm > 0) P.m5gravImm -= dt;
    // 時間停止中：別的東西（吸力、風）也推不動玩家
    if (P.m5stop) {
      P.x = P.m5stop.x;
      P.y = P.m5stop.y;
      P.vx = P.vy = 0;
    }
  };
  AB.reset = function () {
    baseReset.call(AB);
    for (const k of ['rifts', 'stops', 'panes', 'beams', 'cbeams', 'dials', 'loops', 'marks', 'wells', 'spots', 'meteors', 'stars']) MM[k].length = 0;
    MM.pull = 0;
    const P = G.player;
    P.m5stop = null;
    P.m5stopImm = 0;
    P.m5heavy = 0;
    P.m5gravImm = 0;
  };
})();
