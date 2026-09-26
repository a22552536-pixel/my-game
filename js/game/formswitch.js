// 形態切換：一轉之後，三條路線（力量／法術／敏捷）都可以隨時切換。
//
// 技能怎麼處理：
//   - 每條路線有自己的「技能頁」：技能等級、剩餘技能點、技能欄配置各自獨立，切換時整頁換掉。
//   - 升級、進化拿到的技能點，會同時加到每一頁，所以切換不會吃虧，每條路線都能完整培養。
//   - 進化階段（一轉～四轉）是共用的：轉到第 n 轉，三條路線的第 n 轉形態都解鎖。
//   - 基本技能（飛撲、小吼）每一頁各自有一份。
(function () {
  'use strict';

  const LINES = ['might', 'magic', 'agile'];
  const baseIds = () => Object.keys(G.data.skills).filter((id) => G.data.skills[id].form === 'base');
  const lineOf = (form) => (G.data.forms[form] || {}).line || null;

  const F = (G.formSwitch = {
    LINES,
    COOLDOWN: 3,

    tier(P) {
      return (G.data.forms[P.form] || G.data.forms.base).tier;
    },

    // 一轉之後建立三條路線的技能頁（舊存檔也從這裡補上）
    ensurePages(P) {
      const line = lineOf(P.form);
      if (!line) return;
      P.pages = P.pages || {};
      const base = {};
      baseIds().forEach((id) => (base[id] = P.skills[id] || 0));
      // 目前這條路線花掉、別條路線要退回來的點數
      let spentHere = 0;
      for (const id in P.skills) if (G.data.skills[id] && G.data.skills[id].form !== 'base') spentHere += P.skills[id] || 0;
      LINES.forEach((l) => {
        if (P.pages[l]) return;
        if (l === line) P.pages[l] = { skills: P.skills, sp: P.sp, hotbar: P.hotbar };
        else {
          P.pages[l] = {
            skills: Object.assign({}, base),
            sp: P.sp + spentHere,
            hotbar: P.hotbar.map((id) => (id && G.data.skills[id] && G.data.skills[id].form === 'base' ? id : null)),
          };
        }
      });
      // 目前這頁永遠直接指向 P.skills／P.hotbar，只有 sp 需要同步
      P.pages[line].skills = P.skills;
      P.pages[line].hotbar = P.hotbar;
      P.pages[line].sp = P.sp;
    },

    // 拿到技能點：目前這頁加，其他頁也一起加
    addSP(P, n) {
      P.sp += n;
      const line = lineOf(P.form);
      if (!P.pages) return;
      LINES.forEach((l) => {
        if (l === line) P.pages[l].sp = P.sp;
        else if (P.pages[l]) P.pages[l].sp += n;
      });
    },

    // 花掉技能點之後同步目前這頁
    sync(P) {
      const line = lineOf(P.form);
      if (P.pages && line && P.pages[line]) {
        P.pages[line].sp = P.sp;
        P.pages[line].skills = P.skills;
        P.pages[line].hotbar = P.hotbar;
      }
    },

    options(P) {
      const t = this.tier(P);
      if (t < 1) return [];
      return LINES.map((l) => l + t).filter((id) => G.data.forms[id]);
    },

    canSwitch(P) {
      if (this.tier(P) < 1) return '一轉進化之後才能切換形態';
      if (P.dead) return '現在不能切換';
      if (P.formCd > 0) return '剛切換過，等 ' + Math.ceil(P.formCd) + ' 秒';
      if (G.evolve.anim) return '進化中';
      return null;
    },

    switchTo(P, formId) {
      const why = this.canSwitch(P);
      if (why) {
        G.hud.toast(why, '#ddd');
        return false;
      }
      const to = G.data.forms[formId];
      if (!to || to.tier !== this.tier(P) || formId === P.form) return false;
      this.ensurePages(P);
      this.sync(P);
      const page = P.pages[to.line];
      P.form = formId;
      P.skills = page.skills;
      P.hotbar = page.hotbar;
      P.sp = page.sp;
      P.action = null;
      P.cds = {};
      P.formCd = this.COOLDOWN;
      P.recalc();
      P.hp = Math.min(P.hp, P.maxHp);
      P.mp = Math.min(P.mp, P.maxMp);
      G.fx.screenFlash('#ffffff', 0.35);
      G.fx.ring(P.x, P.y - 34, 'rgba(255,240,180,0.95)', 90, 0.35, 6);
      G.fx.sparkle(P.x, P.y - 40, '#fff3a0', 18, 40);
      G.audio.play('portal');
      G.hud.toast('切換成「' + to.name + '」', '#ffe14a');
      G.save.write();
      return true;
    },
  });

  F.lineOf = lineOf;
})();
