// 主線進度：星楓葉的收集與加成。
(function () {
  'use strict';

  const S = (G.story = {
    // 每片葉子：HP、攻擊各 +4%
    BONUS: 0.04,

    leaves() {
      const f = G.world.flags;
      if (!f.leaves) {
        f.leaves = {};
        if (f.starleaf1) f.leaves[1] = true; // 舊存檔：只有第一片葉子的旗標
      }
      return f.leaves;
    },

    hasLeaf(ch) {
      return !!this.leaves()[ch];
    },

    count() {
      return Object.keys(this.leaves()).length;
    },

    leafDef(ch) {
      return G.data.story.chapters[ch].leaf;
    },

    // ── 拿到星楓葉的儀式 ──
    // 0～0.6 秒畫面變暗 → 葉子從小獅子身上升到畫面中央，旋轉、放光（～2.6）
    // → 葉子飛進額頭的星楓之冠，白光一閃，能力生效（3.6）→ 獎勵卡片，按鍵繼續
    cer: null,
    pendingEnd: null,

    gainLeaf(ch) {
      if (this.cer || this.hasLeaf(ch)) return;
      const P = G.player;
      G.ui.closeAll();
      this.cer = { ch, t: 0, applied: false, before: { hp: P.maxHp, atk: Math.round(P.atk) }, after: null };
      G.audio.play('legendary');
    },

    // 主迴圈呼叫；儀式進行中回傳 true（世界暫停）
    updateCeremony(dt) {
      const c = this.cer;
      if (!c) return false;
      c.t += dt;
      const P = G.player;
      if (!c.chime && c.t > 1.6) {
        c.chime = true;
        G.audio.play('rare');
      }
      if (!c.applied && c.t >= 3.6) {
        c.applied = true;
        this.leaves()[c.ch] = true;
        if (this.count() >= 5) G.world.flags.allLeaves = true;
        P.recalc();
        P.hp = P.maxHp;
        P.mp = P.maxMp;
        c.after = { hp: P.maxHp, atk: Math.round(P.atk) };
        G.fx.screenFlash('#ffffff', 0.9);
        G.fx.shake(8, 0.3);
        G.audio.play('evolve');
        G.save.write();
      }
      if (c.t > 5 && (G.input.wasPressed('jump') || G.input.wasPressed('attack') || G.input.wasPressed('up') || this.clicked)) {
        this.clicked = false;
        this.cer = null;
        G.audio.play('ui');
        G.hud.toast('星楓葉 ' + this.count() + '/5　葉子的力量：' + this.leafDef(c.ch).gift, '#ffe066');
        // 儀式結束後才出現章末卡片；能進化的話，關掉卡片後會聽到內心的聲音
        if (G.evolve.canEvolve()) G.cut.pendingVoice = true;
        if (this.pendingEnd) {
          const r = this.pendingEnd;
          this.pendingEnd = null;
          setTimeout(() => {
            if (G.scene !== 'play') return;
            G.ui.endChapter = r;
            G.ui.open('m1end');
          }, 800);
        }
      }
      this.clicked = false;
      return true;
    },

    // 測試用：直接把儀式跑完
    skipCeremony() {
      if (!this.cer) return;
      this.cer.t = Math.max(this.cer.t, 3.6);
      this.updateCeremony(0);
      this.cer.t = 6;
      this.clicked = true;
      this.updateCeremony(0);
    },

    drawCeremony(ctx) {
      const c = this.cer;
      if (!c) return;
      const A = G.art;
      const W = G.W;
      const H = G.H;
      const t = c.t;
      const P = G.player;
      const d = this.leafDef(c.ch);
      const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
      const dark = Math.min(1, t / 0.6);
      ctx.save();
      ctx.fillStyle = 'rgba(8,6,20,' + (0.72 * dark).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      const px = P.x - G.cam.x;
      const py = P.y - G.cam.y;
      const cx = W / 2;
      const cy = 260;
      // 葉子的位置與大小
      let lx;
      let ly;
      let sc;
      if (t < 2.6) {
        const k = ease((t - 0.4) / 2.0);
        lx = px + (cx - px) * k;
        ly = py - 60 + (cy - py + 60) * k;
        sc = 0.6 + 3.6 * k;
      } else if (t < 3.6) {
        const k = ease((t - 2.6) / 1.0);
        lx = cx + (px - cx) * k;
        ly = cy + (py - 72 - cy) * k;
        sc = 4.2 - 3.8 * k;
      } else {
        lx = px;
        ly = py - 72;
        sc = 0.4;
      }
      // 背後的光芒
      if (t > 0.8 && t < 3.8) {
        const k = Math.min(1, (t - 0.8) / 0.8) * (t > 3.2 ? Math.max(0, (3.8 - t) / 0.6) : 1);
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(t * 0.8);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) {
          ctx.rotate((Math.PI * 2) / 14);
          ctx.fillStyle = 'rgba(255,240,180,' + (0.1 * k).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-20 * sc, -140 * sc);
          ctx.lineTo(20 * sc, -140 * sc);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      // 小獅子（在暗幕上面，看得到葉子飛進額頭）
      ctx.save();
      ctx.translate(px, py);
      A.drawLion(ctx, 0, 0, P.dir, { state: t > 3.6 && t < 4.6 ? 'roar' : 'idle', t, p: Math.min(1, Math.max(0, (t - 3.6) / 0.6)), onGround: true, form: P.form, leaves: this.crownColors() });
      ctx.restore();
      // 葉子
      if (t < 3.7) {
        const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 40 * sc);
        g.addColorStop(0, 'rgba(255,255,230,0.9)');
        g.addColorStop(1, 'rgba(255,240,160,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(lx, ly, 40 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(Math.sin(t * 2) * 0.3 + (t < 2.6 ? t * 1.5 : 0));
        ctx.scale(sc, sc);
        A.shape(ctx, (cc) => A.mapleLeafPath(cc, 0, 0, 14), d.color, null, { lw: 2.5 / Math.max(1, sc * 0.6), hl: false });
        ctx.restore();
        if (Math.random() < 0.5) G.fx.particles.push({ x: lx + G.cam.x + (Math.random() - 0.5) * 30 * sc, y: ly + G.cam.y + (Math.random() - 0.5) * 30 * sc, vx: 0, vy: -40, life: 0.8, t: 0, size: 3, color: d.color, grav: 0, shape: 'star', drag: 0 });
      }
      // 名稱
      if (t > 1.6 && t < 3.4) {
        const k = Math.min(1, (t - 1.6) / 0.4) * Math.min(1, (3.4 - t) / 0.3);
        ctx.globalAlpha = k;
        G.hud.text(ctx, d.name, cx, 420, 40, '#fff6d0', 'center');
        G.hud.text(ctx, '「' + d.power + '」之力', cx, 462, 20, d.color, 'center');
        ctx.globalAlpha = 1;
      }
      // 獎勵卡片
      if (t > 4.0 && c.after) {
        const k = ease((t - 4.0) / 0.5);
        const w = 640;
        const h = 300;
        const x0 = cx - w / 2;
        const y0 = 150 + (1 - k) * 40;
        ctx.globalAlpha = k;
        G.hud.panel(ctx, x0, y0, w, h, 18, 'rgba(255,248,231,0.97)');
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 4;
        ctx.strokeRect(x0 + 5, y0 + 5, w - 10, h - 10);
        ctx.save();
        ctx.translate(x0 + 64, y0 + 60);
        ctx.scale(2.2, 2.2);
        A.shape(ctx, (cc) => A.mapleLeafPath(cc, 0, 0, 14), d.color, null, { lw: 2, hl: false });
        ctx.restore();
        G.hud.text(ctx, '獲得「' + d.name + '」', x0 + 120, y0 + 50, 26, '#6a3a0a', 'left', false);
        G.hud.text(ctx, '星楓葉 ' + this.count() + ' / 5', x0 + 120, y0 + 80, 16, '#8a735c', 'left', false);
        const rows = [
          ['✦ 葉子的力量', d.gift],
          ['✦ 永久強化', 'HP ' + c.before.hp + ' → ' + c.after.hp + '　攻擊 ' + c.before.atk + ' → ' + c.after.atk],
          ['✦ 星楓之冠', '額頭多了一片發光的葉子（' + this.count() + ' / 5）'],
          ['✦ 標題畫面', '星楓樹亮起了第 ' + this.count() + ' 盞葉子'],
          ['✦ 解鎖', '「回憶・' + G.data.monsters[G.data.story.chapters[c.ch].boss].name + '」：重新進入 Boss 房挑戰強化版'],
        ];
        rows.forEach(([a, b], i) => {
          G.hud.text(ctx, a, x0 + 40, y0 + 124 + i * 30, 16, '#a4581a', 'left', false);
          G.hud.text(ctx, b, x0 + 170, y0 + 124 + i * 30, 16, '#4a2e1f', 'left', false);
        });
        if (t > 5) {
          ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
          G.hud.text(ctx, '按 ' + G.input.label('jump') + ' 或點一下繼續', cx, y0 + h - 18, 14, '#8a735c', 'center', false);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },

    mult() {
      return 1 + this.count() * this.BONUS;
    },

    // 每片葉子各自的能力（拿到那一章就生效，不用等到最後）
    hpRegenMult() { return this.hasLeaf(1) ? 2 : 1; },
    mpRegenMult() { return this.hasLeaf(2) ? 1.6 : 1; },
    critBonus() { return this.hasLeaf(3) ? 0.3 : 0; },
    guard() { return this.hasLeaf(4) ? 0.1 : 0; },
    goldCrit() { return this.hasLeaf(5); },

    // 獅子額頭的小葉子（依章節順序，沒拿到的留空）
    crownColors() {
      return [1, 2, 3, 4, 5].map((ch) => (this.hasLeaf(ch) ? this.leafDef(ch).color : null));
    },
  });
  S.U = G.util;
})();
