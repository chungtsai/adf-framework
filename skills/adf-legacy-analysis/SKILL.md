---
name: adf-legacy-analysis
description: 從 Legacy 原始碼（JSP、Servlet、Service、DAO、SQL、設定檔）追出實際行為，建立有證據位置的 Legacy 行為清單（LB-*）。用於 MIGRATION 或 RETROFIT_VERIFY 的分析階段，以及既有 Module 補填行為清單。分析現行 Target 程式改用 adf-target-analysis；把行為整理成 BR-*／VAL-*／Q-*／UI-* 改用 adf-business-rule、adf-query-analysis、adf-screen-specification。
---

# ADF Legacy Analysis

## 目的
移轉最常見的錯誤不是寫錯，而是漏掉：Trigger、共用 Util、吞掉的例外、隱含排序等 Legacy 行為沒被發現，就不會有規則與測試。本 Stage 以固定必查清單逐入口追到底，產出有證據位置的 Legacy 行為清單，作為後續規則、測試與比對涵蓋率的分母。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 輸入

| 來源 | 最低要求 | 缺少時 |
|---|---|---|
| `manifest.yaml` | Active Work Item 的 `type` 為 `MIGRATION`（一般 Migration，或 `intents` 含 `RETROFIT_VERIFY`） | 停止，改用 `adf-migrate`、`adf-retrofit-verification` 或 `adf-feature-init` |
| Legacy 入口 | 使用者指定的畫面、URL、Action 或批次名稱 | 停止並詢問；不自行擴大範圍 |
| Legacy 原始碼 | 入口到 DAO／SQL 的程式與設定檔（XML、properties） | 可讀到的部分照常分析，讀不到的列入「無法取得清單」 |
| DB 物件 | Table、Trigger、Stored Procedure、Sequence、View 定義 | 列入「無法取得清單」，相關行為標 `UNKNOWN` |
| 既有 `analysis/legacy-behavior.md` | 補填或續做時讀取 | 不存在時以 `template/analysis/legacy-behavior.md` 建立 |

## 步驟
1. **列入口**：依使用者指定範圍列出所有入口（畫面、按鈕、Action、URL、批次），寫入行為清單的「入口」表。範圍外的入口不分析。
2. **追呼叫鏈**：每個入口依序追到最終 SQL 或副作用：JSP／JS → Filter／Interceptor → Servlet／Action → Service → DAO → SQL；中途讀取設定檔與被呼叫的共用 Util。追不下去的位置（只有 jar、程式由外部提供、動態反射）記入「無法取得清單」，並說明影響哪些入口。
3. **逐類盤點**：每個入口對下列 8 類逐一標記 `已檢查`、`不適用` 或 `無法取得`，不得留空：
   - **輸入與驗證**：前端 JS 驗證、後端驗證、隱藏欄位、預設值、長度與格式。
   - **分支**：依角色、狀態、代碼、參數的 if／switch，例外流程與提早 return。
   - **查詢**：動態組 SQL 的條件組合、`LIKE` 寫法、預設排序、分頁、筆數上限、空條件行為。
   - **交易**：commit／rollback 邊界、部分失敗時已寫入的資料、批次中途失敗。
   - **副作用**：DB Trigger、Stored Procedure、Sequence、寄信、寫檔、寫 Log 或稽核表、呼叫外部系統。
   - **錯誤處理**：catch 後吞掉或改寫的例外、錯誤碼、畫面錯誤訊息文字。
   - **權限**：Session 檢查、選單或按鈕控制、資料範圍（部門、分行等）限制。
   - **隱含行為**：Null 與空字串互轉、民國年、四捨五入與精度、編碼、時區、共用 Util 的轉換。
4. **登錄行為**：每項行為寫成一列 `LB-*`，包含入口、類別、行為描述、證據位置（`檔案:行號`）、確定度與風險：
   - 風險 `HIGH`：類別為交易、權限、副作用，或行為涉及金額、數量計算，或使用者指定；其他為 `NORMAL`。`adf-result-comparison` 以此計算高風險涵蓋率。
   - `CONFIRMED`：程式碼直接證明。
   - `UNKNOWN`：只能由命名、註解或慣例推測，或依賴「無法取得清單」中的來源。
   安全弱點（SQL 串接、未檢查權限等）照實登錄並另標 Finding，交給 `MIG-SEC-001` 處理，不在本 Stage 修正。
