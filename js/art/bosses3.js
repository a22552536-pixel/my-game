// 第四章、終章 Boss 的美術：霜靈、時間（註冊到 A.MONSTER_DRAW）。
// 風格與 monsters2.js 相同：平塗、深棕描邊、月牙陰影、高光；顏色都經過 A.c()（受擊閃白）。
// 原點在腳底中央、面向右（+x）；翻轉、閃白、淡出由 A.drawMonster 處理。
// 這兩隻是全遊戲最重要的 Boss：畫得大、姿勢跟著招式變（預警姿勢要一眼看得出來），第二階段換一個樣子。
//   霜靈：設計尺寸 300 高（約 360×330），m.h 等比例縮放。
//   時間：設計尺寸 380 高（約 400×400，懸空），錶盤中心 (0,-228) 要和 boss3.js 的 pivot() 一致。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const PI = Math.PI;
  const TAU = PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;

  function glow(ctx, x, y, r, rgb, a) {
    if (a <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  // 帶描邊的粗線
  function limb(ctx, path, w, col) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = Math.max(1, w - 5);
    ctx.stroke();
  }
  function prog(m) {
    return clamp(1 - (m.stateT || 0) / (m.stateT0 || 1), 0, 1);
  }
  // 偽亂數（固定種子，畫星星用）
  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function starPath(c, x, y, r1, r2, n) {
    for (let i = 0; i < n * 2; i++) {
      const a = -PI / 2 + (i * PI) / n;
      const r = i % 2 ? r2 : r1;
      i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }
  function gearPath(c, x, y, r, teeth, rot) {
    const n = teeth * 4;
    for (let i = 0; i <= n; i++) {
      const a = rot + (i / n) * TAU;
      const rr = i % 4 < 2 ? r : r * 0.82;
      i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.moveTo(x + r * 0.35, y);
    c.arc(x, y, r * 0.35, 0, TAU, true);
  }

  // ═════════════════════════ 霜靈 ═════════════════════════
  const FS = {
    ice: '#e6f4ff', iceS: '#a4c8e6', far: '#b4d2ec', farS: '#86aad0', hoof: '#56687e',
    mane: '#ffffff', maneS: '#cfe6f8', antler: '#bfe6ff', antlerS: '#86bfe6',
    bell: '#8aae9c', bellS: '#5e8474', bellD: '#46665a', rope: '#e8d8a8', ropeS: '#c0a870',
    doe: '#fbf4ea', doeS: '#e2d2bc',
  };

  function frostLeg(ctx, hx, hy, footX, lift, col, colS, back, w) {
    // 鹿腳：大腿 → 膝（後腳是往後彎的飛節）→ 細小腿 → 蹄
    const kx = hx + (back ? -14 : 10) + (footX - hx) * 0.4;
    const ky = hy + (0 - lift - hy) * 0.5 + (back ? 4 : -2);
    const fy = -lift;
    limb(ctx, (c) => {
      c.moveTo(hx, hy);
      c.quadraticCurveTo(hx + (back ? -10 : 6), (hy + ky) / 2, kx, ky);
      c.lineTo(footX, fy - 10);
    }, w, col);
    // 大腿肌肉
    A.ellipse(ctx, hx, hy + 12, w * 0.95, w * 1.5, col, colS, { lw: 3, hl: false, cel: [3, 3] });
    // 蹄
    A.shape(ctx, (c) => {
      c.moveTo(footX - 9, fy - 12);
      c.lineTo(footX + 9, fy - 12);
      c.lineTo(footX + 12, fy);
      c.lineTo(footX - 10, fy);
      c.closePath();
    }, FS.hoof, null, { lw: 2.6 });
    // 蹄上的毛
    A.ellipse(ctx, footX, fy - 14, 9, 5, FS.mane, FS.maneS, { lw: 2.2, hl: false });
  }

  // 冰裡睡著的白角鹿（小鹿的媽媽）
  function frozenDoe(ctx, x, y, s, t, wake) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const br = Math.sin(t * 0.8) * 0.8;
    // 折起來的腳
    A.ellipse(ctx, -34, 26, 20, 9, FS.doeS, null, { lw: 2.6, hl: false });
    A.ellipse(ctx, 26, 28, 22, 8, FS.doeS, null, { lw: 2.6, hl: false });
    // 身體
    A.ellipse(ctx, -6, 6 + br, 64, 30, FS.doe, FS.doeS, { cel: [4, 4] });
    // 背上的淡斑點
    ctx.fillStyle = A.c('#efe2cf');
    [[-30, -8], [-12, -14], [8, -12], [-40, 4]].forEach(([a, b]) => {
      ctx.beginPath();
      ctx.arc(a, b + br, 4, 0, TAU);
      ctx.fill();
    });
    // 尾巴
    A.ellipse(ctx, -68, -4, 9, 7, '#ffffff', FS.doeS, { lw: 2.4, hl: false });
    // 脖子彎回來，頭靠在前腳上
    A.shape(ctx, (c) => {
      c.moveTo(30, -12 + br);
      c.quadraticCurveTo(58, -26, 66, -2);
      c.lineTo(52, 12);
      c.quadraticCurveTo(44, 0, 30, 10);
      c.closePath();
    }, FS.doe, FS.doeS, { lw: 2.6, cel: [3, 3] });
    const hx = 62;
    const hy = 6;
    // 白色的角（白角鹿）
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy - 14);
    ctx.quadraticCurveTo(hx - 14, hy - 34, hx - 30, hy - 40);
    ctx.moveTo(hx - 11, hy - 27);
    ctx.lineTo(hx - 4, hy - 36);
    ctx.stroke();
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // 耳朵
    A.shape(ctx, (c) => {
      c.moveTo(hx - 12, hy - 8);
      c.quadraticCurveTo(hx - 30, hy - 18, hx - 34, hy - 10);
      c.quadraticCurveTo(hx - 24, hy - 2, hx - 12, hy - 2);
      c.closePath();
    }, FS.doe, FS.doeS, { lw: 2.4, shadeY: hy - 6 });
    A.ellipse(ctx, hx, hy, 17, 13, FS.doe, FS.doeS, { cel: [2, 2] });
    A.ellipse(ctx, hx + 14, hy + 5, 10, 7, '#fffaf2', null, { lw: 2.2, hl: false });
    ctx.fillStyle = A.c('#5a4034');
    ctx.beginPath();
    ctx.arc(hx + 22, hy + 3, 2.6, 0, TAU);
    ctx.fill();
    // 閉著的眼睛（醒來時會睜開）
    if (wake) A.eye(ctx, hx + 2, hy - 2, 3, 4, 'normal', 1);
    else A.eye(ctx, hx + 2, hy - 1, 4, 3, 'closed');
    A.blush(ctx, hx + 2, hy + 6, 4);
    ctx.restore();
  }

  // 神社的巨鐘（梵鐘）：p2 時裂開
  function shrineBell(ctx, ax, ay, rot, t, cracked, ring) {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(rot);
    // 注連繩（粗麻繩）＋紙垂
    limb(ctx, (c) => {
      c.moveTo(0, 0);
      c.lineTo(0, 24);
    }, 11, FS.rope);
    ctx.strokeStyle = A.c(FS.ropeS);
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-3, 4 + i * 7);
      ctx.lineTo(3, 8 + i * 7);
      ctx.stroke();
    }
    [-1, 1].forEach((d) => {
      A.shape(ctx, (c) => {
        c.moveTo(d * 3, 10);
        c.lineTo(d * 12, 12);
        c.lineTo(d * 9, 20);
        c.lineTo(d * 15, 22);
        c.lineTo(d * 11, 32);
        c.lineTo(d * 6, 30);
        c.closePath();
      }, '#ffffff', '#e0e8f0', { lw: 1.8, hl: false });
    });
    const top = 26;
    const H = 88;
    // 鐘頂的龍頭環
    A.shape(ctx, (c) => {
      c.moveTo(-10, top + 4);
      c.bezierCurveTo(-12, top - 10, 12, top - 10, 10, top + 4);
      c.lineTo(5, top + 4);
      c.bezierCurveTo(6, top - 4, -6, top - 4, -5, top + 4);
      c.closePath();
    }, FS.bell, FS.bellS, { lw: 2.6, hl: false });
    const body = (c) => {
      c.moveTo(-26, top + 12);
      c.bezierCurveTo(-26, top - 6, 26, top - 6, 26, top + 12);
      c.bezierCurveTo(30, top + 40, 30, top + H - 24, 36, top + H - 8);
      c.quadraticCurveTo(44, top + H - 4, 44, top + H);
      c.lineTo(-44, top + H);
      c.quadraticCurveTo(-44, top + H - 4, -36, top + H - 8);
      c.bezierCurveTo(-30, top + H - 24, -30, top + 40, -26, top + 12);
      c.closePath();
    };
    if (ring > 0.2) glow(ctx, 0, top + H * 0.55, 90 + ring * 40, '200,240,255', 0.45 * ring);
    A.shape(ctx, body, FS.bell, FS.bellS, { cel: [9, 0], hl: [-16, top + 26, 6, 18] });
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    // 帶子（橫線）
    ctx.strokeStyle = A.c(FS.bellD);
    ctx.lineWidth = 3;
    [top + 22, top + H - 20, top + H - 14].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(-45, y);
      ctx.lineTo(45, y);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(0, top + 22);
    ctx.lineTo(0, top + H - 20);
    ctx.stroke();
    // 乳（一格格的小突起）
    ctx.fillStyle = A.c(FS.bellD);
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
      ctx.beginPath();
      ctx.arc(-24 + q * 8, top + 7 + r * 6, 2.2, 0, TAU);
      ctx.arc(8 + q * 8, top + 7 + r * 6, 2.2, 0, TAU);
      ctx.fill();
    }
    // 撞座（蓮花圓）
    A.ellipse(ctx, -16, top + H - 40, 9, 9, '#a8c8bc', FS.bellS, { lw: 2.4, hl: false });
    A.ellipse(ctx, -16, top + H - 40, 4, 4, FS.bellD, null, { noStroke: true, hl: false });
    // 雪帽
    A.shape(ctx, (c) => {
      c.moveTo(-40, top + 8);
      c.bezierCurveTo(-30, top - 6, 30, top - 6, 40, top + 8);
      c.quadraticCurveTo(26, top + 14, 16, top + 10);
      c.quadraticCurveTo(8, top + 18, 0, top + 11);
      c.quadraticCurveTo(-12, top + 17, -20, top + 11);
      c.quadraticCurveTo(-30, top + 15, -40, top + 8);
      c.closePath();
    }, '#ffffff', '#dcecf8', { lw: 2.4, hl: false });
    // 冰柱
    ctx.fillStyle = A.c('#e8f6ff');
    [[-28, 6], [-9, 9], [14, 7], [30, 5]].forEach(([x, l]) => {
      ctx.beginPath();
      ctx.moveTo(x - 3, top + H - 1);
      ctx.lineTo(x, top + H + l + Math.sin(t * 2 + x) * 1.5);
      ctx.lineTo(x + 3, top + H - 1);
      ctx.fill();
    });
    ctx.restore();
    if (cracked > 0) {
      // 裂縫：冷光從裡面透出來
      const k = clamp(cracked, 0, 1);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const crack = (c) => {
        c.moveTo(8, top + H);
        c.lineTo(14, top + H - 18);
        c.lineTo(4, top + H - 34);
        c.lineTo(12, top + H * 0.4);
        c.lineTo(2, top + 14);
        c.moveTo(4, top + H - 34);
        c.lineTo(-10, top + H - 48);
        c.moveTo(12, top + H * 0.4);
        c.lineTo(26, top + H * 0.34);
      };
      ctx.globalAlpha = k;
      ctx.beginPath();
      crack(ctx);
      ctx.strokeStyle = 'rgba(160,230,255,0.5)';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = A.c('#dff8ff');
      ctx.lineWidth = 2.4;
      ctx.stroke();
      // 缺了一角
      A.shape(ctx, (c) => {
        c.moveTo(18, top + H);
        c.lineTo(22, top + H - 12);
        c.lineTo(32, top + H - 8);
        c.lineTo(34, top + H);
        c.closePath();
      }, '#2a3a50', null, { lw: 2.4 });
      ctx.restore();
    }
    // 鐘擺（撞木的影子）：搖得越大越亮
    if (ring > 0.3) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * ring).toFixed(3) + ')';
      ctx.lineWidth = 3;
      for (let i = 0; i < 2; i++) {
        const r = 50 + ((t * 2 + i * 0.5) % 1) * 50;
        ctx.globalAlpha = (1 - ((t * 2 + i * 0.5) % 1)) * ring;
        ctx.beginPath();
        ctx.arc(0, top + H * 0.5, r, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // 冰做的鹿角：主幹＋分枝，尖端是冰晶
  function frostAntler(ctx, far, glowK, t, p2) {
    const col = far ? '#9fcbea' : FS.antler;
    const w = far ? 15 : 19;
    const main = [[0, 0], [-10, -34], [-4, -70], [-26, -100], [-58, -118]];
    const tines = [
      [[-7, -26], [18, -48], [26, -66]],
      [[-6, -62], [16, -90], [18, -114]],
      [[-18, -92], [-10, -128], [-4, -148]],
      [[-42, -110], [-54, -146]],
      [[-58, -118], [-90, -122], [-104, -110]],
    ];
    if (glowK > 0) glow(ctx, -30, -90, 120, '170,230,255', 0.45 * glowK);
    const pathOf = (pts) => (c) => {
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2;
        const my = (pts[i][1] + pts[i + 1][1]) / 2;
        c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const L = pts[pts.length - 1];
      c.lineTo(L[0], L[1]);
    };
    tines.forEach((tn) => limb(ctx, pathOf(tn), w - 4, col));
    limb(ctx, pathOf(main), w, col);
    // 冰的芯：一條白亮的細線
    ctx.strokeStyle = far ? 'rgba(230,248,255,0.6)' : 'rgba(255,255,255,0.9)';
    ctx.lineWidth = far ? 3 : 4;
    ctx.beginPath();
    pathOf(main)(ctx);
    ctx.stroke();
    tines.forEach((tn) => {
      ctx.lineWidth = far ? 2 : 2.5;
      ctx.beginPath();
      pathOf(tn)(ctx);
      ctx.stroke();
    });
    // 高光
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -12);
    ctx.quadraticCurveTo(-9, -40, -3, -60);
    ctx.stroke();
    // 冰晶尖端
    const tips = tines.map((tn) => tn[tn.length - 1]);
    if (p2 > 0.5) tips.push([-70, -150], [30, -30]);
    tips.forEach(([x, y], i) => {
      const s = (far ? 6 : 8) + (p2 > 0.5 ? 3 : 0);
      A.shape(ctx, (c) => {
        c.moveTo(x, y - s * 1.6);
        c.lineTo(x + s * 0.7, y);
        c.lineTo(x, y + s * 0.9);
        c.lineTo(x - s * 0.7, y);
        c.closePath();
      }, far ? '#d8f0ff' : '#ffffff', '#a8d8f8', { lw: 2.2, hl: false, cel: [s * 0.3, 0] });
      if (glowK > 0 && !far) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * glowK * (0.5 + 0.5 * Math.sin(t * 9 + i))).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, s * 1.4, 0, TAU);
        ctx.fill();
      }
    });
  }

  function frostSpirit(ctx, m) {
    const t = m.t || 0;
    const st = m.state;
    const K = (m.h || 300) / 300;
    const p2 = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    const P2 = p2 > 0.5;
    const k = prog(m);
    const portrait = m.x === 0 && m.y === 0 && st === 'recover';
    const dead = !!m.dead;

    // ── 姿勢參數 ──
    let rear = 0; // 用後腳站起來
    let headDown = 0; // 低頭（角朝前）
    let headUp = 0; // 仰頭
    let crouch = 0;
    let glowK = 0; // 鹿角發光
    let tuck = 0; // 空中收腳
    let lean = 0;
    if (st === 'tollPrep') {
      rear = k * 0.95;
      headUp = k * 0.4;
    } else if (st === 'toll') {
      rear = Math.max(0, (m.stateT || 0) / 0.55 - 0.7);
      crouch = 0.3;
    } else if (st === 'spikePrep') {
      headDown = k * 0.8;
      glowK = k;
      crouch = k * 0.3;
    } else if (st === 'spikes') {
      headDown = 0.8;
      glowK = 1;
      crouch = 0.3;
    } else if (st === 'rainPrep') {
      headUp = k;
      glowK = k;
    } else if (st === 'rain') {
      headUp = 1;
      glowK = 1;
    } else if (st === 'chargePrep') {
      headDown = k;
      crouch = k * 0.35;
      lean = -0.05 * k;
    } else if (st === 'charge') {
      headDown = 1;
      lean = 0.05;
    } else if (st === 'stompPrep') {
      crouch = k * 0.6;
      headDown = 0.3;
    } else if (st === 'stompAir') {
      tuck = 1;
      headUp = 0.3;
    } else if (st === 'blizzardPrep') {
      rear = k * 0.8;
      headUp = k;
      glowK = k;
    } else if (st === 'blizzard') {
      rear = 0.25 + Math.sin(t * 3) * 0.05;
      headUp = 0.8;
      glowK = 1;
    } else if (st === 'summon') {
      headUp = 0.6;
      glowK = 0.6;
    } else if (st === 'transform') {
      rear = 0.5 * Math.sin(k * PI);
      headUp = 0.7;
      glowK = k;
    } else if (st === 'recover' && !portrait) {
      crouch = 0.15;
    }
    if (dead) {
      crouch = 0.6;
      headDown = 0.5;
      rear = 0;
    }
    const walking = (st === 'move' && Math.abs(m.vx || 0) > 8) || st === 'charge';
    const gait = st === 'charge' ? t * 16 : t * 6.5;
    const shake = st === 'transform' || st === 'blizzardPrep' ? Math.sin(t * 50) * 2 : 0;
    const bellSwing = m.bellSwing || 0;

    ctx.save();
    ctx.scale(K, K);
    if (portrait) ctx.translate(-120, 40);
    ctx.translate(shake, 0);

    // 腳下的寒氣與背後的冷光
    if (!dead) {
      glow(ctx, 0, -170, 250, P2 ? '150,210,255' : '210,240,255', (P2 ? 0.45 : 0.3) + glowK * 0.15 + Math.sin(t * 2) * 0.04);
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const q = (t * 0.35 + i / 6) % 1;
        ctx.globalAlpha = (1 - q) * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-160 + i * 64 + Math.sin(t + i) * 10, -6 - q * 26, 30 + q * 26, 10 + q * 6, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // 整隻往後仰（以後腳為軸）
    const pivotX = -80;
    ctx.translate(pivotX, 0);
    ctx.rotate(-rear * 0.36 + lean);
    ctx.translate(-pivotX, 0);
    const cy = crouch * 26 + tuck * 10;
    const bob = walking ? Math.abs(Math.sin(gait)) * -6 : Math.sin(t * 1.6) * 2;

    // ── 遠側的腳 ──
    const legY = -140 + cy + bob;
    const sw = (ph) => (walking ? Math.sin(gait + ph) : 0);
    const lift = (ph) => (walking ? Math.max(0, Math.sin(gait + ph + PI / 2)) * (st === 'charge' ? 28 : 16) : 0);
    const fLift = rear * 60 + tuck * 50;
    frostLeg(ctx, -92, legY, -100 + sw(PI) * 26, lift(PI) + tuck * 40, FS.far, FS.farS, true, 20);
    frostLeg(ctx, 74, legY - 6, 86 + sw(0) * 30 + rear * 22, lift(0) + fLift, FS.far, FS.farS, false, 20);

    // ── 靈體的霧帶：從背後、尾巴飄出去 ──
    if (!dead) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const ph = t * 1.5 + i * 1.9;
        ctx.globalAlpha = 0.35 + 0.1 * Math.sin(ph);
        ctx.strokeStyle = i % 2 ? '#ffffff' : '#bfe6ff';
        ctx.lineWidth = 12 - i * 2.2;
        ctx.beginPath();
        ctx.moveTo(-136, -150 - i * 24 + cy);
        ctx.bezierCurveTo(-190, -164 - i * 26 + Math.sin(ph) * 16 + cy, -236, -116 - i * 24 + Math.cos(ph) * 18 + cy, -282 + Math.sin(ph * 0.7) * 12, -150 - i * 30 + cy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── 尾巴 ──
    A.shape(ctx, (c) => {
      c.moveTo(-138, -196 + cy + bob);
      c.quadraticCurveTo(-176, -214 + cy + Math.sin(t * 3) * 6, -170, -178 + cy);
      c.quadraticCurveTo(-158, -170 + cy, -136, -176 + cy + bob);
      c.closePath();
    }, FS.mane, FS.maneS, { lw: 3, cel: [3, 3] });

    // ── 身體（半透明的冰，裡面凍著白角鹿）──
    const by = cy + bob;
    const body = (c) => {
      c.moveTo(-150, -176 + by);
      c.bezierCurveTo(-156, -236 + by, -50, -240 + by, 30, -232 + by);
      c.bezierCurveTo(96, -226 + by, 128, -204 + by, 122, -160 + by);
      c.bezierCurveTo(116, -116 + by, 60, -104 + by, 0, -108 + by);
      c.bezierCurveTo(-70, -108 + by, -146, -112 + by, -150, -176 + by);
      c.closePath();
    };
    ctx.save();
    ctx.globalAlpha *= 0.9;
    A.shape(ctx, body, P2 ? '#dcefff' : FS.ice, FS.iceS, { cel: [10, 10], noStroke: true });
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    // 冰裡的白角鹿
    ctx.save();
    ctx.globalAlpha *= dead ? 0.95 : 0.9;
    frozenDoe(ctx, -22, -166 + by, 1.08, t, dead);
    ctx.restore();
    // 冰的釉層：藍色的冷光蓋在鹿身上
    ctx.fillStyle = 'rgba(160,210,250,' + (dead ? 0.08 : P2 ? 0.3 : 0.22).toFixed(3) + ')';
    ctx.fillRect(-200, -300 + by, 400, 220);
    // 冰的切面
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-120, -210 + by);
    ctx.lineTo(-86, -150 + by);
    ctx.lineTo(-104, -118 + by);
    ctx.moveTo(40, -226 + by);
    ctx.lineTo(70, -170 + by);
    ctx.lineTo(56, -120 + by);
    ctx.moveTo(-86, -150 + by);
    ctx.lineTo(-40, -134 + by);
    ctx.stroke();
    // 裡面飄的雪
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 12; i++) {
      const q = (t * 0.12 + hash(i)) % 1;
      ctx.beginPath();
      ctx.arc(-140 + hash(i + 9) * 260, -110 + by - q * 130, 1.5 + hash(i + 3) * 2, 0, TAU);
      ctx.fill();
    }
    if (P2 && !dead) {
      // 第二階段：冰裂開，縫裡透出冷光
      ctx.strokeStyle = 'rgba(120,220,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-60, -236 + by);
      ctx.lineTo(-44, -196 + by);
      ctx.lineTo(-64, -170 + by);
      ctx.moveTo(-44, -196 + by);
      ctx.lineTo(-10, -186 + by);
      ctx.moveTo(90, -210 + by);
      ctx.lineTo(80, -176 + by);
      ctx.stroke();
    }
    ctx.restore();
    // 高光＋描邊
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-70, -214 + by, 40, 9, -0.12, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    body(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 背上的雪毛
    A.shape(ctx, (c) => {
      c.moveTo(-130, -212 + by);
      for (let i = 0; i <= 10; i++) {
        const x = -130 + i * 16;
        const y = -226 - Math.sin((i / 10) * PI) * 12 + by;
        c.lineTo(x + 8, y - 10 - (i % 2) * 6);
        c.lineTo(x + 16, y + 2);
      }
      c.lineTo(34, -222 + by);
      c.quadraticCurveTo(-50, -214 + by, -130, -212 + by);
      c.closePath();
    }, FS.mane, FS.maneS, { lw: 2.6, hl: false, shadeY: -218 + by });
    if (P2 && !dead) {
      // 第二階段：背脊長出冰晶
      [[-110, 30], [-80, 46], [-48, 38], [-18, 52], [12, 34]].forEach(([x, h], i) => {
        const yb = -226 - Math.sin(((x + 130) / 160) * PI) * 12 + by;
        A.shape(ctx, (c) => {
          c.moveTo(x - 10, yb + 4);
          c.lineTo(x - 3 + (i % 2 ? 4 : -4), yb - h);
          c.lineTo(x + 10, yb + 4);
          c.closePath();
        }, '#e8f8ff', '#8ac8ee', { lw: 2.6, cel: [4, 0] });
      });
    }

    // ── 近側的腳 ──
    frostLeg(ctx, -66, legY + 4, -62 + sw(0) * 26, lift(0) + tuck * 40, FS.ice, FS.iceS, true, 23);
    frostLeg(ctx, 98, legY - 2, 106 + sw(PI) * 30 + rear * 30, lift(PI) + fLift * 1.1, FS.ice, FS.iceS, false, 23);

    // ── 脖子＋頭 ──
    const na = headDown * 0.55 - headUp * 0.5; // 頭的轉角
    const hx = 158 + headDown * 34 - headUp * 18;
    const hy = -250 + by + headDown * 84 - headUp * 30;
    // 脖子
    A.shape(ctx, (c) => {
      c.moveTo(50, -226 + by);
      c.quadraticCurveTo(hx - 50, hy - 36, hx - 22, hy - 16);
      c.lineTo(hx + 4, hy + 18);
      c.quadraticCurveTo(hx - 20, hy + 70, 116, -150 + by);
      c.closePath();
    }, FS.ice, FS.iceS, { cel: [6, 6] });
    // 胸前的雪白鬃毛（鋸齒）
    A.shape(ctx, (c) => {
      c.moveTo(hx - 8, hy + 16);
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const x = lerp(hx - 8, 112, f);
        const y = lerp(hy + 16, -148 + by, f);
        c.lineTo(x + 18 + Math.sin(t * 4 + i) * 2, y + 6);
        c.lineTo(x + 4, y + 14);
      }
      c.lineTo(96, -150 + by);
      c.quadraticCurveTo(hx - 30, hy + 40, hx - 8, hy + 16);
      c.closePath();
    }, FS.mane, FS.maneS, { lw: 2.6, hl: false, cel: [4, 2] });

    // 頭（含鹿角、鐘）的座標系
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(na);
    // 遠側的鹿角
    ctx.save();
    ctx.translate(-8, -20);
    ctx.scale(0.92, 0.92);
    ctx.rotate(0.08);
    frostAntler(ctx, true, glowK, t, p2);
    ctx.restore();
    ctx.restore();

    // 鐘：掛在鹿角往後伸的那一枝上，永遠垂直往下（再加上搖晃）
    const ax0 = -100;
    const ay0 = -128;
    const bax = hx + ax0 * Math.cos(na) - ay0 * Math.sin(na);
    const bay = hy + ax0 * Math.sin(na) + ay0 * Math.cos(na);
    const swing = (Math.sin(t * 7) * 0.4 * bellSwing + Math.sin(t * 1.4) * 0.05) * (dead ? 0.2 : 1);
    ctx.save();
    ctx.translate(bax, bay);
    ctx.scale(1.3, 1.3);
    shrineBell(ctx, 0, 0, swing, t, P2 ? 1 : st === 'transform' ? k : 0, clamp(bellSwing, 0, 1.4) * (dead ? 0 : 1));
    ctx.restore();

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(na);
    // 耳朵
    A.shape(ctx, (c) => {
      c.moveTo(-14, -14);
      c.quadraticCurveTo(-44, -38, -58, -30 + Math.sin(t * 2) * 2);
      c.quadraticCurveTo(-40, -12, -14, -4);
      c.closePath();
    }, FS.ice, FS.iceS, { lw: 3, shadeY: -20 });
    A.shape(ctx, (c) => {
      c.moveTo(-18, -12);
      c.quadraticCurveTo(-38, -28, -48, -27);
      c.quadraticCurveTo(-36, -16, -18, -8);
      c.closePath();
    }, '#cfe8fb', null, { noStroke: true, hl: false });
    // 頭型：長長的鹿臉
    const head = (c) => {
      c.moveTo(-28, -2);
      c.bezierCurveTo(-30, -30, 8, -34, 30, -20);
      c.bezierCurveTo(46, -10, 62, -2, 66, 8);
      c.bezierCurveTo(68, 18, 58, 24, 44, 24);
      c.bezierCurveTo(20, 26, -4, 28, -18, 20);
      c.bezierCurveTo(-26, 14, -28, 8, -28, -2);
      c.closePath();
    };
    A.shape(ctx, head, FS.ice, FS.iceS, { cel: [5, 6], hl: [-2, -20, 14, 5] });
    // 臉上的冰紋
    ctx.strokeStyle = A.c('#a8d0ee');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -24);
    ctx.quadraticCurveTo(24, -14, 40, -10);
    ctx.stroke();
    // 鼻子
    A.ellipse(ctx, 60, 8, 7, 6, '#4a5a74', null, { lw: 2.2, hl: [58, 6, 2, 1.5] });
    // 嘴與寒氣
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const open = st === 'tollPrep' || st === 'blizzardPrep' || st === 'blizzard' || st === 'rain' || st === 'transform';
    if (open && !dead) {
      ctx.moveTo(34, 18);
      ctx.quadraticCurveTo(48, 30, 62, 18);
      ctx.stroke();
      A.shape(ctx, (c) => {
        c.moveTo(36, 18);
        c.quadraticCurveTo(48, 28, 60, 18);
        c.quadraticCurveTo(48, 22, 36, 18);
        c.closePath();
      }, '#2a3a5a', null, { lw: 2 });
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const q = (t * 1.6 + i / 4) % 1;
        ctx.globalAlpha = (1 - q) * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(66 + q * 40, 20 + Math.sin(i + t) * 4 - q * 10, 5 + q * 10, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    } else {
      ctx.moveTo(36, 18);
      ctx.quadraticCurveTo(48, 22, 58, 18);
      ctx.stroke();
    }
    // 眼睛：冷冷發光的杏眼，眉骨壓低（很兇）
    const ex = 10;
    const ey = -8;
    const angry = !dead && (st !== 'move' || P2);
    if (dead) {
      A.eye(ctx, ex, ey, 6, 5, 'closed');
    } else if (m.hurtFlash > 0.05) {
      A.eye(ctx, ex, ey, 7, 8, 'hurt');
    } else {
      const eyeGlow = P2 ? '120,220,255' : '190,235,255';
      glow(ctx, ex + 2, ey, 22 + glowK * 12, eyeGlow, 0.55 + glowK * 0.3);
      const eyeP = (c) => {
        c.moveTo(ex - 11, ey + 2);
        c.quadraticCurveTo(ex - 2, ey - 9, ex + 12, ey - 4);
        c.quadraticCurveTo(ex + 4, ey + 7, ex - 11, ey + 2);
        c.closePath();
      };
      A.shape(ctx, eyeP, '#1e2e4e', null, { lw: 2.6, hl: false });
      ctx.fillStyle = P2 ? '#8ff0ff' : '#dff8ff';
      ctx.beginPath();
      ctx.ellipse(ex + 2, ey - 1, 4, 5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 3, ey - 2.5, 1.8, 0, TAU);
      ctx.fill();
      if (m.blink && !angry) A.shape(ctx, eyeP, FS.ice, null, { lw: 2.6, hl: false });
      // 眉骨
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(ex - 14, ey - 12 + (angry ? -3 : 0));
      ctx.lineTo(ex + 14, ey - 7 + (angry ? 3 : 0));
      ctx.stroke();
    }
    // 近側的鹿角
    ctx.save();
    ctx.translate(4, -22);
    frostAntler(ctx, false, glowK, t, p2);
    ctx.restore();
    ctx.restore();

    // 身邊飄的雪花
    if (!dead) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 10; i++) {
        const a = t * (0.3 + hash(i) * 0.3) + i * 0.63;
        const r = 150 + hash(i + 4) * 70;
        const x = Math.cos(a) * r;
        const y = -170 + Math.sin(a) * r * 0.55;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 3 + i);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t + i);
        ctx.beginPath();
        starPath(ctx, 0, 0, 5, 1.6, 6);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ═════════════════════════ 時間 ═════════════════════════
  const TS = {
    stone: '#b3a797', stoneS: '#8e8275', stoneD: '#6e6358', mane: '#9c9083', maneS: '#7a6f64',
    gold: '#f0cf7a', goldS: '#c9953e', void: '#1c1640', void2: '#3a2878',
  };
  const NUM = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  // 星空＋星沙（畫在已經 clip 好的區域裡）
  function starVoid(ctx, t, x0, y0, w, h, rich) {
    const g = ctx.createRadialGradient(x0 + w * 0.55, y0 + h * 0.45, 10, x0 + w * 0.5, y0 + h * 0.5, Math.max(w, h) * 0.7);
    g.addColorStop(0, rich ? '#5a3aa8' : '#3a2a7a');
    g.addColorStop(0.5, rich ? '#2a1a60' : '#221a50');
    g.addColorStop(1, '#0e0a24');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, w, h);
    if (rich) {
      // 星雲的漩渦
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = t * 0.2 + i * 2.1;
        glow(ctx, x0 + w * 0.5 + Math.cos(a) * w * 0.2, y0 + h * 0.5 + Math.sin(a) * h * 0.2, w * 0.35, i === 1 ? '255,120,200' : '120,140,255', 0.22);
      }
      ctx.restore();
    }
    const n = rich ? 70 : 40;
    for (let i = 0; i < n; i++) {
      const x = x0 + hash(i) * w;
      const y = y0 + hash(i + 50) * h;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + hash(i + 7) * 2) + i));
      ctx.fillStyle = 'rgba(255,250,230,' + tw.toFixed(3) + ')';
      const s = 0.8 + hash(i + 20) * (rich ? 2.2 : 1.6);
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
      if (hash(i + 30) > 0.9) {
        ctx.fillRect(x - s * 2.5, y - 0.5, s * 5, 1);
        ctx.fillRect(x - 0.5, y - s * 2.5, 1, s * 5);
      }
    }
    // 流動的星沙（往下流）
    ctx.fillStyle = '#ffe9a0';
    for (let i = 0; i < 46; i++) {
      const q = (t * (0.18 + hash(i + 80) * 0.12) + hash(i + 90)) % 1;
      const x = x0 + (hash(i + 70) * 0.8 + 0.1) * w + Math.sin(q * 6 + i) * 8;
      const y = y0 + q * h;
      ctx.globalAlpha = Math.sin(q * PI) * 0.9;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + hash(i + 60) * 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 四根時針：len、樣式
  function clockHand(ctx, kind, ang, len, glowK) {
    ctx.save();
    ctx.rotate(ang);
    if (glowK > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,230,150,' + (0.35 * glowK).toFixed(3) + ')';
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.restore();
    }
    if (kind === 'hour') {
      // 粗短、黑桃形的針尖
      A.shape(ctx, (c) => {
        c.moveTo(-26, -8);
        c.lineTo(len - 50, -8);
        c.bezierCurveTo(len - 60, -34, len - 14, -30, len, 0);
        c.bezierCurveTo(len - 14, 30, len - 60, 34, len - 50, 8);
        c.lineTo(-26, 8);
        c.closePath();
      }, TS.gold, TS.goldS, { cel: [0, 4], lw: 3.5, hl: [len * 0.4, -3, 30, 2] });
      A.ellipse(ctx, len - 34, 0, 8, 8, TS.void2, null, { lw: 2.4, hl: false });
    } else if (kind === 'minute') {
      A.shape(ctx, (c) => {
        c.moveTo(-30, -6);
        c.lineTo(len - 44, -5);
        c.lineTo(len - 50, -18);
        c.lineTo(len, 0);
        c.lineTo(len - 50, 18);
        c.lineTo(len - 44, 5);
        c.lineTo(-30, 6);
        c.closePath();
      }, TS.gold, TS.goldS, { cel: [0, 3], lw: 3.2, hl: [len * 0.4, -2, 40, 1.5] });
      A.ellipse(ctx, len * 0.5, 0, 10, 10, '#fff3c0', TS.goldS, { lw: 2.6, hl: false });
    } else if (kind === 'second') {
      A.shape(ctx, (c) => {
        c.moveTo(-50, -3);
        c.lineTo(len, -1.5);
        c.lineTo(len, 1.5);
        c.lineTo(-50, 3);
        c.closePath();
      }, '#e8605a', '#b83a3a', { lw: 2.6, hl: false });
      A.ellipse(ctx, -50, 0, 12, 12, '#e8605a', '#b83a3a', { lw: 2.6, hl: false });
      A.ellipse(ctx, len - 20, 0, 6, 6, '#ffd0c0', null, { lw: 2.2, hl: false });
    } else {
      // 命運之針：尖端是一彎新月
      A.shape(ctx, (c) => {
        c.moveTo(-20, -6);
        c.lineTo(len - 36, -5);
        c.lineTo(len - 36, 5);
        c.lineTo(-20, 6);
        c.closePath();
      }, '#d8c8ff', '#9a84d8', { cel: [0, 3], lw: 3, hl: false });
      A.shape(ctx, (c) => {
        c.arc(len - 16, 0, 22, -PI * 0.75, PI * 0.75);
        c.arc(len - 26, 0, 18, PI * 0.6, -PI * 0.6, true);
        c.closePath();
      }, '#fff3c0', TS.goldS, { lw: 3, cel: [3, 0], hl: false });
    }
    ctx.restore();
  }

  function timeHalo(ctx, t, p2, glowK, spin, flip) {
    const R = 172;
    const P2 = p2 > 0.5;
    glow(ctx, 0, 0, R * 1.45, P2 ? '210,150,255' : '255,225,150', 0.35 + glowK * 0.25);
    if (P2) {
      // 第二階段：錶盤後面多一圈大齒輪
      A.shape(ctx, (c) => gearPath(c, 0, 0, R + 44, 36, -t * 0.08 - spin * 0.2), '#d8b060', '#a8803a', { lw: 3, hl: false });
    }
    // 錶面
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R - 14, 0, TAU);
    ctx.clip();
    ctx.globalAlpha *= 0.88;
    starVoid(ctx, t, -R, -R, R * 2, R * 2, P2);
    ctx.globalAlpha = 1;
    // 錶面裡慢慢轉的齒輪
    ctx.globalAlpha = P2 ? 0.55 : 0.28;
    ctx.fillStyle = A.c('#e8c878');
    ctx.beginPath();
    gearPath(ctx, -70, 60, 50, 10, t * 0.3 + spin);
    ctx.fill('evenodd');
    ctx.beginPath();
    gearPath(ctx, 10, 104, 34, 8, -t * 0.45 - spin * 1.5);
    ctx.fill('evenodd');
    ctx.beginPath();
    gearPath(ctx, 84, 40, 40, 9, t * 0.38 + spin);
    ctx.fill('evenodd');
    if (P2) {
      ctx.beginPath();
      gearPath(ctx, -40, -90, 44, 9, -t * 0.5);
      ctx.fill('evenodd');
      ctx.beginPath();
      gearPath(ctx, 80, -70, 28, 7, t * 0.7);
      ctx.fill('evenodd');
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // 外圈（金色的錶框）
    A.shape(ctx, (c) => {
      c.arc(0, 0, R, 0, TAU);
      c.moveTo(R - 18, 0);
      c.arc(0, 0, R - 18, 0, TAU, true);
    }, P2 ? '#f4d890' : TS.gold, TS.goldS, { cel: [0, 5], lw: 3.5, hl: false });
    // 刻度與羅馬數字
    ctx.save();
    ctx.font = 'bold 19px ' + A.NUMFONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 60; i++) {
      const a = -PI / 2 + (i / 60) * TAU;
      const big = i % 5 === 0;
      ctx.strokeStyle = A.c(big ? '#fff3c0' : '#c8b88a');
      ctx.lineWidth = big ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (R - 22), Math.sin(a) * (R - 22));
      ctx.lineTo(Math.cos(a) * (R - (big ? 34 : 28)), Math.sin(a) * (R - (big ? 34 : 28)));
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = -PI / 2 + (i / 12) * TAU;
      // 整隻被 dir 翻過來的時候，數字要翻回來（不然錶盤是反的）
      const x = Math.cos(a) * (R - 52) * (flip || 1);
      const y = Math.sin(a) * (R - 52);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(flip || 1, 1);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(30,20,60,0.8)';
      ctx.strokeText(NUM[i], 0, 0);
      ctx.fillStyle = A.c(P2 ? '#ffe0f4' : '#fff3c0');
      ctx.fillText(NUM[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
    // 外面一圈轉動的符文（第二階段更多）
    ctx.save();
    ctx.rotate(t * 0.12 + spin * 0.3);
    const n = P2 ? 24 : 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const r = R + 16 + (i % 2) * 6;
      ctx.fillStyle = A.c(i % 3 ? '#fff3c0' : P2 ? '#ff9ad8' : '#c8b0ff');
      ctx.save();
      ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
      ctx.rotate(a);
      ctx.beginPath();
      starPath(ctx, 0, 0, 7, 2.5, 4);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }


  function timeItself(ctx, m) {
    const t = m.t || 0;
    const st = m.state;
    const K = (m.h || 380) / 380;
    const p2 = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    const P2 = p2 > 0.5;
    const k = prog(m);
    const portrait = m.x === 0 && m.y === 0 && st === 'recover';
    const dead = !!m.dead;
    const bob = Math.sin(t * 1.2) * 6;

    // ── 姿勢 ──
    let glowK = 0;
    let eyeK = 0;
    let spin = 0;
    let shake = 0;
    const idleA = [-PI * 0.78 + Math.sin(t * 0.8) * 0.08, -PI * 0.2 + Math.sin(t * 0.9 + 1) * 0.08, Math.floor(t * 2) * (TAU / 60), PI * 0.18 + Math.sin(t * 0.7) * 0.06];
    let A4 = idleA.slice();
    let hide = -1; // 被預警畫走的那根針
    const dirL = m.dir || 1;
    // 世界座標 → 本地（已經被 dir、K 縮放過）
    const loc = (wx) => ((wx - (m.x || 0)) * dirL) / K;
    const toGround = (wx) => Math.atan2(228 + bob, loc(wx));
    if (st === 'sweepPrep') {
      const side = (m.sweepFrom || 1) * dirL;
      const a = Math.atan2(228, side * 640);
      A4[1] = lerp(idleA[1], a, k);
      glowK = k;
      eyeK = k;
    } else if (st === 'sweep') {
      hide = 1;
      glowK = 0.6;
      eyeK = 1;
    } else if (st === 'stab') {
      const tgt = m.stabX != null ? toGround(m.stabX) : PI / 2;
      const T = m.stateT0 || 0.8;
      const left = m.stateT || 0;
      const raise = left > 0.25 ? Math.min(1, (T - left) / Math.max(0.2, T - 0.25)) : 0;
      A4[0] = left > 0.25 ? lerp(idleA[0], -PI * 0.62, raise) : tgt;
      eyeK = 0.8;
    } else if (st === 'stopPrep' || st === 'stop') {
      const kk = st === 'stop' ? 1 : k;
      for (let i = 0; i < 4; i++) A4[i] = lerp(idleA[i], -PI / 2 + (i - 1.5) * 0.06, kk);
      glowK = kk;
      eyeK = kk;
    } else if (st === 'rewindPrep') {
      A4 = idleA.map((a, i) => a - t * (5 + i * 2));
      glowK = 0.7;
      eyeK = 0.7;
      spin = -t * 4;
    } else if (st === 'clockworkPrep' || st === 'clockwork') {
      A4 = idleA.map((a, i) => a + t * (4 + i * 3));
      glowK = 1;
      eyeK = 1;
      spin = t * 3;
    } else if (st === 'echo') {
      A4 = [-PI * 0.95, -PI * 0.05, PI * 0.1 + k, PI * 0.9];
      glowK = 0.6;
      eyeK = 0.6;
    } else if (st === 'transform') {
      shake = Math.sin(t * 60) * 3 * (1 - k * 0.5);
      A4 = idleA.map((a, i) => a + Math.sin(t * 30 + i) * 0.3);
      eyeK = 1;
      glowK = k;
    }
    if (dead) A4 = [PI * 0.55, PI * 0.45, PI * 0.6, PI * 0.4];

    ctx.save();
    ctx.scale(K, K);
    if (portrait) ctx.translate(-50, 120);
    ctx.translate(shake, bob);

    // ── 錶盤光環 ──
    ctx.save();
    ctx.translate(0, -228);
    timeHalo(ctx, t, p2, glowK, spin, dirL);
    // 四根時針（在石獅後面，伸得比身體長）
    const lens = [170, 236, 250, 200];
    const kinds = ['hour', 'minute', 'second', 'fate'];
    for (let i = 3; i >= 0; i--) if (i !== hide) clockHand(ctx, kinds[i], A4[i], lens[i], glowK * (i === 2 ? 0.4 : 1));
    // 中心的軸
    A.ellipse(ctx, 0, 0, 20, 20, TS.gold, TS.goldS, { lw: 3, hl: false });
    ctx.restore();

    // ── 石獅輪廓 ──
    const hx = 50;
    const hy = -236;
    const silhouette = (c) => {
      c.ellipse(-46, -118, 98, 74, -0.1, 0, TAU);
      c.moveTo(110, -130);
      c.ellipse(40, -130, 70, 86, 0, 0, TAU);
      c.moveTo(118, -50);
      c.ellipse(80, -50, 36, 18, 0, 0, TAU);
      c.moveTo(70, -48);
      c.ellipse(36, -48, 34, 17, 0, 0, TAU);
      c.moveTo(-60, -46);
      c.ellipse(-96, -46, 36, 17, 0, 0, TAU);
      maneStar(c, hx - 6, hy - 4, 1);
      c.moveTo(hx + 58, hy);
      c.ellipse(hx, hy, 58, 52, 0, 0, TAU);
      c.moveTo(hx + 72, hy + 22);
      c.ellipse(hx + 42, hy + 22, 30, 22, 0, 0, TAU);
    };
    function maneStar(c, x, y, s) {
      const n = 16;
      for (let i = 0; i <= n * 2; i++) {
        const a = (i / (n * 2)) * TAU;
        const r = (i % 2 ? 80 : 100 + hash(Math.floor(i / 2)) * 14) * s;
        i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.closePath();
    }
    // 尾巴（捲起來，尾端是一簇鬃）
    const tailW = Math.sin(t * 1.3) * 6;
    limb(ctx, (c) => {
      c.moveTo(-126, -100);
      c.bezierCurveTo(-176, -110, -178 + tailW, -170, -150 + tailW, -196);
    }, 20, P2 ? '#3a2a78' : TS.stone);
    A.shape(ctx, (c) => starPath(c, -148 + tailW, -204, 22, 12, 7), P2 ? '#4a3a90' : TS.mane, P2 ? '#2a1a5a' : TS.maneS, { lw: 3, cel: [3, 3], hl: false });

    if (!P2) {
      // ─ 第一階段：石殼（上面的破洞露出星沙）─
      const stoneOpts = (hl) => ({ cel: [7, 7], lw: 3.5, hl });
      // 後腳
      A.ellipse(ctx, -96, -46, 36, 17, TS.stone, TS.stoneS, stoneOpts(false));
      // 身體（後半）
      A.ellipse(ctx, -46, -118, 98, 74, TS.stone, TS.stoneS, { cel: [7, 7], lw: 3.5, rot: -0.1, hl: [-80, -160, 26, 10] });
      // 胸
      A.ellipse(ctx, 40, -130, 70, 86, TS.stone, TS.stoneS, stoneOpts([20, -180, 16, 10]));
      // 前腳
      A.shape(ctx, (c) => A.roundRect(c, 20, -120, 34, 76, 14), TS.stoneS, TS.stoneD, { lw: 3.2, shadeY: -70 });
      A.shape(ctx, (c) => A.roundRect(c, 62, -118, 36, 74, 14), TS.stone, TS.stoneS, { lw: 3.2, cel: [4, 0] });
      A.ellipse(ctx, 36, -48, 34, 17, TS.stoneS, TS.stoneD, stoneOpts(false));
      A.ellipse(ctx, 80, -50, 36, 18, TS.stone, TS.stoneS, stoneOpts(false));
      // 腳趾刻痕
      ctx.strokeStyle = A.c(TS.stoneD);
      ctx.lineWidth = 2.4;
      [80, 92, 104].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, -56);
        ctx.lineTo(x + 2, -40);
        ctx.stroke();
      });
      // 石殼上的破洞：裡面是流動的星沙
      const holes = [
        [[8, -168], [34, -186], [62, -170], [58, -130], [28, -112], [4, -134]],
        [[-92, -150], [-60, -170], [-30, -150], [-44, -112], [-80, -104]],
        [[-6, -300], [16, -312], [30, -290], [12, -276]],
      ];
      const crackGrow = clamp(p2 * 2, 0, 1);
      holes.forEach((hpts, i) => {
        const s = i === 2 ? 1 : 1 + crackGrow * 0.3;
        const cx0 = hpts.reduce((a, p) => a + p[0], 0) / hpts.length;
        const cy0 = hpts.reduce((a, p) => a + p[1], 0) / hpts.length;
        const path = (c) => {
          hpts.forEach((p, j) => {
            const x = cx0 + (p[0] - cx0) * s;
            const y = cy0 + (p[1] - cy0) * s;
            j ? c.lineTo(x, y) : c.moveTo(x, y);
          });
          c.closePath();
        };
        if (i === 2) return; // 鬃毛上的洞畫在鬃毛之後
        ctx.save();
        ctx.beginPath();
        path(ctx);
        ctx.clip();
        starVoid(ctx, t + i, cx0 - 60, cy0 - 70, 120, 140, false);
        ctx.restore();
        ctx.beginPath();
        path(ctx);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 3.4;
        ctx.lineJoin = 'round';
        ctx.stroke();
      });
      // 裂縫（變身時越來越亮）
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-120, -90);
      ctx.lineTo(-96, -104);
      ctx.lineTo(-92, -150);
      ctx.moveTo(62, -170);
      ctx.lineTo(96, -176);
      ctx.lineTo(104, -150);
      ctx.moveTo(28, -112);
      ctx.lineTo(24, -84);
      ctx.moveTo(-30, -150);
      ctx.lineTo(-4, -134);
      if (crackGrow > 0) {
        ctx.moveTo(-140, -130);
        ctx.lineTo(-100, -176);
        ctx.lineTo(-40, -186);
        ctx.moveTo(90, -210);
        ctx.lineTo(60, -250);
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.stroke();
      if (crackGrow > 0) {
        ctx.strokeStyle = 'rgba(230,200,255,' + crackGrow.toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
      // 鬃毛
      A.shape(ctx, (c) => maneStar(c, hx - 6, hy - 4, 1), TS.mane, TS.maneS, { cel: [8, 8], lw: 3.5, hl: [hx - 50, hy - 50, 18, 8] });
      // 鬃毛的刻紋
      ctx.strokeStyle = A.c(TS.maneS);
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + 0.2;
        ctx.beginPath();
        ctx.moveTo(hx - 6 + Math.cos(a) * 62, hy - 4 + Math.sin(a) * 62);
        ctx.lineTo(hx - 6 + Math.cos(a) * 84, hy - 4 + Math.sin(a) * 84);
        ctx.stroke();
      }
      // 鬃毛上的破洞
      const h3 = holes[2];
      ctx.save();
      ctx.beginPath();
      h3.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.clip();
      starVoid(ctx, t + 5, -30, -330, 80, 80, false);
      ctx.restore();
      ctx.beginPath();
      h3.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.stroke();
      // 苔蘚與小花（歷代守葉獸的石像，放了很久）
      A.ellipse(ctx, -100, -178, 18, 7, '#8aa86a', '#6a8a4a', { lw: 2.4, hl: false });
      A.ellipse(ctx, 96, -68, 12, 5, '#8aa86a', '#6a8a4a', { lw: 2.2, hl: false });
    } else {
      // ─ 第二階段：石殼碎了，整個輪廓都是星空與齒輪 ─
      ctx.save();
      glow(ctx, 0, -160, 260, '170,120,255', 0.35 + Math.sin(t * 2) * 0.05);
      ctx.beginPath();
      silhouette(ctx);
      ctx.save();
      ctx.clip();
      starVoid(ctx, t, -180, -360, 360, 340, true);
      // 裡面轉動的齒輪
      ctx.globalAlpha = 0.6;
      [[-60, -120, 56, 12, 0.4], [10, -150, 38, 9, -0.6], [50, -80, 30, 8, 0.8], [-110, -70, 30, 8, -0.5], [40, -250, 44, 10, 0.3]].forEach(([x, y, r, n, s]) => {
        ctx.fillStyle = '#e8c070';
        ctx.beginPath();
        gearPath(ctx, x, y, r, n, t * s);
        ctx.fill('evenodd');
      });
      ctx.globalAlpha = 1;
      ctx.restore();
      // 發光的輪廓
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(210,170,255,0.55)';
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = A.c('#e8d8ff');
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
      // 還黏在臉上的一半石頭面具
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(hx - 70, hy - 70);
      ctx.lineTo(hx + 20, hy - 76);
      ctx.lineTo(hx + 8, hy - 40);
      ctx.lineTo(hx + 30, hy - 14);
      ctx.lineTo(hx + 4, hy + 10);
      ctx.lineTo(hx + 24, hy + 40);
      ctx.lineTo(hx - 70, hy + 60);
      ctx.closePath();
      ctx.clip();
      A.ellipse(ctx, hx, hy, 58, 52, TS.stone, TS.stoneS, { cel: [6, 6], lw: 3.5, hl: [hx - 24, hy - 26, 12, 6] });
      ctx.restore();
      // 面具的破邊
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 12, hy - 50);
      ctx.lineTo(hx + 8, hy - 40);
      ctx.lineTo(hx + 30, hy - 14);
      ctx.lineTo(hx + 4, hy + 10);
      ctx.lineTo(hx + 24, hy + 40);
      ctx.stroke();
      // 周圍漂浮的石殼碎片
      for (let i = 0; i < 9; i++) {
        const a = t * (0.25 + hash(i) * 0.2) + i * 0.7;
        const r = 170 + hash(i + 3) * 60;
        const x = Math.cos(a) * r;
        const y = -170 + Math.sin(a) * r * 0.7;
        const s = 10 + hash(i + 5) * 12;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * (hash(i + 8) - 0.5) * 2 + i);
        A.shape(ctx, (c) => {
          c.moveTo(-s, -s * 0.4);
          c.lineTo(-s * 0.2, -s);
          c.lineTo(s, -s * 0.3);
          c.lineTo(s * 0.5, s * 0.8);
          c.lineTo(-s * 0.7, s * 0.6);
          c.closePath();
        }, TS.stone, TS.stoneS, { cel: [3, 3], lw: 2.6, hl: false });
        ctx.restore();
      }
    }

    // ── 頭 ──
    if (!P2) {
      A.ellipse(ctx, hx, hy, 58, 52, TS.stone, TS.stoneS, { cel: [6, 6], lw: 3.5, hl: [hx - 24, hy - 26, 12, 6] });
      // 耳朵
      A.ellipse(ctx, hx - 34, hy - 44, 14, 13, TS.stone, TS.stoneS, { lw: 3, hl: false });
      A.ellipse(ctx, hx + 14, hy - 52, 14, 13, TS.stone, TS.stoneS, { lw: 3, hl: false });
      A.ellipse(ctx, hx + 14, hy - 51, 7, 6, TS.stoneD, null, { noStroke: true, hl: false });
    }
    // 額頭的星楓葉刻印（歷代守葉獸的印記）
    ctx.save();
    A.shape(ctx, (c) => A.mapleLeafPath(c, hx + 2, hy - 30, 13), P2 ? '#ffe9a0' : '#d8c8a8', P2 ? '#f0b050' : '#a89878', { lw: 2.6, hl: false, cel: [2, 2] });
    if (P2 || glowK > 0.3) glow(ctx, hx + 2, hy - 30, 36, '255,230,150', 0.5);
    ctx.restore();
    // 嘴邊
    A.ellipse(ctx, hx + 42, hy + 22, 30, 22, P2 ? '#8e8275' : TS.stone, TS.stoneS, { lw: 3.2, cel: [4, 4], hl: false });
    A.shape(ctx, (c) => {
      c.moveTo(hx + 50, hy + 6);
      c.quadraticCurveTo(hx + 62, hy + 2, hx + 72, hy + 8);
      c.quadraticCurveTo(hx + 66, hy + 18, hx + 58, hy + 16);
      c.closePath();
    }, '#5a4e46', null, { lw: 2.4, hl: false });
    // 嘴：預警時張開（露出裡面的星空）
    const roar = !dead && (eyeK > 0.6 || st === 'transform');
    if (roar) {
      A.shape(ctx, (c) => {
        c.moveTo(hx + 30, hy + 28);
        c.quadraticCurveTo(hx + 52, hy + 20, hx + 70, hy + 26);
        c.quadraticCurveTo(hx + 60, hy + 50, hx + 34, hy + 40);
        c.closePath();
      }, TS.void, null, { lw: 2.8 });
      ctx.fillStyle = '#ffffff';
      [[hx + 38, hy + 28], [hx + 62, hy + 26]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x, y + 8);
        ctx.lineTo(x + 4, y);
        ctx.fill();
      });
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 34, hy + 34);
      ctx.quadraticCurveTo(hx + 50, hy + 28, hx + 68, hy + 30);
      ctx.stroke();
    }
    // 眼睛：石頭裡透出來的金色光（很兇的細長眼）
    const eyes = [[hx + 4, hy - 8, 1], [hx + 34, hy - 10, 0.85]];
    eyes.forEach(([x, y, s]) => {
      if (dead) {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 9 * s, y);
        ctx.lineTo(x + 9 * s, y);
        ctx.stroke();
        return;
      }
      const col = P2 ? '220,190,255' : '255,225,140';
      glow(ctx, x, y, (26 + eyeK * 20) * s, col, 0.6 + eyeK * 0.35);
      A.shape(ctx, (c) => {
        c.moveTo(x - 12 * s, y + 2);
        c.quadraticCurveTo(x - 2 * s, y - 10 * s, x + 12 * s, y - 4 * s);
        c.quadraticCurveTo(x + 4 * s, y + 7 * s, x - 12 * s, y + 2);
        c.closePath();
      }, m.hurtFlash > 0.05 ? '#ffffff' : P2 ? '#f4ecff' : '#fff3c0', null, { lw: 2.6, hl: false });
      ctx.fillStyle = P2 ? '#6a3ad0' : '#c07a1a';
      ctx.beginPath();
      ctx.ellipse(x + 2 * s, y - 1, 2.2 * s, 5 * s, 0, 0, TAU);
      ctx.fill();
      // 壓低的眉骨
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 15 * s, y - 14 * s);
      ctx.lineTo(x + 14 * s, y - 8 * s);
      ctx.stroke();
    });

    // 身體下方流出來的星沙（懸空）
    if (!dead) {
      ctx.fillStyle = '#ffe9a0';
      for (let i = 0; i < 18; i++) {
        const q = (t * 0.7 + hash(i + 11)) % 1;
        ctx.globalAlpha = (1 - q) * 0.8;
        ctx.beginPath();
        ctx.arc(-40 + hash(i) * 100 + Math.sin(q * 5 + i) * 6, -30 + q * 44, 1.5 + hash(i + 2) * 1.5, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  Object.assign(A.MONSTER_DRAW, { frostSpirit, timeItself });
})();
