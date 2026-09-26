// 新遊戲的按鍵教學：畫面上方一次只提示一個動作，做到就自動換下一個。
// 按鍵名稱跟著玩家的改鍵設定走。完成後記在 world.flags.tutorialDone。
(function () {
  'use strict';

  const STEPS = [
    { id: 'move', keys: ['left', 'right'], text: '走路' },
    { id: 'jump', keys: ['jump'], text: '跳躍' },
    { id: 'attack', keys: ['attack'], text: '攻擊露珠蝸' },
    { id: 'climb', keys: ['up'], text: '跳上左邊的平台，站到發光的藤蔓前往上爬' },
    { id: 'talk', keys: ['up'], text: '走到營地的動物旁邊，和牠說話' },
  ];

  const T = (G.tutorial = {
    active: false,
    done: {},
    moved: 0,
    lastX: 0,
    doneT: 0, // 某一步剛完成的打勾動畫
    outroT: 0, // 全部完成後的補充說明

    start() {
      this.active = true;
      this.done = {};
      this.moved = 0;
      this.lastX = G.player.x;
      this.doneT = 0;
      this.outroT = 0;
    },

    current() {
      return STEPS.find((s) => !this.done[s.id]) || null;
    },

    // 外部事件（例如開啟對話）
    on(id) {
      if (!this.active || this.done[id]) return;
      this.done[id] = true;
      this.doneT = 0.8;
      G.audio.play('pickup');
      if (!this.current()) this.finish();
    },

    finish() {
      this.outroT = 9;
      G.world.flags.tutorialDone = true;
      G.save.write();
    },

    update(dt) {
      if (!this.active) return;
      if (this.doneT > 0) this.doneT -= dt;
      if (this.outroT > 0) {
        this.outroT -= dt;
        if (this.outroT <= 0) this.active = false;
        return;
      }
      const P = G.player;
      const I = G.input;
      this.moved += Math.abs(P.x - this.lastX);
      this.lastX = P.x;
      if (this.moved > 140) this.on('move');
      if (I.wasPressed('jump') && P.climbing < 0) this.on('jump');
      if (I.wasPressed('attack')) this.on('attack');
      if (P.climbing >= 0) this.on('climb');
    },

    keycap(ctx, label, x, y) {
      ctx.font = 'bold 18px ' + G.art.FONT;
      const w = Math.max(34, ctx.measureText(label).width + 18);
      G.hud.panel(ctx, x, y - 17, w, 34, 7, '#fff6de');
      ctx.strokeStyle = '#8a5a30';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 0.5, y - 16.5, w - 1, 33);
      ctx.fillStyle = 'rgba(138,90,48,0.35)';
      ctx.fillRect(x + 2, y + 12, w - 4, 3);
      ctx.fillStyle = '#4a2e1f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y);
      return w;
    },

    draw(ctx) {
      if (!this.active) return;
      const W = G.W;
      const L = (a) => G.input.label(a);
      if (this.outroT > 0) {
        const a = Math.min(1, this.outroT, (9 - this.outroT) * 3);
        ctx.globalAlpha = Math.max(0, a);
        const items = [['inventory', '背包'], ['skills', '技能'], ['quests', '任務'], ['hpPot', '紅果'], ['mpPot', '藍花蜜']];
        ctx.font = 'bold 16px ' + G.art.FONT;
        let total = 0;
        items.forEach(([k, t]) => (total += Math.max(34, ctx.measureText(L(k)).width + 18) + ctx.measureText(t).width + 26));
        total += ctx.measureText('Esc 選單').width;
        const x0 = W / 2 - total / 2 - 20;
        G.hud.panel(ctx, x0, 60, total + 40, 84, 14, 'rgba(30,20,12,0.78)');
        G.hud.text(ctx, '學會了！其他按鍵：', W / 2, 80, 15, '#ffe9a0', 'center', false);
        let x = x0 + 20;
        items.forEach(([k, t]) => {
          x += this.keycap(ctx, L(k), x, 118) + 6;
          ctx.font = 'bold 16px ' + G.art.FONT;
          ctx.fillStyle = '#fff6e0';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(t, x, 118);
          x += ctx.measureText(t).width + 20;
        });
        ctx.fillText('Esc 選單', x, 118);
        ctx.globalAlpha = 1;
        return;
      }
      const s = this.current();
      if (!s) return;
      const idx = STEPS.indexOf(s);
      ctx.font = 'bold 18px ' + G.art.FONT;
      const keysW = s.keys.reduce((a, k) => a + Math.max(34, ctx.measureText(L(k)).width + 18) + 6, 0);
      const tw = ctx.measureText(s.text).width;
      const w = keysW + tw + 60;
      const x0 = W / 2 - w / 2;
      const bob = Math.sin(G.time * 3) * 2;
      G.hud.panel(ctx, x0, 64 + bob, w, 72, 14, 'rgba(30,20,12,0.78)');
      G.hud.text(ctx, '操作教學 ' + (idx + 1) + '/' + STEPS.length, W / 2, 80 + bob, 13, '#ffe9a0', 'center', false);
      let x = x0 + 24;
      s.keys.forEach((k) => (x += this.keycap(ctx, L(k), x, 110 + bob) + 6));
      ctx.font = 'bold 18px ' + G.art.FONT;
      ctx.fillStyle = '#fff6e0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text, x + 8, 110 + bob);
      if (this.doneT > 0) {
        ctx.globalAlpha = Math.min(1, this.doneT * 2);
        G.hud.text(ctx, '✔', x0 + w - 18, 80 + bob, 22, '#7dff7a', 'center');
        ctx.globalAlpha = 1;
      }
    },
  });

  T.STEPS = STEPS;
})();
