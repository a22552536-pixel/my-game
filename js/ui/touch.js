// 手機觸控操作（楓之谷 M 風格）：左半邊按哪裡就在哪裡出現的浮動搖桿；右下大顆跳躍鈕，
// 技能 1–4 以跳躍鈕為圓心排成弧形，攻擊鈕縮小放在右下角落；藥水鈕在技能弧左下；右上選單鈕＋全螢幕鈕。
// 觸控偵測：(pointer: coarse)、(any-pointer: coarse)、maxTouchPoints、ontouchstart 任一成立就打開；
// 就算都沒偵測到，第一次真的用手指點畫面（任何時候，包括標題畫面）也會自動打開。
// 網址加 ?touch=1 可以在電腦上強制打開（?touch=0 強制關閉）。
// 按鈕透過 G.input.setVirtual() 送出跟鍵盤一樣的「動作」，遊戲邏輯完全不用改。
(function () {
  'use strict';

  const Q = location.search;
  const FORCE_ON = /[?&]touch=1/.test(Q);
  const FORCE_OFF = /[?&]touch=0/.test(Q);
  const mm = (q) => {
    try {
      return !!(window.matchMedia && window.matchMedia(q).matches);
    } catch (e) {
      return false;
    }
  };
  const TOUCH_DEV = mm('(pointer: coarse)') || mm('(any-pointer: coarse)') || (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;

  // 版面（邏輯座標 1280x720，跟著畫面一起縮放）；安全區（瀏海、圓角）在 layout() 裡再往內推
  const LW = 1280;
  const LH = 720;
  const JOY = { x: 170, y: 540, r: 96, knob: 44 }; // 搖桿平常的位置（淡淡的提示）
  const ZONE = { x: 0, y: 100, w: 576, h: 620 }; // 左邊 45%、頂端圖示列以下：按哪裡搖桿就出現在哪裡
  const JUMP = { x: 1130, y: 590, r: 72 }; // 主要大按鈕：跳躍
  const ATK = { x: 1238, y: 678, r: 36 }; // 普攻：右下角落的小按鈕
  const POT = { hpPot: { x: 868, y: 678, r: 30 }, mpPot: { x: 940, y: 678, r: 30 } };
  // 技能 1–4 以跳躍鈕為圓心排成弧形（五轉大招也是放進這 4 格，沒有專屬按鈕）
  const SK_R = 150;
  const SK_ANG = [185, 145, 105, 65];
  const SK_SIZE = 39;
  const TOP = { menu: { x: 914, y: 8, w: 58, h: 44 }, fs: { x: 848, y: 8, w: 58, h: 44 } };

  const I = () => G.input;

  // ── 全螢幕（電腦也能用：Esc 選單裡有按鈕）──
  const FS = (G.fullscreen = {
    supported() {
      const d = document;
      const el = d.documentElement;
      return !!((d.fullscreenEnabled || d.webkitFullscreenEnabled) && (el.requestFullscreen || el.webkitRequestFullscreen));
    },
    active() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement);
    },
    // 已經是從主畫面開啟的 App（iPhone 加入主畫面）：本來就沒有瀏覽器介面
    standalone() {
      if (navigator.standalone) return true;
      if (this.active()) return false; // 網頁全螢幕時 display-mode 也會變成 fullscreen，不算
      return mm('(display-mode: fullscreen)') || mm('(display-mode: standalone)');
    },
    lockLandscape() {
      try {
        const o = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape');
        if (o && o.catch) o.catch(() => {});
      } catch (err) {}
    },
    enter() {
      const el = document.documentElement;
      try {
        let p = null;
        if (el.requestFullscreen) p = el.requestFullscreen({ navigationUI: 'hide' });
        else if (el.webkitRequestFullscreen) p = el.webkitRequestFullscreen();
        if (p && p.then) p.then(() => this.lockLandscape()).catch(() => {});
        else this.lockLandscape();
      } catch (err) {}
    },
    exit() {
      const d = document;
      try {
        const p = d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen ? d.webkitExitFullscreen() : null;
        if (p && p.catch) p.catch(() => {});
      } catch (err) {}
    },
    toggle() {
      if (this.active()) this.exit();
      else this.enter();
    },
    isIOS() {
      const ua = navigator.userAgent || '';
      return /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
    },
  });

  const T = (G.touch = {
    on: false,
    root: null,
    shown: false,
    actShown: false,
    joyId: null,
    joyVec: { x: 0, y: 0 },
    joyC: { x: JOY.x, y: JOY.y }, // 搖桿目前的圓心（邏輯座標，相對於畫面）
    held: {}, // action -> pointerId（按鈕）
    btns: {},
    sk: [],
    safe: { l: 0, r: 0, t: 0, b: 0 },
    portraitOff: false,
    autoFsTried: false,

    enable() {
      if (this.on || FORCE_OFF) return;
      this.on = true;
      document.body.classList.add('touch-mode');
      // 觸控模式晚開（第一次觸控才偵測到）：重新算畫布解析度、打開省效能模式
      if (G.resize) G.resize();
      this.build();
      this.checkPortrait();
      // 已經開著的視窗重畫成觸控版
      try {
        if (G.ui && G.ui.refresh) G.ui.refresh();
      } catch (e) {}
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

      // ── 浮動搖桿 ──
      const zone = document.createElement('div');
      zone.className = 'tc-joyzone idle';
      const base = document.createElement('div');
      base.className = 'tc-joy';
      base.innerHTML = '<i class="ar u"></i><i class="ar d"></i><i class="ar l"></i><i class="ar r"></i>';
      const knob = document.createElement('div');
      knob.className = 'tc-knob';
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
      const mk = (action, cls, html) => {
        const b = document.createElement('div');
        b.className = 'tc-btn ' + cls;
        b.innerHTML = html || '';
        this.bindBtn(b, action);
        act.appendChild(b);
        this.btns[action] = b;
        return b;
      };
      mk('jump', 'tc-jump', '<b>⤒</b><span>跳躍</span>');
      mk('attack', 'tc-attack', '<img alt="" src="' + G.art.iconURL('claw') + '"><span>攻擊</span>');
      mk('hpPot', 'tc-pot tc-hp', '<img alt="" src="' + G.art.iconURL('hpPot') + '"><em>0</em>');
      mk('mpPot', 'tc-pot tc-mp', '<img alt="" src="' + G.art.iconURL('mpPot') + '"><em>0</em>');
      ['skill1', 'skill2', 'skill3', 'skill4'].forEach((a, i) => {
        const b = mk(a, 'tc-skill', '<img alt="" class="hide"><div class="cd"></div><span class="cdt"></span><i>' + (i + 1) + '</i>');
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

      // ── 全螢幕鈕（瀏覽器支援才有作用；iPhone Safari 不支援，改成提示「加入主畫面」）──
      const fs = document.createElement('div');
      fs.className = 'tc-menu tc-fs';
      fs.innerHTML = '<b></b>';
      fs.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        G.audio.unlock();
        if (FS.supported()) FS.toggle();
        else this.iosHint(true);
      });
      root.appendChild(fs);
      this.fsBtn = fs;
      this.syncFs();

      ui.insertBefore(root, ui.firstChild);
      this.root = root;
      this.layout();
    },

    // 安全區（瀏海／圓角／Home 條）：量 env(safe-area-inset-*)，扣掉黑邊之後換算成邏輯座標
    measureSafe() {
      let p = document.getElementById('tc-safe-probe');
      if (!p) {
        p = document.createElement('div');
        p.id = 'tc-safe-probe';
        p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
        document.body.appendChild(p);
      }
      const cs = getComputedStyle(p);
      const v = (k) => parseFloat(cs[k]) || 0;
      const ins = { l: v('paddingLeft'), r: v('paddingRight'), t: v('paddingTop'), b: v('paddingBottom') };
      const st = document.getElementById('stage');
      const r = st ? st.getBoundingClientRect() : null;
      if (!r || !r.width) return { l: 0, r: 0, t: 0, b: 0 };
      const k = LW / r.width;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // 黑邊寬度（畫面還沒縮放好時可能是負的，當成 0）
      const gap = (g) => Math.max(0, g);
      return {
        l: Math.max(0, ins.l - gap(r.left)) * k,
        r: Math.max(0, ins.r - gap(vw - r.right)) * k,
        t: Math.max(0, ins.t - gap(r.top)) * k,
        b: Math.max(0, ins.b - gap(vh - r.bottom)) * k,
      };
    },

    layout() {
      if (!this.root) return;
      const s = (this.safe = this.measureSafe());
      const dx = -s.r; // 右邊的按鈕群往左推
      const dy = -s.b;
      Object.assign(this.zone.style, { left: ZONE.x + 'px', top: ZONE.y + 'px', width: ZONE.w + s.l + 'px', height: ZONE.h + 'px' });
      this.rest = { x: JOY.x + s.l, y: JOY.y + dy };
      if (this.joyId == null) this.placeJoy(this.rest.x, this.rest.y);
      const at = (c) => ({ x: c.x + dx, y: c.y + dy, r: c.r });
      const J = at(JUMP);
      this.circle(this.btns.jump, J);
      this.circle(this.btns.attack, at(ATK));
      this.circle(this.btns.hpPot, at(POT.hpPot));
      this.circle(this.btns.mpPot, at(POT.mpPot));
      this.sk.forEach((sk, i) => {
        const ang = (SK_ANG[i] * Math.PI) / 180;
        this.circle(sk.el, { x: J.x + Math.cos(ang) * SK_R, y: J.y - Math.sin(ang) * SK_R, r: SK_SIZE });
      });
      const top = (el, b) => Object.assign(el.style, { left: b.x - s.r + 'px', top: b.y + s.t + 'px', width: b.w + 'px', height: b.h + 'px' });
      top(this.menu, TOP.menu);
      top(this.fsBtn, TOP.fs);
    },

    // 搖桿圓心放到 (x, y)（邏輯座標）
    placeJoy(x, y) {
      this.joyC = { x, y };
      const zx = x - ZONE.x;
      const zy = y - ZONE.y;
      this.circle(this.base, { x: zx, y: zy, r: JOY.r });
      this.circle(this.knob, { x: zx, y: zy, r: JOY.knob });
    },

    // 螢幕座標 → 邏輯座標
    toLogical(cx, cy) {
      const r = document.getElementById('stage').getBoundingClientRect();
      const k = LW / r.width;
      return { x: (cx - r.left) * k, y: (cy - r.top) * k };
    },

    // 某個觸控按鈕在畫面上的位置（邏輯座標 [x, y, w, h]；教學的外框、箭頭用）
    rectOf(name) {
      if (!this.on || !this.root || !this.shown) return null;
      const el = name === 'joy' ? this.base : this.btns[name];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width) return null;
      const a = this.toLogical(r.left, r.top);
      const b = this.toLogical(r.right, r.bottom);
      return [a.x, a.y, b.x - a.x, b.y - a.y];
    },

    syncFs() {
      if (!this.fsBtn) return;
      const can = FS.supported() || FS.isIOS();
      this.fsBtn.style.visibility = can && !FS.standalone() ? 'visible' : 'hidden';
      const on = FS.active();
      this.fsBtn.classList.toggle('on', on);
      this.fsBtn.querySelector('b').textContent = on ? '⤡' : '⛶';
      this.fsBtn.title = on ? '離開全螢幕' : '全螢幕';
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

    // ── 浮動搖桿：手指按下的地方就是圓心，放開才回到原位 ──
    joyDown(e) {
      e.preventDefault();
      G.audio.unlock();
      if (this.joyId != null) return;
      this.joyId = e.pointerId;
      try {
        this.zone.setPointerCapture(e.pointerId);
      } catch (err) {}
      const p = this.toLogical(e.clientX, e.clientY);
      const R = JOY.r;
      const x = Math.max(R + 4 + this.safe.l, p.x);
      const y = Math.min(LH - R - 4 - this.safe.b, Math.max(ZONE.y + R * 0.4, p.y));
      this.placeJoy(x, y);
      this.zone.classList.add('on');
      this.zone.classList.remove('idle');
      this.joyMove(e);
    },
    joyMove(e) {
      if (e.pointerId !== this.joyId) return;
      const p = this.toLogical(e.clientX, e.clientY);
      let dx = (p.x - this.joyC.x) / JOY.r;
      let dy = (p.y - this.joyC.y) / JOY.r;
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
      this.resetJoy();
      this.applyJoy();
    },
    resetJoy() {
      this.joyId = null;
      this.joyVec = { x: 0, y: 0 };
      if (!this.knob) return;
      this.knob.style.transform = '';
      this.zone.classList.remove('on');
      this.zone.classList.add('idle');
      if (this.rest) this.placeJoy(this.rest.x, this.rest.y);
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
      this.resetJoy();
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
        if (show) this.layout();
      }
      if (actShow !== this.actShown) {
        this.actShown = actShow;
        this.root.classList.toggle('blocked', !actShow);
        if (!actShow) this.releaseAll();
      }
      this.tutorialWin();
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
      const joy = { move: 1, climb: 1, drop: 1, talk: 1, shop: 1 };
      if (joy[id]) want.joy = 1;
      if (id === 'jump' || id === 'drop' || (s && s.info)) want.jump = 1;
      if (id === 'attack') want.attack = 1;
      if (id === 'potion') want.hpPot = 1;
      if (id === 'mpPot') want.mpPot = 1;
      if (id === 'infoSlots') want.skill1 = want.skill2 = want.skill3 = want.skill4 = 1;
      if (id === 'useSkill') {
        const i = G.player.hotbar.indexOf('roar');
        if (i >= 0 && i < 4) want['skill' + (i + 1)] = 1;
      }
      for (const a in this.btns) this.btns[a].classList.toggle('glow', !!want[a]);
      this.base.classList.toggle('glow', !!want.joy);
    },

    // 教學「放小吼」這一步：技能視窗還開著的話，讓視窗右上的 ✕ 發光（手機沒有 Esc）
    tutorialWin() {
      const tu = G.tutorial;
      const s = tu && tu.current && tu.current();
      const want = !!(s && s.id === 'useSkill');
      if (!G.ui.isOpen || !G.ui.isOpen('skills')) return;
      const x = document.querySelector('#ui .win-skills .title .x');
      if (x && x.classList.contains('tut-glow') !== want) x.classList.toggle('tut-glow', want);
    },

    // ── iPhone Safari：不支援網頁全螢幕 → 提示「分享 → 加入主畫面」（自動提示只有一次）──
    iosHint(force) {
      if (!FS.isIOS() || FS.standalone() || FS.supported()) return;
      const KEY = 'xiaozong_ioshint_v1';
      if (!force) {
        try {
          if (localStorage.getItem(KEY)) return;
          localStorage.setItem(KEY, '1');
        } catch (e) {}
      }
      let el = document.getElementById('tc-ioshint');
      if (el) el.remove();
      el = document.createElement('div');
      el.id = 'tc-ioshint';
      el.innerHTML = '<span>想全螢幕玩？點 Safari 的「分享」→「加入主畫面」，再從主畫面開啟</span><button type="button">知道了</button>';
      el.querySelector('button').addEventListener('click', () => el.remove());
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 9000);
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

  // 第一次真的用手指點（任何時候，包括標題畫面）：打開觸控模式
  const onTouch = () => {
    if (!FORCE_OFF && !T.on) T.enable();
  };
  window.addEventListener('touchstart', onTouch, { capture: true, passive: true });
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch') onTouch();
    },
    true
  );
  // 觸控模式下第一次點擊：試著全螢幕＋鎖橫向（要在使用者手勢裡要求：pointerup／touchend 都算）
  const autoFs = (e) => {
    if (!T.on || T.autoFsTried) return;
    if (e.type === 'pointerup' && e.pointerType !== 'touch') return;
    T.autoFsTried = true;
    if (FS.standalone() || FS.active()) return;
    if (FS.supported()) FS.enter();
    else T.iosHint(false);
  };
  window.addEventListener('pointerup', autoFs, true);
  window.addEventListener('touchend', autoFs, true);

  if (!FORCE_OFF && (FORCE_ON || TOUCH_DEV)) T.enable();

  const relayout = () => {
    T.checkPortrait();
    T.layout();
  };
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 250));
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) =>
    document.addEventListener(ev, () => {
      T.syncFs();
      setTimeout(relayout, 100);
      if (G.ui && G.ui.isOpen && G.ui.isOpen('menu')) G.ui.render('menu');
    })
  );

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
