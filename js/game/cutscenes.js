// 過場：Boss 倒下時的遺言、每 10 級進化前「內心的聲音」。
// 進行中世界暫停；按跳躍／攻擊／↑ 或點一下前進。
(function () {
  'use strict';
  const A = G.art;

  const C = (G.cut = {
    talk: null,
    voice: null,
    pendingVoice: false,
    pendingTalk: false,
    clicked: false,

    active() {
      return !!(this.talk || this.voice);
    },

    pressed() {
      const I = G.input;
      const p = I.wasPressed('jump') || I.wasPressed('attack') || I.wasPressed('up') || this.clicked;
      this.clicked = false;
      return p;
    },

    // ── Boss 遺言 ──
    startBossTalk(boss, region) {
      const lines = G.data.story.bossWords[boss.id];
      if (!lines) return false;
      G.ui.closeAll();
      this.voice = null;
      this.talk = { boss, region, lines, i: 0, t: 0, shown: 0 };
      G.audio.play('bossWarn');
      return true;
    },

    endTalk() {
      const tk = this.talk;
      this.talk = null;
      const region = tk.region;
      G.hud.story(G.data.story.bossDefeated[tk.boss.id] || '');
      // 接著是拿葉子的儀式，儀式結束後出現章末卡片
      if (!G.story.hasLeaf(region)) {
        G.story.pendingEnd = region;
        const i = G.world.drops.findIndex((d) => d.kind === 'starleaf');
        if (i >= 0) G.world.drops.splice(i, 1);
        G.story.gainLeaf(region);
      } else {
        G.ui.endChapter = region;
        G.ui.open('m1end');
      }
    },

    // 測試用：直接跳過遺言
    skipTalk() {
      if (this.talk) this.endTalk();
    },

    // ── 內心的聲音 ──
    startVoice(tier) {
      const lines = G.data.story.innerVoice[tier];
      if (!lines) return;
      G.ui.closeAll();
      this.pendingVoice = false;
      this.voice = { tier, lines, i: 0, t: 0 };
      G.audio.play('evolve');
    },

    // 每幀：時機到了就自動開始內心的聲音（不在 Boss 戰、沒有視窗、沒有其他過場）
    tick() {
      if (!this.pendingVoice || this.pendingTalk || G.story.pendingEnd || G.scene !== 'play' || this.active() || G.story.cer || G.evolve.anim) return;
      if (G.ui.blocking() || (G.world.boss && !G.world.boss.dead) || G.tutorial.blocking()) return;
      if (!G.evolve.canEvolve()) {
        this.pendingVoice = false;
        return;
      }
      this.startVoice(G.evolve.nextTier());
    },

    // 主迴圈呼叫：過場進行中回傳 true
    update(dt) {
      if (this.talk) {
        const tk = this.talk;
        tk.t += dt;
        const line = tk.lines[tk.i];
        tk.shown = Math.min(line.length, tk.shown + dt * 28);
        if (tk.t > 0.4 && this.pressed()) {
          if (tk.shown < line.length) tk.shown = line.length;
          else if (tk.i < tk.lines.length - 1) {
            tk.i++;
            tk.shown = 0;
            G.audio.play('ui');
          } else this.endTalk();
        }
        return true;
      }
      if (this.voice) {
        const v = this.voice;
        v.t += dt;
        v.lineT = (v.lineT || 0) + dt;
        if (v.lineT > 0.8 && this.pressed()) {
          if (v.i < v.lines.length - 1) {
            v.i++;
            v.lineT = 0;
            G.audio.play('rare');
          } else {
            this.voice = null;
            G.ui.open('evolve');
          }
        }
        return true;
      }
      this.clicked = false;
      return false;
    },

    draw(ctx) {
      if (this.talk) this.drawTalk(ctx);
      if (this.voice) this.drawVoice(ctx);
    },

    drawTalk(ctx) {
      const tk = this.talk;
      const W = G.W;
      const H = G.H;
      const b = tk.boss;
      ctx.save();
      ctx.fillStyle = 'rgba(10,6,20,' + Math.min(0.55, tk.t).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      // Boss 身上的光
      const bx = b.x - G.cam.x;
      const by = b.y - G.cam.y - b.h * 0.5;
      const g = ctx.createRadialGradient(bx, by, 10, bx, by, 220);
      g.addColorStop(0, 'rgba(255,240,200,0.25)');
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, 220, 0, Math.PI * 2);
      ctx.fill();
      // 對話框
      const x0 = 150;
      const y0 = H - 250;
      const w = W - 300;
      const h = 170;
      G.hud.panel(ctx, x0, y0, w, h, 18, 'rgba(255,248,231,0.97)');
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);
      // 頭像
      G.hud.panel(ctx, x0 + 18, y0 + 16, 138, 138, 12, 'rgba(240,220,190,1)');
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 + 18, y0 + 16, 138, 138);
      ctx.clip();
      const pm = Object.assign({}, b, { x: 0, y: 0, dir: 1, dead: false, deadT: 0, hurtFlash: 0, squash: 0, state: 'recover', stateT: 0.3, enraged: false });
      const sc = 120 / Math.max(b.h, b.w * 0.8);
      ctx.translate(x0 + 87, y0 + 150);
      ctx.scale(sc, sc);
      A.drawMonster(ctx, pm);
      ctx.restore();
      G.hud.text(ctx, b.def.name, x0 + 87, y0 + 168, 15, '#6a3a0a', 'center', false);
      // 文字（逐字出現、自動換行）
      const line = tk.lines[tk.i].slice(0, Math.floor(tk.shown));
      ctx.font = 'bold 20px ' + A.FONT;
      const rows = G.hud.wrap(ctx, line, w - 230);
      rows.forEach((r, i) => G.hud.text(ctx, r, x0 + 180, y0 + 40 + i * 32, 20, '#4a2e1f', 'left', false));
      G.hud.text(ctx, (tk.i + 1) + ' / ' + tk.lines.length, x0 + w - 24, y0 + h - 22, 13, '#8a735c', 'right', false);
      if (tk.shown >= tk.lines[tk.i].length) {
        ctx.globalAlpha = 0.5 + Math.sin(tk.t * 5) * 0.5;
        G.hud.text(ctx, '▼ 按 ' + G.input.label('jump') + ' 或點一下', x0 + w - 90, y0 + h - 22, 13, '#a4581a', 'right', false);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },

    drawVoice(ctx) {
      const v = this.voice;
      const W = G.W;
      const H = G.H;
      const t = v.t;
      ctx.save();
      ctx.fillStyle = 'rgba(6,4,16,' + Math.min(0.9, t * 1.5).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      // 漂浮的光點
      for (let i = 0; i < 40; i++) {
        const x = (i * 197 + t * 14 * ((i % 3) + 1)) % W;
        const y = H - ((i * 131 + t * 22 * ((i % 4) + 1)) % H);
        ctx.fillStyle = 'rgba(255,240,190,' + (0.25 + 0.25 * Math.sin(t * 2 + i)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      // 胸口的光：小獅子的剪影
      const cx = W / 2;
      const cy = 250;
      const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 150);
      glow.addColorStop(0, 'rgba(255,245,200,' + (0.55 + Math.sin(t * 2) * 0.15).toFixed(3) + ')');
      glow.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(cx, cy + 50);
      ctx.scale(1.6, 1.6);
      A.mode = 'flash';
      A.modeAmt = 0.75;
      A.drawLion(ctx, 0, 0, 1, { state: 'idle', t, p: 0, onGround: false, form: G.player.form, leaves: G.story.crownColors() });
      A.mode = null;
      ctx.restore();
      G.hud.text(ctx, '—— 內心的聲音 ——', cx, 360, 15, '#bfae8a', 'center', false);
      for (let i = 0; i <= v.i; i++) {
        const k = i === v.i ? Math.min(1, (v.lineT || 0) / 0.8) : 1;
        ctx.globalAlpha = k * (i === v.i ? 1 : 0.55);
        G.hud.text(ctx, v.lines[i], cx, 400 + i * 42, i === v.i ? 26 : 22, '#fff6d8', 'center');
      }
      ctx.globalAlpha = 1;
      if ((v.lineT || 0) > 0.8) {
        ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.4;
        G.hud.text(ctx, v.i < v.lines.length - 1 ? '按 ' + G.input.label('jump') + ' 繼續' : '按 ' + G.input.label('jump') + ' 找回力量', cx, H - 40, 15, '#e8dcc0', 'center', false);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },
  });

  document.addEventListener('mousedown', () => {
    if (C.active()) C.clicked = true;
  });
})();
