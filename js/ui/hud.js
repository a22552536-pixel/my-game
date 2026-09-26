// 畫在 Canvas 上的常駐介面：HP/MP/EXP、技能欄、任務追蹤、提示訊息、Boss 血條。
(function () {
  'use strict';
  const A = G.art;

  const H = (G.hud = {
    toasts: [],
    title: null,
    region: null,
    banner: null,
    storyLine: null,
    saveT: 0,

    reset() {
      this.toasts = [];
      this.title = null;
      this.region = null;
      this.banner = null;
      this.storyLine = null;
    },

    toast(text, color) {
      this.toasts.push({ text, color: color || '#fff', t: 0, life: 3.2 });
      if (this.toasts.length > 5) this.toasts.shift();
    },
    mapTitle(name) {
      this.title = { text: name, t: 0 };
    },
    regionCard(region) {
      const r = G.data.story.regions[region];
      if (r) this.region = { name: r.name, sub: r.sub, t: 0, life: 4 };
    },
    bossBanner(name) {
      this.banner = { text: name, t: 0, life: 2.6 };
    },
    story(text) {
      this.storyLine = { text, t: 0, life: 6 };
    },
    saveIcon() {
      this.saveT = 1.2;
    },

    update(dt) {
      for (let i = this.toasts.length - 1; i >= 0; i--) {
        this.toasts[i].t += dt;
        if (this.toasts[i].t > this.toasts[i].life) this.toasts.splice(i, 1);
      }
      if (this.title) this.title.t += dt;
      ['region', 'banner', 'storyLine'].forEach((k) => {
        if (this[k]) {
          this[k].t += dt;
          if (this[k].t > this[k].life) this[k] = null;
        }
      });
      if (this.saveT > 0) this.saveT -= dt;
    },

    text(ctx, str, x, y, size, color, align, stroke) {
      ctx.font = 'bold ' + size + 'px ' + A.FONT;
      ctx.textAlign = align || 'left';
      ctx.textBaseline = 'middle';
      if (stroke !== false) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(3, size * 0.22);
        ctx.strokeStyle = 'rgba(30,15,8,0.85)';
        ctx.strokeText(str, x, y);
      }
      ctx.fillStyle = color || '#fff';
      ctx.fillText(str, x, y);
    },

    panel(ctx, x, y, w, h, r, fill) {
      ctx.fillStyle = fill || 'rgba(35,22,14,0.78)';
      ctx.beginPath();
      A.roundRect(ctx, x, y, w, h, r);
      ctx.fill();
    },

    bar(ctx, x, y, w, h, frac, c1, c2, label) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      A.roundRect(ctx, x, y, w, h, h / 2);
      ctx.fill();
      const fw = Math.max(0, Math.min(1, frac)) * (w - 4);
      if (fw > 1) {
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.beginPath();
        A.roundRect(ctx, x + 2, y + 2, fw, h - 4, (h - 4) / 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + 6, y + 3, Math.max(0, fw - 8), 2);
      }
      if (label) this.text(ctx, label, x + w / 2, y + h / 2 + 1, 12, '#fff', 'center');
    },

    draw(ctx) {
      const P = G.player;
      const I = G.input;
      const W = G.W;
      const Hh = G.H;

      // ── 下方狀態列 ──
      const barY = Hh - 66;
      this.panel(ctx, 8, barY, 470, 54, 12);
      // 等級徽章
      ctx.fillStyle = '#ffcf4a';
      ctx.beginPath();
      ctx.arc(40, barY + 27, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#8a5a1a';
      ctx.stroke();
      this.text(ctx, 'Lv', 40, barY + 16, 11, '#6a3a0a', 'center', false);
      this.text(ctx, String(P.level), 40, barY + 32, 18, '#4a2a05', 'center', false);
      this.text(ctx, G.data.forms[P.form].name, 72, barY + 13, 13, '#ffe9b0');
      this.bar(ctx, 72, barY + 22, 220, 14, P.hp / P.maxHp, '#ff6a5a', '#c42a2a', 'HP ' + Math.ceil(P.hp) + ' / ' + P.maxHp);
      this.bar(ctx, 72, barY + 37, 220, 12, P.mp / P.maxMp, '#6ab0ff', '#2a62c4', 'MP ' + Math.floor(P.mp) + ' / ' + P.maxMp);
      // 金葉
      A.drawIcon(ctx, 'gold', 312, barY + 18, 0.6);
      this.text(ctx, String(P.gold), 326, barY + 18, 14, '#ffe07a');
      if (P.sp > 0) this.text(ctx, 'SP ' + P.sp + '（' + I.label('skills') + '）', 304, barY + 40, 13, '#9fffb0');

      // ── 技能欄 ──
      const slots = G.data.keys.skillSlots;
      const sx0 = W - 8 - (slots.length + 2) * 52 - 8;
      this.panel(ctx, sx0 - 8, barY, (slots.length + 2) * 52 + 16, 54, 12);
      slots.forEach((a, i) => {
        const x = sx0 + i * 52;
        const id = P.hotbar[i];
        this.slot(ctx, x, barY + 5, I.label(a), id ? G.data.skills[id].icon : null, () => {
          if (!id) return null;
          const S = G.data.skills[id];
          const lv = P.skills[id] || 0;
          if (lv <= 0) return 'lock';
          if (P.mp < S.mp(lv)) return 'nomp';
          return null;
        });
      });
      const px = sx0 + slots.length * 52;
      const hpN = (P.potions.hp || 0) + (P.potions.hpL || 0);
      const mpN = (P.potions.mp || 0) + (P.potions.mpL || 0);
      this.slot(ctx, px, barY + 5, I.label('hpPot'), P.potions.hp > 0 || !P.potions.hpL ? 'hpPot' : 'hpPotL', () => (hpN > 0 ? null : 'nomp'), hpN);
      this.slot(ctx, px + 52, barY + 5, I.label('mpPot'), P.potions.mp > 0 || !P.potions.mpL ? 'mpPot' : 'mpPotL', () => (mpN > 0 ? null : 'nomp'), mpN);

      // ── 經驗條 ──
      const need = P.expNeed();
      const frac = P.level >= G.data.balance.levelCap ? 1 : P.exp / need;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, Hh - 9, W, 9);
      const g = ctx.createLinearGradient(0, Hh - 9, 0, Hh);
      g.addColorStop(0, '#fff29a');
      g.addColorStop(1, '#e8b020');
      ctx.fillStyle = g;
      ctx.fillRect(0, Hh - 8, W * frac, 7);
      this.text(ctx, 'EXP ' + P.exp + ' / ' + need + '（' + (frac * 100).toFixed(1) + '%）', W / 2, Hh - 17, 12, '#fff6c0', 'center');

      // ── 地圖名稱 ──
      if (this.title) {
        this.panel(ctx, 8, 8, 210, 34, 10);
        this.text(ctx, this.title.text, 20, 25, 16, '#ffe9b0');
      }
      if (P.buffs) {
        let bx = 14;
        for (const k in P.buffs) {
          const b = P.buffs[k];
          this.panel(ctx, bx - 4, 48, 70, 30, 8);
          A.drawIcon(ctx, b.icon, bx + 10, 63, 0.6);
          this.text(ctx, Math.ceil(b.t) + 's', bx + 26, 63, 13, '#fff');
          bx += 76;
        }
      }
      if (G.debug) this.text(ctx, 'FPS ' + G.fps + '  ' + G.world.mapId + '  x' + Math.round(P.x) + ' y' + Math.round(P.y), 230, 25, 12, '#9f9');

      // ── 任務追蹤 ──
      const tr = G.quests.tracked();
      if (tr.length) {
        const w = 290;
        const h = 22 + tr.length * 40;
        this.panel(ctx, W - w - 8, 8, w, h, 10);
        this.text(ctx, '任務（' + I.label('quests') + '）', W - w + 4, 22, 13, '#ffe9b0');
        tr.forEach((q, i) => {
          const y = 44 + i * 40;
          this.text(ctx, q.name, W - w + 4, y, 13, q.ready ? '#7dff7a' : '#ffffff');
          this.text(ctx, q.text, W - w + 12, y + 17, 12, q.ready ? '#b8ffb0' : '#d8d0c0');
        });
      }

      // ── Boss 血條 ──
      const boss = G.world.boss;
      if (boss && !boss.dead && boss.state !== 'intro') {
        const bw = 560;
        const bx = (W - bw) / 2;
        this.panel(ctx, bx - 10, 50, bw + 20, 44, 10);
        this.text(ctx, 'Lv.' + boss.level + ' ' + boss.def.name + (boss.enraged ? '（狂暴）' : ''), W / 2, 62, 14, boss.enraged ? '#ff8a8a' : '#ffe9b0', 'center');
        this.bar(ctx, bx, 72, bw, 16, boss.hp / boss.maxHp, '#ff7ac0', '#b02a7a', Math.ceil(boss.hp) + ' / ' + boss.maxHp);
      }

      // ── 提示訊息 ──
      this.toasts.forEach((t, i) => {
        const a = t.t < 0.2 ? t.t / 0.2 : t.t > t.life - 0.5 ? (t.life - t.t) / 0.5 : 1;
        ctx.globalAlpha = Math.max(0, a);
        const y = 150 + i * 30;
        ctx.font = 'bold 16px ' + A.FONT;
        const w = ctx.measureText(t.text).width + 28;
        this.panel(ctx, W / 2 - w / 2, y - 13, w, 26, 13, 'rgba(25,15,8,0.72)');
        this.text(ctx, t.text, W / 2, y + 1, 16, t.color, 'center', false);
      });
      ctx.globalAlpha = 1;

      // ── 區域標題卡 ──
      if (this.region) {
        const r = this.region;
        const a = r.t < 0.8 ? r.t / 0.8 : r.t > r.life - 1 ? (r.life - r.t) : 1;
        ctx.globalAlpha = Math.max(0, a);
        const g2 = ctx.createLinearGradient(0, 240, 0, 360);
        g2.addColorStop(0, 'rgba(0,0,0,0)');
        g2.addColorStop(0.5, 'rgba(0,0,0,0.45)');
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 240, W, 120);
        this.text(ctx, r.name, W / 2, 285, 46, '#fff6d8', 'center');
        this.text(ctx, r.sub, W / 2, 330, 18, '#e8f0c8', 'center');
        ctx.globalAlpha = 1;
      }

      // ── Boss 登場 ──
      if (this.banner) {
        const b = this.banner;
        const a = b.t < 0.3 ? b.t / 0.3 : b.t > b.life - 0.6 ? (b.life - b.t) / 0.6 : 1;
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = 'rgba(80,0,30,0.55)';
        ctx.fillRect(0, 250, W, 90);
        this.text(ctx, 'BOSS', W / 2, 275, 18, '#ff9ab8', 'center');
        this.text(ctx, b.text, W / 2, 312, 40, '#ffe0ec', 'center');
        ctx.globalAlpha = 1;
      }

      // ── 故事文字 ──
      if (this.storyLine) {
        const s = this.storyLine;
        const a = s.t < 0.6 ? s.t / 0.6 : s.t > s.life - 0.8 ? (s.life - s.t) / 0.8 : 1;
        ctx.globalAlpha = Math.max(0, a);
        ctx.font = 'bold 20px ' + A.FONT;
        const w = Math.min(W - 80, ctx.measureText(s.text).width + 60);
        this.panel(ctx, W / 2 - w / 2, 440, w, 50, 14, 'rgba(20,12,30,0.75)');
        this.text(ctx, s.text, W / 2, 466, 18, '#fff3d0', 'center', false);
        ctx.globalAlpha = 1;
      }

      if (this.saveT > 0) {
        ctx.globalAlpha = Math.min(1, this.saveT);
        this.text(ctx, '已自動存檔', W - 16, Hh - 84, 13, '#bfffbf', 'right');
        ctx.globalAlpha = 1;
      }
    },

    slot(ctx, x, y, key, icon, stateFn, count) {
      ctx.fillStyle = 'rgba(255,240,210,0.12)';
      ctx.beginPath();
      A.roundRect(ctx, x, y, 44, 44, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,160,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (icon) {
        A.drawIcon(ctx, icon, x + 22, y + 24, 0.95);
        const st = stateFn && stateFn();
        if (st) {
          ctx.fillStyle = st === 'lock' ? 'rgba(0,0,0,0.6)' : 'rgba(0,20,60,0.55)';
          ctx.beginPath();
          A.roundRect(ctx, x, y, 44, 44, 8);
          ctx.fill();
        }
      }
      this.text(ctx, key, x + 4, y + 9, 11, '#ffe9b0');
      if (count != null) this.text(ctx, String(count), x + 41, y + 37, 12, '#fff', 'right');
    },
  });
})();
