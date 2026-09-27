// 營地建築（第三版）：五個區域各自的聚落，覆寫 A.drawCampHouses。
// 每個營地分成兩層：
//   ・靜態層：房子、菜園、攤位、柵欄……第一次畫的時候預先畫進離屏畫布（每區一張，只留目前這區）
//   ・動態層：煙、蒸氣、旗子、晾的衣服、燈光、水、螢火蟲、小鳥，每幀重畫
// NPC 站在 x ≈ 860–1640（營地 x1=800、x2=1700），營火在正中間偏左 20。
// 建築都畫在 NPC 後面（world.js 先畫營地再畫 NPC），但 NPC 腳邊不放箱子、桶子這類前景雜物，
// 牆面也避開跟 NPC 同色系的顏色，免得角色「融進」背景裡。
// 必須在 js/art/npcs.js、camps2.js、npcs3.js 之後載入。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const OLD = A.drawCampHouses;

  // ════════ 靜態層快取 ════════
  const PAD = 320;
  const TOP = 460;
  const BOT = 40;
  const SC = 2;
  let cache = null;
  // 土地變老（見 background.js 檔尾）：營地所在的地圖變老時，靜態層在畫進快取時調色，
  // 動態層走同一套顏色調色，螢火蟲、飛鳥少一大半。
  let campAge = null;
  let livingK = 1;
  // 第三章打完：第一章營地龜爺爺的位置只剩一張空椅子
  let emptyChairOn = false;

  function staticLayer(ctx, region, x1, x2, y, build) {
    const key = region + '|' + x1 + '|' + x2 + '|' + y + '|' + (campAge ? campAge.key : '') + '|' + (emptyChairOn ? 'chair' : '');
    if (!cache || cache.key !== key) {
      const w = x2 - x1 + PAD * 2;
      const h = TOP + BOT;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(w * SC);
      cv.height = Math.ceil(h * SC);
      const c = cv.getContext('2d');
      const mode = A.mode;
      A.mode = null;
      c.save();
      c.scale(SC, SC);
      c.translate(-(x1 - PAD), -(y - TOP));
      c.lineCap = 'round';
      c.lineJoin = 'round';
      try {
        // 變老的營地：畫進快取時每個顏色先經過調色
        if (campAge && A.withAgeProfile) A.withAgeProfile(c, campAge, () => build(c, x1, x2, y));
        else build(c, x1, x2, y);
      } finally {
        c.restore();
        A.mode = mode;
      }
      cache = { key, cv, x: x1 - PAD, y: y - TOP, w, h };
    }
    // 只貼鏡頭看得到的那一段（每幀縮貼整張 3000px 的畫布太浪費）
    let vx1 = cache.x;
    let vx2 = cache.x + cache.w;
    const cam = G.cam;
    if (cam && G.W && isFinite(cam.x)) {
      vx1 = Math.max(vx1, Math.floor(cam.x - 60));
      vx2 = Math.min(vx2, Math.ceil(cam.x + G.W + 60));
    }
    if (vx2 <= vx1) return;
    ctx.drawImage(cache.cv, (vx1 - cache.x) * SC, 0, (vx2 - vx1) * SC, cache.h * SC, vx1, cache.y, vx2 - vx1, cache.h);
  }

  // ════════ 小工具 ════════
  const S = (ctx, path, fill, shade, opts) => A.shape(ctx, path, fill, shade, opts);
  const RR = (c, x, y, w, h, r) => A.roundRect(c, x, y, w, h, r);
  const E = (ctx, x, y, rx, ry, fill, shade, opts) => A.ellipse(ctx, x, y, rx, ry, fill, shade, opts);
  const NOHL = { hl: false };

  // 在 (x, y) 為原點的區域座標裡畫（A.shape 的月牙陰影只蓋得到 ±500，所以每棟房子都要平移過去畫）
  function at(ctx, x, y, fn) {
    ctx.save();
    ctx.translate(x, y);
    fn(ctx);
    ctx.restore();
  }
  function glow(ctx, x, y, r, a, rgb) {
    if (a <= 0.002) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + (rgb || '255,214,130') + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + (rgb || '255,214,130') + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function line(ctx, pts, col, lw) {
    ctx.strokeStyle = col ? A.c(col) : A.outline();
    ctx.lineWidth = lw || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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
  function text(ctx, s, x, y, size, col, weight) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = A.c(col);
    ctx.fillText(s, x, y);
  }
  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  // 下垂的繩子：回傳 at(u)、draw()
  function sag(x1, y1, x2, y2, drop) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 + drop;
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

  // ── 動態的小東西 ──
  function smoke(ctx, x, y, t, n, rgb, rise, size, drift) {
    for (let k = 0; k < n; k++) {
      const ph = (t * 0.28 + k / n) % 1;
      const a = 0.5 * Math.sin(ph * Math.PI);
      ctx.fillStyle = 'rgba(' + (rgb || '240,240,240') + ',' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x + Math.sin(ph * 5 + k) * 5 + ph * (drift == null ? 16 : drift), y - ph * (rise || 80), (size || 6) + ph * (size || 6) * 1.8, 0, TAU);
      ctx.fill();
    }
  }
  function steam(ctx, x, y, t, n, spread, rise, a0) {
    for (let k = 0; k < n; k++) {
      const ph = (t * 0.32 + k / n + hash(k) * 0.3) % 1;
      const sx = x + (hash(k * 3.1) - 0.5) * spread + Math.sin(ph * 5 + k) * 7;
      const a = (a0 || 0.45) * Math.sin(ph * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(sx, y - ph * rise, 5 + ph * 14, 0, TAU);
      ctx.fill();
    }
  }
  function fireflies(ctx, cx, cy, w, h, t, n, rgb) {
    n = Math.round(n * livingK);
    for (let k = 0; k < n; k++) {
      const s = hash(k + 7.3);
      const fx = cx + (hash(k * 1.7) - 0.5) * w + Math.sin(t * (0.5 + s * 0.6) + k * 2) * 18;
      const fy = cy + (hash(k * 2.9) - 0.5) * h + Math.cos(t * (0.7 + s * 0.4) + k) * 10;
      const on = 0.5 + 0.5 * Math.sin(t * (2 + s * 2) + k * 1.3);
      glow(ctx, fx, fy, 9, 0.55 * on, rgb || '220,255,150');
      dot(ctx, fx, fy, 1.4, 'rgba(255,255,220,' + (0.4 + on * 0.6).toFixed(2) + ')');
    }
  }
  // 停著的小圓鳥：偶爾低頭啄一下、甩甩尾巴
  function perchBird(ctx, x, y, t, seed, col, dir) {
    const peck = Math.max(0, Math.sin(t * 1.3 + seed * 3) - 0.85) * 12;
    const hop = Math.max(0, Math.sin(t * 0.7 + seed)) > 0.97 ? -3 : 0;
    ctx.save();
    ctx.translate(x, y + hop);
    ctx.scale(dir || 1, 1);
    S(ctx, (c) => { c.moveTo(-6, -4); c.lineTo(-12, -7 + Math.sin(t * 6 + seed) * 1.2); c.lineTo(-11, -2); c.closePath(); }, col, null, { lw: 1.2, hl: false });
    E(ctx, 0, -5, 6.5, 5.2, col, null, { lw: 1.4, hl: false });
    E(ctx, 3, -3.5, 3.5, 2.5, '#fff6e8', null, { noStroke: true, hl: false });
    ctx.save();
    ctx.translate(4, -8);
    ctx.rotate(peck * 0.08);
    E(ctx, 0, 0, 4, 3.6, col, null, { lw: 1.4, hl: false });
    dot(ctx, 1.5, -0.8, 0.9, '#2a1a10');
    S(ctx, (c) => { c.moveTo(3.5, -0.5); c.lineTo(6.5, 0.5); c.lineTo(3.5, 1.3); c.closePath(); }, '#f4a640', null, { lw: 0.8, hl: false });
    ctx.restore();
    line(ctx, [[-1, 0], [-1, 1.5]], '#c07a30', 1);
    line(ctx, [[2, 0], [2, 1.5]], '#c07a30', 1);
    ctx.restore();
  }
  // 飛過的小鳥（遠景，V 字）
  function flyBirds(ctx, x1, x2, yTop, t, n, col) {
    n = Math.round(n * livingK);
    for (let k = 0; k < n; k++) {
      const sp = 30 + hash(k * 4.1) * 20;
      const span = x2 - x1 + 400;
      const bx = x1 - 200 + ((t * sp + hash(k) * span) % span);
      const by = yTop + hash(k * 9.3) * 60 + Math.sin(t * 0.8 + k) * 8;
      const f = Math.sin(t * 8 + k * 2) * 4;
      ctx.strokeStyle = A.c(col || 'rgba(70,60,70,0.55)');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx - 7, by - f);
      ctx.quadraticCurveTo(bx - 3, by - 2, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 2, bx + 7, by - f);
      ctx.stroke();
    }
  }
  // 一串三角小旗
  function bunting(ctx, rope, t, cols, n, size) {
    for (let k = 1; k < n; k++) {
      const [fx, fy] = rope.at(k / n);
      const fl = Math.sin(t * 3 + k * 1.3) * 2.2;
      const s = size || 6;
      S(ctx, (c) => { c.moveTo(fx - s, fy); c.lineTo(fx + s, fy); c.lineTo(fx + fl, fy + s * 2.1); c.closePath(); }, cols[k % cols.length], null, { lw: 1.3, hl: false });
    }
  }
  // 一串小燈泡
  function bulbs(ctx, rope, t, n, cols, rgb) {
    for (let k = 1; k < n; k++) {
      const [px, py] = rope.at(k / n);
      const on = 0.65 + Math.sin(t * 2.6 + k * 1.7) * 0.35;
      glow(ctx, px, py + 5, 13, 0.55 * on, rgb);
      E(ctx, px, py + 5, 3, 4, cols[k % cols.length], null, { lw: 1.2, hl: false });
    }
  }
  // 晾衣繩上的衣服，會隨風擺
  function laundry(ctx, rope, t, items) {
    items.forEach((it, i) => {
      const [x, y] = rope.at(it.u);
      const sw = Math.sin(t * 2.2 + i * 1.7) * (it.k === 'sock' ? 0.18 : 0.08);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sw);
      const col = it.c;
      const sh = it.s || null;
      if (it.k === 'shirt') {
        S(ctx, (c) => { c.moveTo(-9, 0); c.lineTo(-15, 5); c.lineTo(-12, 10); c.lineTo(-8, 8); c.lineTo(-8, 24); c.lineTo(8, 24); c.lineTo(8, 8); c.lineTo(12, 10); c.lineTo(15, 5); c.lineTo(9, 0); c.quadraticCurveTo(0, 5, -9, 0); c.closePath(); }, col, sh, { lw: 1.6, hl: false, shadeY: 17 });
        if (it.stripe) { ctx.fillStyle = A.c(it.stripe); ctx.fillRect(-7.5, 12, 15, 3); ctx.fillRect(-7.5, 18, 15, 3); }
      } else if (it.k === 'dress') {
        S(ctx, (c) => { c.moveTo(-5, 0); c.lineTo(5, 0); c.lineTo(6, 8); c.lineTo(13, 26); c.quadraticCurveTo(0, 29, -13, 26); c.lineTo(-6, 8); c.closePath(); }, col, sh, { lw: 1.6, hl: false, shadeY: 20 });
        dot(ctx, -4, 16, 1.5, '#ffffff');
        dot(ctx, 4, 20, 1.5, '#ffffff');
        dot(ctx, 1, 12, 1.5, '#ffffff');
      } else if (it.k === 'towel') {
        S(ctx, (c) => RR(c, -8, 0, 16, 26, 2), col, sh, { lw: 1.6, hl: false, shadeY: 20 });
        ctx.fillStyle = A.c(it.stripe || '#ffffff');
        ctx.fillRect(-7, 19, 14, 2.5);
      } else if (it.k === 'sock') {
        S(ctx, (c) => { c.moveTo(-3, 0); c.lineTo(3, 0); c.lineTo(3, 11); c.quadraticCurveTo(9, 12, 8, 16); c.lineTo(-1, 16); c.quadraticCurveTo(-4, 15, -3, 11); c.closePath(); }, col, null, { lw: 1.3, hl: false });
        ctx.fillStyle = A.c(it.stripe || '#ffffff');
        ctx.fillRect(-2.5, 2, 5, 2);
      } else if (it.k === 'scarf') {
        S(ctx, (c) => { c.moveTo(-4, 0); c.lineTo(4, 0); c.lineTo(5, 32); c.lineTo(-3, 32); c.closePath(); }, col, sh, { lw: 1.5, hl: false, shadeY: 24 });
        ctx.fillStyle = A.c(it.stripe || '#ffffff');
        ctx.fillRect(-3.5, 8, 7.5, 3);
        ctx.fillRect(-3.3, 18, 7.8, 3);
        line(ctx, [[-2, 32], [-2, 36]], col, 1.2);
        line(ctx, [[1, 32], [1, 36]], col, 1.2);
        line(ctx, [[4, 32], [4, 36]], col, 1.2);
      } else if (it.k === 'mitten') {
        S(ctx, (c) => { c.moveTo(-5, 0); c.lineTo(5, 0); c.lineTo(5, 10); c.quadraticCurveTo(6, 17, 0, 17); c.quadraticCurveTo(-6, 17, -5, 10); c.closePath(); }, col, null, { lw: 1.3, hl: false });
        E(ctx, 5, 9, 2.5, 3.5, col, null, { lw: 1.1, hl: false });
        ctx.fillStyle = A.c(it.stripe || '#ffffff');
        ctx.fillRect(-4.5, 1, 9, 3);
      } else if (it.k === 'fish') {
        line(ctx, [[0, 0], [0, 4]], '#5a4030', 1);
        S(ctx, (c) => { c.moveTo(0, 4); c.quadraticCurveTo(6, 10, 0, 22); c.quadraticCurveTo(-6, 10, 0, 4); c.moveTo(0, 21); c.lineTo(5, 27); c.lineTo(-5, 27); c.closePath(); }, col, sh, { lw: 1.3, hl: false });
        dot(ctx, 0, 8, 1, '#2a1a10');
      }
      // 曬衣夾
      ctx.fillStyle = A.c('#c8905a');
      ctx.fillRect(-1.5, -2.5, 3, 5);
      ctx.restore();
    });
  }
  // 掛著的紙燈籠
  function paperLantern(ctx, x, y, t, seed, col, r, rgb) {
    r = r || 9;
    const sw = Math.sin(t * 1.5 + seed * 1.7) * 0.07;
    const lit = 0.8 + Math.sin(t * 2.3 + seed) * 0.12;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sw);
    line(ctx, [[0, 0], [0, 6]], '#3a2a20', 1.3);
    glow(ctx, 0, 6 + r * 1.3, r * 3.4, 0.5 * lit, rgb || '255,180,110');
    S(ctx, (c) => RR(c, -r * 0.5, 5, r, 3, 1), '#3a2a20', null, { lw: 1.1, hl: false });
    E(ctx, 0, 6 + r * 1.3, r, r * 1.2, col, null, { lw: 1.8, hl: false });
    ctx.globalAlpha *= 0.55;
    E(ctx, -r * 0.2, 6 + r * 1.1, r * 0.45, r * 0.7, '#fff4c8', null, { noStroke: true, hl: false });
    ctx.globalAlpha /= 0.55;
    ctx.strokeStyle = A.c('rgba(90,40,20,0.45)');
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 6 + r); ctx.lineTo(r * 0.9, 6 + r);
    ctx.moveTo(-r * 0.9, 6 + r * 1.6); ctx.lineTo(r * 0.9, 6 + r * 1.6);
    ctx.stroke();
    S(ctx, (c) => RR(c, -r * 0.5, 5 + r * 2.5, r, 3, 1), '#3a2a20', null, { lw: 1.1, hl: false });
    line(ctx, [[0, 8 + r * 2.5], [0, 14 + r * 2.5]], '#e8503a', 1.4);
    ctx.restore();
  }
  // 窗戶的暖光（靜態窗框已經畫好，這裡只疊一層會呼吸的光）
  function winGlow(ctx, x, y, r, t, seed, rgb, a) {
    const f = 0.8 + Math.sin(t * 1.9 + seed * 2.1) * 0.1 + Math.sin(t * 7.3 + seed) * 0.04;
    glow(ctx, x, y, r, (a || 0.32) * f, rgb || '255,210,130');
  }
  // 風向袋／三角旗
  function pennant(ctx, x, y, t, col, len, seed) {
    const w1 = Math.sin(t * 4 + (seed || 0)) * 3;
    const w2 = Math.sin(t * 4 + 1.2 + (seed || 0)) * 4;
    S(ctx, (c) => { c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y + 2 + w1, x + len, y + 7 + w2); c.quadraticCurveTo(x + len * 0.5, y + 10 + w1, x, y + 14); c.closePath(); }, col, null, { lw: 1.6, hl: false });
  }

  // ── 靜態的擺設 ──
  function crate(ctx, x, y, w, h, col) {
    at(ctx, x, y, (c) => {
      S(c, (p) => RR(p, -w / 2, -h, w, h, 2), col || '#c8945e', '#a8744a', { cel: [2, 1.5], lw: 2 });
      c.strokeStyle = A.c('#8a5a36');
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(-w / 2 + 3, -h + 3); c.lineTo(w / 2 - 3, -3);
      c.moveTo(-w / 2 + 2, -h / 2); c.lineTo(w / 2 - 2, -h / 2);
      c.stroke();
    });
  }
  function barrel(ctx, x, y, w, h, col) {
    at(ctx, x, y, (c) => {
      S(c, (p) => { p.moveTo(-w * 0.42, 0); p.quadraticCurveTo(-w * 0.56, -h / 2, -w * 0.42, -h); p.lineTo(w * 0.42, -h); p.quadraticCurveTo(w * 0.56, -h / 2, w * 0.42, 0); p.closePath(); }, col || '#b8804e', '#98643a', { cel: [2.5, 0], lw: 2 });
      [0.2, 0.8].forEach((u) => line(c, [[-w * 0.5, -h * u], [w * 0.5, -h * u]], '#6a6a74', 2.2));
      E(c, 0, -h, w * 0.42, 2.5, '#8a5a36', null, { lw: 1.5, hl: false });
    });
  }
  function sack(ctx, x, y, s, col) {
    at(ctx, x, y, (c) => {
      S(c, (p) => { p.moveTo(-9 * s, 0); p.quadraticCurveTo(-12 * s, -14 * s, -5 * s, -18 * s); p.lineTo(-3 * s, -22 * s); p.lineTo(3 * s, -22 * s); p.lineTo(5 * s, -18 * s); p.quadraticCurveTo(12 * s, -14 * s, 9 * s, 0); p.closePath(); }, col || '#e0c898', '#c4a878', { cel: [2, 1], lw: 1.8 });
      line(c, [[-4 * s, -18 * s], [4 * s, -18 * s]], '#8a6446', 1.6);
    });
  }
  function flowers(ctx, x, y, n, cols, seed) {
    for (let k = 0; k < n; k++) {
      const fx = x + (hash(seed + k) - 0.5) * n * 9;
      const h = 8 + hash(seed + k * 2.3) * 10;
      line(ctx, [[fx, y], [fx + 1, y - h]], '#5a9a3a', 1.5);
      const col = cols[k % cols.length];
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * TAU;
        dot(ctx, fx + 1 + Math.cos(a) * 2.4, y - h + Math.sin(a) * 2.4, 2, col);
      }
      dot(ctx, fx + 1, y - h, 1.5, '#ffe070');
    }
  }
  function grassTuft(ctx, x, y, s, col) {
    ctx.strokeStyle = A.c(col || '#5a9a3a');
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    [-6, -2, 2, 6].forEach((d, i) => { ctx.moveTo(x + d * s, y); ctx.quadraticCurveTo(x + d * s * 1.2, y - 7 * s, x + d * s * 1.8 + (i % 2 ? 2 : -2), y - (10 + i * 2) * s); });
    ctx.stroke();
  }
  function stonePath(ctx, x1, x2, y, col, seed) {
    for (let x = x1, k = 0; x < x2; x += 26 + hash(seed + k) * 10, k++) {
      E(ctx, x, y + 3, 9 + hash(seed + k * 1.3) * 4, 3, col || '#b8b0a0', null, { lw: 1.4, hl: false });
    }
  }
  function woodSign(ctx, x, y, w, h, s, board, ink, postH) {
    at(ctx, x, y, (c) => {
      if (postH) {
        S(c, (p) => RR(p, -w / 2 + 6, -postH, 5, postH, 2), '#7a5234', null, { lw: 1.8, hl: false });
        S(c, (p) => RR(p, w / 2 - 11, -postH, 5, postH, 2), '#7a5234', null, { lw: 1.8, hl: false });
      }
      const top = postH ? -postH - h + 8 : -h;
      S(c, (p) => RR(p, -w / 2, top, w, h, 5), board || '#c8905a', '#a8703c', { cel: [2, 2], lw: 2.2 });
      c.strokeStyle = A.c('rgba(90,50,20,0.3)');
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-w / 2 + 4, top + h * 0.33); c.lineTo(w / 2 - 4, top + h * 0.33);
      c.moveTo(-w / 2 + 4, top + h * 0.7); c.lineTo(w / 2 - 4, top + h * 0.7);
      c.stroke();
      dot(c, -w / 2 + 5, top + 5, 1.4, '#5a3a22');
      dot(c, w / 2 - 5, top + 5, 1.4, '#5a3a22');
      text(c, s, 0, top + h / 2 + 1, Math.min(16, h * 0.56), ink || '#4a2e1f');
    });
  }
  // 掛在兩條繩子下的招牌（中心 x、頂端 y）
  function hangSign(ctx, x, y, w, h, s, board, ink, rope) {
    line(ctx, [[x - w * 0.3, y - (rope || 14)], [x - w * 0.3, y + 3]], '#5a3a22', 1.4);
    line(ctx, [[x + w * 0.3, y - (rope || 14)], [x + w * 0.3, y + 3]], '#5a3a22', 1.4);
    woodSign(ctx, x, y + h, w, h, s, board, ink, 0);
  }
  function fencePosts(ctx, x1, x2, y, h, col, shade, step) {
    step = step || 14;
    for (let x = x1; x <= x2; x += step) {
      at(ctx, x, y, (c) => S(c, (p) => { p.moveTo(-3.5, 0); p.lineTo(-3.5, -h + 3); p.lineTo(0, -h - 1); p.lineTo(3.5, -h + 3); p.lineTo(3.5, 0); p.closePath(); }, col, shade, { cel: [1.2, 0], lw: 1.6, hl: false }));
    }
    line(ctx, [[x1 - 4, y - h * 0.35], [x2 + 4, y - h * 0.35]], shade || '#8a5a36', 3);
    line(ctx, [[x1 - 4, y - h * 0.72], [x2 + 4, y - h * 0.72]], shade || '#8a5a36', 3);
  }
  function lampPost(ctx, x, y, h, col, cap) {
    at(ctx, x, y, (c) => {
      S(c, (p) => RR(p, -6, -6, 12, 6, 2), col || '#4a4a58', null, { lw: 1.8, hl: false });
      S(c, (p) => RR(p, -2.5, -h, 5, h - 4, 2), col || '#4a4a58', null, { lw: 1.6, hl: false });
      S(c, (p) => RR(p, -8, -h - 18, 16, 18, 3), '#ffe8a0', null, { lw: 2, hl: false });
      line(c, [[0, -h - 18], [0, -h]], col || '#4a4a58', 1.4);
      S(c, (p) => { p.moveTo(-12, -h - 17); p.lineTo(0, -h - 27); p.lineTo(12, -h - 17); p.closePath(); }, cap || col || '#4a4a58', null, { lw: 1.8, hl: false });
    });
  }
  function windowBox(c, x, y, w, h, frame, glass, round) {
    S(c, (p) => (round ? p.ellipse(x + w / 2, y + h / 2, w / 2 + 3, h / 2 + 3, 0, 0, TAU) : RR(p, x - 3, y - 3, w + 6, h + 6, 3)), frame, null, { lw: 2, hl: false });
    S(c, (p) => (round ? p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU) : RR(p, x, y, w, h, 2)), glass || '#ffe6a0', '#ffd27a', { lw: 1.6, hl: false, shadeY: y + h * 0.65 });
    line(c, [[x + w / 2, y], [x + w / 2, y + h]], frame, 2);
    line(c, [[x, y + h / 2], [x + w, y + h / 2]], frame, 2);
  }

  // ════════ 第一章：苔光營地（森林裡的樹屋、菇菇屋、土丘小屋）════════
  function r1Static(c, x1, x2, y) {
    const P = (wx) => wx - 800 + x1;

    // ── 大樹與樹屋（左）──
    const tx = P(785);
    at(c, tx, y, (c) => {
      // 樹根
      S(c, (p) => { p.moveTo(-40, 0); p.quadraticCurveTo(-24, -10, -20, -40); p.lineTo(20, -40); p.quadraticCurveTo(26, -10, 44, 0); p.closePath(); }, '#8a5e3c', '#6e4a2e', { cel: [4, 0], lw: 2.4 });
      // 樹幹
      S(c, (p) => { p.moveTo(-22, -20); p.quadraticCurveTo(-18, -150, -26, -250); p.lineTo(24, -250); p.quadraticCurveTo(16, -150, 22, -20); p.closePath(); }, '#8a5e3c', '#6e4a2e', { cel: [6, 0], lw: 2.6 });
      c.strokeStyle = A.c('rgba(70,40,20,0.35)');
      c.lineWidth = 1.6;
      c.beginPath();
      [[-10, -30, -8, -110], [6, -50, 10, -140], [-4, -120, -12, -200], [12, -170, 8, -240]].forEach(([a, b, d, e]) => { c.moveTo(a, b); c.quadraticCurveTo(a + 4, (b + e) / 2, d, e); });
      c.stroke();
      // 樹洞裡的小松果收藏
      S(c, (p) => p.ellipse(-4, -84, 8, 11, 0, 0, TAU), '#4a2e1f', null, { lw: 2, hl: false });
      E(c, -4, -78, 4, 3.5, '#b8844a', null, { lw: 1.2, hl: false });
      // 樹幹上的釘梯
      for (let k = 0; k < 8; k++) S(c, (p) => RR(p, -16, -22 - k * 18, 32, 5, 2), '#c8945e', '#a8744a', { lw: 1.6, hl: false });
      // 樹冠（背面一層、深綠）
      const blob = (col, sh, pts) => S(c, (p) => pts.forEach(([x, yy, r]) => { p.moveTo(x + r, yy); p.arc(x, yy, r, 0, TAU); }), col, sh, { noStroke: true, shadeY: -250 });
      // 樹冠改成一片片小葉組成的葉團（js/art/bgmagic.js 的 A.leafMass）；沒有那個檔時用原本的平塗雲朵
      const back = [[-70, -300, 44], [70, -305, 46], [0, -340, 50], [-96, -262, 30], [100, -262, 32]];
      if (A.leafMass) A.leafMass(c, back, false);
      else blob('#4f8a36', null, back);
      // 樹屋平台
      S(c, (p) => RR(p, -75, -176, 150, 10, 3), '#a8744a', '#8a5a36', { cel: [3, 2], lw: 2.2 });
      line(c, [[-60, -166], [-24, -130]], '#7a5234', 5);
      line(c, [[60, -166], [22, -130]], '#7a5234', 5);
      // 小屋
      S(c, (p) => RR(p, -46, -240, 92, 66, 5), '#e8c89a', '#d0ac78', { cel: [5, 3], lw: 2.4 });
      c.strokeStyle = A.c('rgba(120,80,40,0.35)');
      c.lineWidth = 1.4;
      c.beginPath();
      for (let k = 1; k < 5; k++) { c.moveTo(-44, -240 + k * 13); c.lineTo(44, -240 + k * 13); }
      c.stroke();
      windowBox(c, 10, -226, 24, 20, '#7a5234', null, true);
      S(c, (p) => { p.moveTo(-34, -174); p.lineTo(-34, -206); p.quadraticCurveTo(-22, -218, -10, -206); p.lineTo(-10, -174); p.closePath(); }, '#6a8a4a', '#56723a', { shadeY: -186, lw: 2 });
      dot(c, -14, -190, 1.6, '#ffd35a');
      // 花盆
      S(c, (p) => RR(p, 6, -204, 32, 8, 2), '#c8704a', '#a85a3a', { lw: 1.6, hl: false });
      flowers(c, 22, -204, 3, ['#ff8fb0', '#ffd35a', '#ffffff'], 3);
      // 屋頂（茅草色＋苔蘚）
      S(c, (p) => { p.moveTo(-58, -236); p.quadraticCurveTo(-30, -270, 0, -290); p.quadraticCurveTo(30, -270, 58, -236); p.quadraticCurveTo(0, -226, -58, -236); p.closePath(); }, '#c8704a', '#a85a3a', { cel: [4, 3], lw: 2.6 });
      c.strokeStyle = A.c('rgba(110,50,30,0.35)');
      c.lineWidth = 1.2;
      c.beginPath();
      for (let k = -4; k <= 4; k++) { c.moveTo(k * 6, -284 + Math.abs(k) * 3); c.lineTo(k * 13, -236); }
      c.stroke();
      S(c, (p) => { p.moveTo(-40, -250); p.quadraticCurveTo(-28, -262, -12, -258); p.quadraticCurveTo(-24, -250, -40, -250); p.closePath(); }, '#7ab84e', null, { lw: 1.2, hl: false });
      // 欄杆
      line(c, [[-74, -196], [-40, -196]], '#8a5a36', 3);
      line(c, [[46, -196], [74, -196]], '#8a5a36', 3);
      [-72, -60, -48, 52, 62, 72].forEach((dx) => line(c, [[dx, -176], [dx, -196]], '#8a5a36', 2.4));
      // 樹冠（前面一層）
      const front = [[-92, -320, 36], [88, -330, 38], [-40, -364, 34], [40, -370, 36], [-110, -286, 22], [116, -290, 24]];
      if (A.leafMass) A.leafMass(c, front, true);
      else blob('#6aa84a', '#5a963c', front);
      // 鳥屋掛在右邊樹枝上
      line(c, [[24, -150], [86, -170]], '#7a5234', 6);
      line(c, [[74, -166], [74, -150]], '#5a3a22', 1.2);
      S(c, (p) => RR(p, 66, -150, 16, 18, 2), '#8fc0d8', '#6fa0b8', { lw: 1.6, hl: false });
      S(c, (p) => { p.moveTo(63, -150); p.lineTo(74, -160); p.lineTo(85, -150); p.closePath(); }, '#c8704a', null, { lw: 1.6, hl: false });
      dot(c, 74, -142, 2.5, '#3a2418');
      // 鞦韆掛的樹枝
      line(c, [[18, -128], [134, -150]], '#7a5234', 7);
      S(c, (p) => { p.moveTo(128, -149); p.quadraticCurveTo(142, -154, 150, -148); p.quadraticCurveTo(140, -144, 128, -149); p.closePath(); }, '#6aa84a', null, { lw: 1.4, hl: false });
      // 樹根旁的小蘑菇
      [[-34, 0, 5, '#e8483a'], [-26, 0, 3.5, '#f5c26b'], [36, 0, 4, '#e8483a']].forEach(([x, yy, r, col]) => {
        S(c, (p) => RR(p, x - r * 0.35, yy - r * 1.2, r * 0.7, r * 1.2, 1), '#fff0d6', null, { lw: 1.2, hl: false });
        S(c, (p) => p.ellipse(x, yy - r * 1.2, r, r * 0.8, 0, Math.PI, 0), col, null, { lw: 1.3, hl: false });
      });
    });

    // ── 菜園（烏龜爺爺和貓頭鷹之間）──
    const gx = P(965);
    at(c, gx, y, (c) => {
      S(c, (p) => p.ellipse(0, 1, 56, 7, 0, 0, TAU), '#7a5234', '#6a462c', { lw: 1.8, hl: false, shadeY: 3 });
      c.strokeStyle = A.c('rgba(60,36,20,0.45)');
      c.lineWidth = 1.4;
      c.beginPath();
      for (let k = -2; k <= 2; k++) { c.moveTo(-48, k * 2); c.lineTo(48, k * 2); }
      c.stroke();
      // 高麗菜
      [-38, -16].forEach((x) => {
        E(c, x, -6, 9, 7, '#9ad06a', '#7ab04e', { cel: [1.5, 1], lw: 1.6 });
        E(c, x, -7, 4.5, 3.5, '#c4ea96', null, { lw: 1, hl: false });
      });
      // 紅蘿蔔葉
      [6, 16, 26].forEach((x) => {
        S(c, (p) => p.ellipse(x, -1, 3.5, 3, 0, Math.PI, 0), '#f28c38', null, { lw: 1.2, hl: false });
        c.strokeStyle = A.c('#5a9a3a');
        c.lineWidth = 1.8;
        c.beginPath();
        c.moveTo(x, -3); c.lineTo(x - 4, -14); c.moveTo(x, -3); c.lineTo(x + 1, -16); c.moveTo(x, -3); c.lineTo(x + 5, -13);
        c.stroke();
      });
      // 番茄支架
      [38, 50].forEach((x, i) => {
        line(c, [[x, 0], [x, -46]], '#a8744a', 2.4);
        c.strokeStyle = A.c('#5a9a3a');
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, -4); c.quadraticCurveTo(x - 7, -18, x, -26); c.quadraticCurveTo(x + 7, -34, x, -44);
        c.stroke();
        [[-5, -16], [5, -28], [-4, -36]].forEach(([dx, dy], k) => { if ((k + i) % 3 !== 2) E(c, x + dx, dy, 3.8, 3.6, '#e8483a', null, { lw: 1.2 }); });
      });
      // 矮柵欄
      fencePosts(c, -58, -46, 0, 26, '#d8b080', '#a8744a', 12);
      // 澆水壺
      at(c, -60, 0, (c) => {
        S(c, (p) => { p.moveTo(-8, 0); p.lineTo(-7, -14); p.lineTo(7, -14); p.lineTo(8, 0); p.closePath(); }, '#8fc0d8', '#6fa0b8', { cel: [1.5, 0], lw: 1.6 });
        line(c, [[7, -8], [16, -16]], '#6fa0b8', 2.4);
        S(c, (p) => p.arc(0, -14, 6, Math.PI, 0), 'rgba(0,0,0,0)', null, { lw: 1.6, hl: false });
      });
    });
    // 向日葵（菜園尾巴，貓頭鷹左邊）
    [[P(1012), 84, 0], [P(1026), 66, 1]].forEach(([fx, h, i]) => {
      line(c, [[fx, y], [fx + (i ? 2 : -2), y - h]], '#5a9a3a', 3);
      S(c, (p) => { p.moveTo(fx, y - h * 0.45); p.quadraticCurveTo(fx + 12, y - h * 0.5, fx + 14, y - h * 0.4); p.quadraticCurveTo(fx + 6, y - h * 0.36, fx, y - h * 0.45); p.closePath(); }, '#6ab846', null, { lw: 1.2, hl: false });
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU;
        E(c, fx + Math.cos(a) * 9, y - h + Math.sin(a) * 9, 5, 2.6, '#ffd35a', null, { lw: 1, hl: false, rot: a });
      }
      E(c, fx, y - h, 6.5, 6.5, '#8a5a30', null, { lw: 1.4, hl: false });
    });

    // ── 貓頭鷹的雜貨攤（貓頭鷹站在攤子左前方）──
    at(c, P(1122), y, (c) => {
      // 後面的貨架
      S(c, (p) => RR(p, -38, -92, 76, 58, 3), '#a8744a', '#8a5a36', { cel: [3, 2], lw: 2.2 });
      [[-78], [-58]].forEach(([yy]) => line(c, [[-36, yy], [36, yy]], '#7a4a2a', 2.4));
      // 架上的瓶瓶罐罐
      [[-28, -78, '#8fd3f4'], [-18, -78, '#ff9fc4'], [-8, -78, '#ffd35a'], [4, -78, '#9ad06a'], [16, -78, '#8fd3f4'], [27, -78, '#ff8a5a']].forEach(([x, yy, col], k) => {
        S(c, (p) => RR(p, x - 3.5, yy - (k % 2 ? 11 : 9), 7, k % 2 ? 11 : 9, 2), col, null, { lw: 1.3, hl: false });
        S(c, (p) => RR(p, x - 2, yy - (k % 2 ? 14 : 12), 4, 3, 1), '#c8905a', null, { lw: 1, hl: false });
      });
      [[-24, -58], [-4, -58], [18, -58]].forEach(([x, yy], k) => {
        E(c, x, yy - 6, 8, 6, ['#e8a060', '#c8d890', '#f4d8a8'][k], null, { lw: 1.4, hl: false });
      });
      // 柱子
      S(c, (p) => RR(p, -48, -118, 6, 118, 2), '#8a5a36', null, { lw: 1.8, hl: false });
      S(c, (p) => RR(p, 42, -118, 6, 118, 2), '#8a5a36', null, { lw: 1.8, hl: false });
      // 櫃台
      S(c, (p) => RR(p, -52, -38, 104, 38, 3), '#c8945e', '#a8744a', { cel: [3, 2], lw: 2.2 });
      c.strokeStyle = A.c('rgba(110,70,30,0.4)');
      c.lineWidth = 1.2;
      c.beginPath();
      for (let k = 1; k < 3; k++) { c.moveTo(-50, -38 + k * 12); c.lineTo(50, -38 + k * 12); }
      c.stroke();
      // 櫃台上的莓果籃與秤
      S(c, (p) => { p.moveTo(-40, -38); p.lineTo(-38, -48); p.lineTo(-18, -48); p.lineTo(-16, -38); p.closePath(); }, '#d8a870', '#b88a54', { lw: 1.6, hl: false });
      [[-34, -50, '#e8483a'], [-28, -52, '#c83a5a'], [-22, -50, '#e8483a'], [-30, -47, '#8a3a8a']].forEach(([x, yy, col]) => E(c, x, yy, 3.2, 3.2, col, null, { lw: 1 }));
      line(c, [[18, -38], [18, -54]], '#6a6a74', 2);
      line(c, [[8, -54], [28, -54]], '#6a6a74', 2);
      E(c, 8, -52, 6, 2, '#c8c8d0', null, { lw: 1.2, hl: false });
      E(c, 28, -52, 6, 2, '#c8c8d0', null, { lw: 1.2, hl: false });
      // 價目小黑板
      S(c, (p) => RR(p, 30, -30, 18, 22, 2), '#3a4a3a', null, { lw: 1.6, hl: false });
      line(c, [[34, -24], [44, -24]], '#f0f0e0', 1.2);
      line(c, [[34, -18], [42, -18]], '#f0f0e0', 1.2);
      // 條紋遮雨棚
      const aw = (p) => { p.moveTo(-60, -104); p.lineTo(-48, -128); p.lineTo(48, -128); p.lineTo(60, -104); p.closePath(); };
      S(c, aw, '#fff4dc', '#e8dcc0', { cel: [3, 2], lw: 2.2 });
      c.save();
      c.beginPath();
      aw(c);
      c.clip();
      c.fillStyle = A.c('#5a9a5a');
      for (let k = -4; k < 4; k += 2) {
        c.beginPath();
        c.moveTo(-48 + (k + 4) * 12, -128); c.lineTo(-36 + (k + 4) * 12, -128); c.lineTo(-45 + (k + 5) * 15, -104); c.lineTo(-60 + (k + 4) * 15, -104);
        c.closePath();
        c.fill();
      }
      c.restore();
      for (let k = 0; k < 8; k++) S(c, (p) => p.arc(-52.5 + k * 15, -104, 7.5, 0, Math.PI), k % 2 ? '#fff4dc' : '#5a9a5a', null, { lw: 1.6, hl: false });
    });
    // 攤子旁的木箱與蘋果桶（貓頭鷹和營火之間，低矮）
    crate(c, P(1180), y, 24, 20);
    at(c, P(1180), y - 20, (c) => [[-6, -3], [0, -5], [6, -3]].forEach(([x, yy]) => E(c, x, yy, 4, 4, '#e8483a', null, { lw: 1.1 })));

    // ── 菇菇屋（刺蝟家）──
    const hx = P(1385);
    at(c, hx, y, (c) => {
      // 煙囪（在菇傘後面）
      S(c, (p) => RR(p, 30, -186, 14, 40, 2), '#9a8a80', '#7e6e64', { cel: [2, 0], lw: 2 });
      S(c, (p) => RR(p, 27, -190, 20, 7, 2), '#7e6e64', null, { lw: 1.8, hl: false });
      // 菇柄牆
      S(c, (p) => { p.moveTo(-48, 0); p.quadraticCurveTo(-54, -50, -44, -96); p.lineTo(44, -96); p.quadraticCurveTo(54, -50, 48, 0); p.closePath(); }, '#fff0d6', '#e8cfa6', { cel: [6, 2], lw: 2.6 });
      // 門
      S(c, (p) => { p.moveTo(-16, 0); p.lineTo(-16, -38); p.quadraticCurveTo(0, -56, 16, -38); p.lineTo(16, 0); p.closePath(); }, '#9a6a42', '#7a5033', { shadeY: -14, lw: 2.4 });
      line(c, [[0, 0], [0, -48]], '#7a5033', 1.4);
      dot(c, 10, -20, 1.8, '#ffd35a');
      // 門口的踏墊與門邊的小花盆
      S(c, (p) => RR(p, -20, -3, 40, 4, 2), '#c85a4a', null, { lw: 1.4, hl: false });
      // 兩扇窗與窗台花箱
      windowBox(c, -40, -70, 16, 18, '#9a6a42', null, true);
      windowBox(c, 24, -70, 16, 18, '#9a6a42', null, true);
      [[-43, -50], [21, -50]].forEach(([x, yy]) => {
        S(c, (p) => RR(p, x, yy, 22, 6, 2), '#9a6a42', null, { lw: 1.4, hl: false });
        flowers(c, x + 11, yy, 3, ['#ff8fb0', '#8fd3f4', '#ffd35a'], x);
      });
      // 菇傘
      const cap = (p) => { p.moveTo(-86, -84); p.bezierCurveTo(-86, -186, 86, -186, 86, -84); p.quadraticCurveTo(0, -70, -86, -84); p.closePath(); };
      S(c, cap, '#e8483a', '#b8302a', { cel: [7, 6], hl: [-38, -140, 16, 8] });
      [[-50, -114, 11], [8, -148, 13], [48, -110, 9], [-12, -104, 7], [62, -138, 6], [-60, -140, 6]].forEach(([dx, dy, r]) => E(c, dx, dy, r, r * 0.8, '#fff8ee', '#f0e2d0', { lw: 1.8, hl: false, cel: [1, 1] }));
      // 菇傘邊的小燈
      S(c, (p) => RR(p, -70, -82, 3, 10, 1), '#5a3a22', null, { lw: 1, hl: false });
      // 門牌
      S(c, (p) => RR(p, -12, -66, 24, 10, 2), '#c8905a', null, { lw: 1.4, hl: false });
      text(c, '刺蝟家', 0, -61, 7, '#4a2e1f');
    });

    // ── 松鼠的郵筒與包裹 ──
    at(c, P(1500), y, (c) => {
      S(c, (p) => RR(p, -3, -46, 6, 46, 2), '#7a5234', null, { lw: 1.6, hl: false });
      S(c, (p) => { p.moveTo(-14, -46); p.lineTo(-14, -62); p.quadraticCurveTo(0, -74, 14, -62); p.lineTo(14, -46); p.closePath(); }, '#e0584a', '#b8403a', { cel: [2, 1.5], lw: 2 });
      S(c, (p) => RR(p, -9, -60, 18, 3, 1), '#4a2e1f', null, { noStroke: true, hl: false });
      S(c, (p) => RR(p, -6, -66, 12, 8, 1), '#fff8ee', null, { lw: 1.2, hl: false });
      line(c, [[14, -60], [14, -74]], '#6a6a74', 1.6);
      S(c, (p) => RR(p, 14, -76, 9, 6, 1), '#ffd35a', null, { lw: 1.2, hl: false });
    });
    crate(c, P(1522), y, 20, 14, '#e0c090');
    line(c, [[P(1512), y - 7], [P(1532), y - 7]], '#c8504a', 1.4);

    // ── 土丘小屋（右，矮，別擋到上面的平台）──
    const bx = P(1636);
    at(c, bx, y, (c) => {
      S(c, (p) => { p.moveTo(-80, 0); p.quadraticCurveTo(-76, -64, 0, -68); p.quadraticCurveTo(76, -64, 80, 0); p.closePath(); }, '#7bbf4a', '#62a23a', { cel: [6, 4], lw: 2.6 });
      // 草皮上的小花與石頭
      flowers(c, -40, -48, 3, ['#ffffff', '#ffd35a'], 11);
      flowers(c, 36, -52, 2, ['#ff8fb0'], 17);
      // 圓門
      S(c, (p) => p.arc(-14, -24, 22, 0, TAU), '#8a5e3c', null, { lw: 2.4, hl: false });
      S(c, (p) => p.arc(-14, -24, 17, 0, TAU), '#e8b84a', '#c8962a', { lw: 2, hl: false, shadeY: -14 });
      dot(c, -14, -24, 2.2, '#8a5a30');
      c.strokeStyle = A.c('rgba(140,90,30,0.4)');
      c.lineWidth = 1.2;
      c.beginPath();
      for (let k = -2; k <= 2; k++) { c.moveTo(-14 + k * 6, -40); c.lineTo(-14 + k * 6, -8); }
      c.stroke();
      S(c, (p) => RR(p, -40, -3, 52, 5, 2), '#b8a890', null, { lw: 1.4, hl: false });
      // 圓窗
      windowBox(c, 22, -38, 20, 20, '#8a5e3c', null, true);
      // 煙囪管
      S(c, (p) => RR(p, 42, -68, 10, 18, 2), '#8a8a94', '#6a6a74', { cel: [2, 0], lw: 1.8 });
      S(c, (p) => RR(p, 39, -72, 16, 6, 2), '#6a6a74', null, { lw: 1.6, hl: false });
      // 門口的小長椅
      S(c, (p) => RR(p, 50, -18, 30, 5, 2), '#c8945e', null, { lw: 1.6, hl: false });
      line(c, [[54, -13], [54, 0]], '#8a5a36', 2.4);
      line(c, [[76, -13], [76, 0]], '#8a5a36', 2.4);
      S(c, (p) => RR(p, 60, -26, 8, 8, 2), '#fff8ee', null, { lw: 1.2, hl: false });
    });

    // ── 右邊的小菇叢與花（菇菇站的地方前後留空）──
    [[P(1846), 18, '#ff9fc4'], [P(1862), 12, '#f5c26b'], [P(1874), 8, '#ff9fc4']].forEach(([x, r, col]) => {
      S(c, (p) => RR(p, x - r * 0.3, y - r * 1.3, r * 0.6, r * 1.3, 2), '#fff0d6', null, { lw: 1.4, hl: false });
      S(c, (p) => p.ellipse(x, y - r * 1.3, r, r * 0.8, 0, Math.PI, 0), col, null, { lw: 1.6, hl: false });
    });

    // ── 晾衣繩的柱子（樹屋平台到菜園邊的木樁）──
    at(c, P(1004), y, (c) => S(c, (p) => RR(p, -3, -150, 6, 150, 2), '#8a5a36', null, { lw: 1.8, hl: false }));
    // 燈串（樹屋 → 菇菇屋）與掛在上面的營地招牌
    const lights = sag(P(860), y - 198, P(1318), y - 150, 44);
    lights.draw(c, '#5a3a22', 1.5);
    const [sx, sy] = lights.at(0.47);
    hangSign(c, sx, sy + 2, 92, 26, '苔光營地', '#c8905a', '#4a2e1f', 4);
    // 地上的小石板路（營火往兩邊延伸）
    stonePath(c, P(1080), P(1560), y, '#c8c0a8', 5);
    [P(900), P(1150), P(1300), P(1440), P(1720), P(1810)].forEach((x, k) => grassTuft(c, x, y, 0.9, k % 2 ? '#5a9a3a' : '#6ab846'));
    flowers(c, P(1540), y, 3, ['#ffffff', '#ff8fb0'], 23);
    flowers(c, P(1702), y, 2, ['#ffd35a'], 29);
    if (emptyChairOn) emptyChair(c, P(868), y);
  }

  // 龜爺爺的空椅子：矮木椅、椅墊上是他那塊苔綠色的毯子，拐杖靠在椅背上；
  // 旁邊的樹樁小桌上一杯茶，沒有冒煙（靜態層，本來就不會有煙）。
  function emptyChair(c, x, y) {
    at(c, x, y, (c) => {
      c.scale(1.2, 1.2);
      // 地上的影子
      c.fillStyle = A.c('rgba(40,26,14,0.25)');
      c.beginPath();
      c.ellipse(-8, 0, 40, 4, 0, 0, TAU);
      c.fill();
      // 樹樁小桌與涼掉的茶（椅子左邊，鞦韆右邊留空）
      const tx = -32;
      S(c, (p) => { p.moveTo(tx - 11, 0); p.lineTo(tx - 9, -18); p.lineTo(tx + 9, -18); p.lineTo(tx + 11, 0); p.closePath(); }, '#8a5a36', '#6e4428', { cel: [3, 0], lw: 1.8, hl: false });
      E(c, tx, -18, 9.5, 3.2, '#e0b884', '#c89a64', { lw: 1.6, hl: false });
      c.strokeStyle = A.c('rgba(110,70,35,0.55)');
      c.lineWidth = 0.9;
      c.beginPath();
      c.ellipse(tx, -18, 5, 1.6, 0, 0, TAU);
      c.stroke();
      // 茶碟、茶杯（沒有把手的小茶碗），茶面平靜，沒有煙
      E(c, tx, -21, 7.5, 2, '#fbf6ec', '#e0d6c4', { lw: 1.3, hl: false });
      S(c, (p) => { p.moveTo(tx - 5.5, -29); p.quadraticCurveTo(tx - 5.5, -21, tx, -21); p.quadraticCurveTo(tx + 5.5, -21, tx + 5.5, -29); p.closePath(); }, '#fbf6ec', '#ddd2be', { lw: 1.5, hl: false, shadeY: -24 });
      E(c, tx, -29, 5.5, 1.5, '#8a6a2a', null, { lw: 1.1, hl: false });
      line(c, [[tx - 3.5, -25.5], [tx + 2.5, -25.5]], '#6a9ac0', 1.2);
      // 後腳與椅背（在椅面後面）
      S(c, (p) => RR(p, 8, -60, 5, 60, 2), '#9a6436', '#7a4a28', { cel: [1.5, 0], lw: 2, hl: false });
      S(c, (p) => RR(p, -13, -60, 5, 60, 2), '#9a6436', '#7a4a28', { cel: [1.5, 0], lw: 2, hl: false });
      S(c, (p) => RR(p, -16, -63, 32, 8, 3), '#b8804a', '#9a6436', { cel: [1.5, 1.5], lw: 2, hl: false });
      S(c, (p) => RR(p, -12, -48, 24, 5, 2), '#b8804a', '#9a6436', { lw: 1.8, hl: false });
      // 前腳
      S(c, (p) => RR(p, -15, -22, 5, 22, 2), '#9a6436', '#7a4a28', { lw: 2, hl: false });
      S(c, (p) => RR(p, 11, -22, 5, 22, 2), '#9a6436', '#7a4a28', { lw: 2, hl: false });
      line(c, [[-12, -9], [13, -9]], '#7a4a28', 2.4);
      // 椅面
      S(c, (p) => RR(p, -18, -27, 37, 7, 3), '#c8905a', '#a8744a', { cel: [2, 1.5], lw: 2.2 });
      // 疊好的苔綠色小毯子（龜爺爺殼上的顏色），毯角垂在椅面前
      S(c, (p) => { p.moveTo(-12, -27); p.quadraticCurveTo(-11, -34, -4, -34); p.lineTo(10, -34); p.quadraticCurveTo(15, -33, 14, -27); p.closePath(); }, '#7aa058', '#5a7e3e', { lw: 1.6, hl: false, shadeY: -29 });
      S(c, (p) => { p.moveTo(6, -27); p.lineTo(13, -27); p.lineTo(12, -16); p.lineTo(7, -18); p.closePath(); }, '#7aa058', '#5a7e3e', { lw: 1.4, hl: false, shadeY: -20 });
      c.strokeStyle = A.c('rgba(255,248,220,0.6)');
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-8, -31);
      c.lineTo(10, -31);
      c.stroke();
      // 靠在椅背右邊的拐杖
      line(c, [[26, 0], [15, -64]], A.OUT, 5);
      line(c, [[26, 0], [15, -64]], '#8a5a36', 3);
      S(c, (p) => { p.moveTo(15, -63); p.quadraticCurveTo(13, -74, 5, -71); p.quadraticCurveTo(3, -67, 7, -66); }, 'rgba(0,0,0,0)', null, { lw: 2.8, hl: false });
      // 椅子前面一片落葉
      E(c, -4, -1, 4, 1.8, '#c8904a', null, { rot: 0.3, lw: 1, hl: false });
    });
  }


  function r1Anim(ctx, x1, x2, y, t) {
    const P = (wx) => wx - 800 + x1;
    const tx = P(785);
    // 樹屋窗、菇菇屋窗、土丘窗的燈
    winGlow(ctx, tx + 22, y - 216, 30, t, 1);
    winGlow(ctx, P(1385) - 32, y - 61, 26, t, 2);
    winGlow(ctx, P(1385) + 32, y - 61, 26, t, 3);
    winGlow(ctx, P(1636) + 32, y - 28, 28, t, 4);
    winGlow(ctx, P(1636) - 14, y - 24, 30, t, 5, '255,200,110', 0.22);
    // 菇傘邊的小燈
    const lx = P(1385) - 69;
    const bob = Math.sin(t * 1.8) * 1.5;
    glow(ctx, lx, y - 62 + bob, 18, 0.55 + Math.sin(t * 3) * 0.1, '255,230,140');
    E(ctx, lx, y - 65 + bob, 4, 5, '#fff2a0', null, { lw: 1.3, hl: false });
    // 鞦韆
    const sw = Math.sin(t * 1.6) * 0.18;
    ctx.save();
    ctx.translate(tx + 110, y - 146);
    ctx.rotate(sw);
    line(ctx, [[-12, 0], [-12, 100]], '#8a6446', 1.6);
    line(ctx, [[12, 0], [12, 100]], '#8a6446', 1.6);
    A.shape(ctx, (c) => RR(c, -17, 98, 34, 6, 2), '#c8945e', '#a8744a', { lw: 1.8, hl: false });
    ctx.restore();
    // 晾衣繩（樹屋平台 → 木樁）
    const rope = sag(tx + 70, y - 172, P(1004), y - 150, 18);
    rope.draw(ctx, '#e8dcc0', 1.4);
    laundry(ctx, rope, t, [
      { u: 0.14, k: 'shirt', c: '#8fd3f4', s: '#6fb3d4', stripe: '#ffffff' },
      { u: 0.34, k: 'sock', c: '#ff9fc4' },
      { u: 0.42, k: 'sock', c: '#ffd35a' },
      { u: 0.6, k: 'dress', c: '#ff8a8a', s: '#e06a6a' },
      { u: 0.82, k: 'towel', c: '#9ad06a', s: '#7ab04e' },
    ]);
    // 燈串上的燈泡
    const lights = sag(P(860), y - 198, P(1318), y - 150, 44);
    bulbs(ctx, lights, t, 14, ['#ffd35a', '#ff9fc4', '#8fd3f4', '#b8f08a'], '255,220,120');
    // 燈串上停著兩隻小鳥
    const [b1x, b1y] = lights.at(0.2);
    perchBird(ctx, b1x, b1y, t, 1, '#8fc0e8', 1);
    const [b2x, b2y] = lights.at(0.78);
    perchBird(ctx, b2x, b2y, t, 2.4, '#f4a0a0', -1);
    // 煙囪的煙
    smoke(ctx, P(1385) + 37, y - 196, t, 4, '250,250,250', 70, 5);
    smoke(ctx, P(1636) + 47, y - 76, t + 1.3, 3, '245,245,245', 26, 3.5, 30);
    // 樹屋水桶的滑輪繩
    const by = y - 110 + Math.sin(t * 0.7) * 24;
    line(ctx, [[tx - 64, y - 176], [tx - 64, by - 8]], '#8a6446', 1.4);
    ctx.save();
    ctx.translate(tx - 64, by);
    A.shape(ctx, (c) => { c.moveTo(-7, -8); c.lineTo(7, -8); c.lineTo(5.5, 6); c.lineTo(-5.5, 6); c.closePath(); }, '#c8945e', '#a8744a', { lw: 1.6, hl: false, shadeY: 0 });
    line(ctx, [[-7, -8], [0, -14], [7, -8]], '#6a6a74', 1.2);
    ctx.restore();
    // 鳥屋的小鳥探頭
    if (Math.sin(t * 0.5) > 0.2) perchBird(ctx, tx + 74, y - 150, t, 5, '#ffd35a', 1);
    // 螢火蟲（樹下與菜園）
    fireflies(ctx, tx + 40, y - 120, 260, 180, t, 7);
    fireflies(ctx, P(1600), y - 60, 240, 90, t + 3, 5);
    // 菇菇燈
    [[P(1060) - 38, 0], [P(1560), 1], [P(1730), 2]].forEach(([x, k]) => {
      glow(ctx, x, y - 10, 20, 0.45 + Math.sin(t * 2 + k) * 0.15, '190,240,255');
      A.shape(ctx, (c) => RR(c, x - 2, y - 10, 4, 10, 1), '#fff0d6', null, { lw: 1, hl: false });
      A.shape(ctx, (c) => c.ellipse(x, y - 10, 6, 5, 0, Math.PI, 0), '#9fe4ff', null, { lw: 1.2, hl: false });
    });
    flyBirds(ctx, x1, x2, y - 420, t, 3);
  }

  // ════════ 第二章：燈塔岬（漁村：燈塔、魚市攤、曬網架、船屋、小碼頭）════════
  function lighthouseTower(c, H) {
    // 岩石底座
    [[-46, -8, 22, 12], [-18, -6, 20, 10], [22, -8, 26, 12], [44, -4, 14, 8]].forEach(([x, yy, rx, ry]) => E(c, x, yy, rx, ry, '#b8ab98', '#9a8c78', { cel: [2, 2], lw: 2.2, hl: false }));
    S(c, (p) => RR(p, -46, -30, 92, 24, 5), '#c8c0b2', '#a8a092', { cel: [4, 2], lw: 2.2 });
    c.strokeStyle = A.c('rgba(90,80,70,0.4)');
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(-44, -18); c.lineTo(44, -18);
    for (let k = -2; k <= 2; k++) { c.moveTo(k * 18 + 6, -30); c.lineTo(k * 18 + 6, -18); c.moveTo(k * 18 - 3, -18); c.lineTo(k * 18 - 3, -6); }
    c.stroke();
    const tower = (p) => { p.moveTo(-34, -28); p.lineTo(-22, -H); p.lineTo(22, -H); p.lineTo(34, -28); p.closePath(); };
    S(c, tower, '#fbf6ee', '#e0d6c6', { cel: [8, 0], noStroke: true });
    c.save();
    c.beginPath();
    tower(c);
    c.clip();
    [0.3, 0.64].forEach((u) => {
      const yy = -28 - (H - 28) * u;
      const hh = (H - 28) * 0.13;
      c.fillStyle = A.c('#e0584a');
      c.fillRect(-60, yy - hh, 120, hh);
      c.fillStyle = A.c('#b8403a');
      c.fillRect(18, yy - hh, 40, hh);
    });
    c.restore();
    c.beginPath();
    tower(c);
    c.lineWidth = A.LW;
    c.strokeStyle = A.outline();
    c.stroke();
    // 門與小窗
    S(c, (p) => { p.moveTo(-11, -28); p.lineTo(-11, -56); p.quadraticCurveTo(0, -68, 11, -56); p.lineTo(11, -28); p.closePath(); }, '#4a7aa0', '#3a6488', { shadeY: -40, lw: 2.4 });
    dot(c, 6, -42, 1.6, '#ffd35a');
    S(c, (p) => RR(p, -16, -32, 32, 5, 2), '#8a8078', null, { lw: 1.6, hl: false });
    [-120, -190].forEach((wy) => windowBox(c, -6, wy - 9, 12, 18, '#4a5a6a', null, false));
    // 瞭望台
    S(c, (p) => RR(p, -36, -H - 8, 72, 10, 3), '#4a5a6a', '#3a4856', { lw: 2.4, hl: false });
    line(c, [[-34, -H - 22], [34, -H - 22]], '#4a5a6a', 2);
    for (let k = -3; k <= 3; k++) line(c, [[k * 10.5, -H - 22], [k * 10.5, -H - 8]], '#4a5a6a', 2);
    // 燈室
    S(c, (p) => RR(p, -18, -H - 52, 36, 32, 4), '#fff2a8', '#ffe07a', { lw: 2.4, hl: false });
    line(c, [[-6, -H - 52], [-6, -H - 20]], null, 2);
    line(c, [[6, -H - 52], [6, -H - 20]], null, 2);
    S(c, (p) => { p.moveTo(-24, -H - 50); p.quadraticCurveTo(-22, -H - 80, 0, -H - 82); p.quadraticCurveTo(22, -H - 80, 24, -H - 50); p.closePath(); }, '#e0584a', '#b8403a', { cel: [4, 3] });
    E(c, 0, -H - 86, 4, 4, '#4a5a6a', null, { lw: 2, hl: false });
    line(c, [[0, -H - 90], [0, -H - 104]], '#4a5a6a', 1.6);
  }

  function r2Static(c, x1, x2, y) {
    const P = (wx) => wx - 800 + x1;
    const LX = P(760);
    const H = 250;

    // ── 燈塔＋旁邊的船錨、繩圈、木桶 ──
    at(c, LX, y, (c) => lighthouseTower(c, H));
    at(c, LX + 58, y, (c) => {
      // 大錨斜靠在底座上
      c.save();
      c.rotate(0.25);
      line(c, [[0, -4], [0, -54]], '#5a6470', 5);
      line(c, [[0, -4], [0, -54]], '#8a94a0', 2.4);
      c.strokeStyle = A.outline();
      c.lineWidth = 5;
      c.beginPath(); c.arc(0, -16, 14, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      c.strokeStyle = A.c('#8a94a0');
      c.lineWidth = 2.4;
      c.stroke();
      line(c, [[-9, -44], [9, -44]], '#5a6470', 4);
      c.strokeStyle = A.outline();
      c.lineWidth = 2;
      c.beginPath(); c.arc(0, -58, 4, 0, TAU); c.stroke();
      c.restore();
    });
    // 繩圈
    at(c, LX - 34, y, (c) => {
      [0, 1, 2].forEach((k) => E(c, 0, -4 - k * 4, 13 - k * 1.5, 4, '#d8c090', '#b8a070', { lw: 1.5, hl: false }));
      E(c, 0, -13, 5, 1.8, '#8a6446', null, { noStroke: true, hl: false });
    });

    // ── 曬網架（海豹與海鷗之間）──
    const nx = P(958);
    at(c, nx, y, (c) => {
      [-42, 42].forEach((dx) => {
        S(c, (p) => RR(p, dx - 3, -96, 6, 96, 2), '#8a6446', '#6e4e36', { lw: 1.8, hl: false });
      });
      line(c, [[-48, -92], [48, -92]], '#8a6446', 4);
      // 地上一堆漁網與浮球
      S(c, (p) => { p.moveTo(-30, 0); p.quadraticCurveTo(-26, -14, -8, -16); p.quadraticCurveTo(10, -18, 18, -8); p.quadraticCurveTo(24, -2, 26, 0); p.closePath(); }, '#7aa89c', '#5e8c80', { cel: [2, 1.5], lw: 1.8 });
      c.strokeStyle = A.c('rgba(40,70,64,0.5)');
      c.lineWidth = 1;
      c.beginPath();
      for (let k = -24; k < 22; k += 6) { c.moveTo(k, 0); c.lineTo(k + 4, -14); }
      c.stroke();
      E(c, -14, -14, 4, 4, '#f08a4a', null, { lw: 1.3 });
      E(c, 6, -15, 4, 4, '#ffd35a', null, { lw: 1.3 });
    });

    // ── 海鷗的魚市攤 ──
    at(c, P(1110), y, (c) => {
      // 後面的木板牆與掛著的魚乾
      S(c, (p) => RR(p, -44, -100, 88, 62, 3), '#b89a78', '#9a7e5e', { cel: [3, 2], lw: 2.2 });
      c.strokeStyle = A.c('rgba(90,60,40,0.35)');
      c.lineWidth = 1.2;
      c.beginPath();
      for (let k = 1; k < 6; k++) { c.moveTo(-44 + k * 15, -98); c.lineTo(-44 + k * 15, -40); }
      c.stroke();
      // 掛在牆上的救生圈
      S(c, (p) => { p.arc(26, -74, 11, 0, TAU); p.moveTo(31, -74); p.arc(26, -74, 5, 0, TAU, true); }, '#fff6ee', null, { lw: 2, hl: false });
      c.strokeStyle = A.c('#e0584a');
      c.lineWidth = 4.5;
      [0, 1, 2, 3].forEach((k) => { c.beginPath(); c.arc(26, -74, 8, k * Math.PI / 2 + 0.2, k * Math.PI / 2 + 0.65); c.stroke(); });
      // 柱子
      S(c, (p) => RR(p, -54, -128, 6, 128, 2), '#6e4e36', null, { lw: 1.8, hl: false });
      S(c, (p) => RR(p, 48, -128, 6, 128, 2), '#6e4e36', null, { lw: 1.8, hl: false });
      // 冰台：碎冰上躺著魚、蝦、貝殼
      S(c, (p) => RR(p, -56, -40, 112, 40, 3), '#5a8ab0', '#467094', { cel: [3, 2], lw: 2.2 });
      S(c, (p) => { p.moveTo(-54, -40); p.lineTo(-48, -52); p.lineTo(48, -52); p.lineTo(54, -40); p.closePath(); }, '#eaf8ff', '#c8e4f4', { lw: 2, hl: false, shadeY: -44 });
      [[-36, -50, '#8fb8d8', 0.2], [-14, -52, '#f0a0a0', -0.15], [10, -50, '#8fb8d8', 0.1]].forEach(([x, yy, col, r]) => {
        c.save();
        c.translate(x, yy);
        c.rotate(r);
        S(c, (p) => { p.moveTo(-11, 0); p.quadraticCurveTo(-2, -7, 8, 0); p.lineTo(13, -4); p.lineTo(13, 4); p.lineTo(8, 0); p.quadraticCurveTo(-2, 7, -11, 0); p.closePath(); }, col, null, { lw: 1.4, hl: false });
        dot(c, -6, -1, 1.1, '#2a1a10');
        c.restore();
      });
      // 螃蟹與貝殼
      E(c, 34, -53, 8, 5, '#e8584a', '#c83a2a', { lw: 1.4, hl: false });
      line(c, [[28, -56], [25, -61]], '#c83a2a', 1.6);
      line(c, [[40, -56], [43, -61]], '#c83a2a', 1.6);
      dot(c, 31, -58, 1.2, '#2a1a10');
      dot(c, 37, -58, 1.2, '#2a1a10');
      S(c, (p) => { p.moveTo(-50, -50); p.quadraticCurveTo(-46, -58, -42, -50); p.closePath(); }, '#ffd8c0', null, { lw: 1.2, hl: false });
      // 價目板
      S(c, (p) => RR(p, -24, -30, 48, 18, 3), '#fbf6ee', null, { lw: 1.6, hl: false });
      text(c, '今日鮮魚', 0, -21, 10, '#3a5a7a');
      // 藍白條紋遮陽棚
      const aw = (p) => { p.moveTo(-64, -108); p.lineTo(-54, -134); p.lineTo(54, -134); p.lineTo(64, -108); p.closePath(); };
      S(c, aw, '#fbf6ee', '#e4dccc', { cel: [3, 2], lw: 2.2 });
      c.save();
      c.beginPath();
      aw(c);
      c.clip();
      c.fillStyle = A.c('#4a8ac0');
      for (let k = 0; k < 9; k += 2) {
        c.beginPath();
        c.moveTo(-54 + k * 12, -134); c.lineTo(-42 + k * 12, -134); c.lineTo(-50 + (k + 1) * 14.2, -108); c.lineTo(-64 + k * 14.2, -108);
        c.closePath();
        c.fill();
      }
      c.restore();
      for (let k = 0; k < 9; k++) S(c, (p) => p.arc(-57 + k * 14.2, -108, 7.1, 0, Math.PI), k % 2 ? '#fbf6ee' : '#4a8ac0', null, { lw: 1.5, hl: false });
    });
    // 攤子旁邊疊的魚箱（低矮）
    crate(c, P(1176), y, 26, 16, '#9ac0d8');
    crate(c, P(1180), y - 16, 20, 12, '#9ac0d8');
    at(c, P(1176), y - 16, (c) => [[-8, -1], [2, -2]].forEach(([x, yy]) => E(c, x, yy, 5, 2.5, '#c8d8e8', null, { lw: 1, hl: false })));

    // ── 小河豚的沙堡與沙灘玩具（河豚和松鼠之間）──
    at(c, P(1432), y, (c) => {
      S(c, (p) => p.ellipse(0, 1, 34, 6, 0, 0, TAU), '#f0dca8', '#dcc48c', { lw: 1.6, hl: false, shadeY: 3 });
      S(c, (p) => { p.moveTo(-22, 0); p.lineTo(-22, -16); p.lineTo(-18, -16); p.lineTo(-18, -20); p.lineTo(-14, -20); p.lineTo(-14, -16); p.lineTo(-10, -16); p.lineTo(-10, -24); p.lineTo(-6, -24); p.lineTo(-6, -32); p.lineTo(6, -32); p.lineTo(6, -24); p.lineTo(10, -24); p.lineTo(10, -16); p.lineTo(22, -16); p.lineTo(22, 0); p.closePath(); }, '#f0d49a', '#d8b878', { cel: [2, 1], lw: 1.8 });
      S(c, (p) => { p.moveTo(-3, 0); p.lineTo(-3, -8); p.quadraticCurveTo(0, -12, 3, -8); p.lineTo(3, 0); p.closePath(); }, '#b8986a', null, { lw: 1.2, hl: false });
      line(c, [[0, -32], [0, -46]], '#8a6446', 1.4);
      // 小桶子和鏟子
      S(c, (p) => { p.moveTo(24, 0); p.lineTo(22, -14); p.lineTo(36, -14); p.lineTo(34, 0); p.closePath(); }, '#ff8a5a', '#e06a3a', { lw: 1.6, hl: false, shadeY: -5 });
      c.strokeStyle = A.outline(); c.lineWidth = 1.2; c.beginPath(); c.arc(29, -14, 7, Math.PI, 0); c.stroke();
      line(c, [[-30, -2], [-36, -20]], '#ffd35a', 2.4);
      S(c, (p) => p.ellipse(-29, -1, 4, 3, 0.3, 0, TAU), '#ffd35a', null, { lw: 1.2, hl: false });
      // 海星
      c.save();
      c.translate(14, -2);
      S(c, (p) => { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k / 10) * TAU; const r = k % 2 ? 2 : 5; k ? p.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6) : p.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.6); } p.closePath(); }, '#ff9a6a', null, { lw: 1, hl: false });
      c.restore();
    });
    // 海灘傘
    at(c, P(1470), y, (c) => {
      line(c, [[0, 0], [-6, -96]], '#f4ece0', 3);
      line(c, [[0, 0], [-6, -96]], null, 1);
      const um = (p) => { p.moveTo(-48, -84); p.quadraticCurveTo(-6, -126, 36, -92); p.quadraticCurveTo(-6, -98, -48, -84); p.closePath(); };
      S(c, um, '#fff6ee', '#e8dccc', { cel: [3, 2], lw: 2.2 });
      c.save();
      c.beginPath();
      um(c);
      c.clip();
      c.fillStyle = A.c('#ff8a8a');
      [[-48, -30], [-18, 2]].forEach(([a, b]) => {
        c.beginPath(); c.moveTo(-6, -112); c.lineTo(a, -80); c.lineTo(b - 12, -90); c.closePath(); c.fill();
      });
      c.beginPath(); c.moveTo(-6, -112); c.lineTo(16, -96); c.lineTo(36, -92); c.closePath(); c.fill();
      c.restore();
      E(c, -6, -112, 3, 3, '#ff8a8a', null, { lw: 1.2, hl: false });
    });

    // ── 漁夫的船屋（右）──
    const hx = P(1660);
    at(c, hx, y, (c) => {
      // 木樁與平台
      [-76, -38, 0, 38, 76].forEach((dx) => S(c, (p) => RR(p, dx - 4, -16, 8, 16, 2), '#6e4e36', null, { lw: 1.6, hl: false }));
      S(c, (p) => RR(p, -90, -22, 180, 9, 3), '#a07a52', '#86623e', { lw: 2.2, hl: false });
      // 煙囪
      S(c, (p) => RR(p, 38, -150, 14, 34, 2), '#b8b0a4', '#9a9286', { cel: [2, 0], lw: 2 });
      // 牆
      S(c, (p) => RR(p, -72, -104, 144, 84, 4), '#7a9ab4', '#62829c', { cel: [6, 3] });
      c.strokeStyle = A.c('rgba(40,60,80,0.35)');
      c.lineWidth = 1.4;
      c.beginPath();
      for (let k = 1; k < 7; k++) { c.moveTo(-70, -104 + k * 12); c.lineTo(70, -104 + k * 12); }
      c.stroke();
      // 門
      S(c, (p) => { p.moveTo(-22, -22); p.lineTo(-22, -70); p.lineTo(10, -70); p.lineTo(10, -22); p.closePath(); }, '#c8945e', '#a8744a', { shadeY: -40, lw: 2.4 });
      line(c, [[-22, -46], [10, -46]], '#8a5a36', 1.6);
      dot(c, 4, -42, 1.8, '#ffd35a');
      // 門上的船名牌
      S(c, (p) => RR(p, -28, -84, 44, 12, 2), '#fbf6ee', null, { lw: 1.4, hl: false });
      text(c, '海獺號', -6, -78, 8, '#3a5a7a');
      // 圓窗
      windowBox(c, 26, -76, 26, 26, '#c8945e', null, true);
      // 牆上：浮球、船槳
      E(c, -54, -76, 7, 8, '#f08a4a', '#c8663a', { lw: 2, hl: false });
      E(c, -54, -54, 7, 8, '#ffd35a', '#e0b030', { lw: 2, hl: false });
      c.save();
      c.translate(-38, -60);
      c.rotate(-0.2);
      S(c, (p) => RR(p, -2, -34, 4, 50, 2), '#d8b080', null, { lw: 1.4, hl: false });
      S(c, (p) => p.ellipse(0, 20, 5, 11, 0, 0, TAU), '#d8b080', '#b89060', { lw: 1.4, hl: false });
      c.restore();
      // 屋頂
      S(c, (p) => { p.moveTo(-92, -98); p.lineTo(0, -152); p.lineTo(92, -98); p.lineTo(82, -92); p.lineTo(0, -138); p.lineTo(-82, -92); p.closePath(); }, '#e0584a', '#b8403a', { cel: [4, 3] });
      S(c, (p) => { p.moveTo(-82, -94); p.lineTo(0, -140); p.lineTo(82, -94); p.closePath(); }, '#f4ece0', '#dcd2c4', { cel: [3, 2], lw: 2.2 });
      // 山牆上的舵輪
      c.strokeStyle = A.c('#8a6446');
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, -114, 10, 0, TAU);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; c.moveTo(Math.cos(a) * 4, -114 + Math.sin(a) * 4); c.lineTo(Math.cos(a) * 15, -114 + Math.sin(a) * 15); }
      c.stroke();
      // 屋頂的風向袋桿
      line(c, [[-60, -110], [-60, -150]], '#5a6470', 2.2);
      // 門邊疊著的捕蝦籠
      [[82, 0], [100, 0], [91, -16]].forEach(([dx, dy]) => {
        S(c, (p) => RR(p, dx - 9, dy - 16, 18, 16, 3), '#c8a070', null, { lw: 1.6, hl: false });
        c.strokeStyle = A.c('rgba(90,60,30,0.6)');
        c.lineWidth = 1;
        c.beginPath();
        for (let k = 1; k < 4; k++) { c.moveTo(dx - 9 + k * 4.5, dy - 16); c.lineTo(dx - 9 + k * 4.5, dy); }
        c.moveTo(dx - 9, dy - 8); c.lineTo(dx + 9, dy - 8);
        c.stroke();
      });
    });
    // 晾衣桿（碼頭上那根桅杆）
    at(c, P(1812), y, (c) => {
      S(c, (p) => RR(p, -3, -70, 6, 70, 2), '#8a6446', null, { lw: 1.8, hl: false });
      line(c, [[-12, -62], [12, -62]], '#8a6446', 3);
    });
    // ── 小碼頭：地上挖出一小塊潮池，停著一艘小船 ──
    at(c, P(1845), y, (c) => {
      S(c, (p) => p.ellipse(0, 6, 60, 10, 0, 0, TAU), '#5ab0d8', '#3f97cf', { lw: 2.2, hl: false, shadeY: 9 });
      S(c, (p) => p.ellipse(0, 3, 60, 5, 0, Math.PI, 0), '#d8c49a', null, { noStroke: true, hl: false });
      // 棧板
      S(c, (p) => RR(p, -70, -6, 44, 6, 2), '#a07a52', '#86623e', { lw: 1.8, hl: false });
      line(c, [[-66, 0], [-66, 14]], '#6e4e36', 3);
      line(c, [[-32, 0], [-32, 14]], '#6e4e36', 3);
      // 繫船柱
      S(c, (p) => RR(p, -38, -16, 8, 10, 2), '#5a6470', null, { lw: 1.6, hl: false });
    });

    // 旗串的起點：燈塔瞭望台 → 船屋屋頂
    const rope = sag(LX + 34, y - H - 16, P(1660) - 60, y - 150, 60);
    rope.draw(c, '#5a3a22', 1.4);
    // 營地招牌：掛在旗串上的漂流木
    const [sx, sy] = rope.at(0.62);
    hangSign(c, sx, sy + 2, 96, 26, '燈塔岬', '#d8c09a', '#3a5a7a', 4);
    // 燈泡繩：魚市攤 → 海灘傘
    const lamp = sag(P(1160), y - 130, P(1464), y - 112, 26);
    lamp.draw(c, '#5a3a22', 1.3);
    // 地上的貝殼、草
    [[P(905), '#ffd8c0'], [P(1205), '#fff0e0'], [P(1320), '#ffc8b0'], [P(1560), '#fff0e0']].forEach(([x, col]) => S(c, (p) => { p.moveTo(x - 4, y); p.quadraticCurveTo(x, y - 7, x + 4, y); p.closePath(); }, col, null, { lw: 1.1, hl: false }));
    [P(830), P(1030), P(1300), P(1590), P(1760)].forEach((x, k) => grassTuft(c, x, y, 1, k % 2 ? '#7ab84e' : '#8cc75a'));
  }

  function r2Anim(ctx, x1, x2, y, t) {
    const P = (wx) => wx - 800 + x1;
    const LX = P(760);
    const H = 250;
    // 燈塔：慢慢轉的光束
    const pulse = 0.75 + Math.sin(t * 2) * 0.15;
    glow(ctx, LX, y - H - 36, 80, 0.45 * pulse, '255,236,160');
    const cs = Math.cos(t * 0.9);
    const len = 40 + Math.abs(cs) * 220;
    const dir = cs > 0 ? 1 : -1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createLinearGradient(LX, 0, LX + dir * len, 0);
    bg.addColorStop(0, 'rgba(255,240,170,0.4)');
    bg.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(LX, y - H - 42);
    ctx.lineTo(LX + dir * len, y - H - 72);
    ctx.lineTo(LX + dir * len, y - H);
    ctx.lineTo(LX, y - H - 30);
    ctx.fill();
    ctx.restore();
    E(ctx, LX, y - H - 36, 6, 6, '#ffffff', null, { noStroke: true, hl: false });
    winGlow(ctx, LX, y - 120, 18, t, 1);
    winGlow(ctx, LX, y - 190, 18, t, 2);
    // 瞭望台欄杆上的海鷗
    perchBird(ctx, LX - 24, y - H - 22, t, 3, '#f4f4f4', 1);
    // 旗串
    const rope = sag(LX + 34, y - H - 16, P(1660) - 60, y - 150, 60);
    bunting(ctx, rope, t, ['#e0584a', '#fff6ee', '#4a8ac0', '#ffd35a'], 22, 6);
    // 燈泡繩
    const lamp = sag(P(1160), y - 130, P(1464), y - 112, 26);
    bulbs(ctx, lamp, t, 9, ['#ffd35a', '#8fd3f4', '#ff9fc4'], '255,220,130');
    // 曬網：隨風擺
    const nx = P(958);
    const sw = Math.sin(t * 1.2) * 4;
    ctx.save();
    ctx.translate(nx, y);
    A.shape(ctx, (c) => { c.moveTo(-40, -92); c.lineTo(40, -92); c.quadraticCurveTo(36 + sw, -54, 28 + sw, -34); c.quadraticCurveTo(sw, -46, -28 + sw, -36); c.quadraticCurveTo(-36 + sw, -58, -40, -92); c.closePath(); }, 'rgba(111,156,146,0.55)', null, { lw: 1.6, hl: false });
    ctx.strokeStyle = A.c('rgba(50,84,78,0.55)');
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let k = -36; k <= 36; k += 8) { ctx.moveTo(k, -92); ctx.lineTo(k * 0.8 + sw, -38); }
    for (let k = 0; k < 5; k++) { ctx.moveTo(-38, -84 + k * 10); ctx.lineTo(38 + sw * (k / 5), -84 + k * 10); }
    ctx.stroke();
    [-28, -10, 10, 28].forEach((k) => E(ctx, k, -92, 3.5, 3, '#f08a4a', null, { lw: 1.3, hl: false }));
    ctx.restore();
    perchBird(ctx, nx + 42, y - 96, t, 7, '#f4f4f4', -1);
    // 曬魚乾：網架 → 魚市攤
    const fish = sag(nx + 42, y - 80, P(1110) - 54, y - 112, 10);
    fish.draw(ctx, '#8a6446', 1.2);
    laundry(ctx, fish, t, [
      { u: 0.25, k: 'fish', c: '#c8b090', s: '#a89070' },
      { u: 0.5, k: 'fish', c: '#d8c0a0', s: '#b8a080' },
      { u: 0.75, k: 'fish', c: '#c8b090', s: '#a89070' },
    ]);
    // 沙堡上的小旗
    pennant(ctx, P(1432), y - 46, t, '#ff5a5a', 12, 1);
    // 小螃蟹在沙堡旁邊橫著走
    const cx = P(1395) + Math.sin(t * 0.6) * 12;
    const leg = Math.sin(t * 12) * 1.5;
    ctx.save();
    ctx.translate(cx, y - 4);
    [-1, 1].forEach((s) => { line(ctx, [[s * 4, 1], [s * 9, 3 + leg * s]], '#c83a2a', 1.3); line(ctx, [[s * 4, 0], [s * 10, 0 - leg * s]], '#c83a2a', 1.3); });
    E(ctx, 0, -1, 6, 4, '#e8584a', null, { lw: 1.3, hl: false });
    line(ctx, [[-3, -4], [-4, -8]], null, 1);
    line(ctx, [[3, -4], [4, -8]], null, 1);
    dot(ctx, -4, -8.5, 1.3, '#2a1a10');
    dot(ctx, 4, -8.5, 1.3, '#2a1a10');
    ctx.restore();
    // 船屋：窗光、煙、風向袋
    const hx = P(1660);
    winGlow(ctx, hx + 39, y - 63, 34, t, 4);
    smoke(ctx, hx + 45, y - 154, t, 4, '245,245,245', 70, 5);
    ctx.save();
    ctx.translate(hx - 60, y - 148);
    const wf = Math.sin(t * 5) * 2;
    [0, 1, 2, 3].forEach((k) => A.shape(ctx, (c) => { c.moveTo(k * 7, -1 - k * 0.6 + wf * k * 0.2); c.lineTo(k * 7 + 7, -0.4 - k * 0.6 + wf * (k + 1) * 0.2); c.lineTo(k * 7 + 7, 7.4 + k * 0.6 + wf * (k + 1) * 0.2); c.lineTo(k * 7, 8 + k * 0.6 + wf * k * 0.2); c.closePath(); }, k % 2 ? '#fff6ee' : '#ff7a4a', null, { lw: 1.2, hl: false }));
    ctx.restore();
    // 晾衣繩：船屋 → 碼頭桅杆
    const lr = sag(hx + 72, y - 96, P(1812), y - 62, 16);
    lr.draw(ctx, '#e8dcc0', 1.3);
    laundry(ctx, lr, t, [
      { u: 0.2, k: 'shirt', c: '#fbf6ee', s: '#e0d6c6', stripe: '#4a8ac0' },
      { u: 0.5, k: 'towel', c: '#ff8a8a', s: '#e06a6a' },
      { u: 0.72, k: 'sock', c: '#4a8ac0' },
      { u: 0.8, k: 'sock', c: '#e0584a' },
    ]);
    // 碼頭：水紋與搖晃的小船
    const px = P(1845);
    ctx.save();
    ctx.translate(px, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.4 + k / 3) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.beginPath();
      ctx.ellipse(18, 7, 10 + ph * 26, 2 + ph * 3, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const bob = Math.sin(t * 1.6) * 1.8;
    ctx.translate(20, 4 + bob);
    ctx.rotate(Math.sin(t * 1.3) * 0.05);
    A.shape(ctx, (c) => { c.moveTo(-30, -12); c.lineTo(30, -12); c.quadraticCurveTo(28, 2, 16, 4); c.lineTo(-18, 4); c.quadraticCurveTo(-30, 0, -30, -12); c.closePath(); }, '#e0584a', '#b8403a', { cel: [2, 1.5], lw: 2 });
    ctx.fillStyle = A.c('#fbf6ee');
    ctx.fillRect(-28, -10, 57, 3);
    line(ctx, [[-4, -12], [-4, -30]], '#8a6446', 2);
    line(ctx, [[-10, -12], [12, -22]], '#d8b080', 2.4);
    ctx.restore();
    line(ctx, [[px - 34, y - 12], [px - 10, y - 6 + bob]], '#d8c090', 1.2);
    // 海鷗飛過
    flyBirds(ctx, x1, x2, y - 440, t, 4, 'rgba(90,90,100,0.6)');
  }

  // ════════ 第三章：溫泉谷（露天風呂、木桶湯、溫泉蛋攤、兩層樓的旅館）════════
  function tileRoof(c, w, y0, h, col, shade, curl) {
    const roof = (p) => {
      p.moveTo(-w / 2 - curl, y0 + 4);
      p.quadraticCurveTo(-w / 2 + 6, y0 - 2, -w / 2 + 18, y0 - h * 0.35);
      p.lineTo(-w / 2 + h, y0 - h);
      p.lineTo(w / 2 - h, y0 - h);
      p.lineTo(w / 2 - 18, y0 - h * 0.35);
      p.quadraticCurveTo(w / 2 - 6, y0 - 2, w / 2 + curl, y0 + 4);
      p.quadraticCurveTo(w / 2 - 10, y0 - 8, 0, y0 - 8);
      p.quadraticCurveTo(-w / 2 + 10, y0 - 8, -w / 2 - curl, y0 + 4);
      p.closePath();
    };
    S(c, roof, col, shade, { cel: [4, 4] });
    c.save();
    c.beginPath();
    roof(c);
    c.clip();
    c.strokeStyle = A.c('rgba(30,40,55,0.32)');
    c.lineWidth = 1.8;
    for (let k = -12; k <= 12; k++) {
      c.beginPath();
      c.moveTo(k * (w / 2 - h) / 12, y0 - h);
      c.lineTo(k * (w / 2 + 6) / 12, y0);
      c.stroke();
    }
    c.restore();
    S(c, (p) => RR(p, -w / 2 + h - 6, y0 - h - 8, w - 2 * h + 12, 9, 4), shade, null, { lw: 2.2, hl: false });
  }

  function r3Static(c, x1, x2, y) {
    const P = (wx) => wx - 800 + x1;

    // ── 露天風呂（最左）──
    const px = P(772);
    at(c, px, y, (c) => {
      // 背後的大岩石＋竹籬
      S(c, (p) => { p.moveTo(-72, 0); p.quadraticCurveTo(-80, -70, -50, -104); p.quadraticCurveTo(-20, -124, 6, -106); p.quadraticCurveTo(20, -96, 16, -60); p.lineTo(10, 0); p.closePath(); }, '#8e8276', '#6e6258', { cel: [6, 3], lw: 2.6 });
      c.strokeStyle = A.c('rgba(50,40,34,0.35)');
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(-66, -40); c.quadraticCurveTo(-30, -48, 10, -40);
      c.moveTo(-60, -76); c.quadraticCurveTo(-30, -84, 8, -74);
      c.stroke();
      S(c, (p) => { p.moveTo(-54, -100); p.quadraticCurveTo(-30, -118, -6, -110); p.quadraticCurveTo(-24, -104, -54, -100); p.closePath(); }, '#8ab05a', null, { lw: 1.4, hl: false });
      for (let k = 0; k < 6; k++) {
        const bx = 18 + k * 11;
        S(c, (p) => RR(p, bx, -84 + (k % 2) * 6, 9, 84 - (k % 2) * 6, 4), '#9ac070', '#7aa050', { cel: [2, 0], lw: 1.6, hl: false });
        line(c, [[bx + 1, -52], [bx + 8, -52]], '#7aa050', 1.2);
      }
      line(c, [[14, -62], [86, -62]], '#6b4428', 3.5);
      line(c, [[14, -28], [86, -28]], '#6b4428', 3.5);
      // 竹子引水管（從岩石伸出來）
      S(c, (p) => RR(p, -36, -78, 50, 7, 3.5), '#8ab05a', '#6a9040', { lw: 1.8, hl: false, shadeY: -73 });
      line(c, [[-26, -78], [-26, -71]], '#6a9040', 1.4);
      line(c, [[-4, -78], [-4, -71]], '#6a9040', 1.4);
      line(c, [[-30, -71], [-30, -40]], '#6a9040', 3);
      // 池子
      S(c, (p) => p.ellipse(8, -6, 82, 16, 0, 0, TAU), '#9a948a', '#7e786e', { lw: 2.4, hl: false, shadeY: 0 });
      S(c, (p) => p.ellipse(8, -8, 70, 10, 0, 0, TAU), '#8fe0da', '#6ccac4', { lw: 2, hl: false, shadeY: -5 });
      [[-70, -8, 13], [-52, 2, 10], [78, -8, 14], [60, 3, 10], [-14, 6, 9], [26, 7, 10]].forEach(([dx, dy, r]) => E(c, dx, dy, r, r * 0.62, '#b0aa9e', '#8e887c', { lw: 2, hl: false, cel: [2, 1.5] }));
      // 池邊疊著的小木桶
      [[-86, 0], [-72, 0], [-79, -12]].forEach(([dx, dy]) => {
        S(c, (p) => { p.moveTo(dx - 7, dy); p.lineTo(dx - 6, dy - 11); p.lineTo(dx + 6, dy - 11); p.lineTo(dx + 7, dy); p.closePath(); }, '#e0b880', '#c09a60', { lw: 1.5, hl: false, shadeY: dy - 4 });
        line(c, [[dx - 6.5, dy - 4], [dx + 6.5, dy - 4]], '#6a6a74', 1.4);
      });
    });

    // ── 木桶湯（猴爺爺和水豚之間）──
    at(c, P(986), y, (c) => {
      S(c, (p) => { p.moveTo(-26, 0); p.lineTo(-28, -40); p.lineTo(28, -40); p.lineTo(26, 0); p.closePath(); }, '#d8a870', '#b88a54', { cel: [3, 0], lw: 2.3 });
      c.strokeStyle = A.c('rgba(120,80,40,0.45)');
      c.lineWidth = 1.2;
      c.beginPath();
      for (let k = -3; k <= 3; k++) { c.moveTo(k * 8, -40); c.lineTo(k * 7.6, 0); }
      c.stroke();
      [-32, -8].forEach((yy) => line(c, [[-28, yy], [28, yy]], '#6a6a74', 2.6));
      E(c, 0, -40, 28, 5, '#9fe0dc', '#7cc8c4', { lw: 1.8, hl: false });
      // 小台階
      S(c, (p) => RR(p, -44, -14, 18, 14, 2), '#b88a54', '#9a7040', { lw: 1.8, hl: false });
      S(c, (p) => RR(p, -44, -26, 14, 6, 2), '#c89a64', null, { lw: 1.4, hl: false });
    });
    // 毛巾架（水豚和營火之間）
    at(c, P(1132), y, (c) => {
      S(c, (p) => RR(p, -32, -70, 5, 70, 2), '#8a5a36', null, { lw: 1.6, hl: false });
      S(c, (p) => RR(p, 27, -70, 5, 70, 2), '#8a5a36', null, { lw: 1.6, hl: false });
      line(c, [[-36, -68], [36, -68]], '#8a5a36', 3.5);
      line(c, [[-34, -2], [-26, -2]], '#8a5a36', 3);
      line(c, [[26, -2], [34, -2]], '#8a5a36', 3);
      // 一雙木屐擺在下面
      [[-12, 0], [0, 0]].forEach(([dx]) => {
        S(c, (p) => RR(p, dx - 5, -4, 10, 3, 1), '#c8905a', null, { lw: 1.2, hl: false });
        line(c, [[dx - 3, -1], [dx - 3, 0]], null, 1.4);
        line(c, [[dx + 3, -1], [dx + 3, 0]], null, 1.4);
        line(c, [[dx - 3, -4], [dx, -7], [dx + 3, -4]], '#e0484a', 1.2);
      });
    });

    // ── 石燈籠（小熊貓和狐獴之間）──
    at(c, P(1310), y, (c) => {
      S(c, (p) => RR(p, -11, -7, 22, 7, 2), '#a8a49a', '#86827a', { lw: 2 });
      S(c, (p) => RR(p, -4.5, -28, 9, 21, 2), '#a8a49a', '#86827a', { lw: 2, cel: [1.5, 0] });
      S(c, (p) => RR(p, -11, -43, 22, 15, 3), '#a8a49a', '#86827a', { lw: 2 });
      S(c, (p) => RR(p, -5, -40, 10, 8, 2), '#ffd88a', null, { lw: 1.4, hl: false });
      S(c, (p) => { p.moveTo(-18, -43); p.quadraticCurveTo(0, -57, 18, -43); p.closePath(); }, '#a8a49a', '#86827a', { lw: 2 });
      E(c, 0, -57, 3.5, 3.5, '#a8a49a', null, { lw: 1.6, hl: false });
      S(c, (p) => { p.moveTo(-14, -46); p.quadraticCurveTo(-6, -52, 2, -50); p.quadraticCurveTo(-6, -46, -14, -46); p.closePath(); }, '#8ab05a', null, { lw: 1, hl: false });
    });

    // ── 溫泉蛋小攤（狐獴和松鼠之間）──
    at(c, P(1440), y, (c) => {
      // 石灶
      S(c, (p) => RR(p, -30, -30, 60, 30, 4), '#b0a498', '#948878', { cel: [3, 1.5], lw: 2.2 });
      c.strokeStyle = A.c('rgba(80,70,60,0.45)');
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(-28, -15); c.lineTo(28, -15);
      c.moveTo(-10, -30); c.lineTo(-10, -15); c.moveTo(12, -30); c.lineTo(12, -15); c.moveTo(0, -15); c.lineTo(0, 0);
      c.stroke();
      // 竹蒸籠疊兩層
      [[-12, -30], [12, -30], [0, -42]].forEach(([dx, dy]) => {
        S(c, (p) => RR(p, dx - 13, dy - 12, 26, 12, 3), '#e0c08a', '#c8a470', { lw: 1.6, hl: false, shadeY: dy - 4 });
        line(c, [[dx - 12, dy - 6], [dx + 12, dy - 6]], '#a88a5a', 1);
      });
      // 蛋籃子
      S(c, (p) => { p.moveTo(18, -30); p.lineTo(20, -40); p.lineTo(34, -40); p.lineTo(36, -30); p.closePath(); }, '#c8a070', null, { lw: 1.4, hl: false });
      [[23, -42], [29, -43], [26, -45]].forEach(([x, yy]) => E(c, x, yy, 3, 3.6, '#fff8ee', null, { lw: 1 }));
      // 小屋頂
      line(c, [[-34, -30], [-34, -92]], '#8a5a36', 4);
      line(c, [[34, -30], [34, -92]], '#8a5a36', 4);
      S(c, (p) => { p.moveTo(-46, -86); p.lineTo(-30, -104); p.lineTo(30, -104); p.lineTo(46, -86); p.quadraticCurveTo(0, -92, -46, -86); p.closePath(); }, '#7a6a5a', '#5e5044', { cel: [2, 2], lw: 2.2 });
      S(c, (p) => RR(p, -22, -86, 44, 12, 2), '#3a2a20', null, { lw: 1.6, hl: false });
      text(c, '溫泉蛋', 0, -80, 9, '#ffe0a0');
    });

    // ── 溫泉旅館（右，兩層樓）──
    const ix = P(1680);
    const W = 200;
    at(c, ix, y, (c) => {
      // 煙囪
      S(c, (p) => RR(p, 44, -238, 16, 40, 2), '#9a8a80', '#7e6e64', { cel: [2, 0], lw: 2 });
      // 石基
      S(c, (p) => RR(p, -W / 2 - 6, -14, W + 12, 14, 4), '#a8a49a', '#8a867c', { cel: [4, 2] });
      // 一樓
      S(c, (p) => RR(p, -W / 2, -104, W, 92, 2), '#f4ead8', '#e0d4bc', { cel: [6, 2] });
      c.fillStyle = A.c('#7a4a30');
      for (let k = 0; k <= 4; k++) c.fillRect(-W / 2 + k * (W / 4) - 4, -104, 8, 92);
      c.fillRect(-W / 2, -104, W, 7);
      c.strokeStyle = A.outline();
      c.lineWidth = A.LW;
      c.strokeRect(-W / 2, -104, W, 92);
      // 紙窗
      [[-W / 2 + 10, -88], [W / 2 - 42, -88]].forEach(([wx, wy]) => {
        S(c, (p) => RR(p, wx, wy, 32, 40, 2), '#ffe8b0', '#ffd890', { lw: 2, hl: false, shadeY: wy + 30 });
        c.strokeStyle = A.c('#8a5a3a');
        c.lineWidth = 1.2;
        c.beginPath();
        for (let k = 1; k < 4; k++) { c.moveTo(wx + k * 8, wy); c.lineTo(wx + k * 8, wy + 40); }
        c.moveTo(wx, wy + 13); c.lineTo(wx + 32, wy + 13); c.moveTo(wx, wy + 27); c.lineTo(wx + 32, wy + 27);
        c.stroke();
      });
      // 入口
      S(c, (p) => RR(p, -30, -88, 60, 76, 2), '#5a3a2a', '#4a2e20', { lw: 2.2, hl: false });
      S(c, (p) => RR(p, -26, -40, 52, 28, 1), '#ffe0a8', null, { lw: 1.4, hl: false });
      // 門口的木屐與踏石
      S(c, (p) => RR(p, -26, -6, 52, 6, 2), '#b8b0a0', null, { lw: 1.6, hl: false });
      [[-10, -6], [4, -6]].forEach(([dx, dy]) => { S(c, (p) => RR(p, dx - 4, dy - 3, 8, 3, 1), '#c8905a', null, { lw: 1, hl: false }); line(c, [[dx - 2, dy - 3], [dx, dy - 6], [dx + 2, dy - 3]], '#3a4a8a', 1.1); });
      // 一樓屋簷
      tileRoof(c, W + 36, -98, 22, '#5e6e84', '#4a586c', 12);
      // 二樓
      S(c, (p) => RR(p, -W / 2 + 20, -190, W - 40, 90, 2), '#f4ead8', '#e0d4bc', { cel: [5, 2] });
      c.fillStyle = A.c('#7a4a30');
      for (let k = 0; k <= 4; k++) c.fillRect(-W / 2 + 20 + k * ((W - 40) / 4) - 3.5, -190, 7, 90);
      c.strokeStyle = A.outline();
      c.lineWidth = A.LW;
      c.strokeRect(-W / 2 + 20, -190, W - 40, 90);
      [-60, -20, 20].forEach((wx) => {
        S(c, (p) => RR(p, wx + 4, -176, 32, 36, 2), '#ffe8b0', '#ffd890', { lw: 1.8, hl: false, shadeY: -150 });
        c.strokeStyle = A.c('#8a5a3a');
        c.lineWidth = 1.1;
        c.beginPath();
        for (let k = 1; k < 4; k++) { c.moveTo(wx + 4 + k * 8, -176); c.lineTo(wx + 4 + k * 8, -140); }
        c.moveTo(wx + 4, -158); c.lineTo(wx + 36, -158);
        c.stroke();
      });
      // 二樓陽台欄杆
      S(c, (p) => RR(p, -W / 2 + 12, -112, W - 24, 6, 2), '#7a4a30', null, { lw: 1.8, hl: false });
      S(c, (p) => RR(p, -W / 2 + 12, -134, W - 24, 5, 2), '#7a4a30', null, { lw: 1.6, hl: false });
      c.strokeStyle = A.c('#7a4a30');
      c.lineWidth = 2.4;
      c.beginPath();
      for (let k = 0; k <= 16; k++) { c.moveTo(-W / 2 + 16 + k * ((W - 32) / 16), -130); c.lineTo(-W / 2 + 16 + k * ((W - 32) / 16), -112); }
      c.stroke();
      // 陽台上晾著的浴衣
      S(c, (p) => { p.moveTo(36, -134); p.lineTo(62, -134); p.lineTo(60, -110); p.lineTo(38, -110); p.closePath(); }, '#8fb8e8', '#6f98c8', { lw: 1.6, hl: false, shadeY: -118 });
      S(c, (p) => { p.moveTo(30, -134); p.lineTo(68, -134); p.lineTo(66, -128); p.lineTo(32, -128); p.closePath(); }, '#8fb8e8', null, { lw: 1.4, hl: false });
      [[42, -124], [52, -116], [56, -126]].forEach(([x, yy]) => dot(c, x, yy, 1.6, '#ffffff'));
      line(c, [[38, -118], [60, -118]], '#e8504a', 2);
      // 大屋頂
      tileRoof(c, W, -186, 42, '#5e6e84', '#4a586c', 22);
      // 招牌
      S(c, (p) => RR(p, -44, -214, 88, 22, 3), '#3a2a20', null, { lw: 2.2, hl: false });
      text(c, '溫泉旅館', 0, -203, 14, '#ffe0a0');
      // 屋簷下的柿子乾
      [[-86, -96], [-70, -96]].forEach(([x, yy]) => {
        line(c, [[x, yy], [x, yy + 36]], '#8a6446', 1);
        for (let k = 0; k < 4; k++) E(c, x, yy + 6 + k * 8, 3.4, 3.8, '#f08a3a', null, { lw: 1, hl: false });
      });
    });

    // 燈籠繩：竹籬 → 旅館屋簷
    const rope = sag(P(856), y - 90, P(1580) - 14, y - 116, 58);
    rope.draw(c, '#3a2a20', 1.4);
    const [sx, sy] = rope.at(0.5);
    hangSign(c, sx, sy + 2, 92, 26, '溫泉谷', '#c8905a', '#4a2e1f', 4);
    // 石板小徑與石頭
    stonePath(c, P(1170), P(1560), y, '#b8b0a4', 9);
    [[P(1040), 5], [P(1220), 4], [P(1350), 6], [P(1600), 5]].forEach(([x, r]) => E(c, x, y - 1, r * 1.4, r, '#b08a70', '#906a54', { lw: 1.4, hl: false }));
    [P(900), P(1180), P(1500), P(1800)].forEach((x) => grassTuft(c, x, y, 0.9, '#a8a060'));
  }

  function r3Anim(ctx, x1, x2, y, t) {
    const P = (wx) => wx - 800 + x1;
    const px = P(772);
    // 竹管的水柱
    ctx.save();
    ctx.strokeStyle = 'rgba(200,245,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 14, y - 75);
    ctx.quadraticCurveTo(px + 22, y - 72, px + 24, y - 16);
    ctx.stroke();
    for (let k = 0; k < 3; k++) {
      const ph = (t * 1.6 + k / 3) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(px + 24, y - 10, 4 + ph * 20, 1 + ph * 3, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    // 池面的光點與漂浮的小鴨
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(px - 38 + Math.sin(t) * 6, y - 12, 26, 2);
    ctx.fillRect(px + 40 - Math.sin(t) * 6, y - 8, 16, 2);
    const dx = px - 20 + Math.sin(t * 0.4) * 22;
    const dy = y - 10 + Math.sin(t * 2) * 1;
    E(ctx, dx, dy - 3, 7, 4.5, '#ffd84a', '#f0b820', { lw: 1.4, hl: false });
    E(ctx, dx + 4, dy - 9, 4, 3.8, '#ffd84a', null, { lw: 1.4, hl: false });
    S(ctx, (c) => { c.moveTo(dx + 7, dy - 9); c.lineTo(dx + 11, dy - 8); c.lineTo(dx + 7, dy - 7); c.closePath(); }, '#f28c38', null, { lw: 0.9, hl: false });
    dot(ctx, dx + 5, dy - 10, 0.9, '#2a1a10');
    steam(ctx, px + 8, y - 12, t, 7, 130, 100, 0.38);
    // 木桶湯：柚子與蒸氣
    const bx = P(986);
    [[-12, 0], [4, 1], [14, 2.2]].forEach(([ox, ph]) => E(ctx, bx + ox + Math.sin(t * 0.8 + ph) * 3, y - 41 + Math.sin(t * 2 + ph) * 0.8, 3.6, 3, '#ffd84a', null, { lw: 1.1, hl: false }));
    steam(ctx, bx, y - 42, t + 2, 4, 40, 80, 0.45);
    // 毛巾
    const tr = { at: (u) => [P(1132) - 30 + u * 60, y - 68] };
    laundry(ctx, tr, t, [
      { u: 0.18, k: 'towel', c: '#fff8ee', s: '#e8dcc8', stripe: '#3a4a8a' },
      { u: 0.5, k: 'towel', c: '#ffb8c8', s: '#e898a8', stripe: '#ffffff' },
      { u: 0.82, k: 'towel', c: '#b8e0d0', s: '#98c0b0', stripe: '#ffffff' },
    ]);
    // 石燈籠
    winGlow(ctx, P(1310), y - 36, 24, t, 3, '255,200,120', 0.5);
    // 溫泉蛋的蒸氣、旗子
    steam(ctx, P(1440), y - 54, t + 1, 5, 40, 70, 0.5);
    ctx.save();
    ctx.translate(P(1440) - 58, y);
    line(ctx, [[0, 0], [0, -96]], '#8a5a36', 2.4);
    const fw = Math.sin(t * 2.4) * 2;
    A.shape(ctx, (c) => { c.moveTo(2, -92); c.lineTo(18 + fw * 0.4, -92); c.lineTo(18 + fw, -50); c.lineTo(2, -50); c.closePath(); }, '#e8503a', '#c03a2a', { lw: 1.6, hl: false, shadeY: -60 });
    text(ctx, '名', 10 + fw * 0.5, -80, 9, '#fff6ee');
    text(ctx, '物', 10 + fw * 0.7, -64, 9, '#fff6ee');
    ctx.restore();
    // 旅館：窗光、暖簾、燈籠、煙
    const ix = P(1680);
    [[-74, -68], [74, -68], [-40, -158], [0, -158], [40, -158]].forEach(([ox, oy], k) => winGlow(ctx, ix + ox, y + oy, 36, t, k));
    winGlow(ctx, ix, y - 30, 44, t, 6, '255,200,120', 0.4);
    const sw = Math.sin(t * 1.4) * 2;
    for (let k = 0; k < 3; k++) {
      const nx0 = ix - 28 + k * 19;
      A.shape(ctx, (c) => { c.moveTo(nx0, y - 88); c.lineTo(nx0 + 18, y - 88); c.lineTo(nx0 + 18 + sw, y - 48); c.lineTo(nx0 + sw, y - 48); c.closePath(); }, '#3a4a8a', '#2e3a70', { lw: 1.8, hl: false });
    }
    text(ctx, '湯', ix + sw * 0.5, y - 70, 18, '#fff6ee');
    paperLantern(ctx, ix - 118, y - 100, t, 0, '#e8503a', 10);
    paperLantern(ctx, ix + 118, y - 100, t, 1, '#e8503a', 10);
    smoke(ctx, ix + 52, y - 244, t, 4, '245,240,235', 80, 6);
    // 燈籠繩
    const rope = sag(P(856), y - 90, P(1580) - 14, y - 116, 58);
    for (let k = 1; k < 10; k++) {
      if (k === 5) continue;
      const [lx, ly] = rope.at(k / 10);
      paperLantern(ctx, lx, ly, t, k, k % 2 ? '#e8503a' : '#ffd88a', 5.5);
    }
    // 小橘色螢光（溫泉的夜）
    fireflies(ctx, px + 20, y - 80, 180, 120, t, 5, '255,200,130');
    flyBirds(ctx, x1, x2, y - 430, t, 3);
  }

  // ════════ 第四章：霜鈴村（神社、鳥居、木屋、雪屋、兩層樓的雜貨山莊）════════
  function snowCap(c, pts, thick) {
    // pts：屋頂上緣的折線；沿著它鋪一層厚雪，下緣是波浪
    S(c, (p) => {
      p.moveTo(pts[0][0] - 4, pts[0][1] + 2);
      for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1] - thick * 0.4);
      const n = pts.length;
      p.lineTo(pts[n - 1][0] + 4, pts[n - 1][1] + 2);
      for (let i = n - 1; i > 0; i--) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i - 1];
        const segs = Math.max(1, Math.round(Math.hypot(ax - bx, ay - by) / 16));
        for (let k = 1; k <= segs; k++) {
          const u = k / segs;
          const x = ax + (bx - ax) * u;
          const yy = ay + (by - ay) * u;
          const um = (k - 0.5) / segs;
          p.quadraticCurveTo(ax + (bx - ax) * um, ay + (by - ay) * um + thick * 1.1, x, yy + thick * 0.4);
        }
      }
      p.closePath();
    }, '#ffffff', '#d4e0ee', { cel: [1.5, 2], lw: 2, hl: false });
  }
  function icicles(c, x1, x2, yy, seed) {
    for (let x = x1, k = 0; x <= x2; x += 9 + hash(seed + k) * 7, k++) {
      const h = 5 + hash(seed + k * 1.9) * 10;
      S(c, (p) => { p.moveTo(x - 2.4, yy); p.lineTo(x + 2.4, yy); p.lineTo(x, yy + h); p.closePath(); }, '#e4f4ff', null, { lw: 1.1, hl: false });
    }
  }
  function gableRoof(c, w, eaveY, peakH, col, shade, over) {
    const o = over || 14;
    S(c, (p) => { p.moveTo(-w / 2 - o, eaveY); p.lineTo(0, eaveY - peakH); p.lineTo(w / 2 + o, eaveY); p.lineTo(w / 2 + o - 8, eaveY + 6); p.lineTo(0, eaveY - peakH + 12); p.lineTo(-w / 2 - o + 8, eaveY + 6); p.closePath(); }, col, shade, { cel: [3, 3] });
    snowCap(c, [[-w / 2 - o, eaveY], [0, eaveY - peakH], [w / 2 + o, eaveY]], 9);
    icicles(c, -w / 2 - o + 6, -w / 2 + 10, eaveY + 4, w);
    icicles(c, w / 2 - 10, w / 2 + o - 6, eaveY + 4, w + 3);
  }
  function snowPile(c, x, y, w, h) {
    S(c, (p) => { p.moveTo(x - w, y); p.quadraticCurveTo(x - w * 0.8, y - h, x - w * 0.2, y - h * 1.05); p.quadraticCurveTo(x + w * 0.5, y - h * 1.1, x + w, y); p.closePath(); }, '#ffffff', '#d4e0ee', { cel: [2, 1.5], lw: 1.8, hl: false });
  }

  function r4Static(c, x1, x2, y) {
    const P = (wx) => wx - 800 + x1;

    // ── 神社拜殿（左，狐狸巫女的家）──
    at(c, P(770), y, (c) => {
      S(c, (p) => RR(p, -70, -14, 140, 14, 3), '#a8a4a0', '#8a8680', { cel: [4, 2] });
      S(c, (p) => RR(p, -30, -22, 60, 8, 2), '#b8b4b0', '#9a9690', { lw: 1.8, hl: false });
      // 柱與牆
      S(c, (p) => RR(p, -58, -112, 116, 98, 2), '#f4ead8', '#e0d4bc', { cel: [5, 2] });
      [-58, -20, 20, 50].forEach((dx) => S(c, (p) => RR(p, dx, -112, 8, 98, 1), '#d8323a', '#a82028', { cel: [2, 0], lw: 1.8, hl: false }));
      // 格子門（透出燈光）
      S(c, (p) => RR(p, -12, -92, 32, 70, 1), '#ffe0a0', '#ffd080', { lw: 1.8, hl: false, shadeY: -40 });
      c.strokeStyle = A.c('#8a5a3a');
      c.lineWidth = 1.1;
      c.beginPath();
      for (let k = 1; k < 4; k++) { c.moveTo(-12 + k * 8, -92); c.lineTo(-12 + k * 8, -22); }
      for (let k = 1; k < 7; k++) { c.moveTo(-12, -92 + k * 10); c.lineTo(20, -92 + k * 10); }
      c.stroke();
      // 香油錢箱
      S(c, (p) => RR(p, -44, -40, 26, 18, 2), '#8a5a36', '#6e4428', { cel: [1.5, 1], lw: 1.8 });
      c.strokeStyle = A.c('#4a2e1f');
      c.lineWidth = 1;
      c.beginPath();
      for (let k = 1; k < 5; k++) { c.moveTo(-44 + k * 5.2, -40); c.lineTo(-44 + k * 5.2, -34); }
      c.stroke();
      // 注連繩
      S(c, (p) => { p.moveTo(-60, -112); p.quadraticCurveTo(0, -94, 60, -112); p.lineTo(60, -106); p.quadraticCurveTo(0, -88, -60, -106); p.closePath(); }, '#e8d8a8', '#c8b888', { lw: 1.8, hl: false });
      [-40, -14, 14, 40].forEach((dx) => S(c, (p) => { p.moveTo(dx - 2, -101); p.lineTo(dx + 3, -95); p.lineTo(dx - 1, -95); p.lineTo(dx + 3, -86); p.lineTo(dx - 2, -94); p.closePath(); }, '#ffffff', null, { lw: 1, hl: false }));
      // 屋頂：深紅瓦＋厚雪
      S(c, (p) => { p.moveTo(-92, -104); p.quadraticCurveTo(-72, -112, -60, -128); p.lineTo(-30, -168); p.lineTo(30, -168); p.lineTo(60, -128); p.quadraticCurveTo(72, -112, 92, -104); p.quadraticCurveTo(0, -122, -92, -104); p.closePath(); }, '#6a3444', '#521f30', { cel: [4, 3] });
      snowCap(c, [[-92, -106], [-60, -128], [-30, -168], [30, -168], [60, -128], [92, -106]], 10);
      icicles(c, -86, -60, -104, 1);
      icicles(c, 60, 86, -104, 2);
      // 屋脊上的金色小飾
      E(c, 0, -178, 5, 5, '#f0c040', '#c8962a', { lw: 1.6, hl: false });
      // 繪馬架（拜殿左邊）
      at(c, -84, 0, (c) => {
        S(c, (p) => RR(p, -2, -50, 4, 50, 1), '#8a5a36', null, { lw: 1.4, hl: false });
        S(c, (p) => RR(p, 18, -50, 4, 50, 1), '#8a5a36', null, { lw: 1.4, hl: false });
        line(c, [[-4, -46], [24, -46]], '#8a5a36', 2.6);
        line(c, [[-4, -30], [24, -30]], '#8a5a36', 2.6);
        [[2, -44], [12, -44], [6, -28], [17, -28]].forEach(([x, yy], k) => {
          S(c, (p) => { p.moveTo(x - 4, yy + 2); p.lineTo(x - 4, yy + 9); p.lineTo(x + 4, yy + 9); p.lineTo(x + 4, yy + 2); p.lineTo(x, yy - 1); p.closePath(); }, '#e8c890', null, { lw: 1, hl: false });
          dot(c, x, yy + 5, 1.2, ['#d8323a', '#4a8aa8', '#4a8a5a', '#d8323a'][k]);
        });
        S(c, (p) => { p.moveTo(-8, -50); p.quadraticCurveTo(10, -58, 28, -50); p.closePath(); }, '#ffffff', '#d4e0ee', { lw: 1.4, hl: false });
      });
    });

    // ── 鳥居（狐狸巫女和犛牛長老之間）──
    at(c, P(960), y, (c) => {
      const tw = 32;
      [-tw, tw].forEach((dx) => {
        S(c, (p) => RR(p, dx - 4.5, -104, 9, 104, 2), '#d8323a', '#a82028', { cel: [2, 0], lw: 2.2 });
        S(c, (p) => RR(p, dx - 6, -10, 12, 10, 2), '#3a2a20', null, { lw: 1.6, hl: false });
      });
      S(c, (p) => RR(p, -tw - 10, -84, tw * 2 + 20, 7, 1.5), '#d8323a', '#a82028', { lw: 2, hl: false });
      S(c, (p) => { p.moveTo(-tw - 20, -104); p.quadraticCurveTo(0, -100, tw + 20, -104); p.lineTo(tw + 23, -113); p.quadraticCurveTo(0, -106, -tw - 23, -113); p.closePath(); }, '#d8323a', '#a82028', { cel: [2, 2], lw: 2.2, hl: false });
      S(c, (p) => { p.moveTo(-tw - 23, -113); p.quadraticCurveTo(0, -106, tw + 23, -113); p.lineTo(tw + 25, -119); p.quadraticCurveTo(0, -112, -tw - 25, -119); p.closePath(); }, '#3a2a20', null, { lw: 1.8, hl: false });
      snowCap(c, [[-tw - 25, -119], [0, -113], [tw + 25, -119]], 6);
      S(c, (p) => RR(p, -8, -104, 16, 18, 1.5), '#3a2a20', null, { lw: 1.4, hl: false });
      text(c, '霜', 0, -95, 10, '#f0c040');
      line(c, [[-tw, -76], [tw, -76]], '#e8d8a8', 2);
      // 小石狐
      [[-tw - 16, 1], [tw + 16, -1]].forEach(([fx, d]) => {
        S(c, (p) => RR(p, fx - 9, -10, 18, 10, 2), '#a8a4a0', '#8a8680', { lw: 1.8, hl: false });
        E(c, fx, -20, 7, 10, '#c8c4bc', '#a8a49c', { cel: [1.5, 1.5], lw: 1.8, hl: false });
        S(c, (p) => { p.moveTo(fx - 5, -30); p.lineTo(fx - 4, -38); p.lineTo(fx, -32); p.lineTo(fx + 4, -38); p.lineTo(fx + 5, -30); p.quadraticCurveTo(fx + 8 * d, -26, fx + 9 * d, -26); p.quadraticCurveTo(fx, -22, fx - 5, -30); p.closePath(); }, '#c8c4bc', '#a8a49c', { cel: [1, 1], lw: 1.8, hl: false });
        S(c, (p) => { p.moveTo(fx - 6, -24); p.lineTo(fx + 6, -24); p.lineTo(fx, -17); p.closePath(); }, '#d8323a', null, { lw: 1.2, hl: false });
        S(c, (p) => p.ellipse(fx, -38, 6, 2.2, 0, Math.PI, 0), '#ffffff', null, { lw: 1.2, hl: false });
      });
    });

    // ── 犛牛長老的木屋 ──
    const hx = P(1122);
    at(c, hx, y, (c) => {
      // 煙囪
      S(c, (p) => RR(p, 32, -170, 20, 50, 2), '#9a8a80', '#7e6e64', { cel: [3, 0], lw: 2 });
      S(c, (p) => RR(p, 29, -178, 26, 10, 5), '#ffffff', '#d4e0ee', { lw: 2, hl: false });
      S(c, (p) => RR(p, -70, -12, 140, 12, 3), '#a8a4a0', '#8a8680', { cel: [4, 2] });
      // 圓木牆
      S(c, (p) => RR(p, -62, -96, 124, 86, 3), '#a8744a', '#8a5a36', { cel: [6, 3] });
      c.strokeStyle = A.c('rgba(70,40,20,0.45)');
      c.lineWidth = 1.5;
      c.beginPath();
      for (let k = 1; k < 8; k++) { c.moveTo(-60, -96 + k * 10.7); c.lineTo(60, -96 + k * 10.7); }
      c.stroke();
      for (let k = 0; k < 8; k++) {
        E(c, -64, -91 + k * 10.7, 3.6, 4.6, '#c8945e', null, { lw: 1.2, hl: false });
        E(c, 64, -91 + k * 10.7, 3.6, 4.6, '#c8945e', null, { lw: 1.2, hl: false });
      }
      // 門與冬青花圈
      S(c, (p) => { p.moveTo(-10, -10); p.lineTo(-10, -58); p.quadraticCurveTo(8, -70, 26, -58); p.lineTo(26, -10); p.closePath(); }, '#6a4430', '#56362a', { shadeY: -28, lw: 2.3 });
      dot(c, 20, -34, 2, '#ffd35a');
      S(c, (p) => { p.arc(8, -48, 8, 0, TAU); p.moveTo(12, -48); p.arc(8, -48, 4, 0, TAU, true); }, '#4a8a5a', null, { lw: 1.5, hl: false });
      dot(c, 4, -42, 1.6, '#e0484a');
      dot(c, 8, -41, 1.6, '#e0484a');
      // 窗
      windowBox(c, -50, -76, 30, 26, '#6a4430', '#ffe0a0', false);
      S(c, (p) => RR(p, -54, -48, 38, 5, 2.5), '#ffffff', '#d4e0ee', { lw: 1.6, hl: false });
      // 牆上掛的雪鞋和鈴
      c.save();
      c.translate(46, -70);
      c.rotate(0.2);
      S(c, (p) => p.ellipse(0, 0, 6, 12, 0, 0, TAU), 'rgba(0,0,0,0)', null, { lw: 2.2, hl: false });
      c.strokeStyle = A.c('#c8945e');
      c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-5, -4); c.lineTo(5, -4); c.moveTo(-5, 3); c.lineTo(5, 3); c.moveTo(0, -11); c.lineTo(0, 11); c.stroke();
      c.restore();
      gableRoof(c, 124, -92, 70, '#5a3444', '#44202e', 16);
      // 山牆的小閣樓窗
      windowBox(c, -9, -142, 18, 16, '#6a4430', '#ffe0a0', true);
      // 木柴堆（右側）
      [[76, 0], [88, 0], [100, 0], [82, -10], [94, -10], [88, -20]].forEach(([dx, dy]) => {
        E(c, dx, -6 + dy, 6, 6, '#b88a5a', '#96683e', { lw: 1.8, hl: false });
        E(c, dx, -6 + dy, 2.4, 2.4, '#e0c090', null, { noStroke: true, hl: false });
      });
      S(c, (p) => { p.moveTo(68, -24); p.quadraticCurveTo(88, -40, 108, -22); p.quadraticCurveTo(88, -28, 68, -24); p.closePath(); }, '#ffffff', null, { lw: 1.6, hl: false });
      // 斧頭插在木墩上
      S(c, (p) => RR(p, -92, -14, 20, 14, 3), '#b88a5a', '#96683e', { lw: 1.6, hl: false });
      E(c, -82, -14, 10, 3, '#e0c090', null, { lw: 1.4, hl: false });
      line(c, [[-80, -16], [-72, -34]], '#8a5a36', 2.6);
      S(c, (p) => { p.moveTo(-84, -14); p.lineTo(-78, -22); p.lineTo(-74, -17); p.closePath(); }, '#8a94a0', null, { lw: 1.2, hl: false });
    });

    // ── 雪人與雪橇（小兔和白鹿之間）──
    at(c, P(1322), y, (c) => {
      S(c, (p) => { p.moveTo(-26, -4); p.lineTo(-6, -4); p.quadraticCurveTo(2, -4, 2, -10); p.moveTo(-26, -4); p.quadraticCurveTo(-30, -4, -30, -8); }, 'rgba(0,0,0,0)', null, { lw: 2, hl: false });
      S(c, (p) => RR(p, -28, -12, 26, 5, 2), '#d8323a', '#a82028', { lw: 1.6, hl: false });
      line(c, [[-24, -7], [-24, -3]], null, 1.4);
      line(c, [[-8, -7], [-8, -3]], null, 1.4);
      E(c, 10, -14, 15, 13, '#ffffff', '#d4e0ee', { cel: [2, 2] });
      E(c, 11, -35, 10, 9.5, '#ffffff', '#d4e0ee', { cel: [1.5, 1.5] });
      dot(c, 8, -37, 1.5, '#3a2418');
      dot(c, 15, -37, 1.5, '#3a2418');
      S(c, (p) => { p.moveTo(12, -34); p.lineTo(22, -32); p.lineTo(12, -31); p.closePath(); }, '#f28c38', null, { lw: 1.1, hl: false });
      S(c, (p) => RR(p, 0, -28, 22, 5, 2.5), '#4a8aa8', null, { lw: 1.4, hl: false });
      S(c, (p) => RR(p, 3, -29, 5, 12, 2), '#4a8aa8', null, { lw: 1.3, hl: false });
      S(c, (p) => RR(p, 3, -52, 16, 9, 2), '#3a2a20', null, { lw: 1.4, hl: false });
      S(c, (p) => RR(p, 0, -45, 22, 3, 1.5), '#3a2a20', null, { lw: 1.2, hl: false });
      line(c, [[0, -16], [-10, -26]], '#7a5234', 1.8);
      line(c, [[20, -16], [30, -24]], '#7a5234', 1.8);
      dot(c, 10, -18, 1.4, '#3a2418');
      dot(c, 10, -12, 1.4, '#3a2418');
    });

    // ── 雪見燈籠（小鹿和松鼠之間）──
    at(c, P(1506), y, (c) => {
      [-12, 0, 12].forEach((dx) => line(c, [[dx * 0.4, -18], [dx, 0]], '#8a8680', 3.4));
      S(c, (p) => RR(p, -10, -30, 20, 14, 3), '#a8a4a0', '#86827a', { lw: 1.8 });
      S(c, (p) => RR(p, -5, -27, 10, 8, 2), '#ffd88a', null, { lw: 1.2, hl: false });
      S(c, (p) => { p.moveTo(-24, -30); p.quadraticCurveTo(0, -46, 24, -30); p.closePath(); }, '#a8a4a0', '#86827a', { lw: 1.8 });
      S(c, (p) => { p.moveTo(-26, -30); p.quadraticCurveTo(-22, -44, 0, -52); p.quadraticCurveTo(22, -44, 26, -30); p.quadraticCurveTo(0, -38, -26, -30); p.closePath(); }, '#ffffff', '#d4e0ee', { lw: 1.8, hl: false });
    });

    // ── 犛牛雜貨山莊（右，兩層樓）──
    const lx = P(1690);
    const LW = 176;
    at(c, lx, y, (c) => {
      S(c, (p) => RR(p, 42, -226, 18, 40, 2), '#9a8a80', '#7e6e64', { cel: [3, 0], lw: 2 });
      S(c, (p) => RR(p, 39, -232, 24, 9, 4), '#ffffff', '#d4e0ee', { lw: 1.8, hl: false });
      S(c, (p) => RR(p, -LW / 2 - 6, -14, LW + 12, 14, 3), '#a8a4a0', '#8a8680', { cel: [4, 2] });
      S(c, (p) => RR(p, -LW / 2, -100, LW, 88, 2), '#f0e4d0', '#dccaae', { cel: [6, 2] });
      c.fillStyle = A.c('#7a4a30');
      for (let k = 0; k <= 4; k++) c.fillRect(-LW / 2 + k * (LW / 4) - 4, -100, 8, 88);
      c.fillRect(-LW / 2, -100, LW, 6);
      c.strokeStyle = A.outline();
      c.lineWidth = A.LW;
      c.strokeRect(-LW / 2, -100, LW, 88);
      // 店門
      S(c, (p) => RR(p, -26, -84, 52, 72, 2), '#5a3a2a', '#4a2e20', { lw: 2.2, hl: false });
      S(c, (p) => RR(p, -22, -42, 44, 30, 1), '#ffe0a8', null, { lw: 1.4, hl: false });
      // 兩側的貨架櫥窗
      [-62, 62].forEach((sx) => {
        S(c, (p) => RR(p, sx - 20, -80, 40, 48, 2), '#ffe0a0', '#ffd080', { lw: 2.2, hl: false, shadeY: -44 });
        line(c, [[sx - 20, -56], [sx + 20, -56]], '#6a4430', 2.2);
        S(c, (p) => RR(p, sx - 16, -72, 12, 14, 2), '#c84a4a', null, { lw: 1.4, hl: false });
        S(c, (p) => RR(p, sx, -70, 14, 12, 2), '#4a8aa8', null, { lw: 1.4, hl: false });
        E(c, sx - 8, -44, 7, 7, '#d8b070', null, { lw: 1.4, hl: false });
        E(c, sx - 8, -44, 3.4, 3.4, '#b89050', null, { lw: 1.1, hl: false });
        S(c, (p) => RR(p, sx + 4, -52, 9, 16, 3), '#8a929c', null, { lw: 1.4, hl: false });
      });
      // 一樓的小斜簷＋店名
      S(c, (p) => { p.moveTo(-LW / 2 - 14, -94); p.lineTo(-LW / 2 + 8, -110); p.lineTo(LW / 2 - 8, -110); p.lineTo(LW / 2 + 14, -94); p.closePath(); }, '#6e4a36', '#56382a', { cel: [3, 2] });
      snowCap(c, [[-LW / 2 - 14, -96], [-LW / 2 + 8, -110], [LW / 2 - 8, -110], [LW / 2 + 14, -96]], 6);
      icicles(c, -LW / 2 - 8, LW / 2 + 8, -93, 7);
      S(c, (p) => RR(p, -34, -104, 68, 14, 3), '#3a2a20', null, { lw: 1.6, hl: false });
      text(c, '犛牛雜貨', 0, -97, 11, '#ffe0a0');
      // 二樓
      S(c, (p) => RR(p, -60, -176, 120, 64, 2), '#a8744a', '#8a5a36', { cel: [5, 2] });
      c.strokeStyle = A.c('rgba(70,40,20,0.45)');
      c.lineWidth = 1.4;
      c.beginPath();
      for (let k = 1; k < 6; k++) { c.moveTo(-58, -176 + k * 10.7); c.lineTo(58, -176 + k * 10.7); }
      c.stroke();
      [-30, 30].forEach((dx) => {
        S(c, (p) => RR(p, dx - 12, -164, 24, 26, 11), '#ffe0a0', '#ffd080', { lw: 2.2, hl: false, shadeY: -146 });
        line(c, [[dx, -164], [dx, -138]], '#6a4430', 1.8);
        S(c, (p) => RR(p, dx - 15, -139, 30, 5, 2.5), '#ffffff', '#d4e0ee', { lw: 1.4, hl: false });
      });
      gableRoof(c, 120, -172, 56, '#5a3444', '#44202e', 16);
    });
    // 雪屋（右邊平台下，矮矮的）
    at(c, P(1848), y, (c) => {
      S(c, (p) => { p.moveTo(-34, 0); p.quadraticCurveTo(-34, -44, 0, -46); p.quadraticCurveTo(34, -44, 34, 0); p.closePath(); }, '#ffffff', '#d4e0ee', { cel: [4, 3], lw: 2.2 });
      c.strokeStyle = A.c('rgba(150,170,200,0.55)');
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(-30, -16); c.quadraticCurveTo(0, -22, 30, -16);
      c.moveTo(-24, -32); c.quadraticCurveTo(0, -38, 24, -32);
      c.stroke();
      S(c, (p) => { p.moveTo(-12, 0); p.lineTo(-12, -14); p.quadraticCurveTo(0, -26, 12, -14); p.lineTo(12, 0); p.closePath(); }, '#ffcf80', '#f0b060', { lw: 1.8, hl: false, shadeY: -6 });
    });
    // 晾圍巾手套的竿子
    at(c, P(1830), y, (c) => S(c, (p) => RR(p, 22, -72, 5, 26, 2), '#8a5a36', null, { lw: 1.4, hl: false }));

    // 雪堆、腳印
    snowPile(c, P(705), y, 16, 8);
    snowPile(c, P(1036), y, 14, 6);
    snowPile(c, P(1200), y, 14, 6);
    snowPile(c, P(1790), y, 18, 8);
    for (let k = 0; k < 12; k++) {
      const fx = P(1150) + k * 26;
      E(c, fx, y + 3 + (k % 2) * 2, 3, 1.4, 'rgba(160,180,210,0.6)', null, { noStroke: true, hl: false });
    }
    // 風鈴繩：鳥居 → 山莊屋簷，中間掛著村子的招牌
    const rope = sag(P(998), y - 112, P(1690) - 90, y - 104, 50);
    rope.draw(c, '#5a4030', 1.3);
    const [sx, sy] = rope.at(0.44);
    hangSign(c, sx, sy + 2, 92, 26, '霜鈴村', '#c8905a', '#4a2e1f', 4);
    S(c, (p) => { p.moveTo(sx - 48, sy + 5); p.quadraticCurveTo(sx, sy - 2, sx + 48, sy + 5); p.quadraticCurveTo(sx, sy + 2, sx - 48, sy + 5); p.closePath(); }, '#ffffff', null, { lw: 1.4, hl: false });
  }

  function windBell(ctx, x, y, t, k, col) {
    const sw = Math.sin(t * 2.2 + k * 1.3) * 0.22 + Math.sin(t * 5.1 + k) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sw);
    line(ctx, [[0, 0], [0, 4]], '#5a4030', 1);
    S(ctx, (c) => { c.moveTo(-5, 11); c.quadraticCurveTo(-5.5, 3, 0, 3); c.quadraticCurveTo(5.5, 3, 5, 11); c.closePath(); }, col, null, { lw: 1.3, hl: false });
    line(ctx, [[0, 11], [0, 15]], '#5a4030', 0.9);
    S(ctx, (c) => RR(c, -2.5, 15, 5, 8, 1), '#fff6ee', null, { lw: 0.9, hl: false });
    ctx.restore();
  }

  function r4Anim(ctx, x1, x2, y, t) {
    const P = (wx) => wx - 800 + x1;
    const sx = P(770);
    // 拜殿：格子門的燈、大鈴與紅白繩
    winGlow(ctx, sx + 4, y - 58, 50, t, 1, '255,200,120', 0.35);
    const rs = Math.sin(t * 1.5) * 0.07;
    ctx.save();
    ctx.translate(sx - 30, y - 104);
    ctx.rotate(rs);
    for (let k = 0; k < 16; k++) {
      ctx.strokeStyle = A.c(k % 2 ? '#ffffff' : '#d8323a');
      ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(0, 14 + k * 4); ctx.lineTo(0, 18 + k * 4); ctx.stroke();
    }
    S(ctx, (c) => { c.moveTo(-8, 14); c.quadraticCurveTo(-9, 2, 0, 1); c.quadraticCurveTo(9, 2, 8, 14); c.closePath(); }, '#f0c040', '#c8962a', { lw: 1.6, hl: false, shadeY: 10 });
    ctx.restore();
    // 鳥居的紙垂
    const pf = Math.sin(t * 2) * 1.5;
    [-12, 12].forEach((dx) => S(ctx, (c) => { const x = P(960) + dx; c.moveTo(x - 2, y - 76); c.lineTo(x + 2 + pf, y - 70); c.lineTo(x - 1 + pf, y - 70); c.lineTo(x + 3 + pf, y - 62); c.lineTo(x - 2, y - 70); c.closePath(); }, '#ffffff', null, { lw: 1.1, hl: false }));
    // 木屋：窗光、煙
    const hx = P(1122);
    winGlow(ctx, hx - 35, y - 63, 40, t, 2);
    winGlow(ctx, hx, y - 134, 22, t, 3);
    smoke(ctx, hx + 42, y - 180, t, 4, '235,240,248', 90, 6);
    // 風鈴繩
    const rope = sag(P(998), y - 112, P(1690) - 90, y - 104, 50);
    for (let k = 1; k < 13; k++) {
      if (k === 5 || k === 6) continue;
      const [bx, by] = rope.at(k / 13);
      windBell(ctx, bx, by, t, k, ['#cdefff', '#ffe0a0', '#ffd8e8', '#d8f4d0'][k % 4]);
    }
    // 雪見燈籠
    winGlow(ctx, P(1506), y - 23, 26, t, 4, '255,200,120', 0.55);
    // 山莊：窗光、燈籠、屋簷的風鈴、煙
    const lx = P(1690);
    [[-62, -56], [62, -56], [-30, -151], [30, -151], [0, -28]].forEach(([ox, oy], k) => winGlow(ctx, lx + ox, y + oy, 34, t, k + 5));
    const sw = Math.sin(t * 1.4) * 2;
    for (let k = 0; k < 3; k++) {
      const nx0 = lx - 24 + k * 16.5;
      A.shape(ctx, (c) => { c.moveTo(nx0, y - 84); c.lineTo(nx0 + 15, y - 84); c.lineTo(nx0 + 15 + sw, y - 52); c.lineTo(nx0 + sw, y - 52); c.closePath(); }, '#2e6a8a', '#245470', { lw: 1.7, hl: false });
    }
    paperLantern(ctx, lx - 96, y - 96, t, 0, '#e8503a', 8);
    paperLantern(ctx, lx + 96, y - 96, t, 1, '#e8503a', 8);
    windBell(ctx, lx - 76, y - 180, t, 20, '#cdefff');
    windBell(ctx, lx + 76, y - 180, t, 21, '#ffd8e8');
    smoke(ctx, lx + 51, y - 236, t + 1.7, 4, '235,240,248', 90, 6);
    // 雪屋裡的燭光
    winGlow(ctx, P(1848), y - 10, 30, t, 9, '255,190,110', 0.5);
    // 圍巾手套晾衣繩
    const lr = sag(lx + 88, y - 92, P(1830) + 25, y - 70, 12);
    lr.draw(ctx, '#e8dcc0', 1.2);
    laundry(ctx, lr, t, [
      { u: 0.2, k: 'scarf', c: '#e0484a', s: '#c03a3a', stripe: '#ffffff' },
      { u: 0.5, k: 'mitten', c: '#4a8aa8', stripe: '#ffffff' },
      { u: 0.62, k: 'mitten', c: '#4a8aa8', stripe: '#ffffff' },
      { u: 0.85, k: 'sock', c: '#ffd35a', stripe: '#e0484a' },
    ]);
    // 停在鳥居上的小山雀
    perchBird(ctx, P(960) + 26, y - 121, t, 2, '#8a9ab8', -1);
    perchBird(ctx, P(1122) - 40, y - 108, t, 4, '#e8a070', 1);
    flyBirds(ctx, x1, x2, y - 440, t, 2, 'rgba(70,70,90,0.5)');
  }

  // ════════ 終章：神殿前庭（大理石圓亭、書廊、茶席、倒影池、渾天儀、神殿正面）════════
  const GOLD = '#f0c040';
  const GOLDS = '#c8962a';
  function starPath(c, x, y, r1, r2, n, rot) {
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * TAU;
      const r = i % 2 ? r2 : r1;
      i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }
  function gearPath(c, x, y, r, teeth, rot, hole) {
    const n = teeth * 4;
    for (let i = 0; i <= n; i++) {
      const a = rot + (i / n) * TAU;
      const q = i % 4;
      const rr = q === 1 || q === 2 ? r : r * 0.82;
      i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    if (hole) { c.moveTo(x + hole, y); c.arc(x, y, hole, 0, TAU, true); }
  }
  function column(c, x, top, bot, w) {
    S(c, (p) => RR(p, x - w / 2 - 3, bot - 6, w + 6, 6, 1.5), '#f4f0ea', '#d8d2c8', { lw: 1.8, hl: false });
    S(c, (p) => RR(p, x - w / 2, top + 5, w, bot - top - 10, 1), '#fbf8f2', '#dcd6cc', { cel: [3, 0], lw: 2, hl: false });
    c.strokeStyle = A.c('rgba(170,160,140,0.55)');
    c.lineWidth = 1;
    c.beginPath();
    for (let k = 1; k < 4; k++) { c.moveTo(x - w / 2 + (w / 4) * k, top + 8); c.lineTo(x - w / 2 + (w / 4) * k, bot - 8); }
    c.stroke();
    S(c, (p) => RR(p, x - w / 2 - 4, top, w + 8, 6, 1.5), GOLD, GOLDS, { lw: 1.8, hl: false });
  }
  function steps(c, w, n) {
    for (let k = 0; k < n; k++) {
      const ww = w - k * 14;
      S(c, (p) => RR(p, -ww / 2, -(k + 1) * 7, ww, 7, 1.5), '#f4f0ea', '#d8d2c8', { cel: [3, 1], lw: 1.8, hl: false });
    }
  }
  function clockFace(ctx, x, y, r, t, sp) {
    S(ctx, (c) => c.arc(x, y, r + 4, 0, TAU), GOLD, GOLDS, { lw: 2.2, hl: false });
    S(ctx, (c) => c.arc(x, y, r, 0, TAU), '#fff8e4', null, { lw: 1.8, hl: false });
    ctx.strokeStyle = A.outline();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.lineWidth = i % 3 ? 1.1 : 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
      ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
      ctx.stroke();
    }
    const m = t * sp - Math.PI / 2;
    const h = t * sp / 12 - Math.PI / 2 + 1.2;
    line(ctx, [[x, y], [x + Math.cos(h) * r * 0.5, y + Math.sin(h) * r * 0.5]], null, 2.4);
    line(ctx, [[x, y], [x + Math.cos(m) * r * 0.75, y + Math.sin(m) * r * 0.75]], GOLDS, 1.6);
    dot(ctx, x, y, 1.8, GOLDS);
  }
  function book(ctx, w, h, col) {
    S(ctx, (c) => RR(c, -w / 2, -h / 2, w, h, 1.5), col, null, { lw: 1.4, hl: false });
    ctx.fillStyle = A.c('#fff8e4');
    ctx.fillRect(w / 2 - 3, -h / 2 + 1.5, 2, h - 3);
    ctx.fillStyle = A.c(GOLD);
    ctx.fillRect(-w / 2 + 2, -1, w - 6, 2);
  }

  function r5Static(c, x1, x2, y) {
    const P = (wx) => wx - 800 + x1;

    // ── 大理石圓亭（左）──
    at(c, P(770), y, (c) => {
      steps(c, 150, 3);
      const top = -150;
      [-54, -24, 24, 54].forEach((dx) => column(c, dx, top, -21, 13));
      S(c, (p) => RR(p, -70, top - 12, 140, 14, 2), '#fbf8f2', '#dcd6cc', { cel: [4, 2], lw: 2.2 });
      for (let k = 0; k < 8; k++) dot(c, -56 + k * 16, top - 5, 2.1, GOLD);
      const dome = (p) => { p.moveTo(-64, top - 12); p.quadraticCurveTo(-60, top - 72, 0, top - 74); p.quadraticCurveTo(60, top - 72, 64, top - 12); p.closePath(); };
      S(c, dome, '#f4f0ea', '#d8d2c8', { cel: [6, 4], hl: [-28, top - 48, 11, 6] });
      c.save();
      c.beginPath();
      dome(c);
      c.clip();
      c.strokeStyle = A.c('#e0b040');
      c.lineWidth = 2;
      [-36, 0, 36].forEach((dx) => { c.beginPath(); c.moveTo(dx * 1.7, top - 12); c.quadraticCurveTo(dx * 0.9, top - 56, 0, top - 76); c.stroke(); });
      c.restore();
      line(c, [[0, top - 74], [0, top - 86]], GOLDS, 2.2);
      // 亭子裡的小台座
      S(c, (p) => RR(p, -14, -34, 28, 13, 2), '#fbf8f2', '#dcd6cc', { lw: 1.8, hl: false });
      S(c, (p) => RR(p, -17, -38, 34, 5, 2), GOLD, GOLDS, { lw: 1.6, hl: false });
    });

    // ── 書廊（烏龜賢者和獅身貓之間）：一座嵌著書架的大理石拱門 ──
    at(c, P(958), y, (c) => {
      steps(c, 104, 2);
      const arch = (p) => { p.moveTo(-46, -14); p.lineTo(-46, -118); p.quadraticCurveTo(-46, -158, 0, -160); p.quadraticCurveTo(46, -158, 46, -118); p.lineTo(46, -14); p.closePath(); };
      S(c, arch, '#fbf8f2', '#dcd6cc', { cel: [5, 2] });
      const inner = (p) => { p.moveTo(-32, -14); p.lineTo(-32, -112); p.quadraticCurveTo(-32, -142, 0, -144); p.quadraticCurveTo(32, -142, 32, -112); p.lineTo(32, -14); p.closePath(); };
      S(c, inner, '#6a5a78', '#584a66', { lw: 2, hl: false, shadeY: -40 });
      // 書架層板與書
      const cols = ['#c84a4a', '#4a8aa8', '#e0b040', '#5a9a6a', '#8a5aa8', '#d88a4a', '#4a6aa8'];
      [-40, -72, -104].forEach((sy, row) => {
        line(c, [[-32, sy], [32, sy]], '#c8a870', 3);
        let x = -30;
        let k = row * 3;
        while (x < 26) {
          const w = 5 + hash(k + 1.3) * 4;
          const h = 16 + hash(k * 2.1) * 9;
          if (hash(k * 5.7) > 0.86) {
            // 斜靠的一本
            c.save();
            c.translate(x + 6, sy);
            c.rotate(0.35);
            S(c, (p) => RR(p, -w / 2, -h, w, h, 1), cols[k % cols.length], null, { lw: 1.1, hl: false });
            c.restore();
            x += 12;
          } else {
            S(c, (p) => RR(p, x, sy - h, w, h, 1), cols[k % cols.length], null, { lw: 1.1, hl: false });
            c.fillStyle = A.c(GOLD);
            c.fillRect(x + 1, sy - h + 3, w - 2, 1.4);
            x += w + 0.5;
          }
          k++;
        }
      });
      // 拱頂上的金色沙漏徽
      S(c, (p) => { p.moveTo(-8, -170); p.lineTo(8, -170); p.lineTo(1.5, -162); p.lineTo(8, -154); p.lineTo(-8, -154); p.lineTo(-1.5, -162); p.closePath(); }, GOLD, GOLDS, { lw: 1.6, hl: false });
      S(c, (p) => RR(p, -10, -173, 20, 4, 1.5), '#fbf8f2', null, { lw: 1.2, hl: false });
      S(c, (p) => RR(p, -10, -155, 20, 4, 1.5), '#fbf8f2', null, { lw: 1.2, hl: false });
      // 門前一疊書與捲軸
      [[40, 0, 22, '#4a8aa8'], [41, -5, 20, '#c84a4a'], [39, -10, 18, '#e0b040']].forEach(([x, yy, w, col]) => S(c, (p) => RR(p, x - w / 2, yy - 5, w, 5, 1.5), col, null, { lw: 1.2, hl: false }));
      S(c, (p) => RR(p, -54, -7, 20, 7, 3.5), '#fff4d8', '#e8d8b0', { lw: 1.3, hl: false, shadeY: -3 });
      E(c, -54, -3.5, 2, 3.5, '#d8c090', null, { lw: 1, hl: false });
    });

    // ── 茶席（獅身貓和營火之間）──
    at(c, P(1150), y, (c) => {
      // 坐墊
      E(c, -30, -4, 11, 4.5, '#8a5aa8', '#6e4488', { lw: 1.6, hl: false });
      E(c, 30, -4, 11, 4.5, '#4a8aa8', '#366e8a', { lw: 1.6, hl: false });
      [[-30, -9], [30, -9]].forEach(([x, yy]) => dot(c, x, yy + 5, 1.4, GOLD));
      // 矮桌
      S(c, (p) => RR(p, -18, -20, 4, 20, 1), '#f4f0ea', '#d8d2c8', { lw: 1.4, hl: false });
      S(c, (p) => RR(p, 14, -20, 4, 20, 1), '#f4f0ea', '#d8d2c8', { lw: 1.4, hl: false });
      S(c, (p) => RR(p, -24, -24, 48, 6, 2), '#fbf8f2', '#dcd6cc', { lw: 1.8, hl: false });
      line(c, [[-22, -19], [22, -19]], GOLD, 1.4);
      // 茶壺與杯子、小沙漏
      E(c, -4, -31, 8, 6.5, '#fff8ee', '#e8dcc8', { lw: 1.5 });
      S(c, (p) => { p.moveTo(3, -33); p.quadraticCurveTo(10, -34, 12, -39); }, 'rgba(0,0,0,0)', null, { lw: 1.6, hl: false });
      c.strokeStyle = A.outline(); c.lineWidth = 1.4; c.beginPath(); c.arc(-12, -31, 4, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
      E(c, -4, -38, 3, 1.4, GOLD, null, { lw: 1, hl: false });
      [[10, -26], [18, -26]].forEach(([x, yy]) => S(c, (p) => { p.moveTo(x - 3, yy); p.lineTo(x - 3.5, yy - 5); p.lineTo(x + 3.5, yy - 5); p.lineTo(x + 3, yy); p.closePath(); }, '#fff8ee', null, { lw: 1.1, hl: false }));
      S(c, (p) => { p.moveTo(-20, -24); p.lineTo(-14, -24); p.lineTo(-16.5, -29); p.lineTo(-14, -34); p.lineTo(-20, -34); p.lineTo(-17.5, -29); p.closePath(); }, '#e4f4fc', null, { lw: 1, hl: false });
    });

    // ── 渾天儀的台座與倒影池（灰鬃和松鼠之間）──
    at(c, P(1392), y, (c) => {
      // 池子
      S(c, (p) => RR(p, -72, -8, 144, 10, 4), '#fbf8f2', '#dcd6cc', { lw: 2, hl: false });
      S(c, (p) => RR(p, -64, -6, 128, 5, 2), '#8fd0f0', '#6ab4dc', { lw: 1.4, hl: false });
      // 台座
      S(c, (p) => RR(p, -16, -18, 32, 10, 2), '#f4f0ea', '#d8d2c8', { cel: [2, 1], lw: 2 });
      S(c, (p) => { p.moveTo(-9, -18); p.lineTo(-6, -60); p.lineTo(6, -60); p.lineTo(9, -18); p.closePath(); }, '#fbf8f2', '#dcd6cc', { cel: [2, 0], lw: 2 });
      S(c, (p) => RR(p, -13, -66, 26, 7, 2), GOLD, GOLDS, { lw: 1.8, hl: false });
      // 蓮花
      [[-46, -6, '#ffb8d0'], [38, -6, '#fff0f4']].forEach(([x, yy, col]) => {
        E(c, x, yy, 9, 2.4, '#7ac070', null, { lw: 1.2, hl: false });
        [-4, 0, 4].forEach((dx) => S(c, (p) => { p.moveTo(x + dx - 2.5, yy - 1); p.quadraticCurveTo(x + dx * 1.3, yy - 10, x + dx + 2.5, yy - 1); p.closePath(); }, col, null, { lw: 1, hl: false }));
      });
    });

    // ── 神殿正面（右）──
    const tx = P(1690);
    const TW = 196;
    at(c, tx, y, (c) => {
      const top = -178;
      steps(c, TW + 30, 3);
      S(c, (p) => RR(p, -TW / 2 + 10, top + 6, TW - 20, -21 - top - 6, 2), '#e8e2f0', '#d0c8dc', { cel: [6, 0], lw: 2, hl: false });
      S(c, (p) => { p.moveTo(-24, -21); p.lineTo(-24, -98); p.quadraticCurveTo(0, -120, 24, -98); p.lineTo(24, -21); p.closePath(); }, '#ffe8a8', '#ffd878', { lw: 2.2, hl: false, shadeY: -50 });
      [-1, 1].forEach((d) => S(c, (p) => RR(p, d < 0 ? -22 : 7, -80, 15, 59, 1), GOLD, GOLDS, { cel: [1.5, 0], lw: 1.6, hl: false }));
      [-84, -44, 44, 84].forEach((dx) => column(c, dx, top, -21, 16));
      S(c, (p) => RR(p, -TW / 2, top - 18, TW, 20, 2), '#fbf8f2', '#dcd6cc', { cel: [5, 2], lw: 2.4 });
      for (let k = 0; k < 7; k++) S(c, (p) => gearPath(p, -84 + k * 28, top - 8, 5.5, 6, k * 0.4, 2), GOLD, null, { lw: 1.1, hl: false });
      S(c, (p) => { p.moveTo(-TW / 2 - 10, top - 18); p.lineTo(0, top - 72); p.lineTo(TW / 2 + 10, top - 18); p.closePath(); }, '#fbf8f2', '#dcd6cc', { cel: [5, 3] });
      S(c, (p) => { p.moveTo(-TW / 2 + 16, top - 22); p.lineTo(0, top - 62); p.lineTo(TW / 2 - 16, top - 22); p.closePath(); }, '#e8e2f0', null, { lw: 1.5, hl: false });
      S(c, (p) => { p.moveTo(-TW / 2 - 14, top - 16); p.lineTo(0, top - 76); p.lineTo(TW / 2 + 14, top - 16); p.lineTo(TW / 2 + 6, top - 16); p.lineTo(0, top - 68); p.lineTo(-TW / 2 - 6, top - 16); p.closePath(); }, GOLD, GOLDS, { lw: 1.8, hl: false });
      S(c, (p) => starPath(p, 0, top - 84, 7, 3, 4, -Math.PI / 2), '#ffe070', '#e0b040', { lw: 1.5, hl: false });
      // 神殿兩側的盆栽樹
      [-TW / 2 - 26, TW / 2 + 26].forEach((dx) => {
        S(c, (p) => { p.moveTo(dx - 11, -24); p.lineTo(dx + 11, -24); p.lineTo(dx + 8, 0); p.lineTo(dx - 8, 0); p.closePath(); }, '#fbf8f2', '#dcd6cc', { cel: [2, 0], lw: 1.8 });
        line(c, [[dx - 11, -18], [dx + 11, -18]], GOLD, 1.6);
        line(c, [[dx, -24], [dx, -40]], '#8a6446', 3);
        E(c, dx, -50, 15, 14, '#7ab86a', '#5e9a50', { cel: [2, 2], lw: 1.8 });
        E(c, dx, -70, 10, 10, '#7ab86a', '#5e9a50', { cel: [1.5, 1.5], lw: 1.8 });
      });
    });

    // 火盆的柱座
    [P(1690) - TW / 2 - 4, P(1690) + TW / 2 + 4].forEach((bx) => {
      at(c, bx, y, (c) => {
        S(c, (p) => RR(p, -4, -84, 8, 64, 2), '#f4f0ea', '#d8d2c8', { lw: 1.8, hl: false });
        S(c, (p) => { p.moveTo(-12, -92); p.lineTo(12, -92); p.lineTo(7, -82); p.lineTo(-7, -82); p.closePath(); }, GOLD, GOLDS, { lw: 1.8, hl: false });
      });
    });

    // 星燈串：圓亭 → 神殿楣帶，中間掛招牌
    const rope = sag(P(770) + 64, y - 162, P(1690) - TW / 2 - 8, y - 194, 44);
    rope.draw(c, GOLDS, 1.3);
    const [sx, sy] = rope.at(0.44);
    hangSign(c, sx, sy + 2, 104, 26, '神殿前庭', '#fbf8f2', '#8a6a2a', 4);
    line(c, [[sx - 50, sy + 7], [sx + 50, sy + 7]], GOLD, 1.6);
    // 地上的金線地磚
    for (let x = P(1080); x < P(1580); x += 44) line(c, [[x, y + 2], [x + 30, y + 2]], 'rgba(224,176,64,0.55)', 1.6);
  }

  function r5Anim(ctx, x1, x2, y, t) {
    const P = (wx) => wx - 800 + x1;
    const mid = (x1 + x2) / 2;
    // 背景裡慢慢轉的淡金齒輪
    ctx.save();
    ctx.globalAlpha *= 0.22;
    [[P(1040), y - 290, 40, 12, 0.12], [P(1100), y - 250, 22, 8, -0.2], [P(1520), y - 300, 48, 14, -0.08], [mid + 40, y - 340, 28, 9, 0.15]].forEach(([gx, gy, r, n, sp]) => {
      A.shape(ctx, (c) => gearPath(c, gx, gy, r, n, t * sp, r * 0.35), GOLD, null, { lw: 2, hl: false });
    });
    ctx.restore();
    // 漂浮的大理石碎塊
    [[P(1030), y - 230, 18, 0], [P(1310), y - 250, 14, 1.3], [P(1480), y - 220, 20, 2.4], [P(880), y - 280, 12, 3.1]].forEach(([fx, fy, s, ph]) => {
      const fb = Math.sin(t * 1.1 + ph) * 5;
      ctx.save();
      ctx.translate(fx, fy + fb);
      A.shape(ctx, (c) => { c.moveTo(-s, 0); c.lineTo(s, 0); c.lineTo(s * 0.6, s * 0.7); c.lineTo(-s * 0.2, s * 1.1); c.lineTo(-s * 0.7, s * 0.6); c.closePath(); }, '#d8d2e0', '#b8b0c4', { cel: [2, 2], lw: 1.8, hl: false });
      A.shape(ctx, (c) => RR(c, -s - 1, -5, s * 2 + 2, 6, 2), '#fbf8f2', null, { lw: 1.8, hl: false });
      ctx.fillStyle = A.c(GOLD);
      ctx.fillRect(-s + 2, -1, s * 2 - 4, 1.5);
      ctx.restore();
    });
    // 圓亭：浮著會翻轉的沙漏
    const px = P(770);
    const hgy = y - 80 + Math.sin(t * 1.5) * 4;
    glow(ctx, px, hgy, 44, 0.45 + Math.sin(t * 2) * 0.1, '255,220,140');
    ctx.save();
    ctx.translate(px, hgy);
    const cyc = t % 8;
    const flip = cyc > 7 ? (cyc - 7) * Math.PI : 0;
    ctx.rotate(flip);
    const sand = Math.min(1, cyc / 7);
    const hg = (c) => { c.moveTo(-11, -17); c.lineTo(11, -17); c.lineTo(2, 0); c.lineTo(11, 17); c.lineTo(-11, 17); c.lineTo(-2, 0); c.closePath(); };
    A.shape(ctx, hg, '#e4f4fc', null, { lw: 1.8, hl: false });
    ctx.save();
    ctx.beginPath();
    hg(ctx);
    ctx.clip();
    ctx.fillStyle = A.c(GOLD);
    ctx.fillRect(-13, -17 + sand * 15, 26, 17 - sand * 15);
    ctx.fillRect(-13, 17 - sand * 13, 26, sand * 13 + 1);
    if (flip === 0) ctx.fillRect(-0.7, -2, 1.4, 19);
    ctx.restore();
    A.shape(ctx, (c) => RR(c, -14, -21, 28, 5, 2), GOLD, GOLDS, { lw: 1.6, hl: false });
    A.shape(ctx, (c) => RR(c, -14, 16, 28, 5, 2), GOLD, GOLDS, { lw: 1.6, hl: false });
    ctx.restore();
    clockFace(ctx, px, y - 150 - 96, 8, t, 0.8);
    // 書廊：繞著拱門飛的書，一頁一頁翻
    const bx = P(958);
    glow(ctx, bx, y - 90, 50, 0.22, '200,190,255');
    [['#c84a4a', 0], ['#4a8aa8', 2.1], ['#e0b040', 4.2]].forEach(([col, ph], k) => {
      const a = t * 0.6 + ph;
      const fx = bx + Math.cos(a) * 62;
      const fy = y - 150 + Math.sin(a) * 22 + Math.sin(t * 2 + k) * 3;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(Math.sin(a) * 0.2);
      const open = 0.55 + Math.sin(t * 3 + k) * 0.25;
      A.shape(ctx, (c) => { c.moveTo(0, 2); c.lineTo(-10, 2 - 8 * open); c.lineTo(-10, -6 - 8 * open); c.lineTo(0, -6); c.closePath(); }, col, null, { lw: 1.2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(0, 2); c.lineTo(10, 2 - 8 * open); c.lineTo(10, -6 - 8 * open); c.lineTo(0, -6); c.closePath(); }, col, null, { lw: 1.2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(0, 0); c.lineTo(-8, -7 * open); c.lineTo(-8, -6 - 7 * open); c.lineTo(0, -6); c.lineTo(8, -6 - 7 * open); c.lineTo(8, -7 * open); c.closePath(); }, '#fff8e4', null, { lw: 1, hl: false });
      ctx.restore();
      glow(ctx, fx, fy, 14, 0.25, '255,230,160');
    });
    // 飄出來的一張書頁
    const pp = (t * 0.18) % 1;
    ctx.save();
    ctx.globalAlpha *= Math.sin(pp * Math.PI);
    ctx.translate(bx + 20 + pp * 90, y - 70 - pp * 120 + Math.sin(pp * 12) * 8);
    ctx.rotate(Math.sin(t * 3) * 0.6);
    A.shape(ctx, (c) => RR(c, -4, -5, 8, 10, 1), '#fff8e4', null, { lw: 1, hl: false });
    ctx.restore();
    // 茶壺冒熱氣
    steam(ctx, P(1150) + 10, y - 42, t, 3, 6, 36, 0.4);
    // 渾天儀
    const ax = P(1392);
    const ay = y - 92;
    glow(ctx, ax, ay, 36, 0.32, '255,220,140');
    [[0, 1, 0], [Math.PI / 2, 1, 0.8], [0, 0.35, 1.7]].forEach(([rot, sq, ph]) => {
      const ry = 22 * Math.abs(Math.cos(t * 0.6 + ph)) * sq + 2;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(rot * 0.5 + 0.3);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, ry, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c(GOLD);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    });
    E(ctx, ax, ay, 5.5, 5.5, '#8fd0ff', '#5aa8e0', { lw: 1.8 });
    line(ctx, [[ax, ay - 28], [ax, y - 66]], GOLDS, 1.4);
    // 倒影池的漣漪
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(ax - 40 + Math.sin(t * 0.9) * 8, y - 5, 18, 1.5);
    ctx.fillRect(ax + 12 - Math.sin(t * 0.9) * 8, y - 4, 12, 1.5);
    // 神殿：門的金光、鐘面、火盆的藍火
    const tx = P(1690);
    const TW = 196;
    glow(ctx, tx, y - 70, 64, 0.38 + Math.sin(t * 1.3) * 0.08, '255,214,120');
    clockFace(ctx, tx, y - 178 - 36, 14, t, 0.6);
    [tx - TW / 2 - 4, tx + TW / 2 + 4].forEach((bx2, k) => {
      const f = Math.sin(t * 8 + k) * 1.5;
      glow(ctx, bx2, y - 100, 30, 0.5, '160,210,255');
      A.shape(ctx, (c) => { c.moveTo(bx2 - 7, y - 92); c.quadraticCurveTo(bx2 - 8, y - 102, bx2 + f, y - 113); c.quadraticCurveTo(bx2 + 8, y - 102, bx2 + 7, y - 92); c.closePath(); }, '#bfe6ff', '#8fc8f0', { lw: 1.5, hl: false });
    });
    // 星燈串
    const rope = sag(P(770) + 64, y - 162, P(1690) - TW / 2 - 8, y - 194, 44);
    for (let k = 1; k < 16; k++) {
      if (k === 7) continue;
      const [lx, ly] = rope.at(k / 16);
      const on = 0.7 + Math.sin(t * 2.2 + k) * 0.3;
      glow(ctx, lx, ly + 6, 13, 0.5 * on, '255,220,140');
      A.shape(ctx, (c) => starPath(c, lx, ly + 6, 4.5, 2, 4, -Math.PI / 2 + Math.sin(t + k) * 0.3), k % 3 ? '#ffe070' : '#bfe6ff', null, { lw: 1.1, hl: false });
    }
    // 金色的光蝶
    fireflies(ctx, P(1300), y - 140, 700, 160, t, 9, '255,226,150');
    perchBird(ctx, P(958) - 30, y - 150 + 4, t, 6, '#f4f0ea', 1);
  }

  // ════════ 註冊 ════════
  const CAMPS = {
    1: { build: r1Static, anim: r1Anim },
    2: { build: r2Static, anim: r2Anim },
    3: { build: r3Static, anim: r3Anim },
    4: { build: r4Static, anim: r4Anim },
    5: { build: r5Static, anim: r5Anim },
  };
  A.CAMP3 = CAMPS;

  A.drawCampHouses = function (ctx, x1, x2, y, t, region) {
    const R = CAMPS[region || 1];
    if (!R) return OLD && OLD.call(A, ctx, x1, x2, y, t, region);
    const W = G.world;
    const map = W && W.map && W.map.region === (region || 1) ? W.map : null;
    campAge = map && A.ageProfile ? A.ageProfile(map) : null;
    livingK = campAge ? 1 - 0.75 * campAge.lvl : 1;
    emptyChairOn = (region || 1) === 1 && !!(W && W.flags && W.flags.lavaTortoiseDefeated);
    ctx.save();
    try {
      staticLayer(ctx, region || 1, x1, x2, y, R.build);
      if (campAge && A.withAge) A.withAge(ctx, map, () => R.anim(ctx, x1, x2, y, t));
      else R.anim(ctx, x1, x2, y, t);
    } finally {
      ctx.restore();
      campAge = null;
      livingK = 1;
    }
  };
})();
