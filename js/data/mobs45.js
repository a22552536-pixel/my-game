// 第四章、終章的怪物（v1.1）。設計：自然物 ＋ 劍與魔法的概念，概念變成行為（能力在 js/game/mobabil2.js）。
// 第四章約為第一章的 1.45 倍大、終章 1.6 倍；越後面越抽象（終章是時間、空間魔法）。規格：docs/SPEC-monsters.md
// 必須在 js/data/progression.js 之前載入。
(function () {
  'use strict';
  const M = G.data.monsters;
  const gold = (lv) => [Math.round(lv * 1.0), Math.round(lv * 1.8)];
  const add = (id, o) => {
    M[id] = Object.assign({ band: true, hpMul: 1, atkMul: 1, drops: { gold: gold(o.lv), equip: 0.004, potion: 0.035, mats: [[o.mat, 0.4]] } }, o);
  };

  // ── 第四章　霜鈴雪峰（Lv38–50）──
  add('echoferret', { name: '鎌鼬', lv: 38, art: 'echoferret', behavior: 'aggressive', abilities: ['echo'], speed: 90, w: 72, h: 52, sight: 380, mat: 'phantomgem' });
  add('crystalowl', { name: '白澤', lv: 39, art: 'crystalowl', behavior: 'passive', abilities: ['ranged', 'orbcast'], speed: 50, w: 70, h: 78, hpMul: 1.05, mat: 'owlcrystal',
    projectile: { kind: 'crystalorb', speed: 210, cd: 2.8, range: 480, homing: 1.4 } });
  add('avalanchehare', { name: '雪男', lv: 41, art: 'avalanchehare', behavior: 'aggressive', abilities: ['avalanche'], speed: 80, w: 66, h: 64, sight: 420, mat: 'runepaper' });
  add('drumyak', { name: '雷獸', lv: 42, art: 'drumyak', behavior: 'passive', abilities: ['drum'], speed: 40, w: 96, h: 84, hpMul: 1.35, atkMul: 1.05, mat: 'drumskin' });
  add('shadowwolf', { name: '影之芬里爾', lv: 44, art: 'shadowwolf', behavior: 'aggressive', abilities: ['shadow'], speed: 85, w: 92, h: 64, sight: 460, hpMul: 1.1, mat: 'shadowfur' });
  add('dreamsheep', { name: '雪女', lv: 45, art: 'dreamsheep', behavior: 'passive', abilities: ['sleep', 'icepin'], speed: 45, w: 72, h: 112, hpMul: 1.25, mat: 'dreamwool' });
  add('silencefox', { name: '九尾封印狐', lv: 46, art: 'silencefox', behavior: 'aggressive', abilities: ['foxfire'], speed: 80, w: 80, h: 66, sight: 400, hpMul: 1.05, mat: 'sealtalisman' });
  add('heartcedar', { name: '古松樹靈', lv: 48, art: 'heartcedar', behavior: 'passive', abilities: ['ranged', 'heart'], speed: 22, w: 100, h: 130, hpMul: 1.5, mat: 'lifecrystal',
    projectile: { kind: 'icicle', speed: 380, cd: 2.4, range: 460, count: 3 } });
  add('shieldbear', { name: '狛犬', lv: 49, art: 'shieldbear', behavior: 'aggressive', abilities: ['shield'], speed: 55, w: 110, h: 100, sight: 380, hpMul: 1.45, atkMul: 1.1, mat: 'shieldshard' });

  // ── 終章　時空間神殿（Lv50–60）──
  add('hourowl', { name: '時之鳳凰', lv: 51, art: 'hourowl', behavior: 'passive', abilities: ['ranged', 'rewind', 'phoenixfan'], speed: 50, w: 80, h: 90, hpMul: 1.1, mat: 'timesand',
    projectile: { kind: 'star', speed: 260, cd: 2.6, range: 460, count: 2 } });
  add('mirrordeer', { name: '鏡麒麟', lv: 52, art: 'mirrordeer', behavior: 'aggressive', abilities: ['mirror', 'prism'], speed: 75, w: 100, h: 110, sight: 420, hpMul: 1.15, mat: 'mirrorshard' });
  add('stopmoth', { name: '時停蝶', lv: 53, art: 'stopmoth', behavior: 'aggressive', abilities: ['timestop', 'clockhand'], speed: 60, w: 90, h: 80, sight: 440, mat: 'clockwing' });
  add('ouroboros', { name: '銜尾蛇', lv: 54, art: 'ouroboros', behavior: 'aggressive', abilities: ['ouro', 'strike'], speed: 60, w: 120, h: 70, sight: 420, hpMul: 1.25, mat: 'ouroscale',
    // v1.6：昂首蓄力，毒牙往前撲咬（fx.bite）
    strike: { flag: 'bite', range: 170, wind: 0.6, act: 0.22, rec: 0.5, reach: 50, h: 50, lunge: 300, dmg: 1.3, cd: [3, 4], sound: 'claw', col: '170,255,140' } });
  add('clocksnail', { name: '時之聖甲蟲', lv: 55, art: 'clocksnail', behavior: 'passive', abilities: ['haste', 'sundisc'], speed: 24, w: 90, h: 76, hpMul: 1.5, mat: 'brassgear' });
  add('pouchroo', { name: '虛空鯨', lv: 56, art: 'pouchroo', behavior: 'aggressive', abilities: ['portal'], speed: 70, w: 96, h: 110, sight: 460, hpMul: 1.2, atkMul: 1.05, mat: 'riftcloth' });
  add('gravjelly', { name: '重力魔眼', lv: 57, art: 'gravjelly', behavior: 'passive', abilities: ['ranged', 'gravity'], speed: 36, w: 100, h: 110, hpMul: 1.2, mat: 'darkstar',
    projectile: { kind: 'gravorb', speed: 170, cd: 3.2, range: 480, homing: 0.9, slow: 1.2 } });
  add('parallelfox', { name: '雙生天馬', lv: 58, art: 'parallelfox', behavior: 'aggressive', abilities: ['parallel', 'twincharge'], speed: 85, w: 90, h: 70, sight: 440, hpMul: 1.2, mat: 'twintail' });
  add('constellfish', { name: '星座魚', lv: 59, art: 'constellfish', behavior: 'aggressive', abilities: ['constell', 'starspit'], speed: 55, w: 120, h: 80, sight: 520, hpMul: 1.3, atkMul: 1.1, mat: 'stardust' });

  // 新美術還沒載入時的備援外觀
  const fb = {
    echoferret: ['matchlizard', 0], crystalowl: ['bellowsbat', 0], avalanchehare: ['angerrock', 0], drumyak: ['potgoat', 0], shadowwolf: ['magnetdillo', 0],
    dreamsheep: ['potgoat', 0], silencefox: ['moodchameleon', 0], heartcedar: ['candlesnake', 0], shieldbear: ['weightbeetle', 0],
    hourowl: ['bellowsbat', 0], mirrordeer: ['potgoat', 0], stopmoth: ['mapvulture', 0], ouroboros: ['candlesnake', 0], clocksnail: ['weightbeetle', 0],
    pouchroo: ['magnetdillo', 0], gravjelly: ['bulbjelly', 0], parallelfox: ['moodchameleon', 0], constellfish: ['kiteray', 0],
  };
  for (const id in fb) M[id].fallback = fb[id];

  Object.assign(G.data.items.materials, {
    phantomgem: { name: '鎌鼬之刃', price: 52, desc: '鎌鼬前肢掉下來的風刃，拿在手上會自己嗡嗡響。' },
    owlcrystal: { name: '白澤之眼', price: 54, desc: '白澤身上的一隻小眼睛化成的水晶，裡面映著明天。' },
    runepaper: { name: '雪男符', price: 57, desc: '雪男額頭上的符紙，小聲念一次，腳邊就會滾出雪球。' },
    drumskin: { name: '雷鼓皮', price: 60, desc: '雷獸背上的雷鼓皮，輕輕一敲就劈啪作響。' },
    shadowfur: { name: '芬里爾之毛', price: 64, desc: '影之芬里爾的毛，放在太陽下也沒有影子。' },
    dreamwool: { name: '雪女的冰簪', price: 66, desc: '雪女髮上掉下來的冰簪，握久了手會睏，像要在雪裡睡著。' },
    sealtalisman: { name: '九尾封符', price: 70, desc: '九尾封印狐尾巴上的封符，是一百年前的巫女寫的。' },
    lifecrystal: { name: '御神木之心', price: 76, desc: '古松樹靈心核裡的一小片紅水晶，還在一下一下地跳。' },
    shieldshard: { name: '狛犬石盾片', price: 80, desc: '狛犬石盾上崩下來的一角，刻著半個神紋。' },
    timesand: { name: '鳳凰時羽', price: 86, desc: '時之鳳凰的尾羽，羽尖流著往上跑的沙。' },
    mirrorshard: { name: '麒麟鏡鱗', price: 88, desc: '鏡麒麟身上的一片鏡鱗，照出來的你是反過來的。' },
    clockwing: { name: '時停蝶翅粉', price: 92, desc: '時停蝶翅膀上的金粉，灑在手上，手就慢半拍。' },
    ouroscale: { name: '銜尾蛇鱗', price: 95, desc: '銜尾蛇的鱗片，上面的符文繞一圈又回到起點。' },
    brassgear: { name: '聖甲蟲太陽石', price: 98, desc: '時之聖甲蟲推的太陽盤碎片，摸起來是溫的。' },
    riftcloth: { name: '虛空鯨鬚', price: 104, desc: '虛空鯨的鯨鬚，伸手摸過去，指尖會跑到很遠的地方。' },
    darkstar: { name: '魔眼星核', price: 108, desc: '重力魔眼瞳孔裡的小星核，口袋會被它拉得往下垂。' },
    twintail: { name: '天馬雙羽', price: 112, desc: '雙生天馬的羽毛，一金一銀，永遠一起飄。' },
    stardust: { name: '星座碎片', price: 118, desc: '星座魚身上掉下來的一顆星，還連著一小段光線。' },
  });
})();
