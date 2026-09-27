// 五轉技能的執行與特效（資料在 js/data/skills5.js）。
// 兩招都是好幾秒的大演出，狀態放在 ults 裡，每幀由 tick3 推進、由 fx.drawCuts 畫出來。
//   冥道殘月破：月牙射出 → 張開成完全圓形的黑洞（裡面是星辰與銀河）→ 把敵人吸進去連續傷害 → 闔上爆開
//   地爆天星：黑色核心往前扔 → 目標被吸到核心旁定住 → 10 發黑閃，每一發都是一次重擊
(function () {
  'use strict';
  const U = G.util;
  const X = G.skillExec;
  const TAU = Math.PI * 2;
  const alive = (m) => X.alive(m);
  const midY = (m) => m.y - m.h * (m.scale || 1) * 0.5;
  const ults = [];

  // 沒有目標時退回 MP 和冷卻
  function refund(P, S, id, lv) {
    const omni = P.passive('omniscience');
    P.mp = Math.min(P.maxMp, P.mp + Math.max(1, Math.round(S.mp(lv) * (omni ? 1 - omni.mpCut : 1))));
    if (P.cds) P.cds[id] = 0;
  }

  // 黑洞裡的宇宙：三層往同一個方向流動的星星（遠的慢、近的快）＋好幾個各自旋轉、漂移的小銀河
  const STARS = [];
  for (let i = 0; i < 220; i++) {
    const layer = i % 3;
    STARS.push({ x: U.rand(-1, 1), y: U.rand(-1, 1), layer, s: layer === 2 ? U.rand(1.2, 2.2) : layer === 1 ? U.rand(0.8, 1.4) : U.rand(0.4, 0.9), tw: Math.random() * TAU, c: U.pick(['255,255,255', '255,255,255', '205,220,255', '255,228,240', '220,200,255']) });
  }
  const GAL_COLORS = [['255,200,240', '190,120,255'], ['200,225,255', '110,150,255'], ['255,235,200', '255,150,120'], ['220,255,245', '100,210,220'], ['255,255,255', '200,170,255']];
  const GALAXIES = [];
  for (let i = 0; i < 6; i++) {
    const dots = [];
    const arms = 2 + (i % 2);
    for (let k = 0; k < 70; k++) {
      const t = k / 70;
      const arm = k % arms;
      dots.push({ a: (arm / arms) * TAU + t * 4.2 + U.rand(-0.3, 0.3), d: 0.12 + t * 0.9 + U.rand(-0.05, 0.05), s: U.rand(0.5, 1.4) * (1.1 - t * 0.6) });
    }
    GALAXIES.push({
      x: [-0.4, 0.45, -0.1, 0.6, -0.65, 0.15][i], y: [-0.35, 0.3, 0.55, -0.55, 0.25, -0.05][i], size: i < 3 ? U.rand(0.38, 0.5) : U.rand(0.22, 0.3),
      tilt: U.rand(0, Math.PI), flat: U.rand(0.3, 0.65), spin: U.rand(0.4, 1.1) * (i % 2 ? 1 : -1),
      vx: U.rand(-0.05, -0.02), vy: U.rand(0.01, 0.03), col: GAL_COLORS[i % GAL_COLORS.length], dots,
    });
  }
  const wrap = (v) => ((((v + 1.25) % 2.5) + 2.5) % 2.5) - 1.25;

  Object.assign(X, {
    ults,

    // ═════════ 冥道殘月破 ═════════
    meidou: {
      start(P, S, id, lv) {
        P.action = { type: 'meidouCast', id, lv, t: 0, dur: S.castTime, done: false };
        P.vx = 0;
        P.glowT = 0.9;
        P.invT = Math.max(P.invT || 0, 0.6);
        G.fx.iaiDim = 0.55;
        G.audio.play('charge');
        // 刀尖畫出一道細細的月牙
        ults.push({ kind: 'crescentTrace', x: P.x + P.dir * 10, y: P.y - 44, dir: P.dir, t: 0, life: 0.45 });
      },
    },
    meidouCast: {
      update(P, a, dt) {
        P.vx = 0;
        if (a.done || a.t < 0.38) return;
        a.done = true;
        const S = G.data.skills[a.id];
        G.audio.play('sweep');
        G.audio.play('portal');
        G.fx.shake(4, 0.18);
        ults.push({ kind: 'meidou', phase: 'fly', x: P.x + P.dir * 50, y: P.y - 60, x0: P.x + P.dir * 50, dir: P.dir, t: 0, pt: 0, lv: a.lv, S, hit: [], tickT: 0, r: 0, spin: 0, size: 70, trail: [] });
      },
    },

    // ═════════ 地爆天星 ═════════
    chibaku: {
      start(P, S, id, lv) {
        const list = G.combat.targets().filter((m) => U.dist(m.x, midY(m), P.x, P.y - 30) < S.radius);
        // 優先 Boss，其次血量最多的
        list.sort((p, q) => (q.isBoss ? 1e9 : 0) + q.maxHp - ((p.isBoss ? 1e9 : 0) + p.maxHp));
        const m = list[0];
        if (!m) {
          refund(P, S, id, lv);
          G.hud.toast('附近沒有目標', '#cfe');
          return;
        }
        P.action = { type: 'chibakuCast', id, lv, t: 0, dur: S.castTime, done: false, m };
        P.vx = 0;
        P.glowT = 0.6;
        G.fx.iaiDim = 0.35;
        G.audio.play('charge');
      },
    },
    chibakuCast: {
      update(P, a, dt) {
        P.vx = 0;
        if (a.done || a.t < 0.25) return;
        a.done = true;
        const S = G.data.skills[a.id];
        const m = a.m;
        if (!alive(m)) return;
        G.audio.play('portal');
        // 核心往前扔到半路；Boss 拉不動，核心停在牠身邊
        const dir = U.sign(m.x - P.x) || P.dir;
        const gap = Math.abs(m.x - P.x);
        const size = m.isBoss ? 58 : Math.max(58, Math.min(110, Math.max(m.w, m.h) * (m.scale || 1) * 0.6 + 24));
        // 一般怪：核心往畫面視覺中心的上方扔，目標被吸上天，在空中壓成石球
        // Boss 拉不動：核心停在牠身邊
        let tx, ty;
        if (m.isBoss) {
          tx = m.x - dir * (m.w * (m.scale || 1) * 0.5 + 120);
          ty = midY(m);
        } else {
          const cx = G.cam.x + G.W / 2;
          tx = cx * 0.6 + m.x * 0.4;
          ty = Math.min(G.cam.y + G.H * 0.28, m.y - m.h * (m.scale || 1) - 110);
          ty = Math.max(ty, G.cam.y + size + 20);
        }
        // 原本的懸浮高度：牠如果還飄在上一顆地爆天星／冥道的半空中，用那時記下的高度，不能把半空當成地面
        if (!m.chiLift) m.chiBase = (m.sucked ? m.baseHover : m.hover) || 0;
        m.chiLift = true;
        m.chiFall = false;
        ults.push({ kind: 'chibaku', phase: 'throw', m, S, lv: a.lv, t: 0, pt: 0, dir, sx: P.x + dir * 20, sy: P.y - 50, tx, ty, ox: P.x + dir * 20, oy: P.y - 50, R: 7, n: 0, flashT: 0, spin: 0, size, groundY: m.y, rocks: [], shell: [], flying: [], spawnT: 0 });
      },
    },

    // ── 每幀推進 ──
    tickUlt(dt) {
      for (let i = ults.length - 1; i >= 0; i--) {
        const u = ults[i];
        u.t += dt;
        u.pt += dt;
        const done = u.kind === 'meidou' ? this.tickMeidou(u, dt) : u.kind === 'chibaku' ? this.tickChibaku(u, dt) : u.t >= u.life;
        if (done) ults.splice(i, 1);
      }
    },

    // 放開被黑洞吸住的怪：把懸浮高度換回真正的位置，讓牠們自然落回平台
    releaseSucked(u) {
      (u.sucked || []).forEach((m) => {
        if (!m.sucked || m.suckedBy !== u) return;
        m.sucked = false;
        m.suckedBy = null;
        // 同時被地爆天星抓著／正在摔回地面：交給地爆天星那邊處理高度
        if (m.chiLift) return;
        const lift = (m.hover || 0) - (m.baseHover || 0);
        m.hover = m.baseHover || 0;
        if (m.dead) return;
        m.y -= lift;
        // 落點：腳底下的平台；身體已經跨過某個平台就站在那個平台上（不能掉到平台底下、更不能掉出地圖）
        const map = G.world.map;
        const H = m.h * (m.scale || 1);
        let p = G.physics.platformBelow(map, m.x, m.y - 2);
        if (p < 0) p = G.physics.platformBelow(map, m.x, m.y - H);
        if (p < 0) p = 0;
        const surf = map.platforms[p][2];
        m.plat = p;
        m.vy = 0;
        if (m.y >= surf - 1) {
          m.y = surf;
          m.onGround = true;
        } else m.onGround = false;
      });
      u.sucked = [];
    },

    tickMeidou(u, dt) {
      const S = u.S;
      const R = S.radius;
      const inside = () => G.combat.targets().filter((m) => U.dist(m.x, midY(m), u.x, u.y) < R + m.w * 0.3).slice(0, S.targets);
      u.spin += dt * (u.phase === 'open' ? 0.9 : 0);
      if (u.phase === 'fly') {
        // 月牙往前射出、越飛越大，經過的敵人各打一下
        const k = Math.min(1, u.pt / 0.42);
        u.trail.unshift({ x: u.x, size: u.size });
        if (u.trail.length > 5) u.trail.pop();
        u.x = u.x0 + u.dir * S.travel * (1 - Math.pow(1 - k, 2.2));
        u.size = 70 + 170 * k;
        G.combat.targets().forEach((m) => {
          if (u.hit.indexOf(m) >= 0) return;
          if (Math.abs(m.x - u.x) < 50 + m.w * 0.4 && Math.abs(midY(m) - u.y) < u.size * 0.6) {
            u.hit.push(m);
            G.combat.hitMonster(m, S.mult(u.lv), { knock: 0, sound: 'spirit' });
          }
        });
        if (k >= 1) {
          u.phase = 'open';
          u.pt = 0;
          u.trail.length = 0;
          G.audio.play('bossWarn');
          G.fx.shake(5, 0.2);
          G.fx.ring(u.x, u.y, 'rgba(210,190,255,0.9)', R * 1.25, 0.4, 6);
        }
        return false;
      }
      if (u.phase === 'open') {
        // 黑洞張開：把敵人往中心吸，連續傷害
        u.r = R * (1 - Math.pow(1 - Math.min(1, u.pt / 0.28), 3));
        G.fx.iaiDim = Math.max(G.fx.iaiDim, 0.3);
        // 黑洞引力：圓外約 1.15 倍半徑內的怪也會被捲進來，越近越快，吸離地面懸在圓心附近
        const pullR = R * 1.15;
        u.sucked = u.sucked || [];
        // 同時有兩個黑洞時：每隻怪只屬於先抓到牠的那一個，另一個不碰
        G.combat.targets().filter((m) => !m.isBoss && !m.dead && (!m.sucked || m.suckedBy === u) && U.dist(m.x, midY(m), u.x, u.y) < pullR).slice(0, S.targets * 2).forEach((m) => {
          if (!m.sucked) {
            m.sucked = true;
            m.suckedBy = u;
            m.baseHover = m.chiLift ? m.chiBase || 0 : m.hover || 0;
            u.sucked.push(m);
          }
          const d = U.dist(m.x, midY(m), u.x, u.y);
          const k = Math.min(1, dt * (d < R ? 4.5 : 2 + 3 * (1 - d / pullR)));
          // 不全部擠在同一點：各自停在圓心附近的一個小軌道上
          const idx = u.sucked.indexOf(m);
          const orb = Math.min(R * 0.55, 18 + idx * 9);
          const a = u.spin * 2 + idx * 2.4;
          const tx = u.x + Math.cos(a) * orb;
          const ty = u.y + Math.sin(a) * orb * 0.6;
          m.x += (tx - m.x) * k;
          const hv = m.y - m.h * (m.scale || 1) * 0.5 - ty;
          m.hover = (m.hover || 0) + (hv - (m.hover || 0)) * k;
          m.stunT = Math.max(m.stunT || 0, 0.3);
        });
        u.tickT -= dt;
        if (u.tickT <= 0 && u.pt > 0.25) {
          u.tickT = S.tick;
          inside().forEach((m) => G.combat.hitMonster(m, S.tickMult(u.lv), { knock: 0, sound: 'spirit', noFx: true }));
        }
        // 外面的光點被吸進去
        for (let k = 0; k < 2; k++) {
          const ang = Math.random() * TAU;
          const d = u.r * U.rand(1.15, 1.7);
          G.fx.particles.push({ x: u.x + Math.cos(ang) * d, y: u.y + Math.sin(ang) * d, vx: -Math.cos(ang) * d * 2.4, vy: -Math.sin(ang) * d * 2.4, life: 0.38, t: 0, size: U.rand(1.5, 3), color: U.pick(['#ffffff', '#d8c8ff']), grav: 0, shape: 'circle', drag: 0 });
        }
        if (u.pt >= S.open) {
          u.phase = 'close';
          u.pt = 0;
          G.audio.play('sweep');
        }
        return false;
      }
      if (u.phase === 'close') {
        // 闔上：圓縮成一道細縫，然後爆開
        u.r = R * Math.max(0, 1 - u.pt / 0.2);
        if (u.pt >= 0.2 && !u.boom) {
          u.boom = true;
          G.audio.play('thunder');
          G.fx.shake(7, 0.3);
          G.fx.addHitstop(0.08, true);
          G.fx.screenFlash('#ffffff', 0.55);
          G.fx.cut(u.x, u.y, 0, R * 2.6, { w: 9, life: 0.45, grow: 0.03, col: '200,170,255' });
          G.fx.ring(u.x, u.y, 'rgba(255,255,255,0.95)', R * 1.6, 0.45, 8);
          G.fx.ring(u.x, u.y, 'rgba(150,110,255,0.85)', R * 2.2, 0.6, 5);
          G.fx.burst(u.x, u.y, ['#ffffff', '#c8b0ff', '#8fb0ff'], 40, 620);
          this.releaseSucked(u);
          inside().forEach((m) => G.combat.hitMonster(m, S.closeMult(u.lv), { knock: 480, heavy: true, sound: 'double' }));
        }
        if (u.pt >= 0.5) this.releaseSucked(u);
        return u.pt >= 0.5;
      }
      return true;
    },

    tickChibaku(u, dt) {
      const S = u.S;
      const m = u.m;
      u.spin += dt * 3;
      // 飛散的碎石（炸開後）
      for (let i = u.flying.length - 1; i >= 0; i--) {
        const f = u.flying[i];
        f.t += dt;
        f.vy += 1400 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += f.vr * dt;
        if (f.t > f.life) u.flying.splice(i, 1);
      }
      const release = () => {
        m.pull = 0;
        // 被吸上天的怪：石球崩掉後摔回原本的地面
        if (!m.isBoss && (m.hover || 0) > (m.chiBase || 0) + 1) {
          m.chiFall = true;
          m.chiFallV = 0;
        }
      };
      if (!alive(m) && u.phase !== 'end') {
        u.phase = 'end';
        u.pt = 0;
        this.shatter(u, 0.6);
        release();
      }
      if (u.phase === 'throw') {
        const k = Math.min(1, u.pt / 0.34);
        u.ox = u.sx + (u.tx - u.sx) * k;
        u.oy = u.sy + (u.ty - u.sy) * k - Math.sin(k * Math.PI) * 70;
        if (k >= 1) {
          u.phase = 'pull';
          u.pt = 0;
          G.audio.play('bossWarn');
          G.fx.ring(u.ox, u.oy, 'rgba(24,20,34,0.75)', 160, 0.4, 4);
          G.fx.shake(6, 0.25);
        }
        return false;
      }
      const hold = () => {
        m.vx = 0;
        m.stunT = Math.max(m.stunT || 0, 0.3);
        if (m.isBoss) {
          // Boss 拉不動：身體往核心那一側傾斜、發抖，像在抵抗引力
          m.pull = U.sign(u.ox - m.x) * Math.min(1, 0.4 + u.t * 0.5);
        } else {
          m.x += (u.ox - m.x) * Math.min(1, dt * 6);
          m.heldT = Math.max(m.heldT || 0, 0.05); // 被引力抓住：不能行動，但不是冰凍（不畫冰塊）
        }
      };
      if (u.phase === 'pull') {
        u.R = 7 + 11 * Math.min(1, u.pt / 0.3);
        hold();
        if (!m.isBoss) {
          // 目標被吸向空中的核心：用 hover 把身體抬上去（地面位置不變，放開後會摔回來）
          const want = Math.max(m.chiBase || 0, m.y - u.oy - m.h * (m.scale || 1) * 0.5);
          m.hover = (m.hover || 0) + (want - (m.hover || 0)) * Math.min(1, dt * 5);
        }
        // 地面的石塊、連根撕起的土塊被扯起來，繞著飛進核心
        u.spawnT -= dt;
        if (u.spawnT <= 0 && u.shell.length + u.rocks.length < 40 && u.pt < 1.05) {
          u.spawnT = 0.026;
          // 只從拉扯點底下真正的平台表面撕起石塊（在平台範圍內）；附近沒有平台就是從空中飛來的碎石
          const surf = G.art.chibakuFx.surface(u);
          const r = { t: 0, rot: Math.random() * TAU, vr: U.rand(-6, 6), s: U.rand(0.7, 1.25), tone: (Math.random() * 3) | 0 };
          const x = surf ? U.rand(Math.max(surf.x0 + 10, u.ox - 420), Math.min(surf.x1 - 10, u.ox + 420)) : 0;
          if (surf && Math.abs(x - u.ox) >= 50) {
            Object.assign(r, { x, y: surf.y - 4, vx: 0, vy: -U.rand(200, 380), kind: Math.random() < 0.3 ? 'chunk' : 'stone' });
          } else {
            const a = Math.random() * TAU;
            const d = U.rand(240, 420);
            Object.assign(r, { x: u.ox + Math.cos(a) * d, y: u.oy + Math.sin(a) * d * 0.75, vx: -Math.sin(a) * U.rand(60, 160), vy: Math.cos(a) * U.rand(60, 160), kind: 'stone', air: true });
          }
          u.rocks.push(r);
        }
        for (let i = u.rocks.length - 1; i >= 0; i--) {
          const r = u.rocks[i];
          r.t += dt;
          // 先被扯起來，接著被核心吸過去（帶一點旋轉的弧度）
          const dx = u.ox - r.x;
          const dy = u.oy - r.y;
          const d = Math.hypot(dx, dy) || 1;
          const pull = 4200 * Math.min(1, r.t * 3);
          r.vx += (dx / d) * pull * dt - (dy / d) * 700 * dt;
          r.vy += (dy / d) * pull * dt + (dx / d) * 700 * dt;
          r.vx *= 1 - 2.5 * dt;
          r.vy *= 1 - 2.5 * dt;
          r.x += r.vx * dt;
          r.y += r.vy * dt;
          r.rot += r.vr * dt;
          if (d < u.size * 0.95) {
            u.rocks.splice(i, 1);
            // 抵達後滑到平均分布的位置（黃金角），石球才會長得圓
            const idx = u.shell.length;
            u.shell.push({ a0: Math.atan2(r.y - u.oy, r.x - u.ox), a: idx * 2.39996, d: idx < 14 ? U.rand(0.55, 0.8) : U.rand(0.85, 1.02), rot: r.rot, s: r.s, kind: r.kind, tone: r.tone, t: 0 });
            if (Math.random() < 0.35) G.audio.play('rockHit');
          }
        }
        u.shell.forEach((sh) => {
          sh.t += dt;
        });
        if (u.pt >= 1.45) {
          u.rocks.forEach((r) => u.shell.push({ a0: Math.atan2(r.y - u.oy, r.x - u.ox), a: u.shell.length * 2.39996, d: U.rand(0.85, 1.02), rot: r.rot, s: r.s, kind: r.kind, tone: r.tone, t: 0 }));
          u.rocks.length = 0;
          u.phase = 'squeeze';
          u.pt = 0;
        }
        return false;
      }
      if (u.phase === 'squeeze') {
        // 石球被壓緊：越縮越小、越抖越厲害，石縫開始透出冷光
        hold();
        const k = Math.min(1, u.pt / 0.55);
        // 一段一段地往內咬緊：每一段一次悶響（美術那邊同步縮一格、噴一圈塵）；畫面不震，免得看久了累
        const step = Math.min(4, Math.floor(k * 5));
        if (step > (u.sqStep === undefined ? -1 : u.sqStep)) {
          u.sqStep = step;
          G.audio.play('rockHit');
        }
        if (u.pt >= 0.55) {
          u.phase = 'flash';
          u.pt = 0;
          u.flashT = 0.1;
          G.fx.addHitstop(0.06);
        }
        return false;
      }
      if (u.phase === 'flash') {
        // 10 發黑閃，每一發都是一次重擊
        hold();
        if (!m.isBoss) {
          const want = Math.max(m.chiBase || 0, m.y - u.oy - m.h * (m.scale || 1) * 0.5);
          m.hover = (m.hover || 0) + (want - (m.hover || 0)) * Math.min(1, dt * 10);
        }
        u.flashT -= dt;
        if (u.flashT <= 0 && u.n < S.hits) {
          const last = u.n === S.hits - 1;
          u.flashT = last ? 0.3 : 0.15;
          // Boss：黑閃打在牠靠近核心的那一側
          const hx = m.isBoss ? (m.x + u.ox) / 2 : u.ox;
          const hy = m.isBoss ? midY(m) : u.oy;
          // 黑閃打在石球上（Boss 則是打在牠身上）：冷色的石縫迸光、塵環、碎屑都畫在 js/art/skills5.js
          u.hitX = hx + U.rand(-18, 18);
          u.hitY = hy + U.rand(-18, 18);
          G.fx.kick((u.n % 2 ? -1 : 1) * 10, -3);
          // 每一發都震掉一兩顆石頭
          for (let k = 0; k < (last ? 0 : 2) && u.shell.length > 8; k++) {
            const sh = u.shell.splice((Math.random() * u.shell.length) | 0, 1)[0];
            this.fling(u, sh, 0.7);
          }
          if (alive(m)) G.combat.hitMonster(m, last ? S.finalMult(u.lv) : S.mult(u.lv), { knock: last ? 560 : 0, heavy: true, sound: 'crit' });
          G.audio.play('crit');
          if (last) {
            G.audio.play('thunder');
            G.audio.play('slam');
          } else G.audio.play('rockHit');
          G.fx.addHitstop(last ? 0.18 : 0.05, last);
          // 黑閃本身不震畫面；只有最後崩解時輕輕一震
          if (last) G.fx.shake(2.5, 0.15);
          u.n++;
          if (last) {
            u.phase = 'end';
            u.pt = 0;
            this.shatter(u, 1);
            release();
          }
        }
        return false;
      }
      // 核心塌縮消失，等碎石落完
      return u.pt >= 0.35 && u.flying.length === 0;
    },

    // 把外殼上的一顆石頭甩出去
    fling(u, sh, power) {
      const x = u.ox + Math.cos(sh.a) * u.size * sh.d;
      const y = u.oy + Math.sin(sh.a) * u.size * sh.d;
      const sp = U.rand(350, 750) * power;
      u.flying.push({ x, y, vx: Math.cos(sh.a) * sp, vy: Math.sin(sh.a) * sp - 250, rot: sh.rot, vr: U.rand(-12, 12), s: sh.s, kind: sh.kind, tone: sh.tone, t: 0, life: 1.1 });
    },
    // 整顆石球炸開
    shatter(u, power) {
      u.shell.forEach((sh) => this.fling(u, sh, power));
      u.shell.length = 0;
    },

    // ── 畫在世界座標上（由 fx.drawCuts 呼叫，在變暗之後、刀痕之前） ──
    drawUlt(ctx) {
      if (!ults.length) return;
      for (const u of ults) {
        ctx.save();
        if (u.kind === 'crescentTrace') this.drawTrace(ctx, u);
        else if (u.kind === 'meidou') this.drawMeidou(ctx, u);
        else if (u.kind === 'chibaku') this.drawChibaku(ctx, u);
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },

    // 起手：刀尖劃出的細月牙
    drawTrace(ctx, u) {
      const k = Math.min(1, u.t / 0.3);
      const fade = u.t > 0.3 ? Math.max(0, 1 - (u.t - 0.3) / 0.15) : 1;
      ctx.translate(u.x, u.y);
      ctx.scale(u.dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 58, -Math.PI * 0.7, -Math.PI * 0.7 + Math.PI * 1.35 * k);
      ctx.strokeStyle = 'rgba(200,170,255,' + (0.5 * fade).toFixed(3) + ')';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + fade.toFixed(3) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
    },

    // 月牙：黑色的新月，外緣一圈白光
    crescent(ctx, s, alpha) {
      const r1 = s * 0.5;
      const off = s * 0.24;
      ctx.beginPath();
      ctx.arc(0, 0, r1, -Math.PI / 2, Math.PI / 2);
      ctx.arc(-off, 0, Math.sqrt(r1 * r1 + off * off) * 0.97, Math.atan2(r1, off), -Math.atan2(r1, off), true);
      ctx.closePath();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#07040f';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(200,180,255,0.9)';
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.globalAlpha = 1;
    },

    drawMeidou(ctx, u) {
      if (u.phase === 'fly') {
        // 殘影
        u.trail.forEach((tr, i) => {
          ctx.save();
          ctx.translate(tr.x, u.y);
          ctx.scale(u.dir, 1);
          this.crescent(ctx, tr.size, 0.25 * (1 - i / u.trail.length));
          ctx.restore();
        });
        ctx.translate(u.x, u.y);
        ctx.scale(u.dir, 1);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, u.size * 0.2, 0, 0, u.size * 0.8);
        g.addColorStop(0, 'rgba(150,110,255,0.3)');
        g.addColorStop(1, 'rgba(150,110,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, u.size * 0.8, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        this.crescent(ctx, u.size, 1);
        return;
      }
      const r = u.r;
      if (r <= 0.5) return;
      ctx.translate(u.x, u.y);
      // 外圈柔光
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.45);
      halo.addColorStop(0, 'rgba(170,140,255,0.5)');
      halo.addColorStop(1, 'rgba(170,140,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.45, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // 完全圓形的黑洞：深空漸層
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      const space = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      space.addColorStop(0, '#1a1030');
      space.addColorStop(0.35, '#0a0616');
      space.addColorStop(0.85, '#03020a');
      space.addColorStop(1, '#120a26');
      ctx.fillStyle = space;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      const T = u.t;
      // 星星：三層以不同速度往左下流動，像在宇宙裡前進
      for (const st of STARS) {
        const sp = [0.05, 0.11, 0.22][st.layer];
        const x = wrap(st.x - T * sp) * r;
        const y = wrap(st.y + T * sp * 0.45) * r;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(T * (2 + st.layer) + st.tw));
        ctx.fillStyle = 'rgba(' + st.c + ',' + tw.toFixed(3) + ')';
        if (st.layer === 2 && st.s > 1.8) {
          ctx.fillRect(x - st.s * 2.2, y - 0.5, st.s * 4.4, 1);
          ctx.fillRect(x - 0.5, y - st.s * 2.2, 1, st.s * 4.4);
        }
        ctx.beginPath();
        ctx.arc(x, y, st.s, 0, TAU);
        ctx.fill();
      }
      // 銀河：每一個各自旋轉，慢慢漂過黑洞
      for (const gx of GALAXIES) {
        const cx = wrap(gx.x + T * gx.vx) * r;
        const cy = wrap(gx.y + T * gx.vy) * r;
        const R = gx.size * r;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(gx.tilt);
        ctx.scale(1, gx.flat);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
        glow.addColorStop(0, 'rgba(' + gx.col[0] + ',0.7)');
        glow.addColorStop(0.35, 'rgba(' + gx.col[1] + ',0.3)');
        glow.addColorStop(1, 'rgba(' + gx.col[1] + ',0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, TAU);
        ctx.fill();
        const rot = T * gx.spin;
        ctx.fillStyle = 'rgba(' + gx.col[0] + ',0.75)';
        for (const d of gx.dots) {
          const a = d.a + rot;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * d.d * R, Math.sin(a) * d.d * R, d.s * 1.4, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1.2, R * 0.07), 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      // 偶爾劃過的流星
      const ms = (T * 1.3) % 1;
      if (ms < 0.25) {
        const k = ms / 0.25;
        const sx = r * (0.7 - k * 1.6);
        const sy = r * (-0.5 + k * 0.7);
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + r * 0.18, sy - r * 0.08);
        ctx.stroke();
      }
      ctx.restore();
      // 被吸進去的敵人：淡紫色的影子在裡面旋轉
      const A = G.art;
      G.combat.targets().forEach((m) => {
        const d = U.dist(m.x, midY(m), u.x, u.y);
        if (d > r) return;
        ctx.save();
        ctx.translate(m.x - u.x, midY(m) - u.y);
        ctx.rotate(u.t * 2.5);
        ctx.scale(0.75, 0.75);
        ctx.globalAlpha = 0.4;
        const fake = Object.assign(Object.create(m), { x: 0, y: m.h * (m.scale || 1) * 0.5, dead: false, deadT: 0, hurtFlash: 0, squash: 0, shiny: false, V: null });
        A.mode = 'tint';
        A.modeColor = '#d8ccff';
        A.modeAmt = 0.85;
        try {
          A.drawMonster(ctx, fake);
        } catch (e) {
          // 某些怪物的畫法依賴自身狀態，畫不出來就略過
        }
        A.mode = null;
        ctx.restore();
      });
      // 邊緣：乾淨的一圈白光
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(200,180,255,0.85)';
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      // 闔上時的一道白縫
      if (u.phase === 'close') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(-u.S.radius * 1.2, -2.5, u.S.radius * 2.4, 5);
      }
    },

    // 地爆天星：寫實的碎岩、被撕開的地面、一層層壓緊的石球（美術在 js/art/skills5.js）
    drawChibaku(ctx, u) {
      G.art.chibakuFx.draw(ctx, u);
    },
  });

  // 接到 tick3（player.update 每幀呼叫）與換圖時的清除
  const tick3 = X.tick3;
  X.tick3 = function (dt) {
    tick3.call(this, dt);
    this.tickUlt(dt);
  };
  const reset = X.resetZones;
  X.resetZones = function () {
    reset();
    ults.forEach((u) => u.kind === 'meidou' && X.releaseSucked && X.releaseSucked(u));
    ults.length = 0;
  };
})();

