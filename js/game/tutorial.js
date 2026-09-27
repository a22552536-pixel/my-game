// 新遊戲的按鍵教學（強制）：一步一步照順序做，做到才會換下一步；教學沒做完，營地的傳送門不會開。
// 每一步都有一支會跳的大箭頭指著要看的地方（玩家、藤蔓、怪物、技能欄、NPC）。
// 按鍵名稱跟著玩家的改鍵設定走。完成後記在 world.flags.tutorialDone。
(function () {
  'use strict';

  const slotOf = (id) => Math.max(0, G.player.hotbar.indexOf(id));
  const slotKey = (id) => G.data.keys.skillSlots[slotOf(id)];

  // 左上角圖示導覽：每按一下跳躍鍵換下一個圖示（一行短說明）
  const TOUR = [
    ['inventory', '「裝備」換裝備、看背包'],
    ['skills', '「技能」學技能、放進技能欄'],
    ['forms', '「形態」進化、切換形態'],
    ['worldmap', '「地圖」看世界地圖'],
    ['quests', '「任務」看接下的任務'],
    ['codex', '「圖鑑」遇過的怪物與形態'],
    ['keys', '「鍵盤」查看、更改按鍵'],
  ];
  const skillKeys = () => G.data.keys.skillSlots.map((a) => G.input.label(a)).join(' ');

  // info：說明步驟，看完按跳躍鍵繼續；sub：第二行的補充說明（text、sub 可以是函式，按鍵名稱跟著改鍵走）
  // 觸控模式（手機）：tText / tSub / tKeys 換成觸控的說法（每行 20 字以內），tKeys 是畫在面板上的按鈕小標籤
  const TOUR_T = { keys: '「鍵盤」接鍵盤時的按鍵設定' };
  const roarBtn = () => '技能' + (slotOf('roar') + 1);
  const STEPS = [
    { id: 'move', keys: () => ['left', 'right'], text: '左右走路', tKeys: () => ['搖桿'], tText: '按住左半邊，左右推動走路', tSub: '手指按哪裡，搖桿就出現在哪裡' },
    { id: 'jump', keys: () => ['jump'], text: '跳躍', tKeys: () => ['跳躍'], tText: '點右下的大顆跳躍鈕' },
    { id: 'attack', keys: () => ['attack'], text: '攻擊露珠蝸', tKeys: () => ['攻擊'], tText: '點右下角的攻擊鈕打露珠蝸', tSub: '按住攻擊鈕會一直攻擊' },
    { id: 'climb', keys: () => ['up'], text: '跳上平台，站到發光的藤蔓前往上爬', tKeys: () => ['搖桿 ↑'], tText: '跳上平台，到藤蔓前往上推', tSub: '站在發光的藤蔓前，搖桿往上推' },
    { id: 'drop', keys: () => ['down', 'jump'], text: '按住 ↓ 再按跳躍，從平台往下跳', sub: '要站在平台上才能往下跳（在地面上的話，先爬藤蔓上去）', tKeys: () => ['搖桿 ↓', '跳躍'], tText: '搖桿往下推，再點跳躍鈕', tSub: '站在平台上才能往下跳' },
    { id: 'infoHp', info: true, keys: () => ['jump'], text: '紅色的是 HP（生命）', sub: '被怪物打到會減少，歸零就會倒下（倒下沒有懲罰，會在營地醒來）', tSub: '被打會減少，歸零會在營地醒來' },
    { id: 'infoMp', info: true, keys: () => ['jump'], text: '藍色的是 MP（魔力）', sub: '放技能會用掉 MP，不夠的時候技能放不出來', tSub: '放技能會用掉 MP，不夠就放不出來' },
    { id: 'infoExp', info: true, keys: () => ['jump'], text: '最下面黃色的是 EXP（經驗）', sub: '打怪、完成任務會增加；集滿就升級，還會拿到技能點（升級不會補血，記得喝藥水）', tText: '最下面黃色的是 EXP', tSub: '打怪、做任務會增加，集滿就升級' },
    { id: 'infoIcons', info: true, tour: true, keys: () => ['jump'], text: () => (TOUR[T.tourI] || TOUR[0])[1], sub: () => '左上角的圖示 ' + (T.tourI + 1) + ' / ' + TOUR.length, tText: () => { const t = TOUR[T.tourI] || TOUR[0]; return TOUR_T[t[0]] || t[1]; } },
    { id: 'openSkills', keys: () => [], text: '點左上角的「技能」圖示' },
    { id: 'learn', keys: () => [], text: '按「＋」學會「小吼」', sub: '送你 1 點技能點。每升一級都會再拿到 1 點', tText: '點「＋」學會「小吼」', tSub: '送你 1 點技能點，升級會再拿到' },
    { id: 'useSkill', keys: () => [slotKey('roar')], text: '放出小吼（先按 Esc 關掉視窗）', sub: '注意看，放完之後 MP 會變少', tKeys: () => [roarBtn()], tText: () => (G.ui.blocking() ? '先點視窗右上的 ✕ 關掉' : '點發光的技能鈕放出小吼'), tSub: '放完之後 MP 會變少' },
    { id: 'infoSlots', info: true, keys: () => ['jump'], text: () => '技能欄 ' + skillKeys() + ' 放 4 招', sub: '在「技能」視窗選格子。五轉大招也一樣', tText: '跳躍鈕旁 4 顆技能鈕', tSub: '在「技能」視窗選要放哪一格' },
    { id: 'potion', keys: () => ['hpPot'], text: '受傷了！吃一顆紅漿果補 HP', tKeys: () => ['紅漿果'], tText: '受傷了！點紅漿果鈕補 HP' },
    { id: 'mpPot', keys: () => ['mpPot'], text: 'MP 快用完了！喝一瓶藍花蜜補 MP', tKeys: () => ['藍花蜜'], tText: 'MP 快沒了！點藍花蜜鈕' },
    { id: 'infoRegen', info: true, keys: () => ['jump'], text: 'HP、MP 會慢慢自己回復，但很慢', sub: '打怪時要靠紅漿果、藍花蜜；站在營地的營火旁邊回得比較快', tText: 'HP、MP 會慢慢自己回復', tSub: '打怪靠藥水，營火旁回得比較快' },
    { id: 'shop', keys: () => ['up'], text: '去貓頭鷹商人那裡買一顆紅漿果（教學免費）', sub: '走到牠旁邊按鍵說話 →「交易」→ 紅漿果「買 1」。藥水快用完就回來買', tKeys: () => ['搖桿 ↑'], tText: '找貓頭鷹商人買紅漿果', tSub: () => (G.ui.isOpen('shop') ? '點黃框裡的「買 1」（教學免費）' : '走到牠旁邊，搖桿往上推→「交易」') },
    { id: 'talk', keys: () => ['up'], text: '頭上有「！」的 NPC 有任務。走到刺蝟婆婆旁邊按鍵說話', tKeys: () => ['搖桿 ↑'], tText: '走到刺蝟婆婆旁，往上推', tSub: '頭上有「！」的 NPC 有任務' },
    { id: 'accept', keys: () => [], text: '點發光的任務名稱，再按「接受」', sub: '「！」＝有新任務，「？」＝任務完成，可以回報', tSub: '「！」新任務，「？」可以回報' },
    { id: 'infoTracker', info: true, keys: () => ['jump'], text: '接下的任務會顯示在右上角', sub: '照著上面寫的去做，完成後回來找 NPC 回報，就能拿到經驗和獎勵', tText: '接下的任務顯示在右上角', tSub: '照著做，完成後回來找 NPC 回報' },
  ];
  const touchOn = () => !!(G.touch && G.touch.on);
  const val = (v) => (typeof v === 'function' ? v() : v);
  // 這一步目前要顯示的文字（觸控模式有觸控版就用觸控版）
  const stepText = (s) => val(touchOn() && s.tText ? s.tText : s.text);
  const stepSub = (s) => val(touchOn() && s.tSub ? s.tSub : s.sub);

  const T = (G.tutorial = {
    active: false,
    idx: 0,
    moved: 0,
    lastX: 0,
    doneT: 0,
    outroT: 0,
    potions0: 0,
    tourI: 0, // 圖示導覽目前指到第幾個

    // 圖示導覽中：目前要發光的圖示 id（hudicons.js 用）
    tourIcon() {
      const s = this.current();
      if (!s) return null;
      if (s.id === 'openSkills') return G.ui.isOpen('skills') ? null : 'skills';
      return s.tour ? (TOUR[this.tourI] || TOUR[0])[0] : null;
    },

    start() {
      this.active = true;
      this.idx = 0;
      this.moved = 0;
      this.lastX = G.player.x;
      this.doneT = 0;
      this.outroT = 0;
      this.enter();
    },

    // 還沒教完就要擋住的事（例如離開營地）
    blocking() {
      return this.active && this.outroT <= 0;
    },

    current() {
      return this.active && this.outroT <= 0 ? STEPS[this.idx] || null : null;
    },

    // 進入某一步時要準備的東西
    enter() {
      const s = this.current();
      if (!s) return;
      const P = G.player;
      this.stepT = 0;
      this.tourI = 0;
      if (s.id === 'mpPot') {
        P.mp = Math.max(1, Math.round(P.maxMp * 0.25));
        P.potions.mp = Math.max(1, P.potions.mp || 0);
        this.mpPots0 = P.potions.mp;
      }
      if (s.id === 'accept' && G.ui.isOpen('dialogue')) G.ui.render('dialogue');
      if (s.id === 'learn' && P.sp <= 0 && !(P.skills.roar > 0)) P.sp = 1;
      if (s.id === 'shop') {
        this.shopHp0 = P.potions.hp || 0;
        if (P.gold < 30) P.gold = 30;
      }
      if (s.id === 'potion') {
        P.hp = Math.max(1, Math.round(P.maxHp * 0.45));
        P.potions.hp = Math.max(1, P.potions.hp || 0);
        this.potions0 = P.potions.hp;
        G.fx.damage(P.x, P.y - 70, Math.round(P.maxHp * 0.55), 'player');
        G.fx.shake(6, 0.2);
        G.audio.play('hurt');
      }
      if (G.ui.render && G.ui.isOpen('skills')) G.ui.render('skills');
      // 商店的教學黃框／免費價格要跟著這一步出現、消失
      if (G.ui.render && G.ui.isOpen('shop')) G.ui.render('shop');
    },

    // 只接受目前這一步
    on(id) {
      const s = this.current();
      if (!s || s.id !== id) return;
      this.idx++;
      this.doneT = 0.8;
      G.audio.play('pickup');
      if (this.idx >= STEPS.length) this.finish();
      else this.enter();
    },

    finish() {
      this.outroT = 9;
      G.world.flags.tutorialDone = true;
      G.hud.toast('操作教學完成！傳送門開啟了', '#7dff7a');
      const hook = G.data.story.regions[G.world.map.region];
      if (hook && hook.hook) setTimeout(() => G.hud.story(hook.hook), 9500);
      G.save.write();
    },

    // 在 world.update 之後、清掉按鍵狀態之前呼叫；UI 開著時也會跑
    update(dt) {
      if (!this.active) return;
      if (this.doneT > 0) this.doneT -= dt;
      if (this.outroT > 0) {
        this.outroT -= dt;
        if (this.outroT <= 0) this.active = false;
        return;
      }
      const s = this.current();
      if (!s) return;
      const P = G.player;
      const I = G.input;
      this.stepT = (this.stepT || 0) + dt;
      // 說明步驟：看一下之後按跳躍鍵繼續
      if (s.info) {
        if (this.stepT > (s.tour ? 0.35 : 0.6) && I.wasPressed('jump')) {
          // 圖示導覽：一個一個看完才算完成
          if (s.tour && this.tourI < TOUR.length - 1) {
            this.tourI++;
            this.stepT = 0;
            G.audio.play('ui');
          } else this.on(s.id);
        }
        this.lastX = P.x;
        return;
      }
      switch (s.id) {
        case 'move':
          this.moved += Math.abs(P.x - this.lastX);
          if (this.moved > 100) this.on('move');
          break;
        case 'jump':
          if (I.wasPressed('jump') && P.climbing < 0) this.on('jump');
          break;
        case 'attack':
          if (I.wasPressed('attack')) this.on('attack');
          break;
        case 'climb':
          if (P.climbing >= 0) this.on('climb');
          break;
        case 'drop':
          // 往下跳穿平台的那一刻，player 會記下要穿過的平台
          if (P.ignorePlat >= 0 && P.ignoreT > 0) this.on('drop');
          break;
        case 'openSkills':
          if (G.ui.isOpen('skills')) this.on('openSkills');
          break;
        case 'learn':
          if (P.skills.roar > 0) this.on('learn');
          // 保險：技能點不見了（例如舊存檔）就補回 1 點，不會卡住
          else if (P.sp <= 0) P.sp = 1;
          break;
        case 'useSkill':
          if (!G.ui.blocking() && I.wasPressed(slotKey('roar'))) this.on('useSkill');
          break;
        case 'potion':
          if ((P.potions.hp || 0) < this.potions0) this.on('potion');
          break;
        case 'mpPot':
          if ((P.potions.mp || 0) < this.mpPots0) this.on('mpPot');
          break;
        case 'accept':
          if (G.quests.state.q1) this.on('accept');
          break;
        case 'shop':
          if ((P.potions.hp || 0) > this.shopHp0) this.on('shop');
          break;
      }
      this.lastX = P.x;
    },

    // ── 繪圖 ──
    keycap(ctx, label, x, y, big) {
      const fs = big ? 22 : 18;
      ctx.font = 'bold ' + fs + 'px ' + G.art.FONT;
      const h = big ? 40 : 34;
      const w = Math.max(h, ctx.measureText(label).width + 18);
      G.hud.panel(ctx, x, y - h / 2, w, h, 7, '#fff6de');
      ctx.strokeStyle = '#8a5a30';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 0.5, y - h / 2 + 0.5, w - 1, h - 1);
      ctx.fillStyle = 'rgba(138,90,48,0.35)';
      ctx.fillRect(x + 2, y + h / 2 - 5, w - 4, 3);
      ctx.fillStyle = '#4a2e1f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y);
      return w;
    },

    // 觸控按鈕的小標籤（圓角膠囊，跟觸控按鈕同色系）
    chip(ctx, label, x, y) {
      ctx.font = 'bold 18px ' + G.art.FONT;
      const h = 38;
      const w = Math.max(h, ctx.measureText(label).width + 26);
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y - h / 2, w, h, h / 2);
      else ctx.rect(x, y - h / 2, w, h);
      const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
      g.addColorStop(0, '#8fd4ff');
      g.addColorStop(1, '#2f7fc8');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#eaf8ff';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + 1);
      ctx.restore();
      return w;
    },

    // 會跳的大箭頭，尖端在 (x, y)；dir：down / up / left / right
    // 世界裡的目標（怪、藤蔓、NPC）用一個小的會跳箭頭；介面上的東西改用發光外框（box）
    arrow(ctx, x, y, dir) {
      const b = Math.abs(Math.sin(G.time * 5)) * 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate({ down: 0, up: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[dir || 'down']);
      ctx.translate(0, -b);
      ctx.scale(0.55, 0.55);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-30, -34);
      ctx.lineTo(-13, -34);
      ctx.lineTo(-13, -74);
      ctx.lineTo(13, -74);
      ctx.lineTo(13, -34);
      ctx.lineTo(30, -34);
      ctx.closePath();
      ctx.shadowColor = 'rgba(255,220,80,0.9)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ffd83a';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#6a3a0a';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(-7, -68, 5, 30);
      ctx.restore();
    },

    // 介面元素的發光外框：一圈會呼吸的金光
    box(ctx, x, y, w, h, round) {
      const k = 0.5 + 0.5 * Math.sin(G.time * 5);
      ctx.save();
      ctx.shadowColor = 'rgba(255,216,58,0.95)';
      ctx.shadowBlur = 10 + k * 10;
      ctx.strokeStyle = 'rgba(255,216,58,' + (0.7 + 0.3 * k).toFixed(3) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 4, y - 4, w + 8, h + 8, round ? Math.min(w, h) / 2 + 4 : 10);
      else ctx.rect(x - 4, y - 4, w + 8, h + 8);
      ctx.stroke();
      ctx.restore();
    },

    // 這一步要指哪裡（畫面座標）：[x, y, 方向] 是箭頭，{ box: [x, y, w, h] } 是發光外框
    target(s) {
      const P = G.player;
      const cam = G.cam;
      const map = G.world.map;
      const sx = (x) => x - cam.x;
      const sy = (y) => y - cam.y;
      const Hh = G.H;
      const barY = Hh - 66;
      const nSlots = G.data.keys.skillSlots.length;
      const sx0 = G.W - 8 - (nSlots + 2) * 52 - 8;
      switch (s.id) {
        case 'move':
        case 'jump':
          return [];
        case 'attack': {
          let best = null;
          for (const m of G.world.monsters) {
            if (m.dead) continue;
            if (!best || Math.abs(m.x - P.x) < Math.abs(best.x - P.x)) best = m;
          }
          return best ? [[sx(best.x), sy(best.y - best.h * (best.scale || 1)) - 26, 'down']] : [];
        }
        case 'climb': {
          const r = map.ropes && map.ropes[0];
          return r ? [[sx(r[0]), sy(r[2]) - 44, 'down']] : [];
        }
        case 'drop': {
          // 在地面上：指藤蔓；在平台上：指著自己往下
          if (P.plat === 0 && P.climbing < 0) {
            const r = map.ropes && map.ropes[0];
            return r ? [[sx(r[0]), sy(r[2]) - 44, 'down']] : [];
          }
          return [[sx(P.x), sy(P.y) + 40, 'down']];
        }
        case 'openSkills':
        case 'infoIcons': {
          // 左上角的圖示是 DOM 按鈕：在它外面畫一圈金光（按鈕本身也會發光、顯示名稱）
          const id = this.tourIcon();
          const H = G.hudIcons && G.hudIcons.el;
          const b = id && H && H.querySelector('[data-win="' + id + '"]');
          return b ? [{ box: [H.offsetLeft + b.offsetLeft, H.offsetTop + b.offsetTop, b.offsetWidth, b.offsetHeight] }] : [];
        }
        case 'infoSlots':
          return G.touch && G.touch.on ? [] : [{ box: [sx0, barY + 5, nSlots * 52 - 4, 44] }];
        case 'infoHp':
          return [{ box: [72, barY + 22, 220, 14] }];
        case 'infoMp':
          return [{ box: [72, barY + 37, 220, 12] }];
        case 'infoExp':
          return [{ box: [0, Hh - 9, G.W, 9] }];
        case 'mpPot':
          return G.touch && G.touch.on ? [] : [{ box: [sx0 + (nSlots + 1) * 52, barY + 5, 48, 44] }];
        case 'infoRegen':
        case 'accept':
          return [];
        case 'infoTracker':
          return [{ box: [G.W - 300, 8, 292, 64] }];
        case 'useSkill':
          return G.ui.blocking() || (G.touch && G.touch.on) ? [] : [{ box: [sx0 + slotOf('roar') * 52, barY + 5, 48, 44] }];
        case 'potion':
          return G.touch && G.touch.on ? [] : [{ box: [sx0 + nSlots * 52, barY + 5, 48, 44] }];
        case 'shop': {
          if (G.ui.isOpen('shop') || G.ui.isOpen('dialogue')) return [];
          const n = G.world.npcs.find((k) => k.id === 'owl');
          return n ? [[sx(n.x), sy(n.y) - 110, 'down']] : [];
        }
        case 'talk': {
          const n = G.world.npcs.find((k) => k.id === 'hedgehog');
          return n ? [[sx(n.x), sy(n.y) - 110, 'down']] : [];
        }
      }
      return [];
    },

    // 觸控模式：除了 target() 的 HUD 外框、世界裡的箭頭，再框出這一步要按的觸控按鈕（位置跟著 touch.js 的版面走）
    touchTarget(s) {
      const out = this.target(s);
      const R = (n) => G.touch.rectOf(n);
      const btn = (n, arrow) => {
        const r = R(n);
        if (!r) return;
        out.push({ box: r, round: true });
        if (arrow) out.push([r[0] + r[2] / 2, r[1] - 8, 'down']);
      };
      if (s.info) btn('jump', false);
      switch (s.id) {
        case 'move':
        case 'climb':
        case 'shop':
        case 'talk':
          btn('joy', s.id === 'move');
          break;
        case 'jump':
          btn('jump', true);
          break;
        case 'attack':
          btn('attack', true);
          break;
        case 'drop':
          btn('joy', false);
          btn('jump', true);
          break;
        case 'infoSlots':
          ['skill1', 'skill2', 'skill3', 'skill4'].forEach((n) => btn(n, false));
          break;
        case 'useSkill':
          btn('skill' + (slotOf('roar') + 1), true);
          break;
        case 'potion':
          btn('hpPot', true);
          break;
        case 'mpPot':
          btn('mpPot', true);
          break;
      }
      return out;
    },

    draw(ctx) {
      if (!this.active) return;
      const W = G.W;
      const L = (a) => G.input.label(a);
      if (this.outroT > 0) {
        const a = Math.min(1, this.outroT, (9 - this.outroT) * 3);
        ctx.globalAlpha = Math.max(0, a);
        if (touchOn()) {
          // 手機：沒有鍵盤，說明觸控按鈕在哪裡
          const w = 440;
          G.hud.panel(ctx, W / 2 - w / 2, 60, w, 84, 14, 'rgba(30,20,12,0.8)');
          G.hud.text(ctx, '教學完成！左上角的圖示隨時能點', W / 2, 84, 17, '#ffe9a0', 'center', false);
          G.hud.text(ctx, '右下藥水鈕補血補魔，右上 ☰ 是選單', W / 2, 118, 16, '#fff6e0', 'center', false);
          ctx.globalAlpha = 1;
          return;
        }
        const items = [['hpPot', '紅果'], ['mpPot', '藍花蜜']];
        ctx.font = 'bold 16px ' + G.art.FONT;
        let total = 0;
        items.forEach(([k, t]) => (total += Math.max(34, ctx.measureText(L(k)).width + 18) + ctx.measureText(t).width + 26));
        total += ctx.measureText('Esc 選單').width;
        const x0 = W / 2 - total / 2 - 20;
        G.hud.panel(ctx, x0, 60, total + 40, 84, 14, 'rgba(30,20,12,0.8)');
        G.hud.text(ctx, '教學完成！左上角的圖示隨時能點。其他按鍵：', W / 2, 80, 15, '#ffe9a0', 'center', false);
        let x = x0 + 20;
        items.forEach(([k, t]) => {
          x += this.keycap(ctx, L(k), x, 118) + 6;
          ctx.font = 'bold 16px ' + G.art.FONT;
          ctx.fillStyle = '#fff6e0';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(t, x, 118);
          x += ctx.measureText(t).width + 20;
        });
        ctx.fillText('Esc 選單', x, 118);
        ctx.globalAlpha = 1;
        return;
      }
      const s = this.current();
      if (!s) return;
      (touchOn() ? this.touchTarget(s) : this.target(s)).forEach((t) => (t.box ? this.box(ctx, t.box[0], t.box[1], t.box[2], t.box[3], t.round) : this.arrow(ctx, t[0], t[1], t[2])));
      const tm = touchOn();
      // 觸控模式：鍵帽換成按鈕小標籤（已經是要顯示的文字，不用再查按鍵名稱）
      const keys = s.info ? [] : tm ? (s.tKeys ? s.tKeys() : []) : s.keys().map(L);
      const text = stepText(s);
      const sub = stepSub(s);
      ctx.font = 'bold 22px ' + G.art.FONT;
      const keysW = keys.reduce((a, k) => a + Math.max(40, ctx.measureText(k).width + 18) + 8, 0);
      const tw = ctx.measureText(text).width;
      ctx.font = 'bold 15px ' + G.art.FONT;
      const subW = sub ? ctx.measureText(sub).width : 0;
      const contW = s.info ? (tm ? 130 : 150) : 0;
      const w = Math.max(keysW + tw + contW + 70, subW + 60);
      const h = 86 + (sub ? 28 : 0);
      const x0 = W / 2 - w / 2;
      const bob = Math.sin(G.time * 3) * 2;
      G.hud.panel(ctx, x0, 60 + bob, w, h, 16, 'rgba(30,20,12,0.85)');
      ctx.strokeStyle = s.info ? '#8fd8ff' : '#ffd83a';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 4, 64 + bob, w - 8, h - 8);
      G.hud.text(ctx, (s.info ? '說明 ' : '操作教學 ') + (this.idx + 1) + ' / ' + STEPS.length + '（必做）', W / 2, 80 + bob, 14, s.info ? '#bfe8ff' : '#ffe9a0', 'center', false);
      let x = x0 + 30;
      keys.forEach((k) => (x += (tm ? this.chip(ctx, k, x, 116 + bob) : this.keycap(ctx, k, x, 116 + bob, true)) + 8));
      ctx.font = 'bold 22px ' + G.art.FONT;
      ctx.fillStyle = '#fff6e0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + 8, 116 + bob);
      if (s.info) {
        // 「按 [跳躍鍵] 繼續」
        let cx = x + 8 + tw + 24;
        ctx.font = 'bold 16px ' + G.art.FONT;
        ctx.fillStyle = '#bfe8ff';
        if (tm) {
          // 手機沒有鍵盤：直接說按跳躍鈕
          ctx.fillText('點跳躍鈕繼續', cx, 116 + bob);
        } else {
          ctx.fillText('按', cx, 116 + bob);
          cx += 22;
          cx += this.keycap(ctx, L('jump'), cx, 116 + bob) + 6;
          ctx.font = 'bold 16px ' + G.art.FONT;
          ctx.fillStyle = '#bfe8ff';
          ctx.textAlign = 'left';
          ctx.fillText('繼續', cx, 116 + bob);
        }
      }
      if (sub) G.hud.text(ctx, sub, W / 2, 148 + bob, 15, '#e8dcc0', 'center', false);
      if (this.doneT > 0) {
        ctx.globalAlpha = Math.min(1, this.doneT * 2);
        G.hud.text(ctx, '✔', x0 + w - 22, 84 + bob, 28, '#7dff7a', 'center');
        ctx.globalAlpha = 1;
      }
    },
  });

  T.STEPS = STEPS;
})();
