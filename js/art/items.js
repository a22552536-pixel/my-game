// 道具與技能圖示。同一套函式同時畫在世界裡（掉落物）和介面上（轉成圖片網址）。
(function () {
  'use strict';
  const A = G.art;

  const ICON = {
    claw(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -12, -6, 24, 18, 7), '#c98a4a', '#a56c34', { shadeY: 4 });
      for (let i = -1; i <= 1; i++) {
        A.shape(ctx, (c) => { c.moveTo(i * 7 - 3, -6); c.quadraticCurveTo(i * 8, -20, i * 9 + 4, -18); c.quadraticCurveTo(i * 7 + 3, -10, i * 7 + 3, -6); c.closePath(); }, '#f2f2f2', '#c8c8c8', { shadeY: -10, lw: 2 });
      }
      A.shape(ctx, (c) => A.roundRect(c, -13, 6, 26, 7, 3), '#8a5a34', null, { lw: 2 });
    },
    mane(ctx) {
      ctx.lineWidth = 7;
      ctx.strokeStyle = A.outline();
      ctx.beginPath();
      ctx.arc(0, 4, 13, Math.PI * 1.02, Math.PI * 1.98);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = A.c('#6aa84f');
      ctx.stroke();
      A.ellipse(ctx, -9, -8, 6, 4, '#ff8fb1', null, { rot: -0.6, lw: 2, hl: false });
      A.ellipse(ctx, 2, -12, 6, 4, '#ffd84a', null, { rot: 0, lw: 2, hl: false });
      A.ellipse(ctx, 11, -7, 6, 4, '#8fd3f4', null, { rot: 0.6, lw: 2, hl: false });
    },
    charm(ctx) {
      ctx.strokeStyle = A.c('#8a6a3a');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -16);
      ctx.quadraticCurveTo(0, -4, 10, -16);
      ctx.stroke();
      A.ellipse(ctx, 0, 4, 11, 12, '#c98a4a', '#a56c34');
      A.ellipse(ctx, 0, 4, 5, 5, '#8fe0c0', null, { lw: 2 });
    },
    hpPot(ctx) {
      A.ellipse(ctx, -5, 3, 9, 9, '#e8433a', '#b8302a', { hl: [-8, -1, 3, 2] });
      A.ellipse(ctx, 6, 5, 8, 8, '#e8433a', '#b8302a', { hl: [3, 1, 3, 2] });
      A.ellipse(ctx, 1, -10, 7, 3.5, '#6fbf4a', null, { rot: -0.4, lw: 2, hl: false });
    },
    mpPot(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-4, -14); c.lineTo(4, -14); c.lineTo(4, -6); c.quadraticCurveTo(13, -2, 12, 7); c.quadraticCurveTo(10, 14, 0, 14); c.quadraticCurveTo(-10, 14, -12, 7); c.quadraticCurveTo(-13, -2, -4, -6); c.closePath(); }, '#4b8cf0', '#2f68c8', { shadeY: 4, hl: [-5, -1, 3, 4] });
      A.shape(ctx, (c) => A.roundRect(c, -5, -18, 10, 5, 2), '#b5824a', null, { lw: 2 });
    },
    gold(ctx) {
      ctx.save();
      ctx.rotate(-0.3);
      A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, 13), '#ffcf3a', '#e0a020', { shadeY: 3, hl: [-4, -5, 3, 2] });
      ctx.restore();
    },
    spore(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-10, -4); c.quadraticCurveTo(-14, 14, 0, 14); c.quadraticCurveTo(14, 14, 10, -4); c.closePath(); }, '#e0c9a0', '#c4a878', { shadeY: 6 });
      A.shape(ctx, (c) => A.roundRect(c, -8, -10, 16, 7, 3), '#f28c38', null, { lw: 2 });
      ctx.fillStyle = A.c('#ffd59a');
      ctx.beginPath();
      ctx.arc(-3, 4, 2, 0, Math.PI * 2);
      ctx.arc(4, 7, 1.6, 0, Math.PI * 2);
      ctx.fill();
    },
    moss(ctx) {
      A.shape(ctx, (c) => {
        c.moveTo(-12, 6);
        for (let i = 0; i <= 5; i++) c.quadraticCurveTo(-12 + i * 5 - 2, -10 + (i % 2) * 4, -12 + i * 5 + 2.5, -4 - (i % 2) * 2);
        c.lineTo(12, 6);
        c.closePath();
      }, '#79b04a', '#5c8a36', { cel: [2, 2], lw: 2 });
    },
    seedshell(ctx) {
      A.shape(ctx, (c) => c.ellipse(0, 2, 11, 9, 0, 0, Math.PI), '#b8804a', '#8e5e30', { cel: [2, 2], lw: 2 });
      A.shape(ctx, (c) => c.ellipse(0, 2, 11, 3, 0, 0, Math.PI * 2), '#e3c08a', null, { lw: 2, hl: false });
    },
    wick(ctx) {
      const g = ctx.createRadialGradient(0, -2, 1, 0, -2, 16);
      g.addColorStop(0, 'rgba(240,255,160,0.9)');
      g.addColorStop(1, 'rgba(200,255,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -2, 16, 0, Math.PI * 2);
      ctx.fill();
      A.shape(ctx, (c) => A.roundRect(c, -3, -8, 6, 18, 3), '#f4f0d0', '#d8d0a0', { cel: [1.5, 1.5], lw: 2 });
      A.ellipse(ctx, 0, -11, 3.5, 4.5, '#e8ff8a', null, { lw: 1.6, hl: false });
    },
    petal(ctx) {
      A.shape(ctx, (c) => {
        c.moveTo(0, 12);
        c.bezierCurveTo(-14, 2, -8, -14, 0, -8);
        c.bezierCurveTo(8, -14, 14, 2, 0, 12);
        c.closePath();
      }, '#ff9fc4', '#e27aa2', { cel: [2, 2], lw: 2 });
    },
    starleaf(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      g.addColorStop(0, 'rgba(255,250,200,0.9)');
      g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, 14), '#ffe066', '#ffb62e', { shadeY: 4, hl: [-4, -6, 4, 2] });
    },
    pounce(ctx) {
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-16, -8 + i * 8);
        ctx.lineTo(-4, -8 + i * 8);
        ctx.stroke();
      }
      A.ellipse(ctx, 6, 0, 10, 9, '#f7b547', '#e0913a');
      ctx.strokeStyle = A.c('#fff6e6');
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(13, i * 4);
        ctx.lineTo(19, i * 5);
        ctx.stroke();
      }
    },
    roar(ctx) {
      A.ellipse(ctx, -8, 0, 9, 9, '#f7b547', '#e0913a');
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.ellipse(-2, 3, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = A.c('#ffe9a8');
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-2, 0, 8 + i * 6, -0.7, 0.7);
        ctx.stroke();
      }
    },
  };

  A.drawIcon = function (ctx, kind, x, y, scale) {
    const fn = ICON[kind];
    if (!fn) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale || 1, scale || 1);
    fn(ctx);
    ctx.restore();
  };

  const cache = {};
  A.iconURL = function (kind) {
    if (cache[kind]) return cache[kind];
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    A.drawIcon(ctx, kind, 24, 26, 1.3);
    cache[kind] = c.toDataURL();
    return cache[kind];
  };

  // 裝備欄位對應圖示
  A.itemIcon = function (item) {
    if (!item) return null;
    if (item.slot) return item.slot;
    return item.icon || null;
  };
})();
