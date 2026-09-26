// DOM 視窗：背包、技能、任務、商店、對話、選單、改鍵、死亡、M1 結尾。
// 視窗開著的時候遊戲會暫停（單人遊戲，比較友善）。
(function () {
  'use strict';
  const U = G.util;
  const esc = U.esc;

  const root = () => document.getElementById('ui');

  const UI = (G.ui = {
    stack: [],
    els: {},
    selected: null, // 背包中選取的物品 uid
    keyWait: null,
    keyMsg: '',
    confirmReset: false,
    dialogue: null,

    blocking() {
      return this.stack.length > 0;
    },
    isOpen(name) {
      return this.stack.indexOf(name) >= 0;
    },
    top() {
      return this.stack[this.stack.length - 1];
    },

    open(name, arg) {
      if (this.isOpen(name)) {
        this.render(name);
        return;
      }
      // 背包、技能、任務、商店互斥，只留一個
      const panels = ['inventory', 'skills', 'quests', 'shop', 'forms', 'worldmap', 'codex'];
      if (panels.indexOf(name) >= 0) panels.forEach((p) => this.isOpen(p) && this.close(p));
      this.stack.push(name);
      const el = document.createElement('div');
      el.className = 'win win-' + name;
      el.addEventListener('click', (e) => this.onClick(name, e));
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      root().appendChild(el);
      this.els[name] = el;
      if (name === 'dialogue') this.dialogue = arg;
      if (name === 'inventory' || name === 'shop') this.selected = null;
      this.render(name);
      G.input.clearAll();
      G.audio.play('ui');
    },

    close(name) {
      if (name === 'keys' && G.hudIcons) G.hudIcons.refresh();
      name = name || this.top();
      if (!name) return;
      const i = this.stack.indexOf(name);
      if (i >= 0) this.stack.splice(i, 1);
      const el = this.els[name];
      if (el) el.remove();
      delete this.els[name];
      if (name === 'keys') {
        this.keyWait = null;
        G.input.capture = null;
      }
      if (name === 'menu') this.confirmReset = false;
      G.input.clearAll();
    },

    closeAll() {
      while (this.stack.length) this.close(this.top());
    },

    toggle(name) {
      if (this.isOpen(name)) this.close(name);
      else if (!this.blocking() || ['inventory', 'skills', 'quests', 'forms', 'worldmap', 'codex'].indexOf(this.top()) >= 0) this.open(name);
    },

    refresh() {
      this.stack.forEach((n) => this.render(n));
    },

    render(name) {
      const el = this.els[name];
      if (!el) return;
      const fn = this['r_' + name];
      // 重畫時保留捲動位置，不要每按一下就跳回最上面
      const scrolls = Array.from(el.querySelectorAll('.body, .col, .sellgrid')).map((n) => n.scrollTop);
      try {
        el.innerHTML = fn ? fn.call(this) : '';
        Array.from(el.querySelectorAll('.body, .col, .sellgrid')).forEach((n, i) => {
          if (scrolls[i]) n.scrollTop = scrolls[i];
        });
      } catch (e) {
        // 畫面出錯時至少留一個能關掉的視窗，不要卡住整個遊戲
        console.error(e);
        el.innerHTML = this.frame('出了點問題', '<div class="dim">這個視窗暫時打不開（' + esc(String(e.message || e)) + '）。按 Esc 關閉。</div>');
      }
    },

    // 每幀從主迴圈呼叫：處理 Esc 與開關視窗的按鍵
    handleKeys() {
      const I = G.input;
      if (this.keyWait) return;
      if (I.escPressed) {
        if (this.blocking()) {
          const t = this.top();
          if (t !== 'death') this.close(t);
        } else this.open('menu');
        return;
      }
      if (this.isOpen('death') || this.isOpen('m1end') || this.isOpen('menu') || this.isOpen('keys')) return;
      if (I.wasPressed('inventory')) this.toggle('inventory');
      else if (I.wasPressed('skills')) this.toggle('skills');
      else if (I.wasPressed('quests')) this.toggle('quests');
      else if (I.wasPressed('forms')) this.toggle('forms');
      else if (I.wasPressed('worldmap')) this.toggle('worldmap');
      else if (I.wasPressed('codex')) this.toggle('codex');
      else if (this.isOpen('dialogue') && (I.wasPressed('up') || I.wasPressed('jump'))) this.close('dialogue');
    },

    frame(title, body, extraClass) {
      return '<div class="panel ' + (extraClass || '') + '"><div class="title">' + title + '<button class="x" data-act="close">✕</button></div><div class="body">' + body + '</div></div>';
    },

    onClick(name, e) {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      const arg = btn.getAttribute('data-arg');
      G.audio.play('ui');
      if (act === 'close') {
        this.close(name);
        return;
      }
      const fn = this['a_' + act];
      const res = fn ? fn.call(this, arg, name, btn) : null;
      if (res !== 'keep' && this.els[name]) this.render(name);
    },

    // ───────── 物品描述 ─────────
    itemHTML(it, compare) {
      const D = G.data.items;
      const R = D.rarity[it.rarity];
      const st = G.loot.totalStats(it);
      let h = '<div class="item-name" style="color:' + R.text + '">' + esc(it.name) + '</div>';
      h += '<div class="item-meta">' + (it.unique ? '獨特 · ' : '') + R.name + ' · ' + D.slots[it.slot] + ' · 需要 Lv.' + it.req + '</div>';
      h += '<ul class="stats">';
      for (const k in it.stats) h += '<li>' + G.loot.fmtStat(k, it.stats[k]) + '</li>';
      if (it.sub) h += '<li class="sub">' + G.loot.fmtStat(it.sub.stat, it.sub.value) + '</li>';
      if (it.special) h += '<li class="special">★ ' + D.specials[it.special].name + '：' + D.specials[it.special].desc + '</li>';
      h += '</ul>';
      if (compare !== undefined) {
        const cur = compare ? G.loot.totalStats(compare) : {};
        const keys = {};
        Object.keys(st).concat(Object.keys(cur)).forEach((k) => (keys[k] = 1));
        let diff = '';
        for (const k in keys) {
          const dv = (st[k] || 0) - (cur[k] || 0);
          if (Math.abs(dv) < 1e-6) continue;
          const txt = k === 'crit' ? (dv * 100).toFixed(1) + '%' : String(dv);
          diff += '<span class="' + (dv > 0 ? 'up' : 'down') + '">' + D.statNames[k] + ' ' + (dv > 0 ? '+' : '') + txt + '</span>';
        }
        if (diff) h += '<div class="diff">和目前裝備比較：' + diff + '</div>';
      }
      return h;
    },

    isUpgrade(it) {
      const cur = G.player.equip[it.slot];
      return G.data.items.score(G.loot.totalStats(it)) > (cur ? G.data.items.score(G.loot.totalStats(cur)) : 0) + 0.01;
    },

    itemCell(it, act, extra) {
      const R = G.data.items.rarity[it.rarity];
      const sel = this.selected === it.uid ? ' sel' : '';
      const up = act === 'select' && this.isUpgrade(it) && G.player.level >= it.req ? '<span class="uparrow">▲</span>' : '';
      const low = G.player.level < it.req ? ' low' : '';
      return '<button class="cell' + sel + low + '" style="border-color:' + R.color + '" data-act="' + act + '" data-arg="' + it.uid + '" title="' + esc(it.name) + '"><img src="' + G.art.iconURL(it.slot, it.tint) + '" alt="">' + up + (extra || '') + '</button>';
    },

    // ───────── 背包 ─────────
    r_inventory() {
      const P = G.player;
      const D = G.data.items;
      let eq = '<div class="equip">';
      for (const slot in D.slots) {
        const it = P.equip[slot];
        eq += '<div class="eqslot"><div class="lbl">' + D.slots[slot] + '</div>';
        eq += it ? this.itemCell(it, 'selectEq') + '<div class="eqname" style="color:' + D.rarity[it.rarity].text + '">' + esc(it.name) + '</div>' : '<div class="cell empty"></div><div class="eqname dim">（空）</div>';
        eq += '</div>';
      }
      eq += '</div>';
      const stats =
        '<div class="charstats"><div>攻擊 <b>' + Math.round(P.atk) + '</b></div><div>HP <b>' + P.maxHp + '</b></div><div>MP <b>' + P.maxMp + '</b></div><div>防禦 <b>' + Math.round(P.def) + '</b></div><div>黑閃 <b>' + (P.crit * 100).toFixed(1) + '%</b></div></div>';
      let grid = '<div class="grid">';
      for (let i = 0; i < G.data.balance.bagSize; i++) {
        const it = P.bag[i];
        grid += it ? this.itemCell(it, 'select') : '<div class="cell empty"></div>';
      }
      grid += '</div>';
      const misc =
        '<div class="misc"><span><img src="' + G.art.iconURL('gold') + '">' + P.gold + ' 金葉</span>' +
        '<span class="leaves" title="每片星楓葉：HP、攻擊永久 +4%">星楓葉 ' + G.story.count() + '/5 ' + [1, 2, 3, 4, 5].map((ch) => { const d = G.story.leafDef(ch); return G.story.hasLeaf(ch) ? '<img title="' + d.name + '：' + d.gift + '" src="' + G.art.iconURL('starleaf', d.color) + '">' : '<i title="？？？"></i>'; }).join('') + '</span>' +
        '</div>';
      const cons = Object.keys(D.potions).filter((k) => (P.potions[k] || 0) > 0);
      const consHTML = '<div class="cons"><div class="lbl">消耗品（點一下使用）</div>' + (cons.length ? cons.map((k) => '<button class="usebtn" data-act="useItem" data-arg="' + k + '" title="' + D.potions[k].name + '：' + D.potions[k].desc + '"><img src="' + G.art.iconURL(D.potions[k].icon) + '"><span>' + P.potions[k] + '</span></button>').join('') : '<span class="dim">沒有消耗品</span>') + '</div>';
      const mats = Object.keys(D.materials).filter((k) => (P.questItems[k] || 0) > 0);
      const matsHTML = '<div class="cons"><div class="lbl">材料（可以賣給商店，或拿去貓頭鷹的小舖交換）</div>' + (mats.length ? mats.map((k) => '<button class="usebtn' + (this.selected === 'mat:' + k ? ' on' : '') + '" data-act="select" data-arg="mat:' + k + '" title="' + D.materials[k].name + '"><img src="' + G.art.iconURL(k) + '"><span>' + P.questItems[k] + '</span></button>').join('') : '<span class="dim">打倒怪物會掉材料</span>') + '</div>';
      let detail = '<div class="detail dim">點一下物品查看詳細資料。<br>▲ 表示比身上的更好。</div>';
      const sel = this.findItem(this.selected);
      if (this.selected && this.selected.startsWith('mat:') && P.questItems[this.selected.slice(4)] > 0) {
        const k = this.selected.slice(4);
        const m = D.materials[k];
        const from = G.quests.sources(k);
        const res = G.quests.reserved(k);
        const uses = D.trades.filter((t) => t.need[k]).map((t) => this.tradeGiveName(t)).join('、');
        detail = '<div class="detail"><div class="nm" style="font-weight:bold;font-size:16px">' + m.name + ' ×' + P.questItems[k] + '</div><div class="small">' + m.desc + '</div>' +
          '<div class="small dim">' + (from.length ? '掉落：' + from.join('、') + '　' : '') + '賣價 ' + m.price + ' 金葉</div>' +
          (uses ? '<div class="small">可交換：' + uses + '</div>' : '') +
          (res ? '<div class="small warn">進行中的任務需要 ' + res + ' 個</div>' : '') + '</div>';
      } else if (sel) {
        const equipped = sel.where === 'equip';
        detail = '<div class="detail">' + this.itemHTML(sel.item, equipped ? undefined : P.equip[sel.item.slot] || null) + '<div class="btns">';
        if (equipped) detail += '<button data-act="unequip" data-arg="' + sel.item.uid + '">卸下</button>';
        else {
          detail += P.level >= sel.item.req ? '<button class="primary" data-act="equip" data-arg="' + sel.item.uid + '">裝備</button>' : '<span class="warn">等級不足</span>';
          detail += '<button data-act="discard" data-arg="' + sel.item.uid + '">丟掉</button>';
        }
        detail += '</div></div>';
      }
      return this.frame('背包（' + P.bag.length + '/' + G.data.balance.bagSize + '）', '<div class="inv"><div class="left">' + eq + stats + '</div><div class="right">' + grid + misc + consHTML + matsHTML + detail + '</div></div>');
    },

    findItem(uid) {
      if (!uid) return null;
      const P = G.player;
      for (const s in P.equip) if (P.equip[s] && P.equip[s].uid === uid) return { item: P.equip[s], where: 'equip' };
      const it = P.bag.find((b) => b.uid === uid);
      return it ? { item: it, where: 'bag' } : null;
    },

    a_useItem(id) {
      G.player.useItem(id);
    },

    a_select(uid) {
      this.selected = this.selected === uid ? null : uid;
    },
    a_selectEq(uid) {
      this.selected = uid;
    },
    a_equip(uid) {
      const P = G.player;
      const i = P.bag.findIndex((b) => b.uid === uid);
      if (i < 0) return;
      const it = P.bag[i];
      if (P.level < it.req) return;
      const old = P.equip[it.slot];
      P.equip[it.slot] = it;
      P.bag.splice(i, 1);
      if (old) P.bag.splice(i, 0, old);
      P.recalc();
      this.selected = it.uid;
      G.save.write();
    },
    a_unequip(uid) {
      const P = G.player;
      if (P.bag.length >= G.data.balance.bagSize) {
        G.hud.toast('背包已滿', '#ff9a9a');
        return;
      }
      for (const s in P.equip) {
        if (P.equip[s] && P.equip[s].uid === uid) {
          P.bag.push(P.equip[s]);
          P.equip[s] = null;
        }
      }
      P.recalc();
      G.save.write();
    },
    a_discard(uid, name, btn) {
      if (!btn.classList.contains('confirm')) {
        btn.textContent = '確定丟掉？';
        btn.classList.add('confirm');
        btn.setAttribute('data-act', 'discardYes');
        return 'keep';
      }
    },
    a_discardYes(uid) {
      const P = G.player;
      P.bag = P.bag.filter((b) => b.uid !== uid);
      this.selected = null;
      G.save.write();
    },

    // ───────── 技能 ─────────
    r_skills() {
      const P = G.player;
      const I = G.input;
      let h = '<div class="sp">剩餘技能點：<b>' + P.sp + '</b></div>';
      if (this.keyWait && this.keyWait.type === 'skillslot') h += '<div class="notice">請按下技能欄按鍵（' + G.data.keys.skillSlots.map((a) => I.label(a)).join(' ') + '），按 Esc 取消</div>';
      h += '<div class="skill basic"><img src="' + G.art.iconURL('pounce') + '" class="hide"><div class="info"><div class="nm">爪擊 <span class="dim">普通攻擊 · ' + I.label('attack') + '</span></div><div class="ds">用前爪攻擊前方 1 隻敵人。</div></div></div>';
      for (const id in G.data.skills) {
        const S = G.data.skills[id];
        if (!this.skillVisible(S)) continue;
        const lv = P.skills[id] || 0;
        const slot = P.hotbar.indexOf(id);
        h += '<div class="skill"><img src="' + G.art.iconURL(S.icon) + '"><div class="info">';
        h += '<div class="nm">' + S.name + ' <span class="lv">Lv.' + lv + ' / ' + S.maxLv + '</span>' + (slot >= 0 ? ' <span class="key">[' + I.label(G.data.keys.skillSlots[slot]) + ']</span>' : '') + '</div>';
        const mpTxt = (l) => (typeof S.mp === 'function' ? '（MP ' + S.mp(l) + '）' : '');
        h += '<div class="ds">' + (lv > 0 ? S.desc(lv) + mpTxt(lv) : '尚未學會') + '</div>';
        // 直接點按鍵把技能放上技能欄
        if (S.type !== 'passive') {
          h += '<div class="slotpick">放在：' + G.data.keys.skillSlots.map((a, i) => {
            const on = P.hotbar[i] === id;
            const other = P.hotbar[i] && !on ? G.data.skills[P.hotbar[i]] : null;
            return '<button class="sp' + (on ? ' on' : '') + '" data-act="setSlot" data-arg="' + id + ':' + i + '" title="' + (on ? '點一下拿下來' : other ? '換掉「' + other.name + '」' : '空格') + '">' + I.label(a) + (other ? '<i>' + other.name.slice(0, 1) + '</i>' : '') + '</button>';
          }).join('') + '</div>';
        }
        if (lv < S.maxLv) h += '<div class="ds next">下一級：' + S.desc(lv + 1) + mpTxt(lv + 1) + '</div>';
        h += '</div><div class="btns">';
        const tut = id === 'roar' && G.tutorial.current() && G.tutorial.current().id === 'learn';
        h += '<button class="primary' + (tut ? ' tut-glow' : '') + '" data-act="learn" data-arg="' + id + '"' + (P.sp > 0 && lv < S.maxLv ? '' : ' disabled') + '>＋</button>';
        if (tut) h += '<span class="tut-point">◀ 按這裡</span>';
        if (S.type === 'passive') h += '<span class="passive-tag">被動</span>';
        h += '</div></div>';
      }
      h += '<div class="hotbar">技能欄：';
      G.data.keys.skillSlots.forEach((a, i) => {
        const id = P.hotbar[i];
        h += '<button class="hb" data-act="unbind" data-arg="' + i + '" title="點一下清除">' + '<span class="k">' + I.label(a) + '</span>' + (id ? '<img src="' + G.art.iconURL(G.data.skills[id].icon) + '">' : '') + '</button>';
      });
      h += '</div>';
      return this.frame('技能', h, 'skills');
    },
    a_learn(id) {
      const P = G.player;
      const S = G.data.skills[id];
      if (P.sp <= 0 || (P.skills[id] || 0) >= S.maxLv) return;
      P.skills[id] = (P.skills[id] || 0) + 1;
      P.sp--;
      G.formSwitch.sync(P);
      if (S.type !== 'passive' && P.hotbar.indexOf(id) < 0) {
        const free = P.hotbar.indexOf(null);
        if (free >= 0) P.hotbar[free] = id;
      }
      G.audio.play('quest');
      G.save.write();
    },
    a_setSlot(arg) {
      const [id, n] = arg.split(':');
      const i = +n;
      const P = G.player;
      if (P.hotbar[i] === id) P.hotbar[i] = null;
      else {
        const old = P.hotbar.indexOf(id);
        if (old >= 0) P.hotbar[old] = null;
        P.hotbar[i] = id;
      }
      G.audio.play('ui');
      G.save.write();
    },
    a_bind(id) {
      this.keyWait = { type: 'skillslot', id };
      G.input.capture = (code) => {
        const slots = G.data.keys.skillSlots;
        const action = G.input.codeToAction[code];
        const i = slots.indexOf(action);
        this.keyWait = null;
        if (code !== 'Escape' && i >= 0) {
          const P = G.player;
          const old = P.hotbar.indexOf(id);
          if (old >= 0) P.hotbar[old] = null;
          P.hotbar[i] = id;
          G.save.write();
        }
        this.render('skills');
      };
    },
    skillVisible(S) {
      if (S.form === 'base') return true;
      const F = G.data.forms;
      const mine = F[G.player.form];
      const f = F[S.form];
      return !!(f && mine && f.line === mine.line && f.tier <= mine.tier);
    },

    a_unbind(i) {
      G.player.hotbar[+i] = null;
    },

    // ───────── 任務 ─────────
    r_quests() {
      const Q = G.quests;
      let h = '';
      let any = false;
      for (const id in G.data.quests) {
        const q = G.data.quests[id];
        const st = Q.state[id];
        let status;
        if (st === 'done') status = '<span class="done">已完成</span>';
        else if (st === 'ready') status = '<span class="ready">可回報</span>';
        else if (st === 'active') status = '<span class="active">進行中</span>';
        else if (Q.available(id)) status = '<span class="avail">可接取（' + G.data.npcs[q.npc].name + '）</span>';
        else continue;
        any = true;
        h += '<div class="quest"><div class="nm">' + (q.main ? '★ ' : '') + q.name + ' ' + status + '</div>';
        if (st === 'active' || st === 'ready') h += '<div class="ds">' + Q.goalText(id) + '</div>';
        const r = q.reward;
        const rw = [];
        if (r.exp) rw.push('經驗 ' + r.exp);
        if (r.gold) rw.push('金葉 ' + r.gold);
        if (r.potions) for (const k in r.potions) rw.push(G.data.items.potions[k].name + ' ×' + r.potions[k]);
        if (r.equip) rw.push(G.data.items.rarity[r.equip.rarity].name + ' ' + G.data.items.bases[r.equip.base].name);
        h += '<div class="ds dim">獎勵：' + rw.join('、') + '</div></div>';
      }
      if (!any) h = '<div class="dim">目前沒有任務。到營地找頭上有「!」的 NPC 聊聊吧。</div>';
      return this.frame('任務', h, 'quests');
    },

    // ───────── 對話 ─────────
    openDialogue(npc) {
      this.dialogue = { npc, page: 'main', quest: null };
      this.open('dialogue', this.dialogue);
    },
    r_dialogue() {
      const d = this.dialogue;
      const tc = G.tutorial.current();
      const tutAccept = tc && (tc.id === 'accept' || tc.id === 'talk');
      const npc = d.npc;
      const def = npc.def;
      const Q = G.quests;
      let text = '';
      let btns = '';
      if (d.page === 'offer') {
        const q = G.data.quests[d.quest];
        text = q.lines.offer;
        btns = '<button class="primary' + (tutAccept ? ' tut-glow' : '') + '" data-act="acceptQ" data-arg="' + d.quest + '">接受</button><button data-act="dlgBack">再想想</button>';
      } else if (d.page === 'say') {
        text = d.text;
        btns = '<button data-act="dlgBack">好</button>';
      } else {
        text = d.greet || (d.greet = G.quests.npcLine(npc.id));
        if (Q.forNpc(npc.id).length) {
          Q.forNpc(npc.id).forEach((id) => {
            const q = G.data.quests[id];
            const st = Q.state[id];
            if (st === 'ready') btns += '<button class="primary" data-act="turnIn" data-arg="' + id + '">回報「' + q.name + '」</button>';
            else if (st === 'active') btns += '<button data-act="progQ" data-arg="' + id + '">「' + q.name + '」進行中</button>';
            else if (Q.available(id)) btns += '<button class="primary' + (tutAccept ? ' tut-glow' : '') + '" data-act="offerQ" data-arg="' + id + '">！「' + q.name + '」</button>';
          });
        }
        if (def.role === 'shop') btns += '<button class="primary" data-act="openShop">交易</button>';
        if (def.role === 'travel') {
          // 松鼠信差：到過的營地之間可以直接移動
          Object.keys(G.data.camps).forEach((r) => {
            const id = G.data.camps[r];
            if (!G.world.visited[id]) return;
            if (id === G.world.mapId) btns += '<button disabled>' + G.data.maps[id].name + '（目前所在）</button>';
            else btns += '<button class="primary" data-act="travel" data-arg="' + id + '">帶我去「' + G.data.maps[id].name + '」</button>';
          });
        }
        btns += '<button data-act="close">再見</button>';
      }
      return '<div class="dlg"><div class="who"><canvas class="portrait" data-npc="' + npc.id + '" width="120" height="120"></canvas><div class="nm">' + def.name + '</div></div><div class="say">' + esc(text) + '</div><div class="btns">' + btns + '</div></div>';
    },
    a_travel(id) {
      this.closeAll();
      G.world.changeMap(id, 'camp');
      G.audio.play('portal');
    },
    a_offerQ(id) {
      this.dialogue.page = 'offer';
      this.dialogue.quest = id;
    },
    a_acceptQ(id) {
      G.quests.accept(id);
      this.dialogue.page = 'main';
      this.dialogue.greet = '謝謝你呀。';
    },
    a_progQ(id) {
      this.dialogue.page = 'say';
      this.dialogue.text = G.data.quests[id].lines.progress + '\n（' + G.quests.goalText(id) + '）';
    },
    a_turnIn(id) {
      if (G.quests.turnIn(id)) {
        this.dialogue.page = 'say';
        this.dialogue.text = G.data.quests[id].lines.done;
      }
    },
    a_dlgBack() {
      this.dialogue.page = 'main';
    },
    a_openEvolve() {
      this.close('dialogue');
      this.open('evolve');
    },

    shopGoods() {
      const D = G.data.items;
      const id = this.shopId || 'owl';
      return (id === 'mole' ? D.moleShop : D.shops[id] || D.moreShops[id]) || [];
    },
    a_openShop() {
      const shop = this.dialogue.npc.def.shop;
      this.shopTitle = this.dialogue.npc.def.shopName || this.dialogue.npc.def.name + '的商店';
      this.close('dialogue');
      this.shopId = shop;
      this.open('shop');
    },

    // ───────── 商店 ─────────
    r_shop() {
      const P = G.player;
      const D = G.data.items;
      const goods = this.shopGoods();
      let buy = '<h3>購買</h3>';
      goods.forEach((g, i) => {
        if (g.type === 'potion') {
          const p = D.potions[g.id];
          buy += '<div class="good"><img src="' + G.art.iconURL(p.icon) + '"><div class="info"><div class="nm">' + p.name + '</div><div class="ds">' + p.desc + ' · ' + p.price + ' 金葉 · 持有 ' + (P.potions[g.id] || 0) + '</div></div>' +
            '<button data-act="buy" data-arg="' + i + ':1"' + (P.gold >= p.price ? '' : ' disabled') + '>買 1</button><button data-act="buy" data-arg="' + i + ':10"' + (P.gold >= p.price * 10 ? '' : ' disabled') + '>買 10</button></div>';
        } else {
          const base = D.bases[g.base];
          const R = D.rarity[g.rarity];
          const stats = Object.keys(g.fixed).map((k) => G.loot.fmtStat(k, g.fixed[k])).join('、');
          buy += '<div class="good"><img src="' + G.art.iconURL(base.slot, base.tint) + '"><div class="info"><div class="nm" style="color:' + R.text + '">' + R.name + ' ' + base.name + '</div><div class="ds">' + stats + ' · 需要 Lv.' + base.req + ' · ' + g.price + ' 金葉</div></div>' +
            '<button data-act="buy" data-arg="' + i + ':1"' + (P.gold >= g.price ? '' : ' disabled') + '>購買</button></div>';
        }
      });
      let sell = '<h3>賣出裝備 <button class="small" data-act="sellCommon">賣出全部普通裝備</button></h3><div class="sellgrid">';
      if (!P.bag.length) sell += '<div class="dim">背包裡沒有裝備。</div>';
      P.bag.forEach((it) => {
        sell += '<div class="sellrow">' + this.itemCell(it, 'noop') + '<span style="color:' + D.rarity[it.rarity].text + '">' + esc(it.name) + '</span><button data-act="sell" data-arg="' + it.uid + '">' + G.data.items.sellPrice(it) + ' 金葉</button></div>';
      });
      sell += '</div>';
      const mats = Object.keys(D.materials).filter((k) => (P.questItems[k] || 0) > 0);
      sell += '<h3>賣出材料' + (mats.length ? ' <button class="small" data-act="sellMats">全部賣出（保留任務要的）</button>' : '') + '</h3><div class="sellgrid">';
      if (!mats.length) sell += '<div class="dim">沒有材料。打倒怪物會掉。</div>';
      mats.forEach((k) => {
        const m = D.materials[k];
        const res = G.quests.reserved(k);
        sell += '<div class="sellrow"><img class="mat" src="' + G.art.iconURL(k) + '"><span>' + m.name + ' ×' + P.questItems[k] + (res ? ' <small class="warn">任務要 ' + res + '</small>' : '') + '</span>' +
          '<button data-act="sellMat" data-arg="' + k + ':1">賣 1（' + m.price + '）</button></div>';
      });
      sell += '</div>';
      let trade = '';
      const myTrades = D.trades.map((t, i) => [t, i]).filter(([t]) => (t.shop || 'owl') === (this.shopId || 'owl'));
      if (myTrades.length) {
        trade = '<h3>以物易物</h3>';
        myTrades.forEach(([t, i]) => {
          const ok = this.canTrade(t);
          const need = Object.keys(t.need).map((k) => {
            const have = P.questItems[k] || 0;
            return '<span class="' + (have >= t.need[k] ? '' : 'warn') + '">' + D.materials[k].name + ' ' + have + '/' + t.need[k] + '</span>';
          }).join('、');
          trade += '<div class="good"><img src="' + G.art.iconURL(this.tradeGiveIcon(t)) + '"><div class="info"><div class="nm">' + this.tradeGiveName(t) + '</div><div class="ds">' + need + '</div></div>' +
            '<button data-act="trade" data-arg="' + i + '"' + (ok ? '' : ' disabled') + '>交換</button></div>';
        });
      }
      return this.frame((this.shopTitle || '商店') + '　<span class="gold"><img src="' + G.art.iconURL('gold') + '">' + P.gold + '</span>', '<div class="shop"><div class="col">' + buy + trade + '</div><div class="col">' + sell + '</div></div>', 'shop');
    },
    a_buy(arg) {
      const P = G.player;
      const D = G.data.items;
      const [i, n] = arg.split(':').map(Number);
      const g = this.shopGoods()[i];
      if (g.type === 'potion') {
        const cost = D.potions[g.id].price * n;
        if (P.gold < cost) return;
        P.gold -= cost;
        P.potions[g.id] = (P.potions[g.id] || 0) + n;
      } else {
        if (P.gold < g.price) return;
        if (P.bag.length >= G.data.balance.bagSize) {
          G.hud.toast('背包已滿', '#ff9a9a');
          return;
        }
        P.gold -= g.price;
        P.bag.push(G.loot.makeEquip(g.base, g.rarity, g.fixed));
      }
      G.audio.play('coin');
      G.save.write();
    },
    a_sell(uid) {
      const P = G.player;
      const it = P.bag.find((b) => b.uid === uid);
      if (!it) return;
      P.gold += G.data.items.sellPrice(it);
      P.bag = P.bag.filter((b) => b.uid !== uid);
      G.audio.play('coin');
      G.save.write();
    },
    a_sellCommon() {
      const P = G.player;
      let sum = 0;
      P.bag = P.bag.filter((it) => {
        if (it.rarity !== 'common') return true;
        sum += G.data.items.sellPrice(it);
        return false;
      });
      if (sum) {
        P.gold += sum;
        G.hud.toast('賣出普通裝備，獲得 ' + sum + ' 金葉', '#ffd84a');
        G.audio.play('coin');
        G.save.write();
      }
    },
    a_sellMat(arg) {
      const P = G.player;
      const [k, n] = arg.split(':');
      const c = Math.min(+n, P.questItems[k] || 0);
      if (!c) return;
      P.questItems[k] -= c;
      P.gold += c * G.data.items.materials[k].price;
      G.quests.recount();
      G.audio.play('coin');
      G.save.write();
    },
    a_sellMats() {
      const P = G.player;
      const D = G.data.items;
      let sum = 0;
      for (const k in D.materials) {
        const c = Math.max(0, (P.questItems[k] || 0) - G.quests.reserved(k));
        if (!c) continue;
        P.questItems[k] -= c;
        sum += c * D.materials[k].price;
      }
      if (!sum) return;
      P.gold += sum;
      G.hud.toast('賣出材料，獲得 ' + sum + ' 金葉', '#ffd84a');
      G.audio.play('coin');
      G.save.write();
    },
    canTrade(t) {
      const P = G.player;
      return Object.keys(t.need).every((k) => (P.questItems[k] || 0) >= t.need[k]);
    },
    tradeGiveName(t) {
      const g = t.give;
      if (g.potion) return G.data.items.potions[g.potion].name + ' ×' + g.n;
      return g.name;
    },
    tradeGiveIcon(t) {
      const g = t.give;
      if (g.potion) return G.data.items.potions[g.potion].icon;
      return g.unique ? { queenShroom: 'queencap', hermitCrab: 'lampshard', lavaTortoise: 'volcanocore' }[g.unique] || 'queencap' : 'charm';
    },
    a_trade(i) {
      const P = G.player;
      const D = G.data.items;
      const t = D.trades[+i];
      if (!t || !this.canTrade(t)) return;
      const g = t.give;
      if ((g.equip || g.unique) && P.bag.length >= G.data.balance.bagSize) {
        G.hud.toast('背包已滿', '#ff9a9a');
        G.audio.play('error');
        return;
      }
      for (const k in t.need) P.questItems[k] -= t.need[k];
      if (g.potion) {
        P.potions[g.potion] = (P.potions[g.potion] || 0) + g.n;
        G.hud.toast('換到 ' + this.tradeGiveName(t), '#ffb0a0');
        G.audio.play('potion');
      } else {
        const it = g.unique ? G.loot.makeUnique(G.util.pick(G.loot.uniquesOf(g.unique))) : G.loot.randomEquip(P.level, g.equip);
        P.bag.push(it);
        G.hud.toast('換到「' + it.name + '」', D.rarity[it.rarity].color);
        G.audio.play(it.rarity === 'legendary' ? 'legendary' : it.rarity === 'epic' ? 'epic' : 'rare');
      }
      G.quests.recount();
      G.save.write();
    },
    a_noop() {},

    // ───────── 選單 ─────────
    r_menu() {
      const on = G.audio.enabled;
      return this.frame(
        '選單',
        '<div class="menu">' +
          '<button class="primary" data-act="close">繼續遊戲</button>' +
          '<button data-act="openKeys">按鍵設定</button>' +
          '<button data-act="toggleSound">音效：' + (on ? '開' : '關') + '</button>' +
          '<button data-act="toggleMusic">音樂：' + (G.music.enabled ? '開' : '關') + '</button>' +
          '<button data-act="toTitle">存檔並回到標題</button>' +
          '<button class="danger" data-act="resetGame">' + (this.confirmReset ? '再按一次：刪除存檔並重新開始' : '重新開始') + '</button>' +
          '<div class="dim small">遊玩時間 ' + U.fmtTime(G.player.playTime) + '</div>' +
          '</div>',
        'menu'
      );
    },
    a_openKeys() {
      this.open('keys');
    },
    a_toggleSound() {
      G.audio.setEnabled(!G.audio.enabled);
    },
    a_toggleMusic() {
      G.music.setEnabled(!G.music.enabled);
    },
    a_toTitle() {
      G.save.write();
      this.closeAll();
      G.scenes.toTitle();
    },
    a_resetGame() {
      if (!this.confirmReset) {
        this.confirmReset = true;
        return;
      }
      this.closeAll();
      G.save.clear();
      G.scenes.newGame();
    },

    // ───────── 改鍵 ─────────
    r_keys() {
      const I = G.input;
      let h = '<div class="keys">';
      G.data.keys.actions.forEach(([a, label]) => {
        const waiting = this.keyWait && this.keyWait.type === 'rebind' && this.keyWait.action === a;
        h += '<div class="krow"><span>' + label + '</span><button class="' + (waiting ? 'waiting' : '') + '" data-act="rebind" data-arg="' + a + '">' + (waiting ? '請按新按鍵…' : esc(I.label(a))) + '</button></div>';
      });
      h += '<div class="krow"><span>選單／關閉視窗</span><button disabled>Esc（固定）</button></div>';
      h += '</div><div class="notice">' + esc(this.keyMsg || '點一下按鈕，再按下想要的按鍵。和其他動作重複時會自動互換。') + '</div>';
      h += '<div class="btns"><button data-act="resetKeys">恢復預設</button><button class="primary" data-act="close">完成</button></div>';
      return this.frame('按鍵設定', h, 'keycfg');
    },
    a_rebind(action) {
      this.keyWait = { type: 'rebind', action };
      this.keyMsg = '請按下新的按鍵（Esc 取消）';
      G.input.capture = (code) => {
        this.keyWait = null;
        if (code === 'Escape') {
          this.keyMsg = '已取消';
        } else {
          const r = G.input.setBinding(action, code);
          if (!r.ok) this.keyMsg = r.reason;
          else if (r.swappedWith) {
            const lbl = G.data.keys.actions.find((x) => x[0] === r.swappedWith)[1];
            this.keyMsg = '已設定。原本使用這個按鍵的「' + lbl + '」改成 ' + G.input.label(r.swappedWith);
          } else this.keyMsg = '已設定';
        }
        this.render('keys');
      };
    },
    a_resetKeys() {
      G.input.resetDefaults();
      this.keyMsg = '已恢復預設按鍵';
    },

    // ───────── 進化 ─────────
    r_evolve() {
      const opts = G.evolve.options();
      const pick = this.evolvePick;
      const first = G.evolve.tierOf(G.player.form) === 0;
      let h = '<div class="evo-intro">' + (first ? '身體裡的力量滿溢出來了。選擇你要成為的樣子。<b>選了之後就不能更改。</b>' : '力量又一次滿溢出來，身體開始改變了。') + '</div><div class="evo-cards">';
      opts.forEach((id) => {
        const f = G.data.forms[id];
        const line = G.data.lines[f.line];
        const skills = Object.keys(G.data.skills).filter((k) => G.data.skills[k].form === id).map((k) => {
          const S = G.data.skills[k];
          return '<li><img src="' + G.art.iconURL(S.icon) + '"><div><b>' + S.name + '</b>' + (S.type === 'passive' ? '（被動）' : '') + '<br><span>' + S.desc(1) + '</span></div></li>';
        }).join('');
        h += '<div class="evo-card' + (pick === id ? ' picked' : '') + '"><canvas class="evo-preview" data-form="' + id + '" width="220" height="170"></canvas>' +
          '<div class="evo-name">' + f.name + '</div><div class="evo-line">' + line.name + '路線 · ' + line.role + '</div>' +
          '<div class="evo-desc">' + f.desc + '</div><div class="evo-style">' + line.desc + '</div><ul class="evo-skills">' + skills + '</ul>' +
          '<button class="primary" data-act="pickForm" data-arg="' + id + '">選擇' + f.name + '</button></div>';
      });
      h += '</div>';
      if (pick) {
        h += '<div class="evo-confirm">確定要進化成「' + G.data.forms[pick].name + '」嗎？<button class="primary" data-act="confirmEvolve">確定進化</button><button data-act="pickForm" data-arg="">再想想</button></div>';
      }
      return this.frame('進化', h, 'evolve');
    },
    a_pickForm(id) {
      this.evolvePick = id || null;
    },
    a_confirmEvolve() {
      const id = this.evolvePick;
      this.evolvePick = null;
      if (id && G.evolve.canEvolve()) G.evolve.start(id);
    },

    // ───────── 世界地圖 ─────────
    r_worldmap() {
      return this.frame('世界地圖　星楓大陸', '<div class="wm"><canvas class="worldmap-canvas" width="' + G.worldMap.W + '" height="' + G.worldMap.H + '"></canvas><div class="wm-info"></div><div class="wm-legend"><span class="c camp">⌂</span>營地<span class="c hunt"></span>狩獵場<span class="c boss">★</span>Boss<span class="c done">★</span>已打倒<span class="c unk">?</span>還沒去過</div></div>', 'worldmap');
    },

    // ───────── 形態切換 ─────────
    r_forms() {
      const P = G.player;
      const FS = G.formSwitch;
      const opts = FS.options(P);
      const voice = G.evolve.canEvolve() ? '<div class="evo-voice"><button class="primary evolve-btn" data-act="hearVoice">✦ 聆聽內心的聲音（' + ['一', '二', '三', '四'][G.evolve.nextTier() - 1] + '轉進化）</button></div>' : '';
      let h;
      if (!opts.length) {
        h = voice + '<div class="evo-intro">Lv10 第一次進化之後，就可以在三種形態之間自由切換。<br>每種形態有自己的技能頁：技能等級、技能點、技能欄都分開保存，升級拿到的技能點三頁都會加。</div>';
        return this.frame('切換形態', h, 'evolve');
      }
      const why = FS.canSwitch(P);
      h = voice + '<div class="evo-intro">三種形態隨時可以切換（冷卻 ' + FS.COOLDOWN + ' 秒）。每種形態有自己的技能頁，升級拿到的技能點三頁都會加。' + (why && why.indexOf('等') >= 0 ? '<br><b>' + why + '</b>' : '') + '</div><div class="evo-cards">';
      opts.forEach((id) => {
        const f = G.data.forms[id];
        const line = G.data.lines[f.line];
        const cur = id === P.form;
        const page = P.pages && P.pages[f.line];
        const learned = page ? Object.keys(page.skills).filter((k) => page.skills[k] > 0 && G.data.skills[k] && G.data.skills[k].form !== 'base').length : 0;
        h += '<div class="evo-card' + (cur ? ' picked' : '') + '"><canvas class="evo-preview" data-form="' + id + '" width="220" height="170"></canvas>' +
          '<div class="evo-name">' + f.name + '</div><div class="evo-line">' + line.name + '路線 · ' + line.role + '</div>' +
          '<div class="evo-style">' + line.desc + '</div>' +
          '<div class="evo-desc">已學技能 ' + learned + ' 個 · 剩餘技能點 ' + (page ? page.sp : P.sp) + '</div>' +
          (cur ? '<button disabled>目前的形態</button>' : '<button class="primary" data-act="switchForm" data-arg="' + id + '">切換成' + f.name + '</button>') + '</div>';
      });
      h += '</div>';
      return this.frame('切換形態', h, 'evolve');
    },
    a_hearVoice() {
      this.closeAll();
      G.cut.startVoice(G.evolve.nextTier());
    },
    a_switchForm(id) {
      if (G.formSwitch.switchTo(G.player, id)) this.close('forms');
      return 'keep';
    },

    // ───────── 死亡 ─────────
    r_death() {
      return '<div class="panel death"><div class="body"><div class="big">小獅子倒下了……</div><div class="dim">沒有任何損失。會在營地醒來，HP 與 MP 全滿。</div><button class="primary" data-act="revive">在營地復活</button></div></div>';
    },
    a_revive() {
      this.close('death');
      G.world.respawnPlayer();
    },

    // ───────── M1 結尾 ─────────
    r_m1end() {
      const ch = this.endChapter || 1;
      const s = G.data.story.chapters[ch].end || G.data.story.m1End;
      return '<div class="panel ending"><div class="body"><img class="leaf" src="' + G.art.iconURL('starleaf', G.story.leafDef(ch).color) + '"><div class="big">' + s.title + '</div><div class="txt">' + esc(s.text).replace(/\n/g, '<br>') + '</div><div class="dim">遊玩時間 ' + U.fmtTime(G.player.playTime) + ' · Lv.' + G.player.level + '</div><button class="primary" data-act="close">繼續冒險</button></div></div>';
    },
  });

  // 對話頭像：開視窗後把 NPC 畫進小 canvas
  const obs = new MutationObserver(() => {
    document.querySelectorAll('canvas.evo-preview:not([data-done])').forEach((c) => {
      c.setAttribute('data-done', '1');
      const form = c.getAttribute('data-form');
      const ctx = c.getContext('2d');
      let t = 0;
      const tick = () => {
        if (!c.isConnected) return;
        t += 1 / 30;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.save();
        ctx.translate(110, 150);
        ctx.scale(1.7, 1.7);
        G.art.drawLion(ctx, 0, 0, 1, { state: 'idle', t, p: 0, onGround: true, form });
        ctx.restore();
        setTimeout(tick, 33);
      };
      tick();
    });
    document.querySelectorAll('canvas.portrait:not([data-done])').forEach((c) => {
      c.setAttribute('data-done', '1');
      const ctx = c.getContext('2d');
      const npc = G.data.npcs[c.getAttribute('data-npc')];
      ctx.translate(60, 100);
      ctx.scale(1.3, 1.3);
      G.art.drawNpc(ctx, { def: npc, x: 0, y: 0 }, 0, null, true);
    });
  });
  window.addEventListener('DOMContentLoaded', () => obs.observe(document.getElementById('ui'), { childList: true, subtree: true }));
})();
