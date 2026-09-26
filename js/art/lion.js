// 主角小鬃。原點在腳底中央，面向右邊；左右翻轉由呼叫端處理。
(function () {
  'use strict';
  const A = G.art;

  const COL = {
    body: '#f7b547',
    bodyShade: '#e0913a',
    mane: '#d9722a',
    maneShade: '#b95a1e',
    cream: '#ffe6b0',
    ear: '#ffb3a3',
    tuft: '#e8452b',
    tuftShade: '#bf331c',
    nose: '#5a2f22',
  };

  function leg(ctx, x, y, lift, fill, shade) {
    A.shape(ctx, (c) => A.roundRect(c, x - 5, y - 15 - lift, 10, 15, 5), fill, shade, { shadeY: y - 5 - lift, lw: 2.5 });
  }

  function maneRing(ctx, cx, cy, r, bumps, wob) {
    A.shape(
      ctx,
      (c) => {
        for (let i = 0; i <= bumps; i++) {
          const a = (i / bumps) * Math.PI * 2;
          const rr = r + (i % 2 ? 3 : 0) + (wob || 0) * Math.sin(a * 3);
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          if (i === 0) c.moveTo(x, y);
          else {
            const am = ((i - 0.5) / bumps) * Math.PI * 2;
            c.quadraticCurveTo(cx + Math.cos(am) * (rr + 8), cy + Math.sin(am) * (rr + 8), x, y);
          }
        }
        c.closePath();
      },
      COL.mane,
      COL.maneShade,
      { cel: [4, 4] }
    );
  }

  function tuft(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    A.shape(ctx, (c) => A.mapleLeafPath(c, 0, 0, s), COL.tuft, COL.tuftShade, { shadeY: s * 0.3, lw: 2.2 });
    ctx.restore();
  }

  function sideView(ctx, st) {
    const t = st.t;
    let bob = Math.sin(t * 3) * 1.2;
    let legPhase = 0;
    let lean = 0;
    let stretch = 1;
    let tailUp = 0;
    let mouth = 'smile';
    let eyeKind = 'normal';
    let pawOut = 0;
    let lift = [0, 0, 0, 0]; // 遠後、遠前、近後、近前
    let off = [0, 0, 0, 0];

    if (st.state === 'walk') {
      const ph = t * 14;
      legPhase = ph;
      bob = -Math.abs(Math.sin(ph)) * 2.2;
      off = [Math.sin(ph) * -5, Math.sin(ph) * 5, Math.sin(ph) * 5, Math.sin(ph) * -5];
      lift = [Math.max(0, Math.cos(ph)) * 4, Math.max(0, -Math.cos(ph)) * 4, Math.max(0, -Math.cos(ph)) * 4, Math.max(0, Math.cos(ph)) * 4];
    } else if (st.state === 'jump' || st.state === 'fall') {
      bob = -2;
      off = [-6, 7, -5, 8];
      lift = [3, 5, 3, 5];
      tailUp = st.state === 'jump' ? 8 : -4;
    } else if (st.state === 'attack') {
      const p = st.p;
      const k = p < 0.3 ? p / 0.3 : Math.max(0, 1 - (p - 0.3) / 0.7);
      lean = k * 5;
      pawOut = k;
      mouth = 'open';
      eyeKind = k > 0.5 ? 'angry' : 'normal';
    } else if (st.state === 'roar') {
      const k = Math.sin(Math.min(1, st.p * 1.6) * Math.PI);
      lean = -2 + k * 3;
      mouth = 'roar';
      eyeKind = 'closed';
      tailUp = 10 * k;
    } else if (st.state === 'dash') {
      stretch = 1.18;
      off = [-9, 10, -8, 11];
      lift = [4, 6, 4, 6];
      lean = 6;
      mouth = 'open';
      eyeKind = 'angry';
      tailUp = -6;
    } else if (st.state === 'hurt') {
      lean = -5;
      eyeKind = 'hurt';
      mouth = 'o';
    }

    ctx.save();
    ctx.scale(stretch, 1 / Math.sqrt(stretch));

    // 遠側的腳（較暗）
    leg(ctx, -11 + off[0], 0, lift[0], '#d99a3c', '#c07d2e');
    leg(ctx, 9 + off[1], 0, lift[1], '#d99a3c', '#c07d2e');

    // 尾巴
    const sw = Math.sin(t * 4) * 3;
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, -22 + bob);
    ctx.quadraticCurveTo(-32, -24 + bob, -34 + sw * 0.3, -38 + bob - tailUp);
    ctx.stroke();
    ctx.strokeStyle = A.c(COL.body);
    ctx.lineWidth = 3.5;
    ctx.stroke();
    A.ellipse(ctx, -35 + sw * 0.3, -41 + bob - tailUp, 6, 7, COL.mane, COL.maneShade, { lw: 2.5, hl: false });

    // 身體
    A.ellipse(ctx, -1 + lean * 0.3, -20 + bob, 21, 14, COL.body, COL.bodyShade, { cel: [3, 3] });
    A.ellipse(ctx, 6 + lean * 0.3, -15 + bob, 10, 7, COL.cream, null, { noStroke: true, hl: false });

    // 近側的腳
    leg(ctx, -7 + off[2], 0, lift[2], COL.body, COL.bodyShade);
    leg(ctx, 13 + off[3], 0, lift[3], COL.body, COL.bodyShade);

    // 伸出的前爪（攻擊）
    if (pawOut > 0) {
      const px = 24 + pawOut * 14;
      const py = -24 - pawOut * 6 + bob;
      A.ellipse(ctx, px, py, 7, 6, COL.body, COL.bodyShade, { lw: 2.5, hl: false });
      ctx.strokeStyle = A.c('#fff6e6');
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 5, py + i * 3);
        ctx.lineTo(px + 10, py + i * 3.5);
        ctx.stroke();
      }
    }

    // 頭
    const hx = 9 + lean;
    const hy = -45 + bob;
    maneRing(ctx, hx - 4, hy - 1, 23, 12, 0);
    // 耳朵
    A.ellipse(ctx, hx - 10, hy - 20, 6.5, 6.5, COL.mane, COL.maneShade, { lw: 2.5, hl: false });
    A.ellipse(ctx, hx - 10, hy - 20, 3, 3, COL.ear, null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx + 8, hy - 21, 6.5, 6.5, COL.mane, COL.maneShade, { lw: 2.5, hl: false });
    A.ellipse(ctx, hx + 8, hy - 21, 3, 3, COL.ear, null, { noStroke: true, hl: false });
    A.ellipse(ctx, hx, hy, 19, 17.5, COL.body, COL.bodyShade, { cel: [3, 3.5] });
    // 楓葉鬃毛
    tuft(ctx, hx - 1, hy - 20, 9, -0.15);
    // 嘴邊
    A.ellipse(ctx, hx + 11, hy + 7, 9, 6.5, COL.cream, null, { lw: 2, hl: false });
    ctx.fillStyle = A.c(COL.nose);
    ctx.beginPath();
    ctx.ellipse(hx + 16, hy + 3, 3.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 嘴
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (mouth === 'smile') {
      ctx.beginPath();
      ctx.moveTo(hx + 16, hy + 5.5);
      ctx.quadraticCurveTo(hx + 14, hy + 10, hx + 11, hy + 8);
      ctx.stroke();
    } else {
      const big = mouth === 'roar' ? 6 : mouth === 'open' ? 4 : 2.5;
      ctx.fillStyle = A.c('#7a2323');
      ctx.beginPath();
      ctx.ellipse(hx + 13, hy + 10, big * 0.9, big, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // 眼睛
    A.eye(ctx, hx + 2, hy - 3, 3.9, 5.4, eyeKind, 1);
    A.eye(ctx, hx + 12, hy - 4, 3.6, 5.2, eyeKind, 1);
    A.blush(ctx, hx - 5, hy + 6, 4.5);

    ctx.restore();
  }

  function backView(ctx, st) {
    const a = st.moving ? Math.sin(st.t * 12) : 0;
    const t = st.t;
    // 尾巴垂下
    ctx.strokeStyle = A.outline();
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(4 + Math.sin(t * 3) * 2, 2, 2, 10);
    ctx.stroke();
    ctx.strokeStyle = A.c(COL.body);
    ctx.lineWidth = 3.5;
    ctx.stroke();
    A.ellipse(ctx, 2, 12, 6, 7, COL.mane, COL.maneShade, { lw: 2.5, hl: false });
    // 後腳
    leg(ctx, -9, 0 + a * 3, 0, COL.body, COL.bodyShade);
    leg(ctx, 9, 0 - a * 3, 0, COL.body, COL.bodyShade);
    A.ellipse(ctx, 0, -20, 17, 16, COL.body, COL.bodyShade, { shadeAt: 0.3 });
    // 鬃毛（背面看整圈）
    maneRing(ctx, 0, -46, 24, 14, 0);
    A.ellipse(ctx, -13, -68, 6.5, 6.5, COL.mane, COL.maneShade, { lw: 2.5, hl: false });
    A.ellipse(ctx, 13, -68, 6.5, 6.5, COL.mane, COL.maneShade, { lw: 2.5, hl: false });
    tuft(ctx, 0, -68, 8, 0);
    // 前爪抓繩
    A.ellipse(ctx, -9, -38 + a * 6, 6, 6, COL.body, COL.bodyShade, { lw: 2.5, hl: false });
    A.ellipse(ctx, 9, -38 - a * 6, 6, 6, COL.body, COL.bodyShade, { lw: 2.5, hl: false });
  }

  // st：{ state, t, p, moving }
  A.drawLion = function (ctx, x, y, dir, st) {
    ctx.save();
    ctx.translate(x, y);
    if (st.state === 'dead') {
      A.groundShadow(ctx, 0, 0, 30);
      ctx.translate(0, -14);
      ctx.rotate(-Math.PI / 2 * dir);
      ctx.translate(0, 14);
      ctx.scale(dir, 1);
      sideView(ctx, { state: 'hurt', t: 0, p: 0 });
      ctx.restore();
      return;
    }
    if (st.state === 'climb') {
      backView(ctx, st);
      ctx.restore();
      return;
    }
    if (st.onGround) A.groundShadow(ctx, 0, 0, 24);
    ctx.scale(dir, 1);
    sideView(ctx, st);
    ctx.restore();
  };

  A.lionColors = COL;
})();
