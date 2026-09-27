// 野外魔王（規格：docs/SPEC-fieldboss.md）的美術：苔冠鱷王、沉船海魔、赤焰炎魔、千手冰像、星蝕魔龍，
// 以及牠們的投射物（fb_anchor / fb_meteor / fb_voidorb）與地面區域（fb_tentacle / fb_inkcloud / fb_armslam）。
// 楓之谷巴洛古、殘暴炎魔那種暗黑奇幻：巨大的剪影、犄角、翅膀、鎖鏈、發光裂紋與眼睛，
// 但仍是本作的畫法：平塗、深棕描邊（A.shape / A.outline）、右下月牙陰影、左上高光，顏色一律經過 A.c()。
// 原點在腳底中央、面向右（+x）；翻轉、閃白、飛行高度由 A.drawMonster 處理。每個 save() 都只對應一個 restore()。
// 設計尺寸 = 規格的 w×h，m.h 不同時等比例縮放。
(function () {
  'use strict';
  const A = G.art;
  const U = G.util;
  const PI = Math.PI;
  const TAU = PI * 2;

  // ───────────── 小工具 ─────────────
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  function num(v, d) {
    return typeof v === 'number' && isFinite(v) ? v : d;
  }
  function amt(v, d) {
    if (v === true) return 1;
    if (v === false || v == null) return d || 0;
    return clamp(num(v, d || 0), 0, 1);
  }
  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  const RGB = new Map(); // 顏色字串 → 'r,g,b'（每幀會查上千次；閃白時的混色也會進來，所以設上限）
  function rgbOf(hex) {
    const c = A.c(hex);
    let v = RGB.get(c);
    if (v === undefined) {
      if (RGB.size > 4000) RGB.clear();
      v = U.hexToRgb(c).join(',');
      RGB.set(c, v);
    }
    return v;
  }
  function rgba(hex, a) {
    return 'rgba(' + rgbOf(hex) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
  }
  // 發光（放射漸層）；顏色也經過 A.c()，剪影與閃白時才會一致
  function glow(ctx, x, y, r, hex, a) {
    if (!(a > 0) || !(r > 0)) return;
    const rgb = rgbOf(hex);
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  // 帶描邊的粗線
  function limb(ctx, path, w, col) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = Math.max(1, w - 5);
    ctx.stroke();
  }
  // 貝茲曲線取樣
  function qb(x0, y0, x1, y1, x2, y2) {
    return (s) => {
      const u = 1 - s;
      return [u * u * x0 + 2 * u * s * x1 + s * s * x2, u * u * y0 + 2 * u * s * y1 + s * s * y2];
    };
  }
  function cb(x0, y0, x1, y1, x2, y2, x3, y3) {
    return (s) => {
      const u = 1 - s;
      const a = u * u * u;
      const b = 3 * u * u * s;
      const c = 3 * u * s * s;
      const d = s * s * s;
      return [a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3];
    };
  }
  // 沿著中心線 fn(s) 做一條漸細的形狀（角、觸手、尾巴、鞭子）。wf(s) 是寬度
  function taper(c, fn, wf, n) {
    n = n || 18;
    const L = [];
    const R = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const p = fn(s);
      const q = fn(Math.min(1, s + 0.02));
      const o = fn(Math.max(0, s - 0.02));
      let dx = q[0] - o[0];
      let dy = q[1] - o[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const w = (typeof wf === 'function' ? wf(s) : wf) / 2;
      L.push([p[0] - dy * w, p[1] + dx * w]);
      R.push([p[0] + dy * w, p[1] - dx * w]);
    }
    c.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) c.lineTo(L[i][0], L[i][1]);
    for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
    c.closePath();
  }
  // 在中心線的法線方向取點（畫吸盤、鱗片用）
  function along(fn, s, off) {
    const p = fn(s);
    const q = fn(Math.min(1, s + 0.02));
    const o = fn(Math.max(0, s - 0.02));
    let dx = q[0] - o[0];
    let dy = q[1] - o[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    return [p[0] - dy * off, p[1] + dx * off, Math.atan2(dy, dx)];
  }
  // 鋸齒狀的裂紋（固定種子）：從 (x,y) 往 ang 方向長 len，seg 段，帶一條分岔
  function crack(c, x, y, ang, len, seg, seed) {
    let px = x;
    let py = y;
    c.moveTo(px, py);
    const pts = [];
    for (let i = 1; i <= seg; i++) {
      const a = ang + (hash(seed + i * 3.7) - 0.5) * 1.1;
      const l = (len / seg) * (0.7 + hash(seed + i) * 0.6);
      px += Math.cos(a) * l;
      py += Math.sin(a) * l;
      c.lineTo(px, py);
      pts.push([px, py]);
    }
    if (seg >= 2) {
      const b = pts[Math.floor(seg / 2) - 1];
      const a = ang + (hash(seed + 9.1) > 0.5 ? 0.9 : -0.9);
      c.moveTo(b[0], b[1]);
      c.lineTo(b[0] + Math.cos(a) * len * 0.3, b[1] + Math.sin(a) * len * 0.3);
      c.lineTo(b[0] + Math.cos(a + 0.4) * len * 0.45, b[1] + Math.sin(a + 0.4) * len * 0.45);
    }
  }
  // 發光的裂紋：外暈 → 深色描邊 → 亮色 → 白熱芯
  function hotLines(ctx, path, col, heat, w) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path(ctx);
    if (heat > 0) {
      ctx.strokeStyle = rgba(col, 0.28 * heat);
      ctx.lineWidth = w * 3.4;
      ctx.stroke();
    }
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + 2.6;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = w;
    ctx.stroke();
    if (heat > 0.55) {
      ctx.strokeStyle = A.c(U.mix(col, '#ffffff', 0.65));
      ctx.lineWidth = Math.max(1, w * 0.38);
      ctx.stroke();
    }
  }
  // 兇狠的發光眼：往內斜的杏眼，發光、白熱芯、細瞳孔
  function evilEye(ctx, x, y, w, h, col, g, slit) {
    glow(ctx, x, y, w * 2.4, col, 0.55 * g);
    A.shape(ctx, (c) => {
      c.moveTo(x - w, y - h * 0.9);
      c.quadraticCurveTo(x + w * 0.2, y - h * 0.55, x + w, y + h * 0.1);
      c.quadraticCurveTo(x + w * 0.1, y + h * 1.05, x - w * 0.85, y + h * 0.2);
      c.closePath();
    }, col, null, { lw: 2.6 });
    ctx.fillStyle = A.c(U.mix(col, '#ffffff', 0.7));
    ctx.beginPath();
    ctx.ellipse(x - w * 0.05, y - h * 0.05, w * 0.45, h * 0.32, 0.3, 0, TAU);
    ctx.fill();
    if (slit !== false) {
      ctx.fillStyle = A.c('#1a0a10');
      ctx.beginPath();
      ctx.ellipse(x + w * 0.12, y, w * 0.12, h * 0.55, 0.15, 0, TAU);
      ctx.fill();
    }
  }
  // 骨角：沿曲線漸細＋一圈圈角紋＋深色尖端
  function horn(ctx, fn, w0, col, shade, tip, heat, hotCol) {
    const wf = (s) => w0 * (1 - s * 0.92);
    if (heat > 0) {
      const p = fn(0.15);
      glow(ctx, p[0], p[1], w0 * 1.6, hotCol, 0.5 * heat);
    }
    A.shape(ctx, (c) => taper(c, fn, wf), col, shade, { cel: [w0 * 0.14, w0 * 0.1], lw: 3 });
    // 尖端變深
    ctx.save();
    ctx.beginPath();
    taper(ctx, fn, wf);
    ctx.clip();
    ctx.beginPath();
    taper(ctx, (s) => fn(0.72 + s * 0.28), (s) => w0 * 1.4);
    ctx.fillStyle = A.c(tip);
    ctx.fill();
    if (heat > 0) {
      ctx.globalAlpha *= clamp(heat, 0, 1) * 0.75;
      ctx.beginPath();
      taper(ctx, (s) => fn(s * 0.3), (s) => w0 * 1.4);
      ctx.fillStyle = A.c(hotCol);
      ctx.fill();
    }
    ctx.restore();
    // 角紋
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 1; i <= 5; i++) {
      const s = i * 0.12;
      const a = along(fn, s, wf(s) * 0.48);
      const b = along(fn, s, -wf(s) * 0.48);
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo((a[0] + b[0]) / 2 + Math.cos(a[2]) * 3, (a[1] + b[1]) / 2 + Math.sin(a[2]) * 3, b[0], b[1]);
    }
    ctx.stroke();
    taperOutline(ctx, fn, wf);
  }
  function taperOutline(ctx, fn, wf) {
    ctx.beginPath();
    taper(ctx, fn, wf);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  // 蝙蝠翅膀：root 是翅根，fingers = [[角度, 長度]...]（由上往下），membrane/bone 顏色，tatter 破爛程度
  function batWing(ctx, rx, ry, fingers, mem, memS, bone, boneS, o) {
    o = o || {};
    const tips = fingers.map(([a, l]) => [rx + Math.cos(a) * l, ry + Math.sin(a) * l]);
    // 前緣的「手臂」關節
    const el = tips[0];
    const elbow = [rx + (el[0] - rx) * 0.45 + Math.cos(fingers[0][0] - 0.8) * 10, ry + (el[1] - ry) * 0.45 + Math.sin(fingers[0][0] - 0.8) * 10];
    const memPath = (c) => {
      c.moveTo(rx, ry);
      c.lineTo(elbow[0], elbow[1]);
      c.lineTo(tips[0][0], tips[0][1]);
      for (let i = 1; i < tips.length; i++) {
        const a = tips[i - 1];
        const b = tips[i];
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        const px = mx + (rx - mx) * 0.3;
        const py = my + (ry - my) * 0.3;
        if (o.tatter) {
          // 破爛的翼膜：凹進去的邊緣再撕出幾個鋸齒
          const q1 = [lerp(a[0], px, 0.55), lerp(a[1], py, 0.55)];
          const q2 = [lerp(b[0], px, 0.5), lerp(b[1], py, 0.5)];
          c.quadraticCurveTo(lerp(a[0], px, 0.2), lerp(a[1], py, 0.35), q1[0], q1[1]);
          c.lineTo(px + (a[0] - px) * 0.18 + 4, py + (a[1] - py) * 0.1 + 6);
          c.lineTo(px, py);
          c.lineTo(q2[0] + 3, q2[1] - 5);
          c.quadraticCurveTo(lerp(b[0], px, 0.2), lerp(b[1], py, 0.2), b[0], b[1]);
        } else {
          c.quadraticCurveTo(px, py, b[0], b[1]);
        }
      }
      c.lineTo(rx + (o.tailX || 0), ry + (o.tailY || 30));
      c.closePath();
    };
    if (o.glowCol && o.glowA > 0) {
      ctx.save();
      ctx.beginPath();
      memPath(ctx);
      ctx.clip();
      glow(ctx, rx, ry, Math.max(...fingers.map((f) => f[1])) * 1.05, o.glowCol, o.glowA);
      ctx.restore();
    }
    A.shape(ctx, memPath, mem, memS, { cel: [0, -10], lw: 3 });
    if (o.glowCol && o.glowA > 0) {
      ctx.save();
      ctx.beginPath();
      memPath(ctx);
      ctx.clip();
      glow(ctx, rx, ry, Math.max(...fingers.map((f) => f[1])) * 0.9, o.glowCol, o.glowA * 0.8);
      ctx.restore();
    }
    // 翼膜上的血管
    if (o.vein) {
      hotLines(ctx, (c) => {
        tips.forEach((tp, i) => {
          if (!i) return;
          const a = tips[i - 1];
          const mx = (a[0] + tp[0]) / 2;
          const my = (a[1] + tp[1]) / 2;
          c.moveTo(lerp(rx, tp[0], 0.35), lerp(ry, tp[1], 0.35));
          c.lineTo(lerp(rx, mx, 0.6), lerp(ry, my, 0.6));
          c.lineTo(lerp(rx, mx, 0.78) + 4, lerp(ry, my, 0.78));
        });
      }, o.vein, o.veinHeat || 0, 1.8);
    }
    // 骨架
    const bw = o.boneW || 7;
    limb(ctx, (c) => {
      c.moveTo(rx, ry);
      c.lineTo(elbow[0], elbow[1]);
    }, bw + 3, bone);
    tips.forEach((tp, i) => {
      limb(ctx, (c) => {
        c.moveTo(elbow[0], elbow[1]);
        c.lineTo(tp[0], tp[1]);
      }, i === 0 ? bw + 1 : bw - 1, bone);
    });
    // 翼爪
    A.shape(ctx, (c) => {
      const a = fingers[0][0];
      c.moveTo(elbow[0] - 5, elbow[1] + 2);
      c.quadraticCurveTo(elbow[0] + Math.cos(a - 1.4) * 16, elbow[1] + Math.sin(a - 1.4) * 16, elbow[0] + Math.cos(a - 1.2) * 20 + 2, elbow[1] + Math.sin(a - 1.2) * 20 - 4);
      c.lineTo(elbow[0] + 6, elbow[1]);
      c.closePath();
    }, boneS, null, { lw: 2.2 });
    A.ellipse(ctx, elbow[0], elbow[1], bw * 0.9, bw * 0.9, bone, boneS, { lw: 2.4, hl: false });
    return tips;
  }
  // 火舌（描邊的外焰＋不描邊的內焰）
  function flame(ctx, x, y, w, h, t, seed, outer, inner, lw) {
    const sw = Math.sin(t * 9 + seed * 5) * w * 0.25;
    const hh = h * (0.85 + 0.15 * Math.sin(t * 13 + seed * 3));
    A.shape(ctx, (c) => {
      c.moveTo(x - w, y);
      c.quadraticCurveTo(x - w * 1.05, y - hh * 0.5, x + sw, y - hh);
      c.quadraticCurveTo(x + w * 0.2, y - hh * 0.55, x + w * 0.45, y - hh * 0.62);
      c.quadraticCurveTo(x + w * 1.1, y - hh * 0.3, x + w, y);
      c.quadraticCurveTo(x, y + w * 0.5, x - w, y);
      c.closePath();
    }, outer || '#ff8a2a', null, { lw: lw || 2.2 });
    A.shape(ctx, (c) => {
      c.moveTo(x - w * 0.5, y - 1);
      c.quadraticCurveTo(x - w * 0.5, y - hh * 0.35, x + sw * 0.6, y - hh * 0.62);
      c.quadraticCurveTo(x + w * 0.55, y - hh * 0.3, x + w * 0.5, y - 1);
      c.closePath();
    }, inner || '#ffe27a', null, { noStroke: true });
  }
  // 鎖鏈：兩點之間下垂的一串鏈環
  function chain(ctx, x1, y1, x2, y2, sag, link, col, colS) {
    const fn = qb(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2 + sag, x2, y2);
    let len = 0;
    let prev = fn(0);
    for (let i = 1; i <= 20; i++) {
      const p = fn(i / 20);
      len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      prev = p;
    }
    const n = Math.max(2, Math.round(len / (link * 1.5)));
    for (let i = 0; i <= n; i++) {
      const a = along(fn, i / n, 0);
      ctx.save();
      ctx.translate(a[0], a[1]);
      ctx.rotate(a[2]);
      if (i % 2) {
        A.shape(ctx, (c) => A.roundRect(c, -link, -link * 0.22, link * 2, link * 0.44, link * 0.22), colS, null, { lw: 2 });
      } else {
        A.shape(ctx, (c) => {
          c.ellipse(0, 0, link, link * 0.62, 0, 0, TAU);
          c.moveTo(link * 0.55, 0);
          c.ellipse(0, 0, link * 0.55, link * 0.22, 0, 0, TAU, true);
        }, col, colS, { lw: 2, shadeY: link * 0.2 });
      }
      ctx.restore();
    }
  }
  // 攻擊階段
  function atk(m) {
    const fx = m.fx || {};
    return {
      fx,
      ph: m.attackPhase || fx.phase || null,
      // js/game/fieldboss.js：出招中 m.fbAct 存在、m.fbLast 是這招的 id
      kind: String(m.attackKind || fx.kind || fx.move || (m.fbAct && m.fbLast) || ''),
      t: num(m.t, 0),
      rage: !!(fx.rage || m.enraged || (m.p2k != null && m.p2k > 0.5)),
      dead: !!m.dead,
      hurt: (m.hurtT || 0) > 0,
      walk: m.state === 'walk' && (m.vx == null || Math.abs(m.vx) > 4 || m.onGround !== false),
    };
  }
  // 地上的預警圓（發光、會一圈圈往內收）
  function warnRing(ctx, r, k, col, t) {
    ctx.save();
    ctx.scale(1, 0.28);
    glow(ctx, 0, 0, r * 1.2, col, 0.25 + 0.25 * k);
    ctx.fillStyle = rgba(col, 0.18 + 0.2 * k);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(col, 0.9);
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 8]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    const q = (t * 1.6) % 1;
    ctx.strokeStyle = rgba(col, 0.7 * (1 - q));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * (1 - q * 0.8), 0, TAU);
    ctx.stroke();
    ctx.fillStyle = rgba('#ffffff', 0.35 * k);
    ctx.beginPath();
    ctx.arc(0, 0, r * k, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ───────────── 魔王級精修（跟章節 Boss 同一套質感）─────────────
  // 月牙光：形狀內、被自己往 (dx,dy) 平移的副本蓋不到的那一條邊（dx,dy 往右下 → 左上亮邊）
  function crescent(ctx, path, dx, dy, col, a, bb) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(-3000, -3000, 6000, 6000);
    ctx.translate(dx, dy);
    path(ctx);
    ctx.translate(-dx, -dy);
    ctx.clip('evenodd');
    ctx.fillStyle = rgba(col, a);
    if (bb) ctx.fillRect(bb[0] - 12, bb[1] - 12, bb[2] - bb[0] + 24, bb[3] - bb[1] + 24);
    else ctx.fillRect(-3000, -3000, 6000, 6000);
    ctx.restore();
  }
  // 一個主形狀的完工層：左上→右下的體積漸層、左上的柔和邊緣光（兩層）、右下的反光（魔化光色）、材質斑點
  // b = [x0, y0, x1, y1] 形狀的外框；o：lite / dark / rim / bounce 顏色與強度、tex 材質
  function finish(ctx, path, b, o) {
    o = o || {};
    const [x0, y0, x1, y1] = b;
    const sz = Math.max(8, Math.min(x1 - x0, y1 - y0));
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgba(o.lite || '#fff6d8', o.liteA != null ? o.liteA : 0.2));
    g.addColorStop(0.42, rgba(o.lite || '#fff6d8', 0));
    g.addColorStop(0.58, rgba(o.dark || '#0c0618', 0));
    g.addColorStop(1, rgba(o.dark || '#0c0618', o.darkA != null ? o.darkA : 0.34));
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 10, y0 - 10, x1 - x0 + 20, y1 - y0 + 20);
    // 材質：細小的斑點、刻痕（固定種子）
    if (o.tex) {
      const n = o.texN || Math.round(((x1 - x0) * (y1 - y0)) / 500);
      ctx.fillStyle = rgba(o.tex, o.texA || 0.28);
      ctx.strokeStyle = rgba(o.tex, (o.texA || 0.28) * 0.9);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < n; i++) {
        const x = x0 + hash(i * 1.7 + (o.seed || 0)) * (x1 - x0);
        const y = y0 + hash(i * 2.3 + 5 + (o.seed || 0)) * (y1 - y0);
        const r = 0.8 + hash(i * 3.1 + (o.seed || 0)) * (o.texR || 2.2);
        ctx.beginPath();
        if (i % 3 === 0) {
          ctx.moveTo(x - r * 1.6, y);
          ctx.quadraticCurveTo(x, y - r * 0.8, x + r * 1.6, y + r * 0.3);
          ctx.stroke();
        } else {
          ctx.arc(x, y, r, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
    const rw = o.rimW || Math.max(2.5, sz * 0.06);
    crescent(ctx, path, rw, rw * 1.1, o.rim || '#fff4d0', o.rimA != null ? o.rimA : 0.22, b);
    crescent(ctx, path, rw * 0.4, rw * 0.45, o.rim || '#fff4d0', (o.rimA != null ? o.rimA : 0.22) * 1.2, b);
    if (o.bounce && o.bounceA > 0) crescent(ctx, path, -rw * 0.9, -rw * 0.7, o.bounce, o.bounceA, b);
    // 月牙光蓋掉了一半的描邊：補回來
    if (o.lw !== 0) {
      ctx.beginPath();
      path(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = o.lw || 3;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  // ── 材質點綴（跟章節 Boss 一樣：身上長東西、掛東西，讓大塊面有可以看的細節）──
  function sparkle4(ctx, x, y, r, col, a) {
    if (!(a > 0)) return;
    ctx.save();
    ctx.globalAlpha *= a;
    glow(ctx, x, y, r * 2.2, col, 0.5);
    ctx.fillStyle = A.c(U.mix(col, '#ffffff', 0.6));
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
    ctx.restore();
  }
  // 藤壺一小叢
  function barnacles(ctx, x, y, n, r, seed) {
    for (let i = 0; i < n; i++) {
      const a = hash(seed + i) * TAU;
      const d = i ? r * (0.8 + hash(seed + i + 3) * 0.8) : 0;
      const bx = x + Math.cos(a) * d;
      const by = y + Math.sin(a) * d * 0.7;
      const rr = r * (0.55 + hash(seed + i + 7) * 0.5);
      ctx.beginPath();
      ctx.moveTo(bx - rr, by + rr * 0.4);
      ctx.lineTo(bx - rr * 0.55, by - rr * 0.7);
      ctx.lineTo(bx + rr * 0.55, by - rr * 0.7);
      ctx.lineTo(bx + rr, by + rr * 0.4);
      ctx.closePath();
      ctx.fillStyle = A.c('#d8d0bc');
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = A.outline();
      ctx.stroke();
      ctx.fillStyle = A.c('#a09880');
      ctx.fillRect(bx - rr * 0.8, by - rr * 0.05, rr * 1.6, rr * 0.35);
      ctx.fillStyle = A.c('#3a3028');
      ctx.beginPath();
      ctx.ellipse(bx, by - rr * 0.62, rr * 0.36, rr * 0.16, 0, 0, TAU);
      ctx.fill();
    }
  }
  // 垂下的海草／水草（會晃）
  function weed(ctx, x, y, L, t, seed, col, colS) {
    const sw = Math.sin(t * 2 + seed) * L * 0.18;
    A.shape(ctx, (c) => taper(c, qb(x, y, x + sw * 0.4 + 4, y + L * 0.5, x + sw, y + L), (q) => 5 * (1 - q) + 1, 10), col, colS, { lw: 1.6, shadeY: y + L * 0.6 });
  }
  // 一顆小海星
  function starfish(ctx, x, y, r, rot, col, colS) {
    A.shape(ctx, (c) => {
      for (let i = 0; i < 10; i++) {
        const a = rot - PI / 2 + (i * PI) / 5;
        const rr = i % 2 ? r * 0.42 : r;
        if (!i) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
    }, col, colS, { lw: 1.8, shadeY: y + r * 0.2 });
    ctx.fillStyle = A.c(U.mix(col, '#ffffff', 0.45));
    for (let i = 0; i < 5; i++) {
      const a = rot - PI / 2 + (i * TAU) / 5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, 1.2, 0, TAU);
      ctx.fill();
    }
  }
  // 冰柱（往下）
  function icicle(ctx, x, y, L, w) {
    A.shape(ctx, (c) => {
      c.moveTo(x - w, y);
      c.quadraticCurveTo(x - w * 0.3, y + L * 0.5, x, y + L);
      c.quadraticCurveTo(x + w * 0.3, y + L * 0.5, x + w, y);
      c.closePath();
    }, '#e6f7ff', '#9ccbe8', { lw: 1.6, shadeY: y + L * 0.3 });
    ctx.fillStyle = A.c('#ffffff');
    ctx.globalAlpha *= 0.8;
    ctx.fillRect(x - w * 0.45, y + 1, 1.4, L * 0.4);
    ctx.globalAlpha /= 0.8;
  }
  // 沿著一條曲線堆的積雪（上緣圓鼓、下緣滴成冰柱）
  function snowCap(ctx, fn, th, seed, icy) {
    const P = [];
    for (let i = 0; i <= 14; i++) P.push(fn(i / 14));
    A.shape(ctx, (c) => {
      c.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1];
        const b = P[i];
        c.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - th * 0.8, b[0], b[1]);
      }
      for (let i = P.length - 1; i >= 0; i--) {
        const d = th * (0.5 + hash(seed + i) * 0.8);
        c.lineTo(P[i][0], P[i][1] + d);
      }
      c.closePath();
    }, '#f6fbff', '#c4dcee', { lw: 2, shadeY: P[0][1] + th * 0.2 });
    if (icy) {
      for (let i = 1; i < P.length - 1; i += 3) icicle(ctx, P[i][0], P[i][1] + th * 0.9, 8 + hash(seed + i * 2) * 12, 2.6);
    }
  }
  // 從裂縫滴下的熔岩（發光）
  function lavaDrip(ctx, x, y, t, seed, col) {
    const q = (t * 0.6 + hash(seed)) % 1;
    const L = 4 + Math.min(q, 0.5) * 22;
    ctx.save();
    glow(ctx, x, y + L * 0.5, 9, col, 0.5);
    A.shape(ctx, (c) => {
      c.moveTo(x - 3, y);
      c.quadraticCurveTo(x - 3.4, y + L * 0.7, x, y + L + 3);
      c.quadraticCurveTo(x + 3.4, y + L * 0.7, x + 3, y);
      c.closePath();
    }, col, null, { lw: 1.6 });
    if (q > 0.5) {
      const d = (q - 0.5) / 0.5;
      ctx.globalAlpha *= 1 - d;
      glow(ctx, x, y + L + 6 + d * d * 70, 7, col, 0.8);
      ctx.fillStyle = A.c(U.mix(col, '#ffffff', 0.5));
      ctx.beginPath();
      ctx.arc(x, y + L + 6 + d * d * 70, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // 往上飄的火星
  function embers(ctx, x, y, w, h, n, t, col, seed) {
    for (let i = 0; i < n; i++) {
      const q = (t * 0.5 + hash(seed + i)) % 1;
      const ex = x + (hash(seed + i + 1) - 0.5) * w + Math.sin(t * 3 + i) * 6;
      const ey = y - q * h;
      ctx.save();
      ctx.globalAlpha *= Math.sin(q * PI);
      glow(ctx, ex, ey, 6, col, 0.9);
      ctx.fillStyle = A.c(U.mix(col, '#ffffff', 0.55));
      ctx.fillRect(ex - 1.2, ey - 1.2, 2.4, 2.4);
      ctx.restore();
    }
  }

  // 實心發光眼（沒有眼白）：整顆眼睛都是發光的虹膜色，中心更亮，細細的暗色直瞳
  function solidEye(ctx, x, y, w, h, col, g, slit, rot) {
    glow(ctx, x, y, w * 2.6, col, 0.45 * g);
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    const eyePath = (c) => {
      c.moveTo(-w, -h * 0.9);
      c.quadraticCurveTo(w * 0.2, -h * 0.55, w, h * 0.1);
      c.quadraticCurveTo(w * 0.1, h * 1.05, -w * 0.85, h * 0.2);
      c.closePath();
    };
    const gr = ctx.createRadialGradient(0, 0, w * 0.05, 0, 0, w * 1.05);
    gr.addColorStop(0, rgba(U.mix(col, '#ffffff', 0.35), 1));
    gr.addColorStop(0.45, rgba(col, 1));
    gr.addColorStop(1, rgba(U.mix(col, '#200808', 0.45), 1));
    ctx.beginPath();
    eyePath(ctx);
    ctx.fillStyle = gr;
    ctx.fill();
    if (slit !== false) {
      ctx.fillStyle = A.c('#14060a');
      ctx.beginPath();
      ctx.ellipse(w * 0.1, h * 0.02, Math.max(0.8, w * 0.1), h * 0.62, 0.12, 0, TAU);
      ctx.fill();
    } else {
      // 沒有眼珠：整顆眼睛就是一團光，中心白熱
      ctx.fillStyle = rgba(U.mix(col, '#ffffff', 0.7), 0.9);
      ctx.beginPath();
      ctx.ellipse(w * 0.05, 0, w * 0.55, h * 0.5, 0.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(w * 0.05, 0, w * 0.25, h * 0.26, 0.1, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    eyePath(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
    glow(ctx, x - w * 0.15, y - h * 0.15, w * 0.9, U.mix(col, '#ffffff', 0.4), 0.45 * g);
  }

  // ═════════════════════════ 苔冠鱷王 fb_shroom（設計 300×150；資料不同時等比例縮放，id 沿用） ═════════════════════════
  // 半浮半趴在沼澤裡的老鱷魚王：又長又窄、滿口交錯利齒的長吻（鱷＋長吻鱷），沉重的眉骨壓著一對冷黃綠色的直瞳眼，
  // 背上一排排骨板長滿青苔、小蕨與紅帽傘菇，骨板間刻著會發綠光的符文；歪戴一頂祖傳的長苔古金王冠。
  // 身邊是泥岸、蘆葦、睡蓮與半截插在泥裡的斷劍。
  // 對應：breath＝下巴一路越張越大、喉囊鼓起、頭往後仰 → 大張嘴噴出沼氣（雲本身是 fb_sporebreath 區域）；
  // jump＝伏低蓄力 → 騰空（m.hover）弓身、四肢張開、尾巴甩動；summon＝甩尾拍水、喉嚨低吼出一圈圈震波，背上的傘菇發光搖晃再彈出去；
  // 暴走＝皮色轉深沼綠帶紫、眼睛轉橘紅、符文更亮、王冠寶石轉紅、身上冒沼氣、嘴微張；spawn＝先露出眼睛和吻端，再整隻浮上來（水往下流）。
  const CR = {
    gold: '#ecc04e', goldS: '#b47c2a', goldD: '#7a4a1a', patina: '#5aa894',
    moss: '#7cb44a', mossS: '#4e8034', flower: '#fff2f4', flowerC: '#ffd23a',
    mouth: '#6a1e28', gum: '#c8606e', tooth: '#f6eed4', claw: '#2a2018',
    cap: '#e2463a', capS: '#a82c2a', dot: '#fff6e6', stem: '#f2e4c2', stemS: '#c8b28a', gill: '#c89a7a',
    reed: '#8a9a4a', reedS: '#5e6a30', cat: '#7a4a28', catS: '#50301a',
    water: '#3e5a44', waterD: '#26382c', waterL: '#8ab89a', bank: '#5a4a30', bankS: '#3a2e1e',
    pad: '#5eaa4e', padS: '#3c7a36', padV: '#2e5e2c', lotus: '#ffb6c8', lotusS: '#e07a9a',
    fern: '#6aa83e', fernS: '#3e7028',
    steel: '#b4bcc0', steelS: '#747c82', grip: '#5a3a22', gas: '#9ad86a', gasP: '#8a6aa8',
  };
  // 調色（暴走時整隻轉暗、斑紋帶紫、眼睛轉橘紅）
  function crPal(rage) {
    return rage
      ? { skin: '#43563a', skinS: '#2a3828', skinD: '#1f2a1e', spot: '#4e2e62', belly: '#bdb48e', bellyS: '#8a8064', scute: '#52643e', scuteS: '#303e28', eye: '#ff6a1e', eyeS: '#b02a10', rune: '#c6ff4a', gem: '#ff3a4a', rim: '#e8d0ff', bounce: '#b07aff', aura: '#a060ff' }
      : { skin: '#5f7c40', skinS: '#3e5530', skinD: '#2e4026', spot: '#34482a', belly: '#ded39e', bellyS: '#b0a272', scute: '#71894a', scuteS: '#46592e', eye: '#d8ee3a', eyeS: '#7e9a1a', rune: '#7dff8a', gem: '#5aff8a', rim: '#f0ffd0', bounce: '#8cff7a', aura: '#8cff6a' };
  }
  // 軀幹（側面：臀在左、肩頸在右；arch＝騰空時弓起）
  function crTorso(c, a) {
    c.moveTo(-104, -30 - a * 6);
    c.bezierCurveTo(-100, -72 - a * 10, -44, -98 - a * 14, 8, -100 - a * 12);
    c.bezierCurveTo(38, -102 - a * 8, 58, -106, 78, -100);
    c.lineTo(86, -62);
    c.bezierCurveTo(76, -38, 62, -22, 40, -12 - a * 10);
    c.bezierCurveTo(0, -2 - a * 22, -62, -2 - a * 20, -94, -7 - a * 10);
    c.bezierCurveTo(-110, -12 - a * 8, -112, -22 - a * 6, -104, -30 - a * 6);
    c.closePath();
  }
  // 上顎＋頭骨（長吻，吻端有鼻瘤；下緣是波浪狀的唇線）
  function crUpper(c) {
    c.moveTo(50, -84);
    c.bezierCurveTo(44, -102, 58, -114, 78, -116);
    c.quadraticCurveTo(98, -120, 114, -111);
    c.bezierCurveTo(138, -104, 166, -99, 186, -98);
    c.bezierCurveTo(196, -104, 207, -96, 205, -85);
    c.quadraticCurveTo(204, -76, 194, -76);
    c.quadraticCurveTo(181, -80, 168, -77);
    c.quadraticCurveTo(150, -81, 132, -79);
    c.quadraticCurveTo(114, -83, 96, -80);
    c.quadraticCurveTo(80, -78, 70, -76);
    c.quadraticCurveTo(56, -75, 50, -84);
    c.closePath();
  }
  function crLower(c) {
    c.moveTo(54, -80);
    c.quadraticCurveTo(80, -77, 100, -78);
    c.quadraticCurveTo(150, -77, 197, -74);
    c.quadraticCurveTo(206, -72, 201, -66);
    c.quadraticCurveTo(160, -63, 122, -62);
    c.bezierCurveTo(98, -60, 70, -52, 54, -60);
    c.quadraticCurveTo(46, -70, 54, -80);
    c.closePath();
  }
  // 牙：[x, 長度]；上排往下、下排往上，位置錯開＝交錯的利齒（吻端第四顆下牙特別長，閉嘴也露在外面）
  const CR_UT = [[80, 6], [91, 8], [103, 7], [115, 8], [127, 7], [139, 8], [151, 7], [163, 8], [175, 7], [188, 10], [197, 7]];
  const CR_LT = [[86, 6], [97, 7], [109, 8], [121, 7], [133, 8], [145, 7], [157, 8], [169, 7], [181, 12], [193, 8]];
  // 直瞳冷眼：眼丘 → 眼球 → 直瞳 → 眼皮 → 壓下來的厚眉骨（lid 0 張開～1 閉上）
  function crEye(ctx, x, y, r, P, o) {
    A.shape(ctx, (c) => c.ellipse(x, y, r * 1.3, r * 1.02, 0, 0, TAU), P.skin, P.skinS, { cel: [r * 0.22, r * 0.26], lw: 2.6 });
    const ex = x + r * 0.1;
    const rx = r * 0.92;
    const ry = r * 0.72;
    const eyeP = (c) => c.ellipse(ex, y, rx, ry, 0, 0, TAU);
    if (o.dead || o.shut) {
      A.shape(ctx, eyeP, P.skinS, null, { lw: 2.2 });
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (o.shut) {
        ctx.moveTo(ex - rx * 0.8, y - ry * 0.5);
        ctx.lineTo(ex + rx * 0.2, y + ry * 0.1);
        ctx.lineTo(ex - rx * 0.6, y + ry * 0.6);
      } else {
        ctx.moveTo(ex - rx * 0.85, y + ry * 0.1);
        ctx.quadraticCurveTo(ex, y + ry * 0.55, ex + rx * 0.85, y + ry * 0.05);
      }
      ctx.stroke();
    } else {
      if (o.glowA > 0) glow(ctx, ex, y, r * 2.8, P.eye, o.glowA);
      A.shape(ctx, eyeP, P.eye, P.eyeS, { cel: [rx * 0.25, ry * 0.4], lw: 2.2, noStroke: true });
      // 虹膜紋＋直瞳
      ctx.strokeStyle = rgba(P.eyeS, 0.8);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        ctx.moveTo(ex + Math.cos(a) * rx * 0.35, y + Math.sin(a) * ry * 0.35);
        ctx.lineTo(ex + Math.cos(a) * rx * 0.75, y + Math.sin(a) * ry * 0.75);
      }
      ctx.stroke();
      ctx.fillStyle = A.c('#120a06');
      ctx.beginPath();
      const pw = rx * (o.wide ? 0.26 : 0.13);
      ctx.moveTo(ex + rx * 0.14, y - ry * 0.95);
      ctx.quadraticCurveTo(ex + rx * 0.14 + pw * 2, y, ex + rx * 0.14, y + ry * 0.95);
      ctx.quadraticCurveTo(ex + rx * 0.14 - pw * 2, y, ex + rx * 0.14, y - ry * 0.95);
      ctx.fill();
      ctx.fillStyle = A.c('#ffffff');
      ctx.beginPath();
      ctx.arc(ex - rx * 0.38, y - ry * 0.28, Math.max(1.2, r * 0.16), 0, TAU);
      ctx.fill();
      const lid = clamp(o.lid || 0, 0, 1);
      if (lid > 0.02) {
        ctx.save();
        ctx.beginPath();
        eyeP(ctx);
        ctx.clip();
        const ly = y - ry + 2 * ry * lid;
        ctx.fillStyle = A.c(P.skinS);
        ctx.fillRect(ex - rx - 2, y - ry - 2, rx * 2 + 4, ly - y + ry + 2);
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(ex - rx, ly);
        ctx.lineTo(ex + rx, ly);
        ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath();
      eyeP(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    // 厚眉骨：往吻端壓下來（兇相）
    A.shape(ctx, (c) => {
      c.moveTo(x - r * 1.4, y - r * 0.3);
      c.quadraticCurveTo(x - r * 0.7, y - r * 1.55, x + r * 0.5, y - r * 1.2);
      c.quadraticCurveTo(x + r * 1.35, y - r * 0.85, x + r * 1.55, y - r * 0.05);
      c.quadraticCurveTo(x + r * 0.7, y - r * 0.6, x - r * 0.1, y - r * 0.66);
      c.quadraticCurveTo(x - r * 0.9, y - r * 0.62, x - r * 1.4, y - r * 0.3);
      c.closePath();
    }, P.skin, P.skinS, { shadeY: y - r * 0.72, lw: 2.4 });
    ctx.strokeStyle = rgba(P.rim, 0.5);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9, y - r * 0.95);
    ctx.quadraticCurveTo(x - r * 0.2, y - r * 1.35, x + r * 0.6, y - r * 1.08);
    ctx.stroke();
  }
  // 長滿青苔的古金王冠（原點在冠底中央）
  function crCrown(ctx, x, y, s, rot, P, gemA, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    const tips = [[-34, -26], [-16, -32], [0, -40], [16, -32], [34, -26]];
    A.shape(ctx, (c) => {
      c.moveTo(-30, 2);
      c.quadraticCurveTo(0, 7, 30, 2);
      c.lineTo(32, -12);
      c.lineTo(34, -26);
      c.lineTo(23, -15);
      c.lineTo(16, -32);
      c.lineTo(7, -16);
      c.lineTo(0, -40);
      c.lineTo(-7, -16);
      c.lineTo(-16, -32);
      c.lineTo(-23, -15);
      c.lineTo(-34, -26);
      c.lineTo(-32, -12);
      c.closePath();
    }, CR.gold, CR.goldS, { cel: [4, 3], lw: 2.6 });
    ctx.fillStyle = rgba('#fff8d0', 0.55);
    ctx.beginPath();
    ctx.moveTo(-30, -13);
    ctx.lineTo(-32, -22);
    ctx.lineTo(-25, -15);
    ctx.moveTo(-15, -16);
    ctx.lineTo(-15, -27);
    ctx.lineTo(-10, -16);
    ctx.moveTo(-3, -17);
    ctx.lineTo(-1, -33);
    ctx.lineTo(1, -17);
    ctx.fill();
    A.shape(ctx, (c) => {
      c.moveTo(-32, -12);
      c.quadraticCurveTo(0, -7, 32, -12);
      c.lineTo(31, 1);
      c.quadraticCurveTo(0, 7, -31, 1);
      c.closePath();
    }, CR.goldS, CR.goldD, { shadeY: -1, lw: 2.2 });
    // 銅綠斑、缺口
    ctx.fillStyle = rgba(CR.patina, 0.75);
    ctx.beginPath();
    ctx.ellipse(22, -4, 4, 2.4, 0.2, 0, TAU);
    ctx.ellipse(12, -20, 2, 3, 0, 0, TAU);
    ctx.ellipse(-27, -3, 2.6, 1.8, 0, 0, TAU);
    ctx.ellipse(-8, -22, 1.8, 2.4, 0, 0, TAU);
    ctx.fill();
    tips.forEach(([tx, ty], i) => A.ellipse(ctx, tx, ty - 1, i === 2 ? 4.2 : 3.4, i === 2 ? 4.2 : 3.4, CR.gold, CR.goldS, { lw: 1.8, hl: false }));
    // 寶石（只有中間那顆發散光，省效能）
    if (gemA > 0) glow(ctx, 0, -3, 24, P.gem, gemA);
    ctx.beginPath();
    [[0, -3, 6, 5], [-19, -4, 3.6, 3.2], [19, -5, 3.6, 3.2]].forEach(([gx, gy, rx, ry]) => {
      ctx.moveTo(gx, gy - ry);
      ctx.lineTo(gx + rx, gy);
      ctx.lineTo(gx, gy + ry);
      ctx.lineTo(gx - rx, gy);
      ctx.closePath();
    });
    ctx.fillStyle = A.c(U.mix(P.gem, '#ffffff', gemA * 0.35));
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = A.c('#ffffff');
    ctx.fillRect(-2.6, -5.4, 1.8, 1.8);
    // 青苔：從左邊蓋過冠帶、垂下幾絲
    const sw = Math.sin(t * 1.8) * 1.2;
    A.shape(ctx, (c) => {
      c.moveTo(-36, -8);
      c.quadraticCurveTo(-34, -20, -24, -16);
      c.quadraticCurveTo(-20, -24, -12, -16);
      c.quadraticCurveTo(-8, -20, -4, -12);
      c.quadraticCurveTo(-6, -4, -9, 2);
      c.lineTo(-11 + sw, 9);
      c.lineTo(-14, 3);
      c.quadraticCurveTo(-18, 6, -22, 3);
      c.lineTo(-25 + sw, 12);
      c.lineTo(-28, 3);
      c.quadraticCurveTo(-34, 4, -36, -8);
      c.closePath();
      c.moveTo(22, -14);
      c.quadraticCurveTo(26, -21, 32, -16);
      c.quadraticCurveTo(38, -12, 33, -6);
      c.lineTo(31 + sw, 2);
      c.lineTo(28, -5);
      c.quadraticCurveTo(22, -7, 22, -14);
      c.closePath();
    }, CR.moss, CR.mossS, { cel: [2, 2], lw: 2 });
    ctx.fillStyle = rgba('#d8ff9a', 0.7);
    ctx.beginPath();
    ctx.arc(-27, -15, 1.6, 0, TAU);
    ctx.arc(-17, -17, 1.3, 0, TAU);
    ctx.moveTo(28.3, -16);
    ctx.arc(27, -16, 1.3, 0, TAU);
    ctx.fill();
    // 小白花
    ctx.translate(26, -24);
    ctx.rotate(Math.sin(t * 2.3) * 0.1);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - PI / 2;
      ctx.moveTo(Math.cos(a) * 3.4 + 2.8, Math.sin(a) * 3.4);
      ctx.arc(Math.cos(a) * 3.4, Math.sin(a) * 3.4, 2.8, 0, TAU);
    }
    ctx.fillStyle = A.c(CR.flower);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.3;
    ctx.stroke();
    A.ellipse(ctx, 0, 0, 2.2, 2.2, CR.flowerC, null, { lw: 1.2, hl: false });
    ctx.restore();
  }
  // 背上的紅帽小傘菇（原點在菇柄根部）
  function crMush(ctx, x, y, s, rot, glowK) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    if (glowK > 0) glow(ctx, 0, -20, 30, '#d8ff6a', 0.75 * glowK);
    A.shape(ctx, (c) => {
      c.moveTo(-5, 4);
      c.quadraticCurveTo(-6, -8, -4, -17);
      c.lineTo(4, -17);
      c.quadraticCurveTo(6, -8, 5, 4);
      c.closePath();
    }, CR.stem, CR.stemS, { shadeY: -6, lw: 2.2 });
    A.shape(ctx, (c) => c.ellipse(0, -17, 14, 3.6, 0, 0, TAU), CR.gill, null, { lw: 2 });
    A.shape(ctx, (c) => {
      c.moveTo(-16, -16);
      c.bezierCurveTo(-16, -36, 16, -36, 16, -16);
      c.quadraticCurveTo(0, -12, -16, -16);
      c.closePath();
    }, CR.cap, CR.capS, { cel: [3, 2.5], lw: 2.4 });
    ctx.fillStyle = A.c(CR.dot);
    ctx.beginPath();
    ctx.ellipse(-6, -26, 3.4, 2.6, -0.3, 0, TAU);
    ctx.moveTo(7.4, -28);
    ctx.ellipse(5, -28, 2.4, 2, 0.2, 0, TAU);
    ctx.moveTo(11, -20);
    ctx.ellipse(9, -20, 2, 1.6, 0, 0, TAU);
    ctx.moveTo(-9.2, -19);
    ctx.ellipse(-11, -19, 1.8, 1.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 一叢青苔（圓鼓鼓的一坨＋垂下的幾絲＋亮點）
  function crMoss(ctx, x, y, w, t, seed) {
    const n = 3;
    A.shape(ctx, (c) => {
      c.moveTo(x - w / 2, y + 3);
      for (let i = 0; i < n; i++) {
        const x0 = x - w / 2 + (i * w) / n;
        const bump = 4 + hash(seed + i) * 4;
        c.quadraticCurveTo(x0 + w / n / 2, y - bump * 1.6, x0 + w / n, y + (i === n - 1 ? 3 : 0));
      }
      const sw = Math.sin(t * 1.7 + seed) * 1.5;
      c.lineTo(x + w * 0.3, y + 6);
      c.lineTo(x + w * 0.22 + sw, y + 13);
      c.lineTo(x + w * 0.12, y + 6);
      c.lineTo(x - w * 0.12, y + 7);
      c.lineTo(x - w * 0.2 + sw, y + 15);
      c.lineTo(x - w * 0.3, y + 6);
      c.closePath();
    }, CR.moss, CR.mossS, { shadeY: y + 3, lw: 2 });
    ctx.fillStyle = rgba('#d8ff9a', 0.75);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const px = x - w * 0.3 + i * w * 0.28;
      const py = y - 2 - hash(seed + i) * 3;
      ctx.moveTo(px + 1.4, py);
      ctx.arc(px, py, 1.4, 0, TAU);
    }
    ctx.fill();
  }
  // 小蕨葉（原點在根部，往 ang 方向長 L，葉尖捲起）
  function crFern(ctx, x, y, ang, L, t, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + Math.sin(t * 2 + seed) * 0.08);
    const pt = (s) => [L * s, -L * 0.28 * s * s];
    ctx.beginPath();
    for (let i = 1; i <= 7; i++) {
      const s = i / 8;
      const [px, py] = pt(s);
      const l = L * 0.2 * (1 - s * 0.7);
      for (let k = -1; k <= 1; k += 2) {
        const a = -0.55 * s + k * 1.0;
        const cx = px + Math.cos(a) * l * 0.5;
        const cy = py + Math.sin(a) * l * 0.5;
        ctx.moveTo(cx + Math.cos(a) * l * 0.5, cy + Math.sin(a) * l * 0.5);
        ctx.ellipse(cx, cy, l * 0.5, l * 0.22, a, 0, TAU);
      }
    }
    ctx.fillStyle = A.c(CR.fern);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(L * 0.5, 0, L * 0.95, -L * 0.26);
    ctx.arc(L * 0.95, -L * 0.33, L * 0.07, PI / 2, PI * 1.9, true);
    ctx.strokeStyle = A.c(CR.fernS);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  // 睡蓮葉：圓葉＋一道缺口＋放射葉脈
  function crPad(ctx, x, y, rx, ry, rot, col, colS, vein) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    A.shape(ctx, (c) => {
      c.moveTo(0, 0);
      c.ellipse(0, 0, rx, ry, 0, 0.32, TAU - 0.12);
      c.closePath();
    }, col, colS, { shadeY: ry * 0.3, lw: 2.2 });
    ctx.strokeStyle = rgba(vein, 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = 0.7 + i * 0.9;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rx * 0.85, Math.sin(a) * ry * 0.85);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 蘆葦／香蒲一叢
  function crReeds(ctx, x, y, n, h, t, seed) {
    ctx.lineCap = 'round';
    const tops = [];
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bx = x + (i - (n - 1) / 2) * 9 + hash(seed + i) * 4;
      const hh = h * (0.7 + hash(seed + i + 1) * 0.45);
      const sw = Math.sin(t * 1.6 + seed + i) * 4 + (hash(seed + i + 2) - 0.5) * 16;
      ctx.moveTo(bx, y);
      ctx.quadraticCurveTo(bx + sw * 0.3, y - hh * 0.5, bx + sw, y - hh);
      if (i % 2 === 0) tops.push([bx + sw * 0.92, y - hh]);
    }
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = A.c(CR.reed);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    tops.forEach(([tx, ty]) => A.shape(ctx, (c) => A.roundRect(c, tx - 4, ty - 4, 8, 20, 4), CR.cat, CR.catS, { shadeY: ty + 6, lw: 2 }));
  }
  // 腳掌：趾頭扇形攤開，前端是深色鉤爪
  function crFoot(ctx, x, y, ang, n, L, col) {
    const tips = [];
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * 0.42;
      const l = L * (i === 0 || i === n - 1 ? 0.78 : 1);
      const tx = x + Math.cos(a) * l;
      const ty = y + Math.sin(a) * l * 0.5 + 1;
      ctx.moveTo(x, y);
      ctx.lineTo(tx, ty);
      tips.push([tx, ty, Math.atan2(ty - y, tx - x)]);
    }
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.strokeStyle = A.c(col);
    ctx.lineWidth = 5.6;
    ctx.stroke();
    ctx.beginPath();
    tips.forEach(([tx, ty, a]) => {
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ctx.moveTo(tx - sa * 2.8, ty + ca * 2.8);
      ctx.quadraticCurveTo(tx + ca * 5, ty + sa * 5 - 2, tx + ca * 8, ty + sa * 8 + 2.5);
      ctx.lineTo(tx + sa * 2.8, ty - ca * 2.8);
      ctx.closePath();
    });
    ctx.fillStyle = A.c(CR.claw);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // 一條腿：腳掌 → 小腿 → 大腿（大腿最粗、蓋在最上面）
  // 膠囊形（兩端圓）
  function capsule(c, x0, y0, x1, y1, r0, r1) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    c.arc(x0, y0, r0, a + PI / 2, a - PI / 2);
    c.arc(x1, y1, r1, a - PI / 2, a + PI / 2);
    c.closePath();
  }
  // 一條腿：腳掌 → 小腿 → 大腿（大腿最粗、蓋在最上面）
  function crLeg(ctx, hip, knee, ank, w0, w1, col, colS, fAng) {
    crFoot(ctx, ank[0], ank[1], fAng, 4, 15, col);
    A.shape(ctx, (c) => capsule(c, knee[0], knee[1], ank[0], ank[1], w1 * 0.5, w1 * 0.36), col, colS, { cel: [2, 2], lw: 2.6 });
    A.shape(ctx, (c) => capsule(c, hip[0], hip[1], knee[0], knee[1], w0 * 0.5, w1 * 0.52), col, colS, { cel: [3, 4], lw: 2.8 });
  }
  // 符文（簡單的古字母：ᚠ ᛉ ᛏ ᛜ）
  function crRune(c, x, y, s, k) {
    c.moveTo(x, y - s);
    c.lineTo(x, y + s);
    if (k === 0) {
      c.moveTo(x, y - s * 0.4);
      c.lineTo(x + s * 0.7, y - s);
      c.moveTo(x, y + s * 0.1);
      c.lineTo(x + s * 0.7, y - s * 0.45);
    } else if (k === 1) {
      c.moveTo(x - s * 0.7, y - s);
      c.lineTo(x, y - s * 0.3);
      c.lineTo(x + s * 0.7, y - s);
    } else if (k === 2) {
      c.moveTo(x - s * 0.7, y - s * 0.3);
      c.lineTo(x, y - s);
      c.lineTo(x + s * 0.7, y - s * 0.3);
    } else {
      c.moveTo(x - s * 0.7, y);
      c.lineTo(x, y - s * 0.6);
      c.lineTo(x + s * 0.7, y);
      c.lineTo(x, y + s * 0.6);
      c.closePath();
    }
  }
  // 半截插在泥裡的斷劍（原點在入泥點）
  function crSword(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    A.shape(ctx, (c) => {
      c.moveTo(-5, 0);
      c.lineTo(-5, -40);
      c.lineTo(5, -40);
      c.lineTo(5, -10);
      c.lineTo(2, -6);
      c.lineTo(4, 0);
      c.closePath();
    }, CR.steel, CR.steelS, { cel: [2.5, 0], lw: 2.2 });
    ctx.strokeStyle = rgba('#ffffff', 0.55);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2.5, -4);
    ctx.lineTo(-2.5, -38);
    ctx.stroke();
    A.shape(ctx, (c) => A.roundRect(c, -18, -46, 36, 7, 3), CR.gold, CR.goldS, { shadeY: -42, lw: 2.2 });
    A.shape(ctx, (c) => A.roundRect(c, -3.5, -66, 7, 21, 2), CR.grip, '#3a2414', { shadeY: -56, lw: 2 });
    ctx.strokeStyle = rgba('#2a180c', 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(-3.5, -48 - i * 5);
      ctx.lineTo(3.5, -51 - i * 5);
    }
    ctx.stroke();
    A.ellipse(ctx, 0, -69, 5, 5, CR.gold, CR.goldS, { lw: 2 });
    // 護手上的一坨青苔
    A.shape(ctx, (c) => {
      c.moveTo(-18, -44);
      c.quadraticCurveTo(-16, -52, -8, -47);
      c.quadraticCurveTo(-6, -40, -9, -36);
      c.lineTo(-12, -32);
      c.lineTo(-13, -38);
      c.quadraticCurveTo(-18, -38, -18, -44);
      c.closePath();
    }, CR.moss, CR.mossS, { shadeY: -41, lw: 1.6 });
    ctx.restore();
  }
  // 祖傳的大圓金框老花眼鏡（鱷王的招牌）：近側鏡片圓心在原點、遠側鏡片在 (CRG_F) 被頭骨擋掉下半；
  // part='back' 畫遠側鏡片＋鏡片上長的小傘菇（在頭骨之前畫）；part='front' 畫放大的眼、近側鏡片、鼻橋、鏡腳、裂痕；
  // part='fallen' 掉在泥裡（兩片並排、躺平、裂得更兇）。o：{ x, y, rot, P, t, rage, inner（在鏡片裡畫放大的內容）, drip }
  const CRG_R = 17;
  const CRG_F = [33, 1, 13.5];
  const CRG_MAG = 1.42;
  function crLens(ctx, x, y, r, P, t, rage, seed, crack) {
    const lp = (c) => c.arc(x, y, r, 0, TAU);
    // 淡淡的茶色鏡片（暴走時透出橘紅光）
    ctx.beginPath();
    lp(ctx);
    ctx.fillStyle = rage ? rgba('#ff5a1e', 0.26 + Math.sin(t * 4) * 0.06) : rgba('#f4f8d8', 0.2);
    ctx.fill();
    // 每隔幾秒掃過一道反光
    const q = ((t + seed) % 3.4) / 0.55;
    ctx.save();
    ctx.beginPath();
    lp(ctx);
    ctx.clip();
    if (q < 1) {
      const bx = x - r - 10 + q * (r * 2 + 20);
      ctx.fillStyle = rgba('#ffffff', 0.75);
      ctx.beginPath();
      ctx.moveTo(bx - 3, y + r);
      ctx.lineTo(bx + 7, y - r);
      ctx.lineTo(bx + 12, y - r);
      ctx.lineTo(bx + 2, y + r);
      ctx.closePath();
      ctx.moveTo(bx + 7, y + r);
      ctx.lineTo(bx + 15, y - r);
      ctx.lineTo(bx + 16.5, y - r);
      ctx.lineTo(bx + 8.5, y + r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // 常駐的小弧光
    ctx.strokeStyle = rgba('#ffffff', 0.7);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.72, PI * 1.1, PI * 1.42);
    ctx.stroke();
    if (crack) {
      // 一道小裂痕（從鏡框右下往裡裂，分岔）
      const k = crack;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.62, y + r * 0.78);
      ctx.lineTo(x + r * 0.3, y + r * 0.38);
      ctx.lineTo(x + r * 0.4, y + r * 0.12 * k);
      ctx.lineTo(x + r * 0.12 * k, y - r * 0.22 * k);
      ctx.moveTo(x + r * 0.3, y + r * 0.38);
      ctx.lineTo(x + r * 0.02, y + r * 0.45);
      if (k > 1) {
        ctx.lineTo(x - r * 0.35, y + r * 0.2);
        ctx.moveTo(x + r * 0.4, y + r * 0.12 * k);
        ctx.lineTo(x + r * 0.78, y - r * 0.2);
      }
      ctx.strokeStyle = rgba('#1a2410', 0.55);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.85);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    // 金框：黑邊 → 金 → 亮邊
    ctx.beginPath();
    lp(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = A.c(CR.gold);
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = rgba('#fff4c0', 0.8);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(x, y, r + 0.6, PI * 1.05, PI * 1.6);
    ctx.stroke();
    ctx.strokeStyle = A.c(CR.goldD);
    ctx.beginPath();
    ctx.arc(x, y, r - 0.6, PI * 0.1, PI * 0.7);
    ctx.stroke();
  }
  // 鏡片上長的一小撮苔＋小紅菇
  function crSpecMoss(ctx, x, y, t) {
    const sw = Math.sin(t * 1.7) * 1;
    A.shape(ctx, (c) => {
      c.moveTo(x - 9, y + 2);
      c.quadraticCurveTo(x - 8, y - 5, x - 3, y - 3);
      c.quadraticCurveTo(x, y - 8, x + 4, y - 3);
      c.quadraticCurveTo(x + 9, y - 3, x + 9, y + 2);
      c.lineTo(x + 5, y + 3);
      c.lineTo(x + 3 + sw, y + 8);
      c.lineTo(x + 1, y + 3);
      c.lineTo(x - 4, y + 3);
      c.lineTo(x - 6 + sw, y + 7);
      c.lineTo(x - 7, y + 3);
      c.closePath();
    }, CR.moss, CR.mossS, { shadeY: y, lw: 1.6 });
  }
  function crSpecs(ctx, part, o) {
    const { P, t, rage } = o;
    const R = CRG_R;
    const [fx0, fy0, fr] = CRG_F;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    if (part === 'back') {
      crLens(ctx, fx0, fy0, fr, P, t + 0.25, rage, 0.2, 0);
      // 遠側鏡框頂上冒出一朵小紅傘菇
      crMush(ctx, fx0 + 5, fy0 - fr + 1, 0.38, 0.35 + Math.sin(t * 2.1) * 0.06, 0);
    } else if (part === 'front') {
      if (rage) glow(ctx, 0, 0, R * 2.2, '#ff6a1e', 0.35 + Math.sin(t * 4) * 0.08);
      // 鏡片裡：放大的頭骨與眼（回到頭部座標，以鏡片圓心放大）
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, R - 1, 0, TAU);
      ctx.clip();
      ctx.rotate(-o.rot);
      ctx.translate(o.mx - o.x, o.my - o.y);
      ctx.scale(CRG_MAG, CRG_MAG);
      ctx.translate(-o.mx, -o.my);
      o.inner(ctx);
      ctx.restore();
      crLens(ctx, 0, 0, R, P, t, rage, 0, 1);
      // 鼻橋：跨過吻脊拱起來
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(R - 1, -5);
      ctx.quadraticCurveTo(R + 3, -14, fx0 - fr + 1, fy0 - 3);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5.4;
      ctx.stroke();
      ctx.strokeStyle = A.c(CR.gold);
      ctx.lineWidth = 2.8;
      ctx.stroke();
      // 鏡腳：往後伸到耳孔，末端勾下去
      ctx.beginPath();
      ctx.moveTo(-R + 1, -1);
      ctx.quadraticCurveTo(-32, 2, -42, 8);
      ctx.quadraticCurveTo(-48, 12, -45, 18);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = A.c(CR.goldS);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      // 鉸鏈小鉚釘
      A.ellipse(ctx, -R + 0.5, -1, 3, 3, CR.gold, CR.goldS, { lw: 1.6, hl: false });
      // 鏡框上的苔
      crSpecMoss(ctx, -8, -R + 1, t);
      if (o.drip > 0) {
        // 剛浮上來：鏡片下緣滴水
        ctx.fillStyle = rgba('#d8f4ff', 0.85 * o.drip);
        ctx.beginPath();
        [[-6, R], [7, R - 2], [fx0, fy0 + fr]].forEach(([dx, dy], i) => {
          const qq = (t * 1.8 + i * 0.37) % 1;
          const yy = dy + qq * qq * 22;
          const rr = 2.2 - qq;
          ctx.moveTo(dx + rr, yy);
          ctx.ellipse(dx, yy, rr, rr * 1.4, 0, 0, TAU);
        });
        ctx.fill();
      }
    } else {
      // 掉在泥裡：躺平（壓扁）、兩片並排、近側那片裂得更兇
      ctx.scale(1, 0.62);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-R, 0);
      ctx.lineTo(-R - 18, 10);
      ctx.moveTo(fx0 + R, 0);
      ctx.lineTo(fx0 + R + 14, 12);
      ctx.moveTo(R - 1, -4);
      ctx.quadraticCurveTo(fx0 / 2, -12, fx0 - R + 1, -4);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = A.c(CR.goldS);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      crLens(ctx, fx0, 0, R, P, t + 1.3, false, 1.1, 0);
      crLens(ctx, 0, 0, R, P, t, false, 0, 2);
      crSpecMoss(ctx, -6, -R + 1, 0);
    }
    ctx.restore();
  }
  function fb_shroom(ctx, m) {
    const S = atk(m);
    const { fx, ph, t, rage, dead, kind } = S;
    const K = (m.h || 150) / 150;
    const P = crPal(rage);
    const breath = amt(fx.breath);
    const breathMove = !dead && (breath > 0 || kind === 'breath');
    const firing = breathMove && (ph === 'strike' || breath >= 0.999);
    const charging = breathMove && !firing;
    const jump = !dead && !!fx.jump;
    const hover = Math.max(0, num(m.hover, 0));
    const jumpMove = /jump|slam|leap/.test(kind);
    const crouch = !dead && !jump && jumpMove && ph === 'wind';
    const landed = !dead && !jump && jumpMove && ph === 'strike';
    const sumK = amt(fx.summon);
    const summon = !dead && (sumK > 0 || (kind === 'summon' && ph === 'wind'));
    const walk = S.walk && !ph && !dead;
    const hurt = S.hurt && !dead && !ph;
    const sp = dead ? 0 : clamp(num(fx.spawn, 0), 0, 1);
    const rise = sp * sp * (3 - 2 * sp);
    const blink = !dead && (t % 4.3 < 0.16 || (t + 0.3) % 11 < 0.12);

    // ── 姿勢 ──
    const br = Math.sin(t * 1.8);
    let lift = 0;
    let bsx = 1 + br * 0.008;
    let bsy = 1 - br * 0.012;
    let lean = 0;
    let headR = Math.sin(t * 1.8 - 0.6) * 0.015;
    let jaw = 0;
    let throat = 0.08 + br * 0.05;
    let tl = Math.sin(t * 1.3) * 5;
    let arch = 0;
    let lid = 0.22;
    let wide = false;
    let legs = 'rest';
    let gait = 0;
    let slapK = 0;
    let bellow = 0;
    if (walk) {
      gait = t * 7;
      lift = -Math.abs(Math.sin(gait)) * 3;
      headR += Math.sin(gait * 2) * 0.02;
      tl = Math.sin(gait) * 10;
      legs = 'walk';
    }
    if (rage) {
      jaw = 0.1 + Math.sin(t * 3) * 0.03;
      lid = 0.3;
      throat += 0.08;
    }
    if (charging) {
      headR = -0.22 * breath;
      lean = -0.05 * breath;
      jaw = 0.08 + breath * 0.5;
      throat = 0.2 + breath * 0.85 + Math.sin(t * 30) * breath * 0.03;
      lid = lerp(lid, 0.05, breath);
      bsy *= 1 + breath * 0.03;
    }
    if (firing) {
      headR = -0.08;
      lean = 0.02;
      jaw = 0.95 + Math.sin(t * 20) * 0.05;
      throat = 0.3 + Math.sin(t * 16) * 0.08;
      lid = 0;
      wide = true;
    }
    if (crouch) {
      bsx = 1.04;
      bsy = 0.9;
      lift = 3;
      headR = 0.06;
      jaw = 0.14;
      lid = 0.4;
      tl = -14 + Math.sin(t * 9) * 5;
      legs = 'crouch';
    }
    if (jump) {
      lean = -0.2;
      arch = 1;
      headR = -0.06;
      jaw = 0.6;
      lid = 0;
      wide = true;
      tl = Math.sin(t * 14) * 26 + 6;
      legs = 'jump';
      bsx = 0.97;
      bsy = 1.04;
    }
    if (landed) {
      bsx = 1.08;
      bsy = 0.88;
      headR = 0.05;
      jaw = 0.22;
      lid = 0.35;
      legs = 'crouch';
    }
    if (summon) {
      // 甩尾拍水：慢慢抬起 → 猛地拍下
      const q = (t * 1.6) % 1;
      slapK = q < 0.72 ? Math.sin((q / 0.72) * PI * 0.5) : Math.max(0, 1 - (q - 0.72) / 0.08);
      tl = -64 * slapK + 6;
      bellow = Math.max(0, Math.sin(t * 9));
      jaw = 0.16 + bellow * 0.14;
      throat = 0.35 + Math.min(1, sumK * 1.5) * 0.45 + bellow * 0.25;
      headR = -0.08 - bellow * 0.04;
      lid = 0.42;
    }
    if (hurt) {
      headR = -0.12;
      jaw = 0.34;
      lean = -0.03;
    }
    if (dead) {
      bsx = 1.06;
      bsy = 0.8;
      lift = 7;
      lean = 0.03;
      headR = 0.12;
      jaw = 0.2;
      throat = 0;
      tl = 8;
      legs = 'dead';
    }
    if (blink && !firing && !hurt && !jump) lid = 1;
    const shake = crouch || (charging && breath > 0.6) || (summon && bellow > 0.5) ? Math.sin(t * 55) * 1.3 : 0;
    const gemA = dead ? 0 : (rage ? 0.8 : 0.5) + Math.sin(t * 3) * 0.15 + (summon ? 0.3 : 0);
    // 眼鏡的動態：吐息蓄力時沿著吻滑下去（眼睛從鏡框上緣瞪出來）、受擊歪一下、跳起來時彈高、低吼時抖
    const slide = charging ? breath : firing ? 1 : 0;
    let gx = 106 + slide * 12;
    let gy = -112 + slide * 7;
    let gr = slide * 0.13;
    if (hurt) {
      gy -= 5;
      gx -= 2;
      gr += -0.22 + Math.sin(t * 40) * 0.05;
    }
    if (jump) {
      gy -= 7 + Math.sin(t * 14) * 3;
      gr -= 0.1 + Math.sin(t * 14 + 1) * 0.05;
    }
    if (crouch) gy += 1.5;
    if (landed) {
      gy += 3;
      gr += 0.06;
    }
    if (summon) gy += bellow * Math.sin(t * 60) * 1.2;
    const runeA = dead ? 0 : (rage ? 0.95 : 0.5) + Math.sin(t * 2.4) * 0.12 + (charging ? breath * 0.4 : 0) + (summon ? 0.45 : 0);
    // 背上的傘菇：召喚時發光、搖晃、最後彈出去
    const nPop = rage ? 3 : 2;
    const popK = summon ? clamp((sumK - 0.72) / 0.28, 0, 1) : 0;
    const mushGlow = summon ? clamp(sumK * 1.6, 0, 1) : 0;

    // 背脊曲線（骨板、青苔、傘菇都沿著它長）
    const b1 = cb(-104, -30 - arch * 6, -100, -72 - arch * 10, -44, -98 - arch * 14, 8, -100 - arch * 12);
    const b2 = cb(8, -100 - arch * 12, 38, -102 - arch * 8, 58, -106, 78, -100);
    const back = (s) => (s < 0.72 ? b1(s / 0.72) : b2((s - 0.72) / 0.28));
    const MUSH = [[0.4, 0.78, -0.1], [0.6, 0.66, 0.25], [0.22, 0.62, -0.35]];

    const ga0 = ctx.globalAlpha;
    ctx.save();
    ctx.scale(K, K);
    if (!dead) glow(ctx, 0, -60, 190, P.aura, (rage ? 0.2 : 0.1) + Math.sin(t * 2) * 0.03);

    // ── 沼（永遠貼地：跳起時把 hover 扣回來）──
    const poolK = sp > 0 ? clamp((1 - sp) * 1.6 + 0.35, 0, 1) : 1;
    ctx.save();
    ctx.translate(0, hover);
    ctx.scale(poolK, poolK);
    crReeds(ctx, -180, -4, 5, 76, t, 3);
    crReeds(ctx, 150, -8, 3, 60, t, 11);
    crSword(ctx, -150, -2, -0.32);
    A.shape(ctx, (c) => c.ellipse(0, 2, 204, 28, 0, 0, TAU), CR.bank, CR.bankS, { shadeY: 12, lw: 2.6 });
    ctx.fillStyle = A.c(CR.water);
    ctx.beginPath();
    ctx.ellipse(0, 1, 194, 22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = A.c(CR.waterD);
    ctx.beginPath();
    ctx.ellipse(6, 4, 168, 15, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(CR.waterL, 0.55);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.4 + i / 3) % 1;
      const rx = 160 + q * 26;
      const ry = 16 + q * 5;
      [PI * 1.08, PI * 1.62].forEach((a0) => {
        ctx.moveTo(Math.cos(a0) * rx, 2 + Math.sin(a0) * ry);
        ctx.ellipse(0, 2, rx, ry, 0, a0, a0 + PI * 0.3);
      });
    }
    ctx.stroke();
    crPad(ctx, 156, -2, 30, 8, 0.1, CR.pad, CR.padS, CR.padV);
    ctx.restore();

    // ── 本體 ──
    ctx.save();
    if (rise > 0) {
      ctx.beginPath();
      ctx.rect(-600, -900, 1200, 900);
      ctx.clip();
      ctx.translate(0, rise * 125);
      ctx.translate(150, -100);
      ctx.rotate(-rise * 0.2);
      ctx.translate(-150, 100);
    }
    ctx.translate(shake, lift);
    ctx.translate(0, -12);
    ctx.rotate(lean);
    ctx.translate(0, 12);
    ctx.scale(bsx, bsy);

    // 腿的位置：[髖, 膝, 踝, 腳掌方向]
    const wk = legs === 'walk' ? Math.sin(gait) : 0;
    const wu = legs === 'walk' ? Math.max(0, Math.cos(gait)) * 6 : 0;
    const wu2 = legs === 'walk' ? Math.max(0, -Math.cos(gait)) * 6 : 0;
    let LG;
    if (legs === 'jump') {
      const d = Math.sin(t * 9) * 3;
      LG = {
        rf: [[-74, -42], [-96, -26 + d], [-120, -12 + d], PI - 0.2],
        ff: [[28, -50], [58, -36 - d], [92, -30 - d], -0.1],
        rn: [[-60, -40], [-84, -18 - d], [-110, -2 - d], PI - 0.35],
        fn: [[46, -52], [78, -30 + d], [112, -20 + d], 0.1],
      };
    } else if (legs === 'crouch') {
      LG = {
        rf: [[-76, -40], [-54, -18], [-74, -3], 0],
        ff: [[26, -48], [18, -24], [48, -3], 0],
        rn: [[-60, -38], [-32, -14], [-56, -2], 0],
        fn: [[46, -50], [38, -22], [76, -2], 0],
      };
    } else if (legs === 'dead') {
      LG = {
        rf: [[-76, -36], [-56, -14], [-70, -2], 0.2],
        ff: [[26, -42], [18, -18], [42, -2], 0.2],
        rn: [[-60, -34], [-34, -12], [-40, 1], 0.5],
        fn: [[46, -44], [42, -18], [74, 0], 0.4],
      };
    } else {
      LG = {
        rf: [[-76, -42], [-54 - wk * 6, -18 - wu2], [-66 - wk * 12, -4 - wu2], 0],
        ff: [[26, -50], [16 + wk * 6, -26 - wu], [38 + wk * 12, -4 - wu], 0],
        rn: [[-60, -40], [-34 + wk * 6, -18 - wu], [-46 + wk * 12, -3 - wu], 0],
        fn: [[46, -52], [34 - wk * 6, -26 - wu2], [60 - wk * 12, -3 - wu2], 0],
      };
    }
    // 遠側的腿（暗色，大半被身體擋住）
    crLeg(ctx, LG.rf[0], LG.rf[1], LG.rf[2], 26, 15, P.skinD, U.mix(P.skinD, '#000000', 0.3), LG.rf[3]);
    crLeg(ctx, LG.ff[0], LG.ff[1], LG.ff[2], 22, 13, P.skinD, U.mix(P.skinD, '#000000', 0.3), LG.ff[3]);

    // ── 尾巴 ──
    const tail = cb(-94, -34 - arch * 4, -132, -32 - arch * 6, -160, -12 + tl * 0.45, -194, -10 + tl);
    const tw = (s) => 4 + 54 * Math.pow(1 - s, 1.1);
    const tailP = (c) => taper(c, tail, tw, 16);
    A.shape(ctx, tailP, P.skin, P.skinS, { cel: [0, 7], lw: 3 });
    // 尾巴下緣的淺色腹鱗＋上方深色環紋
    ctx.save();
    ctx.beginPath();
    tailP(ctx);
    ctx.clip();
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 1; i < 8; i++) {
      const s = i * 0.11;
      const a = along(tail, s, tw(s) * 0.55);
      const b = along(tail, s + 0.03, -tw(s) * 0.1);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.strokeStyle = rgba(P.spot, 0.55);
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
    crescent(ctx, tailP, 3, 4, P.rim, 0.3, [-200, -90, -90, 10]);
    // 尾脊：兩排骨棘併成一排
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const s = 0.04 + i * 0.075;
      const w = tw(s) / 2;
      const h = 4 + 7 * (1 - s);
      const a = along(tail, s - 0.028, w - 2);
      const p = along(tail, s + 0.01, w + h);
      const b = along(tail, s + 0.028, w - 2);
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo((a[0] + p[0]) / 2 - 1, (a[1] + p[1]) / 2 - 2, p[0], p[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.closePath();
    }
    ctx.fillStyle = A.c(P.scute);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ── 軀幹 ──
    const torso = (c) => crTorso(c, arch);
    // 遠側那排背甲（先畫，從身體後面探出頭）
    const scutes = (off, sh, h0) => {
      ctx.beginPath();
      for (let i = 0; i < 17; i++) {
        const s = 0.1 + i * 0.05 + sh;
        const h = h0 + Math.sin(s * PI) * 4;
        const a = along(back, s - 0.022, 3);
        const p = along(back, s, -h + off);
        const b = along(back, s + 0.022, 3);
        ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo(a[0], p[1] + 1, p[0], p[1]);
        ctx.quadraticCurveTo(b[0], p[1] + 1, b[0], b[1]);
        ctx.closePath();
      }
    };
    scutes(-3, 0.025, 8);
    ctx.fillStyle = A.c(P.scuteS);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.stroke();
    A.shape(ctx, torso, P.skin, P.skinS, { cel: [0, 9], lw: 3.4 });
    ctx.save();
    ctx.beginPath();
    torso(ctx);
    ctx.clip();
    // 淺色腹部＋橫向腹鱗
    const belly = (c) => {
      c.moveTo(-120, -14);
      c.bezierCurveTo(-60, -30 - arch * 16, 16, -30 - arch * 12, 60, -48);
      c.lineTo(100, -56);
      c.lineTo(100, 30);
      c.lineTo(-120, 30);
      c.closePath();
    };
    ctx.beginPath();
    belly(ctx);
    ctx.fillStyle = A.c(P.belly);
    ctx.fill();
    ctx.fillStyle = A.c(P.bellyS);
    ctx.fillRect(-130, -12 - arch * 14, 240, 50);
    ctx.beginPath();
    for (let x = -96; x <= 60; x += 11) {
      ctx.moveTo(x, -34 - arch * 16 + Math.abs(x) * 0.02 - (x > 20 ? (x - 20) * 0.4 : 0));
      ctx.lineTo(x + 2, 0);
    }
    ctx.strokeStyle = rgba(P.bellyS, 0.9);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-120, -14);
    ctx.bezierCurveTo(-60, -30 - arch * 16, 16, -30 - arch * 12, 60, -48);
    ctx.lineTo(100, -56);
    ctx.strokeStyle = rgba(P.skinS, 0.9);
    ctx.lineWidth = 3;
    ctx.stroke();
    // 深色斑駁
    ctx.fillStyle = rgba(P.spot, 0.5);
    ctx.beginPath();
    [[-80, -60, 12, 7, 0.4], [-50, -76, 10, 5, 0.2], [-14, -82, 12, 5, 0], [20, -84, 9, 4, -0.1], [-96, -40, 7, 9, 0.2], [52, -76, 8, 6, 0.3], [-30, -54, 7, 4, 0.1], [10, -60, 6, 3.5, 0]].forEach(([x, y, rx, ry, r]) => {
      ctx.moveTo(x + rx, y);
      ctx.ellipse(x, y, rx, ry, r, 0, TAU);
    });
    ctx.fill();
    // 身側一排排的骨質鱗甲（凸起的小橢圓）
    ctx.beginPath();
    for (let row = 0; row < 3; row++) {
      const off = 13 + row * 13;
      const n = 12 - row * 2;
      for (let i = 0; i < n; i++) {
        const s = 0.14 + (i + (row % 2) * 0.5) * (0.78 / n);
        const p = along(back, s, off);
        const rx = 5.4 - row * 0.9;
        ctx.moveTo(p[0] + rx, p[1]);
        ctx.ellipse(p[0], p[1], rx, rx * 0.62, p[2], 0, TAU);
      }
    }
    ctx.fillStyle = A.c(U.mix(P.skin, P.scute, 0.6));
    ctx.fill();
    ctx.strokeStyle = rgba(U.mix(P.skinS, '#101808', 0.4), 0.85);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    finish(ctx, torso, [-112, -110, 88, 0], { rim: P.rim, rimA: 0.26, rimW: 6, lite: '#fffbe0', liteA: 0.14, dark: '#08140a', darkA: rage ? 0.24 : 0.3, bounce: P.bounce, bounceA: rage ? 0.2 : 0.14, tex: P.spot, texA: 0.3, texN: 22, texR: 1.8, seed: 5, lw: 0 });
    ctx.restore();
    ctx.beginPath();
    torso(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.4;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 近側那排背甲
    scutes(0, 0, 7);
    ctx.fillStyle = A.c(P.scute);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = rgba(P.rim, 0.45);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < 17; i += 2) {
      const s = 0.1 + i * 0.05;
      const a = along(back, s - 0.012, -2);
      const p = along(back, s, -5 - Math.sin(s * PI) * 3);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
    // 骨板間發綠光的符文
    hotLines(ctx, (c) => {
      [[0.22, 0], [0.36, 1], [0.5, 2], [0.64, 3], [0.8, 0]].forEach(([s, k]) => {
        const p = along(back, s, 16);
        crRune(c, p[0], p[1], 4.6, k);
      });
      const q0 = along(back, 0.16, 26);
      c.moveTo(q0[0], q0[1]);
      for (let i = 1; i <= 8; i++) {
        const q = along(back, 0.16 + i * 0.08, 26 + (i % 2 ? 3 : -3));
        c.lineTo(q[0], q[1]);
      }
    }, P.rune, clamp(runeA, 0, 1), 1.8);
    // 青苔、小蕨
    const mp = (s, o) => along(back, s, o);
    let q = mp(0.3, 2);
    crMoss(ctx, q[0], q[1], 24, t, 3);
    q = mp(0.52, 2);
    crMoss(ctx, q[0], q[1], 22, t, 7);
    q = mp(0.78, 1);
    crMoss(ctx, q[0], q[1], 18, t, 11);
    q = mp(0.47, 0);
    crFern(ctx, q[0], q[1], -PI / 2 - 0.7, 26, t, 1);
    q = mp(0.16, 0);
    crFern(ctx, q[0], q[1], -PI / 2 - 0.35, 22, t, 4);
    // 背上的傘菇
    MUSH.forEach(([s, sc, r], i) => {
      if (i < nPop && popK > 0) return;
      const p = mp(s, 1);
      const wob = summon ? Math.sin(t * 30 + i * 2) * 0.14 * mushGlow : Math.sin(t * 1.6 + i) * 0.04;
      crMush(ctx, p[0], p[1], sc + (summon && i < nPop ? mushGlow * 0.1 : 0) - (dead ? 0.08 : 0), p[2] + r + wob + (dead ? r * 1.5 + 0.3 : 0), i < nPop ? mushGlow : 0);
    });

    // 近側的腿
    crLeg(ctx, LG.rn[0], LG.rn[1], LG.rn[2], 34, 17, P.skin, P.skinS, LG.rn[3]);
    crLeg(ctx, LG.fn[0], LG.fn[1], LG.fn[2], 26, 15, P.skin, P.skinS, LG.fn[3]);

    // ── 頭（以頸為軸抬頭／低頭；下顎以 H 為軸張開）──
    const HX = 66;
    const HY = -78;
    const up = jaw * 0.2;
    const dn = jaw * 0.34;
    const cu = Math.cos(-up);
    const su = Math.sin(-up);
    const cd = Math.cos(dn);
    const sd = Math.sin(dn);
    const rU = (x, y) => [HX + (x - HX) * cu - (y - HY) * su, HY + (x - HX) * su + (y - HY) * cu];
    const rD = (x, y) => [HX + (x - HX) * cd - (y - HY) * sd, HY + (x - HX) * sd + (y - HY) * cd];
    ctx.save();
    ctx.translate(40, -84);
    ctx.rotate(headR);
    ctx.translate(-40, 84);
    // 嘴裡（張開時才看得到）
    const gasC = rage ? CR.gasP : CR.gas;
    if (jaw > 0.03) {
      // 只畫嘴的後半（喉嚨＋上顎內側），前半段是空的，交錯的牙齒直接襯在背景上
      const u1 = rU(158, -79);
      const u2 = rU(110, -81);
      const d1 = rD(150, -76);
      const d2 = rD(110, -77);
      const mc = rU(146, -60);
      const mouthP = (c) => {
        c.moveTo(HX - 6, HY);
        c.quadraticCurveTo(u2[0], u2[1] + 2, u1[0], u1[1]);
        c.quadraticCurveTo(lerp(mc[0], rD(146, -60)[0], 0.5) - 20, (u1[1] + d1[1]) / 2, d1[0], d1[1]);
        c.quadraticCurveTo(d2[0], d2[1] - 2, HX - 6, HY + 2);
        c.closePath();
      };
      ctx.beginPath();
      mouthP(ctx);
      ctx.fillStyle = A.c(CR.mouth);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.4;
      ctx.stroke();
      if (breathMove) {
        ctx.save();
        ctx.beginPath();
        mouthP(ctx);
        ctx.clip();
        glow(ctx, HX + 10, HY + 4, 30 + jaw * 50, U.mix(gasC, '#ffffff', 0.3), 0.4 + breath * 0.5);
        ctx.restore();
      }
    }
    // 下顎（含喉囊）
    ctx.save();
    ctx.translate(HX, HY);
    ctx.rotate(dn);
    ctx.translate(-HX, -HY);
    const thR = 8 + throat * 16;
    const thX = 90 + throat * 4;
    const thY = -62 + thR * 0.55;
    A.shape(ctx, (c) => c.ellipse(thX, thY, 28 + throat * 12, thR, -0.08, 0, TAU), P.belly, P.bellyS, { cel: [3, thR * 0.3], lw: 2.6 });
    ctx.strokeStyle = rgba(P.bellyS, 0.85);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const yy = thY - thR * 0.2 + i * thR * 0.35;
      ctx.moveTo(thX - 22 - throat * 8, yy);
      ctx.quadraticCurveTo(thX, yy + 4, thX + 22 + throat * 8, yy - 2);
    }
    ctx.stroke();
    A.shape(ctx, crLower, P.skin, P.skinS, { cel: [0, 5], lw: 3 });
    ctx.fillStyle = A.c(U.mix(P.belly, P.skin, 0.35));
    ctx.beginPath();
    ctx.moveTo(200, -67);
    ctx.quadraticCurveTo(160, -64.5, 122, -63.5);
    ctx.bezierCurveTo(98, -61.5, 72, -54, 56, -61);
    ctx.lineTo(60, -66);
    ctx.bezierCurveTo(80, -62, 110, -67, 150, -68);
    ctx.closePath();
    ctx.fill();
    if (jaw > 0.03) {
      ctx.beginPath();
      ctx.moveTo(70, -77);
      ctx.quadraticCurveTo(140, -76, 194, -73);
      ctx.strokeStyle = A.c(CR.gum);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // 下顎邊的小凹點
    ctx.fillStyle = rgba(P.skinS, 0.9);
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const x = 100 + i * 14;
      ctx.moveTo(x + 1.2, -71);
      ctx.arc(x, -71, 1.2, 0, TAU);
    }
    ctx.fill();
    ctx.restore();

    // 上顎＋頭骨
    ctx.save();
    ctx.translate(HX, HY);
    ctx.rotate(-up);
    ctx.translate(-HX, -HY);
    const gO = { x: gx, y: gy, mx: 102 + (gx - 106) * 0.55, my: -113 + (gy + 112) * 0.55, rot: gr, P, t, rage, drip: sp > 0.05 ? Math.min(1, sp * 2) : 0 };
    if (!dead) crSpecs(ctx, 'back', gO);
    A.shape(ctx, crUpper, P.skin, P.skinS, { cel: [0, 6], lw: 3.2 });
    ctx.save();
    ctx.beginPath();
    crUpper(ctx);
    ctx.clip();
    // 吻部上緣的骨質疙瘩、頰側鱗紋
    ctx.fillStyle = rgba(U.mix(P.skin, P.scute, 0.5), 1);
    ctx.strokeStyle = rgba(P.skinS, 0.9);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const x = 124 + i * 12;
      const y = -101 + i * 0.9;
      ctx.moveTo(x + 3.2, y);
      ctx.ellipse(x, y, 3.2, 2, 0, 0, TAU);
    }
    [[62, -98, 5], [60, -88, 4.4], [72, -92, 4]].forEach(([x, y, r]) => {
      ctx.moveTo(x + r, y);
      ctx.ellipse(x, y, r, r * 0.7, 0.3, 0, TAU);
    });
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = rgba(P.skinS, 0.9);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const x = 100 + i * 12;
      ctx.moveTo(x + 1.2, -85);
      ctx.arc(x, -85 - (i % 2) * 2, 1.2, 0, TAU);
    }
    ctx.fill();
    finish(ctx, crUpper, [44, -120, 206, -74], { rim: P.rim, rimA: 0.3, rimW: 4, lite: '#fffbe0', liteA: 0.14, dark: '#08140a', darkA: 0.26, bounce: P.bounce, bounceA: 0.12, lw: 0 });
    ctx.restore();
    ctx.beginPath();
    crUpper(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 鼻孔（吻端鼻瘤上）
    ctx.fillStyle = A.c('#141a0c');
    ctx.beginPath();
    ctx.ellipse(196, -99, 3.4, 1.8, 0.3, 0, TAU);
    ctx.fill();
    // 王冠（歪戴在頭骨上）與眼
    const crownRot = -0.3 + (crouch ? 0.06 : 0) + (jump ? -0.1 : 0) + (summon ? Math.sin(t * 30) * 0.03 * bellow : 0);
    if (!dead) crCrown(ctx, 70, -116, 0.84, crownRot, P, gemA, t);
    const eyeO = { lid, wide, dead, shut: hurt, glowA: rage ? 0.6 + Math.sin(t * 4) * 0.1 : firing || charging ? 0.3 : 0 };
    crEye(ctx, 102, -113, 10, P, eyeO);
    if (!dead) {
      // 鏡框（鏡片裡放大的頭骨＋眼：暴躁老學究的大眼）
      gO.inner = (c) => {
        A.shape(c, crUpper, P.skin, P.skinS, { cel: [0, 6], lw: 3.2 });
        crEye(c, 102, -113, 10, P, eyeO);
      };
      crSpecs(ctx, 'front', gO);
      // 細金鍊：從鏡腳鉸鏈垂過臉頰，掛到王冠左端
      const hc = Math.cos(gr);
      const hs = Math.sin(gr);
      const hx = gx - (CRG_R - 0.5) * hc + hs;
      const hy = gy - (CRG_R - 0.5) * hs - hc;
      const rc = crownRot;
      const kx = 70 + 0.84 * (-31 * Math.cos(rc) - 1 * Math.sin(rc));
      const ky = -116 + 0.84 * (-31 * Math.sin(rc) + 1 * Math.cos(rc));
      const sag = 24 + Math.sin(t * 1.8) * 2 + (jump ? -10 : 0) + slide * 4;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.bezierCurveTo(hx - 6, hy + sag, kx + 8, ky + sag, kx, ky);
      ctx.setLineDash([0.01, 3.4]);
      ctx.lineCap = 'round';
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.strokeStyle = A.c(CR.gold);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    // 交錯的牙齒（上排往下、下排往上）
    ctx.beginPath();
    CR_UT.forEach(([x, L]) => {
      const y0 = -79.5 + (x > 180 ? 2 : 0);
      const a = rU(x - 2.6, y0);
      const b = rU(x + 0.4, y0 + L);
      const c2 = rU(x + 2.6, y0);
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(b[0] - 1.5, (a[1] + b[1]) / 2, b[0], b[1]);
      ctx.quadraticCurveTo(b[0] + 1, (c2[1] + b[1]) / 2, c2[0], c2[1]);
      ctx.closePath();
    });
    CR_LT.forEach(([x, L]) => {
      const y0 = -76 + (x > 180 ? 1.5 : 0);
      const a = rD(x - 2.6, y0);
      const b = rD(x + 0.4, y0 - L);
      const c2 = rD(x + 2.6, y0);
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(b[0] - 1.5, (a[1] + b[1]) / 2, b[0], b[1]);
      ctx.quadraticCurveTo(b[0] + 1, (c2[1] + b[1]) / 2, c2[0], c2[1]);
      ctx.closePath();
    });
    ctx.fillStyle = A.c(CR.tooth);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore(); // 頭

    // 低吼的震波（從喉嚨一圈圈擴散）
    if (summon && sumK < 0.95) {
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const qq = (t * 1.8 + i / 3) % 1;
        const r = 30 + qq * 70;
        ctx.strokeStyle = rgba(rage ? '#ffc0a0' : '#eaffc0', 0.75 * (1 - qq));
        ctx.lineWidth = 4 * (1 - qq) + 1;
        ctx.beginPath();
        ctx.arc(92, -54, r, -0.9, 0.7);
        ctx.stroke();
      }
    }
    // 吐息：蓄力時嘴縫漏出沼氣；噴發時一大團往前滾
    if (charging && breath > 0.4) {
      const k = (breath - 0.4) / 0.6;
      ctx.fillStyle = A.c(U.mix(gasC, '#ffffff', 0.3));
      for (let i = 0; i < 4; i++) {
        const qq = (t * 1.4 + i / 4) % 1;
        ctx.globalAlpha = ga0 * (1 - qq) * k * 0.8;
        ctx.beginPath();
        ctx.arc(150 + i * 14 + qq * 10, -90 - qq * 30 - i * 3, 3 + qq * 6, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = ga0;
    }
    if (firing) {
      for (let j = 0; j < 6; j++) {
        const qq = (t * 1.6 + j / 6) % 1;
        const x = 168 + qq * 160;
        const y = -86 + qq * 40 + Math.sin(j * 2.1 + t * 3) * 10;
        const r = 12 + qq * 22;
        ctx.globalAlpha = ga0 * Math.min(1, (1 - qq) * 1.4) * 0.85;
        puff(ctx, x, y, r, j % 2 ? U.mix(gasC, '#c8f0a0', 0.3) : U.mix(CR.gasP, gasC, rage ? 0.1 : 0.55), j % 2 ? U.mix(gasC, '#2a4a20', 0.3) : '#5a4a6a');
      }
      ctx.globalAlpha = ga0;
    }
    // 浮上來時身上往下淌的水
    if (sp > 0.05) {
      ctx.strokeStyle = rgba('#d8f4ff', 0.7 * Math.min(1, sp * 2));
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const s = 0.12 + i * 0.09;
        const p = s < 0.95 ? along(back, s, 4) : [110 + (s - 0.95) * 400, -110];
        const L = 8 + hash(i + 60) * 14;
        const o = ((t * 60 + hash(i + 61) * 40) % 30) - 6;
        ctx.moveTo(p[0], p[1] + o);
        ctx.lineTo(p[0] + 0.5, p[1] + o + L);
      }
      [[104, -122], [140, -106], [176, -100], [196, -102]].forEach(([x, y], i) => {
        const o = (t * 50 + i * 9) % 18;
        ctx.moveTo(x, y + o);
        ctx.lineTo(x, y + o + 7);
      });
      ctx.stroke();
    }
    ctx.restore(); // 本體

    // ── 沼的前緣：蓋住身體下緣的水面、小睡蓮葉、蓮花、前排蘆葦、水花 ──
    ctx.save();
    ctx.translate(0, hover);
    ctx.scale(poolK, poolK);
    ctx.fillStyle = rgba(CR.water, 0.55);
    ctx.beginPath();
    ctx.ellipse(0, -2, 194, 20, 0, 0, PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba('#d8f0e0', 0.6);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const x = -150 + i * 58 + Math.sin(t * 1.2 + i) * 6;
      ctx.moveTo(x - 14, -1);
      ctx.quadraticCurveTo(x, -3, x + 14, -1);
    }
    ctx.stroke();
    crPad(ctx, -118, 14, 24, 7, 0.3, CR.pad, CR.padS, CR.padV);
    crPad(ctx, 112, 16, 26, 8, 2.6, CR.pad, CR.padS, CR.padV);
    const lx = -118;
    const ly = 8;
    for (let i = 0; i < 5; i++) {
      const a = -PI / 2 + (i - 2) * 0.5;
      A.shape(ctx, (c) => {
        c.moveTo(lx, ly);
        c.quadraticCurveTo(lx + Math.cos(a - 0.4) * 10, ly + Math.sin(a - 0.4) * 10, lx + Math.cos(a) * 15, ly + Math.sin(a) * 13);
        c.quadraticCurveTo(lx + Math.cos(a + 0.4) * 10, ly + Math.sin(a + 0.4) * 10, lx, ly);
        c.closePath();
      }, CR.lotus, CR.lotusS, { shadeY: ly - 3, lw: 1.8 });
    }
    A.ellipse(ctx, lx, ly - 3, 3.4, 2.6, CR.flowerC, null, { lw: 1.4, hl: false });
    crReeds(ctx, 190, 14, 3, 44, t, 21);
    crReeds(ctx, -196, 16, 2, 34, t, 27);
    if (!dead) {
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rgba(rage ? '#d8b0ff' : '#c8f0b0', 0.8);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const qq = (t * 0.7 + hash(i + 40)) % 1;
        const x = -150 + hash(i + 41) * 300;
        ctx.moveTo(x + 2 + qq * 3, 10 - qq * 10);
        ctx.arc(x, 10 - qq * 10, 2 + qq * 3, 0, TAU);
      }
      ctx.stroke();
    }
    // 跳起／落地／浮上來／拍尾的水花與漣漪
    const slapHit = summon && slapK < 0.35 && (t * 1.6) % 1 > 0.72 ? 1 : 0;
    const splash = jump ? 1 - Math.min(1, hover / 160) : landed ? 1 : sp > 0 ? Math.min(1, sp * 2) : 0;
    if (splash > 0 || slapHit) {
      const cx0 = splash > 0 ? 0 : -180;
      const wd = splash > 0 ? 300 : 90;
      const k = Math.max(splash, slapHit);
      for (let i = 0; i < 12; i++) {
        const qq = (t * 1.5 + hash(i + 90)) % 1;
        const x = cx0 + (hash(i + 91) - 0.5) * wd;
        const vy = 60 + hash(i + 92) * 70;
        ctx.globalAlpha = ga0 * (1 - qq) * k;
        ctx.fillStyle = A.c(i % 3 ? '#9ac8b0' : '#6a5a3a');
        ctx.beginPath();
        ctx.ellipse(x * (0.7 + qq * 0.5), -vy * qq + 80 * qq * qq, 4 * (1 - qq) + 2, 5 * (1 - qq) + 2, 0, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = ga0;
      for (let i = 0; i < 2; i++) {
        const qq = (t * 1.2 + i * 0.5) % 1;
        ctx.strokeStyle = rgba('#d8f0e0', 0.7 * (1 - qq) * k);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx0, 2, (wd * 0.55) * (0.6 + qq * 0.6), 20 * (0.6 + qq * 0.6), 0, 0, TAU);
        ctx.stroke();
      }
    }
    // 死掉：王冠掉進泥水裡
    if (dead) {
      crCrown(ctx, 150, 10, 0.62, 0.55, P, 0, t);
      crSpecs(ctx, 'fallen', { x: 92, y: 14, rot: -0.12, P, t, rage: false });
    }
    ctx.restore();

    // ── 召喚：傘菇從背上彈出去、落到地上 ──
    if (popK > 0) {
      for (let i = 0; i < nPop; i++) {
        const [s, sc, r0] = MUSH[i];
        const p0 = along(back, s, 1);
        const tx = ((i - (nPop - 1) / 2) * 120 + 90) / K;
        const x = lerp(p0[0], tx, popK);
        const y = lerp(p0[1], 0, popK) - Math.sin(popK * PI) * 180;
        crMush(ctx, x, y, sc * (1 + popK * 0.25), r0 + popK * TAU * (i % 2 ? -1 : 1), 1 - popK * 0.5);
      }
    }
    // 暴走：身上冒出的紫綠沼氣
    if (rage && !dead) {
      for (let i = 0; i < 6; i++) {
        const qq = (t * 0.35 + hash(i + 70)) % 1;
        const x = -110 + i * 40 + Math.sin(t * 1.3 + i) * 8;
        const y = -80 - qq * 110;
        ctx.globalAlpha = ga0 * Math.sin(qq * PI) * 0.35;
        ctx.fillStyle = A.c(i % 2 ? '#b89ad8' : '#a8d890');
        ctx.beginPath();
        ctx.arc(x, y, 8 + qq * 16, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = ga0;
    }
    ctx.restore();
  }

  // ═════════════════════════ 沉船海魔 fb_kraken（240×170） ═════════════════════════
  // 巨型章魚：半截沉船船殼當鎧甲、觸手纏著生鏽錨鏈、桅杆上掛著幽綠燈籠、一顆發光的獨眼（橫瞳）。
  const KR = {
    skin: '#8e3c62', skinS: '#62264a', skinR: '#6e1834', skinRS: '#480c22', sucker: '#f2c4cc', suckerS: '#d49aa8',
    wood: '#7e5634', woodS: '#583a22', woodD: '#3e2816', iron: '#6e6a6a', ironS: '#4a4646', rust: '#a8582a',
    ghost: '#7dffc0', ghostR: '#b4ff6a', eye: '#f4ff7a', eyeR: '#ff3a2a', sail: '#cfc2a0', sailS: '#a09474',
    barn: '#d8d0c0', weed: '#3e7a4a',
  };
  function drawAnchor(ctx, s, rustK) {
    // 以錨環為原點、往下長（約 s*100 高）
    ctx.save();
    ctx.scale(s, s);
    const col = KR.iron;
    const colS = KR.ironS;
    A.shape(ctx, (c) => {
      c.ellipse(0, 0, 12, 12, 0, 0, TAU);
      c.moveTo(6, 0);
      c.ellipse(0, 0, 6, 6, 0, 0, TAU, true);
    }, col, colS, { lw: 2.6 });
    A.shape(ctx, (c) => A.roundRect(c, -28, 16, 56, 10, 4), col, colS, { lw: 2.6, shadeY: 21 });
    A.shape(ctx, (c) => A.roundRect(c, -6, 10, 12, 80, 4), col, colS, { lw: 2.6, cel: [3, 0] });
    A.shape(ctx, (c) => {
      c.moveTo(-50, 58);
      c.quadraticCurveTo(-44, 98, 0, 98);
      c.quadraticCurveTo(44, 98, 50, 58);
      c.lineTo(62, 64);
      c.lineTo(52, 44);
      c.lineTo(38, 58);
      c.lineTo(44, 60);
      c.quadraticCurveTo(38, 84, 0, 86);
      c.quadraticCurveTo(-38, 84, -44, 60);
      c.lineTo(-38, 58);
      c.lineTo(-52, 44);
      c.lineTo(-62, 64);
      c.closePath();
    }, col, colS, { lw: 2.8, shadeY: 80 });
    // 鏽斑
    ctx.fillStyle = A.c(KR.rust);
    ctx.globalAlpha *= 0.55 + 0.45 * (rustK || 0);
    [[-2, 40, 4, 7], [2, 70, 4, 6], [-30, 84, 7, 3.5], [24, 88, 6, 3], [-14, 20, 5, 2.5]].forEach(([x, y, a, b]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, a, b, 0, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }
  function lantern(ctx, x, y, t, col, k) {
    // 以吊環為原點
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 1.8) * 0.18);
    glow(ctx, 0, 24, 46 * k, col, 0.55 * k);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 8);
    ctx.stroke();
    A.shape(ctx, (c) => {
      c.moveTo(-10, 8);
      c.lineTo(10, 8);
      c.lineTo(14, 14);
      c.lineTo(-14, 14);
      c.closePath();
    }, KR.iron, null, { lw: 2.2 });
    A.shape(ctx, (c) => A.roundRect(c, -11, 14, 22, 24, 5), U.mix(col, '#ffffff', 0.25), col, { lw: 2.4, shadeY: 30 });
    flame(ctx, 0, 34, 5, 16 * (0.8 + 0.2 * k), t, 3, col, '#ffffff', 1.6);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, 38);
    ctx.stroke();
    A.shape(ctx, (c) => {
      c.moveTo(-14, 38);
      c.lineTo(14, 38);
      c.lineTo(8, 44);
      c.lineTo(-8, 44);
      c.closePath();
    }, KR.iron, null, { lw: 2.2 });
    ctx.restore();
  }
  function tentacle(ctx, fn, w0, col, colS, o) {
    o = o || {};
    w0 *= 1.18;
    const wf = (s) => w0 * (1 - s * 0.86);
    const side = o.side || 1;
    if (o.glowTip) {
      const p = fn(0.92);
      glow(ctx, p[0], p[1], w0 * 1.8, o.glowTip, o.glowA || 0.6);
    }
    const path = (c) => taper(c, fn, wf, 22);
    A.shape(ctx, path, col, colS, { cel: [w0 * 0.12, w0 * 0.12], lw: 3 });
    if (!o.back) {
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    // 淺色的腹面（吸盤那一側）
    ctx.beginPath();
    taper(ctx, (q) => {
      const p = along(fn, q, side * wf(q) * 0.3);
      return [p[0], p[1]];
    }, (q) => wf(q) * 0.5, 18);
    ctx.fillStyle = A.c(U.mix(col, '#ffc8d4', 0.32));
    ctx.fill();
    // 背面的深色斑紋與舊傷疤
    ctx.fillStyle = A.c(colS);
    for (let i = 0; i < 6; i++) {
      const q = 0.08 + i * 0.14 + hash(i + (o.seed || 0)) * 0.04;
      const p = along(fn, q, -side * wf(q) * (0.18 + hash(i + 3) * 0.14));
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], wf(q) * 0.12, wf(q) * 0.08, p[2], 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = A.c(U.mix(col, '#ffe0e6', 0.55));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 2; i++) {
      const q = 0.22 + i * 0.3 + hash((o.seed || 0) + 11 + i) * 0.1;
      const p1 = along(fn, q, -side * wf(q) * 0.42);
      const p2 = along(fn, q + 0.06, -side * wf(q) * 0.05);
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      for (let k = 1; k < 4; k++) {
        const x = lerp(p1[0], p2[0], k / 4);
        const y = lerp(p1[1], p2[1], k / 4);
        ctx.moveTo(x - 2.5, y - 2.5);
        ctx.lineTo(x + 2.5, y + 2.5);
      }
    }
    ctx.stroke();
    ctx.restore();
    }
    // 背側的亮邊（邊緣光）：沿著背緣內側一條淡淡的亮線，不用裁切比較省
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const q = i / 14 * 0.9;
      const p = along(fn, q, -side * wf(q) * 0.36);
      if (!i) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.strokeStyle = rgba('#ffd6e4', 0.3);
    ctx.lineWidth = Math.max(2, w0 * 0.12);
    ctx.stroke();
    // 兩排吸盤（外排大、內排小）：一次畫完同一種東西
    const cups = [];
    for (let i = 1; i <= 8; i++) {
      const s = 0.06 + i * 0.1;
      if (s > 0.93) break;
      const p = along(fn, s, side * wf(s) * 0.36);
      cups.push([p[0], p[1], wf(s) * 0.21, p[2], 1]);
      const q = s + 0.05;
      if (q < 0.9) {
        const p2 = along(fn, q, side * wf(q) * 0.1);
        cups.push([p2[0], p2[1], wf(q) * 0.12, p2[2], 0]);
      }
    }
    ctx.beginPath();
    cups.forEach(([x, y, r, a]) => {
      ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.ellipse(x, y, r, r * 0.8, a, 0, TAU);
    });
    ctx.fillStyle = A.c(KR.sucker);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    cups.forEach(([x, y, r]) => {
      ctx.moveTo(x + r * 0.42, y);
      ctx.arc(x, y, r * 0.42, 0, TAU);
    });
    ctx.fillStyle = A.c(KR.suckerS);
    ctx.fill();
    ctx.beginPath();
    cups.forEach(([x, y, r, a, big]) => {
      if (!big) return;
      ctx.moveTo(x - r * 0.35 + r * 0.18, y - r * 0.35);
      ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, TAU);
    });
    ctx.fillStyle = A.c('#fff2f4');
    ctx.fill();
  }
  // 砲門（方框＋砲口正對畫面）
  function cannonPort(ctx, x, y, s, glowCol, k) {
    A.shape(ctx, (c) => A.roundRect(c, x - 11 * s, y - 10 * s, 22 * s, 20 * s, 3), KR.woodD, null, { lw: 2.4 });
    ctx.fillStyle = A.c('#140c08');
    ctx.fillRect(x - 7 * s, y - 6 * s, 14 * s, 12 * s);
    A.ellipse(ctx, x, y + 1 * s, 8 * s, 8 * s, KR.iron, KR.ironS, { lw: 2.2, hl: [x - 3 * s, y - 3 * s, 2.4 * s, 1.6 * s] });
    ctx.strokeStyle = A.c('#8e8888');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y + 1 * s, 6 * s, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = A.c('#0a0606');
    ctx.beginPath();
    ctx.arc(x, y + 1 * s, 4 * s, 0, TAU);
    ctx.fill();
    if (k > 0) glow(ctx, x, y + 1 * s, 10 * s, glowCol, 0.7 * k);
  }
  // 繩索（兩點之間、帶麻繩紋路）
  function rope(ctx, x1, y1, x2, y2, sag) {
    const fn = qb(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2 + sag, x2, y2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const p = fn(i / 10);
      if (!i) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4.4;
    ctx.stroke();
    ctx.strokeStyle = A.c('#c0a070');
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = A.c('#7a5a34');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 14; i++) {
      const p = along(fn, i / 14, 0);
      ctx.moveTo(p[0] - Math.cos(p[2] + 0.8) * 2, p[1] - Math.sin(p[2] + 0.8) * 2);
      ctx.lineTo(p[0] + Math.cos(p[2] + 0.8) * 2, p[1] + Math.sin(p[2] + 0.8) * 2);
    }
    ctx.stroke();
  }
  function fb_kraken(ctx, m) {
    const S = atk(m);
    const { fx, ph, t, rage, dead, kind } = S;
    const K = (m.h || 170) / 170;
    const slam = amt(fx.slam);
    const slamDown = slam > 0 && ph === 'strike';
    const slamUp = slam > 0 && !slamDown;
    const ink = !!fx.ink;
    const anchorAtk = /anchor|throw/.test(kind) || amt(fx.throw) > 0 || !!fx.throwing;
    const anchorWind = anchorAtk && ph !== 'strike' && ph !== 'recover';
    const anchorGone = anchorAtk && (ph === 'strike' || ph === 'recover');
    const genericWind = ph === 'wind' && !slam && !ink && !anchorAtk && kind !== 'tentacle';
    const walk = S.walk && !ph;
    const hurt = S.hurt;
    const skin = rage ? KR.skinR : KR.skin;
    const skinS = rage ? KR.skinRS : KR.skinS;
    const gh = rage ? KR.ghostR : KR.ghost;
    const heat = dead ? 0 : clamp(0.55 + Math.sin(t * 2.5) * 0.15 + (rage ? 0.5 : 0) + (slam ? slam * 0.4 : 0), 0, 1.3);
    const bob = dead ? 8 : Math.sin(t * 1.6) * 3 + (walk ? Math.sin(t * 7) * 2 : 0);
    const squeeze = ink ? 0.1 + Math.sin(t * 14) * 0.03 : 0;
    const shake = (slamUp && slam > 0.6) || genericWind ? Math.sin(t * 50) * 1.8 : 0;

    ctx.save();
    ctx.scale(K, K);
    ctx.translate(shake, 0);
    if (!dead) glow(ctx, 0, -80, 170, rage ? '#60ff80' : '#3aa0a0', (rage ? 0.32 : 0.18) + Math.sin(t * 2) * 0.04);

    // ── 桅杆（最後面）＋破帆＋燈籠 ──
    ctx.save();
    ctx.translate(0, bob * 0.6);
    const mx = -78;
    limb(ctx, (c) => {
      c.moveTo(mx + 10, -90);
      c.lineTo(mx - 16, -196);
    }, 15, KR.wood);
    // 斷口
    A.shape(ctx, (c) => {
      c.moveTo(mx - 22, -194);
      c.lineTo(mx - 18, -206);
      c.lineTo(mx - 14, -198);
      c.lineTo(mx - 10, -207);
      c.lineTo(mx - 9, -194);
      c.closePath();
    }, KR.wood, null, { lw: 2.2 });
    // 橫桁
    const spY = -176;
    limb(ctx, (c) => {
      c.moveTo(mx - 84, spY + 12);
      c.lineTo(mx + 40, spY - 3);
    }, 10, KR.woodS);
    // 破帆
    const sw = Math.sin(t * 2.2) * 5;
    A.shape(ctx, (c) => {
      c.moveTo(mx - 46, spY + 10);
      c.lineTo(mx + 8, spY + 3);
      c.quadraticCurveTo(mx + 6 + sw, spY + 40, mx + 2 + sw, spY + 58);
      c.lineTo(mx - 8 + sw, spY + 44);
      c.lineTo(mx - 16 + sw, spY + 62);
      c.lineTo(mx - 26 + sw, spY + 40);
      c.lineTo(mx - 36 + sw, spY + 54);
      c.quadraticCurveTo(mx - 44, spY + 30, mx - 46, spY + 10);
      c.closePath();
    }, rage ? '#8a8068' : KR.sail, KR.sailS, { cel: [4, 3], lw: 2.6 });
    // 帆上的骷髏記號
    ctx.fillStyle = A.c('#3a2a2a');
    ctx.beginPath();
    ctx.arc(mx - 20 + sw * 0.5, spY + 24, 7, 0, TAU);
    ctx.fill();
    ctx.fillRect(mx - 24 + sw * 0.5, spY + 28, 8, 6);
    ctx.strokeStyle = A.c('#3a2a2a');
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(mx - 30 + sw * 0.5, spY + 34);
    ctx.lineTo(mx - 10 + sw * 0.5, spY + 42);
    ctx.moveTo(mx - 10 + sw * 0.5, spY + 34);
    ctx.lineTo(mx - 30 + sw * 0.5, spY + 42);
    ctx.stroke();
    // 帆上的破洞與縫補
    ctx.fillStyle = A.c('#2a2018');
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(mx - 4 + sw * 0.7, spY + 30, 4, 6, 0.4, 0, TAU);
    ctx.ellipse(mx - 36 + sw * 0.4, spY + 22, 3, 4, -0.3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    A.shape(ctx, (c) => A.roundRect(c, mx - 42 + sw * 0.6, spY + 36, 12, 10, 2), '#b09a6a', null, { lw: 1.6 });
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      ctx.moveTo(mx - 41 + sw * 0.6 + k * 3.4, spY + 34);
      ctx.lineTo(mx - 40 + sw * 0.6 + k * 3.4, spY + 38);
    }
    ctx.stroke();
    // 桅頂的破旗
    const fw = Math.sin(t * 5) * 4;
    A.shape(ctx, (c) => {
      c.moveTo(mx - 15, -196);
      c.quadraticCurveTo(mx - 34, -200 + fw, mx - 50, -196 + fw);
      c.lineTo(mx - 42, -190 + fw * 0.5);
      c.lineTo(mx - 50, -184 + fw);
      c.quadraticCurveTo(mx - 32, -186 + fw * 0.5, mx - 14, -184);
      c.closePath();
    }, rage ? '#6a1020' : '#2a2a34', null, { lw: 2 });
    // 桅杆上的索具：繩梯斜拉到船殼兩側
    rope(ctx, mx - 16, -190, -104, -80, 10);
    rope(ctx, mx - 14, -186, 20, -104, 8);
    rope(ctx, mx - 84, spY + 12, -100, -84, 6);
    for (let k = 1; k < 5; k++) {
      const q = k / 5;
      rope(ctx, lerp(mx - 16, -104, q), lerp(-190, -80, q) + 3, lerp(mx - 14, 20, q) - 6, lerp(-186, -104, q), 2);
    }
    // 瞭望台殘骸
    A.shape(ctx, (c) => {
      c.moveTo(mx - 30, -156);
      c.lineTo(mx + 4, -160);
      c.lineTo(mx + 2, -150);
      c.lineTo(mx - 28, -146);
      c.closePath();
    }, KR.woodS, KR.woodD, { lw: 2.2, shadeY: -152 });
    ctx.restore();

    // ── 舉起來的觸手（拍地預備）在身體後面 ──
    const rise = slamUp ? slam : genericWind ? 0.5 : 0;
    const bigTent = (side) => {
      // side: -1 後（左）、+1 前（右）
      const bx = side < 0 ? -40 : 34;
      const by = -70 + bob;
      let fn;
      if (slamDown) {
        const tx = side < 0 ? -122 : 138;
        fn = cb(bx, by, bx + side * 40, by - 90, tx - side * 10, -120, tx, 0);
      } else {
        const wv = Math.sin(t * 5 + side) * 12;
        const topY = lerp(-150, -250, rise);
        const tx = bx + side * lerp(70, 40, rise) + wv;
        fn = cb(bx, by, bx + side * 60, by - 40, tx + side * 40, topY + 30, tx - side * 20 + wv, topY - 10 * rise);
      }
      tentacle(ctx, fn, 30, skin, skinS, { side: -side, glowTip: rise > 0.2 || slamDown ? gh : null, glowA: 0.4 + rise * 0.5 });
      if (slamDown) {
        // 鑽進地裡：土塊
        const tx = side < 0 ? -122 : 138;
        for (let i = 0; i < 5; i++) {
          const q = (t * 2.5 + i / 5) % 1;
          const x = tx + (i - 2) * 10 + (i - 2) * q * 18;
          const y = -4 - Math.sin(q * PI) * (22 + i * 4);
          A.shape(ctx, (c) => {
            c.moveTo(x - 5, y);
            c.lineTo(x, y - 5);
            c.lineTo(x + 5, y);
            c.lineTo(x, y + 4);
            c.closePath();
          }, '#7a5a3a', null, { lw: 1.6 });
        }
        A.shape(ctx, (c) => c.ellipse(tx, -2, 26, 9, 0, PI, TAU), '#6a4a30', null, { lw: 2.4 });
      }
    };
    if (rise > 0 || slamDown) bigTent(-1);

    // ── 身體（外套膜）──
    ctx.save();
    ctx.translate(0, bob);
    const mcx = -6;
    const mcy = -104;
    ctx.save();
    ctx.translate(mcx, mcy + 40);
    ctx.scale(1 - squeeze, 1 + squeeze * 1.4);
    ctx.rotate(-0.12);
    ctx.translate(-mcx, -(mcy + 40));
    const mantle = (c) => {
      c.moveTo(-76, -80);
      c.bezierCurveTo(-104, -170, -40, -206, 14, -198);
      c.bezierCurveTo(72, -190, 96, -140, 78, -84);
      c.closePath();
    };
    // 外套膜上的骨刺（往後彎）
    [[-66, -160, -1.0, 26], [-40, -188, -0.7, 34], [-8, -200, -0.45, 38], [26, -196, -0.2, 30]].forEach(([x, y, a, L]) => {
      horn(ctx, qb(x, y + 10, x + Math.cos(a - PI / 2) * L * 0.6, y + Math.sin(a - PI / 2) * L * 0.6, x + Math.cos(a - PI / 2 - 0.5) * L, y + Math.sin(a - PI / 2 - 0.5) * L), 14, '#e6dcc4', '#b4a484', '#4a3030', rage ? 0.7 : 0, gh);
    });
    A.shape(ctx, mantle, skin, skinS, { cel: [12, 8], hl: [-30, -165, 18, 9], lw: 3.4 });
    ctx.save();
    ctx.beginPath();
    mantle(ctx);
    ctx.clip();
    // 斑點
    ctx.fillStyle = A.c(skinS);
    [[-52, -138, 8], [-20, -176, 7], [-62, -108, 5], [52, -168, 5], [-34, -118, 5], [-4, -150, 4]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    });
    // 魔化裂紋
    hotLines(ctx, (c) => {
      crack(c, -60, -96, -1.1, 50, 3, 41);
      crack(c, 10, -194, 1.9, 50, 3, 43);
      if (rage) crack(c, 60, -150, 2.4, 44, 3, 47);
    }, gh, heat, rage ? 3.2 : 2.4);
    // 頭頂一道道隆起的肉脊（亮邊＋暗邊，做出厚度）
    for (let k = 0; k < 4; k++) {
      const off = 14 + k * 17;
      const r1 = qb(-80 + off * 0.3, -150 + k * 10, -24 + k * 6, -214 + off, 60 - k * 6, -176 + k * 12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const p = r1(i / 12);
        if (!i) ctx.moveTo(p[0], p[1] + 3);
        else ctx.lineTo(p[0], p[1] + 3);
      }
      ctx.strokeStyle = A.c(U.mix(skinS, '#000000', 0.25));
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const p = r1(i / 12);
        if (!i) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.strokeStyle = A.c(U.mix(skin, '#ffd0e0', 0.3));
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    // 肉疣
    [[-40, -140], [-18, -120], [30, -176], [-56, -160], [6, -130], [60, -140]].forEach(([x, y], i) => {
      const r = 3 + hash(i + 70) * 3;
      ctx.fillStyle = A.c(skinS);
      ctx.beginPath();
      ctx.arc(x + 1, y + 1, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = A.c(U.mix(skin, '#ffd0e0', 0.25));
      ctx.beginPath();
      ctx.arc(x, y, r * 0.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU);
      ctx.fill();
    });
    // 舊傷疤（縫線）
    ctx.strokeStyle = A.c(U.mix(skin, '#ffe8ec', 0.55));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-70, -130);
    ctx.lineTo(-44, -100);
    for (let k = 1; k < 5; k++) {
      const x = lerp(-70, -44, k / 5);
      const y = lerp(-130, -100, k / 5);
      ctx.moveTo(x - 4, y + 3);
      ctx.lineTo(x + 4, y - 3);
    }
    ctx.stroke();
    ctx.restore();
    finish(ctx, mantle, [-104, -206, 96, -80], { rim: '#ffd6e4', rimA: 0.34, dark: '#1a0410', darkA: 0.38, bounce: gh, bounceA: 0.22, tex: skinS, texA: 0.3, seed: 3, lw: 3.4 });
    barnacles(ctx, -70, -122, 4, 5, 3);
    barnacles(ctx, 52, -104, 3, 4, 8);
    starfish(ctx, -36, -176, 8, 0.3, '#f08a4a', '#c05a2a');
    weed(ctx, -74, -92, 22, t, 1, '#3e7a4a', '#2a5634');
    // 噴墨管（左後）
    A.shape(ctx, (c) => {
      c.moveTo(-66, -96);
      c.quadraticCurveTo(-94, -98, -102, -86 - squeeze * 30);
      c.lineTo(-96, -76);
      c.quadraticCurveTo(-84, -84, -64, -82);
      c.closePath();
    }, skin, skinS, { lw: 2.6, shadeY: -86 });
    ctx.restore();
    if (ink && !dead) {
      for (let i = 0; i < 6; i++) {
        const q = (t * 2 + i / 6) % 1;
        const x = -104 - q * 60;
        const y = -82 - Math.sin(i * 2.1) * 10 - q * 20;
        const r = 6 + q * 18;
        ctx.globalAlpha = (1 - q) * 0.9;
        A.shape(ctx, (c) => c.arc(x, y, r, 0, TAU), '#2a1a3a', '#1a0e26', { lw: 2, shadeY: y + r * 0.3 });
        ctx.globalAlpha = 1;
      }
    }

    // ── 獨眼 ──
    const ex = 42;
    const ey = -152;
    const eyeCol = rage ? KR.eyeR : KR.eye;
    const eg = dead ? 0 : 0.9 + Math.sin(t * 4) * 0.12 + (rage ? 0.4 : 0);
    const open = dead ? 0.08 : hurt ? 0.3 : ink ? 0.45 : slamUp || genericWind || anchorWind ? 1.08 : 0.85 + (m.blink ? -0.7 : 0);
    glow(ctx, ex, ey, 60, eyeCol, 0.45 * eg);
    A.ellipse(ctx, ex, ey, 36, 33, skinS, null, { lw: 3, hl: false });
    const eyeball = (c) => c.ellipse(ex + 2, ey, 29, 26 * open, 0, 0, TAU);
    A.shape(ctx, eyeball, eyeCol, U.mix(eyeCol, '#ff8a00', 0.45), { lw: 2.8, shadeY: ey + 8 });
    if (open > 0.15) {
      ctx.save();
      ctx.beginPath();
      eyeball(ctx);
      ctx.clip();
      glow(ctx, ex + 2, ey, 22, '#ffffff', 0.7 * eg);
      // 外圈的血紅虹膜
      ctx.strokeStyle = A.c(rage ? '#8a0a0a' : '#e0561e');
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(ex + 2, ey, 25, 22 * open, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c(rage ? '#ffb0a0' : '#c0402a');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + 0.3;
        ctx.moveTo(ex + 2 + Math.cos(a) * 24, ey + Math.sin(a) * 21 * open);
        ctx.lineTo(ex + 2 + Math.cos(a + 0.15) * 14, ey + Math.sin(a + 0.15) * 12 * open);
      }
      ctx.stroke();
      // 橫向的山羊瞳
      const look = Math.sin(t * 0.7) * 3 + 4;
      A.shape(ctx, (c) => {
        c.moveTo(ex - 14 + look, ey);
        c.quadraticCurveTo(ex + 2 + look, ey - 9, ex + 18 + look, ey);
        c.quadraticCurveTo(ex + 2 + look, ey + 9, ex - 14 + look, ey);
        c.closePath();
      }, '#140608', null, { noStroke: true });
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(ex - 8, ey - 9 * open, 4, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // 厚重的眉骨（往前下壓，很兇）
    const bl = open > 1 ? 5 : 0;
    A.shape(ctx, (c) => {
      c.moveTo(ex - 40, ey - 36);
      c.quadraticCurveTo(ex + 4, ey - 46, ex + 40, ey - 8 - bl);
      c.lineTo(ex + 30, ey - 2 - bl);
      c.quadraticCurveTo(ex + 4, ey - 24 - bl, ex - 32, ey - 20);
      c.closePath();
    }, skinS, rage ? '#300814' : '#3e1430', { lw: 2.8, shadeY: ey - 22 });
    // 眼下的血絲疤
    ctx.strokeStyle = A.c(rage ? '#ff5a3a' : '#c04a6a');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex - 26, ey + 22);
    ctx.lineTo(ex - 18, ey + 30);
    ctx.lineTo(ex - 22, ey + 38);
    ctx.stroke();
    // 甲板上方露出的鳥喙大口（一排尖牙）
    const jawO = dead ? 2 : slamUp || genericWind || anchorWind ? 16 : ink ? 4 : 8 + Math.sin(t * 2) * 2;
    A.shape(ctx, (c) => {
      c.moveTo(ex - 12, ey + 36);
      c.quadraticCurveTo(ex + 24, ey + 30, ex + 46, ey + 34);
      c.lineTo(ex + 40, ey + 36 + jawO);
      c.quadraticCurveTo(ex + 14, ey + 40 + jawO, ex - 8, ey + 38);
      c.closePath();
    }, '#240a1a', null, { lw: 2.6 });
    glow(ctx, ex + 18, ey + 38, 16, gh, 0.35 * (jawO / 16));
    ctx.fillStyle = A.c('#f0e6cc');
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      const x = ex - 6 + i * 8.4;
      const y0 = ey + 31 + Math.abs(i - 3) * 0.6;
      ctx.beginPath();
      ctx.moveTo(x - 3, y0);
      ctx.lineTo(x, y0 + 7 + (i % 2) * 3);
      ctx.lineTo(x + 3, y0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // ── 地上的觸手（後排）──
    const walkPh = walk ? t * 6 : t * 1.5;
    const gtent = (bx, dir, len, seed, w) => {
      const wv = Math.sin(walkPh + seed) * (walk ? 10 : 5);
      const tx = bx + dir * len;
      return cb(bx, -34, bx + dir * len * 0.35, 6, tx - dir * 20, 2 + wv * 0.3, tx + wv * 0.4, -18 - Math.abs(wv));
    };
    tentacle(ctx, gtent(-66, -1, 70, 5, 24), 24, skinS, KR.skinRS, { side: 1, seed: 4, back: true });
    tentacle(ctx, gtent(-50, -1, 80, 0, 28), 28, skinS, KR.skinRS, { side: 1, seed: 1, back: true });
    tentacle(ctx, gtent(-20, -1, 94, 2, 30), 30, skin, skinS, { side: 1 });

    // 錨鏈：纏在後面的觸手上
    chain(ctx, -40, -40, -100, -14, 12, 5, KR.iron, KR.ironS);

    // ── 沉船船殼鎧甲 ──
    const hull = (c) => {
      c.moveTo(-94, -104);
      c.lineTo(-80, -96);
      c.lineTo(-86, -86);
      c.lineTo(-70, -84);
      c.lineTo(-64, -98);
      c.lineTo(66, -110);
      c.quadraticCurveTo(112, -112, 118, -96);
      c.bezierCurveTo(112, -54, 70, -24, 20, -22);
      c.lineTo(-60, -24);
      c.quadraticCurveTo(-92, -30, -100, -58);
      c.lineTo(-92, -66);
      c.lineTo(-104, -76);
      c.closePath();
    };
    A.shape(ctx, hull, rage ? '#6a4630' : KR.wood, KR.woodS, { cel: [8, 8], lw: 3.4 });
    ctx.save();
    ctx.beginPath();
    hull(ctx);
    ctx.clip();
    // 船板
    ctx.strokeStyle = A.c(KR.woodD);
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const y = -96 + i * 15;
      ctx.beginPath();
      ctx.moveTo(-110, y + 4);
      ctx.quadraticCurveTo(10, y + 10 + i * 2, 130, y - 6 + i * 4);
      ctx.stroke();
    }
    // 鐵箍與鉚釘
    [[-40, 0], [44, 0]].forEach(([x]) => {
      A.shape(ctx, (c) => {
        c.moveTo(x - 7, -120);
        c.lineTo(x + 7, -120);
        c.quadraticCurveTo(x + 12, -60, x + 8, 0);
        c.lineTo(x - 6, 0);
        c.quadraticCurveTo(x - 2, -60, x - 7, -120);
        c.closePath();
      }, KR.iron, KR.ironS, { lw: 2.2, cel: [2, 0] });
      ctx.fillStyle = A.c('#9a9494');
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.arc(x + k * 0.8, -96 + k * 15, 2, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = A.c(KR.rust);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(x + 2, -58, 4, 9, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    // 船殼破洞裡的魔化光
    hotLines(ctx, (c) => {
      crack(c, 90, -100, 2.3, 40, 3, 51);
      crack(c, -10, -34, -1.3, 30, 2, 53);
      if (rage) {
        crack(c, -80, -80, 0.2, 40, 3, 57);
        crack(c, 60, -40, -2.3, 36, 3, 59);
      }
    }, gh, heat, rage ? 3.4 : 2.4);
    // 藤壺與海草
    [[-74, -40], [-64, -34], [100, -80], [8, -30], [16, -34]].forEach(([x, y]) => {
      A.shape(ctx, (c) => {
        c.moveTo(x - 5, y + 3);
        c.lineTo(x - 3, y - 4);
        c.lineTo(x + 3, y - 4);
        c.lineTo(x + 5, y + 3);
        c.closePath();
      }, KR.barn, null, { lw: 1.6 });
    });
    ctx.restore();
    finish(ctx, hull, [-104, -112, 118, -22], { rim: '#ffe6b8', rimA: 0.32, dark: '#140a04', darkA: 0.36, bounce: gh, bounceA: 0.18, tex: KR.woodD, texA: 0.32, seed: 5, lw: 3.4 });
    barnacles(ctx, -84, -44, 4, 5, 11);
    barnacles(ctx, 92, -62, 3, 4.5, 15);
    barnacles(ctx, 30, -32, 2, 4, 19);
    starfish(ctx, 70, -88, 7, -0.4, '#ffb04a', '#c8782a');
    [-70, -40, 6, 44, 84].forEach((x, i) => weed(ctx, x, x < 0 ? -30 : -28, 18 + hash(i + 4) * 22, t, i * 1.7, i % 2 ? '#4a8a4a' : '#3a6e3e', '#285030'));
    // 甲板的欄杆（船緣上方一排短柱＋扶手）
    ctx.save();
    const railY = (x) => lerp(-98, -110, (x + 64) / 130);
    for (let x = -60; x <= 60; x += 13) {
      A.shape(ctx, (c) => A.roundRect(c, x - 2.5, railY(x) - 13, 5, 13, 2), KR.woodS, null, { lw: 1.6 });
    }
    limb(ctx, (c) => {
      c.moveTo(-64, railY(-64) - 14);
      c.lineTo(34, railY(34) - 14);
    }, 7, KR.wood);
    limb(ctx, (c) => {
      c.moveTo(44, railY(44) - 14);
      c.lineTo(66, railY(66) - 16);
    }, 7, KR.wood);
    ctx.restore();
    // 砲門
    cannonPort(ctx, -40, -76, 1, gh, rage && !dead ? 0.6 + 0.4 * Math.sin(t * 6) : 0);
    cannonPort(ctx, 28, -84, 0.9, gh, rage && !dead ? 0.6 + 0.4 * Math.sin(t * 6 + 1) : 0);
    // 水線上一整排的藤壺殼
    for (let i = 0; i < 12; i += 2) {
      const x = -86 + i * 15 + hash(i + 300) * 5;
      const y = x < 20 ? -28 - hash(i) * 3 : -28 - (x - 20) * 0.35;
      barnacles(ctx, x, y, 2, 3.2 + hash(i + 301) * 1.5, 40 + i);
    }
    // 垂在船殼上的鐵鏈
    chain(ctx, -92, -70, 10, -42, 18, 4, KR.iron, KR.ironS);
    // 舷窗（發幽光）
    [[-6, -70], [62, -74], [88, -84]].forEach(([x, y], i) => {
      const k = dead ? 0 : 0.7 + 0.3 * Math.sin(t * 3 + i * 2) + (rage ? 0.4 : 0);
      glow(ctx, x, y, 30, gh, 0.6 * k);
      A.ellipse(ctx, x, y, 11, 11, KR.iron, KR.ironS, { lw: 2.6, hl: false });
      A.ellipse(ctx, x, y, 7, 7, dead ? '#2a3a34' : U.mix(gh, '#ffffff', 0.35), null, { lw: 1.8, hl: false });
      if (rage && !dead) flame(ctx, x + 2, y - 4, 6, 20, t, i + 4, gh, '#f0ffe0', 1.8);
    });
    // 船首的斷掉的船首像（尖角）
    A.shape(ctx, (c) => {
      c.moveTo(108, -102);
      c.lineTo(146, -120);
      c.lineTo(134, -104);
      c.lineTo(118, -92);
      c.closePath();
    }, KR.woodS, null, { lw: 2.6 });
    // 海草從船緣垂下
    ctx.strokeStyle = A.c(KR.weed);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    [[-58, -98], [30, -106], [84, -110]].forEach(([x, y], i) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 6 + Math.sin(t * 2 + i) * 4, y + 12, x + 2, y + 24 + i * 4);
      ctx.stroke();
    });
    ctx.restore();

    // ── 燈籠（掛在橫桁尖端）──
    lantern(ctx, mx - 78, spY + 10 + bob * 0.6, t, gh, dead ? 0.2 : 0.9 + (rage ? 0.3 : 0));

    // ── 前排觸手 ──
    tentacle(ctx, gtent(20, 1, 80, 1, 30), 30, skin, skinS, { side: -1 });
    tentacle(ctx, gtent(56, 1, 72, 3, 26), 26, skin, skinS, { side: -1, seed: 7 });
    tentacle(ctx, gtent(-4, 1, 110, 5, 30), 30, skin, skinS, { side: -1, seed: 9 });
    if (rise > 0 || slamDown) bigTent(1);

    // ── 抓著錨的觸手 ──
    if (!(slamUp || slamDown)) {
      let fn;
      let ax;
      let ay;
      let ar;
      if (anchorWind) {
        const sw2 = Math.sin(t * 9) * 0.3;
        fn = cb(70, -60 + bob, 110, -120, 60, -200, 10, -214);
        ax = 10;
        ay = -214;
        ar = 2.4 + sw2;
      } else if (anchorGone) {
        fn = cb(70, -60 + bob, 130, -90, 180, -110, 214, -100);
      } else {
        const sw2 = Math.sin(t * 1.4) * 4;
        fn = cb(70, -60 + bob, 110, -80, 126 + sw2, -120, 134 + sw2, -104);
        ax = 134 + sw2;
        ay = -104;
        ar = 0.05;
      }
      if (ax != null) {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(ar);
        drawAnchor(ctx, 0.95, rage ? 1 : 0.4);
        ctx.restore();
        // 纏著錨的鏈
        if (!anchorWind) chain(ctx, 70, -40, ax, ay + 10, 34, 4.5, KR.iron, KR.ironS);
      }
      tentacle(ctx, fn, 24, skin, skinS, { side: 1 });
    }

    // 暴走：浮起的幽火
    if (rage && !dead) {
      for (let i = 0; i < 4; i++) {
        const q = (t * 0.5 + hash(i + 20)) % 1;
        const x = (hash(i + 9) > 0.5 ? 1 : -1) * (90 + hash(i + 9) * 50);
        const y = -30 - q * 170;
        ctx.globalAlpha = Math.sin(q * PI) * 0.9;
        glow(ctx, x, y - 12, 26, gh, 0.5);
        flame(ctx, x, y, 11, 34, t, i, gh, '#f4ffe8', 2);
        ctx.globalAlpha = 1;
      }
    }
    // 精修：往上冒的氣泡、船殼滴下的海水
    if (!dead) {
      for (let i = 0; i < 9; i++) {
        const q = (t * 0.4 + hash(i + 220)) % 1;
        const x = (hash(i + 221) - 0.5) * 260 + Math.sin(t * 2 + i) * 8;
        const y = -20 - q * 220;
        const r = 2 + hash(i + 222) * 4;
        ctx.save();
        ctx.globalAlpha *= Math.sin(q * PI) * 0.8;
        ctx.strokeStyle = A.c('#d8fff0');
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = A.c('#ffffff');
        ctx.beginPath();
        ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ═════════════════════════ 赤焰炎魔 fb_balrog（設計 300×340；資料不同時等比例縮放） ═════════════════════════
  // 巴洛古風的炎魔：前傾駝背的巨大上身、反關節（趾行）的獸腿、粗尾巴，整隻是黑曜石岩殼，岩片之間的裂縫流著會脈動的熔岩。
  // 頭壓在兩肩之間往前伸：厚重的倒 V 眉骨下一對白熱的眼、往上翹的下顎獠牙＋上排尖牙、張嘴時喉嚨裡是熔岩；
  // 一對從太陽穴往後掃再往前勾的巨角；後腦到背脊是一整排燃燒的鬃毛。
  // 撕裂的蝙蝠翼：翼膜被燒穿的破洞邊緣發紅、翼膜邊緣被背後的火光照透；鐵肩甲、鐵項圈、斜背皮帶、骷髏扣腰帶、腿甲、腕甲。
  // 近側的手握著骨節火鞭。暴走：岩殼泛紅、更多裂縫亮起、鬃毛火焰更高、角上的裂紋燒紅、眼睛白熱、身上滴熔岩。
  // 火鞭：預警時 fx.whip = 0（m.fbLast = 'whip'、attackPhase = 'wind'），出手後 0→1 是鞭子甩出去的長度
  // fx.whipCharge 0→1＝蓄力進度（鞭子舉過頭往後捲起、火焰沿鞭身竄高），fx.whipT＝甩出後經過的秒數（0.1 秒時鞭梢著地），fx.whipLen＝判定長度
  const BR_H = 340;
  // 火鞭甩出的弧線（設計座標，原點在腳底）：起點＝頭後上方、控制點＝前方 cx·len 的高空、終點＝(len, −40 世界座標)＝判定框中線。
  // 地上的 fb_whipcrack 用同一組數字（乘上 z.k）畫火弧，所以鞭子跟火弧永遠重合。
  const BR_ARC = { x0: -150, y0: -400, cx: 0.55, cy: -540 };
  const BR = {
    horn: '#e6d6b2', hornS: '#a88c66', hornTip: '#2a1c1a',
    iron: '#4c4852', ironS: '#2a2730', ironL: '#8e889a', gold: '#d6a244', goldS: '#8e5e1c',
    cloth: '#541612', clothS: '#300a08', strap: '#3a2218', strapS: '#22140c',
    claw: '#171013', bone: '#3c2c2a', boneS: '#241816', mouth: '#1c0604', tooth: '#f4e8cc', toothS: '#c2ae88',
    whip: '#3a1a12', whipSeg: '#5e2a1a',
  };
  const BR_P = [
    { rock: '#3a2c32', rockS: '#1e151a', rockD: '#241a20', rockL: '#56444a', sheen: '#d8bcc4', lava: '#ff7a1e', hot: '#ffd23a', white: '#fff4c8',
      wing: '#6e2018', wingS: '#44120c', wingLit: '#ff6a2a', wingV: '#2a0806', eye: '#ffc23a', aura: '#ff5a1e', fo: '#ff6a1a', fi: '#ffd23a' },
    { rock: '#472628', rockS: '#240e10', rockD: '#301416', rockL: '#6a383a', sheen: '#ffd0b0', lava: '#ffb43a', hot: '#fff0a0', white: '#ffffff',
      wing: '#701e12', wingS: '#440e08', wingLit: '#ffa03a', wingV: '#300804', eye: '#fff8d8', aura: '#ff4a1a', fo: '#ff8a2a', fi: '#fff2b0' },
  ];
  // 會流動的熔岩裂縫：發光裂縫＋沿著裂縫往前流的白熱光點
  function brVein(ctx, path, col, heat, w, t) {
    hotLines(ctx, path, col, heat, w);
    if (heat > 0.55) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      path(ctx);
      ctx.setLineDash([5, 17]);
      ctx.lineDashOffset = -t * 46;
      ctx.strokeStyle = rgba('#fff8e0', clamp((heat - 0.55) * 1.5, 0, 0.9));
      ctx.lineWidth = Math.max(1.2, w * 0.6);
      ctx.stroke();
      ctx.restore();
    }
  }
  // 黑曜石切面：形狀裡幾塊稍亮的多邊形，左上兩條邊是玻璃質的反光
  function brFacets(ctx, path, list, P, a) {
    ctx.save();
    ctx.beginPath();
    path(ctx);
    ctx.clip();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fillStyle = rgba(P.rockL, a == null ? 0.6 : a);
    ctx.beginPath();
    for (const f of list) {
      ctx.moveTo(f[0], f[1]);
      for (let i = 2; i < f.length; i += 2) ctx.lineTo(f[i], f[i + 1]);
      ctx.closePath();
    }
    ctx.fill();
    ctx.strokeStyle = rgba(P.sheen, 0.5 * (a == null ? 1 : a / 0.6));
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const f of list) {
      const n = f.length;
      ctx.moveTo(f[n - 2], f[n - 1]);
      ctx.lineTo(f[0], f[1]);
      ctx.lineTo(f[2], f[3]);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 玻璃反光的小尖片
  function brSheen(ctx, x, y, L, ang, a) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    ctx.fillStyle = rgba('#ffffff', a);
    ctx.beginPath();
    ctx.moveTo(x - c * L * 0.5, y - s * L * 0.5);
    ctx.lineTo(x - s * 1.8, y + c * 1.8);
    ctx.lineTo(x + c * L * 0.5, y + s * L * 0.5);
    ctx.lineTo(x + s * 1.2, y - c * 1.2);
    ctx.closePath();
    ctx.fill();
  }
  // 彎鉤爪
  function brClaw(ctx, x, y, L, ang, w) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const fn = qb(x, y, x + c * L * 0.7 - s * L * 0.12, y + s * L * 0.7 + c * L * 0.12 - L * 0.1, x + c * L + s * L * 0.28, y + s * L - c * L * 0.28 + L * 0.18);
    A.shape(ctx, (cc) => taper(cc, fn, (q) => (w || 9) * (1 - q) + 0.6, 8), BR.claw, null, { lw: 1.8 });
  }
  // 鐵肩甲：三片疊起的甲片、往後的尖刺、金邊、發熱的鉚釘，甲片縫裡透出熔岩
  function brPauldron(ctx, x, y, s, rot, P, heat, dark) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    const iron = dark ? U.mix(BR.iron, '#000000', 0.35) : BR.iron;
    const ironS = dark ? U.mix(BR.ironS, '#000000', 0.35) : BR.ironS;
    // 尖刺
    [[-30, -34, -2.2, 40], [-6, -46, -1.85, 50], [20, -44, -1.45, 36]].forEach(([sx, sy, a, L], i) => {
      A.shape(ctx, (c) => {
        c.moveTo(sx + Math.cos(a + 1.57) * 9, sy + Math.sin(a + 1.57) * 9);
        c.quadraticCurveTo(sx + Math.cos(a) * L * 0.6 + 4, sy + Math.sin(a) * L * 0.6, sx + Math.cos(a) * L, sy + Math.sin(a) * L);
        c.lineTo(sx - Math.cos(a + 1.57) * 9, sy - Math.sin(a + 1.57) * 9);
        c.closePath();
      }, dark ? '#4a4450' : '#8a8494', dark ? '#2a2630' : '#4e4a58', { lw: 2.4, shadeY: sy + Math.sin(a) * L * 0.4 });
      if (heat > 0.9 && !dark) glow(ctx, sx + Math.cos(a) * L, sy + Math.sin(a) * L, 12, P.hot, (heat - 0.9) * 1.2);
      if (i === 1) {
        ctx.strokeStyle = rgba('#ffffff', dark ? 0.12 : 0.35);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy - 2);
        ctx.lineTo(sx + Math.cos(a) * L * 0.8 - 2, sy + Math.sin(a) * L * 0.8);
        ctx.stroke();
      }
    });
    const lame3 = (c) => {
      c.moveTo(-42, 22);
      c.quadraticCurveTo(6, 8, 56, 24);
      c.lineTo(52, 42);
      c.quadraticCurveTo(6, 30, -36, 42);
      c.closePath();
    };
    const lame2 = (c) => {
      c.moveTo(-48, 4);
      c.quadraticCurveTo(4, -10, 58, 6);
      c.lineTo(58, 28);
      c.quadraticCurveTo(6, 14, -44, 26);
      c.closePath();
    };
    const dome = (c) => {
      c.moveTo(-50, 10);
      c.bezierCurveTo(-56, -30, -24, -54, 6, -54);
      c.bezierCurveTo(40, -54, 62, -30, 58, 12);
      c.quadraticCurveTo(4, -2, -50, 10);
      c.closePath();
    };
    A.shape(ctx, lame3, iron, ironS, { cel: [4, 5], lw: 2.6 });
    A.shape(ctx, lame2, iron, ironS, { cel: [4, 5], lw: 2.6 });
    if (heat > 0) {
      hotLines(ctx, (c) => {
        c.moveTo(-40, 25);
        c.quadraticCurveTo(6, 12, 54, 26);
      }, P.lava, heat * (dark ? 0.4 : 0.8), 1.6);
    }
    A.shape(ctx, dome, iron, ironS, { cel: [6, 7], lw: 2.8 });
    if (!dark) {
      // 金屬的弧形反光＋下緣的熔岩反光
      ctx.fillStyle = rgba('#ffffff', 0.28);
      ctx.beginPath();
      ctx.ellipse(-8, -30, 30, 9, -0.25, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(P.lava, 0.45 * Math.min(1, heat));
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-42, 4);
      ctx.quadraticCurveTo(4, -8, 52, 6);
      ctx.stroke();
    }
    // 金邊
    ctx.lineCap = 'round';
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-46, 7);
    ctx.quadraticCurveTo(4, -6, 55, 9);
    ctx.stroke();
    ctx.strokeStyle = A.c(dark ? BR.goldS : BR.gold);
    ctx.lineWidth = 3.4;
    ctx.stroke();
    // 鉚釘（燒紅）
    const RIV = [[-30, -8], [-6, -26], [22, -26], [42, -8], [-20, 32], [14, 26], [42, 32]];
    const rivets = (r) => {
      ctx.beginPath();
      RIV.forEach(([px, py]) => {
        ctx.moveTo(px + r, py);
        ctx.arc(px, py, r, 0, TAU);
      });
      ctx.fill();
    };
    ctx.fillStyle = A.c(dark ? '#3a3440' : '#b0a8b8');
    rivets(2.6);
    if (heat > 0.5 && !dark) {
      ctx.fillStyle = rgba(P.hot, (heat - 0.5) * 1.4);
      rivets(1.6);
    }
    ctx.restore();
  }
  // 撕裂的燃燒蝙蝠翼（區域座標：翼根在原點、往 −x 展開）。open 0..1 張開程度、flap 拍動角、swept 俯衝時往後收
  // 翼膜用 evenodd 挖出真正的破洞（看得到後面的背景），洞緣是燒紅的熔岩邊。
  function brWing(ctx, open, flap, swept, P, heat, t, dead, back, rage) {
    const pol = (p, a, l) => [p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l];
    // 臂骨往後上方、前臂往上到腕，四根指骨從腕往後下方張開（張開＝扇形、收起＝往下垂貼著身體）
    const a1 = lerp(-1.75, -2.07, open) - swept * 0.5;
    const el = pol([0, 0], a1, 80);
    const a2 = lerp(-1.6, -2.14, open) - swept * 0.4;
    const wr = pol(el, a2, 60);
    const FO = [-2.6, -3.33, -3.81, -4.28];
    const FC = [-3.9, -4.2, -4.4, -4.55];
    const LL = [58, 132, 185, 215];
    const lk = lerp(0.72, 1, open);
    const tips = FO.map((a, i) => pol(wr, lerp(FC[i], a, open) + swept * (0.5 + i * 0.1), LL[i] * lk));
    const att = [-18, 86];
    // 翼膜外框（扇形之間往內凹的撕裂邊緣）
    const scal = [];
    for (let i = 0; i < 4; i++) {
      const a = tips[i];
      const b = i < 3 ? tips[i + 1] : att;
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const d = i < 3 ? 0.36 : 0.22;
      const px = mx + (wr[0] - mx) * d;
      const py = my + (wr[1] - my) * d;
      scal.push([a, b, px, py]);
    }
    const outer = (c) => {
      c.moveTo(0, 0);
      c.lineTo(el[0], el[1]);
      c.lineTo(wr[0], wr[1]);
      c.lineTo(tips[0][0], tips[0][1]);
      scal.forEach(([a, b, px, py], i) => {
        // 撕裂：凹邊中段有兩個鋸齒缺口
        const q1 = [lerp(a[0], px, 0.55), lerp(a[1], py, 0.55)];
        const q2 = [lerp(b[0], px, 0.5), lerp(b[1], py, 0.5)];
        c.quadraticCurveTo(lerp(a[0], px, 0.25), lerp(a[1], py, 0.4), q1[0], q1[1]);
        c.lineTo(lerp(q1[0], wr[0], 0.12) + 3, lerp(q1[1], wr[1], 0.12) + 4);
        c.lineTo(px, py);
        if (i === 1) c.lineTo(lerp(px, wr[0], 0.16) - 3, lerp(py, wr[1], 0.16) + 2);
        c.lineTo(q2[0] + 3, q2[1] - 4);
        c.quadraticCurveTo(lerp(b[0], px, 0.2), lerp(b[1], py, 0.2), b[0], b[1]);
      });
      c.lineTo(0, 40);
      c.closePath();
    };
    // 燒穿的洞（固定位置：在指骨之間）
    const holes = [];
    (back ? [[2, 0.66, 11]] : [[1, 0.55, 12], [2, 0.72, 10], [3, 0.42, 8]]).forEach(([i, q, r], k) => {
      const a = tips[i];
      const b = i < 3 ? tips[i + 1] : att;
      const cx = lerp(wr[0], (a[0] + b[0]) / 2, q);
      const cy = lerp(wr[1], (a[1] + b[1]) / 2, q);
      holes.push([cx, cy, r * (back ? 0.9 : 1), k]);
    });
    const holePath = (c) => {
      holes.forEach(([hx, hy, r, k]) => {
        for (let j = 0; j <= 8; j++) {
          const aa = (j / 8) * TAU;
          const rr = r * (0.65 + hash(j + k * 9 + 400) * 0.6);
          const px = hx + Math.cos(aa) * rr;
          const py = hy + Math.sin(aa) * rr * 0.8;
          j ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath();
      });
    };
    const mem = (c) => {
      outer(c);
      holePath(c);
    };
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // 翼膜：底色 → 右下陰影 → 被火光照透的邊緣 → 血管
    ctx.beginPath();
    mem(ctx);
    ctx.fillStyle = A.c(P.wing);
    ctx.fill('evenodd');
    ctx.save();
    ctx.beginPath();
    mem(ctx);
    ctx.clip('evenodd');
    ctx.fillStyle = A.c(P.wingS);
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(wr[0], wr[1] + 30);
    ctx.lineTo(tips[3][0] - 40, tips[3][1] + 60);
    ctx.lineTo(att[0], att[1] + 40);
    ctx.closePath();
    ctx.fill();
    if (!dead && !back) {
      const R = Math.max(...LL) * lk + 70;
      const g = ctx.createRadialGradient(wr[0], wr[1], R * 0.25, wr[0], wr[1], R);
      g.addColorStop(0, rgba(P.wingLit, 0));
      g.addColorStop(0.6, rgba(P.wingLit, 0.08 * heat));
      g.addColorStop(1, rgba(P.wingLit, (back ? 0.3 : 0.5) * Math.min(1.2, heat)));
      ctx.fillStyle = g;
      ctx.fillRect(wr[0] - R, wr[1] - R, R * 2, R * 2);
    }
    // 血管：從指骨往翼膜分岔（遠側的翅膀省略）
    if (!back) {
    ctx.strokeStyle = rgba(P.wingV, 0.75);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = tips[i];
      const b = scal[i];
      for (let j = 0; j < 2; j++) {
        const q = 0.3 + j * 0.3;
        const sx = lerp(wr[0], a[0], q);
        const sy = lerp(wr[1], a[1], q);
        const ex = lerp(sx, b[2], 0.55);
        const ey = lerp(sy, b[3], 0.55);
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(lerp(sx, ex, 0.5) + 4, lerp(sy, ey, 0.5) - 3, ex, ey);
        ctx.lineTo(ex + (b[2] - sx) * 0.12 - 3, ey + (b[3] - sy) * 0.12 + 2);
      }
    }
    ctx.stroke();
    }
    // 撕裂邊緣的餘燼：沿內凹邊描一圈熔岩色（一半被裁掉＝只留在翼膜內側）
    if (!dead) {
      ctx.strokeStyle = rgba(P.lava, 0.55 * Math.min(1, heat));
      ctx.lineWidth = 5;
      ctx.beginPath();
      scal.forEach(([a, b, px, py]) => {
        ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo(px, py, b[0], b[1]);
      });
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    outer(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3;
    ctx.stroke();
    // 洞緣：燒紅的熔岩邊（外暈＋深色邊＋亮邊）
    hotLines(ctx, holePath, P.lava, dead ? 0 : heat * (back ? 0.6 : 1), 2.2);
    if (!dead) {
      holes.forEach(([hx, hy, r, k]) => {
        if (!back) glow(ctx, hx, hy, r * 2.2, P.lava, 0.4 * Math.min(1, heat));
        if (!back && (rage || k % 2 === 0)) flame(ctx, hx + r * 0.2, hy + r * 0.75, r * 0.45, r * 1.5 * (rage ? 1.4 : 1), t, k + 60, P.fo, P.fi, 1.4);
      });
    }
    // 骨架：臂骨、指骨（漸細）、關節、翼爪
    const bone = back ? '#2a1c1a' : BR.bone;
    const boneS = back ? '#170e0c' : BR.boneS;
    A.shape(ctx, (c) => taper(c, qb(0, 0, (el[0]) / 2 - 6, el[1] / 2 - 6, el[0], el[1]), (q) => 20 - q * 6, 8), bone, null, { lw: 2.6 });
    A.shape(ctx, (c) => taper(c, qb(el[0], el[1], (el[0] + wr[0]) / 2, (el[1] + wr[1]) / 2 - 5, wr[0], wr[1]), (q) => 15 - q * 4, 8), bone, null, { lw: 2.6 });
    tips.forEach((tp, i) => {
      A.shape(ctx, (c) => taper(c, qb(wr[0], wr[1], (wr[0] + tp[0]) / 2 + 3, (wr[1] + tp[1]) / 2 - 3, tp[0], tp[1]), (q) => (i ? 9 : 11) * (1 - q * 0.65), 8), bone, null, { lw: 2.2 });
      if (back) return; // 遠側的翅膀只畫骨頭（指節、鉤爪省略）
      // 指關節
      const kx = lerp(wr[0], tp[0], 0.55);
      const ky = lerp(wr[1], tp[1], 0.55);
      ctx.fillStyle = A.c(boneS);
      ctx.beginPath();
      ctx.arc(kx, ky, 4, 0, TAU);
      ctx.fill();
      // 指尖的小鉤爪
      const ang = Math.atan2(tp[1] - wr[1], tp[0] - wr[0]);
      brClaw(ctx, tp[0], tp[1], 13, ang + 0.5, 6);
    });
    if (!back) {
      A.ellipse(ctx, el[0], el[1], 9, 9, bone, null, { lw: 2.4, hl: false });
      A.ellipse(ctx, wr[0], wr[1], 10, 10, bone, null, { lw: 2.4, hl: false });
    }
    // 腕上的拇指爪
    if (!back) brClaw(ctx, wr[0] + 2, wr[1] - 6, 26, a2 + 1.2, 10);
    // 前緣的熔岩裂縫
    if (!back) {
      brVein(ctx, (c) => {
        c.moveTo(el[0] * 0.2, el[1] * 0.2);
        c.lineTo(el[0] * 0.7 + 2, el[1] * 0.7 + 3);
        c.moveTo(lerp(el[0], wr[0], 0.25), lerp(el[1], wr[1], 0.25));
        c.lineTo(lerp(el[0], wr[0], 0.7) + 2, lerp(el[1], wr[1], 0.7) - 2);
      }, P.lava, dead ? 0 : heat * 0.9, 1.8, t);
    }
    // 指尖的火
    if (!dead && (!back || rage)) {
      tips.forEach((tp, i) => {
        flame(ctx, tp[0], tp[1] + 4, (rage ? 10 : 7) * (back ? 0.85 : 1), (rage ? 40 : 26) * (back ? 0.85 : 1), t, i + (back ? 30 : 1), P.fo, P.fi, 2);
      });
    }
    ctx.restore();
    return tips;
  }
  // 圓角的岩片（多邊形各角用二次曲線圓掉）
  function brRound(c, p, r) {
    r = r || 0.28; // 每個角從兩邊各切掉 r 的長度再用曲線接起來（0.5＝整塊變圓）
    const n = p.length / 2;
    const X = (i) => p[((i + n) % n) * 2];
    const Y = (i) => p[((i + n) % n) * 2 + 1];
    for (let i = 0; i < n; i++) {
      const ax = lerp(X(i), X(i - 1), r);
      const ay = lerp(Y(i), Y(i - 1), r);
      i ? c.lineTo(ax, ay) : c.moveTo(ax, ay);
      c.quadraticCurveTo(X(i), Y(i), lerp(X(i), X(i + 1), r), lerp(Y(i), Y(i + 1), r));
    }
    c.closePath();
  }
  // 浮在熔岩上的黑曜石岩片：填色＋右下硬陰影＋左上玻璃反光邊
  // （不用 clip：先整塊塗陰影色，再把縮小、往左上挪的本體蓋上去，右下留下一道月牙陰影、左上一條細斜邊）
  function brPlate(ctx, p, col, colS, sheen, sa) {
    const n = p.length / 2;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < n; i++) {
      cx += p[i * 2] / n;
      cy += p[i * 2 + 1] / n;
    }
    ctx.beginPath();
    brRound(ctx, p);
    ctx.fillStyle = A.c(colS);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    const q = p.map((v, i) => (i % 2 ? cy + (v - cy) * 0.9 - 2.5 : cx + (v - cx) * 0.92 - 2));
    ctx.beginPath();
    brRound(ctx, q);
    ctx.fillStyle = A.c(col);
    ctx.fill();
    if (sa > 0) {
      ctx.strokeStyle = rgba(sheen, sa);
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const n = p.length;
      ctx.moveTo(lerp(p[0], p[n - 2], 0.6) + 1.5, lerp(p[1], p[n - 1], 0.6) + 1.5);
      ctx.quadraticCurveTo(p[0] + 1.5, p[1] + 1.5, lerp(p[0], p[2], 0.6) + 1, lerp(p[1], p[3], 0.6) + 1.5);
      ctx.stroke();
    }
  }
  function fb_balrog(ctx, m) {
    const S = atk(m);
    const { fx, ph, t, rage, dead, kind } = S;
    const K = (m.h || BR_H) / BR_H;
    const whipMove = kind === 'whip' || amt(fx.whip) > 0;
    const whipStrike = whipMove && (ph === 'strike' || (!ph && amt(fx.whip) >= 0.999));
    const whipWind = whipMove && !whipStrike;
    const whipCh = whipWind ? (fx.whipCharge != null ? amt(fx.whipCharge) : ph ? 0.6 + 0.4 * Math.abs(Math.sin(t * 2.5)) : amt(fx.whip)) : 0;
    const coilK = 1 - (1 - Math.min(1, whipCh / 0.75)) ** 2; // 前 0.75 秒捲起，之後蓄滿發抖
    const tense = whipWind && whipCh > 0.75;
    const whipV = whipStrike ? amt(fx.whip) : whipWind ? coilK : 0;
    const whipT = whipStrike ? num(fx.whipT, 0.2) : 0;
    const crackK = whipStrike ? clamp(1 - Math.abs(whipT - 0.12) / 0.14, 0, 1) : 0; // 鞭梢爆響的閃光
    const fly = !!fx.fly;
    const dive = fly && (ph === 'strike' || !!fx.dive);
    const meteor = !dead && !whipMove && !fly && (/meteor|rain/.test(kind) || !!fx.meteor || (!kind && (ph === 'wind' || ph === 'strike')));
    const walk = S.walk && !ph && !fly && !dead;
    const hurt = S.hurt && !dead;
    const P = BR_P[rage ? 1 : 0];
    const heat = dead ? 0 : clamp(0.62 + Math.sin(t * 3.2) * 0.16 + (rage ? 0.45 : 0) + whipV * 0.25 + (meteor ? 0.35 : 0), 0, 1.4);
    // 裂縫各自以不同相位脈動
    const hp = (k) => (dead ? 0 : clamp(heat + Math.sin(t * 4.1 + k * 1.7) * 0.18, 0, 1.5));
    const rock = P.rock;
    const rockB = U.mix(P.rock, '#000000', 0.25); // 遠側（背光）
    const rockBS = U.mix(P.rockS, '#000000', 0.25);

    // ── 姿勢 ──
    const gait = t * 4.2;
    let bob = dead ? 0 : walk ? -Math.abs(Math.sin(gait)) * 5 : Math.sin(t * 2) * 3;
    let drop = 0;
    let lean = walk ? 0.05 : 0.02;
    let headTilt = Math.sin(t * 2 - 0.5) * 0.025;
    let mouth = rage ? 0.7 : 0.5;
    let spread = rage ? 1 : 0.92;
    let flapSp = 2;
    let flapAmp = 0.04;
    let tuck = 0;
    let swept = 0;
    let squint = false;
    // 手的位置（上半身座標）：n＝右手（握鞭，畫面右側）、f＝左手；E 手肘、H 手
    let nE = [150, -224];
    let nH = [166, -164];
    let fE = [-140, -222];
    let fH = [-146, -160];
    if (walk) {
      const sw = Math.sin(gait);
      nE = [nE[0] + sw * 6, nE[1]];
      nH = [nH[0] + sw * 12, nH[1] - Math.abs(sw) * 4];
      fE = [fE[0] - sw * 6, fE[1]];
      fH = [fH[0] - sw * 12, fH[1]];
    }
    if (whipWind) {
      const k = whipV;
      lean = lerp(0.02, -0.14, k);
      mouth = 0.45 + 0.5 * k;
      headTilt = -0.12 * k;
      spread = Math.max(spread, 0.8 + 0.2 * k);
      drop = 10 * k;
      nE = [lerp(150, 150, k), lerp(-224, -372, k)];
      nH = [lerp(166, 70, k), lerp(-164, -440, k)];
      fE = [lerp(-140, -168, k), lerp(-222, -258, k)];
      fH = [lerp(-146, -150, k), lerp(-160, -196, k)];
    }
    if (whipStrike) {
      const lunge = clamp(1 - (whipT - 0.1) / 0.5, 0, 1);
      lean = 0.12 + 0.1 * lunge;
      mouth = 0.85 + 0.15 * crackK;
      headTilt = 0.05 + 0.06 * lunge;
      spread = 1;
      drop = 14 * lunge;
      nE = [176, -254];
      nH = [228, -214];
      fE = [-158, -254];
      fH = [-184, -208];
    }
    if (meteor) {
      lean = -0.08;
      mouth = 1;
      headTilt = -0.25;
      spread = 1;
      flapSp = 7;
      flapAmp = 0.1;
      nE = [158, -366];
      nH = [104, -446];
      fE = [-138, -366];
      fH = [-74, -450];
    }
    if (fly) {
      lean = 0.12;
      spread = 1;
      flapSp = 10;
      flapAmp = 0.28;
      tuck = 1;
      mouth = 0.5;
      nE = [156, -240];
      nH = [180, -190];
      fE = [-146, -240];
      fH = [-150, -184];
    }
    if (dive) {
      lean = 0.42;
      spread = 0.4;
      swept = 1;
      flapAmp = 0.04;
      mouth = 1;
      headTilt = 0.1;
      tuck = 0.6;
      nE = [170, -272];
      nH = [228, -262];
      fE = [-70, -272];
      fH = [10, -262];
    }
    if (hurt && !ph) {
      lean -= 0.07;
      mouth = Math.max(mouth, 0.7);
      headTilt -= 0.14;
      squint = true;
    }
    if (dead) {
      drop = 44;
      lean = 0.3;
      headTilt = 0.18;
      mouth = 0.3;
      spread = 0.3;
      flapAmp = 0;
      nE = [150, -200];
      nH = [170, -130];
      fE = [-130, -200];
      fH = [-126, -130];
    }
    const shake = tense ? Math.sin(t * 60) * 2.6 : (whipWind && whipV > 0.6) || (meteor && ph === 'wind') ? Math.sin(t * 55) * 1.6 : 0;
    const flap = dead ? 0 : Math.sin(t * flapSp) * flapAmp;
    const HIP0 = -150;
    const hipY = HIP0 + drop + bob * 0.6;
    // 上半身：跟著呼吸上下、繞著腰往前傾
    const upper = () => {
      ctx.translate(0, bob + drop);
      ctx.translate(10, HIP0);
      ctx.rotate(lean);
      ctx.translate(-10, -HIP0);
    };

    ctx.save();
    ctx.scale(K, K);
    ctx.translate(shake, 0);

    // ── 光暈、燒裂的地面 ──
    if (!dead) {
      glow(ctx, 10, -260, 170 + (rage ? 40 : 0), P.aura, (rage ? 0.36 : 0.22) + Math.sin(t * 4) * 0.04);
      ctx.save();
      ctx.scale(1, 0.2);
      glow(ctx, 10, -10, 130, P.lava, 0.25 + (rage ? 0.1 : 0));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + 0.3;
        crack(ctx, 10 + Math.cos(a) * 40, Math.sin(a) * 30, a, 80 + hash(i + 430) * 40, 3, 431 + i * 5);
      }
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 5.5;
      ctx.stroke();
      ctx.strokeStyle = rgba(P.lava, clamp(hp(0) * 0.8, 0, 1));
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // ── 尾巴（從腰後繞到左腳邊）──
    {
      const sw = Math.sin(t * 1.6) * 0.5 + (walk ? Math.sin(gait) * 0.3 : 0) + (whipStrike ? -0.4 : 0);
      const by = hipY + 10;
      const tipY = dead ? -14 : -30 + sw * 16 + tuck * 50;
      const fn = cb(-10, by, -110, by + 6 + sw * 8, -176 + sw * 10, -70 + sw * 10 + tuck * 30, -196 + sw * 12, tipY);
      const wf = (s) => 40 * (1 - s * 0.82);
      for (let i = 1; i <= 6; i++) {
        const s = 0.18 + i * 0.11;
        const a = along(fn, s, -wf(s) * 0.42);
        const L = 18 - i * 1.6;
        const nx = Math.sin(a[2]);
        const ny = -Math.cos(a[2]);
        A.shape(ctx, (c) => {
          c.moveTo(a[0] - Math.cos(a[2]) * 7, a[1] - Math.sin(a[2]) * 7);
          c.lineTo(a[0] + nx * L - Math.cos(a[2]) * 8, a[1] + ny * L - Math.sin(a[2]) * 8);
          c.lineTo(a[0] + Math.cos(a[2]) * 6, a[1] + Math.sin(a[2]) * 6);
          c.closePath();
        }, P.rockL, null, { lw: 2.2 });
      }
      A.shape(ctx, (c) => taper(c, fn, wf, 14), rockB, rockBS, { cel: [0, 7], lw: 3 });
      brVein(ctx, (c) => {
        c.moveTo(fn(0.2)[0], fn(0.2)[1]);
        for (let i = 3; i <= 9; i++) {
          const p = along(fn, i / 10, (i % 2 ? 1 : -1) * wf(i / 10) * 0.18);
          c.lineTo(p[0], p[1]);
        }
      }, P.lava, hp(1) * 0.8, 2.2, t);
      const tp = fn(1);
      const ta = along(fn, 0.98, 0)[2];
      ctx.save();
      ctx.translate(tp[0], tp[1]);
      ctx.rotate(ta);
      A.shape(ctx, (c) => {
        c.moveTo(-6, -6);
        c.quadraticCurveTo(10, -20, 28, -4);
        c.quadraticCurveTo(14, 0, 28, 8);
        c.quadraticCurveTo(8, 16, -6, 6);
        c.closePath();
      }, BR.bone, BR.boneS, { lw: 2.4, shadeY: 2 });
      ctx.restore();
      if (!dead) flame(ctx, tp[0] - 2, tp[1] + 2, rage ? 12 : 9, rage ? 44 : 30, t, 70, P.fo, P.fi, 2);
    }

    // ── 翅膀（兩邊從肩胛後面往外上方大大張開：翼展約身體寬的 1.7 倍）──
    const WROT = lerp(0.35, -0.02, spread);
    ctx.save();
    upper();
    ctx.save();
    ctx.translate(80, -306);
    ctx.scale(-0.9, 0.9);
    ctx.rotate(WROT + flap - swept * 0.35);
    brWing(ctx, spread, flap, swept, P, heat, t, dead, true, rage);
    ctx.restore();
    ctx.save();
    ctx.translate(-62, -300);
    ctx.rotate(WROT + flap - swept * 0.35);
    ctx.scale(0.94, 0.94);
    brWing(ctx, spread, flap, swept, P, heat, t, dead, false, rage);
    ctx.restore();
    // 背後的燃燒鬃毛（從肩頸竄起、框住頭）
    if (!dead) {
      const fk = rage ? 1.4 : 1;
      glow(ctx, 30, -350, 90 * fk, P.fo, 0.45);
      for (let i = 0; i < 4; i++) {
        const q = i / 3;
        const x = lerp(-56, 110, q);
        const y = -318 - Math.sin(q * PI) * 30;
        flame(ctx, x, y, (14 + Math.sin(q * PI) * 6) * fk, (44 + Math.sin(q * PI) * 40) * fk, t, i + 80, P.fo, P.fi, 2.2);
      }
    }
    ctx.restore();

    // ── 腳（趾行的反關節獸腿，膝蓋朝前）──
    const leg = (side) => {
      const back = side < 0;
      const col = back ? rockB : rock;
      const colS = back ? rockBS : P.rockS;
      const hx = back ? -30 : 50;
      let fx0 = back ? -78 : 104;
      let fy0 = 0;
      if (walk) {
        const q = gait + (back ? PI : 0);
        fx0 += Math.cos(q) * 20;
        fy0 = -Math.max(0, Math.sin(q)) * 16;
      }
      if (whipStrike) fx0 += back ? -10 : 16;
      if (dead) fx0 += back ? -8 : 16;
      const hy = hipY;
      let knee = [hx + (back ? 12 : 30) + drop * 0.4, hy + 56 - drop * 0.35];
      let hock = [fx0 - 34 + drop * 0.1, fy0 - 54 + drop * 0.3];
      let foot = [fx0, fy0];
      if (tuck > 0) {
        knee = [lerp(knee[0], hx + 40, tuck), lerp(knee[1], hy + 44, tuck)];
        hock = [lerp(hock[0], hx - 6, tuck), lerp(hock[1], hy + 82, tuck)];
        foot = [lerp(foot[0], hx + 8, tuck), lerp(foot[1], hy + 126, tuck)];
      }
      const fAng = tuck * 1.1;
      const thigh = (c) => taper(c, qb(hx, hy - 6, (hx + knee[0]) / 2 + 20, (hy + knee[1]) / 2 - 6, knee[0], knee[1]), (s) => 82 - s * 30, 12);
      const shin = (c) => taper(c, qb(knee[0], knee[1], (knee[0] + hock[0]) / 2 - 4, (knee[1] + hock[1]) / 2 + 6, hock[0], hock[1]), (s) => 48 - s * 16, 10);
      const meta = (c) => taper(c, qb(hock[0], hock[1], (hock[0] + foot[0]) / 2 + 3, (hock[1] + foot[1]) / 2, foot[0] - 4 * Math.cos(fAng), foot[1] - 12), (s) => 32 - s * 8, 8);
      // 後跟的骨刺
      A.shape(ctx, (c) => {
        c.moveTo(hock[0] - 2, hock[1] - 12);
        c.quadraticCurveTo(hock[0] - 24, hock[1] - 10, hock[0] - 36, hock[1] + 2);
        c.quadraticCurveTo(hock[0] - 18, hock[1] + 2, hock[0] - 2, hock[1] + 10);
        c.closePath();
      }, back ? '#2a1c1a' : BR.bone, BR.boneS, { lw: 2.2, shadeY: hock[1] });
      A.shape(ctx, meta, col, colS, { cel: [4, 3], lw: 3 });
      A.shape(ctx, shin, col, colS, { cel: [6, 3], lw: 3 });
      brVein(ctx, (c) => crack(c, knee[0] - 4, knee[1] + 10, Math.atan2(hock[1] - knee[1], hock[0] - knee[0]), 34, 2, back ? 447 : 449), P.lava, hp(back ? 2 : 3) * (back ? 0.6 : 1), 2, t);
      // 腳掌＋三根前爪
      ctx.save();
      ctx.translate(foot[0], foot[1]);
      ctx.rotate(fAng);
      A.shape(ctx, (c) => {
        c.moveTo(-18, -20);
        c.quadraticCurveTo(-22, -2, -12, 0);
        c.lineTo(22, 0);
        c.quadraticCurveTo(26, -14, 6, -22);
        c.closePath();
      }, col, colS, { lw: 2.8, shadeY: -6 });
      brClaw(ctx, 14, -6, 24, 0.05, 10);
      brClaw(ctx, 6, -12, 22, -0.05, 9);
      brClaw(ctx, 20, -2, 18, 0.2, 8);
      ctx.restore();
      // 大腿：岩殼底＋浮在熔岩上的兩塊岩片
      A.shape(ctx, thigh, back ? '#1a1014' : P.rockD, null, { lw: 3.2 });
      ctx.save();
      ctx.beginPath();
      thigh(ctx);
      ctx.clip();
      glow(ctx, (hx + knee[0]) / 2 + 6, (hy + knee[1]) / 2, 60, P.lava, hp(back ? 2 : 3) * (back ? 0.5 : 0.85));
      const ta = Math.atan2(knee[1] - hy, knee[0] - hx);
      const tl = Math.hypot(knee[0] - hx, knee[1] - hy);
      ctx.translate(hx, hy - 6);
      ctx.rotate(ta);
      brPlate(ctx, [-30, -36, tl * 0.55, -40, tl * 0.56, 34, -14, 42], col, colS, P.sheen, back ? 0.2 : 0.5);
      brPlate(ctx, [tl * 0.6, -30, tl + 20, -20, tl + 20, 22, tl * 0.64, 24], col, colS, P.sheen, back ? 0.2 : 0.4);
      ctx.restore();
      ctx.beginPath();
      thigh(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.2;
      ctx.stroke();
      // 膝甲
      ctx.save();
      ctx.translate(knee[0], knee[1]);
      ctx.rotate(-0.3);
      A.shape(ctx, (c) => {
        c.moveTo(-18, -14);
        c.quadraticCurveTo(0, -26, 22, -12);
        c.lineTo(40, -6);
        c.lineTo(22, 4);
        c.quadraticCurveTo(4, 20, -16, 10);
        c.closePath();
      }, back ? U.mix(BR.iron, '#000000', 0.3) : BR.iron, BR.ironS, { lw: 2.6, shadeY: 0 });
      ctx.fillStyle = rgba('#ffffff', back ? 0.12 : 0.3);
      ctx.beginPath();
      ctx.ellipse(-2, -12, 10, 3, -0.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    };
    leg(-1);
    leg(1);

    ctx.save();
    upper();
    // ── 軀幹：熔岩核心上浮著一塊塊黑曜石岩片，縫隙透出脈動的熔岩 ──
    const torso = (c) => {
      c.moveTo(-40, -148);
      c.bezierCurveTo(-62, -188, -106, -232, -112, -276);
      c.bezierCurveTo(-116, -306, -84, -330, -40, -334);
      c.quadraticCurveTo(12, -344, 64, -334);
      c.bezierCurveTo(108, -330, 132, -308, 130, -278);
      c.bezierCurveTo(126, -236, 86, -190, 62, -148);
      c.quadraticCurveTo(10, -138, -40, -148);
      c.closePath();
    };
    A.shape(ctx, torso, P.rockD, null, { lw: 3.4 });
    const coreR = (rage ? 30 : 22) + Math.sin(t * 5) * 3;
    ctx.save();
    ctx.beginPath();
    torso(ctx);
    ctx.clip();
    // 熔岩核心：中間最亮、往外變暗
    if (!dead) {
      glow(ctx, 12, -250, 130, P.lava, 0.85 * Math.min(1, hp(6)));
      glow(ctx, 12, -270, 50, P.hot, 0.8 * Math.min(1, hp(7)));
    } else {
      glow(ctx, 12, -250, 120, '#5a1a0a', 0.8);
    }
    // 岩片跟著真正的肌肉分塊：鋸肌（肋側三指）→ 腹外斜肌（斜斜收進髖部）→ 六塊腹肌（成對、往下收窄，中間是白線）→ 胸大肌（最上層）
    const M = (p) => p.map((v, i) => (i % 2 ? v : 22 - v)); // 以身體中線 x = 11 鏡射
    const serr = [
      [-100, -256, -72, -251, -62, -234, -96, -232],
      [-95, -226, -66, -221, -56, -204, -88, -202],
    ];
    const pecL = [-104, -278, -96, -302, -40, -328, 6, -318, 7, -270, -24, -252, -70, -256];
    [...serr, ...serr.map(M)].forEach((p) => brPlate(ctx, p, rock, P.rockS, P.sheen, 0));
    // 曲線的岩片：底色＝陰影色＋描邊，再蓋上往左上縮一點的本體（右下留下彎的陰影），上緣補一條亮邊
    const soft = (path, top, cx, cy, sa) => {
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(P.rockS);
      ctx.fill();
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.save();
      ctx.translate(cx - 2, cy - 2.6);
      ctx.scale(0.88, 0.86);
      ctx.translate(-cx, -cy);
      ctx.beginPath();
      path(ctx);
      ctx.fillStyle = A.c(rock);
      ctx.fill();
      ctx.restore();
      if (sa > 0) {
        ctx.save();
        ctx.translate(0.5, 2.6);
        ctx.beginPath();
        top(ctx);
        ctx.strokeStyle = rgba(P.sheen, sa);
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }
    };
    // 腹外斜肌：從肋側往下包到髖部的彎曲外形（右邊比左邊低一點）
    [-1, 1].forEach((sd) => {
      const X = (x) => (sd < 0 ? x : 22 - x);
      const dy = sd < 0 ? 0 : 3;
      const path = (c) => {
        c.moveTo(X(-58), -244 + dy);
        c.quadraticCurveTo(X(-36), -246 + dy, X(-33), -228 + dy);
        c.quadraticCurveTo(X(-31), -190 + dy, X(-27), -160 + dy);
        c.quadraticCurveTo(X(-32), -148 + dy, X(-46), -150 + dy);
        c.quadraticCurveTo(X(-74), -168 + dy, X(-86), -200 + dy);
        c.quadraticCurveTo(X(-88), -226 + dy, X(-58), -244 + dy);
        c.closePath();
      };
      const top = (c) => {
        c.moveTo(X(-80), -224 + dy);
        c.quadraticCurveTo(X(-70), -242 + dy, X(-44), -244 + dy);
      };
      soft(path, top, X(-56), -200 + dy, 0.45);
    });
    // 腹直肌：兩排、上寬下窄、左右錯開半格（右邊低 5），每塊上緣鼓起、下緣圓收，中間是一條白線；最下面一對收成 V 指向腰帶
    const ABS = [
      [-248, -222, 36],
      [-218, -194, 33],
      [-190, -168, 29],
      [-164, -148, 21],
    ];
    ABS.forEach(([t0, b0, w], row) => {
      [-1, 1].forEach((sd) => {
        const off = sd > 0 ? 5 : 0;
        const top = t0 + off;
        const bot = b0 + off;
        const xi = 11 + sd * 3;
        const xo = xi + sd * w;
        const last = row === ABS.length - 1;
        const topC = (c) => {
          c.moveTo(xi, top + 2);
          c.bezierCurveTo(xi + sd * w * 0.3, top - 5, xo - sd * w * 0.15, top - 4, xo, top + 3);
        };
        const path = (c) => {
          topC(c);
          if (last) {
            // V：外緣斜斜收到白線底部
            c.quadraticCurveTo(xo - sd * w * 0.2, bot - 6, xi, bot + 4);
          } else {
            c.quadraticCurveTo(xo + sd * 3, (top + bot) / 2, xo - sd * w * 0.08, bot - 3);
            c.bezierCurveTo(xo - sd * w * 0.3, bot + 2, xi + sd * w * 0.3, bot + 3, xi, bot);
          }
          c.quadraticCurveTo(xi - sd, (top + bot) / 2, xi, top + 2);
          c.closePath();
        };
        soft(path, topC, xi + sd * w * 0.5, (top + bot) / 2, row < 2 ? 0.45 : 0);
      });
    });
    [pecL, M(pecL)].forEach((p) => brPlate(ctx, p, rock, P.rockS, P.sheen, 0.6));
    // 胸大肌下緣的厚度（往下投的影子）＋腹肌上緣的邊緣光
    ctx.strokeStyle = rgba('#000000', 0.35);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-68, -252);
    ctx.quadraticCurveTo(-24, -246, 5, -266);
    ctx.moveTo(17, -266);
    ctx.quadraticCurveTo(46, -246, 90, -252);
    ctx.stroke();
    // 岩片上的細裂紋（暴走時更多亮起）
    brVein(ctx, (c) => {
      crack(c, -60, -290, 0.5, 40, 3, 461);
      crack(c, 96, -300, 2.4, 40, 3, 463);
      if (rage) {
        crack(c, -86, -230, 1.2, 40, 3, 465);
        crack(c, 110, -236, 1.9, 36, 3, 467);
        crack(c, -40, -270, -0.3, 30, 2, 469);
        crack(c, 60, -272, 3.3, 30, 2, 471);
      }
    }, P.lava, hp(8), rage ? 2.6 : 2, t);
    ctx.restore();
    // 完工光（岩片已經有自己的明暗，這裡只補左上的邊緣光與右下的熔岩反光）
    const tb = [-116, -346, 132, -138];
    crescent(ctx, torso, 8, 9, '#ffd8b8', 0.26, tb);
    crescent(ctx, torso, -7, -6, P.lava, 0.4, tb);
    ctx.beginPath();
    torso(ctx);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 3.4;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 胸骨縫裡的熔核
    if (!dead) {
      A.shape(ctx, (c) => {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU;
          const r = coreR * (i % 2 ? 0.34 : 0.62) * 0.8;
          const px = 13 + Math.cos(a) * r * 0.8;
          const py = -280 + Math.sin(a) * r;
          i ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath();
      }, P.hot, null, { lw: 2 });
      ctx.fillStyle = A.c(P.white);
      ctx.beginPath();
      ctx.arc(13, -280, coreR * 0.2, 0, TAU);
      ctx.fill();
    }
    if (rage && !dead) {
      lavaDrip(ctx, 5, -154, t, 471, P.lava);
      lavaDrip(ctx, -52, -196, t, 473, P.lava);
    }
    // ── 腰帶、骷髏扣、腿甲、破腰布 ──
    A.shape(ctx, (c) => {
      c.moveTo(-14, -142);
      c.lineTo(36, -142);
      c.lineTo(30, -74 + Math.sin(t * 3) * 3);
      c.lineTo(20, -86);
      c.lineTo(10, -64 + Math.sin(t * 3 + 1) * 3);
      c.lineTo(0, -84);
      c.lineTo(-12, -70);
      c.closePath();
    }, BR.cloth, BR.clothS, { lw: 2.6, shadeY: -110 });
    if (!dead) glow(ctx, 10, -70, 14, P.lava, 0.5);
    const tasset = (pts, dark) => {
      A.shape(ctx, (c) => {
        c.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
        c.closePath();
      }, dark ? U.mix(BR.iron, '#000000', 0.2) : BR.iron, BR.ironS, { cel: [3, 5], lw: 2.6 });
      ctx.strokeStyle = A.c(BR.gold);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(lerp(pts[6], pts[4], 0.08), lerp(pts[7], pts[5], 0.08) - 5);
      ctx.lineTo(lerp(pts[6], pts[4], 0.92), lerp(pts[7], pts[5], 0.92) - 5);
      ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', 0.25);
      ctx.beginPath();
      ctx.ellipse((pts[0] + pts[2]) / 2, pts[1] + 10, 12, 3, 0, 0, TAU);
      ctx.fill();
    };
    tasset([-62, -140, -20, -136, -28, -100, -72, -108], true);
    tasset([42, -136, 84, -140, 94, -106, 50, -100], false);
    // 腰帶掛在髖骨上：兩側高、中間往下垂到骷髏扣
    const belt = (c) => {
      c.moveTo(-54, -162);
      c.quadraticCurveTo(11, -150, 76, -162);
      c.lineTo(78, -140);
      c.quadraticCurveTo(11, -126, -56, -140);
      c.closePath();
    };
    A.shape(ctx, belt, BR.strap, BR.strapS, { lw: 2.8, shadeY: -142 });
    ctx.strokeStyle = rgba('#ffffff', 0.18);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-50, -158);
    ctx.quadraticCurveTo(11, -147, 72, -158);
    ctx.stroke();
    ctx.fillStyle = A.c('#b8b0c0');
    ctx.beginPath();
    [[-42, -151], [-26, -146], [48, -146], [64, -151]].forEach(([x, y]) => {
      ctx.moveTo(x + 2.4, y);
      ctx.arc(x, y, 2.4, 0, TAU);
    });
    ctx.fill();
    // 骷髏扣（有角的小頭骨）
    ctx.save();
    ctx.translate(-1, 14);
    A.shape(ctx, (c) => {
      c.moveTo(0, -166);
      c.quadraticCurveTo(-10, -180, -14, -188);
      c.quadraticCurveTo(-4, -178, 2, -174);
      c.closePath();
      c.moveTo(24, -166);
      c.quadraticCurveTo(34, -180, 38, -188);
      c.quadraticCurveTo(28, -178, 22, -174);
      c.closePath();
    }, BR.horn, BR.hornS, { lw: 2, shadeY: -176 });
    A.shape(ctx, (c) => {
      c.moveTo(-2, -156);
      c.quadraticCurveTo(-2, -176, 12, -176);
      c.quadraticCurveTo(26, -176, 26, -156);
      c.lineTo(20, -146);
      c.lineTo(4, -146);
      c.closePath();
    }, BR.horn, BR.hornS, { lw: 2.4, shadeY: -154 });
    ctx.fillStyle = A.c('#1a0a08');
    ctx.beginPath();
    ctx.arc(7, -160, 3.2, 0, TAU);
    ctx.arc(18, -160, 3.2, 0, TAU);
    ctx.fill();
    if (!dead) {
      ctx.fillStyle = A.c(P.hot);
      ctx.beginPath();
      ctx.arc(7, -160, 1.5, 0, TAU);
      ctx.arc(18, -160, 1.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // ── 頭：只有一頂牛角戰盔（四分之三側，朝右）──
    // 看不到臉：唯一的暗處是面甲上的 T 字開口（純黑；暴走時開口深處只有一點點暗紅）。盔底由護頸甲收口，直接坐在脖子上。
    // 雙角從頭盔兩側往外橫掃（角展約肩寬的 2 倍）、到尖端才往上勾；盔頂噴出火冠。
    ctx.fillStyle = rgba('#000000', 0.35);
    ctx.beginPath();
    ctx.ellipse(11, -318, 70, 20, 0, 0, TAU);
    ctx.fill();
    A.shape(ctx, (c) => taper(c, qb(11, -322, 11, -342, 11, -360), (q) => 78 - q * 10, 6), rock, P.rockS, { cel: [5, 6], lw: 3 });
    ctx.save();
    // 頭盔的中軸（面甲 T 字開口、脊、火冠）在頭的座標 x = 8：對準身體中線 x = 11（胸骨、腹肌白線、骷髏扣）
    ctx.translate(11, -356);
    ctx.rotate(headTilt);
    ctx.scale(0.83, 0.83);
    ctx.translate(-8, 0);
    const hornHeat = dead ? 0 : rage ? 1 : meteor ? 0.6 : 0.3;
    const HI = rage ? '#4a3a40' : '#433e4a'; // 盔鐵
    const HIS = rage ? '#281a1e' : '#221e28';
    const HIL = '#7a7488';
    // 雙角（從盔側的角座長出，往外掃再往上勾）
    // 兩支角對稱於 x = 8
    const lHorn = cb(-46, -35, -206, -26, -366, -32, -384, -116);
    const rHorn = cb(62, -35, 222, -26, 382, -32, 400, -116);
    horn(ctx, lHorn, 49, U.mix(BR.horn, '#6a5040', 0.2), U.mix(BR.hornS, '#3a2a20', 0.2), BR.hornTip, hornHeat * 0.8, '#ff5a1e');
    horn(ctx, rHorn, 49, BR.horn, BR.hornS, BR.hornTip, hornHeat, '#ff5a1e');
    // 盔頂噴出的火冠（後層）
    if (!dead) {
      const fk = rage ? 1.4 : 1;
      glow(ctx, 8, -70, 54 * fk, P.fo, 0.55);
      for (let i = 0; i < 5; i++) {
        const x = -16 + i * 12;
        const k = 1 - Math.abs(i - 2) / 3;
        flame(ctx, x, -58 - k * 12, (9 + k * 5) * fk, (26 + k * 34) * fk, t, i + 92, P.fo, P.fi, 2);
      }
    }
    // 頭盔：圓頂＋盔緣
    const helm = (c) => {
      c.moveTo(-50, 8);
      c.bezierCurveTo(-60, -30, -42, -70, 6, -72);
      c.bezierCurveTo(52, -74, 72, -40, 68, -4);
      c.lineTo(64, 10);
      c.quadraticCurveTo(8, 2, -50, 8);
      c.closePath();
    };
    A.shape(ctx, helm, HI, HIS, { cel: [7, 6], lw: 3.2 });
    // 金屬的大塊反光（圓頂左上）＋熔岩反光（右下）
    ctx.fillStyle = rgba('#ffffff', 0.22);
    ctx.beginPath();
    ctx.ellipse(-18, -52, 26, 9, -0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.4);
    ctx.beginPath();
    ctx.ellipse(-22, -54, 12, 3.4, -0.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(P.lava, 0.5 * Math.min(1, heat));
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-46, 4);
    ctx.quadraticCurveTo(8, -2, 60, 5);
    ctx.stroke();
    // 護頸甲：頰甲之間往下收成一個 V，把盔底封起來（沒有嘴）
    const bevor = (c) => brRound(c, [-42, 0, 58, 0, 52, 16, 8, 30, -36, 16], 0.25);
    A.shape(ctx, bevor, HI, HIS, { cel: [3, 5], lw: 2.8 });
    ctx.strokeStyle = A.c(BR.gold);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-34, 14);
    ctx.lineTo(8, 27);
    ctx.lineTo(50, 14);
    ctx.stroke();
    ctx.fillStyle = A.c('#c8c0d0');
    ctx.beginPath();
    [[-22, 10], [8, 18], [38, 10]].forEach(([x, y]) => {
      ctx.moveTo(x + 2.2, y);
      ctx.arc(x, y, 2.2, 0, TAU);
    });
    ctx.fill();
    // 盔上的裂紋（暴走時燒紅；平常是暗色刻痕）
    const helmCracks = (c) => {
      crack(c, -40, -26, -1.2, 26, 2, 501);
      crack(c, 40, -60, 0.9, 22, 2, 503);
      crack(c, 60, -20, 2.5, 18, 2, 505);
      crack(c, -10, -64, 2.1, 18, 2, 507);
    };
    if (rage && !dead) brVein(ctx, helmCracks, P.lava, hp(9), 2, t);
    else {
      ctx.beginPath();
      helmCracks(ctx);
      ctx.strokeStyle = rgba('#0a0608', 0.7);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    // 中央的脊（從盔頂一路壓到眉帶）
    A.shape(ctx, (c) => taper(c, qb(8, -44, 8, -64, 8, -80), (q) => 13 - q * 8, 8), HIL, HI, { lw: 2.4, shadeY: -58 });
    // 面甲的 T 字開口：斜下壓的眼縫＋往下張開的口縫
    const slot = (c) => {
      c.moveTo(-34, -34);
      c.lineTo(8, -24);
      c.lineTo(50, -36);
      c.lineTo(50, -25);
      c.lineTo(15, -14);
      c.lineTo(18, 8);
      c.lineTo(-2, 8);
      c.lineTo(1, -14);
      c.lineTo(-34, -23);
      c.closePath();
    };
    A.shape(ctx, slot, '#000000', null, { lw: 2.6 });
    if (rage && !dead) {
      // 暴走：開口最深處一點點暗紅的霧（沒有眼睛）
      ctx.save();
      ctx.beginPath();
      slot(ctx);
      ctx.clip();
      glow(ctx, 8, -18, 16, '#6a0a0a', 0.3 + Math.sin(t * 3) * 0.08);
      ctx.restore();
    }
    // 眉帶：跟著眼縫往中間壓的 V、金邊、一排鉚釘
    const band = (c) => {
      c.moveTo(-56, -56);
      c.lineTo(8, -46);
      c.lineTo(68, -58);
      c.lineTo(68, -47);
      c.lineTo(8, -35);
      c.lineTo(-54, -45);
      c.closePath();
    };
    A.shape(ctx, band, '#5a5462', HIS, { lw: 2.6, shadeY: -32 });
    ctx.strokeStyle = A.c(BR.gold);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-53, -54);
    ctx.lineTo(8, -44);
    ctx.lineTo(65, -56);
    ctx.stroke();
    ctx.fillStyle = A.c('#c8c0d0');
    ctx.beginPath();
    [[-44, -50], [-26, -47], [-8, -44], [24, -44], [42, -48], [58, -51]].forEach(([x, y]) => {
      ctx.moveTo(x + 2.3, y);
      ctx.arc(x, y, 2.3, 0, TAU);
    });
    ctx.fill();
    // 頰甲（兩側往下包住臉頰，蓋過下顎兩邊）
    const cheekL = (c) => brRound(c, [-58, -28, -30, -22, -26, 2, -38, 26, -54, 8], 0.2);
    const cheekR = (c) => brRound(c, [44, -24, 72, -30, 70, 4, 58, 26, 46, 4], 0.2);
    A.shape(ctx, cheekL, HI, HIS, { cel: [3, 4], lw: 2.6 });
    A.shape(ctx, cheekR, HI, HIS, { cel: [3, 4], lw: 2.6 });
    ctx.fillStyle = A.c('#c8c0d0');
    ctx.beginPath();
    [[-48, -16], [-42, 4], [60, -18], [62, 2]].forEach(([x, y]) => {
      ctx.moveTo(x + 2.2, y);
      ctx.arc(x, y, 2.2, 0, TAU);
    });
    ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.3);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-50, -18);
    ctx.lineTo(-34, -16);
    ctx.moveTo(50, -18);
    ctx.lineTo(64, -21);
    ctx.stroke();
    // 角座：鉚在盔側的鐵環＋金角環
    [[lHorn, 49], [rHorn, 49]].forEach(([fn, w0]) => {
      const q = 0.14;
      const w = w0 * (1 - q * 0.92) * 0.56;
      const a = along(fn, q, w);
      const b = along(fn, q, -w);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = A.c(BR.gold);
      ctx.lineWidth = 6.4;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.5);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    });
    // 角上燒紅的裂紋（暴走、流星時）
    if (hornHeat > 0.5) {
      [[lHorn, 49, 0.7], [rHorn, 49, 1]].forEach(([fn, w0, k]) => {
        brVein(ctx, (c) => {
          for (let i = 0; i <= 10; i++) {
            const p = along(fn, 0.3 + i * 0.05, (i % 2 ? 1 : -1) * w0 * 0.08);
            i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]);
          }
          const q = along(fn, 0.45, w0 * 0.25);
          c.moveTo(q[0], q[1]);
          const q2 = along(fn, 0.52, w0 * 0.4);
          c.lineTo(q2[0], q2[1]);
        }, P.lava, (hornHeat - 0.3) * 1.4 * k, 2, t);
        const tp = fn(1);
        glow(ctx, tp[0], tp[1], 24, P.hot, (hornHeat - 0.4) * k);
      });
    }
    // 火冠（前層：從脊頂竄出）
    if (!dead) {
      const fk = rage ? 1.4 : 1;
      flame(ctx, 8, -76, 7 * fk, 30 * fk, t, 99, P.fo, P.fi, 2);
    }
    ctx.restore();

    // ── 左手臂＋肩甲 ──
    const arm = (sh, el, hd, back, grip) => {
      const col = back ? rockB : rock;
      const colS = back ? rockBS : P.rockS;
      const ux = el[0] - sh[0];
      const uy = el[1] - sh[1];
      const ul = Math.hypot(ux, uy) || 1;
      const sd = back ? -1 : 1;
      const bx = (sh[0] + el[0]) / 2 + (uy / ul) * 14 * sd;
      const by = (sh[1] + el[1]) / 2 - (ux / ul) * 14 * sd;
      const upperArm = (c) => taper(c, qb(sh[0], sh[1], bx, by, el[0], el[1]), (s) => 64 - s * 18, 12);
      const fx2 = (el[0] + hd[0]) / 2 - (hd[1] - el[1]) * 0.12 * sd;
      const fy2 = (el[1] + hd[1]) / 2 + (hd[0] - el[0]) * 0.12 * sd;
      const fore = (c) => taper(c, qb(el[0], el[1], fx2, fy2, hd[0], hd[1]), (s) => 58 - s * 20, 12);
      // 手肘的骨刺
      const oa = Math.atan2(-(uy / ul) - (hd[1] - el[1]) / 90, -(ux / ul) - (hd[0] - el[0]) / 90);
      A.shape(ctx, (c) => {
        c.moveTo(el[0] + Math.cos(oa + 1.4) * 12, el[1] + Math.sin(oa + 1.4) * 12);
        c.lineTo(el[0] + Math.cos(oa) * 44, el[1] + Math.sin(oa) * 44);
        c.lineTo(el[0] + Math.cos(oa - 1.4) * 12, el[1] + Math.sin(oa - 1.4) * 12);
        c.closePath();
      }, BR.bone, BR.boneS, { lw: 2.4, shadeY: el[1] + Math.sin(oa) * 20 });
      // 上臂：熔岩底＋岩片
      A.shape(ctx, upperArm, P.rockD, null, { lw: 3.2 });
      ctx.save();
      ctx.beginPath();
      upperArm(ctx);
      ctx.clip();
      glow(ctx, (sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2, 50, P.lava, hp(back ? 4 : 5) * 0.85);
      ctx.translate(sh[0], sh[1]);
      ctx.rotate(Math.atan2(uy, ux));
      brPlate(ctx, [-20, -36, ul * 0.55, -36, ul * 0.56, 36, -16, 36], col, colS, P.sheen, 0.5);
      brPlate(ctx, [ul * 0.62, -32, ul + 20, -24, ul + 20, 30, ul * 0.64, 30], col, colS, P.sheen, 0.4);
      ctx.restore();
      ctx.beginPath();
      upperArm(ctx);
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3.2;
      ctx.stroke();
      A.shape(ctx, fore, col, colS, { cel: [6 * sd, 5], lw: 3.2 });
      brSheen(ctx, lerp(el[0], hd[0], 0.3) - 6 * sd, lerp(el[1], hd[1], 0.3) - 8, 22, Math.atan2(hd[1] - el[1], hd[0] - el[0]), 0.35);
      brVein(ctx, (c) => crack(c, lerp(el[0], hd[0], 0.12), lerp(el[1], hd[1], 0.12), Math.atan2(hd[1] - el[1], hd[0] - el[0]) - 0.3, 34, 2, back ? 457 : 459), P.lava, hp(back ? 4 : 5), 2.2, t);
      // 護腕：鐵環＋尖刺＋發光的符文
      const ang = Math.atan2(hd[1] - el[1], hd[0] - el[0]);
      const wx = lerp(el[0], hd[0], 0.6);
      const wy = lerp(el[1], hd[1], 0.6);
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(ang);
      ctx.scale(1, sd);
      A.shape(ctx, (c) => {
        c.moveTo(-8, -18);
        c.lineTo(0, -44);
        c.lineTo(8, -18);
        c.closePath();
      }, '#8a8494', null, { lw: 2.2 });
      A.shape(ctx, (c) => A.roundRect(c, -16, -26, 32, 52, 7), BR.iron, BR.ironS, { lw: 2.8, cel: [0, 6] });
      ctx.strokeStyle = A.c(BR.gold);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-12, -22);
      ctx.lineTo(-12, 22);
      ctx.moveTo(12, -22);
      ctx.lineTo(12, 22);
      ctx.stroke();
      if (!dead) {
        glow(ctx, 0, 0, 14, P.lava, 0.5 * heat);
        ctx.strokeStyle = A.c(U.mix(P.lava, '#ffffff', 0.35));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-4, -10);
        ctx.lineTo(4, -2);
        ctx.lineTo(-4, 4);
        ctx.lineTo(4, 11);
        ctx.stroke();
      }
      ctx.restore();
      // 拳頭＋黑爪
      ctx.save();
      ctx.translate(hd[0], hd[1]);
      ctx.rotate(ang);
      ctx.scale(1, sd);
      if (grip) {
        A.shape(ctx, (c) => c.ellipse(4, 0, 27, 23, 0, 0, TAU), col, colS, { lw: 3, cel: [4, 4] });
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = -1; i <= 1; i++) {
          ctx.moveTo(14, i * 10 - 4);
          ctx.quadraticCurveTo(24, i * 10, 16, i * 10 + 5);
        }
        ctx.stroke();
        brClaw(ctx, 20, 14, 14, 2.2, 7);
      } else {
        A.shape(ctx, (c) => c.ellipse(4, 0, 25, 22, 0, 0, TAU), col, colS, { lw: 3, cel: [4, 4] });
        const open = meteor || whipWind || dive || whipStrike ? 1 : 0.3;
        for (let i = -1; i <= 2; i++) brClaw(ctx, 20, i * 9 - 2, 22 + open * 8, 0.35 * i * open + (1 - open) * 1.1, 9);
      }
      ctx.restore();
    };
    arm([-96, -288], fE, fH, true, false);
    ctx.save();
    ctx.translate(-104, -294);
    ctx.scale(-1, 1);
    brPauldron(ctx, 0, 0, 0.74, 0.25, P, heat, false);
    ctx.restore();

    // ── 右手臂＋火鞭 ──
    let wfn;
    // 判定長度（世界座標）換成這裡的座標：鞭梢著地點＝(Lw, −40 世界)＝預警線／判定框的中線
    const Lw = num(fx.whipLen, 560) / (K * (m.scale || 1));
    const groundY = -40 / K;
    if (whipStrike) {
      // 甩出：鞭梢沿著「頭後上方 → 前方高空 → 前方地面」的弧線劃過（fb_whipcrack 用同一條弧畫火痕）
      const p = whipV;
      const arc = qb(BR_ARC.x0, BR_ARC.y0, Lw * BR_ARC.cx, BR_ARC.cy, Lw, groundY);
      // 手臂在上半身的座標裡：把地面座標的鞭梢換回來，前傾時鞭梢才會正好落在判定框上
      const tw = arc(p);
      const cl = Math.cos(-lean);
      const sl = Math.sin(-lean);
      const ry = tw[1] - bob - drop - HIP0;
      const tp = [tw[0] * cl - ry * sl, tw[0] * sl + ry * cl + HIP0];
      const wv = p >= 1 ? Math.sin(t * 30) * 6 * clamp(1 - (whipT - 0.1) / 0.4, 0.3, 1) : 0;
      const c1 = [lerp(nH[0], tp[0], 0.35), lerp(nH[1], tp[1], 0.35) - 50 * (1 - p) + 10 + wv];
      const c2 = [lerp(nH[0], tp[0], 0.7), lerp(nH[1], tp[1], 0.7) - 30 * (1 - p) - 4 - wv];
      wfn = cb(nH[0], nH[1], c1[0], c1[1], c2[0], c2[1], tp[0], tp[1]);
    } else if (whipWind) {
      // 蓄力：鞭子舉過頭甩到背後、末端捲成一圈（越捲越緊），蓄滿後鞭梢微微發抖
      const k = whipV;
      const idle = [nH[0] + 44, nH[1] + 70, 262, -8, 150, -8];
      const up = [nH[0] - 80, nH[1] - 30, -200, -420, -236, -300];
      const q = idle.map((v, i) => lerp(v, up[i], k));
      const trem = tense ? Math.sin(t * 47) * 4 : 0;
      const body = cb(nH[0], nH[1], q[0], q[1], q[2], q[3] + Math.sin(t * 8) * 8 * k, q[4], q[5] + trem);
      const r0 = 6 + 34 * k;
      const cx = q[4] + r0;
      const cy = q[5] + trem;
      const turn = 1.75 * PI * k;
      wfn = (s) => {
        if (s <= 0.6) return body(s / 0.6);
        const u = (s - 0.6) / 0.4;
        const a = PI + turn * u;
        const r = r0 * (1 - 0.5 * u);
        return [cx + Math.cos(a) * r, cy - Math.sin(a) * r];
      };
    } else if (fly) {
      const sw = Math.sin(t * 3) * 14;
      wfn = cb(nH[0], nH[1], nH[0] + 20, nH[1] + 60, nH[0] - 10 + sw, nH[1] + 120, nH[0] - 50 + sw, nH[1] + 170);
    } else if (dead) {
      wfn = cb(nH[0], nH[1], nH[0] + 30, nH[1] + 40, nH[0] + 60, nH[1] + 30, nH[0] + 90, nH[1] + 14);
    } else {
      const sw = Math.sin(t * 2) * 6;
      wfn = cb(nH[0], nH[1], nH[0] + 44, nH[1] + 70, 262 + sw, -8, 150 + sw * 0.5, -8 + (walk ? Math.sin(t * 8) * 4 : 0));
    }
    const whipGlow = dead ? 0 : whipStrike ? 1 + (rage ? 0.3 : 0) : 0.55 + whipV * 0.6 + (rage ? 0.2 : 0);
    const WW = 13;
    if (whipGlow > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const p = wfn(i / 30);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.strokeStyle = rgba(rage ? '#ffb43a' : '#ff7a1e', Math.min(0.75, 0.35 * whipGlow));
      ctx.lineWidth = 24 + whipV * (whipStrike ? 12 : 20) + (rage ? 8 : 0);
      ctx.stroke();
      if (whipStrike || whipV > 0.3) {
        ctx.strokeStyle = rgba(rage ? '#fff6c8' : '#ffd23a', whipStrike ? 0.55 : 0.4 * whipV);
        ctx.lineWidth = 10 + (rage ? 4 : 0);
        ctx.stroke();
      }
      ctx.restore();
    }
    A.shape(ctx, (c) => taper(c, wfn, (s) => WW - s * 8, 30), BR.whip, null, { lw: 2.6 });
    // 鞭身：一節節的骨節＋倒鉤
    ctx.fillStyle = A.c(BR.whipSeg);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    for (let i = 1; i < 16; i++) {
      const q = i / 16;
      const p = along(wfn, q, 0);
      const w = (WW - q * 8) * 0.62;
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], w * 0.55, w, p[2], 0, TAU);
      ctx.fill();
      ctx.stroke();
      if (i % 3 === 0) {
        const b1 = along(wfn, q, w + 1);
        const b2 = along(wfn, q - 0.035, w * 2.4 + 3);
        const b3 = along(wfn, q - 0.02, w);
        ctx.beginPath();
        ctx.moveTo(b1[0], b1[1]);
        ctx.lineTo(b2[0], b2[1]);
        ctx.lineTo(b3[0], b3[1]);
        ctx.closePath();
        ctx.save();
        ctx.fillStyle = A.c('#d8ccb0');
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const p = wfn(i / 30);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.strokeStyle = A.c(dead ? '#3a1a10' : whipStrike ? '#ffe27a' : P.lava);
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -t * 60;
    ctx.stroke();
    ctx.restore();
    if (!dead) {
      // 沿鞭身的火舌：蓄力時越竄越高、越來越多；暴走更大更亮
      const fl = whipWind ? whipV : 0;
      const n = whipStrike ? 7 : 5 + Math.round(fl * 2);
      const fw = (whipStrike ? 9 : 6 + fl * 4) * (rage ? 1.2 : 1);
      const fh = (whipStrike ? 30 : 18 + fl * 22) * (rage ? 1.25 : 1);
      const fo = rage ? '#ffb43a' : '#ff7a1e';
      const fi = rage ? '#fff6c8' : '#ffe27a';
      for (let i = 1; i <= n; i++) {
        const p = wfn(i / n);
        flame(ctx, p[0], p[1] + 3, fw, fh, t, i + 20, fo, fi, 1.8);
      }
      // 鞭梢的火球（蓄力時越來越大；著地瞬間爆出白光）
      const tp = wfn(1);
      glow(ctx, tp[0], tp[1], 30 + fl * 26 + crackK * (rage ? 90 : 70), crackK > 0 ? '#fff4c0' : '#ffb43a', 0.8 + crackK * 0.2);
      if (tense) glow(ctx, tp[0], tp[1], 18, '#ffffff', 0.5 + 0.4 * Math.abs(Math.sin(t * 30)));
      // 握把處的火焰（蓄力的力量從手上灌進鞭子）
      if (whipWind && fl > 0.2) glow(ctx, nH[0], nH[1], 28 + fl * 32, '#ff9a2a', 0.5 * fl);
    }
    // 鞭柄
    ctx.save();
    ctx.translate(nH[0], nH[1]);
    ctx.rotate(Math.atan2(nH[1] - nE[1], nH[0] - nE[0]));
    A.shape(ctx, (c) => A.roundRect(c, -16, -7, 40, 14, 4), '#2a1a14', null, { lw: 2.4 });
    A.shape(ctx, (c) => c.ellipse(-18, 0, 7, 9, 0, 0, TAU), BR.gold, BR.goldS, { lw: 2.2, shadeY: 2 });
    ctx.restore();
    arm([112, -288], nE, nH, false, true);
    brPauldron(ctx, 122, -294, 0.76, 0.25, P, heat, false);

    // ── 流星火雨：高舉雙手，頭上凝聚的火球 ──
    if (meteor && !dead) {
      const k = 0.8 + Math.sin(t * 12) * 0.2;
      const r = 30 * k + (ph === 'strike' ? 12 : 0);
      const bx = 20;
      const by = -510;
      glow(ctx, bx, by, r * 3.2, '#ff7a1e', 0.8);
      A.ellipse(ctx, bx, by, r, r, '#ffb43a', '#ff7a1e', { lw: 3, hl: [bx - 8, by - 8, r * 0.4, r * 0.25] });
      A.ellipse(ctx, bx, by, r * 0.5, r * 0.5, '#fff4c0', null, { noStroke: true, hl: false });
      for (let i = 0; i < 8; i++) {
        const a = t * 4 + (i / 8) * TAU;
        const rr = r * 1.6 + ((t * 60 + i * 13) % 30);
        ctx.fillStyle = A.c('#ffd23a');
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * rr, by + Math.sin(a) * rr, 3, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    // ── 火星、熱浪 ──
    if (!dead) {
      // 往上飄的火星（不用漸層：暖色外圈＋亮芯）
      for (let i = 0; i < (rage ? 20 : 12); i++) {
        const q = (t * 0.5 + hash(5 + i)) % 1;
        const ex = 10 + (hash(6 + i) - 0.5) * 320 + Math.sin(t * 3 + i) * 6;
        const ey = -60 - q * 380;
        const a = Math.sin(q * PI);
        ctx.fillStyle = rgba(P.lava, 0.35 * a);
        ctx.beginPath();
        ctx.arc(ex, ey, 4.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(P.white, 0.95 * a);
        ctx.fillRect(ex - 1.3, ey - 1.3, 2.6, 2.6);
      }
      // 熱浪：頭頂上方扭動的半透明氣流
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const x0 = -60 + i * 44 + hash(i + 480) * 20;
        const ph2 = t * 5 + i * 1.3;
        ctx.strokeStyle = rgba(i % 2 ? '#ffe6c0' : P.hot, (rage ? 0.1 : 0.06) * (0.7 + 0.3 * Math.sin(t * 3 + i)));
        ctx.lineWidth = 10 - (i % 2) * 4;
        ctx.beginPath();
        for (let j = 0; j <= 7; j++) {
          const y = -400 - j * 22 - ((t * 40 + i * 30) % 22);
          const x = x0 + Math.sin(ph2 + j * 0.9) * (4 + j * 1.2);
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ═════════════════════════ 千手冰像 fb_zakum（260×300） ═════════════════════════
  // 上古冰石神像（帶一點百式觀音「背後一圈千手」的感覺）：半埋在雪堆裡的巨大石雕神像。
  // 小一號的刺冠石臉（倒 V 眉骨、深眼窩、淚紋符文、金耳璫、額頭金框裡的藍魔石）；平常半闔著眼、閉著嘴，暴走時睜眼露牙。
  // 層層疊起的身軀：兩層石肩甲、金邊胸甲＋金項鍊、腹部的日輪浮雕與橫紋帶、腰帶下一圈石裙甲與結冰的垂布。
  // 八隻細長的石臂：正面一對合掌；背後左右各三隻排成一圈手的光背（上：施無畏印、中：說法印、下：與願印），
  // 每隻都有肩球＋金環、臂釧、肘球＋金環、兩圈金手鐲，手是細長微翹的佛像手指；待機時依序擺動。
  // 出招：fx.arm 那隻手舉起、掌心聚光 → 平掌砸下（殘影弧光）；光束從額頭的魔石射出。
  // 暴走：石頭轉為深藍、背後的冰晶光輪、全身符文與裂紋發亮、眼睛與魔石轉為白紫、雙眼怒睜、冰獠牙。
  // 手臂索引：js/game/fieldboss.js 以世界座標分邊（0～2 = 世界左側、3～5 = 世界右側），各自是上／中／下。
  // 光束起點＝額頭魔石：頭在 (0, ZK_HY) 縮放 ZK_HS，魔石在頭座標 (0, −34) → 設計座標 y = ZK_HY − 34·ZK_HS。
  const ZK = {
    stone: '#8492a8', stoneS: '#5c687e', stoneD: '#3c465a', stoneL: '#a6b3c6', stoneLS: '#7a889e',
    stoneR: '#566286', stoneRS: '#394366', stoneRD: '#232a46', stoneRL: '#7684aa', stoneRLS: '#4e5a80',
    ice: '#c8ecff', iceS: '#8cc4ec', iceD: '#5a9ad0', glow: '#7ad8ff', glowR: '#c4f4ff', violet: '#b48aff',
    gem: '#2a6aff', gemR: '#a04aff', gold: '#d6b460', goldS: '#9a7834', goldR: '#ecd07a', goldRS: '#a88236',
    cloth: '#2e4c7c', clothS: '#1c3258', clothR: '#3a2a6a', clothRS: '#241848',
    snow: '#f2f8ff', snowS: '#c4d6ea',
  };
  function iceCrystal(ctx, x, y, h, w, a, col, colS) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    A.shape(ctx, (c) => {
      c.moveTo(-w, 0);
      c.lineTo(-w * 0.9, -h * 0.72);
      c.lineTo(0, -h);
      c.lineTo(w * 0.9, -h * 0.72);
      c.lineTo(w, 0);
      c.closePath();
    }, col || ZK.ice, colS || ZK.iceS, { cel: [w * 0.5, 0], lw: 2.4 });
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.55, -h * 0.1);
    ctx.lineTo(-w * 0.45, -h * 0.66);
    ctx.lineTo(-w * 0.15, -h * 0.8);
    ctx.lineTo(-w * 0.25, -h * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // 沿著中心線 fn 在 s0～s1 之間畫一圈臂環（寬度 wf(s)）
  function zkBand(ctx, fn, s0, s1, wf, col, colS) {
    const a0 = along(fn, s0, wf(s0) / 2 + 2);
    const b0 = along(fn, s0, -wf(s0) / 2 - 2);
    const a1 = along(fn, s1, wf(s1) / 2 + 2);
    const b1 = along(fn, s1, -wf(s1) / 2 - 2);
    A.shape(ctx, (c) => {
      c.moveTo(a0[0], a0[1]);
      c.lineTo(a1[0], a1[1]);
      c.lineTo(b1[0], b1[1]);
      c.lineTo(b0[0], b0[1]);
      c.closePath();
    }, col, colS, { lw: 2.6, shadeY: (a1[1] + b1[1]) / 2 + 2 });
  }
  // 關節：石球＋金環（不用裁切的陰影：左上一點亮面就好）
  function zkJoint(ctx, x, y, r, col, colS, gold) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = A.c(colS);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y - r * 0.22, r * 0.62, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.64, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = A.c(gold);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  // 細長的石臂段：填色＋陰影側一道暗帶＋亮側一道細光＋描邊（不用裁切，八隻手臂畫得起）
  // sx：這個座標系有沒有被左右翻過（1 / −1），讓陰影永遠在世界的右下
  function zkLimb(ctx, fn, wf, col, colS, colL, sx) {
    ctx.beginPath();
    taper(ctx, fn, wf, 12);
    ctx.fillStyle = A.c(col);
    ctx.fill();
    const p0 = fn(0);
    const p1 = fn(1);
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const sg = -dy * 0.6 * sx + dx * 0.8 > 0 ? 1 : -1; // along() 的 +off 是左法線
    const wm = (wf(0) + wf(1)) / 2;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const q = 0.04 + i * 0.15;
      const p = along(fn, q, sg * wf(q) * 0.3);
      if (i) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    ctx.strokeStyle = A.c(colS);
    ctx.lineWidth = wm * 0.36;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const q = 0.1 + i * 0.14;
      const p = along(fn, q, -sg * wf(q) * 0.28);
      if (i) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    ctx.strokeStyle = A.c(colL);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    taper(ctx, fn, wf, 12);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2.8;
    ctx.stroke();
  }
  // 細的金手鐲／臂釧：沿著中心線 fn 在 s 處橫跨一條（只描線、不裁切，八隻手臂每幀要畫二十幾條）
  function zkBangle(ctx, fn, s, wf, w, gold, goldS) {
    const a = along(fn, s, wf(s) / 2 + 1.5);
    const b = along(fn, s, -wf(s) / 2 - 1.5);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = w + 2.6;
    ctx.stroke();
    ctx.strokeStyle = A.c(goldS);
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(a[0] + (b[0] - a[0]) * 0.1 - Math.cos(a[2]) * w * 0.2, a[1] + (b[1] - a[1]) * 0.1 - Math.sin(a[2]) * w * 0.2);
    ctx.lineTo(a[0] + (b[0] - a[0]) * 0.62 - Math.cos(a[2]) * w * 0.2, a[1] + (b[1] - a[1]) * 0.62 - Math.sin(a[2]) * w * 0.2);
    ctx.strokeStyle = A.c(gold);
    ctx.lineWidth = w * 0.55;
    ctx.stroke();
  }
  // 觀音手（原點在手腕、手指朝 +x、拇指在 −y 側、掌心朝前）：細長、微微外翹的佛像手指。
  // mu = 每根手指（食、中、無名、小、拇）的彎曲量：> 0.6 是收進掌心的手指，其他是伸直時指尖的彎度
  const ZK_MUDRA = {
    abhaya: [-0.12, -0.15, -0.12, -0.08, 0.1], // 施無畏印：手指向上、掌心朝前
    vitarka: [1, -0.1, -0.08, -0.14, 1], // 說法印：食指與拇指扣成圈
    varada: [0.18, 0.24, 0.3, 0.36, 0.15], // 與願印：手往下垂、手指微彎
    strike: [0.02, 0, 0.02, 0.04, 0.35], // 平掌（砸下）
  };
  const ZK_FY = [-6.2, -2.1, 2.1, 6];
  const ZK_FL = [21, 23.5, 22, 17.5];
  const ZK_FW = [6.4, 6.8, 6.4, 5.4];
  function zkPalm(ctx, mu, col, colS, heat, gcol) {
    if (heat > 0) glow(ctx, 18, 0, 34, gcol, 0.5 * heat);
    const fingers = (c) => {
      for (let i = 0; i < 4; i++) {
        const cu = mu[i];
        const bx = 16;
        const by = ZK_FY[i];
        let L = ZK_FL[i];
        let a = (i - 1.5) * 0.07;
        let bend = L * (0.07 + cu * 0.3);
        if (cu > 0.6) {
          // 收進掌心：短、往拇指那側收
          L *= 0.46;
          a = i === 0 ? -0.6 : -0.25;
          bend = -2;
        }
        const ex = bx + Math.cos(a) * L;
        const ey = by + Math.sin(a) * L;
        const mx = (bx + ex) / 2 - Math.sin(a) * bend;
        const my = (by + ey) / 2 + Math.cos(a) * bend;
        taper(c, qb(bx, by, mx, my, ex, ey), (q) => ZK_FW[i] * (1 - q * 0.38), 5);
      }
      // 拇指
      const ct = mu[4];
      const ta = -0.95 + ct * 0.75;
      const jx = 3 + Math.cos(ta) * 10;
      const jy = -6 + Math.sin(ta) * 10;
      const tb = ta + 0.25 + ct * 0.35;
      taper(c, qb(3, -5, jx, jy, jx + Math.cos(tb) * 10, jy + Math.sin(tb) * 10), (q) => 7.4 * (1 - q * 0.35), 5);
    };
    A.shape(ctx, fingers, col, null, { lw: 1.7 });
    // 手掌＋掌心的符文
    A.shape(ctx, (c) => {
      c.moveTo(-3, -7);
      c.bezierCurveTo(4, -9.5, 11, -9.4, 18, -8.4);
      c.lineTo(18.4, 8.2);
      c.bezierCurveTo(11, 9.6, 4, 9, -3, 6.4);
      c.closePath();
    }, col, null, { lw: 2.4 });
    if (heat > 0.05) {
      hotLines(ctx, (c) => {
        c.moveTo(9, -4.5);
        c.lineTo(13.5, 0);
        c.lineTo(9, 4.5);
        c.lineTo(4.5, 0);
        c.closePath();
      }, gcol, heat, 1.4);
    } else {
      // 掌紋
      ctx.strokeStyle = A.c(colS);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(3, -4);
      ctx.quadraticCurveTo(9, 1, 5, 6.5);
      ctx.moveTo(7, -5.5);
      ctx.quadraticCurveTo(12, -2, 16, -4);
      ctx.stroke();
    }
    if (heat > 0.5) glow(ctx, 9, 0, 10, '#ffffff', 0.6 * (heat - 0.5));
  }
  // 頭的位置與縮放（光束起點在 js/game/fieldboss.js 用同一組數字算）
  const ZK_HY = -240;
  const ZK_HS = 0.94;
  function fb_zakum(ctx, m) {
    const S = atk(m);
    // 剛砸下的手臂（js/game/fieldboss.js：fx.hitArm、fx.hitT 0.45 → 0）：停在砸下的姿勢，再收回待機
    const hitArm0 = m.dead ? -1 : Math.floor(num(m.fx && m.fx.hitArm, -1));
    const hitK = hitArm0 >= 0 ? clamp(num(m.fx.hitT, 0) / 0.45, 0, 1) : 0;
    const hitArm = hitK > 0 ? hitArm0 : -1;
    const { fx, ph, t, rage, dead, kind } = S;
    const K = (m.h || 300) / 320;
    const armI = fx.arm != null && fx.arm >= 0 ? Math.floor(num(fx.arm, -1)) : -1;
    const slam = amt(fx.slam);
    // 砸下去的瞬間 fx.slam = 1（之後很快退回），預警時最多 0.7
    const slamDown = armI >= 0 && (ph === 'strike' || ph === 'recover' || slam > 0.72);
    const beam = amt(fx.beam);
    const beamFire = !!fx.beamFire || (beam > 0 && (ph === 'strike' || (!ph && beam >= 0.999)));
    const beamCharge = (beam > 0 || kind === 'beam') && !beamFire;
    const shard = /shard|crystal|rain/.test(kind) || !!fx.shard || (ph === 'wind' && armI < 0 && !beam && !kind);
    const hurt = S.hurt;
    const stone = rage ? ZK.stoneR : ZK.stone;
    const stoneS = rage ? ZK.stoneRS : ZK.stoneS;
    const stoneD = rage ? ZK.stoneRD : ZK.stoneD;
    const stoneL = rage ? ZK.stoneRL : ZK.stoneL;
    const stoneLS = rage ? ZK.stoneRLS : ZK.stoneLS;
    const gold = rage ? ZK.goldR : ZK.gold;
    const goldS = rage ? ZK.goldRS : ZK.goldS;
    const gcol = rage ? ZK.glowR : ZK.glow;
    const heat = dead ? 0 : clamp(0.55 + Math.sin(t * 2.2) * 0.15 + (rage ? 0.5 : 0) + beam * 0.4 + (shard ? 0.3 : 0), 0, 1.4);
    const rumble = beamCharge || (armI >= 0 && !slamDown) || shard ? Math.sin(t * 45) * 1.4 : 0;
    const breathe = dead ? 8 : Math.sin(t * 1.2) * 2;
    const hy0 = ZK_HY + breathe;

    ctx.save();
    ctx.scale(K, K);
    ctx.translate(rumble, 0);
    if (!dead) {
      glow(ctx, 0, -170, 230 + (rage ? 50 : 0), rage ? '#8ab8ff' : '#6ab0ff', (rage ? 0.34 : 0.2) + Math.sin(t * 2) * 0.04);
      // 飄落的細雪／冰塵（暴走時往上飄）；一條路徑一次填
      ctx.fillStyle = rgba(gcol, 0.8);
      ctx.beginPath();
      for (let i = 0; i < (rage ? 16 : 9); i++) {
        const q = (t * 0.25 + hash(i + 200)) % 1;
        const x = (hash(i + 201) - 0.5) * 380 + Math.sin(t + i) * 10;
        const y = rage ? -20 - q * 320 : -320 + q * 300;
        const r = (1.6 + hash(i) * 1.6) * Math.sin(q * PI);
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
    }

    // ── 暴走：背後展開的冰晶光輪 ──
    if (rage) {
      const op = dead ? 0.5 : 1;
      ctx.save();
      ctx.translate(0, hy0 - 26);
      ctx.scale(0.78, 0.78);
      glow(ctx, 0, 0, 230, '#9ad8ff', 0.4 * op);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + PI / 12;
        if (Math.sin(a) > 0.3) continue; // 下面被身體擋住
        const L = (i % 2 ? 70 : 110) * op + Math.sin(t * 2 + i) * 4;
        iceCrystal(ctx, Math.cos(a) * 140, Math.sin(a) * 140, L, i % 2 ? 10 : 15, a + PI / 2, i % 2 ? ZK.ice : '#e6f7ff', ZK.iceS);
      }
      ctx.rotate(t * 0.4);
      ctx.strokeStyle = rgba(ZK.violet, 0.8 * op);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 146, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = rgba('#e8f8ff', 0.9 * op);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 132, 0, TAU);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        const x = Math.cos(a) * 139;
        const y = Math.sin(a) * 139;
        ctx.moveTo(x + Math.cos(a + 1.57) * 4, y + Math.sin(a + 1.57) * 4);
        ctx.lineTo(x - Math.cos(a + 1.57) * 4, y - Math.sin(a + 1.57) * 4);
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ── 手臂：背後左右各三隻，手腕排在以胸口為圓心的一圈上、手指往外放射（一圈手的光背）──
    // s 肩窩、L 上臂／前臂長、r/a 手腕在光背圓上的半徑與角度（從正上方往外量）、hs 手的大小、mu 手印（左、右）
    // 手臂用兩段 IK：手腕到哪、手肘就自然往外下彎
    const ZC = [0, -186];
    const TIER = [
      { s: [58, -198], L: [80, 72], r: 178, a: 0.5, tw: -0.1, hs: 1.3, mu: [ZK_MUDRA.abhaya, ZK_MUDRA.abhaya], dim: 0.26 },
      { s: [72, -166], L: [80, 70], r: 186, a: 1.06, tw: -0.22, hs: 1.34, mu: [ZK_MUDRA.vitarka, ZK_MUDRA.vitarka], dim: 0.13 },
      { s: [70, -126], L: [72, 64], r: 172, a: 1.66, tw: 0.3, hs: 1.34, mu: [ZK_MUDRA.varada, ZK_MUDRA.varada], dim: 0 },
    ];
    const onRing = (r, a) => [ZC[0] + Math.sin(a) * r, ZC[1] - Math.cos(a) * r];
    const armPose = (i) => {
      const lvl = i % 3;
      const T = TIER[lvl];
      // 依序擺動：上 → 中 → 下，右側晚半拍（一波一波的千手）
      const sw = t * 1.15 - lvl * 0.9 - (i >= 3 ? 0.45 : 0);
      let r = T.r + Math.sin(sw) * 5;
      let a = T.a + Math.sin(sw - 0.7) * 0.05;
      let w = onRing(r, a);
      // 手的方向：沿著半徑往外（再依層微調）
      let ha = a - PI / 2 + T.tw + Math.sin(sw - 1.5) * 0.12;
      let mu = T.mu[i >= 3 ? 1 : 0];
      let hot = 0;
      if (beamCharge || beamFire) {
        // 眾手往外張開一點、掌心聚光
        const k = beamFire ? 1 : clamp(beam * 1.4, 0, 1);
        w = onRing(r + 10 * k, a - 0.1 * k);
        ha -= 0.12 * k;
        hot = 0.45 * k;
      }
      if (shard) {
        // 眾手托天
        w = onRing([186, 190, 170][lvl], [0.34, 0.8, 1.3][lvl] + Math.sin(t * 6 + i) * 0.03);
        ha = -PI / 2 + [0.1, 0.35, 0.6][lvl];
        mu = ZK_MUDRA.abhaya;
        hot = 0.7;
      }
      // 平掌砸下的位置（往外下方、掌心朝下）
      const DW = [[130 + lvl * 14, -62 + lvl * 12], 1.25];
      if (i === hitArm && !(i === armI && slamDown && hitK < 0.9)) {
        // 砸下 → 收回：前 45% 停在砸下的位置，之後緩緩回到待機姿勢
        const q = hitK > 0.55 ? 1 : hitK / 0.55;
        const e = q * q * (3 - 2 * q);
        w = [lerp(w[0], DW[0][0], e), lerp(w[1], DW[0][1], e)];
        ha = lerp(ha, DW[1], e);
        mu = ZK_MUDRA.strike;
        hot = e;
      } else if (i === armI && !dead) {
        if (slamDown) {
          w = DW[0];
          ha = DW[1];
          hot = 1;
        } else {
          // 出招中（kind = 'arm'）slam 是 0 就是還沒開始舉；沒有招式資訊時（圖鑑等）給一個舉到一半的姿勢
          const k = clamp((slam > 0 ? slam : kind === 'arm' ? 0 : 0.4) / 0.7, 0, 1);
          const up = [T.s[0] + 18, T.s[1] - (T.L[0] + T.L[1]) * 0.92];
          w = [lerp(w[0], up[0], k), lerp(w[1], up[1], k)];
          ha = lerp(ha, -PI / 2 + 0.05, k);
          hot = 0.2 + 0.8 * k;
        }
        mu = ZK_MUDRA.strike;
      }
      if (dead) {
        w = [T.s[0] + 40 + lvl * 16, -50 + lvl * 10];
        ha = 1.35;
        mu = ZK_MUDRA.varada;
        hot = 0;
      }
      return { w, ha, mu, hot };
    };
    const drawArm = (i) => {
      const side = (i >= 3 ? 1 : -1) * (m.dir < 0 ? -1 : 1);
      const lvl = i % 3;
      const T = TIER[lvl];
      const P = armPose(i);
      const [L1, L2] = T.L;
      const down = !dead && ((i === armI && slamDown) || (i === hitArm && hitK > 0.6));
      ctx.save();
      ctx.scale(side, 1);
      const sx = T.s[0];
      const sy = T.s[1] + breathe;
      // 兩段 IK（手肘往外、往下彎）
      const hx0 = P.w[0];
      const hy0w = P.w[1] + breathe;
      const dA = Math.atan2(hy0w - sy, hx0 - sx);
      const d = clamp(Math.hypot(hx0 - sx, hy0w - sy), Math.abs(L1 - L2) + 2, L1 + L2 - 2);
      const th = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const a1 = dA + th;
      const ex = sx + Math.cos(a1) * L1;
      const ey = sy + Math.sin(a1) * L1;
      const hx = sx + Math.cos(dA) * d;
      const hy = sy + Math.sin(dA) * d;
      const fa = Math.atan2(hy - ey, hx - ex);
      P.a1 = a1;
      P.wr = P.ha - fa;
      // 後層比較暗（深度）；正在出招的手臂不壓暗
      const dim = i === armI || i === hitArm ? 0 : T.dim;
      const col = U.mix(stone, stoneD, dim * 0.8);
      const colS = U.mix(stoneS, stoneD, dim);
      const colL = U.mix(stoneL, stoneS, dim);
      const colLS = U.mix(stoneLS, stoneD, dim);
      // 出招的那隻手多一圈大光暈（其他手只有掌心的小光）
      if (P.hot > 0 && !dead && (i === armI || i === hitArm)) glow(ctx, hx + Math.cos(fa + P.wr) * 20, hy + Math.sin(fa + P.wr) * 20, 62, gcol, 0.5 * P.hot);
      // 平掌砸下：揮過的弧光＋兩道殘影
      if (down) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(gcol, 0.45);
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(sx, sy, L1 + L2 + 4, -1.4, fa - 0.1);
        ctx.stroke();
        ctx.strokeStyle = rgba('#e8f8ff', 0.6);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sx, sy, L1 + L2 + 22, -1.3, fa - 0.15);
        ctx.stroke();
        [-0.9, -0.3].forEach((d, n) => {
          const a = fa + d * 1.4;
          ctx.save();
          ctx.globalAlpha *= n ? 0.35 : 0.2;
          ctx.translate(sx + Math.cos(a) * (L1 + L2 - 6), sy + Math.sin(a) * (L1 + L2 - 6));
          ctx.rotate(a + 0.2);
          zkPalm(ctx, ZK_MUDRA.strike, gcol, U.mix(gcol, '#2a4a8a', 0.5), 0, gcol);
          ctx.restore();
        });
      }
      // 肩：石球＋金環
      zkJoint(ctx, sx, sy, 13, col, colS, gold);
      // 上臂（微微鼓起）＋臂釧
      const ua = qb(sx, sy, (sx + ex) / 2 + Math.sin(P.a1) * 3, (sy + ey) / 2 - Math.cos(P.a1) * 3, ex, ey);
      const uw = (q) => 25 - q * 6 + Math.sin(q * PI) * 4;
      zkLimb(ctx, ua, uw, col, colS, colL, side);
      zkBangle(ctx, ua, 0.46, uw, 6, gold, goldS);
      const ag = along(ua, 0.46, 0);
      A.ellipse(ctx, ag[0], ag[1], 3.2, 3.2, rage ? ZK.gemR : ZK.gem, null, { lw: 1.4, hl: false });
      // 前臂（往手腕收細）＋符文＋兩圈金手鐲
      const fr = qb(ex, ey, (ex + hx) / 2, (ey + hy) / 2, hx, hy);
      const fw = (q) => 22 - q * 9 + Math.sin(q * PI * 0.7) * 2.5;
      zkLimb(ctx, fr, fw, col, colS, colL, side);
      if (!dead && (rage || P.hot > 0)) {
        hotLines(ctx, (c) => {
          const p = along(fr, 0.42, 0);
          c.moveTo(p[0] - 4, p[1] - 4);
          c.lineTo(p[0], p[1] + 4);
          c.lineTo(p[0] + 4, p[1] - 4);
        }, gcol, Math.max(P.hot, rage ? 1 : 0), 1.8);
      }
      zkBangle(ctx, fr, 0.8, fw, 3.6, gold, goldS);
      zkBangle(ctx, fr, 0.91, fw, 3.6, gold, goldS);
      // 肘：石球＋金環＋一根冰晶
      zkJoint(ctx, ex, ey, 11, col, colS, gold);
      if (lvl === 0) iceCrystal(ctx, ex, ey - 6, rage ? 24 : 15, rage ? 6 : 4.5, -0.5 + P.a1 * 0.3, ZK.ice, ZK.iceS);
      // 手
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(fa + P.wr);
      ctx.scale(T.hs, T.hs);
      zkPalm(ctx, P.mu, colL, colLS, dead ? 0 : P.hot, gcol);
      ctx.restore();
      // 砸下：飛濺的冰塊
      if (down) {
        for (let k = 0; k < 5; k++) {
          const q = (t * 2.5 + k / 5) % 1;
          iceCrystal(ctx, hx + 30 + (k - 2) * 12 * (1 + q), hy + 30 - Math.sin(q * PI) * 40, 12, 4, (k - 2) * 0.5, ZK.ice, ZK.iceS);
        }
      }
      ctx.restore();
    };
    // 上 → 中 → 下（上層在最後面）；正在出招／剛砸下的手臂留到頭之後畫在最前面
    [0, 3, 1, 4, 2, 5].filter((i) => i !== armI && i !== hitArm).forEach(drawArm);

    // ── 身軀（石像）──
    ctx.save();
    ctx.translate(0, breathe);
    const body = (c) => {
      c.moveTo(-72, -20);
      c.lineTo(-80, -112);
      c.quadraticCurveTo(-98, -170, -76, -192);
      c.quadraticCurveTo(-40, -206, 0, -204);
      c.quadraticCurveTo(40, -206, 76, -192);
      c.quadraticCurveTo(98, -170, 80, -112);
      c.lineTo(72, -20);
      c.closePath();
    };
    A.shape(ctx, body, stone, stoneS, { cel: [12, 6], hl: [-48, -170, 12, 20], lw: 3.4 });
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    // 胸肌的雕刻
    ctx.strokeStyle = A.c(stoneD);
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-70, -164);
    ctx.quadraticCurveTo(-40, -120, -4, -150);
    ctx.moveTo(70, -164);
    ctx.quadraticCurveTo(40, -120, 4, -150);
    // 腹部的橫紋帶
    ctx.moveTo(-80, -100);
    ctx.lineTo(80, -100);
    ctx.moveTo(-80, -82);
    ctx.lineTo(80, -82);
    for (let k = -3; k <= 3; k++) {
      const x = k * 22;
      ctx.moveTo(x - 7, -96);
      ctx.lineTo(x, -86);
      ctx.lineTo(x + 7, -96);
    }
    ctx.stroke();
    // 胸口上緣的鋸齒雕花帶、胸肌上的符文圓章、下腹的回紋
    ctx.strokeStyle = A.c(stoneD);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 14; k++) {
      const x = -78 + k * 12;
      ctx.moveTo(x, -186);
      ctx.lineTo(x + 6, -178);
      ctx.lineTo(x + 12, -186);
    }
    ctx.moveTo(-80, -190);
    ctx.lineTo(80, -190);
    ctx.moveTo(-80, -174);
    ctx.lineTo(80, -174);
    for (let k = 0; k < 8; k++) {
      const x = -72 + k * 19;
      ctx.moveTo(x, -44);
      ctx.lineTo(x, -54);
      ctx.lineTo(x + 12, -54);
      ctx.lineTo(x + 12, -46);
      ctx.lineTo(x + 5, -46);
    }
    ctx.stroke();
    [-1, 1].forEach((sd) => {
      const x = 44 * sd;
      const y = -140;
      ctx.strokeStyle = A.c(stoneD);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, TAU);
      ctx.moveTo(x + 8, y);
      ctx.arc(x, y, 8, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c(U.mix(stone, '#ffffff', 0.3));
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x - 1, y - 1, 13, PI * 1.05, PI * 1.6);
      ctx.stroke();
      hotLines(ctx, (c) => {
        c.moveTo(x, y - 5);
        c.lineTo(x, y + 5);
        c.moveTo(x - 4, y - 2);
        c.lineTo(x + 4, y + 2);
      }, gcol, dead ? 0 : 0.4 + heat * 0.4, 1.4);
    });
    // 發光裂紋
    hotLines(ctx, (c) => {
      crack(c, -62, -30, -1.0, 60, 4, 81);
      crack(c, 58, -40, -2.1, 60, 4, 83);
      if (rage) {
        crack(c, -60, -190, 0.9, 60, 4, 89);
        crack(c, 66, -180, 2.3, 50, 4, 91);
        crack(c, -24, -60, 0.2, 50, 3, 93);
      }
    }, gcol, heat, rage ? 3.4 : 2.6);
    ctx.restore();
    finish(ctx, body, [-98, -206, 98, -20], { rim: '#eaf8ff', rimA: 0.34, dark: '#0a1424', darkA: 0.38, bounce: gcol, bounceA: 0.22, tex: stoneD, texA: 0.3, texN: 30, seed: 17, lw: 3.4 });
    // 胸甲：一片疊在胸口的石板（下緣是一圈扇形＋金邊），下面露出腹部的橫紋帶
    const plate = (c) => {
      c.moveTo(-80, -198);
      c.quadraticCurveTo(0, -212, 80, -198);
      c.lineTo(84, -150);
      c.quadraticCurveTo(70, -140, 56, -146);
      c.quadraticCurveTo(44, -132, 28, -138);
      c.quadraticCurveTo(14, -124, 0, -130);
      c.quadraticCurveTo(-14, -124, -28, -138);
      c.quadraticCurveTo(-44, -132, -56, -146);
      c.quadraticCurveTo(-70, -140, -84, -150);
      c.closePath();
    };
    A.shape(ctx, plate, stoneL, stoneLS, { cel: [6, 6], lw: 3.2, hl: [-50, -186, 10, 5] });
        ctx.strokeStyle = A.c(gold);
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-80, -154);
    ctx.quadraticCurveTo(-70, -146, -56, -151);
    ctx.quadraticCurveTo(-44, -138, -28, -143);
    ctx.quadraticCurveTo(-14, -130, 0, -136);
    ctx.quadraticCurveTo(14, -130, 28, -143);
    ctx.quadraticCurveTo(44, -138, 56, -151);
    ctx.quadraticCurveTo(70, -146, 80, -154);
    ctx.stroke();
    hotLines(ctx, (c) => {
      [-1, 1].forEach((sd) => {
        c.moveTo(40 * sd, -178);
        c.lineTo(46 * sd, -166);
        c.lineTo(40 * sd, -154);
      });
    }, gcol, dead ? 0 : 0.35 + heat * 0.4, 1.8);
    // 胸口的日輪浮雕（移到腹部，合掌的手在它上面）
    const dc = [0, -106];
    ctx.save();
    ctx.translate(dc[0], dc[1]);
    ctx.scale(0.72, 0.72);
    ctx.translate(-dc[0], -dc[1]);
    glow(ctx, dc[0], dc[1], 54, gcol, 0.3 * heat + (shard ? 0.3 : 0));
    A.ellipse(ctx, dc[0], dc[1], 30, 30, stoneS, stoneD, { lw: 3, hl: false });
    A.ellipse(ctx, dc[0], dc[1], 23, 23, gold, goldS, { lw: 2.6, hl: [-8, -150, 6, 3] });
    ctx.strokeStyle = A.c(goldS);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      ctx.moveTo(dc[0] + Math.cos(a) * 16, dc[1] + Math.sin(a) * 16);
      ctx.lineTo(dc[0] + Math.cos(a) * 22, dc[1] + Math.sin(a) * 22);
    }
    ctx.stroke();
    A.ellipse(ctx, dc[0], dc[1], 12, 12, stoneD, null, { lw: 2.4, hl: false });
    hotLines(ctx, (c) => {
      c.moveTo(dc[0], dc[1] - 8);
      c.lineTo(dc[0] + 6, dc[1]);
      c.lineTo(dc[0], dc[1] + 8);
      c.lineTo(dc[0] - 6, dc[1]);
      c.closePath();
    }, gcol, heat, 2.2);
    ctx.restore();
    // 腰帶＋結冰的垂布
    const clothC = rage ? ZK.clothR : ZK.cloth;
    const clothS = rage ? ZK.clothRS : ZK.clothS;
    const sway = Math.sin(t * 1.5) * 1.5;
    const drape = (c) => {
      c.moveTo(-34, -66);
      c.lineTo(34, -66);
      c.lineTo(30 + sway, -8);
      c.lineTo(20, -2);
      c.lineTo(10, -10);
      c.lineTo(0, 0);
      c.lineTo(-10, -10);
      c.lineTo(-20, -2);
      c.lineTo(-30 + sway, -8);
      c.closePath();
    };
    // 石裙甲：腰帶下一圈互相疊著的石板（兩側），垂布在正中
    [-1, 1].forEach((sd) => {
      [[70, 22], [50, 20], [32, 18]].forEach(([x, w], k) => {
        const tp = (c) => {
          c.moveTo((x - w / 2) * sd, -66);
          c.lineTo((x + w / 2) * sd, -66);
          c.lineTo((x + w / 2 + 3) * sd, -26);
          c.quadraticCurveTo(x * sd, -18, (x - w / 2 + 1) * sd, -26);
          c.closePath();
        };
        A.shape(ctx, tp, k % 2 ? stoneS : stone, stoneD, { shadeY: -38, lw: 2.6 });
        ctx.strokeStyle = A.c(gold);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo((x + w / 2 + 2) * sd, -30);
        ctx.quadraticCurveTo(x * sd, -23, (x - w / 2 + 1) * sd, -30);
        ctx.stroke();
      });
    });
    A.shape(ctx, drape, clothC, clothS, { cel: [6, 0], lw: 3 });
    ctx.save();
    ctx.beginPath();
    drape(ctx);
    ctx.clip();
    ctx.strokeStyle = A.c(gold);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-26, -66);
    ctx.lineTo(-24, -6);
    ctx.moveTo(26, -66);
    ctx.lineTo(24, -6);
    ctx.stroke();
    hotLines(ctx, (c) => {
      c.moveTo(0, -52);
      c.lineTo(-8, -40);
      c.lineTo(0, -28);
      c.lineTo(8, -40);
      c.closePath();
      c.moveTo(0, -24);
      c.lineTo(0, -12);
    }, gcol, heat * 0.8, 2);
    ctx.restore();
    A.shape(ctx, (c) => A.roundRect(c, -82, -76, 164, 16, 5), gold, goldS, { lw: 2.8, shadeY: -68 });
    ctx.fillStyle = A.c(goldS);
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.arc(k * 22, -68, 3, 0, TAU);
      ctx.fill();
    }
    A.shape(ctx, (c) => {
      c.moveTo(0, -80);
      c.lineTo(10, -68);
      c.lineTo(0, -56);
      c.lineTo(-10, -68);
      c.closePath();
    }, rage ? ZK.gemR : ZK.gem, U.mix(rage ? ZK.gemR : ZK.gem, '#101040', 0.45), { lw: 2.2, shadeY: -68 });
    // 腰帶下垂的金墜飾與冰柱
    [-66, -48, 48, 66].forEach((x, k) => {
      const sw2 = Math.sin(t * 2 + k) * 1.5;
      ctx.strokeStyle = A.c(goldS);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, -60);
      ctx.lineTo(x + sw2, -48);
      ctx.stroke();
      A.shape(ctx, (c) => {
        c.moveTo(x + sw2, -50);
        c.lineTo(x + 5 + sw2, -42);
        c.lineTo(x + sw2, -32);
        c.lineTo(x - 5 + sw2, -42);
        c.closePath();
      }, gold, goldS, { lw: 1.8, shadeY: -42 });
      ctx.fillStyle = A.c(k % 2 ? ZK.iceD : rage ? ZK.gemR : ZK.gem);
      ctx.beginPath();
      ctx.arc(x + sw2, -42, 2.4, 0, TAU);
      ctx.fill();
    });
    [-76, -56, -40, 40, 56, 76].forEach((x, k) => icicle(ctx, x + 6, -61, 8 + hash(k + 400) * 10 + (rage ? 5 : 0), 2.6));
    // 巨大的石肩甲（金邊＋冰刺）
    [-1, 1].forEach((sd) => {
      const px = 76 * sd;
      const pd = (c) => {
        c.moveTo(px - 34 * sd, -186);
        c.quadraticCurveTo(px - 26 * sd, -226, px + 12 * sd, -222);
        c.quadraticCurveTo(px + 44 * sd, -212, px + 42 * sd, -168);
        c.quadraticCurveTo(px + 6 * sd, -162, px - 34 * sd, -186);
        c.closePath();
      };
      // 下層的小肩甲（第二層）
      const pd2 = (c) => {
        c.moveTo(px - 18 * sd, -176);
        c.quadraticCurveTo(px + 20 * sd, -186, px + 40 * sd, -168);
        c.quadraticCurveTo(px + 42 * sd, -150, px + 30 * sd, -138);
        c.quadraticCurveTo(px + 8 * sd, -148, px - 18 * sd, -176);
        c.closePath();
      };
      A.shape(ctx, pd2, stoneS, stoneD, { cel: [4 * sd, 4], lw: 2.8 });
      ctx.strokeStyle = A.c(gold);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + 36 * sd, -146);
      ctx.quadraticCurveTo(px + 14 * sd, -150, px - 10 * sd, -170);
      ctx.stroke();
      iceCrystal(ctx, px + 4 * sd, -214, rage ? 50 : 36, rage ? 12 : 10, 0.35 * sd, ZK.ice, ZK.iceS);
      iceCrystal(ctx, px + 24 * sd, -204, rage ? 38 : 26, rage ? 9 : 7, 0.8 * sd, '#e6f7ff', ZK.iceS);
      A.shape(ctx, pd, stone, stoneS, { cel: [6 * sd, 6], lw: 3.2, hl: [px - 6 * sd, -210, 8, 4] });
      finish(ctx, pd, [px - 44, -228, px + 44, -160], { rim: '#eaf8ff', rimA: 0.34, dark: '#0a1424', darkA: 0.36, tex: stoneD, texA: 0.3, texN: 8, seed: 29 + sd, lw: 3.2 });
      ctx.strokeStyle = A.c(gold);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px - 30 * sd, -182);
      ctx.quadraticCurveTo(px + 6 * sd, -168, px + 40 * sd, -172);
      ctx.stroke();
      // 雪蓋
      A.shape(ctx, (c) => {
        c.moveTo(px - 24 * sd, -206);
        c.quadraticCurveTo(px - 10 * sd, -224, px + 12 * sd, -220);
        c.quadraticCurveTo(px + 30 * sd, -214, px + 36 * sd, -200);
        c.lineTo(px + 22 * sd, -204);
        c.lineTo(px + 18 * sd, -196);
        c.lineTo(px + 8 * sd, -206);
        c.lineTo(px - 6 * sd, -200);
        c.closePath();
      }, ZK.snow, ZK.snowS, { lw: 2.2, shadeY: -206 });
    });
    // 金項鍊（一圈嵌寶石的金片）
    for (let k = -3; k <= 3; k++) {
      const a = PI / 2 + k * 0.3;
      const x = Math.cos(a) * 64;
      const y = -214 + Math.sin(a) * 30;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a - PI / 2);
      A.shape(ctx, (c) => {
        c.moveTo(-9, -6);
        c.lineTo(9, -6);
        c.lineTo(6, 10);
        c.lineTo(-6, 10);
        c.closePath();
      }, gold, goldS, { lw: 2.2, shadeY: 4 });
      ctx.fillStyle = A.c(k % 2 ? ZK.iceD : rage ? ZK.gemR : ZK.gem);
      ctx.beginPath();
      ctx.arc(0, 2, 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // 項鍊正中的大墜飾（金框裡的冰魔石）
    A.shape(ctx, (c) => {
      c.moveTo(0, -190);
      c.lineTo(14, -176);
      c.lineTo(0, -156);
      c.lineTo(-14, -176);
      c.closePath();
    }, gold, goldS, { lw: 2.4, shadeY: -176 });
    if (!dead) glow(ctx, 0, -176, 18, gcol, 0.6);
    A.shape(ctx, (c) => {
      c.moveTo(0, -184);
      c.lineTo(8, -176);
      c.lineTo(0, -164);
      c.lineTo(-8, -176);
      c.closePath();
    }, rage ? ZK.gemR : ZK.iceD, null, { lw: 1.6 });
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(-3, -180, 2, 5);
    // 正面合掌的一對手（放光束／灑冰晶時上舉、掌間發光）
    const gUp = (beamFire ? 1 : beamCharge ? beam : 0) * 12 + (shard ? 8 : 0);
    [-1, 1].forEach((sd) => {
      ctx.save();
      ctx.scale(sd, 1);
      const sh = [60, -170];
      const el = dead ? [74, -96] : [72, -104];
      const wr = dead ? [44, -70] : [9, -120 - gUp];
      zkJoint(ctx, sh[0], sh[1], 12, stone, stoneS, gold);
      const ua = qb(sh[0], sh[1], sh[0] + 10, (sh[1] + el[1]) / 2, el[0], el[1]);
      const uw = (q) => 21 - q * 4 + Math.sin(q * PI) * 3;
      zkLimb(ctx, ua, uw, stone, stoneS, stoneL, sd);
      zkBangle(ctx, ua, 0.44, uw, 6, gold, goldS);
      const fr = qb(el[0], el[1], (el[0] + wr[0]) / 2 + 4, (el[1] + wr[1]) / 2 + 6, wr[0], wr[1]);
      const fw = (q) => 18 - q * 7;
      zkLimb(ctx, fr, fw, stone, stoneS, stoneL, sd);
      zkBangle(ctx, fr, 0.79, fw, 3.6, gold, goldS);
      zkBangle(ctx, fr, 0.9, fw, 3.6, gold, goldS);
      zkJoint(ctx, el[0], el[1], 10.5, stone, stoneS, gold);
      if (dead) {
        ctx.save();
        ctx.translate(wr[0], wr[1]);
        ctx.rotate(1.7);
        zkPalm(ctx, ZK_MUDRA.varada, stoneL, stoneLS, 0, gcol);
        ctx.restore();
      } else {
        // 合掌：從正面看到兩片貼在一起的手掌（中線＋指縫）
        const hb = wr[1] + 3;
        A.shape(ctx, (c) => {
          c.moveTo(0.5, hb + 3);
          c.lineTo(0.5, hb - 56);
          c.quadraticCurveTo(12, hb - 52, 14.5, hb - 32);
          c.quadraticCurveTo(15.5, hb - 8, 10.5, hb + 3);
          c.closePath();
        }, stoneL, stoneLS, { cel: [sd * 2.5, 2], lw: 2.6 });
        ctx.strokeStyle = A.c(stoneLS);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(4.4, hb - 51);
        ctx.lineTo(4.8, hb - 33);
        ctx.moveTo(8.4, hb - 48);
        ctx.lineTo(8.8, hb - 31);
        ctx.moveTo(12, hb - 40);
        ctx.lineTo(12.2, hb - 29);
        ctx.moveTo(10.5, hb);
        ctx.quadraticCurveTo(4, hb - 10, 4, hb - 21);
        ctx.stroke();
      }
      ctx.restore();
    });
    if (!dead && (gUp > 0 || rage)) {
      const k = Math.max(gUp / 12, rage ? 0.4 : 0);
      glow(ctx, 0, -146 - gUp, 26 + k * 16, gcol, 0.5 * k);
    }
    ctx.restore();

    // ── 頭（雕刻石臉，縮小一號）──
    ctx.save();
    ctx.translate(0, hy0);
    ctx.scale(ZK_HS, ZK_HS);
    // 刺冠頭飾（在臉後面）
    const crown = (c) => {
      c.moveTo(-44, -14);
      c.lineTo(-72, -24);
      c.lineTo(-64, -42);
      c.lineTo(-86, -60);
      c.lineTo(-56, -62);
      c.lineTo(-60, -88);
      c.lineTo(-36, -76);
      c.lineTo(-30, -104);
      c.lineTo(-12, -86);
      c.lineTo(0, -114);
      c.lineTo(12, -86);
      c.lineTo(30, -104);
      c.lineTo(36, -76);
      c.lineTo(60, -88);
      c.lineTo(56, -62);
      c.lineTo(86, -60);
      c.lineTo(64, -42);
      c.lineTo(72, -24);
      c.lineTo(44, -14);
      c.closePath();
    };
    // 後層的高刺冠（更暗、更高，做出層次）
    ctx.save();
    ctx.translate(0, -14);
    ctx.scale(1.16, 1.2);
    ctx.translate(0, 14);
    A.shape(ctx, crown, stoneD, U.mix(stoneD, '#000010', 0.4), { cel: [6, 6], lw: 3 });
    ctx.restore();
    const crownTips = [[-86, -60, -1.1], [-60, -88, -0.5], [-30, -104, -0.25], [0, -114, 0], [30, -104, 0.25], [60, -88, 0.5], [86, -60, 1.1]];
    crownTips.forEach(([x, y, a], k) => {
      const h = (k === 3 ? 34 : k % 2 ? 20 : 16) * (rage ? 1.45 : 1);
      if (!dead) glow(ctx, x, y - h * 0.4, h * 0.9, gcol, 0.3 + (rage ? 0.25 : 0));
      iceCrystal(ctx, x, y + 6, h, k === 3 ? 10 : 7, a, k % 2 ? ZK.ice : '#e6f7ff', ZK.iceS);
    });
    A.shape(ctx, crown, stoneS, stoneD, { cel: [8, 8], lw: 3.4 });
    finish(ctx, crown, [-86, -114, 86, -14], { rim: '#eaf8ff', rimA: 0.30, dark: '#0a1424', darkA: 0.36, tex: stoneD, texA: 0.3, texN: 12, seed: 19, lw: 3.4 });
    // 內層的金冠
    const crownIn = (c) => {
      c.moveTo(-40, -24);
      c.lineTo(-46, -56);
      c.lineTo(-26, -52);
      c.lineTo(-20, -78);
      c.lineTo(0, -64);
      c.lineTo(20, -78);
      c.lineTo(26, -52);
      c.lineTo(46, -56);
      c.lineTo(40, -24);
      c.closePath();
    };
    // 石冠上的金色鑲邊
    ctx.strokeStyle = A.c(gold);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-64, -34);
    ctx.lineTo(-74, -54);
    ctx.lineTo(-54, -56);
    ctx.lineTo(-54, -78);
    ctx.lineTo(-34, -68);
    ctx.lineTo(-28, -92);
    ctx.moveTo(64, -34);
    ctx.lineTo(74, -54);
    ctx.lineTo(54, -56);
    ctx.lineTo(54, -78);
    ctx.lineTo(34, -68);
    ctx.lineTo(28, -92);
    ctx.stroke();
    A.shape(ctx, crownIn, gold, goldS, { cel: [4, 5], lw: 2.8 });
    // 金冠尖上的寶石
    [[-46, -56], [-20, -78], [20, -78], [46, -56]].forEach(([x, y], k) => {
      A.ellipse(ctx, x, y + 4, 4, 4, k % 3 ? ZK.iceD : rage ? ZK.gemR : ZK.gem, null, { lw: 1.6, hl: [x - 1.4, y + 2.6, 1.4, 1] });
    });
    hotLines(ctx, (c) => {
      c.moveTo(-20, -60);
      c.lineTo(-20, -44);
      c.moveTo(-26, -52);
      c.lineTo(-14, -52);
      c.moveTo(20, -60);
      c.lineTo(20, -44);
      c.moveTo(14, -52);
      c.lineTo(26, -52);
    }, gcol, dead ? 0 : 0.5 + heat * 0.4, 1.8);
    // 耳璫（金色圓盤＋垂下的冰滴）
    [-1, 1].forEach((sd) => {
      const x = 50 * sd;
      A.shape(ctx, (c) => {
        c.moveTo(x - 2 * sd, -10);
        c.quadraticCurveTo(x + 12 * sd, -4, x + 8 * sd, 14);
        c.lineTo(x - 4 * sd, 12);
        c.closePath();
      }, stone, stoneS, { lw: 2.6, shadeY: 4 });
      A.ellipse(ctx, x + 6 * sd, 18, 9, 11, gold, goldS, { lw: 2.4, hl: false });
      A.ellipse(ctx, x + 6 * sd, 18, 4, 5, ZK.iceD, null, { lw: 1.8, hl: false });
      const sw = Math.sin(t * 2 + sd) * 2;
      A.shape(ctx, (c) => {
        c.moveTo(x + 2 * sd + sw, 28);
        c.lineTo(x + 6 * sd + sw, 48);
        c.lineTo(x + 10 * sd + sw, 28);
        c.closePath();
      }, ZK.ice, ZK.iceS, { lw: 2, cel: [2 * sd, 0] });
    });
    // 臉
    const face = (c) => {
      c.moveTo(-42, -30);
      c.lineTo(-46, 4);
      c.quadraticCurveTo(-46, 30, -30, 42);
      c.lineTo(-14, 54);
      c.lineTo(14, 54);
      c.lineTo(30, 42);
      c.quadraticCurveTo(46, 30, 46, 4);
      c.lineTo(42, -30);
      c.quadraticCurveTo(0, -38, -42, -30);
      c.closePath();
    };
    A.shape(ctx, face, stoneL, stoneLS, { cel: [8, 6], hl: [-26, -18, 8, 10], lw: 3.4 });
    ctx.save();
    ctx.beginPath();
    face(ctx);
    ctx.clip();
    // 臉頰的刻紋（像部族紋面）
    ctx.strokeStyle = A.c(stoneLS);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    [-1, 1].forEach((sd) => {
      ctx.moveTo(36 * sd, 14);
      ctx.lineTo(40 * sd, 30);
      ctx.moveTo(30 * sd, 18);
      ctx.lineTo(33 * sd, 34);
    });
    ctx.stroke();
    // 眼下的淚紋符文（發光）
    hotLines(ctx, (c) => {
      [-1, 1].forEach((sd) => {
        c.moveTo(20 * sd, 12);
        c.lineTo(22 * sd, 22);
        c.lineTo(18 * sd, 28);
        c.lineTo(21 * sd, 38);
      });
      crack(c, -30, -24, 1.9, 26, 3, 95);
      if (rage) crack(c, 32, -20, 1.3, 30, 3, 97);
    }, gcol, dead ? 0 : heat * 0.9, 2);
    ctx.restore();
    finish(ctx, face, [-46, -38, 46, 54], { rim: '#f4fcff', rimA: 0.36, dark: '#0a1424', darkA: 0.36, tex: stoneS, texA: 0.28, texN: 8, seed: 23, lw: 3.4 });
    // 額頭的金框
    A.shape(ctx, (c) => {
      c.moveTo(-46, -34);
      c.quadraticCurveTo(0, -46, 46, -34);
      c.lineTo(44, -22);
      c.quadraticCurveTo(0, -32, -44, -22);
      c.closePath();
    }, gold, goldS, { lw: 2.6, shadeY: -26 });
    // 厚重的倒 V 眉骨
    A.shape(ctx, (c) => {
      c.moveTo(-46, -16);
      c.lineTo(-6, -2);
      c.lineTo(0, -8);
      c.lineTo(6, -2);
      c.lineTo(46, -16);
      c.lineTo(46, -6);
      c.lineTo(6, 8);
      c.lineTo(-6, 8);
      c.lineTo(-46, -6);
      c.closePath();
    }, stone, stoneS, { lw: 2.8, shadeY: 2 });
    // 眼窩＋冰藍光的眼
    // 平常半闔著眼（暗、細）；出招時睜開一些；暴走時怒睜
    const acting = beamCharge || beamFire || shard || armI >= 0 || hitArm >= 0;
    const eo = rage || hurt ? 1 : acting ? 0.75 : 0.4;
    const eg = dead ? 0 : (0.9 + Math.sin(t * 4) * 0.1 + (rage ? 0.4 : 0) + beam * 0.8) * (0.45 + eo * 0.55);
    const ecol = rage ? '#eef4ff' : gcol;
    [-1, 1].forEach((sd) => {
      const x = 21 * sd;
      A.shape(ctx, (c) => {
        c.moveTo(x - 17 * sd, -1);
        c.lineTo(x + 18 * sd, -10);
        c.lineTo(x + 14 * sd, 8);
        c.lineTo(x - 12 * sd, 10);
        c.closePath();
      }, dead ? stoneD : '#161c2c', null, { lw: 2.4 });
      if (dead) {
        ctx.strokeStyle = A.outline();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 10 * sd, 4);
        ctx.lineTo(x + 12 * sd, 0);
        ctx.stroke();
        return;
      }
      glow(ctx, x, 2, 22 + beam * 20, rage ? ZK.violet : gcol, (rage ? 0.55 : 0.75) * eg);
      const eh = hurt ? 1.5 : (3.6 + beam * 2 + (rage ? 1.2 : 0)) * eo;
      ctx.fillStyle = A.c(ecol);
      ctx.beginPath();
      ctx.moveTo(x - 12 * sd, 2 - eh * 0.3);
      ctx.lineTo(x + 13 * sd, -4 - eh * 0.9);
      ctx.lineTo(x + 10 * sd, 3 + eh * 0.6);
      ctx.lineTo(x - 9 * sd, 3 + eh * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = A.c('#ffffff');
      ctx.beginPath();
      ctx.ellipse(x + 1 * sd, 1 + (1 - eo) * 2.5, 5, 1.6 * eo, -0.2 * sd, 0, TAU);
      ctx.fill();
      if (eo < 0.99) {
        // 垂下的石眼瞼
        A.shape(ctx, (c) => {
          c.moveTo(x - 17 * sd, -1);
          c.lineTo(x + 18 * sd, -10);
          c.lineTo(x + 16 * sd, -10 + 13 * (1 - eo));
          c.lineTo(x - 14 * sd, -1 + 6 * (1 - eo));
          c.closePath();
        }, stone, stoneS, { lw: 2.2, shadeY: 20 });
      }
    });
    // 暴走：眉頭往下壓的怒眉（眉骨上的深刻紋）
    if (rage && !dead) {
      A.shape(ctx, (c) => {
        c.moveTo(-44, -20);
        c.lineTo(-4, 6);
        c.lineTo(0, 0);
        c.lineTo(4, 6);
        c.lineTo(44, -20);
        c.lineTo(44, -12);
        c.lineTo(5, 12);
        c.lineTo(-5, 12);
        c.lineTo(-44, -12);
        c.closePath();
      }, stoneD, null, { lw: 2.6 });
    }
    // 鼻子
    A.shape(ctx, (c) => {
      c.moveTo(-5, 4);
      c.lineTo(-12, 24);
      c.quadraticCurveTo(0, 30, 12, 24);
      c.lineTo(5, 4);
      c.closePath();
    }, stoneL, stoneLS, { lw: 2.4, cel: [4, 2] });
    ctx.fillStyle = A.c(stoneD);
    ctx.beginPath();
    ctx.ellipse(-6, 24, 3, 2, 0.3, 0, TAU);
    ctx.ellipse(6, 24, 3, 2, -0.3, 0, TAU);
    ctx.fill();
    // 嘴：往下撇的石嘴、方牙、冰獠牙；出招時張開發光
    const mOpen = dead ? 2 : beamFire ? 14 : shard ? 11 : beamCharge ? 7 : hurt ? 9 : rage ? 8 : armI >= 0 ? 5 : 1.5;
    const fangs = !dead && (rage || mOpen > 4);
    // 下巴垂下的冰柱鬍
    [[-18, 12], [-8, 22], [2, 26], [12, 18], [20, 10]].forEach(([x, h]) => {
      A.shape(ctx, (c) => {
        c.moveTo(x - 5, 52);
        c.lineTo(x, 52 + h + Math.sin(t * 2 + x) * 1.5);
        c.lineTo(x + 5, 52);
        c.closePath();
      }, ZK.ice, ZK.iceS, { lw: 2, cel: [2, 0] });
    });
    const mouth = (c) => {
      c.moveTo(-28, 38);
      c.lineTo(-22, 32);
      c.lineTo(22, 32);
      c.lineTo(28, 38);
      c.lineTo(22, 36 + mOpen);
      c.lineTo(-22, 36 + mOpen);
      c.closePath();
    };
    A.shape(ctx, mouth, mOpen > 6 && !dead ? U.mix(gcol, '#ffffff', 0.35) : '#1c2232', null, { lw: 2.6 });
    if (mOpen > 6 && !dead) glow(ctx, 0, 36, 30, gcol, 0.6);
    ctx.fillStyle = A.c('#e4ebf4');
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    if (fangs) {
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        A.roundRect(ctx, k * 8.4 - 3.6, 32, 7.2, 4 + mOpen * 0.2, 1.5);
        ctx.fill();
        ctx.stroke();
      }
    }
    (fangs ? [-1, 1] : []).forEach((sd) => {
      A.shape(ctx, (c) => {
        c.moveTo(20 * sd, 36 + mOpen);
        c.lineTo(25 * sd, 22 + mOpen * 0.6);
        c.lineTo(28 * sd, 38 + mOpen * 0.8);
        c.closePath();
      }, ZK.ice, ZK.iceS, { lw: 2, cel: [2 * sd, 0] });
    });
    // 額頭的藍色魔石（金框＋爪座）
    const gemC = rage ? ZK.gemR : ZK.gem;
    const gp = dead ? 0 : 0.7 + Math.sin(t * (rage ? 7 : 3)) * 0.3 + (shard ? 0.5 : 0) + beam * 0.3;
    glow(ctx, 0, -32, 30 + gp * 12, gemC, (rage ? 0.5 : 0.7) * gp);
    A.shape(ctx, (c) => {
      c.moveTo(0, -56);
      c.lineTo(16, -34);
      c.lineTo(0, -12);
      c.lineTo(-16, -34);
      c.closePath();
    }, gold, goldS, { lw: 2.6, shadeY: -30 });
    A.shape(ctx, (c) => {
      c.moveTo(0, -50);
      c.lineTo(11, -34);
      c.lineTo(0, -18);
      c.lineTo(-11, -34);
      c.closePath();
    }, gemC, U.mix(gemC, '#101040', 0.45), { lw: 2.4, cel: [3, 3], hl: [-3, -40, 3, 5] });
    if (!dead) {
      ctx.fillStyle = rgba('#ffffff', 0.5 + gp * 0.3);
      ctx.beginPath();
      ctx.arc(-3, -38, 2.2, 0, TAU);
      ctx.fill();
    }
    // 暴走：從嘴裡吐出的寒氣
    if (rage && !dead) {
      for (let k = 0; k < 4; k++) {
        const q = (t * 0.9 + k / 4) % 1;
        ctx.globalAlpha = (1 - q) * 0.5;
        ctx.fillStyle = A.c('#e8f6ff');
        ctx.beginPath();
        ctx.arc((k - 1.5) * 10 + Math.sin(t * 2 + k) * 6, 44 + q * 30, 6 + q * 12, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // 正在出招／剛砸下的手臂（畫在最前面）
    if (hitArm >= 0 && hitArm < 6 && hitArm !== armI) drawArm(hitArm);
    if (armI >= 0 && armI < 6) drawArm(armI);

    // ── 地上的雪堆（半埋著）──
    const mound = (c) => {
      c.moveTo(-138, 0);
      c.quadraticCurveTo(-132, -30, -100, -40);
      c.quadraticCurveTo(-64, -54, -34, -36);
      c.quadraticCurveTo(0, -50, 32, -38);
      c.quadraticCurveTo(70, -56, 102, -40);
      c.quadraticCurveTo(132, -28, 138, 0);
      c.closePath();
    };
    A.shape(ctx, mound, ZK.snow, ZK.snowS, { cel: [6, 8], lw: 3 });
    // 半埋的斷柱與石塊
    A.shape(ctx, (c) => {
      c.moveTo(-122, -2);
      c.lineTo(-118, -46);
      c.lineTo(-108, -52);
      c.lineTo(-98, -44);
      c.lineTo(-92, -50);
      c.lineTo(-90, -2);
      c.closePath();
    }, stone, stoneS, { cel: [4, 0], lw: 2.8 });
    ctx.strokeStyle = A.c(stoneD);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-114, -40);
    ctx.lineTo(-114, -6);
    ctx.moveTo(-104, -42);
    ctx.lineTo(-104, -6);
    ctx.stroke();
    [[70, -10, 24, 14], [-20, -8, 16, 10], [26, -6, 12, 8]].forEach(([x, y, a, b]) => {
      A.shape(ctx, (c) => {
        c.moveTo(x - a, y + b * 0.6);
        c.lineTo(x - a * 0.6, y - b);
        c.lineTo(x + a * 0.7, y - b * 0.8);
        c.lineTo(x + a, y + b * 0.6);
        c.closePath();
      }, stone, stoneS, { lw: 2.6, shadeY: y });
    });
    iceCrystal(ctx, -70, -18, 44, 10, -0.35, ZK.ice, ZK.iceS);
    iceCrystal(ctx, -56, -14, 28, 7, 0.1, ZK.ice, ZK.iceS);
    iceCrystal(ctx, 104, -14, 40, 9, 0.35, ZK.ice, ZK.iceS);
    iceCrystal(ctx, 44, -12, 30, 7, 0.15, ZK.ice, ZK.iceS);
    if (rage) {
      iceCrystal(ctx, -132, -4, 56, 12, -0.6, ZK.ice, ZK.iceS);
      iceCrystal(ctx, 132, -4, 60, 12, 0.55, ZK.ice, ZK.iceS);
      iceCrystal(ctx, 0, -30, 40, 9, 0, '#e6f7ff', ZK.iceS);
    }

    // ── 灑冰晶：頭上凝聚、尖端朝下的冰錐 ──
    if (shard && !dead) {
      const gy = hy0 - 150;
      glow(ctx, 0, gy, 150, gcol, 0.3);
      for (let i = 0; i < 7; i++) {
        const a = t * 1.2 + (i / 7) * TAU;
        const x = Math.cos(a) * 150;
        const y = gy + Math.sin(a) * 26;
        glow(ctx, x, y, 26, gcol, 0.6);
        iceCrystal(ctx, x, y - 20, 42, 9, PI, i % 2 ? ZK.ice : '#e6f7ff', ZK.iceS);
      }
    }
    // ── 雙眼冰光束 ──
    // 光束本身由地面區域 fb_beam 畫（瞄準玩家、可能是斜的）；這裡只畫眼睛蓄力與發射時的強光
    if (!dead && (beam > 0 || beamFire)) {
      const ey = hy0 - 34 * ZK_HS;
      const k = beamFire ? 1 : beam;
      [-20, 20].forEach((x) => glow(ctx, x, hy0 + 2 * ZK_HS, 14 + k * 12, gcol, 0.5 + k * 0.4));
      [0].forEach((x) => {
        glow(ctx, x, ey, 26 + k * 30 + (beamFire ? 20 : 0), gcol, 0.6 + k * 0.3);
        glow(ctx, x, ey, 12 + k * 10, '#ffffff', 0.5 + k * 0.5);
        if (beamFire) {
          ctx.save();
          ctx.translate(x, ey);
          ctx.rotate(t * 3);
          ctx.fillStyle = rgba('#ffffff', 0.85);
          for (let i = 0; i < 4; i++) {
            ctx.rotate(PI / 2);
            ctx.beginPath();
            ctx.moveTo(-3, 0);
            ctx.lineTo(0, -34 - Math.sin(t * 30 + i) * 6);
            ctx.lineTo(3, 0);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      });
      if (!beamFire) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + t * 4;
          const r = 80 * (1 - ((t * 2 + i / 12) % 1));
          const x = 0;
          ctx.fillStyle = A.c('#e8f8ff');
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * r, ey + Math.sin(a) * r, 2.5, 0, TAU);
          ctx.fill();
        }
      }
    }
    // 精修：飄落的雪花、冰晶閃光
    if (!dead) {
      ctx.fillStyle = rgba('#ffffff', 0.85);
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const q = (t * 0.25 + hash(i + 200)) % 1;
        const x = (hash(i + 201) - 0.5) * 300 + Math.sin(t * 1.3 + i) * 12;
        const y = -330 + q * 330;
        const r = (1.6 + hash(i + 202) * 1.8) * Math.sin(q * PI);
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
      for (let i = 0; i < 4; i++) sparkle4(ctx, (hash(i + 210) - 0.5) * 220, -40 - hash(i + 211) * 250, 3 + hash(i) * 3, rage ? '#9ad8ff' : '#cfeeff', 0.5 + 0.5 * Math.sin(t * 3 + i * 2));
    }
    ctx.restore();
  }

  // ═════════════════════════ 星蝕魔龍 fb_voiddragon（300×220，懸空） ═════════════════════════
  // 懸空的虛空龍：身體是吞噬了星座的夜空（星點＋斷掉的星座線），背後一圈日蝕黑環與金色光冕，脊椎上插著錶盤碎片。
  const VD = {
    sky: '#221c56', skyS: '#140f36', skyR: '#2a1040', skyRS: '#16061e', belly: '#3e3690', bellyS: '#2c2670',
    gold: '#f2cc62', goldS: '#c0923a', goldR: '#ff9a4a', face: '#fff2d2', faceS: '#e0cc9c',
    star: '#fff6d0', line: '#ffd86a', eye: '#ffb81e', eyeR: '#dcb4ff', neb: '#b06aff', nebR: '#ff5a9a', beam: '#c89aff',
  };
  function starShape(ctx, x, y, r, col) {
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }
  // 錶盤碎片（破掉的一角）
  function clockShard(ctx, r, rot, hot, t, spin) {
    A.shape(ctx, (c) => {
      c.moveTo(0, 0);
      c.arc(0, 0, r, -PI * 0.95, -PI * 0.15);
      c.lineTo(r * 0.5, -r * 0.1);
      c.lineTo(r * 0.3, r * 0.15);
      c.lineTo(-r * 0.2, -r * 0.05);
      c.lineTo(-r * 0.6, r * 0.12);
      c.closePath();
    }, VD.face, VD.faceS, { lw: 2.2, shadeY: -r * 0.25 });
    // 刻度
    ctx.strokeStyle = A.c('#6a4a2a');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -PI * 0.9 + i * 0.15 * PI;
      ctx.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
      ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    }
    ctx.stroke();
    // 指針
    const ha = -PI / 2 + (spin ? t * 3 : 0) + rot;
    ctx.strokeStyle = A.c(hot ? '#ff5a3a' : '#3a2a1a');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.1);
    ctx.lineTo(Math.cos(ha) * r * 0.65, Math.sin(ha) * r * 0.65 - r * 0.1);
    ctx.stroke();
    // 金框
    ctx.strokeStyle = A.c(VD.gold);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, -PI * 0.95, -PI * 0.15);
    ctx.stroke();
  }
  function fb_voiddragon(ctx, m) {
    const S = atk(m);
    const { fx, ph, t, rage, dead, kind } = S;
    const K = (m.h || 220) / 250;
    // js/game/fieldboss.js：黑洞球蓄力時也借用 fx.breath（0..0.5），所以先看這招是不是 orb
    const orb = /orb|hole/.test(kind) || !!fx.orb;
    const orbK = orb ? (ph === 'wind' ? Math.min(1, amt(fx.breath) * 2) : 0) : 0;
    const breath = orb ? 0 : amt(fx.breath);
    const fire = !orb && (!!fx.beamFire || (breath > 0 && (ph === 'strike' || (!ph && breath >= 0.999))));
    const charge = !orb && (breath > 0 || kind === 'breath') && !fire;
    const starfall = !breath && !orb && !fire && (/star|fall|rain|meteor/.test(kind) || !!fx.starfall || (ph === 'wind' && !kind));
    const hurt = S.hurt;
    const sky = rage ? VD.skyR : VD.sky;
    const skyS = rage ? VD.skyRS : VD.skyS;
    const gold = rage ? VD.goldR : VD.gold;
    const neb = rage ? VD.nebR : VD.neb;
    const eyeC = rage ? VD.eyeR : VD.eye;
    const heat = dead ? 0 : clamp(0.6 + Math.sin(t * 2.4) * 0.2 + (rage ? 0.5 : 0) + breath * 0.3, 0, 1.4);
    const fl = dead ? 0 : Math.sin(t * 1.6) * 5;

    // ── 姿勢 ──
    let headUp = 0; // 仰頭
    let jaw = rage ? 0.25 : 0.12;
    let headX = 0;
    if (charge) {
      headUp = 0.35 * breath;
      jaw = 0.4 + 0.5 * breath;
      headX = -14 * breath;
    }
    if (fire) {
      // 頭對準光束：js/game/fieldboss.js 依瞄準角度給 fx.beamTilt，並用同一套變換算出嘴巴＝光束起點
      headUp = num(fx.beamTilt, -0.08);
      jaw = 1;
      headX = 10;
    }
    if (starfall) {
      headUp = 0.6;
      jaw = 1;
    }
    if (orb) jaw = 0.5;
    if (hurt && !ph) {
      headUp += 0.15;
      jaw = Math.max(jaw, 0.6);
    }
    if (dead) {
      headUp = -0.4;
      jaw = 0.5;
    }
    const shake = (charge && breath > 0.6) || starfall ? Math.sin(t * 50) * 1.5 : 0;

    ctx.save();
    ctx.scale(K, K);
    ctx.translate(shake, fl);

    // ── 日蝕黑環＋金色光冕 ──
    const ex = -26;
    const ey = -128;
    const er = rage ? 84 : 70;
    const flare = starfall ? 1 : rage ? 0.7 : 0.35;
    if (!dead) {
      glow(ctx, ex, ey, er * 2.4, gold, 0.35 + flare * 0.25);
      glow(ctx, ex, ey, 260, neb, rage ? 0.25 : 0.14);
    }
    // 光冕射線
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(t * 0.15);
    // 柔和的光冕
    const cg = ctx.createRadialGradient(0, 0, er * 0.9, 0, 0, er * (1.5 + flare * 0.3));
    cg.addColorStop(0, rgba(U.mix(gold, '#ffffff', 0.5), 0.95));
    cg.addColorStop(0.35, rgba(gold, 0.6));
    cg.addColorStop(1, rgba(gold, 0));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, er * (1.5 + flare * 0.3), 0, TAU);
    ctx.fill();
    // 細長的光刺（長短交錯）
    const nr = 16;
    for (let i = 0; i < nr; i++) {
      const a = (i / nr) * TAU;
      const L = er * (i % 2 ? 1.3 : 1.62 + hash(i) * 0.25 + Math.sin(t * 3 + i) * 0.05) * (0.9 + flare * 0.2);
      const w = i % 2 ? 0.07 : 0.09;
      A.shape(ctx, (c) => {
        c.moveTo(Math.cos(a - w) * er, Math.sin(a - w) * er);
        c.lineTo(Math.cos(a) * L, Math.sin(a) * L);
        c.lineTo(Math.cos(a + w) * er, Math.sin(a + w) * er);
        c.closePath();
      }, gold, null, { lw: 2 });
    }
    ctx.restore();
    // 黑盤
    A.shape(ctx, (c) => c.arc(ex, ey, er, 0, TAU), '#07040f', null, { lw: 3 });
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, TAU);
    ctx.clip();
    glow(ctx, ex + er * 0.3, ey - er * 0.3, er * 0.8, neb, 0.25);
    for (let i = 0; i < 14; i++) {
      const a = hash(i + 200) * TAU;
      const d = Math.sqrt(hash(i + 201)) * er * 0.9;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + i);
      ctx.fillStyle = A.c('#e8e0ff');
      ctx.beginPath();
      ctx.arc(ex + Math.cos(a) * d, ey + Math.sin(a) * d, 1 + hash(i) * 1.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // 內圈金線（鑽石環）
    ctx.strokeStyle = A.c(U.mix(gold, '#ffffff', 0.5));
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ex, ey, er - 4, 0, TAU);
    ctx.stroke();
    if (!dead) {
      const da = t * 0.8;
      glow(ctx, ex + Math.cos(da) * er, ey + Math.sin(da) * er, 22, '#ffffff', 0.9);
      starShape(ctx, ex + Math.cos(da) * er, ey + Math.sin(da) * er, 9, '#ffffff');
    }

    // ── 身體（脊椎曲線）──
    const wv = dead ? 0 : Math.sin(t * 1.8);
    const wv2 = dead ? 0 : Math.cos(t * 1.4);
    const hbX = 84 + headX * 0.5;
    const hbY = -150 - headUp * 20;
    const seg1 = cb(hbX, hbY, 44, -170 + wv * 6, 86, -58, 14, -46 + wv * 4);
    const seg2 = cb(14, -46 + wv * 4, -62, -34, -128, -70 + wv2 * 6, -132, -140 + wv2 * 6);
    const seg3 = cb(-132, -140 + wv2 * 6, -138, -196, -168, -226 + wv * 6, -206 + wv2 * 8, -206 + wv * 8);
    const spine = (s) => (s < 0.36 ? seg1(s / 0.36) : s < 0.7 ? seg2((s - 0.36) / 0.34) : seg3((s - 0.7) / 0.3));
    const wf = (s) => (s < 0.3 ? lerp(38, 56, s / 0.3) : lerp(56, 5, Math.pow((s - 0.3) / 0.7, 1.1)));
    // 星雲鬃毛（身體後面）
    if (!dead) {
      for (let i = 0; i < 7; i++) {
        const s = 0.04 + i * 0.12;
        const p = along(spine, s, -wf(s) * 0.5 - 6);
        const a = p[2] - PI / 2;
        const L = 26 + Math.sin(t * 3 + i) * 6 + (rage ? 10 : 0);
        ctx.save();
        ctx.globalAlpha = 0.35;
        A.shape(ctx, (c) => {
          c.moveTo(p[0] - Math.cos(p[2]) * 10, p[1] - Math.sin(p[2]) * 10);
          c.quadraticCurveTo(p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L, p[0] + Math.cos(a - 0.6) * L * 1.3, p[1] + Math.sin(a - 0.6) * L * 1.3);
          c.quadraticCurveTo(p[0] + Math.cos(a) * L * 0.4, p[1] + Math.sin(a) * L * 0.4, p[0] + Math.cos(p[2]) * 10, p[1] + Math.sin(p[2]) * 10);
          c.closePath();
        }, neb, null, { noStroke: true });
        ctx.restore();
      }
    }
    // 星幕翅膀（從肩膀往右上張開，翼膜是星空）
    {
      const sp = rage ? 1 : starfall || fire ? 0.9 : 0.55;
      const fl2 = dead ? 0 : Math.sin(t * (rage ? 4 : 2.4)) * 0.12;
      const root = along(spine, 0.16, -wf(0.16) * 0.2);
      const fing = [[-2.05, 160], [-1.68, 176], [-1.3, 150], [-0.95, 112]].map(([a, l], i) => [a + (1 - sp) * 0.5 - fl2 * (1 + i * 0.2), l * (0.8 + sp * 0.2)]);
      const tips = batWing(ctx, root[0], root[1], fing, rage ? '#2a1446' : '#241e5c', rage ? '#170a2a' : '#15103a', VD.gold, VD.goldS, { tatter: false, boneW: 8, tailX: 20, tailY: 40, glowCol: neb, glowA: rage ? 0.5 : 0.3, vein: neb, veinHeat: rage ? 0.9 : 0.5 });
      // 翼膜上被星光燒穿的小洞（透出星星）
      for (let i = 1; i < tips.length; i++) {
        const a = tips[i - 1];
        const b = tips[i];
        [[0.55, 0.4], [0.78, 0.6]].forEach(([q, u], k) => {
          const mx2 = lerp(a[0], b[0], u);
          const my2 = lerp(a[1], b[1], u);
          const hx = lerp(root[0], mx2, q);
          const hy = lerp(root[1], my2, q);
          const r = 3.4 + hash(i * 3 + k) * 3;
          if (!dead) glow(ctx, hx, hy, r * 3, '#e8e0ff', 0.45);
          ctx.fillStyle = A.c('#0a0618');
          ctx.strokeStyle = A.c(VD.gold);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(hx, hy, r, r * 0.8, 0.3, 0, TAU);
          ctx.fill();
          ctx.stroke();
          starShape(ctx, hx, hy, r * 0.8, '#ffffff');
        });
      }
      // 翼指末端的金爪
      tips.forEach((tp, i) => {
        const a = Math.atan2(tp[1] - root[1], tp[0] - root[0]);
        A.shape(ctx, (c) => taper(c, qb(tp[0], tp[1], tp[0] + Math.cos(a) * 8, tp[1] + Math.sin(a) * 8, tp[0] + Math.cos(a + 0.9) * 13, tp[1] + Math.sin(a + 0.9) * 13), (q) => 6 * (1 - q) + 0.5, 8), gold, null, { lw: 1.6 });
      });
      ctx.fillStyle = A.c(VD.star);
      for (let i = 0; i < 12; i++) {
        const k = Math.floor(hash(i + 300) * tips.length);
        const q = 0.35 + hash(i + 301) * 0.5;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i);
        ctx.beginPath();
        ctx.arc(lerp(root[0], tips[k][0], q) + (hash(i + 302) - 0.5) * 20, lerp(root[1], tips[k][1], q) + 10, 1.6, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 後腳（懸著）
    const limbAt = (s, len, dirA, back) => {
      const p = along(spine, s, -wf(s) * 0.3);
      const kx = p[0] + Math.cos(dirA) * len * 0.55;
      const ky = p[1] + Math.sin(dirA) * len * 0.55;
      const fx2 = kx + Math.cos(dirA + 0.8) * len * 0.5;
      const fy2 = ky + Math.sin(dirA + 0.8) * len * 0.5;
      const col = back ? skyS : sky;
      A.shape(ctx, (c) => taper(c, qb(p[0], p[1], kx, ky, fx2, fy2), (q) => 20 - q * 8), col, back ? '#0a0620' : skyS, { cel: [3, 3], lw: 3 });
      for (let i = -1; i <= 1; i++) {
        const a = dirA + 0.8 + i * 0.5 + 0.4;
        A.shape(ctx, (c) => taper(c, qb(fx2, fy2, fx2 + Math.cos(a) * 9, fy2 + Math.sin(a) * 9, fx2 + Math.cos(a + 0.6) * 16, fy2 + Math.sin(a + 0.6) * 16), (q) => 6 * (1 - q)), gold, null, { lw: 1.8 });
      }
      return [fx2, fy2];
    };
    limbAt(0.52, 34, 2.2 + wv * 0.1, true);
    limbAt(0.27, 34, 1.9 + wv2 * 0.1, true);

    // 背脊的骨板（鑲金邊，根部被身體蓋住）
    for (let i = 0; i < 14; i++) {
      const s2 = 0.08 + i * 0.062;
      if (s2 > 0.94) break;
      const w = wf(s2);
      const p0 = along(spine, s2 - 0.02, -w * 0.42);
      const p1 = along(spine, s2 + 0.012, -w * 0.5 - 8 - w * 0.25);
      const p2 = along(spine, s2 + 0.028, -w * 0.42);
      A.shape(ctx, (c) => {
        c.moveTo(p0[0], p0[1]);
        c.quadraticCurveTo((p0[0] + p1[0]) / 2 - 2, (p0[1] + p1[1]) / 2, p1[0], p1[1]);
        c.lineTo(p2[0], p2[1]);
        c.closePath();
      }, rage ? '#3a1a5a' : '#2e2870', null, { lw: 2 });
      ctx.strokeStyle = A.c(gold);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(lerp(p0[0], p1[0], 0.3), lerp(p0[1], p1[1], 0.3));
      ctx.lineTo(p1[0], p1[1]);
      ctx.stroke();
    }
    // 本體
    A.shape(ctx, (c) => taper(c, spine, wf, 40), sky, skyS, { cel: [0, 7], lw: 3.4 });
    ctx.save();
    ctx.beginPath();
    taper(ctx, spine, wf, 40);
    ctx.clip();
    // 身體裡翻湧的星雲
    if (!dead) {
      for (let i = 0; i < 6; i++) {
        const p = along(spine, 0.06 + i * 0.13, (hash(i + 40) - 0.5) * 26);
        glow(ctx, p[0] + Math.sin(t * 0.8 + i) * 6, p[1], 30 + hash(i) * 14, i % 2 ? neb : rage ? VD.nebR : '#5a7aff', 0.3 + Math.sin(t * 1.6 + i) * 0.08);
      }
    }
    // 鱗片：沿著身體一排排的小弧（亮邊）
    ctx.strokeStyle = rgba(rage ? '#a070e0' : '#6a60d0', 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 30; i++) {
      const s2 = 0.03 + i * 0.03;
      const w = wf(s2);
      for (let r = -1; r <= 1; r++) {
        const p = along(spine, s2 + (r & 1) * 0.015, r * w * 0.26);
        const rr = w * 0.12;
        const a = p[2] + PI / 2;
        ctx.moveTo(p[0] + Math.cos(a - 1.2) * rr, p[1] + Math.sin(a - 1.2) * rr);
        ctx.arc(p[0], p[1], rr, a - 1.2, a + 1.2);
      }
    }
    ctx.stroke();
    // 腹甲（下緣一節一節）
    for (let i = 0; i < 12; i++) {
      const s = 0.06 + i * 0.07;
      const p = along(spine, s, wf(s) * 0.42);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(p[2]);
      A.shape(ctx, (c) => c.ellipse(0, 0, wf(s) * 0.2, wf(s) * 0.3, 0, 0, TAU), VD.belly, VD.bellyS, { lw: 2, shadeY: 2 });
      ctx.restore();
    }
    // 星空：星點＋星座線（斷掉的；暴走時接回來發光）
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const s = 0.03 + (i / 26) * 0.9;
      const off = (hash(i * 3.1) - 0.6) * wf(s) * 0.7;
      const p = along(spine, s, off);
      pts.push(p);
      const tw = 0.6 + 0.4 * Math.sin(t * 4 + i * 1.7);
      const r = (1.4 + hash(i) * 2.2) * (rage ? 1.3 : 1);
      ctx.globalAlpha = dead ? 0.3 : tw;
      ctx.fillStyle = A.c(VD.star);
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(rage ? '#ffe8a0' : VD.line, dead ? 0.2 : rage ? 0.9 : 0.55);
    ctx.lineWidth = rage ? 2 : 1.4;
    ctx.beginPath();
    for (let i = 0; i < pts.length - 1; i += 1) {
      if (!rage && i % 3 === 2) continue; // 斷掉的線
      const a = pts[i];
      const b = pts[i + 1];
      if (!rage && i % 4 === 1) {
        // 只畫一半
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      } else {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
    }
    ctx.stroke();
    // 幾顆大星
    [0.2, 0.46, 0.7].forEach((s, i) => {
      const p = along(spine, s, 0);
      if (!dead) glow(ctx, p[0], p[1], 14, VD.star, 0.8);
      starShape(ctx, p[0], p[1], 6 + (rage ? 2 : 0), '#ffffff');
    });
    // 魔化裂紋（暴走時沿脊椎發亮）
    if (rage && !dead) {
      hotLines(ctx, (c) => {
        for (let i = 0; i < 4; i++) {
          const s = 0.15 + i * 0.18;
          const p = along(spine, s, -wf(s) * 0.2);
          crack(c, p[0], p[1], p[2] + PI / 2, wf(s) * 0.5, 2, 101 + i);
        }
      }, VD.nebR, heat, 2.2);
    }
    ctx.restore();
    finish(ctx, (c) => taper(c, spine, wf, 40), [-220, -240, 110, 0], { rim: '#dcd0ff', rimA: 0.36, rimW: 6, dark: '#04020c', darkA: 0.36, bounce: gold, bounceA: 0.2, lw: 3.4 });
    if (!dead) for (let i = 0; i < 8; i++) { const p = along(spine, 0.05 + i * 0.11, (hash(i + 9) - 0.5) * 50); sparkle4(ctx, p[0], p[1], 3 + hash(i) * 3, i % 2 ? '#ffffff' : gold, 0.5 + 0.5 * Math.sin(t * 4 + i * 1.3)); }
    // 尾巴尖：一顆星
    const tip = spine(1);
    if (!dead) glow(ctx, tip[0], tip[1], 30, gold, 0.8);
    A.shape(ctx, (c) => {
      for (let i = 0; i < 8; i++) {
        const a = -PI / 2 + (i / 8) * TAU + t;
        const r = i % 2 ? 6 : 16;
        i ? c.lineTo(tip[0] + Math.cos(a) * r, tip[1] + Math.sin(a) * r) : c.moveTo(tip[0] + Math.cos(a) * r, tip[1] + Math.sin(a) * r);
      }
      c.closePath();
    }, gold, null, { lw: 2.2 });
    // 脊椎上的錶盤碎片
    [0.05, 0.13, 0.21, 0.66, 0.74, 0.82, 0.89].forEach((s, i) => {
      const p = along(spine, s, -wf(s) * 0.48);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(p[2] + (hash(i + 5) - 0.5) * 0.5);
      const r = (i < 3 ? 22 - i * 2 : 24 - i * 2.4) * (rage ? 1.15 : 1);
      if (rage && !dead) glow(ctx, 0, -r * 0.4, r * 1.4, '#ff8a4a', 0.4);
      clockShard(ctx, r, i * 1.3, rage, t, rage && !dead);
      ctx.restore();
    });
    // 胸前的錶盤護甲（金框、羅馬刻度、慢慢走的指針）
    {
      const p = along(spine, 0.22, wf(0.22) * 0.1);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(p[2] + 0.2);
      A.shape(ctx, (c) => c.ellipse(0, 0, 21, 17, 0, 0, TAU), VD.face, VD.faceS, { lw: 2.6, shadeY: 5 });
      ctx.strokeStyle = A.c(gold);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 21, 17, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = A.c('#6a4a2a');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const L = i % 3 ? 0.84 : 0.7;
        ctx.moveTo(Math.cos(a) * 17, Math.sin(a) * 13.5);
        ctx.lineTo(Math.cos(a) * 17 * L, Math.sin(a) * 13.5 * L);
      }
      ctx.stroke();
      const ha = t * (rage ? 2 : 0.3);
      ctx.strokeStyle = A.c(rage ? '#ff5a3a' : '#3a2a1a');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ha) * 12, Math.sin(ha) * 9);
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ha * 0.1 + 2) * 8, Math.sin(ha * 0.1 + 2) * 6);
      ctx.stroke();
      ctx.fillStyle = A.c(gold);
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // 前腳（黑洞球時往前捧）
    let claw;
    if (orb) {
      const p = along(spine, 0.3, -wf(0.3) * 0.3);
      const hx = 108;
      const hy = -58;
      A.shape(ctx, (c) => taper(c, qb(p[0], p[1], p[0] + 30, p[1] + 20, hx, hy), (q) => 22 - q * 8), sky, skyS, { cel: [3, 3], lw: 3 });
      claw = [hx, hy];
    } else {
      claw = limbAt(0.26, 40, 1.0 + wv * 0.12, false);
    }
    limbAt(0.5, 36, 2.0 + wv2 * 0.1, false);

    // ── 頭 ──
    ctx.save();
    ctx.translate(hbX, hbY);
    ctx.rotate(-headUp);
    // 角（往後掠，金色）
    // 角冠：後面一支暗金長角、中間主角、再加一排短的冠刺
    horn(ctx, cb(-10, -14, -40, -28, -74, -30, -104, -18), 14, U.mix(gold, '#4a3a2a', 0.5), VD.goldS, '#2a1a10', rage ? 0.6 : 0, VD.nebR);
    horn(ctx, cb(-6, -18, -30, -40, -62, -52, -96, -48), 20, U.mix(gold, '#8a6a3a', 0.25), VD.goldS, '#4a2a1a', rage ? 0.8 : 0.2, VD.nebR);
    [[4, -22, -1.9, 22], [16, -24, -1.6, 18], [26, -20, -1.35, 13]].forEach(([x, y, a, L]) => {
      horn(ctx, qb(x, y + 4, x + Math.cos(a) * L * 0.5 - 3, y + Math.sin(a) * L * 0.5, x + Math.cos(a - 0.5) * L, y + Math.sin(a - 0.5) * L), 8, gold, VD.goldS, '#4a2a1a', rage ? 0.8 : 0, VD.nebR);
    });
    // 下顎
    ctx.save();
    ctx.translate(4, 10);
    ctx.rotate(jaw * 0.5);
    A.shape(ctx, (c) => {
      c.moveTo(-10, -4);
      c.lineTo(58, 2);
      c.quadraticCurveTo(62, 10, 50, 14);
      c.quadraticCurveTo(14, 18, -14, 8);
      c.closePath();
    }, sky, skyS, { lw: 2.8, shadeY: 8 });
    ctx.fillStyle = A.c('#f4ecd8');
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const x = 8 + i * 10;
      ctx.beginPath();
      ctx.moveTo(x - 3, 0);
      ctx.lineTo(x, -6 - (i % 2) * 3);
      ctx.lineTo(x + 3, 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    // 嘴裡的光
    if (!dead && jaw > 0.3) glow(ctx, 40, 14, 20 + jaw * 20, VD.beam, 0.5 + jaw * 0.4);
    // 頭骨
    const skull = (c) => {
      c.moveTo(-20, 12);
      c.quadraticCurveTo(-26, -20, 0, -24);
      c.quadraticCurveTo(28, -26, 44, -12);
      c.lineTo(70, -6);
      c.quadraticCurveTo(78, 0, 70, 8);
      c.lineTo(40, 12);
      c.quadraticCurveTo(10, 18, -20, 12);
      c.closePath();
    };
    A.shape(ctx, skull, sky, skyS, { cel: [4, 5], hl: [-4, -16, 7, 3], lw: 3 });
    finish(ctx, skull, [-26, -26, 78, 18], { rim: '#dcd0ff', rimA: 0.38, dark: '#04020c', darkA: 0.34, bounce: gold, bounceA: 0.2, lw: 3 });
    ctx.strokeStyle = rgba(gold, 0.7); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-10, -14); ctx.quadraticCurveTo(10, -22, 34, -12); ctx.moveTo(-4, -6); ctx.quadraticCurveTo(12, -12, 26, -6); ctx.stroke();
    // 頭上的星點
    ctx.fillStyle = A.c(VD.star);
    [[6, -12], [20, -16], [52, -6], [-8, 0]].forEach(([x, y], i) => {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5 + i);
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // 上牙
    ctx.fillStyle = A.c('#f4ecd8');
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const x = 22 + i * 10;
      ctx.beginPath();
      ctx.moveTo(x - 3, 10);
      ctx.lineTo(x, 17 + (i % 2) * 3);
      ctx.lineTo(x + 3, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // 頭冠的尖刺
    [[-14, -18, -2.4, 18], [-2, -24, -2.1, 22], [12, -24, -1.9, 16]].forEach(([x, y, a, L]) => {
      A.shape(ctx, (c) => {
        c.moveTo(x - 5, y + 2);
        c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
        c.lineTo(x + 5, y + 2);
        c.closePath();
      }, gold, VD.goldS, { lw: 2, shadeY: y - 4 });
    });
    // 鼻孔
    ctx.fillStyle = A.c('#07040f');
    ctx.beginPath();
    ctx.ellipse(68, -2, 3, 2, 0.3, 0, TAU);
    ctx.fill();
    // 眼
    if (dead) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(18, -8);
      ctx.lineTo(34, -6);
      ctx.stroke();
    } else {
      const eg = 0.9 + Math.sin(t * 5) * 0.1 + (rage ? 0.4 : 0) + breath * 0.5;
      // 實心發光的眼（沒有眼白）：整顆都是熔金／暴走時洋紅的光
      solidEye(ctx, 26, -7.5, 12, hurt ? 2.5 : 6.8, eyeC, eg * 1.3, false);
    }
    // 吐息蓄力：嘴前的虛空光球
    if (charge && !dead) {
      const r = 8 + breath * 16;
      glow(ctx, 76, 14, r * 3, VD.beam, 0.8);
      A.ellipse(ctx, 76, 14, r, r, '#1a0a30', null, { lw: 2.4, hl: false });
      ctx.strokeStyle = A.c('#f0dcff');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(76, 14, r + 3, t * 6, t * 6 + 4);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + t * 3;
        const rr = r + 50 * (1 - ((t * 1.6 + i / 8) % 1));
        starShape(ctx, 76 + Math.cos(a) * rr, 14 + Math.sin(a) * rr, 3, '#ffffff');
      }
    }
    ctx.restore();

    // ── 虛空吐息：嘴邊的噴發光 ──
    // 光束本體只由地面區域 fb_beam 畫（起點就是這張嘴、方向＝頭的方向＝判定線）；
    // 這裡不再畫任何有方向的光柱，只畫以嘴為中心、不分方向的噴發光，避免出現第二道光束。
    if (fire && !dead) {
      ctx.save();
      ctx.translate(hbX, hbY);
      ctx.rotate(-headUp);
      ctx.translate(74, 14);
      const ga = ctx.globalAlpha;
      const pulse = 0.85 + Math.sin(t * 40) * 0.15;
      glow(ctx, 0, 0, 58 * pulse, VD.beam, 0.85);
      glow(ctx, 0, 0, 26 * pulse, '#ffffff', 1);
      ctx.strokeStyle = rgba('#f0dcff', 0.8);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 20 + ((t * 90) % 22), 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const q = (t * 2.6 + hash(i + 40)) % 1;
        const a = hash(i + 41) * TAU;
        const d = 10 + q * 34;
        ctx.globalAlpha = ga * (1 - q);
        starShape(ctx, Math.cos(a) * d, Math.sin(a) * d, 2.5 + (1 - q) * 3, i % 3 ? '#ffffff' : VD.line);
      }
      ctx.restore();
    }
    // 黑洞球：雙爪之間
    if (orb && !dead && ph !== 'strike') {
      const r = 8 + orbK * 14 + Math.sin(t * 8) * 2;
      ctx.save();
      ctx.translate(claw[0] + 16, claw[1] - 14);
      drawVoidOrb(ctx, r, t);
      ctx.restore();
    }
    // 墜星雨：光冕迸出星星
    if (starfall && !dead) {
      for (let i = 0; i < 10; i++) {
        const q = (t * 1.2 + i / 10) % 1;
        const a = (i / 10) * TAU + t * 0.3;
        const r = er * 1.2 + q * 90;
        ctx.globalAlpha = 1 - q;
        starShape(ctx, ex + Math.cos(a) * r, ey + Math.sin(a) * r, 5 + (1 - q) * 5, i % 2 ? '#ffffff' : VD.line);
        ctx.globalAlpha = 1;
      }
    }
    // 精修：身邊一閃一閃的星光
    if (!dead) {
      for (let i = 0; i < 9; i++) sparkle4(ctx, (hash(i + 230) - 0.5) * 360, -20 - hash(i + 231) * 240, 3 + hash(i) * 3, i % 3 ? '#ffffff' : gold, Math.max(0, Math.sin(t * 2.2 + i * 1.9)));
    }
    ctx.restore();
  }
  // 黑洞球（也給投射物 fb_voidorb 用）：以球心為原點
  function drawVoidOrb(ctx, r, t) {
    glow(ctx, 0, 0, r * 3, '#8a4aff', 0.6);
    // 被吸進去的光點
    for (let i = 0; i < 10; i++) {
      const q = (t * 1.3 + hash(i + 60)) % 1;
      const a = hash(i + 61) * TAU + q * 2.5;
      const d = r * (2.8 - q * 1.8);
      ctx.globalAlpha = q;
      starShape(ctx, Math.cos(a) * d, Math.sin(a) * d, 2.5, i % 2 ? '#ffffff' : '#d8b0ff');
      ctx.globalAlpha = 1;
    }
    // 吸積盤
    ctx.save();
    ctx.rotate(-0.35);
    ctx.scale(1, 0.34);
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = A.c(['#ffd0ff', '#c89aff', '#7a4ae0'][k]);
      ctx.lineWidth = 7 - k * 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.55 + k * 0.28), t * (4 - k) + k, t * (4 - k) + k + 4.2);
      ctx.stroke();
    }
    ctx.restore();
    A.shape(ctx, (c) => c.arc(0, 0, r, 0, TAU), '#05020c', null, { lw: 3 });
    ctx.strokeStyle = A.c('#f0dcff');
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0, TAU);
    ctx.stroke();
    // 前半圈吸積盤（蓋在球前面）
    ctx.save();
    ctx.rotate(-0.35);
    ctx.scale(1, 0.34);
    ctx.strokeStyle = A.c('#ffe8ff');
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55, 0.15, PI - 0.15);
    ctx.stroke();
    ctx.restore();
  }

  // ═════════════════════════ 出現演出（m.fx.spawn：1 → 0） ═════════════════════════
  // 從地面的魔法陣裡升起：把本體往下推、只畫地面以上的部分，腳下一圈發光法陣。
  // 放大／縮小過的魔王：描邊跟著 K 一起縮放會變得太粗（或太細）。跟 js/art/variants.js 一樣，
  // 畫的時候把線寬按倍率補回去一部分：螢幕上的粗細 ≈ 設計線寬 × K^0.35。H＝這隻美術的設計高度。
  // 攔截 lineWidth 每幀要多花約 0.2 ms，所以只在倍率差超過 15% 時才補（苔冠鱷王 1.1 倍一直是直接畫）。
  const LWD = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'lineWidth');
  function crisp(H, draw) {
    return function (ctx, m) {
      const K = (m.h || H) / H;
      if (Math.abs(K - 1) < 0.15 || !LWD || Object.prototype.hasOwnProperty.call(ctx, 'lineWidth')) return draw(ctx, m);
      const k = Math.pow(K, -0.65);
      Object.defineProperty(ctx, 'lineWidth', {
        configurable: true,
        get() { return LWD.get.call(this) / k; },
        set(v) { LWD.set.call(this, v * k); },
      });
      try {
        return draw(ctx, m);
      } finally {
        delete ctx.lineWidth;
      }
    };
  }
  const SPAWN_COL = { fb_shroom: '#8ad86a', fb_kraken: '#7dffc0', fb_balrog: '#ff7a1e', fb_zakum: '#7ad8ff', fb_voiddragon: '#b06aff' };
  function withSpawn(art, H, draw) {
    return function (ctx, m) {
      const sp = clamp(num(m.fx && m.fx.spawn, 0), 0, 1);
      if (sp <= 0 || m.dead) {
        draw(ctx, m);
        return;
      }
      const col = SPAWN_COL[art];
      const K = (m.h || H) / H;
      const t = num(m.t, 0);
      const W = (m.w || H) * 0.62;
      // 法陣（在本體後面）
      ctx.save();
      ctx.globalAlpha *= Math.min(1, sp * 3);
      warnRing(ctx, W, 1 - sp, col, t);
      ctx.restore();
      if (m.hover) {
        // 懸空的魔王：從法陣上方的虛空淡入
        ctx.save();
        ctx.globalAlpha *= 1 - sp;
        ctx.translate(0, -sp * 30);
        draw(ctx, m);
        ctx.restore();
        return;
      }
      const rise = sp * sp * (3 - 2 * sp);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-4000, -4000, 8000, 4000);
      ctx.clip();
      ctx.translate(0, rise * H * K * 1.05);
      draw(ctx, m);
      ctx.restore();
      // 升起時噴出的光柱＋碎石
      ctx.save();
      const g = ctx.createLinearGradient(0, -H * K * 1.4, 0, 0);
      g.addColorStop(0, rgba(col, 0));
      g.addColorStop(1, rgba(col, 0.55 * sp));
      ctx.fillStyle = g;
      ctx.fillRect(-W * 0.8, -H * K * 1.4, W * 1.6, H * K * 1.4);
      for (let i = 0; i < 8; i++) {
        const q = (t * 1.8 + hash(i + 80)) % 1;
        const x = (hash(i + 81) - 0.5) * W * 1.6;
        const y = -q * 90;
        A.shape(ctx, (c) => {
          c.moveTo(x - 5, y);
          c.lineTo(x, y - 6);
          c.lineTo(x + 6, y);
          c.lineTo(x, y + 4);
          c.closePath();
        }, '#6a5040', null, { lw: 1.6 });
      }
      ctx.restore();
    };
  }

  // ═════════════════════════ 地面區域 ═════════════════════════
  function zfade(z, inK, outK) {
    const life = z.life || 1;
    const zt = z.t || 0;
    return clamp(Math.min((life - zt) * (outK || 4), zt * (inK || 8)), 0, 1);
  }
  // 預警圓：紅色、越接近出招越滿
  function fb_warn(ctx, z, t) {
    const f = zfade(z, 10, 6);
    if (f <= 0) return;
    const k = clamp((z.t || 0) / (z.life || 1), 0, 1);
    const r = z.r || 60;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= f;
    warnRing(ctx, r, k, '#ff3a3a', t);
    // 內圈的魔紋
    ctx.save();
    ctx.scale(1, 0.28);
    ctx.rotate(t * 0.8);
    ctx.strokeStyle = rgba('#ffb0a0', 0.5 + 0.4 * k);
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const b = a + (TAU / 6) * 2;
      ctx.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
      ctx.lineTo(Math.cos(b) * r * 0.72, Math.sin(b) * r * 0.72);
    }
    ctx.stroke();
    ctx.restore();
    // 快砸下來時的驚嘆號
    if (k > 0.35) {
      const bob = Math.sin(t * 16) * 3;
      ctx.globalAlpha *= clamp((k - 0.35) * 4, 0, 1);
      A.shape(ctx, (c) => {
        c.moveTo(-6, -46 + bob);
        c.lineTo(6, -46 + bob);
        c.lineTo(3, -20 + bob);
        c.lineTo(-3, -20 + bob);
        c.closePath();
        c.moveTo(5, -12 + bob);
        c.arc(0, -12 + bob, 5, 0, TAU);
      }, '#ff4a3a', null, { lw: 2.6 });
    }
    ctx.restore();
  }
  // 預警線段（火鞭、光束）
  function fb_warnline(ctx, z, t) {
    const f = zfade(z, 10, 6);
    if (f <= 0) return;
    const k = clamp((z.t || 0) / (z.life || 1), 0, 1);
    const x1 = num(z.x1, z.x);
    const y1 = num(z.y1, z.y);
    const x2 = num(z.x2, z.x + 200);
    const y2 = num(z.y2, z.y);
    const w = z.w || 40;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const blink = 0.5 + 0.5 * Math.sin(t * (10 + k * 30));
    ctx.save();
    ctx.globalAlpha *= f;
    ctx.translate(x1, y1);
    ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
    const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    g.addColorStop(0, rgba('#ff3a3a', 0.05));
    g.addColorStop(0.5, rgba('#ff3a3a', 0.2 + blink * 0.15));
    g.addColorStop(1, rgba('#ff3a3a', 0.05));
    ctx.fillStyle = g;
    ctx.fillRect(0, -w / 2, len, w);
    ctx.fillStyle = rgba('#ff8a6a', 0.3);
    ctx.fillRect(0, -w * 0.22, len * k, w * 0.44);
    ctx.strokeStyle = rgba('#ff5a4a', 0.6 + blink * 0.4);
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 10]);
    ctx.lineDashOffset = -t * 60;
    ctx.beginPath();
    ctx.moveTo(0, -w / 2);
    ctx.lineTo(len, -w / 2);
    ctx.moveTo(0, w / 2);
    ctx.lineTo(len, w / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // 往前流動的箭頭
    ctx.strokeStyle = rgba('#ffd0c0', 0.75);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const step = 70;
    const off = (t * 160) % step;
    for (let x = off; x < len - 10; x += step) {
      ctx.moveTo(x - 10, -w * 0.2);
      ctx.lineTo(x, 0);
      ctx.lineTo(x - 10, w * 0.2);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 火鞭的鞭痕（赤焰炎魔）：z.x1＝魔王腳下、z.dir、z.len、z.k（體型）、z.hitAt（鞭梢著地的時間）
  //   ① 掃過的火弧：鞭梢從頭後上方劃過頭頂落到前方（與 fb_balrog 甩鞭時鞭梢走的同一條弧）
  //   ② 判定帶：離地 0～80、長 len 的火光＝js/game/fieldboss.js 的判定框
  //   ③ 鞭梢音爆：白熱星芒＋衝擊圈　④ 地面焦痕：燒紅的裂縫＋小火苗，慢慢熄滅
  function fb_whipcrack(ctx, z, t) {
    const life = z.life || 1.4;
    const zt = z.t || 0;
    if (zt >= life) return;
    const hitAt = num(z.hitAt, 0.1);
    const len = z.len || 560;
    const K = z.k || 1;
    const rage = !!z.rage;
    const R = rage ? 1.3 : 1;
    const hot = rage ? '#fffbe8' : '#fff0b0';
    const mid = rage ? '#ffd23a' : '#ffb43a';
    const out = rage ? '#ff9a2a' : '#ff5a1e';
    const after = zt - hitAt;
    const ga = ctx.globalAlpha;
    ctx.save();
    ctx.translate(num(z.x1, z.x), z.y);
    ctx.scale(z.dir || 1, 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // ④ 地面焦痕
    if (after >= 0) {
      const f = clamp(Math.min(after * 14, (life - zt) * 2.2), 0, 1);
      const heat = clamp(1 - after / (life - hitAt), 0, 1);
      ctx.globalAlpha = ga * f;
      ctx.fillStyle = rgba('#1a0c08', 0.5);
      ctx.beginPath();
      ctx.ellipse(len / 2, 0, len / 2, 8 * R, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, 0);
      for (let i = 1; i <= 12; i++) ctx.lineTo((i / 12) * len, (hash(i + 300) - 0.5) * 7 * R);
      ctx.strokeStyle = rgba(out, 0.45 * heat);
      ctx.lineWidth = 12 * R;
      ctx.stroke();
      ctx.strokeStyle = rgba(mid, 0.95 * heat);
      ctx.lineWidth = 3 * R;
      ctx.stroke();
      if (heat > 0.12) {
        const n = rage ? 9 : 7;
        for (let i = 0; i < n; i++) {
          const x = ((i + 0.5) / n) * len;
          flame(ctx, x, 2, 7 * R, (20 + hash(i + 310) * 16) * R * heat, t, i + 50, out, hot, 1.6);
        }
      }
    }
    // ② 判定帶（著地後 0.4 秒內）：正好是離地 0～80、長 len 的框
    if (after >= 0 && after < 0.4) {
      const k = 1 - after / 0.4;
      ctx.globalAlpha = ga;
      const g = ctx.createLinearGradient(0, -80, 0, 0);
      g.addColorStop(0, rgba(out, 0));
      g.addColorStop(0.5, rgba(mid, 0.55 * k));
      g.addColorStop(1, rgba(out, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, -80, len, 80);
      const wob = Math.sin(t * 40) * 4 * k;
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.quadraticCurveTo(len * 0.5, -40 + wob, len, -40);
      ctx.strokeStyle = rgba(out, 0.7 * k);
      ctx.lineWidth = (16 + 10 * k) * R;
      ctx.stroke();
      ctx.strokeStyle = rgba(hot, k);
      ctx.lineWidth = (3 + 5 * k) * R;
      ctx.stroke();
    }
    // ① 掃過的火弧
    const sp = clamp(zt / hitAt, 0, 1);
    const fa = after < 0 ? 1 : clamp(1 - after / 0.35, 0, 1);
    if (fa > 0 && sp > 0) {
      const arc = qb(BR_ARC.x0 * K, BR_ARC.y0 * K, len * BR_ARC.cx, BR_ARC.cy * K, len, -40);
      const N = 14;
      const layers = [[out, 0.4, 1], [mid, 0.7, 0.55], [hot, 0.95, 0.2]];
      ctx.globalAlpha = ga * fa;
      for (const [col, a, wk] of layers) {
        ctx.strokeStyle = rgba(col, a);
        for (let i = 0; i < N; i++) {
          const p0 = arc((sp * i) / N);
          const p1 = arc((sp * (i + 1)) / N);
          ctx.lineWidth = (4 + (28 * (i + 1)) / N) * R * wk;
          ctx.beginPath();
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p1[0], p1[1]);
          ctx.stroke();
        }
      }
    }
    // ③ 鞭梢音爆
    if (after >= 0 && after < 0.3) {
      const e = after / 0.3;
      const f = 1 - e;
      ctx.globalAlpha = ga;
      ctx.translate(len, -40);
      glow(ctx, 0, 0, (50 + 90 * e) * R, hot, f);
      ctx.fillStyle = rgba(hot, f);
      ctx.beginPath();
      const spikes = 10;
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * TAU + 0.2;
        const r = i % 2 ? (8 + 10 * e) * R : (26 + 70 * e) * R * (0.7 + 0.5 * hash(i + 320));
        i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(mid, f);
      ctx.lineWidth = 2 + 6 * f;
      ctx.beginPath();
      ctx.ellipse(0, 0, (20 + 110 * e) * R, (14 + 60 * e) * R, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 光束（千手冰像的冰光、星蝕魔龍的虛空吐息）：z.color
  function fb_beam(ctx, z, t) {
    const life = z.life || 0.6;
    const p = clamp((z.t || 0) / life, 0, 1);
    const k = Math.sin(p * PI);
    const x1 = num(z.x1, z.x);
    const y1 = num(z.y1, z.y);
    const x2 = num(z.x2, z.x + 400);
    const y2 = num(z.y2, z.y);
    const w = (z.w || 50) * (0.55 + 0.45 * k);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const col = z.color || '#b88aff';
    const ice = U.hexToRgb(col)[2] > 200 && U.hexToRgb(col)[1] > 180;
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
    ctx.globalAlpha *= clamp(Math.min(1, (life - (z.t || 0)) * 6), 0, 1);
    const g = ctx.createLinearGradient(0, -w * 1.2, 0, w * 1.2);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, 0.55));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, -w * 1.2, len, w * 2.4);
    const wob = Math.sin(t * 50) * w * 0.06;
    A.shape(ctx, (c) => {
      c.moveTo(0, -w * 0.3);
      c.lineTo(len, -w / 2 - wob);
      c.lineTo(len, w / 2 + wob);
      c.lineTo(0, w * 0.3);
      c.closePath();
    }, ice ? col : '#2a1250', null, { lw: 3 });
    if (!ice) {
      // 虛空光束：黑色核心、兩緣紫白光
      ctx.strokeStyle = A.c(col);
      ctx.lineWidth = w * 0.18;
      ctx.beginPath();
      ctx.moveTo(0, -w * 0.22);
      ctx.lineTo(len, -w * 0.36 - wob);
      ctx.moveTo(0, w * 0.22);
      ctx.lineTo(len, w * 0.36 + wob);
      ctx.stroke();
    }
    ctx.fillStyle = A.c(ice ? '#ffffff' : '#f4e8ff');
    ctx.beginPath();
    ctx.moveTo(0, -w * 0.08);
    ctx.lineTo(len, -w * (ice ? 0.2 : 0.06));
    ctx.lineTo(len, w * (ice ? 0.2 : 0.06));
    ctx.lineTo(0, w * 0.08);
    ctx.closePath();
    ctx.fill();
    // 沿著光束流動的冰晶／星星
    for (let i = 0; i < 18; i++) {
      const q = ((t * 1.8 + hash(i + 120)) % 1) * len;
      const yy = (hash(i + 121) - 0.5) * w * 0.9;
      if (ice) {
        ctx.save();
        ctx.translate(q, yy);
        ctx.rotate(hash(i) * TAU + t * 4);
        A.shape(ctx, (c) => {
          c.moveTo(0, -7);
          c.lineTo(3, 0);
          c.lineTo(0, 7);
          c.lineTo(-3, 0);
          c.closePath();
        }, '#e8f8ff', null, { lw: 1.4 });
        ctx.restore();
      } else {
        starSpark(ctx, q, yy, 3 + hash(i) * 4, i % 3 ? '#ffffff' : '#ffd86a');
      }
    }
    // 起點的強光、終點的衝擊
    glow(ctx, 0, 0, w * 1.4, '#ffffff', 0.9);
    glow(ctx, len, 0, w * 1.6, col, 0.7 * k);
    ctx.restore();
  }
  function starSpark(ctx, x, y, r, col) {
    ctx.fillStyle = A.c(col);
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }
  // 一團有描邊的煙（毒霧、墨雲用）
  function puff(ctx, x, y, r, col, colS) {
    A.shape(ctx, (c) => {
      c.moveTo(x - r, y + r * 0.3);
      c.arc(x - r * 0.45, y - r * 0.05, r * 0.6, PI * 0.9, PI * 1.75);
      c.arc(x + r * 0.2, y - r * 0.3, r * 0.62, PI * 1.2, PI * 1.95);
      c.arc(x + r * 0.62, y + r * 0.08, r * 0.46, PI * 1.5, PI * 0.4);
      c.quadraticCurveTo(x, y + r * 0.62, x - r, y + r * 0.3);
      c.closePath();
    }, col, colS, { lw: 2.4, shadeY: y + r * 0.18 });
  }
  // 沼氣吐息（苔冠鱷王噴出的沼氣）：地上一團翻滾的沼綠＋泥紫沼氣＋往上冒的氣泡（z.r 半徑）
  function fb_sporebreath(ctx, z, t) {
    const f = zfade(z, 5, 2);
    if (f <= 0) return;
    const r = z.r || 150;
    const zt = z.t || 0;
    const grow = 0.6 + 0.4 * Math.min(1, zt * 3);
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= f;
    ctx.save();
    ctx.scale(1, 0.3);
    glow(ctx, 0, 0, r * 1.2, '#9ae05a', 0.3);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= 0.72;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + zt * 0.4;
      const x = Math.cos(a) * r * 0.62 * grow + Math.sin(t * 1.3 + i) * 8;
      const y = -30 - Math.abs(Math.sin(a)) * 26 + Math.sin(t * 2 + i * 1.7) * 6;
      puff(ctx, x, y, r * 0.3 * grow * (0.8 + hash(i) * 0.4), i % 3 ? '#94c86a' : '#8a72a8', i % 3 ? '#5e8e44' : '#5a4a74');
    }
    puff(ctx, 0, -46, r * 0.36 * grow, '#a8d878', '#6a9a4a');
    ctx.restore();
    // 往上冒的沼氣泡
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 14; i++) {
      const q = (t * 0.6 + hash(i + 140)) % 1;
      const x = (hash(i + 141) - 0.5) * r * 1.8 + Math.sin(t * 2 + i) * 10;
      const y = -10 - q * 150;
      const br = 2.4 + hash(i + 142) * 3.5;
      ctx.globalAlpha = f * Math.sin(q * PI);
      ctx.fillStyle = rgba(i % 3 ? '#c8f0a0' : '#c8a8f0', 0.35);
      ctx.strokeStyle = A.c(i % 3 ? '#e4ffc8' : '#e4d0ff');
      ctx.beginPath();
      ctx.arc(x, y, br, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = A.c('#ffffff');
      ctx.fillRect(x - br * 0.5, y - br * 0.5, 1.4, 1.4);
    }
    ctx.restore();
  }
  // 墨雲：黑紫色的墨汁雲團（減速）
  function fb_inkcloud(ctx, z, t) {
    const f = zfade(z, 5, 1.5);
    if (f <= 0) return;
    const r = z.r || 150;
    const zt = z.t || 0;
    const grow = 0.55 + 0.45 * Math.min(1, zt * 3);
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= f;
    // 地上的墨漬
    A.shape(ctx, (c) => {
      c.ellipse(0, -2, r * grow, r * 0.16 * grow, 0, 0, TAU);
    }, '#1a1024', null, { lw: 2.4 });
    ctx.save();
    ctx.globalAlpha *= 0.85;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + zt * 0.25;
      const x = Math.cos(a) * r * 0.66 * grow + Math.sin(t * 0.9 + i) * 10;
      const y = -36 - Math.abs(Math.sin(a)) * 30 + Math.sin(t * 1.4 + i * 1.3) * 7;
      puff(ctx, x, y, r * 0.3 * grow * (0.8 + hash(i + 7) * 0.45), i % 2 ? '#2e2240' : '#3a2c52', '#1a1028');
    }
    puff(ctx, 0, -56, r * 0.38 * grow, '#2a1e3c', '#160c22');
    ctx.restore();
    // 墨雲裡閃爍的幽綠光點
    for (let i = 0; i < 8; i++) {
      const x = (hash(i + 150) - 0.5) * r * 1.4;
      const y = -24 - hash(i + 151) * 70;
      const a = 0.5 + 0.5 * Math.sin(t * 3 + i * 2);
      glow(ctx, x, y, 10, '#7dffc0', 0.5 * a);
    }
    // 滴下的墨
    for (let i = 0; i < 6; i++) {
      const q = (t * 0.9 + hash(i + 160)) % 1;
      const x = (hash(i + 161) - 0.5) * r * 1.3;
      const y = -30 + q * 28;
      ctx.fillStyle = A.c('#1a1028');
      ctx.beginPath();
      ctx.ellipse(x, y, 3, 5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // 地下竄出的觸手（z.h 高、z.life 約 0.9）
  function fb_tentacle(ctx, z, t) {
    const life = z.life || 0.9;
    const zt = z.t || 0;
    const up = clamp(zt / 0.15, 0, 1);
    const down = clamp((life - zt) / 0.25, 0, 1);
    const k = Math.min(up, down);
    if (k <= 0) return;
    const H = (z.h || 170) * (up < 1 ? 1 - Math.pow(1 - up, 3) : 1) * (down < 1 ? down : 1);
    const seed = (z.x || 0) * 0.013;
    ctx.save();
    ctx.translate(z.x, z.y);
    // 地面的裂口
    A.shape(ctx, (c) => c.ellipse(0, -2, 40, 11, 0, 0, TAU), '#2a1a14', null, { lw: 2.6 });
    // 觸手
    const sw = Math.sin(t * 7 + seed) * 18;
    const fn = cb(-6, 6, -20 + sw * 0.4, -H * 0.35, 24 + sw, -H * 0.75, 6 - sw * 0.6 + 18, -H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-400, -2000, 800, 2002);
    ctx.clip();
    tentacle(ctx, fn, 42, KR.skin, KR.skinS, { side: -1, glowTip: KR.ghost, glowA: 0.5 });
    // 纏在上面的一小段鏽鏈
    const a = along(fn, 0.35, 0);
    const b = along(fn, 0.5, 0);
    chain(ctx, a[0] - 18, a[1] + 6, b[0] + 16, b[1] - 4, 6, 4, KR.iron, KR.ironS);
    ctx.restore();
    // 碎土
    A.shape(ctx, (c) => {
      c.moveTo(-44, 0);
      c.lineTo(-34, -12);
      c.lineTo(-22, -6);
      c.lineTo(-10, -14);
      c.lineTo(-4, 0);
      c.closePath();
      c.moveTo(6, 0);
      c.lineTo(14, -12);
      c.lineTo(28, -8);
      c.lineTo(38, -14);
      c.lineTo(46, 0);
      c.closePath();
    }, '#7a5a3a', '#5a3e28', { lw: 2.4, shadeY: -5 });
    if (zt < 0.4) {
      for (let i = 0; i < 6; i++) {
        const q = clamp(zt / 0.4, 0, 1);
        const x = (i - 2.5) * 12 * (1 + q * 2);
        const y = -Math.sin(q * PI) * (40 + hash(i) * 40);
        A.shape(ctx, (c) => {
          c.moveTo(x - 4, y);
          c.lineTo(x, y - 5);
          c.lineTo(x + 5, y);
          c.lineTo(x, y + 4);
          c.closePath();
        }, '#7a5a3a', null, { lw: 1.6 });
      }
    }
    ctx.restore();
  }
  // 冰石巨拳砸地（z.r 範圍、z.dir 手臂來的方向、z.life 約 0.7）
  function fb_armslam(ctx, z, t) {
    const life = z.life || 0.7;
    const zt = z.t || 0;
    const r = z.r || 110;
    const drop = clamp(zt / 0.1, 0, 1);
    const f = clamp((life - zt) * 5, 0, 1);
    if (f <= 0) return;
    const side = z.dir || 1;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.globalAlpha *= f;
    // 衝擊波（地上擴散的冰環）
    if (drop >= 1) {
      const q = clamp((zt - 0.1) / 0.45, 0, 1);
      ctx.save();
      ctx.scale(1, 0.28);
      ctx.strokeStyle = rgba('#e8f8ff', 1 - q);
      ctx.lineWidth = 10 * (1 - q) + 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.5 + q * 0.9), 0, TAU);
      ctx.stroke();
      glow(ctx, 0, 0, r * 1.3, '#7ad8ff', 0.6 * (1 - q));
      ctx.restore();
      // 地上冒出的冰刺
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * r * 0.3 + (hash(i + 170) - 0.5) * 12;
        const h = (26 + hash(i + 171) * 34) * Math.min(1, q * 4) * (i === 3 ? 0.5 : 1);
        iceCrystal(ctx, x, 2, h, 7 + hash(i) * 4, (i - 3) * 0.16, ZK.ice, ZK.iceS);
      }
      // 地面裂痕
      hotLines(ctx, (c) => {
        crack(c, -10, -1, PI, r * 0.9, 3, 180);
        crack(c, 10, -1, 0, r * 0.9, 3, 181);
      }, '#7ad8ff', 0.8 * (1 - q), 2);
    }
    // 從天而降的手臂＋拳頭
    const fy = -(1 - drop) * 260 - 6;
    ctx.save();
    ctx.translate(0, fy);
    ctx.rotate(-side * 0.18);
    const col = ZK.stone;
    const colS = ZK.stoneS;
    // 巨大的石前臂（金臂環＋發光符文＋冰晶）
    const fr = qb(-side * 46, -480, -side * 26, -310, 0, -134);
    const fw = (s) => 40 + (1 - s) * 24 + Math.sin(s * PI) * 6;
    A.shape(ctx, (c) => taper(c, fr, fw), col, colS, { cel: [10 * side, 6], lw: 3.6 });
    // 石紋：中線的刻槽＋橫向的裂痕
    ctx.strokeStyle = A.c(ZK.stoneD);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const p = along(fr, 0.1 + i * 0.045, -fw(0.1 + i * 0.045) * 0.18);
      if (i) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    const g1 = along(fr, 0.3, fw(0.3) * 0.46);
    const g2 = along(fr, 0.34, fw(0.34) * 0.1);
    ctx.moveTo(g1[0], g1[1]);
    ctx.lineTo(g2[0], g2[1]);
    ctx.stroke();
    zkBand(ctx, fr, 0.62, 0.72, fw, ZK.gold, ZK.goldS);
    zkBand(ctx, fr, 0.86, 0.93, fw, ZK.gold, ZK.goldS);
    hotLines(ctx, (c) => {
      const p = along(fr, 0.79, 0);
      c.moveTo(p[0] - 9, p[1] - 8);
      c.lineTo(p[0], p[1] + 8);
      c.lineTo(p[0] + 9, p[1] - 8);
      const q = along(fr, 0.45, 0);
      c.moveTo(q[0], q[1] - 12);
      c.lineTo(q[0], q[1] + 12);
      c.moveTo(q[0] - 8, q[1]);
      c.lineTo(q[0] + 8, q[1]);
    }, '#7ad8ff', 1, 2.6);
    const ip = along(fr, 0.52, -fw(0.52) * 0.42);
    iceCrystal(ctx, ip[0], ip[1], 46, 12, ip[2] - PI / 2 - 0.3, ZK.ice, ZK.iceS);
    const ip2 = along(fr, 0.36, -fw(0.36) * 0.44);
    iceCrystal(ctx, ip2[0], ip2[1], 32, 9, ip2[2] - PI / 2 - 0.5, '#e6f7ff', ZK.iceS);
    // 張開的石掌（指尖朝下、掌心朝前、掌心符文發光）：千手冰像的平掌砸下
    glow(ctx, 0, -60, 100, '#7ad8ff', 0.5);
    ctx.save();
    ctx.translate(0, -140);
    ctx.rotate(PI / 2);
    ctx.scale(3.3, 3.3 * side);
    zkPalm(ctx, ZK_MUDRA.strike, ZK.stoneL, ZK.stoneLS, 0.9, '#7ad8ff');
    ctx.restore();
    // 下墜的速度線
    if (drop < 1) {
      ctx.strokeStyle = rgba('#e8f8ff', 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      [-40, -14, 16, 40].forEach((x) => {
        ctx.moveTo(x, -100);
        ctx.lineTo(x, -170);
      });
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // ═════════════════════════ 投射物（原點已經在 p.x, p.y） ═════════════════════════
  // 甩出去的生鏽錨（拋物線）：一邊旋轉、後面拖著一截鏈子
  function fb_anchor(ctx, p, t) {
    const pt = num(p.t, t);
    const vx = num(p.vx, 1);
    const vy = num(p.vy, 0);
    const back = Math.atan2(-vy, -vx);
    // 拖在後面的鏈子
    const cx = Math.cos(back);
    const cy = Math.sin(back);
    chain(ctx, cx * 10, cy * 10, cx * 70 + Math.sin(pt * 12) * 6, cy * 70 + 12, 10, 4.5, KR.iron, KR.ironS);
    ctx.save();
    ctx.rotate(pt * 9 * ((p.dir || vx) >= 0 ? 1 : -1));
    glow(ctx, 0, 0, 44, '#7dffc0', 0.25);
    ctx.translate(0, -34);
    drawAnchor(ctx, 0.72, 0.6);
    ctx.restore();
    // 風切線
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 38, pt * 9, pt * 9 + 1.2);
    ctx.stroke();
  }
  // 從天而降的流星：p.style = 'fire'（火雨）或 'star'（墜星）
  function fb_meteor(ctx, p, t) {
    const pt = num(p.t, t);
    const star = p.style === 'star';
    const r = num(p.r, star ? 14 : 20) * (star ? 1.1 : 1);
    const a = Math.atan2(num(p.vy, 1), num(p.vx, 0));
    ctx.save();
    ctx.rotate(a);
    // 尾巴
    const g = ctx.createLinearGradient(-r * 7, 0, 0, 0);
    g.addColorStop(0, rgba(star ? '#b06aff' : '#ff5a1e', 0));
    g.addColorStop(0.6, rgba(star ? '#c89aff' : '#ff8a2a', 0.6));
    g.addColorStop(1, rgba(star ? '#fff4d0' : '#ffe27a', 0.95));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * 7, 0);
    ctx.quadraticCurveTo(-r * 3, -r * 1.1, 0, -r * 0.95);
    ctx.lineTo(0, r * 0.95);
    ctx.quadraticCurveTo(-r * 3, r * 1.1, -r * 7, 0);
    ctx.fill();
    if (!star) {
      // 火舌
      for (let i = 0; i < 4; i++) {
        const q = (pt * 3 + i / 4) % 1;
        ctx.save();
        ctx.translate(-r * (0.6 + q * 2.4), (i - 1.5) * r * 0.35);
        ctx.rotate(PI / 2);
        ctx.globalAlpha *= 1 - q;
        flame(ctx, 0, 0, r * 0.4, r * 1.2, pt, i, '#ff7a1e', '#ffe27a', 1.6);
        ctx.restore();
      }
    }
    ctx.restore();
    glow(ctx, 0, 0, r * 2.6, star ? '#e0c8ff' : '#ffb43a', 0.75);
    if (star) {
      ctx.save();
      ctx.rotate(pt * 5);
      A.shape(ctx, (c) => {
        for (let i = 0; i < 10; i++) {
          const aa = -PI / 2 + (i / 10) * TAU;
          const rr = i % 2 ? r * 0.45 : r;
          i ? c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr) : c.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
        }
        c.closePath();
      }, '#fff0a0', '#f2c24a', { lw: 2.4, shadeY: r * 0.2 });
      ctx.restore();
      starSpark(ctx, 0, 0, r * 0.35, '#ffffff');
    } else {
      // 熔岩石塊
      ctx.save();
      ctx.rotate(pt * 4);
      const rock = (c) => {
        for (let i = 0; i < 8; i++) {
          const aa = (i / 8) * TAU;
          const rr = r * (0.82 + hash(i + 190) * 0.3);
          i ? c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr) : c.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
        }
        c.closePath();
      };
      A.shape(ctx, rock, '#4a3430', '#2e1e1c', { cel: [r * 0.2, r * 0.2], lw: 2.6 });
      ctx.beginPath();
      rock(ctx);
      ctx.save();
      ctx.clip();
      hotLines(ctx, (c) => {
        crack(c, -r * 0.6, -r * 0.2, 0.3, r * 1.1, 3, 191);
        crack(c, r * 0.2, r * 0.5, -1.4, r * 0.8, 2, 193);
      }, '#ffb43a', 1, 2.2);
      ctx.restore();
      ctx.restore();
    }
  }
  // 黑洞球：吸人的虛空球（p.r、p.pullR）
  function fb_voidorb(ctx, p, t) {
    const pt = num(p.t, t);
    const r = num(p.r, 26) * 0.85 + Math.sin(pt * 8) * 1.5;
    const pr = Math.min(num(p.pullR, 200), 260);
    // 吸引範圍：往內收的扭曲圈
    for (let i = 0; i < 3; i++) {
      const q = (pt * 0.8 + i / 3) % 1;
      ctx.strokeStyle = rgba('#b06aff', 0.28 * q);
      ctx.lineWidth = 2 + q * 2;
      ctx.beginPath();
      ctx.arc(0, 0, pr * (1 - q * 0.8), 0, TAU);
      ctx.stroke();
    }
    drawVoidOrb(ctx, r, pt);
    // 快爆的時候閃
    if (p.life && pt > p.life - 0.6) {
      const k = (pt - (p.life - 0.6)) / 0.6;
      glow(ctx, 0, 0, r * (2 + k * 2), '#ffffff', 0.4 * k * (0.5 + 0.5 * Math.sin(pt * 40)));
    }
  }


  A.MONSTER_DRAW = A.MONSTER_DRAW || {};
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.ZONE_DRAW = A.ZONE_DRAW || {};
  Object.assign(A.MONSTER_DRAW, {
    fb_shroom, // 苔冠鱷王：出現動畫（從沼裡浮上來）自己畫
    fb_kraken: withSpawn('fb_kraken', 170, crisp(170, fb_kraken)),
    fb_balrog: withSpawn('fb_balrog', BR_H, crisp(BR_H, fb_balrog)),
    fb_zakum: withSpawn('fb_zakum', 320, crisp(320, fb_zakum)),
    fb_voiddragon: withSpawn('fb_voiddragon', 250, crisp(250, fb_voiddragon)),
  });
  Object.assign(A.PROJ_DRAW, { fb_anchor, fb_meteor, fb_voidorb });
  Object.assign(A.ZONE_DRAW, { fb_warn, fb_warnline, fb_whipcrack, fb_beam, fb_sporebreath, fb_inkcloud, fb_tentacle, fb_armslam });
})();
