// 單向平台物理（楓之谷式：從下面可以穿上去，從上面落下會站住）。
// body：{ x, y（腳底）, vx, vy, onGround, plat, ignorePlat, ignoreT, halfW }
//
// 起伏的地形：每個平台都可以有高低起伏的表面（地面的小山丘、陡坡、小坑；浮空平台的拱起、下垂、傾斜、階梯）。
// 起伏資料：地圖的 groundProfile（只給地面），或 G.data.terrain[地圖 id]：
//   ・陣列 [[x, dy], ...]：只有地面（第 0 個平台）
//   ・物件 { 0: [[x, dy], ...], 3: [...], pools: [[x1, x2], ...] }：依平台索引（pools 是地面上積水的坑，只影響畫面）
// dy 相對平台 y（負的是隆起），控制點之間用餘弦內插（每個控制點上是平的），第一次用到時預先算成每 2px 一格的表。
// 所有「站在／落在／放在平台上」的 y 都要經過 surfaceY(map, i, x) / groundY(map, x)。
// 地面是實心的（掉進表面以下就站上去）；浮空平台照舊只能從上面站上去。
// 太陡的坡（比 STEEP 陡，坑壁、岩壁）走不上去，要跳；怪物只在不陡的那一段裡活動（walkSpan）。
(function () {
  'use strict';
  const U = G.util;
  const STEP = 2;
  const STEEP = 1.15; // 走得上去的最大坡度（約 49°；地形資料裡能走的坡都 ≤ 1.0，走不上去的坑壁都 ≥ 1.4）
  const STEEP_MOB = 1.1;

  function buildTable(pts0, p) {
    const pts = pts0.slice().sort((a, b) => a[0] - b[0]);
    const x0 = p[0];
    const n = Math.ceil((p[1] - p[0]) / STEP) + 2;
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
    // 怪物能走的段落：坡度不超過 STEEP_MOB 的連續區間
    const spans = [];
    let s0 = p[0];
    for (let k = 1; k < n; k++) {
      if (Math.abs(a[k] - a[k - 1]) / STEP > STEEP_MOB) {
        const xe = x0 + (k - 1) * STEP;
        if (xe - s0 > 0) spans.push([s0, xe]);
        s0 = x0 + k * STEP;
      }
    }
    if (p[1] - s0 > 0) spans.push([s0, p[1]]);
    return { x0, a, lo, hi, spans, steep: spans.length > 1 };
  }

  // 找出地圖 id（地圖物件本身不記 id），然後把起伏表算好，存在 map._gps[i]（沒有起伏就是 null）；map._gp 是地面那一張
  function terrains(map) {
    if (!map || !map.platforms) return null;
    if (map._gpDone === map.platforms) return map._gps;
    let prof = map.groundProfile;
    if (!prof) {
      const T = G.data.terrain;
      if (T) {
        const M = G.data.maps;
        const pr = Object.getPrototypeOf(map);
        for (const k in M) if (M[k] === map || (M[k] === pr && pr.platforms === map.platforms)) { prof = T[k]; break; }
      }
    }
    const P = map.platforms;
    const gps = P.map(() => null);
    let any = false;
    if (prof) {
      const byPlat = Array.isArray(prof) ? { 0: prof } : prof;
      for (const k in byPlat) {
        const i = +k;
        if (!(i >= 0) || !P[i] || !Array.isArray(byPlat[k]) || !byPlat[k].length) continue;
        gps[i] = buildTable(byPlat[k], P[i]);
        any = true;
      }
      map._pools = (!Array.isArray(prof) && prof.pools) || null;
      map._pits = (!Array.isArray(prof) && prof.pits) || null;
    }
    map._gps = any ? gps : null;
    map._gp = any ? gps[0] : null;
    map._gpDone = map.platforms;
    if (any) {
      // 繩子的上端、下端落在有起伏的平台上：跟著表面（繩子附近的地形本來就是平的）
      (map.ropes || []).forEach((r) => {
        for (const e of [1, 2]) {
          for (let i = 0; i < P.length; i++) {
            const p = P[i];
            if (!gps[i] || Math.abs(r[e] - p[2]) >= 1 || r[0] < p[0] || r[0] > p[1]) continue;
            r[e] = p[2] + dyAt(gps[i], r[0]);
            break;
          }
        }
      });
    }
    return map._gps;
  }
  function terrain(map) {
    return terrains(map) ? map._gp : null;
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
  const tab = (map, i) => {
    const t = terrains(map);
    return t ? t[i] : null;
  };

  G.physics = {
    STEEP,
    terrain,
    terrains,
    // 平台 i 在 x 的起伏量（相對 platforms[i][2]）
    surfDy(map, i, x) {
      const gp = tab(map, i);
      return gp ? dyAt(gp, x) : 0;
    },
    groundDy(map, x) {
      const gp = tab(map, 0);
      return gp ? dyAt(gp, x) : 0;
    },
    // 平台 i 在 x 可以站的表面高度
    surfaceY(map, i, x) {
      const p = map.platforms[i];
      if (!p) return this.groundY(map, x);
      const gp = tab(map, i);
      return gp ? p[2] + dyAt(gp, x) : p[2];
    },
    groundY(map, x) {
      const p = map.platforms[0];
      const gp = tab(map, 0);
      return gp ? p[2] + dyAt(gp, x) : p[2];
    },
    // 坡度（dy/dx，往右下是正的）
    surfSlope(map, i, x) {
      const gp = tab(map, i);
      return gp ? (dyAt(gp, x + 3) - dyAt(gp, x - 3)) / 6 : 0;
    },
    groundSlope(map, x) {
      return this.surfSlope(map, 0, x);
    },
    // 平台 i 上、x 所在的「怪物走得了」的區間（被太陡的坡隔開）；平的平台就是整塊
    walkSpan(map, i, x) {
      const p = map.platforms[i];
      const gp = tab(map, i);
      if (!gp || !gp.steep) return [p[0], p[1]];
      for (const s of gp.spans) if (x >= s[0] - 1 && x <= s[1] + 1) return s;
      return [x, x];
    },
    // 貼在平台表面上的東西（中心 x、y，半徑 r）要跟著表面斜切的斜率；不在表面上（或表面是平的）就是 0
    groundShear(map, x, y, r) {
      if (!terrains(map)) return 0;
      const i = this.platformAt(map, x, y, 3);
      const gp = i >= 0 ? tab(map, i) : null;
      if (!gp) return 0;
      const h = Math.max(12, Math.min(160, r || 40));
      const k = (dyAt(gp, x + h) - dyAt(gp, x - h)) / (2 * h);
      return Math.abs(k) < 0.01 ? 0 : U.clamp(k, -1.2, 1.2);
    },
    // 沿著地表畫一條帶子（預警帶）：x0～x1，上緣 = 地表 + top，下緣 = 地表 + bot；呼叫前先設好 fillStyle
    fillGroundBand(ctx, map, x0, x1, top, bot) {
      const gp = tab(map, 0);
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
    // 畫一張「貼在平台表面上」的圖（裂縫、坑）：切成直條，每條跟著表面起伏上下移（refX 是圖原本對齊的位置）
    drawOnGround(ctx, map, img, sx, sy, sw, sh, dx, dy, refX, plat) {
      const gp = tab(map, plat || 0);
      if (!gp) return ctx.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
      const r0 = dyAt(gp, refX);
      for (let u = 0; u < sw; u += 4) {
        const w = Math.min(4, sw - u);
        const off = dyAt(gp, dx + u + w / 2) - r0;
        ctx.drawImage(img, sx + u, sy, w, sh, dx + u, dy + off, w + 0.6, sh);
      }
    },
    // 最高／最低處（相對 platforms[i][2]）
    surfRange(map, i) {
      const gp = tab(map, i);
      return gp ? { lo: gp.lo, hi: gp.hi } : { lo: 0, hi: 0 };
    },
    groundRange(map) {
      return this.surfRange(map, 0);
    },
    // x 附近（±r）地面最深的地方（鏡頭往下多看一點，坑底才不會被 HUD 蓋住）
    groundDipNear(map, x, r) {
      const gp = tab(map, 0);
      if (!gp || gp.hi <= 0) return 0;
      let m = 0;
      for (let d = -r; d <= r; d += 24) m = Math.max(m, dyAt(gp, x + d));
      return m;
    },

    step(body, dt, map, opts) {
      opts = opts || {};
      const B = G.data.balance;
      const P = map.platforms;
      const gps = terrains(map);
      const gp = gps ? gps[0] : null;
      const g0 = P[0][2];
      body.blocked = 0;
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
          const gpi = gps && gps[body.plat];
          if (gpi) {
            const sNew = p[2] + dyAt(gpi, body.x);
            const sOld = p[2] + dyAt(gpi, prevX);
            const dx = Math.abs(body.x - prevX);
            // 太陡的上坡（坑壁、岩壁）：走不上去
            if (!opts.steepOK && dx > 0.01 && sOld - sNew > STEEP * dx + 0.01) {
              body.blocked = body.x > prevX ? 1 : -1;
              body.x = prevX;
              body.vx = 0;
              body.y = sOld;
            } else body.y = sNew;
          } else body.y = p[2];
          body.vy = 0;
          return false;
        }
        body.onGround = false;
        if (body.vy > 0) body.vy = 0;
      }

      // 實心的地面：在空中橫著撞進陡壁（坑壁、岩壁）就擋下來，不會被一口氣「抬」上去
      if (gp && !opts.steepOK && body.x >= P[0][0] && body.x <= P[0][1]) {
        const sy = g0 + dyAt(gp, body.x);
        if (body.y > sy + 0.5) {
          const ps = g0 + dyAt(gp, prevX);
          const dx = Math.abs(body.x - prevX);
          if (dx > 0.01 && prevY <= ps + 0.5 && sy < prevY - 1 && ps - sy > STEEP * dx) {
            body.blocked = body.x > prevX ? 1 : -1;
            body.x = prevX;
            body.vx = 0;
          } else if (body.vy < 0 && body.ignorePlat !== 0) {
            // 跳到最高點附近、往上坡飄進了地面：直接站上去
            body.y = sy;
            body.vy = 0;
            body.onGround = true;
            body.plat = 0;
            return true;
          }
        }
      }

      if (body.vy >= 0) {
        let best = -1;
        let bestY = Infinity;
        for (let i = 0; i < P.length; i++) {
          if (i === body.ignorePlat) continue;
          if (opts.onlyPlat != null && i !== opts.onlyPlat) continue;
          const p = P[i];
          if (body.x < p[0] || body.x > p[1]) continue;
          const gpi = gps && gps[i];
          if (i === 0 && gpi) {
            // 起伏的地面是實心的：落到表面以下就站上去（斜坡上水平移動、瞬移進山丘裡也一樣）
            const sy = g0 + dyAt(gpi, body.x);
            if (body.y >= sy && sy < bestY) {
              best = i;
              bestY = sy;
            }
            continue;
          }
          const s = gpi ? p[2] + dyAt(gpi, body.x) : p[2];
          const sp = gpi ? p[2] + dyAt(gpi, prevX) : p[2];
          if (prevY <= sp + 0.5 && body.y >= s && s < bestY) {
            best = i;
            bestY = s;
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
        const s = this.surfaceY(map, i, x);
        if (s >= y - 1 && s < bestY) {
          best = i;
          bestY = s;
        }
      }
      return best;
    },

    platformAt(map, x, y, tol) {
      for (let i = 0; i < map.platforms.length; i++) {
        const p = map.platforms[i];
        if (x >= p[0] && x <= p[1] && Math.abs(this.surfaceY(map, i, x) - y) < (tol || 2)) return i;
      }
      return -1;
    },
  };
})();
