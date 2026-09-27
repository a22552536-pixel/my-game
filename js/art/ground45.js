// 精緻地形：第四章「霜鈴雪峰」與終章「時空間神殿」（跟 js/art/ground.js 的 1-2 試作同一個標準）
// ・第四章：雪蓋（軟邊、垂下來的雪舌、藍色的陰影面、閃光）、凍住的岩層與冰脈、神社的切石、冰瀑的冰晶、
//   祭壇的石板與霜紋；底面：冰柱、垂雪、剝落的碎石。土地變老（解凍）：雪變薄、露出濕岩、冰柱變短變少
// ・終章：抽象的時空神殿——大理石（紋理、金色鑲線）、倒階梯狀的浮空基座、底下漂浮的碎片、流過的光流
//   （「時間像流水、空間像風」），站立面一律是乾淨平整的石面
// ・全部畫進 background.js 的平台快取塊，每格只貼圖；繩子每條預先畫成一張小貼圖（麻繩、鈴繩、冰鏈、光之絲、花藤）
// ・地圖寫 refinedGround: 'snow' | 'shrine' | 'ice' | 'frost' | 'temple' | 'garden' | 'star' | 'throne'
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const K = A.groundKit || {};
  const PI2 = Math.PI * 2;
  A.GROUND_ART = A.GROUND_ART || {};
  A.ROPE_ART = A.ROPE_ART || {};

  // ── 小工具（groundKit 有就用它的，沒有就用自己的） ──
  const hash =
    K.hash ||
    ((n) => {
      const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return s - Math.floor(s);
    });
  const vnoise =
    K.vnoise ||
    ((x) => {
      const i = Math.floor(x);
      const f = x - i;
      const u = f * f * (3 - 2 * f);
      return hash(i) * (1 - u) + hash(i + 1) * u;
    });
  const fbm = K.fbm || ((x, s) => vnoise(x + s) * 0.55 + vnoise(x * 2.3 + s * 1.7) * 0.3 + vnoise(x * 5.3 + s * 3.1) * 0.15);
  const clamp = K.clamp || ((v, a, b) => (v < a ? a : v > b ? b : v));
  const lowFx = () => !!G.lowFx;
  function taperPath(ctx, pts, w0, w1) {
    if (K.taperPath) return K.taperPath(ctx, pts, w0, w1);
    const n = pts.length / 2;
    const Lx = [];
    const Ly = [];
    const Rx = [];
    const Ry = [];
    for (let k = 0; k < n; k++) {
      const k0 = Math.max(0, k - 1);
      const k1 = Math.min(n - 1, k + 1);
      let tx = pts[k1 * 2] - pts[k0 * 2];
      let ty = pts[k1 * 2 + 1] - pts[k0 * 2 + 1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
      const w = (w0 + (w1 - w0) * (k / (n - 1))) / 2;
      Lx.push(pts[k * 2] - ty * w);
      Ly.push(pts[k * 2 + 1] + tx * w);
      Rx.push(pts[k * 2] + ty * w);
      Ry.push(pts[k * 2 + 1] - tx * w);
    }
    ctx.moveTo(Lx[0], Ly[0]);
    for (let k = 1; k < n; k++) ctx.lineTo(Lx[k], Ly[k]);
    for (let k = n - 1; k >= 0; k--) ctx.lineTo(Rx[k], Ry[k]);
    ctx.closePath();
  }
  // 預先畫好的小貼圖（土地變老時走同一套調色）
  const sprCache = new Map();
  function sprite(key, w, h, map, draw) {
    if (K.sprite) return K.sprite('g45:' + key, w, h, map, draw);
    const k = key + '@' + ((map && map._aged) || 0);
    let c = sprCache.get(k);
    if (c) return c;
    if (typeof document === 'undefined') return null;
    c = document.createElement('canvas');
    c.width = Math.ceil(w * 2);
    c.height = Math.ceil(h * 2);
    const g = c.getContext('2d');
    g.scale(2, 2);
    if (map && map._aged && A.withAge) A.withAge(g, map, () => draw(g, w, h));
    else draw(g, w, h);
    c.sc = 2;
    if (sprCache.size > 64) sprCache.clear();
    sprCache.set(k, c);
    return c;
  }
  function pattern(ctx, c) {
    if (K.pattern) return K.pattern(ctx, c);
    if (!c || !ctx.createPattern) return null;
    const pat = ctx.createPattern(c, 'repeat');
    const s = 1 / (c.sc || 1);
    if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
    return pat;
  }
  function specks(g, w, h, colors, n, seed, size) {
    if (K.specks) return K.specks(g, w, h, colors, n, seed, size);
    const r = U.seeded(seed || 4242);
    for (const col of colors) {
      g.fillStyle = col;
      g.beginPath();
      for (let k = 0; k < n; k++) {
        const x = r() * w;
        const yy = r() * h;
        const sz = 0.6 + r() * r() * (size || 2.2);
        for (const ox of [0, -w]) for (const oy of [0, -h]) g.rect(x + ox, yy + oy, sz, sz * 0.8);
      }
      g.fill();
    }
  }
  const rgba = (pre, a) => pre + a.toFixed(3) + ')';

  // ════════════════════════════════════════════════════════════
  // 材質
  // fam: 'snow'（雪蓋＋岩／石／冰）或 'temple'（大理石板）
  // shape: 浮空平台的輪廓 rock | masonry | ice | slab；groundKind: 地面的剖面 rock | masonry | ice | altar | temple
  // ════════════════════════════════════════════════════════════
  const SNOWCAP = { cap: ['#ffffff', '#f2f6fd', '#d9e2f3', '#b3c2e0'], capSoft: 'rgba(236,242,255,0.55)', capEdge: 'rgba(78,94,150,0.42)', capDot: ['rgba(255,255,255,0.9)', 'rgba(150,170,215,0.35)', 'rgba(200,226,255,0.7)'] };
  const ICE = ['#e2f6ff', '#a6daf4', '#62a4d4', '#2e5e98'];
  const MAT = {
    snow: Object.assign({}, SNOWCAP, {
      fam: 'snow', shape: 'rock', groundKind: 'rock',
      soil: ['#7c7a8e', '#615e74', '#47445a', '#2e2c3e'],
      soilLight: 'rgba(206,210,236,', soilDark: 'rgba(16,14,30,',
      blotch: ['rgba(140,136,170,', 'rgba(40,36,56,', 'rgba(120,108,104,'],
      speck: ['rgba(226,230,250,0.2)', 'rgba(14,12,26,0.28)', 'rgba(150,146,176,0.26)', 'rgba(120,100,90,0.16)'],
      stone: [['#8a8896', '#5e5c6c', '#b4b2c2'], ['#767484', '#4e4c5c', '#a2a0b2'], ['#8a7e7a', '#5e5450', '#aea29c']],
      stoneShadow: 'rgba(14,12,24,0.38)', stoneHi: 'rgba(240,244,255,0.4)', stoneCover: 'rgba(40,38,56,0.3)', stoneMoss: 'rgba(242,246,255,0.85)',
      veins: 'rgba(190,228,255,', root: '#4e4040', rootHi: 'rgba(200,190,200,0.35)',
      rim: 'rgba(236,244,255,', rim2: 'rgba(190,222,255,', bounce: 'rgba(150,190,255,', under: 'rgba(14,16,40,',
      ao: 'rgba(40,50,96,', deep: 'rgba(10,10,24,',
      grass: ['#6e6048', '#8e7c5a', '#b09c72', '#cbb88c'],
      berry: '#d42f2c', leafG: ['#2e4e3e', '#3f6a50'],
      icicle: ['rgba(226,244,255,0.92)', 'rgba(150,196,236,0.75)', 'rgba(255,255,255,0.95)'],
      props: { grass: 1, berry: 1, pebble: 1, twig: 1, sparkle: 1 },
      hang: 'none',
    }),
    shrine: Object.assign({}, SNOWCAP, {
      fam: 'snow', shape: 'masonry', groundKind: 'masonry',
      cap: ['#ffffff', '#fbf4f8', '#e8dae6', '#c6b2cc'], capSoft: 'rgba(250,240,248,0.55)', capEdge: 'rgba(110,80,120,0.4)',
      soil: ['#8e8496', '#766c80', '#5c5268', '#3e364a'],
      soilLight: 'rgba(230,220,240,', soilDark: 'rgba(24,16,32,',
      blotch: ['rgba(150,136,160,', 'rgba(40,30,50,', 'rgba(130,140,130,'],
      speck: ['rgba(236,226,244,0.2)', 'rgba(20,12,26,0.26)', 'rgba(160,150,170,0.24)', 'rgba(140,160,130,0.14)'],
      stone: [['#8e8898', '#625c6e', '#b8b0c2'], ['#7a7286', '#524a5e', '#a69eb2'], ['#86807c', '#5c5652', '#ada6a0']],
      stoneShadow: 'rgba(20,12,26,0.38)', stoneHi: 'rgba(248,240,255,0.38)', stoneCover: 'rgba(44,34,56,0.3)', stoneMoss: 'rgba(250,246,252,0.85)',
      block: ['#9a90a2', '#8a8094', '#7e7488', '#948a8a'], joint: 'rgba(30,20,38,', jointHi: 'rgba(240,230,246,', lichen: ['rgba(176,190,150,0.4)', 'rgba(210,206,186,0.35)', 'rgba(140,160,128,0.3)'],
      veins: 'rgba(230,220,255,', root: '#4a3a44', rootHi: 'rgba(200,180,200,0.35)',
      rim: 'rgba(255,232,216,', rim2: 'rgba(255,200,170,', bounce: 'rgba(200,160,220,', under: 'rgba(24,14,34,',
      ao: 'rgba(60,36,70,', deep: 'rgba(16,10,22,',
      grass: ['#4e6a3e', '#6a8a4c', '#8aa860', '#a8c078'],
      berry: '#d8302a', leafG: ['#2e4a36', '#3e6448'],
      icicle: ['rgba(240,236,255,0.92)', 'rgba(170,176,226,0.72)', 'rgba(255,255,255,0.95)'],
      props: { camellia: 1, lantern: 1, shide: 1, bamboo: 1, pebble: 1, sparkle: 1 },
      hang: 'keep',
    }),
    ice: Object.assign({}, SNOWCAP, {
      fam: 'snow', shape: 'ice', groundKind: 'ice',
      cap: ['#ffffff', '#eef8ff', '#cfe6f8', '#9ec4e6'], capSoft: 'rgba(230,246,255,0.5)', capEdge: 'rgba(60,110,170,0.42)',
      ice: ICE, iceHi: 'rgba(255,255,255,', iceDark: 'rgba(20,50,100,',
      soil: ['#58637e', '#454e68', '#343a52', '#20243a'],
      soilLight: 'rgba(180,210,250,', soilDark: 'rgba(8,12,30,',
      blotch: ['rgba(110,140,190,', 'rgba(20,26,50,', 'rgba(90,110,150,'],
      speck: ['rgba(220,240,255,0.22)', 'rgba(8,14,34,0.26)', 'rgba(130,160,210,0.24)', 'rgba(200,230,255,0.14)'],
      stone: [['#6e7894', '#4a5270', '#98a4c0'], ['#5e6680', '#3e4460', '#8890ac'], ['#72809a', '#4e5a74', '#a0aec6']],
      stoneShadow: 'rgba(8,12,30,0.4)', stoneHi: 'rgba(220,240,255,0.42)', stoneCover: 'rgba(30,40,70,0.3)', stoneMoss: 'rgba(230,246,255,0.85)',
      veins: 'rgba(170,230,255,',
      rim: 'rgba(230,248,255,', rim2: 'rgba(150,230,255,', bounce: 'rgba(120,210,255,', under: 'rgba(8,20,50,',
      ao: 'rgba(30,70,130,', deep: 'rgba(6,10,26,',
      icicle: ['rgba(220,246,255,0.9)', 'rgba(110,180,230,0.7)', 'rgba(255,255,255,0.95)'],
      props: { crystal: 1, shard: 1, sparkle: 1.4 },
      hang: 'none',
    }),
    frost: null, // 下面由 ice 衍生
    temple: {
      fam: 'temple', shape: 'slab', groundKind: 'temple',
      marble: ['#f7f1e5', '#e6dccb', '#d0c3ab', '#b3a486'],
      plate: ['#fffdf7', '#f2eadc', '#d9cdb6'],
      vein: 'rgba(146,128,106,', gvein: 'rgba(226,176,74,',
      gold: ['#fff1b8', '#e8b84a', '#a8782a'],
      light: '255,226,158', light2: '176,214,255',
      speck: ['rgba(255,252,240,0.3)', 'rgba(120,100,80,0.14)', 'rgba(210,190,150,0.18)'],
      joint: 'rgba(110,90,66,', jointHi: 'rgba(255,255,250,',
      rim: 'rgba(255,248,226,', rim2: 'rgba(255,220,150,', under: 'rgba(60,40,90,',
      ao: 'rgba(90,70,50,', deep: 'rgba(40,30,60,',
      shardC: ['#fbf6ea', '#d8ccb4', '#e8b84a'],
      props: { leafGold: 1, chip: 1, hand: 1, mote: 1 },
      hang: 'none',
    },
  };
  MAT.frost = Object.assign({}, MAT.ice, {
    groundKind: 'altar',
    block: ['#7290ba', '#6682ae', '#5c78a4', '#6c86aa'], joint: 'rgba(14,24,50,', jointHi: 'rgba(220,236,255,',
    lichen: ['rgba(230,244,255,0.35)', 'rgba(200,226,255,0.3)', 'rgba(255,255,255,0.3)'],
    altar: ['#7a98c2', '#6080ac', '#4a6690', '#2e4468'],
    rune: 'rgba(170,226,255,',
    props: { crystal: 0.6, shard: 0.6, sparkle: 1 },
  });
  MAT.garden = Object.assign({}, MAT.temple, {
    marble: ['#f6f7ef', '#e4e5d8', '#cccebd', '#aeb29c'],
    plate: ['#fdfffa', '#eef0e4', '#d4d8c6'],
    grass: ['#3f7a34', '#5a9a44', '#7cbc5c', '#a6d884'],
    flower: ['#ffd0e0', '#ffffff', '#ffb0cc', '#fff2b0'],
    gold: ['#fff1b8', '#e8b84a', '#a8782a'],
    light: '255,236,190', light2: '255,190,220',
    props: { grass: 1, flower: 1, petal: 1, mote: 0.6 },
  });
  MAT.star = Object.assign({}, MAT.temple, {
    marble: ['#7a78bc', '#5c5996', '#434078', '#28264e'],
    plate: ['#eef0ff', '#c4c8ee', '#8e92cc'],
    vein: 'rgba(190,200,255,', gvein: 'rgba(154,224,255,',
    gold: ['#effcff', '#9ae0ff', '#4a88bc'],
    light: '150,214,255', light2: '214,180,255',
    speck: ['rgba(230,240,255,0.5)', 'rgba(10,8,30,0.2)', 'rgba(170,190,255,0.3)'],
    joint: 'rgba(14,12,40,', jointHi: 'rgba(210,220,255,',
    rim: 'rgba(230,240,255,', rim2: 'rgba(150,220,255,', under: 'rgba(40,60,140,', ao: 'rgba(20,16,50,', deep: 'rgba(6,4,20,',
    shardC: ['#dfe4ff', '#7a7cc0', '#9ae0ff'],
    props: { dust: 1, crystal: 1, mote: 1.2 },
  });
  MAT.throne = Object.assign({}, MAT.temple, {
    marble: ['#6e6488', '#554c70', '#3f3858', '#27213a'],
    plate: ['#e6e0f4', '#c4bad8', '#968cb0'],
    vein: 'rgba(200,184,240,', gvein: 'rgba(232,184,74,',
    light: '255,212,140', light2: '190,160,255',
    speck: ['rgba(230,220,255,0.35)', 'rgba(10,6,20,0.2)', 'rgba(190,170,230,0.26)'],
    joint: 'rgba(12,8,24,', jointHi: 'rgba(220,210,255,',
    rim: 'rgba(246,238,255,', rim2: 'rgba(255,214,150,', under: 'rgba(60,40,120,', ao: 'rgba(16,10,30,', deep: 'rgba(8,4,16,',
    shardC: ['#e6e0f4', '#6e6488', '#e8b84a'],
    props: { dust: 1, mote: 0.8 },
  });
  // 地圖（主題）特有的調整：營地的夕陽暖光、鈴繩／藤蔓等
  const THEME_TWEAK = {
    snowCamp: { rim: 'rgba(255,236,218,', rim2: 'rgba(255,206,170,', campProps: 0.25 },
    snowField: {},
    templeCourt: { campProps: 0.3 },
  };
  const ROPE_KIND = { bellrope: 'bellrope', rope: 'hemp', chain: 'icechain', goldchain: 'thread', vine: 'flowervine' };
  function matFor(map) {
    const base = MAT[map.refinedGround];
    if (!base) return null;
    const tw = THEME_TWEAK[map.theme];
    if (!tw) return base;
    const k = '_tw_' + map.theme;
    if (!base[k]) base[k] = Object.assign({}, base, tw);
    return base[k];
  }

  // ════════════════════════════════════════════════════════════
  // 地圖準備：每個平台的細節一次算好
  // ════════════════════════════════════════════════════════════
  const MAXD = 70; // 浮空平台底下能畫的深度（快取塊往下 76px）
  function table(L, R, f) {
    const off = L - 14;
    const tb = new Float32Array(Math.ceil(R - L) + 30);
    for (let k = 0; k < tb.length; k++) tb[k] = f(off + k);
    const last = tb.length - 1;
    return (x) => {
      const k = Math.round(x - off);
      return tb[k < 0 ? 0 : k > last ? last : k];
    };
  }
  function buildGround(map) {
    const M = matFor(map);
    if (!M) return;
    map._g45 = map.platforms.map((p, i) => buildPlat(map, M, p, i));
  }
  function buildPlat(map, M, p, i) {
    const L = p[0];
    const R = p[1];
    const y = p[2];
    const w = R - L;
    const isGround = i === 0;
    const rnd = U.seeded(i * 7919 + L * 5 + y * 3 + 17);
    const seed = rnd() * 100;
    const ropes = map.ropes || [];
    const low = lowFx();
    const D = { seed, isGround, L, R, y, blotches: [], strata: [], stones: [], veins: [], roots: [], blocks: [], fractures: [], bubbles: [], streaks: [], icicles: [], drips: [], crumbs: [], shards: [], currents: [], props: [], tongues: [], spikes: [], motes: [], cracks: [] };
    const nearRope = (x, d) => ropes.some((r) => Math.abs(r[0] - x) < (d || 16) && (Math.abs(r[1] - y) < 12 || Math.abs(r[2] - y) < 12));
    const portalNear = (x, d) => (map.portals || []).some((q) => q.p === i && Math.abs(q.x - x) < d);
    const camp = map.camp && isGround ? map.camp : null;
    const inCamp = (x) => camp && x > camp.x1 - 60 && x < camp.x2 + 60;
    const arena = map.type === 'boss' && isGround;
    const dens = (k) => (M.props[k] || 0) * (low ? 0.5 : 1);

    // ── 浮空平台的輪廓（厚度表） ──
    if (!isGround) {
      const edge = (x) => Math.min(x - L, R - x);
      if (M.shape === 'rock') {
        const bulges = [];
        for (let x = L + 50 + rnd() * 80; x < R - 50; x += 140 + rnd() * 200) bulges.push({ x, r: 22 + rnd() * 30, d: 6 + rnd() * 9 });
        D.depth = table(L, R, (x) => {
          let d = 30 + 12 * fbm(x * 0.012, seed) + 5 * fbm(x * 0.07, seed + 9);
          for (const b of bulges) {
            const u = (x - b.x) / b.r;
            if (u > -1.6 && u < 1.6) d += b.d * Math.exp(-u * u * 1.6);
          }
          const e = clamp(edge(x) / 42, 0, 1);
          return 12 + (d - 12) * Math.pow(e, 0.6);
        });
      } else if (M.shape === 'masonry') {
        // 切石：上層一整排、下層往內縮一點的一排、中間偶爾再多一塊（像石垣）
        const b2 = [];
        for (let x = L + 9; x < R - 9; ) {
          const bw = Math.min(R - 9 - x, 34 + rnd() * 40);
          b2.push({ x0: x, x1: x + bw, d: 30 + rnd() * 5 });
          x += bw;
        }
        const b3 = [];
        for (let x = L + 40 + rnd() * 60; x < R - 60; x += 90 + rnd() * 160) {
          const bw = 30 + rnd() * 34;
          if (x + bw < R - 30) b3.push({ x0: x, x1: x + bw, d: 40 + rnd() * 6 });
        }
        D.b2 = b2;
        D.b3 = b3;
        D.depth = table(L, R, (x) => {
          const e = edge(x);
          if (e < 9) return 17 + (e > 4 ? 1 : 0);
          let d = 30;
          for (const b of b2) if (x >= b.x0 && x < b.x1) d = b.d;
          for (const b of b3) if (x >= b.x0 && x < b.x1) d = Math.max(d, b.d);
          return d;
        });
      } else if (M.shape === 'ice') {
        // 冰晶：底下一根根往下尖的晶柱
        for (let x = L + 14 + rnd() * 16; x < R - 14; x += 16 + rnd() * 30) {
          const e = edge(x);
          const k = clamp(e / 70, 0.25, 1);
          D.spikes.push({ x, hw: 6 + rnd() * 10, h: (8 + Math.pow(rnd(), 1.4) * 26) * k, tone: rnd() });
        }
        D.depth = table(L, R, (x) => {
          let d = 20 + 7 * fbm(x * 0.02, seed);
          let sp = 0;
          for (const s of D.spikes) {
            const u = Math.abs(x - s.x) / s.hw;
            if (u < 1) sp = Math.max(sp, s.h * (1 - u));
          }
          d += sp;
          const e = clamp(edge(x) / 16, 0, 1);
          return Math.min(MAXD - 12, 12 + (d - 12) * e);
        });
      } else {
        // 神殿的浮空基座：上面一塊厚板、下面兩層往內收的台階、中段再往下收成一道稜
        D.depth = table(L, R, (x) => {
          const e = edge(x);
          if (e < 6) return 12;
          if (e < 16) return 20;
          if (e < 28) return 28;
          return 28 + 16 * clamp((e - 28) / 90, 0, 1);
        });
      }
    }
    const depthAt = D.depth || (() => 0);

    // ── 大片色塊、地層 ──
    for (let x = L - 20; x < R + 20; x += (isGround ? 80 : 60) * (0.6 + rnd() * 0.8)) {
      const rows = isGround ? 3 : 1;
      for (let k = 0; k < rows; k++) {
        const dd = isGround ? 24 + k * 60 + rnd() * 40 : 8 + rnd() * 16;
        D.blotches.push({ x, y: y + dd, r: (isGround ? 44 : 18) + rnd() * (isGround ? 50 : 18), c: Math.floor(rnd() * 3), a: 0.14 + rnd() * 0.2 });
      }
    }
    const bands = isGround ? [[18, 3, 'l'], [36, 8, 'd'], [60, 3, 'l'], [88, 12, 'd'], [120, 4, 'l'], [152, 14, 'd'], [204, 5, 'l'], [246, 18, 'd'], [306, 6, 'l'], [380, 20, 'd']] : [[12, 2.5, 'l'], [20, 5, 'd']];
    for (const [d, h, k] of bands) D.strata.push({ d, h, k, ph: rnd() * 10, amp: isGround ? 4 + rnd() * 4 : 1.5 + rnd() * 2 });

    // ── 嵌石（岩層、冰下的岩層、石垣下的碎石層） ──
    if (M.fam === 'snow') {
      const rockTop = isGround ? (M.groundKind === 'rock' ? 16 : M.groundKind === 'ice' ? 56 : 84) : 10;
      const sStep = isGround ? 50 : 46;
      for (let x = L + 8; x < R - 8; x += sStep * (0.5 + rnd() * 1.1)) {
        let sy;
        let r;
        if (isGround) {
          const d = rockTop + Math.pow(rnd(), 1.3) * 260;
          sy = y + d;
          r = 2.5 + rnd() * (d > 70 ? 11 : 5);
        } else {
          if (M.shape !== 'rock') continue;
          const dep = depthAt(x);
          const e2 = rnd() < 0.2;
          sy = y + (e2 ? dep - 3 - rnd() * 3 : 10 + rnd() * Math.max(2, dep - 16));
          r = e2 ? 3 + rnd() * 3.5 : 1.8 + rnd() * 3.4;
        }
        const j = [];
        for (let k = 0; k < 8; k++) j.push(0.78 + rnd() * 0.34);
        D.stones.push({ x, y: sy, rx: r * (1.1 + rnd() * 0.6), ry: r * (0.62 + rnd() * 0.3), rot: (rnd() - 0.5) * 0.7, v: Math.floor(rnd() * 3), moss: rnd() < 0.45, j });
      }
      if (isGround || M.shape === 'rock') {
        for (let x = L + 4; x < R - 4; x += 10 + rnd() * 16) {
          const dep = isGround ? rockTop - 4 + rnd() * 250 : 7 + rnd() * Math.max(3, depthAt(x) - 10);
          D.stones.push({ x, y: y + dep, rx: 0.9 + rnd() * 1.6, ry: 0.7 + rnd() * 1, rot: 0, v: Math.floor(rnd() * 3), tiny: true });
        }
      }
      // 冰脈：沿著岩層的細細淡藍色線，偶爾有一顆冰透鏡
      if (isGround || M.shape === 'rock') {
        for (let x = L + 30 + rnd() * 80; x < R - 30; x += (isGround ? 130 : 110) * (0.6 + rnd() * 0.9)) {
          const d0 = isGround ? rockTop + 10 + rnd() * 200 : 9 + rnd() * 10;
          const len = 30 + rnd() * (isGround ? 90 : 50);
          const pts = [];
          for (let k = 0; k <= 6; k++) pts.push(x + (len * k) / 6, y + d0 + Math.sin(k * 1.3 + seed) * 2.2 + (rnd() - 0.5) * 2);
          D.veins.push({ pts, w: 0.7 + rnd() * 1.1, lens: rnd() < 0.4 ? { u: 0.3 + rnd() * 0.4, rx: 4 + rnd() * 6, ry: 1.6 + rnd() * 2 } : null });
        }
      }
      // 凍住的細根（只有雪原、村子的地面才有；石垣、冰層沒有）
      if (isGround && M.groundKind === 'rock') {
        for (let x = L + 40 + rnd() * 80; x < R - 20; x += 230 * (0.6 + rnd() * 0.9)) {
          const pts = [];
          let px = x;
          let py = y + 8;
          let ang = Math.PI / 2 + (rnd() - 0.5) * 1.2;
          const n = 7;
          const st = (40 + rnd() * 70) / n;
          for (let k = 0; k <= n; k++) {
            pts.push(px, py);
            ang += (rnd() - 0.5) * 0.8;
            ang += (Math.PI / 2 - ang) * 0.12;
            px += Math.cos(ang) * st;
            py += Math.max(1, Math.sin(ang) * st * 0.8);
          }
          D.roots.push({ pts, w: 1.6 + rnd() * 2.2 });
        }
      }
    }

    // ── 切石（神社石垣、祭壇石板）：地面上幾排大石塊，浮空平台的上層一排 ──
    if ((M.groundKind === 'masonry' || M.groundKind === 'altar') && (isGround || M.shape === 'masonry')) {
      const rows = isGround ? (M.groundKind === 'altar' ? [[2, 22], [44, 24], [68, 24]] : [[6, 22], [28, 26], [54, 30]]) : [[3, 13], [16, 14], [30, 14]];
      for (const [r0, rh] of rows) {
        let x = L - rnd() * 40;
        while (x < R) {
          const bw = (isGround ? 60 : 34) + rnd() * (isGround ? 70 : 38);
          D.blocks.push({ x0: x, x1: Math.min(R, x + bw), y0: y + r0, y1: y + r0 + rh, tone: Math.floor(rnd() * 4), a: rnd(), chip: rnd() < 0.35 ? (rnd() < 0.5 ? -1 : 1) : 0, lich: rnd() < 0.4 ? rnd() : -1 });
          x += bw;
        }
      }
    }

    // ── 冰：內部的裂紋、氣泡、斜斜的光帶 ──
    if (M.fam === 'snow' && (M.shape === 'ice' || M.groundKind === 'ice')) {
      const top = isGround ? 8 : 4;
      const bot = isGround ? 60 : 30;
      for (let x = L + 10 + rnd() * 30; x < R - 10; x += 40 + rnd() * 70) {
        if (!isGround && M.shape !== 'ice') break;
        if (isGround && M.groundKind !== 'ice') break;
        const pts = [];
        let px = x;
        let py = y + top + rnd() * 10;
        const n = 3 + Math.floor(rnd() * 3);
        for (let k = 0; k <= n; k++) {
          pts.push(px, py);
          px += (rnd() - 0.5) * 16;
          py += 4 + rnd() * 9;
          if (py > y + bot + 10) break;
        }
        D.fractures.push({ pts, a: 0.3 + rnd() * 0.4 });
      }
      for (let x = L + 6; x < R - 6; x += 7 + rnd() * 20) D.bubbles.push({ x, y: y + top + 2 + rnd() * (bot - top), r: 0.6 + rnd() * 1.4 });
      for (let x = L + rnd() * 60; x < R; x += 60 + rnd() * 110) D.streaks.push({ x, w: 6 + rnd() * 14, a: 0.08 + rnd() * 0.12 });
    }

    // ── 大理石：紋理（灰紋、金紋）、光流、底下的漂浮碎片 ──
    if (M.fam === 'temple') {
      const vStep = isGround ? 90 : 70;
      for (let x = L - 20 + rnd() * 40; x < R; x += vStep * (0.6 + rnd() * 0.9)) {
        const gold = rnd() < 0.3;
        const d0 = isGround ? 12 + rnd() * 160 : 6 + rnd() * 14;
        const pts = [];
        let px = x;
        let py = y + d0;
        const ang0 = (rnd() - 0.5) * 1.2 + (rnd() < 0.5 ? 0.3 : -0.3);
        let ang = ang0;
        for (let k = 0; k < 7; k++) {
          pts.push(px, py);
          ang += (rnd() - 0.5) * 0.9;
          px += Math.cos(ang) * (8 + rnd() * 12);
          py += Math.sin(ang) * (5 + rnd() * 8) * 0.6;
        }
        D.veins.push({ pts, w: gold ? 0.9 + rnd() * 0.6 : 0.5 + rnd() * 1.1, gold, a: 0.25 + rnd() * 0.35 });
      }
      // 光流：沿著石面／底面流過去的一條細細的光（兩色交錯）
      const nCur = isGround ? Math.max(1, Math.round(w / 700)) : 1;
      for (let k = 0; k < nCur; k++) {
        const cx0 = L + rnd() * w * 0.4;
        const cl = Math.min(R - cx0, (isGround ? 300 : 160) + rnd() * (isGround ? 500 : w * 0.8));
        D.currents.push({ x0: cx0, x1: cx0 + cl, d: isGround ? 40 + rnd() * 120 : 0, amp: 2 + rnd() * 4, fr: 0.008 + rnd() * 0.01, ph: rnd() * 6, c: rnd() < 0.6 ? 0 : 1, under: !isGround });
      }
      // 漂浮碎片（浮空基座底下）、或地面石面前方的小碎片
      if (!isGround) {
        for (let x = L + 16 + rnd() * 30; x < R - 16; x += 36 + rnd() * 70) {
          const dep = depthAt(x);
          const room = MAXD - dep - 6;
          if (room < 8) continue;
          const r = 2.6 + Math.pow(rnd(), 1.5) * 6;
          const pts = [];
          const n = 4 + Math.floor(rnd() * 2);
          for (let k = 0; k < n; k++) {
            const an = (k / n) * PI2 + rnd() * 0.6;
            const rr = r * (0.6 + rnd() * 0.5);
            pts.push(Math.cos(an) * rr, Math.sin(an) * rr * (1.1 + rnd() * 0.4));
          }
          D.shards.push({ x: x + (rnd() - 0.5) * 10, y: y + dep + 5 + rnd() * Math.min(room - r, 30), pts, rot: rnd() * PI2, gold: rnd() < 0.3, glow: rnd() < 0.5, k: rnd() });
        }
        // 基座底下滴下來的光絲（時間往下流）
        for (let x = L + 30 + rnd() * 40; x < R - 30; x += 60 + rnd() * 100) D.drips.push({ x, len: 8 + Math.pow(rnd(), 1.4) * 26, a: 0.3 + rnd() * 0.4, c: rnd() < 0.7 ? 0 : 1 });
      }
      // 石塊接縫（浮空基座的側面；地面在畫的時候照固定規則切）
      if (!isGround) {
        for (let x = L + 20 + rnd() * 40; x < R - 20; x += 56 + rnd() * 70) D.cracks.push({ x, j: rnd() });
      }
    }

    // ── 底面：冰柱、垂雪、碎石 ──
    if (M.fam === 'snow' && !isGround) {
      for (let x = L + 8; x < R - 8; x += 7 + rnd() * 16) {
        const dep = depthAt(x);
        const room = MAXD - dep;
        if (room < 6) continue;
        const r = rnd();
        if (r < 0.45) D.icicles.push({ x, y: y + dep - 2, len: Math.min(room - 2, 5 + Math.pow(rnd(), 1.8) * (M.shape === 'ice' ? 40 : 30)), w: 2 + rnd() * 3.2, k: rnd(), lean: (rnd() - 0.5) * 2 });
        else if (r < 0.62 && M.shape !== 'ice') D.drips.push({ x, y: y + dep - 3, len: 3 + rnd() * 7, w: 3 + rnd() * 5 });
        else if (r < 0.74) D.crumbs.push({ x, y: y + dep + 1 + rnd() * 3, r: 1 + rnd() * 2.2, v: rnd() });
      }
    }
    if (M.fam === 'snow' && isGround && M.groundKind === 'altar') {
      // 祭壇地面：石板前緣的簷下掛一排小冰柱（在石面上，畫在簷的陰影裡）
      for (let x = L + 6; x < R - 6; x += 9 + rnd() * 22) D.icicles.push({ x, y: y + 43, len: 4 + Math.pow(rnd(), 1.6) * 16, w: 1.8 + rnd() * 2.4, k: rnd(), lean: 0 });
    }

    // ── 雪蓋垂下來的舌狀邊（厚薄起伏） ──
    for (let x = L + 12 + rnd() * 40; x < R - 10; x += 30 + rnd() * 70) D.tongues.push({ x, r: 7 + rnd() * 18, d: 2 + rnd() * (isGround ? 10 : 8) });
    if (M.fam === 'snow') {
      const t0 = M.shape === 'ice' && !isGround ? 6 : M.groundKind === 'altar' && isGround ? 4.5 : isGround ? 10 : 8.5;
      const vary = M.groundKind === 'altar' && isGround ? 1.5 : 3;
      D.capT = t0;
      D.capRaw = (x) => {
        let d = t0 + vary * fbm(x * 0.045, seed + 3);
        for (const t of D.tongues) {
          const u = (x - t.x) / t.r;
          if (u > -1.5 && u < 1.5) d += t.d * Math.exp(-u * u * 2);
        }
        if (!isGround) {
          const e = Math.min(x - L, R - x);
          if (e < 16) d += (16 - e) * 0.5;
        }
        return d;
      };
      D.cap = table(L, R, (x) => D.capRaw(clamp(x, L, R)));
    }

    // ── 頂面擺設 ──
    const P = D.props;
    const campK = inCamp;
    const skip = (x, d) => nearRope(x, d) || portalNear(x, 40) || (campK(x) && rnd() > (M.campProps || 0.3));
    // 王座／祭壇的 Boss 房：站立面的中段保持乾淨（地面的攻擊預警畫在這一帶），擺設只放在石面、兩端與浮空平台
    const clearTop = (x) => arena && x > L + 260 && x < R - 260;
    const addProps = (kind, step, fn) => {
      const d = dens(kind);
      if (!d) return;
      const st = step / d;
      for (let x = L + 8 + rnd() * st; x < R - 8; x += st * (0.5 + rnd())) {
        if (skip(x, 14) || clearTop(x)) continue;
        const o = fn(x);
        if (o) {
          o.kind = kind;
          o.x = o.x === undefined ? x : o.x;
          o.k = rnd();
          P.push(o);
        }
      }
    };
    addProps('grass', 18, () => {
      const n = 3 + Math.floor(rnd() * 5);
      const bl = [];
      for (let k = 0; k < n; k++) {
        const h = 3 + Math.pow(rnd(), 1.4) * 11;
        bl.push({ dx: (rnd() - 0.5) * 8, h, lean: (rnd() - 0.5) * h * 0.8, w: 0.8 + rnd() * 1, tone: Math.floor(rnd() * 4) });
      }
      return { bl };
    });
    addProps('berry', 170, () => ({ n: 2 + Math.floor(rnd() * 3), s: 0.8 + rnd() * 0.4, fl: rnd() < 0.5 ? -1 : 1 }));
    addProps('twig', 140, () => ({ len: 8 + rnd() * 10, a: -0.3 - rnd() * 0.9, fl: rnd() < 0.5 ? -1 : 1 }));
    addProps('pebble', 90, () => ({ rx: 2.2 + rnd() * 3.5, ry: 1.4 + rnd() * 1.6 }));
    addProps('sparkle', 38, () => ({ dx: (rnd() - 0.5) * 4, dy: -1 - rnd() * 2, s: 1 + rnd() * 1.6 }));
    addProps('camellia', 120, () => ({ s: 0.8 + rnd() * 0.5, rot: rnd() * PI2 }));
    addProps('bamboo', 110, () => ({ n: 2 + Math.floor(rnd() * 3), s: 0.8 + rnd() * 0.5 }));
    addProps('shide', 420, () => (isGround ? null : { s: 0.9 + rnd() * 0.3 }));
    addProps('lantern', 520, (x) => (isGround && x > L + 120 && x < R - 120 && !campK(x) ? { s: 0.9 + rnd() * 0.2 } : null));
    addProps('crystal', 120, () => {
      const n = 2 + Math.floor(rnd() * 3);
      const c = [];
      for (let k = 0; k < n; k++) c.push({ dx: (rnd() - 0.5) * 8, h: 4 + rnd() * 9, a: (rnd() - 0.5) * 0.9, w: 1.4 + rnd() * 1.6 });
      return { c };
    });
    addProps('shard', 130, () => ({ r: 1.6 + rnd() * 2.4, rot: rnd() * PI2 }));
    addProps('leafGold', 60, () => ({ r: 1.8 + rnd() * 1.8, rot: (rnd() - 0.5) * 1.2 }));
    addProps('chip', 110, () => ({ r: 1.4 + rnd() * 2.2, rot: rnd() * PI2 }));
    addProps('hand', 520, () => ({ len: 8 + rnd() * 8, rot: (rnd() - 0.5) * 0.3 }));
    addProps('flower', 70, () => ({ h: 4 + rnd() * 7, c: Math.floor(rnd() * 4), s: 1.1 + rnd() * 0.8 }));
    addProps('petal', 60, () => ({ dy: 2 + rnd() * 26, rot: rnd() * PI2, s: 1 + rnd() * 0.8 }));
    addProps('dust', 44, () => ({ dx: (rnd() - 0.5) * 6, s: 0.8 + rnd() * 1.2 }));
    addProps('mote', 230, () => ({ dy: 14 + rnd() * 30, r: 1 + rnd() * 1.2, c: rnd() < 0.7 ? 0 : 1 }));
    // 花園的地面與浮空平台還有一層薄草皮
    if (M.grass) {
      D.turf = [];
      for (let x = L + 3; x < R - 3; x += 10 + rnd() * 18) {
        if (nearRope(x, 10) && rnd() < 0.7) continue;
        const n = 2 + Math.floor(rnd() * 4);
        const bl = [];
        for (let k = 0; k < n; k++) bl.push({ dx: (rnd() - 0.5) * 7, h: 2.5 + rnd() * 6, lean: (rnd() - 0.5) * 4, w: 0.8 + rnd() * 0.8, tone: Math.floor(rnd() * 4) });
        D.turf.push({ x, bl });
      }
      // 倒過來開的花：從基座底面往下長
      if (!isGround) for (let x = L + 20 + rnd() * 30; x < R - 20; x += 50 + rnd() * 80) D.icicles.push({ x, y: y + depthAt(x) - 1, len: 6 + rnd() * Math.min(26, MAXD - depthAt(x) - 8), w: 1, k: rnd(), flower: Math.floor(rnd() * 4), lean: (rnd() - 0.5) * 6 });
    }
    return D;
  }

  // ── 小貼圖：岩／石的顆粒、雪的閃光點、大理石的細點 ──
  function specTex(ctx, map, M, kind) {
    const key = map.refinedGround + ':' + kind;
    let c;
    if (kind === 'speck') c = sprite(key, 256, 256, map, (g, w, h) => specks(g, w, h, M.speck, M.fam === 'temple' ? 240 : 330, 4242, M.fam === 'temple' ? 1.4 : 2.2));
    else
      c = sprite(key, 256, 28, map, (g, w, h) => {
        const r = U.seeded(909);
        const cols = M.capDot || ['rgba(255,255,255,0.8)', 'rgba(150,170,215,0.3)', 'rgba(200,226,255,0.6)'];
        for (let cI = 0; cI < 3; cI++) {
          g.fillStyle = cols[cI];
          g.beginPath();
          for (let k = 0; k < 110; k++) {
            const x = r() * w;
            const yy = cI === 1 ? 5 + r() * 20 : 1 + r() * 8;
            const sz = 0.4 + r() * (cI === 1 ? 1.6 : 0.9);
            for (const ox of [0, -w]) {
              g.moveTo(x + ox + sz, yy);
              g.ellipse(x + ox, yy, sz, sz * 0.7, 0, 0, PI2);
            }
          }
          g.fill();
        }
      });
    return pattern(ctx, c);
  }

  // ════════════════════════════════════════════════════════════
  // 繪製：一次畫一個平台（快取塊裡只有這一個平台）
  // ════════════════════════════════════════════════════════════
  function drawGround(ctx, map, i, x0, x1) {
    if (!map._g45) buildGround(map);
    const M = matFor(map);
    const D = map._g45[i];
    if (!M || !D) return;
    const p = map.platforms[i];
    const L = p[0];
    const R = p[1];
    const y = p[2];
    const isGround = i === 0;
    const lvl = map._aged || 0;
    const a = Math.max(L - 20, x0 - 40);
    const b = Math.min(R + 20, x1 + 40);
    const E = {
      ctx, map, M, D, L, R, y, isGround, lvl, a, b,
      keep: 1 - 0.85 * lvl,
      low: lowFx(),
      vis: (x, pad) => x > a - (pad || 0) && x < b + (pad || 0),
      bottomY: isGround ? map.h + 120 : 0,
      depth: D.depth || (() => 0),
    };
    if (M.fam === 'snow') drawSnowPlat(E);
    else drawTemplePlat(E);
  }

  // 本體輪廓（浮空平台：頂邊 → 右端 → 底面（照厚度表）→ 左端）
  function bodyPath(E, ov, rounded) {
    const { ctx, L, R, y, isGround, depth } = E;
    ctx.beginPath();
    if (isGround) {
      ctx.rect(L, y + 1, R - L, E.bottomY - y);
      return;
    }
    ctx.moveTo(L - ov, y + 1);
    ctx.lineTo(R + ov, y + 1);
    if (rounded) {
      ctx.quadraticCurveTo(R + ov + 1, y + 3, R + ov, y + 9);
      ctx.quadraticCurveTo(R + 2, y + depth(R - 4), R - 5, y + depth(R - 5));
    } else {
      ctx.lineTo(R + ov, y + 3);
      ctx.lineTo(R, y + depth(R));
    }
    const st = E.M.shape === 'rock' ? 6 : 2;
    const jit = E.M.shape === 'rock' ? 2.2 : E.M.shape === 'masonry' ? 0.8 : 0;
    for (let x = Math.floor((R - 5) / st) * st; x > L + 5; x -= st) ctx.lineTo(x, y + depth(x) + (jit ? (hash(x * 0.37 + E.D.seed) - 0.5) * jit : 0));
    if (rounded) {
      ctx.lineTo(L + 5, y + depth(L + 5));
      ctx.quadraticCurveTo(L - 2, y + depth(L + 4), L - ov, y + 9);
      ctx.quadraticCurveTo(L - ov - 1, y + 3, L - ov, y + 1);
    } else {
      ctx.lineTo(L, y + depth(L));
      ctx.lineTo(L - ov, y + 3);
    }
    ctx.closePath();
  }
  function blotchPass(E, pre) {
    const { ctx, D, M } = E;
    if (E.low) return; // 省效能模式：大片的柔和色塊（徑向漸層）不畫
    for (const o of D.blotches) {
      if (!E.vis(o.x, o.r)) continue;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, (pre || M.blotch)[o.c] + o.a.toFixed(2) + ')');
      g.addColorStop(1, (pre || M.blotch)[o.c] + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
    }
  }
  function strataPass(E, minD) {
    const { ctx, D, M, y, a, b } = E;
    const list = minD ? D.strata.filter((s) => s.d >= minD) : D.strata;
    if (K.drawStrata) return K.drawStrata(ctx, M, list, y, a, b);
    for (const s of list) {
      const top = [];
      for (let x = Math.floor(a / 24) * 24 - 24; x <= b + 24; x += 24) top.push(x, y + s.d + Math.sin(x * 0.013 + s.ph) * s.amp + (fbm(x * 0.03, s.ph) - 0.5) * s.amp);
      ctx.fillStyle = s.k === 'd' ? M.soilDark + '0.2)' : M.soilLight + '0.2)';
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      for (let k = 2; k < top.length; k += 2) ctx.lineTo(top[k], top[k + 1]);
      for (let k = top.length - 2; k >= 0; k -= 2) ctx.lineTo(top[k], top[k + 1] + s.h * (0.5 + fbm(top[k] * 0.02, s.ph + 5)));
      ctx.closePath();
      ctx.fill();
    }
  }
  function speckPass(E, h, ox) {
    const { ctx, map, M, D, y, a, b } = E;
    const pat = specTex(ctx, map, M, 'speck');
    if (!pat) return;
    ctx.save();
    const tx = Math.round(D.seed * 7) + (ox || 0);
    ctx.translate(tx, y + Math.round(D.seed * 3));
    ctx.fillStyle = pat;
    ctx.fillRect(a - tx, 0, b - a, h);
    ctx.restore();
  }
  function stonePass(E) {
    const { ctx, D, M } = E;
    const list = E.low ? D.stones.filter((st) => !st.tiny) : D.stones;
    if (K.drawStones) return K.drawStones(ctx, M, list, E.vis);
    for (const s of list) {
      if (!E.vis(s.x, 12)) continue;
      const C = M.stone[s.v];
      ctx.fillStyle = s.tiny ? C[1] : C[0];
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.rx, s.ry, s.rot, 0, PI2);
      ctx.fill();
    }
  }
  function veinPass(E) {
    const { ctx, D, M } = E;
    if (!D.veins.length) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const v of D.veins) {
      if (!E.vis(v.pts[0], 140)) continue;
      ctx.strokeStyle = M.veins + '0.35)';
      ctx.lineWidth = v.w + 1.2;
      ctx.beginPath();
      ctx.moveTo(v.pts[0], v.pts[1]);
      for (let k = 2; k < v.pts.length; k += 2) ctx.lineTo(v.pts[k], v.pts[k + 1]);
      ctx.stroke();
      ctx.strokeStyle = M.veins + '0.7)';
      ctx.lineWidth = v.w * 0.6;
      ctx.stroke();
      if (v.lens) {
        const k = Math.round(v.lens.u * 6) * 2;
        const lx = v.pts[k];
        const ly = v.pts[k + 1];
        const g = ctx.createLinearGradient(0, ly - v.lens.ry, 0, ly + v.lens.ry);
        g.addColorStop(0, 'rgba(236,248,255,0.85)');
        g.addColorStop(1, M.veins + '0.45)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(lx, ly, v.lens.rx, v.lens.ry, 0, 0, PI2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(lx - v.lens.rx * 0.5, ly - v.lens.ry * 0.5, v.lens.rx * 0.5, 0.8);
      }
    }
  }
  function rootPass(E) {
    const { ctx, D, M } = E;
    if (!D.roots.length) return;
    ctx.fillStyle = M.root;
    ctx.beginPath();
    for (const r of D.roots) if (E.vis(r.pts[0], 120)) taperPath(ctx, r.pts, r.w * 1.2, 0.4);
    ctx.fill();
    ctx.strokeStyle = M.rootHi;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const r of D.roots) {
      if (!E.vis(r.pts[0], 120)) continue;
      ctx.moveTo(r.pts[0] - 0.4, r.pts[1]);
      for (let k = 2; k < r.pts.length - 2; k += 2) ctx.lineTo(r.pts[k] - r.w * 0.3, r.pts[k + 1]);
    }
    ctx.stroke();
    // 根上結的霜
    ctx.fillStyle = 'rgba(236,244,255,0.6)';
    ctx.beginPath();
    for (const r of D.roots) {
      if (!E.vis(r.pts[0], 120)) continue;
      for (let k = 2; k < r.pts.length; k += 4) {
        ctx.moveTo(r.pts[k] + 1.2, r.pts[k + 1] - r.w * 0.4);
        ctx.arc(r.pts[k], r.pts[k + 1] - r.w * 0.4, 1.2, 0, PI2);
      }
    }
    ctx.fill();
  }
  // 石塊（切石）：每塊略不同的色調、接縫的暗線與下緣亮線、缺角、地衣、接縫裡的積雪
  function blockPass(E, frostJoints) {
    const { ctx, D, M } = E;
    for (const bk of D.blocks) {
      if (bk.x1 < E.a - 4 || bk.x0 > E.b + 4) continue;
      const w = bk.x1 - bk.x0;
      const h = bk.y1 - bk.y0;
      ctx.fillStyle = M.block[bk.tone];
      ctx.globalAlpha = 0.35 + bk.a * 0.25;
      ctx.fillRect(bk.x0 + 1, bk.y0 + 1, w - 2, h - 2);
      ctx.globalAlpha = 1;
      // 石面的上半亮、下半暗（稍微鼓起的切石）
      const g = ctx.createLinearGradient(0, bk.y0, 0, bk.y1);
      g.addColorStop(0, M.jointHi + '0.16)');
      g.addColorStop(0.5, M.jointHi + '0)');
      g.addColorStop(1, M.joint + '0.22)');
      ctx.fillStyle = g;
      ctx.fillRect(bk.x0 + 1, bk.y0 + 1, w - 2, h - 2);
      if (bk.chip) {
        const cx = bk.chip < 0 ? bk.x0 + 1 : bk.x1 - 1;
        ctx.fillStyle = M.joint + '0.5)';
        ctx.beginPath();
        ctx.moveTo(cx, bk.y1 - 1);
        ctx.lineTo(cx - bk.chip * 7, bk.y1 - 1);
        ctx.lineTo(cx, bk.y1 - 6);
        ctx.closePath();
        ctx.fill();
      }
      if (bk.lich >= 0 && !E.low) {
        ctx.fillStyle = M.lichen[Math.floor(bk.lich * 3)];
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const lx = bk.x0 + 4 + hash(bk.x0 + k * 3.1) * (w - 8);
          const ly = bk.y0 + 2 + hash(bk.x0 * 0.7 + k) * (h - 4);
          const r = 1 + hash(bk.y0 + k) * 2.4;
          ctx.moveTo(lx + r, ly);
          ctx.ellipse(lx, ly, r, r * 0.7, 0, 0, PI2);
        }
        ctx.fill();
      }
    }
    // 接縫
    ctx.strokeStyle = M.joint + '0.6)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const bk of D.blocks) {
      if (bk.x1 < E.a - 4 || bk.x0 > E.b + 4) continue;
      ctx.moveTo(bk.x0, bk.y0);
      ctx.lineTo(bk.x0, bk.y1);
      ctx.moveTo(bk.x0, bk.y1);
      ctx.lineTo(bk.x1, bk.y1);
    }
    ctx.stroke();
    ctx.strokeStyle = M.jointHi + '0.3)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (const bk of D.blocks) {
      if (bk.x1 < E.a - 4 || bk.x0 > E.b + 4) continue;
      ctx.moveTo(bk.x0 + 1.2, bk.y0 + 1.5);
      ctx.lineTo(bk.x0 + 1.2, bk.y1 - 1);
      ctx.moveTo(bk.x0 + 1.5, bk.y1 + 1.1);
      ctx.lineTo(bk.x1 - 1, bk.y1 + 1.1);
    }
    ctx.stroke();
    if (frostJoints) {
      // 接縫裡的積雪／霜（橫縫上面一條不連續的白）
      ctx.fillStyle = 'rgba(246,250,255,0.75)';
      ctx.beginPath();
      for (const bk of D.blocks) {
        if (bk.x1 < E.a - 4 || bk.x0 > E.b + 4) continue;
        for (let x = bk.x0 + 3; x < bk.x1 - 4; x += 9) {
          const hh = hash(x * 0.37 + bk.y1);
          if (hh < 0.45) continue;
          ctx.moveTo(x, bk.y1);
          ctx.quadraticCurveTo(x + 3, bk.y1 - 1.6 * hh - 0.6, x + 6 * hh + 2, bk.y1);
        }
      }
      ctx.fill();
    }
  }
  function icePass(E) {
    // 冰體內部：斜的光帶、裂紋、氣泡
    const { ctx, D, M, y } = E;
    const H = E.isGround ? 70 : 60;
    for (const s of D.streaks) {
      if (!E.vis(s.x, 40)) continue;
      ctx.fillStyle = M.iceHi + s.a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(s.x, y);
      ctx.lineTo(s.x + s.w, y);
      ctx.lineTo(s.x + s.w - 22, y + H);
      ctx.lineTo(s.x - 22, y + H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const f of D.fractures) {
      if (!E.vis(f.pts[0], 30)) continue;
      ctx.strokeStyle = M.iceDark + (f.a * 0.5).toFixed(3) + ')';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(f.pts[0] + 0.8, f.pts[1] + 0.8);
      for (let k = 2; k < f.pts.length; k += 2) ctx.lineTo(f.pts[k] + 0.8, f.pts[k + 1] + 0.8);
      ctx.stroke();
      ctx.strokeStyle = M.iceHi + f.a.toFixed(3) + ')';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(f.pts[0], f.pts[1]);
      for (let k = 2; k < f.pts.length; k += 2) ctx.lineTo(f.pts[k], f.pts[k + 1]);
      ctx.stroke();
    }
    ctx.strokeStyle = M.iceHi + '0.45)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const bb of D.bubbles) {
      if (!E.vis(bb.x)) continue;
      ctx.moveTo(bb.x + bb.r, bb.y);
      ctx.arc(bb.x, bb.y, bb.r, 0, PI2);
    }
    ctx.stroke();
  }
  function icicleShape(ctx, c, lenK) {
    const len = c.len * lenK;
    ctx.moveTo(c.x - c.w / 2, c.y);
    ctx.quadraticCurveTo(c.x - c.w * 0.3, c.y + len * 0.5, c.x + c.lean, c.y + len);
    ctx.quadraticCurveTo(c.x + c.w * 0.25, c.y + len * 0.45, c.x + c.w / 2, c.y);
    ctx.closePath();
  }
  function iciclePass(E, list) {
    const { ctx, M, lvl } = E;
    // 解凍：冰柱變短、變少
    const lenK = 1 - 0.5 * lvl;
    const vis = list.filter((c) => E.vis(c.x, 8) && c.k < 1 - 0.55 * lvl && !c.flower && c.flower !== 0);
    if (!vis.length) return;
    ctx.fillStyle = M.icicle[1];
    ctx.beginPath();
    for (const c of vis) icicleShape(ctx, c, lenK);
    ctx.fill();
    ctx.fillStyle = M.icicle[0];
    ctx.beginPath();
    for (const c of vis) {
      const len = c.len * lenK;
      ctx.moveTo(c.x - c.w / 2, c.y);
      ctx.quadraticCurveTo(c.x - c.w * 0.3, c.y + len * 0.5, c.x + c.lean, c.y + len);
      ctx.quadraticCurveTo(c.x - c.w * 0.05, c.y + len * 0.4, c.x + c.w * 0.1, c.y);
      ctx.closePath();
    }
    ctx.fill();
    ctx.strokeStyle = M.icicle[2];
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (const c of vis) {
      if (c.len * lenK < 7) continue;
      ctx.moveTo(c.x - c.w * 0.22, c.y + 1.5);
      ctx.lineTo(c.x - c.w * 0.1 + c.lean * 0.4, c.y + c.len * lenK * 0.55);
    }
    ctx.stroke();
    // 尖端的一滴水（解凍時多一點）
    ctx.fillStyle = 'rgba(220,244,255,0.8)';
    ctx.beginPath();
    for (const c of vis) {
      if (c.k > 0.25 + 0.5 * lvl || c.len * lenK < 10) continue;
      const ty = c.y + c.len * lenK + 2.2;
      ctx.moveTo(c.x + c.lean + 1, ty);
      ctx.ellipse(c.x + c.lean, ty, 1, 1.4, 0, 0, PI2);
    }
    ctx.fill();
  }

  // ── 第四章：雪蓋 ──
  function capLow(E, x) {
    const t = E.D.cap(x);
    return E.y + t * (1 - 0.35 * E.lvl);
  }
  function capPath(E, grow) {
    const { ctx, L, R, y, isGround, a, b } = E;
    ctx.beginPath();
    const l = isGround ? a : L - 4 - grow;
    const r = isGround ? b : R + 4 + grow;
    const tp = y - 2 - grow * 0.3;
    ctx.moveTo(l, y + 5);
    if (!isGround) ctx.quadraticCurveTo(l - 0.5, tp, l + 8, tp);
    else ctx.lineTo(l, tp);
    // 雪面頂端：非常輕微的起伏（仍在站立線上下 0.6px 內）
    ctx.lineTo(isGround ? r : r - 8, tp);
    if (!isGround) ctx.quadraticCurveTo(r + 0.5, tp, r, y + 5);
    for (let x = r; x >= l; x -= 4) ctx.lineTo(x, capLow(E, clamp(x, L, R)) + grow + (hash(x * 0.71 + E.D.seed) - 0.5) * 1.2);
    ctx.closePath();
  }
  function drawSnowCap(E) {
    const { ctx, M, D, L, R, y, isGround, a, b, lvl } = E;
    // 軟邊
    ctx.fillStyle = M.capSoft;
    capPath(E, 2);
    ctx.fill();
    {
      const g = ctx.createLinearGradient(0, y - 2, 0, y + D.capT + 8);
      g.addColorStop(0, M.cap[0]);
      g.addColorStop(0.3, M.cap[1]);
      g.addColorStop(0.7, M.cap[2]);
      g.addColorStop(1, M.cap[3]);
      ctx.fillStyle = g;
      capPath(E, 0);
      ctx.fill();
    }
    ctx.save();
    capPath(E, 0);
    ctx.clip();
    // 雪團的鼓起：上緣柔和的亮面、下緣藍色的陰影弧
    for (let x = Math.floor(a / 22) * 22; x < b; x += 22) {
      const hx = x + hash(x * 0.13 + D.seed) * 16;
      const lw = capLow(E, clamp(hx, L, R));
      const rr = 6 + hash(x * 0.29) * 8;
      ctx.fillStyle = 'rgba(120,140,196,0.16)';
      ctx.beginPath();
      ctx.ellipse(hx, lw, rr, 3.2, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(hx - 2, y + 0.5, rr * 0.8, 1.6, 0, 0, PI2);
      ctx.fill();
    }
    const pat = specTex(ctx, E.map, M, 'cap');
    if (pat && !E.low) {
      ctx.save();
      const tx = Math.round(D.seed * 5);
      ctx.translate(tx, y - 3);
      ctx.fillStyle = pat;
      ctx.fillRect(a - tx, 0, b - a, 28);
      ctx.restore();
    }
    // 解凍：雪面上一塊塊濕掉、露出底下灰色的岩面與融雪
    if (lvl) {
      for (let x = Math.floor(a / 40) * 40; x < b; x += 40) {
        const hv = hash(x * 0.21 + D.seed);
        if (hv > 0.25 + 0.5 * lvl) continue;
        const hx = x + hash(x * 0.53) * 30;
        const rr = 5 + hv * 16;
        const g = ctx.createRadialGradient(hx, y + 3, 0, hx, y + 3, rr);
        g.addColorStop(0, 'rgba(96,92,100,0.75)');
        g.addColorStop(0.6, 'rgba(150,150,160,0.45)');
        g.addColorStop(1, 'rgba(150,150,160,0)');
        ctx.fillStyle = g;
        ctx.fillRect(hx - rr, y - 4, rr * 2, 14);
      }
    }
    ctx.restore();
    // 雪蓋下緣一道藍色的暗邊（雪的厚度側面）
    ctx.strokeStyle = M.capEdge;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const l = isGround ? a : L - 2;
    const r = isGround ? b : R + 2;
    for (let x = l; x <= r; x += 4) {
      const yy = capLow(E, clamp(x, L, R)) + (hash(x * 0.71 + D.seed) - 0.5) * 1.2 - 0.6;
      x === l ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  function drawRim(E, lineY) {
    const { ctx, M, D, L, R, y, isGround, a } = E;
    const l = isGround ? E.a : L + 2;
    const r = isGround ? E.b : R - 2;
    const g = ctx.createLinearGradient(0, y - 10, 0, y - 1);
    g.addColorStop(0, M.rim + '0)');
    g.addColorStop(1, M.rim + '0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(l, y - 10, r - l, 9);
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? M.rim2 + '0.55)' : M.rim + '0.9)';
      ctx.lineWidth = pass ? 1 : 1.5;
      ctx.beginPath();
      let on = false;
      for (let x = Math.max(l, Math.floor(a / 4) * 4); x <= r; x += 4) {
        const v = fbm(x * 0.02, D.seed + pass * 7);
        const draw = pass ? v > 0.6 : v > 0.28;
        if (draw && !on) ctx.moveTo(x, lineY);
        else if (draw) ctx.lineTo(x, lineY);
        on = draw;
      }
      ctx.stroke();
    }
    if (!isGround) {
      ctx.strokeStyle = M.rim + '0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (E.vis(L, 20)) {
        ctx.moveTo(L + 6, lineY);
        ctx.quadraticCurveTo(L - 4, lineY, L - 4, lineY + 6);
      }
      if (E.vis(R, 20)) {
        ctx.moveTo(R - 6, lineY);
        ctx.quadraticCurveTo(R + 4, lineY, R + 4, lineY + 6);
      }
      ctx.stroke();
    }
  }

  function drawSnowPlat(E) {
    const { ctx, M, D, L, R, y, isGround, a, b } = E;
    const GK = isGround ? M.groundKind : M.shape;
    // 浮空平台底下淡淡的陰影與冷光
    if (!isGround) {
      const g = ctx.createLinearGradient(0, y + 16, 0, y + 70);
      g.addColorStop(0, M.under + '0.22)');
      g.addColorStop(1, M.under + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse((L + R) / 2, y + 30, (R - L) / 2 + 6, 36, 0, 0, Math.PI);
      ctx.fill();
    }
    // ── 本體 ──
    const rounded = M.shape === 'rock' && !isGround;
    const ov = M.shape === 'rock' ? 4 : M.shape === 'masonry' ? 2 : 3;
    {
      let g;
      if (GK === 'ice') {
        g = ctx.createLinearGradient(0, y, 0, y + (isGround ? 80 : 38));
        g.addColorStop(0, M.ice[0]);
        g.addColorStop(0.3, M.ice[1]);
        g.addColorStop(0.75, M.ice[2]);
        g.addColorStop(1, M.ice[3]);
      } else {
        const S = GK === 'altar' ? M.altar : M.soil;
        g = ctx.createLinearGradient(0, y, 0, isGround ? y + 260 : y + 44);
        g.addColorStop(0, S[0]);
        g.addColorStop(0.3, S[1]);
        g.addColorStop(0.72, S[2]);
        g.addColorStop(1, S[3]);
      }
      ctx.fillStyle = g;
      bodyPath(E, ov, rounded);
      ctx.fill();
    }
    ctx.save();
    bodyPath(E, ov, rounded);
    ctx.clip();
    if (isGround && (GK === 'ice' || GK === 'masonry' || GK === 'altar')) {
      // 上面一層（冰、石垣、石板），下面才是岩層：先把岩層畫滿，再把上層蓋上去
      const topH = GK === 'ice' ? 0 : GK === 'masonry' ? 84 : 92;
      const g = ctx.createLinearGradient(0, y + 40, 0, y + 320);
      g.addColorStop(0, M.soil[1]);
      g.addColorStop(0.5, M.soil[2]);
      g.addColorStop(1, M.soil[3]);
      ctx.fillStyle = g;
      ctx.fillRect(a, y + topH, b - a, E.bottomY - y);
      blotchPass(E);
      strataPass(E, topH + 10);
      speckPass(E, Math.min(360, E.bottomY - y));
      veinPass(E);
      stonePass(E);
      if (GK === 'ice') {
        // 冰層：波浪狀的下緣，透出一點下面的岩色
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(a, y);
        for (let x = Math.floor(a / 8) * 8; x <= b + 8; x += 8) ctx.lineTo(x, y + 52 + 10 * fbm(x * 0.012, D.seed) + 4 * Math.sin(x * 0.05 + D.seed));
        ctx.lineTo(b + 8, y);
        ctx.closePath();
        const ig = ctx.createLinearGradient(0, y, 0, y + 66);
        ig.addColorStop(0, 'rgba(226,246,255,0.95)');
        ig.addColorStop(0.35, 'rgba(160,214,244,0.9)');
        ig.addColorStop(0.8, 'rgba(90,150,210,0.78)');
        ig.addColorStop(1, 'rgba(60,110,180,0.6)');
        ctx.fillStyle = ig;
        ctx.fill();
        ctx.clip();
        icePass(E);
        ctx.restore();
        // 冰層下緣的亮線（光從冰裡透出來）
        ctx.strokeStyle = 'rgba(200,240,255,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = Math.floor(a / 8) * 8; x <= b + 8; x += 8) {
          const yy = y + 52 + 10 * fbm(x * 0.012, D.seed) + 4 * Math.sin(x * 0.05 + D.seed);
          x === Math.floor(a / 8) * 8 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
        ctx.stroke();
        // 冰瀑往下淌的痕跡（凍住的水流，一道道淡藍直紋）
        ctx.strokeStyle = 'rgba(170,220,255,0.18)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = Math.floor(a / 46) * 46; x < b; x += 46) {
          const hx = x + hash(x * 0.3 + D.seed) * 30;
          const len = 40 + hash(x * 0.7) * 150;
          ctx.moveTo(hx, y + 56);
          ctx.quadraticCurveTo(hx + 3, y + 56 + len * 0.5, hx - 1, y + 56 + len);
        }
        ctx.stroke();
      } else {
        // 石垣／祭壇石板的底色
        const S = GK === 'altar' ? M.altar : M.soil;
        const sg = ctx.createLinearGradient(0, y, 0, y + topH);
        sg.addColorStop(0, S[0]);
        sg.addColorStop(1, S[1]);
        ctx.fillStyle = sg;
        ctx.fillRect(a, y, b - a, topH);
        ctx.save();
        ctx.beginPath();
        ctx.rect(a, y, b - a, topH);
        ctx.clip();
        speckPass(E, topH, 31);
        blockPass(E, true);
        if (GK === 'altar') altarFrieze(E);
        ctx.restore();
        // 最下面一排石塊投在岩層上的陰影
        const shg = ctx.createLinearGradient(0, y + topH, 0, y + topH + 16);
        shg.addColorStop(0, M.deep + '0.5)');
        shg.addColorStop(1, M.deep + '0)');
        ctx.fillStyle = shg;
        ctx.fillRect(a, y + topH, b - a, 16);
      }
    } else {
      blotchPass(E);
      if (GK !== 'ice') strataPass(E);
      speckPass(E, isGround ? Math.min(360, E.bottomY - y) : 60);
      if (GK === 'masonry') blockPass(E, true);
      if (GK === 'ice') {
        icePass(E);
        // 晶柱的面：左亮右暗
        for (const s of D.spikes) {
          if (!E.vis(s.x, 20)) continue;
          const by = y + E.depth(s.x) - s.h;
          ctx.fillStyle = 'rgba(255,255,255,' + (0.12 + s.tone * 0.12).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(s.x - s.hw, by + 2);
          ctx.lineTo(s.x, by);
          ctx.lineTo(s.x, y + E.depth(s.x) + 1);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(20,50,110,' + (0.12 + (1 - s.tone) * 0.12).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(s.x + s.hw, by + 2);
          ctx.lineTo(s.x, by);
          ctx.lineTo(s.x, y + E.depth(s.x) + 1);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        veinPass(E);
        rootPass(E);
        stonePass(E);
      }
    }
    // 雪蓋底下的環境光遮蔽
    {
      const g = ctx.createLinearGradient(0, y + 3, 0, y + 22);
      g.addColorStop(0, M.ao + '0.5)');
      g.addColorStop(0.45, M.ao + '0.18)');
      g.addColorStop(1, M.ao + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(a, y);
      for (let x = a; x <= b; x += 8) ctx.lineTo(x, capLow(E, clamp(x, L, R)) - 2);
      ctx.lineTo(b, y + 26);
      ctx.lineTo(a, y + 26);
      ctx.closePath();
      ctx.fill();
    }
    if (!isGround) {
      // 底面邊緣一道冷光（雪地反光從下面打上來）、兩端側面暗一點
      ctx.strokeStyle = M.bounce + '0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const s0 = Math.max(L + 6, Math.floor(a / 6) * 6);
      for (let x = s0; x < Math.min(R - 6, b); x += 6) {
        const yy = y + E.depth(x) - 1;
        x === s0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
      for (const [ex, dir] of [[L, 1], [R, -1]]) {
        if (!E.vis(ex, 30)) continue;
        const g = ctx.createLinearGradient(ex, 0, ex + dir * 20, 0);
        g.addColorStop(0, M.deep + '0.4)');
        g.addColorStop(1, M.deep + '0)');
        ctx.fillStyle = g;
        ctx.fillRect(Math.min(ex, ex + dir * 20) - 6, y, 26, 60);
      }
    } else {
      const g = ctx.createLinearGradient(0, y + 70, 0, y + 220);
      g.addColorStop(0, M.deep + '0)');
      g.addColorStop(1, M.deep + '0.38)');
      ctx.fillStyle = g;
      ctx.fillRect(a, y + 70, b - a, E.bottomY - y);
    }
    ctx.restore();

    // ── 底面：碎石、垂雪、冰柱 ──
    if (!isGround) {
      ctx.fillStyle = GK === 'ice' ? M.ice[2] : M.soil[2];
      ctx.beginPath();
      for (const c of D.crumbs) {
        if (!E.vis(c.x)) continue;
        ctx.moveTo(c.x - c.r, c.y);
        ctx.lineTo(c.x - c.r * 0.3, c.y - c.r * 0.6);
        ctx.lineTo(c.x + c.r, c.y - c.r * 0.2);
        ctx.lineTo(c.x + c.r * 0.5, c.y + c.r * (0.6 + c.v * 0.6));
        ctx.lineTo(c.x - c.r * 0.6, c.y + c.r * 0.7);
        ctx.closePath();
      }
      ctx.fill();
      // 底面沾著的雪（一團團往下垂）
      if (E.lvl < 0.9) {
        ctx.fillStyle = M.cap[2];
        ctx.beginPath();
        for (const d of D.drips) {
          if (!E.vis(d.x, 10)) continue;
          const len = d.len * (1 - 0.6 * E.lvl);
          ctx.moveTo(d.x - d.w / 2, d.y);
          ctx.quadraticCurveTo(d.x - d.w / 2, d.y + len, d.x, d.y + len);
          ctx.quadraticCurveTo(d.x + d.w / 2, d.y + len, d.x + d.w / 2, d.y);
          ctx.closePath();
        }
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        for (const d of D.drips) {
          if (!E.vis(d.x, 10)) continue;
          ctx.moveTo(d.x - d.w * 0.3 + 1, d.y + 1);
          ctx.ellipse(d.x - d.w * 0.2, d.y + 1.5, d.w * 0.2, 1, 0, 0, PI2);
        }
        ctx.fill();
      }
    }
    if (!isGround) iciclePass(E, D.icicles);

    // ── 雪蓋、輪廓光 ──
    drawSnowCap(E);
    drawRim(E, y - 2);
    // ── 頂面擺設 ──
    snowProps(E);
  }

  // 祭壇地面的石面：一條刻著霜紋（圓環＋六道放射）的飾帶，接縫長出霜花
  function altarFrieze(E) {
    const { ctx, M, D, y, a, b } = E;
    const fy0 = y + 24;
    const fy1 = y + 38;
    // 飾帶是一道往前凸的石簷：上緣亮、下緣投影
    const g = ctx.createLinearGradient(0, fy0, 0, fy1 + 6);
    g.addColorStop(0, M.jointHi + '0.3)');
    g.addColorStop(0.15, M.altar[1]);
    g.addColorStop(0.85, M.altar[2]);
    g.addColorStop(1, M.joint + '0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(a, fy0, b - a, fy1 - fy0 + 6);
    const sh = ctx.createLinearGradient(0, fy1 + 6, 0, fy1 + 16);
    sh.addColorStop(0, M.joint + '0.45)');
    sh.addColorStop(1, M.joint + '0)');
    ctx.fillStyle = sh;
    ctx.fillRect(a, fy1 + 6, b - a, 10);
    const cy = (fy0 + fy1) / 2 + 2;
    for (let x = Math.floor(a / 64) * 64 + 32; x < b + 32; x += 64) {
      // 刻痕：暗線＋右下錯開的亮線
      for (const [ox, col, lw] of [[0.7, M.jointHi + '0.35)', 0.8], [0, M.joint + '0.55)', 1]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(x + ox, cy + ox, 5, 0, PI2);
        for (let k = 0; k < 6; k++) {
          const an = (k * Math.PI) / 3 + Math.PI / 6;
          ctx.moveTo(x + ox + Math.cos(an) * 5, cy + ox + Math.sin(an) * 5);
          ctx.lineTo(x + ox + Math.cos(an) * 8.5, cy + ox + Math.sin(an) * 8.5);
        }
        ctx.moveTo(x + ox - 26, cy + ox);
        ctx.lineTo(x + ox - 12, cy + ox);
        ctx.moveTo(x + ox + 12, cy + ox);
        ctx.lineTo(x + ox + 26, cy + ox);
        ctx.stroke();
      }
      // 符文淡淡的冰藍光
      if (!E.low) {
        const rg = ctx.createRadialGradient(x, cy, 0, x, cy, 11);
        rg.addColorStop(0, M.rune + '0.35)');
        rg.addColorStop(1, M.rune + '0)');
        ctx.fillStyle = rg;
        ctx.fillRect(x - 11, cy - 11, 22, 22);
      }
    }
    // 霜花：從接縫與飾帶邊緣長出來的羽狀白紋
    ctx.strokeStyle = 'rgba(236,246,255,0.55)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = Math.floor(a / 30) * 30; x < b; x += 30) {
      const hv = hash(x * 0.17 + D.seed);
      if (hv < 0.4) continue;
      const fx = x + hv * 20;
      const fy = hv < 0.7 ? fy1 + 5 : y + 22;
      const dir = hv < 0.55 ? -1 : 1;
      const len = 6 + hv * 10;
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + dir * len * 0.3, fy - dir * 0 - len * (hv < 0.7 ? -0.9 : 0.2));
      for (let k = 1; k < 4; k++) {
        const u = k / 4;
        const px = fx + dir * len * 0.3 * u;
        const py = fy - len * (hv < 0.7 ? -0.9 : 0.2) * u;
        ctx.moveTo(px, py);
        ctx.lineTo(px - 2.5, py + (hv < 0.7 ? -1.5 : 1.5));
        ctx.moveTo(px, py);
        ctx.lineTo(px + 2.5, py + (hv < 0.7 ? -1.5 : 1.5));
      }
    }
    ctx.stroke();
    iciclePass(E, E.D.icicles);
  }

  function snowProps(E) {
    const { ctx, M, D, y, lvl, keep } = E;
    const P = D.props;
    for (const o of P) {
      if (!E.vis(o.x, 16)) continue;
      const x = o.x;
      switch (o.kind) {
        case 'pebble': {
          // 半埋在雪裡的小石頭，頂上一小塊雪
          ctx.fillStyle = M.stone[Math.floor(o.k * 3)][1];
          ctx.beginPath();
          ctx.ellipse(x, y - 0.5, o.rx, o.ry, 0, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = M.stone[Math.floor(o.k * 3)][2];
          ctx.beginPath();
          ctx.ellipse(x - o.rx * 0.25, y - o.ry * 0.55, o.rx * 0.45, o.ry * 0.3, 0, 0, PI2);
          ctx.fill();
          if (lvl < 0.6) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(x + o.rx * 0.1, y - o.ry * 0.85, o.rx * 0.7, o.ry * 0.35, 0, Math.PI, 0);
            ctx.fill();
          }
          break;
        }
        case 'grass': {
          // 從雪裡冒出來的枯草（解凍時多一點、比較高）
          const hk = 1 + 0.3 * lvl;
          for (const bl of o.bl) {
            ctx.fillStyle = M.grass[bl.tone];
            ctx.beginPath();
            const bx = x + bl.dx;
            const h = bl.h * hk;
            ctx.moveTo(bx - bl.w, y - 1);
            ctx.quadraticCurveTo(bx + bl.lean * 0.25, y - h * 0.55, bx + bl.lean, y - h);
            ctx.quadraticCurveTo(bx + bl.lean * 0.3 + bl.w * 0.4, y - h * 0.5, bx + bl.w, y - 1);
            ctx.closePath();
            ctx.fill();
          }
          // 草根處的一小撮雪
          if (lvl < 0.8) {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.ellipse(x, y - 1.2, 5, 1.8, 0, Math.PI, 0);
            ctx.fill();
          }
          break;
        }
        case 'berry': {
          // 冬青：兩三片深綠的尖葉、幾顆紅果，頂上一點雪
          if (o.k > keep + 0.1) break;
          const s = o.s;
          for (let k = 0; k < 3; k++) {
            const an = -Math.PI / 2 + (k - 1) * 0.9 * o.fl;
            ctx.fillStyle = M.leafG[k % 2];
            ctx.beginPath();
            const lx = x + Math.cos(an) * 4 * s;
            const ly = y - 2 + Math.sin(an) * 3 * s;
            ctx.ellipse(lx, ly, 4 * s, 1.6 * s, an, 0, PI2);
            ctx.fill();
          }
          for (let k = 0; k < o.n; k++) {
            const bx = x + (k - (o.n - 1) / 2) * 2.4 * s;
            const by = y - 4.5 * s - (k % 2) * 1.2;
            ctx.fillStyle = M.berry;
            ctx.beginPath();
            ctx.arc(bx, by, 1.5 * s, 0, PI2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,220,220,0.9)';
            ctx.fillRect(bx - 0.7 * s, by - 0.8 * s, 0.7, 0.7);
          }
          if (lvl < 0.5) {
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.beginPath();
            ctx.ellipse(x - o.fl * 3 * s, y - 6 * s, 3 * s, 1.2 * s, 0, Math.PI, 0);
            ctx.fill();
          }
          break;
        }
        case 'twig': {
          ctx.strokeStyle = '#54463e';
          ctx.lineWidth = 1.1;
          ctx.lineCap = 'round';
          ctx.beginPath();
          const ex = x + Math.cos(o.a) * o.len * o.fl;
          const ey = y - 1 + Math.sin(o.a) * o.len;
          ctx.moveTo(x, y - 0.5);
          ctx.quadraticCurveTo((x + ex) / 2 + 1, (y + ey) / 2, ex, ey);
          ctx.moveTo((x + ex) / 2, (y - 0.5 + ey) / 2);
          ctx.lineTo((x + ex) / 2 + 4 * o.fl, (y + ey) / 2 - 3);
          ctx.stroke();
          if (lvl < 0.6) {
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(x + (ex - x) * 0.3, y - 1 + (ey - y) * 0.3 - 0.9);
            ctx.lineTo(ex, ey - 0.9);
            ctx.stroke();
          }
          break;
        }
        case 'sparkle': {
          if (o.k > keep || E.low) break;
          const sx = x + o.dx;
          const sy = y + o.dy;
          const s = o.s;
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.beginPath();
          ctx.moveTo(sx, sy - 2.2 * s);
          ctx.lineTo(sx + 0.45 * s, sy - 0.45 * s);
          ctx.lineTo(sx + 2.2 * s, sy);
          ctx.lineTo(sx + 0.45 * s, sy + 0.45 * s);
          ctx.lineTo(sx, sy + 2.2 * s);
          ctx.lineTo(sx - 0.45 * s, sy + 0.45 * s);
          ctx.lineTo(sx - 2.2 * s, sy);
          ctx.lineTo(sx - 0.45 * s, sy - 0.45 * s);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'camellia': {
          // 落在雪上的紅山茶（整朵掉下來）
          if (o.k > keep + 0.2) break;
          const s = o.s;
          ctx.fillStyle = '#b8242a';
          ctx.beginPath();
          for (let k = 0; k < 5; k++) {
            const an = o.rot + k * 1.2566;
            const px = x + Math.cos(an) * 1.8 * s;
            const py = y - 1.5 + Math.sin(an) * 0.9 * s;
            ctx.moveTo(px + 1.8 * s, py);
            ctx.ellipse(px, py, 1.8 * s, 1.2 * s, an, 0, PI2);
          }
          ctx.fill();
          ctx.fillStyle = '#e04a4a';
          ctx.beginPath();
          ctx.ellipse(x - 0.5, y - 2.2, 1.6 * s, 0.9 * s, 0, 0, PI2);
          ctx.fill();
          ctx.fillStyle = '#ffd24a';
          ctx.fillRect(x - 0.6, y - 2.6, 1.2, 1);
          break;
        }
        case 'bamboo': {
          // 矮竹（熊笹）：幾片寬葉，葉尖沾雪
          const s = o.s;
          for (let k = 0; k < o.n; k++) {
            const an = -Math.PI / 2 + (k - (o.n - 1) / 2) * 0.7;
            const lx = x + Math.cos(an) * 5 * s;
            const ly = y - 1 + Math.sin(an) * 5 * s;
            ctx.fillStyle = k % 2 ? '#3e6a3c' : '#4f7e46';
            ctx.beginPath();
            ctx.ellipse(lx, ly, 5.5 * s, 1.7 * s, an, 0, PI2);
            ctx.fill();
            ctx.fillStyle = 'rgba(236,230,200,0.7)';
            ctx.beginPath();
            ctx.ellipse(lx + Math.cos(an) * 3.5 * s, ly + Math.sin(an) * 3.5 * s, 1.8 * s, 0.9 * s, an, 0, PI2);
            ctx.fill();
          }
          break;
        }
        case 'shide': {
          // 平台邊上綁的一段紙垂（白色的之字紙條）
          const s = o.s;
          ctx.strokeStyle = '#c8302a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x - 6, y + 3);
          ctx.quadraticCurveTo(x, y + 6, x + 6, y + 3);
          ctx.stroke();
          ctx.fillStyle = '#fbf8f2';
          ctx.beginPath();
          ctx.moveTo(x - 1.5, y + 5);
          ctx.lineTo(x + 2, y + 5);
          ctx.lineTo(x + 2, y + 9 * s);
          ctx.lineTo(x - 1, y + 9 * s);
          ctx.lineTo(x - 1, y + 13 * s);
          ctx.lineTo(x + 2.5, y + 13 * s);
          ctx.lineTo(x + 2.5, y + 17 * s);
          ctx.lineTo(x - 0.5, y + 17 * s);
          ctx.lineTo(x - 0.5, y + 14.5 * s);
          ctx.lineTo(x - 4, y + 14.5 * s);
          ctx.lineTo(x - 4, y + 10.5 * s);
          ctx.lineTo(x - 1.5, y + 10.5 * s);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(150,140,150,0.6)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
          break;
        }
        case 'lantern': {
          // 小石燈籠（及膝高）：台座、火袋（暖光）、笠，頂上積雪
          const s = o.s;
          const st = M.stone[0];
          ctx.fillStyle = st[1];
          ctx.fillRect(x - 5 * s, y - 4 * s, 10 * s, 4 * s);
          ctx.fillStyle = st[0];
          ctx.fillRect(x - 2.2 * s, y - 13 * s, 4.4 * s, 9 * s);
          ctx.fillStyle = st[2];
          ctx.fillRect(x - 2.2 * s, y - 13 * s, 1.2 * s, 9 * s);
          ctx.fillStyle = st[0];
          ctx.fillRect(x - 5 * s, y - 20 * s, 10 * s, 7 * s);
          ctx.fillStyle = lvl ? '#6a5040' : '#ffcf7a';
          ctx.fillRect(x - 2.6 * s, y - 18.5 * s, 5.2 * s, 4 * s);
          if (!lvl && !E.low) {
            const g = ctx.createRadialGradient(x, y - 16.5 * s, 0, x, y - 16.5 * s, 16 * s);
            g.addColorStop(0, 'rgba(255,190,110,0.35)');
            g.addColorStop(1, 'rgba(255,190,110,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - 16 * s, y - 32 * s, 32 * s, 32 * s);
          }
          ctx.fillStyle = st[1];
          ctx.beginPath();
          ctx.moveTo(x - 8 * s, y - 20 * s);
          ctx.lineTo(x + 8 * s, y - 20 * s);
          ctx.lineTo(x + 3 * s, y - 25 * s);
          ctx.lineTo(x - 3 * s, y - 25 * s);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(x - 1.2 * s, y - 28 * s, 2.4 * s, 3 * s);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(x - 8.5 * s, y - 20 * s);
          ctx.quadraticCurveTo(x - 4 * s, y - 27 * s, x, y - 26.5 * s);
          ctx.quadraticCurveTo(x + 4 * s, y - 27 * s, x + 8.5 * s, y - 20 * s);
          ctx.quadraticCurveTo(x, y - 22 * s, x - 8.5 * s, y - 20 * s);
          ctx.fill();
          break;
        }
        case 'crystal': {
          // 霜晶：幾根往上長的冰晶，左亮右暗
          for (const c of o.c) {
            const bx = x + c.dx;
            const tx = bx + Math.sin(c.a) * c.h;
            const ty = y - 1 - Math.cos(c.a) * c.h * (1 - 0.4 * lvl);
            ctx.fillStyle = 'rgba(170,220,250,0.9)';
            ctx.beginPath();
            ctx.moveTo(bx - c.w, y - 0.5);
            ctx.lineTo(tx, ty);
            ctx.lineTo(bx + c.w, y - 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.moveTo(bx - c.w, y - 0.5);
            ctx.lineTo(tx, ty);
            ctx.lineTo(bx - c.w * 0.1, y - 0.5);
            ctx.closePath();
            ctx.fill();
          }
          if (!E.low && o.k < keep) {
            const g = ctx.createRadialGradient(x, y - 5, 0, x, y - 5, 12);
            g.addColorStop(0, 'rgba(170,230,255,0.3)');
            g.addColorStop(1, 'rgba(170,230,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - 12, y - 17, 24, 24);
          }
          break;
        }
        case 'shard': {
          ctx.save();
          ctx.translate(x, y - 1);
          ctx.rotate(o.rot * 0.2);
          ctx.fillStyle = 'rgba(190,232,255,0.9)';
          ctx.beginPath();
          ctx.moveTo(-o.r, 0);
          ctx.lineTo(-o.r * 0.2, -o.r * 0.9);
          ctx.lineTo(o.r, -o.r * 0.2);
          ctx.lineTo(o.r * 0.6, 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillRect(-o.r * 0.4, -o.r * 0.6, o.r * 0.6, 0.7);
          ctx.restore();
          break;
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // 終章：大理石
  // ════════════════════════════════════════════════════════════
  const PLATE = 8; // 石板面的厚度（y-1 .. y+7）
  function drawTemplePlat(E) {
    const { ctx, M, D, L, R, y, isGround, a, b } = E;
    // 浮空基座底下：淡淡的光暈（被時間之光從下面照亮）
    if (!isGround && !E.low) {
      const g = ctx.createRadialGradient((L + R) / 2, y + 40, 4, (L + R) / 2, y + 40, Math.max(40, (R - L) / 2));
      g.addColorStop(0, 'rgba(' + M.light + ',0.14)');
      g.addColorStop(1, 'rgba(' + M.light + ',0)');
      ctx.save();
      ctx.translate((L + R) / 2, y + 40);
      ctx.scale(1, 36 / Math.max(40, (R - L) / 2));
      ctx.translate(-(L + R) / 2, -(y + 40));
      ctx.fillStyle = g;
      ctx.fillRect(L - 10, y + 40 - (R - L) / 2 - 10, R - L + 20, R - L + 20);
      ctx.restore();
    }
    // ── 本體 ──
    {
      const g = ctx.createLinearGradient(0, y, 0, isGround ? y + 300 : y + 46);
      g.addColorStop(0, M.marble[0]);
      g.addColorStop(0.35, M.marble[1]);
      g.addColorStop(0.75, M.marble[2]);
      g.addColorStop(1, M.marble[3]);
      ctx.fillStyle = g;
      bodyPath(E, 0, false);
      ctx.fill();
    }
    ctx.save();
    bodyPath(E, 0, false);
    ctx.clip();
    speckPass(E, isGround ? Math.min(360, E.bottomY - y) : 50);
    // 大理石紋
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const v of D.veins) {
      if (!E.vis(v.pts[0], 100)) continue;
      ctx.strokeStyle = (v.gold ? M.gvein : M.vein) + v.a.toFixed(3) + ')';
      ctx.lineWidth = v.w;
      ctx.beginPath();
      ctx.moveTo(v.pts[0], v.pts[1]);
      for (let k = 2; k < v.pts.length; k += 2) ctx.lineTo(v.pts[k], v.pts[k + 1]);
      ctx.stroke();
      if (!v.gold) {
        ctx.strokeStyle = M.vein + (v.a * 0.35).toFixed(3) + ')';
        ctx.lineWidth = v.w * 3;
        ctx.stroke();
      }
    }
    if (isGround) templeGroundFace(E);
    else {
      // 基座：三層往內收的台階（石板 → 飾帶 → 倒金字塔的稜），每一階上緣亮、下緣投影、接縫鑲金
      for (const e0 of [6, 16, 28]) {
        for (const [ex, dir] of [[L, 1], [R, -1]]) {
          if (!E.vis(ex, 60)) continue;
          const sx = ex + dir * e0;
          const g = ctx.createLinearGradient(sx, 0, sx + dir * 7, 0);
          g.addColorStop(0, M.jointHi + '0.4)');
          g.addColorStop(1, M.jointHi + '0)');
          ctx.fillStyle = g;
          ctx.fillRect(Math.min(sx, sx + dir * 7), y + PLATE, 7, 50);
          ctx.fillStyle = M.joint + '0.3)';
          ctx.fillRect(dir > 0 ? sx - 1.2 : sx, y + PLATE, 1.2, 50);
        }
      }
      // 台階之間的水平接縫：暗線＋金線＋下方的投影
      for (const hy of [20, 28]) {
        const g = ctx.createLinearGradient(0, y + hy, 0, y + hy + 7);
        g.addColorStop(0, M.deep + '0.3)');
        g.addColorStop(1, M.deep + '0)');
        ctx.fillStyle = g;
        ctx.fillRect(a, y + hy, b - a, 7);
        ctx.fillStyle = M.gold[2];
        ctx.fillRect(a, y + hy - 1.2, b - a, 1.2);
        ctx.fillStyle = M.gold[1];
        ctx.fillRect(a, y + hy - 1.2, b - a, 0.6);
      }
      // 中間那層的金色小圓飾（一段一段）
      ctx.fillStyle = M.gold[1];
      ctx.beginPath();
      for (let x = Math.floor(a / 48) * 48 + 24; x < b; x += 48) {
        if (x < L + 22 || x > R - 22) continue;
        ctx.moveTo(x + 1.8, y + 24);
        ctx.arc(x, y + 24, 1.8, 0, PI2);
      }
      ctx.fill();
      ctx.fillStyle = M.gold[0];
      ctx.beginPath();
      for (let x = Math.floor(a / 48) * 48 + 24; x < b; x += 48) {
        if (x < L + 22 || x > R - 22) continue;
        ctx.moveTo(x, y + 23.2);
        ctx.arc(x - 0.5, y + 23.4, 0.6, 0, PI2);
      }
      ctx.fill();
      // 側面的石塊接縫、稜上的直紋（像柱子的凹槽）
      ctx.strokeStyle = M.joint + '0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const c of D.cracks) {
        if (!E.vis(c.x, 4)) continue;
        ctx.moveTo(c.x, y + PLATE + 1);
        ctx.lineTo(c.x, y + 19);
      }
      for (let x = Math.floor(a / 9) * 9; x < b; x += 9) {
        ctx.moveTo(x, y + 30);
        ctx.lineTo(x, y + 30 + 14 * clamp((Math.min(x - L, R - x) - 28) / 90, 0, 1));
      }
      ctx.stroke();
      ctx.strokeStyle = M.jointHi + '0.3)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (const c of D.cracks) {
        if (!E.vis(c.x, 4)) continue;
        ctx.moveTo(c.x + 1, y + PLATE + 1);
        ctx.lineTo(c.x + 1, y + 19);
      }
      for (let x = Math.floor(a / 9) * 9 + 1.5; x < b; x += 9) {
        ctx.moveTo(x, y + 30);
        ctx.lineTo(x, y + 30 + 14 * clamp((Math.min(x - L, R - x) - 28) / 90, 0, 1));
      }
      ctx.stroke();
      // 基座往下越暗
      const g = ctx.createLinearGradient(0, y + 12, 0, y + 46);
      g.addColorStop(0, M.deep + '0)');
      g.addColorStop(1, M.deep + '0.4)');
      ctx.fillStyle = g;
      ctx.fillRect(a, y + 12, b - a, 36);
      // 稜的下緣：一道從下面照上來的光（時間之光）
      ctx.strokeStyle = 'rgba(' + M.light + ',0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const s0 = Math.max(L + 28, Math.floor(a / 4) * 4);
      for (let x = s0; x < Math.min(R - 28, b); x += 4) {
        const yy = y + E.depth(x) - 1;
        x === s0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // 光流（在石面上流過）
    currentPass(E, false);
    // 石板面底下的環境光遮蔽
    {
      const g = ctx.createLinearGradient(0, y + PLATE - 1, 0, y + PLATE + 12);
      g.addColorStop(0, M.ao + '0.38)');
      g.addColorStop(1, M.ao + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(a, y + PLATE - 1, b - a, 13);
    }
    ctx.restore();

    // ── 底面：光絲、漂浮碎片、流過底下的光流 ──
    if (!isGround) {
      if (!E.low) {
        for (const d of D.drips) {
          if (!E.vis(d.x, 4)) continue;
          const by = y + E.depth(d.x) - 1;
          const col = d.c ? M.light2 : M.light;
          const g = ctx.createLinearGradient(0, by, 0, by + d.len);
          g.addColorStop(0, 'rgba(' + col + ',' + d.a.toFixed(3) + ')');
          g.addColorStop(1, 'rgba(' + col + ',0)');
          ctx.fillStyle = g;
          ctx.fillRect(d.x - 0.6, by, 1.2, d.len);
          ctx.fillStyle = 'rgba(255,255,255,' + (d.a * 0.9).toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(d.x, by + d.len * 0.7, 0.9, 0, PI2);
          ctx.fill();
        }
      }
      currentPass(E, true);
      shardPass(E);
      // 倒著開的花（花園）
      if (M.grass) {
        for (const c of D.icicles) {
          if (!E.vis(c.x, 10)) continue;
          ctx.strokeStyle = M.grass[0];
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.quadraticCurveTo(c.x + c.lean * 0.3, c.y + c.len * 0.6, c.x + c.lean, c.y + c.len);
          ctx.stroke();
          ctx.fillStyle = M.grass[2];
          ctx.beginPath();
          ctx.ellipse(c.x + c.lean * 0.4 + 2.5, c.y + c.len * 0.45, 2.6, 1.1, 0.6, 0, PI2);
          ctx.fill();
          const fx = c.x + c.lean;
          const fy = c.y + c.len + 1.5;
          ctx.fillStyle = M.flower[c.flower];
          ctx.beginPath();
          for (let k = 0; k < 5; k++) {
            const an = k * 1.2566 + 0.3;
            ctx.moveTo(fx + Math.cos(an) * 1.9 + 1.5, fy + Math.sin(an) * 1.9);
            ctx.arc(fx + Math.cos(an) * 1.9, fy + Math.sin(an) * 1.9, 1.5, 0, PI2);
          }
          ctx.fill();
          ctx.fillStyle = '#ffc24a';
          ctx.beginPath();
          ctx.arc(fx, fy, 0.9, 0, PI2);
          ctx.fill();
        }
      }
    }

    // ── 石板面 ──
    templePlate(E);
    drawRim(E, y - 1);
    templeProps(E);
  }

  // 地面的剖面：石板 → 刻紋飾帶（金色回紋）→ 大石塊（錯縫、金色接縫）→ 越深越暗、偶爾一道光流
  function templeGroundFace(E) {
    const { ctx, M, D, y, a, b } = E;
    const fy0 = y + PLATE + 2;
    const fy1 = fy0 + 16;
    // 飾帶
    {
      const g = ctx.createLinearGradient(0, fy0, 0, fy1);
      g.addColorStop(0, M.marble[1]);
      g.addColorStop(1, M.marble[2]);
      ctx.fillStyle = g;
      ctx.fillRect(a, fy0, b - a, fy1 - fy0);
      // 上下兩道金線
      ctx.fillStyle = M.gold[1];
      ctx.fillRect(a, fy0, b - a, 1.4);
      ctx.fillRect(a, fy1 - 1.4, b - a, 1.4);
      ctx.fillStyle = M.gold[0];
      ctx.fillRect(a, fy0, b - a, 0.5);
      // 回紋（刻進去：暗線＋錯開的亮線；線本身是金色）
      const u = 12;
      const my = fy0 + 3;
      for (const [ox, col, lw] of [[0.6, M.jointHi + '0.4)', 1], [0, M.gold[2], 1.2], [-0.3, M.gold[1], 0.7]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (let x = Math.floor(a / u) * u; x < b + u; x += u) {
          const X = x + ox;
          const Y = my + ox;
          ctx.moveTo(X, Y + 10);
          ctx.lineTo(X, Y);
          ctx.lineTo(X + u * 0.75, Y);
          ctx.lineTo(X + u * 0.75, Y + 7);
          ctx.lineTo(X + u * 0.3, Y + 7);
          ctx.lineTo(X + u * 0.3, Y + 3.5);
        }
        ctx.stroke();
      }
    }
    // 大石塊：三排，錯縫
    const rows = [[fy1, 38], [fy1 + 38, 46], [fy1 + 84, 56], [fy1 + 140, 64], [fy1 + 204, 80]];
    for (let r = 0; r < rows.length; r++) {
      const [r0, rh] = rows[r];
      const bw = 120 + r * 20;
      const off = (r % 2) * bw * 0.5 + hash(r + D.seed) * 30;
      // 石塊之間的明暗
      for (let x = Math.floor((a - off) / bw) * bw + off; x < b; x += bw) {
        const hv = hash(x * 0.013 + r * 7.1);
        ctx.fillStyle = hv < 0.5 ? M.jointHi + (0.06 + hv * 0.1).toFixed(3) + ')' : M.joint + ((hv - 0.5) * 0.14).toFixed(3) + ')';
        ctx.fillRect(x + 1, y + r0 + 1, bw - 2, rh - 2);
        // 石塊的倒角：上緣、左緣亮，下緣暗
        ctx.fillStyle = M.jointHi + '0.22)';
        ctx.fillRect(x + 1, y + r0 + 1, bw - 2, 2);
        ctx.fillRect(x + 1, y + r0 + 3, 1.6, rh - 5);
        ctx.fillStyle = M.joint + '0.3)';
        ctx.fillRect(x + 1, y + r0 + rh - 3, bw - 2, 2);
      }
      ctx.strokeStyle = M.joint + '0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(a, y + r0 + rh);
      ctx.lineTo(b, y + r0 + rh);
      for (let x = Math.floor((a - off) / bw) * bw + off; x < b + bw; x += bw) {
        ctx.moveTo(x, y + r0);
        ctx.lineTo(x, y + r0 + rh);
      }
      ctx.stroke();
      // 某些接縫鑲金
      ctx.strokeStyle = M.gold[1];
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let x = Math.floor((a - off) / bw) * bw + off; x < b + bw; x += bw) {
        if (hash(x * 0.07 + r) > 0.35) continue;
        ctx.moveTo(x, y + r0 + 2);
        ctx.lineTo(x, y + r0 + rh - 2);
      }
      ctx.stroke();
    }
    // 第一排石塊上嵌著的時鐘圓飾（金環、刻度、兩根指針），淡淡發光
    {
      const my = y + rows[0][0] + rows[0][1] / 2;
      const step = 300;
      for (let x = Math.floor(a / step) * step + 150; x < b + 20; x += step) {
        const hv = hash(x * 0.021 + D.seed);
        const cx = x + (hv - 0.5) * 60;
        if (!E.vis(cx, 20)) continue;
        const r = 12.5;
        if (!E.low) {
          const gg = ctx.createRadialGradient(cx, my, r * 0.6, cx, my, r * 2.2);
          gg.addColorStop(0, 'rgba(' + M.light + ',0.3)');
          gg.addColorStop(1, 'rgba(' + M.light + ',0)');
          ctx.fillStyle = gg;
          ctx.fillRect(cx - r * 2.2, my - r * 2.2, r * 4.4, r * 4.4);
        }
        const dg = ctx.createLinearGradient(0, my - r, 0, my + r);
        dg.addColorStop(0, M.plate[0]);
        dg.addColorStop(1, M.plate[2]);
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.arc(cx, my, r, 0, PI2);
        ctx.fill();
        ctx.strokeStyle = M.gold[2];
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.strokeStyle = M.gold[1];
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.strokeStyle = M.gold[2];
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let k = 0; k < 12; k++) {
          const an = (k / 12) * PI2;
          const r0 = k % 3 ? r - 2.6 : r - 4;
          ctx.moveTo(cx + Math.cos(an) * r0, my + Math.sin(an) * r0);
          ctx.lineTo(cx + Math.cos(an) * (r - 1.2), my + Math.sin(an) * (r - 1.2));
        }
        const h1 = hv * PI2;
        const h2 = hash(x * 0.7) * PI2;
        ctx.moveTo(cx, my);
        ctx.lineTo(cx + Math.cos(h1) * r * 0.5, my + Math.sin(h1) * r * 0.5);
        ctx.moveTo(cx, my);
        ctx.lineTo(cx + Math.cos(h2) * r * 0.75, my + Math.sin(h2) * r * 0.75);
        ctx.stroke();
        ctx.fillStyle = M.gold[1];
        ctx.beginPath();
        ctx.arc(cx, my, 1.3, 0, PI2);
        ctx.fill();
      }
    }
    // 越深越暗（沉進時間的深處）
    const g = ctx.createLinearGradient(0, y + 60, 0, y + 300);
    g.addColorStop(0, M.deep + '0)');
    g.addColorStop(1, M.deep + '0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(a, y + 60, b - a, E.bottomY - y);
    // 深處的小星點
    if (!E.low) {
      ctx.fillStyle = 'rgba(' + M.light2 + ',0.5)';
      ctx.beginPath();
      for (let x = Math.floor(a / 30) * 30; x < b; x += 30) {
        const hv = hash(x * 0.31 + D.seed);
        if (hv > 0.5) continue;
        const sy = y + 150 + hash(x * 0.77) * 260;
        ctx.moveTo(x + 1, sy);
        ctx.arc(x, sy, 0.6 + hv, 0, PI2);
      }
      ctx.fill();
    }
  }

  // 光流：一條細亮線＋外面一層柔光，兩端淡出；under = 畫在浮空基座底下
  function currentPass(E, under) {
    const { ctx, M, D, y } = E;
    for (const c of D.currents) {
      if (c.under !== under) continue;
      if (c.x1 < E.a || c.x0 > E.b) continue;
      const col = c.c ? M.light2 : M.light;
      const x0 = Math.max(c.x0, E.a - 10);
      const x1 = Math.min(c.x1, E.b + 10);
      const yAt = (x) => {
        if (!under) return y + c.d + Math.sin(x * c.fr + c.ph) * c.amp * 3 + Math.sin(x * c.fr * 0.37 + c.ph * 2) * c.amp * 2;
        const dep = E.depth(clamp(x, E.L, E.R));
        return y + Math.min(MAXD - 6, dep + 10 + Math.sin(x * c.fr + c.ph) * c.amp * 1.5);
      };
      const fade = (x) => Math.min(1, (x - c.x0) / 60, (c.x1 - x) / 60);
      for (const [lw, al] of E.low ? [[1.2, 0.6]] : [[7, 0.07], [3, 0.16], [1.1, 0.7]]) {
        ctx.lineWidth = lw;
        // 分段畫，兩端的透明度漸弱
        for (let s = x0; s < x1; s += 40) {
          const e = Math.min(x1, s + 42);
          const f = Math.max(0, fade((s + e) / 2));
          if (f <= 0.02) continue;
          ctx.strokeStyle = 'rgba(' + col + ',' + (al * f).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(s, yAt(s));
          for (let x = s + 6; x <= e; x += 6) ctx.lineTo(x, yAt(x));
          ctx.stroke();
        }
      }
    }
  }
  function shardPass(E) {
    const { ctx, M, D } = E;
    for (const s of D.shards) {
      if (!E.vis(s.x, 16)) continue;
      if (s.glow && !E.low) {
        const r = 10;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, 'rgba(' + M.light + ',0.3)');
        g.addColorStop(1, 'rgba(' + M.light + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
      }
      const cs = Math.cos(s.rot);
      const sn = Math.sin(s.rot);
      const P = (k) => [s.x + s.pts[k] * cs - s.pts[k + 1] * sn, s.y + s.pts[k] * sn + s.pts[k + 1] * cs];
      ctx.fillStyle = s.gold ? M.gold[1] : M.shardC[0];
      ctx.beginPath();
      for (let k = 0; k < s.pts.length; k += 2) {
        const [X, Y] = P(k);
        k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.closePath();
      ctx.fill();
      // 下半的暗面
      ctx.fillStyle = s.gold ? M.gold[2] : M.shardC[1];
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      const [X0, Y0] = P(0);
      ctx.moveTo(X0, Y0);
      for (let k = 2; k < s.pts.length; k += 2) {
        const [X, Y] = P(k);
        if (Y >= s.y - 0.5) ctx.lineTo(X, Y);
      }
      ctx.lineTo(s.x, s.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // 一條亮邊
      const [X1, Y1] = P(2);
      ctx.strokeStyle = s.gold ? M.gold[0] : M.shardC[2];
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(X0, Y0);
      ctx.lineTo(X1, Y1);
      ctx.stroke();
    }
  }
  function templePlate(E) {
    const { ctx, M, D, L, R, y, isGround, a, b } = E;
    const l = isGround ? a : L - 5;
    const r = isGround ? b : R + 5;
    const top = y - 1;
    // 板子
    const g = ctx.createLinearGradient(0, top, 0, top + PLATE);
    g.addColorStop(0, M.plate[0]);
    g.addColorStop(0.45, M.plate[1]);
    g.addColorStop(1, M.plate[2]);
    ctx.fillStyle = g;
    ctx.fillRect(l, top, r - l, PLATE);
    // 板面上的倒影（打磨過的石面）：斜斜的柔和亮帶
    if (!E.low) {
      for (let x = Math.floor(l / 150) * 150; x < r; x += 150) {
        const hx = x + hash(x * 0.11 + D.seed) * 90;
        if (hx < l || hx > r) continue;
        const gg = ctx.createLinearGradient(hx - 20, 0, hx + 20, 0);
        gg.addColorStop(0, 'rgba(255,255,255,0)');
        gg.addColorStop(0.5, 'rgba(255,255,255,0.35)');
        gg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(Math.max(l, hx - 20), top + 1, Math.min(40, r - hx + 20), PLATE - 3);
      }
    }
    // 板與板的接縫
    ctx.strokeStyle = M.joint + '0.4)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    const js = isGround ? 132 : 96;
    for (let x = Math.floor(l / js) * js + (D.seed % 40); x < r; x += js) {
      if (x < l + 6 || x > r - 6) continue;
      ctx.moveTo(x, top + 1);
      ctx.lineTo(x, top + PLATE);
    }
    ctx.stroke();
    // 前緣：金色鑲線
    ctx.fillStyle = M.gold[2];
    ctx.fillRect(l, top + PLATE - 2.4, r - l, 2.4);
    ctx.fillStyle = M.gold[1];
    ctx.fillRect(l, top + PLATE - 2.4, r - l, 1.4);
    ctx.fillStyle = M.gold[0];
    ctx.fillRect(l, top + PLATE - 2.4, r - l, 0.5);
    // 板下緣的陰影
    ctx.fillStyle = M.joint + '0.35)';
    ctx.fillRect(l, top + PLATE, r - l, 1);
    // 頂面的亮線
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(l, top, r - l, 0.8);
    if (!isGround) {
      // 兩端的金色端蓋（小小的斜角），像鑲在石板上
      for (const [ex, dir] of [[l, 1], [r, -1]]) {
        if (!E.vis(ex, 20)) continue;
        ctx.fillStyle = M.gold[1];
        ctx.beginPath();
        ctx.moveTo(ex, top);
        ctx.lineTo(ex + dir * 5, top);
        ctx.lineTo(ex + dir * 5, top + PLATE);
        ctx.lineTo(ex, top + PLATE - 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = M.gold[0];
        ctx.fillRect(Math.min(ex, ex + dir * 5), top, 5, 1);
        ctx.fillStyle = M.gold[2];
        ctx.fillRect(dir > 0 ? ex + 4 : ex - 5, top + 1, 1, PLATE - 1);
      }
    }
    // 花園：石板上薄薄一層草皮（柔軟的邊）
    if (M.grass && D.turf) {
      ctx.fillStyle = 'rgba(90,150,70,0.55)';
      ctx.beginPath();
      ctx.moveTo(l + 1, top + 0.5);
      for (let x = l + 1; x <= r - 1; x += 5) ctx.lineTo(x, top + 2.2 + (hash(x * 0.3 + D.seed) - 0.5) * 1.6 + (fbm(x * 0.05, D.seed) - 0.4) * 2);
      ctx.lineTo(r - 1, top - 1);
      ctx.lineTo(l + 1, top - 1);
      ctx.closePath();
      ctx.fill();
      for (let tone = 0; tone < 4; tone++) {
        ctx.fillStyle = M.grass[tone];
        ctx.beginPath();
        for (const t of D.turf) {
          if (!E.vis(t.x, 10)) continue;
          for (const bl of t.bl) {
            if (bl.tone !== tone) continue;
            const x = t.x + bl.dx;
            ctx.moveTo(x - bl.w, y);
            ctx.quadraticCurveTo(x + bl.lean * 0.3, y - bl.h * 0.6, x + bl.lean, y - bl.h);
            ctx.quadraticCurveTo(x + bl.lean * 0.3 + bl.w * 0.4, y - bl.h * 0.5, x + bl.w, y);
            ctx.closePath();
          }
        }
        ctx.fill();
      }
    }
  }
  function templeProps(E) {
    const { ctx, M, D, y, keep } = E;
    for (const o of D.props) {
      if (!E.vis(o.x, 20)) continue;
      const x = o.x;
      switch (o.kind) {
        case 'leafGold': {
          ctx.fillStyle = o.k < 0.5 ? M.gold[1] : M.gold[0];
          ctx.beginPath();
          ctx.ellipse(x, y - 1.3, o.r, o.r * 0.42, o.rot, 0, PI2);
          ctx.fill();
          ctx.strokeStyle = M.gold[2];
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(o.rot) * o.r, y - 1.3 - Math.sin(o.rot) * o.r);
          ctx.lineTo(x + Math.cos(o.rot) * o.r, y - 1.3 + Math.sin(o.rot) * o.r);
          ctx.stroke();
          break;
        }
        case 'chip': {
          ctx.fillStyle = M.shardC[1];
          ctx.beginPath();
          ctx.moveTo(x - o.r, y - 1);
          ctx.lineTo(x - o.r * 0.3, y - 1 - o.r * 0.8);
          ctx.lineTo(x + o.r, y - 1 - o.r * 0.3);
          ctx.lineTo(x + o.r * 0.7, y - 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = M.shardC[0];
          ctx.beginPath();
          ctx.moveTo(x - o.r, y - 1);
          ctx.lineTo(x - o.r * 0.3, y - 1 - o.r * 0.8);
          ctx.lineTo(x + o.r * 0.2, y - 1 - o.r * 0.55);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'hand': {
          // 掉在地上的一根金色時鐘指針
          ctx.save();
          ctx.translate(x, y - 1.2);
          ctx.rotate(o.rot);
          ctx.fillStyle = M.gold[2];
          ctx.fillRect(-o.len / 2, -0.2, o.len, 1.6);
          ctx.fillStyle = M.gold[1];
          ctx.fillRect(-o.len / 2, -0.6, o.len, 1.2);
          ctx.beginPath();
          ctx.moveTo(o.len / 2, -2);
          ctx.lineTo(o.len / 2 + 4, 0);
          ctx.lineTo(o.len / 2, 2);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-o.len / 2, 0, 1.6, 0, PI2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'flower': {
          if (o.k > keep) break;
          const fy = y - 1 - o.h;
          ctx.strokeStyle = M.grass[1];
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(x, y - 1);
          ctx.quadraticCurveTo(x + 1.2, y - o.h * 0.5, x + 0.4, fy);
          ctx.stroke();
          ctx.fillStyle = M.flower[o.c];
          ctx.beginPath();
          for (let k = 0; k < 5; k++) {
            const px = x + 0.4 + Math.cos(k * 1.2566) * o.s;
            const py = fy + Math.sin(k * 1.2566) * o.s * 0.8;
            ctx.moveTo(px + o.s * 0.7, py);
            ctx.arc(px, py, o.s * 0.7, 0, PI2);
          }
          ctx.fill();
          ctx.fillStyle = '#ffc24a';
          ctx.beginPath();
          ctx.arc(x + 0.4, fy, o.s * 0.45, 0, PI2);
          ctx.fill();
          break;
        }
        case 'petal': {
          // 往上飄的花瓣（倒轉庭園）：停在空中的一瞬間
          const py = y - o.dy;
          ctx.fillStyle = o.k < 0.5 ? 'rgba(255,190,214,0.85)' : 'rgba(255,230,240,0.85)';
          ctx.beginPath();
          ctx.ellipse(x, py, 2 * o.s, 1 * o.s, o.rot, 0, PI2);
          ctx.fill();
          break;
        }
        case 'dust': {
          if (E.low) break;
          const sx = x + o.dx;
          ctx.fillStyle = 'rgba(' + M.light + ',0.85)';
          ctx.beginPath();
          ctx.moveTo(sx, y - 1 - 2 * o.s);
          ctx.lineTo(sx + 0.5 * o.s, y - 1);
          ctx.lineTo(sx + 2 * o.s, y - 0.6);
          ctx.lineTo(sx + 0.5 * o.s, y - 0.2);
          ctx.lineTo(sx - 2 * o.s, y - 0.6);
          ctx.lineTo(sx - 0.5 * o.s, y - 1);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'crystal': {
          // 星之階梯：幾根發光的小晶柱
          for (let k = 0; k < 3; k++) {
            const bx = x + (k - 1) * 3.2;
            const h = (5 + ((o.k * 7 + k * 3) % 1) * 7) * (k === 1 ? 1.3 : 0.9);
            const an = (k - 1) * 0.35;
            ctx.fillStyle = k === 1 ? M.gold[0] : M.gold[1];
            ctx.beginPath();
            ctx.moveTo(bx - 1.6, y - 0.5);
            ctx.lineTo(bx + Math.sin(an) * h, y - 1 - Math.cos(an) * h);
            ctx.lineTo(bx + 1.6, y - 0.5);
            ctx.closePath();
            ctx.fill();
          }
          if (!E.low) {
            const g = ctx.createRadialGradient(x, y - 5, 0, x, y - 5, 14);
            g.addColorStop(0, 'rgba(' + M.light + ',0.35)');
            g.addColorStop(1, 'rgba(' + M.light + ',0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - 14, y - 19, 28, 28);
          }
          break;
        }
        case 'mote': {
          if (E.low) break;
          const my = y - o.dy;
          const col = o.c ? M.light2 : M.light;
          const g = ctx.createRadialGradient(x, my, 0, x, my, o.r * 6);
          g.addColorStop(0, 'rgba(' + col + ',0.7)');
          g.addColorStop(0.3, 'rgba(' + col + ',0.2)');
          g.addColorStop(1, 'rgba(' + col + ',0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - o.r * 6, my - o.r * 6, o.r * 12, o.r * 12);
          ctx.fillStyle = 'rgba(255,255,250,0.95)';
          ctx.beginPath();
          ctx.arc(x, my, o.r * 0.6, 0, PI2);
          ctx.fill();
          break;
        }
      }
    }
  }

  for (const k of ['snow', 'shrine', 'ice', 'frost', 'temple', 'garden', 'star', 'throne']) A.GROUND_ART[k] = drawGround;

  // ════════════════════════════════════════════════════════════
  // 繩子：每條畫一次成小貼圖
  // ════════════════════════════════════════════════════════════
  const ropeCache = new Map();
  function makeRope(map, r, x, top, bottom) {
    const kind = map._rope45 || 'hemp';
    const M = matFor(map);
    const W = 48;
    const H = Math.ceil(bottom - top + 30);
    const c = document.createElement('canvas');
    c.width = W * 2;
    c.height = H * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    const cx = W / 2;
    const y0 = 4;
    const len = bottom - top;
    const rnd = U.seeded(Math.round(x) * 31 + Math.round(top) * 7 + 3);
    const lvl = map._aged || 0;
    const draw = () => ROPES[kind](g, { cx, y0, len, rnd, lvl, M, map });
    if (map._aged && A.withAge) A.withAge(g, map, draw);
    else draw();
    return { c, W, H, y0 };
  }
  // 兩股扭在一起的繩：回傳每股的點
  const strand = (cx, y0, len, ph, amp, fr) => {
    const pts = [];
    for (let yy = 0; yy <= len + 0.1; yy += 2) pts.push(cx + Math.sin(yy * fr + ph) * amp, y0 + yy);
    return pts;
  };
  const stroke = (g, pts, ox, col, lw) => {
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(pts[0] + ox, pts[1]);
    for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k] + ox, pts[k + 1]);
    g.stroke();
  };
  function icicleOn(g, x, y, len, w) {
    g.fillStyle = 'rgba(150,200,240,0.8)';
    g.beginPath();
    g.moveTo(x - w / 2, y);
    g.lineTo(x, y + len);
    g.lineTo(x + w / 2, y);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(240,250,255,0.95)';
    g.beginPath();
    g.moveTo(x - w / 2, y);
    g.lineTo(x, y + len);
    g.lineTo(x - w * 0.05, y);
    g.closePath();
    g.fill();
  }
  const ROPES = {
    // 麻繩：三股扭紋、結、左上沾霜，結下掛小冰柱
    hemp(g, o) {
      const { cx, y0, len, rnd, lvl } = o;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const core = strand(cx, y0, len, 0, 0.8, 0.02);
      stroke(g, core, 0.8, 'rgba(20,16,24,0.5)', 6.5);
      stroke(g, core, 0, '#a08058', 5);
      // 扭紋
      g.strokeStyle = 'rgba(70,50,30,0.7)';
      g.lineWidth = 1;
      g.beginPath();
      for (let yy = 2; yy < len; yy += 3.4) {
        const xx = cx + Math.sin(yy * 0.02) * 0.8;
        g.moveTo(xx - 2.4, y0 + yy);
        g.lineTo(xx + 2.4, y0 + yy + 2.6);
      }
      g.stroke();
      g.strokeStyle = 'rgba(214,190,150,0.6)';
      g.lineWidth = 0.7;
      g.beginPath();
      for (let yy = 3.4; yy < len; yy += 3.4) {
        const xx = cx + Math.sin(yy * 0.02) * 0.8;
        g.moveTo(xx - 2, y0 + yy - 0.4);
        g.lineTo(xx + 0.6, y0 + yy + 1.3);
      }
      g.stroke();
      // 霜（左側一條不連續的白）
      if (lvl < 0.9) {
        g.strokeStyle = 'rgba(244,248,255,' + (0.85 - 0.6 * lvl).toFixed(3) + ')';
        g.lineWidth = 1.4;
        g.beginPath();
        for (let yy = 0; yy < len; yy += 8) {
          if (rnd() < 0.35) continue;
          const xx = cx - 2 + Math.sin(yy * 0.02) * 0.8;
          g.moveTo(xx, y0 + yy);
          g.lineTo(xx, y0 + yy + 3 + rnd() * 4);
        }
        g.stroke();
      }
      // 結＋冰柱
      for (let yy = 30 + rnd() * 20; yy < len - 10; yy += 48 + rnd() * 30) {
        const xx = cx + Math.sin(yy * 0.02) * 0.8;
        g.fillStyle = 'rgba(20,16,24,0.45)';
        g.beginPath();
        g.ellipse(xx + 0.6, y0 + yy + 0.8, 4.6, 3.6, 0, 0, PI2);
        g.fill();
        g.fillStyle = '#8e6e48';
        g.beginPath();
        g.ellipse(xx, y0 + yy, 4.2, 3.3, 0, 0, PI2);
        g.fill();
        g.strokeStyle = 'rgba(214,190,150,0.7)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.arc(xx - 0.5, y0 + yy - 0.3, 2.4, Math.PI * 1.1, Math.PI * 1.8);
        g.stroke();
        g.fillStyle = 'rgba(250,252,255,0.9)';
        g.beginPath();
        g.ellipse(xx - 0.6, y0 + yy - 2.6, 3, 1.3, 0, Math.PI, 0);
        g.fill();
        if (lvl < 0.8) for (let k = 0; k < 2; k++) icicleOn(g, xx - 1.8 + k * 3.2, y0 + yy + 2.6, (4 + rnd() * 6) * (1 - 0.5 * lvl), 1.8);
      }
      // 尾端鬆開的麻鬚
      g.strokeStyle = '#8e6e48';
      g.lineWidth = 0.8;
      g.beginPath();
      for (let k = -2; k <= 2; k++) {
        g.moveTo(cx, y0 + len - 2);
        g.quadraticCurveTo(cx + k, y0 + len + 4, cx + k * 2.2, y0 + len + 8 - Math.abs(k));
      }
      g.stroke();
    },
    // 鈴繩：紅白兩股、每隔一段掛一顆小銅鈴，鈴頂積雪
    bellrope(g, o) {
      const { cx, y0, len, rnd, lvl } = o;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const s1 = strand(cx, y0, len, 0, 1.6, 0.16);
      const s2 = strand(cx, y0, len, Math.PI, 1.6, 0.16);
      stroke(g, s1, 0.8, 'rgba(30,10,16,0.45)', 5);
      stroke(g, s2, 0.8, 'rgba(30,10,16,0.45)', 5);
      stroke(g, s2, 0, '#f2ece6', 3.4);
      stroke(g, s1, 0, '#c8302a', 3.4);
      // 兩股交疊處：前面那股（每半圈換一次）
      g.lineWidth = 3.4;
      for (let yy = 0; yy < len; yy += Math.PI / 0.16) {
        g.strokeStyle = '#f2ece6';
        g.beginPath();
        for (let t = yy; t < Math.min(len, yy + Math.PI / 0.32); t += 2) {
          const xx = cx + Math.sin(t * 0.16 + Math.PI) * 1.6;
          t === yy ? g.moveTo(xx, y0 + t) : g.lineTo(xx, y0 + t);
        }
        g.stroke();
      }
      stroke(g, s1, -0.9, 'rgba(255,190,180,0.5)', 0.8);
      // 鈴
      let side = 1;
      for (let yy = 22 + rnd() * 14; yy < len - 8; yy += 40 + rnd() * 18) {
        side = -side;
        const bx = cx + side * 7;
        const by = y0 + yy + 6;
        g.strokeStyle = '#c8302a';
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(cx, y0 + yy);
        g.quadraticCurveTo(cx + side * 5, y0 + yy + 1, bx, by - 4);
        g.stroke();
        const gg = g.createLinearGradient(bx - 4, 0, bx + 4, 0);
        gg.addColorStop(0, '#fbe6a0');
        gg.addColorStop(0.45, '#e2b04a');
        gg.addColorStop(1, '#8a6224');
        g.fillStyle = gg;
        g.beginPath();
        g.moveTo(bx - 4, by + 3);
        g.quadraticCurveTo(bx - 4, by - 4.5, bx, by - 4.5);
        g.quadraticCurveTo(bx + 4, by - 4.5, bx + 4, by + 3);
        g.closePath();
        g.fill();
        g.fillStyle = '#6a4818';
        g.fillRect(bx - 4.5, by + 2.4, 9, 1.2);
        g.fillStyle = '#3a2610';
        g.beginPath();
        g.arc(bx, by + 4, 1, 0, PI2);
        g.fill();
        if (lvl < 0.7) {
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.ellipse(bx - 0.5, by - 4.2, 2.8, 1.2, 0, Math.PI, 0);
          g.fill();
        }
      }
      // 尾端一小束流蘇
      g.fillStyle = '#c8302a';
      g.beginPath();
      g.moveTo(cx - 2, y0 + len - 2);
      g.lineTo(cx + 2, y0 + len - 2);
      g.lineTo(cx + 3.4, y0 + len + 10);
      g.lineTo(cx - 3.4, y0 + len + 10);
      g.closePath();
      g.fill();
      g.fillStyle = '#e2b04a';
      g.fillRect(cx - 2.4, y0 + len - 3, 4.8, 2);
    },
    // 冰鏈：正面環、側面環交錯；環上結霜，幾個環下掛冰柱
    icechain(g, o) {
      const { cx, y0, len, rnd, lvl } = o;
      const step = 8.5;
      let k = 0;
      for (let yy = 0; yy < len; yy += step, k++) {
        const ly = y0 + yy + step / 2;
        if (k % 2 === 0) {
          g.strokeStyle = 'rgba(10,16,30,0.45)';
          g.lineWidth = 3.2;
          g.beginPath();
          g.ellipse(cx + 0.6, ly + 0.6, 3.6, 5.6, 0, 0, PI2);
          g.stroke();
          const gg = g.createLinearGradient(cx - 4, 0, cx + 4, 0);
          gg.addColorStop(0, '#c8d6ea');
          gg.addColorStop(0.5, '#7a8aa6');
          gg.addColorStop(1, '#3e4862');
          g.strokeStyle = gg;
          g.lineWidth = 2.2;
          g.beginPath();
          g.ellipse(cx, ly, 3.6, 5.6, 0, 0, PI2);
          g.stroke();
        } else {
          g.fillStyle = 'rgba(10,16,30,0.45)';
          g.fillRect(cx - 1.2, ly - 6.2, 3, 12.4);
          const gg = g.createLinearGradient(cx - 1.4, 0, cx + 1.4, 0);
          gg.addColorStop(0, '#dde8f6');
          gg.addColorStop(1, '#5a6a88');
          g.fillStyle = gg;
          g.fillRect(cx - 1.4, ly - 6, 2.8, 12);
        }
        // 霜
        if (lvl < 0.9 && rnd() < 0.6 - 0.4 * lvl) {
          g.fillStyle = 'rgba(246,250,255,0.85)';
          g.beginPath();
          g.ellipse(cx - 1.5, ly - 4.4, 2.2, 1, -0.3, 0, PI2);
          g.fill();
        }
        if (k % 5 === 3 && yy < len - 16 && lvl < 0.85) icicleOn(g, cx + (rnd() - 0.5) * 3, ly + 5, (5 + rnd() * 9) * (1 - 0.5 * lvl), 2.2);
      }
      // 淡淡的冰藍反光
      g.strokeStyle = 'rgba(200,236,255,0.25)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(cx - 3, y0);
      g.lineTo(cx - 3, y0 + len);
      g.stroke();
    },
    // 光之絲：一條發光的金絲，兩股細絲繞著它轉，每隔一段一顆小光晶
    thread(g, o) {
      const { cx, y0, len, rnd, M } = o;
      const col = M.light;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const core = strand(cx, y0, len, 0, 0.6, 0.03);
      for (const [lw, al] of [[12, 0.06], [6, 0.14], [3, 0.35]]) stroke(g, core, 0, 'rgba(' + col + ',' + al + ')', lw);
      stroke(g, core, 0, '#fffaf0', 1.4);
      const s1 = strand(cx, y0, len, 0, 3.2, 0.12);
      const s2 = strand(cx, y0, len, Math.PI, 3.2, 0.12);
      stroke(g, s1, 0, M.gold[1], 1.1);
      stroke(g, s2, 0, 'rgba(' + M.light2 + ',0.8)', 0.9);
      // 光晶
      for (let yy = 16 + rnd() * 10; yy < len - 6; yy += 26 + rnd() * 14) {
        const bx = cx + Math.sin(yy * 0.03) * 0.6;
        const by = y0 + yy;
        const s = 2.4 + rnd() * 1.4;
        const gg = g.createRadialGradient(bx, by, 0, bx, by, s * 3.4);
        gg.addColorStop(0, 'rgba(' + col + ',0.55)');
        gg.addColorStop(1, 'rgba(' + col + ',0)');
        g.fillStyle = gg;
        g.fillRect(bx - s * 3.4, by - s * 3.4, s * 6.8, s * 6.8);
        g.fillStyle = M.gold[0];
        g.beginPath();
        g.moveTo(bx, by - s * 1.6);
        g.lineTo(bx + s, by);
        g.lineTo(bx, by + s * 1.6);
        g.lineTo(bx - s, by);
        g.closePath();
        g.fill();
        g.fillStyle = M.gold[1];
        g.beginPath();
        g.moveTo(bx, by - s * 1.6);
        g.lineTo(bx + s, by);
        g.lineTo(bx, by + s * 1.6);
        g.closePath();
        g.fill();
      }
      // 尾端：光散成幾顆小點
      g.fillStyle = 'rgba(255,250,230,0.9)';
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.arc(cx + (rnd() - 0.5) * 5, y0 + len + 2 + k * 3.2, 1.1 - k * 0.2, 0, PI2);
        g.fill();
      }
    },
    // 花藤（倒轉庭園）：綠色藤莖、葉子、粉白的小花
    flowervine(g, o) {
      const { cx, y0, len, rnd, M } = o;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const s1 = strand(cx, y0, len, 0, 2.2, 0.09);
      const s2 = strand(cx, y0, len, Math.PI, 2.2, 0.09);
      for (const pts of [s2, s1]) {
        stroke(g, pts, 0.7, 'rgba(20,40,20,0.45)', 5);
        stroke(g, pts, 0, pts === s1 ? '#5f9a44' : '#4a7e36', 3.6);
        stroke(g, pts, -0.9, 'rgba(210,245,170,0.5)', 0.9);
      }
      let side = 1;
      for (let yy = 6 + rnd() * 6; yy < len - 2; yy += 10 + rnd() * 8) {
        side = -side;
        const xx = cx + Math.sin(yy * 0.09) * 2.2;
        const s = 0.9 + rnd() * 0.5;
        const lx = xx + side * 6 * s;
        const ly = y0 + yy + 2;
        const an = side > 0 ? 0.5 : Math.PI - 0.5;
        g.fillStyle = rnd() < 0.5 ? M.grass[1] : M.grass[2];
        g.beginPath();
        g.ellipse(lx, ly, 5 * s, 2.2 * s, an, 0, PI2);
        g.fill();
        g.strokeStyle = 'rgba(220,250,190,0.55)';
        g.lineWidth = 0.5;
        g.beginPath();
        g.moveTo(lx - Math.cos(an) * 4 * s, ly - Math.sin(an) * 4 * s);
        g.lineTo(lx + Math.cos(an) * 4 * s, ly + Math.sin(an) * 4 * s);
        g.stroke();
        if (rnd() < 0.4) {
          const fx = xx - side * 5;
          const fy = y0 + yy + 5;
          g.fillStyle = M.flower[Math.floor(rnd() * 4)];
          g.beginPath();
          for (let k = 0; k < 5; k++) {
            const a2 = k * 1.2566;
            g.moveTo(fx + Math.cos(a2) * 2 + 1.6, fy + Math.sin(a2) * 2);
            g.arc(fx + Math.cos(a2) * 2, fy + Math.sin(a2) * 2, 1.6, 0, PI2);
          }
          g.fill();
          g.fillStyle = '#ffc24a';
          g.beginPath();
          g.arc(fx, fy, 0.9, 0, PI2);
          g.fill();
        }
      }
      g.fillStyle = '#4a7e36';
      g.beginPath();
      for (let k = -1; k <= 1; k++) taperPath(g, [cx, y0 + len - 2, cx + k * 2, y0 + len + 5, cx + k * 3.5, y0 + len + 9], 1.6, 0.3);
      g.fill();
    },
  };
  function ropeArt(ctx, r, x, top0, bottom, t, map) {
    const top = r[1] + 6;
    const key = r[0] + ':' + r[1] + ':' + r[2] + ':' + (map._aged || 0) + ':' + map.refinedGround + ':' + map._rope45;
    let e = ropeCache.get(key);
    if (!e) {
      if (ropeCache.size > 64) ropeCache.clear();
      e = makeRope(map, r, x, top, bottom);
      ropeCache.set(key, e);
    }
    // 以上端為軸輕輕擺動（鏈子重、擺得少）
    const sway = map._rope45 === 'icechain' ? 1 : 2;
    const k = Math.sin(t * 0.9 + x * 0.013) * (sway / Math.max(40, bottom - top));
    ctx.save();
    ctx.transform(1, 0, k, 1, -k * top, 0);
    ctx.drawImage(e.c, x - e.W / 2, top - e.y0, e.W, e.H);
    ctx.restore();
  }
  for (const k of ['snow', 'shrine', 'ice', 'frost', 'temple', 'garden', 'star', 'throne']) A.ROPE_ART[k] = ropeArt;

  // background.js 的 drawRope 只在繩子樣式是 'vine' 時交給 ROPE_ART；這幾章的主題把繩子換成
  // bellrope / rope / chain / goldchain，所以畫繩子的那一下把主題換成一個 rope: 'vine' 的影子物件
  // （呼吸光、往上飄的光點照舊由原本的函式畫）
  const baseRope = A.drawRope;
  A.drawRope = function (ctx, r, t, near) {
    const m = G.world && G.world.map;
    if (!m || !m._rope45 || r[3] === 'ladder' || !A.ROPE_ART[m.refinedGround] || !m._theme) return baseRope(ctx, r, t, near);
    const th = m._theme;
    if (m._ropeTh0 !== th) {
      m._ropeTh0 = th;
      m._ropeTh1 = Object.create(th);
      m._ropeTh1.rope = 'vine';
    }
    m._theme = m._ropeTh1;
    try {
      baseRope(ctx, r, t, near);
    } finally {
      m._theme = th;
    }
  };

  // ── 接上 prepareMap：算好細節；垂吊物改掛在新的底面下（冰柱、流蘇改由快取裡的底面取代） ──
  const basePrep = A.prepareMap;
  A.prepareMap = function (map) {
    basePrep(map);
    const M = MAT[map.refinedGround];
    if (!M) return;
    delete map._g45;
    buildGround(map);
    const th = map._theme || {};
    map._rope45 = ROPE_KIND[th.rope] || (M.fam === 'temple' ? 'thread' : 'hemp');
    const keepHang = th.hang === 'bells' || th.hang === 'blossom' || th.hang === 'starcharm';
    if (!keepHang) map._hang = [];
    else {
      for (const h of map._hang || []) {
        const pi = map.platforms.findIndex((q, k) => k > 0 && Math.abs(q[2] + 20 - h.y) < 0.5 && h.x >= q[0] && h.x <= q[1]);
        const D = pi > 0 && map._g45[pi];
        if (D && D.depth) h.y = map.platforms[pi][2] + D.depth(h.x) + 4;
      }
    }
  };
})();
