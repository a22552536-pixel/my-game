// 世界地圖：像楓之谷的維多利亞島一樣，所有章節的地圖都畫在同一塊「星楓大陸」上。
// 還沒去過的區域蓋著雲霧（依玩家實際進度：這一區有任何一張地圖去過就散開），
// 還沒去過的地圖顯示 ？？？。滑鼠移到（或點）節點上可以看地圖資訊。
//
// 畫法（插畫地圖風）：
//   1. 地形：用雜訊產生高度圖，逐像素算出海的深淺、海岸泡沫、地表顏色、山的明暗與投影（只在第一次打開時算一次）。
//   2. 向量細節：森林樹冠、河流、岩漿、地標建築、燈塔、沉船……一樣只畫一次，疊在地形上。
//   3. 狀態層：路線、雲霧、區域名稱、節點——只有進度改變時才重畫。
//   4. 每一格只畫會動的小東西（浪光、船、雨、岩漿脈動、煙、燈塔光、螢火蟲、浮空神殿、雲、鳥）。
//   打倒章節 Boss 之後，那塊土地會慢慢「變老」：該區顏色稍微褪色、偏暖。
(function () {
  'use strict';
  const A = G.art;
  const WW = 960;
  const WH = 560;
  const N = WW * WH;
  // 高解析螢幕用 2 倍畫布，文字與線條才會銳利
  const S = (window.devicePixelRatio || 1) >= 1.5 ? 2 : 1;
  const SERIF = '"Noto Serif TC", "Source Han Serif TC", "Songti TC", "STSong", "PMingLiU", "MingLiU", ' + A.FONT;

  // 每張地圖在大陸上的位置
  const POS = {
    '1-1': [130, 468], '1-2': [196, 426], '1-3': [258, 462], '1-4': [318, 414], '1-B': [372, 376],
    '2-1': [446, 470], '2-2': [520, 500], '2-3': [592, 474], '2-4': [652, 440], '2-B': [708, 400],
    '3-1': [650, 336], '3-2': [706, 290], '3-3': [764, 250], '3-4': [724, 204], '3-B': [786, 160],
    '4-1': [476, 252], '4-2': [416, 226], '4-3': [356, 250], '4-4': [298, 214], '4-B': [240, 176],
    '5-1': [764, 70], '5-2': [806, 50], '5-3': [848, 78], '5-4': [890, 54], '5-B': [918, 98],
  };
  // 每一區的雲霧範圍（x, y, r）。這一區還沒去過就蓋著；上一章 Boss 打倒後雲霧會變薄一些。
  const FOG = {
    2: [[446, 470, 44], [500, 505, 46], [560, 482, 46], [622, 470, 46], [672, 432, 46], [716, 398, 40], [604, 526, 36], [470, 530, 30], [756, 424, 34], [540, 440, 30], [640, 510, 34]],
    3: [[650, 336, 40], [700, 296, 46], [764, 252, 48], [722, 206, 48], [786, 160, 46], [856, 206, 60], [636, 250, 40], [820, 300, 42], [682, 150, 38], [880, 150, 36], [612, 300, 30], [900, 262, 34], [760, 336, 34]],
    4: [[476, 252, 40], [416, 224, 44], [356, 246, 44], [298, 214, 46], [240, 176, 44], [186, 234, 38], [336, 164, 48], [430, 160, 44], [264, 258, 32], [388, 120, 36], [290, 130, 34], [470, 210, 30]],
    5: [[764, 72, 32], [806, 54, 34], [848, 84, 42], [890, 58, 34], [916, 100, 28], [826, 116, 32], [870, 120, 30]],
  };
  const REGION_LABEL = { 1: [184, 532], 2: [650, 530], 3: [880, 336], 4: [362, 156], 5: [676, 36] };
  const TYPE = { camp: '營地', hunt: '狩獵場', explore: '探索', boss: 'Boss' };
  // 每一區打倒哪一個 Boss 之後土地開始變老
  const AGE_FLAG = { 1: 'queenShroomDefeated', 2: 'hermitCrabDefeated', 3: 'lavaTortoiseDefeated', 4: 'frostSpiritDefeated' };

  // ── 形狀資料 ──
  // 大陸海岸線（順時針），之後用 Chaikin 圓滑化，再用雜訊把海岸弄得自然一點
  const LAND_PTS = [
    [80, 504], [62, 456], [72, 408], [62, 364], [86, 320], [124, 292], [158, 262], [172, 220], [194, 176],
    [236, 140], [290, 116], [352, 100], [412, 104], [462, 126], [512, 118], [566, 138], [620, 124], [676, 102],
    [738, 94], [800, 104], [856, 120], [900, 152], [928, 200], [930, 252], [910, 300], [878, 340], [840, 362],
    [806, 374], [782, 400], [790, 432], [824, 450], [838, 480], [812, 502], [764, 512], [712, 522], [668, 514],
    [640, 500], [604, 498], [572, 508], [548, 526], [516, 534], [496, 546], [468, 540], [436, 538], [404, 548],
    [366, 540], [306, 546], [244, 552], [182, 546], [124, 534],
  ];
  const ISLES = [
    [[22, 226], [40, 212], [56, 224], [52, 246], [30, 250]],
    [[866, 404], [884, 396], [896, 410], [884, 424], [866, 420]],
    [[612, 42], [636, 32], [660, 42], [650, 58], [620, 58]],
  ];
  // 河流：從雪峰流下，經過森林流進海裡
  const RIVERS = [
    { pts: [[404, 232], [428, 286], [450, 336], [432, 396], [414, 446], [410, 500], [404, 556]], w: 6 },
    { pts: [[236, 238], [204, 270], [160, 300], [112, 328], [52, 352]], w: 5 },
    { pts: [[530, 300], [498, 316], [462, 330]], w: 3.5 },
  ];
  // 岩漿河：從火山口流下峽谷
  const VOLC = [862, 204];
  const LAVA = [[856, 206], [834, 200], [804, 208], [770, 216], [734, 222], [700, 228], [668, 240]];
  // 區域地面
  const FOREST_PTS = [[56, 390], [110, 340], [190, 322], [262, 300], [336, 306], [398, 328], [424, 380], [416, 452], [400, 540], [300, 570], [150, 570], [50, 540]];
  const SNOW_PTS = [[160, 262], [178, 176], [244, 124], [350, 92], [452, 104], [510, 150], [500, 226], [440, 266], [334, 278], [230, 280]];
  const CANYON_PTS = [[596, 318], [598, 236], [630, 160], [700, 98], [820, 96], [940, 150], [950, 290], [880, 350], [800, 372], [720, 378], [640, 366]];
  const COAST_PTS = [[420, 440], [520, 430], [640, 420], [760, 380], [900, 380], [960, 420], [960, 560], [420, 560]];
  // 雪峰：x, y, 半徑, 高度
  const PEAKS = [
    [206, 212, 34, 0.42], [262, 174, 38, 0.55], [474, 186, 30, 0.4], [420, 150, 40, 0.6], [340, 134, 48, 0.72],
    [382, 206, 26, 0.3], [310, 186, 28, 0.36], [182, 252, 22, 0.24], [456, 240, 22, 0.24], [292, 128, 30, 0.44],
    [392, 112, 28, 0.4], [222, 160, 24, 0.34], [484, 136, 24, 0.3], [364, 176, 22, 0.3], [254, 232, 20, 0.22],
  ];
  // 地標附近不要種樹
  const KEEP_OUT = [
    [252, 346, 40], [352, 326, 36], [548, 294, 40], [VOLC[0], VOLC[1], 40], [612, 342, 18], [684, 368, 16], [484, 510, 18],
    [332, 220, 24], [478, 408, 20], [530, 388, 34], [760, 420, 18], [792, 412, 16], [624, 520, 22],
  ];

  // ── 小工具 ──
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const rr = (a, b) => a + rnd() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sstep = (a, b, x) => {
    let t = (x - a) / (b - a);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  };
  const chaikin = (pts, closed, it) => {
    let p = pts;
    for (let k = 0; k < (it || 3); k++) {
      const q = [];
      const n = p.length;
      for (let i = 0; i < (closed ? n : n - 1); i++) {
        const a = p[i];
        const b = p[(i + 1) % n];
        q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        q.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      if (!closed) {
        q.unshift(p[0]);
        q.push(p[n - 1]);
      }
      p = q;
    }
    return p;
  };
  const poly = (c, pts, closed, dx, dy) => {
    dx = dx || 0;
    dy = dy || 0;
    c.moveTo(pts[0][0] + dx, pts[0][1] + dy);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0] + dx, pts[i][1] + dy);
    if (closed) c.closePath();
  };
  const mk = (w, h) => {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w));
    cv.height = Math.max(1, Math.ceil(h));
    return cv;
  };
  // 以邏輯座標作畫、實際解析度為 S 倍的畫布
  const mkS = (w, h, ox, oy) => {
    const cv = mk(w * S, h * S);
    const c = cv.getContext('2d');
    c.setTransform(S, 0, 0, S, -(ox || 0) * S, -(oy || 0) * S);
    return [cv, c];
  };


  const segX = (a, b, c, d) => {
    const r = [b[0] - a[0], b[1] - a[1]];
    const s = [d[0] - c[0], d[1] - c[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (!den) return null;
    const u = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
    const v = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? [a[0] + u * r[0], a[1] + u * r[1]] : null;
  };
  const ell = (c, x, y, rx, ry, fill, rot) => {
    c.fillStyle = fill;
    c.beginPath();
    c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
    c.fill();
  };
  const glowDot = (c, x, y, r, col, a) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col.replace('A', a));
    g.addColorStop(1, col.replace('A', 0));
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  };
  // 文字：可以加字距、外框光暈、發光
  function txt(c, s, x, y, o) {
    c.save();
    c.font = (o.weight || 'bold') + ' ' + o.size + 'px ' + (o.font || A.FONT);
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    const ch = Array.from(s);
    const sp = o.spacing || 0;
    const ws = ch.map((q) => c.measureText(q).width);
    const total = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
    const x0 = o.align === 'left' ? x : x - total / 2;
    const each = (fn) => {
      let cx = x0;
      ch.forEach((q, i) => {
        fn(q, cx);
        cx += ws[i] + sp;
      });
    };
    if (o.halo) {
      c.lineJoin = 'round';
      c.lineWidth = o.haloW || 3;
      c.strokeStyle = o.halo;
      each((q, cx) => c.strokeText(q, cx, y));
    }
    if (o.glow) {
      c.shadowColor = o.glow;
      c.shadowBlur = (o.glowB || 6) * S;
    }
    c.fillStyle = o.color;
    each((q, cx) => c.fillText(q, cx, y));
    c.restore();
    return total;
  }

  // ── 雜訊（Perlin） ──
  function makeNoise(sd) {
    let s = sd * 9301 + 49297;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const p = new Uint8Array(512);
    const a = [];
    for (let i = 0; i < 256; i++) a.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    for (let i = 0; i < 512; i++) p[i] = a[i & 255];
    const gx = new Float32Array(256);
    const gy = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const an = r() * Math.PI * 2;
      gx[i] = Math.cos(an);
      gy[i] = Math.sin(an);
    }
    return (x, y) => {
      let xi = Math.floor(x);
      let yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      xi &= 255;
      yi &= 255;
      const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
      const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
      const aa = p[p[xi] + yi];
      const ab = p[p[xi] + yi + 1];
      const ba = p[p[xi + 1] + yi];
      const bb = p[p[xi + 1] + yi + 1];
      const n00 = gx[aa] * xf + gy[aa] * yf;
      const n10 = gx[ba] * (xf - 1) + gy[ba] * yf;
      const n01 = gx[ab] * xf + gy[ab] * (yf - 1);
      const n11 = gx[bb] * (xf - 1) + gy[bb] * (yf - 1);
      const x1 = n00 + u * (n10 - n00);
      const x2 = n01 + u * (n11 - n01);
      return (x1 + v * (x2 - x1)) * 1.45;
    };
  }
  const fbm = (nz, x, y, o) => {
    let s = 0;
    let a = 0.5;
    let f = 1;
    for (let k = 0; k < o; k++) {
      s += a * nz(x * f + k * 17.3, y * f - k * 9.1);
      f *= 2.03;
      a *= 0.5;
    }
    return s;
  };

  // 產生器：建圖可以分很多小段執行（閒置時預先建好，不會卡住遊戲）
  const run = (g) => {
    let r = g.next();
    while (!r.done) r = g.next();
    return r.value;
  };
  // 盒狀模糊（可分離，多次近似高斯）；垂直方向也逐列走，對快取比較友善
  const blur = (src, r, passes, W, H) => run(blurG(src, r, passes, W, H));
  function* blurG(src, r, passes, W, H) {
    const WW = W || 960;
    const WH = H || 560;
    const a = Float32Array.from(src);
    const b = new Float32Array(WW * WH);
    const col = new Float32Array(WW);
    const inv = 1 / (2 * r + 1);
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < WH; y++) {
        if ((y & 31) === 31) yield;
        const o = y * WW;
        let s = 0;
        for (let k = -r; k <= r; k++) s += a[o + clamp(k, 0, WW - 1)];
        for (let x = 0; x < WW; x++) {
          b[o + x] = s * inv;
          s += a[o + Math.min(WW - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
        }
      }
      col.fill(0);
      for (let k = -r; k <= r; k++) {
        const o = clamp(k, 0, WH - 1) * WW;
        for (let x = 0; x < WW; x++) col[x] += b[o + x];
      }
      for (let y = 0; y < WH; y++) {
        if ((y & 31) === 31) yield;
        const o = y * WW;
        const oa = Math.min(WH - 1, y + r + 1) * WW;
        const os = Math.max(0, y - r) * WW;
        for (let x = 0; x < WW; x++) {
          a[o + x] = col[x] * inv;
          col[x] += b[oa + x] - b[os + x];
        }
      }
    }
    return a;
  }
  // 倒角距離轉換：src 為 1 的像素到最近的 0 像素的距離
  function* chamferG(src) {
    const d = new Float32Array(N);
    for (let i = 0; i < N; i++) d[i] = src[i] ? 1e5 : 0;
    const D2 = 1.4142;
    for (let y = 0; y < WH; y++) {
      if ((y & 15) === 15) yield;
      for (let x = 0; x < WW; x++) {
        const i = y * WW + x;
        let v = d[i];
        if (!v) continue;
        if (x > 0) v = Math.min(v, d[i - 1] + 1);
        if (y > 0) {
          v = Math.min(v, d[i - WW] + 1);
          if (x > 0) v = Math.min(v, d[i - WW - 1] + D2);
          if (x < WW - 1) v = Math.min(v, d[i - WW + 1] + D2);
        }
        d[i] = v;
      }
    }
    for (let y = WH - 1; y >= 0; y--) {
      if ((y & 15) === 15) yield;
      for (let x = WW - 1; x >= 0; x--) {
        const i = y * WW + x;
        let v = d[i];
        if (!v) continue;
        if (x < WW - 1) v = Math.min(v, d[i + 1] + 1);
        if (y < WH - 1) {
          v = Math.min(v, d[i + WW] + 1);
          if (x < WW - 1) v = Math.min(v, d[i + WW + 1] + D2);
          if (x > 0) v = Math.min(v, d[i + WW - 1] + D2);
        }
        d[i] = v;
      }
    }
    return d;
  }

  // 圓滑後的形狀
  const LAND = chaikin(LAND_PTS, true, 3);
  const ISLES_S = ISLES.map((p) => chaikin(p, true, 3));
  const RIVERS_S = RIVERS.map((r) => ({ pts: chaikin(r.pts, false, 3), w: r.w }));
  const LAVA_S = chaikin(LAVA, false, 3);

  // 路線：相鄰兩張地圖之間畫一條略彎的小路；雪峰到浮空神殿是一條天空的航線
  let ROUTES = null;
  const routes = () => {
    if (ROUTES) return ROUTES;
    const o = (G.data && G.data.mapOrder) || Object.keys(POS);
    ROUTES = [];
    for (let i = 1; i < o.length; i++) {
      const a = POS[o[i - 1]];
      const b = POS[o[i]];
      if (!a || !b) continue;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      let cx = (a[0] + b[0]) / 2;
      let cy = (a[1] + b[1]) / 2;
      const sky = G.data.maps[o[i]] && G.data.maps[o[i]].region === 5 && G.data.maps[o[i - 1]].region !== 5;
      if (sky) {
        cx = (a[0] + b[0]) / 2 - 10;
        cy = Math.min(a[1], b[1]) - 60;
      } else {
        const k = (i % 2 ? 1 : -1) * Math.min(16, len * 0.13);
        cx += (-dy / len) * k;
        cy += (dx / len) * k;
      }
      const pts = [];
      const n = Math.max(8, Math.round(len / 8));
      for (let s = 0; s <= n; s++) {
        const u = s / n;
        const v = 1 - u;
        pts.push([v * v * a[0] + 2 * u * v * cx + u * u * b[0], v * v * a[1] + 2 * u * v * cy + u * u * b[1]]);
      }
      ROUTES.push({ a: o[i - 1], b: o[i], pts, sky, len });
    }
    return ROUTES;
  };

  // ════════════════════════ 預先畫好的靜態圖層 ════════════════════════
  let L = null;

  // ── 1. 地形場（高度、生態區權重、距離海岸） ──
  // 低頻雜訊先在粗網格上算，再雙線性內插（快很多，看起來一樣）
  // 在低解析度畫布上畫遮罩、模糊，再放大回來（平滑的東西不需要全解析度）
  function lowMask(k, fn, r) {
    const w = Math.ceil(WW / k);
    const h = Math.ceil(WH / k);
    const cv = mk(w, h);
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.setTransform(1 / k, 0, 0, 1 / k, 0, 0);
    c.fillStyle = '#fff';
    c.strokeStyle = '#fff';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    fn(c);
    const d = c.getImageData(0, 0, w, h).data;
    let m = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] / 255;
    if (r) m = blur(m, r, 2, w, h);
    return { m, w, h, k };
  }
  function* upsampleG(q) {
    const { m, w, h, k } = q;
    const out = new Float32Array(N);
    const XI = new Int32Array(WW);
    const XU = new Float32Array(WW);
    for (let x = 0; x < WW; x++) {
      const fx = Math.max(0, (x + 0.5) / k - 0.5);
      const i = Math.min(w - 2, fx | 0);
      XI[x] = i;
      XU[x] = Math.min(1, fx - i);
    }
    for (let y = 0; y < WH; y++) {
      if ((y & 31) === 31) yield;
      const fy = Math.max(0, (y + 0.5) / k - 0.5);
      const j = Math.min(h - 2, fy | 0);
      const v = Math.min(1, fy - j);
      const row = j * w;
      const oy = y * WW;
      for (let x = 0; x < WW; x++) {
        const o = row + XI[x];
        const u = XU[x];
        const a = m[o] + (m[o + 1] - m[o]) * u;
        const b = m[o + w] + (m[o + w + 1] - m[o + w]) * u;
        out[oy + x] = a + (b - a) * v;
      }
    }
    return out;
  }
  function* fieldG(step, fn, bx) {
    const x0 = bx ? bx[0] : 0;
    const y0 = bx ? bx[1] : 0;
    const x1 = bx ? bx[2] : WW - 1;
    const y1 = bx ? bx[3] : WH - 1;
    const gw = Math.ceil((x1 - x0) / step) + 2;
    const gh = Math.ceil((y1 - y0) / step) + 2;
    const g = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) {
      if ((j & 7) === 7) yield;
      for (let i = 0; i < gw; i++) g[j * gw + i] = fn(x0 + i * step, y0 + j * step);
    }
    const out = new Float32Array(N);
    const inv = 1 / step;
    for (let y = y0; y <= y1; y++) {
      if ((y & 31) === 31) yield;
      const fy = (y - y0) * inv;
      const j = fy | 0;
      const v = fy - j;
      const row = j * gw;
      for (let x = x0; x <= x1; x++) {
        const fx = (x - x0) * inv;
        const i = fx | 0;
        const u = fx - i;
        const o = row + i;
        const a = g[o] + (g[o + 1] - g[o]) * u;
        const b = g[o + gw] + (g[o + gw + 1] - g[o + gw]) * u;
        out[y * WW + x] = a + (b - a) * v;
      }
    }
    return out;
  }
  function* buildFields() {
    const F = {};
    const cv = mk(WW, WH);
    const c = cv.getContext('2d', { willReadFrequently: true });
    const maskOf = (fn) => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, WW, WH);
      c.fillStyle = '#fff';
      c.strokeStyle = '#fff';
      c.lineCap = 'round';
      c.lineJoin = 'round';
      fn(c);
      const d = c.getImageData(0, 0, WW, WH).data;
      const m = new Float32Array(N);
      for (let i = 0; i < N; i++) m[i] = d[i * 4 + 3] / 255;
      return m;
    };
    const nzA = makeNoise(1);
    const nzB = makeNoise(2);
    const nzC = makeNoise(3);
    F.nzA = nzA;
    F.nzB = nzB;
    F.nzC = nzC;
    // 海岸線：多邊形模糊成斜坡 → 加上雜訊 → 自然的海岸
    const m0 = yield* upsampleG(lowMask(2, (q) => {
      q.beginPath();
      poly(q, LAND, true);
      ISLES_S.forEach((s) => poly(q, s, true));
      q.fill();
    }, 4));
    const cn = yield* fieldG(3, (x, y) => fbm(nzA, x / 34, y / 34, 4));
    const land = new Uint8Array(N);
    for (let y = 0; y < WH; y++) {
      if ((y & 7) === 7) yield;
      for (let x = 0; x < WW; x++) {
        const i = y * WW + x;
        const m = m0[i];
        if (m > 0.97) land[i] = 1;
        else if (m > 0.03) land[i] = m - 0.5 + cn[i] * 0.42 + nzB(x / 8, y / 8) * 0.07 > 0 ? 1 : 0;
      }
    }
    // 節點一定要在陸地上
    for (const id in POS) {
      if (id[0] === '5') continue;
      const [px, py] = POS[id];
      for (let y = py - 14; y <= py + 14; y++) for (let x = px - 14; x <= px + 14; x++) if ((x - px) ** 2 + (y - py) ** 2 < 196) land[y * WW + x] = 1;
    }
    const sea = new Uint8Array(N);
    for (let i = 0; i < N; i++) sea[i] = 1 - land[i];
    const din = yield* chamferG(land);
    const dout = yield* chamferG(sea);
    const sd = new Float32Array(N);
    for (let i = 0; i < N; i++) sd[i] = land[i] ? din[i] : -dout[i];
    F.land = land;
    F.sd = sd;
    // 生態區：森林、雪峰、峽谷、黑岩海岸，剩下的是中央草原
    const K = 4;
    const reg = (pts) => lowMask(K, (q) => {
      q.beginPath();
      poly(q, chaikin(pts, true, 3), true);
      q.fill();
    }, 3);
    const rF = reg(FOREST_PTS);
    const rS = reg(SNOW_PTS);
    const rR = reg(CANYON_PTS);
    const rC = reg(COAST_PTS);
    F.riv = yield* upsampleG(lowMask(2, (q) => {
      RIVERS_S.forEach((r) => {
        q.lineWidth = r.w + 7;
        q.beginPath();
        poly(q, r.pts, false);
        q.stroke();
      });
    }, 2));
    F.lav = yield* upsampleG(lowMask(2, (q) => {
      q.lineWidth = 16;
      q.beginPath();
      poly(q, LAVA_S, false);
      q.stroke();
    }, 2));
    // 邊界用雜訊扭曲，才不會像描出來的（在低解析度上算完再放大）
    const sw = rF.w;
    const sh = rF.h;
    const ws = [new Float32Array(sw * sh), new Float32Array(sw * sh), new Float32Array(sw * sh), new Float32Array(sw * sh)];
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const X = x * K;
        const Y = y * K;
        const wx = fbm(nzB, X / 70, Y / 70, 3) * 26;
        const wy = fbm(nzB, X / 70 + 31.7, Y / 70 + 11.3, 3) * 26;
        const j = clamp(Math.round(y + wy / K), 0, sh - 1) * sw + clamp(Math.round(x + wx / K), 0, sw - 1);
        let f = rF.m[j];
        let s = rS.m[j];
        let r = rR.m[j];
        let k = rC.m[j];
        // 優先順序：峽谷 > 海岸 > 雪峰 > 森林
        k *= 1 - r;
        s *= 1 - r;
        f *= (1 - s) * (1 - k);
        const tot = f + s + r + k;
        if (tot > 1) {
          f /= tot;
          s /= tot;
          r /= tot;
          k /= tot;
        }
        const i = y * sw + x;
        ws[0][i] = f;
        ws[1][i] = s;
        ws[2][i] = r;
        ws[3][i] = k;
      }
    }
    const wF = yield* upsampleG({ m: ws[0], w: sw, h: sh, k: K });
    const wS = yield* upsampleG({ m: ws[1], w: sw, h: sh, k: K });
    const wR = yield* upsampleG({ m: ws[2], w: sw, h: sh, k: K });
    const wC = yield* upsampleG({ m: ws[3], w: sw, h: sh, k: K });
    F.small = { ws, w: sw, h: sh, k: K };
    F.wF = wF;
    F.wS = wS;
    F.wR = wR;
    F.wC = wC;
    // 共用的雜訊場
    const n1 = yield* fieldG(4, (x, y) => fbm(nzA, x / 110, y / 110, 4));
    const CQ = yield* fieldG(3, (x, y) => (0.5 + 0.95 * fbm(nzB, x / 95, y / 95, 4)) * 4, [560, 70, 959, 400]);
    const RG = yield* fieldG(3, (x, y) => 1 - Math.abs(fbm(nzC, x / 46, y / 46, 4)), [130, 70, 540, 310]);
    const PK = yield* fieldG(2, (x, y) => {
      let pk = 0;
      for (let p = 0; p < PEAKS.length; p++) {
        const P = PEAKS[p];
        const dx = (x - P[0]) / P[2];
        const dy = (y - P[1]) / (P[2] * 0.85);
        const e = dx * dx + dy * dy;
        if (e < 9) pk = Math.max(pk, P[3] * Math.exp(-Math.sqrt(e) * 1.5));
      }
      return pk;
    }, [130, 70, 540, 310]);
    const CR = yield* fieldG(3, (x, y) => Math.abs(fbm(nzB, x / 15, y / 15, 3)), [380, 330, 959, 559]);
    const HL = yield* fieldG(4, (x, y) => fbm(nzC, x / 42, y / 42, 2));
    F.n1 = n1;
    F.hl = HL;
    F.cq = CQ;
    F.nb = yield* fieldG(4, (x, y) => fbm(nzC, x / 40, y / 40, 2));
    // 高度
    const h = new Float32Array(N);
    for (let y = 0; y < WH; y++) {
      if ((y & 7) === 7) yield;
      for (let x = 0; x < WW; x++) {
        const i = y * WW + x;
        if (!land[i]) continue;
        const d = sd[i];
        const nn = n1[i];
        const rise = sstep(0, 45, d);
        const f = wF[i];
        const s = wS[i];
        const r = wR[i];
        const k = wC[i];
        const m = Math.max(0, 1 - f - s - r - k);
        let hh = m * (0.1 + 0.1 * rise + 0.1 * nn + 0.07 * HL[i]) + f * (0.12 + 0.09 * rise + 0.05 * nn);
        if (k > 0.001) hh += k * (0.05 + 0.1 * sstep(0, 5, d) + 0.05 * nn + 0.13 * CR[i]);
        if (r > 0.001) {
          const q = CQ[i];
          const fl = Math.floor(q);
          const tq = fl + sstep(0.72, 0.84, q - fl);
          hh += r * (0.1 + (tq / 4) * 0.4);
        }
        if (s > 0.001) {
          const rg = RG[i];
          hh += s * (0.12 + 0.03 * rg + PK[i] * (0.55 + 0.8 * rg * rg));
        }
        // 火山
        const vx = x - VOLC[0];
        const vy = (y - VOLC[1]) * 1.2;
        const dv = Math.sqrt(vx * vx + vy * vy);
        if (dv < 92) hh += 0.85 * Math.pow(1 - dv / 92, 1.7) * (0.9 + 0.1 * nn) - 0.3 * Math.exp(-(dv / 10) * (dv / 10));
        hh -= 0.06 * F.riv[i] + 0.1 * F.lav[i];
        h[i] = hh * (0.35 + 0.65 * sstep(0, 12, d) + 0.5 * k * (1 - sstep(0, 12, d)));
      }
    }
    F.h = h;
    F.nw = yield* fieldG(4, (x, y) => fbm(nzA, x / 60, y / 60, 2));
    F.st = yield* fieldG(4, stormAt);
    F.ns = yield* fieldG(4, (x, y) => nzB(x / 22, y / 22));
    return F;
  }

  // ── 2. 逐像素上色：海的深淺、泡沫、地表、山影 ──
  const LX = -0.512;
  const LY = -0.652;
  const LZ = 0.559;
  const ZS = 120;
  function* buildTerrain(F) {
    const cv = mk(WW, WH);
    const c = cv.getContext('2d');
    const img = c.createImageData(WW, WH);
    const D = img.data;
    const { land, sd, h, wF, wS, wR, wC, nzA, nzB, nzC } = F;
    const hb = yield* blurG(h, 6, 2);
    // 筆觸顆粒：先做一張 256×256 的小圖重複貼
    const GR = new Float32Array(65536);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) GR[y * 256 + x] = nzC(x / 1.7, y / 1.7) * 5 + nzB(x / 2.2, y / 7) * 4;
    // 山的投影：沿光線方向往回找有沒有更高的地
    const shadow = new Float32Array(N);
    const sx = LX / Math.hypot(LX, LY);
    const sy = LY / Math.hypot(LX, LY);
    const drop = LZ / Math.hypot(LX, LY) / ZS;
    for (let y = 0; y < WH; y++) {
      if ((y & 7) === 7) yield;
      for (let x = 0; x < WW; x++) {
        const i = y * WW + x;
        if (!land[i] || (wS[i] + wR[i] < 0.05 && Math.abs(x - VOLC[0]) + Math.abs(y - VOLC[1]) > 130)) continue;
        const h0 = h[i];
        let occ = 0;
        for (let k = 1; k <= 9; k++) {
          const px = Math.round(x + sx * k * 4);
          const py = Math.round(y + sy * k * 4);
          if (px < 0 || py < 0) break;
          const e = h[py * WW + px] - h0 - k * 4 * drop;
          if (e > occ) occ = e;
        }
        shadow[i] = sstep(0, 0.035, occ);
      }
    }
    const shB = yield* blurG(shadow, 1, 1);
    // 峽谷的岩層：紅、橙、赭交錯，頂面比較亮
    const BANDS = [[176, 70, 38], [204, 104, 54], [158, 58, 34], [214, 128, 70], [186, 84, 44]];
    for (let y = 0; y < WH; y++) {
      if ((y & 7) === 7) yield;
      for (let x = 0; x < WW; x++) {
        const i = y * WW + x;
        const o = i * 4;
        let r;
        let g;
        let b;
        const d = sd[i];
        if (land[i]) {
          const f = wF[i];
          const s = wS[i];
          const rr2 = wR[i];
          const k = wC[i];
          const m = Math.max(0, 1 - f - s - rr2 - k);
          const n1 = F.n1[i];
          const hh = h[i];
          const nb = F.nb[i];
          // 光影
          const xm = x > 0 ? i - 1 : i;
          const xp = x < WW - 1 ? i + 1 : i;
          const ym = y > 0 ? i - WW : i;
          const yp = y < WH - 1 ? i + WW : i;
          const gx = (h[xp] - h[xm]) * 0.5 * ZS;
          const gy = (h[yp] - h[ym]) * 0.5 * ZS;
          const slope = Math.sqrt(gx * gx + gy * gy);
          r = 0;
          g = 0;
          b = 0;
          if (m > 0.001) {
            const t = clamp(0.5 + n1 * 1.1, 0, 1);
            let mr = 108 + 56 * t;
            let mg = 144 + 34 * t;
            let mb = 70 + 30 * t;
            const gp = sstep(0.12, 0.45, nb) * 0.55;
            mr += (200 - mr) * gp;
            mg += (180 - mg) * gp;
            mb += (108 - mb) * gp;
            r += m * mr;
            g += m * mg;
            b += m * mb;
          }
          if (f > 0.001) {
            const t = clamp(0.5 + n1, 0, 1);
            r += f * (30 + 20 * t);
            g += f * (58 + 30 * t);
            b += f * (46 + 12 * t);
          }
          if (k > 0.001) {
            const t = clamp(0.5 + nb * 1.4, 0, 1);
            let cr = 42 + 22 * t;
            let cg = 58 + 24 * t;
            let cb = 92 + 26 * t;
            const gr = sstep(-0.05, 0.25, n1 + F.hl[i] * 0.5) * 0.75;
            cr += (38 - cr) * gr;
            cg += (76 - cg) * gr;
            cb += (86 - cb) * gr;
            const hi = sstep(0.6, 0.95, hh * 5) * 0.25;
            cr += (120 - cr) * hi;
            cg += (130 - cg) * hi;
            cb += (146 - cb) * hi;
            const wet = 1 - sstep(1, 7, d);
            cr += (28 - cr) * wet;
            cg += (38 - cg) * wet;
            cb += (64 - cb) * wet;
            r += k * cr;
            g += k * cg;
            b += k * cb;
          }
          if (rr2 > 0.001) {
            const q = F.cq[i];
            const fl = Math.floor(q);
            const B = BANDS[((fl % 5) + 5) % 5];
            let cr = B[0];
            let cg = B[1];
            let cb = B[2];
            const fr = q - fl;
            // 台地的崖壁（階梯之間）比較暗，頂面邊緣有一條亮線
            const cliff = sstep(0.7, 0.78, fr) * (1 - sstep(0.84, 0.9, fr));
            const rim = sstep(0.86, 0.9, fr) * (1 - sstep(0.9, 0.98, fr));
            cr += -30 * cliff + 34 * rim;
            cg += -20 * cliff + 26 * rim;
            cb += -10 * cliff + 16 * rim;
            const lv = F.lav[i];
            cr += (70 - cr) * lv * 0.9;
            cg += (22 - cg) * lv * 0.9;
            cb += (14 - cb) * lv * 0.9;
            const vx = x - VOLC[0];
            const vy = y - VOLC[1];
            const dv = Math.sqrt(vx * vx + vy * vy);
            const ash = (1 - sstep(24, 80, dv)) * 0.9;
            cr += (58 - cr) * ash;
            cg += (44 - cg) * ash;
            cb += (46 - cb) * ash;
            r += rr2 * cr;
            g += rr2 * cg;
            b += rr2 * cb;
          }
          if (s > 0.001) {
            let cr = 96;
            let cg = 104;
            let cb = 124;
            // 雪：高的地方、平緩的坡；陡坡露出岩石
            let sn = sstep(0.27, 0.36, hh + 0.03 * nzC(x / 6, y / 6) + 0.025 * nb) * sstep(0.35, 0.6, s);
            sn = Math.max(sn * (1 - sstep(1.3, 2.4, slope) * 0.7), 0.35 * sstep(0.5, 0.8, s) * (1 - sstep(0.2, 0.3, hh)) * sstep(-0.1, 0.3, nb));
            cr += (242 - cr) * sn;
            cg += (246 - cg) * sn;
            cb += (252 - cb) * sn;
            const low = (1 - sn) * 0.7 * (1 - sstep(0.2, 0.3, hh));
            cr += (66 - cr) * low;
            cg += (94 - cg) * low;
            cb += (84 - cb) * low;
            r += s * cr;
            g += s * cg;
            b += s * cb;
          }
          // 淺色沙岸（黑岩海岸除外）
          const sand = (1 - sstep(0.5, 4.5, d)) * (1 - k) * (1 - rr2 * 0.6) * (1 - s * 0.5);
          r += (212 - r) * sand;
          g += (194 - g) * sand;
          b += (148 - b) * sand;
          // 河岸濕潤
          const rv = F.riv[i] * 0.35;
          r += (48 - r) * rv;
          g += (84 - g) * rv;
          b += (64 - b) * rv;
          const inv = 1 / Math.sqrt(slope * slope + 1);
          let kk = ((-LX * gx - LY * gy + LZ) * inv) / LZ;
          kk = clamp(kk, 0, 1.8);
          kk *= 1 - 0.5 * shB[i];
          kk += clamp((hh - hb[i]) * ZS * 0.05, -0.22, 0.22);
          const lit = 0.3 + 0.7 * Math.min(kk, 1.35);
          r *= lit;
          g *= lit;
          b *= lit;
          if (kk > 1) {
            r += (kk - 1) * 36;
            g += (kk - 1) * 26;
            b += (kk - 1) * 8;
          } else {
            r += (1 - kk) * 8;
            g += (1 - kk) * 12;
            b += (1 - kk) * 34;
          }
          // 海岸邊的暗線讓岸更清楚
          const edge = 1 - sstep(0, 1.6, d);
          r *= 1 - edge * 0.25;
          g *= 1 - edge * 0.2;
          b *= 1 - edge * 0.12;
          // 筆觸與顆粒
          const gr = GR[((y & 255) << 8) | (x & 255)];
          r += gr;
          g += gr;
          b += gr * 0.8;
        } else {
          const od = -d;
          const dd = Math.pow(sstep(0, 120, od), 0.8);
          if (dd < 0.35) {
            const t = dd / 0.35;
            r = 70 + (36 - 70) * t;
            g = 158 + (98 - 158) * t;
            b = 166 + (140 - 166) * t;
          } else {
            const t = (dd - 0.35) / 0.65;
            r = 36 + (18 - 36) * t;
            g = 98 + (52 - 98) * t;
            b = 140 + (98 - 140) * t;
          }
          // 東南方的暴風海域：深藍、灰暗
          const st = F.st[i];
          if (st > 0) {
            const sr = 20 + 26 * (1 - dd);
            const sg = 36 + 38 * (1 - dd);
            const sb = 58 + 34 * (1 - dd);
            r += (sr - r) * st * 0.85;
            g += (sg - g) * st * 0.85;
            b += (sb - b) * st * 0.85;
          }
          // 浪紋
          const wv = Math.sin((x * 0.3 + y * 0.95) * 0.62 + F.nw[i] * 9);
          const streak = sstep(0.84, 1, wv) * (0.07 + 0.16 * st) * (0.3 + 0.7 * dd) * (0.55 + 0.45 * F.ns[i]);
          r += (235 - r) * streak;
          g += (245 - g) * streak;
          b += (250 - b) * streak;
          const low = sstep(0.8, 1, -wv) * 0.05 * dd;
          r *= 1 - low;
          g *= 1 - low;
          b *= 1 - low;
          if (od < 50) {
            // 等深線（虛線）
            const ct = (Math.exp(-(((od - 22) / 0.8) ** 2)) + Math.exp(-(((od - 46) / 0.8) ** 2)) * 0.7) * 0.09;
            if (ct > 0.002 && nzA(x / 3, y / 3) > -0.1) {
              r += (230 - r) * ct;
              g += (245 - g) * ct;
              b += (250 - b) * ct;
            }
            // 陸地在海面上的影子（光從左上來）
            const px = x - 3;
            const py = y - 4;
            if (px >= 0 && py >= 0 && land[py * WW + px]) {
              r *= 0.8;
              g *= 0.82;
              b *= 0.86;
            }
            // 海岸泡沫
            if (od < 14) {
              const fo = (1 - sstep(0, 3.4, od)) * (0.55 + 0.45 * nzC(x / 5, y / 5)) + Math.exp(-(((od - 8) / 2.2) ** 2)) * 0.28 * Math.max(0, nzB(x / 7, y / 7) * 2) * (1 + st);
              const fr = 226 - st * 20;
              r += (fr - r) * fo;
              g += (fr + 12 - g) * fo;
              b += (fr + 16 - b) * fo;
            }
          }
          const gr = GR[(((y + 97) & 255) << 8) | ((x + 31) & 255)] * 0.45;
          r += gr;
          g += gr;
          b += gr;
        }
        D[o] = r;
        D[o + 1] = g;
        D[o + 2] = b;
        D[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    return cv;
  }
  // 暴風海域的範圍
  const STORMS = [[700, 580, 190], [860, 540, 170], [960, 430, 130], [560, 590, 120]];
  function stormAt(x, y) {
    let s = 0;
    for (let k = 0; k < STORMS.length; k++) {
      const q = STORMS[k];
      const e = ((x - q[0]) ** 2 + (y - q[1]) ** 2) / (q[2] * q[2]);
      if (e < 4) s = Math.max(s, Math.exp(-e * 1.4));
    }
    return s;
  }

  // ── 3. 小圖章（樹冠、松樹、雲團、節點） ──
  function dabSprite(light, mid, dark, magic) {
    const R = 24;
    const [cv, c] = mkS(R * 2 + 12, R * 2 + 12);
    const cx = R + 5;
    const cy = R + 5;
    ell(c, cx + R * 0.22, cy + R * 0.34, R * 0.98, R * 0.8, 'rgba(8,22,14,0.42)');
    const lumps = [[0, 0, 1], [-0.42, 0.18, 0.62], [0.44, 0.2, 0.6], [0.05, -0.35, 0.6], [0.1, 0.38, 0.58]];
    c.save();
    c.beginPath();
    lumps.forEach(([a, b2, r]) => {
      c.moveTo(cx + a * R + r * R * 0.82, cy + b2 * R);
      c.arc(cx + a * R, cy + b2 * R, r * R * 0.82, 0, Math.PI * 2);
    });
    c.clip();
    const g = c.createRadialGradient(cx - R * 0.35, cy - R * 0.42, R * 0.05, cx, cy, R * 1.05);
    g.addColorStop(0, light);
    g.addColorStop(0.5, mid);
    g.addColorStop(1, dark);
    c.fillStyle = g;
    c.fillRect(0, 0, R * 2 + 12, R * 2 + 12);
    // 葉叢的小高光
    c.globalAlpha = 0.35;
    [[-0.35, -0.3, 0.3], [0.2, -0.45, 0.22], [-0.05, -0.1, 0.18]].forEach(([a, b2, r]) => ell(c, cx + a * R, cy + b2 * R, r * R, r * R * 0.7, light));
    c.restore();
    if (magic) glowDot(c, cx - R * 0.2, cy - R * 0.25, R * 0.8, magic, 0.35);
    return cv;
  }
  function pineSprite(col, dark, snow) {
    const [cv, c] = mkS(20, 26);
    ell(c, 12, 22, 6, 2.2, 'rgba(10,20,30,0.35)');
    c.beginPath();
    c.moveTo(10, 1);
    c.lineTo(17, 21);
    c.quadraticCurveTo(10, 23.5, 3, 21);
    c.closePath();
    const g = c.createLinearGradient(3, 0, 17, 0);
    g.addColorStop(0, col);
    g.addColorStop(0.55, col);
    g.addColorStop(0.56, dark);
    g.addColorStop(1, dark);
    c.fillStyle = g;
    c.fill();
    if (snow) {
      c.fillStyle = 'rgba(245,250,255,0.92)';
      c.beginPath();
      c.moveTo(10, 1);
      c.lineTo(12.6, 8);
      c.lineTo(10.5, 7);
      c.lineTo(8.5, 8.5);
      c.lineTo(7.6, 7.4);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(235,242,252,0.7)';
      c.fillRect(5, 14, 4, 1.2);
    }
    return cv;
  }
  function puffSprite(light, shade) {
    const R = 64;
    const [cv, c] = mkS(R * 2, R * 2);
    const g = c.createRadialGradient(R - 14, R - 18, 4, R, R, R);
    g.addColorStop(0, light.replace('A', 1));
    g.addColorStop(0.45, light.replace('A', 0.92));
    g.addColorStop(0.72, shade.replace('A', 0.55));
    g.addColorStop(1, shade.replace('A', 0));
    c.fillStyle = g;
    c.fillRect(0, 0, R * 2, R * 2);
    return cv;
  }
  // 節點：像寶石一樣的圖釘
  const PIN = {
    camp: ['#fff2b8', '#ffd35a', '#b8801a'],
    hunt: ['#e2ffc4', '#8fd06a', '#3f8a38'],
    boss: ['#ffc4b8', '#e84a4a', '#8a1e22'],
    done: ['#f0e2ff', '#b88aff', '#5a3aa8'],
    unk: ['#e8e2d6', '#aaa292', '#6a6254'],
  };
  const PIN_R = { camp: 11.5, hunt: 8.5, boss: 12.5, done: 12.5, unk: 8.5 };
  function pinSprite(kind, r) {
    const pad = r + 12;
    const [cv, c] = mkS(pad * 2, pad * 2);
    const x = pad;
    const y = pad;
    const col = PIN[kind];
    if (kind !== 'unk') glowDot(c, x, y, r + 11, kind === 'boss' ? 'rgba(255,120,90,A)' : kind === 'done' ? 'rgba(210,170,255,A)' : 'rgba(255,240,190,A)', 0.55);
    ell(c, x + 1.5, y + r * 0.75, r * 1.05, r * 0.42, 'rgba(15,8,4,0.45)');
    c.fillStyle = '#23170e';
    c.beginPath();
    c.arc(x, y, r + 1.9, 0, Math.PI * 2);
    c.fill();
    const rg = c.createLinearGradient(x - r, y - r, x + r, y + r);
    rg.addColorStop(0, kind === 'unk' ? '#d8d2c4' : '#fbe7a6');
    rg.addColorStop(0.5, kind === 'unk' ? '#8a8272' : '#c89a44');
    rg.addColorStop(1, kind === 'unk' ? '#5a5448' : '#7a5620');
    c.fillStyle = rg;
    c.beginPath();
    c.arc(x, y, r + 1, 0, Math.PI * 2);
    c.fill();
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, col[0]);
    g.addColorStop(0.55, col[1]);
    g.addColorStop(1, col[2]);
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r - 0.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.ellipse(x - r * 0.32, y - r * 0.42, r * 0.42, r * 0.22, -0.5, 0, Math.PI * 2);
    c.fill();
    const ink = kind === 'unk' ? '#3a342c' : kind === 'done' ? '#2e1a56' : '#3a2210';
    c.fillStyle = ink;
    c.strokeStyle = ink;
    if (kind === 'camp') {
      const s = r * 0.62;
      c.beginPath();
      c.moveTo(x - s, y - s * 0.05);
      c.lineTo(x, y - s * 0.95);
      c.lineTo(x + s, y - s * 0.05);
      c.lineTo(x + s * 0.72, y - s * 0.05);
      c.lineTo(x + s * 0.72, y + s * 0.8);
      c.lineTo(x + s * 0.2, y + s * 0.8);
      c.lineTo(x + s * 0.2, y + s * 0.3);
      c.lineTo(x - s * 0.2, y + s * 0.3);
      c.lineTo(x - s * 0.2, y + s * 0.8);
      c.lineTo(x - s * 0.72, y + s * 0.8);
      c.lineTo(x - s * 0.72, y - s * 0.05);
      c.closePath();
      c.fill();
    } else if (kind === 'boss' || kind === 'done') {
      const s = r * 0.72;
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const q = i % 2 ? s * 0.45 : s;
        c.lineTo(x + Math.cos(a) * q, y + 0.5 + Math.sin(a) * q);
      }
      c.closePath();
      c.fill();
    } else if (kind === 'unk') {
      c.font = 'bold ' + Math.round(r * 1.35) + 'px ' + A.FONT;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('?', x, y + 1);
    } else {
      ell(c, x, y, r * 0.24, r * 0.24, 'rgba(30,70,24,0.55)');
    }
    return { cv, pad };
  }

  // ── 4. 地標 ──
  const LM = {
    ancientTree(c, x, y) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      glowDot(c, x, y - 30, 78, 'rgba(170,255,150,A)', 0.2);
      c.restore();
      ell(c, x + 8, y + 4, 38, 10, 'rgba(6,18,10,0.45)');
      // 樹根與樹幹
      c.fillStyle = '#4a3322';
      c.beginPath();
      c.moveTo(x - 20, y + 4);
      c.quadraticCurveTo(x - 8, y - 2, x - 6, y - 26);
      c.lineTo(x + 6, y - 26);
      c.quadraticCurveTo(x + 8, y - 2, x + 22, y + 4);
      c.quadraticCurveTo(x, y + 1, x - 20, y + 4);
      c.fill();
      c.fillStyle = 'rgba(160,120,80,0.5)';
      c.fillRect(x - 4, y - 24, 2, 22);
      const lumps = [[-26, -40, 15], [24, -42, 15], [0, -58, 19], [-14, -26, 13], [14, -26, 13], [-30, -58, 12], [28, -60, 12], [2, -74, 13], [-12, -48, 14], [14, -48, 14]];
      lumps.sort((a, b) => a[1] - b[1]).forEach(([a, b, s], i) => {
        const sp = L.dabs[i % 3 === 0 ? 4 : 3];
        const k = s / 24;
        c.drawImage(sp, x + a - (29 * k), y + b - (29 * k), 58 * k, 58 * k);
      });
      c.save();
      c.globalCompositeOperation = 'lighter';
      seed = 41;
      for (let i = 0; i < 14; i++) glowDot(c, x + rr(-34, 34), y + rr(-80, -24), rr(2, 4.5), i % 2 ? 'rgba(220,255,150,A)' : 'rgba(150,255,230,A)', 0.8);
      c.restore();
    },
    queenHall(c, x, y) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      glowDot(c, x, y - 22, 50, 'rgba(255,120,200,A)', 0.2);
      c.restore();
      ell(c, x + 5, y + 3, 32, 8, 'rgba(10,15,10,0.45)');
      const sg = c.createLinearGradient(x - 12, 0, x + 12, 0);
      sg.addColorStop(0, '#fbf2de');
      sg.addColorStop(1, '#c9b08c');
      c.fillStyle = sg;
      c.beginPath();
      c.moveTo(x - 12, y);
      c.lineTo(x - 10, y - 17);
      c.lineTo(x + 10, y - 17);
      c.lineTo(x + 12, y);
      c.quadraticCurveTo(x, y + 3, x - 12, y);
      c.fill();
      c.fillStyle = '#4a1c3c';
      c.beginPath();
      c.moveTo(x - 3.5, y + 1);
      c.lineTo(x - 3.5, y - 6);
      c.arc(x, y - 6, 3.5, Math.PI, 0);
      c.lineTo(x + 3.5, y + 1);
      c.fill();
      [[-7, -10], [7, -10]].forEach(([a, b]) => {
        glowDot(c, x + a, y + b, 5, 'rgba(255,220,130,A)', 0.8);
        ell(c, x + a, y + b, 1.3, 1.8, '#fff0b8');
      });
      const cap = (p) => {
        p.moveTo(x - 31, y - 13);
        p.bezierCurveTo(x - 33, y - 44, x + 33, y - 44, x + 31, y - 13);
        p.quadraticCurveTo(x, y - 20, x - 31, y - 13);
        p.closePath();
      };
      c.beginPath();
      cap(c);
      const g = c.createRadialGradient(x - 11, y - 34, 2, x, y - 22, 36);
      g.addColorStop(0, '#ffd0e8');
      g.addColorStop(0.42, '#e0619f');
      g.addColorStop(1, '#7c2358');
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = 'rgba(70,14,46,0.6)';
      c.lineWidth = 0.9;
      c.stroke();
      c.save();
      c.beginPath();
      cap(c);
      c.clip();
      c.fillStyle = 'rgba(255,245,250,0.85)';
      [[-17, -24, 3.6, 2.6], [-3, -33, 4.2, 2.8], [13, -27, 3.4, 2.4], [22, -18, 2.4, 1.8], [-24, -16, 2.2, 1.6], [4, -20, 2.6, 1.8]].forEach(([a, b, rx, ry]) => ell(c, x + a, y + b, rx, ry));
      c.restore();
      // 小皇冠
      const cg = c.createLinearGradient(0, y - 46, 0, y - 36);
      cg.addColorStop(0, '#fff0a0');
      cg.addColorStop(1, '#c08a20');
      c.fillStyle = cg;
      c.beginPath();
      c.moveTo(x - 6, y - 36.5);
      c.lineTo(x - 7, y - 44);
      c.lineTo(x - 3, y - 40.5);
      c.lineTo(x, y - 47);
      c.lineTo(x + 3, y - 40.5);
      c.lineTo(x + 7, y - 44);
      c.lineTo(x + 6, y - 36.5);
      c.closePath();
      c.fill();
      // 兩旁的小菇
      [[-34, 2, 5], [35, 3, 4.2], [-42, -6, 3.4]].forEach(([a, b, s]) => {
        ell(c, x + a + 1, y + b + 1, s, s * 0.35, 'rgba(0,0,0,0.3)');
        c.fillStyle = '#f4e6cc';
        c.fillRect(x + a - s * 0.22, y + b - s * 0.7, s * 0.44, s * 0.7);
        const q = c.createRadialGradient(x + a - s * 0.3, y + b - s * 1.1, 0.5, x + a, y + b - s * 0.8, s * 1.1);
        q.addColorStop(0, '#ffb0d0');
        q.addColorStop(1, '#b8306e');
        c.fillStyle = q;
        c.beginPath();
        c.moveTo(x + a - s, y + b - s * 0.6);
        c.quadraticCurveTo(x + a, y + b - s * 1.9, x + a + s, y + b - s * 0.6);
        c.closePath();
        c.fill();
      });
    },
    bellShrine(c, x, y) {
      ell(c, x + 4, y + 3, 22, 6, 'rgba(20,30,50,0.35)');
      // 石台
      const pg = c.createLinearGradient(0, y - 4, 0, y + 3);
      pg.addColorStop(0, '#e6ecf4');
      pg.addColorStop(1, '#8e9ab0');
      c.fillStyle = pg;
      c.beginPath();
      c.moveTo(x - 15, y - 3);
      c.lineTo(x + 15, y - 3);
      c.lineTo(x + 13, y + 2);
      c.lineTo(x - 13, y + 2);
      c.closePath();
      c.fill();
      // 柱子
      c.fillStyle = '#4a2a22';
      [-10, 10].forEach((a) => c.fillRect(x + a - 1, y - 14, 2, 11));
      // 鈴
      c.save();
      c.globalCompositeOperation = 'lighter';
      glowDot(c, x, y - 8, 16, 'rgba(255,215,120,A)', 0.55);
      c.restore();
      const bg = c.createLinearGradient(x - 4, 0, x + 4, 0);
      bg.addColorStop(0, '#fff0b0');
      bg.addColorStop(0.5, '#e0b048');
      bg.addColorStop(1, '#8a5a18');
      c.fillStyle = bg;
      c.beginPath();
      c.moveTo(x - 1.2, y - 13);
      c.quadraticCurveTo(x - 4, y - 12, x - 4.4, y - 5);
      c.lineTo(x + 4.4, y - 5);
      c.quadraticCurveTo(x + 4, y - 12, x + 1.2, y - 13);
      c.closePath();
      c.fill();
      // 屋頂
      c.beginPath();
      c.moveTo(x - 19, y - 12);
      c.quadraticCurveTo(x - 9, y - 14, x - 3, y - 23);
      c.lineTo(x + 3, y - 23);
      c.quadraticCurveTo(x + 9, y - 14, x + 19, y - 12);
      c.lineTo(x + 13, y - 10);
      c.lineTo(x - 13, y - 10);
      c.closePath();
      const rg = c.createLinearGradient(0, y - 23, 0, y - 10);
      rg.addColorStop(0, '#5a6c92');
      rg.addColorStop(1, '#27324c');
      c.fillStyle = rg;
      c.fill();
      c.fillStyle = 'rgba(246,250,255,0.95)';
      c.beginPath();
      c.moveTo(x - 17, y - 12.4);
      c.quadraticCurveTo(x - 9, y - 14.5, x - 3, y - 23);
      c.lineTo(x + 3, y - 23);
      c.quadraticCurveTo(x + 9, y - 14.5, x + 17, y - 12.4);
      c.quadraticCurveTo(x + 8, y - 16, x + 2, y - 19.5);
      c.lineTo(x - 2, y - 19.5);
      c.quadraticCurveTo(x - 8, y - 16, x - 17, y - 12.4);
      c.fill();
      // 鳥居
      const tx = x - 26;
      const ty = y + 6;
      ell(c, tx + 3, ty + 1, 9, 2.2, 'rgba(20,30,50,0.35)');
      c.fillStyle = '#c63b2a';
      c.fillRect(tx - 6, ty - 13, 1.8, 13);
      c.fillRect(tx + 4.2, ty - 13, 1.8, 13);
      c.fillRect(tx - 7, ty - 10, 14, 1.4);
      c.fillStyle = '#2a1a1a';
      c.beginPath();
      c.moveTo(tx - 10, ty - 15.5);
      c.quadraticCurveTo(tx, ty - 13.5, tx + 10, ty - 15.5);
      c.lineTo(tx + 9.5, ty - 13.4);
      c.lineTo(tx - 9.5, ty - 13.4);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(250,252,255,0.9)';
      c.fillRect(tx - 9, ty - 16.2, 18, 1);
    },
    volcano(c, x, y) {
      // 放射狀的山脊線
      c.save();
      c.strokeStyle = 'rgba(30,14,12,0.35)';
      c.lineWidth = 1.1;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + 0.2;
        const r1 = 14;
        const r2 = 48 + (i % 3) * 12;
        c.beginPath();
        c.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.85);
        c.quadraticCurveTo(x + Math.cos(a + 0.12) * (r1 + r2) * 0.5, y + Math.sin(a + 0.12) * (r1 + r2) * 0.42, x + Math.cos(a) * r2, y + Math.sin(a) * r2 * 0.85);
        c.stroke();
      }
      c.restore();
      // 火山口
      c.save();
      c.globalCompositeOperation = 'lighter';
      glowDot(c, x, y, 40, 'rgba(255,110,30,A)', 0.55);
      c.restore();
      ell(c, x, y, 12, 9, '#2a0e08');
      const g = c.createRadialGradient(x - 1, y + 1, 1, x, y, 9);
      g.addColorStop(0, '#fff2a0');
      g.addColorStop(0.35, '#ffb040');
      g.addColorStop(0.8, '#e0401a');
      g.addColorStop(1, 'rgba(120,20,10,0)');
      ell(c, x, y + 0.5, 9, 7, g);
    },
    lighthouse(c, x, y) {
      ell(c, x + 6, y + 2, 14, 4, 'rgba(0,0,0,0.4)');
      ell(c, x, y, 10, 4, '#3a3e46');
      const body = (p) => {
        p.moveTo(x - 5.5, y);
        p.lineTo(x - 3.5, y - 28);
        p.lineTo(x + 3.5, y - 28);
        p.lineTo(x + 5.5, y);
        p.closePath();
      };
      c.save();
      c.beginPath();
      body(c);
      c.clip();
      const g = c.createLinearGradient(x - 6, 0, x + 6, 0);
      g.addColorStop(0, '#fbfbf6');
      g.addColorStop(1, '#a8a8b0');
      c.fillStyle = g;
      c.fillRect(x - 6, y - 30, 12, 30);
      c.fillStyle = 'rgba(190,40,34,0.95)';
      c.fillRect(x - 6, y - 10, 12, 4.5);
      c.fillRect(x - 6, y - 21, 12, 4.5);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(x + 1.5, y - 30, 5, 30);
      c.restore();
      c.fillStyle = '#2a2a32';
      c.fillRect(x - 5, y - 29.5, 10, 1.8);
      c.fillStyle = '#fff2a8';
      c.fillRect(x - 3, y - 35, 6, 5.5);
      c.fillStyle = '#9a2a24';
      c.beginPath();
      c.moveTo(x - 4.5, y - 35);
      c.lineTo(x, y - 40);
      c.lineTo(x + 4.5, y - 35);
      c.closePath();
      c.fill();
    },
    shipwreck(c, x, y) {
      c.save();
      c.translate(x, y);
      c.rotate(-0.22);
      ell(c, 2, 4, 24, 5, 'rgba(230,240,245,0.35)');
      const g = c.createLinearGradient(0, -12, 0, 6);
      g.addColorStop(0, '#6a4a34');
      g.addColorStop(1, '#2a1c14');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-22, -6);
      c.lineTo(20, -13);
      c.lineTo(14, 3);
      c.quadraticCurveTo(-6, 7, -18, 3);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(200,170,130,0.45)';
      c.lineWidth = 0.7;
      for (let k = -14; k < 16; k += 6) {
        c.beginPath();
        c.moveTo(k, -9 + k * -0.1);
        c.lineTo(k - 1, 3);
        c.stroke();
      }
      c.strokeStyle = '#2a1a12';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(-2, -8);
      c.lineTo(7, -33);
      c.moveTo(10, -11);
      c.lineTo(15, -24);
      c.moveTo(2, -22);
      c.lineTo(15, -18);
      c.stroke();
      c.fillStyle = 'rgba(200,196,180,0.8)';
      c.beginPath();
      c.moveTo(6, -31);
      c.lineTo(17, -25);
      c.lineTo(11, -21);
      c.lineTo(8, -24);
      c.closePath();
      c.fill();
      c.restore();
    },
    shell(c, x, y) {
      ell(c, x + 4, y + 2, 17, 4.5, 'rgba(0,0,0,0.35)');
      c.beginPath();
      c.moveTo(x - 15, y);
      c.quadraticCurveTo(x - 15, y - 19, x, y - 22);
      c.quadraticCurveTo(x + 17, y - 17, x + 15, y);
      c.quadraticCurveTo(x, y + 4, x - 15, y);
      c.closePath();
      const g = c.createRadialGradient(x - 5, y - 15, 1, x, y - 9, 20);
      g.addColorStop(0, '#f6d2c4');
      g.addColorStop(0.6, '#c07a72');
      g.addColorStop(1, '#6a3a3c');
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = 'rgba(80,30,34,0.7)';
      c.lineWidth = 1;
      c.beginPath();
      for (let a = 0; a < 9; a += 0.2) {
        const r = 2 + a * 1.2;
        const px = x + Math.cos(a) * r * 0.9;
        const py = y - 10 + Math.sin(a) * r * 0.7;
        a ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
    },
    hotspring(c, x, y, rx) {
      ell(c, x, y + 1, rx + 3, rx * 0.5 + 2.5, 'rgba(60,30,20,0.5)');
      ell(c, x, y, rx + 1.5, rx * 0.5 + 1.2, '#b8a08c');
      const g = c.createRadialGradient(x - rx * 0.3, y - rx * 0.15, 1, x, y, rx);
      g.addColorStop(0, '#d8fff6');
      g.addColorStop(0.5, '#6fd6cf');
      g.addColorStop(1, '#2f8c9a');
      ell(c, x, y, rx, rx * 0.5, g);
    },
    village(c, x, y) {
      [[-10, -8, '#b8503a'], [8, -12, '#4a6a9a'], [0, 2, '#8a5a3a'], [16, 0, '#b8503a']].forEach(([a, b, roof]) => {
        const hx = x + a;
        const hy = y + b;
        ell(c, hx + 3, hy + 1, 6, 2, 'rgba(0,0,0,0.3)');
        c.fillStyle = '#efe2c6';
        c.fillRect(hx - 4, hy - 5, 8, 5);
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.fillRect(hx + 1, hy - 5, 3, 5);
        c.fillStyle = roof;
        c.beginPath();
        c.moveTo(hx - 5.5, hy - 4.5);
        c.lineTo(hx, hy - 10);
        c.lineTo(hx + 5.5, hy - 4.5);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)';
        c.beginPath();
        c.moveTo(hx - 5.5, hy - 4.5);
        c.lineTo(hx, hy - 10);
        c.lineTo(hx, hy - 4.5);
        c.closePath();
        c.fill();
      });
    },
    fields(c, x, y) {
      c.save();
      c.translate(x, y);
      c.rotate(-0.28);
      [[-26, -8, 20, 12, 'rgba(226,200,110,0.55)'], [-4, -8, 18, 12, 'rgba(160,190,90,0.5)'], [16, -8, 16, 12, 'rgba(210,170,90,0.5)'], [-24, 6, 16, 11, 'rgba(170,196,96,0.5)'], [-6, 6, 22, 11, 'rgba(230,206,120,0.5)'], [18, 6, 14, 11, 'rgba(150,180,86,0.5)']].forEach(([a, b, w, h, col]) => {
        c.fillStyle = col;
        c.fillRect(a, b, w, h);
        c.strokeStyle = 'rgba(90,70,30,0.25)';
        c.lineWidth = 0.6;
        for (let k = a + 2.5; k < a + w; k += 2.5) {
          c.beginPath();
          c.moveTo(k, b + 0.5);
          c.lineTo(k, b + h - 0.5);
          c.stroke();
        }
      });
      c.restore();
    },
    spire(c, x, y, h) {
      ell(c, x + 4, y + 1, 7, 2, 'rgba(40,10,5,0.4)');
      c.beginPath();
      c.moveTo(x - 4, y);
      c.lineTo(x - 3, y - h * 0.6);
      c.lineTo(x - 4.5, y - h * 0.8);
      c.lineTo(x - 1, y - h);
      c.lineTo(x + 3.5, y - h * 0.94);
      c.lineTo(x + 3.5, y - h * 0.5);
      c.lineTo(x + 5, y);
      c.closePath();
      const g = c.createLinearGradient(x - 4, 0, x + 5, 0);
      g.addColorStop(0, '#e89a64');
      g.addColorStop(0.45, '#b85a34');
      g.addColorStop(1, '#6a2a18');
      c.fillStyle = g;
      c.fill();
    },
    palm(c, x, y, s) {
      ell(c, x + s * 0.8, y + 1, s * 0.9, s * 0.25, 'rgba(0,0,0,0.3)');
      c.strokeStyle = '#6a4a2a';
      c.lineWidth = s * 0.18;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + s * 0.2, y - s, x + s * 0.5, y - s * 1.6);
      c.stroke();
      const tx = x + s * 0.5;
      const ty = y - s * 1.6;
      [[-1.2, 0.1], [-0.6, -0.8], [0.5, -0.85], [1.2, 0.15], [0.1, 0.5]].forEach(([a, b]) => {
        c.fillStyle = b < 0 ? '#5f9a4a' : '#3f6e36';
        c.beginPath();
        c.moveTo(tx, ty);
        c.quadraticCurveTo(tx + a * s * 0.5, ty + b * s * 0.8 - s * 0.3, tx + a * s, ty + b * s * 0.5 + s * 0.3);
        c.quadraticCurveTo(tx + a * s * 0.5, ty + b * s * 0.4, tx, ty);
        c.fill();
      });
    },
    reef(c, x, y, s) {
      ell(c, x, y + 1, s * 1.7, s * 0.6, 'rgba(235,245,248,0.55)');
      c.beginPath();
      c.moveTo(x - s, y);
      c.lineTo(x - s * 0.6, y - s * 0.8);
      c.lineTo(x + s * 0.1, y - s);
      c.lineTo(x + s * 0.8, y - s * 0.4);
      c.lineTo(x + s, y);
      c.closePath();
      const g = c.createLinearGradient(x - s, 0, x + s, 0);
      g.addColorStop(0, '#6a7280');
      g.addColorStop(1, '#262a34');
      c.fillStyle = g;
      c.fill();
    },
    dock(c, x, y) {
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(x - 1, y + 3, 28, 5);
      c.fillStyle = '#7a5a3c';
      c.fillRect(x - 3, y, 28, 5.5);
      c.fillStyle = '#3a2a1c';
      [0, 9, 18].forEach((a) => c.fillRect(x + a, y + 5.5, 2, 4));
      c.strokeStyle = 'rgba(40,24,14,0.5)';
      c.lineWidth = 0.7;
      for (let a = 2; a < 25; a += 3.5) {
        c.beginPath();
        c.moveTo(x + a, y + 0.5);
        c.lineTo(x + a, y + 5);
        c.stroke();
      }
    },
    bridge(c, x, y, ang) {
      c.save();
      c.translate(x, y);
      c.rotate(ang);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(-9, -3, 20, 8);
      c.fillStyle = '#8a643e';
      c.fillRect(-10, -4.5, 20, 9);
      c.strokeStyle = 'rgba(40,24,12,0.55)';
      c.lineWidth = 0.7;
      for (let k = -8; k < 10; k += 3) {
        c.beginPath();
        c.moveTo(k, -4.5);
        c.lineTo(k, 4.5);
        c.stroke();
      }
      c.fillStyle = '#4a3220';
      c.fillRect(-10, -5.5, 20, 1.3);
      c.fillRect(-10, 4.2, 20, 1.3);
      c.restore();
    },
  };

  // ── 5. 向量細節層 ──
  function* buildDetails(c, F) {
    const at = (x, y) => clamp(Math.round(y), 0, WH - 1) * WW + clamp(Math.round(x), 0, WW - 1);
    const R = routes();
    const nodes = Object.keys(POS).map((k) => POS[k]);
    // 不能種樹的地方（節點、路線、河流、岩漿、地標）先畫成一張遮罩，查表就好
    const BLK = lowMask(2, (q) => {
      nodes.forEach((p) => {
        q.beginPath();
        q.arc(p[0], p[1], 17, 0, Math.PI * 2);
        q.fill();
      });
      q.lineWidth = 11;
      R.forEach((r) => {
        if (r.sky) return;
        q.beginPath();
        poly(q, r.pts, false);
        q.stroke();
      });
      RIVERS_S.forEach((rv) => {
        q.lineWidth = rv.w * 1.6 + 3;
        q.beginPath();
        poly(q, rv.pts, false);
        q.stroke();
      });
      q.lineWidth = 18;
      q.beginPath();
      poly(q, LAVA_S, false);
      q.stroke();
      KEEP_OUT.forEach((b) => {
        q.beginPath();
        q.arc(b[0], b[1], b[2], 0, Math.PI * 2);
        q.fill();
      });
    }, 0);
    const blk = (x, y) => BLK.m[clamp(Math.round(y / 2), 0, BLK.h - 1) * BLK.w + clamp(Math.round(x / 2), 0, BLK.w - 1)] > 0.3;
    const free = (x, y, r) => {
      const d = r * 0.5;
      return !(blk(x, y) || blk(x - d, y) || blk(x + d, y) || blk(x, y - d) || blk(x, y + d));
    };
    // 樹冠：依大小預先縮好的小圖（貼上時不用再縮放）
    const DAB = {};
    const dab = (k, x, y, s) => {
      const q = Math.max(1, Math.round(s * 2)) / 2;
      const key = k + ':' + q;
      if (!DAB[key]) {
        const w = q * 2.4;
        const [cv, cc] = mkS(w, w);
        cc.drawImage(L.dabs[k], 0, 0, w, w);
        DAB[key] = cv;
      }
      const w = q * 2.4;
      c.drawImage(DAB[key], Math.round((x - w / 2) * S) / S, Math.round((y - w / 2) * S) / S, w, w);
    };
    // 河流：上游細、下游寬
    const river = (pts, w, cols) => {
      c.lineCap = 'round';
      c.lineJoin = 'round';
      const n = pts.length;
      cols.forEach(([col, add, mul, dx, dy]) => {
        c.strokeStyle = col;
        for (let i = 1; i < n; i++) {
          const t = i / n;
          c.lineWidth = (w * (0.45 + 0.55 * t)) * mul + add;
          c.beginPath();
          c.moveTo(pts[i - 1][0] + dx, pts[i - 1][1] + dy);
          c.lineTo(pts[i][0] + dx, pts[i][1] + dy);
          c.stroke();
        }
      });
    };
    RIVERS_S.forEach((r) => river(r.pts, r.w, [
      ['rgba(20,40,40,0.28)', 3.5, 1, 0.8, 1.2],
      ['#2b6a86', 1.2, 1, 0, 0],
      ['#4a98b8', 0, 1, 0, 0],
      ['rgba(200,236,250,0.55)', 0, 0.28, -0.6, -0.6],
    ]));
    // 湖
    ell(c, 548, 296, 34, 17, 'rgba(20,40,30,0.3)', -0.1);
    ell(c, 548, 294, 34, 17, '#d8c898', -0.1);
    const lg = c.createRadialGradient(542, 290, 3, 548, 294, 34);
    lg.addColorStop(0, '#9ad8e8');
    lg.addColorStop(0.6, '#4a98b8');
    lg.addColorStop(1, '#2b6a86');
    ell(c, 548, 294, 31, 15, lg, -0.1);
    ell(c, 536, 289, 11, 2.2, 'rgba(255,255,255,0.45)', -0.1);
    // 岩漿河
    river(LAVA_S.slice().reverse(), 6, [
      ['rgba(30,8,4,0.7)', 5, 1, 0, 0],
      ['#b8300e', 1.5, 1, 0, 0],
      ['#ff7a24', 0, 0.7, 0, 0],
      ['#ffe07a', 0, 0.22, 0, 0],
    ]);
    // 峽谷的裂縫
    [[[722, 330], [736, 322], [748, 326], [762, 314], [778, 316], [796, 304]], [[640, 180], [652, 174], [664, 178], [676, 170]], [[800, 330], [812, 322], [826, 324], [840, 314]]].forEach((cr) => {
      c.strokeStyle = 'rgba(40,10,6,0.85)';
      c.lineWidth = 2.6;
      c.lineCap = 'round';
      c.beginPath();
      poly(c, cr, false);
      c.stroke();
      c.strokeStyle = 'rgba(255,120,40,0.85)';
      c.lineWidth = 0.9;
      c.stroke();
    });
    // 古樹與女王殿堂周圍的林間空地（柔和的亮綠）
    [[252, 348, 40, 24], [352, 334, 38, 20]].forEach(([x, y, rx, ry]) => {
      const g = c.createRadialGradient(x, y, 2, x, y, rx);
      g.addColorStop(0, 'rgba(150,196,104,0.6)');
      g.addColorStop(0.6, 'rgba(110,160,86,0.35)');
      g.addColorStop(1, 'rgba(90,140,70,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
    });
    const items = [];
    const add = (y, fn) => items.push([y, fn]);
    const placed = [];
    function* grid(step, test, fn, sz) {
      for (let y = 60; y < WH - 10; y += step) {
        yield;
        for (let x = 20; x < WW - 20; x += step) {
          const px = x + rr(-step, step) * 0.5;
          const py = y + rr(-step, step) * 0.5;
          const s = sz(px, py);
          if (!s) continue;
          const i = at(px, py);
          if (!F.land[i] || F.sd[i] < 3 + s * 0.4) continue;
          if (!test(i, px, py)) continue;
          if (!free(px, py, s)) continue;
          placed.push([px, py]);
          add(py, () => fn(px, py, s, i));
        }
      }
    }
    seed = 23;
    const nz = F.nzB;
    // 森林：密密的樹冠
    yield* grid(6.4, (i, x, y) => F.wF[i] > 0.5 + nz(x / 30, y / 30) * 0.12, (x, y, s) => {
      const v = nz(x / 45 + 7, y / 45);
      const k = rnd() < 0.05 ? 4 : v > 0.25 ? 2 : v < -0.2 ? 0 : 1;
      dab(k, x, y, s);
    }, (x, y) => 4.2 + 2.4 * (0.5 + 0.5 * nz(x / 18, y / 18)) + rnd() * 0.8);
    // 森林邊緣零星的樹
    yield* grid(9, (i, x, y) => F.wF[i] > 0.2 && F.wF[i] <= 0.55 && nz(x / 12, y / 12) > 0, (x, y, s) => dab(1, x, y, s), () => 3.6 + rnd() * 1.2);
    // 草原：一叢一叢的小樹林
    yield* grid(7, (i, x, y) => F.wF[i] + F.wS[i] + F.wR[i] + F.wC[i] < 0.3 && fbm(nz, x / 30, y / 30, 2) > 0.1, (x, y, s) => dab(2, x, y, s), () => 3 + rnd() * 1.4);
    // 雪峰：雪線以下的松林
    yield* grid(6.5, (i, x, y) => F.wS[i] > 0.45 && F.h[i] < 0.3 && nz(x / 22, y / 22) > -0.15, (x, y, s) => c.drawImage(L.pineSnow, x - s * 0.5, y - s * 1.1, s, s * 1.3), () => 7 + rnd() * 3);
    // 黑岩海岸：被海風吹彎的深色松樹
    yield* grid(9, (i, x, y) => F.wC[i] > 0.6 && F.sd[i] > 7 && nz(x / 20, y / 20) > 0.05, (x, y, s) => c.drawImage(L.pineDark, x - s * 0.5, y - s * 1.1, s, s * 1.3), () => 7 + rnd() * 2);
    // 峽谷：少量乾枯的矮樹與石柱
    yield* grid(14, (i, x, y) => F.wR[i] > 0.6 && Math.hypot(x - VOLC[0], y - VOLC[1]) > 80 && nz(x / 16, y / 16) > 0.3, (x, y, s) => dab(5, x, y, s), () => 2.8 + rnd());
    [[700, 124, 20], [748, 130, 15], [696, 256, 13], [736, 358, 12], [652, 128, 13], [620, 212, 11], [900, 290, 14], [806, 348, 10]].forEach(([x, y, h]) => add(y, () => LM.spire(c, x, y, h)));
    // 地標
    add(360, () => LM.ancientTree(c, 252, 360));
    add(340, () => LM.queenHall(c, 352, 340));
    add(224, () => LM.bellShrine(c, 332, 224));
    add(VOLC[1], () => LM.volcano(c, VOLC[0], VOLC[1]));
    add(342, () => LM.hotspring(c, 612, 342, 13));
    add(368, () => LM.hotspring(c, 684, 368, 10));
    add(520, () => LM.lighthouse(c, 484, 518));
    add(424, () => LM.shell(c, 760, 424));
    add(410, () => LM.village(c, 478, 410));
    add(1, () => LM.fields(c, 532, 388));
    add(410, () => LM.dock(c, 792, 410));
    items.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < items.length; i++) {
      if (i % 60 === 59) yield;
      items[i][1]();
    }
    // 森林裡發光的菇與苔光
    c.save();
    c.globalCompositeOperation = 'lighter';
    seed = 77;
    for (let i = 0; i < 90; i++) {
      const x = rr(60, 420);
      const y = rr(320, 540);
      const j = at(x, y);
      if (!F.land[j] || F.wF[j] < 0.6) continue;
      const k = rnd();
      glowDot(c, x, y, rr(2.5, 6), k < 0.5 ? 'rgba(150,255,210,A)' : k < 0.8 ? 'rgba(230,255,140,A)' : 'rgba(255,140,220,A)', rr(0.35, 0.7));
    }
    c.restore();
    // 沉船、礁石、小島上的椰子樹
    LM.shipwreck(c, 744, 534);
    [[786, 530, 5], [806, 524, 3.5], [828, 518, 6], [852, 504, 4], [860, 520, 3.5], [566, 534, 3.5], [40, 520, 5], [54, 530, 3.5], [920, 360, 4], [934, 372, 3]].forEach(([x, y, s]) => {
      if (!F.land[at(x, y)]) LM.reef(c, x, y, s);
    });
    LM.palm(c, 36, 234, 8);
    LM.palm(c, 880, 412, 7);
    LM.palm(c, 638, 46, 6);
    // 橋：路線跨過河流或岩漿的地方
    const rivers = RIVERS_S.map((r) => r.pts).concat([LAVA_S]);
    R.forEach((q) => {
      if (q.sky) return;
      for (let s = 1; s < q.pts.length; s++) {
        const a = q.pts[s - 1];
        const b = q.pts[s];
        rivers.forEach((rv) => {
          for (let i = 1; i < rv.length; i++) {
            const x = segX(a, b, rv[i - 1], rv[i]);
            if (x) LM.bridge(c, x[0], x[1], Math.atan2(b[1] - a[1], b[0] - a[0]));
          }
        });
      }
    });
  }

  // 暴風雲（烤在底圖上，閃電時再疊一層亮的）
  const STORM_CLOUDS = [[640, 566, 1.1], [740, 560, 1.3], [846, 552, 1.2], [930, 520, 1.0], [952, 440, 0.9], [560, 572, 0.8]];
  function cloudBank(c, list, puff, alpha) {
    seed = 61;
    list.forEach(([x, y, s]) => {
      for (let k = 0; k < 7; k++) {
        const r = rr(26, 40) * s;
        c.globalAlpha = alpha;
        c.drawImage(puff, x + rr(-40, 40) * s - r, y + rr(-14, 10) * s - r, r * 2, r * 2);
      }
    });
    c.globalAlpha = 1;
  }

  // 羅盤
  function compass(c, x, y, r) {
    c.save();
    c.translate(x, y);
    c.globalAlpha = 0.95;
    const bg = c.createRadialGradient(0, 0, 0, 0, 0, r + 6);
    bg.addColorStop(0, 'rgba(250,236,200,0.28)');
    bg.addColorStop(1, 'rgba(250,236,200,0)');
    c.fillStyle = bg;
    c.fillRect(-r - 6, -r - 6, r * 2 + 12, r * 2 + 12);
    c.strokeStyle = 'rgba(236,212,150,0.85)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 0.6;
    c.beginPath();
    c.arc(0, 0, r - 4, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 32; i++) {
      const a = (i * Math.PI) / 16;
      const l = i % 4 === 0 ? 4 : 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
      c.lineTo(Math.cos(a) * (r - 4 - l), Math.sin(a) * (r - 4 - l));
      c.stroke();
    }
    const star = (len, wid, rot, n, c1, c2) => {
      for (let i = 0; i < n; i++) {
        const a = rot + (i * Math.PI * 2) / n;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        [[1, c1], [-1, c2]].forEach(([sg, col]) => {
          c.fillStyle = i === 0 && n === 4 && len > r * 0.8 ? (sg > 0 ? '#e0624a' : '#9a2e24') : col;
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(ca * len, sa * len);
          c.lineTo(-sa * wid * sg, ca * wid * sg);
          c.closePath();
          c.fill();
        });
      }
    };
    star(r * 0.6, r * 0.1, Math.PI / 4, 4, '#d9c08a', '#8a6a3a');
    star(r * 0.95, r * 0.15, -Math.PI / 2, 4, '#f6e6b8', '#b8904a');
    ell(c, 0, 0, 2.6, 2.6, '#f6e6b8');
    c.restore();
    txt(c, 'N', x, y - r - 8, { size: 11, font: SERIF, color: '#f6e6b8', halo: 'rgba(20,20,30,0.7)', haloW: 3 });
  }

  // 浮空的時空間神殿（一張精靈圖，每格上下漂浮）
  const SKY = { x: 728, y: 18, w: 220, h: 150 };
  function buildSky() {
    const [cv, c] = mkS(SKY.w, SKY.h, SKY.x, SKY.y);
    const isle = (x, y, w, h, top) => {
      // 倒錐形的岩塊
      c.beginPath();
      c.moveTo(x - w, y);
      c.quadraticCurveTo(x - w * 0.7, y + h * 0.5, x - w * 0.25, y + h * 0.95);
      c.lineTo(x - w * 0.05, y + h * 1.35);
      c.lineTo(x + w * 0.15, y + h * 0.95);
      c.quadraticCurveTo(x + w * 0.7, y + h * 0.55, x + w, y);
      c.closePath();
      const g = c.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, '#b4a8c8');
      g.addColorStop(0.5, '#6e6288');
      g.addColorStop(1, '#3a3252');
      c.fillStyle = g;
      c.fill();
      c.save();
      c.clip();
      c.strokeStyle = 'rgba(30,20,50,0.35)';
      c.lineWidth = 0.7;
      for (let k = 1; k < 4; k++) {
        c.beginPath();
        c.moveTo(x - w, y + (h * k) / 4);
        c.quadraticCurveTo(x, y + (h * k) / 4 + 4, x + w, y + (h * k) / 4 - 1);
        c.stroke();
      }
      c.restore();
      // 懸在下面的發光水晶
      c.fillStyle = 'rgba(180,230,255,0.9)';
      c.beginPath();
      c.moveTo(x - w * 0.05 - 2, y + h * 1.25);
      c.lineTo(x - w * 0.05, y + h * 1.35 + 5);
      c.lineTo(x - w * 0.05 + 2, y + h * 1.25);
      c.fill();
      const tg = c.createLinearGradient(0, y - h * 0.3, 0, y + h * 0.3);
      tg.addColorStop(0, top[0]);
      tg.addColorStop(1, top[1]);
      ell(c, x, y, w, h * 0.3, tg);
      ell(c, x - w * 0.25, y - h * 0.08, w * 0.45, h * 0.1, 'rgba(255,255,255,0.35)');
    };
    const grass = ['#e4f2d8', '#9cc0a0'];
    const marble = ['#f4eefa', '#bdb2d4'];
    // 虛空的光暈
    c.save();
    c.globalCompositeOperation = 'lighter';
    glowDot(c, 846, 88, 100, 'rgba(160,140,255,A)', 0.22);
    glowDot(c, 866, 70, 50, 'rgba(255,220,140,A)', 0.3);
    c.restore();
    isle(764, 80, 20, 20, grass);
    isle(806, 60, 17, 18, marble);
    isle(890, 64, 19, 20, marble);
    isle(916, 108, 18, 18, grass);
    isle(842, 96, 58, 30, grass);
    // 神殿：柱廊與圓頂
    const tx = 818;
    const ty = 94;
    ell(c, tx + 3, ty + 1, 21, 4, 'rgba(40,30,70,0.3)');
    c.fillStyle = '#e8e2f2';
    c.fillRect(tx - 18, ty - 3, 36, 4);
    c.fillStyle = '#b8b0cc';
    c.fillRect(tx - 18, ty, 36, 1.4);
    for (let i = 0; i < 6; i++) {
      const px = tx - 15 + i * 6;
      const pg = c.createLinearGradient(px - 1.3, 0, px + 1.3, 0);
      pg.addColorStop(0, '#ffffff');
      pg.addColorStop(1, '#a89ec0');
      c.fillStyle = pg;
      c.fillRect(px - 1.3, ty - 18, 2.6, 15);
    }
    c.fillStyle = '#ece6f6';
    c.fillRect(tx - 19, ty - 21, 38, 3.5);
    const dg = c.createRadialGradient(tx - 5, ty - 30, 1, tx, ty - 24, 14);
    dg.addColorStop(0, '#fff6d8');
    dg.addColorStop(0.6, '#d8b86a');
    dg.addColorStop(1, '#8a6a2a');
    c.fillStyle = dg;
    c.beginPath();
    c.moveTo(tx - 13, ty - 21);
    c.quadraticCurveTo(tx - 12, ty - 34, tx, ty - 35);
    c.quadraticCurveTo(tx + 12, ty - 34, tx + 13, ty - 21);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffe9a0';
    c.fillRect(tx - 0.6, ty - 41, 1.2, 6);
    ell(c, tx, ty - 41.5, 1.8, 1.8, '#fff6c8');
    // 星楓樹
    const sx = 868;
    const sy = 98;
    ell(c, sx + 3, sy + 1, 12, 3, 'rgba(40,30,70,0.35)');
    c.fillStyle = '#5a3a2a';
    c.beginPath();
    c.moveTo(sx - 3, sy);
    c.quadraticCurveTo(sx - 1, sy - 10, sx - 2, sy - 18);
    c.lineTo(sx + 2, sy - 18);
    c.quadraticCurveTo(sx + 1, sy - 10, sx + 3, sy);
    c.fill();
    c.strokeStyle = '#5a3a2a';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(sx, sy - 14);
    c.lineTo(sx - 8, sy - 22);
    c.moveTo(sx, sy - 15);
    c.lineTo(sx + 8, sy - 23);
    c.stroke();
    c.save();
    c.globalCompositeOperation = 'lighter';
    glowDot(c, sx, sy - 26, 26, 'rgba(255,190,90,A)', 0.55);
    c.restore();
    [[-9, -24, 7, '#ffb04a'], [9, -25, 7, '#ff9a3a'], [0, -32, 8.5, '#ffc45a'], [-5, -20, 5.5, '#ff8a3a'], [6, -19, 5.5, '#ffb04a']].forEach(([a, b, s, col]) => {
      c.fillStyle = col;
      c.beginPath();
      A.mapleLeafPath(c, sx + a, sy + b, s);
      c.fill();
      c.fillStyle = 'rgba(255,250,210,0.45)';
      c.beginPath();
      A.mapleLeafPath(c, sx + a - s * 0.15, sy + b - s * 0.15, s * 0.5);
      c.fill();
    });
    // 小島上的東西：石柱、王座
    [[756, 72], [772, 72]].forEach(([x, y]) => {
      c.fillStyle = '#e8e2f2';
      c.fillRect(x - 1.5, y - 10, 3, 10);
      c.fillStyle = '#a89ec0';
      c.fillRect(x + 0.4, y - 10, 1.1, 10);
    });
    return cv;
  }

  // 世界地圖的框：深色木框＋金線＋四角花飾＋標題牌
  function buildFrame() {
    const [cv, c] = mkS(WW, WH);
    // 內側陰影
    const inner = (x0, y0, x1, y1, d) => {
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(15,8,4,0.5)');
      g.addColorStop(1, 'rgba(15,8,4,0)');
      c.fillStyle = g;
      return d;
    };
    const B = 11;
    inner(0, B, 0, B + 18);
    c.fillRect(B, B, WW - B * 2, 18);
    inner(0, WH - B, 0, WH - B - 18);
    c.fillRect(B, WH - B - 18, WW - B * 2, 18);
    inner(B, 0, B + 18, 0);
    c.fillRect(B, B, 18, WH - B * 2);
    inner(WW - B, 0, WW - B - 18, 0);
    c.fillRect(WW - B - 18, B, 18, WH - B * 2);
    // 木框
    const wood = c.createLinearGradient(0, 0, WW, WH);
    wood.addColorStop(0, '#4a3020');
    wood.addColorStop(0.5, '#2e1d12');
    wood.addColorStop(1, '#3e281a');
    c.fillStyle = wood;
    c.beginPath();
    c.rect(0, 0, WW, WH);
    c.rect(B, WH - B, WW - B * 2, -(WH - B * 2));
    c.fill('evenodd');
    // 木紋
    c.save();
    c.beginPath();
    c.rect(0, 0, WW, WH);
    c.rect(B, WH - B, WW - B * 2, -(WH - B * 2));
    c.clip('evenodd');
    seed = 3;
    c.strokeStyle = 'rgba(255,220,170,0.06)';
    c.lineWidth = 0.8;
    for (let i = 0; i < 60; i++) {
      const y = rr(0, WH);
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(WW, y + rr(-3, 3));
      c.stroke();
    }
    c.restore();
    // 金線
    c.strokeStyle = '#d9b86c';
    c.lineWidth = 1.3;
    c.strokeRect(B - 0.5, B - 0.5, WW - B * 2 + 1, WH - B * 2 + 1);
    c.strokeStyle = 'rgba(217,184,108,0.5)';
    c.lineWidth = 0.7;
    c.strokeRect(4.5, 4.5, WW - 9, WH - 9);
    c.strokeStyle = 'rgba(10,6,2,0.8)';
    c.lineWidth = 0.8;
    c.strokeRect(B + 1.2, B + 1.2, WW - B * 2 - 2.4, WH - B * 2 - 2.4);
    // 四角花飾
    [[0, 0, 1, 1], [WW, 0, -1, 1], [0, WH, 1, -1], [WW, WH, -1, -1]].forEach(([x, y, sx, sy]) => {
      c.save();
      c.translate(x, y);
      c.scale(sx, sy);
      c.strokeStyle = '#d9b86c';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(B + 3, B + 34);
      c.bezierCurveTo(B + 3, B + 14, B + 14, B + 3, B + 34, B + 3);
      c.moveTo(B + 3, B + 34);
      c.bezierCurveTo(B + 6, B + 40, B + 13, B + 38, B + 12, B + 32);
      c.moveTo(B + 34, B + 3);
      c.bezierCurveTo(B + 40, B + 6, B + 38, B + 13, B + 32, B + 12);
      c.stroke();
      c.fillStyle = '#2e1d12';
      c.beginPath();
      c.arc(B, B, 10, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#d9b86c';
      c.beginPath();
      c.arc(B, B, 9, 0, Math.PI * 2);
      c.stroke();
      c.restore();
      c.save();
      c.translate(x + sx * B, y + sy * B);
      c.fillStyle = '#c0523a';
      c.beginPath();
      A.mapleLeafPath(c, 0, 0.5, 6.5);
      c.fill();
      c.strokeStyle = '#f0d690';
      c.lineWidth = 0.6;
      c.stroke();
      c.restore();
    });
    // 標題牌
    const tx = WW / 2;
    const ty = 20;
    const hw = 92;
    const plate = (p, e) => {
      p.moveTo(tx - hw - e, ty);
      p.lineTo(tx - hw + 10 - e, ty - 13 - e);
      p.lineTo(tx + hw - 10 + e, ty - 13 - e);
      p.lineTo(tx + hw + e, ty);
      p.lineTo(tx + hw - 10 + e, ty + 13 + e);
      p.lineTo(tx - hw + 10 - e, ty + 13 + e);
      p.closePath();
    };
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = 8 * S;
    c.shadowOffsetY = 3 * S;
    c.beginPath();
    plate(c, 2);
    c.fillStyle = '#2a1a10';
    c.fill();
    c.restore();
    c.beginPath();
    plate(c, 0);
    const pg = c.createLinearGradient(0, ty - 13, 0, ty + 13);
    pg.addColorStop(0, '#4a2e1c');
    pg.addColorStop(1, '#24150b');
    c.fillStyle = pg;
    c.fill();
    c.strokeStyle = '#d9b86c';
    c.lineWidth = 1.2;
    c.stroke();
    c.beginPath();
    plate(c, -3);
    c.strokeStyle = 'rgba(217,184,108,0.45)';
    c.lineWidth = 0.6;
    c.stroke();
    [[-1], [1]].forEach(([s]) => {
      c.fillStyle = '#d9b86c';
      c.beginPath();
      c.moveTo(tx + s * (hw - 20), ty);
      c.lineTo(tx + s * (hw - 16), ty - 3);
      c.lineTo(tx + s * (hw - 12), ty);
      c.lineTo(tx + s * (hw - 16), ty + 3);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(217,184,108,0.7)';
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(tx + s * (hw - 24), ty);
      c.lineTo(tx + s * 58, ty);
      c.stroke();
    });
    const tg = c.createLinearGradient(0, ty - 9, 0, ty + 9);
    tg.addColorStop(0, '#fff2c4');
    tg.addColorStop(1, '#d6a84c');
    txt(c, '星楓大陸', tx, ty + 1, { size: 19, font: SERIF, color: tg, spacing: 7, halo: 'rgba(20,10,4,0.8)', haloW: 3, glow: 'rgba(255,200,100,0.35)', glowB: 6 });
    return cv;
  }

  function* buildGen() {
    L = { ready: false };
    const T0 = performance.now();
    {
      ROUTES = null;
      const F = yield* buildFields();
      const t1 = performance.now();
      const terr = yield* buildTerrain(F);
      const t2 = performance.now();
      yield;
      // 小圖章
      L.dabs = [
        dabSprite('#6aa05a', '#2e6a38', '#123a22'),
        dabSprite('#7aae5e', '#3a7a3e', '#17442a'),
        dabSprite('#b4c878', '#6a9a4a', '#2e5a2e'),
        dabSprite('#5ab8a0', '#1f6a5a', '#0c3a34', 'rgba(140,255,220,A)'),
        dabSprite('#8ad07a', '#2f7a4a', '#0e3a28', 'rgba(170,255,170,A)'),
        dabSprite('#a88a5a', '#6a5a3a', '#3a2a1a'),
      ];
      L.dabs[4] = dabSprite('#8ad07a', '#2f7a4a', '#0e3a28', 'rgba(170,255,170,A)');
      L.pineSnow = pineSprite('#3e6a62', '#1e3e3c', true);
      L.pineDark = pineSprite('#34504c', '#18282a', false);
      L.puff = puffSprite('rgba(255,255,255,A)', 'rgba(196,204,226,A)');
      L.storm = puffSprite('rgba(92,104,126,A)', 'rgba(30,38,54,A)');
      L.cloud = puffSprite('rgba(255,255,255,A)', 'rgba(220,228,240,A)');
      L.soft = puffSprite('rgba(255,255,255,A)', 'rgba(250,250,255,A)');
      L.shade = puffSprite('rgba(150,160,196,A)', 'rgba(150,160,196,A)');
      // 底圖
      const [base, c] = mkS(WW, WH);
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.drawImage(terr, 0, 0, WW, WH);
      // 經緯線（只在海上）
      const [gcv, gc] = mkS(WW, WH);
      gc.strokeStyle = 'rgba(230,240,255,0.07)';
      gc.lineWidth = 0.8;
      for (let x = 80; x < WW; x += 100) {
        gc.beginPath();
        gc.moveTo(x, 0);
        gc.lineTo(x, WH);
        gc.stroke();
      }
      for (let y = 60; y < WH; y += 100) {
        gc.beginPath();
        gc.moveTo(0, y);
        gc.lineTo(WW, y);
        gc.stroke();
      }
      gc.globalCompositeOperation = 'destination-out';
      gc.beginPath();
      poly(gc, LAND, true);
      gc.lineWidth = 12;
      gc.fill();
      gc.stroke();
      c.drawImage(gcv, 0, 0, WW, WH);
      yield;
      yield* buildDetails(c, F);
      yield;
      // 時空間神殿投在大陸上的影子
      ell(c, 846, 150, 70, 12, 'rgba(20,10,40,0.16)');
      // 暴風雲與羅盤
      cloudBank(c, STORM_CLOUDS, L.storm, 0.75);
      compass(c, 898, 488, 30);
      // 大氣：左上方暖光、右下冷色、四周暗角
      c.save();
      c.globalCompositeOperation = 'screen';
      const sun = c.createRadialGradient(170, 40, 20, 170, 40, 620);
      sun.addColorStop(0, 'rgba(255,228,165,0.3)');
      sun.addColorStop(1, 'rgba(255,226,160,0)');
      c.fillStyle = sun;
      c.fillRect(0, 0, WW, WH);
      c.globalCompositeOperation = 'multiply';
      const cool = c.createLinearGradient(0, 0, WW, WH);
      cool.addColorStop(0, 'rgba(255,255,255,1)');
      cool.addColorStop(0.55, 'rgba(255,255,255,1)');
      cool.addColorStop(1, 'rgba(178,190,222,1)');
      c.fillStyle = cool;
      c.fillRect(0, 0, WW, WH);
      c.restore();
      const v = c.createRadialGradient(WW / 2, WH / 2, 250, WW / 2, WH / 2, 600);
      v.addColorStop(0, 'rgba(10,8,20,0)');
      v.addColorStop(1, 'rgba(10,8,20,0.34)');
      c.fillStyle = v;
      c.fillRect(0, 0, WW, WH);
      L.base = base;
      yield;
      L.frame = buildFrame();
      yield;
      L.sky = buildSky();
      {
        const [bcv, bc] = mkS(SKY.w + 40, SKY.h, SKY.x - 20, SKY.y);
        bc.save();
        bc.translate(846, 92);
        bc.strokeStyle = 'rgba(255,236,190,0.2)';
        bc.lineWidth = 0.8;
        bc.beginPath();
        bc.ellipse(0, 0, 86, 50, 0, 0, Math.PI * 2);
        bc.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          bc.beginPath();
          bc.moveTo(Math.cos(a) * 82, Math.sin(a) * 47);
          bc.lineTo(Math.cos(a) * 90, Math.sin(a) * 52);
          bc.stroke();
        }
        bc.restore();
        bc.lineCap = 'round';
        bc.beginPath();
        poly(bc, TIME_RIVER, false);
        bc.strokeStyle = 'rgba(150,210,255,0.22)';
        bc.lineWidth = 6;
        bc.stroke();
        bc.strokeStyle = 'rgba(200,236,255,0.4)';
        bc.lineWidth = 2;
        bc.stroke();
        L.skyBack = bcv;
        const [ecv, ec] = mkS(80, 24);
        const bg = ec.createLinearGradient(0, 0, 80, 0);
        bg.addColorStop(0, 'rgba(255,240,170,0.5)');
        bg.addColorStop(1, 'rgba(255,240,170,0)');
        ec.fillStyle = bg;
        ec.beginPath();
        ec.moveTo(0, 12);
        ec.lineTo(80, 1);
        ec.lineTo(80, 23);
        ec.closePath();
        ec.fill();
        L.beam = ecv;
      }
      // 岩漿脈動的發光層（只包住峽谷一帶）
      const lb = [640, 170, 250, 90];
      const [lcv, lc] = mkS(lb[2], lb[3], lb[0], lb[1]);
      lc.lineCap = 'round';
      lc.lineJoin = 'round';
      lc.shadowColor = 'rgba(255,110,30,1)';
      lc.shadowBlur = 12 * S;
      lc.strokeStyle = 'rgba(255,140,50,0.9)';
      lc.lineWidth = 5;
      lc.beginPath();
      poly(lc, LAVA_S, false);
      lc.stroke();
      glowDot(lc, VOLC[0], VOLC[1], 26, 'rgba(255,140,50,A)', 0.8);
      L.lava = { cv: lcv, x: lb[0], y: lb[1], w: lb[2], h: lb[3] };
      // 節點
      L.pins = {};
      ['camp', 'hunt', 'boss', 'done', 'unk'].forEach((k) => {
        L.pins[k] = pinSprite(k, PIN_R[k]);
      });
      const [wcv, wc] = mkS(90, 90);
      wc.drawImage(L.soft, 0, 0, 90, 90);
      L.wisp = wcv;
      const [dcv, dc] = mkS(DRIFT[0], DRIFT[1]);
      dc.globalAlpha = 0.14;
      dc.drawImage(L.storm, 40, 50, 108, 48);
      dc.globalAlpha = 0.55;
      dc.drawImage(L.cloud, 10, 18, 64, 38);
      dc.drawImage(L.cloud, 34, 10, 72, 48);
      dc.drawImage(L.cloud, 80, 20, 56, 35);
      L.drift = dcv;
      L.boats = BOATS.map(([sc, dk, rot]) => {
        const [bcv, bc] = mkS(52 * sc, 46 * sc, -26 * sc, -36 * sc);
        bc.scale(sc, sc);
        bc.rotate(rot);
        boatArt(bc, dk);
        return bcv;
      });
      // 鯨魚尾巴
      const [tcv, tc] = mkS(30, 26, -15, -24);
      tc.fillStyle = '#2a3a52';
      tc.beginPath();
      tc.moveTo(-3, 2);
      tc.quadraticCurveTo(-2, -9, -1.5, -14);
      tc.quadraticCurveTo(-10, -16, -13, -22);
      tc.quadraticCurveTo(-5, -21, 0, -18);
      tc.quadraticCurveTo(5, -21, 13, -22);
      tc.quadraticCurveTo(10, -16, 1.5, -14);
      tc.quadraticCurveTo(2, -9, 3, 2);
      tc.closePath();
      tc.fill();
      tc.fillStyle = 'rgba(160,190,220,0.4)';
      tc.fillRect(-2.5, -13, 1.2, 14);
      L.tail = tcv;
      L.riversLow = RIVERS_S.map((r) => ({ pts: r.pts.filter((q) => q[1] > 292 || q[0] < 190), w: r.w }));
      const [hcv, hc] = mkS(64, 64);
      glowDot(hc, 32, 32, 32, 'rgba(255,250,225,A)', 0.95);
      L.halo = hcv;
      // 雲霧
      L.fog = {};
      for (const r in FOG) {
        const bl = FOG[r];
        let x0 = 1e9;
        let y0 = 1e9;
        let x1 = -1e9;
        let y1 = -1e9;
        bl.forEach(([x, y, rad]) => {
          x0 = Math.min(x0, x - rad * 1.6);
          y0 = Math.min(y0, y - rad * 1.6);
          x1 = Math.max(x1, x + rad * 1.6);
          y1 = Math.max(y1, y + rad * 1.6);
        });
        const [fcv, fc] = mkS(x1 - x0, y1 - y0, x0, y0);
        seed = 100 + +r;
        // 雲海：底下柔和的霧 → 偏藍的陰影團 → 白色雲團 → 左上的亮面
        bl.forEach(([x, y, rad]) => {
          fc.globalAlpha = 0.75;
          fc.drawImage(L.soft, x - rad * 1.55, y - rad * 1.35, rad * 3.1, rad * 2.7);
        });
        const lumps = [];
        bl.forEach(([x, y, rad]) => {
          for (let k = 0; k < 6; k++) lumps.push([x + rr(-0.7, 0.7) * rad, y + rr(-0.55, 0.5) * rad, rad * rr(0.38, 0.62)]);
        });
        lumps.sort((a, b) => a[1] - b[1]);
        lumps.forEach(([x, y, q]) => {
          fc.globalAlpha = 0.55;
          fc.drawImage(L.shade, x - q * 1.05 + q * 0.12, y - q * 1.05 + q * 0.3, q * 2.1, q * 2.1);
          fc.globalAlpha = 0.95;
          fc.drawImage(L.soft, x - q, y - q, q * 2, q * 2);
          fc.globalAlpha = 0.7;
          fc.drawImage(L.soft, x - q * 0.75 - q * 0.22, y - q * 0.75 - q * 0.28, q * 1.5, q * 1.5);
        });
        fc.globalAlpha = 1;
        // 雲的頂部受暖光、底部偏藍
        fc.globalCompositeOperation = 'source-atop';
        const sg = fc.createLinearGradient(0, y0, 0, y1);
        sg.addColorStop(0, 'rgba(255,240,210,0.22)');
        sg.addColorStop(1, 'rgba(110,120,165,0.28)');
        fc.fillStyle = sg;
        fc.fillRect(x0, y0, x1 - x0, y1 - y0);
        yield;
        L.fog[r] = { cv: fcv, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      // 會動的東西用的點：海面閃光、暴風浪頭、海岸浪花
      seed = 99;
      L.glints = [];
      L.caps = [];
      L.foam = [];
      const at = (x, y) => clamp(Math.round(y), 0, WH - 1) * WW + clamp(Math.round(x), 0, WW - 1);
      for (let i = 0; i < 3000 && (L.glints.length < 26 || L.caps.length < 24 || L.foam.length < 60); i++) {
        const x = rr(20, WW - 20);
        const y = rr(24, WH - 18);
        const d = -F.sd[at(x, y)];
        const st = stormAt(x, y);
        if (d > 18 && st < 0.3 && L.glints.length < 26 && !L.glints.some((w) => Math.hypot(w[0] - x, w[1] - y) < 50)) L.glints.push([x, y, rnd()]);
        else if (d > 12 && st > 0.4 && L.caps.length < 24 && !L.caps.some((w) => Math.hypot(w[0] - x, w[1] - y) < 26)) L.caps.push([x, y, rnd()]);
        else if (d > 1.5 && d < 4 && L.foam.length < 60 && !L.foam.some((w) => Math.hypot(w[0] - x, w[1] - y) < 18)) L.foam.push([x, y, rnd()]);
      }
      L.glints = L.glints.filter((w) => Math.hypot(w[0] - 898, w[1] - 488) > 44);
      // 變老用的區域權重（低解析度就夠了）
      const sm = F.small;
      L.age = { 1: sm.ws[0], 2: sm.ws[3], 3: sm.ws[2], 4: sm.ws[1], w: sm.w, h: sm.h, k: sm.k };
      L.ageSig = '';
      L.aged = null;
      L.stateSig = null;
      L.glow = {};
      L.names = {};
      L.comp = null;
      L.lion = null;
      L.times = { fields: t1 - T0, terrain: t2 - t1, total: performance.now() - T0 };
      L.ready = true;
    }
  }
  // 建圖：可以一口氣建完（打開地圖時），也可以在閒置時一小段一小段地建
  let job = null;
  function stepBuild(stop) {
    if (L && L.ready) return true;
    if (!job) job = buildGen();
    const mode = A.mode;
    A.mode = null;
    try {
      for (;;) {
        if (job.next().done) {
          job = null;
          return true;
        }
        if (stop && stop()) return false;
      }
    } catch (e) {
      job = null;
      L = null;
      throw e;
    } finally {
      A.mode = mode;
    }
  }
  const build = () => stepBuild(null);

  // 打倒 Boss 之後土地變老：該區稍微褪色、偏暖
  const ageSig = () => {
    let sig = '';
    for (const r in AGE_FLAG) if (G.world.flags[AGE_FLAG[r]]) sig += r;
    return sig;
  };
  function agedBase(sig) {
    if (!sig) return L.base;
    if (L.ageSig === sig && L.aged) return L.aged;
    const w = L.base.width;
    const h = L.base.height;
    const cv = mk(w, h);
    const c = cv.getContext('2d');
    c.drawImage(L.base, 0, 0);
    const id = c.getImageData(0, 0, w, h);
    const d = id.data;
    const ws = sig.split('').map((r) => L.age[r]);
    const K = L.age.k * S;
    const aw = L.age.w;
    const ah = L.age.h;
    for (let py = 0; py < h; py++) {
      const row = Math.min(ah - 1, (py / K) | 0) * aw;
      for (let px = 0; px < w; px++) {
        const i = row + Math.min(aw - 1, (px / K) | 0);
        let a = 0;
        for (let k = 0; k < ws.length; k++) if (ws[k][i] > a) a = ws[k][i];
        if (a < 0.02) continue;
        a *= 0.3;
        const o = (py * w + px) * 4;
        const r = d[o];
        const g = d[o + 1];
        const b = d[o + 2];
        const l = 0.3 * r + 0.59 * g + 0.11 * b;
        d[o] = r + (l * 1.08 + 10 - r) * a;
        d[o + 1] = g + (l * 0.98 - g) * a;
        d[o + 2] = b + (l * 0.82 - 4 - b) * a;
      }
    }
    c.putImageData(id, 0, 0);
    L.aged = cv;
    L.ageSig = sig;
    return cv;
  }

  // ── 狀態層：路線 → 雲霧 → 區域名稱 → 節點（進度改變時才重畫） ──
  const regionOpen = (r) => r === 1 || G.data.mapOrder.some((id) => G.data.maps[id].region === r && G.world.visited[id]);
  const bossOf = (r) => {
    const id = G.data.mapOrder.find((m) => G.data.maps[m].region === r && G.data.maps[m].type === 'boss');
    return id && G.data.maps[id].boss ? G.data.maps[id].boss.m : null;
  };
  const pinKind = (id) => {
    const m = G.data.maps[id];
    if (!G.world.visited[id]) return 'unk';
    if (m.type === 'boss') return m.boss && G.world.flags[m.boss.m + 'Defeated'] ? 'done' : 'boss';
    return m.type === 'camp' ? 'camp' : 'hunt';
  };
  function stateSig() {
    let s = '';
    for (const id of G.data.mapOrder) s += G.world.visited[id] ? pinKind(id)[0] : '.';
    for (let r = 1; r <= 5; r++) s += G.story.hasLeaf(r) ? 'L' : '-';
    return s;
  }
  // 底圖（可能已變老）＋狀態層合成一張，每格只要貼一次
  function buildComposite(ageSig) {
    const [cv, c] = mkS(WW, WH);
    c.drawImage(agedBase(ageSig), 0, 0, WW, WH);
    const maps = G.data.maps;
    // 路線：走過的是亮的點點小路，沒走過的是淡淡的虛線
    routes().forEach((q) => {
      const seen = G.world.visited[q.a] && G.world.visited[q.b];
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      poly(c, q.pts, false);
      if (q.sky) {
        c.setLineDash([2, 7]);
        c.strokeStyle = seen ? 'rgba(255,240,200,0.75)' : 'rgba(230,230,255,0.35)';
        c.lineWidth = seen ? 2 : 1.5;
        c.stroke();
        c.setLineDash([]);
        return;
      }
      c.strokeStyle = seen ? 'rgba(20,10,4,0.45)' : 'rgba(20,10,4,0.25)';
      c.lineWidth = seen ? 4.6 : 3.4;
      c.stroke();
      if (seen) {
        c.strokeStyle = 'rgba(255,230,160,0.25)';
        c.lineWidth = 3;
        c.stroke();
      }
      c.setLineDash(seen ? [0.1, 5.2] : [0.1, 6.5]);
      c.strokeStyle = seen ? '#fff3d0' : 'rgba(240,230,210,0.6)';
      c.lineWidth = seen ? 2.6 : 2;
      c.stroke();
      c.setLineDash([]);
    });
    // 雲霧
    for (const r in FOG) {
      if (regionOpen(+r)) continue;
      const f = L.fog[r];
      const prev = bossOf(+r - 1);
      c.globalAlpha = prev && G.world.flags[prev + 'Defeated'] ? 0.86 : 0.97;
      c.drawImage(f.cv, f.x, f.y, f.w, f.h);
    }
    c.globalAlpha = 1;
    // 區域名稱
    for (const r in REGION_LABEL) {
      const ch = G.data.story.chapters[r];
      if (!ch) continue;
      const [x, y] = REGION_LABEL[r];
      const open = regionOpen(+r);
      const leaf = G.story.hasLeaf(+r);
      const w1 = txt(c, ch.no, x, y - 11, { size: 10.5, font: SERIF, color: open ? '#f1dca2' : '#d8ccb4', spacing: 4, halo: 'rgba(20,12,6,0.72)', haloW: 3 });
      c.strokeStyle = open ? 'rgba(241,220,162,0.8)' : 'rgba(216,204,180,0.6)';
      c.lineWidth = 0.8;
      [-1, 1].forEach((s) => {
        const a = x + s * (w1 / 2 + 5);
        const b = x + s * (w1 / 2 + 22);
        c.beginPath();
        c.moveTo(a, y - 11);
        c.lineTo(b, y - 11);
        c.stroke();
        c.fillStyle = c.strokeStyle;
        c.beginPath();
        c.moveTo(b + s * 3, y - 11);
        c.lineTo(b, y - 13);
        c.lineTo(b - s * 3, y - 11);
        c.lineTo(b, y - 9);
        c.closePath();
        c.fill();
      });
      const name = open ? ch.name : '？？？';
      const w2 = txt(c, name, x, y + 7, { size: 18, font: SERIF, color: open ? '#fff4d8' : '#e0d8c8', spacing: open ? 4 : 2, halo: 'rgba(24,14,6,0.78)', haloW: 4.5, glow: 'rgba(0,0,0,0.5)', glowB: 4 });
      if (leaf) {
        const lx = x + w2 / 2 + 12;
        c.save();
        c.globalCompositeOperation = 'lighter';
        glowDot(c, lx, y + 7, 12, 'rgba(255,220,140,A)', 0.4);
        c.restore();
        c.fillStyle = ch.leaf ? ch.leaf.color : '#ff9a4a';
        c.strokeStyle = 'rgba(30,16,6,0.8)';
        c.lineWidth = 1;
        c.beginPath();
        A.mapleLeafPath(c, lx, y + 7, 7);
        c.fill();
        c.stroke();
      }
    }
    L.comp = cv;
  }
  // 名字先畫成小圖快取，每格貼在節點下面
  function nameSprite(id, k) {
    const key = id + k;
    if (!L.names[key]) {
      const str = k === 'unk' ? '？？？' : G.data.maps[id].name;
      const [mc, mcx] = mkS(10, 10);
      mcx.font = 'bold 12px ' + A.FONT;
      const w = Math.ceil(mcx.measureText(str).width) + 10;
      const [cv, c] = mkS(w, 22);
      txt(c, str, w / 2, 11, { size: 12, color: '#fff6e0', halo: 'rgba(20,12,6,0.85)', haloW: 3.4 });
      L.names[key] = { cv, w };
      mc.width = 1;
    }
    return L.names[key];
  }
  function nodeName(c, id, p, k) {
    txt(c, k === 'unk' ? '？？？' : G.data.maps[id].name, p[0], p[1] + PIN_R[k] * 1.2 + 10, { size: 12, color: '#fff6e0', halo: 'rgba(20,12,6,0.85)', haloW: 3.4 });
  }

  // ════════════════════════ 會動的東西 ════════════════════════
  // 預先做好的發光點（每格用 drawImage，比每次建立漸層快）
  const glowSpr = (key, col) => {
    if (!L.glow[key]) {
      const [cv, c] = mkS(32, 32);
      glowDot(c, 16, 16, 16, col, 1);
      L.glow[key] = cv;
    }
    return L.glow[key];
  };
  function glow(c, key, col, x, y, r, a) {
    if (a <= 0.004) return;
    c.globalAlpha = Math.min(1, a);
    c.drawImage(glowSpr(key, col), x - r, y - r, r * 2, r * 2);
  }

  // 船：預先畫成小圖，每格只做搖晃
  function boat(c, x, y, t, i) {
    const b = Math.sin(t * (i === 2 ? 3.2 : 2) + x) * (i === 2 ? 2 : 1.2);
    const B = BOATS[i];
    const px = Math.round((x - 26 * B[0]) * S) / S;
    const py = Math.round((y + b - 36 * B[0]) * S) / S;
    c.drawImage(L.boats[i], px, py, 52 * B[0], 46 * B[0]);
  }
  function boatArt(c, dark) {
    ell(c, -6, 4, 22, 2.5, 'rgba(235,245,250,0.4)');
    ell(c, 3, 5, 16, 2.5, 'rgba(0,10,20,0.3)');
    c.fillStyle = dark ? '#3a2a22' : '#6a4630';
    c.beginPath();
    c.moveTo(-15, -2);
    c.lineTo(15, -2);
    c.quadraticCurveTo(11, 5, 0, 5);
    c.quadraticCurveTo(-11, 5, -15, -2);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,220,170,0.25)';
    c.fillRect(-14, -2, 28, 1.2);
    c.strokeStyle = '#2a1a12';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(0, -2);
    c.lineTo(0, -27);
    c.stroke();
    const sg = c.createLinearGradient(0, 0, 13, 0);
    sg.addColorStop(0, dark ? '#9a9aa2' : '#fffaf0');
    sg.addColorStop(1, dark ? '#5a5a66' : '#cfc6b4');
    c.fillStyle = sg;
    c.beginPath();
    c.moveTo(1, -26);
    c.quadraticCurveTo(13, -17, 12, -5);
    c.lineTo(1, -5);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(-1, -24);
    c.quadraticCurveTo(-8, -15, -8, -6);
    c.lineTo(-1, -6);
    c.closePath();
    c.fill();
    c.fillStyle = '#c0523a';
    c.beginPath();
    c.moveTo(0, -27);
    c.lineTo(7, -29);
    c.lineTo(0, -31);
    c.closePath();
    c.fill();
  }
  function whale(c, x, y, t) {
    const ph = (t * 0.1) % 1;
    const up = ph < 0.45 ? Math.sin((ph / 0.45) * Math.PI) : 0;
    ell(c, x, y + 2, 12 + up * 6, 3, 'rgba(230,240,245,' + (0.25 + up * 0.35).toFixed(2) + ')');
    if (up <= 0.05) return;
    // 尾巴從水面露出來：只貼上半截
    const vis = Math.max(1, Math.round(up * 24 * S) / S);
    c.drawImage(L.tail, 0, 0, 30 * S, vis * S, x - 15, y + 2 - vis, 30, vis);
  }
  function birds(c, t) {
    c.strokeStyle = 'rgba(30,24,20,0.6)';
    c.lineWidth = 1.1;
    c.lineCap = 'round';
    c.beginPath();
    [[0, 150, 0.022, 0], [0.5, 320, 0.017, 2]].forEach(([off, by, spd, ph]) => {
      const u = (t * spd + off) % 1;
      const x = -40 + u * (WW + 80);
      const y = by + Math.sin(u * 8 + ph) * 26;
      [[0, 0], [-10, -5], [-10, 6], [-20, 1]].forEach(([dx, dy], i) => {
        const f = Math.sin(t * 8 + i) * 2.4;
        c.moveTo(x + dx - 4, y + dy - f);
        c.quadraticCurveTo(x + dx - 1.5, y + dy - 1.5, x + dx, y + dy + 0.8);
        c.quadraticCurveTo(x + dx + 1.5, y + dy - 1.5, x + dx + 4, y + dy - f);
      });
    });
    c.stroke();
  }
  // 時空間神殿：時間像水一樣流、空間像風一樣吹
  const TIME_RIVER = (() => {
    const p = [];
    for (let i = 0; i <= 48; i++) {
      const u = i / 48;
      const a = u * Math.PI * 2;
      p.push([846 + Math.cos(a) * 96, 104 + Math.sin(a) * 24 + Math.sin(a * 2) * 6]);
    }
    return p;
  })();
  function skyTemple(c, t) {
    const bob = Math.sin(t * 0.9) * 1.5;
    // 時鐘般的光環與時間之河的底色（預先畫好）
    c.drawImage(L.skyBack, SKY.x - 20, SKY.y, SKY.w + 40, SKY.h);
    // 時間之河：環繞浮島、往上流的水
    c.save();
    c.lineCap = 'round';
    c.beginPath();
    poly(c, TIME_RIVER, false);
    c.setLineDash([3, 14]);
    c.lineDashOffset = -t * 22;
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 2;
    c.stroke();
    c.setLineDash([]);
    c.restore();
    c.drawImage(L.sky, SKY.x, SKY.y + Math.round(bob * S) / S, SKY.w, SKY.h);
    // 從神殿島流下、又往上捲回去的瀑布
    c.save();
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(790, 100 + bob);
    c.bezierCurveTo(782, 120, 790, 132, 800, 128);
    c.strokeStyle = 'rgba(190,230,255,0.55)';
    c.lineWidth = 3;
    c.stroke();
    c.setLineDash([2, 6]);
    c.lineDashOffset = -t * 16;
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 1.4;
    c.stroke();
    c.setLineDash([]);
    // 空間之風：弧形的風線
    c.lineWidth = 1;
    c.strokeStyle = '#eef4ff';
    c.globalAlpha = 0.45;
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.25 + i * 0.27) % 1;
      const cx = 760 + i * 46 + ph * 26;
      const cy = 36 + (i % 2) * 64;
      const r = 12 + i * 2;
      const a0 = Math.PI * (1.05 + ph * 0.3);
      c.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
      c.arc(cx, cy, r, a0, a0 + Math.PI * 0.45);
    }
    c.stroke();
    c.globalAlpha = 1;
    c.restore();
    // 星楓樹的光點
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + i * 1.05;
      glow(c, 'star', 'rgba(255,240,180,A)', 868 + Math.cos(a) * 20, 70 + bob + Math.sin(a * 1.3) * 12, 5, Math.sin(t * 3 + i * 2) * 0.8 + 0.2);
    }
    c.globalAlpha = 1;
    c.restore();
  }

  function drawAnim(c, t, open) {
    // 海面閃光、海岸浪花、暴風白浪：依透明度分成幾組，一組只填一次
    const BK = 3;
    for (let k = 0; k < BK; k++) {
      const lo = k / BK;
      const hi = (k + 1) / BK;
      const aa = (k + 0.5) / BK;
      c.globalAlpha = aa;
      c.fillStyle = '#ffffff';
      c.beginPath();
      L.glints.forEach(([x, y, p], i) => {
        const a = Math.sin(t * 1.8 + p * 9 + i) * 1.2 - 0.35;
        if (a <= lo || a > hi && k < BK - 1) return;
        const q = 2.4;
        c.moveTo(x, y - q);
        c.quadraticCurveTo(x, y, x + q, y);
        c.quadraticCurveTo(x, y, x, y + q);
        c.quadraticCurveTo(x, y, x - q, y);
        c.quadraticCurveTo(x, y, x, y - q);
      });
      L.foam.forEach(([x, y, p]) => {
        const a = (Math.sin(t * 1.4 + p * 12) * 0.5 + 0.2) * 1.4;
        if (a <= lo || a > hi && k < BK - 1) return;
        c.moveTo(x + 3.2, y);
        c.ellipse(x, y, 3.2, 1.3, 0, 0, Math.PI * 2);
      });
      c.fill();
      c.strokeStyle = '#e8f0f4';
      c.lineWidth = 1.1;
      c.lineCap = 'round';
      c.beginPath();
      L.caps.forEach(([x, y, p]) => {
        const ph = (t * 0.45 + p) % 1;
        const a = Math.sin(ph * Math.PI);
        if (a <= lo || a > hi && k < BK - 1) return;
        const cx = x + ph * 8;
        c.moveTo(cx + Math.cos(Math.PI * 1.15) * 5, y + Math.sin(Math.PI * 1.15) * 5);
        c.arc(cx, y, 5, Math.PI * 1.15, Math.PI * 1.85);
      });
      c.stroke();
    }
    c.globalAlpha = 1;
    c.globalAlpha = 0.28;
    c.strokeStyle = '#c8d4e4';
    c.lineWidth = 0.8;
    c.beginPath();
    for (let i = 0; i < 28; i++) {
      const x = 540 + ((i * 151) % 420);
      const y0 = 470 + ((i * 53 + t * 180) % 90);
      c.moveTo(x - (y0 - 470) * 0.25, y0);
      c.lineTo(x - (y0 - 470) * 0.25 - 3, y0 + 9);
    }
    c.stroke();
    c.globalAlpha = 1;
    const lt = t % 7.3;
    if (lt < 0.35) {
      const a = lt < 0.08 ? 1 : lt < 0.14 ? 0.3 : lt < 0.22 ? 0.85 : (0.35 - lt) * 3;
      c.save();
      c.globalCompositeOperation = 'lighter';
      glow(c, 'storm', 'rgba(180,200,255,A)', 780, 540, 140, a * 0.35);
      c.globalAlpha = 1;
      c.restore();
      c.strokeStyle = '#f5f8ff';
      c.globalAlpha = Math.max(0, Math.min(1, a));
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(792, 530);
      c.lineTo(786, 544);
      c.lineTo(792, 548);
      c.lineTo(784, 562);
      c.stroke();
      c.globalAlpha = 1;
    }
    // 船與鯨魚
    boat(c, 44 + Math.sin(t * 0.25) * 6, 300, t, 0);
    boat(c, 440, 74 + Math.sin(t * 0.2) * 3, t, 1);
    boat(c, 880, 372 + Math.sin(t * 0.3) * 3, t, 2);
    whale(c, 560, 76, t);
    whale(c, 36, 470, t + 4);
    // 岩漿脈動
    const lv = L.lava;
    if (open[3]) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.35 + Math.sin(t * 2.4) * 0.2;
      c.drawImage(lv.cv, lv.x, lv.y, lv.w, lv.h);
      c.globalAlpha = 1;
      c.restore();
      c.save();
      c.lineCap = 'round';
      c.beginPath();
      poly(c, LAVA_S, false);
      c.setLineDash([2, 12]);
      c.lineDashOffset = t * 10;
      c.strokeStyle = 'rgba(255,240,160,0.9)';
      c.lineWidth = 1.6;
      c.stroke();
      c.restore();
    }
    c.save();
    c.lineCap = 'round';
    // 河水流動
    c.setLineDash([1.5, 19]);
    c.lineDashOffset = -t * 12;
    c.strokeStyle = 'rgba(235,250,255,0.75)';
    c.lineWidth = 1.2;
    (open[4] ? RIVERS_S : L.riversLow).forEach((r) => {
      if (r.pts.length < 2) return;
      c.beginPath();
      poly(c, r.pts, false);
      c.stroke();
    });
    c.setLineDash([]);
    c.restore();
    // 火山煙
    if (open[3]) for (let i = 0; i < 7; i++) {
      const ph = (t * 0.12 + i / 7) % 1;
      const r = 5 + ph * 12;
      c.fillStyle = '#3c3234';
      c.globalAlpha = 0.5 * Math.min(1, (1 - ph) * 1.6);
      c.beginPath();
      c.arc(VOLC[0] + Math.sin(ph * 5 + i) * 3 - ph * 26, VOLC[1] - 4 - ph * 58, r, 0, Math.PI * 2);
      c.fill();
    }
    // 溫泉蒸氣
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 1.3;
    if (open[3]) {
      for (let k = 0; k < 2; k++) {
        c.globalAlpha = k ? 0.7 : 0.3;
        c.beginPath();
        [[612, 336, 0], [684, 363, 0.4], [790, 278, 0.8]].forEach(([x, y, o]) => {
          for (let i = 0; i < 3; i++) {
            const ph = (t * 0.5 + o + i / 3) % 1;
            if ((Math.sin(ph * Math.PI) > 0.5) !== !!k) continue;
            const bx = x + (i - 1) * 5;
            const by = y - ph * 14;
            c.moveTo(bx, by);
            c.quadraticCurveTo(bx + 3, by - 3, bx, by - 6);
            c.quadraticCurveTo(bx - 3, by - 9, bx, by - 12);
          }
        });
        c.stroke();
      }
    }
    c.globalAlpha = 1;
    // 燈塔的光
    if (open[2]) {
      c.save();
      c.translate(484, 481);
      c.rotate(t * 0.9);
      c.drawImage(L.beam, 0, -12, 80, 24);
      c.restore();
      c.save();
      c.globalCompositeOperation = 'lighter';
      glow(c, 'lamp', 'rgba(255,240,170,A)', 484, 481, 9, 0.6 + Math.sin(t * 3) * 0.3);
      c.restore();
    }
    c.save();
    c.globalCompositeOperation = 'lighter';
    // 霜鈴神社的鈴聲
    if (open[4]) glow(c, 'lamp', 'rgba(255,240,170,A)', 332, 216, 12, Math.sin(t * 1.3) * 0.6);
    // 森林的螢火蟲
    for (let i = 0; i < 16; i++) {
      const x = 80 + ((i * 97) % 320) + Math.sin(t * 0.7 + i) * 8;
      const y = 350 + ((i * 53) % 180) + Math.cos(t * 0.9 + i * 2) * 6;
      const a = Math.sin(t * 2 + i * 1.3) * 0.7 + 0.2;
      glow(c, i % 3 ? 'ffly' : 'ffly2', i % 3 ? 'rgba(220,255,150,A)' : 'rgba(150,255,220,A)', x, y, 4, a);
    }
    c.globalAlpha = 1;
    c.restore();
    if (open[5]) skyTemple(c, t);
    birds(c, t);
    // 飄過的雲（影子＋雲，預先合成一張）
    [[0, 40, 0.008], [0.55, 150, 0.006]].forEach(([off, y, spd]) => {
      const u = (t * spd + off) % 1;
      const x = -200 + u * (WW + 320);
      c.drawImage(L.drift, Math.round(x), y - 40, DRIFT[0], DRIFT[1]);
    });
  }

  // 船：大小、深色、傾斜
  const BOATS = [[0.7, false, 0.04], [0.7, false, -0.03], [0.75, true, -0.1]];
  // 小獅子快取畫布：寬、高、原點 x、原點 y（邏輯座標）
  const LION_BOX = [120, 110, 60, 96];
  const DRIFT = [180, 110];
  const M = (G.worldMap = {
    hover: null,
    POS,

    info(id) {
      const m = G.data.maps[id];
      const visited = !!G.world.visited[id];
      if (!visited) return { title: '？？？', lines: ['還沒去過的地方'] };
      const lv = (m.mobs || []).map((g) => G.data.monsters[g.m].lv);
      const mobs = [];
      (m.mobs || []).forEach((g) => {
        const n = G.data.monsters[g.m].name;
        if (mobs.indexOf(n) < 0) mobs.push(n);
      });
      const lines = [TYPE[m.type] + (lv.length ? ' · 怪物 Lv' + Math.min(...lv) + '–' + Math.max(...lv) : '')];
      if (mobs.length) lines.push('出沒：' + mobs.join('、'));
      if (m.boss) {
        const b = G.data.monsters[m.boss.m];
        lines.push('Boss：Lv' + b.lv + ' ' + b.name + (G.world.flags[m.boss.m + 'Defeated'] ? '（已打倒，可挑戰回憶）' : ''));
      }
      if ((m.npcs || []).length) lines.push('NPC：' + m.npcs.map((n) => G.data.npcs[n.id].name).join('、'));
      return { title: m.name + (id === G.world.mapId ? '（你在這裡）' : ''), lines };
    },

    // 這一區的雲霧是否已經散開（依玩家實際進度）
    regionOpen,

    draw(ctx, t) {
      if (!L || !L.ready) build();
      ctx.save();
      const ag = ageSig();
      const sig = stateSig() + '|' + ag;
      if (sig !== L.stateSig) {
        L.stateSig = sig;
        buildComposite(ag);
      }
      ctx.drawImage(L.comp, 0, 0, WW, WH);
      const open = [true, true, regionOpen(2), regionOpen(3), regionOpen(4), regionOpen(5)];
      drawAnim(ctx, t, open);
      // 雲霧裡慢慢飄動的一縷霧
      for (const r in FOG) {
        if (open[r]) continue;
        const b = FOG[r][(+r * 3) % FOG[r].length];
        const a = t * 0.15 + +r;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(L.wisp, b[0] + Math.cos(a) * 18 - 45, b[1] + Math.sin(a * 0.8) * 6 - 45, 90, 90);
      }
      ctx.globalAlpha = 1;
      // 節點
      const hid = this.hover;
      for (const id of G.data.mapOrder) {
        const p = POS[id];
        if (!p || id === hid) continue;
        const k = pinKind(id);
        const pin = L.pins[k];
        ctx.globalAlpha = k === 'unk' && !open[G.data.maps[id].region] ? 0.8 : 1;
        ctx.drawImage(pin.cv, p[0] - pin.pad, p[1] - pin.pad, pin.pad * 2, pin.pad * 2);
      }
      ctx.globalAlpha = 1;
      // 營地與 Boss 的名字
      for (const id of G.data.mapOrder) {
        const p = POS[id];
        if (!p || id === hid) continue;
        const k = pinKind(id);
        const m = G.data.maps[id];
        if (k === 'unk' || m.type === 'hunt' || m.type === 'explore') continue;
        const n = nameSprite(id, k);
        ctx.drawImage(n.cv, Math.round((p[0] - n.w / 2) * S) / S, Math.round((p[1] + PIN_R[k] - 1) * S) / S, n.w, 22);
      }
      // 目前位置：金色的擴散光圈
      const cur = POS[G.world.mapId];
      if (cur) {
        for (let i = 0; i < 2; i++) {
          const ph = (t * 0.7 + i * 0.5) % 1;
          ctx.strokeStyle = '#ffe28c';
          ctx.globalAlpha = (1 - ph) * 0.9;
          ctx.lineWidth = 2 * (1 - ph) + 0.5;
          ctx.beginPath();
          ctx.ellipse(cur[0], cur[1], 12 + ph * 16, (12 + ph * 16) * 0.8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // 滑鼠指著的節點：放大＋名字
      if (hid && POS[hid]) {
        const p = POS[hid];
        const k = pinKind(hid);
        const pin = L.pins[k];
        ctx.drawImage(L.halo, p[0] - 24, p[1] - 24, 48, 48);
        const s = pin.pad * 1.2;
        ctx.drawImage(pin.cv, p[0] - s, p[1] - s, s * 2, s * 2);
        nodeName(ctx, hid, p, k);
      }
      // 小獅子在這裡（畫到小畫布上快取，約每 0.12 秒更新一次動作）
      if (cur) {
        const key = G.player.form + '|' + G.story.crownColors().join(',');
        if (!L.lion || L.lion.key !== key || Math.abs(t - L.lion.t) > 0.12) {
          if (!L.lion) {
            const [lcv, lc] = mkS(LION_BOX[0], LION_BOX[1]);
            L.lion = { cv: lcv, c: lc };
          }
          const lc = L.lion.c;
          lc.setTransform(1, 0, 0, 1, 0, 0);
          lc.clearRect(0, 0, L.lion.cv.width, L.lion.cv.height);
          lc.setTransform(S * 0.4, 0, 0, S * 0.4, LION_BOX[2] * S, LION_BOX[3] * S);
          A.drawLion(lc, 0, 0, 1, { state: 'idle', t, p: 0, onGround: true, form: G.player.form, leaves: G.story.crownColors() });
          L.lion.key = key;
          L.lion.t = t;
        }
        const bob = Math.abs(Math.sin(t * 4)) * 5;
        ctx.drawImage(L.lion.cv, cur[0] - LION_BOX[2], cur[1] - 14 - bob - LION_BOX[3], LION_BOX[0], LION_BOX[1]);
      }
      // 邊框只畫四條邊（中間是透明的，不必整張貼）
      const F = L.frame;
      const e = (x, y, w, h) => ctx.drawImage(F, x * S, y * S, w * S, h * S, x, y, w, h);
      e(0, 0, WW, 46);
      e(0, WH - 32, WW, 32);
      e(0, 46, 32, WH - 78);
      e(WW - 32, 46, 32, WH - 78);
      ctx.restore();
    },

    nodeAt(x, y) {
      let best = null;
      let bd = 22;
      for (const id in POS) {
        const d = Math.hypot(POS[id][0] - x, POS[id][1] - y);
        if (d < bd) {
          bd = d;
          best = id;
        }
      }
      return best;
    },

    // 測試用：丟掉預先畫好的圖層，下次畫的時候重建
    _rebuild() {
      L = null;
      job = null;
    },
    _times() {
      return L && L.times;
    },
  });

  // 視窗打開時啟動畫布動畫與滑鼠提示
  const obs = new MutationObserver(() => {
    document.querySelectorAll('canvas.worldmap-canvas:not([data-done])').forEach((c) => {
      c.setAttribute('data-done', '1');
      // 高解析螢幕：畫布實際像素加倍（CSS 顯示大小不變）
      if (S !== 1) {
        c.width = WW * S;
        c.height = WH * S;
      }
      const ctx = c.getContext('2d');
      const info = c.parentNode.querySelector('.wm-info');
      const showInfo = (id) => {
        if (!info) return;
        const d = M.info(id || G.world.mapId);
        info.innerHTML = '<b>' + d.title + '</b>' + d.lines.map((l) => '<div>' + l + '</div>').join('');
      };
      showInfo(null);
      const pick = (e) => {
        const r = c.getBoundingClientRect();
        const id = M.nodeAt(((e.clientX - r.left) / r.width) * WW, ((e.clientY - r.top) / r.height) * WH);
        if (id !== M.hover) {
          M.hover = id;
          showInfo(id);
        }
      };
      c.addEventListener('mousemove', pick);
      // 觸控：點一下節點也能看資訊
      c.addEventListener('click', pick);
      c.addEventListener('mouseleave', () => {
        M.hover = null;
        showInfo(null);
      });
      let t = 0;
      const tick = () => {
        if (!c.isConnected) return;
        t += 1 / 60;
        ctx.setTransform(c.width / WW, 0, 0, c.height / WH, 0, 0);
        M.draw(ctx, t);
        requestAnimationFrame(tick);
      };
      tick();
    });
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // 遊戲載入後，趁瀏覽器閒置時一小段一小段地先把世界地圖建好，打開時就不用等
  // （忙碌的機器上拿不到閒置時間時，每 0.3 秒至少做 6ms）
  const idle = window.requestIdleCallback ? (f) => window.requestIdleCallback(f, { timeout: 300 }) : (f) => setTimeout(() => f({ timeRemaining: () => 6 }), 60);
  const prebuild = (dl) => {
    if (L && L.ready) return;
    const t0 = performance.now();
    const budget = Math.min(12, Math.max(6, dl.timeRemaining()));
    if (!stepBuild(() => performance.now() - t0 > budget)) idle(prebuild);
  };
  setTimeout(() => idle(prebuild), 3000);

  M.W = WW;
  M.H = WH;
})();
