---
id: DEV-REVIEW-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 程式碼審查：實作完成後審查尚未 commit 的變更

## 目的
實作完成、提交（commit）之前，針對本次尚未 commit 的程式差異逐項審查，確認符合核准的 Design、Rule 與專案規範；問題在進入版本庫之前修正，而且每個發現都能追溯到規則 ID。

## 規則
- **DEV-REVIEW-001-R1 時機與範圍**：每次實作（Backend、Frontend、修正）完成、commit 之前執行。審查範圍是工作目錄中尚未 commit 的全部變更，包含已修改、已暫存（staged）與新增未追蹤的檔案：
  - `git status --porcelain`：列出全部變更檔案。
  - `git diff HEAD`：已修改與已暫存的差異。
  - `git ls-files --others --exclude-standard`：新增、尚未追蹤的檔案（整份審查）。
  沒有任何變更時記錄「無變更」並結束，不得改審查已 commit 的歷史。
- **DEV-REVIEW-001-R2 審查依據**：以本次 Module 的 `design/design.md`（範圍與元件）、`spec/rules.md`（`BR-*`、`VAL-*`、`Q-*`）與 `spec/standards.md` 列出的適用規範為準；規範內容讀取專案 `standards/` 原文。`DRAFT` 規範只提示、不判定 `BLOCKER`。
- **DEV-REVIEW-001-R3 必查項目**：逐檔對照下列檢核表，每一項標示「通過／發現／不適用」：
  1. **範圍**：只修改 Design 列出的元件；範圍外的變更有說明原因，沒有順手重構、改格式或升級相依套件。
  2. **規則落實**：每個相關 `BR-*`、`VAL-*`、`Q-*` 都有實作位置，行為與規則一致（含邊界值、Null／空值、錯誤碼）。
  3. **安全性**：符合適用的 `DEV-SEC-*`（SQL 參數綁定、權限與資料範圍、輸入驗證、輸出編碼、機密不寫在程式中等）。
  4. **錯誤處理與交易**：例外不被吞掉、錯誤訊息不洩漏系統細節、交易邊界與 Design 一致。
  5. **測試**：新增或修改的行為有對應測試；沒有為了讓測試通過而修改既有測試的 Expected Result；專案既有編譯與測試通過。
  6. **日誌與除錯殘留**：日誌不含密碼、Token、完整個資；沒有遺留的除錯輸出、註解掉的程式碼、寫死的測試資料或沒有追蹤編號的 `TODO`。
  7. **可讀性與重複**：命名能表達用途；沒有複製貼上的重複邏輯；專案有安裝 `DEV-SOLID-001` 時依其規則檢查設計。
- **DEV-REVIEW-001-R4 發現分級**：每個發現給一個嚴重度：
  - `BLOCKER`：違反已核准的 `DEV-SEC-*` 或 Business Rule、可能造成資料錯誤或遺失、編譯或既有測試失敗、修改 Design 範圍外的行為。
  - `MAJOR`：缺少對應測試、錯誤處理不完整、違反已核准的非安全性規範（含 `DEV-SOLID-001`）、明顯的重複或難以維護的設計。
  - `MINOR`：命名、註解、排版等不影響行為的建議。
- **DEV-REVIEW-001-R5 發現的紀錄格式**：每個發現有編號 `CR-<序號>`，並記錄嚴重度、`檔案:行號`、違反的規則 ID（`DEV-*`、`BR-*` 等；沒有對應規則時寫「一般」）、問題說明與建議修正方式。
- **DEV-REVIEW-001-R6 處理方式**：`BLOCKER` 必須修正後才能 commit；`MAJOR` 必須修正，或由 Human 核准為例外並記錄理由；`MINOR` 可以選擇修正。未解決的 `BLOCKER`、`MAJOR` 寫入 Module `manifest.yaml` 的 `blockers`，不得進入 `adf-development-complete`。
- **DEV-REVIEW-001-R7 修正後重審**：修正後重新取得差異，只針對修正的部分與受影響的檔案再審一次，並重跑編譯與測試；結果全部是「通過」或已核准的例外才算完成。
- **DEV-REVIEW-001-R8 不擴大範圍**：審查時看到差異以外的既有問題，只記為 Finding（不修改），由 Human 決定是否另開 `CHANGE`、`REFACTOR` 或 `SECURITY_FIX`。
- **DEV-REVIEW-001-R9 審查不等於核准**：AI 執行的審查是自我檢查，不能取代 Human Approval；不得自行把 `MAJOR` 標為例外，也不得自行 commit。

## 範例
```text
審查範圍：git diff HEAD（3 個檔案）＋ 新增未追蹤 1 個檔案
| 編號  | 嚴重度  | 位置                          | 規則              | 說明                                     | 建議修正                         |
|-------|---------|-------------------------------|-------------------|------------------------------------------|----------------------------------|
| CR-1  | BLOCKER | AccountMapper.xml:42          | DEV-SEC-SQL-001   | ORDER BY 使用 ${sort}                     | 改用排序欄位白名單               |
| CR-2  | MAJOR   | AccountService.java:88        | VAL-002           | 停用原因只有前端檢查，後端沒有驗證       | 後端加入必填檢查並補測試         |
| CR-3  | MAJOR   | AccountService.java:120-210   | DEV-SOLID-001-R1  | 同一方法處理查詢、Excel 產生與寄信       | 拆出 AccountExporter、Mailer     |
| CR-4  | MINOR   | AccountController.java:15     | 一般              | 變數名稱 tmp 無法看出用途                | 改為 disableReason               |
結論：BLOCKER 1、MAJOR 2、MINOR 1 → 修正 CR-1～CR-3 後重審，不得 commit。
```

## 移轉專案
MIGRATION 的審查另確認 Legacy Business Semantics 沒有被改變，只有已核准的 `MIG-*` 改變表示方式；Legacy 原有的設計問題不以「與舊系統一致」為理由把弱點帶入新程式（依 `MIG-SEC-001`），但非安全性的設計問題不在移轉中自行重構，記為 Finding。

## 驗證方式
- 刻意在未 commit 的變更中放入一個 SQL 串接與一個未驗證的必填欄位：審查結果分別列為 `BLOCKER` 與 `MAJOR`，並標示正確的 `檔案:行號` 與規則 ID。
- 新增一個未追蹤的檔案：該檔案出現在審查範圍中。
- 工作目錄沒有變更：審查結果為「無變更」，不審查既有歷史。
- 修正後重審：前次發現全部變為「通過」或已核准的例外，編譯與測試通過。
- 有未解決的 `BLOCKER`／`MAJOR` 時，`manifest.yaml` 的 `blockers` 有對應紀錄，`adf-development-complete` 不予結案。
