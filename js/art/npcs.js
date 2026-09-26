// NPC、寶箱、傳送門、投射物。
(function () {
  'use strict';
  const A = G.art;

  function owl(ctx, t) {
    const bob = Math.sin(t * 2) * 1.2;
    // 背包
    A.shape(ctx, (c) => A.roundRect(c, -30, -48 + bob, 20, 28, 5), '#b5763c', '#8f5a2a', { shadeY: -30 + bob });
    A.ellipse(ctx, 0, -32 + bob, 24, 30, '#9c6b45', '#7d5233', { cel: [4, 4] });
    A.ellipse(ctx, 0, -26 + bob, 15, 20, '#f0dcb8', '#dcc298', { hl: false });
    ctx.strokeStyle = A.c('#c9a877');
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-4 + i * 4, -30 + i * 6 + bob, 3, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    // 耳羽
    A.shape(ctx, (c) => { c.moveTo(-18, -54 + bob); c.lineTo(-22, -70 + bob); c.lineTo(-8, -58 + bob); c.closePath(); }, '#7d5233', null, { lw: 2.2 });
    A.shape(ctx, (c) => { c.moveTo(18, -54 + bob); c.lineTo(22, -70 + bob); c.lineTo(8, -58 + bob); c.closePath(); }, '#7d5233', null, { lw: 2.2 });
    // 眼鏡與眼
    A.ellipse(ctx, -9, -46 + bob, 9, 9, '#fff6e0', null, { lw: 2.5, hl: false });
    A.ellipse(ctx, 9, -46 + bob, 9, 9, '#fff6e0', null, { lw: 2.5, hl: false });
    const blink = Math.sin(t * 0.9) > 0.97;
    A.eye(ctx, -8, -46 + bob, 3.6, 4.4, blink ? 'closed' : 'normal', 1);
    A.eye(ctx, 10, -46 + bob, 3.6, 4.4, blink ? 'closed' : 'normal', 1);
    A.shape(ctx, (c) => { c.moveTo(-4, -38 + bob); c.lineTo(4, -38 + bob); c.lineTo(0, -31 + bob); c.closePath(); }, '#f2a53a', null, { lw: 2 });
    A.ellipse(ctx, -8, -2, 6, 3, '#f2a53a', null, { lw: 2, hl: false });
    A.ellipse(ctx, 8, -2, 6, 3, '#f2a53a', null, { lw: 2, hl: false });
  }

  function hedgehog(ctx, t) {
    const bob = Math.sin(t * 1.8) * 1;
    // 刺
    A.shape(
      ctx,
      (c) => {
        const cx = -4;
        const cy = -28 + bob;
        for (let i = 0; i <= 14; i++) {
          const a = Math.PI * 0.55 + (i / 14) * Math.PI * 1.5;
          const r = i % 2 ? 24 : 34;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r * 0.9;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
      },
      '#7b5a45',
      '#5d4232',
      { shadeY: -20 + bob }
    );
    A.ellipse(ctx, 4, -24 + bob, 20, 22, '#e8c9a4', '#d4b089', { cel: [3, 3] });
    // 圍巾
    A.shape(ctx, (c) => A.roundRect(c, -12, -22 + bob, 30, 8, 4), '#d94f4f', '#b33a3a', { shadeY: -17 + bob, lw: 2.2 });
    A.shape(ctx, (c) => A.roundRect(c, -8, -18 + bob, 8, 16, 3), '#d94f4f', '#b33a3a', { shadeY: -8 + bob, lw: 2.2 });
    // 臉
    A.eye(ctx, 10, -34 + bob, 2.8, 3, Math.sin(t * 0.7) > 0.96 ? 'closed' : 'normal', 1);
    A.eye(ctx, 18, -34 + bob, 2.6, 2.8, 'normal', 1);
    ctx.fillStyle = A.c('#3a2418');
    ctx.beginPath();
    ctx.arc(25, -29 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    A.blush(ctx, 12, -27 + bob, 3);
    // 眼鏡
    ctx.strokeStyle = A.c('#8a6a2a');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(10, -34 + bob, 5, 0, Math.PI * 2);
    ctx.arc(19, -34 + bob, 5, 0, Math.PI * 2);
    ctx.stroke();
    // 拐杖
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(28, -30);
    ctx.quadraticCurveTo(28, -40, 20, -38);
    ctx.stroke();
    ctx.strokeStyle = A.c('#b5824a');
    ctx.lineWidth = 2.5;
    ctx.stroke();
    A.ellipse(ctx, -2, -2, 6, 3, '#e8c9a4', null, { lw: 2, hl: false });
    A.ellipse(ctx, 12, -2, 6, 3, '#e8c9a4', null, { lw: 2, hl: false });
  }

  function squirrel(ctx, t) {
    const bob = Math.abs(Math.sin(t * 3)) * -2;
    const tail = Math.sin(t * 2.5) * 0.15;
    ctx.save();
    ctx.translate(-12, -20 + bob);
    ctx.rotate(tail);
    A.shape(
      ctx,
      (c) => {
        c.moveTo(0, 0);
        c.bezierCurveTo(-26, 0, -30, -40, -10, -46);
        c.bezierCurveTo(4, -50, 8, -36, 0, -30);
        c.bezierCurveTo(-10, -26, -6, -10, 4, -6);
        c.closePath();
      },
      '#d98a3d',
      '#b86c26',
      { shadeY: -10 }
    );
    ctx.restore();
    A.ellipse(ctx, 4, -20 + bob, 13, 16, '#e39a4c', '#c67c33', { cel: [3, 3] });
    A.ellipse(ctx, 7, -16 + bob, 7, 10, '#fff0d6', null, { hl: false, lw: 2 });
    // 郵差包
    ctx.strokeStyle = A.c('#6b4a2e');
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-4, -32 + bob);
    ctx.lineTo(14, -10 + bob);
    ctx.stroke();
    A.shape(ctx, (c) => A.roundRect(c, 8, -14 + bob, 14, 11, 3), '#8a5a34', '#6b4428', { shadeY: -8 + bob, lw: 2 });
    A.ellipse(ctx, 6, -42 + bob, 13, 12, '#e39a4c', '#c67c33', { cel: [3, 3] });
    A.ellipse(ctx, -1, -54 + bob, 4, 6, '#e39a4c', null, { lw: 2, hl: false });
    A.ellipse(ctx, 11, -55 + bob, 4, 6, '#e39a4c', null, { lw: 2, hl: false });
    A.eye(ctx, 6, -43 + bob, 2.8, 3.6, 'normal', 1);
    A.eye(ctx, 14, -43 + bob, 2.6, 3.4, 'normal', 1);
    ctx.fillStyle = A.c('#3a2418');
    ctx.beginPath();
    ctx.arc(18, -38 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    A.blush(ctx, 8, -36 + bob, 2.6);
    // 帽子
    A.shape(ctx, (c) => A.roundRect(c, -4, -60 + bob, 20, 7, 3), '#3d6fb3', '#2d5690', { shadeY: -56 + bob, lw: 2 });
  }

  function frog(ctx, t) {
    const bob = Math.abs(Math.sin(t * 2)) * -2;
    A.ellipse(ctx, -8, -3, 8, 4, '#6ab04a', null, { lw: 2, hl: false });
    A.ellipse(ctx, 10, -3, 8, 4, '#6ab04a', null, { lw: 2, hl: false });
    A.ellipse(ctx, 0, -20 + bob, 20, 17, '#7cc85a', '#5a9e3e', { cel: [3, 3] });
    A.ellipse(ctx, 3, -14 + bob, 12, 9, '#e8f4c0', null, { noStroke: true, hl: false });
    // 採集籃
    A.shape(ctx, (c) => A.roundRect(c, -24, -22 + bob, 14, 12, 3), '#c8903a', '#9a6a28', { shadeY: -14 + bob, lw: 2 });
    A.ellipse(ctx, -17, -24 + bob, 4, 3, '#f28c38', null, { lw: 1.5, hl: false });
    // 凸眼
    A.ellipse(ctx, -5, -36 + bob, 7, 7, '#7cc85a', '#5a9e3e', { lw: 2.2, hl: false });
    A.ellipse(ctx, 9, -36 + bob, 7, 7, '#7cc85a', '#5a9e3e', { lw: 2.2, hl: false });
    A.eye(ctx, -4, -36 + bob, 3, 3.6, Math.sin(t * 0.8) > 0.97 ? 'closed' : 'normal', 1);
    A.eye(ctx, 10, -36 + bob, 3, 3.6, 'normal', 1);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(4, -24 + bob, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();
    A.blush(ctx, -8, -24 + bob, 3.5);
    // 草帽
    A.shape(ctx, (c) => c.ellipse(2, -44 + bob, 16, 4, 0, 0, Math.PI * 2), '#f0d080', '#c8a850', { shadeY: -43 + bob, lw: 2 });
    A.shape(ctx, (c) => c.ellipse(2, -46 + bob, 8, 6, 0, Math.PI, 0), '#f0d080', null, { lw: 2, hl: false });
  }

  function fawn(ctx, t) {
    const bob = Math.sin(t * 2) * 1;
    [-10, -4, 6, 12].forEach((x, i) => A.shape(ctx, (c) => A.roundRect(c, x - 2.5, -18, 5, 18, 2.5), i % 2 ? '#c88a5a' : '#b87a4a', null, { lw: 2, hl: false }));
    A.ellipse(ctx, 0, -24 + bob, 17, 10, '#d8986a', '#b87a4a', { cel: [3, 3] });
    [[-6, -27], [2, -23], [-2, -30]].forEach(([x, y]) => A.ellipse(ctx, x, y + bob, 2.2, 1.6, '#fff4e0', null, { noStroke: true, hl: false }));
    A.ellipse(ctx, -16, -28 + bob, 4, 3, '#fff4e0', null, { lw: 1.8, hl: false });
    A.ellipse(ctx, 14, -40 + bob, 11, 10, '#d8986a', '#b87a4a', { cel: [2, 2] });
    A.ellipse(ctx, 6, -52 + bob, 3.5, 7, '#d8986a', null, { rot: -0.5, lw: 2, hl: false });
    A.ellipse(ctx, 20, -52 + bob, 3.5, 7, '#d8986a', null, { rot: 0.5, lw: 2, hl: false });
    A.eye(ctx, 15, -41 + bob, 3, 4, Math.sin(t * 0.6) > 0.97 ? 'closed' : 'normal', 1);
    A.ellipse(ctx, 23, -36 + bob, 2.5, 2, '#3a2418', null, { noStroke: true, hl: false });
    A.blush(ctx, 11, -35 + bob, 3);
    // 眼淚
    A.ellipse(ctx, 18, -35 + bob + ((t * 20) % 8), 1.4, 2, '#8fd3f4', null, { noStroke: true, hl: false });
  }

  function mole(ctx, t) {
    const bob = Math.sin(t * 2.2) * 1;
    A.ellipse(ctx, 0, -20 + bob, 18, 20, '#7a6a8a', '#5a4a6a', { cel: [3, 3] });
    A.ellipse(ctx, 4, -14 + bob, 10, 10, '#b8a8c8', null, { noStroke: true, hl: false });
    // 大爪子與鏟子
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.lineTo(24, -40);
    ctx.stroke();
    ctx.strokeStyle = A.c('#a87a4a');
    ctx.lineWidth = 2;
    ctx.stroke();
    A.shape(ctx, (c) => { c.moveTo(18, -4); c.lineTo(28, -6); c.lineTo(26, 4); c.lineTo(16, 6); c.closePath(); }, '#b8c0c8', '#8a92a0', { lw: 2, hl: false });
    A.ellipse(ctx, 16, -20 + bob, 6, 5, '#ffb3c8', null, { lw: 2, hl: false });
    // 頭燈
    A.shape(ctx, (c) => c.ellipse(2, -38 + bob, 14, 7, 0, Math.PI, 0), '#ffcf3a', '#d8a010', { shadeY: -38 + bob, lw: 2 });
    A.ellipse(ctx, 2, -44 + bob, 4, 4, '#fff6c0', null, { lw: 1.8, hl: false });
    // 小眼睛與粉紅鼻子
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, -30 + bob);
    ctx.lineTo(2, -30 + bob);
    ctx.moveTo(8, -30 + bob);
    ctx.lineTo(12, -30 + bob);
    ctx.stroke();
    A.ellipse(ctx, 14, -26 + bob, 4, 3, '#ff8aa8', null, { lw: 1.8, hl: false });
    A.blush(ctx, 0, -24 + bob, 3);
  }

  // 營地的房子：蘑菇屋、樹屋、晾衣繩與小燈串
  A.drawCampHouses = function (ctx, x1, x2, y, t) {
    const mid = (x1 + x2) / 2;
    // 樹屋
    const tx = x1 + 30;
    ctx.fillStyle = A.c('#7a5234');
    ctx.fillRect(tx - 10, y - 200, 20, 200);
    A.shape(ctx, (c) => { for (let i = 0; i < 7; i++) c.arc(tx + Math.cos(i) * 40, y - 230 + Math.sin(i * 1.7) * 20, 36, 0, Math.PI * 2); }, '#6aa84a', '#4f8a36', { noStroke: true, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, tx - 34, y - 190, 68, 46, 6), '#c8905a', '#a8703c', { cel: [4, 3] });
    A.shape(ctx, (c) => { c.moveTo(tx - 42, y - 188); c.lineTo(tx, y - 222); c.lineTo(tx + 42, y - 188); c.closePath(); }, '#b8502e', '#8a3a20', { cel: [3, 3] });
    A.shape(ctx, (c) => A.roundRect(c, tx - 8, y - 174, 16, 22, 7), '#ffe8a0', null, { lw: 2.2, hl: false });
    ctx.strokeStyle = A.c('#6b4428');
    ctx.lineWidth = 3;
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.moveTo(tx + 26, y - 140 + k * 20);
      ctx.lineTo(tx + 44, y - 140 + k * 20);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(tx + 26, y - 144);
    ctx.lineTo(tx + 26, y);
    ctx.moveTo(tx + 44, y - 144);
    ctx.lineTo(tx + 44, y);
    ctx.stroke();
    // 蘑菇屋
    const hx = x2 - 60;
    A.shape(ctx, (c) => A.roundRect(c, hx - 42, y - 80, 84, 80, 14), '#fff0d6', '#e8cfa6', { cel: [5, 3] });
    A.shape(ctx, (c) => { c.moveTo(hx - 70, y - 70); c.bezierCurveTo(hx - 70, y - 160, hx + 70, y - 160, hx + 70, y - 70); c.quadraticCurveTo(hx, y - 58, hx - 70, y - 70); c.closePath(); }, '#e8483a', '#b8302a', { cel: [6, 6] });
    [[-38, -104, 10], [14, -126, 12], [44, -92, 8], [-10, -86, 7]].forEach(([dx, dy, r]) => A.ellipse(ctx, hx + dx, y + dy, r, r * 0.8, '#fff8ee', null, { lw: 2, hl: false }));
    A.shape(ctx, (c) => { c.moveTo(hx - 14, y); c.lineTo(hx - 14, y - 36); c.quadraticCurveTo(hx, y - 50, hx + 14, y - 36); c.lineTo(hx + 14, y); c.closePath(); }, '#9a6a42', '#7a5033', { shadeY: y - 12, lw: 2.5 });
    A.ellipse(ctx, hx + 26, y - 50, 9, 9, '#ffe8a0', null, { lw: 2.5, hl: false });
    // 煙囪的煙
    for (let k = 0; k < 3; k++) {
      const ph = ((t * 0.4 + k / 3) % 1);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - ph)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(hx + 30 + Math.sin(ph * 6) * 6, y - 150 - ph * 60, 6 + ph * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // 小燈串
    ctx.strokeStyle = A.c('#5a3a22');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx + 34, y - 150);
    ctx.quadraticCurveTo(mid, y - 110, hx - 40, y - 120);
    ctx.stroke();
    for (let k = 1; k < 10; k++) {
      const u = k / 10;
      const lx = (1 - u) * (1 - u) * (tx + 34) + 2 * (1 - u) * u * mid + u * u * (hx - 40);
      const ly = (1 - u) * (1 - u) * (y - 150) + 2 * (1 - u) * u * (y - 110) + u * u * (y - 120);
      const on = 0.6 + Math.sin(t * 3 + k) * 0.4;
      const g = ctx.createRadialGradient(lx, ly + 5, 0, lx, ly + 5, 12);
      g.addColorStop(0, 'rgba(255,220,120,' + (0.6 * on).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly + 5, 12, 0, Math.PI * 2);
      ctx.fill();
      A.ellipse(ctx, lx, ly + 5, 3, 4, ['#ffd35a', '#ff9fc4', '#8fd3f4'][k % 3], null, { lw: 1.2, hl: false });
    }
    // 營地招牌
    const sx = mid - 150;
    ctx.fillStyle = A.c('#6b4428');
    ctx.fillRect(sx - 3, y - 60, 6, 60);
    A.shape(ctx, (c) => A.roundRect(c, sx - 46, y - 84, 92, 30, 6), '#c8905a', '#a8703c', { cel: [2, 2] });
    ctx.font = 'bold 16px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = A.c('#4a2e1f');
    ctx.fillText('苔光營地', sx, y - 68);
  };

  A.drawSign = function (ctx, x, y) {
    ctx.fillStyle = A.c('#6b4428');
    ctx.fillRect(x - 2.5, y - 34, 5, 34);
    A.shape(ctx, (c) => { c.moveTo(x - 18, y - 48); c.lineTo(x + 14, y - 48); c.lineTo(x + 22, y - 39); c.lineTo(x + 14, y - 30); c.lineTo(x - 18, y - 30); c.closePath(); }, '#c8905a', '#a8703c', { cel: [2, 2], lw: 2.2 });
    ctx.strokeStyle = A.c('#6b4428');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 42);
    ctx.lineTo(x + 10, y - 42);
    ctx.moveTo(x - 12, y - 36);
    ctx.lineTo(x + 4, y - 36);
    ctx.stroke();
  };

  // 彈跳菇：被踩時壓扁
  A.drawSpring = function (ctx, x, y, squash, t) {
    const sq = Math.max(0, squash);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + sq * 0.25, 1 - sq * 0.35);
    A.shape(ctx, (c) => A.roundRect(c, -8, -20, 16, 20, 6), '#fff0d6', '#e8cfa6', { cel: [3, 2] });
    A.shape(ctx, (c) => { c.moveTo(-30, -18); c.bezierCurveTo(-30, -48, 30, -48, 30, -18); c.quadraticCurveTo(0, -12, -30, -18); c.closePath(); }, '#e8483a', '#b8302a', { cel: [4, 4] });
    [[-14, -30, 5], [8, -36, 6], [20, -24, 4]].forEach(([dx, dy, r]) => A.ellipse(ctx, dx, dy, r, r * 0.8, '#fff8ee', null, { lw: 1.8, hl: false }));
    ctx.restore();
    // 往上的小箭頭，提示可以彈
    ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3;
    ctx.fillStyle = '#fff6c0';
    ctx.beginPath();
    ctx.moveTo(x, y - 70 - Math.sin(t * 4) * 4);
    ctx.lineTo(x - 7, y - 60 - Math.sin(t * 4) * 4);
    ctx.lineTo(x + 7, y - 60 - Math.sin(t * 4) * 4);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // 小生物：蝴蝶與螢火蟲
  A.drawCritter = function (ctx, c, t) {
    if (c.kind === 'firefly') {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 10);
      g.addColorStop(0, 'rgba(210,255,140,' + (0.7 + Math.sin(t * 5 + c.seed) * 0.3).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(210,255,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const flap = Math.abs(Math.sin(t * (c.flee ? 30 : 14) + c.seed));
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = A.c(c.color);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.2;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(s * 4 * flap, -2, 5 * flap + 1, 4, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = A.outline();
    ctx.fillRect(-0.8, -4, 1.6, 7);
    ctx.restore();
  };

  // 龜爺爺：坐著的老烏龜，白眉白鬍子，背著長青苔的殼
  function turtle(ctx, t) {
    const bob = Math.sin(t * 1.2) * 0.8;
    A.ellipse(ctx, -16, -2, 8, 4, '#8fbf6a', null, { lw: 2, hl: false });
    A.ellipse(ctx, 12, -2, 8, 4, '#8fbf6a', null, { lw: 2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(-30, -6); c.quadraticCurveTo(-30, -44 + bob, 0, -46 + bob); c.quadraticCurveTo(26, -44 + bob, 24, -6); c.closePath(); }, '#6a8f4a', '#4e6e34', { cel: [4, 3] });
    ctx.strokeStyle = A.c('#3e5a28');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-14, -8); ctx.lineTo(-10, -26 + bob); ctx.lineTo(4, -30 + bob); ctx.lineTo(10, -10);
    ctx.moveTo(-10, -26 + bob); ctx.lineTo(-22, -24 + bob);
    ctx.moveTo(4, -30 + bob); ctx.lineTo(14, -24 + bob);
    ctx.stroke();
    A.ellipse(ctx, -8, -40 + bob, 7, 3, '#8fcf5a', null, { noStroke: true, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, -30, -10, 56, 8, 4), '#d8c48a', '#b8a46a', { lw: 2, hl: false });
    // 頭
    A.ellipse(ctx, 26, -30 + bob, 12, 11, '#9fcf7a', '#7aaa5a', { cel: [2, 2] });
    A.shape(ctx, (c) => { c.moveTo(22, -22 + bob); c.quadraticCurveTo(28, -8 + bob, 34, -22 + bob); c.closePath(); }, '#ffffff', '#dcdcdc', { lw: 1.8, hl: false });
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, -38 + bob); ctx.lineTo(30, -37 + bob);
    ctx.stroke();
    A.eye(ctx, 28, -32 + bob, 2.2, 1.2, Math.sin(t * 0.6) > 0.9 ? 'closed' : 'normal', 1);
    A.blush(ctx, 32, -27 + bob, 2.5);
  }

  // 小栗：刺蝟婆婆的孫子，頭上戴著橡實帽，一直蹦蹦跳跳
  function hedgekid(ctx, t) {
    const bob = -Math.abs(Math.sin(t * 4)) * 5;
    A.shape(ctx, (c) => {
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * 0.6 + (i / 12) * Math.PI * 1.4;
        const r = i % 2 ? 15 : 21;
        const x = -3 + Math.cos(a) * r;
        const y = -18 + bob + Math.sin(a) * r * 0.9;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
    }, '#8a6a52', '#6a4e3c', { shadeY: -12 + bob });
    A.ellipse(ctx, 3, -15 + bob, 13, 14, '#f0d4b0', '#dcb890', { cel: [2, 2] });
    A.shape(ctx, (c) => { c.moveTo(-8, -26 + bob); c.quadraticCurveTo(2, -40 + bob, 12, -26 + bob); c.closePath(); }, '#8a5a30', '#6a4220', { lw: 2, hl: false });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(2, -33 + bob); ctx.lineTo(4, -38 + bob); ctx.stroke();
    A.eye(ctx, 6, -19 + bob, 2.4, 2.8, 'normal', 1);
    A.eye(ctx, 12, -19 + bob, 2.2, 2.6, 'normal', 1);
    ctx.fillStyle = A.c('#3a2418');
    ctx.beginPath(); ctx.arc(16, -15 + bob, 2, 0, Math.PI * 2); ctx.fill();
    A.blush(ctx, 8, -13 + bob, 2.2);
    A.ellipse(ctx, -2, -1, 4, 2.4, '#f0d4b0', null, { lw: 2, hl: false });
    A.ellipse(ctx, 8, -1, 4, 2.4, '#f0d4b0', null, { lw: 2, hl: false });
  }

  // 菇菇：服侍女王的小蘑菇侍女，粉紅傘蓋、胸前別著一朵花
  function mushgirl(ctx, t) {
    const sway = Math.sin(t * 2) * 0.05;
    ctx.save();
    ctx.rotate(sway);
    A.ellipse(ctx, 0, -12, 11, 13, '#fff4e4', '#e8d8c0', { cel: [2, 2] });
    A.shape(ctx, (c) => { c.moveTo(-22, -24); c.quadraticCurveTo(-22, -52, 0, -52); c.quadraticCurveTo(22, -52, 22, -24); c.quadraticCurveTo(0, -18, -22, -24); c.closePath(); }, '#ff9fc4', '#e27aa2', { cel: [3, 3] });
    A.ellipse(ctx, -9, -40, 4, 3, '#fff6fa', null, { noStroke: true, hl: false });
    A.ellipse(ctx, 8, -44, 3, 2.4, '#fff6fa', null, { noStroke: true, hl: false });
    A.ellipse(ctx, 12, -33, 2.6, 2, '#fff6fa', null, { noStroke: true, hl: false });
    const blink = Math.sin(t * 0.8) > 0.96;
    A.eye(ctx, -4, -14, 2.6, 3.4, blink ? 'closed' : 'normal', 1);
    A.eye(ctx, 5, -14, 2.6, 3.4, blink ? 'closed' : 'normal', 1);
    A.blush(ctx, -7, -9, 2.4);
    A.blush(ctx, 8, -9, 2.4);
    for (let i = 0; i < 5; i++) A.ellipse(ctx, -6 + Math.cos(i * 1.256) * 3, -2 + Math.sin(i * 1.256) * 3, 2.2, 2.2, '#ffe14a', null, { lw: 1.2, hl: false });
    A.ellipse(ctx, -6, -2, 1.6, 1.6, '#ff8a3a', null, { noStroke: true, hl: false });
    ctx.restore();
  }

  const NPC_DRAW = { owl, hedgehog, squirrel, frog, fawn, mole, turtle, hedgekid, mushgirl };

  A.drawNpc = function (ctx, npc, t, marker, noTag) {
    ctx.save();
    ctx.translate(npc.x, npc.y);
    A.groundShadow(ctx, 0, 0, 24);
    const fn = NPC_DRAW[npc.def.art];
    if (fn) fn(ctx, t);
    ctx.restore();
    if (!noTag) A.nameTag(ctx, npc.x, npc.y + 14, npc.def.name, '#ffe9a8');
    if (marker) {
      const y = npc.y - 92 + Math.sin(t * 4) * 4;
      ctx.font = 'bold 30px ' + A.NUMFONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#4a2e1f';
      ctx.strokeText(marker, npc.x, y);
      ctx.fillStyle = marker === '?' ? '#7dff7a' : '#ffd84a';
      ctx.fillText(marker, npc.x, y);
    }
  };

  A.drawChest = function (ctx, ch, t) {
    ctx.save();
    ctx.translate(ch.x, ch.y);
    A.groundShadow(ctx, 0, 0, 22);
    if (!ch.opened) {
      const g = 0.25 + Math.sin(t * 3) * 0.1;
      const gr = ctx.createRadialGradient(0, -16, 2, 0, -16, 40);
      gr.addColorStop(0, 'rgba(255,230,120,' + g.toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, -16, 40, 0, Math.PI * 2);
      ctx.fill();
    }
    A.shape(ctx, (c) => A.roundRect(c, -20, -22, 40, 22, 4), '#a8703c', '#86552a', { shadeY: -8 });
    if (ch.opened) {
      A.shape(ctx, (c) => A.roundRect(c, -20, -40, 40, 10, 4), '#b8803f', '#96622e', { shadeY: -34 });
    } else {
      A.shape(ctx, (c) => { c.moveTo(-20, -22); c.lineTo(-20, -30); c.quadraticCurveTo(0, -42, 20, -30); c.lineTo(20, -22); c.closePath(); }, '#b8803f', '#96622e', { shadeY: -26 });
      A.shape(ctx, (c) => A.roundRect(c, -5, -28, 10, 10, 2), '#ffd35a', '#e0a82a', { shadeY: -22, lw: 2 });
    }
    ctx.restore();
  };

  A.drawPortal = function (ctx, x, y, t, label) {
    ctx.save();
    ctx.translate(x, y);
    // 光柱
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(0, -190, 0, 0);
    beam.addColorStop(0, 'rgba(140,220,255,0)');
    beam.addColorStop(1, 'rgba(160,230,255,' + (0.35 + Math.sin(t * 3) * 0.1).toFixed(3) + ')');
    ctx.fillStyle = beam;
    ctx.fillRect(-34, -190, 68, 190);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-8, -190, 16, 190);
    // 往上飄的光點
    for (let i = 0; i < 10; i++) {
      const k = (t * 0.6 + i / 10) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = i % 2 ? '#c9f0ff' : '#e8d4ff';
      ctx.beginPath();
      ctx.arc(Math.sin(i * 2.3 + t * 2) * 22, -k * 170, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // 地面光圈
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'rgba(150,220,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 40 + Math.sin(t * 4) * 3, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.scale(1.35, 1.35);
    for (let i = 0; i < 4; i++) {
      const k = ((t * 0.8 + i / 4) % 1);
      ctx.globalAlpha = 0.65 * (1 - k);
      ctx.strokeStyle = i % 2 ? '#9fe8ff' : '#c9a7ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, -48, 22 + k * 10, 46 - k * 30, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.5;
    const g = ctx.createRadialGradient(0, -48, 2, 0, -48, 40);
    g.addColorStop(0, 'rgba(210,245,255,0.9)');
    g.addColorStop(1, 'rgba(150,200,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -48, 26, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    // 上下彈跳的箭頭與目的地
    const ay = y - 150 + Math.sin(t * 4) * 6;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2a4a7a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, ay - 12);
    ctx.lineTo(x - 11, ay + 2);
    ctx.lineTo(x - 4, ay + 2);
    ctx.lineTo(x - 4, ay + 12);
    ctx.lineTo(x + 4, ay + 12);
    ctx.lineTo(x + 4, ay + 2);
    ctx.lineTo(x + 11, ay + 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    if (label) A.nameTag(ctx, x, y + 16, '→ ' + label, '#bfe8ff');
  };

  A.drawProjectile = function (ctx, p, t) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.kind === 'spore') {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
      g.addColorStop(0, 'rgba(240,255,170,1)');
      g.addColorStop(1, 'rgba(160,220,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      A.ellipse(ctx, 0, 0, 6, 6, '#d8f07a', null, { lw: 2, hl: false });
    } else if (p.kind === 'petal') {
      ctx.rotate(t * 12 + p.seed);
      A.ellipse(ctx, 0, 0, 8, 4.5, '#ff9fc4', '#e27aa2', { lw: 2, hl: false });
    } else if (p.kind === 'wave') {
      const h = p.h;
      const g = ctx.createLinearGradient(0, -h, 0, 0);
      g.addColorStop(0, 'rgba(255,220,160,0)');
      g.addColorStop(1, 'rgba(255,180,90,0.9)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-26 * p.dir, 0);
      ctx.quadraticCurveTo(0, -h * 1.3, 26 * p.dir, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,80,40,0.8)';
      for (let i = 0; i < 4; i++) ctx.fillRect(-14 + i * 8 + Math.sin(t * 30 + i) * 3, -6 - (i % 2) * 6, 5, 5);
    } else if (p.kind === 'spirit') {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
      g.addColorStop(0, 'rgba(230,255,252,1)');
      g.addColorStop(0.4, 'rgba(120,230,220,0.8)');
      g.addColorStop(1, 'rgba(95,208,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.scale(p.dir, 1);
      A.shape(ctx, (c) => { c.moveTo(9, 0); c.quadraticCurveTo(0, -9, -14, -2 + Math.sin(t * 20) * 2); c.quadraticCurveTo(0, 9, 9, 0); c.closePath(); }, '#8ff0e8', '#5fd0c8', { lw: 2, hl: false });
    } else if (p.kind === 'feather') {
      ctx.scale(p.dir, 1);
      ctx.rotate(Math.sin(t * 30 + p.seed) * 0.08);
      A.shape(ctx, (c) => { c.moveTo(12, 0); c.quadraticCurveTo(0, -6, -12, -1); c.quadraticCurveTo(0, 5, 12, 0); c.closePath(); }, '#d8ff9a', '#a8d04a', { lw: 2, hl: false });
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-34, 0);
      ctx.stroke();
    } else if (p.kind === 'sporeBomb') {
      A.ellipse(ctx, 0, 0, 10, 10, '#c9a0e8', '#9a70c0', { lw: 2.2 });
    }
    ctx.restore();
  };

  A.drawZone = function (ctx, z, t) {
    ctx.save();
    const fade = Math.min(1, z.life - z.t, z.t * 4);
    ctx.globalAlpha = Math.max(0, fade) * 0.75;
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + i;
      const x = z.x + Math.cos(a) * z.r * 0.5;
      const y = z.y - 30 + Math.sin(a * 1.3) * 16;
      const g = ctx.createRadialGradient(x, y, 2, x, y, z.r * 0.6);
      g.addColorStop(0, 'rgba(200,150,240,0.7)');
      g.addColorStop(1, 'rgba(200,150,240,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, z.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
})();
