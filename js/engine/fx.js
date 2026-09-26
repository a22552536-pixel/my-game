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
    },

    drawWorld(ctx) {
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
        crit: { size: 40, top: '#ffe08a', bottom: '#ff5a1f', stroke: '#4a0f00' },
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
        if (n.kind === 'crit' && k < 0.5) {
          ctx.font = 'bold 16px ' + G.art.FONT;
          ctx.lineWidth = 4;
          ctx.strokeText('爆擊!', n.x, y - size + 2);
          ctx.fillStyle = '#ffe36b';
          ctx.fillText('爆擊!', n.x, y - size + 2);
        }
      }
      ctx.globalAlpha = 1;
    },
  });

  FX.reset();
})();
