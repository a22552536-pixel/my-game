// 精緻地形：第二章（風暴海岸）與第三章（燃燒峽谷）的地面、浮空平台與繩索。
// 比照 js/art/ground.js（1-2 試作）的標準：分層的岩／土、材質對應的夾雜物、軟邊的頂層（濕沙、藻墊、塵土、灰燼、石板）、
// 頂緣輪廓光、參差的草叢、稀疏的小擺設、厚實的浮空塊體與細緻的底面（海帶、垂根、滴垂、熔岩滴、底部反光）。
// ・地圖寫 refinedGround: '<材質>'，材質在下面的 MAT 裡：
//   coast（2-1 燈塔岬：濕黑礫石灘＋碼頭木棧）、tidepool（2-2 潮池：濕岩＋藻墊）、wreck（2-3 沉船灣：黑沙＋破船甲板）、
//   reef（2-4 礁岩：玄武礁＋珊瑚、藤壺）、crabnest（2-B 巢灣：貝殼沙＋礁岩；頂面留白讓 Boss 警示清楚）、
//   onsen（3-1 溫泉谷：紅土＋石板）、canyon（3-2 赤岩：紅砂岩層）、steam（3-3 蒸氣隘道：玄武岩柱＋硫磺）、
//   lava（3-4 熔岩河床：黑曜岩＋熔岩裂縫）、volcano（3-B 火山巢：焦岩＋熔岩脈；頂面留白）
// ・全部畫進 background.js 的平台快取塊（每格只貼圖）；土地變老時一樣經過快取的調色，另外活的小東西變少
// ・繩索（麻繩／曬白的繩／鐵鍊）每條畫一次成小貼圖，每格一次 drawImage（加上以上端為軸的擺動）
// ・站立線：頂層上緣固定在平台 y 往上 2px；草、海草、小擺設只是從上面冒出來
// ・G.lowFx（手機省效能）：建快取時少畫擺設、不畫烘進去的光暈
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const PI2 = Math.PI * 2;
  A.GROUND_ART = A.GROUND_ART || {};
  A.ROPE_ART = A.ROPE_ART || {};

  // ── 小工具 ──
  const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const vnoise = (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return hash(i) * (1 - u) + hash(i + 1) * u;
  };
  const fbm = (x, s) => vnoise(x + s) * 0.55 + vnoise(x * 2.3 + s * 1.7) * 0.3 + vnoise(x * 5.3 + s * 3.1) * 0.15;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const low = () => !!G.lowFx;
  // 沿折線畫出越來越細的條狀，加進目前的路徑
  function taperPath(ctx, pts, w0, w1) {
    const n = pts.length / 2;
    const Lx = [];
    const Ly = [];
    const Rx = [];
    const Ry = [];
    for (let k = 0; k < n; k++) {
      const x = pts[k * 2];
      const y = pts[k * 2 + 1];
      const k0 = Math.max(0, k - 1);
      const k1 = Math.min(n - 1, k + 1);
      let tx = pts[k1 * 2] - pts[k0 * 2];
      let ty = pts[k1 * 2 + 1] - pts[k0 * 2 + 1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
      const w = (w0 + (w1 - w0) * (k / (n - 1))) / 2;
      Lx.push(x - ty * w);
      Ly.push(y + tx * w);
      Rx.push(x + ty * w);
      Ry.push(y - tx * w);
    }
    ctx.moveTo(Lx[0], Ly[0]);
    for (let k = 1; k < n; k++) ctx.lineTo(Lx[k], Ly[k]);
    for (let k = n - 1; k >= 0; k--) ctx.lineTo(Rx[k], Ry[k]);
    ctx.closePath();
  }
  // 一整條 x 的查表（畫的時候每個 x 都要問）
  function lut(fn, L, R) {
    const off = L - 16;
    const tb = new Float32Array(Math.ceil(R - L) + 34);
    for (let k = 0; k < tb.length; k++) tb[k] = fn(off + k);
    const last = tb.length - 1;
    return (x) => {
      const k = Math.round(x - off);
      return tb[k < 0 ? 0 : k > last ? last : k];
    };
  }
  // 不規則的石塊輪廓（n 個點，半徑各自抖動）
  function blobPath(ctx, x, y, rx, ry, rot, j) {
    const cs = Math.cos(rot);
    const sn = Math.sin(rot);
    const n = j.length;
    for (let k = 0; k <= n; k++) {
      const q = k % n;
      const an = (q / n) * PI2;
      const px = Math.cos(an) * rx * j[q];
      const py = Math.sin(an) * ry * j[q];
      const X = x + px * cs - py * sn;
      const Y = y + px * sn + py * cs;
      k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
  }
  function radial(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
    g.addColorStop(0.45, 'rgba(' + rgb + ',' + (a * 0.35).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const rgba = (pre, a) => pre + a.toFixed(3) + ')';

  // ════════════════════════════════════════════════════════════
  // 材質
  // ════════════════════════════════════════════════════════════
  // 第二章共用的色票：暗藍灰的濕岩、冷白的輪廓光、底下海面反上來的藍光
  const CH2 = {
    rim: 'rgba(214,232,246,',
    rim2: 'rgba(150,200,236,',
    bounce: 'rgba(90,150,205,',
    ao: 'rgba(6,10,16,',
    shadow: 'rgba(4,10,20,',
    weed: ['#18261f', '#223a2e', '#30503c', '#48684c', '#6c8c68'],
    kelp: ['#17271e', '#22382a', '#335036'],
    kelpTip: 'rgba(150,190,150,0.5)',
    barn: ['#8a9498', '#4a5256', '#1a2024'],
    drip: 'rgba(190,225,250,',
  };
  const CH3 = {
    rim: 'rgba(255,224,184,',
    rim2: 'rgba(255,170,100,',
    bounce: 'rgba(255,120,56,',
    ao: 'rgba(20,6,2,',
    shadow: 'rgba(24,6,2,',
    grass: ['#4e3e1c', '#6e5a2a', '#927636', '#b89a50', '#d8c07a'],
    root: '#4a2e1e',
  };
  const ROCK2 = [['#4a5660', '#2e363e', '#6e7c86'], ['#3e4850', '#262e34', '#5e6a74'], ['#56585a', '#343638', '#7a7e80']];
  const ROCK3 = [['#8a4a36', '#5a2c20', '#b0684c'], ['#6e4a3e', '#44281e', '#946a58'], ['#9a6a4a', '#5e3e2a', '#c08a64']];
  const BASALT = [['#3e3a44', '#24212a', '#5e5866'], ['#34303a', '#1c1a20', '#524c5a'], ['#46404a', '#2a262e', '#686070']];

  const MAT = {};
  // ── 2-1 燈塔岬：濕黑的礫石灘、碼頭木棧 ──
  MAT.coast = {
    ch: 2,
    rope: 'hemp',
    ground: {
      body: ['#40464a', '#30363a', '#23282c', '#171b1e'],
      light: 'rgba(150,164,172,', dark: 'rgba(8,12,16,',
      blotch: ['rgba(92,104,112,', 'rgba(20,26,30,', 'rgba(70,82,76,'],
      speck: ['rgba(190,200,206,0.2)', 'rgba(6,8,10,0.3)', 'rgba(120,130,136,0.24)', 'rgba(90,110,100,0.14)'],
      bands: [[14, 3, 'l'], [30, 7, 'd'], [52, 4, 'l'], [78, 10, 'd'], [110, 4, 'l'], [146, 14, 'd'], [196, 5, 'l'], [240, 16, 'd']],
      facets: 0.25, stone: ROCK2, inc: 'pebble', incN: 1.3, shells: 0.5, buried: 'plank',
      cap: 'sand', capCol: ['#2c3236', '#394046', '#4a5258', '#626c72', '#86929a'], capThick: 6.5, tongue: 0.5,
      tuft: 'weed', tuftN: 0.55, props: ['pebbles', 'shell', 'wrack', 'starfish'], propN: 1,
    },
    plat: { style: 'deck', wood: ['#5a5048', '#463e38', '#342e2a', '#221e1c'], grain: 'rgba(20,16,14,', hi: 'rgba(196,208,214,', wet: 'rgba(20,34,40,', post: '#3a332e', rust: '#6a4a36', barn: true, kelp: true, props: ['coil', 'cleat', 'bucket'] },
  };
  // ── 2-2 潮池沙灘：濕岩棚、藻墊、潮池 ──
  MAT.tidepool = {
    ch: 2,
    rope: 'hemp',
    ground: {
      body: ['#3e4a52', '#2e383f', '#20282e', '#141a1f'],
      light: 'rgba(140,164,178,', dark: 'rgba(6,10,14,',
      blotch: ['rgba(80,100,112,', 'rgba(14,20,26,', 'rgba(60,84,70,'],
      speck: ['rgba(180,200,210,0.18)', 'rgba(4,8,12,0.3)', 'rgba(110,130,140,0.22)', 'rgba(80,120,96,0.16)'],
      bands: [[16, 4, 'l'], [34, 9, 'd'], [60, 4, 'l'], [92, 12, 'd'], [130, 5, 'l'], [176, 16, 'd'], [236, 6, 'l']],
      facets: 0.6, stone: ROCK2, inc: 'rock', incN: 1, barnacles: 0.8, cracks: 'dry',
      cap: 'algae', capCol: ['#1c2c24', '#26402f', '#34583e', '#4c7650', '#78a070'], capThick: 6, tongue: 1,
      tuft: 'weed', tuftN: 0.8, props: ['pool', 'shell', 'starfish', 'pebbles', 'anemone'], propN: 1,
    },
    plat: {
      body: ['#44505a', '#323c44', '#232b32', '#161c21'],
      light: 'rgba(140,164,178,', dark: 'rgba(6,10,14,',
      blotch: ['rgba(80,100,112,', 'rgba(14,20,26,', 'rgba(60,84,70,'],
      speck: null,
      bands: [[12, 2.5, 'l'], [22, 5, 'd'], [34, 3, 'l']],
      facets: 0.8, stone: ROCK2, inc: 'rock', incN: 0.8, barnacles: 1, cracks: 'dry', jag: 2.2, depth: 32,
      cap: 'algae', capCol: ['#1c2c24', '#26402f', '#34583e', '#4c7650', '#78a070'], capThick: 5, tongue: 1,
      tuft: 'weed', tuftN: 0.8, props: ['shell', 'starfish', 'pebbles', 'anemone'], propN: 0.8,
      under: ['kelp', 'drip', 'stal'],
    },
  };
  // ── 2-3 沉船灣：黑沙、破船甲板 ──
  MAT.wreck = {
    ch: 2,
    rope: 'hemp',
    ground: Object.assign({}, MAT.coast.ground, {
      body: ['#3c4044', '#2c3034', '#202428', '#15181b'],
      buried: 'wreck', shells: 0.3, props: ['pebbles', 'shell', 'wrack', 'nail'],
      capCol: ['#2a2e32', '#363c40', '#454c52', '#5c666c', '#808c92'],
    }),
    plat: { style: 'deck', wreck: true, wood: ['#6a6158', '#554c44', '#3e3832', '#2a2622'], grain: 'rgba(12,12,10,', hi: 'rgba(190,206,216,', wet: 'rgba(14,30,30,', post: '#2e2a26', rust: '#7a4a2e', barn: true, kelp: true, props: ['coil', 'lantern', 'nail'] },
  };
  // ── 2-4 浪花礁岩：玄武礁、珊瑚、藤壺、浪花 ──
  MAT.reef = {
    ch: 2,
    rope: 'hemp',
    ground: {
      body: ['#34404a', '#27313a', '#1b232a', '#11161b'],
      light: 'rgba(130,160,180,', dark: 'rgba(4,8,12,',
      blotch: ['rgba(70,96,112,', 'rgba(10,16,22,', 'rgba(96,70,80,'],
      speck: ['rgba(170,196,210,0.18)', 'rgba(2,6,10,0.32)', 'rgba(100,126,140,0.22)', 'rgba(150,100,110,0.12)'],
      bands: [[16, 5, 'l'], [38, 10, 'd'], [66, 4, 'l'], [100, 14, 'd'], [150, 6, 'l'], [200, 18, 'd']],
      facets: 0.7, stone: ROCK2, inc: 'rock', incN: 1.1, barnacles: 1.2, cracks: 'dry', coral: 1,
      cap: 'foam', capCol: ['#1e2a30', '#2a3a42', '#3a4e58', '#587078', '#9ab4bc'], capThick: 5, tongue: 0.8,
      tuft: 'weed', tuftN: 0.5, props: ['coral', 'anemone', 'urchin', 'shell', 'pebbles'], propN: 1,
    },
    plat: {
      body: ['#3a4650', '#2a343d', '#1d252c', '#12171c'],
      light: 'rgba(130,160,180,', dark: 'rgba(4,8,12,',
      blotch: ['rgba(70,96,112,', 'rgba(10,16,22,', 'rgba(96,70,80,'],
      bands: [[11, 3, 'l'], [22, 6, 'd'], [36, 3, 'l']],
      facets: 0.85, stone: ROCK2, inc: 'rock', incN: 0.9, barnacles: 1.3, cracks: 'dry', coral: 1, jag: 3, depth: 34,
      cap: 'foam', capCol: ['#1e2a30', '#2a3a42', '#3a4e58', '#587078', '#9ab4bc'], capThick: 4.5, tongue: 0.8,
      tuft: 'weed', tuftN: 0.5, props: ['coral', 'anemone', 'urchin', 'shell'], propN: 0.9,
      under: ['kelp', 'stal', 'drip'],
    },
  };
  // ── 2-B 寄居蟹的巢灣：貝殼沙地、礁岩平台（頂面留白，細節放在剖面、邊緣與底面） ──
  MAT.crabnest = {
    ch: 2,
    rope: 'hemp',
    arena: true,
    ground: {
      body: ['#3e434c', '#2e323a', '#21252c', '#15171d'],
      light: 'rgba(150,156,176,', dark: 'rgba(6,8,14,',
      blotch: ['rgba(96,96,120,', 'rgba(16,18,26,', 'rgba(110,90,96,'],
      speck: ['rgba(200,196,210,0.2)', 'rgba(4,6,10,0.3)', 'rgba(130,128,146,0.24)', 'rgba(170,140,140,0.14)'],
      bands: [[14, 3, 'l'], [30, 8, 'd'], [52, 4, 'l'], [80, 12, 'd'], [116, 5, 'l'], [156, 14, 'd'], [210, 6, 'l'], [256, 18, 'd']],
      facets: 0.5, stone: ROCK2, inc: 'pebble', incN: 1.2, shells: 1.6, barnacles: 0.4, buried: 'bones',
      cap: 'sand', capCol: ['#2a2d34', '#373b44', '#474c56', '#5e6470', '#8a90a0'], capThick: 6.5, tongue: 0.5,
      tuft: 'weed', tuftN: 0.3, props: ['shell', 'pebbles'], propN: 0.5,
    },
    plat: {
      body: ['#3c424c', '#2c313a', '#1f232a', '#13161b'],
      light: 'rgba(150,156,176,', dark: 'rgba(6,8,14,',
      blotch: ['rgba(96,96,120,', 'rgba(16,18,26,', 'rgba(110,90,96,'],
      bands: [[11, 3, 'l'], [22, 6, 'd'], [36, 3, 'l']],
      facets: 0.8, stone: ROCK2, inc: 'rock', incN: 1, barnacles: 1.4, shells: 0.8, cracks: 'dry', jag: 2.6, depth: 36,
      cap: 'algae', capCol: ['#1e2a26', '#283a32', '#36503f', '#4e6c54', '#7a9678'], capThick: 5, tongue: 1,
      tuft: 'weed', tuftN: 0.45, props: ['shell'], propN: 0.4,
      under: ['kelp', 'stal', 'drip'],
    },
  };
  Object.values(MAT).forEach((m) => {
    for (const key in CH2) if (!(key in m)) m[key] = CH2[key];
  });

  // ── 3-1 溫泉谷：紅土、鋪石板的步道、石板平台 ──
  MAT.onsen = {
    ch: 3,
    rope: 'dryrope',
    ground: {
      body: ['#8e5038', '#723e2c', '#552c20', '#381c14'],
      light: 'rgba(236,170,120,', dark: 'rgba(40,12,6,',
      blotch: ['rgba(170,96,64,', 'rgba(60,24,14,', 'rgba(150,120,84,'],
      speck: ['rgba(250,200,150,0.2)', 'rgba(30,8,2,0.28)', 'rgba(200,140,100,0.24)', 'rgba(240,230,190,0.14)'],
      bands: [[18, 4, 'l'], [36, 8, 'd'], [60, 4, 'l'], [90, 12, 'd'], [130, 5, 'l'], [172, 14, 'd'], [226, 6, 'l']],
      facets: 0.35, stone: ROCK3, inc: 'rock', incN: 1, cracks: 'dry', mineral: 1,
      cap: 'slab', slab: ['#bcae98', '#a4957e', '#d8cab2', '#76685a'], capThick: 9,
      tuft: 'grass', tuftN: 0.55, props: ['pebbles', 'sulfur'], propN: 0.6,
    },
    plat: {
      body: ['#8a5038', '#6c3c2a', '#4e2a1e', '#321a12'],
      light: 'rgba(236,170,120,', dark: 'rgba(40,12,6,',
      blotch: ['rgba(170,96,64,', 'rgba(60,24,14,', 'rgba(150,120,84,'],
      bands: [[16, 3, 'l'], [26, 5, 'd'], [38, 3, 'l']],
      facets: 0.45, stone: ROCK3, inc: 'rock', incN: 0.8, cracks: 'dry', mineral: 1, jag: 2, depth: 34,
      cap: 'slab', slab: ['#bcae98', '#a4957e', '#d8cab2', '#76685a'], capThick: 9,
      tuft: 'grass', tuftN: 0.6, props: ['pebbles', 'sulfur'], propN: 0.5,
      under: ['roots', 'stal', 'drip'], dripRgb: '255,236,200',
    },
  };
  // ── 3-2 赤岩裂谷：紅砂岩的色層、乾草、塵土 ──
  MAT.canyon = {
    ch: 3,
    rope: 'dryrope',
    ground: {
      body: ['#a85438', '#8a422c', '#6a3020', '#461e14'],
      light: 'rgba(246,176,120,', dark: 'rgba(50,14,6,',
      blotch: ['rgba(200,110,70,', 'rgba(70,24,12,', 'rgba(180,130,90,'],
      speck: ['rgba(255,210,160,0.2)', 'rgba(40,10,2,0.26)', 'rgba(210,140,96,0.24)', 'rgba(255,240,210,0.12)'],
      bands: [[14, 5, 'L'], [30, 9, 'd'], [50, 6, 'L'], [74, 12, 'd'], [104, 7, 'L'], [140, 16, 'd'], [182, 8, 'L'], [230, 18, 'd'], [290, 8, 'L']],
      facets: 0.3, stone: ROCK3, inc: 'rock', incN: 1, cracks: 'dry', strataA: 1.6,
      cap: 'dust', capCol: ['#7a3e24', '#9a5230', '#bc7040', '#da9a62', '#f0c290'], capThick: 5, tongue: 0.9,
      tuft: 'grass', tuftN: 0.7, props: ['pebbles', 'bone', 'pebbles'], propN: 0.8,
    },
    plat: {
      body: ['#b05a3c', '#8e452e', '#6c3222', '#481f15'],
      light: 'rgba(246,176,120,', dark: 'rgba(50,14,6,',
      blotch: ['rgba(200,110,70,', 'rgba(70,24,12,', 'rgba(180,130,90,'],
      bands: [[11, 3.5, 'L'], [19, 5, 'd'], [29, 4, 'L'], [38, 6, 'd']],
      facets: 0.4, stone: ROCK3, inc: 'rock', incN: 0.8, cracks: 'dry', strataA: 1.6, jag: 2.4, depth: 36,
      cap: 'dust', capCol: ['#7a3e24', '#9a5230', '#bc7040', '#da9a62', '#f0c290'], capThick: 4.5, tongue: 0.9,
      tuft: 'grass', tuftN: 0.8, props: ['pebbles', 'bone'], propN: 0.7,
      under: ['roots', 'stal'],
    },
  };
  // ── 3-3 蒸氣隘道：玄武岩柱、硫磺結晶、冒熱氣的小孔 ──
  MAT.steam = {
    ch: 3,
    rope: 'dryrope',
    ground: {
      body: ['#48424e', '#38333f', '#29252f', '#1a171f'],
      light: 'rgba(190,176,200,', dark: 'rgba(8,4,10,',
      blotch: ['rgba(110,96,120,', 'rgba(14,10,18,', 'rgba(150,120,80,'],
      speck: ['rgba(210,200,220,0.16)', 'rgba(4,2,6,0.3)', 'rgba(140,130,150,0.22)', 'rgba(230,200,90,0.12)'],
      bands: [[20, 4, 'l'], [44, 8, 'd'], [80, 4, 'l'], [120, 12, 'd'], [180, 5, 'l']],
      stone: BASALT, inc: 'rock', incN: 0.7, columns: 1, sulfur: 1,
      cap: 'basalt', capCol: ['#2e2a34', '#3e3946', '#524c5a', '#6c6676', '#948ea0'], capThick: 5, tongue: 0.4,
      tuft: 'grass', tuftN: 0.35, props: ['vent', 'sulfur', 'pebbles'], propN: 1,
    },
    plat: {
      body: ['#4c4652', '#3a3542', '#2a2632', '#1b1820'],
      light: 'rgba(190,176,200,', dark: 'rgba(8,4,10,',
      blotch: ['rgba(110,96,120,', 'rgba(14,10,18,', 'rgba(150,120,80,'],
      bands: [[14, 2.5, 'l'], [26, 4, 'd']],
      stone: BASALT, inc: 'rock', incN: 0.5, columns: 1, sulfur: 1, depth: 36,
      cap: 'basalt', capCol: ['#2e2a34', '#3e3946', '#524c5a', '#6c6676', '#948ea0'], capThick: 4.5, tongue: 0.4,
      tuft: 'grass', tuftN: 0.4, props: ['vent', 'sulfur', 'pebbles'], propN: 0.9,
      under: ['colstep', 'drip', 'roots'], dripRgb: '255,240,220',
    },
  };
  // ── 3-4 熔岩河床：黑曜岩、發光的熔岩裂縫、灰燼 ──
  MAT.lava = {
    ch: 3,
    rope: 'chain',
    ground: {
      body: ['#3a2c32', '#2c2026', '#20161c', '#130c10'],
      light: 'rgba(170,140,160,', dark: 'rgba(4,0,2,',
      blotch: ['rgba(96,70,84,', 'rgba(8,2,4,', 'rgba(120,60,40,'],
      speck: ['rgba(200,170,190,0.14)', 'rgba(0,0,0,0.32)', 'rgba(130,110,124,0.2)', 'rgba(255,140,60,0.1)'],
      bands: [[18, 4, 'l'], [40, 9, 'd'], [70, 4, 'l'], [106, 12, 'd'], [160, 6, 'l'], [220, 16, 'd']],
      facets: 0.55, stone: [['#2a2228', '#141014', '#4a4048'], ['#342a30', '#1a1418', '#5a4e56'], ['#221c22', '#0e0a0e', '#3e3640']],
      inc: 'obsidian', incN: 1, cracks: 'lava', crackN: 1,
      cap: 'ash', capCol: ['#221a1e', '#30262a', '#42363a', '#5a4c4e', '#7e6c6a'], capThick: 5, tongue: 0.7,
      tuft: 'none', props: ['ember', 'shard', 'pebbles', 'ember'], propN: 1,
    },
    plat: {
      body: ['#3e3036', '#2e2228', '#21171d', '#140d11'],
      light: 'rgba(170,140,160,', dark: 'rgba(4,0,2,',
      blotch: ['rgba(96,70,84,', 'rgba(8,2,4,', 'rgba(120,60,40,'],
      bands: [[12, 2.5, 'l'], [22, 5, 'd']],
      facets: 0.7, stone: [['#2a2228', '#141014', '#4a4048'], ['#342a30', '#1a1418', '#5a4e56'], ['#221c22', '#0e0a0e', '#3e3640']],
      inc: 'obsidian', incN: 0.8, cracks: 'lava', crackN: 1, jag: 3.4, depth: 36,
      cap: 'ash', capCol: ['#221a1e', '#30262a', '#42363a', '#5a4c4e', '#7e6c6a'], capThick: 4.5, tongue: 0.7,
      tuft: 'none', props: ['ember', 'shard', 'ember'], propN: 0.9,
      under: ['lava', 'stal'],
    },
  };
  // ── 3-B 甲龜的火山巢：焦黑的火山岩、熔岩脈（頂面留白） ──
  MAT.volcano = {
    ch: 3,
    rope: 'chain',
    arena: true,
    ground: {
      body: ['#4a2e28', '#3a221e', '#2a1816', '#1a0e0c'],
      light: 'rgba(220,150,120,', dark: 'rgba(10,2,0,',
      blotch: ['rgba(130,70,50,', 'rgba(16,4,2,', 'rgba(150,80,40,'],
      speck: ['rgba(230,170,140,0.14)', 'rgba(0,0,0,0.3)', 'rgba(160,110,90,0.2)', 'rgba(255,150,60,0.12)'],
      bands: [[16, 4, 'l'], [34, 9, 'd'], [60, 4, 'l'], [94, 12, 'd'], [140, 6, 'l'], [196, 16, 'd'], [260, 6, 'l']],
      facets: 0.55, stone: [['#4a3028', '#2a1814', '#6e4a3c'], ['#3a2622', '#201210', '#5a3e34'], ['#2a1e1c', '#140c0a', '#463430']],
      inc: 'obsidian', incN: 1, cracks: 'lava', crackN: 1.2,
      cap: 'crust', capCol: ['#24160f', '#342018', '#4a2e22', '#6a4432', '#946650'], capThick: 5, tongue: 0.6,
      tuft: 'none', props: ['shard', 'pebbles'], propN: 0.5,
    },
    plat: {
      body: ['#4e3029', '#3c241f', '#2c1a16', '#1c0f0c'],
      light: 'rgba(220,150,120,', dark: 'rgba(10,2,0,',
      blotch: ['rgba(130,70,50,', 'rgba(16,4,2,', 'rgba(150,80,40,'],
      bands: [[12, 3, 'l'], [22, 5, 'd'], [34, 3, 'l']],
      facets: 0.7, stone: [['#4a3028', '#2a1814', '#6e4a3c'], ['#3a2622', '#201210', '#5a3e34'], ['#2a1e1c', '#140c0a', '#463430']],
      inc: 'obsidian', incN: 0.9, cracks: 'lava', crackN: 1.2, jag: 3, depth: 38,
      cap: 'crust', capCol: ['#24160f', '#342018', '#4a2e22', '#6a4432', '#946650'], capThick: 4.5, tongue: 0.6,
      tuft: 'none', props: ['shard'], propN: 0.4,
      under: ['lava', 'stal'],
    },
  };
  ['onsen', 'canyon', 'steam', 'lava', 'volcano'].forEach((k) => {
    const m = MAT[k];
    for (const key in CH3) if (!(key in m)) m[key] = CH3[key];
  });
  // 熔岩地的輪廓光偏橘紅（光從下方的熔岩來），底面反光更強
  MAT.lava.rim = 'rgba(255,190,150,';
  MAT.lava.rim2 = 'rgba(255,120,60,';
  MAT.volcano.rim = 'rgba(255,196,150,';
  MAT.volcano.rim2 = 'rgba(255,130,60,';
  MAT.steam.rim = 'rgba(255,236,214,';
  MAT.steam.bounce = 'rgba(255,150,90,';

  // ════════════════════════════════════════════════════════════
  // 地圖準備：每個平台的細節一次算好（位置固定，畫快取塊時只挑看得到的）
  // ════════════════════════════════════════════════════════════
  function buildMap(map) {
    const M = MAT[map.refinedGround];
    if (!M) return;
    const ropes = map.ropes || [];
    map._g23 = map.platforms.map((p, i) => {
      const S = i === 0 ? M.ground : M.plat;
      return S.style === 'deck' ? buildDeck(map, M, S, p, i, ropes) : buildRock(map, M, S, p, i, ropes);
    });
  }
  const nearRopeF = (ropes, y) => (x, d) => ropes.some((r) => Math.abs(r[0] - x) < (d || 16) && (Math.abs(r[1] - y) < 12 || Math.abs(r[2] - y) < 12));
  // 營地（有房子、NPC）那一段地面：小擺設與高草不要擋到
  const inCamp = (map, x, isGround) => isGround && map.camp && x > map.camp.x1 - 40 && x < map.camp.x2 + 40;
  // 繩子上端掛在哪個平台（烘進平台底面的鐵環或綁繩）
  function ropeAnchors(ropes, L, R, y) {
    return ropes.filter((r) => r[3] !== 'ladder' && Math.abs(r[1] - y) < 2 && r[0] > L && r[0] < R).map((r) => r[0]);
  }

  // ── 岩／土塊 ──
  function buildRock(map, M, S, p, i, ropes) {
    const L = p[0];
    const R = p[1];
    const y = p[2];
    const w = R - L;
    const isGround = i === 0;
    const rnd = U.seeded(i * 7919 + L * 5 + y * 3 + 23);
    const seed = rnd() * 100;
    const lowfx = low();
    const arena = !!M.arena;
    const nearRope = nearRopeF(ropes, y);
    const D = { kind: 'rock', seed, isGround, stones: [], blotches: [], cracks: [], barn: [], shells: [], buried: [], cols: [], streaks: [], under: [], stal: [], tongues: [], tufts: [], props: [], anchors: ropeAnchors(ropes, L, R, y) };
    // 浮空塊的厚度：中間厚、兩端收圓；岩質的底面比較參差（幾處鐘乳石般的尖角）；玄武岩是一根根柱子的階梯
    if (!isGround) {
      const base = S.depth || 32;
      const bulges = [];
      for (let x = L + 50 + rnd() * 80; x < R - 50; x += 140 + rnd() * 200) bulges.push({ x, r: 20 + rnd() * 34, d: 6 + rnd() * 10 });
      const teeth = [];
      if (S.jag) for (let x = L + 30 + rnd() * 40; x < R - 30; x += 40 + rnd() * 90) teeth.push({ x, r: 5 + rnd() * 9, d: S.jag * (2 + rnd() * 3.5) });
      let colD = null;
      if (S.columns) {
        colD = [];
        for (let x = L - 14; x < R + 14; ) {
          const cw = 13 + rnd() * 11;
          colD.push({ x0: x, x1: x + cw, d: rnd() * 16 - 4, v: rnd() * 2 - 1, j: [rnd() < 0.3 ? 12 + rnd() * 12 : -1, rnd() < 0.15 ? 24 + rnd() * 8 : -1] });
          x += cw;
        }
        D.colList = colD;
      }
      const raw = (x) => {
        let d = base + 10 * fbm(x * 0.011, seed) + 5 * fbm(x * 0.06, seed + 9);
        for (const b of bulges) {
          const u = (x - b.x) / b.r;
          if (u > -1.6 && u < 1.6) d += b.d * Math.exp(-u * u * 1.6);
        }
        for (const t of teeth) {
          const u = Math.abs(x - t.x) / t.r;
          if (u < 1) d += t.d * (1 - u);
        }
        if (colD) {
          const c = colD.find((q) => x >= q.x0 && x < q.x1);
          if (c) d = base + 4 + c.d;
        }
        const e = clamp(Math.min(x - L, R - x) / (S.columns ? 30 : 44), 0, 1);
        return 12 + (d - 12) * Math.pow(e, 0.6);
      };
      D.depth = lut(raw, L, R);
    } else D.depth = () => 400;
    const depthAt = D.depth;
    // 大片色塊
    const bStep = isGround ? 70 : 56;
    for (let x = L - 20; x < R + 20; x += bStep * (0.6 + rnd() * 0.8)) {
      const rows = isGround ? 2 : 1;
      for (let k = 0; k < rows; k++) {
        const dd = isGround ? 20 + k * 80 + rnd() * 50 : 10 + rnd() * 20;
        D.blotches.push({ x, y: y + dd, r: (isGround ? 40 : 18) + rnd() * (isGround ? 50 : 22), c: Math.floor(rnd() * 3), a: 0.16 + rnd() * 0.22 });
      }
    }
    // 地層色帶
    D.strata = S.bands.map(([d, h, k]) => ({ d, h, k, ph: rnd() * 10, amp: isGround ? 3 + rnd() * 4 : 1.5 + rnd() * 2 }));
    // 夾雜物：石塊（地面越深越大）、卵石層、黑曜岩碎片
    const incN = S.incN || 1;
    const sStep = (isGround ? 50 : 46) / incN;
    for (let x = L + 8; x < R - 8; x += sStep * (0.5 + rnd() * 1.1)) {
      let sy;
      let r;
      if (isGround) {
        const d = 14 + Math.pow(rnd(), 1.3) * 260;
        sy = y + d;
        r = 2.5 + rnd() * (d > 60 ? 9 : 5);
      } else {
        const dep = depthAt(x);
        const edge = rnd() < 0.22;
        sy = y + (edge ? dep - 3 - rnd() * 3 : 10 + rnd() * Math.max(2, dep - 18));
        r = edge ? 3 + rnd() * 3.5 : 1.8 + rnd() * 3.4;
      }
      const round = S.inc === 'pebble';
      const n = S.inc === 'obsidian' ? 5 : 7;
      const j = [];
      for (let k = 0; k < n; k++) j.push(round ? 0.88 + rnd() * 0.16 : 0.66 + rnd() * 0.44);
      D.stones.push({ x, y: sy, rx: r * (1.1 + rnd() * 0.6), ry: r * (round ? 0.6 + rnd() * 0.2 : 0.62 + rnd() * 0.34), rot: (rnd() - 0.5) * (round ? 0.4 : 1.2), v: Math.floor(rnd() * 3), j });
    }
    // 卵石灘：地層裡一整排一整排的小圓石
    if (S.inc === 'pebble' && isGround) {
      for (const s of D.strata) {
        if (s.k !== 'l') continue;
        for (let x = L + rnd() * 10; x < R; x += 5 + rnd() * 9) {
          const yy = y + s.d + Math.sin(x * 0.013 + s.ph) * s.amp + rnd() * s.h * 1.4;
          D.stones.push({ x, y: yy, rx: 1.4 + rnd() * 2.2, ry: 1 + rnd() * 1.2, rot: 0, v: Math.floor(rnd() * 3), tiny: true, lit: true });
        }
      }
    }
    // 細碎石子
    for (let x = L + 4; x < R - 4; x += 9 + rnd() * 16) {
      const dep = isGround ? 12 + rnd() * 240 : 7 + rnd() * Math.max(3, depthAt(x) - 10);
      D.stones.push({ x, y: y + dep, rx: 0.9 + rnd() * 1.5, ry: 0.7 + rnd() * 1, rot: 0, v: Math.floor(rnd() * 3), tiny: true });
    }
    // 裂縫（乾裂或發光的熔岩脈）
    if (S.cracks) {
      const lava = S.cracks === 'lava';
      const step = (isGround ? (lava ? 150 : 210) : lava ? 70 : 110) / (S.crackN || 1);
      for (let x = L + 20 + rnd() * step; x < R - 20; x += step * (0.6 + rnd() * 0.9)) {
        const maxY = isGround ? 60 + rnd() * 200 : depthAt(x) - 2;
        const y0 = y + (isGround ? 10 + rnd() * 40 : 7 + rnd() * 4);
        const pts = [];
        let px = x;
        let py = y0;
        let ang = Math.PI / 2 + (rnd() - 0.5) * 1.2;
        const segs = isGround ? 5 + Math.floor(rnd() * 5) : 3 + Math.floor(rnd() * 3);
        const segL = isGround ? 9 + rnd() * 10 : 5 + rnd() * 5;
        for (let k = 0; k <= segs; k++) {
          pts.push(px, py);
          ang += (rnd() - 0.5) * 1.1;
          ang = clamp(ang, 0.35, Math.PI - 0.35);
          px += Math.cos(ang) * segL;
          py += Math.sin(ang) * segL;
          if (!isGround && py > y + depthAt(px) - 2) break;
          if (py > y + maxY) break;
        }
        if (pts.length < 4) continue;
        const br = [];
        if (rnd() < 0.6 && pts.length > 5) {
          const k = 1 + Math.floor(rnd() * (pts.length / 2 - 2));
          const dir = rnd() < 0.5 ? -1 : 1;
          br.push([pts[k * 2], pts[k * 2 + 1], pts[k * 2] + dir * (5 + rnd() * 10), pts[k * 2 + 1] + 4 + rnd() * 8, pts[k * 2] + dir * (9 + rnd() * 14), pts[k * 2 + 1] + 8 + rnd() * 10]);
        }
        D.cracks.push({ pts, br, w: (lava ? 1.4 : 1) * (0.8 + rnd() * 0.9) });
      }
    }
    // 藤壺：浮空塊貼著底緣與兩側（浪打得到的地方），地面在頂層下方一段
    if (S.barnacles) {
      const st = (isGround ? 60 : 34) / S.barnacles / (lowfx ? 0.5 : 1);
      for (let x = L + 6 + rnd() * st; x < R - 6; x += st * (0.5 + rnd())) {
        const n = 2 + Math.floor(rnd() * 5);
        const by = isGround ? y + 12 + rnd() * 50 : y + depthAt(x) - 3 - rnd() * 7;
        for (let k = 0; k < n; k++) D.barn.push({ x: x + (rnd() - 0.5) * 12, y: by + (rnd() - 0.5) * 5, r: 1.2 + rnd() * 1.9 });
      }
    }
    // 岩面的斷面（一塊塊斜切的岩板：上緣受光、下緣與右緣暗）
    D.facets = [];
    if (S.facets) {
      const rows = isGround ? [[8, 46], [50, 110], [116, 190]] : [[0, 0]];
      for (const [r0, r1] of rows) {
        for (let x = L + 4 + rnd() * 20; x < R - 8; ) {
          const fw = (isGround ? 34 : 22) + rnd() * (isGround ? 50 : 30);
          const x1 = Math.min(R - 4, x + fw);
          let yT;
          let yB;
          if (isGround) {
            yT = y + r0 + rnd() * 10;
            yB = y + r1 - rnd() * 12;
          } else {
            const dm = Math.min(depthAt(x), depthAt(x1));
            yT = y + S.capThick + 4 + rnd() * 6;
            yB = y + dm - 3 - rnd() * 8;
          }
          if (yB - yT > 8 && rnd() < S.facets) D.facets.push({ x0: x, x1, xm: x + (x1 - x) * (0.3 + rnd() * 0.4), yT, yB, d1: (rnd() - 0.5) * 8, d2: (rnd() - 0.5) * 8, pk: 2 + rnd() * 5, sk: (rnd() - 0.5) * 22, sb: (rnd() - 0.5) * 10, v: rnd() * 2 - 1 });
          x = x1 + rnd() * 6;
        }
      }
    }
    // 嵌在沙裡的貝殼
    if (S.shells) {
      const st = (isGround ? 70 : 60) / S.shells;
      for (let x = L + 10 + rnd() * st; x < R - 10; x += st * (0.5 + rnd())) {
        const dep = isGround ? 10 + Math.pow(rnd(), 1.4) * 160 : 9 + rnd() * Math.max(2, depthAt(x) - 16);
        D.shells.push({ x, y: y + dep, r: 2 + rnd() * (isGround ? 3.5 : 2), rot: (rnd() - 0.5) * 2.4, k: rnd() < 0.3 ? 1 : 0 });
      }
    }
    // 埋在地裡的東西：漂流木板、沉船的肋材、大貝殼
    if (S.buried && isGround) {
      for (let x = L + 120 + rnd() * 200; x < R - 80; x += 380 + rnd() * 420) {
        const kind = S.buried === 'wreck' ? (rnd() < 0.45 ? 'rib' : 'plank') : S.buried === 'bones' ? 'bigshell' : 'plank';
        D.buried.push({ kind, x, y: y + 30 + rnd() * 90, len: 40 + rnd() * 60, rot: (rnd() - 0.5) * 0.5, r: 7 + rnd() * 6, s: rnd() });
      }
    }
    // 玄武岩柱的立面
    if (S.columns) {
      if (isGround) {
        for (let x = L - 10; x < R + 10; ) {
          const cw = 16 + rnd() * 14;
          D.cols.push({ x0: x, x1: x + cw, v: rnd() * 2 - 1, j: [30 + rnd() * 60, rnd() < 0.5 ? 100 + rnd() * 120 : -1], top: rnd() * 6 });
          x += cw;
        }
      } else D.cols = D.colList;
    }
    // 礦物沉積的條紋（溫泉的白色水垢、硫磺黃）
    if (S.mineral || S.sulfur) {
      const st = isGround ? 160 : 90;
      for (let x = L + 20 + rnd() * st; x < R - 20; x += st * (0.6 + rnd() * 0.9)) {
        D.streaks.push({ x, w: 4 + rnd() * 10, len: isGround ? 20 + rnd() * 50 : 8 + rnd() * Math.max(4, depthAt(x) - 16), sul: S.sulfur ? rnd() < 0.7 : rnd() < 0.2 });
      }
    }
    // 底面
    if (!isGround && S.under) {
      const U2 = S.under;
      for (let x = L + 10; x < R - 10; x += (10 + rnd() * 22) * (lowfx ? 1.8 : 1)) {
        const dep = depthAt(x);
        const room = 72 - dep;
        if (room < 6) continue;
        const r = rnd();
        const type = U2[Math.floor(r * r * U2.length)];
        if (type === 'kelp') {
          const n = 1 + Math.floor(rnd() * 3);
          for (let k = 0; k < n; k++) D.under.push({ t: 'kelp', x: x + (rnd() - 0.5) * 8, y: y + dep - 3, len: Math.min(room, 6 + Math.pow(rnd(), 1.4) * 30), w: 1.6 + rnd() * 2.6, sw: (rnd() - 0.5) * 8, c: Math.floor(rnd() * 3), bulb: rnd() < 0.25 });
        } else if (type === 'roots') {
          D.under.push({ t: 'root', x, y: y + dep - 2, len: Math.min(room, 6 + Math.pow(rnd(), 1.6) * 34), w: 0.8 + rnd() * 1.6, sw: (rnd() - 0.5) * 12, curl: rnd() * 6 });
        } else if (type === 'stal') {
          D.stal.push({ x, w: 3 + rnd() * 4, len: Math.min(room - 2, 4 + rnd() * 10) });
        } else if (type === 'drip') {
          D.under.push({ t: 'drip', x, y: y + dep, len: 2 + rnd() * 3, fall: rnd() < 0.4 ? 5 + rnd() * Math.min(20, room - 6) : 0 });
        } else if (type === 'lava') {
          D.under.push({ t: 'lava', x, y: y + dep - 2, len: Math.min(room - 4, 4 + Math.pow(rnd(), 1.5) * 16), w: 2 + rnd() * 2.6, fall: rnd() < 0.3 ? 6 + rnd() * Math.min(18, room - 10) : 0 });
        } else if (type === 'colstep') {
          D.under.push({ t: 'drip', x, y: y + dep, len: 2 + rnd() * 2, fall: rnd() < 0.3 ? 6 + rnd() * 12 : 0 });
        }
      }
    }
    // 頂層往側面垂下的舌狀邊
    const tg = S.tongue || 0.6;
    for (let x = L + 12 + rnd() * 40; x < R - 10; x += (34 + rnd() * 80) / tg) D.tongues.push({ x, r: 6 + rnd() * 20, d: (2 + rnd() * (isGround ? 9 : 7)) * tg });
    // 頂層下緣的查表
    D.cap = lut((x) => capLowRaw(D, S, clamp(x, L, R), L, R), L, R);
    // 草叢／海草：繩子兩端附近少一點；Boss 房的地面中段、浮空平台中段不長（警示範圍要清楚）
    const clearTop = (x) => arena && (isGround ? x > L + 140 && x < R - 140 : x > L + 34 && x < R - 34);
    if (S.tuft && S.tuft !== 'none') {
      const dens = S.tuftN || 0.6;
      for (let x = L + 2 + rnd() * 10; x < R - 2; x += (10 + rnd() * 30) / dens) {
        if (nearRope(x, 12) && rnd() < 0.7) continue;
        if (clearTop(x)) continue;
        const camp = inCamp(map, x, isGround);
        if (camp && rnd() < 0.6) continue;
        const n = 3 + Math.floor(rnd() * 6);
        const tall = !camp && rnd() < 0.16 ? 1.5 : 1;
        const blades = [];
        for (let k = 0; k < n; k++) {
          const h = (S.tuft === 'grass' ? 5 + Math.pow(rnd(), 1.3) * 11 : 4 + Math.pow(rnd(), 1.4) * 10) * tall * (camp ? 0.7 : 1);
          blades.push({ dx: (rnd() - 0.5) * 9, h, lean: (rnd() - 0.5) * h * (S.tuft === 'grass' ? 0.5 : 0.9), w: S.tuft === 'grass' ? 0.7 + rnd() * 0.8 : 1.1 + rnd() * 1.4, tone: rnd() < 0.25 ? 0 : 1 + Math.floor(rnd() * 4) });
        }
        D.tufts.push({ x, blades });
      }
    } else {
      // 沒有草的材質：頂緣一粒粒的碎岩、小尖角，讓輪廓不死板
      for (let x = L + 4 + rnd() * 10; x < R - 4; x += 14 + rnd() * 30) {
        if (clearTop(x) && rnd() < 0.75) continue;
        D.tufts.push({ x, crumb: true, n: 1 + Math.floor(rnd() * 3), s: 0.8 + rnd() * 0.9, r: rnd() });
      }
    }
    // 小擺設（稀疏）
    if (S.props && S.props.length) {
      const st = (isGround ? 150 : 120) / (S.propN || 1) / (lowfx ? 0.55 : 1);
      for (let x = L + 24 + rnd() * st; x < R - 16; x += st * (0.55 + rnd() * 0.9)) {
        if (nearRope(x, 26) || inCamp(map, x, isGround)) continue;
        if (clearTop(x)) continue;
        const kind = S.props[Math.floor(rnd() * S.props.length)];
        D.props.push({ kind, x, s: 0.8 + rnd() * 0.5, r: rnd(), k: rnd(), v: Math.floor(rnd() * 3), f: rnd() < 0.5 ? -1 : 1 });
      }
    }
    return D;
  }
  // 頂層的下緣：厚度＋垂下來的舌狀邊（石板是平整的）
  function capLowRaw(D, S, x, L, R) {
    if (S.cap === 'slab') return S.capThick + 1;
    let d = S.capThick + 2.6 * fbm(x * 0.05, D.seed + 3);
    for (const t of D.tongues) {
      const u = (x - t.x) / t.r;
      if (u > -1.5 && u < 1.5) d += t.d * Math.exp(-u * u * 2);
    }
    if (!D.isGround) {
      const e = Math.min(x - L, R - x);
      if (e < 16) d += (16 - e) * 0.4;
    }
    return d;
  }

  // ── 木棧／破船甲板 ──
  function buildDeck(map, M, S, p, i, ropes) {
    const L = p[0];
    const R = p[1];
    const y = p[2];
    const rnd = U.seeded(i * 6151 + L * 3 + y * 7 + 5);
    const seed = rnd() * 100;
    const nearRope = nearRopeF(ropes, y);
    const wreck = !!S.wreck;
    const D = { kind: 'deck', seed, boards: [], posts: [], braces: [], joists: [], under: [], props: [], holes: [], anchors: ropeAnchors(ropes, L, R, y) };
    // 兩端：破船的板子長短不一、斷口是碎裂的尖角
    D.endL = wreck ? L - 4 - rnd() * 6 : L - 3;
    D.endR = wreck ? R + 4 + rnd() * 6 : R + 3;
    D.strL = wreck ? L + 4 + rnd() * 14 : L + 2;
    D.strR = wreck ? R - 4 - rnd() * 14 : R - 2;
    D.spL = [];
    D.spR = [];
    for (let k = 0; k < 4; k++) {
      D.spL.push(rnd());
      D.spR.push(rnd());
    }
    // 頂層木板：接縫、節疤、深淺
    for (let x = D.endL; x < D.endR; ) {
      const bw = 50 + rnd() * 70;
      D.boards.push({ x0: x, x1: Math.min(D.endR, x + bw), tone: rnd(), knots: rnd() < 0.5 ? [x + 10 + rnd() * (bw - 20)] : [], grain: [rnd() * 5, rnd() * 5, rnd() * 5], dy: rnd() < 0.2 ? 0.6 : 0 });
      x += bw;
    }
    // 下面的橫樑端頭
    for (let x = D.strL + 16 + rnd() * 20; x < D.strR - 10; x += 38 + rnd() * 20) D.joists.push({ x, w: 6 + rnd() * 2.5 });
    // 木樁（碼頭）或船殼（沉船）
    if (!wreck) {
      const xs = [L + 16 + rnd() * 6];
      while (xs[xs.length - 1] < R - 140) xs.push(xs[xs.length - 1] + 90 + rnd() * 70);
      xs.push(R - 16 - rnd() * 6);
      for (const x of xs) D.posts.push({ x, w: 7 + rnd() * 2.5, len: 42 + rnd() * 14, br: rnd(), tilt: (rnd() - 0.5) * 0.04, barn: 2 + Math.floor(rnd() * 5), weed: rnd() < 0.7 });
      for (let k = 0; k < D.posts.length - 1; k++) {
        const a = D.posts[k];
        const b = D.posts[k + 1];
        if (b.x - a.x > 200 || rnd() < 0.25) continue;
        D.braces.push({ x0: a.x, x1: b.x, dir: rnd() < 0.5 ? 1 : -1, cross: rnd() < 0.35 });
      }
    } else {
      // 船殼：中間往下鼓成碗狀，兩端露出斷掉的肋材
      const h0 = L + 26 + rnd() * 20;
      const h1 = R - 26 - rnd() * 20;
      const maxD = 50 + rnd() * 12;
      D.hull = { x0: h0, x1: h1, maxD };
      D.hullD = lut((x) => {
        const u = (x - h0) / (h1 - h0);
        if (u <= 0 || u >= 1) return 13;
        return 13 + (maxD - 13) * Math.pow(Math.sin(Math.PI * u), 0.55) + (fbm(x * 0.05, seed) - 0.5) * 3;
      }, L, R);
      for (let x = h0 + 20 + rnd() * 30; x < h1 - 20; x += 60 + rnd() * 80) if (rnd() < 0.55) D.holes.push({ x, y: y + 20 + rnd() * 16, w: 8 + rnd() * 14, h: 4 + rnd() * 5 });
      D.ribs = [];
      for (const [x, dir] of [[h0 - 4, -1], [h1 + 4, 1]]) D.ribs.push({ x, dir, len: 26 + rnd() * 22, br: rnd() });
      for (let x = h0 + 40 + rnd() * 40; x < h1 - 40; x += 90 + rnd() * 70) D.ribs.push({ x, dir: 0, len: 0, br: rnd() });
    }
    // 底下垂的海帶、水滴、破網
    const bottomAt = (x) => (wreck ? y + D.hullD(x) : y + 19);
    D.bottomAt = bottomAt;
    for (let x = L + 10; x < R - 10; x += 14 + rnd() * 26) {
      const r = rnd();
      const by = bottomAt(x);
      const room = y + 72 - by;
      if (room < 6) continue;
      if (r < 0.4) {
        const n = 1 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) D.under.push({ t: 'kelp', x: x + (rnd() - 0.5) * 8, y: by - 2, len: Math.min(room, 5 + Math.pow(rnd(), 1.4) * (wreck ? 16 : 26)), w: 1.4 + rnd() * 2.2, sw: (rnd() - 0.5) * 8, c: Math.floor(rnd() * 3), bulb: rnd() < 0.2 });
      } else if (r < 0.62) D.under.push({ t: 'drip', x, y: by, len: 2 + rnd() * 3, fall: rnd() < 0.4 ? 5 + rnd() * Math.min(18, room - 6) : 0 });
    }
    for (const p2 of D.posts) {
      if (!p2.weed) continue;
      const n = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) D.under.push({ t: 'kelp', x: p2.x + (rnd() - 0.5) * p2.w, y: y + 16 + p2.len * (0.5 + rnd() * 0.35), len: 8 + rnd() * 12, w: 1.3 + rnd() * 1.5, sw: (rnd() - 0.5) * 6, c: Math.floor(rnd() * 3) });
    }
    // 破網（掛在木樁之間，末端綁浮球）
    D.nets = [];
    if (rnd() < 0.8 && R - L > 200) {
      const x0 = L + 40 + rnd() * (R - L - 160);
      D.nets.push({ x0, x1: x0 + 50 + rnd() * 50, sag: 10 + rnd() * 10, floats: rnd() < 0.7 });
    }
    // 頂面的小擺設（稀疏）
    const st = 200 / (low() ? 0.55 : 1);
    for (let x = L + 30 + rnd() * 100; x < R - 24; x += st * (0.6 + rnd() * 0.9)) {
      if (nearRope(x, 30)) continue;
      D.props.push({ kind: S.props[Math.floor(rnd() * S.props.length)], x, s: 0.85 + rnd() * 0.3, r: rnd(), k: rnd(), f: rnd() < 0.5 ? -1 : 1 });
    }
    return D;
  }

  // ── 小貼圖（顆粒、頂層的點點、木紋）：畫一次、用 pattern 鋪；土地變老時用同一套調色另外畫一張 ──
  const TEX_W = 256;
  const texCache = new Map();
  function texPattern(ctx, map, kind) {
    if (typeof document === 'undefined' || !ctx.createPattern) return null;
    const M = MAT[map.refinedGround];
    const key = map.refinedGround + ':' + kind + ':' + (map._aged || 0);
    let c = texCache.get(key);
    if (!c) {
      const SC = 2;
      const H = kind === 'speck' ? 256 : kind === 'wood' ? 64 : 26;
      c = document.createElement('canvas');
      c.width = TEX_W * SC;
      c.height = H * SC;
      const g = c.getContext('2d');
      g.scale(SC, SC);
      const r = U.seeded(kind === 'speck' ? 4243 : kind === 'wood' ? 991 : 779);
      const draw = () => {
        if (kind === 'speck') {
          const cols = M.ground.speck;
          for (let cI = 0; cI < 4; cI++) {
            g.fillStyle = cols[cI];
            g.beginPath();
            for (let k = 0; k < 340; k++) {
              const x = r() * TEX_W;
              const yy = r() * H;
              const sz = 0.6 + r() * r() * 2.2;
              for (const ox of [0, -TEX_W]) for (const oy of [0, -H]) g.rect(x + ox, yy + oy, sz, sz * 0.8);
            }
            g.fill();
          }
        } else if (kind === 'wood') {
          // 木紋：細長的深淺紋路、偶爾一條裂紋
          const W = M.plat.wood;
          for (let k = 0; k < 90; k++) {
            const yy = r() * H;
            const x = r() * TEX_W;
            const len = 20 + r() * 90;
            g.strokeStyle = r() < 0.6 ? 'rgba(10,8,6,' + (0.12 + r() * 0.2).toFixed(2) + ')' : 'rgba(200,210,214,' + (0.05 + r() * 0.08).toFixed(2) + ')';
            g.lineWidth = 0.4 + r() * 0.8;
            for (const ox of [0, -TEX_W]) {
              g.beginPath();
              g.moveTo(x + ox, yy);
              g.bezierCurveTo(x + ox + len * 0.3, yy + (r() - 0.5) * 2, x + ox + len * 0.7, yy + (r() - 0.5) * 2, x + ox + len, yy + (r() - 0.5) * 1.5);
              g.stroke();
            }
          }
          g.fillStyle = W[3];
          g.globalAlpha = 0.35;
          for (let k = 0; k < 16; k++) {
            const x = r() * TEX_W;
            const yy = r() * H;
            g.fillRect(x, yy, 6 + r() * 20, 0.8);
          }
          g.globalAlpha = 1;
        } else {
          // 頂層的點點：亮點集中在上緣，暗點散在下半
          const C = M.ground.capCol || M.plat.capCol || ['#333', '#444', '#555', '#777', '#999'];
          const dots = [C[4], C[0], C[3]];
          for (let cI = 0; cI < 3; cI++) {
            g.fillStyle = dots[cI];
            g.globalAlpha = cI === 1 ? 0.45 : 0.5;
            g.beginPath();
            for (let k = 0; k < 140; k++) {
              const x = r() * TEX_W;
              const yy = 2 + r() * (cI === 1 ? 20 : 8);
              const sz = 0.5 + r() * (cI === 1 ? 1.2 : 1.4);
              for (const ox of [0, -TEX_W]) {
                g.moveTo(x + ox + sz, yy);
                g.ellipse(x + ox, yy, sz, sz * 0.7, 0, 0, PI2);
              }
            }
            g.fill();
          }
          g.globalAlpha = 1;
        }
      };
      if (A.withAge) A.withAge(g, map, draw);
      else draw();
      if (texCache.size > 24) texCache.clear();
      texCache.set(key, c);
    }
    const pat = ctx.createPattern(c, 'repeat');
    if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0]));
    return pat;
  }

  // ════════════════════════════════════════════════════════════
  // 岩／土塊的畫法：一次畫一個平台（快取塊裡只會有這一個平台；x0..x1 是這一塊的範圍）
  // ════════════════════════════════════════════════════════════
  function drawRock(ctx, map, M, S, D, p, x0, x1) {
    const L = p[0];
    const R = p[1];
    const y = p[2];
    const isGround = D.isGround;
    const lvl = map._aged || 0;
    const keep = 1 - 0.85 * lvl;
    const lowfx = low();
    const a = Math.max(L - 20, x0 - 40);
    const b = Math.min(R + 20, x1 + 40);
    const vis = (x, pad) => x > a - (pad || 0) && x < b + (pad || 0);
    const bottomY = isGround ? map.h + 120 : 0;
    const depth = D.depth;
    const lava = S.cracks === 'lava';

    const bodyPath = () => {
      ctx.beginPath();
      if (isGround) {
        ctx.rect(L, y + 1, R - L, bottomY - y);
        return;
      }
      const st = S.columns ? 3 : 6;
      ctx.moveTo(L, y + 1);
      ctx.lineTo(R, y + 1);
      ctx.quadraticCurveTo(R + 5, y + 3, R + 4, y + 9);
      ctx.quadraticCurveTo(R + 2, y + depth(R - 4), R - 5, y + depth(R - 5));
      for (let x = Math.ceil((R - 5) / st) * st - st; x > L + 5; x -= st) ctx.lineTo(x, y + depth(x) + (S.columns ? 0 : (hash(x * 0.37 + D.seed) - 0.5) * (S.jag ? 3.2 : 2.2)));
      ctx.lineTo(L + 5, y + depth(L + 5));
      ctx.quadraticCurveTo(L - 2, y + depth(L + 4), L - 4, y + 9);
      ctx.quadraticCurveTo(L - 5, y + 3, L, y + 1);
      ctx.closePath();
    };

    // 浮空塊底下淡淡的陰影
    if (!isGround) {
      const g = ctx.createLinearGradient(0, y + 20, 0, y + 74);
      g.addColorStop(0, rgba(M.shadow, 0.24));
      g.addColorStop(1, rgba(M.shadow, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse((L + R) / 2, y + 36, (R - L) / 2 + 6, 36, 0, 0, Math.PI);
      ctx.fill();
      // 熔岩地：底下被熔岩照亮的一層光
      if (lava && !lowfx) {
        const g2 = ctx.createLinearGradient(0, y + 30, 0, y + 76);
        g2.addColorStop(0, rgba(M.bounce, 0));
        g2.addColorStop(0.5, rgba(M.bounce, 0.1));
        g2.addColorStop(1, rgba(M.bounce, 0));
        ctx.fillStyle = g2;
        ctx.fillRect(L + 10, y + 30, R - L - 20, 46);
      }
    }
    // 本體：由上往下變深
    {
      const g = ctx.createLinearGradient(0, y, 0, isGround ? y + 260 : y + 50);
      g.addColorStop(0, S.body[0]);
      g.addColorStop(0.3, S.body[1]);
      g.addColorStop(0.72, S.body[2]);
      g.addColorStop(1, S.body[3]);
      ctx.fillStyle = g;
      bodyPath();
      ctx.fill();
    }
    ctx.save();
    bodyPath();
    ctx.clip();
    // 大片色塊
    for (const o of lowfx ? [] : D.blotches) {
      if (!vis(o.x, o.r)) continue;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, S.blotch[o.c] + o.a.toFixed(2) + ')');
      g.addColorStop(1, S.blotch[o.c] + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
    }
    // 地層色帶（'L' 是紅砂岩那種明顯的亮層）
    const sa = S.strataA || 1;
    for (const s of D.strata) {
      const top = [];
      for (let x = Math.floor(a / 24) * 24 - 24; x <= b + 24; x += 24) top.push(x, y + s.d + Math.sin(x * 0.013 + s.ph) * s.amp + (fbm(x * 0.03, s.ph) - 0.5) * s.amp);
      const dark = s.k === 'd';
      ctx.fillStyle = dark ? rgba(S.dark, 0.2 * sa) : rgba(S.light, (s.k === 'L' ? 0.2 : 0.16) * sa);
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      for (let k = 2; k < top.length; k += 2) ctx.lineTo(top[k], top[k + 1]);
      for (let k = top.length - 2; k >= 0; k -= 2) ctx.lineTo(top[k], top[k + 1] + s.h * (0.5 + fbm(top[k] * 0.02, s.ph + 5)));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = dark ? rgba(S.dark, 0.2) : rgba(S.light, 0.24);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      for (let k = 2; k < top.length; k += 2) ctx.lineTo(top[k], top[k + 1]);
      ctx.stroke();
    }
    // 岩面的斷面：斜斜的岩板，上緣受光、右下的折線暗
    if (D.facets.length && !lowfx) {
      const list = D.facets.filter((f) => f.x1 > a - 20 && f.x0 < b + 20);
      const poly = (f) => {
        ctx.moveTo(f.x0, f.yT + f.d1);
        ctx.lineTo(f.xm, f.yT - f.pk);
        ctx.lineTo(f.x1, f.yT + f.d2);
        ctx.lineTo(f.x1 + f.sk, f.yB + f.sb);
        ctx.lineTo(f.x0 + f.sk * 0.3, f.yB - f.sb);
        ctx.closePath();
      };
      for (const f of list) {
        ctx.fillStyle = f.v > 0 ? rgba(S.light, 0.04 + f.v * 0.07) : rgba(S.dark, 0.06 - f.v * 0.1);
        ctx.beginPath();
        poly(f);
        ctx.fill();
      }
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = rgba(S.light, 0.22);
      ctx.beginPath();
      for (const f of list) {
        ctx.moveTo(f.x0, f.yT + f.d1);
        ctx.lineTo(f.xm, f.yT - f.pk);
        ctx.lineTo(f.x1, f.yT + f.d2);
      }
      ctx.stroke();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = rgba(S.dark, 0.42);
      ctx.beginPath();
      for (const f of list) {
        ctx.moveTo(f.x1 + 0.5, f.yT + f.d2 + 0.5);
        ctx.lineTo(f.x1 + f.sk + 0.5, f.yB + f.sb);
      }
      ctx.stroke();
    }
    // 玄武岩柱：一根根的立面，亮暗交替、柱與柱之間的縫、橫向的節理
    if (D.cols.length) {
      const cy1 = isGround ? y + 330 : y + 76;
      for (const c of D.cols) {
        if (c.x1 < a || c.x0 > b) continue;
        const v = c.v;
        ctx.fillStyle = v > 0 ? rgba(S.light, 0.07 + v * 0.1) : rgba(S.dark, 0.1 - v * 0.14);
        ctx.fillRect(c.x0, y, c.x1 - c.x0, cy1 - y);
        // 左緣受光的窄條
        ctx.fillStyle = rgba(S.light, 0.08);
        ctx.fillRect(c.x0 + 1, y + 4, 1.6, cy1 - y);
      }
      ctx.strokeStyle = rgba(S.dark, 0.5);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (const c of D.cols) {
        if (c.x1 < a || c.x0 > b) continue;
        ctx.moveTo(c.x0, y + 4);
        ctx.lineTo(c.x0 + 0.5, cy1);
        for (const jy of c.j) {
          if (jy < 0) continue;
          ctx.moveTo(c.x0, y + jy);
          ctx.lineTo(c.x0 + (c.x1 - c.x0) * 0.5, y + jy + 2);
          ctx.lineTo(c.x1, y + jy + 0.5);
        }
      }
      ctx.stroke();
      ctx.strokeStyle = rgba(S.light, 0.14);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (const c of D.cols) {
        if (c.x1 < a || c.x0 > b) continue;
        for (const jy of c.j) {
          if (jy < 0) continue;
          ctx.moveTo(c.x0 + 1, y + jy + 1.3);
          ctx.lineTo(c.x0 + (c.x1 - c.x0) * 0.5, y + jy + 3.2);
        }
      }
      ctx.stroke();
    }
    // 顆粒貼圖
    {
      const pat = texPattern(ctx, map, 'speck');
      if (pat) {
        ctx.save();
        ctx.translate(Math.round(D.seed * 7), y + Math.round(D.seed * 3));
        ctx.fillStyle = pat;
        ctx.fillRect(a - Math.round(D.seed * 7), 0, b - a, isGround ? Math.min(340, bottomY - y) : 76);
        ctx.restore();
      }
    }
    // 礦物條紋（白色水垢、硫磺）：從頂層往下流的一片
    for (const s of D.streaks) {
      if (!vis(s.x, 20)) continue;
      const g = ctx.createLinearGradient(0, y + 4, 0, y + 4 + s.len);
      const rgb = s.sul ? '226,196,84' : '236,228,210';
      g.addColorStop(0, 'rgba(' + rgb + ',' + (isGround ? 0.22 : 0.36) + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(s.x - s.w / 2, y + 4);
      ctx.lineTo(s.x + s.w / 2, y + 4);
      ctx.quadraticCurveTo(s.x + s.w * 0.3, y + 4 + s.len * 0.6, s.x + 1, y + 4 + s.len);
      ctx.quadraticCurveTo(s.x - s.w * 0.4, y + 4 + s.len * 0.5, s.x - s.w / 2, y + 4);
      ctx.fill();
    }
    // 埋在地裡的木板、肋材、大貝殼
    for (const o of D.buried) {
      if (!vis(o.x, o.len + 20)) continue;
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rot);
      if (o.kind === 'plank') {
        ctx.fillStyle = 'rgba(8,10,12,0.35)';
        ctx.fillRect(-o.len / 2 + 1, -3, o.len, 9);
        const g = ctx.createLinearGradient(0, -4, 0, 4);
        g.addColorStop(0, '#5a5048');
        g.addColorStop(1, '#2e2824');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-o.len / 2, -4);
        ctx.lineTo(o.len / 2 - 3, -4);
        ctx.lineTo(o.len / 2, -1);
        ctx.lineTo(o.len / 2 - 4, 1);
        ctx.lineTo(o.len / 2 - 1, 4);
        ctx.lineTo(-o.len / 2, 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(10,8,6,0.4)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-o.len / 2 + 2, -1.5);
        ctx.lineTo(o.len / 2 - 6, -1.2);
        ctx.moveTo(-o.len / 2 + 6, 1.8);
        ctx.lineTo(o.len / 2 - 8, 2);
        ctx.stroke();
        ctx.fillStyle = '#7a4a30';
        ctx.fillRect(-o.len / 2 + 5, -1, 1.6, 1.6);
        ctx.fillStyle = 'rgba(210,222,230,0.25)';
        ctx.fillRect(-o.len / 2, -4, o.len - 4, 0.8);
      } else if (o.kind === 'rib') {
        ctx.strokeStyle = 'rgba(6,8,10,0.4)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(1, o.len * 0.6 + 1, o.len * 0.7, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        ctx.strokeStyle = '#3e3630';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, o.len * 0.6, o.len * 0.7, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(200,210,214,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, o.len * 0.6, o.len * 0.7 + 2, -Math.PI * 0.75, -Math.PI * 0.3);
        ctx.stroke();
      } else {
        // 大貝殼（巢灣的老殼）：螺旋的殼身、一圈圈的紋
        const r = o.r;
        ctx.fillStyle = 'rgba(6,6,10,0.35)';
        ctx.beginPath();
        ctx.ellipse(1, 2, r * 1.5, r, 0, 0, PI2);
        ctx.fill();
        const g = ctx.createLinearGradient(-r, -r, r, r);
        g.addColorStop(0, '#a89c98');
        g.addColorStop(1, '#5a4e54');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-r * 1.5, r * 0.2);
        ctx.quadraticCurveTo(-r * 0.6, -r * 1.2, r * 0.9, -r * 0.6);
        ctx.quadraticCurveTo(r * 1.6, 0, r * 0.6, r * 0.8);
        ctx.quadraticCurveTo(-r * 0.4, r * 1.1, -r * 1.5, r * 0.2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,30,36,0.5)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let k = 1; k < 4; k++) {
          ctx.moveTo(-r * 1.5 + k * r * 0.55, r * 0.3 - k * 0.2);
          ctx.quadraticCurveTo(-r * 1.1 + k * r * 0.55, -r * 0.5, -r * 0.7 + k * r * 0.5, -r * 0.8 + k * 0.1);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    // 裂縫：乾裂（暗線＋下緣一點亮邊）或熔岩脈（光暈、橘紅、黃白的芯）
    if (D.cracks.length) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const list = D.cracks.filter((c) => vis(c.pts[0], 80));
      const trace = (c, ox, oy) => {
        ctx.moveTo(c.pts[0] + ox, c.pts[1] + oy);
        for (let k = 2; k < c.pts.length; k += 2) ctx.lineTo(c.pts[k] + ox, c.pts[k + 1] + oy);
        for (const q of c.br) {
          ctx.moveTo(q[0] + ox, q[1] + oy);
          ctx.lineTo(q[2] + ox, q[3] + oy);
          ctx.lineTo(q[4] + ox, q[5] + oy);
        }
      };
      if (lava) {
        const passes = lowfx
          ? [['rgba(255,110,40,0.5)', 3], ['#ffb050', 1.3]]
          : [['rgba(255,90,30,0.12)', 9], ['rgba(255,110,40,0.28)', 4.5], ['#ff8a36', 2], ['#ffd98a', 0.8]];
        for (const [col, lw] of passes) {
          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.lineWidth = lw;
          for (const c of list) trace(c, 0, 0);
          ctx.stroke();
        }
        // 裂縫的暗邊（冷卻的硬殼）
        ctx.strokeStyle = 'rgba(10,2,0,0.5)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (const c of list) trace(c, -1.3, -0.6);
        ctx.stroke();
      } else {
        ctx.strokeStyle = rgba(S.dark, 0.6);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (const c of list) trace(c, 0, 0);
        ctx.stroke();
        ctx.strokeStyle = rgba(S.light, 0.22);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (const c of list) trace(c, 0.9, 0.6);
        ctx.stroke();
      }
    }
    // 夾雜的石塊
    for (const s of D.stones) {
      if (!vis(s.x, 12)) continue;
      const C = S.stone[s.v];
      if (s.tiny) {
        ctx.fillStyle = C[s.lit ? 2 : s.v === 2 ? 2 : 1];
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, PI2);
        ctx.fill();
        if (s.lit) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(s.x - s.rx * 0.8, s.y + s.ry * 0.3, s.rx * 1.6, s.ry * 0.6);
        }
        continue;
      }
      ctx.fillStyle = rgba(S.dark, 0.38);
      ctx.beginPath();
      ctx.ellipse(s.x + 0.8, s.y + s.ry * 0.45, s.rx * 1.08, s.ry * 0.95, s.rot, 0, PI2);
      ctx.fill();
      if (lowfx) ctx.fillStyle = C[0];
      else {
        const g = ctx.createLinearGradient(s.x - s.rx * 0.4, s.y - s.ry, s.x + s.rx * 0.3, s.y + s.ry);
        g.addColorStop(0, C[2]);
        g.addColorStop(0.4, C[0]);
        g.addColorStop(1, C[1]);
        ctx.fillStyle = g;
      }
      ctx.beginPath();
      blobPath(ctx, s.x, s.y, s.rx, s.ry, s.rot, s.j);
      ctx.fill();
      ctx.strokeStyle = S.inc === 'obsidian' ? 'rgba(230,220,255,0.45)' : 'rgba(255,250,240,0.26)';
      ctx.lineWidth = S.inc === 'obsidian' ? 0.7 : 0.9;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.rx * 0.8, s.ry * 0.78, s.rot, Math.PI * 1.1, Math.PI * 1.8);
      ctx.stroke();
      if (lava && s.v === 0 && s.rx > 4) {
        ctx.strokeStyle = 'rgba(255,120,50,0.35)';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.rx * 0.95, s.ry * 0.95, s.rot, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
    }
    // 嵌在沙裡的貝殼
    for (const s of D.shells) {
      if (!vis(s.x, 8)) continue;
      shell(ctx, s.x, s.y, s.r, s.rot, s.k, 0.8);
    }
    // 藤壺
    if (D.barn.length) barnacles(ctx, D.barn.filter((q) => vis(q.x, 6)), M);
    // 頂層底下的環境光遮蔽
    {
      const g = ctx.createLinearGradient(0, y + 3, 0, y + 22);
      g.addColorStop(0, rgba(M.ao, 0.6));
      g.addColorStop(0.45, rgba(M.ao, 0.22));
      g.addColorStop(1, rgba(M.ao, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(a, y);
      for (let x = a; x <= b; x += 8) ctx.lineTo(x, y + D.cap(x) - 2);
      ctx.lineTo(b, y + 26);
      ctx.lineTo(a, y + 26);
      ctx.closePath();
      ctx.fill();
    }
    if (!isGround) {
      // 底緣一道從下方反射上來的光（海面的藍、熔岩的橘），兩端側面暗一點
      ctx.strokeStyle = rgba(M.bounce, lava ? 0.32 : 0.18);
      ctx.lineWidth = lava ? 2.6 : 2;
      ctx.beginPath();
      const sx = Math.max(L + 6, Math.floor(a / 6) * 6);
      for (let x = sx; x < Math.min(R - 6, b); x += 6) {
        const yy = y + depth(x) - 1;
        x === sx ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
      for (const [ex, dir] of [[L, 1], [R, -1]]) {
        if (!vis(ex, 30)) continue;
        const g = ctx.createLinearGradient(ex, 0, ex + dir * 22, 0);
        g.addColorStop(0, rgba(S.dark, 0.45));
        g.addColorStop(1, rgba(S.dark, 0));
        ctx.fillStyle = g;
        ctx.fillRect(Math.min(ex, ex + dir * 22) - 6, y, 28, 76);
      }
    } else {
      const g = ctx.createLinearGradient(0, y + 60, 0, y + 220);
      g.addColorStop(0, rgba(S.dark, 0));
      g.addColorStop(1, rgba(S.dark, 0.4));
      ctx.fillStyle = g;
      ctx.fillRect(a, y + 60, b - a, bottomY - y);
    }
    ctx.restore();

    // ── 底面：鐘乳石般的尖角、海帶、垂根、水滴、熔岩滴 ──
    if (!isGround) drawUnder(ctx, M, S, D, y, vis, lowfx, keep);
    // 繩子上端的鐵環（釘在底面）
    for (const ax of D.anchors) if (vis(ax, 20)) ringBolt(ctx, ax, y + depth(ax) - 4, lava);

    // ── 頂層 ──
    if (S.cap === 'slab') drawSlabs(ctx, map, M, S, D, L, R, y, a, b, isGround);
    else drawCap(ctx, map, M, S, D, L, R, y, a, b, isGround, lvl);

    // 頂緣的輪廓光：整條站立線清楚、亮度有起伏
    rimLight(ctx, M, D, L, R, y, a, b, isGround, vis);

    // ── 頂面：草叢、碎岩、小擺設 ──
    drawTufts(ctx, M, S, D, L, R, y, vis, isGround, lvl);
    for (const pr of D.props) {
      if (!vis(pr.x, 20)) continue;
      PROP[pr.kind] && PROP[pr.kind](ctx, pr, y, M, keep, lowfx, lvl);
    }
  }

  // ── 小零件 ──
  // 扇貝／螺：k=1 是螺
  function shell(ctx, x, y, r, rot, k, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = a;
    if (k) {
      ctx.fillStyle = '#b8aca0';
      ctx.beginPath();
      ctx.moveTo(-r * 1.3, r * 0.3);
      ctx.quadraticCurveTo(-r * 0.4, -r * 1.1, r * 1.1, -r * 0.2);
      ctx.quadraticCurveTo(r * 0.6, r * 0.8, -r * 1.3, r * 0.3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,56,52,0.6)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, 0.2);
      ctx.lineTo(-r * 0.3, -r * 0.6);
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.2, -r * 0.6);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#c8bcb0';
      ctx.beginPath();
      ctx.moveTo(0, r * 0.5);
      ctx.arc(0, r * 0.5, r, -Math.PI * 0.95, -Math.PI * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,70,64,0.55)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      for (let q = -2; q <= 2; q++) {
        ctx.moveTo(0, r * 0.5);
        ctx.lineTo(Math.sin(q * 0.55) * r * 0.95, r * 0.5 - Math.cos(q * 0.55) * r * 0.95);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-r * 0.4, -r * 0.35, r * 0.5, 0.7);
    }
    ctx.restore();
  }
  // 一簇簇的藤壺：小小的圓錐，頂上一個暗色的口，上緣一點冷光
  function barnacles(ctx, list, M) {
    const C = M.barn || ['#8a9294', '#565e62', '#1e2426'];
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    for (const q of list) {
      ctx.moveTo(q.x + q.r + 0.5, q.y + 0.6);
      ctx.ellipse(q.x + 0.5, q.y + 0.6, q.r, q.r * 0.8, 0, 0, PI2);
    }
    ctx.fill();
    // 小圓錐：暗的底、上半一點冷光、頂上一條暗縫
    ctx.fillStyle = C[1];
    ctx.beginPath();
    for (const q of list) {
      ctx.moveTo(q.x - q.r, q.y + q.r * 0.5);
      ctx.lineTo(q.x - q.r * 0.45, q.y - q.r * 0.7);
      ctx.lineTo(q.x + q.r * 0.45, q.y - q.r * 0.7);
      ctx.lineTo(q.x + q.r, q.y + q.r * 0.5);
      ctx.closePath();
    }
    ctx.fill();
    ctx.fillStyle = C[0];
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (const q of list) {
      ctx.moveTo(q.x - q.r * 0.9, q.y + q.r * 0.3);
      ctx.lineTo(q.x - q.r * 0.45, q.y - q.r * 0.7);
      ctx.lineTo(q.x - q.r * 0.05, q.y - q.r * 0.7);
      ctx.lineTo(q.x - q.r * 0.3, q.y + q.r * 0.3);
      ctx.closePath();
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C[2];
    ctx.beginPath();
    for (const q of list) ctx.rect(q.x - q.r * 0.35, q.y - q.r * 0.8, q.r * 0.7, Math.max(0.6, q.r * 0.25));
    ctx.fill();
  }
  // 釘在岩石底面的鐵環（繩子從這裡垂下）
  function ringBolt(ctx, x, y, hot) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 0.6, y + 1, 4.4, 2.6, 0, 0, PI2);
    ctx.fill();
    ctx.fillStyle = hot ? '#4a3a3a' : '#4a4e52';
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 2.3, 0, 0, PI2);
    ctx.fill();
    ctx.strokeStyle = hot ? '#6e5048' : '#6a6e72';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y + 4.5, 3.4, 3.2, 0, 0, PI2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(230,236,240,0.4)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(x, y + 4.5, 3.4, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
    ctx.fillStyle = '#7a4a30';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x - 2.4, y + 0.6, 1.2, 1.4);
    ctx.globalAlpha = 1;
  }
  function kelpPts(h, n) {
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      pts.push(h.x + h.sw * u * u + Math.sin(u * 5 + h.x) * 1.2 * u, h.y + h.len * u);
    }
    return pts;
  }
  // 底面
  function drawUnder(ctx, M, S, D, y, vis, lowfx, keep) {
    // 鐘乳石般的尖角（跟本體同色，側面一點亮邊）
    if (D.stal.length) {
      ctx.fillStyle = S.body[3];
      ctx.beginPath();
      for (const s of D.stal) {
        if (!vis(s.x, 10)) continue;
        const by = y + D.depth(s.x) - 2;
        ctx.moveTo(s.x - s.w, by);
        ctx.quadraticCurveTo(s.x - s.w * 0.3, by + s.len * 0.5, s.x + 0.4, by + s.len);
        ctx.quadraticCurveTo(s.x + s.w * 0.4, by + s.len * 0.4, s.x + s.w, by);
        ctx.closePath();
      }
      ctx.fill();
      ctx.strokeStyle = rgba(M.bounce, 0.22);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (const s of D.stal) {
        if (!vis(s.x, 10)) continue;
        const by = y + D.depth(s.x) - 2;
        ctx.moveTo(s.x - s.w * 0.7, by + 1);
        ctx.quadraticCurveTo(s.x - s.w * 0.2, by + s.len * 0.5, s.x + 0.2, by + s.len - 0.5);
      }
      ctx.stroke();
    }
    const U2 = D.under;
    if (!U2.length) return;
    // 海帶：三種暗綠，尾端帶一點亮
    for (let c = 0; c < 3 && M.kelp; c++) {
      ctx.fillStyle = M.kelp[c];
      ctx.beginPath();
      for (const h of U2) {
        if (h.t !== 'kelp' || h.c !== c || !vis(h.x, 10)) continue;
        taperPath(ctx, kelpPts(h, 5), h.w, 0.6);
      }
      ctx.fill();
    }
    ctx.fillStyle = M.kelpTip;
    ctx.beginPath();
    for (const h of U2) {
      if (h.t !== 'kelp' || !vis(h.x, 10) || h.len < 10) continue;
      const q = kelpPts(h, 5);
      ctx.moveTo(q[10] + 1, q[11]);
      ctx.arc(q[10], q[11], 0.9, 0, PI2);
      if (h.bulb) {
        ctx.moveTo(q[6] + 2.2, q[7]);
        ctx.ellipse(q[6], q[7], 2.2, 1.8, 0, 0, PI2);
      }
    }
    ctx.fill();
    // 垂根（乾的細根）
    ctx.fillStyle = M.root || '#3a2a20';
    ctx.beginPath();
    for (const h of U2) {
      if (h.t !== 'root' || !vis(h.x, 14)) continue;
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const u = k / 6;
        pts.push(h.x + h.sw * u * u + Math.sin(u * 4 + h.curl) * 1.4 * u, h.y + h.len * u);
      }
      taperPath(ctx, pts, h.w * 1.3, 0.3);
    }
    ctx.fill();
    // 水滴：底面掛著一顆亮亮的水珠，有的正在往下掉
    const dripRgb = S.dripRgb || '200,228,250';
    ctx.fillStyle = 'rgba(' + dripRgb + ',0.75)';
    ctx.beginPath();
    for (const h of U2) {
      if (h.t !== 'drip' || !vis(h.x, 6)) continue;
      ctx.moveTo(h.x - 1.1, h.y - 1);
      ctx.quadraticCurveTo(h.x - 1.2, h.y + h.len * 0.6, h.x, h.y + h.len);
      ctx.quadraticCurveTo(h.x + 1.2, h.y + h.len * 0.6, h.x + 1.1, h.y - 1);
      ctx.closePath();
      if (h.fall) {
        ctx.moveTo(h.x + 0.9, h.y + h.len + h.fall);
        ctx.arc(h.x, h.y + h.len + h.fall, 0.9, 0, PI2);
      }
    }
    ctx.fill();
    // 熔岩滴：橘紅的滴垂，末端黃白；底下一點光暈
    const lv = U2.filter((h) => h.t === 'lava' && vis(h.x, 12));
    if (lv.length) {
      if (!lowfx) for (const h of lv) if (h.len > 8) radial(ctx, h.x, h.y + h.len, 9, '255,120,40', 0.32);
      ctx.fillStyle = '#c8401a';
      ctx.beginPath();
      for (const h of lv) taperPath(ctx, [h.x, h.y, h.x + 0.3, h.y + h.len * 0.6, h.x, h.y + h.len], h.w, 1);
      ctx.fill();
      ctx.fillStyle = '#ff9a3c';
      ctx.beginPath();
      for (const h of lv) taperPath(ctx, [h.x, h.y + h.len * 0.3, h.x + 0.2, h.y + h.len * 0.7, h.x, h.y + h.len + 0.5], h.w * 0.6, 1.1);
      ctx.fill();
      ctx.fillStyle = '#ffe2a0';
      ctx.beginPath();
      for (const h of lv) {
        ctx.moveTo(h.x + 0.9, h.y + h.len);
        ctx.arc(h.x, h.y + h.len, 0.9, 0, PI2);
        if (h.fall) {
          ctx.moveTo(h.x + 1.1, h.y + h.len + h.fall);
          ctx.arc(h.x, h.y + h.len + h.fall, 1.1, 0, PI2);
        }
      }
      ctx.fill();
    }
  }

  // ── 頂層（濕沙、藻墊、浪花濕岩、塵土、玄武岩頂、灰燼、熔岩硬殼） ──
  function drawCap(ctx, map, M, S, D, L, R, y, a, b, isGround, lvl) {
    const C = S.capCol;
    const capPath = (grow) => {
      ctx.beginPath();
      const l = isGround ? a : L - 3 - grow;
      const r = isGround ? b : R + 3 + grow;
      const ty = y - 2 - grow * 0.3;
      ctx.moveTo(l, y + 4);
      if (!isGround) ctx.quadraticCurveTo(l, ty, l + 7, ty);
      else ctx.lineTo(l, ty);
      ctx.lineTo(isGround ? r : r - 7, ty);
      if (!isGround) ctx.quadraticCurveTo(r, ty, r, y + 4);
      for (let x = r; x >= l; x -= 5) ctx.lineTo(x, y + D.cap(clamp(x, L, R)) + grow + (hash(x * 0.71 + D.seed) - 0.5) * 1.6);
      ctx.closePath();
    };
    ctx.fillStyle = C[1];
    ctx.globalAlpha = 0.5;
    capPath(2.2);
    ctx.fill();
    ctx.globalAlpha = 1;
    {
      const g = ctx.createLinearGradient(0, y - 2, 0, y + 14);
      g.addColorStop(0, C[3]);
      g.addColorStop(0.22, C[2]);
      g.addColorStop(0.6, C[1]);
      g.addColorStop(1, C[0]);
      ctx.fillStyle = g;
      capPath(0);
      ctx.fill();
    }
    // 下緣一道暗邊（頂層厚度的側面陰影）
    ctx.strokeStyle = rgba(M.ao, 0.5);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    {
      const l = isGround ? a : L;
      const r = isGround ? b : R;
      for (let x = l; x <= r; x += 5) {
        const yy = y + D.cap(clamp(x, L, R)) + (hash(x * 0.71 + D.seed) - 0.5) * 1.6 - 0.8;
        x === l ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
    }
    ctx.stroke();
    ctx.save();
    capPath(0);
    ctx.clip();
    const lowfx = low();
    const pat = lowfx ? null : texPattern(ctx, map, 'cap');
    if (pat) {
      ctx.save();
      ctx.translate(Math.round(D.seed * 5), y - 3);
      ctx.fillStyle = pat;
      ctx.fillRect(a - Math.round(D.seed * 5), 0, b - a, 26);
      ctx.restore();
    }
    const kind = S.cap;
    // 一團一團柔和的亮面（頂層的起伏）
    if (!lowfx) {
      const hc = kind === 'algae' ? '150,200,140' : kind === 'dust' ? '255,214,160' : kind === 'ash' || kind === 'crust' ? '200,170,160' : '190,210,222';
      for (let x = Math.floor(a / 44) * 44; x < b; x += 44) {
        const hx = x + hash(x * 0.13 + D.seed) * 32;
        const rr = 7 + hash(x * 0.29) * 9;
        radial(ctx, hx, y, rr, hc, 0.26);
      }
    }
    if (kind === 'sand') {
      // 濕沙：上緣被浪舔過的反光（斷斷續續），幾片更暗的濕印
      ctx.fillStyle = 'rgba(8,12,16,0.22)';
      ctx.beginPath();
      for (let x = Math.floor(a / 50) * 50; x < b; x += 50) {
        const hx = x + hash(x * 0.21 + D.seed) * 40;
        ctx.moveTo(hx + 12, y + 2);
        ctx.ellipse(hx, y + 2.5, 8 + hash(x) * 10, 1.6, 0, 0, PI2);
      }
      ctx.fill();
      ctx.fillStyle = rgba(M.rim, 0.14);
      ctx.fillRect(a, y - 1.5, b - a, 1.4);
      // 礫石：沿著上緣半埋的一排小圓石
      const ST = S.stone;
      for (let v = 0; v < 3; v++) {
        ctx.fillStyle = ST[v][0];
        ctx.beginPath();
        for (let x = Math.floor(a / 6) * 6; x < b; x += 6) {
          const hh = hash(x * 0.61 + D.seed);
          if (Math.floor(hh * 3) !== v || hash(x * 0.23) < 0.35) continue;
          const px = x + hash(x * 1.7) * 4;
          const r = 1.2 + hash(x * 0.9) * 1.6;
          const py = y + 0.5 + hash(x * 2.3) * 3;
          ctx.moveTo(px + r * 1.3, py);
          ctx.ellipse(px, py, r * 1.3, r * 0.85, 0, 0, PI2);
        }
        ctx.fill();
      }
      ctx.fillStyle = rgba(M.rim, 0.3);
      ctx.beginPath();
      for (let x = Math.floor(a / 6) * 6; x < b; x += 6) {
        if (hash(x * 0.23) < 0.35) continue;
        const px = x + hash(x * 1.7) * 4;
        const r = 1.2 + hash(x * 0.9) * 1.6;
        const py = y + 0.5 + hash(x * 2.3) * 3;
        ctx.rect(px - r * 0.7, py - r * 0.75, r * 0.9, 0.6);
      }
      ctx.fill();
    } else if (kind === 'foam') {
      // 浪花：凹處留著一小片白色的泡沫蕾絲
      ctx.fillStyle = 'rgba(230,242,250,0.5)';
      ctx.beginPath();
      for (let x = Math.floor(a / 60) * 60; x < b; x += 60) {
        const fx = x + hash(x * 0.17 + D.seed) * 44;
        if (hash(x * 0.33 + D.seed) < 0.35) continue;
        for (let k = 0; k < 6; k++) {
          const px = fx + (hash(x + k * 3.1) - 0.5) * 18;
          const py = y - 0.5 + hash(x + k * 7.7) * 3;
          const r = 0.8 + hash(x + k) * 1.6;
          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, PI2);
        }
      }
      ctx.fill();
    } else if (kind === 'basalt') {
      // 柱頂：柱與柱之間的縫延續到頂層上
      const cols = D.cols || [];
      ctx.strokeStyle = 'rgba(10,6,14,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const c of cols) {
        if (c.x0 < a || c.x0 > b) continue;
        ctx.moveTo(c.x0, y - 1);
        ctx.lineTo(c.x0 + 0.5, y + 8);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(220,190,80,0.4)';
      ctx.beginPath();
      for (let x = Math.floor(a / 40) * 40; x < b; x += 40) {
        if (hash(x * 0.41 + D.seed) < 0.55) continue;
        const sx = x + hash(x * 0.7) * 30;
        ctx.moveTo(sx + 5, y + 1);
        ctx.ellipse(sx, y + 1, 5 + hash(x) * 5, 1.4, 0, 0, PI2);
      }
      ctx.fill();
    } else if (kind === 'ash' || kind === 'crust') {
      // 灰燼上的淺色碎屑；熔岩硬殼下半有細細的發光縫
      ctx.fillStyle = 'rgba(190,176,170,0.3)';
      ctx.beginPath();
      for (let x = Math.floor(a / 9) * 9; x < b; x += 9) {
        const px = x + hash(x * 0.9 + D.seed) * 8;
        ctx.rect(px, y - 1 + hash(x * 1.3) * 4, 1.4, 0.8);
      }
      ctx.fill();
      if (kind === 'crust' || lvl < 0.5) {
        ctx.strokeStyle = kind === 'crust' ? 'rgba(255,120,50,0.55)' : 'rgba(255,120,50,0.35)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let x = Math.floor(a / 26) * 26; x < b; x += 26) {
          if (hash(x * 0.53 + D.seed) < 0.45) continue;
          const px = x + hash(x * 0.37) * 16;
          const yy = y + 3.5 + hash(x * 0.61) * 2;
          ctx.moveTo(px, yy);
          ctx.lineTo(px + 4 + hash(x) * 5, yy + 0.8);
          ctx.lineTo(px + 8 + hash(x * 2) * 6, yy - 0.4);
        }
        ctx.stroke();
      }
    } else if (kind === 'dust') {
      ctx.fillStyle = 'rgba(255,226,180,0.3)';
      ctx.beginPath();
      for (let x = Math.floor(a / 7) * 7; x < b; x += 7) {
        const px = x + hash(x * 0.9 + D.seed) * 6;
        ctx.rect(px, y - 1 + hash(x * 1.7) * 3, 1, 0.8);
      }
      ctx.fill();
    }
    ctx.restore();
    // 藻墊／塵土：兩端往側面垂下一點（軟邊）
    if (!isGround && (kind === 'algae' || kind === 'dust' || kind === 'ash')) {
      ctx.fillStyle = C[1];
      ctx.beginPath();
      for (const [ex, dir] of [[L, -1], [R, 1]]) {
        if (ex < a - 20 || ex > b + 20) continue;
        const n = kind === 'algae' ? 4 : 2;
        for (let k = 0; k < n; k++) {
          const hx = ex + dir * (1 + hash(ex + k) * 2) - dir * k * 4;
          const len = (kind === 'algae' ? 8 : 5) + hash(ex * 0.3 + k) * (kind === 'algae' ? 12 : 6);
          taperPath(ctx, [hx, y + 2, hx + dir * 0.8, y + 2 + len * 0.5, hx + dir * 0.3, y + 2 + len], 2.6, 0.6);
        }
      }
      ctx.fill();
    }
  }
  // ── 石板（溫泉谷）：一塊塊切好的石板，斜切的亮邊、灰縫、水垢與硫磺的斑 ──
  function drawSlabs(ctx, map, M, S, D, L, R, y, a, b, isGround) {
    const SL = S.slab;
    if (!D.slabs) {
      const rnd = U.seeded(Math.round(D.seed * 1000) + 7);
      D.slabs = [];
      for (let x = isGround ? L : L - 3; x < (isGround ? R : R + 3); ) {
        const w = 24 + rnd() * 28;
        D.slabs.push({ x0: x, x1: Math.min(isGround ? R : R + 3, x + w), t: rnd(), h: 8 + rnd() * 2.5, stain: rnd(), chip: rnd() < 0.25 ? rnd() : -1 });
        x += w;
      }
    }
    const top = y - 2;
    for (const s of D.slabs) {
      if (s.x1 < a - 4 || s.x0 > b + 4) continue;
      const x0 = s.x0 + 0.7;
      const x1 = s.x1 - 0.7;
      // 底下的陰影
      ctx.fillStyle = rgba(M.ao, 0.45);
      ctx.fillRect(x0, top + s.h - 1, x1 - x0, 4);
      const g = ctx.createLinearGradient(0, top, 0, top + s.h);
      const base = s.t < 0.33 ? SL[0] : s.t < 0.7 ? SL[1] : SL[2];
      g.addColorStop(0, SL[2]);
      g.addColorStop(0.28, base);
      g.addColorStop(1, SL[3]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0 + 1.2, top);
      ctx.lineTo(x1 - 1.2, top);
      ctx.quadraticCurveTo(x1, top, x1, top + 1.5);
      ctx.lineTo(x1 - 0.4, top + s.h - 1);
      ctx.quadraticCurveTo(x1 - 1, top + s.h, x1 - 2.5, top + s.h);
      ctx.lineTo(x0 + 2.5, top + s.h);
      ctx.quadraticCurveTo(x0 + 0.5, top + s.h, x0 + 0.4, top + s.h - 1.5);
      ctx.lineTo(x0, top + 1.5);
      ctx.quadraticCurveTo(x0, top, x0 + 1.2, top);
      ctx.closePath();
      ctx.fill();
      // 缺角
      if (s.chip >= 0) {
        const cx = x0 + (x1 - x0) * (0.2 + s.chip * 0.6);
        ctx.fillStyle = SL[3];
        ctx.beginPath();
        ctx.moveTo(cx - 3, top + s.h);
        ctx.lineTo(cx, top + s.h - 3);
        ctx.lineTo(cx + 4, top + s.h);
        ctx.closePath();
        ctx.fill();
      }
      // 斑：水垢（白）、硫磺（黃）、青苔（橄欖）
      if (s.stain > 0.5) {
        ctx.fillStyle = s.stain > 0.85 ? 'rgba(226,196,84,0.35)' : s.stain > 0.7 ? 'rgba(120,120,60,0.3)' : 'rgba(240,236,224,0.3)';
        ctx.beginPath();
        ctx.ellipse(x0 + (x1 - x0) * s.t, top + s.h * 0.6, (x1 - x0) * 0.25, s.h * 0.25, 0, 0, PI2);
        ctx.fill();
      }
      // 石面細紋
      ctx.strokeStyle = 'rgba(60,48,40,0.3)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      const mx = x0 + (x1 - x0) * (0.3 + s.t * 0.4);
      ctx.moveTo(mx, top + 2);
      ctx.lineTo(mx + 3, top + s.h * 0.6);
      ctx.lineTo(mx + 1, top + s.h - 1);
      ctx.stroke();
      // 上緣斜切的亮邊
      ctx.fillStyle = 'rgba(255,246,226,0.45)';
      ctx.fillRect(x0 + 1.5, top + 0.3, x1 - x0 - 3, 1);
    }
    // 石板之間塞著的紅土與小草根
    ctx.fillStyle = 'rgba(40,20,12,0.75)';
    ctx.beginPath();
    for (const s of D.slabs) {
      if (s.x1 < a || s.x1 > b) continue;
      ctx.rect(s.x1 - 0.9, top + 0.5, 1.8, s.h - 0.5);
    }
    ctx.fill();
  }
  // ── 頂緣的輪廓光 ──
  function rimLight(ctx, M, D, L, R, y, a, b, isGround, vis) {
    const l = isGround ? a : L + 2;
    const r = isGround ? b : R - 2;
    const g = ctx.createLinearGradient(0, y - 9, 0, y - 1);
    g.addColorStop(0, rgba(M.rim, 0));
    g.addColorStop(1, rgba(M.rim, 0.14));
    ctx.fillStyle = g;
    ctx.fillRect(l, y - 9, r - l, 8);
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? rgba(M.rim2, 0.5) : rgba(M.rim, 0.8);
      ctx.lineWidth = pass ? 1 : 1.4;
      ctx.beginPath();
      let on = false;
      for (let x = Math.max(l, Math.floor(a / 4) * 4); x <= r; x += 4) {
        const v = fbm(x * 0.02, D.seed + pass * 7);
        const draw = pass ? v > 0.62 : v > 0.3;
        if (draw && !on) ctx.moveTo(x, y - 2);
        else if (draw) ctx.lineTo(x, y - 2);
        on = draw;
      }
      ctx.stroke();
    }
    if (!isGround) {
      ctx.strokeStyle = rgba(M.rim, 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (vis(L, 20)) {
        ctx.moveTo(L + 6, y - 2);
        ctx.quadraticCurveTo(L - 3, y - 2, L - 3, y + 5);
      }
      if (vis(R, 20)) {
        ctx.moveTo(R - 6, y - 2);
        ctx.quadraticCurveTo(R + 3, y - 2, R + 3, y + 5);
      }
      ctx.stroke();
    }
  }
  // ── 草叢（海草／乾草）與碎岩 ──
  function drawTufts(ctx, M, S, D, L, R, y, vis, isGround, lvl) {
    if (!D.tufts.length) return;
    if (D.tufts[0].crumb) {
      const C = S.stone;
      for (let v = 0; v < 2; v++) {
        ctx.fillStyle = C[v][v ? 1 : 0];
        ctx.beginPath();
        for (const t of D.tufts) {
          if (!vis(t.x, 8) || (t.r < 0.5) !== !v) continue;
          for (let k = 0; k < t.n; k++) {
            const x = t.x + k * 3.5 * t.s;
            const h = (1.4 + hash(t.x + k) * 2) * t.s;
            const w2 = (1.6 + hash(t.x * 0.7 + k) * 1.4) * t.s;
            ctx.moveTo(x - w2, y - 0.5);
            ctx.quadraticCurveTo(x - w2 * 0.9, y - 1 - h, x - w2 * 0.1, y - 1 - h);
            ctx.lineTo(x + w2 * 0.5, y - 1 - h * 0.8);
            ctx.quadraticCurveTo(x + w2, y - 1 - h * 0.5, x + w2, y - 0.5);
            ctx.closePath();
          }
        }
        ctx.fill();
      }
      ctx.strokeStyle = rgba(M.rim, 0.55);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (const t of D.tufts) {
        if (!vis(t.x, 8)) continue;
        const h = (1.4 + hash(t.x) * 2) * t.s;
        const w2 = (1.6 + hash(t.x * 0.7) * 1.4) * t.s;
        ctx.moveTo(t.x - w2 * 0.8, y - 1 - h * 0.5);
        ctx.quadraticCurveTo(t.x - w2 * 0.6, y - 1 - h, t.x, y - 1 - h);
      }
      ctx.stroke();
      return;
    }
    const cols = S.tuft === 'grass' ? M.grass : M.weed;
    const hk = 1 - 0.2 * lvl;
    const grass = S.tuft === 'grass';
    for (let tone = 0; tone < 5; tone++) {
      ctx.fillStyle = cols[tone];
      ctx.beginPath();
      for (const t of D.tufts) {
        if (!vis(t.x, 12)) continue;
        for (const bl of t.blades) {
          if (bl.tone !== tone) continue;
          const x = t.x + bl.dx;
          if (!isGround && (x < L + 1 || x > R - 1)) continue;
          const h = bl.h * hk;
          const by = y - 0.5;
          ctx.moveTo(x - bl.w, by);
          if (grass) {
            ctx.lineTo(x + bl.lean, by - h);
            ctx.lineTo(x + bl.w, by);
          } else {
            // 海草：寬一點、垂一點（濕的葉片往一邊倒）
            ctx.quadraticCurveTo(x + bl.lean * 0.2 - bl.w * 0.4, by - h * 0.6, x + bl.lean, by - h);
            ctx.quadraticCurveTo(x + bl.lean * 0.4 + bl.w * 0.5, by - h * 0.45, x + bl.w, by);
          }
          ctx.closePath();
        }
      }
      ctx.fill();
    }
    ctx.strokeStyle = rgba(M.rim, grass ? 0.5 : 0.4);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const t of D.tufts) {
      if (!vis(t.x, 12)) continue;
      for (const bl of t.blades) {
        if (bl.tone < 3 || bl.h < 7) continue;
        const x = t.x + bl.dx;
        const h = bl.h * hk;
        ctx.moveTo(x + bl.lean * 0.55, y - h * 0.6);
        ctx.lineTo(x + bl.lean * 0.95, y - h * 0.96);
      }
    }
    ctx.stroke();
  }

  // ── 頂面的小擺設（pr.x、地面線 y；k > keep 的「活的」東西在土地變老後不見） ──
  const PROP = {
    pebbles(ctx, pr, y) {
      const n = 2 + Math.floor(pr.r * 3);
      for (let k = 0; k < n; k++) {
        const x = pr.x + (k - n / 2) * 3.4 * pr.s + hash(pr.x + k) * 2;
        const r = (1.3 + hash(pr.x * 0.3 + k) * 1.8) * pr.s;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + 0.6, y - 0.6, r * 1.2, r * 0.45, 0, 0, PI2);
        ctx.fill();
        const g = ctx.createLinearGradient(0, y - r * 1.6, 0, y);
        g.addColorStop(0, k % 2 ? '#8c9296' : '#a09a92');
        g.addColorStop(1, k % 2 ? '#3e4448' : '#4a4640');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y - r * 0.75, r * 1.15, r * 0.8, 0, 0, PI2);
        ctx.fill();
      }
    },
    shell(ctx, pr, y) {
      shell(ctx, pr.x, y - 1.6 * pr.s, 2.4 * pr.s, (pr.r - 0.5) * 0.6, pr.r < 0.35 ? 1 : 0, 0.95);
    },
    starfish(ctx, pr, y, M, keep) {
      if (pr.k > keep) return;
      const r = 3.6 * pr.s;
      ctx.save();
      ctx.translate(pr.x, y - 1);
      ctx.scale(1, 0.45);
      ctx.rotate(pr.r * 2);
      ctx.fillStyle = '#9a4a3a';
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const an = (k / 10) * PI2;
        const rr = k % 2 ? r * 0.4 : r;
        k ? ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : ctx.moveTo(Math.cos(an) * rr, Math.sin(an) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,200,160,0.4)';
      ctx.beginPath();
      ctx.arc(0, -r * 0.2, r * 0.25, 0, PI2);
      ctx.fill();
      ctx.restore();
    },
    wrack(ctx, pr, y, M) {
      // 打上岸的海草堆：糾在一起的暗色條
      ctx.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        ctx.strokeStyle = M.kelp[k % 3];
        ctx.lineWidth = 1.6 + hash(pr.x + k) * 1.2;
        ctx.beginPath();
        const x0 = pr.x - 9 * pr.s + k * 2.5;
        ctx.moveTo(x0, y - 0.8);
        ctx.bezierCurveTo(x0 + 4, y - 4 - hash(k + pr.x) * 3, x0 + 8, y + 0.5, x0 + 13 * pr.s, y - 1.8);
        ctx.stroke();
      }
      ctx.fillStyle = '#4a5a3a';
      ctx.beginPath();
      ctx.ellipse(pr.x + 2, y - 2.4, 1.6, 1.3, 0, 0, PI2);
      ctx.ellipse(pr.x - 4, y - 1.8, 1.3, 1.1, 0, 0, PI2);
      ctx.fill();
    },
    pool(ctx, pr, y, M) {
      // 潮池：頂面上一小灘發亮的積水（扁平，不擋腳）
      const w = 12 + pr.r * 16;
      ctx.fillStyle = 'rgba(10,20,30,0.5)';
      ctx.beginPath();
      ctx.ellipse(pr.x, y + 1.2, w, 2.4, 0, 0, PI2);
      ctx.fill();
      const g = ctx.createLinearGradient(pr.x - w, 0, pr.x + w, 0);
      g.addColorStop(0, 'rgba(120,170,210,0.2)');
      g.addColorStop(0.5, 'rgba(190,225,250,0.55)');
      g.addColorStop(1, 'rgba(120,170,210,0.2)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(pr.x, y + 0.8, w * 0.86, 1.5, 0, 0, PI2);
      ctx.fill();
    },
    anemone(ctx, pr, y, M, keep) {
      if (pr.k > keep) return;
      const col = ['#b86a7a', '#5a9a8a', '#c88a5a'][pr.v];
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(pr.x, y - 0.5, 4 * pr.s, 1.2, 0, 0, PI2);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const an = -Math.PI / 2 + (k - 3) * 0.32;
        ctx.moveTo(pr.x, y - 1.5);
        ctx.quadraticCurveTo(pr.x + Math.cos(an) * 3 * pr.s, y - 3.5 * pr.s, pr.x + Math.cos(an) * 5 * pr.s, y - 1.5 + Math.sin(an) * 5 * pr.s);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,236,230,0.6)';
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const an = -Math.PI / 2 + (k - 3) * 0.32;
        ctx.moveTo(pr.x + Math.cos(an) * 5 * pr.s + 0.7, y - 1.5 + Math.sin(an) * 5 * pr.s);
        ctx.arc(pr.x + Math.cos(an) * 5 * pr.s, y - 1.5 + Math.sin(an) * 5 * pr.s, 0.7, 0, PI2);
      }
      ctx.fill();
    },
    coral(ctx, pr, y, M, keep) {
      if (pr.k > keep) return;
      // 分枝的小珊瑚（暴風雨下偏暗的暖色）
      const col = ['#a8584a', '#b8785a', '#7e4a6a'][pr.v];
      ctx.strokeStyle = col;
      ctx.lineCap = 'round';
      const br = (x, yy, ang, len, w, d) => {
        const x2 = x + Math.cos(ang) * len;
        const y2 = yy + Math.sin(ang) * len;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (d > 0) {
          br(x2, y2, ang - 0.5, len * 0.7, w * 0.7, d - 1);
          br(x2, y2, ang + 0.45, len * 0.65, w * 0.7, d - 1);
        }
      };
      br(pr.x, y - 0.5, -Math.PI / 2 + (pr.r - 0.5) * 0.4, 4.5 * pr.s, 2, 2);
      ctx.fillStyle = 'rgba(255,220,200,0.35)';
      ctx.fillRect(pr.x - 0.5, y - 5 * pr.s, 1, 2);
    },
    urchin(ctx, pr, y) {
      const r = 2.6 * pr.s;
      ctx.strokeStyle = '#1e1a28';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const an = Math.PI + (k / 11) * Math.PI;
        ctx.moveTo(pr.x, y - r);
        ctx.lineTo(pr.x + Math.cos(an) * r * 2.1, y - r + Math.sin(an) * r * 2.1);
      }
      ctx.stroke();
      ctx.fillStyle = '#2a2436';
      ctx.beginPath();
      ctx.ellipse(pr.x, y - r * 0.8, r, r * 0.85, 0, 0, PI2);
      ctx.fill();
      ctx.fillStyle = 'rgba(180,170,220,0.4)';
      ctx.fillRect(pr.x - r * 0.5, y - r * 1.4, 1.2, 1);
    },
    nail(ctx, pr, y) {
      // 鏽掉的鐵件：一截彎掉的大釘、一片碎木板
      ctx.fillStyle = '#3a342e';
      ctx.save();
      ctx.translate(pr.x, y - 1);
      ctx.rotate((pr.r - 0.5) * 0.3);
      ctx.fillRect(-7 * pr.s, -2, 14 * pr.s, 2.6);
      ctx.fillStyle = 'rgba(200,210,214,0.2)';
      ctx.fillRect(-7 * pr.s, -2, 14 * pr.s, 0.6);
      ctx.restore();
      ctx.strokeStyle = '#6a3e26';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pr.x + 4, y - 2);
      ctx.lineTo(pr.x + 5, y - 6);
      ctx.lineTo(pr.x + 7.5, y - 7);
      ctx.stroke();
    },
    bone(ctx, pr, y) {
      // 風乾的小骨頭
      ctx.save();
      ctx.translate(pr.x, y - 1.3);
      ctx.rotate((pr.r - 0.5) * 0.4);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-5, 0.6, 10, 1.2);
      ctx.fillStyle = '#e6d6be';
      ctx.fillRect(-4, -0.8, 8, 1.6);
      ctx.beginPath();
      ctx.arc(-4.4, -1, 1.2, 0, PI2);
      ctx.arc(-4.4, 0.8, 1.2, 0, PI2);
      ctx.arc(4.4, -1, 1.2, 0, PI2);
      ctx.arc(4.4, 0.8, 1.2, 0, PI2);
      ctx.fill();
      ctx.restore();
    },
    sulfur(ctx, pr, y, M, keep) {
      // 硫磺結晶：一小簇尖尖的黃色晶體
      const n = 3 + Math.floor(pr.r * 3);
      for (let k = 0; k < n; k++) {
        const x = pr.x + (k - n / 2) * 2.2;
        const h = (3 + hash(pr.x + k) * 4) * pr.s;
        ctx.fillStyle = k % 2 ? '#c8a838' : '#e6cc5a';
        ctx.beginPath();
        ctx.moveTo(x - 1.3, y - 0.5);
        ctx.lineTo(x + (k - n / 2) * 0.4, y - 0.5 - h);
        ctx.lineTo(x + 1.3, y - 0.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,250,200,0.6)';
      ctx.fillRect(pr.x - 0.5, y - 4 * pr.s, 0.8, 2);
    },
    vent(ctx, pr, y, M, keep, lowfx) {
      // 冒熱氣的小孔：黃色硫磺圈、裡面暗暗透出熱光（熱氣本身由背景的蒸氣負責）
      const w = 5 * pr.s;
      ctx.fillStyle = 'rgba(220,190,80,0.55)';
      ctx.beginPath();
      ctx.ellipse(pr.x, y - 0.5, w * 1.6, 1.8, 0, 0, PI2);
      ctx.fill();
      ctx.fillStyle = '#1a1014';
      ctx.beginPath();
      ctx.ellipse(pr.x, y - 0.4, w, 1.2, 0, 0, PI2);
      ctx.fill();
      if (!lowfx && pr.k < keep) radial(ctx, pr.x, y - 1, 7 * pr.s, '255,170,90', 0.35);
      ctx.fillStyle = 'rgba(255,160,90,0.7)';
      ctx.fillRect(pr.x - w * 0.5, y - 0.6, w, 0.7);
    },
    ember(ctx, pr, y, M, keep, lowfx) {
      if (pr.k > keep) return;
      // 還在發紅的小炭塊
      if (!lowfx) radial(ctx, pr.x, y - 1.5, 8 * pr.s, '255,110,40', 0.3);
      for (let k = 0; k < 2; k++) {
        const x = pr.x + k * 3.2 - 1.6;
        const r = (1.4 + hash(pr.x + k) * 1.2) * pr.s;
        ctx.fillStyle = '#2a1a18';
        ctx.beginPath();
        ctx.ellipse(x, y - r * 0.7, r * 1.2, r * 0.8, 0, 0, PI2);
        ctx.fill();
        ctx.fillStyle = k ? '#ff8a3a' : '#ffb454';
        ctx.beginPath();
        ctx.ellipse(x + 0.3, y - r * 0.5, r * 0.7, r * 0.35, 0, 0, PI2);
        ctx.fill();
      }
    },
    shard(ctx, pr, y) {
      // 黑曜岩碎片：斜插在灰裡，一條銳利的亮邊
      const h = (5 + pr.r * 5) * pr.s;
      const lean = (pr.r - 0.5) * 4;
      ctx.fillStyle = '#18121a';
      ctx.beginPath();
      ctx.moveTo(pr.x - 2.6, y - 0.5);
      ctx.lineTo(pr.x + lean, y - h);
      ctx.lineTo(pr.x + 2.8, y - 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,210,255,0.55)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(pr.x - 2, y - 1);
      ctx.lineTo(pr.x + lean - 0.2, y - h + 0.6);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,120,60,0.4)';
      ctx.beginPath();
      ctx.moveTo(pr.x + lean + 0.3, y - h + 1);
      ctx.lineTo(pr.x + 2.4, y - 1);
      ctx.stroke();
    },
  };
  Object.assign(PROP, {
    coil(ctx, pr, y) {
      // 一捲麻繩
      const r = 5 * pr.s;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(pr.x + 1, y - 0.6, r * 1.3, 1.6, 0, 0, PI2);
      ctx.fill();
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = k % 2 ? '#6e5a40' : '#8a7454';
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.ellipse(pr.x, y - 1.4 - k * 1.5, r - k * 0.9, 1.9, 0, 0, PI2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(214,228,236,0.35)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(pr.x, y - 5.2, r - 2.3, 1.6, 0, Math.PI, PI2);
      ctx.stroke();
    },
    cleat(ctx, pr, y) {
      // 繫船的鐵樁
      ctx.fillStyle = '#2a2c2e';
      ctx.fillRect(pr.x - 2.5, y - 6, 5, 6);
      ctx.fillRect(pr.x - 6, y - 7.5, 12, 2.2);
      ctx.fillStyle = 'rgba(200,214,224,0.35)';
      ctx.fillRect(pr.x - 6, y - 7.5, 12, 0.7);
      ctx.fillStyle = 'rgba(120,70,40,0.5)';
      ctx.fillRect(pr.x - 1.5, y - 3, 3, 2);
    },
    bucket(ctx, pr, y) {
      const w = 4.5 * pr.s;
      const h = 7 * pr.s;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(pr.x - w, y - 0.8, w * 2.2, 1.2);
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath();
      ctx.moveTo(pr.x - w, y - h);
      ctx.lineTo(pr.x + w, y - h);
      ctx.lineTo(pr.x + w * 0.8, y - 0.5);
      ctx.lineTo(pr.x - w * 0.8, y - 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a3a3c';
      ctx.fillRect(pr.x - w * 0.95, y - h * 0.75, w * 1.9, 1.2);
      ctx.fillRect(pr.x - w * 0.85, y - h * 0.3, w * 1.7, 1.2);
      ctx.fillStyle = 'rgba(200,214,224,0.3)';
      ctx.fillRect(pr.x - w, y - h, w * 2, 0.8);
    },
    lantern(ctx, pr, y, M, keep, lowfx) {
      // 破船上掛著的舊提燈（變老之後熄了）
      const lit = pr.k < keep;
      if (lit && !lowfx) radial(ctx, pr.x, y - 6, 16, '255,200,120', 0.35);
      ctx.fillStyle = '#2a2624';
      ctx.fillRect(pr.x - 3.2, y - 10, 6.4, 1.4);
      ctx.fillRect(pr.x - 3.2, y - 1.6, 6.4, 1.4);
      ctx.fillStyle = lit ? '#ffcc7a' : '#5a5650';
      ctx.fillRect(pr.x - 2.4, y - 8.6, 4.8, 7);
      ctx.strokeStyle = '#2a2624';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(pr.x - 2.4, y - 8.6, 4.8, 7);
      ctx.beginPath();
      ctx.arc(pr.x, y - 11, 1.8, Math.PI, PI2);
      ctx.stroke();
    },
  });

  // ════════════════════════════════════════════════════════════
  // 木棧／破船甲板的畫法
  // ════════════════════════════════════════════════════════════
  function drawDeck(ctx, map, M, S, D, p, x0, x1) {
    const L = p[0];
    const R = p[1];
    const y = p[2];
    const lvl = map._aged || 0;
    const keep = 1 - 0.85 * lvl;
    const lowfx = low();
    const a = Math.max(L - 20, x0 - 40);
    const b = Math.min(R + 20, x1 + 40);
    const vis = (x, pad) => x > a - (pad || 0) && x < b + (pad || 0);
    const W = S.wood;
    const wreck = !!S.wreck;
    // 陰影
    {
      const g = ctx.createLinearGradient(0, y + 14, 0, y + 74);
      g.addColorStop(0, rgba(M.shadow, 0.22));
      g.addColorStop(1, rgba(M.shadow, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse((L + R) / 2, y + 20, (R - L) / 2 + 4, 52, 0, 0, Math.PI);
      ctx.fill();
    }
    // 斜撐（在木樁後面）
    ctx.lineCap = 'butt';
    for (const br of D.braces) {
      if (br.x1 < a || br.x0 > b) continue;
      const ya = y + 16;
      const yb = y + 52;
      const segs = br.cross ? [[br.x0, ya, br.x1, yb], [br.x0, yb, br.x1, ya]] : br.dir > 0 ? [[br.x0, ya, br.x1, yb]] : [[br.x0, yb, br.x1, ya]];
      for (const [ax, ay, bx, by] of segs) {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay + 1);
        ctx.lineTo(bx, by + 1);
        ctx.stroke();
        ctx.strokeStyle = W[2];
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.strokeStyle = rgba(S.hi, 0.12);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(ax, ay - 1.6);
        ctx.lineTo(bx, by - 1.6);
        ctx.stroke();
      }
    }
    // 木樁：左邊受冷光、下半被海水浸成深色，末端斷裂，上面長藤壺、掛海草
    for (const po of D.posts) {
      if (!vis(po.x, 12)) continue;
      const top = y + 12;
      const bot = y + 12 + po.len;
      const hw = po.w / 2;
      ctx.save();
      ctx.translate(po.x, top);
      ctx.transform(1, 0, po.tilt, 1, 0, 0);
      const g = ctx.createLinearGradient(-hw, 0, hw, 0);
      g.addColorStop(0, W[1]);
      g.addColorStop(0.35, W[2]);
      g.addColorStop(1, W[3]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.lineTo(hw, 0);
      ctx.lineTo(hw, po.len - 3 - po.br * 4);
      ctx.lineTo(hw * 0.3, po.len - po.br * 2);
      ctx.lineTo(-hw * 0.2, po.len - 5);
      ctx.lineTo(-hw, po.len - 1 - po.br * 5);
      ctx.closePath();
      ctx.fill();
      // 濕的深色下半（越往下越暗、帶一點綠）
      const wg = ctx.createLinearGradient(0, po.len * 0.35, 0, po.len);
      wg.addColorStop(0, rgba(S.wet, 0));
      wg.addColorStop(1, rgba(S.wet, 0.75));
      ctx.fillStyle = wg;
      ctx.fillRect(-hw, po.len * 0.35, po.w, po.len * 0.65);
      // 木紋與左緣亮邊
      ctx.strokeStyle = rgba(S.grain, 0.45);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.3, 2);
      ctx.lineTo(-hw * 0.2, po.len - 8);
      ctx.moveTo(hw * 0.4, 4);
      ctx.lineTo(hw * 0.45, po.len - 10);
      ctx.stroke();
      ctx.fillStyle = rgba(S.hi, 0.22);
      ctx.fillRect(-hw, 0, 1.1, po.len - 6);
      // 頂端綁著的鐵箍
      ctx.fillStyle = '#2c2e30';
      ctx.fillRect(-hw - 0.5, 4, po.w + 1, 2.2);
      ctx.fillStyle = 'rgba(120,70,40,0.5)';
      ctx.fillRect(-hw * 0.2, 5.4, 2, 1.4);
      ctx.restore();
      if (S.barn) {
        const list = [];
        for (let k = 0; k < po.barn; k++) list.push({ x: po.x + (hash(po.x + k) - 0.5) * po.w * 0.9, y: bot - 6 - hash(po.x * 0.3 + k) * po.len * 0.35, r: 1 + hash(po.x + k * 3) * 1.4 });
        barnacles(ctx, list, M);
      }
    }
    // 船殼（沉船）：碗狀的船腹，一條條船板、縫、破洞、藤壺；兩端伸出斷掉的肋材
    if (D.hull) {
      const h = D.hull;
      const hd = D.hullD;
      const hullPath = () => {
        ctx.beginPath();
        ctx.moveTo(h.x0 - 4, y + 12);
        ctx.lineTo(h.x1 + 4, y + 12);
        for (let x = h.x1; x >= h.x0; x -= 5) ctx.lineTo(x, y + hd(x));
        ctx.closePath();
      };
      const g = ctx.createLinearGradient(0, y + 12, 0, y + h.maxD);
      g.addColorStop(0, W[2]);
      g.addColorStop(0.6, W[3]);
      g.addColorStop(1, '#1a2226');
      ctx.fillStyle = g;
      hullPath();
      ctx.fill();
      ctx.save();
      hullPath();
      ctx.clip();
      // 船板：跟著船腹的弧度
      const pat = texPattern(ctx, map, 'wood');
      if (pat) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = pat;
        ctx.fillRect(Math.max(a, h.x0), y + 12, Math.min(b, h.x1) - Math.max(a, h.x0), h.maxD);
        ctx.restore();
      }
      for (let k = 1; k < 7; k++) {
        const f = k / 7;
        ctx.strokeStyle = rgba(S.grain, 0.7);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let first = true;
        for (let x = Math.max(h.x0, Math.floor(a / 6) * 6); x <= Math.min(h.x1, b); x += 6) {
          const yy = y + 12 + (hd(x) - 12) * f;
          first ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
          first = false;
        }
        ctx.stroke();
        ctx.strokeStyle = rgba(S.hi, 0.08);
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      // 濕的下半、海水的反光
      const wg = ctx.createLinearGradient(0, y + 24, 0, y + h.maxD);
      wg.addColorStop(0, rgba(S.wet, 0));
      wg.addColorStop(1, rgba(S.wet, 0.8));
      ctx.fillStyle = wg;
      ctx.fillRect(a, y + 24, b - a, h.maxD);
      // 破洞：看進去是黑的，邊緣是碎木
      for (const o of D.holes) {
        if (!vis(o.x, 20)) continue;
        ctx.fillStyle = '#06080a';
        ctx.beginPath();
        ctx.moveTo(o.x - o.w / 2, o.y);
        ctx.lineTo(o.x - o.w * 0.2, o.y - o.h * 0.6);
        ctx.lineTo(o.x + o.w * 0.1, o.y - o.h * 0.2);
        ctx.lineTo(o.x + o.w / 2, o.y - o.h * 0.5);
        ctx.lineTo(o.x + o.w * 0.35, o.y + o.h * 0.5);
        ctx.lineTo(o.x - o.w * 0.3, o.y + o.h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba(S.hi, 0.2);
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      // 藤壺成片長在船腹下緣
      if (S.barn) {
        const list = [];
        for (let x = Math.max(h.x0 + 6, Math.floor(a / 7) * 7); x < Math.min(h.x1 - 6, b); x += 7) {
          if (hash(x * 0.19 + D.seed) < 0.45) continue;
          list.push({ x: x + hash(x) * 4, y: y + hd(x) - 3 - hash(x * 0.7) * 7, r: 1 + hash(x * 1.3) * 1.5 });
        }
        barnacles(ctx, list, M);
      }
      ctx.restore();
      // 船腹下緣的冷光
      ctx.strokeStyle = rgba(M.bounce, 0.2);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = Math.max(h.x0 + 4, Math.floor(a / 6) * 6); x <= Math.min(h.x1 - 4, b); x += 6) {
        const yy = y + hd(x) - 1;
        x === Math.max(h.x0 + 4, Math.floor(a / 6) * 6) ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
      // 肋材：船腹上一根根往外凸的弧、兩端露出來的斷肋
      for (const rb of D.ribs) {
        if (!vis(rb.x, 50)) continue;
        if (rb.dir === 0) {
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(rb.x + 1, y + 13);
          ctx.lineTo(rb.x + 1, y + hd(rb.x) - 1);
          ctx.stroke();
          ctx.strokeStyle = W[1];
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(rb.x, y + 13);
          ctx.lineTo(rb.x, y + hd(rb.x) - 1);
          ctx.stroke();
          continue;
        }
        const d = rb.dir;
        const pts = [];
        for (let k = 0; k <= 6; k++) {
          const u = k / 6;
          pts.push(rb.x + d * Math.sin(u * 1.2) * rb.len * 0.45, y + 12 + u * rb.len);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        taperPath(ctx, pts.map((v, k) => v + (k % 2 ? 1 : 1)), 6, 3.5);
        ctx.fill();
        ctx.fillStyle = W[1];
        ctx.beginPath();
        taperPath(ctx, pts, 5.5, 3.2);
        ctx.fill();
        // 斷口
        const ex = pts[12];
        const ey = pts[13];
        ctx.fillStyle = W[0];
        ctx.beginPath();
        ctx.moveTo(ex - 2, ey - 1);
        ctx.lineTo(ex - 0.5, ey + 3 + rb.br * 2);
        ctx.lineTo(ex + 0.6, ey + 0.5);
        ctx.lineTo(ex + 1.8, ey + 2.5);
        ctx.lineTo(ex + 2, ey - 1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba(S.hi, 0.2);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(pts[0] - 2, pts[1]);
        for (let k = 2; k < 12; k += 2) ctx.lineTo(pts[k] - 2 + d * 0.5, pts[k + 1]);
        ctx.stroke();
      }
    }
    // 橫樑端頭（在縱樑下面露出的一個個方塊）
    for (const j of D.joists) {
      if (!vis(j.x, 8)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(j.x - j.w / 2 + 0.8, y + 12, j.w, 8);
      ctx.fillStyle = W[2];
      ctx.fillRect(j.x - j.w / 2, y + 12, j.w, 7);
      ctx.strokeStyle = rgba(S.grain, 0.5);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(j.x, y + 15.5, 1.6, 0, PI2);
      ctx.stroke();
      ctx.fillStyle = rgba(S.hi, 0.14);
      ctx.fillRect(j.x - j.w / 2, y + 12, 0.9, 7);
    }
    // 繩子上端：綁在橫樑上的幾圈繩
    for (const ax of D.anchors) {
      if (!vis(ax, 12)) continue;
      ctx.fillStyle = W[2];
      ctx.fillRect(ax - 4, y + 12, 8, 7);
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k % 2 ? '#6e5a40' : '#8a7454';
        ctx.beginPath();
        ctx.ellipse(ax, y + 13.5 + k * 2.2, 5, 1.3, 0.12, 0, PI2);
        ctx.fill();
      }
    }
    // 縱樑（甲板正面那一條粗木）
    {
      const sl = D.strL;
      const sr = D.strR;
      const g = ctx.createLinearGradient(0, y + 4, 0, y + 13);
      g.addColorStop(0, W[1]);
      g.addColorStop(1, W[2]);
      ctx.fillStyle = g;
      ctx.fillRect(Math.max(sl, a), y + 4, Math.min(sr, b) - Math.max(sl, a), 9);
      const pat = texPattern(ctx, map, 'wood');
      if (pat) {
        ctx.save();
        ctx.translate(Math.round(D.seed * 9), y + 4);
        ctx.fillStyle = pat;
        ctx.fillRect(Math.max(sl, a) - Math.round(D.seed * 9), 0, Math.min(sr, b) - Math.max(sl, a), 9);
        ctx.restore();
      }
      ctx.fillStyle = rgba(S.wet, 0.4);
      ctx.fillRect(Math.max(sl, a), y + 10, Math.min(sr, b) - Math.max(sl, a), 3);
      // 木樁位置的螺栓、鏽痕往下流
      for (const po of D.posts) {
        if (!vis(po.x, 8)) continue;
        ctx.fillStyle = '#2a2c2e';
        ctx.beginPath();
        ctx.arc(po.x, y + 8.5, 1.6, 0, PI2);
        ctx.fill();
        ctx.fillStyle = 'rgba(122,70,40,0.4)';
        ctx.fillRect(po.x - 0.8, y + 9.5, 1.6, 4);
      }
      // 破船：縱樑缺了幾段
      if (wreck) {
        ctx.fillStyle = '#0a0c0e';
        for (let x = sl + 60; x < sr - 40; x += 140) {
          const hx = x + hash(x * 0.3 + D.seed) * 60;
          if (!vis(hx, 20) || hash(x + D.seed) < 0.5) continue;
          ctx.beginPath();
          ctx.moveTo(hx - 7, y + 13);
          ctx.lineTo(hx - 4, y + 7);
          ctx.lineTo(hx + 1, y + 9);
          ctx.lineTo(hx + 6, y + 6.5);
          ctx.lineTo(hx + 9, y + 13);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(Math.max(sl, a), y + 12.5, Math.min(sr, b) - Math.max(sl, a), 1);
    }
    // 頂層木板：接縫、釘頭、節疤；上緣受冷光
    for (const bd of D.boards) {
      if (bd.x1 < a || bd.x0 > b) continue;
      const g = ctx.createLinearGradient(0, y - 2, 0, y + 5);
      const t = bd.tone;
      g.addColorStop(0, t < 0.5 ? W[0] : W[1]);
      g.addColorStop(1, W[2]);
      ctx.fillStyle = g;
      ctx.fillRect(bd.x0, y - 2 + bd.dy, bd.x1 - bd.x0 - 0.8, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bd.x1 - 1, y - 2, 1.2, 7);
      ctx.fillStyle = '#1e2022';
      ctx.fillRect(bd.x1 - 4, y + 0.5, 1.2, 1.2);
      ctx.fillRect(bd.x0 + 2.5, y + 0.5, 1.2, 1.2);
      for (const kx of bd.knots) {
        ctx.strokeStyle = rgba(S.grain, 0.55);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.ellipse(kx, y + 1.6, 2.2, 1.1, 0, 0, PI2);
        ctx.stroke();
      }
    }
    {
      const pat = texPattern(ctx, map, 'wood');
      if (pat) {
        ctx.save();
        ctx.translate(Math.round(D.seed * 5), y - 2);
        ctx.fillStyle = pat;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(Math.max(D.endL, a) - Math.round(D.seed * 5), 0, Math.min(D.endR, b) - Math.max(D.endL, a), 7);
        ctx.restore();
      }
    }
    // 兩端：碼頭是端面（看得到年輪的方頭），破船是碎裂的尖角
    for (const [ex, dir, sp] of [[D.endL, -1, D.spL], [D.endR, 1, D.spR]]) {
      if (!vis(ex, 16)) continue;
      if (!wreck) {
        ctx.fillStyle = W[2];
        ctx.fillRect(dir < 0 ? ex : ex - 3, y - 2, 3, 7);
        ctx.fillStyle = rgba(S.hi, 0.18);
        ctx.fillRect(dir < 0 ? ex : ex - 3, y - 2, 3, 0.8);
      } else {
        ctx.fillStyle = W[1];
        ctx.beginPath();
        ctx.moveTo(ex - dir * 2, y - 2);
        ctx.lineTo(ex + dir * (3 + sp[0] * 5), y - 1.5);
        ctx.lineTo(ex + dir * 0.5, y + 0.5);
        ctx.lineTo(ex + dir * (2 + sp[1] * 6), y + 2);
        ctx.lineTo(ex - dir * 1, y + 3.5);
        ctx.lineTo(ex + dir * (1 + sp[2] * 3), y + 5);
        ctx.lineTo(ex - dir * 3, y + 5);
        ctx.closePath();
        ctx.fill();
      }
    }
    // 上緣：受光的一條亮邊（冷白），接縫處斷開一點
    ctx.fillStyle = rgba(S.hi, 0.5);
    for (const bd of D.boards) {
      if (bd.x1 < a || bd.x0 > b) continue;
      ctx.fillRect(bd.x0 + 1, y - 2 + bd.dy, bd.x1 - bd.x0 - 3, 1);
    }
    ctx.fillStyle = rgba(M.rim, 0.12);
    ctx.fillRect(Math.max(D.endL, a), y - 7, Math.min(D.endR, b) - Math.max(D.endL, a), 5);
    // 甲板下緣：水痕與苔的綠
    ctx.fillStyle = 'rgba(60,90,70,0.35)';
    for (let x = Math.floor(Math.max(D.strL, a) / 12) * 12; x < Math.min(D.strR, b); x += 12) {
      if (hash(x * 0.23 + D.seed) < 0.5) continue;
      ctx.beginPath();
      ctx.ellipse(x, y + 12, 4 + hash(x) * 6, 1.4, 0, 0, PI2);
      ctx.fill();
    }
    // 破網
    for (const n of D.nets) {
      if (n.x1 < a - 20 || n.x0 > b + 20) continue;
      const top = y + 13;
      const mid = (n.x0 + n.x1) / 2;
      ctx.strokeStyle = 'rgba(120,110,90,0.6)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const x = n.x0 + ((n.x1 - n.x0) * k) / 6;
        const d = n.sag * Math.sin((Math.PI * k) / 6);
        ctx.moveTo(x, top);
        ctx.lineTo(x + (mid - x) * 0.1, top + d + 4);
      }
      for (let r = 1; r <= 3; r++) {
        ctx.moveTo(n.x0, top + r * 1.5);
        for (let k = 1; k <= 6; k++) {
          const x = n.x0 + ((n.x1 - n.x0) * k) / 6;
          ctx.lineTo(x, top + (n.sag * Math.sin((Math.PI * k) / 6) + 4) * (r / 3));
        }
      }
      ctx.stroke();
      if (n.floats) {
        for (const fx of [n.x0 + (n.x1 - n.x0) * 0.3, n.x0 + (n.x1 - n.x0) * 0.72]) {
          const fy = top + n.sag * 0.9 + 8;
          ctx.strokeStyle = 'rgba(120,110,90,0.7)';
          ctx.beginPath();
          ctx.moveTo(fx, fy - 8);
          ctx.lineTo(fx, fy - 3);
          ctx.stroke();
          ctx.fillStyle = fx < mid ? '#8a4a36' : '#6a6a5a';
          ctx.beginPath();
          ctx.ellipse(fx, fy, 3, 3.6, 0, 0, PI2);
          ctx.fill();
          ctx.fillStyle = 'rgba(220,230,236,0.35)';
          ctx.fillRect(fx - 1.6, fy - 2.4, 1.2, 1.2);
        }
      }
    }
    // 底下的海帶與水滴（沿用岩塊的畫法）
    drawUnder(ctx, M, { body: W, dripRgb: '200,228,250' }, { stal: [], under: D.under, depth: () => 19 }, y, vis, lowfx, keep);
    // 頂面的小擺設
    for (const pr of D.props) {
      if (!vis(pr.x, 20)) continue;
      PROP[pr.kind] && PROP[pr.kind](ctx, pr, y - 2, M, keep, lowfx, lvl);
    }
  }

  // ════════════════════════════════════════════════════════════
  // 繩索：麻繩（海岸：濕的、上過焦油、尾端掛海草與藤壺）、曬白的繩（峽谷：紅布綁結）、鐵鍊（熔岩地：下段被烤紅）
  // 每條繩子畫一次成小貼圖
  // ════════════════════════════════════════════════════════════
  const ropeCache = new Map();
  function buildRope(map, M, x, top, bottom) {
    const SC = 2;
    const W = 40;
    const len = Math.max(10, bottom - top);
    const H = Math.ceil(len + 30);
    const c = document.createElement('canvas');
    c.width = W * SC;
    c.height = H * SC;
    const g = c.getContext('2d');
    g.scale(SC, SC);
    const cx = W / 2;
    const y0 = 2;
    const rnd = U.seeded(Math.round(x) * 17 + Math.round(top) * 5 + 3);
    const style = M.rope;
    const lowfx = low();
    const draw = () => {
      g.lineCap = 'round';
      g.lineJoin = 'round';
      if (style === 'chain') {
        const hot = (yy) => clamp((yy / len - 0.55) / 0.45, 0, 1);
        for (let yy = 0, k = 0; yy < len; yy += 8, k++) {
          const Y = y0 + yy + 4;
          const face = k % 2 === 0;
          // 影子
          g.strokeStyle = 'rgba(0,0,0,0.45)';
          g.lineWidth = 3.4;
          g.beginPath();
          if (face) g.ellipse(cx + 0.7, Y + 0.7, 3.6, 5.4, 0, 0, PI2);
          else {
            g.moveTo(cx + 0.7, Y - 4.3);
            g.lineTo(cx + 0.7, Y + 5.7);
          }
          g.stroke();
          const gr = g.createLinearGradient(cx - 4, 0, cx + 4, 0);
          gr.addColorStop(0, '#8a8490');
          gr.addColorStop(0.45, '#57525c');
          gr.addColorStop(1, '#2a262e');
          g.strokeStyle = gr;
          g.lineWidth = face ? 2 : 2.4;
          g.beginPath();
          if (face) g.ellipse(cx, Y, 3.6, 5.4, 0, 0, PI2);
          else {
            g.moveTo(cx, Y - 5);
            g.lineTo(cx, Y + 5);
          }
          g.stroke();
          // 高光
          g.strokeStyle = 'rgba(255,236,220,0.55)';
          g.lineWidth = 0.7;
          g.beginPath();
          if (face) g.arc(cx, Y, 3.4, Math.PI * 0.95, Math.PI * 1.35);
          else {
            g.moveTo(cx - 0.6, Y - 3.5);
            g.lineTo(cx - 0.6, Y - 0.5);
          }
          g.stroke();
          // 下段被熔岩烤得發紅
          const hv = hot(yy);
          if (hv > 0) {
            g.strokeStyle = 'rgba(255,' + Math.round(120 + 60 * (1 - hv)) + ',50,' + (hv * 0.6).toFixed(2) + ')';
            g.lineWidth = 1.2;
            g.beginPath();
            if (face) g.ellipse(cx, Y, 3.6, 5.4, 0, 0, PI2);
            else {
              g.moveTo(cx, Y - 5);
              g.lineTo(cx, Y + 5);
            }
            g.stroke();
          }
          if (rnd() < 0.25) {
            g.fillStyle = 'rgba(120,60,30,0.55)';
            g.fillRect(cx + (rnd() - 0.5) * 5, Y + (rnd() - 0.5) * 6, 1.2, 1.2);
          }
        }
        if (!lowfx) {
          const gg = g.createRadialGradient(cx, y0 + len, 0, cx, y0 + len, 14);
          gg.addColorStop(0, 'rgba(255,120,50,0.28)');
          gg.addColorStop(1, 'rgba(255,120,50,0)');
          g.fillStyle = gg;
          g.fillRect(cx - 14, y0 + len - 14, 28, 28);
        }
        // 末端的鉤子
        g.strokeStyle = '#3a363e';
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(cx, y0 + len + 3);
        g.lineTo(cx, y0 + len + 9);
        g.arc(cx - 3, y0 + len + 9, 3, 0, Math.PI * 0.9);
        g.stroke();
        g.strokeStyle = 'rgba(255,150,80,0.6)';
        g.lineWidth = 0.8;
        g.stroke();
        return;
      }
      const dry = style === 'dryrope';
      const base = dry ? '#a88a5e' : '#5e503e';
      const dark = dry ? 'rgba(70,44,20,0.6)' : 'rgba(10,8,6,0.6)';
      const lite = dry ? 'rgba(250,230,190,0.5)' : 'rgba(200,196,176,0.32)';
      const sw = (yy) => cx + Math.sin(yy * 0.021 + x) * 0.8;
      const path = (ox, lw, col) => {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.beginPath();
        for (let yy = 0; yy <= len; yy += 4) (yy ? g.lineTo(sw(yy) + ox, y0 + yy) : g.moveTo(sw(yy) + ox, y0 + yy));
        g.stroke();
      };
      path(0.8, 6.4, 'rgba(0,0,0,0.4)');
      path(0, 4.8, base);
      // 兩股扭紋
      g.strokeStyle = dark;
      g.lineWidth = 1;
      g.beginPath();
      for (let yy = 1; yy < len; yy += 4.2) {
        const xx = sw(yy);
        g.moveTo(xx - 2.3, y0 + yy);
        g.lineTo(xx + 2.3, y0 + yy + 3);
      }
      g.stroke();
      g.strokeStyle = lite;
      g.lineWidth = 0.9;
      g.beginPath();
      for (let yy = 2.2; yy < len; yy += 4.2) {
        const xx = sw(yy);
        g.moveTo(xx - 1.9, y0 + yy);
        g.lineTo(xx + 0.4, y0 + yy + 1.6);
      }
      g.stroke();
      // 左緣的冷光（海岸）／暖光（峽谷）
      path(-1.9, 0.7, rgba(M.rim, dry ? 0.35 : 0.3));
      // 起毛的纖維
      g.strokeStyle = dry ? 'rgba(210,180,130,0.6)' : 'rgba(130,116,90,0.6)';
      g.lineWidth = 0.5;
      g.beginPath();
      for (let yy = 6; yy < len; yy += 5 + rnd() * 8) {
        const s = rnd() < 0.5 ? -1 : 1;
        const xx = sw(yy) + s * 2.2;
        g.moveTo(xx, y0 + yy);
        g.lineTo(xx + s * (1.5 + rnd() * 2), y0 + yy - 1 + rnd() * 3);
      }
      g.stroke();
      // 繩結
      for (let yy = 30 + rnd() * 16; yy < len - 12; yy += 46 + rnd() * 22) {
        const xx = sw(yy);
        const Y = y0 + yy;
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.beginPath();
        g.ellipse(xx + 0.7, Y + 0.8, 4.2, 3.6, 0, 0, PI2);
        g.fill();
        const kg = g.createRadialGradient(xx - 1.2, Y - 1.2, 0, xx, Y, 4.4);
        kg.addColorStop(0, dry ? '#d8bc8a' : '#8a7a5e');
        kg.addColorStop(1, dry ? '#8a6a40' : '#3e3428');
        g.fillStyle = kg;
        g.beginPath();
        g.ellipse(xx, Y, 4, 3.4, 0, 0, PI2);
        g.fill();
        g.strokeStyle = dark;
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(xx - 3, Y - 1.4);
        g.quadraticCurveTo(xx, Y + 0.6, xx + 3, Y - 1.2);
        g.moveTo(xx - 2.8, Y + 1.2);
        g.quadraticCurveTo(xx, Y + 2.8, xx + 2.6, Y + 1.4);
        g.stroke();
      }
      if (dry) {
        // 紅布條綁結
        const yy = len * (0.25 + rnd() * 0.2);
        const xx = sw(yy);
        g.fillStyle = '#a8402e';
        g.fillRect(xx - 3.2, y0 + yy, 6.4, 4);
        g.fillStyle = 'rgba(255,200,170,0.35)';
        g.fillRect(xx - 3.2, y0 + yy, 6.4, 0.8);
        g.fillStyle = '#8a3224';
        g.beginPath();
        g.moveTo(xx + 3, y0 + yy + 1);
        g.lineTo(xx + 8, y0 + yy + 7);
        g.lineTo(xx + 6, y0 + yy + 8);
        g.lineTo(xx + 2.6, y0 + yy + 3.5);
        g.closePath();
        g.fill();
      } else {
        // 焦油的暗斑、尾段掛著海草與幾顆藤壺
        g.fillStyle = 'rgba(8,8,6,0.45)';
        for (let k = 0; k < 3; k++) {
          const yy = rnd() * len;
          g.fillRect(sw(yy) - 2.4, y0 + yy, 4.8, 3 + rnd() * 6);
        }
        g.fillStyle = M.kelp ? M.kelp[1] : '#2a3a2e';
        g.beginPath();
        for (let k = 0; k < 3; k++) {
          const yy = len * (0.6 + rnd() * 0.35);
          const s = rnd() < 0.5 ? -1 : 1;
          const xx = sw(yy) + s * 1.5;
          taperPath(g, [xx, y0 + yy, xx + s * 3, y0 + yy + 4, xx + s * 2, y0 + yy + 9 + rnd() * 5], 2, 0.5);
        }
        g.fill();
        const bl = [];
        for (let k = 0; k < 3; k++) {
          const yy = len * (0.7 + rnd() * 0.25);
          bl.push({ x: sw(yy) + (rnd() - 0.5) * 3, y: y0 + yy, r: 1 + rnd() * 0.8 });
        }
        barnacles(g, bl, M);
      }
      // 末端散開的繩穗
      g.strokeStyle = base;
      g.lineWidth = 1.2;
      g.beginPath();
      for (let k = -2; k <= 2; k++) {
        g.moveTo(sw(len), y0 + len - 1);
        g.lineTo(sw(len) + k * 1.8, y0 + len + 7 - Math.abs(k));
      }
      g.stroke();
      g.fillStyle = dark;
      g.fillRect(sw(len) - 2.6, y0 + len - 3, 5.2, 2);
    };
    if (A.withAge) A.withAge(g, map, draw);
    else draw();
    return { c, W, H, y0 };
  }
  function ropeArt(ctx, r, x, top0, bottom, t, map) {
    const M = MAT[map.refinedGround];
    if (!M) return;
    // 上端藏進上層平台裡（平台比繩子晚畫，會蓋住），看起來像從平台底下的鐵環／橫樑垂下來
    const top = r[1] + 6;
    const key = r[0] + ':' + r[1] + ':' + r[2] + ':' + (map._aged || 0) + ':' + map.refinedGround;
    let e = ropeCache.get(key);
    if (!e) {
      if (ropeCache.size > 64) ropeCache.clear();
      e = buildRope(map, M, x, top, bottom);
      ropeCache.set(key, e);
    }
    const k = Math.sin(t * 0.9 + x * 0.013) * (2 / Math.max(40, bottom - top));
    ctx.save();
    ctx.transform(1, 0, k, 1, -k * top, 0);
    ctx.drawImage(e.c, x - e.W / 2, top - e.y0, e.W, e.H);
    ctx.restore();
  }

  // ── 註冊 ──
  function realMap(map) {
    // 平台快取塊用的是 Object.create(map) 的代理（只留一個平台）：細節要算在真的地圖上
    let m = map;
    for (;;) {
      const pr = Object.getPrototypeOf(m);
      if (pr && pr !== Object.prototype && Object.prototype.hasOwnProperty.call(pr, 'platforms')) m = pr;
      else return m;
    }
  }
  function groundArt(ctx, map, i, x0, x1) {
    if (!map._g23) {
      const rm = realMap(map);
      buildMap(rm);
    }
    const M = MAT[map.refinedGround];
    const D = map._g23 && map._g23[i];
    if (!M || !D) return;
    const p = map.platforms[i];
    const S = i === 0 ? M.ground : M.plat;
    if (D.kind === 'deck') drawDeck(ctx, map, M, S, D, p, x0, x1);
    else drawRock(ctx, map, M, S, D, p, x0, x1);
  }
  for (const key in MAT) {
    A.GROUND_ART[key] = groundArt;
    A.ROPE_ART[key] = ropeArt;
  }
  A.GROUND23_MAT = MAT;

  // background.js 的 drawRope 只在繩子樣式是 'vine' 時交給 ROPE_ART；這兩章的地圖寫的是 'rope'（或主題預設 rope／chain），
  // 所以畫繩子的那一下，把繩子換成寫 'vine' 的複本、主題換成 rope: 'vine' 的影子物件
  // （呼吸光、往上飄的光點照舊由原本的函式畫；不用改 background.js）
  const baseRope = A.drawRope;
  const ropeCopy = new WeakMap();
  A.drawRope = function (ctx, r, t, near) {
    const m = G.world && G.world.map;
    if (!m || r[3] === 'ladder' || !MAT[m.refinedGround] || !m._theme || A.ROPE_ART[m.refinedGround] !== ropeArt) return baseRope(ctx, r, t, near);
    const th = m._theme;
    if (m._ropeTh23 !== th) {
      m._ropeTh23 = th;
      m._ropeTh23v = Object.create(th);
      m._ropeTh23v.rope = 'vine';
    }
    let r2 = ropeCopy.get(r);
    if (!r2) {
      r2 = [r[0], r[1], r[2], 'vine'];
      ropeCopy.set(r, r2);
    }
    m._theme = m._ropeTh23v;
    try {
      baseRope(ctx, r2, t, near);
    } finally {
      m._theme = th;
    }
  };

  // ── 接上 prepareMap：算好細節；平台底下原本每格重畫的垂掛物（網子浮球、海草、乾根、熔岩滴）改由快取裡的底面細節取代 ──
  const basePrep = A.prepareMap;
  A.prepareMap = function (map) {
    basePrep(map);
    if (map.refinedGround && MAT[map.refinedGround]) {
      buildMap(map);
      map._hang = [];
    }
  };
})();
