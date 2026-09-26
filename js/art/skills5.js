// 五轉技能圖示：冥道殘月破、地爆天星。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;

  function glow(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  Object.assign(A.ICON, {
    // 黑色的殘月，外緣發著紫白光，後面是張開的冥道
    meidou(ctx) {
      glow(ctx, 2, 0, 19, '160,120,255', 0.55);
      A.shape(ctx, (c) => c.arc(4, 0, 11, 0, TAU), '#0a0612', null, { lw: 2, hl: false });
      ctx.strokeStyle = A.c('#c8b0ff');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(4, 0, 11, 0, TAU);
      ctx.stroke();
      A.shape(ctx, (c) => {
        c.arc(-2, 0, 15, -Math.PI / 2, Math.PI / 2);
        c.arc(-8, 0, 13.8, Math.PI / 2, -Math.PI / 2, true);
        c.closePath();
      }, '#140a24', null, { lw: 2, hl: false });
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-2, 0, 15, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = A.c('#ffffff');
      [[5, -4], [8, 3], [2, 5], [6, -8]].forEach(([x, y]) => ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6));
    },
    // 石球＋紅黑色的閃電
    chibaku(ctx) {
      glow(ctx, 0, 0, 19, '255,50,70', 0.4);
      A.shape(ctx, (c) => c.arc(0, 1, 12, 0, TAU), '#7a6a58', '#4e4034', { lw: 2, hl: false });
      [[-6, -5], [5, -6], [-7, 5], [6, 5], [0, 8], [0, -9]].forEach(([x, y]) => A.shape(ctx, (c) => c.arc(x, y + 1, 3.2, 0, TAU), '#9a8468', null, { lw: 1.2, hl: false }));
      const bolt = (pts, w) => {
        ctx.lineJoin = 'round';
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.strokeStyle = A.c('#ff2a3a');
        ctx.lineWidth = w + 2.5;
        ctx.stroke();
        ctx.strokeStyle = A.c('#14000a');
        ctx.lineWidth = w;
        ctx.stroke();
      };
      bolt([[-2, 0], [-8, -6], [-7, -11], [-14, -16]], 2.2);
      bolt([[1, 1], [8, -3], [11, 2], [17, 0]], 2.2);
      bolt([[0, 2], [-3, 10], [2, 13], [-1, 18]], 2);
    },
  });
})();
