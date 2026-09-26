// 世界地圖：像楓之谷的維多利亞島一樣，所有章節的地圖都畫在同一塊「星楓大陸」上。
// 還沒去過的地圖顯示 ？？？，還沒開放的區域蓋著雲霧。滑鼠移到節點上可以看地圖資訊。
// 畫法：海、陸地、邊框三層靜態圖只在第一次畫的時候預先畫到離屏畫布上，
// 每一格只畫會動的小東西（浪花、船、煙、燈塔光、雲、鳥、浮空島……）。
(function () {
  'use strict';
  const A = G.art;
  const WW = 960;
  const WH = 560;
  const OUT = '#4a2e1f';

  // 每張地圖在大陸上的位置
  const POS = {
    '1-1': [130, 468], '1-2': [196, 426], '1-3': [258, 462], '1-4': [318, 414], '1-B': [372, 376],
    '2-1': [446, 470], '2-2': [520, 500], '2-3': [592, 474], '2-4': [652, 440], '2-B': [708, 400],
    '3-1': [650, 336], '3-2': [706, 290], '3-3': [764, 250], '3-4': [724, 204], '3-B': [786, 160],
    '4-1': [476, 252], '4-2': [416, 226], '4-3': [356, 250], '4-4': [298, 214], '4-B': [240, 176],
    '5-1': [764, 70], '5-2': [806, 50], '5-3': [848, 78], '5-4': [890, 54], '5-B': [918, 98],
  };
  // 還沒做好的區域（rx / ry：雲霧範圍）
  const FUTURE = [
    { region: 4, x: 330, y: 196, rx: 170, ry: 78, a: 0.82, name: '霜鈴雪峰' },
    { region: 5, x: 846, y: 70, rx: 96, ry: 46, a: 0.6, name: '時空間神殿' },
  ];
  const REGION_LABEL = { 1: [206, 538], 2: [688, 544], 3: [872, 318], 4: [330, 240], 5: [700, 42] };
  const TYPE = { camp: '營地', hunt: '狩獵場', explore: '探索', boss: 'Boss' };

  // ── 形狀資料 ──
  // 大陸海岸線（順時針），之後用 Chaikin 圓滑化
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
    [[520, 34], [546, 24], [572, 34], [560, 50], [530, 50]],
  ];
  // 河流：從雪峰流下，經過森林流進海裡
  const RIVERS = [
    { pts: [[404, 232], [428, 286], [450, 336], [432, 396], [414, 446], [410, 500], [404, 552]], w: 7 },
    { pts: [[236, 238], [204, 270], [160, 300], [112, 328], [58, 352]], w: 6 },
    { pts: [[534, 300], [498, 316], [462, 330]], w: 4 },
  ];
  const LAVA = [[856, 148], [834, 180], [800, 204], [762, 214], [728, 224], [694, 226], [666, 238]];
  // 區域地面
  const FOREST_PTS = [[56, 390], [110, 340], [190, 322], [262, 300], [336, 306], [398, 328], [424, 380], [416, 452], [400, 540], [300, 570], [150, 570], [50, 540]];
  const SNOW_PTS = [[160, 262], [178, 176], [244, 124], [350, 92], [452, 104], [510, 150], [500, 226], [440, 266], [334, 278], [230, 280]];
  const CANYON_PTS = [[596, 318], [598, 236], [630, 160], [700, 98], [820, 96], [940, 150], [950, 290], [880, 350], [800, 372], [720, 378], [640, 366]];
  const BEACH_POLY = [[420, 430], [640, 420], [780, 370], [900, 380], [900, 560], [420, 560]];

  // ── 小工具 ──
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const rr = (a, b) => a + rnd() * (b - a);
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
  // 填色 → 月牙陰影 → 高光 → 描邊（不受 A.shape 座標範圍限制）
  const paint = (c, path, fill, o) => {
    o = o || {};
    c.beginPath();
    path(c);
    c.fillStyle = fill;
    c.fill();
    if (o.shade) {
      const cel = o.cel || [2, 2];
      c.save();
      c.clip();
      c.fillStyle = o.shade;
      c.fillRect(-3000, -3000, 6000, 6000);
      c.translate(-cel[0], -cel[1]);
      c.beginPath();
      path(c);
      c.fillStyle = fill;
      c.fill();
      c.restore();
    }
    if (o.hl) {
      c.save();
      c.globalAlpha *= 0.5;
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(o.hl[0], o.hl[1], o.hl[2], o.hl[3], -0.5, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    if (o.lw === 0) return;
    c.beginPath();
    path(c);
    c.lineWidth = o.lw || 2;
    c.strokeStyle = o.stroke || OUT;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();
  };
  const oval = (c, x, y, rx, ry, fill, o) => paint(c, (p) => p.ellipse(x, y, rx, ry, (o && o.rot) || 0, 0, Math.PI * 2), fill, o);
  const mk = (w, h) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    return cv;
  };
  const distSeg = (px, py, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l));
    return Math.hypot(px - a[0] - u * dx, py - a[1] - u * dy);
  };
  const distLine = (x, y, pts) => {
    let d = 1e9;
    for (let i = 1; i < pts.length; i++) d = Math.min(d, distSeg(x, y, pts[i - 1], pts[i]));
    return d;
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

  // 圓滑後的形狀
  const LAND = chaikin(LAND_PTS, true, 3);
  const ISLES_S = ISLES.map((p) => chaikin(p, true, 3));
  const RIVERS_S = RIVERS.map((r) => ({ pts: chaikin(r.pts, false, 3), w: r.w }));
  const LAVA_S = chaikin(LAVA, false, 3);
  const landPath = (c, dx, dy) => poly(c, LAND, true, dx, dy);

  // 路線線段（用來讓樹木避開、找橋的位置）
  const routeSegs = () => {
    const o = (G.data && G.data.mapOrder) || Object.keys(POS);
    const segs = [];
    for (let i = 1; i < o.length; i++) if (POS[o[i - 1]] && POS[o[i]]) segs.push([POS[o[i - 1]], POS[o[i]]]);
    return segs;
  };

  // ── 裝飾小物 ──
  const D = {
    roundTree(c, x, y, s, col, sh) {
      paint(c, (p) => p.rect(x - s * 0.14, y - s * 0.5, s * 0.28, s * 0.55), '#8a5a34', { lw: 1.5 });
      oval(c, x, y - s * 0.95, s, s * 0.85, col, { shade: sh, cel: [s * 0.3, s * 0.3], lw: 1.8, hl: [x - s * 0.35, y - s * 1.3, s * 0.28, s * 0.16] });
    },
    pine(c, x, y, s, col, sh, snow) {
      paint(c, (p) => p.rect(x - s * 0.12, y - s * 0.3, s * 0.24, s * 0.35), '#7a4a2a', { lw: 1.4 });
      const tier = (by, w, h) => paint(c, (p) => {
        p.moveTo(x, by - h);
        p.lineTo(x + w, by);
        p.quadraticCurveTo(x, by + h * 0.18, x - w, by);
        p.closePath();
      }, col, { shade: sh, cel: [w * 0.35, 0], lw: 1.6 });
      tier(y - s * 0.2, s * 0.8, s * 1.1);
      tier(y - s * 0.85, s * 0.6, s * 0.95);
      if (snow) {
        paint(c, (p) => {
          p.moveTo(x, y - s * 1.8);
          p.lineTo(x + s * 0.3, y - s * 1.3);
          p.lineTo(x + s * 0.1, y - s * 1.36);
          p.lineTo(x - s * 0.05, y - s * 1.26);
          p.lineTo(x - s * 0.3, y - s * 1.32);
          p.closePath();
        }, '#ffffff', { lw: 1.2 });
      }
    },
    mushroom(c, x, y, s, cap) {
      paint(c, (p) => p.rect(x - s * 0.25, y - s * 0.7, s * 0.5, s * 0.72), '#fff3dc', { lw: 1.3 });
      paint(c, (p) => {
        p.moveTo(x - s, y - s * 0.6);
        p.quadraticCurveTo(x - s, y - s * 1.6, x, y - s * 1.6);
        p.quadraticCurveTo(x + s, y - s * 1.6, x + s, y - s * 0.6);
        p.closePath();
      }, cap, { shade: '#b8382e', cel: [s * 0.3, 0], lw: 1.5 });
      c.fillStyle = '#ffffff';
      [[-0.45, -1.05, 0.18], [0.3, -1.25, 0.14], [0.55, -0.85, 0.12]].forEach(([a, b, r]) => {
        c.beginPath();
        c.arc(x + a * s, y + b * s, r * s, 0, Math.PI * 2);
        c.fill();
      });
    },
    palm(c, x, y, s) {
      c.strokeStyle = OUT;
      c.lineWidth = s * 0.34;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + s * 0.2, y - s, x + s * 0.5, y - s * 1.7);
      c.stroke();
      c.strokeStyle = '#b07a44';
      c.lineWidth = s * 0.2;
      c.stroke();
      const tx = x + s * 0.5;
      const ty = y - s * 1.7;
      [[-1.3, -0.1], [-0.7, -0.9], [0.4, -0.95], [1.3, 0.05], [0.1, 0.4]].forEach(([a, b]) => {
        paint(c, (p) => {
          p.moveTo(tx, ty);
          p.quadraticCurveTo(tx + a * s * 0.5, ty + b * s * 0.8 - s * 0.3, tx + a * s, ty + b * s * 0.5 + s * 0.35);
          p.quadraticCurveTo(tx + a * s * 0.5, ty + b * s * 0.4, tx, ty);
        }, '#5fae4a', { lw: 1.2 });
      });
    },
    rock(c, x, y, s, col) {
      paint(c, (p) => {
        p.moveTo(x - s, y);
        p.lineTo(x - s * 0.7, y - s * 0.7);
        p.lineTo(x - s * 0.1, y - s);
        p.lineTo(x + s * 0.6, y - s * 0.65);
        p.lineTo(x + s, y);
        p.closePath();
      }, col || '#9a8a7a', { shade: '#766858', cel: [s * 0.4, 0], lw: 1.5 });
    },
    // 台地：y 是頂面中心，h 是側面高度
    mesa(c, x, y, w, h) {
      const ry = w * 0.3;
      const side = (p) => {
        p.moveTo(x - w, y);
        p.lineTo(x - w * 0.9, y + h);
        p.quadraticCurveTo(x, y + h + ry * 1.3, x + w * 0.9, y + h);
        p.lineTo(x + w, y);
        p.closePath();
      };
      paint(c, side, '#c9643c', { shade: '#a44a2c', cel: [w * 0.4, 0], lw: 2 });
      c.save();
      c.beginPath();
      side(c);
      c.clip();
      c.strokeStyle = 'rgba(120,40,20,0.45)';
      c.lineWidth = 1.5;
      for (let k = 1; k < 4; k++) {
        const yy = y + (h * k) / 4;
        c.beginPath();
        c.moveTo(x - w, yy);
        c.quadraticCurveTo(x, yy + ry * 1.1, x + w, yy);
        c.stroke();
      }
      c.strokeStyle = 'rgba(255,200,160,0.35)';
      c.beginPath();
      c.moveTo(x - w * 0.6, y + 2);
      c.lineTo(x - w * 0.62, y + h);
      c.stroke();
      c.restore();
      oval(c, x, y, w, ry, '#eca776', { lw: 2, hl: [x - w * 0.35, y - ry * 0.2, w * 0.3, ry * 0.25] });
      c.fillStyle = 'rgba(200,120,70,0.5)';
      c.beginPath();
      c.ellipse(x + w * 0.2, y + ry * 0.1, w * 0.3, ry * 0.3, 0, 0, Math.PI * 2);
      c.fill();
    },
    // 石柱（奇岩）
    spire(c, x, y, h) {
      paint(c, (p) => {
        p.moveTo(x - 6, y);
        p.lineTo(x - 4, y - h * 0.6);
        p.lineTo(x - 6, y - h * 0.8);
        p.lineTo(x - 2, y - h);
        p.lineTo(x + 4, y - h * 0.95);
        p.lineTo(x + 5, y - h * 0.55);
        p.lineTo(x + 7, y);
        p.closePath();
      }, '#d0784a', { shade: '#a8522e', cel: [4, 0], lw: 1.8 });
      oval(c, x, y, 9, 2.5, 'rgba(120,50,30,0.25)', { lw: 0 });
    },
    peak(c, x, y, w, h) {
      const base = y;
      paint(c, (p) => {
        p.moveTo(x - w, base);
        p.lineTo(x - w * 0.2, base - h * 0.92);
        p.lineTo(x, base - h);
        p.lineTo(x + w * 0.25, base - h * 0.9);
        p.lineTo(x + w, base);
        p.closePath();
      }, '#a8b8cc', { shade: '#8294ae', cel: [w * 0.55, 0], lw: 2 });
      paint(c, (p) => {
        p.moveTo(x - w * 0.46, base - h * 0.5);
        p.lineTo(x - w * 0.2, base - h * 0.92);
        p.lineTo(x, base - h);
        p.lineTo(x + w * 0.25, base - h * 0.9);
        p.lineTo(x + w * 0.5, base - h * 0.48);
        p.lineTo(x + w * 0.28, base - h * 0.56);
        p.lineTo(x + w * 0.1, base - h * 0.44);
        p.lineTo(x - w * 0.12, base - h * 0.58);
        p.lineTo(x - w * 0.3, base - h * 0.46);
        p.closePath();
      }, '#ffffff', { shade: '#dce6f2', cel: [w * 0.2, 0], lw: 1.6 });
    },
    // 霜鈴神社：小鳥居與掛鐘的亭子
    shrine(c, x, y) {
      paint(c, (p) => p.rect(x - 14, y - 16, 28, 16), '#f4ece0', { lw: 1.6 });
      paint(c, (p) => {
        p.moveTo(x - 20, y - 14);
        p.quadraticCurveTo(x, y - 30, x + 20, y - 14);
        p.closePath();
      }, '#6a88b8', { shade: '#4e6c9c', cel: [6, 0], lw: 1.6 });
      oval(c, x, y - 7, 5, 6, '#ffd35a', { lw: 1.3 });
      c.strokeStyle = OUT;
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(x - 30, y + 2);
      c.lineTo(x - 30, y - 16);
      c.moveTo(x - 22, y + 2);
      c.lineTo(x - 22, y - 16);
      c.stroke();
      c.strokeStyle = '#e0503a';
      c.lineWidth = 3.5;
      c.beginPath();
      c.moveTo(x - 34, y - 17);
      c.lineTo(x - 18, y - 17);
      c.stroke();
    },
    lighthouse(c, x, y) {
      oval(c, x, y, 14, 5, '#8a7a6a', { lw: 1.6 });
      const body = (p) => {
        p.moveTo(x - 8, y);
        p.lineTo(x - 5, y - 34);
        p.lineTo(x + 5, y - 34);
        p.lineTo(x + 8, y);
        p.closePath();
      };
      paint(c, body, '#ffffff', { shade: '#dcd6ce', cel: [3, 0], lw: 2 });
      c.save();
      c.beginPath();
      body(c);
      c.clip();
      c.fillStyle = '#e84a3a';
      c.fillRect(x - 10, y - 12, 20, 6);
      c.fillRect(x - 10, y - 26, 20, 6);
      c.restore();
      paint(c, body, 'rgba(0,0,0,0)', { lw: 2 });
      paint(c, (p) => p.rect(x - 5, y - 42, 10, 8), '#ffe890', { lw: 1.6 });
      paint(c, (p) => {
        p.moveTo(x - 7, y - 42);
        p.lineTo(x, y - 49);
        p.lineTo(x + 7, y - 42);
        p.closePath();
      }, '#e84a3a', { lw: 1.6 });
    },
    // 女王菇的殿堂
    queenHall(c, x, y) {
      paint(c, (p) => {
        p.moveTo(x - 14, y);
        p.lineTo(x - 12, y - 20);
        p.lineTo(x + 12, y - 20);
        p.lineTo(x + 14, y);
        p.closePath();
      }, '#fff0d8', { shade: '#e8d0b0', cel: [5, 0], lw: 1.8 });
      paint(c, (p) => {
        p.moveTo(x - 4, y);
        p.lineTo(x - 4, y - 7);
        p.arc(x, y - 7, 4, Math.PI, 0);
        p.lineTo(x + 4, y);
      }, '#8a4a7a', { lw: 1.4 });
      paint(c, (p) => {
        p.moveTo(x - 30, y - 16);
        p.quadraticCurveTo(x - 30, y - 46, x, y - 46);
        p.quadraticCurveTo(x + 30, y - 46, x + 30, y - 16);
        p.quadraticCurveTo(x, y - 22, x - 30, y - 16);
        p.closePath();
      }, '#d8589a', { shade: '#b03e7c', cel: [8, 0], lw: 2, hl: [x - 12, y - 38, 7, 3.5] });
      c.fillStyle = '#ffe0f0';
      [[-16, -26, 3.5], [4, -36, 4], [18, -24, 3]].forEach(([a, b, r]) => {
        c.beginPath();
        c.arc(x + a, y + b, r, 0, Math.PI * 2);
        c.fill();
      });
      // 皇冠尖塔
      paint(c, (p) => {
        p.moveTo(x - 7, y - 45);
        p.lineTo(x - 8, y - 55);
        p.lineTo(x - 3, y - 50);
        p.lineTo(x, y - 58);
        p.lineTo(x + 3, y - 50);
        p.lineTo(x + 8, y - 55);
        p.lineTo(x + 7, y - 45);
        p.closePath();
      }, '#ffd35a', { lw: 1.4 });
      // 兩側小蘑菇
      D.mushroom(c, x - 32, y + 2, 7, '#e07ab0');
      D.mushroom(c, x + 33, y + 3, 6, '#e07ab0');
    },
    // 古樹
    bigTree(c, x, y) {
      paint(c, (p) => {
        p.moveTo(x - 26, y + 4);
        p.quadraticCurveTo(x - 12, y - 4, x - 10, y - 34);
        p.lineTo(x + 10, y - 34);
        p.quadraticCurveTo(x + 12, y - 4, x + 28, y + 4);
        p.quadraticCurveTo(x + 10, y, x + 4, y + 6);
        p.quadraticCurveTo(x, y, x - 6, y + 6);
        p.quadraticCurveTo(x - 10, y, x - 26, y + 4);
        p.closePath();
      }, '#9a6438', { shade: '#7a4a28', cel: [6, 0], lw: 2 });
      paint(c, (p) => p.ellipse(x - 1, y - 8, 5, 8, 0, 0, Math.PI * 2), '#3a2418', { lw: 1.5 });
      const cols = [['#4e9444', '#3d7a36'], ['#5aa34e', '#468a3e']];
      [[-30, -52, 26, 22], [28, -54, 26, 22], [0, -76, 32, 26], [-18, -44, 22, 16], [18, -44, 22, 16]].forEach(([a, b, rx, ry], i) => {
        const k = cols[i % 2];
        oval(c, x + a, y + b, rx, ry, k[0], { shade: k[1], cel: [rx * 0.3, ry * 0.3], lw: 2 });
      });
      oval(c, x - 10, y - 86, 10, 6, 'rgba(255,255,255,0.35)', { lw: 0 });
      // 苔光
      c.fillStyle = '#e8ff9a';
      [[-24, -50], [14, -70], [30, -46], [-6, -60], [-34, -58]].forEach(([a, b]) => {
        c.beginPath();
        c.arc(x + a, y + b, 1.8, 0, Math.PI * 2);
        c.fill();
      });
    },
    volcano(c, x, y) {
      const body = (p) => {
        p.moveTo(x - 70, y);
        p.quadraticCurveTo(x - 40, y - 30, x - 16, y - 76);
        p.lineTo(x + 14, y - 76);
        p.quadraticCurveTo(x + 40, y - 30, x + 72, y);
        p.quadraticCurveTo(x, y + 12, x - 70, y);
        p.closePath();
      };
      paint(c, body, '#8a5a4a', { shade: '#63403a', cel: [22, 0], lw: 2.5 });
      c.save();
      c.beginPath();
      body(c);
      c.clip();
      c.strokeStyle = 'rgba(60,30,20,0.35)';
      c.lineWidth = 2;
      [-30, -6, 22, 46].forEach((a) => {
        c.beginPath();
        c.moveTo(x + a * 0.3, y - 70);
        c.quadraticCurveTo(x + a * 0.8, y - 34, x + a * 1.3, y);
        c.stroke();
      });
      // 岩漿流下山坡
      c.strokeStyle = '#ff7a2a';
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - 4, y - 74);
      c.quadraticCurveTo(x - 10, y - 50, x - 22, y - 42);
      c.moveTo(x + 6, y - 74);
      c.quadraticCurveTo(x + 14, y - 40, x + 30, y - 18);
      c.stroke();
      c.strokeStyle = '#ffd24a';
      c.lineWidth = 2;
      c.stroke();
      c.restore();
      paint(c, body, 'rgba(0,0,0,0)', { lw: 2.5 });
      oval(c, x - 1, y - 76, 16, 5, '#ff8a3a', { lw: 2 });
      oval(c, x - 1, y - 76.5, 9, 2.5, '#ffe07a', { lw: 0 });
    },
    hotspring(c, x, y, rx) {
      [[-1, 0], [-0.6, -0.55], [0, -0.7], [0.6, -0.55], [1, 0], [0.6, 0.6], [0, 0.72], [-0.6, 0.6]].forEach(([a, b]) => oval(c, x + a * rx, y + b * rx * 0.55, 4, 3, '#a89888', { lw: 1.2 }));
      oval(c, x, y, rx, rx * 0.5, '#7fe0d8', { shade: '#5cc4c4', cel: [0, -3], lw: 1.8, hl: [x - rx * 0.3, y - rx * 0.15, rx * 0.3, rx * 0.1] });
    },
    shipwreck(c, x, y) {
      paint(c, (p) => {
        p.moveTo(x - 20, y - 6);
        p.lineTo(x + 18, y - 12);
        p.lineTo(x + 12, y + 2);
        p.quadraticCurveTo(x - 6, y + 6, x - 16, y + 2);
        p.closePath();
      }, '#8a5a34', { shade: '#6a4228', cel: [0, -3], lw: 1.8 });
      c.strokeStyle = OUT;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x - 2, y - 8);
      c.lineTo(x + 8, y - 30);
      c.moveTo(x + 3, y - 20);
      c.lineTo(x + 14, y - 16);
      c.stroke();
      paint(c, (p) => {
        p.moveTo(x + 7, y - 28);
        p.lineTo(x + 18, y - 22);
        p.lineTo(x + 10, y - 18);
        p.closePath();
      }, '#e8dcc0', { lw: 1.3 });
      c.fillStyle = '#3a2418';
      [[-10, -3], [0, -5]].forEach(([a, b]) => {
        c.beginPath();
        c.arc(x + a, y + b, 1.8, 0, Math.PI * 2);
        c.fill();
      });
    },
    // 寄居蟹的大貝殼
    shell(c, x, y) {
      paint(c, (p) => {
        p.moveTo(x - 16, y);
        p.quadraticCurveTo(x - 16, y - 20, x, y - 24);
        p.quadraticCurveTo(x + 18, y - 18, x + 16, y);
        p.quadraticCurveTo(x, y + 5, x - 16, y);
        p.closePath();
      }, '#ffb8a8', { shade: '#e8847a', cel: [5, 0], lw: 1.8 });
      c.strokeStyle = 'rgba(160,70,60,0.8)';
      c.lineWidth = 1.5;
      c.beginPath();
      for (let a = 0; a < 9; a += 0.2) {
        const r = 2 + a * 1.3;
        const px = x + Math.cos(a) * r * 0.9;
        const py = y - 11 + Math.sin(a) * r * 0.7;
        a ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
      paint(c, (p) => {
        p.moveTo(x + 14, y - 2);
        p.lineTo(x + 24, y - 8);
        p.lineTo(x + 20, y + 2);
        p.closePath();
      }, '#e8584a', { lw: 1.3 });
    },
    dock(c, x, y) {
      paint(c, (p) => p.rect(x - 3, y, 28, 7), '#b07a44', { shade: '#8a5a34', cel: [0, 2], lw: 1.6 });
      c.fillStyle = OUT;
      [0, 9, 18].forEach((a) => c.fillRect(x + a, y + 7, 2.5, 6));
      c.strokeStyle = 'rgba(80,50,30,0.6)';
      c.lineWidth = 1;
      for (let a = 4; a < 25; a += 5) {
        c.beginPath();
        c.moveTo(x + a, y + 1);
        c.lineTo(x + a, y + 6);
        c.stroke();
      }
    },
    field(c, x, y, w, h, col, rot) {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      paint(c, (p) => p.rect(-w / 2, -h / 2, w, h), col, { lw: 1.4, stroke: 'rgba(74,46,31,0.6)' });
      c.strokeStyle = 'rgba(80,60,20,0.3)';
      c.lineWidth = 1;
      for (let k = -w / 2 + 4; k < w / 2; k += 4) {
        c.beginPath();
        c.moveTo(k, -h / 2 + 1);
        c.lineTo(k, h / 2 - 1);
        c.stroke();
      }
      c.restore();
    },
    hut(c, x, y, roof) {
      paint(c, (p) => p.rect(x - 7, y - 9, 14, 9), '#fff0d0', { lw: 1.4 });
      paint(c, (p) => {
        p.moveTo(x - 10, y - 8);
        p.lineTo(x, y - 17);
        p.lineTo(x + 10, y - 8);
        p.closePath();
      }, roof, { lw: 1.4 });
      c.fillStyle = '#6a4228';
      c.fillRect(x - 2, y - 5, 4, 5);
    },
    bridge(c, x, y, ang) {
      c.save();
      c.translate(x, y);
      c.rotate(ang);
      paint(c, (p) => p.rect(-12, -8, 24, 16), '#c8925a', { shade: '#a0703e', cel: [0, 3], lw: 1.8 });
      c.strokeStyle = 'rgba(80,50,30,0.55)';
      c.lineWidth = 1;
      for (let k = -8; k < 12; k += 4) {
        c.beginPath();
        c.moveTo(k, -7);
        c.lineTo(k, 7);
        c.stroke();
      }
      c.restore();
    },
  };

  // ── 預先畫好的靜態圖層 ──
  let L = null;

  // 羅盤
  function compass(c, x, y, r) {
    c.save();
    c.translate(x, y);
    oval(c, 0, 0, r, r, 'rgba(255,246,220,0.85)', { lw: 2 });
    c.strokeStyle = 'rgba(74,46,31,0.6)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(0, 0, r - 5, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      c.beginPath();
      c.moveTo(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5));
      c.lineTo(Math.cos(a) * (r - (i % 2 ? 8 : 11)), Math.sin(a) * (r - (i % 2 ? 8 : 11)));
      c.stroke();
    }
    const star = (len, wid, rot, c1, c2) => {
      for (let i = 0; i < 4; i++) {
        const a = rot + (i * Math.PI) / 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const px = -sa;
        const py = ca;
        paint(c, (p) => {
          p.moveTo(0, 0);
          p.lineTo(ca * len, sa * len);
          p.lineTo(px * wid, py * wid);
          p.closePath();
        }, i === 0 && c1 === '#ffe9b0' ? '#ff7a5a' : c1, { lw: 1.2 });
        paint(c, (p) => {
          p.moveTo(0, 0);
          p.lineTo(ca * len, sa * len);
          p.lineTo(-px * wid, -py * wid);
          p.closePath();
        }, i === 0 && c1 === '#ffe9b0' ? '#d8483a' : c2, { lw: 1.2 });
      }
    };
    star(r * 0.62, r * 0.14, Math.PI / 4, '#c8a878', '#8a6a48');
    star(r * 0.92, r * 0.2, -Math.PI / 2, '#ffe9b0', '#d8a050');
    oval(c, 0, 0, 4, 4, '#ffd35a', { lw: 1.3 });
    c.restore();
    G.hud.text(c, 'N', x, y - r - 9, 13, '#ffe9b0', 'center');
  }

  function buildSea() {
    const cv = mk(WW, WH);
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, WH);
    g.addColorStop(0, '#7fc6e6');
    g.addColorStop(1, '#4b98cc');
    c.fillStyle = g;
    c.fillRect(0, 0, WW, WH);
    // 靠近陸地比較淺，四角比較深
    const rg = c.createRadialGradient(480, 320, 120, 480, 300, 620);
    rg.addColorStop(0, 'rgba(160,230,240,0.25)');
    rg.addColorStop(1, 'rgba(20,60,120,0.3)');
    c.fillStyle = rg;
    c.fillRect(0, 0, WW, WH);
    // 經緯線
    c.strokeStyle = 'rgba(255,255,255,0.13)';
    c.lineWidth = 1;
    c.setLineDash([4, 6]);
    for (let x = 80; x < WW; x += 100) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, WH);
      c.stroke();
    }
    for (let y = 60; y < WH; y += 100) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(WW, y);
      c.stroke();
    }
    c.setLineDash([]);
    // 等深線與淺灘
    const allShapes = [(p) => landPath(p, 0, 5)].concat(ISLES_S.map((s) => (p) => poly(p, s, true, 0, 3)));
    const ring = (lw, col) => allShapes.forEach((sh) => {
      c.beginPath();
      sh(c);
      c.lineJoin = 'round';
      c.lineWidth = lw;
      c.strokeStyle = col;
      c.stroke();
    });
    ring(78, 'rgba(255,255,255,0.28)');
    ring(74, g);
    ring(74, rg);
    ring(56, 'rgba(150,215,235,0.35)');
    ring(52, 'rgba(255,255,255,0.22)');
    ring(48, '#86cde6');
    ring(30, '#9fdcec');
    ring(20, '#b8e8ef');
    // 靜態的海浪紋
    c.strokeStyle = 'rgba(255,255,255,0.4)';
    c.lineWidth = 1.6;
    c.lineCap = 'round';
    const inLand = (x, y, m) => {
      const pts = [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]];
      return pts.some(([a, b]) => {
        c.beginPath();
        landPath(c, 0, 5);
        if (c.isPointInPath(x + a, y + b)) return true;
        return ISLES_S.some((s) => {
          c.beginPath();
          poly(c, s, true);
          return c.isPointInPath(x + a, y + b);
        });
      });
    };
    L.waves = [];
    seed = 99;
    for (let i = 0; i < 400 && L.waves.length < 46; i++) {
      const x = rr(20, WW - 20);
      const y = rr(20, WH - 18);
      if (inLand(x, y, 30)) continue;
      if (Math.hypot(x - 902, y - 498) < 50) continue;
      if (L.waves.some((w) => Math.hypot(w[0] - x, w[1] - y) < 44)) continue;
      L.waves.push([x, y, rnd()]);
    }
    L.waves.slice(0, 22).forEach(([x, y]) => {
      c.beginPath();
      c.arc(x - 6, y, 6, Math.PI * 1.1, Math.PI * 1.9);
      c.arc(x + 6, y, 6, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    });
    L.waves = L.waves.slice(22);
    // 小島
    ISLES_S.forEach((s, i) => {
      paint(c, (p) => poly(p, s, true, 0, 5), '#b98a5c', { lw: 2 });
      paint(c, (p) => poly(p, s, true), i === 2 ? '#f3e2a8' : '#c4dc92', { shade: i === 2 ? '#e2cc8a' : '#aac87a', cel: [3, 3], lw: 2 });
    });
    D.palm(c, 38, 234, 9);
    D.rock(c, 548, 40, 6);
    D.palm(c, 880, 414, 7);
    // 礁石
    [[786, 528, 6], [806, 522, 4], [826, 516, 7], [850, 500, 5], [858, 518, 4], [38, 520, 6], [52, 530, 4], [566, 530, 4]].forEach(([x, y, s]) => {
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.beginPath();
      c.ellipse(x, y + 1, s * 1.5, s * 0.5, 0, 0, Math.PI * 2);
      c.fill();
      D.rock(c, x, y, s, '#8a8a92');
    });
    // 珊瑚
    [[796, 532], [840, 520], [578, 536]].forEach(([x, y], i) => {
      c.strokeStyle = i % 2 ? '#ff8aa8' : '#ffa870';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(x, y + 4);
      c.lineTo(x, y - 3);
      c.moveTo(x, y);
      c.lineTo(x - 3, y - 4);
      c.moveTo(x, y + 1);
      c.lineTo(x + 3, y - 3);
      c.stroke();
    });
    // 沉船灣
    compass(c, 902, 498, 36);
    // 紙質雜點
    seed = 5;
    for (let i = 0; i < 1600; i++) {
      c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(30,60,90,0.06)';
      c.fillRect(rr(0, WW), rr(0, WH), 2, 2);
    }
    return cv;
  }

  function buildLand() {
    const cv = mk(WW, WH);
    const c = cv.getContext('2d');
    const beachClip = () => {
      c.beginPath();
      poly(c, BEACH_POLY, true);
      c.clip();
    };
    // 懸崖厚度
    paint(c, (p) => landPath(p, 0, 10), '#b98a5c', { lw: 3 });
    c.save();
    c.beginPath();
    landPath(c, 0, 10);
    c.clip();
    c.strokeStyle = 'rgba(90,55,30,0.35)';
    c.lineWidth = 1.5;
    for (let i = 0; i < LAND.length; i += 6) {
      const [x, y] = LAND[i];
      c.beginPath();
      c.moveTo(x, y + 2);
      c.lineTo(x + 1, y + 10);
      c.stroke();
    }
    c.restore();
    // 沙灘斜坡（蓋住南岸的懸崖）
    c.save();
    beachClip();
    c.beginPath();
    landPath(c, 0, 4);
    c.lineWidth = 16;
    c.lineJoin = 'round';
    c.strokeStyle = '#f0dca0';
    c.stroke();
    c.restore();
    // 陸地頂面
    paint(c, landPath, '#c4dc92', { lw: 0 });
    c.save();
    c.beginPath();
    landPath(c);
    c.clip();
    // 區域地面
    const region = (pts, fill, edge) => {
      const s = chaikin(pts, true, 3);
      paint(c, (p) => poly(p, s, true), fill, { lw: 2.5, stroke: edge });
    };
    region(CANYON_PTS, '#e6ac78', '#c07a4a');
    region([[640, 210], [690, 150], [790, 130], [880, 170], [900, 260], [840, 320], [760, 330], [680, 300]], '#dc9464', 'rgba(170,90,50,0.6)');
    region(SNOW_PTS, '#eaf1f8', '#9fb2c6');
    region(FOREST_PTS, '#7cb85c', '#548c40');
    region([[80, 440], [150, 400], [240, 410], [300, 450], [260, 520], [120, 530]], '#6eaa52', 'rgba(70,120,50,0.5)');
    // 沙灘
    c.save();
    beachClip();
    c.beginPath();
    landPath(c);
    c.lineWidth = 46;
    c.strokeStyle = '#f3e2a8';
    c.stroke();
    c.restore();
    // 地面紋理
    seed = 11;
    const inside = (pts, x, y) => {
      c.beginPath();
      poly(c, chaikin(pts, true, 2), true);
      return c.isPointInPath(x, y);
    };
    for (let i = 0; i < 900; i++) {
      const x = rr(40, 940);
      const y = rr(90, 555);
      c.beginPath();
      landPath(c);
      if (!c.isPointInPath(x, y)) continue;
      if (inside(SNOW_PTS, x, y)) {
        c.fillStyle = 'rgba(150,175,205,0.45)';
        c.beginPath();
        c.arc(x, y, 1.3, 0, Math.PI * 2);
        c.fill();
      } else if (inside(CANYON_PTS, x, y)) {
        c.strokeStyle = 'rgba(150,70,40,0.35)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(x - 5, y);
        c.lineTo(x - 1, y + 1.5);
        c.lineTo(x + 5, y - 0.5);
        c.stroke();
      } else if (inside(BEACH_POLY, x, y) && distLine(x, y, LAND) < 26) {
        c.fillStyle = 'rgba(190,150,80,0.5)';
        c.fillRect(x, y, 1.6, 1.6);
      } else {
        c.strokeStyle = inside(FOREST_PTS, x, y) ? 'rgba(40,90,30,0.4)' : 'rgba(90,140,50,0.45)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(x - 3, y - 3);
        c.lineTo(x - 1, y);
        c.lineTo(x + 1, y - 4);
        c.lineTo(x + 2, y);
        c.lineTo(x + 4, y - 3);
        c.stroke();
      }
    }
    // 中央草原：起伏的小丘與農田
    [[520, 200, 34, 16], [590, 228, 26, 13], [470, 236, 24, 11], [556, 168, 22, 10]].forEach(([x, y, rx, ry]) => {
      paint(c, (p) => {
        p.moveTo(x - rx, y);
        p.quadraticCurveTo(x, y - ry * 2, x + rx, y);
        p.closePath();
      }, '#b2d47e', { shade: '#98bc68', cel: [rx * 0.4, 0], lw: 1.6, stroke: 'rgba(74,46,31,0.55)' });
    });
    D.field(c, 510, 378, 26, 16, '#e8d070', -0.25);
    D.field(c, 540, 368, 22, 16, '#a8d070', -0.25);
    D.field(c, 526, 398, 24, 14, '#d8b060', -0.25);
    D.field(c, 556, 390, 20, 14, '#e8d070', -0.25);
    c.restore();
    // 陸地描邊
    paint(c, landPath, 'rgba(0,0,0,0)', { lw: 3 });

    // 湖
    paint(c, (p) => p.ellipse(548, 294, 34, 17, -0.1, 0, Math.PI * 2), '#79c6ec', { shade: '#5aaedc', cel: [0, -4], lw: 2.2, hl: [538, 290, 12, 3] });
    // 河流
    const river = (pts, w, col, hi) => {
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      poly(c, pts, false);
      c.strokeStyle = OUT;
      c.lineWidth = w + 3;
      c.stroke();
      c.strokeStyle = col;
      c.lineWidth = w;
      c.stroke();
      c.strokeStyle = hi;
      c.lineWidth = Math.max(1.2, w * 0.25);
      c.setLineDash([6, 9]);
      c.stroke();
      c.setLineDash([]);
    };
    RIVERS_S.forEach((r) => river(r.pts, r.w, '#6cc4ea', '#d8f4ff'));
    river(LAVA_S, 6, '#ff7a2a', '#ffe07a');
    paint(c, (p) => p.ellipse(662, 240, 13, 6, 0, 0, Math.PI * 2), '#ff8a3a', { lw: 2, hl: [658, 238, 5, 1.5] });

    // 所有裝飾依 y 排序後再畫，前後遮擋才自然
    const items = [];
    const add = (y, fn) => items.push([y, fn]);
    const nodes = Object.keys(POS).map((k) => POS[k]);
    const segs = routeSegs();
    const blocked = [
      [252, 340, 50], [352, 322, 40], [548, 294, 42], [862, 200, 72], [612, 342, 22], [684, 368, 22], [484, 510, 20], [612, 256, 40], [672, 146, 30], [790, 296, 26], [628, 192, 22], [700, 118, 12], [748, 124, 12], [696, 248, 12], [736, 354, 12], [652, 122, 12], [622, 516, 26], [804, 412, 20],
      [534, 386, 40], [760, 416, 26], [662, 240, 18], [520, 196, 36], [590, 224, 28],
      [336, 222, 30], [478, 410, 20],
    ];
    const free = (x, y, r) => {
      if (nodes.some((p) => Math.hypot(p[0] - x, p[1] - y) < 24 + r)) return false;
      if (segs.some((s) => distSeg(x, y, s[0], s[1]) < 7 + r * 0.6)) return false;
      if (RIVERS_S.some((rv) => distLine(x, y, rv.pts) < rv.w + r * 0.8)) return false;
      if (distLine(x, y, LAVA_S) < 8 + r) return false;
      if (blocked.some((b) => Math.hypot(b[0] - x, b[1] - y) < b[2] + r * 0.5)) return false;
      c.beginPath();
      landPath(c);
      if (!c.isPointInPath(x, y) || distLine(x, y, LAND) < r + 6) return false;
      return true;
    };
    const placed = [];
    const scatter = (n, test, size, fn, gap) => {
      for (let i = 0, k = 0; i < n * 30 && k < n; i++) {
        const x = rr(40, 940);
        const y = rr(90, 555);
        const s = rr(size[0], size[1]);
        if (!test(x, y) || !free(x, y, s)) continue;
        if (placed.some((p) => Math.hypot(p[0] - x, (p[1] - y) * 1.4) < (gap || s * 1.3))) continue;
        placed.push([x, y]);
        k++;
        add(y, () => fn(x, y, s));
      }
    };
    seed = 23;
    const inF = (x, y) => inside(FOREST_PTS, x, y) && !inside(BEACH_POLY, x, y);
    const inS = (x, y) => inside(SNOW_PTS, x, y);
    const inC = (x, y) => inside(CANYON_PTS, x, y);
    const inB = (x, y) => inside(BEACH_POLY, x, y) && !inC(x, y);
    const inMeadow = (x, y) => !inF(x, y) && !inS(x, y) && !inC(x, y) && !inB(x, y);
    // 森林：圓樹、松樹、蘑菇
    scatter(110, inF, [8, 12], (x, y, s) => {
      const r = rnd();
      if (r < 0.55) D.roundTree(c, x, y, s, r < 0.3 ? '#5a9e48' : '#6aae52', r < 0.3 ? '#447e38' : '#528e40');
      else D.pine(c, x, y, s, '#3f8a4a', '#2f6e3a');
    }, 14);
    scatter(22, inF, [4, 6], (x, y, s) => D.mushroom(c, x, y, s, rnd() < 0.7 ? '#e8584a' : '#f0a040'), 9);
    // 草原：零星樹木與灌木
    scatter(28, inMeadow, [7, 10], (x, y, s) => D.roundTree(c, x, y, s, '#7cbc5a', '#5e9c44'), 22);
    scatter(16, inMeadow, [4, 6], (x, y, s) => oval(c, x, y - s * 0.5, s, s * 0.7, '#8cc460', { shade: '#6ea44a', cel: [s * 0.3, 0], lw: 1.4 }), 16);
    // 雪峰
    [[210, 236, 44, 70], [258, 214, 48, 92], [470, 214, 40, 66], [420, 196, 50, 96], [338, 190, 62, 118], [380, 238, 34, 50], [300, 250, 36, 54], [180, 264, 28, 38], [458, 262, 30, 40]].forEach(([x, y, w, h]) => add(y, () => D.peak(c, x, y, w, h)));
    add(232, () => D.shrine(c, 336, 232));
    scatter(26, inS, [6, 9], (x, y, s) => D.pine(c, x, y, s, '#4a8a6a', '#3a6e56', true), 14);
    // 峽谷
    add(250, () => {
      D.mesa(c, 612, 250, 30, 22);
      D.mesa(c, 614, 232, 17, 18);
    });
    add(140, () => D.mesa(c, 672, 140, 24, 18));
    add(296, () => D.mesa(c, 790, 290, 20, 16));
    add(338, () => D.mesa(c, 760, 336, 13, 11));
    add(190, () => D.mesa(c, 628, 186, 16, 13));
    [[700, 124, 26], [748, 130, 20], [696, 254, 18], [736, 360, 16], [652, 128, 16]].forEach(([x, y, h]) => add(y, () => D.spire(c, x, y, h)));
    add(214, () => D.volcano(c, 862, 214));
    add(342, () => D.hotspring(c, 612, 342, 15));
    add(368, () => D.hotspring(c, 684, 368, 12));
    scatter(22, inC, [4, 7], (x, y, s) => D.rock(c, x, y, s, '#b8765a'), 16);
    scatter(6, inC, [6, 8], (x, y, s) => D.pine(c, x, y, s, '#6a8a4a', '#546e3a'), 30);
    // 峽谷裂縫
    add(318, () => {
      const top = [[722, 332], [736, 322], [748, 325], [762, 313], [776, 315], [796, 303]];
      const bot = top.map(([x, y], i) => [x + 1, y + (i === 0 || i === top.length - 1 ? 0 : 6)]).reverse();
      paint(c, (p) => poly(p, top.concat(bot), true), '#5a2014', { lw: 2 });
      c.strokeStyle = 'rgba(255,122,42,0.9)';
      c.lineWidth = 1.5;
      c.beginPath();
      poly(c, top.map(([x, y], i) => [x, y + (i === 0 || i === top.length - 1 ? 0 : 3.5)]), false);
      c.stroke();
    });
    // 森林地標
    add(360, () => D.bigTree(c, 252, 360));
    add(338, () => D.queenHall(c, 352, 338));
    // 海岸
    add(520, () => D.lighthouse(c, 484, 520));
    scatter(9, inB, [8, 10], (x, y, s) => D.palm(c, x, y, s), 30);
    add(424, () => D.shell(c, 760, 424));
    add(512, () => {
      oval(c, 508, 512, 9, 4, '#7fd8e8', { lw: 1.3 });
      oval(c, 540, 516, 7, 3, '#7fd8e8', { lw: 1.3 });
      c.fillStyle = '#ff8a5a';
      c.save();
      c.translate(560, 506);
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 1.4 : 4;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
      c.restore();
    });
    // 草原小村莊
    add(410, () => {
      D.hut(c, 486, 418, '#e8704a');
      D.hut(c, 470, 404, '#5a8ac8');
    });
    items.sort((a, b) => a[0] - b[0]).forEach((it) => it[1]());
    // 沉船（擱淺在沉船灣的淺灘上）
    c.save();
    c.translate(624, 522);
    c.rotate(-0.22);
    c.scale(1.25, 1.25);
    D.shipwreck(c, 0, 0);
    c.restore();
    // 碼頭（寄居蟹巢灣）
    D.dock(c, 792, 410);
    // 橋：路線跨過河流或岩漿的地方
    const rivers = RIVERS_S.map((r) => r.pts).concat([LAVA_S]);
    segs.forEach(([a, b]) => {
      rivers.forEach((rv) => {
        for (let i = 1; i < rv.length; i++) {
          const x = segX(a, b, rv[i - 1], rv[i]);
          if (x) D.bridge(c, x[0], x[1], Math.atan2(b[1] - a[1], b[0] - a[0]));
        }
      });
    });
    return cv;
  }

  function buildFrame() {
    const cv = mk(WW, WH);
    const c = cv.getContext('2d');
    // 木框
    c.lineWidth = 12;
    c.strokeStyle = '#8b5a2b';
    c.strokeRect(6, 6, WW - 12, WH - 12);
    c.lineWidth = 2;
    c.strokeStyle = OUT;
    c.strokeRect(12, 12, WW - 24, WH - 24);
    c.strokeStyle = '#e8c070';
    c.lineWidth = 1.5;
    c.setLineDash([8, 5]);
    c.strokeRect(6, 6, WW - 12, WH - 12);
    c.setLineDash([]);
    // 四角楓葉飾
    [[14, 14], [WW - 14, 14], [14, WH - 14], [WW - 14, WH - 14]].forEach(([x, y]) => {
      oval(c, x, y, 11, 11, '#e8c070', { lw: 2 });
      paint(c, (p) => A.mapleLeafPath(p, x, y + 0.5, 8), '#e8584a', { lw: 1.2 });
    });
    // 標題緞帶
    const tx = 480;
    const ty = 20;
    const rib = (s) => paint(c, (p) => {
      p.moveTo(tx + s * 72, ty - 7);
      p.lineTo(tx + s * 100, ty - 7);
      p.lineTo(tx + s * 90, ty + 3);
      p.lineTo(tx + s * 100, ty + 13);
      p.lineTo(tx + s * 72, ty + 13);
      p.closePath();
    }, '#b8423a', { lw: 2 });
    rib(-1);
    rib(1);
    paint(c, (p) => {
      p.moveTo(tx - 80, ty - 12);
      p.quadraticCurveTo(tx, ty - 18, tx + 80, ty - 12);
      p.lineTo(tx + 80, ty + 10);
      p.quadraticCurveTo(tx, ty + 4, tx - 80, ty + 10);
      p.closePath();
    }, '#e8584a', { shade: '#c8423a', cel: [0, -4], lw: 2 });
    G.hud.text(c, '✦ 星楓大陸 ✦', tx, ty - 3, 16, '#fff3c8', 'center');
    return cv;
  }

  function build() {
    const mode = A.mode;
    A.mode = null;
    L = {};
    try {
      // 海與陸地合成一張底圖，再蓋上羊皮紙邊緣暈影
      L.base = buildSea();
      const bc = L.base.getContext('2d');
      L.land = buildLand();
      bc.drawImage(L.land, 0, 0);
      const v = bc.createRadialGradient(WW / 2, WH / 2, 300, WW / 2, WH / 2, 620);
      v.addColorStop(0, 'rgba(120,80,30,0)');
      v.addColorStop(1, 'rgba(120,80,30,0.26)');
      bc.fillStyle = v;
      bc.fillRect(0, 0, WW, WH);
      L.land = null;
      L.frame = buildFrame();
      // 節點底下的光暈
      const h = mk(64, 64);
      const hc = h.getContext('2d');
      const g = hc.createRadialGradient(32, 32, 4, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,250,220,0.95)');
      g.addColorStop(0.5, 'rgba(255,245,200,0.5)');
      g.addColorStop(1, 'rgba(255,245,200,0)');
      hc.fillStyle = g;
      hc.fillRect(0, 0, 64, 64);
      L.halo = h;
      // 雲霧團
      const f = mk(128, 128);
      const fc = f.getContext('2d');
      const fg = fc.createRadialGradient(64, 64, 10, 64, 64, 64);
      fg.addColorStop(0, 'rgba(255,255,255,0.8)');
      fg.addColorStop(0.6, 'rgba(250,250,255,0.55)');
      fg.addColorStop(1, 'rgba(245,245,255,0)');
      fc.fillStyle = fg;
      fc.fillRect(0, 0, 128, 128);
      L.puff = f;
      // 每個未開放區域的雲霧先畫好一張
      L.fog = FUTURE.map((q) => {
        const w = Math.ceil(q.rx * 2 + q.ry * 2.4);
        const hh = Math.ceil(q.ry * 4.4);
        const cv = mk(w, hh);
        const c = cv.getContext('2d');
        const n = 16;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const k = i % 2 ? 0.55 : 0.95;
          const r = q.ry * (i % 2 ? 1.1 : 0.95);
          c.globalAlpha = 0.8;
          c.drawImage(f, w / 2 + Math.cos(a) * q.rx * k - r, hh / 2 + Math.sin(a) * q.ry * k - r, r * 2, r * 2);
        }
        c.drawImage(f, w / 2 - q.ry * 1.3, hh / 2 - q.ry * 1.3, q.ry * 2.6, q.ry * 2.6);
        return cv;
      });
      // 繪本風的雲
      const cl = mk(130, 60);
      const cc = cl.getContext('2d');
      const cloudPath = (p) => {
        p.moveTo(14, 48);
        p.arc(24, 38, 14, Math.PI * 0.6, Math.PI * 1.5);
        p.arc(50, 26, 20, Math.PI * 1.1, Math.PI * 1.85);
        p.arc(80, 24, 16, Math.PI * 1.2, Math.PI * 1.95);
        p.arc(104, 38, 14, Math.PI * 1.4, Math.PI * 0.4);
        p.closePath();
      };
      paint(cc, cloudPath, '#ffffff', { shade: '#dce8f4', cel: [0, 6], lw: 2, stroke: 'rgba(90,110,140,0.7)' });
      L.cloud = cl;
    } finally {
      A.mode = mode;
    }
  }

  // ── 會動的東西 ──
  function boat(c, x, y, t, s, sail) {
    const b = Math.sin(t * 2 + x) * 1.5;
    const r = Math.sin(t * 1.6 + x) * 0.06;
    c.save();
    c.translate(x, y + b);
    c.rotate(r);
    c.scale(s, s);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.ellipse(0, 4, 20, 3, 0, 0, Math.PI * 2);
    c.fill();
    paint(c, (p) => {
      p.moveTo(-16, -3);
      p.lineTo(16, -3);
      p.quadraticCurveTo(12, 5, 0, 5);
      p.quadraticCurveTo(-12, 5, -16, -3);
      p.closePath();
    }, '#a86a3a', { shade: '#86502a', cel: [0, -3], lw: 1.8 });
    if (sail) {
      c.strokeStyle = OUT;
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(0, -3);
      c.lineTo(0, -30);
      c.stroke();
      paint(c, (p) => {
        p.moveTo(1, -28);
        p.quadraticCurveTo(14, -18, 13, -6);
        p.lineTo(1, -6);
        p.closePath();
      }, '#fff6e0', { lw: 1.5 });
      paint(c, (p) => {
        p.moveTo(-1, -26);
        p.quadraticCurveTo(-9, -16, -9, -7);
        p.lineTo(-1, -7);
        p.closePath();
      }, '#fff6e0', { lw: 1.5 });
      paint(c, (p) => {
        p.moveTo(0, -30);
        p.lineTo(8, -32 + Math.sin(t * 6) * 1.2);
        p.lineTo(0, -34);
        p.closePath();
      }, '#e8584a', { lw: 1.2 });
    }
    c.restore();
  }

  function whale(c, x, y, t) {
    const ph = (t * 0.12) % 1; // 每幾秒露出一次尾巴
    const up = ph < 0.5 ? Math.sin((ph / 0.5) * Math.PI) : 0;
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.ellipse(x, y + 2, 14 + up * 6, 3.5, 0, 0, Math.PI * 2);
    c.fill();
    if (up <= 0.05) return;
    c.save();
    c.beginPath();
    c.rect(x - 40, y - 60, 80, 62);
    c.clip();
    c.translate(x, y + (1 - up) * 28);
    paint(c, (p) => {
      p.moveTo(-4, 2);
      p.quadraticCurveTo(-3, -10, -2, -16);
      p.quadraticCurveTo(-12, -18, -16, -26);
      p.quadraticCurveTo(-6, -24, 0, -20);
      p.quadraticCurveTo(6, -24, 16, -26);
      p.quadraticCurveTo(12, -18, 2, -16);
      p.quadraticCurveTo(3, -10, 4, 2);
      p.closePath();
    }, '#5a7ab0', { shade: '#445e90', cel: [4, 0], lw: 1.8 });
    c.restore();
    if (up > 0.6) {
      c.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(x - 12 + i * 8, y - 2 - Math.abs(Math.sin(i + t * 8)) * 3, 1.8, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function smoke(c, x, y, t, n, col, spd, size) {
    for (let i = 0; i < n; i++) {
      const ph = (t * spd + i / n) % 1;
      const r = size * (0.4 + ph);
      c.fillStyle = col.replace('A', (0.75 * Math.min(1, (1 - ph) * 1.6)).toFixed(3));
      c.beginPath();
      c.arc(x + Math.sin(ph * 5 + i) * 4 - ph * 16, y - ph * 50, r, 0, Math.PI * 2);
      c.fill();
    }
  }

  function steam(c, x, y, t) {
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 2;
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.6 + i / 3) % 1;
      c.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
      const bx = x + (i - 1) * 6;
      const by = y - ph * 16;
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(bx + 4, by - 4, bx, by - 8);
      c.quadraticCurveTo(bx - 4, by - 12, bx, by - 16);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  function sparkle(c, x, y, s, a, col) {
    if (a <= 0) return;
    c.globalAlpha = Math.min(1, a);
    c.fillStyle = col || '#ffffff';
    c.beginPath();
    c.moveTo(x, y - s);
    c.quadraticCurveTo(x, y, x + s, y);
    c.quadraticCurveTo(x, y, x, y + s);
    c.quadraticCurveTo(x, y, x - s, y);
    c.quadraticCurveTo(x, y, x, y - s);
    c.fill();
    c.globalAlpha = 1;
  }

  // 浮空遺跡：浮島、風車、發光的星楓樹
  function skyIsles(c, t) {
    const isle = (x, y, w, h, top) => {
      paint(c, (p) => {
        p.moveTo(x - w, y);
        p.quadraticCurveTo(x - w * 0.5, y + h * 0.6, x - w * 0.15, y + h);
        p.lineTo(x, y + h * 1.3);
        p.lineTo(x + w * 0.2, y + h * 0.9);
        p.quadraticCurveTo(x + w * 0.6, y + h * 0.5, x + w, y);
        p.closePath();
      }, '#9a8aa8', { shade: '#766888', cel: [w * 0.3, 0], lw: 2 });
      oval(c, x, y, w, h * 0.3, top || '#a8d88a', { shade: '#88bc6c', cel: [0, -2], lw: 2 });
    };
    const b1 = Math.sin(t * 1.1) * 3;
    const b2 = Math.sin(t * 1.3 + 1) * 3;
    const b3 = Math.sin(t * 0.9 + 2) * 2.5;
    // 小浮島
    isle(778, 50 + b2, 20, 12);
    paint(c, (p) => p.rect(772, 36 + b2, 5, 14), '#c8c0d8', { lw: 1.4 });
    paint(c, (p) => p.rect(782, 40 + b2, 5, 10), '#c8c0d8', { lw: 1.4 });
    isle(914, 98 + b3, 16, 10);
    D.roundTree(c, 914, 98 + b3, 6, '#ffb8d8', '#e890b8');
    // 主浮島
    isle(846, 78 + b1, 48, 20);
    // 瀑布
    c.fillStyle = 'rgba(200,240,255,0.8)';
    c.fillRect(804, 82 + b1, 4, 22 + Math.sin(t * 3) * 2);
    // 遺跡柱子
    paint(c, (p) => p.rect(808, 50 + b1, 9, 26), '#c8c0d8', { shade: '#a8a0b8', cel: [3, 0], lw: 1.6 });
    paint(c, (p) => p.rect(804, 46 + b1, 17, 5), '#d8d0e8', { lw: 1.6 });
    // 風車
    const wx = 832;
    const wy = 72 + b1;
    paint(c, (p) => {
      p.moveTo(wx - 8, wy);
      p.lineTo(wx - 5, wy - 26);
      p.lineTo(wx + 5, wy - 26);
      p.lineTo(wx + 8, wy);
      p.closePath();
    }, '#f4e8d0', { shade: '#dccdb0', cel: [3, 0], lw: 1.6 });
    paint(c, (p) => {
      p.moveTo(wx - 8, wy - 25);
      p.lineTo(wx, wy - 34);
      p.lineTo(wx + 8, wy - 25);
      p.closePath();
    }, '#c8584a', { lw: 1.6 });
    c.save();
    c.translate(wx, wy - 24);
    c.rotate(t * 1.5);
    for (let i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      paint(c, (p) => p.rect(-2.5, 2, 5, 16), '#fff6e0', { lw: 1.3 });
    }
    c.restore();
    oval(c, wx, wy - 24, 2.5, 2.5, OUT, { lw: 0 });
    // 星楓樹
    const tx = 866;
    const ty = 72 + b1;
    const glow = c.createRadialGradient(tx, ty - 26, 4, tx, ty - 26, 40);
    glow.addColorStop(0, 'rgba(255,230,140,' + (0.55 + Math.sin(t * 2) * 0.15).toFixed(2) + ')');
    glow.addColorStop(1, 'rgba(255,230,140,0)');
    c.fillStyle = glow;
    c.beginPath();
    c.arc(tx, ty - 26, 40, 0, Math.PI * 2);
    c.fill();
    paint(c, (p) => {
      p.moveTo(tx - 4, ty);
      p.lineTo(tx - 2, ty - 18);
      p.lineTo(tx + 2, ty - 18);
      p.lineTo(tx + 4, ty);
      p.closePath();
    }, '#8a5a34', { lw: 1.5 });
    [[-10, -24, 10], [10, -24, 10], [0, -34, 12]].forEach(([a, b, s]) => {
      paint(c, (p) => A.mapleLeafPath(p, tx + a, ty + b, s), '#ff9a4a', { shade: '#e8703a', cel: [3, 3], lw: 1.6 });
    });
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + i * 1.05;
      sparkle(c, tx + Math.cos(a) * 26, ty - 28 + Math.sin(a * 1.3) * 16, 3.5, Math.sin(t * 3 + i * 2) * 0.8 + 0.2, '#fff6b0');
    }
  }

  function birds(c, t) {
    c.strokeStyle = 'rgba(60,40,30,0.75)';
    c.lineWidth = 1.6;
    c.lineCap = 'round';
    [[0, 150, 0.03, 0], [0.5, 300, 0.022, 2]].forEach(([off, by, spd, ph]) => {
      const u = (t * spd + off) % 1;
      const x = -40 + u * (WW + 80);
      const y = by + Math.sin(u * 8 + ph) * 30;
      [[0, 0], [-12, -6], [-12, 7], [-24, 1]].forEach(([dx, dy], i) => {
        const f = Math.sin(t * 9 + i) * 3;
        c.beginPath();
        c.moveTo(x + dx - 5, y + dy - f);
        c.quadraticCurveTo(x + dx - 2, y + dy - 2, x + dx, y + dy + 1);
        c.quadraticCurveTo(x + dx + 2, y + dy - 2, x + dx + 5, y + dy - f);
        c.stroke();
      });
    });
  }

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

    // ── 畫大陸 ──
    drawLand(ctx, t) {
      if (!L) build();
      ctx.drawImage(L.base, 0, 0);
      // 以下的海面動畫只畫在海上
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, WW, WH);
      landPath(ctx, 0, 10);
      ctx.clip('evenodd');
      // 海面起伏的浪
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      L.waves.forEach(([x, y, p]) => {
        const ph = (t * 0.25 + p) % 1;
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        const dx = ph * 14 - 7;
        ctx.beginPath();
        ctx.arc(x + dx, y, 7, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      // 海岸浪花
      ctx.save();
      ctx.beginPath();
      landPath(ctx, 0, 7);
      ctx.lineJoin = 'round';
      ctx.setLineDash([12, 10, 4, 10]);
      ctx.lineDashOffset = -t * 6;
      ctx.lineWidth = 10 + Math.sin(t * 1.5) * 2.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // 閃光
      for (let i = 0; i < 8; i++) {
        const w = L.waves[(i * 3) % L.waves.length];
        if (w) sparkle(ctx, w[0] + 10, w[1] - 8, 3, Math.sin(t * 2.2 + i * 1.7) * 1.2 - 0.3);
      }
      // 船與鯨魚
      boat(ctx, 880, 368 + Math.sin(t * 0.3) * 4, t, 1, true);
      boat(ctx, 44 + Math.sin(t * 0.25) * 6, 300, t, 0.75, true);
      boat(ctx, 834, 436, t, 0.55, false);
      boat(ctx, 432, 70 + Math.sin(t * 0.2) * 3, t, 0.8, true);
      whale(ctx, 598, 76, t);
      whale(ctx, 36, 470, t + 4);
      ctx.restore();
      // 岩漿發光
      ctx.save();
      ctx.beginPath();
      poly(ctx, LAVA_S, false);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,150,60,' + (0.25 + Math.sin(t * 3) * 0.15).toFixed(3) + ')';
      ctx.lineWidth = 14;
      ctx.stroke();
      ctx.setLineDash([3, 14]);
      ctx.lineDashOffset = t * 12;
      ctx.strokeStyle = 'rgba(255,240,150,0.9)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
      // 河水流動
      ctx.save();
      ctx.setLineDash([2, 16]);
      ctx.lineDashOffset = -t * 14;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      RIVERS_S.forEach((r) => {
        ctx.beginPath();
        poly(ctx, r.pts, false);
        ctx.stroke();
      });
      ctx.restore();
      // 火山煙、溫泉蒸氣
      const lg = 0.5 + Math.sin(t * 4) * 0.3;
      ctx.fillStyle = 'rgba(255,160,70,' + (lg * 0.5).toFixed(2) + ')';
      ctx.beginPath();
      ctx.ellipse(861, 138, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      smoke(ctx, 860, 130, t, 7, 'rgba(90,72,72,A)', 0.16, 11);
      steam(ctx, 612, 334, t);
      steam(ctx, 684, 362, t + 0.4);
      steam(ctx, 790, 276, t + 0.8);
      steam(ctx, 740, 282, t + 1.3);
      // 燈塔的光
      ctx.save();
      ctx.translate(484, 482);
      ctx.rotate(t * 0.9);
      const bg = ctx.createLinearGradient(0, 0, 70, 0);
      bg.addColorStop(0, 'rgba(255,240,150,0.55)');
      bg.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(70, -12);
      ctx.lineTo(70, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,240,150,' + (0.6 + Math.sin(t * 3) * 0.3).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(484, 482, 6, 0, Math.PI * 2);
      ctx.fill();
      // 森林裡的苔光、螢火蟲
      for (let i = 0; i < 14; i++) {
        const x = 90 + ((i * 97) % 300) + Math.sin(t * 0.7 + i) * 8;
        const y = 350 + ((i * 53) % 180) + Math.cos(t * 0.9 + i * 2) * 6;
        const a = Math.sin(t * 2 + i * 1.3) * 0.7 + 0.2;
        if (a <= 0) continue;
        ctx.fillStyle = 'rgba(230,255,140,' + (a * 0.35).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(250,255,200,' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // 天空
      birds(ctx, t);
      skyIsles(ctx, t);
      [[0, 34, 0.9, 0.012], [0.35, 546, 0.7, 0.009], [0.62, 22, 0.6, 0.015]].forEach(([off, y, s, spd]) => {
        const u = (t * spd + off) % 1;
        const x = -140 + u * (WW + 280);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(L.cloud, x - 65 * s, y - 30 * s, 130 * s, 60 * s);
      });
      ctx.globalAlpha = 1;
      // 邊框只畫四條邊（中間是透明的，不必整張貼）
      const F = L.frame;
      ctx.drawImage(F, 0, 0, WW, 40, 0, 0, WW, 40);
      ctx.drawImage(F, 0, WH - 28, WW, 28, 0, WH - 28, WW, 28);
      ctx.drawImage(F, 0, 40, 28, WH - 68, 0, 40, 28, WH - 68);
      ctx.drawImage(F, WW - 28, 40, 28, WH - 68, WW - 28, 40, 28, WH - 68);
    },

    drawFog(ctx, t) {
      if (!L) build();
      FUTURE.forEach((f, j) => {
        // 去過這一區之後，雲霧就散開
        if (G.data.mapOrder.some((id) => G.data.maps[id].region === f.region && G.world.visited[id])) return;
        const fc = L.fog[j];
        ctx.globalAlpha = f.a;
        ctx.drawImage(fc, f.x - fc.width / 2 + Math.sin(t * 0.4 + j) * 5, f.y - fc.height / 2 + Math.cos(t * 0.3 + j) * 2);
        // 幾團慢慢飄動的霧
        for (let i = 0; i < 3; i++) {
          const a = t * 0.12 + i * 2.1 + j;
          const r = f.ry * 0.9;
          ctx.globalAlpha = 0.35;
          ctx.drawImage(L.puff, f.x + Math.cos(a) * f.rx * 0.7 - r, f.y + Math.sin(a) * f.ry * 0.5 - r, r * 2, r * 2);
        }
        ctx.globalAlpha = 1;
        G.hud.text(ctx, '？？？', f.x, f.y + 4, 22, '#7a7a98', 'center', false);
      });
    },

    draw(ctx, t) {
      ctx.save();
      this.drawLand(ctx, t);
      const maps = G.data.maps;
      const order = G.data.mapOrder;
      // 路線
      ctx.lineCap = 'round';
      for (let i = 1; i < order.length; i++) {
        const a = POS[order[i - 1]];
        const b = POS[order[i]];
        if (!a || !b) continue;
        const seen = G.world.visited[order[i - 1]] && G.world.visited[order[i]];
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.setLineDash(seen ? [] : [6, 7]);
        ctx.strokeStyle = seen ? 'rgba(255,246,220,0.9)' : 'rgba(255,246,220,0.45)';
        ctx.lineWidth = seen ? 8 : 6;
        ctx.stroke();
        ctx.strokeStyle = seen ? 'rgba(120,70,30,0.9)' : 'rgba(120,70,30,0.5)';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      this.drawFog(ctx, t);
      // 區域名稱
      for (const r in REGION_LABEL) {
        const ch = G.data.story.chapters[r];
        const [x, y] = REGION_LABEL[r];
        const open = order.some((id) => maps[id].region === +r && G.world.visited[id]);
        const label = open ? ch.no + '　' + ch.name : ch.no + '　？？？';
        ctx.font = 'bold 15px ' + A.FONT;
        const w = ctx.measureText(label).width + (G.story.hasLeaf(+r) ? 30 : 16);
        G.hud.panel(ctx, x - w / 2 - 2, y - 15, w + 4, 28, 12, 'rgba(255,233,176,0.75)');
        G.hud.panel(ctx, x - w / 2, y - 13, w, 24, 10, 'rgba(60,36,20,0.85)');
        G.hud.text(ctx, label, x - (G.story.hasLeaf(+r) ? 8 : 0), y, 15, open ? '#ffe9b0' : '#b8a890', 'center', false);
        if (G.story.hasLeaf(+r)) {
          ctx.save();
          ctx.translate(x + w / 2 - 14, y);
          A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, 7), ch.leaf.color, null, { lw: 1.5, hl: false });
          ctx.restore();
        }
      }
      // 節點
      for (const id of order) {
        const p = POS[id];
        if (!p) continue;
        const m = maps[id];
        const seen = !!G.world.visited[id];
        const hov = this.hover === id;
        const r = m.type === 'boss' ? 13 : m.type === 'camp' ? 12 : 9;
        const col = !seen ? '#b8b0a0' : m.type === 'boss' ? (G.world.flags[m.boss.m + 'Defeated'] ? '#b88aff' : '#e84a4a') : m.type === 'camp' ? '#ffd35a' : '#8fd06a';
        // 節點底下的柔光與影子
        const hr = r + (seen ? 13 : 9);
        ctx.globalAlpha = seen ? 0.9 : 0.55;
        ctx.drawImage(L.halo, p[0] - hr, p[1] - hr, hr * 2, hr * 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(40,20,10,0.3)';
        ctx.beginPath();
        ctx.ellipse(p[0] + 1, p[1] + r * 0.8, r * 1.05, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        if (hov) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(p[0], p[1], r + 8, 0, Math.PI * 2);
          ctx.fill();
        }
        A.ellipse(ctx, p[0], p[1], r, r, col, null, { lw: 2.5, hl: false });
        const glyph = !seen ? '?' : m.type === 'boss' ? '★' : m.type === 'camp' ? '⌂' : '';
        if (glyph) G.hud.text(ctx, glyph, p[0], p[1] + 1, r + 3, '#4a2e1f', 'center', false);
        if (seen && (hov || m.type !== 'hunt')) {
          G.hud.text(ctx, m.name, p[0], p[1] - r - 11, 12, '#ffffff', 'center');
        }
      }
      // 小獅子在這裡
      const cur = POS[G.world.mapId];
      if (cur) {
        const bob = Math.abs(Math.sin(t * 4)) * 6;
        ctx.save();
        ctx.translate(cur[0], cur[1] - 16 - bob);
        ctx.scale(0.42, 0.42);
        A.drawLion(ctx, 0, 0, 1, { state: 'idle', t, p: 0, onGround: true, form: G.player.form, leaves: G.story.crownColors() });
        ctx.restore();
      }
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
  });

  // 視窗打開時啟動畫布動畫與滑鼠提示
  const obs = new MutationObserver(() => {
    document.querySelectorAll('canvas.worldmap-canvas:not([data-done])').forEach((c) => {
      c.setAttribute('data-done', '1');
      const ctx = c.getContext('2d');
      const info = c.parentNode.querySelector('.wm-info');
      const showInfo = (id) => {
        if (!info) return;
        const d = M.info(id || G.world.mapId);
        info.innerHTML = '<b>' + d.title + '</b>' + d.lines.map((l) => '<div>' + l + '</div>').join('');
      };
      showInfo(null);
      c.addEventListener('mousemove', (e) => {
        const r = c.getBoundingClientRect();
        const id = M.nodeAt(((e.clientX - r.left) / r.width) * WW, ((e.clientY - r.top) / r.height) * WH);
        if (id !== M.hover) {
          M.hover = id;
          showInfo(id);
        }
      });
      c.addEventListener('mouseleave', () => {
        M.hover = null;
        showInfo(null);
      });
      let t = 0;
      const tick = () => {
        if (!c.isConnected) return;
        t += 1 / 60;
        M.draw(ctx, t);
        requestAnimationFrame(tick);
      };
      tick();
    });
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  M.W = WW;
  M.H = WH;
})();
