// 結局（docs/STORY.md 第 3 節）：打倒時間 → 章末卡「看結局」之後，兩幕細畫的插圖，字一行一行出來，
// 最後回到地上的苔光營地（1-1），遊戲照常繼續（剩下的委託、野外魔王、商店都還在）。
//
//   第一幕　樹下，天剛亮。時鐘停著：全灰、葉子停在半空、天上的鐘環不轉。
//           心葉從小獅子身上飛回樹頂 → 顏色從樹頂散開、葉子開始落、鐘環又轉。
//           灰鬃轉身，走向欄杆外的階梯；老陸龜低頭說謝謝；小獅子沒有回頭看他。
//   第二幕　回到地上。黃昏的山坡上，小獅子的背影；底下是第一章的營地
//           （刺蝟婆婆、空椅子旁那杯換新的茶、營火），遠方是下一座山，雲上還浮著神殿。
//   最後一張卡片（遊玩時間）→ 回營地。
//
// 文字只用 G.data.story.ending（STORY.md：最多 6 行、最後一句固定）：最後兩行是第二幕，其他是第一幕。
// 畫法借開場動畫的圖層快取與零件（G.scenes.kit，js/ui/scenes.js），畫風跟開場一致。
// 流程掛在 G.cut 上（過場進行中世界暫停、觸控按鈕與左上角圖示隱藏），不另開 G.scene。
// 旗標：W.flags.gameCleared、W.flags.endingSeen。選單裡「重看結局」可以再看一次（看完回到原地）。
(function () {
  'use strict';
  const Kt = G.scenes && G.scenes.kit;
  if (!Kt || !G.cut || !G.ui) return; // 沒有開場的零件：保留 js/ui/finale.js 的文字版結局
  const A = G.art;
  const U = G.util;
  const OA = G.openArt;
  const C = G.cut;
  const PI2 = Math.PI * 2;
  const { cl, sm, lerp, hash, glow, haze, paint, sparkle, leafGem, leafSpr } = Kt;
  const W = () => G.W;
  const H = () => G.H;
  const BAR = Kt.BAR;
  const CAMP_MAP = '1-1'; // 回到地上：第一章的營地（空椅子、刺蝟婆婆），不是雲上的神殿前庭
  const rgba = (rgb, a) => 'rgba(' + rgb + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';

  // ════════════════ 角色：畫在離屏，加上逆光的邊與背光面 ════════════════
  const POOL = {};
  // 離屏畫布只會變大、不會每幀改大小（改大小＝重新配置記憶體，很慢）；解析度取 0.25 的倍數
  function pool(id, w, h) {
    let c = POOL[id];
    if (!c) c = POOL[id] = Kt.newCv(w, h);
    if (c.width < w || c.height < h) {
      c.width = Math.max(c.width, w);
      c.height = Math.max(c.height, h);
    }
    return c;
  }
  // fn(c) 在原點（腳底中央）畫角色。o：slot（離屏編號）、dir（光從哪邊：1 右、-1 左）、
  // rim/rimA（邊光顏色、強度）、rx/ry（邊光偏移）、shade/shadeA（背光面）、air/airA（空氣色）、alpha、box
  function litChar(ctx, x, y, s, fn, o) {
    const m = ctx.getTransform();
    const k = Math.ceil(Math.max(0.5, Math.min(3, Math.hypot(m.a, m.b) * s)) * 4) / 4;
    const box = o.box || [-130, -190, 260, 205];
    const w = Math.ceil(box[2] * k);
    const h = Math.ceil(box[3] * k);
    const c1 = pool('a' + (o.slot || 0), w, h);
    const x1 = c1.getContext('2d');
    x1.setTransform(1, 0, 0, 1, 0, 0);
    x1.globalCompositeOperation = 'source-over';
    x1.globalAlpha = 1;
    x1.clearRect(0, 0, w + 2, h + 2);
    x1.save();
    x1.beginPath();
    x1.rect(0, 0, w, h);
    x1.clip();
    x1.setTransform(k, 0, 0, k, -box[0] * k, -box[1] * k);
    const out0 = A.OUT;
    try {
      fn(x1);
    } finally {
      A.OUT = out0;
      x1.restore();
    }
    x1.setTransform(1, 0, 0, 1, 0, 0);
    let c2 = null;
    if (o.rimA) {
      c2 = pool('b' + (o.slot || 0), w, h);
      const x2 = c2.getContext('2d');
      x2.setTransform(1, 0, 0, 1, 0, 0);
      x2.globalCompositeOperation = 'source-over';
      x2.clearRect(0, 0, w + 2, h + 2);
      x2.drawImage(c1, 0, 0, w, h, 0, 0, w, h);
      x2.globalCompositeOperation = 'source-in';
      x2.fillStyle = 'rgb(' + o.rim + ')';
      x2.fillRect(0, 0, w, h);
      x2.globalCompositeOperation = 'source-over';
    }
    x1.globalCompositeOperation = 'source-atop';
    if (o.shadeA) {
      const d = o.dir || 1;
      const g = x1.createLinearGradient(d > 0 ? w : 0, 0, d > 0 ? 0 : w, h * 0.3);
      g.addColorStop(0, rgba(o.shade, 0));
      g.addColorStop(0.45, rgba(o.shade, o.shadeA * 0.55));
      g.addColorStop(1, rgba(o.shade, o.shadeA));
      x1.fillStyle = g;
      x1.fillRect(0, 0, w, h);
    }
    if (o.airA) {
      x1.fillStyle = rgba(o.air, o.airA);
      x1.fillRect(0, 0, w, h);
    }
    x1.globalCompositeOperation = 'source-over';
    const dx = x + box[0] * s;
    const dy = y + box[1] * s;
    const dw = box[2] * s;
    const dh = box[3] * s;
    const a0 = o.alpha == null ? 1 : o.alpha;
    ctx.save();
    if (c2) {
      ctx.globalAlpha *= a0 * o.rimA;
      ctx.drawImage(c2, 0, 0, w, h, dx + (o.rx || 0), dy + (o.ry || 0), dw, dh);
      if (o.rimGlow) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a0 * o.rimGlow;
        ctx.drawImage(c2, 0, 0, w, h, dx + (o.rx || 0) * 1.6, dy + (o.ry || 0) * 1.6, dw, dh);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = a0;
    } else ctx.globalAlpha *= a0;
    ctx.drawImage(c1, 0, 0, w, h, dx, dy, dw, dh);
    ctx.restore();
  }
  function contact(ctx, x, y, w, a) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.drawImage(Kt.glowSpr('30,22,34'), x - w, y - w * 0.2, w * 2, w * 0.4);
    ctx.restore();
  }
  const npcFn = (art, t, dir) => (c) => {
    const f = A.NPC_DRAW[art];
    if (!f) return;
    if (dir < 0) c.scale(-1, 1);
    f(c, t);
  };
  const lionSt = (state, t) => ({ state, t, p: 0, onGround: false, form: G.player.form || 'base', leaves: G.story.crownColors ? G.story.crownColors() : [] });

  // 會停住的落葉：tau 是「時間走了多久」，時鐘停著時 tau 不動，葉子就停在半空
  function fallLeaves(ctx, tau, n, box, seed, cols, a, drift) {
    const [x0, y0, w, h] = box;
    for (let i = 0; i < n; i++) {
      const hs = hash(i * 2.9 + seed);
      const sp = 0.55 + hash(i * 6.1 + seed) * 0.7;
      const k = (hash(i * 4.3 + seed) + (tau * 0.055 * sp)) % 1;
      const y = y0 + k * h;
      const x = x0 + ((hash(i * 1.7 + seed) * w + tau * (drift || 14) * sp) % w) + Math.sin(tau * 1.1 * sp + i * 2.3) * 26;
      const sz = 5 + hash(i * 8.3 + seed) * 7;
      const rot = tau * (1.2 + hs * 2.4) + i * 1.9;
      const flip = Math.cos(tau * (2 + hs * 2) + i * 1.3);
      ctx.save();
      ctx.globalAlpha = a * Math.min(1, Math.sin(k * Math.PI) * 4);
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(1, Math.max(0.2, Math.abs(flip)));
      ctx.drawImage(leafSpr(cols[i % cols.length]), -sz, -sz, sz * 2, sz * 2);
      ctx.restore();
    }
  }
  // 往上飄的星沙（時間碎掉的地方）
  function starSand(ctx, tau, n, box, seed, a) {
    const [x0, y0, w, h] = box;
    for (let i = 0; i < n; i++) {
      const sp = 0.5 + hash(i * 3.3 + seed) * 0.9;
      const k = (hash(i * 5.7 + seed) + tau * 0.04 * sp) % 1;
      const x = x0 + hash(i * 2.1 + seed) * w + Math.sin(tau * 0.8 + i) * 10 * k;
      const y = y0 + h - k * h;
      const tw = 0.55 + 0.45 * Math.sin(tau * 3.1 + i * 1.7);
      const al = a * Math.sin(k * Math.PI) * tw;
      if (al < 0.02) continue;
      sparkle(ctx, x, y, 1.6 + hash(i * 9.9 + seed) * 2.6, al, i % 3 ? '#fff2c0' : '#ffd98a');
    }
  }

  // ════════════════ 第一幕：樹下，天剛亮 ════════════════
  const SKY_END = [[0, '#56609e'], [0.3, '#8f89c0'], [0.55, '#e0acb8'], [0.76, '#ffc9a0'], [1, '#ffe2b8']];
  const SUN = [1045, 452];
  const HEART = [Kt.TREE_X + Kt.TREE_LEAVES[4][0] * Kt.TREE_S, Kt.TREE_Y + Kt.TREE_LEAVES[4][1] * Kt.TREE_S];
  // 角色站在樹根前面的石板上（比石像近），鏡頭平常壓低看他們，心葉飛回去時才抬頭看樹頂
  const TORT = { x: 470, y: 708, s: 1.12 };
  const LION = { x: 808, y: 714, s: 1.16 };
  const GREY0 = { x: 1004, y: 702, s: 1.08 };
  const GREY1 = { x: 1380, y: 692, s: 1.08 };
  const CAM_LOW = { y: 478, z: 1.12 };
  const CAM_HIGH = { y: 330, z: 1.0 };
  const FALL_COLS = ['#f2b85a', '#ffc2d8', '#9ad886', '#e8864a', '#fff0c8'];

  // 打鬥之後的地面：斷掉的時針、半埋的齒輪、碎石、裂痕、星沙
  function drawRubble(c) {
    const r = U.seeded(577);
    // 從鐘紋中心裂開
    c.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      let a = Math.PI * (0.05 + (i / 8) * 0.9) + (r() - 0.5) * 0.2;
      let x = 640 + Math.cos(a) * 60;
      let y = 648 + Math.sin(a) * 10;
      const len = 60 + r() * 120;
      c.beginPath();
      c.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        a += (r() - 0.5) * 0.6;
        x += Math.cos(a) * (len / 5);
        y += Math.sin(a) * (len / 5) * 0.2 + 1.5;
        c.lineTo(x, y);
      }
      c.strokeStyle = 'rgba(92,70,60,0.42)';
      c.lineWidth = 1.8;
      c.stroke();
      c.translate(0, 1.2);
      c.strokeStyle = 'rgba(255,248,236,0.5)';
      c.lineWidth = 1;
      c.stroke();
      c.translate(0, -1.2);
    }
    // 斷掉的時針（青銅）：斜躺在右前方，斷口朝外
    c.save();
    c.translate(1012, 694);
    c.rotate(-0.16);
    const hand = (p) => {
      p.moveTo(-120, -3);
      p.lineTo(-40, -8);
      p.quadraticCurveTo(-26, -20, -12, -8);
      p.lineTo(70, -5);
      p.lineTo(76, -9);
      p.lineTo(82, -2);
      p.lineTo(78, 3);
      p.lineTo(84, 7);
      p.lineTo(70, 6);
      p.lineTo(-12, 8);
      p.quadraticCurveTo(-26, 20, -40, 8);
      p.lineTo(-120, 4);
      p.lineTo(-138, 0);
      p.closePath();
    };
    c.fillStyle = 'rgba(40,26,20,0.28)';
    c.save();
    c.translate(6, 8);
    c.scale(1, 0.6);
    c.beginPath();
    hand(c);
    c.fill();
    c.restore();
    const g = c.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, '#f2cf7a');
    g.addColorStop(0.45, '#c8923e');
    g.addColorStop(1, '#6e4a22');
    paint(c, hand, '#c8923e', { lw: 2.2 });
    c.save();
    c.beginPath();
    hand(c);
    c.clip();
    c.fillStyle = g;
    c.fillRect(-150, -24, 260, 48);
    OA.texture(c, -150, -24, 260, 48, { fbm: 0.5, grain: 0.3, scale: 0.5 });
    c.fillStyle = 'rgba(255,246,210,0.6)';
    c.fillRect(-120, -5, 190, 1.4);
    c.restore();
    c.beginPath();
    c.arc(-26, 0, 6, 0, PI2);
    c.fillStyle = '#5a3a1a';
    c.fill();
    c.restore();
    // 半埋的齒輪
    [[214, 700, 26, 0.3], [1092, 608, 13, 1.1], [584, 716, 11, 2]].forEach(([x, y, R, rot]) => {
      c.save();
      c.translate(x, y);
      c.scale(1, 0.55);
      c.rotate(rot);
      const teeth = Math.round(R * 0.7) + 6;
      c.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i / (teeth * 2)) * PI2;
        const rr = i % 2 ? R : R * 0.82;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      c.moveTo(R * 0.34, 0);
      c.arc(0, 0, R * 0.34, 0, PI2, true);
      c.fillStyle = '#b88a3e';
      c.fill('evenodd');
      c.strokeStyle = 'rgba(80,50,20,0.55)';
      c.lineWidth = 1.4;
      c.stroke();
      c.restore();
      c.fillStyle = 'rgba(255,238,190,0.5)';
      c.fillRect(x - R * 0.7, y - R * 0.5, R * 0.8, 1.2);
    });
    // 碎掉的大理石
    const chunks = [[176, 666, 16], [262, 722, 10], [336, 684, 7], [566, 690, 9], [700, 716, 12], [726, 668, 6], [912, 668, 8], [950, 722, 14], [1210, 740, 12], [380, 736, 8], [118, 744, 13], [1036, 750, 9]];
    chunks.forEach(([x, y, s], i) => {
      const n = 5 + (i % 3);
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * PI2 + r() * 0.5;
        pts.push([Math.cos(a) * s * (0.7 + r() * 0.4), Math.sin(a) * s * (0.45 + r() * 0.25) - s * 0.3]);
      }
      c.save();
      c.translate(x, y);
      c.fillStyle = 'rgba(60,40,40,0.22)';
      c.beginPath();
      c.ellipse(2, 2, s * 1.1, s * 0.3, 0, 0, PI2);
      c.fill();
      const path = (p) => pts.forEach((q, j) => (j ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
      paint(c, (p) => {
        path(p);
        p.closePath();
      }, Kt.MARBLE, { shade: Kt.MARBLE_S, cel: [s * 0.25, -s * 0.2], lw: 1.6, hl: [-s * 0.3, -s * 0.5, s * 0.3, s * 0.12], hlA: 0.6 });
      c.restore();
    });
    // 星沙：鐘紋中間薄薄一層
    for (let i = 0; i < 90; i++) {
      const a = r() * PI2;
      const d = Math.sqrt(r());
      const x = 640 + Math.cos(a) * 260 * d;
      const y = 652 + Math.sin(a) * 40 * d;
      c.fillStyle = i % 4 ? 'rgba(255,226,150,0.55)' : 'rgba(255,255,236,0.8)';
      c.beginPath();
      c.arc(x, y, 0.8 + r() * 1.4, 0, PI2);
      c.fill();
    }
  }

  function clockHands(ctx, cx, cy, s, tau, a) {
    const hands = [[-0.62 + tau * 0.018, 150 * s, 7 * s], [-0.1 + tau * 0.2, 238 * s, 4.5 * s]];
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(cx, cy);
    ctx.fillStyle = '#fff0c0';
    hands.forEach(([ang, len, wd]) => {
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-wd, 0);
      ctx.lineTo(-wd * 0.3, -len);
      ctx.lineTo(0, -len - wd * 2.2);
      ctx.lineTo(wd * 0.3, -len);
      ctx.lineTo(wd, 0);
      ctx.lineTo(wd * 0.5, len * 0.14);
      ctx.lineTo(-wd * 0.5, len * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(0, 0, 11 * s, 0, PI2);
    ctx.fill();
    ctx.restore();
  }

  function drawTemple(ctx, E) {
    const st = E.st;
    const b = E.beat;
    const tau = E.tau;
    const rs = E.restart == null ? -1 : st - E.restart;
    // 鏡頭：低 → 跟著心葉抬頭看樹頂 → 顏色散開後再放下來看灰鬃離開 → 第四行慢慢推近
    const up = b[1] != null ? sm(b[1] + 0.3, b[1] + 3.0, st) : 0;
    const back = Math.max(b[1] != null ? sm(b[1] + 5.4, b[1] + 8.4, st) : 0, b[2] != null ? sm(b[2] - 0.2, b[2] + 2.4, st) : 0);
    const push = b[3] != null ? sm(b[3], b[3] + 6, st) : 0;
    const Cm = {
      x: 640 + Math.sin(st * 0.11) * 8,
      y: lerp(lerp(CAM_LOW.y, CAM_HIGH.y, up), CAM_LOW.y + 8, back) - Math.sin(st * 0.17) * 3,
      z: lerp(lerp(CAM_LOW.z, CAM_HIGH.z, up), CAM_LOW.z + 0.01, back) + push * 0.05 + st * 0.0008,
    };
    const flow = rs < 0 ? 0 : sm(0, 1.8, rs);
    const warm = rs < 0 ? 0 : sm(0, 4, rs);
    Kt.sky(ctx, SKY_END, [SUN[0], SUN[1], 640, '255,226,176', 0.9]);
    // 天上最後幾顆星（時鐘停著時一樣亮，時間走了就慢慢淡掉）
    ctx.save();
    for (let i = 0; i < 40; i++) {
      const x = hash(i * 3.1) * W();
      const y = 64 + hash(i * 7.7) * 170;
      const a = (0.25 + 0.5 * hash(i * 1.9)) * (1 - warm * 0.7) * (0.75 + 0.25 * Math.sin(tau * 2 + i));
      ctx.fillStyle = rgba('255,250,235', a);
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.restore();
    // 天上的鐘環與指針：停著；時間走了才開始轉
    Kt.cam(ctx, Cm, 0.1, () => {
      ctx.save();
      ctx.globalAlpha = 0.3;
      Kt.blitAt(ctx, 'ringA', 640, 250, 1.15, 0.4 + tau * 0.025);
      Kt.blitAt(ctx, 'ringB', 640, 250, 1.15, -0.9 - tau * 0.04);
      ctx.restore();
      clockHands(ctx, 640, 250, 1.15, tau, 0.34);
    });
    Kt.cam(ctx, Cm, 0.3, () => {
      Kt.band(ctx, 'bandFar', 40 + tau * 8, 410, 80);
    });
    // 地平線上剛冒出來的太陽
    Kt.cam(ctx, Cm, 0.45, () => {
      haze(ctx, SUN[0], SUN[1] + 20, 300, '255,214,160', 0.55 + warm * 0.2);
      glow(ctx, SUN[0], SUN[1] + 26, 70, '255,244,214', 0.8);
      glow(ctx, SUN[0], SUN[1] + 26, 180, '255,196,140', 0.35 + warm * 0.15);
    });
    Kt.cam(ctx, Cm, 0.6, () => Kt.blit(ctx, 'cyBack'));
    // 低低的晨光，從右邊掃過來
    Kt.rays(ctx, SUN[0], SUN[1] - 10, Math.PI + 0.1, [[0, 60, 0.5], [110, 90, 0.35], [-120, 70, 0.3], [230, 110, 0.22]], 1300, '255,226,180', (0.3 + warm * 0.25) * (0.85 + Math.sin(tau * 0.6) * 0.15));
    const lionDir = b[3] != null && st > b[3] + 0.8 ? 1 : -1;
    Kt.cam(ctx, Cm, 1, () => {
      Kt.blit(ctx, 'cyFloor');
      Kt.blit(ctx, 'edRubble');
      // 地上的鐘紋：時間走了才又亮起來
      if (flow > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (0.2 + 0.2 * Math.sin(tau * 2.2)) * flow;
        ctx.strokeStyle = '#ffe9a0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(640, 640, 330, 52, 0, 0, PI2);
        ctx.stroke();
        ctx.restore();
      }
      glow(ctx, Kt.TREE_X, Kt.TREE_Y - 170 * Kt.TREE_S, 60, '255,220,140', (0.2 + flow * 0.3) + Math.sin(tau * 2) * 0.1 * flow);
      Kt.blit(ctx, 'treeTrunk', Kt.TREE_X, Kt.TREE_Y);
      const lean = Math.sin(tau * 0.8) * 0.006;
      const pivot = Kt.TREE_Y - 300 * Kt.TREE_S;
      ctx.save();
      ctx.translate(Kt.TREE_X, pivot);
      ctx.transform(1, 0, lean, 1, 0, 0);
      ctx.translate(-Kt.TREE_X, -pivot);
      const Lc = Kt.layer('treeCanopy');
      ctx.drawImage(Lc.c, Kt.TREE_X + Lc.x, Kt.TREE_Y + Lc.y, Lc.w, Lc.h);
      ctx.restore();
      const heartOn = rs >= 0;
      Kt.treeLeaves(ctx, Kt.TREE_X, Kt.TREE_Y, Kt.TREE_S, tau, { gone: [false, false, false, false, !heartOn], glow: 0.45 + flow * 0.55, alpha: 0.4 + flow * 0.6, dx: (yy) => (yy + Kt.TREE_Y - pivot) * lean });
      Kt.blit(ctx, 'cyFore');
      // 角色（比石像近，畫在石像前面）
      // 灰鬃：先看著你，再轉身往右邊走出畫面（欄杆外的階梯在那裡）
      const gw = b[2] != null ? cl((st - b[2] - 1.3) / 5.2) : 0;
      const ge = gw * gw * (3 - 2 * gw);
      const gx = lerp(GREY0.x, GREY1.x, ge);
      const gy = lerp(GREY0.y, GREY1.y, ge);
      const gs = lerp(GREY0.s, GREY1.s, ge);
      const walking = gw > 0 && gw < 1;
      const bob = walking ? -Math.abs(Math.sin((st - b[2]) * 5.2)) * 3 * gs : 0;
      const gDir = b[2] != null && st > b[2] + 1.1 ? 1 : -1;
      const gA = 1 - sm(0.9, 1, gw);
      if (gA > 0.01) {
        contact(ctx, gx, gy, 30 * gs, 0.55 * gA);
        litChar(ctx, gx, gy + bob, gs, npcFn('greymane', walking ? 0 : tau, gDir), { slot: 0, dir: 1, rim: '255,214,160', rimA: 0.95, rimGlow: 0.25 * warm, rx: 2.2, ry: -1, shade: '60,50,96', shadeA: 0.42, air: '220,200,230', airA: 0.08, alpha: gA });
      }
      // 老陸龜：第四行時低頭（謝謝）
      const bow = b[3] != null ? sm(b[3] + 0.2, b[3] + 0.9, st) * (1 - sm(b[3] + 2.4, b[3] + 3.4, st)) : 0;
      contact(ctx, TORT.x, TORT.y, 42 * TORT.s, 0.6);
      litChar(ctx, TORT.x, TORT.y, TORT.s, (c) => {
        c.rotate(bow * 0.09);
        npcFn('tortoisesage', tau, 1)(c);
      }, { slot: 1, dir: 1, rim: '255,214,160', rimA: 0.9, rimGlow: 0.2 * warm, rx: 2, ry: -1, shade: '60,50,96', shadeA: 0.38 });
      // 小獅子：看著樹；老陸龜說謝謝之後，轉頭看灰鬃走掉的方向
      contact(ctx, LION.x, LION.y, 30 * LION.s, 0.6);
      litChar(ctx, LION.x, LION.y, LION.s, (c) => A.drawLion(c, 0, 0, lionDir, lionSt('idle', tau)), { slot: 2, dir: 1, rim: '255,218,170', rimA: 0.95, rimGlow: 0.25 * warm, rx: 2.2, ry: -1, shade: '60,50,96', shadeA: 0.36, box: [-150, -200, 300, 215] });
      // 時間碎成的星沙，往上飄
      starSand(ctx, tau + 3, 46, [330, 300, 620, 380], 7, 0.9);
    });
    // 會停住的落葉（前面一層大、後面一層小）
    Kt.cam(ctx, Cm, 0.8, () => fallLeaves(ctx, tau + 4, 22, [-40, 40, 1360, 640], 3, FALL_COLS, 0.85, 10));
    Kt.cam(ctx, Cm, 1.25, () => fallLeaves(ctx, tau * 1.2 + 9, 9, [-60, 20, 1400, 700], 11, FALL_COLS, 0.95, 16));
    // 天亮的色調：上面偏藍紫、下面偏暖
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const gm = ctx.createLinearGradient(0, 0, 0, H());
    gm.addColorStop(0, 'rgba(168,160,214,0.55)');
    gm.addColorStop(0.5, 'rgba(236,206,214,0.4)');
    gm.addColorStop(1, 'rgba(248,214,196,0.45)');
    ctx.fillStyle = gm;
    ctx.fillRect(0, 0, W(), H());
    ctx.restore();
    // 時鐘停著：全灰；心葉回到樹頂後，顏色從那裡一圈圈散開
    const reveal = rs < 0 ? 0 : sm(0, 3.2, rs);
    if (reveal < 1) {
      const hp = scr(Cm, 1, HEART[0], HEART[1]);
      const R = reveal * 1900;
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      if (R > 0) {
        const g = ctx.createRadialGradient(hp[0], hp[1], Math.max(0, R - 380), hp[0], hp[1], R + 1);
        g.addColorStop(0, 'rgba(128,128,128,0)');
        g.addColorStop(1, 'rgba(128,128,128,0.94)');
        ctx.fillStyle = g;
      } else ctx.fillStyle = 'rgba(128,128,128,0.94)';
      ctx.fillRect(0, 0, W(), H());
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(26,30,46,' + (0.2 * (1 - reveal)).toFixed(3) + ')';
      ctx.fillRect(0, 0, W(), H());
      ctx.restore();
    }
    // 心葉（在灰色的世界裡唯一有顏色的東西）：從小獅子身上升起、飛回樹頂
    if (b[1] != null) {
      const u = cl((st - b[1] - 0.5) / 2.1);
      Kt.cam(ctx, Cm, 1, () => {
        if (u > 0 && u < 1) {
          const e = u * u * (3 - 2 * u);
          const p0 = [LION.x - 6, LION.y - 86];
          const p1 = [780, 300];
          const pos = (q) => {
            const w0 = (1 - q) * (1 - q);
            const w1 = 2 * q * (1 - q);
            const w2 = q * q;
            return [w0 * p0[0] + w1 * p1[0] + w2 * HEART[0], w0 * p0[1] + w1 * p1[1] + w2 * HEART[1]];
          };
          for (let j = 1; j <= 14; j++) {
            const q = e - j * 0.02;
            if (q <= 0) break;
            const [x, y] = pos(q);
            sparkle(ctx, x + Math.sin(j * 2.3 + st * 3) * 5, y, 3.2 * (1 - j / 15) + 0.6, (1 - j / 15) * 0.9, j % 3 ? '#fff6d8' : '#ffd35a');
          }
          const [x, y] = pos(e);
          haze(ctx, x, y, 46, '255,211,90', 0.5);
          glow(ctx, x, y, 70, '255,211,90', 0.55);
          glow(ctx, x, y, 22, '255,255,240', 0.6);
          leafGem(ctx, x, y, 13, '#ffd35a', st * 2.2);
        }
        // 放回去的那一刻：柔柔的一圈光（不是白閃）
        if (rs >= 0 && rs < 3.5) {
          const k = rs / 3.5;
          glow(ctx, HEART[0], HEART[1], 60 + k * 260, '255,214,130', 0.5 * (1 - k));
          ctx.save();
          ctx.globalAlpha = 0.5 * (1 - k);
          ctx.strokeStyle = '#ffe9a8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(HEART[0], HEART[1], 20 + k * 180, 0, PI2);
          ctx.stroke();
          ctx.restore();
        }
      });
    }
    vignette(ctx, 0.34);
  }
  // 世界座標（在 cam 的第 f 層）→ 畫面座標
  function scr(Cm, f, x, y) {
    const z = 1 + (Cm.z - 1) * f;
    const cx = W() / 2 + (Cm.x - W() / 2) * f;
    const cy = H() / 2 + (Cm.y - H() / 2) * f;
    return [W() / 2 + (Cm.sx || 0) * f + (x - cx) * z, H() / 2 + (Cm.sy || 0) * f + (y - cy) * z];
  }
  const VIG = {};
  function vignette(ctx, a) {
    let c = VIG.c;
    if (!c) {
      c = VIG.c = Kt.newCv(320, 180);
      const x = c.getContext('2d');
      const g = x.createRadialGradient(160, 96, 60, 160, 90, 200);
      g.addColorStop(0, 'rgba(14,10,28,0)');
      g.addColorStop(1, 'rgba(14,10,28,1)');
      x.fillStyle = g;
      x.fillRect(0, 0, 320, 180);
    }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(c, 0, 0, W(), H());
    ctx.restore();
  }

  // ════════════════ 第二幕：回到地上，黃昏 ════════════════
  const SKY_DUSK = [[0, '#27305e'], [0.28, '#4d4f86'], [0.5, '#9a7aa6'], [0.66, '#e0948e'], [0.8, '#f6b27c'], [1, '#ffd49a']];
  const DSUN = [250, 470];
  const PEAK = [1030, 262];
  // 第一章的苔光營地（跟遊戲裡同一個地方）：樹屋、貓頭鷹的小攤、龜爺爺的空椅子、營火、菇菇的蘑菇屋
  const GY = 566;
  const CAMP = { tree: 600, stall: 712, chair: 790, cup: 812, fire: 884, mush: 1072, pole: 1170 };
  const HILL_Y = (x) => {
    // 前景山坡的稜線：小獅子站的地方最高，往右邊掉下去
    const base = x < 520 ? 616 + Math.pow(Math.max(0, 300 - x) / 300, 2) * 26 : 616 + Math.pow((x - 520) / 760, 1.5) * 190;
    return base + (OA.fbm(x * 0.012, 3, 91, 3) - 0.5) * 14;
  };
  const LIONB = { x: 432, s: 1.14 };
  // 樹屋平台 → 蘑菇屋的燈串
  const BULBS = (() => {
    const out = [];
    const [ax, ay] = [CAMP.tree + 44, GY - 110];
    const [bx, by] = [CAMP.mush - 58, GY - 92];
    for (let i = 1; i < 14; i++) {
      const u = i / 14;
      out.push([lerp(ax, bx, u), lerp(ay, by, u) + Math.sin(u * Math.PI) * 30]);
    }
    return out;
  })();

  function ridge(x0, x1, step, fy) {
    const p = [];
    for (let x = x0; x <= x1 + step; x += step) p.push([x, fy(x)]);
    return p;
  }
  function fillRidge(c, pts, bottom, fill) {
    c.beginPath();
    c.moveTo(pts[0][0], bottom);
    pts.forEach((q) => c.lineTo(q[0], q[1]));
    c.lineTo(pts[pts.length - 1][0], bottom);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }
  // 山的受光：每一段稜線往下畫一條，朝左（朝夕陽）的坡亮、朝右的坡暗
  function faceStrips(c, pts, depth, lit, dark, a) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const slope = (y1 - y0) / (x1 - x0);
      const k = cl(-slope * 1.3);
      const kd = cl(slope * 1.3);
      if (k < 0.05 && kd < 0.05) continue;
      const g = c.createLinearGradient(0, Math.min(y0, y1), 0, Math.min(y0, y1) + depth);
      const col = k > kd ? lit : dark;
      const aa = (k > kd ? k : kd) * a;
      g.addColorStop(0, rgba(col, aa));
      g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.lineTo(x1 + slope * 30, y1 + depth);
      c.lineTo(x0 + slope * 30, y0 + depth);
      c.closePath();
      c.fill();
    }
  }

  function drawFar(c) {
    const r = U.seeded(4242);
    // 高高的卷雲：底下被夕陽照到
    [[160, 150, 260, 10], [520, 110, 340, 8], [880, 90, 300, 7], [1180, 170, 260, 9], [380, 220, 200, 6], [760, 196, 220, 6]].forEach(([x, y, w, h]) => {
      for (let i = 0; i < 7; i++) {
        const xx = x + (r() - 0.5) * w * 0.8;
        const yy = y + (r() - 0.5) * h * 2;
        OA.soft(c, xx, yy, w * (0.25 + r() * 0.3), h * (0.8 + r()), '255,196,176', 0.22);
        OA.soft(c, xx + 6, yy + h * 0.6, w * (0.2 + r() * 0.2), h * 0.6, '255,222,170', 0.18);
      }
    });
    // 雲上的神殿，還浮著（很遠、很淡）
    try {
      const L = Kt.layer('isle');
      OA.hazed(c, '206,176,214', 0.6, (x) => {
        const s = 0.1;
        x.drawImage(L.c, 1196 + L.x * s, 112 + L.y * s, L.w * s, L.h * s);
      });
      Kt.free(['isle']);
    } catch (e) {}
    // 最遠的一排山，中間那座最高（下一座山）
    const bump = (x, px, h, w) => h * Math.pow(Math.max(0, 1 - Math.abs(x - px) / w), 1.25);
    const fy = (x) => 468 - bump(x, PEAK[0], 206, 320) - bump(x, 700, 96, 230) - bump(x, 1270, 120, 220) - bump(x, 330, 70, 260) - bump(x, 60, 60, 200) - (OA.fbm(x * 0.02, 1, 11, 5) - 0.5) * 30 - (OA.fbm(x * 0.06, 2, 12, 3) - 0.5) * 12 * (1 + bump(x, PEAK[0], 1, 330));
    const p0 = ridge(-100, 1380, 4, fy);
    const g0 = c.createLinearGradient(0, 220, 0, 520);
    g0.addColorStop(0, '#a08fbc');
    g0.addColorStop(0.6, '#b49cc0');
    g0.addColorStop(1, '#d6b0bc');
    fillRidge(c, p0, 620, g0);
    c.save();
    c.beginPath();
    c.moveTo(p0[0][0], 620);
    p0.forEach((q) => c.lineTo(q[0], q[1]));
    c.lineTo(p0[p0.length - 1][0], 620);
    c.closePath();
    c.clip();
    faceStrips(c, p0, 150, '255,190,190', '92,82,140', 0.5);
    // 雪：山頂附近，被夕陽染成粉紅；背光那面是淡紫
    for (let i = 0; i + 1 < p0.length; i++) {
      const [x0, y0] = p0[i];
      const [x1, y1] = p0[i + 1];
      const line = 380 - bump(x0, PEAK[0], 60, 280) + (OA.fbm(x0 * 0.05, 4, 13, 3) - 0.5) * 60;
      if (y0 > line) continue;
      const lit = y1 < y0;
      c.fillStyle = lit ? 'rgba(252,222,230,0.8)' : 'rgba(190,180,222,0.75)';
      const d = Math.max(4, line - y0) * (0.6 + OA.fbm(x0 * 0.08, 5, 14, 2) * 0.8);
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.lineTo(x1 + (lit ? -1 : 1) * d * 0.25, y1 + d);
      c.lineTo(x0 + (lit ? -1 : 1) * d * 0.25, y0 + d * 0.8);
      c.closePath();
      c.fill();
    }
    // 岩溝：從稜線往下的細線
    for (let i = 0; i < 70; i++) {
      const x = PEAK[0] + (r() - 0.5) * 560;
      const y = fy(x) + 4;
      const len = 30 + r() * 90;
      const lean = (x < PEAK[0] ? -1 : 1) * (0.2 + r() * 0.3);
      c.strokeStyle = x < PEAK[0] ? 'rgba(255,238,240,' + (0.2 + r() * 0.3).toFixed(2) + ')' : 'rgba(70,62,112,' + (0.18 + r() * 0.2).toFixed(2) + ')';
      c.lineWidth = 0.8 + r();
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + lean * len * 0.5 + (r() - 0.5) * 10, y + len * 0.5, x + lean * len, y + len);
      c.stroke();
    }
    c.restore();
    // 空氣：整排山蒙一層淡紫，山頂最淡
    const air = c.createLinearGradient(0, 240, 0, 480);
    air.addColorStop(0, 'rgba(176,150,196,0.12)');
    air.addColorStop(1, 'rgba(214,170,190,0.4)');
    c.save();
    c.beginPath();
    c.moveTo(p0[0][0], 620);
    p0.forEach((q) => c.lineTo(q[0], q[1]));
    c.lineTo(p0[p0.length - 1][0], 620);
    c.closePath();
    c.fillStyle = air;
    c.fill();
    c.restore();
    // 山腳的霧
    const mist = c.createLinearGradient(0, 400, 0, 520);
    mist.addColorStop(0, 'rgba(236,196,204,0)');
    mist.addColorStop(1, 'rgba(236,196,204,0.8)');
    c.fillStyle = mist;
    c.fillRect(-100, 400, 1480, 220);
    // 第二排山（比較近、比較暗）
    const fy1 = (x) => 476 - bump(x, 180, 60, 300) - bump(x, 560, 44, 260) - bump(x, 1180, 70, 300) - (OA.fbm(x * 0.012, 6, 21, 5) - 0.5) * 50 - (OA.fbm(x * 0.05, 7, 22, 3) - 0.5) * 10;
    const p1 = ridge(-100, 1380, 5, fy1);
    const g1 = c.createLinearGradient(0, 400, 0, 560);
    g1.addColorStop(0, '#7f7098');
    g1.addColorStop(1, '#b893a4');
    fillRidge(c, p1, 640, g1);
    c.save();
    c.beginPath();
    c.moveTo(p1[0][0], 640);
    p1.forEach((q) => c.lineTo(q[0], q[1]));
    c.lineTo(p1[p1.length - 1][0], 640);
    c.closePath();
    c.clip();
    faceStrips(c, p1, 90, '255,178,160', '60,54,100', 0.45);
    // 稜線上一排很小的樹
    for (let x = -90; x < 1380; x += 5 + r() * 7) {
      const y = fy1(x) + 2;
      const h = 5 + r() * 9;
      c.fillStyle = 'rgba(88,76,116,0.85)';
      c.beginPath();
      c.moveTo(x - h * 0.35, y + 2);
      c.lineTo(x, y - h);
      c.lineTo(x + h * 0.35, y + 2);
      c.closePath();
      c.fill();
    }
    c.restore();
    const mist2 = c.createLinearGradient(0, 450, 0, 560);
    mist2.addColorStop(0, 'rgba(230,184,190,0)');
    mist2.addColorStop(1, 'rgba(230,184,190,0.75)');
    c.fillStyle = mist2;
    c.fillRect(-100, 450, 1480, 200);
  }

  // 菇菇的蘑菇屋：紅傘、白點、圓窗裡點著燈、煙囪
  function mushHouse(c, x, y, s) {
    const r = U.seeded(41);
    OA.soft(c, x + 8 * s, y + 2, 80 * s, 10 * s, '20,14,20', 0.5);
    // 傘柄＝牆
    const wall = (p) => {
      p.moveTo(x - 40 * s, y);
      p.quadraticCurveTo(x - 44 * s, y - 40 * s, x - 34 * s, y - 70 * s);
      p.lineTo(x + 34 * s, y - 70 * s);
      p.quadraticCurveTo(x + 44 * s, y - 40 * s, x + 40 * s, y);
      p.closePath();
    };
    c.save();
    c.beginPath();
    wall(c);
    const g = c.createLinearGradient(x - 44 * s, 0, x + 44 * s, 0);
    g.addColorStop(0, '#e8d6ba');
    g.addColorStop(0.55, '#b8a08a');
    g.addColorStop(1, '#6e5a5a');
    c.fillStyle = g;
    c.fill();
    c.clip();
    OA.texture(c, x - 50 * s, y - 80 * s, 100 * s, 90 * s, { fbm: 0.6, grain: 0.3, scale: 0.4 });
    c.restore();
    // 門：縫裡透出暖光
    paint(c, (p) => {
      p.moveTo(x - 12 * s, y);
      p.lineTo(x - 12 * s, y - 26 * s);
      p.quadraticCurveTo(x, y - 40 * s, x + 12 * s, y - 26 * s);
      p.lineTo(x + 12 * s, y);
      p.closePath();
    }, '#6a4630', { shade: '#48301f', cel: [5 * s, 0], lw: 1.2 });
    c.fillStyle = 'rgba(255,196,110,0.85)';
    c.fillRect(x + 10 * s, y - 26 * s, 1.6 * s, 26 * s);
    // 圓窗
    [[-24, -46], [24, -44]].forEach(([dx, dy]) => {
      c.fillStyle = '#ffd488';
      c.beginPath();
      c.arc(x + dx * s, y + dy * s, 7 * s, 0, PI2);
      c.fill();
      c.strokeStyle = '#5a3c28';
      c.lineWidth = 1.6 * s;
      c.stroke();
      c.beginPath();
      c.moveTo(x + dx * s - 7 * s, y + dy * s);
      c.lineTo(x + dx * s + 7 * s, y + dy * s);
      c.moveTo(x + dx * s, y + dy * s - 7 * s);
      c.lineTo(x + dx * s, y + dy * s + 7 * s);
      c.lineWidth = 1 * s;
      c.stroke();
    });
    // 傘蓋
    const cap = (p) => {
      p.moveTo(x - 82 * s, y - 60 * s);
      p.quadraticCurveTo(x - 90 * s, y - 128 * s, x, y - 136 * s);
      p.quadraticCurveTo(x + 90 * s, y - 128 * s, x + 82 * s, y - 60 * s);
      p.quadraticCurveTo(x, y - 76 * s, x - 82 * s, y - 60 * s);
      p.closePath();
    };
    c.save();
    c.beginPath();
    cap(c);
    const cg = c.createRadialGradient(x - 40 * s, y - 118 * s, 6 * s, x, y - 90 * s, 110 * s);
    cg.addColorStop(0, '#e2685a');
    cg.addColorStop(0.5, '#b8433c');
    cg.addColorStop(1, '#6a2a34');
    c.fillStyle = cg;
    c.fill();
    c.clip();
    OA.texture(c, x - 95 * s, y - 140 * s, 190 * s, 90 * s, { fbm: 0.6, grain: 0.3, scale: 0.4 });
    [[-50, -96, 13], [-14, -118, 10], [30, -104, 14], [62, -84, 9], [-70, -74, 8], [4, -86, 8], [48, -126, 7]].forEach(([dx, dy, rr]) => {
      paint(c, (p) => p.ellipse(x + dx * s, y + dy * s, rr * s, rr * 0.72 * s, 0, 0, PI2), '#f0e2d2', { shade: '#b8a6a6', cel: [rr * 0.3 * s, rr * 0.25 * s], lw: 1 });
    });
    // 夕陽照到的左上緣
    c.strokeStyle = 'rgba(255,190,140,0.6)';
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(x - 80 * s, y - 64 * s);
    c.quadraticCurveTo(x - 88 * s, y - 126 * s, x - 4 * s, y - 134 * s);
    c.stroke();
    c.restore();
    // 傘蓋下緣的影子
    c.fillStyle = 'rgba(40,20,30,0.35)';
    c.beginPath();
    c.moveTo(x - 80 * s, y - 60 * s);
    c.quadraticCurveTo(x, y - 76 * s, x + 80 * s, y - 60 * s);
    c.quadraticCurveTo(x, y - 66 * s, x - 80 * s, y - 60 * s);
    c.fill();
    // 煙囪
    paint(c, (p) => p.rect(x + 36 * s, y - 150 * s, 10 * s, 26 * s), '#6a6470', { shade: '#48424e', cel: [4 * s, 0], lw: 1 });
    paint(c, (p) => p.rect(x + 33 * s, y - 154 * s, 16 * s, 5 * s), '#7a7480', { lw: 1 });
    r();
  }
  // 樹屋：粗樹幹、半空中的小木屋（窗裡點燈）、梯子
  function treeHouse(c, x, y, s) {
    const trunk = (p) => {
      p.moveTo(x - 30 * s, y + 4);
      p.quadraticCurveTo(x - 16 * s, y - 60 * s, x - 18 * s, y - 230 * s);
      p.lineTo(x + 18 * s, y - 230 * s);
      p.quadraticCurveTo(x + 14 * s, y - 60 * s, x + 32 * s, y + 4);
      p.closePath();
    };
    c.save();
    c.beginPath();
    trunk(c);
    const g = c.createLinearGradient(x - 30 * s, 0, x + 30 * s, 0);
    g.addColorStop(0, '#6a4e40');
    g.addColorStop(0.4, '#3e2c28');
    g.addColorStop(1, '#1e1618');
    c.fillStyle = g;
    c.fill();
    c.clip();
    OA.texture(c, x - 40 * s, y - 240 * s, 80 * s, 250 * s, { fbm: 0.5, streak: 0.6, grain: 0.3, scale: 0.4, angle: Math.PI / 2 });
    c.restore();
    // 平台與小屋
    const py = y - 118 * s;
    paint(c, (p) => p.rect(x - 56 * s, py, 112 * s, 7 * s), '#7a5638', { shade: '#4a3222', cel: [0, 3 * s], lw: 1.2 });
    paint(c, (p) => {
      p.moveTo(x - 38 * s, py);
      p.lineTo(x - 38 * s, py - 38 * s);
      p.lineTo(x + 38 * s, py - 38 * s);
      p.lineTo(x + 38 * s, py);
      p.closePath();
    }, '#9a7250', { shade: '#5e422e', cel: [14 * s, 0], lw: 1.2 });
    for (let i = 1; i < 5; i++) {
      c.fillStyle = 'rgba(40,26,20,0.3)';
      c.fillRect(x - 38 * s, py - i * 8 * s, 76 * s, 0.9);
    }
    paint(c, (p) => {
      p.moveTo(x - 48 * s, py - 36 * s);
      p.lineTo(x, py - 66 * s);
      p.lineTo(x + 48 * s, py - 36 * s);
      p.closePath();
    }, '#8a5a4a', { shade: '#5a3a34', cel: [10 * s, 0], lw: 1.2 });
    c.fillStyle = '#ffd08a';
    c.fillRect(x - 24 * s, py - 28 * s, 14 * s, 13 * s);
    c.strokeStyle = '#4a3020';
    c.lineWidth = 1.2 * s;
    c.strokeRect(x - 24 * s, py - 28 * s, 14 * s, 13 * s);
    // 欄杆
    c.strokeStyle = '#5a3e2a';
    c.lineWidth = 1.4 * s;
    c.beginPath();
    c.moveTo(x + 40 * s, py - 12 * s);
    c.lineTo(x + 56 * s, py - 12 * s);
    for (let i = 0; i < 3; i++) {
      c.moveTo(x + (42 + i * 7) * s, py);
      c.lineTo(x + (42 + i * 7) * s, py - 12 * s);
    }
    c.stroke();
    // 梯子
    c.strokeStyle = '#6a4a32';
    c.lineWidth = 1.6 * s;
    c.beginPath();
    c.moveTo(x - 44 * s, py + 6 * s);
    c.lineTo(x - 50 * s, y);
    c.moveTo(x - 34 * s, py + 6 * s);
    c.lineTo(x - 38 * s, y);
    for (let i = 1; i < 9; i++) {
      const u = i / 9;
      c.moveTo(lerp(x - 44 * s, x - 50 * s, u), lerp(py + 6 * s, y, u));
      c.lineTo(lerp(x - 34 * s, x - 38 * s, u), lerp(py + 6 * s, y, u));
    }
    c.stroke();
  }
  // 貓頭鷹的小攤：條紋遮雨棚、木檯、籃子
  function stall(c, x, y, s) {
    OA.soft(c, x, y + 2, 50 * s, 7 * s, '20,14,20', 0.45);
    c.fillStyle = '#4a3222';
    c.fillRect(x - 40 * s, y - 62 * s, 3 * s, 62 * s);
    c.fillRect(x + 37 * s, y - 62 * s, 3 * s, 62 * s);
    paint(c, (p) => p.rect(x - 42 * s, y - 26 * s, 84 * s, 26 * s), '#8a6444', { shade: '#5a4028', cel: [0, 6 * s], lw: 1.2 });
    [[-26, '#c84a3a'], [-8, '#e8a040'], [12, '#9a6ab0'], [28, '#7aa84a']].forEach(([dx, col]) => {
      paint(c, (p) => p.ellipse(x + dx * s, y - 29 * s, 7 * s, 4 * s, 0, 0, PI2), '#a07a4a', { lw: 0.8 });
      c.fillStyle = col;
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.arc(x + (dx - 3 + k * 3) * s, y - 32 * s, 2.2 * s, 0, PI2);
        c.fill();
      }
    });
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i % 2 ? '#e8dcc0' : '#6a8a5a';
      c.beginPath();
      const x0 = x - 48 * s + i * 16 * s;
      c.moveTo(x0, y - 70 * s);
      c.lineTo(x0 + 16 * s, y - 70 * s);
      c.lineTo(x0 + 16 * s, y - 56 * s);
      c.quadraticCurveTo(x0 + 8 * s, y - 50 * s, x0, y - 56 * s);
      c.closePath();
      c.fill();
    }
    c.fillStyle = 'rgba(40,20,30,0.25)';
    c.fillRect(x - 48 * s, y - 70 * s, 96 * s, 4 * s);
  }
  function chair(c, x, y) {
    const wood = '#7a5436';
    const woodS = '#4e3322';
    c.strokeStyle = woodS;
    c.lineCap = 'round';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(x - 9, y);
    c.lineTo(x - 8, y - 12);
    c.moveTo(x + 9, y);
    c.lineTo(x + 8, y - 12);
    c.moveTo(x - 10, y - 13);
    c.lineTo(x - 12, y - 34);
    c.stroke();
    paint(c, (p) => A.roundRect(p, x - 12, y - 16, 24, 5, 2), wood, { shade: woodS, cel: [0, 2], lw: 1.4 });
    paint(c, (p) => A.roundRect(p, x - 14, y - 36, 5, 22, 2), wood, { shade: woodS, cel: [2, 0], lw: 1.4 });
    // 椅背上龜爺爺那塊苔綠色的毯子
    paint(c, (p) => {
      p.moveTo(x - 14, y - 34);
      p.quadraticCurveTo(x - 4, y - 30, x - 2, y - 16);
      p.quadraticCurveTo(x - 4, y - 8, x - 10, y - 6);
      p.quadraticCurveTo(x - 16, y - 18, x - 14, y - 34);
      p.closePath();
    }, '#6f8e58', { shade: '#4a6a3e', cel: [3, 2], lw: 1.3 });
    // 靠在椅子上的拐杖
    c.strokeStyle = '#5a3c26';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 14, y);
    c.lineTo(x + 6, y - 30);
    c.quadraticCurveTo(x + 3, y - 36, x + 9, y - 37);
    c.stroke();
  }
  function stumpCup(c, x, y) {
    paint(c, (p) => A.roundRect(p, x - 8, y - 10, 16, 11, 3), '#8a6242', { shade: '#5a3e2a', cel: [3, 0], lw: 1.2 });
    c.fillStyle = '#c8a878';
    c.beginPath();
    c.ellipse(x, y - 10, 8, 2.4, 0, 0, PI2);
    c.fill();
    paint(c, (p) => {
      p.moveTo(x - 3.5, y - 16);
      p.lineTo(x + 3.5, y - 16);
      p.lineTo(x + 2.6, y - 11);
      p.lineTo(x - 2.6, y - 11);
      p.closePath();
    }, '#f4ede0', { shade: '#cfc4b0', cel: [1.4, 0], lw: 1 });
    c.strokeStyle = '#cfc4b0';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x + 4.2, y - 13.5, 1.6, -1.4, 1.4);
    c.stroke();
  }
  function firePit(c, x, y) {
    const r = U.seeded(88);
    OA.soft(c, x, y + 2, 34, 8, '20,14,20', 0.5);
    // 木柴
    [[-14, -4, 0.35], [14, -4, -0.35], [0, -6, 0.05]].forEach(([dx, dy, a]) => {
      c.save();
      c.translate(x + dx * 0.4, y + dy);
      c.rotate(a);
      paint(c, (p) => A.roundRect(p, -15, -3, 30, 6, 3), '#6a4a32', { shade: '#3e2a1c', cel: [0, 2], lw: 1.2 });
      c.restore();
    });
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * PI2;
      const sx = x + Math.cos(a) * 20;
      const sy = y + Math.sin(a) * 5 - 1;
      paint(c, (p) => p.ellipse(sx, sy, 5 + r() * 2, 3.4, 0, 0, PI2), '#8a8078', { shade: '#5a5250', cel: [1.5, 1.5], lw: 1 });
    }
  }
  const DUSK_FOL = OA.P([[0, '#10131e'], [0.3, '#202838'], [0.55, '#394238'], [0.78, '#6a6848'], [0.92, '#b09060'], [1, '#e8b27a']]);
  const FAR_FOL = OA.P([[0, '#1e1f34'], [0.4, '#343856'], [0.7, '#56567a'], [1, '#a88aa0']]);
  const DUSK_L = OA.light(-0.85, -0.25, 0.45);

  function drawMid(c) {
    const r = U.seeded(7070);
    // 遠一點的矮丘（森林）
    const fy = (x) => 500 - 30 * Math.sin(x * 0.004 + 1) - (OA.fbm(x * 0.01, 1, 31, 4) - 0.5) * 40;
    const p = ridge(-100, 1380, 8, fy);
    const g = c.createLinearGradient(0, 440, 0, 640);
    g.addColorStop(0, '#343652');
    g.addColorStop(1, '#4a4656');
    fillRidge(c, p, 720, g);
    const cls = [];
    for (let x = -90; x < 1380; x += 16 + r() * 10) cls.push([x, fy(x) + 8, 16 + r() * 12, r() * 0.6]);
    OA.foliage(c, cls, { pal: FAR_FOL, leaf: 'oval', size: 3.6, density: 1.3, seed: 12, box: [-100, 440, 1380, 540], L: DUSK_L, ao: 0.3, air: [OA.hex('#b894a8'), 0.25] });
    // 營地後面的森林：高高低低的大樹，左緣被夕陽照到
    const trees = [];
    for (let x = 500; x < 1400; x += 34 + r() * 44) {
      if (Math.abs(x - CAMP.tree) < 60) continue;
      // 下一座山那一段矮一點，山才看得到
      const low = Math.abs(x - PEAK[0]) < 160 ? 0.62 : 1;
      trees.push([x, GY - 6 - r() * 10, (84 + r() * 76) * low]);
    }
    trees.forEach(([x, y, h]) => {
      const w = 5 + h * 0.04;
      c.fillStyle = '#231c22';
      c.beginPath();
      c.moveTo(x - w, y + 10);
      c.lineTo(x - w * 0.5, y - h * 0.62);
      c.lineTo(x + w * 0.5, y - h * 0.62);
      c.lineTo(x + w, y + 10);
      c.closePath();
      c.fill();
    });
    const tc = [];
    trees.forEach(([x, y, h]) => {
      for (let k = 0; k < 6; k++) tc.push([x + (r() - 0.5) * h * 0.55, y - h * (0.55 + r() * 0.45), h * (0.16 + r() * 0.12), 0.2 + r() * 0.7]);
    });
    OA.foliage(c, tc, { pal: DUSK_FOL, leaf: 'maple', size: 3.4, density: 1.6, seed: 21, box: [480, GY - 240, 1400, GY - 40], L: DUSK_L, ao: 0.45, warm: 0.22, air: [OA.hex('#9c7c90'), 0.2] });
    // 樹屋那棵樹（自己的樹冠蓋住樹幹頂端）
    treeHouse(c, CAMP.tree, GY, 1);
    const crown = [];
    for (let k = 0; k < 10; k++) crown.push([CAMP.tree + (r() - 0.5) * 130, GY - 236 - r() * 44, 24 + r() * 14, 0.4 + r() * 0.6]);
    OA.foliage(c, crown, { pal: DUSK_FOL, leaf: 'maple', size: 3.4, density: 1.7, seed: 27, box: [CAMP.tree - 110, GY - 310, CAMP.tree + 110, GY - 190], L: DUSK_L, ao: 0.4, warm: 0.2, air: [OA.hex('#9c7c90'), 0.12] });
    // 樹林底下暗一點（營火照不到的地方）
    const dg = c.createLinearGradient(0, GY - 90, 0, GY);
    dg.addColorStop(0, 'rgba(24,18,30,0)');
    dg.addColorStop(1, 'rgba(24,18,30,0.55)');
    c.fillStyle = dg;
    c.fillRect(480, GY - 90, 920, 92);
    // 谷地：左邊開闊、營地那邊是踩平的空地
    const vg = c.createLinearGradient(0, GY - 30, 0, 760);
    vg.addColorStop(0, '#6a6454');
    vg.addColorStop(0.3, '#55523e');
    vg.addColorStop(1, '#2a2c20');
    c.fillStyle = vg;
    c.beginPath();
    c.moveTo(-100, 540);
    c.quadraticCurveTo(300, 516, 520, GY - 6);
    c.quadraticCurveTo(900, GY + 6, 1380, GY - 4);
    c.lineTo(1380, 800);
    c.lineTo(-100, 800);
    c.closePath();
    c.fill();
    c.save();
    c.clip();
    OA.texture(c, -100, 500, 1480, 300, { fbm: 0.6, grain: 0.3, scale: 0.8 });
    // 起伏：幾道淡淡的暗帶
    for (let i = 0; i < 5; i++) OA.soft(c, 100 + i * 260 + r() * 80, 590 + r() * 60, 220, 22, '30,30,24', 0.35);
    // 草（有的黃了）
    for (let i = 0; i < 1100; i++) {
      const x = -100 + r() * 1480;
      const y = 526 + r() * 220;
      const s = 0.6 + (y - 526) / 90;
      c.strokeStyle = r() < 0.38 ? 'rgba(170,150,96,0.5)' : 'rgba(96,110,70,0.5)';
      c.lineWidth = 0.8 + s * 0.3;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (r() - 0.5) * 3, y - 3 * s - r() * 3);
      c.stroke();
    }
    // 營地踩平的空地
    OA.soft(c, 880, GY + 6, 320, 28, '150,118,90', 0.85);
    // 從山坡下來、通往營地的小路
    c.fillStyle = 'rgba(158,126,94,0.7)';
    c.beginPath();
    c.moveTo(600, 800);
    c.quadraticCurveTo(660, 660, 740, GY + 18);
    c.quadraticCurveTo(770, GY + 6, 800, GY + 6);
    c.lineTo(806, GY + 10);
    c.quadraticCurveTo(780, GY + 16, 766, GY + 30);
    c.quadraticCurveTo(700, 660, 690, 800);
    c.closePath();
    c.fill();
    // 小灌木叢
    const sh = [];
    for (let i = 0; i < 9; i++) sh.push([40 + r() * 460, 560 + r() * 40, 10 + r() * 10, r()]);
    OA.foliage(c, sh, { pal: DUSK_FOL, leaf: 'oval', size: 3, density: 1.4, seed: 29, box: [0, 530, 520, 620], L: DUSK_L, ao: 0.4, lit: 0.85 });
    c.restore();
    // 營地
    stall(c, CAMP.stall, GY, 1);
    mushHouse(c, CAMP.mush, GY, 0.82);
    // 燈串
    c.strokeStyle = 'rgba(40,30,26,0.7)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(CAMP.tree + 44, GY - 110);
    BULBS.forEach(([x, y]) => c.lineTo(x, y));
    c.lineTo(CAMP.mush - 58, GY - 92);
    c.stroke();
    BULBS.forEach(([x, y]) => {
      c.fillStyle = '#6a4a2a';
      c.fillRect(x - 0.6, y, 1.2, 3);
      c.fillStyle = '#ffd78a';
      c.beginPath();
      c.ellipse(x, y + 5, 2.6, 3.2, 0, 0, PI2);
      c.fill();
    });
    // 晾衣繩：蘑菇屋 → 右邊的柱子
    paint(c, (p) => p.rect(CAMP.pole - 2.2, GY - 64, 4.4, 66), '#5e4230', { shade: '#3a281c', cel: [1.6, 0], lw: 1 });
    c.strokeStyle = 'rgba(40,30,26,0.7)';
    c.beginPath();
    c.moveTo(CAMP.mush + 60, GY - 70);
    c.quadraticCurveTo((CAMP.mush + CAMP.pole) / 2 + 30, GY - 48, CAMP.pole, GY - 60);
    c.stroke();
    [[1144, '#c8b8a0', 12, 14], [1158, '#8aa0b8', 9, 12], [1135, '#b88a8a', 7, 10]].forEach(([x, col, w, h]) => {
      const y = GY - 58 + (x - 1130) * 0.1;
      paint(c, (p) => {
        p.moveTo(x - w / 2, y);
        p.lineTo(x + w / 2, y);
        p.lineTo(x + w / 2 - 1, y + h);
        p.lineTo(x - w / 2 + 1, y + h);
        p.closePath();
      }, col, { shade: U.mix(col, '#302030', 0.3), cel: [2, 0], lw: 0.8 });
    });
    // 木頭長椅、告示牌（苔光營地）
    paint(c, (p) => A.roundRect(p, 912, GY - 4, 40, 8, 4), '#6e4c34', { shade: '#44301f', cel: [0, 3], lw: 1.2 });
    paint(c, (p) => p.rect(538, GY - 34, 3.6, 36), '#5e4230', { lw: 0.8 });
    paint(c, (p) => A.roundRect(p, 520, GY - 40, 40, 17, 3), '#9a7650', { shade: '#6a4e32', cel: [0, 3], lw: 1.2 });
    c.fillStyle = 'rgba(60,40,24,0.7)';
    c.save();
    c.translate(540, GY - 31);
    c.beginPath();
    A.mapleLeafPath(c, 0, 0, 5);
    c.fill();
    c.restore();
    firePit(c, CAMP.fire, GY);
    chair(c, CAMP.chair, GY);
    stumpCup(c, CAMP.cup, GY);
    // 營地前面的矮樹叢（框住畫面）
    const bush = [];
    for (let i = 0; i < 16; i++) bush.push([1000 + r() * 400, 610 + r() * 60, 26 + r() * 22, r()]);
    OA.foliage(c, bush, { pal: DUSK_FOL, leaf: 'oval', size: 3.8, density: 1.6, seed: 23, box: [980, 580, 1400, 690], L: DUSK_L, ao: 0.5, lit: 0.8 });
  }

  function drawFore(c) {
    const r = U.seeded(9191);
    const pts = ridge(-100, 1380, 6, HILL_Y);
    const g = c.createLinearGradient(0, 600, 0, 800);
    g.addColorStop(0, '#3a3a30');
    g.addColorStop(0.3, '#23241c');
    g.addColorStop(1, '#101109');
    c.beginPath();
    c.moveTo(-100, 830);
    pts.forEach((q) => c.lineTo(q[0], q[1]));
    c.lineTo(1380, 830);
    c.closePath();
    c.fillStyle = g;
    c.fill();
    c.save();
    c.clip();
    OA.texture(c, -100, 560, 1480, 280, { fbm: 0.6, grain: 0.35, scale: 0.7 });
    // 土坡上的一條小路
    c.fillStyle = 'rgba(120,96,70,0.45)';
    c.beginPath();
    c.moveTo(470, HILL_Y(470) + 2);
    c.quadraticCurveTo(560, HILL_Y(560) + 20, 640, 760);
    c.lineTo(700, 800);
    c.quadraticCurveTo(600, 700, 510, HILL_Y(510) + 2);
    c.closePath();
    c.fill();
    c.restore();
    // 石頭
    OA.boulder(c, 150, HILL_Y(150) + 26, 44, 34, 17, { moss: true, L: DUSK_L });
    // 草：稜線上一叢叢，夕陽照到草尖
    const blade = (x, y, h, lean, col, tip) => {
      c.strokeStyle = col;
      c.lineWidth = 1.2 + h * 0.03;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h);
      c.stroke();
      if (tip) {
        c.strokeStyle = tip;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x + lean * 0.7, y - h * 0.8);
        c.lineTo(x + lean, y - h);
        c.stroke();
      }
    };
    for (let i = 0; i < 1300; i++) {
      const x = -100 + r() * 1480;
      const y0 = HILL_Y(x);
      const dy = Math.pow(r(), 2.2) * 150;
      const y = y0 + dy + 2;
      const near = 1 - dy / 150;
      const h = (6 + r() * 20) * (0.6 + near * 0.6);
      const dry = r() < 0.3;
      const base = dry ? [138, 118, 74] : [66, 78, 54];
      const k = 0.55 + near * 0.35;
      const col = 'rgb(' + base.map((v) => Math.round(v * k)).join(',') + ')';
      blade(x, y, h, (r() - 0.35) * h * 0.6, col, near > 0.7 && r() < 0.6 ? (dry ? 'rgba(255,206,140,0.8)' : 'rgba(236,190,130,0.7)') : null);
    }
    // 幾朵沒什麼精神的野花（土地老了，花少了）
    [[250, 0.9, '#e8dce8'], [318, 1, '#d8c8e0'], [604, 0.8, '#f0e0c8'], [96, 0.9, '#e8dce8']].forEach(([x, s, col]) => Kt.flower(c, x, HILL_Y(x) - 8, s, col, '#d8b050'));
    // 稜線被夕陽照亮的邊
    c.strokeStyle = 'rgba(236,170,110,0.45)';
    c.lineWidth = 2;
    c.beginPath();
    pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1] + 1) : c.moveTo(q[0], q[1] + 1)));
    c.stroke();
  }

  Object.assign(Kt.DEFS, {
    edRubble: { fin: { grain: 0.14 }, ox: -80, oy: 540, w: 1440, h: 250, kmax: 1.4, draw: drawRubble },
    edFar: { fin: { grain: 0.12, fbm: 0.1 }, ox: -80, oy: -50, w: 1440, h: 720, kmax: 1.3, draw: drawFar },
    edMid: { fin: { grain: 0.14, fbm: 0.12 }, ox: -80, oy: 250, w: 1440, h: 550, kmax: 1.4, draw: drawMid },
    edFore: { fin: { grain: 0.16, fbm: 0.14 }, ox: -80, oy: 540, w: 1440, h: 290, kmax: 1.4, draw: drawFore },
  });

  function fire(ctx, x, y, t) {
    const fl = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 7.3 + 1);
    glow(ctx, x, y - 8, 120 * fl, '255,150,70', 0.42);
    glow(ctx, x, y - 10, 46 * fl, '255,210,130', 0.6);
    // 火舌：外層橘紅、內層金黃、芯是白的；每一條自己晃
    const tongues = [[-6, 22, '224,84,40', 0.85], [6, 24, '224,84,40', 0.85], [0, 30, '255,128,48', 0.9], [-3, 20, '255,176,70', 0.9], [3, 18, '255,200,96', 0.95], [0, 12, '255,244,200', 0.95]];
    tongues.forEach(([dx, h, col, a], i) => {
      const hh = h * (0.78 + 0.28 * Math.sin(t * (8.5 + i * 2.1) + i * 1.3) * Math.sin(t * 3.1 + i));
      const sw = Math.sin(t * (5 + i * 0.8) + i * 1.7) * 3.2;
      const w = 5 + h * 0.18;
      const g = ctx.createLinearGradient(0, y - 4 - hh, 0, y);
      g.addColorStop(0, rgba(col, 0));
      g.addColorStop(0.35, rgba(col, a * 0.8));
      g.addColorStop(1, rgba(col, a));
      ctx.save();
      if (i >= 3) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + dx - w, y - 3);
      ctx.bezierCurveTo(x + dx - w * 1.1, y - hh * 0.45, x + dx + sw * 0.4 - w * 0.3, y - hh * 0.75, x + dx + sw, y - 4 - hh);
      ctx.bezierCurveTo(x + dx + sw * 0.4 + w * 0.3, y - hh * 0.75, x + dx + w * 1.1, y - hh * 0.45, x + dx + w, y - 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    // 木柴上的餘燼
    for (let i = 0; i < 6; i++) glow(ctx, x - 12 + i * 5, y - 2, 4, '255,120,50', 0.5 + 0.4 * Math.sin(t * 4 + i * 2));
    // 火星往上飄
    for (let i = 0; i < 16; i++) {
      const k = (t * (0.35 + hash(i) * 0.3) + hash(i * 3.3)) % 1;
      const sx = x + (hash(i * 5.1) - 0.5) * 16 + Math.sin(t * 2 + i) * 8 * k + k * 18;
      const sy = y - 14 - k * 110;
      ctx.fillStyle = rgba('255,' + (180 + ((i * 17) % 60)) + ',100', (1 - k) * 0.9);
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }
    // 煙：淡淡的往右上飄
    for (let i = 0; i < 7; i++) {
      const k = (t * 0.08 + i / 7) % 1;
      const sx = x + k * 90 + Math.sin(t * 0.6 + i) * 10;
      const sy = y - 30 - k * 190;
      haze(ctx, sx, sy, 14 + k * 40, '150,140,160', 0.12 * Math.sin(k * Math.PI));
    }
  }

  function drawCamp(ctx, E) {
    const st = E.st;
    const t = E.tau;
    const b = E.beat;
    const Cm = { x: lerp(600, 668, sm(0, 22, st)), y: lerp(372, 362, sm(0, 22, st)), z: lerp(1.0, 1.05, sm(0, 22, st)) };
    Kt.sky(ctx, SKY_DUSK, [DSUN[0], DSUN[1], 620, '255,188,120', 0.95]);
    // 星星一顆一顆出來
    const starA = sm(1, 14, st);
    for (let i = 0; i < 90; i++) {
      const x = hash(i * 4.1 + 2) * W();
      const y = 64 + Math.pow(hash(i * 6.3 + 1), 1.6) * 220;
      const a = starA * (0.2 + 0.6 * hash(i * 2.2)) * (0.7 + 0.3 * Math.sin(t * (1.5 + hash(i) * 2) + i)) * (1 - cl((y - 180) / 100));
      if (a < 0.02) continue;
      ctx.fillStyle = rgba('255,248,236', a);
      const s = hash(i * 9.1) > 0.9 ? 2.2 : 1.4;
      ctx.fillRect(x, y, s, s);
    }
    Kt.cam(ctx, Cm, 0.04, () => {
      // 月牙
      const mx = 1120;
      const my = 132;
      haze(ctx, mx, my, 60, '255,240,220', 0.25);
      ctx.save();
      ctx.fillStyle = '#fff4dc';
      ctx.beginPath();
      ctx.arc(mx, my, 14, -1.9, 1.9, false);
      ctx.arc(mx - 6, my - 1, 12.5, 1.62, -1.62, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // 夕陽在遠山後面
      haze(ctx, DSUN[0], DSUN[1] - 10, 260, '255,200,130', 0.5);
      glow(ctx, DSUN[0], DSUN[1], 120, '255,210,150', 0.4);
      // 回家的鳥
      ctx.save();
      ctx.strokeStyle = 'rgba(60,44,70,0.7)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      [[0, 0], [-14, -7], [-16, 8], [-30, 2], [-44, -4]].forEach(([dx, dy], i) => {
        const x = 180 + st * 22 + dx;
        const y = 190 + dy - st * 2 + Math.sin(st * 1.2 + i) * 2;
        const f = Math.sin(st * 7 + i * 1.3) * 3;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - f);
        ctx.quadraticCurveTo(x - 1.5, y - 1.5, x, y + 1);
        ctx.quadraticCurveTo(x + 1.5, y - 1.5, x + 5, y - f);
        ctx.stroke();
      });
      ctx.restore();
    });
    Kt.cam(ctx, Cm, 0.12, () => Kt.blit(ctx, 'edFar'));
    // 下一座山頂：最後一點光
    Kt.cam(ctx, Cm, 0.12, () => {
      const k = 1 - sm(4, 26, st) * 0.6;
      glow(ctx, PEAK[0] - 20, PEAK[1] + 30, 80, '255,170,160', 0.22 * k);
    });
    Kt.cam(ctx, Cm, 0.45, () => {
      Kt.blit(ctx, 'edMid');
      // 燈串、樹屋與蘑菇屋的窗
      BULBS.forEach(([x, y], i) => glow(ctx, x, y + 5, 12, '255,210,130', 0.55 + 0.25 * Math.sin(t * 2.3 + i * 1.7)));
      [[CAMP.tree - 17, GY - 140, 26], [CAMP.mush - 20, GY - 38, 18], [CAMP.mush + 20, GY - 36, 18], [CAMP.mush + 9, GY - 12, 16]].forEach(([x, y, rr], i) => glow(ctx, x, y, rr, '255,184,96', 0.45 + 0.1 * Math.sin(t * 2.6 + i)));
      // 煙囪的煙
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.07 + i / 6) % 1;
        haze(ctx, CAMP.mush + 34 + k * 70 + Math.sin(t * 0.5 + i) * 8, GY - 130 - k * 150, 10 + k * 34, '170,160,176', 0.14 * Math.sin(k * Math.PI));
      }
      // 營地的大家：各做各的事（刺蝟婆婆剛把茶放到空椅子旁、小栗在烤火、菇菇在門口、貓頭鷹在收攤）
      const fx = CAMP.fire;
      const people = [
        ['owl', CAMP.stall + 30, GY + 2, 0.6, 1],
        ['hedgehog', 834, GY + 3, 0.6, -1],
        ['hedgekid', 932, GY + 4, 0.54, -1],
        ['mushgirl', CAMP.mush - 50, GY + 2, 0.6, -1],
      ];
      people.forEach(([art, x, y, s, dir], i) => {
        if (!A.NPC_DRAW[art]) return;
        const toFire = Math.sign(fx - x) || 1;
        contact(ctx, x, y, 24 * s, 0.6);
        litChar(ctx, x, y, s, npcFn(art, t + i * 1.3, dir), { slot: 3 + i, dir: toFire, rim: '255,176,96', rimA: 0.9, rx: toFire * 1.4, ry: 0, shade: '40,30,60', shadeA: 0.5, air: '120,90,120', airA: 0.12 });
      });
      fire(ctx, fx, GY - 2, t);
      // 空椅子旁那杯茶，今天也換了新的
      for (let j = 0; j < 2; j++) {
        const k = (t * 0.25 + j * 0.5) % 1;
        ctx.save();
        ctx.globalAlpha = 0.35 * Math.sin(k * Math.PI);
        ctx.strokeStyle = '#f4ece6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const x0 = CAMP.cup;
        const y0 = GY - 17 - k * 14;
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(x0 + Math.sin(t * 2 + j) * 4, y0 - 5, x0 + Math.sin(t * 1.6 + j) * 2, y0 - 10);
        ctx.stroke();
        ctx.restore();
      }
    });
    Kt.cam(ctx, Cm, 1, () => {
      Kt.blit(ctx, 'edFore');
      // 小獅子的背影，看著底下的營地和遠方的山
      const ly = HILL_Y(LIONB.x) + 10;
      contact(ctx, LIONB.x, ly, 34 * LIONB.s, 0.5);
      const breathe = 1 + Math.sin(t * 1.3) * 0.008;
      litChar(ctx, LIONB.x, ly, LIONB.s, (c) => {
        c.scale(1, breathe);
        A.drawLion(c, 0, 0, 1, lionSt('climb', 0));
      }, { slot: 8, dir: -1, rim: '255,190,130', rimA: 1, rimGlow: 0.35, rx: -2.4, ry: -1.4, shade: '36,26,56', shadeA: 0.6, air: '90,70,110', airA: 0.1, box: [-150, -210, 300, 225] });
      // 身前的草，被風吹著
      for (let i = 0; i < 70; i++) {
        const x = 250 + hash(i * 3.7) * 400;
        const y = HILL_Y(x) + 4 + hash(i * 1.3) * 26;
        const h = 10 + hash(i * 5.3) * 22;
        const sway = Math.sin(t * 1.4 + x * 0.03) * 4 + Math.sin(t * 3.1 + i) * 1.2;
        const dry = hash(i * 7.1) < 0.3;
        ctx.strokeStyle = dry ? '#6a5a36' : '#2c3424';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + sway * 0.3, y - h * 0.6, x + sway, y - h);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(240,186,120,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + sway * 0.75, y - h * 0.8);
        ctx.lineTo(x + sway, y - h);
        ctx.stroke();
      }
      // 螢火蟲（比以前少）
      for (let i = 0; i < 7; i++) {
        const x = 120 + hash(i * 8.8) * 1000 + Math.sin(t * 0.5 + i) * 30;
        const y = 560 + hash(i * 2.9) * 90 + Math.sin(t * 0.8 + i * 2) * 14;
        const a = sm(3, 8, st) * (0.4 + 0.6 * Math.max(0, Math.sin(t * 1.7 + i * 2.2)));
        glow(ctx, x, y, 10, '220,255,150', a * 0.6);
        glow(ctx, x, y, 3, '255,255,220', a);
      }
    });
    // 最後一行之後：一片星楓葉被風吹過天空，往下一座山飛去
    if (b[1] != null) {
      const u = cl((st - b[1] - 1.2) / 9);
      if (u > 0 && u < 1) {
        const x = lerp(120, 1060, u) + Math.sin(u * 9) * 30;
        const y = 150 + Math.sin(u * Math.PI) * -40 + u * 150 + Math.cos(u * 7) * 16;
        const a = Math.min(1, u * 8) * (1 - sm(0.75, 1, u));
        ctx.save();
        ctx.globalAlpha = a;
        glow(ctx, x, y, 26, '255,226,150', 0.4);
        leafGem(ctx, x, y, 7, '#e8c860', st * 2.6);
        ctx.restore();
      }
    }
    // 黃昏的色調
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const gm = ctx.createLinearGradient(0, 0, 0, H());
    gm.addColorStop(0, 'rgba(150,146,200,0.35)');
    gm.addColorStop(0.6, 'rgba(238,196,200,0.3)');
    gm.addColorStop(1, 'rgba(160,120,150,0.5)');
    ctx.fillStyle = gm;
    ctx.fillRect(0, 0, W(), H());
    ctx.restore();
    vignette(ctx, 0.42);
  }

  // ════════════════ 流程 ════════════════
  const SCENES = [
    { id: 'temple', layers: ['ringA', 'ringB', 'bandFar', 'cyBack', 'cyFloor', 'edRubble', 'treeTrunk', 'treeCanopy', 'cyFore'], draw: drawTemple, lead: 1.4, flowing: false },
    { id: 'camp', layers: ['edFar', 'edMid', 'edFore'], draw: drawCamp, lead: 1.8, flowing: true, card: true },
  ];
  const ALL_LAYERS = SCENES.reduce((a, s) => a.concat(s.layers), []);
  function linesOf(i) {
    const L = (G.data.story && G.data.story.ending) || [];
    const n = L.length;
    const cut = Math.max(0, n - 2);
    return i === 0 ? L.slice(0, cut) : L.slice(cut);
  }
  // 每一行停多久（秒）；第一幕第二行要等心葉飛回去、顏色散開，第三行要等灰鬃走遠
  function lineDur(sc, i) {
    if (sc === 0 && i === 1) return 7;
    if (sc === 0 && i === 2) return 6.4;
    if (sc === 1 && i === 1) return 6.5;
    return 4.8;
  }

  const Ed = (G.ending = {
    E: null,
    clicked: false,
    skipHit: false,
    postT: 0,

    active() {
      return !!this.E;
    },

    // opts.replay：從選單重看（看完回到原地，不搬到營地）
    start(opts) {
      opts = opts || {};
      if (this.E) return;
      G.ui.closeAll();
      C.talk = null;
      C.voice = null;
      C.epi = null;
      this.E = { replay: !!opts.replay, phase: 'cover', pt: 0, t: 0, sc: 0, st: 0, tau: 0, li: -1, lt: 0, beat: [], restart: null, skipOn: false, skipA: 0, kSet: false, built: 0, ct: 0, prevLine: null, prevT: 0 };
      // 時鐘還停著（打倒時間之後）就保持停住；重看時重新停一次，讓「時鐘又開始轉」的音樂再響一次
      if (!C.clockHold()) C.stopClock();
      else if (G.music && G.music.current()) G.music.stop(1.8);
    },

    covers() {
      const E = this.E;
      return !!E && !(E.phase === 'cover' && E.pt < 0.9);
    },

    restartClock() {
      if (C.clockHold()) C.resumeClock();
      // 「時鐘又開始轉」的音樂盒（music.js 的 restart）放完之後，接比較安靜的標題曲
      if (G.music) G.music.play('title');
      G.audio.play('rare');
    },

    // 出錯時不要把玩家卡在黑畫面：直接收尾、回營地
    update(dt) {
      try {
        this.step(dt);
      } catch (e) {
        console.error(e);
        try {
          this.finish();
        } catch (e2) {
          this.E = null;
        }
      }
    },

    step(dt) {
      const E = this.E;
      if (!E) return;
      E.t += dt;
      const I = G.input;
      const press = this.clicked || I.anyPressed || I.wasPressed('jump') || I.wasPressed('attack') || I.wasPressed('up');
      this.clicked = false;
      C.clicked = false;
      // 時鐘停著的時候，不要讓 cutscenes.js 以為流程斷了而自己恢復
      if (C.clock && !C.clock.releasing) C.clock.idle = 0;
      if (this.skipHit) {
        this.skipHit = false;
        return this.skip();
      }
      if (I.escPressed) {
        if (E.skipA > 0.6) return this.skip();
        E.skipOn = true;
      }
      if (press && E.t > 2) E.skipOn = true;
      E.skipA = Math.min(1, Math.max(0, E.skipA + (E.skipOn ? dt * 3 : -dt * 3)));
      const sc = SCENES[E.sc];
      if (E.phase === 'cover') {
        E.pt += dt;
        if (E.pt >= 0.9) {
          E.phase = 'load';
          E.built = 0;
        }
        return;
      }
      if (E.phase === 'load') {
        // 圖層一幀畫一張（畫面是黑的），畫完才開始
        if (!E.kSet) return;
        const need = sc.layers.filter((id) => !Kt.IX.L[id]);
        if (need.length) {
          Kt.layer(need[0]);
          return;
        }
        if (++E.built < 3) return;
        E.phase = 'play';
        E.st = 0;
        E.tau = 0;
        E.li = -1;
        E.lt = 0;
        E.beat = [];
        E.restart = null;
        E.prevLine = null;
        // 上一幕的圖層用完就放掉
        if (E.sc > 0) Kt.free(SCENES[E.sc - 1].layers.filter((id) => sc.layers.indexOf(id) < 0));
        return;
      }
      E.st += dt;
      if (E.phase === 'play' || E.phase === 'card') {
        // 時間：第一幕在心葉回到樹上之前是停住的
        const flow = sc.flowing ? 1 : E.restart == null ? 0 : sm(0, 1.8, E.st - E.restart);
        E.tau += dt * flow;
        if (E.sc === 0 && E.restart == null && E.beat[1] != null && E.st >= E.beat[1] + 2.6) {
          E.restart = E.st;
          this.restartClock();
        }
      }
      if (E.phase === 'play') {
        const lines = linesOf(E.sc);
        if (E.li < 0) {
          if (E.st >= sc.lead || (press && E.st > 0.8)) this.startLine(0);
          return;
        }
        E.lt += dt;
        if (E.lt >= lineDur(E.sc, E.li) || (press && E.lt > 1.3)) {
          if (E.li < lines.length - 1) this.startLine(E.li + 1);
          else if (sc.card) {
            E.phase = 'card';
            E.ct = 0;
          } else {
            E.phase = 'out';
            E.pt = 0;
          }
        }
        return;
      }
      if (E.phase === 'card') {
        E.ct += dt;
        if ((press && E.ct > 1.6) || E.ct > 10) {
          E.phase = 'out';
          E.pt = 0;
        }
        return;
      }
      if (E.phase === 'out') {
        E.pt += dt;
        const last = E.sc >= SCENES.length - 1;
        if (E.pt >= (last ? 1.4 : 1.1)) {
          if (last) return this.finish();
          // 保險：第一幕被按太快，時鐘還沒轉就要換幕
          if (E.sc === 0 && E.restart == null) this.restartClock();
          E.sc++;
          E.phase = 'load';
          E.built = 0;
        }
      }
    },

    startLine(i) {
      const E = this.E;
      const lines = linesOf(E.sc);
      if (E.li >= 0) {
        E.prevLine = lines[E.li];
        E.prevT = 0;
      }
      E.li = i;
      E.lt = 0;
      E.beat[i] = E.st;
      // 第一幕沒有「放回心葉」那一行（資料被改掉）：第一行之後就讓時鐘轉
      if (E.sc === 0 && i === 0 && lines.length < 2) E.beat[1] = E.st;
    },

    skip() {
      const E = this.E;
      if (!E) return;
      G.audio.play('ui');
      this.finish();
    },

    finish() {
      const E = this.E;
      if (!E) return;
      this.E = null;
      Kt.free(ALL_LAYERS);
      C.clicked = false;
      if (C.clockHold()) C.resumeClock();
      const Wd = G.world;
      Wd.flags.gameCleared = true;
      Wd.flags.endingSeen = true;
      this.postT = 1.5;
      this.postAt = performance.now();
      if (!E.replay) {
        // 回到地上：苔光營地（1-1）。HP／MP 補滿，面向營火
        const P = G.player;
        P.hp = P.maxHp;
        P.mp = P.maxMp;
        Wd.fade = 1;
        Wd.fadeDir = -1;
        Wd.load(CAMP_MAP, 'camp');
        P.dir = 1;
        setTimeout(() => G.hud && G.hud.toast('回到了苔光營地。選單（Esc）裡可以重看結局。', '#ffe9a8'), 1600);
      } else {
        Wd.fade = 1;
        Wd.fadeDir = -1;
        if (Wd.map) G.music.forMap(Wd.map);
      }
      G.save.write();
    },

    // ── 畫面 ──
    draw(ctx) {
      const E = this.E;
      if (!E) {
        // 回到遊戲時再慢慢亮起來
        if (this.postT > 0) {
          const k = 1 - (performance.now() - this.postAt) / 1000 / this.postT;
          if (k <= 0) this.postT = 0;
          else {
            ctx.fillStyle = 'rgba(0,0,0,' + (k * k).toFixed(3) + ')';
            ctx.fillRect(0, 0, W(), H());
          }
        }
        return;
      }
      if (!E.kSet) {
        const m = ctx.getTransform();
        Kt.setK(Math.hypot(m.a, m.b));
        E.kSet = true;
      }
      if (E.phase === 'cover') {
        // 從灰掉的戰場慢慢暗下來
        ctx.fillStyle = 'rgba(0,0,0,' + sm(0, 0.9, E.pt).toFixed(3) + ')';
        ctx.fillRect(0, 0, W(), H());
        return;
      }
      ctx.save();
      if (E.phase === 'load') {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W(), H());
      } else {
        const sc = SCENES[E.sc];
        ctx.save();
        try {
          sc.draw(ctx, E);
        } catch (e) {
          if (!this.errShown) console.error(e);
          this.errShown = true;
        }
        ctx.restore();
        let black = 1 - sm(0, 1.6, E.st);
        if (E.phase === 'out') black = Math.max(black, sm(0, E.sc >= SCENES.length - 1 ? 1.4 : 1.1, E.pt));
        if (E.phase === 'card') this.drawCard(ctx, E);
        if (black > 0.001) {
          ctx.fillStyle = 'rgba(0,0,0,' + black.toFixed(3) + ')';
          ctx.fillRect(0, 0, W(), H());
        }
      }
      this.drawFrame(ctx, E);
      ctx.restore();
    },

    drawCard(ctx, E) {
      const k = sm(0, 2.2, E.ct);
      ctx.save();
      const g = ctx.createLinearGradient(0, 0, 0, H());
      g.addColorStop(0, 'rgba(8,6,20,' + (0.25 * k).toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(8,6,20,' + (0.55 * k).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(8,6,20,' + (0.35 * k).toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W(), H());
      const cx = W() / 2;
      const cy = H() / 2 - 20;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = sm(0.4, 2, E.ct);
      ctx.font = 'bold 46px ' + A.FONT;
      ctx.shadowColor = 'rgba(255,190,90,0.5)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ffe6a8';
      ctx.fillText('小獅子的冒險', cx, cy - 36);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = sm(1.2, 2.8, E.ct);
      ctx.font = 'bold 23px ' + A.FONT;
      ctx.fillStyle = '#fff3da';
      ctx.fillText('謝謝你陪小獅子走完這一趟。', cx, cy + 22);
      const P = G.player;
      ctx.font = '18px ' + A.FONT;
      ctx.fillStyle = 'rgba(255,240,220,0.75)';
      ctx.fillText('遊玩時間 ' + U.fmtTime(P.playTime || 0) + '　·　Lv.' + P.level, cx, cy + 60);
      if (E.ct > 1.6) {
        ctx.globalAlpha = 0.45 + 0.35 * Math.sin(E.ct * 3);
        ctx.font = 'bold 19px ' + A.FONT;
        ctx.fillStyle = '#fff3da';
        ctx.fillText(E.replay ? '按任意鍵繼續' : '按任意鍵，回到營地', cx, cy + 104);
      }
      ctx.restore();
    },

    // 上下黑邊、字幕、頁數小點、跳過按鈕
    drawFrame(ctx, E) {
      const Wd = W();
      const Hd = H();
      const b = BAR;
      ctx.fillStyle = '#07050b';
      ctx.fillRect(0, 0, Wd, b);
      ctx.fillRect(0, Hd - b, Wd, b);
      const g = ctx.createLinearGradient(0, 0, Wd, 0);
      g.addColorStop(0, 'rgba(232,184,74,0)');
      g.addColorStop(0.5, 'rgba(232,184,74,0.55)');
      g.addColorStop(1, 'rgba(232,184,74,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, b - 1, Wd, 1);
      ctx.fillRect(0, Hd - b, Wd, 1);
      // 小點：全部幾行、現在第幾行
      const all = linesOf(0).length + linesOf(1).length;
      const cur = E.phase === 'load' ? -1 : (E.sc === 0 ? 0 : linesOf(0).length) + E.li;
      ctx.save();
      ctx.globalAlpha = sm(0.5, 2, E.t);
      for (let i = 0; i < all; i++) {
        ctx.fillStyle = i === cur ? '#ffd35a' : i < cur ? 'rgba(255,211,90,0.45)' : 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(28 + i * 16, b / 2, i === cur ? 4 : 3, 0, PI2);
        ctx.fill();
      }
      ctx.restore();
      // 字幕：上一行淡出，這一行淡入
      if (E.phase === 'play' || E.phase === 'card' || E.phase === 'out') {
        const lines = linesOf(E.sc);
        if (E.prevLine && E.lt < 0.5) Kt.caption(ctx, E.prevLine, 2, 1 - E.lt / 0.5);
        const fade = E.phase === 'card' ? 1 - sm(0, 1, E.ct) : E.phase === 'out' ? 1 - sm(0, 0.6, E.pt) : 1;
        if (E.li >= 0 && lines[E.li] && fade > 0) Kt.caption(ctx, lines[E.li], Math.max(0, E.lt - (E.prevLine ? 0.35 : 0)), fade);
      }
      // 跳過
      if (E.skipA > 0.01) {
        const r = this.skipRect();
        ctx.save();
        ctx.globalAlpha = E.skipA;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeStyle = 'rgba(255,230,170,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        A.roundRect(ctx, r[0], r[1], r[2], r[3], 10);
        ctx.fill();
        ctx.stroke();
        ctx.font = 'bold 19px ' + A.FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff3da';
        ctx.fillText(E.replay ? '跳過 ▸▸' : '跳過，回營地 ▸▸', r[0] + r[2] / 2, r[1] + r[3] / 2 + 1);
        ctx.restore();
      } else if (E.t > 2.5 && E.phase === 'play') {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.font = '15px ' + A.FONT;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('點一下或按任意鍵繼續', W() - 22, b / 2);
        ctx.restore();
      }
    },

    skipRect() {
      const w = this.E && this.E.replay ? 118 : 188;
      return [W() - w - 16, 12, w, 40];
    },
  });

  // ════════════════ 接上遊戲 ════════════════
  // 過場系統：結局進行中世界暫停，觸控按鈕隱藏（touch.js 看 G.cut.active()）
  const cActive = C.active;
  C.active = function () {
    return !!Ed.E || cActive.call(this);
  };
  const cUpdate = C.update;
  C.update = function (dt) {
    if (Ed.E) {
      Ed.update(dt);
      return true;
    }
    return cUpdate.call(this, dt);
  };
  const cDraw = C.draw;
  C.draw = function (ctx) {
    cDraw.call(this, ctx);
    Ed.draw(ctx);
  };
  // 結局蓋滿畫面時，底下的世界不用畫
  const wDraw = G.world.draw;
  G.world.draw = function (ctx) {
    if (Ed.covers()) return;
    return wDraw.call(this, ctx);
  };
  // 左上角的視窗圖示：結局時藏起來
  if (G.hudIcons) {
    const hu = G.hudIcons.update;
    G.hudIcons.update = function (dt) {
      hu.call(this, dt);
      if (Ed.E && this.el) this.el.style.display = 'none';
    };
  }
  // 點擊：跳過按鈕或前進
  document.addEventListener(
    'pointerdown',
    (e) => {
      const E = Ed.E;
      if (!E) return;
      const cv = document.getElementById('game');
      if (cv && E.skipA > 0.5) {
        const rc = cv.getBoundingClientRect();
        const x = ((e.clientX - rc.left) / rc.width) * W();
        const y = ((e.clientY - rc.top) / rc.height) * H();
        const r = Ed.skipRect();
        if (x >= r[0] - 8 && x <= r[0] + r[2] + 8 && y >= r[1] - 8 && y <= r[1] + r[3] + 8) {
          Ed.skipHit = true;
          return;
        }
      }
      Ed.clicked = true;
    },
    true
  );

  // 章末卡「看結局」→ 插圖版結局（取代 js/ui/finale.js 的文字頁）
  const UI = G.ui;
  UI.a_finale = function () {
    this.close('m1end');
    Ed.start({});
    return 'keep';
  };
  // 選單：破關之後可以重看結局
  const rMenu = UI.r_menu;
  UI.r_menu = function () {
    const html = rMenu.call(this);
    const f = G.world && G.world.flags;
    if (!f || !(f.gameCleared || f.endingSeen)) return html;
    return html.replace('<button data-act="toTitle">', '<button data-act="replayEnding">重看結局</button><button data-act="toTitle">');
  };
  UI.a_replayEnding = function () {
    this.closeAll();
    Ed.start({ replay: true });
    return 'keep';
  };
  // 結局看到一半關掉遊戲：下次繼續時從結局開始（看完一樣回到營地）
  const cont = G.scenes.continueGame;
  G.scenes.continueGame = function () {
    const r = cont.apply(this, arguments);
    const f = G.world.flags || {};
    if (G.scene === 'play' && f.timeItselfDefeated && !f.gameCleared && !f.endingSeen && G.story.hasLeaf(5)) {
      setTimeout(() => {
        if (G.scene === 'play' && !Ed.E && !G.ui.blocking()) Ed.start({});
      }, 900);
    }
    return r;
  };
})();
