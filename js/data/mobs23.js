// 第二、三章的新怪物（v0.9，v1.1 換成奇幻概念）。設計：自然物 ＋ 一個不相干的劍與魔法概念，概念會變成行為（能力寫在 js/game/mobabil.js）。
// 第二章大約是第一章的 1.15 倍大、第三章 1.3 倍。舊的第二、三章怪物（螃蟹、水母、海鷗、蜥蜴、岩石、猴子）移除，
// 地圖、委託、材料、交換、對話裡的舊名字由 js/data/progression.js 依照 G.data.mobRemap 換成新的。
(function () {
  'use strict';
  const M = G.data.monsters;
  const gold = (lv) => [Math.round(lv * 1.0), Math.round(lv * 1.8)];
  const add = (id, o) => {
    M[id] = Object.assign({ band: true, hpMul: 1, atkMul: 1, drops: { gold: gold(o.lv), equip: 0.004, potion: 0.05, mats: [[o.mat, 0.4]] } }, o);
  };

  // ── 第二章　潮風海岬（Lv13–25）──
  add('postcrab', { name: '卷軸寄居蟹', lv: 13, art: 'postcrab', behavior: 'passive', abilities: ['ranged', 'mail'], speed: 60, w: 56, h: 46, hpMul: 1, mat: 'stamp',
    projectile: { kind: 'letter', speed: 240, cd: 2.4, range: 420, homing: 2.2 } });
  add('bulbjelly', { name: '鬼火水母', lv: 14, art: 'bulbjelly', behavior: 'passive', abilities: ['flicker'], speed: 34, w: 48, h: 60, hpMul: 1.05, mat: 'filament' });
  add('umbrellagull', { name: '巫師海鷗', lv: 16, art: 'umbrellagull', behavior: 'aggressive', abilities: ['glide'], speed: 70, w: 52, h: 62, sight: 380, mat: 'rib' });
  add('alarmurchin', { name: '符文鸚鵡螺', lv: 17, art: 'alarmurchin', behavior: 'passive', abilities: ['alarm'], speed: 26, w: 50, h: 50, hpMul: 1.15, mat: 'spring' });
  add('kiteray', { name: '槍騎魟魚', lv: 18, art: 'kiteray', behavior: 'aggressive', abilities: ['kite'], speed: 80, w: 72, h: 44, sight: 460, mat: 'kitestring' });
  add('blockcoral', { name: '海坊主', lv: 20, art: 'blockcoral', behavior: 'passive', abilities: ['split'], speed: 30, w: 58, h: 64, hpMul: 1.2, mat: 'block' });
  add('stampstar', { name: '封印海星', lv: 22, art: 'stampstar', behavior: 'aggressive', abilities: ['stamp'], speed: 60, w: 60, h: 46, sight: 360, hpMul: 1.1, mat: 'ink' });
  add('accordioneel', { name: '蛇腹劍海鰻', lv: 24, art: 'accordioneel', behavior: 'aggressive', abilities: ['stretch'], speed: 70, w: 80, h: 40, sight: 320, hpMul: 1.1, atkMul: 1.1, mat: 'bellowskin' });
  add('musicturtle', { name: '豎琴海龜', lv: 25, art: 'musicturtle', behavior: 'passive', abilities: ['ranged', 'melody'], speed: 32, w: 70, h: 58, hpMul: 1.35, mat: 'comb',
    projectile: { kind: 'note', speed: 220, cd: 2.6, range: 460, count: 3, wave: 26, slow: 1.4 } });

  // ── 第三章　赤岩峽谷（Lv26–37）──
  add('matchlizard', { name: '炎劍蜥', lv: 26, art: 'matchlizard', behavior: 'passive', abilities: ['ignite'], speed: 70, w: 60, h: 42, mat: 'matchhead' });
  add('angerrock', { name: '狂戰士岩', lv: 27, art: 'angerrock', behavior: 'passive', abilities: ['rage'], speed: 40, w: 54, h: 54, hpMul: 1.25, mat: 'vein' });
  add('magnetdillo', { name: '引力犰狳', lv: 28, art: 'magnetdillo', behavior: 'aggressive', abilities: ['magnet'], speed: 55, w: 68, h: 48, sight: 380, hpMul: 1.15, mat: 'lodestone' });
  add('candlesnake', { name: '三頭術士蛇', lv: 30, art: 'candlesnake', behavior: 'aggressive', abilities: ['ranged', 'candle'], speed: 42, w: 70, h: 70, sight: 440, mat: 'wax',
    projectile: { kind: 'fireball', speed: 300, cd: 2.3, range: 440, count: 3 } });
  add('weightbeetle', { name: '戰鎚甲蟲', lv: 31, art: 'weightbeetle', behavior: 'passive', abilities: ['quake'], speed: 34, w: 72, h: 56, hpMul: 1.45, atkMul: 1.1, mat: 'weight' });
  add('bellowsbat', { name: '魔導書蝙蝠', lv: 32, art: 'bellowsbat', behavior: 'aggressive', abilities: ['gust'], speed: 75, w: 64, h: 52, sight: 420, mat: 'bellowswing' });
  add('potgoat', { name: '重鎧山羊', lv: 35, art: 'potgoat', behavior: 'aggressive', abilities: ['potcharge', 'shatter'], speed: 60, w: 74, h: 72, sight: 380, hpMul: 1.3, atkMul: 1.15, mat: 'potshard' });
  add('moodchameleon', { name: '元素變色龍', lv: 36, art: 'moodchameleon', behavior: 'passive', abilities: ['mood'], speed: 50, w: 70, h: 52, hpMul: 1.25, mat: 'moodscale',
    projectile: { kind: 'tear', speed: 320, cd: 2.2, range: 420, count: 2 } });
  add('mapvulture', { name: '預言禿鷹', lv: 37, art: 'mapvulture', behavior: 'aggressive', abilities: ['mark'], speed: 80, w: 84, h: 70, sight: 520, hpMul: 1.3, atkMul: 1.15, mat: 'mapscrap' });

  // 新美術還沒載入時的備援外觀（借用舊怪物的圖）
  const fb = {
    postcrab: ['crab', 1], bulbjelly: ['jelly', 1], umbrellagull: ['gull', 1], alarmurchin: ['crab', 2], kiteray: ['jelly', 2],
    blockcoral: ['crab', 3], stampstar: ['gull', 2], accordioneel: ['jelly', 3], musicturtle: ['gull', 3],
    matchlizard: ['lizard', 1], angerrock: ['rock', 1], magnetdillo: ['monkey', 1], candlesnake: ['lizard', 2], weightbeetle: ['rock', 2],
    bellowsbat: ['monkey', 2], potgoat: ['lizard', 3], moodchameleon: ['rock', 3], mapvulture: ['monkey', 3],
  };
  for (const id in fb) M[id].fallback = fb[id];

  // 舊怪物 → 新怪物、舊材料 → 新材料（地圖、委託、交換、對話用）
  G.data.mobRemap = {
    sandcrab: 'postcrab', bubblejelly: 'bulbjelly', gullchick: 'umbrellagull', shellcrab: 'alarmurchin', lanternjelly: 'kiteray',
    wavegull: 'blockcoral', coralcrab: 'stampstar', moonjelly: 'accordioneel', albatross: 'musicturtle',
    flamelizard: 'matchlizard', pebble: 'angerrock', springmonkey: 'magnetdillo', moltenlizard: 'candlesnake', rockling: 'weightbeetle',
    redmonkey: 'bellowsbat', fireiguana: 'potgoat', springstatue: 'moodchameleon', mandrill: 'mapvulture',
  };
  G.data.matRemap = {
    sandgrain: 'stamp', jellydrop: 'filament', gullfeather: 'rib', shellpiece: 'spring', glowgel: 'kitestring', foam: 'block',
    coralbranch: 'ink', moonpearl: 'bellowskin', plume: 'comb',
    emberscale: 'matchhead', pebble: 'vein', towel: 'lodestone', magmashard: 'wax', rockheart: 'weight', redfur: 'bellowswing',
    fang: 'potshard', springstone: 'moodscale', maskshard: 'mapscrap',
  };
  G.data.newMaterials = {
    stamp: { name: '符文殘頁', price: 14, desc: '卷軸寄居蟹殼裡掉出來的卷軸碎片，上面的符文還在微微發光。' },
    filament: { name: '鬼火芯', price: 15, desc: '鬼火水母傘裡的一小團幽藍火苗，摸起來是冰的。' },
    rib: { name: '巫師帽羽', price: 16, desc: '巫師海鷗帽子上的羽毛，拿在手上會輕輕往上飄。' },
    spring: { name: '鸚鵡螺碎殼', price: 19, desc: '符文鸚鵡螺炸開時崩下來的殼片，上面的符文還在發燙。' },
    kitestring: { name: '斷槍尖', price: 20, desc: '槍騎魟魚折斷的長槍槍尖，還綁著一小段飄帶。' },
    block: { name: '墨潮珠', price: 21, desc: '海坊主身上凝成的一顆黑水珠。捏碎了，會變成兩顆。' },
    ink: { name: '封印墨', price: 25, desc: '封印海星畫法陣用的紫色墨水，沾到哪裡就封住哪裡。' },
    bellowskin: { name: '劍鱗', price: 27, desc: '蛇腹劍海鰻身上的一節刀刃，薄得像魚鱗。' },
    comb: { name: '豎琴弦', price: 28, desc: '豎琴海龜的琴弦，撥一下會讓人想睡。' },
    matchhead: { name: '炎劍碎片', price: 30, desc: '炎劍蜥背上的小劍斷片，一碰就冒火。' },
    vein: { name: '怒紋石', price: 31, desc: '狂戰士岩臉上的戰紋石片，現在還在發燙。' },
    lodestone: { name: '引力水晶', price: 32, desc: '引力犰狳背甲上的紫水晶，口袋裡的金葉都被吸過去了。' },
    wax: { name: '魔火帽', price: 36, desc: '三頭術士蛇的小巫師帽，帽尖的魔火還沒熄。' },
    weight: { name: '戰鎚碎片', price: 37, desc: '戰鎚甲蟲的戰鎚上崩下來的一角，刻著半個符文。' },
    bellowswing: { name: '風咒書頁', price: 38, desc: '魔導書蝙蝠翅膀上撕下來的書頁，一翻就起風。' },
    potshard: { name: '鎧甲碎片', price: 44, desc: '重鎧山羊碎掉的鎧甲片，上面刻著山羊家徽。' },
    moodscale: { name: '元素鱗片', price: 45, desc: '元素變色龍的鱗片，會跟著拿的人的心情變成紅、藍或黃。' },
    mapscrap: { name: '預言羽', price: 46, desc: '預言禿鷹翅膀上的羽毛，上面的眼睛花紋會眨。' },
  };
})();
