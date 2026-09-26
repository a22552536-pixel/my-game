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

  const NPC_DRAW = { owl, hedgehog, squirrel };

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

  A.drawPortal = function (ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
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
