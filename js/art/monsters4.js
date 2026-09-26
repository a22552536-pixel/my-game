// 第三章「赤岩峽谷」新怪物、投射物、地面區域與掉落素材圖示。
// 設計：自然物 ＋ 一個不相干的物件／概念（火柴、憤怒、磁鐵、燭台、秤砣、風箱、陶甕、心情、藏寶圖）。
// 風格同 monsters2.js：平塗、深棕描邊、右下月牙陰影、左上亮點、Q 版大眼；第三章體型約第一章的 1.3 倍、表情更兇一點。
// 原點在腳底中央、面向右（+x）；翻轉、縮放、飛行高度由 A.drawMonster 處理。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const PI = Math.PI;
  const TAU = PI * 2;

  // ───────────── 共用小工具 ─────────────
  function eyeKind(m) {
    return m.dead ? 'x' : m.hurtT > 0 ? 'hurt' : m.angry ? 'angry' : m.blink ? 'closed' : 'normal';
  }
  function faceEyes(ctx, x, y, gap, rx, ry, m, kind) {
    kind = kind || eyeKind(m);
    A.eye(ctx, x, y, rx, ry, kind, 0.8);
    A.eye(ctx, x + gap, y - 0.5, rx * 0.92, ry * 0.95, kind, 0.8);
  }
  function smallMouth(ctx, x, y, open, k) {
    k = k || 1;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (open) {
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 3 * k, 3.5 * k, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y - 1, 3 * k, 0.2 * PI, 0.8 * PI);
      ctx.stroke();
    }
  }
  function limb(ctx, path, w, col) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = Math.max(1, w - 3);
    ctx.stroke();
  }
  function glow(ctx, x, y, r, rgb, a) {
    if (!(a > 0) || !(r > 0)) return;
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function walking(m) {
    if (m.onGround === false) return false;
    if (m.vx != null) return Math.abs(m.vx) > 5;
    return m.state === 'walk';
  }
  function phase(m) {
    return m.attackPhase || null;
  }
  function clamp(v, a, b) {
    v = +v;
    if (!(v === v)) v = a;
    return v < a ? a : v > b ? b : v;
  }
  // 顏色混合（量化，避免 U.mix 的快取無限長大）
  function mixq(a, b, k) {
    return U.mix(a, b, Math.round(clamp(k, 0, 1) * 20) / 20);
  }
  // 可以往某方向彎的火焰（lean > 0 往右倒）
  function flame(ctx, x, y, r, t, seed, lean) {
    lean = lean || 0;
    const f = Math.sin(t * 18 + (seed || 0)) * 0.15 + lean;
    glow(ctx, x, y - r * 0.5, r * 3, '255,170,60', 0.45);
    A.shape(ctx, (c) => {
      c.moveTo(x + f * r * 2, y - r * 2.2);
      c.bezierCurveTo(x + r * 0.9 + f * r, y - r * 1.1, x + r, y + r * 0.5, x, y + r * 0.8);
      c.bezierCurveTo(x - r, y + r * 0.5, x - r * 0.9 + f * r, y - r * 1.0, x + f * r * 2, y - r * 2.2);
      c.closePath();
    }, '#ff7a2a', '#e8521e', { lw: 2, shadeY: y + r * 0.2 });
    A.shape(ctx, (c) => {
      c.moveTo(x + f * r, y - r * 1.15);
      c.quadraticCurveTo(x + r * 0.6, y, x, y + r * 0.45);
      c.quadraticCurveTo(x - r * 0.6, y, x + f * r, y - r * 1.15);
      c.closePath();
    }, '#ffe46a', null, { noStroke: true });
  }
  // 漫畫的「💢」怒氣記號
  function angerMark(ctx, x, y, s, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    const path = () => {
      ctx.beginPath();
      for (let q = 0; q < 4; q++) {
        const a = q * PI * 0.5;
        const co = Math.cos(a);
        const si = Math.sin(a);
        const P = (px, py) => [px * co - py * si, px * si + py * co];
        const p0 = P(s * 0.22, -s);
        const p1 = P(s * 0.22, -s * 0.22);
        const p2 = P(s, -s * 0.22);
        ctx.moveTo(p0[0], p0[1]);
        ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
      }
    };
    path();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = Math.max(2.5, s * 0.55);
    ctx.stroke();
    ctx.strokeStyle = A.c(col || '#ff3b3b');
    ctx.lineWidth = Math.max(1.2, s * 0.55 - 2.2);
    ctx.stroke();
    ctx.restore();
  }
  function puff(ctx, x, y, r, col, a) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.arc(x + r * 0.8, y + r * 0.2, r * 0.7, 0, TAU);
    ctx.arc(x - r * 0.75, y + r * 0.25, r * 0.65, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function speedLines(ctx, x, y, h, n, len, t, col) {
    ctx.save();
    ctx.strokeStyle = col || 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const q = (t * 3 + i * 0.37) % 1;
      const yy = y - h / 2 + (h * (i + 0.5)) / n;
      const xx = x - q * 14;
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx - len * (0.6 + 0.4 * ((i * 7) % 3) / 2), yy);
    }
    ctx.stroke();
    ctx.restore();
  }
  function sparkle(ctx, x, y, s, col) {
    ctx.fillStyle = A.c(col || '#fff6b0');
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
  function heart(ctx, x, y, s, col) {
    A.shape(ctx, (c) => {
      c.moveTo(x, y + s * 0.9);
      c.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
      c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.3, y - s * 0.1, x, y + s * 0.9);
      c.closePath();
    }, col, null, { lw: 1.6 });
  }
  function dust(ctx, x, y, t, k) {
    for (let i = 0; i < 3; i++) {
      const q = (t * 2.2 + i / 3) % 1;
      puff(ctx, x - q * 16 * k, y - 3 - q * 8, (3 + q * 4) * k, '#e8c8a0', (1 - q) * 0.8);
    }
  }

  // ═════════════ 第三章：赤岩峽谷 ═════════════

  // ── 火柴蜥：火柴棒身體的蜥蜴，頭是紅色火柴頭，尾巴尖是燒黑的火柴尾 ──
  function matchlizard(ctx, m) {
    const ba = ctx.globalAlpha;
    const fx = m.fx || {};
    const t = m.t || 0;
    const lit = !!fx.lit;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const fast = strike || Math.abs(m.vx || 0) > 110;
    const step = walk ? Math.sin(t * (fast ? 22 : 15)) : 0;
    const wood = ['#f2d49a', '#d2aa68'];
    const woodDark = '#b88a4c';
    ctx.save();
    if (hurt) ctx.rotate(-0.08);
    if (strike) ctx.translate(4, 0);
    const lean = wind ? 0.1 : strike ? -0.04 : 0;
    ctx.rotate(lean);
    const by = -13 + (walk ? Math.abs(step) * -1 : Math.sin(t * 3) * 0.5);

    // 後腳（在身體後面）
    const leg = (x, s, col) => {
      const lift = Math.max(0, s) * 3.5;
      limb(ctx, (c) => { c.moveTo(x, by + 2); c.lineTo(x + 3 + s * 2, -3 - lift); }, 5.5, col);
      A.ellipse(ctx, x + 6 + s * 2, -2.5 - lift, 4, 2.3, col, null, { lw: 2, hl: false });
    };
    leg(-14, -step, wood[1]);
    leg(6, step, wood[1]);

    // 尾巴：往後翹起、尖端燒黑（火柴燒過的那一頭）
    const tw = Math.sin(t * 3.2) * 2 + (fast ? 3 : 0);
    const tail = (c) => {
      c.moveTo(-14, by - 4);
      c.bezierCurveTo(-24, by - 4, -32, by - 5 - tw, -38, by - 13 - tw);
      c.lineTo(-35, by - 16 - tw);
      c.bezierCurveTo(-30, by - 9 - tw, -24, by + 4, -14, by + 4);
      c.closePath();
    };
    A.shape(ctx, tail, wood[0], wood[1], { cel: [1.5, 1.5] });
    ctx.save();
    ctx.beginPath();
    tail(ctx);
    ctx.clip();
    ctx.fillStyle = A.c('#3a2a26');
    ctx.beginPath();
    ctx.arc(-38, by - 14 - tw, 7, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    tail(ctx);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    if (lit) glow(ctx, -37, by - 14 - tw, 7, '255,120,40', 0.6 + Math.sin(t * 9) * 0.2);

    // 身體：一根直直的火柴棒（方頭圓角、木紋）
    const body = (c) => A.roundRect(c, -18, by - 7, 36, 13, 5);
    A.shape(ctx, body, wood[0], wood[1], { cel: [2.5, 2.5], hl: [-8, by - 4, 5, 1.4] });
    ctx.strokeStyle = A.c(woodDark);
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-13, by - 2);
    ctx.lineTo(-1, by - 2);
    ctx.moveTo(3, by + 1.5);
    ctx.lineTo(13, by + 1.5);
    ctx.moveTo(-9, by + 2.5);
    ctx.lineTo(-4, by + 2.5);
    ctx.stroke();
    // 蜥蜴背上的小鱗點
    ctx.fillStyle = A.c(woodDark);
    [-12, -5, 2, 9].forEach((x) => { ctx.beginPath(); ctx.arc(x, by - 4.5, 1.3, 0, TAU); ctx.fill(); });

    leg(-10, step, wood[0]);
    leg(10, -step, wood[0]);

    // 頭：紅色火柴頭（圓鼓鼓的磷頭，帶一點蜥蜴的吻部）
    ctx.save();
    ctx.translate(15, by - 4);
    let hr = Math.sin(t * 2.5) * 0.04;
    if (wind) hr = 0.55 + Math.sin(t * 40) * 0.05; // 低頭在地上擦
    if (strike) hr = -0.12;
    if (hurt) hr = -0.3;
    ctx.rotate(hr);
    const hx = 9;
    const hy = -9;
    const head = (c) => {
      c.moveTo(hx - 12, hy + 6);
      c.bezierCurveTo(hx - 16, hy - 10, hx - 2, hy - 18, hx + 8, hy - 11);
      c.bezierCurveTo(hx + 14, hy - 7, hx + 17, hy + 1, hx + 13, hy + 5);
      c.bezierCurveTo(hx + 8, hy + 10, hx - 8, hy + 12, hx - 12, hy + 6);
      c.closePath();
    };
    if (lit) glow(ctx, hx, hy - 4, 30, '255,150,60', 0.4);
    const headCol = lit ? ['#f04a2e', '#b8321e'] : ['#e8453a', '#b02e2c'];
    A.shape(ctx, head, headCol[0], headCol[1], { cel: [3, 3], hl: [hx - 5, hy - 9, 4, 2.2] });
    // 磷粉顆粒
    ctx.fillStyle = A.c('#b8302c');
    [[-6, -2], [-1, 4], [5, -8], [-8, -8]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(hx + x, hy + y, 1.2, 0, TAU); ctx.fill(); });
    // 著火後頭頂燒焦
    if (lit) {
      ctx.save();
      ctx.beginPath();
      head(ctx);
      ctx.clip();
      ctx.fillStyle = A.c('#5a2a22');
      ctx.beginPath();
      ctx.ellipse(hx - 1, hy - 15, 11, 5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      head(ctx);
      ctx.lineWidth = 3;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
    }
    // 眼睛（白底讓紅頭上的眼睛看得清楚）
    const kind = eyeKind(m);
    const ek = lit && kind === 'normal' ? 'angry' : kind;
    [[hx + 1, hy - 3, 4.2], [hx + 9, hy - 3.5, 3.8]].forEach(([x, y, r]) => {
      A.ellipse(ctx, x, y, r, r * 1.1, '#fff8ec', null, { lw: 2, hl: false });
      if (ek === 'x') A.eye(ctx, x, y, 2, 2, 'x');
      else if (ek === 'closed') A.eye(ctx, x, y + 1, 2.4, 1.8, 'closed');
      else if (ek === 'hurt') A.eye(ctx, x, y, 2, 2.4, 'hurt');
      else A.eye(ctx, x + 1, y + 0.6, 2.2, 2.9, 'normal', 0);
    });
    if (ek === 'angry' && !m.dead) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - 10);
      ctx.lineTo(hx + 4, hy - 7.5);
      ctx.moveTo(hx + 6, hy - 8);
      ctx.lineTo(hx + 12.5, hy - 10);
      ctx.stroke();
    }
    // 嘴
    if (strike || hurt || wind) {
      A.shape(ctx, (c) => { c.moveTo(hx + 4, hy + 4); c.quadraticCurveTo(hx + 10, hy + 3, hx + 14, hy + 2); c.quadraticCurveTo(hx + 10, hy + 9, hx + 4, hy + 4); c.closePath(); }, '#7a2323', null, { lw: 1.8 });
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(hx + 5, hy + 4.5);
      ctx.quadraticCurveTo(hx + 10, hy + 6, hx + 13, hy + 3);
      ctx.stroke();
    }
    // 擦地的火星
    if (wind) {
      for (let i = 0; i < 5; i++) {
        const q = (t * 5 + i * 0.21) % 1;
        const x = hx + 14 - q * 18;
        const y = hy + 8 - Math.sin(q * PI) * 12;
        ctx.globalAlpha = ba * (1 - q);
        sparkle(ctx, x, y, 3 - q * 2, i % 2 ? '#ffe46a' : '#ff9a3a');
      }
      ctx.globalAlpha = ba;
    }
    // 頭頂的火焰（衝刺時往後倒）
    if (lit) {
      const back = fast || (walk && Math.abs(m.vx || 0) > 60) ? -0.45 : Math.sin(t * 3) * 0.05;
      flame(ctx, hx - 1, hy - 13, fast ? 8 : 7, t, 0, back);
    }
    ctx.restore();
    ctx.restore();
    if (lit && fast) speedLines(ctx, -44, -20, 22, 3, 14, t, 'rgba(255,200,120,0.75)');
  }

  // ── 怒氣岩：氣呼呼的大石頭，額頭冒青筋、頭頂冒煙；rage 0..5 越來越紅、青筋越多、煙越濃 ──
  function angerrock(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const rage = clamp(fx.rage || 0, 0, 5);
    const k = rage / 5;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const step = walk ? Math.sin(t * (9 + rage)) : 0;
    const shake = (k > 0.2 ? Math.sin(t * 57) * k * 1.6 : 0) + (wind ? Math.sin(t * 70) * 1.2 : 0);
    const col = [mixq('#b0a090', '#e25a3c', k * 0.85), mixq('#8a7868', '#a8322a', k * 0.85)];
    const crack = mixq('#7a6a5c', '#ffb43a', Math.max(0, (k - 0.5) * 2));
    // 變大由遊戲邏輯的 m.scale 處理（rage × 0.08），這裡不再額外放大
    ctx.save();
    ctx.translate(shake, 0);
    if (strike) ctx.rotate(0.12);
    if (hurt) ctx.rotate(-0.1);
    if (k >= 0.8) glow(ctx, 0, -28, 48, '255,70,40', 0.25 + Math.sin(t * 8) * 0.1);

    // 腳
    A.ellipse(ctx, -11, -4 - Math.max(0, step) * 3, 8.5, 5, col[1], null, { lw: 2.4, hl: false });
    A.ellipse(ctx, 12, -4 - Math.max(0, -step) * 3, 8.5, 5, col[1], null, { lw: 2.4, hl: false });

    // 後面的拳頭
    const fistUp = wind ? -22 : strike ? -2 : Math.sin(t * (4 + rage * 2)) * (1 + k * 2);
    A.ellipse(ctx, -27, -24 + fistUp * 0.6, 7, 6.5, col[1], null, { lw: 2.4, hl: false });

    // 身體：稜角分明的大石塊
    const breathe = 1 + Math.sin(t * (2 + rage)) * (0.015 + k * 0.02);
    ctx.save();
    ctx.translate(0, -4);
    ctx.scale(1 / breathe, breathe);
    const body = (c) => {
      c.moveTo(-25, -2);
      c.lineTo(-28, -24);
      c.lineTo(-20, -42);
      c.lineTo(-6, -50);
      c.lineTo(12, -48);
      c.lineTo(25, -36);
      c.lineTo(28, -16);
      c.lineTo(22, -1);
      c.closePath();
    };
    A.shape(ctx, body, col[0], col[1], { cel: [5, 5], hl: [-13, -38, 5, 3] });
    // 裂紋（越氣越會透出岩漿光）
    ctx.strokeStyle = A.c(crack);
    ctx.lineWidth = 1.8 + k * 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, -42);
    ctx.lineTo(-14, -34);
    ctx.lineTo(-17, -28);
    ctx.moveTo(-28, -24);
    ctx.lineTo(-20, -20);
    ctx.moveTo(22, -8);
    ctx.lineTo(15, -5);
    ctx.lineTo(14, 0);
    if (k > 0.5) {
      ctx.moveTo(12, -48);
      ctx.lineTo(8, -42);
      ctx.lineTo(11, -38);
    }
    ctx.stroke();

    // 臉
    const ey = -27;
    const kind = eyeKind(m);
    const ek = kind === 'normal' || kind === 'closed' ? (k > 0.35 || wind || strike ? 'angry' : kind) : kind;
    faceEyes(ctx, 2, ey, 12, 4 + k * 0.4, 5 - k * 0.7, m, ek);
    if (!m.dead && kind !== 'hurt') {
      // 皺成倒八字的粗眉，越氣越斜
      const tilt = 3 + k * 5;
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, ey - 9 - tilt * 0.3);
      ctx.lineTo(6, ey - 7 + tilt * 0.4);
      ctx.moveTo(10, ey - 7 + tilt * 0.4);
      ctx.lineTo(19, ey - 9 - tilt * 0.3);
      ctx.stroke();
    }
    // 嘴：一開始嘟嘴，生氣後咬牙切齒
    const my = -13;
    if (rage >= 2 || strike || wind) {
      const mw = 8 + k * 3;
      A.shape(ctx, (c) => A.roundRect(c, 8 - mw, my - 4, mw * 2, 8, 3), '#fff6e6', null, { lw: 2.2 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8 - mw + 1, my);
      ctx.lineTo(8 + mw - 1, my);
      for (let i = 1; i < 4; i++) {
        const x = 8 - mw + (i * mw * 2) / 4;
        ctx.moveTo(x, my - 4);
        ctx.lineTo(x, my + 4);
      }
      ctx.stroke();
    } else if (hurt) {
      smallMouth(ctx, 8, my, true, 1.1);
    } else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(8, my + 4, 4.5, 1.2 * PI, 1.8 * PI);
      ctx.stroke();
    }
    ctx.restore();

    // 青筋：rage 越高越多、跳得越快
    const veins = [[17, -45, 6], [-16, -38, 5], [-21, -15, 4.5], [0, -52, 4.5], [23, -8, 4]];
    const nv = Math.min(5, 1 + Math.floor(rage));
    for (let i = 0; i < nv; i++) {
      const v = veins[i];
      const pulse = 1 + Math.max(0, Math.sin(t * (6 + rage * 2) + i * 1.7)) * 0.22;
      angerMark(ctx, v[0], v[1], v[2] * pulse * (1 + k * 0.25), '#ff3b3b');
    }

    // 前面的拳頭
    const fx2 = strike ? 34 : 29;
    const fy = -22 + fistUp;
    A.ellipse(ctx, fx2, fy, 8, 7.5, col[0], col[1], { lw: 2.6, hl: false, cel: [2, 2] });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fx2 + 1, fy - 5);
    ctx.lineTo(fx2 + 1, fy + 1);
    ctx.moveTo(fx2 + 5, fy - 4);
    ctx.lineTo(fx2 + 5, fy + 1);
    ctx.stroke();
    if (strike) {
      ctx.strokeStyle = 'rgba(255,230,200,0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fx2 + 12, fy - 8);
      ctx.lineTo(fx2 + 18, fy - 12);
      ctx.moveTo(fx2 + 13, fy);
      ctx.lineTo(fx2 + 21, fy);
      ctx.moveTo(fx2 + 12, fy + 8);
      ctx.lineTo(fx2 + 18, fy + 12);
      ctx.stroke();
    }

    // 頭頂冒煙：越氣煙越多、越黑
    const ns = 1 + Math.round(rage);
    for (let i = 0; i < ns; i++) {
      const q = (t * (0.7 + k * 0.9) + i / ns) % 1;
      const x = -4 + Math.sin(i * 2.3) * 10 + Math.sin(t * 2 + i) * 3 - q * 4;
      const y = -54 - q * (22 + k * 16);
      puff(ctx, x, y, 2.5 + q * (4 + k * 4), mixq('#ffffff', '#6a5a58', k * 0.65), (1 - q) * (0.7 + k * 0.3));
    }
    ctx.restore();
  }

  // ── 磁鐵犰狳：背甲是一塊紅藍馬蹄形磁鐵（兩端銀色磁極）──
  function magnetdillo(ctx, m) {
    const ba = ctx.globalAlpha;
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const pulling = !!fx.pulling;
    const rolling = !!fx.rolling;
    const skin = ['#dcb6a6', '#b88e7e'];
    const red = ['#ea4a3c', '#b8322c'];
    const blue = ['#3f7ee0', '#2a58b0'];
    const silver = ['#e4e8ee', '#aab2bc'];

    if (rolling) {
      // 縮成一顆紅藍磁鐵球滾過來
      const R = 22;
      ctx.save();
      ctx.translate(0, -R - 1 + Math.abs(Math.sin(t * 12)) * -1.5);
      speedLines(ctx, -R - 4, 0, R * 1.4, 4, 16, t, 'rgba(255,240,220,0.75)');
      ctx.rotate(t * 13);
      const half = (a0, a1, cc) => A.shape(ctx, (c) => { c.moveTo(0, 0); c.arc(0, 0, R, a0, a1); c.closePath(); }, cc[0], cc[1], { noStroke: true, shadeY: R * 0.3 });
      half(-PI / 2, PI / 2, red);
      half(PI / 2, PI * 1.5, blue);
      // 背甲的環節
      ctx.strokeStyle = A.c('#7a2a30');
      ctx.lineWidth = 1.6;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, R * (0.35 + i * 0.25), 0, TAU);
        ctx.stroke();
      }
      // 兩個磁極並在一起（銀色）
      A.shape(ctx, (c) => { c.moveTo(0, 0); c.arc(0, 0, R, PI * 0.38, PI * 0.62); c.closePath(); }, silver[0], silver[1], { noStroke: true });
      ctx.fillStyle = A.c('#ffffff');
      ctx.font = 'bold 11px ' + A.NUMFONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', R * 0.55, -R * 0.2);
      ctx.fillText('S', -R * 0.55, -R * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.lineWidth = 3;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-8, -R - 9, 5, 3, -0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      if (hurt || m.dead) {
        // 露出暈頭的小臉
        faceEyes(ctx, 4, -24, 8, 2.8, 3.4, m);
      }
      return;
    }

    const step = walk ? Math.sin(t * 13) : 0;
    ctx.save();
    if (pulling) ctx.rotate(-0.06 + Math.sin(t * 40) * 0.01);
    if (hurt) ctx.rotate(-0.1);
    if (strike) ctx.translate(3, 0);
    const bob = walk ? Math.abs(step) * -1.2 : Math.sin(t * 2.5) * 0.6;

    // 後腳
    const foot = (x, s, col) => {
      const lift = Math.max(0, s) * 3;
      limb(ctx, (c) => { c.moveTo(x, -12 + bob); c.lineTo(x + s * 2, -3 - lift); }, 7, col);
      A.ellipse(ctx, x + 2 + s * 2, -2.5 - lift, 4.5, 2.5, col, null, { lw: 2, hl: false });
    };
    foot(-14, -step, skin[1]);
    foot(1, step, skin[1]);

    // 尾巴
    A.shape(ctx, (c) => { c.moveTo(-28, -16 + bob); c.quadraticCurveTo(-38, -14, -42, -8 + Math.sin(t * 3) * 2); c.quadraticCurveTo(-36, -9, -27, -9 + bob); c.closePath(); }, skin[0], skin[1], { lw: 2.4, shadeY: -11 });

    // 身體（藏在磁鐵拱門裡面）
    A.ellipse(ctx, -5, -17 + bob, 21, 12, skin[0], skin[1], { cel: [3, 3], hl: false });

    // 馬蹄形磁鐵背甲：外拱 − 內拱
    const cx = -6;
    const cy = -9 + bob;
    const Ro = 27;
    const Ri = 11;
    const ry = 1.25;
    const arch = (c, r0, r1, a0, a1) => {
      c.ellipse(cx, cy, r0, r0 * ry, 0, a0, a1, false);
      c.ellipse(cx, cy, r1, r1 * ry, 0, a1, a0, true);
      c.closePath();
    };
    A.shape(ctx, (c) => arch(c, Ro, Ri, PI, PI * 1.5), blue[0], blue[1], { noStroke: true, cel: [3, 3] });
    A.shape(ctx, (c) => arch(c, Ro, Ri, PI * 1.5, TAU), red[0], red[1], { noStroke: true, cel: [3, 3] });
    // 犰狳的環節
    ctx.strokeStyle = A.c('#5a1e2a');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    [PI * 1.2, PI * 1.35, PI * 1.65, PI * 1.8].forEach((a) => {
      ctx.moveTo(cx + Math.cos(a) * Ri, cy + Math.sin(a) * Ri * ry);
      ctx.lineTo(cx + Math.cos(a) * Ro, cy + Math.sin(a) * Ro * ry);
    });
    ctx.stroke();
    // 兩端的銀色磁極
    const tipH = 9;
    const tip = (x0, x1) => A.shape(ctx, (c) => A.roundRect(c, x0, cy - tipH, x1 - x0, tipH + 2, 2), silver[0], silver[1], { lw: 2.4, shadeY: cy - 2 });
    tip(cx - Ro, cx - Ri);
    tip(cx + Ri, cx + Ro);
    ctx.beginPath();
    arch(ctx, Ro, Ri, PI, TAU);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - 14, cy - 27, 5, 2.5, -0.7, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = A.c('#ffffff');
    ctx.font = 'bold 10px ' + A.NUMFONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', cx - 18, cy - 18);
    ctx.fillText('N', cx + 18, cy - 18);
    // 磁極發光
    const pg = pulling ? 0.7 + Math.sin(t * 14) * 0.2 : wind ? 0.5 : 0;
    if (pg > 0) {
      glow(ctx, cx + (Ro + Ri) / 2, cy - 3, 18, '140,200,255', pg);
      glow(ctx, cx - (Ro + Ri) / 2, cy - 3, 14, '255,140,140', pg * 0.7);
    }

    // 前腳
    foot(-9, step, skin[0]);
    foot(5, -step, skin[0]);

    // 頭：尖尖長吻、大耳朵
    const hx = 25;
    const hy = -16 + bob + (wind ? 2 : 0);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(hurt ? -0.25 : pulling ? -0.05 : Math.sin(t * 2) * 0.04);
    A.shape(ctx, (c) => { c.moveTo(-6, -6); c.quadraticCurveTo(-8, -20, -1, -19); c.quadraticCurveTo(3, -12, 2, -5); c.closePath(); }, skin[0], '#e89a9a', { lw: 2.4, shadeY: -12 });
    A.shape(ctx, (c) => {
      c.moveTo(-8, -6);
      c.bezierCurveTo(-6, -14, 6, -12, 12, -5);
      c.quadraticCurveTo(18, 0, 19, 3);
      c.quadraticCurveTo(10, 7, -2, 6);
      c.quadraticCurveTo(-10, 4, -8, -6);
      c.closePath();
    }, skin[0], skin[1], { cel: [2, 2], hl: [-2, -8, 3, 1.5] });
    A.ellipse(ctx, 19, 2.5, 2.4, 2.2, '#6a3a3a', null, { lw: 1.5, hl: false });
    const kind = eyeKind(m);
    A.eye(ctx, 3, -3, 2.8, 3.4, pulling && kind === 'normal' ? 'angry' : kind, 0.8);
    if (hurt || strike) smallMouth(ctx, 10, 4, true, 0.7);
    A.blush(ctx, 1, 2, 2.6);
    ctx.restore();
    ctx.restore();

    // 磁力線：從前面的 N 極往前方一圈圈往內收（吸過來）
    if (pulling) {
      const px = cx + (Ro + Ri) / 2 + 6;
      const py = cy - 4;
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const q = 1 - ((t * 1.3 + i / 4) % 1);
        const R = 12 + q * 70;
        ctx.globalAlpha = ba * Math.min(1, (1 - q) * 3) * Math.min(1, q * 1.5) * 0.9;
        ctx.strokeStyle = i % 2 ? '#ff8a80' : '#8ac4ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(px, py, R, R * 0.7, 0, -0.75, 0.75);
        ctx.stroke();
      }
      // 往回吸的小箭頭
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.4 + i / 3) % 1;
        const x = px + 74 - q * 56;
        const y = py + (i - 1) * 13;
        ctx.globalAlpha = ba * Math.sin(q * PI);
        ctx.beginPath();
        ctx.moveTo(x + 5, y - 4);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 5, y + 4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ── 燭台蛇：黃銅色的蛇身盤成燭台底座，三條脖子像三支蠟燭，頭頂有燭芯與火苗 ──
  function candlesnake(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const nFl = Math.round(clamp(fx.flames == null ? 3 : fx.flames, 0, 3));
    const brass = ['#eab84e', '#b8862e'];
    const wax = ['#fff4dc', '#e6cfa6'];
    const slide = walk ? Math.sin(t * 8) : 0;

    ctx.save();
    if (hurt) ctx.rotate(-0.06);
    // 尾巴尖從盤底後方翹出來
    limb(ctx, (c) => { c.moveTo(-22, -7); c.quadraticCurveTo(-34, -6, -36 + slide, -16 + Math.sin(t * 3) * 2); }, 7, brass[0]);
    // 盤繞的底座（兩圈）
    const coil = (y, rx, ry) => {
      A.ellipse(ctx, 0, y, rx, ry, brass[0], brass[1], { cel: [3, 3], hl: [-rx * 0.4, y - ry * 0.4, rx * 0.2, ry * 0.25] });
      ctx.strokeStyle = A.c('#9a6a1e');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const x = i * rx * 0.33 + slide * 1.5;
        ctx.moveTo(x - 2, y - ry * 0.7);
        ctx.lineTo(x + 2, y);
        ctx.lineTo(x - 2, y + ry * 0.7);
      }
      ctx.stroke();
    };
    coil(-7, 30, 7.5);
    coil(-17, 23, 6.5);
    // 中柱
    A.shape(ctx, (c) => A.roundRect(c, -7, -34, 14, 18, 5), brass[0], brass[1], { cel: [2, 2], hl: [-3, -31, 1.5, 3] });
    A.ellipse(ctx, 0, -25, 9, 3.2, '#f6d070', brass[1], { lw: 2.2, hl: false });

    // 三條脖子（燭台的三支手臂）
    const sway = (i) => Math.sin(t * 2 + i * 1.9) * 2;
    let lunge = 0;
    if (wind) lunge = -5;
    if (strike) lunge = 7;
    const heads = [
      { bx: -3, by: -31, x: -23 + sway(0) + lunge * 0.6, y: -38, s: 0.9 },
      { bx: 3, by: -31, x: 23 + sway(2) + lunge, y: -38, s: 0.9 },
      { bx: 0, by: -33, x: 1 + sway(1) + lunge * 0.8, y: -50, s: 1 },
    ];
    heads.forEach((h, i) => {
      limb(ctx, (c) => {
        c.moveTo(h.bx, h.by);
        if (i < 2) c.bezierCurveTo(h.bx + (h.x - h.bx) * 0.9, h.by + 6, h.x, h.by, h.x, h.y + 4);
        else c.quadraticCurveTo(h.bx - 2, h.by - 8, h.x, h.y + 4);
      }, 9, brass[0]);
      // 蛇腹的淺色橫紋
      ctx.strokeStyle = A.c('#fff0b0');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(h.x - 2.5, h.y + 8);
      ctx.lineTo(h.x + 2.5, h.y + 8);
      ctx.stroke();
      // 接蠟盤
      A.ellipse(ctx, h.x, h.y + 4, 8.5 * h.s, 2.8, '#f6d070', brass[1], { lw: 2.2, hl: false });
    });
    // 頭：蠟燭做的蛇頭（後腦是平直的燭身、頭頂平平的燭面，前面是圓圓的蛇吻）
    const order = [2, 1, 0]; // 中間先亮，再右、再左
    heads.forEach((h, i) => {
      const litHere = order.indexOf(i) < nFl;
      const s = h.s;
      ctx.save();
      ctx.translate(h.x, h.y + 3);
      ctx.scale(s, s);
      ctx.rotate(strike ? 0.18 : wind ? -0.2 : Math.sin(t * 2.2 + i) * 0.05);
      const open = strike || hurt;
      const head = (c) => {
        c.moveTo(-7, 0);
        c.lineTo(-7, -14);
        c.quadraticCurveTo(-7, -17, -4, -17);
        c.lineTo(3, -17);
        c.bezierCurveTo(9, -17, 14, -12, 14, -7);
        c.quadraticCurveTo(14, open ? -5 : -2, 9, open ? -4 : -1);
        c.lineTo(4, open ? -3 : 0);
        c.closePath();
      };
      A.shape(ctx, head, wax[0], wax[1], { cel: [2.5, 2], hl: [-3, -13, 1.6, 2.6] });
      if (open) {
        // 下顎張開
        A.shape(ctx, (c) => { c.moveTo(-5, 0); c.lineTo(4, -2); c.quadraticCurveTo(10, -1, 12, 3); c.quadraticCurveTo(4, 5, -5, 2); c.closePath(); }, wax[1], null, { lw: 2 });
        ctx.fillStyle = A.c('#9a2a2a');
        ctx.beginPath();
        ctx.moveTo(4, -2.5);
        ctx.lineTo(12, -4);
        ctx.lineTo(11, 1.5);
        ctx.closePath();
        ctx.fill();
      }
      // 頭頂融化的蠟往下滴
      const drip = (c) => {
        c.moveTo(-7.5, -13);
        c.lineTo(-7.5, -17.5);
        c.lineTo(5, -17.5);
        c.quadraticCurveTo(7, -17, 8, -15.5);
        c.quadraticCurveTo(6, -13, 4, -14);
        c.lineTo(3, -10);
        c.arc(1.5, -10, 1.5, 0, PI);
        c.lineTo(0, -14);
        c.quadraticCurveTo(-3, -14.5, -4, -13);
        c.lineTo(-4, -7 - (i % 2) * 2);
        c.arc(-5.75, -7 - (i % 2) * 2, 1.75, 0, PI);
        c.closePath();
      };
      A.shape(ctx, drip, '#ffffff', null, { noStroke: true });
      ctx.beginPath();
      drip(ctx);
      ctx.strokeStyle = A.c('#e0c498');
      ctx.lineWidth = 1.3;
      ctx.stroke();
      // 眼睛（一隻大眼，側臉）＋鼻孔
      const kind = eyeKind(m);
      const ek = (strike || wind) && kind === 'normal' ? 'angry' : kind;
      A.eye(ctx, 6, -9.5, 2.6, 3.2, ek, 0.6);
      ctx.fillStyle = A.c('#8a6a4a');
      ctx.beginPath();
      ctx.arc(12, -9, 0.9, 0, TAU);
      ctx.fill();
      if (!open && !m.dead && Math.sin(t * 1.6 + i * 2.1) > 0.8) {
        // 吐信
        ctx.strokeStyle = A.c('#e8453a');
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(12, -1.5);
        ctx.lineTo(17, -1);
        ctx.lineTo(20, -3);
        ctx.moveTo(17, -1);
        ctx.lineTo(20, 1);
        ctx.stroke();
      }
      A.blush(ctx, 4, -4, 1.8);
      // 燭芯
      ctx.strokeStyle = A.c('#3a2a22');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -17.5);
      ctx.quadraticCurveTo(1, -20, 0, -22);
      ctx.stroke();
      if (litHere) {
        const big = wind ? 1.35 : strike ? 1.5 : 1;
        flame(ctx, 0, -23, 4.5 * big, t, i * 2, strike ? 0.25 : wind ? -0.15 : 0);
      } else {
        // 熄掉的燭芯冒一縷白煙
        ctx.strokeStyle = 'rgba(240,240,240,0.6)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let j = 0; j <= 8; j++) {
          const yy = -23 - j * 2.5;
          const xx = Math.sin(t * 3 + j * 0.8 + i) * 2.2 * (j / 8);
          j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  // ── 秤砣甲蟲：綠色甲蟲扛著一顆寫著「千斤」的鐵秤砣 ──
  function weightbeetle(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const jump = !!fx.jump || m.onGround === false;
    const shell = ['#3aa878', '#227a56'];
    const legC = '#3a2e2a';
    const iron = ['#646c78', '#434a55'];
    const step = walk ? Math.sin(t * 12) : 0;
    let sq = 1;
    if (wind) sq = 0.84;
    if (strike) sq = 0.8;
    if (jump) sq = 1.1;
    ctx.save();
    ctx.scale(1 / Math.sqrt(sq), sq);
    const lift = jump ? 6 : 0;
    const by = -17 - lift + (walk ? Math.abs(step) * -1 : 0);

    // 腳（三對，後面三隻較暗）
    const legs = (front, col) => {
      for (let i = 0; i < 3; i++) {
        const dx = i - 1; // -1 後腳、0 中腳、1 前腳
        const x0 = -8 + i * 11 + (front ? 2 : -3);
        const ph2 = step * (i % 2 ? 1 : -1) * (front ? 1 : -1);
        const bend = wind || strike ? 3 : 0;
        const knee = [x0 + dx * 12 + (dx === 0 ? (front ? 4 : -4) : 0), by + 7 + bend];
        const footP = jump
          ? [x0 + dx * 20 + (dx === 0 ? (front ? 8 : -8) : 0), by + 15]
          : [x0 + dx * 17 + (dx === 0 ? (front ? 6 : -6) : 0) + ph2 * 3, -1 - Math.max(0, ph2) * 3];
        limb(ctx, (c) => { c.moveTo(x0, by + 5); c.lineTo(knee[0], knee[1]); c.lineTo(footP[0], footP[1]); }, 5, col);
        // 小爪
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(footP[0], footP[1]);
        ctx.lineTo(footP[0] + (dx >= 0 ? 3 : -3), footP[1] + 1);
        ctx.stroke();
      }
    };
    legs(false, '#231a18');

    // 甲蟲身體
    const bx = -2;
    A.ellipse(ctx, bx, by, 30, 14, shell[0], shell[1], { cel: [4, 4], hl: false });
    ctx.strokeStyle = A.c('#1a5a40');
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(bx + 20, by - 11);
    ctx.quadraticCurveTo(bx, by - 6, bx - 28, by - 2);
    ctx.stroke();
    // 甲殼的光澤
    ctx.save();
    ctx.globalAlpha *= 0.6;
    ctx.fillStyle = A.c('#9af0c8');
    ctx.beginPath();
    ctx.ellipse(bx - 14, by - 1, 7, 2.5, 0.1, 0, TAU);
    ctx.fill();
    ctx.restore();

    legs(true, legC);

    // 頭與角
    const hx = 30;
    const hy = by - 1 + (wind ? 3 : 0);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(hurt ? -0.2 : strike ? 0.15 : Math.sin(t * 2) * 0.03);
    // 觸角
    limb(ctx, (c) => { c.moveTo(3, -7); c.quadraticCurveTo(8, -18, 15, -17 + Math.sin(t * 4) * 1.5); }, 3.5, legC);
    A.shape(ctx, (c) => { c.moveTo(4, -6); c.quadraticCurveTo(14, -10, 17, -24); c.quadraticCurveTo(20, -8, 10, 0); c.closePath(); }, '#2e4a3e', '#1e3028', { lw: 2.4, shadeY: -8 });
    A.ellipse(ctx, 0, 0, 11, 9, '#2e4a3e', '#1e3028', { cel: [2, 2], hl: [-3, -4, 2.5, 1.5] });
    // 白底眼睛（深色頭上）
    const kind = eyeKind(m);
    [[1, -1.5, 3.4], [7, -2, 3]].forEach(([x, y, r]) => {
      A.ellipse(ctx, x, y, r, r * 1.15, '#ffffff', null, { lw: 1.8, hl: false });
      if (kind === 'x') A.eye(ctx, x, y, 1.8, 1.8, 'x');
      else if (kind === 'closed') A.eye(ctx, x, y + 1, 2, 1.5, 'closed');
      else if (kind === 'hurt') A.eye(ctx, x, y, 1.6, 2, 'hurt');
      else A.eye(ctx, x + 0.7, y + 0.5, 1.8, 2.4, 'normal', 0);
    });
    if (!m.dead && kind !== 'hurt') {
      // 用力的眉毛
      ctx.strokeStyle = A.c('#9af0c8');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2, -7);
      ctx.lineTo(4, -5.5);
      ctx.moveTo(6, -6);
      ctx.lineTo(10, -7.5);
      ctx.stroke();
    }
    ctx.restore();

    // 秤砣（落後一點點跟著晃）
    const lag = walk ? Math.sin(t * 12 - 0.8) * 1.5 : jump ? 3 : 0;
    const wx = -4;
    const wy = by - 11 + lag;
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(walk ? Math.sin(t * 6) * 0.04 : hurt ? -0.1 : 0);
    // 掛環
    ctx.lineWidth = 6;
    ctx.strokeStyle = A.outline();
    ctx.beginPath();
    ctx.arc(0, -36, 6, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = A.c('#8a929c');
    ctx.stroke();
    A.shape(ctx, (c) => A.roundRect(c, -6, -32, 12, 6, 2), iron[0], iron[1], { lw: 2.4, shadeY: -29 });
    // 秤砣本體：上窄下寬的鐘形
    const wt = (c) => {
      c.moveTo(-10, -27);
      c.lineTo(10, -27);
      c.bezierCurveTo(14, -24, 13, -18, 17, -10);
      c.bezierCurveTo(21, -3, 20, 1, 16, 2);
      c.lineTo(-16, 2);
      c.bezierCurveTo(-20, 1, -21, -3, -17, -10);
      c.bezierCurveTo(-13, -18, -14, -24, -10, -27);
      c.closePath();
    };
    A.shape(ctx, wt, iron[0], iron[1], { cel: [4, 3], hl: [-9, -20, 2.5, 5] });
    A.shape(ctx, (c) => A.roundRect(c, -18, -2, 36, 6, 3), '#555c68', null, { lw: 2.4 });
    ctx.fillStyle = A.c('#f2c440');
    ctx.font = 'bold 10px ' + A.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('千斤', 0, -12);
    ctx.restore();

    // 汗滴（扛得好吃力）
    if (walk || wind) {
      const q = (t * 1.5) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - q;
      A.shape(ctx, (c) => {
        const x = 40;
        const y = by - 18 + q * 8;
        c.moveTo(x, y - 5);
        c.quadraticCurveTo(x + 3.5, y, x, y + 2.5);
        c.quadraticCurveTo(x - 3.5, y, x, y - 5);
        c.closePath();
      }, '#bfe8ff', null, { lw: 1.5 });
      ctx.restore();
    }
    ctx.restore();

    // 落地的衝擊
    if (strike) {
      ctx.strokeStyle = 'rgba(255,240,210,0.9)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let s = -1; s <= 1; s += 2) {
        ctx.moveTo(s * 34, -4);
        ctx.lineTo(s * 46, -12);
        ctx.moveTo(s * 36, -1);
        ctx.lineTo(s * 50, -2);
      }
      ctx.stroke();
      puff(ctx, -38, -4, 6, '#e8c8a0', 0.8);
      puff(ctx, 38, -4, 6, '#e8c8a0', 0.8);
    }
  }

  // ── 風箱蝙蝠：紫色毛球蝙蝠，翅膀是兩片打鐵用的木頭風箱，鼻子是黃銅噴嘴 ──
  function bellowsbat(ctx, m) {
    const ba = ctx.globalAlpha;
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const blow = clamp(fx.blow || (strike ? 1 : 0), 0, 1);
    const fur = ['#7a5c9e', '#58407a'];
    const woodC = ['#cf8e4e', '#a0662e'];
    const leather = '#a8603a';
    const flap = Math.sin(t * 9);
    const by = -30 + Math.sin(t * 9 + 1) * 2.5;
    ctx.save();
    if (hurt) ctx.rotate(-0.15);

    // 風箱翅膀：正面看到一片淚滴形木板（鉚釘、把手），下面露出一圈打摺的皮革；
    // 皮革露得越多代表風箱張得越開，吹風時整個壓扁。
    const wing = (side, back) => {
      let open = 0.45 + (flap * 0.5 + 0.5) * 0.55;
      if (wind) open = 1.2;
      open = open * (1 - blow) + 0.05 * blow;
      const L = 31;
      const W = 11;
      ctx.save();
      ctx.translate(side * 8, by - 7);
      ctx.scale(side, 1);
      ctx.rotate(-0.75 + flap * 0.45 + (back ? -0.2 : 0));
      if (back) ctx.scale(0.88, 0.88);
      const tear = (c, dy) => {
        c.moveTo(1, dy - 2);
        c.bezierCurveTo(L * 0.35, dy - W * 0.9, L * 1.08, dy - W * 1.35, L, dy);
        c.bezierCurveTo(L * 1.08, dy + W * 1.35, L * 0.35, dy + W * 0.9, 1, dy + 2);
        c.closePath();
      };
      const gap = 1.5 + open * 7;
      // 皮革（打摺）
      const lpath = (c) => tear(c, gap);
      A.shape(ctx, lpath, back ? '#6a3a26' : leather, null, { lw: 2.2 });
      ctx.save();
      ctx.beginPath();
      lpath(ctx);
      ctx.clip();
      ctx.strokeStyle = A.c(back ? '#4e2a1c' : '#6a3420');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 1; i < 9; i++) {
        const a = -1.2 + i * 0.3;
        ctx.moveTo(2, gap);
        ctx.lineTo(2 + Math.cos(a) * L * 1.3, gap + Math.sin(a) * L * 1.3);
      }
      ctx.stroke();
      ctx.restore();
      // 木板
      A.shape(ctx, (c) => tear(c, 0), back ? woodC[1] : woodC[0], woodC[1], { cel: [1.5, 2], hl: back ? null : [L * 0.55, -4, 4, 1.6] });
      // 木紋與鉚釘
      ctx.strokeStyle = A.c('#a8703a');
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(L * 0.3, 1);
      ctx.quadraticCurveTo(L * 0.6, 3, L * 0.85, 1);
      ctx.stroke();
      ctx.fillStyle = A.c('#5a3a22');
      ctx.beginPath();
      [[0.25, 0], [0.55, -4.5], [0.55, 4.5], [0.85, 0]].forEach(([q, y]) => { ctx.moveTo(L * q + 1.3, y); ctx.arc(L * q, y, 1.3, 0, TAU); });
      ctx.fill();
      // 把手
      A.shape(ctx, (c) => A.roundRect(c, L - 1, -2.5, 9, 5, 2.5), '#e0b060', '#b8862e', { lw: 1.8, shadeY: 1 });
      ctx.restore();
    };
    wing(-1, true);
    wing(1, false);

    // 小腳爪
    limb(ctx, (c) => { c.moveTo(-4, by + 12); c.lineTo(-5, by + 19); c.moveTo(4, by + 12); c.lineTo(5, by + 19); }, 4, '#4a3460');

    // 身體（毛茸茸）
    const puffC = 1 + blow * 0.12;
    const fluff = (c) => {
      const n = 12;
      const R = 15;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU;
        const a1 = ((i + 1) / n) * TAU;
        const am = (a0 + a1) / 2;
        if (!i) c.moveTo(Math.cos(a0) * R, by + Math.sin(a0) * R * 0.95);
        c.quadraticCurveTo(Math.cos(am) * R * 1.13, by + Math.sin(am) * R * 1.08, Math.cos(a1) * R, by + Math.sin(a1) * R * 0.95);
      }
      c.closePath();
    };
    // 耳朵
    const ear = (x, s) => A.shape(ctx, (c) => { c.moveTo(x - 5, by - 11); c.lineTo(x + s * 2, by - 27 + (blow > 0.5 ? 3 : 0)); c.lineTo(x + 6, by - 10); c.closePath(); }, fur[0], fur[1], { lw: 2.4, shadeY: by - 16 });
    ear(-7, -1);
    ear(6, 1);
    A.shape(ctx, fluff, fur[0], fur[1], { cel: [3, 3], hl: [-6, by - 8, 3.5, 2] });
    A.ellipse(ctx, 1, by + 5, 8, 6, '#b69ad0', null, { noStroke: true, hl: false });

    // 臉：鼓起的腮幫子、黃銅噴嘴鼻子
    const fxX = 5;
    const fy = by - 3;
    const kind = eyeKind(m);
    const ek = (blow > 0.5 || wind) && kind === 'normal' ? 'angry' : kind;
    faceEyes(ctx, fxX - 3, fy - 3, 9, 3, 3.8, m, ek);
    if (blow > 0.2) {
      A.ellipse(ctx, fxX - 5, fy + 5, 4.5 * puffC, 3.8 * puffC, '#9a7ec0', null, { lw: 2, hl: false });
      A.ellipse(ctx, fxX + 9, fy + 5, 4 * puffC, 3.5 * puffC, '#9a7ec0', null, { lw: 2, hl: false });
    } else {
      A.blush(ctx, fxX - 5, fy + 4, 2.6);
      // 小尖牙
      ctx.fillStyle = A.c('#ffffff');
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(fxX + 1, fy + 7);
      ctx.lineTo(fxX + 2.5, fy + 10);
      ctx.lineTo(fxX + 4, fy + 7);
      ctx.fill();
      ctx.stroke();
    }
    // 噴嘴（黃銅管，鼻子）
    const nl = 9 + blow * 2;
    A.shape(ctx, (c) => A.roundRect(c, fxX + 7, fy + 0.5, nl, 4.5, 1.5), '#f0c050', '#c8962a', { lw: 2, shadeY: fy + 3.5 });
    A.shape(ctx, (c) => A.roundRect(c, fxX + 5, fy - 1.5, 4, 8.5, 1.5), '#d8a040', null, { lw: 1.8 });
    A.shape(ctx, (c) => A.roundRect(c, fxX + 6 + nl, fy - 0.5, 3, 6.5, 1), '#d8a040', null, { lw: 1.6 });
    // 吹出的風
    if (blow > 0.05) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const q = (t * 3 + i / 4) % 1;
        const x = fxX + 18 + q * 44 * (0.5 + blow);
        const y = fy + 3 + (i - 1.5) * 5 * (0.4 + q);
        ctx.globalAlpha = ba * (1 - q) * blow;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 10 + blow * 8, y);
        ctx.stroke();
      }
      ctx.globalAlpha = ba;
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 陶甕山羊：身體是一個橫躺的陶甕（彩繪紋、裂痕），山羊頭從甕口鑽出來 ──
  function potgoat(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const charge = !!fx.charge || strike;
    const clay = ['#e8b47a', '#c08650'];
    const glaze = ['#9a4a2c', '#74321e'];
    const goat = ['#f7f0e2', '#d8ccb4'];
    const horn = ['#9a8672', '#6e5c4a'];
    const run = charge && walk;
    const step = walk ? Math.sin(t * (run ? 20 : 11)) : 0;
    ctx.save();
    if (charge) ctx.rotate(0.06);
    if (wind) ctx.rotate(-0.07);
    if (hurt) ctx.rotate(-0.1);
    const bob = walk ? -Math.abs(step) * 2 : Math.sin(t * 2.4) * 0.6;
    const cy = -32 + bob;

    // 腳
    const leg = (x, s, col) => {
      const lift = Math.max(0, s) * 4;
      limb(ctx, (c) => { c.moveTo(x, cy + 10); c.lineTo(x + s * 3, -5 - lift); }, 6.5, col);
      A.shape(ctx, (c) => A.roundRect(c, x + s * 3 - 3.5, -6 - lift, 7, 6, 2), '#4a3a30', null, { lw: 2 });
    };
    leg(-16, -step, goat[1]);
    leg(10, step, goat[1]);
    if (wind) dust(ctx, 14, 0, t, 1);

    // 尾巴（甕底的一撮毛）
    A.shape(ctx, (c) => { c.moveTo(-30, cy - 6); c.quadraticCurveTo(-41, cy - 14 + Math.sin(t * 6) * 2, -37, cy - 1); c.closePath(); }, goat[0], goat[1], { lw: 2.2, shadeY: cy - 6 });

    // 甕身（橫躺；上半部上了深色釉，下半部是素燒陶）
    const jar = (c) => {
      c.moveTo(-30, cy - 8);
      c.bezierCurveTo(-32, cy - 23, -12, cy - 24, 6, cy - 21);
      c.bezierCurveTo(24, cy - 19, 30, cy - 10, 30, cy);
      c.bezierCurveTo(30, cy + 12, 20, cy + 18, 0, cy + 18);
      c.bezierCurveTo(-18, cy + 18, -32, cy + 12, -30, cy - 8);
      c.closePath();
    };
    A.shape(ctx, jar, clay[0], clay[1], { cel: [4, 4], noStroke: true });
    ctx.save();
    ctx.beginPath();
    jar(ctx);
    ctx.clip();
    // 釉（下緣有流下來的釉滴）
    A.shape(ctx, (c) => {
      c.moveTo(-40, cy - 40);
      c.lineTo(40, cy - 40);
      c.lineTo(40, cy + 6);
      for (let i = 0; i <= 8; i++) {
        const x = 34 - i * 9;
        c.quadraticCurveTo(x - 2, cy + 6 + (i % 2 ? 7 : 1), x - 4.5, cy + 6);
      }
      c.lineTo(-40, cy + 6);
      c.closePath();
    }, glaze[0], glaze[1], { cel: [4, 4], noStroke: true });
    // 彩繪紋帶（米白鋸齒與圓點）
    ctx.strokeStyle = A.c('#f6e2b8');
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const x = -34 + i * 5;
      const y = cy - 6 + (i % 2 ? 5 : 0);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = A.c('#f6e2b8');
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(-22 + i * 9, cy - 13, 1.5, 0, TAU);
      ctx.fill();
    }
    // 釉的反光
    ctx.globalAlpha *= 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-14, cy - 17, 8, 2.5, -0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    jar(ctx);
    ctx.lineWidth = 3;
    ctx.strokeStyle = A.outline();
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 甕底的圓
    ctx.strokeStyle = A.c('#8a4224');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(-27, cy + 2, 4, 13, 0, -PI / 2, PI / 2);
    ctx.stroke();
    // 裂痕（受傷時多一條）
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, cy - 21);
    ctx.lineTo(-7, cy - 14);
    ctx.lineTo(-3, cy - 10);
    ctx.lineTo(-6, cy - 3);
    ctx.moveTo(-7, cy - 14);
    ctx.lineTo(-12, cy - 12);
    ctx.moveTo(18, cy + 15);
    ctx.lineTo(14, cy + 10);
    ctx.lineTo(16, cy + 7);
    if (hurt || m.dead) {
      ctx.moveTo(10, cy - 20);
      ctx.lineTo(12, cy - 13);
      ctx.lineTo(8, cy - 9);
      ctx.lineTo(11, cy - 3);
    }
    ctx.stroke();

    leg(-10, step, goat[0]);
    leg(16, -step, goat[0]);

    // 山羊頭的位置：平常抬頭、衝撞時低頭把角對準前方、蓄力時往後仰
    let hx = 30;
    let hy = cy - 30;
    let hr = Math.sin(t * 2) * 0.04;
    if (charge) { hx = 38; hy = cy - 14; hr = 0.75; }
    if (wind) { hx = 26; hy = cy - 33; hr = -0.35; }
    if (hurt) { hx = 26; hy = cy - 30; hr = -0.4; }
    // 甕口：一圈外翻的口緣，脖子從裡面伸出來
    const mx = 19;
    const my = cy - 17;
    const mr = charge ? -0.35 : -0.75;
    const lip = (c) => c.ellipse(mx, my, 9, 4.5, mr, 0, TAU);
    A.shape(ctx, (c) => {
      c.moveTo(mx - 9, my + 8);
      c.lineTo(mx - 7, my);
      c.lineTo(mx + 7, my - 2);
      c.lineTo(mx + 10, my + 6);
      c.closePath();
    }, glaze[0], glaze[1], { lw: 2.4, shadeY: my + 3 });
    A.shape(ctx, lip, '#b85a36', null, { lw: 2.6 });
    ctx.fillStyle = A.c('#3a1a10');
    ctx.beginPath();
    ctx.ellipse(mx, my, 6, 2.6, mr, 0, TAU);
    ctx.fill();
    // 脖子
    limb(ctx, (c) => { c.moveTo(mx, my); c.lineTo(hx - 3, hy + 4); }, 13, goat[0]);
    // 口緣前半圈蓋在脖子上
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(mr);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 4.5, 0, 0.05 * PI, 0.95 * PI);
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = A.outline();
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = A.c('#c8683e');
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(hr);
    // 後耳
    A.ellipse(ctx, -8, 2, 7, 3.2, goat[1], null, { rot: 0.5, lw: 2.2, hl: false });
    const hornP = (c) => {
      c.moveTo(-3, -6);
      c.bezierCurveTo(-10, -19, -24, -15, -21, -3);
      c.bezierCurveTo(-19, 3, -12, 2, -13, -4);
      c.bezierCurveTo(-14, -9, -8, -10, 3, -2);
      c.closePath();
    };
    A.shape(ctx, hornP, horn[1], null, { lw: 2.4 });
    // 臉（長臉，吻部朝右下）
    const face = (c) => {
      c.moveTo(-8, -4);
      c.bezierCurveTo(-8, -13, 6, -14, 10, -5);
      c.bezierCurveTo(14, 2, 18, 6, 16, 10);
      c.bezierCurveTo(13, 14, 4, 13, -2, 8);
      c.bezierCurveTo(-7, 5, -8, 1, -8, -4);
      c.closePath();
    };
    A.shape(ctx, face, goat[0], goat[1], { cel: [2.5, 2.5], hl: [-2, -8, 3, 1.6] });
    // 鬍子
    A.shape(ctx, (c) => { c.moveTo(6, 11); c.quadraticCurveTo(7, 20, 4 + Math.sin(t * 3) * 1.5, 22); c.quadraticCurveTo(2, 16, 1, 10); c.closePath(); }, goat[0], goat[1], { lw: 2, shadeY: 16 });
    A.ellipse(ctx, 15, 7, 2.6, 2, '#e8a0a0', null, { lw: 1.5, hl: false });
    // 前耳
    A.ellipse(ctx, -5, 0, 7.5, 3.4, goat[0], null, { rot: 0.6, lw: 2.2, hl: false });
    A.ellipse(ctx, -5, 0, 4.5, 1.6, '#f0b8b0', null, { rot: 0.6, noStroke: true, hl: false });
    // 前角（有節紋）
    ctx.save();
    ctx.translate(3, -1);
    A.shape(ctx, hornP, horn[0], horn[1], { lw: 2.4, shadeY: -6 });
    ctx.strokeStyle = A.c(horn[1]);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-8, -13);
    ctx.lineTo(-6, -8);
    ctx.moveTo(-14, -13);
    ctx.lineTo(-13, -8);
    ctx.moveTo(-19, -9);
    ctx.lineTo(-15, -7);
    ctx.stroke();
    ctx.restore();
    // 山羊的橫長瞳孔
    const kind = eyeKind(m);
    const ex = 4;
    const ey = -3;
    if (kind === 'x' || kind === 'hurt' || kind === 'closed') {
      A.eye(ctx, ex, ey, 2.4, 2.8, kind);
    } else {
      A.ellipse(ctx, ex, ey, 4.2, 4.4, '#fff3c8', null, { lw: 1.8, hl: false });
      ctx.fillStyle = A.c('#2b1a12');
      ctx.beginPath();
      A.roundRect(ctx, ex - 2.2, ey - 1.2, 5.6, 2.4, 1);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 1.2, ey - 2.4, 1, 0, TAU);
      ctx.fill();
      if (charge || wind || kind === 'angry') {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - 5, ey - 7.5);
        ctx.lineTo(ex + 5, ey - 4.5);
        ctx.stroke();
      }
    }
    if (hurt || strike) smallMouth(ctx, 10, 11, true, 0.7);
    else {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(9, 10.5);
      ctx.quadraticCurveTo(12, 12, 15, 10);
      ctx.stroke();
    }
    A.blush(ctx, 1, 4, 2.6);
    ctx.restore();

    if (charge) {
      speedLines(ctx, -34, cy, 30, 4, 18, t, 'rgba(255,240,220,0.8)');
      dust(ctx, -26, 0, t, 1.2);
    }
    ctx.restore();
  }

  // ── 心情變色龍：整隻的顏色、姿勢、表情跟著心情變（紅＝生氣、藍＝難過、黃＝開心）──
  const MOODS = {
    red: { body: '#ec5236', shade: '#b83426', belly: '#ffb488', crest: '#ffcf4a' },
    blue: { body: '#4a88dc', shade: '#2f5ea8', belly: '#b0d4ff', crest: '#8ab8f0' },
    yellow: { body: '#f7c93a', shade: '#d49c1e', belly: '#fff2a8', crest: '#ff9ac0' },
    green: { body: '#6cc05a', shade: '#4a9440', belly: '#dcf2a8', crest: '#a8e070' },
  };
  function moodchameleon(ctx, m) {
    const ba = ctx.globalAlpha;
    const fx = m.fx || {};
    const t = m.t || 0;
    const mood = MOODS[fx.mood] ? fx.mood : 'green';
    const P = MOODS[mood];
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const red = mood === 'red';
    const blue = mood === 'blue';
    const yellow = mood === 'yellow';
    const step = walk ? Math.sin(t * (red ? 16 : blue ? 7 : 11)) : 0;
    ctx.save();
    // 姿勢
    let hop = 0;
    if (yellow) hop = Math.abs(Math.sin(t * 6)) * 5;
    if (red) ctx.translate(Math.sin(t * 45) * 0.8, 0);
    ctx.translate(0, -hop);
    if (red) ctx.rotate(0.06 + (strike ? 0.08 : 0));
    if (blue) ctx.rotate(0.05);
    if (hurt) ctx.rotate(-0.12);
    if (red) glow(ctx, 4, -26, 44, '255,90,50', 0.22 + Math.sin(t * 10) * 0.08);
    if (yellow) glow(ctx, 0, -26, 46, '255,230,120', 0.3);
    const by = (blue ? -15 : -19) + (walk ? -Math.abs(step) * 1.2 : Math.sin(t * 2.5) * 0.6);

    // 腳（變色龍的夾子腳）
    const foot = (x, s, col) => {
      const lift = Math.max(0, s) * 3;
      limb(ctx, (c) => { c.moveTo(x, by + 4); c.lineTo(x + 4, by + 10); c.lineTo(x + 2 + s * 2, -3 - lift); }, 5.5, col);
      A.ellipse(ctx, x + 2 + s * 2, -2.5 - lift, 4, 2.5, col, null, { lw: 2, hl: false });
    };
    foot(-14, -step, P.shade);
    foot(8, step, P.shade);

    // 尾巴：開心捲得緊緊的、難過垂下來、生氣翹得硬硬的
    const tb = [-24, by + 1];
    ctx.save();
    ctx.lineCap = 'round';
    const tailPts = [];
    if (blue) {
      // 無力地垂到地上，尾巴尖小小捲一下
      const endY = -6;
      let ex2 = 0;
      for (let i = 0; i <= 12; i++) {
        const q = i / 12;
        ex2 = tb[0] - 14 * q - 4 * q * q;
        tailPts.push([ex2, tb[1] + (endY - tb[1]) * Math.sin(q * PI * 0.5) + Math.sin(t * 1.5) * q * 0.8]);
      }
      for (let i = 1; i <= 6; i++) {
        const a = -PI / 2 - (i / 6) * PI * 1.3;
        tailPts.push([ex2 + Math.cos(a) * 3.5, endY + 3.5 + Math.sin(a) * 3.5]);
      }
    } else {
      const turns = yellow ? 2.2 : red ? 1.2 : 1.7;
      const R0 = yellow ? 13 : 12;
      const sway = Math.sin(t * (red ? 8 : 2.5)) * 0.1;
      const ccx = tb[0] - 10;
      const ccy = tb[1] - (red ? 16 : 10);
      for (let i = 0; i <= 26; i++) {
        const q = i / 26;
        const a = 0.9 + sway - q * turns * PI;
        const r = R0 * (1 - q * 0.8);
        tailPts.push([ccx + Math.cos(a) * r, ccy + Math.sin(a) * r]);
      }
      tailPts.unshift(tb);
    }
    const tailPath = (c) => tailPts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    ctx.beginPath();
    tailPath(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = A.c(P.body);
    ctx.lineWidth = 5.5;
    ctx.stroke();
    ctx.restore();

    // 身體
    const body = (c) => {
      c.moveTo(-26, by + 2);
      c.bezierCurveTo(-26, by - 14, -6, by - 18, 10, by - 14);
      c.bezierCurveTo(22, by - 10, 24, by + 2, 18, by + 8);
      c.bezierCurveTo(8, by + 13, -18, by + 13, -26, by + 2);
      c.closePath();
    };
    // 背脊的鋸齒
    ctx.save();
    const spikes = red ? 7 : 5;
    for (let i = 0; i < spikes; i++) {
      const q = i / (spikes - 1);
      const x = -22 + q * 36;
      const y = by - 13 - Math.sin(q * PI) * 3;
      const hh = red ? 6 + Math.sin(t * 20 + i) * 1.5 : blue ? 2.5 : 4;
      A.shape(ctx, (c) => { c.moveTo(x - 3.5, y + 3); c.lineTo(x + (red ? 1.5 : 0), y - hh); c.lineTo(x + 3.5, y + 3); c.closePath(); }, P.crest, null, { lw: 2 });
    }
    ctx.restore();
    A.shape(ctx, body, P.body, P.shade, { cel: [3.5, 3.5], hl: [-10, by - 9, 5, 2] });
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    A.ellipse(ctx, 0, by + 12, 22, 6, P.belly, null, { noStroke: true, hl: false });
    // 心情條紋
    ctx.strokeStyle = A.c(P.shade);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const x = -14 + i * 10;
      ctx.moveTo(x, by - 12);
      ctx.quadraticCurveTo(x + 3, by - 4, x, by + 3);
    }
    ctx.stroke();
    ctx.restore();

    foot(-9, step, P.body);
    foot(13, -step, P.body);

    // 頭（頭盔狀的冠）
    const hx = 22;
    const hy = by - 5 + (blue ? 5 : 0);
    ctx.save();
    ctx.translate(hx, hy);
    let hr = 0;
    if (blue) hr = 0.25;
    if (red) hr = wind ? 0.2 : strike ? -0.05 : 0.05;
    if (yellow) hr = -0.15 + Math.sin(t * 6) * 0.05;
    if (hurt) hr = -0.3;
    ctx.rotate(hr);
    const head = (c) => {
      c.moveTo(-10, 6);
      c.bezierCurveTo(-14, -6, -12, -18, -4, -22);
      c.quadraticCurveTo(4, -14, 12, -8);
      c.bezierCurveTo(18, -4, 20, 3, 16, 7);
      c.bezierCurveTo(10, 11, -4, 11, -10, 6);
      c.closePath();
    };
    A.shape(ctx, head, P.body, P.shade, { cel: [2.5, 2.5], hl: [-7, -12, 2.2, 3.5] });
    // 轉塔眼
    const ex = 3;
    const ey = -4;
    A.ellipse(ctx, ex, ey, 7, 7, P.body, P.shade, { lw: 2.4, hl: false, cel: [1.5, 1.5] });
    ctx.strokeStyle = A.c(P.shade);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ex, ey, 4.8, 0, TAU);
    ctx.stroke();
    const kind = eyeKind(m);
    if (kind === 'x' || kind === 'hurt') {
      A.eye(ctx, ex + 1, ey, 2.6, 2.6, kind);
    } else if (yellow || kind === 'closed') {
      // 開心的 ^ 眼
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (yellow) ctx.arc(ex + 1, ey + 2, 3.2, 1.15 * PI, 1.85 * PI);
      else ctx.arc(ex + 1, ey - 0.5, 3, 0.15 * PI, 0.85 * PI);
      ctx.stroke();
    } else {
      const look = Math.sin(t * 0.9) > 0.6 ? -1.5 : 1.8;
      A.ellipse(ctx, ex, ey, 4.4, 4.4, '#ffffff', null, { noStroke: true, hl: false });
      A.eye(ctx, ex + look, ey + (blue ? 1 : 0), red ? 1.8 : 2.4, red ? 1.8 : 2.8, 'normal', 0);
      if (blue) {
        // 眼眶裡的淚水
        ctx.save();
        ctx.globalAlpha *= 0.7;
        ctx.fillStyle = A.c('#9ad8ff');
        ctx.beginPath();
        ctx.ellipse(ex, ey + 2.8, 4, 1.8, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    // 眉毛
    if (!m.dead && kind !== 'hurt') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (red) { ctx.moveTo(ex - 5, ey - 11); ctx.lineTo(ex + 6, ey - 6.5); }
      else if (blue) { ctx.moveTo(ex - 4, ey - 7.5); ctx.lineTo(ex + 5, ey - 10.5); }
      ctx.stroke();
    }
    // 嘴
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (red) {
      // 咬牙
      A.shape(ctx, (c) => { c.moveTo(4, 5); c.lineTo(16, 3); c.quadraticCurveTo(16, 8, 12, 8.5); c.lineTo(5, 8); c.closePath(); }, '#ffffff', null, { lw: 1.8 });
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(8, 4.3);
      ctx.lineTo(8, 8.2);
      ctx.moveTo(12, 3.8);
      ctx.lineTo(12, 8.4);
      ctx.stroke();
    } else if (blue) {
      ctx.beginPath();
      ctx.moveTo(5, 7);
      ctx.quadraticCurveTo(8, 4, 10, 6.5);
      ctx.quadraticCurveTo(12, 4.5, 15, 6);
      ctx.stroke();
    } else if (yellow || strike) {
      A.shape(ctx, (c) => { c.moveTo(4, 4); c.quadraticCurveTo(10, 4, 16, 2); c.quadraticCurveTo(13, 12, 5, 7); c.closePath(); }, '#8a2a2a', null, { lw: 1.8 });
      ctx.fillStyle = A.c('#ff8a9a');
      ctx.beginPath();
      ctx.ellipse(9, 7.5, 2.8, 1.4, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(4, 5);
      ctx.quadraticCurveTo(10, 7, 15, 3);
      ctx.stroke();
    }
    if (!red) A.blush(ctx, -3, 4, 3);
    // 生氣的青筋
    if (red) angerMark(ctx, -6, -14, 4 + Math.max(0, Math.sin(t * 9)) * 1, '#ffe24a');
    ctx.restore();

    // 心情特效
    if (red) {
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.6 + i / 3) % 1;
        puff(ctx, hx - 6 - q * 4 + i * 3, hy - 22 - q * 18, 2.5 + q * 3.5, '#fff2ea', (1 - q) * 0.85);
      }
    } else if (blue) {
      // 眼淚噴泉與頭上的小雨雲
      ctx.save();
      for (let s = 0; s < 2; s++) {
        const q = (t * 2.2 + s * 0.5) % 1;
        const x = hx + 3 + (s ? 5 : -3) * q * 1.6;
        const y = hy - 2 + q * q * 22;
        ctx.globalAlpha = ba * (1 - q * 0.6);
        A.shape(ctx, (c) => { c.moveTo(x, y - 4); c.quadraticCurveTo(x + 3, y + 1, x, y + 2.5); c.quadraticCurveTo(x - 3, y + 1, x, y - 4); c.closePath(); }, '#8fd0ff', null, { lw: 1.4 });
      }
      ctx.restore();
      const cx = hx - 4 + Math.sin(t * 1.3) * 2;
      const cy = hy - 32;
      ctx.save();
      ctx.strokeStyle = 'rgba(140,200,255,0.8)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const q = (t * 2 + i * 0.33) % 1;
        const x = cx - 7 + i * 7;
        ctx.moveTo(x, cy + 5 + q * 14);
        ctx.lineTo(x - 1, cy + 9 + q * 14);
      }
      ctx.stroke();
      ctx.restore();
      A.shape(ctx, (c) => {
        c.moveTo(cx - 12, cy + 5);
        c.arc(cx - 7, cy + 1, 5.5, PI * 0.7, PI * 1.6);
        c.arc(cx + 1, cy - 2, 7, PI * 1.1, PI * 1.95);
        c.arc(cx + 9, cy + 1.5, 5, PI * 1.4, PI * 0.35);
        c.closePath();
      }, '#9aa6b8', '#7a8698', { lw: 2, shadeY: cy + 3 });
    } else if (yellow) {
      for (let i = 0; i < 4; i++) {
        const a = t * 1.8 + (i * TAU) / 4;
        const x = Math.cos(a) * 34;
        const y = -34 + Math.sin(a) * 12 - hop;
        if (i % 2) heart(ctx, x, y, 3.8, '#ff8ab0');
        else sparkle(ctx, x, y, 4 + Math.sin(t * 8 + i) * 1.2, '#fff6b0');
      }
      if (strike || wind) {
        // 幫同伴回血的綠色十字
        for (let i = 0; i < 3; i++) {
          const q = (t * 1.5 + i / 3) % 1;
          const x = -20 + i * 20;
          const y = -30 - q * 30;
          ctx.globalAlpha = ba * (1 - q);
          A.shape(ctx, (c) => {
            c.moveTo(x - 2.2, y - 6);
            c.lineTo(x + 2.2, y - 6);
            c.lineTo(x + 2.2, y - 2.2);
            c.lineTo(x + 6, y - 2.2);
            c.lineTo(x + 6, y + 2.2);
            c.lineTo(x + 2.2, y + 2.2);
            c.lineTo(x + 2.2, y + 6);
            c.lineTo(x - 2.2, y + 6);
            c.lineTo(x - 2.2, y + 2.2);
            c.lineTo(x - 6, y + 2.2);
            c.lineTo(x - 6, y - 2.2);
            c.lineTo(x - 2.2, y - 2.2);
            c.closePath();
          }, '#7af08a', null, { lw: 1.8 });
        }
        ctx.globalAlpha = ba;
      }
    }
    ctx.restore();
  }

  // ── 地圖禿鷹：禿頭禿鷹，翅膀是兩張破舊的藏寶圖（紅色虛線、X、小山與指北針）──
  function mapvulture(ctx, m) {
    const fx = m.fx || {};
    const t = m.t || 0;
    const ph = phase(m);
    const wind = ph === 'wind';
    const strike = ph === 'strike';
    const hurt = m.hurtT > 0;
    const walk = walking(m);
    const dive = !!fx.dive;
    const fly = dive || (m.hover || 0) > 2 || (fx.hover || 0) > 2;
    const feather = ['#6e4a38', '#4e3228'];
    const paper = ['#f0dcaa', '#cdb07a'];
    const skin = ['#f2a4a0', '#d07c7a'];
    const flap = fly && !dive ? Math.sin(t * 6) : 0;
    ctx.save();
    const by = fly ? -34 + flap * 2 : -30 + (walk ? -Math.abs(Math.sin(t * 9)) * 1.5 : 0);
    if (dive) {
      ctx.translate(0, -30);
      ctx.rotate(0.85);
      ctx.translate(0, 30);
    }
    if (hurt) ctx.rotate(-0.12);

    // 地圖翅膀：一張破舊的藏寶圖（外緣破成羽毛狀），上面有小山、河流、紅色虛線與 X
    const SPREAD = [[5, 4], [-3, -20], [-16, -36], [-44, -48], [-45, -40], [-39, -36], [-42, -29], [-33, -27], [-34, -19], [-25, -17], [-24, -9], [-15, -7], [-12, 3]];
    const FOLD = [[8, -7], [-8, -11], [-28, -8], [-44, 2], [-38, 5], [-41, 10], [-30, 9], [-28, 14], [-18, 11], [-12, 15], [-4, 10], [4, 9]];
    const mapWing = (back) => {
      ctx.save();
      ctx.translate(-2, by - 8);
      const spread = fly && !dive;
      const up = spread || (wind && !dive);
      const pts = up ? SPREAD : FOLD;
      if (spread) {
        // 側面拍翅：把翅膀沿 y 軸壓扁／翻到下面
        ctx.scale(1, 0.35 + (flap * 0.5 + 0.5) * 0.75 - (back ? 0.12 : 0));
      } else if (up) {
        ctx.scale(1, 0.9);
      }
      if (dive) ctx.rotate(-0.25);
      if (back) ctx.translate(4, -3);
      const wingP = (c) => {
        pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
        c.closePath();
      };
      A.shape(ctx, wingP, back ? paper[1] : paper[0], back ? '#b8985e' : paper[1], { cel: [2.5, 2.5], lw: 2.4 });
      if (!back) {
        const sp = pts === SPREAD;
        // 在翅膀座標裡放地圖圖案
        const P = sp ? { mx: -10, my: -22, px: [-4, -6, -16, -12, -28, -30], X: [-31, -35], r: [-8, -8, -20, -12] } : { mx: -12, my: -3, px: [0, 4, -10, 10, -22, -2], X: [-27, 2], r: [-30, 6, -40, 5] };
        ctx.save();
        ctx.beginPath();
        wingP(ctx);
        ctx.clip();
        // 摺痕
        ctx.strokeStyle = A.c('#d4b67c');
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (sp) {
          ctx.moveTo(-22, -50);
          ctx.lineTo(-18, 0);
          ctx.moveTo(-50, -30);
          ctx.lineTo(4, -12);
        } else {
          ctx.moveTo(-20, -14);
          ctx.lineTo(-18, 16);
        }
        ctx.stroke();
        // 小山
        ctx.strokeStyle = A.c('#8a6a3a');
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(P.mx - 6, P.my + 3);
        ctx.lineTo(P.mx - 2, P.my - 4);
        ctx.lineTo(P.mx + 2, P.my + 3);
        ctx.moveTo(P.mx, P.my + 3);
        ctx.lineTo(P.mx + 4, P.my - 1.5);
        ctx.lineTo(P.mx + 8, P.my + 3);
        // 小河
        ctx.moveTo(P.r[0], P.r[1]);
        ctx.quadraticCurveTo((P.r[0] + P.r[2]) / 2, P.r[1] - 6, P.r[2], P.r[3]);
        ctx.stroke();
        // 紅色虛線路徑 → X
        ctx.strokeStyle = A.c('#d23a2a');
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(P.px[0], P.px[1]);
        ctx.bezierCurveTo(P.px[2], P.px[3], P.px[4], P.px[5], P.X[0] + 3, P.X[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(P.X[0] - 3.5, P.X[1] - 3.5);
        ctx.lineTo(P.X[0] + 3.5, P.X[1] + 3.5);
        ctx.moveTo(P.X[0] + 3.5, P.X[1] - 3.5);
        ctx.lineTo(P.X[0] - 3.5, P.X[1] + 3.5);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    };
    mapWing(true);

    // 尾羽
    A.shape(ctx, (c) => { c.moveTo(-16, by + 2); c.lineTo(-34, by + 8); c.lineTo(-31, by + 13); c.lineTo(-24, by + 11); c.lineTo(-14, by + 9); c.closePath(); }, feather[0], feather[1], { lw: 2.4, shadeY: by + 9 });

    // 腳：站著時站地上，飛行時垂下（俯衝時往前伸）
    const tal = '#e8c070';
    if (fly) {
      const fxp = dive ? 12 : 2;
      limb(ctx, (c) => { c.moveTo(-4, by + 10); c.lineTo(-4 + fxp, by + 22); c.moveTo(4, by + 10); c.lineTo(4 + fxp, by + 22); }, 4.5, tal);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2;
      ctx.beginPath();
      [-4, 4].forEach((x) => {
        const X = x + fxp;
        ctx.moveTo(X, by + 22);
        ctx.lineTo(X + 4, by + 25);
        ctx.moveTo(X, by + 22);
        ctx.lineTo(X - 2, by + 26);
      });
      ctx.stroke();
    } else {
      const st = walk ? Math.sin(t * 9) : 0;
      limb(ctx, (c) => { c.moveTo(-5, by + 10); c.lineTo(-6 + st * 3, -2 - Math.max(0, st) * 3); c.moveTo(5, by + 10); c.lineTo(6 - st * 3, -2 - Math.max(0, -st) * 3); }, 5, tal);
      A.ellipse(ctx, -3 + st * 3, -2, 5, 2.2, tal, null, { lw: 1.8, hl: false });
      A.ellipse(ctx, 9 - st * 3, -2, 5, 2.2, tal, null, { lw: 1.8, hl: false });
    }

    // 身體
    A.ellipse(ctx, -2, by, 18, 14, feather[0], feather[1], { cel: [3.5, 3.5], hl: [-9, by - 7, 4, 2] });
    // 脖子
    const nx = dive ? 17 : 12;
    const ny = by - 16;
    limb(ctx, (c) => { c.moveTo(6, by - 8); c.quadraticCurveTo(nx - 2, by - 12, nx, ny); }, 8, skin[0]);
    // 白色毛領
    const ruff = (c) => {
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const a = PI * 1.05 + (i / n) * PI * 1.1;
        const r = i % 2 ? 10 : 13;
        const x = 6 + Math.cos(a) * r;
        const y = by - 9 + Math.sin(a) * r * 0.55;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.quadraticCurveTo(6, by - 1, -5, by - 8);
      c.closePath();
    };
    A.shape(ctx, ruff, '#f4ecdc', '#d8ccb4', { lw: 2.4, shadeY: by - 8 });

    // 頭（禿頭、勾嘴）
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(dive ? 0.2 : wind ? -0.2 : strike ? 0.25 : Math.sin(t * 1.5) * 0.06);
    A.ellipse(ctx, 0, -5, 9.5, 8.5, skin[0], skin[1], { cel: [2, 2], hl: [-3, -10, 2.5, 1.5] });
    // 皺皺的頭皮
    ctx.strokeStyle = A.c(skin[1]);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-6, -10);
    ctx.quadraticCurveTo(-3, -12, 0, -11);
    ctx.moveTo(-7, -6);
    ctx.quadraticCurveTo(-4, -8, -1, -7);
    ctx.stroke();
    // 嘴
    A.shape(ctx, (c) => {
      c.moveTo(6, -7);
      c.quadraticCurveTo(15, -8, 17, -1);
      c.quadraticCurveTo(17, 4, 13, 4);
      c.quadraticCurveTo(14, 0, 11, -1);
      c.lineTo(6, -1);
      c.closePath();
    }, '#f0d890', '#c8a860', { lw: 2.2, shadeY: -3 });
    ctx.fillStyle = A.c('#3a2a22');
    ctx.beginPath();
    ctx.moveTo(15.5, 0);
    ctx.quadraticCurveTo(17, 3, 13.5, 4);
    ctx.quadraticCurveTo(14.5, 2, 13.5, 0);
    ctx.fill();
    if (strike || hurt) {
      A.shape(ctx, (c) => { c.moveTo(7, -1); c.lineTo(12, 0); c.quadraticCurveTo(9, 4, 7, 2); c.closePath(); }, '#7a2323', null, { lw: 1.5 });
    }
    // 眼睛與陰沉的粗眉
    const kind = eyeKind(m);
    const ek = (dive || wind) && kind === 'normal' ? 'angry' : kind;
    A.eye(ctx, 2, -6, 2.6, 3.2, ek, 0.8);
    if (!m.dead && kind !== 'hurt') {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3, -11.5);
      ctx.lineTo(6, -9);
      ctx.stroke();
    }
    A.blush(ctx, -2, -1, 2.4);
    ctx.restore();

    // 前面的地圖翅膀
    mapWing(false);
    if (dive) speedLines(ctx, -34, by - 4, 34, 4, 22, t, 'rgba(255,255,255,0.85)');
    ctx.restore();
  }

  // ═════════════ 投射物 ═════════════
  function projAngle(p) {
    if (p.vx != null && p.vy != null && (p.vx || p.vy)) return Math.atan2(p.vy, p.vx);
    return (p.dir || 1) < 0 ? PI : 0;
  }
  // 藍色眼淚（尖端朝後）
  function tear(ctx, p, t) {
    const ba = ctx.globalAlpha;
    ctx.rotate(projAngle(p));
    glow(ctx, 0, 0, 16, '140,200,255', 0.5);
    // 後面的小水珠
    ctx.fillStyle = A.c('#9ad8ff');
    for (let i = 1; i <= 2; i++) {
      const q = ((t * 6 + i * 0.4 + (p.seed || 0)) % 1);
      ctx.globalAlpha = ba * 0.8 * (1 - q);
      ctx.beginPath();
      ctx.arc(-12 - i * 6 - q * 4, Math.sin(i * 2 + (p.seed || 0)) * 3, 2.2 - i * 0.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = ba;
    const wob = 1 + Math.sin(t * 20 + (p.seed || 0)) * 0.06;
    ctx.scale(wob, 1 / wob);
    A.shape(ctx, (c) => {
      c.moveTo(-14, 0);
      c.quadraticCurveTo(-4, -7, 3, -6.5);
      c.bezierCurveTo(10, -6, 10, 6, 3, 6.5);
      c.quadraticCurveTo(-4, 7, -14, 0);
      c.closePath();
    }, '#5ab4f0', '#2f86d0', { lw: 2.2, shadeY: 2 });
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(3, -2.5, 2.6, 1.5, -0.2, 0, TAU);
    ctx.fill();
  }
  // 陶片（旋轉的甕碎片：外面是深色釉加米白鋸齒紋，斷口露出素燒陶）
  function shard(ctx, p, t) {
    ctx.rotate(t * 12 * ((p.vx || p.dir || 1) < 0 ? -1 : 1) + (p.seed || 0));
    ctx.scale(1.25, 1.25);
    const path = (c) => {
      c.moveTo(-10, -6);
      c.quadraticCurveTo(0, -11, 10, -6);
      c.lineTo(6, 2);
      c.lineTo(9, 8);
      c.lineTo(-3, 7);
      c.lineTo(-6, 2);
      c.closePath();
    };
    A.shape(ctx, path, '#9a4a2c', '#74321e', { cel: [2, 2], noStroke: true });
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    // 斷口的素燒陶邊
    ctx.fillStyle = A.c('#e8b47a');
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(6, 2);
    ctx.lineTo(9, 8);
    ctx.lineTo(5.5, 8);
    ctx.lineTo(3, 2);
    ctx.lineTo(7, -6.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = A.c('#f6e2b8');
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const x = -10 + i * 3.5;
      i ? ctx.lineTo(x, i % 2 ? 1 : -3) : ctx.moveTo(x, -3);
    }
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    path(ctx);
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = A.outline();
    ctx.stroke();
  }
  // 一團風：半透明、帶螺旋線，往前推
  function gust(ctx, p, t) {
    const a = projAngle(p);
    const dir = Math.cos(a) < 0 ? -1 : 1;
    ctx.scale(dir, 1);
    const R = p.r ? Math.max(14, p.r * 1.6) : 18;
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 1.3);
    g.addColorStop(0, 'rgba(235,250,255,0.55)');
    g.addColorStop(1, 'rgba(200,235,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.3, R, 0, 0, TAU);
    ctx.fill();
    ctx.lineCap = 'round';
    const spin = -t * 10 - (p.seed || 0);
    // 螺旋
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const q = i / 30;
      const aa = spin + q * PI * 3.2;
      const r = R * (0.15 + q * 0.75);
      const x = Math.cos(aa) * r * 1.15;
      const y = Math.sin(aa) * r * 0.8;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(170,220,245,0.9)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const q = i / 20;
      const aa = spin + PI + q * PI * 2.4;
      const r = R * (0.2 + q * 0.6);
      const x = Math.cos(aa) * r * 1.15;
      const y = Math.sin(aa) * r * 0.8;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    // 後面拖的風線
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const q = (t * 4 + i / 3) % 1;
      const y = (i - 1) * R * 0.5;
      const x = -R * 1.1 - q * 12;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 10 - (i % 2) * 6, y);
    }
    ctx.stroke();
  }

  // ═════════════ 地面區域 ═════════════
  function zoneFade(z, inT) {
    const life = z.life || 1;
    const zt = z.t || 0;
    return Math.max(0, Math.min(1, life - zt, zt * (inT || 4)));
  }
  // 火痕：一條貼地燃燒的短火焰
  function firetrail(ctx, z, t) {
    const fade = zoneFade(z, 6);
    if (fade <= 0) return;
    const r = z.r || 30;
    const life = z.life || 1;
    const k = 1 - Math.min(1, (z.t || 0) / life) * 0.5; // 越燒越小
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha = fade;
    glow(ctx, 0, -10, r * 1.3, '255,120,30', 0.5);
    // 焦痕
    ctx.fillStyle = 'rgba(60,30,20,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, -1, r, 4, 0, 0, TAU);
    ctx.fill();
    // 一排小火焰
    const n = Math.max(3, Math.round(r / 8));
    for (let i = 0; i < n; i++) {
      const x = -r * 0.85 + (i / (n - 1)) * r * 1.7;
      const fl = 0.75 + Math.sin(t * 13 + i * 2.1 + (z.seed || 0)) * 0.2;
      const s = (6 + (i % 2) * 2.5) * k * fl;
      const lean = Math.sin(t * 5 + i) * 0.1;
      A.shape(ctx, (c) => {
        c.moveTo(x + lean * s * 3, -s * 3.4);
        c.bezierCurveTo(x + s, -s * 1.8, x + s * 1.1, 0, x, 0);
        c.bezierCurveTo(x - s * 1.1, 0, x - s, -s * 1.6, x + lean * s * 3, -s * 3.4);
        c.closePath();
      }, '#ff7a2a', '#e8521e', { lw: 1.8, shadeY: -s });
      A.shape(ctx, (c) => {
        c.moveTo(x, -s * 1.9);
        c.quadraticCurveTo(x + s * 0.6, -s * 0.4, x, 0);
        c.quadraticCurveTo(x - s * 0.6, -s * 0.4, x, -s * 1.9);
        c.closePath();
      }, '#ffe46a', null, { noStroke: true });
    }
    // 火星
    ctx.fillStyle = '#ffd24a';
    for (let i = 0; i < 3; i++) {
      const q = (t * 1.2 + i / 3 + (z.seed || 0)) % 1;
      ctx.globalAlpha = fade * (1 - q);
      ctx.beginPath();
      ctx.arc(Math.sin(i * 2.7 + 1) * r * 0.6 + Math.sin(t * 4 + i) * 3, -10 - q * 22, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // 地上的紅色 X（預警）：越接近時間到越亮、閃得越快
  function xmark(ctx, z, t) {
    const life = z.life || 1;
    const zt = z.t || 0;
    const p = Math.max(0, Math.min(1, zt / life));
    const fadeIn = Math.min(1, zt * 6);
    if (zt >= life) return;
    const r = z.r || 30;
    const blink = 0.5 + 0.5 * Math.sin(zt * (8 + p * 30));
    const a = fadeIn * (0.45 + p * 0.35 + blink * (0.2 + p * 0.2));
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    glow(ctx, 0, -2, r * 1.2, '255,60,40', 0.25 + p * 0.35);
    ctx.scale(1, 0.32);
    // 外圈（縮小中的瞄準圈）
    ctx.strokeStyle = 'rgba(255,90,60,0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -t * 30;
    ctx.beginPath();
    ctx.arc(0, -4, r * (1.25 - p * 0.35), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    // X
    const s = r * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s, -s - 4);
    ctx.lineTo(s, s - 4);
    ctx.moveTo(s, -s - 4);
    ctx.lineTo(-s, s - 4);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = U.mix('#d8322a', '#ffb0a0', blink * p);
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.restore();
  }
  // 沿地面往兩側擴散的震波（z.r 會變大）
  function quake(ctx, z, t) {
    const fade = zoneFade(z, 10);
    if (fade <= 0) return;
    const r = z.r || 30;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha = fade;
    // 地面裂縫
    ctx.strokeStyle = 'rgba(70,35,20,0.7)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let s = -1; s <= 1; s += 2) {
      ctx.moveTo(0, -1);
      const n = Math.max(2, Math.floor(r / 14));
      for (let i = 1; i <= n; i++) ctx.lineTo(s * (r * i) / n, -1 + (i % 2 ? 2 : -1.5));
    }
    ctx.stroke();
    // 兩側的震波峰（土浪＋白色衝擊弧＋被震起的碎石）
    for (let s = -1; s <= 1; s += 2) {
      const x = s * r;
      const h = 26;
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(s, 1);
      const g = ctx.createLinearGradient(0, -h * 1.2, 0, 0);
      g.addColorStop(0, 'rgba(255,235,200,0)');
      g.addColorStop(0.45, 'rgba(255,225,180,0.85)');
      g.addColorStop(1, 'rgba(150,90,55,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-34, 0);
      ctx.quadraticCurveTo(-6, -h * 1.5, 12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,245,225,0.95)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-22, -6);
      ctx.quadraticCurveTo(-4, -h * 1.25, 10, -3);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, -h * 0.9);
      ctx.lineTo(18, -h * 1.1);
      ctx.moveTo(15, -h * 0.45);
      ctx.lineTo(23, -h * 0.5);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const q = (t * 3 + i / 3) % 1;
        const rx = -6 + i * 6 - q * 10;
        const ry = -5 - Math.sin(q * PI) * (18 + i * 5);
        A.shape(ctx, (c) => { c.moveTo(rx - 3.5, ry); c.lineTo(rx, ry - 3.5); c.lineTo(rx + 3.5, ry); c.lineTo(rx, ry + 3); c.closePath(); }, '#a86e4a', null, { lw: 1.6 });
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ═════════════ 素材圖示（掉落物） ═════════════
  const ICON4 = {
    matchhead(ctx) {
      ctx.save();
      ctx.rotate(-0.7);
      A.shape(ctx, (c) => A.roundRect(c, -3, -4, 6, 22, 2), '#f2d49a', '#d2aa68', { lw: 2.2, shadeY: 6 });
      A.shape(ctx, (c) => {
        c.moveTo(-5.5, -4);
        c.bezierCurveTo(-8, -14, -4, -18, 0, -18);
        c.bezierCurveTo(4, -18, 8, -14, 5.5, -4);
        c.closePath();
      }, '#e8453a', '#b02e2c', { lw: 2.4, cel: [1.5, 1.5], hl: [-2, -13, 1.6, 2.5] });
      ctx.restore();
      sparkle(ctx, 10, -10, 4, '#ffe46a');
    },
    vein(ctx) {
      A.shape(ctx, (c) => { c.moveTo(-14, 8); c.lineTo(-15, -4); c.lineTo(-7, -13); c.lineTo(6, -13); c.lineTo(14, -4); c.lineTo(13, 9); c.lineTo(0, 13); c.closePath(); }, '#c26a54', '#96463a', { cel: [3, 3], hl: [-8, -7, 3, 2] });
      ctx.strokeStyle = A.c('#ffb43a');
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-12, 4);
      ctx.lineTo(-6, 6);
      ctx.lineTo(-6, 11);
      ctx.stroke();
      angerMark(ctx, 2, -1, 6, '#ff3b3b');
    },
    lodestone(ctx) {
      const arch = (c, a0, a1) => {
        c.arc(0, 0, 13, a0, a1, false);
        c.arc(0, 0, 5.5, a1, a0, true);
        c.closePath();
      };
      ctx.save();
      ctx.translate(0, 2);
      ctx.rotate(-0.35);
      A.shape(ctx, (c) => arch(c, PI, PI * 1.5), '#3f7ee0', '#2a58b0', { noStroke: true, shadeY: -3 });
      A.shape(ctx, (c) => arch(c, PI * 1.5, TAU), '#ea4a3c', '#b8322c', { noStroke: true, shadeY: -3 });
      A.shape(ctx, (c) => { c.rect(-13, 0, 7.5, 9); }, '#e4e8ee', '#aab2bc', { lw: 2.2, shadeY: 5 });
      A.shape(ctx, (c) => { c.rect(5.5, 0, 7.5, 9); }, '#e4e8ee', '#aab2bc', { lw: 2.2, shadeY: 5 });
      ctx.beginPath();
      arch(ctx, PI, TAU);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      ctx.restore();
      sparkle(ctx, 12, -12, 3.5, '#bfe8ff');
      sparkle(ctx, -13, -12, 2.5, '#bfe8ff');
    },
    wax(ctx) {
      A.shape(ctx, (c) => {
        c.moveTo(-12, 12);
        c.bezierCurveTo(-14, 2, -10, -8, -3, -9);
        c.bezierCurveTo(4, -10, 12, -4, 12, 4);
        c.lineTo(13, 9);
        c.quadraticCurveTo(13, 12, 10, 12);
        c.closePath();
      }, '#fff4dc', '#e6cfa6', { cel: [2.5, 2.5], hl: [-6, -3, 2.5, 3] });
      A.shape(ctx, (c) => { c.moveTo(-4, -8); c.lineTo(-4, 1); c.arc(-2, 1, 2, PI, 0, true); c.lineTo(0, -8); c.closePath(); }, '#fffaf0', null, { lw: 1.6 });
      ctx.strokeStyle = A.c('#3a2a22');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2, -9);
      ctx.quadraticCurveTo(4, -13, 2, -16);
      ctx.stroke();
    },
    weight(ctx) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = A.outline();
      ctx.beginPath();
      ctx.arc(0, -13, 4.5, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = A.c('#8a929c');
      ctx.stroke();
      A.shape(ctx, (c) => {
        c.moveTo(-6, -9);
        c.lineTo(6, -9);
        c.bezierCurveTo(9, -6, 9, 0, 12, 5);
        c.bezierCurveTo(14, 10, 13, 13, 10, 13);
        c.lineTo(-10, 13);
        c.bezierCurveTo(-13, 13, -14, 10, -12, 5);
        c.bezierCurveTo(-9, 0, -9, -6, -6, -9);
        c.closePath();
      }, '#646c78', '#434a55', { cel: [3, 2.5], hl: [-5, -2, 1.6, 3.5] });
      ctx.fillStyle = A.c('#f2c440');
      ctx.font = 'bold 11px ' + A.FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('斤', 0, 4);
    },
    bellowswing(ctx) {
      ctx.save();
      ctx.rotate(-0.5);
      const tear = (c, dy) => {
        c.moveTo(-15, dy - 2);
        c.bezierCurveTo(-4, dy - 11, 14, dy - 14, 13, dy);
        c.bezierCurveTo(14, dy + 14, -4, dy + 11, -15, dy + 2);
        c.closePath();
      };
      A.shape(ctx, (c) => tear(c, 6), '#a8603a', null, { lw: 2.2 });
      ctx.save();
      ctx.beginPath();
      tear(ctx, 6);
      ctx.clip();
      ctx.strokeStyle = A.c('#6a3420');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = -1.2 + i * 0.3;
        ctx.moveTo(-15, 6);
        ctx.lineTo(-15 + Math.cos(a) * 40, 6 + Math.sin(a) * 40);
      }
      ctx.stroke();
      ctx.restore();
      A.shape(ctx, (c) => tear(c, 0), '#cf8e4e', '#a0662e', { cel: [1.5, 2], hl: [2, -4, 4, 1.6] });
      ctx.fillStyle = A.c('#5a3a22');
      ctx.beginPath();
      [[-6, 0], [2, -4], [2, 4], [8, 0]].forEach(([x, y]) => { ctx.moveTo(x + 1.3, y); ctx.arc(x, y, 1.3, 0, TAU); });
      ctx.fill();
      A.shape(ctx, (c) => A.roundRect(c, 12, -2.5, 7, 5, 2.5), '#e0b060', null, { lw: 1.8 });
      ctx.restore();
    },
    potshard(ctx) {
      ctx.save();
      ctx.scale(1.15, 1.15);
      shard(ctx, { seed: -0.3, vx: 0 }, 0);
      ctx.restore();
    },
    moodscale(ctx) {
      const path = (c) => {
        c.moveTo(0, -15);
        c.bezierCurveTo(12, -12, 14, 2, 0, 15);
        c.bezierCurveTo(-14, 2, -12, -12, 0, -15);
        c.closePath();
      };
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c('#f7c93a');
      ctx.fill();
      ctx.save();
      ctx.clip();
      const bands = ['#ec5236', '#f79a3a', '#f7c93a', '#6cc05a', '#4a88dc', '#9a6ad8'];
      bands.forEach((b, i) => {
        ctx.fillStyle = A.c(b);
        ctx.fillRect(-16, -15 + i * 5.2, 32, 5.4);
      });
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-4, -6, 2.5, 5, 0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      path(ctx);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      sparkle(ctx, 11, -11, 3.5, '#ffffff');
    },
    mapscrap(ctx) {
      const path = (c) => {
        c.moveTo(-14, -12);
        c.lineTo(10, -14);
        c.lineTo(13, -6);
        c.lineTo(10, -1);
        c.lineTo(14, 5);
        c.lineTo(11, 13);
        c.lineTo(3, 11);
        c.lineTo(-5, 14);
        c.lineTo(-13, 12);
        c.lineTo(-11, 3);
        c.lineTo(-15, -3);
        c.closePath();
      };
      A.shape(ctx, path, '#f0dcaa', '#cdb07a', { cel: [2.5, 2.5], hl: [-7, -7, 3, 1.8] });
      ctx.strokeStyle = A.c('#8a6a3a');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-4, -2);
      ctx.stroke();
      ctx.strokeStyle = A.c('#d23a2a');
      ctx.lineWidth = 1.8;
      ctx.setLineDash([2.5, 2.5]);
      ctx.beginPath();
      ctx.moveTo(-8, 7);
      ctx.bezierCurveTo(-2, 10, 0, -2, 5, 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4, -9);
      ctx.lineTo(10, -3);
      ctx.moveTo(10, -9);
      ctx.lineTo(4, -3);
      ctx.stroke();
    },
  };

  Object.assign(A.MONSTER_DRAW, { matchlizard, angerrock, magnetdillo, candlesnake, weightbeetle, bellowsbat, potgoat, moodchameleon, mapvulture });
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  Object.assign(A.PROJ_DRAW, { tear, shard, gust });
  Object.assign(A.ZONE_DRAW, { firetrail, xmark, quake });
  if (A.ICON) Object.assign(A.ICON, ICON4);
})();