// 地爆天星放開後，被吸上天的怪物摔回地面
(function () {
  'use strict';
  const MP = G.Monster && G.Monster.prototype;
  if (!MP) return;
  const base = MP.update;
  const held = (m) => G.skillExec.ults.some((u) => u.kind === 'chibaku' && u.m === m && u.phase !== 'end');
  MP.update = function (dt) {
    // 保險：被抬上去的怪只要沒有黑洞或石球還抓著牠，就一定要摔回原本的高度（不會停在半空走路）
    if (this.chiLift && !this.chiFall && !this.sucked && !held(this)) {
      if ((this.hover || 0) > (this.chiBase || 0) + 1) {
        this.chiFall = true;
        this.chiFallV = 0;
      } else this.chiLift = false;
    }
    if (this.chiFall) {
      this.chiFallV = (this.chiFallV || 0) + 2200 * dt;
      this.hover = (this.hover || 0) - this.chiFallV * dt;
      const floor = this.chiBase || 0;
      if (this.hover <= floor) {
        this.hover = floor;
        this.chiFall = false;
        this.chiLift = false;
        if (!this.dead) {
          G.fx.burst(this.x, this.y - 6, ['#6a6470', '#3a3640', '#9a94a0'], 10, 220, { angle: -Math.PI / 2, spread: 1.4, life: 0.5 });
          G.audio.play('land');
        }
      }
    }
    return base.apply(this, arguments);
  };
})();
