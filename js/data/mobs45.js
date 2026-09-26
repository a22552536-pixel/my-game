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
  add('echoferret', { name: '殘影雪貂', lv: 38, art: 'echoferret', behavior: 'aggressive', abilities: ['echo'], speed: 90, w: 72, h: 52, sight: 380, mat: 'phantomgem' });
  add('crystalowl', { name: '水晶球雪鴞', lv: 39, art: 'crystalowl', behavior: 'passive', abilities: ['ranged', 'orbcast'], speed: 50, w: 70, h: 78, hpMul: 1.05, mat: 'owlcrystal',
    projectile: { kind: 'crystalorb', speed: 210, cd: 2.8, range: 480, homing: 1.4 } });
  add('avalanchehare', { name: '雪崩符兔', lv: 41, art: 'avalanchehare', behavior: 'aggressive', abilities: ['avalanche'], speed: 80, w: 66, h: 64, sight: 420, mat: 'runepaper' });
  add('drumyak', { name: '戰鼓犛牛', lv: 42, art: 'drumyak', behavior: 'passive', abilities: ['drum'], speed: 40, w: 96, h: 84, hpMul: 1.35, atkMul: 1.05, mat: 'drumskin' });
  add('shadowwolf', { name: '影縛狼', lv: 44, art: 'shadowwolf', behavior: 'aggressive', abilities: ['shadow'], speed: 85, w: 92, h: 64, sight: 460, hpMul: 1.1, mat: 'shadowfur' });
  add('dreamsheep', { name: '夢咒綿羊', lv: 45, art: 'dreamsheep', behavior: 'passive', abilities: ['sleep'], speed: 45, w: 84, h: 72, hpMul: 1.25, mat: 'dreamwool' });
  add('silencefox', { name: '封印狐', lv: 46, art: 'silencefox', behavior: 'aggressive', abilities: ['seal'], speed: 80, w: 80, h: 66, sight: 400, hpMul: 1.05, mat: 'sealtalisman' });
  add('heartcedar', { name: '心核雪松', lv: 48, art: 'heartcedar', behavior: 'passive', abilities: ['ranged', 'heart'], speed: 22, w: 100, h: 130, hpMul: 1.5, mat: 'lifecrystal',
    projectile: { kind: 'icicle', speed: 380, cd: 2.4, range: 460, count: 3 } });
  add('shieldbear', { name: '冰盾熊', lv: 49, art: 'shieldbear', behavior: 'aggressive', abilities: ['shield'], speed: 55, w: 110, h: 100, sight: 380, hpMul: 1.45, atkMul: 1.1, mat: 'shieldshard' });

  // ── 終章　時空間神殿（Lv50–60）──
  add('hourowl', { name: '沙漏鴞', lv: 51, art: 'hourowl', behavior: 'passive', abilities: ['ranged', 'rewind'], speed: 50, w: 80, h: 90, hpMul: 1.1, mat: 'timesand',
    projectile: { kind: 'star', speed: 260, cd: 2.6, range: 460, count: 2 } });
  add('mirrordeer', { name: '鏡像鹿', lv: 52, art: 'mirrordeer', behavior: 'aggressive', abilities: ['mirror'], speed: 75, w: 100, h: 110, sight: 420, hpMul: 1.15, mat: 'mirrorshard' });
  add('stopmoth', { name: '時停蝶', lv: 53, art: 'stopmoth', behavior: 'aggressive', abilities: ['timestop'], speed: 60, w: 90, h: 80, sight: 440, mat: 'clockwing' });
  add('ouroboros', { name: '銜尾蛇', lv: 54, art: 'ouroboros', behavior: 'aggressive', abilities: ['ouro'], speed: 60, w: 120, h: 70, sight: 420, hpMul: 1.25, mat: 'ouroscale' });
  add('clocksnail', { name: '時計蝸牛', lv: 55, art: 'clocksnail', behavior: 'passive', abilities: ['haste'], speed: 24, w: 90, h: 76, hpMul: 1.5, mat: 'brassgear' });
  add('pouchroo', { name: '次元袋鼠', lv: 56, art: 'pouchroo', behavior: 'aggressive', abilities: ['portal'], speed: 70, w: 96, h: 110, sight: 460, hpMul: 1.2, atkMul: 1.05, mat: 'riftcloth' });
  add('gravjelly', { name: '重力水母', lv: 57, art: 'gravjelly', behavior: 'passive', abilities: ['ranged', 'gravity'], speed: 36, w: 100, h: 110, hpMul: 1.2, mat: 'darkstar',
    projectile: { kind: 'gravorb', speed: 170, cd: 3.2, range: 480, homing: 0.9, slow: 1.2 } });
  add('parallelfox', { name: '平行狐', lv: 58, art: 'parallelfox', behavior: 'aggressive', abilities: ['parallel'], speed: 85, w: 90, h: 70, sight: 440, hpMul: 1.2, mat: 'twintail' });
  add('constellfish', { name: '星座魚', lv: 59, art: 'constellfish', behavior: 'aggressive', abilities: ['constell'], speed: 55, w: 120, h: 80, sight: 520, hpMul: 1.3, atkMul: 1.1, mat: 'stardust' });

  // 新美術還沒載入時的備援外觀
  const fb = {
    echoferret: ['matchlizard', 0], crystalowl: ['bellowsbat', 0], avalanchehare: ['angerrock', 0], drumyak: ['potgoat', 0], shadowwolf: ['magnetdillo', 0],
    dreamsheep: ['potgoat', 0], silencefox: ['moodchameleon', 0], heartcedar: ['candlesnake', 0], shieldbear: ['weightbeetle', 0],
    hourowl: ['bellowsbat', 0], mirrordeer: ['potgoat', 0], stopmoth: ['mapvulture', 0], ouroboros: ['candlesnake', 0], clocksnail: ['weightbeetle', 0],
    pouchroo: ['magnetdillo', 0], gravjelly: ['bulbjelly', 0], parallelfox: ['moodchameleon', 0], constellfish: ['kiteray', 0],
  };
  for (const id in fb) M[id].fallback = fb[id];

  Object.assign(G.data.items.materials, {
    phantomgem: { name: '幻術寶石', price: 52, desc: '殘影雪貂額頭上的寶石，盯久了會看到兩個自己。' },
    owlcrystal: { name: '占卜水晶', price: 54, desc: '水晶球雪鴞抱著的水晶碎片，裡面有一點點明天的雪。' },
    runepaper: { name: '雪崩符紙', price: 57, desc: '雪崩符兔耳朵上的符紙，小聲念一次，腳邊就會滾出雪球。' },
    drumskin: { name: '符文鼓皮', price: 60, desc: '戰鼓犛牛鼓面上的一塊皮，輕輕一敲，心跳就跟著變快。' },
    shadowfur: { name: '影狼毛', price: 64, desc: '影縛狼的毛，放在太陽下也沒有影子。' },
    dreamwool: { name: '夢咒羊毛', price: 66, desc: '夢咒綿羊的紫色羊毛，枕在頭下會做很長的夢。' },
    sealtalisman: { name: '封印符', price: 70, desc: '封印狐尾巴上撕下來的符紙，貼在嘴巴上就說不出話。' },
    lifecrystal: { name: '生命水晶', price: 76, desc: '心核雪松心臟裡的一小片水晶，還在一下一下地跳。' },
    shieldshard: { name: '冰盾碎片', price: 80, desc: '冰盾熊塔盾上崩下來的冰晶，刻著半個聖紋。' },
    timesand: { name: '時之沙', price: 86, desc: '沙漏鴞身體裡的沙，倒過來也會往上流。' },
    mirrorshard: { name: '鏡晶', price: 88, desc: '鏡像鹿鹿角上的鏡面水晶，照出來的你是反過來的。' },
    clockwing: { name: '錶盤鱗粉', price: 92, desc: '時停蝶翅膀上的金粉，灑在手上，手就慢半拍。' },
    ouroscale: { name: '輪迴鱗', price: 95, desc: '銜尾蛇的鱗片，上面的符文繞一圈又回到起點。' },
    brassgear: { name: '黃銅齒輪', price: 98, desc: '時計蝸牛殼上的小齒輪，放在桌上會自己轉。' },
    riftcloth: { name: '次元布', price: 104, desc: '次元袋鼠育兒袋的內襯，伸手進去摸得到很遠的地方。' },
    darkstar: { name: '小黑星', price: 108, desc: '重力水母傘裡的小黑星，口袋會被它拉得往下垂。' },
    twintail: { name: '平行狐尾毛', price: 112, desc: '平行狐的尾毛，一根拿起來，另一個世界的也少了一根。' },
    stardust: { name: '星座碎片', price: 118, desc: '星座魚身上掉下來的一顆星，還連著一小段光線。' },
  });
})();
