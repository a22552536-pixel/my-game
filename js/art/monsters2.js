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

  // 帶「右下月牙陰影＋左上邊緣光＋底部光」的形狀：巨獸的大塊面都用這個，才有體積與打光
  // o: { cel, rim, lw, noStroke, under: [x, y, r, hex, a] }
  function rimShape(ctx, path, fill, shade, rim, o) {
    o = o || {};
    const c = o.cel != null ? o.cel : 6;
    const r = o.rim != null ? o.rim : 3;
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(shade || fill);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.translate(-c, -c);
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(fill);
    ctx.fill();
    ctx.translate(c, c);
    if (o.under) {
      const u = o.under;
      glowC(ctx, u[0], u[1], u[2], u[3], u[4]);
    }
    if (rim) {
      ctx.beginPath();
      ctx.rect(-3000, -3000, 6000, 6000);
      ctx.translate(r, r);
      path(ctx);
      ctx.translate(-r, -r);
      ctx.clip('evenodd');
      ctx.fillStyle = A.c(rim);
      ctx.fillRect(-3000, -3000, 6000, 6000);
    }
    ctx.restore();
    if (o.noStroke) return;
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = o.lw || 3.2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  // 骨白色的尖刺（從 (x,y) 朝角度 a 長出去）
  function spike(ctx, x, y, a, h, w, col, sh) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + PI / 2);
    A.shape(ctx, (c) => { c.moveTo(-w, 2); c.quadraticCurveTo(-w * 0.4, -h * 0.55, w * 0.15, -h); c.quadraticCurveTo(w * 0.5, -h * 0.45, w, 2); c.closePath(); }, col || '#e8dcc4', sh || '#b8a68a', { lw: 2.2, cel: [w * 0.35, 0] });
    ctx.restore();
  }

  // ═════════════ Boss：潮汐寄居蟹 ═════════════
  // 遠古的潮汐巨蟹：背上扛著一整根海蝕岩柱（青灰岩面、螺旋殼紋、岩架上垂下海草、崖頂老燈塔、背後一根尖塔般的海蝕柱），
  // 身體是傷痕累累的厚重甲殼，一大一小的鉗子（壓碎用的巨鉗佈滿鋸齒與藤壺）；骨質眉甲底下一雙琥珀色的老眼，還是愛笑、愛現。
  // 設計座標 = 世界座標（h=250），原點在腳底中央、面向右；燈室約在 (-42,-239)，縮殼時在 (0,-233)（boss2.js 的光束起點在其下方的燈光裡）。
  function hermitCrab(ctx, m) {
    const t = m.t || 0;
    const st = m.state;
    const GA = ctx.globalAlpha;
    const shell = st === 'shell';
    const dead = !!m.dead;
    const p2 = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    const K = (m.h || 250) / 250;
    const CAR = ['#a8342a', '#6a1c1a', '#e0704e'];
    const CARD = ['#7e2622', '#4e1414', '#b0503a'];
    const ROCK = ['#5f6474', '#393c4c', '#9ca3b8'];
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
    const lampOn = dead ? 0 : hot || shell ? 1 : 0.65 + Math.sin(t * 3) * 0.2;
    const lampCol = p2 > 0.5 ? '#ffa850' : '#fff0a8';
    const eyeCol = p2 > 0.5 ? '#ff9a2a' : '#ffc23a';

    ctx.save();
    ctx.scale(K, K);
    // 對話框頭像（Boss 的複本放在原點）：往後挪，讓臉在框裡
    if (m.x === 0 && m.y === 0 && st === 'recover') ctx.translate(-60, 0);
    ctx.fillStyle = 'rgba(10,20,34,0.3)';
    ctx.beginPath();
    ctx.ellipse(6, 0, 170, 20, 0, 0, TAU);
    ctx.fill();

    // ── 腳邊的浪：平常是拍岸的白沫，第二階段捲起整圈潮水 ──
    const wave = (x, d, ph, h) => {
      const k = 0.6 + 0.4 * Math.sin(t * 3 + ph);
      const H = h * k;
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(d, 1);
      rimShape(ctx, (c) => {
        c.moveTo(-46, 2);
        c.quadraticCurveTo(-34, -H * 0.7, 0, -H);
        c.quadraticCurveTo(24, -H * 1.08, 32, -H * 0.7);
        c.quadraticCurveTo(16, -H * 0.8, 14, -H * 0.5);
        c.quadraticCurveTo(28, -H * 0.2, 34, 2);
        c.closePath();
      }, '#2f86c8', '#1c5a96', '#8fd8ff', { cel: 5, rim: 3, lw: 2.8 });
      A.shape(ctx, (c) => {
        c.moveTo(-10, -H * 0.94);
        c.quadraticCurveTo(14, -H * 1.14, 30, -H * 0.74);
        c.quadraticCurveTo(14, -H * 0.86, -10, -H * 0.94);
        c.closePath();
      }, '#ffffff', null, { lw: 2 });
      for (let i = 0; i < 4; i++) A.ellipse(ctx, 20 + i * 6, -H * (0.92 - i * 0.12) - Math.sin(t * 8 + i) * 3, 4.5 - i, 4.5 - i, '#ffffff', null, { lw: 1.6, hl: false });
      ctx.restore();
    };
    const foam = (front) => {
      if (dead) return;
      // 拍岸浪花：一團團往上噴的白沫
      const spots = front ? [[-176, 0.2]] : [[-150, 0.9]];
      spots.forEach(([x, ph], i) => {
        for (let j = 0; j < 4; j++) {
          const q = (t * 0.9 + ph * 0.3 + j / 4) % 1;
          ctx.globalAlpha = GA * Math.min(1, (1 - q) * 1.2) * (front ? 0.8 : 0.55);
          const r = 5 + q * 7 + (j % 2) * 2;
          A.ellipse(ctx, x + (j - 1.5) * 8 + q * (j - 1.5) * 10, -4 - Math.sin(q * PI) * (20 + i * 4), r, r * 0.85, '#ffffff', '#d4ecf8', { lw: 1.8, hl: false });
        }
      });
      ctx.globalAlpha = GA;
      if (p2 > 0) {
        ctx.globalAlpha = GA * p2;
        if (front) {
          wave(-168, 1, 0, 64);
          wave(186, -1, 2, 52);
        } else {
          wave(-110, 1, 1.2, 92);
          wave(128, -1, 3.1, 74);
        }
        for (let i = 0; i < 3; i++) {
          const q = (t * 0.7 + i / 3) % 1;
          ctx.globalAlpha = GA * p2 * (1 - q) * (front ? 0.85 : 0.5);
          ctx.strokeStyle = A.c(front ? '#ffffff' : '#7fd0f4');
          ctx.lineWidth = front ? 3 : 5;
          ctx.beginPath();
          ctx.ellipse(6, -4, 130 + q * 60, 18 + q * 8, 0, front ? 0.15 : PI + 0.15, front ? PI - 0.15 : TAU - 0.15);
          ctx.stroke();
        }
        ctx.globalAlpha = GA;
      }
    };
    foam(false);

    ctx.translate(trem, 0);
    ctx.scale(1 / Math.sqrt(sy), sy);

    if (!dead) {
      glowC(ctx, -40, -120, 250, p2 > 0.5 ? '#ff7a30' : '#7fc8ff', (p2 > 0.5 ? 0.22 : 0.1) + Math.sin(t * 5) * 0.03);
    }

    // ─────────── 海蝕岩柱（base 在岩底中央）───────────
    const stackPath = (c) => {
      c.moveTo(-132, 4);
      c.quadraticCurveTo(-148, -30, -140, -58);
      c.lineTo(-150, -74);
      c.lineTo(-136, -82);
      c.quadraticCurveTo(-140, -110, -128, -128);
      c.lineTo(-124, -160);
      c.lineTo(-118, -200);
      c.lineTo(-110, -232);
      c.lineTo(-100, -244);
      c.lineTo(-92, -226);
      c.lineTo(-88, -196);
      c.lineTo(-80, -178);
      c.lineTo(-62, -176);
      c.lineTo(-48, -188);
      c.lineTo(-30, -186);
      c.lineTo(-14, -190);
      c.lineTo(20, -188);
      c.lineTo(32, -176);
      c.lineTo(44, -170);
      c.lineTo(42, -152);
      c.lineTo(58, -146);
      c.quadraticCurveTo(62, -124, 76, -110);
      c.lineTo(88, -84);
      c.lineTo(84, -60);
      c.lineTo(96, -34);
      c.quadraticCurveTo(100, -8, 88, 4);
      c.quadraticCurveTo(-20, 16, -132, 4);
      c.closePath();
    };
    const drawStack = (bx0, by0, lean, withdrawn) => {
      ctx.save();
      ctx.translate(bx0, by0);
      ctx.rotate(lean);
      // 後面的珊瑚
      coral(ctx, -136, -14, 1.6, '#e0607a', -0.7);
      coral(ctx, 92, -12, 1.3, '#f08a4a', 0.5);
      rimShape(ctx, stackPath, ROCK[0], ROCK[1], ROCK[2], { cel: 12, rim: 4, noStroke: true, under: dead ? null : [0, 10, 150, hot ? '#ff9a4a' : '#6ad0ff', hot ? 0.3 : 0.2] });
      ctx.save();
      ctx.beginPath();
      stackPath(ctx);
      ctx.clip();
      // 岩面的斷層塊面（深淺交錯，不是平行條紋）
      [
        [[-140, -60], [-96, -84], [-70, -60], [-110, -30], '#6c7182'],
        [[-120, -150], [-86, -170], [-70, -128], [-104, -112], '#535868'],
        [[-40, -176], [10, -186], [30, -150], [-20, -140], '#6c7182'],
        [[20, -120], [70, -110], [84, -70], [40, -80], '#4a4e5e'],
        [[-20, -40], [40, -56], [60, -20], [0, -10], '#555a6a'],
      ].forEach(([a, b, c2, d, col]) => {
        ctx.fillStyle = A.c(col);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c2[0], c2[1]);
        ctx.lineTo(d[0], d[1]);
        ctx.closePath();
        ctx.fill();
      });
      // 暖色的砂岩岩架（上緣亮、下面壓一道影子）
      [[-148, -82, -100, -90], [-60, -150, 10, -156], [30, -100, 90, -92], [-110, -32, -40, -38]].forEach(([x0, y0, x1, y1]) => {
        ctx.fillStyle = A.c('#8a7c68');
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1, y1 + 7);
        ctx.lineTo(x0, y0 + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = A.c('#2c2e3a');
        ctx.beginPath();
        ctx.moveTo(x0, y0 + 8);
        ctx.lineTo(x1, y1 + 7);
        ctx.lineTo(x1 - 6, y1 + 13);
        ctx.lineTo(x0 + 4, y0 + 13);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = A.c('#b8a88c');
        ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1) - 1, Math.abs(x1 - x0) * 0.6, 2.5);
      });
      // 螺旋殼紋（凸起的岩稜，陰影在右下）
      ctx.lineCap = 'round';
      const spiral = (dx, dy) => {
        ctx.beginPath();
        for (let a = 0; a <= 4.4 * PI; a += 0.12) {
          const r = 6 + a * 5.2;
          const x = -52 + dx + Math.cos(a + 2.2) * r;
          const y = -84 + dy + Math.sin(a + 2.2) * r * 0.92;
          a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
      };
      spiral(3, 3);
      ctx.strokeStyle = A.c('#2a2c38');
      ctx.lineWidth = 8;
      ctx.stroke();
      spiral(0, 0);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = A.c('#a8adc0');
      ctx.lineWidth = 3;
      ctx.stroke();
      // 岩縫
      ctx.strokeStyle = A.c('#262834');
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      [[-112, -206, -104, -188, -110, -170], [66, -126, 74, -108, 70, -92], [34, -54, 46, -44, 42, -28], [-10, -170, -2, -160, -8, -148], [-128, -52, -118, -44, -122, -30], [80, -40, 86, -30, 84, -18]].forEach(([a, b, c2, d, e, f]) => {
        ctx.moveTo(a, b);
        ctx.lineTo(c2, d);
        ctx.lineTo(e, f);
      });
      ctx.stroke();
      // 第二階段：葉子的力量從岩縫透出來
      if (p2 > 0 && !dead) {
        ctx.globalAlpha = GA * p2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,150,60,0.45)';
        ctx.lineWidth = 9;
        const vein = () => {
          ctx.beginPath();
          ctx.moveTo(-140, -64);
          ctx.lineTo(-118, -70);
          ctx.lineTo(-112, -52);
          ctx.lineTo(-92, -48);
          ctx.moveTo(64, -130);
          ctx.lineTo(74, -108);
          ctx.lineTo(66, -86);
          ctx.lineTo(80, -66);
          ctx.moveTo(-116, -196);
          ctx.lineTo(-106, -176);
          ctx.lineTo(-112, -160);
        };
        vein();
        ctx.stroke();
        ctx.strokeStyle = A.c('#ffc45a');
        ctx.lineWidth = 3.5;
        vein();
        ctx.stroke();
        ctx.globalAlpha = GA;
      }
      // 潮線以下：濕黑的岩底＋海藻
      ctx.fillStyle = A.c('#2e3a3c');
      ctx.beginPath();
      ctx.moveTo(-160, -16);
      for (let x = -160; x <= 120; x += 14) ctx.quadraticCurveTo(x + 7, -30 + Math.sin(x * 1.3) * 5, x + 14, -16);
      ctx.lineTo(120, 30);
      ctx.lineTo(-160, 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = A.c('#3e6a44');
      ctx.beginPath();
      ctx.moveTo(-160, -8);
      for (let x = -160; x <= 120; x += 10) ctx.quadraticCurveTo(x + 5, -18 + Math.sin(x) * 4, x + 10, -8);
      ctx.lineTo(120, 30);
      ctx.lineTo(-160, 30);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      stackPath(ctx);
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.stroke();

      // 岩柱頂的老松（背後那根尖塔上）
      if (!dead) {
        limb(ctx, (c) => { c.moveTo(-100, -242); c.quadraticCurveTo(-96, -252, -88, -258); }, 4.5, '#5a4030');
        [[-86, -262, 12], [-92, -256, 10], [-80, -256, 9]].forEach(([x, y, r], i) => A.shape(ctx, (c) => { c.moveTo(x - r, y + 3); c.lineTo(x, y - r * 0.6); c.lineTo(x + r, y + 3); c.closePath(); }, i ? '#2e5e3a' : '#3a6e44', null, { lw: 2 }));
      }
      // 崖頂草皮
      A.shape(ctx, (c) => {
        c.moveTo(-80, -178);
        c.lineTo(-62, -176);
        c.lineTo(-48, -188);
        c.lineTo(-30, -186);
        c.lineTo(-14, -190);
        c.lineTo(20, -188);
        c.lineTo(32, -176);
        c.lineTo(44, -170);
        c.quadraticCurveTo(38, -162, 30, -168);
        c.quadraticCurveTo(22, -160, 12, -174);
        c.quadraticCurveTo(0, -166, -10, -178);
        c.quadraticCurveTo(-22, -168, -32, -176);
        c.quadraticCurveTo(-44, -164, -54, -170);
        c.quadraticCurveTo(-66, -162, -72, -170);
        c.quadraticCurveTo(-78, -164, -80, -178);
        c.closePath();
      }, dead ? '#6a7a5a' : '#4e8e44', '#346a32', { cel: [2, 3], lw: 2.8 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      [[-58, -178], [-36, -187], [-4, -190], [30, -178], [-70, -178]].forEach(([x, y], i) => {
        const sw = Math.sin(t * 2 + i) * 1.5;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3 + sw, y - 9);
        ctx.moveTo(x + 2, y);
        ctx.lineTo(x + 5 + sw, y - 8);
      });
      ctx.stroke();

      // 從崖頂瀉下的小瀑布
      if (!dead) {
        const fall = (c) => {
          c.moveTo(40, -170);
          c.bezierCurveTo(52, -160, 54, -150, 56, -142);
        };
        const fall2 = (c) => {
          c.moveTo(58, -140);
          c.bezierCurveTo(66, -126, 74, -112, 80, -96);
        };
        [fall, fall2].forEach((f) => {
          ctx.beginPath();
          f(ctx);
          ctx.strokeStyle = A.outline();
          ctx.lineWidth = 10;
          ctx.stroke();
          ctx.strokeStyle = A.c('#7cc8ec');
          ctx.lineWidth = 6.5;
          ctx.stroke();
          ctx.setLineDash([6, 9]);
          ctx.lineDashOffset = -t * 60;
          ctx.strokeStyle = A.c('#f4fcff');
          ctx.lineWidth = 2.4;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
        });
        for (let i = 0; i < 3; i++) {
          const q = (t * 1.5 + i / 3) % 1;
          ctx.globalAlpha = GA * (1 - q);
          A.ellipse(ctx, 80 + (i - 1) * 8 * q, -94 - q * 8, 4 + q * 3, 3 + q * 2, '#ffffff', null, { lw: 1.4, hl: false });
        }
        ctx.globalAlpha = GA;
      }

      // 背後的圓窗（縮殼時的弱點，會發光）
      const win = withdrawn ? 0.7 + Math.sin(t * 10) * 0.3 : 0;
      if (withdrawn) glowC(ctx, -104, -104, 80, '#ffe070', 0.55 * win + 0.3);
      A.ellipse(ctx, -104, -104, 19, 20, '#5a4a40', '#3a2e28', { lw: 3, hl: false, cel: [2, 2] });
      A.shape(ctx, (c) => c.arc(-104, -104, 12.5, 0, TAU), withdrawn ? U.mix('#ffd84a', '#fffbe0', win) : '#284c78', null, { lw: 2.6 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-116, -104);
      ctx.lineTo(-92, -104);
      ctx.moveTo(-104, -116);
      ctx.lineTo(-104, -92);
      ctx.stroke();
      if (!withdrawn) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(-108, -108, 2.8, 0, TAU);
        ctx.fill();
      }
      // 藤壺群
      [[-138, -40, 7, -0.6], [-128, -26, 5, -0.5], [-144, -60, 4.5, -0.8], [-118, -12, 6, -0.2], [-96, -8, 4.5, 0], [-80, -4, 5.5, 0.1], [90, -52, 6, 0.9], [94, -38, 4.5, 1.1], [-122, -140, 4.5, -0.5], [-130, -120, 5.5, -0.7], [52, -150, 4, 0.4]].forEach(([x, y, r, a]) => barnacle(ctx, x, y, r, a));
      // 岩架上垂下的長海草（會滴水）
      [[-146, -76, 36, 0], [-140, -70, 26, 1.1], [52, -146, 30, 2.1], [86, -86, 34, 0.6], [-104, -30, 22, 1.7], [60, 0, 20, 2.5], [-40, 10, 18, 3.3], [-120, 6, 22, 0.4]].forEach(([x, y, l, ph], i) => {
        kelp(ctx, x, y, l, t, ph, i % 2 ? '#3f8a4e' : '#2f7a5e');
        if (!dead && i < 4) {
          const q = (t * 0.8 + ph) % 1;
          ctx.globalAlpha = GA * (1 - q);
          A.ellipse(ctx, x + Math.sin(t * 1.6 + ph) * l * 0.18, y + l + 4 + q * 26, 2.2, 3, '#9ad8f8', null, { lw: 1.2, hl: false });
          ctx.globalAlpha = GA;
        }
      });
      coral(ctx, -118, -4, 1.2, '#ff5f82', -0.3);
      coral(ctx, 70, 2, 1, '#ffa04a', 0.3);
      // 縮殼：前面的洞口，裡面兩點眼光在偷看
      if (withdrawn) {
        A.shape(ctx, (c) => { c.moveTo(24, 6); c.bezierCurveTo(16, -60, 96, -70, 94, -6); c.quadraticCurveTo(60, 10, 24, 6); c.closePath(); }, '#1a1014', null, { lw: 3.4 });
        limb(ctx, (c) => { c.moveTo(22, 6); c.bezierCurveTo(14, -62, 98, -74, 96, -6); }, 9, '#8a90a2');
        if (!dead) {
          const pk = Math.sin(t * 3) > 0 ? 3 : 0;
          const bl = Math.sin(t * 1.3) > 0.9;
          [[48 + pk, -22], [64 + pk, -23]].forEach(([x, y]) => {
            if (bl) {
              ctx.strokeStyle = A.c(eyeCol);
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.moveTo(x - 5, y);
              ctx.lineTo(x + 5, y);
              ctx.stroke();
            } else {
              glowC(ctx, x, y, 12, eyeCol, 0.6);
              ctx.fillStyle = A.c(eyeCol);
              ctx.beginPath();
              ctx.ellipse(x, y, 5, 5.5, 0, 0, TAU);
              ctx.fill();
              ctx.fillStyle = A.c('#1a0e0a');
              ctx.beginPath();
              ctx.ellipse(x + 1, y, 1.4, 4, 0, 0, TAU);
              ctx.fill();
            }
          });
        }
      } else {
        // 殼口（寄居蟹從這裡探出身體）
        A.shape(ctx, (c) => { c.moveTo(18, 8); c.bezierCurveTo(8, -84, 104, -96, 100, -8); c.quadraticCurveTo(60, 12, 18, 8); c.closePath(); }, '#1a1014', null, { lw: 3.4 });
        limb(ctx, (c) => { c.moveTo(16, 6); c.bezierCurveTo(6, -86, 106, -100, 102, -8); }, 11, '#8a90a2');
      }
      // 殼底一道拍岸的白浪線
      if (!dead) {
        A.shape(ctx, (c) => {
          c.moveTo(-150, 8);
          for (let x = -150; x < 10; x += 16) c.quadraticCurveTo(x + 8, 0 - Math.sin(t * 3 + x * 0.1) * 2.5, x + 16, 8);
          c.lineTo(10, 11);
          c.lineTo(-150, 11);
          c.closePath();
        }, '#eaf6fc', '#bcdcec', { lw: 2, shadeY: 8 });
      }
      // 海鳥窩＋站著的海鷗
      A.shape(ctx, (c) => { c.moveTo(-150, -76); c.quadraticCurveTo(-144, -66, -128, -70); c.lineTo(-126, -78); c.quadraticCurveTo(-138, -74, -150, -76); c.closePath(); }, '#8a6a40', '#6a4e2c', { lw: 2.2, shadeY: -72 });
      A.ellipse(ctx, -142, -79, 3.4, 4, '#f4f0e0', null, { lw: 1.6, hl: false });
      A.ellipse(ctx, -135, -79, 3, 3.6, '#e8f0f4', null, { lw: 1.6, hl: false });
      const birdsUp = !dead && (p2 > 0.5 || st === 'tsunami' || st === 'transform');
      if (!birdsUp) {
        tinyGull(ctx, 34, -178, 0.95, t * 2, false);
        tinyGull(ctx, -64, -178, 0.85, t * 2 + 1, false);
      }

      // ─ 燈塔（崖頂）─
      const tower = (c) => {
        c.moveTo(-15, -186);
        c.lineTo(-10, -219);
        c.lineTo(10, -219);
        c.lineTo(15, -186);
        c.closePath();
      };
      A.shape(ctx, tower, '#f4ead8', null, { noStroke: true });
      ctx.save();
      ctx.beginPath();
      tower(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#c0362e');
      ctx.fillRect(-30, -212, 60, 8);
      ctx.fillRect(-30, -198, 60, 8);
      ctx.fillStyle = 'rgba(40,20,30,0.28)';
      ctx.fillRect(4, -225, 20, 45);
      ctx.restore();
      ctx.beginPath();
      tower(ctx);
      ctx.lineWidth = 3;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-4, -186); c.lineTo(-4, -193); c.arc(0, -193, 4, PI, 0); c.lineTo(4, -186); c.closePath(); }, '#3a2a22', null, { lw: 2 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-17, -226);
      ctx.lineTo(17, -226);
      for (let i = -3; i <= 3; i++) {
        ctx.moveTo(i * 5.4, -226);
        ctx.lineTo(i * 5.4, -220);
      }
      ctx.stroke();
      A.shape(ctx, (c) => A.roundRect(c, -19, -221, 38, 5, 2), '#3a3444', null, { lw: 2.4 });
      // 燈光：外層柔光＋主光束＋第二階段的旋轉光
      const LY = -233;
      if (lampOn > 0) {
        glowC(ctx, 0, LY, hot ? 150 : 80, lampCol, (hot ? 0.9 : 0.6) * lampOn);
        if (p2 > 0.3 && !withdrawn) {
          ctx.save();
          ctx.globalAlpha = GA * 0.26 * p2;
          ctx.fillStyle = A.c('#ffc880');
          ctx.translate(0, LY);
          ctx.rotate(t * 2.4);
          for (let k2 = 0; k2 < 2; k2++) {
            ctx.rotate(PI);
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(420, -70);
            ctx.lineTo(420, 70);
            ctx.lineTo(0, 4);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
        ctx.save();
        ctx.translate(0, LY);
        ctx.rotate(Math.sin(t * (hot ? 3 : 1.2)) * 0.3 - 0.05);
        const bl = hot ? 360 : 300;
        const bg = ctx.createLinearGradient(0, 0, bl, 0);
        const bc = U.hexToRgb(A.c(p2 > 0.5 ? '#ffb060' : '#fff2b8')).join(',');
        bg.addColorStop(0, 'rgba(' + bc + ',' + (0.55 * lampOn).toFixed(3) + ')');
        bg.addColorStop(1, 'rgba(' + bc + ',0)');
        ctx.fillStyle = bg;
        ctx.globalAlpha = GA * (hot ? 0.9 : 0.6);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(bl, -70);
        ctx.lineTo(bl, 56);
        ctx.lineTo(0, 6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(bl, -22);
        ctx.lineTo(bl, 12);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = GA;
      }
      A.shape(ctx, (c) => A.roundRect(c, -12, -245, 24, 20, 3), U.mix(U.mix('#6a88a8', '#fff2a8', lampOn), '#ffa060', p2 * 0.6), U.mix('#4a6888', '#ffd860', lampOn), { lw: 2.6, shadeY: -234 });
      if (lampOn > 0) {
        ctx.globalAlpha = GA * lampOn;
        A.ellipse(ctx, 0, LY - 2, 5.5, 6.5, '#fffbe6', null, { noStroke: true, hl: false });
        // 十字星芒
        ctx.fillStyle = A.c('#fffbe6');
        const fl = (hot ? 30 : 16) * (0.85 + Math.sin(t * 7) * 0.15);
        ctx.beginPath();
        ctx.moveTo(-fl, LY - 2);
        ctx.lineTo(0, LY - 4);
        ctx.lineTo(fl, LY - 2);
        ctx.lineTo(0, LY);
        ctx.closePath();
        ctx.moveTo(0, LY - 2 - fl * 0.7);
        ctx.lineTo(2, LY - 2);
        ctx.lineTo(0, LY - 2 + fl * 0.7);
        ctx.lineTo(-2, LY - 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = GA;
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, -245);
      ctx.lineTo(-4, -226);
      ctx.moveTo(4, -245);
      ctx.lineTo(4, -226);
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-16, -243); c.quadraticCurveTo(0, -264, 16, -243); c.closePath(); }, '#c0362e', '#8a2420', { cel: [2.5, 2], lw: 2.6 });
      A.ellipse(ctx, 0, -260, 3, 3, '#ffd35a', null, { lw: 1.8, hl: false });
      if (birdsUp) {
        for (let i = 0; i < 3; i++) {
          const a = t * 1.3 + (i * TAU) / 3;
          tinyGull(ctx, Math.cos(a) * 70 - 20, -286 + Math.sin(a) * 12 + i * 6, 1 - i * 0.12, t * 10 + i, true);
        }
      }
      ctx.restore();
    };

    if (shell) {
      // 整隻縮進岩柱：岩柱在搖，只剩背後的圓窗在發光
      drawStack(0, 0, Math.sin(t * 6) * 0.022, true);
      foam(true);
      ctx.restore();
      return;
    }

    // ─────────── 姿勢 ───────────
    const bx = 70;
    const by = -104 + (walk ? -Math.abs(Math.sin(t * 8)) * 3 : 0);
    let big = { x: 204, y: -66, r: 44, rot: -0.12, open: 0.3 + Math.sin(t * 3) * 0.08 };
    let small = { x: 150, y: -28, r: 19, rot: 0.2, open: 0.3 };
    if (st === 'tidePrep') {
      big = { x: 196, y: -190, r: 44, rot: -1.1, open: 0.8 };
      small = { x: 40, y: -196, r: 20, rot: -1.9, open: 0.8 };
    } else if (st === 'tide') {
      big = { x: 218, y: -44, r: 44, rot: 0.35, open: 0.2 };
      small = { x: 188, y: -20, r: 20, rot: 0.25, open: 0.2 };
    } else if (st === 'clawPrep') {
      big = { x: 192, y: -214, r: 48, rot: -1.45, open: 1 };
    } else if (st === 'clawSlam') {
      big = { x: 214, y: -40, r: 48, rot: 0.45, open: 0 };
    } else if (st === 'tsunamiPrep' || st === 'tsunami' || st === 'barrage' || st === 'beamPrep' || st === 'transform' || st === 'summon') {
      const w2 = Math.sin(t * (st === 'tsunami' || st === 'barrage' ? 10 : 4)) * 11;
      big = { x: 190, y: -196 + w2, r: 46, rot: -1.25, open: 0.8 + Math.sin(t * 8) * 0.2 };
      small = { x: 56, y: -186 - w2, r: 20, rot: -1.8, open: 0.8 };
    } else if (st === 'beam') {
      big = { x: 200, y: -58 + Math.sin(t * 14) * 5, r: 45, rot: 0.3, open: 0.6 + Math.sin(t * 14) * 0.3 };
      small = { x: 148, y: -26, r: 20, rot: 0.3, open: 0.5 };
    } else if (st === 'flopAir' || st === 'perchAir' || st === 'fall') {
      big = { x: 198, y: -150, r: 45, rot: -0.8, open: 0.9 };
      small = { x: 152, y: -94, r: 20, rot: -0.6, open: 0.8 };
    } else if (st === 'recover' || dead) {
      big = { x: 196, y: -44, r: 44, rot: 0.4, open: 0.5 };
      small = { x: 140, y: -22, r: 19, rot: 0.4, open: 0.5 };
    }
    // 圖鑑卡片（只有圖鑑用 'walk'）：巨鉗收近一點，才不會壓到卡片上的字
    if (st === 'walk') {
      big.x -= 26;
      big.y += 8;
    }
    const air = st === 'flopAir' || st === 'perchAir' || st === 'fall' || !m.onGround;

    // ─ 腳：粗壯、分節、關節有刺、腳尖黑 ─
    const legs = (near) => {
      for (let i = 0; i < 2; i++) {
        const ph = t * (fast ? 22 : 8) + i * 2.4 + (near ? PI * 0.5 : 0);
        const lift = walk ? Math.max(0, Math.sin(ph)) * (fast ? 16 : 11) : 0;
        const sw = walk ? Math.cos(ph) * 6 : 0;
        const x0 = near ? bx - 30 + i * 50 : bx - 12 + i * 44;
        const y0 = by + (near ? 44 : 34);
        const kx = x0 + (near ? 30 : 24);
        const ky = (near ? -34 : -44) - lift * 0.6 - (air ? 22 : 0);
        const fx = x0 + (near ? 16 : 14) + sw;
        const fy = (air ? -30 : -2) - lift;
        const w = near ? 14 : 12;
        const P = near ? CAR : CARD;
        seg(ctx, x0, y0, kx, ky, w, w * 0.85, P[0], P[1]);
        seg(ctx, kx, ky, fx, fy, w * 0.85, 4.5, P[0], P[1]);
        ctx.strokeStyle = A.c(P[1]);
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
        const dx = fx - kx;
        const dy = fy - ky;
        const L = Math.hypot(dx, dy) || 1;
        A.shape(ctx, (c) => {
          c.moveTo(fx - (dy / L) * 5 - (dx / L) * 16, fy + (dx / L) * 5 - (dy / L) * 16);
          c.lineTo(fx + (dx / L) * 6, fy + (dy / L) * 6);
          c.lineTo(fx + (dy / L) * 5 - (dx / L) * 16, fy - (dx / L) * 5 - (dy / L) * 16);
          c.closePath();
        }, '#1e0e0c', null, { lw: 2 });
        spike(ctx, kx, ky - 4, -PI / 2 + 0.3, 16, 5, near ? '#e8dcc4' : '#b8a890', near ? '#b8a68a' : '#8a7a64');
        A.ellipse(ctx, kx, ky, w * 0.8, w * 0.72, P[0], P[1], { lw: 2.4, hl: false, cel: [2, 2] });
      }
    };

    // 觸鬚：長長往後飄（在岩柱後面）
    if (!dead) {
      const aw = Math.sin(t * 1.7) * 10;
      limb(ctx, (c) => {
        c.moveTo(bx + 46, by - 34);
        c.bezierCurveTo(bx + 60, by - 120, bx - 20, by - 150 + aw, bx - 100, by - 120 + aw * 1.5);
        c.moveTo(bx + 52, by - 32);
        c.bezierCurveTo(bx + 100, by - 110, bx + 20, by - 160 - aw, bx - 40, by - 164 - aw);
      }, 5, '#c0503a');
    }

    drawStack(-40, -6, -0.03, false);
    legs(false);

    // 小螯（切割用，細長）
    seg(ctx, bx + 34, by + 16, small.x - 12, small.y + 4, 9, 7, CARD[0], CARD[1]);
    titanClaw(ctx, small.x, small.y, small.r, small.open, small.rot, false, p2, t, dead);

    // 眼柄（短而粗，有甲環）
    const e1 = [bx + 24 + Math.sin(t * 2.5) * 1.5, by - 74];
    const e2 = [bx + 60 + Math.sin(t * 2.5 + 0.5) * 1.5, by - 66];
    seg(ctx, bx + 22, by - 36, e1[0], e1[1] + 6, 9, 7.5, CAR[0], CAR[1]);
    seg(ctx, bx + 56, by - 32, e2[0], e2[1] + 6, 9, 7.5, CAR[0], CAR[1]);

    // ─ 厚重甲殼 ─
    const body = (c) => {
      c.moveTo(bx - 70, by + 26);
      c.lineTo(bx - 78, by + 2);
      c.lineTo(bx - 66, by - 22);
      c.lineTo(bx - 50, by - 44);
      c.lineTo(bx - 20, by - 58);
      c.lineTo(bx + 16, by - 62);
      c.lineTo(bx + 50, by - 56);
      c.lineTo(bx + 76, by - 38);
      c.lineTo(bx + 90, by - 12);
      c.lineTo(bx + 86, by + 8);
      c.lineTo(bx + 92, by + 18);
      c.lineTo(bx + 80, by + 28);
      c.quadraticCurveTo(bx + 60, by + 46, bx + 20, by + 46);
      c.lineTo(bx + 10, by + 54);
      c.lineTo(bx, by + 46);
      c.quadraticCurveTo(bx - 44, by + 46, bx - 70, by + 26);
      c.closePath();
    };
    rimShape(ctx, body, CAR[0], CAR[1], CAR[2], { cel: 11, rim: 4, noStroke: true, under: hot ? [bx, by + 60, 90, '#ff9040', 0.35] : null });
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    // 腹側較深的甲片
    ctx.fillStyle = A.c('#7a2420');
    ctx.beginPath();
    ctx.moveTo(bx - 90, by + 14);
    ctx.quadraticCurveTo(bx, by + 2, bx + 100, by + 10);
    ctx.lineTo(bx + 100, by + 60);
    ctx.lineTo(bx - 90, by + 60);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = A.c('#4e1414');
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const x = bx - 46 + i * 28;
      ctx.moveTo(x, by + 12);
      ctx.quadraticCurveTo(x + 4, by + 28, x - 2, by + 48);
    }
    ctx.stroke();
    // 隆起的甲稜（亮面＋暗面）
    const ridge = (x0, y0, x1, y1, x2, y2) => {
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x1, y1, x2, y2);
      ctx.strokeStyle = A.c('#5a1614');
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0 - 1, y0 - 3);
      ctx.quadraticCurveTo(x1 - 1, y1 - 3, x2 - 1, y2 - 3);
      ctx.strokeStyle = A.c('#d8684a');
      ctx.lineWidth = 2.5;
      ctx.stroke();
    };
    ridge(bx - 64, by + 2, bx + 6, by - 20, bx + 84, by);
    ridge(bx - 36, by - 44, bx - 26, by - 26, bx - 34, by - 6);
    ridge(bx + 40, by - 50, bx + 46, by - 32, bx + 40, by - 16);
    // 疣粒
    ctx.fillStyle = A.c('#7a2220');
    [[-44, -30, 4], [-52, -10, 3], [62, -30, 3]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(bx + x, by + y, r, 0, TAU); ctx.fill(); });
    // 戰痕：三道舊爪痕
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(bx - 4 + i * 9, by - 40 + i * 2);
      ctx.lineTo(bx + 18 + i * 9, by - 14 + i * 2);
      ctx.strokeStyle = A.c('#3e0e0e');
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = A.c('#e89a80');
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (p2 > 0 && !dead) {
      ctx.globalAlpha = GA * p2;
      ctx.strokeStyle = 'rgba(255,150,60,0.5)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(bx - 60, by + 22);
      ctx.lineTo(bx - 44, by + 6);
      ctx.lineTo(bx - 50, by - 12);
      ctx.moveTo(bx - 44, by + 6);
      ctx.lineTo(bx - 24, by + 12);
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffc45a');
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = GA;
    }
    ctx.restore();
    ctx.beginPath();
    body(ctx);
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    legs(true);
    // 甲殼頂上的骨刺冠
    [[-54, -40, -2.1, 12], [-34, -52, -1.85, 16], [-10, -60, -1.65, 20], [14, -62, -1.5, 22], [38, -58, -1.3, 18], [62, -46, -1.05, 14], [82, -26, -0.7, 10]].forEach(([x, y, a, h]) => spike(ctx, bx + x, by + y, a, h, 6));
    // 甲殼邊緣的倒刺
    [[-76, 0, PI + 0.2, 10], [-70, -20, PI - 0.4, 9], [90, -8, -0.1, 10], [92, 16, 0.2, 8]].forEach(([x, y, a, h]) => spike(ctx, bx + x, by + y, a, h, 5, CAR[0], CAR[1]));
    // 背上的藤壺叢與小珊瑚、青苔
    A.shape(ctx, (c) => {
      c.moveTo(bx - 64, by - 22);
      c.quadraticCurveTo(bx - 58, by - 48, bx - 24, by - 58);
      c.quadraticCurveTo(bx - 10, by - 58, bx - 6, by - 52);
      c.quadraticCurveTo(bx - 14, by - 46, bx - 22, by - 48);
      c.quadraticCurveTo(bx - 30, by - 38, bx - 40, by - 42);
      c.quadraticCurveTo(bx - 50, by - 26, bx - 64, by - 22);
      c.closePath();
    }, '#4e7e44', '#365e32', { cel: [1.5, 2], lw: 2 });
    barnacle(ctx, bx - 46, by - 46, 7, -0.4);
    barnacle(ctx, bx - 32, by - 55, 5.5, -0.2);
    barnacle(ctx, bx - 58, by - 32, 5, -0.8);
    barnacle(ctx, bx - 22, by - 58, 4, 0);
    coral(ctx, bx - 8, by - 58, 0.8, '#ff7a9a', 0.2);

    // ─ 眼睛：骨質眉甲底下的琥珀色老眼（縱向瞳孔）─
    const eyeR = [15, 14];
    [e1, e2].forEach(([x, y], i) => {
      const r = eyeR[i];
      A.ellipse(ctx, x, y, r + 2, r + 2, '#2a1210', null, { lw: 3, hl: false });
      if (kind === 'x') {
        ctx.strokeStyle = A.c('#e8dcc4');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 6);
        ctx.lineTo(x + 6, y + 6);
        ctx.moveTo(x + 6, y - 6);
        ctx.lineTo(x - 6, y + 6);
        ctx.stroke();
      } else if (kind === 'closed' || kind === 'hurt' || st === 'recover') {
        ctx.strokeStyle = A.c(eyeCol);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (kind === 'hurt') {
          ctx.moveTo(x - 7, y - 5);
          ctx.lineTo(x + 5, y);
          ctx.lineTo(x - 7, y + 5);
        } else {
          ctx.moveTo(x - 8, y + 2);
          ctx.quadraticCurveTo(x, y + 6, x + 8, y + 2);
        }
        ctx.stroke();
      } else {
        glowC(ctx, x + 2, y + 2, 32, eyeCol, fierce ? 0.8 : 0.6);
        A.ellipse(ctx, x + 2, y + 2, r * 0.82, r * 0.82, eyeCol, U.mix(eyeCol, '#8a3a10', 0.5), { lw: 2, hl: false, shadeAt: 0.2 });
        ctx.fillStyle = A.c('#1a0a08');
        ctx.beginPath();
        ctx.ellipse(x + 3, y + 3, fierce ? 1.8 : 2.8, r * 0.62, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff8e0';
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, 2.4, 0, TAU);
        ctx.fill();
      }
      // 眉甲：蓋住上半的厚骨板（得意時壓低成半瞇，生氣時斜下來）
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(fierce ? (i ? -0.35 : 0.35) : i ? 0.12 : -0.12);
      const drop = fierce ? 1 : laugh ? -3 : 2;
      rimShape(ctx, (c) => {
        c.moveTo(-r - 6, drop + 2);
        c.quadraticCurveTo(-r - 4, -r - 6, 0, -r - 8);
        c.quadraticCurveTo(r + 6, -r - 6, r + 8, drop);
        c.quadraticCurveTo(0, drop - 4, -r - 6, drop + 2);
        c.closePath();
      }, '#8a2a24', '#5a1818', '#d8684a', { cel: 3, rim: 2.5, lw: 2.8 });
      // 眉甲後面翹起的一撮白剛毛（老蟹的濃眉）
      A.shape(ctx, (c) => {
        c.moveTo(-r - 2, -r * 0.5);
        c.quadraticCurveTo(-r - 16, -r - 4, -r - 22, -r - 14);
        c.quadraticCurveTo(-r - 8, -r - 10, -r * 0.2, -r - 8);
        c.quadraticCurveTo(-r * 0.6, -r * 0.6, -r - 2, -r * 0.5);
        c.closePath();
      }, '#f2ece0', '#c8bcaa', { cel: [2, 2], lw: 2.2 });
      spike(ctx, r * 0.6, -r - 6, -PI / 2 + 0.5, 10, 3.5);
      ctx.restore();
    });
    if (laugh && Math.sin(t * 6) > -0.3) {
      ctx.save();
      ctx.font = 'bold 30px ' + A.FONT;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = A.OUT;
      ctx.fillStyle = '#fff3a0';
      const hy = by - 150 - ((t * 2) % 1) * 24;
      [[bx + 110, hy], [bx + 146, hy - 24]].forEach(([x, y]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(m.dir < 0 ? -1 : 1, 1);
        ctx.strokeText('哈', 0, 0);
        ctx.fillText('哈', 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }
    // ─ 口器：兩片鋸齒顎板，中間是咧開的嘴 ─
    const mx = bx + 46;
    const my = by - 10;
    [[-12, 18, 0.35], [10, 20, -0.25]].forEach(([dx, dy, a]) => rimShape(ctx, (c) => c.ellipse(mx + dx, my + dy, 11, 7, a, 0, TAU), '#b8402f', '#7a2420', '#e8765a', { cel: 2, rim: 2, lw: 2.2 }));
    if (laugh && !(m.hurtFlash > 0.05)) {
      A.shape(ctx, (c) => { c.moveTo(mx - 22, my - 6); c.quadraticCurveTo(mx + 3, my - 11, mx + 27, my - 8); c.quadraticCurveTo(mx + 22, my + 28, mx - 22, my - 6); c.closePath(); }, '#3a0e0e', null, { lw: 3 });
      A.ellipse(ctx, mx + 4, my + 12, 8, 5, '#c85050', null, { noStroke: true, hl: false });
      ctx.fillStyle = A.c('#f2e6cc');
      for (let i = 0; i < 5; i++) {
        const x = mx - 16 + i * 9;
        ctx.beginPath();
        ctx.moveTo(x, my - 8);
        ctx.lineTo(x + 4, my - 1);
        ctx.lineTo(x + 8, my - 8);
        ctx.closePath();
        ctx.fill();
      }
    } else if (dead || st === 'recover' || m.hurtFlash > 0.05) {
      A.ellipse(ctx, mx, my + 3, 10, 8, '#3a0e0e', null, { lw: 2.8, hl: false });
    } else {
      // 咧嘴：一排尖牙（生氣時張得更開）
      const o = fierce || st === 'tide' || st === 'clawSlam' ? 12 : 6;
      A.shape(ctx, (c) => { c.moveTo(mx - 22, my - 2); c.quadraticCurveTo(mx, my - 8, mx + 26, my - 12); c.quadraticCurveTo(mx + 20, my + o, mx - 22, my - 2); c.closePath(); }, '#3a0e0e', null, { lw: 2.8 });
      ctx.fillStyle = A.c('#f2e6cc');
      for (let i = 0; i < 5; i++) {
        const u = i / 4;
        const x = mx - 16 + u * 36;
        const y = my - 4 - u * 7;
        ctx.beginPath();
        ctx.moveTo(x - 3.5, y);
        ctx.lineTo(x, y + 6);
        ctx.lineTo(x + 3.5, y - 1);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ─ 巨鉗：粗壯的手臂（有刺的腕節）＋壓碎用的大鉗 ─
    const ax = bx + 66;
    const ay = by + 22;
    const BR = big.r * 1.2;
    const cx0 = big.x - Math.cos(big.rot) * BR * 0.85;
    const cy0 = big.y - Math.sin(big.rot) * BR * 0.85;
    const jx = (ax + cx0) / 2 + 6;
    const jy = Math.max(ay, cy0) + 12;
    seg(ctx, ax, ay, jx, jy, 15, 14, CAR[0], CAR[1]);
    seg(ctx, jx, jy, cx0, cy0, 14, 17, CAR[0], CAR[1]);
    rimShape(ctx, (c) => c.ellipse(jx, jy, 18, 15, 0, 0, TAU), CAR[0], CAR[1], CAR[2], { cel: 4, rim: 2.5, lw: 3 });
    spike(ctx, jx - 4, jy - 12, -PI / 2 - 0.2, 18, 6);
    spike(ctx, jx + 10, jy - 8, -PI / 2 + 0.5, 12, 5);
    titanClaw(ctx, big.x, big.y, BR, big.open, big.rot, true, p2, t, dead);
    if (st === 'clawSlam' || st === 'tide') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(big.x - 44 - i * 9, big.y - 64 + i * 22);
        ctx.lineTo(big.x - 86 - i * 9, big.y - 78 + i * 22);
      }
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const q = (t * 3 + i / 5) % 1;
        ctx.globalAlpha = GA * (1 - q);
        A.ellipse(ctx, big.x + 20 + (i - 2) * 18 * (1 + q), big.y + 34 - q * 44 - Math.abs(i - 2) * 6, 7 - q * 2, 6 - q * 2, '#e6f6ff', null, { lw: 1.6, hl: false });
      }
      ctx.globalAlpha = GA;
    }
    foam(true);
    if (st === 'recover' && !dead) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * TAU) / 3;
        star(ctx, bx + 40 + Math.cos(a) * 40, by - 124 + Math.sin(a) * 10);
      }
    }
    ctx.restore();
  }
  // 螯：big＝壓碎用的巨鉗（粗厚掌節、臼齒般的鋸齒、藤壺、戰痕）；否則是細長的切割鉗。open 0~1
  function titanClaw(ctx, x, y, r, open, rot, big, p2, t, dead) {
    const col = big ? '#a8342a' : '#8e2a24';
    const sh = big ? '#6a1c1a' : '#561616';
    const rim = big ? '#e0704e' : '#c05a44';
    const GA = ctx.globalAlpha;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    const finger = (flip, len, w, ang) => {
      ctx.save();
      ctx.translate(r * 0.55, flip * r * 0.14);
      ctx.scale(1, flip);
      ctx.rotate(ang);
      const path = big
        ? (c) => {
            c.moveTo(-r * 0.15, -w);
            c.bezierCurveTo(len * 0.5, -w * 1.5, len * 0.9, -w * 0.9, len, w * 0.25);
            c.quadraticCurveTo(len * 0.6, w * 0.3, -r * 0.15, w * 0.8);
            c.closePath();
          }
        : (c) => {
            c.moveTo(-r * 0.15, -w);
            c.quadraticCurveTo(len * 0.8, -w * 1.2, len, w * 0.1);
            c.quadraticCurveTo(len * 0.6, w * 0.1, -r * 0.15, w * 0.7);
            c.closePath();
          };
      rimShape(ctx, path, col, flip > 0 ? col : sh, flip > 0 ? rim : null, { cel: w * 0.25, rim: 2.5, noStroke: true });
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#1e0e0c');
      ctx.beginPath();
      ctx.moveTo(len * 0.6, -w * 2);
      ctx.quadraticCurveTo(len * 0.7, 0, len * 0.64, w * 2);
      ctx.lineTo(len * 2, w * 2);
      ctx.lineTo(len * 2, -w * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = big ? 3.6 : 2.6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      // 內側的臼齒／鋸齒
      const n = big ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const u = 0.1 + i * (big ? 0.11 : 0.15);
        const px = len * u;
        const py = w * 0.78 - w * 0.5 * u;
        if (big) A.shape(ctx, (c) => { c.moveTo(px - 5, py - 1); c.quadraticCurveTo(px, py + 10, px + 5, py - 1.5); c.closePath(); }, '#efe2c8', '#c4b090', { lw: 1.8, shadeY: py + 3 });
        else A.shape(ctx, (c) => { c.moveTo(px - 3, py - 1); c.lineTo(px + 1, py + 5); c.lineTo(px + 3, py - 1); c.closePath(); }, '#efe2c8', null, { lw: 1.4 });
      }
      ctx.restore();
    };
    finger(1, r * (big ? 1.15 : 1.35), r * (big ? 0.5 : 0.36), 0.1 - open * 0.55);
    finger(-1, r * (big ? 1.35 : 1.6), r * (big ? 0.62 : 0.44), 0.02 - open * 0.65);
    const palm = big
      ? (c) => {
          c.moveTo(-r * 1.05, -r * 0.1);
          c.lineTo(-r * 0.92, -r * 0.62);
          c.lineTo(-r * 0.5, -r * 0.92);
          c.lineTo(r * 0.2, -r * 1.02);
          c.lineTo(r * 0.72, -r * 0.66);
          c.quadraticCurveTo(r * 1.02, -r * 0.2, r * 0.9, r * 0.32);
          c.bezierCurveTo(r * 0.72, r * 0.86, -r * 0.4, r * 0.92, -r * 0.86, r * 0.5);
          c.quadraticCurveTo(-r * 1.12, r * 0.22, -r * 1.05, -r * 0.1);
          c.closePath();
        }
      : (c) => c.ellipse(0, 0, r * 0.9, r * 0.7, 0, 0, TAU);
    rimShape(ctx, palm, col, sh, rim, { cel: r * 0.2, rim: big ? 4 : 2.5, lw: big ? 3.8 : 2.8 });
    if (big) {
      ctx.save();
      ctx.beginPath();
      palm(ctx);
      ctx.clip();
      // 掌上的甲稜與戰痕
      ctx.lineCap = 'round';
      ctx.strokeStyle = A.c('#5a1614');
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r * 0.1);
      ctx.quadraticCurveTo(-r * 0.1, -r * 0.2, r * 0.85, r * 0.05);
      ctx.stroke();
      ctx.strokeStyle = A.c('#d8684a');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r * 0.06);
      ctx.quadraticCurveTo(-r * 0.1, -r * 0.24, r * 0.85, r * 0.01);
      ctx.stroke();
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.1 + i * 8, r * 0.2);
        ctx.lineTo(r * 0.3 + i * 8, r * 0.62);
        ctx.strokeStyle = A.c('#3e0e0e');
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.strokeStyle = A.c('#e89a80');
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
      ctx.fillStyle = A.c('#7a2220');
      [[0.3, -0.55, 0.06], [-0.7, 0.15, 0.06], [0.5, 0.3, 0.05]].forEach(([u, v, s]) => {
        ctx.beginPath();
        ctx.arc(u * r, v * r, s * r, 0, TAU);
        ctx.fill();
      });
      if (p2 > 0 && !dead) {
        ctx.globalAlpha = GA * p2;
        ctx.strokeStyle = 'rgba(255,150,60,0.5)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, r * 0.35);
        ctx.lineTo(-r * 0.35, r * 0.2);
        ctx.lineTo(-r * 0.2, r * 0.5);
        ctx.lineTo(r * 0.2, r * 0.4);
        ctx.stroke();
        ctx.strokeStyle = A.c('#ffc45a');
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = GA;
      }
      ctx.restore();
      // 掌背的骨刺、藤壺叢、珊瑚、海草
      [[-0.85, -0.55, -2.4, 0.3], [-0.45, -0.9, -1.9, 0.36], [0.1, -1.0, -1.5, 0.3], [0.6, -0.7, -1.1, 0.24]].forEach(([u, v, a, h]) => spike(ctx, u * r, v * r, a, h * r, r * 0.09));
      barnacle(ctx, -r * 0.62, -r * 0.4, r * 0.16, -0.8);
      barnacle(ctx, -r * 0.3, -r * 0.62, r * 0.18, -0.3);
      barnacle(ctx, -r * 0.46, -r * 0.2, r * 0.12, -0.5);
      barnacle(ctx, r * 0.25, r * 0.66, r * 0.12, PI + 0.3);
      barnacle(ctx, -r * 0.2, r * 0.72, r * 0.1, PI);
      coral(ctx, r * 0.3, -r * 0.8, r * 0.02, '#ff6f8a', 0.5);
      if (!dead) kelp(ctx, -r * 0.55, r * 0.55, r * 0.55, t || 0, 1, '#3f8a4e');
    }
    ctx.restore();
  }

  // ═════════════ Boss：熔岩甲龜 ═════════════
  // 上古的火山巨龜：背甲本身就是一座崎嶇的活火山——斷崖、岩架、柱狀節理、鋸齒狀的火山口、發光的岩縫與熔岩河、
  // 滾滾的火山灰柱（底部被熔岩照紅）；四條像岩柱一樣的巨腿，頭像一塊古老的岩石：鉤喙、石板般的鱗甲、
  // 深陷在眉骨底下發著餘燼光的眼睛。設計座標 = 世界座標（h=230），原點在腳底中央、面向右。
  function lavaTortoise(ctx, m) {
    const t = m.t || 0;
    const st = m.state;
    const GA = ctx.globalAlpha;
    const dead = !!m.dead;
    const SK = ['#5e5244', '#3a3028', '#9a8a70'];
    const SKD = ['#4a4036', '#2e2620', '#766a58'];
    const ROCK = ['#4a3c3e', '#2a2026', '#8a6e64'];
    const p2 = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    const hot = p2 > 0.5;
    const K = (m.h || 230) / 230;
    const prep = st === 'eruptPrep' || st === 'meteorPrep';
    const erupt = !dead && (st === 'erupt' || st === 'meteor' || (st === 'transform' && p2 > 0.4) || (hot && Math.sin(t * 1.7) > 0.6));
    const heat = dead ? 0 : Math.min(1.4, 0.6 + Math.sin(t * 3) * 0.15 + (prep ? 0.45 + Math.sin(t * 20) * 0.15 : 0) + (erupt ? 0.6 : 0) + (hot ? 0.35 : 0));
    const hk = Math.max(0, Math.min(1, heat - 0.3));
    const lavaC = dead ? '#4a3430' : hot ? U.mix('#ff4a16', '#ffc83a', hk) : U.mix('#f0641a', '#ffd84a', hk);
    const lavaCore = dead ? '#5a4038' : U.mix('#ffd24a', '#fff6c0', hk);
    const emberC = hot ? '#ff6a1a' : '#ffae3a';
    const shake = prep ? Math.sin(t * 50) * 2.5 : 0;
    const gallery = st === 'walk';

    ctx.save();
    ctx.scale(K, K);
    // 對話框頭像（Boss 的複本放在原點）：往後挪，讓頭在框裡
    if (m.x === 0 && m.y === 0 && st === 'recover') ctx.translate(-170, 0);
    ctx.fillStyle = 'rgba(20,6,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 190, 22, 0, 0, TAU);
    ctx.fill();
    ctx.translate(shake, 0);
    if (!dead) glowC(ctx, -10, -140, 280, '#ff5a1e', (hot ? 0.24 : 0.1) + Math.sin(t * 6) * 0.04);

    // ── 熔岩線：外發光＋深色描邊＋亮色＋更亮的芯 ──
    const lavaStroke = (path, w, flow) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      path(ctx);
      if (heat > 0) {
        ctx.strokeStyle = 'rgba(255,120,30,' + Math.min(1, 0.32 * heat).toFixed(3) + ')';
        ctx.lineWidth = w + 10;
        ctx.stroke();
      }
      ctx.strokeStyle = A.c('#1a0c0a');
      ctx.lineWidth = w + 3.5;
      ctx.stroke();
      ctx.strokeStyle = A.c(lavaC);
      ctx.lineWidth = w;
      ctx.stroke();
      if (!dead) {
        ctx.strokeStyle = A.c(lavaCore);
        ctx.lineWidth = Math.max(1.2, w * 0.36);
        if (flow) {
          ctx.setLineDash([10, 8]);
          ctx.lineDashOffset = -t * 30;
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
      }
    };
    // 背甲的熔岩裂縫網（翻滾的岩球也用）
    const cracks = (c) => {
      c.moveTo(-124, -4);
      c.lineTo(-114, -14);
      c.lineTo(-118, -24);
      c.lineTo(-104, -34);
      c.lineTo(-100, -48);
      c.moveTo(-18, -2);
      c.lineTo(-24, -14);
      c.lineTo(-12, -24);
      c.lineTo(-16, -36);
      c.moveTo(-12, -24);
      c.lineTo(2, -28);
      c.moveTo(70, -4);
      c.lineTo(80, -16);
      c.lineTo(74, -28);
      c.lineTo(90, -40);
      c.moveTo(130, -6);
      c.lineTo(126, -18);
      c.lineTo(138, -30);
    };
    // 老松（第二階段燒起來）
    const pine = (x, y, s) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      const burnt = dead || p2 > 0.5;
      limb(ctx, (c) => { c.moveTo(0, 2); c.lineTo(0, -10); }, 5, '#4a3424');
      [[0, -8, 12], [0, -16, 10], [0, -23, 7.5]].forEach(([dx, dy, r]) => {
        A.shape(ctx, (c) => { c.moveTo(dx - r, dy + 3); c.lineTo(dx - r * 0.3, dy - r * 0.5); c.lineTo(dx, dy - r * 0.95); c.lineTo(dx + r * 0.35, dy - r * 0.45); c.lineTo(dx + r, dy + 3); c.closePath(); }, burnt ? '#2e2628' : '#2e5a3a', burnt ? '#1e181c' : '#1e3e2a', { lw: 2, shadeY: dy - 1 });
      });
      if (burnt && !dead) {
        const f = Math.sin(t * 16 + x) * 1.5;
        glowC(ctx, 0, -28, 16, '#ff8a2a', 0.5);
        A.shape(ctx, (c) => { c.moveTo(-5, -22); c.quadraticCurveTo(-4, -32, f, -38); c.quadraticCurveTo(5, -30, 5, -22); c.closePath(); }, '#ff8a2a', null, { lw: 1.6 });
      }
      ctx.restore();
    };
    // 柱狀節理（六角玄武岩柱：亮面＋暗面）
    const basalt = (x, y, cols) => {
      cols.forEach(([dx, h, w]) => {
        const x0 = x + dx;
        A.shape(ctx, (c) => { c.moveTo(x0 - w, y); c.lineTo(x0 - w, y - h); c.lineTo(x0, y - h - w * 0.45); c.lineTo(x0 + w, y - h); c.lineTo(x0 + w, y); c.closePath(); }, '#4e4652', null, { noStroke: true });
        ctx.fillStyle = A.c('#2a2430');
        ctx.beginPath();
        ctx.moveTo(x0, y - h + w * 0.45);
        ctx.lineTo(x0 + w, y - h);
        ctx.lineTo(x0 + w, y + 2);
        ctx.lineTo(x0, y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = A.c('#7a7080');
        ctx.beginPath();
        ctx.moveTo(x0 - w, y - h);
        ctx.lineTo(x0, y - h - w * 0.45);
        ctx.lineTo(x0 + w, y - h);
        ctx.lineTo(x0, y - h + w * 0.45);
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
      });
    };
    // 火山灰柱：大團翻滾的灰雲，底部被熔岩照紅
    const plume = (vx, vy) => {
      const n = erupt ? 8 : 6;
      const rise = gallery ? 0.24 : 1;
      for (let i = n - 1; i >= 0; i--) {
        const q = (t * (erupt ? 0.4 : 0.2) + i / n) % 1;
        const x = vx - q * (erupt ? 50 : 110) * (2 - rise) + Math.sin(t * 1.3 + i * 1.9) * 8;
        const y = vy - 18 - q * (erupt ? 170 : 130) * rise;
        const r = 16 + q * (erupt ? 40 : 32) * (gallery ? 0.7 : 1);
        ctx.globalAlpha = GA * Math.min(1, (1 - q) * 1.8) * (dead ? 0.4 : 1);
        const col = hot || erupt ? '#4a3e46' : '#6e6468';
        const sh = hot || erupt ? '#2e2630' : '#4a4248';
        const puff = (c) => {
          c.moveTo(x + r, y);
          c.arc(x, y, r, 0, TAU);
          c.moveTo(x + r * 1.5, y + r * 0.35);
          c.arc(x + r * 0.8, y + r * 0.35, r * 0.7, 0, TAU);
          c.moveTo(x - r * 0.1, y + r * 0.45);
          c.arc(x - r * 0.8, y + r * 0.45, r * 0.7, 0, TAU);
          c.moveTo(x + r * 0.2, y - r * 0.6);
          c.arc(x - r * 0.3, y - r * 0.6, r * 0.5, 0, TAU);
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
        ctx.arc(x + r * 0.35, y + r * 0.95, r * 1.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = A.c(hot || erupt ? '#6a5a62' : '#9a9094');
        ctx.beginPath();
        ctx.arc(x - r * 0.4, y - r * 0.5, r * 0.45, 0, TAU);
        ctx.fill();
        // 底部的熔岩反光
        if (!dead) glowC(ctx, x, y + r * 1.1, r * 1.3, '#ff7a2a', (0.55 + (hot ? 0.3 : 0)) * (1 - q) * heat);
        ctx.restore();
      }
      ctx.globalAlpha = GA;
    };
    // 火山口（熔岩湖＋噴發）
    const crater = (vx, vy, big, ball) => {
      if (heat > 0) glowC(ctx, vx, vy - 16, erupt ? 100 : 60, '#ff8a2a', (erupt ? 0.6 : 0.4) * heat);
      A.ellipse(ctx, vx, vy, 32 * big, 8 * big, lavaC, null, { lw: 3, hl: false });
      if (!dead) A.ellipse(ctx, vx - 3, vy - 1, 17 * big, 3.5 * big, lavaCore, null, { noStroke: true, hl: false });
      if (erupt && !ball) {
        for (let i = 0; i < 7; i++) {
          const p = (t * 2 + i / 7) % 1;
          const a = -PI / 2 + (i - 3) * 0.3;
          const x = vx + Math.cos(a) * p * 120;
          const y = vy - 10 + Math.sin(a) * p * 160 + p * p * 100;
          glowC(ctx, x, y, 14, '#ff8a2a', 0.5 * (1 - p));
          A.shape(ctx, (c) => { c.moveTo(x - 7, y); c.lineTo(x - 2, y - 7); c.lineTo(x + 6, y - 4); c.lineTo(x + 5, y + 5); c.lineTo(x - 4, y + 6); c.closePath(); }, '#2e2226', null, { lw: 2 });
          A.ellipse(ctx, x, y, 3, 3, '#ffb43a', null, { noStroke: true, hl: false });
        }
        const fh = 116 + Math.sin(t * 20) * 8;
        const wv = Math.sin(t * 14) * 4;
        [-1, 1].forEach((d) => {
          for (let i = 0; i < 5; i++) {
            const u = (t * 1.6 + i / 5 + (d > 0 ? 0.5 : 0)) % 1;
            const x = vx + d * (8 + u * 70);
            const y = vy - fh * 0.6 - Math.sin(u * PI) * 44 + u * u * 44;
            const rr = 6.5 - u * 3;
            A.ellipse(ctx, x, y, rr, rr * 1.1, '#ff9a2a', '#e8621e', { lw: 2, hl: false });
          }
        });
        glowC(ctx, vx, vy - fh * 0.5, fh * 0.9, '#ffb040', 0.5);
        A.shape(ctx, (c) => {
          c.moveTo(vx - 20 * big, vy);
          c.bezierCurveTo(vx - 10, vy - fh * 0.4, vx - 26 + wv, vy - fh * 0.75, vx - 12, vy - fh * 0.95);
          c.quadraticCurveTo(vx - 6, vy - fh * 1.08, vx + 2, vy - fh);
          c.quadraticCurveTo(vx + 10, vy - fh * 1.1, vx + 16, vy - fh * 0.9);
          c.bezierCurveTo(vx + 28 - wv, vy - fh * 0.7, vx + 10, vy - fh * 0.4, vx + 20 * big, vy);
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
      // 縮成一顆佈滿熔岩裂縫的岩球在滾，頂上的火山口跟著轉
      const r = 106;
      ctx.translate(0, -r - 2);
      ctx.rotate(m.rollAngle || 0);
      const ball = (c) => {
        for (let i = 0; i <= 14; i++) {
          const a = (i / 14) * TAU;
          const rr = r * (1 + (i % 2 ? -0.03 : 0.02));
          i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        c.closePath();
      };
      if (heat > 0) glowC(ctx, 0, 0, r * 1.6, '#ff6a2a', 0.35 * heat);
      rimShape(ctx, ball, ROCK[0], ROCK[1], ROCK[2], { cel: 14, rim: 4, noStroke: true, under: [0, 0, r, '#ff6a2a', 0.25 * heat] });
      ctx.save();
      ctx.beginPath();
      ball(ctx);
      ctx.clip();
      [[-60, -40, -10, -60, 20, -20, '#5a4648'], [10, 10, 60, -20, 80, 40, '#3a2e32'], [-80, 20, -20, 30, -40, 70, '#5a4648']].forEach(([a, b, c2, d, e, f, col]) => {
        ctx.fillStyle = A.c(col);
        ctx.beginPath();
        ctx.moveTo(a, b);
        ctx.lineTo(c2, d);
        ctx.lineTo(e, f);
        ctx.closePath();
        ctx.fill();
      });
      rimShape(ctx, (c) => c.ellipse(0, r * 1.0, r * 1.1, r * 0.46, 0, 0, TAU), '#5e5244', '#3a3028', '#9a8a70', { cel: 5, rim: 3, lw: 3.5 });
      ctx.translate(0, 26);
      lavaStroke(cracks, 5 + (hot ? 2 : 0), false);
      ctx.restore();
      basalt(-54, -40, [[-10, 16, 8], [6, 26, 8], [22, 14, 7]]);
      [[r * 0.82, r * 0.3], [-r * 0.78, r * 0.36], [r * 0.34, r * 0.74], [-r * 0.36, r * 0.74]].forEach(([x, y]) => A.ellipse(ctx, x, y, 12, 9, '#140c0a', null, { lw: 2.6, hl: false }));
      ctx.beginPath();
      ball(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-42, -r * 0.84); c.lineTo(-24, -r * 1.06); c.lineTo(-14, -r * 1.16); c.lineTo(-4, -r * 1.1); c.lineTo(8, -r * 1.18); c.lineTo(18, -r * 1.08); c.lineTo(42, -r * 0.84); c.closePath(); }, ROCK[0], ROCK[1], { cel: [4, 0], lw: 3 });
      crater(0, -r * 1.12, 0.6, true);
      ctx.restore();
      // 地上的揚塵與火星
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const q = (t * 3 + i / 4) % 1;
        ctx.globalAlpha = GA * (1 - q) * 0.6;
        ctx.fillStyle = A.c('#8a6a58');
        ctx.beginPath();
        ctx.arc((-80 - q * 60) * K, (-10 - q * 16) * K, (10 + q * 12) * K, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = GA * (1 - q);
        ctx.fillStyle = A.c('#ffae3a');
        ctx.beginPath();
        ctx.arc((-60 - q * 90 + i * 10) * K, (-20 - q * 40) * K, 2.5 * K, 0, TAU);
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
      ctx.translate(-140, 0);
      ctx.rotate(-0.24 * rear);
      ctx.translate(140, 0);
    }
    if (!m.onGround && st === 'move') ctx.translate(0, -5);
    const step = walk ? Math.sin(t * 5) : 0;
    const legH = 46 * (1 - tuck * 0.7);
    const sx = -12;
    const sb = -legH + tuck * 4;

    // ── 岩柱般的巨腿 ──
    const leg = (x, lift, far) => {
      const top = sb - 8;
      const y1 = -lift;
      const w = far ? 27 : 32;
      const P = far ? SKD : SK;
      const path = (c) => {
        c.moveTo(x - w + 4, top);
        c.lineTo(x - w - 3, top + (y1 - top) * 0.3);
        c.lineTo(x - w + 1, top + (y1 - top) * 0.55);
        c.lineTo(x - w - 5, y1 - 14);
        c.quadraticCurveTo(x - w - 12, y1 - 2, x - w - 6, y1 + 1);
        c.lineTo(x + w + 8, y1 + 1);
        c.quadraticCurveTo(x + w + 14, y1 - 2, x + w + 5, y1 - 14);
        c.lineTo(x + w + 1, top + (y1 - top) * 0.5);
        c.lineTo(x + w + 5, top + (y1 - top) * 0.25);
        c.lineTo(x + w - 4, top);
        c.closePath();
      };
      rimShape(ctx, path, P[0], P[1], P[2], { cel: 8, rim: 3, lw: 3.6, under: dead ? null : [x, y1 + 6, 40, '#ff7a2a', far ? 0.15 : 0.25] });
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      // 石板般的鱗甲（不規則）
      [[-12, 0.2, 12, 9], [12, 0.34, 11, 8], [-6, 0.6, 14, 8], [18, 0.72, 9, 7]].forEach(([dx, u, rx, ry], i) => {
        const yy = top + (y1 - top) * u;
        rimShape(ctx, (c) => {
          c.moveTo(x + dx - rx, yy + ry * 0.3);
          c.lineTo(x + dx - rx * 0.5, yy - ry);
          c.lineTo(x + dx + rx * 0.7, yy - ry * 0.8);
          c.lineTo(x + dx + rx, yy + ry * 0.4);
          c.lineTo(x + dx + rx * 0.1, yy + ry);
          c.closePath();
        }, far ? '#5a5042' : '#766650', far ? '#3e3428' : '#4e4234', far ? '#8a7c66' : '#b0a080', { cel: 2.5, rim: 1.5, lw: 1.8 });
      });
      // 樹根般往下分岔的深紋
      ctx.strokeStyle = A.c(P[1]);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 4, top + 6);
      ctx.lineTo(x - 8, top + (y1 - top) * 0.45);
      ctx.lineTo(x - 18, y1 - 10);
      ctx.moveTo(x - 8, top + (y1 - top) * 0.45);
      ctx.lineTo(x + 2, y1 - 12);
      ctx.moveTo(x + w - 6, top + 10);
      ctx.lineTo(x + w - 12, top + (y1 - top) * 0.6);
      ctx.stroke();
      ctx.restore();
      // 巨爪：三根彎曲的骨白色爪
      [-20, 0, 20].forEach((dx, i) => {
        const cx = x + dx + 4;
        rimShape(ctx, (c) => {
          c.moveTo(cx - 9, y1 + 1);
          c.quadraticCurveTo(cx - 9, y1 - 13, cx + 2, y1 - 13);
          c.quadraticCurveTo(cx + 14, y1 - 10, cx + 16 + (i === 2 ? 3 : 0), y1 + 1);
          c.closePath();
        }, far ? '#b0a488' : '#e0d4b8', far ? '#7a6e58' : '#a8987a', '#fff4dc', { cel: 3, rim: 1.5, lw: 2.4 });
      });
    };
    leg(-104, Math.max(0, -step) * 7, true);
    leg(66, Math.max(0, step) * 7, true);

    // 岩石尾巴（有刺）
    rimShape(ctx, (c) => { c.moveTo(-150, sb - 10); c.quadraticCurveTo(-186, sb - 6, -202, sb + 18); c.quadraticCurveTo(-178, sb + 12, -146, sb + 10); c.closePath(); }, SK[0], SK[1], SK[2], { cel: 4, rim: 2, lw: 3 });
    [[-166, sb - 6], [-182, sb + 2]].forEach(([x, y]) => spike(ctx, x, y, -PI / 2 - 0.3, 12, 5, '#8a7c66', '#5a4e40'));

    // ── 頭與脖子 ──
    const brk = st === 'breath' ? 1 : st === 'breathPrep' ? Math.min(1, 1 - (m.stateT || 0) / (m.stateT0 || 0.7)) : 0;
    const nx = 120 - tuck * 40;
    const hx = 196 - tuck * 96 + brk * 16;
    let hy = -76 + (prep ? 8 : 0) + (erupt ? -12 : 0) + tuck * 22 - rear * 10;
    if (st === 'recover') hy += 12;
    if (brk > 0) hy += brk * 4;
    // 脖子：粗、有一圈圈皺褶與幾片石板
    const neckPath = (c) => {
      c.moveTo(nx - 26, sb + 10);
      c.quadraticCurveTo(hx - 56, sb + 12, hx - 30, hy + 30);
      c.lineTo(hx - 40, hy - 14);
      c.quadraticCurveTo(hx - 90, sb - 50, nx - 20, sb - 40);
      c.closePath();
    };
    rimShape(ctx, neckPath, SK[0], SK[1], SK[2], { cel: 6, rim: 3, lw: 3.4 });
    ctx.strokeStyle = A.c(SK[1]);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const u = 0.3 + i * 0.2;
      const x = nx + (hx - 34 - nx) * u;
      const y = sb - 14 + (hy + 8 - sb) * u;
      ctx.moveTo(x - 6, y - 24 + i * 4);
      ctx.quadraticCurveTo(x + 5, y, x - 4, y + 22 - i * 3);
    }
    ctx.stroke();
    [[0.35, -22, 9], [0.6, -26, 8]].forEach(([u, dy, r]) => {
      const x = nx + (hx - 34 - nx) * u;
      const y = sb - 14 + (hy + 8 - sb) * u + dy;
      rimShape(ctx, (c) => { c.moveTo(x - r, y + 3); c.lineTo(x - r * 0.4, y - r * 0.7); c.lineTo(x + r, y - r * 0.4); c.lineTo(x + r * 0.6, y + r * 0.6); c.closePath(); }, '#766650', '#4e4234', '#b0a080', { cel: 2, rim: 1.5, lw: 2 });
    });

    // 頭：一塊古老的岩石
    const jaw = brk > 0 ? brk : erupt || dead || m.hurtFlash > 0.05 ? 0.45 : 0;
    const jo = jaw * 18;
    // 下顎（張嘴時往下）
    const lowJaw = (c) => {
      c.moveTo(hx - 30, hy + 14);
      c.quadraticCurveTo(hx + 10, hy + 18 + jo * 0.6, hx + 52, hy + 10 + jo);
      c.lineTo(hx + 44, hy + 22 + jo);
      c.quadraticCurveTo(hx + 10, hy + 38 + jo * 0.7, hx - 36, hy + 28);
      c.closePath();
    };
    if (jaw > 0) {
      // 嘴裡：暗紅，噴火時發亮
      if (brk > 0 && !dead) glowC(ctx, hx + 50, hy + 14, 60 + brk * 40, '#ffa032', 0.55 + 0.4 * brk);
      A.shape(ctx, (c) => { c.moveTo(hx - 20, hy + 8); c.lineTo(hx + 58, hy + 4); c.lineTo(hx + 50, hy + 12 + jo); c.quadraticCurveTo(hx + 10, hy + 24 + jo, hx - 22, hy + 22); c.closePath(); }, '#4a1414', null, { lw: 2.6 });
      if (brk > 0 && !dead) {
        A.ellipse(ctx, hx + 30, hy + 12 + jo * 0.5, 16 * brk + 2, 6 * brk + 2, '#ffb43a', null, { noStroke: true, hl: false });
        A.ellipse(ctx, hx + 30, hy + 12 + jo * 0.5, 8 * brk + 1, 3 * brk + 1, '#fff0a0', null, { noStroke: true, hl: false });
      }
    }
    rimShape(ctx, lowJaw, SK[0], SK[1], SK[2], { cel: 4, rim: 2, lw: 3 });
    // 下喙
    A.shape(ctx, (c) => { c.moveTo(hx + 24, hy + 12 + jo * 0.8); c.lineTo(hx + 52, hy + 10 + jo); c.lineTo(hx + 46, hy + 22 + jo); c.quadraticCurveTo(hx + 34, hy + 22 + jo, hx + 24, hy + 20 + jo * 0.8); c.closePath(); }, '#3a3430', '#221e1c', { lw: 2.6, shadeY: hy + 18 + jo });
    const head = (c) => {
      c.moveTo(hx - 46, hy + 22);
      c.bezierCurveTo(hx - 50, hy - 18, hx - 28, hy - 44, hx + 6, hy - 42);
      c.lineTo(hx + 22, hy - 40);
      c.lineTo(hx + 36, hy - 32);
      c.quadraticCurveTo(hx + 56, hy - 22, hx + 62, hy - 6);
      c.quadraticCurveTo(hx + 66, hy + 4, hx + 60, hy + 10);
      c.lineTo(hx + 52, hy + 8);
      c.quadraticCurveTo(hx + 20, hy + 14, hx - 10, hy + 16);
      c.quadraticCurveTo(hx - 30, hy + 26, hx - 46, hy + 22);
      c.closePath();
    };
    rimShape(ctx, head, SK[0], SK[1], SK[2], { cel: 7, rim: 3.5, lw: 3.6 });
    ctx.save();
    ctx.beginPath();
    head(ctx);
    ctx.clip();
    // 頭頂與臉頰的石板鱗甲
    [
      [[-30, -30], [-8, -40], [4, -26], [-20, -16]],
      [[4, -26], [-8, -40], [20, -40], [24, -26]],
      [[-44, -6], [-30, -30], [-20, -16], [-28, 4]],
      [[-28, 4], [-20, -16], [-2, -12], [-6, 10]],
    ].forEach((pts) => {
      rimShape(ctx, (c) => {
        c.moveTo(hx + pts[0][0], hy + pts[0][1]);
        for (let i = 1; i < pts.length; i++) c.lineTo(hx + pts[i][0], hy + pts[i][1]);
        c.closePath();
      }, '#766650', '#4e4234', '#b0a080', { cel: 3, rim: 1.5, lw: 1.8 });
    });
    // 裂紋與青苔
    ctx.strokeStyle = A.c('#2a221c');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx - 40, hy + 10);
    ctx.lineTo(hx - 30, hy + 12);
    ctx.lineTo(hx - 26, hy + 20);
    ctx.stroke();
    ctx.fillStyle = A.c(dead ? '#5a6050' : '#5a7a4a');
    ctx.beginPath();
    ctx.ellipse(hx - 26, hy - 34, 12, 5, -0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 上喙：帶鉤、刃口有鋸齒
    rimShape(ctx, (c) => {
      c.moveTo(hx + 26, hy - 30);
      c.quadraticCurveTo(hx + 58, hy - 24, hx + 66, hy - 2);
      c.quadraticCurveTo(hx + 68, hy + 10, hx + 60, hy + 16);
      c.lineTo(hx + 56, hy + 6);
      c.lineTo(hx + 50, hy + 10);
      c.lineTo(hx + 46, hy + 5);
      c.lineTo(hx + 40, hy + 9);
      c.lineTo(hx + 34, hy + 4);
      c.quadraticCurveTo(hx + 26, hy - 10, hx + 26, hy - 30);
      c.closePath();
    }, '#3a3430', '#221e1c', '#8a7e6c', { cel: 4, rim: 2.5, lw: 3 });
    ctx.fillStyle = A.c('#141010');
    ctx.beginPath();
    ctx.ellipse(hx + 48, hy - 16, 2.4, 1.6, 0.3, 0, TAU);
    ctx.fill();
    // 下巴垂下的石化地衣長鬚
    {
      const sw = dead ? 0 : Math.sin(t * 1.4) * 3;
      rimShape(ctx, (c) => {
        c.moveTo(hx - 24, hy + 24 + jo * 0.3);
        c.lineTo(hx - 22 + sw * 0.5, hy + 50);
        c.lineTo(hx - 14 + sw, hy + 66);
        c.lineTo(hx - 10, hy + 50);
        c.lineTo(hx - 4 + sw, hy + 60);
        c.lineTo(hx, hy + 44);
        c.lineTo(hx + 8 + sw, hy + 52);
        c.lineTo(hx + 12, hy + 26 + jo * 0.6);
        c.closePath();
      }, dead ? '#6a6e60' : '#5e7254', '#3e5038', '#8aa07a', { cel: 3, rim: 2, lw: 2.4 });
    }
    // ─ 眼睛：深陷在眉骨下，發著餘燼光 ─
    const ex = hx + 16;
    const ey = hy - 18;
    const kind = bossEyeKind(m, hot || prep || st === 'breathPrep' || st === 'quakePrep' || st === 'cannonPrep');
    const fierce = kind === 'angry';
    A.ellipse(ctx, ex, ey + 1, 13, 10, '#1a1210', null, { lw: 2.6, hl: false });
    if (prep && kind !== 'x' && kind !== 'hurt') {
      // 用力擠眼：一道發亮的細縫
      glowC(ctx, ex, ey + 2, 20, emberC, 0.7);
      ctx.strokeStyle = A.c(emberC);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - 9, ey + 3);
      ctx.quadraticCurveTo(ex, ey - 1, ex + 9, ey + 1);
      ctx.stroke();
    } else if (st === 'recover' && kind !== 'x') {
      ctx.strokeStyle = A.c(emberC);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let a = 0; a < 11; a += 0.4) {
        const r = a * 0.7;
        const px = ex + Math.cos(a + t * 6) * r;
        const py = ey + 1 + Math.sin(a + t * 6) * r * 0.8;
        a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    } else if (kind === 'x') {
      ctx.strokeStyle = A.c('#8a7a6a');
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ex - 6, ey - 5);
      ctx.lineTo(ex + 6, ey + 7);
      ctx.moveTo(ex + 6, ey - 5);
      ctx.lineTo(ex - 6, ey + 7);
      ctx.stroke();
    } else if (kind === 'hurt' || kind === 'closed') {
      ctx.strokeStyle = A.c(emberC);
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - 8, ey + 3);
      ctx.lineTo(ex + 8, ey + 3);
      ctx.stroke();
    } else {
      glowC(ctx, ex + 1, ey + 2, fierce ? 30 : 20, emberC, fierce ? 0.85 : 0.55);
      A.ellipse(ctx, ex + 1, ey + 2, 8, 7, fierce ? '#ffb03a' : '#e89a2a', fierce ? '#ff6a1a' : '#b8601a', { lw: 1.8, hl: false, shadeAt: 0.1 });
      ctx.fillStyle = A.c('#140a06');
      ctx.beginPath();
      ctx.ellipse(ex + 2, ey + 2, fierce ? 1.6 : 2.2, 6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c('#fff2c8');
      ctx.beginPath();
      ctx.arc(ex - 2, ey - 1, 1.8, 0, TAU);
      ctx.fill();
    }
    // 厚重的眉骨（半蓋住眼睛；生氣時壓低斜下）
    rimShape(ctx, (c) => {
      c.moveTo(ex - 22, ey - 2);
      c.quadraticCurveTo(ex - 16, ey - 18, ex + 2, ey - 16);
      c.quadraticCurveTo(ex + 18, ey - 16, ex + 22, ey + (fierce ? 2 : -6));
      c.quadraticCurveTo(ex + 4, ey + (fierce ? -3 : -7), ex - 22, ey - 2);
      c.closePath();
    }, '#6e604e', '#46392c', '#b0a080', { cel: 3, rim: 2, lw: 2.8 });
    // 眼下的深紋
    ctx.strokeStyle = A.c('#2a221c');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - 12, ey + 12);
    ctx.quadraticCurveTo(ex, ey + 16, ex + 10, ey + 12);
    ctx.moveTo(ex - 18, ey + 4);
    ctx.lineTo(ex - 26, ey + 8);
    ctx.stroke();

    // ─────────── 背甲：一座崎嶇的活火山 ───────────
    // 緣盾（厚重的甲緣）
    rimShape(ctx, (c) => {
      c.moveTo(sx - 176, sb - 4);
      for (let i = 0; i <= 12; i++) {
        const x = sx - 176 + i * 29;
        c.lineTo(x + 14, sb + 12 + (i % 2) * 3);
        c.lineTo(x + 29, sb - 4);
      }
      c.lineTo(sx + 172, sb - 18);
      c.lineTo(sx - 176, sb - 18);
      c.closePath();
    }, '#3e302c', '#241a18', '#7a5e54', { cel: 4, rim: 2, lw: 3.4, under: dead ? null : [sx, sb + 20, 180, '#ff6a2a', 0.3] });
    const vx = sx - 12;
    const vy = sb - 156 - p2 * 4;
    const mount = (c) => {
      c.moveTo(sx - 172, sb - 6);
      c.lineTo(sx - 176, sb - 30);
      c.lineTo(sx - 162, sb - 44);
      c.lineTo(sx - 172, sb - 52);
      c.lineTo(sx - 152, sb - 64);
      c.lineTo(sx - 148, sb - 92);
      c.lineTo(sx - 130, sb - 98);
      c.lineTo(sx - 122, sb - 94);
      c.lineTo(sx - 112, sb - 120);
      c.lineTo(sx - 94, sb - 126);
      c.lineTo(sx - 84, sb - 142);
      c.lineTo(sx - 64, sb - 144);
      c.lineTo(vx - 36, vy + 6);
      c.lineTo(vx - 30, vy - 6);
      c.lineTo(vx - 22, vy + 2);
      c.lineTo(vx - 14, vy - 10);
      c.lineTo(vx - 4, vy);
      c.lineTo(vx + 6, vy - 8);
      c.lineTo(vx + 16, vy + 1);
      c.lineTo(vx + 26, vy - 6);
      c.lineTo(vx + 34, vy + 8);
      c.lineTo(sx + 44, sb - 132);
      c.lineTo(sx + 52, sb - 114);
      c.lineTo(sx + 66, sb - 112);
      c.lineTo(sx + 74, sb - 96);
      c.lineTo(sx + 90, sb - 108);
      c.lineTo(sx + 104, sb - 112);
      c.lineTo(sx + 112, sb - 98);
      c.lineTo(sx + 122, sb - 84);
      c.lineTo(sx + 136, sb - 80);
      c.lineTo(sx + 148, sb - 58);
      c.lineTo(sx + 162, sb - 42);
      c.lineTo(sx + 168, sb - 20);
      c.lineTo(sx + 166, sb - 6);
      c.quadraticCurveTo(sx, sb + 4, sx - 172, sb - 6);
      c.closePath();
    };
    rimShape(ctx, mount, ROCK[0], ROCK[1], ROCK[2], { cel: 14, rim: 4.5, noStroke: true, under: dead ? null : [vx, vy + 10, 110, '#ff7a2a', 0.35 * heat] });
    ctx.save();
    ctx.beginPath();
    mount(ctx);
    ctx.clip();
    // 斷崖的塊面：朝火山口的一面被照亮、背光面沉進陰影
    [
      [[sx - 150, sb - 60], [sx - 112, sb - 118], [sx - 84, sb - 96], [sx - 110, sb - 40], '#5e4a4a'],
      [[sx - 84, sb - 140], [vx - 30, vy + 4], [vx - 20, vy + 60], [sx - 70, sb - 90], '#5e4a4a'],
      [[vx + 30, vy + 6], [sx + 44, sb - 130], [sx + 60, sb - 70], [vx + 30, vy + 70], '#2e2228'],
      [[sx + 74, sb - 96], [sx + 104, sb - 110], [sx + 148, sb - 58], [sx + 110, sb - 40], '#34282e'],
      [[sx - 60, sb - 60], [sx - 10, sb - 80], [sx + 20, sb - 40], [sx - 40, sb - 20], '#3a2e32'],
    ].forEach(([a, b, c2, d, col]) => {
      ctx.fillStyle = A.c(col);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c2[0], c2[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.closePath();
      ctx.fill();
    });
    // 岩架：亮的上緣＋下方的深影
    [[sx - 172, sb - 52, sx - 140, sb - 56], [sx - 130, sb - 98, sx - 96, sb - 102], [sx + 52, sb - 114, sx + 84, sb - 110], [sx + 112, sb - 84, sx + 146, sb - 80], [sx - 60, sb - 110, sx - 30, sb - 114]].forEach(([x0, y0, x1, y1]) => {
      ctx.fillStyle = A.c('#1e161a');
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 3);
      ctx.lineTo(x1, y1 + 3);
      ctx.lineTo(x1 - 6, y1 + 12);
      ctx.lineTo(x0 + 4, y0 + 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = A.c('#9a7a6a');
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    });
    // 背甲的古老盾紋（山腳，被岩石吞了一半）
    ctx.strokeStyle = A.c('#1e1618');
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const hex = (cx, cy, r) => {
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * TAU + PI / 6;
        const x = cx + Math.cos(a) * r * 1.25;
        const y = cy + Math.sin(a) * r * 0.55;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    };
    hex(sx - 104, sb - 24, 28);
    hex(sx - 30, sb - 18, 30);
    hex(sx + 50, sb - 22, 28);
    hex(sx + 124, sb - 20, 24);
    ctx.stroke();
    // 熔岩裂縫網
    ctx.translate(sx, sb - 6);
    lavaStroke(cracks, 2.4 + (hot ? 1.8 : 0) + (dead ? -0.8 : 0), false);
    ctx.translate(-sx, -(sb - 6));
    // 發光的岩縫（從火山口往下裂）
    lavaStroke((c) => {
      c.moveTo(vx - 30, vy + 4);
      c.lineTo(vx - 40, vy + 26);
      c.lineTo(vx - 34, vy + 40);
      c.lineTo(vx - 52, vy + 62);
      c.moveTo(vx + 28, vy + 6);
      c.lineTo(vx + 40, vy + 30);
      c.lineTo(vx + 34, vy + 44);
    }, 2.6 + p2 * 1.5, false);
    // 熔岩河：從火山口蜿蜒流到甲緣
    lavaStroke((c) => {
      c.moveTo(vx - 12, vy + 4);
      c.bezierCurveTo(vx - 20, vy + 40, vx - 64, vy + 54, vx - 66, vy + 88);
      c.quadraticCurveTo(vx - 68, vy + 120, vx - 96, vy + 146);
    }, 6.5 + p2 * 3, true);
    lavaStroke((c) => {
      c.moveTo(vx + 14, vy + 4);
      c.bezierCurveTo(vx + 24, vy + 36, vx + 8, vy + 60, vx + 28, vy + 88);
      c.quadraticCurveTo(vx + 46, vy + 116, vx + 42, vy + 150);
    }, 5.5 + p2 * 3, true);
    if (p2 > 0) {
      ctx.globalAlpha = GA * p2;
      lavaStroke((c) => {
        c.moveTo(vx + 26, vy + 6);
        c.bezierCurveTo(vx + 50, vy + 30, vx + 92, vy + 50, vx + 104, vy + 96);
        c.quadraticCurveTo(vx + 110, vy + 124, vx + 132, vy + 146);
      }, 5, true);
      lavaStroke((c) => {
        c.moveTo(sx - 150, sb - 60);
        c.lineTo(sx - 132, sb - 50);
        c.lineTo(sx - 138, sb - 34);
        c.lineTo(sx - 120, sb - 22);
      }, 3.5, false);
      ctx.globalAlpha = GA;
    }
    ctx.restore();
    ctx.beginPath();
    mount(ctx);
    ctx.lineWidth = 4.2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    // 熔岩從甲緣滴落，腳邊一灘灘發光
    if (!dead) {
      [[vx - 96, 0], [vx + 42, 0.5]].forEach(([x, ph]) => {
        const q = (t * 0.9 + ph) % 1;
        glowC(ctx, x, sb + 8, 30, '#ff8a2a', 0.5 * heat);
        A.shape(ctx, (c) => { c.moveTo(x - 5, sb - 2); c.quadraticCurveTo(x - 6, sb + 10, x, sb + 14 + q * 6); c.quadraticCurveTo(x + 6, sb + 10, x + 5, sb - 2); c.closePath(); }, lavaC, null, { lw: 2 });
        ctx.globalAlpha = GA * (1 - q);
        A.ellipse(ctx, x, sb + 20 + q * 26, 3, 4, lavaC, null, { lw: 1.4, hl: false });
        ctx.globalAlpha = GA;
      });
    }
    // 柱狀節理（左邊斷崖）
    basalt(sx - 156, sb - 50, [[-4, 18, 8], [12, 32, 8.5], [28, 44, 9], [45, 28, 8], [60, 14, 7]]);
    // 岩架上的老松
    pine(sx - 124, sb - 98, 1.1);
    pine(sx - 108, sb - 104, 0.85);
    pine(sx + 68, sb - 112, 0.95);
    pine(sx + 128, sb - 84, 0.8);
    // 第二階段：黑曜石尖刺沿著山稜長出來
    if (p2 > 0) {
      [[-160, -60, -1.0], [-110, -118, -0.6], [-70, -140, -0.35], [52, -118, 0.35], [100, -110, 0.55], [150, -56, 1.0]].forEach(([x, y, r]) => {
        ctx.save();
        ctx.translate(sx + x, sb + y);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-10, 5); c.lineTo(-2, -32 * p2 - 4); c.lineTo(10, 5); c.closePath(); }, '#241a26', '#140e18', { lw: 2.6, cel: [3, 0] });
        ctx.strokeStyle = A.c(lavaC);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(-1, -20 * p2);
        ctx.stroke();
        ctx.restore();
      });
    }
    // 火山灰柱＋火山口
    plume(vx, vy);
    crater(vx, vy + 2, 1 + 0.3 * p2, false);
    // 火山口的鋸齒岩唇（蓋在熔岩湖前面）
    rimShape(ctx, (c) => {
      c.moveTo(vx - 38, vy + 8);
      c.lineTo(vx - 30, vy + 2);
      c.lineTo(vx - 20, vy + 8);
      c.lineTo(vx - 10, vy + 4);
      c.lineTo(vx, vy + 10);
      c.lineTo(vx + 12, vy + 4);
      c.lineTo(vx + 22, vy + 9);
      c.lineTo(vx + 32, vy + 3);
      c.lineTo(vx + 38, vy + 10);
      c.lineTo(vx + 30, vy + 18);
      c.lineTo(vx - 30, vy + 18);
      c.closePath();
    }, '#5a4648', '#34282c', '#b07a5e', { cel: 3, rim: 2.5, lw: 2.8 });
    // 火山灰與火星
    if (!dead && (hot || erupt || prep)) {
      for (let i = 0; i < 10; i++) {
        const q = (t * 0.6 + i / 10) % 1;
        const x = vx + Math.sin(i * 2.3 + t) * 100 - q * 30;
        const y = vy - 20 - q * 170;
        ctx.globalAlpha = GA * (1 - q);
        A.ellipse(ctx, x, y, 2.6, 2.6, i % 2 ? '#ffb43a' : '#ff6a2a', null, { noStroke: true, hl: false });
      }
      ctx.globalAlpha = GA;
    }

    // 近側的腿
    leg(-78, Math.max(0, step) * 7, false);
    leg(94, Math.max(0, -step) * 7, false);

    if (st === 'recover' && !dead) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * TAU) / 3;
        star(ctx, hx + 10 + Math.cos(a) * 36, hy - 60 + Math.sin(a) * 9);
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
