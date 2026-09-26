// 單向平台物理（楓之谷式：從下面可以穿上去，從上面落下會站住）。
// body：{ x, y（腳底）, vx, vy, onGround, plat, ignorePlat, ignoreT, halfW }
(function () {
  'use strict';
  const U = G.util;

  G.physics = {
    step(body, dt, map, opts) {
      opts = opts || {};
      const B = G.data.balance;
      const P = map.platforms;
      if (body.ignoreT > 0) {
        body.ignoreT -= dt;
        if (body.ignoreT <= 0) body.ignorePlat = -1;
      }
      if (!body.onGround && !opts.noGravity) {
        body.vy = Math.min(body.vy + B.gravity * (opts.gravScale || 1) * dt, B.maxFall);
      }
      const prevY = body.y;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      const hw = body.halfW || 16;
      body.x = U.clamp(body.x, hw, map.w - hw);

      if (body.onGround) {
        const p = P[body.plat];
        if (p && body.x >= p[0] && body.x <= p[1] && body.vy >= 0) {
          body.y = p[2];
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
        body.y = P[0][2];
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
      map.platforms.forEach((p, i) => {
        if (x >= p[0] && x <= p[1] && p[2] >= y - 1 && p[2] < bestY) {
          best = i;
          bestY = p[2];
        }
      });
      return best;
    },

    platformAt(map, x, y) {
      for (let i = 0; i < map.platforms.length; i++) {
        const p = map.platforms[i];
        if (x >= p[0] && x <= p[1] && Math.abs(p[2] - y) < 2) return i;
      }
      return -1;
    },
  };
})();
