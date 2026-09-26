// 進化形態。每一轉換掉整個輪廓（鬃毛形狀、體型、尾巴、配色），不是往身上堆配件。
// look 裡沒寫的欄位沿用基本型。
G.data.lines = {
  might: { name: '力量', role: '對應劍士', desc: '貼身重擊，皮粗肉厚，不容易被擊退。' },
  magic: { name: '法術', role: '對應法師', desc: '站遠施法，無視地形，MP 同時是彈藥和護盾。' },
  agile: { name: '敏捷', role: '對應盜賊', desc: '身輕腳快，連擊與爆擊，遠近都能打。' },
};

G.data.forms = {
  base: { name: '小獅子', line: null, tier: 0, look: {} },

  // ── 力量：從岩石長成山岳 ──
  might1: {
    name: '岩鬃獅', line: 'might', tier: 1,
    desc: '鬃毛變成一塊塊圓鈍的岩石，身體變得結實，尾巴末端是一顆石錘。',
    look: {
      pal: { body: '#eaa24a', bodyShade: '#c98032', mane: '#9a7b5a', maneShade: '#6e5236', tuft: '#d8452b', farLeg: '#c98a3c', farLegShade: '#a86e2c' },
      bodyRx: 23, bodyRy: 15, legW: 12, mane: 'rock', tail: 'rock', brows: true,
    },
  },
  might2: {
    name: '鋼鬃獅', line: 'might', tier: 2,
    desc: '岩石鍛成鋼板，鬃毛像往後張開的頭盔，前腳套上護甲，尾巴是一顆刺錘。',
    look: {
      pal: { body: '#eea443', bodyShade: '#cc8030', mane: '#9fb0c4', maneShade: '#65758c', tuft: '#d8452b', farLeg: '#c98a3c', farLegShade: '#a86e2c' },
      bodyRx: 23, bodyRy: 15.5, legW: 12, mane: 'plates', tail: 'mace', brows: true, bracers: true,
    },
  },
  might3: {
    name: '山王獅', line: 'might', tier: 3,
    desc: '體型大了一圈，鬃毛隆起成三座積雪的山峰，走起來像一座移動的山。',
    look: {
      scale: 1.15,
      pal: { body: '#d98a3a', bodyShade: '#b86c28', mane: '#7c8c6a', maneShade: '#56644a', tuft: '#d8452b', farLeg: '#b8742e', farLegShade: '#985c22' },
      bodyRx: 24, bodyRy: 16, legW: 13, mane: 'peaks', tail: 'crag', brows: true,
    },
  },
  might4: {
    name: '震岳獅皇', line: 'might', tier: 4,
    desc: '山岳裂開露出熔岩，黑曜石鬃毛像披風一樣垂到背上，額頭的楓葉變成金色。',
    look: {
      scale: 1.25,
      pal: { body: '#c9782e', bodyShade: '#a45e22', mane: '#3e3440', maneShade: '#241c28', tuft: '#ffcf3a', tuftShade: '#d99a10', glow: '#ff9a3a', farLeg: '#a8662a', farLegShade: '#88501e' },
      bodyRx: 25, bodyRy: 16.5, legW: 13, mane: 'lava', tail: 'ember', brows: true, eyeTint: '#ffb02e',
    },
  },

  // ── 法術：從靈火升成極光 ──
  magic1: {
    name: '靈鬃獅', line: 'magic', tier: 1,
    desc: '鬃毛化成往上飄的青色靈火，尾巴末端是一團不會熄滅的火苗。',
    look: {
      pal: { body: '#ffcf8a', bodyShade: '#e8a860', mane: '#5fd0c8', maneShade: '#34a09a', ear: '#9fe8e0', tuft: '#e8452b' },
      bodyRx: 20, mane: 'wisp', tail: 'wisp',
    },
  },
  magic2: {
    name: '星鬃獅', line: 'magic', tier: 2,
    desc: '鬃毛變成一彎夜空色的新月，上面閃著星星，尾巴末端掛著一顆星。',
    look: {
      pal: { body: '#f6d9a8', bodyShade: '#dcb47c', mane: '#3e4596', maneShade: '#262a66', ear: '#b8b0ff', tuft: '#e8452b' },
      bodyRx: 20, mane: 'crescent', tail: 'star', eyeTint: '#8a8aff',
    },
  },
  magic3: {
    name: '天輝獅', line: 'magic', tier: 3,
    desc: '全身轉為白金色，鬃毛放射成一圈日光，頭上浮著光環，肩後長出小小的光翼。',
    look: {
      pal: { body: '#fff1d4', bodyShade: '#e8d0a0', mane: '#ffd35a', maneShade: '#e0a82a', ear: '#ffe9a0', tuft: '#ff8a3a', farLeg: '#ecd8ae', farLegShade: '#d4bc8a' },
      bodyRx: 20, mane: 'rays', tail: 'sun', halo: true, wings: true,
    },
  },
  magic4: {
    name: '極光獅神', line: 'magic', tier: 4,
    desc: '身體輕得浮起來，鬃毛是一條條往後飄的極光，尾巴拖著長長的光帶。',
    look: {
      scale: 1.1,
      pal: { body: '#f4f0ff', bodyShade: '#d4ccf0', mane: '#7ae0c0', maneShade: '#4aa890', ear: '#d0b8ff', tuft: '#ff7ac0', tuftShade: '#d0508f', farLeg: '#dcd4f4', farLegShade: '#bcb2e0' },
      bodyRx: 20, mane: 'aurora', tail: 'ribbon', float: true, eyeTint: '#7ae0e0',
    },
  },

  // ── 敏捷：從疾風變成雷霆 ──
  agile1: {
    name: '風鬃獅', line: 'agile', tier: 1,
    desc: '身形拉長、腿變細長，鬃毛被風梳成往後飛的尖角，耳朵也尖了起來。',
    look: {
      pal: { body: '#f2c24a', bodyShade: '#d49e2e', mane: '#a8d04a', maneShade: '#78a030', ear: '#ffcfa0', tuft: '#e8452b' },
      bodyRx: 23, bodyRy: 12.5, legW: 9, legLen: 18, mane: 'swept', tail: 'leaf', ears: 'pointed',
    },
  },
  agile2: {
    name: '影鬃獅', line: 'agile', tier: 2,
    desc: '毛色沉成深紫，鬃毛像破碎的影子往後散開，脖子圍著紅圍巾，尾巴分岔成兩縷黑影。',
    look: {
      pal: { body: '#7a5a9a', bodyShade: '#5a3e78', mane: '#2e1f44', maneShade: '#1a1028', cream: '#c8b0e0', ear: '#c890d0', tuft: '#e8452b', farLeg: '#5e447c', farLegShade: '#46305e' },
      bodyRx: 23, bodyRy: 12.5, legW: 9, legLen: 18, mane: 'shadow', tail: 'split', ears: 'pointed', scarf: true, eyeTint: '#ff5a6a',
    },
  },
  agile3: {
    name: '雷影獅', line: 'agile', tier: 3,
    desc: '黑色的身體布滿雷紋，鬃毛變成一圈鋸齒狀的閃電，尾巴本身就是一道雷。',
    look: {
      pal: { body: '#3a3444', bodyShade: '#26222e', mane: '#ffd42a', maneShade: '#d8a010', cream: '#8a8498', ear: '#ffe070', tuft: '#ffd42a', tuftShade: '#d8a010', farLeg: '#2a2632', farLegShade: '#1c1a22' },
      bodyRx: 23, bodyRy: 12.5, legW: 9, legLen: 18, mane: 'zigzag', tail: 'bolt', ears: 'pointed', stripes: true, eyeTint: '#ffe04a',
    },
  },
  agile4: {
    name: '閃霆獅王', line: 'agile', tier: 4,
    desc: '全身轉白，鬃毛是翻滾的雷雲，裡面不時閃出藍色電光，尾巴末端是一團小雷雲。',
    look: {
      scale: 1.1,
      pal: { body: '#eef3ff', bodyShade: '#c8d4ee', mane: '#c8d4ea', maneShade: '#96a6c8', cream: '#ffffff', ear: '#a8d8ff', tuft: '#5ab8ff', tuftShade: '#2a88d8', farLeg: '#d0dbf2', farLegShade: '#aebbdc' },
      bodyRx: 23, bodyRy: 12.5, legW: 9.5, legLen: 18, mane: 'storm', tail: 'cloud', ears: 'pointed', eyeTint: '#5ad0ff',
    },
  },
};
