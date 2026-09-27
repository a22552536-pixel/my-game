// 第三章起怪物技能的投射物與區域美術（v1.6）。行為在 js/game/mobabil.js、mobabil2.js。
// 投射物：原點已經 translate 到 p.x, p.y（A.drawProjectile 會 save/restore）；區域：世界座標。
// 效能：只用少量漸層，大多是平塗＋透明度；有 p.fade 的投射物在最後 fade 秒淡出。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const PI = Math.PI;
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  // 投射物的淡入淡出
  const pAlpha = (p) => {
    const inA = clamp(p.t * 8, 0, 1);
    const out = p.fade ? clamp((p.life - p.t) / p.fade, 0, 1) : 1;
    return Math.min(inA, out);
  };
  // 區域的淡入淡出
  const zAlpha = (z, fin, fout) => clamp(Math.min(z.t / (fin || 0.12), (z.life - z.t) / (fout || 0.2)), 0, 1);
  const ang = (p) => Math.atan2(p.vy || 0, p.vx || 1);
  const glow = (ctx, x, y, r, col, a) => {
    ctx.fillStyle = 'rgba(' + col + ',' + (a * 0.35).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(' + col + ',' + (a * 0.35).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, TAU);
    ctx.fill();
  };
  const star = (ctx, x, y, r, n, inner, rot) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * PI) / n;
      const rr = i % 2 ? r * inner : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  };

  // ═════ 投射物 ═════
  // 九尾狐的狐火：原本的美術外面包一層淡出
  const baseFox = A.PROJ_DRAW.foxfire;
  if (baseFox) {
    A.PROJ_DRAW.foxfire = function (ctx, p, t) {
      ctx.globalAlpha *= pAlpha(p);
      baseFox(ctx, p, t);
    };
  }

  // 雪女的冰簪：細長的冰針，白芯，尾端拖一小段霜
  A.PROJ_DRAW.icepin = function (ctx, p, t) {
    ctx.globalAlpha *= pAlpha(p);
    ctx.rotate(ang(p));
    ctx.fillStyle = 'rgba(200,240,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9fdcff';
    ctx.strokeStyle = '#3a6a9a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(0, -4);
    ctx.lineTo(-12, -2);
    ctx.lineTo(-12, 2);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8, -1, 16, 2);
    // 簪頭的小冰花
    ctx.fillStyle = '#e8f8ff';
    star(ctx, -13, 0, 4.5, 3, 0.4, t * 6 + (p.seed || 0));
    ctx.fill();
  };

  // 朱雀的羽：火焰羽（紅橙）與時之沙羽（金，拖著沙粒）交錯
  A.PROJ_DRAW.flamefeather = function (ctx, p, t) {
    ctx.globalAlpha *= pAlpha(p);
    const sand = !!p.sand;
    const a = ang(p);
    // 拖尾的火星或沙粒（畫在旋轉之前，才會落在飛行方向後面）
    for (let i = 0; i < 4; i++) {
      const q = (t * 3 + i / 4 + (p.seed || 0)) % 1;
      const d = 10 + q * 26;
      const side = Math.sin(i * 2.3 + (p.seed || 0)) * 5;
      ctx.fillStyle = sand ? 'rgba(255,220,130,' + (0.8 * (1 - q)).toFixed(3) + ')' : 'rgba(255,' + (140 + i * 20) + ',60,' + (0.8 * (1 - q)).toFixed(3) + ')';
      ctx.fillRect(-Math.cos(a) * d - Math.sin(a) * side - 1.5, -Math.sin(a) * d + Math.cos(a) * side - 1.5, 3, 3);
    }
    ctx.rotate(a);
    ctx.scale(1.4, 1.4);
    glow(ctx, 0, 0, 16, sand ? '255,220,120' : '255,120,40', 0.9);
    ctx.fillStyle = sand ? '#ffd86a' : '#ff6a2a';
    ctx.strokeStyle = sand ? '#9a6a1a' : '#8a2a10';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.quadraticCurveTo(2, -7, -12, -2 + Math.sin(t * 24 + (p.seed || 0)) * 1.5);
    ctx.lineTo(-9, 0);
    ctx.lineTo(-12, 2);
    ctx.quadraticCurveTo(2, 7, 13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = sand ? '#fff4c8' : '#ffd35a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-10, 0);
    ctx.stroke();
  };

  // 時停蝶的時針：懸停時畫出瞄準線，射出後拖一道金光
  A.PROJ_DRAW.clockhand = function (ctx, p, t) {
    ctx.globalAlpha *= pAlpha(p);
    const holding = p.t < p.hold;
    const a = holding ? p.ang : ang(p);
    ctx.rotate(a);
    if (holding) {
      const k = clamp(p.t / p.hold, 0, 1);
      ctx.strokeStyle = 'rgba(255,230,150,' + (0.2 + 0.45 * k).toFixed(3) + ')';
      ctx.lineWidth = 1.5 + k * 1.5;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -t * 40;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(18 + 90 + k * 60, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      // 懸停時的小錶面
      ctx.strokeStyle = 'rgba(255,220,130,' + (0.5 + 0.4 * Math.sin(t * 20)).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, TAU);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,220,130,0.35)';
      ctx.fillRect(-40, -2.5, 30, 5);
    }
    ctx.scale(1.35, 1.35);
    glow(ctx, 0, 0, 12, '255,220,130', 0.8);
    ctx.fillStyle = '#ffd76a';
    ctx.strokeStyle = '#6a4a1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(6, -5);
    ctx.lineTo(7, -1.8);
    ctx.lineTo(-12, -1.8);
    ctx.lineTo(-12, 1.8);
    ctx.lineTo(7, 1.8);
    ctx.lineTo(6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-12, 0, 3.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  };

  // 聖甲蟲的太陽輪：轉動的金色太陽盤，外圈火舌，後面拖著火
  A.PROJ_DRAW.sunwheel = function (ctx, p, t) {
    ctx.globalAlpha *= pAlpha(p);
    const r = p.r || 22;
    const dir = p.vx >= 0 ? 1 : -1;
    // 火尾
    for (let i = 0; i < 5; i++) {
      const q = (t * 4 + i / 5) % 1;
      ctx.fillStyle = 'rgba(255,' + (120 + i * 22) + ',40,' + (0.55 * (1 - q)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(-dir * (r * 0.6 + q * r * 1.6), r * 0.5 - q * r * 0.9 + Math.sin(i * 3) * 4, r * (0.5 - q * 0.3), 0, TAU);
      ctx.fill();
    }
    glow(ctx, 0, 0, r * 1.7, '255,190,70', 0.9);
    ctx.save();
    ctx.rotate(p.spin || 0);
    // 光芒
    ctx.fillStyle = '#ff9a2a';
    star(ctx, 0, 0, r * 1.25, 10, 0.72, 0);
    ctx.fill();
    ctx.fillStyle = '#ffd35a';
    ctx.strokeStyle = '#8a4a10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // 盤面的刻紋（看得出在轉）
    ctx.strokeStyle = '#c0701a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * PI) / 4;
      ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
      ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
      ctx.moveTo(-Math.cos(a) * r * 0.25, -Math.sin(a) * r * 0.25);
      ctx.lineTo(-Math.cos(a) * r * 0.7, -Math.sin(a) * r * 0.7);
    }
    ctx.stroke();
    ctx.fillStyle = '#fff6d0';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  // 星座魚的追蹤星：轉動的五角星，拖著閃粉
  A.PROJ_DRAW.homingstar = function (ctx, p, t) {
    ctx.globalAlpha *= pAlpha(p);
    const r = p.r || 13;
    const a = ang(p);
    for (let i = 0; i < 5; i++) {
      const q = (t * 3 + i / 5) % 1;
      const d = r + q * 34;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,' + (0.8 * (1 - q)).toFixed(3) + ')' : 'rgba(170,190,255,' + (0.8 * (1 - q)).toFixed(3) + ')';
      ctx.fillRect(-Math.cos(a) * d + Math.sin(i * 2.4) * 5 - 1.5, -Math.sin(a) * d + Math.cos(i * 2.4) * 5 - 1.5, 3, 3);
    }
    glow(ctx, 0, 0, r * 2.2, '255,236,150', 0.9);
    ctx.fillStyle = '#ffe98a';
    ctx.strokeStyle = '#8a6a1a';
    ctx.lineWidth = 1.8;
    star(ctx, 0, 0, r, 5, 0.46, t * 5 + (p.seed || 0));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, TAU);
    ctx.fill();
  };

  // ═════ 區域 ═════
  // 地上的預警帶（近戰、滾輪、衝鋒）：越接近出手越滿，最後 0.2 秒閃爍
  A.ZONE_DRAW.mobwarn = function (ctx, z, t) {
    const k = clamp(z.t / Math.max(0.05, z.life), 0, 1);
    const left = z.life - z.t;
    const blink = left < 0.22 ? 0.55 + 0.45 * Math.sin(z.t * 60) : 1;
    const a = zAlpha(z, 0.1, 0.08) * blink;
    const w = z.x2 - z.x1;
    const c = 'rgba(' + z.col + ',';
    ctx.save();
    ctx.globalAlpha *= a;
    // 範圍（淡）＋從地面往上漲的填色（越接近出手越滿）
    ctx.fillStyle = c + '0.14)';
    ctx.fillRect(z.x1, z.y - z.h, w, z.h);
    ctx.fillStyle = c + '0.26)';
    ctx.fillRect(z.x1, z.y - z.h * k, w, z.h * k);
    // 地上的亮帶（被怪物身體擋住也看得到兩端）
    ctx.fillStyle = c + '0.9)';
    ctx.fillRect(z.x1, z.y - 5, w, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(z.x1, z.y - 3, w * k, 2);
    // 兩端的直線
    ctx.fillRect(z.x1, z.y - z.h, 2, z.h);
    ctx.fillRect(z.x2 - 2, z.y - z.h, 2, z.h);
    // 方向箭頭（往出手的方向流動）
    if (z.dir) {
      ctx.fillStyle = c + '0.85)';
      const n = Math.max(1, Math.floor(w / 36));
      for (let i = 0; i < n; i++) {
        const q = (i + ((t * 2) % 1)) / n;
        const x = z.dir > 0 ? z.x1 + q * w : z.x2 - q * w;
        ctx.beginPath();
        ctx.moveTo(x + z.dir * 7, z.y - 16);
        ctx.lineTo(x - z.dir * 3, z.y - 23);
        ctx.lineTo(x - z.dir * 3, z.y - 9);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  };

  // 蓄力光：光點往中心聚，中心越來越亮
  A.ZONE_DRAW.mobcharge = function (ctx, z, t) {
    const k = clamp(z.t / Math.max(0.05, z.life), 0, 1);
    ctx.save();
    ctx.globalAlpha *= zAlpha(z, 0.08, 0.06);
    glow(ctx, z.x, z.y, z.r * (0.3 + 0.5 * k), z.col, 0.5 + 0.5 * k);
    ctx.fillStyle = 'rgba(' + z.col + ',0.9)';
    for (let i = 0; i < 7; i++) {
      const q = (t * 2.2 + i / 7) % 1;
      const a = i * 2.4 + t;
      const d = z.r * (1.4 - q * 1.2);
      ctx.fillRect(z.x + Math.cos(a) * d - 1.5, z.y + Math.sin(a) * d - 1.5, 3, 3);
    }
    ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.6 * k).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(z.x, z.y, 2 + 6 * k, 0, TAU);
    ctx.fill();
    // 往內收的光圈（收到最小＝出手）
    ctx.strokeStyle = 'rgba(' + z.col + ',' + (0.5 + 0.5 * k).toFixed(3) + ')';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r * (1.8 - 1.4 * k), 0, TAU);
    ctx.stroke();
    ctx.restore();
  };

  // 引力犰狳：磁暴的範圍（地上的紫色橢圓，越來越滿）
  A.ZONE_DRAW.magring = function (ctx, z, t) {
    const k = clamp(z.t / z.life, 0, 1);
    const blink = z.life - z.t < 0.22 ? 0.6 + 0.4 * Math.sin(z.t * 60) : 1;
    ctx.save();
    ctx.globalAlpha *= zAlpha(z, 0.1, 0.05) * blink;
    ctx.fillStyle = 'rgba(170,120,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(z.x, z.y - 2, z.r * k, z.r * 0.22 * k, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,160,255,0.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = t * 30;
    ctx.beginPath();
    ctx.ellipse(z.x, z.y - 2, z.r, z.r * 0.22, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  };

  // 鏡麒麟的稜鏡光束：先是閃爍的細瞄準線，z.fire 秒時變成三色的粗光束
  A.ZONE_DRAW.prismbeam = function (ctx, z, t) {
    ctx.save();
    ctx.lineCap = 'round';
    if (z.t < z.fire) {
      const k = z.t / z.fire;
      ctx.globalAlpha *= clamp(z.t * 8, 0, 1) * (k > 0.7 ? 0.6 + 0.4 * Math.sin(z.t * 50) : 1);
      ctx.strokeStyle = 'rgba(200,240,255,' + (0.35 + 0.4 * k).toFixed(3) + ')';
      ctx.lineWidth = 1.5 + k * 2.5;
      ctx.setLineDash([10, 6]);
      ctx.lineDashOffset = -t * 60;
      ctx.beginPath();
      ctx.moveTo(z.x1, z.y1);
      ctx.lineTo(z.x2, z.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      glow(ctx, z.x1, z.y1, 8 + 10 * k, '200,240,255', 0.9);
    } else {
      const k = clamp((z.life - z.t) / (z.life - z.fire), 0, 1);
      ctx.globalAlpha *= k;
      const cols = ['rgba(255,140,220,0.45)', 'rgba(140,220,255,0.7)', '#ffffff'];
      const ws = [26, 14, 5];
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = cols[i];
        ctx.lineWidth = ws[i] * (0.6 + 0.4 * k);
        ctx.beginPath();
        ctx.moveTo(z.x1, z.y1);
        ctx.lineTo(z.x2, z.y2);
        ctx.stroke();
      }
      glow(ctx, z.x1, z.y1, 22, '220,245,255', 1);
    }
    ctx.restore();
  };

  // 太陽輪滾過的焦痕
  A.ZONE_DRAW.sunscorch = function (ctx, z, t) {
    const k = clamp(1 - z.t / z.life, 0, 1);
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.fillStyle = 'rgba(90,40,10,0.35)';
    ctx.beginPath();
    ctx.ellipse(z.x, z.y - 1, z.r, 4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,150,40,0.8)';
    for (let i = 0; i < 3; i++) {
      const h = (6 + 6 * Math.sin(t * 14 + i * 2 + z.x)) * k;
      ctx.beginPath();
      ctx.moveTo(z.x - 10 + i * 10 - 3, z.y);
      ctx.lineTo(z.x - 10 + i * 10, z.y - h - 3);
      ctx.lineTo(z.x - 10 + i * 10 + 3, z.y);
      ctx.fill();
    }
    ctx.restore();
  };

  // 天馬的星光蹄印：短暫發燙的四角星
  A.ZONE_DRAW.hoofstar = function (ctx, z, t) {
    const k = clamp(1 - z.t / z.life, 0, 1);
    const hot = z.t > 0.15;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, z.t * 10) * k;
    ctx.fillStyle = 'rgba(200,170,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(z.x, z.y - 1, 16, 4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = hot ? '#ffe6a0' : '#e8dcff';
    star(ctx, z.x, z.y - 6, 7 + Math.sin(t * 20 + (z.seed || 0)) * 1.5, 4, 0.35, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(z.x - 1, z.y - 7, 2, 2);
    ctx.restore();
  };

  // 天馬的鏡像分身（衝鋒用）：借用雙生天馬本身的美術，半透明、帶紫色殘影
  A.ZONE_DRAW.twinghost = function (ctx, z, t) {
    const m = z.src;
    if (!m || !A.drawMonster) return;
    const ghost = Object.create(m);
    Object.assign(ghost, {
      x: z.x, y: z.y, dir: z.dir || 1, hover: 0, fx: Object.assign({}, m.fx, { fake: true, twin: false, gallop: z.charging ? 1 : z.k || 0, charging: !!z.charging }),
      hurtFlash: 0, hurtT: 0, elite: false, shiny: false, V: null, variant: null, dead: false, deadT: 0, squash: 0, pull: 0,
      attackPhase: z.charging ? 'strike' : 'wind', vx: z.charging ? z.dir * 600 : 0,
    });
    const a = 0.62 * zAlpha(z, 0.2, 0.3);
    ctx.save();
    if (z.charging) {
      ctx.globalAlpha = a * 0.3;
      ghost.x = z.x - z.dir * 34;
      A.drawMonster(ctx, ghost);
      ghost.x = z.x;
    }
    ctx.globalAlpha = a;
    A.drawMonster(ctx, ghost);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (Math.random() < 0.3) G.fx.sparkle(z.x, z.y - 40, '#d8c8ff', 1, 30);
  };
})();
