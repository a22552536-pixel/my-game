// 世界地圖：像楓之谷的維多利亞島一樣，所有章節的地圖都畫在同一塊「星楓大陸」上。
// 還沒去過的地圖顯示 ？？？，還沒開放的區域蓋著雲霧。滑鼠移到節點上可以看地圖資訊。
(function () {
  'use strict';
  const A = G.art;
  const WW = 960;
  const WH = 560;

  // 每張地圖在大陸上的位置
  const POS = {
    '1-1': [130, 468], '1-2': [196, 426], '1-3': [258, 462], '1-4': [318, 414], '1-B': [372, 376],
    '2-1': [446, 470], '2-2': [520, 500], '2-3': [592, 474], '2-4': [652, 440], '2-B': [708, 400],
    '3-1': [650, 336], '3-2': [706, 290], '3-3': [764, 250], '3-4': [724, 204], '3-B': [786, 160],
  };
  // 還沒做好的區域
  const FUTURE = [
    { region: 4, x: 330, y: 210, name: '霜鈴雪峰' },
    { region: 5, x: 840, y: 74, name: '浮空遺跡' },
  ];
  const REGION_LABEL = { 1: [210, 540], 2: [585, 544], 3: [846, 300], 4: [300, 120], 5: [830, 24] };
  const TYPE = { camp: '營地', hunt: '狩獵場', explore: '探索', boss: 'Boss' };

  const M = (G.worldMap = {
    hover: null,
    POS,

    info(id) {
      const m = G.data.maps[id];
      const visited = !!G.world.visited[id];
      if (!visited) return { title: '？？？', lines: ['還沒去過的地方'] };
      const lv = (m.mobs || []).map((g) => G.data.monsters[g.m].lv);
      const mobs = [];
      (m.mobs || []).forEach((g) => {
        const n = G.data.monsters[g.m].name;
        if (mobs.indexOf(n) < 0) mobs.push(n);
      });
      const lines = [TYPE[m.type] + (lv.length ? ' · 怪物 Lv' + Math.min(...lv) + '–' + Math.max(...lv) : '')];
      if (mobs.length) lines.push('出沒：' + mobs.join('、'));
      if (m.boss) {
        const b = G.data.monsters[m.boss.m];
        lines.push('Boss：Lv' + b.lv + ' ' + b.name + (G.world.flags[m.boss.m + 'Defeated'] ? '（已打倒，可挑戰回憶）' : ''));
      }
      if ((m.npcs || []).length) lines.push('NPC：' + m.npcs.map((n) => G.data.npcs[n.id].name).join('、'));
      return { title: m.name + (id === G.world.mapId ? '（你在這裡）' : ''), lines };
    },

    // ── 畫大陸 ──
    drawLand(ctx, t) {
      // 海
      const sea = ctx.createLinearGradient(0, 0, 0, WH);
      sea.addColorStop(0, '#8fd0f0');
      sea.addColorStop(1, '#4a9ad0');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 0, WW, WH);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const x = (i * 137 + t * 12) % (WW + 60) - 30;
        const y = 40 + ((i * 83) % 480);
        ctx.beginPath();
        ctx.arc(x, y, 10, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      // 大陸本體
      const blob = (pts, fill, shade) => {
        A.shape(ctx, (c) => {
          c.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i <= pts.length; i++) {
            const p = pts[i % pts.length];
            const q = pts[(i - 1) % pts.length];
            c.quadraticCurveTo(q[0], q[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
          }
          c.closePath();
        }, fill, shade, { cel: [6, 6], lw: 3, hl: false });
      };
      blob([[60, 440], [90, 330], [200, 250], [240, 150], [360, 90], [470, 130], [560, 150], [660, 120], [820, 110], [880, 190], [870, 320], [800, 420], [760, 520], [600, 545], [420, 540], [260, 545], [110, 530]], '#e8d8a8', '#d0bc88');
      // 各區域的地面顏色
      const patch = (x, y, rx, ry, col, alpha) => {
        ctx.globalAlpha = alpha || 1;
        ctx.fillStyle = A.c(col);
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      };
      patch(250, 440, 190, 95, '#8fc86a');
      patch(170, 470, 90, 50, '#7ab85a');
      patch(590, 470, 170, 70, '#f2e0a8');
      patch(740, 230, 130, 120, '#d88a5a');
      patch(700, 300, 90, 60, '#e0a070');
      patch(330, 190, 150, 90, '#e8f0f8');
      // 森林：一簇簇樹
      [[110, 430], [150, 400], [230, 390], [290, 430], [210, 490], [340, 460], [270, 500], [180, 510]].forEach(([x, y], i) => {
        A.ellipse(ctx, x, y, 16, 14, i % 2 ? '#5f9a4c' : '#6fa85a', '#4a7e3a', { lw: 2, hl: false });
      });
      // 大蘑菇
      A.shape(ctx, (c) => { c.moveTo(232, 452); c.quadraticCurveTo(250, 428, 268, 452); c.closePath(); }, '#e8584a', null, { lw: 2, hl: false });
      // 海岸：燈塔
      A.shape(ctx, (c) => { c.moveTo(478, 470); c.lineTo(484, 430); c.lineTo(494, 430); c.lineTo(500, 470); c.closePath(); }, '#ffffff', '#e0e0e0', { lw: 2, hl: false });
      ctx.fillStyle = A.c('#e84a3a');
      ctx.fillRect(482, 444, 16, 6);
      const glow = 0.5 + Math.sin(t * 3) * 0.3;
      ctx.fillStyle = 'rgba(255,240,150,' + glow.toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(489, 428, 7, 0, Math.PI * 2);
      ctx.fill();
      // 峽谷：紅色台地
      [[690, 250, 40], [760, 200, 46], [800, 270, 34], [660, 190, 30]].forEach(([x, y, w]) => {
        A.shape(ctx, (c) => { c.moveTo(x - w, y + 20); c.lineTo(x - w * 0.7, y - 20); c.lineTo(x + w * 0.7, y - 20); c.lineTo(x + w, y + 20); c.closePath(); }, '#c85a3a', '#a04428', { cel: [3, 3], lw: 2, hl: false });
      });
      // 火山
      A.shape(ctx, (c) => { c.moveTo(760, 170); c.lineTo(782, 120); c.lineTo(798, 120); c.lineTo(820, 170); c.closePath(); }, '#6a4a44', '#4a3430', { lw: 2, hl: false });
      ctx.fillStyle = 'rgba(255,140,60,' + (0.6 + Math.sin(t * 4) * 0.3).toFixed(2) + ')';
      ctx.beginPath();
      ctx.ellipse(790, 121, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // 雪峰
      [[270, 200], [330, 170], [390, 205]].forEach(([x, y]) => {
        A.shape(ctx, (c) => { c.moveTo(x - 40, y + 30); c.lineTo(x, y - 40); c.lineTo(x + 40, y + 30); c.closePath(); }, '#b8c8d8', '#98a8b8', { lw: 2, hl: false });
        A.shape(ctx, (c) => { c.moveTo(x - 14, y - 12); c.lineTo(x, y - 40); c.lineTo(x + 14, y - 12); c.closePath(); }, '#ffffff', null, { lw: 1.5, hl: false });
      });
      // 浮空遺跡
      const fy = Math.sin(t * 1.2) * 4;
      A.shape(ctx, (c) => { c.moveTo(790, 80 + fy); c.lineTo(890, 80 + fy); c.lineTo(860, 110 + fy); c.lineTo(820, 112 + fy); c.closePath(); }, '#8a8098', '#6a6078', { lw: 2, hl: false });
      ctx.fillStyle = A.c('#a8a0b8');
      ctx.fillRect(812, 52 + fy, 12, 28);
      ctx.fillRect(840, 44 + fy, 16, 36);
      A.ellipse(ctx, 866, 50 + fy, 14, 12, '#ffb8d8', null, { lw: 2, hl: false });
    },

    drawFog(ctx, t) {
      FUTURE.forEach((f) => {
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + t * 0.2;
          const x = f.x + Math.cos(a) * 55;
          const y = f.y + Math.sin(a * 1.3) * 26;
          ctx.fillStyle = 'rgba(255,255,255,0.78)';
          ctx.beginPath();
          ctx.arc(x, y, 44, 0, Math.PI * 2);
          ctx.fill();
        }
        G.hud.text(ctx, '？？？', f.x, f.y + 4, 22, '#8a8aa0', 'center', false);
      });
    },

    draw(ctx, t) {
      ctx.save();
      this.drawLand(ctx, t);
      const maps = G.data.maps;
      const order = G.data.mapOrder;
      // 路線
      ctx.lineCap = 'round';
      for (let i = 1; i < order.length; i++) {
        const a = POS[order[i - 1]];
        const b = POS[order[i]];
        if (!a || !b) continue;
        const seen = G.world.visited[order[i - 1]] && G.world.visited[order[i]];
        ctx.strokeStyle = seen ? 'rgba(120,70,30,0.85)' : 'rgba(120,70,30,0.3)';
        ctx.lineWidth = 4;
        ctx.setLineDash(seen ? [] : [6, 7]);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      this.drawFog(ctx, t);
      // 區域名稱
      for (const r in REGION_LABEL) {
        const ch = G.data.story.chapters[r];
        const [x, y] = REGION_LABEL[r];
        const open = order.some((id) => maps[id].region === +r && G.world.visited[id]);
        const label = open ? ch.no + '　' + ch.name : ch.no + '　？？？';
        ctx.font = 'bold 15px ' + A.FONT;
        const w = ctx.measureText(label).width + (G.story.hasLeaf(+r) ? 30 : 16);
        G.hud.panel(ctx, x - w / 2, y - 13, w, 24, 10, 'rgba(60,36,20,0.75)');
        G.hud.text(ctx, label, x - (G.story.hasLeaf(+r) ? 8 : 0), y, 15, open ? '#ffe9b0' : '#b8a890', 'center', false);
        if (G.story.hasLeaf(+r)) {
          ctx.save();
          ctx.translate(x + w / 2 - 14, y);
          A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, 7), ch.leaf.color, null, { lw: 1.5, hl: false });
          ctx.restore();
        }
      }
      // 節點
      for (const id of order) {
        const p = POS[id];
        if (!p) continue;
        const m = maps[id];
        const seen = !!G.world.visited[id];
        const hov = this.hover === id;
        const r = m.type === 'boss' ? 13 : m.type === 'camp' ? 12 : 9;
        const col = !seen ? '#b8b0a0' : m.type === 'boss' ? (G.world.flags[m.boss.m + 'Defeated'] ? '#b88aff' : '#e84a4a') : m.type === 'camp' ? '#ffd35a' : '#8fd06a';
        if (hov) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(p[0], p[1], r + 8, 0, Math.PI * 2);
          ctx.fill();
        }
        A.ellipse(ctx, p[0], p[1], r, r, col, null, { lw: 2.5, hl: false });
        const glyph = !seen ? '?' : m.type === 'boss' ? '★' : m.type === 'camp' ? '⌂' : '';
        if (glyph) G.hud.text(ctx, glyph, p[0], p[1] + 1, r + 3, '#4a2e1f', 'center', false);
        if (seen && (hov || m.type !== 'hunt')) {
          G.hud.text(ctx, m.name, p[0], p[1] - r - 11, 12, '#ffffff', 'center');
        }
      }
      // 小獅子在這裡
      const cur = POS[G.world.mapId];
      if (cur) {
        const bob = Math.abs(Math.sin(t * 4)) * 6;
        ctx.save();
        ctx.translate(cur[0], cur[1] - 16 - bob);
        ctx.scale(0.42, 0.42);
        A.drawLion(ctx, 0, 0, 1, { state: 'idle', t, p: 0, onGround: true, form: G.player.form, leaves: G.story.crownColors() });
        ctx.restore();
      }
      ctx.restore();
    },

    nodeAt(x, y) {
      let best = null;
      let bd = 22;
      for (const id in POS) {
        const d = Math.hypot(POS[id][0] - x, POS[id][1] - y);
        if (d < bd) {
          bd = d;
          best = id;
        }
      }
      return best;
    },
  });

  // 視窗打開時啟動畫布動畫與滑鼠提示
  const obs = new MutationObserver(() => {
    document.querySelectorAll('canvas.worldmap-canvas:not([data-done])').forEach((c) => {
      c.setAttribute('data-done', '1');
      const ctx = c.getContext('2d');
      const info = c.parentNode.querySelector('.wm-info');
      const showInfo = (id) => {
        if (!info) return;
        const d = M.info(id || G.world.mapId);
        info.innerHTML = '<b>' + d.title + '</b>' + d.lines.map((l) => '<div>' + l + '</div>').join('');
      };
      showInfo(null);
      c.addEventListener('mousemove', (e) => {
        const r = c.getBoundingClientRect();
        const id = M.nodeAt(((e.clientX - r.left) / r.width) * WW, ((e.clientY - r.top) / r.height) * WH);
        if (id !== M.hover) {
          M.hover = id;
          showInfo(id);
        }
      });
      c.addEventListener('mouseleave', () => {
        M.hover = null;
        showInfo(null);
      });
      let t = 0;
      const tick = () => {
        if (!c.isConnected) return;
        t += 1 / 60;
        M.draw(ctx, t);
        requestAnimationFrame(tick);
      };
      tick();
    });
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  M.W = WW;
  M.H = WH;
})();
