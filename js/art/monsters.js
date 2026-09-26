// 怪物繪圖。每個系列一個函式，用 stage（1~3）決定外型；
// 第 2、3 階是在第 1 階的結構上加部件。原點在腳底中央、面向右。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;

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
  function snail(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    const hide = m.shellT > 0;
    const sx = hide ? 1 : 1 + Math.sin(t * 4) * 0.05;
    const body = s === 3 ? ['#e9cf9d', '#cfae74'] : ['#f2dfb4', '#d9bf88'];

    if (!hide) {
      ctx.save();
      ctx.scale(sx, 1);
      // 身體
      A.shape(
        ctx,
        (c) => {
          c.moveTo(-24, 0);
          c.quadraticCurveTo(-26, -9, -12, -9);
          c.lineTo(10, -10);
          c.quadraticCurveTo(24, -26, 28, -9);
          c.quadraticCurveTo(30, 0, 22, 0);
          c.closePath();
        },
        body[0],
        body[1],
        { shadeY: -4 }
      );
      // 眼柄
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(18, -17);
      ctx.lineTo(15, -31);
      ctx.moveTo(24, -17);
      ctx.lineTo(27, -30);
      ctx.stroke();
      A.ellipse(ctx, 15, -33, 4.5, 4.5, '#ffffff', null, { lw: 2, hl: false });
      A.ellipse(ctx, 27, -32, 4.5, 4.5, '#ffffff', null, { lw: 2, hl: false });
      const dead = m.dead;
      ctx.fillStyle = A.c('#2b1a12');
      if (!dead) {
        ctx.beginPath();
        ctx.arc(16.5, -33, 2.2, 0, Math.PI * 2);
        ctx.arc(28.5, -32, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        A.eye(ctx, 15, -33, 2.5, 2.5, 'x');
        A.eye(ctx, 27, -32, 2.5, 2.5, 'x');
      }
      smallMouth(ctx, 24, -12, m.hurtT > 0);
      A.blush(ctx, 19, -13, 3.5);
      ctx.restore();
    }

    // 殼
    const cy = hide ? -16 : -21;
    if (s === 1) {
      A.ellipse(ctx, -5, cy, 15, 15, '#8fd3f4', '#5eb3e0', { hl: [-11, cy - 7, 5, 3.5] });
      ctx.strokeStyle = A.c('#e8f8ff');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-4, cy + 1, 7, 0.4, 4.2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(2, cy - 8, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (s === 2) {
      A.ellipse(ctx, -5, cy - 1, 17, 17, '#a67c52', '#7f5a38', { hl: false });
      ctx.strokeStyle = A.c('#6b4a2e');
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.2) {
        const r = 2 + a * 1.4;
        const x = -5 + Math.cos(a) * r;
        const y = cy - 1 + Math.sin(a) * r;
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
        '#79a84a',
        '#5c8a36',
        { shadeY: cy - 9, lw: 2.2 }
      );
      // 小芽
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-5, cy - 18);
      ctx.lineTo(-5, cy - 28);
      ctx.stroke();
      A.ellipse(ctx, -10, cy - 30, 6, 3.5, '#8fd46a', null, { rot: -0.5, lw: 2, hl: false });
      A.ellipse(ctx, 0, cy - 31, 6, 3.5, '#8fd46a', null, { rot: 0.5, lw: 2, hl: false });
    } else {
      // 樹樁殼
      A.shape(ctx, (c) => A.roundRect(c, -25, cy - 24, 38, 34, 8), '#8b5e3c', '#6b4428', { shadeY: cy + 2 });
      ctx.strokeStyle = A.c('#5a3a22');
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-19 + i * 11, cy - 16);
        ctx.lineTo(-18 + i * 11, cy + 4);
        ctx.stroke();
      }
      A.ellipse(ctx, -6, cy - 24, 19, 6, '#e3be86', '#c9a068', { hl: false });
      ctx.strokeStyle = A.c('#b48a52');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-6, cy - 24, 11, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(-6, cy - 24, 5, 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // 樹樁上的小蘑菇
      [[-16, cy - 26, 1], [-2, cy - 28, 1.2]].forEach(([x, y, k]) => {
        ctx.fillStyle = A.c('#fff0d6');
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(x - 1.8 * k, y - 7 * k, 3.6 * k, 7 * k);
        ctx.fill();
        ctx.stroke();
        A.shape(ctx, (c) => c.ellipse(x, y - 7 * k, 7 * k, 5 * k, 0, Math.PI, 0), '#e05a3a', null, { lw: 2, hl: [x - 2, y - 10 * k, 2, 1.2] });
      });
    }
  }

  // ── 菇系：小傘菇 → 斑點菇 → 提燈菇 ──
  // 立體上色版本：徑向漸層、光澤、同色系描邊、閃亮大眼。
  function mushroom(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    let sy = 1;
    if (!m.onGround) sy = m.vy < 0 ? 1.12 : 0.96;
    else if (m.landT > 0) sy = 0.8 + (1 - m.landT / 0.15) * 0.2;
    if (m.attackT > 0 && m.attackPhase === 'wind') sy = 0.86;
    const walk = m.onGround && Math.abs(m.vx || 0) > 5;
    const step = walk ? Math.sin(t * 12) : 0;
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);

    const K = [1, 1.15, 1.25][s - 1];
    const stemCol = s === 3 ? '#e4ebff' : '#fff0d4';
    const capCol = ['#f7a23c', '#ea4e3c', '#b8ec52'][s - 1];
    const gillCol = s === 3 ? '#9fc6a0' : '#e8c79a';
    const hw = 16 * K; // 身體半寬
    const bh = 32 * K; // 身體高度
    const bodyTop = -bh - 4;

    if (s === 3) {
      const glow = 0.55 + Math.sin(t * 3) * 0.2;
      const gr = ctx.createRadialGradient(0, bodyTop - 10, 4, 0, bodyTop - 10, 80);
      gr.addColorStop(0, 'rgba(210,255,120,' + (0.6 * glow).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(210,255,120,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, bodyTop - 10, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    // 腳（走路時交替）
    const foot = (fx, lift) => {
      A.vol(ctx, (c) => c.ellipse(fx, -4 - lift, 8 * K, 5 * K, 0, 0, Math.PI * 2), U.mix(stemCol, '#c8a878', 0.25), [fx - 8 * K, -9 * K - lift, 16 * K, 10 * K], { lw: 2.2, bounce: false });
    };
    foot(-8 * K, Math.max(0, step) * 4);
    foot(8 * K, Math.max(0, -step) * 4);

    // 身體（莖）：上窄下寬的豆形
    const body = (c) => {
      c.moveTo(-hw * 0.8, bodyTop + 4);
      c.bezierCurveTo(-hw * 1.15, bodyTop + bh * 0.45, -hw * 1.2, -4, -hw * 0.55, -3);
      c.quadraticCurveTo(0, 1, hw * 0.55, -3);
      c.bezierCurveTo(hw * 1.2, -4, hw * 1.15, bodyTop + bh * 0.45, hw * 0.8, bodyTop + 4);
      c.quadraticCurveTo(0, bodyTop - 2, -hw * 0.8, bodyTop + 4);
      c.closePath();
    };
    A.vol(ctx, body, stemCol, [-hw * 1.2, bodyTop, hw * 2.4, bh + 4], { gloss: [-hw * 0.45, bodyTop + bh * 0.35, hw * 0.28, bh * 0.2, -0.2], lo: 0.22 });

    // 臉
    const kind = m.dead ? 'x' : m.hurtT > 0 ? 'hurt' : m.angry || m.attackT > 0 ? 'angry' : m.blink ? 'closed' : 'normal';
    const ey = bodyTop + bh * 0.5;
    A.eyeShine(ctx, -2 * K, ey, 4.2 * K, 5.8 * K, kind, 1);
    A.eyeShine(ctx, 9 * K, ey - 0.5, 3.9 * K, 5.5 * K, kind, 1);
    A.blush(ctx, -8 * K, ey + 7 * K, 4 * K);
    A.blush(ctx, 15 * K, ey + 6 * K, 3 * K);
    ctx.strokeStyle = A.c('#5a2a1a');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (m.hurtT > 0 || m.attackT > 0) {
      ctx.fillStyle = A.c('#8a2a22');
      ctx.beginPath();
      ctx.ellipse(4 * K, ey + 9 * K, 3 * K, 3.6 * K, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(1 * K, ey + 8 * K);
      ctx.quadraticCurveTo(4 * K, ey + 11 * K, 7 * K, ey + 8 * K);
      ctx.stroke();
    }

    // 傘蓋
    const R = [25, 30, 31][s - 1];
    const cy = bodyTop - 3 + Math.sin(t * 5) * 1.2;
    const tilt = walk ? step * 0.04 : 0;
    ctx.save();
    ctx.translate(0, cy);
    ctx.rotate(tilt);
    // 菌褶（傘蓋下緣）
    A.vol(ctx, (c) => c.ellipse(0, 1, R * 0.92, R * 0.22, 0, 0, Math.PI * 2), gillCol, [-R, -R * 0.2, R * 2, R * 0.45], { lw: 2.2, bounce: false, hi: 0.2 });
    ctx.strokeStyle = A.c(U.mix(gillCol, '#5a3a20', 0.4));
    ctx.lineWidth = 1.2;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * R * 0.16, -2);
      ctx.lineTo(i * R * 0.19, R * 0.16);
      ctx.stroke();
    }
    const dome = (c) => {
      c.moveTo(-R - 5, 0);
      c.bezierCurveTo(-R - 6, -R * 1.35, R + 6, -R * 1.35, R + 5, 0);
      c.bezierCurveTo(R * 0.6, 6, -R * 0.6, 6, -R - 5, 0);
      c.closePath();
    };
    A.vol(ctx, dome, capCol, [-R - 6, -R * 1.05, R * 2 + 12, R * 1.1], { gloss: [-R * 0.42, -R * 0.66, R * 0.36, R * 0.16, -0.45], lo: 0.34, lx: 0.3, ly: 0.2 });
    // 斑點
    const spots = s === 1
      ? [[-11, -12, 5.5], [10, -17, 6.5], [1, -26, 4.5], [20, -6, 3.5]]
      : s === 2
        ? [[-15, -10, 7], [11, -19, 8], [-3, -29, 5.5], [23, -6, 4.5], [-24, -3, 3.5]]
        : [[-12, -14, 4], [9, -21, 4.5], [0, -30, 3.5], [20, -9, 3]];
    spots.forEach(([dx, dy, r]) => {
      const col = s === 1 ? '#ffd79a' : s === 2 ? '#fff8f0' : '#f6ffd0';
      A.vol(ctx, (c) => c.ellipse(dx, dy, r, r * 0.78, 0, 0, Math.PI * 2), col, [dx - r, dy - r, r * 2, r * 2], { lw: s === 2 ? 1.6 : 0.01, noStroke: s !== 2, hi: 0.5, lo: 0.12, bounce: false });
    });
    if (s === 3) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const a = t * 1.4 + i * 1.1;
        const px = Math.cos(a) * R * 0.55;
        const py = -R * 0.5 + Math.sin(a * 1.3) * R * 0.2;
        const g2 = ctx.createRadialGradient(px, py, 0, px, py, 6);
        g2.addColorStop(0, 'rgba(255,255,220,0.9)');
        g2.addColorStop(1, 'rgba(255,255,220,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  }

  // ── 草精系：種子精 → 嫩芽精 → 花冠精 ──
  function sprite(ctx, m) {
    const s = m.def.stage;
    const t = m.t;
    let sy = 1;
    if (!m.onGround) sy = m.vy < 0 ? 1.1 : 0.96;
    else if (m.landT > 0) sy = 0.84 + (1 - m.landT / 0.15) * 0.16;
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);
    const sway = Math.sin(t * 3) * 0.12;

    if (s === 1) {
      A.ellipse(ctx, 0, -17, 15, 17, '#b07a45', '#8a5a2e');
      ctx.strokeStyle = A.c('#8a5a2e');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, -26);
      ctx.quadraticCurveTo(-11, -16, -7, -6);
      ctx.stroke();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -33);
      ctx.lineTo(0, -40);
      ctx.stroke();
      A.ellipse(ctx, -7, -42, 8, 4.5, '#7cc95a', '#58a13c', { rot: -0.6 + sway, lw: 2.2, hl: false });
      A.ellipse(ctx, 7, -42, 8, 4.5, '#7cc95a', '#58a13c', { rot: 0.6 + sway, lw: 2.2, hl: false });
      faceEyes(ctx, 0, -19, 8, 3, 4, m);
      smallMouth(ctx, 5, -10, m.hurtT > 0);
      A.blush(ctx, -3, -12, 3);
    } else if (s === 2) {
      // 腳
      A.ellipse(ctx, -6, -3, 5, 3.5, '#62a845', null, { lw: 2, hl: false });
      A.ellipse(ctx, 7, -3, 5, 3.5, '#62a845', null, { lw: 2, hl: false });
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
      A.ellipse(ctx, 0, -24, 13, 20, '#8fd06a', '#62a845');
      // 葉冠
      [[-9, -46, -0.9], [0, -50, 0], [9, -46, 0.9]].forEach(([x, y, r]) => {
        A.ellipse(ctx, x, y, 9, 4.5, '#6cc04a', '#4f9a35', { rot: r + sway - Math.PI / 2 * Math.sign(r || 1) * 0.5, lw: 2, hl: false });
      });
      faceEyes(ctx, -1, -28, 9, 3.2, 4.4, m);
      smallMouth(ctx, 5, -18, m.attackT > 0 || m.hurtT > 0);
      A.blush(ctx, -4, -20, 3);
    } else {
      A.ellipse(ctx, -8, -3, 6, 4, '#4f7a36', null, { lw: 2, hl: false });
      A.ellipse(ctx, 8, -3, 6, 4, '#4f7a36', null, { lw: 2, hl: false });
      const aim = m.attackT > 0 ? 1 : 0;
      A.ellipse(ctx, 18 + aim * 6, -30 - aim * 4, 7, 4.5, '#86c45e', null, { rot: -0.4, lw: 2, hl: false });
      A.ellipse(ctx, 0, -28, 18, 25, '#6f9e4f', '#4f7a36');
      // 樹皮紋路
      ctx.strokeStyle = A.c('#4a6e33');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.quadraticCurveTo(-13, -24, -8, -34);
      ctx.moveTo(-3, -8);
      ctx.lineTo(-4, -16);
      ctx.stroke();
      // 花冠
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i / 4) * Math.PI;
        const fx = Math.cos(a) * 17;
        const fy = -50 + Math.sin(a) * 9 + Math.sin(t * 3 + i) * 1;
        for (let k = 0; k < 5; k++) {
          const pa = (k / 5) * Math.PI * 2 + t * 0.5;
          A.ellipse(ctx, fx + Math.cos(pa) * 4, fy + Math.sin(pa) * 4, 3.6, 3.6, '#ff9fc4', null, { lw: 1.5, hl: false });
        }
        A.ellipse(ctx, fx, fy, 2.6, 2.6, '#ffd84a', null, { lw: 1.2, hl: false });
      }
      faceEyes(ctx, -1, -32, 10, 3.4, 4.6, m);
      smallMouth(ctx, 6, -20, m.attackT > 0 || m.hurtT > 0);
      A.blush(ctx, -5, -23, 3.5);
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
    A.ellipse(ctx, -58, -60 + wave, 13, 11, '#fff0dc', '#e5caa2', { hl: false });
    A.ellipse(ctx, 58, -60 - wave, 13, 11, '#fff0dc', '#e5caa2', { hl: false });
    // 身體（莖）
    A.shape(ctx, (c) => A.roundRect(c, -52, -118, 104, 114, 34), '#fff0dc', '#e5caa2', { shadeY: -40, hl: [-26, -90, 12, 20] });
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
      { shadeY: cy - 16, hl: [-45, cy - 64, 26, 12] }
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

  const DRAW = { snail, mushroom, sprite, queen };

  A.drawMonster = function (ctx, m) {
    const fn = DRAW[m.def.art];
    if (!fn) return;
    ctx.save();
    ctx.translate(m.x, m.y);
    const sc = m.scale || 1;
    if (!m.def.boss) A.groundShadow(ctx, 0, 0, (m.w * 0.55) * sc);
    else A.groundShadow(ctx, 0, 0, 90);
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
    if (flash > 0) {
      A.mode = 'flash';
      A.modeAmt = 0.85 * flash;
    } else if (m.shiny) {
      A.mode = 'shiny';
    }
    fn(ctx, m);
    A.mode = null;
    ctx.restore();
    ctx.globalAlpha = 1;
    if (m.shiny && !m.dead && Math.random() < 0.15) {
      G.fx.sparkle(m.x, m.y - m.h * 0.6 * sc, '#ffe066', 1, m.w * 0.5);
    }
  };
})();
