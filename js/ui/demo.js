// 試玩模式（Demo）：在練功場裡試所有形態的所有技能，不會動到正式存檔。
// 另外有「圖鑑」：一張圖看所有進化形態與所有怪物。
// 進入方式：標題畫面的「試玩模式」按鈕，或網址加上 ?demo=1。
(function () {
  'use strict';
  const A = G.art;

  // 練功場：一大塊平地加兩層平台，擺滿三個章節的怪物
  G.data.maps.DEMO = {
    name: '試玩練功場', region: 1, type: 'hunt', theme: 'forestMorning', music: 'forest',
    w: 3000, h: 820,
    platforms: [
      [0, 3000, 740],
      [300, 1100, 610],
      [1500, 2500, 610],
      [700, 1900, 480],
    ],
    ropes: [
      [500, 610, 740, 'vine'],
      [1700, 610, 740, 'vine'],
      [1000, 480, 610, 'vine'],
    ],
    portals: [],
    start: { x: 200, p: 0 },
    npcs: [],
    mobs: [
      { m: 'dewsnail', p: 0, n: 2, x1: 400, x2: 800 },
      { m: 'spotshroom', p: 0, n: 2, x1: 800, x2: 1200 },
      { m: 'postcrab', p: 0, n: 2, x1: 1200, x2: 1600 },
      { m: 'kiteray', p: 0, n: 2, x1: 1600, x2: 2000 },
      { m: 'weightbeetle', p: 0, n: 2, x1: 2000, x2: 2400 },
      { m: 'mapvulture', p: 0, n: 2, x1: 2400, x2: 2900 },
      { m: 'woodsnail', p: 1, n: 2 },
      { m: 'stampstar', p: 2, n: 2 },
      { m: 'potgoat', p: 3, n: 3 },
    ],
  };

  // 練功場的章節：每章 9 種怪全部擺出來，背景換成該章的狩獵地圖
  const CHAPTERS = [
    { no: '一', theme: 'forestMushroom', ids: ['dewsnail', 'mosssnail', 'woodsnail', 'capshroom', 'spotshroom', 'lampshroom', 'seedling', 'sproutling', 'flowerling'] },
    { no: '二', theme: 'tidepool', ids: ['postcrab', 'bulbjelly', 'umbrellagull', 'alarmurchin', 'kiteray', 'blockcoral', 'stampstar', 'accordioneel', 'musicturtle'] },
    { no: '三', theme: 'redRift', ids: ['matchlizard', 'angerrock', 'magnetdillo', 'candlesnake', 'weightbeetle', 'bellowsbat', 'potgoat', 'moodchameleon', 'mapvulture'] },
    { no: '四', theme: 'snowField', ids: ['echoferret', 'crystalowl', 'avalanchehare', 'drumyak', 'shadowwolf', 'dreamsheep', 'silencefox', 'heartcedar', 'shieldbear'] },
    { no: '終', theme: 'timeCorridor', ids: ['hourowl', 'mirrordeer', 'stopmoth', 'ouroboros', 'clocksnail', 'pouchroo', 'gravjelly', 'parallelfox', 'constellfish'] },
  ];
  const FIELD_BOSSES = ['fb_shroom', 'fb_kraken', 'fb_balrog', 'fb_zakum', 'fb_voiddragon'];
  function chapterMobs(ids) {
    const ok = ids.filter((id) => G.data.monsters[id]);
    const out = [];
    // 地面 5 種、三層平台各 1～2 種
    ok.slice(0, 5).forEach((m, i) => out.push({ m, p: 0, n: 2, x1: 400 + i * 500, x2: 400 + i * 500 + 400 }));
    if (ok[5]) out.push({ m: ok[5], p: 1, n: 2 });
    if (ok[6]) out.push({ m: ok[6], p: 2, n: 2 });
    if (ok[7]) out.push({ m: ok[7], p: 3, n: 1, x1: 720, x2: 1250 });
    if (ok[8]) out.push({ m: ok[8], p: 3, n: 1, x1: 1350, x2: 1880 });
    return out;
  }

  const FORM_ORDER = ['base', 'might1', 'might2', 'might3', 'might4', 'magic1', 'magic2', 'magic3', 'magic4', 'agile1', 'agile2', 'agile3', 'agile4', 'apex'];
  const LINE_COLOR = { might: '#d8803a', magic: '#3aa8c8', agile: '#6aa83a' };

  // 某個形態可以用的技能（基本技能＋同路線、不超過該轉的技能）
  function skillsOf(formId) {
    return Object.keys(G.data.skills).filter((id) => G.formSwitch.skillOK(id, formId));
  }

  const D = (G.demo = {
    active: false,
    tough: true,
    panel: null,

    chapter: 0,

    // 換章節：怪物、背景、音樂一起換
    loadChapter(c) {
      const C = CHAPTERS[c - 1];
      const M = G.data.maps.DEMO;
      if (!this.baseMobs) this.baseMobs = { mobs: M.mobs, theme: M.theme, region: M.region, music: M.music };
      if (C) {
        M.mobs = chapterMobs(C.ids);
        M.theme = C.theme;
        M.region = c;
        M.music = null;
      } else Object.assign(M, this.baseMobs);
      this.chapter = c;
      delete M._theme; // 換背景：讓地圖重新準備主題與裝飾
      const P = G.player;
      G.world.load('DEMO', { x: P.x, y: P.y });
      this.renderPanel();
    },

    summon(id) {
      const FB = G.fieldBoss;
      if (!FB || !G.data.monsters[id]) return;
      const cur = FB.current();
      if (cur) G.world.monsters.splice(G.world.monsters.indexOf(cur), 1);
      FB.spawn(id);
    },

    start() {
      this.active = true;
      G.scenes.hideTitle();
      G.ui.closeAll();
      G.hud.reset();
      const P = G.player;
      P.newGame();
      G.quests.reset();
      G.world.resetProgress();
      G.tutorial.active = false;
      G.world.flags.tutorialDone = true;
      G.opts.godMode = true;
      P.level = 50;
      P.potions = { hp: 99, mp: 99, hpL: 99, mpL: 99 };
      G.scene = 'play';
      G.world.fade = 1;
      G.world.fadeDir = -1;
      G.world.load('DEMO', 'start');
      this.setForm('agile4');
      this.buildPanel();
      G.hud.toast('試玩模式：無敵、MP 無限、沒有冷卻。右邊可以換形態、直接點技能施放', '#ffe14a');
    },

    setForm(formId) {
      const P = G.player;
      P.form = formId;
      P.skills = {};
      skillsOf(formId).forEach((id) => (P.skills[id] = G.data.skills[id].maxLv));
      P.sp = 0;
      P.pages = null;
      // 技能欄：優先放高階的主動技能
      const act = skillsOf(formId).filter((id) => G.data.skills[id].type !== 'passive' && G.data.skills[id].form !== 'apex');
      const tierOf = (id) => (G.data.forms[G.data.skills[id].form] || { tier: 0 }).tier;
      act.sort((a, b) => tierOf(b) - tierOf(a));
      P.hotbar = G.data.keys.skillSlots.map((a, i) => act[i] || null);
      P.action = null;
      P.cds = {};
      P.buffs = {};
      P.recalc();
      P.hp = P.maxHp;
      P.mp = P.maxMp;
      G.fx.screenFlash('#ffffff', 0.3);
      G.fx.sparkle(P.x, P.y - 40, '#fff3a0', 16, 40);
      this.renderPanel();
    },

    // 每幀：MP 補滿、冷卻清掉
    update() {
      if (!this.active || G.scene !== 'play') return;
      const P = G.player;
      P.mp = P.maxMp;
      P.hp = P.maxHp;
      if (P.cds) for (const k in P.cds) P.cds[k] = 0;
      // 怪物耐打：連段技能的每一下都看得到（至少 3 萬血）
      for (const m of G.world.monsters) {
        if (m.dead || m.demoHp === this.tough) continue;
        if (this.tough) {
          m.demoBase = m.demoBase || m.maxHp;
          m.maxHp = m.fieldBoss ? m.demoBase * 4 : Math.max(m.demoBase * 40, 30000);
          m.hp = m.maxHp;
        } else if (m.demoBase) {
          m.maxHp = m.demoBase;
          m.hp = Math.min(m.hp, m.maxHp);
        }
        m.demoHp = this.tough;
      }
    },

    buildPanel() {
      if (this.panel) return;
      const el = document.createElement('div');
      el.id = 'demo-panel';
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-d]');
        if (!b) return;
        G.audio.unlock();
        const [act, arg] = b.getAttribute('data-d').split(':');
        if (act === 'form') this.setForm(arg);
        else if (act === 'apexLine') {
          G.player.apexLine = arg;
          this.setForm('apex');
        }
        else if (act === 'cast') {
          G.ui.closeAll();
          G.player.action = null;
          G.player.useSkill(arg);
        } else if (act === 'chapter') this.loadChapter(+arg);
        else if (act === 'summon') this.summon(arg);
        else if (act === 'gallery') G.ui.open('gallery');
        else if (act === 'tough') {
          this.tough = !this.tough;
          this.renderPanel();
        } else if (act === 'respawn') G.world.load('DEMO', { x: G.player.x, y: G.player.y });
        else if (act === 'exit') location.href = location.pathname;
      });
      document.getElementById('ui').appendChild(el);
      this.panel = el;
      this.renderPanel();
    },

    renderPanel() {
      if (!this.panel) return;
      const P = G.player;
      const F = G.data.forms;
      let h = '<div class="dp-title">試玩模式</div><div class="dp-lbl">形態（點一下切換）</div><div class="dp-forms">';
      FORM_ORDER.forEach((id) => {
        const f = F[id];
        const col = f.line ? LINE_COLOR[f.line] : f.apex ? '#e8b830' : '#b8904a';
        h += '<button data-d="form:' + id + '" class="' + (P.form === id ? 'on' : '') + '" style="border-color:' + col + '">' + f.name + (f.tier ? '<small>' + f.tier + '轉</small>' : '') + '</button>';
      });
      if (F[P.form].apex) {
        // 五轉：選要沿用哪一條路線的技能頁
        h += '</div><div class="dp-lbl">五轉沿用的技能頁</div><div class="dp-forms">';
        ['might', 'magic', 'agile'].forEach((l) => {
          const cur = (P.apexLine || 'might') === l;
          h += '<button data-d="apexLine:' + l + '" class="' + (cur ? 'on' : '') + '" style="border-color:' + LINE_COLOR[l] + '">' + G.data.lines[l].name + '</button>';
        });
      }
      h += '</div><div class="dp-lbl">技能（點一下施放）</div><div class="dp-skills">';
      skillsOf(P.form).forEach((id) => {
        const S = G.data.skills[id];
        const slot = P.hotbar.indexOf(id);
        const key = slot >= 0 ? G.input.label(G.data.keys.skillSlots[slot]) : '';
        const passive = S.type === 'passive';
        h += '<button data-d="cast:' + id + '"' + (passive ? ' disabled' : '') + ' title="' + S.desc(S.maxLv).replace(/"/g, '') + '"><img src="' + A.iconURL(S.icon) + '"><span>' + S.name + '</span>' + (passive ? '<em>被動</em>' : key ? '<em>' + key + '</em>' : '') + '</button>';
      });
      h += '</div><div class="dp-lbl">練功場的怪物（點一下換章節）</div><div class="dp-forms">';
      h += '<button data-d="chapter:0" class="' + (this.chapter === 0 ? 'on' : '') + '">混合</button>';
      CHAPTERS.forEach((c, i) => (h += '<button data-d="chapter:' + (i + 1) + '" class="' + (this.chapter === i + 1 ? 'on' : '') + '">' + (c.no === '終' ? '終章' : '第' + c.no + '章') + '</button>'));
      h += '</div><div class="dp-lbl">召喚野外魔王</div><div class="dp-forms">';
      FIELD_BOSSES.filter((id) => G.data.monsters[id]).forEach((id) => (h += '<button data-d="summon:' + id + '">' + G.data.monsters[id].name + '</button>'));
      h += '</div><div class="dp-row"><button data-d="gallery">全部形態與怪物圖鑑</button><button data-d="tough" class="' + (this.tough ? 'on' : '') + '">怪物耐打：' + (this.tough ? '開' : '關') + '</button><button data-d="respawn">怪物重生</button><button data-d="exit">離開試玩</button></div>';
      this.panel.innerHTML = h;
    },
  });

  // ───────── 圖鑑：一張圖畫出所有形態與怪物 ─────────
  const GW = 1800;
  const GH = 3240;

  function fakeMonster(art, stage, t) {
    return {
      def: { art, stage, name: '' }, x: 0, y: 0, dir: 1, t, w: 60, h: 60, scale: 1,
      onGround: true, vy: 0, vx: 0, hurtT: 0, hurtFlash: 0, dead: false, deadT: 0, state: 'walk', stateT: 1, blink: false, fx: {},
    };
  }

  G.gallery = {
    W: GW,
    H: GH,
    // known：null＝全部顯示（試玩模式）；{ forms, mobs }＝圖鑑，沒遇過的畫成黑色剪影
    draw(ctx, t, known) {
      const F = G.data.forms;
      const hid = (kind, id) => !!known && !known[kind][id];
      // 沒遇過的：先畫到離屏畫布，再整個塗成深色，得到乾淨的剪影
      const sil = (hidden, bx, by, bw, bh, fn) => {
        if (!hidden) return fn(ctx);
        const oc = G.gallery.off || (G.gallery.off = document.createElement('canvas'));
        if (oc.width < bw || oc.height < bh) {
          oc.width = Math.max(oc.width, bw);
          oc.height = Math.max(oc.height, bh);
        }
        const o = oc.getContext('2d');
        o.setTransform(1, 0, 0, 1, 0, 0);
        o.globalCompositeOperation = 'source-over';
        o.clearRect(0, 0, oc.width, oc.height);
        o.setTransform(1, 0, 0, 1, -bx, -by);
        fn(o);
        o.setTransform(1, 0, 0, 1, 0, 0);
        o.globalCompositeOperation = 'source-in';
        o.fillStyle = '#2a2140';
        o.fillRect(0, 0, bw, bh);
        o.globalCompositeOperation = 'source-over';
        ctx.drawImage(oc, 0, 0, bw, bh, bx, by, bw, bh);
      };
      const M = G.data.monsters;
      ctx.save();
      const bg = ctx.createLinearGradient(0, 0, 0, GH);
      bg.addColorStop(0, '#fff8e7');
      bg.addColorStop(1, '#f0e2c4');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, GW, GH);
      const title = (txt, y) => {
        G.hud.text(ctx, txt, 40, y, 34, '#6a3a0a', 'left', false);
        ctx.fillStyle = '#c8a060';
        ctx.fillRect(40, y + 26, GW - 80, 3);
      };
      const label = (txt, x, y, col, size) => G.hud.text(ctx, txt, x, y, size || 18, col || '#4a2e1f', 'center', false);
      const card = (x, y, w, h, col) => {
        G.hud.panel(ctx, x, y, w, h, 16, 'rgba(255,255,255,0.55)');
        ctx.strokeStyle = col || '#e0c898';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
      };

      // 進化形態
      title('小獅子的進化（一轉 Lv10 → 五轉 Lv50）', 50);
      card(40, 100, 250, 330, '#d8b070');
      sil(hid('forms', 'base'), 40, 100, 250, 290, (c) => {
        c.save();
        c.translate(165, 360);
        c.scale(2, 2);
        A.drawLion(c, 0, 0, 1, { state: 'idle', t, p: 0, onGround: true, form: 'base' });
        c.restore();
      });
      label(hid('forms', 'base') ? '？？？' : '小獅子', 165, 392, '#6a3a0a', 22);
      label('基本型', 165, 416, '#8a735c', 15);
      ['might', 'magic', 'agile'].forEach((line, r) => {
        const y0 = 100 + r * 175;
        G.hud.text(ctx, G.data.lines[line].name + '路線', 330, y0 + 22, 20, LINE_COLOR[line], 'left', false);
        for (let k = 1; k <= 4; k++) {
          const id = line + k;
          const x = 330 + (k - 1) * 360;
          card(x, y0 + 34, 340, 134, LINE_COLOR[line]);
          const fs = 1.25 * Math.min(1, 1.02 / (F[id].scale || 1));
          sil(hid('forms', id), x, y0 + 10, 190, 165, (c) => {
            c.save();
            c.translate(x + 90, y0 + 156);
            c.scale(fs, fs);
            A.drawLion(c, 0, 0, 1, { state: 'idle', t: t + k, p: 0, onGround: true, form: id });
            c.restore();
          });
          G.hud.text(ctx, hid('forms', id) ? '？？？' : F[id].name, x + 190, y0 + 80, 22, '#4a2e1f', 'left', false);
          G.hud.text(ctx, k + '轉 · Lv' + k * 10, x + 190, y0 + 108, 15, '#8a735c', 'left', false);
        }
      });

      // 五轉：三條路線匯集成同一個最終形態
      const AX = 40;
      const AY = 640;
      card(AX, AY, GW - 80, 230, '#e8b830');
      sil(hid('forms', 'apex'), AX + 60, AY + 4, 420, 222, (c) => {
        c.save();
        c.translate(AX + 270, AY + 208);
        c.scale(1.65, 1.65);
        A.drawLion(c, 0, 0, 1, { state: 'idle', t, p: 0, onGround: true, form: 'apex', leaves: ['#7ad05a', '#5fc8e8', '#ff8a3a', '#e8f4ff', '#ffd84a'] });
        c.restore();
      });
      G.hud.text(ctx, hid('forms', 'apex') ? '？？？' : F.apex.name, AX + 560, AY + 90, 34, '#6a3a0a', 'left', false);
      G.hud.text(ctx, '五轉 · Lv50 · 三條路線最後都會匯集成這個樣子', AX + 560, AY + 130, 18, '#8a735c', 'left', false);
      if (!hid('forms', 'apex')) G.hud.text(ctx, '冥道殘月破（群體）　地爆天星（單體）', AX + 560, AY + 166, 18, '#a4581a', 'left', false);

      ctx.translate(0, 270);
      // 怪物
      title('怪物', 670);
      const chapters = [
        { no: '第一章　苔光森林', ids: ['dewsnail', 'mosssnail', 'woodsnail', 'capshroom', 'spotshroom', 'lampshroom', 'seedling', 'sproutling', 'flowerling'] },
        { no: '第二章　潮風海岬', ids: ['postcrab', 'bulbjelly', 'umbrellagull', 'alarmurchin', 'kiteray', 'blockcoral', 'stampstar', 'accordioneel', 'musicturtle'] },
        { no: '第三章　赤岩峽谷', ids: ['matchlizard', 'angerrock', 'magnetdillo', 'candlesnake', 'weightbeetle', 'bellowsbat', 'potgoat', 'moodchameleon', 'mapvulture'] },
        { no: '第四章　霜鈴雪峰', ids: ['echoferret', 'crystalowl', 'avalanchehare', 'drumyak', 'shadowwolf', 'dreamsheep', 'silencefox', 'heartcedar', 'shieldbear'] },
        { no: '終章　時空間神殿', ids: ['hourowl', 'mirrordeer', 'stopmoth', 'ouroboros', 'clocksnail', 'pouchroo', 'gravjelly', 'parallelfox', 'constellfish'] },
      ].map((c) => ({ no: c.no, ids: c.ids.filter((id) => M[id]) }));
      chapters.forEach((c, r) => {
        const y0 = 720 + r * 230;
        G.hud.text(ctx, c.no, 40, y0 + 16, 20, '#6a3a0a', 'left', false);
        c.ids.forEach((id, i) => {
          const d = M[id];
          const x = 40 + i * 192;
          card(x, y0 + 32, 180, 186);
          const m = fakeMonster(d.art, d.stage, t + i * 0.7);
          m.w = d.w;
          m.h = d.h;
          const sc = Math.min(1.7, 110 / Math.max(d.h, d.w * 0.8));
          sil(hid('mobs', id), x, y0 + 32, 180, 150, (c) => {
            c.save();
            c.translate(x + 90, y0 + 170);
            c.scale(sc, sc);
            A.drawMonster(c, m);
            c.restore();
          });
          label(hid('mobs', id) ? '？？？' : d.name, x + 90, y0 + 190, '#4a2e1f', 17);
          label(hid('mobs', id) ? '還沒打倒過' : 'Lv.' + d.lv, x + 90, y0 + 208, '#8a735c', 13);
        });
      });

      // Boss
      const BY = 1432 + 460;
      title('Boss', BY);
      [['queenShroom', 1], ['hermitCrab', 2], ['lavaTortoise', 3], ['frostSpirit', 4], ['timeItself', 5]].filter(([id]) => M[id] && A.MONSTER_DRAW[M[id].art]).forEach(([id, ch], i) => {
        const d = M[id];
        const x = 40 + (i % 3) * 580;
        const oy = BY - 1432 + Math.floor(i / 3) * 250;
        card(x, 1470 + oy, 560, 220, '#e08a8a');
        const m = fakeMonster(d.art, 1, t);
        m.w = d.w;
        m.h = d.h;
        m.def.boss = true;
        m.isBoss = true;
        m.state = 'walk';
        const bs = Math.min(0.72, 165 / Math.max(d.h, 1));
        sil(hid('mobs', id), x, 1440 + oy, 360, 250, (c) => {
          c.save();
          c.translate(x + 160, 1670 + oy);
          c.scale(bs, bs);
          A.drawMonster(c, m);
          c.restore();
        });
        G.hud.text(ctx, hid('mobs', id) ? '？？？' : d.name, x + 360, 1560 + oy, 26, '#8a2020', 'left', false);
        G.hud.text(ctx, ch === 5 ? '終章 Boss' : '第' + '一二三四'[ch - 1] + '章 Boss', x + 360, 1596 + oy, 16, '#8a735c', 'left', false);
        G.hud.text(ctx, 'Lv.' + d.lv, x + 360, 1620 + oy, 16, '#8a735c', 'left', false);
      });

      // 野外魔王（js/data/fieldboss.js）：新美術還沒到時用備援外觀放大
      const FY = BY + 538;
      title('野外魔王', FY);
      ['fb_shroom', 'fb_kraken', 'fb_balrog', 'fb_zakum', 'fb_voiddragon'].filter((id) => M[id]).forEach((id, i) => {
        const d = M[id];
        const x = 40 + (i % 3) * 580;
        const cy = FY + 38 + Math.floor(i / 3) * 250;
        card(x, cy, 560, 220, '#b070d0');
        const m = fakeMonster(d.art, d.fallback ? d.fallback[1] : 0, t);
        const s = G.fieldBoss ? G.fieldBoss.fallbackScale(d) : 1;
        m.def.fallback = d.fallback;
        m.scale = s;
        m.w = d.w / s;
        m.h = d.h / s;
        m.isBoss = true;
        const bs = Math.min(0.72, 165 / Math.max(d.h, 1));
        sil(hid('mobs', id), x, cy - 30, 360, 250, (c) => {
          c.save();
          c.translate(x + 160, cy + 200);
          c.scale(bs, bs);
          A.drawMonster(c, m);
          c.restore();
        });
        G.hud.text(ctx, hid('mobs', id) ? '？？？' : d.name, x + 360, cy + 90, 26, '#6a2a8a', 'left', false);
        G.hud.text(ctx, '野外魔王 · ' + d.map, x + 360, cy + 126, 16, '#8a735c', 'left', false);
        G.hud.text(ctx, 'Lv.' + d.lv, x + 360, cy + 150, 16, '#8a735c', 'left', false);
      });
      ctx.restore();
    },
  };

  // 在遊戲裡打開圖鑑（試玩模式的按鈕）
  G.ui.r_gallery = function () {
    return this.frame('全部形態與怪物圖鑑', '<div class="gallery-wrap"><canvas class="gallery-canvas" width="' + GW + '" height="' + GH + '"></canvas></div>', 'gallery');
  };
  const obs = new MutationObserver(() => {
    document.querySelectorAll('canvas.gallery-canvas:not([data-done])').forEach((c) => {
      c.setAttribute('data-done', '1');
      const ctx = c.getContext('2d');
      let t = 0;
      const tick = () => {
        if (!c.isConnected) return;
        t += 1 / 60;
        G.gallery.draw(ctx, t, c.classList.contains('codex-canvas') ? G.codex.known() : null);
        requestAnimationFrame(tick);
      };
      tick();
    });
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  D.skillsOf = skillsOf;
})();
