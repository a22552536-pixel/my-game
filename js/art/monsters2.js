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

  // ═════════════ Boss：潮汐寄居蟹 ═════════════
  // 背著一座老燈塔當殼的寄居蟹，愛現、濃眉、得意的笑。
  function hermitCrab(ctx, m) {
    const t = m.t;
    const st = m.state;
    const shell = st === 'shell';
    const pal = ['#ee6e4e', '#c24a34'];
    let sy = 1 + Math.sin(t * 2.2) * 0.012;
    if (st === 'tidePrep' || st === 'clawPrep') sy = 0.95;
    if (st === 'recover') sy = 0.93;
    if (!m.onGround) sy = m.vy < 0 ? 1.06 : 0.98;
    const trem = st === 'tidePrep' ? Math.sin(t * 45) * 2 : 0;
    ctx.save();
    ctx.translate(trem, 0);
    ctx.scale(1 / Math.sqrt(sy), sy);

    if (m.enraged && !m.dead) glow(ctx, 0, -90, 180, '255,90,60', 0.22 + Math.sin(t * 5) * 0.05);

    const walk = st === 'walk' || st === 'intro';
    const fierce = m.enraged || st === 'clawPrep' || st === 'tidePrep';
    const kind = bossEyeKind(m, fierce);

    // ─ 燈塔 ─
    const drawTower = (bx, by, lean) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(lean);
      const tower = (c) => {
        c.moveTo(-44, 0);
        c.lineTo(-28, -100);
        c.lineTo(28, -100);
        c.lineTo(44, 0);
        c.quadraticCurveTo(0, 8, -44, 0);
        c.closePath();
      };
      A.shape(ctx, tower, '#fff4e4', null, { noStroke: true });
      ctx.save();
      ctx.beginPath();
      tower(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#e0503a');
      ctx.fillRect(-60, -78, 120, 22);
      ctx.fillRect(-60, -38, 120, 22);
      ctx.fillStyle = 'rgba(90,30,20,0.18)';
      ctx.beginPath();
      ctx.moveTo(18, -110);
      ctx.lineTo(60, -110);
      ctx.lineTo(60, 10);
      ctx.lineTo(30, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      tower(ctx);
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      // 藤壺與海草
      [[-30, -8, 5], [-22, -3, 3.5], [34, -10, 4], [-31, -46, 3.2]].forEach(([x, y, r]) => {
        A.ellipse(ctx, x, y, r, r * 0.8, '#efe3c8', '#cfc0a0', { lw: 2, hl: false });
        ctx.fillStyle = A.c('#8a7a60');
        ctx.beginPath();
        ctx.arc(x, y - r * 0.2, r * 0.3, 0, TAU);
        ctx.fill();
      });
      limb(ctx, (c) => { c.moveTo(-37, -20); c.quadraticCurveTo(-50, -32 + Math.sin(t * 2) * 3, -44, -46); }, 5.5, '#5aa85a');
      // 後窗（弱點）
      const win = shell ? 0.7 + Math.sin(t * 10) * 0.3 : 0;
      if (shell) glow(ctx, -14, -58, 55, '255,230,120', 0.7 * win + 0.25);
      A.shape(ctx, (c) => { c.arc(-14, -58, 9, 0, TAU); }, shell ? U.mix('#ffd84a', '#fffbe0', win) : '#3a5a8a', null, { lw: 3 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-23, -58);
      ctx.lineTo(-5, -58);
      ctx.moveTo(-14, -67);
      ctx.lineTo(-14, -49);
      ctx.stroke();
      if (!shell) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(-17.5, -61.5, 2.2, 0, TAU);
        ctx.fill();
      }
      // 門
      if (shell) A.shape(ctx, (c) => { c.moveTo(6, 3); c.lineTo(6, -20); c.arc(17, -20, 11, PI, 0); c.lineTo(28, 3); c.closePath(); }, '#2a1a14', null, { lw: 3 });
      if (shell && !m.dead) {
        // 門縫裡偷看的眼睛
        const pk = Math.sin(t * 3) > 0 ? 2 : 0;
        ctx.fillStyle = A.c('#ffffff');
        ctx.beginPath();
        ctx.ellipse(13 + pk, -15, 3.2, 3.8, 0, 0, TAU);
        ctx.ellipse(22 + pk, -15, 3, 3.6, 0, 0, TAU);
        ctx.fill();
      }
      // 陽台
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-36, -118);
      ctx.lineTo(36, -118);
      for (let i = -3; i <= 3; i++) {
        ctx.moveTo(i * 11, -118);
        ctx.lineTo(i * 11, -106);
      }
      ctx.stroke();
      A.shape(ctx, (c) => A.roundRect(c, -40, -108, 80, 10, 3), '#5a4a58', '#44384a', { lw: 3, shadeY: -103 });
      // 燈室
      const lampOn = m.dead ? 0 : m.enraged ? 1 : 0.6 + Math.sin(t * 3) * 0.2;
      if (lampOn > 0) {
        glow(ctx, 0, -130, m.enraged ? 115 : 75, m.enraged ? '255,190,80' : '255,235,150', (m.enraged ? 0.7 : 0.5) * lampOn);
        // 光束
        ctx.save();
        ctx.globalAlpha = (m.enraged ? 0.35 : 0.22) * lampOn;
        ctx.fillStyle = m.enraged ? '#ffc070' : '#fff0b0';
        const sw = Math.sin(t * (m.enraged ? 3 : 1.2)) * 0.35;
        ctx.translate(0, -130);
        ctx.rotate(sw);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(170, -34);
        ctx.lineTo(170, 26);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      A.shape(ctx, (c) => A.roundRect(c, -22, -144, 44, 28, 4), U.mix('#9ab8d0', '#fff2a8', lampOn), U.mix('#7a98b0', '#ffd860', lampOn), { lw: 3, shadeY: -126 });
      if (lampOn > 0) {
        ctx.globalAlpha = lampOn;
        A.ellipse(ctx, 0, -130, 8, 9, '#fffbe6', null, { noStroke: true, hl: false });
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -144);
      ctx.lineTo(-8, -116);
      ctx.moveTo(8, -144);
      ctx.lineTo(8, -116);
      ctx.stroke();
      // 屋頂
      A.shape(ctx, (c) => { c.moveTo(-28, -142); c.quadraticCurveTo(0, -172, 28, -142); c.closePath(); }, '#e0503a', '#b83a2c', { cel: [4, 3], lw: 3 });
      A.ellipse(ctx, 0, -164, 4.5, 4.5, '#ffd35a', null, { lw: 2.2, hl: false });
      ctx.restore();
    };

    if (shell) {
      // 整隻縮進燈塔，只剩塔身在搖
      drawTower(0, -2, Math.sin(t * 6) * 0.03);
      ctx.restore();
      return;
    }

    // ─ 腳（身體後面）─
    for (let i = 0; i < 3; i++) {
      const ph = t * 8 + i * 2;
      const lift = walk ? Math.max(0, Math.sin(ph)) * 8 : 0;
      const x0 = 16 + i * 16;
      limb(ctx, (c) => { c.moveTo(x0, -40); c.lineTo(x0 + 16, -46 - lift * 0.5); c.lineTo(x0 + 24 + (walk ? Math.cos(ph) * 4 : 0), -2 - lift); }, 9, pal[1]);
    }
    // 捲在燈塔裡的軟腹
    A.shape(ctx, (c) => { c.moveTo(-6, -64); c.quadraticCurveTo(-28, -44, -8, -20); c.lineTo(22, -30); c.closePath(); }, '#f3a07a', '#d88060', { lw: 3, shadeY: -36 });

    drawTower(-32, -14, -0.08);

    // ─ 身體 ─
    const bx = 28;
    const by = -52 + (walk ? -Math.abs(Math.sin(t * 8)) * 2 : 0);
    let big = { x: 112, y: -62, r: 26, rot: -0.25, open: 0.35 + Math.sin(t * 3) * 0.1 };
    let small = { x: 92, y: -22, r: 14, rot: 0.1, open: 0.3 };
    if (st === 'tidePrep') {
      big = { x: 124, y: -122, r: 26, rot: -1.1, open: 0.8 };
      small = { x: 14, y: -128, r: 16, rot: -1.9, open: 0.8 };
    } else if (st === 'tide') {
      big = { x: 150, y: -28, r: 26, rot: 0.35, open: 0.2 };
      small = { x: 124, y: -12, r: 15, rot: 0.25, open: 0.2 };
    } else if (st === 'clawPrep') {
      big = { x: 118, y: -150, r: 30, rot: -1.45, open: 1 };
    } else if (st === 'clawSlam') {
      big = { x: 146, y: -24, r: 30, rot: 0.45, open: 0 };
    } else if (st === 'recover' || m.dead) {
      big = { x: 112, y: -30, r: 26, rot: 0.4, open: 0.5 };
      small = { x: 88, y: -14, r: 14, rot: 0.4, open: 0.5 };
    }
    const wob = Math.sin(t * 2.5) * 2;
    const e1 = [bx + 8 + wob, by - 50];
    const e2 = [bx + 38 + wob, by - 45];
    limb(ctx, (c) => { c.moveTo(bx + 6, by - 26); c.lineTo(e1[0], e1[1]); c.moveTo(bx + 30, by - 24); c.lineTo(e2[0], e2[1]); }, 9, pal[0]);

    // 小螯
    limb(ctx, (c) => { c.moveTo(bx + 20, by + 10); c.lineTo(small.x - (st === 'tidePrep' ? -4 : 8), small.y + (st === 'tidePrep' ? 10 : 2)); }, 10, pal[1]);
    claw(ctx, small.x, small.y, small.r, small.open, pal[0], pal[1], small.rot);

    A.shape(ctx, (c) => {
      c.moveTo(bx - 44, by + 16);
      c.bezierCurveTo(bx - 50, by - 46, bx + 50, by - 52, bx + 54, by + 8);
      c.quadraticCurveTo(bx + 46, by + 34, bx - 44, by + 16);
      c.closePath();
    }, pal[0], pal[1], { cel: [8, 7], hl: [bx - 12, by - 18, 9, 5] });
    ctx.fillStyle = A.c('#f89878');
    [[-26, -6, 4.5], [-14, 10, 3.2], [-32, 8, 3]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(bx + x, by + y, r, 0, TAU); ctx.fill(); });

    // 眼睛
    [e1, e2].forEach(([x, y], i) => {
      const r = i ? 11 : 12;
      A.ellipse(ctx, x, y, r, r, '#ffffff', null, { lw: 3, hl: false });
      if (kind === 'x') A.eye(ctx, x, y, 5, 5, 'x');
      else if (kind === 'closed' || st === 'recover') A.eye(ctx, x, y + 2, 6, 4, 'closed');
      else if (kind === 'hurt') A.eye(ctx, x, y, 5, 6, 'hurt');
      else {
        A.eye(ctx, x + 3, y + 2, 6, 7, 'normal', 0);
        if (!fierce) {
          // 得意的半垂眼皮
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.clip();
          ctx.fillStyle = A.c('#e8e0d4');
          ctx.fillRect(x - r, y - r, r * 2, r * 0.72);
          ctx.restore();
          ctx.strokeStyle = A.outline();
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(x - r * 0.95, y - r * 0.28);
          ctx.lineTo(x + r * 0.95, y - r * 0.28);
          ctx.stroke();
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.stroke();
        }
      }
    });
    // 濃密白眉
    if (!m.dead) {
      [[e1[0] - 1, e1[1] - 15, fierce ? 0.35 : -0.3], [e2[0] + 1, e2[1] - 14, fierce ? -0.35 : 0.25]].forEach(([x, y, rot]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        A.shape(ctx, (c) => {
          c.moveTo(-15, 3);
          c.quadraticCurveTo(-17, -6, -8, -5);
          c.quadraticCurveTo(-4, -12, 3, -6);
          c.quadraticCurveTo(10, -11, 14, -3);
          c.quadraticCurveTo(20, 1, 14, 4);
          c.quadraticCurveTo(0, 1, -15, 3);
          c.closePath();
        }, '#f6f1e6', '#d6ccbc', { cel: [2, 2], lw: 2.6 });
        ctx.restore();
      });
    }
    // 得意的笑
    const mx = bx + 22;
    const my = by - 2;
    if (m.dead || st === 'recover' || m.hurtFlash > 0.05) {
      A.ellipse(ctx, mx, my + 2, 7, 6, '#7a2323', null, { lw: 2.6, hl: false });
    } else if (fierce || st === 'tide' || st === 'clawSlam') {
      A.shape(ctx, (c) => { c.moveTo(mx - 14, my - 2); c.quadraticCurveTo(mx, my - 6, mx + 16, my - 4); c.quadraticCurveTo(mx + 12, my + 14, mx - 14, my - 2); c.closePath(); }, '#7a2323', null, { lw: 2.6 });
      ctx.fillStyle = A.c('#ffffff');
      ctx.beginPath();
      ctx.moveTo(mx - 11, my - 2.5);
      ctx.quadraticCurveTo(mx, my - 5.5, mx + 13, my - 3.5);
      ctx.lineTo(mx + 12, my);
      ctx.quadraticCurveTo(mx, my - 2, mx - 9, my + 0.5);
      ctx.closePath();
      ctx.fill();
    } else {
      A.shape(ctx, (c) => {
        c.moveTo(mx - 14, my - 2);
        c.quadraticCurveTo(mx, my + 4, mx + 18, my - 10);
        c.quadraticCurveTo(mx + 12, my + 10, mx - 14, my - 2);
        c.closePath();
      }, '#ffffff', null, { lw: 2.6 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(mx - 3, my + 1);
      ctx.lineTo(mx - 3, my + 4.5);
      ctx.moveTo(mx + 6, my - 1);
      ctx.lineTo(mx + 6, my + 3);
      ctx.stroke();
    }
    A.blush(ctx, bx + 2, by + 2, 7.5);
    A.blush(ctx, bx + 44, by - 4, 5);
    // 大螯
    limb(ctx, (c) => { c.moveTo(bx + 42, by + 16); c.lineTo(big.x - big.r * 0.5, big.y + 4); }, 14, pal[1]);
    claw(ctx, big.x, big.y, big.r, big.open, pal[0], pal[1], big.rot);
    if (st === 'clawSlam' || st === 'tide') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(big.x - 26 - i * 6, big.y - 40 + i * 14);
        ctx.lineTo(big.x - 52 - i * 6, big.y - 50 + i * 14);
      }
      ctx.stroke();
    }
    if (st === 'recover' && !m.dead) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * TAU) / 3;
        star(ctx, bx + 16 + Math.cos(a) * 28, by - 92 + Math.sin(a) * 7);
      }
    }
    ctx.restore();
  }

  // ═════════════ Boss：熔岩甲龜 ═════════════
  // 背上有座冒煙小火山的大烏龜，龜殼裂縫透出熔岩光。
  function lavaTortoise(ctx, m) {
    const t = m.t;
    const st = m.state;
    const skin = ['#e4b070', '#c08a4c'];
    const shellC = ['#7a5a4e', '#5a3e36'];
    const prep = st === 'eruptPrep';
    const erupt = st === 'erupt';
    const heat = m.dead ? 0 : Math.min(1.4, 0.55 + Math.sin(t * 3) * 0.15 + (prep ? 0.45 + Math.sin(t * 20) * 0.15 : 0) + (erupt ? 0.6 : 0) + (m.enraged ? 0.35 : 0));
    const crackCol = m.dead ? '#5a3a30' : m.enraged ? U.mix('#ff5a1e', '#ffd84a', Math.max(0, Math.min(1, heat - 0.4))) : U.mix('#e8741e', '#ffe46a', Math.max(0, Math.min(1, heat - 0.2)));
    const shake = prep ? Math.sin(t * 50) * 2 : 0;

    ctx.save();
    ctx.translate(shake, 0);
    if (m.enraged && !m.dead) glow(ctx, 0, -80, 190, '255,90,30', 0.3 + Math.sin(t * 6) * 0.06);

    const cracks = (c) => {
      c.moveTo(-62, -8);
      c.lineTo(-44, -22);
      c.lineTo(-48, -40);
      c.moveTo(-44, -22);
      c.lineTo(-20, -18);
      c.lineTo(-6, -36);
      c.moveTo(-20, -18);
      c.lineTo(-16, 2);
      c.moveTo(18, -12);
      c.lineTo(36, -28);
      c.lineTo(56, -22);
      c.moveTo(36, -28);
      c.lineTo(32, -46);
      c.moveTo(18, -12);
      c.lineTo(22, 4);
      c.moveTo(66, -6);
      c.lineTo(78, -14);
    };
    const drawCracks = () => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      cracks(ctx);
      if (heat > 0) {
        ctx.strokeStyle = 'rgba(255,140,40,' + Math.min(1, 0.35 * heat).toFixed(3) + ')';
        ctx.lineWidth = 11;
        ctx.stroke();
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 6.5 + (m.enraged ? 1 : 0);
      ctx.stroke();
      ctx.strokeStyle = A.c(crackCol);
      ctx.lineWidth = 3.5 + (m.enraged ? 1 : 0);
      ctx.stroke();
    };
    const volcano = (vx, vy) => {
      for (let i = 0; i < 4; i++) {
        const p = (t * (erupt ? 0.9 : 0.35) + i / 4) % 1;
        const x = vx + Math.sin(t * 1.5 + i * 1.7) * 6 + p * 14;
        const y = vy - 36 - p * 50;
        ctx.globalAlpha = (1 - p) * 0.75;
        ctx.fillStyle = m.enraged ? '#6a5a5a' : '#c8bcb6';
        ctx.beginPath();
        ctx.arc(x, y, 6 + p * 12, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (heat > 0) glow(ctx, vx, vy - 34, erupt ? 75 : 40, '255,150,40', (erupt ? 0.7 : 0.35) * heat);
      A.shape(ctx, (c) => {
        c.moveTo(vx - 30, vy);
        c.lineTo(vx - 11, vy - 34);
        c.quadraticCurveTo(vx, vy - 30, vx + 11, vy - 34);
        c.lineTo(vx + 30, vy);
        c.quadraticCurveTo(vx, vy + 6, vx - 30, vy);
        c.closePath();
      }, '#9a6450', '#74483a', { cel: [5, 0], lw: 3 });
      A.ellipse(ctx, vx, vy - 34, 11, 3.5, crackCol, null, { lw: 2.6, hl: false });
      if (!m.dead) {
        // 流下來的一道熔岩
        A.shape(ctx, (c) => {
          c.moveTo(vx - 7, vy - 34);
          c.quadraticCurveTo(vx - 10, vy - 22, vx - 5, vy - 15 + Math.sin(t * 2) * 2);
          c.quadraticCurveTo(vx - 1, vy - 24, vx + 1, vy - 34);
          c.closePath();
        }, crackCol, null, { lw: 2.2 });
      }
      if (erupt) {
        for (let i = 0; i < 5; i++) {
          const p = (t * 2.2 + i / 5) % 1;
          const a = -PI / 2 + (i - 2) * 0.35;
          const x = vx + Math.cos(a) * p * 60;
          const y = vy - 38 + Math.sin(a) * p * 70 + p * p * 40;
          A.ellipse(ctx, x, y, 5 - p * 2, 5 - p * 2, '#ffb43a', null, { lw: 2, hl: false });
        }
        A.shape(ctx, (c) => {
          c.moveTo(vx - 10, vy - 34);
          c.quadraticCurveTo(vx - 14, vy - 64, vx, vy - 76 - Math.sin(t * 20) * 4);
          c.quadraticCurveTo(vx + 14, vy - 64, vx + 10, vy - 34);
          c.closePath();
        }, '#ffa02a', '#ff7a1e', { lw: 2.6, shadeY: vy - 50 });
        A.shape(ctx, (c) => {
          c.moveTo(vx - 4, vy - 36);
          c.quadraticCurveTo(vx - 6, vy - 56, vx, vy - 62);
          c.quadraticCurveTo(vx + 6, vy - 56, vx + 4, vy - 36);
          c.closePath();
        }, '#fff0a0', null, { noStroke: true });
      }
    };

    if (st === 'roll') {
      // 只剩龜殼在滾
      const r = 76;
      ctx.translate(0, -r - 2);
      ctx.rotate(m.rollAngle || 0);
      const ball = (c) => c.ellipse(0, 0, r, r * 0.96, 0, 0, TAU);
      A.shape(ctx, ball, shellC[0], shellC[1], { cel: [9, 9], hl: [-r * 0.4, -r * 0.45, 12, 7], noStroke: true });
      ctx.save();
      ctx.beginPath();
      ball(ctx);
      ctx.clip();
      A.ellipse(ctx, 0, r * 0.98, r * 1.1, r * 0.48, '#f0d49a', '#d4b478', { hl: false, lw: 3 });
      ctx.translate(-4, 6);
      drawCracks();
      ctx.restore();
      [[r * 0.82, r * 0.28], [-r * 0.78, r * 0.36], [r * 0.34, r * 0.72], [-r * 0.36, r * 0.72]].forEach(([x, y]) => A.ellipse(ctx, x, y, 8, 6, '#2a1a14', null, { lw: 2.4, hl: false }));
      ctx.beginPath();
      ball(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.5;
      ctx.stroke();
      volcano(0, -r * 0.8);
      ctx.restore();
      // 地上的揚塵
      ctx.save();
      ctx.fillStyle = 'rgba(200,150,110,0.5)';
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i / 3) % 1;
        ctx.globalAlpha = 1 - q;
        ctx.beginPath();
        ctx.arc(-60 - q * 40, -8 - q * 12, 8 + q * 8, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    let sy = 1 + Math.sin(t * 1.8) * 0.012;
    if (prep) sy = 0.95;
    if (st === 'recover') sy = 0.92;
    ctx.scale(1 / Math.sqrt(sy), sy);

    // 縮頭縮腳程度（stateT 倒數）
    const tuck = st === 'rollPrep' ? 0.3 + 0.7 * Math.min(1, Math.max(0, 1 - (m.stateT || 0) / 0.7)) : 0;
    const walk = st === 'walk' || st === 'intro';
    const step = walk ? Math.sin(t * 5) : 0;
    const legH = 26 * (1 - tuck * 0.8);

    // 遠側的腳
    A.ellipse(ctx, -50, -legH * 0.5 - 4 - Math.max(0, -step) * 5, 18, legH * 0.55 + 4, skin[1], null, { hl: false, lw: 3 });
    A.ellipse(ctx, 48, -legH * 0.5 - 4 - Math.max(0, step) * 5, 18, legH * 0.55 + 4, skin[1], null, { hl: false, lw: 3 });
    // 尾巴
    A.shape(ctx, (c) => { c.moveTo(-96, -34); c.quadraticCurveTo(-118, -30, -120, -20); c.quadraticCurveTo(-108, -22, -94, -24); c.closePath(); }, skin[0], skin[1], { lw: 3, shadeY: -24 });

    // 頭與脖子
    const nx = 78 - tuck * 40;
    const hx = 130 - tuck * 66;
    let hy = -68 + (prep ? 6 : 0) + (erupt ? -10 : 0) + tuck * 12;
    if (st === 'recover') hy += 10;
    limb(ctx, (c) => { c.moveTo(nx, -40); c.quadraticCurveTo(hx - 20, -44, hx - 10, hy + 8); }, 32, skin[0]);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(1.3, 1.3);
    ctx.translate(-hx, -hy);
    A.shape(ctx, (c) => {
      c.moveTo(hx - 30, hy + 12);
      c.bezierCurveTo(hx - 34, hy - 26, hx + 20, hy - 34, hx + 34, hy - 6);
      c.bezierCurveTo(hx + 40, hy + 12, hx + 20, hy + 24, hx - 30, hy + 12);
      c.closePath();
    }, skin[0], skin[1], { cel: [5, 5], hl: [hx - 12, hy - 16, 7, 4] });
    ctx.fillStyle = A.c('#cf9858');
    [[-16, -16, 4], [-6, -21, 3], [-22, -6, 3]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(hx + x, hy + y, r, 0, TAU); ctx.fill(); });
    // 臉
    const kind = bossEyeKind(m, m.enraged || prep);
    if (prep && kind !== 'x' && kind !== 'hurt') {
      // 用力擠眼 > <
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      [[hx + 2, hy - 8, 1], [hx + 20, hy - 9, -1]].forEach(([x, y, d]) => {
        ctx.beginPath();
        ctx.moveTo(x - 5 * d, y - 5);
        ctx.lineTo(x + 4 * d, y);
        ctx.lineTo(x - 5 * d, y + 5);
        ctx.stroke();
      });
    } else if (st === 'recover' && kind !== 'x') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.4;
      [[hx + 2, hy - 8], [hx + 20, hy - 9]].forEach(([x, y]) => {
        ctx.beginPath();
        for (let a = 0; a < 12; a += 0.4) {
          const r = a * 0.55;
          const px = x + Math.cos(a + t * 6) * r;
          const py = y + Math.sin(a + t * 6) * r;
          a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      });
    } else {
      A.eye(ctx, hx + 2, hy - 8, 6, 8.5, kind, 1.5);
      A.eye(ctx, hx + 20, hy - 9, 5.5, 8, kind, 1.5);
    }
    ctx.fillStyle = A.c('#6a4228');
    ctx.beginPath();
    ctx.arc(hx + 32, hy - 5, 1.6, 0, TAU);
    ctx.fill();
    if (erupt || m.dead || m.hurtFlash > 0.05) {
      A.shape(ctx, (c) => { c.moveTo(hx + 12, hy + 6); c.quadraticCurveTo(hx + 22, hy + 3, hx + 32, hy + 3); c.quadraticCurveTo(hx + 28, hy + 18, hx + 12, hy + 6); c.closePath(); }, '#7a2323', null, { lw: 2.6 });
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 12, hy + 6);
      ctx.quadraticCurveTo(hx + 22, hy + 11, hx + 32, hy + 4);
      ctx.stroke();
    }
    A.blush(ctx, hx - 8, hy + 3, 7);
    A.blush(ctx, hx + 27, hy + 1, 4.5);
    ctx.restore();

    // 殼
    const sx = -8;
    const sb = -34 + tuck * 6;
    A.shape(ctx, (c) => A.roundRect(c, sx - 100, sb - 6, 200, 18, 9), '#f0d49a', '#d4b478', { lw: 3, shadeY: sb + 4 });
    const dome = (c) => {
      c.moveTo(sx - 104, sb);
      c.bezierCurveTo(sx - 104, sb - 112, sx + 104, sb - 112, sx + 104, sb);
      c.quadraticCurveTo(sx, sb + 10, sx - 104, sb);
      c.closePath();
    };
    A.shape(ctx, dome, shellC[0], shellC[1], { cel: [10, 8], hl: [sx - 48, sb - 62, 18, 8], noStroke: true });
    ctx.save();
    ctx.beginPath();
    dome(ctx);
    ctx.clip();
    // 龜甲格紋
    ctx.strokeStyle = A.c('#4a322c');
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(sx - 104, sb - 18);
    ctx.quadraticCurveTo(sx, sb - 30, sx + 104, sb - 18);
    ctx.stroke();
    ctx.beginPath();
    for (let i = -4; i <= 4; i++) {
      ctx.moveTo(sx + i * 22, sb - 20 - (4 - Math.abs(i)) * 1.5);
      ctx.lineTo(sx + i * 22, sb + 4);
    }
    ctx.stroke();
    ctx.translate(sx, sb - 16);
    drawCracks();
    ctx.restore();
    ctx.beginPath();
    dome(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.5;
    ctx.stroke();
    volcano(sx - 6, sb - 78);

    // 近側的腳
    const nearLeg = (x, lift) => {
      A.shape(ctx, (c) => A.roundRect(c, x - 18, -legH - 12 - lift, 36, legH + 12, 14), skin[0], skin[1], { cel: [4, 3] });
      ctx.fillStyle = A.c('#fff2d6');
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      [-9, 0, 9].forEach((dx) => {
        ctx.beginPath();
        ctx.ellipse(x + dx + 4, -3 - lift, 3.6, 3, 0, PI, 0);
        ctx.fill();
        ctx.stroke();
      });
    };
    nearLeg(-66, Math.max(0, step) * 5);
    nearLeg(64, Math.max(0, -step) * 5);

    if (st === 'recover' && !m.dead) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * TAU) / 3;
        star(ctx, hx + 6 + Math.cos(a) * 30, hy - 46 + Math.sin(a) * 8);
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
