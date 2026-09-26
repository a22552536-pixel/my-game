// 鍵盤輸入與改鍵。遊戲邏輯只看「動作」（jump、attack…），不直接看按鍵。
(function () {
  'use strict';

  const KEY_STORE = 'xiaozong_keys_v1';

  G.input = {
    bind: {},
    codeToAction: {},
    down: {},
    pressed: {},
    escPressed: false,
    anyPressed: false,
    capture: null, // 改鍵時攔截下一個按鍵

    init() {
      const saved = G.store.get(KEY_STORE);
      // 舊的存檔可能還綁著已經拿掉的動作（例如圖鑑的 B），只保留現在還存在的動作
      const known = {};
      if (saved) for (const a in saved) if (a in G.data.keys.defaults) known[a] = saved[a];
      this.bind = Object.assign({}, G.data.keys.defaults, known);
      this.rebuild();
      window.addEventListener('keydown', (e) => this.onDown(e));
      window.addEventListener('keyup', (e) => this.onUp(e));
      window.addEventListener('blur', () => {
        this.down = {};
      });
      window.addEventListener('mousedown', () => G.audio.unlock());
    },

    rebuild() {
      this.codeToAction = {};
      for (const a in this.bind) this.codeToAction[this.bind[a]] = a;
    },

    onDown(e) {
      G.audio.unlock();
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (this.capture) {
        e.preventDefault();
        const cb = this.capture;
        this.capture = null;
        cb(e.code);
        return;
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        this.escPressed = true;
        return;
      }
      const a = this.codeToAction[e.code];
      if (a) {
        e.preventDefault();
        if (!this.down[a]) this.pressed[a] = true;
        this.down[a] = true;
      }
      if (!e.repeat) this.anyPressed = true;
    },

    onUp(e) {
      const a = this.codeToAction[e.code];
      if (a) this.down[a] = false;
    },

    isDown(a) {
      return !!this.down[a];
    },
    wasPressed(a) {
      return !!this.pressed[a];
    },
    consume(a) {
      const p = !!this.pressed[a];
      this.pressed[a] = false;
      return p;
    },

    // 每次邏輯更新之後清掉「剛按下」的狀態
    endStep() {
      this.pressed = {};
      this.escPressed = false;
      this.anyPressed = false;
    },

    clearAll() {
      this.down = {};
      this.endStep();
    },

    // 設定按鍵。回傳 { ok, swappedWith, reason }
    setBinding(action, code) {
      const K = G.data.keys;
      if (K.forbidden.indexOf(code) >= 0) return { ok: false, reason: K.label(code) + ' 保留給瀏覽器或選單，不能使用' };
      const prevCode = this.bind[action];
      let swappedWith = null;
      for (const a in this.bind) {
        if (a !== action && this.bind[a] === code) {
          this.bind[a] = prevCode;
          swappedWith = a;
        }
      }
      this.bind[action] = code;
      this.rebuild();
      this.saveBindings();
      this.down = {};
      return { ok: true, swappedWith };
    },

    resetDefaults() {
      this.bind = Object.assign({}, G.data.keys.defaults);
      this.rebuild();
      this.saveBindings();
    },

    saveBindings() {
      G.store.set(KEY_STORE, this.bind);
    },

    label(action) {
      return G.data.keys.label(this.bind[action]);
    },
  };
})();
