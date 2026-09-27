// 手機觸控操作（楓之谷 M 風格）：左下虛擬搖桿，右下大攻擊鈕＋跳躍＋技能弧形排列＋藥水，右上選單鈕。
// 只在觸控裝置上出現；網址加 ?touch=1 可以在電腦上強制打開（?touch=0 強制關閉）。
// 按鈕透過 G.input.setVirtual() 送出跟鍵盤一樣的「動作」，遊戲邏輯完全不用改。
(function () {
  'use strict';

  const Q = location.search;
  const FORCE_ON = /[?&]touch=1/.test(Q);
  const FORCE_OFF = /[?&]touch=0/.test(Q);
  const COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  // 版面（邏輯座標 1280x720，跟著畫面一起縮放）
  const JOY = { x: 170, y: 560, r: 96, knob: 44 };
  const ZONE = { x: 0, y: 330, w: 470, h: 390 };
  const ATK = { x: 1160, y: 600, r: 70 };
  const BTN = {
    jump: { x: 995, y: 664, r: 44 },
    hpPot: { x: 823, y: 676, r: 30 },
    mpPot: { x: 893, y: 676, r: 30 },
  };
  // 技能 1–4 以攻擊鈕為圓心排成弧形（五轉大招也是放進這 4 格，沒有專屬按鈕）
  const SK_R = 150;
  const SK_ANG = [165, 130, 95, 60];
  const SK_SIZE = 39;

  const I = () => G.input;

  const T = (G.touch = {
    on: false,
    root: null,
    shown: false,
    actShown: false,
    joyId: null,
    joyVec: { x: 0, y: 0 },
    held: {}, // action -> pointerId（按鈕）
    btns: {},
    sk: [],
    portraitOff: false,

    enable() {
      if (this.on || FORCE_OFF) return;
      this.on = true;
      document.body.classList.add('touch-mode');
      this.build();
      this.checkPortrait();
    },

    circle(el, c) {
      el.style.left = c.x - c.r + 'px';
      el.style.top = c.y - c.r + 'px';
      el.style.width = c.r * 2 + 'px';
      el.style.height = c.r * 2 + 'px';
    },

    build() {
      const ui = document.getElementById('ui');
      if (!ui || this.root) return;
      const root = document.createElement('div');
      root.id = 'touch-ctl';
      root.style.display = 'none';
      root.addEventListener('contextmenu', (e) => e.preventDefault());

      // ── 搖桿 ──
      const zone = document.createElement('div');
      zone.className = 'tc-joyzone';
      const base = document.createElement('div');
      base.className = 'tc-joy';
      // 感應區比搖桿大：左下這一整塊按下去都算（座標相對於感應區）
      Object.assign(zone.style, { left: ZONE.x + 'px', top: ZONE.y + 'px', width: ZONE.w + 'px', height: ZONE.h + 'px' });
      this.circle(base, { x: JOY.x - ZONE.x, y: JOY.y - ZONE.y, r: JOY.r });
      base.innerHTML = '<i class="ar u"></i><i class="ar d"></i><i class="ar l"></i><i class="ar r"></i>';
      const knob = document.createElement('div');
      knob.className = 'tc-knob';
      this.circle(knob, { x: JOY.x - ZONE.x, y: JOY.y - ZONE.y, r: JOY.knob });
      zone.appendChild(base);
      zone.appendChild(knob);
      root.appendChild(zone);
      this.zone = zone;
      this.base = base;
      this.knob = knob;
      zone.addEventListener('pointerdown', (e) => this.joyDown(e));
      zone.addEventListener('pointermove', (e) => this.joyMove(e));
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => zone.addEventListener(ev, (e) => this.joyUp(e)));

      // ── 動作按鈕 ──
      const act = document.createElement('div');
      act.className = 'tc-actions';
      root.appendChild(act);
      this.act = act;
      const mk = (action, c, cls, html) => {
        const b = document.createElement('div');
        b.className = 'tc-btn ' + cls;
        this.circle(b, c);
        b.innerHTML = html || '';
        this.bindBtn(b, action);
        act.appendChild(b);
        this.btns[action] = b;
        return b;
      };
      mk('attack', ATK, 'tc-attack', '<img alt="" src="' + G.art.iconURL('claw') + '"><span>攻擊</span>');
      mk('jump', BTN.jump, 'tc-jump', '<b>⤒</b><span>跳躍</span>');
      mk('hpPot', BTN.hpPot, 'tc-pot tc-hp', '<img alt="" src="' + G.art.iconURL('hpPot') + '"><em>0</em>');
      mk('mpPot', BTN.mpPot, 'tc-pot tc-mp', '<img alt="" src="' + G.art.iconURL('mpPot') + '"><em>0</em>');
      const slots = ['skill1', 'skill2', 'skill3', 'skill4'];
      slots.forEach((a, i) => {
        const ang = (SK_ANG[i] * Math.PI) / 180;
        const c = { x: ATK.x + Math.cos(ang) * SK_R, y: ATK.y - Math.sin(ang) * SK_R, r: SK_SIZE };
        const b = mk(a, c, 'tc-skill', '<img alt="" class="hide"><div class="cd"></div><span class="cdt"></span><i>' + (i + 1) + '</i>');
        this.sk.push({ el: b, img: b.querySelector('img'), cd: b.querySelector('.cd'), cdt: b.querySelector('.cdt'), id: undefined, state: '' });
      });

      // ── 選單（等同 Esc）──
      const menu = document.createElement('div');
      menu.className = 'tc-menu';
      menu.innerHTML = '<b>☰</b>';
      menu.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        G.audio.unlock();
        I().escPressed = true;
      });
      root.appendChild(menu);
      this.menu = menu;

      ui.insertBefore(root, ui.firstChild);
      this.root = root;
    },

    bindBtn(b, action) {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        G.audio.unlock();
        try {
          b.setPointerCapture(e.pointerId);
        } catch (err) {}
        this.held[action] = e.pointerId;
        b.classList.add('on');
        I().setVirtual(action, true);
      });
      const up = (e) => {
        if (this.held[action] !== e.pointerId) return;
        delete this.held[action];
        b.classList.remove('on');
        I().setVirtual(action, false);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, up));
    },

    // ── 搖桿 ──
    joyDown(e) {
      e.preventDefault();
      G.audio.unlock();
      if (this.joyId != null) return;
      this.joyId = e.pointerId;
      try {
        this.zone.setPointerCapture(e.pointerId);
      } catch (err) {}
      this.zone.classList.add('on');
      this.joyMove(e);
    },
    joyMove(e) {
      if (e.pointerId !== this.joyId) return;
      const r = this.base.getBoundingClientRect();
      const R = r.width / 2;
      let dx = (e.clientX - (r.left + R)) / R;
      let dy = (e.clientY - (r.top + R)) / R;
      const m = Math.hypot(dx, dy);
      if (m > 1) {
        dx /= m;
        dy /= m;
      }
      this.joyVec = { x: dx, y: dy };
      this.knob.style.transform = 'translate(' + dx * JOY.r * 0.62 + 'px,' + dy * JOY.r * 0.62 + 'px)';
      this.applyJoy();
    },
    joyUp(e) {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.joyVec = { x: 0, y: 0 };
      this.knob.style.transform = '';
      this.zone.classList.remove('on');
      this.applyJoy();
    },
    // 死區 0.28；幾乎垂直（與水平夾角 > 約 58°）才算上／下，走路時不會誤爬繩子
    applyJoy() {
      const { x, y } = this.joyVec;
      const m = Math.hypot(x, y);
      let L = false, R = false, U = false, D = false;
      if (m > 0.28) {
        if (Math.abs(y) > Math.abs(x) * 1.6) {
          if (y < 0) U = true;
          else D = true;
        } else {
          if (x < 0) L = true;
          else R = true;
        }
      }
      const In = I();
      In.setVirtual('left', L);
      In.setVirtual('right', R);
      In.setVirtual('up', U);
      In.setVirtual('down', D);
      this.base.setAttribute('data-dir', L ? 'l' : R ? 'r' : U ? 'u' : D ? 'd' : '');
    },

    releaseAll() {
      this.joyId = null;
      this.joyVec = { x: 0, y: 0 };
      if (this.knob) this.knob.style.transform = '';
      if (this.zone) this.zone.classList.remove('on');
      if (this.base) this.base.setAttribute('data-dir', '');
      for (const a in this.btns) this.btns[a].classList.remove('on');
      this.held = {};
      I().releaseVirtual();
    },

    // ── 每幀：顯示／隱藏、技能圖示、冷卻、藥水數量 ──
    update() {
      if (!this.on || !this.root) return;
      const play = G.scene === 'play' && G.world && G.world.map && G.player;
      const cut = (G.cut && G.cut.active()) || (G.story && G.story.cer) || (G.evolve && G.evolve.anim);
      const show = !!play && !cut;
      const actShow = show && !(G.ui.blocking && G.ui.blocking());
      if (show !== this.shown) {
        this.shown = show;
        this.root.style.display = show ? 'block' : 'none';
      }
      if (actShow !== this.actShown) {
        this.actShown = actShow;
        this.root.classList.toggle('blocked', !actShow);
        if (!actShow) this.releaseAll();
      }
      if (!actShow) return;
      I().holdVirtual();
      // 按住攻擊鈕：一直攻擊（楓之谷 M 的手感）
      if (this.held.attack != null) I().pulse('attack');

      const P = G.player;
      const S = G.data.skills;
      this.sk.forEach((s, i) => {
        const id = P.hotbar[i] || null;
        if (id !== s.id) {
          s.id = id;
          if (id && S[id]) {
            s.img.src = G.art.iconURL(S[id].icon);
            s.img.classList.remove('hide');
          } else s.img.classList.add('hide');
          s.el.classList.toggle('empty', !id);
          // 五轉大招放進技能格時：金框紫底，一眼認得出來
          s.el.classList.toggle('tc-ult', !!(id && S[id] && S[id].form === 'apex'));
        }
        this.cool(s, id);
      });
      const pot = P.potions || {};
      const hpN = (pot.hp || 0) + (pot.hpL || 0) + (pot.hpXL || 0);
      const mpN = (pot.mp || 0) + (pot.mpL || 0) + (pot.mpXL || 0);
      this.count(this.btns.hpPot, hpN);
      this.count(this.btns.mpPot, mpN);
      this.tutorialGlow();
    },

    cool(s, id) {
      const P = G.player;
      const def = id && G.data.skills[id];
      let st = '';
      let frac = 0;
      let txt = '';
      if (def) {
        const lv = P.skills[id] || 0;
        const left = (P.cds && P.cds[id]) || 0;
        if (lv <= 0) st = 'lock';
        else if (left > 0) {
          // 分母用技能的冷卻時間；沒寫（或被其他效果改長）就用這次冷卻看到的最大值
          if (!(s.cdMax > left)) s.cdMax = Math.max(left, def.cd || 0);
          frac = Math.min(1, left / s.cdMax);
          txt = left >= 1 ? String(Math.ceil(left)) : left.toFixed(1);
          st = 'cd';
        } else if ((s.cdMax = 0), typeof def.mp === 'function' && P.mp < def.mp(lv)) st = 'nomp';
      }
      if (st !== s.state) {
        s.state = st;
        s.el.classList.toggle('lock', st === 'lock');
        s.el.classList.toggle('nomp', st === 'nomp');
      }
      const deg = Math.round(frac * 360);
      if (deg !== s.deg) {
        s.deg = deg;
        s.cd.style.background = deg > 0 ? 'conic-gradient(rgba(10,6,20,0.72) ' + deg + 'deg, transparent 0)' : 'none';
      }
      if (txt !== s.txt) {
        s.txt = txt;
        s.cdt.textContent = txt;
      }
    },

    count(b, n) {
      const em = b.querySelector('em');
      if (em.textContent !== String(n)) em.textContent = String(n);
      b.classList.toggle('none', n <= 0);
    },

    // 教學進行中：讓這一步要按的觸控按鈕發光
    tutorialGlow() {
      const tu = G.tutorial;
      const s = tu && tu.current && tu.current();
      const id = s ? s.id : '';
      if (id === this.glowId && id !== 'useSkill') return;
      this.glowId = id;
      const want = {};
      const joy = { move: 1, climb: 1, drop: 1, talk: 1 };
      if (joy[id]) want.joy = 1;
      if (id === 'jump' || id === 'drop' || (s && s.info)) want.jump = 1;
      if (id === 'attack') want.attack = 1;
      if (id === 'potion') want.hpPot = 1;
      if (id === 'mpPot') want.mpPot = 1;
      if (id === 'useSkill') {
        const i = G.player.hotbar.indexOf('roar');
        if (i >= 0 && i < 4) want['skill' + (i + 1)] = 1;
      }
      for (const a in this.btns) this.btns[a].classList.toggle('glow', !!want[a]);
      this.base.classList.toggle('glow', !!want.joy);
    },

    // ── 直向提示 ──
    checkPortrait() {
      if (!this.on) return;
      const portrait = window.innerHeight > window.innerWidth * 1.05;
      let el = document.getElementById('tc-rotate');
      if (portrait && !this.portraitOff) {
        if (!el) {
          el = document.createElement('div');
          el.id = 'tc-rotate';
          el.innerHTML = '<div class="box"><div class="phone">📱</div><div class="msg">請把手機轉成橫向</div><div class="sub">橫向畫面比較大，按鈕也比較好按</div><button type="button">先這樣玩</button></div>';
          el.querySelector('button').addEventListener('click', () => {
            this.portraitOff = true;
            this.checkPortrait();
          });
          document.body.appendChild(el);
        }
      } else if (el) el.remove();
    },
  });

  // 觸控模式時，點畫面（畫布）也能推進過場／開場：有些瀏覽器觸控不一定會補送 mousedown，
  // 這裡只在 pointerup 且沒有 mousedown 跟著來時補一次（避免一次點擊前進兩步）。
  let lastMouse = 0;
  document.addEventListener('mousedown', () => (lastMouse = performance.now()), true);
  document.addEventListener(
    'pointerup',
    (e) => {
      if (e.pointerType !== 'touch' || !T.on) return;
      const t0 = performance.now();
      setTimeout(() => {
        if (lastMouse >= t0 - 400) return; // 瀏覽器已經送過 mousedown
        if (G.cut && G.cut.active()) G.cut.clicked = true;
        if (G.story && G.story.cer && G.story.cer.t > 5) G.story.clicked = true;
        if (G.scene === 'intro' && G.scenes) G.scenes.clicked = true;
      }, 350);
    },
    true
  );

  // iOS：擋掉雙指縮放手勢
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  if (FORCE_ON || (COARSE && !FORCE_OFF)) T.enable();
  else if (!FORCE_OFF) {
    window.addEventListener(
      'touchstart',
      () => {
        T.enable();
      },
      { once: true, passive: true }
    );
  }

  window.addEventListener('resize', () => T.checkPortrait());
  window.addEventListener('orientationchange', () => setTimeout(() => T.checkPortrait(), 200));

  // 真正的手機：第一次點擊時試著全螢幕＋鎖橫向（不支援就算了）
  if (COARSE && !FORCE_OFF) {
    const fs = () => {
      window.removeEventListener('pointerup', fs, true);
      const d = document.documentElement;
      try {
        const p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : null;
        if (p && p.then)
          p.then(() => {
            try {
              const o = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape');
              if (o && o.catch) o.catch(() => {});
            } catch (err) {}
          }).catch(() => {});
      } catch (err) {}
    };
    window.addEventListener('pointerup', fs, true);
  }

  // 自己的更新迴圈（在主迴圈之前註冊，所以每幀先處理觸控再跑遊戲邏輯）
  function loop() {
    try {
      T.update();
    } catch (e) {
      if (!T._err) console.error(e);
      T._err = true;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
