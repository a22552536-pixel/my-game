// 野外魔王（規格：docs/SPEC-fieldboss.md）的美術：深淵菇魔、沉船海魔、赤焰炎魔、千手冰像、星蝕魔龍，
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
  function rgbOf(hex) {
    return U.hexToRgb(A.c(hex)).join(',');
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

  // ═════════════════════════ 深淵菇魔 fb_shroom（170×190） ═════════════════════════
  // 被星楓葉侵蝕的深淵惡魔菇王：像斗篷一樣壓低的巨大黑紫菇傘（鋸齒傘緣、脊上骨刺、發光膿包與裂紋）、
  // 兩支往內彎的惡魔角、傘下陰影裡的骨質面具（發光斜眼、會張開的顎）、破爛的菌膜蝙蝠翅、
  // 佝僂的菌柄身軀＋破菌環裙、細長手臂上長著層孔菌與黑色長爪、菌根一樣抓地的腳。
  // 暴走：菇傘裂開露出酸黃色的核心、第三隻眼睜開、翅膀全開發光、傘脊冒出綠色鬼火。
  const SH = {
    cap: '#2c1640', capS: '#190a28', capR: '#3a0a2c', capRS: '#1c0416',
    gill: '#14060f', flesh: '#9a88a0', fleshS: '#66527a', fleshD: '#43324f', fleshR: '#8a6680', fleshRS: '#553048', fleshRD: '#3a1c32',
    mask: '#cbbcc6', maskS: '#8a7690', maskR: '#c4a8b4', maskRS: '#7e5470',
    bone: '#e8dcc0', boneS: '#ab9a7a', hornTip: '#1a0a16',
    wing: '#3c2450', wingS: '#26143a', wingR: '#4a0e34', wingRS: '#2a061c', wbone: '#6e5a7a', wboneS: '#46384f',
    claw: '#1a0c1a', glowG: '#8cff5a', glowR: '#d8ff3a', hot: '#ff4aa8', maw: '#10040c', tooth: '#efe4c8',
  };
  // 四根彎曲的黑色長爪（從 (x,y) 往 dir 方向）
  function shTalons(ctx, x, y, dir, len, spread, curl, col) {
    for (let i = 0; i < 4; i++) {
      const a = dir + (i - 1.5) * spread;
      const L = len * (i === 0 || i === 3 ? 0.8 : 1);
      const bx = x + Math.cos(a) * 7;
      const by = y + Math.sin(a) * 7;
      const mx = bx + Math.cos(a) * L * 0.55;
      const my = by + Math.sin(a) * L * 0.55;
      const tx = bx + Math.cos(a + curl) * L;
      const ty = by + Math.sin(a + curl) * L;
      A.shape(ctx, (c) => taper(c, qb(bx, by, mx, my, tx, ty), (s) => 10 * (1 - s) + 0.6, 12), col || SH.claw, null, { lw: 2 });
    }
  }
  // 小菇（召喚時從法陣裡冒出來）
  function shSprout(ctx, x, k, t, i, gcol) {
    if (k <= 0) return;
    const h = 34 * k;
    ctx.save();
    ctx.translate(x, 0);
    ctx.rotate(Math.sin(t * 5 + i) * 0.08 * k);
    A.shape(ctx, (c) => {
      c.moveTo(-6, 0);
      c.quadraticCurveTo(-8, -h * 0.6, -4, -h);
      c.lineTo(4, -h);
      c.quadraticCurveTo(8, -h * 0.6, 6, 0);
      c.closePath();
    }, SH.flesh, SH.fleshS, { cel: [2, 0], lw: 2.2 });
    A.shape(ctx, (c) => {
      c.moveTo(-18 * k, -h + 2);
      c.quadraticCurveTo(-16 * k, -h - 20 * k, 0, -h - 22 * k);
      c.quadraticCurveTo(16 * k, -h - 20 * k, 18 * k, -h + 2);
      c.quadraticCurveTo(0, -h - 4, -18 * k, -h + 2);
      c.closePath();
    }, SH.cap, SH.capS, { cel: [3, 3], lw: 2.4 });
    ctx.fillStyle = A.c(gcol);
    ctx.beginPath();
    ctx.arc(-3, -h - 3, 2, 0, TAU);
    ctx.arc(4, -h - 3, 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function fb_shroom(ctx, m) {
    const S = atk(m);
    const { fx, ph, t, rage, dead } = S;
    const K = (m.h || 190) / 190;
    const kind = S.kind;
    const breath = amt(fx.breath);
    const breathMove = breath > 0 || kind === 'breath';
    const firing = breathMove && (ph === 'strike' || !!fx.breathing || breath >= 0.999);
    const charging = breathMove && !firing && !!ph;
    const jump = !!fx.jump;
    const sumK = amt(fx.summon);
    const summon = !dead && (sumK > 0 || /summon|call/.test(kind));
    const jumpPrep = !jump && ph === 'wind' && /jump|slam|leap|quake/.test(kind);
    const landed = !jump && ph === 'strike' && /jump|slam|leap|quake/.test(kind);
    const roar = !dead && (summon || (ph === 'wind' && !breathMove && !jumpPrep && !jump));
    const walk = S.walk && !ph && !jump && !breathMove;
    const hurt = S.hurt;

    // ── 姿勢參數 ──
    const gait = t * 5;
    let bob = dead ? 8 : walk ? -Math.abs(Math.sin(gait)) * 4 : Math.sin(t * 2.2) * 2;
    let lean = walk ? 0.08 + Math.sin(gait) * 0.03 : 0.05 + Math.sin(t * 1.1) * 0.015;
    let crouch = 0;
    let headT = 0;
    let jaw = rage ? 0.3 : 0.14 + Math.max(0, Math.sin(t * 1.7)) * 0.08;
    let spread = rage ? 0.9 : 0.4;
    let flapSp = rage ? 3 : 2;
    let flapAmp = 0.07;
    let tuck = 0;
    // 手的位置（身體座標）
    let F = [80 + (walk ? Math.sin(gait) * 12 : 0), -44 + Math.sin(t * 2.2 + 1) * 3];
    let B = [-50 - (walk ? Math.sin(gait) * 12 : 0), -46 + Math.sin(t * 2.2) * 3];
    if (charging) {
      lean = 0.05 - 0.2 * breath;
      headT = -0.24 * breath;
      jaw = 0.3 + 0.5 * breath;
      spread = Math.max(spread, 0.6 + 0.4 * breath);
      F = [lerp(80, 30, breath), lerp(-44, -120, breath)];
      B = [lerp(-50, -70, breath), lerp(-46, -110, breath)];
    }
    if (firing) {
      lean = 0.2;
      headT = 0.1;
      jaw = 1;
      spread = 1;
      flapAmp = 0.03;
      F = [100, -104];
      B = [-72, -96];
    }
    if (jumpPrep) {
      crouch = 16 + Math.sin(t * 40) * 1.2;
      lean = 0.26;
      headT = -0.05;
      jaw = 0.55;
      spread = 1;
      flapAmp = 0.02;
      F = [76, -22];
      B = [-34, -24];
    }
    if (jump) {
      crouch = -6;
      lean = -0.04;
      headT = -0.12;
      spread = 1;
      flapSp = 16;
      flapAmp = 0.34;
      tuck = 1;
      jaw = 0.8;
      F = [96, -190];
      B = [-50, -206];
    }
    if (landed) {
      crouch = 14;
      lean = 0.28;
      headT = 0.06;
      jaw = 0.9;
      spread = 0.85;
      flapAmp = 0.02;
      F = [94, -4];
      B = [-54, -4];
    }
    if (roar) {
      lean = -0.1;
      headT = -0.2;
      jaw = 1;
      spread = 1;
      flapSp = 9;
      flapAmp = 0.12;
      F = [98, -186];
      B = [-78, -178];
    }
    if (hurt && !ph) {
      lean -= 0.08;
      headT -= 0.1;
      jaw = Math.max(jaw, 0.55);
    }
    if (dead) {
      lean = -0.16;
      headT = 0.25;
      jaw = 0.45;
      spread = 0.1;
      flapAmp = 0;
      F = [70, -6];
      B = [-50, -8];
    }
    const heat = dead ? 0 : clamp(0.5 + Math.sin(t * 3) * 0.15 + (rage ? 0.45 : 0) + (charging ? breath * 0.4 : 0) + (firing || roar ? 0.45 : 0), 0, 1.3);
    const gcol = rage ? SH.glowR : SH.glowG;
    const shake = jumpPrep || (charging && breath > 0.6) ? Math.sin(t * 55) * 1.6 : 0;
    const capC = rage ? SH.capR : SH.cap;
    const capS = rage ? SH.capRS : SH.capS;
    const fC = rage ? SH.fleshR : SH.flesh;
    const fS = rage ? SH.fleshRS : SH.fleshS;
    const fD = rage ? SH.fleshRD : SH.fleshD;
    const hipY = -62;
    const bodyT = () => {
      ctx.translate(0, bob + crouch);
      ctx.translate(0, hipY);
      ctx.rotate(lean);
      ctx.translate(0, -hipY);
    };

    ctx.save();
    ctx.scale(K, K);
    ctx.translate(shake, 0);
    // ── 魔化的氣場＋飄散的孢子 ──
    if (!dead) {
      glow(ctx, 0, -110, 160 + (rage ? 40 : 0), rage ? '#ff2a7a' : '#7a3aff', (rage ? 0.26 : 0.2) + Math.sin(t * 3) * 0.04);
      glow(ctx, 0, -8, 110, rage ? '#c8ff3a' : '#8cff5a', rage ? 0.18 : 0.12);
      const n = rage ? 16 : 8;
      for (let i = 0; i < n; i++) {
        const q = (t * 0.32 + hash(i + 7)) % 1;
        const x = (hash(i + 3) - 0.5) * 240 + Math.sin(t * 1.7 + i) * 12;
        const y = -30 - q * 230;
        const hc = i % 4 === 0 && rage ? SH.hot : gcol;
        ctx.globalAlpha = Math.sin(q * PI) * 0.9;
        glow(ctx, x, y, 8 + hash(i) * 4, hc, 0.8);
        ctx.fillStyle = A.c('#f0ffc8');
        ctx.beginPath();
        ctx.arc(x, y, 1.8 + hash(i + 1) * 1.2, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── 翅膀（在最後面）──
    const flap = Math.sin(t * flapSp) * flapAmp;
    const wingF = (side) => {
      const base = [[-1.95, 118], [-2.4, 128], [-2.8, 108], [-3.1, 80]];
      const open = [[-1.6, 182], [-2.1, 200], [-2.58, 176], [-3.0, 134]];
      return base.map((b, i) => {
        let a = lerp(b[0], open[i][0], spread) - flap * (1 + i * 0.25);
        let l = lerp(b[1], open[i][1], spread) * (1 + flap * 0.4);
        if (side > 0) {
          a = -PI - a + 0.3;
          l *= 0.7;
        }
        return [a, l];
      });
    };
    const wingSpots = (tips, rx, ry, a) => {
      if (dead) return;
      tips.forEach((tp, i) => {
        if (!i) return;
        const pv = tips[i - 1];
        const x = lerp(rx, (tp[0] + pv[0]) / 2, 0.55);
        const y = lerp(ry, (tp[1] + pv[1]) / 2, 0.55);
        glow(ctx, x, y, 12, gcol, 0.55 * a);
        ctx.fillStyle = A.c(U.mix(gcol, '#ffffff', 0.4));
        ctx.globalAlpha *= a;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, TAU);
        ctx.arc(lerp(rx, tp[0], 0.42), lerp(ry, tp[1], 0.42), 1.8, 0, TAU);
        ctx.fill();
        ctx.globalAlpha /= a;
      });
    };
    const wOpts = { tatter: true, boneW: 7, tailY: 44, vein: rage || roar || jump ? gcol : null, veinHeat: heat, glowCol: gcol, glowA: rage ? 0.4 : 0.12 };
    ctx.save();
    bodyT();
    const tF = batWing(ctx, 2, -128, wingF(1), rage ? SH.wingRS : SH.wingS, rage ? '#16030e' : '#170a24', SH.wboneS, '#2e2436', Object.assign({}, wOpts, { tailX: -12 }));
    wingSpots(tF, 2, -128, 0.6);
    const tN = batWing(ctx, -26, -122, wingF(-1), rage ? SH.wingR : SH.wing, rage ? SH.wingRS : SH.wingS, SH.wbone, SH.wboneS, wOpts);
    wingSpots(tN, -26, -122, 1);
    ctx.restore();

    // ── 腳：菌根一樣分岔抓地的腳 ──
    const leg = (hx, fx0, lift, back) => {
      const col = back ? fS : fC;
      const colS = back ? fD : fS;
      const hy = hipY + bob + crouch;
      const fy = -lift - tuck * 26;
      const fxx = fx0 - tuck * 6;
      const kx = (hx + fxx) / 2 + 16 + tuck * 14;
      const ky = (hy + fy) / 2 - 2 - tuck * 6;
      A.shape(ctx, (c) => taper(c, qb(hx, hy, hx + 10, (hy + ky) / 2, kx, ky), (s) => 40 - s * 12), col, colS, { cel: [4, 3], lw: 3 });
      A.shape(ctx, (c) => taper(c, qb(kx, ky, kx - 6, (ky + fy) / 2, fxx, fy - 10), (s) => 28 - s * 10), col, colS, { cel: [3, 2], lw: 3 });
      // 菌根腳趾
      const toes = [[-26, 6], [-8, 2], [14, 0], [32, 4]];
      toes.forEach(([dx, dy], i) => {
        const tx = fxx + dx * (1 - tuck * 0.4);
        const ty = fy + dy * (1 - tuck) - 1;
        const fn = qb(fxx + dx * 0.2, fy - 12, fxx + dx * 0.75, fy - 12 + tuck * 4, tx, ty);
        A.shape(ctx, (c) => taper(c, fn, (s) => 13 - s * 9, 12), i % 2 ? colS : col, colS, { lw: 2.6, shadeY: fy - 4 });
        const d = dx >= 0 ? 1 : -1;
        A.shape(ctx, (c) => {
          c.moveTo(tx - 2 * d, ty - 4);
          c.quadraticCurveTo(tx + 8 * d, ty - 5, tx + 11 * d, ty + 1);
          c.lineTo(tx, ty + 1);
          c.closePath();
        }, SH.claw, null, { lw: 1.8 });
      });
      A.ellipse(ctx, fxx, fy - 13, 15, 10, col, colS, { lw: 2.8, hl: false });
      hotLines(ctx, (c) => {
        c.moveTo(lerp(hx, kx, 0.2), lerp(hy, ky, 0.2));
        c.lineTo(lerp(hx, kx, 0.6) + 3, lerp(hy, ky, 0.6));
        c.lineTo(kx - 2, ky + 8);
        c.lineTo(lerp(kx, fxx, 0.6), lerp(ky, fy, 0.6));
      }, gcol, back ? heat * 0.4 : heat * 0.8, 1.8);
    };
    const lA = walk ? Math.max(0, Math.sin(gait)) * 10 : 0;
    const lB = walk ? Math.max(0, -Math.sin(gait)) * 10 : 0;
    const sA = walk ? Math.cos(gait) * 12 : 0;
    leg(-18, -34 - sA, lB, true);

    // ── 手臂：粗壯的菌柄手臂、骨刺、黑色長爪 ──
    const arm = (sx, sy, hx, hy, back) => {
      const col = back ? fS : fC;
      const colS = back ? fD : fS;
      const dx = hx - sx;
      const dy = hy - sy;
      const L = Math.hypot(dx, dy) || 1;
      const seg = 58;
      const off = Math.sqrt(Math.max(0, seg * seg - (L / 2) * (L / 2)));
      let nx = -dy / L;
      let ny = dx / L;
      if (nx * (back ? -0.6 : 0.6) + ny * 0.8 < 0) {
        nx = -nx;
        ny = -ny;
      }
      const ex = (sx + hx) / 2 + nx * off;
      const ey = (sy + hy) / 2 + ny * off;
      const ua = qb(sx, sy, (sx + ex) / 2 + nx * 3, (sy + ey) / 2 + ny * 3, ex, ey);
      const fa = qb(ex, ey, (ex + hx) / 2 + nx * 5, (ey + hy) / 2 + ny * 5, hx, hy);
      // 手肘往外的骨刺
      const sa = Math.atan2(ny, nx) - Math.atan2(dy, dx) * 0.0;
      A.shape(ctx, (c) => {
        c.moveTo(ex + Math.cos(sa + 1.4) * 9, ey + Math.sin(sa + 1.4) * 9);
        c.quadraticCurveTo(ex + Math.cos(sa) * 20, ey + Math.sin(sa) * 20, ex + Math.cos(sa - 0.5) * 30, ey + Math.sin(sa - 0.5) * 30);
        c.lineTo(ex + Math.cos(sa - 1.4) * 9, ey + Math.sin(sa - 1.4) * 9);
        c.closePath();
      }, SH.bone, SH.boneS, { lw: 2.2, shadeY: ey });
      A.shape(ctx, (c) => taper(c, ua, (s) => 36 - s * 10), col, colS, { cel: [4, 3], lw: 3 });
      A.shape(ctx, (c) => taper(c, fa, (s) => 32 - s * 12), col, colS, { cel: [3, 3], lw: 3 });
      // 前臂外側的一排小骨刺
      [0.25, 0.5, 0.72].forEach((s) => {
        const p = along(fa, s, 11);
        const q = along(fa, s, 20);
        const sd = along(fa, s + 0.1, 11);
        A.shape(ctx, (c) => {
          c.moveTo(p[0], p[1]);
          c.lineTo(q[0] + (sd[0] - p[0]) * 0.6, q[1] + (sd[1] - p[1]) * 0.6);
          c.lineTo(sd[0], sd[1]);
          c.closePath();
        }, SH.bone, null, { lw: 1.8 });
      });
      // 發光的菌絲裂紋
      hotLines(ctx, (c) => {
        const a = along(ua, 0.2, -3);
        const b = along(ua, 0.7, 4);
        const d = along(fa, 0.3, -4);
        const e = along(fa, 0.75, 2);
        c.moveTo(a[0], a[1]);
        c.lineTo(b[0], b[1]);
        c.moveTo(d[0], d[1]);
        c.lineTo(e[0], e[1]);
      }, gcol, back ? heat * 0.4 : heat * 0.85, 1.8);
      // 手掌＋長爪
      const ang = Math.atan2(hy - ey, hx - ex);
      shTalons(ctx, hx, hy, ang, back ? 36 : 44, 0.36, 0.75);
      A.shape(ctx, (c) => c.ellipse(hx, hy, 17, 14, ang, 0, TAU), col, colS, { lw: 2.8, shadeY: hy + 4 });
      if (!back && (roar || jump || firing)) glow(ctx, hx, hy, 36, gcol, 0.45 * heat);
    };
    ctx.save();
    bodyT();
    arm(-30, -114, B[0], B[1], true);

    // ── 菌柄身軀（佝僂、寬肩）──
    const torso = (c) => {
      c.moveTo(-30, -56);
      c.bezierCurveTo(-46, -78, -54, -108, -42, -130);
      c.quadraticCurveTo(-10, -150, 30, -144);
      c.quadraticCurveTo(64, -138, 60, -112);
      c.bezierCurveTo(56, -92, 44, -72, 34, -56);
      c.quadraticCurveTo(2, -48, -30, -56);
      c.closePath();
    };
    A.shape(ctx, torso, fC, fS, { cel: [9, 5], hl: [-26, -110, 6, 12], lw: 3.2 });
    ctx.save();
    ctx.beginPath();
    torso(ctx);
    ctx.clip();
    // 菌絲纖維
    ctx.strokeStyle = A.c(fS);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const x = -34 + i * 13;
      ctx.moveTo(x, -140);
      ctx.bezierCurveTo(x - 6, -116, x + 6, -88, x - 2, -52);
    }
    ctx.stroke();
    // 胸口肋骨狀的隆起
    ctx.strokeStyle = A.c(fD);
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const y = -112 + i * 13;
      ctx.moveTo(8, y + 2);
      ctx.quadraticCurveTo(32, y - 7, 58, y + 3);
    }
    ctx.stroke();
    // 胸口的魔核＋裂紋
    glow(ctx, 20, -96, 44, gcol, 0.35 * heat + 0.1);
    hotLines(ctx, (c) => {
      crack(c, -36, -60, -1.2, 44, 3, 11);
      crack(c, 20, -96, 1.9, 40, 3, 23);
      crack(c, 20, -96, -2.6, 38, 3, 37);
      crack(c, 20, -96, -0.5, 30, 2, 39);
      if (rage) {
        crack(c, 40, -64, -1.8, 44, 3, 41);
        crack(c, -26, -130, 1.2, 40, 3, 43);
      }
    }, gcol, heat, rage ? 3 : 2.4);
    ctx.fillStyle = A.c(U.mix(gcol, '#ffffff', 0.5));
    ctx.beginPath();
    ctx.arc(20, -96, 3.5 + heat * 1.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // 前腳
    leg(18, 34 + sA, lA, false);

    ctx.save();
    bodyT();
    // ── 破爛的菌環（腰上垂下的碎膜）──
    const sway = Math.sin(t * 2.4) * 2.5;
    const skirt = (c) => {
      c.moveTo(-40, -80);
      c.quadraticCurveTo(8, -90, 50, -78);
      const pts = [[46, -58], [38, -66], [30, -44], [20, -62], [8, -40], [-2, -60], [-14, -46], [-24, -64], [-34, -50], [-42, -68]];
      pts.forEach(([x, y], i) => c.lineTo(x + (i % 2 ? 0 : sway), y));
      c.closePath();
    };
    A.shape(ctx, skirt, fD, null, { lw: 2.6 });
    ctx.save();
    ctx.beginPath();
    skirt(ctx);
    ctx.clip();
    ctx.strokeStyle = rgba(gcol, dead ? 0.1 : 0.25 + 0.3 * heat);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const x = -36 + i * 10;
      ctx.moveTo(x, -82);
      ctx.lineTo(x + sway * 0.5 + (i - 4) * 1.2, -36);
    }
    ctx.stroke();
    ctx.restore();

    const armUp = roar || (charging && breath > 0.35);
    const frontArm = () => arm(36, -108, F[0], F[1], false);
    if (!armUp) frontArm();

    // ── 頭：菇傘＋面具＋角 ──
    ctx.save();
    ctx.translate(26, -136);
    ctx.rotate(headT);
    const hornHeat = rage ? 0.95 : roar ? 0.55 : 0.15;
    const hc = rage ? '#dcc8b0' : SH.bone;
    // 後面的角
    horn(ctx, cb(-48, -42, -98, -58, -116, -116, -88, -150), 24, U.mix(hc, '#6a5a70', 0.35), SH.boneS, SH.hornTip, hornHeat, gcol);
    // 傘下的菌褶（放射狀發光）
    const under = (c) => {
      c.moveTo(-100, 30);
      c.quadraticCurveTo(-10, 46, 100, 18);
      c.quadraticCurveTo(0, -6, -100, 30);
      c.closePath();
    };
    A.shape(ctx, under, SH.gill, null, { lw: 2.6 });
    ctx.save();
    ctx.beginPath();
    under(ctx);
    ctx.clip();
    ctx.strokeStyle = rgba(gcol, dead ? 0.15 : 0.3 + heat * 0.3);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const x = lerp(-100, 96, i / 16);
      ctx.moveTo(-4, 8);
      ctx.lineTo(x, 44);
    }
    ctx.stroke();
    ctx.restore();
    // 顎：先畫嘴裡，再畫會張開的下顎
    const ja = jaw * 0.6;
    const hingeX = -2;
    const hingeY = 30;
    const rot = (x, y) => [hingeX + x * Math.cos(ja) - y * Math.sin(ja), hingeY + x * Math.sin(ja) + y * Math.cos(ja)];
    const jt = rot(62, 8);
    const jm = rot(30, 14);
    A.shape(ctx, (c) => {
      c.moveTo(hingeX, hingeY - 2);
      c.lineTo(62, 30);
      c.lineTo(jt[0], jt[1]);
      c.quadraticCurveTo(jm[0], jm[1], hingeX, hingeY + 4);
      c.closePath();
    }, SH.maw, null, { lw: 2.4 });
    if (!dead) {
      const mg = 0.45 + jaw * 0.5 + (charging ? breath * 0.5 : 0) + (firing ? 0.5 : 0);
      glow(ctx, lerp(28, jm[0], 0.5), lerp(32, jm[1], 0.5), 18 + jaw * 22, gcol, mg);
      // 黏絲
      if (jaw > 0.3) {
        ctx.strokeStyle = rgba(U.mix(gcol, '#ffffff', 0.3), 0.8);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        [0.3, 0.55, 0.8].forEach((s, i) => {
          const a = [lerp(hingeX, 60, s), 31];
          const b = rot(60 * s, 8);
          ctx.moveTo(a[0], a[1]);
          ctx.quadraticCurveTo((a[0] + b[0]) / 2 + Math.sin(t * 3 + i) * 2, (a[1] + b[1]) / 2 + 5, b[0], b[1]);
        });
        ctx.stroke();
      }
    }
    const mk = rage ? SH.maskR : SH.mask;
    const mkS = rage ? SH.maskRS : SH.maskS;
    ctx.save();
    ctx.translate(hingeX, hingeY);
    ctx.rotate(ja);
    A.shape(ctx, (c) => {
      c.moveTo(-4, -4);
      c.lineTo(64, -3);
      c.quadraticCurveTo(70, 5, 62, 13);
      c.quadraticCurveTo(30, 22, 0, 14);
      c.closePath();
    }, mk, mkS, { lw: 2.8, shadeY: 6 });
    ctx.fillStyle = A.c(SH.tooth);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const x = 8 + i * 9.5;
      const h = i === 5 ? 13 : 6 + (i % 2) * 3;
      ctx.beginPath();
      ctx.moveTo(x - 3, -3);
      ctx.lineTo(x + 0.5, -3 - h);
      ctx.lineTo(x + 3.5, -3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    // 骨質面具（上半臉）：顴骨、深眼窩、鼻孔
    const face = (c) => {
      c.moveTo(-12, -4);
      c.quadraticCurveTo(28, -10, 60, 0);
      c.quadraticCurveTo(74, 12, 66, 28);
      c.lineTo(58, 32);
      c.lineTo(2, 32);
      c.quadraticCurveTo(-14, 26, -16, 12);
      c.quadraticCurveTo(-18, 2, -12, -4);
      c.closePath();
    };
    A.shape(ctx, face, mk, mkS, { cel: [5, 4], lw: 3 });
    ctx.save();
    ctx.beginPath();
    face(ctx);
    ctx.clip();
    // 傘簷投下的陰影
    const sg = ctx.createLinearGradient(0, -6, 0, 14);
    sg.addColorStop(0, rgba('#12051a', 0.75));
    sg.addColorStop(1, rgba('#12051a', 0));
    ctx.fillStyle = sg;
    ctx.fillRect(-30, -10, 110, 24);
    // 顴骨的刻線
    ctx.strokeStyle = A.c(mkS);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-6, 22);
    ctx.quadraticCurveTo(14, 28, 30, 22);
    ctx.moveTo(40, 24);
    ctx.quadraticCurveTo(52, 26, 60, 20);
    ctx.stroke();
    hotLines(ctx, (c) => {
      crack(c, -12, 20, -0.5, 20, 2, 51);
      if (rage) crack(c, 64, 6, 2.4, 18, 2, 53);
    }, gcol, heat * 0.8, 1.8);
    ctx.restore();
    // 上排獠牙
    ctx.fillStyle = A.c(SH.tooth);
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const x = 2 + i * 9;
      const h = i === 5 ? 16 : i === 1 ? 12 : 7 + (i % 2) * 3;
      ctx.beginPath();
      ctx.moveTo(x - 3.5, 31);
      ctx.lineTo(x, 31 + h);
      ctx.lineTo(x + 3.5, 31);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // 鼻孔
    ctx.fillStyle = A.c('#1a0a14');
    ctx.beginPath();
    ctx.ellipse(64, 16, 2, 4.4, 0.5, 0, TAU);
    ctx.ellipse(57, 18, 1.8, 3.6, 0.5, 0, TAU);
    ctx.fill();
    // 眼窩＋發光的眼
    ctx.fillStyle = A.c('#14060f');
    ctx.beginPath();
    ctx.moveTo(1, 2);
    ctx.lineTo(31, 12);
    ctx.quadraticCurveTo(24, 22, 8, 18);
    ctx.quadraticCurveTo(0, 12, 1, 2);
    ctx.moveTo(56, 3);
    ctx.lineTo(36, 12);
    ctx.quadraticCurveTo(44, 21, 54, 17);
    ctx.quadraticCurveTo(60, 11, 56, 3);
    ctx.fill();
    // 往中間壓低的眉骨（兇狠）
    A.shape(ctx, (c) => {
      c.moveTo(-6, -4);
      c.lineTo(32, 8);
      c.lineTo(60, -2);
      c.lineTo(60, 4);
      c.lineTo(32, 13);
      c.lineTo(-4, 3);
      c.closePath();
    }, mkS, null, { lw: 2.2 });
    if (dead) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      [[16, 10], [46, 11]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 4);
        ctx.lineTo(x + 6, y + 4);
        ctx.moveTo(x + 6, y - 4);
        ctx.lineTo(x - 6, y + 4);
        ctx.stroke();
      });
    } else {
      const eg = 0.85 + Math.sin(t * 5) * 0.15 + (rage ? 0.45 : 0) + (charging ? breath * 0.3 : 0);
      const eh = hurt ? 2.2 : 6;
      const blade = (x, y, w, h) => {
        glow(ctx, x, y, w * 2.6, gcol, 0.6 * eg);
        A.shape(ctx, (c) => {
          c.moveTo(x - w, y - h);
          c.quadraticCurveTo(x + w * 0.1, y - h * 0.2, x + w, y + h * 0.35);
          c.quadraticCurveTo(x, y + h * 0.9, x - w * 0.8, y + h * 0.1);
          c.closePath();
        }, gcol, null, { lw: 2 });
        ctx.fillStyle = A.c(U.mix(gcol, '#ffffff', 0.75));
        ctx.beginPath();
        ctx.moveTo(x - w * 0.6, y - h * 0.35);
        ctx.quadraticCurveTo(x + w * 0.1, y, x + w * 0.6, y + h * 0.3);
        ctx.quadraticCurveTo(x, y + h * 0.3, x - w * 0.6, y - h * 0.35);
        ctx.fill();
        if (!hurt) {
          ctx.fillStyle = A.c('#0a1a04');
          ctx.beginPath();
          ctx.ellipse(x + w * 0.15, y + h * 0.1, 1.4, h * 0.6, 0.2, 0, TAU);
          ctx.fill();
        }
      };
      blade(16, 12, 12, eh);
      blade(47, 12, 8, eh * 0.85);
      if (rage) {
        // 暴走：額頭上睜開第三隻眼（直立的紅紫裂眼）
        glow(ctx, 32, -1, 16, SH.hot, 0.8);
        A.shape(ctx, (c) => {
          c.moveTo(32, -10);
          c.quadraticCurveTo(38, -1, 32, 8);
          c.quadraticCurveTo(26, -1, 32, -10);
          c.closePath();
        }, SH.hot, null, { lw: 2 });
        ctx.fillStyle = A.c('#1a0010');
        ctx.beginPath();
        ctx.ellipse(32, -1, 1.3, 5.5, 0, 0, TAU);
        ctx.fill();
      }
    }

    // ── 菇傘：壓低的鋸齒斗篷 ──
    const capPath = (c) => {
      c.moveTo(-104, 32);
      c.quadraticCurveTo(-104, -2, -86, -30);
      c.bezierCurveTo(-66, -62, -46, -78, -38, -96);
      c.quadraticCurveTo(-36, -112, -52, -128);
      c.quadraticCurveTo(-16, -114, -4, -84);
      c.quadraticCurveTo(28, -80, 50, -66);
      c.bezierCurveTo(74, -48, 88, -26, 90, -8);
      c.quadraticCurveTo(94, 6, 102, 16);
      // 鋸齒傘緣（臉的上方短、後面長長垂下）
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const x = lerp(88, -96, i / n);
        const back = x < -14;
        const d = i % 2 ? (back ? 9 + hash(i * 7) * 10 : 3 + hash(i * 7) * 3) : 0;
        if (back && i % 2 && i > 7) {
          // 後面垂下的破爛長條（像斗篷）
          const L = 36 + hash(i + 3) * 30;
          const sw = Math.sin(t * 2.2 + i) * 4;
          const y0 = 2 + (-14 - x) * 0.22;
          c.lineTo(x + 5, y0 + 2);
          c.quadraticCurveTo(x + 4 + sw * 0.5, y0 + L * 0.6, x + sw - 2, y0 + L);
          c.quadraticCurveTo(x - 4 + sw * 0.5, y0 + L * 0.5, x - 6, y0 + 2);
          continue;
        }
        c.lineTo(x, (back ? 2 + (-14 - x) * 0.22 : -6 + Math.max(0, x - 70) * 0.4) + d);
      }
      c.closePath();
    };
    A.shape(ctx, capPath, capC, capS, { cel: [9, 9], lw: 3.4 });
    ctx.save();
    ctx.beginPath();
    capPath(ctx);
    ctx.clip();
    // 傘面的皺褶
    ctx.strokeStyle = A.c(capS);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 1; i <= 2; i++) {
      ctx.moveTo(-98 + i * 12, 16 - i * 6);
      ctx.bezierCurveTo(-66 + i * 8, -52 + i * 14, 50 - i * 8, -58 + i * 14, 86 - i * 8, -2 - i * 6);
    }
    ctx.stroke();
    // 暴走：傘頂裂開，露出發光的核心
    if (rage) {
      const fis = (c) => {
        c.moveTo(-66, -34);
        c.lineTo(-44, -48);
        c.lineTo(-32, -40);
        c.lineTo(-12, -62);
        c.lineTo(4, -52);
        c.lineTo(22, -66);
        c.lineTo(36, -48);
        c.lineTo(58, -42);
        c.lineTo(38, -38);
        c.lineTo(22, -50);
        c.lineTo(6, -38);
        c.lineTo(-12, -46);
        c.lineTo(-30, -28);
        c.lineTo(-44, -36);
        c.closePath();
      };
      glow(ctx, -4, -48, 50, gcol, 0.25 * heat);
      A.shape(ctx, fis, U.mix(gcol, '#ffffff', 0.25), null, { lw: 3 });
      ctx.fillStyle = A.c(SH.hot);
      ctx.globalAlpha *= 0.6 + Math.sin(t * 6) * 0.2;
      ctx.beginPath();
      ctx.ellipse(-4, -48, 30, 4, -0.1, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    hotLines(ctx, (c) => {
      crack(c, -8, -78, 2.0, 64, 4, 1);
      crack(c, 20, -78, 1.0, 64, 4, 5);
      crack(c, -52, -56, 2.2, 48, 3, 9);
      crack(c, 58, -44, 1.3, 42, 3, 13);
      if (rage) {
        crack(c, -86, -12, 0.5, 34, 3, 17);
        crack(c, 80, -10, 2.5, 30, 3, 19);
      }
    }, gcol, heat, rage ? 3 : 2.4);
    // 左上的冷光高光
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(-52, -48, 24, 7, -0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 傘緣滴下的發光汁液
    if (!dead) {
      [[-84, 24], [-46, 14], [50, -4]].forEach(([x, y], i) => {
        const q = (t * 0.7 + i * 0.37) % 1;
        const L = 4 + q * 14;
        ctx.fillStyle = A.c(gcol);
        ctx.globalAlpha = 1 - q * 0.6;
        ctx.beginPath();
        ctx.moveTo(x - 2, y);
        ctx.quadraticCurveTo(x - 2.5, y + L, x, y + L + 3);
        ctx.quadraticCurveTo(x + 2.5, y + L, x + 2, y);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
    // 傘脊的骨刺（暴走時冒綠色鬼火）
    [[-90, -22, -2.5, 14], [-72, -48, -2.2, 18], [-8, -82, -1.55, 18], [18, -80, -1.35, 20], [44, -68, -1.2, 20], [72, -42, -0.9, 16]].forEach(([x, y, a, L], i) => {
      A.shape(ctx, (c) => {
        c.moveTo(x + Math.cos(a + 1.57) * 7, y + Math.sin(a + 1.57) * 7);
        c.quadraticCurveTo(x + Math.cos(a) * L * 0.6 + Math.cos(a + 1.57) * 2, y + Math.sin(a) * L * 0.6 + Math.sin(a + 1.57) * 2, x + Math.cos(a - 0.15) * L, y + Math.sin(a - 0.15) * L);
        c.lineTo(x - Math.cos(a + 1.57) * 7, y - Math.sin(a + 1.57) * 7);
        c.closePath();
      }, SH.bone, SH.boneS, { lw: 2.4, shadeY: y });
      if (rage && !dead) flame(ctx, x + Math.cos(a) * L * 0.9, y + Math.sin(a) * L * 0.9 + 4, 6, 22 + (i % 2) * 8, t, i + 3, '#a8ff3a', '#f4ffc0', 1.8);
    });
    // 傘上的發光膿包
    [[-58, -26, 9], [18, -46, 7], [62, -16, 6], [-24, -40, 5]].forEach(([x, y, r], i) => {
      const pr = r * (1 + (rage ? 0.25 : 0) + Math.sin(t * 3.5 + i * 2) * 0.1);
      glow(ctx, x, y, pr * 2.6, gcol, dead ? 0 : 0.35 + heat * 0.25);
      A.ellipse(ctx, x, y, pr, pr * 0.85, U.mix(gcol, '#2a5a10', 0.3), U.mix(gcol, '#12300a', 0.6), { lw: 2.2, hl: [x - pr * 0.3, y - pr * 0.35, pr * 0.3, pr * 0.2] });
    });
    // 前面的角
    horn(ctx, cb(34, -50, 82, -70, 98, -124, 72, -156), 26, hc, SH.boneS, SH.hornTip, hornHeat, gcol);

    // ── 孢子吐息 ──
    if (charging && !dead) {
      const k = breath;
      glow(ctx, 62, 36, 26 + k * 34, gcol, 0.5 + k * 0.45);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + t * 3;
        const r = 70 * (1 - ((t * 1.5 + i / 12) % 1));
        ctx.fillStyle = A.c(i % 3 ? '#d8ffa0' : '#c890ff');
        ctx.beginPath();
        ctx.arc(62 + Math.cos(a) * r, 36 + Math.sin(a) * r, 2.6, 0, TAU);
        ctx.fill();
      }
    }
    if (firing && !dead) {
      ctx.save();
      ctx.translate(62, 38);
      ctx.rotate(0.12 - headT - lean);
      const len = 250;
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, rgba(U.mix(gcol, '#ffffff', 0.3), 0.95));
      g.addColorStop(0.35, rgba(gcol, 0.7));
      g.addColorStop(0.75, rgba('#7a4ab0', 0.4));
      g.addColorStop(1, rgba('#3a1a5a', 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(len * 0.45, -len * 0.26, len, -len * 0.34);
      ctx.quadraticCurveTo(len * 1.1, 0, len, len * 0.3);
      ctx.quadraticCurveTo(len * 0.45, len * 0.24, 0, 10);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 20; i++) {
        const q = (t * 1.6 + hash(i)) % 1;
        const a = (hash(i + 7) - 0.5) * 0.6;
        const x = q * len;
        const y = Math.tan(a) * x + Math.sin(t * 6 + i) * 4;
        const r = 5 + q * 16;
        ctx.globalAlpha = (1 - q) * 0.85;
        ctx.fillStyle = A.c(i % 3 ? '#8ad05a' : '#9a6ac0');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = A.c('#f0ffc0');
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.22, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.restore();

    // 舉起的前手臂（畫在傘前面）
    if (armUp) frontArm();
    ctx.restore();

    // ── 召喚：兩側地上的法陣裡冒出小菇 ──
    if (summon) {
      const k = sumK || 0.5;
      [-104, 112].forEach((x, i) => {
        ctx.save();
        ctx.translate(x, -2);
        warnRing(ctx, 36, k, gcol, t);
        const cg = ctx.createLinearGradient(0, -140, 0, 0);
        cg.addColorStop(0, rgba(gcol, 0));
        cg.addColorStop(1, rgba(gcol, 0.45 * k));
        ctx.fillStyle = cg;
        ctx.fillRect(-26, -140, 52, 140);
        shSprout(ctx, 0, clamp(k * 1.4 - 0.3, 0, 1), t, i, gcol);
        ctx.restore();
      });
      // 高舉的爪間凝聚的孢子球
      ctx.save();
      bodyT();
      const r = 10 + k * 12;
      glow(ctx, 12, -210, r * 3, gcol, 0.8);
      A.ellipse(ctx, 12, -210, r, r, U.mix(gcol, '#ffffff', 0.35), gcol, { lw: 2.4 });
      ctx.restore();
    }
    // 落地：震起的菌塵
    if (landed && !dead) {
      for (let i = 0; i < 6; i++) {
        const q = (t * 1.3 + i / 6) % 1;
        ctx.globalAlpha = (1 - q) * 0.6;
        ctx.fillStyle = A.c(i % 2 ? '#6a4a8a' : '#8ad05a');
        ctx.beginPath();
        ctx.arc((i - 2.5) * 34 * (0.6 + q), -6 - q * 20, 8 + q * 12, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
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
    const wf = (s) => w0 * (1 - s * 0.86);
    if (o.glowTip) {
      const p = fn(0.92);
      glow(ctx, p[0], p[1], w0 * 1.8, o.glowTip, o.glowA || 0.6);
    }
    A.shape(ctx, (c) => taper(c, fn, wf, 22), col, colS, { cel: [w0 * 0.12, w0 * 0.12], lw: 3 });
    // 吸盤（下緣）
    const side = o.side || 1;
    for (let i = 1; i <= 7; i++) {
      const s = 0.1 + i * 0.11;
      if (s > 0.92) break;
      const p = along(fn, s, side * wf(s) * 0.34);
      const r = wf(s) * 0.22;
      A.shape(ctx, (c) => c.ellipse(p[0], p[1], r, r * 0.8, p[2], 0, TAU), KR.sucker, null, { lw: 1.6 });
      ctx.fillStyle = A.c(KR.suckerS);
      ctx.beginPath();
      ctx.arc(p[0], p[1], r * 0.4, 0, TAU);
      ctx.fill();
    }
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
    const mx = -52;
    limb(ctx, (c) => {
      c.moveTo(mx, -90);
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
    ctx.restore();
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
    tentacle(ctx, gtent(-50, -1, 80, 0, 28), 28, skinS, KR.skinRS, { side: 1 });
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
    // 舷窗（發幽光）
    [[-6, -70], [62, -74]].forEach(([x, y], i) => {
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
    tentacle(ctx, gtent(56, 1, 72, 3, 26), 26, skin, skinS, { side: -1 });
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
    ctx.restore();
  }

  // ═════════════════════════ 赤焰炎魔 fb_balrog（230×260） ═════════════════════════
  // 巴洛古風的熔岩牛魔：牛頭、巨大彎角、熔岩岩石皮膚與發光裂縫、燃燒的蝙蝠翅膀、斷掉的鐐銬、手持火焰長鞭。
  const BR = {
    skin: '#4c3430', skinS: '#2e1e1c', skinR: '#3a1e1a', skinRS: '#220e0c', muzzle: '#6e4c42', muzzleS: '#4e342c',
    horn: '#ecdcb8', hornS: '#b89c74', hornTip: '#2a1a16', hoof: '#1e1414',
    wing: '#6a1e18', wingS: '#44100c', wingR: '#8a1e10', wingRS: '#5a0e06', bone: '#3e2a26', boneS: '#261a18',
    lava: '#ff7a1e', lavaR: '#ffd23a', eye: '#ffd23a', eyeR: '#fff6c8', cloth: '#3a1c1c', clothS: '#241010',
    iron: '#6a6060', ironS: '#443c3c', gold: '#e0a84a', goldS: '#a8742a', whip: '#3a1a12',
  };
  function fb_balrog(ctx, m) {
    const S = atk(m);
    const { fx, ph, t, rage, dead, kind } = S;
    const K = (m.h || 260) / 260;
    // 火鞭：預警時 fx.whip = 0（m.fbLast = 'whip'、attackPhase = 'wind'），出手後 0→1 是鞭子甩出去的長度
    const whipMove = kind === 'whip' || amt(fx.whip) > 0;
    const whipStrike = whipMove && (ph === 'strike' || (!ph && amt(fx.whip) >= 0.999));
    const whipWind = whipMove && !whipStrike;
    const whipV = whipStrike ? Math.max(0.15, amt(fx.whip)) : whipWind ? (ph ? 0.6 + 0.4 * Math.abs(Math.sin(t * 2.5)) : amt(fx.whip)) : 0;
    const fly = !!fx.fly;
    const dive = fly && (ph === 'strike' || !!fx.dive);
    const meteor = !dead && !whipMove && !fly && (/meteor|rain/.test(kind) || !!fx.meteor || (!kind && (ph === 'wind' || ph === 'strike')));
    const walk = S.walk && !ph && !fly;
    const hurt = S.hurt;
    const skin = rage ? BR.skinR : BR.skin;
    const skinS = rage ? BR.skinRS : BR.skinS;
    const lava = rage ? BR.lavaR : BR.lava;
    const heat = dead ? 0 : clamp(0.6 + Math.sin(t * 3.2) * 0.15 + (rage ? 0.5 : 0) + (whipV * 0.3) + (meteor ? 0.4 : 0), 0, 1.4);

    // ── 姿勢 ──
    const gait = t * 4.5;
    const bob = dead ? 10 : walk ? -Math.abs(Math.sin(gait)) * 4 : Math.sin(t * 2) * 2.5;
    let lean = walk ? 0.03 : 0;
    let mouth = rage ? 0.35 : 0.15;
    let headTilt = 0;
    let spread = rage ? 0.95 : 0.55;
    let flapSp = 2.2;
    let flapAmp = 0.06;
    let legBend = 0;
    if (whipWind) {
      lean = -0.1 * whipV;
      mouth = 0.4 + 0.4 * whipV;
      headTilt = -0.1 * whipV;
      spread = Math.max(spread, 0.8);
    }
    if (whipStrike) {
      lean = 0.12;
      mouth = 0.8;
      headTilt = 0.08;
      spread = 1;
    }
    if (meteor) {
      lean = -0.08;
      mouth = 1;
      headTilt = -0.28;
      spread = 1;
      flapSp = 8;
      flapAmp = 0.1;
    }
    if (fly) {
      lean = 0.14;
      spread = 1;
      flapSp = 11;
      flapAmp = 0.32;
      legBend = 1;
      mouth = 0.45;
    }
    if (dive) {
      lean = 0.42;
      spread = 0.35;
      flapAmp = 0.05;
      mouth = 1;
      headTilt = 0.15;
    }
    if (hurt && !ph) {
      lean -= 0.05;
      mouth = Math.max(mouth, 0.6);
      headTilt -= 0.08;
    }
    if (dead) {
      lean = -0.15;
      mouth = 0.5;
      headTilt = 0.2;
      spread = 0.15;
      flapAmp = 0;
    }
    const shake = (whipWind && whipV > 0.6) || (meteor && ph === 'wind') ? Math.sin(t * 55) * 1.6 : 0;

    ctx.save();
    ctx.scale(K, K);
    ctx.translate(shake, 0);
    // 熱氣光暈
    if (!dead) {
      glow(ctx, 0, -150, 210 + (rage ? 50 : 0), '#ff5a1e', (rage ? 0.38 : 0.2) + Math.sin(t * 4) * 0.04);
      // 火星
      for (let i = 0; i < (rage ? 14 : 7); i++) {
        const q = (t * 0.6 + hash(i + 40)) % 1;
        const x = (hash(i + 41) - 0.5) * 260 + Math.sin(t * 3 + i) * 10;
        const y = -20 - q * 300;
        ctx.globalAlpha = Math.sin(q * PI);
        ctx.fillStyle = A.c(i % 2 ? '#ffd23a' : '#ff7a1e');
        ctx.beginPath();
        ctx.arc(x, y, 2 + hash(i) * 2, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    const hipY = -104;
    // 上半身的變換（繞著腰轉）
    const upper = () => {
      ctx.translate(0, bob);
      ctx.translate(0, hipY);
      ctx.rotate(lean);
      ctx.translate(0, -hipY);
    };

    // ── 翅膀 ──
    const flap = Math.sin(t * flapSp) * flapAmp;
    const wingF = (side) => {
      const base = [[-1.75, 132], [-2.2, 146], [-2.62, 126], [-2.95, 96]];
      const open = [[-1.85, 176], [-2.35, 192], [-2.8, 166], [-3.2, 122]];
      const swept = dive ? 0.55 : 0;
      return base.map((b, i) => {
        let a = lerp(b[0], open[i][0], spread) - flap * (1 + i * 0.2) - swept * (1 + i * 0.15);
        let l = lerp(b[1], open[i][1], spread) * (1 + flap * 0.3);
        if (side > 0) {
          a = -PI - a + (dive ? -0.9 : 0);
          l *= 0.82;
        }
        return [a, l];
      });
    };
    const wingFlames = (tips, big) => {
      tips.forEach((tp, i) => {
        flame(ctx, tp[0], tp[1] + 6, big ? 11 : 8, big ? 38 : 26, t, i + 1, '#ff7a1e', '#ffe27a', 2);
      });
    };
    const wOpts = { tatter: rage, boneW: 9, tailY: 60, vein: lava, veinHeat: heat, glowCol: '#ff7a1e', glowA: rage ? 0.55 : 0.3 };
    ctx.save();
    upper();
    const tF = batWing(ctx, 22, -184, wingF(1), rage ? BR.wingRS : BR.wingS, rage ? '#3a0804' : '#2e0a08', BR.boneS, '#1a100e', Object.assign({}, wOpts, { tailX: 10 }));
    if (!dead) wingFlames(tF, rage);
    const tN = batWing(ctx, -42, -180, wingF(-1), rage ? BR.wingR : BR.wing, rage ? BR.wingRS : BR.wingS, BR.bone, BR.boneS, wOpts);
    if (!dead) wingFlames(tN, rage);
    ctx.restore();

    // ── 腳（反關節的山羊腳＋偶蹄）──
    const leg = (hx, footX, lift, back) => {
      const col = back ? skinS : skin;
      const colS = back ? BR.skinRS : skinS;
      const fy = -lift;
      const kx = hx + 20 + legBend * 16;
      const ky = hipY + 44 + bob * 0.5 - legBend * 6;
      const hx2 = footX - 18 - legBend * 20;
      const hy2 = fy - 30 + legBend * 6;
      A.shape(ctx, (c) => taper(c, qb(hx, hipY + bob, hx + 22, hipY + 18, kx, ky), (s) => 46 - s * 16), col, colS, { cel: [5, 3], lw: 3 });
      A.shape(ctx, (c) => taper(c, qb(kx, ky, kx - 8, (ky + hy2) / 2, hx2, hy2), (s) => 30 - s * 12), col, colS, { cel: [4, 2], lw: 3 });
      A.shape(ctx, (c) => taper(c, qb(hx2, hy2, hx2 + 6, fy - 12, footX, fy - 8), (s) => 18 - s * 4), col, colS, { cel: [3, 2], lw: 3 });
      // 偶蹄
      A.shape(ctx, (c) => {
        c.moveTo(footX - 13, fy - 12);
        c.lineTo(footX + 12, fy - 12);
        c.lineTo(footX + 18, fy);
        c.lineTo(footX + 3, fy);
        c.lineTo(footX + 1, fy - 6);
        c.lineTo(footX - 1, fy);
        c.lineTo(footX - 15, fy);
        c.closePath();
      }, BR.hoof, null, { lw: 2.4 });
      // 腳上的熔岩裂縫
      hotLines(ctx, (c) => {
        c.moveTo(hx + 4, hipY + 16 + bob);
        c.lineTo(hx + 12, hipY + 28);
        c.lineTo(kx - 2, ky - 4);
        c.moveTo(kx - 4, ky + 10);
        c.lineTo(kx - 8, ky + 22);
        c.lineTo(hx2 + 2, hy2 - 6);
      }, lava, back ? heat * 0.5 : heat, 2);
    };
    const lA = walk ? Math.max(0, Math.sin(gait)) * 12 : 0;
    const lB = walk ? Math.max(0, -Math.sin(gait)) * 12 : 0;
    const sA = walk ? Math.cos(gait) * 14 : 0;
    const flyLift = legBend * 10;
    leg(-26, -30 - sA - legBend * 20, lB + flyLift, true);

    ctx.save();
    upper();
    // ── 手臂 ──
    const arm = (sx, sy, ex, ey, hx, hy, back, shackle) => {
      const col = back ? skinS : skin;
      const colS = back ? BR.skinRS : skinS;
      A.shape(ctx, (c) => taper(c, qb(sx, sy, (sx + ex) / 2 + (back ? -6 : 6), (sy + ey) / 2, ex, ey), (s) => 46 - s * 10), col, colS, { cel: [5, 4], lw: 3 });
      A.shape(ctx, (c) => taper(c, qb(ex, ey, (ex + hx) / 2, (ey + hy) / 2, hx, hy), (s) => 38 - s * 8), col, colS, { cel: [4, 3], lw: 3 });
      hotLines(ctx, (c) => {
        c.moveTo(lerp(sx, ex, 0.2), lerp(sy, ey, 0.2));
        c.lineTo(lerp(sx, ex, 0.55) + 4, lerp(sy, ey, 0.55));
        c.lineTo(lerp(sx, ex, 0.8), lerp(sy, ey, 0.8) + 3);
      }, lava, back ? heat * 0.5 : heat, 2.2);
      // 護腕（鐵環＋尖刺）或斷掉的鐐銬
      const bx = lerp(ex, hx, 0.62);
      const by = lerp(ey, hy, 0.62);
      const ang = Math.atan2(hy - ey, hx - ex);
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang);
      A.shape(ctx, (c) => A.roundRect(c, -12, -19, 24, 38, 5), BR.iron, BR.ironS, { lw: 2.6, cel: [0, 4] });
      A.shape(ctx, (c) => {
        c.moveTo(-6, -18);
        c.lineTo(0, -32);
        c.lineTo(6, -18);
        c.closePath();
        c.moveTo(-6, 18);
        c.lineTo(0, 32);
        c.lineTo(6, 18);
        c.closePath();
      }, '#8a8080', null, { lw: 2 });
      ctx.restore();
      if (shackle) chain(ctx, bx, by + 14, bx - 20, by + 70, 8, 5, BR.iron, BR.ironS);
      // 拳頭＋黑爪
      A.ellipse(ctx, hx, hy, 17, 15, col, colS, { lw: 3, hl: false });
      for (let i = -1; i <= 1; i++) {
        const a = ang + i * 0.5;
        const px = hx + Math.cos(a) * 12;
        const py = hy + Math.sin(a) * 12;
        A.shape(ctx, (c) => taper(c, qb(px, py, px + Math.cos(a) * 10 + Math.cos(a + 1.5) * 4, py + Math.sin(a) * 10 + Math.sin(a + 1.5) * 4, px + Math.cos(a + 0.5) * 16, py + Math.sin(a + 0.5) * 16), (s) => 8 * (1 - s)), '#1a1010', null, { lw: 1.8 });
      }
    };
    // 手的位置
    let bH = [-90, -110];
    let bE = [-94, -146];
    let fH = [96, -112];
    let fE = [92, -148];
    if (whipWind) {
      const k = whipV;
      fH = [lerp(96, -26, k), lerp(-112, -268, k)];
      fE = [lerp(92, 44, k), lerp(-148, -244, k)];
      bH = [lerp(-90, -70, k), lerp(-110, -130, k)];
    }
    if (whipStrike) {
      fH = [156, -150];
      fE = [108, -170];
      bH = [-100, -150];
      bE = [-98, -170];
    }
    if (meteor) {
      fH = [112, -272];
      fE = [108, -214];
      bH = [-78, -284];
      bE = [-104, -226];
    }
    if (fly && !dive) {
      fH = [104, -130];
      bH = [-96, -126];
    }
    if (dive) {
      fH = [130, -120];
      fE = [104, -150];
      bH = [-60, -120];
    }
    arm(-56, -176, bE[0], bE[1], bH[0], bH[1], true, true);

    // ── 軀幹 ──
    const torso = (c) => {
      c.moveTo(-36, -98);
      c.bezierCurveTo(-54, -128, -82, -158, -72, -186);
      c.quadraticCurveTo(-24, -210, 26, -204);
      c.quadraticCurveTo(78, -200, 72, -178);
      c.bezierCurveTo(66, -150, 50, -126, 38, -98);
      c.quadraticCurveTo(0, -90, -36, -98);
      c.closePath();
    };
    A.shape(ctx, torso, skin, skinS, { cel: [12, 6], hl: [-40, -176, 12, 7], lw: 3.4 });
    ctx.save();
    ctx.beginPath();
    torso(ctx);
    ctx.clip();
    // 胸肌與腹肌的刻線
    ctx.strokeStyle = A.c(skinS);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-40, -170);
    ctx.quadraticCurveTo(-10, -146, 8, -168);
    ctx.quadraticCurveTo(30, -146, 58, -168);
    ctx.moveTo(8, -164);
    ctx.lineTo(8, -104);
    ctx.moveTo(-14, -136);
    ctx.lineTo(30, -136);
    ctx.moveTo(-10, -120);
    ctx.lineTo(28, -120);
    ctx.stroke();
    // 熔岩裂縫（胸口是熔核）
    glow(ctx, 8, -158, 44, lava, 0.5 * heat);
    hotLines(ctx, (c) => {
      crack(c, 8, -160, -2.4, 50, 3, 61);
      crack(c, 8, -160, -0.6, 50, 3, 63);
      crack(c, 8, -158, 1.7, 44, 3, 67);
      crack(c, -50, -120, -0.9, 40, 3, 69);
      if (rage) {
        crack(c, 52, -118, -2.2, 40, 3, 71);
        crack(c, -30, -190, 0.6, 40, 3, 73);
      }
    }, lava, heat, rage ? 3.6 : 2.8);
    ctx.fillStyle = A.c(U.mix(lava, '#ffffff', 0.5));
    ctx.beginPath();
    ctx.arc(8, -160, 5 + heat * 2, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 肩上的岩石骨刺
    [[-66, -186, -2.3], [-52, -198, -2.0], [62, -194, -1.1], [72, -182, -0.8]].forEach(([x, y, a], i) => {
      const L = 26 + (i % 2) * 8;
      A.shape(ctx, (c) => {
        c.moveTo(x + Math.cos(a + 1.57) * 8, y + Math.sin(a + 1.57) * 8);
        c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
        c.lineTo(x - Math.cos(a + 1.57) * 8, y - Math.sin(a + 1.57) * 8);
        c.closePath();
      }, '#3a2a26', '#221614', { lw: 2.4, shadeY: y });
      if (rage) flame(ctx, x + Math.cos(a) * L * 0.4, y + Math.sin(a) * L * 0.4, 9, 30, t, i + 7, '#ff7a1e', '#ffe27a', 2);
    });
    // 腰帶＋骷髏扣＋破爛腰布
    A.shape(ctx, (c) => {
      c.moveTo(-40, -108);
      c.lineTo(40, -108);
      c.lineTo(46, -52 + Math.sin(t * 3) * 2);
      c.lineTo(30, -62);
      c.lineTo(20, -44);
      c.lineTo(6, -60);
      c.lineTo(-8, -40);
      c.lineTo(-20, -58);
      c.lineTo(-34, -46);
      c.lineTo(-44, -62);
      c.closePath();
    }, BR.cloth, BR.clothS, { lw: 3, shadeY: -80 });
    A.shape(ctx, (c) => A.roundRect(c, -44, -112, 90, 14, 4), '#3a2620', '#26160f', { lw: 2.6, shadeY: -104 });
    A.shape(ctx, (c) => {
      c.ellipse(8, -106, 11, 10, 0, 0, TAU);
    }, BR.horn, BR.hornS, { lw: 2.4, shadeY: -102 });
    ctx.fillStyle = A.c('#2a1410');
    ctx.beginPath();
    ctx.arc(4, -107, 2.6, 0, TAU);
    ctx.arc(12, -107, 2.6, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 前腳（在身體前）
    leg(22, 34 + sA - legBend * 26, lA + flyLift, false);

    ctx.save();
    upper();
    const armBehindHead = whipWind || meteor;
    if (armBehindHead) frontArm();
    // ── 牛頭 ──
    ctx.save();
    ctx.translate(38, -204);
    ctx.rotate(headTilt);
    const hk = 1.34;
    ctx.scale(hk, hk);
    // 後面的角（在頭後）
    const hornHeat = rage ? 1 : meteor ? 0.6 : 0.25;
    horn(ctx, cb(-12, -20, -52, -34, -84, -70, -64, -104), 24, U.mix(BR.horn, '#8a7060', 0.3), BR.hornS, BR.hornTip, hornHeat, '#ff5a1e');
    // 燃燒的鬃毛
    if (!dead) {
      for (let i = 0; i < (rage ? 6 : 4); i++) {
        const a = -2.2 + i * 0.35;
        flame(ctx, -14 + Math.cos(a) * 20, -8 + Math.sin(a) * 18 + 6, 10 + (rage ? 4 : 0), (rage ? 52 : 34) - i * 3, t, i + 11, '#ff6a1a', '#ffd23a', 2);
      }
    }
    // 耳朵
    A.shape(ctx, (c) => {
      c.moveTo(-10, -18);
      c.quadraticCurveTo(-34, -30, -44, -18);
      c.quadraticCurveTo(-30, -8, -8, -8);
      c.closePath();
    }, skin, skinS, { lw: 2.6, shadeY: -14 });
    // 下顎（張嘴時往下轉）
    ctx.save();
    ctx.translate(-4, 10);
    ctx.rotate(mouth * 0.42);
    A.shape(ctx, (c) => {
      c.moveTo(-6, -4);
      c.lineTo(42, 0);
      c.quadraticCurveTo(46, 10, 36, 14);
      c.quadraticCurveTo(10, 18, -8, 8);
      c.closePath();
    }, BR.muzzle, BR.muzzleS, { lw: 2.8, shadeY: 6 });
    // 下牙
    ctx.fillStyle = A.c('#f4ead0');
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 1.6;
    [[10, 6], [22, 6], [34, 7]].forEach(([x, h]) => {
      ctx.beginPath();
      ctx.moveTo(x - 3, 0);
      ctx.lineTo(x, -h);
      ctx.lineTo(x + 3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
    // 嘴裡的火光
    if (mouth > 0.3 && !dead) glow(ctx, 30, 12, 26 * mouth + 10, '#ffb43a', 0.6 * mouth + (meteor ? 0.3 : 0));
    // 頭骨
    const skull = (c) => {
      c.moveTo(-22, 4);
      c.quadraticCurveTo(-28, -26, -2, -30);
      c.quadraticCurveTo(22, -32, 32, -16);
      c.lineTo(50, -6);
      c.quadraticCurveTo(58, 2, 52, 12);
      c.lineTo(34, 12);
      c.quadraticCurveTo(10, 16, -22, 4);
      c.closePath();
    };
    A.shape(ctx, skull, skin, skinS, { cel: [5, 5], hl: [-8, -22, 8, 4], lw: 3 });
    // 口鼻
    A.shape(ctx, (c) => {
      c.moveTo(28, -12);
      c.lineTo(50, -6);
      c.quadraticCurveTo(58, 2, 52, 12);
      c.lineTo(28, 12);
      c.quadraticCurveTo(20, 0, 28, -12);
      c.closePath();
    }, BR.muzzle, BR.muzzleS, { lw: 2.6, shadeY: 4 });
    // 上獠牙
    A.shape(ctx, (c) => {
      c.moveTo(26, 10);
      c.quadraticCurveTo(24, 26, 16, 32);
      c.quadraticCurveTo(22, 20, 20, 10);
      c.closePath();
    }, '#f4ead0', '#cabc98', { lw: 2, shadeY: 20 });
    // 鼻孔＋鼻煙
    ctx.fillStyle = A.c('#1a0a08');
    ctx.beginPath();
    ctx.ellipse(49, -1, 3.5, 2.5, 0.4, 0, TAU);
    ctx.fill();
    if (!dead) {
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.2 + i / 3) % 1;
        ctx.globalAlpha = (1 - q) * 0.55;
        ctx.fillStyle = A.c(rage ? '#ff9a4a' : '#6a5a58');
        ctx.beginPath();
        ctx.arc(56 + q * 22, -4 - q * 18, 3 + q * 7, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // 鼻環
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(52, 10, 7, -0.6, PI * 1.1);
    ctx.stroke();
    ctx.strokeStyle = A.c(BR.gold);
    ctx.lineWidth = 3;
    ctx.stroke();
    // 臉上的裂紋
    hotLines(ctx, (c) => {
      c.moveTo(-18, -2);
      c.lineTo(-8, -10);
      c.lineTo(-10, -22);
      c.moveTo(20, -26);
      c.lineTo(16, -18);
    }, lava, heat, 2);
    // 眼：粗眉骨下兩道發光斜眼
    if (dead) {
      ctx.strokeStyle = A.outline();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, -14);
      ctx.lineTo(24, -10);
      ctx.stroke();
    } else {
      const eg = 0.9 + Math.sin(t * 5) * 0.12 + (rage ? 0.4 : 0);
      const ec = rage ? BR.eyeR : BR.eye;
      evilEye(ctx, 30, -15, 5, hurt ? 2 : 4, ec, eg * 0.7, false);
      evilEye(ctx, 14, -12, 9, hurt ? 2.5 : 6, ec, eg, false);
      A.shape(ctx, (c) => {
        c.moveTo(0, -24);
        c.lineTo(34, -16);
        c.lineTo(36, -22);
        c.lineTo(4, -30);
        c.closePath();
      }, skinS, null, { lw: 2.4 });
    }
    // 前面的角
    horn(ctx, cb(8, -24, 34, -56, 86, -58, 96, -102), 26, BR.horn, BR.hornS, BR.hornTip, hornHeat, '#ff5a1e');
    ctx.restore();

    if (!armBehindHead) frontArm();
    function frontArm() {
    // ── 前手臂＋火鞭 ──
    // 鞭子
    let wfn;
    if (whipStrike) {
      // 規格：水平橫掃約 560px、高度約腳底上方 40（js/game/fieldboss.js 的預警線）
      const wv = Math.sin(t * 30) * 6;
      const L = lerp(fH[0] + 60, 560 / K, whipV);
      wfn = cb(fH[0], fH[1], lerp(fH[0], L, 0.35), fH[1] + 10 + wv, lerp(fH[0], L, 0.7), -44 - wv, L, -40);
    } else if (whipWind) {
      const k = whipV;
      const idle = [fH[0] + 20, fH[1] + 70, 140, 0, 196, -4];
      const up = [fH[0] - 80, fH[1] - 30, -190, -250, -196, -120];
      const q = idle.map((v, i) => lerp(v, up[i], k));
      wfn = cb(fH[0], fH[1], q[0], q[1], q[2], q[3] + Math.sin(t * 8) * 10 * k, q[4], q[5]);
    } else if (fly) {
      const sw = Math.sin(t * 3) * 14;
      wfn = cb(fH[0], fH[1], fH[0] + 20, fH[1] + 60, fH[0] - 10 + sw, fH[1] + 110, fH[0] - 40 + sw, fH[1] + 150);
    } else {
      const sw = Math.sin(t * 2) * 5;
      wfn = cb(fH[0], fH[1], fH[0] + 26, fH[1] + 70, 150, -2, 200 + sw, -6 + (walk ? Math.sin(t * 8) * 4 : 0));
    }
    const whipGlow = dead ? 0 : whipStrike ? 1 : 0.55 + whipV * 0.45 + (rage ? 0.2 : 0);
    if (whipGlow > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const p = wfn(i / 30);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.strokeStyle = rgba('#ff7a1e', 0.35 * whipGlow);
      ctx.lineWidth = 22;
      ctx.stroke();
      ctx.restore();
    }
    A.shape(ctx, (c) => taper(c, wfn, (s) => 11 - s * 7, 30), BR.whip, null, { lw: 2.6 });
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const p = wfn(i / 30);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.strokeStyle = A.c(whipStrike ? '#ffe27a' : lava);
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -t * 60;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    if (!dead) {
      const n = whipStrike ? 9 : 5;
      for (let i = 1; i <= n; i++) {
        const p = wfn(i / n);
        flame(ctx, p[0], p[1] + 3, whipStrike ? 9 : 6, whipStrike ? 30 : 18, t, i + 20, '#ff7a1e', '#ffe27a', 1.8);
      }
      // 鞭梢的火球
      const tp = wfn(1);
      glow(ctx, tp[0], tp[1], 30, '#ffb43a', 0.8);
    }
    // 鞭柄
    ctx.save();
    ctx.translate(fH[0], fH[1]);
    ctx.rotate(Math.atan2(fH[1] - fE[1], fH[0] - fE[0]));
    A.shape(ctx, (c) => A.roundRect(c, -14, -6, 34, 12, 4), '#2a1a14', null, { lw: 2.4 });
    A.shape(ctx, (c) => c.ellipse(-16, 0, 6, 8, 0, 0, TAU), BR.gold, BR.goldS, { lw: 2.2, shadeY: 2 });
    ctx.restore();
    arm(58, -178, fE[0], fE[1], fH[0], fH[1], false, false);
    }

    // ── 流星火雨：高舉雙手，頭上凝聚的火球 ──
    if (meteor && !dead) {
      const k = 0.8 + Math.sin(t * 12) * 0.2;
      const r = 26 * k + (ph === 'strike' ? 10 : 0);
      glow(ctx, 18, -318, r * 3.2, '#ff7a1e', 0.8);
      A.ellipse(ctx, 18, -318, r, r, '#ffb43a', '#ff7a1e', { lw: 3, hl: [10, -326, r * 0.4, r * 0.25] });
      A.ellipse(ctx, 18, -318, r * 0.5, r * 0.5, '#fff4c0', null, { noStroke: true, hl: false });
      for (let i = 0; i < 8; i++) {
        const a = t * 4 + (i / 8) * TAU;
        const rr = r * 1.6 + ((t * 60 + i * 13) % 30);
        ctx.fillStyle = A.c('#ffd23a');
        ctx.beginPath();
        ctx.arc(18 + Math.cos(a) * rr, -318 + Math.sin(a) * rr, 3, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.restore();
  }

  // ═════════════════════════ 千手冰像 fb_zakum（260×300） ═════════════════════════
  // 殘暴炎魔風的上古冰石神像：半埋在雪堆裡的巨大石雕神像。刺冠頭飾＋高聳的雕刻石臉（倒 V 眉骨、深眼窩裡的冰藍光、
  // 眼下的淚紋符文、咬緊的石牙與冰獠牙、金耳璫）、額頭金框裡嵌著藍色魔石；厚重石肩甲、胸口的日輪浮雕、金項鍊與結冰的垂布；
  // 六隻有金臂環與符文護腕的巨大石臂，末端是真正的手（張開的掌、握起的拳），指尖是冰爪。
  // 暴走：石頭轉為深藍、背後展開一圈冰晶光輪（旋轉的符文環）、全身符文與裂紋發亮、眼睛與魔石轉為白紫。
  // 手臂索引：js/game/fieldboss.js 以世界座標分邊（0～2 = 世界左側、3～5 = 世界右側），各自是上／中／下。
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
  // 石手（原點在手腕、手指朝 +x、拇指在 -y 側）。grip 0 = 張開的掌，1 = 握拳
  function zkHand(ctx, grip, col, colS, heat, gcol) {
    const g = clamp(grip, 0, 1);
    if (g >= 0.6) {
      // 拳頭：方正的掌塊＋四個指節＋包住的拇指＋冰刺指虎
      for (let i = 0; i < 4; i++) {
        const y = -12 + i * 8;
        A.shape(ctx, (c) => {
          c.moveTo(34, y - 3.5);
          c.lineTo(46, y);
          c.lineTo(34, y + 3.5);
          c.closePath();
        }, ZK.ice, ZK.iceS, { lw: 1.6, shadeY: y });
      }
      A.shape(ctx, (c) => A.roundRect(c, -6, -18, 42, 36, 11), col, colS, { cel: [4, 4], lw: 3, hl: [4, -10, 6, 3] });
      ctx.strokeStyle = A.c(colS);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const y = -8 + i * 8;
        ctx.moveTo(24, y);
        ctx.lineTo(36, y);
      }
      ctx.moveTo(24, -16);
      ctx.lineTo(24, 16);
      ctx.stroke();
      A.shape(ctx, (c) => {
        c.moveTo(4, -18);
        c.quadraticCurveTo(22, -20, 26, -8);
        c.quadraticCurveTo(20, -4, 8, -8);
        c.closePath();
      }, col, colS, { lw: 2.4, shadeY: -10 });
      if (heat > 0) {
        glow(ctx, 16, 0, 40, gcol, 0.55 * heat);
        hotLines(ctx, (c) => {
          c.moveTo(6, -6);
          c.lineTo(14, 0);
          c.lineTo(6, 6);
          c.moveTo(16, -6);
          c.lineTo(16, 6);
        }, gcol, heat, 1.8);
      }
      return;
    }
    const k = g / 0.6;
    const fy = [-12, -4, 4, 12];
    const fl = [26, 30, 28, 22];
    for (let i = 3; i >= 0; i--) {
      const sp = (i - 1.5) * 0.14 * (1 - k);
      const a1 = sp + k * 0.7;
      const a2 = a1 + 0.12 + k * 0.9;
      const bx = 22;
      const by = fy[i];
      const jx = bx + Math.cos(a1) * fl[i] * 0.55;
      const jy = by + Math.sin(a1) * fl[i] * 0.55;
      const tx = jx + Math.cos(a2) * fl[i] * 0.5;
      const ty = jy + Math.sin(a2) * fl[i] * 0.5;
      limb(ctx, (c) => {
        c.moveTo(bx, by);
        c.lineTo(jx, jy);
        c.lineTo(tx, ty);
      }, 13, i % 2 ? U.mix(col, colS, 0.3) : col);
      A.shape(ctx, (c) => {
        c.moveTo(tx + Math.cos(a2 + 1.57) * 3.6, ty + Math.sin(a2 + 1.57) * 3.6);
        c.lineTo(tx + Math.cos(a2) * 9, ty + Math.sin(a2) * 9);
        c.lineTo(tx - Math.cos(a2 + 1.57) * 3.6, ty - Math.sin(a2 + 1.57) * 3.6);
        c.closePath();
      }, ZK.ice, null, { lw: 1.6 });
    }
    // 拇指
    const ta = -0.95 + k * 0.6;
    limb(ctx, (c) => {
      c.moveTo(6, -12);
      c.lineTo(6 + Math.cos(ta) * 14, -12 + Math.sin(ta) * 14);
      c.lineTo(6 + Math.cos(ta) * 14 + Math.cos(ta + 0.5) * 11, -12 + Math.sin(ta) * 14 + Math.sin(ta + 0.5) * 11);
    }, 14, col);
    // 手掌＋掌心符文
    A.shape(ctx, (c) => A.roundRect(c, -6, -17, 32, 34, 10), col, colS, { cel: [3, 4], lw: 3, hl: [2, -9, 5, 3] });
    if (heat > 0) {
      glow(ctx, 11, 0, 30, gcol, 0.5 * heat);
      hotLines(ctx, (c) => {
        c.moveTo(11, -7);
        c.lineTo(18, 0);
        c.lineTo(11, 7);
        c.lineTo(4, 0);
        c.closePath();
      }, gcol, heat, 1.6);
    }
  }
  function fb_zakum(ctx, m) {
    const S = atk(m);
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
    const hy0 = -232 + breathe;

    ctx.save();
    ctx.scale(K, K);
    ctx.translate(rumble, 0);
    if (!dead) {
      glow(ctx, 0, -170, 230 + (rage ? 50 : 0), rage ? '#8ab8ff' : '#6ab0ff', (rage ? 0.34 : 0.2) + Math.sin(t * 2) * 0.04);
      // 飄落的細雪／冰塵
      for (let i = 0; i < (rage ? 16 : 9); i++) {
        const q = (t * 0.25 + hash(i + 200)) % 1;
        const x = (hash(i + 201) - 0.5) * 380 + Math.sin(t + i) * 10;
        const y = rage ? -20 - q * 320 : -320 + q * 300;
        ctx.globalAlpha = Math.sin(q * PI) * 0.9;
        ctx.fillStyle = A.c(i % 3 ? '#ffffff' : gcol);
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + hash(i) * 1.6, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── 暴走：背後展開的冰晶光輪 ──
    if (rage) {
      const op = dead ? 0.5 : 1;
      ctx.save();
      ctx.translate(0, hy0 - 30);
      glow(ctx, 0, 0, 230, '#9ad8ff', 0.4 * op);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + PI / 16;
        if (Math.sin(a) > 0.45) continue; // 下面被身體擋住
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

    // ── 手臂 ──
    const sockets = [[74, -184], [82, -148], [80, -108]];
    const LEN = [[66, 62], [58, 54], [64, 58]];
    const armPose = (i) => {
      const lvl = i % 3;
      const sw = t * 1.1 + i * 1.3;
      const idle = [[-0.72, -0.95, 0.1], [0.2, -1.25, 0.15], [0.52, 0.5, 0]][lvl];
      let a1 = idle[0] + Math.sin(sw) * (lvl === 2 ? 0.02 : 0.07);
      let a2 = idle[1] + Math.sin(sw * 1.4 + 1) * (lvl === 2 ? 0.03 : 0.1);
      let grip = idle[2];
      let hot = 0;
      if (beamCharge || beamFire) {
        if (lvl === 0) {
          a1 = -0.95;
          a2 = -0.5;
        }
        if (lvl === 1) {
          a1 = -0.1;
          a2 = -0.7;
        }
        grip = 0;
        hot = 0.4;
      }
      if (shard) {
        a1 = [-1.1, -0.62, -0.12][lvl] + Math.sin(t * 6 + i) * 0.04;
        a2 = [-0.4, -0.75, -0.95][lvl];
        grip = 0;
        hot = 0.7;
      }
      if (i === armI) {
        if (slamDown) {
          a1 = 0.2 + lvl * 0.1;
          a2 = 0.22;
        } else {
          const k = clamp((slam || 0.4) / 0.7, 0, 1);
          a1 = lerp(a1, -1.42, k);
          a2 = lerp(a2, -0.18, k);
        }
        grip = 1;
        hot = 1;
      }
      if (dead) {
        a1 = 0.9;
        a2 = 0.45;
        grip = 0.3;
        hot = 0;
      }
      return { a1, a2, grip, hot };
    };
    const drawArm = (i) => {
      const side = (i >= 3 ? 1 : -1) * (m.dir < 0 ? -1 : 1);
      const lvl = i % 3;
      const P = armPose(i);
      const [L1, L2] = LEN[lvl];
      ctx.save();
      ctx.scale(side, 1);
      const sx = sockets[lvl][0];
      const sy = sockets[lvl][1] + breathe;
      const ex = sx + Math.cos(P.a1) * L1;
      const ey = sy + Math.sin(P.a1) * L1;
      const fa = P.a1 + P.a2;
      const hx = ex + Math.cos(fa) * L2;
      const hy = ey + Math.sin(fa) * L2;
      const dim = lvl === 1 ? 0.3 : 0;
      const col = U.mix(stone, stoneS, dim);
      const colS = U.mix(stoneS, stoneD, dim);
      if (P.hot > 0 && !dead) glow(ctx, hx, hy, 70, gcol, 0.5 * P.hot);
      // 砸下的殘影
      if (i === armI && slamDown && !dead) {
        ctx.strokeStyle = rgba('#e8f8ff', 0.4);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(sx, sy, L1 + L2 + 10, -1.4, fa - 0.1);
        ctx.stroke();
        ctx.strokeStyle = rgba(gcol, 0.5);
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(sx, sy, L1 + L2 - 6, -1.2, fa - 0.15);
        ctx.stroke();
      }
      const ua = qb(sx, sy, (sx + ex) / 2, (sy + ey) / 2 - 4, ex, ey);
      const uw = (s) => 42 - s * 12 + Math.sin(s * PI) * 9;
      A.shape(ctx, (c) => taper(c, ua, uw), col, colS, { cel: [5, 4], lw: 3.2 });
      zkBand(ctx, ua, 0.46, 0.6, uw, gold, goldS);
      // 前臂
      const fr = qb(ex, ey, (ex + hx) / 2, (ey + hy) / 2, hx, hy);
      const fw = (s) => 36 - s * 12 + Math.sin(s * PI * 0.8) * 6;
      A.shape(ctx, (c) => taper(c, fr, fw), col, colS, { cel: [4, 4], lw: 3.2 });
      // 符文護腕
      zkBand(ctx, fr, 0.74, 0.86, fw, gold, goldS);
      hotLines(ctx, (c) => {
        const p = along(fr, 0.45, 0);
        c.moveTo(p[0] - 5, p[1] - 5);
        c.lineTo(p[0], p[1] + 5);
        c.lineTo(p[0] + 5, p[1] - 5);
      }, gcol, dead ? 0 : Math.max(0.35, P.hot, rage ? 1 : 0), 2);
      // 手肘：石塊關節＋冰晶
      A.ellipse(ctx, ex, ey, 19, 18, stoneS, stoneD, { lw: 2.8, hl: false });
      iceCrystal(ctx, ex, ey - 8, rage ? 34 : 24, rage ? 9 : 7, -0.5 + P.a1 * 0.3, ZK.ice, ZK.iceS);
      if (rage) iceCrystal(ctx, ex + 8, ey - 2, 22, 6, 0.4, ZK.ice, ZK.iceS);
      // 上臂的冰霜
      const fp = along(ua, 0.28, -12);
      iceCrystal(ctx, fp[0], fp[1], 18, 6, fp[2] - PI / 2, '#e6f7ff', ZK.iceS);
      // 手
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(fa);
      ctx.scale(1.2, 1.2);
      zkHand(ctx, P.grip, stoneL, stoneLS, dead ? 0 : P.hot, gcol);
      ctx.restore();
      // 砸下去：飛濺的冰塊
      if (i === armI && slamDown && !dead) {
        for (let k = 0; k < 5; k++) {
          const q = (t * 2.5 + k / 5) % 1;
          iceCrystal(ctx, hx + 30 + (k - 2) * 12 * (1 + q), hy + 20 - Math.sin(q * PI) * 40, 12, 4, (k - 2) * 0.5, ZK.ice, ZK.iceS);
        }
      }
      ctx.restore();
    };
    // 下 → 中 → 上的順序畫（上臂舉起的手不會被擋住）；正在出招的手臂最後畫在最前面
    [2, 5, 1, 4, 0, 3].filter((i) => i !== armI).forEach(drawArm);

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
    // 胸口的日輪浮雕
    const dc = [0, -140];
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
    // 側面的手臂關節石環
    [[-82, -148], [82, -148], [-80, -108], [80, -108]].forEach(([x, y]) => {
      A.ellipse(ctx, x, y, 12, 15, stoneS, stoneD, { lw: 2.6, hl: false });
      A.ellipse(ctx, x, y, 5, 7, gcol, null, { lw: 1.8, hl: false });
    });
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
      iceCrystal(ctx, px + 4 * sd, -214, rage ? 50 : 36, rage ? 12 : 10, 0.35 * sd, ZK.ice, ZK.iceS);
      iceCrystal(ctx, px + 24 * sd, -204, rage ? 38 : 26, rage ? 9 : 7, 0.8 * sd, '#e6f7ff', ZK.iceS);
      A.shape(ctx, pd, stone, stoneS, { cel: [6 * sd, 6], lw: 3.2, hl: [px - 6 * sd, -210, 8, 4] });
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
    ctx.restore();

    // ── 頭（巨大的雕刻石臉）──
    ctx.save();
    ctx.translate(0, hy0);
    ctx.scale(1.42, 1.42);
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
    const crownTips = [[-86, -60, -1.1], [-60, -88, -0.5], [-30, -104, -0.25], [0, -114, 0], [30, -104, 0.25], [60, -88, 0.5], [86, -60, 1.1]];
    crownTips.forEach(([x, y, a], k) => {
      const h = (k === 3 ? 34 : k % 2 ? 20 : 16) * (rage ? 1.45 : 1);
      if (!dead) glow(ctx, x, y - h * 0.4, h * 0.9, gcol, 0.3 + (rage ? 0.25 : 0));
      iceCrystal(ctx, x, y + 6, h, k === 3 ? 10 : 7, a, k % 2 ? ZK.ice : '#e6f7ff', ZK.iceS);
    });
    A.shape(ctx, crown, stoneS, stoneD, { cel: [8, 8], lw: 3.4 });
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
    A.shape(ctx, crownIn, gold, goldS, { cel: [4, 5], lw: 2.8 });
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
    const eg = dead ? 0 : 0.9 + Math.sin(t * 4) * 0.1 + (rage ? 0.4 : 0) + beam * 0.8;
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
      const eh = hurt ? 1.5 : 3.6 + beam * 2;
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
      ctx.ellipse(x + 1 * sd, 1, 5, 1.6, -0.2 * sd, 0, TAU);
      ctx.fill();
    });
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
    const mOpen = dead ? 2 : beamFire ? 14 : shard ? 11 : beamCharge ? 7 : hurt ? 9 : 4;
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
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      A.roundRect(ctx, k * 8.4 - 3.6, 32, 7.2, 4 + mOpen * 0.2, 1.5);
      ctx.fill();
      ctx.stroke();
    }
    [-1, 1].forEach((sd) => {
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

    // 正在出招的手臂（畫在最前面）
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
      const ey = hy0 + 2;
      const k = beamFire ? 1 : beam;
      [-30, 30].forEach((x) => {
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
          const x = i % 2 ? 30 : -30;
          ctx.fillStyle = A.c('#e8f8ff');
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * r, ey + Math.sin(a) * r, 2.5, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // ═════════════════════════ 星蝕魔龍 fb_voiddragon（300×220，懸空） ═════════════════════════
  // 懸空的虛空龍：身體是吞噬了星座的夜空（星點＋斷掉的星座線），背後一圈日蝕黑環與金色光冕，脊椎上插著錶盤碎片。
  const VD = {
    sky: '#221c56', skyS: '#140f36', skyR: '#2a1040', skyRS: '#16061e', belly: '#3e3690', bellyS: '#2c2670',
    gold: '#f2cc62', goldS: '#c0923a', goldR: '#ff9a4a', face: '#fff2d2', faceS: '#e0cc9c',
    star: '#fff6d0', line: '#ffd86a', eye: '#fff0a0', eyeR: '#ff4ad0', neb: '#b06aff', nebR: '#ff5a9a', beam: '#c89aff',
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
      headUp = -0.08;
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
      const tips = batWing(ctx, root[0], root[1], fing, rage ? '#2a1446' : '#241e5c', rage ? '#170a2a' : '#15103a', VD.gold, VD.goldS, { tatter: false, boneW: 7, tailX: 20, tailY: 40, glowCol: neb, glowA: rage ? 0.5 : 0.3 });
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

    // 本體
    A.shape(ctx, (c) => taper(c, spine, wf, 40), sky, skyS, { cel: [0, 7], lw: 3.4 });
    ctx.save();
    ctx.beginPath();
    taper(ctx, spine, wf, 40);
    ctx.clip();
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
    horn(ctx, cb(-6, -18, -30, -40, -62, -52, -96, -48), 18, U.mix(gold, '#8a6a3a', 0.25), VD.goldS, '#4a2a1a', rage ? 0.8 : 0.2, VD.nebR);
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
      evilEye(ctx, 26, -8, 11, hurt ? 2.5 : 6, eyeC, eg, true);
      A.shape(ctx, (c) => {
        c.moveTo(10, -18);
        c.lineTo(42, -12);
        c.lineTo(42, -17);
        c.lineTo(14, -24);
        c.closePath();
      }, skyS, null, { lw: 2.4 });
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

    // ── 虛空吐息（長光束）──
    if (fire && !dead) {
      ctx.save();
      ctx.translate(hbX, hbY);
      ctx.rotate(-headUp);
      ctx.translate(74, 14);
      // 長光束由地面區域 fb_beam 畫（瞄準玩家）；這裡只畫嘴邊噴出的一截
      const L = 70;
      const wob = Math.sin(t * 40) * 3;
      const g = ctx.createLinearGradient(0, -40, 0, 40);
      g.addColorStop(0, rgba(VD.beam, 0));
      g.addColorStop(0.5, rgba(VD.beam, 0.6));
      g.addColorStop(1, rgba(VD.beam, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, -40, L, 80);
      A.shape(ctx, (c) => {
        c.moveTo(0, -12);
        c.lineTo(L, -20 - wob);
        c.lineTo(L, 20 + wob);
        c.lineTo(0, 12);
        c.closePath();
      }, '#1a0a34', null, { lw: 2.6 });
      ctx.strokeStyle = A.c(VD.beam);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(L, -14 - wob);
      ctx.moveTo(0, 8);
      ctx.lineTo(L, 14 + wob);
      ctx.stroke();
      ctx.strokeStyle = A.c('#ffffff');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(L, -14 - wob);
      ctx.moveTo(0, 8);
      ctx.lineTo(L, 14 + wob);
      ctx.stroke();
      for (let i = 0; i < 14; i++) {
        const q = (t * 2.2 + hash(i)) % 1;
        starShape(ctx, q * L, (hash(i + 3) - 0.5) * 24, 3 + hash(i) * 3, i % 3 ? '#ffffff' : VD.line);
      }
      glow(ctx, 0, 0, 50, '#ffffff', 0.9);
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
  const SPAWN_COL = { fb_shroom: '#8cff5a', fb_kraken: '#7dffc0', fb_balrog: '#ff7a1e', fb_zakum: '#7ad8ff', fb_voiddragon: '#b06aff' };
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
  // 孢子吐息：地上一團翻滾的綠紫毒霧（z.r 半徑）
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
    glow(ctx, 0, 0, r * 1.2, '#8cff5a', 0.35);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= 0.72;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + zt * 0.4;
      const x = Math.cos(a) * r * 0.62 * grow + Math.sin(t * 1.3 + i) * 8;
      const y = -30 - Math.abs(Math.sin(a)) * 26 + Math.sin(t * 2 + i * 1.7) * 6;
      puff(ctx, x, y, r * 0.3 * grow * (0.8 + hash(i) * 0.4), i % 3 ? '#8ad05a' : '#9a6ac0', i % 3 ? '#5a9a3a' : '#6a4a90');
    }
    puff(ctx, 0, -46, r * 0.36 * grow, '#a8e06a', '#6aa84a');
    ctx.restore();
    // 往上飄的孢子
    for (let i = 0; i < 14; i++) {
      const q = (t * 0.6 + hash(i + 140)) % 1;
      const x = (hash(i + 141) - 0.5) * r * 1.8 + Math.sin(t * 2 + i) * 10;
      const y = -10 - q * 150;
      ctx.globalAlpha = f * Math.sin(q * PI);
      glow(ctx, x, y, 8, '#c8ff6a', 0.8);
      ctx.fillStyle = A.c('#f0ffc0');
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, TAU);
      ctx.fill();
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
    const fr = qb(-side * 46, -460, -side * 26, -280, 0, -92);
    const fw = (s) => 58 + (1 - s) * 34 + Math.sin(s * PI) * 8;
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
    // 拳頭（指節朝下、冰刺指虎砸進地面）
    glow(ctx, 0, -40, 90, '#7ad8ff', 0.5);
    ctx.save();
    ctx.translate(0, -96);
    ctx.rotate(PI / 2);
    ctx.scale(2.05, 2.05 * side);
    zkHand(ctx, 1, ZK.stoneL, ZK.stoneLS, 0.9, '#7ad8ff');
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
    fb_shroom: withSpawn('fb_shroom', 190, fb_shroom),
    fb_kraken: withSpawn('fb_kraken', 170, fb_kraken),
    fb_balrog: withSpawn('fb_balrog', 260, fb_balrog),
    fb_zakum: withSpawn('fb_zakum', 300, fb_zakum),
    fb_voiddragon: withSpawn('fb_voiddragon', 220, fb_voiddragon),
  });
  Object.assign(A.PROJ_DRAW, { fb_anchor, fb_meteor, fb_voidorb });
  Object.assign(A.ZONE_DRAW, { fb_warn, fb_warnline, fb_beam, fb_sporebreath, fb_inkcloud, fb_tentacle, fb_armslam });
})();
