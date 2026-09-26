// 所有音效都用 Web Audio 即時合成，沒有音檔。
(function () {
  'use strict';

  const A = (G.audio = {
    ctx: null,
    master: null,
    noiseBuf: null,
    enabled: true,
    volume: 0.35,

    unlock() {
      if (!this.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.volume;
          this.master.connect(this.ctx.destination);
          const len = this.ctx.sampleRate;
          this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          const d = this.noiseBuf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        } catch (e) {
          this.ctx = null;
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setEnabled(on) {
      this.enabled = on;
      G.store.set('xiaozong_audio_v1', { enabled: on });
    },

    loadPrefs() {
      const p = G.store.get('xiaozong_audio_v1');
      if (p && typeof p.enabled === 'boolean') this.enabled = p.enabled;
    },

    tone(freq, dur, type, vol, slideTo, delay) {
      const c = this.ctx;
      const t0 = c.currentTime + (delay || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    },

    noise(dur, vol, freq, ftype, delay) {
      const c = this.ctx;
      const t0 = c.currentTime + (delay || 0);
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = ftype || 'lowpass';
      f.frequency.value = freq || 2000;
      const g = c.createGain();
      g.gain.setValueAtTime(vol || 0.3, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f);
      f.connect(g);
      g.connect(this.master);
      s.start(t0, Math.random() * 0.5);
      s.stop(t0 + dur + 0.02);
    },

    play(name) {
      if (!this.enabled || !this.ctx) return;
      const f = this.sfx[name];
      if (f) {
        try {
          f.call(this);
        } catch (e) { /* 音效失敗不影響遊戲 */ }
      }
    },

    sfx: {
      swing() { this.noise(0.09, 0.18, 2600, 'bandpass'); },
      hit() {
        this.noise(0.07, 0.45, 1600);
        this.tone(170, 0.09, 'sine', 0.45, 70);
      },
      heavy() {
        this.noise(0.12, 0.55, 900);
        this.tone(110, 0.16, 'sine', 0.55, 45);
      },
      crit() {
        this.noise(0.1, 0.5, 2400);
        this.tone(240, 0.12, 'sine', 0.5, 80);
        this.tone(1400, 0.08, 'square', 0.08, 900, 0.01);
      },
      jump() { this.tone(260, 0.09, 'square', 0.07, 520); },
      land() { this.noise(0.05, 0.12, 500); },
      hurt() {
        this.tone(420, 0.16, 'sawtooth', 0.15, 160);
        this.noise(0.08, 0.2, 1200);
      },
      die() { this.tone(520, 0.14, 'square', 0.1, 180); },
      pickup() {
        this.tone(880, 0.05, 'square', 0.07);
        this.tone(1320, 0.07, 'square', 0.07, null, 0.05);
      },
      coin() {
        this.tone(1568, 0.05, 'square', 0.06);
        this.tone(2093, 0.08, 'square', 0.06, null, 0.045);
      },
      potion() {
        this.tone(500, 0.12, 'sine', 0.2, 900);
        this.tone(900, 0.1, 'sine', 0.12, 1300, 0.08);
      },
      levelup() {
        const n = [523, 659, 784, 1047, 1319];
        n.forEach((f, i) => this.tone(f, 0.22, 'square', 0.1, null, i * 0.08));
        this.tone(1568, 0.5, 'triangle', 0.15, null, 0.42);
      },
      rare() {
        this.tone(1047, 0.18, 'triangle', 0.14);
        this.tone(1568, 0.25, 'triangle', 0.12, null, 0.08);
      },
      epic() {
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.14, null, i * 0.07));
      },
      legendary() {
        [523, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.15, null, i * 0.07));
        this.noise(0.6, 0.12, 5000, 'highpass', 0.1);
      },
      quest() {
        [659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'square', 0.09, null, i * 0.09));
      },
      ui() { this.tone(700, 0.04, 'square', 0.05); },
      error() { this.tone(200, 0.12, 'square', 0.08, 150); },
      portal() {
        this.tone(300, 0.35, 'sine', 0.15, 900);
        this.noise(0.3, 0.08, 3000, 'bandpass');
      },
      skill() {
        this.noise(0.14, 0.2, 1800, 'bandpass');
        this.tone(400, 0.12, 'triangle', 0.1, 700);
      },
      roar() {
        this.tone(160, 0.35, 'sawtooth', 0.18, 90);
        this.noise(0.3, 0.2, 700);
      },
      bossWarn() {
        this.tone(110, 0.5, 'sawtooth', 0.14, 100);
        this.tone(116, 0.5, 'sawtooth', 0.1, 104);
      },
      slam() {
        this.noise(0.4, 0.7, 400);
        this.tone(70, 0.45, 'sine', 0.7, 35);
      },
      spore() { this.noise(0.25, 0.2, 700, 'bandpass'); },
      chest() {
        this.tone(392, 0.1, 'square', 0.08);
        this.tone(523, 0.1, 'square', 0.08, null, 0.08);
        this.tone(784, 0.25, 'triangle', 0.12, null, 0.16);
      },
      thunder() {
        this.noise(0.35, 0.5, 3000);
        this.tone(90, 0.3, 'sawtooth', 0.2, 40);
      },
      victory() {
        [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'square', 0.1, null, i * 0.13));
        this.tone(1047, 0.8, 'triangle', 0.15, null, 0.8);
      },
    },
  });

  A.loadPrefs();
})();
