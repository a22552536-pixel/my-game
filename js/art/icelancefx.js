// 冰霜長槍（魔法二轉）：一支長長的多面冰晶槍（半透明槍身、冷色內芯光、尖銳槍尖），後面拖著冰霧，
// 一路掉冰屑和雪粒，一圈冷風螺旋繞著槍身；施放時爪前先凝出一小簇冰晶；打中時槍碎成冰片、
// 命中點綻開一簇不規則冰晶（和 art/skills3.js 冰凍狀態同一種晶體畫法）、目標腳下擴散一圈霜。
// 純視覺，傷害／貫穿／冰凍秒數都在 js/game/skills3.js 沒有改。
(function () {
  'use strict';
  const A = G.art;
  const TAU = Math.PI * 2;
  const lite = () => !!G.lowFx;
  const R = (a, b) => a + (b - a) * Math.random();
  const OUT = () => (A.outline ? A.outline() : '#4a2e1f');

  // 一根不規則的晶體（本地：沿 +y 往上長）：寬、長、轉折、頂端形式都由 s[] 決定
  function crystalShape(len, wid) {
    const r = [];
    for (let i = 0; i < 8; i++) r.push(Math.random());
    return { len, wid, r };
  }
  function crystal(ctx, sh, k, a) {
    const L = sh.len * k;
    const hw = (sh.wid / 2) * (0.4 + 0.6 * k);
    const r = sh.r;
    const lk = 0.3 + r[0] * 0.4;
    const rk = 0.3 + r[1] * 0.4;
    const tipX = (r[2] - 0.5) * hw * 0.8;
    const slant = r[3] < 0.35; // 斜切頂
    ctx.beginPath();
    ctx.moveTo(-hw * 0.85, 0);
    ctx.lineTo(-hw * (1 + (r[4] - 0.4) * 0.3), -L * lk);
    ctx.lineTo(-hw * 0.8, -L * (0.66 + r[5] * 0.12));
    if (slant) {
      ctx.lineTo(-hw * 0.4, -L);
      ctx.lineTo(hw * 0.5, -L * 0.84);
    } else ctx.lineTo(tipX, -L);
    ctx.lineTo(hw * 0.85, -L * (0.64 + r[6] * 0.12));
    ctx.lineTo(hw * (1 + (r[7] - 0.4) * 0.3), -L * rk);
    ctx.lineTo(hw * 0.85, 0);
    ctx.closePath();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(175,225,252,0.62)';
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 受光面／背光面
    ctx.fillStyle = 'rgba(240,250,255,0.55)';
    ctx.fillRect(-hw * 1.4, -L * 1.1, hw * (0.9 + r[0] * 0.3), L * 1.2);
    ctx.fillStyle = 'rgba(70,135,200,0.35)';
    ctx.fillRect(hw * (0.1 + r[1] * 0.3), -L * 1.1, hw * 1.4, L * 1.2);
    ctx.restore();
    ctx.strokeStyle = OUT();
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = a * 0.85;
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(235,250,255,0.9)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.3, -1);
    ctx.lineTo(tipX * 0.7, -L * 0.85);
    ctx.stroke();
  }

  // ── 粒子池：0 冰霧團 1 雪粒 2 冰屑（小三角） 3 碎冰片（大塊） ──
  const N = 150;
  const PS = [];
  for (let i = 0; i < N; i++) PS.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, rot: 0, vr: 0, g: 0, drag: 0 });
  let live = 0;
  let pi = 0;
  function spawn(k, x, y, vx, vy, life, s) {
    for (let j = 0; j < N; j++) {
      const q = PS[(pi + j) % N];
      if (q.on) continue;
      pi = (pi + j + 1) % N;
      live++;
      q.on = true;
      q.k = k;
      q.x = x;
      q.y = y;
      q.vx = vx;
      q.vy = vy;
      q.t = 0;
      q.life = life;
      q.s = s;
      q.rot = Math.random() * TAU;
      q.vr = R(-8, 8);
      q.g = 0;
      q.drag = 0;
      return q;
    }
    return null;
  }

  const CASTS = []; // 爪前的冰晶簇
  const HITS = []; // 命中的冰晶綻放＋地上的霜

  function cast(P) {
    const d = P.dir;
    const e = { x: P.x + d * 34, y: P.y - 34, dir: d, t: 0, cr: [] };
    const n = lite() ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + R(-0.3, 0.3);
      e.cr.push({ ang, sh: crystalShape(R(9, 16), R(5, 8)) });
    }
    CASTS.push(e);
    if (CASTS.length > 4) CASTS.shift();
  }

  function trail(p, dt) {
    p.fxT = (p.fxT || 0) - dt;
    if (p.fxT > 0) return;
    p.fxT = lite() ? 0.05 : 0.022;
    const d = p.dir || 1;
    // 冰霧（往後、慢慢散開）
    spawn(0, p.x - d * R(30, 50), p.y + R(-4, 4), -d * R(20, 60), R(-12, 12), R(0.35, 0.55), R(6, 10));
    // 雪粒
    const q = spawn(1, p.x - d * R(10, 40), p.y + R(-7, 7), -d * R(30, 90), R(-30, 30), R(0.4, 0.7), R(1.2, 2.2));
    if (q) q.g = 40;
    if (!lite() && Math.random() < 0.6) {
      const r = spawn(2, p.x - d * R(0, 30), p.y + R(-6, 6), -d * R(40, 120), R(-60, 40), R(0.35, 0.6), R(2.2, 3.6));
      if (r) r.g = 420;
    }
  }

  function hit(x, y, dir, m) {
    const gy = m ? m.y - (m.hover || 0) : y + 30;
    const e = { x, y, dir, gy, t: 0, cr: [], fr: [], air: m && (m.hover || 0) > 12 };
    // 命中點綻開的冰晶簇
    const n = lite() ? 5 : 8;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.6 + R(-0.2, 0.2) + (i % 2 ? Math.PI * 0.9 : 0);
      e.cr.push({ ang, sh: crystalShape(R(14, 30), R(7, 12)), dl: R(0, 0.05) });
    }
    // 地上的霜：幾根貼地的小冰刺
    const nf = lite() ? 3 : 6;
    for (let i = 0; i < nf; i++) e.fr.push({ dx: (i / (nf - 1) - 0.5) * 70 + R(-6, 6), ang: R(-0.5, 0.5), sh: crystalShape(R(7, 14), R(4, 7)) });
    HITS.push(e);
    if (HITS.length > 8) HITS.shift();
    // 槍碎成冰片（往前、往四周）
    const ns = lite() ? 5 : 10;
    for (let i = 0; i < ns; i++) {
      const a = (dir > 0 ? 0 : Math.PI) + R(-1.3, 1.3);
      const sp = R(180, 420);
      const q = spawn(3, x, y + R(-5, 5), Math.cos(a) * sp, Math.sin(a) * sp - 80, R(0.4, 0.7), R(4, 8));
      if (q) q.g = 900;
    }
    const nm = lite() ? 3 : 6;
    for (let i = 0; i < nm; i++) spawn(0, x + R(-10, 10), y + R(-10, 10), R(-60, 60), R(-60, 20), R(0.4, 0.6), R(8, 14));
  }

  function step(dt) {
    for (let i = CASTS.length - 1; i >= 0; i--) {
      CASTS[i].t += dt;
      if (CASTS[i].t > 0.3) CASTS.splice(i, 1);
    }
    for (let i = HITS.length - 1; i >= 0; i--) {
      HITS[i].t += dt;
      if (HITS[i].t > 0.9) HITS.splice(i, 1);
    }
    if (!live) return;
    for (const q of PS) {
      if (!q.on) continue;
      q.t += dt;
      if (q.t >= q.life) {
        q.on = false;
        live--;
        continue;
      }
      if (q.k === 0 || q.k === 1) {
        const dr = Math.max(0, 1 - 2.5 * dt);
        q.vx *= dr;
        q.vy *= dr;
      }
      q.vy += q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
    }
  }

  function front(ctx) {
    // 爪前的冰晶簇：0.14 秒長出來，發射時一下子散掉
    for (const e of CASTS) {
      const t = e.t;
      const k = Math.min(1, t / 0.13);
      const a = t < 0.16 ? 1 : Math.max(0, 1 - (t - 0.16) / 0.14);
      ctx.save();
      ctx.translate(e.x, e.y);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
      g.addColorStop(0, 'rgba(220,245,255,' + (0.7 * a).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(140,210,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, TAU);
      ctx.fill();
      for (const c of e.cr) {
        ctx.save();
        ctx.rotate(c.ang + t * 2 * e.dir);
        ctx.translate(0, -3 - (t > 0.16 ? (t - 0.16) * 90 : 0));
        crystal(ctx, c.sh, 0.2 + 0.8 * k, a);
        ctx.restore();
      }
      ctx.restore();
    }
    // 命中：局部冰光、冰晶簇綻開、地上的霜
    for (const e of HITS) {
      const t = e.t;
      if (t < 0.18) {
        ctx.globalCompositeOperation = 'lighter';
        const rr = 56;
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, rr);
        g.addColorStop(0, 'rgba(235,250,255,' + (0.85 * (1 - t / 0.18)).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, rr, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      // 地上的霜（往兩邊擴散，停一下再淡掉）
      if (!e.air) {
        const k = Math.min(1, t / 0.25);
        const a = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.35);
        ctx.globalAlpha = a * 0.75;
        ctx.beginPath();
        ctx.ellipse(e.x, e.gy - 1, 12 + 34 * k, 4 + 3 * k, 0, 0, TAU);
        ctx.fillStyle = 'rgba(215,242,255,0.8)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,190,235,0.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        for (const f of e.fr) {
          if (Math.abs(f.dx) > 12 + 34 * k) continue;
          ctx.save();
          ctx.translate(e.x + f.dx, e.gy + 1);
          ctx.rotate(f.ang);
          crystal(ctx, f.sh, Math.min(1, k * 1.3), a);
          ctx.restore();
        }
      }
      // 命中點的冰晶簇
      const a2 = t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.25);
      if (a2 > 0) {
        for (const c of e.cr) {
          const kk = Math.min(1, Math.max(0, (t - c.dl) / 0.08));
          if (kk <= 0) continue;
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(c.ang + Math.PI / 2);
          crystal(ctx, c.sh, kk * (t > 0.3 ? 1 + (t - 0.3) * 0.6 : 1), a2);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }
    if (!live) return;
    const O = OUT();
    for (const q of PS) {
      if (!q.on) continue;
      const k = q.t / q.life;
      if (q.k === 0) {
        ctx.globalAlpha = 0.4 * (1 - k);
        ctx.fillStyle = '#e4f6ff';
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.s * (0.6 + k), 0, TAU);
        ctx.fill();
      } else if (q.k === 1) {
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.s, 0, TAU);
        ctx.fill();
      } else {
        // 冰屑、碎冰片：細長的菱形，有描邊
        ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        const s = q.s;
        const cs = Math.cos(q.rot);
        const sn = Math.sin(q.rot);
        const px = (lx, ly) => q.x + lx * cs - ly * sn;
        const py = (lx, ly) => q.y + lx * sn + ly * cs;
        ctx.beginPath();
        ctx.moveTo(px(s * 1.3, 0), py(s * 1.3, 0));
        ctx.lineTo(px(0, -s * 0.45), py(0, -s * 0.45));
        ctx.lineTo(px(-s * 0.9, 0), py(-s * 0.9, 0));
        ctx.lineTo(px(0, s * 0.4), py(0, s * 0.4));
        ctx.closePath();
        ctx.fillStyle = q.k === 3 ? 'rgba(200,236,255,0.9)' : '#dff4ff';
        ctx.fill();
        ctx.strokeStyle = O;
        ctx.lineWidth = q.k === 3 ? 1.5 : 1;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── 槍本體（ctx 已平移到 (p.x, p.y)） ──
  function lanceOutline(ctx) {
    ctx.beginPath();
    ctx.moveTo(46, 0); // 槍尖
    ctx.lineTo(24, -6.5);
    ctx.lineTo(14, -8.5); // 槍頭後肩
    ctx.lineTo(10, -4.2);
    ctx.lineTo(-30, -4.6);
    ctx.lineTo(-42, -6.4); // 尾端晶稜
    ctx.lineTo(-52, -1.2);
    ctx.lineTo(-50, 2.6);
    ctx.lineTo(-40, 5.8);
    ctx.lineTo(-30, 4.2);
    ctx.lineTo(10, 4.6);
    ctx.lineTo(14, 9);
    ctx.lineTo(25, 7);
    ctx.closePath();
  }
  function helix(ctx, t, s, frontHalf) {
    // 冷風螺旋：沿槍身繞，frontHalf 只畫在槍前面那半圈
    ctx.lineCap = 'round';
    let drawing = false;
    ctx.beginPath();
    for (let x = -70; x <= 34; x += 4) {
      const ph = x * 0.13 - t * 28 + s;
      const rad = 7 + (34 - x) * 0.05;
      const y = Math.sin(ph) * rad;
      const isFront = Math.cos(ph) > 0;
      if (isFront === frontHalf) {
        if (!drawing) {
          ctx.moveTo(x, y);
          drawing = true;
        } else ctx.lineTo(x, y);
      } else drawing = false;
    }
    ctx.globalAlpha = frontHalf ? 0.95 : 0.6;
    ctx.strokeStyle = 'rgba(40,90,140,0.35)';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(235,250,255,0.95)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  A.PROJ_DRAW = A.PROJ_DRAW || {};
  A.PROJ_DRAW.icelance = function (ctx, p, t) {
    const s = p.seed || 0;
    const tt = G.time;
    ctx.scale(p.dir || 1, 1);
    // 冰霧尾巴：一條往後變細、邊緣起伏的霧帶
    const g = ctx.createLinearGradient(-130, 0, -30, 0);
    g.addColorStop(0, 'rgba(200,238,255,0)');
    g.addColorStop(1, 'rgba(200,238,255,0.6)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-30, -9);
    const n = lite() ? 4 : 7;
    for (let i = 1; i <= n; i++) {
      const x = -30 - (i / n) * 100;
      ctx.lineTo(x, -9 * (1 - i / n) - 2 + Math.sin(tt * 18 + i * 1.7 + s) * 2.5);
    }
    for (let i = n; i >= 1; i--) {
      const x = -30 - (i / n) * 100;
      ctx.lineTo(x, 9 * (1 - i / n) + 2 + Math.sin(tt * 15 + i * 2.1 + s) * 2.5);
    }
    ctx.lineTo(-30, 9);
    ctx.closePath();
    ctx.fill();
    // 冷光
    const gl = ctx.createRadialGradient(10, 0, 0, 10, 0, 44);
    gl.addColorStop(0, 'rgba(190,235,255,0.5)');
    gl.addColorStop(1, 'rgba(150,215,255,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(-34, -44, 88, 88);
    // 槍身放大一點：粗壯的冰槍（線寬跟著變化不大）
    ctx.scale(1.12, 1.5);
    // 螺旋的後半圈（在槍後面）
    helix(ctx, tt, s, false);
    // 槍身：半透明冰
    lanceOutline(ctx);
    ctx.fillStyle = 'rgba(160,215,248,0.72)';
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 上面受光的斜面、下面背光的斜面、中間一條稜
    ctx.fillStyle = 'rgba(240,251,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(46, 0);
    ctx.lineTo(14, -10);
    ctx.lineTo(-52, -8);
    ctx.lineTo(-52, -0.8);
    ctx.lineTo(10, -0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(60,125,195,0.45)';
    ctx.beginPath();
    ctx.moveTo(46, 0);
    ctx.lineTo(14, 10);
    ctx.lineTo(-52, 8);
    ctx.lineTo(-52, 2);
    ctx.lineTo(10, 1.6);
    ctx.closePath();
    ctx.fill();
    // 冷色內芯：一條會脈動的亮線
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.7 + 0.3 * Math.sin(tt * 20 + s);
    const gc = ctx.createLinearGradient(-50, 0, 40, 0);
    gc.addColorStop(0, 'rgba(120,200,255,0)');
    gc.addColorStop(0.6, 'rgba(150,225,255,' + (0.7 * pulse).toFixed(3) + ')');
    gc.addColorStop(1, 'rgba(230,250,255,' + pulse.toFixed(3) + ')');
    ctx.fillStyle = gc;
    ctx.fillRect(-50, -2.2, 92, 4.4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    lanceOutline(ctx);
    ctx.strokeStyle = OUT();
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'miter';
    ctx.stroke();
    // 稜線
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(44, -0.5);
    ctx.lineTo(14, -5);
    ctx.moveTo(8, -2.4);
    ctx.lineTo(-40, -3);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(110,170,225,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, -8.5);
    ctx.lineTo(14, 9);
    ctx.moveTo(-30, -4.6);
    ctx.lineTo(-30, 4.2);
    ctx.stroke();
    // 護手的兩根小冰刺（往後斜）
    const spike = (sy) => {
      ctx.beginPath();
      ctx.moveTo(2, sy * 4);
      ctx.lineTo(-12, sy * 15);
      ctx.lineTo(-6, sy * 4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(200,236,255,0.9)';
      ctx.fill();
      ctx.strokeStyle = OUT();
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };
    spike(-1);
    spike(1);
    // 螺旋的前半圈
    helix(ctx, tt, s, true);
    // 槍尖的閃光
    const tw = 0.5 + 0.5 * Math.sin(tt * 14 + s);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const sr = 3 + tw * 3;
    ctx.moveTo(47 + sr, 0);
    ctx.lineTo(47, -sr * 0.28);
    ctx.lineTo(47 - sr, 0);
    ctx.lineTo(47, sr * 0.28);
    ctx.closePath();
    ctx.moveTo(47, -sr);
    ctx.lineTo(47 + sr * 0.28, 0);
    ctx.lineTo(47, sr);
    ctx.lineTo(47 - sr * 0.28, 0);
    ctx.closePath();
    ctx.fill();
  };

  A.iceLanceFx = { cast, trail, hit };
  if (A.skillFx) {
    A.skillFx.add({
      live: () => live > 0 || CASTS.length > 0 || HITS.length > 0,
      step,
      front,
      clear() {
        for (const q of PS) q.on = false;
        live = 0;
        CASTS.length = 0;
        HITS.length = 0;
      },
    });
  }
})();
