// 第四章、終章的人物弧線（v3，照 docs/STORY.md），以及舊 NPC 在第四章之後、結局之後的台詞。在 js/data/npcstory.js 之後載入。
// 格式同 npcstory.js：符合條件的最後一組會被使用；同一組裡隨機挑一頁。
// talk 的 level 條件不會被 rebalance.js 換算，這裡直接用新的等級帶（第四章 30–40、終章 40–50）。
//
// 寫法（劇情聖經第 0 節）：每組最多 2 頁、每頁最多 2 行、每行不超過 20 個全形字。
// 真相靠畫面；台詞只補一刀，不解釋、不說教、不替玩家下結論。
//   第四章：霜靈讓整座山不付——沒有人老，也沒有孩子出生。FROST 之後，時間又走了：有人鬆口氣，有人開始老。
//   終章：灰鬃帶你去找雲鬃；雲鬃的靈點破進化的力量是誰的（q75 完成、五轉）；老陸龜說天上的立場（兩句）；灰鬃要毀掉樹。
//   TIME 之後：葉子放回去了，灰鬃回到地上（地圖不再出現他）。有的營地讓你進門，有的不讓。
(function () {
  'use strict';
  const D = G.data;
  const N = D.npcs;
  const T = (cond, ...pages) => (cond ? { if: Object.assign({ all: true }, cond), text: pages } : { text: pages });
  const set = (id, arr) => N[id] && (N[id].talk = arr);
  const add = (id, arr) => N[id] && (N[id].talk = (N[id].talk || []).concat(arr));
  const FROST = 'frostSpiritDefeated';
  const TIME = 'timeItselfDefeated';

  // 打倒時間之後，灰鬃走下階梯回到地上，哪裡都不該再看到他（4-3、5-1 在 maps45.js 已處理，這裡補 3-3）。
  const m33 = D.maps && D.maps['3-3'];
  ((m33 && m33.npcs) || []).forEach((n) => {
    if (n.id === 'greymane' && !n.noFlag) n.noFlag = TIME;
  });

  // ═════════ 第四章 霜鈴雪峰：停住的山 ═════════
  // 狐狸巫女：神社的紀錄在她手上。只說一兩句，不解釋整套制度。
  set('foxmiko', [
    T(null,
      '你在找葉子吧。\n它在山頂，在霜靈身上。',
      '神社三年沒辦過滿月禮了。\n山上，沒有孩子出生。'),
    T({ active: 'q67' },
      '霜靈沒有瘋。\n他只是不肯再付了。'),
    T({ flag: FROST },
      '神社的紀錄，每一百年都寫同一句：\n「今年，又多收了一點。」'),
  ]);
  // 犛牛長老：雜貨舖。FROST 之後，他開始老了。
  set('yakelder', [
    T(null,
      '要上山？先把東西帶夠。\n這座山不會因為你是守葉獸就客氣。'),
    T({ done: 'q61' },
      '鼓修好了。昨晚敲了一下，\n山上的鐘，三年來第一次回了一聲。'),
    T({ flag: FROST },
      '三年，一歲也沒老。\n今天早上，膝蓋又開始痛了。哞。'),
  ]);
  // 雪兔小孩：在等上山的哥哥。哥哥回來了，老了三歲。
  set('harekid', [
    T(null,
      '我在等哥哥。他上山去看神鐘。\n他走了以後，雪就沒停過。'),
    T({ flag: FROST },
      '哥哥回來了。比我記得的高，也比較老。\n他說他只睡了一下下。'),
  ]);
  // 土撥鼠獵人：第一個看出時間被凍住。FROST 之後，欠的一口氣追回來。
  set('marmot', [
    T(null,
      '噓。我在這裡等春天，\n等了三個冬天。'),
    T({ done: 'q62' },
      '三年前的腳印，現在還在。\n不是天冷。是時間不走了。'),
    T({ flag: FROST },
      '那排松樹三年沒長一點。\n今天一口氣，黃了一半。'),
  ]);
  // 雪豹劍士：搭檔死在霜靈的暴風雪裡。
  set('snowleopard', [
    T(null,
      '別靠太近。我在等霜靈再出來一次。\n上一次，搭檔沒回來。'),
    T({ flag: FROST },
      '搭檔的墳，三年沒長草。\n今天長出來了。'),
  ]);
  // 丹頂鶴：旅行醫者。三年沒有接生過。
  set('crane', [
    T(null,
      '受傷了嗎？我這裡有藥。\n這三年，我只治傷，沒接生過。'),
    T({ flag: FROST },
      '這個月，一口氣來了四個孩子。\n我的手，還記得怎麼接。'),
  ]);
  // 白角鹿：被凍在冰裡三年。只在第四章 Boss 之後出現。
  set('whitedeer', [
    T(null,
      '我記得的她，還沒有這麼高。\n……她一個人，長大了。'),
  ]);

  // ═════════ 終章 時空間神殿 ═════════
  // 老陸龜賢者：天上的聲音。平靜、誠實、不道歉。
  set('tortoisesage', [
    T(null,
      '回來了啊。又是一百年。\n神殿，又沉了一點。'),
    // 終章前半：營地的委託（王座的封印）要等雲鬃的傳承之後
    T({ noFlag: 'apexBlessing' },
      '庭園裡，有人在等你。\n回來以後，再來找我。'),
    T({ done: 'q75' },
      '時鐘要的，比樹收的少。\n多的那一份，讓神殿浮著，也長出了你。'),
    T({ active: 'q77' },
      '樹倒了，就沒有人照顧時鐘。\n去吧。'),
    T({ flag: TIME },
      '樹又轉了。\n下一個百年，它會要得更多。'),
  ]);
  // 斯芬克斯貓：一個關於「誰來決定」的謎題。
  set('sphinxcat', [
    T(null,
      '買東西嗎？\n謎題不收錢，喵。'),
    T({ noFlag: 'apexBlessing' },
      '王座的門還封著。\n先去庭園，回來再說。'),
    T({ done: 'q73' },
      '最後一題：春天的價錢，\n是誰定的？'),
  ]);
  // 雲鬃的靈（5-3 倒轉庭園）：一百年前的雲鬃，還沒下山。
  set('cloudmane', [
    T(null,
      '這裡的時間倒著走。\n對我來說，現在是一百年前。',
      '葉子是從地上收回來的。\n我還沒下去看過，是誰的。'),
    T({ done: 'q75' },
      '明天，我就下山了。'),
  ]);

  // ═════════ 灰鬃：地上的聲音 ═════════
  // 支持過霜靈；打倒霜靈後只說一句。終戰前要毀掉樹。TIME 之後他回到地上，地圖不再出現，沒有台詞。
  add('greymane', [
    T({ flag: 'lavaTortoiseDefeated', level: 32 },
      '霜靈讓這座山不付了。\n別去碰他。',
      '山上沒有人老。\n你看，行得通。'),
    T({ flag: FROST },
      '他至少試過。'),
    // 終章前半：一路帶你去找雲鬃（q78 → q79），五轉之後回到營地
    T({ active: 'q78' },
      '走快點。\n他在庭園，不會等太久。'),
    T({ done: 'q79', noFlag: 'apexBlessing' },
      '就是他。上一隻獅子。\n去問他。'),
    T({ flag: 'apexBlessing' },
      '變強了啊。\n……跟他一模一樣。'),
    T({ active: 'q77' },
      '我要把那棵樹毀掉。\n天上，不准再拿。',
      '時鐘停了會怎樣？\n至少，不再是我們付。'),
  ]);

  // ═════════ 舊 NPC ═════════
  // FROST：只留跟雪山有關的人。
  add('squirrel', [
    T({ flag: FROST },
      '地上托我帶給你的話，\n有一半不好聽。'),
  ]);
  add('fawn', [
    T({ flag: FROST },
      '媽媽伸手摸我的頭，停在半空。\n我長太高了。'),
  ]);
  // TIME：有的營地讓你進門，有的不讓。一人一句，不寫原諒。
  add('hedgehog', [
    T({ flag: TIME },
      '椅子我沒收。茶，每天換一杯新的。'),
  ]);
  add('mushgirl', [
    T({ flag: TIME },
      '花還是謝得早。……進來坐吧。'),
  ]);
  add('seal', [
    T({ flag: TIME },
      '燈塔的門，今天不開。'),
  ]);
  add('oldmonkey', [
    T({ flag: TIME },
      '溫泉還是涼的。門沒鎖，自己進來。'),
  ]);
  add('redpanda', [
    T({ flag: TIME },
      '饅頭賣完了。……明天也是。'),
  ]);

  // Boss 經驗（Boss 資料在 progression.js 之後才載入，這裡補上：各章升級所需的 10%）
  const B = D.balance;
  const need = (r) => {
    let s = 0;
    for (let l = B.bands[r][0] - 1; l < B.bands[r][1]; l++) s += B.expToNext(Math.max(1, l));
    return s;
  };
  if (D.monsters.frostSpirit) D.monsters.frostSpirit.exp = Math.round(need(4) * B.bossShare);
  if (D.monsters.timeItself) D.monsters.timeItself.exp = Math.round(need(5) * B.bossShare);
})();
