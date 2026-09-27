// 精緻地形（試作）：寫實、偏繪畫感的地面與浮空平台，給地圖資料寫了 refinedGround 的地圖用
// （目前只有 1-2 蘑菇林地 refinedGround: 'forest'，其他地圖完全照舊）。
// ・土層分層、穿過土裡的樹根、嵌石、軟邊的苔蘚墊、參差的草叢、落葉、稀疏的發光小菇與螢光
// ・浮空平台是厚厚一塊長滿苔蘚的土塊：看得到底面（垂根、滴垂的苔、剝落的土塊）
// ・站立線：苔面頂端固定在平台 y 往上 2px，整條都一樣高，不會因為裝飾而上下飄；草葉只是從上面冒出來
// ・全部畫進 background.js 的平台快取塊（drawPlatforms → buildTile），每格只貼圖；
//   土地變老時一樣經過 hookCtx 的調色，另外花、菇、螢光變少，落葉變多
// ・藤蔓繩：每條繩子畫一次成小貼圖，每格只做一次 drawImage（加一點以上端為軸的擺動）
// 要推到其他章節：在 MAT 加一組材質（土色、苔色、草色、落葉、發光物），地圖寫 refinedGround: '<材質名>'
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const PI2 = Math.PI * 2;
  A.GROUND_ART = A.GROUND_ART || {};
  A.ROPE_ART = A.ROPE_ART || {};

  // ── 小工具：固定的雜訊（長距離不會看出重複） ──
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
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

  // ── 材質（每章一組；目前只有第一章的魔法森林） ──
  const MAT = {
    forest: {
      soil: ['#6c4a31', '#553824', '#3c2819', '#2a1b11'],
      soilLight: 'rgba(176,132,86,',
      soilDark: 'rgba(28,16,8,',
      blotch: ['rgba(128,92,56,', 'rgba(44,30,18,', 'rgba(96,84,58,'],
      speck: ['rgba(205,168,120,0.22)', 'rgba(18,10,4,0.28)', 'rgba(150,120,86,0.26)', 'rgba(88,110,64,0.18)'],
      stone: [['#6c665c', '#46413a', '#958d7d'], ['#5f5a54', '#3e3a35', '#86807a'], ['#77695a', '#4d4236', '#a09078']],
      root: '#4b3222',
      rootDark: 'rgba(22,12,6,0.5)',
      rootHi: 'rgba(196,156,110,0.5)',
      moss: ['#2c5a22', '#3f7a2e', '#58993a', '#7cbc50', '#a6dc72'],
      mossSoft: 'rgba(70,128,48,0.45)',
      mossDot: ['rgba(186,236,128,0.45)', 'rgba(30,64,22,0.35)', 'rgba(150,210,96,0.4)'],
      blade: ['#23501d', '#3d7f2c', '#5c9f3c', '#86c258', '#aedb78'],
      rim: 'rgba(238,255,204,',
      rimMagic: 'rgba(160,255,226,',
      bounce: 'rgba(120,210,196,',
      leaf: ['#c9772f', '#dc9d3e', '#a8582a', '#e6b852', '#8f9a3c', '#b8662e'],
      leafDry: ['#a8783e', '#8a6038', '#b89458'],
      glow: [['#8ff5dc', '140,255,220'], ['#c8f59a', '190,255,150'], ['#ffd98e', '255,220,150'], ['#e0704a', null], ['#e89a4e', null]],
      // 後兩種是不發光的小紅菇、橘菇（蘑菇林地的招牌），白點
      flower: ['#fff4b0', '#ffffff', '#ffb8d0', '#c8b8ff'],
      hangMoss: ['#335f26', '#4a8634', '#6aa846'],
      // 以下原本寫死在畫法裡，拉出來給其他材質換
      underShadow: 'rgba(10,20,16,',
      hair: 'rgba(58,36,22,0.75)',
      hairHi: 'rgba(190,150,104,0.3)',
      stoneShadow: 'rgba(20,12,6,0.35)',
      stoneHi: 'rgba(255,248,226,0.32)',
      stoneCover: 'rgba(60,40,24,0.35)',
      stoneMoss: 'rgba(96,150,62,0.7)',
      ao: 'rgba(14,8,4,',
      endShade: 'rgba(16,10,6,',
      deepDark: 'rgba(12,8,4,',
      dripTip: 'rgba(180,236,130,0.55)',
      capEdge: 'rgba(22,44,16,0.55)',
      capHi: 'rgba(200,244,140,',
      leafVein: 'rgba(60,30,10,0.45)',
      flowerEye: '#ffc24a',
      shroomStem: '#e8f0d8',
      shroomTop: '#ffc8a0',
      shroomBot: '#9a3e2a',
      shroomSpot: 'rgba(255,246,232,0.9)',
      vine: {
        shadow: 'rgba(16,24,10,0.6)', s1: '#6f8434', s2: '#56692a', hi: 'rgba(200,230,140,0.55)', knot: 'rgba(30,40,14,0.5)',
        moss: 'rgba(110,170,70,0.75)', stem: '#4a6a2a', leaf: ['#4f8e36', '#66ab42', '#80c254'], leafShade: 'rgba(20,40,12,0.35)',
        leafVein: 'rgba(210,245,160,0.6)', tendril: '#6a9a3a', tip: '#4a5a26', bud: '190,255,200', budCore: '#eafff0',
      },
      // density: { stone, pebble, root, hair, under, tuft, clover, leaf, flower, glow, fly }（1 = 原樣，0 = 不要）
      // depthShape: { base, a, b, end, edge }（浮空土塊厚度）；cap: { thick, vary }（苔墊厚度）；tuftH、rootW：草高、根粗倍數
      // onBuild(D, info)、hooks: { soil0, soil, under, cap, rim, top }、custom(ctx, E)：見 groundKit 說明
    },
  };

  // ── 地圖準備：每個平台的細節一次算好（位置固定，畫快取塊時只挑看得到的） ──
  function buildGround(map) {
    const M = MAT[map.refinedGround];
    if (!M) return;
    const DN = M.density || {};
    const dn = (k) => (DN[k] === undefined ? 1 : DN[k]);
    const DP = M.depthShape || {};
    const ropes = map.ropes || [];
    map._gnd = map.platforms.map((p, i) => {
      const L = p[0];
      const R = p[1];
      const y = p[2];
      const w = R - L;
      const isGround = i === 0;
      const rnd = U.seeded(i * 9173 + L * 7 + y * 3 + 11);
      const seed = rnd() * 100;
      const D = { seed, isGround, capT: (M.cap && M.cap.thick) || 6.5, capV: M.cap && M.cap.vary !== undefined ? M.cap.vary : 3, stones: [], roots: [], hang: [], drips: [], clods: [], tufts: [], leaves: [], glows: [], flies: [], flowers: [], blotches: [], tongues: [], clover: [] };
      const nearRope = (x, d) => ropes.some((r) => Math.abs(r[0] - x) < (d || 16) && (Math.abs(r[1] - y) < 12 || Math.abs(r[2] - y) < 12));
      // 浮空土塊的厚度（底面輪廓）：中間厚、兩端收成圓頭，幾處樹根團往下鼓
      const bulges = [];
      if (!isGround) {
        for (let x = L + 60 + rnd() * 80; x < R - 60; x += 150 + rnd() * 220) bulges.push({ x, r: 24 + rnd() * 34, d: 7 + rnd() * 10 });
      }
      D.bulges = bulges;
      D.depth = (x) => {
        let d = (DP.base || 29) + (DP.a || 12) * fbm(x * 0.011, seed) + (DP.b || 6) * fbm(x * 0.06, seed + 9);
        for (const b of bulges) {
          const u = (x - b.x) / b.r;
          if (u > -1.6 && u < 1.6) d += b.d * Math.exp(-u * u * 1.6);
        }
        const e = clamp(Math.min(x - L, R - x) / (DP.edge || 46), 0, 1);
        const d0 = DP.end || 13;
        return d0 + (d - d0) * Math.pow(e, 0.6);
      };
      // 查表：畫的時候每個 x 都要問厚度，先算好一整條
      {
        const f = D.depth;
        const off = L - 12;
        const tb = new Float32Array(Math.ceil(w) + 26);
        if (!isGround) for (let k = 0; k < tb.length; k++) tb[k] = f(off + k);
        const last = tb.length - 1;
        D.depth = (x) => {
          const k = Math.round(x - off);
          return tb[k < 0 ? 0 : k > last ? last : k];
        };
      }
      const depthAt = D.depth;
      const maxD = isGround ? 420 : 0;
      // 大片的土色變化（暖／冷／偏灰綠），避免長段看起來像磁磚
      const bStep = isGround ? 70 : 60;
      for (let x = L - 20; x < R + 20; x += bStep * (0.6 + rnd() * 0.8)) {
        const rows = isGround ? 3 : 1;
        for (let k = 0; k < rows; k++) {
          const dd = isGround ? 20 + k * 55 + rnd() * 40 : 10 + rnd() * 18;
          D.blotches.push({ x, y: y + dd, r: (isGround ? 40 : 18) + rnd() * (isGround ? 50 : 20), c: Math.floor(rnd() * 3), a: 0.16 + rnd() * 0.22 });
        }
      }
      // 地層：幾道起伏的色帶
      D.strata = [];
      const bands = isGround ? [[16, 3, 'l'], [34, 8, 'd'], [58, 3, 'l'], [86, 12, 'd'], [118, 4, 'l'], [150, 14, 'd'], [200, 5, 'l'], [240, 18, 'd'], [300, 6, 'l']] : [[13, 2.5, 'l'], [22, 5, 'd']];
      for (const [d, h, k] of bands) {
        if (isGround && d > maxD) break;
        D.strata.push({ d, h, k, ph: rnd() * 10, amp: isGround ? 4 + rnd() * 4 : 2 + rnd() * 2 });
      }
      // 嵌石：地面越深越大；浮空土塊的底面邊上有幾顆半露出來
      const sStep = isGround ? 52 : 50;
      if (dn('stone') > 0) for (let x = L + 8; x < R - 8; x += (sStep * (0.5 + rnd() * 1.1)) / dn('stone')) {
        let sy;
        let r;
        if (isGround) {
          const d = 16 + Math.pow(rnd(), 1.3) * 260;
          sy = y + d;
          r = 2.5 + rnd() * (d > 60 ? 10 : 5);
        } else {
          const dep = depthAt(x);
          const edge = rnd() < 0.2;
          sy = y + (edge ? dep - 3 - rnd() * 3 : 10 + rnd() * Math.max(2, dep - 18));
          r = edge ? 3 + rnd() * 3.5 : 1.8 + rnd() * 3.4;
        }
        const j = [];
        for (let k = 0; k < 8; k++) j.push(0.78 + rnd() * 0.34);
        D.stones.push({ x, y: sy, rx: r * (1.1 + rnd() * 0.6), ry: r * (0.62 + rnd() * 0.3), rot: (rnd() - 0.5) * 0.7, v: Math.floor(rnd() * 3), moss: rnd() < 0.3, j });
      }
      // 小碎石子
      if (dn('pebble') > 0) for (let x = L + 4; x < R - 4; x += (9 + rnd() * 16) / dn('pebble')) {
        const dep = isGround ? 14 + rnd() * 240 : 7 + rnd() * Math.max(3, depthAt(x) - 10);
        D.stones.push({ x, y: y + dep, rx: 0.9 + rnd() * 1.6, ry: 0.7 + rnd() * 1, rot: 0, v: Math.floor(rnd() * 3), tiny: true });
      }
      // 穿過土裡的樹根：從苔層下冒出、斜斜穿過土、在浮空土塊就從底面鑽出來垂下去
      const rStep = isGround ? 150 : 95;
      if (dn('root') > 0) for (let x = L + 20 + rnd() * 40; x < R - 20; x += (rStep * (0.6 + rnd() * 0.9)) / dn('root')) {
        const dir = rnd() < 0.5 ? -1 : 1;
        const thick = (isGround ? 2.6 + rnd() * 4 : 1.8 + rnd() * 3) * (M.rootW || 1);
        if (isGround) {
          const len = 60 + rnd() * 170;
          const dx = dir * (40 + rnd() * 110);
          // 彎彎曲曲往下鑽：方向每一步隨機偏一點，並慢慢被拉向下方
          const pts = [];
          let px = x;
          let py = y + 6 + rnd() * 6;
          let ang = Math.atan2(len * 0.6, dx);
          const step = len / 8;
          for (let k = 0; k <= 8; k++) {
            pts.push(px, py);
            ang += (rnd() - 0.5) * 0.9;
            ang += (Math.PI / 2 - ang) * 0.12;
            px += Math.cos(ang) * step;
            py += Math.max(1, Math.sin(ang) * step * 0.8);
          }
          const br = [];
          const nb = Math.floor(rnd() * 3);
          for (let k = 0; k < nb; k++) br.push({ k: 2 + Math.floor(rnd() * 5), dx: (rnd() - 0.5) * 50, dy: 12 + rnd() * 30, w: 0.5 + rnd() * 0.4 });
          D.roots.push({ pts, w: thick, br });
        } else {
          const ex = clamp(x + dir * (20 + rnd() * 60), L + 14, R - 14);
          const ey = y + depthAt(ex) + 1;
          const y0 = y + 5 + rnd() * 4;
          const pts = [];
          for (let k = 0; k <= 6; k++) {
            const u = k / 6;
            pts.push(x + (ex - x) * u + Math.sin(u * 4 + seed + x) * 2, y0 + (ey - y0) * (u * u * 0.6 + u * 0.4));
          }
          D.roots.push({ pts, w: thick * 0.8, br: [] });
          // 鑽出底面後垂下去（長度限制在快取塊的下緣以內）
          const room = 70 - depthAt(ex);
          if (rnd() < 0.8 && room > 8) D.hang.push({ x: ex, y: ey - 2, len: Math.min(room, 10 + Math.pow(rnd(), 1.5) * 44), sw: (rnd() - 0.5) * 16, w: thick * 0.8, curl: rnd() * 6, root: true });
        }
      }
      // 苔層底下的細鬚根（一叢一叢往下鑽）
      D.hairs = [];
      if (dn('hair') > 0) for (let x = L + 4; x < R - 4; x += (7 + rnd() * 16) / dn('hair')) {
        const n = 1 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) D.hairs.push(x + (rnd() - 0.5) * 6, y + 5 + rnd() * 3, (rnd() - 0.5) * 8, 5 + Math.pow(rnd(), 1.5) * (isGround ? 22 : 14));
      }
      if (!isGround) {
        // 底面：更多細根、苔蘚垂條、剝落的小土塊
        if (dn('under') > 0) for (let x = L + 10; x < R - 10; x += (12 + rnd() * 26) / dn('under')) {
          const dep = depthAt(x);
          const room = 70 - dep;
          if (room < 6) continue;
          const r = rnd();
          if (r < 0.2) D.hang.push({ x, y: y + dep - 2, len: Math.min(room, 6 + Math.pow(rnd(), 2) * 34), sw: (rnd() - 0.5) * 12, w: 0.8 + rnd() * 1.4, curl: rnd() * 6, root: true });
          else if (r < 0.62) {
            const n = 2 + Math.floor(rnd() * 3);
            for (let k = 0; k < n; k++) D.drips.push({ x: x + (rnd() - 0.5) * 10, y: y + dep - 3, len: Math.min(room, 4 + Math.pow(rnd(), 1.6) * 22), w: 1.6 + rnd() * 2.6, sw: (rnd() - 0.5) * 5, c: Math.floor(rnd() * 3) });
          } else if (r < 0.8) D.clods.push({ x, y: y + dep + rnd() * 2, r: 1.2 + rnd() * 2.6, v: rnd() });
        }
      }
      // 苔墊往側面垂下的舌狀邊
      for (let x = L + 12 + rnd() * 40; x < R - 10; x += 34 + rnd() * 80) D.tongues.push({ x, r: 8 + rnd() * 22, d: 3 + rnd() * (isGround ? 11 : 9) });
      // 苔墊下緣的查表
      {
        const off = L - 12;
        const tb = new Float32Array(Math.ceil(w) + 26);
        for (let k = 0; k < tb.length; k++) tb[k] = mossLowRaw(D, clamp(off + k, L, R), L, R);
        const last = tb.length - 1;
        D.moss = (x) => {
          const k = Math.round(x - off);
          return tb[k < 0 ? 0 : k > last ? last : k];
        };
      }
      // 草叢（參差的高度與顏色），繩子上下端附近少一點，免得擋到
      if (dn('tuft') > 0) for (let x = L + 2 + rnd() * 10; x < R - 2; x += (9 + rnd() * 26) / dn('tuft')) {
        if (nearRope(x, 12) && rnd() < 0.7) continue;
        const n = 3 + Math.floor(rnd() * 7);
        const tall = rnd() < 0.18 ? 1.6 : 1;
        const blades = [];
        for (let k = 0; k < n; k++) {
          const h = (4 + Math.pow(rnd(), 1.4) * 12) * tall * (M.tuftH || 1);
          blades.push({ dx: (rnd() - 0.5) * 9, h, lean: (rnd() - 0.5) * (h * 0.7), w: 1.1 + rnd() * 1.3, tone: rnd() < 0.25 ? 0 : 1 + Math.floor(rnd() * 4) });
        }
        D.tufts.push({ x, blades });
      }
      // 三葉草小叢
      if (dn('clover') > 0) for (let x = L + 20 + rnd() * 60; x < R - 20; x += (70 + rnd() * 140) / dn('clover')) if (!nearRope(x, 30)) D.clover.push({ x, s: 0.8 + rnd() * 0.5, v: rnd() });
      // 落葉（躺在苔面上）
      if (dn('leaf') > 0) for (let x = L + 6; x < R - 6; x += (18 + rnd() * 60) / dn('leaf')) D.leaves.push({ x, dy: -1 + rnd() * 5, r: 2.6 + rnd() * 2.4, rot: (rnd() - 0.5) * 0.9, c: Math.floor(rnd() * 6), k: rnd() });
      // 小野花（稀疏）
      if (dn('flower') > 0) for (let x = L + 30 + rnd() * 50; x < R - 20; x += (60 + rnd() * 120) / dn('flower')) if (!nearRope(x, 24)) D.flowers.push({ x, h: 5 + rnd() * 7, c: Math.floor(rnd() * 4), s: 1.3 + rnd() * 0.9, k: rnd() });
      // 發光小菇：多半長在平台邊緣或側面，一小群
      if (dn('glow') > 0) for (let x = L + 40 + rnd() * 120; x < R - 30; x += (150 + rnd() * 200) / dn('glow')) {
        if (nearRope(x, 36)) continue;
        const side = !isGround && rnd() < 0.35;
        const n = 1 + Math.floor(rnd() * 3);
        const c = Math.floor(rnd() * 5);
        for (let k = 0; k < n; k++) D.glows.push({ x: x + k * (4 + rnd() * 5), side, dy: side ? 8 + rnd() * Math.max(2, depthAt(x) - 16) : 0, s: (0.7 + rnd() * 0.6) * (k ? 0.75 : 1), c, k: rnd() });
      }
      // 螢光（固定的小光點，畫在平台上方的空氣裡）
      if (dn('fly') > 0) for (let x = L + 30 + rnd() * 200; x < R - 20; x += (260 + rnd() * 360) / dn('fly')) D.flies.push({ x, dy: 12 + rnd() * 28, r: 1 + rnd() * 1.2, c: Math.floor(rnd() * 2), k: rnd() });
      // 材質自己的額外細節（用另一條亂數，不影響上面的排列）
      if (M.onBuild) M.onBuild(D, { map, i, p, L, R, y, w, isGround, rnd: U.seeded(i * 5147 + L * 13 + y * 5 + 97), nearRope, depthAt, lowFx: !!G.lowFx });
      return D;
    });
  }

  // 沿一條折線畫出越來越細的條狀（樹根、苔蘚垂條），加進目前的路徑
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
  function hangPts(h, n) {
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      pts.push(h.x + h.sw * u * u + Math.sin(u * 4 + h.curl) * 1.4 * u, h.y + h.len * u);
    }
    return pts;
  }

  // 苔面的下緣（苔墊的厚度＋垂下來的舌狀邊）
  const mossLow = (D, x, y) => y + D.moss(x);
  function mossLowRaw(D, x, L, R) {
    let d = D.capT + D.capV * fbm(x * 0.05, D.seed + 3);
    for (const t of D.tongues) {
      const u = (x - t.x) / t.r;
      if (u > -1.5 && u < 1.5) d += t.d * Math.exp(-u * u * 2);
    }
    if (!D.isGround) {
      // 兩端的苔往下包住圓頭
      const e = Math.min(x - L, R - x);
      if (e < 18) d += (18 - e) * 0.45;
    }
    return d;
  }

  // ── 小貼圖（土的顆粒、苔的點點）：畫一次、用 pattern 鋪；土地變老時用同一套調色另外畫一張 ──
  const TEX_W = 256;
  const texCache = new Map();
  function texPattern(ctx, map, kind) {
    if (typeof document === 'undefined' || !ctx.createPattern) return null;
    const M = MAT[map.refinedGround];
    const key = map.refinedGround + ':' + kind + ':' + (map._aged || 0);
    let c = texCache.get(key);
    if (!c) {
      const SC = 2;
      const H = kind === 'speck' ? 256 : 26;
      c = document.createElement('canvas');
      c.width = TEX_W * SC;
      c.height = H * SC;
      const g = c.getContext('2d');
      g.scale(SC, SC);
      const r = U.seeded(kind === 'speck' ? 4242 : 777);
      const draw = () => {
        if (kind === 'speck') {
          // 顆粒：四種顏色，大小不一；每一顆也在左右兩邊各畫一次，接縫才看不出來
          for (let cI = 0; cI < 4; cI++) {
            g.fillStyle = M.speck[cI];
            g.beginPath();
            for (let k = 0; k < 330; k++) {
              const x = r() * TEX_W;
              const yy = r() * H;
              const sz = 0.6 + r() * r() * 2.2;
              for (const ox of [0, -TEX_W]) for (const oy of [0, -H]) g.rect(x + ox, yy + oy, sz, sz * 0.8);
            }
            g.fill();
          }
        } else {
          // 苔的點點：亮點集中在上緣，暗點散在下半
          for (let cI = 0; cI < 3; cI++) {
            g.fillStyle = M.mossDot[cI];
            g.beginPath();
            for (let k = 0; k < 130; k++) {
              const x = r() * TEX_W;
              const yy = 2 + r() * (cI === 1 ? 20 : 9);
              const sz = 0.6 + r() * (cI === 1 ? 1.2 : 1.6);
              for (const ox of [0, -TEX_W]) {
                g.moveTo(x + ox + sz, yy);
                g.ellipse(x + ox, yy, sz, sz * 0.7, 0, 0, PI2);
              }
            }
            g.fill();
          }
        }
      };
      if (A.withAge) A.withAge(g, map, draw);
      else draw();
      if (texCache.size > 16) texCache.clear();
      texCache.set(key, c);
    }
    const pat = ctx.createPattern(c, 'repeat');
    if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0]));
    return pat;
  }

  // ── 可重複使用的畫法（也掛在 groundKit 上） ──
  // 地層色帶：list = [{ d, h, k: 'l'|'d', ph, amp }]，y = 平台面，a..b = 要畫的範圍；顏色用 M.soilLight / M.soilDark（'rgba(r,g,b,' 前綴）
  function drawStrata(ctx, M, list, y, a, b) {
    // 地層色帶（波浪狀、粗細不一）
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
      // 色帶上緣一條細細的亮／暗線
      ctx.strokeStyle = s.k === 'd' ? M.soilDark + '0.18)' : M.soilLight + '0.22)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      for (let k = 2; k < top.length; k += 2) ctx.lineTo(top[k], top[k + 1]);
      ctx.stroke();
    }
  }
  // 嵌石：list = [{ x, y, rx, ry, rot, v, moss, j:[8 個半徑抖動], tiny }]；顏色 M.stone[v] = [本體, 暗, 亮]、M.stoneShadow/Hi/Cover/Moss
  function drawStones(ctx, M, list, vis) {
    // 嵌石：陰影、本體、上緣亮面、偶爾長一點苔
    for (const s of list) {
      if (!vis(s.x, 12)) continue;
      const C = M.stone[s.v];
      if (s.tiny) {
        ctx.fillStyle = C[s.v === 2 ? 2 : 1];
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, PI2);
        ctx.fill();
        continue;
      }
      ctx.fillStyle = M.stoneShadow;
      ctx.beginPath();
      ctx.ellipse(s.x + 0.8, s.y + s.ry * 0.45, s.rx * 1.08, s.ry * 0.95, s.rot, 0, PI2);
      ctx.fill();
      const g = ctx.createLinearGradient(s.x - s.rx * 0.4, s.y - s.ry, s.x + s.rx * 0.3, s.y + s.ry);
      g.addColorStop(0, C[2]);
      g.addColorStop(0.4, C[0]);
      g.addColorStop(1, C[1]);
      ctx.fillStyle = g;
      // 不規則的石頭輪廓（8 個點，半徑各自抖動）
      const cs = Math.cos(s.rot);
      const sn = Math.sin(s.rot);
      const outline = () => {
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) {
          const q = k % 8;
          const an = (q / 8) * PI2;
          const px = Math.cos(an) * s.rx * s.j[q];
          const py = Math.sin(an) * s.ry * s.j[q];
          const X = s.x + px * cs - py * sn;
          const Y = s.y + px * sn + py * cs;
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.closePath();
      };
      outline();
      ctx.fill();
      // 上緣的亮邊、下半被土蓋住一點
      ctx.strokeStyle = M.stoneHi;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.rx * 0.82, s.ry * 0.8, s.rot, Math.PI * 1.1, Math.PI * 1.85);
      ctx.stroke();
      ctx.fillStyle = M.stoneCover;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + s.ry * 0.75, s.rx * 1.05, s.ry * 0.45, s.rot, 0, PI2);
      ctx.fill();
      if (s.moss) {
        ctx.fillStyle = M.stoneMoss;
        ctx.beginPath();
        ctx.ellipse(s.x - s.rx * 0.1, s.y - s.ry * 0.7, s.rx * 0.6, s.ry * 0.3, s.rot, 0, PI2);
        ctx.fill();
      }
    }
  }
  // 底面：剝落的土塊 D.clods、垂根 D.hang、滴垂的苔 D.drips（格式同 buildGround）；顏色 M.soil[2]、M.root、M.rootHi、M.hangMoss[3]、M.dripTip
  function drawUnderside(ctx, M, D, vis) {
    ctx.fillStyle = M.soil[2];
    ctx.beginPath();
    for (const c of D.clods) {
      if (!vis(c.x)) continue;
      ctx.moveTo(c.x - c.r, c.y);
      ctx.lineTo(c.x - c.r * 0.3, c.y - c.r * 0.6);
      ctx.lineTo(c.x + c.r, c.y - c.r * 0.2);
      ctx.lineTo(c.x + c.r * 0.5, c.y + c.r * (0.6 + c.v * 0.6));
      ctx.lineTo(c.x - c.r * 0.6, c.y + c.r * 0.7);
      ctx.closePath();
    }
    ctx.fill();
    // 垂根
    ctx.fillStyle = M.root;
    ctx.beginPath();
    for (const h of D.hang) if (vis(h.x, 20)) taperPath(ctx, hangPts(h, 7), h.w * 1.3, 0.35);
    ctx.fill();
    ctx.strokeStyle = M.rootHi;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const h of D.hang) {
      if (!vis(h.x, 20) || h.w < 1.2) continue;
      const q = hangPts(h, 5);
      ctx.moveTo(q[0] - h.w * 0.3, q[1]);
      for (let k = 2; k < q.length - 2; k += 2) ctx.lineTo(q[k] - h.w * 0.3 * (1 - k / q.length), q[k + 1]);
    }
    ctx.stroke();
    // 苔蘚垂條（三種綠，尾端亮一點）
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = M.hangMoss[c];
      ctx.beginPath();
      for (const d of D.drips) {
        if (d.c !== c || !vis(d.x, 10)) continue;
        taperPath(ctx, [d.x, d.y, d.x + d.sw * 0.4, d.y + d.len * 0.5, d.x + d.sw, d.y + d.len], d.w, 0.5);
      }
      ctx.fill();
    }
    ctx.fillStyle = M.dripTip;
    ctx.beginPath();
    for (const d of D.drips) {
      if (!vis(d.x, 10) || d.len < 10) continue;
      ctx.moveTo(d.x + d.sw + 1, d.y + d.len);
      ctx.arc(d.x + d.sw, d.y + d.len, 1, 0, PI2);
    }
    ctx.fill();
    }
  // 草叢：list = [{ x, blades: [{ dx, h, lean, w, tone 0..4 }] }]；顏色 M.blade[5]、草尖亮光 M.rim；lr = [L, R] 時超出兩端的葉子不畫；lvl = 土地變老程度
  function drawTufts(ctx, M, list, y, vis, lr, lvl) {
    // 草叢：暗的在後、亮的在前；每片葉子是彎彎的細三角
    {
      const hk = 1 - 0.25 * lvl;
      for (let tone = 0; tone < 5; tone++) {
        ctx.fillStyle = M.blade[tone];
        ctx.beginPath();
        for (const t of list) {
          if (!vis(t.x, 12)) continue;
          for (const bl of t.blades) {
            if (bl.tone !== tone) continue;
            const x = t.x + bl.dx;
            if (lr && (x < lr[0] + 1 || x > lr[1] - 1)) continue;
            const h = bl.h * hk;
            const by = y - 0.5;
            ctx.moveTo(x - bl.w, by);
            ctx.quadraticCurveTo(x + bl.lean * 0.25 - bl.w * 0.3, by - h * 0.55, x + bl.lean, by - h);
            ctx.quadraticCurveTo(x + bl.lean * 0.3 + bl.w * 0.4, by - h * 0.5, x + bl.w, by);
            ctx.closePath();
          }
        }
        ctx.fill();
      }
      // 草尖上的一點亮光（從背景來的光）
      ctx.strokeStyle = M.rim + '0.45)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (const t of list) {
        if (!vis(t.x, 12)) continue;
        for (const bl of t.blades) {
          if (bl.tone < 3 || bl.h < 8) continue;
          const x = t.x + bl.dx;
          const h = bl.h * hk;
          ctx.moveTo(x + bl.lean * 0.55, y - h * 0.62);
          ctx.lineTo(x + bl.lean * 0.95, y - h * 0.97);
        }
      }
      ctx.stroke();
    }
  }

  // ── 主要的畫法：一次畫一個平台（快取塊裡只會有這一個平台；x0..x1 是這一塊的範圍） ──
  function drawGround(ctx, map, i, x0, x1) {
    if (!map._gnd) buildGround(map);
    const M = MAT[map.refinedGround];
    if (!M || !map._gnd) return;
    const D = map._gnd[i];
    const p = map.platforms[i];
    const L = p[0];
    const R = p[1];
    const y = p[2];
    const isGround = i === 0;
    const lvl = map._aged || 0;
    const keep = 1 - 0.85 * lvl;
    const a = Math.max(L - 20, x0 - 40);
    const b = Math.min(R + 20, x1 + 40);
    const vis = (x, pad) => x > a - (pad || 0) && x < b + (pad || 0);
    const bottomY = isGround ? map.h + 120 : 0;
    const depth = D.depth;
    const lowFx = !!G.lowFx;
    const HK = M.hooks || NOHOOKS;
    const E = { map, i, D, M, L, R, y, w: R - L, isGround, a, b, vis, lvl, keep, depth, bottomY, lowFx, x0, x1 };
    E.mossLow = (x) => mossLow(D, clamp(x, L, R), y);
    // 材質可以整個接手某些平台（橋、木板、冰、雲……自己的形狀）：回傳 true 就不畫預設的土塊
    if (M.custom && M.custom(ctx, E)) return;

    // ── 本體輪廓 ──
    const bodyPath = (E.bodyPath = () => {
      ctx.beginPath();
      if (isGround) {
        ctx.rect(L, y + 1, R - L, bottomY - y);
        return;
      }
      ctx.moveTo(L, y + 1);
      ctx.lineTo(R, y + 1);
      ctx.quadraticCurveTo(R + 5, y + 3, R + 4, y + 9);
      const s0 = Math.ceil((R - 5) / 6) * 6;
      ctx.quadraticCurveTo(R + 2, y + depth(R - 4), R - 5, y + depth(R - 5));
      for (let x = s0 - 6; x > L + 5; x -= 6) ctx.lineTo(x, y + depth(x) + (hash(x * 0.37 + D.seed) - 0.5) * 2.2);
      ctx.lineTo(L + 5, y + depth(L + 5));
      ctx.quadraticCurveTo(L - 2, y + depth(L + 4), L - 4, y + 9);
      ctx.quadraticCurveTo(L - 5, y + 3, L, y + 1);
      ctx.closePath();
    });

    // 浮空土塊底下淡淡的陰影（讓它有重量、跟背景分開）
    if (!isGround) {
      const g = ctx.createLinearGradient(0, y + 20, 0, y + 72);
      g.addColorStop(0, M.underShadow + '0.22)');
      g.addColorStop(1, M.underShadow + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse((L + R) / 2, y + 34, (R - L) / 2 + 6, 34, 0, 0, Math.PI);
      ctx.fill();
    }

    // 土：由上往下變深
    {
      const g = ctx.createLinearGradient(0, y, 0, isGround ? y + 260 : y + 48);
      g.addColorStop(0, M.soil[0]);
      g.addColorStop(0.3, M.soil[1]);
      g.addColorStop(0.72, M.soil[2]);
      g.addColorStop(1, M.soil[3]);
      ctx.fillStyle = g;
      bodyPath();
      ctx.fill();
    }
    if (HK.soil0) HK.soil0(ctx, E);
    ctx.save();
    bodyPath();
    ctx.clip();
    // 大片色塊
    // 省效能模式（手機）：大片色塊（很多放射漸層）不畫
    if (!lowFx) for (const o of D.blotches) {
      if (!vis(o.x, o.r)) continue;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, M.blotch[o.c] + o.a.toFixed(2) + ')');
      g.addColorStop(1, M.blotch[o.c] + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
    }
    drawStrata(ctx, M, D.strata, y, a, b);
    // 土的顆粒：預先畫好的一張顆粒貼圖鋪滿（每個平台錯開原點，不會對齊出格子感）
    {
      const pat = texPattern(ctx, map, 'speck');
      if (pat) {
        ctx.save();
        ctx.translate(Math.round(D.seed * 7), y + Math.round(D.seed * 3));
        ctx.fillStyle = pat;
        ctx.fillRect(a - Math.round(D.seed * 7), 0, b - a, isGround ? Math.min(320, bottomY - y) : 60);
        ctx.restore();
      }
    }
    // 樹根：暗面、本體、亮面三層
    if (D.roots.length) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const trace = (pts, ox, oy) => {
        ctx.moveTo(pts[0] + ox, pts[1] + oy);
        for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k] + ox, pts[k + 1] + oy);
      };
      const list = D.roots.filter((r) => vis(r.pts[0], 200));
      for (const r of list) {
        ctx.strokeStyle = M.rootDark;
        ctx.lineWidth = r.w + 1.6;
        ctx.beginPath();
        trace(r.pts, 0.6, 1);
        ctx.stroke();
        ctx.fillStyle = M.root;
        ctx.beginPath();
        taperPath(ctx, r.pts, r.w * 1.25, r.w * 0.4);
        ctx.fill();
        for (const bb of r.br) {
          const bx = r.pts[bb.k * 2];
          const by = r.pts[bb.k * 2 + 1];
          ctx.beginPath();
          taperPath(ctx, [bx, by, bx + bb.dx * 0.5, by + bb.dy * 0.4, bx + bb.dx, by + bb.dy], r.w * bb.w, 0.4);
          ctx.fill();
        }
      }
      ctx.strokeStyle = M.rootHi;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (const r of list) trace(r.pts, -0.3, -r.w * 0.3);
      ctx.stroke();
    }
    // 細鬚根
    {
      const h = D.hairs;
      ctx.strokeStyle = M.hair;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let k = 0; k < h.length; k += 4) {
        if (!vis(h[k], 10)) continue;
        ctx.moveTo(h[k], h[k + 1]);
        ctx.quadraticCurveTo(h[k] + h[k + 2] * 0.2, h[k + 1] + h[k + 3] * 0.6, h[k] + h[k + 2], h[k + 1] + h[k + 3]);
      }
      ctx.stroke();
      ctx.strokeStyle = M.hairHi;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let k = 0; k < h.length; k += 8) {
        if (!vis(h[k], 10)) continue;
        ctx.moveTo(h[k] - 0.5, h[k + 1]);
        ctx.quadraticCurveTo(h[k] + h[k + 2] * 0.2 - 0.5, h[k + 1] + h[k + 3] * 0.6, h[k] + h[k + 2] - 0.5, h[k + 1] + h[k + 3]);
      }
      ctx.stroke();
    }
    drawStones(ctx, M, D.stones, vis);
    // 苔墊底下的環境光遮蔽（在苔的下緣投一條柔和的陰影）
    {
      const g = ctx.createLinearGradient(0, y + 3, 0, y + 22);
      g.addColorStop(0, M.ao + '0.6)');
      g.addColorStop(0.45, M.ao + '0.22)');
      g.addColorStop(1, M.ao + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(a, y);
      for (let x = a; x <= b; x += 8) ctx.lineTo(x, mossLow(D, x, y, L, R) - 2);
      ctx.lineTo(b, y + 26);
      ctx.lineTo(a, y + 26);
      ctx.closePath();
      ctx.fill();
    }
    // 浮空土塊：底面邊上一道從下方反射上來的魔法冷光，兩端圓頭的側面暗一點
    if (!isGround) {
      ctx.strokeStyle = M.bounce + '0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = Math.max(L + 6, Math.floor(a / 6) * 6); x < Math.min(R - 6, b); x += 6) {
        const yy = y + depth(x) - 1;
        x === Math.max(L + 6, Math.floor(a / 6) * 6) ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
      for (const [ex, dir] of [[L, 1], [R, -1]]) {
        if (!vis(ex, 30)) continue;
        const g = ctx.createLinearGradient(ex, 0, ex + dir * 22, 0);
        g.addColorStop(0, M.endShade + '0.45)');
        g.addColorStop(1, M.endShade + '0)');
        ctx.fillStyle = g;
        ctx.fillRect(Math.min(ex, ex + dir * 22) - 6, y, 28, 60);
      }
    } else {
      // 地面往下越深越暗
      const g = ctx.createLinearGradient(0, y + 60, 0, y + 200);
      g.addColorStop(0, M.deepDark + '0)');
      g.addColorStop(1, M.deepDark + '0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(a, y + 60, b - a, bottomY - y);
    }
    if (HK.soil) HK.soil(ctx, E);
    ctx.restore();

    // ── 底面：剝落的土塊、垂根、滴垂的苔 ──
    if (!isGround) drawUnderside(ctx, M, D, vis);
    if (HK.under) HK.under(ctx, E);

    // ── 苔墊 ──
    const mossPath = (grow) => {
      ctx.beginPath();
      const l = isGround ? a : L - 3 - grow;
      const r = isGround ? b : R + 3 + grow;
      ctx.moveTo(l, y + 4);
      if (!isGround) ctx.quadraticCurveTo(l, y - 2 - grow * 0.3, l + 7, y - 2 - grow * 0.3);
      else ctx.lineTo(l, y - 2 - grow * 0.3);
      ctx.lineTo(isGround ? r : r - 7, y - 2 - grow * 0.3);
      if (!isGround) ctx.quadraticCurveTo(r, y - 2 - grow * 0.3, r, y + 4);
      const st = 5;
      for (let x = r; x >= l; x -= st) ctx.lineTo(x, mossLow(D, clamp(x, L, R), y, L, R) + grow + (hash(x * 0.71 + D.seed) - 0.5) * 1.6);
      ctx.closePath();
    };
    // 軟邊：先一層半透明、稍大的苔，再畫實心的
    ctx.fillStyle = M.mossSoft;
    mossPath(2.2);
    ctx.fill();
    {
      const g = ctx.createLinearGradient(0, y - 2, 0, y + 16);
      g.addColorStop(0, M.moss[3]);
      g.addColorStop(0.22, M.moss[2]);
      g.addColorStop(0.6, M.moss[1]);
      g.addColorStop(1, M.moss[0]);
      ctx.fillStyle = g;
      mossPath(0);
      ctx.fill();
    }
    // 苔墊下緣一道暗邊（苔厚度的側面陰影）
    ctx.strokeStyle = M.capEdge;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    {
      const l = isGround ? a : L;
      const r = isGround ? b : R;
      for (let x = l; x <= r; x += 5) {
        const yy = mossLow(D, clamp(x, L, R), y, L, R) + (hash(x * 0.71 + D.seed) - 0.5) * 1.6 - 0.8;
        x === l ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
    }
    ctx.stroke();
    // 苔的質感：亮點、暗點、一小團一小團的鼓起
    ctx.save();
    mossPath(0);
    ctx.clip();
    {
      const pat = texPattern(ctx, map, 'moss');
      if (pat) {
        ctx.save();
        ctx.translate(Math.round(D.seed * 5), y - 3);
        ctx.fillStyle = pat;
        ctx.fillRect(a - Math.round(D.seed * 5), 0, b - a, 26);
        ctx.restore();
      }
      // 苔團的高光（柔和的一片）
      if (!lowFx) for (let x = Math.floor(a / 34) * 34; x < b; x += 34) {
        const hx = x + hash(x * 0.13 + D.seed) * 26;
        const rr = 7 + hash(x * 0.29) * 9;
        const g = ctx.createRadialGradient(hx, y, 0, hx, y, rr);
        g.addColorStop(0, M.capHi + '0.35)');
        g.addColorStop(1, M.capHi + '0)');
        ctx.fillStyle = g;
        ctx.fillRect(hx - rr, y - rr, rr * 2, rr * 2);
      }
      if (HK.cap) HK.cap(ctx, E);
    }
    ctx.restore();

    // 頂緣的輪廓光（背景的魔法光打在邊上）：整條站立線清楚、亮度有起伏
    {
      const l = isGround ? a : L + 2;
      const r = isGround ? b : R - 2;
      const g = ctx.createLinearGradient(0, y - 9, 0, y - 1);
      g.addColorStop(0, M.rim + '0)');
      g.addColorStop(1, M.rim + '0.16)');
      ctx.fillStyle = g;
      ctx.fillRect(l, y - 9, r - l, 8);
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? M.rimMagic + '0.5)' : M.rim + '0.85)';
        ctx.lineWidth = pass ? 1 : 1.5;
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
        // 圓頭兩端的亮邊往下帶一點
        ctx.strokeStyle = M.rim + '0.5)';
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
    if (HK.rim) HK.rim(ctx, E);

    // ── 頂面：落葉、三葉草、草叢、野花、發光小菇、螢光 ──
    // 落葉（變老的土地落葉多一倍，而且偏枯）
    for (const f of D.leaves) {
      if (!vis(f.x)) continue;
      const extra = f.k < 0.45 + 0.5 * lvl;
      if (!extra) continue;
      const col = lvl && f.k > 0.45 ? M.leafDry[f.c % 3] : M.leaf[f.c];
      const ly = y - 1.5 + f.dy * 0.6;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(f.x, ly, f.r, f.r * 0.42, f.rot, 0, PI2);
      ctx.fill();
      ctx.strokeStyle = M.leafVein;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(f.x - Math.cos(f.rot) * f.r, ly - Math.sin(f.rot) * f.r);
      ctx.lineTo(f.x + Math.cos(f.rot) * f.r, ly + Math.sin(f.rot) * f.r);
      ctx.stroke();
    }
    // 三葉草
    for (const c of D.clover) {
      if (!vis(c.x)) continue;
      for (let k = 0; k < 3; k++) {
        const ang = -Math.PI / 2 + (k - 1) * 0.9;
        const lx = c.x + Math.cos(ang) * 3 * c.s;
        const ly = y - 4 * c.s + Math.sin(ang) * 2.4 * c.s;
        ctx.fillStyle = k === 1 ? M.moss[4] : M.moss[3];
        ctx.beginPath();
        ctx.ellipse(lx, ly, 2.4 * c.s, 1.7 * c.s, ang, 0, PI2);
        ctx.fill();
      }
    }
    drawTufts(ctx, M, D.tufts, y, vis, isGround ? null : [L, R], lvl);
    // 小野花
    for (const f of D.flowers) {
      if (!vis(f.x) || f.k > keep) continue;
      const fy = y - 1 - f.h;
      ctx.strokeStyle = M.blade[1];
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(f.x, y - 1);
      ctx.quadraticCurveTo(f.x + 1.2, y - f.h * 0.5, f.x + 0.4, fy);
      ctx.stroke();
      ctx.fillStyle = M.flower[f.c];
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const px = f.x + 0.4 + Math.cos(k * 1.2566) * f.s;
        const py = fy + Math.sin(k * 1.2566) * f.s * 0.8;
        ctx.moveTo(px + f.s * 0.7, py);
        ctx.arc(px, py, f.s * 0.7, 0, PI2);
      }
      ctx.fill();
      ctx.fillStyle = M.flowerEye;
      ctx.beginPath();
      ctx.arc(f.x + 0.4, fy, f.s * 0.45, 0, PI2);
      ctx.fill();
    }
    // 發光小菇（頂面或側面）
    for (const m of D.glows) {
      if (!vis(m.x, 20) || m.k > keep) continue;
      const [cap, rgb] = M.glow[m.c];
      const s = m.s;
      const bx = m.x;
      const by = m.side ? y + m.dy : y - 0.5;
      const h = m.side ? 4 * s : 7 * s;
      const cx = m.side ? bx + (bx < (L + R) / 2 ? -3 : 3) : bx;
      if (rgb && !lowFx) {
        const g = ctx.createRadialGradient(cx, by - h, 0, cx, by - h, 16 * s);
        g.addColorStop(0, 'rgba(' + rgb + ',0.42)');
        g.addColorStop(0.4, 'rgba(' + rgb + ',0.14)');
        g.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - 16 * s, by - h - 16 * s, 32 * s, 32 * s);
      }
      ctx.strokeStyle = M.shroomStem;
      ctx.lineWidth = 1.3 * s;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx, by - h * 0.6, cx, by - h);
      ctx.stroke();
      const cg = ctx.createLinearGradient(0, by - h - 3.2 * s, 0, by - h + 1);
      cg.addColorStop(0, rgb ? '#ffffff' : M.shroomTop);
      cg.addColorStop(0.35, cap);
      cg.addColorStop(1, rgb ? 'rgba(' + rgb + ',0.75)' : M.shroomBot);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(cx, by - h, 3.6 * s, 2.8 * s, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(cx - 1.4 * s, by - h - 2 * s, 1, 1);
      if (!rgb) {
        ctx.fillStyle = M.shroomSpot;
        ctx.beginPath();
        ctx.arc(cx + 1.2 * s, by - h - 1.6 * s, 0.7 * s, 0, PI2);
        ctx.arc(cx - 1.8 * s, by - h - 0.8 * s, 0.55 * s, 0, PI2);
        ctx.fill();
      }
    }
    // 螢光
    if (!lowFx) for (const f of D.flies) {
      if (!vis(f.x) || f.k > keep * 0.9) continue;
      const rgb = M.glow[f.c][1];
      const fy = y - f.dy;
      const g = ctx.createRadialGradient(f.x, fy, 0, f.x, fy, f.r * 6);
      g.addColorStop(0, 'rgba(' + rgb + ',0.7)');
      g.addColorStop(0.25, 'rgba(' + rgb + ',0.25)');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.x - f.r * 6, fy - f.r * 6, f.r * 12, f.r * 12);
      ctx.fillStyle = 'rgba(255,255,240,0.95)';
      ctx.beginPath();
      ctx.arc(f.x, fy, f.r * 0.6, 0, PI2);
      ctx.fill();
    }
    if (HK.top) HK.top(ctx, E);
  }
  const NOHOOKS = {};
  A.GROUND_ART.forest = drawGround;

  // ── 藤蔓繩：兩股扭在一起的木質藤，葉子有明暗面；每條繩子畫一次成小貼圖 ──
  const ropeCache = new Map();
  function buildVine(map, r, x, top, bottom) {
    const M = MAT[map.refinedGround];
    const V = M.vine || MAT.forest.vine;
    const SC = 2;
    const W = 64;
    const H = Math.ceil(bottom - top + 40);
    const c = document.createElement('canvas');
    c.width = W * SC;
    c.height = H * SC;
    const g = c.getContext('2d');
    g.scale(SC, SC);
    const cx = W / 2;
    const y0 = 4; // 貼圖裡的 top
    const len = bottom - top;
    const rnd = U.seeded(Math.round(x) * 31 + Math.round(top) * 7 + 5);
    const draw = () => {
      g.lineCap = 'round';
      g.lineJoin = 'round';
      // 兩股藤：暗邊 → 本體 → 亮邊
      const strand = (ph, amp) => {
        const pts = [];
        for (let yy = 0; yy <= len + 0.1; yy += 3) pts.push(cx + Math.sin(yy * 0.085 + ph) * amp + Math.sin(yy * 0.021 + ph) * 1.2, y0 + yy);
        return pts;
      };
      const s1 = strand(0, 2.6);
      const s2 = strand(Math.PI, 2.6);
      const path = (pts, ox) => {
        g.beginPath();
        g.moveTo(pts[0] + ox, pts[1]);
        for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k] + ox, pts[k + 1]);
      };
      for (const pts of [s2, s1]) {
        g.strokeStyle = V.shadow;
        g.lineWidth = 7;
        path(pts, 0.7);
        g.stroke();
        g.strokeStyle = pts === s1 ? V.s1 : V.s2;
        g.lineWidth = 5.2;
        path(pts, 0);
        g.stroke();
        g.strokeStyle = V.hi;
        g.lineWidth = 1.1;
        path(pts, -1.1);
        g.stroke();
      }
      // 藤皮的節與細紋
      g.strokeStyle = V.knot;
      g.lineWidth = 0.8;
      g.beginPath();
      for (let yy = 6; yy < len; yy += 7 + rnd() * 6) {
        const xx = cx + Math.sin(yy * 0.085) * 2.6;
        g.moveTo(xx - 2, y0 + yy);
        g.lineTo(xx + 1.6, y0 + yy + 1.5);
      }
      g.stroke();
      // 苔蘚小團
      g.fillStyle = V.moss;
      g.beginPath();
      for (let yy = 14; yy < len - 6; yy += 22 + rnd() * 20) {
        const xx = cx + Math.sin(yy * 0.085) * 2.6;
        g.moveTo(xx + 3, y0 + yy);
        g.ellipse(xx, y0 + yy, 3.2, 2.2, 0, 0, PI2);
      }
      g.fill();
      // 葉子：左右交錯，大小不一；上半亮、下半暗，一條葉脈
      let side = rnd() < 0.5 ? 1 : -1;
      for (let yy = 6 + rnd() * 5; yy < len - 2; yy += 9 + rnd() * 7) {
        side = -side;
        const xx = cx + Math.sin(yy * 0.085) * 2.6;
        const s = 1 + rnd() * 0.6;
        const ang = side * (0.5 + rnd() * 0.5) + 0.25;
        const lx = xx + side * 7 * s;
        const ly = y0 + yy + 2;
        g.save();
        g.translate(lx, ly);
        g.rotate(side > 0 ? ang : Math.PI - ang);
        // 葉柄
        g.strokeStyle = V.stem;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-7 * s, 0);
        g.lineTo(-4 * s, 0);
        g.stroke();
        const tone = rnd();
        g.fillStyle = tone < 0.3 ? V.leaf[0] : tone < 0.75 ? V.leaf[1] : V.leaf[2];
        g.beginPath();
        g.moveTo(-4.5 * s, 0);
        g.quadraticCurveTo(0, -5 * s, 6.5 * s, 0);
        g.quadraticCurveTo(0, 4.4 * s, -4.5 * s, 0);
        g.fill();
        g.fillStyle = V.leafShade;
        g.beginPath();
        g.moveTo(-4.5 * s, 0);
        g.lineTo(6.5 * s, 0);
        g.quadraticCurveTo(0, 4.4 * s, -4.5 * s, 0);
        g.fill();
        g.strokeStyle = V.leafVein;
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(-4 * s, 0);
        g.quadraticCurveTo(0, -0.8 * s, 5.5 * s, 0);
        g.stroke();
        g.restore();
        // 偶爾一條捲鬚
        if (rnd() < 0.25) {
          g.strokeStyle = V.tendril;
          g.lineWidth = 0.9;
          g.beginPath();
          g.moveTo(xx - side * 2, y0 + yy + 5);
          g.quadraticCurveTo(xx - side * 9, y0 + yy + 6, xx - side * 9, y0 + yy + 11);
          g.arc(xx - side * 7.5, y0 + yy + 11, 1.6, Math.PI, Math.PI * 2.6);
          g.stroke();
        }
      }
      // 末端：散開的細根鬚
      g.fillStyle = V.tip;
      g.beginPath();
      for (let k = -2; k <= 2; k++) taperPath(g, [cx, y0 + len - 2, cx + k * 1.6, y0 + len + 5, cx + k * 3, y0 + len + 10 - Math.abs(k)], 1.6, 0.3);
      g.fill();
      // 一朵發光小花苞（變老時沒有）
      if (!map._aged && V.bud) {
        const fy = y0 + len * (0.35 + rnd() * 0.3);
        const fx = cx + 5;
        const gg = g.createRadialGradient(fx, fy, 0, fx, fy, 9);
        gg.addColorStop(0, 'rgba(' + V.bud + ',0.55)');
        gg.addColorStop(1, 'rgba(' + V.bud + ',0)');
        g.fillStyle = gg;
        g.fillRect(fx - 9, fy - 9, 18, 18);
        g.fillStyle = V.budCore;
        g.beginPath();
        g.arc(fx, fy, 1.8, 0, PI2);
        g.fill();
      }
    };
    if (A.withAge) A.withAge(g, map, draw);
    else draw();
    return { c, W, H, y0 };
  }
  // 通用：給一個「畫一次成貼圖」的函數 build(map, r, x, top, bottom) → { c, W, H, y0 }，
  // 回傳 ROPE_ART 用的函數（快取＋以上端為軸的擺動）。opts.topOff：上端往下藏幾 px（預設 6）
  function ropeArt(build, opts) {
    const topOff = opts && opts.topOff !== undefined ? opts.topOff : 6;
    const sway = opts && opts.sway !== undefined ? opts.sway : 2;
    const tag = (opts && opts.tag) || '';
    return function (ctx, r, x, top0, bottom, t, map) {
      const top = r[1] + topOff;
      const key = r[0] + ':' + r[1] + ':' + r[2] + ':' + (map._aged || 0) + ':' + map.refinedGround + tag;
      let e = ropeCache.get(key);
      if (!e) {
        if (ropeCache.size > 64) ropeCache.clear();
        e = build(map, r, x, top, bottom);
        ropeCache.set(key, e);
      }
      const k = Math.sin(t * 0.9 + x * 0.013) * (sway / Math.max(40, bottom - top));
      ctx.save();
      ctx.transform(1, 0, k, 1, -k * top, 0);
      ctx.drawImage(e.c, x - e.W / 2, top - e.y0, e.W, e.H);
      ctx.restore();
    };
  }
  A.ROPE_ART.forest = function (ctx, r, x, top0, bottom, t, map) {
    // 上端藏進上層土塊裡（土塊比繩子晚畫，會蓋住），看起來像從底面長出來的藤
    const top = r[1] + 6;
    const key = r[0] + ':' + r[1] + ':' + r[2] + ':' + (map._aged || 0) + ':' + map.refinedGround;
    let e = ropeCache.get(key);
    if (!e) {
      if (ropeCache.size > 64) ropeCache.clear();
      e = buildVine(map, r, x, top, bottom);
      ropeCache.set(key, e);
    }
    // 以上端為軸輕輕擺動（水平錯切）：下端最多偏 2px 左右
    const k = Math.sin(t * 0.9 + x * 0.013) * (2 / Math.max(40, bottom - top));
    ctx.save();
    ctx.transform(1, 0, k, 1, -k * top, 0);
    ctx.drawImage(e.c, x - e.W / 2, top - e.y0, e.W, e.H);
    ctx.restore();
  };

  // ── groundKit：給其他章節的地形檔重複使用（說明見檔頭與 scratchpad 的 groundkit_api.md；只做加法，不改既有介面） ──
  // 預先畫好的小貼圖（有土地變老時自動走同一套調色；key 會自動加上變老程度）
  const spriteCache = new Map();
  function sprite(key, w, h, map, draw, opts) {
    const k = key + '@' + ((map && map._aged) || 0);
    let c = spriteCache.get(k);
    if (c) return c;
    if (typeof document === 'undefined') return null;
    const SC = (opts && opts.sc) || 2;
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * SC));
    c.height = Math.max(1, Math.ceil(h * SC));
    const g = c.getContext('2d');
    g.scale(SC, SC);
    if (map && map._aged && A.withAge && !(opts && opts.noAge)) A.withAge(g, map, () => draw(g, w, h));
    else draw(g, w, h);
    c.sc = SC;
    if (spriteCache.size > 96) spriteCache.clear();
    spriteCache.set(k, c);
    return c;
  }
  // 把貼圖變成可以鋪滿的 pattern（依貼圖的解析度縮回世界座標）
  function pattern(ctx, c) {
    if (!c || !ctx.createPattern) return null;
    const pat = ctx.createPattern(c, 'repeat');
    const s = 1 / (c.sc || 1);
    if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
    return pat;
  }
  // 無縫顆粒：colors 各畫 n 顆（左右上下各補一次，接縫看不出來）
  function specks(g, w, h, colors, n, seed, size) {
    const r = U.seeded(seed || 4242);
    const sz0 = size || 2.2;
    for (const col of colors) {
      g.fillStyle = col;
      g.beginPath();
      for (let k = 0; k < n; k++) {
        const x = r() * w;
        const yy = r() * h;
        const sz = 0.6 + r() * r() * sz0;
        for (const ox of [0, -w]) for (const oy of [0, -h]) g.rect(x + ox, yy + oy, sz, sz * 0.8);
      }
      g.fill();
    }
  }
  // 以某個材質為底，覆蓋幾個欄位做出新材質（vine / density / depthShape / cap / hooks 會逐欄合併）
  function material(base, over) {
    const B = typeof base === 'string' ? MAT[base] : base;
    const out = Object.assign({}, B, over);
    for (const k of ['vine', 'density', 'depthShape', 'cap', 'hooks']) if (B && B[k] && over && over[k]) out[k] = Object.assign({}, B[k], over[k]);
    return out;
  }
  // 登記材質：地圖寫 refinedGround: key 就用通用畫法（除非 opts.ground 給了自己的畫法）；繩子預設用藤蔓（opts.rope 可換或給 false）
  function register(key, mat, opts) {
    MAT[key] = mat;
    mat.key = key;
    A.GROUND_ART[key] = (opts && opts.ground) || drawGround;
    if (opts && opts.rope === false) delete A.ROPE_ART[key];
    else A.ROPE_ART[key] = (opts && opts.rope) || A.ROPE_ART[key] || vineRope;
    return mat;
  }
  const vineRope = ropeArt(buildVine);
  // 主題會換的地圖（試玩練功場）：依目前的主題決定材質；其他章節可以往這張表加
  const THEME_GROUND = { forestMorning: 'forestMorning', forestMushroom: 'forest' };
  const kit = (A.groundKit = A.groundKit || {});
  Object.assign(kit, {
    version: 1,
    PI2, hash, vnoise, fbm, clamp, pick,
    seeded: U.seeded,
    lowFx: () => !!G.lowFx,
    MAT, material, register,
    buildGround, drawGround, mossLow: (D, x, y) => mossLow(D, x, y),
    taperPath, hangPts,
    drawStrata, drawStones, drawUnderside, drawTufts,
    texPattern, sprite, pattern, specks,
    ropeArt, buildVine, vineRope,
    THEME_GROUND,
    ribbon, // v1.1：ribbon(ctx, pts, widths[], ox, oy) 每點各自寬度的條狀路徑
  });

  // ════════════════════════════════════════════════════════════
  // 第一章其他地圖的材質（1-2 的 'forest' 維持原樣）
  //   forestMorning：1-1 苔光小徑（營地）、試玩練功場 —— 晨光、露珠、營地裡被踩出來的小路
  //   forestDeep：1-3 木漏日深谷 —— 更深的綠、蕨類、灑在苔上的光斑、長苔的石頭、更粗的根
  //   rootCave：1-4 古樹根洞 —— 冷色洞土、巨大的樹根、會發光的菌（層孔菌、小菇、孢子）、根做的繩
  //   queenHall：1-B 女王菇的殿堂 —— 紫紅的菌絲土、寶石碎晶、菌絲；浮空平台是一朵朵大菇傘
  // ════════════════════════════════════════════════════════════
  const glowBlob = (ctx, x, y, r, rgb, al) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + al + ')');
    g.addColorStop(0.4, 'rgba(' + rgb + ',' + (al * 0.35).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  // 露珠：苔面上幾顆小亮點（每顆一個亮心＋淡淡的一圈）
  function drawDew(ctx, E, list) {
    const { vis, y } = E;
    ctx.fillStyle = 'rgba(235,255,250,0.35)';
    ctx.beginPath();
    for (const d of list) {
      if (!vis(d.x)) continue;
      ctx.moveTo(d.x + d.r * 1.8, y + d.dy);
      ctx.arc(d.x, y + d.dy, d.r * 1.8, 0, PI2);
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    for (const d of list) {
      if (!vis(d.x)) continue;
      ctx.moveTo(d.x + d.r, y + d.dy);
      ctx.arc(d.x, y + d.dy, d.r, 0, PI2);
    }
    ctx.fill();
  }
  // 草叢在某一段變矮、變少（營地、Boss 場地的站立帶）
  function thinTop(D, x1, x2, hk, keepFrac, rnd) {
    D.tufts = D.tufts.filter((t) => t.x < x1 || t.x > x2 || rnd() < keepFrac);
    for (const t of D.tufts) if (t.x >= x1 && t.x <= x2) for (const bl of t.blades) { bl.h *= hk; bl.lean *= hk; }
  }
  const outside = (list, x1, x2) => list.filter((o) => o.x < x1 || o.x > x2);

  // ── 1-1 苔光小徑：晨光 ──
  register('forestMorning', material('forest', {
    soil: ['#7a5538', '#62432b', '#47301f', '#321f13'],
    soilLight: 'rgba(196,152,100,',
    blotch: ['rgba(146,108,64,', 'rgba(52,36,20,', 'rgba(116,100,62,'],
    moss: ['#36662a', '#4c8834', '#66a640', '#8ec85a', '#bce680'],
    mossSoft: 'rgba(96,152,58,0.45)',
    mossDot: ['rgba(222,250,160,0.5)', 'rgba(40,76,24,0.32)', 'rgba(180,230,112,0.42)'],
    blade: ['#2d5e22', '#4a8b32', '#69aa42', '#93cb5e', '#c2e688'],
    rim: 'rgba(255,248,214,',
    rimMagic: 'rgba(255,226,160,',
    bounce: 'rgba(255,214,160,',
    capHi: 'rgba(236,252,168,',
    capEdge: 'rgba(30,54,18,0.5)',
    glow: [['#ffd98e', '255,220,150'], ['#c8f59a', '190,255,150'], ['#e0704a', null], ['#e89a4e', null], ['#f4a0b8', null]],
    flower: ['#fff4b0', '#ffffff', '#ffb8d0', '#c8b8ff'],
    density: { glow: 0.45, flower: 1.8, fly: 0.35, leaf: 0.7, clover: 1.3 },
    vine: { bud: '255,236,170', budCore: '#fffbe8' },
    onBuild(D, I) {
      const { rnd, L, R, isGround, map } = I;
      D.dew = [];
      for (let x = L + 6 + rnd() * 20; x < R - 6; x += 14 + rnd() * 40) D.dew.push({ x, dy: -1 + rnd() * 3.5, r: 0.6 + rnd() * 0.7 });
      D.path = [];
      const C = isGround && map.camp;
      if (C) {
        // 營地：房子和 NPC 站的地方草矮一點、少一點，不長小菇小花；中間有一條被踩出來的土路
        const x1 = C.x1 - 60;
        const x2 = C.x2 + 60;
        thinTop(D, x1, x2, 0.55, 0.55, rnd);
        D.flowers = outside(D.flowers, x1, x2);
        D.glows = outside(D.glows, x1, x2);
        D.clover = outside(D.clover, x1, x2);
        D.dew = outside(D.dew, x1 + 60, x2 - 60);
        for (let x = C.x1 - 20; x < C.x2 + 20; x += 18 + rnd() * 26) D.path.push({ x, r: 14 + rnd() * 20, dy: 2 + rnd() * 3, a: 0.35 + rnd() * 0.25 });
      }
    },
    hooks: {
      cap(ctx, E) {
        const { D, y, vis } = E;
        // 被踩出來的土路：苔被磨掉一塊塊，露出淺土色（只在苔面裡）
        if (D.path.length) {
          ctx.fillStyle = 'rgba(150,112,70,0.5)';
          for (const p of D.path) {
            if (!vis(p.x, p.r)) continue;
            ctx.globalAlpha = p.a;
            ctx.beginPath();
            ctx.ellipse(p.x, y + p.dy, p.r, 3.2, 0, 0, PI2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(214,180,130,0.35)';
          ctx.beginPath();
          for (const p of D.path) {
            if (!vis(p.x, p.r)) continue;
            ctx.moveTo(p.x + p.r * 0.6, y + p.dy - 1.2);
            ctx.ellipse(p.x, y + p.dy - 1.2, p.r * 0.6, 1.2, 0, 0, PI2);
          }
          ctx.fill();
        }
      },
      top(ctx, E) {
        drawDew(ctx, E, E.D.dew);
      },
    },
  }));

  // ── 1-3 木漏日深谷：深綠、蕨類、光斑 ──
  function drawFerns(ctx, E, list, cols) {
    const { vis, y, keep } = E;
    for (const f of list) {
      if (!vis(f.x, 30) || f.k > 0.4 + keep * 0.6) continue;
      for (const fr of f.fronds) {
        // 一片蕨葉：彎彎的葉軸＋兩側一對對的小羽片，由下往上變小
        const n = 7;
        const pts = [];
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          pts.push(f.x + fr.dx + fr.lean * u * u, y - 0.5 - fr.h * u + fr.droop * u * u * u);
        }
        ctx.fillStyle = cols[fr.tone];
        ctx.beginPath();
        for (let k = 1; k < n; k++) {
          const px = pts[k * 2];
          const py = pts[k * 2 + 1];
          const tx = pts[k * 2 + 2] - pts[k * 2 - 2];
          const ty = pts[k * 2 + 3] - pts[k * 2 - 1];
          const l = Math.hypot(tx, ty) || 1;
          const nx = -ty / l;
          const ny = tx / l;
          const s = fr.w * (1 - k / (n + 1.5));
          for (const sd of [-1, 1]) {
            const ex = px + nx * s * sd + (tx / l) * s * 0.5;
            const ey = py + ny * s * sd + (ty / l) * s * 0.5 + s * 0.25;
            ctx.moveTo(px, py);
            ctx.quadraticCurveTo((px + ex) / 2 + (tx / l) * s * 0.4, (py + ey) / 2 + (ty / l) * s * 0.4 - 0.6, ex, ey);
            ctx.quadraticCurveTo((px + ex) / 2 - (tx / l) * s * 0.2, (py + ey) / 2 + 0.8, px + (tx / l) * 1.5, py + (ty / l) * 1.5);
          }
        }
        ctx.fill();
        ctx.strokeStyle = cols[Math.max(0, fr.tone - 1)];
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
        ctx.stroke();
      }
    }
  }
  register('forestDeep', material('forest', {
    soil: ['#5e412c', '#48311f', '#332215', '#21160d'],
    soilLight: 'rgba(170,128,84,',
    blotch: ['rgba(118,86,52,', 'rgba(36,24,14,', 'rgba(78,90,54,'],
    speck: ['rgba(196,160,112,0.2)', 'rgba(14,8,4,0.3)', 'rgba(140,112,80,0.24)', 'rgba(80,120,60,0.24)'],
    stone: [['#646c5c', '#40463a', '#8e977f'], ['#5a5e56', '#3a3d37', '#82877c'], ['#6e6858', '#48432f', '#98907a']],
    root: '#4a3322',
    moss: ['#1f4a1c', '#2e6526', '#417f32', '#5fa043', '#8ac462'],
    mossSoft: 'rgba(52,108,40,0.45)',
    mossDot: ['rgba(176,230,120,0.42)', 'rgba(18,48,14,0.4)', 'rgba(130,196,84,0.4)'],
    blade: ['#1a4216', '#2d6a24', '#458a32', '#66a846', '#92c86a'],
    rim: 'rgba(255,246,204,',
    rimMagic: 'rgba(210,255,190,',
    bounce: 'rgba(150,220,170,',
    stoneMoss: 'rgba(84,146,56,0.8)',
    capEdge: 'rgba(14,36,12,0.6)',
    hangMoss: ['#2a5620', '#3d7a2e', '#5a9a40'],
    leaf: ['#9aa83c', '#b8b048', '#7f9434', '#d0b850', '#a07a38', '#6f8a30'],
    leafDry: ['#a8883e', '#8a6a38', '#b89a58'],
    glow: [['#8ff5dc', '140,255,220'], ['#c8f59a', '190,255,150'], ['#e0704a', null], ['#d8c890', null], ['#b0f0a0', '170,255,160']],
    density: { flower: 0.5, glow: 0.8, stone: 1.35, root: 1.3, leaf: 0.85, clover: 1.5, under: 1.2 },
    rootW: 1.25,
    tuftH: 1.1,
    depthShape: { base: 33, a: 13 },
    vine: { s1: '#62783a', s2: '#4a5e28', leaf: ['#3f7e30', '#58a03c', '#7aba52'] },
    onBuild(D, I) {
      const { rnd, L, R, isGround, nearRope, lowFx } = I;
      for (const s of D.stones) if (!s.tiny && rnd() < 0.45) s.moss = true;
      D.ferns = [];
      for (let x = L + 30 + rnd() * 80; x < R - 24; x += (isGround ? 110 : 90) + rnd() * 170) {
        if (nearRope(x, 30)) continue;
        const n = 3 + Math.floor(rnd() * 3);
        const big = isGround ? 1.2 : 1;
        const fronds = [];
        for (let k = 0; k < n; k++) {
          const side = k % 2 ? 1 : -1;
          const h = (12 + rnd() * 12) * big;
          fronds.push({ dx: (rnd() - 0.5) * 6, h, lean: side * (6 + rnd() * 12) * big, droop: h * (0.15 + rnd() * 0.3), w: 3 + rnd() * 1.6, tone: 1 + Math.floor(rnd() * 4) });
        }
        fronds.sort((p, q) => p.tone - q.tone);
        D.ferns.push({ x, fronds, k: rnd() });
      }
      // 從樹冠縫隙灑下來的光斑（落在苔面上，偶爾落在土的側面）
      D.dapples = [];
      if (!lowFx) for (let x = L + rnd() * 60; x < R; x += 60 + rnd() * 140) D.dapples.push({ x, r: 10 + rnd() * 22, dy: rnd() * 3, face: rnd() < 0.35, fy: 8 + rnd() * (isGround ? 40 : 14), a: 0.5 + rnd() * 0.5 });
    },
    hooks: {
      soil(ctx, E) {
        const { D, y, vis } = E;
        for (const d of D.dapples) {
          if (!d.face || !vis(d.x, d.r)) continue;
          const g = ctx.createRadialGradient(d.x, y + d.fy, 0, d.x, y + d.fy, d.r * 0.8);
          g.addColorStop(0, 'rgba(255,220,150,' + (0.14 * d.a).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(255,220,150,0)');
          ctx.fillStyle = g;
          ctx.fillRect(d.x - d.r, y + d.fy - d.r, d.r * 2, d.r * 2);
        }
      },
      cap(ctx, E) {
        const { D, y, vis } = E;
        for (const d of D.dapples) {
          if (!vis(d.x, d.r)) continue;
          const g = ctx.createRadialGradient(d.x, y + d.dy, 0, d.x, y + d.dy, d.r);
          g.addColorStop(0, 'rgba(255,246,170,' + (0.42 * d.a).toFixed(3) + ')');
          g.addColorStop(0.5, 'rgba(240,250,150,' + (0.16 * d.a).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(240,250,150,0)');
          ctx.fillStyle = g;
          ctx.save();
          ctx.translate(d.x, y + d.dy);
          ctx.scale(1, 0.45);
          ctx.translate(-d.x, -(y + d.dy));
          ctx.fillRect(d.x - d.r, y + d.dy - d.r, d.r * 2, d.r * 2);
          ctx.restore();
        }
      },
      top(ctx, E) {
        drawFerns(ctx, E, E.D.ferns, E.M.blade);
      },
    },
  }));

  // ── 1-4 古樹根洞：洞土、巨根、發光菌 ──
  // 沿折線畫出寬度逐點指定的條狀（ws 每個點一個寬度），加進目前的路徑
  function ribbon(ctx, pts, ws, ox, oy) {
    const n = pts.length / 2;
    const Lp = [];
    const Rp = [];
    for (let k = 0; k < n; k++) {
      const k0 = Math.max(0, k - 1);
      const k1 = Math.min(n - 1, k + 1);
      let tx = pts[k1 * 2] - pts[k0 * 2];
      let ty = pts[k1 * 2 + 1] - pts[k0 * 2 + 1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
      const w = ws[k] / 2;
      const x = pts[k * 2] + (ox || 0);
      const y = pts[k * 2 + 1] + (oy || 0);
      Lp.push(x - ty * w, y + tx * w);
      Rp.push(x + ty * w, y - tx * w);
    }
    ctx.moveTo(Lp[0], Lp[1]);
    for (let k = 1; k < n; k++) ctx.lineTo(Lp[k * 2], Lp[k * 2 + 1]);
    for (let k = n - 1; k >= 0; k--) ctx.lineTo(Rp[k * 2], Rp[k * 2 + 1]);
    ctx.closePath();
  }
  // 巨根：r = { pts, ws（每點寬度）, seed, moss:[{k, r}] }；暗邊→本體→上半亮面→樹皮縱紋與橫節→上緣冷光→苔塊
  function drawGiantRoot(ctx, M, r) {
    const P = r.pts;
    const W = r.ws;
    const n = P.length / 2;
    const C = M.giant;
    ctx.fillStyle = M.rootDark;
    ctx.beginPath();
    ribbon(ctx, P, W.map((w) => w + 3), 0.8, 1.6);
    ctx.fill();
    if (r.br) {
      ctx.fillStyle = M.rootDark;
      ctx.beginPath();
      for (const q of r.br) taperPath(ctx, q.pts.map((v, k) => v + (k % 2 ? 1.2 : 0.6)), q.w + 2, 1);
      ctx.fill();
      ctx.fillStyle = C[1];
      ctx.beginPath();
      for (const q of r.br) taperPath(ctx, q.pts, q.w, 0.5);
      ctx.fill();
    }
    ctx.fillStyle = C[1];
    ctx.beginPath();
    ribbon(ctx, P, W);
    ctx.fill();
    // 下半比較暗（圓柱的背光面）、上半一道亮面：沿法線把色帶推到下側／上側
    const off = (s) => {
      const out = [];
      for (let k = 0; k < n; k++) {
        const k0 = Math.max(0, k - 1);
        const k1 = Math.min(n - 1, k + 1);
        const tx = P[k1 * 2] - P[k0 * 2];
        const ty = P[k1 * 2 + 1] - P[k0 * 2 + 1];
        const l = Math.hypot(tx, ty) || 1;
        // 法線固定取「往下」的那一側
        let nx = -ty / l;
        let ny = tx / l;
        if (ny < 0 || (ny === 0 && nx < 0)) {
          nx = -nx;
          ny = -ny;
        }
        out.push(P[k * 2] + nx * W[k] * s, P[k * 2 + 1] + ny * W[k] * s);
      }
      return out;
    };
    ctx.fillStyle = C[0];
    ctx.globalAlpha = 0.6;
    ribbon(ctx, off(0.3), W.map((w) => w * 0.4));
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C[2];
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ribbon(ctx, off(-0.2), W.map((w) => w * 0.28));
    ctx.fill();
    ctx.globalAlpha = 1;
    // 樹皮縱紋
    ctx.strokeStyle = 'rgba(18,10,6,0.55)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (const s of [-0.22, 0.05, 0.3]) {
      const q = off(s + 0.08 * Math.sin(r.seed + s * 7));
      let on = false;
      for (let k = 0; k < n; k++) {
        const draw = W[k] > 5 && hash(Math.floor(k / 2) * 3.1 + s * 10 + r.seed) > 0.35;
        if (draw && !on) ctx.moveTo(q[k * 2], q[k * 2 + 1]);
        else if (draw) ctx.lineTo(q[k * 2], q[k * 2 + 1]);
        on = draw;
      }
    }
    ctx.stroke();
    // 橫向的樹皮節
    ctx.strokeStyle = 'rgba(14,8,4,0.5)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    const up = off(-0.42);
    const dn = off(0.42);
    for (let k = 1; k < n - 1; k++) {
      if (W[k] < 5 || hash(k * 7.7 + r.seed) < 0.6) continue;
      ctx.moveTo(up[k * 2], up[k * 2 + 1]);
      ctx.quadraticCurveTo(P[k * 2] + 2, P[k * 2 + 1], dn[k * 2], dn[k * 2 + 1]);
    }
    ctx.stroke();
    // 上緣的冷光
    ctx.strokeStyle = M.giantHi;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    const rim = off(-0.47);
    for (let k = 0; k < n; k++) k ? ctx.lineTo(rim[k * 2], rim[k * 2 + 1]) : ctx.moveTo(rim[0], rim[1]);
    ctx.stroke();
    // 苔塊（長在根的上緣）
    if (r.moss) {
      ctx.fillStyle = M.stoneMoss;
      ctx.beginPath();
      for (const m of r.moss) {
        if (m.k >= n) continue;
        const x = rim[m.k * 2];
        const yy = rim[m.k * 2 + 1] + 1;
        ctx.moveTo(x + m.r, yy);
        ctx.ellipse(x, yy, m.r, m.r * 0.42, 0, 0, PI2);
      }
      ctx.fill();
      ctx.fillStyle = M.capHi + '0.5)';
      ctx.beginPath();
      for (const m of r.moss) {
        if (m.k >= n) continue;
        const x = rim[m.k * 2];
        const yy = rim[m.k * 2 + 1];
        ctx.moveTo(x + m.r * 0.5, yy);
        ctx.ellipse(x - m.r * 0.2, yy, m.r * 0.5, m.r * 0.18, 0, 0, PI2);
      }
      ctx.fill();
    }
  }
  // 層孔菌：一片片扇形的棚狀菌（側面看是半圓，上面有年輪紋、下緣發冷光），2～3 片疊在一起
  function drawShelves(ctx, E, list) {
    const { vis, keep, lowFx, M } = E;
    const C = M.shelf;
    for (const s of list) {
      if (!vis(s.x, 24) || s.k > 0.3 + keep * 0.7) continue;
      if (!lowFx) glowBlob(ctx, s.x + s.dir * s.r * 0.5, s.y + s.r * 0.4, s.r * 2.4, M.shelfGlow, 0.26);
      for (let k = 0; k < s.n; k++) {
        const r = s.r * (1 - k * 0.22);
        const bx = s.x + s.dir * k * 2;
        const by = s.y + k * s.r * 0.62;
        const cx = bx + s.dir * r * 0.55;
        // 下面（菌孔面）：淡色、發光
        ctx.fillStyle = C[3];
        ctx.beginPath();
        ctx.ellipse(cx, by + 0.6, r, r * 0.3, 0, 0, Math.PI);
        ctx.fill();
        // 上面：扇形的頂，由根部暗到邊緣亮
        const g = ctx.createLinearGradient(bx, 0, bx + s.dir * r * 1.6, 0);
        g.addColorStop(0, C[0]);
        g.addColorStop(0.6, C[1]);
        g.addColorStop(1, C[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, by, r, r * 0.52, 0, Math.PI, 0);
        ctx.ellipse(cx, by, r, r * 0.16, 0, 0, Math.PI);
        ctx.fill();
        // 年輪紋
        ctx.strokeStyle = M.shelfLine;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (const f of [0.45, 0.72]) {
          ctx.moveTo(cx - r * f, by - 0.2);
          ctx.ellipse(cx, by - 0.2, r * f, r * 0.5 * f, 0, Math.PI, 0);
        }
        ctx.stroke();
        // 發光的緣
        ctx.strokeStyle = M.shelfEdge;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(cx, by + 0.3, r, r * 0.2, 0, 0.15, Math.PI - 0.15);
        ctx.stroke();
      }
    }
  }
  function buildRootRope(map, r, x, top, bottom) {
    const M = MAT[map.refinedGround];
    const SC = 2;
    const W = 56;
    const len = bottom - top;
    const H = Math.ceil(len + 36);
    const c = document.createElement('canvas');
    c.width = W * SC;
    c.height = H * SC;
    const g = c.getContext('2d');
    g.scale(SC, SC);
    const cx = W / 2;
    const y0 = 4;
    const rnd = U.seeded(Math.round(x) * 17 + Math.round(top) * 5 + 3);
    const draw = () => {
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const pts = [];
      const ph = rnd() * 6;
      for (let yy = 0; yy <= len + 0.1; yy += 4) pts.push(cx + Math.sin(yy * 0.045 + ph) * 2.4 + Math.sin(yy * 0.13 + ph * 2) * 0.9, y0 + yy);
      // 分出去的細根（先畫，壓在主根後面）
      const kids = [];
      for (let yy = 16 + rnd() * 16; yy < len - 10; yy += 26 + rnd() * 30) {
        const k = Math.round(yy / 4);
        const sx = pts[k * 2];
        const sd = rnd() < 0.5 ? -1 : 1;
        const l = 10 + rnd() * 16;
        kids.push([sx, y0 + yy, sx + sd * l * 0.6, y0 + yy + l * 0.5, sx + sd * (l * 0.8 + 2), y0 + yy + l + rnd() * 6]);
      }
      g.fillStyle = M.rootRope[0];
      g.beginPath();
      for (const q of kids) taperPath(g, q, 2.6, 0.4);
      g.fill();
      // 主根：暗邊 → 本體 → 樹皮紋 → 亮邊
      g.fillStyle = 'rgba(8,8,10,0.6)';
      g.beginPath();
      taperPath(g, pts.map((v, k) => (k % 2 ? v : v + 0.9)), 11, 6.2);
      g.fill();
      g.fillStyle = M.rootRope[1];
      g.beginPath();
      taperPath(g, pts, 9.2, 4.8);
      g.fill();
      g.strokeStyle = M.rootRope[0];
      g.lineWidth = 0.9;
      g.beginPath();
      for (let yy = 5; yy < len; yy += 5 + rnd() * 6) {
        const k = Math.min(pts.length / 2 - 1, Math.round(yy / 4));
        const xx = pts[k * 2];
        g.moveTo(xx - 2.8, y0 + yy);
        g.quadraticCurveTo(xx, y0 + yy + 1.6, xx + 2.6, y0 + yy + 0.4);
      }
      g.stroke();
      g.strokeStyle = M.rootRope[2];
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(pts[0] - 2, pts[1]);
      for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k] - 2 + (k / pts.length) * 0.8, pts[k + 1]);
      g.stroke();
      // 苔蘚小團
      g.fillStyle = M.stoneMoss;
      g.beginPath();
      for (let yy = 20 + rnd() * 20; yy < len - 8; yy += 34 + rnd() * 30) {
        const k = Math.round(yy / 4);
        const xx = pts[k * 2];
        g.moveTo(xx + 4, y0 + yy);
        g.ellipse(xx + 0.5, y0 + yy, 3.6, 1.8, 0.3, 0, PI2);
      }
      g.fill();
      // 發光的小球菌（變老時少一些）
      const nb = map._aged ? 1 : 2 + Math.floor(rnd() * 2);
      for (let q = 0; q < nb; q++) {
        const yy = len * (0.2 + (q / nb) * 0.7 + rnd() * 0.1);
        const k = Math.min(pts.length / 2 - 1, Math.round(yy / 4));
        const sd = q % 2 ? 1 : -1;
        const fx = pts[k * 2] + sd * 4.2;
        const fy = y0 + yy;
        const gg = g.createRadialGradient(fx, fy, 0, fx, fy, 10);
        gg.addColorStop(0, 'rgba(' + M.shelfGlow + ',0.55)');
        gg.addColorStop(1, 'rgba(' + M.shelfGlow + ',0)');
        g.fillStyle = gg;
        g.fillRect(fx - 10, fy - 10, 20, 20);
        g.fillStyle = '#c8fff4';
        g.beginPath();
        g.arc(fx, fy, 2, 0, PI2);
        g.arc(fx + sd * 2.6, fy + 2.4, 1.4, 0, PI2);
        g.fill();
        g.fillStyle = '#f4fffe';
        g.fillRect(fx - 0.8, fy - 1, 1, 1);
      }
      // 末端：散開的鬚根
      g.fillStyle = M.rootRope[1];
      g.beginPath();
      const ex = pts[pts.length - 2];
      for (let k = -2; k <= 2; k++) taperPath(g, [ex, y0 + len - 3, ex + k * 1.8, y0 + len + 6, ex + k * 3.4 + Math.sin(k) * 2, y0 + len + 14 - Math.abs(k) * 2], 2, 0.3);
      g.fill();
    };
    if (A.withAge) A.withAge(g, map, draw);
    else draw();
    return { c, W, H, y0 };
  }
  register('rootCave', material('forest', {
    soil: ['#4c4038', '#3b3029', '#2a221d', '#1a1512'],
    soilLight: 'rgba(150,140,130,',
    soilDark: 'rgba(10,8,8,',
    blotch: ['rgba(96,86,78,', 'rgba(18,14,14,', 'rgba(60,78,80,'],
    speck: ['rgba(180,170,160,0.2)', 'rgba(8,6,6,0.34)', 'rgba(120,112,104,0.24)', 'rgba(120,220,220,0.14)'],
    stone: [['#58606a', '#383e46', '#848c96'], ['#50565c', '#34383e', '#7a8088'], ['#5e5a58', '#3c3836', '#8a8480']],
    root: '#3e2c22',
    rootDark: 'rgba(8,6,6,0.55)',
    rootHi: 'rgba(170,200,196,0.4)',
    giant: ['#22170f', '#5a4230', '#9a7a58'],
    giantHi: 'rgba(170,230,220,0.42)',
    moss: ['#16302a', '#1f4436', '#2c5c44', '#4a8060', '#7cb88a'],
    mossSoft: 'rgba(40,88,70,0.45)',
    mossDot: ['rgba(150,240,210,0.4)', 'rgba(6,20,16,0.4)', 'rgba(110,200,160,0.36)'],
    blade: ['#123024', '#1f4a36', '#2f6a4a', '#4f9070', '#8cc8a4'],
    rim: 'rgba(200,255,240,',
    rimMagic: 'rgba(120,230,255,',
    bounce: 'rgba(100,220,230,',
    underShadow: 'rgba(0,6,8,',
    hair: 'rgba(40,30,26,0.75)',
    hairHi: 'rgba(160,190,186,0.25)',
    stoneShadow: 'rgba(4,4,6,0.4)',
    stoneHi: 'rgba(200,240,240,0.28)',
    stoneCover: 'rgba(30,26,24,0.4)',
    stoneMoss: 'rgba(64,120,92,0.75)',
    ao: 'rgba(4,6,6,',
    endShade: 'rgba(6,6,8,',
    deepDark: 'rgba(4,4,6,',
    dripTip: 'rgba(160,245,255,0.85)',
    capEdge: 'rgba(6,18,14,0.6)',
    capHi: 'rgba(150,240,210,',
    hangMoss: ['#1c3a2e', '#2a5240', '#3c6e56'],
    leaf: ['#7a6a44', '#8a7040', '#6a5a3a', '#94844e', '#5e5236', '#806440'],
    leafDry: ['#6a5a40', '#5a4a36', '#7a6a4e'],
    glow: [['#8ff5f0', '140,250,255'], ['#9ab8ff', '150,180,255'], ['#c9a0ff', '200,160,255'], ['#8ff5c0', '140,255,200'], ['#8ff5f0', '140,250,255']],
    shroomStem: '#d8ecea',
    shelf: ['#2a2420', '#5e5a48', '#8e9a80', 'rgba(170,250,236,0.75)'],
    shelfLine: 'rgba(24,20,16,0.45)',
    shelfEdge: 'rgba(170,255,240,0.85)',
    shelfGlow: '120,240,230',
    rootRope: ['#2a1e17', '#4e3a2a', 'rgba(170,220,210,0.45)'],
    density: { leaf: 0.25, flower: 0, clover: 0.4, glow: 1.8, fly: 1.5, tuft: 0.55, under: 1.1, root: 1 },
    cap: { thick: 5.5, vary: 2.6 },
    tuftH: 0.85,
    depthShape: { base: 32 },
    onBuild(D, I) {
      const { rnd, L, R, y, isGround, depthAt, nearRope } = I;
      D.giants = [];
      D.shelves = [];
      if (isGround) {
        // 地面：幾條巨根彎彎曲曲地橫著穿過上層土（上緣藏在苔下），一端粗一端細，慢慢往深處鑽
        for (let x = L - 100 + rnd() * 200; x < R; x += 380 + rnd() * 420) {
          const dir = rnd() < 0.5 ? -1 : 1;
          const len = 320 + rnd() * 380;
          const d0 = 17 + rnd() * 10;
          const dive = 30 + rnd() * 80;
          const w0 = 22 + rnd() * 10;
          const ph = rnd() * 6;
          const f1 = 2 + rnd() * 2;
          const pts = [];
          const ws = [];
          for (let k = 0; k <= 28; k++) {
            const u = k / 28;
            // 粗的那一端從苔層底下鑽進土裡（不會露出一個平平的切口）
            const rise = u < 0.12 ? Math.pow(1 - u / 0.12, 1.5) * (d0 - 3) : 0;
            pts.push(x + dir * len * u, y + d0 - rise + Math.sin(u * f1 * 3.1 + ph) * (4 + 8 * u) * (1 - rise / d0) + u * u * dive);
            ws.push(w0 * (1 - 0.75 * u) * (1 + 0.13 * Math.sin(u * 23 + ph) + 0.08 * Math.sin(u * 51 + ph * 2)));
          }
          const moss = [];
          for (let k = 1; k < 22; k += 3 + Math.floor(rnd() * 4)) moss.push({ k, r: 3 + rnd() * 5 });
          const br = [];
          for (let k = 6; k < 26; k += 5 + Math.floor(rnd() * 6)) {
            const bx = pts[k * 2];
            const by = pts[k * 2 + 1];
            const bl = 20 + rnd() * 40;
            const bd = rnd() < 0.5 ? -1 : 1;
            br.push({ pts: [bx, by, bx + bd * bl * 0.4, by + bl * 0.35, bx + bd * bl * 0.7, by + bl * 0.8], w: ws[k] * 0.45 });
          }
          D.giants.push({ pts, ws, br, seed: rnd() * 50, moss, x0: Math.min(x, x + dir * len) - 40, x1: Math.max(x, x + dir * len) + 40 });
        }
        for (let x = L + 60 + rnd() * 120; x < R - 40; x += 170 + rnd() * 240) if (!nearRope(x, 30)) D.shelves.push({ x, y: y + 18 + rnd() * 30, r: 8 + rnd() * 7, n: 1 + Math.floor(rnd() * 3), dir: rnd() < 0.5 ? -1 : 1, k: rnd() });
      } else {
        // 浮空土塊：一條巨根從土塊一端冒出來，貼著側面走一段，再順著弧線彎下去從底面垂出，尾端分岔
        const dir = rnd() < 0.5 ? 1 : -1;
        const sx = dir > 0 ? L - 6 : R + 6;
        const ex = dir > 0 ? L + (R - L) * (0.4 + rnd() * 0.3) : R - (R - L) * (0.4 + rnd() * 0.3);
        const d0 = 17 + rnd() * 3;
        const w0 = 14 + rnd() * 5;
        const ph = rnd() * 6;
        const bot = y + Math.min(70, depthAt(ex) + 26 + rnd() * 20);
        const ex2 = ex + dir * (26 + rnd() * 16);
        // 三次貝茲：起點（端頭）→ 沿側面 → 彎下 → 垂出底面
        const P0 = [sx, y + d0 + 2];
        const P1 = [ex, y + d0 - 1];
        const P2 = [ex2, y + d0 + 2];
        const P3 = [ex2 + dir * 4, bot];
        const pts = [];
        const ws = [];
        for (let k = 0; k <= 26; k++) {
          const u = k / 26;
          const v = 1 - u;
          const X = v * v * v * P0[0] + 3 * v * v * u * P1[0] + 3 * v * u * u * P2[0] + u * u * u * P3[0];
          const Y = v * v * v * P0[1] + 3 * v * v * u * P1[1] + 3 * v * u * u * P2[1] + u * u * u * P3[1];
          pts.push(X + Math.sin(u * 13 + ph) * 1.2, Y + Math.sin(u * 9 + ph) * 1.2);
          const t = u < 0.55 ? 1 - u * 0.35 : 0.81 * Math.pow((1 - u) / 0.45, 0.8);
          ws.push(Math.max(1.2, w0 * t * (1 + 0.12 * Math.sin(u * 21 + ph))));
        }
        const br = [];
        for (const k of [18, 21, 23]) {
          if (rnd() < 0.3) continue;
          const bx = pts[k * 2];
          const by = pts[k * 2 + 1];
          const bd = rnd() < 0.5 ? -1 : 1;
          const bl = Math.min(y + 72 - by, 10 + rnd() * 18);
          if (bl > 5) br.push({ pts: [bx, by, bx + bd * bl * 0.45, by + bl * 0.45, bx + bd * bl * 0.6, by + bl], w: ws[k] * 0.5 });
        }
        const moss = [];
        for (let k = 2; k < 14; k += 3 + Math.floor(rnd() * 3)) moss.push({ k, r: 3 + rnd() * 4 });
        D.giants.push({ pts, ws, br, seed: rnd() * 50, moss });
        // 層孔菌：長在土塊兩端的側面與底面邊上
        for (const [ex2, dd] of [[L, -1], [R, 1]]) if (rnd() < 0.8) D.shelves.push({ x: ex2 + dd * 1, y: y + 12 + rnd() * 8, r: 7 + rnd() * 5, n: 2 + Math.floor(rnd() * 2), dir: dd, k: rnd() });
        for (let x = L + 50 + rnd() * 80; x < R - 50; x += 130 + rnd() * 200) if (!nearRope(x, 24)) D.shelves.push({ x, y: y + depthAt(x) - 6, r: 6 + rnd() * 5, n: 1 + Math.floor(rnd() * 2), dir: rnd() < 0.5 ? -1 : 1, k: rnd() });
      }
      // 發光小菇多半長在邊上，一叢一叢比較密
      for (const g of D.glows) g.s *= 0.9;
    },
    hooks: {
      soil(ctx, E) {
        if (!E.isGround) return;
        for (const r of E.D.giants) if (r.x1 > E.a - 30 && r.x0 < E.b + 30) drawGiantRoot(ctx, E.M, r);
      },
      under(ctx, E) {
        if (!E.isGround) for (const r of E.D.giants) drawGiantRoot(ctx, E.M, r);
        drawShelves(ctx, E, E.D.shelves);
      },
    },
  }), { rope: ropeArt(buildRootRope, { tag: ':root' }) });

  // ── 1-B 女王菇的殿堂：菌絲土、寶石碎晶；浮空平台是大菇傘 ──
  function drawGems(ctx, E, list) {
    const { vis, lowFx, M } = E;
    for (const g of list) {
      if (!vis(g.x, 20)) continue;
      const C = M.gem[g.c];
      if (!lowFx && g.glow) glowBlob(ctx, g.x, g.y, g.s * 3.4, C[3], 0.32);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot);
      for (const sh of g.shards) {
        const s = g.s * sh.s;
        const ox = sh.dx;
        // 一根六角晶柱：亮面／暗面兩半＋尖端
        ctx.fillStyle = C[1];
        ctx.beginPath();
        ctx.moveTo(ox - s * 0.45, 0);
        ctx.lineTo(ox - s * 0.45, -s * 1.3);
        ctx.lineTo(ox + sh.lean, -s * 2);
        ctx.lineTo(ox + s * 0.45, -s * 1.3);
        ctx.lineTo(ox + s * 0.45, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = C[0];
        ctx.beginPath();
        ctx.moveTo(ox - s * 0.45, 0);
        ctx.lineTo(ox - s * 0.45, -s * 1.3);
        ctx.lineTo(ox + sh.lean, -s * 2);
        ctx.lineTo(ox + sh.lean * 0.5, -s * 1.1);
        ctx.lineTo(ox, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = C[2];
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(ox - s * 0.3, -s * 0.2);
        ctx.lineTo(ox - s * 0.3, -s * 1.2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  // 菌絲：細細的淡紫白絲網，在土裡分岔；尾端一點微光
  function drawMycelium(ctx, E, list) {
    const { vis, M } = E;
    ctx.strokeStyle = M.myc;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (const m of list) {
      if (!vis(m.pts[0], 80)) continue;
      const P = m.pts;
      ctx.moveTo(P[0], P[1]);
      for (let k = 2; k < P.length; k += 2) ctx.lineTo(P[k], P[k + 1]);
      for (const br of m.br) {
        ctx.moveTo(P[br.k * 2], P[br.k * 2 + 1]);
        ctx.quadraticCurveTo(P[br.k * 2] + br.dx * 0.5, P[br.k * 2 + 1] + br.dy * 0.2, P[br.k * 2] + br.dx, P[br.k * 2 + 1] + br.dy);
      }
    }
    ctx.stroke();
    ctx.fillStyle = M.mycTip;
    ctx.beginPath();
    for (const m of list) {
      if (!vis(m.pts[0], 80)) continue;
      for (const br of m.br) {
        const x = m.pts[br.k * 2] + br.dx;
        const yy = m.pts[br.k * 2 + 1] + br.dy;
        ctx.moveTo(x + 1.1, yy);
        ctx.arc(x, yy, 1.1, 0, PI2);
      }
    }
    ctx.fill();
  }
  // 浮空的大菇傘平台：傘面（厚厚的側面＋白色疣點）、頂上一層菌絲絨毛、傘下的菌褶、短短的菌柄與菌環
  function capPlatform(ctx, E) {
    if (E.isGround) return false;
    const { L, R, y, M, D, vis, keep, lowFx, map, lvl } = E;
    const C = M.capP;
    const cx = (L + R) / 2;
    const hw = (R - L) / 2;
    const rimAt = (x) => {
      // 傘緣：中間高一點（離站立線 15px），兩端往下捲（20px），邊緣波浪
      const u = clamp(Math.abs(x - cx) / (hw + 6), 0, 1);
      return y + 18 + u * u * u * 12 + Math.sin(x * 0.16 + D.seed) * 2.2 * (0.6 + 0.4 * Math.sin(x * 0.031 + D.seed)) + (hash(Math.round(x / 7) + D.seed) - 0.5) * 1.2;
    };
    const topL = L - 8;
    const topR = R + 8;
    const capPath = () => {
      ctx.beginPath();
      ctx.moveTo(L + 6, y - 2);
      ctx.lineTo(R - 6, y - 2);
      ctx.bezierCurveTo(R + 5, y - 2, topR + 1, y + 5, topR, y + 12);
      ctx.quadraticCurveTo(topR - 1, rimAt(R + 3) + 1, R + 2, rimAt(R + 2));
      for (let x = R; x >= L; x -= 5) ctx.lineTo(x, rimAt(x));
      ctx.lineTo(L - 2, rimAt(L - 2));
      ctx.quadraticCurveTo(topL + 1, rimAt(L - 3) + 1, topL, y + 12);
      ctx.bezierCurveTo(topL - 1, y + 5, L - 5, y - 2, L + 6, y - 2);
      ctx.closePath();
    };
    // 陰影
    {
      const g = ctx.createLinearGradient(0, y + 20, 0, y + 74);
      g.addColorStop(0, M.underShadow + '0.26)');
      g.addColorStop(1, M.underShadow + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, y + 30, hw + 8, 42, 0, 0, Math.PI);
      ctx.fill();
    }
    // 菌柄：往下漸漸淡進暗處（先畫成小貼圖、在貼圖裡做淡出）；上面一圈裙狀菌環
    const sw = Math.min(46, 24 + hw * 0.1);
    {
      const SWd = Math.round(sw);
      const w = SWd * 1.6;
      const h = 54;
      const spr = sprite('qh-stem:' + SWd + ':' + (M.key || ''), w, h, map, (g) => {
        const c0 = w / 2;
        const gr = g.createLinearGradient(c0 - SWd / 2, 0, c0 + SWd / 2, 0);
        gr.addColorStop(0, C.stem[1]);
        gr.addColorStop(0.35, C.stem[0]);
        gr.addColorStop(1, C.stem[2]);
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(c0 - SWd * 0.42, 0);
        g.bezierCurveTo(c0 - SWd * 0.5, 22, c0 - SWd * 0.6, 38, c0 - SWd * 0.68, h);
        g.lineTo(c0 + SWd * 0.68, h);
        g.bezierCurveTo(c0 + SWd * 0.6, 38, c0 + SWd * 0.5, 22, c0 + SWd * 0.42, 0);
        g.closePath();
        g.fill();
        g.strokeStyle = C.stemLine;
        g.lineWidth = 0.7;
        g.beginPath();
        for (let k = -3; k <= 3; k++) {
          const x = c0 + k * SWd * 0.11;
          g.moveTo(x, 4);
          g.quadraticCurveTo(x + k * 0.8, 28, x + k * 1.8, h);
        }
        g.stroke();
        // 菌環
        g.fillStyle = C.ring[0];
        g.beginPath();
        g.moveTo(c0 - SWd * 0.46, 6);
        g.quadraticCurveTo(c0, 3, c0 + SWd * 0.46, 6);
        g.lineTo(c0 + SWd * 0.64, 15);
        for (let k = 6; k >= -6; k--) g.lineTo(c0 + k * SWd * 0.106, 14 + (k % 2 ? 2.4 : 0) + Math.abs(k) * 0.2);
        g.closePath();
        g.fill();
        g.strokeStyle = C.ring[1];
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(c0 - SWd * 0.5, 7.5);
        g.quadraticCurveTo(c0, 5, c0 + SWd * 0.5, 7.5);
        g.moveTo(c0 - SWd * 0.6, 15.5);
        g.lineTo(c0 + SWd * 0.6, 15.5);
        g.stroke();
        // 淡出
        g.globalCompositeOperation = 'destination-in';
        const f = g.createLinearGradient(0, 0, 0, h);
        f.addColorStop(0, 'rgba(0,0,0,1)');
        f.addColorStop(0.45, 'rgba(0,0,0,0.9)');
        f.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = f;
        g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'source-over';
      });
      if (spr) ctx.drawImage(spr, cx - w / 2, y + 22, w, h);
    }
    // 菌褶：傘緣下面一圈往中心收的細褶
    {
      const gy = (x) => rimAt(x) + 1;
      const inner = y + 26;
      ctx.fillStyle = C.gill[0];
      ctx.beginPath();
      ctx.moveTo(L - 6, gy(L - 6));
      for (let x = L - 6; x <= R + 6; x += 3) ctx.lineTo(x, gy(x) - 2);
      ctx.lineTo(cx + sw * 0.5, inner);
      ctx.lineTo(cx - sw * 0.5, inner);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C.gill[1];
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let x = Math.max(L - 4, Math.floor(E.a / 5) * 5); x <= Math.min(R + 4, E.b); x += 4.5) {
        const t = (x - cx) / (hw + 6);
        ctx.moveTo(x, gy(x) + 3);
        ctx.lineTo(cx + t * sw * 0.45, inner + 0.5);
      }
      ctx.stroke();
      ctx.strokeStyle = C.gill[2];
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = L - 6; x <= R + 6; x += 6) (x === L - 6 ? ctx.moveTo : ctx.lineTo).call(ctx, x, gy(x) + 0.6);
      ctx.stroke();
    }
    // 傘下垂著的孢子滴、菌絲
    {
      ctx.strokeStyle = M.myc;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (const h of D.capHang) {
        if (!vis(h.x, 10)) continue;
        const y0 = rimAt(h.x) + 2;
        ctx.moveTo(h.x, y0);
        ctx.quadraticCurveTo(h.x + h.sw * 0.5, y0 + h.len * 0.5, h.x + h.sw, y0 + h.len);
      }
      ctx.stroke();
      for (const h of D.capHang) {
        if (!vis(h.x, 10) || !h.drop || h.k > keep) continue;
        const x = h.x + h.sw;
        const yy = rimAt(h.x) + 2 + h.len;
        if (!lowFx) glowBlob(ctx, x, yy, 7, C.spore, 0.5);
        ctx.fillStyle = C.drop;
        ctx.beginPath();
        ctx.moveTo(x, yy - 2.6);
        ctx.quadraticCurveTo(x + 1.8, yy, x, yy + 1.6);
        ctx.quadraticCurveTo(x - 1.8, yy, x, yy - 2.6);
        ctx.fill();
      }
    }
    // 傘面
    {
      const g = ctx.createLinearGradient(0, y - 2, 0, y + 28);
      g.addColorStop(0, C.face[0]);
      g.addColorStop(0.3, C.face[1]);
      g.addColorStop(0.75, C.face[2]);
      g.addColorStop(1, C.face[3]);
      ctx.fillStyle = g;
      capPath();
      ctx.fill();
      ctx.save();
      capPath();
      ctx.clip();
      // 顆粒
      const pat = texPattern(ctx, map, 'speck');
      if (pat) {
        ctx.save();
        ctx.translate(Math.round(D.seed * 7), y + Math.round(D.seed * 3));
        ctx.fillStyle = pat;
        ctx.fillRect(E.a - Math.round(D.seed * 7), -4, E.b - E.a, 36);
        ctx.restore();
      }
      // 放射狀的細紋（傘面的纖維）
      ctx.strokeStyle = C.streak;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let x = Math.floor(E.a / 9) * 9; x < E.b; x += 9) {
        const off = (hash(x * 0.37 + D.seed) - 0.5) * 4;
        const t = (x - cx) / (hw + 8);
        ctx.moveTo(x + off, y + 10 + hash(x * 0.53) * 6);
        ctx.lineTo(x + off + t * 3, rimAt(x) - 1);
      }
      ctx.stroke();
      // 傘肩的柔光（圓頂的受光面）、靠近傘緣的暗帶
      {
        const g3 = ctx.createLinearGradient(0, y, 0, y + 28);
        g3.addColorStop(0, 'rgba(255,210,236,0)');
        g3.addColorStop(0.18, C.shoulder);
        g3.addColorStop(0.45, 'rgba(255,210,236,0)');
        g3.addColorStop(0.8, 'rgba(30,4,24,0)');
        g3.addColorStop(1, 'rgba(30,4,24,0.35)');
        ctx.fillStyle = g3;
        ctx.fillRect(E.a, y - 2, E.b - E.a, 32);
      }
      // 兩端圓頭的暗面
      for (const [ex, dir] of [[topL, 1], [topR, -1]]) {
        const g2 = ctx.createLinearGradient(ex, 0, ex + dir * 26, 0);
        g2.addColorStop(0, M.endShade + '0.5)');
        g2.addColorStop(1, M.endShade + '0)');
        ctx.fillStyle = g2;
        ctx.fillRect(Math.min(ex, ex + dir * 26), y - 4, 26, 36);
      }
      // 傘緣的一道反光（下方的魔法光）
      ctx.strokeStyle = M.bounce + '0.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let x = L - 4; x <= R + 4; x += 5) (x === L - 4 ? ctx.moveTo : ctx.lineTo).call(ctx, x, rimAt(x) - 0.6);
      ctx.stroke();
      ctx.restore();
      // 白色疣點（傘面上的斑，有亮面與陰影）
      for (const s of D.warts) {
        if (!vis(s.x, 10)) continue;
        const wy = y + s.dy;
        ctx.fillStyle = C.wart[1];
        ctx.beginPath();
        ctx.ellipse(s.x + 0.6, wy + 0.8, s.r, s.r * 0.62, 0, 0, PI2);
        ctx.fill();
        ctx.fillStyle = C.wart[0];
        ctx.beginPath();
        ctx.ellipse(s.x, wy, s.r, s.r * 0.6, 0, 0, PI2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.ellipse(s.x - s.r * 0.3, wy - s.r * 0.22, s.r * 0.36, s.r * 0.2, 0, 0, PI2);
        ctx.fill();
      }
    }
    // 頂上一層菌絲絨毛（站立面，軟邊、往下垂一點）
    {
      const low = (x) => y + 3.2 + 1.6 * fbm(x * 0.06, D.seed + 3) + D.fuzzAt(x);
      const fuzz = (grow) => {
        ctx.beginPath();
        ctx.moveTo(L - 2 - grow, y + 3);
        ctx.quadraticCurveTo(L - 2 - grow, y - 2 - grow * 0.3, L + 6, y - 2 - grow * 0.3);
        ctx.lineTo(R - 6, y - 2 - grow * 0.3);
        ctx.quadraticCurveTo(R + 2 + grow, y - 2 - grow * 0.3, R + 2 + grow, y + 3);
        for (let x = R + 2; x >= L - 2; x -= 5) ctx.lineTo(x, low(clamp(x, L, R)) + grow);
        ctx.closePath();
      };
      ctx.fillStyle = M.mossSoft;
      fuzz(1.8);
      ctx.fill();
      const g = ctx.createLinearGradient(0, y - 2, 0, y + 8);
      g.addColorStop(0, M.moss[3]);
      g.addColorStop(0.4, M.moss[2]);
      g.addColorStop(1, M.moss[1]);
      ctx.fillStyle = g;
      fuzz(0);
      ctx.fill();
      ctx.save();
      fuzz(0);
      ctx.clip();
      const pat = texPattern(ctx, map, 'moss');
      if (pat) {
        ctx.save();
        ctx.translate(Math.round(D.seed * 5), y - 3);
        ctx.fillStyle = pat;
        ctx.fillRect(E.a - Math.round(D.seed * 5), 0, E.b - E.a, 26);
        ctx.restore();
      }
      ctx.restore();
      ctx.strokeStyle = M.capEdge;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let x = L; x <= R; x += 5) (x === L ? ctx.moveTo : ctx.lineTo).call(ctx, x, low(x) - 0.6);
      ctx.stroke();
    }
    // 輪廓光
    {
      const g = ctx.createLinearGradient(0, y - 9, 0, y - 1);
      g.addColorStop(0, M.rim + '0)');
      g.addColorStop(1, M.rim + '0.16)');
      ctx.fillStyle = g;
      ctx.fillRect(L + 2, y - 9, R - L - 4, 8);
      ctx.strokeStyle = M.rim + '0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(L + 4, y - 2);
      ctx.lineTo(R - 4, y - 2);
      ctx.stroke();
      ctx.strokeStyle = M.rimMagic + '0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(L + 8, y - 2);
      ctx.quadraticCurveTo(L - 6, y - 2, topL + 1, y + 10);
      ctx.moveTo(R - 8, y - 2);
      ctx.quadraticCurveTo(R + 6, y - 2, topR - 1, y + 10);
      ctx.stroke();
    }
    // 傘面兩端長出來的小菇（會發光）、頂上幾株矮草
    for (const m of D.capShrooms) {
      if (!vis(m.x, 16) || m.k > keep) continue;
      const [cap, rgb] = M.glow[m.c];
      const s = m.s;
      const bx = m.x;
      const by = y + m.dy;
      const h = 5 * s;
      const cx2 = bx + m.dir * 3 * s;
      if (rgb && !lowFx) glowBlob(ctx, cx2, by - h, 14 * s, rgb, 0.4);
      ctx.strokeStyle = M.shroomStem;
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + m.dir * s, by - h * 0.6, cx2, by - h);
      ctx.stroke();
      ctx.fillStyle = cap;
      ctx.beginPath();
      ctx.ellipse(cx2, by - h, 3.4 * s, 2.5 * s, m.dir * 0.3, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(cx2 - 1.2 * s, by - h - 1.8 * s, 1, 1);
    }
    drawTufts(ctx, M, D.tufts, y, vis, [L, R], lvl);
    if (!lowFx) for (const f of D.flies) {
      if (!vis(f.x) || f.k > keep * 0.9) continue;
      const rgb = M.glow[f.c][1] || '255,200,240';
      glowBlob(ctx, f.x, y - f.dy, f.r * 6, rgb, 0.7);
      ctx.fillStyle = 'rgba(255,245,252,0.95)';
      ctx.beginPath();
      ctx.arc(f.x, y - f.dy, f.r * 0.6, 0, PI2);
      ctx.fill();
    }
    return true;
  }
  register('queenHall', material('forest', {
    soil: ['#5e3c5c', '#482c48', '#342034', '#221522'],
    soilLight: 'rgba(206,160,206,',
    soilDark: 'rgba(22,8,24,',
    blotch: ['rgba(140,96,142,', 'rgba(28,12,30,', 'rgba(110,80,130,'],
    speck: ['rgba(230,190,230,0.2)', 'rgba(16,6,18,0.3)', 'rgba(170,130,176,0.24)', 'rgba(255,170,230,0.16)'],
    stone: [['#6a5a70', '#483c4e', '#978aa0'], ['#5e5468', '#3e3648', '#8a809a'], ['#74606e', '#4c3e4a', '#a08c9c']],
    root: '#8e6e96',
    rootDark: 'rgba(24,8,28,0.45)',
    rootHi: 'rgba(255,230,255,0.32)',
    rootW: 0.5,
    moss: ['#5a3268', '#76468a', '#9660aa', '#ba86cc', '#e0b4ec'],
    mossSoft: 'rgba(150,96,170,0.45)',
    mossDot: ['rgba(255,214,250,0.45)', 'rgba(40,14,48,0.36)', 'rgba(230,170,240,0.4)'],
    blade: ['#4e2c5c', '#6e4282', '#9060a6', '#b886cc', '#e2b8ee'],
    rim: 'rgba(255,232,250,',
    rimMagic: 'rgba(255,170,230,',
    bounce: 'rgba(255,150,220,',
    underShadow: 'rgba(16,4,20,',
    hair: 'rgba(210,184,220,0.36)',
    hairHi: 'rgba(255,240,255,0.3)',
    stoneShadow: 'rgba(14,4,16,0.38)',
    stoneHi: 'rgba(255,236,255,0.3)',
    stoneCover: 'rgba(52,30,54,0.38)',
    stoneMoss: 'rgba(176,120,196,0.7)',
    ao: 'rgba(16,4,18,',
    endShade: 'rgba(18,6,20,',
    deepDark: 'rgba(12,4,14,',
    dripTip: 'rgba(255,200,244,0.75)',
    capEdge: 'rgba(40,14,48,0.55)',
    capHi: 'rgba(255,214,250,',
    leafVein: 'rgba(120,40,90,0.4)',
    hangMoss: ['#4e2c5c', '#6e4282', '#9a68b0'],
    leaf: ['#f0a0c8', '#e880b0', '#f8c0dc', '#d890e0', '#f6d0e8', '#c070a8'],
    leafDry: ['#b890a8', '#a07890', '#c8a8b8'],
    flower: ['#fff0fa', '#ffd0ea', '#e8c8ff', '#ffffff'],
    flowerEye: '#ffe07a',
    glow: [['#ff9ad8', '255,150,220'], ['#c9a0ff', '200,160,255'], ['#e0704a', null], ['#ffb0e0', '255,180,230'], ['#8ff5f0', '140,250,255']],
    shroomStem: '#f4e4f0',
    myc: 'rgba(236,214,244,0.3)',
    mycTip: 'rgba(255,220,250,0.8)',
    gem: [['#ffc0ec', '#d860b0', 'rgba(255,255,255,0.7)', '255,150,220'], ['#d8c0ff', '#8a60d8', 'rgba(255,255,255,0.7)', '190,160,255'], ['#b8fff4', '#40b8b0', 'rgba(255,255,255,0.7)', '140,250,240']],
    capP: {
      face: ['#e0609c', '#b83e78', '#8a2a5e', '#58163e'],
      streak: 'rgba(60,10,40,0.2)',
      shoulder: 'rgba(255,200,230,0.22)',
      wart: ['#fbeef2', '#b87ea0'],
      gill: ['#e8c8d8', 'rgba(150,90,120,0.55)', 'rgba(255,240,248,0.6)'],
      stem: ['#cdb8cc', '#7a6480', '#a08aa6'],
      stemLine: 'rgba(140,110,130,0.35)',
      ring: ['#e4d4e2', 'rgba(110,80,110,0.6)'],
      spore: '255,160,230',
      drop: '#ffd8f4',
    },
    vine: { s1: '#6a7a44', s2: '#52602f', leaf: ['#5f8a48', '#76a656', '#90bf6a'], bud: '255,170,230', budCore: '#fff0fa' },
    density: { root: 1.4, hair: 1.2, stone: 1.1, leaf: 0.6, flower: 0.6, clover: 0.5, tuft: 0.8, under: 1.2 },
    tuftH: 0.6,
    onBuild(D, I) {
      const { rnd, L, R, y, isGround, map, nearRope } = I;
      D.gems = [];
      D.myc = [];
      if (isGround) {
        // Boss 場地：中間一整段站立帶保持乾淨（草更矮、沒有小菇小花、落葉少），豐富的東西放在土的側面
        const x1 = L + 260;
        const x2 = R - 260;
        thinTop(D, x1, x2, 0.7, 0.6, rnd);
        D.glows = outside(D.glows, x1, x2);
        D.flowers = outside(D.flowers, x1, x2);
        D.clover = outside(D.clover, x1, x2);
        D.leaves = D.leaves.filter((f) => f.x < x1 || f.x > x2 || f.k < 0.25);
        for (let x = L + 30 + rnd() * 80; x < R - 20; x += 90 + rnd() * 150) {
          const n = 1 + Math.floor(rnd() * 4);
          const shards = [];
          for (let k = 0; k < n; k++) shards.push({ dx: (k - (n - 1) / 2) * (3 + rnd() * 3), s: 0.6 + rnd() * 0.6, lean: (rnd() - 0.5) * 3 });
          D.gems.push({ x, y: y + 22 + Math.pow(rnd(), 1.2) * 200, s: 4 + rnd() * 5, c: Math.floor(rnd() * 3), rot: (rnd() - 0.5) * 1.4, shards, glow: rnd() < 0.6 });
        }
      } else {
        for (let x = L + 30 + rnd() * 60; x < R - 30; x += 70 + rnd() * 110) {
          const shards = [{ dx: 0, s: 0.8 + rnd() * 0.4, lean: (rnd() - 0.5) * 2 }, { dx: 3, s: 0.5 + rnd() * 0.3, lean: 1 }];
          D.gems.push({ x, y: y + 12 + rnd() * 8, s: 2.6 + rnd() * 2, c: Math.floor(rnd() * 3), rot: (rnd() - 0.5) * 1.2, shards, glow: rnd() < 0.5 });
        }
      }
      // 菌絲網：地面在上層土裡橫著蔓延
      for (let x = L + rnd() * 80; x < R; x += (isGround ? 110 : 90) + rnd() * 120) {
        const pts = [];
        let px = x;
        let py = y + 12 + rnd() * (isGround ? 60 : 8);
        for (let k = 0; k < 7; k++) {
          pts.push(px, py);
          px += 10 + rnd() * 16;
          py += (rnd() - 0.4) * (isGround ? 10 : 4);
        }
        const br = [];
        for (let k = 1; k < 6; k++) if (rnd() < 0.6) br.push({ k, dx: (rnd() - 0.5) * 20, dy: 4 + rnd() * 12 });
        D.myc.push({ pts, br });
      }
      // 菇傘平台用的細節
      D.warts = [];
      D.capHang = [];
      D.capShrooms = [];
      if (!isGround) {
        for (let x = L + 6 + rnd() * 16; x < R - 4; x += 12 + rnd() * 26) {
          const r0 = 1.2 + Math.pow(rnd(), 1.6) * 4.6;
          D.warts.push({ x, dy: 7 + rnd() * 12, r: r0 });
          if (r0 > 3.5 && rnd() < 0.6) D.warts.push({ x: x + 5 + rnd() * 3, dy: 9 + rnd() * 9, r: 1 + rnd() * 1.2 });
        }
        for (let x = L - 2 + rnd() * 10; x < R + 2; x += 14 + rnd() * 26) if (!nearRope(x, 10)) D.capHang.push({ x, len: 3 + Math.pow(rnd(), 2) * 22, sw: (rnd() - 0.5) * 8, drop: rnd() < 0.5, k: rnd() });
        for (const [ex, dir] of [[L - 4, -1], [R + 4, 1]]) {
          const n = 1 + Math.floor(rnd() * 3);
          for (let k = 0; k < n; k++) D.capShrooms.push({ x: ex - dir * k * 5, dy: 6 + k * 3 + rnd() * 3, s: 0.7 + rnd() * 0.5, dir, c: Math.floor(rnd() * 5), k: rnd() });
        }
        // 絨毛下緣的垂邊
        const tg = [];
        for (let x = L + 10 + rnd() * 30; x < R - 10; x += 30 + rnd() * 60) tg.push({ x, r: 6 + rnd() * 14, d: 1.5 + rnd() * 3 });
        D.fuzzAt = (x) => {
          let d = 0;
          for (const t of tg) {
            const u = (x - t.x) / t.r;
            if (u > -1.5 && u < 1.5) d += t.d * Math.exp(-u * u * 2);
          }
          return d;
        };
      }
    },
    hooks: {
      soil(ctx, E) {
        drawMycelium(ctx, E, E.D.myc);
        drawGems(ctx, E, E.D.gems);
      },
    },
    custom: capPlatform,
  }));


  // ── 接上 prepareMap：算好細節；平台底下的舊藤蔓垂條改由快取裡的垂根、垂苔取代 ──
  const basePrep = A.prepareMap;
  A.prepareMap = function (map) {
    if (G.data.maps && map === G.data.maps.DEMO) {
      const k = THEME_GROUND[map.theme];
      if (k && MAT[k]) map.refinedGround = k;
      else delete map.refinedGround;
      delete map._gnd;
    }
    basePrep(map);
    if (map.refinedGround && MAT[map.refinedGround]) {
      buildGround(map);
      map._hang = [];
    }
  };
  // 試玩練功場換章節時是同一個地圖物件（只換主題），平台快取認不出來、會留著舊章節的地形；
  // 所以每個主題給一個代理物件（繼承原本的地圖），快取看到的是「不同地圖」就會重畫
  const baseDraw = A.drawPlatforms;
  let demoProxy = null;
  A.drawPlatforms = function (ctx, map, cam) {
    if (G.data.maps && map === G.data.maps.DEMO) {
      const key = map.theme + '|' + (map.refinedGround || '') + '|' + map.region;
      if (!demoProxy || demoProxy.src !== map || demoProxy.key !== key) demoProxy = { src: map, key, m: Object.create(map) };
      return baseDraw(ctx, demoProxy.m, cam);
    }
    return baseDraw(ctx, map, cam);
  };
})();
