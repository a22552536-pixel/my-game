// 第二章的形態切換教學（一次）：一轉之後第一次走進第二章時開始，一步一步教怎麼切換形態。
// 不是強制的：不擋傳送門；做完（或換到別章）就記在 world.flags.formTut。
// 畫面：和操作教學同一種上方面板（小一號），左上角的「形態」圖示會發光（js/ui/hudicons.js 讀 G.remind.glowing）。
(function () {
  'use strict';

  const touchOn = () => !!(G.touch && G.touch.on);
  const STEPS = [
    { id: 'open', text: '點左上角發光的「形態」圖示', sub: '一轉之後，三種形態都能用了' },
    { id: 'switch', text: () => '選一個形態，按「切換成○○」', sub: '力量、法術、敏捷：每條路線的打法都不一樣' },
    { id: 'skills', text: '這是新形態的技能頁：學一招新技能', sub: () => (touchOn() ? '點「＋」學技能，學完點 ✕ 關掉' : '按「＋」學技能，學完按 Esc 關掉') },
    { id: 'done', text: '形態隨時可以切換，沒有冷卻', sub: '三頁技能分開保存，升級的技能點三頁都會加。遇到不同的怪，試試不同路線' },
  ];
  const val = (v) => (typeof v === 'function' ? v() : v);

  const FT = (G.formTut = {
    active: false,
    idx: 0,
    t: 0,
    doneT: 0,

    tier() {
      const f = G.data.forms[G.player.form];
      return (f && f.tier) || 0;
    },

    start() {
      this.active = true;
      this.idx = 0;
      this.t = 0;
      this.form0 = G.player.form;
      G.world.flags.formHint = true; // 取代 remind.js 的一次性形態提示
      G.audio.play('quest');
    },

    finish() {
      this.active = false;
      G.world.flags.formTut = true;
      G.save.write();
    },

    next() {
      this.idx++;
      this.t = 0;
      this.doneT = 0.8;
      G.audio.play('pickup');
      if (this.idx >= STEPS.length) this.finish();
      else if (STEPS[this.idx].id === 'skills') this.page0 = this.learned();
    },

    // 目前這一頁學了幾級技能（學新技能就會變多）
    learned() {
      const sk = G.player.skills || {};
      return Object.keys(sk).reduce((a, k) => a + (sk[k] || 0), 0);
    },

    update(dt) {
      const W = G.world;
      const P = G.player;
      if (!W || !W.map || !W.flags || !P) return;
      if (this.doneT > 0) this.doneT -= dt;
      if (!this.active) {
        if (W.flags.formTut || !W.flags.tutorialDone || W.map.region !== 2 || W.map.type === 'boss') return;
        if (this.tier() < 1 || (G.cut && G.cut.active && G.cut.active()) || (G.story && G.story.cer) || G.ui.blocking()) return;
        this.start();
        return;
      }
      // 離開第二章就不再教（已經會了或不想學）
      if (W.map.region !== 2) return this.finish();
      this.t += dt;
      const s = STEPS[this.idx];
      if (s.id === 'open') {
        G.remind.glow.forms = G.time + 0.3;
        if (G.ui.isOpen('forms')) this.next();
      } else if (s.id === 'switch') {
        if (P.form !== this.form0) this.next();
        else if (!G.ui.isOpen('forms') && this.t > 0.5) {
          // 關掉了視窗還沒切換：回到上一步
          this.idx = 0;
          this.t = 0;
        }
      } else if (s.id === 'skills') {
        if (this.learned() > this.page0 || (!G.ui.isOpen('skills') && this.t > 0.5)) this.next();
      } else if (s.id === 'done') {
        if (this.t > 6 || (this.t > 1 && !G.ui.blocking() && G.input.wasPressed('jump'))) this.next();
      }
    },

    draw(ctx) {
      if (!this.active && this.doneT <= 0) return;
      const s = STEPS[Math.min(this.idx, STEPS.length - 1)];
      if (!this.active) {
        // 最後一步做完：只留一個打勾淡出
        return;
      }
      const W = G.W || 1280;
      const text = val(s.text);
      const sub = val(s.sub);
      ctx.save();
      ctx.font = 'bold 20px ' + G.art.FONT;
      const tw = ctx.measureText(text).width;
      ctx.font = 'bold 14px ' + G.art.FONT;
      const sw = sub ? ctx.measureText(sub).width : 0;
      const w = Math.max(tw, sw) + 70;
      const h = 70 + (sub ? 24 : 0);
      const x0 = W / 2 - w / 2;
      const bob = Math.sin(G.time * 3) * 2;
      // 有視窗開著（形態、技能）時面板貼到畫面最上面（視窗是 HTML、蓋在畫布上，面板放在視窗上緣之上才看得到）
      const y0 = G.ui.blocking() ? 2 : 60 + bob;
      G.hud.panel(ctx, x0, y0, w, h, 14, 'rgba(30,20,12,0.85)');
      ctx.strokeStyle = '#c8a8ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);
      G.hud.text(ctx, '形態教學 ' + (this.idx + 1) + ' / ' + STEPS.length, W / 2, y0 + 20, 13, '#e0d0ff', 'center', false);
      G.hud.text(ctx, text, W / 2, y0 + 48, 20, '#fff6e0', 'center', false);
      if (sub) G.hud.text(ctx, sub, W / 2, y0 + 76, 14, '#e8dcc0', 'center', false);
      if (this.doneT > 0) {
        ctx.globalAlpha = Math.min(1, this.doneT * 2);
        G.hud.text(ctx, '✔', x0 + w - 20, y0 + 22, 24, '#7dff7a', 'center');
      }
      ctx.restore();
    },
  });
  void FT;
})();
