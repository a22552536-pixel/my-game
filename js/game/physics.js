// 單向平台物理（楓之谷式：從下面可以穿上去，從上面落下會站住）。
// body：{ x, y（腳底）, vx, vy, onGround, plat, ignorePlat, ignoreT, halfW }
//
// 地面起伏：第 0 個平台（地面）可以有高低起伏的表面（小山丘、緩坡、窪地）。
// 起伏資料：地圖的 groundProfile，或 G.data.terrain[地圖 id]：[[x, dy], ...]（dy 相對平台 y，負的是隆起）。
// 控制點之間用餘弦內插（每個控制點上是平的），第一次用到時預先算成每 2px 一格的表。
// 所有「站在／落在／放在地面上」的 y 都要經過 surfaceY(map, i, x) / groundY(map, x)；浮空平台一律是平的。
(function () {
  'use strict';
  const U = G.util;
  const STEP = 2;

  // 找出地圖 id（地圖物件本身不記 id），然後把起伏表算好，存在 map._gp（沒有起伏就是 null）
  function terrain(map) {
    if (!map) return null;
    if (map._gpDone === map.platforms) return map._gp;
    let prof = map.groundProfile;
    if (!prof) {
      const T = G.data.terrain;
      if (T) {
        const M = G.data.maps;
        const pr = Object.getPrototypeOf(map);
        for (const k in M) if (M[k] === map || (M[k] === pr && pr.platforms === map.platforms)) { prof = T[k]; break; }
      }
    }
    map._gp = null;
    const p0 = map.platforms && map.platforms[0];
    if (prof && prof.length && p0) {
      const pts = prof.slice().sort((a, b) => a[0] - b[0]);
      const x0 = p0[0];
      const n = Math.ceil((p0[1] - p0[0]) / STEP) + 2;
      const a = new Float32Array(n);
      let j = 0;
      let lo = 0;
      let hi = 0;
      for (let k = 0; k < n; k++) {
        const x = x0 + k * STEP;
        while (j < pts.length - 1 && pts[j + 1][0] <= x) j++;
        let v;
        if (x <= pts[0][0]) v = pts[0][1];
        else if (j >= pts.length - 1) v = pts[pts.length - 1][1];
        else {
          const A = pts[j];
          const B = pts[j + 1];
          const f = (x - A[0]) / (B[0] - A[0]);
          v = A[1] + (B[1] - A[1]) * (0.5 - 0.5 * Math.cos(Math.PI * f));
        }
        a[k] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      map._gp = { x0, a, lo, hi, base: p0[2] };
      // 下端落在地面的繩子：下端跟著地表（繩子附近的地形本來就是平的）
      (map.ropes || []).forEach((r) => {
        if (Math.abs(r[2] - p0[2]) < 1 && r[0] >= p0[0] && r[0] <= p0[1]) r[2] = p0[2] + dyAt(map._gp, r[0]);
      });
    }
    map._gpDone = map.platforms;
    return map._gp;
  }
  function dyAt(gp, x) {
    let f = (x - gp.x0) / STEP;
    const a = gp.a;
    if (f <= 0) return a[0];
    const k = f | 0;
    if (k >= a.length - 1) return a[a.length - 1];
    f -= k;
    return a[k] + (a[k + 1] - a[k]) * f;
  }

  G.physics = {
    terrain,
    // 地面在 x 的起伏量（相對 platforms[0][2]；沒有起伏就是 0）
    groundDy(map, x) {
      const gp = terrain(map);
      return gp ? dyAt(gp, x) : 0;
    },
    // 平台 i 在 x 可以站的表面高度（浮空平台是平的）
    surfaceY(map, i, x) {
      const p = map.platforms[i];
      if (!p) return map.platforms[0][2];
      if (i !== 0) return p[2];
      const gp = terrain(map);
      return gp ? p[2] + dyAt(gp, x) : p[2];
    },
    groundY(map, x) {
      const p = map.platforms[0];
      const gp = terrain(map);
      return gp ? p[2] + dyAt(gp, x) : p[2];
    },
    // 地面在 x 的坡度（dy/dx）
    groundSlope(map, x) {
      const gp = terrain(map);
      return gp ? (dyAt(gp, x + 3) - dyAt(gp, x - 3)) / 6 : 0;
    },
    // 貼在地面上的東西（中心 x、y，半徑 r）要跟著地表斜切的斜率；不在地面上（或地面是平的）就是 0
    groundShear(map, x, y, r) {
      const gp = terrain(map);
      if (!gp) return 0;
      const g = map.platforms[0][2] + dyAt(gp, x);
      if (Math.abs(y - g) > 3) return 0;
      const h = Math.max(12, Math.min(160, r || 40));
      const k = (dyAt(gp, x + h) - dyAt(gp, x - h)) / (2 * h);
      return Math.abs(k) < 0.01 ? 0 : k;
    },
    // 沿著地表畫一條帶子（預警帶）：x0～x1，上緣 = 地表 + top，下緣 = 地表 + bot；呼叫前先設好 fillStyle
    fillGroundBand(ctx, map, x0, x1, top, bot) {
      const gp = terrain(map);
      if (x1 < x0) [x0, x1] = [x1, x0];
      const g0 = map.platforms[0][2];
      if (!gp) return ctx.fillRect(x0, g0 + top, x1 - x0, bot - top);
      const n = Math.max(2, Math.ceil((x1 - x0) / 16));
      ctx.beginPath();
      for (let k = 0; k <= n; k++) {
        const x = x0 + ((x1 - x0) * k) / n;
        ctx.lineTo(x, g0 + dyAt(gp, x) + top);
      }
      for (let k = n; k >= 0; k--) {
        const x = x0 + ((x1 - x0) * k) / n;
        ctx.lineTo(x, g0 + dyAt(gp, x) + bot);
      }
      ctx.closePath();
      ctx.fill();
    },
    // 畫一張「貼在地面上」的圖（裂縫、坑）：切成直條，每條跟著地表起伏上下移（refX 是圖原本對齊的地表位置）
    drawOnGround(ctx, map, img, sx, sy, sw, sh, dx, dy, refX) {
      const gp = terrain(map);
      if (!gp) return ctx.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
      const r0 = dyAt(gp, refX);
      for (let u = 0; u < sw; u += 4) {
        const w = Math.min(4, sw - u);
        const off = dyAt(gp, dx + u + w / 2) - r0;
        ctx.drawImage(img, sx + u, sy, w, sh, dx + u, dy + off, w + 0.6, sh);
      }
    },
    // 地面最高／最低處（相對 platforms[0][2]）
    groundRange(map) {
      const gp = terrain(map);
      return gp ? { lo: gp.lo, hi: gp.hi } : { lo: 0, hi: 0 };
    },

    step(body, dt, map, opts) {
      opts = opts || {};
      const B = G.data.balance;
      const P = map.platforms;
      const gp = terrain(map);
      const g0 = P[0][2];
      if (body.ignoreT > 0) {
        body.ignoreT -= dt;
        if (body.ignoreT <= 0) body.ignorePlat = -1;
      }
      if (!body.onGround && !opts.noGravity) {
        body.vy = Math.min(body.vy + B.gravity * (opts.gravScale || 1) * dt, B.maxFall);
      }
      const prevY = body.y;
      const prevX = body.x;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      const hw = body.halfW || 16;
      body.x = U.clamp(body.x, hw, map.w - hw);

      if (body.onGround) {
        const p = P[body.plat];
        if (p && body.x >= p[0] && body.x <= p[1] && body.vy >= 0) {
          body.y = body.plat === 0 && gp ? g0 + dyAt(gp, body.x) : p[2];
          body.vy = 0;
          return false;
        }
        body.onGround = false;
        if (body.vy > 0) body.vy = 0;
      }

      if (body.vy >= 0) {
        let best = -1;
        let bestY = Infinity;
        for (let i = 0; i < P.length; i++) {
          if (i === body.ignorePlat) continue;
          if (opts.onlyPlat != null && i !== opts.onlyPlat) continue;
          const p = P[i];
          if (body.x < p[0] || body.x > p[1]) continue;
          if (i === 0 && gp) {
            // 起伏的地面是實心的：落到表面以下就站上去（斜坡上水平移動、瞬移進山丘裡也一樣）
            const sy = g0 + dyAt(gp, body.x);
            if (body.y >= sy && sy < bestY) {
              best = i;
              bestY = sy;
            }
            continue;
          }
          if (prevY <= p[2] + 0.5 && body.y >= p[2] && p[2] < bestY) {
            best = i;
            bestY = p[2];
          }
        }
        if (best >= 0) {
          body.y = bestY;
          body.vy = 0;
          body.onGround = true;
          body.plat = best;
          return true; // 剛落地
        }
      }
      // 保險：掉出地圖就放回地面
      if (body.y > map.h + 300) {
        body.y = gp ? g0 + dyAt(gp, body.x) : g0;
        body.vy = 0;
        body.onGround = true;
        body.plat = 0;
      }
      return false;
    },

    // 找出 x 位置、在 y 下方最近的平台
    platformBelow(map, x, y) {
      let best = -1;
      let bestY = Infinity;
      const P = map.platforms;
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        if (x < p[0] || x > p[1]) continue;
        const s = i === 0 ? this.groundY(map, x) : p[2];
        if (s >= y - 1 && s < bestY) {
          best = i;
          bestY = s;
        }
      }
      return best;
    },

    platformAt(map, x, y) {
      for (let i = 0; i < map.platforms.length; i++) {
        const p = map.platforms[i];
        if (x >= p[0] && x <= p[1] && Math.abs((i === 0 ? this.groundY(map, x) : p[2]) - y) < 2) return i;
      }
      return -1;
    },
  };
})();
