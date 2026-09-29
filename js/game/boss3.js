// 第四章、終章的 Boss（共用工具在 boss.js 的 G.BossKit；數值在 js/data/bosses45.js；美術在 js/art/bosses3.js）。
//
// 霜靈（神社巨鐘掛在鹿角上的雪白靈鹿，冰做的身體裡凍著白角鹿——小鹿的媽媽）
//   第一階段：慢慢踱步、鐘鳴震波環（沿地面往兩邊推開，要跳）、冰柱列（地面一排排冰柱，站進空隙或爬上平台）、
//     冰晶雨（影子）、低頭衝鋒（爬上平台／繩子）、躍起踩踏、召喚雪原的小怪。
//   第二階段「裂鐘」：鐘裂開、全身冒寒氣，一直飄著小雪。更快；震波兩圈、冰柱兩波，
//     大招「暴風雪」——畫面只剩身邊看得清楚，強風把人往一邊推，同時下冰晶雨。
//
// 時間（歷代守葉獸石像的輪廓，裡面流著星沙；背後一圈巨大錶盤，四根時針像手臂）
//   第一階段：懸空滑行、時針橫掃（沿地面掃過，要跳）、時針刺擊（紅圈三連）、
//     時停＋星沙雨（玩家變得很慢，星沙落得也比較慢）、倒轉（三秒前的自己出現殘影 → 被拉回去，那裡等一下會爆開，快走開）、
//     召喚過去 Boss 的殘影（每個殘影只出一招）。
//   第二階段「無盡星空」：石殼碎開，裡面是星空與齒輪。更快，殘影一次兩個，
//     大招「十二時」——地面分成十二格，奇數格、偶數格輪流敲響（站到剛敲過的格子，或爬上平台）。
//   盟友灰鬃：在旁邊跑來跑去，每隔約 3 秒撲上去咬一口（顯示傷害數字）；每個階段替玩家擋下一次大招。
//     灰鬃不是怪物，不在 G.world.monsters 裡，打不到、也不會死；它是 Boss 物件的一部分，重打一次就重新出現。
(function () {
  'use strict';
  const U = G.util;
  const Kit = G.BossKit;
  const STY = Kit.STY;
  const TAU = Math.PI * 2;

  // ───────── 新的預警樣式 ─────────
  STY.ice = { fill: '140,210,255', edge: '#8fd8ff', core: ['#ffffff', '#cdefff', '#8fd8ff'] };
  STY.star = { fill: '170,140,255', edge: '#b89aff', core: ['#fff6c0', '#c8b0ff', '#ffffff'] };
  STY.hand = { fill: '255,190,90', edge: '#ffc85a', core: ['#fff3c0', '#ffc85a', '#ffffff'] };
  STY.hour = { fill: '255,120,200', edge: '#ff8ad0', core: ['#ffe0f4', '#c8b0ff', '#ffffff'] };

  // 冰柱從地面刺出來
  Kit.drawBurst.ice = function (ctx, h, q) {
    const y = h.y;
    const up = Math.min(1, q * 6);
    const hh = (h.hgt || 120) * up * (1 - q * 0.15);
    ctx.save();
    ctx.globalAlpha = q > 0.7 ? (1 - q) / 0.3 : 1;
    const n = Math.max(2, Math.round(h.r / 18));
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1);
      const x = h.x - h.r * 0.8 + f * h.r * 1.6;
      const s = 0.65 + 0.35 * Math.sin(i * 2.1 + h.x * 0.01) * Math.sin(i * 2.1 + h.x * 0.01);
      const top = y - hh * (Math.abs(f - 0.5) < 0.2 ? 1 : 0.62 + 0.3 * s);
      const w = h.r * 0.22 + 6;
      G.art.shape(ctx, (c) => {
        c.moveTo(x - w, y + 2);
        c.lineTo(x - w * 0.35, top + 18);
        c.lineTo(x + (i % 2 ? 3 : -3), top);
        c.lineTo(x + w * 0.4, top + 14);
        c.lineTo(x + w, y + 2);
        c.closePath();
      }, '#dff4ff', '#8fc8f0', { cel: [w * 0.35, 0], lw: 2.6 });
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.45, y - 6);
      ctx.lineTo(x - w * 0.15, top + 22);
      ctx.stroke();
    }
    ctx.restore();
  };
  // 星沙落地：一圈星光
  Kit.drawBurst.star = function (ctx, h, q) {
    const y = h.y;
    ctx.save();
    ctx.globalAlpha = 1 - q;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(h.x, y - 30, 4, h.x, y - 30, h.r * 1.4);
    g.addColorStop(0, 'rgba(255,246,200,0.9)');
    g.addColorStop(1, 'rgba(160,120,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(h.x, y - 30, h.r * 1.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  };
  // 時針刺下：一根金色的指針插在地上
  Kit.drawBurst.hand = function (ctx, h, q) {
    const y = h.y;
    ctx.save();
    ctx.globalAlpha = q > 0.6 ? (1 - q) / 0.4 : 1;
    ctx.translate(h.x, y - (h.hgt || 150) * (1 - Math.min(1, q * 8)) * 0.6);
    G.art.shape(ctx, (c) => {
      c.moveTo(0, 6);
      c.lineTo(-16, -30);
      c.lineTo(-6, -30);
      c.lineTo(-7, -190);
      c.lineTo(7, -190);
      c.lineTo(6, -30);
      c.lineTo(16, -30);
      c.closePath();
    }, '#ffd978', '#d8a040', { cel: [4, 0], lw: 3 });
    G.art.ellipse(ctx, 0, -100, 10, 10, '#fff3c0', '#d8a040', { lw: 2.6, hl: false });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 1 - q;
    ctx.strokeStyle = '#fff3c0';
    ctx.lineWidth = 5 * (1 - q) + 1;
    ctx.beginPath();
    ctx.ellipse(h.x, y, h.r * (0.6 + q * 0.8), 10 + q * 10, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  };
  // 十二時的格子敲響：一道粉紫色的光柱
  Kit.drawBurst.hour = function (ctx, h, q) {
    const y = h.y;
    const hh = (h.hgt || 120) * Math.min(1, q * 6);
    ctx.save();
    ctx.globalAlpha = (1 - q) * 0.95;
    const g = ctx.createLinearGradient(0, y - hh, 0, y);
    g.addColorStop(0, 'rgba(255,200,240,0)');
    g.addColorStop(0.4, 'rgba(230,150,255,0.75)');
    g.addColorStop(1, 'rgba(255,240,255,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(h.x - h.r, y - hh, h.r * 2, hh);
    ctx.restore();
  };

  Kit.drawFaller.ice = function (ctx, x, y, h, f) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(200,240,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(0, -110);
    ctx.lineTo(8, -10);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(Math.sin(f * 4 + (h.seed || 0)) * 0.2);
    G.art.shape(ctx, (c) => {
      c.moveTo(0, 22);
      c.lineTo(-12, -2);
      c.lineTo(-6, -24);
      c.lineTo(6, -24);
      c.lineTo(12, -2);
      c.closePath();
    }, '#e8f8ff', '#9cd4f4', { cel: [4, 0], lw: 2.6 });
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -18);
    ctx.lineTo(-6, 4);
    ctx.stroke();
    ctx.restore();
  };
  Kit.drawFaller.star = function (ctx, x, y, h, f) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, -150, 0, 0);
    g.addColorStop(0, 'rgba(160,120,255,0)');
    g.addColorStop(1, 'rgba(255,240,190,0.8)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-9, -4);
    ctx.lineTo(0, -150);
    ctx.lineTo(9, -4);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(f * 5 + (h.seed || 0));
    G.art.shape(ctx, (c) => {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 6 : 15;
        i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
    }, '#fff3a8', '#f0c860', { lw: 2.4 });
    ctx.restore();
  };

  // 鐘聲震波：一圈淡藍色的音環沿著地面推開
  Kit.drawSweep.ring = function (ctx, h) {
    if (h.t < (h.delay || 0)) return;
    const y = h.y;
    const d = U.sign(h.x1 - h.x0);
    const H = h.hgt;
    ctx.save();
    ctx.translate(h.x, y);
    ctx.scale(d, 1);
    for (let i = 2; i >= 0; i--) {
      ctx.globalAlpha = i === 0 ? 0.95 : 0.35 / i;
      ctx.strokeStyle = i === 0 ? '#ffffff' : '#9fdcff';
      ctx.lineWidth = i === 0 ? 7 : 12;
      ctx.beginPath();
      ctx.ellipse(-i * 26, -H * 0.5, 20, H * 0.62, 0, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#6ab8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -H * 0.5, 20, H * 0.62, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,245,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };
  // 時針橫掃：從錶盤中心伸出一根長長的指針，針尖沿地面掃過
  Kit.drawSweep.hand = function (ctx, h) {
    if (h.t < (h.delay || 0)) return;
    const px = h.px != null ? h.px : this.x;
    const py = h.py != null ? h.py : this.y - this.h * 0.62;
    const tx = h.x;
    const ty = h.y - 18;
    const a = Math.atan2(ty - py, tx - px);
    const len = Math.hypot(tx - px, ty - py);
    ctx.save();
    // 掃過的殘影
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath();
    ctx.moveTo(px, py);
    const back = a - U.sign(h.x1 - h.x0) * 0.12;
    ctx.lineTo(px + Math.cos(back) * len, py + Math.sin(back) * len);
    ctx.lineTo(tx, ty);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(px, py);
    ctx.rotate(a);
    G.art.shape(ctx, (c) => {
      c.moveTo(-30, 0);
      c.lineTo(-10, -9);
      c.lineTo(len - 70, -6);
      c.lineTo(len - 70, -18);
      c.lineTo(len + 8, 0);
      c.lineTo(len - 70, 18);
      c.lineTo(len - 70, 6);
      c.lineTo(-10, 9);
      c.closePath();
    }, '#ffd978', '#d49a3a', { cel: [0, 4], lw: 3.5 });
    G.art.ellipse(ctx, len * 0.45, 0, 12, 12, '#fff3c0', '#d49a3a', { lw: 2.6, hl: false });
    ctx.restore();
    // 針尖在地上擦出的光
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(tx, h.y - 20, 2, tx, h.y - 20, 70);
    g.addColorStop(0, 'rgba(255,240,180,0.85)');
    g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(tx, h.y - 20, 70, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  // 全地圖的地面預警條
  function groundBar(ctx, rgb, k, y) {
    ctx.fillStyle = 'rgba(' + rgb + ',' + (0.1 + 0.25 * k).toFixed(3) + ')';
    G.physics.fillGroundBand(ctx, G.world.map, 0, G.world.map.w, -8, 2); // 起伏的地面：沿著地表
  }
  // 往 dir 方向的箭頭（衝鋒預警）
  function arrows(ctx, x, y, dir, n, k, rgb) {
    ctx.fillStyle = 'rgba(' + rgb + ',' + (0.55 + 0.4 * k).toFixed(3) + ')';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= n; i++) {
      const ax = x + dir * i * 110;
      const gy = G.physics.groundY(G.world.map, ax);
      const ay = Math.abs(y - gy) < 40 ? gy : y; // 起伏的地面：箭頭沿著地表
      ctx.beginPath();
      ctx.moveTo(ax + dir * 22, ay - 14);
      ctx.lineTo(ax - dir * 6, ay - 26);
      ctx.lineTo(ax - dir * 6, ay - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  function deadUpdate(b, dt, cols) {
    b.flushKill();
    b.deadT += dt;
    if (Math.random() < 0.5) G.fx.burst(b.x + U.rand(-130, 130), b.y - U.rand(20, b.h), cols, 6, 240);
    if (!b.onGround) b.phys(dt);
    return b.deadT > 2.4;
  }

  // ═════════════════ 召喚野外魔王（霜靈一次、時間不限次數）═════════════════
  // 召喚出來的野外魔王是一般的 G.world.monsters 成員，沿用 js/game/fieldboss.js 的招式、出現動畫（m.fx.spawn）、
  // 控制免疫、身體碰撞與 50% 暴走；但是：
  //   · m.illusion = true：打倒不給經驗、掉落、任務與圖鑑，也不會走 G.fieldBoss.onKilled（不記冷卻旗標、不慢動作、不存檔）；
  //   · 不走 G.fieldBoss.spawn：沒有「出現了！」大字、沒有地圖提示；等級、血量改用該章野外魔王的數值 × SUM_HP；
  //   · 章節 Boss 倒下的第一幀全部崩解消失（在劇情、儀式之前）；
  //   · 位置夾在場地牆內，千手冰像（不會動）放在場地邊緣，不擋路。
  // 預警：Boss 擺出施法姿勢，地面出現召喚陣（zone kind 'bs_sigil'），1.2 秒後魔王從陣中升起。
  const FB_IDS = ['fb_shroom', 'fb_kraken', 'fb_balrog', 'fb_zakum', 'fb_voiddragon'];
  const SUM_RISE = 1.2; // 召喚陣 → 魔王升起
  const SUM_CAST = 1.4; // Boss 施法姿勢的長度
  const SUM_HP = { frostSpirit: 0.4, timeItself: 0.6 }; // 時間的殘影：0.3 → 0.6（使用者：殘影血量要提升） // 該章野外魔王正常最大血量的幾成
  const SUM_FROST_AT = 0.65; // 霜靈：血量 ≤ 65% 時（第一階段中段）召喚一次
  // 時間：從開打就每 5 秒召喚一隻「時間殘影」野外魔王（不限總數，不擺施法姿勢、Boss 照常出招）；
  //   每隻只活 life 秒（或被打倒）就散成星沙，所以同時大約 3～4 隻。五種輪流（不會連續同一種；千手冰像同時只會有一隻，放在場地邊緣）。
  const RITUAL = 1.4; // 召喚時錶盤發亮的秒數
  const SUM_TIME = { first: 5, every: 5, life: 15 }; // 開戰 5 秒後才開始召喚
  const Sum = (Kit.fbSummon = {
    list(b) {
      return G.world.monsters.filter((m) => m.summoner === b && !m.dead);
    },
    // 還活著的＋召喚陣上等著升起的
    count(b) {
      return this.list(b).length + (b.sumPend ? b.sumPend.length : 0);
    },
    // 該章野外魔王（霜靈 → 千手冰像、時間 → 星蝕魔龍）的等級與正常最大血量
    ref(b) {
      const D = G.data;
      const region = G.world.map && G.world.map.region;
      const id = D.fieldBosses && D.fieldBosses[region + '-4'];
      const d = id && D.monsters[id];
      const lv = d ? d.lv : b.level - 1;
      return { lv, hp: D.balance.monsterHp(lv) * (d ? d.hpMul : 60) };
    },
    pickType(b) {
      const alive = this.list(b).map((m) => m.id).concat((b.sumPend || []).map((p) => p.id));
      // 時間：同一種可以同時有好幾隻（活得不久），只有不會動的千手冰像同時一隻
      let pool = FB_IDS.filter((id) => G.data.monsters[id] && (b.id === 'timeItself' ? id !== 'fb_zakum' || alive.indexOf(id) < 0 : alive.indexOf(id) < 0));
      if (pool.length > 1 && b.sumLast) pool = pool.filter((id) => id !== b.sumLast);
      return pool.length ? U.pick(pool) : null;
    },
    pickX(b, id) {
      const map = G.world.map;
      const P = G.player;
      const d = G.data.monsters[id];
      const half = d.w / 2;
      const lo = half + 40;
      const hi = map.w - half - 40;
      const others = this.list(b).map((m) => m.x).concat((b.sumPend || []).map((p) => p.x));
      if (d.speed === 0) {
        // 不會動的千手冰像：放在場地邊緣（優先右邊，左邊有出口傳送門），離玩家遠的那一邊
        const r = hi - 20;
        const l = lo + 60;
        const rOk = Math.abs(P.x - r) > 420 && others.every((x) => Math.abs(x - r) > 260);
        if (b.id === 'timeItself') return Math.abs(P.x - r) >= Math.abs(P.x - l) ? r : l; // 離玩家遠的那一邊
        return rOk ? r : l;
      }
      // 離玩家 420～760（在畫面裡、但不貼臉）、不跟章節 Boss 或其他召喚物疊在一起；找不到就逐步放寬
      const tiers = [[420, 760, 300, 280], [360, 900, 160, 200], [300, 1400, 0, 120]];
      for (const [d0, d1, db, dO] of tiers) {
        const ok = [];
        for (let x = lo; x <= hi; x += 40) {
          const dp = Math.abs(x - P.x);
          if (dp < d0 || dp > d1 || Math.abs(x - b.x) < db || others.some((o) => Math.abs(o - x) < dO)) continue;
          ok.push(x);
        }
        if (ok.length) return U.pick(ok);
      }
      return P.x < map.w / 2 ? hi : lo;
    },
    // 開始施法：Boss 擺姿勢（pose 是美術認得的狀態名），地面出現召喚陣
    cast(b, style, pose, line, lineColor) {
      const id = this.pickType(b);
      if (!id) return false;
      const x = this.pickX(b, id);
      const gy = G.physics.groundY(G.world.map, x);
      const d = G.data.monsters[id];
      b.sumPend = b.sumPend || [];
      b.sumPend.push({ id, x, t: SUM_RISE });
      b.sumLast = id;
      b.sumN = (b.sumN || 0) + 1;
      b.sumCastT = b.fightT;
      b.sumCast = { pose };
      b.vx = 0;
      b.setState(pose, SUM_CAST);
      if (line) b.say(line, lineColor);
      G.world.zones.push({ kind: 'bs_sigil', style, x, y: gy, r: Math.max(110, d.w * 0.55), t: 0, life: SUM_RISE + 0.7, visual: true, sum: true, seed: Math.random() * 6 });
      G.audio.play(style === 'time' ? 'portal' : 'bossWarn');
      G.fx.ring(x, gy - 10, style === 'time' ? 'rgba(200,176,255,0.9)' : 'rgba(170,225,255,0.9)', 160, 0.5, 5);
      return true;
    },
    // 時間殘影：不擺姿勢，直接在地上開召喚陣（SUM_RISE 秒後升起），Boss 照常出招
    echo(b) {
      const id = this.pickType(b);
      if (!id) return false;
      const x = this.pickX(b, id);
      const gy = G.physics.groundY(G.world.map, x);
      const d = G.data.monsters[id];
      b.sumPend = b.sumPend || [];
      b.sumPend.push({ id, x, t: SUM_RISE });
      b.sumLast = id;
      b.sumN = (b.sumN || 0) + 1;
      b.sumCastT = b.fightT;
      G.world.zones.push({ kind: 'bs_sigil', style: 'time', x, y: gy, r: Math.max(110, d.w * 0.55), t: 0, life: SUM_RISE + 0.7, visual: true, sum: true, seed: Math.random() * 6 });
      G.audio.play('portal');
      return true;
    },
    // 一隻召喚物散掉（時間到了）：沒有獎勵，碎成星沙
    dissolve(m) {
      m.sumDespawn = true;
      m.dead = true;
      m.deadT = 0.0001;
      m.vx = 0;
      m.fbAct = null;
      m.sucked = false;
      const cy = m.y - (m.hover || 0) - m.h * m.scale * 0.5;
      G.fx.burst(m.x, cy, ['#e8e0ff', '#fff3a8', '#8fa0ff', '#ffffff'], 22, 280, { grav: -80, life: 0.9, size: 4 });
      G.fx.ring(m.x, cy, 'rgba(232,224,255,0.8)', 140, 0.45, 5);
    },
    // 施法中：回傳 true 表示這一幀由召喚接管（呼叫端跳過一般的狀態機）
    castStep(b) {
      if (!b.sumCast) return false;
      if (b.state !== b.sumCast.pose) {
        b.sumCast = null; // 被第二階段變身之類的打斷
        return false;
      }
      b.vx = 0;
      if (b.stateT <= 0) {
        b.sumCast = null;
        b.setState('recover', 0.5 * b.cd());
      }
      return true;
    },
    rise(b, id, x) {
      const W = G.world;
      const d = G.data.monsters[id];
      const Bl = G.data.balance;
      const ref = this.ref(b);
      const m = new G.Monster(id, 0, x, { noVariant: true });
      m.fieldBoss = true;
      m.illusion = true; // 不給經驗／掉落、不記野外魔王旗標（見上）
      m.summoned = true;
      m.summoner = b;
      m.shiny = false;
      const FB = G.fieldBoss;
      const s = FB && FB.fallbackScale ? FB.fallbackScale(d) : 1;
      if (s !== 1) {
        m.scale = s;
        m.w = d.w / s;
        m.h = d.h / s;
      }
      m.halfW = d.w / 2;
      m.level = ref.lv;
      m.maxHp = m.hp = Math.max(1, Math.round(ref.hp * (SUM_HP[b.id] || 0.33)));
      m.atk = Math.round(Bl.monsterAtk(ref.lv) * (d.atkMul || 1));
      m.armor = Bl.monsterDef(ref.lv);
      m.exp = 0;
      m.touchCd = 99;
      m.fbTouch = 1.5;
      m.aggroT = 30;
      m.fbCd = 2;
      m.hpShowT = 1;
      m.dir = U.sign(G.player.x - x) || 1;
      m.fx.spawn = 1; // 出現動畫 1 → 0（1.2 秒），這段時間不出招
      const time = b.id === 'timeItself';
      if (time) {
        // 時間殘影：藍金色調、半透明一點；最後 3 秒閃爍（Sum.tick），時間到就散掉
        m.sumLife = SUM_TIME.life;
        m.sumLife0 = SUM_TIME.life;
        m.V = { name: '殘影', color: '#e8dcff', tint: '#8f9cff', tintAmt: 0.3, alpha: 0.9 };
      }
      W.monsters.push(m);
      const my = m.y - m.h * m.scale * 0.5;
      G.fx.shake(time ? 3 : 7, time ? 0.2 : 0.4);
      G.audio.play('roar');
      G.fx.ring(x, my, time ? 'rgba(200,176,255,0.9)' : 'rgba(170,225,255,0.9)', 200, 0.5, 7);
      G.fx.burst(x, m.y - 10, time ? ['#c8b0ff', '#fff3a8', '#1a0a2a', '#ffffff'] : ['#ffffff', '#bfe8ff', '#6a2a9a'], 30, 380, { angle: -Math.PI / 2, spread: 1.2, life: 0.8 });
      G.fx.text(x, m.y - m.h * m.scale - 40, '召喚：' + d.name, time ? '#e8dcff' : '#dff4ff', 22, 1.6);
      if ((b.sumN || 0) <= 1) G.hud.toast(time ? '時間不停地召來野外魔王的殘影！每隻只留 ' + SUM_TIME.life + ' 秒，打倒沒有獎勵' : b.def.name + '召來了野外魔王「' + d.name + '」！打倒沒有獎勵；' + b.def.name + '倒下時會一起消失', time ? '#e8dcff' : '#bfe8ff');
      return m;
    },
    // 每幀（由 Boss 的 update 呼叫，Boss 死後也呼叫）
    tick(b, dt) {
      const map = G.world.map;
      if (b.sumPend && b.sumPend.length) {
        for (let i = b.sumPend.length - 1; i >= 0; i--) {
          const p = b.sumPend[i];
          p.t -= dt;
          if (p.t > 0) continue;
          b.sumPend.splice(i, 1);
          if (!b.dead) this.rise(b, p.id, p.x);
        }
      }
      let n = 0;
      for (const m of G.world.monsters) {
        if (m.summoner !== b) continue;
        if (m.dead) {
          // 被打倒（或崩解）的那一幀：記下時間（時間的召喚冷卻從這裡重新算）
          if (!m.sumGone) {
            m.sumGone = true;
            b.sumDeadT = b.fightT;
          }
          continue;
        }
        if (m.sumLife != null) {
          m.sumLife -= dt;
          if (m.V) m.V.alpha = m.sumLife < 3 ? 0.55 + 0.35 * Math.abs(Math.sin(m.sumLife * (5 + (3 - m.sumLife) * 3))) : 0.9;
          if (m.sumLife <= 0) {
            this.dissolve(m);
            if (!m.sumGone) {
              m.sumGone = true;
              b.sumDeadT = b.fightT;
            }
            continue;
          }
        }
        n++;
        m.hpShowT = Math.max(m.hpShowT, 0.5); // 一直顯示自己的小血條（章節 Boss 的大血條不變）
        const lo = m.halfW + 20;
        const hi = map.w - m.halfW - 20;
        if (m.x < lo || m.x > hi) {
          m.x = U.clamp(m.x, lo, hi);
          if (m.vx * (m.x - map.w / 2) > 0) m.vx = 0;
        }
      }
      // 最後一隻召喚物倒下：把野外魔王的殘留招式（投射物、地面區域、震波、延遲的攻擊）一起清掉
      if (b.sumHad && !n && !(b.sumPend && b.sumPend.length)) this.clearLeftovers();
      b.sumHad = n > 0;
    },
    clearLeftovers() {
      const W = G.world;
      for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i].fb) W.projectiles.splice(i, 1);
      for (let i = W.zones.length - 1; i >= 0; i--) if (W.zones[i].fb) W.zones.splice(i, 1);
      // fieldboss.js 內部的延遲計時與震波（這張地圖不是野外魔王地圖，只有召喚物會用到）
      if (G.fieldBoss && G.fieldBoss.reset) G.fieldBoss.reset();
    },
    // Boss 倒下：召喚陣取消、召喚物崩解（0.5 秒淡出，不給任何東西）
    despawnAll(b) {
      if (b.sumPend) b.sumPend.length = 0;
      b.sumCast = null;
      const W = G.world;
      for (let i = W.zones.length - 1; i >= 0; i--) if (W.zones[i].sum) W.zones.splice(i, 1);
      let any = false;
      for (const m of W.monsters) {
        if (m.summoner !== b || m.dead) continue;
        any = true;
        m.sumDespawn = true;
        m.dead = true;
        m.deadT = 0.0001;
        m.vx = 0;
        m.fbAct = null;
        m.sucked = false;
        const cy = m.y - (m.hover || 0) - m.h * m.scale * 0.5;
        G.fx.burst(m.x, cy, ['#e8e0ff', '#9a8e84', '#6e645c', '#ffffff'], 26, 300, { grav: 500, life: 0.9, shape: 'square', size: 5 });
        G.fx.ring(m.x, cy, 'rgba(232,224,255,0.8)', 140, 0.45, 5);
      }
      if (any) this.clearLeftovers();
    },
  });

  // 召喚陣的美術：霜靈是冰晶六芒陣、時間是倒轉的錶盤＋時空裂縫
  G.art.ZONE_DRAW = G.art.ZONE_DRAW || {};
  G.art.ZONE_DRAW.bs_sigil = function (ctx, z, t) {
    const k = U.clamp(z.t / SUM_RISE, 0, 1); // 0 → 1：蓄力
    const out = z.t > SUM_RISE ? U.clamp((z.t - SUM_RISE) / (z.life - SUM_RISE), 0, 1) : 0; // 升起後淡出
    const a = Math.min(1, z.t * 5) * (1 - out);
    if (a <= 0) return;
    const time = z.style === 'time';
    const r = z.r * (0.55 + 0.45 * Math.min(1, z.t * 3));
    const main = time ? '200,176,255' : '170,225,255';
    const hot = time ? '255,243,168' : '255,255,255';
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha = a;
    // 光柱（快升起時變亮）
    const beamH = 60 + 260 * k;
    const g = ctx.createLinearGradient(0, 0, 0, -beamH);
    g.addColorStop(0, 'rgba(' + main + ',' + (0.1 + 0.35 * k).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + main + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(-r * 0.8, -beamH, r * 1.6, beamH);
    ctx.save();
    ctx.scale(1, 0.26);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(' + main + ',' + (0.55 + 0.4 * k).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, TAU);
    ctx.stroke();
    if (time) {
      // 錶盤刻度＋逆時針飛轉的指針
      for (let i = 0; i < 12; i++) {
        const an = (i / 12) * TAU;
        const l = i % 3 === 0 ? 0.16 : 0.08;
        ctx.beginPath();
        ctx.moveTo(Math.cos(an) * r * 0.82, Math.sin(an) * r * 0.82);
        ctx.lineTo(Math.cos(an) * r * (0.82 - l), Math.sin(an) * r * (0.82 - l));
        ctx.stroke();
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(' + hot + ',' + (0.6 + 0.4 * k).toFixed(3) + ')';
      ctx.lineWidth = 6;
      const h1 = -t * (3 + k * 10) + z.seed;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(h1) * r * 0.62, Math.sin(h1) * r * 0.62);
      ctx.stroke();
      ctx.lineWidth = 4;
      const h2 = -t * (0.6 + k * 2) + z.seed * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(h2) * r * 0.42, Math.sin(h2) * r * 0.42);
      ctx.stroke();
    } else {
      // 冰晶六芒陣（慢慢轉）
      ctx.rotate(t * 0.7 + z.seed);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a1 = (i / 6) * TAU;
        const a2 = a1 + (TAU / 6) * 2;
        ctx.moveTo(Math.cos(a1) * r * 0.8, Math.sin(a1) * r * 0.8);
        ctx.lineTo(Math.cos(a2) * r * 0.8, Math.sin(a2) * r * 0.8);
      }
      ctx.stroke();
    }
    ctx.restore();
    // 時間：陣中央的直立時空裂縫；霜靈：陣上飄起的冰晶
    if (time) {
      const hh = 40 + 200 * k;
      const w = 6 + 16 * k;
      ctx.fillStyle = 'rgba(26,10,42,' + (0.5 + 0.4 * k).toFixed(3) + ')';
      ctx.strokeStyle = 'rgba(' + hot + ',0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(w, -hh * 0.5, 0, -hh);
      ctx.quadraticCurveTo(-w, -hh * 0.5, 0, -4);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(' + hot + ',0.85)';
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.9 + i / 7 + z.seed) % 1;
        const x = Math.sin(i * 2.3 + z.seed) * r * 0.7;
        const y = -ph * (80 + 180 * k);
        const s = 3 + 3 * (1 - ph);
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
    // 快升起時的「！」
    if (k > 0.45 && k < 1) {
      ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 20));
      ctx.font = 'bold 34px ' + (G.art.NUMFONT || 'sans-serif');
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = time ? '#2a0a3a' : '#0a2a4a';
      ctx.strokeText('!', 0, -beamH - 6);
      ctx.fillStyle = time ? '#fff3a8' : '#ffffff';
      ctx.fillText('!', 0, -beamH - 6);
    }
    ctx.restore();
  };

  // ═════════════════ 霜靈 ═════════════════
  const FCOL = ['#dff4ff', '#8fd8ff', '#ffffff', '#b8c8ff'];

  function FrostSpirit(x) {
    Kit.init(this, 'frostSpirit', x);
    this.ringsLeft = 0;
    this.chargeLeft = 0;
    this.bliz = 0; // 暴風雪濃度 0～1
    this.wind = 0;
    this.bellSwing = 0;
    this.snow = [];
    for (let i = 0; i < 70; i++) this.snow.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), p: Math.random() * TAU });
  }
  Object.assign(FrostSpirit.prototype, Kit.proto);

  // 暴風雪的強風（第二階段大招的開場）：鐘響 1.5 秒後，一陣強風沿著地面從霜靈往玩家那一側吹到牆邊。
  //   風道 = 地面往上 GUST_H0（靠近霜靈）～GUST_H1（牆邊）的一條帶子：站上平台、抓準時機跳起來、或繞到霜靈身後就不會被吹到。
  //   被吹到：傷害 = 暴風雪原本的一擊（冰晶雨 0.8 倍），整個人凍在冰塊裡，往外飛 ICE_DIST（小拋物線＋貼地滑行、彈一下），
  //   落地冰塊就碎；最多凍 ICE_T 秒，猛按方向鍵可以更快掙脫。碎掉後 ICE_GRACE 秒無敵（不會被接著追打）；
  //   凍住、無敵期間不會再被凍、被吹（暴風雪的持續風也不推）。
  //   飛行路線夾在場地牆內（左右各留 40），也不會飛進召喚出來的野外魔王身邊（千手冰像 426 寬、不會動：停在它身體外 ICE_FB_GAP）。
  const GUST_H0 = 105;
  const GUST_H1 = 124;
  const GUST_SPEED = 1900;
  const ICE_DIST = 480;
  const ICE_T = 0.9;
  const ICE_ARC = 0.55; // 前 55% 的時間在空中（小拋物線），後面貼地滑行
  const ICE_GRACE = 0.6;
  const ICE_FB_GAP = 90;

  FrostSpirit.prototype.aimGust = function () {
    const P = G.player;
    const map = G.world.map;
    const dir = U.sign(P.x - this.x) || this.dir || 1;
    this.dir = dir;
    const x0 = this.x + dir * this.w * 0.25;
    this.gustLane = { x0, dir, len: Math.max(200, dir > 0 ? map.w - x0 : x0), h0: GUST_H0, h1: GUST_H1 };
  };
  // 強風往外推進：波前掃過玩家的那一刻判定一次
  FrostSpirit.prototype.gustStep = function (dt) {
    const g = this.gust;
    const L = this.gustLane;
    g.t += dt;
    const front = g.t * GUST_SPEED;
    const P = G.player;
    if (!g.done) {
      const d = (P.x - L.x0) * L.dir;
      if (d <= front) {
        g.done = true;
        const map = G.world.map;
        const top = G.physics.groundY(map, P.x) - (L.h0 + (L.h1 - L.h0) * U.clamp(d / L.len, 0, 1));
        const safe = this.fly || G.time < (this.iceGuard || 0) || P.invT > 0;
        if (P.alive() && !safe && d >= -this.w * 0.3 && d <= L.len + 20 && P.y > top + 8) {
          // 無敵模式（試玩場）不扣血，但照樣凍住吹走，才看得到這一招
          if (this.hit(0.8, L.x0 - L.dir * 60, 'blizzardGust', { noKnock: true }) || G.opts.godMode) this.freezeFly(L.dir);
        }
      }
    }
    if (front > L.len + 300) this.gust = null;
  };
  FrostSpirit.prototype.freezeFly = function (dir) {
    const P = G.player;
    const map = G.world.map;
    const x0 = P.x;
    let lo = 40;
    let hi = map.w - 40;
    for (const m of G.world.monsters) {
      if (m.dead || !m.fieldBoss) continue;
      const hw = (m.halfW || (m.w * (m.scale || 1)) / 2) + ICE_FB_GAP;
      // 還沒越過它的中心：最多停在它身體外（已經貼著它就原地凍住）；已經在它另一側就照常吹走
      if (dir > 0 && x0 < m.x) hi = Math.min(hi, Math.max(x0, m.x - hw));
      if (dir < 0 && x0 > m.x) lo = Math.max(lo, Math.min(x0, m.x + hw));
    }
    const want = x0 + dir * ICE_DIST;
    const x1 = dir > 0 ? Math.max(x0, Math.min(want, hi)) : Math.min(x0, Math.max(want, lo));
    const gy0 = G.physics.groundY(map, x0);
    this.fly = { x0, x1, lift: Math.max(0, gy0 - P.y), dir, t: 0, crack: 0, landed: false, hard: Math.abs(want - x1) > 30 };
    P.action = null;
    P.climbing = -1;
    P.vx = 0;
    P.vy = 0;
    P.onGround = false;
    P.hurtT = ICE_T + 0.05;
    P.invT = Math.max(P.invT, ICE_T + ICE_GRACE);
    if (G.art.frostGust) G.art.frostGust.freeze(P, ICE_T);
    G.fx.shake(5, 0.25);
    G.audio.play('rockHit');
    if (!this.iceTold) {
      this.iceTold = true;
      G.hud.toast('被凍住吹飛了！猛按方向鍵可以更快掙脫', '#dff4ff');
    }
  };
  // 冰塊飛行：每幀在玩家更新之後把位置擺好（路線事先算好，不會穿牆、不會掉出場地）
  FrostSpirit.prototype.iceStep = function (dt) {
    const f = this.fly;
    if (!f) return;
    const P = G.player;
    const map = G.world.map;
    if (P.dead || !map) {
      this.fly = null;
      if (G.art.frostGust) G.art.frostGust.shatter(P.x, P.y);
      return;
    }
    let adv = dt;
    const I = G.input;
    ['left', 'right', 'up', 'down', 'jump'].forEach((k) => {
      if (I.wasPressed(k)) {
        adv += 0.07;
        f.crack++;
      }
    });
    if (G.art.frostGust) G.art.frostGust.crack(f.crack / 8);
    f.t = Math.min(ICE_T, f.t + adv);
    const k = f.t / ICE_T;
    const D = f.x1 - f.x0;
    let x;
    let y;
    let hop = 1;
    if (k < ICE_ARC) {
      const u = k / ICE_ARC;
      x = f.x0 + D * 0.74 * u;
      y = G.physics.groundY(map, x) - f.lift * (1 - u) - 64 * 4 * u * (1 - u);
    } else {
      const u = (k - ICE_ARC) / (1 - ICE_ARC);
      x = f.x0 + D * (0.74 + 0.26 * (1 - (1 - u) * (1 - u)));
      hop = u < 0.5 ? 16 * Math.sin((u / 0.5) * Math.PI) : 0;
      y = G.physics.groundY(map, x) - hop;
      if (!f.landed) {
        f.landed = true;
        G.fx.shake(f.hard ? 5 : 3, 0.18);
        G.audio.play('land');
        if (G.art.frostGust) G.art.frostGust.land(x, G.physics.groundY(map, x), f.hard);
      }
    }
    P.x = U.clamp(x, 40, map.w - 40);
    P.y = y;
    P.vx = 0;
    P.vy = 0;
    P.climbing = -1;
    P.action = null;
    P.onGround = hop === 0; // 空中、彈起來的時候不算站在地上（地形貼地只在真的落地時做）
    if (P.onGround) P.plat = 0;
    if (f.t >= ICE_T) {
      // 冰塊碎掉：可以動了，再給一小段無敵
      this.fly = null;
      P.hurtT = 0;
      P.invT = Math.max(P.invT, ICE_GRACE);
      this.iceGuard = G.time + ICE_GRACE;
      if (G.art.frostGust) G.art.frostGust.shatter(P.x, P.y);
      G.audio.play('rockHit');
    } else {
      P.hurtT = Math.max(P.hurtT, ICE_T - f.t + 0.05);
      P.invT = Math.max(P.invT, ICE_T - f.t + ICE_GRACE);
    }
  };

  // 低頭衝鋒時身體壓低一點
  FrostSpirit.prototype.hitbox = function () {
    const h = this.state === 'charge' ? this.h * 0.7 : this.h;
    return { x: this.x - this.w / 2, y: this.y - h, w: this.w, h };
  };

  FrostSpirit.prototype.update = function (dt) {
    const P = G.player;
    const map = G.world.map;
    const frozen = this.tick(dt);
    Sum.tick(this, dt);
    this.iceStep(dt);
    this.bellSwing *= Math.pow(0.25, dt);
    // 暴風雪濃度
    const wantBliz = this.state === 'blizzard' ? 1 : this.state === 'blizzardPrep' ? this.prog() * 0.5 : 0;
    this.bliz += (wantBliz - this.bliz) * Math.min(1, dt * 2.2);
    if (this.dead) {
      if (!this.sumCleared) {
        this.sumCleared = true;
        Sum.despawnAll(this);
      }
      this.bliz = Math.max(0, this.bliz - dt);
      return deadUpdate(this, dt, ['#ffffff', '#dff4ff', '#8fd8ff']);
    }
    if (frozen) {
      this.vx = 0;
      this.phys(dt);
      return false;
    }
    if (this.wantPhase2 && this.onGround && this.state !== 'transform' && this.state !== 'charge') {
      Kit.startTransform(this, 2.0, '霜靈：「噹——……噹……」巨鐘裂開了，寒氣從裂縫裡湧出來！');
    }
    const spd = this.spd();
    const dx = P.x - this.x;
    this.stateT -= dt;
    // 召喚野外魔王的施法姿勢（仰頭、鹿角發光、搖鐘）
    if (Sum.castStep(this)) {
      this.bellSwing = Math.max(this.bellSwing, 0.7);
      if (Math.random() < 0.4) G.fx.burst(this.x + U.rand(-50, 50), this.y - this.h, ['#ffffff', '#bfe8ff'], 1, 120, { angle: -Math.PI / 2, spread: 0.7, life: 0.6 });
      this.phys(dt);
      this.touch(0.45);
      return false;
    }

    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.say('噹——', '#dff4ff');
          this.bellSwing = 1;
          this.setState('move', 0.8);
        }
        break;

      case 'transform':
        if (Math.random() < 0.3) G.fx.burst(this.x + U.rand(-40, 40), this.y - this.h * 0.95, ['#ffffff', '#b8e8ff'], 2, 200, { grav: 60, life: 0.7 });
        if (Kit.updateTransform(this, dt, FCOL)) {
          this.say('噹——！！', '#bfe8ff');
          this.bellSwing = 1.4;
          this.setState('move', 0.3);
          this.forceNext = 'blizzard';
        }
        break;

      // 優雅地踱步，保持在玩家附近
      case 'move': {
        if (this.onGround && this.plat !== 0) {
          this.leap(P.x - U.sign(dx) * 220, 0, 0.7);
          this.setState('fall', 2);
          break;
        }
        this.dir = U.sign(dx) || this.dir;
        const want = Math.abs(dx) > 300 ? U.sign(dx) : Math.abs(dx) < 170 ? -U.sign(dx) * 0.6 : 0;
        this.vx += (want * this.def.speed * spd - this.vx) * Math.min(1, dt * 5);
        if (this.stateT <= 0 && this.onGround) this.chooseAttack();
        break;
      }
      case 'fall':
        if (this.onGround) this.setState('recover', 0.3);
        break;

      // ── 鐘鳴震波 ──
      case 'tollPrep':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        if (Math.random() < 0.4) G.fx.burst(this.x + this.dir * 20, this.y - this.h * 0.98, ['#ffffff', '#dff4ff'], 1, 90, { life: 0.5 });
        if (this.stateT <= 0) {
          this.toll();
          this.setState('toll', 0.55);
        }
        break;
      case 'toll':
        this.vx = 0;
        if (this.stateT <= 0) {
          if (this.ringsLeft > 0) {
            this.ringsLeft--;
            this.setState('tollPrep', 0.5);
          } else this.setState('recover', 0.6 * this.cd());
        }
        break;

      // ── 冰柱列 ──
      case 'spikePrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.spikes();
          this.setState('spikes', this.phase === 2 ? 2.4 : 1.7);
        }
        break;
      case 'spikes':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('recover', 0.5 * this.cd());
        break;

      // ── 冰晶雨 ──
      case 'rainPrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.setState('rain', this.phase === 2 ? 2.4 : 2.0);
          this.rainT = 0;
          this.rainN = 0;
          this.bellSwing = 0.8;
        }
        break;
      case 'rain':
        this.vx = 0;
        this.rainT -= dt;
        if (this.rainT <= 0) {
          this.rainT = this.phase === 2 ? 0.26 : 0.34;
          this.iceDrop(this.rainN++ % 2 === 0);
        }
        if (this.stateT <= 0) this.setState('recover', 0.5 * this.cd());
        break;

      // ── 低頭衝鋒 ──
      case 'chargePrep':
        this.vx = -this.dir * 30;
        if (this.stateT <= 0) {
          this.chargeFrom = this.x;
          this.setState('charge', 1.8);
          G.audio.play('roar');
        }
        this.threats.push(this.chargeThreat());
        break;
      case 'charge': {
        const sp = (this.phase === 2 ? 760 : 660) * (this.slowT > 0 ? 0.7 : 1);
        this.vx = this.dir * sp;
        this.threats.push(this.chargeThreat());
        if (Math.random() < 0.8) G.fx.burst(this.x - this.dir * 100, this.y - 8, ['#ffffff', '#dff4ff'], 2, 140, { angle: -Math.PI / 2, spread: 1, life: 0.5 });
        const gone = Math.abs(this.x - this.chargeFrom) > 760;
        const wall = this.x < this.halfW + 30 || this.x > map.w - this.halfW - 30;
        if (gone || wall || this.stateT <= 0) {
          this.vx = 0;
          if (wall) {
            G.fx.shake(10, 0.3);
            G.audio.play('rockHit');
          }
          if (this.chargeLeft > 0) {
            this.chargeLeft--;
            this.dir *= -1;
            this.setState('chargePrep', 0.55);
          } else this.setState('recover', 0.7 * this.cd());
        }
        break;
      }

      // ── 躍起踩踏 ──
      case 'stompPrep':
        this.vx = 0;
        this.dir = U.sign(dx) || this.dir;
        if (this.stateT <= 0) {
          this.slamX = this.leap(P.x + P.vx * 0.2, 0, 0.8, 1.1);
          this.setState('stompAir', 3);
        }
        break;
      case 'stompAir':
        if (this.air) this.threats.push({ x1: this.slamX - this.w * 0.5, x2: this.slamX + this.w * 0.5, y: this.groundY(), t: Math.max(0, this.air.T - this.air.t), kind: 'area' });
        if (this.onGround) {
          this.vx = 0;
          this.squash = 1;
          const box = { x: this.x - this.w * 0.55, y: this.y - this.h * 0.5, w: this.w * 1.1, h: this.h * 0.5 + 6 };
          if (P.alive() && U.overlap(box, P.hitbox())) this.hit(1.25, this.x, 'stomp');
          G.fx.shake(12, 0.35);
          G.fx.burst(this.x, this.y - 6, ['#ffffff', '#dff4ff', '#8fd8ff'], 26, 360, { angle: -Math.PI / 2, spread: 1.4 });
          G.audio.play('slam');
          // 落地時四周冒出一圈小冰柱
          [-1, 1].forEach((d) => this.addHz({ type: 'mark', style: 'ice', x: U.clamp(this.x + d * (this.w * 0.5 + 90), 60, map.w - 60), y: this.groundY(), r: 55, delay: 0.75, mult: 0.9, src: 'stompSpike', hgt: 100, sound: 'rockHit', small: true }));
          this.setState('recover', 0.7 * this.cd());
        }
        break;

      // ── 召喚雪原的小怪 ──
      case 'summon':
        this.vx = 0;
        if (this.stateT <= 0) {
          const ids = ['echoferret', 'avalanchehare'].filter((id) => G.data.monsters[id]);
          if (ids.length) for (let i = 0; i < 2; i++) G.world.spawnAdd(ids[i % ids.length], this.x + (i ? 1 : -1) * 170);
          this.bellSwing = 0.6;
          G.audio.play('quest');
          this.setState('recover', 0.4);
        }
        break;

      // ── 大招：暴風雪（第二階段）──
      case 'blizzardPrep': {
        this.vx = 0;
        if (!this.gustLane) this.aimGust();
        const L = this.gustLane;
        if (Math.random() < 0.6) G.fx.burst(this.x + U.rand(-60, 60), this.y - this.h, ['#ffffff', '#dff4ff'], 2, 220, { angle: -Math.PI / 2, spread: 0.6 });
        // 鹿角上的鐘一直搖響
        this.bellT = (this.bellT || 0) - dt;
        if (this.bellT <= 0) {
          this.bellT = 0.38;
          this.bellSwing = Math.max(this.bellSwing, 1.1);
        }
        this.threats.push({ x1: Math.min(L.x0, L.x0 + L.dir * L.len), x2: Math.max(L.x0, L.x0 + L.dir * L.len), y: this.groundY(), t: this.stateT, kind: 'area' });
        if (this.stateT <= 0) {
          this.wind = L.dir * 120;
          this.gust = { t: 0, done: false };
          this.setState('blizzard', 5.2);
          this.rainT = 0.4;
          this.rainN = 0;
          this.bellSwing = 1.5;
          G.fx.shake(5, 0.3);
          G.audio.play('sweep');
          if (G.art.frostGust) G.art.frostGust.blast(L.x0, this.groundY(L.x0), L.dir, L.len, L.h0);
        }
        break;
      }
      case 'blizzard':
        this.vx = 0;
        if (this.gust) this.gustStep(dt);
        // 被凍住飛出去、剛碎冰的無敵期間，持續的風不推
        if (P.alive() && P.climbing < 0 && !this.fly && G.time >= (this.iceGuard || 0)) P.x = U.clamp(P.x + this.wind * dt, 24, map.w - 24);
        this.rainT -= dt;
        if (this.rainT <= 0 && this.stateT > 1.0) {
          this.rainT = 0.36;
          this.iceDrop(this.rainN++ % 3 === 0, 1.15);
        }
        if (this.stateT <= 0) {
          this.wind = 0;
          this.gust = null;
          this.gustLane = null;
          this.setState('recover', 0.6);
        }
        break;

      case 'recover':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('move', U.rand(0.5, 1.0) * this.cd());
        break;
    }
    this.phys(dt);
    const noTouch = this.state === 'transform' || this.state === 'intro';
    if (!noTouch) this.touch(this.state === 'charge' ? 1.0 : 0.45);
    return false;
  };

  FrostSpirit.prototype.chooseAttack = function () {
    const adds = this.addsAlive();
    let pick = this.forceNext;
    this.forceNext = null;
    if (!pick) {
      const table = this.phase === 1
        ? { toll: 18, spikes: 18, rain: 14, charge: 12, stomp: 10, blizzard: 55, summon: adds < 2 ? 8 : 0 }
        : { toll: 14, spikes: 14, rain: 10, charge: 12, stomp: 10, blizzard: 65, summon: adds < 2 ? 7 : 0 };
      // 暴風雪（冰封吹飛）是霜靈的招牌：第一階段就會用，而且很常用（兩次之間至少隔 6 秒，第二階段 4 秒）
      pick = this.pick(table, { blizzard: this.phase === 1 ? 6 : 4, summon: 18, rain: 6, charge: 6 });
    } else this.pickT[pick] = this.fightT;
    // 召喚野外魔王：整場只有一次，血量第一次掉到 65% 以下時（被強制的招式優先）
    if (!this.sumUsed && this.hp <= this.maxHp * SUM_FROST_AT && pick !== 'blizzard') {
      this.sumUsed = true;
      if (Sum.cast(this, 'frost', 'rainPrep', '山，替我守著。', '#dff4ff')) {
        this.bellSwing = 1.4;
        return;
      }
    }
    const f = this.fury ? 0.85 : 1;
    if (pick === 'toll') {
      this.ringsLeft = this.phase === 2 ? 1 : 0;
      this.setState('tollPrep', 0.95 * f);
      this.warn();
    } else if (pick === 'spikes') {
      this.setState('spikePrep', 0.6 * f);
      this.warn();
    } else if (pick === 'rain') {
      this.setState('rainPrep', 0.7 * f);
    } else if (pick === 'charge') {
      this.dir = U.sign(G.player.x - this.x) || this.dir;
      this.chargeLeft = this.phase === 2 ? 1 : 0;
      this.setState('chargePrep', 1.0 * f);
      this.warn();
    } else if (pick === 'stomp') {
      this.setState('stompPrep', 0.6 * f);
      this.warn();
    } else if (pick === 'blizzard') {
      this.say('噹——噹——噹——', '#dff4ff');
      G.hud.toast('暴風雪！鐘響完會颳起強風——被吹到會結冰飛走：站上平台、跳起來或繞到牠身後！', '#dff4ff');
      this.setState('blizzardPrep', 1.5);
      this.aimGust();
      this.warn(true);
    } else {
      this.setState('summon', 0.7);
    }
  };

  FrostSpirit.prototype.toll = function () {
    const map = G.world.map;
    const gy = this.groundY();
    this.lastAtk = 'toll';
    this.bellSwing = 1.3;
    [-1, 1].forEach((d) => {
      const x0 = this.x + d * this.w * 0.35;
      this.addHz({ type: 'sweep', style: 'ring', x0, x1: d < 0 ? -20 : map.w + 20, x: x0, y: gy, speed: this.phase === 2 ? 520 : 440, hgt: 64, hw: 22, mult: 1.0, delay: 0, src: 'toll' });
    });
    G.fx.ring(this.x, this.y - this.h * 0.9, '#dff4ff', 260, 0.6, 8);
    G.fx.ring(this.x, this.y - this.h * 0.9, '#8fd8ff', 180, 0.45, 5);
    G.fx.shake(8, 0.3);
    G.audio.play('thunder');
  };

  // 一排冰柱：寬 100、間隔 90 的空隙可以站；從霜靈腳下往外一根一根刺出來；平台上安全
  FrostSpirit.prototype.spikes = function () {
    const map = G.world.map;
    const gy = this.groundY();
    const W = 100;
    const gap = 95;
    const step = W + gap;
    const P = G.player;
    // 讓玩家腳下剛好是冰柱（逼他移動），空隙就在旁邊
    const off = ((P.x % step) + step) % step;
    const waves = this.phase === 2 ? 2 : 1;
    for (let w = 0; w < waves; w++) {
      const shift = w === 0 ? 0 : step / 2;
      for (let x = off - step * 20 + shift; x < map.w + step; x += step) {
        if (x < 20 || x > map.w - 20) continue;
        const dist = Math.abs(x - this.x);
        this.addHz({ type: 'mark', style: 'ice', x, y: gy, r: W / 2, delay: 1.15 + dist / 1800 + w * 1.0, mult: 1.05, src: 'spike', hgt: 110, sound: 'rockHit', small: true, quiet: dist > 500 });
      }
    }
    this.squash = 1;
    G.fx.shake(6, 0.25);
    G.audio.play('slam');
    if (waves === 2) G.hud.toast('冰柱會刺兩波！第二波在剛剛的空隙——看準了再移動（平台上安全）', '#bfe8ff');
  };

  FrostSpirit.prototype.iceDrop = function (aim, delay) {
    const P = G.player;
    const map = G.world.map;
    const x = aim ? P.x + P.vx * 0.4 + U.rand(-30, 30) : U.rand(60, map.w - 60);
    const pp = this.playerPlat();
    const ty = aim && pp > 0 ? map.platforms[pp][2] : this.groundY();
    this.addHz({ type: 'rock', style: 'ice', x: U.clamp(x, 50, map.w - 50), y: ty, r: 46, delay: delay || 1.0, mult: 0.8, src: 'iceRain', seed: Math.random() * 6, drift: U.rand(-80, 80) });
    G.fx.burst(this.x, this.y - this.h, ['#ffffff', '#dff4ff'], 2, 260, { angle: -Math.PI / 2, spread: 0.5 });
  };

  FrostSpirit.prototype.chargeThreat = function () {
    const map = G.world.map;
    const end = U.clamp(this.x + this.dir * 780, this.halfW, map.w - this.halfW);
    return { x1: Math.min(this.x, end) - this.w * 0.5, x2: Math.max(this.x, end) + this.w * 0.5, y: this.y, t: this.state === 'chargePrep' ? this.stateT : 0, kind: 'area' };
  };

  FrostSpirit.prototype.drawWeather = function (ctx) {
    const cam = G.cam;
    const W = G.W;
    const H = G.H;
    const light = this.phase === 2 && !this.dead ? 0.55 : this.state === 'transform' ? this.prog() * 0.55 : 0;
    const k = Math.max(this.bliz, 0);
    if (light <= 0 && k <= 0.01) return;
    const t = this.t;
    ctx.save();
    // 能見度：身邊一圈清楚，外面白茫茫
    if (k > 0.01) {
      const P = G.player;
      const cx = P.x;
      const cy = P.y - 40;
      const g = ctx.createRadialGradient(cx, cy, 150, cx, cy, 560);
      g.addColorStop(0, 'rgba(235,246,255,0)');
      g.addColorStop(0.45, 'rgba(235,246,255,' + (0.45 * k).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(240,248,255,' + (0.88 * k).toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(cam.x - 60, cam.y - 60, W + 120, H + 120);
    }
    // 雪：暴風雪時斜著狂吹
    const wind = this.wind || (this.phase === 2 ? 40 : 0);
    const n = Math.round(this.snow.length * Math.max(light * 0.6, k));
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < n; i++) {
      const s = this.snow[i];
      const sp = 60 + 120 * s.s + k * 200;
      const x = cam.x + ((((s.x * (W + 200) + t * wind * (1 + k * 2) * s.s + Math.sin(t + s.p) * 20) % (W + 200)) + W + 200) % (W + 200)) - 100;
      const y = cam.y + ((s.y * (H + 100) + t * sp) % (H + 100)) - 50;
      ctx.globalAlpha = 0.5 + 0.4 * s.s;
      ctx.beginPath();
      if (k > 0.3) {
        ctx.ellipse(x, y, 2 + s.s * 6 * k, 1.6 + s.s, Math.atan2(sp, wind * 2), 0, TAU);
      } else ctx.arc(x, y, 1.5 + s.s * 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  FrostSpirit.prototype.draw = function (ctx) {
    const y = this.y;
    if (!this.dead) {
      if (this.state === 'tollPrep') {
        const k = this.prog();
        groundBar(ctx, '150,215,255', k, this.groundY());
        // 鐘在蓄力：一圈圈往內收的音環
        ctx.save();
        ctx.strokeStyle = 'rgba(220,245,255,' + (0.3 + 0.5 * k).toFixed(3) + ')';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const r = 40 + ((1 - k + i / 3) % 1) * 160;
          ctx.beginPath();
          ctx.arc(this.x + this.dir * 20, y - this.h * 0.95, r, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (this.state === 'chargePrep' || this.state === 'charge') {
        const th = this.chargeThreat();
        const k = this.state === 'charge' ? 0.5 : this.prog();
        ctx.fillStyle = 'rgba(140,210,255,' + (0.16 + 0.24 * k).toFixed(3) + ')';
        ctx.fillRect(th.x1, y - 9, th.x2 - th.x1, 12);
        arrows(ctx, this.x + this.dir * this.w * 0.5, y, this.dir, 5, k, '120,200,255');
      }
      if (this.state === 'stompPrep' || (this.state === 'stompAir' && this.air)) {
        const tx = this.state === 'stompAir' ? this.slamX : G.player.x;
        Kit.drawTele(ctx, tx, this.groundY(tx), this.w * 0.55, this.state === 'stompAir' ? 1 : this.prog(), STY.ice, 0, this.t);
      }
      if (this.state === 'spikePrep') groundBar(ctx, '150,215,255', this.prog(), this.groundY());
    }
    if (G.art.frostGust && this.gustLane) G.art.frostGust.tele(ctx, this); // 強風的風道、搖響的鐘、捲進去的雪（js/art/stormfrost.js）
    G.art.drawMonster(ctx, this);
    this.drawWeather(ctx);
    if (!this.dead) this.drawHz(ctx);
  };

  // ═════════════════ 時間 ═════════════════
  const TICOL = ['#c8b0ff', '#fff3a8', '#8a6aff', '#ffffff'];
  const ECHOES = ['queenShroom', 'hermitCrab', 'lavaTortoise', 'frostSpirit'];

  function TimeItself(x) {
    Kit.init(this, 'timeItself', x);
    this.stabLeft = 0;
    this.sweepLeft = 0;
    this.hist = [];
    this.echoes = [];
    this.stopK = 0;
    this.ghost = null;
    this.ally = new Greymane(this);
    this.sumT = SUM_TIME.first; // 下一隻野外魔王殘影
    this.echoT = 5.5; // 下一次喚出過去 Boss 的殘影（開戰 5 秒後才開始）
    this.echoSeq = 0;
    this.echoHit = {};
    // 時針：一直快速地正轉、逆轉（handPh 累積角度；美術 js/art/bosses3.js 讀它）
    this.handPh = 0;
    this.handV = 0;
    this.handDir = 1;
    this.handSw = 1;
  }
  Object.assign(TimeItself.prototype, Kit.proto);

  // 過去 Boss 的殘影：每 ECHO_EVERY 秒一次，一次 2～3 個不同的 Boss（第二階段 3 個），出招彼此錯開 ECHO_GAP 秒；
  // 每個殘影的招式最多打中一次，傷害 = 時間的攻擊 × ECHO_MULT
  const ECHO_EVERY = [6, 8];
  const ECHO_GAP = 0.45;
  const ECHO_MULT = 0.6;
  const HAND_W = 17; // 時針最快的轉速（弧度／秒，約 2.7 圈；四根針各自再乘 0.75～1.9）

  // 灰鬃擋招：擋得下就不會打到玩家；每個殘影只會打中一次
  TimeItself.prototype.hit = function (mult, fromX, src, opts) {
    if (this.ally && this.ally.absorb(src)) return false;
    const echo = src && src.indexOf('echo:') === 0;
    if (echo && this.echoHit[src]) return false;
    const r = Kit.proto.hit.call(this, mult, fromX, src, opts);
    if (echo && r) this.echoHit[src] = true;
    return r;
  };

  // 錶盤中心（時針的轉軸）
  TimeItself.prototype.pivot = function () {
    const K = this.h / 380;
    return { x: this.x, y: this.y - 228 * K + Math.sin(this.t * 1.2) * 6 * K };
  };

  TimeItself.prototype.update = function (dt) {
    const P = G.player;
    const map = G.world.map;
    const frozen = this.tick(dt);
    // 時停的濃度
    const wantStop = this.state === 'stop' ? 1 : this.state === 'stopPrep' ? this.prog() * 0.4 : 0;
    this.stopK += (wantStop - this.stopK) * Math.min(1, dt * 4);
    // 記下玩家過去 3.5 秒的位置（倒轉用）
    if (P.alive()) {
      this.hist.push({ t: this.fightT, x: P.x, y: P.y });
      while (this.hist.length && this.hist[0].t < this.fightT - 3.6) this.hist.shift();
    }
    this.updateEchoes(dt);
    this.ally.update(dt);
    Sum.tick(this, dt);
    // 時針：時間的感覺——有時慢、有時快、有時越轉越快、有時突然停住、有時像真的時鐘一格一格跳；方向也會隨機倒過來
    if (this.ritualT > 0) this.ritualT = Math.max(0, this.ritualT - dt);
    this.handSw -= dt;
    if (this.handSw <= 0) {
      const modes = ['slow', 'fast', 'accel', 'stop', 'tick', 'fast', 'slow'];
      let mo = modes[Math.floor(Math.random() * modes.length)];
      if (mo === this.handMode) mo = mo === 'stop' ? 'fast' : 'stop';
      this.handMode = mo;
      this.handModeT = 0;
      if (Math.random() < 0.5) this.handDir = -this.handDir;
      this.handSw = { slow: U.rand(1.2, 2.4), fast: U.rand(0.5, 1.1), accel: U.rand(1.2, 2.0), stop: U.rand(0.4, 1.1), tick: U.rand(1.5, 2.5) }[mo];
    }
    this.handModeT = (this.handModeT || 0) + dt;
    const hm = this.handMode || 'fast';
    let want = 0;
    let resp = 7;
    if (hm === 'slow') want = HAND_W * 0.12;
    else if (hm === 'fast') want = HAND_W;
    else if (hm === 'accel') {
      want = HAND_W * (0.1 + Math.min(1.5, this.handModeT * 0.9)); // 越轉越快，最後比平常還快
      resp = 3;
    } else if (hm === 'stop') {
      want = 0;
      resp = 30; // 一下子停住
    } else if (hm === 'tick') {
      // 一格一格跳：每 0.5 秒快速跳一小格，其餘時間停著
      const ph = this.handModeT % 0.5;
      want = ph < 0.07 ? HAND_W * 0.9 : 0;
      resp = 40;
    }
    this.handV += (this.handDir * want - this.handV) * Math.min(1, dt * resp);
    this.handPh += this.handV * dt;
    // 野外魔王殘影、過去 Boss 殘影：各自一直計時（開場、變身時暫停）
    if (!this.dead && this.state !== 'intro' && this.state !== 'transform') {
      this.sumT -= dt;
      if (this.sumT <= 0) {
        this.sumT = SUM_TIME.every;
        if (Sum.echo(this) !== false) this.ritualT = RITUAL; // 召喚的儀式：錶盤發亮（js/art/bosses3.js 讀 m.ritualT）
      }
      this.echoT -= dt;
      if (this.echoT <= 0) {
        this.echoT = U.rand(ECHO_EVERY[0], ECHO_EVERY[1]);
        this.castEchoes();
        this.ritualT = RITUAL;
      }
    }
    if (this.dead) {
      // 召喚物在 Boss 倒下的第一幀崩解（在打倒劇情、儀式、結局之前）
      if (!this.sumCleared) {
        this.sumCleared = true;
        Sum.despawnAll(this);
      }
      this.stopK = Math.max(0, this.stopK - dt * 2);
      return deadUpdate(this, dt, ['#ffffff', '#c8b0ff', '#fff3a8']);
    }
    if (frozen) {
      this.vx = 0;
      this.phys(dt);
      return false;
    }
    if (this.wantPhase2 && this.state !== 'transform' && this.state !== 'stop' && this.state !== 'rewindPrep') {
      Kit.startTransform(this, 2.2, '時間：「石頭會碎，葉子會落。只有我——永遠不會停。」石殼裂開了！');
      this.echoes.length = 0;
      this.ally.shout('……那裡面，什麼都沒有。別怕！', 2);
    }
    const spd = this.spd();
    const dx = P.x - this.x;
    this.stateT -= dt;
    // 召喚野外魔王的施法姿勢（指針倒轉、錶盤發光）
    if (Sum.castStep(this)) {
      if (Math.random() < 0.4) G.fx.burst(this.x + U.rand(-60, 60), this.y - U.rand(120, this.h), ['#c8b0ff', '#fff3a8'], 1, 90, { grav: -60, life: 0.6 });
      this.phys(dt);
      this.touch(0.4);
      return false;
    }

    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.say('……又一個守葉獸。', '#e8dcff');
          this.ally.shout('這一次，我跟你一起打！', 2.2);
          this.setState('move', 0.8);
        }
        break;

      case 'transform':
        if (Math.random() < 0.4) G.fx.burst(this.x + U.rand(-120, 120), this.y - U.rand(60, this.h), ['#9a8e84', '#6e645c', '#c8b0ff'], 3, 260, { grav: 500, life: 0.8, shape: 'square', size: 5 });
        if (Kit.updateTransform(this, dt, TICOL)) {
          this.say('看吧，無盡的時間。', '#e8dcff');
          this.setState('move', 0.4);
          this.forceNext = 'clockwork';
        }
        break;

      // 懸空滑行，和玩家保持一段距離
      case 'move': {
        this.dir = U.sign(dx) || this.dir;
        const want = Math.abs(dx) > 340 ? U.sign(dx) : Math.abs(dx) < 200 ? -U.sign(dx) : 0;
        const edge = (this.x < this.halfW + 40 && want < 0) || (this.x > map.w - this.halfW - 40 && want > 0);
        this.vx += ((edge ? 0 : want) * this.def.speed * spd - this.vx) * Math.min(1, dt * 3);
        if (this.stateT <= 0) this.chooseAttack();
        break;
      }

      // ── 時針橫掃 ──
      case 'sweepPrep':
        this.vx *= 0.8;
        if (this.stateT <= 0) {
          this.handSweep();
          this.setState('sweep', this.sweepDur + 0.1);
        }
        break;
      case 'sweep':
        this.vx = 0;
        if (this.stateT <= 0) {
          if (this.sweepLeft > 0) {
            this.sweepLeft--;
            this.sweepFrom = -this.sweepFrom;
            this.setState('sweepPrep', 0.55);
          } else this.setState('recover', 0.6 * this.cd());
        }
        break;

      // ── 時針刺擊 ──
      case 'stab':
        this.vx *= 0.85;
        if (this.stateT <= 0) {
          if (this.stabLeft > 0) {
            this.stabLeft--;
            this.stabAt(P.x + P.vx * 0.3, 0.75);
          } else this.setState('recover', 0.6 * this.cd());
        }
        break;

      // ── 時停＋星沙雨 ──
      // ── 時間暫停：預警（腳下的錶盤收緊）→ 玩家整個停住 1.2 秒（在空中也停在空中），解凍時腳邊落下星沙 ──
      case 'freezePrep':
        this.vx = 0;
        if (P.alive() && Math.random() < 0.3) G.fx.ring(P.x, P.y - 30, 'rgba(232,220,255,0.9)', 110 * (0.3 + this.stateT), 0.2, 3);
        if (this.stateT <= 0) {
          // 必中：不看免疫（使用者：時間技都是必中技）
          if (P.alive()) {
            P.m5stop = { t: 1.2, x: P.x, y: P.y, el: 0 };
            if (G.art.timeWarp) G.art.timeWarp.show('freeze', 1.25);
            G.audio.play('bossWarn');
            G.fx.ring(P.x, P.y - 30, '#fff3a8', 90, 0.4, 5);
            // 解凍後才落地的星沙：停住的時候看得到影子，醒來就要走開
            const pp = this.playerPlat();
            const ty = pp > 0 ? map.platforms[pp][2] : this.groundY();
            for (const dx of [0, -110, 110]) this.addHz({ type: 'rock', style: 'star', x: U.clamp(P.x + dx, 50, map.w - 50), y: ty, r: 44, delay: 1.9, mult: 0.85, src: 'starSand', seed: Math.random() * 6, drift: 0 });
          }
          this.setState('recover', 0.8 * this.cd());
        }
        break;
      case 'stopPrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.setState('stop', this.phase === 2 ? 3.8 : 3.3);
          if (G.art.timeWarp && P.alive()) G.art.timeWarp.show('slow', this.phase === 2 ? 3.8 : 3.3);
          this.rainT = 0.1;
          this.rainN = 0;
          G.fx.screenFlash('#c8b0ff', 0.35);
          G.audio.play('thunder');
        }
        break;
      case 'stop':
        this.vx = 0;
        if (P.alive()) {
          P.slowT = Math.max(P.slowT || 0, 0.15);
          // 時間放緩：走路明顯變慢、跳起來也慢慢飄
          if (!P.action && P.climbing < 0 && Math.abs(P.vx) > 60) P.vx = U.sign(P.vx) * 60;
          if (!P.onGround && P.climbing < 0) P.vy *= 0.94;
        }
        this.rainT -= dt;
        if (this.rainT <= 0 && this.stateT > 1.2) {
          this.rainT = this.phase === 2 ? 0.3 : 0.4;
          this.rainN++;
          const aim = this.rainN % 3 === 1;
          const x = aim ? P.x + U.rand(-20, 20) : U.rand(60, map.w - 60);
          const pp = this.playerPlat();
          const ty = aim && pp > 0 ? map.platforms[pp][2] : this.groundY();
          this.addHz({ type: 'rock', style: 'star', x: U.clamp(x, 50, map.w - 50), y: ty, r: 44, delay: 1.45, mult: 0.85, src: 'starSand', seed: Math.random() * 6, drift: U.rand(-60, 60) });
        }
        if (this.stateT <= 0) {
          G.fx.screenFlash('#ffffff', 0.2);
          G.audio.play('bossWarn');
          this.setState('recover', 0.6 * this.cd());
        }
        break;

      // ── 倒轉：把玩家拉回三秒前的位置 ──
      case 'rewindPrep': {
        this.vx = 0;
        const g = this.ghost;
        if (g && Math.random() < 0.25) G.fx.burst(g.x, g.y - 30, ['#c8b0ff', '#ffffff'], 1, 60, { life: 0.5, grav: -40 });
        if (this.stateT <= 0) {
          if (g && P.alive()) {
            G.fx.burst(P.x, P.y - 30, ['#c8b0ff', '#ffffff', '#fff3a8'], 16, 260);
            P.x = g.x;
            P.y = g.y - 2;
            if (G.art.timeWarp) G.art.timeWarp.show('rewind', 1.3);
            P.vx = 0;
            P.vy = 0;
            P.climbing = -1;
            P.onGround = false;
            P.action = null;
            G.fx.ring(P.x, P.y - 30, '#e8dcff', 90, 0.4, 5);
            G.fx.burst(P.x, P.y - 30, ['#c8b0ff', '#ffffff', '#fff3a8'], 16, 260);
            G.audio.play('portal');
          }
          this.ghost = null;
          this.setState('recover', 1.0 * this.cd());
        }
        break;
      }

      // ── 召喚過去 Boss 的殘影 ──
      case 'echo':
        this.vx = 0;
        if (this.stateT <= 0) {
          // （舊的「殘影」招式：現在由 update 的計時器一直放；被強制出這招時也走同一套）
          this.castEchoes();
          this.setState('recover', 1.0 * this.cd());
        }
        break;

      // ── 大招：十二時（第二階段）──
      case 'clockworkPrep':
        this.vx = 0;
        if (this.stateT <= 0) {
          this.clockwork();
          this.setState('clockwork', 3.2);
        }
        break;
      case 'clockwork':
        this.vx = 0;
        if (this.stateT <= 0) this.setState('recover', 0.7);
        break;

      case 'recover':
        this.vx *= 0.8;
        if (this.stateT <= 0) this.setState('move', U.rand(0.5, 1.0) * this.cd());
        break;
    }
    this.phys(dt);
    const noTouch = this.state === 'transform' || this.state === 'intro';
    if (!noTouch) this.touch(0.4);
    return false;
  };

  TimeItself.prototype.chooseAttack = function () {
    let pick = this.forceNext;
    this.forceNext = null;
    if (!pick) {
      const table = this.phase === 1
        ? { sweep: 8, stab: 8, stop: 24, rewind: 40, freeze: 24 }
        : { sweep: 4, stab: 4, stop: 35, rewind: 70, freeze: 45, clockwork: 10 };
      // 時間倒退（拉回過去的位置）、時間暫停是「時間」的招牌：
      // 三種時間技佔大部分出招：第一階段（倒退隔 4 秒、放緩 7、暫停 8），第二階段幾乎只放時間技（倒退 2.5、放緩 5、暫停 5）
      const p2 = this.phase !== 1;
      pick = this.pick(table, { clockwork: 18, stop: p2 ? 5 : 7, rewind: p2 ? 2.5 : 4, freeze: p2 ? 5 : 8, echo: 7 });
    } else this.pickT[pick] = this.fightT;
    // 召喚野外魔王：不限次數、不限時間；同時存在最多 4 隻，每 15 秒一次
    if (pick !== 'clockwork' && this.sumReady()) {
      const first = !this.sumSaid || this.sumSaid !== this.phase;
      this.sumSaid = this.phase;
      if (Sum.cast(this, 'time', 'rewindPrep', first ? '過去，醒來吧。' : null, '#e8dcff')) {
        this.ghost = null;
        if (first && this.ally) this.ally.shout(this.phase === 2 ? '又來？我幫你咬牠！' : '那是……野外的魔王？', 1.8);
        return;
      }
    }
    const f = this.fury ? 0.85 : 1;
    const P = G.player;
    if (pick === 'sweep') {
      this.sweepLeft = this.phase === 2 ? 1 : 0;
      this.sweepFrom = P.x < this.x ? 1 : -1;
      this.setState('sweepPrep', 1.05 * f);
      this.warn();
      // 第一階段第一次橫掃：灰鬃替你擋
      if (this.phase === 1) this.ally.offerBlock(['handSweep'], 1.05 + 6, '笨蛋，看前面！這一下我來擋！');
    } else if (pick === 'stab') {
      this.stabLeft = this.phase === 2 ? 2 : 1;
      this.stabAt(P.x, 0.95 * f);
      this.warn();
    } else if (pick === 'stop') {
      this.say('停下吧。', '#e8dcff');
      this.setState('stopPrep', 1.1 * f);
      this.warn(true);
      if (this.phase === 1) this.ally.offerBlock(['starSand'], 1.1 * f + 4, '時間停了？我幫你擋星沙！');
    } else if (pick === 'rewind') {
      this.startRewind();
    } else if (pick === 'freeze') {
      this.say('停住。', '#e8dcff');
      this.setState('freezePrep', 0.9 * f);
      this.warn();
    } else if (pick === 'echo') {
      this.say('還記得他們嗎？', '#e8dcff');
      this.setState('echo', 0.8);
    } else if (pick === 'clockwork') {
      this.say('十二時，一起敲響吧。', '#ffd0f0');
      this.setState('clockworkPrep', 1.0);
      this.warn(true);
      this.ally.offerBlock(['hour'], 1.0 + 4, '……這次換我保護你。');
    }
  };

  // 野外魔王改由 update 裡的計時器召喚（Sum.echo，每 5 秒一隻），不再佔用出招
  TimeItself.prototype.sumReady = function () {
    return false;
  };

  // 一次喚出 2～3 個不同的過去 Boss 殘影，分散在場地各處（離玩家 260 以上、彼此 340 以上）
  TimeItself.prototype.castEchoes = function () {
    const P = G.player;
    const map = G.world.map;
    const pool = ECHOES.filter((id) => G.data.monsters[id] && G.art.MONSTER_DRAW[G.data.monsters[id].art]);
    const n = Math.min(pool.length, this.phase === 2 ? 3 : Math.random() < 0.5 ? 2 : 3);
    // 上一次最後出場的不要排第一個
    const ids = [];
    while (ids.length < n && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      if (!ids.length && pool[i] === this.lastEcho && pool.length > 1) continue;
      ids.push(pool.splice(i, 1)[0]);
    }
    const used = [];
    const sums = Sum.list(this);
    ids.forEach((id, i) => {
      let best = null;
      for (let tries = 0; tries < 24; tries++) {
        const x = U.rand(170, map.w - 170);
        // 也不要疊在野外魔王殘影身上（招式預警才分得清是誰放的）
        const score = Math.min(Math.abs(x - P.x) - 260, ...used.map((u) => Math.abs(u - x) - 340), Math.abs(x - this.x) - 120, ...sums.map((m) => Math.abs(m.x - x) - (m.halfW || 120) - 60));
        if (!best || score > best.s) best = { x, s: score };
        if (score > 0 && tries > 6) break;
      }
      used.push(best.x);
      this.lastEcho = id;
      this.echoes.push({ id, x: best.x, dir: U.sign(P.x - best.x) || 1, t: -i * ECHO_GAP, did: false, life: 3.0 + (id === 'hermitCrab' ? 0.8 : 0), key: 'echo:' + this.echoSeq++ });
    });
    this.echoN = (this.echoN || 0) + 1;
    if (this.echoN === 1) this.say('還記得他們嗎？', '#e8dcff');
    G.audio.play('quest');
  };

  TimeItself.prototype.handSweep = function () {
    const map = G.world.map;
    const from = this.sweepFrom || 1;
    const reach = 820;
    const x0 = U.clamp(this.x + from * reach, 10, map.w - 10);
    const x1 = U.clamp(this.x - from * reach, 10, map.w - 10);
    const sp = this.phase === 2 ? 900 : 760;
    const pv = this.pivot();
    this.addHz({ type: 'sweep', style: 'hand', x0, x1, x: x0, y: this.groundY(), speed: sp, hgt: 62, hw: 26, mult: 1.1, delay: 0.1, src: 'handSweep', trail: false, px: pv.x, py: pv.y });
    this.sweepDur = Math.abs(x1 - x0) / sp + 0.15;
    this.lastAtk = 'handSweep';
    G.audio.play('sweep');
  };

  TimeItself.prototype.stabAt = function (x, prep) {
    const map = G.world.map;
    const pp = this.playerPlat();
    const ty = pp > 0 ? map.platforms[pp][2] : this.groundY();
    this.stabX = U.clamp(x, 60, map.w - 60);
    this.addHz({ type: 'mark', style: 'hand', x: this.stabX, y: ty, r: 72, delay: prep, mult: 1.15, src: 'stab', hgt: 150, sound: 'slam' });
    this.setState('stab', prep + 0.05);
  };

  TimeItself.prototype.startRewind = function () {
    const P = G.player;
    const map = G.world.map;
    // 三秒前的位置
    const want = this.fightT - 3;
    let g = this.hist[0];
    for (const h of this.hist) if (Math.abs(h.t - want) < Math.abs(g.t - want)) g = h;
    if (!g) g = { x: P.x, y: P.y };
    const x = U.clamp(g.x, 30, map.w - 30);
    const pl = G.physics.platformBelow(map, x, g.y - 2);
    const gy = G.physics.surfaceY(map, pl >= 0 ? pl : 0, x);
    this.ghost = { x, y: Math.min(g.y, gy), gy };
    const T = 1.9;
    this.addHz({ type: 'mark', style: 'star', x, y: gy, r: 85, delay: T + 1.15, mult: 1.15, src: 'rewind', hgt: 150, sound: 'thunder' });
    this.say('倒轉。', '#e8dcff');
    this.setState('rewindPrep', T);
    this.warn();
  };

  // 十二格輪流敲響：奇數格先、偶數格後；平台上安全（光柱只有 115 高）
  TimeItself.prototype.clockwork = function () {
    const map = G.world.map;
    const gy = this.groundY();
    const n = 12;
    const W = map.w / n;
    const first = Math.random() < 0.5 ? 0 : 1;
    for (let i = 0; i < n; i++) {
      const wave = (i + first) % 2;
      this.addHz({ type: 'mark', style: 'hour', x: W * (i + 0.5), y: gy, r: W / 2 - 2, delay: 1.5 + wave * 1.15, mult: 1.3, src: 'hour', hgt: 115, sound: 'thunder', small: true, quiet: i % 3 !== 0, hour: i + 1 });
    }
    this.lastAtk = 'hour';
    G.fx.shake(8, 0.4);
    G.audio.play('bossWarn');
  };

  // ── 殘影：半透明的過去 Boss，出現、出一招、消失 ──
  TimeItself.prototype.updateEchoes = function (dt) {
    const P = G.player;
    const map = G.world.map;
    const gy = this.groundY();
    for (let i = this.echoes.length - 1; i >= 0; i--) {
      const e = this.echoes[i];
      e.t += dt;
      if (this.dead) e.t = Math.max(e.t, e.life - 0.5);
      if (!e.did && e.t >= 0.9 && !this.dead) {
        e.did = true;
        const say = { queenShroom: '（孢子……）', hermitCrab: '（哈哈哈！）', lavaTortoise: '（……火。）', frostSpirit: '（噹——）' }[e.id];
        G.fx.text(e.x, gy - 260 * ((G.data.monsters[e.id] && G.data.monsters[e.id].sizeK) || 1), say, '#e8dcff', 18, 1.2);
        if (e.id === 'queenShroom') {
          for (let k = -1; k <= 1; k++) this.addHz({ type: 'mark', style: 'spore', x: U.clamp(P.x + k * 170, 40, map.w - 40), y: gy, r: 60, delay: 1.0 + (k + 1) * 0.2, mult: ECHO_MULT, src: e.key, hgt: 150, sound: 'spore', small: true });
        } else if (e.id === 'hermitCrab') {
          [-1, 1].forEach((d) => this.addHz({ type: 'sweep', style: 'water', x0: e.x + d * 60, x1: d < 0 ? -40 : map.w + 40, x: e.x, y: gy, speed: 430, hgt: 62, hw: 30, mult: ECHO_MULT, delay: 0.35, src: e.key }));
        } else if (e.id === 'lavaTortoise') {
          for (let k = 0; k < 5; k++) this.addHz({ type: 'rock', style: 'lava', x: U.clamp(k === 0 ? P.x : P.x + U.rand(-420, 420), 60, map.w - 60), y: gy, r: 46, delay: 1.0 + k * 0.14, mult: ECHO_MULT, src: e.key, seed: Math.random() * 6, drift: U.rand(-100, 100) });
        } else {
          const step = 200;
          const off = ((P.x % step) + step) % step;
          for (let x = off; x < map.w; x += step) if (Math.abs(x - e.x) < 700) this.addHz({ type: 'mark', style: 'ice', x, y: gy, r: 50, delay: 1.1 + Math.abs(x - e.x) / 1800, mult: ECHO_MULT, src: e.key, hgt: 110, sound: 'rockHit', small: true, quiet: true });
        }
        G.fx.burst(e.x, gy - 120, ['#c8b0ff', '#ffffff'], 12, 220);
      }
      if (e.t >= e.life) this.echoes.splice(i, 1);
    }
  };

  TimeItself.prototype.drawEchoes = function (ctx) {
    const gy = this.groundY();
    for (const e of this.echoes) {
      const d = G.data.monsters[e.id];
      if (!d) continue;
      const a = Math.min(1, e.t / 0.6, (e.life - e.t) / 0.6);
      if (a <= 0) continue;
      const act = e.t > 0.5 && e.t < 1.3;
      const fake = {
        id: e.id, def: d, x: e.x, y: gy + (1 - a) * 20, dir: e.dir, t: this.t + e.x * 0.01, w: d.w, h: d.h, scale: 1, isBoss: true,
        state: act ? { queenShroom: 'spore', hermitCrab: 'tidePrep', lavaTortoise: 'eruptPrep', frostSpirit: 'tollPrep' }[e.id] : 'move',
        stateT: act ? 0.3 : 1, stateT0: 1, phase: 1, p2k: 0, enraged: false, onGround: true, vx: 0, vy: 0, hurtFlash: 0, squash: 0,
        dead: false, deadT: 0, blink: false, rollAngle: 0, hz: [], threats: [], air: null, bellSwing: act ? 1 : 0, snow: [],
        V: { tint: '#9a88ff', tintAmt: 0.55, alpha: 0.42 * a },
      };
      // 殘影底下一圈錶盤光
      ctx.save();
      ctx.globalAlpha = 0.5 * a;
      ctx.strokeStyle = '#c8b0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(e.x, gy, 110 * (d.sizeK || 1), 16, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      G.art.drawMonster(ctx, fake);
      ctx.globalAlpha = 1;
    }
  };

  TimeItself.prototype.draw = function (ctx) {
    const y = this.y;
    const cam = G.cam;
    if (this.stopK > 0.01) {
      // 時停：整個世界變成灰紫色
      ctx.fillStyle = 'rgba(60,40,110,' + (0.28 * this.stopK).toFixed(3) + ')';
      ctx.fillRect(cam.x - 60, cam.y - 60, G.W + 120, G.H + 120);
    }
    if (!this.dead) {
      if (this.state === 'sweepPrep') {
        const k = this.prog();
        groundBar(ctx, '255,200,100', k, this.groundY());
        const from = this.sweepFrom || 1;
        arrows(ctx, this.x + from * 700, this.groundY(), -from, 4, k, '255,200,100');
      }
      if (this.state === 'rewindPrep' && this.ghost) this.drawGhost(ctx);
      if (this.state === 'clockworkPrep') groundBar(ctx, '255,140,210', this.prog(), this.groundY());
      this.drawEchoes(ctx);
    }
    G.art.drawMonster(ctx, this);
    if (!this.dead) {
      this.drawHz(ctx);
      this.drawHours(ctx);
    }
    this.ally.draw(ctx);
  };

  // 十二時格子上的羅馬數字
  TimeItself.prototype.drawHours = function (ctx) {
    const R = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    ctx.save();
    ctx.font = 'bold 26px ' + G.art.NUMFONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const h of this.hz) {
      if (!h.hour || h.fired) continue;
      const left = h.delay - h.t;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(h.t * 10);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#3a1a4a';
      ctx.strokeText(R[h.hour - 1], h.x, h.y - 60);
      ctx.fillStyle = left < 1.1 ? '#ff8ad0' : '#ffe0f4';
      ctx.fillText(R[h.hour - 1], h.x, h.y - 60);
      // 格線
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffe0f4';
      ctx.fillRect(h.x - h.r - 1, h.y - 30, 2, 30);
    }
    ctx.restore();
  };

  // 倒轉的殘影：三秒前的小獅子＋倒轉的錶
  TimeItself.prototype.drawGhost = function (ctx) {
    const g = this.ghost;
    const k = this.prog();
    const P = G.player;
    ctx.save();
    // 從玩家拉到殘影的線
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -this.t * 60;
    ctx.strokeStyle = 'rgba(220,200,255,' + (0.4 + 0.4 * k).toFixed(3) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(P.x, P.y - 30);
    ctx.lineTo(g.x, g.y - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 12);
    G.art.mode = 'tint';
    G.art.modeColor = '#b89aff';
    G.art.modeAmt = 0.7;
    if (G.art.drawLion) G.art.drawLion(ctx, g.x, g.y, P.dir, { state: 'idle', t: P.t, p: 0, form: P.form });
    G.art.mode = null;
    ctx.restore();
    // 倒著轉的小錶
    const cx = g.x;
    const cy = g.y - 120;
    ctx.save();
    ctx.globalAlpha = 0.9;
    G.art.ellipse(ctx, cx, cy, 22, 22, '#f4ecff', '#c8b0ff', { lw: 3, hl: false });
    ctx.strokeStyle = G.art.outline();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const a = -this.t * 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a / 12) * 10, cy + Math.sin(a / 12) * 10);
    ctx.stroke();
    // 剩下的時間（外圈）
    ctx.strokeStyle = '#ff8ad0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k));
    ctx.stroke();
    ctx.restore();
  };

  // ═════════════════ 盟友：灰鬃 ═════════════════
  // 不是怪物、不會被打：只是 Boss 物件裡的一個小幫手。
  function Greymane(boss) {
    const map = G.world.map;
    this.b = boss;
    this.x = U.clamp(G.player.x - 70, 40, map.w - 40);
    this.y = G.physics.groundY(map, this.x);
    this.vx = 0;
    this.vy = 0;
    this.dir = 1;
    this.t = 0;
    this.atkT = 3.5;
    this.mode = 'follow';
    this.modeT = 0;
    this.guard = null;
    this.blocked = {};
    this.lineT = 0;
    this.shield = 0;
  }

  Greymane.prototype.shout = function (text, life) {
    G.fx.text(this.x, this.y - 110, '灰鬃：「' + text + '」', '#e0e0ea', 17, life || 1.6);
  };

  // Boss 要放大招時呼叫：這一階段還沒擋過就衝過去擋
  Greymane.prototype.offerBlock = function (srcs, dur, line) {
    const b = this.b;
    if (this.blocked[b.phase] || b.dead) return;
    this.blocked[b.phase] = true;
    this.guard = { srcs, until: b.fightT + dur, used: false, line };
    this.mode = 'guard';
    this.shout('交給我！', 1.4);
    G.hud.toast('灰鬃：「' + line + '」', '#e0e0ea');
  };

  Greymane.prototype.absorb = function (src) {
    const g = this.guard;
    if (!g || this.b.fightT > g.until || g.srcs.indexOf(src) < 0) return false;
    const P = G.player;
    // 要站在玩家旁邊才擋得到（他跑得很快，幾乎都來得及）
    if (Math.abs(this.x - P.x) > 90) return false;
    // 同一招可能連續好幾幀都碰到：特效半秒只放一次
    if (this.t - (this.absorbT || -9) < 0.5) return true;
    this.absorbT = this.t;
    this.shield = 1;
    G.fx.ring(this.x, this.y - 40, '#fff3a8', 90, 0.4, 6);
    G.fx.burst(this.x, this.y - 40, ['#ffffff', '#fff3a8', '#c8c8d8'], 14, 260);
    G.fx.text(this.x, this.y - 90, '擋下了！', '#fff3a8', 22, 1);
    G.audio.play('rockHit');
    if (!g.used) {
      g.used = true;
      setTimeout(() => {
        if (G.world.boss === this.b) this.shout(this.b.phase === 2 ? '……哼，還站得起來吧？' : '嘖……換你了！', 1.8);
      }, 700);
    }
    return true;
  };

  Greymane.prototype.update = function (dt) {
    const b = this.b;
    const P = G.player;
    const map = G.world.map;
    let gy = G.physics.groundY(map, this.x);
    this.t += dt;
    if (this.shield > 0) this.shield -= dt * 1.5;
    if (this.guard && b.fightT > this.guard.until) {
      this.guard = null;
      if (this.mode === 'guard') this.mode = 'follow';
    }
    let tx = this.x;
    let sp = 260;
    if (b.dead) {
      // 贏了：跑到玩家旁邊
      tx = P.x - 60 * P.dir;
      sp = 200;
      if (!this.cheered && b.deadT > 1.2) {
        this.cheered = true;
        this.shout('……我們，贏了？', 2.4);
      }
    } else if (this.mode === 'guard') {
      // 擋在玩家和 Boss 之間
      const side = U.sign(b.x - P.x) || 1;
      tx = P.x + side * 34;
      sp = 720;
    } else if (this.mode === 'pounce') {
      this.modeT -= dt;
      if (this.onGround() && this.modeT < 0.35) {
        this.mode = 'follow';
      }
    } else {
      // 平常：在玩家和 Boss 之間晃，時間到就撲上去咬一口
      const side = U.sign(P.x - b.x) || 1;
      tx = b.x + side * (b.w * 0.5 + 70 + Math.sin(this.t * 0.9) * 50);
      sp = 280;
      const stopped = b.state === 'stop';
      if (!stopped) this.atkT -= dt;
      if (this.atkT <= 0 && b.state !== 'transform' && b.state !== 'intro' && this.onGround()) this.pounce();
    }
    if (this.mode !== 'pounce' && this.onGround()) {
      const d = tx - this.x;
      this.vx = Math.abs(d) < 8 ? 0 : U.sign(d) * Math.min(sp, Math.abs(d) * 6);
      if (Math.abs(this.vx) > 5) this.dir = U.sign(this.vx);
      else if (!b.dead) this.dir = U.sign(b.x - this.x) || this.dir;
    }
    // 時停中也跟著變慢
    const slow = b.state === 'stop' ? 0.35 : 1;
    this.x = U.clamp(this.x + this.vx * dt * slow, 20, map.w - 20);
    // 起伏的地面：走路時貼著地表
    gy = G.physics.groundY(map, this.x);
    if (this.mode !== 'pounce' && this.vy >= 0 && Math.abs(this.y - gy) < 10) this.y = gy;
    if (!this.onGround() || this.vy < 0) {
      this.vy += 2100 * dt * slow;
      this.y += this.vy * dt * slow;
      if (this.y >= gy) {
        this.y = gy;
        this.vy = 0;
        if (this.mode === 'pounce' && !this.bit) this.bite();
      }
    }
    const tg = this.tgt && !this.tgt.dead ? this.tgt : b;
    const tw = tg === b ? b.w : tg.halfW * 2;
    if (this.mode === 'pounce' && !this.bit && this.vy > 0 && Math.abs(this.x - tg.x) < tw * 0.45) this.bite();
  };

  // 撲咬的目標：平常是 Boss；召喚出來的野外魔王靠近玩家時，約三分之一的機會改咬牠
  Greymane.prototype.pickTarget = function () {
    const P = G.player;
    const near = Kit.fbSummon.list(this.b).filter((m) => (m.fx.spawn || 0) <= 0 && Math.abs(m.x - P.x) < 520);
    return near.length && Math.random() < 0.35 ? U.pick(near) : null;
  };

  Greymane.prototype.onGround = function () {
    return this.y >= G.physics.groundY(G.world.map, this.x) - 0.5 && this.vy >= 0;
  };

  Greymane.prototype.pounce = function () {
    const b = this.b;
    this.mode = 'pounce';
    this.modeT = 1.2;
    this.bit = false;
    this.tgt = this.pickTarget();
    const tg = this.tgt || b;
    const tw = this.tgt ? this.tgt.halfW * 2 : b.w;
    this.dir = U.sign(tg.x - this.x) || this.dir;
    const tx = tg.x - this.dir * tw * 0.2;
    const T = 0.55;
    this.vx = (tx - this.x) / T;
    this.vy = -(0.5 * 2100 * T);
    this.y -= 1;
    this.atkT = U.rand(2.6, 3.4);
    G.audio.play('jump');
  };

  Greymane.prototype.bite = function () {
    const b = this.b;
    this.bit = true;
    this.vx = -this.dir * 180;
    this.vy = Math.min(this.vy, -420);
    this.y -= 1;
    if (b.dead) return;
    const m = this.tgt;
    this.tgt = null;
    if (m && !m.dead) {
      // 咬召喚物：最大血量的 3%（不會被擊退）
      const dealt = m.takeDamage(Math.max(1, Math.round(m.maxHp * 0.03 * U.rand(0.9, 1.1))), this.dir, 0, false);
      if (!dealt) return;
      const hy = m.y - (m.hover || 0) - m.h * m.scale * 0.5;
      G.fx.damage(m.x, m.y - (m.hover || 0) - m.h * m.scale - 10, dealt, 'normal', m.nextStack());
      G.fx.slash(m.x, hy, this.dir, 40, '#e0e0ea', 'claw');
      G.fx.burst(m.x, hy, ['#ffffff', '#c8c8d8', '#8a8a9a'], 10, 240);
      G.audio.play('claw');
      return;
    }
    if (b.state === 'transform') return;
    const dmg = Math.max(1, Math.round(b.maxHp * 0.0033 * U.rand(0.9, 1.1)));
    const dealt = b.takeDamage(dmg, this.dir);
    if (!dealt) return;
    const hx = b.x - this.dir * b.w * 0.25;
    const hy = b.y - b.h * 0.45;
    G.fx.damage(b.x, b.y - b.h - 10, dealt, 'normal', b.nextStack());
    G.fx.slash(hx, hy, this.dir, 40, '#e0e0ea', 'claw');
    G.fx.burst(hx, hy, ['#ffffff', '#c8c8d8', '#8a8a9a'], 10, 240);
    G.audio.play('claw');
    if (Math.random() < 0.25) this.shout(['吼！', '看招！', '別小看我！', '咬你喔！'][Math.floor(Math.random() * 4)], 1);
  };

  Greymane.prototype.draw = function (ctx) {
    const b = this.b;
    const gy = G.physics.groundY(G.world.map, this.x);
    const run = Math.abs(this.vx) > 20 && this.onGround();
    const air = !this.onGround();
    const t = this.t;
    ctx.save();
    // 影子
    ctx.fillStyle = 'rgba(30,20,10,0.22)';
    ctx.beginPath();
    ctx.ellipse(this.x, gy, 26, 6, 0, 0, TAU);
    ctx.fill();
    if (this.shield > 0 || this.mode === 'guard') {
      const k = Math.max(this.shield, this.mode === 'guard' ? 0.4 + 0.15 * Math.sin(t * 10) : 0);
      const g = ctx.createRadialGradient(this.x, this.y - 40, 10, this.x, this.y - 40, 80);
      g.addColorStop(0, 'rgba(255,245,200,0)');
      g.addColorStop(0.7, 'rgba(255,240,170,' + (0.35 * k).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, this.y - 40, 80, 0, TAU);
      ctx.fill();
    }
    ctx.translate(this.x, this.y + (run ? -Math.abs(Math.sin(t * 14)) * 7 : 0));
    const sc = 1.45;
    ctx.scale(this.dir * sc, sc);
    if (run) ctx.rotate(0.08);
    if (air) ctx.rotate(this.vy < 0 ? -0.25 : 0.2);
    // 停止的時間裡灰鬃也是灰紫色的
    if (b.stopK > 0.3) {
      G.art.mode = 'tint';
      G.art.modeColor = '#9a88d0';
      G.art.modeAmt = 0.4 * b.stopK;
    }
    const fn = G.art.NPC_DRAW && G.art.NPC_DRAW.greymane;
    if (fn) fn(ctx, t * (run ? 2.5 : 1));
    else {
      G.art.ellipse(ctx, 0, -20, 22, 14, '#b8b4bc', '#8e8a94', { cel: [3, 3] });
      G.art.ellipse(ctx, 10, -44, 22, 22, '#5a5660', '#3e3a44', { cel: [3, 3] });
      G.art.ellipse(ctx, 12, -44, 16, 15, '#b8b4bc', '#8e8a94', { cel: [3, 3] });
      G.art.eye(ctx, 16, -46, 3.5, 5, 'normal', 1);
    }
    G.art.mode = null;
    ctx.restore();
    if (!b.dead || b.deadT < 3) G.art.nameTag(ctx, this.x, this.y + 14, '灰鬃', '#e0e0ea');
  };

  Object.assign(G.bosses, { frostSpirit: FrostSpirit, timeItself: TimeItself });
})();
