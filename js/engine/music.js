// 背景音樂：Web Audio 即時合成，沒有音檔。風格規格見 DESIGN.md §17（楓之谷經典配樂的「味道」，旋律全部原創）。
//
// 一首曲子由三種東西組成：
//   form    段落：'in:2 A:8 A2:8 B:8 T:2'（名稱:小節數）。播完最後一段會跳回 loop 段（預設是前奏之後那段）。
//   chords  一小節一個和弦；用 ':' 把一小節等分，例如 'Gm7:C7'；可寫轉位 'D/F#'。
//   voices  寫好的旋律線（主旋律、對位、八度疊奏）：{ inst, m, at, oct, vol, pan, role }
//   parts   依和弦自動演奏的聲部：pad 鋪底、comp 節奏和弦、arp 分解和弦、bass 低音、drums 鼓組、
//           harm 跟主旋律走三六度和聲、answer 主旋律停下來時的應答小句、guide 弦樂/法國號的導音長音線、
//           gliss 段落交界的豎琴刮奏。每個 part 可以用 in:'A2 B' 限定在哪些段落出現。
//
// 旋律記譜：以十六分音符為單位。'C5/4' ＝ 四分音符 C5，r 是休止，| 是小節線（編譯時檢查每小節長度）。
// P 是樂句字典：'@a1' 會展開成 P.a1；'@a1^2' 展開並移高兩個半音（轉調用）。
(function () {
  'use strict';

  // ─────────────────────────── 曲目 ───────────────────────────
  const SONGS = {
    // 標題：希望、開闊。D 大調 → B 段升到 E 大調，法國號接手主旋律、小提琴高八度疊奏
    title: {
      bpm: 100, verb: 0.42, gain: 1.1,
      form: 'in:2 A:8 A2:8 B:8 T:2',
      P: {
        in: 'A5/2 D6/2 F#6/2 A6/2 C#7/4 A6/4 | G6/2 E6/2 B5/2 D6/2 C#6/4 E6/4',
        a1: 'F#5/4 A5/4 D6/6 C#6/2 | C#6/6 B5/2 A5/4 E5/4 | F#5/4 B5/4 D6/4 C#6/2 B5/2 | A5/10 F#5/2 G#5/2 A5/2',
        a2: 'B5/6 A5/2 G5/4 D6/4 | D6/6 E6/2 F#6/4 A5/4 | G5/4 B5/4 E6/4 D6/2 B5/2 | D6/6 C#6/2 r/4 A5/4',
        a3: 'B5/6 A5/2 G5/4 D6/4 | F#6/6 E6/2 C6/4 A5/4 | B5/4 D6/4 E6/4 C#6/4 | A5/6 G#5/2 D#6/4 F#6/4',
        b1: 'E5/8 C#5/2 E5/2 A5/4 | F#5/6 D#5/2 B4/4 F#5/4 | G#5/6 F#5/2 D#5/4 B5/4 | G#5/12 E5/2 F#5/2',
        b2: 'A5/6 G#5/2 F#5/4 C#6/4 | B5/6 A5/2 F#5/4 D#5/4 | E5/4 G#5/4 B5/4 C#6/4 | A5/6 G#5/2 F#5/4 D#5/4',
        t: 'E5/4 G5/4 B5/4 D6/4 | C#6/8 r/8',
      },
      chords:
        'Dmaj7 Em7:A7 ' +
        'Dmaj7 A/C# Bm7 F#m7 Gmaj7 D/F# Em7 A7sus4:A7 ' +
        'Dmaj7 A/C# Bm7 D7 Gmaj7 D7 Gmaj7:A7 F#m7:B7 ' +
        'Amaj7 B G#m7 C#m7 F#m7 B7 Emaj7:C#m7 F#m7:B7 ' +
        'Em7 A7',
      voices: [
        { inst: 'musicbox', m: '@in', at: 'in', role: 'orn', vol: 0.9 },
        { inst: 'flute', m: '@a1 @a2', at: 'A' },
        { inst: 'violin', m: '@a1 @a3', at: 'A2' },
        { inst: 'glock', m: '@a3', at: 'A2+4', oct: 12, vol: 0.55, role: 'orn', pan: 0.3 },
        { inst: 'horn', m: '@b1 @b2', at: 'B', vol: 1.1 },
        { inst: 'violin', m: '@b1 @b2', at: 'B', oct: 12, vol: 0.5, role: 'counter', pan: -0.2 },
        { inst: 'flute', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'strings', in: 'A A2 B T', center: 62 },
        { role: 'pad', inst: 'choir', in: 'B', center: 67, n: 3, vol: 0.8 },
        { role: 'arp', inst: 'harp', in: 'in A A2 T', rate: 2, seq: [0, 2, 4, 3, 5, 4, 2, 3], lo: 55 },
        { role: 'arp', inst: 'harp', in: 'B', rate: 1, seq: [0, 2, 4, 6, 7, 6, 4, 2], lo: 55, vol: 0.8 },
        { role: 'comp', inst: 'pizz', in: 'A2 B', pat: 'x..x..x.x..x..x.', center: 60, n: 3, vol: 0.8 },
        { role: 'bass', inst: 'upright', in: 'A', pat: 'R.......5.....A.' },
        { role: 'bass', inst: 'upright', in: 'A2 B T', pat: 'R..5..R.R...5.A.' },
        { role: 'drums', kit: 'titleA', in: 'in A', fill: 'brush' },
        { role: 'drums', kit: 'titleA2', in: 'A2', fill: 'tom', crash: 'C' },
        { role: 'drums', kit: 'titleB', in: 'B T', fill: 'tom', fillLen: 8, crash: 'C' },
        { role: 'answer', inst: 'glock', in: 'A', c: 81 },
        { role: 'harm', inst: 'clarinet', in: 'A2', vol: 0.8 },
        { role: 'guide', inst: 'strlead', in: 'B', lo: 60, hi: 72, move: true },
        { role: 'gliss', inst: 'harp', lo: 67 },
      ],
    },

    // 第一章營地：溫暖的森林小村（亨內西斯式的田園感）。C 大調搖擺八分、烏克麗麗刷弦、B 段轉到 F 大調
    town: {
      bpm: 112, swing: 0.55, verb: 0.32, gain: 1.15,
      form: 'in:2 A:8 A2:8 B:8 T:2',
      P: {
        in: 'G5/2 C6/2 E6/2 G6/2 E6/4 C6/4 | D6/2 F6/2 A6/4 G6/4 B5/4',
        a1: 'E5/4 G5/2 E5/2 C5/4 D5/2 E5/2 | G5/6 E5/2 D5/4 B4/4 | A5/4 C6/2 A5/2 G5/2 A5/2 F5/4 | G5/8 F5/2 E5/2 D5/4',
        a2: 'E5/4 G5/2 E5/2 C6/4 B5/2 C6/2 | D6/6 C#6/2 A5/4 E5/4 | F5/4 A5/2 C6/2 B5/2 A5/2 F5/4 | C5/6 D5/2 B4/4 r/4',
        a3: 'C6/4 E6/2 C6/2 A5/4 G5/2 A5/2 | F#5/6 A5/2 C6/4 A5/4 | F5/2 E5/2 D5/2 F5/2 B5/4 D6/4 | C6/8 Bb5/4 G5/4',
        b1: 'D6/6 C6/2 Bb5/2 A5/2 F5/4 | G5/6 A5/2 Bb5/2 C6/2 E6/4 | E6/6 D6/2 C6/2 A5/2 E5/4 | F5/8 A5/4 D6/4',
        b2: 'D6/4 Bb5/2 D6/2 F6/4 E6/2 D6/2 | E6/6 D6/2 C6/2 Bb5/2 G5/4 | A5/4 C6/4 F6/4 E6/2 D6/2 | D6/6 Bb5/2 C#6/4 E6/4',
        t: 'F5/4 E5/2 D5/2 C5/4 A4/4 | B4/8 r/8',
      },
      chords:
        'Cmaj7 Dm7:G7 ' +
        'C Em7 Fmaj7 G7 C A7 Dm7 G7sus4:G7 ' +
        'C Em7 Fmaj7 E7 Am7 D7 Dm7:G7 C:C7 ' +
        'Bbmaj7 C Am7 Dm7 Gm7 C7 Fmaj7:Dm7 Gm7:A7 ' +
        'Dm7 G7',
      voices: [
        { inst: 'marimba', m: '@in', at: 'in', role: 'orn' },
        { inst: 'ocarina', m: '@a1 @a2', at: 'A' },
        { inst: 'accordion', m: '@a1 @a3', at: 'A2' },
        { inst: 'violin', m: '@b1 @b2', at: 'B' },
        { inst: 'glock', m: '@b2', at: 'B+4', oct: 12, vol: 0.5, role: 'orn', pan: 0.3 },
        { inst: 'ocarina', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'warm', in: 'A', center: 60, vol: 0.9 },
        { role: 'pad', inst: 'strings', in: 'A2 B T', center: 62 },
        { role: 'comp', inst: 'uke', pat: 'x.o.x.oox.o.x.o.', center: 64, n: 4, strum: 0.012 },
        { role: 'arp', inst: 'marimba', in: 'A2 B', rate: 2, seq: [0, 2, 1, 3, 2, 4, 3, 1], lo: 60, vol: 0.8 },
        { role: 'bass', inst: 'upright', in: 'in A', pat: 'R.......5.....A.' },
        { role: 'bass', inst: 'upright', in: 'A2 B T', pat: 'R...3...5...A...' },
        { role: 'drums', kit: 'townA', in: 'in A', fill: 'brush' },
        { role: 'drums', kit: 'townB', in: 'A2 B T', fill: 'brush', crash: 'n' },
        { role: 'answer', inst: 'glock', in: 'A', c: 79 },
        { role: 'answer', inst: 'flute', in: 'B', c: 74 },
        { role: 'harm', inst: 'clarinet', in: 'A2', vol: 0.8 },
        { role: 'guide', inst: 'horn', in: 'B', lo: 57, hi: 67, vol: 0.8 },
        { role: 'gliss', inst: 'harp', lo: 67 },
      ],
    },

    // 第一章狩獵場：明亮輕快的森林冒險。F 大調 132 BPM、切分撥弦、馬林巴分解和弦、B 段轉 G 大調由小提琴接手
    forest: {
      bpm: 132, swing16: 0.08, verb: 0.3, gain: 1.05,
      form: 'in:2 A:8 A2:8 B:8 T:2',
      P: {
        in: 'C6/2 F6/2 A6/2 C7/2 A6/2 F6/2 r/4 | Bb6/2 A6/2 G6/2 E6/2 C6/8',
        a1: 'C5/2 F5/2 A5/3 G5/3 F5/2 C6/4 | A5/6 G5/2 F5/2 D5/2 F5/4 | D6/3 C6/3 Bb5/2 A5/2 F5/2 D5/4 | G5/6 F5/2 E5/4 r/4',
        a2: 'C5/2 F5/2 A5/3 G5/3 F5/2 E6/4 | D6/3 C6/3 A5/2 F#5/4 A5/4 | Bb5/3 A5/3 G5/2 D6/4 Bb5/2 A5/2 | G5/8 r/2 C5/2 E5/2 G5/2',
        a3: 'C6/2 E6/2 D6/3 C6/3 A5/2 E5/4 | F#5/6 A5/2 C6/4 D6/4 | D6/3 C6/3 Bb5/2 G5/3 A5/3 Bb5/2 | C6/6 B5/2 A5/4 F#5/2 A5/2',
        b1: 'B5/8 G5/2 A5/2 B5/2 C6/2 | D6/6 E6/2 D6/4 A5/4 | F#5/3 A5/3 B5/2 D6/4 F#6/4 | E6/6 D6/2 B5/2 G#5/2 E5/4',
        b2: 'A5/2 C6/2 E6/4 G6/3 E6/3 C6/2 | D6/6 C6/2 A5/2 F#5/2 D5/4 | F#5/2 G5/2 A5/2 B5/2 G#5/2 B5/2 D6/4 | C6/6 B5/2 A5/4 F#5/4',
        t: 'Bb5/3 A5/3 G5/2 r/8 | r/16',
      },
      chords:
        'Fmaj7 Gm7:C7 ' +
        'Fmaj7 Dm7 Bbmaj7 C7sus4:C7 Fmaj7 Am7:D7 Gm7 C7 ' +
        'Fmaj7 Dm7 Bbmaj7 C7sus4:C7 Am7 D7 Bbmaj7:C7 Am7:D7 ' +
        'Cmaj7 D/C Bm7 E7 Am7 D7 Bm7:E7 Am7:D7 ' +
        'Gm7 C7sus4:C7',
      voices: [
        { inst: 'glock', m: '@in', at: 'in', role: 'orn', vol: 0.8 },
        { inst: 'flute', m: '@a1 @a2', at: 'A' },
        { inst: 'flute', m: '@a1 @a3', at: 'A2' },
        { inst: 'xylo', m: '@a1 @a3', at: 'A2', vol: 0.7, role: 'counter', pan: 0.3 },
        { inst: 'violin', m: '@b1 @b2', at: 'B' },
        { inst: 'flute', m: '@b2', at: 'B+4', oct: 12, vol: 0.4, role: 'counter', pan: 0.25 },
        { inst: 'flute', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'strings', in: 'A2 B', center: 62, vol: 0.9 },
        { role: 'comp', inst: 'pizz', pat: 'x..x..x...x..x..', center: 60, n: 3 },
        { role: 'comp', inst: 'ep', in: 'B', pat: '..x...x...x..x.x', center: 64, n: 3, vol: 0.7, pan: 0.35 },
        { role: 'arp', inst: 'marimba', rate: 2, seq: [0, 2, 1, 3, 2, 4, 3, 1], lo: 62, vol: 0.9 },
        { role: 'bass', inst: 'pbass', pat: 'R..5..8.R...5.A.' },
        { role: 'drums', kit: 'fieldIn', in: 'in' },
        { role: 'drums', kit: 'forestA', in: 'A A2', fill: 'tom', crash: 'C' },
        { role: 'drums', kit: 'forestB', in: 'B T', fill: 'tom', fillLen: 8, crash: 'C' },
        { role: 'answer', inst: 'glock', in: 'A', c: 81 },
        { role: 'answer', inst: 'flute', in: 'B', c: 76 },
        { role: 'harm', inst: 'clarinet', in: 'A2', vol: 0.75 },
        { role: 'guide', inst: 'horn', in: 'B', lo: 55, hi: 67, move: true },
        { role: 'gliss', inst: 'harp', lo: 67 },
      ],
    },

    // 第二章營地 燈塔岬：溫暖懷舊的港口（維多利亞港式）。降 B 大調搖擺、手風琴＋木吉他、B 段轉 C 大調弦樂接手
    harbor: {
      bpm: 104, swing: 0.6, verb: 0.38, gain: 1.2,
      form: 'in:2 A:8 A2:8 B:8 T:2',
      P: {
        in: 'D6/2 F6/2 A6/2 F6/2 D6/4 Bb5/4 | Eb6/2 G6/2 C6/4 A5/2 C6/2 Eb6/4',
        a1: 'F5/4 D5/2 F5/2 Bb5/4 A5/4 | G5/6 F5/2 D5/4 Bb4/4 | Eb5/4 G5/2 Bb5/2 A5/2 G5/2 Eb5/4 | F5/8 Eb5/2 D5/2 C5/4',
        a2: 'D5/4 F5/2 A5/2 C6/4 A5/4 | B5/6 A5/2 G5/4 D5/4 | Eb5/4 G5/2 Bb5/2 D6/4 C6/2 Bb5/2 | Bb5/6 A5/2 r/4 F5/4',
        a3: 'A5/4 F5/4 B5/4 D6/4 | Eb6/6 D6/2 C6/4 A5/4 | G5/4 Bb5/2 D6/2 G6/8 | F6/6 E6/2 D6/4 B5/4',
        b1: 'A5/6 C6/2 E6/4 D6/2 C6/2 | B5/6 A5/2 G5/4 D5/4 | E5/4 G5/2 B5/2 D6/4 B5/4 | C6/12 B5/2 A5/2',
        b2: 'F5/4 A5/2 D6/2 F6/4 E6/2 D6/2 | D6/6 B5/2 G5/4 F5/4 | G5/2 B5/2 E6/4 C#6/4 E6/4 | F6/6 E6/2 D6/4 B5/4',
        t: 'Eb5/4 G5/4 Bb5/4 C6/4 | A5/8 r/8',
      },
      chords:
        'Bbmaj7 Cm7:F7 ' +
        'Bbmaj7 Gm7 Cm7 F7 Dm7 G7 Cm7 F7sus4:F7 ' +
        'Bbmaj7 Gm7 Cm7 F7 Dm7:G7 Cm7:F7 Ebmaj7 Dm7:G7 ' +
        'Fmaj7 G Em7 Am7 Dm7 G7 Em7:A7 Dm7:G7 ' +
        'Cm7 F7',
      voices: [
        { inst: 'guitar', m: '@in', at: 'in', role: 'orn' },
        { inst: 'accordion', m: '@a1 @a2', at: 'A' },
        { inst: 'accordion', m: '@a1 @a3', at: 'A2' },
        { inst: 'violin', m: '@b1 @b2', at: 'B' },
        { inst: 'accordion', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'organ', in: 'A', center: 60, vol: 0.8 },
        { role: 'pad', inst: 'strings', in: 'A2 B T', center: 62 },
        { role: 'comp', inst: 'guitar', pat: 'x.o.x.o.x.o.xoo.', center: 60, n: 4, strum: 0.014 },
        { role: 'comp', inst: 'ep', in: 'A2 B', pat: '......x.......x.', center: 66, n: 3, vol: 0.6, pan: 0.35 },
        { role: 'arp', inst: 'glock', in: 'B', rate: 4, seq: [4, 3, 5, 2], lo: 72, pat: '....x.......x...', vol: 0.5 },
        { role: 'bass', inst: 'upright', in: 'in A', pat: 'R.......5.....A.' },
        { role: 'bass', inst: 'upright', in: 'A2 B T', pat: 'R...5...8...A...' },
        { role: 'drums', kit: 'harborA', in: 'in A', fill: 'brush' },
        { role: 'drums', kit: 'harborB', in: 'A2 B T', fill: 'brush', crash: 'n' },
        { role: 'answer', inst: 'clarinet', in: 'A', c: 70 },
        { role: 'answer', inst: 'accordion', in: 'B', c: 72, vol: 0.8 },
        { role: 'harm', inst: 'clarinet', in: 'A2', vol: 0.75 },
        { role: 'guide', inst: 'horn', in: 'B', lo: 55, hi: 66, vol: 0.8 },
        { role: 'gliss', inst: 'harp', lo: 65 },
      ],
    },

    // 第二章狩獵場 潮風海岬：陽光海邊冒險。G 大調卡利普索、鋼鼓主旋律、康加與沙鈴、B 段轉 A 大調小號接手
    sea: {
      bpm: 128, swing16: 0.1, verb: 0.3, gain: 1.25,
      form: 'in:2 A:8 A2:8 B:8 T:2',
      P: {
        in: 'B5/2 D6/2 G6/2 D6/2 B5/2 D6/2 G6/4 | E6/2 G6/2 C6/4 F#6/2 A6/2 D6/4',
        a1: 'D5/3 G5/3 B5/2 D6/4 B5/4 | D6/3 B5/3 G5/2 E5/4 G5/4 | E5/3 G5/3 C6/2 E6/4 D6/2 C6/2 | A5/6 F#5/2 D5/4 r/4',
        a2: 'D5/3 G5/3 B5/2 D6/4 G6/4 | F#6/3 D#6/3 B5/2 A5/4 F#5/4 | G5/3 B5/3 E6/2 D6/4 B5/4 | C#6/4 A5/4 C6/4 F#5/4',
        a3: 'D6/3 B5/3 F#5/2 A5/4 B5/4 | G#5/3 B5/3 D6/2 E6/8 | C6/3 A5/3 E5/2 F#5/4 A5/4 | B5/6 G5/2 G#5/4 B5/4',
        b1: 'F#5/3 A5/3 C#6/2 E6/4 C#6/4 | B5/3 G#5/3 E5/2 B5/8 | E5/3 G#5/3 B5/2 C#6/4 E6/4 | C#6/8 A5/4 F#5/4',
        b2: 'D6/3 C#6/3 B5/2 F#5/4 A5/4 | G#5/3 A5/3 B5/2 D6/4 E6/4 | E6/4 C#6/4 A#5/4 C#6/4 | D6/6 B5/2 G#5/4 E5/4',
        t: 'C6/3 A5/3 E5/2 G5/8 | F#5/8 r/8',
      },
      chords:
        'G C:D ' +
        'G Em7 C D7 G B7 Em7 A7:D7 ' +
        'G Em7 C D7 Bm7 E7 Am7:D7 Cmaj7:E7 ' +
        'Dmaj7 E C#m7 F#m7 Bm7 E7 C#m7:F#7 Bm7:E7 ' +
        'Am7 D7',
      voices: [
        { inst: 'steel', m: '@in', at: 'in', role: 'orn' },
        { inst: 'steel', m: '@a1 @a2', at: 'A' },
        { inst: 'flute', m: '@a1 @a3', at: 'A2' },
        { inst: 'steel', m: '@a1 @a3', at: 'A2', oct: -12, vol: 0.45, role: 'counter', pan: -0.3 },
        { inst: 'trumpet', m: '@b1 @b2', at: 'B' },
        { inst: 'steel', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'warm', in: 'A', center: 62, vol: 0.9 },
        { role: 'pad', inst: 'strings', in: 'A2 B T', center: 62, vol: 0.8 },
        { role: 'comp', inst: 'uke', pat: '..x...x...x..xx.', center: 64, n: 4, strum: 0.01 },
        { role: 'comp', inst: 'brass', in: 'B', pat: '......x.......x.', center: 62, n: 3, len: 1, vol: 0.6 },
        { role: 'arp', inst: 'marimba', rate: 1, seq: [0, 2, 4, 2, 1, 3, 5, 3], lo: 60, pat: 'x.xxx.xxx.xxx.xx', vol: 0.75 },
        { role: 'bass', inst: 'pbass', pat: 'R..5..R.R..5..A.' },
        { role: 'drums', kit: 'fieldIn', in: 'in' },
        { role: 'drums', kit: 'seaA', in: 'A A2', fill: 'conga', crash: 'C' },
        { role: 'drums', kit: 'seaB', in: 'B T', fill: 'tom', fillLen: 8, crash: 'C' },
        { role: 'answer', inst: 'glock', in: 'A', c: 81 },
        { role: 'answer', inst: 'steel', in: 'B', c: 76, vol: 0.7 },
        { role: 'harm', inst: 'clarinet', in: 'A2', vol: 0.7 },
        { role: 'guide', inst: 'strlead', in: 'B', lo: 60, hi: 72, move: true },
        { role: 'gliss', inst: 'harp', lo: 67 },
      ],
    },

    // 第三章營地 溫泉谷：悠閒的溫泉鄉，帶一點東方五聲音階。D 大調 96 BPM、竹笛、古箏分解、B 段轉 E 大調二胡接手
    spa: {
      bpm: 96, swing16: 0.15, verb: 0.45, gain: 1.05,
      form: 'in:2 A:8 A2:8 B:8 T:2',
      P: {
        in: 'A5/2 B5/2 D6/2 E6/2 F#6/4 E6/4 | D6/2 B5/2 A5/2 E5/2 D5/8',
        a1: 'A5/6 B5/2 A5/4 F#5/2 E5/2 | D5/6 E5/2 F#5/8 | B5/4 A5/2 B5/2 D6/4 E6/4 | D6/8 B5/2 A5/2 r/4',
        a2: 'F#6/6 E6/2 D6/4 B5/4 | A5/6 B5/2 A5/2 F#5/2 E5/4 | F#5/4 E5/2 D5/2 B4/4 D5/4 | E5/12 r/4',
        a3: 'D6/6 B5/2 A5/4 F#5/4 | E5/6 F#5/2 A5/4 C#6/4 | B5/6 A5/2 F#5/4 E5/4 | A5/4 C#6/4 D#6/4 F#6/4',
        b1: 'E6/6 C#6/2 B5/4 G#5/4 | B5/6 G#5/2 F#5/4 E5/4 | F#5/4 G#5/2 B5/2 C#6/8 | E6/6 F#6/2 D#6/8',
        b2: 'C#6/4 B5/2 C#6/2 E6/4 G#6/4 | F#6/6 E6/2 D#6/4 B5/4 | C#6/4 E6/4 A5/4 C#6/4 | B5/8 A5/4 F#5/4',
        t: 'G5/4 F#5/4 E5/4 B4/4 | E5/8 r/8',
      },
      chords:
        'Dmaj9 A7sus4 ' +
        'Dmaj9 Bm7 Gmaj7 A7sus4 Dmaj9 F#m7 Em9 A7sus4:A7 ' +
        'Dmaj9 Bm7 Gmaj7 A7sus4 Gmaj7 F#m7 Em9 F#m7:B7 ' +
        'Amaj9 E/G# F#m7 Bsus4:B Amaj9 G#m7 C#m7:F#m7 Bsus4:B ' +
        'Em9 A7sus4:A7',
      voices: [
        { inst: 'koto', m: '@in', at: 'in', role: 'orn' },
        { inst: 'bamboo', m: '@a1 @a2', at: 'A' },
        { inst: 'bamboo', m: '@a1 @a3', at: 'A2' },
        { inst: 'koto', m: '@a1 @a3', at: 'A2', vol: 0.5, role: 'counter', pan: 0.3 },
        { inst: 'erhu', m: '@b1 @b2', at: 'B' },
        { inst: 'bamboo', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'warm', in: 'in A', center: 60, vol: 0.9 },
        { role: 'pad', inst: 'strings', in: 'A2 B T', center: 62 },
        { role: 'comp', inst: 'ep', pat: 'x.....x...x.....', center: 62, n: 4, vol: 0.8, strum: 0.01 },
        { role: 'arp', inst: 'koto', rate: 2, seq: [0, 1, 2, 4, 3, 2, 4, 5], lo: 62, vol: 0.8 },
        { role: 'arp', inst: 'musicbox', in: 'B', rate: 2, seq: [5, 4, 6, 3], lo: 74, pat: '..x.......x.....', vol: 0.6 },
        { role: 'bass', inst: 'upright', in: 'in A', pat: 'R.......5...8...' },
        { role: 'bass', inst: 'upright', in: 'A2 B T', pat: 'R.....5.R...5.A.' },
        { role: 'drums', kit: 'spaA', in: 'in A', fill: 'wood' },
        { role: 'drums', kit: 'spaB', in: 'A2 B T', fill: 'wood', crash: 'n' },
        { role: 'answer', inst: 'koto', in: 'A', c: 76 },
        { role: 'answer', inst: 'bamboo', in: 'B', c: 76, vol: 0.8 },
        { role: 'guide', inst: 'strlead', in: 'B', lo: 60, hi: 71 },
        { role: 'gliss', inst: 'koto', lo: 62 },
      ],
    },

    // 第三章狩獵場 赤岩峽谷：勇士村式的部落鼓。A 小調（多利安 F#）、太鼓與締太鼓、三味線式撥弦 riff、銅管重音、B 段轉 B 小調小號接手
    canyon: {
      bpm: 118, swing16: 0.06, verb: 0.3, gain: 0.95,
      form: 'in:2 A:8 A2:8 B:8 T:2',
      P: {
        in: 'A4/2 A4/2 C5/2 A4/2 D5/2 A4/2 E5/2 G5/2 | A5/2 G5/2 E5/2 D5/2 C5/2 D5/2 E5/4',
        a1: 'A4/3 C5/3 D5/2 E5/4 G5/2 E5/2 | D5/6 B4/2 G4/4 D5/4 | F#5/3 E5/3 D5/2 A5/8 | G5/3 E5/3 D5/2 C5/2 D5/2 E5/4',
        a2: 'A5/3 G5/3 E5/2 C6/4 A5/4 | B5/3 A5/3 G5/2 D5/8 | E5/2 G5/2 A5/4 B5/4 G5/4 | A5/8 G#5/8',
        a3: 'C6/3 A5/3 G5/2 E5/4 G5/4 | D6/3 B5/3 G5/2 A5/2 B5/2 D6/4 | F5/2 A5/2 C6/4 B5/4 D6/4 | E6/4 B5/4 C#6/4 A#5/4',
        b1: 'F#5/3 A5/3 B5/2 D6/4 F#6/4 | E6/6 C#6/2 A5/4 E5/4 | G#5/3 B5/3 E6/2 D6/4 B5/4 | B5/12 A5/2 B5/2',
        b2: 'D6/3 B5/3 G5/2 F#5/4 D5/4 | E5/3 A5/3 C#6/2 E6/8 | F#6/4 C#6/4 D6/4 B5/4 | G5/4 B5/4 A#5/4 C#6/4',
        t: 'A5/4 C6/4 B5/4 D6/4 | E6/8 G#5/8',
      },
      chords:
        'Am Am ' +
        'Am G D/F# Am Fmaj7 G Am:Em Esus4:E ' +
        'Am G D/F# Am Fmaj7 G Dm7:G Em:F#7 ' +
        'Bm A E/G# Bm Gmaj7 A F#m:Bm Em7:F# ' +
        'F:G Esus4:E',
      voices: [
        { inst: 'pluck', m: '@in', at: 'in', role: 'orn', vol: 1.1 },
        { inst: 'bamboo', m: '@a1 @a2', at: 'A' },
        { inst: 'bamboo', m: '@a1 @a3', at: 'A2' },
        { inst: 'horn', m: '@a1 @a3', at: 'A2', oct: -12, vol: 0.6, role: 'counter', pan: -0.25 },
        { inst: 'trumpet', m: '@b1 @b2', at: 'B' },
        { inst: 'trumpet', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'choir', in: 'A2 B T', center: 60, n: 3, vol: 0.8 },
        { role: 'pad', inst: 'strings', in: 'A', center: 57, n: 3, vol: 0.8 },
        { role: 'arp', inst: 'pluck', rate: 1, seq: [0, 0, 2, 0, 3, 0, 2, 4], lo: 57, pat: 'x.xx.xx.x.xx.x.x', vol: 1.3 },
        { role: 'comp', inst: 'brass', in: 'A2 B T', pat: 'x.....x...x.....', center: 60, n: 3, len: 2, vol: 0.8 },
        { role: 'bass', inst: 'synbass', pat: 'R.RR..R.R.R...5.' },
        { role: 'drums', kit: 'canyonIn', in: 'in' },
        { role: 'drums', kit: 'canyonA', in: 'A', fill: 'taiko', crash: 'C' },
        { role: 'drums', kit: 'canyonB', in: 'A2 B T', fill: 'taiko', fillLen: 8, crash: 'C' },
        { role: 'answer', inst: 'pluck', in: 'A', c: 69 },
        { role: 'guide', inst: 'horn', in: 'B', lo: 55, hi: 66 },
        { role: 'gliss', inst: 'koto', lo: 57 },
      ],
    },

    // Boss：緊張、英雄感。C 小調 152 BPM、弦樂十六分急奏、銅管主旋律、定音鼓與太鼓、B 段轉 D 小調弦樂高八度
    boss: {
      bpm: 152, verb: 0.25, gain: 0.95,
      form: 'in:2 A:8 A2:8 B:8 T:2',
      P: {
        a1: 'C5/4 G5/4 Eb5/3 D5/3 C5/2 | Eb5/6 C5/2 Ab4/8 | F5/4 Ab5/4 C6/3 Bb5/3 Ab5/2 | G5/8 D5/4 B4/4',
        a2: 'C6/4 G5/4 Eb6/3 D6/3 C6/2 | Eb6/6 C6/2 Ab5/4 C6/4 | D6/3 Bb5/3 F5/2 D6/4 F6/4 | F6/6 D6/2 B5/4 G5/4',
        a3: 'G5/4 Bb5/4 Eb6/3 D6/3 Bb5/2 | D6/6 F6/2 D6/4 Bb5/4 | C6/4 Eb6/4 D6/4 F6/4 | E6/8 C#6/4 A5/4',
        b1: 'D6/4 A5/4 F6/3 E6/3 D6/2 | F6/6 D6/2 Bb5/8 | G5/4 Bb5/4 D6/3 C6/3 Bb5/2 | A5/8 C#6/4 E6/4',
        b2: 'F6/4 E6/4 D6/3 C6/3 A5/2 | Bb5/6 C6/2 D6/4 F6/4 | G6/4 D6/4 E6/4 C6/4 | C#6/6 E6/2 G6/4 A6/4',
        t: 'Ab5/4 C6/4 Eb6/4 C6/4 | B5/8 D6/4 G5/4',
      },
      chords:
        'Cm Cm ' +
        'Cm Ab Fm G Cm Ab Bb G7 ' +
        'Cm Ab Fm G Eb Bb Ab:Bb A7 ' +
        'Dm Bb Gm A Dm Bb Gm:C A7 ' +
        'Ab G7',
      voices: [
        { inst: 'brass', m: '@a1 @a2', at: 'A' },
        { inst: 'brass', m: '@a1 @a3', at: 'A2' },
        { inst: 'horn', m: '@a1 @a3', at: 'A2', oct: -12, vol: 0.7, role: 'counter', pan: -0.25 },
        { inst: 'violin', m: '@b1 @b2', at: 'B' },
        { inst: 'violin', m: '@b1 @b2', at: 'B', oct: -12, vol: 0.6, role: 'counter', pan: -0.3 },
        { inst: 'brass', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'choir', in: 'A2 B T', center: 62, n: 3, vol: 0.9 },
        { role: 'pad', inst: 'strings', in: 'in A', center: 55, n: 3 },
        { role: 'arp', inst: 'ostinato', rate: 1, seq: [0, 0, 2, 0, 1, 0, 2, 0], lo: 48, vol: 0.9 },
        { role: 'comp', inst: 'brass', in: 'A A2 B', pat: 'x.....x...x.....', center: 58, n: 3, len: 1, vol: 0.8 },
        { role: 'arp', inst: 'glock', in: 'B', rate: 2, seq: [4, 3, 5, 3], lo: 72, pat: '..x...x...x...x.', vol: 0.5 },
        { role: 'bass', inst: 'synbass', pat: 'R.R.R.R.R.R.8.R.' },
        { role: 'drums', kit: 'bossIn', in: 'in' },
        { role: 'drums', kit: 'bossA', in: 'A A2', fill: 'snare', crash: 'C' },
        { role: 'drums', kit: 'bossB', in: 'B T', fill: 'tom', fillLen: 8, crash: 'C' },
        { role: 'answer', inst: 'horn', in: 'A', c: 67 },
        { role: 'guide', inst: 'strlead', in: 'B', lo: 55, hi: 67 },
      ],
    },

    // ── 第四章以後：先放短的草稿，做到那一章時會重寫 ──
    snow: {
      bpm: 88, verb: 0.55, gain: 1.5,
      form: 'A:8',
      P: {},
      chords: 'Em C G D Em C D D',
      voices: [
        { inst: 'musicbox', m: 'B5/8 G5/4 E5/4 | E5/4 G5/4 C6/4 B5/4 | B5/4 D6/8 B5/4 | A5/8 F#5/8 | G5/8 B5/4 E6/4 | D6/4 C6/4 B5/4 G5/4 | A5/8 D5/4 F#5/4 | A5/12 r/4', at: 'A' },
      ],
      parts: [
        { role: 'pad', inst: 'strings', center: 62 },
        { role: 'arp', inst: 'harp', rate: 2, seq: [0, 2, 4, 3, 5, 4, 2, 3], lo: 55 },
        { role: 'bass', inst: 'upright', pat: 'R.......5.......' },
        { role: 'drums', kit: 'snow' },
        { role: 'guide', inst: 'flute', lo: 64, hi: 76, vol: 0.6 },
      ],
    },
    sky: {
      bpm: 124, verb: 0.35, gain: 1.0,
      form: 'A:8 A2:8',
      P: { a: 'A5/4 C6/4 A5/4 F5/4 | G5/8 E5/4 C5/4 | D5/4 F5/4 A5/4 G5/2 F5/2 | F5/8 D5/8 | C5/4 F5/4 A5/4 C6/4 | C6/4 Bb5/4 G5/4 E5/4 | F5/4 G5/4 A5/4 Bb5/4 | C6/12 r/4' },
      chords: 'F C Dm Bb F C Bb C F C Dm Bb F C Bb C',
      voices: [
        { inst: 'flute', m: '@a', at: 'A' },
        { inst: 'trumpet', m: '@a', at: 'A2' },
      ],
      parts: [
        { role: 'pad', inst: 'strings', center: 62 },
        { role: 'comp', inst: 'pizz', pat: 'x..x..x...x..x..', center: 60, n: 3 },
        { role: 'arp', inst: 'marimba', rate: 2, seq: [0, 2, 1, 3, 2, 4, 3, 1], lo: 62, vol: 0.8 },
        { role: 'bass', inst: 'pbass', pat: 'R..5..8.R...5.A.' },
        { role: 'drums', kit: 'forestA', fill: 'tom', crash: 'C' },
        { role: 'answer', inst: 'glock', c: 81 },
      ],
    },
  };

  const REGION_SONG = { 1: 'forest', 2: 'sea', 3: 'canyon', 4: 'snow', 5: 'sky' };
  // 營地另有一首（小鎮感），沒有的區域就沿用狩獵場的曲子
  const CAMP_SONG = { 1: 'town', 2: 'harbor', 3: 'spa' };

  // ─────────────────────────── 鼓組 ───────────────────────────
  // 每個字母一種打擊樂器；字元是力度：'.' 無、'-' 很輕、'o' 輕、'x' 正常、'X' 重音。長度可以是 1 或 2 小節。
  // k 大鼓 s 小鼓 b 刷子 c 拍手 h 閉合鈸 o 開放鈸 S 沙鈴 t 鈴鼓 r 邊擊 w 木魚 n 三角鐵 q/Q 康加高/低
  // T 太鼓 J 締太鼓 m 定音鼓 L/M/H 低/中/高筒鼓 C 碎音鈸
  const KITS = {
    fieldIn: { S: 'x-o-x-o-x-o-x-o-', k: 'x.......x.......' },
    forestA: { k: 'x.....x...x.....', s: '....x.......x...', S: 'x-o-x-o-x-o-x-o-', h: '..o...o...o...o.' },
    forestB: { k: 'x.....x.x.....x.', s: '....x.......x..-', S: 'x-o-x-o-x-o-x-o-', t: '..x...x...x...x.', o: '..............o.' },
    titleA: { S: 'x.o.x.o.x.o.x.o.', k: 'x.........x.....' },
    titleA2: { k: 'x.........x.....', b: '....x.......x...', S: 'x-o-x-o-x-o-x-o-' },
    titleB: { k: 'x.....x...x.....', s: '....x.......x...', S: 'x-o-x-o-x-o-x-o-', m: 'x.......................x.x.....', t: '..o...o...o...o.' },
    townA: { k: 'x.......x.......', b: '....x.......x...', S: 'x.o.x.o.x.o.x.o.', r: '......o.......o.' },
    townB: { k: 'x.....x.x.......', b: '....x.......x...', S: 'x.o.x.o.x.o.x.o.', t: '....x.......x...' },
    harborA: { k: 'x.......x.......', b: '....x.......x...', S: 'x.o.x.o.x.o.x.o.', n: 'o...............................' },
    harborB: { k: 'x.....x.x.......', b: '....x.......x...', S: 'x.o.x.o.x.o.x.o.', t: '..o...o...o...o.' },
    seaA: { k: 'x.....x.x.....x.', r: '...x..x....x..x.', S: 'x-o-x-o-x-o-x-o-', q: '..x...x...x..x.x', Q: 'x.......x..x....' },
    seaB: { k: 'x.....x.x.....x.', c: '....x.......x...', S: 'x-o-x-o-x-o-x-o-', q: '..x...x...x..x.x', Q: 'x.......x..x....', t: 'o.x.o.x.o.x.o.x.' },
    spaA: { k: 'x.........x.....', w: '..o.....o.....o.', S: 'x.o.x.o.x.o.x.o.', n: 'o...............................' },
    spaB: { k: 'x.....x...x.....', J: '....o.......o...', S: 'x-o-x-o-x-o-x-o-', w: '..o.....o..o..o.' },
    canyonIn: { T: 'X.......x.......', J: '..x.x.x...x.x.xx' },
    canyonA: { T: 'X.....x.x.......', J: '..o.x...o.x.o.xo', k: 'x.......x.......', r: '....x.......x...', L: '..........o.....' },
    canyonB: { T: 'X.....x.x...x...', J: 'x.ox-.x.x.ox-.x.', k: 'x.....x.x.......', c: '....x.......x...', L: '......o.......o.' },
    bossIn: { m: 'x...x...x...x.x.', T: 'X.......x.......', S: 'x-x-x-x-x-x-x-x-' },
    bossA: { m: 'x.......x.......', k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x-o-x-o-x-o-x-o-', r: '..o.....o.o...o.' },
    bossB: { k: 'x.x...x.x.x...x.', s: '....x.......x.x-', h: 'x-x-x-x-x-x-x-x-', T: 'X.......x.......', o: '......o.......o.' },
    snow: { n: 'x...............................', S: 'x.o.x.o.x.o.x.o.', k: 'o.......o.......' },
  };
  // 段落結尾的過門：每一格可以同時打幾個字母
  const FILLS = {
    tom: ['s', 's', 'H', 'H', 'M', 'M', 'L', 'Lk'],
    snare: ['s', 's', 's', 's', 's', 's', 'ss', 'sk'],
    brush: ['b', '', 'b', 'b', '', 'b', 'bq', 'bk'],
    conga: ['q', 'q', 'Q', 'q', 'Q', 'Q', 'qQ', 'Qk'],
    taiko: ['J', 'J', 'T', 'J', 'T', 'T', 'TJ', 'TL'],
    wood: ['w', '', 'w', 'w', '', 'w', 'J', 'Jk'],
  };
  const VEL = { '-': 0.4, o: 0.65, x: 1, X: 1.3 };

  // ─────────────────────────── 樂理小工具 ───────────────────────────
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  function pc(name) {
    const m = /^([A-G])([#b]?)$/.exec(name);
    if (!m) throw new Error('bad pitch ' + name);
    return (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  }
  function midi(name) {
    const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
    if (!m) throw new Error('bad note ' + name);
    const base = /^([A-G])/.exec(name)[1];
    const acc = m[1].length > 1 ? (m[1][1] === '#' ? 1 : -1) : 0;
    return 12 * (+m[2] + 1) + NOTE[base] + acc;
  }
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const nameOf = (n) => NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);

  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10], 9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], add9: [0, 4, 7, 14],
    madd9: [0, 3, 7, 14], 69: [0, 4, 7, 9, 14], sus4: [0, 5, 7], sus2: [0, 2, 7], '7sus4': [0, 5, 7, 10],
    dim: [0, 3, 6], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], aug: [0, 4, 8], '7b9': [0, 4, 7, 10, 13],
  };
  function parseChord(s) {
    const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(s);
    if (!m) throw new Error('bad chord ' + s);
    const iv = QUAL[m[2]];
    if (!iv) throw new Error('bad chord ' + s);
    const root = pc(m[1]);
    return { name: s, root, iv, bass: m[3] ? pc(m[3]) : root, pcs: iv.map((i) => (root + i) % 12), ext: {} };
  }
  // 和弦內音：從 lo 往上數 count 個
  function ext(ch, lo, count) {
    const key = lo * 100 + count;
    if (ch.ext[key]) return ch.ext[key];
    const out = [];
    for (let m = lo; out.length < count && m < lo + 60; m++) if (ch.pcs.includes(((m % 12) + 12) % 12)) out.push(m);
    return (ch.ext[key] = out);
  }
  // 和弦配置：三音、七音優先，每個音放在離 center 最近的八度
  const RANK = { 3: 0, 4: 0, 5: 0, 2: 2, 10: 1, 11: 1, 9: 1, 7: 3, 6: 3, 8: 3, 1: 2, 0: 4 };
  function voicing(ch, center, n) {
    const key = 'v' + center + '_' + n;
    if (ch.ext[key]) return ch.ext[key];
    const ivs = ch.iv.map((i) => i % 12).filter((v, i, a) => a.indexOf(v) === i);
    ivs.sort((a, b) => RANK[a] - RANK[b]);
    const notes = ivs.slice(0, n).map((i) => {
      const p = (ch.root + i) % 12;
      let m = center - 6 + ((p - (center - 6)) % 12 + 12) % 12;
      return m;
    });
    notes.sort((a, b) => a - b);
    return (ch.ext[key] = notes);
  }

  // ─────────────────────────── 編譯 ───────────────────────────
  function transTok(tok, n) {
    if (tok === '|' || /^r\//.test(tok)) return tok;
    const nm = /^([A-G][#b]?-?\d)\/(\d+)$/.exec(tok);
    if (nm) return nameOf(midi(nm[1]) + n) + '/' + nm[2];
    return tok.split(':').map((c) => {
      const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(c);
      if (!m) throw new Error('bad token ' + tok);
      const t = (x) => NAMES[(pc(x) + n + 120) % 12];
      return t(m[1]) + m[2] + (m[3] ? '/' + t(m[3]) : '');
    }).join(':');
  }
  function expand(str, P, n, depth) {
    if (depth > 8) throw new Error('phrase recursion');
    const out = [];
    String(str).replace(/\|/g, ' | ').split(/\s+/).filter(Boolean).forEach((tok) => {
      if (tok[0] === '@') {
        const m = /^@(\w+)(?:\^(-?\d+))?$/.exec(tok);
        if (!m || P[m[1]] == null) throw new Error('bad phrase ' + tok);
        const sub = expand(P[m[1]], P, n + (+m[2] || 0), depth + 1);
        if (out.length && out[out.length - 1] !== '|') out.push('|');
        out.push(...sub);
        out.push('|');
      } else out.push(n ? transTok(tok, n) : tok);
    });
    // 去掉重複與頭尾的小節線
    return out.filter((t, i) => !(t === '|' && (i === 0 || out[i - 1] === '|')));
  }
  function parseMelody(toks) {
    const notes = [];
    const bars = [];
    let step = 0;
    let barStart = 0;
    toks.forEach((tok) => {
      if (tok === '|') {
        bars.push(step - barStart);
        barStart = step;
        return;
      }
      const [n, d] = tok.split('/');
      const len = +d;
      if (!(len > 0)) throw new Error('bad length ' + tok);
      if (n !== 'r') notes.push({ step, note: midi(n), len });
      step += len;
    });
    if (step > barStart) bars.push(step - barStart);
    return { notes, steps: step, bars };
  }

  const ROLE_FX = { // [殘響倍率, 回聲量, 預設聲像]
    lead: [1, 0.16, 0], counter: [1, 0.08, -0.2], orn: [1.1, 0.2, 0.25], harm: [1, 0.06, -0.2], answer: [1.1, 0.22, 0.3],
    guide: [1.2, 0, -0.3], pad: [1.3, 0, 0], comp: [0.6, 0, -0.3], arp: [0.8, 0.08, 0.3], bass: [0.1, 0, 0],
    drums: [0.3, 0, 0], gliss: [1.3, 0.15, 0.2],
  };
  const RUNTIME = { pad: 1, comp: 1, arp: 1, bass: 1, drums: 1, gliss: 1 };

  function compile(s) {
    if (s._c) return s._c;
    const barLen = s.barLen || 16;
    const P = s.P || {};
    const chordToks = expand(s.chords, P, 0, 0).filter((t) => t !== '|');
    const segs = chordToks.map((b) => {
      const parts = b.split(':').map(parseChord);
      const len = barLen / parts.length;
      if (len % 1) throw new Error('chord split does not fit bar: ' + b);
      return parts.map((ch, i) => ({ ch, start: i * len, len }));
    });
    const nb = segs.length;
    const sections = [];
    let at = 0;
    (s.form || 'A:' + nb).split(/\s+/).filter(Boolean).forEach((f) => {
      const [name, n] = f.split(':');
      sections.push({ name, from: at, n: +n });
      at += +n;
    });
    if (at !== nb) throw new Error('form has ' + at + ' bars but chords have ' + nb);
    const secStart = new Uint8Array(nb + 1);
    sections.forEach((x) => (secStart[x.from] = 1));
    const loopSec = s.loop ? sections.find((x) => x.name === s.loop) : sections.length > 1 && sections[0].name === 'in' ? sections[1] : sections[0];
    const loopBar = loopSec.from;
    // 某小節是不是段落的最後一小節（下一小節是新段落，或曲子要循環了）
    const secEnd = new Uint8Array(nb);
    for (let b = 0; b < nb; b++) secEnd[b] = b === nb - 1 || secStart[b + 1] ? 1 : 0;
    const barsOf = (spec) => {
      const on = new Uint8Array(nb);
      if (!spec) on.fill(1);
      else spec.split(/\s+/).forEach((nm) => {
        const x = sections.find((y) => y.name === nm);
        if (!x) throw new Error('no section ' + nm);
        for (let b = x.from; b < x.from + x.n; b++) on[b] = 1;
      });
      return on;
    };
    const barAt = (spec) => {
      if (typeof spec === 'number') return spec;
      const m = /^(\w+?)(?:\+(\d+))?$/.exec(spec || sections[0].name);
      const x = m && sections.find((y) => y.name === m[1]);
      if (!x) throw new Error('bad at ' + spec);
      return x.from + (+m[2] || 0);
    };
    const steps = nb * barLen;
    const C = { steps, barLen, nb, segs, sections, secStart, secEnd, loopBar, loop: loopBar * barLen, bars: [], chans: [], ev: [], rt: [] };
    C.chordAt = (step) => chordAt(C, step);
    const chan = (role, o) => {
      const fx = ROLE_FX[role] || ROLE_FX.lead;
      C.chans.push({ vol: o.vol == null ? 1 : o.vol, pan: o.pan == null ? fx[2] : o.pan, rv: (o.rv == null ? fx[0] : o.rv) * (s.verb || 0.3), dl: o.dl == null ? fx[1] : o.dl });
      return C.chans.length - 1;
    };
    const push = (step, e) => (C.ev[step] || (C.ev[step] = [])).push(e);
    const leadOn = new Uint8Array(steps);
    const leadNotes = [];

    (s.voices || []).forEach((v) => {
      const mel = parseMelody(expand(v.m, P, v.oct || 0, 0));
      const from = barAt(v.at);
      mel.bars.forEach((n) => C.bars.push(n));
      if (mel.bars.some((n) => n !== barLen)) throw new Error('bar length mismatch in voice ' + v.inst + ' at ' + v.at + ': ' + mel.bars.join(','));
      if (from + mel.bars.length > nb) throw new Error('voice past end: ' + v.inst + ' at ' + v.at);
      const role = v.role || 'lead';
      const ci = chan(role, v);
      const base = from * barLen;
      mel.notes.forEach((n) => {
        const st = base + n.step;
        const pos = st % barLen;
        push(st, { ci, inst: v.inst, n: n.note, len: n.len, v: pos === 0 ? 1.1 : pos % 4 === 0 ? 1 : 0.9 });
        if (role === 'lead') {
          leadOn[st] = 1;
          leadNotes.push({ step: st, note: n.note, len: n.len });
        }
      });
    });

    (s.parts || []).forEach((p) => {
      const on = barsOf(p.in);
      if (!INST[p.inst] && !PADS[p.inst] && p.role !== 'drums') throw new Error('no instrument ' + p.inst);
      if (p.role === 'drums' && !KITS[p.kit]) throw new Error('no kit ' + p.kit);
      if (p.fill && !FILLS[p.fill]) throw new Error('no fill ' + p.fill);
      const ci = chan(p.role, p);
      if (RUNTIME[p.role]) {
        C.rt.push(Object.assign({ on, ci }, p));
        return;
      }
      const inBar = (st) => on[Math.floor(st / barLen)];
      if (p.role === 'harm') {
        // 主旋律下方三到六度的和弦內音
        leadNotes.forEach((n) => {
          if (!inBar(n.step) || n.len < (p.min || 3)) return;
          const ch = chordAt(C, n.step).ch;
          const cands = ext(ch, n.note - 9, 6).filter((m) => m <= n.note - 3);
          if (cands.length) push(n.step, { ci, inst: p.inst, n: cands[cands.length - 1], len: n.len, v: 0.9 });
        });
      } else if (p.role === 'guide') {
        // 導音長音線：三音、七音之間用最近的距離走
        let prev = ((p.lo || 60) + (p.hi || 72)) >> 1;
        for (let b = 0; b < nb; b++) {
          if (!on[b]) continue;
          segs[b].forEach((sg) => {
            const ch = sg.ch;
            const want = ch.iv.filter((i) => [3, 4, 10, 11, 9, 14, 5].includes(i));
            const pool = (want.length ? want : [7]).map((i) => (ch.root + i) % 12);
            const near = (exclude) => {
              let best = null;
              for (let m = p.lo || 60; m <= (p.hi || 72); m++) {
                if (!pool.includes(m % 12) || m === exclude) continue;
                if (best == null || Math.abs(m - prev) < Math.abs(best - prev)) best = m;
              }
              return best == null ? prev : best;
            };
            const st = b * barLen + sg.start;
            const a = near();
            if (p.move && sg.len >= 8) {
              const h = sg.len / 2;
              push(st, { ci, inst: p.inst, n: a, len: h, v: 0.9 });
              prev = a;
              const c2 = near(a);
              push(st + h, { ci, inst: p.inst, n: c2, len: h, v: 0.8 });
              prev = c2;
            } else {
              push(st, { ci, inst: p.inst, n: a, len: sg.len, v: 0.9 });
              prev = a;
            }
          });
        }
      } else if (p.role === 'answer') {
        // 主旋律停下來（長音或休止）的空檔，換另一個樂器回一句
        // 依空檔長度挑回應的句型：6 格以上三到四個音，4～5 格兩個音
        const SH6 = [
          { at: [0, 2, 4], len: [2, 2, 3], dir: -1 },
          { at: [0, 1, 2, 4], len: [1, 1, 2, 3], dir: 1 },
          { at: [0, 3], len: [3, 3], dir: 1 },
        ];
        const SH4 = [{ at: [0, 2], len: [2, 3], dir: -1 }, { at: [0, 1], len: [1, 3], dir: 1 }];
        let busy = -1;
        const center = p.c || 76;
        for (let b = 0; b < nb; b++) {
          if (!on[b]) continue;
          for (let pos = 2; pos < barLen; pos += 2) {
            const st = b * barLen + pos;
            if (st < busy || leadOn[st - 1] || leadOn[st]) continue;
            let w = 0;
            while (w < 8 && st + w < steps && !leadOn[st + w]) w++;
            if (w < 4) continue;
            const sh = w >= 6 ? SH6[b % SH6.length] : SH4[b % SH4.length];
            let prevN = null;
            sh.at.forEach((o, i) => {
              const ch = chordAt(C, st + o).ch;
              const tones = ext(ch, center - 10, 8);
              let idx = 0;
              const tgt = prevN == null ? center + (sh.dir > 0 ? -3 : 3) : prevN;
              tones.forEach((m, j) => { if (Math.abs(m - tgt) < Math.abs(tones[idx] - tgt)) idx = j; });
              if (prevN != null) idx = Math.max(0, Math.min(tones.length - 1, idx + (tones[idx] === prevN ? sh.dir : 0)));
              prevN = tones[idx];
              push(st + o, { ci, inst: p.inst, n: prevN, len: sh.len[i], v: i === 0 ? 0.9 : 0.8 });
            });
            busy = (b + 1) * barLen; // 一小節最多回一次
            break;
          }
        }
      } else throw new Error('unknown role ' + p.role);
    });
    s._c = C;
    return C;
  }

  function chordAt(C, step) {
    const bar = Math.floor(step / C.barLen) % C.nb;
    const pos = step % C.barLen;
    const segs = C.segs[bar];
    let i = 0;
    while (i < segs.length - 1 && pos >= segs[i + 1].start) i++;
    const sg = segs[i];
    const nx = i < segs.length - 1 ? segs[i + 1] : C.segs[bar + 1 < C.nb ? bar + 1 : C.loopBar][0];
    return { ch: sg.ch, start: pos === sg.start, len: sg.len, off: pos - sg.start, next: nx.ch };
  }

  // ─────────────────────────── 播放器 ───────────────────────────
  const MAX_LIVE = 200;
  const ctx = () => M._ctx || G.audio.ctx;

  const M = (G.music = {
    enabled: true,
    volume: 0.85,
    out: null,
    bus: null,
    track: null,
    want: null,
    timer: null,
    live: 0,
    peakLive: 0,

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

    // 殘響脈衝：兩聲道去相關的雜訊，前 80ms 有幾個早期反射，尾巴越後面越暗
    makeVerb(c) {
      const sr = c.sampleRate;
      const len = Math.floor(sr * 2.4);
      const buf = c.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const x = i / len;
          const k = 0.75 - 0.6 * x; // 越後面低通越重
          lp += k * ((Math.random() * 2 - 1) - lp);
          d[i] = lp * Math.pow(1 - x, 2.6) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
        }
        [0.013, 0.021, 0.034, 0.047, 0.061].forEach((s, j) => {
          const at = Math.floor(sr * (s + ch * 0.004));
          d[at] += (j % 2 ? -1 : 1) * (0.5 - j * 0.07);
        });
      }
      const cv = c.createConvolver();
      cv.buffer = buf;
      return cv;
    },

    // 混音匯流排：out → 壓縮 → dest；另外有殘響與乒乓回聲兩個 send
    makeBus(c, dest) {
      const b = {};
      b.out = c.createGain();
      b.out.gain.value = this.enabled ? this.volume : 0;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 8;
      comp.ratio.value = 3;
      comp.attack.value = 0.01;
      comp.release.value = 0.2;
      b.out.connect(comp);
      comp.connect(dest);
      b.verbIn = c.createGain();
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 220;
      const verb = this.makeVerb(c);
      const vret = c.createGain();
      vret.gain.value = 0.9;
      b.verbIn.connect(hp);
      hp.connect(verb);
      verb.connect(vret);
      vret.connect(b.out);
      // 乒乓回聲（附點八分），回授路徑有低通，越回越暗
      b.echoIn = c.createGain();
      const eh = c.createBiquadFilter();
      eh.type = 'highpass';
      eh.frequency.value = 400;
      b.dL = c.createDelay(2);
      b.dR = c.createDelay(2);
      const fb = c.createGain();
      fb.gain.value = 0.32;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2800;
      const merge = c.createChannelMerger(2);
      const eret = c.createGain();
      eret.gain.value = 0.5;
      b.echoIn.connect(eh);
      eh.connect(b.dL);
      b.dL.connect(merge, 0, 0);
      b.dL.connect(b.dR);
      b.dR.connect(merge, 0, 1);
      b.dR.connect(lp);
      lp.connect(fb);
      fb.connect(b.dL);
      merge.connect(eret);
      eret.connect(b.out);
      eret.connect(b.verbIn);
      return b;
    },

    onUnlock() {
      const c = G.audio.ctx;
      if (!c || this.out) return;
      this.bus = this.makeBus(c, G.audio.master);
      this.out = this.bus.out;
      this.timer = setInterval(() => this.tick(), 30);
      if (document.addEventListener) {
        document.addEventListener('visibilitychange', () => {
          if (!G.audio.ctx) return;
          if (document.hidden) G.audio.ctx.suspend();
          else G.audio.ctx.resume();
        });
      }
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
      this.track = this.newTrack(id, this.bus, c.currentTime + 0.25, 1.2);
    },

    // 一首曲子的混音台：每個聲部一個 channel（音量、聲像、殘響/回聲 send），最後統一經過推桿做淡入淡出
    newTrack(id, bus, t0, fadeIn, opt) {
      const c = ctx();
      const song = SONGS[id];
      const C = compile(song);
      const mk = (to) => {
        const g = c.createGain();
        if (fadeIn) {
          g.gain.setValueAtTime(0.0001, c.currentTime);
          g.gain.exponentialRampToValueAtTime(1, c.currentTime + fadeIn);
        }
        g.connect(to);
        return g;
      };
      const fader = mk(bus.out);
      const vF = mk(bus.verbIn);
      const eF = mk(bus.echoIn);
      const trim = (song.gain || 1) * 0.95;
      const ch = C.chans.map((cf, i) => {
        const inp = c.createGain();
        inp.gain.value = opt && opt.solo != null && opt.solo !== i ? 0 : cf.vol * trim;
        let node = inp;
        if (cf.pan && c.createStereoPanner) {
          const p = c.createStereoPanner();
          p.pan.value = cf.pan;
          inp.connect(p);
          node = p;
        }
        node.connect(fader);
        if (cf.rv > 0) {
          const s = c.createGain();
          s.gain.value = cf.rv;
          node.connect(s);
          s.connect(vF);
        }
        if (cf.dl > 0) {
          const s = c.createGain();
          s.gain.value = cf.dl;
          node.connect(s);
          s.connect(eF);
        }
        return inp;
      });
      const echo = Math.min(1.5, (3 * 15) / song.bpm);
      bus.dL.delayTime.setValueAtTime(echo, c.currentTime);
      bus.dR.delayTime.setValueAtTime(echo, c.currentTime);
      return { id, song, c: C, faders: [fader, vF, eF], ch, step: 0, next: t0 };
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
      tr.faders.forEach((f) => {
        const g = f.gain;
        g.cancelScheduledValues(c.currentTime);
        g.setValueAtTime(Math.max(0.0001, g.value), c.currentTime);
        g.exponentialRampToValueAtTime(0.0001, c.currentTime + sec);
      });
      setTimeout(() => tr.faders.forEach((f) => f.disconnect()), (sec + 1.5) * 1000);
    },

    tick() {
      const tr = this.track;
      const c = G.audio.ctx;
      if (!tr || !c || c.state !== 'running') return;
      if (tr.next < c.currentTime - 0.3) tr.next = c.currentTime + 0.05;
      this.scheduleUntil(tr, c.currentTime + 0.2);
    },

    scheduleUntil(tr, until) {
      const dt = 15 / tr.song.bpm;
      while (tr.next < until) {
        this.scheduleStep(tr, tr.step, tr.next, dt);
        tr.step++;
        if (tr.step >= tr.c.steps) tr.step = tr.c.loop;
        tr.next += dt;
      }
    },

    // 離線算出一段音樂（測試用）：c 是 OfflineAudioContext
    // opt.bar：從第幾小節開始；opt.solo：只開第幾個 channel
    renderOffline(c, id, sec, dest, opt) {
      const keep = [this._ctx, this._nbuf];
      this._ctx = c;
      const nb = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this._nbuf = nb;
      try {
        const bus = this.makeBus(c, dest || c.destination);
        bus.out.gain.value = this.volume;
        const tr = this.newTrack(id, bus, 0.05, 0, opt);
        if (opt && opt.bar) tr.step = opt.bar * tr.c.barLen;
        this.scheduleUntil(tr, sec);
      } finally {
        this._ctx = keep[0];
        this._nbuf = keep[1];
      }
    },

    scheduleStep(tr, step, t, dt) {
      const s = tr.song;
      const C = tr.c;
      const bar = Math.floor(step / C.barLen);
      const pos = step % C.barLen;
      const sw = (s.swing || 0) * [0, 0.5, 1, 0.5][pos % 4] + (pos % 2 ? s.swing16 || 0 : 0);
      const tt = t + sw * dt;
      const cur = chordAt(C, step);
      const busy = !this._ctx && this.live > MAX_LIVE;
      try {
        const ev = C.ev[step];
        if (ev) ev.forEach((e) => INST[e.inst](tr.ch[e.ci], hz(e.n), tt, e.len * dt, e.v));
        for (let i = 0; i < C.rt.length; i++) {
          const p = C.rt[i];
          if (!p.on[bar]) continue;
          if (busy && p.role !== 'bass' && p.role !== 'drums' && p.role !== 'pad') continue;
          RT[p.role](tr.ch[p.ci], p, C, cur, bar, pos, tt, dt, busy);
        }
      } catch (e) { /* 音樂出錯不影響遊戲 */ }
    },

    // ── 發聲的小工具 ──
    // o.a 起音、o.r 釋放、o.decay 自然衰減（撥弦、打擊）、o.lp 低通（可掃頻）、o.pan 聲像、o.detune 微走音
    voice(dest, type, f, t, dur, vol, o) {
      o = o || {};
      const c = ctx();
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t);
      if (o.detune) osc.detune.value = o.detune;
      const a = o.a || 0.01;
      const rel = o.r || 0.1;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + a);
      let end;
      if (o.decay) {
        g.gain.exponentialRampToValueAtTime(0.0001, t + o.decay);
        end = t + o.decay;
      } else {
        const h = Math.max(a, dur);
        g.gain.setValueAtTime(vol, t + h);
        g.gain.exponentialRampToValueAtTime(0.0001, t + h + rel);
        end = t + h + rel;
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
      osc.start(t);
      osc.stop(end + 0.03);
      if (!M._ctx) {
        M.live++;
        if (M.live > M.peakLive) M.peakLive = M.live;
        osc.onended = () => { M.live--; };
      }
      return osc;
    },

    noise(dest, t, dur, vol, freq, type, q, pan) {
      const c = ctx();
      const s = c.createBufferSource();
      s.buffer = M._nbuf || G.audio.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      if (q) f.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f);
      f.connect(g);
      if (pan && c.createStereoPanner) {
        const p = c.createStereoPanner();
        p.pan.value = pan;
        g.connect(p);
        p.connect(dest);
      } else g.connect(dest);
      s.start(t, Math.random() * 0.5);
      s.stop(t + dur + 0.02);
    },
  });

  function vibrato(osc, f, t, dur, depth, rate) {
    if (dur < 0.3) return;
    const c = ctx();
    const l = c.createOscillator();
    const g = c.createGain();
    l.frequency.value = rate || 5.2;
    g.gain.setValueAtTime(0, t);
    g.gain.setValueAtTime(0, t + 0.15);
    g.gain.linearRampToValueAtTime(f * (depth || 0.008), t + Math.min(dur, 0.55));
    l.connect(g);
    g.connect(osc.frequency);
    l.start(t);
    l.stop(t + dur + 0.3);
  }
  // 起音從下方滑上來（竹笛、二胡）
  function scoop(osc, f, t, amt, time) {
    osc.frequency.setValueAtTime(f * amt, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + time);
  }
  // FM 合成（電鋼琴、鐘）
  function fm(d, f, t, dur, vol, ratio, index, decay, pan) {
    const c = ctx();
    const car = c.createOscillator();
    const mod = c.createOscillator();
    const mg = c.createGain();
    const g = c.createGain();
    car.frequency.value = f;
    mod.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(f * index * 0.08 + 0.01, t + decay * 0.6);
    mod.connect(mg);
    mg.connect(car.frequency);
    car.connect(g);
    const end = t + Math.max(decay, Math.min(dur + 0.15, decay * 2));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(vol * 0.35, t + decay * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(d);
    } else g.connect(d);
    car.start(t);
    mod.start(t);
    car.stop(end + 0.03);
    mod.stop(end + 0.03);
    if (!M._ctx) {
      M.live += 2;
      car.onended = () => { M.live -= 2; };
    }
  }

  // ─────────────────────────── 音色 ───────────────────────────
  // 每個樂器：(dest, 頻率, 開始時間, 長度秒, 力度)
  const INST = {
    // 長笛：正弦＋少量三角波，氣音起音，長音有抖音
    flute(d, f, t, dur, k) {
      k = k || 1;
      const o = M.voice(d, 'sine', f, t, dur * 0.92, 0.13 * k, { a: 0.03, r: 0.12 });
      vibrato(o, f, t, dur);
      M.voice(d, 'triangle', f, t, dur * 0.92, 0.04 * k, { a: 0.03, r: 0.1, lp: 3000 });
      M.noise(d, t, 0.06, 0.022 * k, Math.min(f * 2, 9000), 'bandpass', 2);
    },
    // 陶笛：溫暖圓潤，田園小村用
    ocarina(d, f, t, dur, k) {
      k = k || 1;
      const o = M.voice(d, 'sine', f, t, dur * 0.9, 0.15 * k, { a: 0.025, r: 0.1 });
      vibrato(o, f, t, dur, 0.006, 5.5);
      M.voice(d, 'triangle', f * 2, t, dur * 0.9, 0.012 * k, { a: 0.03, r: 0.08 });
      M.noise(d, t, 0.05, 0.018 * k, Math.min(f * 3, 9000), 'bandpass', 3);
    },
    // 竹笛：起音從下面滑上來，氣音多一點，抖音深
    bamboo(d, f, t, dur, k) {
      k = k || 1;
      const o = M.voice(d, 'sine', f, t, dur * 0.9, 0.13 * k, { a: 0.03, r: 0.14 });
      scoop(o, f, t, 0.955, 0.08);
      vibrato(o, f, t, dur, 0.012, 5.8);
      M.voice(d, 'triangle', f, t, dur * 0.9, 0.035 * k, { a: 0.03, r: 0.1, lp: 2400 });
      M.noise(d, t, Math.min(0.14, dur), 0.035 * k, Math.min(f * 2, 9000), 'bandpass', 1.5);
    },
    clarinet(d, f, t, dur, k) {
      k = k || 1;
      const o = M.voice(d, 'square', f, t, dur * 0.92, 0.04 * k, { a: 0.03, r: 0.1, lp: 1500 });
      vibrato(o, f, t, dur, 0.004);
      M.voice(d, 'sine', f, t, dur * 0.92, 0.07 * k, { a: 0.03, r: 0.1 });
    },
    // 手風琴：兩支微走音的簧片，溫暖的港口味
    accordion(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'square', f, t, dur * 0.93, 0.045 * k, { a: 0.035, r: 0.1, lp: 2000, detune: -9, pan: -0.15 });
      M.voice(d, 'sawtooth', f, t, dur * 0.93, 0.045 * k, { a: 0.035, r: 0.1, lp: 2300, detune: 9, pan: 0.15 });
      M.voice(d, 'triangle', f, t, dur * 0.93, 0.09 * k, { a: 0.035, r: 0.1 });
    },
    // 小提琴（主旋律）：兩支鋸齒波、柔和起音、抖音
    violin(d, f, t, dur, k) {
      k = k || 1;
      const o1 = M.voice(d, 'sawtooth', f, t, dur * 0.95, 0.055 * k, { a: 0.06, r: 0.18, lp: 3000, detune: -5 });
      const o2 = M.voice(d, 'sawtooth', f, t, dur * 0.95, 0.05 * k, { a: 0.07, r: 0.18, lp: 2800, detune: 6 });
      vibrato(o1, f, t, dur, 0.006, 5.6);
      vibrato(o2, f, t, dur, 0.006, 5.1);
      M.voice(d, 'sine', f, t, dur * 0.95, 0.075 * k, { a: 0.05, r: 0.15 });
    },
    // 二胡：單弦、滑音進來、抖音深
    erhu(d, f, t, dur, k) {
      k = k || 1;
      const o = M.voice(d, 'sawtooth', f, t, dur * 0.95, 0.055 * k, { a: 0.05, r: 0.18, lp: 2200, q: 1.5 });
      scoop(o, f, t, 0.97, 0.12);
      vibrato(o, f, t, dur, 0.011, 5.5);
      const o2 = M.voice(d, 'sine', f, t, dur * 0.95, 0.06 * k, { a: 0.05, r: 0.15 });
      scoop(o2, f, t, 0.97, 0.12);
    },
    // 法國號：暗、圓、慢起音（對位與導音線）
    horn(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sawtooth', f, t, dur * 0.95, 0.05 * k, { a: 0.07, r: 0.18, lp: 500, lpTo: 1100, lpT: 0.2 });
      M.voice(d, 'sine', f, t, dur * 0.95, 0.07 * k, { a: 0.06, r: 0.18 });
    },
    // 小號：亮，濾波器快速打開
    trumpet(d, f, t, dur, k) {
      k = k || 1;
      const o = M.voice(d, 'sawtooth', f, t, dur * 0.9, 0.055 * k, { a: 0.02, r: 0.1, lp: 800, lpTo: 3200, lpT: 0.06 });
      vibrato(o, f, t, dur, 0.005);
      M.voice(d, 'square', f, t, dur * 0.9, 0.018 * k, { a: 0.02, r: 0.1, lp: 2000 });
      M.voice(d, 'sine', f, t, dur * 0.9, 0.04 * k, { a: 0.02, r: 0.1 });
    },
    // 銅管齊奏（Boss 主旋律、重音）
    brass(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sawtooth', f, t, dur * 0.9, 0.07 * k, { a: 0.025, r: 0.1, lp: 700, lpTo: 2800, lpT: 0.1 });
      M.voice(d, 'sine', f, t, dur * 0.9, 0.06 * k, { a: 0.025, r: 0.1 });
      M.voice(d, 'sawtooth', f, t, dur * 0.9, 0.055 * k, { a: 0.025, r: 0.1, lp: 600, lpTo: 2400, lpT: 0.1, detune: 10 });
      M.voice(d, 'square', f / 2, t, dur * 0.9, 0.02 * k, { a: 0.03, r: 0.1, lp: 900 });
    },
    // 弦樂齊奏的長音（導音線）
    strlead(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sawtooth', f, t, dur, 0.025 * k, { a: 0.18, r: 0.35, lp: 1700, detune: -7, pan: -0.3 });
      M.voice(d, 'sawtooth', f, t, dur, 0.025 * k, { a: 0.2, r: 0.35, lp: 1700, detune: 7, pan: 0.3 });
    },
    // 弦樂急奏（Boss）
    ostinato(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sawtooth', f, t, Math.min(dur, 0.09), 0.05 * k, { a: 0.005, r: 0.04, lp: 1600 });
    },
    celesta(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sine', f, t, 0, 0.12 * k, { a: 0.003, decay: Math.max(0.8, dur * 1.2) });
      M.voice(d, 'sine', f * 2, t, 0, 0.035 * k, { a: 0.003, decay: 0.45 });
    },
    // 鐵琴：高一個八度，清脆
    glock(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sine', f * 2, t, 0, 0.06 * k, { a: 0.002, decay: 0.8 });
      M.voice(d, 'sine', f * 2 * 3.99, t, 0, 0.01 * k, { a: 0.002, decay: 0.2 });
    },
    // 音樂盒：細、長、帶一點不協和泛音
    musicbox(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sine', f, t, 0, 0.1 * k, { a: 0.002, decay: 1.3 });
      M.voice(d, 'sine', f * 4.2, t, 0, 0.012 * k, { a: 0.002, decay: 0.15 });
    },
    // 馬林巴：木頭的溫暖敲擊
    marimba(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sine', f, t, 0, 0.13 * k, { a: 0.003, decay: 0.45 });
      M.voice(d, 'sine', f * 4, t, 0, 0.025 * k, { a: 0.002, decay: 0.07 });
    },
    // 木琴：高、短
    xylo(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sine', f * 2, t, 0, 0.09 * k, { a: 0.002, decay: 0.28 });
      M.voice(d, 'triangle', f * 6, t, 0, 0.015 * k, { a: 0.002, decay: 0.05 });
    },
    harp(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'triangle', f, t, 0, 0.06 * k, { a: 0.004, decay: 1.1 });
      M.voice(d, 'sine', f * 2, t, 0, 0.012 * k, { a: 0.004, decay: 0.4 });
    },
    pizz(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'triangle', f, t, 0, 0.09 * k, { a: 0.003, decay: 0.22, lp: 1600 });
      M.voice(d, 'sawtooth', f, t, 0, 0.025 * k, { a: 0.003, decay: 0.14, lp: 1000 });
    },
    // 烏克麗麗／木吉他：濾波器從亮到暗的撥弦
    uke(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sawtooth', f, t, 0, 0.035 * k, { a: 0.002, decay: 0.32, lp: f * 8, lpTo: f * 1.5, lpT: 0.12 });
      M.voice(d, 'triangle', f, t, 0, 0.04 * k, { a: 0.002, decay: 0.3 });
    },
    guitar(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'triangle', f, t, 0, 0.06 * k, { a: 0.002, decay: 0.8 });
      M.voice(d, 'sawtooth', f, t, 0, 0.025 * k, { a: 0.002, decay: 0.5, lp: f * 5, lpTo: f * 1.3, lpT: 0.2 });
    },
    // 古箏：亮起音、長一點的餘韻
    koto(d, f, t, dur, k) {
      k = k || 1;
      const o = M.voice(d, 'triangle', f, t, 0, 0.07 * k, { a: 0.002, decay: 1.0 });
      scoop(o, f, t, 1.012, 0.05);
      M.voice(d, 'sawtooth', f, t, 0, 0.025 * k, { a: 0.002, decay: 0.45, lp: f * 6, lpTo: f * 1.8, lpT: 0.15 });
    },
    // 三味線式的撥弦 riff（峽谷）
    pluck(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'square', f, t, 0, 0.05 * k, { a: 0.002, decay: 0.22, lp: f * 7, lpTo: f * 2, lpT: 0.06 });
      M.voice(d, 'triangle', f, t, 0, 0.07 * k, { a: 0.002, decay: 0.26 });
    },
    // 鋼鼓：海邊的陽光感
    steel(d, f, t, dur, k) {
      k = k || 1;
      const o = M.voice(d, 'sine', f, t, 0, 0.19 * k, { a: 0.003, decay: Math.max(0.6, Math.min(dur + 0.3, 1.2)) });
      scoop(o, f, t, 0.99, 0.03);
      M.voice(d, 'sine', f * 2, t, 0, 0.07 * k, { a: 0.003, decay: 0.35 });
      M.voice(d, 'sine', f * 3.02, t, 0, 0.018 * k, { a: 0.002, decay: 0.12 });
    },
    // 電鋼琴（FM）
    ep(d, f, t, dur, k) {
      fm(d, f, t, dur, 0.06 * (k || 1), 1, 1.3, 0.9);
    },
    // 低音
    pbass(d, f, t, dur, k) {
      k = k || 1;
      const dec = Math.min(dur + 0.12, 0.7);
      M.voice(d, 'triangle', f, t, 0, 0.2 * k, { a: 0.004, decay: dec, lp: 900 });
      M.voice(d, 'sawtooth', f, t, 0, 0.04 * k, { a: 0.004, decay: dec * 0.7, lp: 600, lpTo: 250, lpT: 0.15 });
    },
    upright(d, f, t, dur, k) {
      k = k || 1;
      const dec = Math.min(dur + 0.2, 0.9);
      M.voice(d, 'sine', f, t, 0, 0.2 * k, { a: 0.006, decay: dec });
      M.voice(d, 'triangle', f, t, 0, 0.08 * k, { a: 0.004, decay: dec * 0.6, lp: 700 });
    },
    synbass(d, f, t, dur, k) {
      k = k || 1;
      M.voice(d, 'sawtooth', f, t, dur * 0.85, 0.06 * k, { a: 0.004, r: 0.04, lp: 700, lpTo: 300, lpT: 0.1 });
      M.voice(d, 'sine', f, t, dur * 0.85, 0.13 * k, { a: 0.004, r: 0.04 });
    },
  };

  // 和弦鋪底：一次拿到整個和弦
  const PADS = {
    // 弦樂：每個音兩支微走音鋸齒波，左右分開
    strings(d, notes, t, dur, k) {
      notes.forEach((n, i) => {
        const f = hz(n);
        const pan = i % 2 ? 0.4 : -0.4;
        M.voice(d, 'sawtooth', f, t, dur, 0.014 * k, { a: 0.3, r: 0.45, lp: 1300, detune: -7, pan });
        M.voice(d, 'sawtooth', f, t, dur, 0.014 * k, { a: 0.35, r: 0.45, lp: 1300, detune: 7, pan: -pan });
      });
    },
    // 合唱：鋸齒波過一個「啊」的共振峰
    choir(d, notes, t, dur, k) {
      const c = ctx();
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 850;
      bp.Q.value = 1.2;
      const bp2 = c.createBiquadFilter();
      bp2.type = 'peaking';
      bp2.frequency.value = 1250;
      bp2.gain.value = 6;
      bp.connect(bp2);
      bp2.connect(d);
      notes.forEach((n, i) => {
        const f = hz(n);
        const o = M.voice(bp, 'sawtooth', f, t, dur, 0.05 * k, { a: 0.4, r: 0.5, detune: i % 2 ? 6 : -6, pan: i % 2 ? 0.3 : -0.3 });
        vibrato(o, f, t, dur, 0.004, 4.6);
      });
    },
    // 溫暖的柔和鋪底（三角波＋高八度正弦）
    warm(d, notes, t, dur, k) {
      notes.forEach((n, i) => {
        const f = hz(n);
        M.voice(d, 'triangle', f, t, dur, 0.035 * k, { a: 0.2, r: 0.4, pan: i % 2 ? 0.3 : -0.3 });
        M.voice(d, 'sine', f * 2, t, dur, 0.008 * k, { a: 0.3, r: 0.4 });
      });
    },
    // 簧風琴（港口的手風琴和弦）
    organ(d, notes, t, dur, k) {
      notes.forEach((n, i) => {
        const f = hz(n);
        M.voice(d, 'square', f, t, dur * 0.97, 0.012 * k, { a: 0.08, r: 0.2, lp: 1400, detune: i % 2 ? 8 : -8, pan: i % 2 ? 0.3 : -0.3 });
        M.voice(d, 'triangle', f, t, dur * 0.97, 0.022 * k, { a: 0.08, r: 0.2 });
      });
    },
  };

  const DRUM = {
    k(d, t, v) {
      const o = M.voice(d, 'sine', 120, t, 0, 0.3 * v, { a: 0.002, decay: 0.2 });
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    },
    s(d, t, v) {
      M.noise(d, t, 0.13, 0.08 * v, 2200, 'bandpass', 0.8);
      M.voice(d, 'triangle', 190, t, 0, 0.06 * v, { a: 0.001, decay: 0.07 });
    },
    b(d, t, v) { M.noise(d, t, 0.2, 0.06 * v, 2800, 'bandpass', 0.6); },
    c(d, t, v) {
      [0, 0.011, 0.022].forEach((o, i) => M.noise(d, t + o, i === 2 ? 0.14 : 0.02, 0.07 * v, 1400, 'bandpass', 1.2));
    },
    h(d, t, v) { M.noise(d, t, 0.035, 0.03 * v, 8000, 'highpass', 0, 0.3); },
    o(d, t, v) { M.noise(d, t, 0.25, 0.028 * v, 7500, 'highpass', 0, 0.3); },
    S(d, t, v) { M.noise(d, t, 0.05, 0.03 * v, 6500, 'bandpass', 1.5, -0.35); },
    t(d, t, v) {
      M.noise(d, t, 0.1, 0.03 * v, 9000, 'bandpass', 3, 0.4);
      M.noise(d, t + 0.015, 0.07, 0.018 * v, 11000, 'bandpass', 3, 0.4);
    },
    r(d, t, v) {
      M.noise(d, t, 0.03, 0.05 * v, 1800, 'bandpass', 4, -0.15);
      M.voice(d, 'square', 820, t, 0, 0.018 * v, { a: 0.001, decay: 0.035, pan: -0.15 });
    },
    w(d, t, v) { M.voice(d, 'sine', 1150, t, 0, 0.07 * v, { a: 0.001, decay: 0.06, pan: 0.25 }); },
    n(d, t, v) {
      M.voice(d, 'sine', 2950, t, 0, 0.022 * v, { a: 0.001, decay: 0.9, pan: 0.35 });
      M.voice(d, 'sine', 4130, t, 0, 0.01 * v, { a: 0.001, decay: 0.6, pan: 0.35 });
    },
    q(d, t, v) {
      const o = M.voice(d, 'sine', 360, t, 0, 0.1 * v, { a: 0.002, decay: 0.16, pan: -0.25 });
      o.frequency.exponentialRampToValueAtTime(320, t + 0.1);
    },
    Q(d, t, v) {
      const o = M.voice(d, 'sine', 230, t, 0, 0.12 * v, { a: 0.002, decay: 0.22, pan: -0.25 });
      o.frequency.exponentialRampToValueAtTime(200, t + 0.15);
    },
    // 太鼓：低沉的大鼓
    T(d, t, v) {
      const o = M.voice(d, 'sine', 80, t, 0, 0.36 * v, { a: 0.003, decay: 0.55 });
      o.frequency.exponentialRampToValueAtTime(44, t + 0.35);
      M.noise(d, t, 0.14, 0.09 * v, 350, 'lowpass');
    },
    // 締太鼓：高、乾、短
    J(d, t, v) {
      const o = M.voice(d, 'triangle', 420, t, 0, 0.07 * v, { a: 0.001, decay: 0.08, pan: 0.2 });
      o.frequency.exponentialRampToValueAtTime(330, t + 0.06);
      M.noise(d, t, 0.03, 0.05 * v, 2500, 'bandpass', 2, 0.2);
    },
    m(d, t, v, root) {
      const f = hz(36 + ((root || 0) + 12 - 5) % 12 + 5);
      const o = M.voice(d, 'sine', f * 1.02, t, 0, 0.26 * v, { a: 0.003, decay: 0.7 });
      o.frequency.exponentialRampToValueAtTime(f, t + 0.2);
      M.noise(d, t, 0.08, 0.04 * v, 400, 'lowpass');
    },
    L(d, t, v) { tom(d, t, v, 95, -0.3); },
    M(d, t, v) { tom(d, t, v, 135, 0); },
    H(d, t, v) { tom(d, t, v, 185, 0.3); },
    C(d, t, v) { M.noise(d, t, 1.3, 0.04 * v, 5500, 'highpass', 0, 0.15); },
  };
  function tom(d, t, v, f, pan) {
    const o = M.voice(d, 'sine', f, t, 0, 0.2 * v, { a: 0.002, decay: 0.3, pan });
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.25);
    M.noise(d, t, 0.05, 0.03 * v, 1200, 'bandpass', 1, pan);
  }

  // 依和弦即時演奏的聲部
  const RT = {
    pad(d, p, C, cur, bar, pos, t, dt) {
      if (!cur.start) return;
      PADS[p.inst](d, voicing(cur.ch, p.center || 62, p.n || 4), t, cur.len * dt, 1);
    },
    comp(d, p, C, cur, bar, pos, t, dt) {
      const ch = p.pat[(bar * C.barLen + pos) % p.pat.length];
      if (!VEL[ch]) return;
      const notes = voicing(cur.ch, p.center || 64, p.n || 3);
      const up = ch === 'o' || ch === '-';
      const st = p.strum || 0;
      notes.forEach((n, i) => {
        const j = up ? notes.length - 1 - i : i;
        INST[p.inst](d, hz(n), t + j * st, (p.len || 2) * dt, VEL[ch] * (up ? 0.85 : 1));
      });
    },
    arp(d, p, C, cur, bar, pos, t, dt) {
      const rate = p.rate || 2;
      if (pos % rate) return;
      let v = pos % 4 === 0 ? 1 : 0.75;
      if (p.pat) {
        const ch = p.pat[pos % p.pat.length];
        if (!VEL[ch]) return;
        v *= VEL[ch];
      }
      const tones = ext(cur.ch, p.lo || 60, 10);
      const n = tones[p.seq[((pos / rate) | 0) % p.seq.length] % tones.length];
      INST[p.inst](d, hz(n), t, (p.len || rate) * dt, v);
    },
    bass(d, p, C, cur, bar, pos, t, dt) {
      const pat = p.pat;
      const L = pat.length;
      const i0 = (bar * C.barLen + pos) % L;
      const c = pat[i0];
      if (c === '.') return;
      let len = 1;
      while (len < L && pat[(i0 + len) % L] === '.') len++;
      const ch = cur.ch;
      const root = cur.start || c !== 'R' ? ch.bass : ch.root;
      const base = 40 + ((root - 4 + 12) % 12); // E2..Eb3
      const deg = (want, fb) => {
        const i = ch.iv.find((x) => want.includes(x % 12));
        return i == null ? fb : i % 12;
      };
      let n;
      if (c === 'R') n = base;
      else if (c === '8') n = base + 12;
      else if (c === '5') n = 40 + ((ch.root - 4 + 12) % 12) + deg([7, 6, 8], 7);
      else if (c === '3') n = 40 + ((ch.root - 4 + 12) % 12) + deg([3, 4, 5, 2], 7);
      else if (c === '6') n = base + 9;
      else if (c === '7') n = 40 + ((ch.root - 4 + 12) % 12) + deg([10, 11, 9], 12);
      else if (c === 'A') {
        // 往下一個和弦根音的半音經過音
        const nx = C.chordAt(bar * C.barLen + pos + len).ch;
        const tgt = 40 + ((nx.bass - 4 + 12) % 12);
        n = nx.bass === ch.bass ? base + 7 : tgt + (tgt > base ? -1 : 1);
      } else return;
      INST[p.inst](d, hz(n), t, len * dt * 0.9, (pos % 4 === 0 ? 1 : 0.85) * (p.v || 1));
    },
    drums(d, p, C, cur, bar, pos, t, dt, busy) {
      const L = p.fillLen || 4;
      const step = bar * C.barLen + pos;
      if (p.crash && pos === 0 && C.secStart[bar] && bar !== 0) DRUM[p.crash](d, t, 1);
      if (p.fill && C.secEnd[bar] && pos >= C.barLen - L) {
        const F = FILLS[p.fill];
        const i = F.length - (C.barLen - pos);
        const v = 0.6 + 0.5 * ((pos - (C.barLen - L)) / L);
        for (const ch of F[i] || '') DRUM[ch](d, t, v, cur.ch.root);
        return;
      }
      for (const k in KITS[p.kit]) {
        const pat = KITS[p.kit][k];
        const v = VEL[pat[step % pat.length]];
        if (!v) continue;
        if (busy && (k === 'S' || k === 'h' || k === 't')) continue;
        DRUM[k](d, t, v, cur.ch.root);
      }
    },
    // 段落交界的豎琴刮奏：最後一拍八個音往上
    gliss(d, p, C, cur, bar, pos, t, dt) {
      if (!C.secEnd[bar] || pos !== C.barLen - 4) return;
      const tones = ext(cur.ch, p.lo || 67, 8);
      tones.forEach((n, i) => INST[p.inst](d, hz(n), t + (i * dt) / 2, dt, 0.45 + i * 0.07));
    },
  };

  M.SONGS = SONGS;
  M.KITS = KITS;
  M.INST = INST;
  M.compile = compile;
  M.loadPrefs();
})();
