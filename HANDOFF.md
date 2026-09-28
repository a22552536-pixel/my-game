# 交接文件（任何新的 session 讀這份就能接手）

專案：「小獅子的冒險」，純 JS + Canvas 程序繪圖的楓之谷風 2D RPG。網站：https://a22552536-pixel.github.io/my-game/
開發分支 `claude/hopeful-ritchie-6ujjzn`；每完成一段（測過）就推兩邊：
`git push origin claude/hopeful-ritchie-6ujjzn && git push origin claude/hopeful-ritchie-6ujjzn:main`（使用者授權直接更新 main）。
設計總表在 DESIGN.md（第 28–30 節是最近的改動），劇本以 docs/STORY.md（v3）為準，怪物規格在 docs/SPEC-monsters.md。

## 使用者定案的方向
- 每章約 30 分鐘；等級帶（js/data/rebalance.js）：1–10、10–20、20–30、30–40、40–50，上限 50；每章 Boss 後進化（10/20/30/40），五轉在終章中段 Lv45（雲鬃）。
- 技能點：每級 1 點＋每次進化 1 點；每階技能剛好在下次進化時點滿。
- 第一章是入門章：沒有進化種，九隻都是外型不同的獨立生物。第四章以後用神話生物，不用一般動物。
- 野外魔王血量約為該章 Boss 的 30%；章節 Boss 要比野外魔王更有「大自然的宏偉感」。
- 不要有封技能的怪；沒有冷卻。
- 尺寸階梯：每隻章節 Boss 的畫面面積都要明顯大於每隻野外魔王（目前 Boss ≥ 205k px²、野外魔王 ≤ 127k）。改尺寸後用 scratchpad 的 sizes.js 量。
- 劇本：寫實、沒有對錯、單一中性結局、字越少越好，真相靠畫面（docs/STORY.md）。
- 美術：設計理念比關節多重要；概念要長在身上；要換整隻怪物時先給使用者 2–3 個概念選。
- 怪物＝自然物＋**劍與魔法的奇幻概念**（不要日常用品），概念變成行為；每章體型變大、概念更抽象（終章是時間、空間魔法）。
- 技能沒有冷卻；MP 消耗很低；快捷列 4 格＋Q/W 兩個五轉大招。
- 一般怪很少掉裝備（掉就是史詩以上）；平常裝備靠任務與商店；強化輕微花金幣；沒有裝備等級限制。
- 藥水：一般怪 3.5% 掉小瓶紅藍、精英 25%；倒下回營補到 3 紅 2 藍；Boss 戰不自然回血。
- 難度：使用者覺得偏難，第一章還會死 → 若再回報太難，優先降第一章怪物攻擊。
- 終章「時空間神殿」：最終 Boss 是「時間」本身；灰鬃當盟友；結局打破守葉獸變石頭的輪迴。

## 進度
- [x] 第一階段：等級帶、等級差經驗、經濟、4 格快捷列、觸控介面
- [x] 第二階段：第二、三章新怪物、Boss 重做（二階段）、NPC 劇情弧
- [x] 2.5：第二、三章怪物換成奇幻概念（行為不變，換美術、名字、材料名）— 見 docs/SPEC-monsters.md
- [x] 第三、四階段資料：第四章、終章的怪物／能力／地圖／NPC／委託／劇情／裝備／結局畫面（DESIGN.md 第 26 節）
- [x] Boss 霜靈、時間（含盟友灰鬃）、10 個背景主題、結局畫面——全部接上並測過
- [x] v1.3–1.5：等級重排、每章一個野外魔王委託、怪物特質（巨大/憤怒/幽靈/虛空/猥瑣/閃光/中毒/偽善）、第四章與終章換神話生物、NPC 對話重寫、第一章六隻新生物、背景/地形/傳送門/營地細節（DESIGN.md 第 28 節）
- [ ] 下一步：依使用者試玩回饋；已知效能大戶是第四章雪原（怪多），新增細節時先量 G.world.draw 時間

## 第四、五章的檔案規劃（新章節一律開新檔，避免和其他工作撞檔）
- 資料：js/data/mobs45.js（怪物）、js/data/maps45.js（地圖、營地、mapOrder）、js/data/story45.js（NPC、委託、章節文字、Boss 遺言）→ 都要在 index.html 裡 **progression.js 之前**載入（委託經驗依等級帶縮放）。
- 能力：js/game/mobabil2.js（掛到 G.mobAbil）
- 美術：js/art/monsters5.js（第四章怪）、monsters6.js（終章怪）、bosses3.js（霜靈、時間）、npcs3.js（新 NPC、營地建築）、背景主題直接加在 js/art/background.js 的 THEMES
- Boss 邏輯：js/game/boss3.js（BossKit，照 boss2.js）
- 音樂：music.js 已經有 'snow'、'sky' 曲子；CAMP_SONG 要補 4、5
- 其他串接：story chapters 4/5（dialogue.js）、evolve.js BOSSES、codex.js 清單、demo.js 章節清單、worldmap.js 座標、progression.js 的 bossLv 與商店 tier（7、8）、windows.js / loot.js 的獨特裝備對照

### 地圖
第四章（region 4）：4-1 霜鈴村（營地，theme snowCamp）、4-2 鈴風雪原（hunt, snowField）、4-3 冰瀑鈴道（explore, iceFall）、4-4 千鈴參道（hunt, bellShrine）、4-B 霜靈祭壇（boss, frostAltar）
終章（region 5）：5-1 神殿前庭（營地, templeCourt）、5-2 回憶迴廊（hunt, timeCorridor）、5-3 倒轉庭園（explore, reverseGarden）、5-4 星之階梯（hunt, starStair）、5-B 時之王座（boss, timeThrone）

### NPC（art id）
第四章：foxmiko 狐狸巫女（主線）、yakelder 犛牛長老（商店 tier 7）、harekid 雪兔小孩、squirrel（既有）、4-2 marmot 土撥鼠獵人、4-3 snowleopard 雪豹劍士、greymane（既有）、4-4 crane 丹頂鶴（商店 tier 8 前的補給）、4-B 事後 whitedeer 白角鹿（小鹿的媽媽）＋ fawn（既有）
終章：tortoisesage 老陸龜賢者（主線）、sphinxcat 斯芬克斯貓（商店 tier 8）、greymane、squirrel、5-3 cloudmane 雲鬃的靈（半透明金色獅子）

## 測試與發佈
- 本機：`python3 -m http.server 8765` 後用 Playwright 跑（scratchpad 裡有 tut4/epi/ch23/flow/mats/test2 等腳本；新 session 沒有的話自己寫：載入頁面、檢查 console 沒有錯誤、跑過地圖載入）。
- 語法檢查：`for f in js/*/*.js js/*.js; do node --check $f; done`
- commit 訊息不要寫模型名稱。

## 待辦（中斷後從這裡接著做）
- 配樂重做（背景工作進行中，只動 js/engine/music.js，筆記在 scratchpad/music/，還沒提交）：第四章雪原／霜鈴村新曲、終章神殿抽象莊嚴曲、五首章節 Boss 主題（時間分兩階段）＋野外魔王曲、第一二章換情緒、土地變老版本、結局時鐘停止靜音、戰鬥動態分層、曲長與音色提升。
- 試玩練功場切到第二～五章時地面還是舊版（ground.js 的 THEME_GROUND 只對應第一章），等使用者決定要不要補。
- 設計規則：主角線與章節 Boss 的原畫風是定案，不做風格升級；怪物大修用「舊版底子＋新結構」，不換材質語言。
