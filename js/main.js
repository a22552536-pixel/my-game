// 進入點：畫面縮放、固定時間步長的主迴圈。
(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const stage = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let dpr = 1;
  const QS = location.search;

  // ── 效能：省效能模式（G.lowFx）與自適應解析度（G.renderScale）──
  // 手機（觸控模式）：畫布解析度最多 1.25 倍、預設開省效能模式；幀時間一直超過 20ms 就再降解析度
  // （1 → 0.85 → 0.7），有餘裕再升回來；降到最低還是很慢 → 也打開省效能模式。
  // 電腦預設不動（畫面維持原樣）；網址 ?perf=1 讓電腦也自動調整、?perf=0 關掉；?lowfx=1／0 強制開關。
  const LOWFX_Q = /[?&]lowfx=1/.test(QS) ? true : /[?&]lowfx=0/.test(QS) ? false : null;
  const PERF_Q = /[?&]perf=1/.test(QS) ? true : /[?&]perf=0/.test(QS) ? false : null;
  const RS_STEPS = [1, 0.85, 0.7];
  let rsI = 0;
  G.renderScale = 1;
  G.lowFx = LOWFX_Q === true;
  const touchOn = () => !!(G.touch && G.touch.on);
  const governorOn = () => (PERF_Q != null ? PERF_Q : touchOn());
  function applyLowFx() {
    if (LOWFX_Q != null) G.lowFx = LOWFX_Q;
    else if (touchOn()) G.lowFx = true;
  }

  // 省效能模式時，主畫布上的 shadowBlur 一律當 0、模糊濾鏡不套（這兩個在手機上最貴；不用改每個美術檔）
  (function guardCtx() {
    const P = CanvasRenderingContext2D.prototype;
    const sb = Object.getOwnPropertyDescriptor(P, 'shadowBlur');
    const fl = Object.getOwnPropertyDescriptor(P, 'filter');
    try {
      if (sb && sb.set)
        Object.defineProperty(ctx, 'shadowBlur', {
          configurable: true,
          get() {
            return sb.get.call(this);
          },
          set(v) {
            sb.set.call(this, G.lowFx ? 0 : v);
          },
        });
      if (fl && fl.set)
        Object.defineProperty(ctx, 'filter', {
          configurable: true,
          get() {
            return fl.get.call(this);
          },
          set(v) {
            fl.set.call(this, G.lowFx && v && v !== 'none' ? 'none' : v);
          },
        });
    } catch (e) {}
  })();

  // 真正看得到的範圍：手機瀏覽器的工具列（例如右側工具列）會讓 innerWidth 比看得到的寬，
  // 所以優先用 visualViewport，並取最小值；畫面放在看得到的範圍正中間
  function viewRect() {
    const vv = window.visualViewport;
    const de = document.documentElement;
    let w = window.innerWidth;
    let h = window.innerHeight;
    let ox = 0;
    let oy = 0;
    if (vv && vv.width > 0 && vv.height > 0) {
      w = Math.min(w, vv.width);
      h = Math.min(h, vv.height);
      ox = vv.offsetLeft || 0;
      oy = vv.offsetTop || 0;
    }
    if (de && de.clientWidth > 0) w = Math.min(w, de.clientWidth);
    if (de && de.clientHeight > 0) h = Math.min(h, de.clientHeight);
    return { w, h, ox, oy };
  }

  function resize() {
    applyLowFx();
    const v = viewRect();
    scale = Math.min(v.w / G.W, v.h / G.H);
    dpr = Math.min(touchOn() ? 1.25 : 2, window.devicePixelRatio || 1);
    const left = v.ox + (v.w - G.W * scale) / 2;
    const top = v.oy + (v.h - G.H * scale) / 2;
    stage.style.transform = 'translate(' + left.toFixed(2) + 'px,' + top.toFixed(2) + 'px) scale(' + scale + ')';
    const k = scale * dpr * G.renderScale;
    const cw = Math.max(1, Math.round(G.W * k));
    const ch = Math.max(1, Math.round(G.H * k));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
  }
  G.resize = resize;
  window.addEventListener('resize', resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
    window.visualViewport.addEventListener('scroll', resize);
  }
  // 手機轉向、進出全螢幕時，有些瀏覽器的 resize 來得比新尺寸早：晚一點再量一次
  const resizeLater = () => {
    setTimeout(resize, 120);
    setTimeout(resize, 400);
  };
  window.addEventListener('orientationchange', resizeLater);
  document.addEventListener('fullscreenchange', resizeLater);
  document.addEventListener('webkitfullscreenchange', resizeLater);
  // 頁面被捲動（例如鍵盤、網址列收合）時拉回原位，畫面不會飄走
  window.addEventListener('scroll', () => {
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  });
  resize();

  // 自適應解析度：看最近 90 幀的幀時間中位數
  const gov = { buf: [], cool: 0, slowT: 0 };
  function governor(rawDt) {
    if (!governorOn()) return;
    if (rawDt <= 0 || rawDt > 0.1 || document.hidden) return; // 切到背景、讀地圖卡一下的不算
    gov.buf.push(rawDt * 1000);
    if (gov.buf.length > 240) gov.buf.shift();
    if (gov.cool > 0) {
      gov.cool -= rawDt;
      return;
    }
    const med = (n) => {
      if (gov.buf.length < n) return null;
      const a = gov.buf.slice(-n).sort((x, y) => x - y);
      return a[a.length >> 1];
    };
    // 很慢的時候（例如每秒只有 10 幀）不要等 90 幀：至少 20 幀就判斷
    const m90 = gov.buf.length >= 20 ? med(Math.min(90, gov.buf.length)) : null;
    if (m90 == null) return;
    let ni = rsI;
    if (m90 > 20 && rsI < RS_STEPS.length - 1) ni = rsI + 1;
    else if (m90 > 20 && !G.lowFx && LOWFX_Q == null) {
      G.lowFx = true; // 解析度已經最低還是慢：省效能模式
      gov.cool = 2;
      gov.buf.length = 0;
      return;
    } else {
      const m240 = med(240);
      if (m240 != null && m240 < 12.5 && rsI > 0) ni = rsI - 1;
    }
    if (ni !== rsI) {
      rsI = ni;
      G.renderScale = RS_STEPS[rsI];
      gov.cool = 2;
      gov.buf.length = 0;
      resize();
    }
  }

  G.input.init();
  if (G.debug && G.debugPanel) G.debugPanel.init();

  const STEP = 1 / 60;
  let acc = 0;
  let last = performance.now();
  let fpsT = 0;
  let fpsN = 0;
  G.fps = 60;

  function update(dt) {
    G.time += dt;
    G.hudIcons.update(dt);
    G.demo.update();
    if (G.scene === 'play') {
      G.cut.tick();
      if (G.cut.update(dt)) {
        G.fx.update(dt);
        G.hud.update(dt);
        return;
      }
      if (G.story.updateCeremony(dt)) {
        G.fx.update(dt);
        G.hud.update(dt);
        return;
      }
      if (G.evolve.update(dt)) {
        G.fx.update(dt);
        G.hud.update(dt);
        return;
      }
      G.ui.handleKeys();
      if (!G.ui.blocking()) G.world.update(dt);
      G.tutorial.update(dt);
      G.fx.update(dt);
      G.hud.update(dt);
    } else if (G.scene === 'intro') {
      G.scenes.updateIntro(dt);
    } else if (G.scene === 'title') {
      if (G.input.escPressed && G.ui.isOpen('keys')) G.ui.close('keys');
    }
  }

  function draw(frameDt) {
    const k = scale * dpr * G.renderScale;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = true;
    // 每一幀從乾淨的狀態開始：任何特效漏還原的混色模式、透明度都不會殘留到下一幀
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    if (G.scene === 'play' && G.world.map) {
      G.world.draw(ctx);
      G.hud.draw(ctx);
      G.tutorial.draw(ctx);
      G.evolve.draw(ctx);
      G.story.drawCeremony(ctx);
      G.cut.draw(ctx);
      G.fx.drawScreen(ctx);
      if (G.world.fade > 0) {
        ctx.fillStyle = 'rgba(0,0,0,' + G.world.fade + ')';
        ctx.fillRect(0, 0, G.W, G.H);
      }
    } else if (G.scene === 'intro') {
      G.scenes.drawIntro(ctx);
    } else {
      G.scenes.drawTitle(ctx, frameDt);
    }
  }

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    governor(dt);
    if (dt > 0.1) dt = 0.1;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 6) {
      try {
        update(STEP);
      } catch (e) {
        if (!G._errShown) console.error(e);
        G._errShown = true;
      }
      G.input.endStep();
      acc -= STEP;
      steps++;
    }
    if (steps >= 6) acc = 0;
    try {
      draw(dt);
    } catch (e) {
      console.error(e);
    }
    fpsT += dt;
    fpsN++;
    if (fpsT >= 1) {
      G.fps = fpsN;
      fpsT = 0;
      fpsN = 0;
    }
    requestAnimationFrame(frame);
  }

  // 離開頁面前存檔：手機瀏覽器切到背景（切 App、鎖螢幕）之後可能直接把分頁關掉，
  // 所以 visibilitychange→hidden、pagehide（iOS Safari）、beforeunload 都要存一次
  const saveNow = () => {
    try {
      G.save.write();
    } catch (e) {}
  };
  window.addEventListener('beforeunload', saveNow);
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' || document.hidden) saveNow();
  });

  G.scenes.toTitle();
  // 網址加上 ?demo=1 直接進試玩模式
  if (/[?&]demo=1/.test(location.search)) G.demo.start();
  requestAnimationFrame(frame);
})();
