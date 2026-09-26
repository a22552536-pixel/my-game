// 打擊感：命中停頓、畫面震動、粒子、傷害數字、光柱。
(function () {
  'use strict';
  const U = G.util;

  const FX = (G.fx = {
    particles: [],
    numbers: [],
    texts: [],
    pillars: [],
    slashes: [],
    rings: [],
    bolts: [],
    impacts: [],
    blackBolts: [],
    darkFlash: 0,
    streaks: [],
    ghosts: [],
    waves: [],
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
      this.blackBolts.length = 0;
      this.darkFlash = 0;
      this.streaks.length = 0;
      this.ghosts.length = 0;
      this.waves.length = 0;
      this.kickX = this.kickY = 0;
      this.hitstop = 0;
      this.shakeT = 0;
      this.flash = 0;
    },

    addHitstop(t) {
      this.hitstop = Math.max(this.hitstop, t);
    },

    shake(mag, dur) {
      if (mag >= this.shakeMag || this.shakeT <= 0) {
        this.shakeMag = mag;
        this.shakeT = dur;
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

    // 黑閃：從命中點向外迸出紅邊的黑色閃電，畫面瞬間轉暗、邊緣泛紅
    blackFlash(x, y, dir) {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + U.rand(-0.3, 0.3);
        const len = U.rand(70, 170);
        const pts = [[x, y]];
        let px = x;
        let py = y;
        const seg = 6;
        for (let k = 1; k <= seg; k++) {
          const d = (len * k) / seg;
          const jitter = (k < seg ? U.rand(-16, 16) : 0);
          px = x + Math.cos(a) * d - Math.sin(a) * jitter;
          py = y + Math.sin(a) * d + Math.cos(a) * jitter;
          pts.push([px, py]);
        }
        this.blackBolts.push({ pts, t: 0, life: U.rand(0.22, 0.34), w: U.rand(5, 9) });
      }
      this.darkFlash = 0.16;
      this.impacts.push({ x, y, size: 90, color: '#ff2a3a', t: 0, life: 0.2, rot: Math.random() * Math.PI, dark: true });
      for (let i = 0; i < 16; i++) {
        this.particles.push({
          x, y, vx: U.rand(-420, 420), vy: U.rand(-420, 260), life: U.rand(0.25, 0.5), t: 0,
          size: U.rand(2, 5), color: U.pick(['#ff2a3a', '#1a0006', '#ff6a6a']), grav: 500, shape: 'square', drag: 1.5,
        });
      }
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
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        const m = this.shakeMag * Math.max(0, Math.min(1, this.shakeT * 6));
        this.shakeX = U.rand(-m, m);
        this.shakeY = U.rand(-m, m);
        if (this.shakeT <= 0) this.shakeMag = 0;
      } else {
        this.shakeX = this.shakeY = 0;
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
      step(this.blackBolts);
      if (this.darkFlash > 0) this.darkFlash -= dt;
      step(this.streaks);
      step(this.ghosts);
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
        if (im.dark) continue;
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

      // 黑色閃電（一般合成模式，才看得到黑色）
      for (const im of this.impacts) {
        if (!im.dark) continue;
        const k = im.t / im.life;
        ctx.save();
        ctx.globalAlpha = 1 - k;
        const g = ctx.createRadialGradient(im.x, im.y, 0, im.x, im.y, im.size * (0.6 + k));
        g.addColorStop(0, 'rgba(10,0,4,0.9)');
        g.addColorStop(0.45, 'rgba(120,0,16,0.55)');
        g.addColorStop(1, 'rgba(255,40,60,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(im.x, im.y, im.size * (0.6 + k), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const b of this.blackBolts) {
        const k = b.t / b.life;
        const shown = Math.min(b.pts.length, Math.ceil(b.pts.length * Math.min(1, k * 4)));
        ctx.save();
        ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        ctx.lineJoin = 'miter';
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < shown; i++) (i ? ctx.lineTo(b.pts[i][0], b.pts[i][1]) : ctx.moveTo(b.pts[i][0], b.pts[i][1]));
        ctx.shadowColor = '#ff1a30';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = '#ff2a3a';
        ctx.lineWidth = b.w + 4;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#0a0004';
        ctx.lineWidth = b.w;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,90,100,0.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

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
        ctx.lineWidth = 6;
        ctx.beginPath();
        b.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
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

      this.drawNumbers(ctx);

      for (const t of this.texts) {
        if (t.screen) continue;
        this.drawFloatText(ctx, t);
      }
    },

    drawScreen(ctx) {
      for (const t of this.texts) {
        if (t.screen) this.drawFloatText(ctx, t);
      }
      if (this.darkFlash > 0) {
        // 黑閃瞬間：畫面變暗，四周泛紅
        const k = this.darkFlash / 0.16;
        ctx.fillStyle = 'rgba(8,0,4,' + (0.38 * k).toFixed(3) + ')';
        ctx.fillRect(0, 0, G.W, G.H);
        const g = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.3, G.W / 2, G.H / 2, G.H * 0.85);
        g.addColorStop(0, 'rgba(255,20,40,0)');
        g.addColorStop(1, 'rgba(200,0,24,' + (0.45 * k).toFixed(3) + ')');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, G.W, G.H);
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
          // 黑閃：黑字紅邊，蓋在傷害數字上方
          const pop2 = k < 0.1 ? 1.5 - k * 5 : 1;
          ctx.font = '900 ' + Math.round(28 * pop2) + 'px ' + G.art.FONT;
          ctx.lineWidth = 7;
          ctx.strokeStyle = '#ff1a30';
          ctx.strokeText('黑閃！', n.x, y - size - 4);
          ctx.fillStyle = '#0a0004';
          ctx.fillText('黑閃！', n.x, y - size - 4);
        }
      }
      ctx.globalAlpha = 1;
    },
  });

  FX.reset();
})();
