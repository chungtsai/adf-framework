---
name: adf-project-install
description: 導入 ADF v5.1、將 v5.0 手動或 clone 導入轉為專案層級 npx skills 管理；唯讀盤點、規劃、歸位、套用、驗證及回復。
---

# ADF Project Install

## 流程
1. 先讀 [移轉與資源政策](references/install-policy.md)。首次 npx 安裝前依 SOP 在外部保存手動 Skill 與未提交變更；本 Skill 未安裝前不可假設可以呼叫它。
2. 使用專案層級 `npx skills` 從選定正式 tag 安裝本版，明確選定 Agent。安裝前先比較同名 Skill；不要覆寫未保存的客製內容。
3. 執行 `node <本Skill>/scripts/project.mjs CHECK <project>`，只讀取。盤點專案 Skill、全域同名 Skill、舊範本及專案狀態。
4. 執行 `PLAN <project>`，將 JSON 輸出保存到專案外。提供新增、保留、待歸位、衝突及備份計畫，解決 blockers 後再重新 PLAN。
5. 經使用者選定具體計畫後執行 `APPLY <project> <plan.json>`。檔案有變動就停止；不覆寫規範、指引、Module 或核准狀態。
6. 執行 `VERIFY <project>`，確認資源完整、無版本混用、範本清理及保護資料未改變。失敗不可標示完成。
7. 需要回復時執行 `RESTORE <project> <backup-id>`；回復前檢查新異動，遇到衝突停止。還原 Skill 版本依外部安裝前備份與原始來源紀錄，腳本不修改安裝工具 lockfile。

## 歸位與限制
- 官方範本及 Review 唯一來源見 [資源清單](references/resources.json)。使用 `resolve <project> <resource-key>` 取得位置；本專案缺少來源或版本不相容時，提示 npx 安裝，不回退到全域，不跳過 Review。
- 不保留官方或客製範本副本。舊 `.adf/templates/` 原版可備份後移除；未知或客製內容先由 Human 確認必要資訊已歸入 `standards/` 或需求文件，留下來源與目的雜湊紀錄，不能直接刪除。
- 官方規範範例只供選用。保留 `standards/`、`modules/`、CLAUDE.md、AGENTS.md、完成狀態與核准紀錄。沒有標記版本的 v5.0 文件不是壞檔。
- 不建立 install/base、專案範本副本或 npm CLI；NEW 功能 Module 由 adf-feature-init 建立。
- 本工具只遷移專案設定與舊範本；客製 Skill、外部 framework 引用與舊 Skill 停用由盤點與 SOP 處理，未解決不得宣告完成。
