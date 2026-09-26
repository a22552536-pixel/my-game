// 地圖資料。
// platforms：[x1, x2, y]，y 是站立的表面高度；第 0 個固定是地面（不能往下跳穿）。
// ropes：[x, 上端 y, 下端 y, 'vine' | 'ladder']，上下端要對齊平台表面。
// portals：{ id, x, p（所在平台）, to（目標地圖）, target（目標傳送門 id） }
// mobs：{ m（怪物 id）, p（平台）, n（數量）, x1?, x2?（限制範圍） }
// 跳躍高度約 116px，層距超過就要放繩子。
G.data.maps = {
  '1-1': {
    name: '苔光小徑', region: 1, type: 'camp', theme: 'forestMorning',
    w: 2600, h: 820,
    platforms: [
      [0, 2600, 740],
      [260, 700, 640],
      [1560, 1960, 640],
      [420, 660, 520],
      [1700, 1900, 545],
    ],
    ropes: [
      [560, 520, 640, 'vine'],
    ],
    portals: [
      { id: 'r', x: 2530, p: 0, to: '1-2', target: 'l' },
    ],
    start: { x: 180, p: 0 },
    npcs: [
      { id: 'owl', x: 1060, p: 0 },
      { id: 'hedgehog', x: 1230, p: 0 },
      { id: 'squirrel', x: 1400, p: 0 },
    ],
    camp: { x1: 980, x2: 1480 },
    mobs: [
      { m: 'dewsnail', p: 0, n: 4, x1: 420, x2: 900 },
      { m: 'dewsnail', p: 1, n: 2 },
      { m: 'dewsnail', p: 0, n: 2, x1: 1700, x2: 2350 },
    ],
  },

  '1-2': {
    name: '蘑菇林地', region: 1, type: 'hunt', theme: 'forestMushroom',
    w: 3400, h: 1100,
    platforms: [
      [0, 3400, 1020],
      [200, 1100, 880],
      [1400, 2300, 880],
      [2600, 3200, 880],
      [500, 1500, 740],
      [1800, 2900, 740],
      [300, 900, 600],
      [1200, 2000, 600],
      [2400, 3100, 600],
    ],
    ropes: [
      [300, 880, 1020, 'vine'],
      [2000, 880, 1020, 'vine'],
      [3000, 880, 1020, 'vine'],
      [950, 740, 880, 'vine'],
      [2100, 740, 880, 'vine'],
      [700, 600, 740, 'vine'],
      [1300, 600, 740, 'vine'],
      [2650, 600, 740, 'vine'],
    ],
    portals: [
      { id: 'l', x: 70, p: 0, to: '1-1', target: 'r' },
      { id: 'r', x: 3330, p: 0, to: '1-3', target: 'l' },
    ],
    mobs: [
      { m: 'dewsnail', p: 0, n: 2, x1: 300, x2: 1400 },
      { m: 'capshroom', p: 0, n: 3, x1: 1500, x2: 3100 },
      { m: 'dewsnail', p: 1, n: 2 },
      { m: 'capshroom', p: 2, n: 2 },
      { m: 'seedling', p: 3, n: 2 },
      { m: 'capshroom', p: 4, n: 2 },
      { m: 'seedling', p: 5, n: 2 },
      { m: 'seedling', p: 6, n: 1 },
      { m: 'mosssnail', p: 7, n: 2 },
      { m: 'mosssnail', p: 8, n: 2 },
    ],
  },

  '1-3': {
    name: '木漏日深谷', region: 1, type: 'explore', theme: 'forestDeep',
    w: 3000, h: 1000,
    platforms: [
      [0, 3000, 920],
      [300, 800, 790],
      [1300, 1800, 790],
      [2200, 2700, 790],
      [600, 1400, 660],
      [1900, 2500, 660],
      [350, 700, 530],
      [2450, 2900, 530],
    ],
    ropes: [
      [700, 790, 920, 'vine'],
      [1500, 790, 920, 'vine'],
      [2300, 790, 920, 'vine'],
      [760, 660, 790, 'vine'],
      [2420, 660, 790, 'vine'],
      [650, 530, 660, 'vine'],
      [2470, 530, 660, 'vine'],
    ],
    portals: [
      { id: 'l', x: 70, p: 0, to: '1-2', target: 'r' },
      { id: 'r', x: 2930, p: 0, to: '1-4', target: 'l' },
    ],
    chests: [
      { id: '1-3a', x: 430, p: 6 },
      { id: '1-3b', x: 2820, p: 7 },
    ],
    elites: [
      { m: 'spotshroom', p: 4, x: 1050 },
    ],
    mobs: [
      { m: 'mosssnail', p: 0, n: 2, x1: 400, x2: 1400 },
      { m: 'sproutling', p: 0, n: 2, x1: 1700, x2: 2700 },
      { m: 'spotshroom', p: 1, n: 1 },
      { m: 'sproutling', p: 2, n: 2 },
      { m: 'seedling', p: 3, n: 2 },
      { m: 'spotshroom', p: 5, n: 1 },
    ],
  },

  '1-4': {
    name: '古樹根洞', region: 1, type: 'hunt', theme: 'rootCave',
    w: 3800, h: 1200,
    platforms: [
      [0, 3800, 1120],
      [150, 1000, 980],
      [1250, 2150, 980],
      [2400, 3300, 980],
      [400, 1400, 840],
      [1700, 2700, 840],
      [2950, 3650, 840],
      [200, 900, 700],
      [1100, 2000, 700],
      [2300, 3100, 700],
      [700, 1500, 560],
      [2600, 3400, 560],
    ],
    ropes: [
      [250, 980, 1120, 'vine'],
      [1350, 980, 1120, 'vine'],
      [2500, 980, 1120, 'vine'],
      [3200, 980, 1120, 'vine'],
      [900, 840, 980, 'vine'],
      [2000, 840, 980, 'vine'],
      [3100, 840, 980, 'vine'],
      [600, 700, 840, 'vine'],
      [1900, 700, 840, 'vine'],
      [2500, 700, 840, 'vine'],
      [1200, 560, 700, 'vine'],
      [2900, 560, 700, 'vine'],
    ],
    portals: [
      { id: 'l', x: 70, p: 0, to: '1-3', target: 'r' },
      { id: 'r', x: 3730, p: 0, to: '1-B', target: 'l' },
    ],
    mobs: [
      { m: 'woodsnail', p: 0, n: 2, x1: 400, x2: 1800 },
      { m: 'spotshroom', p: 0, n: 2, x1: 2000, x2: 3500 },
      { m: 'mosssnail', p: 1, n: 2 },
      { m: 'sproutling', p: 2, n: 2 },
      { m: 'spotshroom', p: 3, n: 2 },
      { m: 'sproutling', p: 4, n: 2 },
      { m: 'woodsnail', p: 5, n: 2 },
      { m: 'lampshroom', p: 6, n: 1 },
      { m: 'lampshroom', p: 7, n: 1 },
      { m: 'flowerling', p: 8, n: 2 },
      { m: 'woodsnail', p: 9, n: 1 },
      { m: 'lampshroom', p: 9, n: 1 },
      { m: 'flowerling', p: 10, n: 2 },
      { m: 'flowerling', p: 11, n: 1 },
      { m: 'lampshroom', p: 11, n: 1 },
    ],
  },

  '1-B': {
    name: '女王菇的殿堂', region: 1, type: 'boss', theme: 'queenHall',
    w: 1900, h: 800,
    platforms: [
      [0, 1900, 720],
      [150, 500, 590],
      [1400, 1750, 590],
      [760, 1140, 460],
    ],
    ropes: [
      [320, 590, 720, 'vine'],
      [1580, 590, 720, 'vine'],
      [950, 460, 720, 'vine'],
    ],
    portals: [
      { id: 'l', x: 70, p: 0, to: '1-4', target: 'r' },
    ],
    boss: { m: 'queenShroom', x: 1350 },
  },
};

G.data.mapOrder = ['1-1', '1-2', '1-3', '1-4', '1-B'];
G.data.camps = { 1: '1-1' };
