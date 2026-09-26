// 背景與地形。吉卜力式多層視差：遠山 → 遠樹 → 近樹，加上斜射光與漂浮光點。
// 各層預先畫到離屏 Canvas，遊戲中只做貼圖。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const TW = 1600; // 背景層的循環寬度

  const THEMES = {
    forestMorning: {
      sky: ['#a9dcff', '#e9f6ff', '#fff3d2'],
      layers: [
        { type: 'hills', f: 0.06, color: '#bcdcc0', base: 0.62, amp: 60 },
        { type: 'trees', f: 0.18, colors: ['#9cc58a', '#8dba7c'], trunk: '#8a7560', base: 0.72, n: 9, size: [70, 110], alpha: 0.9 },
        { type: 'trees', f: 0.38, colors: ['#6fa85a', '#5f9a4c', '#78b062'], trunk: '#6b4a35', base: 0.86, n: 7, size: [90, 140] },
      ],
      beams: 0.18,
      motes: 'rgba(255,250,200,0.8)',
      plat: { top: '#7bbf4a', topHi: '#a6db6a', body: '#9a6a42', shade: '#7a5033', edge: '#5a3a26', deco: 'flowers' },
    },
    forestMushroom: {
      sky: ['#b8e0f0', '#e8f5e6', '#fff0d8'],
      layers: [
        { type: 'hills', f: 0.06, color: '#c3dcc4', base: 0.6, amp: 50 },
        { type: 'mushrooms', f: 0.2, colors: ['#f2a36a', '#e88a8a', '#f5c26b'], stem: '#f3e3c8', base: 0.78, n: 7, size: [60, 120], alpha: 0.85 },
        { type: 'trees', f: 0.4, colors: ['#6fa85a', '#5f9a4c'], trunk: '#6b4a35', base: 0.88, n: 6, size: [90, 150] },
      ],
      beams: 0.14,
      motes: 'rgba(255,220,170,0.8)',
      plat: { top: '#7bbf4a', topHi: '#a6db6a', body: '#9a6a42', shade: '#7a5033', edge: '#5a3a26', deco: 'mushrooms' },
    },
    forestDeep: {
      sky: ['#5f8f7a', '#a9c9a0', '#e8e2b0'],
      layers: [
        { type: 'trees', f: 0.08, colors: ['#6c917a', '#5f8570'], trunk: '#4f6a5a', base: 0.7, n: 10, size: [80, 130], alpha: 0.8 },
        { type: 'trees', f: 0.22, colors: ['#4f7d52', '#46724a'], trunk: '#4a3a2c', base: 0.8, n: 8, size: [110, 170] },
        { type: 'trees', f: 0.42, colors: ['#3d6b40', '#346038'], trunk: '#3a2a1e', base: 0.95, n: 6, size: [140, 200] },
      ],
      beams: 0.32,
      motes: 'rgba(230,255,190,0.9)',
      plat: { top: '#5fa843', topHi: '#86c95c', body: '#83573a', shade: '#66422c', edge: '#4a2e1f', deco: 'ferns' },
    },
    rootCave: {
      sky: ['#1d2a2c', '#2c3e38', '#3f4a36'],
      layers: [
        { type: 'caveWall', f: 0.1, color: '#34443a', base: 0.3 },
        { type: 'roots', f: 0.25, color: '#4a3a2a', n: 14 },
        { type: 'glow', f: 0.4, colors: ['#7df0d0', '#b6f07a', '#8fc8ff'], n: 26 },
      ],
      beams: 0.1,
      motes: 'rgba(150,255,210,0.9)',
      dark: 0.18,
      plat: { top: '#6a8a45', topHi: '#88a95a', body: '#6e4a30', shade: '#553823', edge: '#3a2416', deco: 'glowshrooms' },
    },
    queenHall: {
      sky: ['#3a2440', '#6a3e62', '#b0708a'],
      layers: [
        { type: 'hills', f: 0.05, color: '#5a3656', base: 0.55, amp: 40 },
        { type: 'mushrooms', f: 0.2, colors: ['#9a4f86', '#b85a8e', '#7e4a8a'], stem: '#e8d4dc', base: 0.82, n: 6, size: [110, 180], alpha: 0.9 },
        { type: 'lanterns', f: 0.35, n: 10 },
      ],
      beams: 0.12,
      motes: 'rgba(255,190,230,0.9)',
      plat: { top: '#b98ac0', topHi: '#d7aee0', body: '#6e5070', shade: '#56405a', edge: '#3a2640', deco: 'gems' },
    },

    // ── 第二章　潮風海岬：比森林高、明亮的海邊 ──
    // 額外欄位：ground（地面用的平台配色）、props（地面擺設）、hang（平台底下垂著的東西）、
    // fore（前景草）、atmo（大氣效果）、gulls（海鷗數）、tint（整體色調）、rope（預設繩索樣式）
    coastCamp: {
      sky: ['#6ec4f4', '#c6ebff', '#fff4dc'],
      layers: [
        { type: 'clouds', f: 0.02, n: 6, y0: 0.08, y1: 0.3, size: [50, 90], color: '#ffffff', shade: '#dcecf8', alpha: 0.95 },
        { type: 'sea', f: 0.03, base: 0.5, colors: ['#6cc0e8', '#3f97cf'], hi: '#e8f8ff', n: 70 },
        { type: 'boats', f: 0.05, base: 0.52, n: 4, hull: '#6a5a6a', sail: '#fff8ee', flag: '#e8604a' },
        { type: 'lighthouse', f: 0.07, base: 0.53, x: 0.72, w: 320, hh: 80, rock: '#c9b89a', grass: '#9ccf78', tower: '#fbf6ee', stripe: '#e0584a' },
        { type: 'cliffs', f: 0.16, base: 0.76, w: [220, 380], hgt: [70, 130], gap: [120, 320], color: '#d9c29a', shade: '#bea27a', streak: 'rgba(120,90,60,0.18)', top: '#8fc86a', topHi: '#b4e08a' },
        { type: 'trees', f: 0.34, colors: ['#6fae5a', '#5f9e4c'], trunk: '#7a5a40', base: 0.9, n: 3, size: [90, 130] },
      ],
      beams: 0.1,
      motes: 'rgba(255,255,255,0.8)',
      gulls: 5,
      atmo: 'breeze',
      rope: 'rope',
      props: ['barrel', 'crate', 'bollard', 'netPile', 'buoy', 'barrel'],
      hang: 'net',
      fore: { kind: 'beach', colors: ['#8cbf5a', '#b4cf6a'] },
      ground: { style: 'grass', top: '#8cc75a', topHi: '#b6e07e', body: '#cfae80', shade: '#b8966a', edge: '#6a4a30', deco: 'coastal' },
      plat: { style: 'planks', top: '#c99a62', topHi: '#e8c48e', body: '#8a6446', shade: '#6e4e36', edge: '#4a3020', deco: 'ropes', tuft: false },
    },
    tidepool: {
      sky: ['#86d4f8', '#d6f3ff', '#fff6dc'],
      layers: [
        { type: 'clouds', f: 0.02, n: 5, y0: 0.06, y1: 0.26, size: [55, 95], color: '#ffffff', shade: '#dff0fa', alpha: 0.95 },
        { type: 'sea', f: 0.03, base: 0.47, colors: ['#74d0ec', '#40b0d8'], hi: '#f0fcff', n: 80 },
        { type: 'rocks', f: 0.06, base: 0.5, n: 4, w: [40, 90], hgt: [30, 70], color: '#8f9aa0', shade: '#737e86', top: '#a8c878', foam: true },
        { type: 'shore', f: 0.14, base: 0.64, sand: '#f8ecce', wet: '#e4d4b0', pool: '#8fdcec', rim: '#b9a888', foam: 'rgba(255,255,255,0.9)', pools: 6 },
        { type: 'palms', f: 0.3, base: 0.86, n: 4, size: [160, 230], trunk: '#b0875a', ring: '#8a6640', colors: ['#5fae4a', '#4f9a40', '#72bf55'] },
      ],
      beams: 0.12,
      motes: 'rgba(255,255,255,0.85)',
      gulls: 3,
      atmo: 'breeze',
      rope: 'rope',
      props: ['shell', 'starfish', 'tidePuddle', 'palm', 'driftwood', 'shell', 'tidePuddle'],
      hang: 'seaweed',
      fore: { kind: 'beach', colors: ['#9cc060', '#c8d27a'] },
      plat: { style: 'sand', top: '#f2cf86', topHi: '#fff0c0', body: '#cf9a5c', shade: '#b27e46', edge: '#7a5028', deco: 'shells', tuft: '#8fb450' },
    },
    shipwreck: {
      sky: ['#7e98bf', '#e6c2a4', '#ffd79c'],
      layers: [
        { type: 'clouds', f: 0.02, n: 7, y0: 0.05, y1: 0.32, size: [70, 120], color: '#f2d6c4', shade: '#b8a6b4', alpha: 0.95 },
        { type: 'sea', f: 0.03, base: 0.52, colors: ['#8aaebc', '#4f8398'], hi: '#ffe6c0', n: 60, glowX: 0.3, glow: 'rgba(255,220,160,0.55)' },
        { type: 'cliffs', f: 0.07, base: 0.6, w: [260, 420], hgt: [120, 200], gap: [300, 600], color: '#9a8a8c', shade: '#857477', streak: 'rgba(60,40,50,0.15)', top: '#8a9e6a', topHi: '#a2b47e' },
        { type: 'ship', f: 0.14, base: 0.7, x: 0.42, s: 1.25, color: '#7c6660', dark: '#5a4644', sail: '#e8dccb' },
        { type: 'shore', f: 0.22, base: 0.74, sand: '#d9c095', wet: '#bfa57a', pool: '#8fb4bc', rim: '#9a8a70', foam: 'rgba(255,245,230,0.85)', pools: 3 },
        { type: 'rocks', f: 0.36, base: 0.86, n: 3, w: [90, 150], hgt: [60, 110], color: '#6e6468', shade: '#564e52', top: '#7e8e5a', foam: false },
      ],
      beams: 0.16,
      motes: 'rgba(255,236,200,0.8)',
      gulls: 2,
      atmo: 'breeze',
      rope: 'rope',
      tint: ['rgba(255,170,90,0.05)', 'rgba(120,80,140,0.07)'],
      props: ['barrel', 'driftwood', 'anchor', 'crate', 'plankPile', 'shell'],
      hang: 'net',
      fore: { kind: 'beach', colors: ['#8a9e58', '#aab070'] },
      ground: { style: 'sand', top: '#dcc494', topHi: '#efdcb4', body: '#b8986a', shade: '#a08258', edge: '#6e5236', deco: 'shells', tuft: '#8a9e58' },
      plat: { style: 'planks', top: '#9a7656', topHi: '#b8987a', body: '#5e4838', shade: '#4a382c', edge: '#2e2018', deco: 'barnacles', tuft: false },
    },
    reef: {
      sky: ['#5fb8ea', '#b8e4f6', '#f0fbff'],
      layers: [
        { type: 'clouds', f: 0.02, n: 5, y0: 0.06, y1: 0.28, size: [60, 100], color: '#ffffff', shade: '#d6eaf6', alpha: 0.9 },
        { type: 'sea', f: 0.03, base: 0.44, colors: ['#4aaede', '#1f78b8'], hi: '#e8f8ff', n: 90 },
        { type: 'rocks', f: 0.08, base: 0.52, n: 5, w: [60, 120], hgt: [50, 120], color: '#6a7e8a', shade: '#566a76', top: '#f4f4ee', foam: true, splash: true },
        { type: 'surf', f: 0.2, base: 0.68, n: 4, color: '#465660', shade: '#36444e', sea: '#2f86be' },
        { type: 'rocks', f: 0.36, base: 0.86, n: 4, w: [100, 180], hgt: [70, 130], color: '#3e4c56', shade: '#303c44', top: '#4f7a4a', foam: true, splash: true },
      ],
      beams: 0.08,
      motes: 'rgba(255,255,255,0.95)',
      gulls: 3,
      atmo: 'spray',
      rope: 'rope',
      props: ['rockWet', 'coral', 'starfish', 'urchin', 'rockWet', 'coral'],
      hang: 'seaweed',
      fore: { kind: 'weed', colors: ['#3f6e4e', '#5a8a4a'] },
      plat: { style: 'rock', top: '#6d8288', topHi: '#a2bcc2', body: '#44555c', shade: '#34434a', edge: '#1c2428', deco: 'seaweed', tuft: false },
    },
    crabNest: {
      sky: ['#3e3468', '#d0705e', '#ffbe6e'],
      layers: [
        { type: 'clouds', f: 0.02, n: 5, y0: 0.08, y1: 0.3, size: [70, 120], color: '#f0a08a', shade: '#9a6690', alpha: 0.85 },
        { type: 'sun', f: 0.03, x: 0.55, y: 0.5, r: 56, color: '#ffe6a0', glow: 'rgba(255,190,110,0.55)' },
        { type: 'sea', f: 0.03, base: 0.5, colors: ['#b0708a', '#5a4a7a'], hi: '#ffd8a0', n: 60, glowX: 0.55, glow: 'rgba(255,210,140,0.7)' },
        { type: 'ruins', f: 0.1, base: 0.62, n: 3, color: '#5e4466', shade: '#4a3654', stripe: 'rgba(200,110,110,0.35)', rim: '#ff9e70' },
        { type: 'rocks', f: 0.24, base: 0.8, n: 4, w: [90, 170], hgt: [60, 120], color: '#4e3a52', shade: '#3c2c42', top: '#6e5a6a', foam: false },
        { type: 'tide', f: 0.4, base: 0.74, color: 'rgba(120,90,150,0.55)', foam: 'rgba(255,230,200,0.85)' },
      ],
      beams: 0.12,
      motes: 'rgba(255,220,180,0.85)',
      atmo: 'bubbles',
      rope: 'rope',
      tint: ['rgba(255,140,70,0.06)', 'rgba(90,50,120,0.1)'],
      props: ['shellBig', 'rockWet', 'anchor', 'driftwood', 'shell', 'urchin'],
      hang: 'seaweed',
      fore: { kind: 'weed', colors: ['#4a5a4a', '#6a6a4a'] },
      ground: { style: 'sand', top: '#d8a47a', topHi: '#f0c49a', body: '#8e6250', shade: '#744e40', edge: '#4a2e26', deco: 'shells', tuft: '#7a7a4a' },
      plat: { style: 'rock', top: '#b08478', topHi: '#e0b09a', body: '#54404e', shade: '#42323e', edge: '#221820', deco: 'barnacles', tuft: false },
    },

    // ── 第三章　赤岩峽谷：更高更乾的紅岩與溫泉 ──
    hotspringCamp: {
      sky: ['#86c8ee', '#ffe8c6', '#ffd29e'],
      layers: [
        { type: 'clouds', f: 0.02, n: 4, y0: 0.06, y1: 0.24, size: [50, 80], color: '#fff8f0', shade: '#f0d8c8', alpha: 0.9 },
        { type: 'mesas', f: 0.05, base: 0.56, w: [200, 380], hgt: [80, 150], gap: [40, 160], color: '#e8b49a', shade: '#dba38a', top: '#f2c8ae', stripe: 'rgba(255,255,255,0.18)' },
        { type: 'mesas', f: 0.14, base: 0.66, w: [180, 320], hgt: [110, 190], gap: [120, 300], color: '#d08866', shade: '#bc7658', top: '#e3a07a', stripe: 'rgba(120,50,30,0.14)' },
        { type: 'pools', f: 0.3, base: 0.72, ground: '#b89878', groundHi: '#cfb08e', water: '#9fe0dc', rim: '#8a8078', n: 4, lanterns: 5 },
      ],
      beams: 0.14,
      motes: 'rgba(255,240,210,0.8)',
      atmo: 'steam',
      steamAmt: 0.6,
      rope: 'rope',
      props: ['bucket', 'stoneLantern', 'rockRed', 'drygrass', 'steamVent', 'bucket'],
      hang: 'dryroot',
      fore: { kind: 'dry', colors: ['#b8a060', '#d6bc78'] },
      plat: { style: 'slab', top: '#bcae9c', topHi: '#dcd0bc', body: '#8a6a58', shade: '#6e5446', edge: '#4a3428', deco: 'pebbles', tuft: '#a8a060' },
    },
    redRift: {
      sky: ['#3f9ee6', '#9ad2f6', '#f6ead6'],
      layers: [
        { type: 'clouds', f: 0.02, n: 4, y0: 0.05, y1: 0.22, size: [50, 90], color: '#ffffff', shade: '#dceaf6', alpha: 0.9 },
        { type: 'mesas', f: 0.05, base: 0.58, w: [220, 400], hgt: [90, 170], gap: [60, 200], color: '#eab8a4', shade: '#dea692', top: '#f4cab6', stripe: 'rgba(255,255,255,0.2)' },
        { type: 'mesas', f: 0.13, base: 0.7, w: [200, 340], hgt: [150, 250], gap: [140, 320], color: '#d88a68', shade: '#c47656', top: '#eaa680', stripe: 'rgba(130,50,30,0.16)' },
        { type: 'mesas', f: 0.3, base: 0.92, w: [160, 260], hgt: [250, 360], gap: [420, 700], color: '#c06a50', shade: '#a85840', top: '#d88a64', stripe: 'rgba(110,40,25,0.18)' },
      ],
      beams: 0.12,
      motes: 'rgba(255,236,200,0.7)',
      atmo: 'dust',
      rope: 'rope',
      props: ['rockRed', 'cactus', 'drygrass', 'skull', 'rockRed', 'cactus'],
      hang: 'dryroot',
      fore: { kind: 'dry', colors: ['#c89a5a', '#e2b870'] },
      plat: { style: 'rock', top: '#e8b476', topHi: '#f8d49c', body: '#b0543a', shade: '#8e4230', edge: '#4e2014', deco: 'drygrass', tuft: '#c8a060' },
    },
    steamPass: {
      sky: ['#a8bcc4', '#e6e0d2', '#f6dcbc'],
      layers: [
        { type: 'walls', f: 0.05, top: 0.2, color: '#c0a49c', shade: '#b0948c', stripe: 'rgba(255,255,255,0.14)', ceil: 0 },
        { type: 'steam', f: 0.1, n: 10, y0: 0.3, y1: 0.7, alpha: 0.35, vents: 3, vy: 0.66 },
        { type: 'walls', f: 0.2, top: 0.36, color: '#8e6c66', shade: '#7a5a56', stripe: 'rgba(40,20,20,0.14)', ceil: 0.08, gaps: 2 },
        { type: 'steam', f: 0.3, n: 6, y0: 0.45, y1: 0.8, alpha: 0.3, vents: 3, vy: 0.84 },
      ],
      beams: 0.22,
      motes: 'rgba(255,250,240,0.8)',
      atmo: 'steam',
      steamAmt: 1,
      rope: 'rope',
      props: ['steamVent', 'basalt', 'rockRed', 'drygrass', 'steamVent', 'basalt'],
      hang: 'dryroot',
      fore: { kind: 'dry', colors: ['#9a8a5a', '#b8a470'] },
      plat: { style: 'rock', top: '#6e6a78', topHi: '#9a96a4', body: '#46424e', shade: '#36323e', edge: '#1a1820', deco: 'pebbles', tuft: '#8a8a5a', columns: true },
    },
    lavaBed: {
      sky: ['#1c1218', '#3a1c1e', '#6e2a18'],
      layers: [
        { type: 'walls', f: 0.05, top: 0.16, color: '#3a2426', shade: '#301e20', stripe: 'rgba(255,120,60,0.08)', ceil: 0.05, rim: '#8a3a22' },
        { type: 'lavaRiver', f: 0.1, base: 0.66, ground: '#2a1a1c', ground2: '#221416' },
        { type: 'spires', f: 0.22, base: 0.9, n: 6, w: [60, 120], hgt: [160, 300], color: '#2a1c20', shade: '#1e1418', rim: '#ff7a3a' },
      ],
      beams: 0.05,
      motes: 'rgba(255,170,90,0.95)',
      dark: 0.18,
      atmo: 'embers',
      rope: 'chain',
      props: ['obsidian', 'lavaVent', 'basalt', 'rockDark', 'obsidian'],
      hang: 'lavadrip',
      fore: { kind: 'rocks', colors: ['#1e1418', '#2a1e22'], rim: '#ff8a4a' },
      plat: { style: 'rock', top: '#6a5a74', topHi: '#a08cb0', body: '#2c2234', shade: '#211a28', edge: '#0e0a12', deco: 'embers', tuft: false, glow: '#ff8a3a' },
    },
    volcanoNest: {
      sky: ['#3a1618', '#b8402a', '#ffae5c'],
      layers: [
        { type: 'clouds', f: 0.02, n: 5, y0: 0.05, y1: 0.24, size: [80, 130], color: '#7a3a3a', shade: '#4a2226', alpha: 0.75 },
        { type: 'volcano', f: 0.04, x: 0.5, base: 0.72, top: 0.3, w: 560, color: '#5a2c2a', shade: '#44201f', rim: '#ff9a50' },
        { type: 'spires', f: 0.14, base: 0.78, n: 7, w: [70, 130], hgt: [110, 220], color: '#44221f', shade: '#341816', rim: '#ff8a4a' },
        { type: 'lavaRiver', f: 0.26, base: 0.76, ground: '#2e1816', ground2: '#261412', pools: true },
      ],
      beams: 0.08,
      motes: 'rgba(255,160,80,0.95)',
      dark: 0.12,
      atmo: 'ash',
      rope: 'chain',
      tint: ['rgba(255,90,40,0.06)', 'rgba(120,20,10,0.1)'],
      props: ['rockDark', 'obsidian', 'lavaVent', 'skull', 'rockDark'],
      hang: 'lavadrip',
      fore: { kind: 'rocks', colors: ['#24120f', '#341c18'], rim: '#ff7a3a' },
      plat: { style: 'rock', top: '#6e544c', topHi: '#a0806e', body: '#34221e', shade: '#281916', edge: '#120806', deco: 'ashy', tuft: false, glow: '#ff7a2a' },
    },
  };

  // ── 背景層繪製 ──
  function wrapDraw(w, x, draw) {
    draw(x);
    if (x < 200) draw(x + w);
    if (x > w - 200) draw(x - w);
  }

  const LAYER = {
    hills(ctx, L, rnd, h) {
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      const p1 = rnd() * 6;
      const p2 = rnd() * 6;
      for (let x = 0; x <= TW; x += 10) {
        const y = h * L.base - Math.sin((x / TW) * Math.PI * 2 * 2 + p1) * L.amp - Math.sin((x / TW) * Math.PI * 2 * 5 + p2) * L.amp * 0.35;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(TW, h);
      ctx.closePath();
      ctx.fill();
    },
    trees(ctx, L, rnd, h) {
      ctx.globalAlpha = L.alpha || 1;
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.6;
        const s = L.size[0] + rnd() * (L.size[1] - L.size[0]);
        const col = L.colors[Math.floor(rnd() * L.colors.length)];
        const baseY = h * L.base + rnd() * 30;
        const seed = rnd();
        wrapDraw(TW, x, (xx) => {
          // 樹幹
          ctx.fillStyle = L.trunk;
          ctx.beginPath();
          ctx.moveTo(xx - s * 0.1, h);
          ctx.quadraticCurveTo(xx - s * 0.06, baseY - s * 0.4, xx - s * 0.05, baseY - s * 0.9);
          ctx.lineTo(xx + s * 0.05, baseY - s * 0.9);
          ctx.quadraticCurveTo(xx + s * 0.06, baseY - s * 0.4, xx + s * 0.12, h);
          ctx.fill();
          // 樹冠：一簇圓
          const r2 = U.seeded(Math.floor(seed * 1e6));
          for (let k = 0; k < 7; k++) {
            const cx = xx + (r2() - 0.5) * s * 0.9;
            const cy = baseY - s * 0.95 - r2() * s * 0.55;
            const rr = s * (0.28 + r2() * 0.18);
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(cx, cy, rr, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,220,0.12)';
            ctx.beginPath();
            ctx.arc(cx - rr * 0.25, cy - rr * 0.3, rr * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      ctx.globalAlpha = 1;
    },
    mushrooms(ctx, L, rnd, h) {
      ctx.globalAlpha = L.alpha || 1;
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.5;
        const s = L.size[0] + rnd() * (L.size[1] - L.size[0]);
        const col = L.colors[Math.floor(rnd() * L.colors.length)];
        const baseY = h * L.base + rnd() * 30;
        const lean = (rnd() - 0.5) * 0.3;
        wrapDraw(TW, x, (xx) => {
          ctx.fillStyle = L.stem;
          ctx.beginPath();
          ctx.moveTo(xx - s * 0.12, h);
          ctx.quadraticCurveTo(xx - s * 0.1 + lean * s, baseY - s * 0.5, xx - s * 0.08 + lean * s * 1.4, baseY - s);
          ctx.lineTo(xx + s * 0.08 + lean * s * 1.4, baseY - s);
          ctx.quadraticCurveTo(xx + s * 0.1 + lean * s, baseY - s * 0.5, xx + s * 0.14, h);
          ctx.fill();
          const cx = xx + lean * s * 1.4;
          const cy = baseY - s;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(cx - s * 0.55, cy + 4);
          ctx.bezierCurveTo(cx - s * 0.55, cy - s * 0.6, cx + s * 0.55, cy - s * 0.6, cx + s * 0.55, cy + 4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          for (let k = 0; k < 4; k++) {
            ctx.beginPath();
            ctx.ellipse(cx + (k - 1.5) * s * 0.22, cy - s * 0.18 - (k % 2) * s * 0.12, s * 0.06, s * 0.04, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      ctx.globalAlpha = 1;
    },
    caveWall(ctx, L, rnd, h) {
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= TW; x += 20) ctx.lineTo(x, h * 0.12 + Math.sin(x * 0.01 + 1) * 20 + Math.sin(x * 0.037) * 10);
      ctx.lineTo(TW, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 20) ctx.lineTo(x, h * 0.78 + Math.sin(x * 0.008 + 2) * 30 + Math.sin(x * 0.03) * 12);
      ctx.lineTo(TW, h);
      ctx.closePath();
      ctx.fill();
    },
    roots(ctx, L, rnd, h) {
      ctx.strokeStyle = L.color;
      ctx.lineCap = 'round';
      for (let i = 0; i < L.n; i++) {
        const x = rnd() * TW;
        const len = h * (0.25 + rnd() * 0.5);
        const w = 6 + rnd() * 16;
        wrapDraw(TW, x, (xx) => {
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(xx, -10);
          ctx.bezierCurveTo(xx + 40, len * 0.3, xx - 40, len * 0.6, xx + 10, len);
          ctx.stroke();
          ctx.lineWidth = w * 0.4;
          ctx.beginPath();
          ctx.moveTo(xx + 5, len * 0.4);
          ctx.quadraticCurveTo(xx + 40, len * 0.55, xx + 30, len * 0.75);
          ctx.stroke();
        });
      }
    },
    glow(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = rnd() * TW;
        const y = h * (0.2 + rnd() * 0.65);
        const r = 3 + rnd() * 5;
        const col = L.colors[Math.floor(rnd() * L.colors.length)];
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    lanterns(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * 100;
        const y = h * (0.15 + rnd() * 0.3);
        ctx.strokeStyle = 'rgba(40,20,40,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, y - 14);
        ctx.stroke();
        const g = ctx.createRadialGradient(x, y, 2, x, y, 50);
        g.addColorStop(0, 'rgba(255,220,150,0.6)');
        g.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd98a';
        ctx.beginPath();
        ctx.ellipse(x, y, 9, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };

  // ── 第二、三章用的背景層 ──
  // 寬的物件用 wrap2 在循環接縫處多畫一份；回傳值（可省略）是要逐格播放的動畫點
  function wrap2(x, m, draw) {
    draw(x);
    if (x < m) draw(x + TW);
    if (x > TW - m) draw(x - TW);
  }
  function rr(rnd, a) {
    return a[0] + rnd() * (a[1] - a[0]);
  }
  // 固定的偽亂數（依座標），讓長地面上的紋理不隨鏡頭跳動
  function hash(x) {
    const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
  }
  // 塗一個形狀，右側留一道陰影（與 A.shape 的月牙陰影相同精神，但不描邊，給遠景用）
  function fillShaded(ctx, path, fill, shade, dx, dy) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    if (!shade) return;
    ctx.save();
    ctx.clip();
    ctx.fillStyle = shade;
    ctx.fillRect(-4000, -4000, 8000, 8000);
    ctx.translate(dx, dy);
    ctx.fillStyle = fill;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.restore();
  }

  Object.assign(LAYER, {
    clouds(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.6;
        const y = h * rr(rnd, [L.y0, L.y1]);
        const s = rr(rnd, L.size);
        const k = 4 + Math.floor(rnd() * 3);
        const parts = [];
        for (let j = 0; j < k; j++) {
          const u = j / (k - 1);
          parts.push([(u - 0.5) * s * 1.8 + (rnd() - 0.5) * s * 0.2, -Math.sin(u * Math.PI) * s * 0.35 - rnd() * s * 0.15, s * (0.32 + rnd() * 0.2) * (0.7 + Math.sin(u * Math.PI) * 0.5)]);
        }
        wrap2(x, s * 2, (xx) => {
          ctx.save();
          ctx.globalAlpha = L.alpha || 0.9;
          ctx.beginPath();
          ctx.rect(xx - s * 3, y - s * 3, s * 6, s * 3 + s * 0.12);
          ctx.clip();
          ctx.fillStyle = L.shade;
          ctx.beginPath();
          for (const [dx, dy, r] of parts) { ctx.moveTo(xx + dx + r, y + dy); ctx.arc(xx + dx, y + dy, r, 0, Math.PI * 2); }
          ctx.fill();
          ctx.fillStyle = L.color;
          ctx.beginPath();
          for (const [dx, dy, r] of parts) { ctx.moveTo(xx + dx + r, y + dy - r * 0.22); ctx.arc(xx + dx, y + dy - r * 0.22, r * 0.96, 0, Math.PI * 2); }
          ctx.fill();
          ctx.restore();
        });
      }
    },
    sun(ctx, L, rnd, h) {
      const x = TW * L.x;
      const y = h * L.y;
      wrap2(x, 320, (xx) => {
        const g = ctx.createRadialGradient(xx, y, L.r * 0.8, xx, y, L.r * 5);
        g.addColorStop(0, L.glow);
        g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(xx - L.r * 5, y - L.r * 5, L.r * 10, L.r * 10);
        ctx.fillStyle = L.color;
        ctx.beginPath();
        ctx.arc(xx, y, L.r, 0, Math.PI * 2);
        ctx.fill();
      });
    },
    sea(ctx, L, rnd, h) {
      const y0 = h * L.base;
      const g = ctx.createLinearGradient(0, y0, 0, h);
      g.addColorStop(0, L.colors[0]);
      g.addColorStop(1, L.colors[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, y0, TW, h - y0);
      ctx.fillStyle = L.hi;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, y0, TW, 2);
      // 夕陽倒影
      if (L.glowX != null) {
        const gx = TW * L.glowX;
        ctx.fillStyle = L.glow;
        for (let k = 0; k < 16; k++) {
          const yy = y0 + 4 + k * 7;
          const w = (60 - k * 2.5) * (0.6 + rnd() * 0.6);
          ctx.globalAlpha = 1 - k / 18;
          ctx.beginPath();
          ctx.ellipse(gx + (rnd() - 0.5) * 20, yy, Math.max(6, w), 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 波光
      ctx.fillStyle = L.hi;
      for (let i = 0; i < (L.n || 60); i++) {
        const x = rnd() * TW;
        const d = Math.pow(rnd(), 1.4);
        const yy = y0 + 6 + d * (h - y0 - 10);
        const w = 5 + rnd() * 10 + d * 26;
        ctx.globalAlpha = 0.25 + rnd() * 0.35;
        ctx.beginPath();
        ctx.ellipse(x, yy, w, 1.2 + d * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const pts = [];
      for (let i = 0; i < 16; i++) pts.push({ x: rnd() * TW, y: y0 + 5 + rnd() * h * 0.12, p: rnd() * 6 });
      return [{ type: 'glint', pts }];
    },
    boats(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.7;
        const y = h * L.base + rnd() * 16;
        const s = 0.6 + rnd() * 0.6;
        const dir = rnd() < 0.5 ? -1 : 1;
        ctx.fillStyle = L.hull;
        ctx.beginPath();
        ctx.moveTo(x - 16 * s, y - 5 * s);
        ctx.lineTo(x + 16 * s, y - 5 * s);
        ctx.lineTo(x + 11 * s, y + 1);
        ctx.lineTo(x - 11 * s, y + 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - 0.8, y - 34 * s, 1.6, 30 * s);
        ctx.fillStyle = L.sail;
        ctx.beginPath();
        ctx.moveTo(x + dir * 1.5, y - 33 * s);
        ctx.quadraticCurveTo(x + dir * 20 * s, y - 16 * s, x + dir * 15 * s, y - 7 * s);
        ctx.lineTo(x + dir * 1.5, y - 7 * s);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - dir * 1.5, y - 26 * s);
        ctx.lineTo(x - dir * 9 * s, y - 7 * s);
        ctx.lineTo(x - dir * 1.5, y - 7 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = L.flag;
        ctx.fillRect(x, y - 38 * s, 6 * s * dir, 4 * s);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x - 18 * s, y + 1, 36 * s, 1.5);
      }
    },
    lighthouse(ctx, L, rnd, h) {
      const x = TW * L.x;
      const y0 = h * L.base;
      const top = y0 - L.hh;
      const w = L.w;
      const tx = x - w * 0.12;
      wrap2(x, w, (xx) => {
        const lx = xx - w * 0.12;
        // 岬角
        fillShaded(ctx, (c) => {
          c.moveTo(xx - w / 2 - 50, y0 + 6);
          c.quadraticCurveTo(xx - w / 2 - 10, top + 20, xx - w / 2 + 40, top + 4);
          c.quadraticCurveTo(xx, top - 10, xx + w / 2 - 30, top + 6);
          c.quadraticCurveTo(xx + w / 2 + 10, top + 30, xx + w / 2 + 70, y0 + 6);
          c.closePath();
        }, L.rock, U.mix(L.rock, '#6a5a60', 0.25), -14, 0);
        ctx.fillStyle = L.grass;
        ctx.beginPath();
        ctx.moveTo(xx - w / 2 + 6, top + 16);
        ctx.quadraticCurveTo(xx - w / 2 + 20, top + 2, xx - w / 2 + 40, top + 3);
        ctx.quadraticCurveTo(xx, top - 11, xx + w / 2 - 30, top + 5);
        ctx.quadraticCurveTo(xx + w / 2 - 6, top + 10, xx + w / 2 + 6, top + 22);
        ctx.quadraticCurveTo(xx + 20, top + 8, xx - w / 2 + 6, top + 16);
        ctx.fill();
        // 守燈人的小屋
        ctx.fillStyle = '#f4ece0';
        ctx.fillRect(lx + 16, top - 16, 30, 18);
        ctx.fillStyle = '#c8584a';
        ctx.beginPath();
        ctx.moveTo(lx + 12, top - 15);
        ctx.lineTo(lx + 31, top - 28);
        ctx.lineTo(lx + 50, top - 15);
        ctx.fill();
        ctx.fillStyle = '#6a8aa8';
        ctx.fillRect(lx + 34, top - 11, 6, 6);
        // 燈塔
        const th = 96;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(lx - 13, top);
        ctx.lineTo(lx - 8, top - th);
        ctx.lineTo(lx + 8, top - th);
        ctx.lineTo(lx + 13, top);
        ctx.closePath();
        ctx.fillStyle = L.tower;
        ctx.fill();
        ctx.clip();
        ctx.fillStyle = L.stripe;
        ctx.fillRect(lx - 20, top - th * 0.62, 40, th * 0.2);
        ctx.fillRect(lx - 20, top - th * 0.22, 40, th * 0.2);
        ctx.fillStyle = 'rgba(80,60,80,0.18)';
        ctx.fillRect(lx + 3, top - th, 20, th);
        ctx.restore();
        ctx.fillStyle = '#5a4a58';
        ctx.fillRect(lx - 12, top - th - 3, 24, 4);
        ctx.fillStyle = '#fff2a8';
        ctx.fillRect(lx - 6, top - th - 15, 12, 12);
        ctx.fillStyle = '#5a4a58';
        ctx.fillRect(lx - 7, top - th - 16, 14, 2);
        ctx.fillStyle = L.stripe;
        ctx.beginPath();
        ctx.moveTo(lx - 9, top - th - 15);
        ctx.quadraticCurveTo(lx, top - th - 28, lx + 9, top - th - 15);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(xx - w / 2 - 40, y0 + 4, w + 100, 2);
      });
      return [{ type: 'beam', pts: [{ x: tx, y: top - 96 - 9 }] }];
    },
    cliffs(ctx, L, rnd, h) {
      let x = rnd() * 80;
      while (x < TW - 60) {
        const w = rr(rnd, L.w);
        const top = h * L.base - rr(rnd, L.hgt);
        const seed = Math.floor(rnd() * 1e6);
        const cx = x + w / 2;
        wrap2(cx, w, (xx) => drawCliff(ctx, L, xx - w / 2, w, top, h, seed));
        x += w + rr(rnd, L.gap);
      }
    },
    palms(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.6;
        const s = rr(rnd, L.size);
        const lean = (rnd() - 0.5) * 0.7;
        const baseY = h * L.base + rnd() * 20;
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, s, (xx) => drawPalm(ctx, L, xx, baseY, s, lean, seed));
      }
    },
    rocks(ctx, L, rnd, h) {
      const pts = [];
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.6;
        const w = rr(rnd, L.w);
        const hh = rr(rnd, L.hgt);
        const y0 = h * L.base + rnd() * 16;
        const j = [rnd(), rnd(), rnd(), rnd()];
        const path = (c, xx) => {
          c.moveTo(xx - w / 2, y0);
          c.bezierCurveTo(xx - w / 2 - 4, y0 - hh * 0.5, xx - w * (0.3 + j[0] * 0.1), y0 - hh, xx - w * 0.05, y0 - hh - j[1] * 8);
          c.bezierCurveTo(xx + w * 0.2, y0 - hh * (0.95 + j[2] * 0.1), xx + w * 0.4, y0 - hh * 0.8, xx + w / 2 + 4, y0 - hh * (0.3 + j[3] * 0.2));
          c.lineTo(xx + w / 2 + 6, y0);
          c.closePath();
        };
        wrap2(x, w, (xx) => {
          fillShaded(ctx, (c) => path(c, xx), L.color, L.shade, -w * 0.16, 0);
          // 頂部（青苔或鳥糞白）
          ctx.save();
          ctx.beginPath();
          path(ctx, xx);
          ctx.clip();
          ctx.fillStyle = L.top;
          ctx.beginPath();
          ctx.ellipse(xx - w * 0.08, y0 - hh - 4, w * 0.36, 11, 0.08, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          if (L.foam) {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            for (let k = -3; k <= 3; k++) {
              ctx.beginPath();
              ctx.ellipse(xx + k * w * 0.17, y0 + 1 - (3 - Math.abs(k)), w * 0.12, 4, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
        if (L.splash) pts.push({ x, y: y0 - hh * 0.4, w, p: rnd() });
      }
      return L.splash ? [{ type: 'splash', pts }] : null;
    },
    surf(ctx, L, rnd, h) {
      // 近處的礁岩帶：一整排矮礁，浪花在礁間炸開
      const y0 = h * L.base;
      ctx.fillStyle = L.sea;
      ctx.fillRect(0, y0 + 10, TW, h - y0);
      fillShaded(ctx, (c) => {
        c.moveTo(0, h);
        c.lineTo(0, y0 + 20);
        for (let x = 0; x <= TW; x += 40) {
          const k = Math.sin((x / TW) * Math.PI * 2 * 5) * 0.5 + Math.sin((x / TW) * Math.PI * 2 * 11 + 1) * 0.3;
          c.lineTo(x, y0 + 20 - Math.max(0, k) * 40 - hash(x) * 10);
        }
        c.lineTo(TW, h);
        c.closePath();
      }, L.color, L.shade, -10, 6);
      const pts = [];
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.5;
        // 靜態的浪花團
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let k = 0; k < 7; k++) {
          ctx.beginPath();
          ctx.arc(x + (rnd() - 0.5) * 70, y0 + 10 - rnd() * 16, 6 + rnd() * 10, 0, Math.PI * 2);
          ctx.fill();
        }
        pts.push({ x, y: y0, w: 110, p: rnd() });
      }
      return [{ type: 'splash', pts, big: true }];
    },
    shore(ctx, L, rnd, h) {
      const y0 = h * L.base;
      const edge = (x, off) => y0 + off + Math.sin(x * 0.006) * 5 + Math.sin(x * 0.019 + 1) * 3;
      ctx.fillStyle = L.wet;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 16) ctx.lineTo(x, edge(x, 0));
      ctx.lineTo(TW, h);
      ctx.fill();
      ctx.fillStyle = L.sand;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 16) ctx.lineTo(x, edge(x, 12) + Math.sin(x * 0.03) * 2);
      ctx.lineTo(TW, h);
      ctx.fill();
      // 沙上的小點點
      ctx.fillStyle = 'rgba(160,120,70,0.18)';
      for (let i = 0; i < 90; i++) {
        ctx.beginPath();
        ctx.arc(rnd() * TW, y0 + 22 + rnd() * (h - y0), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < (L.pools || 0); i++) {
        const x = (i / L.pools) * TW + rnd() * 120;
        const y = y0 + 28 + rnd() * 36;
        const rx = 30 + rnd() * 40;
        ctx.fillStyle = L.rim;
        ctx.beginPath();
        ctx.ellipse(x, y + 2, rx + 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = L.pool;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x - rx * 0.4, y - 3, rx * 0.5, 1.5);
      }
      return [{ type: 'foam', y: y0, color: L.foam }];
    },
    ship(ctx, L, rnd, h) {
      const x = TW * L.x;
      const y0 = h * L.base;
      const s = L.s || 1;
      wrap2(x, 300 * s, (xx) => {
        ctx.save();
        ctx.translate(xx, y0);
        ctx.scale(s, s);
        ctx.rotate(-0.1);
        // 桅杆與破帆
        ctx.fillStyle = L.dark;
        ctx.save();
        ctx.translate(-30, -70);
        ctx.rotate(0.22);
        ctx.fillRect(-4, -190, 8, 190);
        ctx.fillRect(-60, -150, 110, 6);
        ctx.fillStyle = L.sail;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(-56, -144);
        ctx.lineTo(46, -144);
        ctx.lineTo(40, -110);
        ctx.lineTo(24, -96);
        ctx.lineTo(18, -70);
        ctx.lineTo(0, -84);
        ctx.lineTo(-18, -66);
        ctx.lineTo(-30, -92);
        ctx.lineTo(-50, -80);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // 斷掉的第二根桅杆
        ctx.fillStyle = L.dark;
        ctx.save();
        ctx.translate(70, -60);
        ctx.rotate(0.9);
        ctx.fillRect(-3, -90, 6, 90);
        ctx.restore();
        // 船身
        const hull = (c) => {
          c.moveTo(-200, -40);
          c.quadraticCurveTo(-214, -104, -176, -118);
          c.lineTo(-150, -92);
          c.lineTo(60, -76);
          c.lineTo(76, -64);
          c.lineTo(62, -52);
          c.lineTo(88, -40);
          c.lineTo(66, -26);
          c.lineTo(84, -10);
          c.lineTo(60, 10);
          c.quadraticCurveTo(-80, 26, -200, -40);
          c.closePath();
        };
        fillShaded(ctx, hull, L.color, L.dark, -8, -10);
        ctx.save();
        ctx.beginPath();
        hull(ctx);
        ctx.clip();
        ctx.strokeStyle = L.dark;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 2;
        for (let k = 0; k < 6; k++) {
          ctx.beginPath();
          ctx.moveTo(-220, -76 + k * 16);
          ctx.quadraticCurveTo(-60, -60 + k * 14, 100, -64 + k * 14);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = U.mix(L.color, '#ffffff', 0.18);
        ctx.fillRect(-220, -92, 330, 6);
        ctx.fillStyle = L.dark;
        [-130, -80, -30].forEach((px) => {
          ctx.beginPath();
          ctx.arc(px, -62, 6, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
        // 露出來的肋骨
        ctx.strokeStyle = L.dark;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(84 + k * 22, 4 - k * 2);
          ctx.quadraticCurveTo(100 + k * 22, -40, 88 + k * 20, -70 + k * 8);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(255,245,230,0.85)';
        for (let k = -6; k <= 6; k++) {
          ctx.beginPath();
          ctx.ellipse(xx + k * 36 * s, y0 + 1, 22 * s, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    },
    ruins(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.5;
        const y0 = h * L.base + rnd() * 20;
        const th = 140 + rnd() * 120;
        const bw = 36 + rnd() * 16;
        const tw = bw * 0.7;
        const cut = [rnd(), rnd(), rnd()];
        const tilt = (rnd() - 0.5) * 0.12;
        wrap2(x, 120, (xx) => {
          ctx.save();
          ctx.translate(xx, y0);
          ctx.rotate(tilt);
          const tower = (c) => {
            c.moveTo(-bw / 2, 0);
            c.lineTo(-tw / 2, -th * (0.85 + cut[0] * 0.1));
            c.lineTo(-tw * 0.15, -th * (0.92 + cut[1] * 0.08));
            c.lineTo(tw * 0.05, -th * 0.8);
            c.lineTo(tw * 0.3, -th);
            c.lineTo(tw / 2, -th * (0.7 + cut[2] * 0.1));
            c.lineTo(bw / 2, 0);
            c.closePath();
          };
          fillShaded(ctx, tower, L.color, L.shade, -bw * 0.28, 0);
          ctx.save();
          ctx.beginPath();
          tower(ctx);
          ctx.clip();
          ctx.fillStyle = L.stripe;
          ctx.fillRect(-bw, -th * 0.55, bw * 2, th * 0.14);
          ctx.fillRect(-bw, -th * 0.22, bw * 2, th * 0.12);
          ctx.fillStyle = 'rgba(30,15,35,0.6)';
          ctx.fillRect(-4, -th * 0.72, 8, 14);
          ctx.fillRect(-3, -th * 0.4, 6, 11);
          ctx.strokeStyle = L.rim;
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 3;
          ctx.beginPath();
          tower(ctx);
          ctx.stroke();
          ctx.restore();
          ctx.restore();
          // 碎石
          ctx.fillStyle = L.shade;
          for (let k = 0; k < 5; k++) {
            ctx.beginPath();
            ctx.ellipse(xx - 40 + k * 22 + hash(k + i) * 10, y0 + 2, 8 + hash(k * 3 + i) * 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
    },
    tide(ctx, L, rnd, h) {
      const y0 = h * L.base;
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 16) ctx.lineTo(x, y0 + Math.sin(x * 0.012) * 4 + Math.sin(x * 0.031) * 2);
      ctx.lineTo(TW, h);
      ctx.fill();
      return [{ type: 'foam', y: y0 - 2, color: L.foam }];
    },
    mesas(ctx, L, rnd, h) {
      let x = -rnd() * 60;
      while (x < TW - 40) {
        const w = rr(rnd, L.w);
        const hg = rr(rnd, L.hgt);
        const top = h * L.base - hg;
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x + w / 2, w, (xx) => drawMesa(ctx, L, xx - w / 2, w, top, hg, h, seed));
        x += w + rr(rnd, L.gap);
      }
      // 山腳連成一片
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let xx = 0; xx <= TW; xx += 20) ctx.lineTo(xx, h * L.base + 18 + Math.sin((xx / TW) * Math.PI * 6) * 8);
      ctx.lineTo(TW, h);
      ctx.fill();
    },
    walls(ctx, L, rnd, h) {
      // 峽谷壁：上緣起伏很大，偶爾有深缺口可以看見天空
      const top = h * L.top;
      const gaps = [];
      for (let i = 0; i < (L.gaps || 0); i++) gaps.push({ x: rnd() * TW, w: 120 + rnd() * 120 });
      const p1 = rnd() * 6;
      const yAt = (x) => {
        let y = top + Math.sin((x / TW) * Math.PI * 2 * 3 + p1) * 30 + Math.sin((x / TW) * Math.PI * 2 * 7) * 14 + (hash(Math.floor(x / 60)) - 0.5) * 26;
        for (const g of gaps) {
          const d = Math.abs(x - g.x);
          if (d < g.w) y += Math.cos((d / g.w) * Math.PI * 0.5) * h * 0.25;
        }
        return y;
      };
      const path = (c) => {
        c.moveTo(0, h);
        for (let x = 0; x <= TW; x += 12) c.lineTo(x, yAt(x));
        c.lineTo(TW, h);
        c.closePath();
      };
      fillShaded(ctx, path, L.color, L.shade, 0, -10);
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      ctx.fillStyle = L.stripe;
      for (let y = top - 40; y < h; y += 26 + hash(y) * 20) ctx.fillRect(0, y, TW, 5 + hash(y + 1) * 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 18; i++) {
        const x = rnd() * TW;
        const y = yAt(x) + 10;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rnd() - 0.5) * 20, y + 60 + rnd() * 120);
        ctx.stroke();
      }
      if (L.rim) {
        ctx.strokeStyle = L.rim;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let x = 0; x <= TW; x += 12) x ? ctx.lineTo(x, yAt(x) + 2) : ctx.moveTo(x, yAt(x) + 2);
        ctx.stroke();
      }
      ctx.restore();
      // 從上方垂下的岩壁（窄窄的隘道感）
      if (L.ceil) {
        ctx.fillStyle = L.shade;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let x = 0; x <= TW; x += 20) ctx.lineTo(x, h * L.ceil + Math.sin(x * 0.011 + p1) * 18 + hash(Math.floor(x / 40) + 9) * 16);
        ctx.lineTo(TW, 0);
        ctx.fill();
      }
    },
    steam(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = rnd() * TW;
        const y = h * rr(rnd, [L.y0, L.y1]);
        const r = 60 + rnd() * 90;
        wrap2(x, r, (xx) => {
          const g = ctx.createRadialGradient(xx, y, 0, xx, y, r);
          g.addColorStop(0, 'rgba(255,255,255,' + L.alpha + ')');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(xx, y, r * 1.6, r, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      const pts = [];
      for (let i = 0; i < (L.vents || 0); i++) {
        const x = (i / L.vents) * TW + rnd() * 200;
        const y = h * L.vy;
        ctx.fillStyle = '#6a5550';
        ctx.beginPath();
        ctx.moveTo(x - 30, y + 8);
        ctx.quadraticCurveTo(x - 10, y - 12, x, y - 10);
        ctx.quadraticCurveTo(x + 10, y - 12, x + 30, y + 8);
        ctx.fill();
        pts.push({ x, y: y - 10, p: rnd(), r: 18, rise: 180 });
      }
      return [{ type: 'plume', pts, color: '255,255,255', a: 0.32, n: 6 }];
    },
    lavaRiver(ctx, L, rnd, h) {
      const y0 = h * L.base;
      const p1 = rnd() * 6;
      const top = (x) => y0 + 8 + Math.sin((x / TW) * Math.PI * 2 * 2 + p1) * 7 + Math.sin((x / TW) * Math.PI * 2 * 5) * 3;
      const bot = (x) => y0 + 36 + Math.sin((x / TW) * Math.PI * 2 * 3 + p1 * 2) * 6;
      // 熔岩光往上照
      const gl = ctx.createLinearGradient(0, y0 - 140, 0, y0 + 10);
      gl.addColorStop(0, 'rgba(255,110,40,0)');
      gl.addColorStop(1, 'rgba(255,110,40,0.35)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, y0 - 140, TW, 150);
      ctx.fillStyle = L.ground;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 16) ctx.lineTo(x, y0 - 4 + Math.sin(x * 0.02) * 3 + hash(Math.floor(x / 16)) * 4);
      ctx.lineTo(TW, h);
      ctx.fill();
      const g = ctx.createLinearGradient(0, y0 + 4, 0, y0 + 42);
      g.addColorStop(0, '#ff7a1e');
      g.addColorStop(0.45, '#ffd35a');
      g.addColorStop(1, '#ff5a1a');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let x = 0; x <= TW; x += 12) x ? ctx.lineTo(x, top(x)) : ctx.moveTo(x, top(x));
      for (let x = TW; x >= 0; x -= 12) ctx.lineTo(x, bot(x));
      ctx.closePath();
      ctx.fill();
      // 岸邊被照亮
      ctx.strokeStyle = 'rgba(255,150,70,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= TW; x += 12) x ? ctx.lineTo(x, top(x) - 1) : ctx.moveTo(x, top(x) - 1);
      ctx.stroke();
      // 冷卻的岩殼
      ctx.fillStyle = 'rgba(80,30,20,0.7)';
      for (let i = 0; i < 26; i++) {
        const x = rnd() * TW;
        const y = (top(x) + bot(x)) / 2 + (rnd() - 0.5) * 12;
        ctx.beginPath();
        ctx.ellipse(x, y, 6 + rnd() * 14, 2 + rnd() * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = L.ground2;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 16) ctx.lineTo(x, bot(x) + 2 + hash(Math.floor(x / 16) + 3) * 4);
      ctx.lineTo(TW, h);
      ctx.fill();
      if (L.pools) {
        for (let i = 0; i < 4; i++) {
          const x = rnd() * TW;
          const y = bot(x) + 30 + rnd() * 30;
          const rx = 30 + rnd() * 40;
          ctx.fillStyle = '#ff8a2a';
          ctx.beginPath();
          ctx.ellipse(x, y, rx, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffd35a';
          ctx.beginPath();
          ctx.ellipse(x, y - 1, rx * 0.6, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return [{ type: 'lava', y0, p1, n: 18 }];
    },
    spires(ctx, L, rnd, h) {
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.6;
        const w = rr(rnd, L.w);
        const hg = rr(rnd, L.hgt);
        const y0 = h * L.base + rnd() * 20;
        const tip = (rnd() - 0.5) * w * 0.5;
        const j = [rnd(), rnd(), rnd()];
        const path = (c, xx) => {
          c.moveTo(xx - w / 2, y0 + 40);
          c.lineTo(xx - w * 0.42, y0 - hg * 0.35);
          c.lineTo(xx - w * (0.22 + j[0] * 0.1), y0 - hg * 0.7);
          c.lineTo(xx + tip - 8, y0 - hg);
          c.lineTo(xx + tip + 10, y0 - hg + 10);
          c.lineTo(xx + w * (0.26 + j[1] * 0.1), y0 - hg * 0.6);
          c.lineTo(xx + w * 0.4, y0 - hg * (0.25 + j[2] * 0.1));
          c.lineTo(xx + w / 2, y0 + 40);
          c.closePath();
        };
        wrap2(x, w, (xx) => {
          fillShaded(ctx, (c) => path(c, xx), L.color, L.shade, -w * 0.3, 0);
          // 下方熔岩的反光：只照左邊緣
          ctx.strokeStyle = L.rim;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(xx - w / 2 + 1, y0 + 40);
          ctx.lineTo(xx - w * 0.42 + 1, y0 - hg * 0.35);
          ctx.lineTo(xx - w * (0.22 + j[0] * 0.1) + 1, y0 - hg * 0.7);
          ctx.lineTo(xx + tip - 7, y0 - hg + 1);
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
      }
    },
    volcano(ctx, L, rnd, h) {
      const x = TW * L.x;
      const base = h * L.base;
      const top = h * L.top;
      const w = L.w;
      wrap2(x, w + 40, (xx) => {
        const cone = (c) => {
          c.moveTo(xx - w, base + 60);
          c.quadraticCurveTo(xx - w * 0.3, base - 30, xx - 80, top + 6);
          c.lineTo(xx - 50, top);
          c.lineTo(xx - 20, top + 8);
          c.lineTo(xx + 20, top + 4);
          c.lineTo(xx + 55, top - 2);
          c.lineTo(xx + 84, top + 8);
          c.quadraticCurveTo(xx + w * 0.3, base - 30, xx + w, base + 60);
          c.closePath();
        };
        // 火山口的光暈
        const g = ctx.createRadialGradient(xx, top, 10, xx, top, 220);
        g.addColorStop(0, 'rgba(255,170,80,0.6)');
        g.addColorStop(1, 'rgba(255,120,60,0)');
        ctx.fillStyle = g;
        ctx.fillRect(xx - 220, top - 220, 440, 440);
        fillShaded(ctx, cone, L.color, L.shade, -w * 0.25, 0);
        ctx.save();
        ctx.beginPath();
        cone(ctx);
        ctx.clip();
        // 熔岩流
        ctx.lineCap = 'round';
        [[-30, -1], [10, 1], [44, 1]].forEach(([dx, s], k) => {
          ctx.strokeStyle = 'rgba(255,120,40,0.85)';
          ctx.lineWidth = 7 - k;
          ctx.beginPath();
          ctx.moveTo(xx + dx, top + 4);
          ctx.bezierCurveTo(xx + dx + s * 30, top + 70, xx + dx + s * 10, top + 130, xx + dx + s * (70 + k * 30), base - 10 + k * 10);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,220,110,0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        ctx.restore();
        ctx.strokeStyle = L.rim;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(xx - 80, top + 6);
        ctx.quadraticCurveTo(xx - w * 0.3, base - 30, xx - w, base + 60);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffb04a';
        ctx.beginPath();
        ctx.ellipse(xx + 2, top + 3, 70, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe890';
        ctx.beginPath();
        ctx.ellipse(xx + 2, top + 2, 40, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      return [{ type: 'plume', pts: [{ x, y: top - 4, p: 0, r: 40, rise: 260, drift: 120 }], color: '70,40,44', a: 0.55, n: 7, speed: 0.08 }];
    },
    pools(ctx, L, rnd, h) {
      const y0 = h * L.base;
      ctx.fillStyle = L.ground;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 20) ctx.lineTo(x, y0 + Math.sin(x * 0.008) * 8 + Math.sin(x * 0.023) * 4);
      ctx.lineTo(TW, h);
      ctx.fill();
      ctx.fillStyle = L.groundHi;
      ctx.beginPath();
      ctx.moveTo(0, y0 + 6);
      for (let x = 0; x <= TW; x += 20) ctx.lineTo(x, y0 + Math.sin(x * 0.008) * 8 + Math.sin(x * 0.023) * 4);
      ctx.lineTo(TW, y0 + 6);
      ctx.fill();
      const pts = [];
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + 60 + rnd() * 160;
        const y = y0 + 26 + rnd() * 18;
        const rx = 60 + rnd() * 50;
        ctx.fillStyle = L.rim;
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * (rx + 4), y + Math.sin(a) * 12, 9, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = L.water;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x - rx * 0.5, y - 5, rx * 0.6, 2);
        pts.push({ x, y: y - 4, p: rnd(), r: 16, rise: 140, spread: rx * 0.6 });
      }
      // 燈籠柱
      for (let i = 0; i < (L.lanterns || 0); i++) {
        const x = (i / L.lanterns) * TW + rnd() * 120;
        const y = y0 + 4;
        ctx.fillStyle = '#5a3a2a';
        ctx.fillRect(x - 2, y - 70, 4, 70);
        ctx.fillRect(x - 2, y - 70, 14, 3);
        const g = ctx.createRadialGradient(x + 11, y - 56, 2, x + 11, y - 56, 36);
        g.addColorStop(0, 'rgba(255,200,120,0.6)');
        g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x + 11, y - 56, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff9a5a';
        ctx.beginPath();
        ctx.ellipse(x + 11, y - 56, 6, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe0a0';
        ctx.fillRect(x + 9, y - 60, 4, 8);
      }
      return [{ type: 'plume', pts, color: '255,255,255', a: 0.42 }];
    },
  });

  function drawCliff(ctx, L, x, w, top, h, seed) {
    const r = U.seeded(seed);
    const pts = [];
    pts.push([x, h]);
    pts.push([x + w * 0.02, top + (h - top) * 0.5]);
    pts.push([x + w * 0.06 + r() * 8, top + 14]);
    pts.push([x + w * 0.14, top + 2]);
    for (let k = 1; k < 5; k++) pts.push([x + w * (0.14 + k * 0.16), top + (r() - 0.5) * 8]);
    pts.push([x + w * 0.9, top + 6]);
    pts.push([x + w * 0.96, top + 22 + r() * 10]);
    pts.push([x + w, top + (h - top) * 0.55]);
    pts.push([x + w + 6, h]);
    const path = (c) => {
      pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.closePath();
    };
    fillShaded(ctx, path, L.color, L.shade, -w * 0.2, 0);
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.strokeStyle = L.streak;
    ctx.lineWidth = 4;
    for (let k = 0; k < w / 26; k++) {
      const sx = x + 10 + r() * (w - 20);
      ctx.beginPath();
      ctx.moveTo(sx, top + 20 + r() * 20);
      ctx.lineTo(sx + (r() - 0.5) * 10, top + 60 + r() * 80);
      ctx.stroke();
    }
    ctx.restore();
    // 草皮蓋在頂上，邊緣垂一點下來
    ctx.fillStyle = L.top;
    ctx.beginPath();
    ctx.moveTo(pts[2][0] - 4, pts[2][1] + 4);
    for (let i = 3; i <= 8; i++) ctx.lineTo(pts[i][0], pts[i][1] - 5);
    ctx.lineTo(pts[9][0] + 4, pts[9][1] + 4);
    for (let i = 8; i >= 3; i--) ctx.lineTo(pts[i][0], pts[i][1] + 8 + (i % 2) * 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = L.topHi;
    ctx.beginPath();
    for (let i = 3; i <= 8; i++) i === 3 ? ctx.moveTo(pts[i][0], pts[i][1] - 5) : ctx.lineTo(pts[i][0], pts[i][1] - 5);
    for (let i = 8; i >= 3; i--) ctx.lineTo(pts[i][0], pts[i][1] - 1);
    ctx.fill();
  }

  function drawPalm(ctx, L, x, y, s, lean, seed) {
    const r = U.seeded(seed);
    const tx = x + lean * s;
    const ty = y - s;
    ctx.lineCap = 'round';
    ctx.strokeStyle = L.trunk;
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(x, y + 60);
    ctx.quadraticCurveTo(x + lean * s * 0.1, y - s * 0.5, tx, ty);
    ctx.stroke();
    ctx.strokeStyle = L.ring;
    ctx.lineWidth = 2;
    for (let k = 1; k < 9; k++) {
      const u = k / 9;
      const px = (1 - u) * (1 - u) * x + 2 * (1 - u) * u * (x + lean * s * 0.1) + u * u * tx;
      const py = (1 - u) * (1 - u) * (y + 60) + 2 * (1 - u) * u * (y - s * 0.5) + u * u * ty;
      ctx.beginPath();
      ctx.moveTo(px - s * 0.04, py);
      ctx.lineTo(px + s * 0.04, py - 3);
      ctx.stroke();
    }
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI + (k / (n - 1)) * Math.PI + (r() - 0.5) * 0.3;
      const len = s * (0.45 + r() * 0.15);
      const ex = tx + Math.cos(a) * len;
      const ey = ty + Math.sin(a) * len * 0.35 + len * 0.45;
      const mx = tx + Math.cos(a) * len * 0.5;
      const my = ty - len * 0.18 + Math.sin(a) * len * 0.2;
      ctx.fillStyle = L.colors[k % L.colors.length];
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(mx, my - len * 0.18, ex, ey);
      ctx.quadraticCurveTo(mx, my + len * 0.06, tx, ty + 4);
      ctx.fill();
    }
    ctx.fillStyle = '#7a5a32';
    [[-5, 6], [5, 7], [0, 10]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(tx + dx, ty + dy, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawMesa(ctx, L, x, w, top, hg, h, seed) {
    const r = U.seeded(seed);
    const capL = x + w * (0.12 + r() * 0.06);
    const capR = x + w * (0.82 + r() * 0.06);
    const foot = top + hg * (0.55 + r() * 0.15);
    const path = (c) => {
      c.moveTo(x - 20, h);
      c.lineTo(x - 20, top + hg + 10);
      c.quadraticCurveTo(x + w * 0.05, foot + 10, capL - 4, foot);
      c.lineTo(capL + 4, top + 12);
      c.lineTo(capL + 10, top);
      c.lineTo(capR - 10, top + (r() - 0.5) * 6);
      c.lineTo(capR - 2, top + 10);
      c.lineTo(capR + 6, foot);
      c.quadraticCurveTo(x + w * 0.95, foot + 10, x + w + 20, top + hg + 10);
      c.lineTo(x + w + 20, h);
      c.closePath();
    };
    fillShaded(ctx, path, L.color, L.shade, -w * 0.22, 0);
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.fillStyle = L.stripe;
    for (let y = top + 16; y < foot; y += 14 + r() * 12) ctx.fillRect(x - 30, y, w + 60, 4 + r() * 5);
    ctx.fillStyle = L.top;
    ctx.fillRect(x - 30, top - 4, w + 60, 8);
    // 直向的溝
    ctx.strokeStyle = 'rgba(90,30,20,0.12)';
    ctx.lineWidth = 3;
    for (let k = 0; k < w / 40; k++) {
      const sx = capL + 12 + r() * (capR - capL - 24);
      ctx.beginPath();
      ctx.moveTo(sx, top + 10);
      ctx.lineTo(sx + (r() - 0.5) * 8, foot - r() * 20);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── 背景層上的小動畫（燈塔光、浪花、熔岩流、蒸氣） ──
  const ANIM = {
    glint(ctx, a, t) {
      ctx.fillStyle = '#ffffff';
      for (const p of a.pts) {
        const k = Math.sin(t * 2.2 + p.p * 3);
        if (k < 0.3) continue;
        const s = (k - 0.3) * 4;
        ctx.globalAlpha = (k - 0.3) * 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x - s * 1.6, p.y);
        ctx.lineTo(p.x, p.y - s * 0.6);
        ctx.lineTo(p.x + s * 1.6, p.y);
        ctx.lineTo(p.x, p.y + s * 0.6);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    beam(ctx, a, t) {
      for (const p of a.pts) {
        const c = Math.cos(t * 0.9);
        const len = 30 + Math.abs(c) * 240;
        const dir = c > 0 ? 1 : -1;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(p.x, 0, p.x + dir * len, 0);
        g.addColorStop(0, 'rgba(255,245,180,0.5)');
        g.addColorStop(1, 'rgba(255,245,180,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 3);
        ctx.lineTo(p.x + dir * len, p.y - 18);
        ctx.lineTo(p.x + dir * len, p.y + 18);
        ctx.lineTo(p.x, p.y + 3);
        ctx.fill();
        const r = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22);
        r.addColorStop(0, 'rgba(255,245,190,0.9)');
        r.addColorStop(1, 'rgba(255,245,190,0)');
        ctx.fillStyle = r;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
    splash(ctx, a, t) {
      ctx.fillStyle = '#ffffff';
      for (const p of a.pts) {
        const ph = (t * 0.32 + p.p) % 1;
        if (ph > 0.55) continue;
        const u = ph / 0.55;
        const hgt = (a.big ? 90 : 50) * Math.sin(u * Math.PI * 0.5);
        ctx.globalAlpha = 0.85 * (1 - u);
        for (let k = -2; k <= 2; k++) {
          const r = (a.big ? 12 : 7) * (1 - Math.abs(k) * 0.18) * (0.6 + u * 0.6);
          ctx.beginPath();
          ctx.arc(p.x + k * p.w * 0.12 * (0.5 + u), p.y - hgt * (1 - Math.abs(k) * 0.28), r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
    foam(ctx, a, t) {
      const off = Math.sin(t * 0.7) * 5;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.6 + Math.sin(t * 0.7) * 0.3;
      ctx.beginPath();
      for (let x = 0; x <= TW; x += 10) {
        const y = a.y + off + Math.sin(x * 0.006) * 5 + Math.sin(x * 0.019 + 1) * 3 + Math.sin(x * 0.08 + t * 1.5) * 1.5;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    lava(ctx, a, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < a.n; i++) {
        const x = ((i * 97.3 + t * (14 + (i % 4) * 5)) % TW + TW) % TW;
        const top = a.y0 + 8 + Math.sin((x / TW) * Math.PI * 2 * 2 + a.p1) * 7 + Math.sin((x / TW) * Math.PI * 2 * 5) * 3;
        const bot = a.y0 + 36 + Math.sin((x / TW) * Math.PI * 2 * 3 + a.p1 * 2) * 6;
        const y = top + (bot - top) * (0.3 + (i % 3) * 0.2);
        ctx.fillStyle = 'rgba(255,240,150,' + (0.35 + 0.25 * Math.sin(t * 3 + i)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(x, y, 14 + (i % 5) * 4, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    plume(ctx, a, t) {
      const n = a.n || 4;
      const sp = a.speed || 0.22;
      for (const p of a.pts) {
        for (let k = 0; k < n; k++) {
          const ph = (t * sp + k / n + p.p) % 1;
          const x = p.x + Math.sin(ph * 5 + p.p * 9) * 10 + ph * (p.drift || 20) + (p.spread ? Math.sin(k * 2.3 + p.p * 7) * p.spread : 0);
          const y = p.y - ph * p.rise;
          const r = p.r * (0.6 + ph * 1.6);
          ctx.fillStyle = 'rgba(' + a.color + ',' + (a.a * Math.sin(ph * Math.PI)).toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  };

  const layerCache = {};
  function buildLayers(themeId) {
    if (layerCache[themeId]) return layerCache[themeId];
    const th = THEMES[themeId];
    const out = th.layers.map((L, i) => {
      const c = document.createElement('canvas');
      c.width = TW;
      c.height = G.H;
      const ctx = c.getContext('2d');
      // 第一章的種子保持不變；新主題再混入名稱，避免同長度的主題長得一樣
      let seed = 1000 + i * 77 + themeId.length * 13;
      if (th.atmo) for (let k = 0; k < themeId.length; k++) seed += themeId.charCodeAt(k) * (k + 1);
      const rnd = U.seeded(seed);
      const anim = LAYER[L.type](ctx, L, rnd, G.H) || null;
      return { canvas: c, f: L.f, anim };
    });
    layerCache[themeId] = out;
    return out;
  }

  // ── 地圖準備：預先算好平台上的裝飾 ──
  A.prepareMap = function (map) {
    const th = THEMES[map.theme] || THEMES.forestMorning;
    map._theme = th;
    map._layers = buildLayers(THEMES[map.theme] ? map.theme : 'forestMorning');
    const rnd = U.seeded(map.w * 7 + map.h);
    map._deco = map.platforms.map((p) => {
      const list = [];
      const len = p[1] - p[0];
      const n = Math.floor(len / 55);
      for (let i = 0; i < n; i++) {
        list.push({ x: p[0] + 20 + rnd() * (len - 40), k: rnd(), s: 0.7 + rnd() * 0.6 });
      }
      return list;
    });
    // 地面擺設：依主題挑選（樹樁、倒木、灌木、蘑菇叢、石頭、花叢、水晶、發光菇）
    const propSets = {
      forestMorning: ['stump', 'bush', 'log', 'flowers', 'rock', 'bush'],
      forestMushroom: ['mushCluster', 'bigMush', 'bush', 'stump', 'flowers', 'mushCluster'],
      forestDeep: ['fern', 'log', 'rock', 'stump', 'fern', 'bush'],
      rootCave: ['crystal', 'glowCluster', 'rock', 'root', 'crystal'],
      queenHall: ['crystal', 'bigMush', 'mushCluster'],
    };
    const set = th.props || propSets[map.theme] || propSets.forestMorning;
    const g = map.platforms[0];
    const avoid = [].concat((map.portals || []).map((p) => p.x), (map.npcs || []).map((n) => n.x), (map.signs || []).map((s) => s.x), (map.springs || []).map((s) => s.x), map.camp ? [map.camp.x1 - 60, (map.camp.x1 + map.camp.x2) / 2, map.camp.x2 + 60] : []);
    map._props = [];
    for (let x = g[0] + 140; x < g[1] - 100; x += 180 + rnd() * 160) {
      if (avoid.some((a) => Math.abs(a - x) < 90)) continue;
      if (map.camp && x > map.camp.x1 - 80 && x < map.camp.x2 + 80) continue;
      map._props.push({ kind: set[Math.floor(rnd() * set.length)], x, y: g[2], s: 0.8 + rnd() * 0.5, flip: rnd() < 0.5 ? -1 : 1 });
    }
    // 平台底下垂著的藤蔓／樹根
    map._hang = [];
    map.platforms.forEach((p, i) => {
      if (i === 0) return;
      const n = Math.floor((p[1] - p[0]) / 140);
      for (let k = 0; k < n; k++) map._hang.push({ x: p[0] + 30 + rnd() * (p[1] - p[0] - 60), y: p[2] + 20, len: 20 + rnd() * 40, seed: rnd() * 6 });
    });
    if (th.hang === 'none') map._hang = [];
    // 前景的高草（畫在角色前面）
    map._fore = [];
    for (let x = g[0] + 60; x < g[1]; x += 220 + rnd() * 260) map._fore.push({ x, s: 0.8 + rnd() * 0.6 });
    map._motes = [];
    for (let i = 0; i < 40; i++) {
      map._motes.push({ x: rnd() * G.W, y: rnd() * G.H, s: 1 + rnd() * 2.5, p: rnd() * 6, v: 6 + rnd() * 14 });
    }
  };

  A.drawBackground = function (ctx, map, cam, t) {
    const th = map._theme;
    const g = ctx.createLinearGradient(0, 0, 0, G.H);
    g.addColorStop(0, th.sky[0]);
    g.addColorStop(0.55, th.sky[1]);
    g.addColorStop(1, th.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, G.W, G.H);

    const maxY = Math.max(0, map.h - G.H);
    for (const L of map._layers) {
      const ox = -((cam.x * L.f) % TW);
      const oy = (maxY - cam.y) * L.f * 0.7;
      for (let x = ox; x < G.W; x += TW) ctx.drawImage(L.canvas, x, oy);
      if (L.anim) {
        for (let x = ox - TW; x < G.W; x += TW) {
          ctx.save();
          ctx.translate(x, oy);
          for (const a of L.anim) ANIM[a.type](ctx, a, t);
          ctx.restore();
        }
      }
    }
    if (th.gulls) drawGulls(ctx, th.gulls, cam, t);

    // 斜射光
    if (th.beams) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const bx = ((i * 360 - cam.x * 0.3) % (G.W + 600) + G.W + 600) % (G.W + 600) - 300;
        const a = th.beams * (0.6 + 0.4 * Math.sin(t * 0.5 + i * 1.7));
        const gr = ctx.createLinearGradient(bx, 0, bx + 220, G.H);
        gr.addColorStop(0, 'rgba(255,248,210,' + a.toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(255,248,210,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx + 90, 0);
        ctx.lineTo(bx + 330, G.H);
        ctx.lineTo(bx + 180, G.H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // 前景：漂浮光點與暗角（畫在世界之後）
  // 地面擺設（畫在角色後面）
  A.drawProps = function (ctx, map, cam, t) {
    const x0 = cam.x - 120;
    const x1 = cam.x + G.W + 120;
    const hang = map._theme.hang;
    if (hang && hang !== 'vine') {
      for (const h of map._hang) {
        if (h.x < x0 || h.x > x1) continue;
        HANG[hang](ctx, h, t);
      }
    } else {
      const leafy = map.theme === 'rootCave' ? '#4a6a3a' : '#5f9f3a';
      for (const h of map._hang) {
        if (h.x < x0 || h.x > x1) continue;
        const sw = Math.sin(t * 1.5 + h.seed) * 3;
        ctx.strokeStyle = map.theme === 'rootCave' ? '#5a3e28' : '#4f8a34';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y - 4);
        ctx.quadraticCurveTo(h.x + sw, h.y + h.len * 0.5, h.x + sw * 1.5, h.y + h.len);
        ctx.stroke();
        ctx.fillStyle = leafy;
        ctx.beginPath();
        ctx.ellipse(h.x + sw * 1.5, h.y + h.len, 4, 2.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const p of map._props) {
      if (p.x < x0 || p.x > x1) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.s * p.flip, p.s);
      PROP[p.kind](ctx, t, p);
      ctx.restore();
    }
  };

  // 平台底下垂著的東西（第二、三章）
  const HANG = {
    seaweed(ctx, h, t) {
      const sw = Math.sin(t * 1.3 + h.seed) * 4;
      ctx.lineCap = 'round';
      [[0, 1, '#3f6e3a'], [5, 0.7, '#5a8a3e']].forEach(([dx, k, col]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 5 * k;
        ctx.beginPath();
        ctx.moveTo(h.x + dx, h.y - 8);
        ctx.bezierCurveTo(h.x + dx + sw, h.y + h.len * 0.3 * k, h.x + dx - sw, h.y + h.len * 0.7 * k, h.x + dx + sw * 1.4, h.y + h.len * k + 6);
        ctx.stroke();
      });
    },
    net(ctx, h, t) {
      // 一小段繩子，末端綁著軟木浮球
      const sw = Math.sin(t * 1.2 + h.seed) * 2;
      const len = h.len * 0.7 + 8;
      ctx.strokeStyle = '#8a6a44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 6);
      ctx.quadraticCurveTo(h.x + sw, h.y + len * 0.5, h.x + sw * 1.5, h.y + len);
      ctx.stroke();
      if (h.seed > 3) {
        // 垂下的漁網角
        ctx.strokeStyle = 'rgba(90,120,110,0.8)';
        ctx.lineWidth = 1.2;
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(h.x - 14 + k * 8, h.y - 6);
          ctx.lineTo(h.x + sw * 1.5, h.y + len);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(h.x - 12, h.y + 2);
        ctx.lineTo(h.x + 12, h.y + 2);
        ctx.moveTo(h.x - 8, h.y + len * 0.5);
        ctx.lineTo(h.x + 8, h.y + len * 0.5);
        ctx.stroke();
      }
      A.ellipse(ctx, h.x + sw * 1.5, h.y + len + 4, 5, 6, h.seed > 1.5 ? '#f08a4a' : '#f4e2b8', h.seed > 1.5 ? '#c8663a' : '#d8c090', { lw: 1.8, hl: false });
    },
    dryroot(ctx, h, t) {
      const sw = Math.sin(t * 0.8 + h.seed) * 1.2;
      ctx.strokeStyle = '#6a4a34';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 6);
      ctx.quadraticCurveTo(h.x + 4 + sw, h.y + h.len * 0.4, h.x - 2 + sw, h.y + h.len * 0.8);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(h.x + 2, h.y + h.len * 0.3);
      ctx.quadraticCurveTo(h.x + 10, h.y + h.len * 0.4, h.x + 9 + sw, h.y + h.len * 0.55);
      ctx.moveTo(h.x, h.y + h.len * 0.55);
      ctx.lineTo(h.x - 7 + sw, h.y + h.len * 0.7);
      ctx.stroke();
    },
    lavadrip(ctx, h, t) {
      // 從平台底下滴落的熔岩：長一顆、掉下去、再長一顆
      const ph = (t * 0.4 + h.seed / 6) % 1;
      const y = h.y - 6;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(h.x, y + 4, 0, h.x, y + 4, 14);
      g.addColorStop(0, 'rgba(255,140,50,0.5)');
      g.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(h.x, y + 4, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const grow = Math.min(1, ph / 0.7);
      ctx.fillStyle = '#ff9a3a';
      ctx.beginPath();
      ctx.ellipse(h.x, y + 2 + grow * 3, 2 + grow * 2, 3 + grow * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      if (ph > 0.7) {
        const u = (ph - 0.7) / 0.3;
        ctx.fillStyle = 'rgba(255,200,90,' + (1 - u).toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(h.x, y + 10 + u * u * (h.len + 40), 2.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    chain(ctx, h, t) {
      const sw = Math.sin(t + h.seed) * 1.5;
      ctx.strokeStyle = '#5a5058';
      ctx.lineWidth = 2;
      for (let k = 0; k < h.len / 8; k++) {
        ctx.beginPath();
        ctx.ellipse(h.x + sw * (k / 6), h.y - 4 + k * 8, k % 2 ? 1.5 : 3, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  };

  // 前景高草（畫在角色前面，營造深度）
  A.drawForeground = function (ctx, map, cam, t) {
    const y = map.platforms[0][2];
    const fore = map._theme.fore;
    const kind = fore ? fore.kind : 'grass';
    const col = fore ? fore.colors : map.theme === 'rootCave' ? ['#3f5a30', '#4a6a36'] : map.theme === 'queenHall' ? ['#8a5a8a', '#a070a0'] : ['#4f9a32', '#6ab846'];
    for (const f of map._fore) {
      if (f.x < cam.x - 60 || f.x > cam.x + G.W + 60) continue;
      if (kind === 'rocks') {
        // 火山地帶：前景是幾顆被熔岩照亮的黑石
        const s = f.s;
        [[-14, 13, 11], [6, 17, 15], [22, 10, 9]].forEach(([dx, rx, ry], k) => {
          ctx.fillStyle = col[k % 2];
          ctx.beginPath();
          ctx.ellipse(f.x + dx * s, y + 12, rx * s, ry * s, 0, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = fore.rim;
          ctx.globalAlpha = 0.6;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(f.x + dx * s, y + 12, rx * s - 1, ry * s - 1, 0, Math.PI * 1.05, Math.PI * 1.55);
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
        continue;
      }
      if (kind === 'weed') {
        for (let k = -2; k <= 2; k++) {
          const sw = Math.sin(t * 1.4 + f.x * 0.01 + k) * 4;
          ctx.strokeStyle = col[(k + 2) % 2];
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(f.x + k * 6, y + 12);
          ctx.bezierCurveTo(f.x + k * 7 + sw, y - 6 * f.s, f.x + k * 5 - sw, y - 14 * f.s, f.x + k * 8 + sw * 1.3, y - (20 + (k % 2 ? 0 : 6)) * f.s);
          ctx.stroke();
        }
        continue;
      }
      const tall = kind === 'beach' ? 1.35 : kind === 'dry' ? 0.85 : 1;
      const thin = kind === 'beach' ? 0.55 : 1;
      for (let k = -3; k <= 3; k++) {
        const sw = Math.sin(t * (kind === 'beach' ? 2.6 : 2) + f.x * 0.01 + k) * (kind === 'beach' ? 5 : 3);
        ctx.fillStyle = col[(k + 3) % 2];
        ctx.beginPath();
        ctx.moveTo(f.x + k * 5 - 4 * thin, y + 12);
        ctx.quadraticCurveTo(f.x + k * 6 + sw, y - 20 * f.s * tall - Math.abs(k) * -3, f.x + k * 7 + sw * 1.5, y - 26 * f.s * tall + Math.abs(k) * 4);
        ctx.quadraticCurveTo(f.x + k * 6 + 2 * thin, y - 8, f.x + k * 5 + 4 * thin, y + 12);
        ctx.fill();
      }
      if (kind === 'beach' && f.s > 1.1) {
        // 海濱的小粉花
        A.ellipse(ctx, f.x + 10, y - 22 * f.s, 3.5, 3.5, '#ff9ec0', null, { lw: 1.2, hl: false });
      }
    }
  };

  // 海鷗：遠處慢慢飛過的「ㄑ」字形
  function drawGulls(ctx, n, cam, t) {
    ctx.strokeStyle = 'rgba(70,80,100,0.75)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const span = G.W + 300;
      const x = ((i * 430 + t * (22 + i * 5) - cam.x * 0.12) % span + span) % span - 150;
      const y = G.H * (0.1 + (i % 3) * 0.07) + Math.sin(t * 0.6 + i * 2) * 12;
      const s = 0.8 + (i % 2) * 0.4;
      const fl = Math.sin(t * 5 + i * 1.7);
      ctx.beginPath();
      ctx.moveTo(x - 10 * s, y + fl * 3 * s);
      ctx.quadraticCurveTo(x - 5 * s, y - (4 + fl * 2) * s, x, y);
      ctx.quadraticCurveTo(x + 5 * s, y - (4 + fl * 2) * s, x + 10 * s, y + fl * 3 * s);
      ctx.stroke();
    }
  }

  const PROP = {
    stump(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -16, -24, 32, 26, 5), '#8b5e3c', '#6b4428', { cel: [3, 2], lw: 2.5 });
      A.ellipse(ctx, 0, -24, 16, 5, '#e3be86', '#c9a068', { hl: false, lw: 2.2 });
      A.ellipse(ctx, 0, -24, 8, 2.5, '#c9a068', null, { noStroke: true, hl: false });
    },
    log(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -44, -18, 80, 18, 9), '#8b5e3c', '#6b4428', { cel: [2, 2], lw: 2.5 });
      A.ellipse(ctx, 36, -9, 6, 9, '#e3be86', '#c9a068', { hl: false, lw: 2.2 });
      A.ellipse(ctx, -20, -18, 8, 4, '#79b04a', null, { lw: 1.8, hl: false });
    },
    bush(ctx) {
      [[-14, -12, 14], [4, -18, 17], [18, -10, 12]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r * 0.85, '#6aae4a', '#4f8a36', { cel: [3, 3], hl: false, lw: 2.3 }));
      A.ellipse(ctx, -6, -20, 2.5, 2.5, '#ff6a6a', null, { noStroke: true, hl: false });
      A.ellipse(ctx, 12, -14, 2.5, 2.5, '#ff6a6a', null, { noStroke: true, hl: false });
    },
    flowers(ctx, t) {
      for (let i = 0; i < 5; i++) {
        const x = -20 + i * 10;
        const h = 10 + (i % 3) * 5;
        ctx.strokeStyle = '#4f8a34';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + Math.sin(t * 2 + i) * 2, -h);
        ctx.stroke();
        A.ellipse(ctx, x + Math.sin(t * 2 + i) * 2, -h, 3.5, 3.5, ['#ff9fbf', '#ffe36b', '#b8a0ff'][i % 3], null, { lw: 1.4, hl: false });
      }
    },
    rock(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-20, 0); c.lineTo(-16, -14); c.lineTo(-2, -20); c.lineTo(14, -14); c.lineTo(20, 0); c.closePath(); }, '#a8a498', '#7e7a70', { cel: [3, 3], lw: 2.3 });
      A.ellipse(ctx, -6, -16, 6, 3, '#79b04a', null, { lw: 1.6, hl: false });
    },
    mushCluster(ctx) {
      [[-10, 1, '#f28c38'], [4, 1.3, '#e0513a'], [14, 0.8, '#f5c26b']].forEach(([x, k, col]) => {
        A.shape(ctx, (c) => A.roundRect(c, x - 2.5 * k, -12 * k, 5 * k, 12 * k, 2), '#fff0d6', null, { lw: 1.8, hl: false });
        A.shape(ctx, (c) => c.ellipse(x, -12 * k, 9 * k, 7 * k, 0, Math.PI, 0), col, null, { lw: 1.8, hl: false });
      });
    },
    bigMush(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -8, -46, 16, 46, 6), '#fff0d6', '#e8cfa6', { cel: [3, 2], lw: 2.3 });
      A.shape(ctx, (c) => { c.moveTo(-34, -42); c.bezierCurveTo(-34, -76, 34, -76, 34, -42); c.quadraticCurveTo(0, -36, -34, -42); c.closePath(); }, '#c2408f', '#982f70', { cel: [4, 4], lw: 2.5 });
      [[-14, -56, 5], [10, -62, 6]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r * 0.8, '#fff6fb', null, { lw: 1.6, hl: false }));
    },
    fern(ctx, t) {
      ctx.strokeStyle = '#3f7f2a';
      ctx.lineWidth = 3;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(k * 10, -30, k * 18 + Math.sin(t * 1.5 + k) * 2, -22 + Math.abs(k) * 6);
        ctx.stroke();
      }
    },
    crystal(ctx, t) {
      const glow = 0.5 + Math.sin(t * 2) * 0.2;
      const g = ctx.createRadialGradient(0, -14, 0, 0, -14, 34);
      g.addColorStop(0, 'rgba(160,255,230,' + glow.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(160,255,230,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -14, 34, 0, Math.PI * 2);
      ctx.fill();
      [[-8, 20, -0.3], [4, 30, 0.1], [12, 16, 0.4]].forEach(([x, h, r]) => {
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-5, 0); c.lineTo(-5, -h * 0.7); c.lineTo(0, -h); c.lineTo(5, -h * 0.7); c.lineTo(5, 0); c.closePath(); }, '#9ff0e0', '#5ec8b8', { cel: [2, 0], lw: 2 });
        ctx.restore();
      });
    },
    glowCluster(ctx, t) {
      [[-10, 1], [2, 1.4], [12, 0.9]].forEach(([x, k]) => {
        const g = ctx.createRadialGradient(x, -10 * k, 0, x, -10 * k, 18 * k);
        g.addColorStop(0, 'rgba(140,255,210,0.5)');
        g.addColorStop(1, 'rgba(140,255,210,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, -10 * k, 18 * k, 0, Math.PI * 2);
        ctx.fill();
        A.shape(ctx, (c) => A.roundRect(c, x - 2 * k, -10 * k, 4 * k, 10 * k, 2), '#d8fff0', null, { lw: 1.6, hl: false });
        A.shape(ctx, (c) => c.ellipse(x, -10 * k, 7 * k, 5 * k, 0, Math.PI, 0), '#7df0d0', null, { lw: 1.6, hl: false });
      });
    },
    root(ctx) {
      ctx.strokeStyle = '#4e3420';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-40, 4);
      ctx.bezierCurveTo(-20, -30, 10, -20, 30, 4);
      ctx.stroke();
      ctx.strokeStyle = '#6a4a30';
      ctx.lineWidth = 3;
      ctx.stroke();
    },
  };

  // ── 第二章：海邊的擺設 ──
  const PI2 = Math.PI * 2;
  function barrelShape(ctx, x, w, h, fill, shade) {
    A.shape(ctx, (c) => { c.moveTo(x - w * 0.42, 0); c.quadraticCurveTo(x - w * 0.56, -h / 2, x - w * 0.42, -h); c.lineTo(x + w * 0.42, -h); c.quadraticCurveTo(x + w * 0.56, -h / 2, x + w * 0.42, 0); c.closePath(); }, fill, shade, { cel: [3, 2], lw: 2.4 });
  }
  Object.assign(PROP, {
    shell(ctx) {
      // 扇貝
      A.shape(ctx, (c) => { c.moveTo(0, -2); c.lineTo(-13, -12); c.quadraticCurveTo(-12, -26, 0, -27); c.quadraticCurveTo(12, -26, 13, -12); c.closePath(); }, '#ffd2c2', '#f0a896', { cel: [2, 2], lw: 2.2 });
      ctx.strokeStyle = '#e0907e';
      ctx.lineWidth = 1.4;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(k * 5, -24 + Math.abs(k) * 2);
        ctx.stroke();
      }
      A.shape(ctx, (c) => A.roundRect(c, -5, -5, 10, 5, 2), '#f0b8a4', null, { lw: 1.8, hl: false });
      // 旁邊的小螺
      A.shape(ctx, (c) => { c.moveTo(16, 0); c.quadraticCurveTo(16, -12, 22, -14); c.quadraticCurveTo(30, -10, 28, 0); c.closePath(); }, '#fff0dc', '#e8d0b0', { cel: [1, 1], lw: 1.8 });
    },
    starfish(ctx) {
      A.shape(ctx, (c) => {
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k / 10) * PI2;
          const r = k % 2 ? 6 : 15;
          const x = Math.cos(a) * r;
          const y = -8 + Math.sin(a) * r * 0.55;
          k ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
      }, '#ff9a5a', '#e0703a', { cel: [2, 1], lw: 2.2 });
      ctx.fillStyle = '#ffd0a0';
      [[0, -12], [-6, -8], [6, -8], [-3, -5], [3, -5]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, PI2); ctx.fill(); });
    },
    driftwood(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-46, -4); c.quadraticCurveTo(-40, -16, -10, -14); c.lineTo(20, -18); c.quadraticCurveTo(40, -16, 44, -8); c.quadraticCurveTo(40, 0, 20, 0); c.lineTo(-40, 0); c.closePath(); }, '#d6c6ae', '#b4a288', { cel: [2, 2], lw: 2.4 });
      A.shape(ctx, (c) => { c.moveTo(-6, -14); c.lineTo(-16, -32); c.lineTo(-11, -33); c.lineTo(2, -16); c.closePath(); }, '#d6c6ae', '#b4a288', { lw: 2.2 });
      ctx.strokeStyle = '#a89478';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-30, -8); ctx.lineTo(0, -9); ctx.moveTo(10, -10); ctx.lineTo(34, -9);
      ctx.stroke();
    },
    buoy(ctx, t) {
      const r = Math.sin(t * 1.5) * 0.04;
      ctx.rotate(r);
      A.shape(ctx, (c) => A.roundRect(c, -2, -48, 4, 22, 2), '#6a5a4a', null, { lw: 1.8, hl: false });
      A.shape(ctx, (c) => { c.moveTo(2, -48); c.lineTo(14, -44); c.lineTo(2, -40); c.closePath(); }, '#ffd35a', null, { lw: 1.6, hl: false });
      A.ellipse(ctx, 0, -16, 15, 16, '#e8504a', '#b8363a', { cel: [3, 2] });
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, -16, 15, 16, 0, 0, PI2);
      ctx.clip();
      ctx.fillStyle = '#fff6ee';
      ctx.fillRect(-20, -20, 40, 7);
      ctx.restore();
      ctx.strokeStyle = A.OUT;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, -16, 15, 16, 0, 0, PI2);
      ctx.stroke();
    },
    anchor(ctx) {
      ctx.rotate(0.25);
      const iron = '#6e7280';
      const ironS = '#4e525e';
      A.shape(ctx, (c) => A.roundRect(c, -4, -54, 8, 50, 3), iron, ironS, { cel: [2, 0], lw: 2.3 });
      A.shape(ctx, (c) => A.roundRect(c, -16, -46, 32, 6, 3), iron, ironS, { lw: 2.2 });
      A.shape(ctx, (c) => { c.arc(0, -60, 7, 0, PI2); c.moveTo(4, -60); c.arc(0, -60, 3.5, 0, PI2, true); }, iron, null, { lw: 2.2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-26, -18); c.quadraticCurveTo(-22, 2, 0, 0); c.quadraticCurveTo(22, 2, 26, -18); c.lineTo(20, -14); c.quadraticCurveTo(16, -6, 0, -6); c.quadraticCurveTo(-16, -6, -20, -14); c.closePath(); }, iron, ironS, { lw: 2.3 });
      // 纏著的繩子與海草
      ctx.strokeStyle = '#c8a06a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-5, -36); ctx.lineTo(5, -30); ctx.moveTo(-5, -28); ctx.lineTo(5, -22);
      ctx.stroke();
      ctx.strokeStyle = '#4f8a3a';
      ctx.beginPath();
      ctx.moveTo(-20, -14); ctx.quadraticCurveTo(-24, -4, -18, 2);
      ctx.stroke();
    },
    barrel(ctx) {
      barrelShape(ctx, 0, 30, 34, '#b8804a', '#94623a');
      ctx.strokeStyle = '#5a5a64';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, -8); ctx.lineTo(14, -8); ctx.moveTo(-14, -26); ctx.lineTo(14, -26);
      ctx.stroke();
      A.ellipse(ctx, 0, -34, 13, 3.5, '#d8a46a', null, { lw: 2, hl: false });
    },
    crate(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -18, -34, 36, 34, 3), '#c89a62', '#a67a48', { cel: [3, 2], lw: 2.4 });
      ctx.strokeStyle = '#8a6440';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-15, -31); ctx.lineTo(15, -3);
      ctx.moveTo(-18, -17); ctx.lineTo(18, -17);
      ctx.stroke();
      // 魚的標記
      ctx.fillStyle = '#4a7aa8';
      ctx.beginPath();
      ctx.ellipse(-2, -24, 6, 3, 0, 0, PI2);
      ctx.moveTo(3, -24); ctx.lineTo(8, -28); ctx.lineTo(8, -20);
      ctx.fill();
    },
    bollard(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -9, -38, 18, 38, 5), '#8a6446', '#6e4e36', { cel: [3, 0], lw: 2.4 });
      A.ellipse(ctx, 0, -38, 9, 3, '#a47a56', null, { lw: 2, hl: false });
      ctx.strokeStyle = '#d8b07a';
      ctx.lineWidth = 3.5;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(0, -24 + k * 5, 11, 3, 0, 0, Math.PI);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(10, -18);
      ctx.quadraticCurveTo(22, -6, 30, -1);
      ctx.stroke();
      A.ellipse(ctx, 30, -3, 8, 3, '#d8b07a', null, { lw: 1.8, hl: false });
    },
    netPile(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-34, 0); c.quadraticCurveTo(-30, -20, -8, -24); c.quadraticCurveTo(14, -30, 30, -14); c.quadraticCurveTo(38, -4, 34, 0); c.closePath(); }, '#6f9c92', '#557e76', { cel: [3, 2], lw: 2.3 });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-34, 0); ctx.quadraticCurveTo(-30, -20, -8, -24); ctx.quadraticCurveTo(14, -30, 30, -14); ctx.quadraticCurveTo(38, -4, 34, 0); ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = 'rgba(40,70,64,0.45)';
      ctx.lineWidth = 1.2;
      for (let k = -40; k < 40; k += 7) {
        ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + 20, -30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k - 20, -30); ctx.stroke();
      }
      ctx.restore();
      [[-20, -12], [2, -20], [22, -12]].forEach(([x, y]) => A.ellipse(ctx, x, y, 5, 4, '#f08a4a', '#c8663a', { lw: 1.8, hl: false }));
    },
    tidePuddle(ctx, t) {
      ctx.fillStyle = 'rgba(120,100,70,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 1, 40, 7, 0, 0, PI2);
      ctx.fill();
      A.ellipse(ctx, 0, 0, 36, 5, '#8fdcec', null, { lw: 2, hl: false });
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(t * 2) * 0.3).toFixed(3) + ')';
      ctx.fillRect(-18, -2, 14, 1.5);
      ctx.fillRect(6, 0, 8, 1.2);
      [[-38, -2, 7], [34, -3, 8], [-26, -4, 5]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r * 0.7, '#a8a498', '#8a867c', { lw: 2, hl: false }));
      A.ellipse(ctx, 14, -2, 4, 2, '#ff9a5a', null, { lw: 1.2, hl: false });
    },
    palm(ctx, t) {
      ctx.scale(1.7, 1.7);
      const sw = Math.sin(t * 1.2) * 0.04;
      ctx.strokeStyle = A.OUT;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -30, 10, -58);
      ctx.stroke();
      ctx.strokeStyle = '#b0875a';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.save();
      ctx.translate(10, -58);
      ctx.rotate(sw);
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI + (k / 5) * Math.PI;
        const len = 30 + (k % 2) * 6;
        const ex = Math.cos(a) * len;
        const ey = Math.sin(a) * len * 0.3 + len * 0.45;
        A.shape(ctx, (c) => { c.moveTo(0, 0); c.quadraticCurveTo(ex * 0.5, -12 + ey * 0.1, ex, ey); c.quadraticCurveTo(ex * 0.5, ey * 0.3, 0, 4); c.closePath(); }, k % 2 ? '#5fae4a' : '#72bf55', null, { lw: 1.8, hl: false });
      }
      A.ellipse(ctx, -3, 5, 4, 4, '#8a6432', null, { lw: 1.5, hl: false });
      A.ellipse(ctx, 4, 6, 4, 4, '#8a6432', null, { lw: 1.5, hl: false });
      ctx.restore();
    },
    rockWet(ctx, t) {
      A.shape(ctx, (c) => { c.moveTo(-26, 0); c.lineTo(-22, -16); c.quadraticCurveTo(-8, -30, 8, -24); c.lineTo(22, -14); c.lineTo(26, 0); c.closePath(); }, '#5e6e76', '#46545c', { cel: [4, 3], lw: 2.4 });
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + Math.sin(t * 1.3) * 0.15).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(-8, -22, 7, 2, -0.4, 0, PI2);
      ctx.fill();
      ctx.strokeStyle = '#3f6e3a';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(12, -20); ctx.quadraticCurveTo(18, -10, 16, 0);
      ctx.moveTo(18, -16); ctx.quadraticCurveTo(24, -8, 22, 0);
      ctx.stroke();
      [[-18, -4], [-12, -2], [-4, -3]].forEach(([x, y]) => A.shape(ctx, (c) => { c.moveTo(x - 3, y + 2); c.lineTo(x, y - 3); c.lineTo(x + 3, y + 2); c.closePath(); }, '#e8e4dc', null, { lw: 1.2, hl: false }));
    },
    coral(ctx, t) {
      const sw = Math.sin(t * 1.1) * 1.5;
      ctx.lineCap = 'round';
      [[A.OUT, 9], ['#ff8a8a', 5]].forEach(([col, w]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0 + sw, -28);
        ctx.moveTo(0, -12); ctx.quadraticCurveTo(-12, -14, -14 + sw, -26);
        ctx.moveTo(0, -18); ctx.quadraticCurveTo(10, -20, 12 + sw, -34);
        ctx.moveTo(-8, -14); ctx.lineTo(-20 + sw, -16);
        ctx.stroke();
      });
      [[sw, -28], [-14 + sw, -26], [12 + sw, -34], [-20 + sw, -16]].forEach(([x, y]) => A.ellipse(ctx, x, y, 3.5, 3.5, '#ffb0a8', null, { lw: 1.4, hl: false }));
      A.ellipse(ctx, 18, -6, 9, 7, '#ffc86a', '#e8a44a', { lw: 2, hl: false });
    },
    urchin(ctx) {
      ctx.strokeStyle = A.OUT;
      ctx.lineWidth = 2;
      for (let k = 0; k < 12; k++) {
        const a = Math.PI + (k / 11) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 8, -8 + Math.sin(a) * 8);
        ctx.lineTo(Math.cos(a) * 17, -8 + Math.sin(a) * 17);
        ctx.stroke();
      }
      A.ellipse(ctx, 0, -8, 11, 9, '#7a4a8a', '#5a3470', { cel: [2, 1], lw: 2 });
    },
    shellBig(ctx) {
      // 寄居蟹丟下來的大海螺殼
      A.shape(ctx, (c) => { c.moveTo(-40, 0); c.quadraticCurveTo(-44, -30, -14, -44); c.lineTo(34, -62); c.lineTo(22, -30); c.quadraticCurveTo(20, -4, -10, 0); c.closePath(); }, '#f4d6b6', '#dcae8a', { cel: [4, 3], lw: 2.6 });
      ctx.strokeStyle = '#c88a6a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-26, -38); ctx.quadraticCurveTo(-10, -26, 0, -50);
      ctx.moveTo(-6, -46); ctx.quadraticCurveTo(8, -34, 14, -56);
      ctx.moveTo(10, -52); ctx.quadraticCurveTo(20, -44, 26, -60);
      ctx.stroke();
      A.ellipse(ctx, -22, -12, 13, 10, '#ffb8b0', '#e89088', { lw: 2.2, hl: false });
      A.ellipse(ctx, -22, -12, 7, 5, '#8a5a5a', null, { lw: 1.6, hl: false });
    },
    plankPile(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-40, -2); c.lineTo(36, -10); c.lineTo(38, -3); c.lineTo(-38, 4); c.closePath(); }, '#8a6a4e', '#6e523a', { lw: 2.2 });
      A.shape(ctx, (c) => { c.moveTo(-30, -14); c.lineTo(26, -26); c.lineTo(28, -19); c.lineTo(-28, -7); c.closePath(); }, '#a07c5a', '#8a6a4e', { lw: 2.2 });
      ctx.fillStyle = '#5a5a64';
      ctx.fillRect(18, -24, 3, 3);
      ctx.fillRect(-20, -12, 3, 3);
    },

    // ── 第三章：峽谷與溫泉 ──
    rockRed(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-26, 0); c.lineTo(-22, -22); c.lineTo(-6, -26); c.lineTo(-4, -40); c.lineTo(12, -42); c.lineTo(16, -24); c.lineTo(26, -18); c.lineTo(28, 0); c.closePath(); }, '#d0764e', '#a8563a', { cel: [4, 2], lw: 2.4 });
      ctx.fillStyle = 'rgba(255,220,180,0.35)';
      ctx.fillRect(-20, -18, 44, 3);
      ctx.fillRect(-4, -34, 16, 3);
    },
    cactus(ctx, t) {
      const g = '#7aae5a';
      const gs = '#5a8e44';
      A.shape(ctx, (c) => A.roundRect(c, -8, -52, 16, 52, 8), g, gs, { cel: [3, 0], lw: 2.4 });
      A.shape(ctx, (c) => { c.moveTo(-8, -24); c.lineTo(-18, -24); c.quadraticCurveTo(-24, -24, -24, -30); c.lineTo(-24, -40); c.quadraticCurveTo(-20, -44, -16, -40); c.lineTo(-16, -32); c.lineTo(-8, -32); c.closePath(); }, g, gs, { lw: 2.2 });
      A.shape(ctx, (c) => { c.moveTo(8, -30); c.lineTo(16, -30); c.lineTo(16, -44); c.quadraticCurveTo(20, -48, 24, -44); c.lineTo(24, -28); c.quadraticCurveTo(24, -22, 18, -22); c.lineTo(8, -22); c.closePath(); }, g, gs, { lw: 2.2 });
      ctx.strokeStyle = 'rgba(40,70,30,0.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(0, -4); ctx.stroke();
      const b = 1 + Math.sin(t * 2) * 0.08;
      for (let k = 0; k < 5; k++) A.ellipse(ctx, Math.cos(k * 1.256) * 3.5 * b, -54 + Math.sin(k * 1.256) * 3.5 * b, 2.8, 2.8, '#ff8ab0', null, { lw: 1.2, hl: false });
      A.ellipse(ctx, 0, -54, 1.8, 1.8, '#ffe36b', null, { noStroke: true, hl: false });
    },
    drygrass(ctx, t) {
      A.ellipse(ctx, 0, -12, 20, 13, '#c8a060', '#a8824a', { cel: [3, 2], hl: false, lw: 2.2 });
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 1.3;
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI + (k / 6) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(Math.cos(a) * 17, -12 + Math.sin(a) * 11);
        ctx.stroke();
      }
      ctx.strokeStyle = '#d8b878';
      ctx.lineWidth = 1.6;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(k * 6, -20);
        ctx.lineTo(k * 9 + Math.sin(t * 2 + k) * 2, -32 + Math.abs(k) * 3);
        ctx.stroke();
      }
    },
    skull(ctx) {
      // 很久以前的動物頭骨（圓圓的，不嚇人）
      A.shape(ctx, (c) => { c.moveTo(-12, -4); c.quadraticCurveTo(-16, -24, 0, -26); c.quadraticCurveTo(16, -24, 12, -4); c.quadraticCurveTo(0, 2, -12, -4); c.closePath(); }, '#f2e8d4', '#d8c8aa', { cel: [2, 2], lw: 2.3 });
      A.shape(ctx, (c) => { c.moveTo(-12, -20); c.quadraticCurveTo(-26, -24, -28, -36); c.quadraticCurveTo(-20, -28, -10, -26); c.closePath(); }, '#f2e8d4', null, { lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(12, -20); c.quadraticCurveTo(26, -24, 28, -36); c.quadraticCurveTo(20, -28, 10, -26); c.closePath(); }, '#f2e8d4', null, { lw: 2, hl: false });
      ctx.fillStyle = '#6a4a3a';
      ctx.beginPath(); ctx.ellipse(-5, -15, 3, 3.5, 0, 0, PI2); ctx.ellipse(5, -15, 3, 3.5, 0, 0, PI2); ctx.fill();
      ctx.fillRect(-2, -8, 1.5, 3); ctx.fillRect(0.5, -8, 1.5, 3);
    },
    bucket(ctx) {
      // 溫泉木桶，桶邊搭著一條小毛巾
      A.shape(ctx, (c) => { c.moveTo(-15, -26); c.lineTo(15, -26); c.lineTo(12, 0); c.lineTo(-12, 0); c.closePath(); }, '#d8a870', '#b88a54', { cel: [3, 0], lw: 2.4 });
      ctx.strokeStyle = '#6a6a74';
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(14, -20); ctx.moveTo(-13, -6); ctx.lineTo(13, -6); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,80,40,0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-5, -25); ctx.lineTo(-4, -1); ctx.moveTo(5, -25); ctx.lineTo(4, -1); ctx.stroke();
      A.ellipse(ctx, 0, -26, 15, 3.5, '#9fe0dc', null, { lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(8, -28); c.lineTo(18, -28); c.lineTo(20, -12); c.lineTo(12, -14); c.closePath(); }, '#fff6f0', '#e8dcd6', { lw: 1.8, hl: false });
      ctx.fillStyle = '#e8828a';
      ctx.fillRect(10, -26, 8, 2);
    },
    stoneLantern(ctx, t) {
      const st = '#a8a49a';
      const ss = '#86827a';
      A.shape(ctx, (c) => A.roundRect(c, -12, -8, 24, 8, 2), st, ss, { lw: 2.2 });
      A.shape(ctx, (c) => A.roundRect(c, -5, -30, 10, 22, 2), st, ss, { cel: [2, 0], lw: 2.2 });
      A.shape(ctx, (c) => A.roundRect(c, -12, -46, 24, 16, 3), st, ss, { cel: [2, 0], lw: 2.2 });
      const g = ctx.createRadialGradient(0, -38, 0, 0, -38, 26);
      g.addColorStop(0, 'rgba(255,210,120,' + (0.5 + Math.sin(t * 3) * 0.1).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -38, 26, 0, PI2); ctx.fill();
      A.shape(ctx, (c) => A.roundRect(c, -6, -43, 12, 9, 2), '#ffd88a', null, { lw: 1.6, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-20, -46); c.quadraticCurveTo(0, -60, 20, -46); c.closePath(); }, st, ss, { lw: 2.2 });
      A.ellipse(ctx, 0, -58, 4, 4, st, null, { lw: 1.8, hl: false });
    },
    steamVent(ctx, t) {
      A.shape(ctx, (c) => { c.moveTo(-26, 0); c.quadraticCurveTo(-18, -16, -6, -14); c.lineTo(6, -14); c.quadraticCurveTo(18, -16, 26, 0); c.closePath(); }, '#8a6a5e', '#6e5248', { cel: [3, 2], lw: 2.3 });
      A.ellipse(ctx, 0, -14, 7, 2.5, '#3a2a28', null, { lw: 1.6, hl: false });
      ctx.fillStyle = '#e8e0a0';
      ctx.fillRect(-16, -6, 5, 3);
      for (let k = 0; k < 4; k++) {
        const ph = (t * 0.5 + k / 4) % 1;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * Math.sin(ph * Math.PI)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(Math.sin(ph * 6 + k) * 6, -18 - ph * 70, 6 + ph * 14, 0, PI2);
        ctx.fill();
      }
    },
    basalt(ctx) {
      [[-18, 30, 12], [-6, 44, 12], [6, 36, 12], [18, 24, 11]].forEach(([x, h, w]) => {
        A.shape(ctx, (c) => { c.moveTo(x - w / 2, 0); c.lineTo(x - w / 2, -h); c.lineTo(x + w / 2, -h - 2); c.lineTo(x + w / 2, 0); c.closePath(); }, '#5a5664', '#46424e', { cel: [3, 0], lw: 2.2 });
        A.shape(ctx, (c) => { c.moveTo(x - w / 2, -h); c.lineTo(x, -h - 4); c.lineTo(x + w / 2, -h - 2); c.lineTo(x, -h + 2); c.closePath(); }, '#8a8698', null, { lw: 1.6, hl: false });
      });
    },
    obsidian(ctx, t) {
      const glow = 0.35 + Math.sin(t * 1.8) * 0.12;
      const g = ctx.createRadialGradient(0, -6, 0, 0, -6, 34);
      g.addColorStop(0, 'rgba(255,120,50,' + glow.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,120,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -6, 34, 0, PI2); ctx.fill();
      [[-10, 22, -0.3], [3, 36, 0.05], [14, 18, 0.45]].forEach(([x, h, r]) => {
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-6, 0); c.lineTo(-5, -h * 0.7); c.lineTo(0, -h); c.lineTo(6, -h * 0.65); c.lineTo(6, 0); c.closePath(); }, '#3a2e48', '#221a2e', { cel: [3, 0], lw: 2.2 });
        ctx.strokeStyle = 'rgba(200,170,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-3, -h * 0.2); ctx.lineTo(-2, -h * 0.75); ctx.stroke();
        ctx.restore();
      });
    },
    lavaVent(ctx, t) {
      const g = ctx.createRadialGradient(0, -10, 0, 0, -10, 40);
      g.addColorStop(0, 'rgba(255,130,50,' + (0.45 + Math.sin(t * 3) * 0.15).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,130,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -10, 40, 0, PI2); ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(-28, 0); c.quadraticCurveTo(-20, -22, -8, -20); c.lineTo(8, -20); c.quadraticCurveTo(20, -22, 28, 0); c.closePath(); }, '#3a2a2a', '#281c1c', { cel: [3, 2], lw: 2.3 });
      A.ellipse(ctx, 0, -20, 9, 3, '#ffb040', null, { lw: 1.8, hl: false });
      ctx.strokeStyle = '#ff8a2a';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(-8, -10); ctx.lineTo(-4, -4); ctx.moveTo(5, -18); ctx.lineTo(10, -8); ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.7 + k / 3) % 1;
        ctx.fillStyle = 'rgba(255,' + Math.round(200 - ph * 120) + ',80,' + (1 - ph).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(Math.sin(ph * 8 + k * 2) * 8, -22 - ph * 50, 2.5 - ph, 0, PI2);
        ctx.fill();
      }
    },
    rockDark(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-26, 0); c.lineTo(-20, -18); c.lineTo(-4, -28); c.lineTo(14, -22); c.lineTo(26, 0); c.closePath(); }, '#4a3634', '#34262a', { cel: [4, 2], lw: 2.4 });
      ctx.strokeStyle = 'rgba(255,140,70,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(-18, -17); ctx.lineTo(-4, -26); ctx.stroke();
      ctx.strokeStyle = '#ff8a2a';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(2, -20); ctx.lineTo(6, -12); ctx.lineTo(2, -6); ctx.stroke();
    },
  });

  // 大氣效果（螢幕座標）：取代森林的落葉
  function wrapX(v, span) {
    return ((v % span) + span) % span;
  }
  const ATMO = {
    // 海風：斜斜飄過的細小水沫
    breeze(ctx, th, cam, t) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 16; i++) {
        const x = wrapX(i * 211 + t * (50 + (i % 4) * 14) - cam.x * 0.7, G.W + 100) - 50;
        const y = wrapX(i * 137 - t * (8 + (i % 3) * 4) - cam.y * 0.5, G.H) + Math.sin(t + i) * 10;
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 2 + i);
        ctx.beginPath();
        ctx.ellipse(x, y, 2.4, 1.2, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    // 浪花礁岩：大量水沫從下往上噴，外加一層薄霧
    spray(ctx, th, cam, t) {
      const g = ctx.createLinearGradient(0, G.H * 0.55, 0, G.H);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(235,248,255,0.22)');
      ctx.fillStyle = g;
      ctx.fillRect(0, G.H * 0.55, G.W, G.H * 0.45);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 36; i++) {
        const ph = (t * (0.18 + (i % 5) * 0.03) + i * 0.137) % 1;
        const bx = wrapX(i * 173 - cam.x * 0.85, G.W + 200) - 100;
        const x = bx + ph * (60 + (i % 3) * 40);
        const y = G.H - ph * G.H * (0.5 + (i % 4) * 0.12) + ph * ph * 120;
        ctx.globalAlpha = 0.75 * (1 - ph);
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    // 泡泡：慢慢往上冒的小圓圈
    bubbles(ctx, th, cam, t) {
      ctx.strokeStyle = 'rgba(255,240,230,0.75)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) {
        const x = wrapX(i * 191 - cam.x * 0.8, G.W + 60) - 30 + Math.sin(t * 1.5 + i) * 8;
        const y = wrapX(i * 83 - t * (18 + (i % 4) * 8), G.H + 40) - 20;
        const r = 2.5 + (i % 4) * 1.5;
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t + i);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    // 溫泉與隘道的水蒸氣：大片柔和的白霧飄過
    steam(ctx, th, cam, t) {
      const amt = th.steamAmt || 1;
      for (let i = 0; i < 6; i++) {
        const span = G.W + 600;
        const x = wrapX(i * 317 + t * (10 + i * 3) - cam.x * 0.5, span) - 300;
        const y = G.H * (0.4 + (i % 3) * 0.17) + Math.sin(t * 0.3 + i) * 20;
        const r = 140 + (i % 3) * 50;
        const a = (0.1 + 0.05 * Math.sin(t * 0.5 + i * 2)) * amt;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    // 紅岩峽谷：乾風捲起的細沙
    dust(ctx, th, cam, t) {
      ctx.fillStyle = '#f4d0a0';
      for (let i = 0; i < 18; i++) {
        const x = wrapX(i * 229 + t * (60 + (i % 5) * 16) - cam.x * 0.75, G.W + 100) - 50;
        const y = wrapX(i * 131 - cam.y * 0.5, G.H) + Math.sin(t * 2 + i) * 14;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, 2 + (i % 3), 1.5);
      }
      ctx.globalAlpha = 1;
    },
    // 熔岩河床：往上飄的火星
    embers(ctx, th, cam, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 30; i++) {
        const x = wrapX(i * 157 - cam.x * 0.8, G.W + 60) - 30 + Math.sin(t * 1.3 + i * 1.7) * 18;
        const y = wrapX(i * 97 - t * (26 + (i % 5) * 10) - cam.y * 0.6, G.H + 40) - 20;
        const fl = 0.5 + 0.5 * Math.sin(t * 6 + i * 2.3);
        const r = 1.5 + (i % 3) * 0.8;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        g.addColorStop(0, 'rgba(255,190,90,' + (0.9 * fl).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,90,30,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    // 火山巢：灰燼慢慢落下，夾著幾點火星
    ash(ctx, th, cam, t) {
      for (let i = 0; i < 34; i++) {
        const x = wrapX(i * 149 + t * 12 - cam.x * 0.8, G.W + 60) - 30 + Math.sin(t * 0.9 + i) * 16;
        const y = wrapX(i * 89 + t * (14 + (i % 4) * 6) - cam.y * 0.6, G.H + 40) - 20;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t + i);
        ctx.fillStyle = i % 5 === 0 ? 'rgba(255,170,90,0.9)' : 'rgba(90,80,80,0.6)';
        ctx.fillRect(-2, -1.2, 4, 2.4);
        ctx.restore();
      }
      ATMO.embers(ctx, th, cam, t * 0.8);
    },
  };

  A.drawAtmosphere = function (ctx, map, cam, t) {
    const th = map._theme;
    if (th.atmo && ATMO[th.atmo]) ATMO[th.atmo](ctx, th, cam, t);
    // 森林裡緩緩飄落的葉子
    else if (map.theme !== 'rootCave' && map.theme !== 'queenHall') {
      for (let i = 0; i < 8; i++) {
        const sp = 18 + (i % 3) * 8;
        const x = ((i * 173 + t * 12 - cam.x * 0.8) % (G.W + 100) + G.W + 100) % (G.W + 100) - 50 + Math.sin(t + i) * 30;
        const y = ((i * 97 + t * sp) % (G.H + 60)) - 30;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 1.5 + i);
        ctx.fillStyle = ['#e8a040', '#9fcf5a', '#f0c060'][i % 3];
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = th.motes;
    for (const m of map._motes) {
      const x = ((m.x - cam.x * 0.6 + Math.sin(t * 0.7 + m.p) * 20) % G.W + G.W) % G.W;
      const y = ((m.y - cam.y * 0.6 - t * m.v) % G.H + G.H) % G.H;
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + m.p);
      ctx.beginPath();
      ctx.arc(x, y, m.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (th.tint) {
      const g = ctx.createLinearGradient(0, 0, 0, G.H);
      g.addColorStop(0, th.tint[0]);
      g.addColorStop(1, th.tint[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, G.W, G.H);
    }
    if (th.dark) {
      const g = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.35, G.W / 2, G.H / 2, G.H * 0.9);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,' + (th.dark * 2).toFixed(2) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, G.W, G.H);
    }
  };

  // ── 地形 ──
  A.drawPlatforms = function (ctx, map, cam) {
    const th = map._theme;
    const x0 = cam.x - 50;
    const x1 = cam.x + G.W + 50;
    map.platforms.forEach((p, i) => {
      if (p[1] < x0 || p[0] > x1) return;
      if (p[2] < cam.y - 40 || p[2] > cam.y + G.H + 60) return;
      const isGround = i === 0;
      const P = isGround && th.ground ? th.ground : th.plat;
      const style = P.style || 'grass';
      const left = p[0];
      const right = p[1];
      const y = p[2];
      const bodyH = isGround ? map.h - y + 200 : 26;

      if (style !== 'grass') {
        drawStyledPlatform(ctx, P, style, left, right, y, bodyH, isGround, i, x0, x1);
      } else {
        // 本體
        ctx.fillStyle = P.body;
        ctx.beginPath();
        if (isGround) ctx.rect(left, y, right - left, bodyH);
        else A.roundRect(ctx, left, y, right - left, bodyH, 12);
        ctx.fill();
        ctx.fillStyle = P.shade;
        if (isGround) ctx.fillRect(left, y + 30, right - left, bodyH);
        else {
          ctx.beginPath();
          A.roundRect(ctx, left + 3, y + 14, right - left - 6, bodyH - 14, 10);
          ctx.fill();
        }
        if (isGround) groundPebbles(ctx, left, right, y, bodyH, i, x0, x1);
        else {
          ctx.strokeStyle = P.edge;
          ctx.lineWidth = 3;
          ctx.beginPath();
          A.roundRect(ctx, left, y, right - left, bodyH, 12);
          ctx.stroke();
        }
        // 草皮
        ctx.fillStyle = P.top;
        ctx.beginPath();
        A.roundRect(ctx, left - (isGround ? 0 : 4), y - 6, right - left + (isGround ? 0 : 8), 14, 7);
        ctx.fill();
        ctx.fillStyle = P.topHi;
        ctx.fillRect(left + (isGround ? 0 : 6), y - 5, right - left - (isGround ? 0 : 12), 4);
        // 草皮下緣的鋸齒
        ctx.fillStyle = P.top;
        for (let x = left + 6; x < right - 6; x += 14) {
          if (x < x0 || x > x1) continue;
          ctx.beginPath();
          ctx.moveTo(x, y + 7);
          ctx.lineTo(x + 7, y + 13);
          ctx.lineTo(x + 14, y + 7);
          ctx.fill();
        }
      }
      // 裝飾
      const deco = map._deco[i];
      for (const d of deco) {
        if (d.x < x0 || d.x > x1) continue;
        drawDeco(ctx, P.deco, d, y, P);
      }
    });
  };

  function groundPebbles(ctx, left, right, y, bodyH, i, x0, x1, col) {
    // 地層裡的小石頭
    ctx.fillStyle = col || 'rgba(0,0,0,0.12)';
    const r = U.seeded(i * 31 + 7);
    for (let k = 0; k < (right - left) / 80; k++) {
      const sx = left + r() * (right - left);
      const sy = y + 40 + r() * (bodyH - 50);
      const rx = 8 + r() * 10;
      const ry = 5 + r() * 5;
      if (sx < x0 || sx > x1) continue;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 第二、三章的平台：木板（planks）、沙（sand）、岩石（rock）、石板（slab）
  function drawStyledPlatform(ctx, P, style, left, right, y, bodyH, isGround, i, x0, x1) {
    const w = right - left;
    const vx0 = Math.max(left, x0);
    const vx1 = Math.min(right, x1);
    // ── 本體 ──
    let bodyPath;
    if (isGround) bodyPath = (c) => c.rect(left, y, w, bodyH);
    else if (style === 'rock') {
      // 浮空岩塊：底部參差、中間往下凸
      bodyPath = (c) => {
        c.moveTo(left + 4, y);
        c.lineTo(right - 4, y);
        c.quadraticCurveTo(right + 2, y + 10, right - 8, y + 20);
        const n = Math.max(2, Math.floor(w / 36));
        for (let k = n - 1; k >= 1; k--) {
          const u = k / n;
          const mid = Math.sin(u * Math.PI);
          c.lineTo(left + w * u + (hash(i * 13 + k) - 0.5) * 12, y + 22 + mid * 14 + hash(i * 7 + k) * 10);
        }
        c.lineTo(left + 8, y + 20);
        c.quadraticCurveTo(left - 2, y + 10, left + 4, y);
        c.closePath();
      };
    } else if (style === 'planks') bodyPath = (c) => A.roundRect(c, left + 6, y, w - 12, 20, 4);
    else bodyPath = (c) => A.roundRect(c, left, y, w, bodyH, 12);

    if (!isGround && style === 'planks') {
      // 碼頭木樁：從平台下伸出來，末端斷掉
      const posts = w > 240 ? [left + 22, left + w / 2, right - 22] : [left + 22, right - 22];
      posts.forEach((px, k) => {
        const len = 30 + hash(i * 5 + k) * 22;
        A.shape(ctx, (c) => { c.moveTo(px - 6, y); c.lineTo(px + 6, y); c.lineTo(px + 6, y + len - 4); c.lineTo(px + 1, y + len); c.lineTo(px - 3, y + len - 6); c.lineTo(px - 6, y + len); c.closePath(); }, P.body, P.shade, { cel: [3, 0], lw: 2.5 });
      });
    }
    ctx.fillStyle = P.body;
    ctx.beginPath();
    bodyPath(ctx);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    bodyPath(ctx);
    ctx.clip();
    ctx.fillStyle = P.shade;
    if (isGround) ctx.fillRect(vx0 - 2, y + 30, vx1 - vx0 + 4, bodyH);
    else ctx.fillRect(left, y + 14, w, 60);
    // 玄武岩柱的直紋
    if (P.columns) {
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      for (let x = Math.floor(vx0 / 22) * 22; x < vx1; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x + (hash(x) - 0.5) * 4, y + (isGround ? 140 : 40));
        ctx.stroke();
      }
    }
    // 發光的熔岩裂縫
    if (P.glow) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const step = isGround ? 150 : 90;
      for (let x = Math.floor(vx0 / step) * step + 40; x < vx1; x += step) {
        const hx = hash(x + i);
        if (x < left + 10 || x > right - 10) continue;
        const cy = y + 12 + hx * (isGround ? 40 : 4);
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(x, cy);
          ctx.lineTo(x + 8, cy + 6);
          ctx.lineTo(x + 4, cy + 14);
          ctx.lineTo(x + 14, cy + 22);
          if (isGround) ctx.lineTo(x + 8, cy + 36);
        };
        ctx.strokeStyle = 'rgba(255,120,40,0.35)';
        ctx.lineWidth = 7;
        path();
        ctx.stroke();
        ctx.strokeStyle = P.glow;
        ctx.lineWidth = 2.5;
        path();
        ctx.stroke();
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 1;
        path();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    if (isGround) groundPebbles(ctx, left, right, y, bodyH, i, x0, x1, P.glow ? 'rgba(0,0,0,0.25)' : null);
    else {
      ctx.strokeStyle = P.edge;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      bodyPath(ctx);
      ctx.stroke();
    }

    // ── 頂面 ──
    const L = left - (isGround ? 0 : 4);
    const R = right + (isGround ? 0 : 4);
    const tx0 = Math.max(L, x0);
    const tx1 = Math.min(R, x1);
    if (style === 'planks') {
      ctx.fillStyle = P.top;
      ctx.beginPath();
      A.roundRect(ctx, L, y - 7, R - L, 15, 3);
      ctx.fill();
      ctx.fillStyle = P.topHi;
      ctx.fillRect(L + 3, y - 6, R - L - 6, 3);
      ctx.strokeStyle = P.edge;
      ctx.lineWidth = 1.6;
      for (let x = Math.floor(tx0 / 32) * 32 + 16; x < tx1 - 4; x += 32) {
        if (x < L + 8) continue;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x, y + 7);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = P.edge;
        ctx.fillRect(x - 6, y - 3, 2, 2);
        ctx.fillRect(x + 4, y + 3, 2, 2);
      }
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      A.roundRect(ctx, L, y - 7, R - L, 15, 3);
      ctx.stroke();
    } else if (style === 'sand') {
      ctx.fillStyle = P.top;
      ctx.beginPath();
      A.roundRect(ctx, L, y - 7, R - L, 14, 7);
      ctx.fill();
      if (!isGround) {
        ctx.strokeStyle = P.edge;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // 下緣圓圓的波浪
      for (let x = Math.floor(tx0 / 16) * 16; x < tx1; x += 16) {
        if (x < L + 4 || x > R - 18) continue;
        ctx.beginPath();
        ctx.arc(x + 8, y + 6, 7 + hash(x) * 2, 0, Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = P.topHi;
      ctx.fillRect(L + (isGround ? 0 : 6), y - 6, R - L - (isGround ? 0 : 12), 3);
      ctx.fillStyle = P.shade;
      for (let x = Math.floor(tx0 / 9) * 9; x < tx1; x += 9) {
        if (x < L + 6 || x > R - 6) continue;
        const hx = hash(x * 1.7);
        if (hx < 0.5) continue;
        ctx.fillRect(x, y - 2 + hx * 6, 2, 2);
      }
    } else if (style === 'rock') {
      ctx.fillStyle = P.top;
      ctx.beginPath();
      const sx = Math.floor(tx0 / 18) * 18;
      const ex = Math.ceil(tx1 / 18) * 18;
      const a0 = Math.max(L, sx);
      const a1 = Math.min(R, ex);
      ctx.moveTo(a0, y + 7);
      ctx.lineTo(a0, y - 4);
      for (let x = sx; x <= ex; x += 18) {
        if (x <= a0 || x >= a1) continue;
        ctx.lineTo(x, y - 6 - hash(x) * 3);
      }
      ctx.lineTo(a1, y - 4);
      ctx.lineTo(a1, y + 7);
      for (let x = ex; x >= sx; x -= 12) {
        if (x <= a0 || x >= a1) continue;
        ctx.lineTo(x, y + 6 + hash(x + 0.5) * 6);
      }
      ctx.closePath();
      ctx.fill();
      if (!isGround) {
        ctx.strokeStyle = P.edge;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = P.topHi;
      ctx.fillRect(a0 + (isGround ? 0 : 5), y - 4, a1 - a0 - (isGround ? 0 : 10), 3);
    } else if (style === 'slab') {
      ctx.fillStyle = P.shade;
      ctx.fillRect(Math.max(L, x0), y - 2, Math.min(R, x1) - Math.max(L, x0), 10);
      for (let x = Math.floor(tx0 / 46) * 46; x < tx1; x += 46) {
        const a = Math.max(L, x);
        const b = Math.min(R, x + 46);
        if (b - a < 8) continue;
        const dy = hash(x) * 2;
        ctx.fillStyle = P.top;
        ctx.strokeStyle = P.edge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        A.roundRect(ctx, a + 1, y - 7 + dy, b - a - 2, 14, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = P.topHi;
        ctx.fillRect(a + 4, y - 5 + dy, b - a - 8, 3);
      }
    }
  }

  function drawDeco(ctx, kind, d, y, P) {
    const x = d.x;
    if (d.k < 0.45) {
      if (P && P.tuft === false) {
        if (d.k > 0.2) return;
      } else {
        // 草叢
        ctx.fillStyle = P && P.tuft ? P.tuft : kind === 'gems' ? '#caa0d6' : '#5f9f3a';
        ctx.beginPath();
        ctx.moveTo(x - 8 * d.s, y - 4);
        ctx.quadraticCurveTo(x - 6 * d.s, y - 16 * d.s, x - 2, y - 4);
        ctx.quadraticCurveTo(x, y - 20 * d.s, x + 3, y - 4);
        ctx.quadraticCurveTo(x + 7 * d.s, y - 14 * d.s, x + 9 * d.s, y - 4);
        ctx.fill();
        return;
      }
    }
    if (d.k > 0.8) return;
    if (kind === 'flowers') {
      ctx.strokeStyle = '#4f8f34';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y - 14 * d.s);
      ctx.stroke();
      ctx.fillStyle = d.k > 0.62 ? '#ffe36b' : '#ff9fbf';
      for (let a = 0; a < 5; a++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(a * 1.26) * 3.5, y - 14 * d.s + Math.sin(a * 1.26) * 3.5, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath();
      ctx.arc(x, y - 14 * d.s, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'mushrooms' || kind === 'glowshrooms') {
      const glow = kind === 'glowshrooms';
      if (glow) {
        const g = ctx.createRadialGradient(x, y - 10, 1, x, y - 10, 22);
        g.addColorStop(0, 'rgba(140,255,210,0.5)');
        g.addColorStop(1, 'rgba(140,255,210,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y - 10, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = glow ? '#d8fff0' : '#fff0d6';
      ctx.fillRect(x - 2, y - 11 * d.s, 4, 8 * d.s);
      ctx.fillStyle = glow ? '#7df0d0' : d.k > 0.62 ? '#e05a3a' : '#f28c38';
      ctx.beginPath();
      ctx.ellipse(x, y - 11 * d.s, 8 * d.s, 6 * d.s, 0, Math.PI, 0);
      ctx.fill();
    } else if (kind === 'ferns') {
      ctx.strokeStyle = '#3f7f2a';
      ctx.lineWidth = 2;
      for (let s = -1; s <= 1; s += 2) {
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.quadraticCurveTo(x + s * 10 * d.s, y - 22 * d.s, x + s * 20 * d.s, y - 14 * d.s);
        ctx.stroke();
      }
    } else if (kind === 'gems') {
      ctx.fillStyle = d.k > 0.62 ? '#ffd35a' : '#ff9fd0';
      ctx.beginPath();
      ctx.moveTo(x, y - 16 * d.s);
      ctx.lineTo(x + 5, y - 6);
      ctx.lineTo(x, y - 2);
      ctx.lineTo(x - 5, y - 6);
      ctx.closePath();
      ctx.fill();
    } else if (DECO[kind]) DECO[kind](ctx, x, y, d);
  }

  // 第二、三章的平台小裝飾
  const DECO = {
    coastal(ctx, x, y, d) {
      // 海石竹：細莖頂著一球粉紅
      ctx.strokeStyle = '#5f8f3a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x + 1, y - 13 * d.s);
      ctx.moveTo(x + 5, y - 4);
      ctx.lineTo(x + 6, y - 10 * d.s);
      ctx.stroke();
      ctx.fillStyle = d.k > 0.62 ? '#ffffff' : '#ff9ec0';
      ctx.beginPath();
      ctx.arc(x + 1, y - 14 * d.s, 3.4, 0, Math.PI * 2);
      ctx.arc(x + 6, y - 11 * d.s, 2.6, 0, Math.PI * 2);
      ctx.fill();
    },
    shells(ctx, x, y, d) {
      if (d.k > 0.62) {
        ctx.fillStyle = '#ff9a5a';
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
          const r = (k % 2 ? 2.2 : 5.5) * d.s;
          ctx.lineTo(x + Math.cos(a) * r, y - 5 + Math.sin(a) * r * 0.5);
        }
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffd2c2';
        ctx.strokeStyle = '#d8907e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y - 2);
        ctx.lineTo(x - 5 * d.s, y - 6 * d.s);
        ctx.quadraticCurveTo(x, y - 13 * d.s, x + 5 * d.s, y - 6 * d.s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    },
    barnacles(ctx, x, y, d) {
      ctx.fillStyle = '#e8e4d8';
      ctx.strokeStyle = '#7a7468';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        const bx = x + (k - 1) * 6 * d.s;
        const s = (k === 1 ? 5 : 3.5) * d.s;
        ctx.beginPath();
        ctx.moveTo(bx - s, y - 3);
        ctx.lineTo(bx - s * 0.4, y - 3 - s * 1.2);
        ctx.lineTo(bx + s * 0.4, y - 3 - s * 1.2);
        ctx.lineTo(bx + s, y - 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      if (d.k > 0.62) {
        ctx.strokeStyle = '#4f7a3a';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + 10, y - 2);
        ctx.quadraticCurveTo(x + 14, y + 8, x + 11, y + 16);
        ctx.stroke();
      }
    },
    ropes(ctx, x, y, d) {
      if (d.k > 0.62) {
        // 捲起來的繩子
        ctx.strokeStyle = '#8a6440';
        ctx.fillStyle = '#e0bc84';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x, y - 5, 9 * d.s, 4 * d.s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, y - 6, 5 * d.s, 2 * d.s, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 小水桶
        ctx.fillStyle = '#7a9ab8';
        ctx.strokeStyle = '#3a4a5a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 16 * d.s);
        ctx.lineTo(x + 6, y - 16 * d.s);
        ctx.lineTo(x + 5, y - 4);
        ctx.lineTo(x - 5, y - 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    },
    seaweed(ctx, x, y, d) {
      // 從頂面垂過邊緣的海草
      ctx.fillStyle = d.k > 0.62 ? '#4f7a3a' : '#3f6a44';
      ctx.beginPath();
      ctx.moveTo(x - 8 * d.s, y - 6);
      ctx.quadraticCurveTo(x - 10 * d.s, y + 8, x - 4 * d.s, y + 14 * d.s + 6);
      ctx.quadraticCurveTo(x - 2, y + 6, x + 1, y + 10 * d.s + 4);
      ctx.quadraticCurveTo(x + 4, y + 2, x + 8 * d.s, y + 16 * d.s + 4);
      ctx.quadraticCurveTo(x + 10 * d.s, y + 2, x + 8 * d.s, y - 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x - 4, y - 5, 5, 1.5);
    },
    pebbles(ctx, x, y, d) {
      [[-5, 3.5, '#a8a298'], [3, 5, '#8e887e'], [9, 3, '#b8b2a8']].forEach(([dx, r, col]) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(x + dx * d.s, y - r * 0.6 * d.s - 3, r * d.s, r * 0.7 * d.s, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    },
    drygrass(ctx, x, y, d) {
      ctx.strokeStyle = d.k > 0.62 ? '#c89a5a' : '#b08a4a';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * 2, y - 4);
        ctx.lineTo(x + k * 5 * d.s, y - (14 - Math.abs(k) * 3) * d.s);
        ctx.stroke();
      }
    },
    embers(ctx, x, y, d) {
      const g = ctx.createRadialGradient(x, y - 2, 0, x, y - 2, 12 * d.s);
      g.addColorStop(0, 'rgba(255,140,50,0.55)');
      g.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y - 2, 12 * d.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb04a';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 4 * d.s, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      if (d.k > 0.62) {
        ctx.fillStyle = '#2e2438';
        ctx.beginPath();
        ctx.moveTo(x + 6, y - 3);
        ctx.lineTo(x + 9, y - 14 * d.s);
        ctx.lineTo(x + 13, y - 3);
        ctx.fill();
      }
    },
    ashy(ctx, x, y, d) {
      ctx.fillStyle = '#6e625e';
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 7 * d.s, 3 * d.s, 0, Math.PI, 0);
      ctx.fill();
      if (d.k > 0.62) DECO.embers(ctx, x + 8, y, d);
    },
  };

  // 麻繩（海邊、峽谷）與鐵鍊（熔岩地帶）
  function drawRopeLine(ctx, x, top, bottom, t, style) {
    const sway = (y) => x + Math.sin(y * 0.05 + t * 0.9) * 1.8;
    ctx.lineCap = 'round';
    if (style === 'chain') {
      ctx.lineWidth = 3;
      for (let y = top, k = 0; y < bottom; y += 9, k++) {
        const xx = sway(y);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(xx, y + 4, k % 2 ? 2 : 5, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = k % 2 ? '#8a8494' : '#aaa4b4';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    } else {
      const path = () => {
        ctx.beginPath();
        for (let y = top; y <= bottom; y += 5) (y === top ? ctx.moveTo(sway(y), y) : ctx.lineTo(sway(y), y));
      };
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 9;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#c89a5e';
      ctx.lineWidth = 5.5;
      path();
      ctx.stroke();
      // 麻繩的扭紋
      ctx.strokeStyle = '#8a6438';
      ctx.lineWidth = 1.6;
      for (let y = top + 4; y < bottom; y += 7) {
        const xx = sway(y);
        ctx.beginPath();
        ctx.moveTo(xx - 2.5, y - 2);
        ctx.lineTo(xx + 2.5, y + 2);
        ctx.stroke();
      }
      // 每隔一段一個繩結
      for (let y = top + 26; y < bottom - 6; y += 34) A.ellipse(ctx, sway(y), y, 5.5, 4.5, '#d8aa6a', '#b0854a', { lw: 2, hl: false });
    }
    // 頂端綁在一截小木樁上
    A.shape(ctx, (c) => A.roundRect(c, x - 10, top - 6, 20, 9, 3), style === 'chain' ? '#6a6070' : '#8a6446', style === 'chain' ? '#4a4250' : '#6e4e36', { lw: 2.2, hl: false });
  }

  // 可以爬的藤蔓／梯子：粗一點、亮一點、有呼吸光；教學時靠近會跳出「↑」
  A.drawRope = function (ctx, r, t, near) {
    const x = r[0];
    const top = r[1] - 8;
    const bottom = r[2] - 34;
    const pulse = 0.5 + Math.sin(t * 2.4) * 0.5;
    // 呼吸光
    const g = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
    const ga = (near ? 0.55 : 0.3 + pulse * 0.2).toFixed(3);
    g.addColorStop(0, 'rgba(255,248,170,0)');
    g.addColorStop(0.5, 'rgba(255,248,170,' + ga + ')');
    g.addColorStop(1, 'rgba(255,248,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 30, top - 6, 60, bottom - top + 26);
    // 往上飄的小光點，一眼就知道「這條可以爬」
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.5 + k / 4) % 1;
      const py = bottom - ph * (bottom - top);
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
      ctx.fillStyle = '#fffbd0';
      ctx.beginPath();
      ctx.arc(x + Math.sin(ph * 12 + k) * 10, py, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 繩索樣式：地圖可以直接寫 'rope' / 'chain'；寫 'vine' 或沒寫時，用主題的預設（第一章就是藤蔓）
    let style = r[3] || 'vine';
    if (style === 'vine') {
      const m = G.world && G.world.map;
      if (m && m._theme && m._theme.rope) style = m._theme.rope;
    }
    if (style === 'rope' || style === 'chain') {
      drawRopeLine(ctx, x, top, bottom, t, style);
    } else if (r[3] === 'ladder') {
      ctx.lineCap = 'round';
      [[A.outline(), 8], ['#b5824a', 4]].forEach(([col, w]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x - 11, top);
        ctx.lineTo(x - 11, bottom);
        ctx.moveTo(x + 11, top);
        ctx.lineTo(x + 11, bottom);
        for (let y = top + 10; y < bottom; y += 16) {
          ctx.moveTo(x - 11, y);
          ctx.lineTo(x + 11, y);
        }
        ctx.stroke();
      });
    } else {
      const path = () => {
        ctx.beginPath();
        for (let y = top; y <= bottom; y += 5) {
          const xx = x + Math.sin(y * 0.07 + t * 0.8) * 2.5;
          y === top ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y);
        }
      };
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 10;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#5f9e38';
      ctx.lineWidth = 6;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#a8e070';
      ctx.lineWidth = 2;
      ctx.save();
      ctx.translate(-1.5, 0);
      path();
      ctx.stroke();
      ctx.restore();
      // 葉子
      for (let y = top + 12, i = 0; y < bottom - 4; y += 20, i++) {
        const sd = i % 2 ? 1 : -1;
        const sway = Math.sin(t * 2 + i) * 0.15;
        A.ellipse(ctx, x + sd * 9, y, 8, 4, '#7cc84a', '#5a9e34', { rot: sd * 0.6 + sway, lw: 1.8, hl: false });
      }
      // 頂端的結與小花
      A.ellipse(ctx, x, top + 2, 9, 7, '#5f9e38', '#4a8030', { lw: 2.2, hl: false });
      for (let k = 0; k < 5; k++) A.ellipse(ctx, x + 8 + Math.cos(k * 1.256) * 3.5, top - 2 + Math.sin(k * 1.256) * 3.5, 2.6, 2.6, '#fff3a0', null, { lw: 1.2, hl: false });
      A.ellipse(ctx, x + 8, top - 2, 1.8, 1.8, '#ff9a3a', null, { noStroke: true, hl: false });
    }

    // 底部提示：只在操作教學的「爬藤蔓」這一步出現
    const tut = G.tutorial && G.tutorial.current();
    if (!tut || tut.id !== 'climb') return;
    const by = bottom + 8 - Math.abs(Math.sin(t * 4)) * 6;
    if (near) {
      const label = G.input.label('up');
      ctx.font = 'bold 16px ' + A.FONT;
      const w = Math.max(30, ctx.measureText(label).width + 14);
      ctx.fillStyle = 'rgba(255,248,220,0.95)';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      A.roundRect(ctx, x - w / 2, by - 44, w, 28, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4a2e1f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, by - 30);
      ctx.font = 'bold 12px ' + A.FONT;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(40,24,12,0.8)';
      ctx.strokeText('爬', x, by - 6);
      ctx.fillStyle = '#fff6d0';
      ctx.fillText('爬', x, by - 6);
    } else {
      ctx.globalAlpha = 0.6 + pulse * 0.4;
      ctx.fillStyle = '#fff6c0';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, by - 22);
      ctx.lineTo(x + 7, by - 13);
      ctx.lineTo(x - 7, by - 13);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  A.THEMES = THEMES;
})();
