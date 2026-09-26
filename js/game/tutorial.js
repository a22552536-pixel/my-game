// 新遊戲的按鍵教學（強制）：一步一步照順序做，做到才會換下一步；教學沒做完，營地的傳送門不會開。
// 每一步都有一支會跳的大箭頭指著要看的地方（玩家、藤蔓、怪物、技能欄、NPC）。
// 按鍵名稱跟著玩家的改鍵設定走。完成後記在 world.flags.tutorialDone。
(function () {
  'use strict';

  const slotOf = (id) => Math.max(0, G.player.hotbar.indexOf(id));
  const slotKey = (id) => G.data.keys.skillSlots[slotOf(id)];

  // info：說明步驟，看完按跳躍鍵繼續；sub：第二行的補充說明
  const STEPS = [
    { id: 'move', keys: () => ['left', 'right'], text: '左右走路' },
    { id: 'jump', keys: () => ['jump'], text: '跳躍' },
    { id: 'attack', keys: () => ['attack'], text: '攻擊露珠蝸' },
    { id: 'climb', keys: () => ['up'], text: '跳上平台，站到發光的藤蔓前往上爬' },
    { id: 'drop', keys: () => ['down', 'jump'], text: '按住 ↓ 再按跳躍，從平台往下跳', sub: '要站在平台上才能往下跳（在地面上的話，先爬藤蔓上去）' },
    { id: 'infoHp', info: true, keys: () => ['jump'], text: '紅色的是 HP（生命）', sub: '被怪物打到會減少，歸零就會倒下（倒下沒有懲罰，會在營地醒來）' },
    { id: 'infoMp', info: true, keys: () => ['jump'], text: '藍色的是 MP（魔力）', sub: '放技能會用掉 MP，不夠的時候技能放不出來' },
    { id: 'infoExp', info: true, keys: () => ['jump'], text: '最下面黃色的是 EXP（經驗）', sub: '打怪、完成任務會增加；集滿就升級，HP、MP 全滿，還會拿到技能點' },
    { id: 'openSkills', keys: () => ['skills'], text: '點左上角的「技能」圖示（或按鍵）' },
    { id: 'learn', keys: () => [], text: '按「＋」學會「小吼」', sub: '送你 1 點技能點。每升一級都會再拿到 1 點' },
    { id: 'useSkill', keys: () => [slotKey('roar')], text: '放出小吼（先按 Esc 關掉視窗）', sub: '注意看，放完之後 MP 會變少' },
    { id: 'potion', keys: () => ['hpPot'], text: '受傷了！吃一顆紅漿果補 HP' },
    { id: 'mpPot', keys: () => ['mpPot'], text: 'MP 快用完了！喝一瓶藍花蜜補 MP' },
    { id: 'infoRegen', info: true, keys: () => ['jump'], text: 'HP、MP 也會慢慢自己回復', sub: '站在營地的營火旁邊回得更快；紅漿果、藍花蜜可以在貓頭鷹的商店買' },
    { id: 'talk', keys: () => ['up'], text: '頭上有「！」的 NPC 有任務。走到刺蝟婆婆旁邊按鍵說話' },
    { id: 'accept', keys: () => [], text: '點發光的任務名稱，再按「接受」', sub: '「！」＝有新任務，「？」＝任務完成，可以回報' },
    { id: 'infoTracker', info: true, keys: () => ['jump'], text: '接下的任務會顯示在右上角', sub: '照著上面寫的去做，完成後回來找 NPC 回報，就能拿到經驗和獎勵' },
  ];

  const T = (G.tutorial = {
    active: false,
    idx: 0,
    moved: 0,
    lastX: 0,
    doneT: 0,
    outroT: 0,
    potions0: 0,

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
      if (s.id === 'mpPot') {
        P.mp = Math.max(1, Math.round(P.maxMp * 0.25));
        P.potions.mp = Math.max(1, P.potions.mp || 0);
        this.mpPots0 = P.potions.mp;
      }
      if (s.id === 'accept' && G.ui.isOpen('dialogue')) G.ui.render('dialogue');
      if (s.id === 'learn' && P.sp <= 0 && !(P.skills.roar > 0)) P.sp = 1;
      if (s.id === 'potion') {
        P.hp = Math.max(1, Math.round(P.maxHp * 0.45));
        P.potions.hp = Math.max(1, P.potions.hp || 0);
        this.potions0 = P.potions.hp;
        G.fx.damage(P.x, P.y - 70, Math.round(P.maxHp * 0.55), 'player');
        G.fx.shake(6, 0.2);
        G.audio.play('hurt');
      }
      if (G.ui.render && G.ui.isOpen('skills')) G.ui.render('skills');
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
        if (this.stepT > 0.6 && I.wasPressed('jump')) this.on(s.id);
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

    // 會跳的大箭頭，尖端在 (x, y)；dir：down / up / left / right
    arrow(ctx, x, y, dir) {
      const b = Math.abs(Math.sin(G.time * 5)) * 14;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate({ down: 0, up: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[dir || 'down']);
      ctx.translate(0, -b);
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

    // 這一步的箭頭要指哪裡（畫面座標）
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
          return [[sx(P.x) - 60, sy(P.y) - 40, 'left'], [sx(P.x) + 60, sy(P.y) - 40, 'right']];
        case 'jump':
          return [[sx(P.x), sy(P.y) - 110, 'up']];
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
          return [[8 + 50 + 22, 98, 'up']];
        case 'infoHp':
          return [[182, barY + 18, 'down']];
        case 'infoMp':
          return [[182, barY + 34, 'down']];
        case 'infoExp':
          return [[G.W / 2, Hh - 12, 'down']];
        case 'mpPot':
          return [[sx0 + (nSlots + 1) * 52 + 24, barY - 4, 'down']];
        case 'infoRegen': {
          const camp = map.camp;
          return camp ? [[sx((camp.x1 + camp.x2) / 2), sy(map.platforms[0][2]) - 60, 'down']] : [];
        }
        case 'accept':
          return [];
        case 'infoTracker':
          return [[G.W - 160, 110, 'up']];
        case 'useSkill':
          return G.ui.blocking() ? [] : [[sx0 + slotOf('roar') * 52 + 24, barY - 4, 'down']];
        case 'potion':
          return [[sx0 + nSlots * 52 + 24, barY - 4, 'down']];
        case 'talk': {
          const n = G.world.npcs.find((k) => k.id === 'hedgehog');
          return n ? [[sx(n.x), sy(n.y) - 110, 'down']] : [];
        }
      }
      return [];
    },

    draw(ctx) {
      if (!this.active) return;
      const W = G.W;
      const L = (a) => G.input.label(a);
      if (this.outroT > 0) {
        const a = Math.min(1, this.outroT, (9 - this.outroT) * 3);
        ctx.globalAlpha = Math.max(0, a);
        const items = [['inventory', '背包'], ['skills', '技能'], ['quests', '任務'], ['hpPot', '紅果'], ['mpPot', '藍花蜜']];
        ctx.font = 'bold 16px ' + G.art.FONT;
        let total = 0;
        items.forEach(([k, t]) => (total += Math.max(34, ctx.measureText(L(k)).width + 18) + ctx.measureText(t).width + 26));
        total += ctx.measureText('Esc 選單').width;
        const x0 = W / 2 - total / 2 - 20;
        G.hud.panel(ctx, x0, 60, total + 40, 84, 14, 'rgba(30,20,12,0.8)');
        G.hud.text(ctx, '教學完成！其他按鍵：', W / 2, 80, 15, '#ffe9a0', 'center', false);
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
      this.target(s).forEach(([x, y, d]) => this.arrow(ctx, x, y, d));
      const keys = s.info ? [] : s.keys();
      ctx.font = 'bold 22px ' + G.art.FONT;
      const keysW = keys.reduce((a, k) => a + Math.max(40, ctx.measureText(L(k)).width + 18) + 8, 0);
      const tw = ctx.measureText(s.text).width;
      ctx.font = 'bold 15px ' + G.art.FONT;
      const subW = s.sub ? ctx.measureText(s.sub).width : 0;
      const contW = s.info ? 150 : 0;
      const w = Math.max(keysW + tw + contW + 70, subW + 60);
      const h = 86 + (s.sub ? 28 : 0);
      const x0 = W / 2 - w / 2;
      const bob = Math.sin(G.time * 3) * 2;
      G.hud.panel(ctx, x0, 60 + bob, w, h, 16, 'rgba(30,20,12,0.85)');
      ctx.strokeStyle = s.info ? '#8fd8ff' : '#ffd83a';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 4, 64 + bob, w - 8, h - 8);
      G.hud.text(ctx, (s.info ? '說明 ' : '操作教學 ') + (this.idx + 1) + ' / ' + STEPS.length + '（必做）', W / 2, 80 + bob, 14, s.info ? '#bfe8ff' : '#ffe9a0', 'center', false);
      let x = x0 + 30;
      keys.forEach((k) => (x += this.keycap(ctx, L(k), x, 116 + bob, true) + 8));
      ctx.font = 'bold 22px ' + G.art.FONT;
      ctx.fillStyle = '#fff6e0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text, x + 8, 116 + bob);
      if (s.info) {
        // 「按 [C] 繼續」
        let cx = x + 8 + tw + 24;
        ctx.font = 'bold 16px ' + G.art.FONT;
        ctx.fillStyle = '#bfe8ff';
        ctx.fillText('按', cx, 116 + bob);
        cx += 22;
        cx += this.keycap(ctx, L('jump'), cx, 116 + bob) + 6;
        ctx.font = 'bold 16px ' + G.art.FONT;
        ctx.fillStyle = '#bfe8ff';
        ctx.textAlign = 'left';
        ctx.fillText('繼續', cx, 116 + bob);
      }
      if (s.sub) G.hud.text(ctx, s.sub, W / 2, 148 + bob, 15, '#e8dcc0', 'center', false);
      if (this.doneT > 0) {
        ctx.globalAlpha = Math.min(1, this.doneT * 2);
        G.hud.text(ctx, '✔', x0 + w - 22, 84 + bob, 28, '#7dff7a', 'center');
        ctx.globalAlpha = 1;
      }
    },
  });

  T.STEPS = STEPS;
})();
