// 冒險中的提醒（教學做完、離開營地之後）：
//   HP／MP 快用完 → 提醒喝藥水（藥水用完就提醒回營地買）
//   有沒用掉的技能點 → 提醒打開「技能」；撿到比身上好的裝備 → 提醒打開「裝備」
// 提醒用畫面上方的提示訊息，同時讓左上角對應的圖示發光一陣子（js/ui/hudicons.js 讀 G.remind.glowing）。
(function () {
  'use strict';

  const HP_LOW = 0.3;
  const MP_LOW = 0.2;
  const CD_POT = 12; // 同一種藥水提醒至少隔 12 秒
  const SP_AGAIN = 150; // 技能點一直沒用：2.5 分鐘後再提醒一次（最多兩次）
  const GLOW = 4; // 圖示發光幾秒

  const touchOn = () => !!(G.touch && G.touch.on);
  const key = (a) => G.data.keys.label(G.input.bind[a]);

  G.remind = {
    t: 0,
    hpT: -99,
    mpT: -99,
    sp0: null,
    spT: 0,
    spN: 0,
    seen: {}, // 已經提醒過的裝備 uid
    glow: {},
    lastMap: null,

    reset() {
      this.sp0 = null;
      this.spN = 0;
      this.seen = {};
      this.glow = {};
    },

    glowing(id) {
      return (this.glow[id] || 0) > G.time;
    },

    say(text, color, icon) {
      G.hud.toast(text, color);
      if (icon) this.glow[icon] = G.time + GLOW;
    },

    update(dt) {
      this.t -= dt;
      if (this.t > 0) return;
      this.t = 0.5;
      if (G.scene !== 'play') return;
      const P = G.player;
      const W = G.world;
      if (!P || !W || !W.map || !W.flags || !W.flags.tutorialDone) return;
      if ((G.tutorial && G.tutorial.active) || (G.cut && G.cut.active && G.cut.active()) || (G.story && G.story.cer)) return;
      if (G.demo && G.demo.active) return;
      const inCamp = W.map.type === 'camp';
      const now = G.time;

      // ── HP／MP 快用完（營地裡會自己回，不吵）──
      if (!inCamp && P.alive && P.alive()) {
        if (P.hp < P.maxHp * HP_LOW && now - this.hpT > CD_POT) {
          this.hpT = now;
          if ((P.potions.hp || 0) > 0) this.say(touchOn() ? 'HP 快沒了！點紅漿果鈕補血' : 'HP 快沒了！按 ' + key('hpPot') + ' 吃紅漿果', '#ff8a8a');
          else this.say('紅漿果用完了！先退開，回營地找貓頭鷹買', '#ff8a8a');
        }
        if (P.mp < P.maxMp * MP_LOW && now - this.mpT > CD_POT) {
          this.mpT = now;
          if ((P.potions.mp || 0) > 0) this.say(touchOn() ? 'MP 快沒了！點藍花蜜鈕補魔' : 'MP 快沒了！按 ' + key('mpPot') + ' 喝藍花蜜', '#8ac8ff');
          else this.say('藍花蜜用完了！先用普通攻擊，回營地再買', '#8ac8ff');
        }
      }

      // ── 新的技能點 ──
      if (this.sp0 === null) this.sp0 = P.sp;
      if (P.sp > this.sp0) {
        this.say('有新的技能點！點左上角「技能」學新招或升級', '#ffe07a', 'skills');
        this.spT = now;
        this.spN = 0;
      } else if (P.sp > 0 && this.spN < 2 && now - this.spT > SP_AGAIN && !inCamp) {
        this.spN++;
        this.spT = now;
        this.say('還有 ' + P.sp + ' 點技能點沒用', '#ffe07a', 'skills');
      }
      this.sp0 = P.sp;

      // ── 一轉之後，換到下一張地圖時提醒可以選形態（只提醒一次）──
      const mapId = W.mapId;
      if (this.lastMap !== mapId) {
        const moved = this.lastMap != null;
        this.lastMap = mapId;
        const tier = (G.data.forms[P.form] || {}).tier || 0;
        if (moved && tier >= 1 && !W.flags.formHint) {
          W.flags.formHint = true;
          this.glow.forms = now + 8;
          this.say('一轉之後，力量／法術／敏捷三條路線都能用了！', '#ffd0ff', 'forms');
          setTimeout(() => this.say('點左上角「形態」選擇、切換新形態', '#ffd0ff', 'forms'), 1600);
        }
      }

      // ── 撿到比身上好的裝備 ──
      for (const it of P.bag) {
        if (!it || this.seen[it.uid]) continue;
        this.seen[it.uid] = true;
        if (it.isNew && G.ui.isUpgrade && G.ui.isUpgrade(it)) {
          this.say('「' + it.name + '」比身上的好！打開左上角「裝備」換上', '#9dffa0', 'inventory');
          break; // 一次只講一件
        }
      }
    },
  };
})();
