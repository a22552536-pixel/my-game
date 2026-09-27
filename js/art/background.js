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
        // 天空：晨光、卷雲、積雲、遠方的鳥群
        { type: 'stack', f: 0.008, of: [
          { type: 'skyGlow', sun: [0.16, 0.06], rgb: '255,246,205', r: 560, a: 0.6, horizon: '255,250,236', horizonY: 0.6, horizonH: 0.16, horizonA: 0.55, cirrus: 5, cirrusA: 0.4, birds: 3, birdColor: 'rgba(70,96,120,0.5)' },
          { type: 'cumulus', n: 6, y0: 0.1, y1: 0.34, size: [40, 78], lit: '#ffffff', mid: '#f3f8fd', shade: '#dce9f4', dark: '#c4d6e6', rim: 'rgba(255,255,255,0.9)', alpha: 0.92 },
        ] },
        // 遠山兩重：越遠越藍、稜上有樹線，山腳起霧；近一重有田野
        { type: 'ridges', f: 0.024, fog: '#e8f4f2', fogRgb: '234,245,242', bands: [
          { base: 0.5, amp: 70, color: '#b6d0dc', shade: 'rgba(110,140,175,0.13)', rim: 'rgba(255,255,240,0.7)', trees: '#a8c4d0', pointy: true, treeH: 9, treeStep: 5, mistA: 0.5 },
          { base: 0.58, amp: 42, color: '#a9ccb6', shade: 'rgba(70,110,90,0.12)', rim: 'rgba(255,255,230,0.7)', trees: '#97bea4', treeH: 12, mistA: 0.4, fields: 14, fieldCols: ['rgba(236,232,160,0.4)', 'rgba(176,214,136,0.45)', 'rgba(250,236,200,0.35)'] },
        ] },
        // 遠方的故事：風車、山坡上的小村、地平線上的世界樹
        { type: 'landmarks', f: 0.04, wall: '#f4e8d6', wallShade: '#d6c4b0', walls: ['#f4e8d6', '#f0dcc0', '#e8e0d0'], roof: '#d4705a', roofShade: '#b05848', stone: '#a89888', door: '#7a5a48', win: '255,210,140', winC: '#ffe6a8', smoke: 'rgba(245,245,250,0.8)', ground: '#a4c8ae', tree: ['#8cbc84', '#7cb07a'], trunk: '#7a6a58', sail: 'rgba(252,248,236,0.95)', frame: '#8a6a52',
          items: [['windmill', 0.2, 0.585, 0.8], ['village', 0.44, 0.585, 0.9], ['giantTree', 0.86, 0.6, 0.72, { tree: ['#8fbf98', '#80b48c', '#9ccaa2'], trunk: '#8a8478' }]],
          haze: '226,240,236', hazeA: [0.32, 0.32], rim: { c: 'rgba(255,252,230,0.7)', dx: 2, dy: 2 } },
        { type: 'hills', f: 0.06, color: '#bcdcc0', base: 0.62, amp: 60, low: '#6a9a7a' },
        { type: 'trees', f: 0.18, colors: ['#9cc58a', '#8dba7c'], trunk: '#8a7560', base: 0.72, n: 9, size: [70, 110], alpha: 0.9, haze: '214,236,222', hazeA: [0.28, 0.2], rim: { c: 'rgba(255,252,220,0.6)', dx: 3, dy: 3 } },
        { type: 'trees', f: 0.38, colors: ['#6fa85a', '#5f9a4c', '#78b062'], trunk: '#6b4a35', base: 0.86, n: 7, size: [90, 140], rim: { c: 'rgba(255,250,200,0.55)', dx: 4, dy: 4 } },
      ],
      beams: 0.18,
      motes: 'rgba(255,250,200,0.8)',
      plat: { top: '#7bbf4a', topHi: '#a6db6a', body: '#9a6a42', shade: '#7a5033', edge: '#5a3a26', deco: 'flowers' },
    },
    forestMushroom: {
      sky: ['#b8e0f0', '#e8f5e6', '#fff0d8'],
      layers: [
        { type: 'stack', f: 0.008, of: [
          { type: 'skyGlow', sun: [0.7, 0.04], rgb: '255,236,200', r: 520, a: 0.55, horizon: '255,244,226', horizonY: 0.58, horizonH: 0.16, horizonA: 0.5, cirrus: 4, cirrusRgb: '255,248,236', cirrusA: 0.4, birds: 2, birdColor: 'rgba(110,90,100,0.45)' },
          { type: 'cumulus', n: 5, y0: 0.1, y1: 0.32, size: [40, 74], lit: '#fffaf2', mid: '#fdf2ea', shade: '#eed8d4', dark: '#dcc4c8', rim: 'rgba(255,255,255,0.9)', alpha: 0.92 },
        ] },
        // 遠方：一整片巨大蘑菇林的剪影，菇頂上還有孢子光
        { type: 'ridges', f: 0.022, fog: '#f2efe2', fogRgb: '244,240,228', bands: [
          { base: 0.52, amp: 50, color: '#bcd2d0', shade: 'rgba(120,140,160,0.12)', rim: 'rgba(255,250,236,0.7)', trees: '#b0c8c8', treeH: 10, mistA: 0.5 },
        ] },
        { type: 'landmarks', f: 0.032, cap: '#e8b0a0', stem: '#f2e6da', spot: 'rgba(255,250,240,0.7)', glowRgb: '255,230,180', win: '255,214,150', winC: '#ffe2a8', door: '#9a7a6a',
          items: [['giantMush', 0.12, 0.56, 1.0], ['giantMush', 0.3, 0.55, 0.75, { cap: '#e0bc8c' }], ['giantMush', 0.62, 0.56, 1.15, { cap: '#dca2a8' }], ['giantMush', 0.84, 0.55, 0.8, { cap: '#e6c290' }]],
          haze: '232,238,232', hazeA: [0.3, 0.3], rim: { c: 'rgba(255,250,236,0.6)', dx: 2, dy: 2 } },
        // 蘑菇村：菇頂小屋、煙囪冒煙
        { type: 'landmarks', f: 0.045, caps: ['#e8765e', '#e89a4e', '#d8687a'], wall: '#f6e8cc', stone: '#9a8a7a', door: '#8a5a44', win: '255,206,140', winC: '#ffe0a0', smoke: 'rgba(250,246,240,0.8)', tree: ['#9cc48e', '#8aba84'], trunk: '#8a7460', rock: '#b8ccb4', rockShade: '#a2baa0',
          items: [['mushHouse', 0.22, 0.6, 0.9], ['mushHouse', 0.26, 0.61, 0.7], ['mushHouse', 0.5, 0.6, 1.0], ['mushHouse', 0.55, 0.612, 0.72], ['mushHouse', 0.8, 0.6, 0.85]],
          haze: '228,238,228', hazeA: [0.25, 0.25], rim: { c: 'rgba(255,248,230,0.6)', dx: 2, dy: 2 } },
        { type: 'hills', f: 0.06, color: '#c3dcc4', base: 0.6, amp: 50, low: '#7aa48a' },
        { type: 'mushrooms', f: 0.2, colors: ['#f2a36a', '#e88a8a', '#f5c26b'], stem: '#f3e3c8', base: 0.78, n: 7, size: [60, 120], alpha: 0.85, glowRgb: '255,220,170', haze: '226,238,226', hazeA: [0.22, 0.16], rim: { c: 'rgba(255,250,230,0.55)', dx: 3, dy: 3 } },
        { type: 'trees', f: 0.4, colors: ['#6fa85a', '#5f9a4c'], trunk: '#6b4a35', base: 0.88, n: 6, size: [90, 150], rim: { c: 'rgba(255,250,210,0.5)', dx: 4, dy: 4 } },
      ],
      beams: 0.14,
      motes: 'rgba(255,220,170,0.8)',
      plat: { top: '#7bbf4a', topHi: '#a6db6a', body: '#9a6a42', shade: '#7a5033', edge: '#5a3a26', deco: 'mushrooms' },
    },
    forestDeep: {
      sky: ['#5f8f7a', '#a9c9a0', '#e8e2b0'],
      layers: [
        // 林冠縫隙透下來的天光與光柱
        { type: 'stack', f: 0.01, of: [
          { type: 'skyGlow', sun: [0.3, 0.02], rgb: '250,255,210', r: 600, a: 0.6, horizon: '236,236,196', horizonY: 0.55, horizonH: 0.22, horizonA: 0.55 },
          { type: 'shafts', x: 0.45, span: 0.9, y: -0.05, n: 14, rgb: '255,255,220', a: 0.16, angle: 1.2, spread: 0.2, len: 1.2, w: 0.035 },
        ] },
        // 霧裡一層層的樹影
        { type: 'ridges', f: 0.03, fog: '#dfe2bc', fogRgb: '226,228,190', bands: [
          { base: 0.46, amp: 40, color: '#9fb89e', trees: '#9fb89e', treeH: 34, treeStep: 12, mistA: 0.55, sharp: 0.2 },
          { base: 0.56, amp: 30, color: '#86a684', trees: '#86a684', treeH: 44, treeStep: 14, mistA: 0.5, sharp: 0.2 },
        ] },
        // 森林深處：長滿藤蔓的古塔與瀑布
        { type: 'landmarks', f: 0.05, stone: '#9aa894', stoneShade: '#7e8e7c', vine: '#5a8a5a', dark: '#40503f', water: '#f0fae8', water2: 'rgba(230,245,225,0.5)', mist: '236,244,220', tree: ['#6f966e', '#628c64'], trunk: '#5a5040',
          items: [['ruinTower', 0.3, 0.6, 1.2], ['waterfall', 0.72, 0.64, 1.0, { stone: '#7e9282', stoneShade: '#687c6c', moss: 'rgba(110,150,100,0.5)' }]],
          haze: '206,220,186', hazeA: [0.45, 0.35], rim: { c: 'rgba(250,255,210,0.55)', dx: 2, dy: 2 } },
        { type: 'trees', f: 0.08, colors: ['#6c917a', '#5f8570'], trunk: '#4f6a5a', base: 0.7, n: 10, size: [80, 130], alpha: 0.8, haze: '200,218,180', hazeA: [0.38, 0.3], rim: { c: 'rgba(240,255,200,0.5)', dx: 3, dy: 3 } },
        { type: 'trees', f: 0.22, colors: ['#4f7d52', '#46724a'], trunk: '#4a3a2c', base: 0.8, n: 8, size: [110, 170], haze: '190,210,170', hazeA: [0.16, 0.12], rim: { c: 'rgba(240,255,190,0.5)', dx: 3, dy: 3 } },
        { type: 'trees', f: 0.42, colors: ['#3d6b40', '#346038'], trunk: '#3a2a1e', base: 0.95, n: 6, size: [140, 200], rim: { c: 'rgba(230,255,170,0.45)', dx: 4, dy: 4 } },
      ],
      beams: 0.32,
      motes: 'rgba(230,255,190,0.9)',
      plat: { top: '#5fa843', topHi: '#86c95c', body: '#83573a', shade: '#66422c', edge: '#4a2e1f', deco: 'ferns' },
    },
    rootCave: {
      sky: ['#1d2a2c', '#2c3e38', '#3f4a36'],
      layers: [
        // 洞穴深處：鐘乳石、發光礦脈、地下瀑布與發光巨菇
        { type: 'stalactites', f: 0.04, ceil: 0.2, floor: 0.8, color: '#26352f', shade: '#1d2a25', wet: 'rgba(140,240,210,0.35)', drip: 'rgba(150,245,215,0.75)', n: 46, len: [30, 130], upK: 0.3, veins: 12, veinRgb: ['125,240,208', '182,240,122', '143,200,255'] },
        { type: 'landmarks', f: 0.06, stone: '#2e3e38', stoneShade: '#243330', water: '#b8fff0', water2: 'rgba(120,240,210,0.35)', mist: '110,240,210', cap: '#3a8a86', stem: '#9ad8c8', gill: '#8af0d8', spot: 'rgba(190,255,240,0.8)', glowRgb: '120,240,210',
          items: [['waterfall', 0.36, 0.84, 0.9, { moss: 'rgba(110,220,190,0.25)' }], ['giantMush', 0.12, 0.82, 0.8], ['giantMush', 0.66, 0.84, 1.0, { cap: '#4a6aa0', glowRgb: '140,190,255' }], ['giantMush', 0.86, 0.82, 0.65, { cap: '#6a9a50', glowRgb: '182,240,122' }]],
          haze: '30,50,45', hazeA: [0.35, 0.35] },
        { type: 'caveWall', f: 0.1, color: '#34443a', base: 0.3, rim: { c: 'rgba(125,240,208,0.35)', dx: 0, dy: 3 } },
        { type: 'roots', f: 0.25, color: '#4a3a2a', n: 14, rim: { c: 'rgba(160,240,200,0.3)', dx: 3, dy: 0 } },
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
        // 暮色裡的菇之王城：遠方的城堡剪影、巨菇塔、孢子光
        { type: 'stack', f: 0.008, of: [
          { type: 'skyGlow', sun: [0.5, 0.6], rgb: '255,170,200', r: 620, a: 0.5, horizon: '230,150,180', horizonY: 0.56, horizonH: 0.2, horizonA: 0.45, cirrus: 5, cirrusRgb: '255,190,210', cirrusA: 0.3, cirrusY: [0.08, 0.3] },
          { type: 'stars', n: 90, colors: ['#ffffff', '#ffd8f0'], cons: 0, line: 'rgba(0,0,0,0)' },
        ] },
        { type: 'landmarks', f: 0.025, wall: '#6a4a78', wallShade: '#56386a', roof: '#b85a8e', roofShade: '#8e4478', flag: '#f2c75a', frame: '#3a2440', dark: '#2a1830', win: '255,200,230', winC: '#ffd8ea',
          items: [['castle', 0.5, 0.56, 1.2], ['giantMush', 0.18, 0.58, 1.1, { cap: '#8a4a86', stem: '#c8a8c0', glowRgb: '255,170,220', spot: 'rgba(255,220,240,0.7)' }], ['giantMush', 0.82, 0.58, 1.25, { cap: '#6e4a8e', stem: '#c0a4c8', glowRgb: '220,170,255', spot: 'rgba(240,220,255,0.7)' }]],
          haze: '120,70,110', hazeA: [0.35, 0.45], rim: { c: 'rgba(255,190,220,0.7)', dx: 0, dy: 3 } },
        { type: 'hills', f: 0.05, color: '#5a3656', base: 0.55, amp: 40, low: '#2a1830', rimC: 'rgba(255,180,220,0.45)', path: false },
        { type: 'banners', f: 0.12, n: 4, cloth: '#7a3a6a', clothShade: '#5a2a50', trim: '#f2c75a', flag: '#9a4a86' },
        { type: 'mushrooms', f: 0.2, colors: ['#9a4f86', '#b85a8e', '#7e4a8a'], stem: '#e8d4dc', base: 0.82, n: 6, size: [110, 180], alpha: 0.9, glowRgb: '255,190,230', rim: { c: 'rgba(255,200,230,0.55)', dx: 0, dy: 3 } },
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
        { type: 'skyGlow', f: 0.006, sun: [0.18, 0.04], rgb: '255,250,215', r: 560, a: 0.6, horizon: '236,248,255', horizonY: 0.49, horizonH: 0.12, horizonA: 0.65, cirrus: 6, cirrusA: 0.45 },
        { type: 'clouds', f: 0.02, n: 6, y0: 0.08, y1: 0.3, size: [50, 90], color: '#ffffff', shade: '#dcecf8', alpha: 0.95 },
        { type: 'sea', f: 0.03, base: 0.5, colors: ['#6cc0e8', '#3f97cf'], hi: '#e8f8ff', n: 70 },
        // 海平線上的小島與對岸的港町
        { type: 'landmarks', f: 0.034, rock: '#9ab8c4', rockShade: '#86a6b6', grass: '#a4c8b0', tree: ['#8ab8a0', '#7cae98'], trunk: '#7a8a88', walls: ['#f6efe4', '#f4dcc8', '#e4ecf2', '#f8e2a8'], wall: '#f6efe4', wallShade: '#d8d0c8', roof: '#d86a58', roofShade: '#b45a50', stone: '#b8b4ac', door: '#7a6a6a', win: '255,220,160', winC: '#ffe8b0', frame: '#6a6a78',
          items: [['islet', 0.06, 0.505, 0.9], ['harbor', 0.33, 0.505, 0.7], ['islet', 0.52, 0.505, 0.6], ['islet', 0.95, 0.505, 0.7]],
          haze: '206,232,248', hazeA: [0.42, 0.42] },
        { type: 'boats', f: 0.05, base: 0.52, n: 4, hull: '#6a5a6a', sail: '#fff8ee', flag: '#e8604a' },
        { type: 'lighthouse', f: 0.07, base: 0.53, x: 0.72, w: 320, hh: 80, rock: '#c9b89a', grass: '#9ccf78', tower: '#fbf6ee', stripe: '#e0584a' },
        { type: 'cliffs', f: 0.16, base: 0.76, w: [220, 380], hgt: [70, 130], gap: [120, 320], color: '#d9c29a', shade: '#bea27a', streak: 'rgba(120,90,60,0.18)', top: '#8fc86a', topHi: '#b4e08a', rim: { c: 'rgba(255,250,225,0.7)', dx: 3, dy: 2 }, haze: '190,225,245', hazeA: [0.12, 0.05] },
        { type: 'trees', f: 0.34, colors: ['#6fae5a', '#5f9e4c'], trunk: '#7a5a40', base: 0.9, n: 3, size: [90, 130], rim: { c: 'rgba(255,250,210,0.55)', dx: 4, dy: 4 } },
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
        { type: 'skyGlow', f: 0.006, sun: [0.8, 0.04], rgb: '255,252,225', r: 520, a: 0.6, horizon: '240,252,255', horizonY: 0.46, horizonH: 0.12, horizonA: 0.7, cirrus: 5, cirrusA: 0.45, birds: 2, birdColor: 'rgba(70,100,120,0.45)' },
        { type: 'clouds', f: 0.02, n: 5, y0: 0.06, y1: 0.26, size: [55, 95], color: '#ffffff', shade: '#dff0fa', alpha: 0.95 },
        { type: 'sea', f: 0.03, base: 0.47, colors: ['#74d0ec', '#40b0d8'], hi: '#f0fcff', n: 80 },
        // 遠方的椰子島與海蝕拱門
        { type: 'landmarks', f: 0.034, rock: '#a8c0c0', rockShade: '#94b0b4', grass: '#a8ccb0', tree: ['#7ab89a'], trunk: '#a0a090', palm: true, holeC: '#8cc8e0', bird: 'rgba(70,90,110,0.55)',
          items: [['islet', 0.14, 0.475, 1.0], ['seaStack', 0.4, 0.475, 0.55, { hole: true }], ['islet', 0.66, 0.475, 0.7], ['seaStack', 0.88, 0.475, 0.4]],
          haze: '214,240,250', hazeA: [0.4, 0.4] },
        { type: 'rocks', f: 0.06, base: 0.5, n: 4, w: [40, 90], hgt: [30, 70], color: '#8f9aa0', shade: '#737e86', top: '#a8c878', foam: true },
        { type: 'shore', f: 0.14, base: 0.64, sand: '#f8ecce', wet: '#e4d4b0', pool: '#8fdcec', rim: '#b9a888', foam: 'rgba(255,255,255,0.9)', pools: 6 },
        { type: 'palms', f: 0.3, base: 0.86, n: 4, size: [160, 230], trunk: '#b0875a', ring: '#8a6640', colors: ['#5fae4a', '#4f9a40', '#72bf55'], rim: { c: 'rgba(255,252,215,0.6)', dx: -3, dy: 3 } },
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
        { type: 'stack', f: 0.006, of: [
          { type: 'skyGlow', sun: [0.3, 0.48], rgb: '255,214,150', r: 620, a: 0.55, horizon: '255,226,190', horizonY: 0.5, horizonH: 0.1, horizonA: 0.6, cirrus: 7, cirrusRgb: '255,220,190', cirrusA: 0.4, cirrusY: [0.1, 0.36] },
          { type: 'shafts', x: 0.3, y: 0.5, n: 12, rgb: '255,226,170', a: 0.14, angle: -1.57, spread: 2.4, len: 0.9, w: 0.03 },
        ] },
        { type: 'clouds', f: 0.02, n: 7, y0: 0.05, y1: 0.32, size: [70, 120], color: '#f2d6c4', shade: '#b8a6b4', alpha: 0.95, lit: '#ffe6cc', rim: 'rgba(255,226,170,0.9)' },
        { type: 'sea', f: 0.03, base: 0.52, colors: ['#8aaebc', '#4f8398'], hi: '#ffe6c0', n: 60, glowX: 0.3, glow: 'rgba(255,220,160,0.55)' },
        // 夕霧裡的海蝕柱與另一艘沉船的桅杆
        { type: 'landmarks', f: 0.04, rock: '#8a8090', rockShade: '#766c7e', grass: '#8a9474', hull: '#6a5a60', sail: 'rgba(232,214,200,0.8)', bird: 'rgba(80,60,80,0.6)',
          items: [['seaStack', 0.08, 0.525, 0.8], ['seaStack', 0.14, 0.525, 0.5], ['wreckMast', 0.64, 0.525, 0.7], ['seaStack', 0.9, 0.525, 0.65, { hole: true, holeC: '#d8b4a0' }]],
          haze: '226,196,186', hazeA: [0.5, 0.45], rim: { c: 'rgba(255,214,160,0.8)', dx: 2, dy: 1 } },
        { type: 'cliffs', f: 0.07, base: 0.6, w: [260, 420], hgt: [120, 200], gap: [300, 600], color: '#9a8a8c', shade: '#857477', streak: 'rgba(60,40,50,0.15)', top: '#8a9e6a', topHi: '#a2b47e', rim: { c: 'rgba(255,210,150,0.75)', dx: 3, dy: 1 }, haze: '220,190,180', hazeA: [0.25, 0.15] },
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
        { type: 'skyGlow', f: 0.006, sun: [0.62, 0.02], rgb: '255,255,235', r: 520, a: 0.55, horizon: '226,244,252', horizonY: 0.43, horizonH: 0.1, horizonA: 0.7, cirrus: 7, cirrusA: 0.5, birds: 3, birdColor: 'rgba(60,90,120,0.45)' },
        { type: 'clouds', f: 0.02, n: 5, y0: 0.06, y1: 0.28, size: [60, 100], color: '#ffffff', shade: '#d6eaf6', alpha: 0.9 },
        { type: 'sea', f: 0.03, base: 0.44, colors: ['#4aaede', '#1f78b8'], hi: '#e8f8ff', n: 90 },
        // 外海的礁岩群與燈標小島
        { type: 'landmarks', f: 0.035, rock: '#8aa2b0', rockShade: '#7690a0', grass: '#9ab8a0', tree: ['#86b09a'], trunk: '#7a8a8a', holeC: '#6ab8e0', walls: ['#f4f0e8'], wall: '#f4f0e8', wallShade: '#d4d0cc', roof: '#d8604a', win: '255,230,170',
          items: [['seaStack', 0.1, 0.445, 0.7, { hole: true }], ['seaStack', 0.16, 0.445, 0.45], ['islet', 0.46, 0.445, 0.8, { win: '255,230,170' }], ['seaStack', 0.78, 0.445, 0.6], ['seaStack', 0.82, 0.445, 0.9, { hole: true }]],
          haze: '200,230,248', hazeA: [0.42, 0.42] },
        { type: 'rocks', f: 0.08, base: 0.52, n: 5, w: [60, 120], hgt: [50, 120], color: '#6a7e8a', shade: '#566a76', top: '#f4f4ee', foam: true, splash: true },
        { type: 'surf', f: 0.2, base: 0.68, n: 4, color: '#465660', shade: '#36444e', sea: '#2f86be' },
        { type: 'rocks', f: 0.36, base: 0.86, n: 4, w: [100, 180], hgt: [70, 130], color: '#3e4c56', shade: '#303c44', top: '#4f7a4a', foam: true, splash: true, rim: { c: 'rgba(220,245,255,0.55)', dx: -3, dy: 3 } },
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
        { type: 'stack', f: 0.006, of: [
          { type: 'skyGlow', sun: [0.55, 0.5], rgb: '255,180,110', r: 700, a: 0.5, horizon: '255,190,140', horizonY: 0.49, horizonH: 0.1, horizonA: 0.55, cirrus: 8, cirrusRgb: '255,170,140', cirrusA: 0.45, cirrusY: [0.06, 0.3], birds: 2, birdColor: 'rgba(60,30,60,0.6)' },
          { type: 'shafts', x: 0.55, y: 0.5, n: 16, rgb: '255,200,140', a: 0.16, angle: -1.57, spread: 2.8, len: 0.8, w: 0.025 },
        ] },
        { type: 'clouds', f: 0.02, n: 5, y0: 0.08, y1: 0.3, size: [70, 120], color: '#f0a08a', shade: '#9a6690', alpha: 0.85, lit: '#ffc49a', dark: '#6e4a78', rim: 'rgba(255,214,150,0.95)' },
        { type: 'sun', f: 0.03, x: 0.55, y: 0.5, r: 56, color: '#ffe6a0', glow: 'rgba(255,190,110,0.55)' },
        { type: 'sea', f: 0.03, base: 0.5, colors: ['#b0708a', '#5a4a7a'], hi: '#ffd8a0', n: 60, glowX: 0.55, glow: 'rgba(255,210,140,0.7)' },
        // 夕陽下的島影
        { type: 'landmarks', f: 0.034, rock: '#6a4a72', rockShade: '#5a3e64', grass: '#6e5270', tree: ['#5e4468'], trunk: '#4a3450', palm: true, bird: 'rgba(50,25,50,0.7)',
          items: [['islet', 0.12, 0.505, 1.1], ['seaStack', 0.3, 0.505, 0.5], ['islet', 0.82, 0.505, 0.8], ['seaStack', 0.94, 0.505, 0.7, { hole: true, holeC: '#e0907a' }]],
          haze: '200,120,130', hazeA: [0.3, 0.3], rim: { c: 'rgba(255,200,130,0.85)', dx: 0, dy: 2 } },
        { type: 'ruins', f: 0.1, base: 0.62, n: 3, color: '#5e4466', shade: '#4a3654', stripe: 'rgba(200,110,110,0.35)', rim: '#ff9e70' },
        { type: 'rocks', f: 0.24, base: 0.8, n: 4, w: [90, 170], hgt: [60, 120], color: '#4e3a52', shade: '#3c2c42', top: '#6e5a6a', foam: false, rim: { c: 'rgba(255,170,110,0.6)', dx: 0, dy: 3 } },
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
        { type: 'skyGlow', f: 0.006, sun: [0.8, 0.06], rgb: '255,240,210', r: 560, a: 0.55, horizon: '255,236,214', horizonY: 0.5, horizonH: 0.16, horizonA: 0.5, cirrus: 5, cirrusRgb: '255,246,236', cirrusA: 0.4, birds: 2, birdColor: 'rgba(110,70,60,0.5)' },
        { type: 'clouds', f: 0.02, n: 4, y0: 0.06, y1: 0.24, size: [50, 80], color: '#fff8f0', shade: '#f0d8c8', alpha: 0.9 },
        // 遠方淡紫的山脈與熱氣球
        { type: 'ridges', f: 0.018, fog: '#f4dcca', fogRgb: '246,224,206', bands: [
          { base: 0.47, amp: 60, color: '#d8b8b8', shade: 'rgba(150,110,130,0.14)', rim: 'rgba(255,240,225,0.8)', mistA: 0.55, sharp: 0.6 },
        ] },
        { type: 'mesas', f: 0.05, base: 0.56, w: [200, 380], hgt: [80, 150], gap: [40, 160], color: '#e8b49a', shade: '#dba38a', top: '#f2c8ae', stripe: 'rgba(255,255,255,0.18)', haze: '246,220,200', hazeA: [0.3, 0.2], rim: { c: 'rgba(255,245,225,0.7)', dx: -2, dy: 2 } },
        // 山谷裡的溫泉旅館、五重塔、冒著熱氣
        { type: 'landmarks', f: 0.09, wall: '#8a5a44', wallShade: '#6e4636', roof: '#5a4a5a', roofShade: '#46384a', stone: '#9a8a80', win: '255,200,130', winC: '#ffe0a0', accent: '#d8584a', lantern: '#ff9a5a', gold: '#e8b84a', smoke: 'rgba(255,250,245,0.7)', stripes: ['#e8604a', '#f6d06a'],
          items: [['onsen', 0.08, 0.63, 0.8], ['pagoda', 0.47, 0.63, 0.55, { tiers: 5, lantern: '#ff9a5a' }], ['balloon', 0.7, 0.2, 0.8], ['balloon', 0.9, 0.3, 0.5, { stripes: ['#4aa0d8', '#f4f0e8'] }]],
          haze: '240,212,190', hazeA: [0.25, 0.2], rim: { c: 'rgba(255,240,215,0.6)', dx: -2, dy: 2 } },
        { type: 'mesas', f: 0.14, base: 0.66, w: [180, 320], hgt: [110, 190], gap: [120, 300], color: '#d08866', shade: '#bc7658', top: '#e3a07a', stripe: 'rgba(120,50,30,0.14)', shrub: '#8a8a4a', rim: { c: 'rgba(255,236,210,0.6)', dx: -3, dy: 2 } },
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
        { type: 'skyGlow', f: 0.006, sun: [0.2, 0.04], rgb: '255,250,225', r: 520, a: 0.5, horizon: '250,236,220', horizonY: 0.5, horizonH: 0.16, horizonA: 0.55, cirrus: 6, cirrusA: 0.45, birds: 2, birdY: [0.1, 0.22], birdColor: 'rgba(80,40,30,0.55)' },
        { type: 'clouds', f: 0.02, n: 4, y0: 0.05, y1: 0.22, size: [50, 90], color: '#ffffff', shade: '#dceaf6', alpha: 0.9 },
        { type: 'ridges', f: 0.018, fog: '#f6e2d4', fogRgb: '246,228,214', bands: [
          { base: 0.5, amp: 46, color: '#e2c4bc', shade: 'rgba(170,110,100,0.14)', rim: 'rgba(255,245,230,0.8)', mistA: 0.5, sharp: 0.7 },
        ] },
        { type: 'mesas', f: 0.05, base: 0.58, w: [220, 400], hgt: [90, 170], gap: [60, 200], color: '#eab8a4', shade: '#dea692', top: '#f4cab6', stripe: 'rgba(255,255,255,0.2)', haze: '246,224,210', hazeA: [0.28, 0.2], rim: { c: 'rgba(255,248,230,0.7)', dx: 2, dy: 2 } },
        // 天然石拱、鑿著崖居的孤峰、熱氣球
        { type: 'landmarks', f: 0.085, rock: '#dc9a7a', rockShade: '#c4826a', cap: '#f0b894', dark: '#7a3a2a', adobe: '#f0c8a4', shrub: '#9a9a5a', frame: '#7a4a34', stripes: ['#3a9ad8', '#f6f0e0'],
          items: [['arch', 0.22, 0.66, 0.9], ['butte', 0.66, 0.68, 0.9], ['balloon', 0.44, 0.24, 0.7]],
          haze: '242,206,186', hazeA: [0.28, 0.22], rim: { c: 'rgba(255,240,220,0.75)', dx: 2, dy: 2 } },
        { type: 'mesas', f: 0.13, base: 0.7, w: [200, 340], hgt: [150, 250], gap: [140, 320], color: '#d88a68', shade: '#c47656', top: '#eaa680', stripe: 'rgba(130,50,30,0.16)', shrub: '#8a8a4a', rim: { c: 'rgba(255,236,210,0.6)', dx: 3, dy: 2 } },
        { type: 'mesas', f: 0.3, base: 0.92, w: [160, 260], hgt: [250, 360], gap: [420, 700], color: '#c06a50', shade: '#a85840', top: '#d88a64', stripe: 'rgba(110,40,25,0.18)', shrub: '#7a7a3a', rim: { c: 'rgba(255,230,200,0.55)', dx: 4, dy: 3 } },
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
        // 峽谷頂上露出的一線天：遠山、雲
        { type: 'stack', f: 0.01, of: [
          { type: 'skyGlow', sun: [0.4, 0.02], rgb: '255,248,225', r: 520, a: 0.55, cirrus: 4, cirrusA: 0.4, cirrusY: [0.04, 0.14] },
          { type: 'cumulus', n: 4, y0: 0.1, y1: 0.16, size: [30, 50], lit: '#ffffff', mid: '#f8f4ee', shade: '#e2d8d0', dark: '#cfc2bc', rim: 'rgba(255,255,255,0.9)' },
          { type: 'ridges', fog: '#e8e0d4', fogRgb: '232,224,212', bands: [{ base: 0.24, amp: 30, color: '#c8bcc0', rim: 'rgba(255,250,240,0.8)', mistA: 0.6, fogH: 40 }] },
        ] },
        { type: 'walls', f: 0.05, top: 0.2, color: '#c0a49c', shade: '#b0948c', stripe: 'rgba(255,255,255,0.14)', ceil: 0, rim: { c: 'rgba(255,245,230,0.6)', dx: 0, dy: 3 } },
        { type: 'steam', f: 0.1, n: 10, y0: 0.3, y1: 0.7, alpha: 0.35, vents: 3, vy: 0.66 },
        // 橫跨峽谷的吊橋、岩壁上的棧道與崖居
        { type: 'landmarks', f: 0.13, wood: '#6a4a3a', rope: '#5a3a2a', plank: '#8a6448', post: '#4a3020', flag: '#e0604a', dark: '#5a3a36', adobe: '#c8a494', win: '255,190,120', winC: '#ffd890', lantern: '#ff9a5a',
          items: [['bridge', 0.16, 0.3, 1.0], ['scaffold', 0.86, 0.4, 0.9], ['alcove', 0.4, 0.36, 0.8], ['alcove', 0.62, 0.5, 0.6]],
          haze: '220,200,190', hazeA: [0.25, 0.3] },
        { type: 'walls', f: 0.2, top: 0.36, color: '#8e6c66', shade: '#7a5a56', stripe: 'rgba(40,20,20,0.14)', ceil: 0.08, gaps: 2, rim: { c: 'rgba(255,230,210,0.5)', dx: 0, dy: 3 } },
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
        // 岩壁上的熔岩瀑布與遠方的地底鍛造場
        { type: 'landmarks', f: 0.075, rock: '#3a2426', rockShade: '#2c1a1c', glowRgb: '255,120,50', wood: '#4a2e24', win: '255,150,70', lantern: '#ffb060',
          items: [['lavaFall', 0.14, 0.67, 0.9], ['lavaFall', 0.58, 0.67, 1.1], ['scaffold', 0.36, 0.6, 0.8], ['lavaFall', 0.84, 0.67, 0.7]] },
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
        { type: 'skyGlow', f: 0.005, sun: [0.5, 0.32], rgb: '255,140,70', r: 640, a: 0.45, horizon: '255,150,90', horizonY: 0.66, horizonH: 0.14, horizonA: 0.4 },
        { type: 'clouds', f: 0.02, n: 5, y0: 0.05, y1: 0.24, size: [80, 130], color: '#7a3a3a', shade: '#4a2226', alpha: 0.75, lit: '#9a4a40', dark: '#3a1a1e', rim: 'rgba(255,150,90,0.7)', base: 'rgba(255,120,60,0.25)' },
        // 火山後面的遠山與沖天的煙柱
        { type: 'ridges', f: 0.025, fog: '#8a3a2a', fogRgb: '150,60,40', bands: [
          { base: 0.6, amp: 60, color: '#6a2e2a', shade: 'rgba(40,10,10,0.2)', rim: 'rgba(255,140,80,0.7)', mistA: 0.5, sharp: 0.7 },
        ] },
        { type: 'landmarks', f: 0.04, smoke: '#4a2c30', far: '#6a4448', lit: '#d8603a', glowRgb: '255,130,60', items: [['plume', 0.5, 0.31, 1.0]] },
        { type: 'volcano', f: 0.04, x: 0.5, base: 0.72, top: 0.3, w: 560, color: '#5a2c2a', shade: '#44201f', rim: '#ff9a50' },
        { type: 'landmarks', f: 0.08, rock: '#44221f', rockShade: '#341816', glowRgb: '255,120,50', items: [['lavaFall', 0.14, 0.76, 0.7], ['lavaFall', 0.88, 0.76, 0.8]], haze: '120,40,30', hazeA: [0.2, 0.2] },
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

  // 每個主題約 6~9 張 1600×720 的離屏圖；只留最近用過的幾個主題，免得逛完全地圖吃掉上 GB 記憶體
  const layerCache = {};
  const layerLRU = [];
  const LAYER_KEEP = 3;
  function buildLayers(themeId) {
    const hit = layerLRU.indexOf(themeId);
    if (hit >= 0) layerLRU.splice(hit, 1);
    layerLRU.push(themeId);
    while (layerLRU.length > LAYER_KEEP) delete layerCache[layerLRU.shift()];
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
      // 只有動畫貼圖的層（鐘環、齒輪）不用每格貼一張空白大圖
      const empty = L.type === 'clockRings' || L.type === 'gears';
      const crop = empty ? null : cropRows(c);
      return { canvas: crop ? crop.canvas : c, y0: crop ? crop.y0 : 0, f: L.f, anim, empty };
    });
    layerCache[themeId] = out;
    return out;
  }
  // 把整列透明的上下邊裁掉：遠景層多半只佔畫面一部分，每格少貼很多空白像素
  function cropRows(c) {
    let data;
    try {
      data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    } catch (e) {
      return null;
    }
    const W = c.width;
    const rowHas = (y) => {
      for (let x = 3 + y * W * 4, end = (y + 1) * W * 4; x < end; x += 12) if (data[x] > 2) return true;
      return false;
    };
    let y0 = 0;
    while (y0 < c.height && !rowHas(y0)) y0++;
    let y1 = c.height - 1;
    while (y1 > y0 && !rowHas(y1)) y1--;
    if (y0 >= c.height) return null;
    y0 = Math.max(0, y0 - 2);
    y1 = Math.min(c.height - 1, y1 + 2);
    if (y1 - y0 + 1 > c.height * 0.9) return null;
    const out = document.createElement('canvas');
    out.width = W;
    out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(c, 0, -y0);
    return { canvas: out, y0 };
  }
  // 給 bgdetail.js 擴充背景層（遠山、積雲、地標、浮島……）
  A.BG_LAYER = LAYER;

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
      if (!L.empty) for (let x = ox; x < G.W; x += TW) ctx.drawImage(L.canvas, x, oy + (L.y0 || 0));
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
      const cave = map.theme === 'rootCave';
      for (const h of map._hang) {
        if (h.x < x0 || h.x > x1) continue;
        drawVineHang(ctx, h, t, cave);
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
      if (fore && drawForeExtra(ctx, kind, f, y, col, t)) continue;
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
    terrMap = map;
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
        ctx.save();
        ctx.beginPath();
        if (isGround) ctx.rect(left, y, right - left, bodyH);
        else A.roundRect(ctx, left, y, right - left, bodyH, 12);
        ctx.clip();
        terrBody(ctx, P, 'grass', left, right, y, bodyH, isGround, i, Math.max(left, x0), Math.min(right, x1));
        ctx.restore();
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
      terrTop(ctx, P, style, left, right, y, isGround, i, x0, x1);
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
    if (style === 'snow' || style === 'ice' || style === 'marble') return drawColdOrMarble(ctx, P, style, left, right, y, bodyH, isGround, i, x0, x1);
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
    terrBody(ctx, P, style, left, right, y, bodyH, isGround, i, vx0, vx1);
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
      // 麻繩的高光與起毛的纖維
      ctx.strokeStyle = 'rgba(255,236,190,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let y = top + 2; y < bottom; y += 7) {
        const xx = sway(y);
        ctx.moveTo(xx - 1.8, y + 1);
        ctx.lineTo(xx - 0.4, y + 3.5);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(140,100,56,0.8)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let y = top + 10, k = 0; y < bottom; y += 13, k++) {
        const xx = sway(y);
        const s = k % 2 ? 1 : -1;
        ctx.moveTo(xx + s * 3, y);
        ctx.lineTo(xx + s * 5.5, y - 2 + (k % 3));
      }
      ctx.stroke();
      // 末端散開的繩穗
      ctx.strokeStyle = '#c89a5e';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        ctx.moveTo(sway(bottom), bottom);
        ctx.lineTo(sway(bottom) + k * 2.2, bottom + 7 - Math.abs(k));
      }
      ctx.stroke();
    }
    if (style === 'chain') {
      // 鐵鍊的高光
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = top, k = 0; y < bottom; y += 9, k++) {
        if (k % 2) continue;
        const xx = sway(y);
        ctx.moveTo(xx - 3.5, y + 2);
        ctx.quadraticCurveTo(xx - 4, y + 4, xx - 3, y + 6.5);
      }
      ctx.stroke();
    }
    // 頂端的鐵環（繩子穿過木樁）
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x, top + 3, 5, 3.5, 0, 0, PI2);
    ctx.stroke();
    ctx.strokeStyle = '#8a8494';
    ctx.lineWidth = 2;
    ctx.stroke();
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
    } else if (ROPE_EXTRA[style]) {
      ROPE_EXTRA[style](ctx, x, top, bottom, t);
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
        A.ellipse(ctx, x + sd * 9, y, 8, 4, i % 3 === 2 ? '#8ad458' : '#7cc84a', '#5a9e34', { rot: sd * 0.6 + sway, lw: 1.8, hl: false });
        // 葉脈
        const lr = sd * 0.6 + sway;
        ctx.strokeStyle = 'rgba(60,110,40,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + sd * 9 - Math.cos(lr) * 6, y - Math.sin(lr) * 6);
        ctx.lineTo(x + sd * 9 + Math.cos(lr) * 6, y + Math.sin(lr) * 6);
        ctx.stroke();
        // 對側的捲鬚、偶爾一朵小花苞
        if (i % 3 === 1) {
          ctx.strokeStyle = '#5f9e38';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(x - sd * 3, y + 6);
          ctx.quadraticCurveTo(x - sd * 10, y + 6, x - sd * 11, y + 11);
          ctx.arc(x - sd * 8.5, y + 11, 2.5, Math.PI, Math.PI * 2.7);
          ctx.stroke();
        } else if (i % 5 === 3) {
          A.ellipse(ctx, x - sd * 7, y + 8, 2.6, 2.6, i % 2 ? '#ffe36b' : '#ff9fbf', null, { lw: 1.1, hl: false });
        }
      }
      // 藤蔓表皮的細紋
      ctx.strokeStyle = 'rgba(40,80,30,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = top + 6; y < bottom; y += 9) {
        const xx = x + Math.sin(y * 0.07 + t * 0.8) * 2.5;
        ctx.moveTo(xx - 2.5, y);
        ctx.lineTo(xx + 2, y + 3);
      }
      ctx.stroke();
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

  // ════════════════════════════════════════════════════════════
  // 第四章　霜鈴雪峰／終章　時空間神殿
  // 新的背景層、動畫、擺設、垂吊物、大氣、平台與繩索樣式都放在這一段；前面的主題完全不動。
  // ════════════════════════════════════════════════════════════
  Object.assign(THEMES, {
    // ── 第四章　霜鈴雪峰：雪山、風鈴、神社 ──
    snowCamp: {
      sky: ['#6a80b4', '#c2c8e2', '#f8d8bc'],
      layers: [
        { type: 'stack', f: 0.006, of: [
          { type: 'skyGlow', sun: [0.86, 0.48], rgb: '255,190,140', r: 720, a: 0.5, horizon: '255,214,186', horizonY: 0.48, horizonH: 0.14, horizonA: 0.5, cirrus: 6, cirrusRgb: '255,210,196', cirrusA: 0.4, birds: 2, birdColor: 'rgba(70,60,90,0.5)' },
          { type: 'cumulus', n: 4, y0: 0.08, y1: 0.26, size: [40, 70], lit: '#ffe8da', mid: '#f4d6d4', shade: '#c8b8d4', dark: '#a49ac0', rim: 'rgba(255,222,190,0.95)' },
        ] },
        { type: 'peaks', f: 0.03, base: 0.5, w: [380, 560], hgt: [170, 260], gap: [0.45, 0.7], color: '#8e98c0', shade: '#7882ac', snow: '#f2f0f8', snowShade: '#c6c8e2', cap: 0.45, rim: 'rgba(255,236,220,0.8)', mist: '222,222,240', mistH: 90, mistA: 0.92 },
        // 山腰上的鐘樓與古寺
        { type: 'landmarks', f: 0.05, wall: '#8a6a78', wallShade: '#6e5262', roof: '#4a3444', stone: '#8a8498', snow: '#f4f2fa', bell: '#d8b060', win: '255,190,120', winC: '#ffd890', lantern: '#ff9a5a', gold: '#e8b84a',
          items: [['bellTower', 0.3, 0.47, 0.75], ['pagoda', 0.72, 0.48, 0.5, { tiers: 3 }]],
          haze: '222,220,240', hazeA: [0.38, 0.38], rim: { c: 'rgba(255,214,180,0.8)', dx: -2, dy: 2 } },
        { type: 'pines', f: 0.1, base: 0.6, n: 18, size: [56, 96], colors: ['#667c96', '#5c7290'], trunk: '#4a5060', snow: '#eceff8', snowShade: '#bcc4dc', alpha: 0.92, ground: '#e2e4f2', rim: { c: 'rgba(255,210,180,0.6)', dx: -2, dy: 2 } },
        { type: 'village', f: 0.2, base: 0.75, w: [110, 170], hgt: [60, 86], gap: [60, 150], wall: '#9a6446', wallShade: '#7c4c36', roof: '#5a3444', snow: '#f8f8ff', snowShade: '#cfd4ec', win: '#ffd88a', glowRgb: '255,186,110', lantern: '#ee5a3a', ground: '#eef0fa', groundShade: '#d4d8ec' },
        { type: 'pines', f: 0.34, base: 0.97, n: 4, size: [150, 200], colors: ['#3f6468', '#365a60'], trunk: '#5a4034', snow: '#f6f8ff', snowShade: '#c6d0e6' },
      ],
      beams: 0.07,
      motes: 'rgba(255,226,180,0.85)',
      atmo: 'snow',
      snowAmt: 0.55,
      rope: 'bellrope',
      tint: ['rgba(255,190,120,0.03)', 'rgba(255,150,90,0.09)'],
      props: ['lanternPost', 'woodpile', 'snowman', 'windBell', 'snowPine', 'barrel', 'lanternPost'],
      hang: 'bells',
      fore: { kind: 'snow', colors: ['#f6f8ff', '#cdd6ec'] },
      plat: { style: 'snow', top: '#f7f9ff', topHi: '#ffffff', snowShade: '#c6d0ea', body: '#8a6a58', shade: '#6e5446', edge: '#3e2c26', deco: 'snowy', tuft: false },
    },
    snowField: {
      sky: ['#9cbce0', '#dde8f4', '#f7f5f0'],
      layers: [
        { type: 'stack', f: 0.005, of: [
          { type: 'skyGlow', sun: [0.28, 0.04], rgb: '255,255,240', r: 600, a: 0.6, horizon: '240,246,252', horizonY: 0.5, horizonH: 0.14, horizonA: 0.5, cirrus: 6, cirrusA: 0.5, birds: 2, birdColor: 'rgba(70,90,120,0.45)' },
          { type: 'cumulus', n: 4, y0: 0.08, y1: 0.24, size: [42, 72], lit: '#ffffff', mid: '#f6f9fd', shade: '#dbe4f0', dark: '#c2cee2', rim: 'rgba(255,255,255,0.95)' },
        ] },
        { type: 'peaks', f: 0.02, base: 0.52, w: [460, 700], hgt: [220, 320], gap: [0.4, 0.62], color: '#a8b6d4', shade: '#93a3c6', snow: '#f5f8fd', snowShade: '#d0d8ec', cap: 0.5, rim: 'rgba(255,255,255,0.85)', mist: '232,238,248', mistH: 80 },
        // 遠方山稜上的雪之城
        { type: 'landmarks', f: 0.04, wall: '#c8d0e2', wallShade: '#a8b2ca', roof: '#5a6a9e', roofShade: '#48588a', flag: '#d84a4a', frame: '#3a4460', dark: '#46506e', win: '255,220,150', winC: '#ffe6b0',
          items: [['castle', 0.62, 0.5, 0.75]], haze: '230,236,248', hazeA: [0.42, 0.42], rim: { c: 'rgba(255,255,255,0.8)', dx: 2, dy: 2 } },
        { type: 'peaks', f: 0.06, base: 0.63, w: [300, 460], hgt: [120, 200], gap: [0.55, 0.9], color: '#7c90b2', shade: '#687ca0', snow: '#eff4fa', snowShade: '#c0cce2', cap: 0.55, rim: 'rgba(255,255,255,0.75)', mist: '236,241,249', mistH: 60 },
        { type: 'drifts', f: 0.13, base: 0.64, amp: 30, colors: ['#f6f9fd', '#dfe7f2'], shadow: 'rgba(150,175,215,0.35)', sparkle: 34 },
        { type: 'pines', f: 0.22, base: 0.74, n: 9, size: [70, 120], colors: ['#4f7470', '#466a68'], trunk: '#4e4a4e', snow: '#f5f8ff', snowShade: '#c4d0e6', rim: { c: 'rgba(255,255,240,0.6)', dx: 3, dy: 3 } },
      ],
      beams: 0.12,
      motes: 'rgba(255,255,255,0.9)',
      atmo: 'snow',
      snowAmt: 1,
      rope: 'rope',
      props: ['snowPine', 'snowRock', 'frozenShrub', 'cairn', 'snowPine', 'snowRock'],
      hang: 'icicle',
      fore: { kind: 'snow', colors: ['#ffffff', '#d4def0'] },
      plat: { style: 'snow', top: '#f8fbff', topHi: '#ffffff', snowShade: '#c4d2ea', body: '#7e8498', shade: '#666c82', edge: '#2e3040', deco: 'snowy', tuft: false },
    },
    iceFall: {
      sky: ['#1c3052', '#3a6890', '#8cc6e0'],
      layers: [
        { type: 'stack', f: 0.004, of: [
          { type: 'stars', n: 160, colors: ['#ffffff', '#cfefff'], cons: 0, line: 'rgba(0,0,0,0)' },
          { type: 'aurora', bands: [[0.1, 18, '110,255,200', 0.45], [0.16, 24, '140,170,255', 0.32], [0.07, 12, '200,140,255', 0.2]], hgt: 0.16 },
        ] },
        { type: 'peaks', f: 0.03, base: 0.44, w: [360, 520], hgt: [160, 240], gap: [0.5, 0.8], color: '#3e5a82', shade: '#344e74', snow: '#bcd8f0', snowShade: '#86a6cc', cap: 0.5, rim: 'rgba(200,240,255,0.6)', mist: '120,170,210', mistH: 60, mistA: 0.7 },
        { type: 'icefall', f: 0.1, top: 0.14, base: 0.82, color: '#4c6a8e', shade: '#3a5678', falls: [[0.17, 110], [0.5, 170], [0.83, 96]], ice: ['#f2fcff', '#a8e2f6', '#5eaad4'], snow: '#eaf6ff', glowRgb: '140,220,255' },
        { type: 'crystals', f: 0.26, base: 0.85, n: 6, size: [70, 130], colors: ['#e4faff', '#94d8f0', '#4e98c8'], glowRgb: '130,220,255' },
      ],
      beams: 0.06,
      motes: 'rgba(190,240,255,0.9)',
      atmo: 'snow',
      snowAmt: 0.4,
      dark: 0.08,
      rope: 'chain',
      tint: ['rgba(80,160,220,0.04)', 'rgba(20,40,90,0.1)'],
      props: ['iceCrystal', 'icicleRock', 'snowRock', 'frozenShrub', 'iceCrystal'],
      hang: 'icicle',
      fore: { kind: 'snow', colors: ['#e6f4fd', '#a6c8e4'] },
      plat: { style: 'ice', top: '#eef8ff', topHi: '#ffffff', snowShade: '#a8d0ec', body: '#6cb0da', shade: '#4a88bc', edge: '#1c3858', deco: 'frost', tuft: false },
    },
    bellShrine: {
      sky: ['#3a3268', '#b46e90', '#ffc48a'],
      layers: [
        { type: 'sun', f: 0.02, x: 0.62, y: 0.36, r: 44, color: '#ffe4b4', glow: 'rgba(255,170,120,0.5)' },
        { type: 'stack', f: 0.02, of: [
          { type: 'skyGlow', sun: [0.62, 0.36], rgb: '255,180,140', r: 640, a: 0.4, horizon: '255,196,170', horizonY: 0.54, horizonH: 0.14, horizonA: 0.4, cirrus: 7, cirrusRgb: '255,200,190', cirrusA: 0.4, birds: 2, birdColor: 'rgba(60,40,80,0.55)' },
          { type: 'shafts', x: 0.62, y: 0.36, n: 14, rgb: '255,210,170', a: 0.13, angle: -1.57, spread: 2.8, len: 0.7, w: 0.025 },
          { type: 'cumulus', n: 4, y0: 0.08, y1: 0.24, size: [44, 74], lit: '#ffd2b8', mid: '#f0b8b8', shade: '#a888b0', dark: '#7a6a98', rim: 'rgba(255,214,170,0.95)' },
        ] },
        { type: 'peaks', f: 0.04, base: 0.6, w: [340, 520], hgt: [150, 240], gap: [0.45, 0.75], color: '#6a5888', shade: '#564672', snow: '#f4ccd2', snowShade: '#a08ab8', cap: 0.46, rim: 'rgba(255,210,180,0.85)', mist: '214,160,176', mistH: 70, mistA: 0.9 },
        // 參道盡頭山上的寺院與鐘樓
        { type: 'landmarks', f: 0.07, wall: '#7a4a5e', wallShade: '#62384c', roof: '#3a2438', stone: '#6a5a72', snow: '#f4dce4', bell: '#e0b060', win: '255,190,120', winC: '#ffd890', lantern: '#ff8a5a', gold: '#f2c75a',
          items: [['pagoda', 0.2, 0.6, 0.62, { tiers: 5 }], ['bellTower', 0.52, 0.6, 0.6], ['pagoda', 0.82, 0.6, 0.45, { tiers: 3 }]],
          haze: '190,140,176', hazeA: [0.35, 0.35], rim: { c: 'rgba(255,200,170,0.85)', dx: -2, dy: 2 } },
        { type: 'torii', f: 0.12, base: 0.68, s: 0.55, n: 5, color: '#6a3456', shade: '#582a48', cap: '#34203a', snow: '#e4c4d4', bell: '#b8905e', bellShade: '#8a6a48', cord: '#7a3a50', rows: 2, alpha: 0.9 },
        { type: 'torii', f: 0.28, base: 0.84, s: 1.12, n: 3, color: '#d8452e', shade: '#a83222', cap: '#2a1e2a', snow: '#fbf4f6', bell: '#f2c75a', bellShade: '#b8862a', cord: '#c8302a', rows: 3, lanterns: true, ground: '#6a5a6e', groundHi: '#f2e8f0' },
      ],
      beams: 0.14,
      motes: 'rgba(255,220,170,0.9)',
      atmo: 'snow',
      snowAmt: 0.35,
      rope: 'bellrope',
      tint: ['rgba(255,150,120,0.04)', 'rgba(90,50,120,0.1)'],
      props: ['snowLantern', 'bellPost', 'snowRock', 'shrineBox', 'snowLantern', 'bellPost'],
      hang: 'bells',
      fore: { kind: 'snow', colors: ['#f8eef4', '#d2bcd6'] },
      plat: { style: 'snow', top: '#fbf5f8', topHi: '#ffffff', snowShade: '#d6c0da', body: '#7a6070', shade: '#624a5a', edge: '#2e2030', deco: 'snowy', tuft: false },
    },
    frostAltar: {
      sky: ['#0a1030', '#20366a', '#6484b4'],
      layers: [
        { type: 'stack', f: 0.004, of: [
          { type: 'stars', n: 240, colors: ['#ffffff', '#cfe4ff', '#e8f0ff'], cons: 2, line: 'rgba(170,200,255,0.35)' },
          { type: 'aurora', bands: [[0.16, 22, '110,255,210', 0.3], [0.24, 28, '120,160,255', 0.22], [0.12, 14, '190,140,255', 0.14]], hgt: 0.18 },
        ] },
        { type: 'moon', f: 0.01, x: 0.26, y: 0.2, r: 64, color: '#eef6ff', spot: 'rgba(150,180,225,0.35)', limb: 'rgba(120,150,210,0.5)', glowRgb: '170,210,255', glowA: 0.45 },
        { type: 'peaks', f: 0.03, base: 0.56, w: [380, 560], hgt: [180, 280], gap: [0.45, 0.7], color: '#223258', shade: '#1a2848', snow: '#8ea6d0', snowShade: '#56709e', cap: 0.5, rim: 'rgba(200,225,255,0.75)', mist: '60,84,130', mistH: 60, mistA: 0.8 },
        { type: 'altar', f: 0.08, x: 0.42, base: 0.8, s: 1, stone: '#6f8cb4', stoneShade: '#56729c', top: '#dff0ff', snow: '#f0f8ff', ice: ['#f4fdff', '#9adcf4', '#4a98cc'], glowRgb: '130,210,255', ground: '#3a5480', groundShade: '#2a3e66' },
        { type: 'crystals', f: 0.22, base: 0.94, n: 5, size: [80, 140], colors: ['#dcf6ff', '#86c8ec', '#3e7cb4'], glowRgb: '120,200,255' },
      ],
      beams: 0.05,
      motes: 'rgba(200,235,255,0.9)',
      atmo: 'blizzard',
      dark: 0.16,
      rope: 'chain',
      tint: ['rgba(120,180,255,0.04)', 'rgba(10,20,60,0.14)'],
      props: ['iceShard', 'snowRock', 'iceCrystal', 'iceShard', 'icicleRock'],
      hang: 'icicle',
      fore: { kind: 'snow', colors: ['#dceaf8', '#8aa6cc'] },
      plat: { style: 'ice', top: '#e6f2ff', topHi: '#ffffff', snowShade: '#98b8dc', body: '#5a88bc', shade: '#44709e', edge: '#142646', deco: 'frost', tuft: false },
    },

    // ── 終章　時空間神殿：雲海上的大理石與金、星空、時鐘 ──
    templeCourt: {
      sky: ['#7cb0e6', '#f6e6c8', '#ffd896'],
      layers: [
        { type: 'stack', f: 0.004, of: [
          { type: 'skyGlow', sun: [0.44, 0.3], rgb: '255,236,190', r: 700, a: 0.45, horizon: '255,236,206', horizonY: 0.58, horizonH: 0.14, horizonA: 0.45, cirrus: 6, cirrusRgb: '255,246,230', cirrusA: 0.45, birds: 2, birdColor: 'rgba(120,100,90,0.45)' },
          { type: 'shafts', x: 0.44, y: 0.3, n: 16, rgb: '255,236,180', a: 0.12, angle: -1.57, spread: 3.1, len: 0.9, w: 0.03 },
        ] },
        { type: 'clockRings', f: 0.01, rings: [[0.42, 0.3, 240, 0.02], [0.42, 0.3, 150, -0.035], [0.86, 0.17, 110, 0.05]], color: '#fff0c0', alpha: 0.4 },
        { type: 'clouds', f: 0.02, n: 5, y0: 0.1, y1: 0.34, size: [60, 100], color: '#fff8ec', shade: '#f0d8c0', alpha: 0.85 },
        // 雲海上漂著的浮島：瀑布、小樹、殘柱、金色紋路
        { type: 'floatIsles', f: 0.03, items: [[0.08, 0.3, 0.6], [0.24, 0.16, 0.35], [0.72, 0.24, 0.5], [0.92, 0.42, 0.42]], rock: '#d4c0b2', rockShade: '#b49c8c', grass: '#a8d08a', grassHi: '#cae8a8', fall: 'rgba(240,250,255,0.9)', tree: ['#8cc47a', '#9ad08a'], trunk: '#8a6a58', pillar: '#fbf7ef', gold: 'rgba(232,184,74,0.8)', glowRgb: '255,220,150',
          haze: '255,240,222', hazeA: [0.35, 0.3], rim: { c: 'rgba(255,248,220,0.8)', dx: 2, dy: 2 } },
        { type: 'temple', f: 0.05, x: 0.44, base: 0.52, s: 0.85, isles: 5, rock: '#c8b4a4', rockShade: '#a08878', marble: '#fbf7ef', marbleShade: '#ddd2c2', inner: '#b8a894', gold: '#e8b84a', top: '#f4ecdc', glowRgb: '255,220,150', glowA: 0.28 },
        { type: 'cloudSea', f: 0.08, base: 0.64, r: 46, colors: ['#fff6e6', '#f6dcc0'], shade: '#ecccb0', hi: '#ffffff', rows: 3 },
        { type: 'balustrade', f: 0.22, base: 0.7, s: 1, marble: '#f8f3ea', shade: '#dcd0bf', wall: '#e8dccb', gold: '#e2b04a', step: 260, glowRgb: '255,210,130' },
      ],
      beams: 0.2,
      motes: 'rgba(255,236,170,0.9)',
      atmo: 'timeDust',
      rope: 'goldchain',
      props: ['urn', 'brazier', 'topiary', 'hourglassSmall', 'urn', 'topiary'],
      hang: 'tassel',
      fore: { kind: 'cloud', colors: ['rgba(255,250,240,0.9)', 'rgba(250,226,200,0.9)'] },
      plat: { style: 'marble', top: '#fbf7ee', topHi: '#ffffff', body: '#e8dfd0', shade: '#cfc2ae', edge: '#6e5a44', gold: '#e2b04a', deco: 'goldLeaf', tuft: false },
    },
    timeCorridor: {
      sky: ['#8a82c0', '#e8d4e6', '#ffe4c2'],
      layers: [
        { type: 'skyGlow', f: 0.004, sun: [0.5, 0.2], rgb: '255,236,210', r: 700, a: 0.45, horizon: '255,230,220', horizonY: 0.62, horizonH: 0.14, horizonA: 0.4, cirrus: 7, cirrusRgb: '255,240,246', cirrusA: 0.45 },
        { type: 'floatIsles', f: 0.02, items: [[0.05, 0.22, 0.3], [0.34, 0.14, 0.26], [0.58, 0.6, 0.32], [0.86, 0.18, 0.34]], rock: '#c4b4c8', rockShade: '#a898b0', grass: '#b8d8a8', fall: 'rgba(250,246,255,0.85)', tree: ['#a8cc98'], trunk: '#8a7478', pillar: '#f4eef0', gold: 'rgba(224,174,74,0.8)',
          haze: '240,226,240', hazeA: [0.45, 0.45] },
        { type: 'clockRings', f: 0.01, rings: [[0.25, 0.24, 170, -0.02], [0.72, 0.32, 250, 0.014]], color: '#fff4dc', alpha: 0.28 },
        { type: 'cloudSea', f: 0.03, base: 0.7, r: 40, colors: ['#f6ecf4', '#e2cce2'], shade: '#d4bcd8', hi: '#ffffff', rows: 2 },
        { type: 'fragments', f: 0.06, kinds: ['forest', 'sea', 'canyon', 'snow', 'mush'], w: [150, 200], y0: 0.3, y1: 0.5, shards: 16 },
        { type: 'arches', f: 0.2, top: 0.1, spring: 0.5, aw: 246, n: 5, marble: '#e2d6e2', shade: '#b4a2bc', dark: '#8a7894', gold: '#e0ae4a', glowRgb: '255,210,140' },
      ],
      beams: 0.16,
      motes: 'rgba(255,240,200,0.9)',
      atmo: 'timeDust',
      rope: 'goldchain',
      tint: ['rgba(255,220,160,0.05)', 'rgba(140,100,160,0.08)'],
      props: ['brokenColumn', 'urn', 'floatShard', 'brokenColumn', 'hourglassSmall'],
      hang: 'tassel',
      fore: { kind: 'cloud', colors: ['rgba(250,244,250,0.9)', 'rgba(230,212,236,0.9)'] },
      plat: { style: 'marble', top: '#f6f0e8', topHi: '#ffffff', body: '#ded2c6', shade: '#c4b4a6', edge: '#5e4c44', gold: '#dcaa48', deco: 'goldLeaf', tuft: false },
    },
    reverseGarden: {
      sky: ['#ffd4e4', '#f2e8ff', '#a6d6f4'],
      layers: [
        { type: 'skyGlow', f: 0.004, sun: [0.45, 0.6], rgb: '255,236,246', r: 700, a: 0.5, cirrus: 6, cirrusRgb: '255,255,255', cirrusA: 0.5, cirrusY: [0.4, 0.62] },
        // 倒掛的浮島：草皮朝下、岩尖朝上，瀑布往上流
        { type: 'floatIsles', f: 0.02, flip: true, items: [[0.12, 0.3, 0.7], [0.36, 0.4, 0.45], [0.66, 0.32, 0.6], [0.9, 0.44, 0.4]], rock: '#d8b8d4', rockShade: '#bc9cc0', grass: '#a8d890', fall: 'rgba(255,250,255,0.85)', tree: ['#f4b8d0', '#f8cadc'], trunk: '#9a7a8e', gold: 'rgba(232,184,74,0.8)',
          haze: '248,230,244', hazeA: [0.25, 0.25], rim: { c: 'rgba(255,255,255,0.7)', dx: 2, dy: -2 } },
        { type: 'flip', f: 0.03, of: { type: 'hills', color: '#d0a4cc', base: 0.85, amp: 26, low: '#b886b4', path: false } },
        { type: 'flip', f: 0.05, of: { type: 'trees', colors: ['#f4b8d0', '#eaa4c6', '#f8cadc'], trunk: '#9a7a8e', base: 0.84, n: 9, size: [60, 96], alpha: 0.9 } },
        { type: 'hourglass', f: 0.08, x: 0.45, base: 0.78, s: 0.95, gold: '#e8b84a', goldShade: '#b8862a', sand: '#f4d08a', glowRgb: '255,220,170' },
        { type: 'cloudSea', f: 0.1, base: 0.8, r: 40, colors: ['#ffffff', '#e2f0fa'], shade: '#cfe0f0', hi: '#ffffff', rows: 2 },
        { type: 'trees', f: 0.24, colors: ['#f6b4ca', '#f0a0bc', '#fac6d6'], trunk: '#8a6070', base: 0.94, n: 5, size: [100, 150], light: '#fff4fa', deep: '#7a3a5a', rim: { c: 'rgba(255,250,255,0.7)', dx: 3, dy: 3 } },
      ],
      beams: 0.14,
      motes: 'rgba(255,220,240,0.9)',
      atmo: 'petalsUp',
      rope: 'vine',
      props: ['blossomBush', 'topiary', 'hourglassSmall', 'blossomBush', 'urn'],
      hang: 'blossom',
      fore: { kind: 'grass', colors: ['#8cc878', '#a8d890'] },
      plat: { style: 'marble', top: '#f4f8ee', topHi: '#ffffff', body: '#e6e0d6', shade: '#ccc4b6', edge: '#5e5448', gold: '#e8b84a', deco: 'petals', tuft: '#8cc878' },
    },
    starStair: {
      sky: ['#05061a', '#15163e', '#382866'],
      layers: [
        { type: 'stars', f: 0.01, n: 380, colors: ['#ffffff', '#cfe0ff', '#ffe8c0', '#e0c8ff'], cons: 4, line: 'rgba(170,200,255,0.4)' },
        { type: 'nebula', f: 0.015, n: 5, colors: ['120,80,210', '60,120,230', '230,90,170'], y0: 0.12, y1: 0.62 },
        { type: 'milkyWay', f: 0.012, y0: 0.72, y1: 0.08, n: 1100, colors: ['150,120,255', '90,140,255', '255,140,200'] },
        { type: 'landmarks', f: 0.016, items: [['planet', 0.16, 0.18, 0.55, { lit: '#ffd0b0', body: '#c0708a', dark: '#3a2458', ring: 'rgba(255,220,240,0.6)', glowRgb: '255,160,200' }], ['planet', 0.56, 0.1, 0.22, { lit: '#c8f0ff', body: '#5a90c8', dark: '#1a2a58', ring: 'rgba(200,230,255,0.5)', glowRgb: '140,200,255' }]] },
        { type: 'moon', f: 0.02, x: 0.8, y: 0.22, r: 40, color: '#cdbcff', spot: 'rgba(120,90,200,0.3)', limb: 'rgba(60,40,140,0.6)', glowRgb: '170,140,255', glowA: 0.35, ring: 'rgba(235,215,255,0.7)' },
        { type: 'stairs', f: 0.06, spirals: [[0.36, 0.9, 200, 34, 1], [0.08, 0.7, 90, 14, 0.5]], top: '#dfe4ff', front: '#6e6aa8', glow: 'rgba(150,220,255,0.9)', glowRgb: '150,210,255' },
        { type: 'slabs', f: 0.14, n: 7, y0: 0.3, y1: 0.7, alpha: 0.6, top: '#8e8cc4', front: '#46427a', rock: '#2c2a58', glowRgb: '140,200,255' },
      ],
      beams: 0,
      motes: 'rgba(200,220,255,0.9)',
      atmo: 'starfall',
      dark: 0.08,
      rope: 'goldchain',
      props: ['starCrystal', 'floatShard', 'brokenColumn', 'starCrystal'],
      hang: 'starcharm',
      fore: { kind: 'cloud', colors: ['rgba(120,110,200,0.55)', 'rgba(80,70,160,0.55)'] },
      plat: { style: 'marble', top: '#dadef6', topHi: '#ffffff', body: '#5c5a94', shade: '#48467c', edge: '#161434', gold: '#9ae0ff', deco: 'stardust', tuft: false, glow: true },
    },
    timeThrone: {
      sky: ['#05040e', '#150f2e', '#3c2254'],
      layers: [
        { type: 'stars', f: 0.01, n: 260, colors: ['#ffffff', '#e0d0ff', '#ffe0c0'], cons: 2, line: 'rgba(220,190,255,0.3)' },
        { type: 'nebula', f: 0.012, n: 4, colors: ['140,60,210', '230,120,90', '90,70,210'], y0: 0.1, y1: 0.7 },
        { type: 'milkyWay', f: 0.011, y0: 0.1, y1: 0.66, n: 800, colors: ['170,90,230', '240,140,110', '110,90,230'], lane: 'rgba(8,4,20,0.4)' },
        { type: 'gears', f: 0.02, list: [[0.18, 0.28, 130, 0.05], [0.7, 0.2, 160, -0.04], [0.82, 0.55, 96, 0.07], [0.1, 0.62, 84, -0.06]], color: '#4e3e62', shade: '#3a2c4e', hi: '#8a70a8', alpha: 0.6 },
        { type: 'clockFace', f: 0.03, x: 0.43, y: 0.4, r: 250, rim: ['#f4d27a', '#a8742e'], face: ['#2a2468', '#110e30'], num: '#f4dc9a', hand: '#f6d680', crack: 'rgba(255,220,140,0.8)', glowRgb: '200,150,255' },
        { type: 'throne', f: 0.08, x: 0.43, base: 0.8, s: 0.9, stone: '#4a4060', stoneShade: '#382e4c', gold: '#e8b84a', floor: '#2a2240', glowRgb: '190,140,255' },
        { type: 'lions', f: 0.16, base: 0.81, list: [[0.06, 1, 0.72], [0.23, 1, 0.82], [0.66, -1, 0.82], [0.83, -1, 0.72]], stone: '#a09aa8', shade: '#7a7388', dark: '#4e4a5a', gold: '#e8b84a', crack: 'rgba(255,210,120,0.7)' },
      ],
      beams: 0,
      motes: 'rgba(230,200,255,0.9)',
      atmo: 'timeDust',
      dark: 0.16,
      rope: 'goldchain',
      tint: ['rgba(160,100,255,0.04)', 'rgba(40,10,60,0.14)'],
      props: ['brokenColumn', 'floatShard', 'brazier', 'gearProp', 'floatShard'],
      hang: 'tassel',
      fore: { kind: 'cloud', colors: ['rgba(110,80,160,0.55)', 'rgba(70,50,120,0.55)'] },
      plat: { style: 'marble', top: '#cfc8e0', topHi: '#f4f0ff', body: '#4c4262', shade: '#3a3250', edge: '#120e20', gold: '#e8b84a', deco: 'stardust', tuft: false },
    },
  });

  // ── 共用小工具 ──
  const glowCache = {};
  // 預先畫好的柔光圓（動畫裡只貼圖，不每格建漸層）
  function glowSprite(rgb) {
    if (glowCache[rgb]) return glowCache[rgb];
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(' + rgb + ',1)');
    g.addColorStop(0.35, 'rgba(' + rgb + ',0.42)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    glowCache[rgb] = c;
    return c;
  }
  function softGlow(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, PI2);
    ctx.fill();
  }
  function newCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w);
    c.height = Math.ceil(h);
    return c;
  }
  // 遠景用的小鈴鐺：圓頂＋外翻的口＋一點高光
  function tinyBell(ctx, x, y, s, fill, shade) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.8);
    ctx.quadraticCurveTo(x - s * 0.95, y - s, x, y - s);
    ctx.quadraticCurveTo(x + s * 0.95, y - s, x + s, y + s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade;
    ctx.fillRect(x - s * 1.1, y + s * 0.6, s * 2.2, s * 0.45);
    if (s > 1.6) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(x - s * 0.55, y - s * 0.45, s * 0.35, s * 0.6);
    }
  }
  function quadAt(p0, c, p1, u) {
    const a = (1 - u) * (1 - u);
    const b = 2 * u * (1 - u);
    const d = u * u;
    return [a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]];
  }
  const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  // ── 雪山 ──
  function drawPeak(ctx, L, ax, base, w, hg, seed) {
    const r = U.seeded(seed);
    const top = base - hg;
    const left = [];
    const right = [];
    for (let k = 1; k < 6; k++) {
      const u = k / 6;
      left.push([ax - (w / 2) * u + (r() - 0.5) * w * 0.07, top + hg * u + (r() - 0.5) * hg * 0.1]);
      right.push([ax + (w / 2) * u + (r() - 0.5) * w * 0.07, top + hg * u + (r() - 0.5) * hg * 0.1]);
    }
    const foot = base + 60;
    const path = (c) => {
      c.moveTo(ax - w / 2 - 30, foot);
      for (let k = left.length - 1; k >= 0; k--) c.lineTo(left[k][0], left[k][1]);
      c.lineTo(ax, top);
      for (const p of right) c.lineTo(p[0], p[1]);
      c.lineTo(ax + w / 2 + 30, foot);
      c.closePath();
    };
    const rx1 = ax + (r() - 0.3) * w * 0.12;
    const rx2 = ax + (r() - 0.2) * w * 0.14;
    const ridge = (c) => {
      c.moveTo(ax, top - 2);
      c.lineTo(rx1, top + hg * 0.35);
      c.lineTo(rx2 - w * 0.04, top + hg * 0.7);
      c.lineTo(ax + w * 0.12, foot);
      c.lineTo(ax + w, foot);
      c.lineTo(ax + w, top - 30);
      c.closePath();
    };
    const capY = hg * (L.cap || 0.4);
    const zig = [];
    for (let k = 0; k <= 14; k++) {
      const u = k / 14;
      const x = ax + w * 0.6 - u * w * 1.2;
      const d = Math.abs(x - ax) / (w / 2);
      zig.push([x, top + capY * (1 + d * 0.55) + (k % 2 ? hg * 0.12 * r() : -hg * 0.05 * r())]);
    }
    const cap = (c) => {
      c.moveTo(ax - w, top - 30);
      c.lineTo(ax + w, top - 30);
      for (const p of zig) c.lineTo(p[0], p[1]);
      c.closePath();
    };
    ctx.fillStyle = L.color;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.fillStyle = L.shade;
    ctx.beginPath();
    ridge(ctx);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const gx = ax + (r() - 0.5) * w * 0.7;
      const gy = top + hg * (0.4 + r() * 0.25);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + (gx - ax) * 0.15, gy + 40 + r() * 60);
      ctx.stroke();
    }
    if (L.snow) {
      ctx.fillStyle = L.snow;
      ctx.beginPath();
      cap(ctx);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      cap(ctx);
      ctx.clip();
      ctx.fillStyle = L.snowShade;
      ctx.beginPath();
      ridge(ctx);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (L.rim) {
      ctx.strokeStyle = L.rim;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, top);
      for (let k = 0; k < 3; k++) ctx.lineTo(left[k][0] + 1, left[k][1] + 1);
      ctx.stroke();
    }
  }

  // ── 雪松（遠景，不描邊） ──
  function drawPine(ctx, L, x, y, s, col) {
    ctx.fillStyle = L.trunk;
    ctx.fillRect(x - s * 0.045, y - s * 0.3, s * 0.09, s * 0.3 + 80);
    const tiers = L.tiers || 4;
    for (let k = 0; k < tiers; k++) {
      const hw = s * 0.34 * (1 - k * 0.19);
      const by = y - s * 0.14 - k * s * 0.2;
      const ty = by - s * 0.32;
      const tier = (c) => {
        c.moveTo(x, ty);
        c.quadraticCurveTo(x - hw * 0.45, ty + (by - ty) * 0.55, x - hw, by);
        c.quadraticCurveTo(x - hw * 0.3, by - s * 0.05, x, by - s * 0.02);
        c.quadraticCurveTo(x + hw * 0.3, by - s * 0.05, x + hw, by);
        c.quadraticCurveTo(x + hw * 0.45, ty + (by - ty) * 0.55, x, ty);
        c.closePath();
      };
      ctx.fillStyle = col;
      ctx.beginPath();
      tier(ctx);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      tier(ctx);
      ctx.clip();
      ctx.fillStyle = 'rgba(20,30,60,0.2)';
      ctx.fillRect(x + s * 0.02, ty - 2, hw + 4, by - ty + 6);
      if (L.snow) {
        const sy = (u) => by - (by - ty) * (0.2 + u * 0.32);
        const g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
        g.addColorStop(0, L.snow);
        g.addColorStop(0.5, L.snow);
        g.addColorStop(0.58, L.snowShade);
        g.addColorStop(1, L.snowShade);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - hw - 6, by + 4);
        const m = 5;
        for (let j = 0; j <= m; j++) {
          const u = j / m;
          const px = x - hw + u * hw * 2;
          ctx.quadraticCurveTo(px - hw / m, sy(u) + (by - ty) * 0.22, px, sy(u));
        }
        ctx.lineTo(x + hw + 6, ty - 6);
        ctx.lineTo(x - hw - 6, ty - 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── 雪村的小木屋 ──
  function drawCabin(ctx, L, x, base, w, hg, r, glows, smoke) {
    const l = x - w / 2;
    const rt = x + w / 2;
    const top = base - hg;
    const roofH = w * 0.4;
    // 山牆
    ctx.fillStyle = L.wall;
    ctx.beginPath();
    ctx.moveTo(l, base + 10);
    ctx.lineTo(l, top);
    ctx.lineTo(x, top - roofH + 8);
    ctx.lineTo(rt, top);
    ctx.lineTo(rt, base + 10);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = L.wallShade;
    ctx.fillRect(x + w * 0.2, top - roofH, w, hg + roofH + 20);
    ctx.strokeStyle = 'rgba(40,20,10,0.28)';
    ctx.lineWidth = 1.5;
    for (let y = top - roofH + 14; y < base + 10; y += 9) {
      ctx.beginPath();
      ctx.moveTo(l, y);
      ctx.lineTo(rt, y);
      ctx.stroke();
    }
    ctx.restore();
    // 木頭的切口
    ctx.fillStyle = 'rgba(230,190,140,0.55)';
    for (let y = top + 4; y < base; y += 9) {
      ctx.beginPath();
      ctx.arc(l + 2, y, 3, 0, PI2);
      ctx.arc(rt - 2, y, 3, 0, PI2);
      ctx.fill();
    }
    // 窗
    const nw = w > 130 ? 2 : 1;
    for (let k = 0; k < nw; k++) {
      const wx = nw === 1 ? x - w * 0.18 : l + w * (0.26 + k * 0.42);
      const wy = top + hg * 0.26;
      const ws = 17;
      softGlow(ctx, wx, wy + ws / 2, 52, L.glowRgb, 0.4);
      ctx.fillStyle = '#3a2418';
      ctx.fillRect(wx - ws / 2 - 3, wy - 3, ws + 6, ws + 6);
      ctx.fillStyle = L.win;
      ctx.fillRect(wx - ws / 2, wy, ws, ws);
      ctx.fillStyle = 'rgba(255,250,220,0.8)';
      ctx.fillRect(wx - ws / 2, wy, ws, ws * 0.35);
      ctx.fillStyle = '#3a2418';
      ctx.fillRect(wx - 1, wy, 2, ws);
      ctx.fillRect(wx - ws / 2, wy + ws / 2 - 1, ws, 2);
      ctx.fillStyle = L.snow;
      ctx.beginPath();
      A.roundRect(ctx, wx - ws / 2 - 5, wy + ws + 2, ws + 10, 5, 2.5);
      ctx.fill();
      glows.push({ x: wx, y: wy + ws / 2, r: 36, p: r() });
    }
    // 門：半開，漏出暖光
    if (nw === 1 || w > 150) {
      const dx = nw === 1 ? x + w * 0.2 : x;
      ctx.fillStyle = '#4a2c1e';
      ctx.fillRect(dx - 12, base - 38, 24, 40);
      ctx.fillStyle = L.win;
      ctx.fillRect(dx - 12, base - 36, 6, 38);
      softGlow(ctx, dx - 9, base - 10, 30, L.glowRgb, 0.35);
    }
    // 屋頂（兩片斜板）
    const ext = 16;
    const yL = top + 8;
    ctx.fillStyle = L.roof;
    ctx.beginPath();
    ctx.moveTo(l - ext, yL);
    ctx.lineTo(x, top - roofH);
    ctx.lineTo(rt + ext, yL);
    ctx.lineTo(rt + ext, yL + 9);
    ctx.lineTo(x, top - roofH + 11);
    ctx.lineTo(l - ext, yL + 9);
    ctx.closePath();
    ctx.fill();
    // 煙囪
    const cx = x + w * 0.24;
    const roofY = (px) => yL - (1 - Math.abs(px - x) / (w / 2 + ext)) * (yL - (top - roofH));
    const cTop = roofY(cx) - 26;
    ctx.fillStyle = '#5a4e52';
    ctx.fillRect(cx - 7, cTop, 14, roofY(cx) - cTop + 6);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(cx + 2, cTop, 5, roofY(cx) - cTop + 6);
    smoke.push({ x: cx, y: cTop - 6, p: r(), r: 9, rise: 110, drift: 30 });
    // 屋頂上的厚雪：下緣圓圓地垂出屋簷
    const sn = (c) => {
      c.moveTo(l - ext - 6, yL + 4);
      c.quadraticCurveTo(l - ext - 8, yL - 6, l - ext + 4, yL - 7);
      c.lineTo(x, top - roofH - 12);
      c.lineTo(rt + ext - 4, yL - 7);
      c.quadraticCurveTo(rt + ext + 8, yL - 6, rt + ext + 6, yL + 4);
      const n = 7;
      for (let k = 0; k <= n; k++) {
        const u = k / n;
        const px = rt + ext - u * (rt - l + ext * 2);
        const py = roofY(px) + 2 + (k % 2 ? 5 : 1);
        c.lineTo(px, py);
      }
      c.closePath();
    };
    ctx.fillStyle = L.snow;
    ctx.beginPath();
    sn(ctx);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    sn(ctx);
    ctx.clip();
    ctx.fillStyle = L.snowShade;
    ctx.beginPath();
    ctx.moveTo(x, top - roofH - 20);
    ctx.lineTo(rt + ext + 10, yL - 10);
    ctx.lineTo(rt + ext + 10, yL + 20);
    ctx.lineTo(x + 4, top - roofH + 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 煙囪帽上的雪
    ctx.fillStyle = L.snow;
    ctx.beginPath();
    A.roundRect(ctx, cx - 9, cTop - 5, 18, 7, 3.5);
    ctx.fill();
    // 屋簷下的冰柱
    ctx.fillStyle = 'rgba(220,240,255,0.9)';
    for (let px = l - ext + 6; px < rt + ext - 4; px += 9) {
      if (Math.abs(px - x) < w * 0.3) continue;
      const py = roofY(px) + 9;
      const len = 5 + hash(px) * 10;
      ctx.beginPath();
      ctx.moveTo(px - 2, py);
      ctx.lineTo(px + 2, py);
      ctx.lineTo(px, py + len);
      ctx.fill();
    }
    // 腳邊的積雪
    ctx.fillStyle = L.snow;
    ctx.beginPath();
    ctx.ellipse(l + 6, base + 6, 18, 8, 0, 0, PI2);
    ctx.ellipse(rt - 4, base + 6, 22, 9, 0, 0, PI2);
    ctx.fill();
  }

  // ── 冰晶簇 ──
  function drawCrystal(ctx, x, y, w, hgt, rot, cols) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const path = (c) => {
      c.moveTo(-w / 2, 20);
      c.lineTo(-w / 2, -hgt * 0.72);
      c.lineTo(0, -hgt);
      c.lineTo(w / 2, -hgt * 0.72);
      c.lineTo(w / 2, 20);
      c.closePath();
    };
    ctx.fillStyle = cols[1];
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.fillStyle = cols[0];
    ctx.beginPath();
    ctx.moveTo(-w / 2, 20);
    ctx.lineTo(-w / 2, -hgt * 0.72);
    ctx.lineTo(0, -hgt);
    ctx.lineTo(-w * 0.08, -hgt * 0.7);
    ctx.lineTo(-w * 0.08, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cols[2];
    ctx.beginPath();
    ctx.moveTo(w * 0.22, 20);
    ctx.lineTo(w * 0.22, -hgt * 0.68);
    ctx.lineTo(0, -hgt);
    ctx.lineTo(w / 2, -hgt * 0.72);
    ctx.lineTo(w / 2, 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.32, -hgt * 0.1);
    ctx.lineTo(-w * 0.32, -hgt * 0.62);
    ctx.stroke();
    ctx.restore();
  }

  // ── 鳥居 ──
  function drawTorii(ctx, L, x, base, s, glints) {
    const ph = 150 * s;
    const sp = 96 * s;
    const pw = 13 * s;
    // 柱
    for (const side of [-1, 1]) {
      const px = x + side * sp;
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(px - pw / 2 - s, base + 4);
      ctx.lineTo(px - pw / 2 + s, base - ph);
      ctx.lineTo(px + pw / 2 - s, base - ph);
      ctx.lineTo(px + pw / 2 + s, base + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = L.shade;
      ctx.fillRect(px + pw * 0.12, base - ph, pw * 0.38, ph + 4);
      ctx.fillStyle = L.cap;
      ctx.fillRect(px - pw / 2 - 2 * s, base - 14 * s, pw + 4 * s, 18 * s);
    }
    // 貫
    const ny = base - ph * 0.7;
    ctx.fillStyle = L.color;
    ctx.fillRect(x - sp - 22 * s, ny, (sp + 22 * s) * 2, 9 * s);
    ctx.fillStyle = L.shade;
    ctx.fillRect(x - sp - 22 * s, ny + 6 * s, (sp + 22 * s) * 2, 3 * s);
    // 額束
    ctx.fillStyle = L.color;
    ctx.fillRect(x - 6 * s, base - ph - 2 * s, 12 * s, ph * 0.3 + 4 * s);
    ctx.fillStyle = L.cap;
    ctx.fillRect(x - 10 * s, base - ph + 8 * s, 20 * s, 18 * s);
    ctx.fillStyle = L.bell || '#e8c060';
    ctx.fillRect(x - 7 * s, base - ph + 11 * s, 14 * s, 12 * s);
    // 島木
    ctx.fillStyle = L.color;
    ctx.fillRect(x - sp - 30 * s, base - ph - 6 * s, (sp + 30 * s) * 2, 10 * s);
    // 笠木：兩端上翹
    const ky = base - ph - 6 * s;
    const kx = sp + 48 * s;
    ctx.fillStyle = L.cap;
    ctx.beginPath();
    ctx.moveTo(x - kx, ky - 16 * s);
    ctx.quadraticCurveTo(x, ky - 2 * s, x + kx, ky - 16 * s);
    ctx.lineTo(x + kx - 6 * s, ky - 5 * s);
    ctx.quadraticCurveTo(x, ky + 8 * s, x - kx + 6 * s, ky - 5 * s);
    ctx.closePath();
    ctx.fill();
    // 笠木上的雪
    ctx.strokeStyle = L.snow;
    ctx.lineCap = 'round';
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(x - kx + 10 * s, ky - 16 * s);
    ctx.quadraticCurveTo(x, ky - 6 * s, x + kx - 10 * s, ky - 16 * s);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // 貫下垂著一整排鈴串（成千上百的小鈴）
    const bs = Math.max(1.3, 2.3 * s);
    for (let bx = x - sp + 12 * s; bx < x + sp - 8 * s; bx += 11 * s) {
      const len = (26 + hash(bx * 0.37 + s) * 34) * s;
      ctx.strokeStyle = L.cord;
      ctx.lineWidth = Math.max(0.8, s);
      ctx.beginPath();
      ctx.moveTo(bx, ny + 9 * s);
      ctx.lineTo(bx, ny + 9 * s + len);
      ctx.stroke();
      for (let by = ny + 16 * s; by < ny + 9 * s + len; by += 8 * s) tinyBell(ctx, bx, by, bs, L.bell, L.bellShade || L.shade);
      if (glints && hash(bx * 1.3) > 0.55) glints.push({ x: bx, y: ny + 9 * s + len - 4 * s, p: hash(bx) * 6 });
    }
    // 正中央的大鈴
    const cy = ny + 26 * s;
    ctx.strokeStyle = '#f4f0e8';
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(x, ny + 9 * s);
    ctx.lineTo(x, cy);
    ctx.stroke();
    tinyBell(ctx, x, cy + 6 * s, 9 * s, L.bell, L.bellShade || L.shade);
  }

  // ── 浮島（神殿、碎片共用） ──
  function drawIsle(ctx, L, x, y, w, seed, kind) {
    const r = U.seeded(seed);
    const d = w * 0.55;
    const pts = [];
    for (let k = 1; k < 7; k++) {
      const u = k / 7;
      const sp = (1 - Math.pow(u, 0.8)) * w * 0.5;
      pts.push([sp + (r() - 0.5) * w * 0.05, y + d * u + (r() - 0.5) * 8]);
    }
    const tipX = x + (r() - 0.5) * w * 0.08;
    const path = (c) => {
      c.moveTo(x - w / 2, y);
      for (const p of pts) c.lineTo(x - p[0], p[1]);
      c.lineTo(tipX, y + d);
      for (let k = pts.length - 1; k >= 0; k--) c.lineTo(x + pts[k][0] * 0.96, pts[k][1] + 4);
      c.lineTo(x + w / 2, y);
      c.closePath();
    };
    fillShaded(ctx, path, L.rock, L.rockShade, -w * 0.16, 0);
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.strokeStyle = 'rgba(60,40,30,0.14)';
    ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y + d * k * 0.2);
      ctx.quadraticCurveTo(x, y + d * k * 0.2 + 8, x + w / 2, y + d * k * 0.2 - 2);
      ctx.stroke();
    }
    if (L.gold) {
      ctx.strokeStyle = L.gold;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 2; k++) {
        const vx = x + (r() - 0.5) * w * 0.5;
        ctx.beginPath();
        ctx.moveTo(vx, y + 6);
        ctx.lineTo(vx + 8, y + d * 0.3);
        ctx.lineTo(vx - 4, y + d * 0.5);
        ctx.lineTo(vx + 4, y + d * 0.7);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 頂面
    ctx.fillStyle = L.top;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2 + 3, Math.max(6, w * 0.05), 0, 0, PI2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(x - w * 0.08, y - w * 0.015, w * 0.34, Math.max(2, w * 0.02), 0, 0, PI2);
    ctx.fill();
    // 底端的金色晶石
    if (L.gold) {
      softGlow(ctx, tipX, y + d, 22, '255,220,140', 0.6);
      ctx.fillStyle = L.gold;
      ctx.beginPath();
      ctx.moveTo(tipX, y + d - 6);
      ctx.lineTo(tipX + 5, y + d + 3);
      ctx.lineTo(tipX, y + d + 14);
      ctx.lineTo(tipX - 5, y + d + 3);
      ctx.closePath();
      ctx.fill();
    }
    // 小浮島上的東西
    if (kind === 'cols') {
      for (const dx of [-0.22, 0.2]) {
        const cx = x + dx * w;
        const hh = w * (0.45 + r() * 0.25);
        ctx.fillStyle = L.marble;
        ctx.fillRect(cx - w * 0.04, y - hh, w * 0.08, hh);
        ctx.fillStyle = L.marbleShade;
        ctx.fillRect(cx + w * 0.01, y - hh, w * 0.03, hh);
        ctx.fillStyle = L.marble;
        ctx.fillRect(cx - w * 0.06, y - hh - 5, w * 0.12, 5);
      }
    } else if (kind === 'arch') {
      const aw = w * 0.5;
      const ah = w * 0.55;
      ctx.fillStyle = L.marble;
      ctx.beginPath();
      ctx.moveTo(x - aw / 2 - 6, y);
      ctx.lineTo(x - aw / 2 - 6, y - ah);
      ctx.arc(x, y - ah, aw / 2 + 6, Math.PI, 0);
      ctx.lineTo(x + aw / 2 + 6, y);
      ctx.lineTo(x + aw / 2 - 4, y);
      ctx.lineTo(x + aw / 2 - 4, y - ah);
      ctx.arc(x, y - ah, aw / 2 - 4, 0, Math.PI, true);
      ctx.lineTo(x - aw / 2 + 4, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = L.gold;
      ctx.fillRect(x - 3, y - ah - aw / 2 - 6, 6, 7);
    } else if (kind === 'tree') {
      ctx.fillStyle = '#8a6a50';
      ctx.fillRect(x - 3, y - w * 0.3, 6, w * 0.3);
      ctx.fillStyle = '#9cc878';
      ctx.beginPath();
      ctx.arc(x, y - w * 0.36, w * 0.16, 0, PI2);
      ctx.arc(x - w * 0.12, y - w * 0.28, w * 0.12, 0, PI2);
      ctx.arc(x + w * 0.12, y - w * 0.28, w * 0.12, 0, PI2);
      ctx.fill();
    }
  }

  function drawTempleBuilding(ctx, L, x, y, s) {
    const W = 360 * s;
    // 台基三階
    for (let k = 0; k < 3; k++) {
      const sw = W + (2 - k) * 22 * s;
      const sy = y - k * 9 * s;
      ctx.fillStyle = L.marble;
      ctx.fillRect(x - sw / 2, sy - 9 * s, sw, 9 * s);
      ctx.fillStyle = L.marbleShade;
      ctx.fillRect(x - sw / 2, sy - 3 * s, sw, 3 * s);
    }
    const floor = y - 27 * s;
    const colH = 150 * s;
    const entY = floor - colH;
    // 後方的圓頂
    const domeR = 92 * s;
    const dy = entY - 40 * s;
    ctx.fillStyle = L.marble;
    ctx.fillRect(x - domeR * 0.9, dy - 10 * s, domeR * 1.8, 50 * s);
    fillShaded(ctx, (c) => c.arc(x, dy - 10 * s, domeR, Math.PI, 0), L.marble, L.marbleShade, -domeR * 0.35, 0);
    ctx.strokeStyle = L.gold;
    ctx.lineWidth = 2.5 * s;
    for (const k of [-0.6, -0.25, 0.25, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(x + k * domeR, dy - 10 * s);
      ctx.quadraticCurveTo(x + k * domeR * 0.55, dy - 10 * s - domeR * 0.9, x, dy - 10 * s - domeR);
      ctx.stroke();
    }
    ctx.fillStyle = L.gold;
    ctx.fillRect(x - 6 * s, dy - 10 * s - domeR - 26 * s, 12 * s, 28 * s);
    ctx.beginPath();
    ctx.moveTo(x, dy - 10 * s - domeR - 50 * s);
    ctx.lineTo(x + 6 * s, dy - 10 * s - domeR - 26 * s);
    ctx.lineTo(x - 6 * s, dy - 10 * s - domeR - 26 * s);
    ctx.closePath();
    ctx.fill();
    softGlow(ctx, x, dy - 10 * s - domeR - 50 * s, 30 * s, '255,240,190', 0.9);
    // 內殿（柱子後面的陰影與發光的門）
    ctx.fillStyle = L.inner;
    ctx.fillRect(x - W / 2 + 20 * s, entY, W - 40 * s, colH);
    softGlow(ctx, x, floor - 40 * s, 90 * s, L.glowRgb, 0.8);
    ctx.fillStyle = '#fff2c8';
    ctx.beginPath();
    ctx.moveTo(x - 22 * s, floor);
    ctx.lineTo(x - 22 * s, floor - 70 * s);
    ctx.arc(x, floor - 70 * s, 22 * s, Math.PI, 0);
    ctx.lineTo(x + 22 * s, floor);
    ctx.closePath();
    ctx.fill();
    // 柱廊
    const n = 6;
    for (let k = 0; k < n; k++) {
      const cx = x - W / 2 + 26 * s + (k / (n - 1)) * (W - 52 * s);
      const cw = 22 * s;
      ctx.fillStyle = L.marble;
      ctx.fillRect(cx - cw / 2, entY + 10 * s, cw, colH - 16 * s);
      ctx.fillStyle = L.marbleShade;
      ctx.fillRect(cx + cw * 0.18, entY + 10 * s, cw * 0.32, colH - 16 * s);
      ctx.strokeStyle = 'rgba(150,130,110,0.3)';
      ctx.lineWidth = 1;
      for (const f of [-0.25, 0]) {
        ctx.beginPath();
        ctx.moveTo(cx + f * cw, entY + 12 * s);
        ctx.lineTo(cx + f * cw, floor - 8 * s);
        ctx.stroke();
      }
      ctx.fillStyle = L.marble;
      ctx.fillRect(cx - cw * 0.75, entY + 2 * s, cw * 1.5, 9 * s);
      ctx.fillRect(cx - cw * 0.7, floor - 7 * s, cw * 1.4, 7 * s);
      ctx.fillStyle = L.gold;
      ctx.fillRect(cx - cw * 0.75, entY + 9 * s, cw * 1.5, 2 * s);
    }
    // 楣
    ctx.fillStyle = L.marble;
    ctx.fillRect(x - W / 2 - 6 * s, entY - 22 * s, W + 12 * s, 24 * s);
    ctx.fillStyle = L.marbleShade;
    ctx.fillRect(x - W / 2 - 6 * s, entY - 4 * s, W + 12 * s, 4 * s);
    ctx.fillStyle = L.gold;
    ctx.fillRect(x - W / 2 - 6 * s, entY - 14 * s, W + 12 * s, 3 * s);
    // 山牆
    const pk = entY - 22 * s;
    const ph = 62 * s;
    ctx.fillStyle = L.marble;
    ctx.beginPath();
    ctx.moveTo(x - W / 2 - 14 * s, pk);
    ctx.lineTo(x, pk - ph);
    ctx.lineTo(x + W / 2 + 14 * s, pk);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = L.marbleShade;
    ctx.beginPath();
    ctx.moveTo(x - W / 2 + 14 * s, pk - 4 * s);
    ctx.lineTo(x, pk - ph + 14 * s);
    ctx.lineTo(x + W / 2 - 14 * s, pk - 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = L.gold;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(x - W / 2 - 14 * s, pk);
    ctx.lineTo(x, pk - ph);
    ctx.lineTo(x + W / 2 + 14 * s, pk);
    ctx.stroke();
    // 山牆裡的鐘
    const cr = 20 * s;
    const cy = pk - ph * 0.42;
    ctx.fillStyle = '#fff6dc';
    ctx.beginPath();
    ctx.arc(x, cy, cr, 0, PI2);
    ctx.fill();
    ctx.lineWidth = 3 * s;
    ctx.stroke();
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x, cy - cr * 0.75);
    ctx.moveTo(x, cy);
    ctx.lineTo(x + cr * 0.5, cy + cr * 0.2);
    ctx.stroke();
    // 頂飾
    for (const [ax, ay] of [[x, pk - ph], [x - W / 2 - 12 * s, pk], [x + W / 2 + 12 * s, pk]]) {
      ctx.fillStyle = L.gold;
      ctx.beginPath();
      ctx.moveTo(ax, ay - 16 * s);
      ctx.quadraticCurveTo(ax + 9 * s, ay - 6 * s, ax, ay);
      ctx.quadraticCurveTo(ax - 9 * s, ay - 6 * s, ax, ay - 16 * s);
      ctx.fill();
    }
  }

  // ── 回憶的碎片：浮島上放著前面章節的風景 ──
  function fragmentSprite(kind, w, seed) {
    const W = w + 60;
    const H = w * 1.05;
    const c = newCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = U.seeded(seed);
    const x = W / 2;
    const y = H * 0.46;
    const tops = { forest: '#7bbf4a', sea: '#f2d6a0', canyon: '#dc9470', snow: '#f4f8ff', mush: '#c09ac8' };
    const Li = { rock: '#b4a090', rockShade: '#8e7a6c', top: tops[kind], gold: '#f0c060' };
    drawIsle(ctx, Li, x, y, w, seed + 7, null);
    // 景物
    if (kind === 'forest') {
      ctx.fillStyle = '#8fcf6a';
      ctx.beginPath();
      ctx.ellipse(x - w * 0.1, y, w * 0.34, w * 0.14, 0, Math.PI, 0);
      ctx.fill();
      for (const [dx, sc, col] of [[-0.26, 0.9, '#5f9e4c'], [0.02, 1.2, '#6fae5a'], [0.26, 0.8, '#5a964a']]) {
        const tx = x + dx * w;
        const s = w * 0.2 * sc;
        ctx.fillStyle = '#7a5a40';
        ctx.fillRect(tx - 3, y - s * 1.1, 6, s * 1.1);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(tx, y - s * 1.35, s * 0.5, 0, PI2);
        ctx.arc(tx - s * 0.35, y - s * 1.05, s * 0.38, 0, PI2);
        ctx.arc(tx + s * 0.35, y - s * 1.05, s * 0.38, 0, PI2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,220,0.18)';
        ctx.beginPath();
        ctx.arc(tx - s * 0.15, y - s * 1.5, s * 0.28, 0, PI2);
        ctx.fill();
      }
      ctx.fillStyle = '#ff9fbf';
      for (let k = 0; k < 6; k++) ctx.fillRect(x + (r() - 0.5) * w * 0.7, y - 4 - r() * 4, 3, 3);
    } else if (kind === 'sea') {
      ctx.fillStyle = '#4aaede';
      ctx.beginPath();
      ctx.ellipse(x + w * 0.06, y - 2, w * 0.36, w * 0.06, 0, 0, PI2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x + w * 0.06, y - 2, w * 0.3, w * 0.045, 0, 0.2, 2.6);
      ctx.stroke();
      // 燈塔
      const lx = x - w * 0.3;
      ctx.fillStyle = '#fbf6ee';
      ctx.beginPath();
      ctx.moveTo(lx - 9, y);
      ctx.lineTo(lx - 6, y - w * 0.42);
      ctx.lineTo(lx + 6, y - w * 0.42);
      ctx.lineTo(lx + 9, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0584a';
      ctx.fillRect(lx - 8, y - w * 0.16, 16, 7);
      ctx.fillRect(lx - 7, y - w * 0.3, 14, 7);
      ctx.fillStyle = '#ffe890';
      ctx.fillRect(lx - 5, y - w * 0.49, 10, 8);
      ctx.fillStyle = '#e0584a';
      ctx.beginPath();
      ctx.moveTo(lx - 8, y - w * 0.49);
      ctx.lineTo(lx, y - w * 0.56);
      ctx.lineTo(lx + 8, y - w * 0.49);
      ctx.fill();
      // 小帆船
      const bx = x + w * 0.14;
      ctx.fillStyle = '#6a5a6a';
      ctx.beginPath();
      ctx.moveTo(bx - 16, y - 6);
      ctx.lineTo(bx + 16, y - 6);
      ctx.lineTo(bx + 11, y + 1);
      ctx.lineTo(bx - 11, y + 1);
      ctx.fill();
      ctx.fillStyle = '#fff8ee';
      ctx.beginPath();
      ctx.moveTo(bx, y - 8);
      ctx.lineTo(bx, y - 40);
      ctx.lineTo(bx + 16, y - 10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx - 2, y - 10);
      ctx.lineTo(bx - 2, y - 32);
      ctx.lineTo(bx - 14, y - 10);
      ctx.fill();
    } else if (kind === 'canyon') {
      for (const [dx, mw, mh, col] of [[-0.18, 0.3, 0.34, '#d88a68'], [0.16, 0.26, 0.5, '#c87458']]) {
        const mx = x + dx * w;
        const m = (cc) => {
          cc.moveTo(mx - (mw * w) / 2, y);
          cc.lineTo(mx - (mw * w) / 2 + 6, y - mh * w);
          cc.lineTo(mx + (mw * w) / 2 - 6, y - mh * w);
          cc.lineTo(mx + (mw * w) / 2, y);
          cc.closePath();
        };
        fillShaded(ctx, m, col, '#a85c44', -mw * w * 0.25, 0);
        ctx.fillStyle = 'rgba(255,230,200,0.3)';
        for (let k = 1; k < 4; k++) ctx.fillRect(mx - (mw * w) / 2 + 3, y - mh * w + k * mh * w * 0.24, mw * w - 6, 2);
      }
      ctx.fillStyle = '#7aae5a';
      ctx.fillRect(x + w * 0.36, y - 22, 6, 22);
      ctx.fillRect(x + w * 0.36 - 7, y - 16, 7, 4);
      ctx.fillRect(x + w * 0.36 - 7, y - 22, 4, 8);
    } else if (kind === 'snow') {
      const pk = (cc) => {
        cc.moveTo(x - w * 0.34, y);
        cc.lineTo(x - w * 0.02, y - w * 0.52);
        cc.lineTo(x + w * 0.3, y);
        cc.closePath();
      };
      fillShaded(ctx, pk, '#8e9cc0', '#74829e', -w * 0.16, 0);
      ctx.fillStyle = '#f6f8ff';
      ctx.beginPath();
      ctx.moveTo(x - w * 0.02, y - w * 0.52);
      ctx.lineTo(x - w * 0.15, y - w * 0.3);
      ctx.lineTo(x - w * 0.08, y - w * 0.33);
      ctx.lineTo(x - w * 0.02, y - w * 0.27);
      ctx.lineTo(x + w * 0.05, y - w * 0.32);
      ctx.lineTo(x + w * 0.11, y - w * 0.3);
      ctx.closePath();
      ctx.fill();
      const Lp = { trunk: '#5a4a44', snow: '#f6f8ff', snowShade: '#c8d4e8', tiers: 3 };
      drawPine(ctx, Lp, x + w * 0.3, y + 2, w * 0.3, '#4f7470');
      drawPine(ctx, Lp, x - w * 0.32, y + 2, w * 0.24, '#466a68');
    } else if (kind === 'mush') {
      for (const [dx, sc, col] of [[-0.18, 1, '#f2a36a'], [0.14, 1.3, '#e88a8a'], [0.34, 0.7, '#f5c26b']]) {
        const mx = x + dx * w;
        const s = w * 0.2 * sc;
        ctx.fillStyle = '#f3e3c8';
        ctx.fillRect(mx - s * 0.12, y - s, s * 0.24, s);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(mx - s * 0.55, y - s + 4);
        ctx.bezierCurveTo(mx - s * 0.55, y - s * 1.6, mx + s * 0.55, y - s * 1.6, mx + s * 0.55, y - s + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(mx - s * 0.2, y - s * 1.2, s * 0.07, 0, PI2);
        ctx.arc(mx + s * 0.15, y - s * 1.3, s * 0.06, 0, PI2);
        ctx.fill();
      }
    }
    // 回憶的色調：整體罩一層淡金
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,226,170,0.26)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // 背後的光暈
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    softGlow(ctx, x, y - w * 0.1, w * 0.62, '255,240,200', 0.45);
    ctx.restore();
    return c;
  }

  // ── 齒輪、鐘環（預先畫好，動畫時只旋轉貼圖） ──
  function gearSprite(r, L) {
    const S = r * 2 + 8;
    const c = newCanvas(S, S);
    const ctx = c.getContext('2d');
    const m = S / 2;
    const n = Math.max(8, Math.round(r / 9));
    const path = (cc) => {
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * PI2;
        const a1 = ((k + 0.5) / n) * PI2;
        const da = (0.12 / n) * PI2;
        const ro = r;
        const ri = r - 12;
        const p = (a, rad) => [m + Math.cos(a) * rad, m + Math.sin(a) * rad];
        const q = [p(a0, ri), p(a0 + da, ro), p(a1 - da, ro), p(a1, ri)];
        if (k === 0) cc.moveTo(q[0][0], q[0][1]);
        else cc.lineTo(q[0][0], q[0][1]);
        for (let j = 1; j < 4; j++) cc.lineTo(q[j][0], q[j][1]);
      }
      cc.closePath();
    };
    ctx.fillStyle = L.color;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.strokeStyle = L.hi;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m, m, r - 18, 0, PI2);
    ctx.stroke();
    ctx.fillStyle = L.shade;
    ctx.beginPath();
    ctx.arc(m, m, r - 24, 0, PI2);
    ctx.fill();
    // 輻條之間挖空
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const spokes = 5;
    for (let k = 0; k < spokes; k++) {
      const a = (k / spokes) * PI2;
      ctx.beginPath();
      ctx.moveTo(m + Math.cos(a + 0.18) * r * 0.3, m + Math.sin(a + 0.18) * r * 0.3);
      ctx.arc(m, m, r - 30, a + 0.18, a + PI2 / spokes - 0.18);
      ctx.lineTo(m + Math.cos(a + PI2 / spokes - 0.18) * r * 0.3, m + Math.sin(a + PI2 / spokes - 0.18) * r * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.arc(m, m, r * 0.22, 0, PI2);
    ctx.fill();
    ctx.strokeStyle = L.hi;
    ctx.beginPath();
    ctx.arc(m, m, r * 0.14, 0, PI2);
    ctx.stroke();
    return c;
  }
  function ringSprite(r, col) {
    const S = Math.ceil(r * 2 + 16);
    const c = newCanvas(S, S);
    const ctx = c.getContext('2d');
    const m = S / 2;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(m, m, r, 0, PI2);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(m, m, r - 16, 0, PI2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(m, m, r * 0.6, 0, PI2);
    ctx.stroke();
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * PI2;
      const big = k % 5 === 0;
      ctx.lineWidth = big ? 3 : 1.2;
      ctx.beginPath();
      ctx.moveTo(m + Math.cos(a) * (r - 2), m + Math.sin(a) * (r - 2));
      ctx.lineTo(m + Math.cos(a) * (r - (big ? 14 : 7)), m + Math.sin(a) * (r - (big ? 14 : 7)));
      ctx.stroke();
    }
    ctx.font = 'bold ' + Math.round(r * 0.1) + 'px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = 0; k < 12; k++) {
      ctx.save();
      ctx.translate(m, m);
      ctx.rotate((k / 12) * PI2);
      ctx.fillText(ROMAN[k], 0, -(r - 16 - r * 0.08));
      ctx.restore();
    }
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * PI2;
      ctx.beginPath();
      ctx.arc(m + Math.cos(a) * (r * 0.6 + 7), m + Math.sin(a) * (r * 0.6 + 7), k % 2 ? 1.5 : 2.5, 0, PI2);
      ctx.fill();
    }
    return c;
  }

  // ── 石獅（歷代守葉獸化成的石像） ──
  function drawLionStatue(ctx, L, x, base, s, dir) {
    ctx.save();
    ctx.translate(x, base);
    ctx.scale(dir * s, s);
    const st = L.stone;
    const sh = L.shade;
    // 台座
    fillShaded(ctx, (c) => c.rect(-78, -74, 156, 74), st, sh, -14, 0);
    ctx.fillStyle = L.dark;
    ctx.fillRect(-86, -8, 172, 10);
    fillShaded(ctx, (c) => c.rect(-88, -86, 176, 13), st, sh, -10, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-88, -86, 176, 3);
    ctx.fillStyle = L.gold;
    ctx.fillRect(-28, -56, 56, 22);
    ctx.fillStyle = 'rgba(80,50,20,0.55)';
    ctx.fillRect(-20, -48, 40, 2);
    ctx.fillRect(-16, -42, 32, 2);
    const y0 = -86;
    // 尾巴
    ctx.strokeStyle = sh;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-54, y0 - 8);
    ctx.bezierCurveTo(-92, y0 - 12, -96, y0 - 70, -70, y0 - 84);
    ctx.stroke();
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(-66, y0 - 88, 12, 0, PI2);
    ctx.fill();
    ctx.lineCap = 'butt';
    // 後腿與身體
    fillShaded(ctx, (c) => c.ellipse(-26, y0 - 34, 40, 36, 0, 0, PI2), st, sh, -8, -6);
    fillShaded(ctx, (c) => c.ellipse(4, y0 - 52, 50, 34, -0.55, 0, PI2), st, sh, -6, -8);
    fillShaded(ctx, (c) => c.ellipse(-6, y0 - 6, 26, 8, 0, 0, PI2), st, sh, 0, -3);
    // 前腳（遠的那隻暗一點）
    ctx.fillStyle = sh;
    ctx.beginPath();
    A.roundRect(ctx, 44, y0 - 76, 18, 74, 8);
    ctx.fill();
    fillShaded(ctx, (c) => A.roundRect(c, 28, y0 - 76, 20, 76, 9), st, sh, -5, 0);
    fillShaded(ctx, (c) => c.ellipse(46, y0 - 6, 18, 8, 0, 0, PI2), st, sh, 0, -3);
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(64, y0 - 5, 14, 6, 0, 0, PI2);
    ctx.fill();
    // 胸
    fillShaded(ctx, (c) => c.ellipse(40, y0 - 84, 30, 34, 0, 0, PI2), st, sh, -6, -4);
    // 鬃毛：一圈圓弧
    const mx = 40;
    const my = y0 - 124;
    const mane = (c) => {
      const n = 14;
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * PI2;
        const rr2 = 46 + (k % 2 ? 4 : 0);
        const px = mx + Math.cos(a) * rr2;
        const py = my + Math.sin(a) * rr2 * 0.95;
        if (k === 0) c.moveTo(px, py);
        else c.quadraticCurveTo(mx + Math.cos(a - Math.PI / n) * (rr2 + 12), my + Math.sin(a - Math.PI / n) * (rr2 + 12) * 0.95, px, py);
      }
      c.closePath();
    };
    fillShaded(ctx, mane, st, sh, -10, -6);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      const a = -1.2 + k * 0.55;
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(a) * 22, my + Math.sin(a) * 22);
      ctx.quadraticCurveTo(mx + Math.cos(a + 0.2) * 34, my + Math.sin(a + 0.2) * 34, mx + Math.cos(a) * 44, my + Math.sin(a) * 44);
      ctx.stroke();
    }
    // 臉
    fillShaded(ctx, (c) => c.ellipse(mx + 18, my + 2, 26, 24, 0, 0, PI2), st, sh, -6, -4);
    fillShaded(ctx, (c) => c.ellipse(mx + 40, my + 10, 17, 13, 0, 0, PI2), st, sh, -4, -3);
    ctx.fillStyle = L.dark;
    ctx.beginPath();
    ctx.moveTo(mx + 50, my + 2);
    ctx.lineTo(mx + 58, my + 4);
    ctx.lineTo(mx + 54, my + 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = L.dark;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(mx + 26, my - 6, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx + 42, my + 18);
    ctx.quadraticCurveTo(mx + 48, my + 22, mx + 54, my + 16);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(mx + 4, my - 26, 9, 7, -0.4, 0, PI2);
    ctx.fill();
    // 裂痕裡透出的微光（沉睡的守護者）
    ctx.strokeStyle = L.crack;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-10, y0 - 70);
    ctx.lineTo(-2, y0 - 56);
    ctx.lineTo(-8, y0 - 44);
    ctx.lineTo(0, y0 - 30);
    ctx.moveTo(mx - 20, my - 30);
    ctx.lineTo(mx - 12, my - 16);
    ctx.lineTo(mx - 18, my - 4);
    ctx.stroke();
    // 苔
    ctx.fillStyle = 'rgba(110,150,90,0.45)';
    ctx.beginPath();
    ctx.ellipse(-60, -86, 18, 5, 0, 0, PI2);
    ctx.ellipse(mx - 30, my - 30, 10, 5, -0.6, 0, PI2);
    ctx.ellipse(60, -80, 12, 4, 0, 0, PI2);
    ctx.fill();
    ctx.restore();
  }

  Object.assign(LAYER, {
    // 雪山連峰：稜線分出受光面與背光面，山頂積雪，山腳一層霧
    peaks(ctx, L, rnd, h) {
      const base = h * L.base;
      let x = rnd() * 120;
      while (x < TW) {
        const w = rr(rnd, L.w);
        const hg = rr(rnd, L.hgt);
        const seed = Math.floor(rnd() * 1e6);
        wrap2(x, w * 0.5 + 40, (xx) => drawPeak(ctx, L, xx, base, w, hg, seed));
        x += w * rr(rnd, L.gap || [0.45, 0.75]);
      }
      ctx.fillStyle = L.color;
      ctx.fillRect(0, base + 50, TW, h);
      if (L.mist) {
        const mh = L.mistH || 70;
        const ma = L.mistA || 0.9;
        const g = ctx.createLinearGradient(0, base - mh, 0, base + 50);
        g.addColorStop(0, 'rgba(' + L.mist + ',0)');
        g.addColorStop(1, 'rgba(' + L.mist + ',' + ma + ')');
        ctx.fillStyle = g;
        ctx.fillRect(0, base - mh, TW, mh + 50);
        ctx.fillStyle = 'rgba(' + L.mist + ',' + ma + ')';
        ctx.fillRect(0, base + 50, TW, h);
      }
    },
    // 雪松林
    pines(ctx, L, rnd, h) {
      if (L.ground) {
        const base = h * L.base + 6;
        ctx.fillStyle = L.ground;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= TW; x += 20) ctx.lineTo(x, base + Math.sin((x / TW) * PI2 * 3) * 8 + Math.sin((x / TW) * PI2 * 7 + 1) * 4);
        ctx.lineTo(TW, h);
        ctx.fill();
      }
      ctx.globalAlpha = L.alpha || 1;
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.8;
        const s = rr(rnd, L.size);
        const y = h * L.base + rnd() * 26;
        const col = L.colors[Math.floor(rnd() * L.colors.length)];
        wrap2(x, s * 0.5, (xx) => drawPine(ctx, L, xx, y, s, col));
      }
      ctx.globalAlpha = 1;
    },
    // 起伏的雪丘，稜上閃著細碎的光
    drifts(ctx, L, rnd, h) {
      const base = h * L.base;
      const p1 = rnd() * 6;
      const p2 = rnd() * 6;
      const yAt = (x) => base - Math.sin((x / TW) * PI2 * 2 + p1) * L.amp - Math.sin((x / TW) * PI2 * 5 + p2) * L.amp * 0.4;
      const path = (c) => {
        c.moveTo(0, h);
        for (let x = 0; x <= TW; x += 10) c.lineTo(x, yAt(x));
        c.lineTo(TW, h);
        c.closePath();
      };
      const g = ctx.createLinearGradient(0, base - L.amp * 1.4, 0, h);
      g.addColorStop(0, L.colors[0]);
      g.addColorStop(1, L.colors[1]);
      ctx.fillStyle = g;
      ctx.beginPath();
      path(ctx);
      ctx.fill();
      // 背光的斜坡：往左上偏移的同一條線，差出來的地方塗藍影
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      ctx.fillStyle = L.shadow;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 10) ctx.lineTo(x, Math.max(yAt(x), yAt(x - 70) + 10));
      ctx.lineTo(TW, h);
      ctx.fill();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= TW; x += 10) ctx.lineTo(x, yAt(x - 70) + 26);
      ctx.lineTo(TW, h);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x <= TW; x += 10) x ? ctx.lineTo(x, yAt(x) + 1.5) : ctx.moveTo(x, yAt(x) + 1.5);
      ctx.stroke();
      const pts = [];
      for (let i = 0; i < (L.sparkle || 0); i++) {
        const x = 20 + rnd() * (TW - 40);
        pts.push({ x, y: yAt(x) + 6 + rnd() * 50, p: rnd() * 6 });
      }
      return [{ type: 'glint', pts }];
    },
    // 霜鈴村：木屋、暖窗、煙囪炊煙、屋與屋之間的燈籠串和風鈴
    village(ctx, L, rnd, h) {
      const base = h * L.base;
      const glows = [];
      const smoke = [];
      const houses = [];
      let x = 30 + rnd() * 60;
      for (;;) {
        const w = rr(rnd, L.w);
        if (x + w > TW - 30) break;
        houses.push({ x: x + w / 2, w, hg: rr(rnd, L.hgt), dy: rnd() * 14 });
        x += w + rr(rnd, L.gap);
      }
      // 燈籠串（在房子後面）
      for (let i = 0; i + 1 < houses.length; i++) {
        const a = houses[i];
        const b = houses[i + 1];
        const p0 = [a.x + a.w * 0.3, base + a.dy - a.hg - 4];
        const p1 = [b.x - b.w * 0.3, base + b.dy - b.hg - 4];
        const c = [(p0[0] + p1[0]) / 2, Math.max(p0[1], p1[1]) + 34];
        ctx.strokeStyle = 'rgba(60,40,40,0.8)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.quadraticCurveTo(c[0], c[1], p1[0], p1[1]);
        ctx.stroke();
        const n = 5;
        for (let k = 1; k < n; k++) {
          const q = quadAt(p0, c, p1, k / n);
          if (k % 2) {
            softGlow(ctx, q[0], q[1] + 8, 26, L.glowRgb, 0.35);
            ctx.fillStyle = L.lantern;
            ctx.beginPath();
            ctx.ellipse(q[0], q[1] + 8, 5, 7, 0, 0, PI2);
            ctx.fill();
            ctx.fillStyle = '#ffe2a0';
            ctx.fillRect(q[0] - 1.5, q[1] + 4, 3, 8);
            ctx.fillStyle = '#3a2418';
            ctx.fillRect(q[0] - 3, q[1] + 0.5, 6, 2);
            ctx.fillRect(q[0] - 3, q[1] + 14, 6, 2);
            glows.push({ x: q[0], y: q[1] + 8, r: 22, p: rnd() });
          } else {
            // 風鈴＋短冊
            ctx.strokeStyle = 'rgba(60,40,40,0.8)';
            ctx.beginPath();
            ctx.moveTo(q[0], q[1]);
            ctx.lineTo(q[0], q[1] + 4);
            ctx.stroke();
            ctx.fillStyle = 'rgba(210,240,255,0.95)';
            ctx.beginPath();
            ctx.arc(q[0], q[1] + 8, 4.5, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = k % 4 ? '#ff9ab0' : '#9ad0ff';
            ctx.fillRect(q[0] - 1.5, q[1] + 9, 3, 12);
          }
        }
      }
      // 地上的雪
      const g = ctx.createLinearGradient(0, base, 0, base + 80);
      g.addColorStop(0, L.ground);
      g.addColorStop(1, L.groundShade);
      for (const hs of houses) drawCabin(ctx, L, hs.x, base + hs.dy, hs.w, hs.hg, rnd, glows, smoke);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let xx = 0; xx <= TW; xx += 16) ctx.lineTo(xx, base + 12 + Math.sin(xx * 0.01) * 4 + Math.sin(xx * 0.037) * 3);
      ctx.lineTo(TW, h);
      ctx.fill();
      // 籬笆
      ctx.fillStyle = '#6a4a3a';
      for (let xx = 10; xx < TW; xx += 14) {
        if (houses.some((hs) => Math.abs(xx - hs.x) < hs.w / 2 + 10)) continue;
        const fy = base + 14 + Math.sin(xx * 0.01) * 4;
        ctx.fillRect(xx - 2, fy - 16, 4, 18);
        ctx.fillStyle = L.snow;
        ctx.fillRect(xx - 3, fy - 19, 6, 4);
        ctx.fillStyle = '#6a4a3a';
      }
      return [
        { type: 'plume', pts: smoke, color: '236,236,244', a: 0.4, n: 5, speed: 0.12 },
        { type: 'glows', pts: glows, rgb: L.glowRgb, a: 0.45 },
      ];
    },
    // 冰瀑：兩側岩壁、結凍的瀑布、岩頂積雪與冰柱
    icefall(ctx, L, rnd, h) {
      const top = h * L.top;
      const base = h * L.base;
      const p1 = rnd() * 6;
      const yAt = (x) => top + Math.sin((x / TW) * PI2 * 3 + p1) * 26 + Math.sin((x / TW) * PI2 * 8) * 10 + (hash(Math.floor(x / 50) + 3) - 0.5) * 22;
      // 瀑布後面的冷光
      for (const [fx, fw] of L.falls) softGlow(ctx, TW * fx, base - 120, fw * 2.2, L.glowRgb, 0.35);
      // 岩壁
      const wall = (c) => {
        c.moveTo(0, h);
        for (let x = 0; x <= TW; x += 12) c.lineTo(x, yAt(x));
        c.lineTo(TW, h);
        c.closePath();
      };
      const wg = ctx.createLinearGradient(0, top, 0, base);
      wg.addColorStop(0, L.color);
      wg.addColorStop(1, L.shade);
      fillShaded(ctx, wall, L.color, L.shade, 0, -12);
      ctx.save();
      ctx.beginPath();
      wall(ctx);
      ctx.clip();
      ctx.fillStyle = wg;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(0, top - 40, TW, h);
      ctx.globalAlpha = 1;
      // 岩層與縱向裂縫
      ctx.fillStyle = 'rgba(200,230,255,0.08)';
      for (let y = top; y < h; y += 30 + hash(y) * 26) ctx.fillRect(0, y, TW, 4 + hash(y + 2) * 5);
      ctx.strokeStyle = 'rgba(10,20,40,0.2)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 22; i++) {
        const x = rnd() * TW;
        const y = yAt(x) + 20 + rnd() * 60;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rnd() - 0.5) * 24, y + 60 + rnd() * 140);
        ctx.stroke();
      }
      // 岩架：一條條橫向的雪棚與冰柱
      for (let i = 0; i < 9; i++) {
        const x = rnd() * TW;
        const y = yAt(x) + 70 + rnd() * (base - yAt(x) - 150);
        const w = 60 + rnd() * 90;
        ctx.fillStyle = L.snow;
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, 5, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,240,255,0.9)';
        for (let k = x - w / 2 + 6; k < x + w / 2 - 4; k += 7) {
          const len = 6 + hash(k) * 16;
          ctx.beginPath();
          ctx.moveTo(k - 2.5, y);
          ctx.lineTo(k + 2.5, y);
          ctx.lineTo(k, y + len);
          ctx.fill();
        }
      }
      ctx.restore();
      // 頂上的雪
      ctx.fillStyle = L.snow;
      ctx.beginPath();
      for (let x = 0; x <= TW; x += 12) x ? ctx.lineTo(x, yAt(x) - 3) : ctx.moveTo(x, yAt(x) - 3);
      for (let x = TW; x >= 0; x -= 12) ctx.lineTo(x, yAt(x) + 8 + hash(x * 0.3) * 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(210,240,255,0.95)';
      for (let x = 4; x < TW; x += 9) {
        if (hash(x * 0.71) < 0.35) continue;
        const y = yAt(x) + 8;
        const len = 8 + hash(x) * 22;
        ctx.beginPath();
        ctx.moveTo(x - 3, y);
        ctx.lineTo(x + 3, y);
        ctx.lineTo(x, y + len);
        ctx.fill();
      }
      // 結凍的瀑布
      const shim = [];
      for (const [fx, fw] of L.falls) {
        const cx = TW * fx;
        const y0 = yAt(cx) - 6;
        const ph = rnd() * 6;
        const edge = (y, side) => cx + side * (fw / 2 + Math.sin(y * 0.03 + ph + side) * 7 + Math.max(0, (y - base + 90) * 0.5));
        const fall = (c) => {
          c.moveTo(edge(y0, -1), y0);
          for (let y = y0; y <= base + 20; y += 10) c.lineTo(edge(y, -1), y);
          for (let y = base + 20; y >= y0; y -= 10) c.lineTo(edge(y, 1), y);
          c.closePath();
        };
        const g = ctx.createLinearGradient(0, y0, 0, base);
        g.addColorStop(0, L.ice[0]);
        g.addColorStop(0.45, L.ice[1]);
        g.addColorStop(1, L.ice[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        fall(ctx);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        fall(ctx);
        ctx.clip();
        // 冰的縱紋
        for (let k = 0; k < fw / 9; k++) {
          const lx = cx - fw / 2 + k * 9 + rnd() * 4;
          ctx.strokeStyle = k % 3 ? 'rgba(255,255,255,0.45)' : 'rgba(60,130,190,0.35)';
          ctx.lineWidth = k % 3 ? 2 : 3;
          ctx.beginPath();
          ctx.moveTo(lx, y0);
          for (let y = y0; y < base + 20; y += 16) ctx.lineTo(lx + Math.sin(y * 0.04 + k) * 3 + (lx - cx) * Math.max(0, (y - base + 90) / 180), y);
          ctx.stroke();
        }
        // 一層層凍住的水簾
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 3;
        for (let y = y0 + 50; y < base; y += 56 + rnd() * 30) {
          ctx.beginPath();
          ctx.moveTo(edge(y, -1), y);
          ctx.quadraticCurveTo(cx, y + 18, edge(y, 1), y);
          ctx.stroke();
        }
        // 右半邊的陰影
        ctx.fillStyle = 'rgba(40,90,150,0.18)';
        ctx.fillRect(cx + fw * 0.15, y0, fw, base - y0 + 40);
        ctx.restore();
        // 底下的冰堆
        ctx.fillStyle = L.ice[0];
        ctx.beginPath();
        ctx.ellipse(cx, base + 16, fw * 0.9, 22, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(120,190,230,0.5)';
        ctx.beginPath();
        ctx.ellipse(cx + fw * 0.2, base + 16, fw * 0.6, 12, 0, Math.PI, 0);
        ctx.fill();
        for (let k = 0; k < 3; k++) shim.push({ x: cx + (k - 1) * fw * 0.28, y0: y0 + 10, y1: base, w: fw, p: rnd() });
      }
      // 凍結的水面
      ctx.fillStyle = '#a8d8ee';
      ctx.fillRect(0, base + 16, TW, h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 20; i++) ctx.fillRect(rnd() * TW, base + 22 + rnd() * 40, 20 + rnd() * 60, 2);
      return [{ type: 'shimmer', pts: shim }];
    },
    // 冰晶簇（近景）
    crystals(ctx, L, rnd, h) {
      const glows = [];
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.7;
        const y = h * L.base + rnd() * 20;
        const s = rr(rnd, L.size);
        const parts = [];
        const k = 3 + Math.floor(rnd() * 3);
        for (let j = 0; j < k; j++) parts.push([(rnd() - 0.5) * s * 0.7, s * (0.14 + rnd() * 0.1), s * (0.5 + rnd() * 0.6), (rnd() - 0.5) * 0.8]);
        parts.sort((a, b) => a[2] - b[2]).reverse();
        wrap2(x, s, (xx) => {
          softGlow(ctx, xx, y - s * 0.4, s * 0.9, L.glowRgb, 0.3);
          for (const [dx, w, hg, rot] of parts) drawCrystal(ctx, xx + dx, y, w, hg, rot, L.colors);
        });
        glows.push({ x, y: y - s * 0.4, r: s * 0.7, p: rnd() });
      }
      return [{ type: 'glows', pts: glows, rgb: L.glowRgb, a: 0.25, sp: 1.4 }];
    },
    // 千鈴參道的鳥居群，鳥居之間拉著掛滿小鈴的繩
    torii(ctx, L, rnd, h) {
      const base = h * L.base;
      const s = L.s;
      const gap = TW / L.n;
      const glints = [];
      const glows = [];
      ctx.globalAlpha = L.alpha || 1;
      if (L.ground) {
        ctx.fillStyle = L.ground;
        ctx.fillRect(0, base, TW, h - base);
        ctx.fillStyle = L.groundHi;
        ctx.fillRect(0, base - 2, TW, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let x = 0; x < TW; x += 58) ctx.fillRect(x, base + 4, 2, h - base);
      }
      const gates = [];
      for (let i = 0; i < L.n; i++) gates.push(i * gap + gap * 0.5 + (rnd() - 0.5) * gap * 0.1);
      const sp = 96 * s;
      const ph = 150 * s;
      // 鳥居之間的鈴繩
      for (let i = 0; i < L.n; i++) {
        const a = gates[i] + sp;
        const b = (i + 1 < L.n ? gates[i + 1] : gates[0] + TW) - sp;
        for (let k = 0; k < L.rows; k++) {
          const y0 = base - ph * (0.6 + k * 0.13);
          const sag = (22 + k * 6) * s;
          const mid = (a + b) / 2;
          wrap2(mid, (b - a) / 2 + 10, (mm) => {
            const d = mm - mid;
            const P0 = [a + d, y0];
            const P1 = [b + d, y0];
            const C = [mm, y0 + sag * 2];
            ctx.strokeStyle = L.cord;
            ctx.lineWidth = Math.max(1, 1.6 * s);
            ctx.beginPath();
            ctx.moveTo(P0[0], P0[1]);
            ctx.quadraticCurveTo(C[0], C[1], P1[0], P1[1]);
            ctx.stroke();
            const n = Math.floor((b - a) / (8 * s));
            for (let j = 1; j < n; j++) {
              const q = quadAt(P0, C, P1, j / n);
              tinyBell(ctx, q[0], q[1] + 3 * s, Math.max(1.2, 2.2 * s), L.bell, L.bellShade || L.shade);
            }
          });
          if (s > 0.8) for (let j = 1; j < 6; j++) {
            const q = quadAt([a, y0], [(a + b) / 2, y0 + sag * 2], [b, y0], j / 6);
            glints.push({ x: ((q[0] % TW) + TW) % TW, y: q[1] + 3 * s, p: rnd() * 6 });
          }
        }
      }
      for (const gx of gates) wrap2(gx, sp + 60 * s, (xx) => drawTorii(ctx, L, xx, base, s, xx === gx && s > 0.8 ? glints : null));
      // 石燈籠
      if (L.lanterns) {
        for (let i = 0; i < L.n; i++) {
          const lx = gates[i] + gap / 2;
          wrap2(lx, 40, (xx) => {
            const y = base;
            ctx.fillStyle = '#8a8490';
            ctx.fillRect(xx - 14, y - 8, 28, 8);
            ctx.fillRect(xx - 5, y - 36, 10, 28);
            ctx.fillRect(xx - 13, y - 54, 26, 18);
            softGlow(ctx, xx, y - 45, 40, '255,200,120', 0.55);
            ctx.fillStyle = '#ffd88a';
            ctx.fillRect(xx - 7, y - 50, 14, 10);
            ctx.fillStyle = '#6e6874';
            ctx.beginPath();
            ctx.moveTo(xx - 22, y - 54);
            ctx.quadraticCurveTo(xx, y - 70, xx + 22, y - 54);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = L.snow;
            ctx.beginPath();
            ctx.moveTo(xx - 20, y - 56);
            ctx.quadraticCurveTo(xx, y - 74, xx + 20, y - 56);
            ctx.quadraticCurveTo(xx, y - 64, xx - 20, y - 56);
            ctx.fill();
          });
          glows.push({ x: ((lx % TW) + TW) % TW, y: base - 45, r: 34, p: rnd() });
        }
      }
      ctx.globalAlpha = 1;
      return [{ type: 'glint', pts: glints }, { type: 'glows', pts: glows, rgb: '255,190,110', a: 0.4 }];
    },
    // 月亮（或帶環的星球）
    moon(ctx, L, rnd, h) {
      const x = TW * L.x;
      const y = h * L.y;
      const r = L.r;
      wrap2(x, r * 4, (xx) => {
        softGlow(ctx, xx, y, r * 4, L.glowRgb, L.glowA || 0.4);
        const tilt = -0.28;
        if (L.ring) {
          ctx.strokeStyle = L.ring;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.ellipse(xx, y, r * 1.9, r * 0.42, tilt, Math.PI, PI2);
          ctx.stroke();
        }
        ctx.fillStyle = L.color;
        ctx.beginPath();
        ctx.arc(xx, y, r, 0, PI2);
        ctx.fill();
        const rs = U.seeded(77);
        ctx.fillStyle = L.spot;
        for (let k = 0; k < 7; k++) {
          ctx.beginPath();
          ctx.ellipse(xx + (rs() - 0.5) * r * 1.1, y + (rs() - 0.5) * r * 1.1, r * (0.1 + rs() * 0.18), r * (0.08 + rs() * 0.12), rs() * 3, 0, PI2);
          ctx.fill();
        }
        const g = ctx.createRadialGradient(xx - r * 0.35, y - r * 0.35, r * 0.2, xx, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.7, 'rgba(255,255,255,0)');
        g.addColorStop(1, L.limb);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(xx, y, r, 0, PI2);
        ctx.fill();
        if (L.ring) {
          ctx.strokeStyle = L.ring;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.ellipse(xx, y, r * 1.9, r * 0.42, tilt, 0, Math.PI);
          ctx.stroke();
        }
      });
    },
    // 霜靈祭壇：三層冰石台、兩根冰柱掛大鈴、浮在上方的巨大冰晶
    altar(ctx, L, rnd, h) {
      const x = TW * L.x;
      const base = h * L.base;
      const s = L.s;
      const glows = [];
      const glints = [];
      softGlow(ctx, x, base - 250 * s, 420 * s, L.glowRgb, 0.4);
      // 冰原
      const gg = ctx.createLinearGradient(0, base - 10, 0, h);
      gg.addColorStop(0, L.ground);
      gg.addColorStop(1, L.groundShade);
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let xx = 0; xx <= TW; xx += 20) ctx.lineTo(xx, base - 6 + Math.sin(xx * 0.008) * 6 + Math.sin(xx * 0.03) * 3);
      ctx.lineTo(TW, h);
      ctx.fill();
      // 地上的法陣
      ctx.strokeStyle = 'rgba(' + L.glowRgb + ',0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, base + 10, 300 * s, 30 * s, 0, 0, PI2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, base + 10, 260 * s, 24 * s, 0, 0, PI2);
      ctx.stroke();
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * PI2;
        const px = x + Math.cos(a) * 280 * s;
        const py = base + 10 + Math.sin(a) * 27 * s;
        ctx.fillStyle = 'rgba(' + L.glowRgb + ',0.8)';
        ctx.fillRect(px - 2, py - 3, 4, 6);
      }
      // 台階
      let y = base;
      const tiers = [[380, 34], [290, 32], [200, 30]];
      for (const [tw0, th0] of tiers) {
        const tw = tw0 * s;
        const th = th0 * s;
        fillShaded(ctx, (c) => c.rect(x - tw / 2, y - th, tw, th), L.stone, L.stoneShade, -tw * 0.18, 0);
        ctx.strokeStyle = 'rgba(20,40,80,0.25)';
        ctx.lineWidth = 1.5;
        for (let bx = x - tw / 2 + 36; bx < x + tw / 2; bx += 44) {
          ctx.beginPath();
          ctx.moveTo(bx, y - th + 8);
          ctx.lineTo(bx, y);
          ctx.stroke();
        }
        ctx.fillStyle = L.top;
        ctx.fillRect(x - tw / 2 - 6, y - th - 7, tw + 12, 9);
        // 邊上垂下來的雪
        ctx.fillStyle = L.snow;
        ctx.beginPath();
        ctx.moveTo(x - tw / 2 - 8, y - th - 8);
        ctx.lineTo(x + tw / 2 + 8, y - th - 8);
        for (let bx = x + tw / 2 + 8; bx > x - tw / 2 - 8; bx -= 12) ctx.lineTo(bx - 6, y - th + 2 + hash(bx) * 8);
        ctx.closePath();
        ctx.fill();
        y -= th + 8;
      }
      const topY = y;
      // 冰柱（左右各一，頂端斷裂）
      const pil = [];
      for (const side of [-1, 1]) {
        const px = x + side * 170 * s;
        const pw = 40 * s;
        const ph = 280 * s;
        const py = base - 30 * s;
        const path = (c) => {
          c.moveTo(px - pw / 2, py);
          c.lineTo(px - pw / 2, py - ph + 20 * s);
          c.lineTo(px - pw * 0.2, py - ph);
          c.lineTo(px + pw * 0.05, py - ph + 26 * s);
          c.lineTo(px + pw * 0.3, py - ph + 8 * s);
          c.lineTo(px + pw / 2, py - ph + 30 * s);
          c.lineTo(px + pw / 2, py);
          c.closePath();
        };
        const g = ctx.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0);
        g.addColorStop(0, L.ice[0]);
        g.addColorStop(0.45, L.ice[1]);
        g.addColorStop(1, L.ice[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        path(ctx);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - pw * 0.2, py - ph + 30 * s);
        ctx.lineTo(px - pw * 0.2, py - 10);
        ctx.stroke();
        fillShaded(ctx, (c) => c.rect(px - pw * 0.7, py - 10 * s, pw * 1.4, 26 * s), L.stone, L.stoneShade, -10, 0);
        ctx.fillStyle = L.snow;
        ctx.fillRect(px - pw * 0.75, py - 14 * s, pw * 1.5, 6 * s);
        pil.push([px, py - ph + 40 * s]);
      }
      // 兩柱之間的注連繩與大鈴
      const P0 = [pil[0][0] + 16 * s, pil[0][1]];
      const P1 = [pil[1][0] - 16 * s, pil[1][1]];
      const C = [x, pil[0][1] + 70 * s];
      ctx.strokeStyle = '#f2ead8';
      ctx.lineWidth = 7 * s;
      ctx.beginPath();
      ctx.moveTo(P0[0], P0[1]);
      ctx.quadraticCurveTo(C[0], C[1], P1[0], P1[1]);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160,130,90,0.6)';
      ctx.lineWidth = 1.5;
      for (let k = 1; k < 16; k++) {
        const q = quadAt(P0, C, P1, k / 16);
        ctx.beginPath();
        ctx.moveTo(q[0] - 4 * s, q[1] - 3 * s);
        ctx.lineTo(q[0] + 4 * s, q[1] + 3 * s);
        ctx.stroke();
      }
      for (const u of [0.2, 0.5, 0.8]) {
        const q = quadAt(P0, C, P1, u);
        ctx.strokeStyle = '#c8302a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(q[0], q[1]);
        ctx.lineTo(q[0], q[1] + 22 * s);
        ctx.stroke();
        tinyBell(ctx, q[0], q[1] + 32 * s, 11 * s, '#bfe6ff', '#6aa6d6');
        glints.push({ x: q[0] - 4, y: q[1] + 26 * s, p: u * 9 });
      }
      for (const u of [0.1, 0.35, 0.65, 0.9]) {
        const q = quadAt(P0, C, P1, u);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(q[0] - 4, q[1]);
        ctx.lineTo(q[0] + 4, q[1]);
        ctx.lineTo(q[0] + 2, q[1] + 10 * s);
        ctx.lineTo(q[0] + 6, q[1] + 10 * s);
        ctx.lineTo(q[0] + 3, q[1] + 22 * s);
        ctx.lineTo(q[0] - 3, q[1] + 12 * s);
        ctx.closePath();
        ctx.fill();
      }
      // 浮在上方的巨大冰晶
      const cy = topY - 110 * s;
      softGlow(ctx, x, cy, 170 * s, L.glowRgb, 0.55);
      const cw = 52 * s;
      const top = cy - 130 * s;
      const bot = cy + 80 * s;
      ctx.fillStyle = L.ice[1];
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + cw, cy - 20 * s);
      ctx.lineTo(x, bot);
      ctx.lineTo(x - cw, cy - 20 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = L.ice[0];
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x - cw, cy - 20 * s);
      ctx.lineTo(x - cw * 0.2, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = L.ice[2];
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + cw, cy - 20 * s);
      ctx.lineTo(x, bot);
      ctx.lineTo(x + cw * 0.15, cy - 10 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - cw * 0.55, cy - 40 * s);
      ctx.lineTo(x - cw * 0.15, cy - 100 * s);
      ctx.stroke();
      // 周圍的小碎晶
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * PI2 + 0.3;
        const px = x + Math.cos(a) * 100 * s;
        const py = cy + Math.sin(a) * 50 * s - 10;
        const ss = (8 + rnd() * 8) * s;
        ctx.fillStyle = k % 2 ? L.ice[0] : L.ice[1];
        ctx.beginPath();
        ctx.moveTo(px, py - ss * 1.6);
        ctx.lineTo(px + ss * 0.6, py);
        ctx.lineTo(px, py + ss);
        ctx.lineTo(px - ss * 0.6, py);
        ctx.closePath();
        ctx.fill();
        glints.push({ x: px, y: py - ss * 0.4, p: rnd() * 6 });
      }
      // 台前的冰刺
      for (let k = 0; k < 12; k++) {
        const px = x + (k < 6 ? -1 : 1) * (200 + rnd() * 160) * s;
        const hh = (20 + rnd() * 50) * s;
        ctx.fillStyle = k % 2 ? L.ice[1] : L.ice[0];
        ctx.beginPath();
        ctx.moveTo(px - 8 * s, base + 4);
        ctx.lineTo(px + (rnd() - 0.5) * 10, base - hh);
        ctx.lineTo(px + 8 * s, base + 4);
        ctx.closePath();
        ctx.fill();
      }
      glows.push({ x, y: cy - 20 * s, r: 150 * s, p: 0 });
      return [{ type: 'glows', pts: glows, rgb: L.glowRgb, a: 0.35, sp: 1.3 }, { type: 'glint', pts: glints }];
    },
    // 雲海
    cloudSea(ctx, L, rnd, h) {
      const base = h * L.base;
      const g = ctx.createLinearGradient(0, base, 0, h);
      g.addColorStop(0, L.colors[0]);
      g.addColorStop(1, L.colors[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, base + 14, TW, h - base);
      const rows = L.rows || 3;
      for (let row = 0; row < rows; row++) {
        const y = base + row * L.r * 0.65;
        const puffs = [];
        let x = rnd() * 30;
        while (x < TW) {
          const r = L.r * (0.55 + rnd() * 0.6) * (1 - row * 0.12);
          puffs.push([x, y - r * 0.25 + rnd() * 10, r]);
          x += r * (0.95 + rnd() * 0.5);
        }
        const fillPuffs = (col, dx, dy, k) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          for (const [px, py, r] of puffs) {
            for (const ox of [0, -TW, TW]) {
              const cx = px + ox + dx;
              if (cx < -r - 10 || cx > TW + r + 10) continue;
              ctx.moveTo(cx + r * k, py + dy);
              ctx.arc(cx, py + dy, r * k, 0, PI2);
            }
          }
          ctx.fill();
        };
        fillPuffs(L.shade, 3, 8, 1);
        fillPuffs(row === rows - 1 ? L.colors[0] : L.colors[0], 0, 0, 0.94);
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.globalAlpha = 0.7;
        fillPuffs(L.hi, -4, -5, 0.55);
        ctx.globalAlpha = 1;
        fillPuffs(L.colors[0], 2, 6, 0.8);
        // 雲底
        ctx.fillStyle = L.colors[0];
        ctx.fillRect(0, y + L.r * 0.3, TW, L.r);
      }
    },
    // 天上緩緩轉動的鐘環（只畫在動畫裡）
    clockRings(ctx, L, rnd, h) {
      return L.rings.map(([fx, fy, r, sp]) => ({ type: 'spin', img: ringSprite(r, L.color), x: TW * fx, y: h * fy, sp, a: L.alpha, p: rnd() * 6 }));
    },
    // 浮空神殿與小浮島
    temple(ctx, L, rnd, h) {
      const x = TW * L.x;
      const y = h * L.base;
      const s = L.s;
      softGlow(ctx, x, y - 140 * s, 460 * s, L.glowRgb, L.glowA || 0.5);
      const kinds = ['cols', 'arch', 'tree', null, 'cols'];
      for (let i = 0; i < (L.isles || 0); i++) {
        let ix = rnd() * TW;
        if (Math.abs(ix - x) < 330 * s) ix = x + (ix < x ? -1 : 1) * (330 * s + rnd() * 200);
        const iy = y - 250 * s + rnd() * 260 * s;
        const iw = 60 + rnd() * 80;
        const seed = Math.floor(rnd() * 1e6);
        const kind = kinds[i % kinds.length];
        ctx.globalAlpha = 0.85;
        wrap2(((ix % TW) + TW) % TW, iw, (xx) => drawIsle(ctx, L, xx, iy, iw, seed, kind));
        ctx.globalAlpha = 1;
      }
      drawIsle(ctx, L, x, y + 2, 520 * s, 4242, null);
      drawTempleBuilding(ctx, L, x, y - 4, s);
    },
    // 前庭的欄杆：瓶形欄柱、台座上的壺與金燈
    balustrade(ctx, L, rnd, h) {
      const base = h * L.base;
      const s = L.s;
      const railH = 46 * s;
      const glows = [];
      // 下方的牆
      const g = ctx.createLinearGradient(0, base + railH, 0, h);
      g.addColorStop(0, L.wall);
      g.addColorStop(1, L.shade);
      ctx.fillStyle = g;
      ctx.fillRect(0, base + railH, TW, h);
      ctx.strokeStyle = 'rgba(120,100,80,0.2)';
      ctx.lineWidth = 1.5;
      for (let y = base + railH + 24, k = 0; y < h; y += 24, k++) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(TW, y);
        ctx.stroke();
        for (let x = (k % 2) * 40; x < TW; x += 80) {
          ctx.beginPath();
          ctx.moveTo(x, y - 24);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = L.gold;
      ctx.fillRect(0, base + railH + 2, TW, 3);
      // 欄柱
      for (let x = 10; x < TW; x += 20 * s) {
        const bx = x;
        ctx.fillStyle = L.marble;
        ctx.beginPath();
        ctx.moveTo(bx - 4 * s, base + 6 * s);
        ctx.quadraticCurveTo(bx - 9 * s, base + 18 * s, bx - 6 * s, base + 28 * s);
        ctx.quadraticCurveTo(bx - 3 * s, base + 36 * s, bx - 6 * s, base + railH);
        ctx.lineTo(bx + 6 * s, base + railH);
        ctx.quadraticCurveTo(bx + 3 * s, base + 36 * s, bx + 6 * s, base + 28 * s);
        ctx.quadraticCurveTo(bx + 9 * s, base + 18 * s, bx + 4 * s, base + 6 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = L.shade;
        ctx.fillRect(bx + 1.5 * s, base + 8 * s, 3 * s, railH - 10 * s);
      }
      // 扶手
      ctx.fillStyle = L.marble;
      ctx.fillRect(0, base - 4 * s, TW, 11 * s);
      ctx.fillStyle = L.shade;
      ctx.fillRect(0, base + 5 * s, TW, 3 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(0, base - 4 * s, TW, 2);
      // 台座
      const n = Math.round(TW / L.step);
      for (let i = 0; i < n; i++) {
        const px = (i + 0.5) * (TW / n);
        const pw = 30 * s;
        fillShaded(ctx, (c) => c.rect(px - pw / 2, base - 18 * s, pw, railH + 18 * s), L.marble, L.shade, -pw * 0.3, 0);
        ctx.fillStyle = L.marble;
        ctx.fillRect(px - pw / 2 - 4 * s, base - 24 * s, pw + 8 * s, 7 * s);
        ctx.fillStyle = L.gold;
        ctx.fillRect(px - pw / 2 - 4 * s, base - 18 * s, pw + 8 * s, 2 * s);
        ctx.beginPath();
        ctx.arc(px, base + 12 * s, 5 * s, 0, PI2);
        ctx.fill();
        if (i % 2) {
          // 金燈
          ctx.fillStyle = L.gold;
          ctx.fillRect(px - 2 * s, base - 64 * s, 4 * s, 40 * s);
          softGlow(ctx, px, base - 72 * s, 34 * s, L.glowRgb, 0.6);
          ctx.fillStyle = '#fff4cc';
          ctx.beginPath();
          ctx.arc(px, base - 72 * s, 8 * s, 0, PI2);
          ctx.fill();
          ctx.strokeStyle = L.gold;
          ctx.lineWidth = 2 * s;
          ctx.beginPath();
          ctx.arc(px, base - 72 * s, 10 * s, 0, PI2);
          ctx.stroke();
          glows.push({ x: px, y: base - 72 * s, r: 30 * s, p: rnd() });
        } else {
          // 壺與小樹
          ctx.fillStyle = L.marble;
          ctx.beginPath();
          ctx.moveTo(px - 8 * s, base - 24 * s);
          ctx.quadraticCurveTo(px - 16 * s, base - 38 * s, px - 9 * s, base - 46 * s);
          ctx.lineTo(px + 9 * s, base - 46 * s);
          ctx.quadraticCurveTo(px + 16 * s, base - 38 * s, px + 8 * s, base - 24 * s);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = L.gold;
          ctx.fillRect(px - 12 * s, base - 38 * s, 24 * s, 3 * s);
          ctx.fillStyle = '#7cae5a';
          ctx.beginPath();
          ctx.arc(px, base - 58 * s, 14 * s, 0, PI2);
          ctx.arc(px - 9 * s, base - 50 * s, 9 * s, 0, PI2);
          ctx.arc(px + 9 * s, base - 50 * s, 9 * s, 0, PI2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,220,0.25)';
          ctx.beginPath();
          ctx.arc(px - 4 * s, base - 62 * s, 7 * s, 0, PI2);
          ctx.fill();
        }
      }
      return [{ type: 'glows', pts: glows, rgb: L.glowRgb, a: 0.5 }];
    },
    // 回憶迴廊的拱廊
    arches(ctx, L, rnd, h) {
      const top = h * L.top;
      const spring = h * L.spring;
      const aw = L.aw;
      const pitch = TW / L.n;
      const glows = [];
      const g = ctx.createLinearGradient(0, top, 0, h);
      g.addColorStop(0, L.marble);
      g.addColorStop(1, L.shade);
      ctx.fillStyle = g;
      ctx.fillRect(0, top, TW, h - top);
      // 牆面的石塊
      ctx.strokeStyle = 'rgba(120,100,90,0.18)';
      ctx.lineWidth = 1.5;
      for (let y = top + 30, k = 0; y < h; y += 30, k++) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(TW, y);
        ctx.stroke();
        for (let x = (k % 2) * 36; x < TW; x += 72) {
          ctx.beginPath();
          ctx.moveTo(x, y - 30);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
      // 挖出拱門
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < L.n; i++) {
        const cx = i * pitch + pitch / 2;
        ctx.beginPath();
        ctx.moveTo(cx - aw / 2, h + 10);
        ctx.lineTo(cx - aw / 2, spring);
        ctx.arc(cx, spring, aw / 2, Math.PI, 0);
        ctx.lineTo(cx + aw / 2, h + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      for (let i = 0; i < L.n; i++) {
        const cx = i * pitch + pitch / 2;
        // 拱的內側厚度（看得到一點深度）
        ctx.fillStyle = L.dark;
        ctx.beginPath();
        ctx.moveTo(cx + aw / 2, h);
        ctx.lineTo(cx + aw / 2, spring);
        ctx.arc(cx, spring, aw / 2, 0, -Math.PI * 0.5, true);
        ctx.lineTo(cx, spring - aw / 2 + 12);
        ctx.arc(cx, spring, aw / 2 - 12, -Math.PI * 0.5, 0);
        ctx.lineTo(cx + aw / 2 - 12, h);
        ctx.closePath();
        ctx.fill();
        // 拱石
        ctx.strokeStyle = L.marble;
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.arc(cx, spring, aw / 2 + 8, Math.PI, 0);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(120,100,90,0.3)';
        ctx.lineWidth = 1.5;
        for (let k = 1; k < 12; k++) {
          const a = Math.PI + (k / 12) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * aw / 2, spring + Math.sin(a) * aw / 2);
          ctx.lineTo(cx + Math.cos(a) * (aw / 2 + 16), spring + Math.sin(a) * (aw / 2 + 16));
          ctx.stroke();
        }
        ctx.strokeStyle = L.gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, spring, aw / 2 + 17, Math.PI, 0);
        ctx.stroke();
        // 金色拱心石
        ctx.fillStyle = L.gold;
        ctx.beginPath();
        ctx.moveTo(cx - 10, spring - aw / 2 - 20);
        ctx.lineTo(cx + 10, spring - aw / 2 - 20);
        ctx.lineTo(cx + 7, spring - aw / 2 + 2);
        ctx.lineTo(cx - 7, spring - aw / 2 + 2);
        ctx.closePath();
        ctx.fill();
        // 從拱頂垂下的燈
        const ly = spring - aw / 2 + 60;
        ctx.strokeStyle = L.gold;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, spring - aw / 2 + 2);
        ctx.lineTo(cx, ly - 10);
        ctx.stroke();
        softGlow(ctx, cx, ly, 40, L.glowRgb, 0.5);
        ctx.fillStyle = L.gold;
        ctx.beginPath();
        ctx.moveTo(cx - 9, ly - 10);
        ctx.lineTo(cx + 9, ly - 10);
        ctx.lineTo(cx + 6, ly + 8);
        ctx.lineTo(cx - 6, ly + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff4cc';
        ctx.fillRect(cx - 4, ly - 6, 8, 11);
        glows.push({ x: cx, y: ly, r: 34, p: rnd() });
        // 柱子（半柱）
        const px = i * pitch;
        const pw = (pitch - aw) * 0.55;
        for (const xx of px === 0 ? [0, TW] : [px]) {
          fillShaded(ctx, (c) => c.rect(xx - pw / 2, top + 16, pw, h - top), L.marble, L.shade, -pw * 0.3, 0);
          ctx.strokeStyle = 'rgba(120,100,90,0.25)';
          for (const f of [-0.3, -0.1, 0.1, 0.3]) {
            ctx.beginPath();
            ctx.moveTo(xx + f * pw, top + 40);
            ctx.lineTo(xx + f * pw, h);
            ctx.stroke();
          }
          ctx.fillStyle = L.marble;
          ctx.fillRect(xx - pw / 2 - 8, spring - 8, pw + 16, 12);
          ctx.fillStyle = L.gold;
          ctx.fillRect(xx - pw / 2 - 8, spring + 2, pw + 16, 3);
        }
      }
      // 楣與簷口
      ctx.fillStyle = L.marble;
      ctx.fillRect(0, top - 10, TW, 30);
      ctx.fillStyle = L.shade;
      ctx.fillRect(0, top + 14, TW, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(0, top - 10, TW, 3);
      // 金色回紋
      ctx.strokeStyle = L.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < TW; x += 16) {
        ctx.moveTo(x, top + 8);
        ctx.lineTo(x, top);
        ctx.lineTo(x + 10, top);
        ctx.lineTo(x + 10, top + 5);
        ctx.lineTo(x + 5, top + 5);
        ctx.moveTo(x + 10, top + 8);
        ctx.lineTo(x + 16, top + 8);
      }
      ctx.stroke();
      // 斷掉的簷口：幾處缺一角，露出時間的裂縫
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 3; i++) {
        const bx = rnd() * TW;
        ctx.beginPath();
        ctx.moveTo(bx - 40, top - 12);
        ctx.lineTo(bx + 50, top - 12);
        ctx.lineTo(bx + 30, top + 2);
        ctx.lineTo(bx + 10, top - 4);
        ctx.lineTo(bx - 14, top + 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      return [{ type: 'glows', pts: glows, rgb: L.glowRgb, a: 0.45 }];
    },
    // 回憶碎片：前面各章的風景浮在空中慢慢漂
    fragments(ctx, L, rnd, h) {
      // 遠處的小石片
      for (let i = 0; i < (L.shards || 0); i++) {
        const x = rnd() * TW;
        const y = h * (0.15 + rnd() * 0.5);
        const s = 5 + rnd() * 12;
        ctx.fillStyle = 'rgba(180,150,170,0.45)';
        ctx.beginPath();
        ctx.moveTo(x - s, y);
        ctx.lineTo(x + s, y - s * 0.2);
        ctx.lineTo(x + s * 0.2, y + s * 1.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,240,210,0.6)';
        ctx.fillRect(x - s, y - 2, s * 2, 2);
      }
      const pts = L.kinds.map((kind, i) => {
        const w = rr(rnd, L.w);
        const x = ((i + 0.5) / L.kinds.length) * TW + (rnd() - 0.5) * 60;
        const y = h * rr(rnd, [L.y0, L.y1]) + (i % 2 ? 40 : -20);
        return { x, y, img: fragmentSprite(kind, w, 900 + i * 37), p: rnd() * 6, amp: 5 + rnd() * 5 };
      });
      return [{ type: 'bob', pts }];
    },
    // 上下顛倒：把另一種層翻過來畫
    flip(ctx, L, rnd, h) {
      ctx.save();
      ctx.translate(0, h);
      ctx.scale(1, -1);
      LAYER[L.of.type](ctx, L.of, rnd, h);
      ctx.restore();
    },
    // 倒轉的沙漏：沙往上流
    hourglass(ctx, L, rnd, h) {
      const x = TW * L.x;
      const base = h * L.base;
      const s = L.s;
      const H = 300 * s;
      const W = 150 * s;
      const top = base - H;
      const mid = base - H / 2;
      softGlow(ctx, x, mid, 300 * s, L.glowRgb, 0.45);
      const glass = (c) => {
        c.moveTo(x - W * 0.42, top + 22 * s);
        c.bezierCurveTo(x - W * 0.52, top + H * 0.3, x - 10 * s, mid - 30 * s, x - 6 * s, mid);
        c.bezierCurveTo(x - 10 * s, mid + 30 * s, x - W * 0.52, base - H * 0.3, x - W * 0.42, base - 22 * s);
        c.lineTo(x + W * 0.42, base - 22 * s);
        c.bezierCurveTo(x + W * 0.52, base - H * 0.3, x + 10 * s, mid + 30 * s, x + 6 * s, mid);
        c.bezierCurveTo(x + 10 * s, mid - 30 * s, x + W * 0.52, top + H * 0.3, x + W * 0.42, top + 22 * s);
        c.closePath();
      };
      // 後面的柱
      ctx.fillStyle = L.goldShade;
      ctx.fillRect(x - 5 * s, top + 10 * s, 10 * s, H - 20 * s);
      ctx.fillStyle = 'rgba(220,240,255,0.3)';
      ctx.beginPath();
      glass(ctx);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      glass(ctx);
      ctx.clip();
      // 上半部：沙堆倒掛在頂上（往上堆）
      ctx.fillStyle = L.sand;
      ctx.beginPath();
      ctx.moveTo(x - W, top);
      ctx.lineTo(x + W, top);
      ctx.lineTo(x + W, top + H * 0.2);
      ctx.quadraticCurveTo(x + W * 0.2, top + H * 0.22, x, top + H * 0.33);
      ctx.quadraticCurveTo(x - W * 0.2, top + H * 0.22, x - W, top + H * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(180,120,50,0.25)';
      ctx.fillRect(x - W, top + H * 0.14, W * 2, 4 * s);
      // 下半部：剩一點沙，中間凹下去（往上被吸走）
      ctx.fillStyle = L.sand;
      ctx.beginPath();
      ctx.moveTo(x - W, base);
      ctx.lineTo(x - W, base - H * 0.12);
      ctx.quadraticCurveTo(x - W * 0.25, base - H * 0.14, x, base - H * 0.08);
      ctx.quadraticCurveTo(x + W * 0.25, base - H * 0.14, x + W, base - H * 0.12);
      ctx.lineTo(x + W, base);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      glass(ctx);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - W * 0.3, top + 40 * s);
      ctx.quadraticCurveTo(x - W * 0.38, top + H * 0.25, x - W * 0.2, mid - 40 * s);
      ctx.moveTo(x - W * 0.3, base - 40 * s);
      ctx.quadraticCurveTo(x - W * 0.36, base - H * 0.22, x - W * 0.24, base - H * 0.32);
      ctx.stroke();
      ctx.lineCap = 'butt';
      // 框：上下金盤、兩根扭柱
      for (const side of [-1, 1]) {
        const px = x + side * W * 0.56;
        ctx.fillStyle = L.gold;
        ctx.fillRect(px - 6 * s, top + 8 * s, 12 * s, H - 16 * s);
        ctx.strokeStyle = L.goldShade;
        ctx.lineWidth = 2;
        for (let y = top + 16 * s; y < base - 16 * s; y += 14 * s) {
          ctx.beginPath();
          ctx.moveTo(px - 6 * s, y);
          ctx.lineTo(px + 6 * s, y + 7 * s);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(px - 4 * s, top + 10 * s, 2 * s, H - 20 * s);
      }
      for (const py of [top, base - 20 * s]) {
        fillShaded(ctx, (c) => A.roundRect(c, x - W * 0.72, py, W * 1.44, 20 * s, 6 * s), L.gold, L.goldShade, 0, -6 * s);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(x - W * 0.66, py + 3 * s, W * 1.3, 2 * s);
      }
      ctx.fillStyle = L.gold;
      ctx.beginPath();
      ctx.arc(x, top - 8 * s, 10 * s, 0, PI2);
      ctx.fill();
      return [{ type: 'sandUp', x, y0: base - H * 0.1, y1: top + H * 0.3, color: L.sand }];
    },
    // 星空＋星座
    stars(ctx, L, rnd, h) {
      const pts = [];
      for (let i = 0; i < L.n; i++) {
        const x = rnd() * TW;
        const y = rnd() * h;
        const big = rnd() < 0.08;
        const r = big ? 1.4 + rnd() * 1.2 : 0.5 + rnd() * 1;
        ctx.globalAlpha = 0.35 + rnd() * 0.65;
        ctx.fillStyle = L.colors[Math.floor(rnd() * L.colors.length)];
        ctx.beginPath();
        ctx.arc(x, y, r, 0, PI2);
        ctx.fill();
        if (big) {
          ctx.globalAlpha = 0.5;
          ctx.fillRect(x - r * 4, y - 0.5, r * 8, 1);
          ctx.fillRect(x - 0.5, y - r * 4, 1, r * 8);
        }
        if (rnd() < 0.1 && x > 10 && x < TW - 10) pts.push({ x, y, p: rnd() * 6 });
      }
      ctx.globalAlpha = 1;
      for (let c = 0; c < (L.cons || 0); c++) {
        let x = TW * ((c + 0.3 + rnd() * 0.4) / L.cons);
        let y = h * (0.1 + rnd() * 0.35);
        const star = [[x, y]];
        const m = 4 + Math.floor(rnd() * 3);
        let a = rnd() * PI2;
        for (let k = 1; k < m; k++) {
          a += (rnd() - 0.5) * 2;
          x += Math.cos(a) * (40 + rnd() * 40);
          y += Math.sin(a) * (30 + rnd() * 30);
          star.push([x, y]);
        }
        ctx.strokeStyle = L.line;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        star.forEach(([sx, sy], k) => (k ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy)));
        ctx.stroke();
        for (const [sx, sy] of star) {
          softGlow(ctx, sx, sy, 9, '220,230,255', 0.6);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 2, 0, PI2);
          ctx.fill();
          if (sx > 10 && sx < TW - 10) pts.push({ x: sx, y: sy, p: rnd() * 6 });
        }
      }
      return [{ type: 'glint', pts }];
    },
    // 星雲與銀河帶
    nebula(ctx, L, rnd, h) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n);
        const y = h * rr(rnd, [L.y0, L.y1]);
        const col = L.colors[i % L.colors.length];
        for (let k = 0; k < 6; k++) {
          const bx = x + (rnd() - 0.5) * 260;
          const by = y + (rnd() - 0.5) * 120;
          const r = 60 + rnd() * 140;
          wrap2(bx, r, (xx) => softGlow(ctx, xx, by, r, col, 0.14 + rnd() * 0.08));
        }
      }
      // 銀河帶
      const p = rnd() * 6;
      for (let i = 0; i < 700; i++) {
        const x = rnd() * TW;
        const yc = h * (0.35 + Math.sin((x / TW) * PI2 + p) * 0.18);
        const y = yc + (rnd() + rnd() + rnd() - 1.5) * 60;
        ctx.fillStyle = 'rgba(220,210,255,' + (0.1 + rnd() * 0.3).toFixed(2) + ')';
        ctx.fillRect(x, y, 1.2, 1.2);
      }
      ctx.restore();
    },
    // 盤旋而上的星之階梯
    stairs(ctx, L, rnd, h) {
      const pts = [];
      for (const [fx, fy, R, n, sc] of L.spirals) {
        const cx = TW * fx;
        const base = h * fy;
        const rise = 17 * sc;
        const steps = [];
        for (let k = 0; k < n; k++) {
          const u = k / n;
          const a = k * 0.42;
          steps.push({ x: cx + Math.cos(a) * R * (1 - u * 0.5), y: base - k * rise * (1 - u * 0.35), z: Math.sin(a), s: sc * (1 - u * 0.55) });
        }
        const topStep = steps[steps.length - 1];
        // 中央的光柱
        const g = ctx.createLinearGradient(0, topStep.y - 60, 0, base);
        g.addColorStop(0, 'rgba(' + L.glowRgb + ',0.35)');
        g.addColorStop(1, 'rgba(' + L.glowRgb + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - 14 * sc, topStep.y - 60, 28 * sc, base - topStep.y + 60);
        steps.sort((a, b) => a.z - b.z);
        for (const st of steps) {
          const w = 74 * st.s;
          const d = 12 * st.s;
          const t = 9 * st.s;
          softGlow(ctx, st.x, st.y + t + 4, w * 0.6, L.glowRgb, 0.18);
          ctx.fillStyle = L.front;
          ctx.fillRect(st.x - w / 2, st.y, w, t);
          ctx.fillStyle = L.top;
          ctx.beginPath();
          ctx.moveTo(st.x - w / 2, st.y);
          ctx.lineTo(st.x - w / 2 + d, st.y - d * 0.7);
          ctx.lineTo(st.x + w / 2 + d, st.y - d * 0.7);
          ctx.lineTo(st.x + w / 2, st.y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = L.glow;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(st.x - w / 2, st.y + 0.5);
          ctx.lineTo(st.x + w / 2, st.y + 0.5);
          ctx.stroke();
          if (st.z < 0) {
            ctx.fillStyle = 'rgba(10,8,40,' + (-st.z * 0.45).toFixed(2) + ')';
            ctx.fillRect(st.x - w / 2 - 1, st.y - d, w + d + 2, t + d + 1);
          }
          if (rnd() < 0.3) pts.push({ x: st.x + w / 2, y: st.y, p: rnd() * 6 });
        }
        // 頂端的星門
        softGlow(ctx, topStep.x, topStep.y - 40 * sc, 90 * sc, L.glowRgb, 0.6);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const sx = topStep.x;
        const sy = topStep.y - 40 * sc;
        const ss = 18 * sc;
        ctx.moveTo(sx, sy - ss * 1.6);
        ctx.quadraticCurveTo(sx, sy, sx + ss, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy + ss * 1.6);
        ctx.quadraticCurveTo(sx, sy, sx - ss, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy - ss * 1.6);
        ctx.fill();
      }
      return [{ type: 'glint', pts }];
    },
    // 漂浮的石階碎片
    slabs(ctx, L, rnd, h) {
      const glows = [];
      ctx.globalAlpha = L.alpha || 1;
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * TW + rnd() * (TW / L.n) * 0.6;
        const y = h * rr(rnd, [L.y0, L.y1]);
        const w = 70 + rnd() * 80;
        const t = 12 + rnd() * 8;
        const dep = 26 + rnd() * 30;
        const j = [rnd(), rnd(), rnd()];
        wrap2(x, w, (xx) => {
          softGlow(ctx, xx, y + t, w * 0.7, L.glowRgb, 0.22);
          ctx.fillStyle = L.rock;
          ctx.beginPath();
          ctx.moveTo(xx - w / 2, y + t);
          ctx.lineTo(xx - w * 0.2, y + t + dep * (0.5 + j[0] * 0.3));
          ctx.lineTo(xx + w * (j[1] - 0.5) * 0.3, y + t + dep);
          ctx.lineTo(xx + w * 0.25, y + t + dep * (0.4 + j[2] * 0.3));
          ctx.lineTo(xx + w / 2, y + t);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = L.front;
          ctx.fillRect(xx - w / 2, y, w, t);
          ctx.fillStyle = L.top;
          ctx.beginPath();
          ctx.moveTo(xx - w / 2, y);
          ctx.lineTo(xx - w / 2 + 10, y - 8);
          ctx.lineTo(xx + w / 2 + 10, y - 8);
          ctx.lineTo(xx + w / 2, y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(' + L.glowRgb + ',0.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(xx - w / 2 + 8, y + t * 0.5);
          ctx.lineTo(xx + w / 2 - 8, y + t * 0.5);
          ctx.stroke();
        });
        glows.push({ x, y: y + t, r: w * 0.4, p: rnd() });
      }
      ctx.globalAlpha = 1;
      return [{ type: 'glows', pts: glows, rgb: L.glowRgb, a: 0.2, sp: 1.2 }];
    },
    // 巨大的鐘面（指針在動畫裡）
    clockFace(ctx, L, rnd, h) {
      const x = TW * L.x;
      const y = h * L.y;
      const R = L.r;
      softGlow(ctx, x, y, R * 1.8, L.glowRgb, 0.35);
      // 外圈放射的尖角
      ctx.fillStyle = L.rim[1];
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * PI2;
        const r2 = R * (k % 2 ? 1.1 : 1.18);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a - 0.08) * R * 0.98, y + Math.sin(a - 0.08) * R * 0.98);
        ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
        ctx.lineTo(x + Math.cos(a + 0.08) * R * 0.98, y + Math.sin(a + 0.08) * R * 0.98);
        ctx.closePath();
        ctx.fill();
      }
      // 外框
      const rg = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.5, x, y, R);
      rg.addColorStop(0, L.rim[0]);
      rg.addColorStop(1, L.rim[1]);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, PI2);
      ctx.fill();
      // 鐘面
      const fg = ctx.createRadialGradient(x, y, 0, x, y, R * 0.88);
      fg.addColorStop(0, L.face[0]);
      fg.addColorStop(1, L.face[1]);
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.86, 0, PI2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, R * 0.86, 0, PI2);
      ctx.clip();
      for (let k = 0; k < 90; k++) {
        ctx.globalAlpha = 0.3 + rnd() * 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + (rnd() - 0.5) * R * 1.7, y + (rnd() - 0.5) * R * 1.7, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // 內圈
      ctx.strokeStyle = L.num;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      for (const k of [0.62, 0.4, 0.2]) {
        ctx.beginPath();
        ctx.arc(x, y, R * k, 0, PI2);
        ctx.stroke();
      }
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * PI2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * R * 0.2, y + Math.sin(a) * R * 0.2);
        ctx.lineTo(x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.62);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // 刻度與羅馬數字
      ctx.strokeStyle = L.num;
      for (let k = 0; k < 60; k++) {
        const a = (k / 60) * PI2;
        const big = k % 5 === 0;
        ctx.lineWidth = big ? 4 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * R * 0.85, y + Math.sin(a) * R * 0.85);
        ctx.lineTo(x + Math.cos(a) * R * (big ? 0.78 : 0.81), y + Math.sin(a) * R * (big ? 0.78 : 0.81));
        ctx.stroke();
      }
      ctx.fillStyle = L.num;
      ctx.font = 'bold ' + Math.round(R * 0.11) + 'px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * PI2 - Math.PI / 2;
        ctx.fillText(ROMAN[k], x + Math.cos(a) * R * 0.7, y + Math.sin(a) * R * 0.7);
      }
      // 外框上的裝飾圈
      ctx.strokeStyle = 'rgba(80,50,20,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.93, 0, PI2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,220,0.8)';
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * PI2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * R * 0.93, y + Math.sin(a) * R * 0.93, 2.5, 0, PI2);
        ctx.fill();
      }
      // 發光的裂痕
      ctx.strokeStyle = L.crack;
      ctx.lineCap = 'round';
      for (let c = 0; c < 3; c++) {
        let a = -0.6 + c * 2.1 + rnd() * 0.4;
        let px = x + Math.cos(a) * R;
        let py = y + Math.sin(a) * R;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let k = 0; k < 5; k++) {
          a += (rnd() - 0.5) * 1.2;
          px -= Math.cos(a) * R * 0.1;
          py -= Math.sin(a) * R * 0.1;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      return [{ type: 'hands', x, y, R, col: L.hand }];
    },
    // 背後的齒輪（旋轉）
    gears(ctx, L, rnd, h) {
      return L.list.map(([fx, fy, r, sp]) => ({ type: 'spin', img: gearSprite(r, L), x: TW * fx, y: h * fy, sp, a: L.alpha, p: rnd() * 6 }));
    },
    // 時之王座：台階＋高背王座
    throne(ctx, L, rnd, h) {
      const x = TW * L.x;
      const base = h * L.base;
      const s = L.s;
      // 地板
      const fg = ctx.createLinearGradient(0, base, 0, h);
      fg.addColorStop(0, L.floor);
      fg.addColorStop(1, '#120c20');
      ctx.fillStyle = fg;
      ctx.fillRect(0, base, TW, h - base);
      ctx.strokeStyle = 'rgba(232,184,74,0.35)';
      ctx.lineWidth = 1.5;
      for (let k = -12; k <= 12; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * 60, base);
        ctx.lineTo(x + k * 140, h);
        ctx.stroke();
      }
      ctx.fillStyle = L.gold;
      ctx.fillRect(0, base, TW, 2);
      softGlow(ctx, x, base - 190 * s, 260 * s, L.glowRgb, 0.5);
      // 台階
      let y = base;
      for (let k = 0; k < 4; k++) {
        const w = (420 - k * 70) * s;
        const th = 16 * s;
        fillShaded(ctx, (c) => c.rect(x - w / 2, y - th, w, th), L.stone, L.stoneShade, -w * 0.2, 0);
        ctx.fillStyle = L.gold;
        ctx.fillRect(x - w / 2, y - th, w, 2.5 * s);
        y -= th;
      }
      const seat = y;
      // 椅背：尖拱形的高背
      const bw = 70 * s;
      const bh = 250 * s;
      const back = (c) => {
        c.moveTo(x - bw, seat);
        c.lineTo(x - bw, seat - bh * 0.62);
        c.quadraticCurveTo(x - bw, seat - bh * 0.92, x, seat - bh);
        c.quadraticCurveTo(x + bw, seat - bh * 0.92, x + bw, seat - bh * 0.62);
        c.lineTo(x + bw, seat);
        c.closePath();
      };
      fillShaded(ctx, back, L.stone, L.stoneShade, -bw * 0.4, 0);
      ctx.strokeStyle = L.gold;
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      back(ctx);
      ctx.stroke();
      // 椅背上的小鐘
      const cy = seat - bh * 0.68;
      ctx.fillStyle = '#1c1636';
      ctx.beginPath();
      ctx.arc(x, cy, 34 * s, 0, PI2);
      ctx.fill();
      ctx.lineWidth = 3 * s;
      ctx.stroke();
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * PI2;
        ctx.fillStyle = L.gold;
        ctx.fillRect(x + Math.cos(a) * 27 * s - 1.5, cy + Math.sin(a) * 27 * s - 1.5, 3, 3);
      }
      softGlow(ctx, x, cy, 30 * s, L.glowRgb, 0.7);
      // 內襯
      ctx.fillStyle = '#5a2e8a';
      ctx.beginPath();
      A.roundRect(ctx, x - bw * 0.62, seat - bh * 0.5, bw * 1.24, bh * 0.44, 10 * s);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x - bw * 0.5, seat - bh * 0.48, bw * 0.3, bh * 0.4);
      // 座面與扶手
      fillShaded(ctx, (c) => c.rect(x - bw * 1.25, seat - 40 * s, bw * 2.5, 40 * s), L.stone, L.stoneShade, -bw * 0.5, 0);
      ctx.fillStyle = '#6a3aa0';
      ctx.fillRect(x - bw * 0.9, seat - 50 * s, bw * 1.8, 12 * s);
      for (const side of [-1, 1]) {
        const ax = x + side * bw * 1.12;
        fillShaded(ctx, (c) => A.roundRect(c, ax - 14 * s, seat - 86 * s, 28 * s, 50 * s, 8 * s), L.stone, L.stoneShade, -6 * s, 0);
        ctx.fillStyle = L.gold;
        ctx.beginPath();
        ctx.arc(ax, seat - 86 * s, 12 * s, 0, PI2);
        ctx.fill();
      }
      ctx.fillStyle = L.gold;
      ctx.fillRect(x - bw * 1.25, seat - 42 * s, bw * 2.5, 3 * s);
      // 頂上的星
      softGlow(ctx, x, seat - bh - 20 * s, 40 * s, '255,230,170', 0.8);
      ctx.fillStyle = '#fff6d8';
      const sy = seat - bh - 20 * s;
      const ss = 12 * s;
      ctx.beginPath();
      ctx.moveTo(x, sy - ss * 1.6);
      ctx.quadraticCurveTo(x, sy, x + ss, sy);
      ctx.quadraticCurveTo(x, sy, x, sy + ss * 1.6);
      ctx.quadraticCurveTo(x, sy, x - ss, sy);
      ctx.quadraticCurveTo(x, sy, x, sy - ss * 1.6);
      ctx.fill();
      // 飄在王座周圍的碎片
      const glows = [{ x, y: cy, r: 60 * s, p: 0 }];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * PI2;
        const px = x + Math.cos(a) * 170 * s;
        const py = seat - 140 * s + Math.sin(a) * 90 * s;
        const ss2 = (6 + rnd() * 6) * s;
        ctx.fillStyle = k % 2 ? '#d8c8ff' : L.gold;
        ctx.beginPath();
        ctx.moveTo(px, py - ss2 * 1.5);
        ctx.lineTo(px + ss2 * 0.6, py);
        ctx.lineTo(px, py + ss2);
        ctx.lineTo(px - ss2 * 0.6, py);
        ctx.closePath();
        ctx.fill();
      }
      return [{ type: 'glows', pts: glows, rgb: L.glowRgb, a: 0.4, sp: 1.2 }];
    },
    // 石獅像
    lions(ctx, L, rnd, h) {
      const base = h * L.base;
      for (const [fx, dir, s] of L.list) {
        const x = TW * fx;
        wrap2(x, 160 * s, (xx) => drawLionStatue(ctx, L, xx, base, s, dir));
      }
    },
  });

  // ── 第四章、終章的背景動畫 ──
  Object.assign(ANIM, {
    // 預先畫好的圖（鐘環、齒輪）繞中心慢慢轉
    spin(ctx, a, t) {
      ctx.save();
      ctx.globalAlpha = a.a == null ? 1 : a.a;
      ctx.translate(a.x, a.y);
      ctx.rotate(t * a.sp + (a.p || 0));
      ctx.drawImage(a.img, -a.img.width / 2, -a.img.height / 2);
      ctx.restore();
    },
    // 燈火的呼吸光（貼預先畫好的柔光圓）
    glows(ctx, a, t) {
      const img = glowSprite(a.rgb);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of a.pts) {
        ctx.globalAlpha = (a.a || 0.5) * (0.7 + 0.3 * Math.sin(t * (a.sp || 2.2) + p.p * 6));
        ctx.drawImage(img, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      ctx.restore();
    },
    // 冰瀑表面往下滑的反光
    shimmer(ctx, a, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of a.pts) {
        for (let k = 0; k < 2; k++) {
          const ph = (t * 0.18 + p.p + k * 0.5) % 1;
          const y = p.y0 + ph * (p.y1 - p.y0);
          const x = p.x + Math.sin(y * 0.02 + p.p * 5) * p.w * 0.12;
          ctx.fillStyle = 'rgba(210,250,255,' + (Math.sin(ph * Math.PI) * 0.55).toFixed(3) + ')';
          ctx.beginPath();
          ctx.ellipse(x, y, 2.5, 22, 0, 0, PI2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
    // 浮在空中的回憶碎片上下漂
    bob(ctx, a, t) {
      for (const p of a.pts) {
        const x = p.x - p.img.width / 2 + Math.sin(t * 0.13 + p.p) * 12;
        const y = p.y - p.img.height / 2 + Math.sin(t * 0.5 + p.p) * p.amp;
        ctx.drawImage(p.img, x, y);
      }
    },
    // 巨鐘的指針：時針倒著走、分針正著走、秒針一格一格跳
    hands(ctx, a, t) {
      const draw = (ang, len, w) => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(ang);
        ctx.fillStyle = a.col;
        ctx.strokeStyle = 'rgba(30,16,40,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, len * 0.18);
        ctx.lineTo(-w, 0);
        ctx.lineTo(-w * 0.3, -len * 0.62);
        ctx.lineTo(-w * 0.9, -len * 0.72);
        ctx.lineTo(0, -len);
        ctx.lineTo(w * 0.9, -len * 0.72);
        ctx.lineTo(w * 0.3, -len * 0.62);
        ctx.lineTo(w, 0);
        ctx.lineTo(w * 0.5, len * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
      draw(1.1 - t * 0.03, a.R * 0.48, a.R * 0.05);
      draw(t * 0.2, a.R * 0.72, a.R * 0.035);
      const sec = Math.floor(t * 1.5) / 60 * PI2;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(sec);
      ctx.strokeStyle = 'rgba(255,200,150,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, a.R * 0.12);
      ctx.lineTo(0, -a.R * 0.8);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = a.col;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.R * 0.06, 0, PI2);
      ctx.fill();
      ctx.fillStyle = '#3a2250';
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.R * 0.025, 0, PI2);
      ctx.fill();
    },
    // 倒轉沙漏：沙從下往上流
    sandUp(ctx, a, t) {
      ctx.fillStyle = a.color;
      for (let k = 0; k < 16; k++) {
        const ph = (t * 0.5 + k / 16) % 1;
        const y = a.y0 - ph * (a.y0 - a.y1);
        const x = a.x + Math.sin(k * 3.1 + ph * 12) * (1.5 + (1 - Math.abs(ph - 0.5) * 2) * 0.5);
        ctx.fillRect(x - 1, y, 2, 3);
      }
    },
  });

  // ── 第四章的擺設 ──
  function snowCap(ctx, path) {
    A.shape(ctx, path, '#f6faff', '#cfdcee', { cel: [2, 1], lw: 2 });
  }
  Object.assign(PROP, {
    snowPine(ctx) {
      A.shape(ctx, (c) => c.rect(-4, -14, 8, 14), '#7a5a44', null, { lw: 2 });
      [[-12, 28, 22], [-28, 22, 20], [-43, 15, 18]].forEach(([y, hw, th]) => {
        A.shape(ctx, (c) => { c.moveTo(0, y - th); c.lineTo(hw, y); c.quadraticCurveTo(0, y - 5, -hw, y); c.closePath(); }, '#3f7a6a', '#2f5e56', { cel: [5, 0], lw: 2.2 });
        snowCap(ctx, (c) => { c.moveTo(0, y - th - 1); c.lineTo(hw * 0.55, y - th * 0.45); c.quadraticCurveTo(hw * 0.15, y - th * 0.32, 0, y - th * 0.42); c.quadraticCurveTo(-hw * 0.35, y - th * 0.2, -hw * 0.75, y - th * 0.24); c.closePath(); });
      });
    },
    snowRock(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-26, 0); c.lineTo(-20, -18); c.lineTo(-4, -26); c.lineTo(14, -22); c.lineTo(26, 0); c.closePath(); }, '#8a94a8', '#6a7488', { cel: [4, 2], lw: 2.4 });
      snowCap(ctx, (c) => { c.moveTo(-22, -14); c.lineTo(-20, -19); c.lineTo(-4, -28); c.lineTo(14, -24); c.lineTo(20, -12); c.quadraticCurveTo(12, -16, 6, -12); c.quadraticCurveTo(-2, -18, -8, -12); c.quadraticCurveTo(-14, -16, -22, -14); c.closePath(); });
    },
    snowman(ctx, t) {
      A.ellipse(ctx, 0, -16, 18, 16, '#f8fbff', '#d4e0f0', { lw: 2.4 });
      A.ellipse(ctx, 0, -40, 13, 12, '#f8fbff', '#d4e0f0', { lw: 2.4 });
      ctx.strokeStyle = '#6a4a34';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      const w = Math.sin(t * 2) * 2;
      ctx.beginPath();
      ctx.moveTo(-14, -26); ctx.lineTo(-28, -36 + w); ctx.moveTo(-24, -33 + w); ctx.lineTo(-28, -28 + w);
      ctx.moveTo(14, -26); ctx.lineTo(28, -34 - w);
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-12, -30); c.quadraticCurveTo(0, -26, 12, -30); c.lineTo(12, -26); c.quadraticCurveTo(0, -22, -12, -26); c.closePath(); }, '#e8584a', null, { lw: 1.8 });
      A.shape(ctx, (c) => { c.moveTo(6, -28); c.lineTo(12, -16); c.lineTo(4, -18); c.closePath(); }, '#e8584a', null, { lw: 1.6 });
      ctx.fillStyle = '#3a2a2a';
      ctx.beginPath(); ctx.arc(-4, -43, 1.8, 0, PI2); ctx.arc(5, -43, 1.8, 0, PI2); ctx.arc(0, -18, 1.6, 0, PI2); ctx.arc(0, -10, 1.6, 0, PI2); ctx.fill();
      A.shape(ctx, (c) => { c.moveTo(1, -39); c.lineTo(12, -37); c.lineTo(1, -35); c.closePath(); }, '#f28c38', null, { lw: 1.4 });
      A.shape(ctx, (c) => A.roundRect(c, -9, -60, 18, 10, 2), '#5a6a8a', '#46546e', { lw: 1.8 });
    },
    windBell(ctx, t) {
      A.shape(ctx, (c) => c.rect(-3, -64, 6, 64), '#7a5a44', '#5e4432', { cel: [2, 0], lw: 2 });
      A.shape(ctx, (c) => c.rect(-3, -64, 26, 5), '#7a5a44', null, { lw: 2 });
      snowCap(ctx, (c) => A.roundRect(c, -5, -69, 30, 6, 3));
      const sw = Math.sin(t * 2.3) * 0.25;
      ctx.save();
      ctx.translate(18, -59);
      ctx.rotate(sw);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 6); ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-7, 14); c.quadraticCurveTo(-7, 4, 0, 4); c.quadraticCurveTo(7, 4, 7, 14); c.closePath(); }, 'rgba(200,236,255,0.95)', null, { lw: 1.6 });
      ctx.strokeStyle = A.outline();
      ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, 20); ctx.stroke();
      A.shape(ctx, (c) => c.rect(-3, 20, 6, 14), '#ff9ab0', null, { lw: 1.2 });
      ctx.restore();
    },
    lanternPost(ctx, t) {
      A.shape(ctx, (c) => c.rect(-3, -70, 6, 70), '#6a4a3a', '#52382c', { cel: [2, 0], lw: 2 });
      A.shape(ctx, (c) => c.rect(-3, -70, 22, 5), '#6a4a3a', null, { lw: 2 });
      snowCap(ctx, (c) => A.roundRect(c, -5, -75, 26, 6, 3));
      const g = ctx.createRadialGradient(15, -50, 0, 15, -50, 40);
      g.addColorStop(0, 'rgba(255,190,110,' + (0.5 + Math.sin(t * 3.3) * 0.1).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(15, -50, 40, 0, PI2); ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(15, -65); ctx.lineTo(15, -60); ctx.stroke();
      A.ellipse(ctx, 15, -50, 9, 11, '#ee5a3a', '#c8402a', { lw: 2 });
      A.shape(ctx, (c) => c.rect(12, -57, 6, 14), '#ffe0a0', null, { noStroke: true });
      A.shape(ctx, (c) => c.rect(10, -62, 10, 3), '#3a2418', null, { lw: 1.2 });
      A.shape(ctx, (c) => c.rect(10, -40, 10, 3), '#3a2418', null, { lw: 1.2 });
    },
    woodpile(ctx) {
      A.shape(ctx, (c) => c.rect(-26, -30, 52, 30), '#6a4a34', null, { lw: 2.2 });
      for (const [x, y] of [[-17, -8], [-2, -8], [13, -8], [-10, -21], [5, -21]]) A.ellipse(ctx, x, y, 7, 7, '#e3be86', '#c9a068', { lw: 1.8, hl: false });
      snowCap(ctx, (c) => { c.moveTo(-28, -28); c.quadraticCurveTo(-20, -40, 0, -38); c.quadraticCurveTo(20, -40, 28, -28); c.quadraticCurveTo(10, -30, 0, -26); c.quadraticCurveTo(-12, -30, -28, -28); c.closePath(); });
    },
    frozenShrub(ctx) {
      ctx.strokeStyle = '#5a4a44';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (const [a, l] of [[-1.2, 26], [-0.6, 32], [0, 28], [0.5, 30], [1.1, 22]]) {
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.sin(a) * l, -Math.cos(a) * l);
        ctx.moveTo(Math.sin(a) * l * 0.6, -Math.cos(a) * l * 0.6);
        ctx.lineTo(Math.sin(a + 0.5) * l * 0.85, -Math.cos(a + 0.5) * l * 0.85);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(240,250,255,0.9)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      for (const [x, y] of [[-14, -18], [8, -24], [16, -14], [-4, -26]]) A.ellipse(ctx, x, y, 3, 3, '#e8384a', null, { lw: 1.2, hl: false });
      A.ellipse(ctx, 0, -2, 16, 5, '#f6faff', '#d4e0f0', { lw: 1.8, hl: false });
    },
    cairn(ctx, t) {
      A.ellipse(ctx, 0, -8, 18, 9, '#8a8e9e', '#6e7282', { lw: 2.2, hl: false });
      A.ellipse(ctx, 2, -22, 13, 7, '#9a9eae', '#7a7e8e', { lw: 2.2, hl: false });
      A.ellipse(ctx, 0, -33, 9, 5, '#8a8e9e', '#6e7282', { lw: 2, hl: false });
      snowCap(ctx, (c) => c.ellipse(0, -37, 8, 3, 0, 0, PI2));
      ctx.save();
      ctx.translate(12, -22);
      ctx.rotate(Math.sin(t * 2.6) * 0.3);
      ctx.strokeStyle = '#c8302a';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 9); ctx.stroke();
      A.ellipse(ctx, 0, 12, 4, 4, '#f2c75a', '#c89a3a', { lw: 1.4, hl: false });
      ctx.restore();
    },
    iceCrystal(ctx, t) {
      const glow = 0.45 + Math.sin(t * 2) * 0.15;
      const g = ctx.createRadialGradient(0, -18, 0, 0, -18, 40);
      g.addColorStop(0, 'rgba(150,230,255,' + glow.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(150,230,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -18, 40, 0, PI2); ctx.fill();
      [[-12, 24, -0.35], [2, 40, 0.05], [14, 22, 0.45], [-3, 16, -0.9]].forEach(([x, h, r]) => {
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-6, 0); c.lineTo(-6, -h * 0.72); c.lineTo(0, -h); c.lineTo(6, -h * 0.72); c.lineTo(6, 0); c.closePath(); }, '#c8f2ff', '#7ec8ea', { cel: [3, 0], lw: 2 });
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-3, -h * 0.65); ctx.stroke();
        ctx.restore();
      });
    },
    iceShard(ctx, t) {
      const glow = 0.4 + Math.sin(t * 1.6) * 0.15;
      const g = ctx.createRadialGradient(0, -24, 0, 0, -24, 50);
      g.addColorStop(0, 'rgba(130,210,255,' + glow.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(130,210,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -24, 50, 0, PI2); ctx.fill();
      [[-18, 30, 11, -0.45], [16, 36, 12, 0.35], [0, 60, 15, -0.05]].forEach(([x, h, w, r]) => {
        ctx.save();
        ctx.translate(x, 4);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-w / 2, 0); c.lineTo(-w / 2, -h * 0.6); c.lineTo(0, -h); c.lineTo(w / 2, -h * 0.6); c.lineTo(w / 2, 0); c.closePath(); }, '#bfeaff', '#6aaee0', { cel: [w * 0.35, 0], lw: 2.2 });
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-w * 0.22, -4); ctx.lineTo(-w * 0.22, -h * 0.58); ctx.stroke();
        ctx.restore();
      });
    },
    icicleRock(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-30, 0); c.lineTo(-28, -24); c.lineTo(-10, -36); c.lineTo(20, -34); c.lineTo(34, -22); c.lineTo(30, 0); c.closePath(); }, '#5a6e8e', '#465a78', { cel: [4, 2], lw: 2.4 });
      snowCap(ctx, (c) => { c.moveTo(-28, -24); c.lineTo(-10, -38); c.lineTo(20, -36); c.lineTo(34, -22); c.lineTo(20, -24); c.lineTo(4, -28); c.lineTo(-12, -26); c.closePath(); });
      ctx.fillStyle = '#d8f2ff';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.2;
      for (const [x, l] of [[24, 12], [30, 8], [-20, 10], [-24, 6]]) {
        ctx.beginPath(); ctx.moveTo(x - 2.5, -22); ctx.lineTo(x + 2.5, -22); ctx.lineTo(x, -22 + l); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    },
    snowLantern(ctx, t) {
      PROP.stoneLantern(ctx, t);
      snowCap(ctx, (c) => { c.moveTo(-21, -47); c.quadraticCurveTo(0, -64, 21, -47); c.quadraticCurveTo(10, -51, 0, -50); c.quadraticCurveTo(-10, -51, -21, -47); c.closePath(); });
    },
    bellPost(ctx, t) {
      // 參道邊的鈴架：兩根柱子、橫木、一顆大鈴掛著紅白繩
      for (const x of [-22, 22]) A.shape(ctx, (c) => c.rect(x - 3, -72, 6, 72), '#d8452e', '#a83222', { cel: [2, 0], lw: 2 });
      A.shape(ctx, (c) => { c.moveTo(-32, -76); c.quadraticCurveTo(0, -70, 32, -76); c.lineTo(30, -70); c.quadraticCurveTo(0, -66, -30, -70); c.closePath(); }, '#2a1e2a', null, { lw: 2 });
      snowCap(ctx, (c) => { c.moveTo(-30, -77); c.quadraticCurveTo(0, -72, 30, -77); c.lineTo(28, -80); c.quadraticCurveTo(0, -76, -28, -80); c.closePath(); });
      const sw = Math.sin(t * 1.8) * 0.12;
      ctx.save();
      ctx.translate(0, -68);
      ctx.rotate(sw);
      A.shape(ctx, (c) => c.rect(-2, 0, 4, 10), '#f4f0e8', null, { lw: 1.2 });
      A.shape(ctx, (c) => { c.moveTo(-12, 26); c.quadraticCurveTo(-12, 10, 0, 10); c.quadraticCurveTo(12, 10, 12, 26); c.closePath(); }, '#f2c75a', '#c8962a', { cel: [3, 0], lw: 2 });
      A.shape(ctx, (c) => c.rect(-13, 24, 26, 4), '#c8962a', null, { lw: 1.6 });
      ctx.strokeStyle = '#c8302a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-2, 28); ctx.quadraticCurveTo(-4, 44, 0, 58); ctx.stroke();
      ctx.strokeStyle = '#f4f0e8';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(2, 28); ctx.quadraticCurveTo(0, 44, 4, 58); ctx.stroke();
      ctx.restore();
    },
    shrineBox(ctx) {
      A.shape(ctx, (c) => c.rect(-24, -26, 48, 26), '#8a5a3a', '#6e4630', { cel: [3, 0], lw: 2.3 });
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = -18; x <= 18; x += 6) { ctx.moveTo(x, -26); ctx.lineTo(x - 2, -18); }
      ctx.stroke();
      A.shape(ctx, (c) => c.rect(-24, -12, 48, 4), '#e8b84a', null, { lw: 1.4 });
      snowCap(ctx, (c) => { c.moveTo(-26, -26); c.quadraticCurveTo(0, -34, 26, -26); c.quadraticCurveTo(0, -28, -26, -26); c.closePath(); });
    },

    // ── 終章：神殿的擺設 ──
    urn(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -14, -8, 28, 8, 2), '#f4eee4', '#d8ccbc', { lw: 2 });
      A.shape(ctx, (c) => { c.moveTo(-6, -8); c.quadraticCurveTo(-22, -20, -14, -38); c.lineTo(-9, -44); c.lineTo(9, -44); c.lineTo(14, -38); c.quadraticCurveTo(22, -20, 6, -8); c.closePath(); }, '#fbf7ef', '#ddd2c2', { cel: [4, 0], lw: 2.3 });
      A.shape(ctx, (c) => c.rect(-17, -30, 34, 4), '#e8b84a', '#c0902e', { lw: 1.6 });
      A.shape(ctx, (c) => c.rect(-11, -48, 22, 5), '#fbf7ef', null, { lw: 1.8 });
      for (const [x, y, r] of [[-6, -52, 7], [5, -55, 8], [0, -61, 6]]) A.ellipse(ctx, x, y, r, r, '#7cae5a', '#5e8e44', { lw: 1.8, hl: false });
    },
    brazier(ctx, t) {
      const f = Math.sin(t * 7) * 1.5;
      const g = ctx.createRadialGradient(0, -46, 0, 0, -46, 44);
      g.addColorStop(0, 'rgba(255,200,110,' + (0.55 + Math.sin(t * 5) * 0.08).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -46, 44, 0, PI2); ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-6, -30); ctx.moveTo(14, 0); ctx.lineTo(6, -30); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke();
      ctx.strokeStyle = '#e8b84a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-18, -40); c.quadraticCurveTo(0, -24, 18, -40); c.closePath(); }, '#e8b84a', '#b8862a', { cel: [3, 0], lw: 2.2 });
      A.shape(ctx, (c) => { c.moveTo(-12, -40); c.quadraticCurveTo(-10 + f, -58, 0, -70 - f * 2); c.quadraticCurveTo(10 - f, -58, 12, -40); c.closePath(); }, '#ffb04a', null, { lw: 1.8 });
      A.shape(ctx, (c) => { c.moveTo(-6, -40); c.quadraticCurveTo(-4, -52, 0, -58 - f); c.quadraticCurveTo(4, -52, 6, -40); c.closePath(); }, '#fff0a0', null, { noStroke: true });
    },
    topiary(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-14, 0); c.lineTo(-17, -20); c.lineTo(17, -20); c.lineTo(14, 0); c.closePath(); }, '#fbf7ef', '#ddd2c2', { cel: [4, 0], lw: 2.2 });
      A.shape(ctx, (c) => c.rect(-18, -24, 36, 5), '#e8b84a', null, { lw: 1.6 });
      A.shape(ctx, (c) => c.rect(-2, -34, 4, 10), '#7a5a40', null, { lw: 1.6 });
      A.ellipse(ctx, 0, -50, 19, 19, '#6fae5a', '#4f8a40', { cel: [4, 4], lw: 2.3 });
      A.ellipse(ctx, -6, -56, 2.5, 2.5, '#ffe36b', null, { noStroke: true, hl: false });
      A.ellipse(ctx, 7, -46, 2.5, 2.5, '#ff9fbf', null, { noStroke: true, hl: false });
    },
    hourglassSmall(ctx, t) {
      A.shape(ctx, (c) => A.roundRect(c, -15, -6, 30, 6, 2), '#e8b84a', '#b8862a', { lw: 2 });
      A.shape(ctx, (c) => A.roundRect(c, -15, -50, 30, 6, 2), '#e8b84a', '#b8862a', { lw: 2 });
      A.shape(ctx, (c) => { c.moveTo(-11, -44); c.quadraticCurveTo(-11, -30, -2, -26); c.quadraticCurveTo(-11, -22, -11, -6); c.lineTo(11, -6); c.quadraticCurveTo(11, -22, 2, -26); c.quadraticCurveTo(11, -30, 11, -44); c.closePath(); }, 'rgba(220,240,255,0.55)', null, { lw: 1.8 });
      ctx.fillStyle = '#f4d08a';
      ctx.beginPath(); ctx.moveTo(-10, -44); ctx.lineTo(10, -44); ctx.quadraticCurveTo(8, -34, 0, -32); ctx.quadraticCurveTo(-8, -34, -10, -44); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(10, -7); ctx.quadraticCurveTo(0, -12, -10, -7); ctx.fill();
      const ph = (t * 1.2) % 1;
      ctx.fillRect(-0.8, -10 - ph * 20, 1.6, 3);
      ctx.fillRect(-0.8, -10 - ((ph + 0.5) % 1) * 20, 1.6, 3);
      for (const x of [-13, 13]) A.shape(ctx, (c) => c.rect(x - 1.5, -44, 3, 38), '#e8b84a', null, { lw: 1.4 });
    },
    brokenColumn(ctx) {
      A.shape(ctx, (c) => A.roundRect(c, -20, -10, 40, 10, 2), '#f4eee4', '#d8ccbc', { lw: 2.2 });
      A.shape(ctx, (c) => { c.moveTo(-14, -10); c.lineTo(-14, -52); c.lineTo(-6, -58); c.lineTo(0, -50); c.lineTo(6, -62); c.lineTo(14, -54); c.lineTo(14, -10); c.closePath(); }, '#fbf7ef', '#ddd2c2', { cel: [5, 0], lw: 2.3 });
      ctx.strokeStyle = 'rgba(150,130,110,0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const x of [-8, -2, 4, 10]) { ctx.moveTo(x, -12); ctx.lineTo(x, -48); }
      ctx.stroke();
      A.shape(ctx, (c) => c.rect(-15, -22, 30, 3), '#e8b84a', null, { lw: 1.4 });
      A.shape(ctx, (c) => { c.moveTo(22, 0); c.lineTo(26, -8); c.lineTo(36, -6); c.lineTo(38, 0); c.closePath(); }, '#fbf7ef', '#ddd2c2', { lw: 2 });
      ctx.strokeStyle = '#6fae5a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-14, -8); ctx.quadraticCurveTo(-18, -26, -10, -36); ctx.stroke();
      for (const [x, y] of [[-16, -18], [-13, -30]]) A.ellipse(ctx, x, y, 3.5, 2, '#7cc05a', null, { rot: 0.6, lw: 1.2, hl: false });
    },
    floatShard(ctx, t) {
      const bob = Math.sin(t * 1.4) * 4;
      A.shape(ctx, (c) => A.roundRect(c, -14, -12, 28, 12, 3), '#f4eee4', '#d8ccbc', { lw: 2 });
      A.shape(ctx, (c) => c.rect(-14, -12, 28, 3), '#e8b84a', null, { lw: 1.4 });
      const g = ctx.createRadialGradient(0, -40 + bob, 0, 0, -40 + bob, 30);
      g.addColorStop(0, 'rgba(255,220,150,0.55)');
      g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -40 + bob, 30, 0, PI2); ctx.fill();
      ctx.save();
      ctx.translate(0, -40 + bob);
      ctx.rotate(t * 0.6);
      ctx.strokeStyle = 'rgba(255,230,160,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 6, 0, 0, PI2); ctx.stroke();
      ctx.restore();
      A.shape(ctx, (c) => { c.moveTo(0, -58 + bob); c.lineTo(8, -40 + bob); c.lineTo(0, -24 + bob); c.lineTo(-8, -40 + bob); c.closePath(); }, '#fff0c0', '#e8b84a', { cel: [4, 0], lw: 2 });
    },
    starCrystal(ctx, t) {
      const glow = 0.45 + Math.sin(t * 2.2) * 0.15;
      const g = ctx.createRadialGradient(0, -18, 0, 0, -18, 40);
      g.addColorStop(0, 'rgba(170,150,255,' + glow.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(170,150,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -18, 40, 0, PI2); ctx.fill();
      [[-10, 22, -0.4], [3, 36, 0.05], [13, 20, 0.5]].forEach(([x, h, r]) => {
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-6, 0); c.lineTo(-6, -h * 0.7); c.lineTo(0, -h); c.lineTo(6, -h * 0.7); c.lineTo(6, 0); c.closePath(); }, '#c8b8ff', '#8a78e0', { cel: [3, 0], lw: 2 });
        ctx.restore();
      });
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.6 + k / 3) % 1;
        const s = Math.sin(ph * Math.PI) * 3.5;
        const x = [-16, 12, 2][k];
        const y = -30 - ph * 26 - k * 6;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.4, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.4, y); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y + s * 0.4); ctx.lineTo(x + s, y); ctx.lineTo(x, y - s * 0.4); ctx.closePath(); ctx.fill();
      }
    },
    gearProp(ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-40, -60, 80, 60);
      ctx.clip();
      const r = 28;
      A.shape(ctx, (c) => {
        for (let k = 0; k < 12; k++) {
          const a0 = (k / 12) * PI2;
          const a1 = ((k + 0.5) / 12) * PI2;
          const p = (a, rad) => [Math.cos(a) * rad, -8 + Math.sin(a) * rad];
          const q = [p(a0, r - 7), p(a0 + 0.08, r), p(a1 - 0.08, r), p(a1, r - 7)];
          if (k === 0) c.moveTo(q[0][0], q[0][1]); else c.lineTo(q[0][0], q[0][1]);
          for (let j = 1; j < 4; j++) c.lineTo(q[j][0], q[j][1]);
        }
        c.closePath();
      }, '#b89048', '#8a6a30', { cel: [4, 2], lw: 2.3 });
      A.ellipse(ctx, 0, -8, 9, 9, '#8a6a30', null, { lw: 2, hl: false });
      ctx.restore();
    },
    blossomBush(ctx, t) {
      [[-14, -12, 14], [4, -18, 17], [18, -10, 12]].forEach(([x, y, r]) => A.ellipse(ctx, x, y, r, r * 0.85, '#8cc878', '#6aa85a', { cel: [3, 3], hl: false, lw: 2.2 }));
      for (const [x, y] of [[-16, -18], [-4, -26], [10, -30], [18, -16], [2, -14], [-10, -8]]) {
        ctx.fillStyle = '#ffb8d0';
        for (let a = 0; a < 5; a++) {
          ctx.beginPath();
          ctx.arc(x + Math.cos(a * 1.26) * 2.6, y + Math.sin(a * 1.26) * 2.6, 2, 0, PI2);
          ctx.fill();
        }
        ctx.fillStyle = '#fff4a0';
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      // 花瓣往上飄（時間倒轉）
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.35 + k / 3) % 1;
        ctx.save();
        ctx.translate(-10 + k * 12 + Math.sin(ph * 6 + k) * 6, -24 - ph * 60);
        ctx.rotate(ph * 6 + k);
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        ctx.fillStyle = '#ffc4d8';
        ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 2, 0, 0, PI2); ctx.fill();
        ctx.restore();
      }
    },
  });

  // ── 平台底下垂著的東西 ──
  Object.assign(HANG, {
    icicle(ctx, h, t) {
      const n = 2 + Math.floor(h.seed % 2);
      for (let k = 0; k < n; k++) {
        const x = h.x + (k - (n - 1) / 2) * 9;
        const len = 10 + h.len * (0.35 + ((k * 0.37 + h.seed) % 1) * 0.5);
        ctx.fillStyle = 'rgba(214,242,255,0.95)';
        ctx.strokeStyle = 'rgba(70,120,170,0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - 3.5, h.y - 6);
        ctx.lineTo(x + 3.5, h.y - 6);
        ctx.lineTo(x, h.y - 6 + len);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(x - 1.5, h.y - 5, 1.2, len * 0.5);
      }
      // 偶爾滴下一滴水
      const ph = (t * 0.3 + h.seed / 6) % 1;
      if (ph > 0.75) {
        const u = (ph - 0.75) / 0.25;
        ctx.fillStyle = 'rgba(200,240,255,' + (1 - u).toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(h.x, h.y + h.len * 0.6 + u * u * 70, 1.6, 2.6, 0, 0, PI2);
        ctx.fill();
      }
    },
    bells(ctx, h, t) {
      const sw = Math.sin(t * 1.8 + h.seed) * 0.18;
      const len = h.len * 0.6 + 6;
      ctx.save();
      ctx.translate(h.x, h.y - 6);
      ctx.rotate(sw);
      ctx.strokeStyle = '#c8302a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, len);
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-5.5, len + 10); c.quadraticCurveTo(-5.5, len, 0, len); c.quadraticCurveTo(5.5, len, 5.5, len + 10); c.closePath(); }, '#f2c75a', '#c8962a', { cel: [2, 0], lw: 1.6 });
      if (h.seed > 3) A.shape(ctx, (c) => c.rect(-2, len + 11, 4, 12), '#fff6f0', null, { lw: 1.1 });
      ctx.restore();
    },
    tassel(ctx, h, t) {
      const sw = Math.sin(t * 1.2 + h.seed) * 0.12;
      const len = h.len * 0.55 + 6;
      ctx.save();
      ctx.translate(h.x, h.y - 6);
      ctx.rotate(sw);
      ctx.strokeStyle = '#c8962a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, len);
      ctx.stroke();
      A.ellipse(ctx, 0, len + 3, 4, 4, '#f2c75a', '#c8962a', { lw: 1.4, hl: false });
      A.shape(ctx, (c) => { c.moveTo(-3, len + 6); c.lineTo(3, len + 6); c.lineTo(5, len + 20); c.lineTo(-5, len + 20); c.closePath(); }, h.seed > 3 ? '#8a5ac8' : '#d8483a', null, { lw: 1.2 });
      ctx.restore();
    },
    blossom(ctx, h, t) {
      const sw = Math.sin(t * 1.3 + h.seed) * 3;
      ctx.strokeStyle = '#5f9a44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 6);
      ctx.quadraticCurveTo(h.x + sw, h.y + h.len * 0.5, h.x + sw * 1.4, h.y + h.len);
      ctx.stroke();
      for (let k = 1; k <= 3; k++) {
        const u = k / 3;
        const x = h.x + sw * u * 1.3 + (k % 2 ? 4 : -4);
        const y = h.y - 6 + (h.len + 6) * u;
        ctx.fillStyle = k === 3 ? '#ffd0e0' : '#ffb0cc';
        for (let a = 0; a < 5; a++) {
          ctx.beginPath();
          ctx.arc(x + Math.cos(a * 1.26) * 2.4, y + Math.sin(a * 1.26) * 2.4, 1.9, 0, PI2);
          ctx.fill();
        }
      }
    },
    starcharm(ctx, h, t) {
      const sw = Math.sin(t * 1.1 + h.seed) * 2;
      const len = h.len * 0.7 + 6;
      ctx.strokeStyle = 'rgba(180,200,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 6);
      ctx.lineTo(h.x + sw, h.y + len);
      ctx.stroke();
      const x = h.x + sw;
      const y = h.y + len + 5;
      const s = 5 + Math.sin(t * 3 + h.seed) * 1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(glowSprite('150,200,255'), x - 14, y - 14, 28, 28);
      ctx.restore();
      ctx.fillStyle = '#f4f8ff';
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.5);
      ctx.quadraticCurveTo(x, y, x + s, y);
      ctx.quadraticCurveTo(x, y, x, y + s * 1.5);
      ctx.quadraticCurveTo(x, y, x - s, y);
      ctx.quadraticCurveTo(x, y, x, y - s * 1.5);
      ctx.fill();
    },
  });

  // ── 大氣 ──
  Object.assign(ATMO, {
    // 雪：大小不一的雪片，左右輕輕擺
    snow(ctx, th, cam, t) {
      const n = Math.round(46 * (th.snowAmt || 1));
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < n; i++) {
        const sp = 22 + (i % 5) * 9;
        const x = wrapX(i * 139 + t * 8 - cam.x * (0.6 + (i % 3) * 0.12), G.W + 60) - 30 + Math.sin(t * (0.8 + (i % 4) * 0.2) + i) * 14;
        const y = wrapX(i * 83 + t * sp - cam.y * 0.6, G.H + 40) - 20;
        const r = 1.2 + (i % 4) * 0.7;
        ctx.globalAlpha = 0.55 + (i % 3) * 0.15;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, PI2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    // 暴風雪：斜飛的雪線＋一陣陣白霧
    blizzard(ctx, th, cam, t) {
      const img = glowSprite('225,238,255');
      for (let i = 0; i < 3; i++) {
        const span = G.W + 800;
        const x = wrapX(i * 397 + t * (160 + i * 30) - cam.x * 0.5, span) - 400;
        const y = G.H * (0.25 + (i % 3) * 0.22) + Math.sin(t * 0.7 + i) * 30;
        const r = 220 + (i % 2) * 80;
        ctx.globalAlpha = 0.09 + 0.05 * Math.sin(t * 0.9 + i * 2);
        ctx.drawImage(img, x - r * 1.6, y - r * 0.6, r * 3.2, r * 1.2);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(240,248,255,0.55)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const x = wrapX(i * 163 + t * (420 + (i % 5) * 60) - cam.x * 0.9, G.W + 100) - 50;
        const y = wrapX(i * 97 + t * (140 + (i % 4) * 30) - cam.y * 0.6, G.H + 40) - 20;
        const l = 10 + (i % 4) * 5;
        ctx.moveTo(x, y);
        ctx.lineTo(x - l, y - l * 0.35);
      }
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const x = wrapX(i * 151 + t * (260 + (i % 6) * 40) - cam.x * 0.8, G.W + 60) - 30;
        const y = wrapX(i * 71 + t * (90 + (i % 5) * 20) + Math.sin(t * 2 + i) * 10 - cam.y * 0.6, G.H + 40) - 20;
        ctx.globalAlpha = 0.6 + (i % 3) * 0.13;
        ctx.beginPath();
        ctx.arc(x, y, 1.3 + (i % 3) * 0.8, 0, PI2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    // 倒轉庭園：花瓣與沙粒往上飄
    petalsUp(ctx, th, cam, t) {
      for (let i = 0; i < 20; i++) {
        const x = wrapX(i * 173 - t * 6 - cam.x * 0.8, G.W + 100) - 50 + Math.sin(t * 0.9 + i) * 26;
        const y = wrapX(i * 97 - t * (16 + (i % 3) * 7) - cam.y * 0.6, G.H + 60) - 30;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 1.2 + i);
        ctx.fillStyle = ['#ffb8d0', '#ffd6e4', '#ffe8a0'][i % 3];
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.6, 0, 0, PI2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(244,208,138,0.8)';
      for (let i = 0; i < 26; i++) {
        const x = wrapX(i * 131 - cam.x * 0.7, G.W + 40) - 20 + Math.sin(t * 1.5 + i) * 6;
        const y = wrapX(i * 61 - t * (30 + (i % 4) * 12) - cam.y * 0.6, G.H + 20) - 10;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
    },
    // 神殿：慢慢漂的金色時砂，偶爾有小小的鐘環淡入淡出
    timeDust(ctx, th, cam, t) {
      const img = glowSprite('255,220,150');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 22; i++) {
        const x = wrapX(i * 191 + t * (6 + (i % 3) * 4) - cam.x * 0.75, G.W + 60) - 30 + Math.sin(t * 0.6 + i * 1.3) * 18;
        const y = wrapX(i * 113 - t * (8 + (i % 4) * 3) - cam.y * 0.6, G.H + 40) - 20;
        const r = 5 + (i % 3) * 3;
        ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 1.7 + i * 2.1);
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,236,180,0.5)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.07 + i / 3) % 1;
        const x = wrapX(i * 457 + 200 - cam.x * 0.4, G.W + 200) - 100;
        const y = G.H * (0.2 + i * 0.18);
        const r = 18 + ph * 26;
        ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.7;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, PI2);
        ctx.stroke();
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * PI2 + t * 0.3;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          ctx.lineTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4));
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },
    // 星之階梯：閃爍的星點與偶爾劃過的流星
    starfall(ctx, th, cam, t) {
      const img = glowSprite('190,210,255');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const x = wrapX(i * 211 - cam.x * 0.7, G.W + 60) - 30;
        const y = wrapX(i * 137 - t * (4 + (i % 3) * 3) - cam.y * 0.6, G.H + 40) - 20;
        const r = 4 + (i % 3) * 3;
        ctx.globalAlpha = 0.25 + 0.35 * Math.max(0, Math.sin(t * 2 + i * 2.7));
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 2; i++) {
        const per = 4.5 + i * 2.2;
        const ph = ((t + i * 3.1) % per) / per;
        if (ph > 0.18) continue;
        const u = ph / 0.18;
        const k = Math.floor((t + i * 3.1) / per);
        const x0 = G.W * (0.2 + hash(k * 7 + i) * 0.8);
        const y0 = G.H * (0.05 + hash(k * 3 + i) * 0.3);
        const x = x0 - u * 360;
        const y = y0 + u * 160;
        const g = ctx.createLinearGradient(x, y, x + 120, y - 53);
        g.addColorStop(0, 'rgba(255,255,255,' + (1 - u).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(160,190,255,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 120, y - 53);
        ctx.stroke();
      }
      ctx.restore();
    },
  });

  // ── 平台小裝飾 ──
  Object.assign(DECO, {
    snowy(ctx, x, y, d) {
      if (d.k > 0.62) {
        // 冬青的紅果
        ctx.fillStyle = '#3f6a54';
        ctx.beginPath();
        ctx.ellipse(x - 4, y - 7, 5 * d.s, 2.4, -0.5, 0, PI2);
        ctx.ellipse(x + 4, y - 7, 5 * d.s, 2.4, 0.5, 0, PI2);
        ctx.fill();
        ctx.fillStyle = '#e8384a';
        ctx.beginPath();
        ctx.arc(x - 1.5, y - 9, 2.2, 0, PI2);
        ctx.arc(x + 2, y - 10, 2.2, 0, PI2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, y - 6, 9 * d.s, 4 * d.s, 0, Math.PI, 0);
        ctx.fill();
      }
    },
    frost(ctx, x, y, d) {
      ctx.fillStyle = d.k > 0.62 ? 'rgba(220,248,255,0.95)' : 'rgba(170,225,250,0.9)';
      for (const [dx, hh, r] of [[-4, 10, -0.3], [1, 16, 0], [6, 9, 0.35]]) {
        ctx.save();
        ctx.translate(x + dx * d.s, y - 5);
        ctx.rotate(r);
        ctx.beginPath();
        ctx.moveTo(-2.5, 0);
        ctx.lineTo(0, -hh * d.s);
        ctx.lineTo(2.5, 0);
        ctx.fill();
        ctx.restore();
      }
    },
    goldLeaf(ctx, x, y, d) {
      if (d.k > 0.62) {
        ctx.fillStyle = '#e8b84a';
        ctx.beginPath();
        ctx.moveTo(x, y - 14 * d.s);
        ctx.lineTo(x + 4, y - 8);
        ctx.lineTo(x, y - 4);
        ctx.lineTo(x - 4, y - 8);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = '#6fae5a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x, y - 13 * d.s);
        ctx.stroke();
        ctx.fillStyle = '#fff6d8';
        ctx.beginPath();
        ctx.arc(x, y - 13 * d.s, 3, 0, PI2);
        ctx.fill();
        ctx.fillStyle = '#e8b84a';
        ctx.fillRect(x - 1, y - 14 * d.s, 2, 2);
      }
    },
    petals(ctx, x, y, d) {
      ctx.fillStyle = d.k > 0.62 ? '#ffc4d8' : '#ffd8e6';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (k - 1) * 6 * d.s, y - 5 - (k % 2) * 2, 3, 1.8, k, 0, PI2);
        ctx.fill();
      }
    },
    stardust(ctx, x, y, d) {
      const s = 3 + d.s * 2;
      ctx.fillStyle = d.k > 0.62 ? '#cfe4ff' : '#fff2c0';
      ctx.beginPath();
      ctx.moveTo(x, y - 8 - s);
      ctx.quadraticCurveTo(x, y - 8, x + s * 0.7, y - 8);
      ctx.quadraticCurveTo(x, y - 8, x, y - 8 + s);
      ctx.quadraticCurveTo(x, y - 8, x - s * 0.7, y - 8);
      ctx.quadraticCurveTo(x, y - 8, x, y - 8 - s);
      ctx.fill();
    },
  });

  // ── 平台樣式：雪（snow）、冰（ice）、大理石（marble） ──
  function drawColdOrMarble(ctx, P, style, left, right, y, bodyH, isGround, i, x0, x1) {
    const w = right - left;
    const vx0 = Math.max(left, x0);
    const vx1 = Math.min(right, x1);
    let bodyPath;
    if (isGround) bodyPath = (c) => c.rect(left, y, w, bodyH);
    else if (style === 'marble') {
      bodyPath = (c) => {
        c.moveTo(left, y);
        c.lineTo(right, y);
        c.lineTo(right, y + 16);
        c.lineTo(right - 10, y + 22);
        c.lineTo(left + 10, y + 22);
        c.lineTo(left, y + 16);
        c.closePath();
      };
    } else {
      // 雪／冰：底下參差的岩塊或冰晶
      const ice = style === 'ice';
      bodyPath = (c) => {
        c.moveTo(left + 4, y);
        c.lineTo(right - 4, y);
        c.quadraticCurveTo(right + 2, y + 10, right - 8, y + 20);
        const n = Math.max(2, Math.floor(w / (ice ? 26 : 36)));
        for (let k = n - 1; k >= 1; k--) {
          const u = k / n;
          const mid = Math.sin(u * Math.PI);
          const deep = ice ? (k % 2 ? 18 : 4) : hash(i * 7 + k) * 10;
          c.lineTo(left + w * u + (hash(i * 13 + k) - 0.5) * (ice ? 4 : 12), y + 20 + mid * 12 + deep);
        }
        c.lineTo(left + 8, y + 20);
        c.quadraticCurveTo(left - 2, y + 10, left + 4, y);
        c.closePath();
      };
    }
    // 大理石平台底下的金飾
    if (!isGround && style === 'marble') {
      const cx = (left + right) / 2;
      ctx.fillStyle = P.gold;
      ctx.beginPath();
      ctx.moveTo(cx - 14, y + 22);
      ctx.lineTo(cx + 14, y + 22);
      ctx.lineTo(cx, y + 38);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = P.edge;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (P.glow) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(glowSprite('150,210,255'), cx - 26, y + 16, 52, 52);
        ctx.restore();
      }
    }
    const grad = style === 'ice' ? ctx.createLinearGradient(0, y, 0, y + (isGround ? 160 : 40)) : null;
    if (grad) {
      grad.addColorStop(0, P.body);
      grad.addColorStop(1, P.shade);
    }
    ctx.fillStyle = grad || P.body;
    ctx.beginPath();
    bodyPath(ctx);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    bodyPath(ctx);
    ctx.clip();
    if (style !== 'ice') {
      ctx.fillStyle = P.shade;
      if (isGround) ctx.fillRect(vx0 - 2, y + 30, vx1 - vx0 + 4, bodyH);
      else ctx.fillRect(left, y + 14, w, 60);
    }
    if (style === 'marble') {
      // 石塊接縫
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1.5;
      const bh = isGround ? 34 : 22;
      for (let row = 0; row * bh < (isGround ? Math.min(bodyH, 400) : 22); row++) {
        const by = y + 8 + row * bh;
        ctx.beginPath();
        ctx.moveTo(vx0, by);
        ctx.lineTo(vx1, by);
        ctx.stroke();
        const off = (row % 2) * 32;
        for (let x = Math.floor((vx0 - off) / 64) * 64 + off; x < vx1; x += 64) {
          if (x < left + 6) continue;
          ctx.beginPath();
          ctx.moveTo(x, by);
          ctx.lineTo(x, by + bh);
          ctx.stroke();
        }
      }
      ctx.fillStyle = P.gold;
      ctx.fillRect(vx0, y + (isGround ? 12 : 12), vx1 - vx0, 2);
    } else if (style === 'ice') {
      // 冰裡的裂紋與反光
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.4;
      const step = isGround ? 90 : 40;
      for (let x = Math.floor(vx0 / step) * step + 12; x < vx1; x += step) {
        const hx = hash(x + i);
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x + 10 + hx * 8, y + 16 + hx * 8);
        ctx.lineTo(x + 4, y + (isGround ? 50 : 26));
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(vx0, y + 8, vx1 - vx0, isGround ? 20 : 6);
      if (isGround) {
        ctx.fillStyle = 'rgba(30,60,110,0.25)';
        ctx.fillRect(vx0, y + 60, vx1 - vx0, bodyH);
      }
    }
    terrBody(ctx, P, style, left, right, y, bodyH, isGround, i, vx0, vx1);
    ctx.restore();
    if (isGround) groundPebbles(ctx, left, right, y, bodyH, i, x0, x1, style === 'ice' ? 'rgba(255,255,255,0.12)' : style === 'marble' ? 'rgba(0,0,0,0.05)' : null);
    else {
      ctx.strokeStyle = P.edge;
      ctx.lineWidth = style === 'ice' ? 2 : 3;
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
    if (style === 'marble') {
      ctx.fillStyle = P.top;
      ctx.beginPath();
      A.roundRect(ctx, L, y - 7, R - L, 14, 2);
      ctx.fill();
      // 地磚
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      for (let x = Math.floor(tx0 / 40) * 40; x < tx1; x += 40) {
        if ((x / 40) % 2) continue;
        const a = Math.max(L + 2, x);
        const b = Math.min(R - 2, x + 40);
        if (b > a) ctx.fillRect(a, y - 5, b - a, 10);
      }
      ctx.fillStyle = P.topHi;
      ctx.fillRect(L + (isGround ? 0 : 3), y - 6, R - L - (isGround ? 0 : 6), 2.5);
      ctx.fillStyle = P.gold;
      ctx.fillRect(L + (isGround ? 0 : 2), y + 5, R - L - (isGround ? 0 : 4), 2.5);
      if (P.glow) {
        ctx.fillStyle = 'rgba(160,220,255,0.55)';
        ctx.fillRect(L + (isGround ? 0 : 2), y + 4, R - L - (isGround ? 0 : 4), 4.5);
      }
      if (!isGround) {
        ctx.strokeStyle = P.edge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        A.roundRect(ctx, L, y - 7, R - L, 14, 2);
        ctx.stroke();
      }
    } else {
      // 厚厚的積雪（冰平台是一層薄霜）
      const thick = style === 'ice' ? 0.6 : 1;
      const top = (c) => {
        c.moveTo(L, y + 6 * thick);
        c.lineTo(L, y - 5);
        c.quadraticCurveTo(L, y - 9 * thick - 1, L + 8, y - 9 * thick - 1);
        c.lineTo(R - 8, y - 9 * thick - 1);
        c.quadraticCurveTo(R, y - 9 * thick - 1, R, y - 5);
        c.lineTo(R, y + 6 * thick);
        const sx = Math.floor(tx0 / 14) * 14;
        for (let x = Math.min(R, Math.ceil(tx1 / 14) * 14); x >= Math.max(L, sx); x -= 14) {
          if (x <= L || x >= R) continue;
          const hx = hash(x * 0.61);
          c.quadraticCurveTo(x + 7, y + (6 + hx * 9) * thick, x, y + (4 + hx * 3) * thick);
        }
        c.closePath();
      };
      ctx.fillStyle = P.top;
      ctx.beginPath();
      top(ctx);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      top(ctx);
      ctx.clip();
      ctx.fillStyle = P.snowShade;
      ctx.fillRect(tx0, y + 2 * thick, tx1 - tx0, 20);
      ctx.fillStyle = P.top;
      ctx.beginPath();
      for (let x = Math.floor(tx0 / 14) * 14; x < tx1 + 14; x += 14) {
        const hx = hash(x * 0.61);
        ctx.moveTo(x + 9, y + 1);
        ctx.ellipse(x + 3, y + 1, 7, (3 + hx * 3) * thick, 0, 0, PI2);
      }
      ctx.fill();
      ctx.restore();
      if (!isGround) {
        ctx.strokeStyle = P.edge;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        top(ctx);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = P.topHi;
      ctx.fillRect(L + (isGround ? 0 : 6), y - 8 * thick, R - L - (isGround ? 0 : 12), 2.5);
      // 雪面的小亮點
      ctx.fillStyle = '#ffffff';
      for (let x = Math.floor(tx0 / 11) * 11; x < tx1; x += 11) {
        if (x < L + 4 || x > R - 4) continue;
        const hx = hash(x * 1.3);
        if (hx < 0.7) continue;
        ctx.fillRect(x, y - 5 + hx * 4, 2, 2);
      }
    }
  }

  // ── 繩索樣式：鈴繩（bellrope）、金鍊（goldchain） ──
  const ROPE_EXTRA = {
    bellrope(ctx, x, top, bottom, t) {
      const sway = (y) => x + Math.sin(y * 0.05 + t * 0.9) * 1.8;
      const path = () => {
        ctx.beginPath();
        for (let y = top; y <= bottom; y += 5) (y === top ? ctx.moveTo(sway(y), y) : ctx.lineTo(sway(y), y));
      };
      ctx.lineCap = 'round';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 9;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#f4efe6';
      ctx.lineWidth = 5.5;
      path();
      ctx.stroke();
      // 紅白相間的扭紋
      ctx.strokeStyle = '#d23a2e';
      ctx.lineWidth = 2.6;
      for (let y = top + 3; y < bottom; y += 8) {
        const xx = sway(y);
        ctx.beginPath();
        ctx.moveTo(xx - 2.6, y - 2.5);
        ctx.lineTo(xx + 2.6, y + 2.5);
        ctx.stroke();
      }
      // 每隔一段掛一顆小鈴
      for (let y = top + 30, k = 0; y < bottom - 8; y += 40, k++) {
        const side = k % 2 ? 1 : -1;
        const bx = sway(y) + side * 7;
        const sw = Math.sin(t * 2.2 + k) * 1.2;
        A.ellipse(ctx, bx + sw, y + 4, 4, 4, '#f2c75a', '#c8962a', { lw: 1.6, hl: false });
        ctx.fillStyle = A.outline();
        ctx.fillRect(bx + sw - 2, y + 5, 4, 1.2);
      }
      // 繩尾：紅白流蘇
      const bx = sway(bottom);
      A.shape(ctx, (c) => A.roundRect(c, bx - 4, bottom - 2, 8, 6, 2), '#d23a2e', null, { lw: 1.4, hl: false });
      ctx.lineWidth = 1.3;
      for (let k = -3; k <= 3; k++) {
        ctx.strokeStyle = k % 2 ? '#f4efe6' : '#d23a2e';
        ctx.beginPath();
        ctx.moveTo(bx + k * 1.1, bottom + 3);
        ctx.lineTo(bx + k * 1.8 + Math.sin(t * 2 + k) * 0.8, bottom + 13 - Math.abs(k) * 0.6);
        ctx.stroke();
      }
      A.shape(ctx, (c) => A.roundRect(c, x - 10, top - 6, 20, 9, 3), '#6a4a3a', '#52382c', { lw: 2.2, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, x - 11, top - 10, 22, 5, 2.5), '#f6faff', null, { lw: 1.6, hl: false });
    },
    goldchain(ctx, x, top, bottom, t) {
      const sway = (y) => x + Math.sin(y * 0.05 + t * 0.9) * 1.8;
      for (let y = top, k = 0; y < bottom; y += 9, k++) {
        const xx = sway(y);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(xx, y + 4, k % 2 ? 2 : 5, 6, 0, 0, PI2);
        ctx.stroke();
        ctx.strokeStyle = k % 2 ? '#c8962a' : '#f2cf6a';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      // 沿著金鍊往下流動的閃光
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.35 + k * 0.5) % 1;
        const gy = top + ph * (bottom - top);
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        ctx.drawImage(glowSprite('255,230,150'), sway(gy) - 10, gy - 10, 20, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sway(gy) - 0.8, gy - 4, 1.6, 8);
        ctx.fillRect(sway(gy) - 4, gy - 0.8, 8, 1.6);
      }
      ctx.restore();
      A.shape(ctx, (c) => A.roundRect(c, x - 11, top - 7, 22, 10, 3), '#fbf7ef', '#ddd2c2', { lw: 2.2, hl: false });
      A.ellipse(ctx, x, top - 2, 3, 3, '#e8b84a', null, { lw: 1.4, hl: false });
      // 鍊尾的小金鈴
      A.shape(ctx, (c) => { const by = bottom + 2; c.moveTo(sway(bottom) - 5, by + 9); c.quadraticCurveTo(sway(bottom) - 5, by, sway(bottom), by); c.quadraticCurveTo(sway(bottom) + 5, by, sway(bottom) + 5, by + 9); c.closePath(); }, '#f2cf6a', '#c8962a', { lw: 1.5 });
    },
  };

  // 前景：雪堆（snow）、雲朵（cloud）
  function drawForeExtra(ctx, kind, f, y, col, t) {
    if (kind === 'snow') {
      const s = f.s;
      [[-16, 16, 9], [4, 22, 12], [24, 13, 8]].forEach(([dx, rx, ry], k) => {
        ctx.fillStyle = col[1];
        ctx.beginPath();
        ctx.ellipse(f.x + dx * s + 2, y + 13, rx * s, ry * s, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = col[0];
        ctx.beginPath();
        ctx.ellipse(f.x + dx * s - 1, y + 12, rx * s - 2, ry * s - 2, 0, Math.PI, 0);
        ctx.fill();
      });
      ctx.strokeStyle = '#8a7a5a';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let k = -1; k <= 1; k++) {
        const sw = Math.sin(t * 1.6 + f.x * 0.01 + k) * 2;
        ctx.beginPath();
        ctx.moveTo(f.x + k * 5 + 8, y + 2);
        ctx.lineTo(f.x + k * 7 + 8 + sw, y - (16 + (k % 2 ? 0 : 6)) * s);
        ctx.stroke();
      }
      return true;
    }
    if (kind === 'cloud') {
      const s = f.s;
      const dx = Math.sin(t * 0.4 + f.x * 0.01) * 6;
      ctx.fillStyle = col[1];
      ctx.beginPath();
      for (const [ox, oy, r] of [[-22, 6, 14], [0, 0, 20], [22, 6, 13], [40, 10, 9]]) {
        ctx.moveTo(f.x + ox * s + dx + r * s, y + 14 + oy * s);
        ctx.arc(f.x + ox * s + dx, y + 14 + oy * s, r * s, 0, PI2);
      }
      ctx.fill();
      ctx.fillStyle = col[0];
      ctx.beginPath();
      for (const [ox, oy, r] of [[-22, 3, 12], [0, -3, 17], [22, 3, 11], [40, 7, 7]]) {
        ctx.moveTo(f.x + ox * s + dx + r * s, y + 12 + oy * s);
        ctx.arc(f.x + ox * s + dx, y + 12 + oy * s, r * s, 0, PI2);
      }
      ctx.fill();
      return true;
    }
    return false;
  }


  // ════════════════════════════════════════════════════════════
  // 地形細節（精緻版）：地層、嵌石、樹根、草葉、野花、苔蘚、沙紋、雪簷冰柱、冰面反光、大理石紋與金飾
  // 所有細節的位置在 prepareMap 時先算好（map._terr），每格只畫鏡頭裡看得到的部分，
  // 同色的小東西合成一條路徑一次填色，控制每格成本。
  // ════════════════════════════════════════════════════════════
  let terrMap = null;
  const TERR_LAVA = { lavaBed: 1, volcanoNest: 1 };
  const TERR_DRY = { hotspringCamp: 1, redRift: 1, steamPass: 1 };
  const TERR_SEA = { coastCamp: 1, tidepool: 1, shipwreck: 1, reef: 1, crabNest: 1 };

  function terrColors(P, style, theme) {
    const mix = (x, y, k) => U.mix(x, y, k);
    const c = {};
    if (style === 'marble') {
      c.stone = [mix(P.body, '#ffffff', 0.35), mix(P.shade, '#000000', 0.08), mix(P.body, P.gold || '#e8b84a', 0.25)];
      c.vein = mix(P.shade, '#6a5a7a', 0.35);
      c.dark = 'rgba(0,0,0,0.10)';
    } else if (style === 'ice') {
      c.stone = ['rgba(255,255,255,0.35)', 'rgba(20,50,100,0.25)', 'rgba(200,240,255,0.4)'];
      c.dark = 'rgba(10,30,70,0.18)';
    } else {
      const grey = TERR_LAVA[theme] ? '#3a3036' : style === 'snow' ? '#8a90a4' : '#a09a90';
      c.stone = [mix(P.body, grey, 0.55), mix(P.shade, '#2a2024', 0.25), mix(P.body, '#e8dcc8', 0.3)];
      c.dark = 'rgba(0,0,0,0.13)';
    }
    c.light = 'rgba(255,255,255,0.10)';
    c.root = mix(P.edge, P.shade, 0.35);
    c.rootHi = mix(P.body, '#ffffff', 0.12);
    c.blade = [mix(P.top, '#1e3a10', 0.28), P.topHi, mix(P.top, '#d8f0a0', 0.2)];
    c.moss = TERR_DRY[theme] ? ['#9a9a4a', '#b8b060'] : TERR_SEA[theme] ? ['#4f7a4a', '#6a9a58'] : ['#5f9a44', '#86c05a'];
    return c;
  }

  function buildTerrain(map) {
    const th = map._theme;
    const theme = map.theme;
    const rnd = U.seeded(map.w * 13 + map.h * 3 + 77);
    const lava = !!TERR_LAVA[theme];
    const ropes = (map.ropes || []).map((r) => r[0]);
    map._terr = map.platforms.map((p, i) => {
      const isGround = i === 0;
      const P = isGround && th.ground ? th.ground : th.plat;
      const style = P.style || 'grass';
      const left = p[0];
      const right = p[1];
      const y = p[2];
      const w = right - left;
      const T = { style, col: terrColors(P, style, theme), stones: [], strata: [], roots: [], cracks: [], veins: [], inlays: [], bubbles: [], blades: [], flowers: [], moss: [], ripples: [], icicles: [], glints: [], studs: [], embers: [], grain: [], drips: [] };
      const earth = style === 'grass' || style === 'sand' || style === 'rock' || style === 'snow' || style === 'slab';
      if (isGround) {
        const maxD = Math.min(map.h - y + 60, 360);
        // 地層：幾道起伏的色帶
        if (style !== 'ice') {
          const bands = style === 'marble' ? [] : [[40, 7, 'dark'], [78, 5, 'light'], [124, 9, 'dark'], [190, 6, 'light'], [270, 10, 'dark']];
          for (const [d, th2, kind] of bands) {
            if (d > maxD) break;
            const pts = [];
            const ph = rnd() * 6;
            for (let x = left - 48; x <= right + 48; x += 48) {
              const yy = y + d + Math.sin(x * 0.011 + ph) * 5 + (rnd() - 0.5) * 4;
              pts.push(x, yy, th2 * (0.6 + rnd() * 0.8));
            }
            T.strata.push({ pts, kind });
          }
        }
        // 嵌在土裡的石頭
        const stoneStep = style === 'marble' ? 999999 : style === 'ice' ? 60 : 46;
        for (let x = left + 10; x < right - 10; x += stoneStep * (0.5 + rnd())) {
          const d = 22 + Math.pow(rnd(), 1.4) * (maxD - 30);
          const r = 3 + rnd() * (d > 90 ? 11 : 7);
          if (style === 'ice') T.bubbles.push({ x, y: y + d, r: 1.5 + rnd() * 4 });
          else T.stones.push({ x, y: y + d, rx: r * (1 + rnd() * 0.6), ry: r * (0.6 + rnd() * 0.3), rot: (rnd() - 0.5) * 0.6, v: Math.floor(rnd() * 3) });
        }
        // 樹根（草地、雪地下的土）
        if (style === 'grass' || (style === 'snow' && !lava)) {
          for (let x = left + 30; x < right - 20; x += 90 + rnd() * 110) {
            const len = 24 + rnd() * 50;
            const sw = (rnd() - 0.5) * 30;
            const r = { x, y: y + 10, len, sw, w: 2 + rnd() * 2.5, br: [] };
            const nb = 1 + Math.floor(rnd() * 3);
            for (let k = 0; k < nb; k++) r.br.push({ u: 0.3 + rnd() * 0.5, dx: (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 12), dy: 6 + rnd() * 14 });
            T.roots.push(r);
          }
        }
        // 岩石、石板的裂縫
        if (style === 'rock' || style === 'slab') {
          const step = 120;
          for (let x = left + 40; x < right - 40; x += step * (0.6 + rnd() * 0.8)) {
            const pts = [x, y + 16 + rnd() * 20];
            let cx = pts[0];
            let cy = pts[1];
            const n = 3 + Math.floor(rnd() * 3);
            for (let k = 0; k < n; k++) {
              cx += (rnd() - 0.5) * 18;
              cy += 8 + rnd() * 12;
              pts.push(cx, cy);
            }
            T.cracks.push(pts);
          }
        }
        // 大理石：石紋與金色鑲嵌
        if (style === 'marble') {
          for (let x = left + 20; x < right; x += 60 + rnd() * 90) {
            const d = 20 + rnd() * 120;
            T.veins.push([x, y + d, x + 20 + rnd() * 30, y + d + (rnd() - 0.5) * 30, x + 40 + rnd() * 40, y + d + (rnd() - 0.5) * 40, x + 70 + rnd() * 50, y + d + (rnd() - 0.5) * 30]);
          }
          for (let x = left + 128; x < right - 60; x += 256) T.inlays.push({ x, y: y + 44 });
        }
        // 冰：深處的冰晶紋
        if (style === 'ice') {
          for (let x = left + 30; x < right; x += 80 + rnd() * 80) T.glints.push({ x, y: y + 30 + rnd() * 80, s: 4 + rnd() * 6 });
        }
      } else {
        // 浮空平台的側面：幾顆小石頭／木紋／冰泡
        if (style === 'planks') {
          for (let yy = y + 2; yy < y + 18; yy += 5) {
            let x = left + 8 + rnd() * 20;
            while (x < right - 20) {
              const l = 20 + rnd() * 50;
              T.grain.push(x, yy + rnd() * 2, Math.min(right - 10, x + l));
              x += l + 10 + rnd() * 30;
            }
          }
        } else if (style === 'ice') {
          for (let x = left + 14; x < right - 10; x += 22 + rnd() * 30) T.bubbles.push({ x, y: y + 12 + rnd() * 12, r: 1 + rnd() * 2.5 });
        } else if (style === 'marble') {
          for (let x = left + 30; x < right - 30; x += 64) T.studs.push(x);
          for (let x = left + 10; x < right - 30; x += 50 + rnd() * 60) {
            const d = 12 + rnd() * 6;
            T.veins.push([x, y + d, x + 10, y + d + (rnd() - 0.5) * 8, x + 20, y + d + (rnd() - 0.5) * 8, x + 30 + rnd() * 20, y + d + (rnd() - 0.5) * 6]);
          }
        } else {
          for (let x = left + 14; x < right - 14; x += 36 + rnd() * 50) {
            const r = 2.5 + rnd() * 4;
            T.stones.push({ x, y: y + 16 + rnd() * (style === 'rock' ? 16 : 7), rx: r * 1.3, ry: r * 0.8, rot: (rnd() - 0.5) * 0.5, v: Math.floor(rnd() * 3) });
          }
          if (style === 'grass') {
            for (let x = left + 20; x < right - 20; x += 50 + rnd() * 60) {
              if (rnd() < 0.5) T.roots.push({ x, y: y + 12, len: 8 + rnd() * 10, sw: (rnd() - 0.5) * 10, w: 1.5 + rnd(), br: [] });
            }
          }
        }
        // 平台底下：苔蘚垂條、土塊、冰柱
        if (earth && style !== 'snow' && !lava) {
          for (let x = left + 12; x < right - 12; x += 16 + rnd() * 26) {
            if (rnd() < 0.45) T.drips.push({ x, len: 4 + rnd() * 10, w: 3 + rnd() * 4 });
          }
        }
        if (style === 'snow' || style === 'ice') {
          for (let x = left + 8; x < right - 8; x += 7 + rnd() * 12) {
            if (rnd() < 0.55) T.icicles.push({ x, len: 4 + Math.pow(rnd(), 2) * 16, w: 2 + rnd() * 2 });
          }
        }
      }
      // ── 頂面 ──
      const nearRope = (x) => ropes.some((rx) => Math.abs(rx - x) < 10);
      if (style === 'grass') {
        for (let x = left + (isGround ? 0 : 2); x < right - 2; x += 2.5 + rnd() * 3.5) {
          T.blades.push(x, 3 + rnd() * rnd() * 10, (rnd() - 0.5) * 5, Math.floor(rnd() * 3));
        }
        const fcols = TERR_SEA[theme] ? ['#ff9ec0', '#ffffff', '#ffd6e6'] : ['#ffe36b', '#ffffff', '#ff9fbf', '#b8a0ff', '#8fd0ff'];
        for (let x = left + 16; x < right - 16; x += 30 + rnd() * 70) {
          if (nearRope(x)) continue;
          T.flowers.push({ x, h: 4 + rnd() * 7, c: fcols[Math.floor(rnd() * fcols.length)], s: 1.6 + rnd() * 1.2 });
        }
      } else if (style === 'sand') {
        for (let x = left + 10; x < right - 20; x += 24 + rnd() * 40) T.ripples.push(x, y - 3 + rnd() * 6, 8 + rnd() * 14);
        for (let x = left + 20; x < right - 20; x += 60 + rnd() * 90) T.glints.push({ x, y: y - 3 + rnd() * 4, s: rnd() < 0.5 ? 0 : 1, c: rnd() });
      } else if (style === 'rock' || style === 'slab') {
        if (lava) {
          for (let x = left + 8; x < right - 8; x += 14 + rnd() * 30) T.embers.push(x, y - 3 + rnd() * 8, 0.8 + rnd() * 1.6);
        } else {
          for (let x = left + 10; x < right - 10; x += 36 + rnd() * 70) {
            if (rnd() < 0.55) T.moss.push({ x, w: 8 + rnd() * 18, h: 2 + rnd() * 3 });
          }
        }
        for (let x = left + 12; x < right - 12; x += 40 + rnd() * 60) T.glints.push({ x, y: y - 4 + rnd() * 4, s: 1.5 + rnd() * 2.5, c: rnd() });
      } else if (style === 'planks') {
        for (let x = left + 6; x < right - 30; x += 30 + rnd() * 50) T.grain.push(x, y - 2 + rnd() * 6, x + 12 + rnd() * 24);
        for (let x = left + 20; x < right - 20; x += 80 + rnd() * 100) if (rnd() < 0.6) T.moss.push({ x, w: 6 + rnd() * 10, h: 2 + rnd() * 2 });
      } else if (style === 'snow') {
        for (let x = left + 12; x < right - 12; x += 34 + rnd() * 60) {
          if (nearRope(x)) continue;
          T.blades.push(x, 5 + rnd() * 8, (rnd() - 0.5) * 6, rnd() < 0.3 ? 1 : 0);
        }
        for (let x = left + 10; x < right - 10; x += 20 + rnd() * 30) T.glints.push({ x, y: y - 6 + rnd() * 6, s: 1.5 + rnd() * 2, c: rnd() });
      } else if (style === 'ice') {
        for (let x = left + 10; x < right - 30; x += 50 + rnd() * 70) T.ripples.push(x, y - 4, 10 + rnd() * 18);
        for (let x = left + 10; x < right - 10; x += 24 + rnd() * 40) T.glints.push({ x, y: y - 6 + rnd() * 5, s: 1.5 + rnd() * 2.5, c: rnd() });
      } else if (style === 'marble') {
        for (let x = left + 24; x < right - 24; x += 48) T.studs.push(x);
        for (let x = left + 20; x < right - 40; x += 70 + rnd() * 90) T.ripples.push(x, y - 3 + rnd() * 3, 14 + rnd() * 20);
      }
      return T;
    });
  }

  // 側面、地底的細節（在平台本體的 clip 裡畫）
  function terrBody(ctx, P, style, left, right, y, bodyH, isGround, i, vx0, vx1) {
    const T = terrMap && terrMap._terr && terrMap._terr[i];
    if (!T) return;
    const C = T.col;
    const a = vx0 - 30;
    const b = vx1 + 30;
    // 地層色帶
    for (const s of T.strata) {
      const pts = s.pts;
      let k0 = Math.max(0, Math.floor((a - pts[0]) / 48) * 3);
      let k1 = Math.min(pts.length - 3, Math.ceil((b - pts[0]) / 48) * 3 + 3);
      if (k1 <= k0) continue;
      ctx.fillStyle = s.kind === 'dark' ? C.dark : C.light;
      ctx.beginPath();
      ctx.moveTo(pts[k0], pts[k0 + 1]);
      for (let k = k0 + 3; k <= k1; k += 3) ctx.lineTo(pts[k], pts[k + 1]);
      for (let k = k1; k >= k0; k -= 3) ctx.lineTo(pts[k], pts[k + 1] + pts[k + 2]);
      ctx.closePath();
      ctx.fill();
      // 色帶上緣的細線
      ctx.strokeStyle = s.kind === 'dark' ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pts[k0], pts[k0 + 1]);
      for (let k = k0 + 3; k <= k1; k += 3) ctx.lineTo(pts[k], pts[k + 1]);
      ctx.stroke();
    }
    // 樹根
    if (T.roots.length) {
      ctx.lineCap = 'round';
      const rootPath = (r) => {
        ctx.moveTo(r.x, r.y);
        ctx.bezierCurveTo(r.x + r.sw * 0.3, r.y + r.len * 0.35, r.x - r.sw * 0.4, r.y + r.len * 0.65, r.x + r.sw, r.y + r.len);
        for (const bb of r.br) {
          const u = bb.u;
          const bx = r.x + r.sw * u * u;
          const by = r.y + r.len * u;
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + bb.dx * 0.5, by + bb.dy * 0.3, bx + bb.dx, by + bb.dy);
        }
      };
      ctx.strokeStyle = C.root;
      for (const r of T.roots) {
        if (r.x < a - 40 || r.x > b + 40) continue;
        ctx.lineWidth = r.w;
        ctx.beginPath();
        rootPath(r);
        ctx.stroke();
      }
      ctx.strokeStyle = C.rootHi;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (const r of T.roots) {
        if (r.x < a - 40 || r.x > b + 40) continue;
        ctx.moveTo(r.x - 0.8, r.y);
        ctx.bezierCurveTo(r.x + r.sw * 0.3 - 0.8, r.y + r.len * 0.35, r.x - r.sw * 0.4 - 0.8, r.y + r.len * 0.65, r.x + r.sw - 0.8, r.y + r.len);
      }
      ctx.stroke();
    }
    // 嵌石：三種顏色各一條路徑，再一起加高光與描邊
    if (T.stones.length) {
      for (let v = 0; v < 3; v++) {
        ctx.fillStyle = C.stone[v];
        ctx.beginPath();
        for (const s of T.stones) {
          if (s.v !== v || s.x < a || s.x > b) continue;
          ctx.moveTo(s.x + s.rx, s.y);
          ctx.ellipse(s.x, s.y, s.rx, s.ry, s.rot, 0, PI2);
        }
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      for (const s of T.stones) {
        if (s.x < a || s.x > b || s.rx < 3) continue;
        ctx.moveTo(s.x - s.rx * 0.2, s.y - s.ry * 0.45);
        ctx.ellipse(s.x - s.rx * 0.35, s.y - s.ry * 0.45, s.rx * 0.35, s.ry * 0.22, s.rot, 0, PI2);
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,24,16,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const s of T.stones) {
        if (s.x < a || s.x > b) continue;
        ctx.moveTo(s.x + s.rx, s.y);
        ctx.ellipse(s.x, s.y, s.rx, s.ry, s.rot, 0, PI2);
      }
      ctx.stroke();
    }
    // 裂縫
    if (T.cracks.length) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [col, lw, dx] of [['rgba(0,0,0,0.28)', 1.8, 0], ['rgba(255,255,255,0.14)', 1, 1.2]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (const c of T.cracks) {
          if (c[0] < a - 30 || c[0] > b + 30) continue;
          ctx.moveTo(c[0] + dx, c[1]);
          for (let k = 2; k < c.length; k += 2) ctx.lineTo(c[k] + dx, c[k + 1]);
          // 分岔
          if (c.length > 6) {
            ctx.moveTo(c[4] + dx, c[5]);
            ctx.lineTo(c[4] + 8 + dx, c[5] + 7);
          }
        }
        ctx.stroke();
      }
    }
    // 大理石紋
    if (T.veins.length) {
      ctx.strokeStyle = C.vein;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (const v of T.veins) {
        if (v[6] < a || v[0] > b) continue;
        ctx.moveTo(v[0], v[1]);
        ctx.bezierCurveTo(v[2], v[3], v[4], v[5], v[6], v[7]);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 金色鑲嵌（大理石地面）：菱形框＋星
    if (T.inlays.length) {
      const gold = P.gold || '#e2b04a';
      for (const g of T.inlays) {
        if (g.x < a - 40 || g.x > b + 40) continue;
        A.shape(ctx, (c) => { c.moveTo(g.x, g.y - 16); c.lineTo(g.x + 26, g.y); c.lineTo(g.x, g.y + 16); c.lineTo(g.x - 26, g.y); c.closePath(); }, P.shade, null, { lw: 1.4 });
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y - 12); ctx.lineTo(g.x + 20, g.y); ctx.lineTo(g.x, g.y + 12); ctx.lineTo(g.x - 20, g.y); ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = gold;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const ang = -Math.PI / 2 + (k / 8) * PI2;
          const r = k % 2 ? 2.4 : 6.5;
          k ? ctx.lineTo(g.x + Math.cos(ang) * r, g.y + Math.sin(ang) * r) : ctx.moveTo(g.x + Math.cos(ang) * r, g.y + Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = gold;
        for (const s of [-1, 1]) {
          ctx.fillRect(g.x + s * 40 - 2, g.y - 2, 4, 4);
          ctx.fillRect(g.x + s * 60 - 1.5, g.y - 1.5, 3, 3);
        }
      }
      // 地面上緣的回紋帶
      ctx.strokeStyle = P.gold || '#e2b04a';
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const by = y + 20;
      for (let x = Math.floor(a / 24) * 24; x < b; x += 24) {
        ctx.moveTo(x, by + 8);
        ctx.lineTo(x, by);
        ctx.lineTo(x + 16, by);
        ctx.lineTo(x + 16, by + 6);
        ctx.lineTo(x + 6, by + 6);
        ctx.lineTo(x + 6, by + 3);
        ctx.moveTo(x, by + 8);
        ctx.lineTo(x + 24, by + 8);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 冰泡與冰晶
    if (T.bubbles.length) {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const s of T.bubbles) {
        if (s.x < a || s.x > b) continue;
        ctx.moveTo(s.x + s.r, s.y);
        ctx.arc(s.x, s.y, s.r, 0, PI2);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (const s of T.bubbles) {
        if (s.x < a || s.x > b || s.r < 2) continue;
        ctx.fillRect(s.x - s.r * 0.5, s.y - s.r * 0.5, 1.2, 1.2);
      }
    }
    if (style === 'ice' && isGround && T.glints.length) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const g of T.glints) {
        if (g.x < a || g.x > b) continue;
        for (let k = 0; k < 3; k++) {
          const ang = (k / 3) * Math.PI;
          ctx.moveTo(g.x - Math.cos(ang) * g.s, g.y - Math.sin(ang) * g.s);
          ctx.lineTo(g.x + Math.cos(ang) * g.s, g.y + Math.sin(ang) * g.s);
        }
      }
      ctx.stroke();
      // 冰層深處的斜向反光帶
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      for (let x = Math.floor(a / 220) * 220; x < b; x += 220) {
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x + 40, y + 8);
        ctx.lineTo(x - 30, y + 150);
        ctx.lineTo(x - 70, y + 150);
        ctx.closePath();
      }
      ctx.fill();
    }
    // 木紋（碼頭木板的側面）
    if (T.grain.length && !isGround && style === 'planks') {
      ctx.strokeStyle = 'rgba(40,20,10,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < T.grain.length; k += 3) {
        const x0 = T.grain[k];
        const yy = T.grain[k + 1];
        if (yy < y + 6 || T.grain[k + 2] < a || x0 > b) continue;
        ctx.moveTo(x0, yy);
        ctx.quadraticCurveTo((x0 + T.grain[k + 2]) / 2, yy + 1.5, T.grain[k + 2], yy);
      }
      ctx.stroke();
    }
    // 大理石平台側面的金鉚釘
    if (T.studs.length && !isGround) {
      ctx.fillStyle = P.gold || '#e2b04a';
      ctx.beginPath();
      for (const x of T.studs) {
        if (x < a || x > b) continue;
        ctx.moveTo(x + 2.6, y + 15);
        ctx.arc(x, y + 15, 2.6, 0, PI2);
      }
      ctx.fill();
    }
  }

  // 頂面與平台邊緣的細節（在頂面、裝飾之後畫）
  function terrTop(ctx, P, style, left, right, y, isGround, i, x0, x1) {
    const T = terrMap && terrMap._terr && terrMap._terr[i];
    if (!T) return;
    const C = T.col;
    const a = x0 - 10;
    const b = x1 + 10;
    // 平台底下的苔蘚垂條／土塊
    if (T.drips.length) {
      const by = style === 'rock' ? y + 20 : style === 'planks' ? y + 19 : y + 24;
      ctx.fillStyle = style === 'grass' ? C.moss[0] : style === 'planks' ? '#4f7a4a' : C.moss[0];
      ctx.beginPath();
      for (const d of T.drips) {
        if (d.x < a || d.x > b) continue;
        ctx.moveTo(d.x - d.w / 2, by - 3);
        ctx.quadraticCurveTo(d.x - d.w * 0.3, by + d.len, d.x, by + d.len + 1);
        ctx.quadraticCurveTo(d.x + d.w * 0.3, by + d.len, d.x + d.w / 2, by - 3);
        ctx.closePath();
      }
      ctx.fill();
    }
    // 冰柱簷
    if (T.icicles.length) {
      const by = y + (style === 'ice' ? 22 : 21);
      ctx.fillStyle = 'rgba(226,246,255,0.95)';
      ctx.strokeStyle = 'rgba(70,120,170,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of T.icicles) {
        if (d.x < a || d.x > b) continue;
        const yy = by;
        ctx.moveTo(d.x - d.w, yy - 4);
        ctx.lineTo(d.x + d.w, yy - 4);
        ctx.lineTo(d.x, yy + d.len);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const d of T.icicles) {
        if (d.x < a || d.x > b || d.len < 8) continue;
        ctx.fillRect(d.x - d.w * 0.45, by - 2, 1, d.len * 0.5);
      }
    }
    // 草葉：三種色調各一條路徑
    if (T.blades.length) {
      const bl = T.blades;
      const snow = style === 'snow';
      const by = snow ? y - 6 : y - 4;
      for (let tone = 0; tone < 3; tone++) {
        ctx.fillStyle = snow ? (tone ? '#6a5a4a' : '#8a7a5a') : C.blade[tone];
        ctx.beginPath();
        for (let k = 0; k < bl.length; k += 4) {
          const x = bl[k];
          if (bl[k + 3] !== tone || x < a || x > b) continue;
          const h = bl[k + 1];
          const lean = bl[k + 2];
          if (snow) {
            // 雪地冒出來的枯草尖
            ctx.moveTo(x - 1, by);
            ctx.lineTo(x + lean, by - h);
            ctx.lineTo(x + 1, by);
            ctx.moveTo(x + 2, by);
            ctx.lineTo(x + 3 + lean * 1.4, by - h * 0.7);
            ctx.lineTo(x + 3.6, by);
          } else {
            ctx.moveTo(x - 1.7, by);
            ctx.quadraticCurveTo(x + lean * 0.3, by - h * 0.6, x + lean, by - h);
            ctx.quadraticCurveTo(x + lean * 0.2 + 0.6, by - h * 0.4, x + 1.7, by);
          }
        }
        ctx.fill();
      }
    }
    // 小野花
    if (T.flowers.length) {
      ctx.strokeStyle = C.blade[0];
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const f of T.flowers) {
        if (f.x < a || f.x > b) continue;
        ctx.moveTo(f.x, y - 4);
        ctx.lineTo(f.x + 0.5, y - 4 - f.h);
      }
      ctx.stroke();
      for (const f of T.flowers) {
        if (f.x < a || f.x > b) continue;
        const fy = y - 4 - f.h;
        ctx.fillStyle = f.c;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const px = f.x + 0.5 + Math.cos(k * 1.571 + 0.4) * f.s;
          const py = fy + Math.sin(k * 1.571 + 0.4) * f.s;
          ctx.moveTo(px + f.s * 0.8, py);
          ctx.arc(px, py, f.s * 0.8, 0, PI2);
        }
        ctx.fill();
        ctx.fillStyle = '#ffb040';
        ctx.fillRect(f.x - 0.3, fy - 0.8, 1.6, 1.6);
      }
    }
    // 苔蘚斑（岩石、石板、木板頂面），邊緣順便垂一點下來
    if (T.moss.length) {
      for (let v = 0; v < 2; v++) {
        ctx.fillStyle = C.moss[v];
        ctx.beginPath();
        for (const m of T.moss) {
          if (m.x < a || m.x > b) continue;
          const mw = v ? m.w * 0.6 : m.w;
          const mx = v ? m.x - m.w * 0.12 : m.x;
          ctx.moveTo(mx - mw / 2, y - 3);
          ctx.quadraticCurveTo(mx - mw * 0.3, y - 5 - m.h, mx, y - 5 - m.h * (v ? 0.8 : 1));
          ctx.quadraticCurveTo(mx + mw * 0.35, y - 5 - m.h, mx + mw / 2, y - 3);
          if (!v) {
            ctx.quadraticCurveTo(mx + mw * 0.2, y + 2, mx, y + 1);
            ctx.quadraticCurveTo(mx - mw * 0.2, y + 2, mx - mw / 2, y - 3);
          }
          ctx.closePath();
        }
        ctx.fill();
      }
    }
    // 熔岩地帶的餘燼碎屑
    if (T.embers.length) {
      ctx.fillStyle = '#ff9a3a';
      ctx.beginPath();
      for (let k = 0; k < T.embers.length; k += 3) {
        const x = T.embers[k];
        if (x < a || x > b) continue;
        ctx.moveTo(x + T.embers[k + 2], T.embers[k + 1]);
        ctx.arc(x, T.embers[k + 1], T.embers[k + 2], 0, PI2);
      }
      ctx.fill();
    }
    // 沙紋、冰面反光、大理石光澤
    if (T.ripples.length) {
      const rp = T.ripples;
      if (style === 'sand') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.2;
      } else if (style === 'ice') {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.6;
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.2;
      }
      ctx.beginPath();
      for (let k = 0; k < rp.length; k += 3) {
        const x = rp[k];
        if (x < a - 40 || x > b) continue;
        const yy = rp[k + 1];
        const l = rp[k + 2];
        if (style === 'sand') {
          ctx.moveTo(x, yy);
          ctx.quadraticCurveTo(x + l / 2, yy - 2.5, x + l, yy);
        } else if (style === 'ice') {
          // 斜斜的反光條
          ctx.moveTo(x, yy + 8);
          ctx.lineTo(x + l * 0.4, yy - 3);
          ctx.moveTo(x + 5, yy + 8);
          ctx.lineTo(x + 5 + l * 0.25, yy + 1);
        } else {
          ctx.moveTo(x, yy);
          ctx.lineTo(x + l, yy);
        }
      }
      ctx.stroke();
    }
    if (T.glints.length) {
      if (style === 'sand') {
        for (const g of T.glints) {
          if (g.x < a || g.x > b) continue;
          if (g.s) {
            // 小貝殼碎片
            ctx.fillStyle = g.c > 0.5 ? '#ffd2c2' : '#fff4e4';
            ctx.beginPath();
            ctx.moveTo(g.x, g.y + 1);
            ctx.lineTo(g.x - 3, g.y - 1.5);
            ctx.quadraticCurveTo(g.x, g.y - 5, g.x + 3, g.y - 1.5);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillStyle = g.c > 0.5 ? 'rgba(120,90,60,0.45)' : 'rgba(160,150,140,0.8)';
            ctx.beginPath();
            ctx.ellipse(g.x, g.y, 2.4, 1.5, 0, 0, PI2);
            ctx.fill();
          }
        }
      } else if (style === 'rock' || style === 'slab') {
        // 頂面的小碎石
        ctx.fillStyle = C.stone[2];
        ctx.beginPath();
        for (const g of T.glints) {
          if (g.x < a || g.x > b) continue;
          ctx.moveTo(g.x + g.s, g.y);
          ctx.ellipse(g.x, g.y, g.s, g.s * 0.65, 0, 0, PI2);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,20,20,0.35)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
      } else if (style === 'snow' || style === 'ice') {
        // 雪面、冰面的星芒閃點
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        for (const g of T.glints) {
          if (g.x < a || g.x > b || g.c < 0.45 || g.y > y + 2) continue;
          const s = g.s;
          ctx.moveTo(g.x, g.y - s * 1.6);
          ctx.lineTo(g.x + s * 0.35, g.y);
          ctx.lineTo(g.x, g.y + s * 1.6);
          ctx.lineTo(g.x - s * 0.35, g.y);
          ctx.closePath();
          ctx.moveTo(g.x - s * 1.6, g.y);
          ctx.lineTo(g.x, g.y + s * 0.35);
          ctx.lineTo(g.x + s * 1.6, g.y);
          ctx.lineTo(g.x, g.y - s * 0.35);
          ctx.closePath();
        }
        ctx.fill();
      }
    }
    // 大理石頂面：金色小圓釘
    if (style === 'marble' && T.studs.length) {
      ctx.fillStyle = P.gold || '#e2b04a';
      ctx.strokeStyle = 'rgba(90,60,20,0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (const x of T.studs) {
        if (x < a || x > b) continue;
        ctx.moveTo(x + 2.2, y + 6.2);
        ctx.arc(x, y + 6.2, 2.2, 0, PI2);
      }
      ctx.fill();
      ctx.stroke();
    }
    // 木板頂面的紋路
    if (style === 'planks' && T.grain.length) {
      ctx.strokeStyle = 'rgba(60,34,20,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < T.grain.length; k += 3) {
        const yy = T.grain[k + 1];
        if (yy > y + 5 || T.grain[k + 2] < a || T.grain[k] > b) continue;
        ctx.moveTo(T.grain[k], yy);
        ctx.lineTo(T.grain[k + 2], yy);
      }
      ctx.stroke();
    }
  }

  // 森林的垂藤（取代原本一條線＋一片葉）：藤上長著幾片葉子與捲鬚
  function drawVineHang(ctx, h, t, cave) {
    const sw = Math.sin(t * 1.5 + h.seed) * 3;
    const ex = h.x + sw * 1.5;
    const ey = h.y + h.len;
    ctx.lineCap = 'round';
    ctx.strokeStyle = cave ? '#5a3e28' : '#3f7a2c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y - 4);
    ctx.quadraticCurveTo(h.x + sw, h.y + h.len * 0.5, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = cave ? '#7a5a3a' : '#6ab04a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const leaf = cave ? '#4a6a3a' : '#6ab84a';
    const leafD = cave ? '#34502a' : '#4a8a34';
    const n = Math.max(1, Math.floor(h.len / 14));
    for (let k = 1; k <= n; k++) {
      const u = k / (n + 0.5);
      const px = h.x + sw * u * u * 1.5;
      const py = h.y - 4 + (h.len + 4) * u;
      const s = k % 2 ? 1 : -1;
      ctx.fillStyle = k % 2 ? leaf : leafD;
      ctx.beginPath();
      ctx.ellipse(px + s * 4, py, 4.5, 2.2, s * 0.6 + Math.sin(t * 2 + k + h.seed) * 0.15, 0, PI2);
      ctx.fill();
    }
    // 末端的捲鬚或小花苞
    if (h.seed > 3) {
      ctx.strokeStyle = cave ? '#6a4a30' : '#5a9a3a';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(ex + 2.5, ey, 2.5, Math.PI, Math.PI * 2.6);
      ctx.stroke();
    } else if (!cave) {
      ctx.fillStyle = h.seed > 1.5 ? '#ffe36b' : '#ff9fbf';
      ctx.beginPath();
      ctx.arc(ex, ey + 1, 2.4, 0, PI2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(140,255,210,0.55)';
      ctx.beginPath();
      ctx.arc(ex, ey + 1, 2.6, 0, PI2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── 平台上加放的小擺設（原本只有地面有擺設） ──
  const PLAT_PROPS = {
    forestMorning: ['flowerPatch', 'mossRock', 'sapling', 'pebbleSet'],
    forestMushroom: ['toadstools', 'flowerPatch', 'mossRock'],
    forestDeep: ['fernClump', 'mossRock', 'sapling', 'toadstools'],
    rootCave: ['glowMoss', 'stalagmite', 'pebbleSet'],
    queenHall: ['gemCluster', 'toadstools', 'glowMoss'],
    coastCamp: ['ropeCoil', 'pebbleSet', 'seaGlass'],
    tidepool: ['seaGlass', 'pebbleSet', 'beachGrass'],
    shipwreck: ['ropeCoil', 'seaGlass', 'lantern'],
    reef: ['coralTuft', 'seaGlass', 'pebbleSet'],
    crabNest: ['coralTuft', 'pebbleSet', 'seaGlass'],
    hotspringCamp: ['dryBush', 'pebbleSet', 'lantern'],
    redRift: ['dryBush', 'pebbleSet', 'desertFlower'],
    steamPass: ['dryBush', 'pebbleSet', 'crystalSmall'],
    lavaBed: ['emberRock', 'crystalSmall'],
    volcanoNest: ['emberRock', 'crystalSmall'],
    snowCamp: ['snowLump', 'lantern', 'frostTuft'],
    snowField: ['snowLump', 'frostTuft', 'pebbleSet'],
    iceFall: ['iceSpike', 'frostTuft', 'snowLump'],
    bellShrine: ['snowLump', 'frostTuft', 'lantern'],
    frostAltar: ['iceSpike', 'snowLump'],
    templeCourt: ['goldPot', 'petalPile', 'crystalSmall'],
    timeCorridor: ['goldPot', 'crystalSmall', 'petalPile'],
    reverseGarden: ['petalPile', 'flowerPatch', 'goldPot'],
    starStair: ['crystalSmall', 'starMote'],
    timeThrone: ['crystalSmall', 'goldPot', 'starMote'],
  };
  const GROUND_EXTRA = {
    forestMorning: ['oakTree', 'flowerPatch'],
    forestMushroom: ['oakTree', 'toadstools'],
    forestDeep: ['oakTree', 'fernClump'],
    rootCave: ['stalagmite', 'glowMoss'],
    tidepool: ['beachGrass'],
    coastCamp: ['beachGrass'],
    redRift: ['desertFlower'],
    snowField: ['frostTuft'],
    reverseGarden: ['petalPile'],
  };

  function extraProps(map) {
    const th = map._theme;
    const rnd = U.seeded(map.w * 5 + map.h * 11 + 3);
    const set = PLAT_PROPS[map.theme];
    if (!set) return;
    const avoidX = [].concat((map.portals || []).map((p) => p.x), (map.npcs || []).map((n) => n.x), (map.signs || []).map((s) => s.x), (map.springs || []).map((s) => s.x));
    const ropes = map.ropes || [];
    map.platforms.forEach((p, i) => {
      if (i === 0) return;
      const len = p[1] - p[0];
      if (len < 110) return;
      for (let x = p[0] + 30 + rnd() * 40; x < p[1] - 30; x += 150 + rnd() * 150) {
        if (rnd() < 0.35) continue;
        if (avoidX.some((a) => Math.abs(a - x) < 60)) continue;
        if (ropes.some((r) => Math.abs(r[0] - x) < 34 && r[1] <= p[2] + 10 && r[2] >= p[2] - 10)) continue;
        map._props.push({ kind: set[Math.floor(rnd() * set.length)], x, y: p[2], s: 0.7 + rnd() * 0.3, flip: rnd() < 0.5 ? -1 : 1 });
      }
    });
    // 地面：在原本擺設之間的空檔補幾個
    const gx = GROUND_EXTRA[map.theme];
    if (gx) {
      const g = map.platforms[0];
      const taken = map._props.filter((q) => q.y === g[2]).map((q) => q.x);
      for (let x = g[0] + 220; x < g[1] - 160; x += 420 + rnd() * 380) {
        if (taken.some((a) => Math.abs(a - x) < 90)) continue;
        if (avoidX.some((a) => Math.abs(a - x) < 110)) continue;
        if (map.camp && x > map.camp.x1 - 120 && x < map.camp.x2 + 120) continue;
        if (ropes.some((r) => Math.abs(r[0] - x) < 60)) continue;
        map._props.push({ kind: gx[Math.floor(rnd() * gx.length)], x, y: g[2], s: 0.85 + rnd() * 0.35, flip: rnd() < 0.5 ? -1 : 1 });
      }
    }
    // 大樹先畫（在其他擺設後面）
    map._props.sort((q, r) => (q.kind === 'oakTree' ? 0 : 1) - (r.kind === 'oakTree' ? 0 : 1));
  }

  Object.assign(PROP, {
    oakTree(ctx, t) {
      // 地面上的大樹：粗樹幹、根爪、三層樹冠、光斑
      const sw = Math.sin(t * 0.8) * 0.015;
      A.shape(ctx, (c) => { c.moveTo(-14, 0); c.quadraticCurveTo(-8, -40, -10, -86); c.lineTo(10, -86); c.quadraticCurveTo(8, -40, 16, 0); c.closePath(); }, '#8a5e3c', '#6b4428', { cel: [4, 0], lw: 2.6 });
      A.shape(ctx, (c) => { c.moveTo(-10, -4); c.quadraticCurveTo(-24, -6, -32, 2); c.lineTo(-10, 2); c.closePath(); }, '#8a5e3c', '#6b4428', { lw: 2.2 });
      A.shape(ctx, (c) => { c.moveTo(12, -4); c.quadraticCurveTo(26, -8, 34, 2); c.lineTo(12, 2); c.closePath(); }, '#8a5e3c', '#6b4428', { lw: 2.2 });
      ctx.strokeStyle = 'rgba(50,30,15,0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-3, -10); ctx.quadraticCurveTo(-6, -30, -2, -50);
      ctx.moveTo(5, -20); ctx.quadraticCurveTo(7, -40, 3, -64);
      ctx.stroke();
      A.ellipse(ctx, 0, -40, 4, 5, '#4a2e1f', null, { lw: 1.4, hl: false });
      // 枝
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, -76); ctx.lineTo(-26, -100);
      ctx.moveTo(4, -80); ctx.lineTo(28, -108);
      ctx.stroke();
      ctx.strokeStyle = '#8a5e3c';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.save();
      ctx.translate(0, -110);
      ctx.rotate(sw);
      const blobs = [[-34, 8, 26, '#5f9f3a'], [34, 4, 28, '#5f9f3a'], [0, -8, 36, '#6aae4a'], [-22, -26, 24, '#79bf54'], [22, -30, 25, '#79bf54'], [0, -44, 22, '#86c95c']];
      for (const [x, y, r, col] of blobs) A.ellipse(ctx, x, y, r, r * 0.82, col, U.mix(col, '#2a4a18', 0.35), { cel: [4, 4], hl: false, lw: 2.4 });
      // 樹冠上的葉片紋與果子
      ctx.fillStyle = 'rgba(200,240,150,0.55)';
      for (const [x, y] of [[-26, -30], [16, -36], [-4, -52], [30, -8], [-40, 0]]) {
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 2.5, -0.5, 0, PI2);
        ctx.fill();
      }
      for (const [x, y] of [[-12, 4], [20, -14], [-30, -14], [8, -30]]) A.ellipse(ctx, x, y, 3, 3, '#ff6a5a', null, { lw: 1.2, hl: false });
      ctx.restore();
    },
    flowerPatch(ctx, t) {
      A.ellipse(ctx, 0, -2, 18, 4, '#5f9f3a', null, { noStroke: true, hl: false });
      const cols = ['#ff9fbf', '#ffe36b', '#b8a0ff', '#ffffff', '#ff8a6a'];
      for (let i = 0; i < 7; i++) {
        const x = -15 + i * 5;
        const h = 6 + ((i * 7) % 5) * 2;
        const sw = Math.sin(t * 2 + i) * 1.2;
        ctx.strokeStyle = '#4f8a34';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, -2);
        ctx.lineTo(x + sw, -h);
        ctx.stroke();
        ctx.fillStyle = cols[i % 5];
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.arc(x + sw + Math.cos(k * 1.26) * 2, -h + Math.sin(k * 1.26) * 2, 1.6, 0, PI2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffb040';
        ctx.fillRect(x + sw - 0.8, -h - 0.8, 1.6, 1.6);
      }
    },
    mossRock(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-18, 0); c.lineTo(-14, -12); c.quadraticCurveTo(-2, -22, 12, -14); c.lineTo(18, 0); c.closePath(); }, '#9a968c', '#76726a', { cel: [3, 2], lw: 2.2 });
      A.shape(ctx, (c) => { c.moveTo(-14, -11); c.quadraticCurveTo(-4, -22, 10, -15); c.quadraticCurveTo(6, -10, 0, -12); c.quadraticCurveTo(-8, -8, -14, -11); c.closePath(); }, '#6fae4a', '#4f8a36', { lw: 1.6 });
      ctx.strokeStyle = 'rgba(40,30,20,0.4)';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(8, -3); ctx.lineTo(6, 0); ctx.stroke();
      A.ellipse(ctx, 22, -2, 4, 2.6, '#aaa69c', null, { lw: 1.4, hl: false });
    },
    sapling(ctx, t) {
      const sw = Math.sin(t * 1.6) * 1.5;
      ctx.strokeStyle = '#6b4428';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(1, -12, sw, -24); ctx.stroke();
      for (const [x, y, r] of [[-5, -18, -0.7], [5, -22, 0.7], [sw, -26, 0], [-4, -10, -0.9], [4, -13, 0.9]]) A.ellipse(ctx, x + sw * 0.5, y, 5, 2.6, '#7cc84a', '#5a9e34', { rot: r, lw: 1.3, hl: false });
    },
    pebbleSet(ctx) {
      for (const [x, r, col] of [[-10, 4, '#a8a298'], [-2, 6, '#8e887e'], [8, 3.5, '#b8b2a8'], [14, 2.5, '#9a948a']]) A.ellipse(ctx, x, -r * 0.6, r, r * 0.7, col, null, { lw: 1.4 });
    },
    toadstools(ctx) {
      for (const [x, k, col] of [[-8, 0.8, '#e0513a'], [2, 1.1, '#f28c38'], [10, 0.6, '#c2408f']]) {
        A.shape(ctx, (c) => A.roundRect(c, x - 2 * k, -10 * k, 4 * k, 10 * k, 1.5), '#fff0d6', null, { lw: 1.4, hl: false });
        A.shape(ctx, (c) => c.ellipse(x, -10 * k, 8 * k, 6 * k, 0, Math.PI, 0), col, null, { lw: 1.4, hl: false });
        ctx.fillStyle = '#fff6e8';
        ctx.beginPath();
        ctx.arc(x - 3 * k, -13 * k, 1.3 * k, 0, PI2);
        ctx.arc(x + 2.5 * k, -14 * k, 1 * k, 0, PI2);
        ctx.fill();
      }
    },
    fernClump(ctx, t) {
      for (let k = -3; k <= 3; k++) {
        const sw = Math.sin(t * 1.4 + k) * 1.5;
        const ex = k * 7 + sw;
        const ey = -20 + Math.abs(k) * 4;
        ctx.strokeStyle = k % 2 ? '#3f7f2a' : '#5a9e3a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(k * 2, -18, ex, ey);
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let j = 1; j < 5; j++) {
          const u = j / 5;
          const px = k * 2 * u + (ex - k * 2 * u) * u * u;
          const py = -18 * u * (1 - u) * 2 + ey * u * u;
          ctx.moveTo(px, py);
          ctx.lineTo(px - 3, py - 3);
          ctx.moveTo(px, py);
          ctx.lineTo(px + 3, py - 3);
        }
        ctx.stroke();
      }
    },
    glowMoss(ctx, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(glowSprite('120,255,200'), -22, -26, 44, 36);
      ctx.restore();
      A.ellipse(ctx, 0, -3, 14, 4, '#3f6a3a', null, { lw: 1.4, hl: false });
      for (let k = 0; k < 6; k++) {
        const x = -10 + k * 4;
        const h = 5 + (k % 3) * 3 + Math.sin(t * 2 + k) * 0.8;
        ctx.strokeStyle = '#5a8a4a';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x, -4 - h); ctx.stroke();
        ctx.fillStyle = k % 2 ? '#a8ffe0' : '#7df0d0';
        ctx.beginPath(); ctx.arc(x, -4 - h, 1.6, 0, PI2); ctx.fill();
      }
    },
    stalagmite(ctx) {
      for (const [x, h, w] of [[-8, 26, 9], [4, 40, 11], [14, 18, 7]]) {
        A.shape(ctx, (c) => { c.moveTo(x - w, 0); c.quadraticCurveTo(x - w * 0.4, -h * 0.5, x, -h); c.quadraticCurveTo(x + w * 0.4, -h * 0.5, x + w, 0); c.closePath(); }, '#6e6258', '#54483e', { cel: [3, 0], lw: 2 });
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let yy = -4; yy > -h * 0.8; yy -= 6) { const ww = w * (1 + yy / h) * 0.8; ctx.moveTo(x - ww, yy); ctx.quadraticCurveTo(x, yy + 2, x + ww, yy); }
        ctx.stroke();
      }
    },
    gemCluster(ctx, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6 + Math.sin(t * 2) * 0.2;
      ctx.drawImage(glowSprite('255,160,230'), -24, -34, 48, 40);
      ctx.restore();
      for (const [x, h, r, col, sh] of [[-7, 16, -0.4, '#ff9fd0', '#d870a8'], [2, 24, 0.05, '#ffd35a', '#d8a030'], [10, 13, 0.5, '#b8a0ff', '#8a70e0']]) {
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-4, 0); c.lineTo(-4, -h * 0.7); c.lineTo(0, -h); c.lineTo(4, -h * 0.7); c.lineTo(4, 0); c.closePath(); }, col, sh, { cel: [2, 0], lw: 1.6 });
        ctx.restore();
      }
    },
    ropeCoil(ctx) {
      A.ellipse(ctx, 0, -4, 14, 5, '#d8b07a', '#b08a54', { lw: 2, hl: false });
      A.ellipse(ctx, 0, -6, 10, 3.5, '#e0bc84', null, { lw: 1.6, hl: false });
      A.ellipse(ctx, 0, -7, 5, 1.8, '#8a6440', null, { lw: 1.2, hl: false });
      ctx.strokeStyle = '#d8b07a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(12, -3); ctx.quadraticCurveTo(22, -2, 26, 0); ctx.stroke();
    },
    seaGlass(ctx) {
      for (const [x, y, r, col] of [[-8, -3, 3.5, 'rgba(120,220,200,0.9)'], [0, -2, 2.5, 'rgba(140,190,255,0.9)'], [7, -3, 3, 'rgba(255,255,255,0.9)']]) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r, 0.3, 0, PI2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(x - r * 0.5, y - r * 0.5, 1.4, 1.2);
      }
      PROP.pebbleSet(ctx);
    },
    beachGrass(ctx, t) {
      ctx.lineCap = 'round';
      for (let k = -4; k <= 4; k++) {
        const sw = Math.sin(t * 2.4 + k) * 2.5;
        ctx.strokeStyle = k % 2 ? '#9cc060' : '#c8d27a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(k * 2, 0);
        ctx.quadraticCurveTo(k * 3, -12, k * 5 + sw, -22 + Math.abs(k) * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#d8c080';
      ctx.beginPath(); ctx.ellipse(2 + Math.sin(t * 2.4) * 2.5, -24, 2, 5, 0.2, 0, PI2); ctx.fill();
    },
    coralTuft(ctx, t) {
      const sw = Math.sin(t * 1.2) * 1;
      ctx.lineCap = 'round';
      for (const [col, w] of [[A.OUT, 6], ['#ff9f7a', 3]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(sw, -16);
        ctx.moveTo(0, -7); ctx.quadraticCurveTo(-7, -9, -8 + sw, -15);
        ctx.moveTo(0, -10); ctx.quadraticCurveTo(6, -12, 7 + sw, -19);
        ctx.stroke();
      }
      for (const [x, y] of [[sw, -16], [-8 + sw, -15], [7 + sw, -19]]) A.ellipse(ctx, x, y, 2.2, 2.2, '#ffc0b0', null, { lw: 1, hl: false });
    },
    lantern(ctx, t) {
      const g = 0.45 + Math.sin(t * 3.1) * 0.1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = g;
      ctx.drawImage(glowSprite('255,190,110'), -26, -40, 52, 52);
      ctx.restore();
      A.shape(ctx, (c) => A.roundRect(c, -8, -20, 16, 20, 3), '#ffd88a', '#e8b060', { lw: 2 });
      ctx.strokeStyle = '#5a4030';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.moveTo(0, -20); ctx.lineTo(0, 0); ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-10, -20); c.lineTo(10, -20); c.lineTo(5, -26); c.lineTo(-5, -26); c.closePath(); }, '#5a4a44', null, { lw: 1.8 });
      A.shape(ctx, (c) => c.rect(-10, -2, 20, 3), '#5a4a44', null, { lw: 1.4 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -28, 3, Math.PI, 0); ctx.stroke();
    },
    dryBush(ctx, t) {
      ctx.strokeStyle = '#8a6a44';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const [ang, l] of [[-1.1, 16], [-0.5, 20], [0.1, 18], [0.6, 19], [1.2, 14]]) {
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.sin(ang) * l, -Math.cos(ang) * l);
        ctx.moveTo(Math.sin(ang) * l * 0.6, -Math.cos(ang) * l * 0.6);
        ctx.lineTo(Math.sin(ang + 0.5) * l * 0.8, -Math.cos(ang + 0.5) * l * 0.8);
      }
      ctx.stroke();
      for (const [x, y] of [[-10, -12], [4, -18], [11, -10], [-3, -15]]) A.ellipse(ctx, x, y, 3, 2, '#b8a860', null, { rot: x * 0.05, lw: 1, hl: false });
    },
    desertFlower(ctx, t) {
      PROP.dryBush(ctx, t);
      for (const [x, y, col] of [[-6, -18, '#ff8ab0'], [8, -20, '#ffd35a']]) {
        ctx.fillStyle = col;
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.26) * 2.2, y + Math.sin(k * 1.26) * 2.2, 1.7, 0, PI2); ctx.fill(); }
        ctx.fillStyle = '#fff4c0';
        ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
      }
    },
    crystalSmall(ctx, t) {
      const theme = G.world && G.world.map && G.world.map.theme;
      const hot = TERR_LAVA[theme] || TERR_DRY[theme];
      const cols = hot ? ['#ffb870', '#e07a3a', '255,150,70'] : theme === 'starStair' || theme === 'timeThrone' ? ['#c8b8ff', '#8a78e0', '170,150,255'] : ['#fff0c0', '#e8b84a', '255,220,150'];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + Math.sin(t * 2.3) * 0.15;
      ctx.drawImage(glowSprite(cols[2]), -20, -30, 40, 36);
      ctx.restore();
      for (const [x, h, r] of [[-5, 13, -0.4], [2, 20, 0.05], [8, 11, 0.5]]) {
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-3.5, 0); c.lineTo(-3.5, -h * 0.7); c.lineTo(0, -h); c.lineTo(3.5, -h * 0.7); c.lineTo(3.5, 0); c.closePath(); }, cols[0], cols[1], { cel: [1.8, 0], lw: 1.5 });
        ctx.restore();
      }
    },
    emberRock(ctx, t) {
      A.shape(ctx, (c) => { c.moveTo(-16, 0); c.lineTo(-12, -10); c.lineTo(-2, -16); c.lineTo(10, -12); c.lineTo(16, 0); c.closePath(); }, '#3a2a2a', '#281c1c', { cel: [3, 2], lw: 2 });
      ctx.strokeStyle = 'rgba(255,' + Math.round(130 + Math.sin(t * 3) * 30) + ',50,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-5, -9); ctx.lineTo(-1, -13); ctx.moveTo(4, -4); ctx.lineTo(8, -9); ctx.stroke();
    },
    snowLump(ctx) {
      A.ellipse(ctx, 0, -4, 16, 7, '#f6faff', '#cfdcee', { cel: [2, 1], lw: 1.8, hl: false });
      A.ellipse(ctx, 10, -3, 7, 4, '#f6faff', '#cfdcee', { lw: 1.6, hl: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-8, -9, 6, 1.5);
      ctx.strokeStyle = '#6a5a4a';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-7, -16); ctx.moveTo(-6, -12); ctx.lineTo(-10, -14); ctx.stroke();
    },
    frostTuft(ctx, t) {
      ctx.strokeStyle = '#8a7a5a';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = -3; k <= 3; k++) { ctx.moveTo(k * 2, 0); ctx.lineTo(k * 4 + Math.sin(t * 1.6 + k), -14 + Math.abs(k) * 2); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(240,250,255,0.9)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      A.ellipse(ctx, 0, -1, 10, 3.5, '#f6faff', null, { lw: 1.2, hl: false });
    },
    iceSpike(ctx, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45 + Math.sin(t * 1.8) * 0.12;
      ctx.drawImage(glowSprite('150,220,255'), -20, -34, 40, 40);
      ctx.restore();
      for (const [x, h, w, r] of [[-6, 16, 7, -0.35], [3, 26, 9, 0.05], [10, 12, 6, 0.45]]) {
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(r);
        A.shape(ctx, (c) => { c.moveTo(-w / 2, 0); c.lineTo(0, -h); c.lineTo(w / 2, 0); c.closePath(); }, '#d0f0ff', '#7ec8ea', { cel: [w * 0.3, 0], lw: 1.6 });
        ctx.restore();
      }
    },
    goldPot(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-8, 0); c.quadraticCurveTo(-14, -8, -8, -16); c.lineTo(8, -16); c.quadraticCurveTo(14, -8, 8, 0); c.closePath(); }, '#fbf7ef', '#ddd2c2', { cel: [3, 0], lw: 1.8 });
      A.shape(ctx, (c) => c.rect(-10, -9, 20, 2.5), '#e8b84a', null, { lw: 1.1 });
      A.shape(ctx, (c) => c.rect(-7, -19, 14, 3), '#e8b84a', null, { lw: 1.2 });
      for (const [x, y, r] of [[-4, -22, 4], [3, -24, 4.5], [0, -28, 3.5]]) A.ellipse(ctx, x, y, r, r, '#7cae5a', '#5e8e44', { lw: 1.3, hl: false });
    },
    petalPile(ctx, t) {
      ctx.fillStyle = '#ffc4d8';
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.ellipse(-12 + k * 4, -2 - (k % 3), 3, 1.6, k * 0.8, 0, PI2);
        ctx.fill();
      }
      const ph = (t * 0.4) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.fillStyle = '#ffd8e6';
      ctx.beginPath();
      ctx.ellipse(Math.sin(ph * 6) * 6, -6 - ph * 30, 2.5, 1.4, ph * 6, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    starMote(ctx, t) {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.5 + k / 3) % 1;
        const x = -8 + k * 8;
        const y = -6 - ph * 26;
        const s = Math.sin(ph * Math.PI) * 3.5;
        ctx.fillStyle = k % 2 ? '#fff2c0' : '#cfe4ff';
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.35, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.35, y); ctx.closePath();
        ctx.moveTo(x - s, y); ctx.lineTo(x, y + s * 0.35); ctx.lineTo(x + s, y); ctx.lineTo(x, y - s * 0.35); ctx.closePath();
        ctx.fill();
      }
      A.ellipse(ctx, 0, -2, 10, 2.5, 'rgba(180,200,255,0.5)', null, { noStroke: true, hl: false });
    },
  });

  // 既有擺設補細節：在原本的畫法上再疊裂縫、苔蘚、年輪、小花
  (function enrichProps() {
    const wrap = (name, extra) => {
      const base = PROP[name];
      if (!base) return;
      PROP[name] = function (ctx, t, p) {
        base(ctx, t, p);
        extra(ctx, t, p);
      };
    };
    wrap('stump', (ctx) => {
      ctx.strokeStyle = 'rgba(140,100,60,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, -24, 12, 3.8, 0, 0, PI2);
      ctx.moveTo(4, -24);
      ctx.ellipse(0, -24, 4, 1.3, 0, 0, PI2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(50,30,15,0.45)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-9, -18); ctx.lineTo(-10, -4); ctx.moveTo(6, -17); ctx.lineTo(7, -6); ctx.moveTo(-1, -12); ctx.lineTo(-1, -2);
      ctx.stroke();
      A.shape(ctx, (c) => { c.moveTo(-16, 0); c.quadraticCurveTo(-24, -2, -26, 3); c.lineTo(-14, 2); c.closePath(); }, '#8b5e3c', null, { lw: 1.8 });
      A.shape(ctx, (c) => { c.moveTo(15, 0); c.quadraticCurveTo(24, -3, 27, 3); c.lineTo(14, 2); c.closePath(); }, '#8b5e3c', null, { lw: 1.8 });
      A.ellipse(ctx, -10, -26, 6, 2.5, '#6fae4a', null, { lw: 1.3, hl: false });
      A.shape(ctx, (c) => A.roundRect(c, 10, -12, 3, 6, 1), '#fff0d6', null, { lw: 1, hl: false });
      A.shape(ctx, (c) => c.ellipse(11.5, -12, 5, 3.5, 0, Math.PI, 0), '#f28c38', null, { lw: 1.2, hl: false });
    });
    wrap('log', (ctx) => {
      ctx.strokeStyle = 'rgba(50,30,15,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const x of [-34, -18, -2, 14]) { ctx.moveTo(x, -15); ctx.quadraticCurveTo(x + 6, -9, x + 2, -3); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(140,100,60,0.7)';
      ctx.beginPath(); ctx.ellipse(36, -9, 3, 5, 0, 0, PI2); ctx.stroke();
      for (const [x, k] of [[-6, 0.7], [2, 0.5]]) {
        A.shape(ctx, (c) => A.roundRect(c, x - 1.5, -18 - 6 * k, 3, 6 * k, 1), '#fff0d6', null, { lw: 1, hl: false });
        A.shape(ctx, (c) => c.ellipse(x, -18 - 6 * k, 6 * k, 4 * k, 0, Math.PI, 0), '#e0513a', null, { lw: 1.1, hl: false });
      }
      A.ellipse(ctx, -30, -17, 6, 2.5, '#6fae4a', null, { lw: 1.2, hl: false });
    });
    wrap('bush', (ctx) => {
      ctx.fillStyle = 'rgba(200,240,150,0.55)';
      for (const [x, y] of [[-18, -18], [0, -28], [14, -18], [-6, -10]]) {
        ctx.beginPath(); ctx.ellipse(x, y, 4.5, 2.2, -0.5, 0, PI2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(40,80,30,0.35)';
      for (const [x, y] of [[-10, -6], [10, -4], [22, -8]]) {
        ctx.beginPath(); ctx.ellipse(x, y, 4, 2, 0.4, 0, PI2); ctx.fill();
      }
      A.ellipse(ctx, 4, -26, 2.2, 2.2, '#ff6a6a', null, { noStroke: true, hl: false });
      A.ellipse(ctx, 20, -8, 2.2, 2.2, '#ff6a6a', null, { noStroke: true, hl: false });
    });
    const rockExtra = (moss) => (ctx) => {
      ctx.strokeStyle = 'rgba(30,20,20,0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -14); ctx.lineTo(-3, -8); ctx.lineTo(-6, -2);
      ctx.moveTo(8, -12); ctx.lineTo(12, -6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.ellipse(-8, -15, 5, 1.6, -0.4, 0, PI2); ctx.fill();
      if (moss) {
        ctx.fillStyle = moss;
        ctx.beginPath(); ctx.ellipse(10, -12, 5, 2, 0.5, 0, PI2); ctx.ellipse(-14, -4, 4, 2, 0.8, 0, PI2); ctx.fill();
      }
      for (const [x, r] of [[-24, 3.5], [23, 2.5]]) A.ellipse(ctx, x, -r * 0.6, r, r * 0.7, '#a8a498', null, { lw: 1.2, hl: false });
    };
    wrap('rock', rockExtra('#79b04a'));
    wrap('rockRed', rockExtra(null));
    wrap('rockDark', (ctx, t) => {
      ctx.fillStyle = 'rgba(255,' + Math.round(150 + Math.sin(t * 3) * 40) + ',60,0.9)';
      for (const [x, y] of [[-12, -6], [8, -16], [16, -4]]) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, PI2); ctx.fill(); }
    });
    wrap('snowRock', (ctx) => {
      ctx.strokeStyle = 'rgba(30,40,60,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-6, -2); ctx.moveTo(10, -10); ctx.lineTo(14, -3); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-4, -30); ctx.lineTo(-3, -27); ctx.lineTo(0, -26); ctx.lineTo(-3, -25); ctx.lineTo(-4, -22); ctx.lineTo(-5, -25); ctx.lineTo(-8, -26); ctx.lineTo(-5, -27); ctx.closePath(); ctx.fill();
    });
    wrap('fern', (ctx, t) => {
      ctx.strokeStyle = '#5a9e3a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        const ex = k * 18 + Math.sin(t * 1.5 + k) * 2;
        const ey = -22 + Math.abs(k) * 6;
        for (let j = 1; j < 5; j++) {
          const u = j / 5;
          const px = (1 - u) * (1 - u) * 0 + 2 * (1 - u) * u * k * 10 + u * u * ex;
          const py = 2 * (1 - u) * u * -30 + u * u * ey;
          ctx.moveTo(px, py);
          ctx.lineTo(px - 3, py - 4);
          ctx.moveTo(px, py);
          ctx.lineTo(px + 3, py - 4);
        }
      }
      ctx.stroke();
    });
    wrap('mushCluster', (ctx) => {
      ctx.fillStyle = '#fff6e8';
      ctx.beginPath();
      for (const [x, y, r] of [[-13, -15, 1.4], [-7, -16, 1.2], [1, -19, 1.8], [7, -19, 1.4], [13, -12, 1]]) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, PI2); }
      ctx.fill();
      ctx.fillStyle = '#5f9f3a';
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 3, 0, Math.PI, 0); ctx.fill();
    });
    wrap('driftwood', (ctx) => {
      A.ellipse(ctx, 30, -14, 4, 3, '#e8e4dc', null, { lw: 1.2, hl: false });
      A.ellipse(ctx, 24, -15, 3, 2.4, '#e8e4dc', null, { lw: 1.2, hl: false });
    });
    wrap('crate', (ctx) => {
      ctx.fillStyle = '#5a5a64';
      for (const [x, y] of [[-15, -31], [13, -31], [-15, -5], [13, -5]]) ctx.fillRect(x, y, 2.5, 2.5);
      ctx.strokeStyle = 'rgba(60,34,20,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-16, -24); ctx.lineTo(-4, -24); ctx.moveTo(4, -10); ctx.lineTo(16, -10); ctx.stroke();
    });
    wrap('stoneLantern', (ctx) => {
      if (G.world && G.world.map && G.world.map.region === 4) return;
      ctx.fillStyle = '#6fae4a';
      ctx.beginPath(); ctx.ellipse(-8, -46, 6, 2, -0.2, 0, PI2); ctx.ellipse(-10, -6, 5, 2, 0, 0, PI2); ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,20,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-3, -28); ctx.lineTo(-1, -20); ctx.stroke();
    });
    wrap('urn', (ctx) => {
      ctx.strokeStyle = '#c0902e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -12; x < 12; x += 4) { ctx.moveTo(x, -27); ctx.lineTo(x + 2, -29); ctx.lineTo(x + 4, -27); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(-8, -22, 1.6, 5, 0.2, 0, PI2); ctx.fill();
    });
    wrap('brokenColumn', (ctx) => {
      for (const [x, r] of [[-26, 3], [-30, 2], [30, 2.5]]) A.shape(ctx, (c) => { c.moveTo(x - r, 0); c.lineTo(x - r * 0.4, -r * 1.4); c.lineTo(x + r, -r * 0.6); c.lineTo(x + r * 0.8, 0); c.closePath(); }, '#f4eee4', null, { lw: 1.2 });
    });
  })();

  // ── 前景補充：小石頭、落葉、小花苞，讓地面前緣更有層次（低矮，不擋角色） ──
  function drawForeBits(ctx, map, cam, t) {
    const list = map._fore2;
    if (!list || !list.length) return;
    const y = map.platforms[0][2];
    const x0 = cam.x - 40;
    const x1 = cam.x + G.W + 40;
    const kind = map._fore2Kind;
    for (const f of list) {
      if (f.x < x0 || f.x > x1) continue;
      if (kind === 'lava') {
        A.ellipse(ctx, f.x, y + 12, 9 * f.s, 5 * f.s, '#2a1e22', null, { lw: 1.6, hl: false });
        ctx.fillStyle = 'rgba(255,' + Math.round(140 + Math.sin(t * 3 + f.x) * 40) + ',60,0.9)';
        ctx.fillRect(f.x - 3, y + 9, 2, 2);
        continue;
      }
      // 兩三顆前景小石
      const col = kind === 'snow' ? '#e8f0fa' : kind === 'marble' ? '#f4eee4' : kind === 'sand' ? '#d8c4a0' : '#8e887e';
      const sh = kind === 'snow' ? '#b8c8e0' : kind === 'marble' ? '#d8ccbc' : kind === 'sand' ? '#b8a07a' : '#6e6a60';
      A.ellipse(ctx, f.x, y + 12, 7 * f.s, 4.5 * f.s, col, sh, { lw: 1.6, hl: false, shadeAt: 0 });
      A.ellipse(ctx, f.x + 9 * f.s, y + 13, 4 * f.s, 3 * f.s, col, null, { lw: 1.4, hl: false });
      if (kind === 'grass') {
        const sw = Math.sin(t * 2 + f.x * 0.02) * 1.5;
        ctx.strokeStyle = '#3f7f2a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(f.x - 8, y + 13);
        ctx.quadraticCurveTo(f.x - 9, y + 2, f.x - 6 + sw, y - 4 * f.s);
        ctx.stroke();
        if (f.k > 0.5) A.ellipse(ctx, f.x - 6 + sw, y - 5 * f.s, 2.4, 2.4, f.k > 0.75 ? '#ffe36b' : '#ff9fbf', null, { lw: 1, hl: false });
      } else if (kind === 'leaf' && f.k > 0.4) {
        ctx.fillStyle = f.k > 0.7 ? '#d88a3a' : '#c8a060';
        ctx.beginPath();
        ctx.ellipse(f.x - 10, y + 12, 4, 2, 0.4, 0, PI2);
        ctx.fill();
      } else if (kind === 'marble' && f.k > 0.5) {
        ctx.fillStyle = '#ffc4d8';
        ctx.beginPath();
        ctx.ellipse(f.x - 9, y + 11, 3, 1.6, f.k * 5, 0, PI2);
        ctx.fill();
      }
    }
  }

  // 平台底下垂吊物補細節
  (function enrichHang() {
    const wrap = (name, extra) => {
      const base = HANG[name];
      if (!base) return;
      HANG[name] = function (ctx, h, t) {
        base(ctx, h, t);
        extra(ctx, h, t);
      };
    };
    wrap('seaweed', (ctx, h, t) => {
      const sw = Math.sin(t * 1.3 + h.seed) * 4;
      ctx.fillStyle = '#8ab85a';
      ctx.beginPath();
      for (let k = 1; k <= 3; k++) {
        const u = k / 4;
        const x = h.x + sw * (u * 1.4 - 0.2) + (k % 2 ? 3 : -3);
        const y = h.y - 8 + (h.len + 14) * u;
        ctx.moveTo(x + 2, y);
        ctx.arc(x, y, 2, 0, PI2);
      }
      ctx.fill();
    });
    wrap('dryroot', (ctx, h) => {
      ctx.fillStyle = '#7a5a40';
      ctx.beginPath();
      ctx.ellipse(h.x + 1, h.y - 5, 5, 3, 0, 0, PI2);
      ctx.fill();
      ctx.strokeStyle = '#8a6a4a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(h.x - 2, h.y + h.len * 0.2);
      ctx.lineTo(h.x - 6, h.y + h.len * 0.28);
      ctx.moveTo(h.x + 4, h.y + h.len * 0.45);
      ctx.lineTo(h.x + 7, h.y + h.len * 0.5);
      ctx.stroke();
    });
    wrap('chain', (ctx, h, t) => {
      const sw = Math.sin(t + h.seed) * 1.5;
      const n = Math.ceil(h.len / 8);
      const x = h.x + sw * (n / 6);
      const y = h.y - 4 + n * 8;
      ctx.strokeStyle = '#3a3238';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(x + 3, y + 2, 4, Math.PI, Math.PI * 2.4);
      ctx.stroke();
      ctx.strokeStyle = '#8a8494';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
  })();

  // ── 接上：prepareMap 多算一份地形細節；平台繪製時記住目前的地圖；前景多畫一層 ──
  (function hookTerrain() {
    const basePrep = A.prepareMap;
    A.prepareMap = function (map) {
      basePrep(map);
      buildTerrain(map);
      extraProps(map);
      const rnd = U.seeded(map.w * 3 + 17);
      const th = map._theme;
      const g = map.platforms[0];
      const gs = (th.ground && th.ground.style) || th.plat.style || 'grass';
      map._fore2Kind = TERR_LAVA[map.theme] ? 'lava' : gs === 'snow' || gs === 'ice' ? 'snow' : gs === 'marble' ? 'marble' : gs === 'sand' ? 'sand' : TERR_DRY[map.theme] ? 'leaf' : 'grass';
      map._fore2 = [];
      for (let x = g[0] + 90; x < g[1] - 40; x += 240 + rnd() * 320) map._fore2.push({ x, s: 0.8 + rnd() * 0.5, k: rnd() });
    };
    // 平台整段是靜態的（沒有時間參數），所以第一次看到時把每個平台（地面切成數塊）畫進離屏畫布，
    // 之後每格只貼圖。解析度跟著實際的螢幕縮放（最高 2 倍）；換地圖或一陣子沒看到的塊會被釋放。
    const livePlat = A.drawPlatforms;
    const TILE = 1024;
    const PAD_UP = 46;
    const PAD_DN = 76;
    let pcMap = null;
    let pcScale = 0;
    let pcTiles = new Map();
    let pcFrame = 0;
    function buildTile(map, i, tx0, tw, top, h, sc) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(tw * sc);
      c.height = Math.ceil(h * sc);
      const g = c.getContext('2d');
      g.scale(sc, sc);
      g.translate(-tx0, -top);
      // 只留下這一個平台（其他平台移到很遠的地方），索引不變，裝飾與細節才對得上
      const proxy = Object.create(map);
      proxy.platforms = map.platforms.map((q, k) => (k === i ? q : [-1e9, -1e9 + 1, -1e9]));
      const saveMode = A.mode;
      A.mode = null;
      try {
        livePlat(g, proxy, { x: tx0, y: map.platforms[i][2] - 100 });
      } finally {
        A.mode = saveMode;
      }
      terrMap = map;
      return c;
    }
    A.drawPlatforms = function (ctx, map, cam) {
      const tr = ctx.getTransform ? ctx.getTransform() : null;
      const dev = tr ? Math.hypot(tr.a, tr.b) : 1;
      const sc = Math.max(1, Math.min(2, Math.ceil(dev * 2 - 0.05) / 2));
      if (map !== pcMap || sc !== pcScale) {
        pcTiles = new Map();
        pcMap = map;
        pcScale = sc;
      }
      terrMap = map;
      pcFrame++;
      const x0 = cam.x - 50;
      const x1 = cam.x + G.W + 50;
      map.platforms.forEach((p, i) => {
        if (p[1] < x0 || p[0] > x1) return;
        if (p[2] < cam.y - 40 || p[2] > cam.y + G.H + 60) return;
        const isGround = i === 0;
        const top = p[2] - PAD_UP;
        const h = isGround ? Math.min(900, map.h + 80 - top) : PAD_UP + PAD_DN;
        const L = p[0] - 14;
        const R = p[1] + 14;
        for (let tx = L; tx < R; tx += TILE) {
          const tw = Math.min(TILE, R - tx) + 2;
          if (tx + tw < x0 || tx > x1) continue;
          const key = i + ':' + tx;
          let e = pcTiles.get(key);
          if (!e) {
            e = { c: buildTile(map, i, tx, tw, top, h, sc), used: 0 };
            pcTiles.set(key, e);
          }
          e.used = pcFrame;
          ctx.drawImage(e.c, tx, top, tw, h);
        }
      });
      // 很久沒用到的塊丟掉，省記憶體
      if (pcFrame % 120 === 0) {
        for (const [k, e] of pcTiles) if (pcFrame - e.used > 600) pcTiles.delete(k);
      }
    };
    const baseFore = A.drawForeground;
    A.drawForeground = function (ctx, map, cam, t) {
      baseFore(ctx, map, cam, t);
      drawForeBits(ctx, map, cam, t);
    };
  })();

  A.THEMES = THEMES;
})();
