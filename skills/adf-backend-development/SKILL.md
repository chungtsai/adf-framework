---
name: adf-backend-development
description: 依已核准的 design.md 與 BR/VAL/Q Rules 實作後端程式碼（Service、API、DAO/SQL、交易、錯誤處理）。在 Module 的 Design 已經 Human 核准且需要寫後端程式時使用；需求、Rule 或 Design 尚未核准時改用 adf-develop 判斷下一步，前端實作改用 adf-frontend-development。
---

# ADF Backend Development

## 目的
實作已核准的 BR/VAL/Q、安全、交易與錯誤語意；不得在 Coding 階段自行重新定義 Requirement 或 Rule。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 輸入

| Artifact | 最低狀態 | 缺少或未達狀態時 |
|---|---|---|
| `manifest.yaml` | 有 Active Work Item | 停止，改用 `adf-feature-init` 或 `adf-develop` |
| `design/design.md` | Design Review 為 `APPROVED`（Human 已確認） | 停止，回報需先完成 `adf-development-design` |
| `spec/rules.md` | 本次相關 `BR-*`、`VAL-*`、`Q-*` 已核准 | 停止，回報需先完成 Rule Review |
| `spec/standards.md` | 已列出適用 `DEV-*`（MIGRATION 另含 `MIG-*`） | 停止，改用 `adf-standards-applicability` |
| 專案 `standards/` | 讀取適用 Standards 原文 | — |
| 既有程式碼 | CHANGE / MIGRATION 時讀取受影響範圍 | — |

## 步驟
1. **確認範圍**：從 `design.md` 的 `Backend`、`API`、`Database`、`Security`、`Validation and Error Handling` 章節，列出本次要實作的元件，以及每個元件對應的 `BR-*`、`VAL-*`、`Q-*`、`DEV-*`。設計沒有提到的元件不要動。
2. **檢查缺口**：Design 與 Rule 之間有矛盾、或有實作必須的決定在 Design 中找不到時，不要自行決定。以 Evidence-Guided Q&A 提問，並暫停該元件的實作。
3. **實作**：依 Design 實作；交易邊界、錯誤碼、權限檢查與 Null/Empty、日期處理要符合對應 Rule 與 Standard。
   - CHANGE：只修改受影響範圍，保留 manifest `behavior.preserve` 列出的行為。
   - MIGRATION：保留 Legacy Business Semantics；只有已核准的 `MIG-*` 能改變表示方式。
4. **自我檢查**：逐一對照第 1 步的清單，確認每個 `BR-*`、`VAL-*`、`Q-*` 都已實作；跑專案既有的編譯與單元測試。
5. **更新紀錄**：更新 `design.md` 的 `Traceability` 章節（元件 ↔ Rule ↔ 程式位置），把 manifest `status.development.backend` 改為 `done`。

## 輸出
- 後端程式碼變更（只限第 1 步列出的範圍）。
- `design/design.md` 的 `Traceability` 章節：每個 Rule 對應的類別、方法或 SQL 位置。
- `manifest.yaml`：`status.development.backend: done`；有未解決問題時寫入 `blockers` 並維持 `pending`。

## 完成條件
- 第 1 步清單中的每個 `BR-*`、`VAL-*`、`Q-*` 都有對應的實作位置。
- 沒有修改 Design 範圍以外的檔案；若有必要的連帶修改，已在回覆中列出原因。
- 專案既有編譯與單元測試通過。
- 沒有 `OPEN` 狀態的 HIGH Risk 問題。

## 禁止事項
- 不得新增、刪除或改寫 Requirement、Rule、Design；需要變更時回到對應 Stage。
- 不得順手重構、改格式或升級相依套件。
- 不得為了讓測試通過而修改既有測試的 Expected Result。
- Coding 過程不要每個檔案都詢問 Human 是否完成；只在第 2 步的缺口出現時提問。

## 範例
輸入：`design.md` 的 Backend 章節要求 `AccountService.disable()` 實作 `BR-003`（狀態 `D` 不可修改）與 `VAL-002`（停用原因必填）。

輸出：
- `AccountService.disable()` 檢查 `status == 'D'` 時拋出 `ACCOUNT_DISABLED`，並驗證 reason 非空。
- `design.md` Traceability 新增：`BR-003 → AccountService.disable() L42`、`VAL-002 → AccountService.disable() L38`。
- manifest：`status.development.backend: done`。
