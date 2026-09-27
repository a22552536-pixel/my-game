// 第一章（苔光森林）的六種新怪物：不再是蝸牛／菇／草精的進化階段，而是各自獨立的森林小生物。
//   橡實鼠 acornmouse、樹皮龜 barkturtle、小野豬 boarlet、提燈螢 lanternfly、藤尾蜥 vinelizard、花瓣蝶 petalfly
// 繪圖約定同 monsters.js：原點在腳底中央、面向右（+x）、顏色一律經過 A.c()（受擊閃白、閃光怪才能統一處理）。
// 另外覆寫第一章材料的圖示：moss（橡實殼）、cap（野豬鬃）、bark（樹皮甲片）、wick（螢光囊）、vine（藤尾）、petal（蝶翅花瓣）。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const TAU = Math.PI * 2;

  // ───────────── 共用小工具（與 monsters.js 第一章精緻化的做法一致）─────────────
  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function rgb(col) {
    return U.hexToRgb(A.c(col)).join(',');
  }
  // 放射狀柔光
  function glow(ctx, x, y, r, col, a) {
    if (!(a > 0) || !(r > 0)) return;
    const c = rgb(col);
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + c + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + c + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  // 線性漸層；stops：[k, col, alpha?]
  function lg(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([k, col, a]) => {
      if (a == null) g.addColorStop(k, A.c(col));
      else g.addColorStop(k, 'rgba(' + rgb(col) + ',' + a + ')');
    });
    return g;
  }
  // 厚塗形狀：陰影色 → 往左上偏移的亮面（右下留月牙陰影）→ 質感 → 左上邊光 → 描邊
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
    if (o.sheen) glow(ctx, o.sheen[0], o.sheen[1], o.sheen[2], o.sheenCol || '#ffffff', o.sheen[3]);
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
  function line(ctx, fn, col, w, a) {
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
  // 描邊色粗線＋內色細線（莖、腳、觸角）
  function stem(ctx, fn, col, w) {
    line(ctx, fn, null, w + 2.6);
    line(ctx, fn, col, w);
  }
  function speckle(ctx, x, y, w, h, n, r, col, seed, a) {
    ctx.save();
    ctx.globalAlpha *= a == null ? 1 : a;
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + (hash(seed + i * 3.1) - 0.5) * w;
      const py = y + (hash(seed + i * 7.7) - 0.5) * h;
      const rr = r * (0.55 + hash(seed + i * 1.3) * 0.7);
      ctx.moveTo(px + rr, py);
      ctx.arc(px, py, rr, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }
  // 有葉脈的小葉子（中心 x,y）
  function leaf(ctx, x, y, rx, ry, rot, col, colS, rim, lw) {
    re(ctx, x, y, rx, ry, col, colS, rim || null, { rot, lw: lw || 2, hl: false, cel: [0, ry * 0.45], rim: 1, tex: (c) => {
      const ca = Math.cos(rot);
      const sa = Math.sin(rot);
      line(c, (q) => { q.moveTo(x - ca * rx * 0.75, y - sa * rx * 0.75); q.lineTo(x + ca * rx * 0.7, y + sa * rx * 0.7); }, colS, 1, 0.9);
    } });
  }
  // 尖頭葉（從 x,y 往 rot 方向長出去，長 len、寬 wd）
  function pointLeaf(ctx, x, y, len, wd, rot, col, colS, rim, lw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    rs(ctx, (c) => {
      c.moveTo(0, 0);
      c.quadraticCurveTo(len * 0.45, -wd, len, 0);
      c.quadraticCurveTo(len * 0.45, wd, 0, 0);
      c.closePath();
    }, col, colS, rim || null, { cel: [0, wd * 0.4], rim: 1, lw: lw || 1.8, tex: (c) => line(c, (q) => { q.moveTo(len * 0.1, 0); q.lineTo(len * 0.85, 0); }, colS, 0.9, 0.9) });
    ctx.restore();
  }
  // 有神的 Q 版大眼（其他表情交給 A.eye）
  function eye(ctx, x, y, rx, ry, kind, iris, look) {
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
    g.addColorStop(0, A.c(U.mix(ir, '#ffffff', 0.5)));
    g.addColorStop(0.6, A.c(ir));
    g.addColorStop(1, A.c(U.mix(ir, '#1a0e0a', 0.5)));
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
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - rx * 1.3, y - ry * 1.5);
      ctx.lineTo(x + rx * 1.1, y - ry * 0.95);
      ctx.stroke();
    }
  }
  function eyeKind(m, angry) {
    return m.dead ? 'x' : m.hurtT > 0 ? 'hurt' : angry || m.angry ? 'angry' : m.blink ? 'closed' : 'normal';
  }
  function eyes(ctx, x, y, gap, rx, ry, m, iris, angry) {
    const kind = eyeKind(m, angry);
    eye(ctx, x, y, rx, ry, kind, iris, 0.7);
    eye(ctx, x + gap, y - 0.5, rx * 0.92, ry * 0.95, kind, iris, 0.7);
  }
  function mouth(ctx, x, y, open, s) {
    s = s || 1;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (open) {
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 2.8 * s, 3.3 * s, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = A.c('#e8707a');
      ctx.beginPath();
      ctx.ellipse(x + 0.4, y + 2.4 * s, 1.7 * s, 1 * s, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y - 1, 2.8 * s, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
  }
  // 三次貝茲上的點
  function bz(p0, p1, p2, p3, u) {
    const v = 1 - u;
    return [
      v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
      v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
    ];
  }
  // 沿著貝茲畫一條漸細的粗線：先描邊色、再本色、再亮色中線
  function taper(ctx, P, w0, w1, col, colL, n) {
    n = n || 16;
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(bz(P[0], P[1], P[2], P[3], i / n));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    [[A.outline(), 2.8], [A.c(col), 0], [A.c(colL), -1]].forEach(([c, add], pass) => {
      ctx.strokeStyle = c;
      for (let i = 0; i < n; i++) {
        const w = w0 + (w1 - w0) * (i / n);
        const lw = pass === 2 ? Math.max(0.6, w * 0.3) : w + add;
        if (pass === 2 && i > n * 0.8) break;
        ctx.lineWidth = lw;
        ctx.beginPath();
        const a = pts[i];
        const b = pts[i + 1];
        if (pass === 2) {
          ctx.moveTo(a[0] - w * 0.18, a[1] - w * 0.2);
          ctx.lineTo(b[0] - w * 0.18, b[1] - w * 0.2);
        } else {
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
        }
        ctx.stroke();
      }
    });
    ctx.restore();
    return pts;
  }
  // 走路／跳躍的伸縮（跟蝸牛、菇一樣的手感）
  function hopSquash(m) {
    let sy = 1;
    if (!m.onGround) sy = m.vy < 0 ? 1.08 : 0.96;
    else if (m.landT > 0) sy = 0.86 + (1 - m.landT / 0.15) * 0.14;
    return sy;
  }
  function isMoving(m) {
    return m.onGround && Math.abs(m.vx || 0) > 5;
  }

  // ───────────── 橡實鼠：圓滾滾的灰棕小鼠，頭戴橡實帽、鼓鼓的頰囊、蓬鬆捲尾 ─────────────
  function acornmouse(ctx, m) {
    const t = m.t;
    const mv = isMoving(m);
    const step = mv ? Math.sin(t * 16) : 0;
    const hurt = m.hurtT > 0;
    const sy = hopSquash(m);
    const F = ['#c2b3b6', '#9a8990', '#f1e8ea'];
    const PINK = ['#f7aebb', '#df8196'];
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);
    ctx.translate(0, mv ? -Math.abs(step) * 1.6 : Math.sin(t * 2.4) * 0.5);

    // 蓬鬆捲尾（身體後面，尾端奶油色）
    ctx.save();
    ctx.translate(-15, -10);
    ctx.rotate(Math.sin(t * 3) * 0.1 + (hurt ? 0.35 : 0) + (mv ? Math.sin(t * 16) * 0.05 : 0));
    const tail = (c) => {
      c.moveTo(3, 2);
      c.bezierCurveTo(-10, 6, -23, -4, -20, -18);
      c.bezierCurveTo(-18, -31, -4, -34, -2, -24);
      c.bezierCurveTo(-1, -18, -7, -16, -9, -19);
      c.bezierCurveTo(-12, -11, -5, -5, 3, -6);
      c.closePath();
    };
    rs(ctx, tail, F[0], F[1], F[2], {
      cel: [2.5, 2.5],
      lw: 2.6,
      tex: (c) => {
        glow(c, -7, -27, 10, '#fff8ee', 1);
        c.fillStyle = A.c('#fbf2e6');
        c.beginPath();
        c.arc(-7, -28, 7.5, 0, TAU);
        c.fill();
        // 毛流
        [[-15, -6, -18, -14], [-17, -12, -18, -20], [-12, -3, -16, -9]].forEach(([a, b, d, e]) => line(c, (q) => { q.moveTo(a, b); q.quadraticCurveTo(a - 3, (b + e) / 2, d, e); }, F[1], 1, 0.7));
      },
    });
    ctx.restore();

    // 後腳
    re(ctx, -9 - step * 2.2, -2.5, 5.5, 3.2, PINK[0], PINK[1], null, { lw: 2, hl: false });
    // 身體：圓麻糬，淺色肚子
    re(ctx, 0, -14, 19, 14, F[0], F[1], F[2], {
      cel: [3, 3],
      rim: 1.6,
      lw: 3,
      sheen: [-6, -21, 12, 0.3],
      tex: (c) => {
        glow(c, 8, -8, 12, '#fff6ee', 0.9);
        c.fillStyle = A.c('#f8eee8');
        c.beginPath();
        c.ellipse(8, -8, 10, 7.5, -0.2, 0, TAU);
        c.fill();
        speckle(c, -6, -18, 22, 12, 9, 0.7, F[1], 17, 0.4);
        [[-12, -20], [-7, -24], [-15, -13]].forEach(([x, y]) => line(c, (q) => { q.moveTo(x, y); q.lineTo(x - 2.5, y + 2); }, F[1], 1, 0.8));
      },
    });
    re(ctx, 8 + step * 2.2, -2.5, 5.5, 3.2, PINK[0], PINK[1], null, { lw: 2, hl: false });

    // 耳朵（在頭後面，從橡實帽兩側探出來）
    const earW = Math.sin(t * 2.2) * 0.06 + (hurt ? -0.3 : 0);
    [[1, -30, 7, -0.5], [23, -31, 6.4, 0.45]].forEach(([x, y, r, a]) => {
      re(ctx, x, y, r, r * 0.95, F[0], F[1], F[2], { rot: a + earW, lw: 2.4, hl: false, cel: [1.2, 1.2] });
      re(ctx, x, y + 0.5, r * 0.58, r * 0.55, PINK[0], PINK[1], null, { rot: a + earW, noStroke: true, hl: false, cel: [0.6, 0.6] });
    });
    // 頭
    re(ctx, 12, -22, 12.5, 11.5, F[0], F[1], F[2], {
      cel: [2.5, 2.5],
      rim: 1.4,
      lw: 2.8,
      hl: [6, -28, 3, 1.8],
      tex: (c) => {
        c.fillStyle = A.c('#f8eee8');
        c.beginPath();
        c.ellipse(22.5, -16.5, 4.6, 3.8, 0, 0, TAU);
        c.fill();
      },
    });
    // 頰囊：待機時像在嚼東西一樣鼓動
    const chew = !mv && !hurt && !m.dead ? 1 + Math.max(0, Math.sin(t * 7)) * 0.1 : 1;
    re(ctx, 12.5, -14.5, 6.6 * chew, 5.4 * chew, '#d8cacd', '#b4a2a9', '#f6eef0', { lw: 2.2, hl: [10.5, -16.8, 1.8, 1.1], cel: [1.2, 1.4] });
    A.blush(ctx, 13.5, -15, 3.2);
    // 前爪捧在胸前
    re(ctx, 13, -7.5, 2.8, 2.2, PINK[0], PINK[1], null, { lw: 1.6, hl: false, cel: [0.5, 0.5] });
    re(ctx, 17.5, -8, 2.8, 2.2, PINK[0], PINK[1], null, { lw: 1.6, hl: false, cel: [0.5, 0.5] });

    // 臉
    eyes(ctx, 11, -23, 7.5, 2.8, 3.5, m, '#5a3a3a');
    const twitch = Math.sin(t * 9) > 0.6 && !m.dead ? 0.6 : 0;
    re(ctx, 24.5 + twitch * 0.4, -19.5 - twitch, 2.4, 2, '#e8768c', '#c85a70', null, { lw: 1.6, hl: [23.8, -20.4, 0.8, 0.5], hlA: 0.9, cel: [0.4, 0.4] });
    // 鬍鬚
    line(ctx, (q) => {
      q.moveTo(23, -17.5);
      q.lineTo(30, -19 - twitch);
      q.moveTo(23, -16.5);
      q.lineTo(30.5, -15.5);
      q.moveTo(22.5, -15.5);
      q.lineTo(29, -12.5);
    }, '#7a6068', 1, 0.8);
    if (hurt || m.dead) mouth(ctx, 22, -14, !m.dead, 0.8);
    else {
      // 兩顆小門牙
      rs(ctx, (c) => A.roundRect(c, 20.6, -15.4, 3.4, 3.4, 0.9), '#ffffff', '#e4e0da', null, { lw: 1.3, cel: [0.6, 0.6] });
      line(ctx, (q) => { q.moveTo(22.3, -15.2); q.lineTo(22.3, -12.4); }, null, 0.8);
    }

    // 橡實帽：鱗片紋的殼斗＋頂上的小梗
    ctx.save();
    ctx.translate(12, -31);
    ctx.rotate(-0.12 + (hurt ? -0.2 : 0) + Math.sin(t * 2.4) * 0.03);
    const cap = (c) => {
      c.moveTo(-11.5, 2);
      c.quadraticCurveTo(-12, -10, 0, -10.5);
      c.quadraticCurveTo(12, -10, 11.5, 2);
      c.quadraticCurveTo(0, 5, -11.5, 2);
      c.closePath();
    };
    rs(ctx, cap, '#9a6a3c', '#74492a', '#d8a870', {
      cel: [2, 2.4],
      rim: 1.4,
      lw: 2.6,
      tex: (c) => {
        // 殼斗的交叉鱗紋
        c.strokeStyle = A.c('#6a4226');
        c.lineWidth = 1;
        c.beginPath();
        for (let i = -4; i <= 4; i++) {
          c.moveTo(i * 4 - 6, 4);
          c.lineTo(i * 4 + 6, -12);
          c.moveTo(i * 4 + 6, 4);
          c.lineTo(i * 4 - 6, -12);
        }
        c.stroke();
        speckle(c, -2, -6, 16, 6, 8, 0.8, '#c89460', 29, 0.9);
        // 帽緣的厚度
        line(c, (q) => { q.moveTo(-12, 1.5); q.quadraticCurveTo(0, 4.5, 12, 1.5); }, '#5a3a20', 3, 0.7);
      },
    });
    stem(ctx, (q) => { q.moveTo(0, -10); q.quadraticCurveTo(0.5, -14, 3, -15); }, '#7a5230', 2);
    ctx.restore();
    ctx.restore();
  }

  // ───────────── 樹皮龜：青綠皮膚的小烏龜，背著長滿青苔、冒出嫩芽的樹樁殼；被打會縮進殼裡 ─────────────
  function barkturtle(ctx, m) {
    const t = m.t;
    const hide = m.shellT > 0;
    const mv = !hide && isMoving(m);
    const step = mv ? Math.sin(t * 9) : 0;
    const hurt = m.hurtT > 0;
    const SK = ['#7fc9b2', '#56a08c', '#c8f2e2'];
    const BK = ['#8e5f3a', '#6a4326', '#c0905e'];
    // 縮殼：剛縮進去時殼抖一下，之後穩穩趴在地上
    const shake = hide ? Math.sin(t * 40) * Math.max(0, m.shellT - 1.2) * 0.12 : 0;
    const bob = mv ? -Math.abs(step) * 1.2 : Math.sin(t * 1.8) * 0.4;
    ctx.save();
    ctx.translate(0, bob);

    const leg = (x, lift, far) => {
      const c = far ? ['#5f9a86', '#46806c', null] : SK;
      rs(ctx, (q) => A.roundRect(q, x - 5, -10 - lift, 10, 10, 4), c[0], c[1], c[2], { cel: [1.5, 1.5], lw: 2.4, rim: 1 });
      if (!far) line(ctx, (q) => { q.moveTo(x - 2, -1.5 - lift); q.lineTo(x - 2, -3.5 - lift); q.moveTo(x + 1.5, -1.5 - lift); q.lineTo(x + 1.5, -3.5 - lift); }, '#3f7868', 1.2, 0.9);
    };
    if (!hide) {
      // 尾巴＋遠側的腳
      rs(ctx, (q) => { q.moveTo(-28, -10); q.quadraticCurveTo(-38, -9, -40, -4); q.quadraticCurveTo(-34, -5, -28, -5); q.closePath(); }, SK[0], SK[1], SK[2], { cel: [1, 1.5], lw: 2.2, rim: 1 });
      leg(-16, Math.max(0, -step) * 3, true);
      leg(16, Math.max(0, step) * 3, true);
      leg(-24, Math.max(0, step) * 3, false);
      leg(9, Math.max(0, -step) * 3, false);
    }

    // 樹樁殼
    ctx.save();
    ctx.translate(-7, hide ? 0 : -5);
    ctx.rotate(shake);
    const top = -34;
    const shell = (c) => {
      c.moveTo(-26, -6);
      c.bezierCurveTo(-28, -20, -22, top + 2, -16, top);
      c.lineTo(16, top);
      c.bezierCurveTo(22, top + 2, 28, -20, 26, -6);
      c.quadraticCurveTo(0, -2, -26, -6);
      c.closePath();
    };
    rs(ctx, shell, BK[0], BK[1], BK[2], {
      cel: [4, 3],
      rim: 1.8,
      lw: 3,
      sheen: [-12, -30, 14, 0.2],
      tex: (c) => {
        // 樹皮的縱向裂紋
        [-17, -8, 1, 10, 18].forEach((x, i) => {
          line(c, (q) => { q.moveTo(x, top + 4); q.bezierCurveTo(x + 2, top + 12, x - 2, -20, x + (i - 2) * 0.8, -8); }, '#5a381e', 1.8, 0.85);
          line(c, (q) => { q.moveTo(x - 2, top + 5); q.bezierCurveTo(x, top + 12, x - 4, -20, x - 2 + (i - 2) * 0.8, -9); }, '#b98a5a', 0.9, 0.7);
        });
        speckle(c, 0, -22, 44, 30, 16, 0.8, '#4e301a', 311, 0.45);
        // 殼底一圈青苔
        c.fillStyle = A.c('#6fa844');
        c.beginPath();
        c.moveTo(-30, -2);
        for (let i = 0; i <= 12; i++) c.quadraticCurveTo(-28 + i * 4.8 - 2.4, -13 - (i % 2) * 3, -28 + i * 4.8, -9 - (i % 3) * 1.2);
        c.lineTo(30, -2);
        c.closePath();
        c.fill();
        speckle(c, 0, -9, 52, 5, 12, 0.9, '#a8d86e', 331, 0.95);
        speckle(c, 0, -6, 52, 4, 10, 0.8, '#4f7a2e', 337, 0.6);
      },
    });
    // 節瘤
    re(ctx, 10, -22, 3.4, 2.6, '#7a5032', '#553520', '#a8784c', { lw: 1.6, hl: false, cel: [0.7, 0.7], rim: 0.8 });
    line(ctx, (q) => q.ellipse(10, -22, 1.4, 1, 0, 0, TAU), '#3a2414', 1, 0.9);
    // 殼的腹甲邊（奶油色的一圈）
    rs(ctx, (c) => { c.moveTo(-28, -6); c.quadraticCurveTo(0, -1, 28, -6); c.quadraticCurveTo(29, -2, 26, -1); c.quadraticCurveTo(0, 3, -26, -1); c.quadraticCurveTo(-29, -2, -28, -6); c.closePath(); }, '#e8d4a0', '#c8ae78', '#fff4d4', { cel: [0, 1.2], lw: 2.2, rim: 0.8 });
    // 年輪切面
    re(ctx, 0, top, 17, 4.6, '#e6c48c', '#c9a068', '#fff0cc', {
      hl: false,
      cel: [0, 1.2],
      rim: 1,
      lw: 2.4,
      tex: (c) => speckle(c, 0, top, 26, 6, 8, 0.6, '#b48a52', 347, 0.6),
    });
    line(ctx, (q) => { q.ellipse(1, top, 11, 2.8, 0, 0, TAU); q.moveTo(6, top); q.ellipse(1.5, top, 5, 1.3, 0, 0, TAU); }, '#b48a52', 1.2);
    // 嫩芽：縮殼時垂下來
    const droop = hide ? 0.9 : 0;
    const sw = Math.sin(t * 2.4) * 0.12;
    const sx0 = 3, sy0 = top - 1;
    const tipX = sx0 + Math.sin(sw + droop) * 11;
    const tipY = sy0 - Math.cos(sw + droop) * 11;
    stem(ctx, (q) => { q.moveTo(sx0, sy0); q.quadraticCurveTo(sx0 + 0.5, sy0 - 6, tipX, tipY); }, '#6cae4a', 1.6);
    pointLeaf(ctx, tipX, tipY, 10, 4.2, -2.6 + sw + droop * 0.8, '#8fd46a', '#5fa543', '#d2f4a8');
    pointLeaf(ctx, tipX, tipY, 11, 4.6, -0.5 + sw + droop * 1.3, '#8fd46a', '#5fa543', '#d2f4a8');
    // 殼頂的小菇
    rs(ctx, (c) => A.roundRect(c, -12.8, top - 6, 3.6, 6, 1.2), '#fff0d6', '#e8cfa6', null, { lw: 1.8, cel: [1, 0] });
    rs(ctx, (c) => c.ellipse(-11, top - 6, 6, 4.4, 0, Math.PI, 0), '#f28c38', '#d06a20', '#ffc07a', { lw: 1.8, cel: [1.2, 1], rim: 1, hl: [-13, top - 8.5, 1.8, 1] });
    ctx.fillStyle = A.c('#fff6ea');
    ctx.beginPath();
    ctx.arc(-9, top - 8.2, 0.9, 0, TAU);
    ctx.fill();

    if (hide) {
      // 殼口：陰影裡露出一雙亮亮的眼睛（偷看）
      rs(ctx, (c) => c.ellipse(21, -11, 5.5, 5, 0, 0, TAU), '#2a1810', null, null, { lw: 2.2, tex: (c) => glow(c, 21, -10, 5, '#0e0604', 0.9) });
      if (!m.dead) {
        const peek = Math.sin(t * 2.5) > 0.9;
        ctx.fillStyle = A.c('#ffffff');
        [[19.3, -11.5], [23, -11.8]].forEach(([x, y]) => {
          ctx.beginPath();
          if (peek) ctx.fillRect(x - 1.2, y, 2.4, 0.8);
          else ctx.ellipse(x, y, 1.1, 1.5, 0, 0, TAU);
          ctx.fill();
        });
      }
      // 汗珠
      if (m.shellT > 0.6) {
        rs(ctx, (c) => { c.moveTo(26, -34); c.quadraticCurveTo(29, -29, 28.5, -27.5); c.arc(26.5, -27.5, 2, 0, Math.PI); c.quadraticCurveTo(24, -29, 26, -34); c.closePath(); }, '#bfe8ff', '#8cc8f0', null, { lw: 1.4, cel: [0.6, 0.6], hl: [25.8, -29.4, 0.6, 1] });
      }
    }
    ctx.restore();

    if (!hide) {
      // 頭與脖子
      const nod = mv ? Math.sin(t * 9 + 1) * 1 : Math.sin(t * 1.8) * 1.2;
      const hx = 31;
      const hy = -20 + nod + (hurt ? 3 : 0);
      rs(ctx, (q) => { q.moveTo(12, -10); q.quadraticCurveTo(19, -22, hx - 4, hy - 2); q.lineTo(hx - 2, hy + 8); q.quadraticCurveTo(21, -8, 15, -6); q.closePath(); }, SK[0], SK[1], SK[2], { cel: [1.5, 2], lw: 2.6, rim: 1.2, tex: (c) => [0, 1, 2].forEach((i) => line(c, (q) => { q.moveTo(18 + i * 3, -10 - i * 2.6); q.quadraticCurveTo(21 + i * 3, -8 - i * 2.4, 22 + i * 3, -11 - i * 2.6); }, SK[1], 1, 0.8)) });
      re(ctx, hx, hy, 11, 9.5, SK[0], SK[1], SK[2], {
        cel: [2, 2.2],
        rim: 1.4,
        lw: 2.8,
        hl: [hx - 4, hy - 5, 3, 1.6],
        tex: (c) => {
          speckle(c, hx - 3, hy - 4, 12, 6, 6, 0.9, '#5fae96', 211, 0.6);
          c.fillStyle = A.c('#e3f6c8');
          c.beginPath();
          c.ellipse(hx + 4, hy + 5.5, 7, 3.6, -0.1, 0, TAU);
          c.fill();
        },
      });
      eyes(ctx, hx - 1, hy - 1.5, 7, 2.9, 3.6, m, '#3a6a2a');
      if (hurt || m.dead) mouth(ctx, hx + 6, hy + 4.5, !m.dead, 0.8);
      else line(ctx, (q) => { q.moveTo(hx + 1.5, hy + 4); q.quadraticCurveTo(hx + 5.5, hy + 7, hx + 9.5, hy + 3); }, null, 1.6);
      A.blush(ctx, hx - 4, hy + 3.5, 2.8);
    }
    ctx.restore();
  }


  // ───────────── 小野豬：身上有奶油色條紋的小山豬，頭頂一片葉子、兩根小獠牙；被惹毛會低頭衝撞 ─────────────
  function boarlet(ctx, m) {
    const t = m.t;
    const charge = m.chargeT > 0;
    const mv = isMoving(m);
    const hurt = m.hurtT > 0;
    const sp = charge ? 26 : 13;
    const step = mv || charge ? Math.sin(t * sp) : 0;
    const B = ['#bb774a', '#8e5230', '#eaae7c'];
    const ST = '#f4dfb2';
    const SN = ['#f4bca6', '#d88e7a', '#ffe2d6'];
    const HOOF = '#5a3a2a';
    const sy = hopSquash(m);

    // 衝撞：身後揚起的塵土與速度線（在身體後面、不跟著身體傾斜）
    if (charge && !m.dead) {
      for (let i = 0; i < 4; i++) {
        const k = (t * 3 + i * 0.25) % 1;
        const r = 4 + k * 7;
        ctx.save();
        ctx.globalAlpha *= (1 - k) * 0.85;
        re(ctx, -24 - k * 26 - i * 3, -4 - k * 8 + (i % 2) * 2, r, r * 0.8, '#e6d4ae', '#c8b088', null, { lw: 1.6, hl: false, cel: [r * 0.2, r * 0.25] });
        ctx.restore();
      }
      [[-34, -20, 14], [-38, -30, 10], [-30, -12, 9]].forEach(([x, y, l], i) => {
        const o = ((t * 60 + i * 13) % 12);
        line(ctx, (q) => { q.moveTo(x - o, y); q.lineTo(x - o - l, y); }, '#ffffff', 2, 0.7);
      });
    }

    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);
    if (charge) {
      // 低頭往前衝
      ctx.translate(22, 0);
      ctx.rotate(0.16);
      ctx.translate(-22, 0);
    }
    ctx.translate(0, mv || charge ? -Math.abs(step) * 1.4 : Math.sin(t * 2.2) * 0.4);

    const leg = (x, lift, far) => {
      const c = far ? ['#8a4e2e', '#6a3a22', null] : B;
      rs(ctx, (q) => A.roundRect(q, x - 3.6, -11 - lift, 7.2, 11, 3), c[0], c[1], c[2], {
        cel: [1.2, 1],
        lw: 2.2,
        rim: 1,
        tex: (q) => { q.fillStyle = A.c(HOOF); q.fillRect(x - 5, -3.4 - lift, 10, 4); },
      });
    };
    // 小捲尾
    stem(ctx, (q) => {
      q.moveTo(-23, -21);
      q.quadraticCurveTo(-29, -22, -29, -27);
      q.quadraticCurveTo(-29, -31, -26, -30);
      q.quadraticCurveTo(-24, -28, -27, -26);
    }, B[0], 1.8);
    leg(-11, Math.max(0, step) * 3, true);
    leg(12, Math.max(0, -step) * 3, true);
    // 身體：三道奶油色條紋（山豬寶寶的西瓜紋）
    const body = (c) => c.ellipse(-3, -19, 22, 14, -0.04, 0, TAU);
    rs(ctx, body, B[0], B[1], B[2], {
      cel: [3, 3],
      rim: 1.6,
      lw: 3,
      sheen: [-10, -26, 12, 0.25],
      tex: (c) => {
        [[-27, -0.6], [-21, 0.2], [-14, 0.9]].forEach(([y, k]) => {
          c.fillStyle = A.c(ST);
          c.beginPath();
          c.moveTo(-26, y + 3 + k * 2);
          c.quadraticCurveTo(-4, y - 3.5 + k, 20, y + 1 + k * 2);
          c.quadraticCurveTo(-4, y - 0.5 + k, -26, y + 5 + k * 2);
          c.closePath();
          c.fill();
        });
        speckle(c, -4, -18, 36, 20, 12, 0.7, '#7a4424', 413, 0.35);
        c.fillStyle = lg(c, 0, -12, 0, -5, [[0, B[1], 0], [1, B[1], 0.6]]);
        c.fillRect(-30, -12, 60, 8);
      },
    });
    // 背上的一排硬鬃
    rs(ctx, (c) => {
      c.moveTo(-19, -29);
      for (let i = 0; i < 7; i++) {
        const x = -19 + i * 4.6;
        const y = -31.5 - Math.sin((i / 6) * Math.PI) * 2.2;
        c.lineTo(x + 1.6, y - 4.5 - (i % 2) * 1.5);
        c.lineTo(x + 4.6, y + 0.4);
      }
      c.quadraticCurveTo(-4, -30, -19, -29);
      c.closePath();
    }, '#6a3c24', '#4e2a18', '#9a6644', { cel: [0.8, 1], lw: 2, rim: 0.8 });
    leg(-17, Math.max(0, -step) * 3, false);
    leg(6, Math.max(0, step) * 3, false);

    // 頭
    const hx = 16;
    const hy = -24 + (charge ? 1 : 0);
    // 遠側的耳朵
    const earA = charge ? -0.7 : hurt ? -0.5 : Math.sin(t * 2.6) * 0.1;
    ctx.save();
    ctx.translate(hx + 5, hy - 8);
    ctx.rotate(earA);
    rs(ctx, (c) => { c.moveTo(-3, 1); c.quadraticCurveTo(-3, -6, 2, -8); c.quadraticCurveTo(5, -3, 4, 1); c.closePath(); }, '#8a4e2e', '#6a3a22', null, { cel: [0.8, 0.8], lw: 2 });
    ctx.restore();
    re(ctx, hx, hy, 12.5, 11, B[0], B[1], B[2], {
      cel: [2.4, 2.4],
      rim: 1.4,
      lw: 2.8,
      hl: [hx - 5, hy - 5, 3, 1.6],
      tex: (c) => {
        c.fillStyle = A.c(ST);
        c.beginPath();
        c.ellipse(hx + 4, hy + 6, 8, 4.4, -0.15, 0, TAU);
        c.fill();
      },
    });
    // 近側的耳朵
    ctx.save();
    ctx.translate(hx - 4, hy - 8);
    ctx.rotate(earA - 0.2);
    rs(ctx, (c) => { c.moveTo(-4.5, 1); c.quadraticCurveTo(-5, -7, 1, -9); c.quadraticCurveTo(5, -3, 4, 1); c.closePath(); }, B[0], B[1], B[2], {
      cel: [1, 1],
      lw: 2.2,
      rim: 1,
      tex: (c) => { c.fillStyle = A.c('#e89a88'); c.beginPath(); c.moveTo(-2, -0.5); c.quadraticCurveTo(-2.4, -5, 0.8, -6.4); c.quadraticCurveTo(2.4, -3, 2, -0.5); c.closePath(); c.fill(); },
    });
    ctx.restore();
    // 鼻子（圓圓的豬鼻）＋獠牙
    const sx = hx + 12;
    const sny = hy + 3;
    re(ctx, sx, sny, 5, 6.4, SN[0], SN[1], SN[2], { lw: 2.4, rim: 1, hl: [sx - 2, sny - 3.4, 1.4, 1], cel: [1, 1] });
    rs(ctx, (c) => { c.moveTo(sx - 1.5, sny + 7.5); c.quadraticCurveTo(sx - 7, sny + 7.5, sx - 8, sny + 1); c.quadraticCurveTo(sx - 5, sny + 4.6, sx - 2.2, sny + 4.6); c.closePath(); }, '#fffaf0', '#e0d8c4', null, { lw: 1.6, cel: [0.5, 0.6] });
    ctx.fillStyle = A.c('#8a4a3a');
    ctx.beginPath();
    ctx.ellipse(sx + 1.4, sny - 2, 1, 1.6, 0, 0, TAU);
    ctx.ellipse(sx + 1.4, sny + 2.2, 1, 1.6, 0, 0, TAU);
    ctx.fill();
    // 眼睛與眉毛
    const ang = charge || m.angry;
    eyes(ctx, hx - 1, hy - 3, 6.8, 2.8, 3.6, m, '#6a3a1a', ang);
    if (hurt || charge || m.dead) mouth(ctx, hx + 5, hy + 6.8, !m.dead, 0.75);
    else line(ctx, (q) => { q.moveTo(hx + 2, hy + 6); q.quadraticCurveTo(hx + 4.5, hy + 8.2, hx + 7, hy + 6.2); }, null, 1.6);
    A.blush(ctx, hx - 5, hy + 4, 2.8);
    // 頭上的葉子
    const lsw = Math.sin(t * 2.6) * 0.12 + (charge ? -0.35 : 0);
    stem(ctx, (q) => { q.moveTo(hx + 1, hy - 10); q.quadraticCurveTo(hx + 1, hy - 13, hx + 2, hy - 14); }, '#6cae4a', 1.4);
    pointLeaf(ctx, hx + 2, hy - 14, 19, 7, -2.1 + lsw, '#86cf58', '#58a13c', '#d0f4a4', 2.2);
    pointLeaf(ctx, hx + 2, hy - 14, 10, 4, -0.7 + lsw * 0.6, '#9ad86a', '#62a845', '#d8f8b0', 1.8);
    if (charge && !m.dead) {
      // 鼻孔噴氣
      const k = (t * 4) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - k;
      re(ctx, sx + 7 + k * 6, sny + 6 + k * 2, 2 + k * 2.4, 1.6 + k * 1.8, '#ffffff', '#e0e8ee', null, { lw: 1.2, hl: false, cel: [0.4, 0.4] });
      ctx.restore();
    }
    ctx.restore();
  }

  // ───────────── 提燈螢：飄在半空的大螢火蟲，尾巴是一盞會發光的小紙燈籠；蓄力時燈越來越亮 ─────────────
  function lanternfly(ctx, m) {
    const t = m.t;
    const hurt = m.hurtT > 0;
    const ph = m.attackT > 0 ? m.attackPhase : null;
    // 蓄力 0→1；放出去的瞬間閃一下
    const wind = ph === 'wind' ? U.clamp(1 - m.attackT / 0.45, 0, 1) : 0;
    const flash = ph === 'strike' || ph === 'recover' ? U.clamp(m.attackT / 0.3, 0, 1) : 0;
    const lit = m.dead ? 0.15 : 0.55 + Math.sin(t * 3.2) * 0.15 + wind * 0.5 + flash * 0.5;
    const BD = ['#3e4388', '#2a2d62', '#8a92da'];
    const HOOD = ['#f0783e', '#c8522a', '#ffb888'];
    const fy = -1 + (m.dead ? 0 : Math.sin(t * 2.4) * 3);
    ctx.save();
    ctx.translate(0, fy);
    // 往前傾一點，蓄力時身體往後縮、燈籠往前捲
    ctx.rotate(-0.04 - wind * 0.08 + (hurt ? -0.15 : 0));

    // 薄翅（最後面，快速拍動）
    const flap = m.dead ? 0.4 : 0.35 + Math.abs(Math.sin(t * 26)) * 0.65;
    [[-6, -48, -0.55, '#d8ecff'], [-2, -50, -0.95, '#e8f4ff']].forEach(([x, y, r, col]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      ctx.scale(1, flap);
      ctx.globalAlpha *= 0.6;
      rs(ctx, (c) => c.ellipse(-12, 0, 14, 6.5, 0, 0, TAU), col, '#b8d4f0', null, { lw: 1.6, cel: [0, 2], tex: (c) => line(c, (q) => { q.moveTo(0, 0); q.quadraticCurveTo(-12, -2, -24, 0); q.moveTo(-4, 1); q.lineTo(-18, 4); }, '#9ab8e0', 0.8, 0.8) });
      ctx.restore();
    });

    // 燈籠尾巴
    const jx = -1;
    const jy = -32;
    const curl = 0.15 + wind * 0.55 - flash * 0.2 + (m.dead ? 0 : Math.sin(t * 2.4 + 1) * 0.05);
    const lr = 1 + wind * 0.08;
    // 身後的光暈（跟著燈籠）
    const lcx = jx + Math.cos(Math.PI - 0.5 - curl) * 13;
    const lcy = jy - Math.sin(Math.PI - 0.5 - curl) * 13 + 10;
    glow(ctx, lcx, lcy, 30 + wind * 18 + flash * 16, '#fff27a', 0.45 * lit);
    ctx.save();
    ctx.translate(jx, jy);
    ctx.rotate(-curl);
    ctx.scale(lr, lr);
    const lan = (c) => c.ellipse(-12, 6, 13, 11.5, 0.35, 0, TAU);
    rs(ctx, lan, '#fff4a0', '#f5c64e', '#ffffff', {
      cel: [2.5, 3],
      rim: 1.4,
      lw: 2.8,
      tex: (c) => {
        glow(c, -13, 5, 14, '#ffffff', 0.5 + lit * 0.4);
        // 燈籠的竹骨
        for (let i = -2; i <= 2; i++) {
          line(c, (q) => { q.ellipse(-12, 6, Math.abs(i) * 4.2 + 1, 11.5, 0.35, 0, TAU); }, '#e6a83a', 1, i === 0 ? 0 : 0.55);
        }
        [-6, 0, 6].forEach((d) => line(c, (q) => {
          const ca = Math.cos(0.35), sa = Math.sin(0.35);
          q.moveTo(-12 + ca * -13 - sa * d, 6 + sa * -13 + ca * d);
          q.lineTo(-12 + ca * 13 - sa * d, 6 + sa * 13 + ca * d);
        }, '#e6a83a', 0.9, 0.35));
      },
    });
    // 燈籠尾端的金色小蓋＋垂下來的紅穗子
    ctx.save();
    ctx.translate(-12 - Math.cos(0.35) * 12.5, 6 - Math.sin(0.35) * 12.5);
    ctx.rotate(0.35);
    rs(ctx, (c) => A.roundRect(c, -3, -4.5, 4, 9, 1.6), '#d8a040', '#b07a2a', '#ffe0a0', { lw: 1.8, cel: [0.6, 0.6], rim: 0.7 });
    const sw = Math.sin(t * 3) * 0.2;
    ctx.rotate(-0.35 - curl * 0.5 + sw);
    line(ctx, (q) => { q.moveTo(-1, 0); q.lineTo(-1, 6); }, '#c83a2a', 1.4);
    rs(ctx, (c) => { c.moveTo(-2.6, 6); c.lineTo(0.6, 6); c.lineTo(1.2, 11); c.lineTo(-3.2, 11); c.closePath(); }, '#e8483a', '#b8302a', null, { lw: 1.4, cel: [0.5, 0.5] });
    ctx.restore();
    // 燈籠和身體的接口（金環）
    rs(ctx, (c) => c.ellipse(0.5, -1, 3.6, 6, 0.35, 0, TAU), '#d8a040', '#b07a2a', '#ffe0a0', { lw: 2, cel: [0.8, 0.8], rim: 0.8, hl: false });
    ctx.restore();
    if (wind > 0 || flash > 0) {
      // 蓄力：燈籠本身越來越亮，周圍冒出小光點
      const k = Math.max(wind, flash);
      glow(ctx, lcx, lcy, 16 + k * 6, '#ffffff', 0.75 * k);
      for (let i = 0; i < 5; i++) {
        const a = t * 2 + i * 1.26;
        const rr = 20 - wind * 8 + Math.sin(t * 5 + i) * 2;
        glow(ctx, lcx + Math.cos(a) * rr, lcy + Math.sin(a) * rr, 4, '#fff27a', 0.9 * k);
      }
    }
    if (flash > 0) {
      // 放光的一圈
      ctx.save();
      ctx.globalAlpha *= flash;
      line(ctx, (q) => q.arc(lcx, lcy, 16 + (1 - flash) * 14, 0, TAU), '#fffbd0', 2.4);
      ctx.restore();
    }

    // 細腳（在胸下晃）
    const lg0 = m.dead ? 0 : Math.sin(t * 5);
    [[1, 0], [5, 1.2], [9, 2.4]].forEach(([x, ph2], i) => {
      const k = Math.sin(t * 5 + ph2) * (m.dead ? 0 : 1.5);
      stem(ctx, (q) => { q.moveTo(x, -30); q.quadraticCurveTo(x + 2 + k, -25, x + 1 + k * 1.3 + i, -20 + lg0 * 0.3); }, '#2a2d62', 1.4);
    });
    // 胸
    re(ctx, 5, -34, 8.5, 7.5, BD[0], BD[1], BD[2], { lw: 2.6, cel: [1.5, 1.5], rim: 1.2, hl: false });
    // 鞘翅（半開，藍色硬殼上有細細的縱紋與亮點）
    const ely = (dx, a, col) => {
      ctx.save();
      ctx.translate(4 + dx, -40);
      ctx.rotate(a + (m.dead ? 0 : Math.sin(t * 26) * 0.03));
      rs(ctx, (c) => { c.moveTo(0, 0); c.quadraticCurveTo(-8, -9, -24, -6); c.quadraticCurveTo(-20, 2, -2, 4); c.closePath(); }, col[0], col[1], col[2], {
        lw: 2.4,
        cel: [1.4, 1.6],
        rim: 1.2,
        tex: (c) => {
          line(c, (q) => { q.moveTo(-3, 0); q.quadraticCurveTo(-10, -4, -21, -4); }, col[2], 0.9, 0.7);
          speckle(c, -12, -2, 16, 5, 5, 0.7, '#b8c0ff', 523 + dx, 0.7);
        },
      });
      ctx.restore();
    };
    ely(-3, 0.05 - wind * 0.15, ['#343a7c', '#23265a', '#6e78c8']);
    ely(0, -0.2 - wind * 0.2, BD);

    // 頭
    const hx = 16;
    const hy = -40;
    re(ctx, hx, hy, 11, 10, BD[0], BD[1], BD[2], {
      cel: [2, 2],
      rim: 1.4,
      lw: 2.8,
      hl: false,
      tex: (c) => {
        c.fillStyle = A.c('#5a60a8');
        c.beginPath();
        c.ellipse(hx + 3, hy + 4, 7, 4.5, 0, 0, TAU);
        c.fill();
      },
    });
    // 觸角（尖端的小燈）
    const perk = wind * 0.3;
    [[hx - 1, hx + 3, -0.1], [hx + 5, hx + 11, 0.15]].forEach(([x0, x1, dd], i) => {
      const bend = m.dead ? 3 : Math.sin(t * 3 + i) * 1.2;
      const tx = x1 + 3 + perk * 6;
      const ty = hy - 20 + bend - perk * 4 + i * 1.5;
      stem(ctx, (q) => { q.moveTo(x0, hy - 8); q.quadraticCurveTo(x1 - 3, hy - 16 - perk * 4, tx, ty); }, '#2a2d62', 1.4);
      glow(ctx, tx, ty, 6 + wind * 4, '#fff27a', 0.6 * lit);
      re(ctx, tx, ty, 2.4, 2.4, '#fff6a8', '#f0c84a', null, { lw: 1.4, hl: false, cel: [0.4, 0.4] });
    });
    // 橘色頭罩（前胸背板）：像一頂小帽子，上面兩顆深色斑點
    rs(ctx, (c) => {
      c.moveTo(hx - 12, hy - 1);
      c.bezierCurveTo(hx - 13, hy - 13, hx + 7, hy - 16, hx + 11, hy - 5);
      c.quadraticCurveTo(hx + 4, hy - 8, hx - 3, hy - 5);
      c.quadraticCurveTo(hx - 8, hy - 3, hx - 12, hy - 1);
      c.closePath();
    }, HOOD[0], HOOD[1], HOOD[2], {
      cel: [1.6, 1.8],
      rim: 1.2,
      lw: 2.6,
      hl: [hx - 3, hy - 10, 3, 1.4],
      tex: (c) => {
        c.fillStyle = A.c('#9a3a1e');
        c.beginPath();
        c.ellipse(hx - 5, hy - 7, 2.2, 1.6, -0.3, 0, TAU);
        c.fill();
      },
    });
    // 大眼：白色的眼白外圈，在深色的頭上才看得清楚
    [[hx + 1, hy + 0.5, 4.6], [hx + 8.5, hy, 4.2]].forEach(([x, y, r]) => {
      re(ctx, x, y, r, r * 1.08, '#ffffff', '#dfe4f2', null, { lw: 1.8, hl: false, cel: [0.6, 0.8] });
    });
    const kind = eyeKind(m, false);
    eye(ctx, hx + 1.6, hy + 1, 3, 3.6, kind, '#d89a2a', 0.4);
    eye(ctx, hx + 9, hy + 0.5, 2.7, 3.3, kind, '#d89a2a', 0.4);
    if (hurt || wind > 0 || m.dead) mouth(ctx, hx + 6, hy + 6.5, !m.dead, 0.7);
    else line(ctx, (q) => { q.moveTo(hx + 3.5, hy + 6); q.quadraticCurveTo(hx + 6, hy + 8.2, hx + 8.5, hy + 6); }, '#ffe9b0', 1.5);
    A.blush(ctx, hx - 2.5, hy + 5, 2.4);
    ctx.restore();
  }

  // ───────────── 藤尾蜥：站起來走路的小綠蜥蜴，脖子一圈葉片領、尾巴是一條長藤；攻擊時藤尾從頭上甩向前方 ─────────────
  function vinelizard(ctx, m) {
    const t = m.t;
    const hurt = m.hurtT > 0;
    const mv = isMoving(m);
    const step = mv ? Math.sin(t * 13) : 0;
    const whip = m.attackT > 0 && m.attackKind === 'whip';
    const wind = whip && m.attackPhase === 'wind' ? U.clamp(1 - m.attackT / 0.35, 0, 1) : 0;
    const sk = whip && m.attackPhase === 'strike' ? U.clamp(1 - m.attackT / 0.22, 0, 1) : -1;
    const lash = sk < 0 ? 0 : sk < 0.75 ? Math.min(1, 0.6 + sk * 2.5) : 1 - (sk - 0.75) * 1.4;
    const flare = Math.max(wind, sk >= 0 ? 1 : 0, m.angry ? 0.6 : 0);
    const G1 = ['#6cc44c', '#48993a', '#c6f29c'];
    const BEL = ['#f4e8a2', '#dcc878', '#fffbe0'];
    const sy = hopSquash(m);
    ctx.save();
    ctx.scale(1 / Math.sqrt(sy), sy);
    ctx.translate(0, mv ? -Math.abs(step) * 1.5 : Math.sin(t * 2.2) * 0.4);

    // 藤尾：待機時在身後捲成一圈、蓄力時高舉過頭、出手時從頭上甩到前方
    const lerpP = (a, b, k) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k]);
    const w0 = Math.sin(t * 2.6) * 2;
    const IDLE = [[-6, -12], [-28, -8 + w0], [-34, -32], [-20, -38 - w0]];
    const WIND = [[-6, -14], [-30, -22], [-28, -60], [-6, -62]];
    const HIT = [[-6, -16], [-8, -64], [52, -52], [98, -28]];
    let P = lerpP(IDLE, WIND, wind);
    if (sk >= 0) P = lerpP(WIND, HIT, lash);
    if (hurt) P = lerpP(P, [[-6, -12], [-24, -4], [-36, -12], [-40, -4]], 0.6);
    if (m.dead) P = [[-6, -10], [-22, -4], [-34, -6], [-40, -2]];
    if (sk >= 0 && sk < 0.7) {
      // 甩尾的殘影弧線
      ctx.save();
      ctx.globalAlpha *= 0.55 * (1 - sk);
      line(ctx, (q) => { q.moveTo(-10, -58); q.quadraticCurveTo(50, -80, 96, -30); }, '#ffffff', 3);
      line(ctx, (q) => { q.moveTo(0, -48); q.quadraticCurveTo(46, -64, 82, -22); }, '#e8ffd0', 2);
      ctx.restore();
    }
    const pts = taper(ctx, P, 6.5, 2.2, '#5fb046', '#b4ea88', 18);
    // 藤上的小葉子（交錯長在兩側）
    [[5, 1], [9, -1], [13, 1], [16, -1]].forEach(([i, side]) => {
      const a = pts[i];
      const b = pts[i + 1];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      pointLeaf(ctx, a[0], a[1], 7, 3, ang + side * 1.0, '#8fd46a', '#5fa543', null, 1.5);
    });
    {
      const a = pts[16];
      const b = pts[18];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      // 尾端的捲鬚＋一片大葉
      pointLeaf(ctx, b[0], b[1], 11, 4.6, ang, '#9ad86a', '#62a845', '#d8f8b0', 1.8);
      if (sk < 0) line(ctx, (q) => { q.moveTo(b[0], b[1]); q.arc(b[0] + Math.cos(ang - 1.6) * 3, b[1] + Math.sin(ang - 1.6) * 3, 3, ang + 1.6, ang + 1.6 + 5); }, '#5fb046', 1.4);
    }

    // 後腳
    const foot = (x, lift, far) => {
      const c = far ? ['#4f9e3a', '#3c7e2c', null] : G1;
      re(ctx, x - 1, -7 - lift, 5.5, 6, c[0], c[1], c[2], { lw: 2.4, hl: false, cel: [1, 1], rim: 1 });
      re(ctx, x + 2, -2 - lift, 6, 2.6, c[0], c[1], null, { lw: 2.2, hl: false, cel: [0.6, 0.6] });
      if (!far) line(ctx, (q) => { q.moveTo(x + 4, -3.4 - lift); q.lineTo(x + 4, -1.2 - lift); q.moveTo(x + 1, -3.6 - lift); q.lineTo(x + 1, -1.2 - lift); }, '#3c7e2c', 1, 0.9);
    };
    foot(8, Math.max(0, -step) * 3, true);
    // 身體
    re(ctx, 1, -20, 11.5, 13.5, G1[0], G1[1], G1[2], {
      cel: [2.6, 2.6],
      rim: 1.5,
      lw: 2.8,
      hl: false,
      tex: (c) => {
        c.fillStyle = A.c(BEL[0]);
        c.beginPath();
        c.ellipse(6, -17, 6.5, 10, 0.1, 0, TAU);
        c.fill();
        [-22, -18, -14, -10].forEach((y) => line(c, (q) => { q.moveTo(1, y); q.quadraticCurveTo(6, y + 1.4, 11, y - 0.4); }, BEL[1], 1, 0.8));
        speckle(c, -6, -24, 8, 14, 6, 1.3, '#3f8a30', 611, 0.6);
      },
    });
    foot(-4, Math.max(0, step) * 3, false);
    // 小手：蓄力時握拳舉起
    const armUp = Math.max(wind, sk >= 0 ? 0.6 : 0);
    re(ctx, 11 + armUp, -21 - armUp * 5, 3.6, 2.8, G1[0], G1[1], null, { lw: 2, hl: false, rot: -0.6 - armUp * 0.6, cel: [0.6, 0.6] });

    // 葉片領：從脖子後面放射出去，生氣／蓄力時張開
    const hx = 5;
    const hy = -39;
    const fsw = Math.sin(t * 2.5) * 0.06;
    [[-1.15, '#b4e25c'], [-1.7, '#8fd04e'], [-2.25, '#b4e25c'], [-2.8, '#8fd04e'], [-3.35, '#b4e25c'], [-3.85, '#8fd04e']].forEach(([a, col], i) => {
      const ang = a + (a + 2.5) * flare * 0.3 + fsw * (i % 2 ? 1 : -1);
      const len = 18 + (i % 2) * 2 - (i === 0 || i === 5 ? 3 : 0) + flare * 5;
      pointLeaf(ctx, hx - 4, hy + 1, len, 6.2, ang, col, '#5fa543', '#e0fab8', 2);
    });
    // 頭：圓頭＋往前的長吻
    const head = (c) => {
      c.moveTo(hx - 9, hy + 9);
      c.bezierCurveTo(hx - 15, hy + 2, hx - 11, hy - 12, hx + 1, hy - 12);
      c.bezierCurveTo(hx + 9, hy - 12, hx + 12, hy - 7, hx + 16, hy - 4.5);
      c.bezierCurveTo(hx + 22, hy - 2, hx + 23, hy + 6, hx + 17, hy + 8);
      c.bezierCurveTo(hx + 10, hy + 10, hx - 2, hy + 12, hx - 9, hy + 9);
      c.closePath();
    };
    rs(ctx, head, G1[0], G1[1], G1[2], {
      cel: [2.4, 2.4],
      rim: 1.5,
      lw: 2.8,
      hl: [hx - 3, hy - 8, 3.4, 1.6],
      sheen: [hx - 2, hy - 6, 9, 0.25],
      tex: (c) => {
        c.fillStyle = A.c(BEL[0]);
        c.beginPath();
        c.ellipse(hx + 10, hy + 8.5, 10, 3.6, -0.05, 0, TAU);
        c.fill();
        speckle(c, hx - 4, hy - 6, 10, 6, 5, 1.1, '#3f8a30', 631, 0.6);
      },
    });
    // 眼睛（長在頭頂，大大的）
    eyes(ctx, hx + 1, hy - 3, 7.5, 3.2, 4, m, '#c07a1a');
    // 鼻孔、嘴
    ctx.fillStyle = A.c('#2f5a22');
    ctx.beginPath();
    ctx.ellipse(hx + 19, hy - 1.5, 0.9, 0.7, 0, 0, TAU);
    ctx.fill();
    if (hurt || wind > 0 || sk >= 0 || m.dead) mouth(ctx, hx + 15, hy + 5, !m.dead, 0.8);
    else line(ctx, (q) => { q.moveTo(hx + 6, hy + 4.5); q.quadraticCurveTo(hx + 13, hy + 7.4, hx + 20, hy + 3.6); }, null, 1.6);
    A.blush(ctx, hx + 4, hy + 4, 2.6);
    ctx.restore();
  }

  // ───────────── 花瓣蝶：頭是一朵向日小花、翅膀是四片大花瓣的花仙子蝴蝶；揮手射出一串花瓣 ─────────────
  function petalWing(ctx, len, wd, col, colS, rim, spot, seed) {
    rs(ctx, (c) => {
      c.moveTo(0, 0);
      c.bezierCurveTo(len * 0.25, -wd, len * 0.8, -wd * 1.1, len, -wd * 0.25);
      c.quadraticCurveTo(len * 0.9, 0, len, wd * 0.25);
      c.bezierCurveTo(len * 0.8, wd * 1.1, len * 0.25, wd, 0, 0);
      c.closePath();
    }, col, colS, rim, {
      cel: [0, wd * 0.35],
      rim: 1.2,
      lw: 2.2,
      tex: (c) => {
        c.fillStyle = lg(c, 0, 0, len, 0, [[0, colS, 0.8], [0.45, col, 0], [1, '#ffffff', 0.35]]);
        c.fillRect(-2, -wd * 1.3, len + 4, wd * 2.6);
        [-0.35, 0, 0.35].forEach((k) => line(c, (q) => { q.moveTo(len * 0.06, 0); q.quadraticCurveTo(len * 0.5, wd * k * 1.2, len * 0.88, wd * k * 1.6); }, colS, 0.9, 0.75));
        if (spot) {
          glow(c, len * 0.68, 0, wd * 0.7, '#fff6b0', 0.8);
          c.fillStyle = A.c('#ffe066');
          c.beginPath();
          c.arc(len * 0.68, 0, wd * 0.28, 0, TAU);
          c.fill();
          c.fillStyle = A.c('#ffffff');
          c.beginPath();
          c.arc(len * 0.66, -wd * 0.1, wd * 0.1, 0, TAU);
          c.fill();
        }
        speckle(c, len * 0.5, 0, len * 0.6, wd, 5, 0.6, '#ffffff', seed, 0.7);
      },
    });
  }
  function petalfly(ctx, m) {
    const t = m.t;
    const hurt = m.hurtT > 0;
    const ph = m.attackT > 0 ? m.attackPhase : null;
    const wind = ph === 'wind' ? U.clamp(1 - m.attackT / 0.45, 0, 1) : 0;
    const shot = ph === 'strike' || ph === 'recover' ? U.clamp(m.attackT / 0.3, 0, 1) : 0;
    const fy = -3 + (m.dead ? 0 : Math.sin(t * 2) * 3);
    const flapA = m.dead ? 0 : Math.sin(t * 6) * (0.32 - wind * 0.2) - wind * 0.25 + (hurt ? 0.35 : 0);
    const WP = ['#ff9ec8', '#e674a6', '#ffd8ea'];
    const WL = ['#c9a8ff', '#9c7ce0', '#ece0ff'];
    ctx.save();
    ctx.translate(0, fy);

    // 飄落的花粉
    if (!m.dead) {
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.5 + i / 3) % 1;
        glow(ctx, -14 + i * 9 + Math.sin(t * 2 + i * 2) * 4, -40 + k * 34, 3.4, '#fff27a', 0.85 * (1 - k));
      }
    }
    // 翅膀：遠側兩片（暗一點）→ 身體 → 近側兩片
    const ax = -4;
    const ay = -32;
    const wing = (a, len, wd, C, spot, seed, sx) => {
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(a);
      ctx.scale(1, sx);
      petalWing(ctx, len, wd, C[0], C[1], C[2], spot, seed);
      ctx.restore();
    };
    const dimP = [U.mix(WP[0], '#b06a9a', 0.35), U.mix(WP[1], '#8a4a7a', 0.35), null];
    const dimL = [U.mix(WL[0], '#7a64b0', 0.35), U.mix(WL[1], '#5a4a90', 0.35), null];
    wing(-1.72 + flapA * 0.7, 34, 12.5, dimP, true, 701, 0.9);
    wing(-2.85 + flapA * 0.4, 22, 8.5, dimL, false, 709, 0.9);
    // 腳與葉裙
    const kick = m.dead ? 0 : Math.sin(t * 4) * 1.5;
    stem(ctx, (q) => { q.moveTo(0, -16); q.quadraticCurveTo(-1, -11, -2 + kick * 0.5, -8); q.moveTo(4, -16); q.quadraticCurveTo(5, -11, 5 - kick * 0.5, -8); }, '#7cc05a', 1.4);
    re(ctx, -2 + kick * 0.5, -7.5, 2, 1.6, '#7cc05a', '#5a9a3e', null, { lw: 1.4, hl: false, cel: [0.3, 0.3] });
    re(ctx, 5 - kick * 0.5, -7.5, 2, 1.6, '#7cc05a', '#5a9a3e', null, { lw: 1.4, hl: false, cel: [0.3, 0.3] });
    pointLeaf(ctx, 2, -20, 9, 4, 2.2, '#8fd46a', '#5fa543', '#d2f4a8', 1.8);
    pointLeaf(ctx, 2, -20, 9, 4, 0.95, '#8fd46a', '#5fa543', '#d2f4a8', 1.8);
    // 身體：嫩綠色的花莖身體，一節一節
    re(ctx, 2, -27, 6, 9.5, '#b4e48a', '#86c45e', '#e4fac8', {
      lw: 2.4,
      hl: false,
      cel: [1.2, 1.2],
      rim: 1.1,
      tex: (c) => [-31, -27, -23].forEach((y) => line(c, (q) => { q.moveTo(-4, y); q.quadraticCurveTo(2, y + 1.6, 8, y); }, '#86c45e', 1, 0.8)),
    });
    // 近側翅膀
    wing(-2.12 + flapA, 36, 13.5, WP, true, 713, 1);
    wing(-3.05 + flapA * 0.6, 23, 9, WL, false, 719, 1);
    // 手：蓄力時捧著一團花瓣旋渦，出手時往前推
    const hand = [7 + wind * 3 + shot * 6, -28 - wind * 6 + shot * 2];
    if (wind > 0 || shot > 0) {
      const k = Math.max(wind, shot);
      glow(ctx, hand[0] + 5, hand[1], 12 + k * 6, '#ffb8d8', 0.7 * k);
      for (let i = 0; i < 3; i++) {
        const a = t * 9 + i * 2.09;
        const px = hand[0] + 5 + Math.cos(a) * (6 + shot * 8);
        const py = hand[1] + Math.sin(a) * (4 + shot * 5);
        ctx.save();
        ctx.globalAlpha *= k;
        pointLeaf(ctx, px, py, 6, 3, a + 1.6, '#ffb0d0', '#e674a6', null, 1.3);
        ctx.restore();
      }
    }
    stem(ctx, (q) => { q.moveTo(5, -29); q.quadraticCurveTo(hand[0] - 1, hand[1] + 2, hand[0], hand[1]); }, '#b4e48a', 1.6);
    re(ctx, hand[0] + 0.5, hand[1], 2.2, 2, '#b4e48a', '#86c45e', null, { lw: 1.5, hl: false, cel: [0.4, 0.4] });

    // 花朵頭
    const hx = 6;
    const hy = -45;
    const spin = m.dead ? 0 : Math.sin(t * 1.6) * 0.08 + wind * 0.4;
    // 花蕊觸角
    [[hx - 2, hx - 7, -0.4], [hx + 3, hx + 9, 0.3]].forEach(([x0, x1], i) => {
      const bend = m.dead ? 3 : Math.sin(t * 3 + i * 2) * 1.2;
      stem(ctx, (q) => { q.moveTo(x0, hy - 8); q.quadraticCurveTo(x0 + (x1 - x0) * 0.3, hy - 16, x1, hy - 19 + bend); }, '#7cc05a', 1.2);
      re(ctx, x1, hy - 19 + bend, 2.3, 2.3, '#ffe066', '#f0b83a', null, { lw: 1.3, hl: false, cel: [0.4, 0.4] });
    });
    for (let i = 0; i < 9; i++) {
      const a = spin + (i / 9) * TAU;
      const pc = i % 2 ? ['#ffd23f', '#eea224', '#fff2b0'] : ['#ffc53a', '#e8961e', '#ffeaa0'];
      re(ctx, hx + Math.cos(a) * 10.5, hy + Math.sin(a) * 10, 5.6, 3.8, pc[0], pc[1], pc[2], { rot: a, lw: 1.8, hl: false, cel: [0.8, 0.9], rim: 0.8 });
    }
    re(ctx, hx, hy, 9, 8.6, '#fff1c8', '#f2d69a', '#ffffff', {
      lw: 2.4,
      cel: [1.6, 1.6],
      rim: 1.2,
      hl: [hx - 3.5, hy - 4, 2.4, 1.3],
      tex: (c) => speckle(c, hx, hy + 5, 12, 3, 5, 0.5, '#e8b860', 733, 0.5),
    });
    eyes(ctx, hx - 1.5, hy - 0.5, 6.5, 2.6, 3.3, m, '#c04a8a');
    if (hurt || shot > 0 || m.dead) mouth(ctx, hx + 2.5, hy + 4.5, !m.dead, 0.7);
    else line(ctx, (q) => { q.moveTo(hx + 0.5, hy + 4); q.quadraticCurveTo(hx + 2.5, hy + 5.8, hx + 4.5, hy + 4); }, null, 1.5);
    A.blush(ctx, hx - 4.5, hy + 3.4, 2.2);
    A.blush(ctx, hx + 7, hy + 3, 1.8);
    ctx.restore();
  }

  // ───────────── 第一章材料圖示（覆寫 items.js 裡舊的蝸牛／菇／草精材料）─────────────
  const ICON1B = {
    // 橡實鼠絨毛：一撮軟綿綿的灰棕色絨毛，綁著一小段草繩
    moss(ctx) {
      // 幾團重疊的小圓拼成一朵雲：先畫粗描邊、再填色，外緣就是乾淨的蓬蓬輪廓
      const P = [[-7, 2, 7], [6, 2, 7.5], [0, -4, 8], [-9, -5, 5], [9, -5, 5.2], [0, 7, 6.5], [-3, -11, 4], [4, -11, 3.6]];
      const all = (c, dx, dy) => P.forEach(([x, y, r]) => { c.moveTo(x + dx + r, y + dy); c.arc(x + dx, y + dy, r, 0, TAU); });
      ctx.save();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4.8;
      ctx.beginPath();
      all(ctx, 0, 0);
      ctx.stroke();
      ctx.fillStyle = A.c('#9a8990');
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = A.c('#c8babd');
      ctx.beginPath();
      all(ctx, -1.8, -2);
      ctx.fill();
      glow(ctx, -4, -6, 11, '#fff8f4', 0.85);
      [[-8, 7, -11, -1], [-3, 10, -4, -5], [3, 10, 4, -6], [8, 7, 11, -1], [0, -4, -2, -13]].forEach(([a1, b1, d, e]) => line(ctx, (q) => { q.moveTo(a1, b1); q.quadraticCurveTo((a1 + d) / 2 - 2, (b1 + e) / 2, d, e); }, '#a8979e', 1, 0.75));
      [[-6, 0, -8, -6], [3, -1, 5, -8]].forEach(([a1, b1, d, e]) => line(ctx, (q) => { q.moveTo(a1, b1); q.quadraticCurveTo((a1 + d) / 2 + 1, (b1 + e) / 2, d, e); }, '#ffffff', 1.1, 0.8));
      ctx.restore();
      rs(ctx, (c) => A.roundRect(c, -6, 7, 12, 4, 1.5), '#b8905a', '#8a6a3a', '#e8c890', { cel: [0.6, 0.8], lw: 1.8, rim: 0.8 });
    },
    // 野豬鬃：一束深棕色的硬鬃，底部用葉子綁起來
    cap(ctx) {
      for (let i = -3; i <= 3; i++) {
        const a = i * 0.16;
        const x1 = Math.sin(a) * 22;
        const y1 = 9 - Math.cos(a) * 22;
        stem(ctx, (q) => { q.moveTo(i * 1.2, 9); q.quadraticCurveTo(i * 1.8, 0, x1, y1); }, i % 2 ? '#7a4a2a' : '#5a3420', 2.2);
        line(ctx, (q) => { q.moveTo(x1 * 0.5 - 0.6, y1 * 0.5 + 3); q.lineTo(x1 * 0.8 - 0.4, y1 * 0.8 + 1.5); }, '#b8845a', 0.8, 0.9);
      }
      rs(ctx, (c) => A.roundRect(c, -6.5, 4, 13, 8, 3), '#86cf58', '#58a13c', '#d0f4a4', {
        cel: [1, 1.4],
        lw: 2.2,
        rim: 1,
        tex: (c) => line(c, (q) => { q.moveTo(-6, 8); q.lineTo(6, 7.4); }, '#58a13c', 1, 0.9),
      });
      pointLeaf(ctx, 5, 8, 8, 3.2, 0.5, '#86cf58', '#58a13c', null, 1.6);
    },
    // 樹皮甲片：一塊弧形的樹皮殼片，邊上長青苔、角上冒出小芽
    bark(ctx) {
      const plate = (c) => {
        c.moveTo(-13, 9);
        c.lineTo(-14, -3);
        c.quadraticCurveTo(-12, -11, -4, -13);
        c.lineTo(6, -13);
        c.quadraticCurveTo(13, -11, 14, -3);
        c.lineTo(13, 9);
        c.quadraticCurveTo(0, 13, -13, 9);
        c.closePath();
      };
      rs(ctx, plate, '#8e5f3a', '#6a4326', '#c0905e', {
        cel: [2.5, 2.5],
        lw: 2.6,
        rim: 1.4,
        tex: (c) => {
          [-8, -2, 4, 9].forEach((x, i) => {
            line(c, (q) => { q.moveTo(x, -12); q.bezierCurveTo(x + 2, -5, x - 2, 2, x + (i - 1.5) * 0.6, 11); }, '#5a381e', 1.6, 0.85);
            line(c, (q) => { q.moveTo(x - 1.6, -11); q.bezierCurveTo(x, -5, x - 3.6, 2, x - 1.6, 10); }, '#b98a5a', 0.8, 0.7);
          });
          c.fillStyle = A.c('#6fa844');
          c.beginPath();
          c.moveTo(-15, 12);
          for (let i = 0; i <= 6; i++) c.quadraticCurveTo(-15 + i * 5 - 2.5, 3 - (i % 2) * 2.5, -15 + i * 5, 6 - (i % 3));
          c.lineTo(15, 12);
          c.closePath();
          c.fill();
          speckle(c, 0, 7, 26, 3, 7, 0.8, '#a8d86e', 811, 0.95);
        },
      });
      stem(ctx, (q) => { q.moveTo(8, -12); q.quadraticCurveTo(9, -14, 10, -15); }, '#6cae4a', 1.2);
      pointLeaf(ctx, 10, -15, 6.5, 2.8, -0.3, '#8fd46a', '#5fa543', null, 1.5);
      pointLeaf(ctx, 10, -15, 5.5, 2.4, -2.5, '#8fd46a', '#5fa543', null, 1.5);
    },
    // 螢光囊：一顆一節一節、會發光的小燈籠囊
    wick(ctx) {
      glow(ctx, 0, 1, 17, '#fff27a', 0.7);
      rs(ctx, (c) => c.ellipse(0, 2, 10, 11, 0, 0, TAU), '#fff4a0', '#f5c64e', '#ffffff', {
        cel: [2, 2.4],
        lw: 2.4,
        rim: 1.2,
        tex: (c) => {
          glow(c, -1, 0, 10, '#ffffff', 0.8);
          [-5, 0, 5].forEach((d) => line(c, (q) => q.ellipse(0, 2, Math.abs(d) * 1.6 + 0.5, 11, 0, 0, TAU), '#e6a83a', 1, d === 0 ? 0 : 0.55));
          [-4, 2, 8].forEach((y) => line(c, (q) => { q.moveTo(-10, y); q.quadraticCurveTo(0, y + 2, 10, y); }, '#e6a83a', 0.9, 0.4));
        },
      });
      rs(ctx, (c) => A.roundRect(c, -4.5, -12, 9, 5, 2), '#d8a040', '#b07a2a', '#ffe0a0', { cel: [0.6, 0.6], lw: 2, rim: 0.8 });
      line(ctx, (q) => { q.moveTo(0, 13); q.lineTo(0, 16); }, '#c83a2a', 1.4);
      ctx.fillStyle = A.c('#ffffff');
      [[-8, -9, 1.2], [9, -5, 1], [8, 12, 0.9]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      });
    },
    // 藤尾：捲成一圈的藤蔓尾巴，尾端一片葉子
    vine(ctx) {
      const P = [[-12, 10], [-16, -6], [4, -16], [10, -6]];
      const pts = taper(ctx, P, 5.5, 2.2, '#5fb046', '#b4ea88', 14);
      const e = pts[14];
      line(ctx, (q) => { q.moveTo(e[0], e[1]); q.quadraticCurveTo(e[0] + 3, e[1] + 6, e[0] - 2, e[1] + 7); q.arc(e[0] - 3.6, e[1] + 5.4, 2, 0.8, 4.5); }, null, 3.6);
      line(ctx, (q) => { q.moveTo(e[0], e[1]); q.quadraticCurveTo(e[0] + 3, e[1] + 6, e[0] - 2, e[1] + 7); q.arc(e[0] - 3.6, e[1] + 5.4, 2, 0.8, 4.5); }, '#5fb046', 1.4);
      [[4, 1], [8, -1], [11, 1]].forEach(([i, side]) => {
        const a = pts[i];
        const b = pts[i + 1];
        pointLeaf(ctx, a[0], a[1], 7, 3, Math.atan2(b[1] - a[1], b[0] - a[0]) + side, '#8fd46a', '#5fa543', null, 1.5);
      });
      pointLeaf(ctx, -12, 10, 11, 4.6, 2.5, '#9ad86a', '#62a845', '#d8f8b0', 1.8);
    },
    // 蝶翅花瓣：一片粉紅花瓣形狀的蝶翅，中間一顆黃色眼紋
    petal(ctx) {
      ctx.save();
      ctx.translate(-9, 11);
      ctx.rotate(-0.95);
      petalWing(ctx, 28, 12, '#ff9ec8', '#e674a6', '#ffd8ea', true, 901);
      ctx.restore();
      ctx.save();
      ctx.translate(-9, 11);
      ctx.rotate(-0.15);
      petalWing(ctx, 17, 7, '#c9a8ff', '#9c7ce0', '#ece0ff', false, 907);
      ctx.restore();
    },
  };
  // items.js 比這個檔案晚載入（它會設定 A.ICON）：先攔下來，等它設定時再把新圖示併進去
  if (A.ICON) Object.assign(A.ICON, ICON1B);
  else {
    let icons;
    Object.defineProperty(A, 'ICON', {
      configurable: true,
      enumerable: true,
      get() {
        return icons;
      },
      set(v) {
        icons = v;
        if (v) Object.assign(v, ICON1B);
      },
    });
  }

  Object.assign(A.MONSTER_DRAW, { acornmouse, barkturtle, boarlet, lanternfly, vinelizard, petalfly });
})();
