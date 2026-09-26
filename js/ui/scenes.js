// 標題畫面、開場、進入遊戲。
(function () {
  'use strict';
  const U = G.util;
  const A = G.art;

  const S = (G.scenes = {
    introIdx: 0,
    introT: 0,
    titleT: 0,
    titleEl: null,

    toTitle() {
      G.scene = 'title';
      this.titleT = 0;
      G.ui.closeAll();
      G.hud.reset();
      this.showTitle();
    },

    showTitle() {
      this.hideTitle();
      const el = document.createElement('div');
      el.className = 'title-screen';
      const save = G.save.peek();
      let cont = '';
      if (save && save.player) {
        const m = save.pos && G.data.maps[save.pos.map] ? G.data.maps[save.pos.map].name : '營地';
        cont = '<button class="primary big" data-t="continue">繼續遊戲<small>Lv.' + save.player.level + ' · ' + m + ' · ' + U.fmtTime(save.player.playTime || 0) + '</small></button>';
      }
      el.innerHTML =
        '<div class="logo"><div class="name">小獅子的冒險</div><div class="sub">一隻小獅子，往天空的家爬回去</div></div>' +
        '<div class="tbtns">' + cont +
        '<button class="' + (cont ? '' : 'primary ') + 'big" data-t="new">' + (cont ? '新遊戲' : '開始冒險') + '</button>' +
        '<button data-t="keys">按鍵設定</button></div>' +
        '<div class="hint">方向鍵移動 · ' + G.input.label('jump') + ' 跳躍 · ' + G.input.label('attack') + ' 攻擊 · ↑ 爬繩／對話／傳送門 · Esc 選單</div>' +
        '<div class="ver">M1 試玩版' + (G.debug ? ' · 除錯模式' : '') + '</div>';
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-t]');
        if (!b) return;
        G.audio.unlock();
        G.audio.play('ui');
        const t = b.getAttribute('data-t');
        if (t === 'continue') this.continueGame();
        else if (t === 'new') {
          if (save && !b.classList.contains('confirm')) {
            b.classList.add('confirm');
            b.innerHTML = '再按一次：覆蓋目前存檔';
            return;
          }
          G.save.clear();
          this.newGame();
        } else if (t === 'keys') {
          G.ui.open('keys');
        }
      });
      document.getElementById('ui').appendChild(el);
      this.titleEl = el;
    },

    hideTitle() {
      if (this.titleEl) this.titleEl.remove();
      this.titleEl = null;
    },

    newGame() {
      this.hideTitle();
      G.ui.closeAll();
      G.player.newGame();
      G.quests.reset();
      G.world.resetProgress();
      G.hud.reset();
      G.scene = 'intro';
      this.introIdx = 0;
      this.introT = 0;
    },

    continueGame() {
      const data = G.save.peek();
      if (!data) return this.newGame();
      this.hideTitle();
      G.hud.reset();
      let r;
      try {
        r = G.save.apply(data);
      } catch (e) {
        console.error(e);
        G.hud.toast('存檔讀取失敗，從營地開始', '#ff9a9a');
        r = { map: '1-1', entry: 'camp' };
      }
      this.startPlay(r.map, r.entry);
    },

    startPlay(mapId, entry) {
      G.scene = 'play';
      G.world.fade = 1;
      G.world.fadeDir = -1;
      G.world.load(mapId, entry);
      G.save.write();
    },

    // ── 開場 ──
    updateIntro(dt) {
      this.introT += dt;
      const I = G.input;
      if (I.escPressed) return this.endIntro();
      if ((I.anyPressed || this.clicked) && this.introT > 0.6) {
        this.clicked = false;
        this.introIdx++;
        this.introT = 0;
        if (this.introIdx >= G.data.story.intro.length) this.endIntro();
      } else if (this.introT > 7) {
        this.introIdx++;
        this.introT = 0;
        if (this.introIdx >= G.data.story.intro.length) this.endIntro();
      }
      this.clicked = false;
    },

    endIntro() {
      this.startPlay('1-1', 'start');
      G.hud.toast('按 ↑ 和營地裡的動物說話', '#fff3a0');
    },

    drawIntro(ctx) {
      const page = G.data.story.intro[Math.min(this.introIdx, G.data.story.intro.length - 1)];
      const t = this.introT;
      const W = G.W;
      const H = G.H;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      const fadeIn = Math.min(1, t / 0.8);
      ctx.globalAlpha = fadeIn;
      if (page.scene === 'storm') this.sceneStorm(ctx, t);
      else if (page.scene === 'fall') this.sceneFall(ctx, t);
      else this.sceneWake(ctx, t);
      ctx.restore();
      // 文字
      ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.3) / 0.8));
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, H - 150, W, 110);
      G.hud.text(ctx, page.text, W / 2, H - 95, 24, '#fff6e0', 'center');
      ctx.globalAlpha = 1;
      G.hud.text(ctx, '按任意鍵繼續 · Esc 跳過', W - 20, H - 20, 13, 'rgba(255,255,255,0.6)', 'right', false);
    },

    sceneStorm(ctx, t) {
      const W = G.W;
      const H = G.H;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2a2f4a');
      g.addColorStop(1, '#5a5f7a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // 雲海
      ctx.fillStyle = '#8a8fa8';
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc(((i * 110 + t * 30) % (W + 200)) - 100, H - 120 + Math.sin(i) * 20, 90, 0, Math.PI * 2);
        ctx.fill();
      }
      // 浮空遺跡
      ctx.save();
      ctx.translate(W / 2, 300 + Math.sin(t) * 6);
      ctx.fillStyle = '#4a4458';
      ctx.beginPath();
      ctx.moveTo(-220, 0);
      ctx.lineTo(220, 0);
      ctx.lineTo(120, 90);
      ctx.lineTo(20, 150);
      ctx.lineTo(-100, 80);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5c566c';
      ctx.fillRect(-160, -110, 60, 110);
      ctx.fillRect(-60, -170, 80, 170);
      ctx.fillRect(60, -90, 50, 90);
      ctx.fillStyle = '#f7b547';
      ctx.beginPath();
      ctx.arc(140, -8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // 雨與閃電
      ctx.strokeStyle = 'rgba(200,210,255,0.4)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 80; i++) {
        const x = (i * 97 + t * 900) % W;
        const y = (i * 53 + t * 1300) % H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y + 22);
        ctx.stroke();
      }
      if (Math.sin(t * 3.1) > 0.97) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(0, 0, W, H);
      }
    },

    sceneFall(ctx, t) {
      const W = G.W;
      const H = G.H;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#6a88b8');
      g.addColorStop(1, '#b8d0e8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 10; i++) {
        const y = ((i * 170 - t * 700) % (H + 300) + H + 300) % (H + 300) - 150;
        ctx.beginPath();
        ctx.ellipse((i * 331) % W, y, 140, 40, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const x = W / 2 - 60 + i * 11;
        ctx.beginPath();
        ctx.moveTo(x, H / 2 - 150);
        ctx.lineTo(x, H / 2 - 60);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(W / 2, H / 2 + 20);
      ctx.rotate(Math.sin(t * 2) * 0.4 + t * 0.6);
      ctx.scale(1.6, 1.6);
      A.drawLion(ctx, 0, 30, 1, { state: 'hurt', t, p: 0 });
      ctx.restore();
    },

    sceneWake(ctx, t) {
      const map = G.data.maps['1-1'];
      if (!map._theme) A.prepareMap(map);
      A.drawBackground(ctx, map, { x: 200 + t * 10, y: map.h - G.H }, t);
      ctx.fillStyle = '#7bbf4a';
      ctx.fillRect(0, G.H - 180, G.W, 14);
      ctx.fillStyle = '#9a6a42';
      ctx.fillRect(0, G.H - 168, G.W, 168);
      ctx.save();
      ctx.translate(G.W / 2, G.H - 180);
      ctx.scale(1.8, 1.8);
      const st = t < 2.5 ? 'dead' : 'idle';
      A.drawLion(ctx, 0, 0, 1, { state: st, t, p: 0, onGround: true });
      ctx.restore();
      A.drawAtmosphere(ctx, map, { x: 200 + t * 10, y: 0 }, t);
    },

    // ── 標題背景 ──
    drawTitle(ctx, dt) {
      this.titleT += dt;
      const map = G.data.maps['1-2'];
      if (!map._theme) A.prepareMap(map);
      const cam = { x: this.titleT * 30, y: map.h - G.H };
      A.drawBackground(ctx, map, cam, this.titleT);
      ctx.fillStyle = '#7bbf4a';
      ctx.fillRect(0, G.H - 140, G.W, 14);
      ctx.fillStyle = '#9a6a42';
      ctx.fillRect(0, G.H - 128, G.W, 128);
      ctx.save();
      ctx.translate(G.W / 2 - 250, G.H - 140);
      ctx.scale(2, 2);
      A.drawLion(ctx, 0, 0, 1, { state: 'walk', t: this.titleT, p: 0, onGround: true });
      ctx.restore();
      [['snail', 1, 380, 1.6], ['mushroom', 1, 520, 1.6], ['sprite', 2, 250, 1.5]].forEach(([art, stage, dx, sc], i) => {
        const m = { def: { art, stage, name: '' }, x: G.W / 2 + dx, y: G.H - 140, dir: -1, t: this.titleT + i, w: 40, h: 40, scale: sc, onGround: true, vy: 0, hurtT: 0, hurtFlash: 0, dead: false, deadT: 0 };
        A.drawMonster(ctx, m);
      });
      A.drawAtmosphere(ctx, map, cam, this.titleT);
    },
  });

  document.addEventListener('mousedown', () => {
    if (G.scene === 'intro') S.clicked = true;
  });
})();
