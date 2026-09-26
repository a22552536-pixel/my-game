// 除錯面板：網址加上 ?debug=1 才會出現。調平衡用。
(function () {
  'use strict';
  if (!G.debug) return;

  G.debugPanel = {
    init() {
      const el = document.createElement('div');
      el.className = 'debug';
      const maps = Object.keys(G.data.maps).map((id) => '<option value="' + id + '">' + id + ' ' + G.data.maps[id].name + '</option>').join('');
      el.innerHTML =
        '<b>除錯</b>' +
        '<label>等級 <input type="number" id="dbgLv" min="1" max="60" value="10"><button data-d="lv">設定</button></label>' +
        '<label><select id="dbgMap">' + maps + '</select><button data-d="map">傳送</button></label>' +
        '<label><input type="checkbox" data-d="god"> 無敵</label>' +
        '<label><input type="checkbox" data-d="box"> 碰撞框</label>' +
        '<button data-d="gold">+1000 金葉</button>' +
        '<button data-d="item">隨機傳說裝備</button>' +
        '<button data-d="kill">清場</button>' +
        '<button data-d="sp">+5 SP</button>';
      el.addEventListener('click', (e) => {
        const d = e.target.getAttribute('data-d');
        if (!d || G.scene !== 'play') return;
        const P = G.player;
        if (d === 'lv') {
          const lv = Math.max(1, Math.min(60, +document.getElementById('dbgLv').value || 1));
          P.sp += Math.max(0, lv - P.level);
          P.level = lv;
          P.exp = 0;
          P.recalc();
          P.hp = P.maxHp;
          P.mp = P.maxMp;
        } else if (d === 'map') {
          G.world.changeMap(document.getElementById('dbgMap').value, 'l');
        } else if (d === 'god') {
          G.opts.godMode = e.target.checked;
        } else if (d === 'box') {
          G.opts.showHitboxes = e.target.checked;
        } else if (d === 'gold') {
          P.gold += 1000;
        } else if (d === 'item') {
          const it = G.loot.randomEquip(P.level, 'boss');
          it.rarity = 'legendary';
          P.bag.push(G.loot.makeEquip(it.base, 'legendary'));
        } else if (d === 'kill') {
          G.world.monsters.forEach((m) => !m.dead && m.takeDamage(m.hp, 1, 0, false));
        } else if (d === 'sp') {
          P.sp += 5;
        }
        G.ui.refresh();
      });
      document.body.appendChild(el);
    },
  };
})();
