// 野外魔王（v1.2）：出現規則、招式、第二階段、頂端血條、掉落、死亡爆炸與慢動作、6 分鐘冷卻。規格：docs/SPEC-fieldboss.md
// 資料在 js/data/fieldboss.js。魔王是一般的 G.world.monsters 成員（不走 G.world.boss，不會觸發章節劇情）：
//   - 不在重生清單（沒有 m.spawn）、離開地圖就消失（world.load 清空怪物）；
//   - 冷卻（遊戲時間 6 分鐘）記在 world.flags.fieldBoss[id] = 可以再出現的 playTime，跟著存檔走；
//   - 能力掛在 G.mobAbil（fbShroom / fbKraken / fbBalrog / fbZakum / fbVoid），每招都有預警（0.8～1.5 秒；千手冰像暴走連擊的單掌 0.65 秒）。
// 表現旗標（美術 js/art/fieldboss.js 讀）：m.fx.rage（第二階段）、以及各魔王在規格表列的 breath / jump / slam / ink / whip / fly / arm（千手冰像另有 arm2 / hitArm / hitArm2 / hitT / palm / gassho）/ beam，
// 另外 m.fx.beamFire（虛空吐息正在發射）、m.fx.summon（0..1 菇魔召喚蓄力）、m.fx.throw（0..1 海魔甩錨蓄力）、m.fx.spawn（0..1 剛出現）。
// 地面區域 kind：fb_warn（預警圓）、fb_warnline（預警線段 x1,y1,x2,y2,w）、fb_beam（光束 x1,y1,x2,y2,w,color）、fb_sporebreath、fb_tentacle、
// fb_inkcloud、fb_armslam（舊的砸地，已不用）、fb_palmhit（千手冰像的掌打到地面）；投射物 kind：fb_anchor、fb_meteor（p.style = 'fire' | 'star'）、fb_voidorb、
// fb_palm（千手冰像的飛掌，owner 'fx'，判定自己算），另外借用既有的 icicle、firetrail、quake。
(function () {
  'use strict';
  const U = G.util;
  const AB = G.mobAbil;
  const COOLDOWN = 360; // 遊戲時間 6 分鐘
  const SLOWMO = 0.3; // 打倒時的慢動作（實際秒數）
  const HP_CAP = 0.34; // 單一招式最多吃掉最大 HP 的 34%：絕不秒殺
  const SKILL_K = 1.5; // 有預警的招式比身體碰撞痛：沒閃的代價要看得出來

  // progression.js 把所有非 Boss 怪的藥水／裝備掉率設成一般怪的值；野外魔王的掉落由這裡發放，所以清掉
  for (const id in G.data.monsters) {
    const d = G.data.monsters[id];
    if (d.fieldBoss) d.drops = {};
  }
  G.data.items.rarityTables.fieldBoss = { epic: 70, legendary: 30 };

  // ── 小工具 ──
  const midY = (m) => m.y - (m.hover || 0) - m.h * (m.scale || 1) * 0.5;
  const topY = (m) => m.y - (m.hover || 0) - m.h * (m.scale || 1);
  const timers = [];
  const waves = [];
  const later = (t, fn) => timers.push({ t, fn });
  const zone = (o) => {
    const z = Object.assign({ t: 0, visual: true, fb: true }, o);
    G.world.zones.push(z);
    return z;
  };
  const warn = (x, y, r, life) => zone({ kind: 'fb_warn', x, y, r, life });
  const warnLine = (x1, y1, x2, y2, w, life) => zone({ kind: 'fb_warnline', x: (x1 + x2) / 2, y: Math.max(y1, y2), x1, y1, x2, y2, w, r: Math.abs(x2 - x1) / 2 + w, life });
  // 野外魔王的台詞放在血條下方的專用欄位（js/ui/hud.js bossLine）；章節 Boss 召喚出來的分身才畫在頭上
  const say = (m, text, color) => (m.illusion ? G.fx.text(m.x, topY(m) - 26, text, color || '#ffb0d8', 20, 1.1) : G.hud.bossLine(text, color || '#ffb0d8'));
  const groundUnder = (P, m) => (P.onGround && P.climbing < 0 ? P.y : m.y);
  // 起伏的地面：gy 是地面那一層（不是浮空平台）時，換成 x 那裡的地表高度（浮空平台離地至少 84px，地面起伏不到 76px）
  const gAt = (gy, x) => {
    const map = G.world.map;
    if (!G.physics.terrain(map)) return gy;
    const g = G.physics.groundY(map, x);
    return Math.abs(gy - g) < 76 ? g : gy;
  };
  // 打到玩家：原始傷害封頂在最大 HP 的 34%（防禦、包圍減傷照常）
  const hurtP = (m, k, fromX, touch) => {
    const P = G.player;
    if (!P.alive()) return false;
    return P.hurt(Math.min(m.atk * k * (touch ? 1 : SKILL_K), P.maxHp * HP_CAP), fromX);
  };
  const capDmg = (m, k) => Math.round(Math.min(m.atk * k * SKILL_K, G.player.maxHp * HP_CAP));
  const hitBox = (m, box, k, fromX) => {
    const P = G.player;
    if (P.alive() && U.overlap(box, P.hitbox())) return hurtP(m, k, fromX == null ? m.x : fromX);
    return false;
  };
  const segDist = (px, py, x1, y1, x2, y2) => {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const k = U.clamp(((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy || 1), 0, 1);
    return U.dist(px, py, x1 + vx * k, y1 + vy * k);
  };
  const clampX = (m, x) => {
    const [lo, hi] = m.bounds();
    return U.clamp(x, lo, hi);
  };
  const mapClamp = (x) => U.clamp(x, 60, G.world.map.w - 60);
  const engaged = (m, P) => P.alive() && Math.abs(P.x - m.x) < 1000 && Math.abs(P.y - m.y) < 620;
  // 地面衝擊波（沿地面往兩側擴散，跳起來就躲得掉）
  const quakeWave = (m, x, y, k, speed, life) => {
    const z = zone({ kind: 'quake', x, y, r: 20, life: life || 0.8 });
    waves.push({ z, hit: false, dmg: k, m, speed: speed || 480 });
  };
  // 從天而降的投射物（流星、冰晶、墜星）：預警圓 1.0 秒後落地
  const skyDrop = (m, x, gy, o) => {
    const T = o.T || 1.05;
    gy = gAt(gy, x);
    warn(x, gy, o.r || 60, T + 0.05);
    const dx = o.dx != null ? o.dx : 0;
    const H = 720;
    const p = Object.assign({
      kind: 'fb_meteor', x: x + dx, y: gy - H, vx: -dx / T, vy: H / T, r: o.pr || 20,
      dmg: capDmg(m, o.k || 1.1), life: T + 0.5, t: 0, seed: Math.random() * 6, owner: 'monster', fb: true,
    }, o.p || {});
    p.onTick = (pp) => {
      if (pp.y < gy) return;
      pp.t = pp.life + 1;
      G.fx.burst(pp.x, gy - 8, o.colors || ['#ff7a2a', '#ffd35a', '#3a2a24'], 14, 280, { angle: -Math.PI / 2, spread: 1.3 });
      G.fx.shake(4, 0.12);
      G.audio.play(o.sound || 'rockHit');
      hitBox(m, { x: pp.x - (o.r || 60), y: gy - 70, w: (o.r || 60) * 2, h: 72 }, o.k || 1.1, pp.x);
      if (o.onLand) o.onLand(pp.x, gy);
    };
    G.world.projectiles.push(p);
    return p;
  };

  // ── 共通的出招節奏 ──
  // moves: [{ id, w, ok(m, P), run(m, P) → step(t, dt, P) 回傳 true 表示這招結束 }]
  function brain(m, dt, P, moves, idle) {
    m.fx.spawn = Math.max(0, (m.fx.spawn || 0) - dt / 1.2);
    if (engaged(m, P)) m.aggroT = Math.max(m.aggroT, 3);
    if (m.fbAct) {
      m.vx = 0;
      const a = m.fbAct;
      a.t += dt;
      if (a.dir) m.dir = a.dir;
      if (a.step(a.t, dt, P)) {
        m.fbAct = null;
        m.attackPhase = null;
        m.fbCd = U.rand(1.2, 2.0) * (m.fx.rage ? 0.7 : 1);
      }
      return true;
    }
    if (idle) idle(m, dt, P);
    if (m.fx.spawn > 0) {
      m.vx = 0;
      return true;
    }
    m.fbCd = (m.fbCd == null ? 1.6 : m.fbCd) - dt;
    if (m.fbCd > 0 || !engaged(m, P)) return false;
    let list = moves.filter((mv) => !mv.ok || mv.ok(m, P));
    if (list.length > 1) list = list.filter((mv) => mv.id !== m.fbLast);
    if (!list.length) return false;
    let r = Math.random() * list.reduce((s, mv) => s + (mv.w || 1), 0);
    let mv = list[0];
    for (const x of list) {
      r -= x.w || 1;
      if (r < 0) {
        mv = x;
        break;
      }
    }
    m.fbLast = mv.id;
    m.dir = U.sign(P.x - m.x) || m.dir;
    const step = mv.run(m, P);
    m.fbAct = { t: 0, step, dir: m.dir };
    return true;
  }

  // ═════ 苔冠鱷王（1-4）：毒霧吐息、撲起砸地、抖落背上的小傘菇 ═════
  const shroomMoves = [
    {
      id: 'breath', w: 3,
      ok: (m, P) => Math.abs(P.x - m.x) < 520,
      run(m, P) {
        const dir = m.dir;
        const r = m.fx.rage ? 210 : 170;
        const cx = m.x + dir * (m.halfW + r * 0.85);
        const gy = gAt(m.y, cx);
        warn(cx, gy, r, 1.05);
        G.audio.play('bossWarn');
        let fired = false;
        m.attackPhase = 'wind';
        return (t) => {
          if (t < 1.0) {
            m.fx.breath = t / 1.0;
            return false;
          }
          if (!fired) {
            fired = true;
            m.attackPhase = 'strike';
            G.audio.play('spore');
            zone({ kind: 'fb_sporebreath', x: cx, y: gy, r, dir, life: m.fx.rage ? 3.6 : 2.8, visual: false, tick: 0.5, pct: 0.035 });
            hitBox(m, { x: Math.min(m.x, cx + dir * r), y: gy - 170, w: Math.abs(cx + dir * r - m.x), h: 170 }, 1.1);
            G.fx.burst(m.x + dir * m.halfW, midY(m), ['#9aff6a', '#6a3a9a', '#d8ffb0'], 24, 360, { angle: dir > 0 ? 0 : Math.PI, spread: 0.5, grav: 0, life: 0.8 });
          }
          m.fx.breath = 1;
          if (t > 1.8) {
            m.fx.breath = 0;
            return true;
          }
          return false;
        };
      },
    },
    {
      id: 'jump', w: 3,
      ok: (m, P) => Math.abs(P.x - m.x) < 700,
      run(m, P) {
        const tx = clampX(m, P.x);
        const r = 140;
        warn(tx, m.y, r, 1.45);
        G.audio.play('bossWarn');
        m.attackPhase = 'wind';
        let phase = 0;
        let air = 0;
        let x0 = m.x;
        const AIR = 0.86;
        return (t, dt, P2) => {
          if (phase === 0) {
            m.squash = 0.4; // 蹲低蓄力
            if (t >= 0.6) {
              phase = 1;
              x0 = m.x;
              m.attackPhase = 'strike';
              m.fx.jump = true;
              G.audio.play('jump');
              G.fx.burst(m.x, m.y - 10, ['#6a3a9a', '#2a1a3a'], 14, 260, { angle: -Math.PI / 2, spread: 1.4 });
            }
            return false;
          }
          if (phase === 1) {
            // 用 hover 做跳躍弧線（不走物理，才不會落在上層平台）
            air += dt;
            const k = Math.min(1, air / AIR);
            m.hover = 4 * 210 * k * (1 - k);
            m.x = clampX(m, x0 + (tx - x0) * k);
            if (k >= 1) {
              phase = 2;
              m.hover = 0;
              m.fx.jump = false;
              G.fx.shake(9, 0.3);
              G.audio.play('slam');
              G.fx.burst(m.x, m.y - 10, ['#9aff6a', '#6a3a9a', '#3a2a24'], 24, 360, { angle: -Math.PI / 2, spread: 1.5 });
              hitBox(m, { x: m.x - r, y: m.y - 120, w: r * 2, h: 122 }, 1.4);
              quakeWave(m, m.x, m.y, 1.0, 460, m.fx.rage ? 1.0 : 0.75);
            }
            return false;
          }
          return t > 0.6 + AIR + 0.45;
        };
      },
    },
    {
      id: 'summon', w: 1.5,
      ok: (m) => G.world.monsters.filter((o) => o.isAdd && !o.dead).length < (m.fx.rage ? 4 : 2),
      run(m) {
        m.attackPhase = 'wind';
        say(m, '出來吧，孩子們！', '#c8ff9a');
        let done = false;
        return (t) => {
          m.fx.summon = Math.min(1, t / 1.0);
          if (t >= 1.0 && !done) {
            done = true;
            const n = m.fx.rage ? 3 : 2;
            for (let i = 0; i < n; i++) G.world.spawnAdd('capshroom', m.x + (i - (n - 1) / 2) * 120 + m.dir * 90);
            G.audio.play('spore');
          }
          if (t >= 1.5) {
            m.fx.summon = 0;
            return true;
          }
          return false;
        };
      },
    },
  ];

  // ═════ 沉船海魔（2-4）：地下觸手、甩錨、墨雲 ═════
  const krakenMoves = [
    {
      id: 'tentacle', w: 3,
      run(m, P) {
        const n = m.fx.rage ? 5 : 3;
        const gy = groundUnder(P, m);
        const xs = [];
        for (let i = 0; i < n; i++) xs.push(mapClamp(P.x + (i - (n - 1) / 2) * 150 + U.rand(-25, 25)));
        xs.forEach((x) => warn(x, gAt(gy, x), 56, 1.1));
        G.audio.play('bossWarn');
        m.attackPhase = 'wind';
        let done = false;
        return (t) => {
          if (t < 1.05) {
            m.fx.slam = Math.min(0.6, t / 1.05 * 0.6);
            return false;
          }
          if (!done) {
            done = true;
            m.attackPhase = 'strike';
            m.fx.slam = 1;
            G.fx.shake(6, 0.2);
            G.audio.play('slam');
            let hit = false;
            xs.forEach((x) => {
              const gx = gAt(gy, x);
              zone({ kind: 'fb_tentacle', x, y: gx, r: 45, h: 170, life: 0.9 });
              G.fx.burst(x, gx - 6, ['#5a8a7a', '#2a3a3a', '#9fe8d0'], 10, 280, { angle: -Math.PI / 2, spread: 0.9 });
              if (!hit) hit = hitBox(m, { x: x - 45, y: gx - 170, w: 90, h: 170 }, 1.25, x);
            });
          }
          m.fx.slam = Math.max(0, 1 - (t - 1.05) * 2);
          return t > 1.7;
        };
      },
    },
    {
      id: 'anchor', w: 2.5,
      ok: (m, P) => Math.abs(P.x - m.x) > 120,
      run(m, P) {
        const gy0 = groundUnder(P, m);
        const gy = gy0;
        const targets = [mapClamp(P.x)];
        if (m.fx.rage) targets.push(mapClamp(P.x + U.sign(P.x - m.x) * 170));
        targets.forEach((x) => warn(x, gAt(gy, x), 70, 0.9 + 0.95));
        m.attackPhase = 'wind';
        G.audio.play('bossWarn');
        let thrown = false;
        return (t) => {
          if (t < 0.9) {
            m.fx.throw = t / 0.9;
            return false;
          }
          if (!thrown) {
            thrown = true;
            m.fx.throw = 0;
            m.attackPhase = 'strike';
            G.audio.play('swing');
            targets.forEach((tx) => {
              const gy = gAt(gy0, tx);
              const sx = m.x + m.dir * m.halfW * 0.5;
              const sy = topY(m) + 20;
              const T = 0.95;
              const g = 1400;
              const p = {
                kind: 'fb_anchor', x: sx, y: sy, vx: (tx - sx) / T, vy: (gy - sy - 0.5 * g * T * T) / T, grav: g,
                r: 26, dmg: capDmg(m, 1.3), life: T + 0.4, t: 0, seed: Math.random() * 6, owner: 'monster', fb: true, dir: U.sign(tx - sx) || 1,
              };
              p.onTick = (pp) => {
                if (pp.vy <= 0 || pp.y < gy) return;
                pp.t = pp.life + 1;
                G.fx.shake(6, 0.2);
                G.audio.play('rockHit');
                G.fx.burst(pp.x, gy - 6, ['#8a7a6a', '#c8b8a0', '#3a2a24'], 16, 300, { angle: -Math.PI / 2, spread: 1.3 });
                hitBox(m, { x: pp.x - 70, y: gy - 60, w: 140, h: 62 }, 1.3, pp.x);
              };
              G.world.projectiles.push(p);
            });
          }
          return t > 1.5;
        };
      },
    },
    {
      id: 'ink', w: 2,
      run(m, P) {
        const x = mapClamp(P.x);
        const gy = gAt(groundUnder(P, m), x);
        const r = m.fx.rage ? 175 : 145;
        warn(x, gy, r, 1.0);
        m.fx.ink = true;
        m.attackPhase = 'wind';
        G.audio.play('bossWarn');
        let done = false;
        return (t) => {
          if (t >= 0.95 && !done) {
            done = true;
            m.attackPhase = 'strike';
            G.audio.play('spore');
            zone({ kind: 'fb_inkcloud', x, y: gy, r, life: m.fx.rage ? 5 : 4, visual: false, tick: 0.3, pct: 0.025 });
            G.fx.burst(x, gy - 40, ['#1a1a2a', '#3a2a4a', '#5a4a7a'], 18, 220, { grav: 0, life: 0.8 });
          }
          if (t > 1.4) {
            m.fx.ink = false;
            return true;
          }
          return false;
        };
      },
    },
  ];

  // ═════ 赤焰炎魔（3-4）：火鞭橫掃、展翅俯衝、流星火雨 ═════
  const BR_H = 340; // js/art/fieldboss.js 炎魔的設計高度：畫面縮放 K = m.h / BR_H，火鞭的弧線（fb_whipcrack）也用這個 K
  const FLY_H = 150; // 俯衝前飛起的高度（240 的時候角尖會超出畫面頂端）
  const balrogMoves = [
    {
      id: 'whip', w: 3,
      ok: (m, P) => Math.abs(P.x - m.x) < 640,
      run(m, P) {
        // 節奏：蓄力 1.0 秒（鞭子往後捲、火焰沿鞭身竄起）→ 0.1 秒甩出（鞭梢劃過頭頂落到前方）→ 鞭梢著地爆響、判定一次
        // 判定：從魔王腳下往前 len、離地 0～80 的長方形＝預警線＝美術的鞭梢落點（fx.whipLen）＝地面火線 fb_whipcrack
        const rage = !!m.fx.rage;
        const dirs = rage ? [m.dir, -m.dir] : [m.dir];
        const len = 560;
        const K = (m.h || BR_H) / BR_H; // 美術的設計高度（js/art/fieldboss.js BR_H）
        dirs.forEach((d) => warnLine(m.x, m.y - 40, m.x + d * len, m.y - 40, 80, 1.0));
        m.attackPhase = 'wind';
        m.fx.whipLen = len;
        m.fx.whipCharge = 0;
        m.fx.whipT = 0;
        G.audio.play('bossWarn');
        let hit = false;
        let swung = false;
        return (t, dt, P2) => {
          if (t < 1.0) {
            m.fx.whip = 0;
            m.fx.whipCharge = t / 1.0;
            // 蓄力到頂時鞭子上的火舌往上噴
            if (t > 0.55 && Math.random() < dt * (rage ? 26 : 16)) {
              // 沿著舉過頭、往背後捲起的鞭身（設計座標 x −240～60、y −300～−440）
              const hx = m.x - m.dir * (-60 + Math.random() * 300) * K;
              G.fx.burst(hx, m.y - (300 + Math.random() * 140) * K, rage ? ['#fff6c8', '#ffd23a', '#ff7a1e'] : ['#ffd35a', '#ff7a2a'], 2, 120, { angle: -Math.PI / 2, spread: 0.6, grav: -200, life: 0.5 });
            }
            return false;
          }
          m.attackPhase = 'strike';
          m.fx.whipCharge = 1;
          m.fx.whipT = t - 1.0;
          const k = Math.min(1, (t - 1.0) / 0.1);
          m.fx.whip = 1 - (1 - k) * (1 - k);
          if (!swung) {
            swung = true;
            G.audio.play('sweep');
            // 鞭痕（掃過的火弧、鞭梢爆響、地面火線）：建立時間＝甩出瞬間，0.1 秒後鞭梢著地
            dirs.forEach((d) => zone({
              kind: 'fb_whipcrack', x: m.x + d * len / 2, y: m.y, r: len / 2 + 40, x1: m.x, x2: m.x + d * len, len, dir: d,
              hx: m.x + d * 228 * K, hy: m.y - 214 * K, k: K, hitAt: 0.1, rage, life: rage ? 1.7 : 1.4,
            }));
          }
          if (!hit && t >= 1.1) {
            hit = true;
            m.fx.whip = 1;
            G.audio.play('slam');
            G.audio.play('rockHit');
            let got = false;
            dirs.forEach((d) => {
              const x1 = Math.min(m.x, m.x + d * len);
              const tx = m.x + d * len;
              const ty = m.y - 40;
              // 鞭梢的音爆：白熱閃光圈＋往四周噴的火花
              G.fx.ring(tx, ty, rage ? 'rgba(255,246,200,0.95)' : 'rgba(255,220,120,0.9)', rage ? 150 : 110, 0.32, rage ? 8 : 6);
              G.fx.ring(tx, ty, 'rgba(255,120,40,0.8)', rage ? 230 : 170, 0.45, 4);
              G.fx.burst(tx, ty, rage ? ['#ffffff', '#fff6c8', '#ffd23a', '#ff7a1e'] : ['#ffffff', '#ffd35a', '#ff7a2a'], rage ? 30 : 20, rage ? 560 : 440, { grav: 300, life: 0.55, size: 5 });
              G.fx.text(tx, ty - 50, '啪！', rage ? '#fff6c8' : '#ffd35a', rage ? 34 : 28, 0.6);
              // 沿著鞭痕的火星、地面炸起的碎屑
              const n = rage ? 10 : 8;
              for (let i = 0; i < n; i++) {
                const bx = m.x + d * (i + 0.5) * (len / n);
                G.fx.burst(bx, m.y - 40, ['#ff7a2a', '#ffd35a', rage ? '#fff6c8' : '#ff5a1e'], rage ? 5 : 4, 260, { angle: -Math.PI / 2, spread: 0.9, life: 0.6 });
                if (i % 2) G.fx.burst(bx, m.y - 4, ['#3a2a24', '#5a3a2a'], 3, 220, { angle: -Math.PI / 2, spread: 0.7, life: 0.45 });
              }
              got = hitBox(m, { x: x1, y: m.y - 80, w: len, h: 80 }, 1.35) || got;
            });
            // 打擊感：打中玩家時畫面停得久一點、閃一下；打在地上也有短暫停頓＋震動
            G.fx.shake(got ? (rage ? 12 : 10) : rage ? 9 : 7, got ? 0.35 : 0.25, got && rage);
            G.fx.addHitstop(got ? 0.12 : 0.06, got);
            if (got) G.fx.screenFlash(rage ? '#fff0c0' : '#ffb060', rage ? 0.3 : 0.22);
          }
          if (t > 1.6) {
            m.fx.whip = 0;
            m.fx.whipCharge = 0;
            m.fx.whipT = 0;
            return true;
          }
          return false;
        };
      },
    },
    {
      id: 'dive', w: 2.5,
      run(m, P) {
        m.fx.fly = true;
        G.audio.play('jump');
        let tx = m.x;
        let phase = 0;
        let t0 = 0;
        return (t, dt, P2) => {
          if (phase === 0) {
            // 飛起來，同時往玩家頭上移動
            m.hover = Math.min(FLY_H, (m.hover || 0) + 360 * dt);
            m.x = clampX(m, m.x + U.clamp(P2.x - m.x, -260 * dt, 260 * dt));
            m.dir = U.sign(P2.x - m.x) || m.dir;
            if (t > 1.0) {
              phase = 1;
              t0 = t;
              tx = clampX(m, P2.x);
              warn(tx, m.y, 130, 1.1);
              G.audio.play('bossWarn');
              m.attackPhase = 'wind';
            }
            return false;
          }
          if (phase === 1) {
            m.hover = FLY_H + Math.sin(t * 10) * 6;
            if (t - t0 > 0.9) {
              phase = 2;
              t0 = t;
              m.attackPhase = 'strike';
            }
            return false;
          }
          if (phase === 2) {
            const k = Math.min(1, (t - t0) / 0.2);
            m.hover = FLY_H * (1 - k);
            m.x = clampX(m, m.x + (tx - m.x) * Math.min(1, dt * 18));
            if (k >= 1) {
              phase = 3;
              t0 = t;
              m.hover = 0;
              m.fx.fly = false;
              G.fx.shake(10, 0.3);
              G.audio.play('slam');
              G.fx.burst(m.x, m.y - 10, ['#ff7a2a', '#ffd35a', '#3a2a24'], 30, 380, { angle: -Math.PI / 2, spread: 1.5 });
              hitBox(m, { x: m.x - 130, y: m.y - 130, w: 260, h: 132 }, 1.5);
              const n = m.fx.rage ? 3 : 1;
              for (let i = 0; i < n; i++) zone({ kind: 'firetrail', x: m.x + (i - (n - 1) / 2) * 90, y: m.y, r: 40, life: 3, visual: false, tick: 0.3, pct: 0.03, noSlow: true });
            }
            return false;
          }
          return t - t0 > 0.5;
        };
      },
    },
    {
      id: 'meteor', w: 2,
      run(m, P) {
        say(m, '燃燒吧！', '#ffb070');
        m.attackPhase = 'wind';
        G.audio.play('bossWarn');
        const n = m.fx.rage ? 8 : 5;
        let k = 0;
        return (t, dt, P2) => {
          while (k < n && t >= 0.5 + k * 0.2) {
            const gy = groundUnder(P2, m);
            const x = mapClamp(k === 0 ? P2.x : P2.x + U.rand(-320, 320));
            skyDrop(m, x, gy, {
              dx: 140, k: 1.15, r: 62, p: { style: 'fire' },
              onLand: (lx, ly) => zone({ kind: 'firetrail', x: lx, y: ly, r: 34, life: 2.6, visual: false, tick: 0.3, pct: 0.03, noSlow: true }),
            });
            k++;
          }
          return t > 0.5 + n * 0.2 + 0.4;
        };
      },
    },
  ];

  // ═════ 千手冰像（4-4）：百手掌擊（每一招都是掌：從冰像的光背化出巨大的石掌，從不同角度打下來）═════
  // 掌從空中的金冰光環化出（預警期間在環裡成形），然後沿直線打出去。每一掌是一個 owner:'fx' 的 fb_palm 投射物
  // （js/art/fieldboss.js 畫；世界只推 p.t，位置與判定都在 onTick 裡自己算，一掌只打一次）：
  //   p.style 'drop'（從天而降）| 'sweep'（貼地橫掃，跳得過）| 'thrust'（從斜上方刺下）| 'clap'（左右合掌）
  //   p.ox/oy＝光環（掌從這裡化出）、p.x/y＝掌心、p.rot＝手指朝向、p.flip＝拇指那側翻面、p.sz＝掌的大小、
  //   p.warn＝化出（預警）秒數、p.hitAt＝打到的時間、p.prog 0..1 飛行進度、p.gy＝地面、p.tx0／p.hw＝地上的落點與判定半寬（機器人測試用）
  // 冰像的動作：fx.arm（正在舉的手）、fx.arm2（合掌時另一邊）、fx.slam 0..0.7 → 1、fx.hitArm／hitArm2／hitT（剛打出去）、
  // fx.gassho 0..1（千手連擊時正面合掌發光）、fx.palm（出招中：睜眼）。手臂索引 0～2＝世界左側（上／中／下）、3～5＝世界右側。
  const PALM_TIP = 22; // zkPalm 的掌心 → 指尖（× sz）
  const PALM_WRIST = 18; // 掌心 → 手腕
  const PALM_HW = 9.5; // 掌的半寬
  const zkArm = (side, lvl) => (side < 0 ? 0 : 3) + lvl;
  // 掌打得到的範圍＝會出招的範圍（engaged：離冰像 1000 px 內），站遠也躲不掉，只能看預警閃
  const zkReach = (m, x) => mapClamp(U.clamp(x, m.x - 980, m.x + 980));
  // 畫面（且在地圖內）的左右邊：橫掃的掌從這裡出來
  const viewLR = () => {
    const W = G.world.map.w;
    const x0 = G.cam ? G.cam.x : G.player.x - 640;
    return [Math.max(40, x0 + 40), Math.min(W - 40, x0 + (G.W || 1280) - 40)];
  };
  const viewTop = () => (G.cam ? G.cam.y : G.player.y - 520) + 140; // 光環別被上方的魔王血條擋住
  // 測試用：每一掌有沒有碰到玩家（不管無敵時間），最多留 200 筆
  const palmLog = [];
  const logPalm = (pp) => {
    palmLog.push({ style: pp.style, hit: !!pp.hit, fin: !!pp.fin, rage: pp.rage, x: Math.round(pp.tx0), hw: pp.hw, px: Math.round(G.player.x), py: Math.round(G.player.y - pp.gy), at: +G.player.t.toFixed(2) });
    if (palmLog.length > 200) palmLog.shift();
  };
  function palmHit(m, pp, box, k, fromX) {
    const P = G.player;
    if (pp.hit || !P.alive() || !U.overlap(box, P.hitbox())) return false;
    pp.hit = true;
    hurtP(m, k, fromX == null ? pp.ox : fromX);
    return true;
  }
  // 掌打到地面：冰屑、衝擊圈、短震動、地上的冰刺與裂痕（fb_palmhit）
  let impactT = -9;
  function palmImpact(x, y, big, rage) {
    const lo = G.lowFx ? 0.5 : 1;
    G.fx.burst(x, y - 8, ['#bfe9ff', '#7cc4ee', '#ffffff', '#d6b460'], Math.round((big ? 22 : 14) * lo), big ? 380 : 300, { angle: -Math.PI / 2, spread: 1.4 });
    G.fx.ring(x, y - 10, 'rgba(210,244,255,0.85)', big ? 150 : 100, 0.32, 5);
    // 震動與音效節流：連擊時一秒落好幾掌，不要一直狂震
    const now = G.time || 0;
    if (big || now - impactT > 0.2) {
      impactT = now;
      G.fx.shake(big ? 7 : 3, big ? 0.2 : 0.1);
      G.audio.play('slam');
    }
    zone({ kind: 'fb_palmhit', x, y, r: big ? 130 : 90, life: 0.65, rage: !!rage });
  }
  // 同時在場上的掌最多幾隻（省效能模式更少）：超過就不出這一掌（連預警都不出，所以不會有看不到的判定）
  const palmCap = () => (G.lowFx ? 12 : 18);
  const palmCount = () => {
    let n = 0;
    for (const p of G.world.projectiles) if (p.kind === 'fb_palm') n++;
    return n;
  };
  function palm(m, o) {
    const p = {
      kind: 'fb_palm', owner: 'fx', fb: true, t: 0, vx: 0, vy: 0, r: 0,
      style: o.style, ox: o.ox, oy: o.oy, x: o.ox, y: o.oy, tx: o.tx, ty: o.ty, gy: o.gy,
      ang: Math.atan2(o.ty - o.oy, o.tx - o.ox), rot: o.rot, flip: o.flip || 1, sz: o.sz || 4,
      warn: o.warn, fly: o.fly, hitAt: o.warn + o.fly, life: o.warn + o.fly + (o.hold || 0.42),
      rage: !!m.fx.rage, fin: !!o.fin, hw: o.hw || 0, tx0: o.tx0 == null ? o.tx : o.tx0, prog: 0, hit: false, launched: false, landed: false, seed: Math.random() * 6,
    };
    if (p.rot == null) p.rot = p.ang;
    p.onTick = (pp) => {
      if (pp.t < pp.warn) return;
      const q = Math.min(1, (pp.t - pp.warn) / pp.fly);
      const e = pp.style === 'sweep' ? q : q * q;
      const x0 = pp.x;
      const y0 = pp.y;
      pp.x = pp.ox + (pp.tx - pp.ox) * e;
      pp.y = pp.oy + (pp.ty - pp.oy) * e;
      pp.prog = e;
      if (!pp.launched) {
        pp.launched = true;
        G.audio.play('swing');
      }
      if (pp.landed) return;
      if (o.during) o.during(pp, x0, y0);
      if (q >= 1) {
        pp.landed = true;
        if (o.onLand) o.onLand(pp);
        if (!o.noLog) logPalm(pp);
      }
    };
    G.world.projectiles.push(p);
    return p;
  }
  // 從天而降（正上方）：地上預警圓 r
  function dropPalm(m, P2, o) {
    if (palmCount() >= palmCap()) return null;
    const tx = zkReach(m, o.x != null ? o.x : P2.x);
    const gy = gAt(groundUnder(P2, m), tx);
    const r = o.r || 110;
    const sz = 4.2 * (r / 110);
    warn(tx, gy, r, o.warn + 0.05);
    const oy = Math.min(gy - 300, Math.max(viewTop(), gy - 470));
    const side = tx >= m.x ? 1 : -1;
    palm(m, {
      style: 'drop', ox: tx, oy, tx, ty: gy - PALM_TIP * sz, gy, rot: Math.PI / 2, flip: side, sz, hw: r, tx0: tx,
      warn: o.warn, fly: 0.16, hold: 0.45, fin: o.fin,
      onLand(pp) {
        palmImpact(tx, gy, r > 120, pp.rage);
        palmHit(m, pp, { x: tx - r, y: gy - 150, w: r * 2, h: 152 }, o.k, tx);
      },
    });
    return { launch: o.warn, arm: zkArm(side, 0), after: 0.5 };
  }
  // 貼地橫掃：從畫面邊緣（dir = 1：從左邊往右）沿地面掃過去，判定只有離地 88 px（跳得過去、站在上層平台也打不到）
  const SWEEP_H = 88;
  // 光環至少在玩家後方 220 px（畫面邊緣離玩家太近、或鏡頭還沒跟上時，就從畫面外出來）
  function sweepInfo(o, px) {
    let [L, R] = viewLR();
    L = Math.min(L, px - 220);
    R = Math.max(R, px + 220);
    const x0 = o.dir > 0 ? L : R;
    const x1 = o.dir > 0 ? R + 260 : L - 260;
    const speed = o.speed || 1400;
    return { L, R, x0, x1, speed, fly: Math.abs(x1 - x0) / speed };
  }
  function sweepPalm(m, P2, o) {
    if (palmCount() >= palmCap()) return null;
    const gy = m.y;
    const dir = o.dir;
    const S = o.S || sweepInfo(o, P2.x); // 排程時算好的（連續橫掃的時間差要用同一組邊界）
    const sz = 4.4;
    const y = gy - PALM_HW * sz - 3;
    warnLine(S.x0, y, dir > 0 ? S.R : S.L, y, SWEEP_H, o.warn + 0.05);
    palm(m, {
      style: 'sweep', ox: S.x0, oy: y, tx: S.x1, ty: y, gy, rot: dir > 0 ? 0 : Math.PI, flip: dir > 0 ? 1 : -1, sz,
      warn: o.warn, fly: S.fly, hold: 0.2,
      during(pp, px) {
        const lead = PALM_TIP * sz;
        const tail = PALM_WRIST * sz;
        // 只算光環前方（預警帶上）的部分：剛好站在光環後面一點點的人不會被掌根掃到
        const a = Math.max(Math.min(px, pp.x) - (dir > 0 ? tail : lead), dir > 0 ? S.x0 - 10 : -1e9);
        const b = Math.min(Math.max(px, pp.x) + (dir > 0 ? lead : tail), dir < 0 ? S.x0 + 10 : 1e9);
        if (b <= a) return;
        if (palmHit(m, pp, { x: a, y: gy - SWEEP_H, w: b - a, h: SWEEP_H }, o.k, pp.x - dir * 20)) {
          G.fx.burst(G.player.x, gy - 30, ['#bfe9ff', '#ffffff'], G.lowFx ? 6 : 12, 260, { angle: dir > 0 ? 0 : Math.PI, spread: 0.8 });
        }
        // 掌底刮起的雪
        if (!G.lowFx && Math.random() < 0.5) G.fx.burst(pp.x - dir * tail, gy - 6, ['#f2f8ff', '#bfe9ff'], 2, 160, { angle: -Math.PI / 2 - dir * 0.6, spread: 0.6 });
      },
    });
    return { launch: o.warn, arm: zkArm(-dir, 2), after: S.fly + 0.2 };
  }
  // 斜刺：從左上（from = −1）或右上（from = 1）朝目標直直刺下；預警線從光環連到落點
  function thrustPalm(m, P2, o) {
    if (palmCount() >= palmCap()) return null;
    const tx = zkReach(m, o.x != null ? o.x : P2.x);
    const gy = gAt(groundUnder(P2, m), tx);
    // 刺向玩家時，玩家若貼近地圖邊緣，光環一律放在牆那側：往遠離光環（空曠）的那邊躲就好
    let s = o.from;
    if (o.x == null && tx < 320) s = -1;
    else if (o.x == null && tx > G.world.map.w - 320) s = 1;
    const th = o.th || 0.7; // 跟垂直線的夾角
    const top = viewTop();
    const D = U.clamp((gy - top) / Math.cos(th), 360, 600);
    const ox = tx + s * Math.sin(th) * D;
    const oy = gy - Math.cos(th) * D;
    const ty0 = gy - 4;
    const a = Math.atan2(ty0 - oy, tx - ox);
    const sz = 3.8;
    const ex = tx - Math.cos(a) * PALM_TIP * sz;
    const ey = ty0 - Math.sin(a) * PALM_TIP * sz;
    const R = 11 * sz + 14;
    warnLine(ox, oy, tx, ty0, 96, o.warn + 0.05);
    const hw = o.r || 65;
    warn(tx, gy, hw + 4, o.warn + 0.05);
    palm(m, {
      style: 'thrust', ox, oy, tx: ex, ty: ey, gy, rot: a, flip: s < 0 ? 1 : -1, sz, hw, tx0: tx,
      warn: o.warn, fly: 0.2, hold: 0.42,
      during(pp, px, py) {
        const P = G.player;
        if (pp.hit || !P.alive()) return;
        // 掌心走過的線段（延伸到指尖）對玩家身上三個點
        const fx2 = pp.x + Math.cos(a) * PALM_TIP * sz * 0.6;
        const fy2 = pp.y + Math.sin(a) * PALM_TIP * sz * 0.6;
        const hb = P.hitbox();
        const cx = hb.x + hb.w / 2;
        for (const yy of [hb.y + 8, hb.y + hb.h / 2, hb.y + hb.h - 6]) {
          if (segDist(cx, yy, px, py, fx2, fy2) < R) {
            pp.hit = true;
            hurtP(m, o.k, ox);
            break;
          }
        }
      },
      onLand(pp) {
        palmImpact(tx, gy, false, pp.rage);
        palmHit(m, pp, { x: tx - hw, y: gy - 72, w: hw * 2, h: 74 }, o.k, ox);
      },
    });
    return { launch: o.warn, arm: zkArm(s, o.lvl != null ? o.lvl : 0), after: 0.5 };
  }
  // 合掌：左右兩隻直立的巨掌從兩側滑進來，在目標 x 拍在一起（判定只有正中 ±110）
  function clapPalms(m, P2, o) {
    if (palmCount() >= palmCap() - 1) return null;
    const cx = zkReach(m, P2.x);
    const gy = gAt(groundUnder(P2, m), cx);
    const sz = o.sz || 4.3;
    const hw = PALM_HW * sz;
    const yc = gy - 28 - PALM_WRIST * sz; // 手腕離地 28 px（前臂從側面伸過來，不會插進地裡）
    const D = 400;
    const HW = 105; // 合掌的判定：正中 ±105
    warn(cx, gy, HW, o.warn + 0.05);
    [-1, 1].forEach((s) => {
      warnLine(cx + s * D, yc, cx + s * (HW + 2), yc, 34, o.warn + 0.05);
      palm(m, {
        style: 'clap', ox: cx + s * D, oy: yc, tx: cx + s * (hw + 1), ty: yc, gy, rot: -Math.PI / 2, flip: -s, sz, hw: HW, tx0: cx,
        warn: o.warn, fly: 0.2, hold: 0.45, noLog: s > 0,
        onLand: s > 0 ? null : (pp) => {
          palmImpact(cx, gy, true, pp.rage);
          G.fx.ring(cx, yc - 20, 'rgba(255,236,170,0.8)', 120, 0.3, 6);
          palmHit(m, pp, { x: cx - HW, y: gy - 175, w: HW * 2, h: 177 }, o.k, cx);
        },
      });
    });
    return { launch: o.warn, arm: zkArm(-1, 1), arm2: zkArm(1, 1), after: 0.55 };
  }
  // 依時間表出掌，並驅動冰像的手臂：list = [{ at, fire(P2) → { launch（相對 at）, arm, arm2, after } }]
  function palmRun(m, list, o) {
    let k = 0;
    const live = [];
    let end = 0;
    m.attackPhase = 'wind';
    m.fx.palm = true;
    return (t, dt, P2) => {
      while (k < list.length && t >= list[k].at) {
        const s = list[k++];
        const r = s.fire(P2);
        if (!r) continue;
        if (!(o && o.quiet) || k === 1) G.audio.play('bossWarn');
        live.push({ t0: t, launch: t + r.launch, arm: r.arm, arm2: r.arm2 == null ? -1 : r.arm2, done: false });
        end = Math.max(end, t + r.launch + (r.after || 0.5));
      }
      for (const h of live) {
        if (h.done || t < h.launch) continue;
        h.done = true;
        m.fx.hitArm = h.arm;
        m.fx.hitArm2 = h.arm2;
        m.fx.hitT = 0.45;
        m.fx.slam = 1;
      }
      let next = null;
      for (const h of live) if (!h.done && (!next || h.launch < next.launch)) next = h;
      if (next) {
        m.attackPhase = 'wind';
        m.fx.arm = next.arm;
        m.fx.arm2 = next.arm2;
        m.fx.slam = Math.min(0.7, ((t - next.t0) / Math.max(0.1, next.launch - next.t0)) * 0.7);
      } else {
        m.attackPhase = 'strike';
        m.fx.arm = -1;
        m.fx.arm2 = -1;
        m.fx.slam = Math.max(0, m.fx.slam - dt * 3);
      }
      if (o && o.tick) o.tick(t, dt);
      if (k >= list.length && t > end) {
        Object.assign(m.fx, { arm: -1, arm2: -1, slam: 0, palm: false, gassho: 0 });
        return true;
      }
      return false;
    };
  }
  const nearFloor = (m, P) => Math.abs(P.y - m.y) < 150;
  // 橫掃的掌經過 x 的時間（出掌後幾秒）
  const sweepPass = (S, x) => Math.abs(x - S.x0) / S.speed;
  // 連續橫掃：dirs 依序出掌，每一掌經過玩家（排程時的位置）的時間至少比上一掌晚 gap 秒（跳起來落地再跳）
  function sweepList(m, P, dirs, warnT, k, gap) {
    const list = [];
    let at = 0;
    let lastPass = -9;
    for (const dir of dirs) {
      const S = sweepInfo({ dir }, P.x);
      at = Math.max(at, lastPass + gap - warnT - sweepPass(S, P.x));
      lastPass = at + warnT + sweepPass(S, P.x);
      list.push({ at, fire: (P2) => sweepPalm(m, P2, { dir, S, warn: warnT, k }) });
      at += 0.3;
    }
    return list;
  }
  // 千手連擊的一拍：一掌打在玩家當下的位置（正上方或陡斜，判定 ±r），另外 0～2 掌是 ±280 外的圍欄（斜刺、光環在更外側，
  // 軌跡不會經過玩家）。中間那掌躲開 r + 17 px（約 0.36 秒）就好，躲開後的空位（77～203 px）一定不會被同一拍的圍欄蓋到。
  function barrageBeat(m, P2, n, warnT, k, r) {
    let first = null;
    if (Math.random() < 0.5) first = dropPalm(m, P2, { warn: warnT, k, r });
    else first = thrustPalm(m, P2, { from: U.pick([-1, 1]), th: U.rand(0.18, 0.35), warn: warnT, k, r, lvl: 0 });
    const sides = n >= 3 ? [-1, 1] : [U.pick([-1, 1])];
    for (const f of sides) {
      const x = zkReach(m, P2.x + f * 280);
      if (Math.abs(x - P2.x) < 250) continue; // 被地圖邊緣夾住：這一側不出
      thrustPalm(m, P2, { x, from: f, th: U.rand(0.45, 0.75), warn: warnT, k, r, lvl: 1 });
    }
    return first;
  }
  const zakumMoves = [
    {
      // 從天而降：連續 2 掌（暴走 3 掌），每掌瞄準玩家當下的位置
      id: 'drop', w: 3,
      run(m, P) {
        const rage = m.fx.rage;
        const n = rage ? 3 : 2;
        const gap = rage ? 0.25 : 0.3;
        const W = rage ? 0.6 : 0.7;
        const r = rage ? 95 : 100;
        const list = [];
        for (let i = 0; i < n; i++) list.push({ at: i * gap, fire: (P2) => dropPalm(m, P2, { warn: W, k: 0.9, r }) });
        return palmRun(m, list);
      },
    },
    {
      // 貼地橫掃：左右各一掌（暴走 3 掌來回），經過玩家的時間至少差 0.95 秒（暴走 0.9 秒）
      id: 'sweep', w: 2,
      ok: nearFloor,
      run(m, P) {
        const rage = m.fx.rage;
        const d = U.pick([-1, 1]);
        return palmRun(m, sweepList(m, P, rage ? [d, -d, d] : [d, -d], rage ? 0.7 : 0.8, 0.85, rage ? 0.9 : 0.95));
      },
    },
    {
      // 斜刺：左上／右上輪流，3～4 掌每 0.2 秒（暴走 4～5 掌每 0.15 秒），各自瞄準玩家當下的位置
      id: 'thrust', w: 3,
      run(m, P) {
        const rage = m.fx.rage;
        const n = rage ? U.randi(4, 5) : U.randi(3, 4);
        const gap = rage ? 0.15 : 0.2;
        const W = rage ? 0.5 : 0.55;
        let s = U.pick([-1, 1]);
        const list = [];
        for (let i = 0; i < n; i++) {
          const from = s;
          list.push({ at: i * gap, fire: (P2) => thrustPalm(m, P2, { from, th: U.rand(0.45, 0.65), warn: W, k: 0.7, r: 65, lvl: i % 2 }) });
          s = -s;
        }
        return palmRun(m, list);
      },
    },
    {
      // 合掌：2 次、間隔 0.45 秒（暴走 3 次），每次拍在玩家當下的位置
      id: 'clap', w: 2,
      run(m, P) {
        const rage = m.fx.rage;
        const n = rage ? 3 : 2;
        const W = rage ? 0.75 : 0.8;
        const list = [];
        for (let i = 0; i < n; i++) list.push({ at: i * 0.45, fire: (P2) => clapPalms(m, P2, { warn: W, k: 0.9, sz: rage ? 4.6 : 4.3 }) });
        return palmRun(m, list);
      },
    },
    {
      // 暴走限定：千手連擊。一共 14～20 掌：每 0.42 秒一拍（每拍 2～3 掌、各自預警 0.45 秒，見 barrageBeat），
      // 中間可能插一次貼地橫掃（預警 0.7 秒；掃完、落地後 0.35 秒才接下一拍），最後停 0.3 秒、正中一記大掌（r 150、預警 0.9 秒）
      id: 'barrage', w: 3,
      ok: (m) => !!m.fx.rage,
      run(m, P) {
        const total = U.randi(14, 20);
        const BEAT = 0.42;
        const WARN = 0.45;
        const list = [];
        let at = 0.35;
        let left = total - 1; // 最後一掌是正中的大掌
        const sweepBeat = nearFloor(m, P) ? U.randi(2, 4) : -1;
        say(m, '……千手。', '#bfe9ff');
        for (let b = 0; left > 0; b++) {
          if (b === sweepBeat) {
            const dir = U.pick([-1, 1]);
            const S = sweepInfo({ dir, speed: 1500 }, P.x);
            // 光環位置在出掌當下才算（玩家這幾秒會移動）；時間表用排程時估的飛行時間
            list.push({ at, fire: (P2) => sweepPalm(m, P2, { dir, speed: 1500, warn: 0.7, k: 0.6 }) });
            at += 0.7 + S.fly + 0.35;
            left--;
            continue;
          }
          const n = Math.min(left, U.randi(2, 3));
          list.push({ at, fire: (P2) => barrageBeat(m, P2, n, WARN, 0.6, 60) });
          left -= n;
          at += BEAT;
        }
        at += 0.3;
        list.push({ at, fire: (P2) => dropPalm(m, P2, { warn: 0.9, k: 0.9, r: 150, fin: true }) });
        return palmRun(m, list, {
          quiet: true,
          tick: (t) => {
            m.fx.gassho = Math.min(1, t * 3);
          },
        });
      },
    },
  ];

  // 光束（星蝕魔龍的虛空吐息）：蓄力 1.2 秒（預警線瞄準玩家當下的位置），發射 0.6 秒、只打一下
  // 方向在蓄力開始時就決定；起點每一幀都跟著嘴／眼（魔龍懸空會上下飄），所以預警線、光束、判定三者永遠從同一點出發。
  // o.eye(k, fire, a)：k＝蓄力進度 0..1、fire＝是否發射中、a＝光束角度（世界座標），回傳 { x, y }
  // o.pose(a)（可省略）：依光束角度設定頭的姿勢旗標（例如 m.fx.beamTilt），讓美術把頭對準光束
  function beamMove(m, P, o) {
    let shot = 0;
    let t0 = 0;
    let ang = 0;
    let seg = null;
    let warnZ = null;
    let beamZ = null;
    const place = (k, fire) => {
      const e = o.eye(k, fire, ang);
      seg = { x1: e.x, y1: e.y, x2: e.x + Math.cos(ang) * o.len, y2: e.y + Math.sin(ang) * o.len };
      for (const z of [fire ? beamZ : warnZ]) {
        if (!z) continue;
        Object.assign(z, seg);
        z.x = (seg.x1 + seg.x2) / 2;
        z.y = Math.max(seg.y1, seg.y2);
      }
    };
    const aim = (P2) => {
      const tx = P2.x;
      const ty = P2.y - 30;
      // 起點會跟著角度（頭的仰角）移動，算兩次讓光束確實從嘴巴指向玩家
      let e = o.eye(1, true, 0);
      for (let i = 0; i < 2; i++) {
        ang = Math.atan2(ty - e.y, tx - e.x);
        if (o.pose) o.pose(ang);
        e = o.eye(1, true, ang);
      }
      ang = Math.atan2(ty - e.y, tx - e.x);
      if (o.pose) o.pose(ang);
      const s = o.eye(0, false, ang);
      warnZ = warnLine(s.x, s.y, s.x + Math.cos(ang) * o.len, s.y + Math.sin(ang) * o.len, o.w, 1.2);
      beamZ = null;
      G.audio.play('bossWarn');
    };
    aim(P);
    m.attackPhase = 'wind';
    let hit = false;
    let fired = false;
    return (t, dt, P2) => {
      const lt = t - t0;
      if (lt < 1.2) {
        m.fx[o.flag] = lt / 1.2;
        m.fx.beamFire = false;
        place(lt / 1.2, false);
        return false;
      }
      m.fx[o.flag] = 1;
      m.fx.beamFire = true;
      m.attackPhase = 'strike';
      if (!fired) {
        fired = true;
        hit = false;
        // 預警線在發射的同一幀收掉：畫面上只會有一道光束
        if (warnZ) warnZ.t = warnZ.life + 1;
        warnZ = null;
        G.audio.play('thunder');
        G.fx.shake(5, 0.4);
        place(1, true);
        beamZ = zone({ kind: 'fb_beam', x: (seg.x1 + seg.x2) / 2, y: Math.max(seg.y1, seg.y2), x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2, w: o.w, r: o.len / 2, color: o.color, life: 0.6 });
      }
      place(1, true);
      if (!hit && lt < 1.75 && P2.alive() && segDist(P2.x, P2.y - 30, seg.x1, seg.y1, seg.x2, seg.y2) < o.w / 2 + 16) {
        hit = hurtP(m, o.k, m.x) || hit;
      }
      if (lt > 1.8) {
        shot++;
        m.fx.beamFire = false;
        if (shot < o.times && engaged(m, P2)) {
          t0 = t;
          fired = false;
          m.dir = U.sign(P2.x - m.x) || m.dir;
          m.fbAct.dir = m.dir;
          aim(P2);
          m.attackPhase = 'wind';
          return false;
        }
        m.fx[o.flag] = 0;
        return true;
      }
      return false;
    };
  }

  // 星蝕魔龍嘴巴的位置：照抄 js/art/fieldboss.js fb_voiddragon 的變換
  //   畫布：(m.x, m.y − hover) → scale(dir·sc) → scale(K = h/250) → translate(0, fl = sin(t·1.6)·5)
  //   頭：translate(84 + headX/2, −150 − headUp·20) → rotate(−headUp) → 嘴 (74, 14)
  //   噴吐時 headX = 10、headUp = fx.beamTilt（頭對準光束）；蓄力時 headUp = 0.35k、headX = −14k（往後仰）
  const VOID_TILT = [-0.6, 0.4];
  const voidTilt = (m, a) => {
    const la = Math.atan2(Math.sin(a), Math.cos(a) * (m.dir || 1)); // 面向前方時的角度（往下為正）
    return U.clamp(-la, VOID_TILT[0], VOID_TILT[1]);
  };
  const voidMouth = (m, k, fire) => {
    const sc = m.scale || 1;
    const K = (m.h || 220) / 250;
    const hu = fire ? m.fx.beamTilt || 0 : 0.35 * k;
    const hx = fire ? 10 : -14 * k;
    const fl = m.dead ? 0 : Math.sin((m.t || 0) * 1.6) * 5;
    const c = Math.cos(hu);
    const s = Math.sin(hu);
    const lx = 84 + hx * 0.5 + 74 * c + 14 * s;
    const ly = -150 - hu * 20 - 74 * s + 14 * c + fl;
    return { x: m.x + (m.dir || 1) * sc * K * lx, y: m.y - (m.hover || 0) + sc * K * ly };
  };

  // ═════ 星蝕魔龍（5-4）：虛空吐息、黑洞球、墜星雨 ═════
  const voidMoves = [
    {
      id: 'breath', w: 3,
      ok: (m, P) => Math.abs(P.x - m.x) < 1000,
      run(m, P) {
        return beamMove(m, P, {
          eye: (k, fire) => voidMouth(m, k, fire),
          pose: (a) => (m.fx.beamTilt = voidTilt(m, a)),
          len: 1150, w: 70, k: 1.5, color: '#b88aff', flag: 'breath', times: m.fx.rage ? 2 : 1,
        });
      },
    },
    {
      id: 'orb', w: 2.5,
      run(m, P) {
        m.attackPhase = 'wind';
        G.audio.play('bossWarn');
        const n = m.fx.rage ? 2 : 1;
        let done = false;
        return (t) => {
          if (t < 0.9) {
            m.fx.breath = t / 0.9 * 0.5;
            return false;
          }
          if (!done) {
            done = true;
            m.attackPhase = 'strike';
            m.fx.breath = 0;
            G.audio.play('portal');
            for (let i = 0; i < n; i++) {
              const sx = m.x + m.dir * m.halfW * 0.8;
              const sy = midY(m);
              const a = Math.atan2(G.player.y - 30 - sy, G.player.x - sx) + (i - (n - 1) / 2) * 0.5;
              const p = {
                kind: 'fb_voidorb', x: sx, y: sy, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 26, homing: 0.7,
                dmg: capDmg(m, 1.2), life: 4.5, t: 0, seed: Math.random() * 6, owner: 'monster', fb: true, pullR: 260,
              };
              p.onTick = (pp, d) => {
                const P2 = G.player;
                if (P2.alive() && U.dist(P2.x, P2.y - 30, pp.x, pp.y) < pp.pullR) {
                  P2.x += U.sign(pp.x - P2.x) * 120 * d;
                  P2.slowT = Math.max(P2.slowT || 0, 0.15);
                }
                if (pp.t + d >= pp.life && !pp.popped) {
                  pp.popped = true;
                  G.fx.ring(pp.x, pp.y, 'rgba(184,138,255,0.9)', 100, 0.35, 5);
                  G.fx.burst(pp.x, pp.y, ['#b88aff', '#1a0a2a', '#ffffff'], 18, 300, { grav: 0 });
                  G.audio.play('thunder');
                  if (P2.alive() && U.dist(P2.x, P2.y - 30, pp.x, pp.y) < 100) hurtP(m, 1.0, pp.x);
                }
              };
              G.world.projectiles.push(p);
            }
          }
          return t > 1.3;
        };
      },
    },
    {
      id: 'stars', w: 2,
      run(m, P) {
        say(m, '星辰，墜落吧。', '#d8c8ff');
        m.attackPhase = 'wind';
        G.audio.play('bossWarn');
        const n = m.fx.rage ? 9 : 6;
        let k = 0;
        return (t, dt, P2) => {
          while (k < n && t >= 0.5 + k * 0.17) {
            const gy = groundUnder(P2, m);
            const x = mapClamp(k === 0 ? P2.x : P2.x + U.rand(-340, 340));
            skyDrop(m, x, gy, { dx: -90, k: 1.1, r: 58, p: { style: 'star' }, colors: ['#ffe9a0', '#b88aff', '#ffffff'], sound: 'thunder' });
            k++;
          }
          return t > 0.5 + n * 0.17 + 0.4;
        };
      },
    },
  ];

  Object.assign(AB, {
    fbShroom: {
      init(m) {
        Object.assign(m.fx, { breath: 0, jump: false, rage: false, summon: 0 });
      },
      update(m, dt, P) {
        return brain(m, dt, P, shroomMoves);
      },
    },
    fbKraken: {
      init(m) {
        Object.assign(m.fx, { slam: 0, ink: false, rage: false, throw: 0 });
      },
      update(m, dt, P) {
        return brain(m, dt, P, krakenMoves);
      },
    },
    fbBalrog: {
      init(m) {
        Object.assign(m.fx, { whip: 0, whipCharge: 0, whipT: 0, whipLen: 560, fly: false, rage: false });
        m.hover = 0;
      },
      update(m, dt, P) {
        return brain(m, dt, P, balrogMoves, (mm, d) => {
          if (mm.hover > 0) mm.hover = Math.max(0, mm.hover - 300 * d);
        });
      },
    },
    fbZakum: {
      init(m) {
        Object.assign(m.fx, { arm: -1, arm2: -1, slam: 0, rage: false, hitArm: -1, hitArm2: -1, hitT: 0, palm: false, gassho: 0 });
      },
      update(m, dt, P) {
        // 半埋在地裡：不移動，只轉向
        if (m.fx.hitT > 0) m.fx.hitT = Math.max(0, m.fx.hitT - dt);
        // 美術：出掌期間背後的手快速擺動（0..1 平滑過渡）
        m.fx.palmK = U.clamp((m.fx.palmK || 0) + (m.fx.palm ? dt * 4 : -dt * 2), 0, 1);
        const was = !!m.fbAct;
        brain(m, dt, P, zakumMoves);
        // 百式的節奏：兩招之間幾乎不停（一般 0.55～0.9 秒、暴走 0.3～0.5 秒）
        if (was && !m.fbAct) m.fbCd = m.fx.rage ? U.rand(0.3, 0.5) : U.rand(0.55, 0.9);
        m.vx = 0;
        if (!m.fbAct && P.alive()) m.dir = U.sign(P.x - m.x) || m.dir;
        return true;
      },
    },
    fbVoid: {
      init(m) {
        Object.assign(m.fx, { breath: 0, beamFire: false, beamTilt: 0, rage: false });
        m.hover = 40;
      },
      update(m, dt, P) {
        m.hover = 40 + Math.sin(m.t * 1.6) * 10;
        return brain(m, dt, P, voidMoves);
      },
    },
  });

  // ── 管理：出現、冷卻、第二階段、血條、打倒 ──
  const FB = (G.fieldBoss = {
    enterT: 0,
    slowT: 0,
    palmLog, // 測試用：千手冰像每一掌有沒有碰到玩家
    zakumMoves, // 測試用：可以直接指定千手冰像出哪一招
    barFlash: 0,
    banner: null,

    cdStore() {
      const f = G.world.flags;
      if (!f.fieldBoss || typeof f.fieldBoss !== 'object') f.fieldBoss = {};
      return f.fieldBoss;
    },
    // 還要多少秒（遊戲時間）才會再出現
    cooldown(id) {
      const at = this.cdStore()[id] || 0;
      return Math.max(0, at - (G.player.playTime || 0));
    },
    clearCooldown(id) {
      delete this.cdStore()[id];
    },
    current() {
      return G.world.monsters.find((m) => m.fieldBoss && !m.dead && !m.illusion) || null;
    },
    idForMap(mapId) {
      return (G.data.fieldBosses || {})[mapId] || null;
    },

    // 新美術還沒載入時：借用舊怪的外觀，放大到規格的體型（碰撞箱不變）
    fallbackScale(d) {
      const A = G.art;
      if (!d.fallback || (A.MONSTER_DRAW && A.MONSTER_DRAW[d.art])) return 1;
      const M = G.data.monsters;
      let ref = null;
      for (const k in M) {
        const o = M[k];
        if (o.art === d.fallback[0] && !o.fieldBoss && (!d.fallback[1] || !o.stage || o.stage === d.fallback[1])) {
          ref = o;
          break;
        }
      }
      return ref ? U.clamp(d.h / ref.h, 1.5, 4) : 2.5;
    },

    spawnX(map, P) {
      const p = map.platforms[0];
      const lo = Math.max(p[0] + 320, 320);
      const hi = Math.min(p[1] - 320, map.w - 320);
      const ok = [];
      let best = lo;
      for (let x = lo; x <= hi; x += 40) {
        if (Math.abs(x - P.x) >= 500) ok.push(x);
        if (Math.abs(x - P.x) > Math.abs(best - P.x)) best = x;
      }
      return ok.length ? U.pick(ok) : best;
    },

    spawn(id) {
      const W = G.world;
      const d = G.data.monsters[id];
      if (!d || !W.map) return null;
      const P = G.player;
      const x = this.spawnX(W.map, P);
      const m = new G.Monster(id, 0, x, { noVariant: true });
      m.fieldBoss = true;
      m.shiny = false;
      const s = this.fallbackScale(d);
      if (s !== 1) {
        m.scale = s;
        m.w = d.w / s;
        m.h = d.h / s;
      }
      m.halfW = d.w / 2;
      m.exp = Math.round(G.data.balance.monsterExp(d.lv) * 25);
      m.touchCd = 99;
      m.fbTouch = 1;
      m.aggroT = 3;
      m.fbCd = 2;
      m.dir = U.sign(P.x - m.x) || 1;
      m.fx.spawn = 1; // 出現動畫 1 → 0（1.2 秒），這段時間不出招
      W.monsters.push(m);
      // 出現：震動、音效、中央大字
      G.fx.shake(10, 0.6, true);
      G.fx.screenFlash('#40104a', 0.35);
      G.audio.play('roar');
      setTimeout(() => G.audio && G.audio.play('bossWarn'), 250);
      for (let i = 0; i < 3; i++) G.fx.ring(m.x, midY(m), 'rgba(170,80,255,0.8)', 140 + i * 60, 0.5 + i * 0.15, 6);
      G.fx.burst(m.x, midY(m), ['#6a2a9a', '#1a0a2a', '#ff5ad0', '#ffffff'], 40, 420, { grav: 0, life: 0.9 });
      this.banner = { text: '⚠ ' + d.name + ' 出現了！', t: 0, life: 3 };
      G.hud.toast('魔化的氣息……' + d.name + '（Lv.' + d.lv + '）出現在這張地圖上！', '#ff9ad8');
      return m;
    },

    // 除錯：在指定地圖（預設目前地圖）立刻叫出魔王（會先切過去、清掉冷卻）
    force(mapId) {
      const W = G.world;
      mapId = mapId || W.mapId;
      const id = this.idForMap(mapId);
      if (!id) return null;
      if (W.mapId !== mapId) W.load(mapId);
      const cur = this.current();
      if (cur) return cur;
      this.clearCooldown(id);
      return this.spawn(id);
    },

    enrage(m) {
      m.fx.rage = true;
      m.atk = Math.round(m.atk * 1.1);
      m.fbCd = Math.min(m.fbCd || 0, 0.8);
      this.barFlash = 1;
      G.fx.shake(9, 0.5, true);
      G.fx.screenFlash('#ff3a3a', 0.35);
      G.audio.play('roar');
      G.fx.ring(m.x, midY(m), 'rgba(255,60,60,0.9)', 200, 0.5, 8);
      G.fx.burst(m.x, midY(m), ['#ff3a3a', '#ffb03a', '#1a0a0a'], 36, 380, { grav: 0, life: 0.8 });
      G.fx.text(m.x, topY(m) - 30, '暴走！', '#ff5a5a', 30, 1.4);
    },

    onKilled(m) {
      const W = G.world;
      const P = G.player;
      const d = m.def;
      this.cdStore()[m.id] = (P.playTime || 0) + COOLDOWN;
      // 小怪、殘留的招式一起消失
      W.monsters.forEach((o) => {
        if (o.isAdd && !o.dead) o.takeDamage(o.hp + 1, 1, 0, false);
      });
      for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i].fb) W.projectiles.splice(i, 1);
      for (let i = W.zones.length - 1; i >= 0; i--) if (W.zones[i].fb) W.zones.splice(i, 1);
      waves.length = 0;
      timers.length = 0;
      // 大爆炸＋慢動作
      const cx = m.x;
      const cy = midY(m);
      this.slowT = SLOWMO;
      G.fx.shake(16, 0.8, true);
      G.fx.screenFlash('#ffffff', 0.7);
      G.audio.play('roar');
      G.audio.play('legendary');
      for (let i = 0; i < 4; i++) G.fx.ring(cx, cy, i % 2 ? 'rgba(255,220,120,0.9)' : 'rgba(200,120,255,0.9)', 160 + i * 90, 0.5 + i * 0.12, 8);
      G.fx.burst(cx, cy, ['#ffffff', '#ffe39a', '#c080ff', '#ff5ad0', '#1a0a2a'], 70, 620, { life: 1.1, grav: 200 });
      G.fx.burst(cx, cy, ['#ffe066', '#ffffff'], 20, 520, { shape: 'star', size: 7, life: 1, grav: 300 });
      for (let i = 1; i <= 4; i++) {
        later(i * 0.12, () => {
          const x = cx + U.rand(-d.w * 0.5, d.w * 0.5);
          const y = cy + U.rand(-d.h * 0.4, d.h * 0.4);
          G.fx.burst(x, y, ['#ffffff', '#ffb03a', '#c080ff'], 18, 360, { life: 0.7 });
          G.fx.ring(x, y, 'rgba(255,240,200,0.9)', 90, 0.3, 5);
          G.audio.play('rockHit');
        });
      }
      G.fx.text(cx, cy - d.h * 0.5 - 30, d.name + ' 被打倒了！', '#ffe066', 26, 2);
      // 掉落：金幣約一般怪 20 倍、必掉 1 件史詩以上、2～3 瓶大紅／大藍
      const L = G.loot;
      const lv = m.level;
      const total = Math.round(U.rand(lv * 1.0, lv * 1.8) * 20);
      const piles = 5;
      const by = m.y - 60;
      for (let i = 0; i < piles; i++) L.spawn('gold', cx + U.rand(-80, 80), by, { amount: Math.max(1, Math.round(total / piles)) });
      L.spawn('equip', cx, by - 20, { item: L.randomEquip(lv, 'fieldBoss') });
      L.spawn('potion', cx - 40, by, { potion: 'hpL', count: U.randi(1, 2) });
      L.spawn('potion', cx + 40, by, { potion: 'mpL', count: 1 });
      G.hud.toast('打倒了野外魔王「' + d.name + '」！6 分鐘後會再出現', '#ffe066');
      setTimeout(() => G.save && G.save.write(), 400);
    },

    // 每幀（在 G.mobAbil.tick 裡）
    tick(dt) {
      const W = G.world;
      const P = G.player;
      this.enterT += dt;
      if (this.barFlash > 0) this.barFlash = Math.max(0, this.barFlash - dt * 1.5);
      for (let i = timers.length - 1; i >= 0; i--) {
        const tm = timers[i];
        tm.t -= dt;
        if (tm.t <= 0) {
          timers.splice(i, 1);
          tm.fn();
        }
      }
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.z.r += w.speed * dt;
        if (!w.hit && P.alive() && P.onGround && (Math.abs(P.y - w.z.y) < 30 || (P.plat === 0 && w.m.plat === 0)) && Math.abs(Math.abs(P.x - w.z.x) - w.z.r) < 28) {
          w.hit = true;
          hurtP(w.m, w.dmg, w.z.x);
        }
        if (w.z.t >= w.z.life) waves.splice(i, 1);
      }
      let alive = null;
      for (const m of W.monsters) {
        if (!m.fieldBoss || m.dead) continue;
        alive = m;
        // 不吃長時間的控制：暈眩／冰凍累積 0.5 秒後免疫 2 秒
        m.hurtT = 0;
        if (m.fbImmune > 0) {
          m.fbImmune -= dt;
          m.stunT = 0;
          m.frozenT = 0;
        } else if (m.stunT > 0 || m.frozenT > 0) {
          m.fbCc = (m.fbCc || 0) + dt;
          if (m.fbCc > 0.5) {
            m.fbCc = 0;
            m.fbImmune = 2;
            m.stunT = 0;
            m.frozenT = 0;
          }
        }
        // 身體碰撞：比一般怪溫和（0.5 倍攻擊、1.5 秒一次）
        m.touchCd = 99;
        m.fbTouch = (m.fbTouch || 0) - dt;
        if (m.fbTouch <= 0 && P.alive()) {
          const hb = m.hitbox();
          const body = { x: hb.x + hb.w * 0.2, y: hb.y + hb.h * 0.15, w: hb.w * 0.6, h: hb.h * 0.85 };
          if (U.overlap(body, P.hitbox()) && hurtP(m, 0.5, m.x, true)) m.fbTouch = 1.5;
        }
        if (!m.fx.rage && m.hp <= m.maxHp * 0.5) this.enrage(m);
      }
      // 出現：在綁定的地圖上、冷卻已過、進地圖 2.5 秒後
      const id = this.idForMap(W.mapId);
      if (id && !alive && this.enterT > 2.5 && P.alive() && this.cooldown(id) <= 0 && !(G.tutorial && G.tutorial.active) && !W.boss) this.spawn(id);
    },

    reset() {
      this.enterT = 0;
      this.barFlash = 0;
      this.banner = null;
      timers.length = 0;
      waves.length = 0;
    },

    // 畫面上方的魔王血條＋出現時的中央大字（接在 G.hud.draw 後面）
    drawHud(ctx) {
      const H = G.hud;
      const W = G.W;
      if (this.banner) {
        const b = this.banner;
        const a = b.t < 0.3 ? b.t / 0.3 : b.t > b.life - 0.6 ? (b.life - b.t) / 0.6 : 1;
        ctx.globalAlpha = Math.max(0, a);
        const g = ctx.createLinearGradient(0, 240, 0, 350);
        g.addColorStop(0, 'rgba(40,0,50,0)');
        g.addColorStop(0.5, 'rgba(40,0,50,0.7)');
        g.addColorStop(1, 'rgba(40,0,50,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 240, W, 110);
        const s = 1 + Math.max(0, 0.25 - b.t) * 1.2;
        ctx.save();
        ctx.translate(W / 2, 295);
        ctx.scale(s, s);
        H.text(ctx, b.text, 0, 0, 44, '#ffb0e0', 'center');
        ctx.restore();
        H.text(ctx, '野外魔王', W / 2, 256, 16, '#ff7ac0', 'center');
        ctx.globalAlpha = 1;
      }
      const m = this.current();
      if (!m || G.world.boss) return;
      const bw = 560;
      const bx = (W - bw) / 2;
      const rage = !!m.fx.rage;
      H.panel(ctx, bx - 10, 50, bw + 20, 44, 10, rage ? 'rgba(70,10,14,0.85)' : 'rgba(35,14,44,0.82)');
      H.text(ctx, '⚠ Lv.' + m.level + ' ' + m.def.name + (rage ? '（暴走）' : ''), W / 2, 62, 14, rage ? '#ff8a8a' : '#e8c0ff', 'center');
      H.bar(ctx, bx, 72, bw, 16, m.hp / m.maxHp, rage ? '#ff5a4a' : '#c07aff', rage ? '#a01818' : '#6a2aa8', Math.ceil(m.hp) + ' / ' + m.maxHp);
      if (this.barFlash > 0) {
        ctx.globalAlpha = this.barFlash * 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        G.art.roundRect(ctx, bx - 10, 50, bw + 20, 44, 10);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
  });

  // 接上 mobAbil 的每幀推進與地圖重置
  const baseTick = AB.tick;
  const baseReset = AB.reset;
  AB.tick = function (dt) {
    baseTick.call(AB, dt);
    FB.tick(dt);
  };
  AB.reset = function () {
    baseReset.call(AB);
    FB.reset();
    install();
  };

  // 野外魔王不會被擊退（巨大的身體），其他照常
  const baseTake = G.Monster.prototype.takeDamage;
  G.Monster.prototype.takeDamage = function (dmg, dir, knock, crit) {
    return baseTake.call(this, dmg, dir, this.fieldBoss ? 0 : knock, crit);
  };

  // world.js、hud.js 在這個檔案之後才載入：等全部載入完再接上
  let installed = false;
  function install() {
    if (installed || !G.world || !G.hud || !G.art) return;
    installed = true;
    const W = G.world;
    const baseUpdate = W.update;
    W.update = function (dt) {
      // 打倒時的慢動作
      if (FB.slowT > 0) {
        FB.slowT -= dt;
        dt *= 0.3;
      }
      if (FB.banner) {
        FB.banner.t += dt;
        if (FB.banner.t > FB.banner.life) FB.banner = null;
      }
      return baseUpdate.call(this, dt);
    };
    const baseKilled = W.onMonsterKilled;
    W.onMonsterKilled = function (m) {
      baseKilled.call(this, m);
      if (m.fieldBoss && !m.illusion) FB.onKilled(m);
    };
    const baseHud = G.hud.draw;
    G.hud.draw = function (ctx) {
      baseHud.apply(this, arguments);
      if (G.scene === 'play' && G.world.map) FB.drawHud(ctx);
    };
    installFallbackArt();
  }
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', install);

  // ── 美術還沒到之前的簡單備援（js/art/fieldboss.js 有畫的就用它的）──
  function installFallbackArt() {
    const A = G.art;
    A.ZONE_DRAW = A.ZONE_DRAW || {};
    A.PROJ_DRAW = A.PROJ_DRAW || {};
    const Z = A.ZONE_DRAW;
    const PR = A.PROJ_DRAW;
    const fade = (z) => Math.max(0, Math.min(1, (z.life - z.t) * 4, z.t * 8));
    const ground = (ctx, z, col, a, rr) => {
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.scale(1, 0.28);
      ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    const def = {
      fb_warn(ctx, z, t) {
        const p = Math.min(1, z.t / z.life);
        const blink = 0.5 + 0.5 * Math.sin(z.t * (10 + p * 30));
        ctx.save();
        ctx.globalAlpha = fade(z);
        ground(ctx, z, '255,40,60', 0.18 + blink * 0.12, z.r);
        ground(ctx, z, '255,90,60', 0.35, z.r * p);
        ctx.translate(z.x, z.y);
        ctx.scale(1, 0.28);
        ctx.strokeStyle = 'rgba(255,80,80,' + (0.6 + blink * 0.4).toFixed(3) + ')';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, z.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      },
      fb_warnline(ctx, z, t) {
        const p = Math.min(1, z.t / z.life);
        const blink = 0.5 + 0.5 * Math.sin(z.t * (10 + p * 30));
        const a = Math.atan2(z.y2 - z.y1, z.x2 - z.x1);
        const len = Math.hypot(z.x2 - z.x1, z.y2 - z.y1);
        ctx.save();
        ctx.globalAlpha = fade(z);
        ctx.translate(z.x1, z.y1);
        ctx.rotate(a);
        ctx.fillStyle = 'rgba(255,40,60,' + (0.14 + blink * 0.12).toFixed(3) + ')';
        ctx.fillRect(0, -z.w / 2, len, z.w);
        ctx.fillStyle = 'rgba(255,110,80,0.35)';
        ctx.fillRect(0, -z.w / 2, len * p, z.w);
        ctx.strokeStyle = 'rgba(255,80,80,' + (0.6 + blink * 0.4).toFixed(3) + ')';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, -z.w / 2, len, z.w);
        ctx.restore();
      },
      fb_whipcrack(ctx, z, t) {
        if (z.t < (z.hitAt || 0)) return;
        ctx.save();
        ctx.globalAlpha = fade(z);
        ctx.fillStyle = 'rgba(255,140,40,0.45)';
        ctx.fillRect(Math.min(z.x1, z.x2), z.y - 80, Math.abs(z.x2 - z.x1), 80);
        ctx.restore();
      },
      fb_beam(ctx, z, t) {
        const a = Math.atan2(z.y2 - z.y1, z.x2 - z.x1);
        const len = Math.hypot(z.x2 - z.x1, z.y2 - z.y1);
        const k = Math.sin(Math.min(1, z.t / z.life) * Math.PI);
        ctx.save();
        ctx.translate(z.x1, z.y1);
        ctx.rotate(a);
        ctx.globalAlpha = 0.5 + k * 0.5;
        ctx.fillStyle = z.color || '#b88aff';
        ctx.fillRect(0, -z.w / 2 * (0.6 + k * 0.4), len, z.w * (0.6 + k * 0.4));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -z.w / 6, len, z.w / 3);
        ctx.restore();
      },
      fb_sporebreath(ctx, z, t) {
        ctx.save();
        ctx.globalAlpha = fade(z) * 0.7;
        for (let i = 0; i < 7; i++) {
          const x = z.x + Math.cos(t * 0.9 + i * 1.3) * z.r * 0.6;
          const y = z.y - 50 + Math.sin(t * 1.2 + i) * 30;
          const g = ctx.createRadialGradient(x, y, 2, x, y, z.r * 0.55);
          g.addColorStop(0, 'rgba(150,255,110,0.7)');
          g.addColorStop(1, 'rgba(100,40,150,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, z.r * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      },
      fb_inkcloud(ctx, z, t) {
        ctx.save();
        ctx.globalAlpha = fade(z) * 0.8;
        for (let i = 0; i < 8; i++) {
          const x = z.x + Math.cos(t * 0.7 + i * 0.8) * z.r * 0.65;
          const y = z.y - 40 + Math.sin(t + i * 1.7) * 26;
          const g = ctx.createRadialGradient(x, y, 2, x, y, z.r * 0.5);
          g.addColorStop(0, 'rgba(20,16,36,0.85)');
          g.addColorStop(1, 'rgba(40,30,70,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, z.r * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      },
      fb_tentacle(ctx, z, t) {
        const k = Math.min(1, z.t / 0.15) * Math.min(1, (z.life - z.t) / 0.25);
        const h = (z.h || 170) * Math.max(0, k);
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#3a5a52';
        ctx.lineWidth = 34;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.sin(t * 6) * 26, -h * 0.5, Math.sin(t * 5 + 1) * 18, -h);
        ctx.stroke();
        ctx.strokeStyle = '#6a9a8a';
        ctx.lineWidth = 14;
        ctx.stroke();
        ctx.restore();
      },
      fb_armslam(ctx, z, t) {
        const k = Math.min(1, z.t / 0.12);
        ctx.save();
        ctx.globalAlpha = Math.min(1, (z.life - z.t) * 4);
        ctx.translate(z.x, z.y - (1 - k) * 220);
        ctx.fillStyle = '#9ab8d0';
        ctx.strokeStyle = '#3a5068';
        ctx.lineWidth = 4;
        ctx.beginPath();
        G.art.roundRect(ctx, -70, -110, 140, 110, 24);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#c8e8ff';
        ctx.fillRect(-12, -300, 24, 190);
        ctx.restore();
      },
    };
    const pdef = {
      // 千手冰像的飛掌：預警時只畫光環，出掌後畫一塊石掌
      fb_palm(ctx, p, t) {
        ctx.strokeStyle = '#d6b460';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(p.ox - p.x, p.oy - p.y, 50, 0, Math.PI * 2);
        ctx.stroke();
        if (p.t < p.warn) return;
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = '#a6b3c6';
        ctx.fillRect(-18 * p.sz, -9.5 * p.sz, 40 * p.sz, 19 * p.sz);
      },
      fb_anchor(ctx, p, t) {
        ctx.rotate(t * 10 * (p.dir || 1));
        ctx.strokeStyle = '#5a5048';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(0, 22);
        ctx.moveTo(-18, 10);
        ctx.quadraticCurveTo(0, 34, 18, 10);
        ctx.moveTo(-12, -16);
        ctx.lineTo(12, -16);
        ctx.stroke();
      },
      fb_meteor(ctx, p, t) {
        const star = p.style === 'star';
        const a = Math.atan2(p.vy, p.vx);
        ctx.rotate(a);
        const g = ctx.createLinearGradient(-90, 0, 0, 0);
        g.addColorStop(0, star ? 'rgba(184,138,255,0)' : 'rgba(255,120,40,0)');
        g.addColorStop(1, star ? 'rgba(230,210,255,0.9)' : 'rgba(255,200,90,0.9)');
        ctx.fillStyle = g;
        ctx.fillRect(-90, -10, 90, 20);
        ctx.fillStyle = star ? '#fff4c0' : '#ff7a2a';
        ctx.beginPath();
        ctx.arc(0, 0, star ? 13 : 18, 0, Math.PI * 2);
        ctx.fill();
      },
      fb_voidorb(ctx, p, t) {
        const r = 24 + Math.sin(t * 8) * 3;
        const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.2);
        g.addColorStop(0, 'rgba(184,138,255,0.6)');
        g.addColorStop(1, 'rgba(120,60,200,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0414';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d8b8ff';
        ctx.lineWidth = 3;
        ctx.stroke();
      },
    };
    for (const k in def) if (!Z[k]) Z[k] = def[k];
    for (const k in pdef) if (!PR[k]) PR[k] = pdef[k];
  }
})();
