// 背景音樂：Web Audio 即時合成，沒有音檔。
// 目標是楓之谷式的冒險感：長笛主旋律、弦樂鋪底、豎琴分解和弦、撥弦低音、鈴鐺點綴、刷子鼓，最後過一層殘響。
//
// 記譜：以十六分音符為單位。旋律一個記號＝「音名/長度」，r 是休止，| 是小節線（檢查用）。
//   例：'C5/2 F5/2 A5/4' ＝ 八分 C5、八分 F5、四分 A5
// 和弦一小節一個，用 ':' 把一小節切成前後兩半，例如 'Gm7:C7'。
(function () {
  'use strict';

  const SONGS = {
    // 標題：星楓樹下，溫柔帶點惆悵
    title: {
      bpm: 84, lead: 'flute', comp: 'harp', pad: 'strings', bass: 'long', drums: null, verb: 0.5,
      chords: 'Fmaj7 G Em7 Am7 Fmaj7 G E7 Am Fmaj7 G Em7 Am7 Dm7 G7 C C',
      melody:
        'A5/8 C6/4 E6/4 | D6/12 B5/4 | G5/4 B5/4 E6/4 D6/4 | C6/12 r/4 |' +
        'A5/4 G5/4 A5/4 C6/4 | B5/6 A5/2 G5/8 | G#5/8 B5/4 D6/4 | C6/4 B5/4 A5/8 |' +
        'A5/8 C6/4 F6/4 | E6/8 D6/4 B5/4 | G5/4 B5/4 E6/4 G6/4 | E6/12 r/4 |' +
        'F6/4 E6/4 D6/4 C6/4 | B5/6 C6/2 D6/8 | C6/16 | r/16',
      double: { inst: 'glock', from: 8, to: 16, oct: 0 },
    },

    // 第一章 狩獵場：魔法森林風。3/4 拍、豎琴流水、鋼片琴旋律、夢幻的小調
    forest: {
      bpm: 84, barLen: 12, lead: 'celesta', comp: 'flow', pad: 'strings', bass: 'long', drums: null, verb: 0.6,
      chords: 'Dm7 Bbmaj7 Gm7 A7 Dm7 Fmaj7 Gm7 A7 Bbmaj7 C Am7 Dm7 Gm7 C7 Fmaj7 A7',
      melody:
        'A5/4 D6/4 C6/2 A5/2 | F5/6 G5/2 A5/2 F5/2 | G5/4 Bb5/4 D6/4 | C#6/6 E6/2 C#6/2 A5/2 |' +
        'D6/4 F6/4 E6/2 D6/2 | C6/6 A5/2 G5/2 F5/2 | G5/4 A5/4 Bb5/2 D6/2 | A5/12 |' +
        'D6/4 F6/4 E6/2 D6/2 | E6/6 D6/2 C6/2 G5/2 | C6/4 E6/4 D6/2 C6/2 | A5/6 F5/2 G5/2 A5/2 |' +
        'Bb5/4 D6/4 G6/4 | G6/4 E6/4 C6/4 | A5/4 C6/4 E6/4 | C#6/6 A5/6',
      double: { inst: 'flute', from: 8, to: 16, oct: -12 },
    },

    // 第一章 營地：港口小鎮風。3/4 圓舞曲、手風琴、碰恰恰
    town: {
      bpm: 104, barLen: 12, lead: 'accordion', comp: ['waltz', 'harp'], pad: null, bass: 'oom', drums: 'town', verb: 0.35,
      chords: 'F Dm Bb C F Am Bb:C F Bb C Am Dm Gm C F C7',
      melody:
        'C5/4 F5/4 A5/4 | A5/6 G5/2 F5/4 | D5/4 F5/4 Bb5/4 | A5/6 G5/6 |' +
        'C5/4 F5/4 A5/4 | C6/6 B5/2 A5/4 | Bb5/4 A5/2 G5/6 | F5/12 |' +
        'D6/4 C6/4 Bb5/4 | C6/6 G5/6 | A5/4 C6/4 E6/4 | D6/6 C6/2 A5/4 |' +
        'Bb5/4 A5/4 G5/4 | E5/4 G5/4 C6/4 | A5/6 G5/2 F5/4 | G5/6 E5/6',
    },

    // Boss：弦樂急奏、銅管重音、勇士村式的太鼓
    boss: {
      bpm: 150, lead: 'brass', comp: 'ostinato', pad: 'stabs', bass: 'drive', drums: 'boss', verb: 0.25,
      chords: 'Cm Cm Ab Bb Cm Cm Ab G Fm Cm Ab Bb Fm Ab G G',
      melody:
        'C5/4 Eb5/4 G5/6 F5/2 | Eb5/4 D5/4 C5/8 | Ab4/4 C5/4 Eb5/4 F5/4 | D5/6 Eb5/2 F5/8 |' +
        'G5/4 C6/4 Bb5/4 G5/4 | Ab5/4 G5/4 Eb5/8 | C6/4 Bb5/4 Ab5/4 G5/4 | B4/4 D5/4 G5/8 |' +
        'Ab5/6 G5/2 F5/4 C5/4 | Eb5/6 D5/2 C5/4 G5/4 | Ab5/6 Bb5/2 C6/4 Eb6/4 | D6/8 Bb5/4 F5/4 |' +
        'C6/4 Ab5/4 F5/4 Ab5/4 | Eb6/4 C6/4 Ab5/4 C6/4 | D6/8 B5/4 G5/4 | G5/2 A5/2 B5/2 C6/2 D6/8',
    },

    // ── 第二章以後：先放骨架，做到那一章時會重寫 ──
    sea: {
      bpm: 108, lead: 'flute', comp: 'harp', pad: 'strings', bass: 'pizz', drums: 'forest', verb: 0.4,
      chords: 'D Bm G A D Bm Em A',
      melody:
        'F#5/4 A5/4 B5/2 A5/2 F#5/4 | D5/4 F#5/4 E5/2 D5/2 B4/4 | D5/4 E5/2 F#5/2 G5/4 F#5/2 E5/2 | E5/8 C#5/4 E5/4 |' +
        'F#5/4 A5/4 D6/4 C#6/2 B5/2 | A5/4 F#5/4 D5/4 F#5/4 | G5/4 F#5/2 E5/2 B4/4 E5/4 | E5/12 r/4',
    },
    canyon: {
      bpm: 112, lead: 'reed', comp: 'harp', pad: 'strings', bass: 'pizz', drums: 'forest', verb: 0.35,
      chords: 'Am Am G Am F G E Am',
      melody:
        'A4/4 C5/4 E5/4 D5/2 C5/2 | B4/4 C5/2 B4/2 A4/8 | G4/4 B4/4 D5/4 C5/2 B4/2 | A4/8 E5/8 |' +
        'F5/4 E5/4 D5/4 C5/4 | D5/4 B4/4 G4/4 B4/4 | G#5/8 B5/4 G#5/2 E5/2 | A5/12 r/4',
    },
    snow: {
      bpm: 84, lead: 'glock', comp: 'harp', pad: 'strings', bass: 'long', drums: null, verb: 0.55,
      chords: 'Em C G D Em C D D',
      melody:
        'B5/8 G5/4 E5/4 | E5/4 G5/4 C6/4 B5/4 | B5/4 D6/8 B5/4 | A5/8 F#5/8 |' +
        'G5/8 B5/4 E6/4 | D6/4 C6/4 B5/4 G5/4 | A5/8 D5/4 F#5/4 | A5/12 r/4',
    },
    sky: {
      bpm: 120, lead: 'flute', comp: 'harp', pad: 'strings', bass: 'pizz', drums: 'forest', verb: 0.4,
      chords: 'F C Dm Bb F C Bb C',
      melody:
        'A5/4 C6/4 A5/4 F5/4 | G5/8 E5/4 C5/4 | D5/4 F5/4 A5/4 G5/2 F5/2 | F5/8 D5/8 |' +
        'C5/4 F5/4 A5/4 C6/4 | C6/4 Bb5/4 G5/4 E5/4 | F5/4 G5/4 A5/4 Bb5/4 | C6/12 r/4',
    },
  };

  const REGION_SONG = { 1: 'forest', 2: 'sea', 3: 'canyon', 4: 'snow', 5: 'sky' };
  // 營地另有一首（小鎮感），沒有的區域就沿用狩獵場的曲子
  const CAMP_SONG = { 1: 'town' };

  // 鼓組（每小節 16 格）
  const DRUMS = {
    forest: {
      k: 'x.......x.x.....',
      s: '....x.......x...',
      h: 'x.x.x.x.x.x.x.x.',
      t: '......x.......x.',
    },
    town: {
      k: 'x...........',
      t: '....x...x...',
      h: '..x...x...x.',
    },
    boss: {
      T: 'x.....x.x.....x.',
      r: '..x.x.....x.x..x',
      k: 'x.....x.x.......',
      s: '....x.......x.xx',
      h: 'x.xxx.xxx.xxx.xx',
      m: 'x.......x.......', // 定音鼓
    },
  };

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) {
    const m = /^([A-G])([#b]?)(\d)$/.exec(name);
    if (!m) throw new Error('bad note ' + name);
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
    sus4: [0, 5, 7], add9: [0, 4, 7, 14], dim: [0, 3, 6],
  };
  function parseChord(s) {
    const m = /^([A-G][#b]?)(.*)$/.exec(s);
    const root = midi(m[1] + '3') % 12;
    const iv = QUAL[m[2]];
    if (!iv) throw new Error('bad chord ' + s);
    return { root, iv, minor: iv[1] === 3 };
  }

  function parseMelody(str) {
    const notes = [];
    const bars = [];
    let step = 0;
    let barStart = 0;
    str.replace(/\|/g, ' | ').split(/\s+/).filter(Boolean).forEach((tok) => {
      if (tok === '|') {
        bars.push(step - barStart);
        barStart = step;
        return;
      }
      const [n, d] = tok.split('/');
      const len = +d;
      if (n !== 'r') notes.push({ step, note: midi(n), len });
      step += len;
    });
    bars.push(step - barStart);
    return { notes, steps: step, bars };
  }

  function compile(s) {
    if (s._c) return s._c;
    const mel = parseMelody(s.melody);
    const chords = s.chords.split(/\s+/).filter(Boolean).map((b) => b.split(':').map(parseChord));
    const byStep = {};
    mel.notes.forEach((n) => (byStep[n.step] = n));
    const barLen = s.barLen || 16;
    s._c = { steps: Math.max(mel.steps, chords.length * barLen), byStep, chords, bars: mel.bars, barLen };
    return s._c;
  }

  const M = (G.music = {
    enabled: true,
    volume: 0.85,
    out: null,
    dry: null,
    wet: null,
    track: null,
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

    // 合成一段殘響用的脈衝（兩聲道、指數衰減的雜訊）
    makeVerb(c) {
      const len = Math.floor(c.sampleRate * 2.6);
      const buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      const cv = c.createConvolver();
      cv.buffer = buf;
      return cv;
    },

    onUnlock() {
      const c = G.audio.ctx;
      if (!c || this.out) return;
      this.out = c.createGain();
      this.out.gain.value = this.enabled ? this.volume : 0;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      this.out.connect(comp);
      comp.connect(G.audio.master);
      const verb = this.makeVerb(c);
      this.verbIn = c.createGain();
      this.verbIn.gain.value = 0.35;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 250;
      this.verbIn.connect(hp);
      hp.connect(verb);
      verb.connect(this.out);
      this.timer = setInterval(() => this.tick(), 30);
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
      if (map.type === 'camp' && CAMP_SONG[map.region]) return CAMP_SONG[map.region];
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
      this.fadeOut(0.9);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.2);
      gain.connect(this.out);
      const send = c.createGain();
      send.gain.value = SONGS[id].verb || 0.3;
      gain.connect(send);
      send.connect(this.verbIn);
      this.track = { id, song: SONGS[id], c: compile(SONGS[id]), gain, send, step: 0, next: c.currentTime + 0.25 };
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
      setTimeout(() => {
        tr.gain.disconnect();
        tr.send.disconnect();
      }, (sec + 1) * 1000);
    },

    tick() {
      const tr = this.track;
      const c = G.audio.ctx;
      if (!tr || !c || c.state !== 'running') return;
      const dt = 15 / tr.song.bpm;
      if (tr.next < c.currentTime - 0.3) tr.next = c.currentTime + 0.05;
      while (tr.next < c.currentTime + 0.2) {
        this.scheduleStep(tr, tr.step, tr.next, dt);
        tr.step = (tr.step + 1) % tr.c.steps;
        tr.next += dt;
      }
    },

    chordAt(C, step) {
      const n = C.barLen;
      const bar = C.chords[Math.floor(step / n) % C.chords.length];
      const pos = step % n;
      if (bar.length === 1) return { ch: bar[0], start: pos === 0, len: n, pos, barLen: n };
      const h = n / 2;
      return { ch: bar[pos < h ? 0 : 1], start: pos % h === 0, len: h, pos, barLen: n };
    },

    scheduleStep(tr, step, t, dt) {
      const s = tr.song;
      const C = tr.c;
      const out = tr.gain;
      const bar = Math.floor(step / C.barLen);
      const pos = step % C.barLen;
      const cur = this.chordAt(C, step);
      try {
        const n = C.byStep[step];
        if (n) {
          INST[s.lead](out, hz(n.note), t, n.len * dt);
          const d = s.double;
          if (d && bar >= d.from && bar < d.to) INST[d.inst](out, hz(n.note + d.oct), t, n.len * dt, 0.5);
        }
        if (cur.start && s.pad) PAD[s.pad](out, cur.ch, t, cur.len * dt);
        if (s.comp) [].concat(s.comp).forEach((c) => COMP[c](out, cur.ch, pos, t, dt, cur));
        if (s.bass) BASS[s.bass](out, cur, pos, t, dt);
        if (s.drums) {
          const D = DRUMS[s.drums];
          for (const k in D) if (D[k][pos] === 'x') DRUM[k](out, t, pos);
        }
      } catch (e) { /* 音樂出錯不影響遊戲 */ }
    },

    // ── 發聲的小工具 ──
    // env：音量包絡（起音、持續、釋放）；filter：低通頻率；pan：左右
    voice(dest, type, f, t, dur, vol, o) {
      o = o || {};
      const c = G.audio.ctx;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t);
      if (o.detune) osc.detune.value = o.detune;
      const a = o.a || 0.01;
      const rel = o.r || 0.1;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + a);
      if (o.decay) {
        g.gain.exponentialRampToValueAtTime(0.0001, t + o.decay);
      } else {
        g.gain.setValueAtTime(vol, t + Math.max(a, dur));
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, dur) + rel);
      }
      let node = osc;
      if (o.lp) {
        const fl = c.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.setValueAtTime(o.lp, t);
        if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + (o.lpT || 0.2));
        fl.Q.value = o.q || 0.7;
        node.connect(fl);
        node = fl;
      }
      node.connect(g);
      if (o.pan && c.createStereoPanner) {
        const p = c.createStereoPanner();
        p.pan.value = o.pan;
        g.connect(p);
        p.connect(dest);
      } else g.connect(dest);
      const end = t + (o.decay || Math.max(a, dur) + rel) + 0.05;
      osc.start(t);
      osc.stop(end);
      return osc;
    },

    noise(dest, t, dur, vol, freq, type, q) {
      const A = G.audio;
      const c = A.ctx;
      const s = c.createBufferSource();
      s.buffer = A.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      if (q) f.Q.value = q;
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

  function vibrato(osc, f, t, dur, depth) {
    if (dur < 0.3) return;
    const c = G.audio.ctx;
    const l = c.createOscillator();
    const g = c.createGain();
    l.frequency.value = 5.2;
    g.gain.setValueAtTime(0, t);
    g.gain.setValueAtTime(0, t + 0.18);
    g.gain.linearRampToValueAtTime(f * (depth || 0.008), t + Math.min(dur, 0.6));
    l.connect(g);
    g.connect(osc.frequency);
    l.start(t);
    l.stop(t + dur + 0.3);
  }

  // 主旋律與點綴音色
  const INST = {
    // 長笛：柔和的正弦＋一點三角波泛音，起音帶氣音，長音有抖音
    flute(d, f, t, dur, k) {
      k = k || 1;
      const o = M.voice(d, 'sine', f, t, dur * 0.95, 0.15 * k, { a: 0.035, r: 0.12 });
      vibrato(o, f, t, dur);
      M.voice(d, 'triangle', f, t, dur * 0.95, 0.045 * k, { a: 0.03, r: 0.1, lp: 3200 });
      M.voice(d, 'sine', f * 2, t, dur * 0.9, 0.018 * k, { a: 0.05, r: 0.08 });
      M.noise(d, t, 0.07, 0.03 * k, f * 2, 'bandpass', 2);
    },
    reed(d, f, t, dur, k) {
      k = k || 1;
      const o = M.voice(d, 'sawtooth', f, t, dur * 0.95, 0.05 * k, { a: 0.03, r: 0.1, lp: 1800 });
      vibrato(o, f, t, dur);
      M.voice(d, 'sine', f, t, dur * 0.95, 0.08 * k, { a: 0.03, r: 0.1 });
    },
    // 鐵琴：清脆、很快衰減
    glock(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sine', f * 2, t, 0, 0.07 * k, { a: 0.003, decay: 0.9, pan: 0.25 });
      M.voice(d, 'sine', f * 2 * 3.99, t, 0, 0.012 * k, { a: 0.002, decay: 0.25, pan: 0.25 });
    },
    // 手風琴：兩支微走音的方波＋鋸齒波，輕輕的顫音（維多利亞港那種溫暖的港口味）
    accordion(d, f, t, dur, k) {
      k = k || 1;
      const o1 = M.voice(d, 'square', f, t, dur * 0.95, 0.055 * k, { a: 0.04, r: 0.12, lp: 2000, detune: -8, pan: -0.15 });
      const o2 = M.voice(d, 'sawtooth', f, t, dur * 0.95, 0.055 * k, { a: 0.04, r: 0.12, lp: 2200, detune: 8, pan: 0.15 });
      M.voice(d, 'triangle', f, t, dur * 0.95, 0.11 * k, { a: 0.04, r: 0.12 });
      vibrato(o1, f, t, dur, 0.004);
      vibrato(o2, f, t, dur, 0.004);
    },
    // 鋼片琴：魔法森林那種亮晶晶的旋律
    celesta(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sine', f, t, 0, 0.14 * k, { a: 0.003, decay: Math.max(0.9, dur * 1.3) });
      M.voice(d, 'sine', f * 2, t, 0, 0.04 * k, { a: 0.003, decay: 0.5 });
      M.voice(d, 'triangle', f * 4, t, 0, 0.012 * k, { a: 0.002, decay: 0.18 });
    },
    // 銅管：鋸齒波加濾波器掃開，Boss 用
    brass(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sawtooth', f, t, dur * 0.9, 0.07 * k, { a: 0.03, r: 0.1, lp: 600, lpTo: 2600, lpT: 0.12 });
      M.voice(d, 'sawtooth', f, t, dur * 0.9, 0.05 * k, { a: 0.03, r: 0.1, lp: 600, lpTo: 2400, lpT: 0.12, detune: 9 });
      M.voice(d, 'square', f / 2, t, dur * 0.9, 0.025 * k, { a: 0.03, r: 0.1, lp: 900 });
    },
  };

  const tones = (ch, base) => ch.iv.map((i) => hz(base + ch.root + i));

  // 和弦鋪底
  const PAD = {
    // 弦樂：每個音兩支微走音的鋸齒波，慢起慢收，左右分開
    strings(d, ch, t, dur) {
      tones(ch, 55).slice(0, 4).forEach((f, i) => {
        const pan = i % 2 ? 0.35 : -0.35;
        M.voice(d, 'sawtooth', f, t, dur, 0.018, { a: 0.35, r: 0.5, lp: 1300, detune: -7, pan });
        M.voice(d, 'sawtooth', f, t, dur, 0.018, { a: 0.35, r: 0.5, lp: 1300, detune: 7, pan: -pan });
      });
    },
    // Boss：每次換和弦來一記銅管重音
    stabs(d, ch, t, dur) {
      tones(ch, 55).slice(0, 3).forEach((f) => {
        M.voice(d, 'sawtooth', f, t, 0.18, 0.05, { a: 0.01, r: 0.15, lp: 3000, lpTo: 700, lpT: 0.25 });
      });
      tones(ch, 43).slice(0, 1).forEach((f) => M.voice(d, 'sawtooth', f, t, dur, 0.02, { a: 0.3, r: 0.4, lp: 900 }));
    },
  };

  // 伴奏
  const ARP_ORDER = [0, 1, 2, 3, 2, 1, 2, 1];
  const FLOW = [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 3, 2, 1, 2, 1];
  const COMP = {
    // 豎琴流水：十六分音符跨兩個八度上下滾動（魔法森林）
    flow(d, ch, pos, t, dt) {
      const iv = [0, 7, 12, ch.iv[1] + 12, 19, 24];
      const f = hz(50 + ch.root + iv[FLOW[pos % FLOW.length]]);
      M.voice(d, 'triangle', f, t, 0, 0.04, { a: 0.003, decay: 0.9, pan: pos % 2 ? 0.3 : -0.3 });
    },
    // 圓舞曲的「碰—恰—恰」：第 2、3 拍的和弦
    waltz(d, ch, pos, t, dt, cur) {
      if (pos !== 4 && pos !== 8) return;
      tones(ch, 60).slice(1, 3).forEach((f) => M.voice(d, 'triangle', f, t, dt * 2, 0.065, { a: 0.005, r: 0.08, lp: 2400 }));
    },
    // 豎琴：八分音符分解和弦
    harp(d, ch, pos, t, dt) {
      if (pos % 2) return;
      const n = tones(ch, 60);
      const idx = ARP_ORDER[(pos / 2) % 8] % n.length;
      M.voice(d, 'triangle', n[idx], t, 0, 0.05, { a: 0.004, decay: 1.1, pan: -0.3 });
      M.voice(d, 'sine', n[idx] * 2, t, 0, 0.012, { a: 0.004, decay: 0.5, pan: -0.3 });
    },
    // 弦樂急奏：十六分音符來回拉根音與五度
    ostinato(d, ch, pos, t, dt) {
      const f = hz(48 + ch.root + (pos % 4 === 2 ? 7 : 0));
      M.voice(d, 'sawtooth', f, t, dt * 0.7, 0.035, { a: 0.005, r: 0.04, lp: 1400 });
    },
  };

  // 低音
  const BASS = {
    // 撥弦：四分音符，根音—五度—八度—五度，換和弦時回到根音
    pizz(d, cur, pos, t, dt) {
      if (pos % 4) return;
      const seq = cur.len === 8 ? [0, 7] : [0, 7, 12, 7];
      const i = cur.len === 8 ? (pos % 8) / 4 : pos / 4;
      const f = hz(36 + cur.ch.root + seq[i]);
      M.voice(d, 'triangle', f, t, 0, 0.26, { a: 0.004, decay: 0.45, lp: 900 });
      M.voice(d, 'sine', f, t, 0, 0.16, { a: 0.004, decay: 0.35 });
    },
    // 圓舞曲低音：每小節第一拍，換和弦時跟著換
    oom(d, cur, pos, t, dt) {
      if (!cur.start) return;
      const f = hz(36 + cur.ch.root);
      M.voice(d, 'triangle', f, t, 0, 0.28, { a: 0.004, decay: 0.6, lp: 900 });
      M.voice(d, 'sine', f, t, 0, 0.18, { a: 0.004, decay: 0.5 });
    },
    long(d, cur, pos, t, dt) {
      if (!cur.start) return;
      M.voice(d, 'sine', hz(36 + cur.ch.root), t, cur.len * dt, 0.18, { a: 0.1, r: 0.4 });
    },
    drive(d, cur, pos, t, dt) {
      if (pos % 2) return;
      const f = hz(36 + cur.ch.root + (pos === 12 ? 12 : 0));
      M.voice(d, 'sawtooth', f, t, dt * 1.6, 0.09, { a: 0.004, r: 0.04, lp: 500 });
      M.voice(d, 'sine', f, t, dt * 1.6, 0.12, { a: 0.004, r: 0.04 });
    },
  };

  const DRUM = {
    k(d, t) {
      const o = M.voice(d, 'sine', 110, t, 0, 0.3, { a: 0.002, decay: 0.2 });
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    },
    // 刷子小鼓：柔軟的雜訊
    s(d, t) {
      M.noise(d, t, 0.18, 0.07, 2600, 'bandpass', 0.6);
      M.voice(d, 'triangle', 200, t, 0, 0.04, { a: 0.002, decay: 0.06 });
    },
    h(d, t, pos) { M.noise(d, t, 0.03, pos % 4 === 2 ? 0.03 : 0.018, 8000, 'highpass'); },
    // 鈴鼓
    t(d, t) {
      M.noise(d, t, 0.12, 0.035, 9000, 'bandpass', 3);
      M.noise(d, t + 0.02, 0.08, 0.02, 11000, 'bandpass', 3);
    },
    // 太鼓：勇士村那種低沉的大鼓
    T(d, t) {
      const o = M.voice(d, 'sine', 75, t, 0, 0.42, { a: 0.003, decay: 0.55 });
      o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
      M.noise(d, t, 0.18, 0.12, 320, 'lowpass');
    },
    // 木框邊擊
    r(d, t) {
      M.noise(d, t, 0.04, 0.06, 1800, 'bandpass', 4);
      M.voice(d, 'square', 820, t, 0, 0.025, { a: 0.001, decay: 0.04 });
    },
    m(d, t) {
      const o = M.voice(d, 'sine', 90, t, 0, 0.3, { a: 0.003, decay: 0.6 });
      o.frequency.exponentialRampToValueAtTime(70, t + 0.5);
      M.noise(d, t, 0.1, 0.05, 400, 'lowpass');
    },
  };

  M.SONGS = SONGS;
  M.compile = compile;
  M.loadPrefs();
})();
