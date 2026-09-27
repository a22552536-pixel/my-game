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
    },
  };

  // ── 地圖準備：每個平台的細節一次算好（位置固定，畫快取塊時只挑看得到的） ──
  function buildGround(map) {
    const M = MAT[map.refinedGround];
    if (!M) return;
    const ropes = map.ropes || [];
    map._gnd = map.platforms.map((p, i) => {
      const L = p[0];
      const R = p[1];
      const y = p[2];
      const w = R - L;
      const isGround = i === 0;
      const rnd = U.seeded(i * 9173 + L * 7 + y * 3 + 11);
      const seed = rnd() * 100;
      const D = { seed, isGround, stones: [], roots: [], hang: [], drips: [], clods: [], tufts: [], leaves: [], glows: [], flies: [], flowers: [], blotches: [], tongues: [], clover: [] };
      const nearRope = (x, d) => ropes.some((r) => Math.abs(r[0] - x) < (d || 16) && (Math.abs(r[1] - y) < 12 || Math.abs(r[2] - y) < 12));
      // 浮空土塊的厚度（底面輪廓）：中間厚、兩端收成圓頭，幾處樹根團往下鼓
      const bulges = [];
      if (!isGround) {
        for (let x = L + 60 + rnd() * 80; x < R - 60; x += 150 + rnd() * 220) bulges.push({ x, r: 24 + rnd() * 34, d: 7 + rnd() * 10 });
      }
      D.bulges = bulges;
      D.depth = (x) => {
        let d = 29 + 12 * fbm(x * 0.011, seed) + 6 * fbm(x * 0.06, seed + 9);
        for (const b of bulges) {
          const u = (x - b.x) / b.r;
          if (u > -1.6 && u < 1.6) d += b.d * Math.exp(-u * u * 1.6);
        }
        const e = clamp(Math.min(x - L, R - x) / 46, 0, 1);
        return 13 + (d - 13) * Math.pow(e, 0.6);
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
      for (let x = L + 8; x < R - 8; x += sStep * (0.5 + rnd() * 1.1)) {
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
      for (let x = L + 4; x < R - 4; x += 9 + rnd() * 16) {
        const dep = isGround ? 14 + rnd() * 240 : 7 + rnd() * Math.max(3, depthAt(x) - 10);
        D.stones.push({ x, y: y + dep, rx: 0.9 + rnd() * 1.6, ry: 0.7 + rnd() * 1, rot: 0, v: Math.floor(rnd() * 3), tiny: true });
      }
      // 穿過土裡的樹根：從苔層下冒出、斜斜穿過土、在浮空土塊就從底面鑽出來垂下去
      const rStep = isGround ? 150 : 95;
      for (let x = L + 20 + rnd() * 40; x < R - 20; x += rStep * (0.6 + rnd() * 0.9)) {
        const dir = rnd() < 0.5 ? -1 : 1;
        const thick = isGround ? 2.6 + rnd() * 4 : 1.8 + rnd() * 3;
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
      for (let x = L + 4; x < R - 4; x += 7 + rnd() * 16) {
        const n = 1 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) D.hairs.push(x + (rnd() - 0.5) * 6, y + 5 + rnd() * 3, (rnd() - 0.5) * 8, 5 + Math.pow(rnd(), 1.5) * (isGround ? 22 : 14));
      }
      if (!isGround) {
        // 底面：更多細根、苔蘚垂條、剝落的小土塊
        for (let x = L + 10; x < R - 10; x += 12 + rnd() * 26) {
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
      for (let x = L + 2 + rnd() * 10; x < R - 2; x += 9 + rnd() * 26) {
        if (nearRope(x, 12) && rnd() < 0.7) continue;
        const n = 3 + Math.floor(rnd() * 7);
        const tall = rnd() < 0.18 ? 1.6 : 1;
        const blades = [];
        for (let k = 0; k < n; k++) {
          const h = (4 + Math.pow(rnd(), 1.4) * 12) * tall;
          blades.push({ dx: (rnd() - 0.5) * 9, h, lean: (rnd() - 0.5) * (h * 0.7), w: 1.1 + rnd() * 1.3, tone: rnd() < 0.25 ? 0 : 1 + Math.floor(rnd() * 4) });
        }
        D.tufts.push({ x, blades });
      }
      // 三葉草小叢
      for (let x = L + 20 + rnd() * 60; x < R - 20; x += 70 + rnd() * 140) if (!nearRope(x, 30)) D.clover.push({ x, s: 0.8 + rnd() * 0.5, v: rnd() });
      // 落葉（躺在苔面上）
      for (let x = L + 6; x < R - 6; x += 18 + rnd() * 60) D.leaves.push({ x, dy: -1 + rnd() * 5, r: 2.6 + rnd() * 2.4, rot: (rnd() - 0.5) * 0.9, c: Math.floor(rnd() * 6), k: rnd() });
      // 小野花（稀疏）
      for (let x = L + 30 + rnd() * 50; x < R - 20; x += 60 + rnd() * 120) if (!nearRope(x, 24)) D.flowers.push({ x, h: 5 + rnd() * 7, c: Math.floor(rnd() * 4), s: 1.3 + rnd() * 0.9, k: rnd() });
      // 發光小菇：多半長在平台邊緣或側面，一小群
      for (let x = L + 40 + rnd() * 120; x < R - 30; x += 150 + rnd() * 200) {
        if (nearRope(x, 36)) continue;
        const side = !isGround && rnd() < 0.35;
        const n = 1 + Math.floor(rnd() * 3);
        const c = Math.floor(rnd() * 5);
        for (let k = 0; k < n; k++) D.glows.push({ x: x + k * (4 + rnd() * 5), side, dy: side ? 8 + rnd() * Math.max(2, depthAt(x) - 16) : 0, s: (0.7 + rnd() * 0.6) * (k ? 0.75 : 1), c, k: rnd() });
      }
      // 螢光（固定的小光點，畫在平台上方的空氣裡）
      for (let x = L + 30 + rnd() * 200; x < R - 20; x += 260 + rnd() * 360) D.flies.push({ x, dy: 12 + rnd() * 28, r: 1 + rnd() * 1.2, c: Math.floor(rnd() * 2), k: rnd() });
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
    let d = 6.5 + 3 * fbm(x * 0.05, D.seed + 3);
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

  // ── 主要的畫法：一次畫一個平台（快取塊裡只會有這一個平台；x0..x1 是這一塊的範圍） ──
  A.GROUND_ART.forest = function (ctx, map, i, x0, x1) {
    if (!map._gnd) buildGround(map);
    const M = MAT[map.refinedGround];
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

    // ── 本體輪廓 ──
    const bodyPath = () => {
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
    };

    // 浮空土塊底下淡淡的陰影（讓它有重量、跟背景分開）
    if (!isGround) {
      const g = ctx.createLinearGradient(0, y + 20, 0, y + 72);
      g.addColorStop(0, 'rgba(10,20,16,0.22)');
      g.addColorStop(1, 'rgba(10,20,16,0)');
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
    ctx.save();
    bodyPath();
    ctx.clip();
    // 大片色塊
    for (const o of D.blotches) {
      if (!vis(o.x, o.r)) continue;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, M.blotch[o.c] + o.a.toFixed(2) + ')');
      g.addColorStop(1, M.blotch[o.c] + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
    }
    // 地層色帶（波浪狀、粗細不一）
    for (const s of D.strata) {
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
      ctx.strokeStyle = 'rgba(58,36,22,0.75)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let k = 0; k < h.length; k += 4) {
        if (!vis(h[k], 10)) continue;
        ctx.moveTo(h[k], h[k + 1]);
        ctx.quadraticCurveTo(h[k] + h[k + 2] * 0.2, h[k + 1] + h[k + 3] * 0.6, h[k] + h[k + 2], h[k + 1] + h[k + 3]);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(190,150,104,0.3)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let k = 0; k < h.length; k += 8) {
        if (!vis(h[k], 10)) continue;
        ctx.moveTo(h[k] - 0.5, h[k + 1]);
        ctx.quadraticCurveTo(h[k] + h[k + 2] * 0.2 - 0.5, h[k + 1] + h[k + 3] * 0.6, h[k] + h[k + 2] - 0.5, h[k + 1] + h[k + 3]);
      }
      ctx.stroke();
    }
    // 嵌石：陰影、本體、上緣亮面、偶爾長一點苔
    for (const s of D.stones) {
      if (!vis(s.x, 12)) continue;
      const C = M.stone[s.v];
      if (s.tiny) {
        ctx.fillStyle = C[s.v === 2 ? 2 : 1];
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, PI2);
        ctx.fill();
        continue;
      }
      ctx.fillStyle = 'rgba(20,12,6,0.35)';
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
      ctx.strokeStyle = 'rgba(255,248,226,0.32)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.rx * 0.82, s.ry * 0.8, s.rot, Math.PI * 1.1, Math.PI * 1.85);
      ctx.stroke();
      ctx.fillStyle = 'rgba(60,40,24,0.35)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + s.ry * 0.75, s.rx * 1.05, s.ry * 0.45, s.rot, 0, PI2);
      ctx.fill();
      if (s.moss) {
        ctx.fillStyle = 'rgba(96,150,62,0.7)';
        ctx.beginPath();
        ctx.ellipse(s.x - s.rx * 0.1, s.y - s.ry * 0.7, s.rx * 0.6, s.ry * 0.3, s.rot, 0, PI2);
        ctx.fill();
      }
    }
    // 苔墊底下的環境光遮蔽（在苔的下緣投一條柔和的陰影）
    {
      const g = ctx.createLinearGradient(0, y + 3, 0, y + 22);
      g.addColorStop(0, 'rgba(14,8,4,0.6)');
      g.addColorStop(0.45, 'rgba(14,8,4,0.22)');
      g.addColorStop(1, 'rgba(14,8,4,0)');
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
        g.addColorStop(0, 'rgba(16,10,6,0.45)');
        g.addColorStop(1, 'rgba(16,10,6,0)');
        ctx.fillStyle = g;
        ctx.fillRect(Math.min(ex, ex + dir * 22) - 6, y, 28, 60);
      }
    } else {
      // 地面往下越深越暗
      const g = ctx.createLinearGradient(0, y + 60, 0, y + 200);
      g.addColorStop(0, 'rgba(12,8,4,0)');
      g.addColorStop(1, 'rgba(12,8,4,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(a, y + 60, b - a, bottomY - y);
    }
    ctx.restore();

    // ── 底面：剝落的土塊、垂根、滴垂的苔 ──
    if (!isGround) {
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
      ctx.fillStyle = 'rgba(180,236,130,0.55)';
      ctx.beginPath();
      for (const d of D.drips) {
        if (!vis(d.x, 10) || d.len < 10) continue;
        ctx.moveTo(d.x + d.sw + 1, d.y + d.len);
        ctx.arc(d.x + d.sw, d.y + d.len, 1, 0, PI2);
      }
      ctx.fill();
    }

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
    ctx.strokeStyle = 'rgba(22,44,16,0.55)';
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
      for (let x = Math.floor(a / 34) * 34; x < b; x += 34) {
        const hx = x + hash(x * 0.13 + D.seed) * 26;
        const rr = 7 + hash(x * 0.29) * 9;
        const g = ctx.createRadialGradient(hx, y, 0, hx, y, rr);
        g.addColorStop(0, 'rgba(200,244,140,0.35)');
        g.addColorStop(1, 'rgba(200,244,140,0)');
        ctx.fillStyle = g;
        ctx.fillRect(hx - rr, y - rr, rr * 2, rr * 2);
      }
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
      ctx.strokeStyle = 'rgba(60,30,10,0.45)';
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
    // 草叢：暗的在後、亮的在前；每片葉子是彎彎的細三角
    {
      const hk = 1 - 0.25 * lvl;
      for (let tone = 0; tone < 5; tone++) {
        ctx.fillStyle = M.blade[tone];
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
      for (const t of D.tufts) {
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
      ctx.fillStyle = '#ffc24a';
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
      if (rgb) {
        const g = ctx.createRadialGradient(cx, by - h, 0, cx, by - h, 16 * s);
        g.addColorStop(0, 'rgba(' + rgb + ',0.42)');
        g.addColorStop(0.4, 'rgba(' + rgb + ',0.14)');
        g.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - 16 * s, by - h - 16 * s, 32 * s, 32 * s);
      }
      ctx.strokeStyle = '#e8f0d8';
      ctx.lineWidth = 1.3 * s;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx, by - h * 0.6, cx, by - h);
      ctx.stroke();
      const cg = ctx.createLinearGradient(0, by - h - 3.2 * s, 0, by - h + 1);
      cg.addColorStop(0, rgb ? '#ffffff' : '#ffc8a0');
      cg.addColorStop(0.35, cap);
      cg.addColorStop(1, rgb ? 'rgba(' + rgb + ',0.75)' : '#9a3e2a');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(cx, by - h, 3.6 * s, 2.8 * s, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(cx - 1.4 * s, by - h - 2 * s, 1, 1);
      if (!rgb) {
        ctx.fillStyle = 'rgba(255,246,232,0.9)';
        ctx.beginPath();
        ctx.arc(cx + 1.2 * s, by - h - 1.6 * s, 0.7 * s, 0, PI2);
        ctx.arc(cx - 1.8 * s, by - h - 0.8 * s, 0.55 * s, 0, PI2);
        ctx.fill();
      }
    }
    // 螢光
    for (const f of D.flies) {
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
  };

  // ── 藤蔓繩：兩股扭在一起的木質藤，葉子有明暗面；每條繩子畫一次成小貼圖 ──
  const ropeCache = new Map();
  function buildVine(map, r, x, top, bottom) {
    const M = MAT[map.refinedGround];
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
        g.strokeStyle = 'rgba(16,24,10,0.6)';
        g.lineWidth = 7;
        path(pts, 0.7);
        g.stroke();
        g.strokeStyle = pts === s1 ? '#6f8434' : '#56692a';
        g.lineWidth = 5.2;
        path(pts, 0);
        g.stroke();
        g.strokeStyle = 'rgba(200,230,140,0.55)';
        g.lineWidth = 1.1;
        path(pts, -1.1);
        g.stroke();
      }
      // 藤皮的節與細紋
      g.strokeStyle = 'rgba(30,40,14,0.5)';
      g.lineWidth = 0.8;
      g.beginPath();
      for (let yy = 6; yy < len; yy += 7 + rnd() * 6) {
        const xx = cx + Math.sin(yy * 0.085) * 2.6;
        g.moveTo(xx - 2, y0 + yy);
        g.lineTo(xx + 1.6, y0 + yy + 1.5);
      }
      g.stroke();
      // 苔蘚小團
      g.fillStyle = 'rgba(110,170,70,0.75)';
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
        g.strokeStyle = '#4a6a2a';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-7 * s, 0);
        g.lineTo(-4 * s, 0);
        g.stroke();
        const tone = rnd();
        g.fillStyle = tone < 0.3 ? '#4f8e36' : tone < 0.75 ? '#66ab42' : '#80c254';
        g.beginPath();
        g.moveTo(-4.5 * s, 0);
        g.quadraticCurveTo(0, -5 * s, 6.5 * s, 0);
        g.quadraticCurveTo(0, 4.4 * s, -4.5 * s, 0);
        g.fill();
        g.fillStyle = 'rgba(20,40,12,0.35)';
        g.beginPath();
        g.moveTo(-4.5 * s, 0);
        g.lineTo(6.5 * s, 0);
        g.quadraticCurveTo(0, 4.4 * s, -4.5 * s, 0);
        g.fill();
        g.strokeStyle = 'rgba(210,245,160,0.6)';
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(-4 * s, 0);
        g.quadraticCurveTo(0, -0.8 * s, 5.5 * s, 0);
        g.stroke();
        g.restore();
        // 偶爾一條捲鬚
        if (rnd() < 0.25) {
          g.strokeStyle = '#6a9a3a';
          g.lineWidth = 0.9;
          g.beginPath();
          g.moveTo(xx - side * 2, y0 + yy + 5);
          g.quadraticCurveTo(xx - side * 9, y0 + yy + 6, xx - side * 9, y0 + yy + 11);
          g.arc(xx - side * 7.5, y0 + yy + 11, 1.6, Math.PI, Math.PI * 2.6);
          g.stroke();
        }
      }
      // 末端：散開的細根鬚
      g.fillStyle = '#4a5a26';
      g.beginPath();
      for (let k = -2; k <= 2; k++) taperPath(g, [cx, y0 + len - 2, cx + k * 1.6, y0 + len + 5, cx + k * 3, y0 + len + 10 - Math.abs(k)], 1.6, 0.3);
      g.fill();
      // 一朵發光小花苞（變老時沒有）
      if (!map._aged) {
        const fy = y0 + len * (0.35 + rnd() * 0.3);
        const fx = cx + 5;
        const gg = g.createRadialGradient(fx, fy, 0, fx, fy, 9);
        gg.addColorStop(0, 'rgba(190,255,200,0.55)');
        gg.addColorStop(1, 'rgba(190,255,200,0)');
        g.fillStyle = gg;
        g.fillRect(fx - 9, fy - 9, 18, 18);
        g.fillStyle = '#eafff0';
        g.beginPath();
        g.arc(fx, fy, 1.8, 0, PI2);
        g.fill();
      }
    };
    if (A.withAge) A.withAge(g, map, draw);
    else draw();
    return { c, W, H, y0 };
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

  // ── 接上 prepareMap：算好細節；平台底下的舊藤蔓垂條改由快取裡的垂根、垂苔取代 ──
  const basePrep = A.prepareMap;
  A.prepareMap = function (map) {
    basePrep(map);
    if (map.refinedGround && MAT[map.refinedGround]) {
      buildGround(map);
      map._hang = [];
    }
  };
})();
