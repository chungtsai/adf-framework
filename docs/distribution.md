# 發佈與安裝

ADF 不發佈自己的 npm CLI。Skill 從 GitHub 正式 tag，統一使用 npx skills 在專案層級安裝。ZIP、clone、手動副本是舊來源，轉接後由 npx skills 管理。

官方資源只位於各 owner Skill 的 assets/references，來源清單在 adf-project-install/references/resources.json。沒有外部 base 包、install 目錄或專案範本副本。專案規範與文件不隨 Skill 更新。

全新專案可用 `scripts/install.sh` / `scripts/install.ps1` 一鍵完成 npx 安裝與 PLAN → APPLY → VERIFY（見 README「全新專案：一鍵安裝」）；這兩支是包裝既有指令的腳本，不是 npm CLI，遇到舊版痕跡會停止。已完成導入的專案可用 `scripts/update.sh` / `scripts/update.ps1` 一鍵更新（備份、npx 重新安裝、逐檔比對、VERIFY，失敗自動還原）。尚未導入的既有專案依 [完整 SOP](upgrades/5.0-to-5.1.md)。scripts/init.js 保留舊命令入口，但 v5.1 起只做唯讀盤點，不再複製資源；不要將它當成已完成安裝。

起始規範分為建議項目（安全性核心：SQL Injection、資料範圍、功能權限、分頁筆數上限、異動強制條件、檔案路徑與參數 Token、舊系統弱點修復、XSS、CSRF、登入與 Session、參數綁定、後端驗證、個資、上傳與匯出、機密、稽核、第三方元件）與選填項目（民國年→西元年、顯示一致／共用訊息、導向網址與 SSRF、XXE、指令注入、安全標頭、同時修改、頻率限制）。以 `scripts/standards.sh` / `scripts/standards.ps1` 寫入專案 `standards/`：建議項目預設全部安裝、以編號排除，選填項目以編號加入；內部執行 `project.mjs STANDARDS`（`--recommended`／`--exclude`／`--add`／`--select`／`--dry-run`）。只新增不覆蓋，需先完成 ADF 安裝；之後要加入其他項目，可在 Agent 中以提示詞請 `adf-standard-authoring` 加入（見 README「專案起始規範」）。
