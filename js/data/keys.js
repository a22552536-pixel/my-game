// 預設按鍵與可改鍵的動作清單。
G.data.keys = {
  actions: [
    ['left', '往左'],
    ['right', '往右'],
    ['up', '往上／爬繩／傳送門／對話'],
    ['down', '往下／蹲下'],
    ['jump', '跳躍'],
    ['attack', '普通攻擊'],
    ['skill1', '技能欄 1'],
    ['skill2', '技能欄 2'],
    ['skill3', '技能欄 3'],
    ['skill4', '技能欄 4'],
    ['skill5', '技能欄 5'],
    ['skill6', '技能欄 6'],
    ['hpPot', 'HP 藥水'],
    ['mpPot', 'MP 藥水'],
    // 背包、技能、形態、地圖、任務、圖鑑：改成只用畫面左上角的圖示打開，不佔按鍵
  ],
  defaults: {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
    jump: 'KeyC',
    attack: 'KeyX',
    skill1: 'KeyA',
    skill2: 'KeyS',
    skill3: 'KeyD',
    skill4: 'KeyF',
    skill5: 'KeyQ',
    skill6: 'KeyW',
    hpPot: 'Digit1',
    mpPot: 'Digit2',
  },
  skillSlots: ['skill1', 'skill2', 'skill3', 'skill4', 'skill5', 'skill6'],
  // Esc 保留給選單；其餘會和瀏覽器功能衝突
  forbidden: ['Escape', 'F5', 'F12', 'Tab', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ContextMenu'],

  label(code) {
    if (!code) return '—';
    const map = {
      ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
      Space: '空白', ShiftLeft: 'Shift', ShiftRight: '右Shift',
      ControlLeft: 'Ctrl', ControlRight: '右Ctrl', Enter: 'Enter',
      Backspace: '⌫', Backquote: '`', Minus: '-', Equal: '=',
      BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';',
      Quote: "'", Comma: ',', Period: '.', Slash: '/', CapsLock: 'Caps',
      Insert: 'Ins', Delete: 'Del', Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn',
    };
    if (map[code]) return map[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
    return code;
  },
};
