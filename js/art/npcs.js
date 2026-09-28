// NPC、寶箱、傳送門、投射物。
(function () {
  'use strict';
  const A = G.art;

  // ════════ 精緻化小工具（只給這個檔案的第一章 NPC 用）════════
  // 風格比照 Boss：右下月牙陰影＋左上邊緣光＋底部反光＋材質紋理；顏色都經過 A.c()。
  const TAU = Math.PI * 2;
  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  // 形狀內側、沒被位移 (dx,dy) 後的本體蓋到的那一圈邊（必須在 clip 裡呼叫）
  function edgeBand(ctx, path, dx, dy, col, a) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-3000, -3000, 6000, 6000);
    ctx.translate(dx, dy);
    path(ctx);
    ctx.translate(-dx, -dy);
    ctx.clip('evenodd');
    ctx.globalAlpha *= a;
    ctx.fillStyle = A.c(col);
    ctx.fillRect(-3000, -3000, 6000, 6000);
    ctx.restore();
  }
  // o: { cel:[x,y], rim, rimA, bounce, bounceW, bounceA, tex(ctx), gloss:[x,y,rx,ry,rot,a], lw, noStroke }
  function rs(ctx, path, fill, shade, rim, o) {
    o = o || {};
    const cx = o.cel ? o.cel[0] : 3;
    const cy = o.cel ? o.cel[1] : 3;
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(shade || fill);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = A.c(fill);
    ctx.fill();
    ctx.translate(cx, cy);
    if (o.tex) o.tex(ctx);
    if (o.bounce) edgeBand(ctx, path, 0, -(o.bounceW || 2.4), o.bounce, o.bounceA != null ? o.bounceA : 0.45);
    if (rim) edgeBand(ctx, path, o.rim || 1.7, o.rim || 1.7, rim, o.rimA != null ? o.rimA : 0.85);
    ctx.restore();
    if (o.gloss) gloss(ctx, o.gloss[0], o.gloss[1], o.gloss[2], o.gloss[3], o.gloss[4], o.gloss[5]);
    if (o.noStroke) return;
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = o.lw || 2.6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  function re(ctx, x, y, rx, ry, fill, shade, rim, o) {
    const rot = (o && o.rot) || 0;
    rs(ctx, (c) => c.ellipse(x, y, rx, ry, rot, 0, TAU), fill, shade, rim, o);
  }
  function gloss(ctx, x, y, rx, ry, rot, a) {
    ctx.save();
    ctx.globalAlpha *= a == null ? 0.6 : a;
    ctx.fillStyle = A.c('#ffffff');
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || -0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function line(ctx, pts, col, w, a) {
    ctx.save();
    if (a != null) ctx.globalAlpha *= a;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = w || 1.5;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.restore();
  }
  function qline(ctx, x0, y0, qx, qy, x1, y1, col, w, a) {
    ctx.save();
    if (a != null) ctx.globalAlpha *= a;
    ctx.lineCap = 'round';
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = w || 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(qx, qy, x1, y1);
    ctx.stroke();
    ctx.restore();
  }
  // 描邊＋內色的粗線（拐杖、背帶）
  function stick(ctx, pts, col, w) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + 2.4;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.restore();
  }
  function dot(ctx, x, y, r, col, a) {
    ctx.save();
    if (a != null) ctx.globalAlpha *= a;
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function glow(ctx, x, y, r, rgb, a) {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  // 毛流：橢圓範圍內撒一些短弧線（在 rs 的 tex 裡呼叫就會被裁在形狀內）
  function fur(ctx, cx, cy, rx, ry, n, col, a, len, seed, dir) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const u = Math.sqrt(hash(seed + i * 3.1));
      const v = hash(seed + i * 7.7 + 1.3) * TAU;
      const x = cx + Math.cos(v) * u * rx;
      const y = cy + Math.sin(v) * u * ry;
      const d = dir != null ? dir + (hash(seed + i) - 0.5) * 0.6 : Math.atan2(y - cy, x - cx) * 0.5 + Math.PI * 0.25;
      const l = len * (0.7 + hash(seed + i * 2.3) * 0.6);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(d) * l * 0.5 - Math.sin(d) * 0.6, y + Math.sin(d) * l * 0.5 + Math.cos(d) * 0.6, x + Math.cos(d) * l, y + Math.sin(d) * l);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 精緻的 Q 版眼睛：深色底、下半圈虹膜色、瞳孔、兩顆亮點、上睫毛線
  function eye2(ctx, x, y, rx, ry, iris, closed, look, lash) {
    if (closed) {
      A.eye(ctx, x, y, rx, ry, 'closed');
      return;
    }
    const X = x + (look || 0) * 0.7;
    ctx.save();
    ctx.fillStyle = A.c('#24150e');
    ctx.beginPath();
    ctx.ellipse(X, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.clip();
    ctx.globalAlpha *= 0.95;
    ctx.fillStyle = A.c(iris);
    ctx.beginPath();
    ctx.ellipse(X, y + ry * 0.55, rx * 0.95, ry * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c('#120804');
    ctx.beginPath();
    ctx.ellipse(X, y + ry * 0.05, rx * 0.5, ry * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    dot(ctx, X - rx * 0.3, y - ry * 0.38, Math.max(0.9, rx * 0.42), '#ffffff');
    dot(ctx, X + rx * 0.38, y + ry * 0.42, Math.max(0.5, rx * 0.2), '#ffffff', 0.9);
    if (lash !== false) {
      ctx.save();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = Math.max(1.2, rx * 0.45);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(X, y + ry * 0.1, rx * 1.08, ry * 1.08, 0, Math.PI * 1.08, Math.PI * 1.9);
      ctx.stroke();
      ctx.restore();
    }
  }
  function stitches(ctx, pts, col, a) {
    ctx.save();
    ctx.setLineDash([1.6, 1.8]);
    line(ctx, pts, col, 0.9, a == null ? 0.85 : a);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 貓頭鷹商人：背著捲毯行囊、掛著小提燈，金框圓眼鏡配青綠領巾，胸前一層層的羽鱗
  function owl(ctx, t) {
    const B = Math.sin(t * 2) * 1.2;
    const blink = Math.sin(t * 0.9) > 0.97;
    // ── 背上的行囊（大半被身體擋住，露出捲毯、側袋與提燈）──
    ctx.save();
    ctx.translate(-20, -34 + B);
    ctx.rotate(-0.08);
    rs(ctx, (c) => A.roundRect(c, -11, -14, 22, 30, 5), '#b5763c', '#8a5528', '#e8b07a', { cel: [2, 3], lw: 2.2, tex: (c) => {
      for (let i = 0; i < 6; i++) line(c, [[-11, -10 + i * 5], [11, -10 + i * 5]], '#8a5528', 0.8, 0.35);
    } });
    rs(ctx, (c) => A.roundRect(c, -13, -6, 7, 14, 3), '#9a6230', '#74461f', '#d8a06a', { cel: [1, 2], lw: 1.8 });
    stitches(ctx, [[-12, -3], [-7, -3]], '#f0d2a0');
    rs(ctx, (c) => A.roundRect(c, -15, -23, 26, 10, 5), '#6f9fc0', '#4b7898', '#c8ecff', { cel: [0, 2.5], lw: 2 });
    line(ctx, [[-8, -23], [-8, -13]], '#d85a4a', 2.2);
    line(ctx, [[4, -23], [4, -13]], '#d85a4a', 2.2);
    dot(ctx, -13.5, -18, 2.4, '#4b7898');
    ctx.restore();
    // 提燈
    const lf = 0.75 + Math.sin(t * 5) * 0.12 + Math.sin(t * 13) * 0.05;
    glow(ctx, -33, -24 + B, 16, '255,210,110', 0.35 * lf);
    line(ctx, [[-27, -36 + B], [-33, -31 + B]], '#5a3a22', 1.4);
    rs(ctx, (c) => A.roundRect(c, -37, -30 + B, 8, 11, 2.5), '#ffe08a', '#f0b040', '#fffbe0', { cel: [1, 1], lw: 1.6 });
    dot(ctx, -33, -24 + B, 1.8, '#fff8d8', lf);
    line(ctx, [[-37.5, -30 + B], [-28.5, -30 + B]], '#5a3a22', 2);
    line(ctx, [[-37.5, -19 + B], [-28.5, -19 + B]], '#5a3a22', 2);
    // ── 身體與胸前羽鱗 ──
    re(ctx, 0, -32 + B, 24, 30, '#9c6b45', '#6f4629', '#dcaa78', { cel: [4, 4], rim: 2, bounce: '#c89468', lw: 3, tex: (c) => {
      for (let r = 0; r < 8; r++) for (let k = -3; k <= 3; k++) {
        const x = k * 7 + (r % 2) * 3.5;
        const y = -56 + r * 6.5 + B;
        c.save();
        c.globalAlpha *= 0.45;
        c.strokeStyle = A.c('#5e3a22');
        c.lineWidth = 1;
        c.beginPath();
        c.arc(x, y, 3, 0.25, Math.PI - 0.25);
        c.stroke();
        c.restore();
      }
    } });
    re(ctx, 0, -25 + B, 15, 20, '#f2dfbc', '#d6bb90', '#fffaf0', { cel: [2, 3], rim: 1.5, lw: 2.2, tex: (c) => {
      for (let r = 0; r < 7; r++) for (let k = -3; k <= 3; k++) {
        const x = k * 5 + (r % 2) * 2.5;
        const y = -38 + r * 4.6 + B;
        c.save();
        c.globalAlpha *= 0.75;
        c.strokeStyle = A.c('#c29e6c');
        c.lineWidth = 1;
        c.beginPath();
        c.arc(x, y, 2, 0.3, Math.PI - 0.3);
        c.stroke();
        c.restore();
      }
    } });
    // 翅膀：收在身體兩側，一層層的飛羽
    const wing = (s) => {
      ctx.save();
      ctx.translate(s * 19, -30 + B);
      ctx.scale(s, 1);
      const wp = (c) => { c.moveTo(-3, -16); c.quadraticCurveTo(8, -12, 8, 4); c.quadraticCurveTo(7, 14, 1, 18); c.quadraticCurveTo(-4, 8, -5, -2); c.closePath(); };
      rs(ctx, wp, '#8a5a38', '#654026', '#c8946a', { cel: [s > 0 ? 2 : -1, 2], lw: 2.2, tex: (c) => {
        for (let i = 0; i < 3; i++) qline(c, -3 + i * 2.5, -4 + i * 5, 3 + i, 4 + i * 5, 3 + i * 1.2, 12 + i * 2, '#4e3018', 1, 0.6);
      } });
      ctx.restore();
    };
    wing(-1);
    wing(1);
    // ── 領巾 ──
    rs(ctx, (c) => { c.moveTo(-15, -31 + B); c.quadraticCurveTo(0, -23 + B, 15, -31 + B); c.lineTo(14, -26 + B); c.quadraticCurveTo(0, -18 + B, -14, -26 + B); c.closePath(); }, '#3aa89a', '#277a70', '#a8f0e4', { cel: [1, 2], lw: 2, tex: (c) => {
      [[-9, -26], [-2, -23], [6, -24], [11, -28]].forEach(([x, y]) => dot(c, x, y + B, 0.9, '#e8fff8', 0.8));
    } });
    rs(ctx, (c) => { c.moveTo(7, -25 + B); c.lineTo(5, -14 + B); c.lineTo(10, -17 + B); c.closePath(); }, '#3aa89a', '#277a70', null, { cel: [1, 1], lw: 1.8 });
    rs(ctx, (c) => { c.moveTo(10, -25 + B); c.lineTo(15, -16 + B); c.lineTo(17, -21 + B); c.closePath(); }, '#2f9488', '#1f6a60', null, { cel: [1, 1], lw: 1.8 });
    re(ctx, 9.5, -25 + B, 3.2, 2.6, '#3aa89a', '#277a70', '#a8f0e4', { cel: [0.8, 0.8], lw: 1.8 });
    // ── 耳羽 ──
    [-1, 1].forEach((s) => {
      rs(ctx, (c) => { c.moveTo(s * 18, -54 + B); c.lineTo(s * 22, -70 + B); c.quadraticCurveTo(s * 14, -64 + B, s * 7, -58 + B); c.closePath(); }, '#7d5233', '#5e3a22', '#c8946a', { cel: [s, 1.5], rim: 1.2, lw: 2.2 });
      line(ctx, [[s * 18, -57 + B], [s * 20.5, -66 + B]], '#4e3018', 1, 0.7);
    });
    // ── 臉盤、眼鏡與眼睛 ──
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = A.c('#c89468');
    ctx.beginPath();
    ctx.ellipse(-9, -45 + B, 12.5, 11.5, 0, 0, TAU);
    ctx.ellipse(9, -45 + B, 12.5, 11.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    [-9, 9].forEach((x) => re(ctx, x, -46 + B, 9, 9, '#fff8e8', '#eadcc0', null, { cel: [1.5, 2], lw: 2.4 }));
    // 眉羽（讓表情溫和、帶點精明）
    qline(ctx, -16, -55 + B, -10, -58 + B, -3, -55 + B, '#5e3a22', 2.4);
    qline(ctx, 3, -55 + B, 10, -58.5 + B, 17, -55.5 + B, '#5e3a22', 2.4);
    eye2(ctx, -8, -46 + B, 3.8, 4.6, '#f2a53a', blink, 1);
    eye2(ctx, 10, -46 + B, 3.8, 4.6, '#f2a53a', blink, 1);
    // 金框圓眼鏡＋鏡鍊
    ctx.save();
    ctx.strokeStyle = A.c('#d8a838');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-9, -46 + B, 10.4, 0.42, TAU - 0.42);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, -46 + B, 10.4, Math.PI + 0.42, Math.PI - 0.42 + TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.9, -50 + B);
    ctx.quadraticCurveTo(0, -52 + B, 0.9, -50 + B);
    ctx.stroke();
    ctx.restore();
    line(ctx, [[-14, -51 + B], [-11, -54 + B]], '#ffffff', 1.4, 0.75);
    line(ctx, [[4, -51 + B], [7, -54 + B]], '#ffffff', 1.4, 0.75);
    ctx.save();
    ctx.setLineDash([1.2, 1.4]);
    qline(ctx, 19.5, -44 + B, 24, -34 + B, 19, -28 + B, '#e8b840', 1.2);
    ctx.setLineDash([]);
    ctx.restore();
    // 喙
    rs(ctx, (c) => { c.moveTo(-4.5, -38.5 + B); c.quadraticCurveTo(0, -40 + B, 4.5, -38.5 + B); c.quadraticCurveTo(2, -33 + B, 0, -30.5 + B); c.quadraticCurveTo(-2, -33 + B, -4.5, -38.5 + B); c.closePath(); }, '#f6b24a', '#c87a20', '#ffe0a0', { cel: [1, 1.5], rim: 1, lw: 2 });
    gloss(ctx, -1.5, -37 + B, 1.4, 0.8, -0.3, 0.8);
    A.blush(ctx, -15, -37 + B, 2.6);
    A.blush(ctx, 16, -37 + B, 2.6);
    // ── 腳爪 ──
    [-8, 8].forEach((x) => {
      re(ctx, x, -2, 6, 3, '#f2a53a', '#c87a20', '#ffd88a', { cel: [1, 1], lw: 2 });
      line(ctx, [[x - 2, -1], [x - 2, 0.5]], '#8a4a10', 1, 0.8);
      line(ctx, [[x + 2, -1], [x + 2, 0.5]], '#8a4a10', 1, 0.8);
    });
  }

  // 刺蝟婆婆：兩層白尖的刺、刺裡插著一朵小花；手織紅圍巾、藍色蕾絲圍裙、金框眼鏡掛著鏡鍊，拄著綁緞帶的拐杖
  function hedgehog(ctx, t) {
    const B = Math.sin(t * 1.8) * 1;
    const blink = Math.sin(t * 0.7) > 0.96;
    const spikes = (c, r1, r2, ph) => {
      const cx = -4;
      const cy = -28 + B;
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI * 0.55 + ((i + ph) / 14) * Math.PI * 1.5;
        const r = i % 2 ? r1 : r2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.9;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
    };
    // 後排的刺（深色、錯開半格）
    rs(ctx, (c) => spikes(c, 23, 33, 0.5), '#5d4232', '#46301f', null, { cel: [2, 2], lw: 2.4 });
    // 前排的刺：白色刺尖＋刺紋
    rs(ctx, (c) => spikes(c, 24, 34, 0), '#7b5a45', '#56392a', '#b89478', { cel: [3, 3], rim: 2, lw: 2.6, tex: (c) => {
      for (let i = 0; i <= 14; i += 2) {
        const a = Math.PI * 0.55 + (i / 14) * Math.PI * 1.5;
        const ca = Math.cos(a);
        const sa = Math.sin(a) * 0.9;
        line(c, [[-4 + ca * 18, -28 + B + sa * 18], [-4 + ca * 28, -28 + B + sa * 28]], '#46301f', 1.1, 0.55);
        line(c, [[-4 + ca * 27, -28 + B + sa * 27], [-4 + ca * 33, -28 + B + sa * 33]], '#f4e4cc', 2.2, 0.85);
      }
      for (let i = 1; i < 14; i += 2) {
        const a = Math.PI * 0.55 + (i / 14) * Math.PI * 1.5;
        line(c, [[-4 + Math.cos(a) * 12, -28 + B + Math.sin(a) * 11], [-4 + Math.cos(a) * 21, -28 + B + Math.sin(a) * 19]], '#9a7660', 1, 0.7);
      }
    } });
    // 刺裡插著的小花
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3;
      re(ctx, -10 + Math.cos(a) * 3, -52 + B + Math.sin(a) * 3, 2.6, 2.6, '#c9a0e8', '#a078c8', null, { cel: [0.6, 0.6], lw: 1.1 });
    }
    re(ctx, -10, -52 + B, 1.8, 1.8, '#ffe14a', '#e0a820', null, { cel: [0.4, 0.4], lw: 1 });
    line(ctx, [[-10, -49 + B], [-16, -40 + B]], '#6aa84a', 1.4);
    // ── 臉與身體 ──
    re(ctx, 4, -24 + B, 20, 22, '#ecd0ac', '#cfad84', '#fff4e2', { cel: [3, 3], rim: 1.8, bounce: '#e8c8a0', lw: 2.8, tex: (c) => {
      fur(c, 4, -24 + B, 18, 20, 26, '#b8946a', 0.45, 3, 11, Math.PI * 0.5);
    } });
    // 藍色圍裙＋蕾絲邊
    rs(ctx, (c) => {
      c.moveTo(-9, -16 + B);
      c.quadraticCurveTo(5, -13 + B, 20, -16 + B);
      c.quadraticCurveTo(23, -9, 20, -5);
      for (let i = 0; i < 6; i++) c.quadraticCurveTo(17.5 - i * 5, -1.5, 15 - i * 5, -5);
      c.quadraticCurveTo(-12, -9, -9, -16 + B);
      c.closePath();
    }, '#8fb0d8', '#6a8cb8', '#d8ecff', { cel: [2, 2], lw: 2, tex: (c) => {
      qline(c, 2, -14 + B, 3, -9, 1, -5, '#6a8cb8', 1, 0.8);
      qline(c, 11, -14 + B, 12, -9, 10, -5, '#6a8cb8', 1, 0.8);
      for (let i = 0; i < 6; i++) dot(c, 17.5 - i * 5, -4, 0.9, '#ffffff', 0.9);
    } });
    rs(ctx, (c) => A.roundRect(c, 4, -12 + B, 8, 6, 2), '#a8c4e8', '#7a9cc8', null, { cel: [1, 1], lw: 1.4 });
    stitches(ctx, [[5, -10.5 + B], [11, -10.5 + B]], '#ffffff');
    // 手織圍巾
    const knit = (c, x0, y0, w, h) => {
      for (let y = y0 + 2; y < y0 + h; y += 3) for (let x = x0 + 1; x < x0 + w; x += 3) {
        line(c, [[x, y - 1], [x + 1.2, y + 0.6], [x + 2.4, y - 1]], '#a83434', 0.9, 0.55);
      }
    };
    rs(ctx, (c) => { c.moveTo(-13, -22 + B); c.quadraticCurveTo(3, -17 + B, 19, -23 + B); c.lineTo(19, -15 + B); c.quadraticCurveTo(3, -9 + B, -13, -14 + B); c.closePath(); }, '#d94f4f', '#a83434', '#ff9a8a', { cel: [1.5, 2], rim: 1.3, lw: 2.2, tex: (c) => {
      knit(c, -13, -24 + B, 32, 14);
      qline(c, -13, -18.5 + B, 3, -13 + B, 19, -19.5 + B, '#fff0d6', 1.6, 0.9);
    } });
    rs(ctx, (c) => { c.moveTo(-8, -17 + B); c.lineTo(0, -17 + B); c.lineTo(1, -4 + B); c.lineTo(-7, -4 + B); c.closePath(); }, '#d94f4f', '#a83434', '#ff9a8a', { cel: [1.5, 1], rim: 1.2, lw: 2, tex: (c) => {
      knit(c, -8, -17 + B, 9, 12);
      line(c, [[-7.5, -9 + B], [0.5, -9 + B]], '#fff0d6', 1.6, 0.9);
    } });
    for (let i = 0; i < 4; i++) line(ctx, [[-6.5 + i * 2.2, -4 + B], [-6.8 + i * 2.2 + Math.sin(t * 2 + i) * 0.4, -0.5 + B]], '#d94f4f', 1.4);
    // ── 臉 ──
    re(ctx, 19, -29 + B, 8, 6, '#fff2dc', '#ecd2b0', null, { cel: [1, 1.2], noStroke: true });
    qline(ctx, 6, -40 + B, 9.5, -42 + B, 13, -40.5 + B, '#f4f0ea', 2, 1);
    qline(ctx, 16, -40.5 + B, 18.5, -42 + B, 21.5, -40 + B, '#f4f0ea', 2, 1);
    eye2(ctx, 10, -34 + B, 2.8, 3.1, '#8a5a3a', blink, 1);
    eye2(ctx, 18, -34 + B, 2.6, 2.9, '#8a5a3a', blink, 1);
    re(ctx, 25, -29 + B, 3.2, 2.7, '#3a2418', '#24150e', null, { cel: [0.6, 0.6], noStroke: true, gloss: [24, -30 + B, 1.1, 0.7, -0.4, 0.8] });
    qline(ctx, 18.5, -25 + B, 21, -23 + B, 23.5, -25.5 + B, null, 1.6);
    A.blush(ctx, 12, -27 + B, 3.2);
    // 金框眼鏡：淡淡的鏡片反光＋垂到耳後的珠鍊
    ctx.save();
    ctx.globalAlpha *= 0.22;
    ctx.fillStyle = A.c('#e8f4ff');
    ctx.beginPath();
    ctx.arc(10, -34 + B, 4.6, 0, TAU);
    ctx.arc(19, -34 + B, 4.6, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = A.c('#b8862a');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(10, -34 + B, 5, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(19, -34 + B, 5, 0, TAU);
    ctx.stroke();
    ctx.restore();
    line(ctx, [[7.5, -36.5 + B], [9.5, -38 + B]], '#ffffff', 1.1, 0.85);
    line(ctx, [[16.5, -36.5 + B], [18.5, -38 + B]], '#ffffff', 1.1, 0.85);
    ctx.save();
    ctx.setLineDash([1, 1.5]);
    qline(ctx, 5, -34 + B, 0, -26 + B, -3, -33 + B, '#e8b840', 1.2);
    ctx.setLineDash([]);
    ctx.restore();
    // ── 拐杖（木紋、繞了一圈紅緞帶）與握著的小手 ──
    stick(ctx, [[30, 0], [28, -30]], '#b5824a', 3);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(28, -29);
    ctx.quadraticCurveTo(28, -40, 20, -38);
    ctx.stroke();
    ctx.strokeStyle = A.c('#b5824a');
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    line(ctx, [[29.2, -4], [28.2, -26]], '#e0b078', 0.9, 0.8);
    line(ctx, [[29.9, -12], [30.6, -15]], '#7a5030', 1, 0.8);
    re(ctx, 22.5, -37.5, 1.8, 1.3, '#9a6a3a', null, null, { noStroke: true });
    rs(ctx, (c) => { c.moveTo(28, -34); c.lineTo(23, -38); c.lineTo(24, -31); c.closePath(); }, '#ff7a8a', '#d85466', null, { cel: [0.6, 0.6], lw: 1.4 });
    rs(ctx, (c) => { c.moveTo(28, -34); c.lineTo(33, -38); c.lineTo(32.5, -31); c.closePath(); }, '#ff7a8a', '#d85466', null, { cel: [0.6, 0.6], lw: 1.4 });
    line(ctx, [[27.5, -33], [26, -27]], '#ff7a8a', 1.2);
    re(ctx, 28, -21 + B * 0.5, 4, 3.4, '#ecd0ac', '#cfad84', '#fff4e2', { cel: [0.8, 0.8], lw: 1.8 });
    // 腳
    [-2, 12].forEach((x) => {
      re(ctx, x, -2, 6, 3, '#e0c09a', '#bf9a70', '#fff0da', { cel: [1, 1], lw: 2 });
      line(ctx, [[x + 1, -3], [x + 1, -1]], '#9a7050', 0.9, 0.8);
      line(ctx, [[x + 3.5, -3], [x + 3.5, -1]], '#9a7050', 0.9, 0.8);
    });
  }

  // 松鼠信差：蓬鬆的大尾巴、藍色郵差帽別著金色翅膀徽章，斜背皮革郵差包，包口露出一封蓋了蠟封的信
  function squirrel(ctx, t) {
    const B = Math.abs(Math.sin(t * 3)) * -2;
    const tail = Math.sin(t * 2.5) * 0.15;
    const blink = Math.sin(t * 1.1 + 1) > 0.97;
    // ── 尾巴 ──
    ctx.save();
    ctx.translate(-12, -20 + B);
    ctx.rotate(tail);
    const tp = (c) => {
      c.moveTo(0, 0);
      c.bezierCurveTo(-26, 0, -30, -40, -10, -46);
      c.bezierCurveTo(4, -50, 8, -36, 0, -30);
      c.bezierCurveTo(-10, -26, -6, -10, 4, -6);
      c.closePath();
    };
    rs(ctx, tp, '#d98a3d', '#a8601e', '#ffc98a', { cel: [3, 3], rim: 2.2, bounce: '#e8a060', lw: 3, tex: (c) => {
      fur(c, -12, -22, 16, 24, 46, '#8a4a14', 0.5, 4, 3);
      fur(c, -14, -30, 12, 14, 18, '#ffd8a0', 0.55, 3.5, 21);
      c.save();
      c.globalAlpha *= 0.5;
      c.strokeStyle = A.c('#ffe6c0');
      c.lineWidth = 3;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-3, -4);
      c.bezierCurveTo(-18, -8, -22, -34, -8, -42);
      c.stroke();
      c.restore();
    } });
    ctx.restore();
    // 腳
    re(ctx, -1, -2, 5, 2.6, '#c67c33', '#9a5a1e', '#f0b070', { cel: [0.8, 0.8], lw: 1.8 });
    re(ctx, 11, -2, 5, 2.6, '#c67c33', '#9a5a1e', '#f0b070', { cel: [0.8, 0.8], lw: 1.8 });
    // ── 身體 ──
    re(ctx, 4, -20 + B, 13, 16, '#e39a4c', '#b8702c', '#ffc98a', { cel: [3, 3], rim: 1.8, bounce: '#f0b070', lw: 2.8, tex: (c) => {
      fur(c, 4, -20 + B, 12, 15, 22, '#9a5a1e', 0.45, 3, 7, Math.PI * 0.5);
    } });
    re(ctx, 7, -16 + B, 7, 10, '#fff2da', '#ecd2ac', '#ffffff', { cel: [1.5, 2], rim: 1.2, lw: 2, tex: (c) => {
      fur(c, 7, -16 + B, 6, 9, 10, '#d8b080', 0.6, 2.4, 17, Math.PI * 0.5);
    } });
    // 小手捧在胸前
    re(ctx, 13, -21 + B, 3.4, 2.8, '#e39a4c', '#b8702c', null, { cel: [0.6, 0.6], lw: 1.6 });
    // ── 斜背郵差包 ──
    stick(ctx, [[-4, -32 + B], [14, -10 + B]], '#7a5030', 2.2);
    stitches(ctx, [[-3.2, -31 + B], [13.5, -11.2 + B]], '#e8c898');
    rs(ctx, (c) => A.roundRect(c, 8, -14 + B, 15, 12, 3), '#8a5a34', '#664024', '#c8905a', { cel: [1.5, 2], lw: 2, tex: (c) => {
      line(c, [[9, -5 + B], [22, -5 + B]], '#5a3820', 0.8, 0.5);
    } });
    // 包口露出的信封＋紅蠟封
    ctx.save();
    ctx.translate(18, -15 + B);
    ctx.rotate(0.25);
    rs(ctx, (c) => c.rect(-5, -4, 10, 6), '#fffaf0', '#e8dcc8', null, { cel: [1, 1], lw: 1.4 });
    line(ctx, [[-5, -4], [0, -0.5], [5, -4]], '#c8b8a0', 0.9);
    ctx.restore();
    rs(ctx, (c) => { c.moveTo(8, -14 + B); c.lineTo(23, -14 + B); c.lineTo(23, -9 + B); c.quadraticCurveTo(15.5, -6 + B, 8, -9 + B); c.closePath(); }, '#a06a3c', '#7a4c28', '#d8a068', { cel: [1, 1.5], rim: 1, lw: 1.8 });
    stitches(ctx, [[9.5, -9.5 + B], [15.5, -7.7 + B], [21.5, -9.5 + B]], '#f0d2a0');
    rs(ctx, (c) => A.roundRect(c, 13.5, -10.5 + B, 4, 4, 1), '#ffd35a', '#d8a020', null, { cel: [0.6, 0.6], lw: 1.1 });
    re(ctx, 21, -15.5 + B, 1.9, 1.9, '#d83a3a', '#a82020', null, { cel: [0.4, 0.4], lw: 1 });
    // ── 頭 ──
    [[-1, -54, -0.15], [11, -55, 0.15]].forEach(([x, y, r]) => {
      re(ctx, x, y + B, 4.2, 6.4, '#e39a4c', '#b8702c', '#ffc98a', { rot: r, cel: [0.8, 0.8], lw: 2 });
      re(ctx, x + 0.4, y + 1 + B, 2, 3.6, '#ffb3a0', '#e88a78', null, { rot: r, cel: [0.3, 0.3], noStroke: true });
    });
    re(ctx, 6, -42 + B, 13, 12, '#e39a4c', '#b8702c', '#ffc98a', { cel: [3, 3], rim: 1.8, lw: 2.8, tex: (c) => {
      fur(c, 2, -44 + B, 10, 8, 14, '#9a5a1e', 0.4, 2.6, 31, Math.PI * 0.45);
    } });
    // 臉頰蓬毛與口鼻
    re(ctx, 13, -37.5 + B, 7, 5, '#fff2da', '#ecd2ac', null, { cel: [1, 1], noStroke: true });
    line(ctx, [[-6, -38 + B], [-8.5, -36 + B], [-6, -35.5 + B]], null, 1.6);
    eye2(ctx, 6, -43 + B, 3, 3.8, '#6a3a1a', blink, 1);
    eye2(ctx, 14, -43 + B, 2.8, 3.6, '#6a3a1a', blink, 1);
    re(ctx, 18.2, -38.5 + B, 2.2, 1.7, '#4a2418', '#2a120a', null, { cel: [0.4, 0.4], noStroke: true, gloss: [17.6, -39.2 + B, 0.8, 0.5, -0.3, 0.9] });
    ctx.save();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14.8, -35.8 + B);
    ctx.quadraticCurveTo(16.4, -34 + B, 18, -35.5 + B);
    ctx.quadraticCurveTo(19.4, -34 + B, 20.6, -35.8 + B);
    ctx.stroke();
    ctx.restore();
    A.blush(ctx, 8, -36 + B, 2.8);
    // ── 郵差帽 ──
    rs(ctx, (c) => { c.moveTo(-5, -53 + B); c.quadraticCurveTo(-5, -63 + B, 6, -63 + B); c.quadraticCurveTo(17, -63 + B, 17, -53 + B); c.closePath(); }, '#3d6fb3', '#2a5088', '#8ab8f0', { cel: [1.5, 1.5], rim: 1.3, lw: 2, tex: (c) => {
      c.save();
      c.fillStyle = A.c('#2a5088');
      c.fillRect(-6, -56.5 + B, 24, 3.5);
      c.restore();
      qline(c, 6, -63 + B, 5, -58 + B, 6, -56.5 + B, '#2a5088', 1, 0.8);
    } });
    rs(ctx, (c) => { c.moveTo(12, -54.5 + B); c.quadraticCurveTo(20, -56 + B, 25, -53 + B); c.quadraticCurveTo(18, -51 + B, 12, -52 + B); c.closePath(); }, '#2d5690', '#1e3e6c', '#6a98d0', { cel: [0.5, 1], lw: 1.8 });
    dot(ctx, 6, -63 + B, 1.5, '#2a5088');
    // 金色翅膀徽章
    rs(ctx, (c) => { c.moveTo(3, -58.5 + B); c.quadraticCurveTo(5, -61 + B, 7, -58.5 + B); c.lineTo(10, -60 + B); c.quadraticCurveTo(9.5, -56.5 + B, 7, -56.5 + B); c.lineTo(3, -56.5 + B); c.closePath(); }, '#ffd35a', '#d8a020', null, { cel: [0.5, 0.5], lw: 1 });
  }

  // 青蛙採集家：濕亮的綠皮膚帶深色斑點，蹼腳有圓圓的趾墊；編織草帽綁紅緞帶插著葉子，提著裝滿蘑菇的藤籃
  function frog(ctx, t) {
    const B = Math.abs(Math.sin(t * 2)) * -2;
    const blink = Math.sin(t * 0.8) > 0.97;
    // ── 蹼腳 ──
    [[-8, -1], [10, 1]].forEach(([x, s]) => {
      rs(ctx, (c) => {
        c.moveTo(x - 7, -1);
        c.quadraticCurveTo(x - 9, -6, x - 3, -6);
        c.quadraticCurveTo(x + 3, -7, x + 7, -4);
        c.quadraticCurveTo(x + 10, -2, x + 8, 0);
        c.quadraticCurveTo(x + 6, 1.5, x + 3, 0);
        c.quadraticCurveTo(x, 1.8, x - 2, 0);
        c.quadraticCurveTo(x - 5, 1.8, x - 7, -1);
        c.closePath();
      }, '#6ab04a', '#4f8a36', '#b8e890', { cel: [1, 1], lw: 2 });
      [x - 4.5, x + 0.5, x + 5.5].forEach((px) => dot(ctx, px, -0.5, 1.2, '#b8e890', 0.9));
    });
    // ── 身體：濕亮皮膚＋斑點 ──
    re(ctx, 0, -20 + B, 20, 17, '#7cc85a', '#4f9436', '#d0f4a0', { cel: [3, 3], rim: 2, bounce: '#a8e07a', lw: 3, tex: (c) => {
      [[-12, -28, 3, 2.2], [-15, -19, 2.2, 1.8], [13, -30, 2.4, 1.8], [16, -20, 2, 2.4], [-6, -33, 1.8, 1.4]].forEach(([x, y, rx, ry]) => {
        re(c, x, y + B, rx, ry, '#5a9e3e', '#4a8a30', null, { noStroke: true });
      });
    } });
    gloss(ctx, -9, -30 + B, 5, 2.4, -0.5, 0.55);
    re(ctx, 3, -14 + B, 12, 9, '#eef8c8', '#d4e4a0', '#ffffff', { cel: [2, 2], rim: 1.2, noStroke: true, tex: (c) => {
      for (let i = 0; i < 3; i++) qline(c, -4, -18 + i * 3 + B, 3, -16 + i * 3 + B, 10, -18 + i * 3 + B, '#c8d890', 0.9, 0.8);
    } });
    // ── 藤籃（編織紋、滿出來的蘑菇和葉子）──
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.arc(-17, -22 + B, 7, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.strokeStyle = A.c('#c8903a');
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
    re(ctx, -20, -24 + B, 3.6, 3, '#f28c38', '#c86a20', '#ffc080', { cel: [0.8, 0.8], lw: 1.5, tex: (c) => dot(c, -21, -25 + B, 0.8, '#fff0d0') });
    rs(ctx, (c) => { c.moveTo(-15, -23 + B); c.quadraticCurveTo(-10, -30 + B, -8, -26 + B); c.quadraticCurveTo(-11, -22 + B, -15, -23 + B); c.closePath(); }, '#8fd05a', '#5a9e3e', null, { cel: [0.6, 0.6], lw: 1.3 });
    re(ctx, -14.5, -25 + B, 3, 2.4, '#e8483a', '#b8302a', null, { cel: [0.6, 0.6], lw: 1.4, tex: (c) => { dot(c, -15.5, -26 + B, 0.7, '#ffffff'); dot(c, -13.5, -25 + B, 0.6, '#ffffff'); } });
    rs(ctx, (c) => A.roundRect(c, -24, -22 + B, 14, 12, 3), '#c8903a', '#946020', '#f0c878', { cel: [1.5, 2], rim: 1.2, lw: 2, tex: (c) => {
      for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) {
        const x = -23.5 + k * 3 + (r % 2) * 1.5;
        const y = -20.5 + r * 3 + B;
        qline(c, x, y, x + 1.5, y - 0.9, x + 3, y, '#8a5a18', 0.9, 0.7);
      }
    } });
    rs(ctx, (c) => A.roundRect(c, -25, -23 + B, 16, 3.2, 1.6), '#b07a2a', '#8a5a18', '#f0c878', { cel: [0.5, 0.8], lw: 1.6 });
    // 抓著籃子的小手
    re(ctx, -12, -18 + B, 3.4, 3, '#7cc85a', '#4f9436', null, { cel: [0.6, 0.6], lw: 1.6 });
    // ── 凸眼 ──
    [[-5, -36], [9, -36]].forEach(([x, y]) => re(ctx, x, y + B, 7, 7, '#7cc85a', '#4f9436', '#d0f4a0', { cel: [1.4, 1.4], rim: 1.2, lw: 2.2 }));
    ctx.save();
    ctx.fillStyle = A.c(blink ? '#8fd46a' : '#fff8e0');
    ctx.beginPath();
    ctx.ellipse(-4, -36 + B, 4.4, 4.8, 0, 0, TAU);
    ctx.ellipse(10, -36 + B, 4.4, 4.8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    eye2(ctx, -4, -36 + B, 3.2, 3.8, '#e0a030', blink, 1, false);
    eye2(ctx, 10, -36 + B, 3.2, 3.8, '#e0a030', blink, 1, false);
    // 大大的笑嘴
    ctx.save();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(4, -25 + B, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4.5, -24 + B);
    ctx.lineTo(-3.4, -22 + B);
    ctx.moveTo(12.5, -24 + B);
    ctx.lineTo(11.4, -22 + B);
    ctx.stroke();
    ctx.restore();
    dot(ctx, 2, -30 + B, 0.8, '#2f5a20');
    dot(ctx, 6, -30 + B, 0.8, '#2f5a20');
    A.blush(ctx, -8, -24 + B, 3.5);
    A.blush(ctx, 16, -24 + B, 2.6);
    // ── 編織草帽 ──
    rs(ctx, (c) => c.ellipse(2, -44 + B, 17, 4.4, 0, 0, TAU), '#f0d080', '#c8a850', '#fff4c0', { cel: [1, 1.5], rim: 1, lw: 2, tex: (c) => {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        line(c, [[2 + Math.cos(a) * 9, -44 + B + Math.sin(a) * 2.4], [2 + Math.cos(a) * 17, -44 + B + Math.sin(a) * 4.4]], '#b89440', 0.8, 0.7);
      }
      c.save();
      c.strokeStyle = A.c('#b89440');
      c.globalAlpha *= 0.7;
      c.lineWidth = 0.8;
      c.beginPath();
      c.ellipse(2, -44 + B, 13, 3.4, 0, 0, TAU);
      c.stroke();
      c.restore();
    } });
    rs(ctx, (c) => { c.moveTo(-7, -44 + B); c.quadraticCurveTo(-7, -53 + B, 2, -53 + B); c.quadraticCurveTo(11, -53 + B, 11, -44 + B); c.quadraticCurveTo(2, -42 + B, -7, -44 + B); c.closePath(); }, '#f0d080', '#c8a850', '#fff4c0', { cel: [1.5, 1], rim: 1.2, lw: 2, tex: (c) => {
      for (let i = 0; i < 4; i++) qline(c, -7, -51 + i * 2 + B, 2, -52.5 + i * 2 + B, 11, -51 + i * 2 + B, '#b89440', 0.8, 0.7);
      c.save();
      c.fillStyle = A.c('#d94f4f');
      c.fillRect(-8, -47.5 + B, 20, 3);
      c.restore();
    } });
    rs(ctx, (c) => { c.moveTo(-5, -47 + B); c.quadraticCurveTo(-12, -54 + B, -9, -58 + B); c.quadraticCurveTo(-4, -54 + B, -5, -47 + B); c.closePath(); }, '#8fd05a', '#5a9e3e', null, { cel: [0.6, 0.6], lw: 1.4 });
    line(ctx, [[-5.5, -48 + B], [-8.5, -56 + B]], '#4f8a36', 0.8);
  }

  // 迷路的小鹿：細細的腿配深色小蹄，背上白斑、胸前一撮白毛，脖子繫著藍緞帶和小金鈴；水汪汪的大眼睛，掉著眼淚
  function fawn(ctx, t) {
    const B = Math.sin(t * 2) * 1;
    const blink = Math.sin(t * 0.6) > 0.97;
    // ── 腿 ──
    [-10, -4, 6, 12].forEach((x, i) => {
      const back = i % 2 === 0;
      rs(ctx, (c) => { c.moveTo(x - 2.8, -20); c.lineTo(x + 2.8, -20); c.quadraticCurveTo(x + 2.4, -10, x + 2, -3); c.lineTo(x - 2, -3); c.quadraticCurveTo(x - 2.6, -10, x - 2.8, -20); c.closePath(); }, back ? '#b87a4a' : '#d09060', back ? '#94603a' : '#a87048', back ? null : '#f0c090', { cel: [1, 0], rim: 1, lw: 2 });
      rs(ctx, (c) => { c.moveTo(x - 2.4, -3.5); c.lineTo(x + 2.4, -3.5); c.lineTo(x + 2.8, 0); c.lineTo(x - 2.8, 0); c.closePath(); }, '#5a3a28', '#3a2418', null, { cel: [0.5, 0.5], lw: 1.8 });
      line(ctx, [[x + 0.2, -3], [x + 0.2, -0.5]], '#8a6a50', 0.8, 0.8);
    });
    // ── 尾巴 ──
    re(ctx, -16, -28 + B, 4.4, 3.4, '#fff8ea', '#e8dcc4', '#ffffff', { rot: -0.4, cel: [0.6, 0.8], lw: 1.8 });
    rs(ctx, (c) => c.ellipse(-15.5, -29.5 + B, 3.4, 1.8, -0.4, Math.PI, TAU), '#b87a4a', null, null, { noStroke: true });
    // ── 身體 ──
    re(ctx, 0, -24 + B, 17, 10, '#d8986a', '#ae7448', '#ffd4a8', { cel: [3, 3], rim: 1.6, bounce: '#fff0dc', bounceW: 3, bounceA: 0.6, lw: 2.8, tex: (c) => {
      fur(c, 0, -24 + B, 16, 9, 16, '#9a6038', 0.3, 3, 41, Math.PI * 0.55);
    } });
    [[-8, -28, 2.4, 1.7], [-1, -30, 2, 1.5], [6, -27, 2.2, 1.6], [-4, -24, 1.9, 1.4], [2, -23, 1.7, 1.3], [-11, -23, 1.6, 1.2]].forEach(([x, y, rx, ry]) => {
      re(ctx, x, y + B, rx, ry, '#fff4e0', '#ecdcc0', null, { cel: [0.4, 0.4], noStroke: true });
    });
    // ── 脖子與胸前白毛 ──
    rs(ctx, (c) => { c.moveTo(4, -31 + B); c.quadraticCurveTo(8, -40 + B, 12, -42 + B); c.lineTo(20, -36 + B); c.quadraticCurveTo(16, -28 + B, 14, -20 + B); c.quadraticCurveTo(8, -22 + B, 4, -31 + B); c.closePath(); }, '#d8986a', '#ae7448', '#ffd4a8', { cel: [1.5, 1.5], rim: 1.4, lw: 2.4 });
    rs(ctx, (c) => { c.moveTo(11, -32 + B); c.lineTo(17, -31 + B); c.lineTo(16, -27 + B); c.lineTo(17.5, -24 + B); c.lineTo(14.5, -23 + B); c.lineTo(14.5, -20 + B); c.quadraticCurveTo(11, -24 + B, 11, -32 + B); c.closePath(); }, '#fff4e0', '#ecdcc0', null, { cel: [0.6, 0.6], lw: 1.6 });
    // ── 頭 ──
    [[6, -52, -0.5], [20, -52, 0.5]].forEach(([x, y, r]) => {
      re(ctx, x, y + B, 3.8, 7.4, '#d8986a', '#ae7448', '#ffd4a8', { rot: r, cel: [0.8, 0.8], lw: 2 });
      re(ctx, x + (r < 0 ? 0.4 : -0.4), y + 1 + B, 1.9, 4.6, '#ffc0b0', '#f0a090', null, { rot: r, cel: [0.3, 0.3], noStroke: true });
      line(ctx, [[x - r * 2, y + 2 + B], [x - r * 3, y - 2 + B]], '#ffffff', 0.9, 0.8);
    });
    re(ctx, 14, -40 + B, 11, 10, '#d8986a', '#ae7448', '#ffd4a8', { cel: [2, 2], rim: 1.6, lw: 2.6, tex: (c) => {
      fur(c, 11, -44 + B, 8, 5, 8, '#9a6038', 0.3, 2.4, 53, Math.PI * 0.6);
    } });
    re(ctx, 20, -35.5 + B, 6, 4.4, '#fff4e0', '#ecdcc0', null, { cel: [0.8, 0.8], noStroke: true });
    // 額頭的一撮毛
    rs(ctx, (c) => { c.moveTo(9, -48 + B); c.quadraticCurveTo(11, -53 + B, 13, -50 + B); c.quadraticCurveTo(15, -54 + B, 16.5, -49 + B); c.quadraticCurveTo(13, -47 + B, 9, -48 + B); c.closePath(); }, '#d8986a', '#ae7448', null, { cel: [0.5, 0.5], lw: 1.6 });
    // 藍緞帶項圈＋小金鈴
    rs(ctx, (c) => { c.moveTo(7, -32 + B); c.quadraticCurveTo(13, -26.5 + B, 19, -31 + B); c.lineTo(18.6, -28 + B); c.quadraticCurveTo(13, -23.5 + B, 7.5, -29 + B); c.closePath(); }, '#8fd3f4', '#5aa8d0', '#e0f6ff', { cel: [0.5, 1], rim: 0.8, lw: 1.6 });
    const sw = Math.sin(t * 3) * 0.25;
    ctx.save();
    ctx.translate(14, -26 + B);
    ctx.rotate(sw);
    rs(ctx, (c) => { c.moveTo(-2.6, 3.2); c.quadraticCurveTo(-2.6, -1, 0, -1); c.quadraticCurveTo(2.6, -1, 2.6, 3.2); c.closePath(); }, '#ffd35a', '#d8a020', '#fff4b0', { cel: [0.6, 0.5], rim: 0.6, lw: 1.3 });
    dot(ctx, 0, 3.6, 0.9, '#8a5a1a');
    ctx.restore();
    // 擔心的眉毛＋水汪汪的眼睛
    qline(ctx, 12, -46.5 + B, 15, -48.5 + B, 18.5, -48 + B, null, 1.6);
    eye2(ctx, 15, -41 + B, 3.4, 4.4, '#7a4a28', blink, 1);
    if (!blink) {
      ctx.save();
      ctx.globalAlpha *= 0.7;
      ctx.strokeStyle = A.c('#bfe8ff');
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(15.7, -40.6 + B, 2.6, 3.6, 0, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      ctx.restore();
    }
    re(ctx, 23.4, -36.5 + B, 2.6, 2.1, '#3a2418', '#24150e', null, { cel: [0.4, 0.4], noStroke: true, gloss: [22.8, -37.3 + B, 0.9, 0.6, -0.3, 0.9] });
    qline(ctx, 19, -32.5 + B, 20.5, -33.5 + B, 22, -32.5 + B, null, 1.4);
    A.blush(ctx, 11, -35 + B, 3);
    // 眼淚：從眼角滑下來
    const k = (t * 1.2) % 1;
    ctx.save();
    ctx.globalAlpha *= k < 0.8 ? 1 : (1 - k) * 5;
    rs(ctx, (c) => { const y = -36 + B + k * 8; c.moveTo(18, y - 2.6); c.quadraticCurveTo(19.6, y, 18, y + 1.4); c.quadraticCurveTo(16.4, y, 18, y - 2.6); c.closePath(); }, '#bfe8ff', '#6ac0ec', null, { cel: [0.3, 0.3], noStroke: true });
    ctx.restore();
    dot(ctx, 18.8, -38.4 + B, 0.9, '#bfe8ff', 0.9);
  }

  // 鼴鼠礦工：絨毛紫灰身體、芥末黃吊帶工作褲（口袋縫線、金扣、沾了土），戴著有頭燈的黃色安全帽，粉紅大爪子握著鐵鏟
  function mole(ctx, t) {
    const B = Math.sin(t * 2.2) * 1;
    const bodyP = (c) => c.ellipse(0, -20 + B, 18, 20, 0, 0, TAU);
    // 腳趾
    re(ctx, -7, -1, 5, 2.4, '#ffb3c8', '#e88aa8', null, { cel: [0.6, 0.6], lw: 1.8 });
    re(ctx, 8, -1, 5, 2.4, '#ffb3c8', '#e88aa8', null, { cel: [0.6, 0.6], lw: 1.8 });
    // ── 身體（絨毛）──
    rs(ctx, bodyP, '#7a6a8a', '#54466a', '#bcaed4', { cel: [3, 3], rim: 1.8, lw: 2.8, tex: (c) => {
      fur(c, 0, -26 + B, 16, 12, 26, '#4a3c5e', 0.4, 2.4, 61, Math.PI * 0.5);
      re(c, 5, -27 + B, 8, 5, '#a898bc', '#8a7aa0', null, { cel: [1, 1], noStroke: true });
    } });
    // ── 吊帶工作褲（裁在身體裡）──
    ctx.save();
    ctx.beginPath();
    bodyP(ctx);
    ctx.clip();
    rs(ctx, (c) => { c.moveTo(-20, -9 + B); c.quadraticCurveTo(-8, -7 + B, -3, -9 + B); c.lineTo(-3, -19 + B); c.lineTo(11, -19 + B); c.lineTo(11, -9 + B); c.quadraticCurveTo(16, -7 + B, 20, -9 + B); c.lineTo(20, 4); c.lineTo(-20, 4); c.closePath(); }, '#c8944a', '#9a6a30', '#f0c888', { cel: [2, 2], rim: 1.2, lw: 2.2, tex: (c) => {
      qline(c, 4, -8 + B, 4.5, -3, 4, 2, '#9a6a30', 1, 0.8);
      re(c, -9, -3 + B, 3, 1.6, '#8a6a40', null, null, { noStroke: true });
    } });
    rs(ctx, (c) => A.roundRect(c, 0, -17 + B, 8, 5.5, 2), '#b8843e', '#9a6a30', null, { cel: [1, 1], lw: 1.5 });
    stitches(ctx, [[1, -15.6 + B], [7, -15.6 + B]], '#fff0c0');
    ctx.restore();
    // 吊帶與金扣
    stick(ctx, [[-2, -19 + B], [-7, -30 + B], [-11, -35 + B]], '#9a6a30', 1.6);
    stick(ctx, [[10, -19 + B], [12, -24 + B]], '#9a6a30', 1.6);
    rs(ctx, (c) => A.roundRect(c, -3.7, -20.5 + B, 3.4, 3.4, 1), '#ffd35a', '#d8a020', null, { cel: [0.4, 0.4], lw: 1 });
    rs(ctx, (c) => A.roundRect(c, 8.3, -20.5 + B, 3.4, 3.4, 1), '#ffd35a', '#d8a020', null, { cel: [0.4, 0.4], lw: 1 });
    // ── 鐵鏟：木柄、T 形握把、帶鉚釘和泥土的鏟面 ──
    stick(ctx, [[18, -4], [24, -40]], '#b8824a', 2.4);
    line(ctx, [[19.5, -10], [23.8, -36]], '#e0b078', 0.8, 0.8);
    stick(ctx, [[20.5, -41], [27.5, -39.5]], '#8a5a30', 2.4);
    rs(ctx, (c) => { c.moveTo(17, -5); c.lineTo(28.5, -7); c.quadraticCurveTo(29, 0, 26, 5); c.quadraticCurveTo(20, 7.5, 15.5, 6); c.quadraticCurveTo(14.5, 0, 17, -5); c.closePath(); }, '#c8d0d8', '#8a92a0', '#ffffff', { cel: [1.5, 1.5], rim: 1.2, lw: 2, tex: (c) => {
      re(c, 21, 5, 6, 2.2, '#8a6a40', null, null, { noStroke: true });
      line(c, [[18, -2], [26, -3.5]], '#a8b0bc', 0.9, 0.9);
    } });
    dot(ctx, 19.5, -4.5, 0.9, '#5a6270');
    dot(ctx, 25.5, -5.6, 0.9, '#5a6270');
    // 粉紅大爪子握著鏟柄
    re(ctx, 17, -20 + B, 6.4, 5.4, '#ffb3c8', '#e88aa8', '#ffe4ee', { cel: [1.2, 1.2], rim: 1, lw: 2 });
    [[19.5, -24.5], [22.5, -22], [23, -18.5]].forEach(([x, y]) => re(ctx, x, y + B, 1.8, 1.2, '#fff8f0', '#e0d4c8', null, { cel: [0.3, 0.3], lw: 1 }));
    // ── 臉 ──
    ctx.save();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -29.5 + B, 2.4, Math.PI * 1.15, Math.PI * 1.85);
    ctx.moveTo(12.3, -30.8 + B);
    ctx.arc(10, -29.5 + B, 2.4, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();
    // 臉頰的泥土
    re(ctx, -4, -22 + B, 2.6, 1.3, '#5a4a3a', null, null, { noStroke: true });
    dot(ctx, -1.5, -20.5 + B, 0.7, '#5a4a3a');
    A.blush(ctx, 1, -24.5 + B, 3);
    // 鬍鬚＋閃亮的粉紅鼻子
    re(ctx, 14, -26 + B, 4.2, 3.2, '#ff8aa8', '#e0668a', '#ffd0dc', { cel: [0.8, 0.8], rim: 0.8, lw: 1.8, gloss: [12.8, -27.2 + B, 1.4, 0.8, -0.4, 0.8] });
    // ── 安全帽＋頭燈 ──
    rs(ctx, (c) => { c.moveTo(-12, -38 + B); c.quadraticCurveTo(-12, -46 + B, 2, -46 + B); c.quadraticCurveTo(16, -46 + B, 16, -38 + B); c.closePath(); }, '#ffcf3a', '#d8a010', '#fff4b0', { cel: [1.5, 1.5], rim: 1.3, lw: 2, tex: (c) => {
      qline(c, 2, -46 + B, 1.5, -42 + B, 2, -38 + B, '#d8a010', 1.4, 0.9);
      line(c, [[-6, -42 + B], [-4, -43 + B]], '#a87a10', 0.8, 0.7);
      line(c, [[9, -41 + B], [11, -42.5 + B]], '#a87a10', 0.8, 0.7);
    } });
    rs(ctx, (c) => A.roundRect(c, -14, -39.5 + B, 32, 3.2, 1.6), '#f0b820', '#c89010', '#fff0a0', { cel: [0.5, 1], lw: 1.8 });
    const lamp = 0.8 + Math.sin(t * 3) * 0.15;
    glow(ctx, 2, -45 + B, 10, '255,240,170', 0.35 * lamp);
    rs(ctx, (c) => A.roundRect(c, -3, -47 + B, 10, 3, 1.2), '#8a92a0', '#5a6270', null, { cel: [0.5, 0.5], lw: 1.4 });
    re(ctx, 2, -44 + B, 4, 4, '#fff6c0', '#ffe070', '#ffffff', { cel: [0.8, 0.8], rim: 0.8, lw: 1.8, gloss: [0.9, -45.2 + B, 1.3, 0.9, -0.5, 0.9] });
  }

  // 營地的房子：蘑菇屋、樹屋、晾衣繩與小燈串
  // 營地建築：第一章用這個；其他區域在 A.CAMP_DRAW[區域編號] 註冊自己的畫法
  A.CAMP_DRAW = A.CAMP_DRAW || {};
  A.drawCampHouses = function (ctx, x1, x2, y, t, region) {
    if (region && region !== 1 && A.CAMP_DRAW[region]) return A.CAMP_DRAW[region](ctx, x1, x2, y, t);
    const mid = (x1 + x2) / 2;
    // 樹屋
    const tx = x1 + 30;
    ctx.fillStyle = A.c('#7a5234');
    ctx.fillRect(tx - 10, y - 200, 20, 200);
    A.shape(ctx, (c) => { for (let i = 0; i < 7; i++) c.arc(tx + Math.cos(i) * 40, y - 230 + Math.sin(i * 1.7) * 20, 36, 0, Math.PI * 2); }, '#6aa84a', '#4f8a36', { noStroke: true, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, tx - 34, y - 190, 68, 46, 6), '#c8905a', '#a8703c', { cel: [4, 3] });
    A.shape(ctx, (c) => { c.moveTo(tx - 42, y - 188); c.lineTo(tx, y - 222); c.lineTo(tx + 42, y - 188); c.closePath(); }, '#b8502e', '#8a3a20', { cel: [3, 3] });
    A.shape(ctx, (c) => A.roundRect(c, tx - 8, y - 174, 16, 22, 7), '#ffe8a0', null, { lw: 2.2, hl: false });
    ctx.strokeStyle = A.c('#6b4428');
    ctx.lineWidth = 3;
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.moveTo(tx + 26, y - 140 + k * 20);
      ctx.lineTo(tx + 44, y - 140 + k * 20);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(tx + 26, y - 144);
    ctx.lineTo(tx + 26, y);
    ctx.moveTo(tx + 44, y - 144);
    ctx.lineTo(tx + 44, y);
    ctx.stroke();
    // 蘑菇屋
    const hx = x2 - 60;
    A.shape(ctx, (c) => A.roundRect(c, hx - 42, y - 80, 84, 80, 14), '#fff0d6', '#e8cfa6', { cel: [5, 3] });
    A.shape(ctx, (c) => { c.moveTo(hx - 70, y - 70); c.bezierCurveTo(hx - 70, y - 160, hx + 70, y - 160, hx + 70, y - 70); c.quadraticCurveTo(hx, y - 58, hx - 70, y - 70); c.closePath(); }, '#e8483a', '#b8302a', { cel: [6, 6] });
    [[-38, -104, 10], [14, -126, 12], [44, -92, 8], [-10, -86, 7]].forEach(([dx, dy, r]) => A.ellipse(ctx, hx + dx, y + dy, r, r * 0.8, '#fff8ee', null, { lw: 2, hl: false }));
    A.shape(ctx, (c) => { c.moveTo(hx - 14, y); c.lineTo(hx - 14, y - 36); c.quadraticCurveTo(hx, y - 50, hx + 14, y - 36); c.lineTo(hx + 14, y); c.closePath(); }, '#9a6a42', '#7a5033', { shadeY: y - 12, lw: 2.5 });
    A.ellipse(ctx, hx + 26, y - 50, 9, 9, '#ffe8a0', null, { lw: 2.5, hl: false });
    // 煙囪的煙
    for (let k = 0; k < 3; k++) {
      const ph = ((t * 0.4 + k / 3) % 1);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - ph)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(hx + 30 + Math.sin(ph * 6) * 6, y - 150 - ph * 60, 6 + ph * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // 小燈串
    ctx.strokeStyle = A.c('#5a3a22');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx + 34, y - 150);
    ctx.quadraticCurveTo(mid, y - 110, hx - 40, y - 120);
    ctx.stroke();
    for (let k = 1; k < 10; k++) {
      const u = k / 10;
      const lx = (1 - u) * (1 - u) * (tx + 34) + 2 * (1 - u) * u * mid + u * u * (hx - 40);
      const ly = (1 - u) * (1 - u) * (y - 150) + 2 * (1 - u) * u * (y - 110) + u * u * (y - 120);
      const on = 0.6 + Math.sin(t * 3 + k) * 0.4;
      const g = ctx.createRadialGradient(lx, ly + 5, 0, lx, ly + 5, 12);
      g.addColorStop(0, 'rgba(255,220,120,' + (0.6 * on).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly + 5, 12, 0, Math.PI * 2);
      ctx.fill();
      A.ellipse(ctx, lx, ly + 5, 3, 4, ['#ffd35a', '#ff9fc4', '#8fd3f4'][k % 3], null, { lw: 1.2, hl: false });
    }
    // 營地招牌
    const sx = mid - 150;
    ctx.fillStyle = A.c('#6b4428');
    ctx.fillRect(sx - 3, y - 60, 6, 60);
    A.shape(ctx, (c) => A.roundRect(c, sx - 46, y - 84, 92, 30, 6), '#c8905a', '#a8703c', { cel: [2, 2] });
    ctx.font = 'bold 16px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = A.c('#4a2e1f');
    ctx.fillText('苔光營地', sx, y - 68);
  };

  A.drawSign = function (ctx, x, y) {
    ctx.fillStyle = A.c('#6b4428');
    ctx.fillRect(x - 2.5, y - 34, 5, 34);
    A.shape(ctx, (c) => { c.moveTo(x - 18, y - 48); c.lineTo(x + 14, y - 48); c.lineTo(x + 22, y - 39); c.lineTo(x + 14, y - 30); c.lineTo(x - 18, y - 30); c.closePath(); }, '#c8905a', '#a8703c', { cel: [2, 2], lw: 2.2 });
    ctx.strokeStyle = A.c('#6b4428');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 42);
    ctx.lineTo(x + 10, y - 42);
    ctx.moveTo(x - 12, y - 36);
    ctx.lineTo(x + 4, y - 36);
    ctx.stroke();
  };

  // 彈跳菇：被踩時壓扁
  A.drawSpring = function (ctx, x, y, squash, t) {
    const sq = Math.max(0, squash);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + sq * 0.25, 1 - sq * 0.35);
    A.shape(ctx, (c) => A.roundRect(c, -8, -20, 16, 20, 6), '#fff0d6', '#e8cfa6', { cel: [3, 2] });
    A.shape(ctx, (c) => { c.moveTo(-30, -18); c.bezierCurveTo(-30, -48, 30, -48, 30, -18); c.quadraticCurveTo(0, -12, -30, -18); c.closePath(); }, '#e8483a', '#b8302a', { cel: [4, 4] });
    [[-14, -30, 5], [8, -36, 6], [20, -24, 4]].forEach(([dx, dy, r]) => A.ellipse(ctx, dx, dy, r, r * 0.8, '#fff8ee', null, { lw: 1.8, hl: false }));
    ctx.restore();
    // 往上的小箭頭，提示可以彈
    ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3;
    ctx.fillStyle = '#fff6c0';
    ctx.beginPath();
    ctx.moveTo(x, y - 70 - Math.sin(t * 4) * 4);
    ctx.lineTo(x - 7, y - 60 - Math.sin(t * 4) * 4);
    ctx.lineTo(x + 7, y - 60 - Math.sin(t * 4) * 4);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // 小生物：蝴蝶與螢火蟲
  A.drawCritter = function (ctx, c, t) {
    if (c.kind === 'firefly') {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 10);
      g.addColorStop(0, 'rgba(210,255,140,' + (0.7 + Math.sin(t * 5 + c.seed) * 0.3).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(210,255,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const flap = Math.abs(Math.sin(t * (c.flee ? 30 : 14) + c.seed));
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = A.c(c.color);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.2;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(s * 4 * flap, -2, 5 * flap + 1, 4, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = A.outline();
    ctx.fillRect(-0.8, -4, 1.6, 7);
    ctx.restore();
  };

  // 龜爺爺：坐著的老烏龜。殼上一塊塊有年輪的甲片，長滿青苔、小草、一朵小花和一顆小蘑菇；
  // 垂下來的蓬鬆白眉、一把長長的白鬍子，脖子上有皺紋，瞇著眼笑
  function turtle(ctx, t) {
    const B = Math.sin(t * 1.2) * 0.8;
    const blink = Math.sin(t * 0.6) > 0.9;
    // ── 腳 ──
    [[-16, -2], [12, -2]].forEach(([x, y]) => {
      re(ctx, x, y, 8.4, 4, '#8fbf6a', '#6a9a4a', '#c8e8a0', { cel: [1, 1], rim: 0.8, lw: 2, tex: (c) => {
        dot(c, x - 3, y - 1.5, 1.2, '#6a9a4a', 0.8);
        dot(c, x + 1, y - 2, 1, '#6a9a4a', 0.8);
      } });
      [x + 3, x + 6].forEach((nx) => re(ctx, nx, y + 1.5, 1.3, 1, '#f4ecd8', null, null, { lw: 0.9 }));
    });
    // ── 殼 ──
    const shellP = (c) => { c.moveTo(-30, -6); c.quadraticCurveTo(-30, -44 + B, 0, -46 + B); c.quadraticCurveTo(26, -44 + B, 24, -6); c.closePath(); };
    rs(ctx, shellP, '#6a8f4a', '#46652c', '#b8e090', { cel: [4, 3], rim: 2, bounce: '#8fb86a', lw: 3, tex: (c) => {
      // 每塊甲片中心亮一點，外圈有年輪
      [[-2, -18, 8, 6], [-20, -16, 6, 5], [15, -18, 5, 5], [-4, -36, 9, 4], [-19, -32, 4, 3], [12, -33, 4, 3]].forEach(([x, y, rx, ry], i) => {
        re(c, x, y + B * 0.6, rx, ry, '#7aa058', null, null, { noStroke: true });
        c.save();
        c.globalAlpha *= 0.4;
        c.strokeStyle = A.c('#4e6e34');
        c.lineWidth = 0.9;
        c.beginPath();
        c.ellipse(x, y + B * 0.6, rx + 2.2, ry + 2, 0, 0, TAU);
        c.stroke();
        c.restore();
      });
      c.save();
      c.strokeStyle = A.c('#3a5424');
      c.lineWidth = 1.8;
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(-14, -8); c.lineTo(-10, -26 + B); c.lineTo(4, -30 + B); c.lineTo(10, -10);
      c.moveTo(-10, -26 + B); c.lineTo(-24, -24 + B);
      c.moveTo(4, -30 + B); c.lineTo(16, -26 + B);
      c.moveTo(-10, -26 + B); c.lineTo(-14, -42 + B);
      c.moveTo(4, -30 + B); c.lineTo(8, -44 + B);
      c.stroke();
      c.restore();
    } });
    // 青苔：一團團毛茸茸的苔、草、小花和小蘑菇
    const mossP = (c) => {
      c.moveTo(-24, -33 + B);
      c.quadraticCurveTo(-25, -39 + B, -20, -40 + B);
      c.quadraticCurveTo(-19, -46 + B, -13, -45 + B);
      c.quadraticCurveTo(-10, -50 + B, -4, -48.5 + B);
      c.quadraticCurveTo(1, -51 + B, 5, -47.5 + B);
      c.quadraticCurveTo(10, -47 + B, 10, -43.5 + B);
      c.quadraticCurveTo(4, -41 + B, 0, -42.5 + B);
      c.quadraticCurveTo(-3, -39 + B, -8, -41 + B);
      c.quadraticCurveTo(-12, -37 + B, -16, -38.5 + B);
      c.quadraticCurveTo(-19, -33 + B, -24, -33 + B);
      c.closePath();
    };
    rs(ctx, mossP, '#8fcf5a', '#5a9e3e', '#d8f8a8', { cel: [1, 1.5], rim: 1.2, lw: 2, tex: (c) => {
      [[-19, -40], [-13, -43], [-7, -45], [-1, -46], [4, -45], [-16, -37]].forEach(([x, y]) => dot(c, x, y + B, 0.9, '#4f8a36', 0.8));
      [[-17, -42], [-9, -46], [2, -48]].forEach(([x, y]) => dot(c, x, y + B, 1.1, '#e8ffc0', 0.8));
    } });
    [[-18, -45.5, -0.4], [-11, -49, -0.1], [-2, -50, 0.25]].forEach(([x, y, a]) => {
      const s = Math.sin(t * 2 + x) * 0.15;
      line(ctx, [[x, y + 2 + B], [x + Math.sin(a + s) * 3.5, y - 2 + B]], '#6ab04a', 1.3);
    });
    // 小蘑菇
    stick(ctx, [[8.5, -44 + B], [8.5, -49 + B]], '#fff0d6', 1.4);
    rs(ctx, (c) => { c.moveTo(4.5, -48.5 + B); c.quadraticCurveTo(8.5, -55 + B, 12.5, -48.5 + B); c.closePath(); }, '#e8483a', '#b8302a', '#ffa090', { cel: [0.6, 0.6], rim: 0.6, lw: 1.4, tex: (c) => dot(c, 7.5, -50.5 + B, 0.8, '#ffffff') });
    // 小花
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      dot(ctx, -8 + Math.cos(a) * 1.8, -50.5 + B + Math.sin(a) * 1.8, 1.4, '#ffffff');
    }
    dot(ctx, -8, -50.5 + B, 1, '#ffd35a');
    // ── 腹甲邊 ──
    rs(ctx, (c) => A.roundRect(c, -31, -10, 57, 8, 4), '#dcc890', '#b8a46a', '#fff4d0', { cel: [1, 1.5], rim: 1, lw: 2, tex: (c) => {
      [-20, -9, 2, 13].forEach((x) => line(c, [[x, -10], [x + 1, -2]], '#a8945a', 1, 0.8));
    } });
    // ── 頭與脖子 ──
    rs(ctx, (c) => { c.moveTo(14, -12); c.quadraticCurveTo(14, -26 + B, 22, -30 + B); c.lineTo(30, -24 + B); c.quadraticCurveTo(26, -14, 24, -8); c.closePath(); }, '#9fcf7a', '#74a454', '#d0f0b0', { cel: [1.5, 1.5], rim: 1, lw: 2.4, tex: (c) => {
      [0, 1, 2].forEach((i) => qline(c, 15 + i, -15 - i * 4 + B * 0.5, 20, -13 - i * 4 + B * 0.5, 25 - i * 0.5, -16 - i * 4 + B * 0.5, '#6a9a4a', 1, 0.8));
    } });
    re(ctx, 26, -30 + B, 12, 11, '#9fcf7a', '#74a454', '#d8f8b8', { cel: [2, 2], rim: 1.4, lw: 2.6, tex: (c) => {
      dot(c, 20, -36 + B, 1, '#74a454', 0.8);
      dot(c, 23, -38.5 + B, 0.8, '#74a454', 0.8);
      dot(c, 18, -32 + B, 0.9, '#74a454', 0.8);
    } });
    // 長長的白鬍子（跟著呼吸晃一點）
    const sw = Math.sin(t * 1.2 + 0.6) * 1;
    rs(ctx, (c) => { c.moveTo(21, -23 + B); c.quadraticCurveTo(24, -19 + B, 27, -20 + B); c.quadraticCurveTo(31, -19 + B, 35, -23 + B); c.quadraticCurveTo(35, -12 + B, 29 + sw, -4 + B); c.quadraticCurveTo(28, -8 + B, 26 + sw * 0.5, -10 + B); c.quadraticCurveTo(22, -14 + B, 21, -23 + B); c.closePath(); }, '#ffffff', '#dcdce4', null, { cel: [1, 1.5], lw: 1.8, tex: (c) => {
      qline(c, 25, -19 + B, 27, -13 + B, 28 + sw, -7 + B, '#c8c8d4', 0.9, 0.9);
      qline(c, 30, -19 + B, 31, -13 + B, 29.5 + sw, -8 + B, '#c8c8d4', 0.9, 0.9);
    } });
    qline(ctx, 25, -24 + B, 28, -22 + B, 31, -24.5 + B, null, 1.5);
    // 蓬鬆垂下的白眉
    rs(ctx, (c) => { c.moveTo(20, -36 + B); c.quadraticCurveTo(22, -41 + B, 27, -39.5 + B); c.quadraticCurveTo(31, -41 + B, 33, -37 + B); c.quadraticCurveTo(35, -34 + B, 34, -32 + B); c.quadraticCurveTo(31, -35 + B, 28, -35 + B); c.quadraticCurveTo(24, -34.5 + B, 20, -36 + B); c.closePath(); }, '#ffffff', '#dcdce4', null, { cel: [0.6, 0.8], lw: 1.6 });
    // 瞇瞇眼
    if (blink) {
      A.eye(ctx, 28, -31 + B, 2.4, 1.2, 'closed', 1);
    } else {
      ctx.save();
      ctx.fillStyle = A.c('#2b1a12');
      ctx.beginPath();
      ctx.ellipse(28.5, -31.5 + B, 2.2, 1.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      dot(ctx, 27.8, -32 + B, 0.7, '#ffffff');
      qline(ctx, 25.5, -32.5 + B, 28.5, -34 + B, 31.5, -32.5 + B, null, 1.6);
    }
    qline(ctx, 30, -29.5 + B, 31.5, -28.5 + B, 32.5, -29.8 + B, '#74a454', 0.9);
    dot(ctx, 36, -31 + B, 0.8, '#3a5424');
    A.blush(ctx, 32, -26.5 + B, 2.6);
  }

  // 小栗：刺蝟婆婆的孫子。鱗片紋的橡實帽歪戴著，臉頰貼著 OK 繃，手裡揮著當成寶劍的小樹枝，一直蹦蹦跳跳
  function hedgekid(ctx, t) {
    const B = -Math.abs(Math.sin(t * 4)) * 5;
    const blink = Math.sin(t * 1.3 + 2) > 0.97;
    const spikes = (c, r1, r2, ph) => {
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * 0.6 + ((i + ph) / 12) * Math.PI * 1.4;
        const r = i % 2 ? r1 : r2;
        const x = -3 + Math.cos(a) * r;
        const y = -18 + B + Math.sin(a) * r * 0.9;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
    };
    rs(ctx, (c) => spikes(c, 14, 20, 0.5), '#6a4e3c', '#523a2a', null, { cel: [1.5, 1.5], lw: 2.2 });
    rs(ctx, (c) => spikes(c, 15, 21, 0), '#8a6a52', '#654a36', '#c8a488', { cel: [2, 2], rim: 1.6, lw: 2.4, tex: (c) => {
      for (let i = 0; i <= 12; i += 2) {
        const a = Math.PI * 0.6 + (i / 12) * Math.PI * 1.4;
        const ca = Math.cos(a);
        const sa = Math.sin(a) * 0.9;
        line(c, [[-3 + ca * 16, -18 + B + sa * 16], [-3 + ca * 20.5, -18 + B + sa * 20.5]], '#f4e4cc', 1.8, 0.85);
      }
    } });
    // 臉與身體
    re(ctx, 3, -15 + B, 13, 14, '#f0d4b0', '#d4b08a', '#fff6ea', { cel: [2, 2], rim: 1.5, bounce: '#f8e4c8', lw: 2.6, tex: (c) => {
      fur(c, 3, -12 + B, 11, 10, 12, '#c8a47a', 0.4, 2.4, 71, Math.PI * 0.5);
    } });
    // 腳
    re(ctx, -2, -1, 4.4, 2.6, '#f0d4b0', '#d4b08a', '#fff4e4', { cel: [0.8, 0.8], lw: 1.8 });
    re(ctx, 8, -1, 4.4, 2.6, '#f0d4b0', '#d4b08a', '#fff4e4', { cel: [0.8, 0.8], lw: 1.8 });
    // ── 小樹枝寶劍（跟著跳躍揮一下）──
    const sw = Math.sin(t * 4) * 0.25;
    ctx.save();
    ctx.translate(17, -5 + B);
    ctx.rotate(0.45 + sw);
    stick(ctx, [[0, 0], [0, -17]], '#a8784a', 1.8);
    line(ctx, [[0.3, -7], [3, -10]], '#8a5a30', 1.3);
    rs(ctx, (c) => { c.moveTo(0, -16); c.quadraticCurveTo(5, -20, 4, -24); c.quadraticCurveTo(-1, -21, 0, -16); c.closePath(); }, '#8fd05a', '#5a9e3e', null, { cel: [0.5, 0.5], lw: 1.3 });
    ctx.restore();
    re(ctx, 17, -5 + B, 3.4, 3, '#f0d4b0', '#d4b08a', null, { cel: [0.6, 0.6], lw: 1.6 });
    // ── 臉 ──
    eye2(ctx, 6, -19 + B, 2.7, 3.2, '#7a4a28', blink, 1);
    eye2(ctx, 12.5, -19 + B, 2.5, 3, '#7a4a28', blink, 1);
    re(ctx, 16.2, -15.2 + B, 2.2, 1.8, '#3a2418', '#24150e', null, { cel: [0.3, 0.3], noStroke: true, gloss: [15.6, -15.9 + B, 0.8, 0.5, -0.3, 0.9] });
    // 張嘴大笑
    rs(ctx, (c) => { c.moveTo(8.5, -12.5 + B); c.quadraticCurveTo(12, -12 + B, 14.5, -13 + B); c.quadraticCurveTo(13.5, -8 + B, 11, -8.5 + B); c.quadraticCurveTo(8.5, -9.5 + B, 8.5, -12.5 + B); c.closePath(); }, '#8a2a2a', null, null, { lw: 1.4, tex: (c) => re(c, 11.5, -8.8 + B, 2.4, 1.6, '#ff8a9a', null, null, { noStroke: true }) });
    A.blush(ctx, 5, -12.5 + B, 2.4);
    // 臉頰的 OK 繃
    ctx.save();
    ctx.translate(-1.5, -14 + B);
    ctx.rotate(-0.5);
    rs(ctx, (c) => A.roundRect(c, -3.6, -1.5, 7.2, 3, 1.4), '#ffe0b8', '#f0c890', null, { cel: [0.3, 0.3], lw: 1 });
    [[-2.4, -0.4], [-2.4, 0.5], [2.4, -0.4], [2.4, 0.5]].forEach(([x, y]) => dot(ctx, x, y, 0.35, '#c89a6a'));
    ctx.restore();
    // ── 鱗片紋的橡實帽（歪歪的）──
    rs(ctx, (c) => { c.moveTo(-8, -26 + B); c.quadraticCurveTo(2, -40 + B, 12, -26 + B); c.quadraticCurveTo(2, -23 + B, -8, -26 + B); c.closePath(); }, '#9a6a3a', '#6a4220', '#d8a468', { cel: [1.2, 1.2], rim: 1.2, lw: 2, tex: (c) => {
      for (let r = 0; r < 4; r++) for (let k = -4; k <= 4; k++) {
        const x = 2 + k * 3 + (r % 2) * 1.5;
        const y = -34 + r * 2.6 + B;
        qline(c, x - 1.4, y, x, y + 1.6, x + 1.4, y, '#5a3818', 0.8, 0.75);
      }
    } });
    rs(ctx, (c) => { c.moveTo(-8.5, -26.5 + B); c.quadraticCurveTo(2, -29 + B, 12.5, -26.5 + B); c.quadraticCurveTo(12, -24 + B, 11, -24 + B); c.quadraticCurveTo(2, -26 + B, -7.5, -24 + B); c.quadraticCurveTo(-9, -25 + B, -8.5, -26.5 + B); c.closePath(); }, '#b8844a', '#8a5a30', null, { cel: [0.5, 0.5], lw: 1.6 });
    stick(ctx, [[2, -33 + B], [4, -38 + B]], '#7a5030', 1.4);
    rs(ctx, (c) => { c.moveTo(4, -37 + B); c.quadraticCurveTo(9, -41 + B, 11, -37 + B); c.quadraticCurveTo(7, -35 + B, 4, -37 + B); c.closePath(); }, '#8fd05a', '#5a9e3e', null, { cel: [0.4, 0.4], lw: 1.2 });
  }

  // 菇菇：服侍女王的小蘑菇侍女。粉紅傘蓋上別著白色荷葉邊頭飾和小蝴蝶結，穿著蕾絲圍裙和小圓頭鞋，
  // 雙手在身前捧著一朵小黃花，害羞的大眼睛
  function mushgirl(ctx, t) {
    const sway = Math.sin(t * 2) * 0.05;
    const blink = Math.sin(t * 0.8) > 0.96;
    ctx.save();
    ctx.rotate(sway);
    // 小圓頭鞋
    re(ctx, -4.5, -1, 3.8, 2.2, '#8a3a5a', '#6a2440', '#d87aa0', { cel: [0.5, 0.5], lw: 1.6 });
    re(ctx, 5, -1, 3.8, 2.2, '#8a3a5a', '#6a2440', '#d87aa0', { cel: [0.5, 0.5], lw: 1.6 });
    // ── 菇柄身體 ──
    re(ctx, 0, -12, 11, 13, '#fff4e4', '#e4ceb0', '#ffffff', { cel: [2, 2], rim: 1.4, bounce: '#ffe8f0', lw: 2.6, tex: (c) => {
      [-6, -2, 3, 7].forEach((x) => qline(c, x, -24, x + 0.6, -12, x - 0.4, 0, '#ecdcc4', 0.9, 0.8));
    } });
    // 蕾絲圍裙
    rs(ctx, (c) => {
      c.moveTo(-7, -8);
      c.quadraticCurveTo(0, -6, 7, -8);
      c.quadraticCurveTo(9.5, -4, 9.5, 0);
      for (let i = 0; i < 5; i++) c.quadraticCurveTo(7.6 - i * 3.8, 2.4, 5.7 - i * 3.8, 0);
      c.quadraticCurveTo(-9.5, -4, -7, -8);
      c.closePath();
    }, '#ffffff', '#e8e0ee', null, { cel: [1, 1.2], lw: 1.5, tex: (c) => {
      qline(c, -6.5, -3.5, 0, -2, 6.5, -3.5, '#f4b8d0', 1, 0.9);
      for (let i = 0; i < 5; i++) dot(c, 7.6 - i * 3.8, 0.4, 0.6, '#f4b8d0', 0.9);
    } });
    // ── 害羞的臉 ──
    eye2(ctx, -4, -14, 2.8, 3.5, '#c0608a', blink, 1);
    eye2(ctx, 5, -14, 2.8, 3.5, '#c0608a', blink, 1);
    if (!blink) {
      line(ctx, [[-7, -16.2], [-8.4, -17.2]], null, 1.1);
      line(ctx, [[8, -16.2], [9.4, -17.2]], null, 1.1);
    }
    qline(ctx, -0.5, -9.8, 0.7, -8.8, 1.9, -9.8, null, 1.3);
    A.blush(ctx, -7, -9.5, 2.6);
    A.blush(ctx, 8, -9.5, 2.6);
    // 捧著小黃花的雙手
    for (let i = 0; i < 5; i++) {
      const a = i * 1.256 + 0.3;
      re(ctx, -1 + Math.cos(a) * 3, -5 + Math.sin(a) * 3, 2.3, 2.3, '#ffe14a', '#e8b820', null, { cel: [0.5, 0.5], lw: 1.1 });
    }
    re(ctx, -1, -5, 1.7, 1.7, '#ff8a3a', '#d86a20', null, { cel: [0.4, 0.4], noStroke: true, gloss: [-1.6, -5.6, 0.6, 0.4, 0, 0.9] });
    re(ctx, -4.5, -2, 2.4, 2, '#fff4e4', '#e4ceb0', null, { cel: [0.4, 0.4], lw: 1.4 });
    re(ctx, 2.5, -2, 2.4, 2, '#fff4e4', '#e4ceb0', null, { cel: [0.4, 0.4], lw: 1.4 });
    // ── 粉紅傘蓋 ──
    const capP = (c) => { c.moveTo(-22, -24); c.quadraticCurveTo(-22, -52, 0, -52); c.quadraticCurveTo(22, -52, 22, -24); c.quadraticCurveTo(0, -18, -22, -24); c.closePath(); };
    rs(ctx, capP, '#ff9fc4', '#dc6f98', '#ffe0ee', { cel: [3, 3], rim: 2, bounce: '#ffc4dc', lw: 2.8, tex: (c) => {
      re(c, -9, -40, 4.4, 3.2, '#fff6fa', '#f4d4e2', null, { cel: [0.6, 0.8], noStroke: true });
      re(c, 8, -44, 3.4, 2.6, '#fff6fa', '#f4d4e2', null, { cel: [0.5, 0.6], noStroke: true });
      re(c, 13, -33, 2.8, 2.2, '#fff6fa', '#f4d4e2', null, { cel: [0.5, 0.5], noStroke: true });
      re(c, -17, -31, 2.2, 1.8, '#fff6fa', '#f4d4e2', null, { cel: [0.4, 0.4], noStroke: true });
      re(c, -1, -48, 2, 1.5, '#fff6fa', '#f4d4e2', null, { cel: [0.4, 0.4], noStroke: true });
    } });
    gloss(ctx, -11, -45, 4.5, 2, -0.6, 0.45);
    // 白色荷葉邊頭飾（戴在傘蓋頂上）
    const hb = (x) => -52 + (x / 22) * (x / 22) * 10;
    rs(ctx, (c) => {
      c.moveTo(-13, hb(-13) + 2.4);
      c.quadraticCurveTo(0, -50.5, 13, hb(13) + 2.4);
      c.lineTo(13, hb(13) - 1);
      for (let i = 0; i < 6; i++) {
        const x0 = 13 - (i * 26) / 6;
        const x1 = 13 - ((i + 1) * 26) / 6;
        c.quadraticCurveTo((x0 + x1) / 2, hb((x0 + x1) / 2) - 5, x1, hb(x1) - 1);
      }
      c.closePath();
    }, '#ffffff', '#ece4f0', null, { cel: [0.6, 0.8], lw: 1.6, tex: (c) => {
      for (let i = 1; i < 6; i++) {
        const x = 13 - (i * 26) / 6;
        line(c, [[x, hb(x) - 1.5], [x, hb(x) + 1.2]], '#e0d4e8', 0.8);
      }
      qline(c, -13, hb(-13) + 1.2, 0, -51.5, 13, hb(13) + 1.2, '#f4b8d0', 0.9, 0.9);
    } });
    // 小蝴蝶結
    rs(ctx, (c) => { c.moveTo(13, -48); c.lineTo(8.5, -52); c.lineTo(9, -45); c.closePath(); }, '#e2447a', '#b82a5a', '#ff9ac0', { cel: [0.5, 0.5], rim: 0.6, lw: 1.3 });
    rs(ctx, (c) => { c.moveTo(13, -48); c.lineTo(18, -51); c.lineTo(17, -44.5); c.closePath(); }, '#e2447a', '#b82a5a', '#ff9ac0', { cel: [0.5, 0.5], rim: 0.6, lw: 1.3 });
    re(ctx, 13, -48, 1.8, 1.8, '#f0609a', '#c83a6a', null, { cel: [0.3, 0.3], lw: 1.2 });
    ctx.restore();
  }

  // 其他檔案（npcs2.js）可以往 A.NPC_DRAW 裡加新的 NPC
  const NPC_DRAW = (A.NPC_DRAW = { owl, hedgehog, squirrel, frog, fawn, mole, turtle, hedgekid, mushgirl });

  A.drawNpc = function (ctx, npc, t, marker, noTag) {
    ctx.save();
    ctx.translate(npc.x, npc.y);
    A.groundShadow(ctx, 0, 0, 24);
    const fn = NPC_DRAW[npc.def.art];
    if (fn) fn(ctx, t);
    ctx.restore();
    if (!noTag) A.nameTag(ctx, npc.x, npc.y + 14, npc.def.name, '#ffe9a8');
    if (marker) {
      // 大一點、會發光、會一跳一跳的「！／？」：遠遠就看得到這個人有委託
      const done = marker === '?';
      const y = npc.y - 104 - Math.abs(Math.sin(t * 3.2)) * 10;
      const pulse = 1 + Math.sin(t * 6) * 0.07;
      const rgb = done ? '125,255,122' : '255,216,74';
      ctx.save();
      const g = ctx.createRadialGradient(npc.x, y, 2, npc.x, y, 38 * pulse);
      g.addColorStop(0, 'rgba(' + rgb + ',0.55)');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(npc.x, y, 38 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(npc.x, y);
      ctx.scale(pulse, pulse);
      ctx.font = 'bold 48px ' + A.NUMFONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#4a2e1f';
      ctx.strokeText(marker, 0, 0);
      ctx.fillStyle = done ? '#7dff7a' : '#ffd84a';
      ctx.fillText(marker, 0, 0);
      ctx.restore();
    }
  };

  A.drawChest = function (ctx, ch, t) {
    if (ch.style && A.propChest) {
      // 地圖上擺的寶箱：沒開時淡淡閃光提示可以開；開了之後蓋子往後掀、看得到裡面
      ctx.save();
      ctx.translate(ch.x, ch.y);
      ctx.scale(1.1, 1.1);
      if (!ch.opened) {
        const g = 0.16 + Math.sin(t * 3) * 0.07;
        const gr = ctx.createRadialGradient(0, -18, 2, 0, -18, 36);
        gr.addColorStop(0, 'rgba(255,230,120,' + g.toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(255,230,120,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(0, -18, 36, 0, Math.PI * 2);
        ctx.fill();
        A.propChest(ctx, t, ch);
      } else {
        // 蓋子：以後緣為軸往後翻
        ctx.save();
        ctx.translate(20, -22);
        ctx.rotate(0.95);
        ctx.translate(-20, 22);
        ctx.beginPath();
        ctx.rect(-40, -60, 80, 38);
        ctx.clip();
        A.propChest(ctx, t, ch);
        ctx.restore();
        // 箱身＋黑黑的箱內
        ctx.save();
        ctx.beginPath();
        ctx.rect(-40, -22, 80, 40);
        ctx.clip();
        A.propChest(ctx, t, ch);
        ctx.restore();
        A.shape(ctx, (c) => { c.moveTo(-19, -22); c.lineTo(19, -22); c.lineTo(16, -18); c.lineTo(-16, -18); c.closePath(); }, '#2a1a10', null, { lw: 1.4, hl: false });
      }
      ctx.restore();
      return;
    }
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

  A.drawPortal = function (ctx, x, y, t, label) {
    ctx.save();
    ctx.translate(x, y);
    // 光柱
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(0, -190, 0, 0);
    beam.addColorStop(0, 'rgba(140,220,255,0)');
    beam.addColorStop(1, 'rgba(160,230,255,' + (0.35 + Math.sin(t * 3) * 0.1).toFixed(3) + ')');
    ctx.fillStyle = beam;
    ctx.fillRect(-34, -190, 68, 190);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-8, -190, 16, 190);
    // 往上飄的光點
    for (let i = 0; i < 10; i++) {
      const k = (t * 0.6 + i / 10) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = i % 2 ? '#c9f0ff' : '#e8d4ff';
      ctx.beginPath();
      ctx.arc(Math.sin(i * 2.3 + t * 2) * 22, -k * 170, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // 地面光圈
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'rgba(150,220,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 40 + Math.sin(t * 4) * 3, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.scale(1.35, 1.35);
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
    // 上下彈跳的箭頭與目的地
    const ay = y - 150 + Math.sin(t * 4) * 6;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2a4a7a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, ay - 12);
    ctx.lineTo(x - 11, ay + 2);
    ctx.lineTo(x - 4, ay + 2);
    ctx.lineTo(x - 4, ay + 12);
    ctx.lineTo(x + 4, ay + 12);
    ctx.lineTo(x + 4, ay + 2);
    ctx.lineTo(x + 11, ay + 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    if (label) A.nameTag(ctx, x, y + 16, '→ ' + label, '#bfe8ff');
  };

  A.PROJ_DRAW = A.PROJ_DRAW || {};
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
    } else if (p.kind === 'spirit') {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
      g.addColorStop(0, 'rgba(230,255,252,1)');
      g.addColorStop(0.4, 'rgba(120,230,220,0.8)');
      g.addColorStop(1, 'rgba(95,208,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.scale(p.dir, 1);
      A.shape(ctx, (c) => { c.moveTo(9, 0); c.quadraticCurveTo(0, -9, -14, -2 + Math.sin(t * 20) * 2); c.quadraticCurveTo(0, 9, 9, 0); c.closePath(); }, '#8ff0e8', '#5fd0c8', { lw: 2, hl: false });
    } else if (p.kind === 'feather') {
      ctx.scale(p.dir, 1);
      ctx.rotate(Math.sin(t * 30 + p.seed) * 0.08);
      A.shape(ctx, (c) => { c.moveTo(12, 0); c.quadraticCurveTo(0, -6, -12, -1); c.quadraticCurveTo(0, 5, 12, 0); c.closePath(); }, '#d8ff9a', '#a8d04a', { lw: 2, hl: false });
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-34, 0);
      ctx.stroke();
    } else if (p.kind === 'sporeBomb') {
      A.ellipse(ctx, 0, 0, 10, 10, '#c9a0e8', '#9a70c0', { lw: 2.2 });
    } else if (A.PROJ_DRAW[p.kind]) {
      // 新章節的投射物畫在 monsters2.js 等檔案裡
      A.PROJ_DRAW[p.kind](ctx, p, t);
    }
    ctx.restore();
  };

  A.ZONE_DRAW = A.ZONE_DRAW || {};
  A.drawZone = function (ctx, z, t) {
    if (z.kind && A.ZONE_DRAW[z.kind]) return A.ZONE_DRAW[z.kind](ctx, z, t);
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
