# 發佈與安裝

ADF 不發佈自己的 npm CLI。Skill 從 GitHub 正式 tag，統一使用 npx skills 在專案層級安裝。ZIP、clone、手動副本是舊來源，轉接後由 npx skills 管理。

官方資源只位於各 owner Skill 的 assets/references，來源清單在 adf-project-install/references/resources.json。沒有外部 base 包、install 目錄或專案範本副本。專案規範與文件不隨 Skill 更新。

全新專案可用 `scripts/install.sh` / `scripts/install.ps1` 一鍵完成 npx 安裝與 PLAN → APPLY → VERIFY（見 README「全新專案：一鍵安裝」）；這兩支是包裝既有指令的腳本，不是 npm CLI，遇到舊版痕跡會停止。已完成導入的專案可用 `scripts/update.sh` / `scripts/update.ps1` 一鍵更新（備份、npx 重新安裝、逐檔比對、VERIFY，失敗自動還原）。尚未導入的既有專案依 [完整 SOP](upgrades/5.0-to-5.1.md)。scripts/init.js 保留舊命令入口，但 v5.1 起只做唯讀盤點，不再複製資源；不要將它當成已完成安裝。

起始規範（民國年→西元年、顯示一致／共用訊息、SQL Injection、資料範圍保護）以 `scripts/standards.sh` / `scripts/standards.ps1` 勾選寫入專案 `standards/`，內部執行 `project.mjs STANDARDS`；只新增不覆蓋，需先完成 ADF 安裝（見 README「專案起始規範」）。
