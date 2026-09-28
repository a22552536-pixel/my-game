// 怪物繪圖。每個系列一個函式，用 stage（1~3）決定外型；
// 第 2、3 階是在第 1 階的結構上加部件。原點在腳底中央、面向右。
(function () {
  'use strict';
  const A = G.art;

  // ───────────── 第一章精緻化（v1.5）共用小工具：厚塗形狀、邊光、質感、有神的眼睛 ─────────────
  // 走法同 monsters3/4：整片陰影色 → 往左上偏移的亮面（右下留月牙陰影）→ 形狀內質感 → 左上緣邊光 → 描邊。
  // 第一章是入門章節：質感只點到為止、描邊與色塊保持好讀，表情維持友善。
  const U1 = G.util;
  const TAU = Math.PI * 2;
  function hash1(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  // 放射狀柔光；顏色走 A.c()
  function glow1(ctx, x, y, r, col, a) {
    if (!(a > 0) || !(r > 0)) return;
    const rgb = U1.hexToRgb(A.c(col)).join(',');
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  // 顏色走 A.c() 的線性漸層；stops：[k, col, alpha?]
  function lg1(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([k, col, a]) => {
      if (a == null) g.addColorStop(k, A.c(col));
      else g.addColorStop(k, 'rgba(' + U1.hexToRgb(A.c(col)).join(',') + ',' + a + ')');
    });
    return g;
  }
  // 厚塗形狀。o.cel：[dx,dy] 或數字；o.rim：邊光寬度；o.tex(ctx)：形狀內的質感；o.sheen：[x,y,r,a]；o.hl 同 A.shape
  function rs(ctx, path, fill, shade, rim, o) {
    o = o || {};
    const cel = o.cel == null ? [3, 3] : typeof o.cel === 'number' ? [o.cel, o.cel] : o.cel;
    const r = o.rim == null ? 1.6 : o.rim;
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(shade || fill);
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (shade) {
      ctx.translate(-cel[0], -cel[1]);
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(fill);
      ctx.fill();
      ctx.translate(cel[0], cel[1]);
    }
    if (o.sheen) glow1(ctx, o.sheen[0], o.sheen[1], o.sheen[2], o.sheenCol || '#ffffff', o.sheen[3]);
    if (o.tex) {
      ctx.save();
      o.tex(ctx);
      ctx.restore();
    }
    if (rim && r > 0) {
      ctx.beginPath();
      ctx.rect(-900, -900, 1800, 1800);
      ctx.translate(r, r);
      path(ctx);
      ctx.translate(-r, -r);
      ctx.clip('evenodd');
      ctx.fillStyle = A.c(rim);
      ctx.fillRect(-900, -900, 1800, 1800);
    }
    ctx.restore();
    if (o.hl) {
      ctx.save();
      ctx.globalAlpha *= o.hlA || 0.6;
      ctx.fillStyle = A.c('#ffffff');
      ctx.beginPath();
      ctx.ellipse(o.hl[0], o.hl[1], o.hl[2], o.hl[3], o.hlRot == null ? -0.5 : o.hlRot, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    if (o.noStroke) return;
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = o.lw || 2.6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  function re(ctx, x, y, rx, ry, fill, shade, rim, o) {
    o = Object.assign({}, o || {});
    const rot = o.rot || 0;
    if (o.hl === undefined) o.hl = [x - rx * 0.35, y - ry * 0.45, rx * 0.26, ry * 0.15];
    if (o.cel == null) o.cel = [rx * 0.16, ry * 0.2];
    rs(ctx, (c) => c.ellipse(x, y, rx, ry, rot, 0, TAU), fill, shade, rim, o);
  }
  // 一筆有顏色的線（col 為 null 時用描邊色）
  function line1(ctx, fn, col, w, a) {
    ctx.save();
    if (a != null) ctx.globalAlpha *= a;
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    fn(ctx);
    ctx.stroke();
    ctx.restore();
  }
  // 一把固定位置的小斑點（質感）
  function speckle(ctx, x, y, w, h, n, r, col, seed, a) {
    ctx.save();
    ctx.globalAlpha *= a == null ? 1 : a;
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + (hash1(seed + i * 3.1) - 0.5) * w;
      const py = y + (hash1(seed + i * 7.7) - 0.5) * h;
      const rr = r * (0.55 + hash1(seed + i * 1.3) * 0.7);
      ctx.moveTo(px + rr, py);
      ctx.arc(px, py, rr, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }
  // 有葉脈的小葉子（中心 x,y，長半徑 rx）
  function leaf1(ctx, x, y, rx, ry, rot, col, colS, rim, lw) {
    re(ctx, x, y, rx, ry, col, colS, rim || null, { rot, lw: lw || 2, hl: false, cel: [0, ry * 0.45], rim: 1, tex: (c) => {
      const ca = Math.cos(rot);
      const sa = Math.sin(rot);
      line1(c, (q) => { q.moveTo(x - ca * rx * 0.75, y - sa * rx * 0.75); q.lineTo(x + ca * rx * 0.7, y + sa * rx * 0.7); }, colS, 1, 0.9);
    } });
  }
  // 有神的 Q 版大眼：深色眼眶 → 漸層虹膜 → 瞳孔 → 大小兩個亮點（其他表情交給 A.eye）
  function eye1(ctx, x, y, rx, ry, kind, iris, look) {
    look = look || 0;
    if (kind !== 'normal' && kind !== 'angry') {
      A.eye(ctx, x, y, rx, ry, kind, look);
      return;
    }
    const ir = iris || '#6a4028';
    ctx.save();
    ctx.fillStyle = A.c('#2b1a12');
    ctx.beginPath();
    ctx.ellipse(x + look, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.clip();
    const g = ctx.createRadialGradient(x + look, y + ry * 0.55, ry * 0.08, x + look, y + ry * 0.2, ry);
    g.addColorStop(0, A.c(U1.mix(ir, '#ffffff', 0.5)));
    g.addColorStop(0.6, A.c(ir));
    g.addColorStop(1, A.c(U1.mix(ir, '#1a0e0a', 0.5)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + look, y + ry * 0.14, rx * 0.8, ry * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#1a0e0a');
    ctx.beginPath();
    ctx.ellipse(x + look, y + ry * 0.12, rx * 0.44, ry * 0.46, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = A.c('#ffffff');
    ctx.beginPath();
    ctx.ellipse(x + look - rx * 0.3, y - ry * 0.4, rx * 0.42, ry * 0.3, -0.3, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + look + rx * 0.36, y + ry * 0.4, rx * 0.18, 0, TAU);
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
  }

  function faceEyes(ctx, x, y, gap, rx, ry, m, iris) {
    const kind = m.dead ? 'x' : m.hurtT > 0 ? 'hurt' : m.angry ? 'angry' : m.blink ? 'closed' : 'normal';
    eye1(ctx, x, y, rx, ry, kind, iris, 0.8);
    eye1(ctx, x + gap, y - 0.5, rx * 0.92, ry * 0.95, kind, iris, 0.8);
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
      // 小舌頭
      ctx.fillStyle = A.c('#e8707a');
      ctx.beginPath();
      ctx.ellipse(x + 0.4, y + 2.6, 1.8, 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
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
    const body = s === 3 ? ['#e9cf9d', '#cfae74', '#fff4dc'] : s === 2 ? ['#ecdcae', '#d2ba84', '#fff8e0'] : ['#f4e4bc', '#dcc392', '#fffaec'];
    const iris = s === 3 ? '#7a4a24' : s === 2 ? '#4f7f2e' : '#3b7cc0';

    if (!hide) {
      ctx.save();
      ctx.scale(sx, 1);
      // 身體
      const bodyP = (c) => {
        c.moveTo(-25, 0);
        c.quadraticCurveTo(-30, -3, -24, -7);
        c.quadraticCurveTo(-8, -10, 10, -10);
        c.quadraticCurveTo(22, -28, 29, -12);
        c.quadraticCurveTo(31, 0, 21, 0);
        c.closePath();
      };
      rs(ctx, bodyP, body[0], body[1], body[2], {
        cel: [3, 3],
        rim: 1.4,
        lw: 3,
        hl: [16, -20, 3.5, 2],
        sheen: [18, -17, 9, 0.35],
        tex: (c) => {
          // 腹足底下的深色帶與黏液的濕亮
          c.fillStyle = lg1(c, 0, -6, 0, 0, [[0, body[1], 0], [1, body[1], 0.85]]);
          c.fillRect(-32, -6, 64, 6);
          speckle(c, 2, -6, 40, 3, 7, 0.8, body[1], 11 + s, 0.8);
          line1(c, (q) => { q.moveTo(-20, -6.2); q.quadraticCurveTo(-4, -8.4, 9, -8.2); }, '#ffffff', 1.2, 0.55);
        },
      });
      // 腹足的波紋
      ctx.strokeStyle = A.c(body[1]);
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
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
      // 眼睛：有光澤的白眼球加上彩色大眼珠
      const eyeR = s === 3 ? 5 : 5.5;
      [[15 + wob, -34], [27 + wob, -33]].forEach(([x, y]) => {
        re(ctx, x, y, eyeR, eyeR, '#ffffff', '#dfe6ee', null, { lw: 2.2, hl: false, cel: [0.8, 1] });
        if (m.dead) A.eye(ctx, x, y, 2.4, 2.4, 'x');
        else if (m.blink) A.eye(ctx, x, y + 1, 2.8, 2, 'closed');
        else if (m.hurtT > 0) A.eye(ctx, x + 1, y + 0.5, 2.8, 3.4, 'hurt', 0);
        else eye1(ctx, x + 1, y + 0.5, 3, 3.5, 'normal', iris, 0);
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
      // 一滴水形狀的殼：透明感的漸層、底部的聚光、裡面的小氣泡
      const drop = (c) => {
        c.moveTo(-1, cy - 22);
        c.bezierCurveTo(8, cy - 12, 13, cy - 2, 10, cy + 7);
        c.bezierCurveTo(6, cy + 16, -15, cy + 16, -19, cy + 7);
        c.bezierCurveTo(-23, cy - 3, -12, cy - 11, -1, cy - 22);
        c.closePath();
      };
      rs(ctx, drop, '#8fd3f4', '#5aaede', '#e4f8ff', {
        cel: [4, 4],
        rim: 1.8,
        lw: 3,
        tex: (c) => {
          c.fillStyle = lg1(c, 0, cy - 22, 0, cy + 14, [[0, '#d6f2ff', 0.7], [0.55, '#8fd3f4', 0], [1, '#3f8fc8', 0.45]]);
          c.fillRect(-25, cy - 24, 40, 40);
          // 底部折射進來的亮光
          glow1(c, 0, cy + 8, 9, '#e8fbff', 0.8);
          line1(c, (q) => { q.moveTo(-12, cy + 10); q.quadraticCurveTo(-3, cy + 14, 6, cy + 8); }, '#e8fbff', 1.6, 0.8);
          // 靜止的小氣泡
          [[4, cy - 4, 1.4], [-4, cy + 2, 1], [6, cy + 3, 0.8]].forEach(([x, y, r]) => {
            line1(c, (q) => q.arc(x, y, r, 0, TAU), '#e8f8ff', 0.9, 0.85);
          });
        },
      });
      ctx.fillStyle = A.c('#ffffff');
      ctx.beginPath();
      ctx.ellipse(-11, cy - 1, 3.5, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-9, cy + 8, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-3, cy - 14, 1.2, 2.4, 0.5, 0, Math.PI * 2);
      ctx.fill();
      // 殼裡往上冒的小氣泡
      ctx.strokeStyle = A.c('#e8f8ff');
      ctx.lineWidth = 1.5;
      const b = (t * 0.6) % 1;
      ctx.globalAlpha = 1 - b;
      ctx.beginPath();
      ctx.arc(1, cy + 6 - b * 14, 2.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // 水滴尖端的一閃
      const tw = 0.5 + Math.sin(t * 3.2) * 0.5;
      if (tw > 0.2) {
        ctx.save();
        ctx.globalAlpha *= tw;
        ctx.fillStyle = A.c('#ffffff');
        ctx.beginPath();
        const px = 5, py = cy - 15, k = 2.6;
        ctx.moveTo(px, py - k);
        ctx.quadraticCurveTo(px, py, px + k, py);
        ctx.quadraticCurveTo(px, py, px, py + k);
        ctx.quadraticCurveTo(px, py, px - k, py);
        ctx.quadraticCurveTo(px, py, px, py - k);
        ctx.fill();
        ctx.restore();
      }
    } else if (s === 2) {
      // 螺旋殼：年輪般的亮暗螺紋
      const spiral = (c, off) => {
        for (let a = 0; a < 9.2; a += 0.2) {
          const r = 2 + a * 1.4 + off;
          const x = -4 + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          a === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
      };
      re(ctx, -5, cy - 1, 17, 17, '#b0804e', '#8a5f36', '#e0b27c', {
        cel: [4, 4],
        rim: 1.8,
        hl: false,
        lw: 3,
        sheen: [-11, cy - 7, 10, 0.3],
        tex: (c) => {
          line1(c, (q) => spiral(q, 1.6), '#c89a64', 1.4, 0.8);
          speckle(c, -5, cy + 2, 26, 24, 10, 0.8, '#6b4a2e', 23, 0.35);
        },
      });
      ctx.strokeStyle = A.c('#6b4a2e');
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      spiral(ctx, 0);
      ctx.stroke();
      // 青苔：絨絨的亮暗點
      rs(
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
        '#b6e07a',
        {
          cel: [2, 3],
          rim: 1.4,
          lw: 2.4,
          tex: (c) => {
            speckle(c, -5, cy - 12, 30, 12, 14, 1, '#4f7a2e', 41, 0.7);
            speckle(c, -7, cy - 15, 26, 8, 10, 0.8, '#a8d86e', 57, 0.9);
          },
        }
      );
      // 小芽與一朵小花
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, cy - 18);
      ctx.lineTo(-8, cy - 28);
      ctx.stroke();
      ctx.strokeStyle = A.c('#6cae4a');
      ctx.lineWidth = 1;
      ctx.stroke();
      const sway = Math.sin(t * 2.5) * 0.15;
      leaf1(ctx, -13, cy - 30, 6, 3.5, -0.5 + sway, '#8fd46a', '#62a845', '#d2f4a8');
      leaf1(ctx, -3, cy - 31, 6, 3.5, 0.5 + sway, '#8fd46a', '#62a845', '#d2f4a8');
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        re(ctx, 5 + Math.cos(a) * 3.2, cy - 19 + Math.sin(a) * 3.2, 2.6, 2.6, '#ffb0d0', '#f08ab4', null, { lw: 1.4, hl: false, cel: [0.5, 0.6] });
      }
      re(ctx, 5, cy - 19, 1.8, 1.8, '#ffe066', '#f0b83a', null, { lw: 1.2, hl: false, cel: [0.4, 0.4] });
    } else {
      // 樹樁殼：樹皮紋路、節瘤、底部一圈青苔
      const stump = (c) => A.roundRect(c, -25, cy - 24, 38, 34, 8);
      rs(ctx, stump, '#8b5e3c', '#6b4428', '#b88a5e', {
        cel: [4, 3],
        rim: 1.8,
        lw: 3,
        tex: (c) => {
          for (let i = 0; i < 3; i++) {
            line1(c, (q) => { q.moveTo(-17 + i * 11, cy - 16); q.quadraticCurveTo(-15 + i * 11, cy - 6, -16 + i * 11, cy + 4); }, '#a8784c', 1.2, 0.8);
          }
          speckle(c, -6, cy - 6, 34, 26, 12, 0.9, '#5a3a22', 71, 0.5);
          // 底部的苔蘚
          c.fillStyle = A.c('#6fa044');
          c.beginPath();
          c.moveTo(-26, cy + 11);
          for (let i = 0; i <= 8; i++) c.quadraticCurveTo(-26 + i * 5 - 2.5, cy + 3 - (i % 2) * 2.5, -26 + i * 5, cy + 6 + (i % 3));
          c.lineTo(14, cy + 11);
          c.closePath();
          c.fill();
          speckle(c, -6, cy + 6, 36, 4, 8, 0.8, '#a8d06e', 83, 0.9);
        },
      });
      ctx.strokeStyle = A.c('#5a3a22');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-19 + i * 11, cy - 16);
        ctx.quadraticCurveTo(-17 + i * 11, cy - 6, -18 + i * 11, cy + 4);
        ctx.stroke();
      }
      // 節瘤
      re(ctx, -15, cy - 8, 2.6, 2, '#7a5032', '#5a3a22', null, { lw: 1.4, hl: false, cel: [0.5, 0.5] });
      // 樹洞（深處更暗）
      rs(ctx, (c) => c.ellipse(-2, cy - 4, 3.5, 5, 0, 0, TAU), '#3a2414', null, null, {
        lw: 2,
        tex: (c) => glow1(c, -2, cy - 2, 4, '#140a04', 0.9),
      });
      line1(ctx, (q) => q.ellipse(-2, cy - 4, 5.2, 6.8, 0, 0.8 * Math.PI, 1.9 * Math.PI), '#a8784c', 1.2, 0.9);
      // 年輪切面
      re(ctx, -6, cy - 24, 19, 6, '#e3be86', '#c9a068', '#fff0cc', {
        hl: false,
        cel: [0, 1.4],
        rim: 1,
        tex: (c) => speckle(c, -6, cy - 24, 30, 8, 8, 0.6, '#b48a52', 97, 0.6),
      });
      ctx.strokeStyle = A.c('#b48a52');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-6, cy - 24, 11, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(-6, cy - 24, 5, 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // 樹樁上的小蘑菇與葉子
      [[-17, cy - 26, 1], [-4, cy - 28, 1.25], [7, cy - 25, 0.85]].forEach(([x, y, k], i) => {
        rs(ctx, (c) => A.roundRect(c, x - 1.8 * k, y - 7 * k, 3.6 * k, 7 * k, 1.2 * k), '#fff0d6', '#e8cfa6', null, { lw: 2, cel: [1 * k, 0] });
        const capC = i === 1 ? ['#e05a3a', '#b8402a', '#ff9a78'] : ['#f28c38', '#d06a20', '#ffc07a'];
        rs(ctx, (c) => c.ellipse(x, y - 7 * k, 7 * k, 5 * k, 0, Math.PI, 0), capC[0], capC[1], capC[2], {
          lw: 2,
          cel: [1.4 * k, 1.2 * k],
          rim: 1,
          hl: [x - 2, y - 10 * k, 2, 1.2],
        });
        ctx.fillStyle = A.c('#fff6ea');
        ctx.beginPath();
        ctx.arc(x + 2 * k, y - 9 * k, 1 * k, 0, Math.PI * 2);
        ctx.moveTo(x - 2.7 * k, y - 8.2 * k);
        ctx.arc(x - 3.4 * k, y - 8.2 * k, 0.7 * k, 0, Math.PI * 2);
        ctx.fill();
      });
      leaf1(ctx, 12, cy - 30, 6, 3, -0.8, '#7cc95a', '#58a13c', '#c8f0a0');
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
    const stem = s === 3 ? ['#e8e4ff', '#c4bcf0', '#ffffff', '#d4ccf6'] : ['#fff0d6', '#e8cfa6', '#ffffff', '#f2dcb8'];
    const iris = ['#8a4a24', '#6a2a20', '#5a7a2a'][s - 1];
    const busy = m.attackT > 0 || m.chargeT > 0;

    if (s === 3) {
      const glow = 0.5 + Math.sin(t * 3) * 0.2;
      glow1(ctx, 0, -stemH - 8, 70, '#dcff8c', 0.55 * glow);
    }

    // 小手（在身體後面），衝撞或攻擊時舉起來
    const armY = -stemH * 0.45 - (busy ? 8 : 0);
    re(ctx, -stemW / 2 - 2, armY, 5, 4, stem[0], stem[1], stem[2], { lw: 2.2, hl: false, rot: busy ? -0.6 : 0.3, rim: 1 });
    re(ctx, stemW / 2 + 2, armY + (busy ? 0 : 1), 5, 4, stem[0], stem[1], stem[2], { lw: 2.2, hl: false, rot: busy ? 0.6 : -0.3, rim: 1 });
    // 腳
    const walk = m.onGround && Math.abs(m.vx || 0) > 5 ? Math.sin(t * 12) * 2 : 0;
    re(ctx, -8, -3 - Math.max(0, walk), 6, 4, stem[0], stem[1], stem[2], { lw: 2.2, hl: false, rim: 1 });
    re(ctx, 8, -3 - Math.max(0, -walk), 6, 4, stem[0], stem[1], stem[2], { lw: 2.2, hl: false, rim: 1 });
    // 身體：菌柄的細纖維、下緣稍暗
    rs(ctx, (c) => A.roundRect(c, -stemW / 2, -stemH - 4, stemW, stemH, 11), stem[0], stem[1], stem[2], {
      cel: [4, 3],
      rim: 1.6,
      lw: 3,
      hl: [-stemW / 2 + 6, -stemH + 6, 3, 5],
      hlA: 0.5,
      tex: (c) => {
        [-0.34, -0.12, 0.3].forEach((k, i) => {
          const x = k * stemW;
          line1(c, (q) => { q.moveTo(x, -stemH - 1); q.quadraticCurveTo(x + (i - 1) * 1.2, -stemH * 0.5, x + 0.5, -6); }, stem[3], 1, 0.7);
        });
        c.fillStyle = lg1(c, 0, -12, 0, -4, [[0, stem[1], 0], [1, stem[1], 0.6]]);
        c.fillRect(-stemW, -12, stemW * 2, 9);
      },
    });
    if (s === 3) {
      // 發光的肚子
      const pulse = 0.6 + Math.sin(t * 4) * 0.3;
      glow1(ctx, 0, -10, 13, '#fff38a', 0.55 * pulse);
      ctx.save();
      ctx.globalAlpha *= pulse;
      re(ctx, 0, -10, 7, 5.5, '#fff7a0', '#ffe46a', null, { noStroke: true, hl: [-2, -12, 2.4, 1.2], cel: [0, 1.5] });
      ctx.restore();
    }
    // 臉
    const ey = -stemH + 9;
    if (s === 3 && !m.dead && m.hurtT <= 0 && !busy) {
      // 半閉的神秘眼
      [[-2, 3.4], [8, 3.2]].forEach(([x, r]) => {
        eye1(ctx, x, ey + 1, r, 4.4, 'normal', iris, 0.6);
        ctx.fillStyle = A.c(stem[0]);
        ctx.fillRect(x - r - 1, ey - 5, r * 2 + 2, 4.5);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - r - 0.5, ey - 0.5);
        ctx.lineTo(x + r + 0.5, ey - 0.5);
        ctx.stroke();
        // 長睫毛
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + r + 0.3, ey - 0.6);
        ctx.lineTo(x + r + 2, ey - 2);
        ctx.stroke();
      });
    } else {
      faceEyes(ctx, -2, ey, 10, 3.6, 5, m, iris);
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
      ctx.fillStyle = A.c('#ff9a94');
      ctx.beginPath();
      ctx.ellipse(4, my + 1, 1.4, 0.8, 0, 0, TAU);
      ctx.fill();
    } else if (s === 2) {
      smallMouth(ctx, 4, my, false);
      ctx.fillStyle = A.c('#ffffff');
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
      ['#f7923a', '#d86a1f', '#ffd08a', '#b8561a'],
      ['#e8483a', '#b8302a', '#ff9a86', '#94221e'],
      ['#c8f06a', '#94c63e', '#f0ffc0', '#78a632'],
    ];
    const C = caps[s - 1];
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
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, cy - capR * 0.9 + bob, 9, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.strokeStyle = A.c('#b8864a');
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.strokeStyle = A.c('#f0c880');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, cy - capR * 0.9 + bob, 9.4, Math.PI * 1.2, Math.PI * 1.5);
      ctx.stroke();
    }
    rs(ctx, cap, C[0], C[1], C[2], {
      cel: [5, 5],
      rim: 2,
      lw: 3,
      hl: [-capR * 0.45, cy - capR * 0.62 + bob, capR * 0.26, capR * 0.12],
      sheen: [-capR * 0.35, cy - capR * 0.6 + bob, capR * 0.7, 0.28],
      tex: (c) => {
        // 傘緣內側的厚度（菌褶的影子）
        line1(c, (q) => { q.moveTo(-capR - 4, cy + bob); q.quadraticCurveTo(0, cy + 7 + bob, capR + 4, cy + bob); }, C[3], 5, 0.55);
        speckle(c, 0, cy - capR * 0.55 + bob, capR * 1.6, capR * 0.7, 10, 0.7, C[3], 131 + s, 0.25);
      },
    });
    if (s === 1) {
      [[-9, -9, 4.5], [8, -13, 5], [-1, -18, 3.2], [17, -5, 2.8]].forEach(([dx, dy, r]) => {
        re(ctx, dx, cy + dy + bob, r, r * 0.75, '#ffd9a0', '#f2b878', null, { lw: 1.6, hl: false, cel: [r * 0.2, r * 0.2] });
      });
      // 頭頂的捲芽
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2, cy - capR * 0.93 + bob);
      ctx.quadraticCurveTo(-3, cy - capR * 1.25 + bob, 3, cy - capR * 1.28 + bob);
      ctx.stroke();
      ctx.strokeStyle = A.c('#6cae4a');
      ctx.lineWidth = 1;
      ctx.stroke();
      leaf1(ctx, 6, cy - capR * 1.25 + bob + Math.sin(t * 4) * 0.8, 4.5, 2.6, 0.4, '#8fd46a', '#62a845', '#d2f4a8', 1.8);
    } else if (s === 2) {
      [[-14, -9, 5.5], [10, -14, 6.5], [-2, -22, 4.5], [20, -4, 3.8], [-22, -2, 3]].forEach(([dx, dy, r]) => {
        re(ctx, dx, cy + dy + bob, r, r * 0.8, '#fff8ee', '#e8d8cc', '#ffffff', { lw: 1.8, hl: false, cel: [1.5, 1.5], rim: 0.8 });
      });
    } else {
      [[-12, -10, 3.2], [9, -15, 3.6], [-2, -21, 2.8], [18, -5, 2.6], [-20, -3, 2.2]].forEach(([dx, dy, r], i) => {
        const tw = 0.7 + Math.sin(t * 3 + i) * 0.3;
        glow1(ctx, dx, cy + dy + bob, r * 2.2, '#fbffd0', 0.45 * tw);
        ctx.save();
        ctx.globalAlpha *= tw;
        A.ellipse(ctx, dx, cy + dy + bob, r, r, '#fbffd0', null, { noStroke: true, hl: false });
        ctx.fillStyle = A.c('#ffffff');
        ctx.beginPath();
        ctx.arc(dx - r * 0.3, cy + dy + bob - r * 0.3, r * 0.35, 0, TAU);
        ctx.fill();
        ctx.restore();
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
      re(ctx, -6, -2 - Math.max(0, walk), 4.5, 3, '#8a5a2e', '#6a4222', null, { lw: 2, hl: false, cel: [0.8, 0.8] });
      re(ctx, 6, -2 - Math.max(0, -walk), 4.5, 3, '#8a5a2e', '#6a4222', null, { lw: 2, hl: false, cel: [0.8, 0.8] });
      // 種子身體：種皮的縱紋與細點
      re(ctx, 0, -18, 15, 17, '#b8804a', '#8e5e30', '#e8b680', {
        cel: [3, 3],
        rim: 1.6,
        lw: 3,
        sheen: [-5, -25, 10, 0.3],
        tex: (c) => {
          [-9, 9].forEach((x) => line1(c, (q) => { q.moveTo(x * 0.55, -33); q.quadraticCurveTo(x, -18, x * 0.6, -3); }, '#9a6838', 1.3, 0.6));
          speckle(c, 0, -16, 24, 26, 12, 0.7, '#7a4e26', 151, 0.45);
          c.fillStyle = lg1(c, 0, -10, 0, -1, [[0, '#6a4222', 0], [1, '#6a4222', 0.35]]);
          c.fillRect(-16, -10, 32, 10);
        },
      });
      // 頭頂的裂縫（裂口裡露出淺色的嫩肉）
      ctx.fillStyle = A.c('#f0d8a0');
      ctx.beginPath();
      ctx.moveTo(-5, -32.4);
      ctx.lineTo(-3, -30);
      ctx.lineTo(0, -33);
      ctx.lineTo(3, -30);
      ctx.lineTo(5, -32.4);
      ctx.lineTo(0, -34.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
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
      ctx.strokeStyle = A.c('#6cae4a');
      ctx.lineWidth = 1;
      ctx.stroke();
      leaf1(ctx, -7, -42, 8.5, 4.8, -0.6 + sway, '#7cc95a', '#58a13c', '#c8f0a0', 2.2);
      leaf1(ctx, 7, -43, 8.5, 4.8, 0.6 + sway, '#7cc95a', '#58a13c', '#c8f0a0', 2.2);
      faceEyes(ctx, -1, -19, 9, 3.3, 4.4, m, '#6a4a22');
      smallMouth(ctx, 4, -10, m.hurtT > 0);
      A.blush(ctx, -5, -12, 3.2);
      A.blush(ctx, 11, -12, 2.6);
    } else if (s === 2) {
      re(ctx, -6, -3 - Math.max(0, walk), 5, 3.5, '#5a9a3e', '#437a2c', null, { lw: 2, hl: false, cel: [0.8, 0.8] });
      re(ctx, 7, -3 - Math.max(0, -walk), 5, 3.5, '#5a9a3e', '#437a2c', null, { lw: 2, hl: false, cel: [0.8, 0.8] });
      // 藤鞭手臂
      const whip = m.attackT > 0 && m.attackPhase === 'strike' ? 1 : m.attackT > 0 ? -0.3 : 0;
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      const armLen = whip > 0 ? 78 : 16;
      const tipY = -22 + Math.sin(t * 20) * whip * 3;
      ctx.beginPath();
      ctx.moveTo(8, -24);
      ctx.quadraticCurveTo(8 + armLen * 0.5, -34 - whip * 10, 8 + armLen, tipY);
      ctx.stroke();
      ctx.strokeStyle = A.c('#6fbf4a');
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = A.c('#b8e890');
      ctx.lineWidth = 0.9;
      ctx.stroke();
      if (whip > 0) {
        // 藤鞭上的小葉
        for (let k = 1; k <= 3; k++) {
          const u = k / 4;
          const bx = (1 - u) * (1 - u) * 8 + 2 * u * (1 - u) * (8 + armLen * 0.5) + u * u * (8 + armLen);
          const by = (1 - u) * (1 - u) * -24 + 2 * u * (1 - u) * (-34 - whip * 10) + u * u * tipY;
          leaf1(ctx, bx, by - 3, 3, 1.7, -0.6, '#8fd46a', '#62a845', null, 1.4);
        }
        leaf1(ctx, 8 + armLen, -22, 6, 3.5, 0, '#8fd46a', '#62a845', '#d2f4a8');
      } else leaf1(ctx, 25, -22, 4, 2.5, 0.4, '#8fd46a', '#62a845', '#d2f4a8', 1.8);
      // 身體：淺色肚子、細細的莖紋
      re(ctx, 0, -24, 13, 20, '#8fd06a', '#62a845', '#d2f4a8', {
        cel: [3, 3],
        rim: 1.6,
        lw: 3,
        sheen: [-4, -32, 10, 0.3],
        tex: (c) => {
          glow1(c, 2, -15, 11, '#d8f4b0', 0.9);
          c.fillStyle = A.c('#c8ec9a');
          c.beginPath();
          c.ellipse(2, -16, 7, 9, 0, 0, TAU);
          c.fill();
          [-8, 9].forEach((x) => line1(c, (q) => { q.moveTo(x * 0.7, -41); q.quadraticCurveTo(x, -26, x * 0.7, -7); }, '#72b852', 1.1, 0.7));
          speckle(c, 0, -26, 20, 30, 8, 0.7, '#5a9a3e', 173, 0.4);
        },
      });
      // 頭頂捲起的大葉子
      ctx.save();
      ctx.translate(-2, -43);
      ctx.rotate(sway - 0.25);
      rs(
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
        '#c0ec98',
        {
          cel: [2, 2],
          rim: 1.3,
          lw: 2.2,
          tex: (c) => {
            [[4, -8, 1, -13], [8, -12, 7, -18], [11, -14, 14, -19]].forEach(([x0, y0, x1, y1]) => line1(c, (q) => { q.moveTo(x0, y0); q.lineTo(x1, y1); }, '#4f9a35', 0.9, 0.8));
          },
        }
      );
      ctx.strokeStyle = A.c('#3f7f2a');
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(1, -2);
      ctx.quadraticCurveTo(6, -14, 15, -14);
      ctx.stroke();
      ctx.restore();
      leaf1(ctx, -9, -41, 6, 3.2, -0.9 + sway, '#6cc04a', '#4f9a35', '#c0ec98');
      faceEyes(ctx, -1, -29, 9, 3.3, 4.6, m, '#4a7a2a');
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
      re(ctx, -8, -3 - Math.max(0, walk), 6, 4, '#4f7a36', '#3a5e26', null, { lw: 2, hl: false, cel: [1, 1] });
      re(ctx, 8, -3 - Math.max(0, -walk), 6, 4, '#4f7a36', '#3a5e26', null, { lw: 2, hl: false, cel: [1, 1] });
      // 樹枝手臂
      const aim = m.attackT > 0 ? 1 : 0;
      // 射出花瓣時，枝頭後面的粉色柔光
      if (aim) glow1(ctx, 28, -40, 12, '#ff9fc4', 0.45);
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
      ctx.strokeStyle = A.c('#a8845a');
      ctx.lineWidth = 0.9;
      ctx.stroke();
      leaf1(ctx, 24 + aim * 6, -36 - aim * 6, 5.5, 3.5, -0.6, '#86c45e', '#5e9a3e', '#cdeea8');
      leaf1(ctx, -24, -34, 5, 3.2, 0.6, '#86c45e', '#5e9a3e', '#cdeea8');
      // 樹皮身體：縱向樹皮紋、肩上一點苔
      re(ctx, 0, -28, 18, 25, '#7a9e52', '#577a38', '#c0dc8e', {
        cel: [4, 4],
        rim: 1.8,
        lw: 3,
        tex: (c) => {
          [[-12, -10, -14, -20, -10, -30], [-6, -6, -8, -16, -5, -24], [10, -8, 12, -16, 9, -24], [14, -20, 15, -30, 12, -40]].forEach(([a, b, cx, cy2, d, e]) =>
            line1(c, (q) => { q.moveTo(a, b); q.quadraticCurveTo(cx, cy2, d, e); }, '#94b86a', 1, 0.8)
          );
          speckle(c, 0, -26, 30, 40, 14, 0.8, '#4a6e33', 191, 0.45);
          speckle(c, -10, -44, 12, 6, 8, 1, '#a8d070', 211, 0.9);
        },
      });
      // 樹皮紋路
      ctx.strokeStyle = A.c('#4a6e33');
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-12, -10);
      ctx.quadraticCurveTo(-14, -20, -10, -30);
      ctx.moveTo(10, -8);
      ctx.lineTo(9, -15);
      ctx.stroke();
      // 心形臉
      rs(
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
        '#fff6dc',
        { cel: [2, 2], rim: 1.2, lw: 2, sheen: [-2, -33, 7, 0.35] }
      );
      // 花冠
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i / 4) * Math.PI;
        const fx = 2 + Math.cos(a) * 17;
        const fy = -50 + Math.sin(a) * 9 + Math.sin(t * 3 + i) * 1;
        const pc = i % 2 ? ['#ffc0d8', '#f294b8'] : ['#ff9fc4', '#e676a4'];
        for (let k = 0; k < 5; k++) {
          const pa = (k / 5) * Math.PI * 2 + t * 0.5;
          re(ctx, fx + Math.cos(pa) * 4, fy + Math.sin(pa) * 4, 3.6, 3.6, pc[0], pc[1], null, { lw: 1.5, hl: false, cel: [0.8, 0.9] });
        }
        re(ctx, fx, fy, 2.6, 2.6, '#ffd84a', '#e8a82a', null, { lw: 1.2, hl: [fx - 0.9, fy - 1, 0.9, 0.6], hlA: 0.9, cel: [0.5, 0.5] });
      }
      faceEyes(ctx, -1, -30, 9, 3.2, 4.4, m, '#b04a78');
      smallMouth(ctx, 4, -22, m.attackT > 0 || m.hurtT > 0);
      A.blush(ctx, -4, -24, 2.8);
      A.blush(ctx, 11, -24, 2.4);
    }
    ctx.restore();
  }

  // ── Boss：菇菇女王（古森的菇菇母后）──
  // 設計高 280（m.h 不同時等比例縮放），原點在腳底中央、面向右（+x）。
  // 一座會走路的老森林：傘蓋是長滿苔蘚、小蕨、小菇與發光斑點的樹冠，傘緣垂著松蘿「長髮」與藤蔓；
  // 背後是白色網紗（竹蓀的菌裙）當披風，裙擺往下變成樹根與苔蘚鋪成的長裙襬；
  // 頭頂是枝椏長成的王冠，中間嵌著發綠光的星楓葉。一手按在胸口，一手握著頂端掛著發光孢子燈的活樹杖。
  // 第二階段（p2k 0→1）：傘蓋轉成深酒紫、苔蘚瘋長變暗、葉子的綠光變成血管般的裂紋爬滿全身，
  //   荊棘纏上裙子與權杖、傘緣長出棘刺、眼睛發綠光；死亡時（被解放）顏色慢慢退回溫柔的樣子。
  const QN = {
    cap: '#b03a74', capS: '#7c2352', cap2: '#521848', cap2S: '#300a2c',
    gill: '#d99ab2', gillS: '#a86a88', gill2: '#6e3a62', gill2S: '#44203e',
    moss: '#62983a', mossS: '#3f6c24', moss2: '#3e5e26', moss2S: '#243a14',
    stalk: '#f5ead2', stalkS: '#d8c39c', stalk2: '#d9ccbc', stalk2S: '#a8958a',
    bark: '#8a6440', barkS: '#5f422a', bark2: '#4a3028', bark2S: '#2c1a16',
    lace: '#fffaf0', lace2: '#c8b8d8', lichen: '#d4e3a8', lichenS: '#a4bb76', lichen2: '#8aa070', lichen2S: '#5a6e48',
    gold: '#ffd35a', goldS: '#d8962a', spot: '#fff4de', spot2: '#d6ff9a',
    glow: '#c9ff8a', corr: '#8cff3a', leaf: '#7dff5a', leafS: '#3fc03a', ff: '#f2ff8a',
    brk: '#e9a24e', brkS: '#b46e2c', brk2: '#8a4a5a', brk2S: '#5a2a3a', thorn: '#2a1424',
    fl1: '#ffb8d8', fl2: '#fff6c0',
  };
  const QTAU = Math.PI * 2;
  const qcl = (v, a, b) => (v < a ? a : v > b ? b : v);
  function qHash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function qGlow(ctx, x, y, r, hex, a) {
    if (!(a > 0) || !(r > 0)) return;
    if (G.lowFx && r < 30) return; // 省效能模式（手機）：螢火蟲之類的小柔光不畫
    const rgb = G.util.hexToRgb(A.c(hex)).join(',');
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, QTAU);
    ctx.fill();
  }
  function qQuad(x0, y0, x1, y1, x2, y2) {
    return (s) => {
      const u = 1 - s;
      return [u * u * x0 + 2 * u * s * x1 + s * s * x2, u * u * y0 + 2 * u * s * y1 + s * s * y2];
    };
  }
  // 沿中心線 fn(s) 的漸細形狀（樹根、藤蔓、枝椏）
  function qTaper(c, fn, wf, n) {
    n = n || 16;
    const L = [];
    const R = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const p = fn(s);
      const q = fn(Math.min(1, s + 0.02));
      const o = fn(Math.max(0, s - 0.02));
      let dx = q[0] - o[0];
      let dy = q[1] - o[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const w = (typeof wf === 'function' ? wf(s) : wf) / 2;
      L.push([p[0] - dy * w, p[1] + dx * w]);
      R.push([p[0] + dy * w, p[1] - dx * w]);
    }
    c.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) c.lineTo(L[i][0], L[i][1]);
    for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
    c.closePath();
  }
  // 帶描邊的粗線
  function qLimb(ctx, path, w, col) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = Math.max(1, w - 5);
    ctx.stroke();
  }
  // 小葉子
  function qLeaf(ctx, x, y, s, ang, col, colS) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    A.shape(ctx, (c) => {
      c.moveTo(0, 0);
      c.quadraticCurveTo(s * 0.5, -s * 0.42, s, 0);
      c.quadraticCurveTo(s * 0.5, s * 0.42, 0, 0);
      c.closePath();
    }, col, colS, { lw: 1.6, shadeY: 0 });
    ctx.restore();
  }
  // 蕨葉：一根彎曲的莖＋兩排小葉
  function qFern(ctx, x, y, len, ang, curl, col, colS) {
    const fn = (s) => {
      const a = ang + curl * s;
      return [x + Math.cos(ang + curl * s * 0.5) * len * s, y + Math.sin(ang + curl * s * 0.5) * len * s, a];
    };
    for (let i = 1; i <= 6; i++) {
      const s = i / 7;
      const p = fn(s);
      const L = len * 0.3 * (1 - s * 0.7);
      qLeaf(ctx, p[0], p[1], L, p[2] - 1.1, col, colS);
      qLeaf(ctx, p[0], p[1], L, p[2] + 1.1, col, colS);
    }
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const p = fn(i / 8);
      if (i) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
  }
  // 小蘑菇（長在苔蘚、樹根、傘蓋上）
  function qShroomlet(ctx, x, y, s, ang, cap, capS, stem, glowCol, glowA) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    if (glowA > 0) qGlow(ctx, 0, -s * 1.3, s * 2.4, glowCol, glowA);
    A.shape(ctx, (c) => A.roundRect(c, -s * 0.24, -s * 1.2, s * 0.48, s * 1.2, s * 0.2), stem, null, { lw: 1.6 });
    A.shape(ctx, (c) => {
      c.moveTo(-s * 0.72, -s * 1.08);
      c.bezierCurveTo(-s * 0.72, -s * 1.9, s * 0.72, -s * 1.9, s * 0.72, -s * 1.08);
      c.quadraticCurveTo(0, -s * 0.9, -s * 0.72, -s * 1.08);
      c.closePath();
    }, cap, capS, { lw: 1.8, shadeY: -s * 1.2 });
    ctx.fillStyle = A.c(QN.spot);
    ctx.beginPath();
    ctx.arc(-s * 0.2, -s * 1.5, s * 0.13, 0, QTAU);
    ctx.arc(s * 0.3, -s * 1.3, s * 0.1, 0, QTAU);
    ctx.fill();
    ctx.restore();
  }
  // 層孔菌（一層層的半圓棚架）
  function qBracket(ctx, x, y, w, side, col, colS, n) {
    for (let i = 0; i < (n || 3); i++) {
      const ww = w * (1 - i * 0.22);
      const yy = y + i * w * 0.34;
      A.shape(ctx, (c) => {
        c.moveTo(x, yy - ww * 0.16);
        c.quadraticCurveTo(x + side * ww * 1.05, yy - ww * 0.28, x + side * ww, yy + ww * 0.06);
        c.quadraticCurveTo(x + side * ww * 0.5, yy + ww * 0.26, x, yy + ww * 0.12);
        c.closePath();
      }, col, colS, { lw: 2, shadeY: yy + ww * 0.02 });
      ctx.strokeStyle = A.c(colS);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + side * ww * 0.2, yy - ww * 0.1);
      ctx.quadraticCurveTo(x + side * ww * 0.75, yy - ww * 0.16, x + side * ww * 0.82, yy - ww * 0.02);
      ctx.stroke();
    }
  }
  // 小花
  function qFlower(ctx, x, y, r, col, core) {
    ctx.fillStyle = A.c(col);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * QTAU) / 5 - Math.PI / 2;
      ctx.moveTo(x + Math.cos(a) * r * 1.5 + r * 0.55, y + Math.sin(a) * r * 1.5);
      ctx.arc(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.62, 0, QTAU);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = A.c(core);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, QTAU);
    ctx.fill();
  }
  // 發光的裂紋：外暈 → 深色描邊 → 亮色 → 白熱芯
  function qVein(ctx, path, col, heat, w) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path(ctx);
    const rgb = G.util.hexToRgb(A.c(col)).join(',');
    ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.3 * heat).toFixed(3) + ')';
    ctx.lineWidth = w * 3.6;
    ctx.stroke();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + 2.4;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = w;
    ctx.stroke();
    if (heat > 0.5) {
      ctx.strokeStyle = A.c('#f4ffe0');
      ctx.lineWidth = Math.max(1, w * 0.36);
      ctx.stroke();
    }
  }
  // 樹枝狀的裂紋路徑（固定種子）
  function qCrack(c, x, y, ang, len, seg, seed) {
    let px = x;
    let py = y;
    c.moveTo(px, py);
    let mid = null;
    for (let i = 1; i <= seg; i++) {
      const a = ang + (qHash(seed + i * 3.7) - 0.5) * 1.1;
      const l = (len / seg) * (0.7 + qHash(seed + i) * 0.6);
      px += Math.cos(a) * l;
      py += Math.sin(a) * l;
      c.lineTo(px, py);
      if (i === Math.ceil(seg / 2)) mid = [px, py];
    }
    if (mid) {
      const a = ang + (qHash(seed + 9.1) > 0.5 ? 0.8 : -0.8);
      c.moveTo(mid[0], mid[1]);
      c.lineTo(mid[0] + Math.cos(a) * len * 0.32, mid[1] + Math.sin(a) * len * 0.32);
    }
  }
  // 荊棘藤：沿曲線的深色藤＋一排尖刺
  function qBramble(ctx, fn, w, seed, grow) {
    const g = qcl(grow, 0, 1);
    if (g <= 0.02) return;
    const f = (s) => fn(s * g);
    A.shape(ctx, (c) => qTaper(c, f, (s) => w * (1 - s * 0.6), 20), QN.thorn, null, { lw: 2 });
    ctx.fillStyle = A.c(QN.thorn);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.4;
    for (let i = 1; i < 7; i++) {
      const s = i / 7;
      const p = f(s);
      const q = f(Math.min(1, s + 0.03));
      const a = Math.atan2(q[1] - p[1], q[0] - p[0]) + (i % 2 ? -1.2 : 1.2);
      const L = w * (1.3 - s * 0.5) * (0.8 + qHash(seed + i) * 0.4);
      ctx.beginPath();
      ctx.moveTo(p[0] + Math.cos(a + 1.5) * w * 0.35, p[1] + Math.sin(a + 1.5) * w * 0.35);
      ctx.lineTo(p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L);
      ctx.lineTo(p[0] - Math.cos(a + 1.5) * w * 0.35, p[1] - Math.sin(a + 1.5) * w * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }


  // 用中點二次曲線把一串點連成平滑的封閉形
  function qBlob(c, pts) {
    const n = pts.length;
    const mid = (i) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    const s = mid(n - 1);
    c.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) {
      const e = mid(i);
      c.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]);
    }
    c.closePath();
  }
  // 傘蓋外形（設計座標）：兩段三次貝茲，u 0→1 由左到右
  const QCAP = { w: 178, top: -364, rim: -240, droop: 26 };
  const qRimY = (x) => QCAP.rim + (x / QCAP.w) * (x / QCAP.w) * QCAP.droop;
  function qDome(u) {
    const W = QCAP.w;
    const y0 = qRimY(W);
    let s;
    let P;
    if (u < 0.5) {
      s = u * 2;
      P = [[-W, y0], [-W - 4, -316], [-104, QCAP.top], [0, QCAP.top]];
    } else {
      s = u * 2 - 1;
      P = [[0, QCAP.top], [104, QCAP.top], [W + 4, -316], [W, y0]];
    }
    const v = 1 - s;
    const a = v * v * v;
    const b = 3 * v * v * s;
    const c = 3 * v * s * s;
    const d = s * s * s;
    return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
  }

  function queen(ctx, m) {
    const U = G.util;
    const t = m.t || 0;
    const st = m.state;
    const K = (m.h || 280) / 340;
    const LIFT = 24; // 上半身往上提：腰以下的樹幹更高
    const GS = (160 + LIFT) / 160;
    const dead = !!m.dead;
    const p2raw = m.p2k != null ? m.p2k : m.enraged ? 1 : 0;
    // 被打倒＝被解放：詛咒的顏色慢慢退掉
    const pv = dead ? p2raw * qcl(1 - (m.deadT || 0) * 1.4, 0, 1) : p2raw;
    const mix = (a, b) => (pv <= 0 ? a : pv >= 1 ? b : U.mix(a, b, pv));
    const ga = ctx.globalAlpha;
    const alpha = (a) => {
      ctx.globalAlpha = ga * qcl(a, 0, 1);
    };
    const prog = m.stateT0 ? qcl(1 - (m.stateT || 0) / m.stateT0, 0, 1) : 0;
    const elapsed = (m.stateT0 || 0) - (m.stateT || 0);

    // ── 狀態 → 姿勢 ──
    const prep = st === 'slamPrep' || st === 'divePrep' || st === 'spinPrep' || st === 'perchPrep' || st === 'stormPrep';
    const airSt = st === 'slamAir' || st === 'perchAir' || st === 'stormAir' || st === 'fall' || (st === 'move' && m.onGround === false);
    let sy = 1;
    if (prep) sy = 0.87 + Math.sin(t * 40) * 0.01;
    else if (airSt) sy = (m.vy || 0) < 0 ? 1.09 : 1.03;
    else if (st === 'recover') sy = 0.93 + Math.min(1, elapsed / 0.3) * 0.07;
    else if (st === 'transform') sy = 1 + Math.sin(t * 30) * 0.02 + pv * 0.04;
    else sy = 1 + Math.sin(t * 1.8) * 0.012;
    const spin = st === 'spin' && !dead;
    const intro = st === 'intro' && (m.stateT || 0) > 0.7;
    // 權杖姿勢：rest 拄著、raise 高舉、storm 雙手高舉、point 指向前方、smash 雙手舉杖、wide 張開、summon 手按地、lean 倚杖喘氣、air 跳躍
    let pose = 'rest';
    if (st === 'rain' || st === 'stormPrep' || st === 'transform') pose = 'raise';
    else if (st === 'storm' || st === 'stormAir') pose = 'storm';
    else if (st === 'spore') pose = 'point';
    else if (st === 'slamPrep' || st === 'divePrep' || st === 'slamAir' || st === 'perchPrep') pose = 'smash';
    else if (st === 'spinPrep' || spin) pose = 'wide';
    else if (st === 'summon') pose = 'summon';
    else if (st === 'recover' || dead) pose = 'lean';
    else if (airSt) pose = 'air';
    const fierce = !dead && (pv > 0.5 || prep || st === 'slamAir' || spin);
    const hurt = !dead && (m.hurtFlash || 0) > 0.05;
    const sway = Math.sin(t * 1.6);
    let tilt = sway * 0.012; // 頭（傘蓋）的傾斜
    if (pose === 'point') tilt = 0.07;
    else if (pose === 'storm' || pose === 'raise') tilt = -0.05;
    else if (pose === 'lean') tilt = dead ? 0.1 : 0.07;
    else if (pose === 'smash') tilt = 0.05;
    else if (pose === 'wide') tilt = -0.07;
    if (hurt) tilt -= 0.04;
    const big = pose === 'raise' || pose === 'storm';
    const gleam = dead ? 0 : 0.55 + 0.2 * Math.sin(t * 2.4) + (big ? 0.35 : 0) + pv * 0.25;
    const glowC = mix(QN.glow, QN.corr);
    const mossC = mix(QN.moss, QN.moss2);
    const mossS = mix(QN.mossS, QN.moss2S);
    const leafC = mix('#8ccc56', '#4a6a2a');
    const leafS = mix('#5f9a34', '#2e4a1c');
    const woodC = mix('#946038', '#3a2226');
    const woodS = mix('#62401f', '#22121a');
    const skin = mix(QN.stalk, QN.stalk2);
    const skinS = mix(QN.stalkS, QN.stalk2S);

    ctx.save();
    ctx.scale(K, K);
    // 地上的大影子
    ctx.fillStyle = 'rgba(30,20,10,0.2)';
    ctx.beginPath();
    ctx.ellipse(-24, 0, 170, 20, 0, 0, QTAU);
    ctx.fill();
    // 腳下的菌絲光圈（召喚時亮起來）
    if (!dead) {
      const myc = st === 'summon' ? 0.5 + 0.5 * prog : 0.2 + pv * 0.15;
      ctx.save();
      ctx.scale(1, 0.2);
      qGlow(ctx, 0, 0, 210, glowC, 0.25 * myc);
      ctx.strokeStyle = 'rgba(' + U.hexToRgb(A.c(glowC)).join(',') + ',' + (0.5 * myc).toFixed(3) + ')';
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.35 + i / 3) % 1;
        ctx.beginPath();
        ctx.arc(0, 0, 70 + q * 150, 0, QTAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (spin) {
      const c = Math.cos(t * 30);
      ctx.scale((c >= 0 ? 1 : -1) * (0.55 + 0.45 * Math.abs(c)), 0.94);
    }
    ctx.scale(1 / Math.sqrt(sy), sy);

    // ─ 背後的光：林間光束（第一階段）／腐化的光暈（第二階段）─
    if (!dead) {
      qGlow(ctx, 0, -240, 250, mix('#f6ffb0', '#6a2a8a'), 0.28 + pv * 0.25 + (pose === 'storm' ? 0.2 : 0));
      if (pv < 0.95) {
        ctx.save();
        ctx.fillStyle = A.c('#fffbe0');
        for (let i = 0; i < 5; i++) {
          alpha((1 - pv) * (0.07 + 0.04 * Math.sin(t * 1.1 + i * 1.7)));
          const x = -170 + i * 80 + Math.sin(t * 0.4 + i) * 6;
          ctx.beginPath();
          ctx.moveTo(x - 8, -380);
          ctx.lineTo(x + 14 + i * 2, -380);
          ctx.lineTo(x + 6 + i * 4, 0);
          ctx.lineTo(x - 36 - i * 3, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        alpha(1);
      }
      if (pv > 0.05) {
        qGlow(ctx, 0, -290, 170, QN.corr, 0.2 * pv + (pose === 'storm' ? 0.2 : 0));
        for (let i = 0; i < 12; i++) {
          const a = t * 0.9 + (i * QTAU) / 12;
          const r = 195 + Math.sin(t * 2.2 + i) * 12;
          alpha(pv * 0.8);
          ctx.fillStyle = A.c(i % 2 ? QN.corr : '#c070ff');
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r, -190 + Math.sin(a) * r * 0.45, 2.5 + (i % 3), 0, QTAU);
          ctx.fill();
        }
        alpha(1);
      }
    }

    ctx.save();
    ctx.scale(1, GS);
    // ─ 苔絨長披風（身體後面，往後拖成裙襬；下緣是竹蓀網紗般的蕾絲）─
    const cape = Math.sin(t * 1.4) * 5 + (spin ? 18 : 0) + (airSt ? ((m.vy || 0) < 0 ? -14 : 10) : 0);
    const cloakL = (c) => {
      c.quadraticCurveTo(-104, -178, -132 - cape * 0.5, -140);
      c.bezierCurveTo(-154 - cape, -104, -172 - cape, -58, -184 - cape, -34);
      c.quadraticCurveTo(-198 - cape, -12, -232 - cape * 1.3, -2);
    };
    const cloakR = (c) => {
      c.bezierCurveTo(118, -50, 112, -118, 108, -148);
      c.quadraticCurveTo(84, -178, 40, -180);
    };
    const cloakPath = (c) => {
      c.moveTo(-40, -180);
      cloakL(c);
      c.quadraticCurveTo(-120, 4, -20, -2);
      c.quadraticCurveTo(60, 2, 122, -4);
      cloakR(c);
      c.quadraticCurveTo(0, -190, -40, -180);
      c.closePath();
    };
    const clC = mix('#2a5a3c', '#2c2040');
    const clS = mix('#1a3e28', '#170f26');
    A.shape(ctx, cloakPath, clC, clS, { cel: [-14, -4], lw: 2.8 });
    ctx.save();
    ctx.beginPath();
    cloakPath(ctx);
    ctx.clip();
    // 絨布的縱向褶
    ctx.strokeStyle = A.c(clS);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const x = -60 - i * 26;
      ctx.moveTo(-40 - i * 8, -170);
      ctx.quadraticCurveTo(x + 10, -90, x - cape * (i / 6), -10);
    }
    ctx.stroke();
    // 金線刺繡的楓葉
    [[-96, -120, 8], [-130, -70, 7], [-70, -60, 6], [-160, -30, 6], [84, -80, 6]].forEach(([x, y, r]) => {
      ctx.save();
      ctx.translate(x - cape * 0.3, y);
      ctx.rotate(0.3);
      A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, r), mix(QN.gold, '#8a6a3a'), null, { lw: 1.4 });
      ctx.restore();
    });
    // 下緣的蕾絲網紗帶
    const laceTop = (x) => -42 + Math.sin(x * 0.12) * 4 + (x < -150 ? (x + 150) * 0.25 : 0);
    const lacePath = (c) => {
      c.moveTo(-260, 10);
      for (let x = -260; x <= 130; x += 13) c.lineTo(x, laceTop(x));
      c.lineTo(130, 10);
      c.closePath();
    };
    A.shape(ctx, lacePath, mix('#f4f0dc', '#b8a8cc'), mix('#d6d0b0', '#7a6a98'), { shadeY: -10, lw: 2 });
    ctx.beginPath();
    lacePath(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c(mix('#c0b890', '#5a4a78'));
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const hx = 9;
    for (let r = 0; r < 7; r++) {
      for (let q = 0; q < 30; q++) {
        const cx = -260 + q * hx * 1.5;
        const cy = -80 + r * hx * 1.72 + (q % 2) * hx * 0.86;
        for (let k = 0; k <= 6; k++) {
          const a = (k * QTAU) / 6;
          const px = cx + Math.cos(a) * hx * 0.62;
          const py = cy + Math.sin(a) * hx * 0.62;
          if (k) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
      }
    }
    ctx.stroke();
    ctx.restore();
    // 金色滾邊
    ctx.save();
    ctx.beginPath();
    cloakPath(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c(QN.gold);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-40, -180);
    cloakL(ctx);
    ctx.moveTo(122, -4);
    cloakR(ctx);
    ctx.stroke();
    if (pv > 0.05) {
      alpha(pv);
      qVein(ctx, (c) => {
        qCrack(c, -80, -170, 2.1, 110, 4, 11);
        qCrack(c, -120, -120, 2.0, 90, 4, 17);
        qCrack(c, 70, -150, 1.4, 90, 4, 19);
      }, QN.corr, 0.6 + 0.3 * Math.sin(t * 5), 2);
      alpha(1);
    }
    ctx.restore();

    ctx.restore(); // 披風
    // ─ 板根（像老樹一樣從裙擺長進土裡）＋往後拖的長裙襬 ─
    const writhe = pv * Math.sin(t * 3) * 6;
    const roots = [
      [-52, -70, -140, -80, -214, 2, 30, 0],
      [-40, -40, -96, -36, -150, 4, 28, 1],
      [40, -46, 84, -40, 132, 2, 22, 2],
      [20, -24, 44, -8, 70, 4, 16, 3],
    ];
    roots.forEach(([x0, y0, x1, y1, x2, y2, w, i]) => {
      const wr = writhe * (i % 2 ? 1 : -1);
      const fn = qQuad(x0, y0, x1, y1 + wr, x2, y2 + wr * 0.5);
      A.shape(ctx, (c) => qTaper(c, fn, (s) => w * (1 - s * 0.7), 18), mix(QN.bark, QN.bark2), mix(QN.barkS, QN.bark2S), { cel: [0, -5], lw: 2.6 });
      ctx.strokeStyle = A.c(mix(QN.barkS, QN.bark2S));
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 1; k < 6; k++) {
        const p = fn(k * 0.15);
        const q = fn(k * 0.15 + 0.07);
        ctx.moveTo(p[0], p[1] - w * 0.12);
        ctx.lineTo(q[0], q[1] - w * 0.1);
      }
      ctx.stroke();
      [0.3, 0.62].forEach((k, j) => {
        const q = fn(k);
        A.ellipse(ctx, q[0], q[1] - w * 0.36 * (1 - k * 0.7), w * 0.5, w * 0.2 + 2, mossC, mossS, { lw: 1.8, hl: false, shadeAt: 0.1 });
        if ((i + j) % 2 === 0 && pv < 0.6) qFlower(ctx, q[0] + 4, q[1] - w * 0.45 * (1 - k * 0.7), 2.4, j ? QN.fl2 : QN.fl1, QN.gold);
      });
      if (i === 4 && pv > 0.05) {
        alpha(pv);
        const e = fn(1);
        qGlow(ctx, e[0], e[1], 16, QN.corr, 0.6);
        alpha(1);
      }
    });
    // 苔蘚墊＋小花＋小蘑菇＋蕨
    const mossPad = (x, y, rx, ry) => A.shape(ctx, (c) => {
      c.moveTo(x - rx, y + ry * 0.4);
      for (let k = 0; k <= 5; k++) {
        const xx = x - rx + (k * rx * 2) / 5;
        c.quadraticCurveTo(xx - rx / 5, y - ry * (0.9 + (k % 2) * 0.5), xx, y - ry * 0.2);
      }
      c.quadraticCurveTo(x, y + ry, x - rx, y + ry * 0.4);
      c.closePath();
    }, mossC, mossS, { lw: 2.2, shadeY: y });
    qFern(ctx, -176, -8, 50, -2.1, 0.9, leafC, leafS);
    qFern(ctx, 110, -4, 40, -0.9, -0.7, leafC, leafS);
    qFern(ctx, -60, -8, 34, -1.9, 0.5, leafC, leafS);
    mossPad(-210, -2, 22, 8);
    mossPad(-160, -2, 34, 10);
    mossPad(-104, -2, 30, 9);
    mossPad(128, -2, 22, 8);
    mossPad(78, -2, 16, 6);
    if (pv < 0.6) {
      alpha(1 - pv / 0.6);
      qFlower(ctx, -132, -12, 3.6, QN.fl1, QN.gold);
      qFlower(ctx, -190, -10, 3, QN.fl2, '#ff9a5a');
      qFlower(ctx, 124, -9, 3, QN.fl1, QN.gold);
      qFlower(ctx, -96, -10, 2.6, QN.fl2, '#ff9a5a');
      qFlower(ctx, 86, -8, 2.4, QN.fl2, '#ff9a5a');
      alpha(1);
    }
    qShroomlet(ctx, -156, -10, 12, -0.15, mix('#d8589a', '#5a1848'), mix('#a83c72', '#360c2c'), QN.stalk, glowC, 0.25 + pv * 0.35);
    qShroomlet(ctx, -141, -8, 7, 0.2, mix('#d8589a', '#5a1848'), mix('#a83c72', '#360c2c'), QN.stalk, glowC, 0.15 + pv * 0.3);
    qShroomlet(ctx, 136, -6, 9, 0.25, mix('#e9a24e', '#6a2a3a'), mix('#b46e2c', '#3a1424'), QN.stalk, glowC, 0.15 + pv * 0.3);

    // ─ 肩膀、手、權杖的位置 ─
    const shL = [-38, -152];
    const shR = [38, -152];
    let staffB;
    let staffT;
    let gripR;
    let handL;
    let gripL = null;
    const bob = sway * 2;
    switch (pose) {
      case 'raise':
        staffB = [104, -110];
        staffT = [112, -390];
        gripR = 0.2;
        handL = [-86, -250 + bob];
        break;
      case 'storm':
        staffB = [108, -124];
        staffT = [120, -404];
        gripR = 0.18;
        handL = [-104, -268];
        break;
      case 'point':
        staffB = [34, -110];
        staffT = [226, -250];
        gripR = 0.3;
        handL = [-64, -140];
        break;
      case 'smash':
        staffB = [84, -226];
        staffT = [-60, -398];
        gripR = 0.08;
        gripL = 0.34;
        break;
      case 'wide':
        staffB = [160, -170];
        staffT = [276, -170];
        gripR = 0.06;
        handL = [-140, -172];
        break;
      case 'summon':
        staffB = [96, -4];
        staffT = [104, -290];
        gripR = 0.5;
        handL = [-116, -80 + Math.sin(t * 8) * 2];
        break;
      case 'lean':
        staffB = [100, -4];
        staffT = [70, -284];
        gripR = 0.52;
        handL = [66, -140];
        break;
      case 'air':
        staffB = [100, -70];
        staffT = [110, -352];
        gripR = 0.28;
        handL = [-78, -190];
        break;
      default:
        staffB = [96, -4];
        staffT = [100 + sway * 2, -292];
        gripR = 0.5;
        handL = pv > 0.5 ? [-86, -100 + bob] : [-2, -128 + bob];
    }
    if (staffB[1] > -10) staffB[1] += LIFT; // 拄在地上的權杖（上半身座標）
    const sAt = (k) => [staffB[0] + (staffT[0] - staffB[0]) * k, staffB[1] + (staffT[1] - staffB[1]) * k];
    const handR = sAt(gripR);
    if (gripL != null) handL = sAt(gripL);
    const drawArm = (sh, hd, bend, front) => {
      const mx = (sh[0] + hd[0]) / 2 + bend[0];
      const my = (sh[1] + hd[1]) / 2 + bend[1];
      qLimb(ctx, (c) => {
        c.moveTo(sh[0], sh[1]);
        c.quadraticCurveTo(mx, my, hd[0], hd[1]);
      }, 18, skin);
      // 苔蘚袖口
      const s = 0.72;
      const px = (1 - s) * (1 - s) * sh[0] + 2 * (1 - s) * s * mx + s * s * hd[0];
      const py = (1 - s) * (1 - s) * sh[1] + 2 * (1 - s) * s * my + s * s * hd[1];
      A.shape(ctx, (c) => {
        c.ellipse(px, py, 12, 7, Math.atan2(hd[1] - sh[1], hd[0] - sh[0]) + Math.PI / 2, 0, QTAU);
      }, mossC, mossS, { lw: 2, shadeY: py + 2 });
      A.ellipse(ctx, hd[0], hd[1], 10.5, 9.5, skin, skinS, { hl: false, cel: [2, 2], lw: 2.4 });
      if (front && pv > 0.5 && pose === 'rest') {
        // 第二階段：垂著的手指間透出綠光
        qGlow(ctx, hd[0], hd[1] + 6, 26, QN.corr, 0.5 * pv);
      }
    };

    ctx.save();
    ctx.translate(0, -LIFT);
    // ─ 身後的松蘿長髮（跟著頭一起傾斜）─
    ctx.save();
    ctx.translate(0, -166);
    ctx.rotate(tilt);
    ctx.translate(0, 166);
    [-1, 1].forEach((sd) => {
      const L = sd < 0 ? 150 : 104;
      const sw = Math.sin(t * 1.3 + sd) * 5 + (spin ? sd * 16 : 0) - cape * 0.3;
      A.shape(ctx, (c) => {
        c.moveTo(sd * 30, -232);
        c.bezierCurveTo(sd * 80, -220, sd * 76 + sw * 0.5, -200 + L * 0.4, sd * 64 + sw, -226 + L);
        const n = 5;
        for (let k = 0; k < n; k++) {
          const xa = sd * 64 + sw - sd * k * 7;
          const xb = sd * 64 + sw - sd * (k + 1) * 7;
          c.quadraticCurveTo((xa + xb) / 2, -226 + L + 12 - (k % 2) * 6, xb, -226 + L - (k + 1) * 4);
        }
        c.quadraticCurveTo(sd * 40, -200 + L * 0.4, sd * 26, -200);
        c.closePath();
      }, mix(QN.lichen, QN.lichen2), mix(QN.lichenS, QN.lichen2S), { cel: [sd * 5, 2], lw: 2.4 });
      ctx.strokeStyle = A.c(mix(QN.lichenS, QN.lichen2S));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        ctx.moveTo(sd * (40 + k * 7), -222);
        ctx.quadraticCurveTo(sd * (56 + k * 5) + sw * 0.4, -200 + L * 0.4, sd * (44 + k * 5) + sw * 0.9, -236 + L - k * 4);
      }
      ctx.stroke();
    });
    ctx.restore();

    // 左手（後面那隻）
    const leftFront = pose === 'rest' || pose === 'smash' || pose === 'lean';
    if (!leftFront) drawArm(shL, handL, pose === 'summon' ? [-8, 20] : pose === 'wide' ? [0, -10] : [-16, 8], false);

    ctx.restore(); // 頭髮
    ctx.save();
    ctx.scale(1, GS);
    // ─ 菌柄長禮服：腰以下像老樹的樹幹一樣往外張開、長成板根扎進土裡 ─
    const flare = spin ? 18 : airSt ? -8 : 0;
    const gownPath = (c) => {
      c.moveTo(-34, -160);
      c.bezierCurveTo(-40, -96, -52, -42, -124 - flare, -4);
      c.quadraticCurveTo(-60, 5, -8, -2);
      c.quadraticCurveTo(52, 5, 116 + flare, -4);
      c.bezierCurveTo(48, -42, 40, -96, 34, -160);
      c.closePath();
    };
    // 前面的板根
    [[-40, -30, -96, -40, -140, 4, 26, 1], [30, -28, 76, -34, 112, 4, 24, -1], [-6, -20, -14, -12, -26, 6, 20, 1]].forEach(([x0, y0, x1, y1, x2, y2, w, sd], i) => {
      const fn = qQuad(x0, y0, x1, y1, x2, y2);
      A.shape(ctx, (c) => qTaper(c, fn, (s) => w * (1 - s * 0.88), 14), mix(QN.bark, QN.bark2), mix(QN.barkS, QN.bark2S), { cel: [4, -3], lw: 2.6 });
      ctx.strokeStyle = A.c(mix(QN.barkS, QN.bark2S));
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const q0 = fn(0.2);
      const q1 = fn(0.8);
      ctx.moveTo(q0[0], q0[1] - w * 0.12);
      ctx.lineTo(q1[0], q1[1] - w * 0.08);
      ctx.stroke();
      const q = fn(0.5);
      A.ellipse(ctx, q[0], q[1] - w * 0.3, w * 0.55, w * 0.2 + 2, mossC, mossS, { lw: 1.8, hl: false, shadeAt: 0.1 });
      if (pv < 0.6 && i < 2) {
        alpha(1 - pv / 0.6);
        qFlower(ctx, q[0] - sd * 6, q[1] - w * 0.46, 2.8, i ? QN.fl2 : QN.fl1, QN.gold);
        alpha(1);
      }
    });
    A.shape(ctx, gownPath, skin, skinS, { cel: [12, 3], hl: [-16, -128, 6, 20] });
    ctx.save();
    ctx.beginPath();
    gownPath(ctx);
    ctx.clip();
    // 菌柄的纖維紋：腰部收緊、往下散開
    ctx.strokeStyle = A.c(mix('#e2cfa8', '#9a8a80'));
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -5; i <= 5; i++) {
      ctx.moveTo(i * 6, -158);
      ctx.bezierCurveTo(i * 7, -110, i * 9, -70, i * 22 + (i < 0 ? -8 : 8), 0);
    }
    ctx.stroke();
    // 下半部的樹皮
    const barkTop = (x) => -74 + Math.sin(x * 0.09 + 1) * 8 + Math.abs(x) * 0.28;
    const barkPath = (c) => {
      c.moveTo(-140, 10);
      for (let x = -140; x <= 140; x += 10) c.lineTo(x, barkTop(x));
      c.lineTo(140, 10);
      c.closePath();
    };
    A.shape(ctx, barkPath, mix(QN.bark, QN.bark2), mix(QN.barkS, QN.bark2S), { cel: [10, 0], lw: 2.4 });
    // 樹皮的縱向溝紋（沿著樹幹張開的方向）
    ctx.strokeStyle = A.c(mix(QN.barkS, QN.bark2S));
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = -4; i <= 4; i++) {
      const x0 = i * 13;
      ctx.moveTo(x0, barkTop(x0) + 8);
      ctx.bezierCurveTo(x0 * 1.1, -40, x0 * 1.8, -20, x0 * 3 + (i < 0 ? -6 : 6), 2);
    }
    ctx.stroke();
    ctx.strokeStyle = A.c(mix('#a07a52', '#5a3e34'));
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      const x0 = i * 13 + 6;
      ctx.moveTo(x0, barkTop(x0) + 16);
      ctx.bezierCurveTo(x0 * 1.1, -40, x0 * 1.7, -24, x0 * 2.6, -8);
    }
    ctx.stroke();
    if (pv > 0.05) {
      alpha(pv);
      qVein(ctx, (c) => {
        qCrack(c, -10, -156, 1.75, 80, 4, 3);
        qCrack(c, 12, -150, 1.3, 100, 5, 7);
        qCrack(c, -26, -60, 2.3, 60, 3, 21);
        qCrack(c, 30, -50, 0.8, 60, 3, 23);
      }, QN.corr, 0.6 + 0.35 * Math.sin(t * 5), 2.2);
      alpha(1);
    }
    ctx.restore();
    // 樹皮上緣的一圈苔蘚
    A.shape(ctx, (c) => {
      const pts = [];
      for (let x = -76; x <= 66; x += 10) pts.push([x, barkTop(x) - 4 - ((x / 10) % 2 ? 4 : 0)]);
      for (let x = 66; x >= -76; x -= 12) pts.push([x, barkTop(x) + 6 + ((x / 12) % 3 === 0 ? 10 : 2)]);
      qBlob(c, pts);
    }, mossC, mossS, { cel: [3, -3], lw: 2.2 });
    // 樹根之間的苔蘚與發光小菇
    const pad = (x, y, rx, ry) => A.shape(ctx, (c) => {
      c.moveTo(x - rx, y + ry * 0.4);
      for (let k = 0; k <= 4; k++) {
        const xx = x - rx + (k * rx * 2) / 4;
        c.quadraticCurveTo(xx - rx / 4, y - ry * (0.9 + (k % 2) * 0.6), xx, y - ry * 0.2);
      }
      c.quadraticCurveTo(x, y + ry, x - rx, y + ry * 0.4);
      c.closePath();
    }, mossC, mossS, { lw: 2.2, shadeY: y });
    pad(-78, -2, 26, 9);
    pad(62, -2, 22, 8);
    qShroomlet(ctx, -64, -8, 10, -0.2, mix('#fff2c0', '#d8ff9a'), mix('#e8c880', '#8ad04a'), QN.stalk, glowC, 0.45);
    qShroomlet(ctx, -52, -6, 6, 0.25, mix('#fff2c0', '#d8ff9a'), mix('#e8c880', '#8ad04a'), QN.stalk, glowC, 0.35);
    qShroomlet(ctx, 72, -6, 7, 0.2, mix('#fff2c0', '#d8ff9a'), mix('#e8c880', '#8ad04a'), QN.stalk, glowC, 0.35);
    // 樹幹上的層孔菌
    qBracket(ctx, -44, -84, 20, -1, mix(QN.brk, QN.brk2), mix(QN.brkS, QN.brk2S), 3);
    qBracket(ctx, 44, -66, 15, 1, mix(QN.brk, QN.brk2), mix(QN.brkS, QN.brk2S), 2);
    // 荊棘纏繞（第二階段）
    if (pv > 0.05) {
      qBramble(ctx, qQuad(-90, -8, 0, -60, 40, -150), 7, 3, pv * 1.1);
      qBramble(ctx, qQuad(84, -8, -6, -80, -40, -156), 6, 9, pv * 1.1 - 0.15);
    }

    ctx.restore(); // 裙
    ctx.save();
    ctx.translate(0, -LIFT);
    // ─ 肩上的菌環（皺褶領）─
    const collar = (c) => {
      c.moveTo(-40, -172);
      c.quadraticCurveTo(0, -182, 40, -172);
      c.quadraticCurveTo(60, -150, 62, -130);
      const n = 9;
      for (let i = 0; i < n; i++) {
        const xa = 62 - (i * 124) / n;
        const xb = 62 - ((i + 1) * 124) / n;
        c.quadraticCurveTo((xa + xb) / 2, -116 + Math.abs(xa + xb) * 0.03, xb, -130 + Math.abs(xb) * 0.06);
      }
      c.quadraticCurveTo(-60, -150, -40, -172);
      c.closePath();
    };
    A.shape(ctx, collar, mix(QN.lace, '#d8c8e0'), mix('#e4d4b8', '#8a78a0'), { cel: [6, 5], lw: 2.6 });
    ctx.strokeStyle = A.c(mix('#d8c4a0', '#7a6890'));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(i * 11, -172);
      ctx.quadraticCurveTo(i * 14, -148, i * 17, -128);
    }
    ctx.stroke();
    // 金色鏈子＋星楓葉胸針
    ctx.strokeStyle = A.c(QN.gold);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-30, -170);
    ctx.quadraticCurveTo(0, -150, 32, -170);
    ctx.stroke();
    ctx.save();
    ctx.translate(2, -154);
    A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, 9), QN.gold, QN.goldS, { lw: 1.8, shadeY: 2 });
    A.ellipse(ctx, 0, -1, 2.6, 2.6, glowC, null, { lw: 1.2, hl: false });
    ctx.restore();

    // 左手在身體前面（第一階段按在胸口）
    if (pose === 'rest') drawArm(shL, handL, pv > 0.5 ? [-16, 10] : [-22, 20], true);

    // ─ 頭：整組依 tilt 繞頸部旋轉 ─
    ctx.save();
    ctx.translate(0, -166);
    ctx.rotate(tilt);
    ctx.translate(0, 166);

    // 傘蓋下方的菌褶
    const gillPath = (c) => c.ellipse(0, -236, 172, 30, 0, 0, QTAU);
    A.shape(ctx, gillPath, mix(QN.gill, QN.gill2), mix(QN.gillS, QN.gill2S), { shadeY: -226, lw: 2.4 });
    ctx.save();
    ctx.beginPath();
    gillPath(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c(mix(QN.gillS, QN.gill2S));
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = -16; i <= 16; i++) {
      ctx.moveTo(0, -230);
      ctx.lineTo(i * 12, -204);
    }
    ctx.stroke();
    qGlow(ctx, 0, -214, 130, glowC, 0.4 * gleam);
    ctx.restore();

    // 頭（菌柄頂端）
    const headPath = (c) => {
      c.moveTo(-36, -236);
      c.lineTo(-38, -200);
      c.bezierCurveTo(-40, -172, -22, -164, 0, -164);
      c.bezierCurveTo(24, -164, 42, -172, 40, -200);
      c.lineTo(38, -236);
      c.closePath();
    };
    A.shape(ctx, headPath, skin, skinS, { cel: [7, 3], hl: [-20, -206, 5, 9] });
    ctx.save();
    ctx.beginPath();
    headPath(ctx);
    ctx.clip();
    ctx.fillStyle = A.c(mix('#dcc3a4', '#8a7888'));
    ctx.beginPath();
    ctx.ellipse(0, -236, 62, 14, 0, 0, QTAU);
    ctx.fill();
    ctx.restore();

    // 臉
    const fx0 = 6;
    const eyeY = -198;
    const eyes = dead ? 'freed' : hurt ? 'hurt' : intro || m.blink ? 'closed' : 'open';
    const glowEye = pv > 0.3 && eyes === 'open';
    // 眉：溫柔時內側上揚（帶點憂傷），兇的時候內側壓低
    ctx.strokeStyle = A.outline();
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    [-1, 1].forEach((sd) => {
      const inX = fx0 + sd * 7;
      const outX = fx0 + sd * 24;
      const inY = fierce ? -207 : -216;
      const outY = fierce ? -215 : -212;
      ctx.moveTo(outX, outY);
      ctx.quadraticCurveTo(fx0 + sd * 15, Math.min(inY, outY) - 2.5, inX, inY);
    });
    ctx.stroke();
    [-1, 1].forEach((sd) => {
      const ex = fx0 + sd * 15;
      if (eyes === 'closed' || eyes === 'freed') {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(ex, eyeY - 3, 7.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ex + sd * 6.8, eyeY + 0.5);
        ctx.lineTo(ex + sd * 10.5, eyeY + 2.5);
        ctx.stroke();
        return;
      }
      if (eyes === 'hurt') {
        A.eye(ctx, ex, eyeY, 7, 8.5, 'hurt', 0);
        return;
      }
      if (glowEye) qGlow(ctx, ex + 1, eyeY + 1, 18, QN.corr, 0.55 * pv);
      ctx.fillStyle = A.c(glowEye ? mix('#2b1a12', '#12300a') : '#2b1a12');
      ctx.beginPath();
      ctx.ellipse(ex + 1, eyeY + 1, 7, 9.5, 0, 0, QTAU);
      ctx.fill();
      if (glowEye) {
        ctx.fillStyle = A.c(QN.corr);
        ctx.beginPath();
        ctx.ellipse(ex + 1.5, eyeY + 2, 4, 5.8, 0, 0, QTAU);
        ctx.fill();
        ctx.fillStyle = A.c('#f2ffd8');
        ctx.beginPath();
        ctx.ellipse(ex + 1.5, eyeY + 2, 1.5, 4, 0, 0, QTAU);
        ctx.fill();
      } else {
        ctx.fillStyle = A.c('#7a52a0');
        ctx.beginPath();
        ctx.ellipse(ex + 1.5, eyeY + 4.5, 4.6, 4.4, 0, 0, QTAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex - 1.4, eyeY - 2, 2.9, 2.5, 0, 0, QTAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + 3.4, eyeY + 5, 1.2, 0, QTAU);
        ctx.fill();
      }
      // 上眼線與睫毛；兇的時候眼皮壓下來
      const xo = ex + sd * 9;
      const xi = ex - sd * 8;
      const lidY = fierce ? eyeY - 3 : eyeY - 8;
      const inY = fierce ? lidY + 3 : lidY + 1.5;
      const outY = fierce ? lidY - 1.5 : lidY + 2;
      if (fierce) {
        ctx.fillStyle = A.c(skin);
        ctx.beginPath();
        ctx.moveTo(xo + sd * 2, eyeY - 14);
        ctx.lineTo(xi - sd * 2, eyeY - 14);
        ctx.lineTo(xi - sd * 2, inY);
        ctx.lineTo(xo + sd * 2, outY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(xi, inY);
      ctx.quadraticCurveTo(ex, fierce ? (inY + outY) / 2 - 1 : lidY - 3.5, xo, outY);
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(xo, outY);
      ctx.lineTo(xo + sd * 5, outY - 3.5);
      ctx.moveTo(xo - sd * 2.5, outY - 1.8);
      ctx.lineTo(xo + sd * 1.2, outY - 7);
      ctx.stroke();
    });
    A.blush(ctx, fx0 - 23, -182, 6.5);
    A.blush(ctx, fx0 + 23, -182, 6.5);
    // 嘴
    const open = !dead && (pose === 'point' || big || st === 'summon' || st === 'slamPrep' || st === 'divePrep');
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    if (open) {
      ctx.fillStyle = A.c('#6a1f2a');
      ctx.beginPath();
      ctx.ellipse(fx0 + 1, -176, 5, 5.6, 0, 0, QTAU);
      ctx.fill();
      ctx.stroke();
    } else if (dead) {
      ctx.beginPath();
      ctx.arc(fx0 + 1, -181, 5, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    } else if (fierce) {
      ctx.beginPath();
      ctx.moveTo(fx0 - 5, -174);
      ctx.quadraticCurveTo(fx0 + 1, -177.5, fx0 + 7, -174);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(fx0 - 4, -177);
      ctx.quadraticCurveTo(fx0 + 1, -174.5, fx0 + 6, -177);
      ctx.stroke();
    }
    // 淚：第二階段眼角流下發光的綠淚；被解放時是清澈的淚
    if ((pv > 0.4 && eyes === 'open') || dead) {
      const tq = (t * 0.6) % 1;
      alpha(dead ? 0.85 : pv * (1 - tq * 0.6));
      A.ellipse(ctx, fx0 - 21, eyeY + 12 + tq * 12, 2.3, 3.3, dead ? '#bfe8ff' : QN.corr, null, { lw: 1.4, hl: false });
      alpha(1);
    }
    // 臉旁的兩綹髮
    [-1, 1].forEach((sd) => {
      const sw = Math.sin(t * 1.7 + sd) * 3 + (spin ? sd * 10 : 0);
      const x0 = sd * 36;
      const fn = qQuad(x0, -232, x0 + sd * 8 + sw * 0.4, -200, x0 + sd * 3 + sw, -160);
      A.shape(ctx, (c) => qTaper(c, fn, (s) => 13 * (1 - s * 0.6), 12), mix(QN.lichen, QN.lichen2), mix(QN.lichenS, QN.lichen2S), { cel: [sd * 3, 0], lw: 2.2 });
      const e = fn(1);
      A.ellipse(ctx, e[0], e[1] + 3, 3.2, 3.6, glowC, null, { lw: 1.3, hl: false });
    });

    // ─ 傘蓋 ─
    // 第二階段：傘緣的棘刺
    if (pv > 0.05) {
      for (let i = 0; i < 13; i++) {
        const u = 0.04 + (i / 12) * 0.92;
        const p = qDome(u);
        const q = qDome(Math.min(1, u + 0.01));
        const a = Math.atan2(q[1] - p[1], q[0] - p[0]) - Math.PI / 2;
        const L = (20 + (i % 2) * 14) * pv;
        A.shape(ctx, (c) => {
          c.moveTo(p[0] + Math.cos(a + 1.57) * 7, p[1] + Math.sin(a + 1.57) * 7);
          c.quadraticCurveTo(p[0] + Math.cos(a + 0.3) * L * 0.6, p[1] + Math.sin(a + 0.3) * L * 0.6, p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L);
          c.lineTo(p[0] - Math.cos(a + 1.57) * 7, p[1] - Math.sin(a + 1.57) * 7);
          c.closePath();
        }, QN.thorn, null, { lw: 2 });
      }
    }
    const capPath = (c) => {
      const W = QCAP.w;
      c.moveTo(-W, qRimY(-W));
      c.bezierCurveTo(-W - 4, -316, -104, QCAP.top, 0, QCAP.top);
      c.bezierCurveTo(104, QCAP.top, W + 4, -316, W, qRimY(W));
      const n = 11;
      for (let i = n - 1; i >= 0; i--) {
        const xa = -W + ((i + 1) * 2 * W) / n;
        const xb = -W + (i * 2 * W) / n;
        const xm = (xa + xb) / 2;
        c.quadraticCurveTo(xm, qRimY(xm) + 10 + (i % 2) * 3, xb, qRimY(xb));
      }
      c.closePath();
    };
    const capC = mix(QN.cap, QN.cap2);
    const capS = mix(QN.capS, QN.cap2S);
    A.shape(ctx, capPath, capC, capS, { cel: [16, 14] });
    ctx.save();
    ctx.beginPath();
    capPath(ctx);
    ctx.clip();
    // 傘面的弧紋
    ctx.strokeStyle = A.c(capS);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -244, 164, 56, 0, Math.PI * 1.06, Math.PI * 1.94);
    ctx.stroke();
    // 傘緣下方的一條亮邊
    ctx.strokeStyle = A.c(mix('#e07aac', '#7a2a64'));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -236, 176, 22, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(-104, -300, 34, 12, -0.5, 0, QTAU);
    ctx.fill();
    ctx.restore();
    // 頂上的苔蘚：邊緣一球一球、往下滴垂
    const mossPts = [];
    const u0 = 0.14;
    const u1 = 0.78;
    const NM = 22;
    for (let k = 0; k <= NM; k++) {
      const u = u0 + ((u1 - u0) * k) / NM;
      const p = qDome(u);
      const q = qDome(Math.min(1, u + 0.01));
      const a = Math.atan2(q[1] - p[1], q[0] - p[0]) - Math.PI / 2;
      const off = 3 + (k % 2) * 5 + (k % 5 === 2 ? 3 : 0);
      mossPts.push([p[0] + Math.cos(a) * off, p[1] + Math.sin(a) * off]);
    }
    for (let k = NM; k >= 0; k--) {
      const u = u0 + ((u1 - u0) * k) / NM;
      const p = qDome(u);
      const edge = Math.min(k, NM - k) / 3;
      let dd = 22 + 12 * Math.sin(u * 11 + 1) + (k % 4 === 1 ? 22 + qHash(k) * 18 : 0) + (k % 2 ? 4 : -4);
      dd *= Math.min(1, edge) * (1 + pv * 0.35);
      mossPts.push([p[0], p[1] + Math.max(6, dd)]);
    }
    A.shape(ctx, (c) => qBlob(c, mossPts), mossC, mossS, { cel: [6, -7], lw: 2.4 });
    ctx.save();
    ctx.beginPath();
    qBlob(ctx, mossPts);
    ctx.clip();
    ctx.fillStyle = A.c(mix('#9ccc5a', '#5a7a34'));
    for (let i = 0; i < 22; i++) {
      const u = u0 + qHash(i) * (u1 - u0);
      const p = qDome(u);
      const y = p[1] + 8 + qHash(i + 7) * 26;
      ctx.beginPath();
      ctx.arc(p[0], y, 2 + qHash(i + 3) * 2, 0, QTAU);
      ctx.fill();
    }
    ctx.restore();
    // 另一小塊苔蘚（右側傘緣）
    A.shape(ctx, (c) => qBlob(c, [[118, -268], [140, -282], [164, -270], [178, -246], [168, -232], [150, -244], [134, -236], [122, -250]]), mossC, mossS, { cel: [4, -4], lw: 2.2 });
    // 腐化的血管
    if (pv > 0.05) {
      ctx.save();
      ctx.beginPath();
      capPath(ctx);
      ctx.clip();
      alpha(pv);
      qVein(ctx, (c) => {
        qCrack(c, -8, -344, 2.4, 120, 5, 31);
        qCrack(c, 8, -344, 0.7, 120, 5, 37);
        qCrack(c, 0, -342, 1.55, 90, 4, 41);
        qCrack(c, -30, -338, 2.0, 100, 4, 47);
        qCrack(c, 30, -338, 1.1, 100, 4, 53);
      }, QN.corr, 0.55 + 0.35 * Math.sin(t * 4.5), 2.6);
      ctx.restore();
      alpha(1);
    }
    // 發光的斑點
    const spots = [[-138, -262, 15], [-86, -256, 9], [-44, -274, 19], [8, -250, 11], [52, -270, 14], [104, -258, 18], [150, -250, 9], [-170, -246, 7], [-112, -238, 6], [-12, -238, 6], [76, -240, 7], [132, -236, 5], [26, -286, 7], [-104, -284, 6]];
    spots.forEach(([x, y, r], i) => {
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 + i * 1.7);
      qGlow(ctx, x, y, r * 2.6, glowC, (0.28 + pv * 0.4) * pulse * (dead ? 0.3 : 1));
      A.ellipse(ctx, x, y, r, r * 0.74, mix(QN.spot, QN.spot2), mix('#f0dcc0', '#9ad84a'), { lw: 2, hl: false, shadeAt: 0.3 });
      ctx.fillStyle = A.c(mix('#eaffd0', '#e8ffc0'));
      ctx.beginPath();
      ctx.ellipse(x - r * 0.25, y - r * 0.2, r * 0.36, r * 0.22, -0.3, 0, QTAU);
      ctx.fill();
    });
    // 傘上的小森林：蕨、小蘑菇
    const dp = (u, dy) => {
      const p = qDome(u);
      return [p[0], p[1] + dy];
    };
    let p = dp(0.12, 14);
    qFern(ctx, p[0], p[1], 34, -2.0, 0.9, leafC, leafS);
    p = dp(0.86, 16);
    qFern(ctx, p[0], p[1], 30, -1.0, -0.9, leafC, leafS);
    p = dp(0.3, 8);
    qShroomlet(ctx, p[0], p[1], 13, -0.3, mix('#e87aa8', '#6a2050'), mix('#b8487f', '#3a0e30'), QN.stalk, glowC, 0.3 + pv * 0.3);
    p = dp(0.34, 10);
    qShroomlet(ctx, p[0], p[1], 8, 0.1, mix('#e9a24e', '#6a2a3a'), mix('#b46e2c', '#3a1424'), QN.stalk, glowC, 0.2);
    p = dp(0.7, 8);
    qShroomlet(ctx, p[0], p[1], 11, 0.35, mix('#e87aa8', '#6a2050'), mix('#b8487f', '#3a0e30'), QN.stalk, glowC, 0.3 + pv * 0.3);
    p = dp(0.21, 8);
    qFern(ctx, p[0], p[1], 22, -1.9, 0.6, leafC, leafS);
    qBracket(ctx, QCAP.w - 4, -262, 17, 1, mix(QN.brk, QN.brk2), mix(QN.brkS, QN.brk2S), 3);
    qBracket(ctx, -QCAP.w + 4, -270, 15, -1, mix(QN.brk, QN.brk2), mix(QN.brkS, QN.brk2S), 2);

    // 傘緣垂下的一束束松蘿（避開臉）
    [[-164, 116, 3], [150, 96, 9], [-124, 70, 7]].forEach(([x, L0, seed]) => {
      const L = L0 * (1 + pv * 0.3);
      const y0 = qRimY(x) + 4;
      const sw = Math.sin(t * 1.4 + seed) * 5 + (spin ? 16 : 0);
      for (let k = -1; k <= 1; k += 2) {
        const LL = L * (k > 0 ? 0.7 : 1);
        const fn = qQuad(x + k * 6, y0, x + k * 9 + sw * 0.4, y0 + LL * 0.5, x + k * 5 + sw, y0 + LL);
        A.shape(ctx, (c) => qTaper(c, fn, (s) => 9 * (1 - s * 0.8), 12), mix('#c2d49a', '#6e7e5a'), mix('#8fa868', '#4a5a3e'), { cel: [2, 0], lw: 1.8 });
        // 分岔的細絲
        const q = fn(0.55);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(q[0], q[1]);
        ctx.quadraticCurveTo(q[0] + (k || 1) * 6, q[1] + 8, q[0] + (k || 1) * 5, q[1] + 16);
        ctx.stroke();
      }
      const e = [x + sw, y0 + L];
      qGlow(ctx, e[0], e[1] + 5, 14, glowC, 0.55 * gleam);
      A.ellipse(ctx, e[0], e[1] + 5, 3.2, 3.8, mix('#eaffd4', '#b8ff7a'), null, { lw: 1.4, hl: false });
    });
    // 兩條長藤
    [[-94, 74, 0], [100, 58, 1]].forEach(([x, L0, i]) => {
      const L = L0 * (1 + pv * 0.35);
      const sw = Math.sin(t * 1.5 + i * 2) * 4 + (spin ? 14 : 0);
      const y0 = qRimY(x) + 6;
      const fn = qQuad(x, y0, x + sw * 0.4 + 8, y0 + L * 0.5, x + sw, y0 + L);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const q = fn(k / 10);
        if (k) ctx.lineTo(q[0], q[1]);
        else ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke();
      ctx.strokeStyle = A.c(mix('#5a8a30', '#2e4a1c'));
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let k = 1; k <= 5; k++) {
        const q = fn(k / 5.4);
        qLeaf(ctx, q[0], q[1], 11 + (k % 2) * 3, k % 2 ? 0.4 : 2.7, leafC, leafS);
      }
      if (pv > 0.05) qBramble(ctx, (s) => fn(s * 0.9), 3.5, 70 + i, pv);
      const e = fn(1);
      qGlow(ctx, e[0], e[1] + 5, 16, glowC, 0.6 * gleam);
      qShroomlet(ctx, e[0], e[1] + 14, 7, Math.PI, mix('#fff2c0', '#d8ff9a'), mix('#e8c880', '#8ad04a'), QN.stalk, glowC, 0);
    });

    // ─ 王冠：鹿角般的枝椏，中間是星楓葉 ─
    const lift = pv * (10 + Math.sin(t * 3) * 3);
    const crY = QCAP.top + 4 - lift;
    const antler = (sd) => {
      const L = 1.1 + pv * 0.3;
      const main = (s) => {
        const a = -0.8 - s * 0.7;
        return [sd * (24 + Math.cos(a) * 64 * L * s), crY - 2 + Math.sin(a) * 52 * L * s - s * s * 6 * L];
      };
      const tine = (s0, ang, len) => {
        const b = main(s0);
        return (s) => {
          const a = ang - s * 0.3;
          return [b[0] + sd * Math.cos(a) * len * L * s, b[1] + Math.sin(a) * len * L * s];
        };
      };
      const tines = [tine(0.28, -0.3, 30), tine(0.5, -1.9, 22), tine(0.66, -0.5, 26), tine(0.84, -1.2, 16)];
      tines.forEach((f, k) => A.shape(ctx, (c) => qTaper(c, f, (s) => (8 - k) * (1 - s * 0.8), 10), woodC, woodS, { cel: [sd * 1.5, 0], lw: 2.2 }));
      A.shape(ctx, (c) => qTaper(c, main, (s) => 13 * (1 - s * 0.8), 16), woodC, woodS, { cel: [sd * 2.5, 0], lw: 2.4 });
      // 枝頭的嫩葉與發光的芽（第二階段變成棘刺）
      [main, ...tines].forEach((f, k) => {
        const q = f(1);
        if (pv < 0.7) {
          alpha(1 - pv / 0.7);
          qLeaf(ctx, q[0], q[1], 11, -Math.PI / 2 + sd * (0.5 + k * 0.25), leafC, leafS);
          alpha(1);
        }
        qGlow(ctx, q[0], q[1], 10, glowC, 0.5 * gleam);
        if (pv > 0.05) {
          ctx.fillStyle = A.c(QN.thorn);
          ctx.strokeStyle = A.outline();
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(q[0] - 3, q[1] + 1);
          ctx.lineTo(q[0] + sd * 5 * pv, q[1] - 12 * pv);
          ctx.lineTo(q[0] + 3, q[1] + 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      });
    };
    if (!dead) qGlow(ctx, 0, crY - 30, 100 + pv * 40, QN.leaf, 0.3 + pv * 0.25 + (big ? 0.25 : 0));
    antler(-1);
    antler(1);
    // 金色冠環（刻著葉紋）
    A.shape(ctx, (c) => {
      c.moveTo(-40, crY + 12);
      c.quadraticCurveTo(0, crY + 22, 40, crY + 12);
      c.lineTo(38, crY - 4);
      c.lineTo(26, crY - 10);
      c.lineTo(14, crY - 2);
      c.lineTo(0, crY - 14);
      c.lineTo(-14, crY - 2);
      c.lineTo(-26, crY - 10);
      c.lineTo(-38, crY - 4);
      c.closePath();
    }, QN.gold, QN.goldS, { shadeY: crY + 8, lw: 2.4, hl: [-22, crY + 2, 6, 2] });
    [[-26, crY - 10], [26, crY - 10]].forEach(([x, y]) => A.ellipse(ctx, x, y, 3.4, 3.4, '#ff8ab8', null, { lw: 1.4, hl: false }));
    A.ellipse(ctx, 0, crY + 6, 4.4, 4.4, glowC, null, { lw: 1.4, hl: false });
    // 星楓葉
    const lp = 0.6 + 0.4 * Math.sin(t * 3.2);
    const lY = crY - 34 + Math.sin(t * 2) * 1.5 - pv * 6;
    const lS = 25 + pv * 5;
    if (!dead) {
      qGlow(ctx, 0, lY, 50 + pv * 24, QN.leaf, 0.7 * lp + 0.2);
      ctx.save();
      ctx.translate(0, lY);
      ctx.rotate(t * 0.4);
      alpha((0.28 + 0.22 * lp) * (1 + pv * 0.5));
      ctx.fillStyle = A.c('#e8ffc8');
      for (let i = 0; i < 8; i++) {
        ctx.rotate(QTAU / 8);
        ctx.beginPath();
        ctx.moveTo(-2.5, 0);
        ctx.lineTo(0, -(44 + (i % 2) * 20 + pv * 16));
        ctx.lineTo(2.5, 0);
        ctx.closePath();
        ctx.fill();
      }
      alpha(1);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(0, lY);
    ctx.rotate(Math.sin(t * 1.5) * 0.06);
    A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, lS), dead ? '#a8d88a' : mix(QN.leaf, '#b8ff3a'), dead ? '#7aa860' : mix(QN.leafS, '#58b020'), { lw: 2.4, shadeY: 4, hl: [-7, -9, 5, 3] });
    ctx.strokeStyle = A.c(dead ? '#6a9a50' : '#eaffd0');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, lS * 0.8);
    ctx.lineTo(0, -lS * 0.7);
    ctx.moveTo(0, -lS * 0.05);
    ctx.lineTo(lS * 0.6, -lS * 0.3);
    ctx.moveTo(0, -lS * 0.05);
    ctx.lineTo(-lS * 0.6, -lS * 0.3);
    ctx.stroke();
    ctx.restore();
    ctx.restore(); // 頭

    // ─ 權杖：活的樹枝，頂端捲成鉤、吊著孢子燈 ─
    const sdx = staffT[0] - staffB[0];
    const sdy = staffT[1] - staffB[1];
    const sL = Math.hypot(sdx, sdy);
    const ux = sdx / sL;
    const uy = sdy / sL;
    const nx = -uy;
    const ny = ux;
    const staffFn = (s) => {
      const w = Math.sin(s * 9) * 3;
      return [staffB[0] + sdx * s + nx * w, staffB[1] + sdy * s + ny * w];
    };
    A.shape(ctx, (c) => qTaper(c, staffFn, (s) => 12 - s * 3, 20), woodC, woodS, { cel: [3, 0], lw: 2.6 });
    const top = staffFn(1);
    const hookC = [top[0] + nx * 17, top[1] + ny * 17];
    const a0 = Math.atan2(top[1] - hookC[1], top[0] - hookC[0]);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(hookC[0], hookC[1], 17, a0, a0 + 4.2);
    ctx.stroke();
    ctx.strokeStyle = A.c(woodC);
    ctx.lineWidth = 7;
    ctx.stroke();
    const bp = staffFn(0.64);
    qBracket(ctx, bp[0] + 4, bp[1], 12, 1, mix(QN.brk, QN.brk2), mix(QN.brkS, QN.brk2S), 2);
    const lf = staffFn(0.9);
    qLeaf(ctx, lf[0], lf[1], 15, Math.atan2(uy, ux) + 0.9, leafC, leafS);
    qLeaf(ctx, lf[0], lf[1], 13, Math.atan2(uy, ux) - 0.9, leafC, leafS);
    const mp = staffFn(0.3);
    A.ellipse(ctx, mp[0], mp[1], 8, 5, mossC, mossS, { lw: 1.8, hl: false, rot: Math.atan2(uy, ux) });
    if (pv > 0.05) {
      qBramble(ctx, (s) => {
        const q = staffFn(0.1 + s * 0.75);
        const w = Math.sin(s * 14) * 9;
        return [q[0] + nx * w, q[1] + ny * w];
      }, 4.5, 13, pv);
    }
    // 孢子燈
    const orbX = hookC[0] + Math.cos(a0 + 4.2) * 17;
    const orbY = hookC[1] + Math.sin(a0 + 4.2) * 17 + 18;
    const orbA = (big || pose === 'point' ? 1 : 0.55) + pv * 0.2 + Math.sin(t * 5) * 0.08;
    if (!dead) qGlow(ctx, orbX, orbY, 56 + (pose === 'storm' ? 34 : 0), glowC, orbA * 0.8);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(orbX, orbY - 18);
    ctx.lineTo(orbX, orbY - 8);
    ctx.stroke();
    A.shape(ctx, (c) => {
      c.moveTo(orbX - 14, orbY);
      c.bezierCurveTo(orbX - 14, orbY - 17, orbX + 14, orbY - 17, orbX + 14, orbY);
      c.quadraticCurveTo(orbX, orbY + 5, orbX - 14, orbY);
      c.closePath();
    }, mix('#fff2c0', '#d8ff9a'), mix('#e8c880', '#8ad04a'), { lw: 2, shadeY: orbY - 3, hl: [orbX - 5, orbY - 9, 3.5, 2] });
    A.ellipse(ctx, orbX, orbY + 9, 7.5, 8.5, mix('#f0ffd8', '#c8ff8a'), mix('#b8e890', '#78d040'), { lw: 2, hl: [orbX - 2, orbY + 6, 2, 2] });

    // 右手（握權杖）；舉杖／倚杖時左手也在前面
    drawArm(shR, handR, pose === 'point' ? [4, 8] : pose === 'wide' ? [0, -8] : [18, 12], true);
    if (pose === 'smash' || pose === 'lean') drawArm(shL, handL, pose === 'lean' ? [10, 24] : [-18, 8], true);

    // ─ 招式特效 ─
    if (!dead && pose === 'point') {
      for (let i = 0; i < 9; i++) {
        const q = (t * 2 + i / 9) % 1;
        const r = 12 + q * 70;
        const a = -0.8 + qHash(i) * 1.6;
        alpha((1 - q) * 0.9);
        ctx.fillStyle = A.c(i % 2 ? mix('#e8ffc8', QN.corr) : '#e8c8ff');
        ctx.beginPath();
        ctx.arc(orbX + Math.cos(a) * r, orbY + Math.sin(a) * r, 3 + (1 - q) * 3.5, 0, QTAU);
        ctx.fill();
      }
      alpha(1);
    }
    if (!dead && st === 'summon') {
      qVein(ctx, (c) => {
        qCrack(c, handL[0], LIFT - 2, Math.PI, 80 * prog + 10, 4, 61);
        qCrack(c, handL[0], LIFT - 2, 0.1, 100 * prog + 10, 4, 67);
      }, glowC, 0.8, 2);
      qGlow(ctx, handL[0], handL[1] + 12, 44, glowC, 0.6);
    }
    if (spin) {
      ctx.strokeStyle = 'rgba(255,255,240,0.75)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const a = t * 20 + i * 1.6;
        ctx.beginPath();
        ctx.ellipse(0, -100, 170, 34, 0, a, a + 1.1);
        ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const a = t * 14 + i;
        qLeaf(ctx, Math.cos(a) * 170, -100 + Math.sin(a) * 34 - i * 14, 13, a, leafC, leafS);
      }
    }

    // ─ 螢火蟲與孢子（最前面）─
    if (!dead) {
      const nf = 9 + Math.round(pv * 4);
      for (let i = 0; i < nf; i++) {
        const a = t * (0.35 + qHash(i) * 0.3) * (i % 2 ? 1 : -1) + i * 2.1;
        const x = Math.cos(a) * (170 + qHash(i + 5) * 60);
        const y = -190 + Math.sin(a * 1.3) * 100 + Math.sin(t * 2 + i) * 10;
        const b = 0.5 + 0.5 * Math.sin(t * 5 + i * 2.3);
        const col = i % 3 === 2 && pv > 0.5 ? '#c070ff' : mix(QN.ff, QN.corr);
        qGlow(ctx, x, y, 13, col, 0.6 * b);
        alpha(0.5 + 0.5 * b);
        ctx.fillStyle = A.c('#fffff0');
        ctx.beginPath();
        ctx.arc(x, y, 2.3, 0, QTAU);
        ctx.fill();
        alpha(1);
      }
      const ns = big ? 18 : 10;
      for (let i = 0; i < ns; i++) {
        const q = (t * (0.18 + qHash(i + 20) * 0.12) + qHash(i + 30)) % 1;
        const x = (qHash(i + 40) - 0.5) * 330 + Math.sin(t + i) * 12;
        const y = -220 + (big ? -q * 190 : q * 170 - 40);
        alpha(Math.sin(q * Math.PI) * 0.8);
        ctx.fillStyle = A.c(mix('#fff6d8', '#c8ff8a'));
        ctx.beginPath();
        ctx.arc(x, y, 1.8 + qHash(i) * 1.6, 0, QTAU);
        ctx.fill();
      }
      alpha(1);
    }
    if (st === 'recover' && !dead && elapsed > 0.25) {
      // 喘口氣：頭上冒汗（破綻）
      A.ellipse(ctx, 66, -262, 5, 7.5, '#9fdcff', null, { lw: 1.8, hl: false, rot: 0.3 });
    }
    ctx.restore(); // 上半身
    ctx.restore();
    ctx.globalAlpha = ga;
  }

  const DRAW = (A.MONSTER_DRAW = { snail, mushroom, sprite, queen });

  // 章節 Boss 被 sizeK 等比放大（bosses.js）：美術整個 ctx.scale 上去，描邊也會跟著變粗。
  // 跟 variants.js 對 m.scale 的做法一樣，把線寬縮回去一部分：螢幕上的粗細 ≈ 原本 × sizeK^0.35。
  const LWD = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'lineWidth');
  function bossFn(fn, ctx, m) {
    const sk = (m.def && m.def.sizeK) || 1;
    if (sk <= 1.05 || !LWD || Object.prototype.hasOwnProperty.call(ctx, 'lineWidth')) return fn(ctx, m);
    const k = Math.pow(sk, -0.65);
    Object.defineProperty(ctx, 'lineWidth', {
      configurable: true,
      get() { return LWD.get.call(this) / k; },
      set(v) { LWD.set.call(this, v * k); },
    });
    try {
      return fn(ctx, m);
    } finally {
      delete ctx.lineWidth;
    }
  }

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
    if (!m.def.boss && !(m.fx && m.fx.shadowless)) A.groundShadow(ctx, 0, 0, (m.w * 0.55) * sc * (m.hover ? Math.max(0.4, 1 - m.hover / 300) : 1));
    else if (m.def.boss) A.groundShadow(ctx, 0, 0, 90 * (m.def.sizeK || 1));
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
    // 被打中時往被打的方向後仰（以腳底為軸斜一下、身體被推開一點；Boss 幅度小）。rcl 由 js/game/feel.js 設定、遞減
    if (m.rcl > 0 && !m.dead && !(A.auroraIce && A.auroraIce.on(m))) {
      const q = Math.sin(Math.min(1, m.rcl) * Math.PI * 0.5) * (m.isBoss || m.fieldBoss ? 0.3 : 1) * (m.rclDir || 1);
      ctx.transform(1, 0, -0.14 * q, 1, 5 * q * sc, 0);
    }
    ctx.scale(m.dir * sc, sc);
    if (m.squash > 0 && !(A.auroraIce && A.auroraIce.on(m))) {
      // 被打中時的壓扁回彈（被極光風暴冰封時不壓扁：js/art/stormfrost.js）
      const q = Math.sin(m.squash * Math.PI) * (m.isBoss ? 0.35 : 1);
      ctx.scale(1 + 0.2 * q, 1 - 0.16 * q);
    }
    if (m.deadT > 0) {
      const k = Math.min(1, m.deadT / (m.isBoss ? 2 : 0.5));
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.translate(0, -k * 10);
      if (!m.isBoss) {
        // 一般怪：先鼓起來（0.06 秒）再縮小消失，像被打爆
        const pk = k < 0.12 ? Math.sin((k / 0.12) * Math.PI * 0.5) : 1 - (k - 0.12) / 0.88;
        const s2 = k < 0.12 ? 1 + 0.16 * pk : 0.55 + 0.61 * pk * pk;
        ctx.translate(0, -m.h * 0.5);
        ctx.scale(s2, k < 0.12 ? 1 + 0.1 * pk : s2);
        ctx.translate(0, m.h * 0.5);
      }
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
    bossFn(fn, ctx, m);
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
