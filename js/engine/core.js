// 全域命名空間與共用工具。所有檔案都掛在 window.G 底下，
// 不使用 ES modules，這樣直接雙擊 index.html 也能執行。
(function () {
  'use strict';

  const G = (window.G = {
    W: 1280,
    H: 720,
    data: {},
    art: {},
    ui: {},
    debug: /[?&]debug=1/.test(location.search),
    scene: 'title',
    time: 0,
    paused: false,
    cam: { x: 0, y: 0 },
    opts: { godMode: false, showHitboxes: false },
  });

  const U = (G.util = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    chance: (p) => Math.random() < p,
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    sign: (v) => (v < 0 ? -1 : 1),
    overlap: (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
    dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),

    // 背景用的固定亂數，確保同一張地圖每次長得一樣
    seeded(seed) {
      let s = seed >>> 0 || 1;
      return () => {
        s ^= s << 13; s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
      };
    },

    weighted(table) {
      let total = 0;
      for (const k in table) total += table[k];
      let r = Math.random() * total;
      for (const k in table) {
        r -= table[k];
        if (r < 0) return k;
      }
      return Object.keys(table)[0];
    },

    fmtTime(sec) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return h + ':' + String(m).padStart(2, '0');
    },

    esc(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    // 顏色混合（閃光怪、受擊閃白用）
    _rgbCache: {},
    hexToRgb(hex) {
      if (this._rgbCache[hex]) return this._rgbCache[hex];
      if (hex[0] === 'r') {
        const m = hex.match(/[\d.]+/g).map(Number);
        this._rgbCache[hex] = [m[0], m[1], m[2]];
        return this._rgbCache[hex];
      }
      let h = hex.replace('#', '');
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      const n = parseInt(h, 16);
      const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      this._rgbCache[hex] = rgb;
      return rgb;
    },
    mix(hexA, hexB, t) {
      if (typeof hexA !== 'string' || (hexA[0] !== '#' && hexA.slice(0, 4) !== 'rgb(')) return hexA;
      const a = this.hexToRgb(hexA);
      const b = this.hexToRgb(hexB);
      const r = Math.round(a[0] + (b[0] - a[0]) * t);
      const g = Math.round(a[1] + (b[1] - a[1]) * t);
      const bl = Math.round(a[2] + (b[2] - a[2]) * t);
      return 'rgb(' + r + ',' + g + ',' + bl + ')';
    },
  });

  // 安全的 localStorage 存取（無痕模式或被封鎖時不會讓遊戲當掉）
  G.store = {
    get(key) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) { /* 忽略 */ }
    },
  };

  U.noop = () => {};
})();
