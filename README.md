# 小獅子的冒險

一款經典楓之谷風格的橫向動作 RPG。主角是一隻會進化的小獅子，從森林一路往上爬，回到天空上的家。

純 HTML + JavaScript，不需要建置步驟，所有美術和音效都用程式即時產生。完整設計見 [DESIGN.md](DESIGN.md)。

## 目前版本：M1 試玩版

- 區域 1「苔光森林」的 5 張地圖：營地、2 張狩獵圖、1 張探索圖、Boss 殿堂
- 9 種怪物（3 個系列 × 3 階）與 Boss「菇菇女王」
- 菁英怪、1% 閃光怪、隱藏寶箱
- 4 個任務、商店、裝備稀有度與隨機數值
- 技能點、自訂技能欄、自由改鍵
- 自動存檔

一轉進化、區域 2 以後的內容在之後的里程碑。

## 怎麼玩

直接用瀏覽器打開 `index.html` 就能玩；或是部署到 GitHub Pages。

| 按鍵（預設） | 功能 |
|---|---|
| ← → | 移動 |
| ↑ | 爬繩、進傳送門、和 NPC 對話、開寶箱 |
| ↓ + C | 從平台往下跳 |
| C | 跳躍 |
| X | 普通攻擊 |
| A S D F Q W | 技能欄 |
| 1 / 2 | HP / MP 藥水 |
| I / K / J | 背包 / 技能 / 任務 |
| Esc | 選單（可以改鍵） |

## 部署到 GitHub Pages

1. 把程式合併到 `main` 分支。
2. repo 的 Settings → Pages → Build and deployment：Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，按 Save。
3. 約一分鐘後網址會是 `https://<帳號>.github.io/<repo 名稱>/`。

## 調整與除錯

- 網址後面加上 `?debug=1` 會出現除錯面板：設定等級、傳送地圖、無敵、顯示碰撞框。
- 所有數值都在 `js/data/`：
  - `balance.js`：移動手感、打擊感、經驗曲線、怪物強度
  - `monsters.js`、`maps.js`、`items.js`、`skills.js`、`quests.js`、`dialogue.js`

## 檔案結構

```
index.html
css/style.css
js/engine/   輸入與改鍵、合成音效、特效
js/data/     所有數值與文字
js/art/      主角、怪物、NPC、道具、背景的繪圖程式
js/game/     物理、玩家、戰鬥、怪物 AI、Boss、掉寶、任務、地圖、存檔
js/ui/       HUD、視窗、標題與開場、除錯面板
js/main.js   進入點
```
