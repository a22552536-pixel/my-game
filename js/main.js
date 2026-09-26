// 進入點：畫面縮放、固定時間步長的主迴圈。
(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const stage = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let dpr = 1;

  function resize() {
    scale = Math.min(window.innerWidth / G.W, window.innerHeight / G.H);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    stage.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
    canvas.width = Math.round(G.W * scale * dpr);
    canvas.height = Math.round(G.H * scale * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

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
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
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

  // 離開頁面前存檔
  window.addEventListener('beforeunload', () => G.save.write());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) G.save.write();
  });

  G.scenes.toTitle();
  // 網址加上 ?demo=1 直接進試玩模式
  if (/[?&]demo=1/.test(location.search)) G.demo.start();
  requestAnimationFrame(frame);
})();
