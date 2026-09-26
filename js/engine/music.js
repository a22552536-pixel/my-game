// 背景音樂：和音效一樣用 Web Audio 即時合成，一個區域（5 張地圖）一首，另有標題曲與 Boss 曲。
// 曲子寫成資料：每小節 8 格（八分音符），旋律一格一個記號：音名＝下音、- ＝延長、. ＝休止、| 只是分隔。
// 和弦一小節一個，低音與分解和弦依和弦自動產生。
(function () {
  'use strict';

  const SONGS = {
    title: {
      name: '雲上的家', bpm: 80, lead: 'ocarina', bass: 'soft', arp: 'pad', drums: null,
      chords: 'F G Em Am F G C C',
      melody:
        'A5 - - - C6 - A5 - | G5 - - - D5 - - - | E5 - G5 - B5 - G5 - | A5 - - - E5 - - - |' +
        'F5 - A5 - C6 - D6 - | D6 - - - B5 - G5 - | C6 - - - G5 - E5 - | C5 - - - . . . .',
    },

    // 區域 1 苔光森林：陶笛般的旋律、撥弦低音、輕輕的沙鈴
    forest: {
      name: '苔光森林', bpm: 92, lead: 'ocarina', bass: 'pluck', arp: 'bells', drums: 'shaker',
      chords: 'C G Am Em F C Dm G C G Am Em F G C C',
      melody:
        'E5 - G5 - A5 G5 E5 - | D5 - - . D5 E5 G5 - | C5 - E5 - A5 - G5 E5 | G5 - - - . . E5 D5 |' +
        'C5 - A4 - C5 D5 E5 - | G5 - E5 - C5 - D5 E5 | F5 - E5 - D5 - C5 D5 | D5 - - - . . . . |' +
        'E5 - G5 - C6 - B5 A5 | G5 - D5 - G5 - A5 B5 | C6 - B5 A5 E5 - A5 - | G5 - - - E5 - G5 - |' +
        'A5 - G5 F5 E5 - C5 - | D5 - G5 - B5 - D6 - | C6 - G5 E5 D5 - E5 C5 | C5 - - - . . . .',
    },

    // 區域 2 潮風海岬：輕快的烏克麗麗感
    sea: {
      name: '潮風海岬', bpm: 104, lead: 'pulse', bass: 'walk', arp: 'strum', drums: 'island',
      chords: 'D Bm G A D Bm Em A G A F#m Bm G A D D',
      melody:
        'F#5 - A5 - B5 A5 F#5 - | D5 - F#5 - E5 D5 B4 - | D5 - E5 F#5 G5 - F#5 E5 | E5 - - - C#5 - E5 - |' +
        'F#5 - A5 - D6 - C#6 B5 | A5 - F#5 - D5 - F#5 - | G5 - F#5 E5 B4 - E5 - | E5 - - - . . A4 C#5 |' +
        'D5 - B4 - D5 - G5 - | E5 - C#5 - E5 - A5 - | F#5 - E5 - C#5 - A4 - | B4 - D5 - F#5 - B5 - |' +
        'B5 - A5 G5 F#5 - E5 D5 | E5 - A5 - G5 - E5 C#5 | D5 - F#5 - A5 - D6 - | D6 - - - . . . .',
    },

    // 區域 3 赤岩峽谷：和聲小調、帶點沙漠味
    canyon: {
      name: '赤岩峽谷', bpm: 112, lead: 'reed', bass: 'drive', arp: 'broken', drums: 'tribal',
      chords: 'Am Am G Am F G Am Am Dm Am G Am F E Am Am',
      melody:
        'A4 - C5 - E5 - D5 C5 | B4 - C5 B4 A4 - - - | G4 - B4 - D5 - C5 B4 | A4 - - - E5 - - - |' +
        'F5 - E5 - D5 - C5 - | D5 - B4 - G4 - B4 D5 | E5 - - - C5 - A4 - | A4 - - - . . E5 - |' +
        'F5 - E5 - D5 - A5 - | E5 - C5 - A4 - C5 E5 | D5 - B4 - G5 - F5 E5 | E5 - - - . . A5 - |' +
        'A5 - G5 F5 E5 - F5 - | G#5 - - - B5 - G#5 E5 | A5 - E5 - C5 - B4 C5 | A4 - - - . . . .',
    },

    // 區域 4 霜鈴雪峰：鈴鐺、慢、留白多
    snow: {
      name: '霜鈴雪峰', bpm: 84, lead: 'bell', bass: 'soft', arp: 'pad', drums: 'bell',
      chords: 'Em C G D Em C D D C D Bm Em C D G G',
      melody:
        'B5 - - - G5 - E5 - | E5 - G5 - C6 - B5 - | B5 - D6 - - - B5 - | A5 - - - F#5 - - - |' +
        'G5 - - - B5 - E6 - | D6 - C6 - B5 - G5 - | A5 - - - D5 - F#5 - | A5 - - - . . . . |' +
        'G5 - E5 - G5 - C6 - | F#5 - A5 - D6 - - - | D6 - B5 - F#5 - B5 - | G5 - - - E5 - - - |' +
        'E5 - G5 - C6 - E6 - | D6 - C6 - A5 - F#5 - | G5 - - - B5 - D6 - | G5 - - - . . . .',
    },

    // 區域 5 浮空遺跡：往上衝的英雄感
    sky: {
      name: '浮空遺跡', bpm: 120, lead: 'pulse', bass: 'drive', arp: 'up', drums: 'march',
      chords: 'F C Dm Bb F C Bb C Dm Bb F C Bb C F F',
      melody:
        'A5 - C6 - A5 - F5 - | G5 - - - E5 - C5 - | D5 - F5 - A5 - G5 F5 | F5 - - - D5 - - - |' +
        'C5 - F5 - A5 - C6 - | C6 - Bb5 - G5 - E5 - | F5 - G5 - A5 - Bb5 - | C6 - - - . . C5 - |' +
        'D5 - F5 - A5 - D6 - | D6 - C6 - Bb5 - F5 - | A5 - C6 - F6 - E6 D6 | C6 - - - G5 - - - |' +
        'Bb5 - A5 - G5 - F5 - | G5 - A5 - Bb5 - E5 - | F5 - A5 - C6 - F6 - | F6 - - - . . . .',
    },

    boss: {
      name: 'Boss', bpm: 138, lead: 'saw', bass: 'drive', arp: 'up', drums: 'rock',
      chords: 'Cm Cm Ab Bb Cm Cm Ab G Fm Cm Ab G Fm Ab G G',
      melody:
        'C5 - C5 Eb5 G5 - F5 Eb5 | D5 - Eb5 - C5 - - - | C5 - Eb5 - Ab5 - G5 F5 | F5 - D5 - Bb4 - D5 F5 |' +
        'G5 - - - Eb5 - C5 - | G5 - Ab5 G5 F5 - Eb5 - | Eb5 - F5 - Ab5 - C6 - | B5 - - - G5 - D5 B4 |' +
        'C6 - Ab5 - F5 - Ab5 C6 | G5 - Eb5 - C5 - Eb5 G5 | Ab5 - G5 - F5 - Eb5 - | D5 - - - B4 - D5 G5 |' +
        'F5 - Ab5 - C6 - Bb5 Ab5 | G5 - Ab5 - Eb6 - C6 - | D6 - - - B5 - G5 - | B5 - D6 - G6 - - -',
    },
  };

  const REGION_SONG = { 1: 'forest', 2: 'sea', 3: 'canyon', 4: 'snow', 5: 'sky' };

  // 鼓組：每小節 8 格。k 大鼓、s 小鼓、h 腳踏鈸、t 通鼓、c 沙鈴、b 小鈴
  const DRUMS = {
    shaker: ['k . c . k c c .', 'k . c . k c c c'],
    island: ['k . h s . h k h', 'k . h s . h s h'],
    tribal: ['k . t . k t . t', 'k k t . k . t t'],
    bell: ['b . . . . . . .', '. . . . b . . .'],
    march: ['k h s h k h s h', 'k h s h k k s s'],
    rock: ['k h s h k k s h', 'k h s h k k s s'],
  };

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) {
    const m = /^([A-G])([#b]?)(\d)$/.exec(name);
    if (!m) return null;
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function parseChord(s) {
    const m = /^([A-G][#b]?)(m?)$/.exec(s);
    const root = midi(m[1] + '3') % 12;
    return { root, third: m[2] ? 3 : 4 };
  }

  function parseMelody(str) {
    const toks = str.replace(/\|/g, ' ').split(/\s+/).filter(Boolean);
    const out = [];
    let last = null;
    toks.forEach((t, i) => {
      if (t === '-') {
        if (last) last.len++;
      } else if (t === '.') {
        last = null;
      } else {
        last = { step: i, note: midi(t), len: 1 };
        out.push(last);
      }
    });
    return { notes: out, steps: toks.length };
  }

  function compile(s) {
    if (s._c) return s._c;
    const mel = parseMelody(s.melody);
    const chords = s.chords.split(/\s+/).map(parseChord);
    const byStep = {};
    mel.notes.forEach((n) => (byStep[n.step] = n));
    const drums = s.drums ? DRUMS[s.drums].map((p) => p.split(' ')) : null;
    s._c = { steps: Math.max(mel.steps, chords.length * 8), byStep, chords, drums };
    return s._c;
  }

  const M = (G.music = {
    enabled: true,
    volume: 0.55,
    out: null, // 所有曲子的總音量
    track: null, // { id, song, gain, step, next }
    want: null,
    timer: null,

    loadPrefs() {
      const p = G.store.get('xiaozong_audio_v1');
      if (p && typeof p.music === 'boolean') this.enabled = p.music;
    },

    setEnabled(on) {
      this.enabled = on;
      const p = G.store.get('xiaozong_audio_v1') || {};
      p.music = on;
      G.store.set('xiaozong_audio_v1', p);
      if (this.out) this.out.gain.setTargetAtTime(on ? this.volume : 0, G.audio.ctx.currentTime, 0.2);
    },

    // audio.unlock() 建好 AudioContext 之後呼叫
    onUnlock() {
      const c = G.audio.ctx;
      if (!c || this.out) return;
      this.out = c.createGain();
      this.out.gain.value = this.enabled ? this.volume : 0;
      this.out.connect(G.audio.master);
      this.timer = setInterval(() => this.tick(), 40);
      document.addEventListener('visibilitychange', () => {
        if (!G.audio.ctx) return;
        if (document.hidden) G.audio.ctx.suspend();
        else G.audio.ctx.resume();
      });
      if (this.want) {
        const w = this.want;
        this.want = null;
        this.play(w);
      }
    },

    songFor(map) {
      if (!map) return 'title';
      if (map.music) return map.music;
      if (map.type === 'boss') return 'boss';
      return REGION_SONG[map.region] || 'forest';
    },

    forMap(map) {
      this.play(this.songFor(map));
    },

    current() {
      return this.track ? this.track.id : this.want;
    },

    play(id) {
      if (!SONGS[id]) return;
      if (!this.out) {
        this.want = id;
        return;
      }
      if (this.track && this.track.id === id) return;
      const c = G.audio.ctx;
      this.fadeOut(0.8);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.2);
      gain.connect(this.out);
      this.track = { id, song: SONGS[id], c: compile(SONGS[id]), gain, step: 0, next: c.currentTime + 0.25 };
    },

    stop(fade) {
      this.fadeOut(fade || 0.8);
      this.track = null;
      this.want = null;
    },

    fadeOut(sec) {
      const tr = this.track;
      if (!tr) return;
      const c = G.audio.ctx;
      const g = tr.gain.gain;
      g.cancelScheduledValues(c.currentTime);
      g.setValueAtTime(Math.max(0.0001, g.value), c.currentTime);
      g.exponentialRampToValueAtTime(0.0001, c.currentTime + sec);
      setTimeout(() => tr.gain.disconnect(), (sec + 1) * 1000);
    },

    tick() {
      const tr = this.track;
      const c = G.audio.ctx;
      if (!tr || !c || c.state !== 'running') return;
      const dt = 30 / tr.song.bpm;
      // 分頁切回來時不要一次補一大堆音
      if (tr.next < c.currentTime - 0.3) tr.next = c.currentTime + 0.05;
      while (tr.next < c.currentTime + 0.2) {
        this.scheduleStep(tr, tr.step, tr.next, dt);
        tr.step = (tr.step + 1) % tr.c.steps;
        tr.next += dt;
      }
    },

    scheduleStep(tr, step, t, dt) {
      const s = tr.song;
      const C = tr.c;
      const bar = Math.floor(step / 8);
      const pos = step % 8;
      const ch = C.chords[bar % C.chords.length];
      const out = tr.gain;
      try {
        const n = C.byStep[step];
        if (n) LEAD[s.lead](out, hz(n.note), t, n.len * dt);
        const b = BASS[s.bass](ch, pos);
        if (b != null) this.bassNote(out, hz(36 + ch.root + b), t, s.bass === 'drive' ? dt * 0.9 : dt * 1.8, s.bass);
        ARP[s.arp](out, ch, pos, t, dt);
        if (C.drums) {
          const d = C.drums[bar % C.drums.length][pos];
          if (d !== '.') DRUM[d](out, t);
        }
      } catch (e) { /* 音樂出錯不影響遊戲 */ }
    },

    // ── 發聲 ──
    osc(dest, type, f, t, dur, vol, a, rel, filter) {
      const c = G.audio.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + a);
      g.gain.setValueAtTime(vol, t + Math.max(a, dur - rel));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
      let node = o;
      if (filter) {
        const fl = c.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.value = filter;
        o.connect(fl);
        node = fl;
      }
      node.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + dur + rel + 0.05);
      return o;
    },

    bell(dest, f, t, vol, decay) {
      const c = G.audio.ctx;
      [[1, 1], [2.76, 0.25], [5.4, 0.08]].forEach(([r, k]) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.value = f * r;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol * k, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay / r);
        o.connect(g);
        g.connect(dest);
        o.start(t);
        o.stop(t + decay + 0.05);
      });
    },

    bassNote(dest, f, t, dur, style) {
      if (style === 'soft') this.osc(dest, 'sine', f, t, dur, 0.22, 0.03, 0.2);
      else if (style === 'drive') this.osc(dest, 'sawtooth', f, t, dur, 0.1, 0.005, 0.04, 500);
      else this.osc(dest, 'triangle', f, t, dur * 0.6, 0.24, 0.005, 0.12);
    },

    drumNoise(dest, t, dur, vol, freq, type) {
      const A = G.audio;
      const c = A.ctx;
      const s = c.createBufferSource();
      s.buffer = A.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f);
      f.connect(g);
      g.connect(dest);
      s.start(t, Math.random() * 0.5);
      s.stop(t + dur + 0.02);
    },
  });

  // 主旋律音色
  const LEAD = {
    ocarina(d, f, t, dur) {
      const o = M.osc(d, 'triangle', f, t, dur, 0.16, 0.03, 0.12);
      vibrato(o, f, t, dur);
      M.osc(d, 'sine', f * 2, t, dur, 0.03, 0.03, 0.1);
    },
    pulse(d, f, t, dur) {
      M.osc(d, 'square', f, t, dur * 0.85, 0.05, 0.01, 0.06, 2600);
      M.osc(d, 'triangle', f, t, dur * 0.85, 0.08, 0.01, 0.08);
    },
    reed(d, f, t, dur) {
      const o = M.osc(d, 'sawtooth', f, t, dur, 0.06, 0.04, 0.1, 1500);
      vibrato(o, f, t, dur);
      M.osc(d, 'triangle', f, t, dur, 0.06, 0.04, 0.1);
    },
    bell(d, f, t, dur) {
      M.bell(d, f, t, 0.13, Math.max(1.2, dur * 1.5));
    },
    saw(d, f, t, dur) {
      M.osc(d, 'sawtooth', f, t, dur * 0.9, 0.07, 0.01, 0.06, 2200);
      M.osc(d, 'square', f / 2, t, dur * 0.9, 0.035, 0.01, 0.06, 1200);
    },
  };

  function vibrato(o, f, t, dur) {
    if (dur < 0.4) return;
    const c = G.audio.ctx;
    const l = c.createOscillator();
    const g = c.createGain();
    l.frequency.value = 5.5;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(dur, 0.5));
    l.connect(g);
    g.connect(o.frequency);
    l.start(t);
    l.stop(t + dur + 0.2);
  }

  // 低音：回傳這一格要彈的音（相對根音的半音數），null 表示不彈
  const BASS = {
    pluck: (ch, p) => (p === 0 ? 0 : p === 4 ? 7 : p === 6 ? 12 : null),
    soft: (ch, p) => (p === 0 ? 0 : p === 4 ? 7 : null),
    walk: (ch, p) => (p === 0 ? 0 : p === 2 ? ch.third : p === 4 ? 7 : p === 6 ? 12 : null),
    drive: (ch, p) => (p % 2 === 0 ? (p === 4 ? 12 : 0) : p === 7 ? 7 : null),
  };

  const chordNotes = (ch, base) => [0, ch.third, 7, 12].map((i) => hz(base + ch.root + i));

  // 伴奏
  const ARP = {
    bells(d, ch, p, t, dt) {
      if (p % 2) return;
      const n = chordNotes(ch, 72);
      M.bell(d, n[[0, 2, 1, 3][p / 2]], t, 0.035, 0.9);
    },
    pad(d, ch, p, t, dt) {
      if (p !== 0) return;
      chordNotes(ch, 60).slice(0, 3).forEach((f) => M.osc(d, 'triangle', f, t, dt * 7.5, 0.035, 0.4, 0.5));
    },
    strum(d, ch, p, t, dt) {
      if (p !== 2 && p !== 6 && p !== 3) return;
      chordNotes(ch, 60).forEach((f, i) => M.osc(d, 'triangle', f, t + i * 0.012, dt * 0.7, 0.03, 0.004, 0.1));
    },
    broken(d, ch, p, t, dt) {
      const n = chordNotes(ch, 60);
      M.osc(d, 'square', n[[0, 2, 1, 2, 3, 2, 1, 2][p]], t, dt * 0.5, 0.018, 0.004, 0.05, 1800);
    },
    up(d, ch, p, t, dt) {
      const n = chordNotes(ch, 60);
      M.osc(d, 'square', n[p % 4], t, dt * 0.5, 0.02, 0.004, 0.04, 2400);
    },
  };

  const DRUM = {
    k(d, t) {
      const o = M.osc(d, 'sine', 120, t, 0.1, 0.35, 0.003, 0.08);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    },
    s(d, t) {
      M.drumNoise(d, t, 0.12, 0.14, 1800, 'bandpass');
      M.osc(d, 'triangle', 190, t, 0.05, 0.08, 0.002, 0.05);
    },
    h(d, t) { M.drumNoise(d, t, 0.035, 0.06, 7000, 'highpass'); },
    c(d, t) { M.drumNoise(d, t, 0.06, 0.05, 5000, 'highpass'); },
    t(d, t) {
      const o = M.osc(d, 'sine', 180, t, 0.14, 0.22, 0.003, 0.1);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.16);
    },
    b(d, t) { M.bell(d, 2093, t, 0.03, 1.4); },
  };

  M.SONGS = SONGS;
  M.loadPrefs();
})();
