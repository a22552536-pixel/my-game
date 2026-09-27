// 怪物特質的外觀疊加（v1.5）：包住 A.drawMonster，在怪物身上加上特質的標記。行為在 js/game/variants.js。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const base = A.drawMonster;

  function geo(m) {
    const sc = m.scale || 1;
    const h = m.h * sc;
    const w = m.w * sc;
    const hv = m.hover || 0;
    return { sc, h, w, top: m.y - hv - h, mid: m.y - hv - h * 0.5, foot: m.y - hv };
  }
  function glow(ctx, x, y, r, rgb, a) {
    if (!isFinite(x) || !isFinite(y) || !(r > 0)) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function heart(ctx, x, y, s, col) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.4, y - s, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.4, y - s, x + s, y - s * 0.4, x, y + s * 0.35);
    ctx.fillStyle = col;
    ctx.fill();
  }
  function star(ctx, x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const rr = i % 2 ? r * 0.35 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  }

  A.drawMonster = function (ctx, m) {
    const v = m.variant;
    const live = v && m.V && !m.dead && isFinite(m.x) && isFinite(m.y);
    if (!live) return base(ctx, m);
    const g = geo(m);
    const t = m.t || 0;
    ctx.save();
    // 身體後面的光暈
    if (v === 'void') {
      glow(ctx, m.x, g.mid, Math.max(g.w, g.h) * 0.85, '42,18,80', 0.55);
      glow(ctx, m.x, g.mid, Math.max(g.w, g.h) * 0.5, '140,100,255', 0.25);
    } else if (v === 'poison') {
      glow(ctx, m.x, g.foot - 6, g.w * 0.7, '120,230,80', 0.28);
    } else if (v === 'hypocrite' && !m.revealed) {
      glow(ctx, m.x, g.mid, Math.max(g.w, g.h) * 0.7, '255,236,190', 0.35);
    } else if (v === 'hypocrite') {
      glow(ctx, m.x, g.mid, Math.max(g.w, g.h) * 0.75, '160,20,40', 0.35);
    }
    ctx.restore();

    if (v === 'void' && m.blinkFade > 0) {
      ctx.save();
      ctx.globalAlpha = 1 - m.blinkFade / 0.35;
      base(ctx, m);
      ctx.restore();
    } else base(ctx, m);

    ctx.save();
    if (v === 'void') {
      // 繞著身體轉的星點
      for (let i = 0; i < 4; i++) {
        const a = t * 1.6 + (i / 4) * TAU;
        const rx = g.w * 0.62;
        const ry = g.h * 0.32;
        star(ctx, m.x + Math.cos(a) * rx, g.mid + Math.sin(a) * ry, 3 + (i % 2) * 1.5, i % 2 ? '#ffffff' : '#c8b0ff');
      }
    } else if (v === 'poison') {
      // 往上冒的毒泡泡，身上的毒液往下滴
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.7 + i / 4) % 1;
        const x = m.x + Math.sin(i * 2.3 + t) * g.w * 0.3;
        const y = g.top + g.h * 0.2 - k * 34;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.arc(x, y, 2.5 + (i % 3), 0, TAU);
        ctx.fillStyle = '#8fe86a';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#3a7a2a';
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const dk = (t * 1.3) % 1;
      ctx.beginPath();
      ctx.ellipse(m.x + g.w * 0.2, g.mid + dk * g.h * 0.5, 2.2, 3.2, 0, 0, TAU);
      ctx.fillStyle = 'rgba(140,235,100,' + (1 - dk).toFixed(2) + ')';
      ctx.fill();
    } else if (v === 'sneaky') {
      // 冷汗、背上的金幣袋（偷越多越鼓）
      const side = -(m.dir || 1);
      const bx = m.x + side * g.w * 0.42;
      const by = g.mid - g.h * 0.05;
      const s = 7 + Math.min(8, (m.stolen || 0) / 10);
      ctx.beginPath();
      ctx.ellipse(bx, by, s, s * 0.9, 0, 0, TAU);
      ctx.fillStyle = '#b8864a';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#4a2e1f';
      ctx.stroke();
      ctx.fillStyle = '#ffd35a';
      ctx.font = 'bold ' + Math.round(s) + 'px ' + A.FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', bx, by + 1);
      const sw = (t * 1.5) % 1;
      ctx.globalAlpha = 1 - sw;
      ctx.beginPath();
      ctx.ellipse(m.x + (m.dir || 1) * g.w * 0.28, g.top + 6 + sw * 10, 2.5, 4, 0, 0, TAU);
      ctx.fillStyle = '#9ad8ff';
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (v === 'hypocrite') {
      if (!m.revealed) {
        // 天使光環與漂浮的愛心（其實是騙人的）
        ctx.beginPath();
        ctx.ellipse(m.x, g.top - 8 + Math.sin(t * 2) * 2, g.w * 0.24, 5, 0, 0, TAU);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffe28a';
        ctx.stroke();
        for (let i = 0; i < 2; i++) {
          const k = (t * 0.5 + i * 0.5) % 1;
          ctx.globalAlpha = 1 - k;
          heart(ctx, m.x + (i ? 1 : -1) * g.w * 0.35, g.top - k * 26, 5, '#ff8ab8');
        }
        ctx.globalAlpha = 1;
      } else {
        // 翻臉：光環碎掉，長出小惡魔角
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(m.x + s * g.w * 0.12, g.top + 4);
          ctx.quadraticCurveTo(m.x + s * g.w * 0.26, g.top - 6, m.x + s * g.w * 0.22, g.top - 16);
          ctx.lineTo(m.x + s * g.w * 0.18, g.top + 4);
          ctx.closePath();
          ctx.fillStyle = '#c0203a';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#3a0a10';
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  };

  // 中毒灘
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  A.ZONE_DRAW.poisonpool = function (ctx, z, t) {
    const k = Math.min(1, z.t / 0.3) * Math.min(1, (z.life - z.t) / 0.6);
    ctx.save();
    ctx.globalAlpha = 0.75 * k;
    ctx.beginPath();
    ctx.ellipse(z.x, z.y - 2, z.r, z.r * 0.28, 0, 0, TAU);
    ctx.fillStyle = '#5ab83a';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(z.x - z.r * 0.2, z.y - 3, z.r * 0.5, z.r * 0.12, 0, 0, TAU);
    ctx.fillStyle = '#b8f89a';
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const b = ((t || 0) * 0.9 + i / 3) % 1;
      ctx.globalAlpha = 0.8 * k * (1 - b);
      ctx.beginPath();
      ctx.arc(z.x + (i - 1) * z.r * 0.45, z.y - 4 - b * 14, 2.5, 0, TAU);
      ctx.fillStyle = '#8fe86a';
      ctx.fill();
    }
    ctx.restore();
  };
})();
