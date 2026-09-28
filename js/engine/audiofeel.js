// 打擊感音效（在 audio.js 之後載入）：分層合成的命中聲、材質、強度分級、連擊音高、擊殺聲、腳步、環境音。
// 設計說明見 DESIGN.md §31。全部即時合成，沒有音檔。
//
// 命中聲 = 瞬態（喀）＋ 身體（咚，低頻下滑）＋ 材質尾音（肉／殼／岩／金屬／冰／靈體／植物／黏液）
//   · 每一下音高、音色隨機 ±6%，並在三個變體之間輪替（不會一直聽到同一聲）
//   · 強度：0 普攻、1 技能、2 暴擊（黑閃）、3 重擊、4 最後一擊／收尾
//   · 0.6 秒內連續命中，音高一路往上爬（最多約 +15%）
//   · 同一瞬間（30ms 內）打到很多隻：最多發 3 聲（材質不同或更強才發，後面的比較小聲），其餘合併
//   · 聲部上限 VOICE_CAP：快滿時先砍裝飾層，再滿就只留暴擊
(function () {
  'use strict';
  const A = G.audio;

  A.VOICE_CAP = 24;

  const rnd = (a) => 1 + (Math.random() * 2 - 1) * a;
  // 三個輪替變體：[瞬態頻率, 身體頻率, 尾音濾波] 的倍率
  const VAR = [[1, 1, 1], [0.92, 1.06, 0.88], [1.07, 0.95, 1.12]];
  const rr = {};

  // 每次命中的聲像：依照目標在畫面上的左右位置（輕微）
  function panner(pan) {
    const c = A.ctx;
    if (!pan || !c.createStereoPanner) return A.sfxIn;
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-0.7, Math.min(0.7, pan));
    p.connect(A.sfxIn);
    return p;
  }

  // ── 材質尾音 ── d：輸出節點，p：音高倍率，v：音量倍率，t：延遲，h：重擊（0/1），w：變體，lite：省聲部
  const MAT = {
    flesh(d, p, v, t, h, w, lite) {
      A.noise(0.075 + 0.05 * h, 0.4 * v, 720 * p * w[2], 'lowpass', t, d);
      if (!lite) A.noise(0.03, 0.2 * v, 1500 * p, 'bandpass', t, d, 1.2);
    },
    shell(d, p, v, t, h, w, lite) {
      A.noise(0.05 + 0.03 * h, 0.4 * v, 2600 * p * w[2], 'bandpass', t, d, 3);
      if (!lite) A.tone(1300 * p * w[0], 0.035, 'square', 0.07 * v, 850 * p, t + 0.003, d);
    },
    rock(d, p, v, t, h, w, lite) {
      A.noise(0.15 + 0.08 * h, 0.46 * v, 620 * p * w[2], 'lowpass', t, d);
      if (!lite) A.noise(0.07, 0.17 * v, 1450 * p, 'bandpass', t + 0.018, d, 1.6);
      if (!lite) A.tone(96 * p, 0.14, 'triangle', 0.22 * v, 42, t, d);
    },
    metal(d, p, v, t, h, w, lite) {
      const f = 560 * p * w[1];
      A.tone(f, 0.34, 'sine', 0.085 * v, f * 0.985, t, d);
      A.tone(f * 2.76, 0.2, 'sine', 0.055 * v, null, t, d);
      if (!lite) A.tone(f * 5.4, 0.11, 'sine', 0.035 * v, null, t, d);
      A.noise(0.04, 0.16 * v, 3600 * w[2], 'highpass', t, d);
    },
    ice(d, p, v, t, h, w, lite) {
      const f = 2500 * p * w[1];
      A.tone(f, 0.18, 'sine', 0.06 * v, null, t, d);
      A.tone(f * 1.5, 0.12, 'sine', 0.045 * v, null, t + 0.006, d);
      if (!lite) A.tone(f * 2.1, 0.09, 'sine', 0.03 * v, null, t + 0.012, d);
      A.noise(0.05, 0.16 * v, 5200 * w[2], 'highpass', t, d);
      if (!lite) A.noise(0.04, 0.12 * v, 3000 * p, 'bandpass', t, d, 2);
    },
    ghost(d, p, v, t, h, w, lite) {
      A.noise(0.14 + 0.06 * h, 0.24 * v, 1800 * p * w[2], 'bandpass', t, d, 2, 0.012);
      A.tone(520 * p, 0.16, 'sine', 0.12 * v, 260 * p, t, d);
      if (!lite) A.tone(780 * p * w[1], 0.11, 'triangle', 0.045 * v, 1560 * p, t + 0.01, d);
    },
    plant(d, p, v, t, h, w, lite) {
      A.tone(320 * p * w[1], 0.07, 'triangle', 0.22 * v, 250 * p, t, d);
      A.noise(0.05 + 0.03 * h, 0.22 * v, 900 * p * w[2], 'bandpass', t, d, 2);
      if (!lite) A.tone(610 * p, 0.05, 'sine', 0.08 * v, null, t + 0.004, d);
    },
    slime(d, p, v, t, h, w, lite) {
      A.tone(240 * p * w[1], 0.09, 'sine', 0.2 * v, 520 * p, t, d);
      A.noise(0.07 + 0.03 * h, 0.24 * v, 900 * p * w[2], 'lowpass', t, d);
      if (!lite) A.noise(0.06, 0.12 * v, 620 * p, 'bandpass', t + 0.01, d, 4);
    },
  };
  // 身體的低頻：[起始頻率, 音量]
  const BODY = { flesh: [150, 0.42], shell: [175, 0.34], rock: [120, 0.5], metal: [160, 0.32], ice: [190, 0.28], ghost: [140, 0.24], plant: [165, 0.36], slime: [130, 0.36] };
  // 每一聲大約用掉幾個聲部（估算用）
  const COST = [5, 6, 9, 7, 8];

  // 連擊、同一瞬間合併、統計
  const H = { combo: 0, lastT: -9, winT: -9, winN: 0, winMats: '', winTop: -1, played: 0, merged: 0, lite: 0 };
  A.hitStats = H;
  A.MAT_NAMES = Object.keys(MAT);

  // mat：材質；tier：0 普攻 1 技能 2 暴擊 3 重擊 4 最後一擊；wpn：攻擊的音色（spirit/feather/double/rock…）；pan：-1～1
  A.hit = function (mat, tier, wpn, pan) {
    if (!this.enabled || !this.ctx) return;
    if (!MAT[mat]) mat = 'flesh';
    tier = tier || 0;
    const now = performance.now();
    // 同一瞬間（30ms）打到好幾隻：第二、三聲只有材質不同或更強才發，而且小聲一點
    let v = 1;
    if (now - H.winT < 30) {
      H.winN++;
      if (H.winN >= 3 || (H.winMats.indexOf(mat) >= 0 && tier <= H.winTop)) {
        H.merged++;
        this.log(mat, tier, 'merged');
        return;
      }
      v = H.winN === 1 ? 0.6 : 0.45;
      H.winMats += mat;
      if (tier > H.winTop) H.winTop = tier;
    } else {
      H.winT = now;
      H.winN = 0;
      H.winMats = mat;
      H.winTop = tier;
    }
    // 連擊音高：0.6 秒內再打中就往上爬
    const tt = now / 1000;
    H.combo = tt - H.lastT < 0.6 ? Math.min(H.combo + 1, 10) : 0;
    H.lastT = tt;
    // 聲部快滿：先砍裝飾層（lite），全滿就只留暴擊／重擊
    let lite = false;
    const free = this.VOICE_CAP - this.voices;
    if (free < COST[tier]) {
      if (free < 3 && tier < 2) {
        H.merged++;
        this.log(mat, tier, 'capped');
        return;
      }
      lite = true;
      H.lite++;
    }
    try {
      this.hitVoice(mat, tier, wpn, pan, v, lite);
    } catch (e) { /* 音效失敗不影響遊戲 */ }
    H.played++;
    this.log(mat, tier, lite ? 'lite' : 'full');
  };

  A.log = function (mat, tier, how) {
    const L = window.__sfxLog;
    if (L && L.length < 4000) L.push(mat + '/' + tier + '/' + how + '/' + this.voices);
  };

  A.hitVoice = function (mat, tier, wpn, pan, v, lite) {
    const d = panner(pan);
    const k = rr[mat] = ((rr[mat] || 0) + 1) % 3;
    const w = VAR[k];
    const p = rnd(0.06) * (1 + H.combo * 0.015);
    const crit = tier === 2;
    const heavy = tier >= 3;
    const tv = v * (tier === 1 ? 1.16 : crit ? 1.12 : heavy ? 1.15 : 1);
    const B = BODY[mat];
    // 瞬態：很短的高頻「喀」
    this.noise(0.014, (crit ? 0.42 : 0.3) * tv, 3200 * w[0] * p, 'highpass', 0, d);
    // 身體：低頻往下滑（連擊音高只帶一半，才不會變尖）
    const bp = 1 + (p - 1) * 0.5;
    this.tone(B[0] * w[1] * bp * (heavy ? 0.8 : 1), 0.09 + (heavy ? 0.05 : 0), 'sine', B[1] * tv, 58 * bp, 0, d);
    // 材質
    MAT[mat](d, p, tv, 0.002, heavy || crit ? 1 : 0, w, lite);
    if (lite) return;
    // 技能：多一層中頻的「拳」
    if (tier === 1) this.noise(0.06, 0.3 * tv, 1100 * p, 'bandpass', 0.004, d, 0.8);
    // 重擊／最後一擊：更厚的次低頻
    if (heavy) this.tone(72 * bp, 0.2 + (tier === 4 ? 0.08 : 0), 'sine', (tier === 4 ? 0.55 : 0.48) * v, 34, 0.005, d);
    // 暴擊：銳利的「鏘」＋ 一道高頻
    if (crit) {
      this.tone(2300 * p, 0.13, 'triangle', 0.07 * v, 3100 * p, 0.008, d);
      this.noise(0.1, 0.13 * v, 5200, 'bandpass', 0.006, d, 1);
      this.tone(96 * bp, 0.16, 'sine', 0.4 * v, 40, 0.004, d);
    }
    // 攻擊本身的音色
    if (wpn === 'spirit') this.tone(1760 * p, 0.1, 'sine', 0.045 * v, 2400 * p, 0.01, d);
    else if (wpn === 'feather') this.noise(0.04, 0.12 * v, 5200, 'highpass', 0.004, d);
    else if (wpn === 'double') this.noise(0.012, 0.22 * v, 3000 * p, 'highpass', 0.04, d);
    else if (wpn === 'rock' || wpn === 'slam') this.tone(80 * bp, 0.14, 'triangle', 0.22 * v, 40, 0.004, d);
  };

  // ── 擊殺：爆開的「啵」＋ 材質碎裂 ＋ 一小聲鈴；菁英、魔王更大 ──
  // rank：0 一般 1 菁英／閃光 2 野外魔王／Boss；streak：連殺數（鈴聲沿五聲音階往上爬）
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  A.kill = function (mat, rank, pan, streak) {
    if (!this.enabled || !this.ctx) return;
    if (!MAT[mat]) mat = 'flesh';
    if (this.voices > this.VOICE_CAP + 8 && !rank) return;
    try {
      const d = panner(pan);
      const p = rnd(0.05);
      this.tone(300 * p, 0.07, 'sine', 0.24, 900 * p, 0.03, d);
      this.noise(0.05, 0.26, 1800 * p, 'bandpass', 0.03, d, 1.4);
      MAT[mat](d, p * 0.9, 0.75, 0.035, 1, VAR[0], this.voices > this.VOICE_CAP);
      const st = PENTA[Math.min(PENTA.length - 1, Math.floor((streak || 0) / 3))];
      const c1 = 1568 * Math.pow(2, st / 12);
      this.tone(c1, 0.16, 'triangle', 0.045, null, 0.07, d);
      this.tone(c1 * 1.335, 0.24, 'triangle', 0.04, null, 0.12, d);
      if (rank >= 1) {
        this.tone(78, 0.4, 'sine', 0.42, 38, 0.03, d);
        this.tone(c1 * 1.782, 0.3, 'triangle', 0.035, null, 0.18, d);
      }
      if (rank >= 2) {
        this.noise(0.6, 0.32, 420, 'lowpass', 0.04, d);
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.9, 'triangle', 0.045, null, 0.2 + i * 0.07, d));
      }
      if (window.__sfxLog) this.log(mat, 'kill' + rank, 'kill');
    } catch (e) { /* 音效失敗不影響遊戲 */ }
  };

  // 經驗值光點被吸收：很輕的「叮」，每顆高一點
  let tickT = 0;
  A.orbTick = function (i) {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - tickT < 45 || this.voices > this.VOICE_CAP) return;
    tickT = now;
    const f = 1760 * Math.pow(2, Math.min(i, 12) / 24) * rnd(0.01);
    this.tone(f, 0.05, 'sine', 0.035, null, 0, this.sfxIn);
    this.tone(f * 2, 0.035, 'triangle', 0.012, null, 0.004, this.sfxIn);
  };

  // ── 腳步：依地面材質，很輕、音高隨機 ──
  A.step = function (kind, v) {
    if (!this.enabled || !this.ctx || this.voices > this.VOICE_CAP - 4) return;
    v = (v || 1) * rnd(0.15);
    const p = rnd(0.08);
    const d = this.sfxIn;
    try {
      switch (kind) {
        case 'sand':
          this.noise(0.07, 0.045 * v, 3000 * p, 'bandpass', 0, d, 0.9, 0.01);
          this.tone(95 * p, 0.04, 'sine', 0.05 * v, 60, 0, d);
          break;
        case 'stone':
          this.noise(0.018, 0.06 * v, 2400 * p, 'highpass', 0, d);
          this.tone(170 * p, 0.035, 'sine', 0.07 * v, 110, 0, d);
          break;
        case 'snow':
          this.noise(0.05, 0.1 * v, 1500 * p, 'bandpass', 0, d, 1.5);
          this.noise(0.04, 0.07 * v, 2400 * p, 'bandpass', 0.025, d, 2);
          break;
        case 'wood':
          this.tone(210 * p, 0.045, 'triangle', 0.06 * v, 170, 0, d);
          this.noise(0.03, 0.04 * v, 800 * p, 'bandpass', 0, d, 1.5);
          break;
        case 'marble':
          this.noise(0.015, 0.05 * v, 3200 * p, 'highpass', 0, d);
          this.tone(230 * p, 0.03, 'sine', 0.06 * v, 150, 0, d);
          this.tone(1250 * p, 0.05, 'sine', 0.008 * v, null, 0.004, d);
          break;
        default: // 草地、泥土
          this.noise(0.055, 0.05 * v, 1100 * p, 'lowpass', 0, d);
          this.tone(90 * p, 0.04, 'sine', 0.05 * v, 55, 0, d);
      }
    } catch (e) { /* 音效失敗不影響遊戲 */ }
  };

  // 爬繩子：麻繩的吱嘎聲＋摩擦
  A.creak = function () {
    if (!this.enabled || !this.ctx || this.voices > this.VOICE_CAP - 3) return;
    const p = rnd(0.1);
    try {
      this.noise(0.07, 0.05, 1900 * p, 'bandpass', 0, this.sfxIn, 2, 0.02);
      if (Math.random() < 0.5) this.tone(190 * p, 0.12, 'sawtooth', 0.02, 150 * p, 0.01, this.sfxIn);
    } catch (e) { /* 音效失敗不影響遊戲 */ }
  };

  // ── 取代舊的幾個音效 ──
  const S = A.sfx;
  // 落地：低頻「咚」＋ 地面材質的腳步
  S.land = function () {
    this.noise(0.08, 0.14, 560, 'lowpass');
    this.tone(110, 0.11, 'sine', 0.2, 45);
    if (G.feel) this.step(G.feel.groundKind(), 1.6);
  };
  // 被打：悶哼（兩個相差半音的鋸齒往下掉，低通過）＋ 身體重擊。跟打怪的聲音明顯不同
  S.hurt = function () {
    this.tone(140, 0.14, 'sine', 0.42, 55);
    this.noise(0.03, 0.22, 2600, 'highpass');
    const c = this.ctx;
    const t0 = c.currentTime;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1400, t0);
    f.frequency.exponentialRampToValueAtTime(500, t0 + 0.2);
    f.connect(this.sfxIn);
    this.tone(330, 0.2, 'sawtooth', 0.11, 190, 0.005, f);
    this.tone(349, 0.18, 'sawtooth', 0.08, 200, 0.012, f);
  };
  // 原本就被呼叫、但一直沒有定義的火焰音效
  S.fire = function () {
    this.noise(0.28, 0.22, 900, 'bandpass', 0, null, 0.7, 0.03);
    this.noise(0.18, 0.12, 3200, 'highpass', 0.02);
    this.tone(120, 0.2, 'sine', 0.18, 70);
  };

  // ─────────────────────────── 環境音 ───────────────────────────
  // 每張地圖一組「底層」（連續的風、浪、熔岩低鳴、嗡嗡的持續音、蟲鳴）＋「事件」（鳥叫、海鷗、水滴、蒸氣、遠方鐘聲…）
  // 換地圖時舊的淡出 1.5 秒、新的淡入 2.5 秒；演出、選單時壓低；標題畫面靜音。
  const AMB = (A.amb = {
    bus: null,
    cur: null,
    id: null,
    level: 1,
    duck: 1, // 外部（音樂）要求的壓低倍率，見 G.ambience.setDuck
    evT: null,
    bufs: null,

    init() {
      const c = A.ctx;
      if (!c || this.bus) return !!this.bus;
      this.bus = c.createGain();
      this.bus.gain.value = 0;
      this.bus.connect(A.master);
      // 4 秒的粉紅雜訊、棕色雜訊（1 秒的白雜訊循環起來聽得出週期）
      const len = Math.floor(c.sampleRate * (G.lowFx ? 2 : 4));
      const pink = c.createBuffer(1, len, c.sampleRate);
      const brown = c.createBuffer(1, len, c.sampleRate);
      const pd = pink.getChannelData(0);
      const bd = brown.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, br = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099;
        b1 = 0.963 * b1 + w * 0.2965;
        b2 = 0.57 * b2 + w * 1.0527;
        pd[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
        br = (br + 0.02 * w) / 1.02;
        bd[i] = br * 3.2;
      }
      // 頭尾交叉淡化，循環點不會喀一聲
      const x = Math.floor(c.sampleRate * 0.05);
      for (let i = 0; i < x; i++) {
        const k = i / x;
        pd[len - x + i] = pd[len - x + i] * (1 - k) + pd[i] * k;
        bd[len - x + i] = bd[len - x + i] * (1 - k) + bd[i] * k;
      }
      this.bufs = { pink, brown };
      return true;
    },

    // 換一組環境音（null ＝ 安靜）
    set(id) {
      if (id === this.id) return;
      if (!A.ctx || !this.init()) return;
      this.id = id;
      const c = A.ctx;
      const now = c.currentTime;
      if (this.cur) {
        const o = this.cur;
        o.g.gain.cancelScheduledValues(now);
        o.g.gain.setValueAtTime(Math.max(0.0001, o.g.gain.value), now);
        o.g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        o.srcs.forEach((s) => s.stop(now + 1.6));
        setTimeout(() => o.g.disconnect(), 2000);
        this.cur = null;
      }
      const sc = SCAPES[id];
      if (!sc) {
        this.evT = null;
        return;
      }
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(1, now + 2.5);
      g.connect(this.bus);
      const o = { g, srcs: [], sc };
      const beds = G.lowFx ? sc.beds.slice(0, 1) : sc.beds;
      for (const b of beds) BEDS[b[0]](c, o, b[1]);
      this.cur = o;
      this.evT = sc.ev.map((e) => e[1] * Math.random());
    },

    // 每幀：目標音量（演出 0.45、選單 0.6、不在遊戲中 0）與隨機事件
    update(dt, want) {
      if (!this.bus) return;
      const c = A.ctx;
      const on = A.enabled && c.state === 'running';
      const target = on ? want * 0.9 * this.duck : 0;
      if (Math.abs(target - this.level) > 0.01) {
        this.level += (target - this.level) * Math.min(1, dt * 2.5);
        this.bus.gain.setTargetAtTime(this.level, c.currentTime, 0.05);
      }
      const o = this.cur;
      if (!o || !this.evT || this.level < 0.05) return;
      const ev = o.sc.ev;
      for (let i = 0; i < ev.length; i++) {
        this.evT[i] -= dt;
        if (this.evT[i] > 0) continue;
        const e = ev[i];
        this.evT[i] = (e[1] + Math.random() * (e[2] - e[1])) * (G.lowFx ? 1.6 : 1);
        if (A.voices > A.VOICE_CAP - 6) continue;
        try {
          EVENTS[e[0]](c, o.g, e[3] || 1);
        } catch (err) { /* 音效失敗不影響遊戲 */ }
      }
    },
  });

  function lfo(c, o, rate, depth, param, type) {
    const l = c.createOscillator();
    l.type = type || 'sine';
    l.frequency.value = rate;
    const g = c.createGain();
    g.gain.value = depth;
    l.connect(g);
    g.connect(param);
    l.start();
    o.srcs.push(l);
  }
  function loop(c, o, buf) {
    const s = c.createBufferSource();
    s.buffer = AMB.bufs[buf];
    s.loop = true;
    s.start(c.currentTime, Math.random() * 2);
    o.srcs.push(s);
    return s;
  }
  function filt(c, type, f, q) {
    const n = c.createBiquadFilter();
    n.type = type;
    n.frequency.value = f;
    if (q) n.Q.value = q;
    return n;
  }
  function gain(c, v, to) {
    const g = c.createGain();
    g.gain.value = v;
    g.connect(to);
    return g;
  }

  const BEDS = {
    // 風：粉紅雜訊過帶通，中心頻率和音量慢慢飄
    wind(c, o, v) {
      const f = filt(c, 'bandpass', 420, 0.7);
      const g = gain(c, 0.05 * v, o.g);
      loop(c, o, 'pink').connect(f);
      f.connect(g);
      lfo(c, o, 0.05 + Math.random() * 0.03, 260, f.frequency);
      lfo(c, o, 0.11 + Math.random() * 0.04, 0.022 * v, g.gain);
    },
    // 海浪：棕色雜訊一漲一退，加一點高頻的浪花
    waves(c, o, v) {
      const f = filt(c, 'lowpass', 520);
      const g = gain(c, 0.05 * v, o.g);
      loop(c, o, 'brown').connect(f);
      f.connect(g);
      const f2 = filt(c, 'highpass', 2600);
      const g2 = gain(c, 0.007 * v, o.g);
      loop(c, o, 'pink').connect(f2);
      f2.connect(g2);
      const r = 0.09 + Math.random() * 0.03;
      lfo(c, o, r, 0.04 * v, g.gain);
      lfo(c, o, r, 0.006 * v, g2.gain);
    },
    // 熔岩的低鳴
    rumble(c, o, v) {
      const f = filt(c, 'lowpass', 140);
      const g = gain(c, 0.1 * v, o.g);
      loop(c, o, 'brown').connect(f);
      f.connect(g);
      lfo(c, o, 0.23, 0.045 * v, g.gain);
    },
    // 神殿、洞窟的低音持續音（五度＋八度，微微晃動）
    drone(c, o, v) {
      const f = filt(c, 'lowpass', 420);
      const g = gain(c, 0.018 * v, o.g);
      f.connect(g);
      [55, 82.6, 110.4].forEach((hz, i) => {
        const s = c.createOscillator();
        s.type = i === 2 ? 'triangle' : 'sine';
        s.frequency.value = hz;
        s.detune.value = (Math.random() - 0.5) * 8;
        s.connect(f);
        s.start();
        o.srcs.push(s);
      });
      lfo(c, o, 0.06, 0.008 * v, g.gain);
    },
    // 蟲鳴：高頻正弦被 26Hz 方波斬成一段一段，再慢慢起伏
    insects(c, o, v) {
      const s = c.createOscillator();
      s.frequency.value = 4300 + Math.random() * 300;
      const g1 = c.createGain();
      g1.gain.value = 0;
      const g2 = gain(c, 0.5, o.g);
      s.connect(g1);
      g1.connect(g2);
      s.start();
      o.srcs.push(s);
      lfo(c, o, 26, 0.0035 * v, g1.gain, 'square');
      lfo(c, o, 0.17, 0.5, g2.gain);
    },
    // 水底：很悶的低頻
    under(c, o, v) {
      const f = filt(c, 'lowpass', 280);
      const g = gain(c, 0.06 * v, o.g);
      loop(c, o, 'brown').connect(f);
      f.connect(g);
      lfo(c, o, 0.08, 0.025 * v, g.gain);
    },
  };

  // 事件：一次性的小聲音，聲像隨機
  function epan(c, d) {
    if (!c.createStereoPanner) return d;
    const p = c.createStereoPanner();
    p.pan.value = Math.random() * 1.6 - 0.8;
    p.connect(d);
    return p;
  }
  const EVENTS = {
    bird(c, d, v) {
      const p = epan(c, d);
      const n = 2 + ((Math.random() * 3) | 0);
      const f = 2400 + Math.random() * 1200;
      for (let i = 0; i < n; i++) A.tone(f * rnd(0.05), 0.07, 'sine', 0.022 * v, f * 1.35, i * 0.1 + Math.random() * 0.02, p);
    },
    gull(c, d, v) {
      const p = epan(c, d);
      const f = 1100 + Math.random() * 250;
      A.tone(f, 0.18, 'triangle', 0.018 * v, f * 0.78, 0, p);
      A.tone(f * 1.05, 0.22, 'triangle', 0.016 * v, f * 0.72, 0.22, p);
    },
    drip(c, d, v) {
      const p = epan(c, d);
      const f = 1100 + Math.random() * 700;
      A.tone(f, 0.06, 'sine', 0.03 * v, f * 0.5, 0, p);
      A.tone(f * 1.6, 0.03, 'sine', 0.01 * v, null, 0.05, p);
    },
    steam(c, d, v) {
      A.noise(0.7, 0.02 * v, 3200, 'highpass', 0, epan(c, d), 0, 0.15);
    },
    blub(c, d, v) {
      const p = epan(c, d);
      A.tone(75, 0.18, 'sine', 0.06 * v, 150, 0, p);
      A.noise(0.15, 0.04 * v, 300, 'lowpass', 0, p);
    },
    bell(c, d, v) {
      const p = epan(c, d);
      const f = [392, 440, 523][(Math.random() * 3) | 0];
      [1, 2.01, 2.76, 5.4].forEach((r, i) => A.tone(f * r, 2.6 - i * 0.5, 'sine', (0.014 - i * 0.003) * v, null, 0, p));
    },
    chime(c, d, v) {
      const p = epan(c, d);
      const s = [1568, 1760, 2093, 2349, 2637];
      const n = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) A.tone(s[(Math.random() * s.length) | 0], 1.4, 'triangle', 0.011 * v, null, i * 0.16, p);
    },
    creak(c, d, v) {
      A.tone(210, 0.5, 'sawtooth', 0.009 * v, 165, 0, epan(c, d));
    },
    bubble(c, d, v) {
      const p = epan(c, d);
      const n = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) A.tone(300 + Math.random() * 200, 0.05, 'sine', 0.02 * v, 900, i * 0.07, p);
    },
    ice(c, d, v) {
      const p = epan(c, d);
      A.noise(0.05, 0.03 * v, 4200, 'bandpass', 0, p, 2);
      A.tone(3000, 0.12, 'sine', 0.012 * v, 1300, 0.01, p);
    },
    // 時鐘的滴答（一次兩聲）
    clock(c, d, v) {
      A.noise(0.012, 0.03 * v, 2600, 'bandpass', 0, d, 4);
      A.noise(0.012, 0.026 * v, 2000, 'bandpass', 0.5, d, 4);
    },
  };

  // 場景：beds [名稱, 音量]；ev [名稱, 最短間隔, 最長間隔, 音量]
  const SCAPES = {
    forest: { beds: [['wind', 0.6]], ev: [['bird', 2, 5]] },
    grove: { beds: [['wind', 0.5], ['insects', 0.5]], ev: [['bird', 4, 8]] },
    deep: { beds: [['wind', 0.45], ['insects', 1]], ev: [['bird', 6, 12, 0.8]] },
    cave: { beds: [['drone', 0.5]], ev: [['drip', 1.5, 4]] },
    hall: { beds: [['drone', 0.7]], ev: [['drip', 4, 8, 0.7]] },
    coast: { beds: [['waves', 1], ['wind', 0.35]], ev: [['gull', 5, 11]] },
    wreck: { beds: [['waves', 0.9]], ev: [['creak', 4, 9], ['gull', 10, 20]] },
    reef: { beds: [['under', 1]], ev: [['bubble', 0.8, 2.2]] },
    nest: { beds: [['waves', 0.6]], ev: [['bubble', 2, 5], ['drip', 3, 6]] },
    spa: { beds: [['wind', 0.3]], ev: [['steam', 4, 8], ['blub', 2, 5]] },
    lava: { beds: [['rumble', 1]], ev: [['blub', 2, 5], ['steam', 5, 10]] },
    steam: { beds: [['wind', 0.45], ['rumble', 0.5]], ev: [['steam', 2, 5]] },
    snow: { beds: [['wind', 0.8]], ev: [['bell', 9, 16]] },
    snowfield: { beds: [['wind', 1.05]], ev: [['bell', 12, 25, 0.8]] },
    icefall: { beds: [['wind', 0.85]], ev: [['ice', 5, 10]] },
    shrine: { beds: [['wind', 0.5]], ev: [['bell', 4, 8]] },
    altar: { beds: [['wind', 0.7], ['drone', 0.5]], ev: [['ice', 8, 14]] },
    temple: { beds: [['drone', 0.6], ['wind', 0.3]], ev: [['chime', 3, 7]] },
    stair: { beds: [['wind', 0.4]], ev: [['chime', 4, 8]] },
    garden: { beds: [['insects', 0.6], ['wind', 0.3]], ev: [['chime', 5, 10], ['bird', 7, 14, 0.7]] },
    time: { beds: [['drone', 0.5]], ev: [['clock', 1, 1]] },
    throne: { beds: [['drone', 0.8]], ev: [['clock', 2, 2, 0.8]] },
  };
  AMB.SCAPES = SCAPES;
  AMB.THEME = {
    forestMorning: 'forest', forestMushroom: 'grove', forestDeep: 'deep', rootCave: 'cave', queenHall: 'hall',
    coastCamp: 'coast', tidepool: 'coast', shipwreck: 'wreck', reef: 'reef', crabNest: 'nest',
    hotspringCamp: 'spa', lavaBed: 'lava', redRift: 'lava', volcanoNest: 'lava', steamPass: 'steam',
    snowCamp: 'snow', snowField: 'snowfield', iceFall: 'icefall', bellShrine: 'shrine', frostAltar: 'altar',
    templeCourt: 'temple', starStair: 'stair', reverseGarden: 'garden', timeCorridor: 'time', timeThrone: 'throne',
  };
  AMB.REGION = { 1: 'forest', 2: 'coast', 3: 'lava', 4: 'snow', 5: 'temple' };
  // 給其他模組（例如背景音樂）用的小介面：
  //   G.ambience.setDuck(k)  k = 0～1，環境音乘上這個倍率（平滑過渡，約 0.4 秒）；1 = 不壓低
  //   G.ambience.current()   目前的環境音組合 id（null = 安靜）
  G.ambience = {
    setDuck(k) {
      AMB.duck = Math.max(0, Math.min(1, +k || 0));
    },
    current() {
      return AMB.id;
    },
  };
})();
