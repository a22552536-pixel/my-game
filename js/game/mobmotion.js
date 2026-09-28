// 第四章怪物的動作重做（鐮鼬、白澤、鎧武者亡靈、雷獸、影之芬里爾、雪女、古松樹靈、九尾封印狐）。
// 放在自己的檔案、在 mobabil2.js 之後載入，直接替換／包住 G.mobAbil 裡對應的能力（mobabil2.js 本身沒有改，
// 那個檔案同時有別的工作在改冷卻）。冷卻欄位沿用原本的名字（lgCd、bsCd、drCd、shCd、ffCd），
// 所以 monster.js 的仇恨冷卻縮放照樣作用。每一下的傷害都沿用原本的倍率或更低（見各段註解）。
// 表現用的共用狀態放在 G.mobMotion（js/art/mobmotion.js 只讀不寫）。
(function () {
  'use strict';
  const U = G.util;
  const AB = G.mobAbil;
  if (!AB) return;
  const lowFx = () => !!G.lowFx;
  const R = (a, b) => a + (b - a) * Math.random();
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
  const near = (m, P, dx, dy) => Math.abs(P.x - m.x) < dx && Math.abs(P.y - m.y) < (dy || 60) && P.climbing < 0;
  const zone = (o) => {
    const z = Object.assign({ t: 0, visual: true }, o);
    G.world.zones.push(z);
    return z;
  };
  const say = (m, text, color) => G.fx.text(m.x, m.y - (m.hover || 0) - m.h * (m.scale || 1) - 22, text, color, 16, 0.9);
  const slowP = (P, t, mul) => {
    P.slowT = Math.max(P.slowT || 0, t);
    P.slowMul = Math.min(P.slowMul || 0.55, mul);
  };
  const midY = (m) => m.y - (m.hover || 0) - m.h * (m.scale || 1) * 0.5;

  // 共用狀態（美術讀）
  const MM = (G.mobMotion = {
    ghosts: [], // 鐮鼬的殘影：1 秒後再咬一次
    iai: [], // 居合斬痕 {x0,x1,y,t}
    bolts: [], // 雷獸的落雷 {x,y,t,tele,struck}
    pools: [], // 芬里爾的影池 {x,y,t,tele,n,burst}
    orbs: [], // 九尾狐火
    cones: [], // 古松的松果
    ev: [], // 一次性的事件（樹皮屑、松果碎、狐火點燃）：美術讀完就清
    push: null, // 雪女的吹飛 {dir,t,lim}
    frost: 0, // 玩家身上的霜色（秒）
  });
  const ev = (o) => {
    if (MM.ev.length < 60) MM.ev.push(o);
  };

  // ═════ 鐮鼬（echoferret）：一陣風 ═════
  // 平常：在自己的活動範圍裡一陣一陣地疾衝（跨過大半個範圍、衝完頓一下、換方向）。不會從玩家身上穿過去。
  // 攻擊：先往後退到遠處 → 地上亮出一整條風線（預警 0.55 秒）→ 從遠處高速穿過玩家、衝到另一側 300–450px 外 →
  //   頓一下（反向風線預警 0.5 秒）→ 掠回來。每一趟最多打一下（atk×1.1，和原本一樣）；跳起來或離開那條線就閃得掉。
  //   終點留下殘影，1 秒後再咬一次（atk×0.9，和原本一樣）。表現：m.fx.dash、m.wl（風線）。
  AB.echo = {
    update(m, dt, P, aggro) {
      if (m.illusion) return false;
      const [lo, hi] = m.bounds();
      const F = m.fr || (m.fr = { ph: 'rest', t: R(0.2, 0.6), from: m.x, to: m.x, dur: 0, k: 0, dir: m.dir, passes: 0, hit: false });
      m.lgCd = (m.lgCd == null ? R(1, 2) : m.lgCd) - dt;
      const glide = (spd, minDur) => {
        F.from = m.x;
        F.k = 0;
        F.dur = Math.max(minDur, Math.abs(F.to - F.from) / spd);
        m.dir = U.sign(F.to - F.from) || m.dir;
      };
      const glideStep = () => {
        F.k = Math.min(1, F.k + dt / F.dur);
        const x = F.from + (F.to - F.from) * ease(F.k);
        m.vx = U.clamp((x - m.x) / Math.max(dt, 1e-3), -2200, 2200);
        m.fx.dash = F.k < 0.92;
        return F.k >= 1;
      };
      const endPoint = (dir) => {
        let e = U.clamp(P.x + dir * R(300, 450), lo, hi);
        if ((e - m.x) * dir < 160) e = U.clamp(m.x + dir * 320, lo, hi);
        return e;
      };
      const tele = (dur) => {
        F.ph = 'tele';
        F.t = dur;
        m.dir = F.dir;
        F.to = endPoint(F.dir);
        m.wl = { x0: m.x, x1: F.to, y: m.y, t0: G.time, dur };
        m.attackPhase = 'wind';
      };
      if (F.ph === 'back') {
        // 往後退到起跑點（不傷人）
        if (glideStep()) {
          m.vx = 0;
          m.fx.dash = false;
          tele(0.55);
        }
        return true;
      }
      if (F.ph === 'tele') {
        F.t -= dt;
        m.vx = 0;
        m.fx.dash = false;
        m.attackPhase = 'wind';
        if (F.t <= 0) {
          F.ph = 'pass';
          F.from = m.x;
          F.k = 0;
          F.dur = Math.max(0.12, Math.abs(F.to - F.from) / 1500);
          F.hit = false;
          m.fx.dash = true;
          m.attackPhase = 'strike';
          m.dir = U.sign(F.to - F.from) || m.dir;
          G.audio.play('swing');
        }
        return true;
      }
      if (F.ph === 'pass') {
        const prev = m.x;
        m.touchCd = Math.max(m.touchCd || 0, 0.1); // 掠過時只算風刃的判定（跳過去就閃得掉），不另外算身體碰撞
        F.k = Math.min(1, F.k + dt / F.dur);
        m.x = F.from + (F.to - F.from) * F.k;
        m.vx = 0;
        // 掃過的整段都算：這一幀從 prev 到 m.x 的長條
        const x0 = Math.min(prev, m.x) - 30;
        const w = Math.abs(m.x - prev) + 60;
        if (!F.hit && P.alive() && U.overlap({ x: x0, y: m.y - 50, w, h: 50 }, P.hitbox())) {
          F.hit = true;
          P.hurt(Math.round(m.atk * 1.1), prev);
        }
        if (F.k >= 1) {
          F.passes -= 1;
          m.fx.dash = false;
          if (F.passes > 0) {
            F.dir = -F.dir;
            tele(0.5);
          } else {
            m.attackPhase = null;
            const z = zone({ kind: 'echoghost', x: m.x, y: m.y, dir: m.dir, r: 40, life: 1.2, w: m.w, h: m.h });
            MM.ghosts.push({ z, dmg: Math.round(m.atk * 0.9), hit: false });
            F.ph = 'rest';
            F.t = 0.55;
          }
        }
        return true;
      }
      if (aggro && m.lgCd <= 0 && m.onGround && near(m, P, 420)) {
        m.lgCd = R(2.8, 3.6);
        F.dir = U.sign(P.x - m.x) || m.dir;
        F.passes = 2;
        // 起跑點：玩家這一側的遠處（離玩家 520–620px；範圍不夠就從現在的位置起跑）
        let st = U.clamp(P.x - F.dir * R(520, 620), lo, hi);
        if ((st - m.x) * F.dir > 0) st = m.x;
        F.to = st;
        F.ph = 'back';
        glide(1400, 0.08);
        m.attackPhase = null;
        return true;
      }
      if (F.ph === 'gust') {
        if (glideStep()) {
          F.ph = 'rest';
          F.t = R(0.25, 0.7);
          m.vx = 0;
          m.fx.dash = false;
        }
        return true;
      }
      // rest：頓一下，挑下一個落點一口氣衝過去
      F.t -= dt;
      m.vx = 0;
      m.fx.dash = false;
      m.attackPhase = null;
      if (F.t <= 0) {
        const span = Math.max(0, hi - lo);
        let tx = m.x;
        for (let i = 0; i < 6; i++) {
          tx = lo + Math.random() * span;
          if (Math.abs(tx - m.x) >= Math.min(260, span * 0.45)) break;
        }
        // 玩家在附近同一層：只在自己這一側衝（不穿過玩家）；有仇恨時在玩家 90–380px 之間繞
        if (P.alive() && Math.abs(P.y - m.y) < 100 && Math.abs(P.x - m.x) < 700) {
          const side = U.sign(m.x - P.x) || 1;
          let d = (tx - P.x) * side;
          d = Math.max(90, aggro ? Math.min(380, d) : d);
          tx = U.clamp(P.x + side * d, lo, hi);
          if ((tx - P.x) * side < 60) tx = m.x;
        }
        F.to = tx;
        if (Math.abs(tx - m.x) < 30) F.t = 0.3;
        else {
          F.ph = 'gust';
          glide(800, 0.22);
        }
      }
      return true;
    },
  };

  // ═════ 白澤（crystalowl）：在空中奔馳 ═════
  // 預警 0.42 秒（揚蹄、天上浮出一串雲點標出路線）→ 250–400px 疾馳 → 停下來 0.9–1.6 秒。
  // 光球（ranged，傷害不變）只在停下來的空檔施放。本體懸在 120px 高，只有跳起來才會碰到，碰撞傷害不變。
  // 表現：m.fx.gallop、m.fx.gtele、m.sky（路線）。
  AB.orbcast = {
    init(m) {
      m.hover = 120;
    },
    update(m, dt, P, aggro) {
      m.hover = 120 + Math.sin(m.t * 2) * 12;
      const casting = m.attackT > 0 && m.attackKind === 'ranged';
      m.fx.cast = casting ? Math.min(1, (m.fx.cast || 0) + dt * 4) : Math.max(0, (m.fx.cast || 0) - dt * 2);
      const S = m.skyRun || (m.skyRun = { ph: 'pause', t: R(0.5, 1.2), from: m.x, to: m.x, k: 0, dur: 0 });
      if (S.ph !== 'dash') m.fx.gallop = Math.max(0, (m.fx.gallop || 0) - dt * 5);
      if (S.ph !== 'tele') m.fx.gtele = Math.max(0, (m.fx.gtele || 0) - dt * 5);
      if (m.attackT > 0) return false; // 正在施法：交給一般的 ranged
      const [lo, hi] = m.bounds();
      if (S.ph === 'tele') {
        S.t -= dt;
        m.vx = 0;
        m.fx.gtele = Math.min(1, 1 - S.t / 0.42);
        if (S.t <= 0) {
          S.ph = 'dash';
          S.from = m.x;
          S.k = 0;
          S.dur = Math.max(0.35, Math.abs(S.to - S.from) / 700);
        }
        return true;
      }
      if (S.ph === 'dash') {
        S.k = Math.min(1, S.k + dt / S.dur);
        const x = S.from + (S.to - S.from) * ease(S.k);
        m.vx = U.clamp((x - m.x) / Math.max(dt, 1e-3), -1600, 1600);
        m.fx.gallop = Math.min(1, (m.fx.gallop || 0) + dt * 8);
        if (S.k >= 1) {
          S.ph = 'pause';
          S.t = R(0.9, 1.6);
          m.vx = 0;
        }
        return true;
      }
      m.vx = 0;
      if (m.atkCd > 0) m.atkCd -= dt;
      const pr = m.def.projectile;
      if (aggro && pr && m.atkCd <= 0 && Math.abs(P.x - m.x) < pr.range && Math.abs(P.y - m.y) < 220) {
        m.startAttack('ranged');
        return true;
      }
      S.t -= dt;
      if (S.t <= 0 && hi - lo > 40) {
        const d = R(250, 400);
        let dir = Math.random() < 0.5 ? -1 : 1;
        if ((dir > 0 ? hi - m.x : m.x - lo) < 160) dir = -dir;
        if (aggro && Math.abs(m.x + dir * d - P.x) > 420 && Math.abs(m.x - dir * d - P.x) < Math.abs(m.x + dir * d - P.x)) dir = -dir;
        S.to = U.clamp(m.x + dir * d, lo, hi);
        if (Math.abs(S.to - m.x) < 60) {
          S.t = 0.5;
          return true;
        }
        S.ph = 'tele';
        S.t = 0.42;
        m.dir = U.sign(S.to - m.x) || m.dir;
        m.sky = { x0: m.x, x1: S.to, y: m.y - m.hover - 8, t0: G.time, dur: 0.42 + Math.abs(S.to - m.x) / 700 };
      }
      return true;
    },
  };

  // ═════ 鎧武者亡靈（shieldbear）：加一招居合斬（原本的盾擊衝撞保留） ═════
  // 蹲低、手按刀柄（0.5 秒預警，地上一條細紅線）→ 0.08 秒拔刀往前衝 220–300px（atk×1.25，一下）→
  // 斬痕停留 0.25 秒 → 0.9 秒慢慢收刀（收刀時沒有格擋＝破綻）。和盾擊共用 bsCd。
  // 表現：m.fx.iai（1 預警 2 拔刀 3 收刀）、m.fx.iaiK、m.iaiLine、MM.iai。
  const shield0 = AB.shield;
  if (shield0) {
    AB.shield = Object.assign({}, shield0, {
      update(m, dt, P, aggro) {
        const I = m.iaiS;
        if (I) {
          I.t -= dt;
          m.vx = 0;
          if (I.ph === 'tele') {
            m.attackPhase = 'wind';
            m.fx.iai = 1;
            m.fx.iaiK = Math.min(1, 1 - I.t / 0.5);
            m.fx.guard = true;
            if (I.t <= 0) {
              I.ph = 'draw';
              I.t = 0.08;
              I.hit = false;
              m.fx.iai = 2;
              m.attackPhase = 'strike';
              G.audio.play('swing');
            }
          } else if (I.ph === 'draw') {
            const prev = m.x;
            m.touchCd = Math.max(m.touchCd || 0, 0.1);
            const k = Math.min(1, 1 - I.t / 0.08);
            m.x = I.x0 + (I.x1 - I.x0) * k;
            const tip = m.x + m.dir * 46;
            if (!I.hit && P.alive() && U.overlap({ x: Math.min(prev, tip) - 20, y: m.y - 95, w: Math.abs(tip - prev) + 40, h: 95 }, P.hitbox())) {
              I.hit = true;
              // 擊退方向往回（遠離武者要停下的地方），不會被推到牠身上
              P.hurt(Math.round(m.atk * 1.25), I.x1 + m.dir * 80);
            }
            if (I.t <= 0) {
              m.x = I.x1;
              MM.iai.push({ x0: I.x0 - m.dir * 20, x1: I.x1 + m.dir * 56, y: m.y - 58, t: 0 });
              if (MM.iai.length > 6) MM.iai.shift();
              I.ph = 'hold';
              I.t = 0.25;
            }
          } else if (I.ph === 'hold') {
            m.attackPhase = 'strike';
            m.touchCd = Math.max(m.touchCd || 0, 0.1); // 斬完停著的這一下不再算身體碰撞（一招只打一下）
            if (I.t <= 0) {
              I.ph = 'sheathe';
              I.t = 0.9;
              m.fx.iai = 3;
            }
          } else {
            m.attackPhase = 'recover';
            m.fx.iai = 3;
            m.fx.iaiK = Math.min(1, 1 - I.t / 0.9);
            m.fx.guard = false;
            if (I.t <= 0) {
              m.iaiS = null;
              m.fx.iai = 0;
              m.fx.guard = true;
              m.attackPhase = null;
            }
          }
          return true;
        }
        const busy = m.bsWind > 0 || m.bsT > 0 || m.bsRec > 0;
        if (!busy && aggro && m.bsCd != null && m.bsCd - dt <= 0 && near(m, P, 300, 80)) {
          const dx = Math.abs(P.x - m.x);
          const dir = U.sign(P.x - m.x) || m.dir;
          const [lo, hi] = m.bounds();
          // 穿過玩家、停在玩家另一側 60–100px（再加上半個身體）的地方，背對玩家收刀；衝刺距離 220px 起跳
          const half = (m.w * (m.scale || 1)) / 2;
          const want = Math.max(220, dx + half + R(60, 100));
          const x1 = U.clamp(m.x + dir * want, lo, hi);
          const past = (x1 - P.x) * dir >= half + 50;
          if (past && want <= 400 && (dx > 150 || Math.random() < 0.5)) {
            m.bsCd = R(3.4, 4.2);
            m.dir = dir;
            m.iaiS = { ph: 'tele', t: 0.5, x0: m.x, x1, hit: false };
            m.iaiLine = { x0: m.x, x1: x1 + m.dir * 56, y: m.y, t0: G.time, dur: 0.5 };
            m.fx.iai = 1;
            m.fx.iaiK = 0;
            m.attackPhase = 'wind';
            return true;
          }
        }
        return shield0.update.call(this, m, dt, P, aggro);
      },
    });
  }

  // ═════ 雷獸（drumyak）：擂鼓把雷丟得到處都是 ═════
  // 擂三下鼓；每一下在身邊 ±400px 的隨機地點落雷（整套 3–5 道，其中第一道瞄玩家腳下；lowFx 整套 3 道）。
  // 每道雷落下前地上有 ≥0.55 秒閃爍的電痕預警，同一下鼓的幾道錯開 0.2 秒。每道 atk×1（原本的震波是 ×1.1）。
  function groundAt(x, plat) {
    const map = G.world.map;
    const pf = map.platforms[plat];
    if (pf && x >= pf[0] && x <= pf[1]) return G.physics.surfaceY(map, plat, x);
    const pb = G.physics.platformBelow ? G.physics.platformBelow(map, x, -1e4) : -1;
    return pb >= 0 ? G.physics.surfaceY(map, pb, x) : G.physics.groundY(map, x);
  }
  AB.drum = {
    update(m, dt, P, aggro) {
      if (m.fx.beat > 0) m.fx.beat = Math.max(0, m.fx.beat - dt * 4);
      if (m.beats > 0) {
        m.vx = 0;
        m.beatT -= dt;
        if (m.beatT <= 0) {
          const first = m.beats === 3;
          m.beats--;
          m.beatT = 0.62;
          m.fx.beat = 1;
          G.fx.shake(3, 0.1);
          G.audio.play('heavy');
          const map = G.world.map;
          const pf = map.platforms[m.plat];
          const n = lowFx() ? 1 : first ? 2 : m.beats === 1 ? 1 + (Math.random() < 0.5 ? 1 : 0) : 1;
          for (let i = 0; i < n; i++) {
            let x;
            let y;
            if (first && i === 0 && P.alive()) {
              // 瞄玩家腳下（稍微偏一點）
              x = U.clamp(P.x + R(-30, 30), 20, map.w - 20);
              y = P.onGround ? groundAt(x, P.plat) : groundAt(x, m.plat);
            } else {
              x = U.clamp(m.x + R(-400, 400), pf ? pf[0] + 16 : 20, pf ? pf[1] - 16 : map.w - 20);
              if (Math.abs(x - m.x) < 70) x = U.clamp(m.x + (x < m.x ? -1 : 1) * R(90, 200), 20, map.w - 20);
              y = groundAt(x, m.plat);
            }
            MM.bolts.push({ x, y, t: -i * 0.2, tele: R(0.55, 0.7), dmg: m.atk, struck: false, seed: Math.random() * 9 });
          }
          if (MM.bolts.length > 24) MM.bolts.splice(0, MM.bolts.length - 24);
        }
        return true;
      }
      m.drCd = (m.drCd == null ? R(1.5, 3) : m.drCd) - dt;
      if (aggro && m.drCd <= 0 && m.onGround && near(m, P, 480, 120)) {
        m.drCd = R(4.5, 5.5);
        m.beats = 3;
        m.beatT = 0.35;
        return true;
      }
      return false;
    },
  };

  // ═════ 影之芬里爾（shadowwolf）：一直在跑，影刃從地下冒出來 ═════
  // 平常：在家附近 ±350px 來回疾馳（有仇恨時家往玩家那邊靠；玩家在同一層附近時不穿過玩家）。
  // 攻擊：停 0.45 秒，自己的影子脫離、貼地滑向玩家 → 停下的地方擴散一灘影池（≥0.55 秒預警、紫色光點）→
  //   2–4 把黑紫影刃從影池冒出、沉回去。一灘最多打一下（atk×1.2＋短暫緩速，和原本的影咬一樣）。
  //   血量低於一半時變成一排 3 灘，一灘接一灘往玩家那邊漣漪過去。表現：m.fx.run、m.fx.shadowless、MM.pools。
  AB.shadow = {
    update(m, dt, P, aggro) {
      const W = m.wr || (m.wr = { home: m.x, to: m.x, stop: 0 });
      const s = m.shade;
      if (s) {
        m.fx.shadowless = true;
        const dx = P.x - s.z.x;
        s.z.x += U.clamp(dx, -560 * dt, 560 * dt);
        s.t += dt;
        if (Math.abs(dx) < 16 || s.t > 1.0) {
          const dmg = Math.round(m.atk * 1.2);
          const pl = P.onGround && Math.abs(P.y - m.y) < 160 ? P.plat : m.plat; // 影池貼著地表（起伏的地形）
          const n = () => (lowFx() ? 2 : 2 + ((Math.random() * 3) | 0));
          if (m.hp < m.maxHp * 0.5) {
            const dir = U.sign(s.z.x - m.x) || m.dir;
            for (let i = 0; i < 3; i++) {
              const x = s.z.x - dir * (2 - i) * 90;
              MM.pools.push({ x, y: groundAt(x, pl), t: -i * 0.22, tele: 0.55, n: n(), dmg, hit: false, burst: false, seed: Math.random() * 9 });
            }
          } else MM.pools.push({ x: s.z.x, y: groundAt(s.z.x, pl), t: 0, tele: 0.6, n: n(), dmg, hit: false, burst: false, seed: Math.random() * 9 });
          if (MM.pools.length > 12) MM.pools.splice(0, MM.pools.length - 12);
          s.z.life = s.z.t + 0.15;
          m.shade = null;
          m.fx.shadowless = false;
        }
      }
      m.shCd = (m.shCd == null ? R(2, 3.5) : m.shCd) - dt;
      if (!m.shade && aggro && m.shCd <= 0 && near(m, P, 500, 80)) {
        m.shCd = R(5, 6);
        m.dir = U.sign(P.x - m.x) || m.dir;
        W.stop = 0.45;
        m.shade = { z: zone({ kind: 'wolfshadow', x: m.x, y: m.y, r: 40, life: 5, dir: m.dir }), t: 0 };
        m.fx.shadowless = true;
        G.audio.play('portal');
      }
      if (W.stop > 0) {
        W.stop -= dt;
        m.vx = 0;
        m.fx.run = 0;
        m.attackPhase = 'wind';
        if (W.stop <= 0) m.attackPhase = null;
        return true;
      }
      if (!m.onGround) return false;
      const [lo, hi] = m.bounds();
      if (aggro && P.alive()) W.home += (P.x - W.home) * Math.min(1, dt * 0.8);
      let d = W.to - m.x;
      if (Math.abs(d) < 24 || W.to < lo - 1 || W.to > hi + 1) {
        let side = -U.sign(m.x - W.home) || (Math.random() < 0.5 ? -1 : 1);
        if (Math.abs(m.x - W.home) < 60) side = -m.dir || 1;
        let to = U.clamp(W.home + side * R(250, 350), lo, hi);
        if (Math.abs(to - m.x) < 90) to = U.clamp(m.x - side * R(250, 350), lo, hi);
        // 玩家在附近同一層：只在自己這一側跑
        if (P.alive() && Math.abs(P.y - m.y) < 100 && Math.abs(P.x - m.x) < 600) {
          const ps = U.sign(m.x - P.x) || 1;
          if ((to - P.x) * ps < 70) to = U.clamp(P.x + ps * R(90, 150), lo, hi);
          if (Math.abs(to - m.x) < 40) to = U.clamp(P.x + ps * R(300, 380), lo, hi);
        }
        W.to = to;
        d = W.to - m.x;
      }
      const top = m.def.speed * 3.4 * (m.slowT > 0 ? 0.5 : 1);
      const v = Math.min(top, 60 + Math.abs(d) * 4);
      m.vx = U.sign(d) * v;
      m.dir = U.sign(d) || m.dir;
      m.fx.run = v > 120 ? 1 : v / 120;
      return true;
    },
    onDie(m) {
      if (m.shade) m.shade.z.life = 0;
    },
  };

  // ═════ 雪女（dreamsheep）：暴風雪（取代原本的睡意寒霧；冰簪保留） ═════
  // 預警 0.6 秒（舉袖、髮與和服往前狂飄、地上一片淡淡的扇形）→ 1.2 秒的暴風雪往面向吹 350–450px。
  // 範圍裡的玩家：一下 atk×0.6，同時被往外吹：一次速度衝量（水平＋一點往上）＋0.5 秒遞減的風力，
  // 總共約 250–350px；推的終點夾在地圖內、而且底下要有平台（不會吹進空處）。玩家無敵時間內不會被吹。
  AB.blizzard = {
    update(m, dt, P, aggro) {
      const B = m.bz;
      if (B) {
        m.vx = 0;
        B.t += dt;
        if (B.ph === 'tele') {
          m.attackPhase = 'wind';
          m.fx.puff = Math.min(1, B.t / 0.6);
          m.fx.gale = Math.min(1, B.t / 0.6);
          if (B.t >= 0.6) {
            B.ph = 'blow';
            B.t = 0;
            m.attackPhase = 'strike';
            G.audio.play('spore');
          }
          return true;
        }
        m.fx.puff = 1;
        m.fx.gale = 1;
        if (!B.hit && P.alive() && !(P.invT > 0)) {
          const dx = (P.x - B.x) * B.dir;
          if (dx > -10 && dx < B.len && Math.abs(P.y - 30 - (B.y - 40)) < 50 + Math.max(0, dx) * 0.22) {
            B.hit = true;
            if (P.hurt(Math.round(m.atk * 0.6), B.x)) blowAway(P, B.dir);
          }
        }
        if (B.t >= 1.2) {
          m.bz = null;
          m.attackPhase = null;
        }
        return true;
      }
      if ((m.fx.gale || 0) > 0) m.fx.gale = Math.max(0, m.fx.gale - dt * 2.5);
      if ((m.fx.puff || 0) > 0) m.fx.puff = Math.max(0, m.fx.puff - dt * 2);
      m.bzCd = (m.bzCd == null ? R(1.5, 3) : m.bzCd) - dt;
      const pin = m.icepinSt && m.icepinSt.ph;
      if (!pin && aggro && m.bzCd <= 0 && near(m, P, 380, 90)) {
        m.bzCd = R(5, 6.5);
        m.dir = U.sign(P.x - m.x) || m.dir;
        m.bz = { ph: 'tele', t: 0, dir: m.dir, x: m.x, y: m.y, len: R(350, 450), hit: false };
        say(m, '吹雪——', '#dff4ff');
        return true;
      }
      return false;
    },
  };
  function blowAway(P, dir) {
    const map = G.world.map;
    let D = R(250, 350);
    // 終點：地圖內、底下要有平台（一路縮短直到安全）
    while (D > 0) {
      const ex = P.x + dir * D;
      if (ex > 30 && ex < map.w - 30) {
        const pb = G.physics.platformBelow ? G.physics.platformBelow(map, ex, P.y - 20) : 0;
        if (pb >= 0) break;
      }
      D -= 30;
    }
    D = Math.max(0, D);
    const lim = P.x + dir * D;
    P.vx = dir * D * 2.7;
    P.vy = Math.min(P.vy, -300);
    P.onGround = false;
    P.climbing = -1;
    MM.push = { dir, t: 0, lim };
    MM.frost = 0.9;
  }

  // ═════ 古松樹靈（heartcedar）：松果機關槍（取代原本的 ranged 冰錐；心核保留） ═════
  // 預警 0.65 秒：紮根、往後仰，朝玩家那一側的樹瘤膨脹發光；一條細瞄準線鎖在「預警開始時」玩家的位置（之後不追）。
  // 連射 1.1 秒：8–12 顆（lowFx 6 顆）沿著鎖定的線、±4° 散布射出。每顆 atk×0.35；一輪最多打中 4 顆。冷卻 4–5 秒。
  // 表現：m.fx.lean、m.fx.knot、m.fx.recoil、m.pcLine、MM.cones。
  AB.pinecone = {
    update(m, dt, P, aggro) {
      const C = m.pcS;
      if ((m.fx.recoil || 0) > 0) m.fx.recoil = Math.max(0, m.fx.recoil - dt * 7);
      if (C) {
        m.vx = 0;
        C.t += dt;
        if (C.ph === 'tele') {
          m.attackPhase = 'wind';
          m.fx.lean = Math.min(1, C.t / 0.3);
          m.fx.knot = Math.min(1, C.t / 0.65);
          if (C.t >= 0.65) {
            C.ph = 'burst';
            C.t = 0;
            C.shot = 0;
            m.attackPhase = 'strike';
          }
          return true;
        }
        if (C.ph === 'burst') {
          m.fx.knot = 1;
          while (C.shot < C.n && C.t >= (C.shot * 1.1) / C.n) {
            const a = C.a + ((R(-4, 4) * Math.PI) / 180);
            MM.cones.push({ x: C.x, y: C.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, t: 0, life: 1.6, rot: R(0, 6.3), vr: R(14, 22) * (Math.random() < 0.5 ? -1 : 1), dmg: Math.round(m.atk * 0.35), burst: C.burst, dead: false });
            C.shot++;
            m.fx.recoil = 1;
            ev({ k: 'bark', x: m.x - m.dir * 10, y: m.y - m.h * (m.scale || 1) * R(0.35, 0.7), dir: -m.dir });
            if (C.shot % 2) G.audio.play('featherShot');
          }
          if (C.t >= 1.25) {
            C.ph = 'rec';
            C.t = 0;
          }
          return true;
        }
        m.fx.lean = Math.max(0, 1 - C.t / 0.4);
        m.fx.knot = Math.max(0, 1 - C.t / 0.3);
        if (C.t >= 0.4) {
          m.pcS = null;
          m.attackPhase = null;
        }
        return true;
      }
      m.pcCd = (m.pcCd == null ? R(1.5, 2.5) : m.pcCd) - dt;
      if (aggro && m.pcCd <= 0 && P.alive() && Math.abs(P.x - m.x) < 480 && Math.abs(P.y - m.y) < 220) {
        m.pcCd = R(4, 5);
        m.dir = U.sign(P.x - m.x) || m.dir;
        const sc = m.scale || 1;
        const x = m.x + m.dir * 34 * sc;
        const y = m.y - m.h * sc * 0.62;
        const a = Math.atan2(P.y - 30 - y, P.x - x);
        m.pcS = { ph: 'tele', t: 0, x, y, a, n: lowFx() ? 6 : 8 + ((Math.random() * 5) | 0), burst: { hits: 0 } };
        m.pcLine = { x, y, a, len: 560, t0: G.time, dur: 0.65 };
        return true;
      }
      return false;
    },
  };

  // ═════ 九尾封印狐（silencefox）：更多、更大的狐火 ═════
  // 0.6 秒召喚：尾巴張開，一條條尾尖依序點亮一團狐火（5–7 團，lowFx 4 團）→ 放出：
  //   有的往上畫一道高弧再追、有的先繞著牠轉一圈再弱追蹤、有的邊晃邊追。每團 atk×0.8（和原本一樣），
  //   判定半徑 11→14（1.3 倍），一次施放最多打中 3 團。表現：m.fx.aura、MM.orbs（畫成 1.7 倍大）。
  AB.foxfire = {
    update(m, dt, P, aggro) {
      if (m.ffT > 0) {
        m.ffT -= dt;
        m.vx = 0;
        m.fx.aura = Math.min(1, (m.fx.aura || 0) + dt * 2.5);
        m.attackPhase = 'wind';
        const k = 1 - m.ffT / 0.6;
        const F = m.ffS;
        if (F) {
          for (let i = 0; i < F.orbs.length; i++) {
            const o = F.orbs[i];
            const ang = Math.PI * (0.95 - (0.6 * i) / Math.max(1, F.orbs.length - 1));
            o.x = m.x + m.dir * (Math.cos(ang) * 78 - 18);
            o.y = m.y - (m.hover || 0) - 44 - Math.sin(ang) * 58;
            o.lit = Math.max(0, Math.min(1, (k - i * 0.07) * 3));
            if (o.lit > 0 && !o.litEv) {
              o.litEv = true;
              ev({ k: 'foxlit', x: o.x, y: o.y });
            }
          }
        }
        if (m.ffT <= 0) {
          m.attackPhase = null;
          m.fx.aura = 0;
          G.audio.play('spiritShot');
          if (F) {
            for (const o of F.orbs) {
              o.ph = 'fly';
              o.lit = 1;
              o.t = 0;
              const out = Math.atan2(o.y - (m.y - 44), o.x - m.x);
              if (o.mode === 'arc') {
                o.vx = Math.cos(out) * 90 + m.dir * 60;
                o.vy = -260;
              } else if (o.mode === 'circle') {
                o.cx = m.x;
                o.cy = m.y - (m.hover || 0) - 50;
                o.ca = Math.atan2(o.y - o.cy, o.x - o.cx);
                o.vx = 0;
                o.vy = 0;
              } else {
                o.vx = Math.cos(out) * 110;
                o.vy = Math.sin(out) * 110;
              }
            }
          }
          m.ffS = null;
        }
        return true;
      }
      if ((m.fx.aura || 0) > 0) m.fx.aura = Math.max(0, m.fx.aura - dt * 3);
      m.ffCd = (m.ffCd == null ? R(1.5, 3) : m.ffCd) - dt;
      if (aggro && m.ffCd <= 0 && near(m, P, 460, 160)) {
        m.ffCd = R(3.8, 4.6);
        m.ffT = 0.6;
        m.dir = U.sign(P.x - m.x) || m.dir;
        const n = lowFx() ? 4 : 5 + ((Math.random() * 3) | 0);
        const cast = { hits: 0 };
        const modes = ['arc', 'circle', 'wobble'];
        const orbs = [];
        for (let i = 0; i < n; i++) {
          const o = { ph: 'charge', m, x: m.x, y: m.y - 60, vx: 0, vy: 0, t: 0, life: 3.6, r: 14, dmg: Math.round(m.atk * 0.8), cast, mode: modes[i % 3], lit: 0, seed: Math.random() * 9, dead: false, trail: [] };
          orbs.push(o);
          MM.orbs.push(o);
        }
        if (MM.orbs.length > 40) MM.orbs.splice(0, MM.orbs.length - 40);
        m.ffS = { orbs };
        say(m, '狐火！', '#ffcf6a');
        return true;
      }
      return false;
    },
    onDie(m) {
      if (m.ffS) m.ffS.orbs.forEach((o) => (o.dead = true));
      m.ffS = null;
    },
  };

  // ═════ 雪男（avalanchehare）：越滾越大的雪球，最後炸成一片雪晶 ═════
  // 預警 0.5 秒：挖雪、兩手拍成一顆球（m.fx.kick 0→1 當作拍球的進度，m.fx.scoop 是挖雪）→ 雪球貼著地表往前滾，
  // 約 450px／1.5 秒內半徑從 20 長到 64，越大滾越快，沾上小石子、樹枝。碰到玩家（判定跟著半徑變大）一下 atk×1.2（和原本一樣）並提早炸開；
  // 滾完、撞到陡坡或平台邊緣也會炸：局部白光＋8–14 片雪晶（lowFx 6 片）往外拋、再飄落，每片 atk×0.3，一次最多打中 2 片。
  AB.avalanche = {
    update(m, dt, P, aggro) {
      if (m.kkT > 0) {
        m.kkT -= dt;
        m.vx = 0;
        const k = 1 - m.kkT / 0.5;
        m.fx.scoop = k < 0.45 ? k / 0.45 : Math.max(0, 1 - (k - 0.45) / 0.2);
        m.fx.kick = Math.min(1, k * 1.4);
        m.attackPhase = m.kkT > 0.08 ? 'wind' : 'strike';
        if (m.kkT <= 0) {
          m.attackPhase = null;
          m.fx.kick = 0;
          m.fx.scoop = 0;
          G.audio.play('swing');
          const x = m.x + m.dir * 34;
          if (m.onGround) MM.balls.push({ m, x, y: m.y, plat: m.plat, dir: m.dir, r: 20, dist: 0, t: 0, rot: 0, dmg: Math.round(m.atk * 1.2), shardDmg: Math.round(m.atk * 0.3), bits: [] });
          if (MM.balls.length > 6) MM.balls.shift();
        }
        return true;
      }
      m.kkCd = (m.kkCd == null ? R(1, 2.5) : m.kkCd) - dt;
      if (aggro && m.kkCd <= 0 && m.onGround && near(m, P, 440, 80)) {
        m.kkCd = R(3.2, 4);
        m.kkT = 0.5;
        m.dir = U.sign(P.x - m.x) || m.dir;
        return true;
      }
      return false;
    },
  };
  MM.balls = [];
  MM.shards = [];
  function burstBall(b) {
    ev({ k: 'snowburst', x: b.x, y: b.y - b.r, r: b.r });
    const n = lowFx() ? 6 : 8 + ((Math.random() * 7) | 0);
    const cap = { hits: 0 };
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + ((i / (n - 1)) - 0.5) * 2.4 + R(-0.12, 0.12);
      const sp = R(170, 320);
      MM.shards.push({ x: b.x, y: b.y - b.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, t: 0, life: R(1.3, 1.7), rot: R(0, 6.3), vr: R(-6, 6), s: R(5, 8), dmg: b.shardDmg, cap, seed: R(0, 9) });
    }
    if (MM.shards.length > 60) MM.shards.splice(0, MM.shards.length - 60);
  }
  function tickSnow(dt, P, map) {
    for (let i = MM.balls.length - 1; i >= 0; i--) {
      const b = MM.balls[i];
      b.t += dt;
      const sp = 230 + (b.r - 20) * 3.2;
      const nx = b.x + b.dir * sp * dt;
      const pf = map.platforms[b.plat];
      let pop = false;
      if (!pf || nx < pf[0] + 4 || nx > pf[1] - 4) pop = true; // 滾到平台邊緣
      else {
        const ny = G.physics.surfaceY(map, b.plat, nx);
        if ((b.y - ny) / Math.max(1, Math.abs(nx - b.x)) > 1.3) pop = true; // 撞上陡坡／坑壁
        else {
          b.dist += Math.abs(nx - b.x);
          b.x = nx;
          b.y = ny;
        }
      }
      b.r = Math.min(64, 20 + (b.dist / 450) * 44);
      b.rot += (b.dir * sp * dt) / b.r;
      if (!pop && P.alive() && hitP(P, b.x, b.y - b.r, b.r * 0.9)) {
        P.hurt(b.dmg, b.x - b.dir * 10);
        pop = true;
      }
      if (b.dist > 470 || b.t > 2.4) pop = true;
      if (pop) {
        burstBall(b);
        MM.balls.splice(i, 1);
      }
    }
    for (let i = MM.shards.length - 1; i >= 0; i--) {
      const s = MM.shards[i];
      s.t += dt;
      // 先往外拋，之後像雪花一樣左右飄著落下
      const drag = s.t > 0.35 ? 2.6 : 0.6;
      s.vx *= 1 - Math.min(1, drag * dt);
      s.vy += (s.vy > 70 ? 0 : 700) * dt;
      if (s.vy > 70) s.vy = 70 + (s.vy - 70) * (1 - Math.min(1, 4 * dt));
      s.x += (s.vx + (s.t > 0.35 ? Math.sin(s.t * 5 + s.seed) * 40 : 0)) * dt;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
      let gone = s.t > s.life || s.y > G.physics.groundY(map, s.x) + 4;
      if (!gone && s.cap.hits < 2 && P.alive() && hitP(P, s.x, s.y, 9)) {
        if (P.hurt(s.dmg, s.x)) s.cap.hits++;
        gone = true;
      }
      if (gone) MM.shards.splice(i, 1);
    }
  }

  // ═════ 每幀推進 ═════
  function hitP(P, cx, cy, r) {
    const hb = P.hitbox();
    const x = U.clamp(cx, hb.x, hb.x + hb.w);
    const y = U.clamp(cy, hb.y, hb.y + hb.h);
    return Math.hypot(x - cx, y - cy) < r;
  }
  function tick(dt) {
    const P = G.player;
    const map = G.world.map;
    // 鐮鼬的殘影
    for (let i = MM.ghosts.length - 1; i >= 0; i--) {
      const e = MM.ghosts[i];
      if (!e.hit && e.z.t >= 1.0) {
        e.hit = true;
        G.audio.play('swing');
        if (P.alive() && U.overlap({ x: e.z.x - 40 + e.z.dir * 20, y: e.z.y - 50, w: 80, h: 50 }, P.hitbox())) P.hurt(e.dmg, e.z.x);
      }
      if (e.z.t >= e.z.life) MM.ghosts.splice(i, 1);
    }
    for (let i = MM.iai.length - 1; i >= 0; i--) {
      MM.iai[i].t += dt;
      if (MM.iai[i].t > 0.55) MM.iai.splice(i, 1);
    }
    // 雷獸的落雷
    for (let i = MM.bolts.length - 1; i >= 0; i--) {
      const b = MM.bolts[i];
      b.t += dt;
      if (!b.struck && b.t >= b.tele) {
        b.struck = true;
        G.audio.play('thunder');
        G.fx.shake(2, 0.08);
        if (P.alive() && Math.abs(P.x - b.x) < 34 && P.y <= b.y + 12 && P.y >= b.y - 170) P.hurt(b.dmg, b.x);
      }
      if (b.t > b.tele + 0.6) MM.bolts.splice(i, 1);
    }
    // 芬里爾的影池
    for (let i = MM.pools.length - 1; i >= 0; i--) {
      const q = MM.pools[i];
      q.t += dt;
      if (!q.burst && q.t >= q.tele) {
        q.burst = true;
        G.audio.play('swing');
        if (P.alive() && Math.abs(P.x - q.x) < 50 && P.y > q.y - 80 && P.y <= q.y + 12 && P.hurt(q.dmg, q.x)) {
          slowP(P, 1.1, 0.15);
          G.fx.text(P.x, P.y - 70, '被影刃刺中了！', '#b8a0ff', 15, 0.8);
        }
      }
      if (q.t > q.tele + 0.7) MM.pools.splice(i, 1);
    }
    // 古松的松果
    for (let i = MM.cones.length - 1; i >= 0; i--) {
      const c = MM.cones[i];
      c.t += dt;
      c.vy += 90 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
      let pop = c.t > c.life || c.x < -40 || c.x > map.w + 40;
      if (!pop && P.alive() && hitP(P, c.x, c.y, 10)) {
        if (c.burst.hits < 4 && P.hurt(c.dmg, c.x - c.vx * 0.01)) c.burst.hits++;
        pop = true;
      }
      if (!pop && c.y >= G.physics.groundY(map, c.x) - 2) pop = true;
      if (pop) {
        ev({ k: 'cone', x: c.x, y: c.y, a: Math.atan2(c.vy, c.vx) });
        MM.cones.splice(i, 1);
      }
    }
    // 九尾狐火
    for (let i = MM.orbs.length - 1; i >= 0; i--) {
      const o = MM.orbs[i];
      if (o.dead || (o.ph === 'charge' && (o.m.dead || !(o.m.ffT > 0)))) {
        MM.orbs.splice(i, 1);
        continue;
      }
      if (o.ph === 'charge') continue;
      o.t += dt;
      const toP = Math.atan2(P.y - 34 - o.y, P.x - o.x);
      const steer = (turn, want) => {
        const sp = Math.hypot(o.vx, o.vy) || 1;
        const cur = Math.atan2(o.vy, o.vx);
        let da = toP - cur;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        const na = cur + U.clamp(da, -turn * dt, turn * dt);
        const ns = sp + (want - sp) * Math.min(1, dt * 2.5);
        o.vx = Math.cos(na) * ns;
        o.vy = Math.sin(na) * ns;
      };
      if (o.mode === 'arc') {
        if (o.t < 0.45) o.vy += 380 * dt;
        else steer(Math.min(5, 600 / 250), 250);
      } else if (o.mode === 'circle') {
        if (o.t < 0.8) {
          o.ca += dt * 7.5;
          const rr = 70 + o.t * 20;
          const nx = o.cx + Math.cos(o.ca) * rr;
          const ny = o.cy + Math.sin(o.ca) * rr * 0.7;
          o.vx = (nx - o.x) / Math.max(dt, 1e-3);
          o.vy = (ny - o.y) / Math.max(dt, 1e-3);
        } else steer(1.3, 220);
      } else if (o.t > 0.3) {
        steer(2.2, 230);
        const sp = Math.hypot(o.vx, o.vy) || 1;
        const w = Math.sin(o.t * 7 + o.seed) * 140;
        o.x += (-o.vy / sp) * w * dt;
        o.y += (o.vx / sp) * w * dt;
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.trail.push(o.x, o.y);
      if (o.trail.length > 16) o.trail.splice(0, 2);
      let pop = o.t > o.life;
      if (!pop && o.t < o.life - 0.3 && P.alive() && hitP(P, o.x, o.y, o.r)) {
        if (o.cast.hits < 3 && P.hurt(o.dmg, o.x)) o.cast.hits++;
        pop = true;
      }
      if (pop) {
        ev({ k: 'foxpop', x: o.x, y: o.y });
        MM.orbs.splice(i, 1);
      }
    }
    // 雪女的吹飛：遞減的風力＋終點限制
    const pu = MM.push;
    if (pu) {
      pu.t += dt;
      if (P.dead || P.climbing >= 0) MM.push = null;
      else {
        if (pu.t < 0.5) P.vx += pu.dir * 1500 * (1 - pu.t / 0.5) * dt;
        if ((P.x - pu.lim) * pu.dir >= 0) {
          P.x = pu.lim;
          if (P.vx * pu.dir > 0) P.vx = 0;
          MM.push = null;
        } else if (pu.t > 1.2) MM.push = null;
      }
    }
    if (MM.frost > 0) MM.frost = Math.max(0, MM.frost - dt);
    tickSnow(dt, P, map);
  }

  const baseTick = AB.tick;
  const baseReset = AB.reset;
  AB.tick = function (dt) {
    baseTick.call(AB, dt);
    tick(dt);
  };
  AB.reset = function () {
    baseReset.call(AB);
    MM.ghosts.length = MM.iai.length = MM.bolts.length = MM.pools.length = MM.orbs.length = MM.cones.length = MM.ev.length = MM.balls.length = MM.shards.length = 0;
    MM.push = null;
    MM.frost = 0;
  };
})();
