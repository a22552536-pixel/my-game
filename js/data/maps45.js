// 第四章「霜鈴雪峰」、終章「時空間神殿」的地圖（v1.1）。在 js/data/maps.js 之後、progression.js 之前載入。
// 地形沿用第三章已經測過走得通的骨架（平台、繩子），換主題、怪物與 NPC。
(function () {
  'use strict';
  const D = G.data;
  const M = D.maps;
  const clone = (id, rope) => ({
    w: M[id].w,
    h: M[id].h,
    platforms: M[id].platforms.map((p) => p.slice()),
    ropes: M[id].ropes.map((r) => [r[0], r[1], r[2], rope]),
  });

  // 第三章 Boss 房 → 第四章營地
  M['3-B'].portals.push({ id: 'r', x: 2130, p: 0, to: '4-1', target: 'l', req: 'lavaTortoiseDefeated', reqText: '打倒熔岩甲龜之後，往雪山的路才會打開' });
  // 小鹿和媽媽團圓之後，就不在森林裡等了
  (M['1-3'].npcs || []).forEach((n) => {
    if (n.id === 'fawn') n.noFlag = 'frostSpiritDefeated';
  });

  // ═════════ 第四章 霜鈴雪峰 ═════════
  M['4-1'] = Object.assign(clone('3-1', 'vine'), {
    name: '霜鈴村', region: 4, type: 'camp', theme: 'snowCamp',
    portals: [
      { id: 'l', x: 70, p: 0, to: '3-B', target: 'r' },
      { id: 'r', x: 2530, p: 0, to: '4-2', target: 'l' },
    ],
    start: { x: 180, p: 0 },
    npcs: [
      { id: 'foxmiko', x: 860, p: 0 },
      { id: 'yakelder', x: 1060, p: 0 },
      { id: 'harekid', x: 1260, p: 0 },
      { id: 'whitedeer', x: 1380, p: 0, flag: 'frostSpiritDefeated' },
      { id: 'fawn', x: 1450, p: 0, flag: 'frostSpiritDefeated' },
      { id: 'squirrel', x: 1560, p: 0 },
    ],
    camp: { x1: 800, x2: 1700 },
    signs: [
      { x: 740, p: 0, text: '霜鈴村　風一吹，整座村子的鈴鐺都會響。' },
      { x: 2380, p: 0, text: '→ 鈴風雪原　聽到兩次一樣的腳步聲，要回頭看。' },
    ],
    mobs: [
      { m: 'echoferret', p: 0, n: 3, x1: 1820, x2: 2400 },
      { m: 'echoferret', p: 1, n: 2 },
      { m: 'crystalowl', p: 2, n: 1 },
    ],
  });

  M['4-2'] = Object.assign(clone('3-2', 'vine'), {
    name: '鈴風雪原', region: 4, type: 'hunt', theme: 'snowField',
    portals: [
      { id: 'l', x: 70, p: 0, to: '4-1', target: 'r' },
      { id: 'r', x: 3330, p: 0, to: '4-3', target: 'l' },
    ],
    npcs: [{ id: 'marmot', x: 1150, p: 0 }],
    signs: [{ x: 230, p: 0, text: '鈴風雪原　雪球越滾越大的時候，跳起來。' }],
    mobs: [
      { m: 'echoferret', p: 0, n: 2, x1: 300, x2: 1400 },
      { m: 'avalanchehare', p: 0, n: 3, x1: 1500, x2: 3100 },
      { m: 'crystalowl', p: 1, n: 2 },
      { m: 'avalanchehare', p: 2, n: 2 },
      { m: 'crystalowl', p: 3, n: 2 },
      { m: 'echoferret', p: 4, n: 2 },
      { m: 'drumyak', p: 5, n: 1 },
      { m: 'avalanchehare', p: 6, n: 1 },
      { m: 'drumyak', p: 7, n: 1 },
      { m: 'crystalowl', p: 8, n: 2 },
    ],
  });

  M['4-3'] = Object.assign(clone('3-3', 'vine'), {
    name: '冰瀑鈴道', region: 4, type: 'explore', theme: 'iceFall',
    portals: [
      { id: 'l', x: 70, p: 0, to: '4-2', target: 'r' },
      { id: 'r', x: 2930, p: 0, to: '4-4', target: 'l' },
    ],
    chests: [
      { id: '4-3a', x: 430, p: 6 },
      { id: '4-3b', x: 2820, p: 7 },
    ],
    npcs: [
      { id: 'snowleopard', x: 1180, p: 0 },
      { id: 'greymane', x: 2600, p: 0, noFlag: 'frostSpiritDefeated' },
    ],
    signs: [{ x: 230, p: 0, text: '冰瀑鈴道　影子不跟著主人走的時候，快跑。' }],
    elites: [{ m: 'shadowwolf', p: 4, x: 1050 }],
    mobs: [
      { m: 'drumyak', p: 0, n: 2, x1: 400, x2: 1400 },
      { m: 'shadowwolf', p: 0, n: 2, x1: 1600, x2: 2400 },
      { m: 'avalanchehare', p: 1, n: 2 },
      { m: 'shadowwolf', p: 2, n: 1 },
      { m: 'dreamsheep', p: 3, n: 2 },
      { m: 'drumyak', p: 4, n: 1 },
      { m: 'dreamsheep', p: 5, n: 2 },
    ],
  });

  M['4-4'] = Object.assign(clone('3-4', 'vine'), {
    name: '千鈴參道', region: 4, type: 'hunt', theme: 'bellShrine',
    portals: [
      { id: 'l', x: 70, p: 0, to: '4-3', target: 'r' },
      { id: 'r', x: 3730, p: 0, to: '4-B', target: 'l' },
    ],
    npcs: [{ id: 'crane', x: 3420, p: 0 }],
    signs: [{ x: 3620, p: 0, text: '霜靈祭壇　鐘聲響起時，請低頭。' }],
    mobs: [
      { m: 'dreamsheep', p: 0, n: 2, x1: 400, x2: 1800 },
      { m: 'silencefox', p: 0, n: 2, x1: 2000, x2: 3300 },
      { m: 'shadowwolf', p: 1, n: 2 },
      { m: 'heartcedar', p: 2, n: 1 },
      { m: 'silencefox', p: 3, n: 2 },
      { m: 'shieldbear', p: 4, n: 1 },
      { m: 'heartcedar', p: 4, n: 1 },
      { m: 'silencefox', p: 5, n: 2 },
      { m: 'shieldbear', p: 6, n: 1 },
      { m: 'heartcedar', p: 7, n: 1 },
      { m: 'shieldbear', p: 8, n: 2 },
      { m: 'dreamsheep', p: 9, n: 2 },
      { m: 'heartcedar', p: 10, n: 1 },
      { m: 'shieldbear', p: 11, n: 1 },
    ],
  });

  M['4-B'] = Object.assign(clone('3-B', 'vine'), {
    name: '霜靈祭壇', region: 4, type: 'boss', theme: 'frostAltar',
    portals: [
      { id: 'l', x: 70, p: 0, to: '4-4', target: 'r' },
      { id: 'r', x: 2130, p: 0, to: '5-1', target: 'l', req: 'frostSpiritDefeated', reqText: '打倒霜靈之後，往雲上的階梯才會出現' },
    ],
    boss: { m: 'frostSpirit', x: 1600 },
  });

  // ═════════ 終章 時空間神殿 ═════════
  M['5-1'] = Object.assign(clone('3-1', 'vine'), {
    name: '神殿前庭', region: 5, type: 'camp', theme: 'templeCourt',
    portals: [
      { id: 'l', x: 70, p: 0, to: '4-B', target: 'r' },
      { id: 'r', x: 2530, p: 0, to: '5-2', target: 'l' },
    ],
    start: { x: 180, p: 0 },
    npcs: [
      { id: 'tortoisesage', x: 860, p: 0 },
      { id: 'sphinxcat', x: 1060, p: 0 },
      { id: 'greymane', x: 1260, p: 0 },
      { id: 'squirrel', x: 1520, p: 0 },
    ],
    camp: { x1: 800, x2: 1700 },
    signs: [
      { x: 740, p: 0, text: '神殿前庭　這裡的一天，是地上的一百年。' },
      { x: 2380, p: 0, text: '→ 回憶迴廊　走過的路，會在這裡再走一次。' },
    ],
    mobs: [
      { m: 'hourowl', p: 0, n: 2, x1: 1820, x2: 2400 },
      { m: 'clocksnail', p: 1, n: 1 },
      { m: 'hourowl', p: 2, n: 1 },
    ],
  });

  M['5-2'] = Object.assign(clone('3-2', 'vine'), {
    name: '回憶迴廊', region: 5, type: 'hunt', theme: 'timeCorridor',
    portals: [
      { id: 'l', x: 70, p: 0, to: '5-1', target: 'r' },
      { id: 'r', x: 3330, p: 0, to: '5-3', target: 'l' },
    ],
    signs: [{ x: 230, p: 0, text: '回憶迴廊　鏡子裡的東西，打一下就碎。' }],
    mobs: [
      { m: 'hourowl', p: 0, n: 2, x1: 300, x2: 1400 },
      { m: 'mirrordeer', p: 0, n: 3, x1: 1500, x2: 3100 },
      { m: 'clocksnail', p: 1, n: 1 },
      { m: 'mirrordeer', p: 2, n: 2 },
      { m: 'stopmoth', p: 3, n: 2 },
      { m: 'hourowl', p: 4, n: 2 },
      { m: 'stopmoth', p: 5, n: 2 },
      { m: 'mirrordeer', p: 6, n: 1 },
      { m: 'clocksnail', p: 7, n: 1 },
      { m: 'stopmoth', p: 8, n: 2 },
    ],
  });

  M['5-3'] = Object.assign(clone('3-3', 'vine'), {
    name: '倒轉庭園', region: 5, type: 'explore', theme: 'reverseGarden',
    portals: [
      { id: 'l', x: 70, p: 0, to: '5-2', target: 'r' },
      { id: 'r', x: 2930, p: 0, to: '5-4', target: 'l' },
    ],
    chests: [
      { id: '5-3a', x: 430, p: 6 },
      { id: '5-3b', x: 2820, p: 7 },
    ],
    npcs: [{ id: 'cloudmane', x: 1180, p: 0 }],
    signs: [{ x: 230, p: 0, text: '倒轉庭園　花往上掉，沙往上流，只有心往下沉。' }],
    elites: [{ m: 'pouchroo', p: 4, x: 1050 }],
    mobs: [
      { m: 'ouroboros', p: 0, n: 2, x1: 400, x2: 1400 },
      { m: 'pouchroo', p: 0, n: 2, x1: 1600, x2: 2400 },
      { m: 'stopmoth', p: 1, n: 2 },
      { m: 'ouroboros', p: 2, n: 1 },
      { m: 'clocksnail', p: 3, n: 1 },
      { m: 'pouchroo', p: 4, n: 1 },
      { m: 'ouroboros', p: 5, n: 2 },
    ],
  });

  M['5-4'] = Object.assign(clone('3-4', 'vine'), {
    name: '星之階梯', region: 5, type: 'hunt', theme: 'starStair',
    portals: [
      { id: 'l', x: 70, p: 0, to: '5-3', target: 'r' },
      { id: 'r', x: 3730, p: 0, to: '5-B', target: 'l' },
    ],
    signs: [{ x: 3620, p: 0, text: '時之王座　再往上，就沒有「以後」了。' }],
    mobs: [
      { m: 'ouroboros', p: 0, n: 2, x1: 400, x2: 1800 },
      { m: 'gravjelly', p: 0, n: 2, x1: 2000, x2: 3300 },
      { m: 'pouchroo', p: 1, n: 2 },
      { m: 'parallelfox', p: 2, n: 2 },
      { m: 'gravjelly', p: 3, n: 1 },
      { m: 'constellfish', p: 4, n: 1 },
      { m: 'parallelfox', p: 4, n: 1 },
      { m: 'gravjelly', p: 5, n: 2 },
      { m: 'constellfish', p: 6, n: 1 },
      { m: 'parallelfox', p: 7, n: 2 },
      { m: 'constellfish', p: 8, n: 1 },
      { m: 'gravjelly', p: 9, n: 1 },
      { m: 'parallelfox', p: 10, n: 1 },
      { m: 'constellfish', p: 11, n: 1 },
    ],
  });

  M['5-B'] = Object.assign(clone('3-B', 'vine'), {
    name: '時之王座', region: 5, type: 'boss', theme: 'timeThrone',
    portals: [{ id: 'l', x: 70, p: 0, to: '5-4', target: 'r' }],
    boss: { m: 'timeItself', x: 1500 },
  });

  D.mapOrder.push('4-1', '4-2', '4-3', '4-4', '4-B', '5-1', '5-2', '5-3', '5-4', '5-B');
  D.camps[4] = '4-1';
  D.camps[5] = '5-1';
})();
