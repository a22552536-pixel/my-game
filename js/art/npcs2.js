// 第二、三章的 NPC 與新圖示（註冊到 A.NPC_DRAW／A.ICON）。
// 風格跟 npcs.js、items.js 一樣：平塗、深棕描邊、右下月牙陰影、Q 版眼睛，每隻 NPC 一個招牌配件。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;

  // ════════ 小工具 ════════
  // 有描邊的粗線（釣竿、拐杖、湯杓柄）
  function stick(ctx, pts, col, w) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + 2.6;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  // 有描邊的曲線（手臂、觸手、角）
  function curve(ctx, p0, p1, p2, col, w) {
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + 2.6;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  function line(ctx, pts, col, w) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = w || 2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  function dot(ctx, x, y, r, col) {
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function glow(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function starPath(c, x, y, r1, r2, n, rot) {
    for (let i = 0; i <= n * 2; i++) {
      const a = rot + (i / (n * 2)) * TAU;
      const r = i % 2 ? r2 : r1;
      i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }
  function blinkAt(t, sp, off) {
    return Math.sin(t * sp + (off || 0)) > 0.97;
  }
  function smile(ctx, x, y, w) {
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y - w * 0.6, w, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
  }
  function whiskers(ctx, x, y, dir, col, len) {
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    [-2.5, 0, 2.5].forEach((dy, i) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy);
      ctx.lineTo(x + dir * (len || 8), y + dy * 1.8 + (i - 1) * 0.5);
      ctx.stroke();
    });
  }
  // 往上飄的熱氣
  function steam(ctx, x, y, t, n, sp, h) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const ph = (t * sp + k / n) % 1;
      ctx.globalAlpha = 0.6 * Math.sin(ph * Math.PI);
      const sx = x + k * 6;
      const sy = y - ph * h;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 5);
      ctx.quadraticCurveTo(sx - 3, sy + 2, sx, sy);
      ctx.quadraticCurveTo(sx + 3, sy - 2, sx, sy - 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ════════ 精緻版小工具（對齊 Boss 美術：分層陰影、邊緣受光、反光、材質、細節配件）════════
  // 立體形狀：陰影底色 → 往左上偏移蓋回本色 → 材質 → 上亮下暗的漸層 → 左上邊緣受光 → 右下反光 → 高光 → 描邊
  // o: cel(陰影偏移), lit(受光色), litW, bounce(反光色), tex(fn, 在形狀裡畫材質), ao([y0,y1] 下方變暗),
  //    gloss([x,y,rx,ry]) 亮面, lw, noStroke
  function rs(ctx, path, fill, shade, o) {
    o = o || {};
    const cx = Array.isArray(o.cel) ? o.cel[0] : o.cel != null ? o.cel : 3;
    const cy = Array.isArray(o.cel) ? o.cel[1] : o.cel != null ? o.cel : 3;
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(shade || fill);
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (shade) {
      ctx.translate(-cx, -cy);
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(fill);
      ctx.fill();
      ctx.translate(cx, cy);
    }
    if (o.tex) o.tex(ctx);
    if (o.ao) {
      const g = ctx.createLinearGradient(0, o.ao[0], 0, o.ao[1]);
      g.addColorStop(0, 'rgba(40,20,40,0)');
      g.addColorStop(1, 'rgba(40,20,40,' + (o.aoA || 0.22) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(-400, o.ao[0], 800, o.ao[1] - o.ao[0]);
    }
    const band = (col, dx, dy, a) => {
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.beginPath();
      ctx.rect(-600, -600, 1200, 1200);
      ctx.translate(dx, dy);
      path(ctx);
      ctx.translate(-dx, -dy);
      ctx.clip('evenodd');
      ctx.fillStyle = A.c(col);
      ctx.fillRect(-600, -600, 1200, 1200);
      ctx.restore();
    };
    if (o.bounce) band(o.bounce, -(o.bw || 1.6), -(o.bw || 1.6), o.ba || 0.55);
    if (o.lit) band(o.lit, o.litW || 1.8, o.litW || 1.8, o.litA || 0.9);
    ctx.restore();
    if (o.gloss) {
      ctx.save();
      ctx.globalAlpha *= o.glossA || 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(o.gloss[0], o.gloss[1], o.gloss[2], o.gloss[3], o.gloss[4] != null ? o.gloss[4] : -0.5, 0, TAU);
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
  function re(ctx, x, y, rx, ry, fill, shade, o) {
    o = o || {};
    const rot = o.rot || 0;
    if (o.gloss === undefined) o.gloss = [x - rx * 0.38, y - ry * 0.48, rx * 0.26, ry * 0.15];
    rs(ctx, (c) => c.ellipse(x, y, rx, ry, rot, 0, TAU), fill, shade, o);
  }
  // 固定亂數
  function hsh(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  // 毛流：一堆短短的弧線（在 rs 的 tex 裡呼叫，會被形狀裁切）
  function furTex(ctx, x, y, w, h, col, n, len, ang, seed, a) {
    ctx.save();
    ctx.globalAlpha *= a || 0.4;
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + (hsh(i + seed) - 0.5) * w;
      const py = y + (hsh(i * 3.7 + seed + 9) - 0.5) * h;
      const aa = (ang || 1.9) + (hsh(i * 1.3 + seed) - 0.5) * 0.6;
      const l = (len || 3) * (0.6 + hsh(i + seed * 2) * 0.6);
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + Math.cos(aa) * l * 0.5 + 0.6, py + Math.sin(aa) * l * 0.5, px + Math.cos(aa) * l, py + Math.sin(aa) * l);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 小斑點材質（顆粒、疙瘩、纖維）
  function speckle(ctx, x, y, w, h, col, n, r, seed, a) {
    ctx.save();
    ctx.globalAlpha *= a || 0.45;
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + (hsh(i + seed) - 0.5) * w;
      const py = y + (hsh(i * 2.3 + seed + 5) - 0.5) * h;
      const rr = r * (0.5 + hsh(i * 4.1 + seed) * 0.7);
      ctx.moveTo(px + rr, py);
      ctx.arc(px, py, rr, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }
  // 布料縫線（虛線）
  function stitch(ctx, pts, col, w) {
    ctx.save();
    ctx.setLineDash([1.6, 1.8]);
    line(ctx, pts, col, w || 0.9);
    ctx.restore();
  }
  // 亮晶晶（金屬、玻璃的反光）
  function glint(ctx, x, y, r, a) {
    ctx.save();
    ctx.globalAlpha *= a == null ? 0.95 : a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    starPath(ctx, x, y, r, r * 0.25, 4, 0);
    ctx.fill();
    ctx.restore();
  }
  // 精緻的 Q 版眼睛：深色外框、上深下亮的彩色虹膜、瞳孔、上眼瞼陰影、兩顆高光、下緣的小反光
  function eyeHQ(ctx, x, y, rx, ry, iris, o) {
    o = o || {};
    if (o.closed) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = Math.max(1.8, rx * 0.8);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y - ry * 0.2, rx * 1.05, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      return;
    }
    const lk = o.look || 0;
    ctx.fillStyle = A.c('#2b1a12');
    ctx.beginPath();
    ctx.ellipse(x + lk * 0.4, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x + lk * 0.4, y, rx * 0.86, ry * 0.88, 0, 0, TAU);
    ctx.clip();
    const ix = x + lk * 0.6;
    const g = ctx.createLinearGradient(0, y - ry * 0.2, 0, y + ry);
    g.addColorStop(0, A.c(o.irisD || '#2b1a12'));
    g.addColorStop(0.5, A.c(iris));
    g.addColorStop(1, A.c(o.irisL || '#ffffff'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(ix, y + ry * 0.3, rx * 0.7, ry * 0.62, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#1a0e0a');
    ctx.beginPath();
    ctx.ellipse(ix + lk * 0.2, y + ry * 0.12, rx * 0.34, ry * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + lk * 0.4 - rx * 0.3, y - ry * 0.38, rx * 0.4, ry * 0.3, -0.3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha *= 0.85;
    ctx.beginPath();
    ctx.arc(x + lk * 0.4 + rx * 0.36, y + ry * 0.38, rx * 0.17, 0, TAU);
    ctx.fill();
    ctx.globalAlpha /= 0.85;
    if (o.lash !== false) {
      // 上眼線（稍微粗一點，讓眼神更有精神）
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = Math.max(1.1, rx * 0.45);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(x + lk * 0.4, y, rx * 1.02, ry * 1.02, 0, 1.12 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();
    }
  }
  // 閃亮的鼻頭
  function nose(ctx, x, y, rx, ry, col) {
    ctx.fillStyle = A.c(col || '#3a2418');
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha *= 0.7;
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.3, y - ry * 0.4, rx * 0.35, ry * 0.25, -0.3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha /= 0.7;
  }
  // 比 A.blush 更柔的腮紅（漸層＋三道小斜線）
  function blush2(ctx, x, y, r, lines) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.3);
    g.addColorStop(0, 'rgba(255,110,120,0.55)');
    g.addColorStop(1, 'rgba(255,110,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r * 0.8, 0, 0, TAU);
    ctx.fill();
    if (lines) {
      ctx.strokeStyle = A.c('#ff8a90');
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(x + i * r * 0.5 - r * 0.15, y + r * 0.25);
        ctx.lineTo(x + i * r * 0.5 + r * 0.15, y - r * 0.25);
      }
      ctx.stroke();
    }
  }
  // 有木紋／金屬亮線的棍子（釣竿、拐杖、湯杓柄）
  function stick2(ctx, pts, col, w, hi) {
    stick(ctx, pts, col, w);
    ctx.save();
    ctx.translate(-w * 0.22, -w * 0.22);
    ctx.globalAlpha *= 0.6;
    line(ctx, pts, hi || '#ffffff', Math.max(0.7, w * 0.3));
    ctx.restore();
  }
  // 有描邊、帶亮邊的粗曲線（手臂）
  function curve2(ctx, p0, p1, p2, col, w, hi) {
    curve(ctx, p0, p1, p2, col, w);
    ctx.save();
    ctx.translate(-w * 0.2, -w * 0.22);
    ctx.globalAlpha *= 0.55;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
    ctx.strokeStyle = A.c(hi || '#ffffff');
    ctx.lineWidth = Math.max(0.8, w * 0.28);
    ctx.stroke();
    ctx.restore();
  }
  // 一般嘴巴：ω 貓嘴
  function wmouth(ctx, x, y, s, col) {
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x - s, y, s, 0.1 * Math.PI, 0.95 * Math.PI);
    ctx.moveTo(x + 2 * s, y);
    ctx.arc(x + s, y, s, 0.05 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  // ════════ 第二章：燈塔岬 ════════

  // 海獺漁夫：草帽、釣竿，話很多（嘴巴一直動）
  function otter(ctx, t) {
    const bob = Math.sin(t * 2.2) * 1;
    const talking = t % 4 < 2.2;
    const talk = talking ? Math.abs(Math.sin(t * 11)) : 0;
    const F = '#8e5c3a';
    const FS = '#643c22';
    const FL = '#c89468';
    const CR = '#f2dcb4';
    const CRS = '#d8b888';
    // 扁尾巴（毛流＋左上受光）
    rs(ctx, (c) => { c.moveTo(-8, -12); c.quadraticCurveTo(-26, -12, -32, -3); c.quadraticCurveTo(-30, 1, -22, 0); c.quadraticCurveTo(-14, -1, -6, -3); c.closePath(); }, '#7a4e32', '#57361f', {
      cel: 2, lw: 2.2, lit: FL, litW: 1.4,
      tex: (c) => furTex(c, -18, -6, 26, 10, '#3e2616', 12, 3, 3.3, 3, 0.45),
    });
    // 蹼腳（三根趾頭的線）
    [-6, 8].forEach((x) => {
      re(ctx, x, -2, 6.5, 3.2, '#6a4228', '#4e2e1a', { lw: 2, gloss: false, cel: [0, 1.4], lit: '#9a6a44', litW: 1 });
      line(ctx, [[x + 1.5, -3.2], [x + 2.5, -0.6]], '#3e2616', 0.9);
      line(ctx, [[x + 4, -3], [x + 5, -0.8]], '#3e2616', 0.9);
    });
    // 身體：毛皮材質、奶油色肚子、左上受光、右下海水反光
    rs(ctx, (c) => c.ellipse(0, -22 + bob, 15, 19, 0, 0, TAU), F, FS, {
      cel: 3, lit: FL, bounce: '#7ab8c0', ba: 0.35,
      tex: (c) => furTex(c, -4, -24 + bob, 28, 34, '#4a2c18', 22, 3.2, 1.9, 1, 0.4),
      ao: [-14, 0], gloss: [-7, -33 + bob, 3.5, 2.2],
    });
    rs(ctx, (c) => c.ellipse(3, -19 + bob, 9, 13, 0, 0, TAU), CR, CRS, {
      cel: [2, 2.5], noStroke: true,
      tex: (c) => furTex(c, 3, -19 + bob, 16, 24, '#c09a6a', 14, 2.4, 1.7, 7, 0.55),
    });
    // 腰間的小魚簍（背帶斜過肚子）
    line(ctx, [[-8, -36 + bob], [10, -10 + bob]], '#5a7a3a', 2.4);
    stitch(ctx, [[-8, -36 + bob], [10, -10 + bob]], '#9cc070', 0.8);
    rs(ctx, (c) => { c.moveTo(-15, -16 + bob); c.lineTo(-5, -16 + bob); c.lineTo(-6, -5 + bob); c.quadraticCurveTo(-10, -3 + bob, -14, -5 + bob); c.closePath(); }, '#d6a458', '#a8762e', {
      cel: 1.5, lw: 2, lit: '#f4d08a', litW: 1,
      tex: (c) => {
        c.strokeStyle = A.c('#8a5a22');
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = 0; i < 3; i++) { c.moveTo(-16, -13 + i * 3 + bob); c.lineTo(-4, -13 + i * 3 + bob); }
        for (let i = 0; i < 4; i++) { c.moveTo(-13.5 + i * 2.6, -16 + bob); c.lineTo(-13 + i * 2.4, -4 + bob); }
        c.stroke();
      },
    });
    A.shape(ctx, (c) => A.roundRect(c, -16, -18 + bob, 12, 3, 1.5), '#b8823a', null, { lw: 1.6, hl: false });
    // 魚簍裡探出的小魚尾巴
    A.shape(ctx, (c) => { c.moveTo(-11, -18 + bob); c.lineTo(-14, -23 + bob); c.lineTo(-10, -21.5 + bob); c.lineTo(-7, -24 + bob); c.lineTo(-8.5, -18 + bob); c.closePath(); }, '#8ec8e8', '#5a98c0', { shadeY: -20 + bob, lw: 1.4, hl: false });
    // 釣竿與釣線
    const tipX = 46;
    const tipY = -68 + bob + Math.sin(t * 1.6) * 1.5;
    const bobX = 53 + Math.sin(t * 1.3) * 2;
    const bobY = -22 + Math.sin(t * 2.6) * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX + 8, (tipY + bobY) / 2, bobX, bobY - 5);
    ctx.stroke();
    glint(ctx, tipX + 5, (tipY + bobY) / 2 - 4, 2, 0.5 + Math.sin(t * 3) * 0.4);
    stick2(ctx, [[8, -14 + bob], [tipX, tipY]], '#c8904a', 2.6, '#f4d49a');
    // 竹節與線環
    [[0.35], [0.6], [0.85]].forEach(([k]) => {
      const x = 8 + (tipX - 8) * k;
      const y = -14 + bob + (tipY + 14 - bob) * k;
      line(ctx, [[x - 1.6, y - 1.2], [x + 1.6, y + 1.2]], '#8a5a26', 1.2);
    });
    // 捲線器
    re(ctx, 17, -26 + bob, 4, 4, '#aab4c0', '#6e7886', { lw: 1.8, cel: 1, lit: '#ffffff', litW: 0.9, gloss: false });
    dot(ctx, 17, -26 + bob, 1.3, '#4a5260');
    line(ctx, [[17, -26 + bob], [20, -29 + bob]], '#4a5260', 1.2);
    dot(ctx, 20.3, -29.3 + bob, 1.1, '#d94f4f');
    // 浮標（上紅下白、會反光）
    A.shape(ctx, (c) => c.arc(bobX, bobY, 4.5, Math.PI, 0), '#e8433a', null, { lw: 1.8, hl: false });
    A.shape(ctx, (c) => c.arc(bobX, bobY, 4.5, 0, Math.PI), '#ffffff', '#c8d4dc', { lw: 1.8, hl: false, shadeY: bobY + 2.4 });
    line(ctx, [[bobX, bobY - 4.5], [bobX, bobY - 7]], null, 1.4);
    glint(ctx, bobX - 1.8, bobY - 2.2, 1.8, 0.85);
    // 握竿的手
    re(ctx, 13, -21 + bob, 5, 4.5, F, FS, { lw: 2, gloss: false, cel: 1.2, lit: FL, litW: 1 });
    line(ctx, [[12, -23.5 + bob], [15.5, -22 + bob]], '#4a2c18', 0.9);
    // 頭
    const hx = 5;
    const hy = -47 + bob;
    re(ctx, hx - 10, hy - 7, 4, 4, F, FS, { lw: 2, gloss: false, cel: 1, lit: FL, litW: 1 });
    dot(ctx, hx - 10, hy - 6.5, 1.8, '#5a3420');
    rs(ctx, (c) => c.ellipse(hx, hy, 14.5, 12.5, 0, 0, TAU), F, FS, {
      cel: [2, 2.5], lit: FL, bounce: '#7ab8c0', ba: 0.3,
      tex: (c) => furTex(c, hx - 4, hy - 2, 20, 18, '#4a2c18', 14, 2.6, 1.6, 21, 0.35),
      gloss: [hx - 6, hy - 7, 3.2, 1.8],
    });
    rs(ctx, (c) => c.ellipse(hx + 7, hy + 4, 8.5, 6, 0, 0, TAU), CR, CRS, { cel: [1.2, 1.6], lw: 2, lit: '#ffffff', litW: 1 });
    // 鼻吻上的鬍鬚點
    [[hx + 9, hy + 3], [hx + 11, hy + 4.5], [hx + 8, hy + 5.5]].forEach(([x, y]) => dot(ctx, x, y, 0.55, '#8a6a4a'));
    nose(ctx, hx + 13, hy + 1, 3, 2.2, '#2e1c12');
    whiskers(ctx, hx + 14, hy + 4, 1, '#f6ecd8', 7);
    if (talk > 0.1) {
      const mh = 0.8 + talk * 2.2;
      ctx.fillStyle = A.c('#6a1e22');
      ctx.beginPath();
      ctx.ellipse(hx + 9, hy + 8, 2.4, mh, 0, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = A.c('#f07a86');
      ctx.beginPath();
      ctx.ellipse(hx + 9, hy + 8 + mh * 0.7, 2, 1.3, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(hx + 9, hy + 8, 2.4, mh, 0, 0, TAU);
      ctx.stroke();
    } else smile(ctx, hx + 9, hy + 7, 2.6);
    const bl = blinkAt(t, 0.9);
    eyeHQ(ctx, hx + 2, hy - 3, 2.8, 3.4, '#7a4a26', { closed: bl, look: 1, irisL: '#e8b070' });
    eyeHQ(ctx, hx + 9, hy - 3.5, 2.6, 3.2, '#7a4a26', { closed: bl, look: 1, irisL: '#e8b070' });
    // 開心的小眉毛
    line(ctx, [[hx - 0.5, hy - 8.2], [hx + 3.5, hy - 9]], '#4a2c18', 1.3);
    line(ctx, [[hx + 7.5, hy - 9.3], [hx + 11, hy - 8.8]], '#4a2c18', 1.3);
    blush2(ctx, hx - 1, hy + 4, 3, true);
    // 草帽：編織紋路、帽緣受光、紅帽帶、別著一根羽毛擬餌
    rs(ctx, (c) => c.ellipse(hx - 1, hy - 9, 18, 4.5, -0.08, 0, TAU), '#f0d080', '#c8a44c', {
      cel: [0, 1.8], lw: 2.2, lit: '#fff4c4', litW: 1,
      tex: (c) => {
        c.strokeStyle = A.c('#c09a48');
        c.lineWidth = 0.7;
        c.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          c.moveTo(hx - 1 + Math.cos(a) * 9, hy - 9 + Math.sin(a) * 2.2);
          c.lineTo(hx - 1 + Math.cos(a) * 17.5, hy - 9 + Math.sin(a) * 4.3);
        }
        c.stroke();
      },
    });
    const crown = (c) => { c.moveTo(hx - 10, hy - 10); c.quadraticCurveTo(hx - 10, hy - 23, hx - 1, hy - 23); c.quadraticCurveTo(hx + 8, hy - 23, hx + 8, hy - 11); c.closePath(); };
    rs(ctx, crown, '#f0d080', '#d0ac58', {
      cel: [2, 1.5], lw: 2.2, lit: '#fff4c4', litW: 1.2,
      tex: (c) => {
        c.strokeStyle = A.c('#c8a048');
        c.lineWidth = 0.7;
        c.beginPath();
        for (let i = 0; i < 4; i++) { c.moveTo(hx - 12, hy - 20 + i * 2.6); c.quadraticCurveTo(hx - 1, hy - 21.5 + i * 2.6, hx + 10, hy - 20 + i * 2.6); }
        c.stroke();
      },
    });
    rs(ctx, (c) => A.roundRect(c, hx - 10, hy - 15, 18, 4, 1.5), '#d94f4f', '#a8323a', { cel: [0, 1], lw: 1.6, lit: '#ff9a8a', litW: 0.8 });
    // 羽毛擬餌
    ctx.save();
    ctx.translate(hx + 5, hy - 14);
    ctx.rotate(0.5 + Math.sin(t * 2) * 0.08);
    A.shape(ctx, (c) => { c.moveTo(0, 0); c.quadraticCurveTo(3, -5, 1, -11); c.quadraticCurveTo(-2, -5, 0, 0); c.closePath(); }, '#5ac0d8', '#3a90b0', { shadeY: -5, lw: 1.2, hl: false });
    line(ctx, [[0.2, -1], [0.8, -9]], '#e8f8ff', 0.6);
    dot(ctx, 0, 0.5, 1.3, '#ffcf3a');
    ctx.restore();
    // 說話的小泡泡
    if (talking) {
      const k = (t % 4) / 2.2;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, Math.sin(k * Math.PI) * 2);
      [[hx + 20, hy - 18, 2], [hx + 25, hy - 24, 2.8], [hx + 32, hy - 30, 3.6]].forEach(([x, y, r]) => {
        A.ellipse(ctx, x, y, r, r, '#ffffff', null, { lw: 1.4, hl: false });
        dot(ctx, x - r * 0.35, y - r * 0.35, r * 0.28, '#bfe6f4');
      });
      ctx.restore();
    }
  }

  // 海豹燈塔守：老海豹，紅藍毛線帽，手提油燈
  function seal(ctx, t) {
    const bob = Math.sin(t * 1.4) * 0.8;
    const B = '#8e9aa6';
    const BS = '#66727f';
    const BL = '#c8d4e0';
    // 後鰭
    rs(ctx, (c) => { c.moveTo(-18, -4); c.quadraticCurveTo(-30, -14, -36, -8); c.quadraticCurveTo(-30, -4, -32, 2); c.quadraticCurveTo(-24, 0, -16, 0); c.closePath(); }, '#76828f', '#56616e', {
      cel: 1.6, lw: 2.2, lit: BL, litW: 1,
      tex: (c) => { line(c, [[-30, -8], [-22, -4]], '#56616e', 0.9); line(c, [[-30, -1], [-22, -2]], '#56616e', 0.9); },
    });
    // 身體：斑點、受光、下方反光
    const body = (c) => { c.moveTo(-24, 0); c.bezierCurveTo(-30, -26, -12, -46 + bob, 4, -46 + bob); c.bezierCurveTo(22, -46 + bob, 24, -20, 18, 0); c.closePath(); };
    rs(ctx, body, B, BS, {
      cel: [4, 3], lit: BL, litW: 2.2, bounce: '#9ec8d8', ba: 0.4, ao: [-12, 0],
      tex: (c) => {
        [[-8, -30, 2.4], [-14, -18, 2.2], [-4, -38, 1.8], [-18, -8, 1.8], [-10, -10, 1.3], [-17, -27, 1.3]].forEach(([x, y, r], i) => {
          c.fillStyle = A.c('#66727f');
          c.beginPath();
          c.ellipse(x, y + bob * 0.5, r, r * 0.72, 0.3 * i, 0, TAU);
          c.fill();
        });
        speckle(c, -4, -22, 40, 40, '#e4ecf4', 18, 0.7, 4, 0.4);
      },
      gloss: [-10, -36 + bob, 4, 2],
    });
    rs(ctx, (c) => c.ellipse(6, -16, 10, 14, 0, 0, TAU), '#d4dce4', '#b0bcc8', {
      cel: [2, 2.5], noStroke: true,
      tex: (c) => { for (let i = 0; i < 4; i++) line(c, [[-2, -22 + i * 5], [6, -20 + i * 5], [14, -22 + i * 5]], '#b8c4d0', 0.8); },
    });
    // 油燈（在身體前面晃）：黃銅燈罩、玻璃反光、火苗
    const sw = Math.sin(t * 1.8) * 0.12;
    const lx = 26;
    const ly = -30 + bob;
    const flick = 0.75 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.06;
    glow(ctx, lx + 2, ly + 16, 30, '255,210,110', 0.45 * flick);
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(sw);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 4, 4, Math.PI, 0);
    ctx.stroke();
    ctx.strokeStyle = A.c('#e0b050');
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 4, 4, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
    rs(ctx, (c) => { c.moveTo(-7, 9); c.lineTo(-4, 4); c.lineTo(4, 4); c.lineTo(7, 9); c.closePath(); }, '#c8963a', '#8a5e1e', { cel: [1.5, 0], lw: 2, lit: '#ffe29a', litW: 0.9 });
    rs(ctx, (c) => A.roundRect(c, -6, 9, 12, 13, 3), '#fff2b8', '#ffcf6a', {
      cel: [2, 0], lw: 2,
      tex: (c) => {
        const g = c.createRadialGradient(0, 16, 0, 0, 16, 8);
        g.addColorStop(0, A.c('#ffffff'));
        g.addColorStop(1, A.c('#ffd070'));
        c.globalAlpha *= 0.6;
        c.fillStyle = g;
        c.fillRect(-7, 8, 14, 15);
        c.globalAlpha /= 0.6;
      },
    });
    A.ellipse(ctx, 0, 16.5, 2.6, 3.8 * flick, '#ff9a3a', null, { noStroke: true, hl: false });
    A.ellipse(ctx, 0, 17.2, 1.2, 2 * flick, '#fff6c0', null, { noStroke: true, hl: false });
    ctx.strokeStyle = A.c('#6a4818');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, 9);
    ctx.lineTo(-3, 22);
    ctx.moveTo(3, 9);
    ctx.lineTo(3, 22);
    ctx.stroke();
    line(ctx, [[-4.4, 10.5], [-4.4, 14]], '#ffffff', 1.2);
    rs(ctx, (c) => A.roundRect(c, -7, 21, 14, 4, 2), '#c8963a', '#8a5e1e', { cel: [0, 1.4], lw: 2, lit: '#ffe29a', litW: 0.8 });
    glint(ctx, -4, 5.5, 2, 0.6 + Math.sin(t * 2.3) * 0.3);
    ctx.restore();
    // 前鰭提著燈
    rs(ctx, (c) => { c.moveTo(12, -30 + bob); c.quadraticCurveTo(22, -36 + bob, 28, -32 + bob); c.quadraticCurveTo(26, -26 + bob, 14, -22 + bob); c.closePath(); }, B, BS, { cel: [1.2, 1.6], lw: 2.2, lit: BL, litW: 1, bounce: '#ffd88a', ba: 0.5 });
    line(ctx, [[20, -31 + bob], [23, -29 + bob]], '#56616e', 0.9);
    const hx = 7;
    const hy = -50 + bob;
    // 頭
    rs(ctx, (c) => c.ellipse(hx, hy, 15, 13, 0, 0, TAU), B, BS, {
      cel: [2.5, 2.5], lit: BL, litW: 1.8, bounce: '#9ec8d8', ba: 0.35,
      tex: (c) => speckle(c, hx - 4, hy + 2, 18, 12, '#66727f', 6, 1, 11, 0.6),
    });
    // 毛線圍巾（藍色、有流蘇）
    rs(ctx, (c) => { c.moveTo(hx - 15, hy + 7); c.quadraticCurveTo(hx - 2, hy + 15, hx + 9, hy + 10); c.lineTo(hx + 9, hy + 16); c.quadraticCurveTo(hx - 2, hy + 21, hx - 15, hy + 13); c.closePath(); }, '#3d6fb3', '#2a4f88', {
      cel: [0, 2], lw: 2, lit: '#8ab4e8', litW: 1,
      tex: (c) => { for (let i = 0; i < 7; i++) { const y = hy + 10 + Math.sin(i / 6 * Math.PI) * 3; line(c, [[hx - 14 + i * 3.6, y], [hx - 12.5 + i * 3.6, y + 2.5], [hx - 11 + i * 3.6, y]], '#2a4f88', 0.7); } },
    });
    const tail = Math.sin(t * 1.4 + 1) * 0.1;
    ctx.save();
    ctx.translate(hx - 9, hy + 14);
    ctx.rotate(0.15 + tail);
    rs(ctx, (c) => A.roundRect(c, -3.5, 0, 7, 11, 1.5), '#3d6fb3', '#2a4f88', { cel: [1.5, 0], lw: 1.8 });
    line(ctx, [[-3.5, 4], [3.5, 4]], '#f4ecd8', 1.4);
    [-2.2, 0, 2.2].forEach((x) => line(ctx, [[x, 11], [x, 14]], '#2a4f88', 1.2));
    ctx.restore();
    re(ctx, hx + 9, hy + 5, 5.5, 4.5, '#e6ebf0', '#c4ccd6', { lw: 1.8, cel: [0.8, 1.2], gloss: false });
    re(ctx, hx + 15, hy + 5, 5, 4.2, '#e6ebf0', '#c4ccd6', { lw: 1.8, cel: [0.8, 1.2], gloss: false });
    [[hx + 8, hy + 4.5], [hx + 10.5, hy + 6], [hx + 16, hy + 4.5], [hx + 17.5, hy + 6.5]].forEach(([x, y]) => dot(ctx, x, y, 0.55, '#8a96a4'));
    nose(ctx, hx + 13, hy + 1, 3, 2.2, '#2b2a30');
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 1.3;
    [[0, 0], [2, 3], [1, 6]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(hx + 17 + dx, hy + 4 + dy * 0.4);
      ctx.quadraticCurveTo(hx + 24 + dx, hy + 2 + dy, hx + 28 + dx, hy + 6 + dy * 1.2);
      ctx.stroke();
    });
    smile(ctx, hx + 12, hy + 9, 2);
    const bl = blinkAt(t, 0.7);
    eyeHQ(ctx, hx + 2, hy - 2, 2.6, 2.8, '#3a4a66', { closed: bl, look: 1, irisL: '#9ab4d8' });
    eyeHQ(ctx, hx + 10, hy - 2.5, 2.4, 2.6, '#3a4a66', { closed: bl, look: 1, irisL: '#9ab4d8' });
    // 蓬鬆的白眉（兩層）
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(hx - 2, hy - 6);
    ctx.quadraticCurveTo(hx + 2, hy - 9, hx + 5, hy - 6);
    ctx.moveTo(hx + 7, hy - 7);
    ctx.quadraticCurveTo(hx + 10, hy - 10, hx + 14, hy - 7);
    ctx.stroke();
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 2.6;
    ctx.stroke();
    blush2(ctx, hx - 2, hy + 4, 3);
    // 毛線帽：螺紋針織、白條紋、毛球
    const cap = (c) => { c.moveTo(hx - 14, hy - 5); c.quadraticCurveTo(hx - 14, hy - 26, hx + 1, hy - 26); c.quadraticCurveTo(hx + 15, hy - 26, hx + 14, hy - 8); c.closePath(); };
    rs(ctx, cap, '#d94f4f', '#a8343a', {
      cel: 2, lw: 2.2, lit: '#ff9a8a', litW: 1.3,
      tex: (c) => {
        c.fillStyle = A.c('#f4ecd8');
        c.fillRect(hx - 20, hy - 19, 40, 3.5);
        c.strokeStyle = A.c('#9a2c32');
        c.lineWidth = 0.7;
        c.beginPath();
        for (let i = 0; i < 9; i++) {
          const x = hx - 12 + i * 3.2;
          for (let k = 0; k < 5; k++) {
            const y = hy - 24 + k * 3.6;
            c.moveTo(x - 1, y);
            c.lineTo(x, y + 1.6);
            c.lineTo(x + 1, y);
          }
        }
        c.stroke();
      },
    });
    rs(ctx, (c) => A.roundRect(c, hx - 16, hy - 10, 31, 6, 3), '#3d6fb3', '#2a4f88', { cel: [0, 1.6], lw: 2, lit: '#8ab4e8', litW: 1 });
    ctx.strokeStyle = A.c('#2a4f88');
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(hx - 12 + i * 5, hy - 9);
      ctx.lineTo(hx - 12 + i * 5, hy - 5);
      ctx.stroke();
    }
    // 毛球：一圈小毛球構成的蓬鬆輪廓
    rs(ctx, (c) => bumpPath(c, hx - 2, hy - 28, 4.8, 9, 0.9), '#f4ecd8', '#cfc2a4', {
      cel: 1.2, lw: 2, lit: '#ffffff', litW: 0.9,
      tex: (c) => furTex(c, hx - 2, hy - 28, 9, 9, '#bfb090', 8, 1.8, 1.2, 5, 0.6),
    });
  }
  // 毛茸茸的圓（一圈小凸起）
  function bumpPath(c, x, y, r, n, bulge) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU;
      const a1 = ((i + 1) / n) * TAU;
      const am = (a0 + a1) / 2;
      if (!i) c.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
      c.quadraticCurveTo(x + Math.cos(am) * (r + bulge * 2), y + Math.sin(am) * (r + bulge * 2), x + Math.cos(a1) * r, y + Math.sin(a1) * r);
    }
    c.closePath();
  }

  // 海鷗商人：白身灰翅，斜背一個鼓鼓的商人包
  function gullmerchant(ctx, t) {
    const bob = Math.sin(t * 2) * 1;
    const peck = t % 5 < 0.35 ? Math.sin(((t % 5) / 0.35) * Math.PI) : 0;
    const W = '#fbfbf6';
    const WS = '#cfd6e0';
    const GR = '#9aa4b0';
    const GRS = '#727c8a';
    // 腳：細細的鱗紋
    [-4, 6].forEach((x) => {
      line(ctx, [[x, -14], [x, -2]], null, 5.2);
      line(ctx, [[x, -14], [x, -2]], '#f28c38', 3);
      line(ctx, [[x - 0.6, -13], [x - 0.6, -3]], '#ffc27a', 0.9);
      for (let k = 0; k < 3; k++) line(ctx, [[x - 1.2, -11 + k * 3], [x + 1.2, -10.4 + k * 3]], '#c8621e', 0.7);
    });
    rs(ctx, (c) => { c.moveTo(-9, 0); c.lineTo(-4, -3); c.lineTo(1, 0); c.closePath(); }, '#f28c38', '#c8621e', { cel: [0, 1], lw: 1.8 });
    rs(ctx, (c) => { c.moveTo(1, 0); c.lineTo(6, -3); c.lineTo(11, 0); c.closePath(); }, '#f28c38', '#c8621e', { cel: [0, 1], lw: 1.8 });
    // 尾羽
    rs(ctx, (c) => { c.moveTo(-12, -26 + bob); c.lineTo(-30, -20 + bob); c.lineTo(-26, -16 + bob); c.lineTo(-10, -16 + bob); c.closePath(); }, GR, GRS, {
      cel: [0, 1.5], lw: 2.2, lit: '#d8e0ea', litW: 1,
      tex: (c) => { line(c, [[-14, -22 + bob], [-26, -19 + bob]], GRS, 0.8); line(c, [[-14, -19 + bob], [-25, -17 + bob]], GRS, 0.8); },
    });
    A.shape(ctx, (c) => { c.moveTo(-26, -21 + bob); c.lineTo(-30, -20 + bob); c.lineTo(-27, -17 + bob); c.closePath(); }, '#3a3a44', null, { noStroke: true, hl: false });
    // 身體
    rs(ctx, (c) => c.ellipse(0, -26 + bob, 17, 15, 0, 0, TAU), W, WS, {
      cel: 3, lit: '#ffffff', bounce: '#f0d4a0', ba: 0.45, ao: [-18, -11],
      tex: (c) => furTex(c, 4, -22 + bob, 22, 18, '#c4ccd8', 14, 2.4, 1.8, 31, 0.5),
    });
    // 翅膀：一層層的羽毛、黑色翼尖
    const wing = (c) => { c.moveTo(-10, -34 + bob); c.quadraticCurveTo(4, -38 + bob, 8, -28 + bob); c.quadraticCurveTo(4, -16 + bob, -20, -18 + bob); c.quadraticCurveTo(-18, -26 + bob, -10, -34 + bob); c.closePath(); };
    rs(ctx, wing, GR, GRS, {
      cel: [1.5, 1.5], lw: 2.2, lit: '#dfe6ee', litW: 1.3,
      tex: (c) => {
        c.strokeStyle = A.c(GRS);
        c.lineWidth = 0.9;
        c.beginPath();
        for (let r = 0; r < 2; r++) {
          for (let i = 0; i < 4; i++) {
            const x = -12 + i * 5 - r * 3;
            const y = -29 + r * 5 + bob + i * 0.5;
            c.moveTo(x - 2.5, y);
            c.quadraticCurveTo(x, y + 3, x + 2.5, y);
          }
        }
        c.stroke();
        c.fillStyle = A.c('#3a3a44');
        c.beginPath();
        c.moveTo(-22, -21 + bob);
        c.quadraticCurveTo(-14, -23 + bob, -8, -19 + bob);
        c.lineTo(-10, -15 + bob);
        c.lineTo(-22, -16 + bob);
        c.closePath();
        c.fill();
        dot(c, -15, -19.2 + bob, 0.9, '#ffffff');
        dot(c, -11, -18.6 + bob, 0.9, '#ffffff');
      },
    });
    // 背帶與商人包：皮革縫線、黃銅扣、捲起的地圖和金幣
    line(ctx, [[-6, -39 + bob], [10, -17 + bob]], null, 4.8);
    line(ctx, [[-6, -39 + bob], [10, -17 + bob]], '#6b4428', 3);
    stitch(ctx, [[-5.4, -38 + bob], [9.6, -17.6 + bob]], '#c8905a', 0.7);
    A.shape(ctx, (c) => A.roundRect(c, 5, -31 + bob, 5, 7, 2), '#fff0d0', null, { lw: 1.6, hl: false });
    // 包裡露出的地圖卷
    ctx.save();
    ctx.translate(16, -26 + bob);
    ctx.rotate(0.35);
    rs(ctx, (c) => A.roundRect(c, -2, -8, 4.5, 10, 2), '#f6e6c0', '#d8c090', { cel: [1.2, 0], lw: 1.4 });
    line(ctx, [[-1, -5], [1.5, -5]], '#d94f4f', 1.1);
    ctx.restore();
    rs(ctx, (c) => A.roundRect(c, 2, -24 + bob, 18, 15, 4), '#b5763c', '#86522a', {
      cel: 2, lw: 2.2, lit: '#e0a868', litW: 1.2, ao: [-16 + bob, -9 + bob],
      tex: (c) => { stitch(c, [[4, -12 + bob], [18, -12 + bob]], '#e8c08a', 0.7); speckle(c, 11, -16 + bob, 16, 12, '#8a5a2a', 10, 0.6, 7, 0.5); },
    });
    rs(ctx, (c) => { c.moveTo(2, -20 + bob); c.lineTo(2, -22 + bob); c.quadraticCurveTo(2, -26 + bob, 6, -26 + bob); c.lineTo(16, -26 + bob); c.quadraticCurveTo(20, -26 + bob, 20, -22 + bob); c.lineTo(20, -18 + bob); c.quadraticCurveTo(11, -14 + bob, 2, -20 + bob); c.closePath(); }, '#c8905a', '#9a6634', {
      cel: [0, 1.5], lw: 2, lit: '#f0c490', litW: 1,
      tex: (c) => stitch(c, [[4, -20.5 + bob], [11, -17 + bob], [18, -20 + bob]], '#f4d8a8', 0.7),
    });
    rs(ctx, (c) => c.ellipse(11, -18 + bob, 3, 3, 0, 0, TAU), '#ffcf3a', '#c89018', { cel: 0.8, lw: 1.6, lit: '#fff6c0', litW: 0.7 });
    dot(ctx, 11, -18 + bob, 0.9, '#8a5a10');
    glint(ctx, 9.8, -19.4 + bob, 1.8, 0.5 + Math.sin(t * 2.7) * 0.45);
    // 頭（偶爾點頭啄一下）
    ctx.save();
    ctx.translate(7, -44 + bob);
    ctx.rotate(peck * 0.35);
    // 頭頂翹起的一小撮毛
    A.shape(ctx, (c) => { c.moveTo(-3, -8); c.quadraticCurveTo(-4, -14, 1, -15); c.quadraticCurveTo(-1, -12, 1, -9); c.quadraticCurveTo(3, -13, 6, -12); c.quadraticCurveTo(3, -10, 3, -8); c.closePath(); }, W, WS, { shadeY: -10, lw: 1.6, hl: false });
    rs(ctx, (c) => c.ellipse(0, 0, 11, 10, 0, 0, TAU), W, WS, {
      cel: 2, lit: '#ffffff', bounce: '#f0d4a0', ba: 0.4, gloss: [-4, -5, 2.6, 1.6],
      tex: (c) => furTex(c, -3, 2, 12, 12, '#c4ccd8', 8, 2, 1.6, 41, 0.45),
    });
    rs(ctx, (c) => { c.moveTo(8, -3); c.lineTo(22, -1); c.quadraticCurveTo(24, 1, 21, 3); c.lineTo(8, 4); c.closePath(); }, '#ffc83a', '#e0961a', { cel: [0, 1.8], lw: 2, lit: '#fff0b0', litW: 0.9, gloss: [13, -1.5, 3, 0.7, 0] });
    line(ctx, [[9, 1], [20, 1.5]], '#c8781a', 0.8);
    dot(ctx, 18, 2.5, 1.6, '#e8433a');
    eyeHQ(ctx, 4, -2, 2.4, 3, '#d89a2a', { closed: blinkAt(t, 0.8, 1), look: 1, irisL: '#fff0a0' });
    line(ctx, [[0, -6.4], [7, -5.4]], null, 2);
    blush2(ctx, 2, 4, 2.4);
    ctx.restore();
  }

  // 小河豚：住在裝水的玻璃缸裡，底下長了兩隻小腳；偶爾會氣鼓鼓地脹起來
  function pufferkid(ctx, t) {
    const cyc = t % 4;
    const puff = cyc > 2.4 && cyc < 3.6 ? Math.sin(((cyc - 2.4) / 1.2) * Math.PI) : 0;
    const hop = -Math.abs(Math.sin(t * 3.2)) * 3 * (1 - puff);
    const cy = -27 + hop;
    const R = 18;
    // 小腳＋亮晶晶的藍色雨靴
    [-7, 7].forEach((x) => {
      rs(ctx, (c) => A.roundRect(c, x - 2.5, cy + 12, 5, -cy - 13, 2.5), '#ffd65a', '#e0a82a', { cel: [1.2, 0], lw: 2, lit: '#fff2b0', litW: 0.8 });
      rs(ctx, (c) => { c.moveTo(x - 3.5, -1); c.lineTo(x - 3.5, -5); c.quadraticCurveTo(x - 3.5, -6.5, x - 2, -6.5); c.lineTo(x + 2.5, -6.5); c.quadraticCurveTo(x + 3.5, -6.5, x + 3.5, -5); c.quadraticCurveTo(x + 8, -4.5, x + 8, -1.5); c.quadraticCurveTo(x + 8, 0.5, x + 6, 0.5); c.lineTo(x - 2.5, 0.5); c.quadraticCurveTo(x - 3.5, 0.5, x - 3.5, -1); c.closePath(); }, '#3d6fb3', '#2a4f88', { cel: [1, 1.2], lw: 2, lit: '#8ab4e8', litW: 0.9 });
      A.shape(ctx, (c) => A.roundRect(c, x - 4, -7.5, 8, 2.4, 1.2), '#ffcf3a', null, { lw: 1.2, hl: false });
      ctx.save();
      ctx.globalAlpha *= 0.8;
      dot(ctx, x - 1.5, -4.5, 0.8, '#ffffff');
      dot(ctx, x + 4.5, -2.8, 0.7, '#ffffff');
      ctx.restore();
    });
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, cy, R, 0, TAU);
    ctx.clip();
    // 空氣（淡淡的玻璃色）
    const ga = ctx.createLinearGradient(-R, cy - R, R, cy + R);
    ga.addColorStop(0, 'rgba(235,250,255,0.55)');
    ga.addColorStop(1, 'rgba(190,230,250,0.35)');
    ctx.fillStyle = ga;
    ctx.fillRect(-R, cy - R, R * 2, R * 2);
    // 水：上淺下深的漸層
    const wl = cy - 9 + Math.sin(t * 3) * 1;
    const gw = ctx.createLinearGradient(0, wl, 0, cy + R);
    gw.addColorStop(0, A.c('#8ad8f4'));
    gw.addColorStop(1, A.c('#3a9ed0'));
    ctx.globalAlpha *= 0.75;
    ctx.fillStyle = gw;
    ctx.beginPath();
    ctx.moveTo(-R, wl);
    for (let x = -R; x <= R; x += 3) ctx.lineTo(x, wl + Math.sin(x * 0.4 + t * 4) * 1.2);
    ctx.lineTo(R, cy + R);
    ctx.lineTo(-R, cy + R);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha /= 0.75;
    // 水面的白線
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -R; x <= R; x += 3) (x === -R ? ctx.moveTo(x, wl + Math.sin(x * 0.4 + t * 4) * 1.2) : ctx.lineTo(x, wl + Math.sin(x * 0.4 + t * 4) * 1.2));
    ctx.stroke();
    // 水底光紋
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const y = wl + 6 + i * 5;
      const ox = Math.sin(t * 2 + i * 1.7) * 3;
      ctx.moveTo(-12 + ox + i * 2, y);
      ctx.quadraticCurveTo(-6 + ox, y - 1.8, -1 + ox + i, y);
      ctx.moveTo(3 + ox - i, y + 2);
      ctx.quadraticCurveTo(8 + ox, y + 0.5, 12 + ox - i, y + 2);
    }
    ctx.stroke();
    // 沙底、小石頭、海草、小貝殼
    ctx.fillStyle = A.c('#f0d8a0');
    ctx.beginPath();
    ctx.ellipse(0, cy + R, R, 5, 0, Math.PI, 0);
    ctx.fill();
    speckle(ctx, 0, cy + R - 2, 30, 4, '#c8a468', 12, 0.6, 3, 0.7);
    [[-8, cy + R - 3.5, '#a8b4c0'], [9, cy + R - 3, '#e8a0a8']].forEach(([x, y, cc]) => A.ellipse(ctx, x, y, 2, 1.3, cc, null, { lw: 1, hl: false }));
    const sw = Math.sin(t * 2.2) * 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-12, cy + R - 3);
    ctx.quadraticCurveTo(-14 + sw, cy + 6, -11 + sw * 1.4, cy);
    ctx.stroke();
    ctx.strokeStyle = A.c('#5ab04a');
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // 河豚
    const fx = 1 + Math.sin(t * 1.5) * 2;
    const fy = cy + 2 + Math.sin(t * 2.4) * 1.2;
    const fr = 7 + puff * 4.5;
    rs(ctx, (c) => { c.moveTo(fx - fr + 1, fy); c.lineTo(fx - fr - 6, fy - 4); c.quadraticCurveTo(fx - fr - 4, fy, fx - fr - 5, fy + 4); c.closePath(); }, '#ffb84a', '#e08a2a', { cel: [0, 1], lw: 1.6 });
    if (puff > 0.05) A.shape(ctx, (c) => starPath(c, fx, fy, fr + 3 * puff, fr - 0.5, 12, t), '#ffe08a', '#e8b030', { lw: 1.6, hl: false, shadeY: fy + 2 });
    rs(ctx, (c) => c.ellipse(fx, fy, fr, fr * 0.92, 0, 0, TAU), '#ffd65a', '#e8a828', {
      cel: 1.5, lw: 2, lit: '#fff6c0', litW: 1, gloss: [fx - fr * 0.4, fy - fr * 0.5, fr * 0.28, fr * 0.16],
      tex: (c) => {
        [[-0.45, -0.1], [-0.15, -0.55], [0.1, 0.05], [-0.5, 0.4]].forEach(([dx, dy]) => dot(c, fx + dx * fr, fy + dy * fr, fr * 0.1, '#c8862a'));
        c.fillStyle = A.c('#fff4c8');
        c.beginPath();
        c.ellipse(fx + 1, fy + fr * 0.5, fr * 0.66, fr * 0.38, 0, 0, TAU);
        c.fill();
      },
    });
    A.ellipse(ctx, fx - 1, fy + 1, 3, 2, '#ffb84a', null, { lw: 1.4, hl: false, rot: 0.4 });
    line(ctx, [[fx - 2.4, fy + 0.4], [fx + 0.4, fy + 1.6]], '#e08a2a', 0.6);
    eyeHQ(ctx, fx + fr * 0.35, fy - fr * 0.25, 1.9, 2.4, '#2a6a8a', { closed: blinkAt(t, 1.1), look: 0.6, irisL: '#8ad8f4', lash: false });
    eyeHQ(ctx, fx + fr * 0.75, fy - fr * 0.28, 1.7, 2.2, '#2a6a8a', { look: 0.6, irisL: '#8ad8f4', lash: false });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (puff > 0.3) ctx.arc(fx + fr * 0.85, fy + fr * 0.2, 1.4, 0, TAU);
    else ctx.arc(fx + fr * 0.7, fy + 1, 1.8, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    blush2(ctx, fx + fr * 0.2, fy + fr * 0.3, 1.8);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.7 + i / 3) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - k)).toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(fx + 10 + Math.sin(k * 6 + i) * 2, fy - 3 - k * 14, 1.2 + k * 1.2, 0, TAU);
      ctx.stroke();
    }
    // 玻璃的厚度：邊緣一圈淡青色、右下暗一點
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(200,240,255,0.7)';
    ctx.beginPath();
    ctx.arc(0, cy, R - 1.5, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,110,150,0.3)';
    ctx.beginPath();
    ctx.arc(0, cy, R - 1.5, -0.1 * Math.PI, 0.6 * Math.PI);
    ctx.stroke();
    ctx.restore();
    // 玻璃缸：描邊、缸口、反光
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = A.LW;
    ctx.beginPath();
    ctx.arc(0, cy, R, -0.34 * Math.PI, 1.34 * Math.PI);
    ctx.stroke();
    rs(ctx, (c) => c.ellipse(0, cy - R + 2, 9, 3, 0, 0, TAU), '#e8f8ff', '#a8d4e8', { cel: [0, -1], lw: 2.2 });
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, cy, R - 4, 1.05 * Math.PI, 1.35 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, cy, R - 4, 1.45 * Math.PI, 1.5 * Math.PI);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(0, cy, R - 3.5, 0.15 * Math.PI, 0.3 * Math.PI);
    ctx.stroke();
    glint(ctx, -R * 0.62, cy - R * 0.5, 2.6, 0.55 + Math.sin(t * 1.9) * 0.4);
  }

  // 海星：粉紅色，戴著綁花的遮陽草帽
  function starfish(ctx, t) {
    const sway = Math.sin(t * 1.8) * 0.06;
    ctx.save();
    ctx.rotate(sway);
    const cx = 0;
    const cy = -23;
    const R = 25;
    const r = 11;
    const P = (a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
    const star = (c) => {
      const a0 = -Math.PI / 2;
      const p = P(a0 - 0.17, R * 0.86);
      c.moveTo(p[0], p[1]);
      for (let k = 0; k < 5; k++) {
        const a = a0 + (k / 5) * TAU;
        const tip = P(a, R * 1.12);
        const e = P(a + 0.17, R * 0.86);
        c.quadraticCurveTo(tip[0], tip[1], e[0], e[1]);
        const v = P(a + TAU / 10, r * 0.95);
        const n = P(a + TAU / 5 - 0.17, R * 0.86);
        c.quadraticCurveTo(v[0], v[1], n[0], n[1]);
      }
      c.closePath();
    };
    rs(ctx, star, '#ff8fa8', '#d85a7c', {
      cel: 3, lw: 2.8, lit: '#ffd0dc', litW: 2, bounce: '#ffc890', ba: 0.5,
      tex: (c) => {
        // 每隻手臂中間一條淡淡的稜線＋兩排小疙瘩（有自己的陰影和亮點）
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k / 5) * TAU;
          const p0 = P(a, r * 0.9);
          const p1 = P(a, R * 0.95);
          c.save();
          c.globalAlpha *= 0.35;
          line(c, [p0, p1], '#e86a8c', 3.2);
          c.restore();
          [0.48, 0.66, 0.84].forEach((f, j) => {
            [j % 2 ? 0.07 : -0.07].forEach((s) => {
              const p = P(a + s, R * f);
              const rr = 1.8 - j * 0.4;
              dot(c, p[0] + 0.4, p[1] + 0.5, rr, '#d85a7c');
              dot(c, p[0], p[1], rr, '#ffc0d0');
              dot(c, p[0] - rr * 0.3, p[1] - rr * 0.3, rr * 0.35, '#ffffff');
            });
          });
        }
      },
      gloss: [cx - 9, cy - 8, 3, 1.6],
    });
    const bl = blinkAt(t, 0.9, 2);
    eyeHQ(ctx, cx - 3, cy - 3, 2.6, 3.2, '#b0306a', { closed: bl, look: 1, irisL: '#ff9ac4' });
    eyeHQ(ctx, cx + 5, cy - 3, 2.6, 3.2, '#b0306a', { closed: bl, look: 1, irisL: '#ff9ac4' });
    // 長睫毛（女生）
    if (!bl) {
      line(ctx, [[cx - 5.6, cy - 5.2], [cx - 7, cy - 6.6]], null, 1.1);
      line(ctx, [[cx + 7.6, cy - 5.4], [cx + 9, cy - 6.8]], null, 1.1);
    }
    smile(ctx, cx + 1.5, cy + 4, 2.8);
    ctx.fillStyle = A.c('#e8506a');
    ctx.beginPath();
    ctx.arc(cx + 1.5, cy + 3.6, 1.6, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.fill();
    blush2(ctx, cx - 6, cy + 2, 2.6);
    blush2(ctx, cx + 9, cy + 2, 2.6);
    // 遮陽帽（戴在最上面那隻手臂上）：草編紋、藍緞帶、小白花
    const hy = cy - R + 3;
    rs(ctx, (c) => c.ellipse(1, hy, 17, 4.5, -0.12, 0, TAU), '#f6dc8e', '#ccaa58', {
      cel: [0, 1.8], lw: 2.2, lit: '#fff6cc', litW: 1,
      tex: (c) => {
        c.strokeStyle = A.c('#caa458');
        c.lineWidth = 0.7;
        c.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          c.moveTo(1 + Math.cos(a) * 8, hy + Math.sin(a) * 2.2);
          c.lineTo(1 + Math.cos(a) * 16.5, hy + Math.sin(a) * 4.2);
        }
        c.stroke();
      },
    });
    rs(ctx, (c) => { c.moveTo(-7, hy); c.quadraticCurveTo(-7, hy - 11, 1, hy - 11); c.quadraticCurveTo(9, hy - 11, 8, hy - 1); c.closePath(); }, '#f6dc8e', '#d4b464', {
      cel: [2, 1.5], lw: 2.2, lit: '#fff6cc', litW: 1.1,
      tex: (c) => { for (let i = 0; i < 3; i++) line(c, [[-8, hy - 8.5 + i * 2.6], [1, hy - 9.5 + i * 2.6], [9, hy - 8.5 + i * 2.6]], '#cfa858', 0.7); },
    });
    rs(ctx, (c) => { c.moveTo(-7, hy - 3); c.quadraticCurveTo(1, hy - 1, 8, hy - 4); c.lineTo(8, hy - 1); c.quadraticCurveTo(1, hy + 2, -7, hy); c.closePath(); }, '#5ac0d8', '#3a92b0', { cel: [0, 1], lw: 1.6, lit: '#b8f0ff', litW: 0.7 });
    // 緞帶尾巴飄呀飄
    const rt = Math.sin(t * 2.4) * 1.5;
    A.shape(ctx, (c) => { c.moveTo(-6, hy - 1); c.quadraticCurveTo(-11, hy + 2, -13 + rt * 0.5, hy + 6); c.lineTo(-10.5 + rt * 0.5, hy + 5); c.quadraticCurveTo(-9, hy + 2, -5.5, hy + 0.5); c.closePath(); }, '#5ac0d8', '#3a92b0', { shadeY: hy + 3, lw: 1.3, hl: false });
    for (let i = 0; i < 5; i++) A.ellipse(ctx, 7 + Math.cos(i * 1.256) * 2.6, hy - 4 + Math.sin(i * 1.256) * 2.6, 2, 2, '#ffffff', '#e4e8f0', { lw: 1.1, hl: false, shadeAt: 0 });
    dot(ctx, 7, hy - 4, 1.4, '#ffd23a');
    dot(ctx, 6.6, hy - 4.4, 0.5, '#ffffff');
    ctx.restore();
  }

  // 章魚畫家：紫色章魚，貝雷帽，一手畫筆一手調色盤
  function octopus(ctx, t) {
    const bob = Math.sin(t * 2) * 1.5;
    const col = '#b07ad8';
    const sh = '#7e4cae';
    const lit = '#e2c4ff';
    const bz = (p0, p1, p2, p3, s) => {
      const u = 1 - s;
      return [u * u * u * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s * s * s * p3[0], u * u * u * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s * s * s * p3[1]];
    };
    const tent = (x0, dir, ph, len, far) => {
      const w = Math.sin(t * 3 + ph) * 3;
      const p0 = [x0, -18 + bob];
      const p1 = [x0 + dir * 4 + w, -8];
      const p2 = [x0 + dir * 10, -2 + len];
      const p3 = [x0 + dir * 14 + w * 0.3, -6];
      ctx.lineCap = 'round';
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
      };
      path();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 9;
      ctx.stroke();
      path();
      ctx.strokeStyle = A.c(far ? sh : col);
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.save();
      ctx.translate(-0.8, -1.2);
      path();
      ctx.globalAlpha *= 0.55;
      ctx.strokeStyle = A.c(lit);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
      // 吸盤（沿著觸手下緣）
      for (let i = 4; i <= 8; i++) {
        const q = bz(p0, p1, p2, p3, i / 9);
        const rr = 1.3 - i * 0.08;
        dot(ctx, q[0] + dir * 0.4, q[1] + 1.6, rr + 0.35, '#6e3a98');
        dot(ctx, q[0] + dir * 0.4, q[1] + 1.4, rr, '#f0c4f0');
      }
    };
    tent(-12, -1, 0, 2, true);
    tent(13, 1, 0.7, 2, true);
    tent(-4, -1, 1.3, 3);
    tent(6, 1, 2.1, 3);
    // 調色盤（木紋、拇指洞、顏料會反光）
    curve2(ctx, [-14, -24 + bob], [-26, -26 + bob], [-26, -34 + bob], col, 5, lit);
    const pal = (c) => c.ellipse(-30, -38 + bob, 11, 7, -0.3, 0, TAU);
    rs(ctx, pal, '#e8c08a', '#b8884e', {
      cel: [1.2, 1.8], lw: 2, lit: '#fff0c8', litW: 1,
      tex: (c) => {
        c.strokeStyle = A.c('#c89a60');
        c.lineWidth = 0.7;
        c.beginPath();
        for (let i = 0; i < 3; i++) { c.moveTo(-40, -42 + i * 3 + bob); c.quadraticCurveTo(-30, -44 + i * 3.2 + bob, -20, -38 + i * 3 + bob); }
        c.stroke();
      },
    });
    A.ellipse(ctx, -24.5, -36 + bob, 2, 1.5, '#8a5a30', null, { lw: 1.2, hl: false });
    [['#e8433a', -35, -40], ['#4b8cf0', -29, -43], ['#ffd23a', -24, -41], ['#6fbf4a', -33, -35], ['#ffffff', -29, -38]].forEach(([cc, x, y]) => {
      A.shape(ctx, (c) => { c.moveTo(x - 2.4, y + bob + 0.6); c.quadraticCurveTo(x - 2.6, y + bob - 1.8, x, y + bob - 1.8); c.quadraticCurveTo(x + 2.6, y + bob - 1.6, x + 2.2, y + bob + 0.8); c.quadraticCurveTo(x, y + bob + 2, x - 2.4, y + bob + 0.6); c.closePath(); }, cc, null, { lw: 1.1, hl: false });
      dot(ctx, x - 0.8, y + bob - 0.8, 0.55, '#ffffff');
    });
    // 頭：光滑的軟體質感
    const hy = -38 + bob;
    const head = (c) => { c.moveTo(-18, -18 + bob); c.bezierCurveTo(-24, hy - 30, 24, hy - 30, 18, -18 + bob); c.quadraticCurveTo(0, -12 + bob, -18, -18 + bob); c.closePath(); };
    rs(ctx, head, col, sh, {
      cel: 3, lit: lit, litW: 2, bounce: '#ffb0d8', ba: 0.45, ao: [-24 + bob, -14 + bob],
      tex: (c) => {
        [[-10, hy - 10, 2.5], [10, hy - 12, 2], [-4, hy - 17, 1.6], [14, hy - 3, 1.4], [-14, hy - 1, 1.8]].forEach(([x, y, rr]) => {
          dot(c, x + 0.4, y + 0.5, rr, '#9a66c8');
          dot(c, x, y, rr, '#caa0ec');
        });
        // 身上沾到的顏料
        dot(c, -13, hy + 12, 1.5, '#ffd23a');
        dot(c, -11, hy + 14, 0.8, '#ffd23a');
        dot(c, 14, hy + 13, 1.2, '#e8433a');
      },
      gloss: [-8, hy - 12, 5, 2.8],
    });
    ctx.save();
    ctx.globalAlpha *= 0.8;
    dot(ctx, -3, hy - 17, 1, '#ffffff');
    ctx.restore();
    // 前排觸手：拿畫筆往右上舉
    const wave = Math.sin(t * 2.5) * 0.12;
    ctx.save();
    ctx.translate(12, -22 + bob);
    ctx.rotate(wave);
    curve2(ctx, [0, 0], [14, 4], [18, -12], col, 5, lit);
    stick2(ctx, [[16, -8], [28, -30]], '#c8904a', 2.4, '#f4d49a');
    rs(ctx, (c) => A.roundRect(c, 25.5, -33, 5, 5, 1), '#d0d8e0', '#8a94a0', { cel: [1, 0], lw: 1.4, lit: '#ffffff', litW: 0.6 });
    rs(ctx, (c) => { c.moveTo(26, -32); c.quadraticCurveTo(28, -42, 32, -40); c.quadraticCurveTo(32, -35, 30, -32); c.closePath(); }, '#4bc0e8', '#2a88b8', { cel: [1, 0], lw: 1.6, lit: '#c0f0ff', litW: 0.7 });
    // 筆尖滴下的顏料
    const dp = (t * 0.8) % 1;
    ctx.save();
    ctx.globalAlpha *= 1 - dp;
    dot(ctx, 32.5, -36 + dp * 10, 1.1, '#4bc0e8');
    ctx.restore();
    ctx.restore();
    const bl = blinkAt(t, 0.8, 0.5);
    eyeHQ(ctx, 2, hy + 2, 3.2, 4.2, '#5a2a8a', { closed: bl, look: 1, irisL: '#c8a0ff' });
    eyeHQ(ctx, 11, hy + 1.5, 3, 4, '#5a2a8a', { closed: bl, look: 1, irisL: '#c8a0ff' });
    smile(ctx, 8, hy + 10, 2.8);
    blush2(ctx, -3, hy + 8, 3, true);
    A.ellipse(ctx, 15, hy + 8, 2.4, 1.8, '#4bc0e8', null, { noStroke: true, hl: false });
    dot(ctx, 17.5, hy + 9.5, 0.8, '#4bc0e8');
    // 貝雷帽：毛氈質感、帽緣滾邊、小梗
    rs(ctx, (c) => c.ellipse(-2, hy - 17, 17, 6, -0.18, 0, TAU), '#c8303a', '#8e1c28', {
      cel: [2, 2], lw: 2.2, lit: '#ff8a86', litW: 1.2, gloss: [-9, hy - 20, 4, 1.4],
      tex: (c) => speckle(c, -2, hy - 17, 32, 10, '#7a1420', 22, 0.45, 13, 0.5),
    });
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = A.c('#6a1018');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-2, hy - 16, 15, 4.4, -0.18, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.stroke();
    ctx.restore();
    line(ctx, [[-2, hy - 23], [-1, hy - 27]], null, 2.5);
  }

  // 鵜鶘補給員：大喙袋裡裝滿補給品，戴著藍色郵差帽
  function pelican(ctx, t) {
    const bob = Math.sin(t * 1.9) * 1;
    const chew = Math.sin(t * 2.2) * 0.04;
    const W = '#f8f6ee';
    const WS = '#cfcbbd';
    [-6, 5].forEach((x) => {
      line(ctx, [[x, -14], [x, -2]], null, 5.4);
      line(ctx, [[x, -14], [x, -2]], '#f28c38', 3.2);
      line(ctx, [[x - 0.6, -13], [x - 0.6, -3]], '#ffc27a', 0.9);
    });
    [-4, 7].forEach((x) => {
      rs(ctx, (c) => c.ellipse(x, -1.5, 6, 2.6, 0, 0, TAU), '#f28c38', '#c8621e', { cel: [0, 1], lw: 1.8 });
      line(ctx, [[x, -2.5], [x + 3, -0.5]], '#c8621e', 0.7);
    });
    rs(ctx, (c) => { c.moveTo(-14, -26 + bob); c.lineTo(-28, -18 + bob); c.lineTo(-12, -14 + bob); c.closePath(); }, '#e4e4de', '#bcbab0', { cel: [0, 1.5], lw: 2.2, lit: '#ffffff', litW: 0.9 });
    rs(ctx, (c) => c.ellipse(-2, -27 + bob, 17, 17, 0, 0, TAU), W, WS, {
      cel: 3, lit: '#ffffff', bounce: '#f4d6a0', ba: 0.45, ao: [-18, -10],
      tex: (c) => furTex(c, 2, -22 + bob, 24, 22, '#c8c4b8', 16, 2.6, 1.8, 51, 0.5),
    });
    // 翅膀：層層羽毛、深色翼尖
    rs(ctx, (c) => { c.moveTo(-12, -36 + bob); c.quadraticCurveTo(2, -38 + bob, 6, -28 + bob); c.quadraticCurveTo(2, -16 + bob, -18, -18 + bob); c.quadraticCurveTo(-20, -30 + bob, -12, -36 + bob); c.closePath(); }, '#e4e4de', '#bcbab0', {
      cel: [1.5, 1.5], lw: 2.2, lit: '#ffffff', litW: 1.2,
      tex: (c) => {
        c.strokeStyle = A.c('#b0aea4');
        c.lineWidth = 0.9;
        c.beginPath();
        for (let r = 0; r < 2; r++) {
          for (let i = 0; i < 4; i++) {
            const x = -14 + i * 5 - r * 3;
            const y = -30 + r * 5 + bob + i * 0.4;
            c.moveTo(x - 2.5, y);
            c.quadraticCurveTo(x, y + 3, x + 2.5, y);
          }
        }
        c.stroke();
      },
    });
    [[-16, -20], [-11, -18]].forEach(([x, y]) => A.ellipse(ctx, x, y + bob, 3, 1.6, '#4a4a52', null, { noStroke: true, hl: false, rot: 0.3 }));
    // 脖子
    rs(ctx, (c) => { c.moveTo(0, -40 + bob); c.quadraticCurveTo(-2, -52 + bob, 2, -58 + bob); c.lineTo(12, -58 + bob); c.quadraticCurveTo(8, -50 + bob, 12, -38 + bob); c.closePath(); }, W, WS, {
      cel: [2, 1], lw: 2.2, lit: '#ffffff', litW: 1,
      tex: (c) => { for (let i = 0; i < 3; i++) line(c, [[3, -52 + i * 5 + bob], [7, -51 + i * 5 + bob]], '#d8d4c8', 0.8); },
    });
    const hx = 6;
    const hy = -62 + bob;
    rs(ctx, (c) => c.ellipse(hx, hy, 10, 9, 0, 0, TAU), W, WS, { cel: 2, lit: '#ffffff', litW: 1.2, bounce: '#ffd890', ba: 0.4, gloss: [hx - 4, hy - 4, 2.4, 1.4] });
    // 頭後的一撮黃毛
    A.shape(ctx, (c) => { c.moveTo(hx - 8, hy + 1); c.quadraticCurveTo(hx - 14, hy + 1, hx - 15, hy + 5); c.quadraticCurveTo(hx - 11, hy + 3.5, hx - 8, hy + 4.5); c.closePath(); }, '#ffe08a', '#e8b850', { shadeY: hy + 3, lw: 1.5, hl: false });
    // 喙袋（裝補給）：半透明的皮膚、細細的皺紋
    ctx.save();
    ctx.translate(hx + 6, hy + 2);
    ctx.rotate(chew);
    const pouch = (c) => { c.moveTo(0, 0); c.lineTo(28, 1); c.quadraticCurveTo(26, 20, 12, 22); c.quadraticCurveTo(2, 20, 0, 6); c.closePath(); };
    rs(ctx, pouch, '#ffcf7a', '#e0983e', {
      cel: 2, lw: 2.2, lit: '#fff0c0', litW: 1.2, gloss: [8, 8, 3, 1.4],
      tex: (c) => {
        c.strokeStyle = A.c('#e8a850');
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = 0; i < 4; i++) { c.moveTo(4 + i * 5, 6 + i); c.quadraticCurveTo(6 + i * 5, 13, 5 + i * 4, 19 - i * 0.5); }
        c.stroke();
        // 透出來的補給品影子
        c.save();
        c.globalAlpha *= 0.16;
        dot(c, 12, 10, 4, '#c8603a');
        dot(c, 20, 8, 3, '#b87a3a');
        c.restore();
      },
    });
    // 上喙（往上張開）
    ctx.save();
    ctx.translate(-1, -1);
    ctx.rotate(-0.42);
    rs(ctx, (c) => { c.moveTo(-1, -3); c.lineTo(29, -1); c.quadraticCurveTo(34, 0, 31, 3); c.lineTo(0, 3); c.closePath(); }, '#ffb84a', '#d8802a', { cel: [0, 1.8], lw: 2.2, lit: '#fff0b0', litW: 0.9, gloss: [12, -1.2, 5, 0.7, 0] });
    line(ctx, [[2, 0.6], [26, 1.2]], '#d8802a', 0.8);
    dot(ctx, 30.5, 1, 1.3, '#e8433a');
    ctx.restore();
    // 藥水瓶：液面、軟木塞、玻璃反光
    rs(ctx, (c) => A.roundRect(c, 9, -10, 6, 10, 2.5), '#ffd8d8', '#e0a8a8', { cel: [1, 0], lw: 1.6 });
    rs(ctx, (c) => A.roundRect(c, 9.6, -6, 4.8, 5.4, 2), '#e8433a', '#a82a26', { cel: [1, 0.8], noStroke: true });
    line(ctx, [[10.4, -8.5], [10.4, -2]], '#ffffff', 0.9);
    rs(ctx, (c) => A.roundRect(c, 10, -13, 4, 3.5, 1), '#c89458', '#8a5a2a', { cel: [0.8, 0], lw: 1.2 });
    // 麵包：烤痕、表面光澤
    rs(ctx, (c) => c.ellipse(19, -3, 6.5, 4, -0.35, 0, TAU), '#e8b060', '#b87a34', { cel: [1, 1.2], lw: 1.6, lit: '#ffe0a0', litW: 0.8, gloss: [17, -5.2, 2, 0.8] });
    line(ctx, [[16, -3], [18, -6]], '#a86a2a', 1.2);
    line(ctx, [[19, -1.5], [21, -4.5]], '#a86a2a', 1.2);
    // 信封＋紅色封蠟
    ctx.save();
    ctx.translate(26, -3);
    ctx.rotate(0.35);
    rs(ctx, (c) => A.roundRect(c, -4, -4, 8, 6, 1), '#fff6e0', '#e0d0b0', { cel: [0, 1], lw: 1.4 });
    line(ctx, [[-3.5, -3.5], [0, -0.5], [3.5, -3.5]], null, 1);
    dot(ctx, 0, -0.5, 1.3, '#c8303a');
    ctx.restore();
    ctx.restore();
    eyeHQ(ctx, hx + 2, hy - 2, 2.6, 3.2, '#6a8aa8', { closed: blinkAt(t, 0.8, 3), look: 1, irisL: '#d0e8ff' });
    line(ctx, [[hx - 1, hy - 6.6], [hx + 4, hy - 6.4]], '#8a8478', 1.1);
    blush2(ctx, hx - 1, hy + 3, 2.4);
    // 郵差帽：藍色毛呢、亮面帽簷、金色信封徽章
    rs(ctx, (c) => { c.moveTo(hx - 9, hy - 5); c.quadraticCurveTo(hx - 8, hy - 16, hx, hy - 16); c.quadraticCurveTo(hx + 8, hy - 16, hx + 8, hy - 6); c.closePath(); }, '#3d6fb3', '#264a80', {
      cel: [1.5, 1.5], lw: 2.2, lit: '#8ab4e8', litW: 1,
      tex: (c) => { c.fillStyle = A.c('#264a80'); c.fillRect(hx - 10, hy - 7.5, 20, 2); },
    });
    rs(ctx, (c) => c.ellipse(hx + 8, hy - 5.5, 7, 2.2, 0.1, 0, TAU), '#2d5690', '#1e3c6a', { cel: [0, 0.8], lw: 2, gloss: [hx + 7, hy - 6.4, 3.4, 0.6, 0.1], glossA: 0.5 });
    rs(ctx, (c) => c.ellipse(hx - 1, hy - 11, 2.6, 2.6, 0, 0, TAU), '#ffd23a', '#c8901a', { cel: 0.6, lw: 1.2, lit: '#fff6c0', litW: 0.6 });
    line(ctx, [[hx - 2.4, hy - 11.8], [hx - 1, hy - 10.6], [hx + 0.4, hy - 11.8]], '#8a5a10', 0.6);
    glint(ctx, hx - 2, hy - 12, 1.6, 0.5 + Math.sin(t * 2.2) * 0.4);
  }

  // ════════ 第三章：溫泉谷 ════════

  // 水豚掌櫃：一臉淡定，頭上頂著一顆柚子，穿著靛藍短掛
  function capybara(ctx, t) {
    const bob = Math.sin(t * 1.2) * 0.8;
    const F = '#b8844e';
    const FS = '#8a5a30';
    const FL = '#e4b884';
    [-12, 10].forEach((x) => {
      re(ctx, x, -2, 7, 3.2, '#946438', '#6a4424', { lw: 2, gloss: false, cel: [0, 1.2] });
      line(ctx, [[x + 2, -3.4], [x + 3, -0.8]], '#5a3a1e', 0.8);
      line(ctx, [[x + 4.5, -3.2], [x + 5.5, -1]], '#5a3a1e', 0.8);
    });
    rs(ctx, (c) => { c.moveTo(-24, -2); c.bezierCurveTo(-28, -30, -18, -44 + bob, 0, -44 + bob); c.bezierCurveTo(18, -44 + bob, 24, -26, 20, -2); c.closePath(); }, F, FS, {
      cel: [4, 3], lit: FL, litW: 2, ao: [-10, -2],
      tex: (c) => furTex(c, 0, -20, 46, 40, '#6a4424', 30, 4, 1.9, 61, 0.45),
    });
    // 靛藍短掛：白色井字絣紋、衣襟、縫線
    const coat = (c) => { c.moveTo(-18, -36 + bob); c.quadraticCurveTo(0, -42 + bob, 18, -34 + bob); c.lineTo(20, -10); c.quadraticCurveTo(0, -4, -22, -10); c.closePath(); };
    rs(ctx, coat, '#3d5f9a', '#243e6c', {
      cel: [3, 2], lw: 2.2, lit: '#7a9ad0', litW: 1.4, ao: [-18, -6],
      tex: (c) => {
        c.save();
        c.globalAlpha *= 0.55;
        c.strokeStyle = A.c('#c8d8f0');
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          for (let k = 0; k < 4; k++) {
            const x = -18 + i * 7 + (k % 2) * 3.5;
            const y = -34 + k * 7 + bob * 0.6;
            c.moveTo(x - 1.4, y);
            c.lineTo(x + 1.4, y);
            c.moveTo(x, y - 1.4);
            c.lineTo(x, y + 1.4);
          }
        }
        c.stroke();
        c.restore();
        stitch(c, [[-21, -12], [0, -7], [19, -12]], '#8aa4d4', 0.7);
      },
    });
    // 衣襟（白色、有厚度）
    line(ctx, [[4, -40 + bob], [2, -8]], null, 5);
    line(ctx, [[4, -40 + bob], [2, -8]], '#f4ecd8', 3);
    line(ctx, [[3.4, -39 + bob], [1.6, -10]], '#ffffff', 1);
    // 木頭腰帶扣
    rs(ctx, (c) => A.roundRect(c, -20, -16 + bob * 0.3, 40, 4, 1.5), '#6a4a2a', '#4a3018', { cel: [0, 1], lw: 1.6, lit: '#a07a4a', litW: 0.7 });
    // 「湯」字名牌
    rs(ctx, (c) => A.roundRect(c, -10, -24 + bob * 0.5, 9, 9, 2), '#f4ecd8', '#d8c8a8', { cel: [1, 1], lw: 1.6, lit: '#ffffff', litW: 0.7 });
    ctx.fillStyle = A.c('#3d5f9a');
    ctx.font = 'bold 7px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('湯', -5.5, -19.5 + bob * 0.5);
    // 手裡的小算盤
    rs(ctx, (c) => A.roundRect(c, 11, -27 + bob, 13, 8, 1.5), '#8a5a30', '#5a3a1e', { cel: [0, 1], lw: 1.6 });
    for (let r = 0; r < 3; r++) {
      line(ctx, [[12.5, -25 + r * 2.4 + bob], [22.5, -25 + r * 2.4 + bob]], '#d8b884', 0.6);
      for (let k = 0; k < 3; k++) dot(ctx, 15.5 + k * 2.6 + (r % 2), -25 + r * 2.4 + bob, 0.9, r === 1 ? '#e8433a' : '#2b1a12');
    }
    re(ctx, 10, -20 + bob, 5, 4, F, FS, { lw: 2, gloss: false, cel: 1.2, lit: FL, litW: 1 });
    // 頭：方方的大鼻子
    const hx = 6;
    const hy = -52 + bob;
    re(ctx, hx - 9, hy - 10, 3.5, 3, '#946438', '#6a4424', { lw: 2, gloss: false, cel: 0.8 });
    dot(ctx, hx - 9, hy - 9.6, 1.4, '#5a3a1e');
    rs(ctx, (c) => A.roundRect(c, hx - 15, hy - 11, 36, 22, 10), F, FS, {
      cel: 3, lit: FL, litW: 1.8, bounce: '#ffd8a0', ba: 0.35, gloss: [hx - 8, hy - 6, 4, 2.2],
      tex: (c) => furTex(c, hx - 2, hy, 30, 18, '#6a4424', 16, 3, 1.7, 71, 0.4),
    });
    rs(ctx, (c) => A.roundRect(c, hx + 8, hy - 6, 13, 16, 6), '#a07040', '#7e5230', { cel: [1.5, 1.5], noStroke: true, lit: '#c8986a', litW: 1 });
    [[hx + 15, hy - 1], [hx + 19, hy - 1]].forEach(([x, y]) => nose(ctx, x, y, 1.1, 2, '#3a2418'));
    line(ctx, [[hx + 13, hy + 6], [hx + 19, hy + 6]], null, 1.8);
    line(ctx, [[hx + 16, hy + 1], [hx + 16, hy + 6]], '#6a4424', 1);
    // 半瞇的淡定眼（精緻版：眼皮有厚度）
    const bl = blinkAt(t, 0.8, 1);
    [[hx - 1, hy - 3], [hx + 7, hy - 3.5]].forEach(([x, y]) => {
      if (bl) return A.eye(ctx, x, y, 2.4, 2.4, 'closed');
      eyeHQ(ctx, x, y + 0.5, 2.4, 2.4, '#5a3418', { look: 0.6, irisL: '#c88a4a', lash: false });
      ctx.fillStyle = A.c(F);
      ctx.fillRect(x - 3.2, y - 3, 6.4, 2.6);
      line(ctx, [[x - 3, y - 0.4], [x + 3, y - 0.4]], null, 2);
      line(ctx, [[x - 2.4, y - 1.8], [x + 2.4, y - 1.8]], FL, 0.8);
    });
    blush2(ctx, hx - 5, hy + 4, 3);
    // 頭上的毛巾（折得方方正正、有縫線）
    const ys = Math.sin(t * 1.2 + 0.8) * 0.8;
    rs(ctx, (c) => A.roundRect(c, hx - 7, hy - 14 + ys * 0.5, 17, 4.5, 1.5), '#ffffff', '#d8e0e8', {
      cel: [0, 1.2], lw: 1.8,
      tex: (c) => { line(c, [[hx - 7, hy - 12 + ys * 0.5], [hx + 10, hy - 12 + ys * 0.5]], '#8ab4e8', 0.9); },
    });
    // 頭上的柚子：果皮的小油點、葉脈
    const yx = hx + 2;
    const yy = hy - 18 + ys;
    rs(ctx, (c) => c.ellipse(yx, yy, 7.5, 6.5, 0, 0, TAU), '#ffc83a', '#e0921a', {
      cel: 1.5, lit: '#fff2a0', litW: 1.2, bounce: '#ffffff', ba: 0.3, gloss: [yx - 3, yy - 3, 2, 1.3],
      tex: (c) => speckle(c, yx + 1, yy + 1, 13, 11, '#d88a10', 14, 0.45, 81, 0.7),
    });
    line(ctx, [[yx, yy - 6], [yx + 1, yy - 8]], null, 2);
    rs(ctx, (c) => c.ellipse(yx + 5, yy - 8, 4.5, 2.2, -0.4, 0, TAU), '#6fbf4a', '#4a8a2e', { cel: [0, 1], lw: 1.6, lit: '#b8f08a', litW: 0.6 });
    line(ctx, [[yx + 1.5, yy - 6.8], [yx + 8.5, yy - 9.6]], '#3f7a24', 0.7);
    steam(ctx, yx - 12, yy - 6, t, 2, 0.35, 16);
  }

  // 老猴子：雪猴爺爺，紅臉白長鬍，拄著彎彎的木杖
  function oldmonkey(ctx, t) {
    const bob = Math.sin(t * 1.3) * 0.8;
    const fur = '#b8aa98';
    const furS = '#8a7c68';
    const furL = '#e6dccc';
    [-8, 6].forEach((x) => {
      re(ctx, x, -2, 6.5, 3, furS, '#6a5e4e', { lw: 2, gloss: false, cel: [0, 1] });
      line(ctx, [[x + 2, -3.2], [x + 3, -1]], '#5a4e40', 0.8);
    });
    // 駝背的身體（背上一簇簇蓬鬆的毛）
    [[-19, -20, -0.4], [-15, -32, -0.9], [-6, -41, -1.4]].forEach(([x, y, r]) => rs(ctx, (c) => { c.moveTo(x + 5 * Math.cos(r + 1.6), y + bob + 5 * Math.sin(r + 1.6)); c.lineTo(x + 6 * Math.cos(r + Math.PI), y + bob + 6 * Math.sin(r + Math.PI)); c.lineTo(x + 5 * Math.cos(r - 1.6), y + bob + 5 * Math.sin(r - 1.6)); c.closePath(); }, fur, furS, { lw: 2, cel: 1, lit: furL, litW: 1 }));
    rs(ctx, (c) => { c.moveTo(-16, -2); c.bezierCurveTo(-24, -26, -10, -44 + bob, 4, -40 + bob); c.bezierCurveTo(16, -36 + bob, 16, -16, 12, -2); c.closePath(); }, fur, furS, {
      cel: 3, lit: furL, litW: 2, bounce: '#f0b0a0', ba: 0.3, ao: [-10, -2],
      tex: (c) => {
        furTex(c, -4, -20, 30, 40, '#7a6c58', 26, 4.2, 1.8, 91, 0.45);
        furTex(c, -8, -30, 16, 16, '#ffffff', 10, 3.4, 1.6, 93, 0.5);
      },
    });
    // 木杖：樹瘤、木紋、綁著紅繩的藥葫蘆
    const sx = 22;
    stick2(ctx, [[sx + 1, 0], [sx - 1, -22], [sx + 1, -38 + bob]], '#9a6a3e', 3.2, '#d8a870');
    [[sx - 0.5, -10], [sx, -30 + bob]].forEach(([x, y]) => A.ellipse(ctx, x + 1.2, y, 1.4, 1, '#6a4220', null, { lw: 0.8, hl: false }));
    rs(ctx, (c) => c.ellipse(sx + 1, -41 + bob, 4.5, 4, 0, 0, TAU), '#8a5a30', '#5e3a1a', { cel: 1, lw: 2, lit: '#c08a58', litW: 0.9 });
    rs(ctx, (c) => c.ellipse(sx + 6, -42 + bob, 3.5, 1.8, -0.5, 0, TAU), '#6fbf4a', '#4a8a2e', { cel: [0, 0.8], lw: 1.4 });
    const gs = Math.sin(t * 1.6) * 0.12;
    ctx.save();
    ctx.translate(sx + 2, -36 + bob);
    ctx.rotate(gs);
    line(ctx, [[0, 0], [1, 4]], '#d94f4f', 1.2);
    rs(ctx, (c) => { c.arc(1.5, 6.5, 2.4, 0, TAU); }, '#e8b860', '#b8802a', { cel: 0.8, lw: 1.4 });
    rs(ctx, (c) => { c.arc(1.5, 11.5, 3.6, 0, TAU); }, '#e8b860', '#b8802a', { cel: 1, lw: 1.6, lit: '#fff0b0', litW: 0.8, gloss: [0.2, 10, 1, 0.7] });
    line(ctx, [[-0.6, 8.6], [3.6, 8.6]], '#d94f4f', 1.2);
    ctx.restore();
    // 握杖的手
    re(ctx, sx - 1, -28 + bob, 4.5, 4.5, fur, furS, { lw: 2, gloss: false, cel: 1, lit: furL, litW: 0.9 });
    line(ctx, [[sx - 3.5, -29 + bob], [sx + 1, -28.5 + bob]], '#7a6c58', 0.8);
    // 頭
    const hx = 5;
    const hy = -48 + bob;
    re(ctx, hx - 11, hy + 1, 4, 4, '#e8807a', '#c05e58', { lw: 2, gloss: false, cel: 0.8 });
    dot(ctx, hx - 11, hy + 1.4, 1.6, '#b04e4a');
    rs(ctx, (c) => bumpPath(c, hx, hy, 12.5, 11, 0.9), fur, furS, {
      cel: 2, lit: furL, litW: 1.6,
      tex: (c) => furTex(c, hx - 4, hy - 2, 20, 18, '#7a6c58', 14, 3, 1.5, 97, 0.4),
    });
    // 紅通通的臉（細細的皺紋）
    const face = (c) => { c.moveTo(hx - 3, hy - 4); c.quadraticCurveTo(hx - 2, hy - 10, hx + 5, hy - 8); c.quadraticCurveTo(hx + 12, hy - 10, hx + 14, hy - 3); c.quadraticCurveTo(hx + 17, hy + 3, hx + 12, hy + 6); c.quadraticCurveTo(hx + 4, hy + 8, hx - 1, hy + 4); c.quadraticCurveTo(hx - 4, hy + 1, hx - 3, hy - 4); c.closePath(); };
    rs(ctx, face, '#f08a80', '#c8605a', {
      cel: [1.5, 1.5], lw: 2, lit: '#ffc0b4', litW: 1, gloss: [hx + 3, hy - 6, 2.4, 1],
      tex: (c) => {
        line(c, [[hx + 3, hy - 7], [hx + 7, hy - 7.6]], '#d06a62', 0.7);
        line(c, [[hx + 12, hy - 1], [hx + 13.5, hy + 2]], '#d06a62', 0.7);
        line(c, [[hx - 1, hy + 0.5], [hx + 1, hy + 2.2]], '#d06a62', 0.7);
      },
    });
    dot(ctx, hx + 13, hy + 0.5, 0.9, '#8a3a34');
    dot(ctx, hx + 14.8, hy + 0.2, 0.9, '#8a3a34');
    // 眼睛與往下垂的白眉
    const bl = blinkAt(t, 0.85);
    eyeHQ(ctx, hx + 3, hy - 2.5, 2.2, 2.6, '#6a3a1a', { closed: bl, look: 1, irisL: '#d8a060' });
    eyeHQ(ctx, hx + 9.5, hy - 3, 2, 2.4, '#6a3a1a', { closed: bl, look: 1, irisL: '#d8a060' });
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy - 4);
    ctx.quadraticCurveTo(hx + 1, hy - 9, hx + 6, hy - 7);
    ctx.moveTo(hx + 7.5, hy - 7.5);
    ctx.quadraticCurveTo(hx + 11, hy - 9.5, hx + 14, hy - 5);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4.4;
    ctx.stroke();
    ctx.strokeStyle = A.c('#ffffff');
    ctx.lineWidth = 3;
    ctx.stroke();
    // 白長鬍子（一絲一絲的毛）
    const bs = Math.sin(t * 1.6) * 1.2;
    rs(ctx, (c) => { c.moveTo(hx + 1, hy + 5); c.quadraticCurveTo(hx + 7, hy + 9, hx + 13, hy + 5); c.quadraticCurveTo(hx + 13, hy + 16, hx + 6 + bs, hy + 27); c.quadraticCurveTo(hx + 4, hy + 20, hx + 1, hy + 21 + bs * 0.5); c.quadraticCurveTo(hx - 1, hy + 12, hx + 1, hy + 5); c.closePath(); }, '#ffffff', '#d4dae2', {
      cel: [1.5, 1.5], lw: 2,
      tex: (c) => {
        c.strokeStyle = A.c('#c8d0da');
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          c.moveTo(hx + 3 + i * 2.4, hy + 8);
          c.quadraticCurveTo(hx + 4 + i * 2, hy + 15, hx + 4 + i * 0.8 + bs * 0.7, hy + 22 - Math.abs(i - 1.5) * 2);
        }
        c.stroke();
      },
    });
    line(ctx, [[hx + 8, hy + 4], [hx + 11, hy + 4.5], [hx + 13, hy + 3.5]], null, 1.6);
    blush2(ctx, hx + 1.5, hy + 2.5, 2);
    // 頭頂的毛（亂亂的三撮）
    rs(ctx, (c) => { c.moveTo(hx - 8, hy - 9); c.quadraticCurveTo(hx - 4, hy - 18, hx + 2, hy - 12); c.quadraticCurveTo(hx + 4, hy - 18, hx + 8, hy - 10); c.closePath(); }, fur, furS, { lw: 2, cel: [0, 1.2], lit: furL, litW: 1 });
    line(ctx, [[hx - 3, hy - 13], [hx - 1.5, hy - 10.5]], '#7a6c58', 0.8);
  }

  // 狐獴小哨兵：站得直直的，一手搭在額頭上東張西望，脖子上掛著哨子
  function meerkat(ctx, t) {
    const cyc = t % 6;
    const look = cyc < 2.5 ? 1 : cyc < 3.2 ? 0 : cyc < 5.2 ? -1 : 0;
    const bob = Math.sin(t * 2.4) * 0.8;
    const fur = '#d8b88a';
    const furS = '#a8844e';
    const furL = '#fff0d0';
    curve2(ctx, [-6, -12], [-20, -8], [-22, -1], fur, 4.5, furL);
    re(ctx, -22, -1, 3, 2.4, '#4a3426', '#2e2018', { lw: 1.6, gloss: false, cel: 0.6 });
    [-6, 6].forEach((x) => {
      re(ctx, x, -2, 6, 2.8, furS, '#80602e', { lw: 2, gloss: false, cel: [0, 1] });
      [1.5, 3.8].forEach((d) => line(ctx, [[x + d, -3.2], [x + d + 0.8, -1]], '#6a4a22', 0.8));
    });
    rs(ctx, (c) => c.ellipse(0, -24 + bob, 11, 21, 0, 0, TAU), fur, furS, {
      cel: 2.5, lit: furL, litW: 1.8, bounce: '#ffd890', ba: 0.35, ao: [-10, -3],
      tex: (c) => {
        // 背上的深色細條紋
        c.strokeStyle = A.c('#8a6a3e');
        c.lineWidth = 1.1;
        c.beginPath();
        for (let i = 0; i < 5; i++) { c.moveTo(-11, -36 + i * 5 + bob); c.quadraticCurveTo(-8, -34 + i * 5 + bob, -5, -35 + i * 5 + bob); }
        c.stroke();
        furTex(c, 0, -24 + bob, 22, 40, '#9a7a48', 18, 3, 1.8, 101, 0.4);
      },
    });
    rs(ctx, (c) => c.ellipse(3, -20 + bob, 6, 14, 0, 0, TAU), '#f4e4c4', '#dcc49a', {
      cel: [1.5, 2], noStroke: true,
      tex: (c) => furTex(c, 3, -20 + bob, 10, 24, '#c8a878', 10, 2.4, 1.7, 103, 0.5),
    });
    re(ctx, 7, -30 + bob, 3.2, 5, fur, furS, { lw: 1.8, gloss: false, rot: 0.3, cel: 0.8, lit: furL, litW: 0.8 });
    // 綠領巾（小白點印花）與哨子
    rs(ctx, (c) => { c.moveTo(-8, -42 + bob); c.quadraticCurveTo(2, -36 + bob, 10, -42 + bob); c.lineTo(8, -38 + bob); c.quadraticCurveTo(1, -32 + bob, -7, -38 + bob); c.closePath(); }, '#5ab04a', '#3a7e2e', {
      cel: [0, 1.2], lw: 1.8, lit: '#a8e890', litW: 0.8,
      tex: (c) => [[-4, -39], [0, -37], [4, -38.5], [7, -40.5]].forEach(([x, y]) => dot(c, x, y + bob, 0.6, '#ffffff')),
    });
    rs(ctx, (c) => { c.moveTo(1, -36 + bob); c.lineTo(-2, -29 + bob); c.lineTo(4, -30 + bob); c.closePath(); }, '#5ab04a', '#3a7e2e', { cel: [1, 0], lw: 1.6 });
    line(ctx, [[5, -38 + bob], [8, -33 + bob]], '#d94f4f', 0.9);
    rs(ctx, (c) => A.roundRect(c, 5, -34 + bob, 7, 4, 1.5), '#ffcf3a', '#c8901a', { cel: [0, 1.2], lw: 1.4, lit: '#fff6c0', litW: 0.6 });
    dot(ctx, 10.3, -32 + bob, 0.8, '#6a4a10');
    glint(ctx, 6.6, -33.4 + bob, 1.6, 0.5 + Math.sin(t * 3.1) * 0.45);
    const hx = 4 + look * 1.5;
    const hy = -52 + bob;
    // 搭在額頭上的手（手臂在頭後面，只有手掌蓋在額頭上）
    curve2(ctx, [4, -40 + bob], [16, -46 + bob], [hx + 6, hy - 8], fur, 5, furL);
    // 頭
    re(ctx, hx - 8, hy - 3, 3, 3, '#4a3426', '#2e2018', { lw: 1.8, gloss: false, cel: 0.6 });
    rs(ctx, (c) => { c.moveTo(hx - 10, hy - 2); c.quadraticCurveTo(hx - 10, hy - 11, hx, hy - 10); c.quadraticCurveTo(hx + 9, hy - 9, hx + 15 + look, hy + 1); c.quadraticCurveTo(hx + 12, hy + 6, hx + 2, hy + 7); c.quadraticCurveTo(hx - 10, hy + 7, hx - 10, hy - 2); c.closePath(); }, fur, furS, {
      cel: 2, lit: furL, litW: 1.4, gloss: [hx - 3, hy - 6, 3, 1.6],
      tex: (c) => {
        furTex(c, hx, hy, 20, 14, '#9a7a48', 10, 2.4, 1.5, 107, 0.35);
        c.fillStyle = A.c('#f4e4c4');
        c.beginPath();
        c.ellipse(hx + 8, hy + 4, 6, 3, 0.1, 0, TAU);
        c.fill();
      },
    });
    nose(ctx, hx + 14.5 + look, hy + 0.5, 2, 2, '#3a2418');
    A.ellipse(ctx, hx + 1, hy - 2, 4.3, 3.6, '#6a4a34', null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx + 8, hy - 2.5, 3.8, 3.3, '#6a4a34', null, { noStroke: true, hl: false });
    const bl = blinkAt(t, 1.1);
    eyeHQ(ctx, hx + 1, hy - 2, 2.3, 2.7, '#3a2a18', { closed: bl, look: look, irisL: '#b88a4a', lash: false });
    eyeHQ(ctx, hx + 8, hy - 2.5, 2.1, 2.5, '#3a2a18', { closed: bl, look: look, irisL: '#b88a4a', lash: false });
    smile(ctx, hx + 10, hy + 4.2, 1.6);
    blush2(ctx, hx - 2, hy + 3, 2.2);
    // 手掌（肉球）
    rs(ctx, (c) => c.ellipse(hx + 6, hy - 8, 6.5, 2.8, -0.15, 0, TAU), fur, furS, { lw: 1.8, cel: [0, 1], lit: furL, litW: 0.8 });
    [-3, 0, 3].forEach((d) => line(ctx, [[hx + 6 + d, hy - 9.6 - d * 0.1], [hx + 6 + d, hy - 7.2 - d * 0.1]], '#9a7a48', 0.7));
  }

  // 小熊貓廚師：高高的廚師帽，手拿湯杓，條紋大尾巴
  function redpanda(ctx, t) {
    const bob = Math.sin(t * 2.3) * 1;
    const fur = '#cf5e2c';
    const furS = '#96401c';
    const furL = '#ffa870';
    const dark = '#4a2a22';
    const sw = Math.sin(t * 2) * 0.12;
    ctx.save();
    ctx.translate(-10, -12);
    ctx.rotate(sw);
    const tail = (c) => { c.moveTo(0, -4); c.quadraticCurveTo(-18, -6, -26, -24); c.quadraticCurveTo(-30, -34, -22, -36); c.quadraticCurveTo(-12, -32, -10, -20); c.quadraticCurveTo(-6, -10, 2, 4); c.closePath(); };
    rs(ctx, tail, fur, furS, {
      cel: 2, lit: furL, litW: 1.6,
      tex: (c) => {
        c.strokeStyle = A.c('#f0b078');
        c.lineWidth = 3.5;
        [[-8, -6], [-15, -14], [-20, -23], [-24, -31]].forEach(([x, y]) => {
          c.beginPath();
          c.moveTo(x - 8, y + 6);
          c.lineTo(x + 8, y - 4);
          c.stroke();
        });
        furTex(c, -14, -16, 30, 40, '#7a3212', 20, 3.4, 2.2, 111, 0.45);
        c.fillStyle = A.c('#5a2a18');
        c.beginPath();
        c.ellipse(-24, -34, 5, 3.5, 0.4, 0, TAU);
        c.fill();
      },
    });
    ctx.restore();
    [-6, 7].forEach((x) => re(ctx, x, -2, 6, 3, dark, '#2a1812', { lw: 2, gloss: [x - 2, -3.2, 1.6, 0.6], cel: [0, 1] }));
    rs(ctx, (c) => c.ellipse(0, -22 + bob, 14, 18, 0, 0, TAU), fur, furS, {
      cel: 3, lit: furL, litW: 1.8, bounce: '#ffd070', ba: 0.35,
      tex: (c) => {
        furTex(c, -4, -22 + bob, 26, 34, '#7a3212', 20, 3, 1.9, 113, 0.4);
        c.fillStyle = A.c(dark);
        c.beginPath();
        c.ellipse(0, -8 + bob, 14, 6, 0, 0, TAU);
        c.fill();
      },
    });
    // 白圍裙：口袋、縫線、綁帶
    const apron = (c) => { c.moveTo(-6, -32 + bob); c.lineTo(12, -32 + bob); c.quadraticCurveTo(14, -16 + bob, 10, -6 + bob); c.quadraticCurveTo(0, -3 + bob, -6, -8 + bob); c.closePath(); };
    rs(ctx, apron, '#fffbf2', '#ddd2bc', {
      cel: [2, 1.5], lw: 2, lit: '#ffffff', litW: 1, ao: [-14 + bob, -4 + bob],
      tex: (c) => {
        stitch(c, [[-4.5, -30 + bob], [-4.5, -9 + bob]], '#c8baa0', 0.7);
        rs(c, (cc) => A.roundRect(cc, -1, -18 + bob, 9, 6, 1.5), '#f6ecdc', '#ddd2bc', { cel: [0, 1], lw: 1.2 });
        stitch(c, [[0, -16.5 + bob], [7, -16.5 + bob]], '#c8baa0', 0.6);
        dot(c, 7, -27 + bob, 1.2, '#f0b060');
        dot(c, 9, -25.5 + bob, 0.7, '#f0b060');
      },
    });
    line(ctx, [[-6, -31 + bob], [-12, -26 + bob]], '#e8e0d0', 1.6);
    // 湯杓：不鏽鋼的反光、杓裡的湯
    const lad = Math.sin(t * 3) * 0.15;
    ctx.save();
    ctx.translate(14, -26 + bob);
    ctx.rotate(-0.35 + lad);
    stick2(ctx, [[0, 8], [0, -22]], '#b8c2cc', 2.4, '#ffffff');
    rs(ctx, (c) => { c.moveTo(-6, -22); c.quadraticCurveTo(-6, -30, 0, -30); c.quadraticCurveTo(6, -30, 6, -22); c.closePath(); }, '#dfe6ec', '#8a94a0', { cel: [1.2, 1.2], lw: 2, lit: '#ffffff', litW: 0.9 });
    A.shape(ctx, (c) => c.ellipse(0, -22, 5.4, 1.4, 0, 0, TAU), '#f0a040', '#d0782a', { lw: 1.2, hl: false, shadeY: -21.5 });
    glint(ctx, -3.2, -26.5, 1.8, 0.5 + Math.sin(t * 2.6) * 0.45);
    ctx.restore();
    re(ctx, 13, -24 + bob, 4.5, 4.5, dark, '#2a1812', { lw: 2, gloss: [11.6, -25.6, 1.5, 0.9], cel: 1 });
    // 頭
    const hx = 5;
    const hy = -48 + bob;
    [[hx - 10, hy - 9], [hx + 9, hy - 10]].forEach(([x, y]) => {
      rs(ctx, (c) => c.ellipse(x, y, 5, 5, 0, 0, TAU), fur, furS, { lw: 2, cel: 1, lit: furL, litW: 0.9 });
      rs(ctx, (c) => c.ellipse(x, y + 0.5, 2.8, 2.8, 0, 0, TAU), '#fffbf2', '#e0d4c0', { cel: [0, 0.8], noStroke: true, tex: (c) => furTex(c, x, y + 1, 5, 5, '#c8b8a0', 5, 1.6, 1.4, 117, 0.6) });
    });
    rs(ctx, (c) => c.ellipse(hx, hy, 14, 12, 0, 0, TAU), fur, furS, {
      cel: [2, 2.5], lit: furL, litW: 1.6, bounce: '#ffd070', ba: 0.3, gloss: [hx - 6, hy - 6, 3, 1.6],
      tex: (c) => {
        furTex(c, hx - 3, hy - 2, 22, 18, '#7a3212', 12, 2.6, 1.6, 119, 0.35);
        // 淚痕紋（紅褐色從眼下往嘴角）
        c.strokeStyle = A.c('#8a3414');
        c.lineWidth = 2;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(hx + 1, hy + 1);
        c.quadraticCurveTo(hx + 1.5, hy + 5, hx + 3, hy + 8);
        c.stroke();
      },
    });
    rs(ctx, (c) => c.ellipse(hx + 8, hy + 4, 7.5, 5.5, 0, 0, TAU), '#fffbf2', '#e0d4c0', { cel: [1, 1.2], lw: 1.8, lit: '#ffffff', litW: 0.8 });
    A.ellipse(ctx, hx - 6, hy + 3, 4, 3.5, '#fffbf2', null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx + 1, hy - 6, 2.2, 1.5, '#fffbf2', null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx + 9, hy - 7, 2.2, 1.5, '#fffbf2', null, { noStroke: true, hl: false });
    nose(ctx, hx + 14, hy + 2, 2.4, 2.1, '#2b1a12');
    whiskers(ctx, hx + 13, hy + 5, 1, '#ffffff', 6);
    wmouth(ctx, hx + 11, hy + 6, 1.4);
    const bl = blinkAt(t, 0.9, 2.5);
    eyeHQ(ctx, hx + 1.5, hy - 1.5, 2.6, 3.2, '#5a2a14', { closed: bl, look: 1, irisL: '#e89a58' });
    eyeHQ(ctx, hx + 9, hy - 2, 2.4, 3, '#5a2a14', { closed: bl, look: 1, irisL: '#e89a58' });
    blush2(ctx, hx - 5, hy + 4, 2.4);
    // 廚師帽：布料的褶子、帽身的縫線
    const cap = (c) => { c.arc(hx - 6, hy - 20, 6, Math.PI * 0.6, Math.PI * 1.5); c.arc(hx, hy - 25, 7, Math.PI * 1.1, Math.PI * 1.9); c.arc(hx + 6, hy - 20, 6, Math.PI * 1.5, Math.PI * 0.4); c.lineTo(hx + 8, hy - 15); c.lineTo(hx - 9, hy - 15); c.closePath(); };
    rs(ctx, cap, '#fffbf2', '#d8ccb4', {
      cel: 2, lw: 2.2, lit: '#ffffff', litW: 1, bounce: '#ffd8a0', ba: 0.3,
      tex: (c) => {
        c.strokeStyle = A.c('#d8ccb4');
        c.lineWidth = 0.9;
        c.beginPath();
        [[hx - 4, hy - 26], [hx + 1, hy - 29], [hx + 5, hy - 25]].forEach(([x, y]) => { c.moveTo(x, y); c.quadraticCurveTo(x - 1, y + 6, x - 0.5, y + 11); });
        c.stroke();
      },
    });
    rs(ctx, (c) => A.roundRect(c, hx - 9, hy - 16, 17, 7, 2), '#fffbf2', '#ddd2bc', {
      cel: [0, 1.6], lw: 2,
      tex: (c) => stitch(c, [[hx - 8, hy - 14.5], [hx + 7, hy - 14.5]], '#c8baa0', 0.6),
    });
    steam(ctx, 26, -58 + bob, t, 2, 0.6, 12);
  }

  // 鸚鵡嚮導：金剛鸚鵡，紅身藍黃翅，會用翅膀指路
  function parrot(ctx, t) {
    const bob = Math.sin(t * 2.4) * 1;
    const cyc = t % 5;
    const point = cyc > 3 && cyc < 4.4 ? Math.sin(((cyc - 3) / 1.4) * Math.PI) : 0;
    const RED = '#e8403a';
    const REDS = '#a82422';
    const REDL = '#ff9a80';
    // 長長的尾羽（羽軸線）
    rs(ctx, (c) => { c.moveTo(-6, -18 + bob); c.lineTo(-24, 2); c.lineTo(-18, 4); c.lineTo(0, -14 + bob); c.closePath(); }, '#3a7ad8', '#24509e', {
      cel: [1.5, 0], lw: 2.2, lit: '#9ac4ff', litW: 1,
      tex: (c) => line(c, [[-4, -16 + bob], [-21, 3]], '#24509e', 0.8),
    });
    rs(ctx, (c) => { c.moveTo(-4, -16 + bob); c.lineTo(-16, 4); c.lineTo(-10, 4); c.lineTo(2, -14 + bob); c.closePath(); }, RED, REDS, {
      cel: [1.5, 0], lw: 2.2, lit: REDL, litW: 1,
      tex: (c) => line(c, [[-1, -15 + bob], [-13, 4]], REDS, 0.8),
    });
    [-2, 6].forEach((x) => {
      line(ctx, [[x, -10], [x, -2]], null, 5);
      line(ctx, [[x, -10], [x, -2]], '#8a8a92', 3);
      rs(ctx, (c) => c.ellipse(x + 2, -1.5, 4.5, 2, 0, 0, TAU), '#8a8a92', '#5e5e66', { cel: [0, 0.8], lw: 1.6 });
      line(ctx, [[x + 1, -2.4], [x + 3, -0.8]], '#5e5e66', 0.7);
    });
    // 身體：一片片的鱗狀羽毛
    rs(ctx, (c) => c.ellipse(2, -28 + bob, 13, 19, 0, 0, TAU), RED, REDS, {
      cel: 3, lit: REDL, litW: 1.8, bounce: '#ffd070', ba: 0.4, ao: [-18, -9],
      tex: (c) => {
        c.strokeStyle = A.c('#b82a28');
        c.lineWidth = 0.9;
        c.beginPath();
        for (let r = 0; r < 5; r++) {
          for (let i = 0; i < 4; i++) {
            const x = -6 + i * 5 + (r % 2) * 2.5;
            const y = -38 + r * 5 + bob;
            c.moveTo(x - 2.5, y);
            c.quadraticCurveTo(x, y + 3, x + 2.5, y);
          }
        }
        c.stroke();
      },
    });
    // 翅膀（指路時往前伸）：黃、綠、藍三層，羽毛一根根分開
    ctx.save();
    ctx.translate(0, -38 + bob);
    ctx.rotate(-point * 1.3);
    const wing = (c) => { c.moveTo(-4, -2); c.quadraticCurveTo(10, 0, 8, 12); c.quadraticCurveTo(2, 26, -12, 30); c.quadraticCurveTo(-12, 14, -4, -2); c.closePath(); };
    rs(ctx, wing, '#3a7ad8', '#24509e', {
      cel: [2, 2], lw: 2.2, lit: '#9ac4ff', litW: 1.2,
      tex: (c) => {
        c.fillStyle = A.c('#ffd23a');
        c.fillRect(-20, -6, 40, 9);
        c.fillStyle = A.c('#5ac05a');
        c.fillRect(-20, 3, 40, 5);
        c.strokeStyle = A.c('#e0a020');
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = 0; i < 4; i++) { c.moveTo(-4 + i * 3, 0); c.quadraticCurveTo(-3 + i * 3, 2, -5 + i * 3, 3); }
        c.stroke();
        c.strokeStyle = A.c('#24509e');
        c.beginPath();
        for (let i = 0; i < 4; i++) { c.moveTo(-6 + i * 3.5, 8); c.quadraticCurveTo(-6 + i * 2.5, 18, -11 + i * 1.6, 27); }
        c.stroke();
        c.save();
        c.fillStyle = A.c('#fff6c0');
        c.globalAlpha *= 0.5;
        c.beginPath();
        c.ellipse(-1, -1, 3, 1.2, -0.4, 0, TAU);
        c.fill();
        c.restore();
      },
    });
    ctx.restore();
    // 頭
    const hx = 8;
    const hy = -52 + bob;
    rs(ctx, (c) => { c.moveTo(hx - 6, hy - 8); c.lineTo(hx - 12, hy - 16); c.lineTo(hx - 2, hy - 10); c.closePath(); }, RED, REDS, { cel: [1, 0], lw: 1.8 });
    rs(ctx, (c) => { c.moveTo(hx - 3, hy - 9); c.lineTo(hx - 6, hy - 18); c.lineTo(hx + 1, hy - 10); c.closePath(); }, '#ff6a50', REDS, { cel: [1, 0], lw: 1.6 });
    rs(ctx, (c) => c.ellipse(hx, hy, 11, 11, 0, 0, TAU), RED, REDS, {
      cel: 2, lit: REDL, litW: 1.4, gloss: [hx - 4, hy - 5, 2.8, 1.6],
      tex: (c) => furTex(c, hx - 2, hy + 2, 16, 14, '#b82a28', 10, 2.4, 1.6, 121, 0.4),
    });
    A.ellipse(ctx, hx + 4, hy, 5.5, 5, '#fff4ec', null, { noStroke: true, hl: false });
    ctx.strokeStyle = A.c('#3a3030');
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + 1, hy + 1 + i * 1.6);
      ctx.lineTo(hx + 5, hy + 1.6 + i * 1.6);
      ctx.stroke();
    }
    // 喙：上象牙白、下黑，有亮面
    rs(ctx, (c) => { c.moveTo(hx + 7, hy + 4); c.quadraticCurveTo(hx + 12, hy + 12, hx + 17, hy + 6); c.quadraticCurveTo(hx + 13, hy + 5, hx + 9, hy + 2); c.closePath(); }, '#3a3030', '#1e1818', { cel: [0, 1], lw: 1.6 });
    rs(ctx, (c) => { c.moveTo(hx + 7, hy - 4); c.quadraticCurveTo(hx + 18, hy - 6, hx + 19, hy + 5); c.quadraticCurveTo(hx + 17, hy + 10, hx + 15, hy + 7); c.quadraticCurveTo(hx + 14, hy + 3, hx + 8, hy + 4); c.closePath(); }, '#f4ecd8', '#c4b494', { cel: [1.2, 1.5], lw: 2, lit: '#ffffff', litW: 0.9, gloss: [hx + 12, hy - 2.6, 2.6, 1, -0.2] });
    dot(ctx, hx + 11, hy - 1, 0.7, '#8a7a5a');
    eyeHQ(ctx, hx + 3, hy - 1.5, 2.3, 2.8, '#d8a020', { closed: blinkAt(t, 1, 1.5), look: 1, irisL: '#fff0a0' });
    blush2(ctx, hx + 1, hy + 4, 1.8);
    // 嚮導的綠領巾與小羅盤（玻璃罩、指針）
    rs(ctx, (c) => { c.moveTo(hx - 10, hy + 8); c.quadraticCurveTo(hx, hy + 14, hx + 8, hy + 9); c.lineTo(hx + 6, hy + 13); c.quadraticCurveTo(hx - 2, hy + 17, hx - 9, hy + 12); c.closePath(); }, '#2e8a6a', '#1e5e48', {
      cel: [0, 1.2], lw: 1.8, lit: '#7ad8b0', litW: 0.8,
      tex: (c) => stitch(c, [[hx - 9, hy + 11], [hx, hy + 14.5], [hx + 7, hy + 11]], '#9ae8c8', 0.6),
    });
    rs(ctx, (c) => c.ellipse(hx + 1, hy + 18, 4, 4, 0, 0, TAU), '#ffcf3a', '#c8901a', { cel: 0.8, lw: 1.6, lit: '#fff6c0', litW: 0.7 });
    A.ellipse(ctx, hx + 1, hy + 18, 2.6, 2.6, '#f4f8ff', null, { lw: 0.8, hl: false });
    const nd = Math.sin(t * 1.3) * 0.4;
    line(ctx, [[hx + 1 - Math.sin(nd) * 2, hy + 18 + Math.cos(nd) * 2], [hx + 1, hy + 18]], '#3a3030', 1);
    line(ctx, [[hx + 1, hy + 18], [hx + 1 + Math.sin(nd) * 2, hy + 18 - Math.cos(nd) * 2]], '#e8403a', 1.1);
    glint(ctx, hx - 0.2, hy + 16.8, 1.3, 0.8);
  }

  // 山羊採藥人：白色山羊，彎角和山羊鬍，背著裝滿藥草的竹簍
  function goat(ctx, t) {
    const bob = Math.sin(t * 1.8) * 0.8;
    const chew = Math.sin(t * 6) * (t % 4 < 1.5 ? 0.8 : 0);
    const fur = '#f4eee2';
    const furS = '#cfc2a8';
    const furL = '#ffffff';
    [[-14, '#ddd4c2', '#b8ac94'], [8, '#ddd4c2', '#b8ac94'], [-8, fur, furS], [14, fur, furS]].forEach(([x, col, cs]) => {
      rs(ctx, (c) => A.roundRect(c, x - 2.8, -20, 5.6, 18, 2.5), col, cs, { cel: [1.4, 0], lw: 2, lit: furL, litW: 0.8 });
      rs(ctx, (c) => A.roundRect(c, x - 3, -4, 6, 4, 1.5), '#5a4a3e', '#3a2e24', { cel: [0, 1], lw: 1.8, gloss: [x - 1.2, -3, 1.4, 0.6, 0] });
      line(ctx, [[x, -4], [x, 0]], '#2a2018', 0.7);
    });
    rs(ctx, (c) => { c.moveTo(-20, -30 + bob); c.lineTo(-26, -36 + bob); c.lineTo(-19, -34 + bob); c.closePath(); }, fur, furS, { cel: [0, 1], lw: 1.8 });
    // 毛茸茸的身體（捲捲的毛）
    const woolTex = (c, x, y, w, h, seed) => {
      c.strokeStyle = A.c('#d8ccb4');
      c.lineWidth = 0.9;
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const px = x + (hsh(i + seed) - 0.5) * w;
        const py = y + (hsh(i * 2.9 + seed) - 0.5) * h;
        c.moveTo(px + 1.8, py);
        c.arc(px, py, 1.8, 0, Math.PI * 1.3);
      }
      c.stroke();
    };
    rs(ctx, (c) => c.ellipse(-2, -27 + bob, 20, 12, 0, 0, TAU), fur, furS, {
      cel: 3, lit: furL, litW: 1.6, bounce: '#ffe0b0', ba: 0.4, ao: [-22 + bob, -15 + bob],
      tex: (c) => woolTex(c, -2, -26 + bob, 36, 18, 131),
    });
    // 藥草（在簍子後面）：有葉脈
    [[-14, -0.4, '#5ab04a', '#3a7e2e'], [-9, 0.1, '#79c04a', '#4f9a34'], [-4, 0.5, '#4f9a34', '#347024']].forEach(([x, r, cc, cs]) => {
      ctx.save();
      ctx.translate(x, -46 + bob);
      ctx.rotate(r + Math.sin(t * 2 + x) * 0.06);
      rs(ctx, (c) => { c.moveTo(0, 2); c.quadraticCurveTo(-5, -6, 0, -13); c.quadraticCurveTo(5, -6, 0, 2); c.closePath(); }, cc, cs, { cel: [1.2, 0], lw: 1.6, lit: '#c8f0a0', litW: 0.7 });
      line(ctx, [[0, 1], [0, -11]], cs, 0.8);
      line(ctx, [[0, -4], [-2, -6.5]], cs, 0.6);
      line(ctx, [[0, -7], [2, -9]], cs, 0.6);
      ctx.restore();
    });
    // 小花（五片花瓣）
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3;
      A.ellipse(ctx, -10 + Math.cos(a) * 2.3, -58 + bob + Math.sin(a) * 2.3, 1.8, 1.8, '#ff9fc4', '#e070a0', { lw: 1, hl: false, shadeAt: 0.1 });
    }
    dot(ctx, -10, -58 + bob, 1.3, '#ffe14a');
    // 竹簍
    const basket = (c) => { c.moveTo(-20, -46 + bob); c.lineTo(2, -46 + bob); c.lineTo(0, -32 + bob); c.quadraticCurveTo(-9, -29 + bob, -18, -32 + bob); c.closePath(); };
    rs(ctx, basket, '#d8a050', '#a06a28', {
      cel: 2, lw: 2.2, lit: '#ffd890', litW: 1,
      tex: (c) => {
        // 竹片交錯編織：橫條一段亮一段暗
        for (let i = 0; i < 4; i++) {
          for (let k = 0; k < 6; k++) {
            if ((i + k) % 2) continue;
            c.fillStyle = A.c('#b8803a');
            c.fillRect(-20 + k * 4, -45 + i * 3.6 + bob, 4, 3.6);
          }
        }
        c.strokeStyle = A.c('#8a5a20');
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = 0; i < 4; i++) { c.moveTo(-22, -41.4 + i * 3.6 + bob); c.lineTo(4, -41.4 + i * 3.6 + bob); }
        c.stroke();
      },
    });
    rs(ctx, (c) => A.roundRect(c, -21, -48 + bob, 24, 4, 2), '#c8903a', '#946020', { cel: [0, 1], lw: 1.8, lit: '#ffe0a0', litW: 0.7 });
    line(ctx, [[-2, -46 + bob], [6, -26 + bob]], null, 3.8);
    line(ctx, [[-2, -46 + bob], [6, -26 + bob]], '#8a5a34', 2.2);
    // 頭與脖子
    const hx = 18;
    const hy = -44 + bob;
    rs(ctx, (c) => { c.moveTo(8, -34 + bob); c.lineTo(hx - 3, hy - 2); c.lineTo(hx + 6, hy + 2); c.lineTo(16, -26 + bob); c.closePath(); }, fur, furS, { lw: 2.2, cel: [1.5, 0.5], lit: furL, litW: 1 });
    // 項圈與小鈴鐺
    line(ctx, [[hx - 5, hy + 3], [hx + 4, hy + 7]], null, 3.4);
    line(ctx, [[hx - 5, hy + 3], [hx + 4, hy + 7]], '#d94f4f', 2);
    const bsw = Math.sin(t * 2.5) * 0.25;
    ctx.save();
    ctx.translate(hx - 0.5, hy + 5.5);
    ctx.rotate(bsw);
    rs(ctx, (c) => { c.moveTo(-2.6, 4.6); c.quadraticCurveTo(-2.6, 0.4, 0, 0.4); c.quadraticCurveTo(2.6, 0.4, 2.6, 4.6); c.closePath(); }, '#ffcf3a', '#c8901a', { cel: [0.8, 0.5], lw: 1.4, lit: '#fff6c0', litW: 0.6 });
    dot(ctx, 0, 5, 0.9, '#6a4a10');
    ctx.restore();
    // 角：一圈圈的紋
    const horn = (p0, p1, p2, col, cs) => {
      curve(ctx, p0, p1, p2, col, 3.2);
      for (let i = 1; i < 4; i++) {
        const s = i / 4;
        const u = 1 - s;
        const x = u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0];
        const y = u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1];
        dot(ctx, x, y, 0.7, cs);
      }
    };
    horn([hx - 4, hy - 7], [hx - 8, hy - 20], [hx - 16, hy - 14], '#8a7a6a', '#5a4a3a');
    horn([hx + 1, hy - 8], [hx - 1, hy - 20], [hx - 8, hy - 18], '#b0a090', '#7a6a5a');
    rs(ctx, (c) => c.ellipse(hx - 8, hy - 2, 6.5, 2.8, 0.35, 0, TAU), fur, furS, { lw: 2, cel: [0, 1] });
    A.ellipse(ctx, hx - 8.5, hy - 1.6, 3.8, 1.2, '#ffc0d0', null, { noStroke: true, hl: false, rot: 0.35 });
    rs(ctx, (c) => { c.moveTo(hx - 7, hy - 4); c.quadraticCurveTo(hx - 4, hy - 12, hx + 4, hy - 9); c.quadraticCurveTo(hx + 14, hy - 4, hx + 14, hy + 4); c.quadraticCurveTo(hx + 12, hy + 9, hx + 5, hy + 8); c.quadraticCurveTo(hx - 6, hy + 6, hx - 7, hy - 4); c.closePath(); }, fur, furS, {
      cel: 2, lit: furL, litW: 1.4, bounce: '#ffe0b0', ba: 0.35, gloss: [hx - 1, hy - 5, 3, 1.6],
      tex: (c) => woolTex(c, hx - 2, hy - 6, 8, 5, 137),
    });
    rs(ctx, (c) => { c.moveTo(hx + 6, hy + 7); c.lineTo(hx + 7 + chew * 0.5, hy + 15); c.lineTo(hx + 10, hy + 7); c.closePath(); }, fur, furS, { lw: 1.8, cel: [0.8, 0], tex: (c) => line(c, [[hx + 7.6, hy + 8], [hx + 7.6 + chew * 0.4, hy + 13]], '#d8ccb4', 0.6) });
    nose(ctx, hx + 12.5, hy + 1.5, 1.3, 1.2, '#3a2418');
    line(ctx, [[hx + 9, hy + 5 + chew * 0.4], [hx + 13, hy + 4.5]], null, 1.6);
    eyeHQ(ctx, hx + 3, hy - 2, 2.3, 2.9, '#8a6a2a', { closed: blinkAt(t, 0.8, 0.3), look: 1, irisL: '#f0d080' });
    blush2(ctx, hx + 1, hy + 3, 2.4);
  }

  // 犰狳礦工：一節節的殼，黃色安全帽上的頭燈，扛著十字鎬
  function armadillo(ctx, t) {
    const bob = Math.sin(t * 2) * 0.8;
    const shell = '#b8a080';
    const shellS = '#88704e';
    const shellL = '#ecdcbc';
    const skin = '#e8c0aa';
    const skinS = '#c08a74';
    const skinL = '#fff0e4';
    // 十字鎬（在殼後面）：木柄、鐵頭的刃口亮線
    ctx.save();
    ctx.translate(-10, -36 + bob);
    ctx.rotate(-0.5);
    stick2(ctx, [[0, 10], [0, -18]], '#a87a4a', 2.8, '#e0b880');
    line(ctx, [[-1.8, 4], [1.8, 4]], '#6a4424', 1.4);
    line(ctx, [[-1.8, 6.5], [1.8, 6.5]], '#6a4424', 1.4);
    rs(ctx, (c) => { c.moveTo(-14, -14); c.quadraticCurveTo(0, -24, 14, -14); c.quadraticCurveTo(0, -19, -14, -14); c.closePath(); }, '#c4ccd4', '#7a8494', { cel: [0, -1.2], lw: 2, lit: '#ffffff', litW: 0.8 });
    rs(ctx, (c) => A.roundRect(c, -2.4, -20.5, 4.8, 5, 1), '#7a8494', '#4a5260', { cel: [0.8, 0], lw: 1.4 });
    glint(ctx, 10, -16.5, 1.8, 0.5 + Math.sin(t * 2.2) * 0.45);
    ctx.restore();
    [-14, 10].forEach((x) => rs(ctx, (c) => A.roundRect(c, x - 3.5, -12, 7, 12, 3), '#d8ae98', '#b08470', { cel: [1.2, 0], lw: 2 }));
    rs(ctx, (c) => { c.moveTo(-20, -14); c.quadraticCurveTo(-30, -10, -34, -2); c.quadraticCurveTo(-26, -6, -18, -8); c.closePath(); }, shell, shellS, {
      cel: [0, 1], lw: 2, lit: shellL, litW: 0.8,
      tex: (c) => { for (let i = 0; i < 3; i++) line(c, [[-22 - i * 3.5, -12 + i * 2.4], [-21 - i * 3.5, -7 + i * 1.6]], shellS, 0.8); },
    });
    // 殼：一節節的帶狀甲片，每片上有小鱗片、邊緣受光
    const shellPath = (c) => { c.moveTo(-24, -10); c.bezierCurveTo(-26, -40 + bob, 18, -44 + bob, 20, -10); c.quadraticCurveTo(-2, -6, -24, -10); c.closePath(); };
    rs(ctx, shellPath, shell, shellS, {
      cel: 3, lit: shellL, litW: 2, bounce: '#ffc890', ba: 0.4, gloss: [-8, -30 + bob, 5, 2.4], ao: [-18, -7],
      tex: (c) => {
        for (let i = 0; i < 5; i++) {
          const x = -14 + i * 7.5;
          // 每條帶子的亮面
          c.save();
          c.globalAlpha *= 0.35;
          c.strokeStyle = A.c(shellL);
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x - 1.2, -44 + bob);
          c.quadraticCurveTo(x + 3.8, -26, x + 1.8, -6);
          c.stroke();
          c.restore();
          c.strokeStyle = A.c('#6a5436');
          c.lineWidth = 1.8;
          c.beginPath();
          c.moveTo(x - 3, -44 + bob);
          c.quadraticCurveTo(x + 2, -26, x, -6);
          c.stroke();
        }
        // 小鱗片
        c.strokeStyle = A.c('#9a8260');
        c.lineWidth = 0.7;
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          for (let k = 0; k < 3; k++) {
            const x = -10.5 + i * 7.5;
            const y = -33 + k * 7 + bob * 0.5;
            c.moveTo(x - 2.4, y);
            c.lineTo(x, y + 2);
            c.lineTo(x + 2.4, y);
          }
        }
        c.stroke();
        for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) dot(c, -10 + i * 7.5, -30 + k * 10 + bob * 0.5, 1.1, '#e0ccaa');
        // 礦坑的灰塵
        speckle(c, -2, -14, 40, 8, '#8a7a66', 12, 0.6, 141, 0.5);
      },
    });
    [-4, 16].forEach((x) => rs(ctx, (c) => A.roundRect(c, x - 3.5, -12, 7, 12, 3), skin, skinS, { cel: [1.2, 0], lw: 2, lit: skinL, litW: 0.8 }));
    [-4, 16].forEach((x) => [-1.6, 1.6].forEach((d) => line(ctx, [[x + d, -1.6], [x + d, 0]], '#8a5a4a', 0.8)));
    // 頭
    const hx = 22;
    const hy = -24 + bob;
    rs(ctx, (c) => c.ellipse(hx - 7, hy - 10, 3.5, 7, -0.3, 0, TAU), skin, skinS, { lw: 2, cel: 1 });
    rs(ctx, (c) => { c.moveTo(hx - 9, hy - 4); c.quadraticCurveTo(hx - 6, hy - 10, hx + 2, hy - 8); c.quadraticCurveTo(hx + 10, hy - 4, hx + 16, hy + 3); c.quadraticCurveTo(hx + 16, hy + 7, hx + 12, hy + 7); c.quadraticCurveTo(hx - 2, hy + 10, hx - 9, hy + 4); c.closePath(); }, skin, skinS, {
      cel: 2, lit: skinL, litW: 1.3, bounce: '#ffd8a0', ba: 0.35, gloss: [hx - 2, hy - 5, 2.6, 1.2],
      tex: (c) => {
        // 頭頂小小的甲片
        c.strokeStyle = A.c('#c89a84');
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = 0; i < 3; i++) { c.moveTo(hx - 5 + i * 3, hy - 7 + i * 0.8); c.lineTo(hx - 4 + i * 3, hy - 4.5 + i * 0.8); }
        c.stroke();
        // 鼻子上沾的灰
        speckle(c, hx + 10, hy + 4, 6, 4, '#8a7a66', 5, 0.5, 143, 0.6);
      },
    });
    nose(ctx, hx + 15, hy + 4, 1.9, 1.7, '#5a3a2a');
    smile(ctx, hx + 11, hy + 6, 1.8);
    rs(ctx, (c) => c.ellipse(hx + 1, hy - 7, 3.5, 7, 0.25, 0, TAU), skin, skinS, { lw: 2, cel: [1, 0], lit: skinL, litW: 0.7 });
    A.ellipse(ctx, hx + 1, hy - 7, 1.6, 4.5, '#ffb3c8', null, { rot: 0.25, noStroke: true, hl: false });
    eyeHQ(ctx, hx + 5, hy - 1, 2.1, 2.6, '#5a3a2a', { closed: blinkAt(t, 0.9, 0.7), look: 1, irisL: '#c8906a' });
    blush2(ctx, hx + 3, hy + 4, 2.2);
    // 安全帽與頭燈：亮面塑膠、帽頂稜線、玻璃燈罩
    const flick = 0.8 + Math.sin(t * 5) * 0.12;
    ctx.save();
    ctx.globalAlpha *= 0.35 * flick;
    const g = ctx.createLinearGradient(hx + 6, 0, hx + 40, 0);
    g.addColorStop(0, 'rgba(255,240,160,1)');
    g.addColorStop(1, 'rgba(255,240,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy - 18);
    ctx.lineTo(hx + 40, hy - 26);
    ctx.lineTo(hx + 40, hy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    rs(ctx, (c) => { c.moveTo(hx - 10, hy - 11); c.quadraticCurveTo(hx - 8, hy - 24, hx + 1, hy - 24); c.quadraticCurveTo(hx + 10, hy - 23, hx + 9, hy - 12); c.closePath(); }, '#ffcf3a', '#c8900a', {
      cel: [1.5, 1.5], lw: 2.2, lit: '#fff6c0', litW: 1.1, gloss: [hx - 4, hy - 20, 3, 1.4],
      tex: (c) => {
        c.strokeStyle = A.c('#d8a010');
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(hx - 3, hy - 23.5);
        c.quadraticCurveTo(hx - 2, hy - 17, hx - 1.5, hy - 11);
        c.stroke();
        speckle(c, hx, hy - 16, 16, 8, '#a87a10', 5, 0.6, 147, 0.4);
      },
    });
    rs(ctx, (c) => c.ellipse(hx, hy - 11, 12, 2.6, 0, 0, TAU), '#ffcf3a', '#c8900a', { cel: [0, 1.2], lw: 2, lit: '#fff6c0', litW: 0.7 });
    glow(ctx, hx + 8, hy - 18, 9, '255,240,160', 0.5 * flick);
    rs(ctx, (c) => c.ellipse(hx + 8, hy - 18, 3.4, 3.4, 0, 0, TAU), '#8a94a0', '#5a6270', { cel: 0.6, lw: 1.8 });
    A.ellipse(ctx, hx + 8.3, hy - 18, 2.3, 2.3, '#fff6c0', null, { noStroke: true, hl: false });
    dot(ctx, hx + 7.4, hy - 18.9, 0.8, '#ffffff');
  }

  // ════════ 對手：灰鬃 ════════
  // 跟主角差不多大的灰色小獅子，鬃毛亂翹，缺了一角的耳朵，臉頰一道疤，琥珀色的眼睛總是警戒地瞇著
  const GM = {
    body: '#b4b0aa',
    shade: '#8e8a86',
    mane: '#58545c',
    maneS: '#3c3940',
    cream: '#e0dbd2',
    far: '#9c9892',
    farS: '#7e7a76',
    ear: '#d4a49c',
    nose: '#3a2e2e',
  };
  function jag(i, k) {
    return Math.sin(i * 12.9898 + k * 78.233) * 0.5 + 0.5;
  }
  function gmLeg(ctx, x, fill, shade, wrap) {
    rs(ctx, (c) => A.roundRect(c, x - 5, -15, 10, 15, 5), fill, shade, {
      cel: [1.8, 0], lw: 2.5, lit: '#e4e0da', litW: 1,
      tex: (c) => furTex(c, x, -9, 8, 10, '#6e6a66', 5, 2.4, 1.7, x * 3, 0.45),
    });
    [-2, 1.2].forEach((d) => line(ctx, [[x + d, -2.6], [x + d, 0]], '#5a5654', 0.9));
    if (wrap) {
      // 綁在前腳的舊繃帶（邊緣磨得毛毛的）
      rs(ctx, (c) => { c.moveTo(x - 5.4, -11); c.lineTo(x + 5.4, -12.4); c.lineTo(x + 5.4, -7.6); c.lineTo(x - 5.4, -6.4); c.closePath(); }, '#efe6d2', '#c8b898', {
        cel: [1.2, 0], lw: 1.6,
        tex: (c) => { line(c, [[x - 5, -8.8], [x + 5, -10]], '#c8b898', 0.7); dot(c, x + 2, -9.8, 0.9, '#c8906a'); },
      });
      line(ctx, [[x + 5.2, -10], [x + 8, -8.6]], '#efe6d2', 1.4);
    }
  }
  function amberEye(ctx, x, y, rx, ry, closed) {
    if (closed) return A.eye(ctx, x, y, rx, ry, 'closed');
    ctx.fillStyle = A.c('#2b1a12');
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.86, ry * 0.88, 0, 0, TAU);
    ctx.clip();
    const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
    g.addColorStop(0, A.c('#8a4a08'));
    g.addColorStop(0.5, A.c('#f0a020'));
    g.addColorStop(1, A.c('#ffe07a'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + 0.6, y + 0.3, rx * 0.74, ry * 0.78, 0, 0, TAU);
    ctx.fill();
    // 虹膜的放射細紋
    ctx.strokeStyle = A.c('#b86a10');
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.moveTo(x + 0.9 + Math.cos(a) * rx * 0.36, y + 0.3 + Math.sin(a) * ry * 0.5);
      ctx.lineTo(x + 0.9 + Math.cos(a) * rx * 0.7, y + 0.3 + Math.sin(a) * ry * 0.74);
    }
    ctx.stroke();
    ctx.restore();
    // 貓科的直瞳孔
    ctx.fillStyle = A.c('#2b1a12');
    ctx.beginPath();
    ctx.ellipse(x + 0.9, y + 0.3, rx * 0.28, ry * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - rx * 0.25, y + ry * 0.05, rx * 0.26, 0, TAU);
    ctx.fill();
    ctx.globalAlpha *= 0.8;
    ctx.beginPath();
    ctx.arc(x + rx * 0.45, y + ry * 0.5, rx * 0.13, 0, TAU);
    ctx.fill();
    ctx.globalAlpha /= 0.8;
    // 半垂的上眼皮：警戒地瞇著（眼皮下緣有一點陰影）
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx + 0.5, ry + 0.5, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = A.c('#6a5e58');
    ctx.globalAlpha *= 0.45;
    ctx.beginPath();
    ctx.moveTo(x - rx - 1, y - ry * 0.45 + 1.4);
    ctx.lineTo(x + rx + 1, y - ry * 0.2 + 1.4);
    ctx.lineTo(x + rx + 1, y - ry - 1);
    ctx.lineTo(x - rx - 1, y - ry - 1);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha /= 0.45;
    ctx.fillStyle = A.c(GM.body);
    ctx.beginPath();
    ctx.moveTo(x - rx - 1, y - ry - 1);
    ctx.lineTo(x + rx + 1, y - ry - 1);
    ctx.lineTo(x + rx + 1, y - ry * 0.2);
    ctx.lineTo(x - rx - 1, y - ry * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    line(ctx, [[x - rx - 0.5, y - ry * 0.45], [x + rx + 0.5, y - ry * 0.2]], null, 2.4);
  }
  function greymane(ctx, t) {
    const bob = Math.sin(t * 3) * 1.2;
    const closed = t % 3.3 > 3.17;
    const earTwitch = t % 4.1 < 0.2 ? -2.5 : 0;
    gmLeg(ctx, -11, GM.far, GM.farS);
    gmLeg(ctx, 9, GM.far, GM.farS);
    // 尾巴：甩來甩去
    const sw = Math.sin(t * 2.6) * 6;
    const tb = -22 + bob;
    const tipX = -34 + sw * 0.5;
    const tipY = -36 + bob - Math.abs(sw) * 0.4;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, tb);
    ctx.quadraticCurveTo(-32 + sw * 0.3, tb - 2, tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = A.c(GM.body);
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.save();
    ctx.translate(-0.7, -0.7);
    ctx.globalAlpha *= 0.6;
    ctx.strokeStyle = A.c('#e4e0da');
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(tipX - 1, tipY - 3);
    ctx.rotate(0.2 + sw * 0.05);
    rs(ctx, (c) => { c.moveTo(-5, 5); c.lineTo(-10, -1); c.lineTo(-5, -3); c.lineTo(-5, -11); c.lineTo(0, -6); c.lineTo(5, -12); c.lineTo(5, -4); c.lineTo(10, 0); c.lineTo(5, 5); c.quadraticCurveTo(0, 8, -5, 5); c.closePath(); }, GM.mane, GM.maneS, {
      cel: 2, lw: 2.4, lit: '#8a8690', litW: 1,
      tex: (c) => { line(c, [[0, 4], [0, -4]], GM.maneS, 0.8); line(c, [[-3, 3], [-4, -5]], GM.maneS, 0.8); line(c, [[3, 3], [4, -6]], GM.maneS, 0.8); },
    });
    ctx.restore();
    // 身體：短毛的質感、背上受光、下方地面反光
    rs(ctx, (c) => c.ellipse(-1, -20 + bob, 21, 14, 0, 0, TAU), GM.body, GM.shade, {
      cel: 3, lit: '#e8e4de', litW: 1.8, bounce: '#d8c0a8', ba: 0.35, ao: [-14 + bob, -6 + bob],
      tex: (c) => {
        furTex(c, -2, -20 + bob, 38, 24, '#7a7672', 18, 3, 1.9, 151, 0.3);
        // 身上的舊傷痕
        line(c, [[-12, -26 + bob], [-7, -22 + bob]], '#8a6a68', 1);
      },
    });
    rs(ctx, (c) => c.ellipse(6, -15 + bob, 10, 7, 0, 0, TAU), GM.cream, '#c4bcb0', { cel: [1.5, 1.5], noStroke: true, tex: (c) => furTex(c, 6, -15 + bob, 16, 10, '#b0a89a', 8, 2.2, 1.7, 153, 0.5) });
    [[-14, -32], [-6, -34]].forEach(([x, y]) => rs(ctx, (c) => { c.moveTo(x - 3, y + 3 + bob); c.lineTo(x - 1, y - 3 + bob); c.lineTo(x + 3, y + 3 + bob); c.closePath(); }, GM.body, GM.shade, { lw: 2, cel: [1, 0] }));
    gmLeg(ctx, -7, GM.body, GM.shade);
    gmLeg(ctx, 13, GM.body, GM.shade, true);
    const hx = 9;
    const hy = -45 + bob;
    // 刺刺的深灰鬃毛（每根長短不一；內側一層亮一點的毛束、左上受光）
    const mx = hx - 4;
    const my = hy - 1;
    const manePath = (c, s, off) => {
      const n = 15;
      for (let i = 0; i <= n * 2; i++) {
        const k = Math.floor(i / 2) % n;
        const a = 0.2 + off + (i / (n * 2)) * TAU + (i % 2 ? 0 : (jag(k, 2) - 0.5) * 0.18);
        const r = (i % 2 ? 20 : 25 + jag(k, 1) * 5) * s;
        i ? c.lineTo(mx + Math.cos(a) * r, my + Math.sin(a) * r) : c.moveTo(mx + Math.cos(a) * r, my + Math.sin(a) * r);
      }
      c.closePath();
    };
    rs(ctx, (c) => manePath(c, 1, 0), GM.mane, GM.maneS, {
      cel: 4, lit: '#8e8a96', litW: 2,
      tex: (c) => {
        // 內圈的毛束
        c.fillStyle = A.c('#6a6670');
        c.beginPath();
        manePath(c, 0.8, 0.2);
        c.fill();
        // 毛束的分線
        c.strokeStyle = A.c(GM.maneS);
        c.lineWidth = 1;
        c.beginPath();
        for (let i = 0; i < 15; i++) {
          const a = 0.2 + (i / 15) * TAU;
          c.moveTo(mx + Math.cos(a) * 14, my + Math.sin(a) * 14);
          c.lineTo(mx + Math.cos(a) * (22 + jag(i, 1) * 4), my + Math.sin(a) * (22 + jag(i, 1) * 4));
        }
        c.stroke();
      },
    });
    // 耳朵：遠側完整，近側缺一角
    rs(ctx, (c) => c.ellipse(hx - 10, hy - 20 + earTwitch, 6.5, 6.5, 0, 0, TAU), GM.far, GM.farS, { lw: 2.5, cel: 1.2 });
    A.ellipse(ctx, hx - 10, hy - 20 + earTwitch, 3, 3, GM.ear, null, { noStroke: true, hl: false });
    const ex = hx + 8;
    const ey = hy - 21;
    const torn = (c) => {
      c.moveTo(ex + Math.cos(-0.25 * Math.PI) * 6.5, ey + Math.sin(-0.25 * Math.PI) * 6.5);
      c.arc(ex, ey, 6.5, -0.25 * Math.PI, -0.62 * Math.PI + TAU);
      c.lineTo(ex, ey - 2);
      c.lineTo(ex + 2, ey - 6.5);
      c.closePath();
    };
    rs(ctx, torn, GM.body, GM.shade, { lw: 2.5, cel: 1.2, lit: '#e8e4de', litW: 1 });
    rs(ctx, (c) => c.ellipse(ex - 0.5, ey + 1, 2.6, 2.6, 0, 0, TAU), GM.ear, '#b08078', { cel: [0, -0.8], noStroke: true });
    // 頭
    rs(ctx, (c) => c.ellipse(hx, hy, 19, 17.5, 0, 0, TAU), GM.body, GM.shade, {
      cel: [3, 3.5], lit: '#e8e4de', litW: 2, bounce: '#d8c0a8', ba: 0.3, gloss: [hx - 9, hy - 9, 3.6, 2],
      tex: (c) => furTex(c, hx - 5, hy + 1, 26, 24, '#7a7672', 11, 2.8, 1.7, 157, 0.25),
    });
    // 額前亂翹的瀏海
    rs(ctx, (c) => { c.moveTo(hx - 10, hy - 14); c.lineTo(hx - 8, hy - 25); c.lineTo(hx - 3, hy - 17); c.lineTo(hx + 1, hy - 28); c.lineTo(hx + 4, hy - 17); c.lineTo(hx + 10, hy - 22); c.lineTo(hx + 8, hy - 13); c.quadraticCurveTo(hx, hy - 10, hx - 10, hy - 14); c.closePath(); }, GM.mane, GM.maneS, {
      cel: [1.5, 1.5], lw: 2.2, lit: '#8e8a96', litW: 1,
      tex: (c) => { line(c, [[hx - 6, hy - 14], [hx - 7.5, hy - 21]], GM.maneS, 0.8); line(c, [[hx + 1, hy - 13], [hx + 1, hy - 23]], GM.maneS, 0.8); line(c, [[hx + 6, hy - 13.5], [hx + 8, hy - 19]], GM.maneS, 0.8); },
    });
    // 臉頰的疤（有縫合痕的舊傷，外側帶一點粉色）
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.c('#d8a0a0');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx - 9, hy - 1);
    ctx.lineTo(hx - 3, hy + 7);
    ctx.stroke();
    ctx.strokeStyle = A.c('#8a5a58');
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(hx - 9, hy - 1);
    ctx.lineTo(hx - 3, hy + 7);
    ctx.moveTo(hx - 8, hy + 3.5);
    ctx.lineTo(hx - 5, hy + 1.5);
    ctx.moveTo(hx - 6.5, hy + 6);
    ctx.lineTo(hx - 3.5, hy + 4);
    ctx.stroke();
    // 嘴邊
    rs(ctx, (c) => c.ellipse(hx + 11, hy + 7, 9, 6.5, 0, 0, TAU), GM.cream, '#c4bcb0', { cel: [1.2, 1.6], lw: 2, lit: '#ffffff', litW: 0.8 });
    [[hx + 9, hy + 6], [hx + 11, hy + 7.6], [hx + 8, hy + 8.4], [hx + 20, hy + 6.5]].forEach(([x, y]) => dot(ctx, x, y, 0.55, '#8a827a'));
    ctx.fillStyle = A.c(GM.nose);
    ctx.beginPath();
    ctx.moveTo(hx + 12.8, hy + 1.6);
    ctx.quadraticCurveTo(hx + 16, hy + 0.2, hx + 19.2, hy + 1.6);
    ctx.quadraticCurveTo(hx + 17.6, hy + 5, hx + 16, hy + 5);
    ctx.quadraticCurveTo(hx + 14.4, hy + 5, hx + 12.8, hy + 1.6);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(hx + 14.8, hy + 1.9, 1.2, 0.6, -0.2, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 不服氣地撇著嘴，露出一顆小尖牙
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + 16, hy + 5);
    ctx.lineTo(hx + 16, hy + 7.5);
    ctx.moveTo(hx + 11.5, hy + 9.5);
    ctx.quadraticCurveTo(hx + 15, hy + 7.2, hx + 19.5, hy + 8.4);
    ctx.stroke();
    A.shape(ctx, (c) => { c.moveTo(hx + 17, hy + 8.2); c.lineTo(hx + 18, hy + 11); c.lineTo(hx + 19, hy + 8.4); c.closePath(); }, '#ffffff', '#d8d4cc', { lw: 1.2, hl: false, shadeY: hy + 9.8 });
    // 眼睛與倒八字眉
    amberEye(ctx, hx + 2, hy - 3, 3.9, 5.2, closed);
    amberEye(ctx, hx + 12, hy - 4, 3.6, 5, closed);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy - 12);
    ctx.lineTo(hx + 5, hy - 9);
    ctx.moveTo(hx + 9.5, hy - 9.5);
    ctx.lineTo(hx + 16, hy - 12.5);
    ctx.stroke();
    // 灰撲撲的小髒污
    ctx.fillStyle = A.c('rgba(90,80,80,0.25)');
    ctx.beginPath();
    ctx.ellipse(hx + 3, hy + 9, 3, 1.6, 0.3, 0, TAU);
    ctx.moveTo(hx - 10, hy + 5);
    ctx.ellipse(hx - 12, hy + 5, 2, 1.2, -0.3, 0, TAU);
    ctx.fill();
  }

  Object.assign(A.NPC_DRAW, {
    otter, seal, gullmerchant, pufferkid, starfish, octopus, pelican,
    capybara, oldmonkey, meerkat, redpanda, parrot, goat, armadillo,
    greymane,
  });


  // ════════ 圖示 ════════
  // 跟 items.js 一樣：以 (0,0) 為中心，大約 ±14 的範圍，放大 1.3 倍畫在深色格子上
  function bumpRing(c, x, y, r, n, bulge) {
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (!i) c.moveTo(px, py);
      else {
        const am = ((i - 0.5) / n) * TAU;
        c.quadraticCurveTo(x + Math.cos(am) * (r + bulge), y + Math.sin(am) * (r + bulge), px, py);
      }
    }
    c.closePath();
  }
  // 小獅子頭（技能圖示用）
  function lionHead(ctx, x, y, s, fill, shade, mane, maneS) {
    A.shape(ctx, (c) => bumpRing(c, x, y, 8 * s, 10, 3.5 * s), mane || '#d9722a', maneS || '#b95a1e', { cel: [1.5, 1.5], lw: 2 });
    A.ellipse(ctx, x, y, 6.5 * s, 6 * s, fill || '#f7b547', shade || '#e0913a', { lw: 2, hl: false });
  }
  // 羽刃：跟 featherThrow 同一個形狀
  function blade(ctx, x, y, len, w, fill, shade, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => { c.moveTo(len, 0); c.quadraticCurveTo(0, -w, -len, -w * 0.15); c.quadraticCurveTo(0, w * 0.85, len, 0); c.closePath(); }, fill, shade, { lw: 2, hl: false });
    ctx.restore();
  }
  function boltPath(c, x, y, s) {
    c.moveTo(x + 2 * s, y - 12 * s);
    c.lineTo(x - 6 * s, y + 1 * s);
    c.lineTo(x - 0.5 * s, y + 1 * s);
    c.lineTo(x - 3 * s, y + 12 * s);
    c.lineTo(x + 6 * s, y - 2 * s);
    c.lineTo(x + 0.5 * s, y - 2 * s);
    c.closePath();
  }
  function speedLines(ctx, pts, col, w) {
    ctx.strokeStyle = A.c(col || '#ffffff');
    ctx.lineWidth = w || 2.5;
    ctx.lineCap = 'round';
    pts.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  }
  function sparkle(ctx, x, y, r, col) {
    A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.35, 4, 0), col || '#ffffff', null, { noStroke: true, hl: false });
  }
  function heartPath(c, x, y, s) {
    c.moveTo(x, y + 11 * s);
    c.bezierCurveTo(x - 14 * s, y + 1 * s, x - 11 * s, y - 11 * s, x, y - 5 * s);
    c.bezierCurveTo(x + 11 * s, y - 11 * s, x + 14 * s, y + 1 * s, x, y + 11 * s);
    c.closePath();
  }
  function eyePath(c, x, y, w, h) {
    c.moveTo(x - w, y);
    c.quadraticCurveTo(x, y - h * 2, x + w, y);
    c.quadraticCurveTo(x, y + h * 2, x - w, y);
    c.closePath();
  }

  const ICON2 = {
    // ─── 力量系 ───
    chargeSlam(ctx) {
      speedLines(ctx, [[-16, -7, -9, -7], [-18, 0, -8, 0], [-16, 7, -9, 7]]);
      A.shape(ctx, (c) => starPath(c, 10, 0, 9, 4, 7, 0.2), '#ffe066', '#ffb62e', { lw: 2, hl: false });
      lionHead(ctx, 0, 0, 1);
      A.eye(ctx, 2, -1.5, 1.4, 1.8, 'angry', 1);
      dot(ctx, 5.5, 1.5, 1.4, '#5a2f22');
    },
    lionRoar(ctx) {
      ctx.strokeStyle = A.c('#ffe9a8');
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      [11, 15].forEach((r) => {
        ctx.beginPath();
        ctx.arc(0, 1, r, -0.55, 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 1, r, Math.PI - 0.55, Math.PI + 0.55);
        ctx.stroke();
      });
      A.shape(ctx, (c) => bumpRing(c, 0, 0, 9, 12, 3.5), '#d9722a', '#b95a1e', { cel: [1.5, 1.5], lw: 2 });
      A.ellipse(ctx, 0, 0, 7.5, 7, '#f7b547', '#e0913a', { lw: 2, hl: false });
      A.eye(ctx, -3, -2.5, 1.3, 1.6, 'normal');
      A.eye(ctx, 3, -2.5, 1.3, 1.6, 'normal');
      line(ctx, [[-5, -6], [-1.5, -4.5]], null, 1.8);
      line(ctx, [[5, -6], [1.5, -4.5]], null, 1.8);
      A.shape(ctx, (c) => c.ellipse(0, 3, 3.6, 3.4, 0, 0, TAU), '#7a2323', null, { lw: 1.6, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-2.6, 0.8); c.lineTo(-1.6, 3); c.lineTo(-0.8, 0.4); c.closePath(); c.moveTo(2.6, 0.8); c.lineTo(1.6, 3); c.lineTo(0.8, 0.4); c.closePath(); }, '#ffffff', null, { noStroke: true, hl: false });
    },
    steelMane(ctx) {
      [-2.5, -1.9, -1.25, -0.6, 0].forEach((a) => {
        const tx = Math.cos(a - 0.1) * 15;
        const ty = Math.sin(a - 0.1) * 15 - 1;
        const bx = Math.cos(a) * 4;
        const by = Math.sin(a) * 4 + 2;
        const nx = -Math.sin(a) * 4;
        const ny = Math.cos(a) * 4;
        A.shape(ctx, (c) => { c.moveTo(bx - nx, by - ny); c.quadraticCurveTo((bx + tx) / 2 - nx * 1.2, (by + ty) / 2 - ny * 1.2, tx, ty); c.quadraticCurveTo((bx + tx) / 2 + nx, (by + ty) / 2 + ny, bx + nx, by + ny); c.closePath(); }, '#c8d4e4', '#8a98b0', { cel: [1.2, 1.2], lw: 2, hl: false });
        line(ctx, [[bx + (tx - bx) * 0.3, by + (ty - by) * 0.3], [bx + (tx - bx) * 0.7, by + (ty - by) * 0.7]], 'rgba(255,255,255,0.9)', 1.3);
      });
      A.ellipse(ctx, 0, 5, 7, 6.5, '#f7b547', '#e0913a', { lw: 2, hl: false });
      A.eye(ctx, 2, 4, 1.3, 1.7, 'angry', 1);
      sparkle(ctx, 11, -10, 3.5);
    },
    quakeStrike(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-15, 7); c.lineTo(15, 7); c.lineTo(13, 14); c.lineTo(-13, 14); c.closePath(); }, '#9a7b5a', '#6e5236', { shadeY: 11, lw: 2 });
      line(ctx, [[0, 7], [-3, 10], [1, 12], [-1, 14]], null, 1.8);
      line(ctx, [[-8, 7], [-11, 11]], null, 1.6);
      line(ctx, [[8, 7], [10, 10], [9, 13]], null, 1.6);
      [[-13, 1, 2.5], [13, 0, 2.2], [-10, -5, 1.6], [11, -6, 1.5]].forEach(([x, y, r]) => A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.7, 3, 0.3), '#c8aa80', null, { lw: 1.4, hl: false }));
      // 肉球朝下拍在地上
      A.ellipse(ctx, 0, -3, 9.5, 9, '#f7b547', '#e0913a', { cel: [1.5, 1.5], lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-5, 3); c.quadraticCurveTo(-5, -3, 0, -3); c.quadraticCurveTo(5, -3, 5, 3); c.quadraticCurveTo(0, 5, -5, 3); c.closePath(); }, '#ff9fb0', null, { lw: 1.4, hl: false });
      [[-5.5, -7], [0, -9.5], [5.5, -7]].forEach(([x, y]) => A.ellipse(ctx, x, y, 2.2, 2.5, '#ff9fb0', null, { lw: 1.3, hl: false }));
      speedLines(ctx, [[-7, -17, -6, -14], [7, -17, 6, -14]], '#ffffff', 2);
    },
    kingAura(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      g.addColorStop(0, 'rgba(255,230,120,0.8)');
      g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => starPath(c, 0, 1, 16, 9, 8, -Math.PI / 2), 'rgba(255,236,150,0.55)', null, { noStroke: true, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-11, 8); c.lineTo(-12, -5); c.lineTo(-6, 0); c.lineTo(0, -9); c.lineTo(6, 0); c.lineTo(12, -5); c.lineTo(11, 8); c.closePath(); }, '#ffcf3a', '#e0a020', { cel: [1.5, 1.5], lw: 2 });
      A.shape(ctx, (c) => A.roundRect(c, -11, 5, 22, 5, 2), '#e0a020', null, { lw: 1.8, hl: false });
      A.ellipse(ctx, 0, 1.5, 2.4, 2.4, '#e8433a', null, { lw: 1.4, hl: false });
      [-12, 0, 12].forEach((x, i) => A.ellipse(ctx, x, i === 1 ? -9 : -5, 1.8, 1.8, '#fff6c0', null, { lw: 1.2, hl: false }));
    },
    unyielding(ctx) {
      const g = ctx.createRadialGradient(0, 2, 2, 0, 2, 16);
      g.addColorStop(0, 'rgba(255,150,90,0.6)');
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 2, 16, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-6, -4); c.quadraticCurveTo(-8, -12, -3, -16); c.quadraticCurveTo(-2, -10, 0, -9); c.quadraticCurveTo(1, -14, 5, -17); c.quadraticCurveTo(8, -10, 6, -4); c.closePath(); }, '#ffb84a', '#f28c38', { lw: 1.8, hl: false });
      A.shape(ctx, (c) => heartPath(c, 0, 1, 1), '#e8433a', '#b8302a', { cel: [2, 2], lw: 2, hl: [-5, -3, 2.5, 1.8] });
      A.shape(ctx, (c) => A.roundRect(c, -10, 1, 20, 4, 1.5), '#b8c6d8', '#7e8ca2', { shadeY: 3.5, lw: 1.6, hl: false });
      [-6, 0, 6].forEach((x) => dot(ctx, x, 3, 0.9, '#5a6478'));
    },
    mountainQuake(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-15, 8); c.lineTo(-4, -12); c.lineTo(1, -4); c.lineTo(5, -9); c.lineTo(15, 8); c.closePath(); }, '#9a8a7a', '#6e5e50', { cel: [2, 1], lw: 2 });
      A.shape(ctx, (c) => { c.moveTo(-7.5, -6); c.lineTo(-4, -12); c.lineTo(-0.5, -6); c.lineTo(-2.5, -4.5); c.lineTo(-4.5, -6.5); c.closePath(); }, '#ffffff', null, { lw: 1.6, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-16, 8); c.lineTo(16, 8); c.lineTo(14, 14); c.lineTo(-14, 14); c.closePath(); }, '#6e5236', null, { lw: 2, hl: false });
      ctx.save();
      ctx.lineJoin = 'round';
      line(ctx, [[-9, 14], [-5, 8], [-1, 11], [3, 6], [7, 10]], '#ff9a3a', 2.6);
      line(ctx, [[-9, 14], [-5, 8], [-1, 11], [3, 6], [7, 10]], '#fff0a0', 1);
      ctx.restore();
      speedLines(ctx, [[-17, -4, -17, 2], [-14, -9, -14, -5], [17, -2, 17, 4], [14, -7, 14, -3]], '#ffe9a8', 2);
    },
    lionSoul(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      g.addColorStop(0, 'rgba(255,220,120,0.8)');
      g.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-10, 10); c.quadraticCurveTo(-16, 0, -10, -8); c.quadraticCurveTo(-8, -3, -6, -4); c.quadraticCurveTo(-7, -12, 0, -17); c.quadraticCurveTo(0, -9, 4, -8); c.quadraticCurveTo(6, -13, 11, -13); c.quadraticCurveTo(8, -6, 12, -2); c.quadraticCurveTo(16, 6, 10, 10); c.quadraticCurveTo(0, 15, -10, 10); c.closePath(); }, '#ffb84a', '#f28c38', { cel: [2, 2], lw: 2, hl: false });
      A.ellipse(ctx, 0, 3, 7, 6.5, '#fff4c8', '#ffe28a', { lw: 2, hl: false });
      A.eye(ctx, -2.5, 2, 1.3, 1.7, 'normal');
      A.eye(ctx, 2.5, 2, 1.3, 1.7, 'normal');
      dot(ctx, 0, 5.5, 1.3, '#5a2f22');
      A.shape(ctx, (c) => A.mapleLeafPath(c, 0, -4, 3.5), '#e8452b', null, { lw: 1.2, hl: false });
    },
    hundredBattles(ctx) {
      // 月桂葉環 + 勳章
      [-1, 1].forEach((s) => {
        for (let i = 0; i < 4; i++) {
          const a = Math.PI / 2 + s * (0.45 + i * 0.5);
          const x = Math.cos(a) * 11;
          const y = Math.sin(a) * 11 + 1;
          A.ellipse(ctx, x, y, 4, 2, '#6fbf4a', '#4f9a34', { rot: a + (s > 0 ? -1.2 : 1.2), lw: 1.4, hl: false });
        }
      });
      A.shape(ctx, (c) => { c.moveTo(-4, -2); c.lineTo(-6, -14); c.lineTo(-1, -11); c.lineTo(0, -2); c.closePath(); c.moveTo(4, -2); c.lineTo(6, -14); c.lineTo(1, -11); c.lineTo(0, -2); c.closePath(); }, '#e8433a', '#b8302a', { lw: 1.6, hl: false });
      A.ellipse(ctx, 0, 2, 7.5, 7.5, '#ffcf3a', '#e0a020', { cel: [1.5, 1.5], lw: 2 });
      ctx.save();
      A.shape(ctx, (c) => starPath(c, 0, 2.5, 4.5, 2, 5, -Math.PI / 2), '#fff4c0', null, { lw: 1.2, hl: false });
      ctx.restore();
    },

    // ─── 魔法系 ───
    starRain(ctx) {
      [[-7, -8, 5], [7, -2, 4], [-2, 8, 4.5]].forEach(([x, y, r]) => {
        ctx.strokeStyle = 'rgba(143,240,232,0.7)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 3, y - 3);
        ctx.lineTo(x - 10, y - 10);
        ctx.stroke();
        A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.45, 5, -Math.PI / 2 + 0.3), '#ffe066', '#e8b020', { cel: [1, 1], lw: 1.8, hl: false });
      });
    },
    blink(ctx) {
      ctx.save();
      ctx.setLineDash([2.5, 2.5]);
      ctx.strokeStyle = A.c('#8ff0e8');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-8, 3, 6, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3, -1);
      ctx.quadraticCurveTo(0, -12, 6, -6);
      ctx.stroke();
      ctx.restore();
      const g = ctx.createRadialGradient(7, 3, 1, 7, 3, 12);
      g.addColorStop(0, 'rgba(200,255,250,0.9)');
      g.addColorStop(1, 'rgba(95,208,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(7, 3, 12, 0, TAU);
      ctx.fill();
      A.ellipse(ctx, 7, 3, 6, 6, '#8ff0e8', '#5fd0c8', { lw: 2 });
      sparkle(ctx, 13, -7, 3.5);
      sparkle(ctx, -13, -8, 2.5, '#c9f0ff');
    },
    manaSpring(ctx) {
      A.shape(ctx, (c) => c.ellipse(0, 9, 14, 5, 0, 0, TAU), '#6ab0ff', '#3a80d8', { shadeY: 10, lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-4, 9); c.quadraticCurveTo(-5, -4, 0, -13); c.quadraticCurveTo(5, -4, 4, 9); c.closePath(); }, '#8fd8ff', '#5ab0e8', { cel: [1.5, 1.5], lw: 2, hl: false });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      [-1, 1].forEach((s) => {
        A.shape(ctx, (c) => { c.moveTo(s * 1, -8); c.quadraticCurveTo(s * 12, -12, s * 12, 2); c.quadraticCurveTo(s * 9, -6, s * 1, -4); c.closePath(); }, '#8fd8ff', null, { lw: 1.8, hl: false });
      });
      [[-9, 4], [10, 5], [0, 12]].forEach(([x, y]) => A.ellipse(ctx, x, y, 1.6, 1.6, '#e8fffc', null, { noStroke: true, hl: false }));
      A.ellipse(ctx, -1, -3, 1.2, 3, '#e8fffc', null, { noStroke: true, hl: false });
    },
    meteor(ctx) {
      // 火焰尾巴
      const tail = (c, w) => { c.moveTo(-16, -16); c.quadraticCurveTo(-4, -4 - w * 0.6, 7 - w * 0.4, -3 - w); c.arc(4, 4, w, -Math.PI * 0.15, Math.PI * 0.85); c.quadraticCurveTo(-4 - w * 0.6, -4, -16, -16); c.closePath(); };
      ctx.save();
      const g1 = ctx.createLinearGradient(-16, -16, 4, 4);
      g1.addColorStop(0, 'rgba(255,140,60,0)');
      g1.addColorStop(1, 'rgba(255,140,60,0.95)');
      ctx.fillStyle = g1;
      ctx.beginPath();
      tail(ctx, 10);
      ctx.fill();
      const g2 = ctx.createLinearGradient(-12, -12, 4, 4);
      g2.addColorStop(0, 'rgba(255,240,160,0)');
      g2.addColorStop(1, 'rgba(255,240,160,1)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      tail(ctx, 6);
      ctx.fill();
      ctx.restore();
      A.ellipse(ctx, 5, 5, 8, 8, '#ffb84a', '#e8702a', { cel: [2, 2], lw: 2, hl: [2, 1, 2.5, 1.8] });
      A.ellipse(ctx, 8, 6, 2, 1.6, '#e8702a', null, { noStroke: true, hl: false });
      A.ellipse(ctx, 4, 9, 1.5, 1.2, '#e8702a', null, { noStroke: true, hl: false });
      sparkle(ctx, 13, -8, 3, '#fff0a0');
    },
    halo(ctx) {
      const g = ctx.createRadialGradient(0, 2, 2, 0, 2, 17);
      g.addColorStop(0, 'rgba(255,245,190,0.7)');
      g.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 2, 17, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, -1, 13, 6, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffe066');
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(0, -1, 13, 6, 0, Math.PI * 1.1, Math.PI * 1.5);
      ctx.stroke();
      [[-8, 9, 2], [0, 12, 2.5], [8, 9, 2]].forEach(([x, y, r]) => sparkle(ctx, x, y, r * 1.5, '#fff6c0'));
    },
    resonance(ctx) {
      ['#c9a7ff', '#8ff0e8', '#c9a7ff'].forEach((col, i) => {
        const r = 6 + i * 4.5;
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, -0.9 + i * 0.4, 0.9 + i * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI - 0.9 + i * 0.4, Math.PI + 0.9 + i * 0.4);
        ctx.stroke();
        ctx.strokeStyle = A.c(col);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, -0.9 + i * 0.4, 0.9 + i * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI - 0.9 + i * 0.4, Math.PI + 0.9 + i * 0.4);
        ctx.stroke();
      });
      A.ellipse(ctx, 0, 0, 4, 4, '#e8d4ff', '#b090e8', { lw: 1.8, hl: false });
    },
    auroraVeil(ctx) {
      ['#7ae0c0', '#6ac8f0', '#a890f0', '#f08ad0'].forEach((col, i) => {
        const x0 = -10 + i * 6.5;
        A.shape(ctx, (c) => {
          c.moveTo(x0 - 2.5, -13 + i);
          c.bezierCurveTo(x0 + 4, -6, x0 - 5, 2, x0 - 1, 13);
          c.lineTo(x0 + 3.5, 13);
          c.bezierCurveTo(x0 - 1, 2, x0 + 8, -6, x0 + 2.5, -13 + i);
          c.closePath();
        }, col, null, { lw: 1.6, hl: false });
      });
      sparkle(ctx, 11, -11, 3);
      sparkle(ctx, -12, 9, 2.4);
    },
    healLight(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 17);
      g.addColorStop(0, 'rgba(210,255,200,0.8)');
      g.addColorStop(1, 'rgba(150,240,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-3.5, -11); c.lineTo(3.5, -11); c.lineTo(3.5, -3.5); c.lineTo(11, -3.5); c.lineTo(11, 3.5); c.lineTo(3.5, 3.5); c.lineTo(3.5, 11); c.lineTo(-3.5, 11); c.lineTo(-3.5, 3.5); c.lineTo(-11, 3.5); c.lineTo(-11, -3.5); c.lineTo(-3.5, -3.5); c.closePath(); }, '#8fe88a', '#5ac05a', { cel: [1.5, 1.5], lw: 2, hl: [-1, -7, 1.3, 2.5] });
      sparkle(ctx, 11, -11, 3);
      sparkle(ctx, -11, 10, 2.4);
    },
    omniscience(ctx) {
      ctx.strokeStyle = A.c('#e8d4ff');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + Math.PI / 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 14);
        ctx.stroke();
      }
      A.shape(ctx, (c) => eyePath(c, 0, 0, 14, 5.5), '#fffaf0', '#e8e0d0', { shadeY: 3, lw: 2, hl: false });
      ctx.save();
      ctx.beginPath();
      eyePath(ctx, 0, 0, 14, 5.5);
      ctx.clip();
      A.ellipse(ctx, 0, 0, 6, 6, '#9a70d8', '#6a48b0', { lw: 1.6, hl: false });
      A.shape(ctx, (c) => starPath(c, 0, 0, 3.4, 1.4, 4, 0), '#2b1a30', null, { noStroke: true, hl: false });
      dot(ctx, -2, -2, 1.3, '#ffffff');
      ctx.restore();
      A.shape(ctx, (c) => eyePath(c, 0, 0, 14, 5.5), 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
    },

    // ─── 敏捷系（全部都是投擲的羽刃）───
    doubleClaw(ctx) {
      speedLines(ctx, [[-17, -9, -12, -9], [-17, 0, -12, 0], [-17, 9, -12, 9]], '#ffffff', 2);
      blade(ctx, -3, -8, 8, 6.5, '#d8ff9a', '#a8d04a', -0.12);
      blade(ctx, 4, 0, 8.5, 7, '#d8ff9a', '#a8d04a', 0);
      blade(ctx, 9, 8, 7.5, 6, '#d8ff9a', '#a8d04a', 0.12);
    },
    shadowStep(ctx) {
      ctx.save();
      const g = ctx.createLinearGradient(-17, 0, 6, 0);
      g.addColorStop(0, 'rgba(140,90,210,0)');
      g.addColorStop(1, 'rgba(140,90,210,0.8)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-17, -4);
      ctx.lineTo(4, -2.5);
      ctx.lineTo(4, 2.5);
      ctx.lineTo(-17, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.rotate(-0.12);
      A.shape(ctx, (c) => { c.moveTo(17, 0); c.quadraticCurveTo(4, -7, -13, -3.5); c.lineTo(-9, 0); c.lineTo(-13, 3.5); c.quadraticCurveTo(4, 6, 17, 0); c.closePath(); }, '#7a5ab8', '#4a2e72', { shadeY: 0.5, lw: 2, hl: false });
      line(ctx, [[-4, -1.2], [11, -0.5]], 'rgba(230,210,255,0.9)', 1.2);
      ctx.restore();
      // 被貫穿的影子漣漪
      ctx.strokeStyle = A.c('#b89aff');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(1, -0.2, 2.5, 8, 0, 0, TAU);
      ctx.stroke();
      sparkle(ctx, 16, -6, 3, '#e8d4ff');
    },
    boomerang(ctx) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(216,255,154,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 1, 14, 9, 0, Math.PI * 0.15, Math.PI * 1.35);
      ctx.stroke();
      ctx.restore();
      A.shape(ctx, (c) => { c.moveTo(12, -10); c.quadraticCurveTo(-4, -12, -10, 2); c.quadraticCurveTo(-8, 5, -6, 3); c.quadraticCurveTo(-2, -5, 10, -6); c.closePath(); }, '#d8ff9a', '#a8d04a', { cel: [1.2, 1.2], lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-10, 2); c.quadraticCurveTo(-4, 12, 10, 12); c.quadraticCurveTo(10, 9, 8, 8); c.quadraticCurveTo(-2, 8, -6, 3); c.closePath(); }, '#a8d04a', '#78a030', { cel: [1.2, 1.2], lw: 2, hl: false });
      A.ellipse(ctx, -8, 2.5, 2, 2, '#f2c24a', null, { lw: 1.4, hl: false });
    },
    afterimage(ctx) {
      [[-9, 0.3], [-3, 0.6], [4, 1]].forEach(([x, a]) => {
        ctx.globalAlpha = a;
        A.ellipse(ctx, x - 4, -7, 2.8, 2.8, '#d9722a', null, { lw: 1.6, hl: false });
        A.ellipse(ctx, x + 4, -7, 2.8, 2.8, '#d9722a', null, { lw: 1.6, hl: false });
        A.ellipse(ctx, x, 0, 8, 7.5, a < 1 ? '#a8d04a' : '#f7b547', a < 1 ? '#78a030' : '#e0913a', { lw: 2, hl: false });
      });
      ctx.globalAlpha = 1;
      A.eye(ctx, 6, -1, 1.4, 1.8, 'normal', 1);
      A.eye(ctx, 10, -1.5, 1.3, 1.7, 'normal', 1);
      speedLines(ctx, [[-17, 9, -8, 9]], '#ffffff', 2);
    },
    thunderCombo(ctx) {
      // 鋸齒狀的電鏈串著三個火花，末端是一把雷刃
      ctx.lineJoin = 'round';
      const pts = [[-15, 9], [-11, 2], [-7, 7], [-3, -1], [1, 4], [4, -2]];
      line(ctx, pts, null, 4.5);
      line(ctx, pts, '#ffe14a', 2);
      [[-15, 9], [-7, 7], [1, 4]].forEach(([x, y]) => A.shape(ctx, (c) => starPath(c, x, y, 3.2, 1.3, 4, 0.4), '#fff8c0', null, { lw: 1.2, hl: false }));
      ctx.save();
      ctx.translate(8, -6);
      ctx.rotate(-0.55);
      ctx.scale(1.3, 1.3);
      A.shape(ctx, (c) => { c.moveTo(10, 0); c.lineTo(2, -4.5); c.lineTo(3, -1.2); c.lineTo(-8, -3.5); c.lineTo(-4, 0); c.lineTo(-8, 3.5); c.lineTo(3, 1.2); c.lineTo(2, 4.5); c.closePath(); }, '#ffe14a', '#e8b020', { shadeY: 0.5, lw: 1.6, hl: false });
      ctx.restore();
    },
    shadowClone(ctx) {
      const head = (x, y, fill, shade, mane, maneS) => {
        A.ellipse(ctx, x - 5, y - 7, 3, 3, mane, null, { lw: 1.6, hl: false });
        A.ellipse(ctx, x + 5, y - 7, 3, 3, mane, null, { lw: 1.6, hl: false });
        A.shape(ctx, (c) => bumpRing(c, x, y, 7.5, 10, 3), mane, maneS, { cel: [1.2, 1.2], lw: 1.8 });
        A.ellipse(ctx, x, y, 6, 5.5, fill, shade, { lw: 1.8, hl: false });
      };
      ctx.globalAlpha = 0.85;
      head(-5, -3, '#6a4a9a', '#4a2e72', '#4a2e72', '#321e52');
      ctx.globalAlpha = 1;
      dot(ctx, -6, -4, 1.4, '#e8d4ff');
      dot(ctx, -2, -4, 1.4, '#e8d4ff');
      head(5, 4, '#f7b547', '#e0913a', '#d9722a', '#b95a1e');
      A.eye(ctx, 4.5, 3, 1.3, 1.7, 'normal', 1);
      A.eye(ctx, 8.5, 3, 1.3, 1.7, 'normal', 1);
    },
    lethal(ctx) {
      A.shape(ctx, (c) => starPath(c, 5, 5, 11, 4, 6, 0.1), '#ff6a5a', '#d8403a', { lw: 1.8, hl: false });
      A.shape(ctx, (c) => starPath(c, 5, 5, 6, 2.5, 6, 0.35), '#ffe0a0', null, { noStroke: true, hl: false });
      ctx.save();
      ctx.translate(-2, -2);
      ctx.rotate(0.75);
      A.shape(ctx, (c) => { c.moveTo(13, 0); c.quadraticCurveTo(2, -5, -11, -2); c.lineTo(-8, 0); c.lineTo(-11, 2); c.quadraticCurveTo(2, 5, 13, 0); c.closePath(); }, '#f4f8ff', '#b8c6d8', { shadeY: 0.5, lw: 2, hl: false });
      ctx.restore();
      speedLines(ctx, [[-15, -9, -10, -4], [-10, -15, -5, -10]], '#ffffff', 2);
    },
    thousandBolts(ctx) {
      [[-8, -10, 5], [0, -12, 6], [8, -10, 5]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r * 0.8, '#6a6a88', '#4a4a66', { lw: 2, hl: false }));
      [[-9, 3, 0.55], [1, 4, 0.7], [10, 3, 0.55]].forEach(([x, y, s]) => A.shape(ctx, (c) => boltPath(c, x, y, s), '#ffe14a', '#e8b020', { shadeY: y + 2, lw: 1.8, hl: false }));
    },
    stormRush(ctx) {
      ctx.lineCap = 'round';
      [[13, '#8ff0e8', 0], [9, '#d8ff9a', 1.6]].forEach(([r, col, a0]) => {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, a0 + Math.PI * 1.25);
        ctx.stroke();
        ctx.strokeStyle = A.c(col);
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });
      A.shape(ctx, (c) => boltPath(c, 0, 0, 0.75), '#ffe14a', '#e8b020', { shadeY: 2, lw: 2, hl: false });
    },
    hunterInstinct(ctx) {
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(dx * 12, dy * 12);
        ctx.lineTo(dx * 16, dy * 16);
        ctx.stroke();
      });
      A.shape(ctx, (c) => eyePath(c, 0, 0, 12, 5), '#e8f070', '#c0c840', { shadeY: 2.5, lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(0, -8); c.quadraticCurveTo(3, 0, 0, 8); c.quadraticCurveTo(-3, 0, 0, -8); c.closePath(); }, '#2b1a12', null, { noStroke: true, hl: false });
      dot(ctx, -4, -2, 1.3, '#ffffff');
    },

    // ─── 第二章材料 ───
    sandgrain(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-13, 9); c.quadraticCurveTo(-8, -4, 0, -6); c.quadraticCurveTo(8, -4, 13, 9); c.quadraticCurveTo(0, 12, -13, 9); c.closePath(); }, '#f0d8a0', '#d4b070', { cel: [2, 2], lw: 2 });
      [[-5, 2], [2, -1], [5, 5], [-1, 6], [-8, 7], [8, 8]].forEach(([x, y], i) => dot(ctx, x, y, i % 2 ? 1 : 1.3, '#b89050'));
      A.ellipse(ctx, 9, -5, 2.5, 2.5, '#f0d8a0', '#d4b070', { lw: 1.6, hl: false });
      sparkle(ctx, -6, -8, 3);
    },
    shellpiece(ctx) {
      const sh = (c) => { c.moveTo(0, 11); c.lineTo(-12, -3); c.quadraticCurveTo(-8, -12, 0, -12); c.lineTo(3, -8); c.lineTo(6, -11); c.lineTo(8, -5); c.lineTo(12, -4); c.closePath(); };
      A.shape(ctx, sh, '#ffc8b8', '#e89a8a', { cel: [2, 2], lw: 2 });
      ctx.save();
      ctx.beginPath();
      sh(ctx);
      ctx.clip();
      ctx.strokeStyle = A.c('#e08878');
      ctx.lineWidth = 1.4;
      [-9, -4.5, 0, 4.5, 9].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(0, 11);
        ctx.lineTo(x, -13);
        ctx.stroke();
      });
      ctx.restore();
      A.shape(ctx, (c) => A.roundRect(c, -3, 8, 6, 4, 1.5), '#ffc8b8', null, { lw: 1.6, hl: false });
    },
    coralbranch(ctx) {
      const br = [[[0, 14], [0, 2], [-6, -6], [-7, -12]], [[0, 2], [6, -4], [8, -12]], [[-3, -2], [-10, -2], [-12, -7]], [[4, -2], [11, 0], [13, -5]], [[6, -4], [3, -11]]];
      [[8, A.outline()], [4.5, null]].forEach(([w, col]) => {
        br.forEach((pts) => {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = col || A.c('#ff7a6a');
          ctx.lineWidth = w;
          ctx.beginPath();
          pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.stroke();
        });
      });
      [[-7, -12], [8, -12], [-12, -7], [13, -5], [3, -11]].forEach(([x, y]) => dot(ctx, x - 0.5, y + 0.5, 1, '#ffd0c8'));
      line(ctx, [[1.5, 12], [1.5, 3]], '#d8503f', 1.5);
    },
    jellydrop(ctx) {
      const g = ctx.createRadialGradient(0, 2, 1, 0, 2, 16);
      g.addColorStop(0, 'rgba(200,190,255,0.6)');
      g.addColorStop(1, 'rgba(180,160,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 2, 16, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.9;
      A.shape(ctx, (c) => { c.moveTo(-12, 8); c.quadraticCurveTo(-14, -2, -8, -8); c.quadraticCurveTo(0, -14, 8, -8); c.quadraticCurveTo(14, -2, 12, 8); c.quadraticCurveTo(6, 12, 0, 10); c.quadraticCurveTo(-6, 12, -12, 8); c.closePath(); }, '#c8c0ff', '#a098f0', { cel: [2, 2], lw: 2, hl: [-5, -5, 3, 2] });
      ctx.restore();
      A.ellipse(ctx, 3, 1, 3, 2.4, '#ffb8e0', null, { noStroke: true, hl: false });
      dot(ctx, -3, 4, 1.2, '#ffffff');
    },
    glowgel(ctx) {
      const g = ctx.createRadialGradient(0, 4, 1, 0, 4, 16);
      g.addColorStop(0, 'rgba(180,255,140,0.8)');
      g.addColorStop(1, 'rgba(150,255,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 4, 16, 0, TAU);
      ctx.fill();
      const fl = (c) => { c.moveTo(-3.5, -9); c.lineTo(3.5, -9); c.lineTo(3.5, -3); c.quadraticCurveTo(11, 1, 10, 7); c.quadraticCurveTo(9, 13, 0, 13); c.quadraticCurveTo(-9, 13, -10, 7); c.quadraticCurveTo(-11, 1, -3.5, -3); c.closePath(); };
      A.shape(ctx, fl, '#e8fff0', null, { lw: 2, hl: false });
      ctx.save();
      ctx.beginPath();
      fl(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#8cff6a');
      ctx.fillRect(-12, 2, 24, 12);
      ctx.fillStyle = A.c('#5ad84a');
      ctx.fillRect(-12, 9, 24, 5);
      ctx.restore();
      A.shape(ctx, fl, 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, -4.5, -13, 9, 5, 2), '#b5824a', null, { lw: 1.8, hl: false });
      A.ellipse(ctx, -5, 5, 1.2, 2.5, '#ffffff', null, { noStroke: true, hl: false });
      dot(ctx, 3, 6, 1.2, '#e8ffd0');
    },
    moonpearl(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 17);
      g.addColorStop(0, 'rgba(230,230,255,0.9)');
      g.addColorStop(1, 'rgba(190,190,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, TAU);
      ctx.fill();
      A.ellipse(ctx, 0, 1, 10, 10, '#f4f0ff', '#cfc4f0', { cel: [2, 2], lw: 2, hl: [-3.5, -3, 3, 2.2] });
      A.shape(ctx, (c) => { c.arc(2, 1, 5, -Math.PI * 0.5, Math.PI * 0.5); c.arc(0.5, 1, 4, Math.PI * 0.45, -Math.PI * 0.45, true); c.closePath(); }, '#ffe89a', null, { noStroke: true, hl: false });
      sparkle(ctx, 10, -10, 3);
    },
    gullfeather(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-10, 12); c.quadraticCurveTo(-9, -6, 10, -14); c.quadraticCurveTo(5, 2, -10, 12); c.closePath(); }, '#fbfbf6', '#d8dce2', { cel: [1.5, 1.5], lw: 2, hl: false });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.quadraticCurveTo(-9, -6, 10, -14);
      ctx.quadraticCurveTo(5, 2, -10, 12);
      ctx.clip();
      ctx.fillStyle = A.c('#9aa4b0');
      ctx.fillRect(-2, -16, 16, 9);
      ctx.fillStyle = A.c('#3a3a44');
      ctx.fillRect(4, -16, 10, 5);
      ctx.restore();
      A.shape(ctx, (c) => { c.moveTo(-10, 12); c.quadraticCurveTo(-9, -6, 10, -14); c.quadraticCurveTo(5, 2, -10, 12); c.closePath(); }, 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
      line(ctx, [[-12, 14], [-2, 0], [8, -12]], '#b8bcc4', 1.4);
    },
    foam(ctx) {
      [[-5, 3, 7], [6, 5, 5.5], [2, -6, 5], [-8, -6, 3.2], [9, -4, 2.6]].forEach(([x, y, r]) => {
        A.ellipse(ctx, x, y, r, r, '#e8faff', '#b8e4f4', { cel: [1.2, 1.2], lw: 1.8, hl: false });
        A.ellipse(ctx, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.22, '#ffffff', null, { noStroke: true, hl: false, rot: -0.5 });
      });
    },
    plume(ctx) {
      ctx.save();
      ctx.rotate(-0.75);
      const p = (c) => { c.moveTo(-17, 0); c.quadraticCurveTo(-2, -10, 17, -2); c.quadraticCurveTo(0, 8, -17, 0); c.closePath(); };
      A.shape(ctx, p, '#fffdf4', '#e4dcc8', { cel: [1, 1.5], lw: 2, hl: false });
      ctx.save();
      ctx.beginPath();
      p(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#5a5a66');
      ctx.fillRect(9, -10, 12, 20);
      ctx.restore();
      A.shape(ctx, p, 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
      line(ctx, [[-19, 0.5], [15, -1.5]], '#c8bca0', 1.4);
      [[-6, -2, -3, -6], [0, -2.5, 3, -6.5], [-3, 1, 0, 5], [3, 0.5, 6, 4]].forEach(([a, b, c2, d]) => line(ctx, [[a, b], [c2, d]], '#e4dcc8', 1));
      ctx.restore();
    },
    lampshard(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
      g.addColorStop(0, 'rgba(255,240,150,0.95)');
      g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-8, 12); c.lineTo(-11, -4); c.lineTo(-3, -14); c.lineTo(6, -9); c.lineTo(11, 3); c.lineTo(3, 12); c.closePath(); }, '#fff2a0', '#ffd24a', { cel: [2, 2], lw: 2, hl: [-4, -6, 2.5, 4] });
      line(ctx, [[-3, -14], [0, -2], [11, 3]], '#ffd24a', 1.4);
      line(ctx, [[0, -2], [-8, 12]], '#ffd24a', 1.4);
      A.shape(ctx, (c) => { c.moveTo(-10, 12); c.lineTo(5, 12); c.lineTo(4, 16); c.lineTo(-9, 16); c.closePath(); }, '#c8903a', '#9a6a28', { lw: 1.8, hl: false });
      sparkle(ctx, 12, -11, 3.5);
      sparkle(ctx, -13, -8, 2.5);
    },

    // ─── 第三章材料 ───
    emberscale(ctx) {
      const g = ctx.createRadialGradient(0, 2, 1, 0, 2, 15);
      g.addColorStop(0, 'rgba(255,160,80,0.7)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 2, 15, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(0, -12); c.quadraticCurveTo(12, -6, 10, 4); c.quadraticCurveTo(7, 12, 0, 13); c.quadraticCurveTo(-7, 12, -10, 4); c.quadraticCurveTo(-12, -6, 0, -12); c.closePath(); }, '#ff8a3a', '#d85a20', { cel: [2, 2], lw: 2, hl: [-4, -4, 2, 3] });
      A.shape(ctx, (c) => { c.moveTo(0, -6); c.quadraticCurveTo(6, -2, 5, 4); c.quadraticCurveTo(3, 8, 0, 8); c.quadraticCurveTo(-3, 8, -5, 4); c.quadraticCurveTo(-6, -2, 0, -6); c.closePath(); }, '#ffd05a', null, { lw: 1.4, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-2, 5); c.quadraticCurveTo(-3, 0, 0, -3); c.quadraticCurveTo(0, 1, 2, 1); c.quadraticCurveTo(3, 4, 0, 6); c.closePath(); }, '#fff4c0', null, { noStroke: true, hl: false });
    },
    magmashard(ctx) {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 15);
      g.addColorStop(0, 'rgba(255,120,40,0.55)');
      g.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-10, 10); c.lineTo(-12, -2); c.lineTo(-4, -13); c.lineTo(8, -10); c.lineTo(12, 2); c.lineTo(4, 12); c.closePath(); }, '#4a3a3e', '#2e2428', { cel: [2, 2], lw: 2, hl: false });
      ctx.lineJoin = 'round';
      line(ctx, [[-4, -13], [-2, -4], [-8, 3], [-6, 10]], '#ff7a2a', 2.8);
      line(ctx, [[-2, -4], [6, 0], [10, 4]], '#ff7a2a', 2.4);
      line(ctx, [[-4, -13], [-2, -4], [-8, 3], [-6, 10]], '#ffe07a', 1);
      line(ctx, [[-2, -4], [6, 0], [10, 4]], '#ffe07a', 0.9);
    },
    fang(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-9, -11); c.quadraticCurveTo(0, -14, 8, -10); c.quadraticCurveTo(8, 2, 1, 13); c.quadraticCurveTo(-2, 4, -9, -11); c.closePath(); }, '#fff4e0', '#e0d0b0', { cel: [2, 1.5], lw: 2, hl: [-3, -6, 1.5, 3] });
      A.shape(ctx, (c) => { c.moveTo(-9, -11); c.quadraticCurveTo(0, -14, 8, -10); c.lineTo(7, -6); c.quadraticCurveTo(0, -9, -8, -7); c.closePath(); }, '#e8704a', '#c0502a', { lw: 1.8, hl: false });
      A.shape(ctx, (c) => { c.moveTo(9, -2); c.quadraticCurveTo(14, -4, 12, -10); c.quadraticCurveTo(16, -5, 13, 1); c.closePath(); }, '#ff8a3a', null, { lw: 1.4, hl: false });
    },
    pebble(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-11, 4); c.lineTo(-9, -7); c.lineTo(0, -11); c.lineTo(10, -6); c.lineTo(12, 5); c.lineTo(3, 11); c.lineTo(-7, 10); c.closePath(); }, '#a8a09a', '#7a726c', { cel: [2, 2], lw: 2 });
      A.shape(ctx, (c) => { c.moveTo(-5, -1); c.lineTo(0, -6); c.lineTo(5, -2); c.lineTo(3, 4); c.lineTo(-3, 4); c.closePath(); }, '#c8c0b8', null, { lw: 1.4, hl: false });
      dot(ctx, 0, -1, 1.8, '#e8b060');
    },
    rockheart(ctx) {
      const g = ctx.createRadialGradient(0, 1, 1, 0, 1, 16);
      g.addColorStop(0, 'rgba(255,180,90,0.6)');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 1, 16, 0, TAU);
      ctx.fill();
      A.shape(ctx, (c) => heartPath(c, 0, 0, 1.05), '#9a8a7a', '#6e5e50', { cel: [2, 2], lw: 2, hl: false });
      ctx.lineJoin = 'round';
      line(ctx, [[0, -5], [-2, -1], [2, 2], [0, 8]], '#ffb84a', 2.4);
      line(ctx, [[0, -5], [-2, -1], [2, 2], [0, 8]], '#fff0a0', 0.9);
      A.ellipse(ctx, 0, 1, 3, 3, '#ffb84a', null, { lw: 1.4, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-9, -4); c.lineTo(-6, -7); c.lineTo(-4, -5); c.closePath(); }, '#b8a898', null, { noStroke: true, hl: false });
    },
    springstone(ctx) {
      A.ellipse(ctx, 0, 5, 12, 8, '#7ad0c8', '#4aa8a0', { cel: [2, 2], lw: 2, hl: [-5, 2, 3, 1.6] });
      A.ellipse(ctx, 3, 6, 3, 2, '#b8f0e8', null, { noStroke: true, hl: false });
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      [[-5, -3], [1, -5], [7, -3]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - 3, y - 3, x, y - 6);
        ctx.quadraticCurveTo(x + 3, y - 9, x, y - 11);
        ctx.stroke();
      });
    },
    towel(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -13, -6, 26, 16, 4), '#fbfbf6', '#dcdcd4', { cel: [2, 2], lw: 2 });
      A.shape(ctx, (c) => A.roundRect(c, -13, -11, 26, 8, 4), '#ffffff', '#e8e8e0', { shadeY: -5, lw: 2 });
      ctx.fillStyle = A.c('#5a8ad8');
      ctx.fillRect(-12, 2, 24, 2.5);
      ctx.fillRect(-12, 6, 24, 1.2);
      ctx.fillStyle = A.c('#e8433a');
      ctx.fillRect(-12, -8, 24, 1.6);
      A.shape(ctx, (c) => A.roundRect(c, -13, -6, 26, 16, 4), 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
    },
    redfur(ctx) {
      [[-6, 0.5, '#c84a28'], [6, -0.45, '#c84a28'], [0, 0.05, '#e8603a']].forEach(([x, r, col]) => {
        ctx.save();
        ctx.translate(x, 11);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-6, 0); c.quadraticCurveTo(-8, -14, 2, -25); c.quadraticCurveTo(0, -16, 6, -12); c.quadraticCurveTo(7, -5, 6, 0); c.closePath(); }, col, '#a83a1c', { cel: [1.5, 1], lw: 2, hl: false });
        ctx.restore();
      });
      line(ctx, [[-1, 4], [1, -6]], '#ffa070', 1.2);
      A.shape(ctx, (c) => A.roundRect(c, -7, 9, 14, 5, 2), '#ffd05a', '#e0a020', { shadeY: 12, lw: 1.6, hl: false });
    },
    maskshard(ctx) {
      const m = (c) => { c.moveTo(-2, -13); c.quadraticCurveTo(-13, -12, -13, 0); c.quadraticCurveTo(-12, 11, -1, 13); c.lineTo(1, 7); c.lineTo(-2, 3); c.lineTo(3, -1); c.lineTo(0, -5); c.lineTo(3, -9); c.closePath(); };
      A.shape(ctx, m, '#c8904a', '#9a6a30', { cel: [2, 2], lw: 2 });
      A.shape(ctx, (c) => c.ellipse(-6, -3, 3.5, 2.4, -0.2, 0, TAU), '#3a2418', null, { noStroke: true, hl: false });
      ctx.save();
      ctx.beginPath();
      m(ctx);
      ctx.clip();
      ctx.strokeStyle = A.c('#e8433a');
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-11, 3);
      ctx.lineTo(-3, 5);
      ctx.moveTo(-10, 7);
      ctx.lineTo(-3, 9);
      ctx.moveTo(-9, -8);
      ctx.lineTo(-3, -9);
      ctx.stroke();
      ctx.restore();
      A.shape(ctx, m, 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
      [[7, -4, 2.4], [8, 5, 1.8]].forEach(([x, y, r]) => A.shape(ctx, (c) => starPath(c, x, y, r, r * 0.6, 3, 0.4), '#c8904a', null, { lw: 1.4, hl: false }));
    },
    volcanocore(ctx) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
      g.addColorStop(0, 'rgba(255,170,80,0.95)');
      g.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.fill();
      A.ellipse(ctx, 0, 0, 11, 11, '#ff7a2a', '#d84a18', { cel: [2, 2], lw: 2, hl: false });
      A.ellipse(ctx, -1, -1, 6, 6, '#ffd05a', null, { noStroke: true, hl: false });
      A.ellipse(ctx, -2, -2, 3, 3, '#fff6c0', null, { noStroke: true, hl: false });
      [[-0.3, 1.1], [1.5, 0.9], [2.8, 1.0], [4.3, 1.1]].forEach(([a, w]) => {
        const x = Math.cos(a) * 10;
        const y = Math.sin(a) * 10;
        A.shape(ctx, (c) => { c.arc(0, 0, 12.5, a - w * 0.4, a + w * 0.4); c.arc(0, 0, 7.5, a + w * 0.3, a - w * 0.3, true); c.closePath(); }, '#4a3a3e', '#2e2428', { lw: 1.8, hl: false });
        dot(ctx, x * 0.9, y * 0.9, 0.9, '#6a5a5e');
      });
      sparkle(ctx, 13, -12, 3, '#fff0a0');
      sparkle(ctx, -14, 10, 2.4, '#ffd05a');
    },
  };
  // doubleClaw／shadowStep／thunderCombo 刻意蓋過 items.js 的舊圖示（敏捷系改成投擲羽刃）
  Object.assign(A.ICON, ICON2);
})();
