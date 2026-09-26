// 第二、三章的營地建築。註冊到 A.CAMP_DRAW[區域編號]，由 A.drawCampHouses 呼叫。
// 風格比照第一章的樹屋與蘑菇屋：平塗、深棕描邊（A.shape）、月牙陰影、暖色燈光。
// 必須在 js/art/npcs.js 之後載入。
(function () {
  'use strict';
  const A = G.art;
  A.CAMP_DRAW = A.CAMP_DRAW || {};
  const PI2 = Math.PI * 2;

  function glow(ctx, x, y, r, a, rgb) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + (rgb || '255,220,120') + ',' + a.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + (rgb || '255,220,120') + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, PI2);
    ctx.fill();
  }

  // 與第一章相同樣式的營地招牌
  function campSign(ctx, sx, y, text) {
    ctx.fillStyle = A.c('#6b4428');
    ctx.fillRect(sx - 3, y - 60, 6, 60);
    A.shape(ctx, (c) => A.roundRect(c, sx - 46, y - 84, 92, 30, 6), '#c8905a', '#a8703c', { cel: [2, 2] });
    ctx.font = 'bold 16px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = A.c('#4a2e1f');
    ctx.fillText(text, sx, y - 68);
  }

  // 一條下垂的線，回傳線上第 u 點的座標
  function sag(x1, y1, x2, y2, drop) {
    const mx = (x1 + x2) / 2;
    const my = Math.max(y1, y2) + drop;
    return {
      draw(ctx, col, lw) {
        ctx.strokeStyle = A.c(col);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(mx, my, x2, y2);
        ctx.stroke();
      },
      at(u) {
        return [
          (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2,
          (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2,
        ];
      },
    };
  }

  // ── 第二章：燈塔岬 ──
  A.CAMP_DRAW[2] = function (ctx, x1, x2, y, t) {
    const mid = (x1 + x2) / 2;

    // 燈塔（左）
    const lx = x1 + 50;
    const H = 250;
    // 石砌底座
    A.shape(ctx, (c) => A.roundRect(c, lx - 50, y - 26, 100, 26, 6), '#b8b0a4', '#9a9286', { cel: [4, 2] });
    ctx.strokeStyle = A.c('rgba(90,80,70,0.45)');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx - 48, y - 13); ctx.lineTo(lx + 48, y - 13);
    for (let k = -2; k <= 2; k++) { ctx.moveTo(lx + k * 20 + (k % 2 ? 10 : 0), y - 26); ctx.lineTo(lx + k * 20 + (k % 2 ? 10 : 0), y - 13); }
    ctx.stroke();
    // 塔身：白底紅條紋
    const tower = (c) => { c.moveTo(lx - 36, y - 24); c.lineTo(lx - 24, y - H); c.lineTo(lx + 24, y - H); c.lineTo(lx + 36, y - 24); c.closePath(); };
    A.shape(ctx, tower, '#fbf6ee', '#e4dccc', { cel: [8, 0], noStroke: true });
    ctx.save();
    ctx.beginPath();
    tower(ctx);
    ctx.clip();
    [[0.28, 0.14], [0.62, 0.14]].forEach(([u, hh]) => {
      const yy = y - 24 - (H - 24) * u;
      ctx.fillStyle = A.c('#e0584a');
      ctx.fillRect(lx - 50, yy - (H - 24) * hh, 100, (H - 24) * hh);
      ctx.fillStyle = A.c('#b8403a');
      ctx.fillRect(lx + 20, yy - (H - 24) * hh, 40, (H - 24) * hh);
    });
    ctx.restore();
    ctx.beginPath();
    tower(ctx);
    ctx.lineWidth = A.LW;
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    // 門與小窗
    A.shape(ctx, (c) => { c.moveTo(lx - 11, y - 24); c.lineTo(lx - 11, y - 50); c.quadraticCurveTo(lx, y - 62, lx + 11, y - 50); c.lineTo(lx + 11, y - 24); c.closePath(); }, '#5a8ab0', '#467094', { shadeY: y - 36, lw: 2.4 });
    A.ellipse(ctx, lx + 6, y - 37, 1.8, 1.8, '#ffd35a', null, { noStroke: true, hl: false });
    [y - 120, y - 190].forEach((wy) => {
      A.shape(ctx, (c) => A.roundRect(c, lx - 6, wy - 9, 12, 18, 6), '#ffe8a0', null, { lw: 2.2, hl: false });
    });
    // 瞭望台
    A.shape(ctx, (c) => A.roundRect(c, lx - 38, y - H - 8, 76, 10, 3), '#4a5a6a', '#3a4856', { lw: 2.4 });
    ctx.strokeStyle = A.c('#4a5a6a');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx - 36, y - H - 22); ctx.lineTo(lx + 36, y - H - 22);
    for (let k = -3; k <= 3; k++) { ctx.moveTo(lx + k * 11, y - H - 22); ctx.lineTo(lx + k * 11, y - H - 8); }
    ctx.stroke();
    // 燈室：亮著的燈，光束慢慢轉
    const pulse = 0.75 + Math.sin(t * 2) * 0.15;
    glow(ctx, lx, y - H - 36, 90, 0.5 * pulse);
    const c = Math.cos(t * 0.9);
    const len = 40 + Math.abs(c) * 200;
    const dir = c > 0 ? 1 : -1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createLinearGradient(lx, 0, lx + dir * len, 0);
    bg.addColorStop(0, 'rgba(255,240,170,0.45)');
    bg.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(lx, y - H - 42);
    ctx.lineTo(lx + dir * len, y - H - 70);
    ctx.lineTo(lx + dir * len, y - H - 2);
    ctx.lineTo(lx, y - H - 30);
    ctx.fill();
    ctx.restore();
    A.shape(ctx, (c) => A.roundRect(c, lx - 18, y - H - 52, 36, 32, 4), '#fff2a8', '#ffe07a', { lw: 2.4, hl: false });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx - 6, y - H - 52); ctx.lineTo(lx - 6, y - H - 20);
    ctx.moveTo(lx + 6, y - H - 52); ctx.lineTo(lx + 6, y - H - 20);
    ctx.stroke();
    A.ellipse(ctx, lx, y - H - 36, 7, 7, '#ffffff', null, { noStroke: true, hl: false });
    // 圓頂
    A.shape(ctx, (c) => { c.moveTo(lx - 24, y - H - 50); c.quadraticCurveTo(lx - 22, y - H - 80, lx, y - H - 82); c.quadraticCurveTo(lx + 22, y - H - 80, lx + 24, y - H - 50); c.closePath(); }, '#e0584a', '#b8403a', { cel: [4, 3] });
    A.ellipse(ctx, lx, y - H - 86, 4, 4, '#4a5a6a', null, { lw: 2, hl: false });

    // 船屋（右）
    const hx = x2 - 90;
    // 木樁與平台
    A.shape(ctx, (c) => A.roundRect(c, hx - 88, y - 10, 176, 10, 3), '#a07a52', '#86623e', { lw: 2.4, hl: false });
    // 牆
    A.shape(ctx, (c) => A.roundRect(c, hx - 72, y - 96, 144, 88, 4), '#7a9ab4', '#62829c', { cel: [6, 3] });
    ctx.strokeStyle = A.c('rgba(40,60,80,0.35)');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 1; k < 7; k++) { ctx.moveTo(hx - 70, y - 96 + k * 12.5); ctx.lineTo(hx + 70, y - 96 + k * 12.5); }
    ctx.stroke();
    // 大門（可以把船推出去的那種）
    A.shape(ctx, (c) => { c.moveTo(hx - 34, y - 8); c.lineTo(hx - 34, y - 62); c.lineTo(hx + 10, y - 62); c.lineTo(hx + 10, y - 8); c.closePath(); }, '#8a6446', '#6e4e36', { shadeY: y - 30, lw: 2.5 });
    ctx.strokeStyle = A.c('#5a3e28');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx - 12, y - 62); ctx.lineTo(hx - 12, y - 8);
    ctx.moveTo(hx - 34, y - 62); ctx.lineTo(hx - 12, y - 30); ctx.moveTo(hx + 10, y - 62); ctx.lineTo(hx - 12, y - 30);
    ctx.stroke();
    // 亮著的圓窗
    glow(ctx, hx + 40, y - 56, 30, 0.35 + Math.sin(t * 2.5) * 0.08);
    A.ellipse(ctx, hx + 40, y - 56, 13, 13, '#ffe8a0', null, { lw: 3, hl: false });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + 27, y - 56); ctx.lineTo(hx + 53, y - 56); ctx.moveTo(hx + 40, y - 69); ctx.lineTo(hx + 40, y - 43);
    ctx.stroke();
    // 屋頂
    A.shape(ctx, (c) => { c.moveTo(hx - 90, y - 92); c.lineTo(hx, y - 146); c.lineTo(hx + 90, y - 92); c.lineTo(hx + 80, y - 86); c.lineTo(hx, y - 132); c.lineTo(hx - 80, y - 86); c.closePath(); }, '#e0584a', '#b8403a', { cel: [4, 3] });
    A.shape(ctx, (c) => { c.moveTo(hx - 80, y - 88); c.lineTo(hx, y - 134); c.lineTo(hx + 80, y - 88); c.closePath(); }, '#f4ece0', '#dcd2c4', { cel: [3, 2], lw: 2.4 });
    // 屋頂上的舵輪裝飾
    ctx.strokeStyle = A.c('#8a6446');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx, y - 108, 10, 0, PI2);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * PI2; ctx.moveTo(hx + Math.cos(a) * 4, y - 108 + Math.sin(a) * 4); ctx.lineTo(hx + Math.cos(a) * 15, y - 108 + Math.sin(a) * 15); }
    ctx.stroke();
    // 牆上掛的浮球與救生圈
    A.ellipse(ctx, hx - 54, y - 70, 7, 8, '#f08a4a', '#c8663a', { lw: 2, hl: false });
    A.ellipse(ctx, hx - 54, y - 48, 7, 8, '#ffd35a', '#e0b030', { lw: 2, hl: false });
    A.shape(ctx, (c) => { c.arc(hx + 58, y - 26, 12, 0, PI2); c.moveTo(hx + 64, y - 26); c.arc(hx + 58, y - 26, 6, 0, PI2, true); }, '#fff6ee', null, { lw: 2.2, hl: false });
    ctx.strokeStyle = A.c('#e0584a');
    ctx.lineWidth = 5;
    [0, 1, 2, 3].forEach((k) => {
      ctx.beginPath();
      ctx.arc(hx + 58, y - 26, 9, k * Math.PI / 2 + 0.2, k * Math.PI / 2 + 0.6);
      ctx.stroke();
    });
    // 曬漁網的架子（船屋左邊）
    const nx = hx - 150;
    ctx.fillStyle = A.c('#8a6446');
    ctx.fillRect(nx - 36, y - 80, 5, 80);
    ctx.fillRect(nx + 32, y - 80, 5, 80);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.strokeRect(nx - 36, y - 80, 5, 80);
    ctx.strokeRect(nx + 32, y - 80, 5, 80);
    const sway = Math.sin(t * 1.2) * 3;
    A.shape(ctx, (c) => { c.moveTo(nx - 33, y - 78); c.lineTo(nx + 34, y - 78); c.quadraticCurveTo(nx + 30 + sway, y - 44, nx + 22 + sway, y - 30); c.quadraticCurveTo(nx + sway, y - 40, nx - 24 + sway, y - 32); c.quadraticCurveTo(nx - 30 + sway, y - 50, nx - 33, y - 78); c.closePath(); }, 'rgba(111,156,146,0.55)', null, { lw: 1.8, hl: false });
    ctx.strokeStyle = A.c('rgba(60,90,84,0.6)');
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = -30; k <= 30; k += 8) { ctx.moveTo(nx + k, y - 78); ctx.lineTo(nx + k * 0.8 + sway, y - 34); }
    for (let k = 0; k < 4; k++) { ctx.moveTo(nx - 32, y - 70 + k * 10); ctx.lineTo(nx + 32 + sway * (k / 4), y - 70 + k * 10); }
    ctx.stroke();
    [-24, -8, 8, 24].forEach((k) => A.ellipse(ctx, nx + k, y - 78, 3.5, 3, '#f08a4a', null, { lw: 1.4, hl: false }));
    // 倒放的小船
    A.shape(ctx, (c) => { c.moveTo(mid + 150, y); c.quadraticCurveTo(mid + 150, y - 28, mid + 196, y - 30); c.lineTo(mid + 250, y - 30); c.quadraticCurveTo(mid + 262, y - 16, mid + 256, y); c.closePath(); }, '#5a8ab0', '#467094', { cel: [3, 2] });
    ctx.fillStyle = A.c('#fbf6ee');
    ctx.fillRect(mid + 160, y - 12, 92, 4);

    // 燈塔瞭望台拉到船屋的小旗子
    const line = sag(lx + 36, y - H - 16, hx - 84, y - 92, 40);
    line.draw(ctx, '#5a3a22', 1.5);
    for (let k = 1; k < 14; k++) {
      const [fx, fy] = line.at(k / 14);
      const col = ['#e0584a', '#fff6ee', '#5a8ab0', '#ffd35a'][k % 4];
      const fl = Math.sin(t * 3 + k) * 2;
      A.shape(ctx, (c) => { c.moveTo(fx - 6, fy); c.lineTo(fx + 6, fy); c.lineTo(fx + fl, fy + 13); c.closePath(); }, col, null, { lw: 1.4, hl: false });
    }
    // 船屋屋簷下的小燈串
    const lights = sag(hx - 80, y - 88, mid + 40, y - 120, 16);
    lights.draw(ctx, '#5a3a22', 1.5);
    for (let k = 1; k < 7; k++) {
      const [px, py] = lights.at(k / 7);
      const on = 0.6 + Math.sin(t * 3 + k) * 0.4;
      glow(ctx, px, py + 5, 12, 0.6 * on);
      A.ellipse(ctx, px, py + 5, 3, 4, ['#ffd35a', '#8fd3f4', '#ff9fc4'][k % 3], null, { lw: 1.2, hl: false });
    }
    campSign(ctx, mid - 150, y, '燈塔岬');
  };

  // ── 第三章：溫泉谷 ──
  A.CAMP_DRAW[3] = function (ctx, x1, x2, y, t) {
    const mid = (x1 + x2) / 2;

    // 溫泉旅館（右）
    const ix = x2 - 130;
    const W = 230;
    // 石基
    A.shape(ctx, (c) => A.roundRect(c, ix - W / 2 - 6, y - 16, W + 12, 16, 4), '#a8a49a', '#8a867c', { cel: [4, 2] });
    // 牆：白灰泥＋木柱
    A.shape(ctx, (c) => A.roundRect(c, ix - W / 2, y - 112, W, 98, 2), '#f4ead8', '#e0d4bc', { cel: [6, 2] });
    ctx.fillStyle = A.c('#7a4a30');
    for (let k = 0; k <= 5; k++) ctx.fillRect(ix - W / 2 + k * (W / 5) - 4, y - 112, 8, 98);
    ctx.fillRect(ix - W / 2, y - 112, W, 8);
    ctx.fillRect(ix - W / 2, y - 60, W, 5);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = A.LW;
    ctx.strokeRect(ix - W / 2, y - 112, W, 98);
    // 亮著燈的紙窗
    const lit = 0.85 + Math.sin(t * 1.7) * 0.08;
    [[-2, 0], [2, 0], [-2, 1], [2, 1]].forEach(([col, row]) => {
      const wx = ix + col * (W / 5) - (W / 5) / 2 + (col > 0 ? 0 : W / 5) - 20;
      const wy = row ? y - 52 : y - 100;
      glow(ctx, wx + 20, wy + 18, 40, 0.28 * lit);
      A.shape(ctx, (c) => A.roundRect(c, wx, wy, 40, 34, 2), '#ffe8b0', '#ffd890', { lw: 2.2, hl: false, shadeY: wy + 26 });
      ctx.strokeStyle = A.c('#8a5a3a');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 1; k < 4; k++) { ctx.moveTo(wx + k * 10, wy); ctx.lineTo(wx + k * 10, wy + 34); }
      ctx.moveTo(wx, wy + 11); ctx.lineTo(wx + 40, wy + 11); ctx.moveTo(wx, wy + 23); ctx.lineTo(wx + 40, wy + 23);
      ctx.stroke();
    });
    // 入口與暖簾
    A.shape(ctx, (c) => A.roundRect(c, ix - 34, y - 86, 68, 72, 2), '#5a3a2a', '#4a2e20', { lw: 2.4, hl: false });
    glow(ctx, ix, y - 40, 50, 0.3 * lit);
    const sw = Math.sin(t * 1.4) * 2;
    for (let k = 0; k < 3; k++) {
      const nx0 = ix - 32 + k * 22;
      A.shape(ctx, (c) => { c.moveTo(nx0, y - 86); c.lineTo(nx0 + 20, y - 86); c.lineTo(nx0 + 20 + sw, y - 46); c.lineTo(nx0 + sw, y - 46); c.closePath(); }, '#3a4a8a', '#2e3a70', { lw: 2, hl: false, shadeY: y - 54 });
    }
    ctx.font = 'bold 20px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = A.c('#fff6ee');
    ctx.fillText('湯', ix + sw * 0.5, y - 66);
    // 屋頂：瓦片、兩端上翹
    const roof = (c) => {
      c.moveTo(ix - W / 2 - 40, y - 104);
      c.quadraticCurveTo(ix - W / 2 - 10, y - 110, ix - W / 2 + 10, y - 128);
      c.lineTo(ix - W / 2 + 50, y - 168);
      c.lineTo(ix + W / 2 - 50, y - 168);
      c.lineTo(ix + W / 2 - 10, y - 128);
      c.quadraticCurveTo(ix + W / 2 + 10, y - 110, ix + W / 2 + 40, y - 104);
      c.quadraticCurveTo(ix + W / 2 + 10, y - 118, ix, y - 116);
      c.quadraticCurveTo(ix - W / 2 - 10, y - 118, ix - W / 2 - 40, y - 104);
      c.closePath();
    };
    A.shape(ctx, roof, '#5e6e84', '#4a586c', { cel: [5, 4] });
    ctx.save();
    ctx.beginPath();
    roof(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c('rgba(30,40,55,0.35)');
    ctx.lineWidth = 2;
    for (let k = -8; k <= 8; k++) {
      ctx.beginPath();
      ctx.moveTo(ix + k * 16, y - 168);
      ctx.lineTo(ix + k * 22, y - 110);
      ctx.stroke();
    }
    ctx.restore();
    A.shape(ctx, (c) => A.roundRect(c, ix - W / 2 + 40, y - 176, W - 80, 10, 4), '#4a586c', '#3a4658', { lw: 2.4, hl: false });
    A.shape(ctx, (c) => { c.moveTo(ix - W / 2 + 34, y - 172); c.quadraticCurveTo(ix - W / 2 + 30, y - 186, ix - W / 2 + 22, y - 188); c.lineTo(ix - W / 2 + 44, y - 176); c.closePath(); }, '#4a586c', null, { lw: 2, hl: false });
    A.shape(ctx, (c) => { c.moveTo(ix + W / 2 - 34, y - 172); c.quadraticCurveTo(ix + W / 2 - 30, y - 186, ix + W / 2 - 22, y - 188); c.lineTo(ix + W / 2 - 44, y - 176); c.closePath(); }, '#4a586c', null, { lw: 2, hl: false });
    // 屋簷下的紅燈籠
    [ix - W / 2 - 16, ix + W / 2 + 16].forEach((lx, k) => {
      const bob = Math.sin(t * 1.6 + k * 2) * 1.5;
      ctx.strokeStyle = A.c('#3a2a20');
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx, y - 110); ctx.lineTo(lx, y - 96 + bob); ctx.stroke();
      glow(ctx, lx, y - 82 + bob, 36, 0.5 * lit, '255,170,110');
      A.shape(ctx, (c) => A.roundRect(c, lx - 5, y - 97 + bob, 10, 4, 1), '#3a2a20', null, { lw: 1.4, hl: false });
      A.ellipse(ctx, lx, y - 82 + bob, 10, 13, '#e8503a', '#c03a2a', { lw: 2.2, hl: false });
      ctx.strokeStyle = A.c('rgba(255,210,150,0.8)');
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lx - 9, y - 86 + bob); ctx.lineTo(lx + 9, y - 86 + bob); ctx.moveTo(lx - 9, y - 78 + bob); ctx.lineTo(lx + 9, y - 78 + bob); ctx.stroke();
      A.shape(ctx, (c) => A.roundRect(c, lx - 5, y - 70 + bob, 10, 4, 1), '#3a2a20', null, { lw: 1.4, hl: false });
    });
    // 招牌掛在屋簷
    A.shape(ctx, (c) => A.roundRect(c, ix - 44, y - 140, 88, 22, 3), '#3a2a20', null, { lw: 2.2, hl: false });
    ctx.font = 'bold 14px ' + A.FONT;
    ctx.fillStyle = A.c('#ffe0a0');
    ctx.fillText('溫泉の宿', ix, y - 129);

    // 露天溫泉（左）
    const px = x1 + 110;
    // 竹籬笆
    for (let k = 0; k < 9; k++) {
      const bx = px - 110 + k * 12;
      A.shape(ctx, (c) => A.roundRect(c, bx, y - 96 + (k % 2) * 6, 10, 96, 4), '#9ac070', '#7aa050', { cel: [2, 0], lw: 1.8, hl: false });
    }
    ctx.strokeStyle = A.c('#6b4428');
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(px - 114, y - 70); ctx.lineTo(px - 2, y - 70); ctx.moveTo(px - 114, y - 34); ctx.lineTo(px - 2, y - 34); ctx.stroke();
    // 池子
    const rim = (c) => c.ellipse(px, y - 8, 96, 18, 0, 0, PI2);
    A.shape(ctx, rim, '#9a948a', '#7e786e', { lw: 2.6, hl: false, shadeY: y - 2 });
    A.shape(ctx, (c) => c.ellipse(px, y - 10, 82, 12, 0, 0, PI2), '#8fe0da', '#6ccac4', { lw: 2.2, hl: false, shadeY: y - 6 });
    ctx.fillStyle = A.c('rgba(255,255,255,0.7)');
    ctx.fillRect(px - 40 + Math.sin(t) * 6, y - 15, 30, 2);
    ctx.fillRect(px + 16 - Math.sin(t) * 6, y - 11, 18, 2);
    // 池邊的石頭
    [[-92, -12, 14], [-70, -4, 11], [84, -10, 15], [60, -2, 10], [-30, 2, 9], [20, 4, 11]].forEach(([dx, dy, r]) => A.ellipse(ctx, px + dx, y + dy, r, r * 0.65, '#b0aa9e', '#8e887c', { lw: 2.2, hl: false, cel: [2, 2] }));
    // 木桶
    const bx = px + 64;
    A.shape(ctx, (c) => { c.moveTo(bx - 13, y - 44); c.lineTo(bx + 13, y - 44); c.lineTo(bx + 10, y - 20); c.lineTo(bx - 10, y - 20); c.closePath(); }, '#d8a870', '#b88a54', { cel: [3, 0], lw: 2.3 });
    ctx.strokeStyle = A.c('#6a6a74');
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(bx - 12, y - 38); ctx.lineTo(bx + 12, y - 38); ctx.moveTo(bx - 11, y - 26); ctx.lineTo(bx + 11, y - 26); ctx.stroke();
    A.ellipse(ctx, bx, y - 44, 13, 3, '#9fe0dc', null, { lw: 1.8, hl: false });
    A.shape(ctx, (c) => A.roundRect(c, bx + 12, y - 52, 4, 14, 2), '#b88a54', null, { lw: 1.6, hl: false });
    // 熱氣
    for (let k = 0; k < 7; k++) {
      const ph = (t * 0.3 + k / 7) % 1;
      const sx = px - 60 + ((k * 37) % 120) + Math.sin(ph * 5 + k) * 10;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * Math.sin(ph * Math.PI)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(sx, y - 16 - ph * 110, 10 + ph * 22, 0, PI2);
      ctx.fill();
    }

    // 燈籠串：籬笆到旅館
    const line = sag(px - 4, y - 100, ix - W / 2 - 16, y - 110, 26);
    line.draw(ctx, '#3a2a20', 1.5);
    for (let k = 1; k < 8; k++) {
      const [lx, ly] = line.at(k / 8);
      const on = 0.7 + Math.sin(t * 2.4 + k) * 0.3;
      glow(ctx, lx, ly + 8, 16, 0.55 * on, '255,180,110');
      A.ellipse(ctx, lx, ly + 8, 5, 7, k % 2 ? '#e8503a' : '#ffd88a', null, { lw: 1.4, hl: false });
    }
    // 小石燈籠
    const sx = mid + 150;
    A.shape(ctx, (c) => A.roundRect(c, sx - 12, y - 8, 24, 8, 2), '#a8a49a', '#86827a', { lw: 2.2 });
    A.shape(ctx, (c) => A.roundRect(c, sx - 5, y - 30, 10, 22, 2), '#a8a49a', '#86827a', { lw: 2.2 });
    A.shape(ctx, (c) => A.roundRect(c, sx - 12, y - 46, 24, 16, 3), '#a8a49a', '#86827a', { lw: 2.2 });
    glow(ctx, sx, y - 38, 26, 0.5 * lit);
    A.shape(ctx, (c) => A.roundRect(c, sx - 6, y - 43, 12, 9, 2), '#ffd88a', null, { lw: 1.6, hl: false });
    A.shape(ctx, (c) => { c.moveTo(sx - 20, y - 46); c.quadraticCurveTo(sx, y - 60, sx + 20, y - 46); c.closePath(); }, '#a8a49a', '#86827a', { lw: 2.2 });

    campSign(ctx, mid - 150, y, '溫泉谷');
  };
})();
