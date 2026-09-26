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
    hpPotL(ctx) {
      A.ellipse(ctx, -7, 4, 8, 8, '#e8433a', '#b8302a', { hl: [-10, 0, 3, 2] });
      A.ellipse(ctx, 7, 5, 8, 8, '#e8433a', '#b8302a', { hl: [4, 1, 3, 2] });
      A.ellipse(ctx, 0, -5, 8.5, 8.5, '#f0503f', '#c0352c', { hl: [-3, -9, 3, 2] });
      A.ellipse(ctx, 2, -15, 7, 3.5, '#6fbf4a', null, { rot: -0.4, lw: 2, hl: false });
    },
    mpPotL(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-5, -15); c.lineTo(5, -15); c.lineTo(5, -8); c.quadraticCurveTo(15, -3, 14, 7); c.quadraticCurveTo(12, 15, 0, 15); c.quadraticCurveTo(-12, 15, -14, 7); c.quadraticCurveTo(-15, -3, -5, -8); c.closePath(); }, '#7a5af0', '#5a3ac8', { shadeY: 5, hl: [-6, -1, 3, 4] });
      A.shape(ctx, (c) => A.roundRect(c, -6, -19, 12, 5, 2), '#ffd35a', null, { lw: 2 });
    },
    acorn(ctx) {
      A.ellipse(ctx, 0, 4, 9, 10, '#c8803a', '#9a5a24', { cel: [2, 2] });
      A.shape(ctx, (c) => { c.moveTo(-11, -2); c.quadraticCurveTo(0, -14, 11, -2); c.quadraticCurveTo(0, 2, -11, -2); c.closePath(); }, '#7a5a34', '#5a3e22', { lw: 2, hl: false });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(2, -13);
      ctx.stroke();
      A.ellipse(ctx, 0, 5, 3, 3, '#ff6a3a', null, { noStroke: true, hl: false });
    },
    nut(ctx) {
      A.ellipse(ctx, 0, 1, 12, 10, '#b8905a', '#8a6a3a', { cel: [2, 2] });
      ctx.strokeStyle = A.c('#6a4a2a');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-8, -3);
      ctx.quadraticCurveTo(0, 4, 8, -3);
      ctx.moveTo(-6, 5);
      ctx.quadraticCurveTo(0, 9, 6, 5);
      ctx.stroke();
      A.ellipse(ctx, 0, 1, 4, 4, '#6ab0ff', null, { noStroke: true, hl: false });
    },
    feather(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-10, 12); c.quadraticCurveTo(-8, -6, 10, -14); c.quadraticCurveTo(4, 2, -10, 12); c.closePath(); }, '#fffbe8', '#e0d4b0', { cel: [1.5, 1.5], lw: 2, hl: false });
      ctx.strokeStyle = A.c('#b8a070');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-12, 14);
      ctx.quadraticCurveTo(-2, 0, 8, -12);
      ctx.stroke();
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
    dew(ctx) {
      A.shape(ctx, (c) => {
        c.moveTo(0, -13);
        c.bezierCurveTo(4, -6, 10, 0, 10, 5);
        c.arc(0, 5, 10, 0, Math.PI);
        c.bezierCurveTo(-10, 0, -4, -6, 0, -13);
        c.closePath();
      }, '#8fd8ff', '#5ab0e8', { cel: [2, 2], lw: 2, hl: [-4, 1, 2.5, 3.5] });
    },
    cap(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-13, 6); c.quadraticCurveTo(-12, -12, 0, -12); c.quadraticCurveTo(12, -12, 13, 6); c.quadraticCurveTo(0, 2, -13, 6); c.closePath(); }, '#e84a3a', '#b83228', { cel: [2, 2], lw: 2 });
      A.ellipse(ctx, -5, -5, 3, 2.5, '#fff6e8', null, { noStroke: true, hl: false });
      A.ellipse(ctx, 5, -3, 2.5, 2, '#fff6e8', null, { noStroke: true, hl: false });
      A.ellipse(ctx, 1, -9, 2, 1.6, '#fff6e8', null, { noStroke: true, hl: false });
    },
    vine(ctx) {
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(-10, 12);
        ctx.quadraticCurveTo(-8, -4, 4, -6);
        ctx.arc(4, -1, 5, -Math.PI / 2, Math.PI * 1.1);
      };
      ctx.lineCap = 'round';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 6;
      path();
      ctx.stroke();
      ctx.strokeStyle = A.c('#7cc04a');
      ctx.lineWidth = 3;
      path();
      ctx.stroke();
      A.ellipse(ctx, -6, 4, 5, 2.6, '#9ad85a', '#6ea83a', { rot: -0.7, lw: 1.6, hl: false });
    },
    bark(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-12, -8); c.lineTo(6, -12); c.lineTo(13, 2); c.lineTo(4, 12); c.lineTo(-10, 8); c.closePath(); }, '#9a6a3e', '#744c28', { cel: [2, 2], lw: 2 });
      ctx.strokeStyle = A.c('#5a3a1e');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-7, -5);
      ctx.quadraticCurveTo(0, -2, 7, -7);
      ctx.moveTo(-6, 3);
      ctx.quadraticCurveTo(1, 6, 8, 1);
      ctx.stroke();
      A.ellipse(ctx, 6, -6, 3, 2, '#79b04a', null, { lw: 1.4, hl: false });
    },
    queencap(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      g.addColorStop(0, 'rgba(255,190,230,0.8)');
      g.addColorStop(1, 'rgba(255,160,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-12, 8); c.lineTo(-12, -4); c.lineTo(-6, 2); c.lineTo(0, -10); c.lineTo(6, 2); c.lineTo(12, -4); c.lineTo(12, 8); c.closePath(); }, '#ff8fcf', '#d860a8', { cel: [2, 2], lw: 2 });
      A.ellipse(ctx, 0, 3, 2.5, 2.5, '#ffe14a', null, { lw: 1.4, hl: false });
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
    heavyClaw(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-10, 8); c.lineTo(-12, -4); c.lineTo(-2, -12); c.lineTo(10, -8); c.lineTo(12, 4); c.lineTo(2, 12); c.closePath(); }, '#9a7b5a', '#6e5236', { cel: [2, 2], lw: 2 });
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-6 + i * 5, -10);
        ctx.lineTo(4 + i * 5, 10);
        ctx.stroke();
      }
    },
    maneSweep(ctx) {
      ctx.strokeStyle = A.c('#fff0d0');
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-4, 2, 14, -1.3, 1.3);
      ctx.stroke();
      A.ellipse(ctx, -6, 0, 7, 7, '#9a7b5a', '#6e5236', { cel: [1.5, 1.5], lw: 2, hl: false });
    },
    rockSkin(ctx) {
      A.shape(ctx, (c) => { c.moveTo(0, -13); c.lineTo(11, -7); c.lineTo(10, 6); c.lineTo(0, 13); c.lineTo(-10, 6); c.lineTo(-11, -7); c.closePath(); }, '#9a7b5a', '#6e5236', { cel: [2, 2], lw: 2 });
      A.shape(ctx, (c) => { c.moveTo(0, -7); c.lineTo(6, -3); c.lineTo(5, 4); c.lineTo(0, 7); c.lineTo(-5, 4); c.lineTo(-6, -3); c.closePath(); }, '#c8aa80', null, { lw: 1.5, hl: false });
    },
    spiritBolt(ctx) {
      A.shape(ctx, (c) => { c.moveTo(12, 0); c.quadraticCurveTo(0, -10, -14, -2); c.quadraticCurveTo(0, 10, 12, 0); c.closePath(); }, '#8ff0e8', '#5fd0c8', { cel: [1.5, 1.5], lw: 2 });
      A.ellipse(ctx, 4, 0, 4, 3, '#ffffff', null, { noStroke: true, hl: false });
    },
    spiritClaw(ctx) {
      ctx.strokeStyle = A.c('#5fd0c8');
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-10 + i * 6, -12);
        ctx.quadraticCurveTo(-2 + i * 6, 0, -8 + i * 6, 12);
        ctx.stroke();
      }
      ctx.strokeStyle = A.c('#e8fffc');
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },
    manaShield(ctx) {
      A.shape(ctx, (c) => { c.moveTo(0, -13); c.quadraticCurveTo(12, -10, 11, 0); c.quadraticCurveTo(9, 10, 0, 14); c.quadraticCurveTo(-9, 10, -11, 0); c.quadraticCurveTo(-12, -10, 0, -13); c.closePath(); }, '#6ab0ff', '#3a80d8', { cel: [2, 2], lw: 2 });
      A.ellipse(ctx, 0, 0, 4, 4, '#e8fffc', null, { lw: 1.5, hl: false });
    },
    doubleClaw(ctx) {
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      [[-4, -1], [5, 1]].forEach(([dx, s]) => {
        ctx.beginPath();
        ctx.arc(dx, 0, 11, -1.1 * s, 1.1 * s, s < 0);
        ctx.stroke();
      });
      A.ellipse(ctx, 0, 0, 5, 5, '#a8d04a', '#78a030', { lw: 2, hl: false });
    },
    featherThrow(ctx) {
      [-5, 5].forEach((dy) => A.shape(ctx, (c) => { c.moveTo(12, dy); c.quadraticCurveTo(0, dy - 6, -12, dy - 1); c.quadraticCurveTo(0, dy + 5, 12, dy); c.closePath(); }, '#d8ff9a', '#a8d04a', { lw: 2, hl: false }));
    },
    galeStep(ctx) {
      ctx.strokeStyle = A.c('#a8d04a');
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      [[-12, -6, 10], [-8, 1, 14], [-12, 8, 8]].forEach(([x, y, l]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + l * 0.6, y - 4, x + l, y);
        ctx.stroke();
      });
      A.ellipse(ctx, 8, 0, 5, 5, '#f2c24a', '#d49e2e', { lw: 2, hl: false });
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

  // 其他檔案可以往 A.ICON 裡加新的圖示
  A.ICON = ICON;
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
  A.iconURL = function (kind, tint) {
    const key = kind + (tint || '');
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    if (tint) {
      A.mode = 'tint';
      A.modeColor = tint;
      A.modeAmt = 0.45;
    }
    A.drawIcon(ctx, kind, 24, 26, 1.3);
    A.mode = null;
    cache[key] = c.toDataURL();
    return cache[key];
  };

  // 裝備欄位對應圖示
  A.itemIcon = function (item) {
    if (!item) return null;
    if (item.slot) return item.slot;
    return item.icon || null;
  };
})();
