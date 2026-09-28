// 畫面左上角的小圖示：裝備、技能、形態、地圖、任務、圖鑑、鍵盤。點一下就打開對應的視窗。
(function () {
  'use strict';
  const A = G.art;

  function draw(fn) {
    const c = document.createElement('canvas');
    c.width = 76;
    c.height = 76;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    ctx.translate(19, 21);
    fn(ctx);
    return c.toDataURL();
  }

  const ICONS = {
    // 裝備：爪套＋鬃飾
    inventory: () => draw((ctx) => {
      ctx.scale(0.9, 0.9);
      A.drawIcon(ctx, 'claw', 0, 0, 1);
    }),
    skills: () => draw((ctx) => {
      ctx.scale(0.9, 0.9);
      A.drawIcon(ctx, 'pounce', 0, 0, 1);
    }),
    // 形態：三色的小獅子頭輪廓
    forms: () => draw((ctx) => {
      ctx.translate(0, 18);
      ctx.scale(0.36, 0.36);
      A.drawLion(ctx, 0, 0, 1, { state: 'idle', t: 0, p: 0, onGround: true });
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.translate(19, 21);
      [['#e8a040', -10], ['#5fd0c8', 0], ['#a8d04a', 10]].forEach(([c, x]) => A.ellipse(ctx, x, 13, 3.4, 3.4, c, null, { lw: 1.4, hl: false }));
    }),
    // 地圖：攤開的羊皮紙＋路線
    worldmap: () => draw((ctx) => {
      A.shape(ctx, (c) => { c.moveTo(-14, -11); c.lineTo(-5, -14); c.lineTo(5, -11); c.lineTo(14, -14); c.lineTo(14, 11); c.lineTo(5, 14); c.lineTo(-5, 11); c.lineTo(-14, 14); c.closePath(); }, '#f2dfa8', '#dcc080', { lw: 2, hl: false });
      ctx.strokeStyle = A.c('#b0875a');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, -14); ctx.lineTo(-5, 11); ctx.moveTo(5, -11); ctx.lineTo(5, 14);
      ctx.stroke();
      ctx.strokeStyle = A.c('#c0392b');
      ctx.lineWidth = 2;
      ctx.setLineDash([2.5, 2.5]);
      ctx.beginPath();
      ctx.moveTo(-10, 7); ctx.quadraticCurveTo(-2, 4, 1, -2); ctx.quadraticCurveTo(4, -7, 9, -7);
      ctx.stroke();
      ctx.setLineDash([]);
      A.ellipse(ctx, 9, -7, 2.6, 2.6, '#e84a3a', null, { lw: 1.4, hl: false });
    }),
    // 任務：捲軸＋驚嘆號
    quests: () => draw((ctx) => {
      A.shape(ctx, (c) => A.roundRect(c, -10, -13, 20, 26, 3), '#fff3d0', '#e8d4a0', { lw: 2, hl: false });
      A.ellipse(ctx, 0, -13, 12, 3.5, '#c89a5a', null, { lw: 2, hl: false });
      A.ellipse(ctx, 0, 13, 12, 3.5, '#c89a5a', null, { lw: 2, hl: false });
      G.hud.text(ctx, '!', 0, 1, 18, '#e0503a', 'center', false);
    }),
    // 圖鑑：翻開的書＋星星
    codex: () => draw((ctx) => {
      A.shape(ctx, (c) => { c.moveTo(0, -9); c.quadraticCurveTo(-8, -14, -16, -11); c.lineTo(-16, 12); c.quadraticCurveTo(-8, 9, 0, 14); c.closePath(); }, '#6fa0e0', '#4a78c0', { lw: 2, hl: false });
      A.shape(ctx, (c) => { c.moveTo(0, -9); c.quadraticCurveTo(8, -14, 16, -11); c.lineTo(16, 12); c.quadraticCurveTo(8, 9, 0, 14); c.closePath(); }, '#fff3d0', '#e8d4a0', { lw: 2, hl: false });
      A.ellipse(ctx, -8, 0, 4, 5, '#1d1330', null, { lw: 1, hl: false });
      G.hud.text(ctx, '★', 8, 2, 13, '#e0a020', 'center', false);
    }),
    // 鍵盤：米色鍵帽排三排，空白鍵長一條，其中一顆橘色（像是正在改的那顆）
    keys: () => draw((ctx) => {
      A.shape(ctx, (c) => A.roundRect(c, -17, -10, 34, 24, 4), '#6a4a30', '#4a3020', { lw: 2, hl: false });
      const cap = (x, y, w, col) => A.shape(ctx, (c) => A.roundRect(c, x, y, w, 5, 1.2), col, null, { lw: 1, hl: false });
      for (let i = 0; i < 6; i++) cap(-14.5 + i * 5, -7.5, 4, i === 2 ? '#ffb040' : '#fff3d0');
      for (let i = 0; i < 5; i++) cap(-12 + i * 5, -1.5, 4, '#fff3d0');
      cap(-14.5, 4.5, 4, '#fff3d0');
      cap(-9.5, 4.5, 19, '#fff3d0');
      cap(10.5, 4.5, 4, '#fff3d0');
    }),
  };

  const LIST = [
    ['inventory', '裝備'],
    ['skills', '技能'],
    ['forms', '形態'],
    ['worldmap', '地圖'],
    ['quests', '任務'],
    ['codex', '圖鑑'],
    ['keys', '鍵盤'],
  ];

  const H = (G.hudIcons = {
    el: null,
    badges: {},
    t: 0,

    build() {
      const root = document.getElementById('ui');
      if (!root || this.el) return;
      const el = document.createElement('div');
      el.id = 'hud-icons';
      LIST.forEach(([id, name]) => {
        const b = document.createElement('button');
        b.setAttribute('data-win', id);
        b.innerHTML = '<img alt="" src="' + ICONS[id]() + '"><span class="tip">' + name + '</span><span class="badge hide"></span>';
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          G.audio.unlock();
          if (G.scene !== 'play') return;
          G.ui.toggle(id);
        });
        this.badges[id] = b.querySelector('.badge');
        el.appendChild(b);
      });
      root.insertBefore(el, root.firstChild);
      this.el = el;
    },

    // 每幀從主迴圈呼叫：只在遊戲中顯示，並更新小紅點
    update(dt) {
      this.build();
      if (!this.el) return;
      const show = G.scene === 'play' && !G.evolve.anim;
      this.el.style.display = show ? 'flex' : 'none';
      this.t -= dt;
      if (!show || this.t > 0) return;
      this.t = 0.25;
      const P = G.player;
      const set = (id, txt) => {
        const b = this.badges[id];
        if (!b) return;
        b.textContent = txt || '';
        b.classList.toggle('hide', !txt);
      };
      G.codex.note('forms', P.form);
      set('skills', P.sp > 0 ? String(P.sp) : '');
      // 教學（左上角圖示導覽、點技能圖示）：讓指到的圖示發光並顯示名稱
      const glow = G.tutorial && G.tutorial.tourIcon ? G.tutorial.tourIcon() : null;
      LIST.forEach(([id]) => {
        const b = this.el.querySelector('[data-win="' + id + '"]');
        if (!b) return;
        const rem = !!(G.remind && G.remind.glowing(id));
        b.classList.toggle('tut-glow', glow === id || rem);
        b.classList.toggle('tut-show', glow === id);
      });
      set('forms', G.evolve.canEvolve() ? '↑' : '');
      const ready = Object.keys(G.quests.state).filter((id) => G.quests.state[id] === 'ready').length;
      set('quests', ready ? String(ready) : '');
      // 有新裝備：NEW（打開背包再關上就消失）；有比身上好的：▲
      set('inventory', P.bag.some((it) => it.isNew) ? 'NEW' : P.bag.some((it) => G.ui.isUpgrade && G.ui.isUpgrade(it)) ? '▲' : '');
    },

    // 改鍵之後更新提示文字
    refresh() {
      if (!this.el) return;
      this.el.remove();
      this.el = null;
      this.badges = {};
    },
  });

  H.ICONS = ICONS;
})();
