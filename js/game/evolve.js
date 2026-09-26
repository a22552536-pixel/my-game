// 進化：條件判斷、選擇、演出。
// 第 n 轉：達到 Lv(10n) 就可以進化，不用先打倒 Boss。一轉選路線，之後直線進化。
(function () {
  'use strict';
  const U = G.util;

  const E = (G.evolve = {
    anim: null,

    tierOf(form) {
      return (G.data.forms[form] || G.data.forms.base).tier;
    },

    // 每一轉要打倒的 Boss
    BOSSES: ['queenShroom', 'hermitCrab', 'lavaTortoise', 'frostSpirit'],

    nextTier() {
      return this.tierOf(G.player.form) + 1;
    },

    // 下一轉還缺什麼（null 表示可以進化）
    missing() {
      const P = G.player;
      const n = this.nextTier();
      if (n > 5) return '已經是最終形態';
      if (P.level < n * 10) return '需要 Lv' + n * 10;
      return null;
    },

    canEvolve() {
      return !this.missing();
    },

    options() {
      const P = G.player;
      const f = G.data.forms[P.form];
      if (f.tier === 0) return ['might1', 'magic1', 'agile1'];
      // 四轉之後三條路線都匯集到同一個最終形態
      if (f.tier === 4) return ['apex'];
      return [f.line + (f.tier + 1)];
    },

    start(formId) {
      G.ui.closeAll();
      this.anim = { t: 0, from: G.player.form, to: formId, switched: false };
      G.audio.play('evolve');
    },

    update(dt) {
      const a = this.anim;
      if (!a) return false;
      a.t += dt;
      const P = G.player;
      if (!a.switched && a.t >= 2.3) {
        a.switched = true;
        // 進五轉：記住是從哪一條路線來的，沿用那一頁技能
        if (G.data.forms[a.to].apex) P.apexLine = G.data.forms[a.from].line || P.apexLine || 'might';
        P.form = a.to;
        G.formSwitch.ensurePages(P);
        G.formSwitch.addSP(P, 3);
        P.recalc();
        P.hp = P.maxHp;
        P.mp = P.maxMp;
        G.fx.screenFlash('#ffffff', 1);
        G.fx.shake(10, 0.4);
        G.fx.sparkle(P.x, P.y - 40, '#fff3a0', 40, 60);
        G.fx.ring(P.x, P.y - 40, '#ffffff', 220, 0.6, 8);
      }
      if (a.t >= 4.2) {
        this.anim = null;
        G.hud.toast('進化成「' + G.data.forms[P.form].name + '」！獲得 3 點技能點，點左上角的「技能」圖示學新技能；也可以用「形態」圖示切換路線', '#ffe14a');
        G.save.write();
      }
      return true;
    },

    // 演出畫在世界上面：畫面變暗 → 白色剪影在新舊形態間閃爍 → 光爆 → 新形態登場
    draw(ctx) {
      const a = this.anim;
      if (!a) return;
      const P = G.player;
      const sx = P.x - G.cam.x;
      const sy = P.y - G.cam.y;
      const t = a.t;
      const dark = Math.min(1, t / 0.6) * (t > 3.6 ? Math.max(0, 1 - (t - 3.6) / 0.6) : 1);
      ctx.fillStyle = 'rgba(10,6,20,' + (0.78 * dark).toFixed(3) + ')';
      ctx.fillRect(0, 0, G.W, G.H);

      // 背後的放射光
      if (t > 0.6) {
        ctx.save();
        ctx.translate(sx, sy - 40);
        ctx.rotate(t * 0.6);
        ctx.globalCompositeOperation = 'lighter';
        const k = Math.min(1, (t - 0.6) / 1.2) * dark;
        for (let i = 0; i < 12; i++) {
          ctx.rotate(Math.PI / 6);
          ctx.fillStyle = 'rgba(255,240,180,' + (0.12 * k).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-24, -420);
          ctx.lineTo(24, -420);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(1.6, 1.6);
      if (t < 2.3) {
        // 剪影在舊形態與新形態之間越閃越快
        const k = Math.max(0, (t - 0.6) / 1.7);
        const period = Math.max(0.05, 0.4 - k * 0.36);
        const showNew = t > 0.6 && Math.floor((t - 0.6) / period) % 2 === 1;
        G.art.mode = 'flash';
        G.art.modeAmt = Math.min(1, t / 0.6);
        G.art.drawLion(ctx, 0, 0, P.dir, { state: 'idle', t: 0, p: 0, onGround: false, form: showNew ? a.to : a.from });
        G.art.mode = null;
      } else {
        G.art.drawLion(ctx, 0, 0, P.dir, { state: t < 3 ? 'roar' : 'idle', t, p: Math.min(1, (t - 2.3) / 0.7), onGround: false, form: a.to, leaves: G.story.crownColors() });
      }
      ctx.restore();

      if (t > 2.4) {
        const k = Math.min(1, (t - 2.4) / 0.4) * (t > 3.8 ? Math.max(0, 1 - (t - 3.8) / 0.4) : 1);
        ctx.globalAlpha = k;
        G.hud.text(ctx, '進化成', G.W / 2, 150, 22, '#fff6d0', 'center');
        G.hud.text(ctx, G.data.forms[a.to].name, G.W / 2, 196, 46, '#ffe14a', 'center');
        ctx.globalAlpha = 1;
      }
    },
  });

  E.U = U;
})();
