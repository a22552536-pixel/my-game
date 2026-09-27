// 打擊感：命中停頓、畫面震動、粒子、傷害數字、光柱。
(function () {
  'use strict';
  const U = G.util;

  // ── 黑閃的「摺痕」形狀池 ──
  // 不是樹根一樣的碎形分岔，而是像揉皺的紙、裂開的玻璃：幾段直線以銳角折來折去，
  // 每一段是一條寬窄不一的黑色帶子（每個折角寬度就突然變），紅光只打在每一折的其中一側 → 一面一面的摺面。
  // 座標是正規化的：主幹從 (0,0) 走到 (1,0)；寬度是另外的倍率（生成時再乘上實際的粗細）。
  const BF_MAX = 6;
  // 一條帶子：v 頂點（x,y 交錯），w 每段的四個半寬（起點左、終點左、起點右、終點右），lit 每段哪一側受光，t0 從主幹哪裡長出來
  function bfRibbon(v, w, lit, t0) {
    return { v: new Float32Array(v), w: new Float32Array(w), lit: new Int8Array(lit), n: lit.length, t0 };
  }
  // n 段折線；spurs：最多幾根短短的斜刺
  function bfCrease(nMin, nMax, spurs) {
    const n = nMin + ((Math.random() * (nMax - nMin + 1)) | 0);
    let sg = Math.random() < 0.5 ? -1 : 1;
    const pts = [[0, 0]];
    const sgs = [];
    const hd = [];
    let x = 0;
    let y = 0;
    for (let i = 0; i < n; i++) {
      // 相鄰兩段的夾角很銳：方向在主軸兩側來回甩
      const h = sg * U.rand(0.55, 1.2) + U.rand(-0.12, 0.12);
      const len = U.rand(0.55, 1.45);
      x += Math.cos(h) * len;
      y += Math.sin(h) * len;
      pts.push([x, y]);
      sgs.push(sg);
      hd.push(h);
      if (Math.random() < 0.82) sg = -sg;
    }
    // 轉正、縮放：終點落在 (1,0)
    const L = Math.hypot(x, y);
    const ra = -Math.atan2(y, x);
    const cr = Math.cos(ra) / L;
    const sr = Math.sin(ra) / L;
    const v = [];
    for (const [px, py] of pts) v.push(px * cr - py * sr, px * sr + py * cr);
    const w = [];
    const lit = [];
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const base = U.rand(0.5, 1) * (1 - 0.55 * u) * (i === 0 ? 0.7 : 1);
      const a0 = base * U.rand(0.35, 1.6);
      const b0 = base * U.rand(0.35, 1.6);
      const last = i === n - 1;
      w.push(a0, last ? 0 : a0 * U.rand(0.2, 0.65), b0, last ? 0 : b0 * U.rand(0.2, 0.65));
      lit.push(sgs[i]);
    }
    const out = [bfRibbon(v, w, lit, 0)];
    // 一兩根短的斜刺，從折角往外岔出去（兩段、很細、尖頭）
    for (let k = 0; k < spurs; k++) {
      const j = 1 + ((Math.random() * (n - 1)) | 0);
      const hx = hd[j] + ra + (Math.random() < 0.5 ? -1 : 1) * U.rand(0.9, 1.5);
      const l1 = U.rand(0.07, 0.13);
      const px = v[j * 2];
      const py = v[j * 2 + 1];
      const qx = px + Math.cos(hx) * l1;
      const qy = py + Math.sin(hx) * l1;
      const h2 = hx + (Math.random() < 0.5 ? -1 : 1) * U.rand(0.6, 1.1);
      const l2 = l1 * U.rand(0.6, 1.1);
      out.push(bfRibbon([px, py, qx, qy, qx + Math.cos(h2) * l2, qy + Math.sin(h2) * l2], [0.32, 0.22, 0.28, 0.18, 0.2, 0, 0.16, 0], [1, -1], j / n));
    }
    return out;
  }
  const BF_POOL = []; // 主要的大摺痕
  const BF_SHARD = []; // 旁邊的小摺片
  for (let i = 0; i < 24; i++) BF_POOL.push(bfCrease(4, 6, [0, 1, 1, 2][i % 4]));
  for (let i = 0; i < 12; i++) BF_SHARD.push(bfCrease(2, 3, 0));
  // 多邊形一律轉成同一個繞向，整批填在同一條路徑上時重疊處才不會變成洞
  function bfPush(arr, pts) {
    let area = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const j = (i + 2) % pts.length;
      area += pts[i] * pts[j + 1] - pts[j] * pts[i + 1];
    }
    if (area < 0) {
      for (let i = pts.length - 2; i >= 0; i -= 2) arr.push(pts[i], pts[i + 1]);
    } else for (let i = 0; i < pts.length; i++) arr.push(pts[i]);
  }
  // 把正規化的帶子（頂點已經轉到世界座標）展開成要畫的幾何：每段一個四邊形、折角兩個小三角、受光的半邊、受光的邊線
  function bfBuild(wv, rb, W) {
    const n = rb.n;
    const fill = []; // 每段 20 個數：四邊形 8 ＋ 折角三角 12（最後一段補 0）
    const lit = []; // 每段 8
    const edge = []; // 每段 4
    let pnx = 0;
    let pny = 0;
    let pa = 0;
    let pb = 0;
    for (let i = 0; i < n; i++) {
      const ax = wv[i * 2], ay = wv[i * 2 + 1], bx = wv[i * 2 + 2], by = wv[i * 2 + 3];
      const d = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / d;
      const ny = (bx - ax) / d;
      const a0 = rb.w[i * 4] * W, a1 = rb.w[i * 4 + 1] * W, b0 = rb.w[i * 4 + 2] * W, b1 = rb.w[i * 4 + 3] * W;
      const q = [ax + nx * a0, ay + ny * a0, bx + nx * a1, by + ny * a1, bx - nx * b1, by - ny * b1, ax - nx * b0, ay - ny * b0];
      const seg = [];
      bfPush(seg, q);
      if (i > 0) {
        // 折角：補上前一段尾端和這一段起點之間的縫（兩側各一個三角）
        bfPush(seg, [ax, ay, ax + pnx * pa, ay + pny * pa, ax + nx * a0, ay + ny * a0]);
        bfPush(seg, [ax, ay, ax - pnx * pb, ay - pny * pb, ax - nx * b0, ay - ny * b0]);
      } else for (let k = 0; k < 12; k++) seg.push(ax);
      for (const c of seg) fill.push(c);
      if (rb.lit[i] > 0) {
        bfPush(lit, [ax, ay, bx, by, q[2], q[3], q[0], q[1]]);
        edge.push(q[0], q[1], q[2], q[3]);
      } else {
        bfPush(lit, [ax, ay, bx, by, q[4], q[5], q[6], q[7]]);
        edge.push(q[6], q[7], q[4], q[5]);
      }
      pnx = nx;
      pny = ny;
      pa = a1;
      pb = b1;
    }
    return { n, t0: rb.t0, v: wv, fill: new Float32Array(fill), lit: new Float32Array(lit), edge: new Float32Array(edge) };
  }

  // 預先畫好的貼圖：命中點的暗紅暈、空間扭曲用的柔邊遮罩
  const bfCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h || w;
    return c;
  };
  const BF_GLOW = bfCanvas(64);
  (() => {
    const c = BF_GLOW.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(6,0,3,0.85)');
    g.addColorStop(0.3, 'rgba(60,0,10,0.5)');
    g.addColorStop(0.62, 'rgba(150,0,22,0.16)');
    g.addColorStop(1, 'rgba(150,0,22,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  })();
  const BF_MASK = bfCanvas(64);
  (() => {
    const c = BF_MASK.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  })();
  // 扭曲用的兩張暫存畫布（原樣、紅色版），大小不夠時才重配
  const BF_SNAP = bfCanvas(8);
  const BF_RED = bfCanvas(8);

  const FX = (G.fx = {
    particles: [],
    numbers: [],
    texts: [],
    pillars: [],
    slashes: [],
    rings: [],
    bolts: [],
    impacts: [],
    bfs: [],
    bfClock: 0,
    bfDistT: -9,
    bfDarkT: -9,
    darkFlash: 0,
    darkDur: 0.06,
    darkInv: false,
    darkAmt: 1,
    streaks: [],
    ghosts: [],
    waves: [],
    cuts: [],
    iaiDim: 0,
    kickX: 0,
    kickY: 0,
    hitstop: 0,
    shakeMag: 0,
    shakeT: 0,
    shakeX: 0,
    shakeY: 0,
    flash: 0,
    flashColor: '#fff',

    reset() {
      this.particles.length = 0;
      this.numbers.length = 0;
      this.texts.length = 0;
      this.pillars.length = 0;
      this.slashes.length = 0;
      this.rings.length = 0;
      this.bolts.length = 0;
      this.impacts.length = 0;
      this.bfs.length = 0;
      this.darkFlash = 0;
      this.streaks.length = 0;
      this.ghosts.length = 0;
      this.waves.length = 0;
      this.cuts.length = 0;
      this.iaiDim = 0;
      this.kickX = this.kickY = 0;
      this.hitstop = 0;
      this.hsCool = 0;
      this.shakeT = 0;
      this.flash = 0;
    },

    // 命中停頓會凍結整個世界（包括技能的計時），連擊時如果每一下都停滿，節奏會被拖慢、變得一頓一頓。
    // 所以停頓結束後的一小段時間內，新的停頓只給兩成；force（大招最後一擊）不受限制。
    addHitstop(t, force) {
      if (!force && this.hsCool > 0) t *= 0.2;
      t = Math.min(t, force ? 0.2 : 0.13);
      if (t > this.hitstop) this.hitstop = t;
      this.hsCool = Math.max(this.hsCool || 0, this.hitstop + 0.3);
    },

    // 震動：連擊時新的震動只補一點（不會一直疊到很大），最大 10；force（大招收尾）最大 16
    shake(mag, dur, force) {
      const cap = force ? 16 : 10;
      if (this.shakeT > 0 && !force) mag = Math.max(this.shakeMag, Math.min(cap, this.shakeMag + mag * 0.25));
      mag = Math.min(cap, mag);
      if (mag >= this.shakeMag || this.shakeT <= 0) {
        this.shakeMag = mag;
        this.shakeT = Math.max(dur, this.shakeT > 0 ? Math.min(this.shakeT, 0.25) : 0);
      }
    },

    screenFlash(color, amount) {
      this.flashColor = color;
      this.flash = Math.max(this.flash, amount);
    },

    burst(x, y, color, n, speed, opts) {
      opts = opts || {};
      for (let i = 0; i < n; i++) {
        const a = opts.angle != null ? opts.angle + U.rand(-opts.spread, opts.spread) : U.rand(0, Math.PI * 2);
        const s = U.rand(speed * 0.4, speed);
        this.particles.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - (opts.up || 0),
          life: U.rand(0.3, opts.life || 0.6),
          t: 0,
          size: U.rand(opts.size ? opts.size * 0.6 : 2, opts.size || 5),
          color: Array.isArray(color) ? U.pick(color) : color,
          grav: opts.grav != null ? opts.grav : 600,
          shape: opts.shape || 'circle',
          drag: opts.drag || 0,
        });
      }
    },

    // 飄浮的光點（升級、進化、稀有掉落用）
    sparkle(x, y, color, n, spread) {
      for (let i = 0; i < n; i++) {
        this.particles.push({
          x: x + U.rand(-spread, spread),
          y: y + U.rand(-spread, spread * 0.3),
          vx: U.rand(-20, 20),
          vy: U.rand(-120, -40),
          life: U.rand(0.6, 1.2),
          t: 0,
          size: U.rand(2, 4),
          color,
          grav: -20,
          shape: 'star',
          drag: 0,
        });
      }
    },

    // 楓之谷式傷害數字：多段傷害會往上疊
    damage(x, y, value, kind, stack) {
      this.numbers.push({
        x: x + U.rand(-6, 6),
        y: y - (stack || 0) * 30,
        value: String(value),
        kind: kind || 'normal',
        t: 0,
        life: kind === 'crit' ? 1.05 : 0.9,
      });
    },

    text(x, y, str, color, size, life, screen) {
      this.texts.push({ x, y, str, color: color || '#fff', size: size || 22, t: 0, life: life || 1.2, screen: !!screen });
    },

    pillar(x, y, color, life, width) {
      this.pillars.push({ x, y, color, t: 0, life: life || 1.2, w: width || 70 });
    },

    slash(x, y, dir, radius, color, kind) {
      this.slashes.push({ x, y, dir, r: radius || 40, color: color || '#fff', t: 0, life: 0.18, kind: kind || 'claw' });
    },

    ring(x, y, color, maxR, life, width) {
      this.rings.push({ x, y, color, r: 4, maxR: maxR || 80, t: 0, life: life || 0.4, w: width || 4 });
    },

    // 黑閃（咒術迴戰式）：命中瞬間空間扭曲（放射狀鼓起＋紅黑色差、極短的反相/壓暗），
    // 接著幾道粗的「摺痕」從命中點劈出去：直線段以銳角折來折去的黑色帶子，紅光只打在每一折的一側，
    // 像空間本身被揉皺；旁邊散著幾片小摺片，有一兩道貼著目標繞過去。
    // 形狀事先生成一組（BF_POOL／BF_SHARD），每次只做旋轉、縮放、彎曲。
    // s：放大倍率（五轉的地爆天星用大黑閃）；r：目標的大小（繞身摺痕的半徑）
    blackFlash(x, y, dir, s, r) {
      s = s || 1;
      dir = dir || 1;
      const big = s > 1.2;
      const list = this.bfs;
      // 同時存在的黑閃有上限：太多時丟掉最舊的（大黑閃優先保留）
      while (list.length >= BF_MAX) {
        let k = list.findIndex((f) => !f.big);
        if (k < 0) k = 0;
        list.splice(k, 1);
      }
      const busy = list.length >= 3;
      const Rw = Math.max(14, r || 22 * s) * 1.25;
      const f = { x, y, s, big, t: 0, life: 0.36, bolts: [], sparks: [], rw: Rw, dist: false };
      const sq = Math.sqrt(s);
      // 空間扭曲有頻率限制：連續黑閃時只有間隔夠久的那一發會扭曲畫面
      if (big || this.bfClock - this.bfDistT > 0.12) {
        f.dist = true;
        this.bfDistT = this.bfClock;
      }
      // 全畫面的一瞬間壓暗／反相：最多每 0.25 秒一次；反相更稀有（大黑閃或安靜一陣子之後）
      if (big || this.bfClock - this.bfDarkT > 0.25) {
        const inv = big || this.bfClock - this.bfDarkT > 0.9;
        this.bfDarkT = this.bfClock;
        this.darkFlash = this.darkDur = big ? 0.075 : 0.055;
        this.darkInv = inv;
        this.darkAmt = big ? 1 : 0.75;
      }
      const fwd = dir > 0 ? 0 : Math.PI; // 打飛的方向
      const back = fwd + Math.PI; // 攻擊者那一側
      const reach = (Rw + 40) * 1.65 * Math.pow(s, 0.55);
      const add = (g, kind) => {
        const src = kind === 'shard' ? BF_SHARD[(Math.random() * BF_SHARD.length) | 0] : BF_POOL[(Math.random() * BF_POOL.length) | 0];
        const flip = Math.random() < 0.5 ? -1 : 1;
        const W = (kind === 'shard' ? U.rand(3.4, 4.6) : U.rand(6, 8.2)) * sq;
        const ribbons = [];
        let map;
        if (kind === 'wrap') {
          // 繞著目標：沿著橢圓往前折，頂點的上下擺動變成半徑的起伏
          const a0 = back + U.rand(-1.2, 1.2);
          const span = U.rand(1.2, 2.2) * (Math.random() < 0.5 ? -1 : 1);
          const R = Rw * U.rand(0.95, 1.15);
          map = (u, v) => {
            const th = a0 + span * u;
            const rho = R * (1 - 0.7 * Math.pow(Math.max(0, 1 - u * 1.6), 3)) + v * R * 0.7;
            return [x + Math.cos(th) * rho * 1.1, y + Math.sin(th) * rho * 0.92];
          };
        } else {
          let ox = x;
          let oy = y;
          let a;
          let L;
          if (kind === 'shard') {
            // 小摺片：散在周圍，大致沿著切線方向
            const pa = U.rand(0, Math.PI * 2);
            const pd = Rw * U.rand(0.5, 1.3);
            ox = x + Math.cos(pa) * pd;
            oy = y + Math.sin(pa) * pd * 0.9;
            a = pa + Math.PI / 2 + U.rand(-0.7, 0.7);
            L = reach * U.rand(0.25, 0.4);
          } else {
            // 大摺痕：多半往打飛的方向竄，但四面都有
            a = Math.random() < 0.65 ? fwd + U.rand(-1.4, 1.4) : U.rand(0, Math.PI * 2);
            L = reach * U.rand(0.75, 1.1);
          }
          const ca = Math.cos(a) * L;
          const sa = Math.sin(a) * L;
          map = (u, v) => [ox + u * ca - v * sa, oy + u * sa + v * ca];
        }
        for (const rb of src) {
          const wv = new Float32Array(rb.v.length);
          for (let i = 0; i < rb.v.length; i += 2) {
            const q = map(rb.v[i], rb.v[i + 1] * flip);
            wv[i] = q[0];
            wv[i + 1] = q[1];
          }
          ribbons.push(bfBuild(wv, rb, W));
        }
        f.bolts.push({ g, ribbons });
      };
      // 主擊（group 0）：幾道大摺痕主導畫面，旁邊幾片小摺片；稍晚（group 1）再補一道小的
      const nMain = busy ? 2 : 3;
      const nWrap = busy ? 0 : 1;
      const nShard = busy ? 1 : big ? 3 : 2;
      for (let i = 0; i < nMain; i++) add(0, 'main');
      for (let i = 0; i < nWrap; i++) add(0, 'wrap');
      for (let i = 0; i < nShard; i++) add(0, 'shard');
      add(1, busy || Math.random() < 0.5 ? 'shard' : 'main');
      if (big) add(1, 'main');
      f.l0 = U.rand(0.14, 0.2) * (big ? 1.25 : 1);
      f.d1 = U.rand(0.04, 0.065);
      f.l1 = U.rand(0.1, 0.14) * (big ? 1.25 : 1);
      // 少量黑紅火花（跟著這個黑閃一起畫，才會蓋在地爆天星的石球上面）
      const ns = busy ? 3 : Math.round(7 * Math.min(2.2, sq));
      for (let i = 0; i < ns; i++) {
        const a = U.rand(0, Math.PI * 2);
        const v = U.rand(300, 640) * sq;
        f.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, red: i % 3 !== 0 });
      }
      f.slife = U.rand(0.2, 0.28);
      list.push(f);
    },

    // 命中瞬間的星形爆光
    impact(x, y, size, color) {
      this.impacts.push({ x, y, size: size || 40, color: color || '#ffffff', t: 0, life: 0.16, rot: Math.random() * Math.PI });
    },

    // 劃過目標的白色光痕
    streak(x, y, angle, len, color, width) {
      this.streaks.push({ x, y, a: angle, len: len || 90, color: color || '#ffffff', w: width || 6, t: 0, life: 0.14 });
    },

    // 殘影（飛撲時留下的獅子影子）
    ghost(x, y, dir, st, color) {
      this.ghosts.push({ x, y, dir, st: Object.assign({}, st), color: color || '#ffd98a', t: 0, life: 0.28 });
    },

    // 居合的刀痕：兩端尖、中間亮的細線，一瞬間劃開後停留、淡出
    cut(x, y, angle, len, opts) {
      const o = opts || {};
      this.cuts.push({ x, y, a: angle, len, w: o.w || 5, t: -(o.delay || 0), life: o.life || 0.32, grow: o.grow || 0.045, col: o.col || '255,214,120' });
    },

    // 扇形聲波
    wave(x, y, dir, reach, color, delay) {
      this.waves.push({ x, y, dir, reach: reach || 180, color: color || '255,236,170', t: -(delay || 0), life: 0.32 });
    },

    // 朝某個方向的鏡頭推力
    kick(dx, dy) {
      this.kickX += dx;
      this.kickY += dy;
    },

    // 塵土
    dust(x, y, dir, n) {
      for (let i = 0; i < (n || 8); i++) {
        this.particles.push({
          x: x + U.rand(-8, 8), y: y - 2,
          vx: -dir * U.rand(40, 200), vy: U.rand(-140, -30),
          life: U.rand(0.3, 0.55), t: 0, size: U.rand(4, 8),
          color: U.pick(['rgba(230,215,180,0.9)', 'rgba(205,185,150,0.9)']),
          grav: 200, shape: 'circle', drag: 3,
        });
      }
    },

    bolt(x, yTop, yBottom) {
      const pts = [];
      let cx = x;
      for (let y = yTop; y < yBottom; y += 18) {
        pts.push([cx, y]);
        cx = x + U.rand(-14, 14);
      }
      pts.push([x, yBottom]);
      this.bolts.push({ pts, t: 0, life: 0.25 });
    },

    update(dt) {
      if (this.hitstop > 0) this.hitstop -= dt;
      if (this.hsCool > 0) this.hsCool -= dt;
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        const m = this.shakeMag * Math.max(0, Math.min(1, this.shakeT * 6));
        // 平滑的震動：每 1/30 秒換一個目標點，畫面往那裡靠（不是每幀亂跳）
        this.shakeTick = (this.shakeTick || 0) - dt;
        if (this.shakeTick <= 0) {
          this.shakeTick = 1 / 30;
          this.shakeTx = U.rand(-m, m);
          this.shakeTy = U.rand(-m, m);
        }
        this.shakeX += (this.shakeTx - this.shakeX) * 0.6;
        this.shakeY += (this.shakeTy - this.shakeY) * 0.6;
        if (this.shakeT <= 0) this.shakeMag = 0;
      } else {
        this.shakeX *= 0.5;
        this.shakeY *= 0.5;
        if (Math.abs(this.shakeX) < 0.1) this.shakeX = this.shakeY = 0;
      }
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);

      const step = (arr, fn) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          const o = arr[i];
          o.t += dt;
          if (fn) fn(o);
          if (o.t >= o.life) arr.splice(i, 1);
        }
      };
      step(this.particles, (p) => {
        p.vy += p.grav * dt;
        if (p.drag) {
          p.vx *= 1 - p.drag * dt;
          p.vy *= 1 - p.drag * dt;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      });
      step(this.numbers);
      step(this.texts);
      step(this.pillars);
      step(this.slashes);
      step(this.rings, (r) => {
        r.r = 4 + (r.maxR - 4) * Math.max(0, Math.min(1, r.t / r.life));
      });
      step(this.bolts);
      step(this.impacts);
      this.bfClock += dt;
      for (let i = this.bfs.length - 1; i >= 0; i--) {
        const f = this.bfs[i];
        f.t += dt;
        const dr = Math.pow(0.015, dt);
        for (const p of f.sparks) {
          p.vx *= dr;
          p.vy = p.vy * dr + 500 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        if (f.t >= f.life) this.bfs.splice(i, 1);
      }
      if (this.darkFlash > 0) this.darkFlash -= dt;
      step(this.streaks);
      step(this.ghosts);
      step(this.cuts);
      if (this.iaiDim > 0) this.iaiDim = Math.max(0, this.iaiDim - dt);
      for (let i = this.waves.length - 1; i >= 0; i--) {
        const w = this.waves[i];
        w.t += dt;
        if (w.t >= w.life) this.waves.splice(i, 1);
      }
      const k = Math.pow(0.0005, dt);
      this.kickX *= k;
      this.kickY *= k;
    },

    drawGhosts(ctx) {
      for (const g of this.ghosts) {
        const k = g.t / g.life;
        ctx.globalAlpha = 0.45 * (1 - k);
        G.art.mode = 'tint';
        G.art.modeColor = g.color;
        G.art.modeAmt = 0.7;
        G.art.drawLion(ctx, g.x, g.y, g.dir, g.st);
        G.art.mode = null;
      }
      ctx.globalAlpha = 1;
    },

    drawWorld(ctx) {
      // 聲波
      for (const w of this.waves) {
        if (w.t < 0) continue;
        const k = w.t / w.life;
        const r = 30 + w.reach * Math.sqrt(k);
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.scale(w.dir, 1);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
        g.addColorStop(0, 'rgba(' + w.color + ',0)');
        g.addColorStop(0.8, 'rgba(' + w.color + ',' + (0.55 * (1 - k)).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + w.color + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, -0.75, 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(3) + ')';
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.92, -0.6, 0.6);
        ctx.stroke();
        ctx.restore();
      }

      // 光柱
      for (const p of this.pillars) {
        const k = p.t / p.life;
        const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
        const w = p.w * (0.6 + 0.4 * Math.sin(Math.min(1, k * 3) * Math.PI * 0.5));
        const g = ctx.createLinearGradient(0, p.y - 260, 0, p.y);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, p.color);
        ctx.globalAlpha = Math.max(0, a) * 0.8;
        ctx.fillStyle = g;
        ctx.fillRect(p.x - w / 2, p.y - 260, w, 260);
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.x - w * 0.12, p.y - 260, w * 0.24, 260);
      }
      ctx.globalAlpha = 1;

      // 攻擊軌跡
      for (const s of this.slashes) {
        const k = s.t / s.life;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(s.dir, 1);
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = s.color;
        ctx.lineCap = 'round';
        if (s.kind === 'claw') {
          for (let i = -1; i <= 1; i++) {
            ctx.lineWidth = 5 - Math.abs(i) * 1.5;
            ctx.beginPath();
            ctx.arc(-s.r * 0.3, i * 10, s.r, -1.0 + k * 0.4, 0.9 + k * 0.4);
            ctx.stroke();
          }
        } else {
          ctx.lineWidth = 8 * (1 - k) + 2;
          ctx.beginPath();
          ctx.arc(-s.r * 0.4, 0, s.r, -1.2, 1.2);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // 命中光痕與星形爆光
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const s of this.streaks) {
        const k = s.t / s.life;
        const len = s.len * (0.4 + k * 0.8);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.a);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(-len / 2, 0);
        ctx.quadraticCurveTo(0, -s.w * (1 - k), len / 2, 0);
        ctx.quadraticCurveTo(0, s.w * (1 - k), -len / 2, 0);
        ctx.fill();
        ctx.restore();
      }
      for (const im of this.impacts) {
        const k = im.t / im.life;
        const r = im.size * (0.5 + k * 0.8);
        ctx.save();
        ctx.translate(im.x, im.y);
        ctx.rotate(im.rot);
        ctx.globalAlpha = 1 - k;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, im.color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        const n = 8;
        for (let i = 0; i <= n * 2; i++) {
          const a = (i / (n * 2)) * Math.PI * 2;
          const rr = i % 2 ? r * 0.28 : r * (i % 4 ? 0.75 : 1);
          i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(rr, 0);
        }
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      for (const r of this.rings) {
        if (r.t < 0) continue;
        ctx.globalAlpha = 1 - r.t / r.life;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.w;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (const b of this.bolts) {
        ctx.globalAlpha = 1 - b.t / b.life;
        ctx.strokeStyle = '#fff6a8';
        ctx.lineWidth = b.w || 6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        b.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, (b.w || 6) / 3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (const p of this.particles) {
        const a = 1 - p.t / p.life;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.shape === 'star') {
          const s = p.size * (0.6 + a * 0.6);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - s * 2);
          ctx.lineTo(p.x + s * 0.5, p.y - s * 0.5);
          ctx.lineTo(p.x + s * 2, p.y);
          ctx.lineTo(p.x + s * 0.5, p.y + s * 0.5);
          ctx.lineTo(p.x, p.y + s * 2);
          ctx.lineTo(p.x - s * 0.5, p.y + s * 0.5);
          ctx.lineTo(p.x - s * 2, p.y);
          ctx.lineTo(p.x - s * 0.5, p.y - s * 0.5);
          ctx.fill();
        } else if (p.shape === 'square') {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      this.drawCuts(ctx);
      if (this.bfs.length) this.drawBlackFlash(ctx);
      this.drawNumbers(ctx);

      for (const t of this.texts) {
        if (t.screen) continue;
        this.drawFloatText(ctx, t);
      }
    },

    // ── 黑閃 ──
    drawBlackFlash(ctx) {
      const list = this.bfs;
      // 1. 空間扭曲：只做最新的一發（每幀最多一次）
      for (let i = list.length - 1; i >= 0; i--) {
        const f = list[i];
        if (!f.dist) continue;
        const dur = f.big ? 0.13 : 0.09;
        if (f.t < dur) this.bfDistort(ctx, f, f.t / dur);
        break;
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const f of list) {
        const s = f.s;
        const sq = Math.sqrt(s);
        // 2. 命中點的暗紅暈（很快收掉）
        const gk = f.t / (f.big ? 0.2 : 0.14);
        if (gk < 1) {
          const gr = (f.rw * 0.9 + 26) * (0.7 + 0.5 * gk);
          ctx.globalAlpha = (1 - gk) * (1 - gk);
          ctx.drawImage(BF_GLOW, f.x - gr, f.y - gr, gr * 2, gr * 2);
        }
        // 3. 暗色震波圈：細、淡、快
        const rk = f.t / (f.big ? 0.3 : 0.22);
        if (rk < 1) {
          const e = 1 - (1 - rk) * (1 - rk);
          const rr = 10 + (f.rw * 1.9 + 44 * s) * e;
          ctx.globalAlpha = 1 - rk;
          ctx.strokeStyle = 'rgba(12,0,5,0.5)';
          ctx.lineWidth = (3.2 * (1 - rk) + 0.6) * sq;
          ctx.beginPath();
          ctx.ellipse(f.x, f.y, rr, rr * 0.9, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(190,0,30,0.4)';
          ctx.lineWidth = 0.8 * sq;
          ctx.beginPath();
          ctx.ellipse(f.x, f.y, rr * 0.96, rr * 0.86, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // 4. 摺痕：兩組（主擊、餘電）。每組把所有帶子拼成四條路徑：暗紅外暈（中線）、黑色帶子、受光的暗紅半面、受光側的紅邊
        for (let g = 0; g < 2; g++) {
          const age = g ? f.t - f.d1 : f.t;
          const life = g ? f.l1 : f.l0;
          if (age < 0 || age >= life) continue;
          const k = age / life;
          const grow = Math.min(1, age / 0.03 + 0.2);
          // 閃爍：前段全亮，之後隨機暗掉、又亮回來
          let al = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;
          if (k > 0.4 && Math.random() < 0.25) al *= 0.45;
          if (al <= 0.02) continue;
          const pC = new Path2D();
          const pB = new Path2D();
          const pL = new Path2D();
          const pE = new Path2D();
          let any = false;
          for (const b of f.bolts) {
            if (b.g !== g) continue;
            for (const rb of b.ribbons) {
              const c = Math.ceil(rb.n * Math.max(0, Math.min(1, (grow - rb.t0) / Math.max(0.05, 1 - rb.t0))));
              if (c < 1) continue;
              any = true;
              const v = rb.v;
              pC.moveTo(v[0], v[1]);
              for (let i = 1; i <= c; i++) pC.lineTo(v[i * 2], v[i * 2 + 1]);
              const F = rb.fill;
              const Lp = rb.lit;
              const E = rb.edge;
              for (let i = 0; i < c; i++) {
                let o = i * 20;
                pB.moveTo(F[o], F[o + 1]);
                pB.lineTo(F[o + 2], F[o + 3]);
                pB.lineTo(F[o + 4], F[o + 5]);
                pB.lineTo(F[o + 6], F[o + 7]);
                pB.closePath();
                if (i > 0) {
                  for (o += 8; o < i * 20 + 20; o += 6) {
                    pB.moveTo(F[o], F[o + 1]);
                    pB.lineTo(F[o + 2], F[o + 3]);
                    pB.lineTo(F[o + 4], F[o + 5]);
                    pB.closePath();
                  }
                }
                o = i * 8;
                pL.moveTo(Lp[o], Lp[o + 1]);
                pL.lineTo(Lp[o + 2], Lp[o + 3]);
                pL.lineTo(Lp[o + 4], Lp[o + 5]);
                pL.lineTo(Lp[o + 6], Lp[o + 7]);
                pL.closePath();
                o = i * 4;
                pE.moveTo(E[o], E[o + 1]);
                pE.lineTo(E[o + 2], E[o + 3]);
              }
            }
          }
          if (!any) continue;
          ctx.globalAlpha = al;
          ctx.lineJoin = 'miter';
          ctx.miterLimit = 6;
          ctx.strokeStyle = 'rgba(150,0,22,0.15)';
          ctx.lineWidth = 10 * sq;
          ctx.stroke(pC);
          ctx.fillStyle = '#040002';
          ctx.fill(pB);
          ctx.fillStyle = 'rgba(70,0,12,0.8)';
          ctx.fill(pL);
          ctx.strokeStyle = '#e0142e';
          ctx.lineWidth = 1.3 * sq;
          ctx.lineCap = 'butt';
          ctx.stroke(pE);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
        // 5. 黑紅火花：細短的線段，沿著速度方向拉長
        const sk = f.t / f.slife;
        if (sk < 1 && f.sparks.length) {
          ctx.globalAlpha = 1 - sk;
          ctx.lineWidth = 1.3 * sq;
          for (let c = 0; c < 2; c++) {
            ctx.strokeStyle = c ? '#ff2a40' : '#0a0004';
            ctx.beginPath();
            for (const p of f.sparks) {
              if (p.red !== !!c) continue;
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
            }
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    },

    // 空間扭曲：把命中點附近的畫面抓下來，放大一點貼回去（往外推的鼓起），
    // 再錯開貼一張紅色版（加亮）和一張原樣（相乘壓暗）→ 紅黑色差。只在前 0.1 秒左右。
    bfDistort(ctx, f, k) {
      const cv = ctx.canvas;
      const m = ctx.getTransform();
      const sc = Math.hypot(m.a, m.b);
      const dx = m.a * f.x + m.c * f.y + m.e;
      const dy = m.b * f.x + m.d * f.y + m.f;
      const R = Math.min(320, (f.rw * 1.5 + 50 * Math.sqrt(f.s)) * sc) | 0;
      const x0 = Math.max(0, (dx - R) | 0);
      const y0 = Math.max(0, (dy - R) | 0);
      const x1 = Math.min(cv.width, (dx + R) | 0);
      const y1 = Math.min(cv.height, (dy + R) | 0);
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 8 || h < 8) return;
      if (BF_SNAP.width < w || BF_SNAP.height < h) {
        BF_SNAP.width = BF_RED.width = Math.max(BF_SNAP.width, w);
        BF_SNAP.height = BF_RED.height = Math.max(BF_SNAP.height, h);
      }
      const o = BF_SNAP.getContext('2d');
      o.globalCompositeOperation = 'copy';
      o.drawImage(cv, x0, y0, w, h, 0, 0, w, h);
      o.globalCompositeOperation = 'destination-in';
      o.drawImage(BF_MASK, dx - R - x0, dy - R - y0, R * 2, R * 2);
      o.globalCompositeOperation = 'source-over';
      const r = BF_RED.getContext('2d');
      r.globalCompositeOperation = 'copy';
      r.drawImage(BF_SNAP, 0, 0, w, h, 0, 0, w, h);
      r.globalCompositeOperation = 'source-atop';
      r.fillStyle = 'rgba(255,0,30,0.55)';
      r.fillRect(0, 0, w, h);
      r.globalCompositeOperation = 'source-over';
      const amp = (1 - k) * (f.big ? 1.3 : 1);
      // 先向內吸、再往外推：前 30% 縮小，之後放大
      const z = 1 + (k < 0.3 ? -0.05 * (k / 0.3) : 0.09 * (1 - k)) * (f.big ? 1.4 : 1);
      const off = (3 + 2 * Math.sqrt(f.s)) * sc * amp * 0.5;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = Math.min(1, 0.95 * amp + 0.1);
      ctx.drawImage(BF_SNAP, 0, 0, w, h, dx + (x0 - dx) * z, dy + (y0 - dy) * z, w * z, h * z);
      ctx.globalAlpha = Math.min(1, 0.6 * amp);
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(BF_SNAP, 0, 0, w, h, x0 - off, y0 - off * 0.35, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(BF_RED, 0, 0, w, h, x0 + off, y0 + off * 0.35, w, h);
      ctx.restore();
    },

    drawCuts(ctx) {
      if (this.iaiDim > 0) {
        // 居合前的一瞬間：四周暗下來
        ctx.fillStyle = 'rgba(8,6,18,' + Math.min(0.55, this.iaiDim * 2.2).toFixed(3) + ')';
        ctx.fillRect(-1e5, -1e5, 2e5, 2e5);
      }
      if (G.skillExec && G.skillExec.drawUlt) G.skillExec.drawUlt(ctx);
      if (!this.cuts.length) return;
      ctx.save();
      for (const c of this.cuts) {
        if (c.t < 0) continue;
        const grow = Math.min(1, c.t / c.grow);
        const fadeT = Math.min(0.14, c.life * 0.4);
        const fade = c.t < c.life - fadeT ? 1 : (c.life - c.t) / fadeT;
        if (fade <= 0) continue;
        const ca = Math.cos(c.a);
        const sa = Math.sin(c.a);
        const h = c.len / 2;
        // 從一端劃到另一端
        const x0 = c.x - ca * h;
        const y0 = c.y - sa * h;
        const L = c.len * grow;
        const x1 = x0 + ca * L;
        const y1 = y0 + sa * L;
        const mx = (x0 + x1) / 2;
        const my = (y0 + y1) / 2;
        const blade = (w, style) => {
          ctx.fillStyle = style;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(mx - sa * w, my + ca * w);
          ctx.lineTo(x1, y1);
          ctx.lineTo(mx + sa * w, my - ca * w);
          ctx.closePath();
          ctx.fill();
        };
        ctx.globalCompositeOperation = 'lighter';
        blade(c.w * 2.2, 'rgba(' + c.col + ',' + (0.22 * fade).toFixed(3) + ')');
        ctx.globalCompositeOperation = 'source-over';
        blade(c.w * (0.35 + 0.65 * fade), 'rgba(255,255,255,' + Math.min(0.95, fade * 1.1).toFixed(3) + ')');
      }
      ctx.restore();
    },

    drawScreen(ctx) {
      for (const t of this.texts) {
        if (t.screen) this.drawFloatText(ctx, t);
      }
      if (this.darkFlash > 0) {
        // 黑閃瞬間（1–4 幀）：第一幀畫面反相成暗紅的負片，之後是一下壓暗＋四周泛紅
        const k = Math.max(0, this.darkFlash / this.darkDur);
        const a = this.darkAmt;
        ctx.save();
        if (this.darkInv && k > 0.66) {
          ctx.globalCompositeOperation = 'difference';
          ctx.globalAlpha = a;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, G.W, G.H);
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = '#801018';
          ctx.fillRect(0, 0, G.W, G.H);
        } else {
          ctx.fillStyle = 'rgba(6,0,3,' + (0.34 * k * a).toFixed(3) + ')';
          ctx.fillRect(0, 0, G.W, G.H);
          const g = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.3, G.W / 2, G.H / 2, G.H * 0.85);
          g.addColorStop(0, 'rgba(150,0,20,0)');
          g.addColorStop(1, 'rgba(150,0,20,' + (0.4 * k * a).toFixed(3) + ')');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, G.W, G.H);
        }
        ctx.restore();
      }
      if (this.flash > 0) {
        ctx.globalAlpha = Math.min(1, this.flash);
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, G.W, G.H);
        ctx.globalAlpha = 1;
      }
    },

    drawFloatText(ctx, t) {
      const k = t.t / t.life;
      const rise = t.screen ? 0 : -k * 40;
      const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.5 : k < 0.2 ? 1.1 - ((k - 0.12) / 0.08) * 0.1 : 1;
      ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      ctx.font = 'bold ' + Math.round(t.size * pop) + 'px ' + G.art.FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(40,20,10,0.9)';
      ctx.strokeText(t.str, t.x, t.y + rise);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y + rise);
      ctx.globalAlpha = 1;
    },

    drawNumbers(ctx) {
      const style = {
        normal: { size: 30, top: '#fff7c2', bottom: '#ffb52e', stroke: '#5a2a00' },
        crit: { size: 42, top: '#ff8a8a', bottom: '#d0101e', stroke: '#140004' },
        player: { size: 30, top: '#f3c6ff', bottom: '#b03cd6', stroke: '#2a0036' },
        heal: { size: 26, top: '#d4ffd0', bottom: '#35c24a', stroke: '#063a10' },
        mp: { size: 26, top: '#d6ecff', bottom: '#3d8cff', stroke: '#06224a' },
        miss: { size: 24, top: '#ffffff', bottom: '#bbbbbb', stroke: '#333333' },
      };
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      for (const n of this.numbers) {
        const st = style[n.kind] || style.normal;
        const k = n.t / n.life;
        // 彈出 → 停住 → 往上淡出
        const pop = k < 0.08 ? 0.4 + (k / 0.08) * 0.9 : k < 0.16 ? 1.3 - ((k - 0.08) / 0.08) * 0.3 : 1;
        const rise = k < 0.5 ? -k * 30 : -15 - (k - 0.5) * 80;
        const size = Math.round(st.size * pop);
        ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        ctx.font = 'bold ' + size + 'px ' + G.art.NUMFONT;
        const y = n.y + rise;
        ctx.lineWidth = 7;
        ctx.strokeStyle = st.stroke;
        ctx.strokeText(n.value, n.x, y);
        const g = ctx.createLinearGradient(0, y - size, 0, y);
        g.addColorStop(0, st.top);
        g.addColorStop(1, st.bottom);
        ctx.fillStyle = g;
        ctx.fillText(n.value, n.x, y);
        if (n.kind === 'crit' && k < 0.8) {
          // 黑閃：黑字、細紅邊、微微斜體；剛出現時抖幾下，還帶一點紅色錯位
          const ty = y - size - 3;
          const jit = k < 0.14 ? (1 - k / 0.14) * 2.2 : 0;
          const jx = jit ? (Math.random() - 0.5) * 2 * jit : 0;
          const jy = jit ? (Math.random() - 0.5) * 2 * jit : 0;
          ctx.save();
          ctx.translate(n.x + jx, ty + jy);
          ctx.transform(1, 0, -0.2, 1, 0, 0);
          ctx.font = '900 ' + (k < 0.06 ? 18 : 16) + 'px ' + G.art.FONT;
          if (jit) {
            const ga = ctx.globalAlpha;
            ctx.globalAlpha = ga * 0.6;
            ctx.fillStyle = '#ff1a34';
            ctx.fillText('黑閃！', 2 + jit, 0);
            ctx.globalAlpha = ga;
          }
          ctx.lineJoin = 'miter';
          ctx.miterLimit = 3;
          ctx.lineWidth = 2.6;
          ctx.strokeStyle = '#d0102a';
          ctx.strokeText('黑閃！', 0, 0);
          ctx.fillStyle = '#050002';
          ctx.fillText('黑閃！', 0, 0);
          ctx.restore();
          ctx.lineJoin = 'round';
        }
      }
      ctx.globalAlpha = 1;
    },
  });

  FX.reset();
})();
