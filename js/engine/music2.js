// 背景音樂 第二批：標題、第一～三章營地（第二次重寫）、第一章森林、第二章海岸重寫；第四章雪原與霜鈴村、第五章神殿與神殿前庭；
// 每個章節 Boss 各一首（時間有兩個階段）、野外魔王、結局「時鐘重新開始轉」的動機。
// 記譜與引擎見 music.js 開頭；規格見 DESIGN.md §17。旋律全部原創。
// 小節長度 barLen：16 = 4/4、12 = 3/4 或 6/8、14 = 7/8、20 = 5/4（以十六分音符為單位）。
// layer: 'combat' 附近有怪盯上或剛被打時淡入；'p2' 章節 Boss 第二階段；'calm' 戰鬥時變小。
// vary: 每循環一輪換一組變奏；aged: 土地變老時的編制（lp 低通、drop 拿掉的聲部、wow 走音音分、slow 慢多少）。
(function () {
  'use strict';
  const M = G.music;
  const dots = (n) => '.'.repeat(n);

  Object.assign(M.KITS, {
    // 標題：開頭只有時鐘，A～B 很輕的滴答與定音鼓，C 段整個打開
    titleTick: { K: 'x...o...o...', N: 'x' + dots(23) },
    titleSoft: { K: 'o...-...-...', m: 'x' + dots(23) },
    titleBig: { m: 'x.......x...', k: 'x' + dots(11), s: '........o.o.', K: 'o...o...o...' },
    // 苔光營地（6/8）：沙鈴、木魚、很輕的框鼓
    fcampA: { S: 'o.-.-.o.-.-.', D: 'o.....-.....', w: '......o.....' },
    fcampB: { S: 'x.o.o.x.o.o.', D: 'x.....o.....', w: '...o.....o..', t: '......-.....' },
    // 燈塔岬：浪聲、很遠的低鼓
    harborSea: { W: 'x' + dots(63), D: 'o' + dots(31) },
    // 溫泉谷：太鼓的心跳（咚—咚）、蒸氣般的沙鈴
    spaHeart: { T: 'o.....-.........', S: '-.......-.......' },
    spaHeat: { T: 'x.....o.......-.', J: '....-.......-...', S: '-...-...-...-...' },
    // 第一章 魔法森林：木魚、三角鐵、很輕的沙鈴；戰鬥層才有大鼓小鼓
    mforIn: { n: 'x' + dots(31), w: '..o.....o..o....' },
    mforA: { D: 'o..-..o.........', w: 'o..o..o...o..o..', n: 'x' + dots(31), S: '-.o.-.o.-.o.-.o.' },
    mforB: { D: 'x..o..x...o..o..', w: 'x..x..x...x...x.', S: 'x-o-x-o-x-o-x-o-', b: '....o.......o...' },
    mforCombat: { k: 'x.....x.x.....x.', s: '....x.......x...', t: '..x...x...x...x.', L: '..............x.' },
    // 第二章 暗藍的海岸（6/8）：浪湧、低沉的踏地聲
    stormIn: { W: 'x' + dots(23) },
    stormA: { D: 'x.....o.....', S: '-.o.-.-.o.-.', W: 'x' + dots(47) },
    stormB: { D: 'x.....x.....', b: '......x.....', S: '-.o.-.-.o.-.', W: 'x' + dots(47) },
    stormC: { W: 'x' + dots(23), D: 'x' + dots(11), m: 'x' + dots(21) + 'o.' },
    stormCombat: { D: 'X.....x..x..', k: 'x.....x.....', s: '......x.....', T: 'x' + dots(23) },
    // 第四章 雪原：幾乎靜止，只有三角鐵與冰晶；戰鬥層是心跳般的框鼓
    snowA: { n: 'x' + dots(31), I: dots(24) + 'o' + dots(39) },
    snowCombat: { D: 'x.......o.......', S: '-.o.-.o.-.o.-.o.', m: 'x' + dots(31) },
    // 霜鈴村（3/4）
    villA: { n: 'x' + dots(47), b: '....-...-...' },
    villB: { b: '....o...o...', k: 'o' + dots(11), S: '-.-.o.-.-.o.', n: 'x' + dots(47) },
    // 第五章 神殿（7/8）：時鐘的滴答，分組 2+2+3
    clockA: { K: 'x.o.x.o.x.o.o.', N: 'x' + dots(27) },
    templeCombat: { m: 'x.......x.....', D: 'x...x...x.x...', r: '....o.......o.' },
    // 神殿前庭（5/4，3+2）
    clockSoft: { K: 'o...-...-...o...-...', N: 'o' + dots(39) },
    // 女王：宮廷圓舞曲（3/4）
    waltzA: { m: 'x' + dots(11), b: '....o...o...', t: '....-...-...' },
    waltzB: { m: 'x' + dots(11), s: '....x...x...', k: 'x' + dots(11), t: '....o...o...' },
    waltzP2: { s: '..o...o.x.o.', T: 'x' + dots(11), h: 'x.o.x.o.x.o.' },
    // 寄居蟹：暴風雨裡的船歌（6/8）
    shantyIn: { W: 'x' + dots(23), D: 'x.....x.....' },
    shantyA: { D: 'X.....x.....', A: '......x.....', S: 'x.o.o.x.o.o.', c: '......x.....' },
    shantyB: { D: 'X.....x..x..', k: 'x.....x.....', s: '......x.....', A: '...x.....x..', S: 'x.o.o.x.o.o.', W: 'x' + dots(95) },
    shantyC: { T: 'X.....x.....', D: 'x..x..x..x..', W: 'x' + dots(47), m: 'x.....x.....' },
    shantyP2: { T: 'x.....x.....', s: '..o..o..o.o.' },
    // 甲龜：火山的太鼓
    volcIn: { T: 'X.......x.......', J: '..x.x.x...x.x.xx' },
    volcA: { T: 'X.....x.x.......', J: '..o.x...o.x.o.xo', k: 'x.......x.......', L: '..........x..x..', s: '....x.......x...' },
    volcB: { T: 'X.....x.x...x...', J: 'x.ox-.x.x.ox-.x.', k: 'x.....x.x.......', s: '....x.......x...', m: 'x.......x.......' },
    volcC: { T: 'X..x..X.X..x..X.', J: 'x.xxx.xxx.xxx.xx', L: '..o...o...x...x.', M: '......x.......x.', G: 'x' + dots(127) },
    volcP2: { T: '..x...x...x...x.', H: 'x.x.x.x.........' },
    // 霜靈：不停的鐘與定音鼓
    frostIn: { n: 'x.......x.......', m: 'x' + dots(15) },
    frostA: { m: 'x.......x.......', k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    frostB: { m: 'x.......x.......', k: 'x.x...x.x.x...x.', s: '....x.......x.x-', h: 'x-x-x-x-x-x-x-x-', I: 'x' + dots(31) },
    frostC: { m: 'x...x...x...x...', n: 'x' + dots(15) },
    frostP2: { I: 'x.......x.......', s: '..o...o...o.o.o.', T: 'X' + dots(15) },
    // 時間：機械的滴答
    timeIn: { K: 'x.o.x.o.x.o.x.o.', N: 'x' + dots(15) },
    timeA: { K: 'x.o.x.o.x.o.x.o.', N: 'x.......x.......', m: 'x' + dots(15), k: 'x.......x.......' },
    timeB: { K: 'x.o.x.o.x.o.x.o.', N: 'x.......x.......', m: 'x.......x.......', k: 'x.....x.x.......', s: '....x.......x...' },
    // 時間第二階段（7/8）：滴答錯位、倒轉的湧聲
    shatterIn: { K: 'x..o.x.o..x.o.', Z: dots(19) + 'x' + dots(8) },
    shatterA: { K: 'x.ox.o.xo.x.o.', N: 'x......x......', m: 'x' + dots(13), k: 'x......x......', s: '....x......x..', Z: dots(19) + 'x' + dots(8) },
    shatterB: { K: 'x.ox.o.xo.x.o.', m: 'x......x......', k: 'x...x..x...x..', s: '....x......x.x', h: 'x.x.x.x.x.x.x.' },
    // 野外魔王：短、急
    fbIn: { m: 'x...x...x...x.x.', s: '..x...x...x.xxxx' },
    fbA: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x-x-x-x-x-x-x-x-', m: 'x.......x.......' },
    fbB: { k: 'x.x...x.x.x...x.', s: '....x.......x.x-', h: 'x-x-x-x-x-x-x-x-', T: 'X.......x.......' },
    // 結局：時鐘從很慢的滴答重新開始轉（5 小節）
    restartK: { K: 'x.......x.......' + 'x...x...x...x...' + 'x.o.x.o.x.o.x.o.'.repeat(3) },
  });

  M.addSongs({
    // ═══ 標題（第二批重寫）：莊嚴、帶一點惆悵。降 A 大調 3/4、80 BPM。
    // 開頭音樂盒吹出「葉子／時鐘」動機（音級 5-1-7-1-3-2；神殿主題 a1 開頭、時間的前奏都是同一個動機），
    // 大提琴唱 A、長笛與鋼琴 A'、小提琴 B，C 段整個升一個全音由銅管與合唱撐起來，最後落回降 A。
    title: {
      bpm: 80, verb: 0.55, gain: 0.9,
      barLen: 12,
      form: 'in:4 A:8 A2:8 B:8 C:8 T:2',
      P: {
        in: 'r/12 | C6/4 F6/6 Eb6/2 | F6/4 Ab6/6 G6/2 | G6/12',
        ta1: 'Eb5/4 Ab5/6 G5/2 | Ab5/4 C6/6 Bb5/2 | Ab5/8 F5/4 | F5/6 Ab5/2 C6/4',
        ta2: 'Eb6/8 C6/4 | Db6/6 C6/2 Bb5/4 | Ab5/8 Bb5/4 | G5/12',
        ta3: 'F6/6 Eb6/2 Db6/4 | Eb6/8 G5/4 | Ab5/6 F5/2 C6/4 | Bb5/6 G5/6',
        tb: 'F5/4 Ab5/4 C6/4 | Bb5/8 G5/4 | G5/4 Bb5/4 Eb6/4 | C6/8 Ab5/4 | Db6/6 C6/2 Bb5/4 | Bb5/8 G5/4 | G5/6 Ab5/6 | F5/6 G5/6',
        t: 'C6/4 Ab5/4 F5/4 | Eb5/6 G5/6',
      },
      chords:
        'Fm7 Fm7 Dbmaj7 Eb ' +
        'Ab Ab/C Fm7 Dbmaj7 Ab/C Bbm7 Eb7sus4 Eb7 ' +
        'Ab Ab/C Fm7 Dbmaj7 Bbm7 Cm7 Dbmaj7 Eb7sus4:Eb7 ' +
        'Dbmaj7 Eb/Db Cm7 Fm7 Bbm7 Eb Cm7:Fm7 Bbm7:Eb7 ' +
        'Bb Bb/D Gm7 Ebmaj7 Bb/D Cm7 F7sus4 F7 ' +
        'Dbmaj7 Eb7sus4:Eb7',
      voices: [
        { inst: 'musicbox', m: '@in', at: 'in', role: 'orn' },
        { inst: 'cello', m: '@ta1 @ta2', at: 'A', oct: -12, vol: 1.15 },
        { inst: 'flute', m: '@ta1 @ta3', at: 'A2' },
        { inst: 'piano', m: '@ta1 @ta3', at: 'A2', oct: -12, vol: 0.5, role: 'counter', pan: -0.2 },
        { inst: 'violin', m: '@tb', at: 'B' },
        { inst: 'brass', m: '@ta1^2 @ta2^2', at: 'C' },
        { inst: 'horn', m: '@ta1^2 @ta2^2', at: 'C', oct: -12, vol: 0.6, role: 'counter', pan: -0.25 },
        { inst: 'cello', m: '@t', at: 'T', oct: -12, vol: 1.1 },
      ],
      parts: [
        { role: 'pad', inst: 'frost', in: 'in', center: 64, n: 4, vol: 0.9 },
        { role: 'pad', inst: 'strings', in: 'A A2 B T', center: 60, n: 3, vol: 0.75 },
        { role: 'pad', inst: 'choir', in: 'B C', center: 62, n: 3, vol: 0.7 },
        { role: 'arp', inst: 'harp', in: 'A A2 B C T', rate: 2, seq: [0, 2, 4, 5, 4, 2], lo: 56, vol: 0.8 },
        { role: 'comp', inst: 'piano', in: 'B', pat: '....x...x...', center: 62, n: 3, vol: 0.5 },
        { role: 'arp', inst: 'celesta', in: 'A', rate: 4, seq: [4, 3, 2], lo: 76, pat: 'x...........', vol: 0.4 },
        { role: 'bass', inst: 'lowbow', in: 'A A2 B T', pat: 'R' + dots(11) },
        { role: 'bass', inst: 'upright', in: 'C', pat: 'R.......5...' },
        { role: 'drums', kit: 'titleTick', in: 'in' },
        { role: 'drums', kit: 'titleSoft', in: 'A A2 B T' },
        { role: 'drums', kit: 'titleBig', in: 'C', fill: 'tom', crash: 'C' },
        { role: 'answer', inst: 'celesta', in: 'A2', c: 81 },
        { role: 'guide', inst: 'horn', in: 'B', lo: 55, hi: 67 },
        { role: 'gliss', inst: 'harp', lo: 64 },
      ],
      vary: [{}, { swap: { cello: 'horn', flute: 'violin', violin: 'flute' } }, { swap: { brass: 'horn', horn: 'cello', harp: 'guitar' }, mute: ['drums@A'] }],
      aged: false,
    },

    // ═══ 第一章營地 苔光營地（第二批重寫）：溫暖、舒服的魔法森林民謠。F 大調 6/8、100 BPM；
    // 直笛主奏、吉他分解和弦像撥弦、輕的馬林巴、沙鈴與木魚；B 段陶笛接手。
    town: {
      bpm: 100, verb: 0.38, gain: 1.25,
      barLen: 12,
      form: 'in:2 A:8 A2:8 B:8 A3:8 T:2',
      P: {
        in: 'A5/2 C6/2 F6/2 E6/4 C6/2 | G5/2 C6/2 E6/2 G6/6',
        m1: 'C5/2 F5/2 A5/2 G5/4 F5/2 | E5/4 G5/2 C6/6 | A5/4 F5/2 D5/2 E5/2 F5/2 | D5/6 r/2 F5/2 A5/2',
        m2: 'C6/4 A5/2 F5/4 A5/2 | Bb5/4 G5/2 D5/6 | F5/2 G5/2 Bb5/2 C6/4 Bb5/2 | G5/6 E5/6',
        m3: 'D6/4 Bb5/2 G5/4 F5/2 | E5/4 G5/2 C6/6 | D5/2 F5/2 A5/2 G5/4 E5/2 | F5/12',
        mb: 'A5/4 D6/2 C6/4 A5/2 | G5/4 E5/2 C5/6 | D5/2 F5/2 A5/2 D6/4 C6/2 | C6/6 A5/6 | Bb5/4 D6/2 F6/4 D6/2 | E6/4 C6/2 A5/6 | D6/2 C6/2 Bb5/2 A5/4 F5/2 | G5/6 E5/6',
        t: 'Bb5/4 G5/2 D5/6 | E5/6 C5/6',
      },
      chords:
        'Fmaj7 C/E ' +
        'F C/E Dm7 Bbmaj7 F/A Gm7 C7sus4 C7 ' +
        'F C/E Dm7 Bbmaj7 Gm7 Am7 Bbmaj7:C7 F ' +
        'Dm7 Am7 Bbmaj7 F/A Gm7 Am7 Bbmaj7 C7sus4:C7 ' +
        'F C/E Dm7 Bbmaj7 Gm7 Am7 Bbmaj7:C7 F ' +
        'Gm7 C7',
      voices: [
        { inst: 'marimba', m: '@in', at: 'in', role: 'orn' },
        { inst: 'recorder', m: '@m1 @m2', at: 'A' },
        { inst: 'recorder', m: '@m1 @m3', at: 'A2' },
        { inst: 'ocarina', m: '@mb', at: 'B' },
        { inst: 'recorder', m: '@m1 @m3', at: 'A3' },
        { inst: 'glock', m: '@m1 @m3', at: 'A3', vol: 0.3, role: 'orn', pan: 0.3 },
        { inst: 'recorder', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'warm', in: 'in A A2', center: 60, n: 3, vol: 0.85 },
        { role: 'pad', inst: 'strings', in: 'B A3 T', center: 62, n: 3, vol: 0.6 },
        { role: 'arp', inst: 'guitar', rate: 2, seq: [0, 2, 1, 2, 3, 2], lo: 53, vol: 0.75 },
        { role: 'arp', inst: 'marimba', in: 'A2 B', rate: 2, seq: [4, 2, 3, 1, 2, 0], lo: 64, vol: 0.5 },
        { role: 'bass', inst: 'upright', pat: 'R.....5.....' },
        { role: 'drums', kit: 'fcampA', in: 'in A' },
        { role: 'drums', kit: 'fcampB', in: 'A2 B A3 T', fill: 'wood', crash: 'n' },
        { role: 'answer', inst: 'glock', in: 'A', c: 81 },
        { role: 'answer', inst: 'recorder', in: 'B', c: 79, vol: 0.7 },
        { role: 'harm', inst: 'clarinet', in: 'A2', vol: 0.6 },
        { role: 'gliss', inst: 'harp', lo: 65 },
      ],
      vary: [{}, { swap: { recorder: 'ocarina', ocarina: 'recorder' }, mute: ['drums@A'] }, { swap: { guitar: 'harp', ocarina: 'flute' } }],
      aged: { lp: 2400 },
    },

    // ═══ 第二章營地 燈塔岬（第二批重寫）：憂鬱的暗藍港口，燈塔熄了。B 小調 4/4、76 BPM 的慢歌；
    // 六角手風琴與大提琴對唱、低音弦樂、遠處的浮標鐘（不規則地響）、浪聲；B 段小提琴。
    harbor: {
      bpm: 76, verb: 0.5, gain: 0.95,
      form: 'in:2 A:8 A2:8 B:8 A3:8 T:2',
      P: {
        buoy: 'F#4/16 | r/16 | r/8 F#4/8 | r/16 | r/16 | F#4/16 | r/16 | r/4 F#4/12',
        h1: 'F#5/6 E5/2 D5/4 B4/4 | D5/6 E5/2 G5/8 | F#5/6 A5/2 F#5/4 D5/4 | E5/12 C#5/4',
        h2: 'D5/4 F#5/4 B5/6 A5/2 | G5/6 F#5/2 E5/8 | B4/4 C#5/4 F#5/8 | C#5/8 A#4/8',
        h3: 'B5/6 A5/2 G5/4 D5/4 | A5/6 F#5/2 D5/8 | G5/6 F#5/2 E5/4 D5/4 | C#5/8 E5/4 A#4/4',
        hb: 'B5/6 A5/2 G5/4 E5/4 | C#6/6 B5/2 A5/8 | F#5/4 A5/4 D6/4 C#6/4 | B5/12 D6/4 | E6/6 D6/2 B5/4 G5/4 | A5/6 C#6/2 E6/8 | F#6/8 E6/4 C#6/4 | C#6/8 A#5/8',
        t: 'G5/8 F#5/4 E5/4 | C#5/8 A#4/8',
      },
      chords:
        'Bm Bm ' +
        'Bm G D A/C# Bm Em7 F#sus4 F# ' +
        'Bm G D A/C# G D/F# Em7 F#7 ' +
        'Em7 A D G Em7 A F#7sus4 F# ' +
        'Bm G D A/C# G D/F# Em7 F#7 ' +
        'Em7 F#sus4:F#',
      voices: [
        { inst: 'bell', m: 'F#4/16 | r/16', at: 'in', role: 'orn', vol: 0.35, pan: -0.6 },
        { inst: 'bell', m: '@buoy', at: 'A', role: 'orn', vol: 0.3, pan: -0.6 },
        { inst: 'bell', m: '@buoy', at: 'A2', role: 'orn', vol: 0.3, pan: -0.6 },
        { inst: 'bell', m: '@buoy', at: 'B', role: 'orn', vol: 0.3, pan: -0.6 },
        { inst: 'bell', m: '@buoy', at: 'A3', role: 'orn', vol: 0.3, pan: -0.6 },
        { inst: 'reed', m: '@h1 @h2', at: 'A' },
        { inst: 'cello', m: '@h1 @h3', at: 'A2', oct: -12, vol: 1.1 },
        { inst: 'reed', m: '@h1 @h3', at: 'A2', vol: 0.4, role: 'counter', pan: 0.25 },
        { inst: 'violin', m: '@hb', at: 'B' },
        { inst: 'reed', m: '@h1 @h3', at: 'A3' },
        { inst: 'cello', m: '@h1 @h3', at: 'A3', oct: -12, vol: 0.5, role: 'counter', pan: -0.25 },
        { inst: 'reed', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'lowstr', center: 50, n: 3, vol: 0.9 },
        { role: 'pad', inst: 'ooh', in: 'B A3', center: 60, n: 3, vol: 0.5 },
        { role: 'arp', inst: 'guitar', in: 'A2 B A3', rate: 2, seq: [0, 2, 4, 2, 1, 3, 4, 2], lo: 50, vol: 0.55 },
        { role: 'bass', inst: 'lowbow', pat: 'R.......5.......' },
        { role: 'drums', kit: 'harborSea' },
        { role: 'answer', inst: 'clarinet', in: 'A', c: 67, vol: 0.7 },
        { role: 'guide', inst: 'strlead', in: 'B', lo: 57, hi: 69 },
      ],
      vary: [{}, { swap: { reed: 'accordion', violin: 'cello' }, up: {} }],
      aged: { lp: 2000 },
    },

    // ═══ 第三章營地 溫泉谷（第二批重寫）：溫暖、有蒸氣、放鬆，但帶著峽谷的熱。G 大調五聲、72 BPM；
    // 尺八主奏、古箏不規則地撥、頌缽、很輕的太鼓心跳（咚—咚）；B 段移到 E 小調，更熱一點。
    spa: {
      bpm: 72, verb: 0.55, gain: 0.9,
      form: 'in:2 A:8 A2:8 B:8 A3:8 T:2',
      P: {
        in: 'G5/2 A5/2 B5/2 D6/2 E6/4 D6/4 | B5/2 A5/2 G5/2 E5/2 D5/8',
        s1: 'D5/8 E5/4 G5/4 | E5/6 D5/2 B4/8 | G5/8 A5/4 G5/4 | A5/12 r/4',
        s2: 'B5/6 A5/2 G5/4 E5/4 | D5/8 F#5/4 A5/4 | G5/6 E5/2 D5/8 | D5/8 F#5/8',
        s3: 'G5/6 E5/2 D5/4 B4/4 | C5/6 E5/2 A5/8 | G5/8 E5/4 D5/4 | D5/16',
        sb: 'B5/6 D6/2 E6/8 | C6/6 A5/2 G5/8 | B5/4 D6/4 E6/4 G6/4 | E6/12 r/4 | E6/6 D6/2 B5/8 | D6/6 B5/2 A5/8 | G5/6 E5/2 C6/8 | A5/8 F#5/8',
        t: 'C6/8 A5/8 | A5/16',
      },
      chords:
        'Gadd9 Gadd9 ' +
        'Gadd9 Em7 Cadd9 Dsus4 Gadd9 Bm7 Cadd9 Dsus4:D ' +
        'Gadd9 Em7 Cadd9 Dsus4 Em7 Am7 Cadd9 Dsus4 ' +
        'Em7 Am7 Em7 Am7 Cmaj7 Bm7 Am7 Dsus4:D ' +
        'Gadd9 Em7 Cadd9 Dsus4 Gadd9 Bm7 Cadd9 Dsus4:D ' +
        'Am7 Dsus4',
      voices: [
        { inst: 'koto', m: '@in', at: 'in', role: 'orn' },
        { inst: 'shaku', m: '@s1 @s2', at: 'A' },
        { inst: 'shaku', m: '@s1 @s3', at: 'A2' },
        { inst: 'koto', m: '@s1 @s3', at: 'A2', vol: 0.45, role: 'counter', pan: 0.3 },
        { inst: 'shaku', m: '@sb', at: 'B', oct: -12, vol: 1.2 },
        { inst: 'koto', m: '@sb', at: 'B', vol: 0.5, role: 'counter', pan: 0.3 },
        { inst: 'shaku', m: '@s1 @s2', at: 'A3' },
        { inst: 'shaku', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'warm', in: 'in A A2 A3 T', center: 59, n: 3, vol: 0.85 },
        { role: 'pad', inst: 'ooh', in: 'B', center: 57, n: 3, vol: 0.6 },
        { role: 'arp', inst: 'koto', rate: 2, seq: [4, 2, 0, 1, 3, 2, 1, 0], lo: 55, pat: 'x.x...x.x.x...x.', vol: 0.8 },
        { role: 'arp', inst: 'bowl', in: 'A2 A3', rate: 16, seq: [0], lo: 48, vol: 0.5 },
        { role: 'bass', inst: 'lowbow', pat: 'R' + dots(15) },
        { role: 'drums', kit: 'spaHeart', in: 'in A A2 A3 T' },
        { role: 'drums', kit: 'spaHeat', in: 'B' },
        { role: 'answer', inst: 'koto', in: 'A', c: 74 },
        { role: 'gliss', inst: 'koto', lo: 62 },
      ],
      vary: [{}, { swap: { shaku: 'bamboo' }, mute: ['drums@A'] }],
      aged: { lp: 2200 },
    },

    // ═══ 第一章狩獵場 苔光森林：茂密的魔法森林。E 多利安、maj9 與 sus4、豎琴一直流動、鋼片琴閃光；
    // 神祕但仍然歡迎你。100 BPM 輕微十六分搖擺。C 段是「深林」：低音單簧管、合唱「嗚」。
    forest: {
      bpm: 100, swing16: 0.1, verb: 0.4, gain: 1.45,
      form: 'in:2 A:8 A2:8 B:8 C:8 A3:8 T:2',
      P: {
        in: 'B6/2 G6/2 E6/2 B5/2 F#6/4 E6/4 | D6/2 B5/2 G5/2 E5/2 D6/8',
        g1: 'B5/3 E6/3 F#6/2 G6/4 F#6/2 E6/2 | D6/6 B5/2 G5/8 | A5/3 B5/3 D6/2 E6/4 D6/2 B5/2 | A5/6 G5/2 F#5/8',
        g2: 'E5/3 G5/3 B5/2 D6/4 C6/2 B5/2 | A5/6 F#5/2 D5/8 | C6/3 B5/3 A5/2 E5/4 G5/4 | F#5/8 D#5/8',
        g3: 'C6/3 E6/3 G6/2 F#6/4 E6/4 | G6/6 E6/2 B5/8 | A5/3 D6/3 E6/2 G6/8 | F#6/16',
        gb1: 'E6/6 D6/2 C6/4 G5/4 | F#6/6 E6/2 D6/4 A5/4 | B5/3 D6/3 F#6/2 A6/8 | G6/6 F#6/2 E6/8',
        gb2: 'E6/3 G6/3 B6/2 A6/4 G6/4 | F#6/6 D6/2 A5/8 | B5/3 D6/3 F#6/2 A6/4 G6/4 | F#6/8 D#6/8',
        gc: 'E5/12 D5/4 | B4/16 | C5/6 D5/2 E5/8 | B4/16 | G5/6 F#5/2 E5/8 | D5/6 B4/2 A4/8 | C5/6 B4/2 A4/8 | F#4/8 D#4/8',
        t: 'C6/3 B5/3 A5/2 E5/8 | F#5/8 D#5/8',
      },
      chords:
        'Em9 Cmaj9 ' +
        'Em9 Cmaj9 Em9 Dsus4:D Cmaj9 Gmaj9/B Am9 Bsus4:B7 ' +
        'Em9 Cmaj9 Em9 Dsus4:D Am9 Cmaj9 Dsus4 D ' +
        'Cmaj9 D/C Bm7 Em9 Cmaj9 D/C Gmaj9/B Bsus4:B7 ' +
        'Am9 Em9 Am9 Em9 Cmaj9 Gmaj9/B Am9 Bsus4:B7 ' +
        'Em9 Cmaj9 Em9 Dsus4:D Cmaj9 Gmaj9/B Am9 Bsus4:B7 ' +
        'Am9 Bsus4:B7',
      voices: [
        { inst: 'celesta', m: '@in', at: 'in', role: 'orn', vol: 0.9 },
        { inst: 'pan', m: '@g1 @g2', at: 'A' },
        { inst: 'celesta', m: '@g1', at: 'A', vol: 0.45, role: 'orn', pan: 0.3 },
        { inst: 'pan', m: '@g1 @g3', at: 'A2' },
        { inst: 'cello', m: '@gb1 @gb2', at: 'B', oct: -12, vol: 1.15 },
        { inst: 'violin', m: '@gb2', at: 'B+4', vol: 0.35, role: 'counter', pan: 0.25 },
        { inst: 'clarinet', m: '@gc', at: 'C', vol: 1.2 },
        { inst: 'pan', m: '@g1 @g2', at: 'A3' },
        { inst: 'musicbox', m: '@g1 @g2', at: 'A3', oct: 12, vol: 0.3, role: 'orn', pan: 0.3 },
        { inst: 'pan', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'warm', in: 'in A', center: 60, n: 4, vol: 0.9 },
        { role: 'pad', inst: 'strings', in: 'A2 B A3 T', center: 62, n: 3, vol: 0.75 },
        { role: 'pad', inst: 'ooh', in: 'C', center: 57, n: 3, vol: 0.8 },
        { role: 'arp', inst: 'harp', rate: 2, seq: [0, 2, 4, 5, 3, 2, 4, 1], lo: 57, vol: 0.75 },
        { role: 'arp', inst: 'celesta', in: 'A A3', rate: 4, seq: [5, 3, 6, 4], lo: 76, pat: 'x.......x...x...', vol: 0.45, layer: 'calm' },
        { role: 'arp', inst: 'marimba', in: 'A2', rate: 2, seq: [0, 2, 1, 3, 2, 4, 3, 1], lo: 60, vol: 0.6 },
        { role: 'comp', inst: 'ep', in: 'B', pat: '..x...x...x..x..', center: 64, n: 3, vol: 0.6, pan: 0.35 },
        { role: 'comp', inst: 'pizz', in: 'A2 A3', pat: 'x..x..x...x..x..', center: 60, n: 3, vol: 0.7 },
        { role: 'bass', inst: 'upright', in: 'in A C', pat: 'R.......5.....A.' },
        { role: 'bass', inst: 'upright', in: 'A2 B A3 T', pat: 'R..5..R.R...5.A.' },
        { role: 'drums', kit: 'mforIn', in: 'in C' },
        { role: 'drums', kit: 'mforA', in: 'A A3', fill: 'brush', crash: 'n' },
        { role: 'drums', kit: 'mforB', in: 'A2 B T', fill: 'brush', crash: 'n' },
        { role: 'drums', kit: 'mforCombat', in: 'A A2 B C A3 T', layer: 'combat', vol: 0.85 },
        { role: 'arp', inst: 'pluck', in: 'A A2 B C A3 T', rate: 1, seq: [0, 0, 2, 0, 1, 0, 2, 4], lo: 52, pat: 'x.x.x.xxx.x.x.xx', vol: 0.55, layer: 'combat' },
        { role: 'answer', inst: 'glock', in: 'A', c: 81 },
        { role: 'answer', inst: 'pan', in: 'B', c: 76 },
        { role: 'harm', inst: 'clarinet', in: 'A2', vol: 0.7 },
        { role: 'guide', inst: 'horn', in: 'B C', lo: 55, hi: 67, move: true, vol: 0.8 },
        { role: 'gliss', inst: 'harp', lo: 67 },
      ],
      vary: [{}, { swap: { pan: 'recorder', cello: 'violin', clarinet: 'horn' }, mute: ['drums@A'] }],
      aged: { lp: 2200 },
    },

    // ═══ 第二章狩獵場 潮風海岬：暗藍、暴風雨前的海岸。D 小調 6/8 船歌、92 BPM；
    // 低音弦樂鋪底、六角手風琴主奏、浪湧與低沉的踏地聲。低音線 D→C→B♭→A 一路往下（哀歌低音）。
    sea: {
      bpm: 92, verb: 0.42, gain: 1.0,
      barLen: 12,
      form: 'in:2 A:8 A2:8 B:8 C:8 A3:8 T:2',
      P: {
        in: 'A4/2 D5/4 E5/2 F5/4 | E5/12',
        w1: 'A4/2 D5/4 E5/2 F5/4 | E5/4 D5/2 C5/6 | D5/4 F5/2 Bb5/4 A5/2 | A5/6 E5/6',
        w2: 'D5/4 G5/2 Bb5/4 A5/2 | A5/4 F5/2 D5/6 | E5/4 G5/2 Bb5/4 G5/2 | E5/6 C#5/6',
        w3: 'D6/4 Bb5/2 G5/4 A5/2 | Bb5/4 A5/2 F5/6 | G5/4 Bb5/2 A5/4 C#6/2 | D6/12',
        wb: 'C6/4 A5/2 F5/6 | G5/4 E5/2 C5/6 | D5/2 F5/2 A5/2 D6/4 C6/2 | Bb5/12 | A5/4 C6/2 F6/6 | E6/4 D6/2 C6/6 | D6/4 Bb5/2 F5/6 | E5/6 C#5/6',
        wc: 'D4/12 | C4/12 | Bb3/12 | A3/12 | G3/12 | Bb3/12 | A3/12 | A3/12',
        t: 'D5/4 G5/2 Bb5/6 | A5/6 C#5/6',
      },
      chords:
        'Dm Dm ' +
        'Dm C Bb Am Gm Dm/F Em7b5 A7 ' +
        'Dm C Bb Am Gm Bb Gm:A7 Dm ' +
        'F C/E Dm Bb F C/E Bb A7 ' +
        'Dm C Bb Am Gm Bb A7sus4 A7 ' +
        'Dm C Bb Am Gm Dm/F Em7b5 A7 ' +
        'Gm A7',
      voices: [
        { inst: 'reed', m: '@in', at: 'in', role: 'orn', vol: 0.8 },
        { inst: 'reed', m: '@w1 @w2', at: 'A' },
        { inst: 'reed', m: '@w1 @w3', at: 'A2' },
        { inst: 'cello', m: '@w1 @w3', at: 'A2', oct: -12, vol: 0.55, role: 'counter', pan: -0.25 },
        { inst: 'violin', m: '@wb', at: 'B' },
        { inst: 'reed', m: '@wb', at: 'B', oct: -12, vol: 0.4, role: 'counter', pan: 0.25 },
        { inst: 'cello', m: '@wc', at: 'C', vol: 1.3 },
        { inst: 'violin', m: '@w1 @w2', at: 'A3', oct: 12 },
        { inst: 'reed', m: '@w1 @w2', at: 'A3', vol: 0.5, role: 'counter', pan: -0.2 },
        { inst: 'reed', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'lowstr', center: 52, n: 3, vol: 0.9 },
        { role: 'pad', inst: 'ooh', in: 'B C', center: 60, n: 3, vol: 0.6 },
        { role: 'arp', inst: 'pizz', in: 'A A3', rate: 2, seq: [0, 2, 1, 2, 0, 2], lo: 50, vol: 0.8 },
        { role: 'arp', inst: 'harp', in: 'B', rate: 2, seq: [0, 2, 4, 3, 2, 1], lo: 57, vol: 0.5 },
        { role: 'comp', inst: 'guitar', in: 'A2 B A3', pat: 'x.....x.....', center: 57, n: 4, strum: 0.02, vol: 0.6 },
        { role: 'bass', inst: 'lowbow', in: 'in A A2 B A3 T', pat: 'R.....5.....' },
        { role: 'bass', inst: 'lowbow', in: 'C', pat: 'R...........' },
        { role: 'drums', kit: 'stormIn', in: 'in' },
        { role: 'drums', kit: 'stormA', in: 'A A3' },
        { role: 'drums', kit: 'stormB', in: 'A2 B T' },
        { role: 'drums', kit: 'stormC', in: 'C' },
        { role: 'drums', kit: 'stormCombat', in: 'A A2 B C A3 T', layer: 'combat', vol: 0.9 },
        { role: 'bass', inst: 'synbass', in: 'A A2 B C A3 T', pat: 'R.....R..5..', layer: 'combat', vol: 0.6 },
        { role: 'answer', inst: 'clarinet', in: 'A', c: 70 },
        { role: 'guide', inst: 'strlead', in: 'B C', lo: 57, hi: 69 },
      ],
      vary: [{}, { swap: { reed: 'accordion' }, mute: ['drums@A'] }],
      aged: { lp: 2000 },
    },

    // ═══ 第四章狩獵場 鈴風雪原：「時間停住的山」。D 多利安／自然小調、66 BPM、幾乎沒有節奏；
    // 長音、管鐘、頌缽般的玻璃鋪底。A 長笛、A' 大提琴、B 小提琴（稍暖的回憶）、C 段只剩鐘聲。
    snow: {
      bpm: 66, verb: 0.62, gain: 0.95,
      form: 'in:2 A:8 A2:8 B:8 C:8 T:2',
      P: {
        in: 'r/8 A6/4 E6/4 | D6/16',
        a1: 'A5/12 G5/2 F5/2 | E5/8 D5/4 B4/4 | F5/6 E5/2 D5/8 | E5/12 r/4',
        a2: 'D6/8 C6/4 A5/4 | C6/12 A5/4 | Bb5/6 A5/2 G5/4 F5/4 | E5/16',
        a3: 'D6/8 E6/4 F6/4 | E6/12 C6/4 | D6/6 C6/2 Bb5/4 G5/4 | A5/16',
        b1: 'A5/4 C6/4 E6/8 | D6/6 C6/2 G5/8 | F5/4 A5/4 E6/4 D6/4 | D6/12 r/4 | C6/4 E6/4 A6/8 | G6/6 E6/2 D6/8 | Bb5/4 D6/4 F6/4 A5/4 | A5/8 C#6/8',
        c: 'D6/16 | r/16 | A5/16 | r/16 | Bb5/16 | r/16 | A5/16 | r/16',
        t: 'Bb5/8 A5/4 G5/4 | E5/16',
      },
      chords:
        'Dm9 Dm9 ' +
        'Dm9 G/D Dm9 Cadd9 Bbmaj7 Fadd9/A Gm9 Asus4 ' +
        'Dm9 G/D Dm9 Cadd9 Bbmaj7 Fadd9/A Gm9 Asus4 ' +
        'Fmaj7 C/E Dm9 Bbmaj7 Fmaj7 C/E Gm9 Asus4:A ' +
        'Dm9 Dm9 Bbmaj7 Bbmaj7 Gm9 Gm9 Asus4 Asus4 ' +
        'Gm9 Asus4',
      voices: [
        { inst: 'celesta', m: '@in', at: 'in', role: 'orn', vol: 0.9 },
        { inst: 'flute', m: '@a1 @a2', at: 'A' },
        { inst: 'bell', m: '@a1', at: 'A', oct: 12, vol: 0.3, role: 'orn', pan: 0.3 },
        { inst: 'cello', m: '@a1 @a3', at: 'A2', oct: -12, vol: 1.1 },
        { inst: 'icebell', m: '@a1 @a3', at: 'A2', vol: 0.3, role: 'orn', pan: 0.3 },
        { inst: 'violin', m: '@b1', at: 'B' },
        { inst: 'bell', m: '@c', at: 'C', role: 'orn', vol: 1.1 },
        { inst: 'flute', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'frost', center: 62, n: 4, vol: 1.1 },
        { role: 'pad', inst: 'strings', in: 'A2 B', center: 57, n: 3, vol: 0.55 },
        { role: 'pad', inst: 'ooh', in: 'B C', center: 60, n: 3, vol: 0.6 },
        { role: 'arp', inst: 'celesta', in: 'A A2', rate: 4, seq: [4, 2, 5, 3], lo: 74, pat: 'x.......x.......', vol: 0.45, layer: 'calm' },
        { role: 'arp', inst: 'harp', in: 'B', rate: 2, seq: [0, 2, 4, 6, 5, 4, 2, 1], lo: 57, vol: 0.65 },
        { role: 'bass', inst: 'lowbow', in: 'A A2 B C', pat: 'R' + dots(15) },
        { role: 'drums', kit: 'snowA', in: 'A A2 B C' },
        { role: 'drums', kit: 'snowCombat', in: 'A A2 B C T', layer: 'combat' },
        { role: 'bass', inst: 'upright', in: 'A A2 B C T', pat: 'R.....R.5.......', layer: 'combat', vol: 0.8 },
        { role: 'arp', inst: 'icebell', in: 'A A2 B C T', rate: 2, seq: [0, 2, 1, 3], lo: 62, vol: 0.5, layer: 'combat' },
        { role: 'answer', inst: 'bell', in: 'A', c: 76, vol: 0.6 },
        { role: 'guide', inst: 'cello', in: 'B C', lo: 50, hi: 60, vol: 0.55 },
        { role: 'gliss', inst: 'celesta', lo: 72 },
      ],
      vary: [{}, { swap: { flute: 'ocarina', cello: 'horn' } }],
      // 第四章的「變老」是解凍：鐘聲沒了，只剩霧濛濛的鋪底
      aged: { lp: 2000, drop: ['orn', 'answer', 'gliss', 'counter'] },
    },

    // ═══ 第四章營地 霜鈴村：溫暖但單薄，在寒冷裡撐下去的小村。D 大調 3/4、84 BPM；
    // 陶笛 → 單簧管 → 小提琴，木吉他在二、三拍輕刷，手搖鈴回應；B 段借來的 Gm6 帶一點苦。
    frostvillage: {
      bpm: 84, verb: 0.45, gain: 1.2,
      barLen: 12,
      form: 'in:2 A:8 A2:8 B:8 A3:8 T:2',
      P: {
        in: 'A5/2 D6/2 F#6/2 A6/2 F#6/4 | E6/2 D6/2 A5/8',
        a1: 'F#5/6 E5/2 F#5/2 A5/2 | E5/8 C#5/4 | D5/6 F#5/2 B5/2 A5/2 | A5/8 F#5/4',
        a2: 'G5/6 B5/2 D6/2 C#6/2 | D6/8 A5/4 | B5/6 A5/2 G5/2 E5/2 | E5/6 C#5/6',
        a3: 'G5/6 B5/2 D6/2 E6/2 | D6/6 Bb5/2 G5/4 | F#5/6 E5/2 D5/2 E5/2 | C#5/6 E5/6',
        a4: 'B5/6 D6/2 G6/4 | G6/4 E6/4 D6/4 | B5/6 A5/2 G5/2 E5/2 | E5/12',
        b1: 'D6/6 C#6/2 B5/2 A5/2 | C#6/8 A5/4 | B5/6 A5/2 G5/2 F#5/2 | F#5/8 A5/4 | G5/6 B5/2 E6/2 D6/2 | C#6/8 A5/4 | Bb5/6 A5/2 G5/2 E5/2 | D5/6 C#5/6',
        t: 'B5/4 A5/4 G5/4 | E5/6 C#5/6',
      },
      chords:
        'Dadd9 A7sus4 ' +
        'Dadd9 A/C# Bm7 F#m7 Gmaj7 D/F# Em7 A7sus4:A7 ' +
        'Dadd9 A/C# Bm7 F#m7 Gmaj7 Gm6 Dadd9/A A7 ' +
        'Bm7 F#m7 Gmaj7 Dadd9 Em7 F#m7 Gm6 A7sus4:A7 ' +
        'Dadd9 A/C# Bm7 F#m7 Gmaj7 Gm6 Em7 A7sus4 ' +
        'Em7 A7sus4:A7',
      voices: [
        { inst: 'musicbox', m: '@in', at: 'in', role: 'orn' },
        { inst: 'ocarina', m: '@a1 @a2', at: 'A' },
        { inst: 'clarinet', m: '@a1 @a3', at: 'A2', vol: 1.15 },
        { inst: 'handbell', m: '@a3', at: 'A2+4', oct: 12, vol: 0.35, role: 'orn', pan: 0.3 },
        { inst: 'violin', m: '@b1', at: 'B' },
        { inst: 'ocarina', m: '@a1 @a4', at: 'A3' },
        { inst: 'violin', m: '@a1 @a4', at: 'A3', oct: -12, vol: 0.45, role: 'counter', pan: -0.25 },
        { inst: 'ocarina', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'warm', in: 'in A', center: 60, n: 3, vol: 0.8 },
        { role: 'pad', inst: 'strings', in: 'A2 B A3 T', center: 62, n: 3, vol: 0.7 },
        { role: 'comp', inst: 'guitar', pat: '....x...x...', center: 60, n: 3, vol: 0.75, strum: 0.012 },
        { role: 'bass', inst: 'upright', in: 'in A', pat: 'R' + dots(11) },
        { role: 'bass', inst: 'upright', in: 'A2 B A3 T', pat: 'R.......5...' },
        { role: 'arp', inst: 'harp', in: 'B', rate: 2, seq: [0, 2, 4, 2, 1, 3], lo: 57, vol: 0.6 },
        { role: 'drums', kit: 'villA', in: 'in A' },
        { role: 'drums', kit: 'villB', in: 'A2 B A3 T', fill: 'brush', crash: 'n' },
        { role: 'answer', inst: 'handbell', in: 'A A3', c: 79, vol: 0.8 },
        { role: 'answer', inst: 'clarinet', in: 'B', c: 72, vol: 0.8 },
        { role: 'harm', inst: 'flute', in: 'A3', vol: 0.5 },
        { role: 'gliss', inst: 'harp', lo: 67 },
      ],
      vary: [{}, { swap: { ocarina: 'flute', clarinet: 'reed' }, mute: ['drums@A'] }, { swap: { ocarina: 'clarinet', clarinet: 'ocarina', violin: 'flute' } }],
      aged: { lp: 2200 },
    },

    // ═══ 第五章狩獵場 神殿（回憶迴廊、星之階梯）：抽象、莊嚴。「時間像流水，空間像風」。
    // 7/8（2+2+3）、104 BPM、E 小調帶利底亞色彩；豎琴不規則地流動、時鐘滴答、合唱與弦樂，沒有流行鼓。
    // B 段用 E♭maj7 的遠系轉調撐起莊嚴感；C 段是「風」：主旋律退開，只剩鐘聲與長笛的碎片。
    temple: {
      bpm: 104, verb: 0.6, gain: 0.9,
      barLen: 14,
      form: 'in:2 A:8 A2:8 B:8 C:8 A3:8 T:2',
      P: {
        in: 'E6/2 B5/2 G5/2 F#5/2 E5/6 | r/14',
        a1: 'B5/4 E6/4 D6/6 | E6/4 G6/4 F#6/6 | E6/4 C6/4 B5/6 | E5/7 D#5/7',
        a2: 'B5/4 E6/4 G6/6 | A6/4 G6/4 E6/6 | F#6/4 E6/4 D6/6 | E6/7 D#6/7',
        a3: 'D6/4 F#6/4 B6/6 | A6/4 F#6/4 E6/6 | G6/4 E6/4 C6/6 | B5/7 D#6/7',
        b1: 'G5/4 C6/4 B5/6 | A5/4 D6/4 F#5/6 | B5/8 D6/6 | E6/14',
        b2: 'E6/4 G6/4 B5/6 | A5/4 F#6/4 D6/6 | D6/4 Bb5/4 G5/6 | F#5/7 D#6/7',
        c: 'E5/14 | F5/14 | E5/14 | A5/14 | A4/14 | D5/14 | C5/14 | B4/14',
        cf: 'r/14 | r/6 E6/4 F6/4 | G6/14 | r/14 | r/6 C6/4 D6/4 | F6/14 | C6/7 B5/7 | E6/7 D#6/7',
        t: 'C6/4 E6/4 G6/6 | F#6/7 D#6/7',
      },
      chords:
        'Em9 Em9 ' +
        'Em9 Cmaj7 Am9 Bsus4:B Em9 Cmaj7 Dadd9/F# Bsus4:B ' +
        'Em9 Cmaj7 Am9 Bsus4:B Gmaj7 Dadd9/F# Cmaj7 Bsus4:B ' +
        'Cmaj7 D/C Bm7 Em9 Cmaj7 D/C Ebmaj7 Bsus4:B ' +
        'Em9 Fmaj7 Em9 Fmaj7 Am9 Bbmaj7 Am9 Bsus4:B ' +
        'Em9 Cmaj7 Am9 Bsus4:B Gmaj7 Dadd9/F# Cmaj7 Bsus4:B ' +
        'Cmaj7 Bsus4:B',
      voices: [
        { inst: 'celesta', m: '@in', at: 'in', role: 'orn' },
        { inst: 'flute', m: '@a1 @a2', at: 'A' },
        { inst: 'violin', m: '@a1 @a3', at: 'A2' },
        { inst: 'horn', m: '@a1 @a3', at: 'A2', oct: -12, vol: 0.55, role: 'counter', pan: -0.25 },
        { inst: 'horn', m: '@b1 @b2', at: 'B', oct: -12, vol: 1.25 },
        { inst: 'violin', m: '@b2', at: 'B+4', vol: 0.5, role: 'counter', pan: 0.25 },
        { inst: 'bell', m: '@c', at: 'C', role: 'orn', vol: 0.9 },
        { inst: 'flute', m: '@cf', at: 'C', vol: 0.7, role: 'counter', pan: 0.2 },
        { inst: 'flute', m: '@a1 @a3', at: 'A3' },
        { inst: 'cello', m: '@a1 @a3', at: 'A3', oct: -12, vol: 0.6, role: 'counter', pan: -0.25 },
        { inst: 'horn', m: '@t', at: 'T', oct: -12, vol: 1.2 },
      ],
      parts: [
        { role: 'pad', inst: 'frost', in: 'in A', center: 64, n: 4, vol: 0.8 },
        { role: 'pad', inst: 'strings', in: 'A2 B A3', center: 57, n: 3, vol: 0.7 },
        { role: 'pad', inst: 'choir', in: 'B C A3 T', center: 62, n: 3, vol: 0.7 },
        { role: 'arp', inst: 'harp', rate: 2, seq: [0, 2, 4, 1, 3, 5, 2], lo: 60, vol: 0.8 },
        { role: 'arp', inst: 'celesta', in: 'A2 B A3', rate: 1, seq: [7, 5, 6, 4, 5, 3, 4, 2, 3, 1, 2, 0, 1, 3], lo: 72, pat: 'x..x.x..x..x.x', vol: 0.45, layer: 'calm' },
        { role: 'bass', inst: 'lowbow', pat: 'R.......5.....' },
        { role: 'drums', kit: 'clockA', crash: 'G' },
        { role: 'drums', kit: 'templeCombat', in: 'A A2 B C A3 T', layer: 'combat' },
        { role: 'arp', inst: 'ostinato', in: 'A A2 B C A3 T', rate: 1, seq: [0, 0, 2, 0, 1, 0, 2], lo: 50, vol: 0.7, layer: 'combat' },
        { role: 'answer', inst: 'crystal', in: 'A', c: 81 },
        { role: 'guide', inst: 'strlead', in: 'B C', lo: 60, hi: 72 },
        { role: 'gliss', inst: 'harp', lo: 64 },
      ],
      vary: [{}, { swap: { flute: 'violin', violin: 'flute', horn: 'cello' } }],
      aged: false,
    },

    // ═══ 第五章營地 神殿前庭：同一個世界、更安靜。5/4（3+2）、72 BPM；鋼片琴、長笛、豎琴，時鐘很輕。
    templeCamp: {
      bpm: 72, verb: 0.6, gain: 0.9,
      barLen: 20,
      form: 'in:2 A:8 B:8 A2:8 T:2',
      P: {
        in: 'E6/4 B5/4 G5/4 F#5/4 E5/4 | r/20',
        a1: 'B5/12 E6/8 | D6/8 C6/4 B5/8 | B5/12 D6/8 | A5/20',
        a2: 'B5/12 G6/8 | F#6/8 E6/4 C6/8 | C6/12 B5/8 | F#5/10 D#5/10',
        b1: 'G5/12 C6/8 | A5/12 F#5/8 | B5/12 D6/8 | E6/20 | E6/12 G6/8 | F#6/12 D6/8 | D6/12 Bb5/8 | F#5/10 D#6/10',
        t: 'C6/12 G5/8 | F#5/10 D#5/10',
      },
      chords:
        'Em9 Em9 ' +
        'Em9 Cmaj7 Gmaj7 D/F# Em9 Cmaj7 Am9 Bsus4:B ' +
        'Cmaj7 D/C Bm7 Em9 Cmaj7 D/C Ebmaj7 Bsus4:B ' +
        'Em9 Cmaj7 Gmaj7 D/F# Em9 Cmaj7 Am9 Bsus4:B ' +
        'Cmaj7 Bsus4:B',
      voices: [
        { inst: 'celesta', m: '@in', at: 'in', role: 'orn' },
        { inst: 'flute', m: '@a1 @a2', at: 'A', vol: 0.95 },
        { inst: 'cello', m: '@b1', at: 'B', oct: -12, vol: 1.1 },
        { inst: 'violin', m: '@a1 @a2', at: 'A2' },
        { inst: 'glock', m: '@a2', at: 'A2+4', vol: 0.3, role: 'orn', pan: 0.3 },
        { inst: 'flute', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'frost', center: 64, n: 4, vol: 0.9 },
        { role: 'pad', inst: 'choir', in: 'B A2', center: 62, n: 3, vol: 0.55 },
        { role: 'pad', inst: 'strings', in: 'A2', center: 57, n: 3, vol: 0.5 },
        { role: 'arp', inst: 'harp', rate: 2, seq: [0, 2, 4, 6, 4, 1, 3, 5, 3, 1], lo: 57, vol: 0.7 },
        { role: 'bass', inst: 'lowbow', pat: 'R.........5.........' },
        { role: 'drums', kit: 'clockSoft' },
        { role: 'answer', inst: 'celesta', in: 'A', c: 81 },
        { role: 'gliss', inst: 'harp', lo: 64 },
      ],
      vary: [{}, { swap: { flute: 'ocarina', violin: 'flute' } }],
      aged: false,
    },

    // ═══ 第一章 Boss 菇菇女王：陰森的宮廷圓舞曲。D 小調 3/4、168 BPM（一小節一拍）；
    // 大鍵琴「嗯—恰—恰」、小提琴與鋼片琴八度、B 段音樂盒主奏、C 段拿坡里 E♭ 的陰暗舞步。
    bossQueen: {
      bpm: 168, verb: 0.35, gain: 1.25, duckAmb: 0.85,
      barLen: 12,
      form: 'in:2 A:16 B:16 C:8 A2:16 T:2',
      P: {
        in: 'D6/4 F6/4 A6/4 | G6/4 E6/4 C#6/4',
        q1: 'A5/8 D6/4 | C#6/6 E6/2 G6/4 | F6/8 E6/2 D6/2 | D6/8 B5/4',
        q2: 'Bb5/8 G5/4 | A5/6 F5/2 D5/4 | G#5/8 B5/4 | A5/12',
        q3: 'D6/6 Bb5/2 G6/4 | F6/8 D6/4 | E6/6 C#6/2 A5/4 | D6/12',
        qb1: 'F5/4 D5/4 A5/4 | G5/8 E5/4 | F5/4 A5/4 D6/4 | C6/8 A5/4',
        qb2: 'Bb5/6 A5/2 F5/4 | G5/6 F5/2 D5/4 | Bb5/6 G5/2 E5/4 | C#6/12',
        qb3: 'D6/6 Bb5/2 G5/4 | E5/6 G5/2 Bb5/4 | A5/6 G5/2 E5/4 | C#5/12',
        qc: 'D5/4 F5/4 A5/4 | Bb5/8 G5/4 | A5/4 F5/4 D5/4 | Eb5/12 | G5/4 Bb5/4 D6/4 | C#6/8 A5/4 | D6/6 A5/2 F5/4 | E5/6 C#5/6',
        t: 'D6/4 Bb5/4 G5/4 | A5/6 C#6/6',
      },
      chords:
        'Dm A7 ' +
        'Dm A7/C# Dm/C G/B Gm/Bb Dm/A E7/G# A7 Dm A7/C# Dm/C G/B Gm/Bb Dm/A A7 Dm ' +
        'Bbmaj7 A7 Dm F/C Bbmaj7 Gm7 Em7b5 A7 Bbmaj7 A7 Dm F/C Gm7 Em7b5 A7 A7 ' +
        'Dm Eb/D Dm Eb/D Gm/D A7/C# Dm A7 ' +
        'Dm A7/C# Dm/C G/B Gm/Bb Dm/A E7/G# A7 Dm A7/C# Dm/C G/B Gm/Bb Dm/A A7 Dm ' +
        'Gm/Bb A7',
      voices: [
        { inst: 'musicbox', m: '@in', at: 'in', role: 'orn' },
        { inst: 'violin', m: '@q1 @q2 @q1 @q3', at: 'A' },
        { inst: 'celesta', m: '@q1 @q2 @q1 @q3', at: 'A', oct: 12, vol: 0.35, role: 'orn', pan: 0.3 },
        { inst: 'violin', m: '@qb1 @qb2 @qb1 @qb3', at: 'B' },
        { inst: 'musicbox', m: '@qb1 @qb2 @qb1 @qb3', at: 'B', oct: 12, vol: 0.6, role: 'orn', pan: 0.3 },
        { inst: 'cello', m: '@qc', at: 'C', oct: -12, vol: 1.3 },
        { inst: 'brass', m: '@q1 @q2 @q1 @q3', at: 'A2', vol: 0.9 },
        { inst: 'violin', m: '@q1 @q2 @q1 @q3', at: 'A2', vol: 0.5, role: 'counter', pan: 0.25 },
        { inst: 'violin', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'comp', inst: 'harpsi', in: 'A B C A2 T', pat: '....x...x...', center: 62, n: 3, vol: 0.9 },
        { role: 'bass', inst: 'upright', in: 'in A B A2 T', pat: 'R' + dots(11) },
        { role: 'bass', inst: 'upright', in: 'C', pat: 'R.......5...' },
        { role: 'pad', inst: 'ooh', in: 'A', center: 62, n: 3, vol: 0.5 },
        { role: 'pad', inst: 'strings', in: 'in B', center: 57, n: 3, vol: 0.6 },
        { role: 'pad', inst: 'choir', in: 'C A2 T', center: 60, n: 3, vol: 0.7 },
        { role: 'arp', inst: 'musicbox', in: 'A', rate: 2, seq: [4, 3, 2, 3, 4, 5], lo: 72, pat: '....x.x.....', vol: 0.5 },
        { role: 'drums', kit: 'waltzA', in: 'in A B', fill: 'snare', crash: 'C' },
        { role: 'drums', kit: 'waltzB', in: 'C A2 T', fill: 'snare', crash: 'C' },
        { role: 'drums', kit: 'waltzP2', in: 'A B C A2 T', layer: 'p2' },
        { role: 'arp', inst: 'ostinato', in: 'A B C A2 T', rate: 1, seq: [0, 2, 1, 2, 0, 2], lo: 50, vol: 0.6, layer: 'p2' },
        { role: 'answer', inst: 'celesta', in: 'A', c: 81 },
        { role: 'guide', inst: 'horn', in: 'B C', lo: 55, hi: 67 },
        { role: 'gliss', inst: 'harp', lo: 62 },
      ],
      vary: [{}, { swap: { violin: 'flute', harpsi: 'pizz' } }, { swap: { brass: 'horn' }, mute: ['orn'] }],
      aged: false,
    },

    // ═══ 第二章 Boss 老寄居蟹：暴風雨裡的船歌，粗、重。E 小調 6/8、150 BPM；
    // 六角手風琴領唱、低音弦樂八分音符、踏地大鼓與鐵鍊聲、浪湧；B 段小提琴、C 段低音銅管。
    bossCrab: {
      bpm: 150, verb: 0.3, gain: 1.0, duckAmb: 0.85,
      barLen: 12,
      form: 'in:2 A:16 B:16 C:8 A2:16 T:2',
      P: {
        s1: 'B4/2 E5/2 E5/2 E5/4 F#5/2 | G5/4 F#5/2 E5/6 | A5/2 A5/2 A5/2 A5/4 B5/2 | A5/4 F#5/2 D5/6',
        s2: 'E5/2 G5/2 B5/2 E6/4 D6/2 | B5/4 A5/2 G5/6 | F#5/4 A5/2 D#5/4 F#5/2 | B4/12',
        s3: 'E5/2 G5/2 C6/2 E6/4 D6/2 | D6/4 C6/2 A5/6 | G5/4 F#5/2 D#5/6 | E5/12',
        sb1: 'E6/4 D6/2 C6/6 | B5/4 A5/2 G5/6 | F#5/2 A5/2 D6/2 F#6/4 E6/2 | E6/6 B5/6',
        sb2: 'C6/2 E6/2 G6/2 G6/4 F#6/2 | G6/4 D6/2 B5/6 | A5/4 B5/2 D#6/4 F#6/2 | F#6/12',
        sb3: 'C6/2 E6/2 A6/2 A6/4 G6/2 | G6/4 E6/2 B5/6 | D#6/4 F#6/2 A6/4 F#6/2 | B5/12',
        sc: 'E4/12 | C4/12 | A3/12 | B3/12 | E4/12 | G4/12 | A4/6 B4/6 | D#4/12',
        t: 'E5/6 G5/6 | F#5/6 D#5/6',
      },
      chords:
        'Em Em ' +
        'Em Em D D Em Em B7 B7 Em Em D D C D Em:B7 Em ' +
        'C G D Em C G B7 B7 C G D Em Am Em B7 B7 ' +
        'Em C Am B7 Em C Am:B7 B7 ' +
        'Em Em D D Em Em B7 B7 Em Em D D C D Em:B7 Em ' +
        'C B7',
      voices: [
        { inst: 'reed', m: '@s1 @s2 @s1 @s3', at: 'A', vol: 1.1 },
        { inst: 'violin', m: '@sb1 @sb2 @sb1 @sb3', at: 'B' },
        { inst: 'reed', m: '@sb1 @sb2 @sb1 @sb3', at: 'B', oct: -12, vol: 0.5, role: 'counter', pan: -0.25 },
        { inst: 'brass', m: '@sc', at: 'C', vol: 1.1 },
        { inst: 'brass', m: '@s1 @s2 @s1 @s3', at: 'A2', vol: 0.9 },
        { inst: 'reed', m: '@s1 @s2 @s1 @s3', at: 'A2', vol: 0.5, role: 'counter', pan: 0.25 },
        { inst: 'reed', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'lowstr', center: 52, n: 3, vol: 0.9 },
        { role: 'pad', inst: 'choir', in: 'B A2', center: 60, n: 3, vol: 0.6 },
        { role: 'arp', inst: 'ostinato', in: 'in A B A2 T', rate: 2, seq: [0, 0, 2, 0, 1, 0], lo: 40, vol: 1.0 },
        { role: 'arp', inst: 'ostinato', in: 'C', rate: 1, seq: [0, 1, 0, 2, 0, 1], lo: 40, vol: 0.8 },
        { role: 'comp', inst: 'brass', in: 'C A2', pat: 'X.....x.....', center: 55, n: 3, len: 2, vol: 0.7 },
        { role: 'comp', inst: 'reed', in: 'B', pat: '..x.x...x.x.', center: 60, n: 3, vol: 0.4 },
        { role: 'bass', inst: 'synbass', pat: 'R.....R...5.' },
        { role: 'drums', kit: 'shantyIn', in: 'in' },
        { role: 'drums', kit: 'shantyA', in: 'A', fill: 'tom', crash: 'C' },
        { role: 'drums', kit: 'shantyB', in: 'B A2 T', fill: 'tom', crash: 'C' },
        { role: 'drums', kit: 'shantyC', in: 'C', fill: 'tom', crash: 'W' },
        { role: 'drums', kit: 'shantyP2', in: 'A B C A2 T', layer: 'p2' },
        { role: 'comp', inst: 'brass', in: 'A B', pat: 'x.....x.....', center: 55, n: 3, len: 1, vol: 0.55, layer: 'p2' },
        { role: 'answer', inst: 'reed', in: 'B', c: 72, vol: 0.7 },
        { role: 'guide', inst: 'strlead', in: 'B', lo: 60, hi: 72 },
      ],
      vary: [{}, { swap: { reed: 'accordion', violin: 'strlead' } }, { swap: { brass: 'horn' }, mute: ['counter'] }],
      aged: false,
    },

    // ═══ 第三章 Boss 甲龜：火山的太鼓＋銅管。A 小調帶弗里吉亞的 B♭、132 BPM；
    // 銅管主旋律、弦樂十六分急奏、C 段太鼓合奏與低音法國號的吟唱、鑼。
    bossTortoise: {
      bpm: 132, verb: 0.3, gain: 0.95, duckAmb: 0.85,
      form: 'in:2 A:8 A2:8 B:8 C:8 A3:8 T:2',
      P: {
        t1: 'A4/3 C5/3 E5/2 A5/8 | Bb5/3 A5/3 F5/2 D5/8 | E5/3 A5/3 C6/2 B5/4 A5/4 | Bb5/12 A5/4',
        t2: 'C6/3 A5/3 F5/2 C6/4 F6/4 | D6/3 B5/3 G5/2 D6/4 G6/4 | E6/6 D6/2 C6/4 A5/4 | A5/8 G#5/8',
        t3: 'F5/3 A5/3 D6/2 F6/8 | F6/3 D6/3 Bb5/2 D6/4 F6/4 | E6/6 B5/2 A5/4 B5/4 | G#5/16',
        tb: 'A5/6 C6/2 E6/8 | D6/6 B5/2 G5/8 | E5/3 G5/3 B5/2 E6/8 | C6/6 B5/2 A5/8',
        tb2: 'F5/3 A5/3 C6/2 E6/8 | D6/3 B5/3 G5/2 B5/8 | Bb5/8 C6/8 | B5/8 G#5/8',
        tc: 'A4/4 A4/4 C5/4 B4/4 | Bb4/16 | A4/4 A4/4 E5/4 D5/4 | C5/16 | A4/4 A4/4 C5/4 B4/4 | Bb4/16 | A4/4 C5/4 E5/4 F5/4 | E5/16',
        t: 'C6/8 A5/8 | B5/8 G#5/8',
      },
      chords:
        'Am Am ' +
        'Am Bb/A Am Bb/A F G Am Esus4:E ' +
        'Am Bb/A Am Bb/A Dm7 Bb Esus4 E ' +
        'Fmaj7 G Em7 Am Fmaj7 G Bb:C Esus4:E ' +
        'Am Bb/A Am F Am Bb/A Am Esus4:E ' +
        'Am Bb/A Am Bb/A F G Am Esus4:E ' +
        'F Esus4:E',
      voices: [
        { inst: 'brass', m: '@t1 @t2', at: 'A' },
        { inst: 'brass', m: '@t1 @t3', at: 'A2' },
        { inst: 'horn', m: '@t1 @t3', at: 'A2', oct: -12, vol: 0.6, role: 'counter', pan: -0.25 },
        { inst: 'horn', m: '@tb @tb2', at: 'B', vol: 1.2 },
        { inst: 'trumpet', m: '@tb2', at: 'B+4', vol: 0.6, role: 'counter', pan: 0.25 },
        { inst: 'horn', m: '@tc', at: 'C', vol: 1.3 },
        { inst: 'trumpet', m: '@t1 @t2', at: 'A3' },
        { inst: 'brass', m: '@t1 @t2', at: 'A3', oct: -12, vol: 0.6, role: 'counter', pan: -0.25 },
        { inst: 'brass', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'choir', in: 'A2 B C A3 T', center: 57, n: 3, vol: 0.8 },
        { role: 'pad', inst: 'lowstr', in: 'in A', center: 52, n: 3, vol: 0.9 },
        { role: 'arp', inst: 'ostinato', in: 'A A2 B A3 T', rate: 1, seq: [0, 0, 2, 0, 1, 0, 3, 0], lo: 45, vol: 0.9 },
        { role: 'comp', inst: 'brass', in: 'A A2 B A3', pat: 'X.....x...x.....', center: 57, n: 3, len: 1, vol: 0.8 },
        { role: 'bass', inst: 'synbass', pat: 'R.RR..R.R.R...5.' },
        { role: 'drums', kit: 'volcIn', in: 'in' },
        { role: 'drums', kit: 'volcA', in: 'A A2 A3', fill: 'taiko', fillLen: 8, crash: 'C' },
        { role: 'drums', kit: 'volcB', in: 'B T', fill: 'taiko', fillLen: 8, crash: 'C' },
        { role: 'drums', kit: 'volcC', in: 'C', fill: 'taiko', fillLen: 8 },
        { role: 'drums', kit: 'volcP2', in: 'A A2 B C A3 T', layer: 'p2' },
        { role: 'arp', inst: 'pluck', in: 'A A2 B C A3 T', rate: 1, seq: [0, 0, 2, 0, 3, 0, 2, 4], lo: 57, pat: 'x.xx.xx.x.xx.x.x', vol: 1.1, layer: 'p2' },
        { role: 'answer', inst: 'horn', in: 'A', c: 67 },
        { role: 'guide', inst: 'strlead', in: 'B', lo: 60, hi: 72 },
      ],
      vary: [{}, { swap: { brass: 'trumpet', trumpet: 'brass' } }, { swap: { horn: 'cello' }, mute: ['counter'] }],
      aged: false,
    },

    // ═══ 第四章 Boss 霜靈：冷、以鐘推動、不停。D 小調 160 BPM；
    // 冰鈴八分音符從頭到尾不停、弦樂長音主旋律、B 段整段往上一個全音、C 段只剩管鐘與合唱。
    bossFrost: {
      bpm: 160, verb: 0.42, gain: 1.0, duckAmb: 0.85,
      form: 'in:2 A:8 A2:8 B:8 C:8 A3:8 T:2',
      P: {
        f1: 'D6/8 E6/4 F6/4 | A6/12 G6/4 | F6/8 D6/8 | Bb5/16 | G5/8 A5/4 Bb5/4 | D6/12 C6/4 | D6/8 E6/8 | C#6/16',
        f2: 'D6/8 E6/4 F6/4 | A6/12 G6/4 | F6/8 A6/8 | G6/8 E6/8 | Bb6/8 A6/4 G6/4 | F6/12 D6/4 | Bb5/8 G5/8 | A5/16',
        fc: 'D5/16 | F5/16 | G5/16 | E5/16 | D5/16 | F5/16 | Bb5/16 | A5/16',
        t: 'F6/8 D6/8 | E6/8 C#6/8',
      },
      chords:
        'Dm Dm ' +
        'Dm Dm Bb Bb Gm Gm A7sus4 A ' +
        'Dm Dm/C Bbmaj7 A7 Gm Gm/F Em7b5 A7 ' +
        'Em Em C C Am Am B7sus4 B ' +
        'Dm Bb Gm A Dm Bb Gm A ' +
        'Dm Dm/C Bbmaj7 A7 Gm Gm/F Em7b5 A7 ' +
        'Bb A7',
      voices: [
        { inst: 'violin', m: '@f1', at: 'A' },
        { inst: 'cello', m: '@f1', at: 'A', oct: -12, vol: 0.6, role: 'counter', pan: -0.25 },
        { inst: 'violin', m: '@f2', at: 'A2' },
        { inst: 'icebell', m: '@f2', at: 'A2', vol: 0.35, role: 'orn', pan: 0.3 },
        { inst: 'trumpet', m: '@f1^2', at: 'B' },
        { inst: 'horn', m: '@f1^2', at: 'B', oct: -12, vol: 0.7, role: 'counter', pan: -0.25 },
        { inst: 'bell', m: '@fc', at: 'C', role: 'orn', vol: 1.1 },
        { inst: 'violin', m: '@f2', at: 'A3' },
        { inst: 'brass', m: '@f2', at: 'A3', oct: -12, vol: 0.6, role: 'counter', pan: -0.25 },
        { inst: 'violin', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'arp', inst: 'icebell', in: 'in A A2 B A3 T', rate: 2, seq: [0, 2, 1, 3, 2, 4, 3, 1], lo: 62, vol: 0.7 },
        { role: 'arp', inst: 'bell', in: 'C', rate: 4, seq: [0, 2, 1, 3], lo: 62, vol: 0.5 },
        { role: 'arp', inst: 'ostinato', in: 'A2 B A3', rate: 1, seq: [0, 0, 2, 0, 1, 0, 2, 0], lo: 50, vol: 0.8 },
        { role: 'pad', inst: 'ooh', in: 'A C A3', center: 57, n: 3, vol: 0.8 },
        { role: 'pad', inst: 'frost', in: 'in A A2 B', center: 64, n: 3, vol: 0.6 },
        { role: 'pad', inst: 'strings', in: 'A2 B A3 T', center: 55, n: 3, vol: 0.7 },
        { role: 'bass', inst: 'synbass', pat: 'R.R.R.R.R.R.R.R.' },
        { role: 'drums', kit: 'frostIn', in: 'in' },
        { role: 'drums', kit: 'frostA', in: 'A A2 A3 T', fill: 'snare', crash: 'C' },
        { role: 'drums', kit: 'frostB', in: 'B', fill: 'snare', fillLen: 8, crash: 'C' },
        { role: 'drums', kit: 'frostC', in: 'C', crash: 'C' },
        { role: 'drums', kit: 'frostP2', in: 'A A2 B C A3 T', layer: 'p2' },
        { role: 'arp', inst: 'crystal', in: 'A A2 B C A3 T', rate: 1, seq: [7, 5, 6, 4], lo: 76, pat: 'x.x.x.x.x.x.x.x.', vol: 0.45, layer: 'p2' },
        { role: 'guide', inst: 'strlead', in: 'B', lo: 60, hi: 72 },
      ],
      vary: [{}, { swap: { violin: 'cello', cello: 'violin' } }, { swap: { icebell: 'crystal' } }],
      aged: false,
    },

    // ═══ 終章 Boss 時間（第一階段）：壯闊、機械的時鐘。C 小調 116 BPM；
    // 大鍵琴十六分音符像齒輪、滴答與定音鼓、管風琴與合唱；銅管主旋律，B 段轉降 A 大調。
    time: {
      bpm: 116, verb: 0.45, gain: 1.0, duckAmb: 0.85,
      form: 'in:2 A:8 A2:8 B:8 C:8 A3:8 T:2',
      P: {
        k1: 'C5/8 G5/8 | Ab5/6 G5/2 Eb5/8 | F5/8 C6/8 | B5/12 G5/4',
        k2: 'C6/6 D6/2 Eb6/8 | C6/6 Bb5/2 Ab5/8 | F5/6 G5/2 Ab5/4 C6/4 | D6/8 B5/8',
        k3: 'Bb5/6 C6/2 D6/8 | Eb6/6 D6/2 C6/8 | Ab5/6 F5/2 D5/8 | B4/8 D5/4 F5/4',
        kb: 'Eb6/8 C6/4 Ab5/4 | D6/8 Bb5/4 F5/4 | D6/6 Eb6/2 F6/8 | G6/12 Eb6/4 | Ab6/6 G6/2 F6/4 C6/4 | D6/6 C6/2 Bb5/8 | Bb5/6 D6/2 G6/8 | F6/8 D6/4 B5/4',
        kc: 'C5/16 | G4/16 | Db5/16 | Ab4/16 | C5/16 | Eb5/16 | F5/16 | D5/16',
        mo: 'G4/4 C5/4 Bb4/8 | C5/4 Eb5/4 D5/8',
        t: 'C6/8 Eb6/8 | D6/8 B5/8',
      },
      chords:
        'Cm Cm ' +
        'Cm Ab/C Fm/C G/B Cm Ab Fm G7sus4:G7 ' +
        'Cm Ab/C Fm/C G/B Ebmaj7 Ab Dm7b5 G7 ' +
        'Abmaj7 Bb Gm7 Cm7 Fm7 Bb Ebmaj7 G7 ' +
        'Cm Cm Db/C Db/C Cm Cm Db/C G7 ' +
        'Cm Ab/C Fm/C G/B Cm Ab Fm G7sus4:G7 ' +
        'Ab G7',
      voices: [
        { inst: 'bell', m: '@mo', at: 'in', role: 'orn', vol: 0.9 },
        { inst: 'brass', m: '@k1 @k2', at: 'A' },
        { inst: 'horn', m: '@k1 @k3', at: 'A2', vol: 1.2 },
        { inst: 'violin', m: '@k1 @k3', at: 'A2', oct: 12, vol: 0.5, role: 'counter', pan: 0.25 },
        { inst: 'violin', m: '@kb', at: 'B' },
        { inst: 'brass', m: '@kb', at: 'B', oct: -12, vol: 0.6, role: 'counter', pan: -0.25 },
        { inst: 'bell', m: '@kc', at: 'C', role: 'orn', vol: 1.0 },
        { inst: 'brass', m: '@k1 @k2', at: 'A3' },
        { inst: 'violin', m: '@k1 @k2', at: 'A3', oct: 12, vol: 0.55, role: 'counter', pan: 0.25 },
        { inst: 'brass', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'pad', inst: 'pipe', in: 'A2 B C A3', center: 55, n: 4, vol: 0.8 },
        { role: 'pad', inst: 'strings', in: 'in A', center: 55, n: 3, vol: 0.8 },
        { role: 'pad', inst: 'choir', in: 'B A3 T', center: 62, n: 3, vol: 0.7 },
        { role: 'arp', inst: 'harpsi', rate: 1, seq: [0, 2, 1, 2, 0, 2, 1, 3], lo: 60, vol: 0.7 },
        { role: 'arp', inst: 'celesta', in: 'A2 B', rate: 4, seq: [4, 3, 2, 1], lo: 72, vol: 0.5 },
        { role: 'bass', inst: 'synbass', in: 'A A2 B A3 T', pat: 'R...R...R...R...' },
        { role: 'bass', inst: 'lowbow', in: 'in C', pat: 'R' + dots(15) },
        { role: 'drums', kit: 'timeIn', in: 'in C', crash: 'G' },
        { role: 'drums', kit: 'timeA', in: 'A A2 A3', fill: 'tom', crash: 'G' },
        { role: 'drums', kit: 'timeB', in: 'B T', fill: 'tom', fillLen: 8, crash: 'G' },
        { role: 'answer', inst: 'crystal', in: 'A', c: 79 },
        { role: 'guide', inst: 'strlead', in: 'B', lo: 60, hi: 72 },
        { role: 'gliss', inst: 'harp', lo: 60 },
      ],
      vary: [{}, { swap: { brass: 'horn', horn: 'brass' } }],
      aged: false,
    },

    // ═══ 時間（第二階段「碎開」）：同一份材料被敲碎。7/8、150 BPM；
    // 第一階段的主題變成星屑般的碎片（音被拿掉、跳八度），齒輪 riff 錯位、滴答打亂、倒轉的湧聲。
    time2: {
      bpm: 150, verb: 0.5, gain: 1.0, duckAmb: 0.85,
      barLen: 14,
      form: 'in:2 A:8 B:8 C:8 A2:8 T:2',
      P: {
        x1: 'C6/2 r/2 G6/4 r/2 C7/4 | Ab6/2 G6/2 r/4 Eb6/6 | F5/2 r/2 C6/2 F6/2 r/6 | B6/6 r/2 G6/2 D6/4',
        x2: 'C6/2 D6/2 Eb6/4 r/2 G6/4 | C7/2 Bb6/2 Ab6/4 r/6 | F6/2 G6/2 Ab6/2 C7/2 r/6 | D7/4 B6/4 G6/6',
        xl: 'C5/14 | Eb5/14 | F5/14 | D5/14 | G5/14 | Ab5/14 | C6/14 | B5/14',
        xb: 'Eb6/4 r/2 C6/2 Ab5/6 | D6/4 r/2 Bb5/2 F5/6 | D6/2 Eb6/2 F6/4 r/6 | G6/10 Eb6/4 | Ab6/2 G6/2 F6/2 C6/2 r/6 | D6/2 C6/2 Bb5/4 r/6 | Bb5/2 D6/2 G6/10 | F6/4 D6/4 B5/6',
        xc: 'C5/14 | Db5/14 | Eb5/14 | F5/14 | Eb5/14 | D5/14 | C5/14 | B4/14',
        mo: 'G5/2 C6/2 Bb5/3 r/7 | C6/2 Eb6/2 D6/3 r/7',
        t: 'C6/4 Eb6/4 Ab6/6 | G6/4 F6/4 D6/6',
      },
      chords:
        'Cm Cm ' +
        'Cm Ab/C Fm/C G/B Cm Ab Fm G7 ' +
        'Abmaj7 Bb Gm7 Cm7 Fm7 Bb Ebmaj7 G7 ' +
        'Cm Db/C Cm Db/C Ab G Ab G7 ' +
        'Cm Ab/C Fm/C G/B Cm Ab Fm G7 ' +
        'Ab G7',
      voices: [
        { inst: 'crystal', m: '@mo', at: 'in', role: 'orn', vol: 1.2 },
        { inst: 'crystal', m: '@x1 @x2', at: 'A', vol: 1.3 },
        { inst: 'violin', m: '@xl', at: 'A', vol: 0.7, role: 'counter', pan: -0.2 },
        { inst: 'brass', m: '@xb', at: 'B' },
        { inst: 'crystal', m: '@xb', at: 'B', oct: 12, vol: 0.4, role: 'orn', pan: 0.3 },
        { inst: 'bell', m: '@xc', at: 'C', role: 'orn', vol: 1.0 },
        { inst: 'crystal', m: '@x1 @x2', at: 'A2', vol: 1.3 },
        { inst: 'brass', m: '@xl', at: 'A2', vol: 0.7, role: 'counter', pan: -0.2 },
        { inst: 'brass', m: '@t', at: 'T' },
      ],
      parts: [
        { role: 'arp', inst: 'harpsi', rate: 1, seq: [0, 2, 1, 3, 2, 4, 1], lo: 60, pat: 'x.xx.xx.xxx.x.', vol: 0.7 },
        { role: 'arp', inst: 'crystal', in: 'A2 C', rate: 2, seq: [7, 5, 6, 4, 5, 3, 4], lo: 72, pat: 'x.x.x...x.x.x.', vol: 0.4 },
        { role: 'pad', inst: 'frost', in: 'in A C', center: 64, n: 4, vol: 0.7 },
        { role: 'pad', inst: 'choir', in: 'B C A2 T', center: 60, n: 3, vol: 0.7 },
        { role: 'pad', inst: 'pipe', in: 'B A2', center: 52, n: 3, vol: 0.6 },
        { role: 'bass', inst: 'synbass', pat: 'R.R.R...R.R.R.' },
        { role: 'drums', kit: 'shatterIn', in: 'in C', crash: 'G' },
        { role: 'drums', kit: 'shatterA', in: 'A A2 T', fill: 'snare', crash: 'G' },
        { role: 'drums', kit: 'shatterB', in: 'B', fill: 'snare', crash: 'G' },
        { role: 'gliss', inst: 'crystal', lo: 72 },
      ],
      vary: [{}, { swap: { crystal: 'celesta', brass: 'horn' } }, { swap: { harpsi: 'pizz' }, mute: ['counter@A'] }],
      aged: false,
    },

    // ═══ 野外魔王：短、急。E 小調 156 BPM，一小節前奏＋兩段 8 小節；銅管主旋律、弦樂急奏、定音鼓。
    fieldboss: {
      bpm: 156, verb: 0.28, gain: 0.95, duckAmb: 0.85,
      form: 'in:1 A:8 B:8',
      P: {
        in: 'B4/2 B4/2 D#5/2 F#5/2 A5/8',
        fa: 'E5/3 G5/3 B5/2 E6/8 | E6/3 D6/3 C6/2 G5/8 | F#5/3 A5/3 D6/2 F#6/8 | D#6/8 F#6/4 B5/4 | E6/3 G6/3 B6/2 G6/8 | G6/3 E6/3 C6/2 E6/8 | C6/3 A5/3 E5/2 A5/8 | B5/16',
        fb: 'G5/6 A5/2 C6/8 | A5/6 B5/2 D6/8 | B5/6 D6/2 F#6/8 | G6/8 E6/8 | E6/6 G6/2 C6/8 | D6/6 F#6/2 A6/8 | F#6/6 A6/2 B6/4 A6/4 | F#6/8 D#6/8',
      },
      chords: 'B7 ' + 'Em C D B7 Em C Am B7 ' + 'C D Bm Em C D B7 B7',
      voices: [
        { inst: 'brass', m: '@in', at: 'in', role: 'orn' },
        { inst: 'brass', m: '@fa', at: 'A' },
        { inst: 'horn', m: '@fa', at: 'A', oct: -12, vol: 0.6, role: 'counter', pan: -0.25 },
        { inst: 'violin', m: '@fb', at: 'B' },
        { inst: 'brass', m: '@fb', at: 'B', oct: -12, vol: 0.6, role: 'counter', pan: -0.25 },
      ],
      parts: [
        { role: 'arp', inst: 'ostinato', rate: 1, seq: [0, 0, 2, 0, 1, 0, 2, 0], lo: 47, vol: 0.9 },
        { role: 'comp', inst: 'brass', in: 'A B', pat: 'x.....x...x.....', center: 58, n: 3, len: 1, vol: 0.7 },
        { role: 'pad', inst: 'strings', center: 55, n: 3, vol: 0.8 },
        { role: 'pad', inst: 'choir', in: 'B', center: 62, n: 3, vol: 0.6 },
        { role: 'bass', inst: 'synbass', pat: 'R.R.R.R.R.R.8.R.' },
        { role: 'drums', kit: 'fbIn', in: 'in' },
        { role: 'drums', kit: 'fbA', in: 'A', fill: 'snare', crash: 'C' },
        { role: 'drums', kit: 'fbB', in: 'B', fill: 'tom', fillLen: 8, crash: 'C' },
      ],
      vary: [{}, { swap: { brass: 'trumpet', violin: 'horn' } }],
      aged: false,
    },

    // ═══ 結局：放回心葉，時鐘又開始轉。只放一次（once），約 19 秒後接回神殿的曲子。
    // 滴答從很慢開始，第二小節音樂盒升上來，然後豎琴、弦樂慢慢回來。
    restart: {
      bpm: 64, verb: 0.6, gain: 1.3, once: true,
      form: 'A:2 B:3',
      P: {
        m: 'r/16 | D6/4 G6/4 A6/4 B6/4 | C7/8 B6/4 G6/4 | A6/8 F#6/4 E6/4 | B6/16',
        e: 'C6/8 B5/4 G5/4 | A5/8 F#5/4 E5/4 | B5/16',
      },
      chords: 'Gadd9 Gadd9 Cmaj7 Dadd9 Em9',
      voices: [
        { inst: 'musicbox', m: '@m', at: 'A' },
        { inst: 'celesta', m: '@e', at: 'B', vol: 0.5, role: 'counter', pan: 0.25 },
      ],
      parts: [
        { role: 'drums', kit: 'restartK' },
        { role: 'pad', inst: 'frost', in: 'B', center: 62, n: 4 },
        { role: 'pad', inst: 'choir', in: 'B', center: 64, n: 3, vol: 0.5 },
        { role: 'arp', inst: 'harp', in: 'B', rate: 2, seq: [0, 2, 4, 6, 4, 2, 1, 3], lo: 60, vol: 0.6 },
        { role: 'bass', inst: 'lowbow', in: 'B', pat: 'R' + dots(15) },
      ],
      aged: false,
    },
  });
})();
