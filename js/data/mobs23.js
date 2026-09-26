// 第二、三章的新怪物（v0.9）。設計：自然物 ＋ 一個不相干的概念，概念會變成行為（能力寫在 js/game/mobabil.js）。
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
  add('postcrab', { name: '郵差寄居蟹', lv: 13, art: 'postcrab', behavior: 'passive', abilities: ['ranged', 'mail'], speed: 60, w: 56, h: 46, hpMul: 1, mat: 'stamp',
    projectile: { kind: 'letter', speed: 240, cd: 2.4, range: 420, homing: 2.2 } });
  add('bulbjelly', { name: '燈泡水母', lv: 14, art: 'bulbjelly', behavior: 'passive', abilities: ['flicker'], speed: 34, w: 48, h: 60, hpMul: 1.05, mat: 'filament' });
  add('umbrellagull', { name: '雨傘海鷗', lv: 16, art: 'umbrellagull', behavior: 'aggressive', abilities: ['glide'], speed: 70, w: 52, h: 62, sight: 380, mat: 'rib' });
  add('alarmurchin', { name: '鬧鐘海膽', lv: 17, art: 'alarmurchin', behavior: 'passive', abilities: ['alarm'], speed: 26, w: 50, h: 50, hpMul: 1.15, mat: 'spring' });
  add('kiteray', { name: '風箏魟魚', lv: 18, art: 'kiteray', behavior: 'aggressive', abilities: ['kite'], speed: 80, w: 72, h: 44, sight: 460, mat: 'kitestring' });
  add('blockcoral', { name: '積木珊瑚', lv: 20, art: 'blockcoral', behavior: 'passive', abilities: ['split'], speed: 30, w: 58, h: 64, hpMul: 1.2, mat: 'block' });
  add('stampstar', { name: '印章海星', lv: 22, art: 'stampstar', behavior: 'aggressive', abilities: ['stamp'], speed: 60, w: 60, h: 46, sight: 360, hpMul: 1.1, mat: 'ink' });
  add('accordioneel', { name: '手風琴海鰻', lv: 24, art: 'accordioneel', behavior: 'aggressive', abilities: ['stretch'], speed: 70, w: 80, h: 40, sight: 320, hpMul: 1.1, atkMul: 1.1, mat: 'bellowskin' });
  add('musicturtle', { name: '八音盒海龜', lv: 25, art: 'musicturtle', behavior: 'passive', abilities: ['ranged', 'melody'], speed: 32, w: 70, h: 58, hpMul: 1.35, mat: 'comb',
    projectile: { kind: 'note', speed: 220, cd: 2.6, range: 460, count: 3, wave: 26, slow: 1.4 } });

  // ── 第三章　赤岩峽谷（Lv26–37）──
  add('matchlizard', { name: '火柴蜥', lv: 26, art: 'matchlizard', behavior: 'passive', abilities: ['ignite'], speed: 70, w: 60, h: 42, mat: 'matchhead' });
  add('angerrock', { name: '怒氣岩', lv: 27, art: 'angerrock', behavior: 'passive', abilities: ['rage'], speed: 40, w: 54, h: 54, hpMul: 1.25, mat: 'vein' });
  add('magnetdillo', { name: '磁鐵犰狳', lv: 28, art: 'magnetdillo', behavior: 'aggressive', abilities: ['magnet'], speed: 55, w: 68, h: 48, sight: 380, hpMul: 1.15, mat: 'lodestone' });
  add('candlesnake', { name: '燭台蛇', lv: 30, art: 'candlesnake', behavior: 'aggressive', abilities: ['ranged', 'candle'], speed: 42, w: 70, h: 70, sight: 440, mat: 'wax',
    projectile: { kind: 'fireball', speed: 300, cd: 2.3, range: 440, count: 3 } });
  add('weightbeetle', { name: '秤砣甲蟲', lv: 31, art: 'weightbeetle', behavior: 'passive', abilities: ['quake'], speed: 34, w: 72, h: 56, hpMul: 1.45, atkMul: 1.1, mat: 'weight' });
  add('bellowsbat', { name: '風箱蝙蝠', lv: 32, art: 'bellowsbat', behavior: 'aggressive', abilities: ['gust'], speed: 75, w: 64, h: 52, sight: 420, mat: 'bellowswing' });
  add('potgoat', { name: '陶甕山羊', lv: 35, art: 'potgoat', behavior: 'aggressive', abilities: ['potcharge', 'shatter'], speed: 60, w: 74, h: 72, sight: 380, hpMul: 1.3, atkMul: 1.15, mat: 'potshard' });
  add('moodchameleon', { name: '心情變色龍', lv: 36, art: 'moodchameleon', behavior: 'passive', abilities: ['mood'], speed: 50, w: 70, h: 52, hpMul: 1.25, mat: 'moodscale',
    projectile: { kind: 'tear', speed: 320, cd: 2.2, range: 420, count: 2 } });
  add('mapvulture', { name: '地圖禿鷹', lv: 37, art: 'mapvulture', behavior: 'aggressive', abilities: ['mark'], speed: 80, w: 84, h: 70, sight: 520, hpMul: 1.3, atkMul: 1.15, mat: 'mapscrap' });

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
    stamp: { name: '郵票', price: 14, desc: '郵差寄居蟹郵筒裡掉出來的郵票，蓋著看不懂的郵戳。' },
    filament: { name: '燈絲', price: 15, desc: '燈泡水母頭裡的細燈絲，摸起來麻麻的。' },
    rib: { name: '傘骨', price: 16, desc: '雨傘海鷗掉下來的傘骨，細細長長。' },
    spring: { name: '發條', price: 19, desc: '鬧鐘海膽肚子裡的發條，一拿起來就滴答滴答。' },
    kitestring: { name: '風箏線', price: 20, desc: '風箏魟魚尾巴上的線，怎麼拉都不會斷。' },
    block: { name: '積木', price: 21, desc: '積木珊瑚身上掉下來的一塊積木，上面還有齒痕。' },
    ink: { name: '印泥', price: 25, desc: '印章海星腳底的印泥，蓋在哪裡都洗不掉。' },
    bellowskin: { name: '風箱皮', price: 27, desc: '手風琴海鰻身上的摺皮，一拉就會發出聲音。' },
    comb: { name: '音梳', price: 28, desc: '八音盒海龜殼裡的金屬音梳，撥一下會叮一聲。' },
    matchhead: { name: '火柴頭', price: 30, desc: '火柴蜥頭上的火柴頭，千萬別拿去摩擦。' },
    vein: { name: '怒紋石', price: 31, desc: '怒氣岩身上那條青筋，現在還在跳。' },
    lodestone: { name: '磁石', price: 32, desc: '磁鐵犰狳背甲上的磁石，口袋裡的金葉都黏上去了。' },
    wax: { name: '燭蠟', price: 36, desc: '燭台蛇頭上滴下來的蠟，還溫溫的。' },
    weight: { name: '小秤砣', price: 37, desc: '秤砣甲蟲背上掉下來的小秤砣，小小一顆卻很重。' },
    bellowswing: { name: '風箱翼膜', price: 38, desc: '風箱蝙蝠翅膀上的皮，一搧就起風。' },
    potshard: { name: '陶片', price: 44, desc: '陶甕山羊碎掉的陶片，上面畫著山羊的圖案。' },
    moodscale: { name: '心情鱗片', price: 45, desc: '心情變色龍的鱗片，顏色會跟著拿的人的心情變。' },
    mapscrap: { name: '地圖殘頁', price: 46, desc: '地圖禿鷹翅膀上撕下來的一角，畫著一個 X。' },
  };
})();
