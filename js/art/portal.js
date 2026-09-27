// 傳送門（精緻版）：覆寫 npcs.js 的 A.drawPortal，簽名不變 (ctx, x, y, t, label)。
// 結構：背光與光芒 → 石台與地面符文圈 → 多層漩渦 → 依地區換造型的門框 → 符文光、粒子 → 箭頭與目的地名牌。
// 門框、石台這些不會動的部分，第一次用到時畫進離屏畫布（2 倍解析度），之後每格只貼圖。
(function () {
  'use strict';
  const A = G.art;
  const PI2 = Math.PI * 2;

  // 門的尺寸（以地面為原點）
  const CY = -74; // 漩渦中心
  const IRX = 31; // 門洞半寬
  const IRY = 60; // 門洞半高

  // ── 各地區的配色與造型 ──
  const STYLE = {
    // 森林：木頭與苔蘚
    1: { frame: 'wood', core: '220,255,210', mid: '120,230,150', deep: '20,80,60', swirl: ['#b8ffcc', '#7ef0c0', '#e8ffb0'], rune: '#a8ffb0', runeRgb: '160,255,170', stone: '#8e8a78', stoneS: '#6e6a5c', mote: ['#d8ffb0', '#fff6c0', '#a8f0d0'] },
    // 海岸：珊瑚與貝殼
    2: { frame: 'coral', core: '230,255,255', mid: '110,220,240', deep: '10,60,110', swirl: ['#b8f4ff', '#7ad8ff', '#ffd6e6'], rune: '#9ff0ff', runeRgb: '140,235,255', stone: '#d8ccb4', stoneS: '#b8a88c', mote: ['#c8f6ff', '#ffffff', '#ffc8dc'] },
    // 峽谷：紅石與餘燼
    3: { frame: 'ember', core: '255,240,200', mid: '255,150,70', deep: '90,20,20', swirl: ['#ffd08a', '#ff8a4a', '#ffe8b0'], rune: '#ffb060', runeRgb: '255,160,80', stone: '#a8604a', stoneS: '#84442f', mote: ['#ffc070', '#ffe0a0', '#ff8a4a'] },
    // 雪峰：冰與鳥居
    4: { frame: 'torii', core: '240,250,255', mid: '150,210,255', deep: '30,50,110', swirl: ['#e0f4ff', '#9fd4ff', '#c8c0ff'], rune: '#bfe8ff', runeRgb: '180,225,255', stone: '#8e98ac', stoneS: '#6e788e', mote: ['#ffffff', '#d8f0ff', '#c8d8ff'] },
    // 神殿：黃金與星辰
    5: { frame: 'gold', core: '255,250,230', mid: '200,170,255', deep: '40,20,90', swirl: ['#fff0c0', '#d8c0ff', '#a8d8ff'], rune: '#ffe08a', runeRgb: '255,220,140', stone: '#f0e8da', stoneS: '#d0c2ac', mote: ['#fff4c8', '#e0d0ff', '#ffffff'] },
  };
  const DEF = { frame: 'stone', core: '230,248,255', mid: '150,210,255', deep: '30,40,100', swirl: ['#c9f0ff', '#c9a7ff', '#e8f8ff'], rune: '#bfe8ff', runeRgb: '170,220,255', stone: '#9a98a8', stoneS: '#76748a', mote: ['#c9f0ff', '#e8d4ff', '#ffffff'] };

  function regionStyle() {
    const m = G.world && G.world.map;
    const r = m && m.region;
    return { key: STYLE[r] ? r : 0, S: STYLE[r] || DEF };
  }

  // ── 預先畫好的柔光圓 ──
  const glowCache = {};
  function glow(rgb) {
    if (glowCache[rgb]) return glowCache[rgb];
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(' + rgb + ',1)');
    gr.addColorStop(0.35, 'rgba(' + rgb + ',0.45)');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return (glowCache[rgb] = c);
  }

  // ── 離屏快取 ──
  const SC = 2;
  // 各層的範圍（相對地面原點）：石台只有薄薄一圈，門框最高到 -165
  const BOX = { base: [-68, -20, 136, 40], front: [-80, -166, 160, 176] };
  const cache = {};
  function layer(key, kind, S) {
    const id = key + ':' + kind;
    if (cache[id]) return cache[id];
    const bx = BOX[kind];
    const c = document.createElement('canvas');
    c.width = bx[2] * SC;
    c.height = bx[3] * SC;
    const g = c.getContext('2d');
    g.scale(SC, SC);
    g.translate(-bx[0], -bx[1]);
    const saveMode = A.mode;
    A.mode = null;
    try {
      if (kind === 'base') drawBase(g, S);
      else FRAME[S.frame](g, S);
    } finally {
      A.mode = saveMode;
    }
    return (cache[id] = c);
  }
  function blit(ctx, key, kind, S) {
    const bx = BOX[kind];
    ctx.drawImage(layer(key, kind, S), bx[0], bx[1], bx[2], bx[3]);
  }

  // ── 石台（門下的圓形基座） ──
  function drawBase(g, S) {
    // 兩層圓台
    A.shape(g, (c) => c.ellipse(0, 4, 62, 13, 0, 0, PI2), S.stoneS, null, { lw: 2.4 });
    A.shape(g, (c) => { c.ellipse(0, 4, 62, 13, 0, 0, Math.PI); c.lineTo(-62, -2); c.ellipse(0, -2, 62, 13, 0, Math.PI, 0, true); c.closePath(); }, S.stoneS, null, { lw: 2.4 });
    A.shape(g, (c) => c.ellipse(0, -2, 62, 13, 0, 0, PI2), S.stone, S.stoneS, { lw: 2.4, shadeY: 6 });
    // 側面石塊接縫
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 1.3;
    for (let k = -4; k <= 4; k++) {
      const x = k * 14;
      const yy = -2 + Math.sqrt(Math.max(0, 1 - (x * x) / (62 * 62))) * 13;
      g.beginPath();
      g.moveTo(x, yy);
      g.lineTo(x, yy + 6);
      g.stroke();
    }
    // 頂面的內圈與刻紋
    A.shape(g, (c) => c.ellipse(0, -3, 50, 9.5, 0, 0, PI2), S.stoneS, null, { lw: 1.6 });
    A.shape(g, (c) => c.ellipse(0, -3.5, 46, 8, 0, 0, PI2), S.stone, null, { lw: 1.2 });
    g.strokeStyle = 'rgba(0,0,0,0.18)';
    g.lineWidth = 1;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * PI2;
      g.beginPath();
      g.moveTo(Math.cos(a) * 46, -3.5 + Math.sin(a) * 8);
      g.lineTo(Math.cos(a) * 50, -3 + Math.sin(a) * 9.5);
      g.stroke();
    }
    // 台邊的小草／碎石
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(-40, -12, 30, 1.6);
    g.fillRect(12, -12, 18, 1.4);
  }

  // ── 門框造型（前景層，蓋在漩渦外緣上） ──
  // 共用：一圈拱石（楔形石塊）圍成橢圓環
  function ringStones(g, n, rx0, ry0, rx1, ry1, fill, shade, a0, a1, jitter) {
    for (let k = 0; k < n; k++) {
      const u0 = a0 + ((a1 - a0) * k) / n + 0.012;
      const u1 = a0 + ((a1 - a0) * (k + 1)) / n - 0.012;
      const j = jitter ? ((k * 7919) % 5) * 0.6 : 0;
      A.shape(g, (c) => {
        c.moveTo(Math.cos(u0) * (rx1 + j), CY + Math.sin(u0) * (ry1 + j));
        c.ellipse(0, CY, rx1 + j, ry1 + j, 0, u0, u1);
        c.lineTo(Math.cos(u1) * rx0, CY + Math.sin(u1) * ry0);
        c.ellipse(0, CY, rx0, ry0, 0, u1, u0, true);
        c.closePath();
      }, fill, shade, { cel: [2, 2], lw: 2 });
    }
  }
  function ringPath(c, rxo, ryo, rxi, ryi) {
    c.ellipse(0, CY, rxo, ryo, 0, 0, PI2);
    c.moveTo(rxi, CY);
    c.ellipse(0, CY, rxi, ryi, 0, 0, PI2, true);
  }
  function runeMarks(g, col, rx, ry, n, a0, a1) {
    g.strokeStyle = col;
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const a = a0 + ((a1 - a0) * (k + 0.5)) / n;
      const x = Math.cos(a) * rx;
      const y = CY + Math.sin(a) * ry;
      g.save();
      g.translate(x, y);
      g.rotate(a + Math.PI / 2);
      g.beginPath();
      const v = k % 4;
      if (v === 0) { g.moveTo(-3, -3); g.lineTo(0, 3); g.lineTo(3, -3); }
      else if (v === 1) { g.moveTo(0, -3.5); g.lineTo(0, 3.5); g.moveTo(-3, -1); g.lineTo(3, 1); }
      else if (v === 2) { g.arc(0, 0, 2.6, 0.4, PI2 - 0.4); }
      else { g.moveTo(-3, 3); g.lineTo(0, -3); g.lineTo(3, 3); g.moveTo(-1.5, 0.5); g.lineTo(1.5, 0.5); }
      g.stroke();
      g.restore();
    }
  }

  const FRAME = {
    stone(g, S) {
      ringStones(g, 13, IRX, IRY, IRX + 13, IRY + 13, S.stone, S.stoneS, Math.PI * 0.62, Math.PI * 2.38, true);
      runeMarks(g, 'rgba(40,40,70,0.45)', IRX + 6.5, IRY + 6.5, 10, Math.PI * 0.75, Math.PI * 2.25);
      pillars(g, S.stone, S.stoneS);
    },
    // 森林：兩根纏繞的樹幹拱成門，苔蘚、葉子、蘑菇、垂藤
    wood(g, S) {
      const bark = '#8a5e3c';
      const barkS = '#65422a';
      // 石環（藏在樹幹後面）
      ringStones(g, 11, IRX, IRY, IRX + 10, IRY + 10, S.stone, S.stoneS, Math.PI * 0.7, Math.PI * 2.3, true);
      runeMarks(g, 'rgba(30,60,30,0.5)', IRX + 5, IRY + 5, 9, Math.PI * 0.8, Math.PI * 2.2);
      // 左右樹幹：從地面往上彎、在頂端交纏
      for (const s of [-1, 1]) {
        A.shape(g, (c) => {
          c.moveTo(s * 52, 2);
          c.quadraticCurveTo(s * 38, -8, s * 40, -40);
          c.bezierCurveTo(s * 50, -100, s * 34, -150, -s * 6, -146);
          c.quadraticCurveTo(-s * 12, -140, -s * 4, -134);
          c.bezierCurveTo(s * 22, -138, s * 36, -100, s * 30, -44);
          c.quadraticCurveTo(s * 28, -10, s * 30, 2);
          c.closePath();
        }, bark, barkS, { cel: [s * 3, 2], lw: 2.6 });
        // 樹皮紋
        g.strokeStyle = 'rgba(50,30,15,0.45)';
        g.lineWidth = 1.3;
        g.beginPath();
        for (let k = 0; k < 7; k++) {
          const yy = -10 - k * 17;
          const xx = s * (38 + Math.sin(k * 1.3) * 3 - (k > 4 ? (k - 4) * 8 : 0));
          g.moveTo(xx - 3, yy);
          g.quadraticCurveTo(xx, yy - 5, xx + 3, yy - 9);
        }
        g.stroke();
        // 樹根爪
        A.shape(g, (c) => { c.moveTo(s * 34, 0); c.quadraticCurveTo(s * 58, -4, s * 66, 6); c.quadraticCurveTo(s * 52, 2, s * 44, 4); c.closePath(); }, bark, barkS, { lw: 2 });
      }
      // 苔蘚團
      for (const [x, y, r] of [[-40, -40, 8], [42, -60, 9], [-36, -104, 8], [30, -120, 8], [0, -142, 11], [-14, -140, 7], [16, -138, 7]]) {
        A.ellipse(g, x, y, r, r * 0.7, '#6fae4a', '#4f8a36', { cel: [2, 2], hl: false, lw: 1.8 });
        g.fillStyle = '#9fd66a';
        g.fillRect(x - r * 0.4, y - r * 0.45, r * 0.5, 1.6);
      }
      // 葉子
      for (const [x, y, rot, col] of [[-22, -148, -0.6, '#7cc84a'], [22, -150, 0.7, '#8ad458'], [-48, -86, -1.2, '#7cc84a'], [50, -96, 1.1, '#6ab83e'], [8, -156, 0.1, '#9ade66']]) {
        A.ellipse(g, x, y, 9, 4.5, col, '#4f8a36', { rot, lw: 1.6, hl: false });
        g.strokeStyle = 'rgba(40,90,30,0.6)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x - Math.cos(rot) * 7, y - Math.sin(rot) * 7);
        g.lineTo(x + Math.cos(rot) * 7, y + Math.sin(rot) * 7);
        g.stroke();
      }
      // 小蘑菇
      for (const [x, y, k, col] of [[-46, -8, 1, '#f28c38'], [-38, -6, 0.7, '#e0513a'], [46, -12, 0.9, '#f5c26b']]) {
        A.shape(g, (c) => A.roundRect(c, x - 2 * k, y - 9 * k, 4 * k, 9 * k, 1.5), '#fff0d6', null, { lw: 1.4, hl: false });
        A.shape(g, (c) => c.ellipse(x, y - 9 * k, 7 * k, 5.5 * k, 0, Math.PI, 0), col, null, { lw: 1.4, hl: false });
        g.fillStyle = '#fff6e8';
        g.beginPath();
        g.arc(x - 2 * k, y - 11 * k, 1.2 * k, 0, PI2);
        g.fill();
      }
      // 垂下來的藤與小花
      g.strokeStyle = '#4f8a34';
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(-10, -136); g.quadraticCurveTo(-18, -118, -14, -100);
      g.moveTo(14, -134); g.quadraticCurveTo(22, -120, 18, -108);
      g.stroke();
      for (const [x, y, col] of [[-14, -100, '#ff9fbf'], [18, -108, '#fff3a0'], [-30, -146, '#ffe36b']]) {
        g.fillStyle = col;
        for (let a = 0; a < 5; a++) { g.beginPath(); g.arc(x + Math.cos(a * 1.26) * 2.6, y + Math.sin(a * 1.26) * 2.6, 2, 0, PI2); g.fill(); }
        g.fillStyle = '#ff9a3a';
        g.beginPath(); g.arc(x, y, 1.3, 0, PI2); g.fill();
      }
    },
    // 海岸：貝殼白石環，鑲著珊瑚、海星、珍珠拱心石
    coral(g, S) {
      A.shape(g, (c) => ringPath(c, IRX + 13, IRY + 13, IRX, IRY), '#f2e6d0', '#d8c6a6', { cel: [2, 3], lw: 2.4 });
      // 貝殼的放射紋
      g.strokeStyle = 'rgba(170,130,100,0.45)';
      g.lineWidth = 1.2;
      g.beginPath();
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * PI2;
        g.moveTo(Math.cos(a) * (IRX + 2), CY + Math.sin(a) * (IRY + 2));
        g.lineTo(Math.cos(a) * (IRX + 11), CY + Math.sin(a) * (IRY + 11));
      }
      g.stroke();
      // 內緣的一圈淡藍石
      g.strokeStyle = '#8ad0dc';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(0, CY, IRX + 2, IRY + 2, 0, 0, PI2);
      g.stroke();
      // 兩側的珊瑚枝
      g.lineCap = 'round';
      for (const s of [-1, 1]) {
        for (const [col, w] of [[A.OUT, 7.5], [s < 0 ? '#ff8a8a' : '#ff9f7a', 4]]) {
          g.strokeStyle = col;
          g.lineWidth = w;
          g.beginPath();
          g.moveTo(s * 40, -6);
          g.quadraticCurveTo(s * 56, -30, s * 52, -58);
          g.moveTo(s * 50, -34); g.quadraticCurveTo(s * 64, -40, s * 66, -56);
          g.moveTo(s * 53, -48); g.lineTo(s * 44, -66);
          g.stroke();
        }
        for (const [x, y] of [[52, -58], [66, -56], [44, -66]]) A.ellipse(g, s * x, y, 3.2, 3.2, '#ffc0b8', null, { lw: 1.3, hl: false });
      }
      // 海草從底部纏上來
      g.strokeStyle = '#3f7a4a';
      g.lineWidth = 3.2;
      g.beginPath();
      g.moveTo(-34, 0); g.bezierCurveTo(-46, -20, -30, -34, -42, -52);
      g.moveTo(36, 0); g.bezierCurveTo(46, -16, 34, -28, 44, -40);
      g.stroke();
      // 扇貝、海螺、海星
      scallop(g, -38, -110, 0.9, -0.6, '#ffd2c2', '#e8a896');
      scallop(g, 38, -112, 0.9, 0.6, '#ffe0c8', '#e8b896');
      starfish(g, -44, -76, 0.65, '#ff9a5a');
      conch(g, 44, -24);
      // 拱心：大扇貝托著珍珠
      scallop(g, 0, -140, 1.35, 0, '#fff0e4', '#e8c8b4');
      A.ellipse(g, 0, -148, 6.5, 6.5, '#f8f4ff', '#d8d0ec', { lw: 1.8 });
      // 底座的小貝殼
      for (const [x, y] of [[-24, 0], [26, 2]]) scallop(g, x, y, 0.45, 0, '#ffd8e0', '#e8a8b8');
    },
    // 峽谷：紅石拱門，裂縫透出餘燼光，拱心石鑲火晶
    ember(g, S) {
      ringStones(g, 11, IRX, IRY, IRX + 15, IRY + 15, '#b8664a', '#8e4a34', Math.PI * 0.6, Math.PI * 2.4, true);
      // 石塊上的沉積紋
      g.save();
      g.beginPath();
      ringPath(g, IRX + 16, IRY + 16, IRX, IRY);
      g.clip('evenodd');
      g.strokeStyle = 'rgba(255,210,170,0.35)';
      g.lineWidth = 1.4;
      for (let yy = -150; yy < 0; yy += 9) {
        g.beginPath();
        g.moveTo(-60, yy);
        g.quadraticCurveTo(0, yy + 4, 60, yy - 2);
        g.stroke();
      }
      g.restore();
      // 熔岩裂縫
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const [w, col] of [[5, 'rgba(255,120,40,0.35)'], [2.2, '#ff8a3a'], [0.9, '#ffe08a']]) {
        g.strokeStyle = col;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(-40, -30); g.lineTo(-36, -44); g.lineTo(-42, -56); g.lineTo(-38, -66);
        g.moveTo(34, -110); g.lineTo(40, -98); g.lineTo(36, -88);
        g.moveTo(-18, -134); g.lineTo(-12, -128);
        g.stroke();
      }
      pillars(g, '#a0543c', '#7a3e2c');
      // 拱心石＋火晶
      A.shape(g, (c) => { c.moveTo(-12, -152); c.lineTo(12, -152); c.lineTo(8, -128); c.lineTo(-8, -128); c.closePath(); }, '#c87254', '#9a5038', { cel: [2, 2], lw: 2.2 });
      A.shape(g, (c) => { c.moveTo(0, -150); c.lineTo(5, -140); c.lineTo(0, -131); c.lineTo(-5, -140); c.closePath(); }, '#ffb050', '#e0702a', { cel: [2, 0], lw: 1.6 });
      g.fillStyle = '#fff0b0';
      g.fillRect(-1.5, -146, 2, 6);
      // 頂上的枯草與小骨頭
      g.strokeStyle = '#c8a060';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let k = -3; k <= 3; k++) { g.moveTo(-26 + k * 2, -142); g.lineTo(-28 + k * 4, -154 + Math.abs(k) * 2); }
      for (let k = -2; k <= 2; k++) { g.moveTo(30 + k * 2, -132); g.lineTo(31 + k * 4, -142 + Math.abs(k) * 2); }
      g.stroke();
      // 底部碎石
      for (const [x, y, r] of [[-54, 0, 7], [-44, 2, 5], [52, 0, 8], [62, 3, 4.5]]) A.ellipse(g, x, y - r * 0.5, r, r * 0.7, '#b8664a', '#8e4a34', { lw: 1.8, hl: false });
    },
    // 雪峰：朱紅鳥居＋注連繩紙垂，門洞內圈是一環冰
    torii(g, S) {
      // 冰環
      A.shape(g, (c) => ringPath(c, IRX + 7, IRY + 7, IRX, IRY), 'rgba(200,236,255,0.95)', '#8cc4ea', { cel: [2, 2], lw: 2 });
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.ellipse(0, CY, IRX + 3.5, IRY + 3.5, 0, Math.PI * 1.1, Math.PI * 1.45);
      g.stroke();
      // 冰錐從冰環往外長
      for (const [a, l] of [[-2.3, 12], [-1.9, 16], [-1.25, 14], [-0.8, 11], [-0.3, 9], [3.4, 9]]) {
        const x = Math.cos(a) * (IRX + 6);
        const y = CY + Math.sin(a) * (IRY + 6);
        g.save();
        g.translate(x, y);
        g.rotate(a + Math.PI / 2);
        A.shape(g, (c) => { c.moveTo(-3.5, 0); c.lineTo(0, -l); c.lineTo(3.5, 0); c.closePath(); }, '#d8f2ff', '#9ad0f0', { cel: [1, 0], lw: 1.4 });
        g.restore();
      }
      const red = '#d8452e';
      const redS = '#a83222';
      // 柱子（下方包黑色根卷）
      for (const s of [-1, 1]) {
        A.shape(g, (c) => { c.moveTo(s * 42 - 5, -128); c.lineTo(s * 42 + 5, -128); c.lineTo(s * 45 + 5, 0); c.lineTo(s * 45 - 6, 0); c.closePath(); }, red, redS, { cel: [s * 2, 0], lw: 2.2 });
        A.shape(g, (c) => c.rect(s * 45 - 7, -12, 13, 12), '#2a1e2a', null, { lw: 2 });
        g.fillStyle = 'rgba(255,255,255,0.3)';
        g.fillRect(s * 42 - 3, -122, 2, 104);
      }
      // 貫（下橫木）
      A.shape(g, (c) => c.rect(-56, -112, 112, 8), red, redS, { cel: [0, 2], lw: 2.2 });
      // 額束（中間的牌）
      A.shape(g, (c) => c.rect(-6, -128, 12, 16), red, redS, { lw: 1.8 });
      A.shape(g, (c) => c.rect(-4.5, -126, 9, 12), '#2a1e2a', null, { lw: 1.2 });
      g.fillStyle = '#f2c75a';
      g.fillRect(-1.5, -123, 3, 1.5); g.fillRect(-1.5, -120, 3, 1.5); g.fillRect(-1.5, -117, 3, 1.5);
      // 島木＋笠木（上橫木，兩端上翹）
      A.shape(g, (c) => c.rect(-60, -134, 120, 7), red, redS, { lw: 2.2 });
      A.shape(g, (c) => { c.moveTo(-72, -150); c.quadraticCurveTo(0, -138, 72, -150); c.lineTo(66, -136); c.quadraticCurveTo(0, -126, -66, -136); c.closePath(); }, '#2a1e2a', '#141018', { cel: [0, 2], lw: 2.2 });
      // 積雪
      A.shape(g, (c) => { c.moveTo(-71, -149); c.quadraticCurveTo(0, -137, 71, -149); c.lineTo(69, -151); c.quadraticCurveTo(58, -154, 42, -150); c.quadraticCurveTo(20, -151, 0, -147); c.quadraticCurveTo(-24, -151, -44, -150); c.quadraticCurveTo(-60, -154, -69, -151); c.closePath(); }, '#f6faff', '#cfdcee', { cel: [1, 1], lw: 1.6 });
      A.shape(g, (c) => { c.moveTo(-56, -112); c.quadraticCurveTo(-30, -117, 0, -114); c.quadraticCurveTo(30, -117, 56, -112); c.closePath(); }, '#f6faff', null, { lw: 1.4 });
      // 注連繩＋紙垂
      g.strokeStyle = A.OUT;
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(-40, -102); g.quadraticCurveTo(0, -88, 40, -102);
      g.stroke();
      g.strokeStyle = '#e8d8a8';
      g.lineWidth = 3.6;
      g.stroke();
      g.strokeStyle = '#b8a070';
      g.lineWidth = 1;
      g.beginPath();
      for (let k = -9; k <= 9; k++) { const x = k * 4; const yy = -95 + (x * x) / 400 * -1 - 2; g.moveTo(x - 1.5, yy - 2); g.lineTo(x + 1.5, yy + 2); }
      g.stroke();
      for (const x of [-24, 0, 24]) {
        const yy = -95 - (x * x) / 400 + 2;
        A.shape(g, (c) => { c.moveTo(x - 3, yy); c.lineTo(x + 3, yy); c.lineTo(x + 3, yy + 6); c.lineTo(x - 2, yy + 6); c.lineTo(x - 2, yy + 11); c.lineTo(x + 3, yy + 11); c.lineTo(x + 3, yy + 16); c.lineTo(x - 3, yy + 16); c.closePath(); }, '#ffffff', null, { lw: 1 });
      }
      // 小鈴
      A.ellipse(g, 0, -86, 4.5, 4.5, '#f2c75a', '#c8962a', { lw: 1.4, hl: false });
      // 柱腳積雪
      for (const s of [-1, 1]) A.shape(g, (c) => c.ellipse(s * 45, 0, 12, 4, 0, Math.PI, 0), '#f6faff', null, { lw: 1.6 });
    },
    // 神殿：金色雕花環＋大理石柱＋星形拱心
    gold(g, S) {
      // 大理石柱
      for (const s of [-1, 1]) {
        A.shape(g, (c) => c.rect(s * 50 - 8, -118, 16, 116), '#fbf7ef', '#ddd2c2', { cel: [s * 3, 0], lw: 2.2 });
        g.strokeStyle = 'rgba(150,130,110,0.4)';
        g.lineWidth = 1.2;
        g.beginPath();
        for (const dx of [-4, 0, 4]) { g.moveTo(s * 50 + dx, -112); g.lineTo(s * 50 + dx, -8); }
        g.stroke();
        A.shape(g, (c) => c.rect(s * 50 - 11, -124, 22, 7), '#e8b84a', '#b8862a', { lw: 1.8 });
        A.shape(g, (c) => c.rect(s * 50 - 11, -6, 22, 6), '#e8b84a', '#b8862a', { lw: 1.8 });
        A.ellipse(g, s * 50 - 10, -121, 3.2, 3.2, '#f6d27a', null, { lw: 1.2, hl: false });
        A.ellipse(g, s * 50 + 10, -121, 3.2, 3.2, '#f6d27a', null, { lw: 1.2, hl: false });
      }
      // 金環（外）＋深藍琺瑯（中）＋金環（內）
      A.shape(g, (c) => ringPath(c, IRX + 15, IRY + 15, IRX, IRY), '#e8b84a', '#b8862a', { cel: [2, 3], lw: 2.4 });
      A.shape(g, (c) => ringPath(c, IRX + 10.5, IRY + 10.5, IRX + 4.5, IRY + 4.5), '#3a3470', '#28245a', { lw: 1.4 });
      // 琺瑯上的小星
      g.fillStyle = '#fff4c8';
      for (let k = 0; k < 22; k++) {
        const a = (k / 22) * PI2;
        const x = Math.cos(a) * (IRX + 7.5);
        const y = CY + Math.sin(a) * (IRY + 7.5);
        const r = k % 3 ? 1 : 1.8;
        g.beginPath(); g.moveTo(x, y - r * 1.6); g.lineTo(x + r * 0.5, y); g.lineTo(x, y + r * 1.6); g.lineTo(x - r * 0.5, y); g.closePath(); g.fill();
      }
      // 外緣的金色花飾（小圓珠）
      for (let k = 0; k < 18; k++) {
        const a = Math.PI + (k / 17) * Math.PI;
        A.ellipse(g, Math.cos(a) * (IRX + 17), CY + Math.sin(a) * (IRY + 17), 2.8, 2.8, '#f6d27a', '#c8962a', { lw: 1.2, hl: false });
      }
      // 高光
      g.strokeStyle = 'rgba(255,250,220,0.8)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.ellipse(0, CY, IRX + 13, IRY + 13, 0, Math.PI * 1.1, Math.PI * 1.4);
      g.stroke();
      // 星形拱心
      star8(g, 0, CY - IRY - 14, 14, 6, '#fff0c0', '#e8b84a');
      A.ellipse(g, 0, CY - IRY - 14, 4, 4, '#9ae0ff', '#5aa8e0', { lw: 1.4 });
      // 兩側的翼形金飾
      for (const s of [-1, 1]) {
        A.shape(g, (c) => { c.moveTo(s * 18, CY - IRY - 10); c.quadraticCurveTo(s * 34, CY - IRY - 26, s * 50, CY - IRY - 14); c.quadraticCurveTo(s * 36, CY - IRY - 16, s * 26, CY - IRY - 4); c.closePath(); }, '#f2c75a', '#c8962a', { cel: [0, 2], lw: 1.8 });
      }
    },
  };

  function pillars(g, fill, shade) {
    for (const s of [-1, 1]) {
      A.shape(g, (c) => A.roundRect(c, s * 40 - 9, -40, 18, 40, 2), fill, shade, { cel: [s * 3, 0], lw: 2.2 });
      A.shape(g, (c) => c.rect(s * 40 - 11, -44, 22, 6), fill, shade, { lw: 2 });
      g.strokeStyle = 'rgba(0,0,0,0.2)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(s * 40 - 9, -22); g.lineTo(s * 40 + 9, -22);
      g.stroke();
    }
  }
  function scallop(g, x, y, s, rot, fill, shade) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(s, s);
    A.shape(g, (c) => { c.moveTo(0, 8); c.lineTo(-11, -2); c.quadraticCurveTo(-10, -15, 0, -16); c.quadraticCurveTo(10, -15, 11, -2); c.closePath(); }, fill, shade, { cel: [1.5, 1.5], lw: 2 });
    g.strokeStyle = 'rgba(190,120,100,0.7)';
    g.lineWidth = 1.2;
    g.beginPath();
    for (let k = -2; k <= 2; k++) { g.moveTo(0, 6); g.lineTo(k * 4.5, -13 + Math.abs(k) * 1.5); }
    g.stroke();
    A.shape(g, (c) => A.roundRect(c, -4, 5, 8, 5, 2), fill, null, { lw: 1.5, hl: false });
    g.restore();
  }
  function starfish(g, x, y, s, col) {
    A.shape(g, (c) => {
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k / 10) * PI2 + 0.3;
        const r = (k % 2 ? 5 : 13) * s;
        k ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.closePath();
    }, col, '#e0703a', { cel: [1.5, 1.5], lw: 1.8 });
    g.fillStyle = '#ffd8b0';
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k / 5) * PI2 + 0.3;
      g.beginPath(); g.arc(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, 1.1, 0, PI2); g.fill();
    }
  }
  function conch(g, x, y) {
    A.shape(g, (c) => { c.moveTo(x - 10, y + 6); c.quadraticCurveTo(x - 12, y - 8, x, y - 12); c.lineTo(x + 14, y - 20); c.lineTo(x + 8, y - 4); c.quadraticCurveTo(x + 6, y + 6, x - 10, y + 6); c.closePath(); }, '#fff0dc', '#e8c8a8', { cel: [2, 2], lw: 2 });
    g.strokeStyle = 'rgba(200,140,110,0.7)';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x - 4, y - 10); g.quadraticCurveTo(x, y - 2, x + 4, y - 14); g.moveTo(x + 4, y - 14); g.quadraticCurveTo(x + 8, y - 8, x + 11, y - 17); g.stroke();
    A.ellipse(g, x - 4, y + 1, 4, 3, '#ffb8b0', null, { lw: 1.2, hl: false });
  }
  function star8(g, x, y, R, r, fill, shade) {
    A.shape(g, (c) => {
      for (let k = 0; k < 16; k++) {
        const a = -Math.PI / 2 + (k / 16) * PI2;
        const rr = k % 2 ? r : k % 4 ? R * 0.7 : R;
        k ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
    }, fill, shade, { cel: [1.5, 1.5], lw: 2 });
  }

  // ── 漩渦（深處的底色與三層旋臂都預先畫成圓形貼圖，每格只旋轉、壓扁貼上） ──
  const VR = IRX + 1; // 貼圖半徑（圓形空間）
  const SPR = {};
  function sprite(id, w, h, draw) {
    if (SPR[id]) return SPR[id];
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'));
    return (SPR[id] = c);
  }
  const ARMS = [[1.4, 4, 0.55, 3.2, 0], [-0.9, 3, 0.4, 2.2, 1], [2.3, 5, 0.3, 1.4, 2]];
  function diskSprite(key, S) {
    return sprite('disk' + key, 128, 128, (g) => {
      g.translate(64, 64);
      g.scale(2, 2);
      const gr = g.createRadialGradient(0, 0, 1, 0, 0, VR);
      gr.addColorStop(0, 'rgba(' + S.core + ',1)');
      gr.addColorStop(0.28, 'rgba(' + S.mid + ',0.95)');
      gr.addColorStop(0.75, 'rgba(' + S.deep + ',0.95)');
      gr.addColorStop(1, 'rgba(' + S.deep + ',1)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, VR, 0, PI2);
      g.fill();
    });
  }
  function armSprite(key, S, li) {
    return sprite('arm' + key + '_' + li, 128, 128, (g) => {
      const [spd, arms, alpha, lw, ci] = ARMS[li];
      g.translate(64, 64);
      g.scale(2, 2);
      g.beginPath();
      g.arc(0, 0, VR, 0, PI2);
      g.clip();
      g.strokeStyle = S.swirl[ci];
      g.lineWidth = lw;
      g.lineCap = 'round';
      g.globalAlpha = alpha;
      for (let a = 0; a < arms; a++) {
        const base = (a / arms) * PI2;
        g.beginPath();
        for (let k = 0; k <= 20; k++) {
          const u = k / 20;
          const r = 3 + u * (IRX + 2);
          const ang = base + u * 3.2 * Math.sign(spd);
          k ? g.lineTo(Math.cos(ang) * r, Math.sin(ang) * r) : g.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        g.stroke();
      }
    });
  }
  function drawVortex(ctx, S, t, key) {
    ctx.save();
    ctx.translate(0, CY);
    ctx.scale(1, IRY / IRX);
    ctx.drawImage(diskSprite(key, S), -VR, -VR, VR * 2, VR * 2);
    ctx.globalCompositeOperation = 'lighter';
    for (let li = 0; li < ARMS.length; li++) {
      ctx.save();
      ctx.rotate(t * ARMS[li][0]);
      ctx.drawImage(armSprite(key, S, li), -VR, -VR, VR * 2, VR * 2);
      ctx.restore();
    }
    // 往中心吸入的光點
    for (let k = 0; k < 14; k++) {
      const ph = (t * 0.45 + k / 14) % 1;
      const r = (1 - ph) * (IRX - 2);
      const ang = k * 2.39 + ph * 5;
      ctx.fillStyle = S.mote[k % 3];
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
      const s = 1.3 + (1 - ph) * 0.9;
      ctx.fillRect(Math.cos(ang) * r - s / 2, Math.sin(ang) * r - s / 2, s, s);
    }
    ctx.restore();
    // 中心亮點與外緣光
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.75 + Math.sin(t * 3) * 0.15;
    ctx.drawImage(glow(S.core), -20, CY - 26, 40, 52);
    ctx.globalAlpha = 0.55 + Math.sin(t * 2.2) * 0.2;
    ctx.strokeStyle = 'rgba(' + S.mid + ',0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, CY, IRX - 1, IRY - 1, 0, 0, PI2);
    ctx.stroke();
    ctx.restore();
  }

  // ── 背後的光芒與光柱（光柱、光芒也是預先畫好的貼圖） ──
  function beamSprite(key, S) {
    return sprite('beam' + key, 60, 230, (g) => {
      const beam = g.createLinearGradient(0, 0, 0, 230);
      beam.addColorStop(0, 'rgba(' + S.mid + ',0)');
      beam.addColorStop(1, 'rgba(' + S.mid + ',0.36)');
      g.fillStyle = beam;
      g.fillRect(0, 0, 60, 230);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(23, 0, 14, 230);
    });
  }
  function drawBack(ctx, S, t, key) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 + Math.sin(t * 2) * 0.1;
    ctx.drawImage(glow(S.mid), -64, CY - 72, 128, 144);
    ctx.globalAlpha = 0.8 + Math.sin(t * 3) * 0.2;
    ctx.drawImage(beamSprite(key, S), -30, -230, 60, 230);
    // 旋轉的光芒：兩條路徑（奇偶兩種亮度）
    ctx.translate(0, CY);
    ctx.fillStyle = 'rgba(' + S.core + ',1)';
    for (let odd = 0; odd < 2; odd++) {
      ctx.globalAlpha = 0.08 + odd * 0.06;
      ctx.beginPath();
      for (let k = odd; k < 12; k += 2) {
        const a = (k / 12) * PI2 + t * 0.25;
        const len = 95 + (k % 3) * 18 + Math.sin(t * 2 + k) * 8;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - 0.06) * len, Math.sin(a - 0.06) * len);
        ctx.lineTo(Math.cos(a + 0.06) * len, Math.sin(a + 0.06) * len);
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.restore();
  }

  // ── 地面的符文圈（在石台頂面，會慢慢轉） ──
  function drawRuneCircle(ctx, S, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = 0.55 + Math.sin(t * 2.5) * 0.2;
    ctx.globalAlpha = a;
    ctx.drawImage(glow(S.runeRgb), -58, -18, 116, 30);
    ctx.strokeStyle = S.rune;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -3.5, 42, 7, 0, 0, PI2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -3.5, 30, 5, 0, 0, PI2);
    ctx.stroke();
    // 兩圈之間轉動的符文刻點
    for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * PI2 + t * 0.6;
      const x = Math.cos(ang) * 36;
      const y = -3.5 + Math.sin(ang) * 6;
      ctx.globalAlpha = a * (0.55 + 0.45 * Math.max(0, Math.sin(ang)));
      ctx.fillStyle = S.rune;
      ctx.fillRect(x - 1.8, y - 0.8, 3.6, 1.6);
      if (k % 3 === 0) ctx.fillRect(x - 0.6, y - 2, 1.2, 4);
    }
    ctx.restore();
  }

  // ── 門框上的符文光（呼吸閃爍） ──
  function drawFrameRunes(ctx, S, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = 10;
    const rr = S === STYLE[4] ? 3.5 : 6.5;
    for (let k = 0; k < n; k++) {
      const ang = Math.PI * 0.8 + (Math.PI * 1.4 * (k + 0.5)) / n;
      const x = Math.cos(ang) * (IRX + rr);
      const y = CY + Math.sin(ang) * (IRY + rr);
      const b = 0.5 + 0.5 * Math.sin(t * 3 - k * 0.7);
      ctx.globalAlpha = 0.25 + b * 0.55;
      ctx.drawImage(glow(S.runeRgb), x - 7, y - 7, 14, 14);
    }
    ctx.restore();
  }

  // ── 粒子：往上飄的光點＋繞門轉的小星 ──
  function drawParticles(ctx, S, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const k = (t * 0.45 + i / 14) % 1;
      const x = Math.sin(i * 2.3 + t * 1.6) * (26 + (i % 4) * 8);
      const y = -6 - k * 190;
      ctx.globalAlpha = (1 - k) * 0.95;
      ctx.fillStyle = S.mote[i % 3];
      const s = 1.6 + (i % 3) * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.8);
      ctx.lineTo(x + s * 0.6, y);
      ctx.lineTo(x, y + s * 1.8);
      ctx.lineTo(x - s * 0.6, y);
      ctx.closePath();
      ctx.fill();
    }
    // 繞著門框轉的光球（前半圈畫得比較亮）
    for (let i = 0; i < 3; i++) {
      const ang = t * 1.1 + (i / 3) * PI2;
      const x = Math.cos(ang) * (IRX + 26);
      const y = CY + Math.sin(ang) * 16;
      const front = Math.sin(ang) > 0;
      ctx.globalAlpha = front ? 0.9 : 0.35;
      ctx.drawImage(glow(S.core), x - 9, y - 9, 18, 18);
    }
    ctx.restore();
  }

  A.drawPortal = function (ctx, x, y, t, label) {
    const { key, S } = regionStyle();
    ctx.save();
    ctx.translate(x, y);
    drawBack(ctx, S, t, key);
    blit(ctx, key, 'base', S);
    drawRuneCircle(ctx, S, t);
    drawVortex(ctx, S, t, key);
    blit(ctx, key, 'front', S);
    drawFrameRunes(ctx, S, t);
    drawParticles(ctx, S, t);
    ctx.restore();
    // 上下彈跳的箭頭與目的地
    const ay = y - 190 + Math.sin(t * 4) * 6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    ctx.drawImage(glow(S.mid), x - 20, ay - 20, 40, 40);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2a4a7a';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
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
    if (label) A.nameTag(ctx, x, y + 24, '→ ' + label, '#bfe8ff');
  };
})();
