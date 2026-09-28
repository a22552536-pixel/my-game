// 繪圖共用工具：深棕描邊、兩階陰影、Q 版眼睛。
// 所有顏色都經過 A.c()，這樣受擊閃白與閃光怪可以統一處理。
(function () {
  'use strict';
  const U = G.util;

  const A = G.art;
  A.FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif';
  A.NUMFONT = '"Arial Black", "Arial Rounded MT Bold", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  A.OUT = '#4a2e1f';
  A.LW = 3;

  // 目前的顏色模式：null / 'flash' / 'shiny' / 'dark'
  A.mode = null;
  A.modeAmt = 0;

  A.c = function (col) {
    if (!A.mode) return col;
    if (A.mode === 'flash') return U.mix(col, '#ffffff', A.modeAmt);
    if (A.mode === 'shiny') return U.mix(col, '#ffd24a', 0.55);
    if (A.mode === 'dark') return U.mix(col, '#1d1330', A.modeAmt);
    if (A.mode === 'tint') return U.mix(col, A.modeColor, A.modeAmt || 0.7);
    return col;
  };
  A.outline = function () {
    if (A.mode === 'flash') return U.mix(A.OUT, '#ffffff', A.modeAmt * 0.6);
    if (A.mode === 'shiny') return '#7a4a00';
    if (A.mode === 'tint') return U.mix(A.OUT, A.modeColor, 0.5);
    return A.OUT;
  };

  // 畫一個形狀：填色 → 下半部陰影 → 高光 → 描邊
  A.shape = function (ctx, path, fill, shade, opts) {
    opts = opts || {};
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(fill);
    ctx.fill();
    if (shade && opts.cel) {
      // 寶可夢式月牙陰影：整片塗陰影色，再把往左上偏移的本體蓋回去，右下留下一道硬邊陰影
      ctx.save();
      ctx.clip();
      ctx.fillStyle = A.c(shade);
      ctx.fillRect(-500, -500, 1000, 1000);
      ctx.translate(-opts.cel[0], -opts.cel[1]);
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(fill);
      ctx.fill();
      ctx.restore();
    } else if (shade) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = A.c(shade);
      const sy = opts.shadeY != null ? opts.shadeY : 0;
      ctx.fillRect(-500, sy, 1000, 500);
      ctx.restore();
    }
    if (opts.hl) {
      ctx.save();
      ctx.globalAlpha *= 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(opts.hl[0], opts.hl[1], opts.hl[2], opts.hl[3], -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (opts.noStroke) return;
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = opts.lw || A.LW;
    ctx.strokeStyle = A.outline();
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  A.ellipse = function (ctx, x, y, rx, ry, fill, shade, opts) {
    opts = opts || {};
    const rot = opts.rot || 0;
    A.shape(ctx, (c) => c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2), fill, shade, {
      shadeY: y + ry * (opts.shadeAt != null ? opts.shadeAt : 0.35),
      hl: opts.hl === false ? null : opts.hl || [x - rx * 0.35, y - ry * 0.45, rx * 0.25, ry * 0.16],
      lw: opts.lw,
      noStroke: opts.noStroke,
      cel: opts.cel,
    });
  };

  A.roundRect = function (c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };

  // Q 版眼睛。kind：normal / closed / hurt / angry / x
  A.eye = function (ctx, x, y, rx, ry, kind, look) {
    look = look || 0;
    if (kind === 'closed') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y - ry * 0.2, rx, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      return;
    }
    // hurt＝「>」、hurt2＝「<」：兩隻眼睛一左一右配成 > <
    if (kind === 'hurt' || kind === 'hurt2') {
      const s = kind === 'hurt2' ? -1 : 1;
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x - rx * s, y - ry * 0.6);
      ctx.lineTo(x + rx * s, y);
      ctx.lineTo(x - rx * s, y + ry * 0.6);
      ctx.stroke();
      return;
    }
    if (kind === 'x') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - rx, y - rx);
      ctx.lineTo(x + rx, y + rx);
      ctx.moveTo(x + rx, y - rx);
      ctx.lineTo(x - rx, y + rx);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = A.c('#2b1a12');
    ctx.beginPath();
    ctx.ellipse(x + look, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + look - rx * 0.3, y - ry * 0.4, rx * 0.42, ry * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + look + rx * 0.35, y + ry * 0.35, rx * 0.18, 0, Math.PI * 2);
    ctx.fill();
    if (kind === 'angry') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.3, y - ry * 1.5);
      ctx.lineTo(x + rx * 1.1, y - ry * 0.95);
      ctx.stroke();
    }
  };

  A.blush = function (ctx, x, y, r) {
    ctx.fillStyle = A.c('rgba(255,120,120,0.45)');
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // 地面陰影
  A.groundShadow = function (ctx, x, y, w) {
    ctx.fillStyle = 'rgba(30,20,10,0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // 楓葉形狀（小獅子額頭的鬃毛、星楓葉）
  A.mapleLeafPath = function (c, x, y, s) {
    const pts = [
      [0, -1], [0.18, -0.55], [0.5, -0.72], [0.4, -0.3], [0.95, -0.35], [0.7, 0.05],
      [0.85, 0.25], [0.35, 0.28], [0.3, 0.55], [0.06, 0.4], [0.05, 0.9], [-0.05, 0.9],
      [-0.06, 0.4], [-0.3, 0.55], [-0.35, 0.28], [-0.85, 0.25], [-0.7, 0.05], [-0.95, -0.35],
      [-0.4, -0.3], [-0.5, -0.72], [-0.18, -0.55],
    ];
    pts.forEach((p, i) => (i ? c.lineTo(x + p[0] * s, y + p[1] * s) : c.moveTo(x + p[0] * s, y + p[1] * s)));
    c.closePath();
  };

  // 名牌（怪物名稱）
  A.nameTag = function (ctx, x, y, text, color) {
    ctx.font = 'bold 13px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(20,10,5,0.6)';
    ctx.beginPath();
    A.roundRect(ctx, x - w / 2, y - 9, w, 18, 6);
    ctx.fill();
    ctx.fillStyle = color || '#fff';
    ctx.fillText(text, x, y + 1);
  };
})();
