// 第二、三章的怪物、Boss 與投射物（註冊到 A.MONSTER_DRAW／A.PROJ_DRAW／A.ZONE_DRAW）。
// 風格與 monsters.js 相同：平塗、深棕描邊、月牙陰影、Q 版大眼，每種怪只有一個招牌特徵。
// 原點在腳底中央、面向右（+x）。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const PI = Math.PI;
  const TAU = PI * 2;

  // ───────────── 共用小工具 ─────────────
  function eyeKind(m) {
    return m.dead ? 'x' : m.hurtT > 0 ? 'hurt' : m.angry ? 'angry' : m.blink ? 'closed' : 'normal';
  }
  function bossEyeKind(m, angry) {
    return m.dead ? 'x' : m.hurtFlash > 0.05 ? 'hurt' : angry ? 'angry' : m.blink ? 'closed' : 'normal';
  }
  function faceEyes(ctx, x, y, gap, rx, ry, m, kind) {
    kind = kind || eyeKind(m);
    A.eye(ctx, x, y, rx, ry, kind, 0.8);
    A.eye(ctx, x + gap, y - 0.5, rx * 0.92, ry * 0.95, kind, 0.8);
  }
  // 眼柄上的白眼球（螃蟹用）
  function stalkEye(ctx, x, y, r, m, kind) {
    kind = kind || eyeKind(m);
    A.ellipse(ctx, x, y, r, r, '#ffffff', null, { lw: 2.2, hl: false });
    if (kind === 'x') A.eye(ctx, x, y, r * 0.45, r * 0.45, 'x');
    else if (kind === 'closed') A.eye(ctx, x, y + 1, r * 0.55, r * 0.4, 'closed');
    else if (kind === 'hurt') A.eye(ctx, x, y, r * 0.5, r * 0.62, 'hurt');
    else A.eye(ctx, x + r * 0.2, y + r * 0.1, r * 0.52, r * 0.64, 'normal', 0);
  }
  function smallMouth(ctx, x, y, open, k) {
    k = k || 1;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (open) {
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 3 * k, 3.5 * k, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y - 1, 3 * k, 0.2 * PI, 0.8 * PI);
      ctx.stroke();
    }
  }
  // 帶描邊的粗線（手腳、觸手、尾巴）
  function limb(ctx, path, w, col) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = Math.max(1, w - 3);
    ctx.stroke();
  }
  function glow(ctx, x, y, r, rgb, a) {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function walking(m) {
    return m.onGround && Math.abs(m.vx || 0) > 5;
  }
  function brows(ctx, x1, y1, x2, y2, gap, w) {
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w || 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.moveTo(x1 + gap, y2);
    ctx.lineTo(x2 + gap, y1);
    ctx.stroke();
  }
  function jumpSquash(m) {
    let sy = 1;
    if (!m.onGround) sy = m.vy < 0 ? 1.08 : 0.97;
    else if (m.landT > 0) sy = 0.85 + (1 - m.landT / 0.15) * 0.15;
    if (m.attackT > 0 && m.attackPhase === 'wind') sy = Math.min(sy, 0.92);
    return sy;
  }
  function star(ctx, x, y) {
    A.shape(ctx, (c) => {
      for (let j = 0; j < 10; j++) {
        const r = j % 2 ? 2.4 : 6;
        const aa = (j / 10) * TAU - PI / 2;
        j ? c.lineTo(x + Math.cos(aa) * r, y + Math.sin(aa) * r) : c.moveTo(x + Math.cos(aa) * r, y + Math.sin(aa) * r);
      }
      c.closePath();
    }, '#ffe066', null, { lw: 1.8 });
  }
  // 火焰（淚滴形，尖端朝上）
  function flame(ctx, x, y, r, t, seed) {
    const f = Math.sin(t * 18 + (seed || 0)) * 0.15;
    glow(ctx, x, y - r * 0.4, r * 3, '255,170,60', 0.45);
    A.shape(ctx, (c) => {
      c.moveTo(x + f * r, y - r * 2.1);
      c.bezierCurveTo(x + r * 0.9, y - r * 1.1, x + r, y + r * 0.5, x, y + r * 0.8);
      c.bezierCurveTo(x - r, y + r * 0.5, x - r * 0.9, y - r * 1.0, x + f * r, y - r * 2.1);
      c.closePath();
    }, '#ff7a2a', '#e8521e', { lw: 2, shadeY: y + r * 0.2 });
    A.shape(ctx, (c) => {
      c.moveTo(x, y - r * 1.1);
      c.quadraticCurveTo(x + r * 0.6, y, x, y + r * 0.45);
      c.quadraticCurveTo(x - r * 0.6, y, x, y - r * 1.1);
      c.closePath();
    }, '#ffe46a', null, { noStroke: true });
  }
  // 螯：掌 + 上下兩根鉗指，open 0~1
  function claw(ctx, x, y, r, open, col, sh, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    const lw = r > 16 ? 3 : 2.4;
    const finger = (flip, len, w, ang) => {
      ctx.save();
      ctx.translate(r * 0.5, flip * r * 0.12);
      ctx.scale(1, flip);
      ctx.rotate(ang);
      A.shape(ctx, (c) => {
        c.moveTo(-r * 0.1, -w);
        c.quadraticCurveTo(len * 0.75, -w * 1.25, len, w * 0.15);
        c.quadraticCurveTo(len * 0.55, w * 0.1, -r * 0.1, w * 0.7);
        c.closePath();
      }, col, flip > 0 ? null : sh, { lw, shadeY: w * 0.2 });
      ctx.restore();
    };
    finger(1, r * 1.2, r * 0.46, 0.1 - open * 0.55);
    finger(-1, r * 1.45, r * 0.56, 0.02 - open * 0.65);
    A.ellipse(ctx, 0, 0, r * 0.9, r * 0.74, col, sh, { cel: [r * 0.18, r * 0.18], hl: [-r * 0.3, -r * 0.3, r * 0.25, r * 0.14] });
    ctx.restore();
  }

  // ═════════════ 第二章：潮風海岬 ═════════════

  // ── 蟹系：沙粒蟹 → 貝甲蟹 → 珊瑚蟹 ──
  // 特徵：沙粒蟹身上有沙粒斑點、貝甲蟹背著扇貝殼（會躲進去）、珊瑚蟹背上長珊瑚、一隻大螯。
  function crab(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    const k = [1, 1.3, 1.6][s - 1];
    const pal = [
      ['#f4cf94', '#dcaa66'],
      ['#f58a5c', '#d0643a'],
      ['#e8574a', '#b83a32'],
    ][s - 1];
    const hide = s === 2 && m.shellT > 0;
    const walk = walking(m);
    const bob = walk ? Math.abs(Math.sin(t * 16)) * 1.5 : Math.sin(t * 3) * 0.6;
    const by = -12 * k - bob; // 身體中心
    const brx = 17 * k;
    const bry = 10.5 * k;

    // 扇貝殼：鉸合點在下方的扇形
    const scallop = (cx, cy, R, rot) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      const path = (c) => {
        c.moveTo(-R * 0.22, 0);
        c.lineTo(Math.cos(PI * 1.2) * R, Math.sin(PI * 1.2) * R);
        const n = 6;
        for (let i = 0; i < n; i++) {
          const a1 = PI * 1.2 + ((i + 1) / n) * PI * 0.6;
          const am = PI * 1.2 + ((i + 0.5) / n) * PI * 0.6;
          c.quadraticCurveTo(Math.cos(am) * R * 1.12, Math.sin(am) * R * 1.12, Math.cos(a1) * R, Math.sin(a1) * R);
        }
        c.lineTo(R * 0.22, 0);
        c.closePath();
      };
      A.shape(ctx, path, '#ffd2c2', '#f0a894', { cel: [R * 0.12, R * 0.1], hl: [-R * 0.3, -R * 0.62, R * 0.14, R * 0.08] });
      ctx.strokeStyle = A.c('#e08e7a');
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 1; i < 6; i++) {
        const a = PI * 1.2 + (i / 6) * PI * 0.6;
        ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2 - 2);
        ctx.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92);
      }
      ctx.stroke();
      A.shape(ctx, (c) => A.roundRect(c, -R * 0.3, -R * 0.14, R * 0.6, R * 0.2, 2), '#ffc0ac', null, { lw: 2 });
      ctx.restore();
    };

    if (hide) {
      // 躲在扇貝殼下，只露出眼睛
      const peek = Math.sin(t * 5) * 1.2;
      [[-3, -30 + peek], [8, -31 + peek]].forEach(([x, y]) => {
        A.ellipse(ctx, x, y, 5, 5, '#ffffff', null, { lw: 2.2, hl: false });
        A.eye(ctx, x + 1.2, y + 1, 2.6, 3.2, m.hurtT > 0 ? 'hurt' : 'normal', 0);
      });
      scallop(0, -1, 32, Math.sin(t * 6) * 0.03);
      return;
    }

    // 腳（身體後面）
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const ph = t * 16 + i * 2.1 + (side > 0 ? 1 : 0);
        const lift = walk ? Math.max(0, Math.sin(ph)) * 3 : 0;
        const x0 = side * (5 + i * 3.5) * k;
        const x2 = side * (13 + i * 4.5) * k + (walk ? Math.cos(ph) * 1.5 : 0);
        limb(ctx, (c) => {
          c.moveTo(x0, by + 3 * k);
          c.lineTo(side * (12 + i * 4) * k, by - 1 * k);
          c.lineTo(x2, -1 - lift);
        }, 4.8, pal[1]);
      }
    }
    // 背上的東西（身體後面）
    if (s === 3) {
      // 珊瑚枝
      const cor = '#ff8fb0';
      const sw = Math.sin(t * 2) * 1.5;
      const branch = (pts) => limb(ctx, (c) => pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))), 7, cor);
      branch([[-6, by - 6], [-14, by - 24], [-22 + sw, by - 34]]);
      branch([[-14, by - 24], [-6 + sw, by - 36]]);
      branch([[-2, by - 8], [4, by - 22], [10 + sw, by - 28]]);
      branch([[-20, by - 12], [-28, by - 20]]);
      [[-22 + sw, by - 34], [-6 + sw, by - 36], [10 + sw, by - 28], [-28, by - 20]].forEach(([x, y]) => A.ellipse(ctx, x, y, 3.8, 3.8, '#ffb0c8', null, { lw: 2, hl: false }));
    }

    // 螯的開合
    let open = 0.3 + Math.sin(t * 5) * 0.12;
    if (m.attackT > 0) open = m.attackPhase === 'wind' ? 0.9 : m.attackPhase === 'strike' ? 0 : 0.4;
    const charge = s === 3 && m.chargeT > 0;
    const bigR = s === 3 ? 13 : 5.5 * k;
    const smallR = s === 3 ? 6.5 : 5.5 * k;
    // 後面（左）的小螯
    const lx = -brx - smallR * 0.4;
    const ly = by - 6 * k;
    limb(ctx, (c) => { c.moveTo(-brx * 0.6, by); c.lineTo(lx, ly); }, 5, pal[1]);
    claw(ctx, lx, ly, smallR, open * 0.7, pal[0], pal[1], -2.6);

    // 眼柄
    const wob = Math.sin(t * 3.5) * 1;
    const e1 = [-3 * k + wob, by - 17 * k];
    const e2 = [8 * k + wob, by - 16 * k];
    limb(ctx, (c) => { c.moveTo(-2 * k, by - 5 * k); c.lineTo(e1[0], e1[1]); c.moveTo(7 * k, by - 5 * k); c.lineTo(e2[0], e2[1]); }, 4.2, pal[0]);

    // 身體
    A.shape(ctx, (c) => {
      c.moveTo(-brx, by + 2 * k);
      c.bezierCurveTo(-brx, by - bry * 1.35, brx, by - bry * 1.35, brx, by + 2 * k);
      c.quadraticCurveTo(0, by + bry * 1.1, -brx, by + 2 * k);
      c.closePath();
    }, pal[0], pal[1], { cel: [3 * k, 3 * k], hl: [-brx * 0.45, by - bry * 0.6, 3.5 * k, 2 * k] });
    if (s === 1) {
      // 沙粒斑點
      ctx.fillStyle = A.c('#c9955a');
      [[-9, -3], [-4, -7], [10, -4], [5, -8], [-12, 0]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, by + y, 1.3, 0, TAU);
        ctx.fill();
      });
    }
    if (s === 2) scallop(-9 * k, by + 5, 23, -0.4 + Math.sin(t * 2) * 0.03);
    // 眼睛
    stalkEye(ctx, e1[0], e1[1], 4.6 + (k - 1) * 3, m);
    stalkEye(ctx, e2[0], e2[1], 4.4 + (k - 1) * 3, m);
    if (s === 3 && !m.dead) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(e1[0] - 6, e1[1] - 9);
      ctx.lineTo(e1[0] + 4, e1[1] - 7 + (charge ? 3 : 0));
      ctx.moveTo(e2[0] - 4, e2[1] - 7 + (charge ? 3 : 0));
      ctx.lineTo(e2[0] + 6, e2[1] - 9);
      ctx.stroke();
    }
    // 嘴與腮紅
    smallMouth(ctx, 4 * k, by + 1 * k, m.hurtT > 0 || charge || m.attackPhase === 'strike', k > 1.4 ? 1.2 : 1);
    A.blush(ctx, -8 * k, by + 0.5 * k, 3.2 * k);
    A.blush(ctx, 13 * k, by, 2.8 * k);

    // 前面（右）的螯：珊瑚蟹的是超大螯
    const reach = charge ? 14 : m.attackPhase === 'strike' ? 6 : 0;
    const rx = brx + bigR * 0.35 + reach;
    const ry = by - (s === 3 ? 10 : 6 * k) + (charge ? 4 : 0);
    limb(ctx, (c) => { c.moveTo(brx * 0.6, by); c.lineTo(rx - bigR * 0.4, ry + 2); }, s === 3 ? 7 : 5, pal[1]);
    claw(ctx, rx, ry, bigR, charge ? 0.85 + Math.sin(t * 30) * 0.1 : open, pal[0], pal[1], charge ? 0 : -0.5);
    if (charge) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(-brx - 6 - i * 3, by - 10 + i * 8);
        ctx.lineTo(-brx - 18 - i * 3, by - 10 + i * 8);
      }
      ctx.stroke();
    }
  }

  // ── 水母系：泡泡水母 → 燈籠水母 → 月光水母 ──
  // 特徵：泡泡水母頭頂冒泡泡、燈籠水母像會一明一滅的紙燈籠、月光水母額頭有新月、飄著緞帶觸手。
  function jelly(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    const k = [1, 1.12, 1.3][s - 1];
    const float = Math.sin(t * 2.6) * 4;
    const by = -16 * k - float; // 傘緣
    const rx = 17 * k;
    const H = [22, 30, 30][s - 1];
    const pulse = 1 + Math.sin(t * 5.2) * 0.04;
    const charging = s === 3 && m.attackT > 0;
    const lanternOn = s === 2 ? Math.max(0, Math.min(1, 0.5 + Math.sin(t * 2.2) * 1.4)) : 0;
    const pal = [
      ['#a6e6ff', '#72c6ee'],
      [U.mix('#f7a860', '#ffdc7a', lanternOn), U.mix('#d8803e', '#f4b24e', lanternOn)],
      ['#d4c8ff', '#a898ee'],
    ][s - 1];

    // 光暈
    if (s === 2) glow(ctx, 0, by - H * 0.5, 55 * k, '255,210,110', 0.55 * lanternOn);
    if (s === 3) glow(ctx, 0, by - H * 0.55, 60, '220,215,255', 0.25 + (charging ? 0.4 + Math.sin(t * 25) * 0.12 : 0));

    // 觸手
    if (s === 1) {
      for (let i = 0; i < 4; i++) {
        const x = -9 + i * 6;
        limb(ctx, (c) => {
          c.moveTo(x, by);
          c.quadraticCurveTo(x + Math.sin(t * 5 + i) * 3, by + 7, x + Math.sin(t * 5 + i + 1) * 2, by + 12);
        }, 4.5, '#8fd8f6');
      }
    } else if (s === 2) {
      // 燈籠穗
      for (let i = 0; i < 3; i++) {
        const x = -9 + i * 9;
        const sw = Math.sin(t * 3 + i) * 2;
        const len = i === 1 ? 16 : 12;
        limb(ctx, (c) => { c.moveTo(x, by); c.lineTo(x + sw, by + len); }, 4.2, '#e0503a');
        A.ellipse(ctx, x + sw, by + len + 2, 3, 3.4, '#ff7a5a', null, { lw: 2, hl: false });
      }
    } else {
      // 細觸手＋兩條緞帶
      for (let i = 0; i < 3; i++) {
        const x = -12 + i * 12;
        limb(ctx, (c) => {
          c.moveTo(x, by);
          c.bezierCurveTo(x + Math.sin(t * 3 + i) * 5, by + 8, x - Math.sin(t * 3 + i) * 5, by + 12, x + Math.sin(t * 3 + i + 2) * 4, by + 15);
        }, 4, '#c0b2fa');
      }
      [-6, 6].forEach((x, i) => {
        const w1 = Math.sin(t * 3.5 + i * 2) * 4;
        A.shape(ctx, (c) => {
          c.moveTo(x - 3, by);
          c.bezierCurveTo(x - 6 + w1, by + 6, x + 2 - w1, by + 10, x - 2 + w1, by + 16);
          c.lineTo(x + 4 + w1, by + 14);
          c.bezierCurveTo(x + 6 - w1, by + 8, x + 2 + w1, by + 5, x + 3, by);
          c.closePath();
        }, '#f0eaff', '#c8bcf4', { lw: 2, shadeY: by + 9 });
      });
    }

    // 傘
    ctx.save();
    ctx.translate(0, by);
    ctx.scale(pulse, 2 - pulse);
    const bell = (c) => {
      if (s === 2) {
        // 燈籠：圓胖，上下收口
        c.moveTo(-rx * 0.62, 0);
        c.bezierCurveTo(-rx * 1.3, -H * 0.1, -rx * 1.3, -H * 0.95, -rx * 0.5, -H);
        c.lineTo(rx * 0.5, -H);
        c.bezierCurveTo(rx * 1.3, -H * 0.95, rx * 1.3, -H * 0.1, rx * 0.62, 0);
        c.closePath();
        return;
      }
      c.moveTo(-rx, 0);
      c.bezierCurveTo(-rx, -H * 1.35, rx, -H * 1.35, rx, 0);
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x0 = rx - (i / n) * rx * 2;
        const x1 = rx - ((i + 1) / n) * rx * 2;
        c.quadraticCurveTo((x0 + x1) / 2, 5, x1, 0);
      }
      c.closePath();
    };
    A.shape(ctx, bell, pal[0], pal[1], { cel: [4, 3], hl: [-rx * 0.45, -H * 0.72, rx * 0.2, H * 0.12] });
    if (s === 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.72, rx * 0.55, H * 0.2, 0, 0, TAU);
      ctx.fill();
    }
    if (s === 2) {
      // 燈籠骨架與上下蓋
      ctx.strokeStyle = A.c(U.mix('#c06a2a', '#e09a3a', lanternOn));
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        if (i === 2) continue;
        const yy = -H * (i / 4);
        const ww = rx * 1.05;
        ctx.moveTo(-ww, yy);
        ctx.quadraticCurveTo(0, yy + 2.5, ww, yy);
      }
      ctx.stroke();
      A.shape(ctx, (c) => A.roundRect(c, -rx * 0.62, -H - 4, rx * 1.24, 6, 2), '#5a3a2a', null, { lw: 2 });
      A.shape(ctx, (c) => A.roundRect(c, -rx * 0.7, -2, rx * 1.4, 5, 2), '#5a3a2a', null, { lw: 2 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -H - 7, 4, PI, 0);
      ctx.stroke();
    }
    if (s === 3) {
      // 新月
      A.shape(ctx, (c) => {
        c.arc(0, -H * 0.84, 6.5, 0.35 * PI, 1.65 * PI, false);
        c.arc(3, -H * 0.86, 5.4, 1.55 * PI, 0.45 * PI, true);
        c.closePath();
      }, charging ? '#fffbe0' : '#ffe27a', null, { lw: 1.8 });
    }
    ctx.restore();

    // 臉
    const fy = by - H * (s === 2 ? 0.48 : s === 3 ? 0.36 : 0.42);
    const gap = 9 + (k - 1) * 8;
    faceEyes(ctx, -2, fy, gap, 3.3, 4.4, m, charging && !m.dead && m.hurtT <= 0 ? 'angry' : null);
    smallMouth(ctx, -2 + gap / 2 + 1, fy + 7, m.hurtT > 0 || charging);
    A.blush(ctx, -8, fy + 5, 3);
    A.blush(ctx, gap + 4, fy + 4.5, 2.6);

    if (s === 1) {
      // 頭頂的泡泡
      for (let i = 0; i < 2; i++) {
        const b = (t * 0.7 + i * 0.5) % 1;
        ctx.globalAlpha = 1 - b;
        ctx.strokeStyle = A.c('#5aaede');
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(4 + i * 6 + Math.sin(t * 3 + i) * 2, by - H - 4 - b * 16, 2.2 + i, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (charging) {
      // 集電火花
      ctx.strokeStyle = A.c('#fff27a');
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < 4; i++) {
        const a = t * 9 + i * 1.57;
        const cx = 0;
        const cy = by - H * 0.5;
        const r0 = 30 + Math.sin(t * 30 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a + 0.2) * (r0 - 6), cy + Math.sin(a + 0.2) * (r0 - 6));
        ctx.lineTo(cx + Math.cos(a - 0.05) * (r0 - 11), cy + Math.sin(a - 0.05) * (r0 - 11));
        ctx.stroke();
      }
    }
  }

  // ── 鷗系：海鷗雛 → 浪花鷗 → 帆翼信天翁 ──
  // 特徵：海鷗雛毛茸茸的一團、浪花鷗頭上的毛是一道捲浪、信天翁的翅膀是兩面船帆。
  function gull(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    const walk = walking(m);
    const air = !m.onGround;
    const sy = jumpSquash(m);
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);
    const wad = walk ? Math.sin(t * 12) : 0;
    ctx.rotate(wad * 0.07 + (s === 1 && !walk ? Math.sin(t * 2) * 0.03 : 0));

    const white = ['#fbf8f0', '#e0d8c8'];
    const beak = ['#ffb43a', '#e88a1e'];

    if (s === 1) {
      A.ellipse(ctx, -5, -2 - Math.max(0, wad) * 2, 5, 2.6, beak[0], null, { lw: 2, hl: false });
      A.ellipse(ctx, 7, -2 - Math.max(0, -wad) * 2, 5, 2.6, beak[0], null, { lw: 2, hl: false });
      // 毛茸茸身體
      const fluff = (c) => {
        const n = 14;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * TAU;
          const a1 = ((i + 1) / n) * TAU;
          const am = (a0 + a1) / 2;
          const R = 17;
          if (!i) c.moveTo(Math.cos(a0) * R, -19 + Math.sin(a0) * R);
          c.quadraticCurveTo(Math.cos(am) * R * 1.14, -19 + Math.sin(am) * R * 1.14, Math.cos(a1) * R, -19 + Math.sin(a1) * R);
        }
        c.closePath();
      };
      A.shape(ctx, fluff, '#f2efe6', '#d2cbbc', { cel: [3.5, 3.5], hl: [-6, -28, 3.5, 2] });
      // 灰色小翅膀
      A.ellipse(ctx, -7, -17 + (air ? Math.sin(t * 25) * 3 : 0), 6.5, 4.5, '#b8bec8', '#9aa2ae', { rot: air ? -0.8 : 0.5, lw: 2.2, hl: false });
      // 頭頂的呆毛
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-1, -37);
      ctx.quadraticCurveTo(-3, -44, 2, -45);
      ctx.moveTo(1, -37);
      ctx.quadraticCurveTo(4, -42, 7, -41);
      ctx.stroke();
      faceEyes(ctx, 3, -24, 9, 3.2, 4.3, m);
      A.shape(ctx, (c) => { c.moveTo(9, -19); c.quadraticCurveTo(17, -19, 19, -15.5); c.quadraticCurveTo(14, -12.5, 9, -15); c.closePath(); }, beak[0], beak[1], { lw: 2, shadeY: -16 });
      if (m.hurtT > 0 || m.attackT > 0) smallMouth(ctx, 12, -11, true, 0.7);
      A.blush(ctx, -2, -17, 3);
      A.blush(ctx, 18, -22, 2.2);
    } else if (s === 2) {
      limb(ctx, (c) => { c.moveTo(-4, -14); c.lineTo(-5, -2 - Math.max(0, wad) * 2); c.moveTo(5, -14); c.lineTo(6, -2 - Math.max(0, -wad) * 2); }, 4.5, beak[0]);
      A.ellipse(ctx, -3, -2 - Math.max(0, wad) * 2, 5, 2.4, beak[0], null, { lw: 2, hl: false });
      A.ellipse(ctx, 8, -2 - Math.max(0, -wad) * 2, 5, 2.4, beak[0], null, { lw: 2, hl: false });
      // 尾羽
      A.shape(ctx, (c) => { c.moveTo(-14, -24); c.lineTo(-28, -30); c.lineTo(-26, -21); c.lineTo(-14, -15); c.closePath(); }, '#8fa2b8', '#72849a', { lw: 2.2, shadeY: -22 });
      const flap = air ? Math.sin(t * 22) : 0;
      if (air) A.ellipse(ctx, -2, -36 - flap * 6, 14, 5.5, '#a6b6c8', '#8698ae', { rot: -0.9 - flap * 0.5, lw: 2.2, hl: false });
      // 身體
      A.ellipse(ctx, 0, -24, 18, 17, white[0], white[1], { cel: [3.5, 3.5], hl: [-7, -34, 4, 2.4] });
      // 浪花頭毛
      const w = Math.sin(t * 3) * 1.5;
      A.shape(ctx, (c) => {
        c.moveTo(-10, -37);
        c.bezierCurveTo(-16, -52, -2, -62 + w, 9, -56 + w);
        c.bezierCurveTo(15, -52 + w, 12, -44, 6, -45);
        c.bezierCurveTo(2, -46, 2, -50 + w, 6, -51 + w);
        c.bezierCurveTo(0, -53, -5, -46, 1, -39);
        c.closePath();
      }, '#5ec4f0', '#3a9ed2', { cel: [2, 2], lw: 2.4 });
      ctx.fillStyle = A.c('#ffffff');
      [[9, -56 + w, 2.2], [3, -58 + w, 1.6], [13, -51 + w, 1.4]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
      // 側翅
      ctx.save();
      ctx.translate(-4, -23);
      ctx.rotate(air ? -0.6 - flap * 0.6 : 0.15);
      A.shape(ctx, (c) => { c.moveTo(8, -5); c.quadraticCurveTo(-4, -9, -16, 2); c.quadraticCurveTo(-4, 6, 8, 4); c.closePath(); }, '#a6b6c8', '#8698ae', { lw: 2.2, shadeY: 1 });
      ctx.restore();
      faceEyes(ctx, 4, -30, 9, 3.2, 4.3, m);
      // 喙（紅點）
      A.shape(ctx, (c) => { c.moveTo(13, -24); c.quadraticCurveTo(24, -25, 27, -21); c.quadraticCurveTo(20, -18, 13, -19.5); c.closePath(); }, '#ffd23a', '#e8aa1e', { lw: 2, shadeY: -21.5 });
      A.ellipse(ctx, 22.5, -20.5, 1.5, 1.2, '#e8483a', null, { noStroke: true, hl: false });
      if (m.hurtT > 0 || m.attackT > 0) smallMouth(ctx, 16, -15, true, 0.7);
      A.blush(ctx, -1, -22, 3);
      A.blush(ctx, 19, -28, 2.2);
    } else {
      const raise = m.attackT > 0 ? 1 : air ? 0.5 + Math.sin(t * 14) * 0.3 : 0;
      // 帆翼
      const sail = (ox, oy, ang, sc, back) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);
        ctx.scale(sc, sc);
        const bil = Math.sin(t * 4 + (back ? 1 : 0)) * 2;
        const path = (c) => {
          c.moveTo(0, 0);
          c.lineTo(-4, -42);
          c.quadraticCurveTo(-22 + bil, -24, -34, 2);
          c.quadraticCurveTo(-16, 6, 0, 0);
          c.closePath();
        };
        A.shape(ctx, path, back ? '#e6d6b4' : '#f8ecd2', back ? '#cdb892' : '#dcc8a2', { cel: [4, 3], lw: 2.6 });
        ctx.strokeStyle = A.c('#c8b08a');
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-2, -28);
        ctx.quadraticCurveTo(-14 + bil * 0.6, -16, -22, 2);
        ctx.moveTo(-3, -14);
        ctx.quadraticCurveTo(-8, -6, -11, 3);
        ctx.stroke();
        limb(ctx, (c) => { c.moveTo(1, 2); c.lineTo(-4, -44); }, 4.5, '#6a7a90');
        ctx.restore();
      };
      sail(-8, -38, -0.7 + raise * 0.6, 0.78, true);
      limb(ctx, (c) => { c.moveTo(-6, -16); c.lineTo(-7, -3 - Math.max(0, wad) * 2); c.moveTo(6, -16); c.lineTo(7, -3 - Math.max(0, -wad) * 2); }, 5, '#f0a8a0');
      A.ellipse(ctx, -4, -3 - Math.max(0, wad) * 2, 7, 3, '#f0a8a0', null, { lw: 2, hl: false });
      A.ellipse(ctx, 10, -3 - Math.max(0, -wad) * 2, 7, 3, '#f0a8a0', null, { lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-18, -30); c.lineTo(-34, -34); c.lineTo(-30, -24); c.lineTo(-18, -20); c.closePath(); }, '#5a6a80', '#46546a', { lw: 2.2, shadeY: -28 });
      // 身體
      const bodyP = (c) => {
        c.moveTo(-22, -26);
        c.bezierCurveTo(-24, -48, 6, -58, 20, -46);
        c.bezierCurveTo(30, -36, 22, -12, 0, -12);
        c.bezierCurveTo(-14, -12, -22, -16, -22, -26);
        c.closePath();
      };
      A.shape(ctx, bodyP, white[0], white[1], { cel: [4, 4], hl: [-8, -44, 5, 3], noStroke: true });
      // 深色背
      ctx.save();
      ctx.beginPath();
      bodyP(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#6a7a90');
      ctx.beginPath();
      ctx.moveTo(-30, -18);
      ctx.quadraticCurveTo(-8, -30, -2, -60);
      ctx.lineTo(-40, -60);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      bodyP(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.stroke();
      faceEyes(ctx, 7, -40, 9, 3.3, 4.4, m);
      if (!m.dead) {
        // 老船長般的灰色粗眉
        ctx.fillStyle = A.c('#5a6a80');
        ctx.beginPath();
        ctx.ellipse(6, -48, 5, 2, -0.2, 0, TAU);
        ctx.ellipse(16, -48, 4.5, 1.8, 0.2, 0, TAU);
        ctx.fill();
      }
      // 勾喙
      A.shape(ctx, (c) => {
        c.moveTo(17, -37);
        c.quadraticCurveTo(30, -38, 36, -32);
        c.quadraticCurveTo(37, -28, 33, -28);
        c.quadraticCurveTo(26, -30, 17, -30);
        c.closePath();
      }, '#ffcf8a', '#eaa860', { lw: 2.2, shadeY: -32 });
      if (m.hurtT > 0 || m.attackT > 0) smallMouth(ctx, 22, -24, true, 0.8);
      A.blush(ctx, 3, -33, 3.2);
      A.blush(ctx, 23, -41, 2.2);
      sail(-6, -30, -0.85 + raise * 0.9, 0.85, false);
    }
    ctx.restore();
  }

  // ═════════════ 第三章：赤岩峽谷 ═════════════

  // ── 蜥蜴系：火苗蜥 → 熔尾蜥 → 炎鬣蜥 ──
  // 特徵：火苗蜥尾巴尖端有一朵小火苗、熔尾蜥的尾巴是發光的熔岩、炎鬣蜥有會張開的頸部皺褶。
  function lizard(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    const k = [1, 1.25, 1.5][s - 1];
    const pal = [
      ['#ffb45a', '#e88a32'],
      ['#f0784a', '#c8542e'],
      ['#e04e3e', '#b0342c'],
    ][s - 1];
    const belly = '#ffe2a8';
    const walk = walking(m);
    const atk = m.attackT > 0;
    const strike = atk && m.attackPhase === 'strike';
    const sy = jumpSquash(m);
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);

    const by = -11 * k;
    const step = walk ? Math.sin(t * 14) : 0;
    const leg = (x, ph, col) => {
      const lift = Math.max(0, ph) * 3;
      limb(ctx, (c) => { c.moveTo(x, by + 2 * k); c.lineTo(x + 2 * k, -2 - lift); }, 5.5 * Math.min(k, 1.3), col);
      A.ellipse(ctx, x + 3.5 * k, -2 - lift, 3.6 * k, 2.2 * k, col, null, { lw: 2, hl: false });
    };
    leg(-7 * k, -step, pal[1]);
    leg(9 * k, step, pal[1]);

    // 尾巴
    let tailRot = Math.sin(t * 3) * 0.08;
    if (s === 2 && atk) tailRot = m.attackPhase === 'wind' ? 0.9 : strike ? -0.3 : 0.2;
    ctx.save();
    ctx.translate(-11 * k, by);
    ctx.rotate(tailRot);
    const tailPath = (c) => {
      c.moveTo(2 * k, -6 * k);
      c.bezierCurveTo(-8 * k, -8 * k, -18 * k, -4 * k, -21 * k, -12 * k);
      c.quadraticCurveTo(-24 * k, -16 * k, -20 * k, -16 * k);
      c.bezierCurveTo(-14 * k, -2 * k, -6 * k, 5 * k, 3 * k, 5 * k);
      c.closePath();
    };
    if (s === 2) {
      glow(ctx, -16 * k, -8 * k, 24 * k, '255,140,40', 0.45 + Math.sin(t * 4) * 0.1);
      A.shape(ctx, tailPath, '#5a3a34', '#44282a', { cel: [2, 2] });
      ctx.save();
      ctx.beginPath();
      tailPath(ctx);
      ctx.clip();
      const hot = 0.75 + Math.sin(t * 5) * 0.25;
      ctx.strokeStyle = A.c(U.mix('#ff7a1e', '#ffe46a', hot));
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      [-5, -11, -16].forEach((x) => {
        ctx.moveTo(x * k, -10 * k);
        ctx.lineTo((x + 2) * k, -3 * k);
        ctx.lineTo((x - 1) * k, 4 * k);
      });
      ctx.stroke();
      ctx.restore();
      A.ellipse(ctx, -20 * k, -15 * k, 3.4 * k, 3 * k, '#ffb43a', null, { lw: 2, hl: false });
      if (strike) {
        ctx.strokeStyle = 'rgba(255,170,60,0.75)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, 27 * k, PI * 1.02, PI * 1.45);
        ctx.stroke();
      }
    } else {
      A.shape(ctx, tailPath, pal[0], pal[1], { cel: [2, 2] });
    }
    if (s === 1) flame(ctx, -21 * k, -18 * k, 4.5, t, 0);
    ctx.restore();

    // 背刺（炎鬣蜥）
    if (s === 3) {
      ctx.fillStyle = A.c('#ffc84a');
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      for (let i = 0; i < 4; i++) {
        const x = -14 + i * 6.5;
        ctx.beginPath();
        ctx.moveTo(x - 3.5, by - 7 * k);
        ctx.lineTo(x - 1, by - 13 * k - (i % 2) * 2);
        ctx.lineTo(x + 3, by - 7.5 * k);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    // 身體
    const bodyP = (c) => c.ellipse(0, by, 15 * k, 9 * k, 0, 0, TAU);
    A.shape(ctx, bodyP, pal[0], pal[1], { cel: [3, 3], hl: [-5 * k, by - 5 * k, 4 * k, 1.8 * k], noStroke: true });
    ctx.save();
    ctx.beginPath();
    bodyP(ctx);
    ctx.clip();
    A.ellipse(ctx, 2 * k, by + 8 * k, 12 * k, 5 * k, belly, null, { noStroke: true, hl: false });
    ctx.restore();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3;
    ctx.beginPath();
    bodyP(ctx);
    ctx.stroke();
    if (s === 1) {
      ctx.fillStyle = A.c('#f08a3a');
      [[-7, -4], [-1, -6], [-4, 0]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * k, by + y * k, 1.6, 0, TAU); ctx.fill(); });
    }
    leg(-3 * k, step, pal[0]);
    leg(12 * k, -step, pal[0]);

    // 頭
    const hx = 14 * k;
    const hy = by - 6 * k - (atk ? 1 : 0);
    const frillOpen = s === 3 && atk;
    if (s === 3) {
      // 頸部皺褶
      ctx.save();
      ctx.translate(hx - 4 * k, hy + 1);
      const R = frillOpen ? 19 * k : 10 * k;
      const a0 = frillOpen ? -PI * 0.95 : -PI * 0.95;
      const a1 = frillOpen ? PI * 0.7 : -PI * 0.35;
      const n = frillOpen ? 7 : 3;
      A.shape(ctx, (c) => {
        c.moveTo(0, 0);
        c.lineTo(Math.cos(a0) * R, Math.sin(a0) * R);
        for (let i = 1; i <= n; i++) {
          const a = a0 + ((a1 - a0) * i) / n;
          const am = a0 + ((a1 - a0) * (i - 0.5)) / n;
          c.quadraticCurveTo(Math.cos(am) * R * 1.22, Math.sin(am) * R * 1.22, Math.cos(a) * R, Math.sin(a) * R);
        }
        c.closePath();
      }, '#ffc84a', '#f09a2a', { cel: [2, 2], lw: 2.4 });
      ctx.strokeStyle = A.c('#e0782a');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 1; i < n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        ctx.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3);
        ctx.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9);
      }
      ctx.stroke();
      ctx.restore();
    }
    A.shape(ctx, (c) => {
      c.moveTo(hx - 8 * k, hy + 6 * k);
      c.bezierCurveTo(hx - 12 * k, hy - 10 * k, hx + 6 * k, hy - 12 * k, hx + 12 * k, hy - 2 * k);
      c.bezierCurveTo(hx + 16 * k, hy + 4 * k, hx + 8 * k, hy + 8 * k, hx - 8 * k, hy + 6 * k);
      c.closePath();
    }, pal[0], pal[1], { cel: [2.5, 2.5], hl: [hx - 3 * k, hy - 6 * k, 3 * k, 1.6 * k] });
    const ek = Math.min(k, 1.25);
    faceEyes(ctx, hx - 1 * k, hy - 3 * k, 7.5 * k, 2.9 * ek, 3.9 * ek, m);
    if (s === 3 && !m.dead) brows(ctx, hx - 5 * k, hy - 9.5 * k, hx + 0.5 * k, hy - 8 * k, 7.5 * k, 2.6);
    if (frillOpen) {
      // 嘴裡發光
      glow(ctx, hx + 12 * k, hy + 3 * k, 24, '255,170,50', 0.75);
      A.shape(ctx, (c) => {
        c.moveTo(hx + 2 * k, hy + 3 * k);
        c.quadraticCurveTo(hx + 10 * k, hy + 1 * k, hx + 14 * k, hy + 1 * k);
        c.quadraticCurveTo(hx + 12 * k, hy + 8 * k, hx + 2 * k, hy + 3 * k);
        c.closePath();
      }, '#ffe46a', '#ff9a2a', { lw: 2, shadeY: hy + 5 * k });
    } else {
      smallMouth(ctx, hx + 5 * k, hy + 3.5 * k, m.hurtT > 0 || strike, Math.min(k, 1.2));
    }
    A.blush(ctx, hx - 5 * k, hy + 2 * k, 2.8 * k);
    ctx.restore();
  }

  // ── 岩石系：碎石丸 → 岩塊怪 → 溫泉石像 ──
  // 特徵：碎石丸是圓滾滾的小石頭（衝撞時會滾）、岩塊怪害羞會用手遮臉、溫泉石像頭頂一碗冒煙的溫泉。
  function rock(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    const walk = walking(m);
    const step = walk ? Math.sin(t * 10) : 0;

    if (s === 1) {
      const roll = m.chargeT > 0;
      const hop = walk && !roll ? Math.abs(Math.sin(t * 10)) * 2 : 0;
      ctx.save();
      ctx.translate(0, -15 - hop);
      if (roll) ctx.rotate(t * 16);
      A.shape(ctx, (c) => {
        c.moveTo(-15, 2);
        c.bezierCurveTo(-16, -12, -6, -16, 2, -15);
        c.bezierCurveTo(12, -14, 16, -6, 15, 3);
        c.bezierCurveTo(14, 12, 6, 15, -1, 15);
        c.bezierCurveTo(-10, 15, -15, 10, -15, 2);
        c.closePath();
      }, '#cfae92', '#a8866c', { cel: [3.5, 3.5], hl: [-7, -9, 3.5, 2] });
      ctx.strokeStyle = A.c('#8a6a54');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-12, 6);
      ctx.lineTo(-8, 4);
      ctx.lineTo(-9, 9);
      ctx.stroke();
      // 頭頂的小晶片
      A.shape(ctx, (c) => { c.moveTo(-5, -14); c.lineTo(-2, -21); c.lineTo(3, -14.5); c.closePath(); }, '#ff9a6a', '#e0764a', { lw: 1.8, shadeY: -17 });
      faceEyes(ctx, 1, -2, 8.5, 3.2, 4.2, m);
      smallMouth(ctx, 5.5, 6, m.hurtT > 0 || roll);
      A.blush(ctx, -4, 4, 2.8);
      A.blush(ctx, 13, 3.5, 2.3);
      ctx.restore();
      if (roll) {
        ctx.strokeStyle = 'rgba(160,110,80,0.6)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -15, 21, PI * 0.6, PI * 1.1);
        ctx.stroke();
      }
      return;
    }

    if (s === 2) {
      const hide = m.shellT > 0;
      const sy = hide ? 0.92 : 1 + Math.sin(t * 2.5) * 0.015;
      ctx.save();
      ctx.scale(1 / Math.sqrt(sy), sy);
      A.ellipse(ctx, -11, -4 - Math.max(0, step) * 2, 8, 5, '#9a7660', null, { lw: 2.4, hl: false });
      A.ellipse(ctx, 11, -4 - Math.max(0, -step) * 2, 8, 5, '#9a7660', null, { lw: 2.4, hl: false });
      const body = (c) => {
        c.moveTo(-25, -8);
        c.lineTo(-27, -30);
        c.lineTo(-16, -48);
        c.lineTo(4, -52);
        c.lineTo(22, -42);
        c.lineTo(27, -20);
        c.lineTo(20, -5);
        c.lineTo(-18, -3);
        c.closePath();
      };
      A.shape(ctx, body, '#c39a7e', '#9a7660', { cel: [5, 5], hl: [-14, -38, 5, 3] });
      ctx.strokeStyle = A.c('#8a6a54');
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-16, -48);
      ctx.lineTo(-10, -40);
      ctx.moveTo(-27, -30);
      ctx.lineTo(-20, -26);
      ctx.moveTo(22, -12);
      ctx.lineTo(14, -8);
      ctx.stroke();
      // 苔蘚小帽
      A.shape(ctx, (c) => { c.moveTo(-15, -47); c.quadraticCurveTo(-4, -60, 9, -51); c.quadraticCurveTo(-2, -47, -15, -47); c.closePath(); }, '#8cc05a', '#6a9a40', { lw: 2.2, shadeY: -49 });
      if (!hide) {
        faceEyes(ctx, 1, -28, 11, 3.8, 5, m);
        if (!m.dead) {
          // 一字粗眉
          ctx.strokeStyle = A.outline();
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-4, m.angry ? -38 : -37);
          ctx.quadraticCurveTo(6, m.angry ? -33 : -40, 16, m.angry ? -38 : -37);
          ctx.stroke();
        }
        smallMouth(ctx, 7, -17, m.hurtT > 0 || m.attackT > 0, 1.2);
        A.blush(ctx, -6, -20, 3.6);
        A.blush(ctx, 18, -21, 3);
        const up = m.attackT > 0 ? (m.attackPhase === 'wind' ? -10 : 4) : 0;
        A.ellipse(ctx, -26, -22, 7, 6.5, '#b48c72', '#9a7660', { hl: false, lw: 2.4 });
        A.ellipse(ctx, 27, -22 + up, 7, 6.5, '#b48c72', '#9a7660', { hl: false, lw: 2.4 });
      } else {
        // 用兩手遮住臉
        A.ellipse(ctx, 0, -28, 8.5, 8, '#b48c72', '#9a7660', { hl: false, lw: 2.4, rot: 0.3 });
        A.ellipse(ctx, 14, -28, 8.5, 8, '#b48c72', '#9a7660', { hl: false, lw: 2.4, rot: -0.3 });
        A.blush(ctx, -8, -19, 3.4);
        A.blush(ctx, 21, -20, 3);
        A.shape(ctx, (c) => { c.moveTo(24, -46); c.quadraticCurveTo(28.5, -39, 24, -37); c.quadraticCurveTo(19.5, -39, 24, -46); c.closePath(); }, '#bfe8ff', null, { lw: 1.6 });
      }
      ctx.restore();
      return;
    }

    // s3 溫泉石像
    const heal = m.healT > 0;
    const sway = walk ? Math.sin(t * 8) * 0.04 : 0;
    ctx.save();
    ctx.rotate(sway);
    if (heal) glow(ctx, 0, -46, 70, '120,255,150', 0.45 + Math.sin(t * 8) * 0.12);
    const stone = ['#bab4aa', '#928c84'];
    A.ellipse(ctx, -11, -4 - Math.max(0, step) * 2, 9, 5, stone[1], null, { lw: 2.4, hl: false });
    A.ellipse(ctx, 11, -4 - Math.max(0, -step) * 2, 9, 5, stone[1], null, { lw: 2.4, hl: false });
    // 身體（地藏般）
    A.shape(ctx, (c) => {
      c.moveTo(-24, -6);
      c.bezierCurveTo(-26, -24, -18, -38, -14, -40);
      c.lineTo(14, -40);
      c.bezierCurveTo(18, -38, 26, -24, 24, -6);
      c.quadraticCurveTo(0, -1, -24, -6);
      c.closePath();
    }, stone[0], stone[1], { cel: [5, 4] });
    ctx.strokeStyle = A.c('#7a746c');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-15, -10);
    ctx.lineTo(-11, -16);
    ctx.stroke();
    // 紅色圍兜
    A.shape(ctx, (c) => {
      c.moveTo(-14, -39);
      c.quadraticCurveTo(0, -35, 15, -39);
      c.quadraticCurveTo(12, -24, 0, -22);
      c.quadraticCurveTo(-11, -24, -14, -39);
      c.closePath();
    }, '#e8543e', '#c23c2e', { cel: [2, 2], lw: 2.4 });
    // 合掌的手
    A.ellipse(ctx, 14, -22, 5.5, 7, '#c8c2b8', stone[1], { hl: false, lw: 2.2, rot: -0.2 });
    // 頭
    A.ellipse(ctx, 0, -52, 17, 15, stone[0], stone[1], { cel: [3.5, 3.5], hl: [-7, -60, 4, 2.5] });
    const ey = -52;
    if (!m.dead && m.hurtT <= 0 && !m.angry && !m.blink) {
      // 平靜的瞇瞇眼
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(1, ey - 1, 3.5, 1.15 * PI, 1.85 * PI);
      ctx.moveTo(14.2, ey - 2);
      ctx.arc(11, ey - 1.5, 3.2, 1.15 * PI, 1.85 * PI);
      ctx.stroke();
    } else {
      faceEyes(ctx, 1, ey, 10, 3.2, 4.2, m);
    }
    smallMouth(ctx, 6, ey + 8, m.hurtT > 0);
    A.blush(ctx, -5, ey + 5, 3.2);
    A.blush(ctx, 16, ey + 4, 2.6);
    // 頭頂的溫泉碗
    const water = heal ? '#7af0a0' : '#7fd8d0';
    A.shape(ctx, (c) => {
      c.moveTo(-19, -70);
      c.quadraticCurveTo(-17, -60, 0, -60);
      c.quadraticCurveTo(17, -60, 19, -70);
      c.closePath();
    }, '#a0643c', '#7e4a2a', { lw: 2.6, shadeY: -65 });
    A.ellipse(ctx, 0, -70, 19, 4.5, '#b87848', null, { lw: 2.6, hl: false });
    A.ellipse(ctx, 0, -70.5, 15, 2.8, water, null, { lw: 1.6, hl: false });
    // 蒸氣
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.6 + i / 3) % 1;
      const x = -8 + i * 8 + Math.sin(t * 2 + i * 2) * 3;
      const y = -76 - p * 22;
      ctx.globalAlpha = (1 - p) * 0.85;
      ctx.fillStyle = heal ? '#d8ffe0' : '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 3 + p * 4, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (heal) {
      ctx.fillStyle = A.c('#5ae07a');
      for (let i = 0; i < 3; i++) {
        const p = (t * 1.2 + i / 3) % 1;
        const x = -26 + i * 26;
        const y = -30 - p * 40;
        ctx.globalAlpha = 1 - p;
        ctx.beginPath();
        ctx.rect(x - 1.8, y - 5.5, 3.6, 11);
        ctx.rect(x - 5.5, y - 1.8, 11, 3.6);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  // ── 猴系：溫泉猴 → 赤毛猴 → 山魈頭目 ──
  // 特徵：溫泉猴頭上頂著毛巾、赤毛猴有長長的捲尾巴、山魈頭目戴著木頭面具與羽毛冠。
  function monkey(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    const k = [1, 1.18, 1.5][s - 1];
    const pal = [
      ['#dccab2', '#b8a284'],
      ['#dc6a40', '#b04a2a'],
      ['#7a6a4a', '#5a4c34'],
    ][s - 1];
    const face = ['#ffb8a8', '#ffd8b4', '#ffd8b4'][s - 1];
    const walk = walking(m);
    const step = walk ? Math.sin(t * 13) : 0;
    const sy = jumpSquash(m);
    const atk = m.attackT > 0;
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);

    // 尾巴
    if (s === 2) {
      const w = Math.sin(t * 3) * 3;
      limb(ctx, (c) => {
        c.moveTo(-8, -14 * k);
        c.bezierCurveTo(-28, -14 * k, -30, -38 * k + w, -20, -41 * k + w);
        c.bezierCurveTo(-11, -43 * k + w, -10, -33 * k + w, -17, -33 * k + w);
      }, 6.5, pal[0]);
    } else {
      A.ellipse(ctx, -11 * k, -11 * k, 4 * k, 3 * k, pal[0], null, { hl: false, lw: 2 });
    }
    A.ellipse(ctx, -6 * k, -3 - Math.max(0, step) * 2, 5.5 * k, 3.4 * k, pal[1], null, { lw: 2.2, hl: false });
    A.ellipse(ctx, 6 * k, -3 - Math.max(0, -step) * 2, 5.5 * k, 3.4 * k, pal[1], null, { lw: 2.2, hl: false });
    A.ellipse(ctx, -10 * k, -15 * k + step, 4 * k, 5 * k, pal[1], null, { lw: 2.2, hl: false, rot: 0.3 });
    // 身體
    A.ellipse(ctx, 0, -14 * k, 11 * k, 11 * k, pal[0], pal[1], { cel: [3, 3], hl: false });
    A.ellipse(ctx, 2 * k, -12.5 * k, 6 * k, 6.5 * k, face, null, { noStroke: true, hl: false });
    if (s === 3) {
      // 葉子腰布
      A.shape(ctx, (c) => {
        c.moveTo(-11 * k, -8 * k);
        c.lineTo(11 * k, -8 * k);
        c.lineTo(8 * k, -1 * k);
        c.lineTo(4 * k, -5 * k);
        c.lineTo(0, 0);
        c.lineTo(-4 * k, -5 * k);
        c.lineTo(-8 * k, -1 * k);
        c.closePath();
      }, '#6cb04a', '#4f8a35', { lw: 2.2, shadeY: -5 * k });
    }
    // 頭
    const hy = -32 * k;
    const hr = 14 * k;
    if (s === 3) {
      // 羽毛冠
      [[-0.55, '#e8483a'], [0, '#ffc84a'], [0.55, '#4ab0e8']].forEach(([a, col]) => {
        ctx.save();
        ctx.translate(-1 * k, hy - hr * 0.65);
        ctx.rotate(a - 0.1 + Math.sin(t * 2 + a) * 0.05);
        A.ellipse(ctx, 0, -10 * k, 3.6 * k, 9 * k, col, null, { lw: 2.2, hl: false });
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -3 * k);
        ctx.lineTo(0, -17 * k);
        ctx.stroke();
        ctx.restore();
      });
    }
    // 耳朵
    A.ellipse(ctx, -hr * 0.9, hy + 1, 4.5 * k, 5 * k, pal[0], null, { lw: 2.2, hl: false });
    A.ellipse(ctx, -hr * 0.9, hy + 1, 2.2 * k, 2.8 * k, face, null, { noStroke: true, hl: false });
    A.ellipse(ctx, 0, hy, hr, hr * 0.95, pal[0], pal[1], { cel: [3, 3], hl: [-hr * 0.4, hy - hr * 0.5, 3 * k, 2 * k] });
    if (s === 2) {
      // 頭頂的一撮毛
      A.shape(ctx, (c) => { c.moveTo(-6, hy - hr * 0.85); c.quadraticCurveTo(-4, hy - hr * 1.5, 7, hy - hr * 1.4); c.quadraticCurveTo(0, hy - hr * 1.15, 5, hy - hr * 0.85); c.closePath(); }, pal[0], pal[1], { lw: 2.2, shadeY: hy - hr });
    }
    if (s === 3) {
      // 金色鬍鬚
      A.shape(ctx, (c) => {
        c.moveTo(-6 * k, hy + 5 * k);
        c.quadraticCurveTo(-2 * k, hy + 20 * k, 6 * k, hy + 17 * k);
        c.quadraticCurveTo(13 * k, hy + 15 * k, 15 * k, hy + 6 * k);
        c.closePath();
      }, '#e8c068', '#c89a48', { lw: 2.2, shadeY: hy + 12 * k });
    }
    const fx = 4 * k;
    if (s < 3) {
      A.shape(ctx, (c) => {
        c.moveTo(fx, hy + 9 * k);
        c.bezierCurveTo(fx - 12 * k, hy + 6 * k, fx - 11 * k, hy - 8 * k, fx - 3 * k, hy - 6 * k);
        c.quadraticCurveTo(fx, hy - 5 * k, fx + 2 * k, hy - 3 * k);
        c.quadraticCurveTo(fx + 5 * k, hy - 7 * k, fx + 9 * k, hy - 5 * k);
        c.bezierCurveTo(fx + 14 * k, hy - 1 * k, fx + 10 * k, hy + 8 * k, fx, hy + 9 * k);
        c.closePath();
      }, face, null, { lw: 2 });
      faceEyes(ctx, fx - 3.5 * k, hy - 1 * k, 7.5 * k, 2.9 * k, 3.8 * k, m);
      if (s === 2 && !m.dead) brows(ctx, fx - 7 * k, hy - 6.5 * k, fx - 1 * k, hy - 5.5 * k, 7.5 * k, 2.4);
      smallMouth(ctx, fx + 1 * k, hy + 5 * k, m.hurtT > 0 || atk);
      A.blush(ctx, fx - 7 * k, hy + 3 * k, 2.6 * k);
      A.blush(ctx, fx + 9 * k, hy + 2.5 * k, 2.2 * k);
    } else {
      // 木頭面具（山魈花紋：紅鼻樑、藍頰）
      A.shape(ctx, (c) => A.roundRect(c, fx - 10 * k, hy - 9 * k, 20 * k, 19 * k, 7 * k), '#c89060', '#a06c40', { cel: [2.5, 2.5], lw: 2.6, hl: [fx - 6 * k, hy - 6 * k, 2.5 * k, 1.5 * k] });
      A.shape(ctx, (c) => A.roundRect(c, fx - 2.2 * k, hy - 4 * k, 4.4 * k, 12 * k, 2 * k), '#e0483a', null, { lw: 1.8 });
      ctx.strokeStyle = A.c('#4a9ad8');
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const yy = hy + (2.5 + i * 3) * k;
        ctx.moveTo(fx - 8 * k, yy);
        ctx.lineTo(fx - 4.5 * k, yy);
        ctx.moveTo(fx + 4.5 * k, yy);
        ctx.lineTo(fx + 8 * k, yy);
      }
      ctx.stroke();
      const kind = eyeKind(m);
      [fx - 5 * k, fx + 5 * k].forEach((x) => {
        A.ellipse(ctx, x, hy - 3.5 * k, 3.4 * k, 2.8 * k, '#3a2414', null, { lw: 1.8, hl: false });
        if (kind === 'normal' || kind === 'angry') {
          ctx.fillStyle = A.c(atk || m.angry ? '#ffd84a' : '#ffffff');
          ctx.beginPath();
          ctx.arc(x + 0.8 * k, hy - 3.8 * k, 1.6 * k, 0, TAU);
          ctx.fill();
        } else {
          ctx.save();
          ctx.globalAlpha *= 1;
          A.eye(ctx, x, hy - 3.5 * k, 2.4, 2.2, kind);
          ctx.restore();
        }
      });
      if (!m.dead) {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        const ang = m.angry || atk ? 2 : 0;
        ctx.beginPath();
        ctx.moveTo(fx - 9 * k, hy - 8.5 * k);
        ctx.lineTo(fx - 2 * k, hy - 7.5 * k + ang);
        ctx.moveTo(fx + 2 * k, hy - 7.5 * k + ang);
        ctx.lineTo(fx + 9 * k, hy - 8.5 * k);
        ctx.stroke();
      }
    }
    if (s === 1) {
      // 頭上的毛巾
      A.shape(ctx, (c) => {
        c.moveTo(-hr * 0.85, hy - hr * 0.5);
        c.quadraticCurveTo(-2, hy - hr * 1.4, hr * 0.8, hy - hr * 0.6);
        c.lineTo(hr * 0.6, hy - hr * 0.3);
        c.quadraticCurveTo(0, hy - hr * 0.85, -hr * 0.75, hy - hr * 0.25);
        c.closePath();
      }, '#ffffff', '#dfe6ee', { cel: [1.5, 1.5], lw: 2.4 });
      ctx.strokeStyle = A.c('#5aaede');
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.6, hy - hr * 0.7);
      ctx.quadraticCurveTo(0, hy - hr * 1.14, hr * 0.55, hy - hr * 0.72);
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-hr * 0.85, hy - hr * 0.5); c.lineTo(-hr * 1.15, hy - hr * 0.05); c.lineTo(-hr * 0.72, hy - hr * 0.27); c.closePath(); }, '#ffffff', null, { lw: 2 });
    }
    // 前手：攻擊時舉起來丟東西
    const armUp = atk && m.attackPhase !== 'strike';
    const ax = armUp ? 17 * k : 11 * k;
    const ay = armUp ? -40 * k : -15 * k - step;
    if (armUp) {
      limb(ctx, (c) => { c.moveTo(7 * k, -19 * k); c.quadraticCurveTo(15 * k, -24 * k, ax, ay + 4 * k); }, 6 * Math.min(k, 1.3), pal[0]);
      if (s === 1) A.ellipse(ctx, ax, ay - 5 * k, 4.5, 4, '#b0a498', '#8a8078', { lw: 2, hl: false, cel: [1.5, 1.5] });
    }
    A.ellipse(ctx, ax, ay, 4 * k, 4.5 * k, pal[0], pal[1], { lw: 2.2, hl: false, rot: -0.3 });
    ctx.restore();
  }

  // ═════════════ Boss 共用：自然巨獸的小工具 ═════════════
  // 發光（顏色經過 A.c()，閃白／殘影染色時才一致）
  function glowC(ctx, x, y, r, hex, a) {
    if (!(a > 0) || !(r > 0)) return;
    const rgb = U.hexToRgb(A.c(hex)).join(',');
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  // 兩端圓頭、粗細漸變的一節（腳、手臂、脖子）
  function seg(ctx, ax, ay, bx, by, w0, w1, col, sh, opts) {
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    const th = Math.atan2(ny, nx);
    A.shape(ctx, (c) => {
      c.moveTo(ax + nx * w0, ay + ny * w0);
      c.lineTo(bx + nx * w1, by + ny * w1);
      c.arc(bx, by, w1, th, th - PI, true);
      c.lineTo(ax - nx * w0, ay - ny * w0);
      c.arc(ax, ay, w0, th + PI, th, true);
      c.closePath();
    }, col, sh, Object.assign({ cel: sh ? [Math.max(1.5, w1 * 0.3), Math.max(1.5, w1 * 0.3)] : null, lw: 2.8 }, opts || {}));
  }
  // 藤壺：小火山口形的白色殼
  function barnacle(ctx, x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => {
      c.moveTo(-r, r * 0.35);
      c.lineTo(-r * 0.55, -r * 0.75);
      c.lineTo(r * 0.55, -r * 0.75);
      c.lineTo(r, r * 0.35);
      c.quadraticCurveTo(0, r * 0.7, -r, r * 0.35);
      c.closePath();
    }, '#eee4cc', '#bfb094', { cel: [r * 0.25, r * 0.2], lw: Math.min(2.2, 1 + r * 0.25) });
    ctx.fillStyle = A.c('#5a4a3e');
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.72, r * 0.42, r * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 小海鷗（站著或飛）
  function tinyGull(ctx, x, y, s, flap, fly) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (fly) {
      const f = Math.sin(flap) * 5;
      limb(ctx, (c) => { c.moveTo(-12, -2 - f); c.quadraticCurveTo(-6, -8 - f * 0.4, 0, 0); c.quadraticCurveTo(6, -8 - f * 0.4, 12, -2 - f); }, 4.5, '#ffffff');
      A.ellipse(ctx, 0, 0, 3.4, 2.4, '#ffffff', null, { lw: 1.6, hl: false });
    } else {
      A.shape(ctx, (c) => { c.moveTo(-8, 0); c.quadraticCurveTo(-7, -9, 2, -8); c.quadraticCurveTo(8, -6, 7, 0); c.quadraticCurveTo(0, 3, -8, 0); c.closePath(); }, '#ffffff', '#dfe4ea', { lw: 1.8, shadeY: -2 });
      A.shape(ctx, (c) => { c.moveTo(-9, -3); c.quadraticCurveTo(-3, -8, 3, -4); c.quadraticCurveTo(-2, -1, -9, -3); c.closePath(); }, '#9aa6b4', null, { lw: 1.6 });
      A.ellipse(ctx, 4, -11 + Math.sin(flap) * 0.8, 4, 3.6, '#ffffff', null, { lw: 1.8, hl: false });
      A.shape(ctx, (c) => { c.moveTo(7, -11); c.lineTo(12, -10); c.lineTo(7, -9); c.closePath(); }, '#ffb13a', null, { lw: 1.2 });
      ctx.fillStyle = A.c('#2b1a12');
      ctx.beginPath();
      ctx.arc(5, -12, 0.9, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // 海草一束（會擺）
  function kelp(ctx, x, y, len, t, ph, col) {
    const sw = Math.sin(t * 1.6 + ph) * len * 0.18;
    limb(ctx, (c) => {
      c.moveTo(x, y);
      c.bezierCurveTo(x - 4 + sw * 0.3, y + len * 0.35, x + 5 + sw * 0.7, y + len * 0.65, x + sw, y + len);
    }, 5.5, col || '#4f9a52');
  }
  // 珊瑚（分岔的枝）
  function coral(ctx, x, y, s, col, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.scale(s, s);
    limb(ctx, (c) => {
      c.moveTo(0, 0);
      c.quadraticCurveTo(-1, -9, -7, -16);
      c.moveTo(-1, -7);
      c.quadraticCurveTo(4, -12, 6, -20);
      c.moveTo(-5, -13);
      c.lineTo(-12, -15);
      c.moveTo(4, -14);
      c.lineTo(10, -14);
    }, 5.5, col);
    ctx.restore();
  }

  // ═════════════ Boss：潮汐寄居蟹 ═════════════
  // 遠古的潮汐巨蟹：背上扛著一整座海崖（螺旋岩殼上長著青草、海鳥窩、小瀑布、海草、珊瑚與藤壺），
  // 崖頂是老燈塔。巨鉗長滿藤壺，濃白眉毛、長長的觸鬚，還是那個愛現、一直在笑的老蟹。
  // 設計座標 = 世界座標（h=250），原點在腳底中央、面向右；燈室約在 (-32,-230)，縮殼時在 (0,-215)，對應 boss2.js 的光束起點。
  function hermitCrab(ctx, m) {
    const t = m.t || 0;
    const st = m.state;
    const GA = ctx.globalAlpha;
    const shell = st === 'shell';
    const dead = !!m.dead;
    const p2 = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    const K = (m.h || 250) / 250;
    const CAR = ['#d4553c', '#9c3226'];
    const CAR2 = '#b8402f';
    let sy = 1 + Math.sin(t * 2.2) * 0.012;
    if (st === 'tidePrep' || st === 'clawPrep' || st === 'perchPrep' || st === 'flopPrep') sy = 0.95;
    if (st === 'beam' || st === 'tsunami') sy = 1 + Math.abs(Math.sin(t * 14)) * 0.035;
    if (st === 'recover') sy = 0.93;
    if (!m.onGround) sy = m.vy < 0 ? 1.06 : 0.98;
    const trem = st === 'tidePrep' || st === 'transform' || st === 'tsunamiPrep' ? Math.sin(t * 45) * 2.5 : 0;
    const walk = st === 'move' || st === 'walk' || st === 'intro' || st === 'clawPrep';
    const fast = Math.abs(m.vx || 0) > 60;
    const laugh = !dead && (st === 'beam' || st === 'tsunami' || st === 'barrage' || st === 'summon' || (st === 'transform' && Math.sin(t * 12) > 0));
    const fierce = p2 > 0.5 || st === 'clawPrep' || st === 'tidePrep' || st === 'beamPrep' || st === 'tsunamiPrep' || st === 'flopPrep';
    const kind = bossEyeKind(m, fierce);
    const hot = !dead && (p2 > 0.5 || st === 'beamPrep' || st === 'beam');
    const lampOn = dead ? 0 : hot || shell ? 1 : 0.6 + Math.sin(t * 3) * 0.2;
    const lampCol = p2 > 0.5 ? '#ffb060' : '#fff0a8';

    ctx.save();
    ctx.scale(K, K);
    // 對話框頭像（Boss 的複本放在原點）：往後挪，讓臉在框裡
    if (m.x === 0 && m.y === 0 && st === 'recover') ctx.translate(-48, 0);
    ctx.fillStyle = 'rgba(20,30,40,0.2)';
    ctx.beginPath();
    ctx.ellipse(10, 0, 150, 18, 0, 0, TAU);
    ctx.fill();

    // 第二階段：腳邊捲起潮水
    const tideRing = (front) => {
      if (!(p2 > 0) || dead) return;
      ctx.save();
      ctx.globalAlpha = GA * p2;
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.7 + i / 3) % 1;
        const rx = 120 + q * 60;
        ctx.globalAlpha = GA * p2 * (1 - q) * (front ? 0.85 : 0.5);
        ctx.strokeStyle = A.c(front ? '#ffffff' : '#7fd0f4');
        ctx.lineWidth = front ? 3 : 5;
        ctx.beginPath();
        ctx.ellipse(10, -4, rx, 18 + q * 8, 0, front ? 0.15 : PI + 0.15, front ? PI - 0.15 : TAU - 0.15);
        ctx.stroke();
      }
      ctx.globalAlpha = GA * p2;
      // 拍上岩殼的浪頭（後面一道、前面一道）
      const wv = (x, d, ph, h) => {
        const k = 0.6 + 0.4 * Math.sin(t * 3 + ph);
        const H = h * k;
        ctx.save();
        ctx.translate(x, 0);
        ctx.scale(d, 1);
        A.shape(ctx, (c) => {
          c.moveTo(-40, 2);
          c.quadraticCurveTo(-30, -H * 0.7, 0, -H);
          c.quadraticCurveTo(22, -H * 1.06, 28, -H * 0.7);
          c.quadraticCurveTo(14, -H * 0.78, 12, -H * 0.5);
          c.quadraticCurveTo(24, -H * 0.2, 30, 2);
          c.closePath();
        }, '#4aa8e8', '#2a78c0', { lw: 2.8, shadeY: -H * 0.35 });
        A.shape(ctx, (c) => {
          c.moveTo(-8, -H * 0.94);
          c.quadraticCurveTo(12, -H * 1.12, 26, -H * 0.74);
          c.quadraticCurveTo(12, -H * 0.86, -8, -H * 0.94);
          c.closePath();
        }, '#ffffff', null, { lw: 2 });
        for (let i = 0; i < 3; i++) A.ellipse(ctx, 18 + i * 6, -H * (0.9 - i * 0.12) - Math.sin(t * 8 + i) * 3, 4 - i, 4 - i, '#ffffff', null, { lw: 1.6, hl: false });
        ctx.restore();
      };
      if (front) {
        wv(-150, 1, 0, 58);
        wv(170, -1, 2, 46);
      } else {
        wv(-90, 1, 1.2, 80);
        wv(120, -1, 3.1, 64);
      }
      ctx.restore();
    };
    tideRing(false);

    ctx.translate(trem, 0);
    ctx.scale(1 / Math.sqrt(sy), sy);

    if (p2 > 0 && !dead) {
      glowC(ctx, -20, -130, 230, '#ff8a3c', (0.2 + Math.sin(t * 5) * 0.05) * p2);
      glowC(ctx, 40, -40, 160, '#5ac8ff', 0.16 * p2);
    }

    // ─── 海崖岩殼（base 在殼底中央；燈室在 base 上方 210）───
    const cliffPath = (c) => {
      c.moveTo(-98, 2);
      c.bezierCurveTo(-122, -34, -118, -92, -86, -118);
      c.lineTo(-74, -122);
      c.lineTo(-66, -136);
      c.lineTo(-52, -134);
      c.lineTo(-40, -148);
      c.lineTo(-22, -151);
      c.lineTo(22, -151);
      c.lineTo(32, -143);
      c.lineTo(44, -144);
      c.lineTo(54, -126);
      c.bezierCurveTo(78, -106, 94, -62, 90, -26);
      c.quadraticCurveTo(88, -2, 64, 6);
      c.quadraticCurveTo(-18, 16, -98, 2);
      c.closePath();
    };
    const drawCliff = (bx0, by0, lean, withdrawn) => {
      ctx.save();
      ctx.translate(bx0, by0);
      ctx.rotate(lean);
      ctx.save();
      ctx.scale(1.15, 1.2);
      // 背面的橘色扇形珊瑚、海草（在岩殼後面）
      coral(ctx, -100, -18, 1.5, '#ff9a5a', -0.7);
      coral(ctx, 84, -14, 1.2, '#ff7a9a', 0.5);
      // 背上的海蝕岩柱（長了一棵老松）
      const spire = (c) => {
        c.moveTo(-100, -80);
        c.lineTo(-104, -128);
        c.lineTo(-96, -134);
        c.lineTo(-100, -160);
        c.lineTo(-90, -176);
        c.lineTo(-76, -178);
        c.lineTo(-70, -160);
        c.lineTo(-72, -140);
        c.lineTo(-60, -120);
        c.lineTo(-50, -100);
        c.closePath();
      };
      A.shape(ctx, spire, '#858a96', '#5a5f6e', { cel: [5, 4], lw: 3.4 });
      ctx.strokeStyle = A.c('#a89c86');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-100, -150);
      ctx.lineTo(-74, -154);
      ctx.moveTo(-102, -122);
      ctx.lineTo(-68, -128);
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-92, -176); c.quadraticCurveTo(-84, -184, -74, -178); c.quadraticCurveTo(-80, -172, -92, -176); c.closePath(); }, '#72b04e', '#4e8a3a', { lw: 2.2, shadeY: -176 });
      if (!dead) {
        limb(ctx, (c) => { c.moveTo(-82, -180); c.quadraticCurveTo(-84, -192, -92, -200); }, 4.5, '#7a5a3a');
        [[-92, -202, 11], [-86, -194, 9], [-98, -196, 8]].forEach(([x, y, r], i) => A.shape(ctx, (c) => { c.moveTo(x - r, y + 3); c.lineTo(x, y - r * 0.7); c.lineTo(x + r, y + 3); c.closePath(); }, i ? '#4e8a4a' : '#5a9a52', null, { lw: 2 }));
      }
      A.shape(ctx, cliffPath, '#8e929c', '#5f6474', { cel: [10, 8], noStroke: true });
      ctx.save();
      ctx.beginPath();
      cliffPath(ctx);
      ctx.clip();
      // 岩層（砂岩帶）
      [[-18, 10, '#b3a58c'], [-56, 8, '#a39a8c'], [-96, 9, '#b3a58c'], [-128, 6, '#9a9690']].forEach(([y, h, col], i) => {
        ctx.fillStyle = A.c(col);
        ctx.beginPath();
        ctx.moveTo(-140, y);
        ctx.quadraticCurveTo(-40, y - 10 - i * 2, 0, y - 4);
        ctx.quadraticCurveTo(50, y + 2, 120, y - 10);
        ctx.lineTo(120, y - 10 + h);
        ctx.quadraticCurveTo(50, y + 2 + h, 0, y - 4 + h);
        ctx.quadraticCurveTo(-40, y - 10 - i * 2 + h, -140, y + h);
        ctx.closePath();
        ctx.fill();
      });
      // 右下的陰影再壓一次（岩層不能蓋掉月牙陰影）
      ctx.fillStyle = A.c('rgba(70,60,52,0.28)');
      ctx.beginPath();
      ctx.moveTo(40, -150);
      ctx.bezierCurveTo(96, -100, 112, -40, 70, 20);
      ctx.lineTo(140, 20);
      ctx.lineTo(140, -150);
      ctx.closePath();
      ctx.fill();
      // 螺旋殼紋（凸起的岩稜）
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let a = 0; a <= 4.6 * PI; a += 0.12) {
        const r = 6 + a * 4.6;
        const x = -44 + Math.cos(a + 2.2) * r;
        const y = -66 + Math.sin(a + 2.2) * r * 0.9;
        a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = A.c('#c8bea8');
      ctx.lineWidth = 3;
      ctx.stroke();
      // 岩面裂紋
      ctx.strokeStyle = A.c('#5a544c');
      ctx.lineWidth = 2;
      ctx.beginPath();
      [[-92, -40, -80, -30, -84, -18], [58, -96, 66, -84, 62, -72], [30, -40, 42, -34, 40, -22], [-70, -104, -60, -100, -62, -92], [4, -128, 12, -120, 8, -110]].forEach(([a, b, c2, d, e, f]) => {
        ctx.moveTo(a, b);
        ctx.lineTo(c2, d);
        ctx.lineTo(e, f);
      });
      ctx.stroke();
      // 第二階段：葉子的力量從岩縫透出來
      if (p2 > 0 && !dead) {
        ctx.globalAlpha = GA * p2;
        ctx.strokeStyle = A.c('#ffb34a');
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-100, -60);
        ctx.lineTo(-82, -66);
        ctx.lineTo(-76, -50);
        ctx.lineTo(-60, -46);
        ctx.moveTo(60, -110);
        ctx.lineTo(70, -90);
        ctx.lineTo(64, -70);
        ctx.lineTo(76, -54);
        ctx.stroke();
        ctx.globalAlpha = GA;
      }
      // 底部被海水沖刷的深色潮線＋苔藻
      ctx.fillStyle = A.c('#5d7a5a');
      ctx.beginPath();
      ctx.moveTo(-130, -8);
      for (let x = -130; x <= 110; x += 12) ctx.quadraticCurveTo(x + 6, -18 + Math.sin(x) * 4, x + 12, -8);
      ctx.lineTo(110, 30);
      ctx.lineTo(-130, 30);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      cliffPath(ctx);
      ctx.lineWidth = 3.8;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.stroke();

      // 崖頂的草皮
      A.shape(ctx, (c) => {
        c.moveTo(-72, -122);
        c.lineTo(-66, -136);
        c.lineTo(-52, -134);
        c.lineTo(-40, -148);
        c.lineTo(-22, -151);
        c.lineTo(22, -151);
        c.lineTo(32, -143);
        c.lineTo(44, -144);
        c.lineTo(50, -133);
        c.quadraticCurveTo(44, -128, 38, -134);
        c.quadraticCurveTo(30, -126, 22, -138);
        c.quadraticCurveTo(10, -132, 0, -140);
        c.quadraticCurveTo(-14, -132, -24, -141);
        c.quadraticCurveTo(-34, -128, -44, -136);
        c.quadraticCurveTo(-54, -120, -62, -128);
        c.quadraticCurveTo(-68, -116, -72, -122);
        c.closePath();
      }, dead ? '#8a9a70' : '#72b04e', '#4e8a3a', { cel: [2, 3], lw: 2.8 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      [[-56, -134], [-30, -150], [-6, -151], [36, -144], [-47, -145]].forEach(([x, y], i) => {
        const sw = Math.sin(t * 2 + i) * 1.5;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3 + sw, y - 8);
        ctx.moveTo(x + 2, y);
        ctx.lineTo(x + 5 + sw, y - 7);
      });
      ctx.stroke();

      // 小瀑布：從崖頂流下來
      if (!dead) {
        const fall = (c) => {
          c.moveTo(36, -140);
          c.bezierCurveTo(50, -130, 60, -110, 64, -86);
        };
        ctx.lineCap = 'round';
        ctx.beginPath();
        fall(ctx);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 9;
        ctx.stroke();
        ctx.strokeStyle = A.c('#8fd6f6');
        ctx.lineWidth = 5.5;
        ctx.stroke();
        ctx.setLineDash([7, 11]);
        ctx.lineDashOffset = -t * 60;
        ctx.strokeStyle = A.c('#f4fcff');
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        for (let i = 0; i < 3; i++) {
          const q = (t * 1.5 + i / 3) % 1;
          ctx.globalAlpha = GA * (1 - q);
          A.ellipse(ctx, 64 + (i - 1) * 7 * q, -84 - q * 8, 4 + q * 3, 3 + q * 2, '#ffffff', null, { lw: 1.4, hl: false });
        }
        ctx.globalAlpha = GA;
      }

      // 背後的圓窗（縮殼時的弱點，會發光）
      const win = withdrawn ? 0.7 + Math.sin(t * 10) * 0.3 : 0;
      if (withdrawn) glowC(ctx, -74, -70, 70, '#ffe070', 0.55 * win + 0.3);
      A.ellipse(ctx, -74, -70, 17, 18, '#6a5a4a', '#4a3e34', { lw: 3, hl: false, cel: [2, 2] });
      A.shape(ctx, (c) => c.arc(-74, -70, 11, 0, TAU), withdrawn ? U.mix('#ffd84a', '#fffbe0', win) : '#35608e', null, { lw: 2.6 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-85, -70);
      ctx.lineTo(-63, -70);
      ctx.moveTo(-74, -81);
      ctx.lineTo(-74, -59);
      ctx.stroke();
      if (!withdrawn) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(-78, -74, 2.6, 0, TAU);
        ctx.fill();
      }
      // 藤壺群
      [[-104, -30, 6, -0.6], [-96, -18, 4.5, -0.5], [-108, -48, 4, -0.8], [-86, -8, 5, -0.2], [-62, -4, 4, 0], [20, -2, 4.5, 0.1], [82, -40, 5, 0.9], [86, -28, 4, 1.1], [-60, -112, 4, -0.5]].forEach(([x, y, r, a]) => barnacle(ctx, x, y, r, a));
      // 海草從殼底垂下
      [[-96, -2, 20, 0], [-70, 6, 24, 1.3], [-30, 10, 18, 2.2], [40, 8, 16, 3.1]].forEach(([x, y, l, ph], i) => kelp(ctx, x, y - 8, l, t, ph, i % 2 ? '#4f9a52' : '#3f8a6a'));
      // 珊瑚（前面的）
      coral(ctx, -86, -2, 1.1, '#ff6f8a', -0.3);
      coral(ctx, 56, 2, 0.9, '#ffb04a', 0.3);
      // 殼底的浪花泡沫
      [[-108, 0, 9], [-90, 6, 7], [-60, 10, 8], [-30, 12, 6], [70, 6, 8], [88, 0, 6]].forEach(([x, y, r], i) => {
        const b = Math.sin(t * 3 + i) * 1.2;
        A.ellipse(ctx, x, y + b, r, r * 0.7, '#ffffff', '#d8eef8', { lw: 1.8, hl: false });
      });
      // 縮殼：前面的洞穴口，裡面的眼睛在偷看
      if (withdrawn) {
        A.shape(ctx, (c) => { c.moveTo(34, 4); c.bezierCurveTo(30, -40, 80, -46, 84, -4); c.quadraticCurveTo(60, 8, 34, 4); c.closePath(); }, '#2a1a18', null, { lw: 3 });
        if (!dead) {
          const pk = Math.sin(t * 3) > 0 ? 3 : 0;
          const bl = Math.sin(t * 1.3) > 0.9;
          [[52 + pk, -18], [66 + pk, -19]].forEach(([x, y]) => {
            if (bl) {
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x - 4, y);
              ctx.lineTo(x + 4, y);
              ctx.stroke();
            } else {
              ctx.fillStyle = A.c('#fff6d0');
              ctx.beginPath();
              ctx.ellipse(x, y, 4, 5, 0, 0, TAU);
              ctx.fill();
              ctx.fillStyle = A.c('#2b1a12');
              ctx.beginPath();
              ctx.arc(x + 1, y + 1, 2, 0, TAU);
              ctx.fill();
            }
          });
        }
      }

      // 海鳥窩＋海鷗（第二階段被燈光嚇飛，在上面盤旋）
      A.shape(ctx, (c) => { c.moveTo(-76, -124); c.quadraticCurveTo(-70, -114, -56, -118); c.lineTo(-54, -126); c.quadraticCurveTo(-66, -122, -76, -124); c.closePath(); }, '#a07a4a', '#7a5a34', { lw: 2.2, shadeY: -120 });
      ctx.strokeStyle = A.c('#6a4a2a');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-76, -123);
      ctx.lineTo(-58, -121);
      ctx.moveTo(-74, -120);
      ctx.lineTo(-60, -124);
      ctx.stroke();
      A.ellipse(ctx, -68, -127, 3.4, 4, '#f4f0e0', null, { lw: 1.6, hl: false });
      A.ellipse(ctx, -62, -127, 3, 3.6, '#e8f0f4', null, { lw: 1.6, hl: false });
      if (dead || !(p2 > 0.5 || st === 'tsunami' || st === 'transform')) {
        tinyGull(ctx, 34, -142, 0.9, t * 2, false);
        tinyGull(ctx, -46, -147, 0.8, t * 2 + 1, false);
      }
      // 殼口（寄居蟹從這裡探出身體）
      if (!withdrawn) {
        A.shape(ctx, (c) => { c.moveTo(22, 8); c.bezierCurveTo(14, -66, 96, -80, 94, -8); c.quadraticCurveTo(60, 10, 22, 8); c.closePath(); }, '#2a1a18', null, { lw: 3 });
        limb(ctx, (c) => { c.moveTo(20, 6); c.bezierCurveTo(12, -68, 98, -84, 95, -8); }, 9, '#b8b2a8');
      }
      ctx.restore();
      ctx.translate(0, -30);
      // ─ 燈塔（崖頂）─
      const tower = (c) => {
        c.moveTo(-16, -150);
        c.lineTo(-11, -192);
        c.lineTo(11, -192);
        c.lineTo(16, -150);
        c.closePath();
      };
      A.shape(ctx, tower, '#fff4e4', null, { noStroke: true });
      ctx.save();
      ctx.beginPath();
      tower(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#d8443a');
      ctx.fillRect(-30, -183, 60, 10);
      ctx.fillRect(-30, -165, 60, 10);
      ctx.fillStyle = 'rgba(90,30,20,0.2)';
      ctx.fillRect(5, -200, 20, 60);
      ctx.restore();
      ctx.beginPath();
      tower(ctx);
      ctx.lineWidth = 3;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-4, -150); c.lineTo(-4, -158); c.arc(0, -158, 4, PI, 0); c.lineTo(4, -150); c.closePath(); }, '#5a3a2a', null, { lw: 2 });
      // 陽台欄杆
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-17, -200);
      ctx.lineTo(17, -200);
      for (let i = -3; i <= 3; i++) {
        ctx.moveTo(i * 5.4, -200);
        ctx.lineTo(i * 5.4, -194);
      }
      ctx.stroke();
      A.shape(ctx, (c) => A.roundRect(c, -19, -195, 38, 5, 2), '#4a4050', null, { lw: 2.4 });
      // 燈光
      if (lampOn > 0) {
        glowC(ctx, 0, -210, hot ? 120 : 60, lampCol, (hot ? 0.85 : 0.55) * lampOn);
        if (p2 > 0.3 && !withdrawn) {
          ctx.save();
          ctx.globalAlpha = GA * 0.26 * p2;
          ctx.fillStyle = A.c('#ffd08a');
          ctx.translate(0, -210);
          ctx.rotate(t * 2.4);
          for (let k2 = 0; k2 < 2; k2++) {
            ctx.rotate(PI);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(330, -52);
            ctx.lineTo(330, 52);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = GA * (hot ? 0.34 : 0.2) * lampOn;
        ctx.fillStyle = A.c(p2 > 0.5 ? '#ffc070' : '#fff0b0');
        ctx.translate(0, -210);
        ctx.rotate(Math.sin(t * (hot ? 3 : 1.2)) * 0.35);
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(240, -46);
        ctx.lineTo(240, 36);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      A.shape(ctx, (c) => A.roundRect(c, -12, -222, 24, 18, 3), U.mix(U.mix('#9ab8d0', '#fff2a8', lampOn), '#ffb070', p2 * 0.6), U.mix('#7a98b0', '#ffd860', lampOn), { lw: 2.6, shadeY: -210 });
      if (lampOn > 0) {
        ctx.globalAlpha = GA * lampOn;
        A.ellipse(ctx, 0, -212, 5, 6, '#fffbe6', null, { noStroke: true, hl: false });
        ctx.globalAlpha = GA;
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, -222);
      ctx.lineTo(-4, -204);
      ctx.moveTo(4, -222);
      ctx.lineTo(4, -204);
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-16, -220); c.quadraticCurveTo(0, -240, 16, -220); c.closePath(); }, '#d8443a', '#a8322a', { cel: [2.5, 2], lw: 2.6 });
      A.ellipse(ctx, 0, -236, 3, 3, '#ffd35a', null, { lw: 1.8, hl: false });

      const birdsUp = !dead && (p2 > 0.5 || st === 'tsunami' || st === 'transform');
      if (birdsUp) {
        for (let i = 0; i < 3; i++) {
          const a = t * 1.3 + (i * TAU) / 3;
          tinyGull(ctx, Math.cos(a) * 60, -262 + Math.sin(a) * 12 + i * 6, 1 - i * 0.12, t * 10 + i, true);
        }
      }
      ctx.restore();
    };

    if (shell) {
      // 整隻縮進岩殼：海崖在搖，只剩圓窗在發光
      drawCliff(0, -5, Math.sin(t * 6) * 0.025, true);
      tideRing(true);
      ctx.restore();
      return;
    }

    // ─── 姿勢 ───
    const bx = 62;
    const by = -106 + (walk ? -Math.abs(Math.sin(t * 8)) * 3 : 0);
    let big = { x: 165, y: -92, r: 40, rot: -0.25, open: 0.35 + Math.sin(t * 3) * 0.1 };
    let small = { x: 136, y: -34, r: 20, rot: 0.1, open: 0.3 };
    if (st === 'tidePrep') {
      big = { x: 178, y: -178, r: 40, rot: -1.1, open: 0.8 };
      small = { x: 30, y: -186, r: 22, rot: -1.9, open: 0.8 };
    } else if (st === 'tide') {
      big = { x: 214, y: -40, r: 40, rot: 0.35, open: 0.2 };
      small = { x: 180, y: -18, r: 21, rot: 0.25, open: 0.2 };
    } else if (st === 'clawPrep') {
      big = { x: 172, y: -214, r: 45, rot: -1.45, open: 1 };
    } else if (st === 'clawSlam') {
      big = { x: 212, y: -36, r: 45, rot: 0.45, open: 0 };
    } else if (st === 'tsunamiPrep' || st === 'tsunami' || st === 'barrage' || st === 'beamPrep' || st === 'transform' || st === 'summon') {
      const w2 = Math.sin(t * (st === 'tsunami' || st === 'barrage' ? 10 : 4)) * 11;
      big = { x: 162, y: -186 + w2, r: 42, rot: -1.25, open: 0.8 + Math.sin(t * 8) * 0.2 };
      small = { x: 50, y: -176 - w2, r: 22, rot: -1.8, open: 0.8 };
    } else if (st === 'beam') {
      big = { x: 172, y: -60 + Math.sin(t * 14) * 5, r: 41, rot: 0.3, open: 0.6 + Math.sin(t * 14) * 0.3 };
      small = { x: 136, y: -24, r: 21, rot: 0.3, open: 0.5 };
    } else if (st === 'flopAir' || st === 'perchAir' || st === 'fall') {
      big = { x: 176, y: -148, r: 41, rot: -0.8, open: 0.9 };
      small = { x: 142, y: -90, r: 21, rot: -0.6, open: 0.8 };
    } else if (st === 'recover' || dead) {
      big = { x: 165, y: -44, r: 40, rot: 0.4, open: 0.5 };
      small = { x: 130, y: -20, r: 20, rot: 0.4, open: 0.5 };
    }
    const air = st === 'flopAir' || st === 'perchAir' || st === 'fall' || !m.onGround;

    // ─ 腳：多節、關節有刺、腳尖深色 ─
    const legs = (near) => {
      for (let i = 0; i < 2; i++) {
        const ph = t * (fast ? 22 : 8) + i * 2.4 + (near ? PI * 0.5 : 0);
        const lift = walk ? Math.max(0, Math.sin(ph)) * (fast ? 16 : 11) : 0;
        const sw = walk ? Math.cos(ph) * 6 : 0;
        const x0 = near ? bx - 28 + i * 50 : bx - 10 + i * 44;
        const y0 = by + (near ? 36 : 30);
        const kx = x0 + (near ? 26 : 22);
        const ky = (near ? -40 : -46) - lift * 0.6 - (air ? 22 : 0);
        const fx = x0 + (near ? 14 : 12) + sw;
        const fy = (air ? -30 : -2) - lift;
        const w = near ? 13 : 11;
        const col = near ? CAR[0] : '#a8402f';
        const sh = near ? CAR[1] : '#7a2a20';
        seg(ctx, x0, y0, kx, ky, w, w * 0.85, col, sh);
        seg(ctx, kx, ky, fx, fy, w * 0.85, 4.5, col, sh);
        // 腳上的環節線
        ctx.strokeStyle = A.c(sh);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let j = 1; j <= 2; j++) {
          const u = j / 3;
          const px = kx + (fx - kx) * u;
          const py = ky + (fy - ky) * u;
          ctx.moveTo(px - w * 0.6, py - 2);
          ctx.lineTo(px + w * 0.5, py + 2);
        }
        ctx.stroke();
        // 腳尖
        const dx = fx - kx;
        const dy = fy - ky;
        const L = Math.hypot(dx, dy) || 1;
        A.shape(ctx, (c) => {
          c.moveTo(fx - (dy / L) * 4.5 - (dx / L) * 14, fy + (dx / L) * 4.5 - (dy / L) * 14);
          c.lineTo(fx + (dx / L) * 5, fy + (dy / L) * 5);
          c.lineTo(fx + (dy / L) * 4.5 - (dx / L) * 14, fy - (dx / L) * 4.5 - (dy / L) * 14);
          c.closePath();
        }, '#3a1c18', null, { lw: 2 });
        // 關節上的刺
        A.shape(ctx, (c) => { c.moveTo(kx - 6, ky - 3); c.lineTo(kx + 2, ky - 16); c.lineTo(kx + 6, ky - 3); c.closePath(); }, col, null, { lw: 2 });
        A.ellipse(ctx, kx, ky, w, w * 0.9, col, sh, { lw: 2.4, hl: false, cel: [2, 2] });
      }
    };
    // 觸鬚（長長往後飄，像老人的長鬍）
    const e1 = [bx + 20 + Math.sin(t * 2.5) * 2, by - 76];
    const e2 = [bx + 60 + Math.sin(t * 2.5 + 0.5) * 2, by - 66];
    if (!dead) {
      const aw = Math.sin(t * 1.7) * 10;
      limb(ctx, (c) => {
        c.moveTo(bx + 46, by - 30);
        c.bezierCurveTo(bx + 60, by - 110, bx - 10, by - 130 + aw, bx - 80, by - 100 + aw * 1.5);
        c.moveTo(bx + 50, by - 28);
        c.bezierCurveTo(bx + 96, by - 96, bx + 30, by - 130 - aw, bx - 20, by - 134 - aw);
      }, 4.5, '#e87a5a');
    }

    drawCliff(-34, -8, -0.04, false);
    legs(false);
    // 小螯（在殼與身體之間）
    seg(ctx, bx + 30, by + 14, small.x - 12, small.y + 4, 9, 8, CAR2, CAR[1]);
    titanClaw(ctx, small.x, small.y, small.r, small.open, small.rot, false);


    // 眼柄
    seg(ctx, bx + 18, by - 30, e1[0], e1[1] + 8, 7, 5.5, CAR[0], CAR[1]);
    seg(ctx, bx + 50, by - 26, e2[0], e2[1] + 8, 7, 5.5, CAR[0], CAR[1]);

    // ─ 甲殼 ─
    const body = (c) => {
      c.moveTo(bx - 66, by + 22);
      c.bezierCurveTo(bx - 74, by - 30, bx - 30, by - 58, bx + 12, by - 56);
      c.bezierCurveTo(bx + 50, by - 58, bx + 86, by - 30, bx + 84, by + 10);
      c.lineTo(bx + 76, by + 16);
      c.lineTo(bx + 78, by + 26);
      c.quadraticCurveTo(bx + 60, by + 46, bx + 20, by + 44);
      c.lineTo(bx + 12, by + 52);
      c.lineTo(bx + 2, by + 44);
      c.quadraticCurveTo(bx - 40, by + 44, bx - 66, by + 22);
      c.closePath();
    };
    A.shape(ctx, body, CAR[0], CAR[1], { cel: [10, 9], noStroke: true });
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    // 腹側較深的甲片
    ctx.fillStyle = A.c('#ad3a2c');
    ctx.beginPath();
    ctx.moveTo(bx - 80, by + 14);
    ctx.quadraticCurveTo(bx, by + 4, bx + 96, by + 8);
    ctx.lineTo(bx + 96, by + 60);
    ctx.lineTo(bx - 80, by + 60);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = A.c('#7e261e');
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const x = bx - 44 + i * 26;
      ctx.moveTo(x, by + 12);
      ctx.quadraticCurveTo(x + 4, by + 28, x - 2, by + 46);
    }
    ctx.stroke();
    // 甲殼上的稜線與古老的斑紋
    ctx.fillStyle = A.c('#e87a5c');
    ctx.beginPath();
    ctx.ellipse(bx - 6, by - 36, 48, 12, -0.08, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = A.c('#8a2a22');
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(bx - 60, by + 4);
    ctx.quadraticCurveTo(bx, by - 18, bx + 80, by + 2);
    ctx.moveTo(bx - 20, by - 50);
    ctx.quadraticCurveTo(bx - 14, by - 30, bx - 22, by - 12);
    ctx.stroke();
    ctx.fillStyle = A.c('#f39a7a');
    [[-40, -26, 5], [-26, -40, 4], [-50, -8, 3.5], [8, -44, 3.5], [-30, -14, 3]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(bx + x, by + y, r, 0, TAU); ctx.fill(); });
    ctx.fillStyle = A.c('#8e2e24');
    [[40, 26, 4], [58, 18, 3], [20, 32, 3.5]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(bx + x, by + y, r, 0, TAU); ctx.fill(); });
    if (p2 > 0 && !dead) {
      ctx.globalAlpha = GA * p2;
      ctx.strokeStyle = A.c('#ffc04a');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx - 50, by + 20);
      ctx.lineTo(bx - 36, by + 6);
      ctx.lineTo(bx - 42, by - 10);
      ctx.moveTo(bx - 36, by + 6);
      ctx.lineTo(bx - 20, by + 10);
      ctx.stroke();
      ctx.globalAlpha = GA;
    }
    ctx.restore();
    ctx.beginPath();
    body(ctx);
    ctx.lineWidth = 3.8;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    legs(true);
    // 甲殼頂上一排骨白色的冠刺（年紀越大越長）
    [[-44, -46, -1.9, 9], [-24, -54, -1.7, 12], [-2, -57, -1.55, 15], [22, -56, -1.4, 13], [44, -50, -1.15, 11], [62, -40, -0.9, 8]].forEach(([x, y, a, h]) => {
      ctx.save();
      ctx.translate(bx + x, by + y);
      ctx.rotate(a + PI / 2);
      A.shape(ctx, (c) => { c.moveTo(-6, 3); c.quadraticCurveTo(-3, -h * 0.6, 1, -h); c.quadraticCurveTo(3, -h * 0.5, 6, 3); c.closePath(); }, '#f2e4cc', '#c8b494', { lw: 2.2, shadeY: -h * 0.3 });
      ctx.restore();
    });
    // 甲殼邊緣的疣刺
    [[-62, -6, -2.2], [-52, -34, -1.8], [-30, -52, -1.4], [70, -30, -0.6], [82, -8, -0.1]].forEach(([x, y, a]) => {
      ctx.save();
      ctx.translate(bx + x, by + y);
      ctx.rotate(a + PI / 2);
      A.shape(ctx, (c) => { c.moveTo(-5, 2); c.lineTo(0, -10); c.lineTo(5, 2); c.closePath(); }, CAR[0], null, { lw: 2.2 });
      ctx.restore();
    });
    // 背上的藤壺與小珊瑚
    barnacle(ctx, bx - 40, by - 44, 6, -0.4);
    barnacle(ctx, bx - 28, by - 52, 4.5, -0.2);
    barnacle(ctx, bx - 52, by - 30, 4, -0.8);
    coral(ctx, bx - 10, by - 54, 0.7, '#ff8aa0', 0.2);
    // 長年的青苔
    A.shape(ctx, (c) => {
      c.moveTo(bx - 58, by - 22);
      c.quadraticCurveTo(bx - 50, by - 46, bx - 20, by - 54);
      c.quadraticCurveTo(bx - 4, by - 56, bx + 2, by - 50);
      c.quadraticCurveTo(bx - 8, by - 44, bx - 16, by - 46);
      c.quadraticCurveTo(bx - 24, by - 36, bx - 34, by - 40);
      c.quadraticCurveTo(bx - 44, by - 24, bx - 58, by - 22);
      c.closePath();
    }, '#7aa860', '#5a8a4a', { cel: [1.5, 2], lw: 2 });

    // 眼睛：金色虹膜的老眼，得意時眼皮半垂
    const eyeR = [17, 15];
    [e1, e2].forEach(([x, y], i) => {
      const r = eyeR[i];
      A.ellipse(ctx, x, y, r, r, '#fffaf0', null, { lw: 3.2, hl: false });
      if (kind === 'x') A.eye(ctx, x, y, 7, 7, 'x');
      else if (kind === 'closed' || st === 'recover') A.eye(ctx, x, y + 2, 8, 5, 'closed');
      else if (kind === 'hurt') A.eye(ctx, x, y, 7, 8, 'hurt');
      else {
        const lx = x + 4;
        const ly = y + 2;
        if (p2 > 0.3 && !dead) glowC(ctx, lx, ly, 26, '#ff9a3c', 0.55 * p2);
        A.ellipse(ctx, lx, ly, r * 0.6, r * 0.66, p2 > 0.5 ? '#ff9a2a' : '#e8b030', null, { lw: 2, hl: false });
        ctx.fillStyle = A.c('#2b1a12');
        ctx.beginPath();
        ctx.ellipse(lx + 1, ly + 1, r * 0.3, r * (fierce ? 0.42 : 0.36), 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lx - r * 0.2, ly - r * 0.25, r * 0.17, 0, TAU);
        ctx.fill();
        if (!fierce) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.clip();
          ctx.fillStyle = A.c('#c8543e');
          ctx.fillRect(x - r, y - r, r * 2, r * 0.72);
          ctx.restore();
          ctx.strokeStyle = A.outline();
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x - r * 0.95, y - r * 0.28);
          ctx.lineTo(x + r * 0.95, y - r * 0.28);
          ctx.stroke();
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.stroke();
        }
      }
    });
    if (laugh && Math.sin(t * 6) > -0.3) {
      ctx.save();
      ctx.font = 'bold 30px ' + A.FONT;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = A.OUT;
      ctx.fillStyle = '#fff3a0';
      const hy = by - 150 - ((t * 2) % 1) * 24;
      [[bx + 100, hy], [bx + 136, hy - 24]].forEach(([x, y]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(m.dir < 0 ? -1 : 1, 1);
        ctx.strokeText('哈', 0, 0);
        ctx.fillText('哈', 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }
    // 濃密的白眉（像浪花）
    if (!dead) {
      [[e1[0] - 1, e1[1] - 21, fierce ? 0.35 : -0.3, 1.25], [e2[0] + 1, e2[1] - 19, fierce ? -0.35 : 0.25, 1.15]].forEach(([x, y, rot, s]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(s * 1.2, s * 1.2);
        A.shape(ctx, (c) => {
          c.moveTo(-15, 3);
          c.quadraticCurveTo(-19, -6, -9, -6);
          c.quadraticCurveTo(-5, -13, 3, -7);
          c.quadraticCurveTo(10, -13, 15, -4);
          c.quadraticCurveTo(22, 0, 15, 4);
          c.quadraticCurveTo(0, 1, -15, 3);
          c.closePath();
        }, '#f8f4ea', '#d6ccbc', { cel: [2, 2], lw: 2.4 });
        ctx.restore();
      });
    }
    // 嘴
    const mx = bx + 38;
    const my = by - 4;
    // 口器外的顎足
    [[-12, 16, 0.3], [8, 18, -0.2]].forEach(([dx, dy, a]) => A.ellipse(ctx, mx + dx, my + dy, 9, 6, '#e8765a', '#b8483a', { lw: 2.2, rot: a, hl: false, cel: [1.5, 1.5] }));
    if (laugh && !(m.hurtFlash > 0.05)) {
      A.shape(ctx, (c) => { c.moveTo(mx - 20, my - 6); c.quadraticCurveTo(mx + 3, my - 11, mx + 25, my - 8); c.quadraticCurveTo(mx + 20, my + 26, mx - 20, my - 6); c.closePath(); }, '#7a2323', null, { lw: 2.8 });
      A.ellipse(ctx, mx + 4, my + 11, 8, 5, '#ff8a8a', null, { noStroke: true, hl: false });
      ctx.fillStyle = A.c('#ffffff');
      ctx.fillRect(mx - 11, my - 9, 28, 5);
    } else if (dead || st === 'recover' || m.hurtFlash > 0.05) {
      A.ellipse(ctx, mx, my + 3, 9, 8, '#7a2323', null, { lw: 2.8, hl: false });
    } else if (fierce || st === 'tide' || st === 'clawSlam') {
      A.shape(ctx, (c) => { c.moveTo(mx - 20, my - 3); c.quadraticCurveTo(mx, my - 9, mx + 23, my - 6); c.quadraticCurveTo(mx + 17, my + 20, mx - 20, my - 3); c.closePath(); }, '#7a2323', null, { lw: 2.8 });
      ctx.fillStyle = A.c('#ffffff');
      ctx.beginPath();
      ctx.moveTo(mx - 16, my - 3.5);
      ctx.quadraticCurveTo(mx, my - 8, mx + 19, my - 5);
      ctx.lineTo(mx + 17, my);
      ctx.quadraticCurveTo(mx, my - 3, mx - 13, my + 0.5);
      ctx.closePath();
      ctx.fill();
    } else {
      A.shape(ctx, (c) => {
        c.moveTo(mx - 20, my - 3);
        c.quadraticCurveTo(mx, my + 6, mx + 25, my - 14);
        c.quadraticCurveTo(mx + 17, my + 14, mx - 20, my - 3);
        c.closePath();
      }, '#ffffff', null, { lw: 2.8 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(mx - 4, my + 1);
      ctx.lineTo(mx - 4, my + 6);
      ctx.moveTo(mx + 9, my - 2);
      ctx.lineTo(mx + 9, my + 4);
      ctx.stroke();
    }
    A.blush(ctx, bx + 6, by + 2, 10);
    A.blush(ctx, bx + 68, by - 6, 7);

    // 大螯：粗壯的手臂（有刺的腕節）＋長滿藤壺的巨鉗
    const ax = bx + 62;
    const ay = by + 20;
    const cx0 = big.x - Math.cos(big.rot) * big.r * 0.8;
    const cy0 = big.y - Math.sin(big.rot) * big.r * 0.8;
    const jx = (ax + cx0) / 2 + 6;
    const jy = Math.max(ay, cy0) + 10;
    seg(ctx, ax, ay, jx, jy, 13, 12, CAR[0], CAR[1]);
    seg(ctx, jx, jy, cx0, cy0, 12, 14, CAR[0], CAR[1]);
    A.ellipse(ctx, jx, jy, 15, 13, CAR[0], CAR[1], { lw: 2.8, cel: [3, 3], hl: false });
    A.shape(ctx, (c) => { c.moveTo(jx - 6, jy - 10); c.lineTo(jx - 2, jy - 24); c.lineTo(jx + 5, jy - 11); c.closePath(); }, CAR[0], null, { lw: 2.2 });
    titanClaw(ctx, big.x, big.y, big.r * 1.12, big.open, big.rot, true, p2, t, dead);
    if (st === 'clawSlam' || st === 'tide') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(big.x - 38 - i * 9, big.y - 58 + i * 20);
        ctx.lineTo(big.x - 76 - i * 9, big.y - 72 + i * 20);
      }
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const q = (t * 3 + i / 5) % 1;
        ctx.globalAlpha = GA * (1 - q);
        A.ellipse(ctx, big.x + 20 + (i - 2) * 16 * (1 + q), big.y + 30 - q * 40 - Math.abs(i - 2) * 6, 6 - q * 2, 5 - q * 2, '#e6f6ff', null, { lw: 1.6, hl: false });
      }
      ctx.globalAlpha = GA;
    }
    tideRing(true);
    if (st === 'recover' && !dead) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * TAU) / 3;
        star(ctx, bx + 40 + Math.cos(a) * 40, by - 118 + Math.sin(a) * 10);
      }
    }
    ctx.restore();
  }
  // 巨鉗：粗厚的掌節（長藤壺、小珊瑚、疣刺）＋兩根有鋸齒、尖端深色的鉗指；open 0~1
  function titanClaw(ctx, x, y, r, open, rot, big, p2, t, dead) {
    const col = '#d4553c';
    const sh = '#9c3226';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    const finger = (flip, len, w, ang) => {
      ctx.save();
      ctx.translate(r * 0.55, flip * r * 0.14);
      ctx.scale(1, flip);
      ctx.rotate(ang);
      const path = (c) => {
        c.moveTo(-r * 0.15, -w);
        c.quadraticCurveTo(len * 0.8, -w * 1.3, len, w * 0.2);
        c.quadraticCurveTo(len * 0.6, w * 0.15, -r * 0.15, w * 0.75);
        c.closePath();
      };
      A.shape(ctx, path, col, flip > 0 ? '#b84632' : sh, { shadeY: w * 0.1, noStroke: true });
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#3a1c18');
      ctx.beginPath();
      ctx.moveTo(len * 0.62, -w * 2);
      ctx.quadraticCurveTo(len * 0.7, 0, len * 0.66, w * 2);
      ctx.lineTo(len * 2, w * 2);
      ctx.lineTo(len * 2, -w * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = big ? 3.4 : 2.6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      // 內側的鋸齒
      if (big) {
        for (let i = 0; i < 4; i++) {
          const u = 0.12 + i * 0.13;
          const px = len * u;
          const py = w * 0.72 - (w * 0.55) * u;
          A.shape(ctx, (c) => { c.moveTo(px - 4, py - 1); c.lineTo(px + 1, py + 7); c.lineTo(px + 5, py - 1.5); c.closePath(); }, '#fff0dc', null, { lw: 1.6 });
        }
      }
      ctx.restore();
    };
    finger(1, r * 1.25, r * 0.44, 0.1 - open * 0.55);
    finger(-1, r * 1.5, r * 0.56, 0.02 - open * 0.65);
    const palm = (c) => {
      c.moveTo(-r * 1.0, -r * 0.1);
      c.bezierCurveTo(-r * 0.9, -r * 0.85, r * 0.3, -r * 1.0, r * 0.75, -r * 0.55);
      c.quadraticCurveTo(r * 1.0, -r * 0.2, r * 0.85, r * 0.3);
      c.bezierCurveTo(r * 0.7, r * 0.8, -r * 0.4, r * 0.85, -r * 0.85, r * 0.45);
      c.quadraticCurveTo(-r * 1.1, r * 0.2, -r * 1.0, -r * 0.1);
      c.closePath();
    };
    A.shape(ctx, palm, col, sh, { cel: [r * 0.2, r * 0.2], hl: [-r * 0.35, -r * 0.4, r * 0.28, r * 0.13], lw: big ? 3.6 : 2.8 });
    // 掌上的疣粒
    ctx.fillStyle = A.c('#f39a7a');
    [[-0.5, -0.35, 0.09], [-0.1, -0.52, 0.07], [0.3, -0.5, 0.06], [-0.62, 0.05, 0.07]].forEach(([u, v, s]) => {
      ctx.beginPath();
      ctx.arc(u * r, v * r, s * r, 0, TAU);
      ctx.fill();
    });
    if (big) {
      // 長年的藤壺、珊瑚、海草
      barnacle(ctx, -r * 0.3, -r * 0.72, r * 0.2, -0.3);
      barnacle(ctx, -r * 0.62, -r * 0.5, r * 0.15, -0.8);
      barnacle(ctx, r * 0.1, -r * 0.8, r * 0.13, 0.1);
      barnacle(ctx, r * 0.2, r * 0.62, r * 0.12, PI + 0.3);
      coral(ctx, r * 0.42, -r * 0.7, r * 0.022, '#ff7a9a', 0.5);
      if (!dead) kelp(ctx, -r * 0.5, r * 0.55, r * 0.5, t || 0, 1, '#4f9a52');
      // 鉗子邊的疣刺
      [[-0.9, -0.5, -2.4], [-0.55, -0.85, -2.0], [0.55, -0.75, -1.3]].forEach(([u, v, a]) => {
        ctx.save();
        ctx.translate(u * r, v * r);
        ctx.rotate(a + PI / 2);
        A.shape(ctx, (c) => { c.moveTo(-r * 0.09, r * 0.04); c.lineTo(0, -r * 0.2); c.lineTo(r * 0.09, r * 0.04); c.closePath(); }, col, null, { lw: 2 });
        ctx.restore();
      });
      if (p2 > 0 && !dead) {
        const GA = ctx.globalAlpha;
        ctx.globalAlpha = GA * p2;
        ctx.strokeStyle = A.c('#ffc04a');
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, r * 0.2);
        ctx.lineTo(-r * 0.35, r * 0.05);
        ctx.lineTo(-r * 0.2, r * 0.35);
        ctx.lineTo(r * 0.2, r * 0.25);
        ctx.stroke();
        ctx.globalAlpha = GA;
      }
    }
    ctx.restore();
  }

  // ═════════════ Boss：熔岩甲龜 ═════════════
  // 上古的火山巨龜：背甲本身就是一座活火山——玄武岩層、柱狀節理、流下來的熔岩河、火山口的濃煙，
  // 山腰長著老松與青苔；四條像石柱一樣的腳，下巴垂著地衣長鬚，一雙半閉的、很老很老的眼睛。
  // 設計座標 = 世界座標（h=230），原點在腳底中央、面向右。
  function lavaTortoise(ctx, m) {
    const t = m.t || 0;
    const st = m.state;
    const GA = ctx.globalAlpha;
    const dead = !!m.dead;
    const SK = ['#9a8568', '#6c5842'];
    const SKD = ['#7e6a52', '#5a4836'];
    const ROCK = ['#6b5751', '#46363a'];
    const p2 = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    const hot = p2 > 0.5;
    const K = (m.h || 230) / 230;
    const prep = st === 'eruptPrep' || st === 'meteorPrep';
    const erupt = !dead && (st === 'erupt' || st === 'meteor' || (st === 'transform' && p2 > 0.4) || (hot && Math.sin(t * 1.7) > 0.6));
    const heat = dead ? 0 : Math.min(1.4, 0.55 + Math.sin(t * 3) * 0.15 + (prep ? 0.45 + Math.sin(t * 20) * 0.15 : 0) + (erupt ? 0.6 : 0) + (hot ? 0.35 : 0));
    const hk = Math.max(0, Math.min(1, heat - 0.3));
    const lavaC = dead ? '#5a3a30' : hot ? U.mix('#ff5a1e', '#ffd84a', hk) : U.mix('#f0741e', '#ffe46a', hk);
    const lavaCore = dead ? '#6a4638' : U.mix('#ffd24a', '#fff6c0', hk);
    const shake = prep ? Math.sin(t * 50) * 2.5 : 0;

    ctx.save();
    ctx.scale(K, K);
    // 對話框頭像（Boss 的複本放在原點）：往後挪，讓臉在框裡
    if (m.x === 0 && m.y === 0 && st === 'recover') ctx.translate(-165, 0);
    ctx.fillStyle = 'rgba(30,10,0,0.24)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 172, 20, 0, 0, TAU);
    ctx.fill();
    ctx.translate(shake, 0);
    if (p2 > 0 && !dead) glowC(ctx, -10, -150, 250, '#ff5a1e', (0.22 + Math.sin(t * 6) * 0.05) * p2);

    // ── 熔岩：外發光＋深色描邊＋亮色＋更亮的芯；flowing 時芯會流動 ──
    const lavaStroke = (path, w, flow) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      path(ctx);
      if (heat > 0) {
        ctx.strokeStyle = 'rgba(255,140,40,' + Math.min(1, 0.3 * heat).toFixed(3) + ')';
        ctx.lineWidth = w + 8;
        ctx.stroke();
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = w + 3;
      ctx.stroke();
      ctx.strokeStyle = A.c(lavaC);
      ctx.lineWidth = w;
      ctx.stroke();
      if (!dead) {
        ctx.strokeStyle = A.c(lavaCore);
        ctx.lineWidth = Math.max(1.2, w * 0.38);
        if (flow) {
          ctx.setLineDash([10, 8]);
          ctx.lineDashOffset = -t * 30;
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
      }
    };
    // 背甲裂縫（翻滾的球也用）
    const cracks = (c) => {
      c.moveTo(-96, -4);
      c.lineTo(-80, -16);
      c.lineTo(-74, -34);
      c.lineTo(-60, -40);
      c.moveTo(-80, -16);
      c.lineTo(-56, -14);
      c.lineTo(-40, -28);
      c.lineTo(-34, -48);
      c.moveTo(-40, -28);
      c.lineTo(-18, -24);
      c.moveTo(-56, -14);
      c.lineTo(-52, 2);
      c.moveTo(14, -6);
      c.lineTo(28, -22);
      c.lineTo(24, -40);
      c.moveTo(28, -22);
      c.lineTo(50, -26);
      c.lineTo(62, -44);
      c.moveTo(50, -26);
      c.lineTo(70, -12);
      c.lineTo(92, -14);
    };
    // 松樹（第二階段著火）
    const pine = (x, y, s) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      const burnt = dead || p2 > 0.5;
      limb(ctx, (c) => { c.moveTo(0, 2); c.lineTo(0, -10); }, 5, '#6a4a30');
      [[0, -8, 12], [0, -16, 10], [0, -23, 7.5]].forEach(([dx, dy, r]) => {
        A.shape(ctx, (c) => { c.moveTo(dx - r, dy + 3); c.lineTo(dx, dy - r * 0.95); c.lineTo(dx + r, dy + 3); c.closePath(); }, burnt ? '#3e3434' : '#3f7a4a', burnt ? '#2a2226' : '#2e5e3a', { lw: 2, shadeY: dy - 1 });
      });
      if (burnt && !dead) {
        const f = Math.sin(t * 16 + x) * 1.5;
        A.shape(ctx, (c) => { c.moveTo(-5, -22); c.quadraticCurveTo(-4, -32, f, -38); c.quadraticCurveTo(5, -30, 5, -22); c.closePath(); }, '#ff8a2a', null, { lw: 1.6 });
      }
      ctx.restore();
    };
    // 柱狀節理（六角玄武岩柱）
    const basalt = (x, y, cols) => {
      cols.forEach(([dx, h, w]) => {
        const x0 = x + dx;
        A.shape(ctx, (c) => { c.moveTo(x0 - w, y); c.lineTo(x0 - w, y - h); c.lineTo(x0, y - h - w * 0.45); c.lineTo(x0 + w, y - h); c.lineTo(x0 + w, y); c.closePath(); }, '#5e5660', null, { noStroke: true });
        ctx.fillStyle = A.c('#3c3644');
        ctx.beginPath();
        ctx.moveTo(x0, y - h + w * 0.45);
        ctx.lineTo(x0 + w, y - h);
        ctx.lineTo(x0 + w, y + 2);
        ctx.lineTo(x0, y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x0 - w, y);
        ctx.lineTo(x0 - w, y - h);
        ctx.lineTo(x0, y - h - w * 0.45);
        ctx.lineTo(x0 + w, y - h);
        ctx.lineTo(x0 + w, y);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.stroke();
        A.shape(ctx, (c) => { c.moveTo(x0 - w, y - h); c.lineTo(x0, y - h - w * 0.45); c.lineTo(x0 + w, y - h); c.lineTo(x0, y - h + w * 0.45); c.closePath(); }, '#7e7682', null, { lw: 2 });
      });
    };
    // 火山口的煙柱（往後飄）
    const plume = (vx, vy) => {
      const n = erupt ? 7 : 5;
      // 圖鑑卡片（只有圖鑑用 'walk'）：煙柱壓低、往後拖，才不會超出卡片
      const rise = st === 'walk' ? 0.3 : 1;
      for (let i = n - 1; i >= 0; i--) {
        const q = (t * (erupt ? 0.45 : 0.22) + i / n) % 1;
        const x = vx - q * (erupt ? 40 : 90) * (2 - rise) + Math.sin(t * 1.3 + i * 1.9) * 8;
        const y = vy - 16 - q * (erupt ? 150 : 110) * rise;
        const r = 13 + q * (erupt ? 34 : 26);
        ctx.globalAlpha = GA * Math.min(1, (1 - q) * 1.6) * (dead ? 0.4 : 1);
        const col = hot || erupt ? '#5e5058' : '#b8aca8';
        const sh = hot || erupt ? '#40363e' : '#8e8284';
        const puff = (c) => {
          c.moveTo(x + r, y);
          c.arc(x, y, r, 0, TAU);
          c.moveTo(x + r * 1.5, y + r * 0.35);
          c.arc(x + r * 0.8, y + r * 0.35, r * 0.7, 0, TAU);
          c.moveTo(x - r * 0.1, y + r * 0.45);
          c.arc(x - r * 0.8, y + r * 0.45, r * 0.7, 0, TAU);
        };
        // 先描粗邊再填色：只留外輪廓
        ctx.beginPath();
        puff(ctx);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = A.c(col);
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = A.c(sh);
        ctx.beginPath();
        ctx.arc(x + r * 0.3, y + r * 0.9, r * 1.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = A.c(hot || erupt ? '#7a6a70' : '#d8d0cc');
        ctx.beginPath();
        ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.4, 0, TAU);
        ctx.fill();
        ctx.restore();
        if ((hot || erupt) && !dead) glowC(ctx, x, y + r * 0.5, r * 1.1, '#ff6a2a', 0.35 * (1 - q));
      }
      ctx.globalAlpha = GA;
    };
    // 火山口（熔岩湖＋噴發）
    const crater = (vx, vy, big, ball) => {
      if (heat > 0) glowC(ctx, vx, vy - 20, erupt ? 95 : 55, '#ff9a3a', (erupt ? 0.55 : 0.35) * heat);
      A.ellipse(ctx, vx, vy, 30 * big, 8 * big, lavaC, null, { lw: 3, hl: false });
      if (!dead) A.ellipse(ctx, vx - 3, vy - 1, 16 * big, 3.5 * big, lavaCore, null, { noStroke: true, hl: false });
      // 火山口外緣的岩塊
      [[-30, 2, 9], [-12, 6, 8], [10, 6, 9], [28, 2, 8]].forEach(([dx, dy, r]) => A.shape(ctx, (c) => { c.moveTo(vx + dx * big - r, vy + dy); c.lineTo(vx + dx * big - r * 0.4, vy + dy - r * 0.8); c.lineTo(vx + dx * big + r * 0.6, vy + dy - r * 0.6); c.lineTo(vx + dx * big + r, vy + dy + 2); c.closePath(); }, ROCK[0], ROCK[1], { lw: 2.2, shadeY: vy + dy - 2 }));
      if (erupt && !ball) {
        for (let i = 0; i < 7; i++) {
          const p = (t * 2 + i / 7) % 1;
          const a = -PI / 2 + (i - 3) * 0.3;
          const x = vx + Math.cos(a) * p * 110;
          const y = vy - 10 + Math.sin(a) * p * 150 + p * p * 90;
          A.shape(ctx, (c) => { c.moveTo(x - 7, y); c.lineTo(x - 2, y - 7); c.lineTo(x + 6, y - 4); c.lineTo(x + 5, y + 5); c.lineTo(x - 4, y + 6); c.closePath(); }, '#4a3434', null, { lw: 2 });
          A.ellipse(ctx, x, y, 3, 3, '#ffb43a', null, { noStroke: true, hl: false });
        }
        const fh = 104 + Math.sin(t * 20) * 8;
        const wv = Math.sin(t * 14) * 4;
        // 兩側濺開的熔岩弧
        [-1, 1].forEach((d) => {
          for (let i = 0; i < 5; i++) {
            const u = ((t * 1.6 + i / 5 + (d > 0 ? 0.5 : 0)) % 1);
            const x = vx + d * (8 + u * 64);
            const y = vy - fh * 0.6 - Math.sin(u * PI) * 40 + u * u * 40;
            const rr = 6 - u * 3;
            A.ellipse(ctx, x, y, rr, rr * 1.1, '#ff9a2a', '#e8621e', { lw: 2, hl: false });
          }
        });
        A.shape(ctx, (c) => {
          c.moveTo(vx - 18 * big, vy);
          c.bezierCurveTo(vx - 10, vy - fh * 0.4, vx - 24 + wv, vy - fh * 0.75, vx - 12, vy - fh * 0.95);
          c.quadraticCurveTo(vx - 6, vy - fh * 1.08, vx + 2, vy - fh);
          c.quadraticCurveTo(vx + 10, vy - fh * 1.1, vx + 16, vy - fh * 0.9);
          c.bezierCurveTo(vx + 26 - wv, vy - fh * 0.7, vx + 10, vy - fh * 0.4, vx + 18 * big, vy);
          c.closePath();
        }, '#ff8a2a', '#e8521e', { lw: 3, cel: [5, 0] });
        A.shape(ctx, (c) => {
          c.moveTo(vx - 7, vy - 2);
          c.bezierCurveTo(vx - 4, vy - fh * 0.35, vx - 12 + wv * 0.5, vy - fh * 0.65, vx - 2, vy - fh * 0.88);
          c.bezierCurveTo(vx + 8, vy - fh * 0.65, vx + 4, vy - fh * 0.35, vx + 7, vy - 2);
          c.closePath();
        }, '#ffe07a', null, { noStroke: true });
        A.ellipse(ctx, vx - 1, vy - fh * 0.6, 3.5, fh * 0.2, '#fffbe0', null, { noStroke: true, hl: false });
      }
    };

    if (st === 'roll' || st === 'cannonAir') {
      // 縮成一顆岩球在滾：背甲的格紋、裂縫，頂上的火山口跟著轉
      const r = 106;
      ctx.translate(0, -r - 2);
      ctx.rotate(m.rollAngle || 0);
      const ball = (c) => c.ellipse(0, 0, r, r * 0.97, 0, 0, TAU);
      if (heat > 0) glowC(ctx, 0, 0, r * 1.5, '#ff7a2a', 0.3 * heat);
      A.shape(ctx, ball, ROCK[0], ROCK[1], { cel: [12, 12], noStroke: true });
      ctx.save();
      ctx.beginPath();
      ball(ctx);
      ctx.clip();
      [[-40, '#7a6258'], [10, '#5c4a48'], [52, '#8a7a70']].forEach(([y, col]) => {
        ctx.fillStyle = A.c(col);
        ctx.beginPath();
        ctx.ellipse(0, y, r * 1.2, 11, 0.1, 0, TAU);
        ctx.fill();
      });
      A.ellipse(ctx, 0, r * 1.0, r * 1.1, r * 0.46, '#8a7258', '#6a5440', { hl: false, lw: 3.5 });
      ctx.translate(0, 18);
      lavaStroke(cracks, 5 + (hot ? 2 : 0), false);
      ctx.restore();
      basalt(-54, -40, [[-10, 16, 8], [6, 24, 8], [22, 14, 7]]);
      [[r * 0.82, r * 0.3], [-r * 0.78, r * 0.36], [r * 0.34, r * 0.74], [-r * 0.36, r * 0.74]].forEach(([x, y]) => A.ellipse(ctx, x, y, 12, 9, '#2a1a14', null, { lw: 2.6, hl: false }));
      ctx.beginPath();
      ball(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4;
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-40, -r * 0.84); c.lineTo(-16, -r * 1.12); c.lineTo(16, -r * 1.12); c.lineTo(40, -r * 0.84); c.closePath(); }, ROCK[0], ROCK[1], { cel: [4, 0], lw: 3 });
      crater(0, -r * 1.12, 0.6, true);
      ctx.restore();
      // 地上的揚塵與火星
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const q = (t * 3 + i / 4) % 1;
        ctx.globalAlpha = GA * (1 - q) * 0.6;
        ctx.fillStyle = A.c('#c8a078');
        ctx.beginPath();
        ctx.arc((-80 - q * 60) * K, (-10 - q * 16) * K, (10 + q * 12) * K, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    let sy = 1 + Math.sin(t * 1.8) * 0.01;
    if (prep) sy = 0.95;
    if (st === 'recover') sy = 0.93;
    ctx.scale(1 / Math.sqrt(sy), sy);

    // 縮頭縮腳程度（stateT 倒數）
    const tuck = st === 'rollPrep' || st === 'cannonPrep' ? 0.3 + 0.7 * Math.min(1, Math.max(0, 1 - (m.stateT || 0) / (m.stateT0 || 0.7))) : st === 'rollEnd' || st === 'cannonEnd' ? 0.6 : 0;
    const walk = st === 'walk' || st === 'intro' || (st === 'move' && Math.abs(m.vx || 0) > 5);
    // 踩地裂：用後腳站起來再踩下去
    const rear = st === 'quakePrep' ? Math.min(1, (1 - (m.stateT || 0) / (m.stateT0 || 0.7)) * 1.4) : st === 'quake' ? Math.max(0, (m.stateT || 0) / 0.5 - 0.6) : 0;
    if (rear > 0) {
      ctx.translate(-130, 0);
      ctx.rotate(-0.26 * rear);
      ctx.translate(130, 0);
    }
    if (!m.onGround && st === 'move') ctx.translate(0, -5);
    const step = walk ? Math.sin(t * 5) : 0;
    const legH = 56 * (1 - tuck * 0.75);
    const sx = -12;
    const sb = -50 - legH * 0.1 + tuck * 10;

    // ── 石柱般的腳 ──
    const leg = (x, lift, far) => {
      const top = sb - 6;
      const y1 = -lift;
      const w = far ? 25 : 30;
      const col = far ? SKD : SK;
      const knee = top + (y1 - top) * 0.45;
      const path = (c) => {
        c.moveTo(x - w + 4, top);
        c.bezierCurveTo(x - w - 6, knee - 6, x - w - 2, knee + 10, x - w - 4, y1 - 12);
        c.quadraticCurveTo(x - w - 10, y1 - 2, x - w - 4, y1 + 1);
        c.lineTo(x + w + 6, y1 + 1);
        c.quadraticCurveTo(x + w + 12, y1 - 2, x + w + 4, y1 - 12);
        c.bezierCurveTo(x + w + 2, knee + 10, x + w + 8, knee - 6, x + w - 4, top);
        c.closePath();
      };
      A.shape(ctx, path, col[0], col[1], { cel: [7, 3], lw: 3.4 });
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      // 粗糙的大鱗甲
      [[-12, 0.22, 11, 8], [10, 0.3, 12, 8], [-4, 0.55, 13, 8], [16, 0.66, 9, 7], [-18, 0.72, 9, 7]].forEach(([dx, u, rx, ry]) => {
        const yy = top + (y1 - top) * u;
        A.shape(ctx, (c) => {
          c.moveTo(x + dx - rx, yy + ry * 0.3);
          c.lineTo(x + dx - rx * 0.6, yy - ry);
          c.lineTo(x + dx + rx * 0.6, yy - ry);
          c.lineTo(x + dx + rx, yy + ry * 0.3);
          c.lineTo(x + dx, yy + ry);
          c.closePath();
        }, far ? '#8a765c' : '#ad9774', far ? '#6c5a44' : '#8e7858', { lw: 1.8, shadeY: yy + ry * 0.2 });
      });
      // 腳踝的皺褶
      ctx.strokeStyle = A.c(col[1]);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x - w, y1 - 16);
      ctx.quadraticCurveTo(x, y1 - 10, x + w, y1 - 16);
      ctx.stroke();
      ctx.restore();
      // 三片厚爪
      [-17, 0, 17].forEach((dx) => A.shape(ctx, (c) => { c.moveTo(x + dx - 8, y1 + 1); c.quadraticCurveTo(x + dx - 7, y1 - 11, x + dx + 1, y1 - 11); c.quadraticCurveTo(x + dx + 9, y1 - 10, x + dx + 9, y1 + 1); c.closePath(); }, '#ece0c6', '#c8b898', { lw: 2.2, shadeY: y1 - 3 }));
    };
    leg(-96, Math.max(0, -step) * 7, true);
    leg(62, Math.max(0, step) * 7, true);

    // 尾巴（有刺）
    A.shape(ctx, (c) => { c.moveTo(-140, sb - 4); c.quadraticCurveTo(-176, sb, -186, sb + 20); c.quadraticCurveTo(-166, sb + 14, -136, sb + 12); c.closePath(); }, SK[0], SK[1], { lw: 3, shadeY: sb + 10 });
    [[-160, sb - 2], [-174, sb + 6]].forEach(([x, y]) => A.shape(ctx, (c) => { c.moveTo(x - 5, y + 2); c.lineTo(x - 2, y - 8); c.lineTo(x + 5, y + 2); c.closePath(); }, '#d8ccb4', null, { lw: 1.8 }));

    // ── 頭與脖子 ──
    const brk = st === 'breath' ? 1 : st === 'breathPrep' ? Math.min(1, 1 - (m.stateT || 0) / (m.stateT0 || 0.7)) : 0;
    const nx = 110 - tuck * 40;
    const hx = 186 - tuck * 92 + brk * 18;
    let hy = -104 + (prep ? 8 : 0) + (erupt ? -12 : 0) + tuck * 26;
    if (st === 'recover') hy += 14;
    if (brk > 0) hy += brk * 6;
    // 脖子：粗、有一圈圈皺褶
    const neckPath = (c) => {
      c.moveTo(nx - 20, sb + 12);
      c.quadraticCurveTo(hx - 50, sb + 10, hx - 26, hy + 30);
      c.lineTo(hx - 34, hy - 12);
      c.quadraticCurveTo(hx - 80, sb - 44, nx - 14, sb - 36);
      c.closePath();
    };
    A.shape(ctx, neckPath, SK[0], SK[1], { cel: [4, 5], lw: 3.2 });
    ctx.strokeStyle = A.c(SK[1]);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const u = 0.3 + i * 0.2;
      const x = nx + (hx - 30 - nx) * u;
      const y = sb - 12 + (hy + 8 - sb) * u;
      ctx.moveTo(x - 6, y - 22 + i * 4);
      ctx.quadraticCurveTo(x + 4, y, x - 4, y + 22 - i * 3);
    }
    ctx.stroke();

    // 頭（放大 1.35 倍）
    ctx.save();
    ctx.translate(hx - 30, hy + 20);
    ctx.scale(1.35, 1.35);
    ctx.translate(-(hx - 30), -(hy + 20));
    const head = (c) => {
      c.moveTo(hx - 38, hy + 22);
      c.bezierCurveTo(hx - 46, hy - 26, hx + 6, hy - 44, hx + 34, hy - 20);
      c.quadraticCurveTo(hx + 50, hy - 10, hx + 50, hy + 4);
      c.bezierCurveTo(hx + 48, hy + 26, hx + 20, hy + 34, hx - 38, hy + 22);
      c.closePath();
    };
    A.shape(ctx, head, SK[0], SK[1], { cel: [6, 6], hl: [hx - 14, hy - 24, 10, 4.5] });
    // 頭頂的大鱗甲（刻在頭皮上的多角形）
    ctx.save();
    ctx.beginPath();
    head(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c(SK[1]);
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 40, hy - 6);
    ctx.lineTo(hx - 24, hy - 12);
    ctx.lineTo(hx - 12, hy - 30);
    ctx.lineTo(hx - 16, hy - 44);
    ctx.moveTo(hx - 24, hy - 12);
    ctx.lineTo(hx - 30, hy + 6);
    ctx.moveTo(hx - 12, hy - 30);
    ctx.lineTo(hx + 8, hy - 30);
    ctx.lineTo(hx + 12, hy - 44);
    ctx.moveTo(hx + 8, hy - 30);
    ctx.lineTo(hx + 24, hy - 24);
    ctx.stroke();
    ctx.fillStyle = A.c('#b09a78');
    ctx.beginPath();
    ctx.moveTo(hx - 22, hy - 16);
    ctx.lineTo(hx - 12, hy - 28);
    ctx.lineTo(hx + 4, hy - 28);
    ctx.lineTo(hx - 4, hy - 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 喙（上喙帶鉤）
    const beakOpen = brk > 0 ? brk : erupt || dead || m.hurtFlash > 0.05 ? 0.5 : 0;
    A.shape(ctx, (c) => {
      c.moveTo(hx + 26, hy - 16);
      c.quadraticCurveTo(hx + 52, hy - 12, hx + 56, hy + 6);
      c.quadraticCurveTo(hx + 52, hy + 12, hx + 46, hy + 8);
      c.quadraticCurveTo(hx + 34, hy + 4, hx + 22, hy + 6);
      c.closePath();
    }, '#80694e', '#5e4c38', { lw: 2.6, shadeY: hy + 2 });
    ctx.fillStyle = A.c('#3a2a20');
    ctx.beginPath();
    ctx.arc(hx + 40, hy - 8, 1.8, 0, TAU);
    ctx.fill();
    if (beakOpen > 0) {
      if (brk > 0 && !dead) glowC(ctx, hx + 46, hy + 14, 50 + brk * 40, '#ffa032', 0.5 + 0.4 * brk);
      const o = 6 + beakOpen * 16;
      A.shape(ctx, (c) => { c.moveTo(hx + 16, hy + 8); c.quadraticCurveTo(hx + 34, hy + 6, hx + 48, hy + 8); c.quadraticCurveTo(hx + 46, hy + 8 + o, hx + 30, hy + 8 + o); c.quadraticCurveTo(hx + 18, hy + 8 + o * 0.6, hx + 16, hy + 8); c.closePath(); }, '#7a2323', null, { lw: 2.6 });
      if (brk > 0 && !dead) A.ellipse(ctx, hx + 32, hy + 8 + o * 0.5, 9 * brk + 1, 5 * brk + 1, '#ffd35a', null, { noStroke: true, hl: false });
      A.shape(ctx, (c) => { c.moveTo(hx + 14, hy + 10 + o); c.quadraticCurveTo(hx + 34, hy + 12 + o, hx + 46, hy + 8 + o * 0.9); c.quadraticCurveTo(hx + 36, hy + 22 + o, hx + 14, hy + 20 + o * 0.6); c.closePath(); }, '#80694e', '#5e4c38', { lw: 2.4, shadeY: hy + 16 + o });
    } else {
      A.shape(ctx, (c) => { c.moveTo(hx + 14, hy + 10); c.quadraticCurveTo(hx + 34, hy + 12, hx + 46, hy + 9); c.quadraticCurveTo(hx + 36, hy + 20, hx + 14, hy + 18); c.closePath(); }, '#80694e', '#5e4c38', { lw: 2.4, shadeY: hy + 15 });
    }
    // 下巴垂下的地衣長鬚
    {
      const sw = dead ? 0 : Math.sin(t * 1.4) * 3;
      A.shape(ctx, (c) => {
        c.moveTo(hx - 12, hy + 26);
        c.quadraticCurveTo(hx - 14, hy + 44, hx - 6 + sw, hy + 60);
        c.quadraticCurveTo(hx - 2, hy + 48, hx + 2, hy + 54 + sw * 0.5);
        c.quadraticCurveTo(hx + 6, hy + 42, hx + 12 + sw, hy + 50);
        c.quadraticCurveTo(hx + 14, hy + 36, hx + 20, hy + 26);
        c.closePath();
      }, dead ? '#8a9080' : '#9ab08a', '#6e8a64', { cel: [2, 2], lw: 2.4 });
    }
    // 眼睛
    const ex = hx + 10;
    const ey = hy - 10;
    const kind = bossEyeKind(m, hot || prep || st === 'breathPrep' || st === 'quakePrep' || st === 'cannonPrep');
    // 眉骨
    A.shape(ctx, (c) => { c.moveTo(ex - 18, ey - 8); c.quadraticCurveTo(ex, ey - 22 - (kind === 'angry' ? -4 : 0), ex + 20, ey - 10 + (kind === 'angry' ? 6 : 0)); c.quadraticCurveTo(ex, ey - 12, ex - 18, ey - 8); c.closePath(); }, '#8e7858', null, { lw: 2.4 });
    if (prep && kind !== 'x' && kind !== 'hurt') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - 7, ey - 6);
      ctx.lineTo(ex + 5, ey);
      ctx.lineTo(ex - 7, ey + 6);
      ctx.stroke();
    } else if (st === 'recover' && kind !== 'x') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let a = 0; a < 12; a += 0.4) {
        const r = a * 0.7;
        const px = ex + Math.cos(a + t * 6) * r;
        const py = ey + Math.sin(a + t * 6) * r;
        a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    } else if (kind === 'x' || kind === 'hurt' || kind === 'closed') {
      A.eye(ctx, ex, ey, 7, 9, kind, 0);
    } else {
      // 很老很老的眼睛：琥珀色、上眼皮垂著一半；生氣時發亮
      const fierce = kind === 'angry';
      if (fierce && !dead) glowC(ctx, ex, ey, 26, '#ff7a2a', 0.6);
      A.ellipse(ctx, ex, ey, 10, 10, '#fff4dc', null, { lw: 2.6, hl: false });
      A.ellipse(ctx, ex + 2, ey + 1, 7, 8, fierce ? '#ff8a1e' : '#d89a2a', null, { lw: 1.8, hl: false });
      ctx.fillStyle = A.c('#2b1a12');
      ctx.beginPath();
      ctx.ellipse(ex + 3, ey + 1.5, fierce ? 2.2 : 3.4, 5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey - 2, 2.2, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(ex, ey, 10, 0, TAU);
      ctx.clip();
      ctx.fillStyle = A.c('#8e7858');
      ctx.beginPath();
      if (fierce) {
        ctx.moveTo(ex - 12, ey - 12);
        ctx.lineTo(ex + 12, ey - 12);
        ctx.lineTo(ex + 12, ey - 1);
        ctx.lineTo(ex - 12, ey - 7);
      } else {
        ctx.rect(ex - 12, ey - 12, 24, 9);
      }
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      if (fierce) {
        ctx.moveTo(ex - 10, ey - 7);
        ctx.lineTo(ex + 10, ey - 1);
      } else {
        ctx.moveTo(ex - 10, ey - 3);
        ctx.lineTo(ex + 10, ey - 3);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey, 10, 0, TAU);
      ctx.stroke();
      // 眼角的皺紋
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(ex - 13, ey + 2);
      ctx.lineTo(ex - 19, ey + 5);
      ctx.moveTo(ex - 13, ey + 6);
      ctx.lineTo(ex - 18, ey + 10);
      ctx.stroke();
    }
    A.blush(ctx, hx - 10, hy + 10, 8);
    ctx.restore();

    // ── 背甲：一座活火山 ──
    // 背甲下緣（緣盾）
    A.shape(ctx, (c) => A.roundRect(c, sx - 150, sb - 14, 300, 26, 13), '#5a4a3e', '#3e322a', { lw: 3.2, shadeY: sb + 2 });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -5; i <= 5; i++) {
      ctx.moveTo(sx + i * 26, sb - 12);
      ctx.lineTo(sx + i * 26 + 3, sb + 10);
    }
    ctx.stroke();
    const vx = sx - 8;
    const vy = sb - 150 - p2 * 4;
    const mount = (c) => {
      c.moveTo(sx - 146, sb - 6);
      c.bezierCurveTo(sx - 150, sb - 50, sx - 120, sb - 76, sx - 96, sb - 84);
      c.lineTo(sx - 84, sb - 96);
      c.lineTo(sx - 70, sb - 94);
      c.bezierCurveTo(sx - 58, sb - 116, vx - 44, vy + 20, vx - 30, vy + 2);
      c.lineTo(vx - 18, vy + 6);
      c.lineTo(vx - 8, vy);
      c.lineTo(vx + 10, vy + 4);
      c.lineTo(vx + 22, vy - 2);
      c.lineTo(vx + 32, vy + 4);
      c.bezierCurveTo(vx + 50, vy + 30, sx + 62, sb - 104, sx + 78, sb - 88);
      c.lineTo(sx + 96, sb - 84);
      c.bezierCurveTo(sx + 128, sb - 70, sx + 146, sb - 40, sx + 144, sb - 6);
      c.quadraticCurveTo(sx, sb + 6, sx - 146, sb - 6);
      c.closePath();
    };
    A.shape(ctx, mount, ROCK[0], ROCK[1], { cel: [12, 8], noStroke: true });
    ctx.save();
    ctx.beginPath();
    mount(ctx);
    ctx.clip();
    // 岩層
    [[sb - 30, 12, '#7c6258'], [sb - 62, 9, '#5c4a4a'], [sb - 92, 10, '#86746a'], [sb - 120, 7, '#5c4a4a']].forEach(([y, h, col], i) => {
      ctx.fillStyle = A.c(col);
      ctx.beginPath();
      ctx.moveTo(sx - 170, y + 6);
      ctx.quadraticCurveTo(sx - 60, y - 6 - i * 2, sx + 10, y);
      ctx.quadraticCurveTo(sx + 80, y + 6, sx + 170, y - 4);
      ctx.lineTo(sx + 170, y - 4 + h);
      ctx.quadraticCurveTo(sx + 80, y + 6 + h, sx + 10, y + h);
      ctx.quadraticCurveTo(sx - 60, y - 6 - i * 2 + h, sx - 170, y + 6 + h);
      ctx.closePath();
      ctx.fill();
    });
    // 右下陰影再壓一次
    ctx.fillStyle = 'rgba(40,24,28,0.28)';
    ctx.beginPath();
    ctx.moveTo(vx + 30, vy);
    ctx.bezierCurveTo(vx + 70, vy + 60, sx + 150, sb - 60, sx + 130, sb + 10);
    ctx.lineTo(sx + 200, sb + 10);
    ctx.lineTo(sx + 200, vy);
    ctx.closePath();
    ctx.fill();
    // 向陽坡的亮稜
    ctx.strokeStyle = A.c('#957c70');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(vx - 30, vy + 14);
    ctx.quadraticCurveTo(vx - 50, vy + 50, vx - 76, vy + 70);
    ctx.moveTo(vx - 4, vy + 16);
    ctx.quadraticCurveTo(vx - 12, vy + 40, vx - 26, vy + 60);
    ctx.moveTo(sx - 96, sb - 78);
    ctx.lineTo(sx - 124, sb - 50);
    ctx.stroke();
    // 背甲的古老六角盾紋（山腳）
    ctx.strokeStyle = A.c('#3a2c2c');
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const hex = (cx, cy, r) => {
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * TAU + PI / 6;
        const x = cx + Math.cos(a) * r * 1.25;
        const y = cy + Math.sin(a) * r * 0.62;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    };
    hex(sx - 90, sb - 30, 30);
    hex(sx - 14, sb - 22, 32);
    hex(sx + 64, sb - 28, 30);
    ctx.stroke();
    // 裂縫＋熔岩
    ctx.translate(sx, sb - 14);
    lavaStroke(cracks, 3.5 + (hot ? 2 : 0) + (dead ? -1 : 0), false);
    ctx.translate(-sx, -(sb - 14));
    // 熔岩河：從火山口流下來
    {
      lavaStroke((c) => {
        c.moveTo(vx - 14, vy + 4);
        c.bezierCurveTo(vx - 24, vy + 40, vx - 60, vy + 50, vx - 58, vy + 84);
        c.quadraticCurveTo(vx - 56, vy + 104, vx - 84, vy + 118);
      }, 6 + p2 * 3, true);
      lavaStroke((c) => {
        c.moveTo(vx + 16, vy + 4);
        c.bezierCurveTo(vx + 26, vy + 34, vx + 12, vy + 56, vx + 30, vy + 80);
        c.quadraticCurveTo(vx + 44, vy + 100, vx + 40, vy + 124);
      }, 5 + p2 * 3, true);
      if (p2 > 0) {
        ctx.globalAlpha = GA * p2;
        lavaStroke((c) => {
          c.moveTo(vx + 26, vy + 6);
          c.bezierCurveTo(vx + 50, vy + 30, vx + 86, vy + 50, vx + 96, vy + 90);
        }, 5, true);
        ctx.globalAlpha = GA;
      }
    }
    ctx.restore();
    ctx.beginPath();
    mount(ctx);
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    // 柱狀節理
    basalt(sx - 118, sb - 52, [[-4, 16, 8], [12, 30, 8.5], [28, 40, 9], [45, 26, 8], [60, 14, 7]]);
    // 右肩上的寄生火山錐（冒一縷白蒸氣）
    const cx2 = sx + 96;
    const cy2 = sb - 86;
    if (!dead) {
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.5 + i / 3) % 1;
        ctx.globalAlpha = GA * (1 - q) * 0.7;
        A.ellipse(ctx, cx2 - q * 20 + Math.sin(t * 2 + i) * 4, cy2 - 30 - q * 40, 6 + q * 8, 5 + q * 6, hot ? '#8a7a7e' : '#eeeae6', null, { lw: 2, hl: false });
      }
      ctx.globalAlpha = GA;
    }
    A.shape(ctx, (c) => { c.moveTo(cx2 - 34, cy2 + 26); c.lineTo(cx2 - 10, cy2 - 22); c.quadraticCurveTo(cx2, cy2 - 18, cx2 + 10, cy2 - 22); c.lineTo(cx2 + 36, cy2 + 24); c.quadraticCurveTo(cx2, cy2 + 34, cx2 - 34, cy2 + 26); c.closePath(); }, '#76605a', '#4e3c3e', { cel: [6, 0], lw: 3 });
    ctx.fillStyle = A.c('#5c4a4a');
    ctx.beginPath();
    ctx.moveTo(cx2 - 22, cy2 + 4);
    ctx.quadraticCurveTo(cx2, cy2, cx2 + 24, cy2 + 4);
    ctx.lineTo(cx2 + 27, cy2 + 10);
    ctx.quadraticCurveTo(cx2, cy2 + 6, cx2 - 25, cy2 + 10);
    ctx.closePath();
    ctx.fill();
    A.ellipse(ctx, cx2, cy2 - 21, 10, 3, lavaC, null, { lw: 2.2, hl: false });
    lavaStroke((c) => { c.moveTo(cx2 + 4, cy2 - 20); c.quadraticCurveTo(cx2 + 10, cy2, cx2 + 20, cy2 + 22); }, 3.5, true);
    // 山腳的青苔與蕨
    A.shape(ctx, (c) => {
      c.moveTo(sx - 146, sb - 8);
      c.quadraticCurveTo(sx - 150, sb - 30, sx - 136, sb - 40);
      c.quadraticCurveTo(sx - 128, sb - 30, sx - 120, sb - 36);
      c.quadraticCurveTo(sx - 110, sb - 24, sx - 96, sb - 28);
      c.quadraticCurveTo(sx - 96, sb - 12, sx - 80, sb - 8);
      c.closePath();
    }, dead || hot ? '#6a6a50' : '#6a9a52', dead || hot ? '#4e4e3a' : '#4e7a3e', { cel: [2, 2], lw: 2.4 });
    A.shape(ctx, (c) => {
      c.moveTo(sx + 100, sb - 8);
      c.quadraticCurveTo(sx + 112, sb - 30, sx + 124, sb - 26);
      c.quadraticCurveTo(sx + 132, sb - 36, sx + 140, sb - 24);
      c.quadraticCurveTo(sx + 146, sb - 14, sx + 142, sb - 6);
      c.closePath();
    }, dead || hot ? '#6a6a50' : '#6a9a52', dead || hot ? '#4e4e3a' : '#4e7a3e', { cel: [2, 2], lw: 2.4 });
    // 山腰的老松
    pine(sx - 104, sb - 82, 1.05);
    pine(sx - 88, sb - 92, 0.85);
    pine(sx + 128, sb - 58, 0.8);
    // 第二階段：黑曜石尖刺沿著山稜長出來
    if (p2 > 0) {
      [[-128, -60, -0.9], [-80, -98, -0.5], [-40, -128, -0.25], [52, -118, 0.3], [88, -92, 0.6], [128, -50, 0.95]].forEach(([x, y, r]) => {
        ctx.save();
        ctx.translate(sx + x, sb + y);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-10, 5); c.lineTo(-2, -30 * p2 - 4); c.lineTo(10, 5); c.closePath(); }, '#2e2230', '#1e1620', { lw: 2.6, shadeY: -8 });
        ctx.strokeStyle = A.c(lavaC);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(-1, -18 * p2);
        ctx.stroke();
        ctx.restore();
      });
    }
    // 火山口＋煙柱
    plume(vx, vy);
    crater(vx, vy + 2, 1 + 0.3 * p2);
    // 火山灰與火星
    if (!dead && (hot || erupt || prep)) {
      for (let i = 0; i < 8; i++) {
        const q = (t * 0.6 + i / 8) % 1;
        const x = vx + Math.sin(i * 2.3 + t) * 90 - q * 30;
        const y = vy - 20 - q * 160;
        ctx.globalAlpha = GA * (1 - q);
        A.ellipse(ctx, x, y, 2.6, 2.6, i % 2 ? '#ffb43a' : '#ff6a2a', null, { noStroke: true, hl: false });
      }
      ctx.globalAlpha = GA;
    }

    // 近側的腳
    leg(-72, Math.max(0, step) * 7, false);
    leg(88, Math.max(0, -step) * 7, false);

    if (st === 'recover' && !dead) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * TAU) / 3;
        star(ctx, hx + 6 + Math.cos(a) * 36, hy - 56 + Math.sin(a) * 9);
      }
    }
    ctx.restore();
  }

  // ═════════════ 投射物 ═════════════
  function zap(ctx, p, t) {
    const s = p.seed || 0;
    glow(ctx, 0, 0, 22, '255,250,170', 0.8);
    ctx.strokeStyle = A.c('#fff27a');
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const a = t * 11 + s + (i * TAU) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.lineTo(Math.cos(a + 0.35) * 12, Math.sin(a + 0.35) * 12);
      ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
      ctx.stroke();
    }
    A.ellipse(ctx, 0, 0, 7, 7, '#fffbd0', '#ffe46a', { lw: 2, hl: [-2, -2.5, 2, 1.4] });
  }
  function gullfeather(ctx, p, t) {
    ctx.rotate(Math.sin(t * 4 + (p.seed || 0)) * 0.5 + 0.3 * (p.dir || 1));
    A.shape(ctx, (c) => {
      c.moveTo(0, -11);
      c.bezierCurveTo(6.5, -6, 6.5, 6, 0, 11);
      c.bezierCurveTo(-6.5, 6, -6.5, -6, 0, -11);
      c.closePath();
    }, '#ffffff', '#dfe4ea', { lw: 2, shadeY: 2 });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 15);
    ctx.moveTo(0, -1);
    ctx.lineTo(3.5, -4);
    ctx.moveTo(0, 4);
    ctx.lineTo(-3.5, 1);
    ctx.stroke();
  }
  function fireball(ctx, p, t) {
    ctx.scale(p.dir || 1, 1);
    glow(ctx, 0, 0, 24, '255,160,50', 0.6);
    const f = Math.sin(t * 24 + (p.seed || 0)) * 2;
    const blob = (c, k) => {
      c.moveTo(9 * k, 0);
      c.bezierCurveTo(9 * k, -8 * k, -2 * k, -9 * k, -8 * k, -6 * k);
      c.quadraticCurveTo(-16 * k, -6 * k + f * k, -22 * k, -2 * k);
      c.quadraticCurveTo(-14 * k, 0, -20 * k, 4 * k - f * k);
      c.quadraticCurveTo(-10 * k, 9 * k, -2 * k, 8 * k);
      c.bezierCurveTo(4 * k, 8 * k, 9 * k, 5 * k, 9 * k, 0);
      c.closePath();
    };
    A.shape(ctx, (c) => blob(c, 1), '#ff7a2a', '#e8521e', { lw: 2.2, shadeY: 3 });
    ctx.save();
    ctx.translate(2, -0.5);
    A.shape(ctx, (c) => blob(c, 0.55), '#ffe46a', null, { noStroke: true });
    ctx.restore();
    A.ellipse(ctx, 3, -1, 2.6, 2.6, '#fffbe0', null, { noStroke: true, hl: false });
  }
  function pebbleShot(ctx, p, t) {
    ctx.rotate(t * 10 * (p.dir || 1) + (p.seed || 0));
    A.shape(ctx, (c) => {
      c.moveTo(-8, -2);
      c.lineTo(-3, -8);
      c.lineTo(6, -7);
      c.lineTo(9, 1);
      c.lineTo(3, 8);
      c.lineTo(-6, 6);
      c.closePath();
    }, '#c0ac9a', '#94806e', { cel: [2, 2], lw: 2.2, hl: [-3, -4, 2, 1.2] });
  }
  function tide(ctx, p, t) {
    const h = p.h || 60;
    ctx.scale(p.dir || 1, 1);
    const w = Math.sin(t * 8 + (p.seed || 0)) * 3;
    // 浪身：後方低、前方捲起
    const body = (c) => {
      c.moveTo(-64, 0);
      c.quadraticCurveTo(-40, -h * 0.25, -18, -h * 0.7);
      c.bezierCurveTo(-8, -h * 1.05, 18 + w, -h * 1.08, 30 + w, -h * 0.78);
      c.quadraticCurveTo(34 + w, -h * 0.6, 26 + w, -h * 0.55);
      c.quadraticCurveTo(18, -h * 0.72, 10, -h * 0.58);
      c.quadraticCurveTo(2, -h * 0.4, 24, 0);
      c.closePath();
    };
    A.shape(ctx, body, '#4ab8e8', '#2a8cc8', { shadeY: -h * 0.3, noStroke: true });
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    // 淺色內層與波紋
    ctx.fillStyle = A.c('#8adcf8');
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.quadraticCurveTo(-32, -h * 0.25, -16, -h * 0.62);
    ctx.quadraticCurveTo(-28, -h * 0.2, -32, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = A.c('#2a8cc8');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -h * 0.4);
    ctx.quadraticCurveTo(0, -h * 0.5, 8, -h * 0.42);
    ctx.moveTo(-26, -h * 0.18);
    ctx.quadraticCurveTo(-14, -h * 0.26, -4, -h * 0.2);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    body(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 浪頭白沫
    A.shape(ctx, (c) => {
      c.moveTo(-17, -h * 0.72);
      c.bezierCurveTo(-6, -h * 1.08, 18 + w, -h * 1.1, 30 + w, -h * 0.78);
      c.quadraticCurveTo(34 + w, -h * 0.6, 26 + w, -h * 0.55);
      c.quadraticCurveTo(22 + w, -h * 0.74, 12, -h * 0.82);
      c.quadraticCurveTo(4, -h * 0.84, 0, -h * 0.76);
      c.quadraticCurveTo(-8, -h * 0.86, -17, -h * 0.72);
      c.closePath();
    }, '#ffffff', '#d8f0fa', { lw: 2.6, shadeY: -h * 0.8 });
    // 飛沫
    ctx.fillStyle = A.c('#ffffff');
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const q = (t * 2 + i / 4) % 1;
      const x = 20 + i * 5 + q * 14;
      const y = -h * 0.95 - Math.sin(q * PI) * 14 + q * 10;
      ctx.globalAlpha = 1 - q;
      ctx.beginPath();
      ctx.arc(x, y, 3 - q * 1.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 底部水花
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 5; i++) {
      const x = -54 + i * 18 + Math.sin(t * 10 + i) * 3;
      ctx.beginPath();
      ctx.ellipse(x, -2, 7, 3, 0, 0, TAU);
      ctx.fill();
    }
  }
  function lavaRock(ctx, p, t) {
    // 往上拖的火光尾巴（往下掉）
    const g = ctx.createLinearGradient(0, -44, 0, 0);
    g.addColorStop(0, 'rgba(255,120,40,0)');
    g.addColorStop(1, 'rgba(255,150,50,0.7)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(0, -46);
    ctx.lineTo(10, 0);
    ctx.closePath();
    ctx.fill();
    glow(ctx, 0, 0, 24, '255,130,40', 0.55);
    ctx.save();
    ctx.rotate(t * 5 + (p.seed || 0));
    A.shape(ctx, (c) => {
      c.moveTo(-11, -3);
      c.lineTo(-5, -11);
      c.lineTo(6, -10);
      c.lineTo(12, -1);
      c.lineTo(7, 10);
      c.lineTo(-6, 10);
      c.closePath();
    }, '#5a3a34', '#40282a', { cel: [2.5, 2.5], lw: 2.4 });
    ctx.strokeStyle = A.c('#ffb43a');
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(0, -1);
    ctx.lineTo(-2, 6);
    ctx.moveTo(0, -1);
    ctx.lineTo(7, -3);
    ctx.stroke();
    ctx.restore();
  }

  // ═════════════ 地面區域 ═════════════
  function lava(ctx, z, t) {
    const fade = Math.max(0, Math.min(1, z.life - z.t, z.t * 4));
    if (fade <= 0) return;
    const r = z.r;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha = fade;
    glow(ctx, 0, -8, r * 1.1, '255,120,30', 0.35);
    // 焦黑岩殼
    A.shape(ctx, (c) => c.ellipse(0, -2, r, r * 0.24, 0, 0, TAU), '#4a302a', null, { lw: 2.6 });
    // 熔岩
    const pool = (c) => c.ellipse(0, -2, r * 0.86, r * 0.16, 0, 0, TAU);
    A.shape(ctx, pool, '#ff7a1e', '#e8521e', { noStroke: true, shadeY: 0 });
    ctx.save();
    ctx.beginPath();
    pool(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#ffd24a');
    for (let i = 0; i < 4; i++) {
      const x = Math.sin(t * 0.8 + i * 1.9) * r * 0.55;
      ctx.beginPath();
      ctx.ellipse(x, -4, r * 0.15, r * 0.035, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // 冒泡
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.9 + i * 0.27 + (z.seed || 0)) % 1;
      const x = Math.sin(i * 2.4 + 1) * r * 0.6;
      const rr = 2.5 + q * 5;
      ctx.globalAlpha = fade * (q < 0.85 ? 1 : (1 - q) / 0.15);
      A.shape(ctx, (c) => { c.arc(x, -3, rr, PI, 0); c.closePath(); }, '#ffb43a', null, { lw: 2 });
    }
    // 小火星
    ctx.fillStyle = '#ffd24a';
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.7 + i / 3) % 1;
      ctx.globalAlpha = fade * (1 - q);
      ctx.beginPath();
      ctx.arc(Math.sin(i * 3.1) * r * 0.5 + Math.sin(t * 3 + i) * 4, -8 - q * 30, 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  Object.assign(A.MONSTER_DRAW, { crab, jelly, gull, lizard, rock, monkey, hermitCrab, lavaTortoise });
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  Object.assign(A.PROJ_DRAW, { zap, gullfeather, fireball, pebbleShot, tide, lavaRock });
  Object.assign(A.ZONE_DRAW, { lava });
})();
