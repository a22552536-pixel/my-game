// 進化形態。每一轉換掉整個輪廓（鬃毛形狀、體型、尾巴、配色），不是往身上堆配件。
// 力量：岩石→鋼鐵→刀劍→龍騎士；法術：火→冰→星月→太陽；敏捷：疾風→暗影盜賊→忍者→闇夜盜王。
// look 裡沒寫的欄位沿用基本型。
G.data.lines = {
  might: { name: '力量', role: '對應劍士', desc: '岩石、鋼鐵、刀劍到龍騎士：貼身硬打，每招樣子都不同，皮粗肉厚不容易被擊退。' },
  magic: { name: '法術', role: '對應法師', desc: '火、冰、星月到太陽：站遠施法，燃燒、冰凍、麻痺，MP 同時是彈藥和護盾。' },
  agile: { name: '敏捷', role: '對應盜賊', desc: '疾風、暗影、忍者到闇夜盜王：邊移動邊擲出各種飛鏢，翻身與影遁時無敵。' },
};

G.data.forms = {
  base: { name: '小獅子', line: null, tier: 0, look: {} },

  // ── 力量：剛毅的戰士，從岩石鍛成鋼鐵、刀劍，最後成為龍騎士 ──
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
    desc: '岩石鍛成鋼板，鬃毛像往後張開的頭盔，背上披著鋼甲、前腳套上護腕，尾巴是一顆刺錘。',
    look: {
      scale: 1.05,
      pal: { body: '#eea443', bodyShade: '#cc8030', mane: '#9fb0c4', maneShade: '#65758c', tuft: '#d8452b', farLeg: '#c98a3c', farLegShade: '#a86e2c' },
      bodyRx: 23, bodyRy: 15.5, legW: 12, mane: 'plates', tail: 'mace', brows: true, bracers: true, armor: 'steel',
    },
  },
  might3: {
    name: '劍鬃獅', line: 'might', tier: 3,
    desc: '鬃毛化成一圈往後展開的長劍，像騎士的劍冠；披上藍色戰袍與銀甲，尾巴末端也是一把劍。',
    look: {
      scale: 1.13,
      pal: { body: '#eda84c', bodyShade: '#cc8634', mane: '#3e4f7a', maneShade: '#28355a', tuft: '#d8452b', farLeg: '#c98a3c', farLegShade: '#a86e2c', cloth: '#3a64c8', clothShade: '#27469a', trim: '#ffcf3a' },
      bodyRx: 24, bodyRy: 15.5, legW: 12.5, mane: 'blades', tail: 'sword', brows: true, bracers: true, armor: 'knight',
    },
  },
  might4: {
    name: '龍騎獅皇', line: 'might', tier: 4,
    desc: '與龍締約的騎士之王：赤紅的龍鰭鬃毛像一頂龍盔，頭上長出一對龍角，背後張開龍翼，全身披著金邊龍鱗甲，尾巴末端是一柄金色槍尖。',
    look: {
      scale: 1.25,
      pal: { body: '#e89a3c', bodyShade: '#c4782a', mane: '#b0263c', maneShade: '#6e1426', tuft: '#ffcf3a', tuftShade: '#d99a10', horn: '#fff0c8', hornShade: '#d8b070', trim: '#ffcf3a', trimShade: '#c88a10', bracer: '#ffcf3a', bracerShade: '#c88a10', farLeg: '#c07a30', farLegShade: '#9e6024' },
      bodyRx: 24, bodyRy: 16, legW: 13, mane: 'dragon', tail: 'spade', ears: 'none', brows: true, bracers: true, armor: 'dragon', dwings: true, eyeTint: '#ffb02e',
    },
  },

  // ── 法術：火、冰、星月，最後化身太陽 ──
  magic1: {
    name: '焰鬃獅', line: 'magic', tier: 1,
    desc: '鬃毛燒成往上竄的火焰，外紅內黃，頭頂不時飄出火星，尾巴末端是一團火苗。',
    look: {
      pal: { body: '#ffd08a', bodyShade: '#eeaa5c', mane: '#ff6a2a', maneShade: '#d8401a', flame: '#ffd84a', ear: '#ffb070', tuft: '#ffd23a', tuftShade: '#e09a10' },
      bodyRx: 20, mane: 'fire', tail: 'flame', fx: 'embers',
    },
  },
  magic2: {
    name: '霜鬃獅', line: 'magic', tier: 2,
    desc: '毛色褪成冰白，鬃毛長成一根根透明的冰晶，身邊飄著細雪，尾巴末端是一片旋轉的雪花。',
    look: {
      pal: { body: '#eef6fc', bodyShade: '#bcd4ea', cream: '#ffffff', mane: '#8fd8ff', maneShade: '#4aa0d8', ear: '#bfe8ff', tuft: '#e8452b', farLeg: '#d4e4f2', farLegShade: '#aec4dc' },
      bodyRx: 20, mane: 'frost', tail: 'snowflake', fx: 'snow', eyeTint: '#4ab8ff',
    },
  },
  magic3: {
    name: '星月獅', line: 'magic', tier: 3,
    desc: '鬃毛是一片夜空，頭後升起一彎金色新月，三顆小星星繞著牠轉，尾巴末端掛著一顆星。',
    look: {
      scale: 1.08,
      pal: { body: '#e2dcf8', bodyShade: '#b4aadc', cream: '#f6f2ff', mane: '#3a3f8a', maneShade: '#23265e', moon: '#ffe680', moonShade: '#e8b830', ear: '#b8b0ff', tuft: '#ffd23a', tuftShade: '#e09a10', farLeg: '#c4bce6', farLegShade: '#a096cc' },
      bodyRx: 20, mane: 'moonstar', tail: 'star', orbit: 'stars', eyeTint: '#8a8aff',
    },
  },
  magic4: {
    name: '日冕獅神', line: 'magic', tier: 4,
    desc: '化身太陽的獅神，身體輕得浮起來；鬃毛是一圈燃燒的日冕，放出兩層光芒，頭上浮著光環，尾巴末端是一顆小太陽。',
    look: {
      scale: 1.2,
      pal: { body: '#fff4d8', bodyShade: '#f0d8a0', cream: '#ffffff', mane: '#ffd84a', maneShade: '#f0a820', ray: '#ff9a2a', rayShade: '#e06a10', ear: '#ffe9a0', tuft: '#ff7a2a', tuftShade: '#d8501a', farLeg: '#f2e0b4', farLegShade: '#dcc48e' },
      bodyRx: 20, mane: 'corona', tail: 'sun', halo: true, float: true, eyeTint: '#ffb02e',
    },
  },

  // ── 敏捷：疾風、暗影盜賊、忍者，最後成為闇夜之王 ──
  agile1: {
    name: '風鬃獅', line: 'agile', tier: 1,
    desc: '身形拉長、腿變細長，鬃毛被風梳成往後飛的尖角，跑起來身後拖著風痕，尾巴捲成一道旋風。',
    look: {
      pal: { body: '#f2c24a', bodyShade: '#d49e2e', mane: '#5fd0b8', maneShade: '#2f9a8a', ear: '#ffcfa0', tuft: '#e8452b' },
      bodyRx: 23, bodyRy: 12.5, legW: 9, legLen: 18, mane: 'swept', tail: 'gust', ears: 'pointed', fx: 'wind',
    },
  },
  agile2: {
    name: '影鬃獅', line: 'agile', tier: 2,
    desc: '毛色沉成深紫，戴上盜賊的黑眼罩，鬃毛像破碎的影子往後散開，脖子圍著紅圍巾，尾巴分岔成兩縷黑影。',
    look: {
      pal: { body: '#7a5a9a', bodyShade: '#5a3e78', mane: '#2e1f44', maneShade: '#1a1028', cream: '#d8c4ec', ear: '#c890d0', tuft: '#e8452b', mask: '#1e1430', farLeg: '#5e447c', farLegShade: '#46305e' },
      bodyRx: 23, bodyRy: 12.5, legW: 9, legLen: 18, mane: 'shadow', tail: 'split', ears: 'pointed', scarf: true, eyeMask: true, eyeTint: '#ff5a6a',
    },
  },
  agile3: {
    name: '忍鬃獅', line: 'agile', tier: 3,
    desc: '深藍的忍者頭巾包住整顆頭，只露出一雙眼睛；紅色額帶在腦後飄成兩條尾巴，背上交叉插著苦無，尾巴末端也是一把苦無。',
    look: {
      scale: 1.05,
      pal: { body: '#56608a', bodyShade: '#3e4668', cream: '#b8bed8', mane: '#262a40', maneShade: '#15182a', ear: '#6a74a0', band: '#d8343a', bandShade: '#a02024', tuft: '#e8452b', farLeg: '#444c70', farLegShade: '#343a58' },
      bodyRx: 23, bodyRy: 12.5, legW: 9, legLen: 18, mane: 'hood', tail: 'kunai', ears: 'pointed', hoodTop: true, faceMask: true, kunaiBack: true, eyeTint: '#ffd84a', brows: 'sly',
    },
  },
  agile4: {
    name: '闇夜盜王', line: 'agile', tier: 4,
    desc: '統御黑夜的盜賊之王：頭戴鋸齒狀的暗影王冠，鬃毛是往後燒的黑焰，披著紅裡破邊的夜幕披風，以新月胸針扣住；雙眼亮著血紅的光，身邊飄散著暗影，尾巴末端是一把新月彎刃。',
    look: {
      scale: 1.22,
      pal: { body: '#4a3868', bodyShade: '#33244c', cream: '#8e78b4', mane: '#241838', maneShade: '#120a20', rim: '#a070ff', ear: '#c04a8a', tuft: '#e0203a', tuftShade: '#90102a', cape: '#221634', capeShade: '#120a1e', lining: '#b01c3c', liningShade: '#7a1028', crown: '#2a1f3a', crownShade: '#140c20', gem: '#ff2a4a', moon: '#f4ecff', moonShade: '#b8a0e8', clasp: '#ffd84a', claspShade: '#c89a10', farLeg: '#35264e', farLegShade: '#261a3a' },
      bodyRx: 23, bodyRy: 13, legW: 9.5, legLen: 18, mane: 'abyss', tail: 'crescent', ears: 'pointed', crown: 'shadow', cape: true, fx: 'wisps', eyeTint: '#ff2a4a', eyeGlow: true, brows: 'sly',
    },
  },

  // ── 五轉：三條路線最後都匯集成同一個樣子 ──
  // 外觀一樣，但會保留進化前那條路線的技能頁（可以在「形態」視窗換要沿用哪一頁）。
  apex: {
    name: '星楓獅王', line: null, tier: 5, apex: true,
    desc: '岩與劍、火與星、影與夜，三股力量終於在身體裡匯成一股。鬃毛化成燃燒的星楓，頭頂的星楓之冠完整亮起。',
    look: {
      scale: 1.3,
      pal: { body: '#fff4dc', bodyShade: '#f6ddaa', cream: '#ffffff', mane: '#fff0c0', maneShade: '#f8d88a', ear: '#ffd8c0', tuft: '#ffe7a0', tuftShade: '#f5cc70', nose: '#b0703a', farLeg: '#f8e6c0', farLegShade: '#eed09a', aura: '#fff2b0', haloRing: '#fffbe6', leaf: '#ffd35a', leafShade: '#f2a83a', leafCore: '#fff6d0', halo: '#f5c040', lead: '#f0c860' },
      bodyRx: 23, bodyRy: 15, legW: 11,
      softLine: '#dcae62', faceLine: '#6a4028',
      mane: 'radiant', tail: 'glow', crown: 'sprig', lwings: true, fx: 'aura', float: true, eyeTint: '#ffb02e', eyeGlow: true,
    },
  },
};
