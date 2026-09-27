// 過場：Boss 倒下時的遺言、每 10 級進化前「內心的聲音」。
// 進行中世界暫停；按跳躍／攻擊／↑ 或點一下前進。
(function () {
  'use strict';
  const A = G.art;

  const C = (G.cut = {
    talk: null,
    voice: null,
    pendingVoice: false,
    pendingTalk: false,
    clicked: false,

    active() {
      return !!(this.talk || this.voice || this.epi);
    },

    pressed() {
      const I = G.input;
      const p = I.wasPressed('jump') || I.wasPressed('attack') || I.wasPressed('up') || this.clicked;
      this.clicked = false;
      return p;
    },

    // ── Boss 遺言 ──
    startBossTalk(boss, region) {
      const lines = G.data.story.bossWords[boss.id];
      if (!lines) return false;
      G.ui.closeAll();
      this.voice = null;
      this.talk = { boss, region, lines, i: 0, t: 0, shown: 0 };
      G.audio.play('bossWarn');
      return true;
    },

    endTalk() {
      const tk = this.talk;
      this.talk = null;
      const region = tk.region;
      G.hud.story(G.data.story.bossDefeated[tk.boss.id] || '');
      // 時間倒下：「滴答聲，停了。」——從這一句起世界停住，直到結局第二頁把心葉放回去
      if (tk.boss.id === 'timeItself') this.stopClock();
      // 接著是拿葉子的儀式，儀式結束後出現章末卡片
      if (!G.story.hasLeaf(region)) {
        G.story.pendingEnd = region;
        const i = G.world.drops.findIndex((d) => d.kind === 'starleaf');
        if (i >= 0) G.world.drops.splice(i, 1);
        G.story.gainLeaf(region);
      } else {
        G.ui.endChapter = region;
        G.ui.open('m1end');
      }
    },

    // ── Boss 之後：發任務的 NPC 自己走進 Boss 房，總結這一章 ──
    startEpilogue(region) {
      this.pendingTalk = false;
      const openEnd = () => {
        G.ui.endChapter = region;
        G.ui.open('m1end');
      };
      const ch = G.data.story.chapters[region];
      const boss = ch && ch.boss;
      const Q = G.data.quests;
      const qid = Object.keys(Q).find((id) => Q[id].type === 'boss' && Q[id].target === boss && Q[id].lines && Q[id].lines.epilogue);
      if (!qid || G.quests.state[qid] === 'done') {
        openEnd();
        return;
      }
      const q = Q[qid];
      const P = G.player;
      const map = G.world.map;
      const left = map.platforms && map.platforms[0] ? map.platforms[0][0] + 40 : 40;
      const tx = P.x - 120 > left ? P.x - 120 : P.x + 120;
      const dir = tx < P.x ? 1 : -1;
      G.ui.closeAll();
      P.dir = -dir;
      this.epi = { qid, region, openEnd, npc: G.data.npcs[q.npc], lines: q.lines.epilogue, i: 0, t: 0, shown: 0, x: tx - dir * 420, tx, y: P.y, dir, walking: true };
    },

    endEpilogue() {
      const e = this.epi;
      this.epi = null;
      // 任務直接在這裡完成（沒接過也算），發獎勵
      if (G.quests.state[e.qid] !== 'done') {
        G.quests.state[e.qid] = 'ready';
        G.quests.turnIn(e.qid);
      }
      this.pendingTalk = true;
      setTimeout(() => {
        this.pendingTalk = false;
        if (G.scene === 'play') e.openEnd();
      }, 600);
    },

    // 測試用：直接跳過遺言、NPC 收尾
    skipTalk() {
      if (this.talk) this.endTalk();
    },
    skipEpilogue() {
      if (this.epi) this.endEpilogue();
    },

    // ── 內心的聲音 ──
    startVoice(tier) {
      const lines = G.data.story.innerVoice[tier];
      if (!lines) return;
      G.ui.closeAll();
      this.pendingVoice = false;
      this.voice = { tier, lines, i: 0, t: 0 };
      G.audio.play('evolve');
    },

    // ── 時鐘停住（docs/STORY.md 第 5 節之 3）──
    // 打倒時間後：世界上的粒子停在半空、畫面褪成灰、音樂淡出。
    // 一直停到結局第二頁（「你把心葉放回樹上。時鐘又開始轉。」），顏色與音樂才回來。
    // 只存在記憶體裡（不寫進存檔）；如果流程被跳過或中斷（沒有遺言、儀式、章末卡片、結局頁在進行），
    // 1.5 秒後自己恢復，不會把世界永遠卡在灰色裡。
    clock: null,
    stopClock() {
      if (this.clock && !this.clock.releasing) return;
      this.clock = { amt: this.clock ? this.clock.amt : 0, releasing: false, idle: 0 };
      G.fx.particles.forEach((p) => (p.clockStopped = true));
      if (G.music && G.music.current()) G.music.stop(1.8);
    },
    resumeClock() {
      const k = this.clock;
      if (!k || k.releasing) return;
      k.releasing = true;
      G.fx.particles.forEach((p) => (p.clockStopped = false));
      const map = G.world.map;
      if (G.music) G.music.play(G.music.songFor({ region: map ? map.region : 5 }));
    },
    clockHold() {
      return !!(this.clock && !this.clock.releasing);
    },
    tickClock(dt) {
      const k = this.clock;
      if (!k) return;
      if (G.scene !== 'play') {
        this.clock = null;
        return;
      }
      if (k.releasing) {
        k.amt -= dt / 1.4;
        if (k.amt <= 0) this.clock = null;
        return;
      }
      k.amt = Math.min(1, k.amt + dt / 1.6);
      const U = G.ui;
      const inFlow = this.talk || this.epi || this.pendingTalk || G.story.cer || G.story.pendingEnd || (U.isOpen && (U.isOpen('m1end') || U.isOpen('finale')));
      k.idle = inFlow ? 0 : k.idle + dt;
      if (k.idle > 1.5) this.resumeClock();
    },
    drawClock(ctx) {
      const k = this.clock;
      if (!k || k.amt <= 0) return;
      const a = k.amt * k.amt * (3 - 2 * k.amt);
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = a;
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, G.W, G.H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(24,28,40,' + (0.2 * a).toFixed(3) + ')';
      ctx.fillRect(0, 0, G.W, G.H);
      ctx.restore();
    },

    // 每幀：時機到了就自動開始內心的聲音（不在 Boss 戰、沒有視窗、沒有其他過場）
    tick() {
      this.tickClock(1 / 60);
      if (!this.pendingVoice || this.pendingTalk || G.story.pendingEnd || G.scene !== 'play' || this.active() || G.story.cer || G.evolve.anim) return;
      if (G.ui.blocking() || (G.world.boss && !G.world.boss.dead) || G.tutorial.blocking()) return;
      if (!G.evolve.canEvolve()) {
        this.pendingVoice = false;
        return;
      }
      this.startVoice(G.evolve.nextTier());
    },

    // 主迴圈呼叫：過場進行中回傳 true
    update(dt) {
      if (this.talk) {
        const tk = this.talk;
        tk.t += dt;
        const line = tk.lines[tk.i];
        tk.shown = Math.min(line.length, tk.shown + dt * 28);
        if (tk.t > 0.4 && this.pressed()) {
          if (tk.shown < line.length) tk.shown = line.length;
          else if (tk.i < tk.lines.length - 1) {
            tk.i++;
            tk.shown = 0;
            G.audio.play('ui');
          } else this.endTalk();
        }
        return true;
      }
      if (this.epi) {
        const e = this.epi;
        e.t += dt;
        if (e.walking) {
          const step = 260 * dt;
          if (Math.abs(e.tx - e.x) <= step) {
            e.x = e.tx;
            e.walking = false;
            e.t = 0;
            G.audio.play('ui');
          } else e.x += Math.sign(e.tx - e.x) * step;
          this.clicked = false;
          return true;
        }
        const line = e.lines[e.i];
        e.shown = Math.min(line.length, e.shown + dt * 26);
        if (e.t > 0.4 && this.pressed()) {
          if (e.shown < line.length) e.shown = line.length;
          else if (e.i < e.lines.length - 1) {
            e.i++;
            e.shown = 0;
            G.audio.play('ui');
          } else this.endEpilogue();
        }
        return true;
      }
      if (this.voice) {
        const v = this.voice;
        v.t += dt;
        v.lineT = (v.lineT || 0) + dt;
        if (v.lineT > 0.8 && this.pressed()) {
          if (v.i < v.lines.length - 1) {
            v.i++;
            v.lineT = 0;
            G.audio.play('rare');
          } else {
            this.voice = null;
            G.ui.open('evolve');
          }
        }
        return true;
      }
      this.clicked = false;
      return false;
    },

    draw(ctx) {
      if (this.epi) this.drawEpilogue(ctx);
      if (this.talk) this.drawTalk(ctx);
      if (this.voice) this.drawVoice(ctx);
    },

    drawTalk(ctx) {
      const tk = this.talk;
      const W = G.W;
      const H = G.H;
      const b = tk.boss;
      ctx.save();
      ctx.fillStyle = 'rgba(10,6,20,' + Math.min(0.55, tk.t).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      // Boss 身上的光
      const bx = b.x - G.cam.x;
      const by = b.y - G.cam.y - b.h * 0.5;
      const g = ctx.createRadialGradient(bx, by, 10, bx, by, 220);
      g.addColorStop(0, 'rgba(255,240,200,0.25)');
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, 220, 0, Math.PI * 2);
      ctx.fill();
      // 對話框
      const x0 = 150;
      const y0 = H - 250;
      const w = W - 300;
      const h = 170;
      G.hud.panel(ctx, x0, y0, w, h, 18, 'rgba(255,248,231,0.97)');
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);
      // 頭像
      G.hud.panel(ctx, x0 + 18, y0 + 16, 138, 138, 12, 'rgba(240,220,190,1)');
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 + 18, y0 + 16, 138, 138);
      ctx.clip();
      const pm = Object.assign({}, b, { x: 0, y: 0, dir: 1, dead: false, deadT: 0, hurtFlash: 0, squash: 0, state: 'recover', stateT: 0.3, enraged: false });
      const sc = 120 / Math.max(b.h, b.w * 0.8);
      ctx.translate(x0 + 87, y0 + 150);
      ctx.scale(sc, sc);
      A.drawMonster(ctx, pm);
      ctx.restore();
      G.hud.text(ctx, b.def.name, x0 + 87, y0 + 168, 15, '#6a3a0a', 'center', false);
      // 文字（逐字出現、自動換行）
      const line = tk.lines[tk.i].slice(0, Math.floor(tk.shown));
      ctx.font = 'bold 20px ' + A.FONT;
      const rows = G.hud.wrap(ctx, line, w - 230);
      rows.forEach((r, i) => G.hud.text(ctx, r, x0 + 180, y0 + 40 + i * 32, 20, '#4a2e1f', 'left', false));
      G.hud.text(ctx, (tk.i + 1) + ' / ' + tk.lines.length, x0 + w - 24, y0 + h - 22, 13, '#8a735c', 'right', false);
      if (tk.shown >= tk.lines[tk.i].length) {
        ctx.globalAlpha = 0.5 + Math.sin(tk.t * 5) * 0.5;
        G.hud.text(ctx, '▼ 按 ' + G.input.label('jump') + ' 或點一下', x0 + w - 90, y0 + h - 22, 13, '#a4581a', 'right', false);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },

    drawEpilogue(ctx) {
      const e = this.epi;
      const W = G.W;
      const H = G.H;
      ctx.save();
      // NPC 走進來（畫在世界位置上）
      const sx = e.x - G.cam.x;
      const sy = e.y - G.cam.y + (e.walking ? -Math.abs(Math.sin(e.t * 10)) * 4 : 0);
      ctx.save();
      ctx.translate(sx, sy);
      if (e.dir < 0) ctx.scale(-1, 1);
      A.drawNpc(ctx, { def: e.npc, x: 0, y: 0 }, G.time, null, true);
      ctx.restore();
      A.nameTag(ctx, sx, sy + 14, e.npc.name, '#ffe9a8');
      if (e.walking) {
        ctx.restore();
        return;
      }
      ctx.fillStyle = 'rgba(10,6,20,' + Math.min(0.35, e.t).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      const x0 = 150;
      const y0 = H - 250;
      const w = W - 300;
      const h = 170;
      G.hud.panel(ctx, x0, y0, w, h, 18, 'rgba(255,248,231,0.97)');
      ctx.strokeStyle = '#6a9a4a';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);
      G.hud.panel(ctx, x0 + 18, y0 + 16, 138, 138, 12, 'rgba(232,240,214,1)');
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 + 18, y0 + 16, 138, 138);
      ctx.clip();
      ctx.translate(x0 + 87, y0 + 140);
      ctx.scale(1.3, 1.3);
      A.drawNpc(ctx, { def: e.npc, x: 0, y: 0 }, G.time, null, true);
      ctx.restore();
      G.hud.text(ctx, e.npc.name, x0 + 87, y0 + 168, 15, '#3a5a2a', 'center', false);
      const line = e.lines[e.i].slice(0, Math.floor(e.shown));
      ctx.font = 'bold 20px ' + A.FONT;
      const rows = G.hud.wrap(ctx, line, w - 230);
      rows.forEach((r, i) => G.hud.text(ctx, r, x0 + 180, y0 + 40 + i * 32, 20, '#4a2e1f', 'left', false));
      G.hud.text(ctx, (e.i + 1) + ' / ' + e.lines.length, x0 + w - 24, y0 + h - 22, 13, '#8a735c', 'right', false);
      if (e.shown >= e.lines[e.i].length) {
        ctx.globalAlpha = 0.5 + Math.sin(e.t * 5) * 0.5;
        G.hud.text(ctx, '▼ 按 ' + G.input.label('jump') + ' 或點一下', x0 + w - 90, y0 + h - 22, 13, '#a4581a', 'right', false);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },

    drawVoice(ctx) {
      const v = this.voice;
      const W = G.W;
      const H = G.H;
      const t = v.t;
      ctx.save();
      ctx.fillStyle = 'rgba(6,4,16,' + Math.min(0.9, t * 1.5).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      // 漂浮的光點
      for (let i = 0; i < 40; i++) {
        const x = (i * 197 + t * 14 * ((i % 3) + 1)) % W;
        const y = H - ((i * 131 + t * 22 * ((i % 4) + 1)) % H);
        ctx.fillStyle = 'rgba(255,240,190,' + (0.25 + 0.25 * Math.sin(t * 2 + i)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      // 胸口的光：小獅子的剪影
      const cx = W / 2;
      const cy = 250;
      const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 150);
      glow.addColorStop(0, 'rgba(255,245,200,' + (0.55 + Math.sin(t * 2) * 0.15).toFixed(3) + ')');
      glow.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(cx, cy + 50);
      ctx.scale(1.6, 1.6);
      A.mode = 'flash';
      A.modeAmt = 0.75;
      A.drawLion(ctx, 0, 0, 1, { state: 'idle', t, p: 0, onGround: false, form: G.player.form, leaves: G.story.crownColors() });
      A.mode = null;
      ctx.restore();
      G.hud.text(ctx, '—— 內心的聲音 ——', cx, 360, 15, '#bfae8a', 'center', false);
      for (let i = 0; i <= v.i; i++) {
        const k = i === v.i ? Math.min(1, (v.lineT || 0) / 0.8) : 1;
        ctx.globalAlpha = k * (i === v.i ? 1 : 0.55);
        G.hud.text(ctx, v.lines[i], cx, 400 + i * 42, i === v.i ? 26 : 22, '#fff6d8', 'center');
      }
      ctx.globalAlpha = 1;
      if ((v.lineT || 0) > 0.8) {
        ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.4;
        G.hud.text(ctx, v.i < v.lines.length - 1 ? '按 ' + G.input.label('jump') + ' 繼續' : '按 ' + G.input.label('jump') + ' 找回力量', cx, H - 40, 15, '#e8dcc0', 'center', false);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },
  });

  // 時鐘停住時：世界畫完後整片褪灰（HUD、過場對話、儀式的葉子不褪）；停住那一刻已經在飛的粒子不再動
  const worldDraw = G.world.draw;
  G.world.draw = function (ctx) {
    worldDraw.call(this, ctx);
    if (C.clock) C.drawClock(ctx);
  };
  const fxUpdate = G.fx.update;
  G.fx.update = function (dt) {
    if (!C.clockHold()) return fxUpdate.call(this, dt);
    const held = [];
    const live = [];
    for (const p of this.particles) (p.clockStopped ? held : live).push(p);
    if (!held.length) return fxUpdate.call(this, dt);
    this.particles = live;
    try {
      return fxUpdate.call(this, dt);
    } finally {
      this.particles = held.concat(this.particles);
    }
  };
  // 換地圖（倒下回營、讀檔、傳送）就不再停著
  const worldLoad = G.world.load;
  G.world.load = function () {
    C.clock = null;
    return worldLoad.apply(this, arguments);
  };
  // 沒有遺言可講的情況（資料被改掉）也要停住：直接在 Boss 倒下時開始
  const bossKilled = G.world.onBossKilled;
  G.world.onBossKilled = function (b) {
    const first = !this.flags[b.id + 'Defeated'];
    const r = bossKilled.call(this, b);
    if (b.id === 'timeItself' && first && !b.recall && !G.data.story.bossWords[b.id]) C.stopClock();
    return r;
  };

  document.addEventListener('mousedown', () => {
    if (C.active()) C.clicked = true;
  });
})();
