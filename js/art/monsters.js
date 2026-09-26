// 怪物繪圖。每個系列一個函式，用 stage（1~3）決定外型；
// 第 2、3 階是在第 1 階的結構上加部件。原點在腳底中央、面向右。
(function () {
  'use strict';
  const A = G.art;

  function faceEyes(ctx, x, y, gap, rx, ry, m) {
    const kind = m.dead ? 'x' : m.hurtT > 0 ? 'hurt' : m.angry ? 'angry' : m.blink ? 'closed' : 'normal';
    A.eye(ctx, x, y, rx, ry, kind, 0.8);
    A.eye(ctx, x + gap, y - 0.5, rx * 0.92, ry * 0.95, kind, 0.8);
  }

  function smallMouth(ctx, x, y, open) {
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (open) {
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 3, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y - 1, 3, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
  }

  // ── 蝸牛系：露珠蝸 → 苔殼蝸 → 古木蝸 ──
  // 特徵：露珠蝸的殼是一滴水、苔殼蝸背著小花園、古木蝸背著一截樹樁。
  function snail(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    const hide = m.shellT > 0;
    const sx = hide ? 1 : 1 + Math.sin(t * 4) * 0.05;
    const body = s === 3 ? ['#e9cf9d', '#cfae74'] : s === 2 ? ['#ecdcae', '#d2ba84'] : ['#f4e4bc', '#dcc392'];

    if (!hide) {
      ctx.save();
      ctx.scale(sx, 1);
      // 身體
      A.shape(
        ctx,
        (c) => {
          c.moveTo(-25, 0);
          c.quadraticCurveTo(-30, -3, -24, -7);
          c.quadraticCurveTo(-8, -10, 10, -10);
          c.quadraticCurveTo(22, -28, 29, -12);
          c.quadraticCurveTo(31, 0, 21, 0);
          c.closePath();
        },
        body[0],
        body[1],
        { cel: [3, 3], hl: [16, -20, 3.5, 2] }
      );
      // 腹足的波紋
      ctx.strokeStyle = A.c(body[1]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const x = -18 + i * 8 + Math.sin(t * 8 + i) * 1;
        ctx.moveTo(x, -2);
        ctx.lineTo(x + 3, -2);
      }
      ctx.stroke();
      // 眼柄
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      const wob = Math.sin(t * 3) * 1.2;
      ctx.beginPath();
      ctx.moveTo(18, -17);
      ctx.lineTo(15 + wob, -31);
      ctx.moveTo(24, -17);
      ctx.lineTo(27 + wob, -30);
      ctx.stroke();
      ctx.strokeStyle = A.c(body[0]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 眼睛：白色眼球加上大黑眼珠
      const eyeR = s === 3 ? 5 : 5.5;
      [[15 + wob, -34], [27 + wob, -33]].forEach(([x, y]) => {
        A.ellipse(ctx, x, y, eyeR, eyeR, '#ffffff', null, { lw: 2.2, hl: false });
        if (m.dead) A.eye(ctx, x, y, 2.4, 2.4, 'x');
        else if (m.blink) A.eye(ctx, x, y + 1, 2.8, 2, 'closed');
        else A.eye(ctx, x + 1, y + 0.5, 2.8, 3.4, m.hurtT > 0 ? 'hurt' : 'normal', 0);
      });
      if (s === 3 && !m.dead) {
        // 古木蝸的粗眉毛
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(10 + wob, -41);
        ctx.lineTo(19 + wob, -39);
        ctx.moveTo(23 + wob, -39);
        ctx.lineTo(31 + wob, -41);
        ctx.stroke();
      }
      smallMouth(ctx, 24, -11, m.hurtT > 0);
      A.blush(ctx, 19, -13, 3.8);
      ctx.restore();
    }

    // 殼
    const cy = hide ? -16 : -21;
    if (s === 1) {
      // 一滴水形狀的殼
      const drop = (c) => {
        c.moveTo(-1, cy - 22);
        c.bezierCurveTo(8, cy - 12, 13, cy - 2, 10, cy + 7);
        c.bezierCurveTo(6, cy + 16, -15, cy + 16, -19, cy + 7);
        c.bezierCurveTo(-23, cy - 3, -12, cy - 11, -1, cy - 22);
        c.closePath();
      };
      A.shape(ctx, drop, '#8fd3f4', '#5aaede', { cel: [4, 4] });
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-11, cy - 1, 3.5, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-9, cy + 8, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // 殼裡的小氣泡
      ctx.strokeStyle = A.c('#e8f8ff');
      ctx.lineWidth = 1.5;
      const b = (t * 0.6) % 1;
      ctx.globalAlpha = 1 - b;
      ctx.beginPath();
      ctx.arc(1, cy + 6 - b * 14, 2.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (s === 2) {
      A.ellipse(ctx, -5, cy - 1, 17, 17, '#b0804e', '#8a5f36', { cel: [4, 4], hl: false });
      ctx.strokeStyle = A.c('#6b4a2e');
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let a = 0; a < 9.2; a += 0.2) {
        const r = 2 + a * 1.4;
        const x = -4 + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      // 青苔
      A.shape(
        ctx,
        (c) => {
          c.moveTo(-21, cy - 5);
          for (let i = 0; i <= 6; i++) c.quadraticCurveTo(-21 + i * 5.5 - 2, cy - 22 + (i % 2) * 3, -21 + i * 5.5 + 2.5, cy - 14 - Math.sin(i) * 2);
          c.lineTo(11, cy - 5);
          c.quadraticCurveTo(-5, cy - 12, -21, cy - 5);
          c.closePath();
        },
        '#79b04a',
        '#5c8a36',
        { cel: [2, 3], lw: 2.4 }
      );
      // 小芽與一朵小花
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-8, cy - 18);
      ctx.lineTo(-8, cy - 28);
      ctx.stroke();
      const sway = Math.sin(t * 2.5) * 0.15;
      A.ellipse(ctx, -13, cy - 30, 6, 3.5, '#8fd46a', null, { rot: -0.5 + sway, lw: 2, hl: false });
      A.ellipse(ctx, -3, cy - 31, 6, 3.5, '#8fd46a', null, { rot: 0.5 + sway, lw: 2, hl: false });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        A.ellipse(ctx, 5 + Math.cos(a) * 3.2, cy - 19 + Math.sin(a) * 3.2, 2.6, 2.6, '#ffb0d0', null, { lw: 1.4, hl: false });
      }
      A.ellipse(ctx, 5, cy - 19, 1.8, 1.8, '#ffe066', null, { lw: 1.2, hl: false });
    } else {
      // 樹樁殼
      A.shape(ctx, (c) => A.roundRect(c, -25, cy - 24, 38, 34, 8), '#8b5e3c', '#6b4428', { cel: [4, 3] });
      ctx.strokeStyle = A.c('#5a3a22');
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-19 + i * 11, cy - 16);
        ctx.quadraticCurveTo(-17 + i * 11, cy - 6, -18 + i * 11, cy + 4);
        ctx.stroke();
      }
      // 樹洞
      A.ellipse(ctx, -2, cy - 4, 3.5, 5, '#3a2414', null, { lw: 2, hl: false });
      A.ellipse(ctx, -6, cy - 24, 19, 6, '#e3be86', '#c9a068', { hl: false });
      ctx.strokeStyle = A.c('#b48a52');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-6, cy - 24, 11, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(-6, cy - 24, 5, 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // 樹樁上的小蘑菇與葉子
      [[-17, cy - 26, 1], [-4, cy - 28, 1.25], [7, cy - 25, 0.85]].forEach(([x, y, k], i) => {
        ctx.fillStyle = A.c('#fff0d6');
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(x - 1.8 * k, y - 7 * k, 3.6 * k, 7 * k);
        ctx.fill();
        ctx.stroke();
        A.shape(ctx, (c) => c.ellipse(x, y - 7 * k, 7 * k, 5 * k, 0, Math.PI, 0), i === 1 ? '#e05a3a' : '#f28c38', null, { lw: 2, hl: [x - 2, y - 10 * k, 2, 1.2] });
        ctx.fillStyle = '#fff6ea';
        ctx.beginPath();
        ctx.arc(x + 2 * k, y - 9 * k, 1 * k, 0, Math.PI * 2);
        ctx.fill();
      });
      A.ellipse(ctx, 12, cy - 30, 6, 3, '#7cc95a', null, { rot: -0.8, lw: 2, hl: false });
    }
  }

  // ── 菇系：小傘菇 → 斑點菇 → 提燈菇 ──
  // 特徵：小傘菇頭上有一根捲芽、斑點菇是濃眉的莽撞傢伙、提燈菇的傘頂有提把，肚子會發光。
  function mushroom(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    let sy = 1;
    if (!m.onGround) sy = m.vy < 0 ? 1.1 : 0.97;
    else if (m.landT > 0) sy = 0.82 + (1 - m.landT / 0.15) * 0.18;
    if (m.attackT > 0 && m.attackPhase === 'wind') sy = 0.88;
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);

    const capR = [22, 27, 28][s - 1];
    const stemW = [26, 30, 30][s - 1];
    const stemH = [24, 28, 32][s - 1];
    const stem = s === 3 ? ['#e8e4ff', '#c4bcf0'] : ['#fff0d6', '#e8cfa6'];
    const busy = m.attackT > 0 || m.chargeT > 0;

    if (s === 3) {
      const glow = 0.5 + Math.sin(t * 3) * 0.2;
      const g = ctx.createRadialGradient(0, -stemH - 8, 4, 0, -stemH - 8, 70);
      g.addColorStop(0, 'rgba(220,255,140,' + (0.55 * glow).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(220,255,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -stemH - 8, 70, 0, Math.PI * 2);
      ctx.fill();
    }

    // 小手（在身體後面），衝撞或攻擊時舉起來
    const armY = -stemH * 0.45 - (busy ? 8 : 0);
    A.ellipse(ctx, -stemW / 2 - 2, armY, 5, 4, stem[0], stem[1], { lw: 2.2, hl: false, rot: busy ? -0.6 : 0.3 });
    A.ellipse(ctx, stemW / 2 + 2, armY + (busy ? 0 : 1), 5, 4, stem[0], stem[1], { lw: 2.2, hl: false, rot: busy ? 0.6 : -0.3 });
    // 腳
    const walk = m.onGround && Math.abs(m.vx || 0) > 5 ? Math.sin(t * 12) * 2 : 0;
    A.ellipse(ctx, -8, -3 - Math.max(0, walk), 6, 4, stem[0], stem[1], { lw: 2.2, hl: false });
    A.ellipse(ctx, 8, -3 - Math.max(0, -walk), 6, 4, stem[0], stem[1], { lw: 2.2, hl: false });
    // 身體
    A.shape(ctx, (c) => A.roundRect(c, -stemW / 2, -stemH - 4, stemW, stemH, 11), stem[0], stem[1], { cel: [4, 3], hl: [-stemW / 2 + 6, -stemH + 6, 3, 5] });
    if (s === 3) {
      // 發光的肚子
      const pulse = 0.6 + Math.sin(t * 4) * 0.3;
      ctx.globalAlpha = pulse;
      A.ellipse(ctx, 0, -10, 7, 5.5, '#fff7a0', null, { noStroke: true, hl: false });
      ctx.globalAlpha = 1;
    }
    // 臉
    const ey = -stemH + 9;
    if (s === 3 && !m.dead && m.hurtT <= 0 && !busy) {
      // 半閉的神秘眼
      [[-2, 3.4], [8, 3.2]].forEach(([x, r]) => {
        A.eye(ctx, x, ey + 1, r, 4.4, 'normal', 0.6);
        ctx.fillStyle = A.c(stem[0]);
        ctx.fillRect(x - r - 1, ey - 5, r * 2 + 2, 4.5);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x - r - 0.5, ey - 0.5);
        ctx.lineTo(x + r + 0.5, ey - 0.5);
        ctx.stroke();
      });
    } else {
      faceEyes(ctx, -2, ey, 10, 3.6, 5, m);
    }
    if (s === 2 && !m.dead) {
      // 濃眉
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-7, ey - 9);
      ctx.lineTo(1, ey - 6.5);
      ctx.moveTo(5, ey - 6.5);
      ctx.lineTo(13, ey - 9);
      ctx.stroke();
    }
    // 嘴
    const my = ey + 10;
    if (m.hurtT > 0 || busy) {
      smallMouth(ctx, 4, my, true);
    } else if (s === 1) {
      A.shape(ctx, (c) => { c.moveTo(1, my - 1); c.quadraticCurveTo(4, my + 5, 7, my - 1); c.closePath(); }, '#e0605a', null, { lw: 1.8, hl: false });
    } else if (s === 2) {
      smallMouth(ctx, 4, my, false);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(5, my - 0.5);
      ctx.lineTo(7, my - 0.5);
      ctx.lineTo(6, my + 2.5);
      ctx.fill();
    } else {
      A.ellipse(ctx, 4, my, 1.8, 2.2, '#7a2323', null, { lw: 1.5, hl: false });
    }
    A.blush(ctx, -8, my - 2, 3.8);
    A.blush(ctx, 15, my - 3, 3);

    // 傘蓋
    const cy = -stemH - 2;
    const caps = [
      ['#f7923a', '#d86a1f'],
      ['#e8483a', '#b8302a'],
      ['#c8f06a', '#94c63e'],
    ];
    const bob = Math.sin(t * 5) * 1;
    const cap = (c) => {
      c.moveTo(-capR - 4, cy + bob);
      c.bezierCurveTo(-capR - 2, cy - capR * 1.25 + bob, capR + 2, cy - capR * 1.25 + bob, capR + 4, cy + bob);
      c.quadraticCurveTo(0, cy + 7 + bob, -capR - 4, cy + bob);
      c.closePath();
    };
    // 提燈菇的提把（在傘蓋後面）
    if (s === 3) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, cy - capR * 0.9 + bob, 9, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.strokeStyle = A.c('#b8864a');
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    A.shape(ctx, cap, caps[s - 1][0], caps[s - 1][1], { cel: [5, 5], hl: [-capR * 0.45, cy - capR * 0.62 + bob, capR * 0.26, capR * 0.12] });
    if (s === 1) {
      [[-9, -9, 4.5], [8, -13, 5], [-1, -18, 3.2], [17, -5, 2.8]].forEach(([dx, dy, r]) => {
        A.ellipse(ctx, dx, cy + dy + bob, r, r * 0.75, '#ffd9a0', null, { lw: 1.6, hl: false });
      });
      // 頭頂的捲芽
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2, cy - capR * 0.93 + bob);
      ctx.quadraticCurveTo(-3, cy - capR * 1.25 + bob, 3, cy - capR * 1.28 + bob);
      ctx.stroke();
      A.ellipse(ctx, 6, cy - capR * 1.25 + bob + Math.sin(t * 4) * 0.8, 4.5, 2.6, '#8fd46a', null, { rot: 0.4, lw: 1.8, hl: false });
    } else if (s === 2) {
      [[-14, -9, 5.5], [10, -14, 6.5], [-2, -22, 4.5], [20, -4, 3.8], [-22, -2, 3]].forEach(([dx, dy, r]) => {
        A.ellipse(ctx, dx, cy + dy + bob, r, r * 0.8, '#fff8ee', '#e8d8cc', { lw: 1.8, hl: false, cel: [1.5, 1.5] });
      });
    } else {
      [[-12, -10, 3.2], [9, -15, 3.6], [-2, -21, 2.8], [18, -5, 2.6], [-20, -3, 2.2]].forEach(([dx, dy, r], i) => {
        const tw = 0.7 + Math.sin(t * 3 + i) * 0.3;
        ctx.globalAlpha = tw;
        A.ellipse(ctx, dx, cy + dy + bob, r, r, '#fbffd0', null, { noStroke: true, hl: false });
        ctx.globalAlpha = 1;
      });
    }
    ctx.restore();
  }

  // ── 草精系：種子精 → 嫩芽精 → 花冠精 ──
  // 特徵：種子精頭頂裂開冒出雙葉、嫩芽精頂著一片捲起的大葉子、花冠精有樹皮身體和心形臉。
  function sprite(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    let sy = 1;
    if (!m.onGround) sy = m.vy < 0 ? 1.1 : 0.96;
    else if (m.landT > 0) sy = 0.84 + (1 - m.landT / 0.15) * 0.16;
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);
    const sway = Math.sin(t * 3) * 0.12;
    const walk = m.onGround && Math.abs(m.vx || 0) > 5 ? Math.sin(t * 12) * 2 : 0;

    if (s === 1) {
      // 小腳
      A.ellipse(ctx, -6, -2 - Math.max(0, walk), 4.5, 3, '#8a5a2e', null, { lw: 2, hl: false });
      A.ellipse(ctx, 6, -2 - Math.max(0, -walk), 4.5, 3, '#8a5a2e', null, { lw: 2, hl: false });
      A.ellipse(ctx, 0, -18, 15, 17, '#b8804a', '#8e5e30', { cel: [3, 3] });
      // 頭頂的裂縫
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, -32);
      ctx.lineTo(-3, -29);
      ctx.lineTo(0, -33);
      ctx.lineTo(3, -29);
      ctx.lineTo(6, -32);
      ctx.stroke();
      // 雙葉
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -33);
      ctx.lineTo(0, -40);
      ctx.stroke();
      A.ellipse(ctx, -7, -42, 8.5, 4.8, '#7cc95a', '#58a13c', { rot: -0.6 + sway, lw: 2.2, hl: false, cel: [1.5, 1.5] });
      A.ellipse(ctx, 7, -43, 8.5, 4.8, '#7cc95a', '#58a13c', { rot: 0.6 + sway, lw: 2.2, hl: false, cel: [1.5, 1.5] });
      faceEyes(ctx, -1, -19, 9, 3.3, 4.4, m);
      smallMouth(ctx, 4, -10, m.hurtT > 0);
      A.blush(ctx, -5, -12, 3.2);
      A.blush(ctx, 11, -12, 2.6);
    } else if (s === 2) {
      A.ellipse(ctx, -6, -3 - Math.max(0, walk), 5, 3.5, '#5a9a3e', null, { lw: 2, hl: false });
      A.ellipse(ctx, 7, -3 - Math.max(0, -walk), 5, 3.5, '#5a9a3e', null, { lw: 2, hl: false });
      // 藤鞭手臂
      const whip = m.attackT > 0 && m.attackPhase === 'strike' ? 1 : m.attackT > 0 ? -0.3 : 0;
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      const armLen = whip > 0 ? 78 : 16;
      ctx.beginPath();
      ctx.moveTo(8, -24);
      ctx.quadraticCurveTo(8 + armLen * 0.5, -34 - whip * 10, 8 + armLen, -22 + Math.sin(t * 20) * whip * 3);
      ctx.stroke();
      ctx.strokeStyle = A.c('#6fbf4a');
      ctx.lineWidth = 2.5;
      ctx.stroke();
      if (whip > 0) A.ellipse(ctx, 8 + armLen, -22, 6, 3.5, '#8fd46a', null, { lw: 2, hl: false });
      else A.ellipse(ctx, 25, -22, 4, 2.5, '#8fd46a', null, { rot: 0.4, lw: 1.8, hl: false });
      A.ellipse(ctx, 0, -24, 13, 20, '#8fd06a', '#62a845', { cel: [3, 3] });
      // 淺色肚子
      A.ellipse(ctx, 2, -16, 7, 9, '#c8ec9a', null, { noStroke: true, hl: false });
      // 頭頂捲起的大葉子
      ctx.save();
      ctx.translate(-2, -43);
      ctx.rotate(sway - 0.25);
      A.shape(
        ctx,
        (c) => {
          c.moveTo(0, 0);
          c.bezierCurveTo(-4, -16, 14, -24, 18, -12);
          c.bezierCurveTo(20, -6, 14, -4, 12, -8);
          c.bezierCurveTo(10, -12, 6, -6, 0, 0);
          c.closePath();
        },
        '#6cc04a',
        '#4f9a35',
        { cel: [2, 2], lw: 2.2, hl: false }
      );
      ctx.strokeStyle = A.c('#3f7f2a');
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(1, -2);
      ctx.quadraticCurveTo(6, -14, 15, -14);
      ctx.stroke();
      ctx.restore();
      A.ellipse(ctx, -9, -41, 6, 3.2, '#6cc04a', null, { rot: -0.9 + sway, lw: 2, hl: false });
      faceEyes(ctx, -1, -29, 9, 3.3, 4.6, m);
      if (!m.dead) {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-5, -36);
        ctx.lineTo(1, -35);
        ctx.moveTo(6, -35);
        ctx.lineTo(12, -36);
        ctx.stroke();
      }
      smallMouth(ctx, 4, -19, m.attackT > 0 || m.hurtT > 0);
      A.blush(ctx, -5, -21, 3);
      A.blush(ctx, 12, -22, 2.5);
    } else {
      A.ellipse(ctx, -8, -3 - Math.max(0, walk), 6, 4, '#4f7a36', null, { lw: 2, hl: false });
      A.ellipse(ctx, 8, -3 - Math.max(0, -walk), 6, 4, '#4f7a36', null, { lw: 2, hl: false });
      // 樹枝手臂
      const aim = m.attackT > 0 ? 1 : 0;
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(12, -28);
      ctx.lineTo(22 + aim * 6, -34 - aim * 6);
      ctx.moveTo(-14, -26);
      ctx.lineTo(-22, -32);
      ctx.stroke();
      ctx.strokeStyle = A.c('#7a5a3a');
      ctx.lineWidth = 2.5;
      ctx.stroke();
      A.ellipse(ctx, 24 + aim * 6, -36 - aim * 6, 5.5, 3.5, '#86c45e', null, { rot: -0.6, lw: 2, hl: false });
      A.ellipse(ctx, -24, -34, 5, 3.2, '#86c45e', null, { rot: 0.6, lw: 2, hl: false });
      A.ellipse(ctx, 0, -28, 18, 25, '#7a9e52', '#577a38', { cel: [4, 4] });
      // 樹皮紋路
      ctx.strokeStyle = A.c('#4a6e33');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, -10);
      ctx.quadraticCurveTo(-14, -20, -10, -30);
      ctx.moveTo(10, -8);
      ctx.lineTo(9, -15);
      ctx.stroke();
      // 心形臉
      A.shape(
        ctx,
        (c) => {
          c.moveTo(3, -18);
          c.bezierCurveTo(-8, -24, -12, -34, -6, -39);
          c.bezierCurveTo(-2, -42, 2, -40, 3, -36);
          c.bezierCurveTo(4, -40, 9, -42, 12, -39);
          c.bezierCurveTo(17, -34, 13, -24, 3, -18);
          c.closePath();
        },
        '#e6d2a4',
        '#cdb582',
        { cel: [2, 2], lw: 2, hl: false }
      );
      // 花冠
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i / 4) * Math.PI;
        const fx = 2 + Math.cos(a) * 17;
        const fy = -50 + Math.sin(a) * 9 + Math.sin(t * 3 + i) * 1;
        for (let k = 0; k < 5; k++) {
          const pa = (k / 5) * Math.PI * 2 + t * 0.5;
          A.ellipse(ctx, fx + Math.cos(pa) * 4, fy + Math.sin(pa) * 4, 3.6, 3.6, i % 2 ? '#ffc0d8' : '#ff9fc4', null, { lw: 1.5, hl: false });
        }
        A.ellipse(ctx, fx, fy, 2.6, 2.6, '#ffd84a', null, { lw: 1.2, hl: false });
      }
      faceEyes(ctx, -1, -30, 9, 3.2, 4.4, m);
      smallMouth(ctx, 4, -22, m.attackT > 0 || m.hurtT > 0);
      A.blush(ctx, -4, -24, 2.8);
      A.blush(ctx, 11, -24, 2.4);
    }
    ctx.restore();
  }

  // ── Boss：菇菇女王 ──
  function queen(ctx, m) {
    const t = m.t;
    let sy = 1;
    if (m.state === 'slamPrep') sy = 0.86 + Math.sin(t * 40) * 0.01;
    else if (m.state === 'slamAir') sy = m.vy < 0 ? 1.12 : 1.04;
    else if (m.state === 'recover') sy = 0.9 + Math.min(1, m.stateT / 0.3) * 0.1;
    else sy = 1 + Math.sin(t * 2) * 0.015;
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);

    if (m.enraged) {
      const g = ctx.createRadialGradient(0, -110, 20, 0, -110, 170);
      g.addColorStop(0, 'rgba(255,60,60,0.25)');
      g.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -110, 170, 0, Math.PI * 2);
      ctx.fill();
    }

    // 腳
    A.ellipse(ctx, -26, -6, 18, 10, '#fff0dc', '#e5caa2', { hl: false });
    A.ellipse(ctx, 26, -6, 18, 10, '#fff0dc', '#e5caa2', { hl: false });
    // 手
    const wave = Math.sin(t * 3) * 6;
    A.ellipse(ctx, -58, -60 + wave, 13, 11, '#fff0dc', '#e5caa2', { hl: false, cel: [3, 3] });
    // 蘑菇權杖
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(64, -98 - wave);
    ctx.lineTo(66, -16 - wave);
    ctx.stroke();
    ctx.strokeStyle = A.c('#ffd35a');
    ctx.lineWidth = 3.5;
    ctx.stroke();
    A.shape(ctx, (c) => { c.moveTo(50, -96 - wave); c.bezierCurveTo(50, -122 - wave, 78, -122 - wave, 78, -96 - wave); c.quadraticCurveTo(64, -90 - wave, 50, -96 - wave); c.closePath(); }, '#ff7ac0', '#d0508f', { cel: [3, 3], hl: [58, -110 - wave, 4, 2] });
    A.ellipse(ctx, 60, -104 - wave, 2.6, 2.2, '#fff6fb', null, { lw: 1.4, hl: false });
    A.ellipse(ctx, 69, -108 - wave, 2.2, 1.8, '#fff6fb', null, { lw: 1.4, hl: false });
    A.ellipse(ctx, 58, -60 - wave, 13, 11, '#fff0dc', '#e5caa2', { hl: false, cel: [3, 3] });
    // 身體（莖）
    A.shape(ctx, (c) => A.roundRect(c, -52, -118, 104, 114, 34), '#fff0dc', '#e5caa2', { cel: [9, 7], hl: [-26, -90, 12, 20] });
    // 裙擺般的傘褶
    ctx.strokeStyle = A.c('#e0b98a');
    ctx.lineWidth = 2;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12, -118);
      ctx.quadraticCurveTo(i * 13, -104, i * 11, -96);
      ctx.stroke();
    }
    // 臉
    const kind = m.dead ? 'x' : m.hurtFlash > 0.05 ? 'hurt' : m.enraged || m.state === 'slamPrep' ? 'angry' : m.blink ? 'closed' : 'normal';
    A.eye(ctx, -18, -70, 8, 11, kind, 2);
    A.eye(ctx, 20, -70, 8, 11, kind, 2);
    if (kind === 'normal' || kind === 'angry') {
      // 睫毛
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-25, -79);
      ctx.lineTo(-30, -84);
      ctx.moveTo(-22, -81);
      ctx.lineTo(-25, -87);
      ctx.moveTo(27, -79);
      ctx.lineTo(32, -84);
      ctx.moveTo(24, -81);
      ctx.lineTo(27, -87);
      ctx.stroke();
    }
    if (m.enraged && !m.dead) {
      ctx.fillStyle = 'rgba(255,50,50,0.6)';
      ctx.beginPath();
      ctx.arc(-16, -70, 3, 0, Math.PI * 2);
      ctx.arc(22, -70, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    A.blush(ctx, -30, -52, 8);
    A.blush(ctx, 32, -52, 8);
    const open = m.state === 'spore' || m.state === 'summon' || m.state === 'slamPrep';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3;
    if (open) {
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.ellipse(2, -44, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(2, -50, 9, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }

    // 傘蓋
    const cy = -118;
    A.shape(
      ctx,
      (c) => {
        c.moveTo(-104, cy);
        c.bezierCurveTo(-108, cy - 118, 108, cy - 118, 104, cy);
        c.quadraticCurveTo(0, cy + 14, -104, cy);
        c.closePath();
      },
      '#c2408f',
      '#982f70',
      { cel: [10, 9], hl: [-45, cy - 64, 26, 12] }
    );
    [[-58, -30, 12], [-10, -62, 15], [44, -44, 13], [78, -14, 8], [-86, -8, 7], [12, -22, 8]].forEach(([dx, dy, r]) => {
      A.ellipse(ctx, dx, cy + dy, r, r * 0.8, '#fff6fb', null, { lw: 2, hl: false });
    });
    // 金色扇貝邊
    ctx.fillStyle = A.c('#ffd35a');
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    for (let i = 0; i < 11; i++) {
      const x = -95 + i * 19;
      const y = cy + 3 - Math.abs(x) * 0.03;
      ctx.beginPath();
      ctx.arc(x, y, 7.5, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    // 皇冠
    const crY = cy - 86;
    A.shape(
      ctx,
      (c) => {
        c.moveTo(-26, crY + 18);
        c.lineTo(-30, crY - 6);
        c.lineTo(-14, crY + 6);
        c.lineTo(0, crY - 14);
        c.lineTo(14, crY + 6);
        c.lineTo(30, crY - 6);
        c.lineTo(26, crY + 18);
        c.closePath();
      },
      '#ffd35a',
      '#e0a82a',
      { shadeY: crY + 10 }
    );
    [[-30, -6], [0, -14], [30, -6]].forEach(([x, y]) => A.ellipse(ctx, x, crY + y, 4, 4, '#ff6fa8', null, { lw: 1.8, hl: false }));
    A.ellipse(ctx, 0, crY + 8, 5, 5, '#6fe0ff', null, { lw: 1.8, hl: false });

    ctx.restore();
  }

  const DRAW = (A.MONSTER_DRAW = { snail, mushroom, sprite, queen });

  A.drawMonster = function (ctx, m) {
    let fn = A.MONSTER_DRAW[m.def.art];
    // 新怪物的美術還沒載入：先借用舊怪物的外觀
    if (!fn && m.def.fallback && A.MONSTER_DRAW[m.def.fallback[0]]) {
      fn = A.MONSTER_DRAW[m.def.fallback[0]];
      m = Object.assign(Object.create(m), { def: Object.assign({}, m.def, { art: m.def.fallback[0], stage: m.def.fallback[1] }) });
    }
    if (!fn) return;
    ctx.save();
    ctx.translate(m.x, m.y);
    const sc = m.scale || 1;
    if (!m.def.boss) A.groundShadow(ctx, 0, 0, (m.w * 0.55) * sc * (m.hover ? Math.max(0.4, 1 - m.hover / 300) : 1));
    else A.groundShadow(ctx, 0, 0, 90);
    // 飛行怪：影子留在地上，身體往上畫
    if (m.hover) ctx.translate(0, -m.hover);
    if (m.elite) {
      const g = ctx.createRadialGradient(0, -m.h * 0.5 * sc, 5, 0, -m.h * 0.5 * sc, m.h * sc);
      const pulse = 0.35 + Math.sin(m.t * 4) * 0.12;
      g.addColorStop(0, 'rgba(120,200,255,' + pulse.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -m.h * 0.5 * sc, m.h * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    // 被引力拉扯（地爆天星拉不動 Boss 時）：身體往核心那一側傾斜、微微發抖
    if (m.pull) {
      const k = m.pull;
      ctx.transform(1, 0, -k * 0.32, 1 + Math.abs(k) * 0.04, Math.sin((m.t || 0) * 60) * Math.abs(k) * 1.5, 0);
    }
    ctx.scale(m.dir * sc, sc);
    if (m.squash > 0) {
      // 被打中時的壓扁回彈
      const q = Math.sin(m.squash * Math.PI) * (m.isBoss ? 0.35 : 1);
      ctx.scale(1 + 0.2 * q, 1 - 0.16 * q);
    }
    if (m.deadT > 0) {
      const k = Math.min(1, m.deadT / (m.isBoss ? 2 : 0.5));
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.translate(0, -k * 10);
    }
    const flash = m.hurtFlash > 0 ? Math.min(1, m.hurtFlash / 0.06) : 0;
    const V = m.V;
    if (V && V.float && !m.dead) ctx.translate(0, -6 + Math.sin(m.t * 3) * 3);
    if (V && V.alpha && !m.dead) ctx.globalAlpha = V.alpha + Math.sin(m.t * 4) * 0.1;
    if (flash > 0) {
      A.mode = 'flash';
      A.modeAmt = 0.85 * flash;
    } else if (m.shiny) {
      A.mode = 'shiny';
    } else if (V && V.tint) {
      A.mode = 'tint';
      A.modeColor = V.tint;
      A.modeAmt = V.tintAmt;
    }
    fn(ctx, m);
    A.mode = null;
    ctx.restore();
    ctx.globalAlpha = 1;
    if (m.shiny && !m.dead && Math.random() < 0.15) {
      G.fx.sparkle(m.x, m.y - m.h * 0.6 * sc, '#ffe066', 1, m.w * 0.5);
    }
    if (V && !m.dead && m.variant === 'rage' && Math.random() < 0.2) {
      G.fx.particles.push({ x: m.x + G.util.rand(-10, 10), y: m.y - m.h * sc, vx: G.util.rand(-10, 10), vy: -60, life: 0.6, t: 0, size: 4, color: 'rgba(255,90,70,0.6)', grav: -30, shape: 'circle', drag: 0 });
    }
  };
})();
