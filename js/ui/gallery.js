// 圖鑑：一張圖畫出所有形態與怪物（沒遇過的畫成黑色剪影）。js/ui/codex.js 用 G.gallery 畫圖鑑視窗。
// （原本寫在試玩模式 js/ui/demo.js 裡，試玩模式移除後獨立出來）
(function () {
  'use strict';
  const A = G.art;
  const LINE_COLOR = { might: '#d8803a', magic: '#3aa8c8', agile: '#6aa83a' };


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

      // 野外魔王在上、章節 Boss 在下（章節 Boss 比較大，放在最後壓軸）
      const FY = 1432 + 460;
      const BY = FY + 538;
      title('章節 Boss', BY);
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

  // 在遊戲裡打開完整圖鑑（全部顯示）
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

})();