5. **提問**：把所有 `UNKNOWN` 與「無法取得清單」整理成 Evidence-Guided Q&A 問題，附上已讀到的證據與候選答案。高風險（交易、權限、金額、副作用）逐題確認。
6. **交付審查**：問題清除後把 manifest `review.status` 設為 `READY_FOR_REVIEW`，送 Legacy Analysis Human Gate；Human 明確確認後才設為 `APPROVED`，並把 `status.analysis` 改為 `done`。

## 輸出
- `analysis/legacy-behavior.md`：入口表、8 類盤點表、`LB-*` 行為清單、無法取得清單、Finding。
- Evidence-Guided Q&A 問題（`REV-Q-*`）與 manifest `review`、`blockers` 更新。
- manifest `review.status`：`QUESTIONS_PENDING`／`READY_FOR_REVIEW`／`APPROVED`；Human 確認後 `status.analysis: done`，有未解問題維持 `pending` 並寫入 `blockers`。

## 完成條件
- 每個入口都追到最終 SQL 或副作用，或已列入無法取得清單並說明影響。
- 每個入口的 8 類盤點都有狀態，沒有空白。
- 每個 `LB-*` 都有證據位置；`CONFIRMED` 的證據必須是程式碼，不是註解或命名。
- 所有 `UNKNOWN` 都有對應問題，高風險問題沒有 `OPEN`。
- Legacy Analysis Human Gate 已明確確認。

## 禁止事項
- 不得讀 Target 程式來推論 Legacy 行為，也不得用 Target 的結果補 Legacy 證據。
- 不得把註解、方法名稱或「通常會這樣」當成 `CONFIRMED` 的證據。
- 不得修正、美化或省略 Legacy 的錯誤行為；照實登錄，是否改變由 `MIG-*` 與 Human 決定。
- 不得因為無法取得來源就省略該類別；必須標 `無法取得` 並列入清單。
- 本 Stage 不產生 `BR-*`、`VAL-*`、`Q-*`、`UI-*` 定稿，也不寫 Expected Result。

## 既有 Module 補填
v5.4.0 之前建立的 MIGRATION／RETROFIT_VERIFY Module 沒有 `analysis/legacy-behavior.md` 時：
1. 進行中的 Module 在目前 Work Item 內補填；已完成的 Module 開 `CHANGE` 只補文件，不修改程式與已核准的規則。
2. 先讀既有 Legacy Evidence、`spec/rules.md`、`verification/test-cases.md`，把已記錄的行為轉成 `LB-*`，證據位置沿用原紀錄；原紀錄沒有位置的，回 Legacy 原始碼補上，補不到標 `UNKNOWN`。
3. 再依步驟 3 對每個入口補做 8 類盤點，新發現的行為標 `REVIEW_REQUIRED`；v5.4.0 建立的清單沒有 `風險` 欄時，依步驟 4 補上。
4. 新發現的行為若尚無對應規則，回到最早受影響的 Stage（通常是 Rules），不撤銷其他已核准 Stage；已完成的 Module 經 Human 確認後另開 `CHANGE` 處理。

## 範例
輸入：移轉【帳號查詢】，入口 `query.jsp` 的「查詢」按鈕。

輸出（`analysis/legacy-behavior.md` 節錄）：

| ID | 入口 | 類別 | 行為 | 證據位置 | 確定度 | 風險 |
|---|---|---|---|---|---|---|
| LB-001 | 查詢 | 查詢 | 帳號名稱以 `LIKE '%'+name+'%'` 查詢，空白時不加條件 | `AccountDao.java:88` | CONFIRMED | NORMAL |
| LB-002 | 查詢 | 查詢 | 未指定排序時依 `ACCT_ID` 遞增 | `AccountDao.java:97` | CONFIRMED | NORMAL |
| LB-003 | 查詢 | 隱含行為 | `status` 為 Null 時畫面顯示「啟用」 | `AccountUtil.java:41` | CONFIRMED | NORMAL |
| LB-004 | 查詢 | 權限 | 只能查本部門帳號 | 只有註解「限本部門」，SQL 未見條件 | UNKNOWN → REV-Q-001 | HIGH |

`LB-001` 另標 Finding：SQL 串接（交給 `MIG-SEC-001`）。

## 本 Skill 官方資源
- `template/analysis/legacy-behavior.md` → `assets/legacy-behavior.md`。
