---
name: adf-result-comparison
description: 以程式逐欄比對 Legacy 與 Target 的正規化結果，依固定順序分類差異並回報 Legacy 行為涵蓋率。用於 MIGRATION 或 RETROFIT_VERIFY 在 adf-result-normalization 之後，以及既有 Module 補填比對報告。套用 MIG-* 轉換改用 adf-result-normalization；修正 Target 改走 adf-verification-fix 或另開 CHANGE。
---

# ADF Result Comparison

## 目的
比對最危險的錯誤是把不同判成 `PASS`：資料量一大，用看的一定會漏。本 Stage 由程式找出差異、由規則決定分類、由 Human 確認結果，並把 Legacy 行為清單中沒測到的部分明確列出，避免「全部通過」掩蓋涵蓋不足。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 輸入

| 來源 | 最低要求 | 缺少時 |
|---|---|---|
| Legacy Raw Result | `adf-legacy-baseline` 產出，含輸入、資料快照與執行時間 | 該案例判 `TEST_DATA_PROBLEM`；Legacy 無法執行時維持 `BLOCKED` |
| Target Raw Result | `adf-new-test` 以相同 `TC-*` 產出 | 該案例判 `TEST_DATA_PROBLEM` |
| 正規化結果 | `adf-result-normalization` 產出，記錄套用的 `MIG-*` | 停止，先執行 `adf-result-normalization` |
| `spec/standards.md` | 列出本 Module 適用且 `APPROVED` 的 `MIG-*` | 未核准的 `MIG-*` 視為不存在 |
| `analysis/legacy-behavior.md` | `LB-*` 清單（MIGRATION、RETROFIT_VERIFY 必要） | 停止，先執行 `adf-legacy-analysis`，或依「既有 Module 補填」處理 |
| `verification/test-cases.md` | `TC-*` 的 `Source` 可追到 `LB-*` 或規則 | 追不到的案例列入報告 |

## 步驟
1. **可比性檢查**：逐一確認每個 `TC-*` 兩邊使用相同輸入、相同資料快照、相同時間點與序號條件。不符的案例直接判 `TEST_DATA_PROBLEM`，不進入比對。
2. **程式比對**：產生並執行比對腳本，對正規化後的結果逐筆、逐欄比對（JSON、CSV 或 SQL 查詢結果）。腳本放在 `verification/compare/`，執行指令與輸出摘要寫入報告。只有單一畫面、少於 20 個欄位的結果可以人工比對，並在報告註明。
3. **比對面向**：除畫面或 API 回應外，也比對 DB 寫入結果（筆數與重要欄位）、錯誤路徑的錯誤碼與訊息、副作用（Trigger 結果、寄信、檔案、稽核紀錄）。行為清單中有的面向，案例沒有比對到的，列入涵蓋缺口。
4. **依序分類**：每筆差異由上往下套用，第一個成立的分類即為結果：
   1. 兩邊不可比 → `TEST_DATA_PROBLEM`
   2. 正規化後完全一致 → `PASS`
   3. 有 `APPROVED` 的 `MIG-*` 涵蓋，且該規則的適用條件成立 → `APPROVED_BEHAVIOR_CHANGE`
   4. 對應的 `LB-*` 確定度為 `UNKNOWN` → `LEGACY_UNKNOWN`
   5. 規格沒有定義這個行為 → `SPEC_GAP`
   6. 規格明確且 Target 不符 → `MIGRATION_DEFECT`
   7. 其他 → `REVIEW_REQUIRED`
   每筆差異記錄：`TC-*`、`LB-*`、欄位、Legacy 值、Target 值、分類、引用的 `MIG-*` 或規則。
5. **涵蓋率**：以 `LB-*` 為單位計算三個指標，寫入報告摘要，並列出未涵蓋的 `LB-*`：
   - **已比對**：至少一個連到該 `LB-*` 的 `TC-*`（`test-cases.md` 的 `Source`）有最終分類，且不是 `TEST_DATA_PROBLEM` 或 `REVIEW_REQUIRED`（含結果不穩定）。這兩種案例等於還沒驗證到，不計入。
   - **通過**：已比對，且連到該 `LB-*` 的已比對 `TC-*` 全部為 `PASS` 或 `APPROVED_BEHAVIOR_CHANGE`。
   - **高風險**：`analysis/legacy-behavior.md` 的 `風險` 為 `HIGH`。
   - 整體涵蓋率 = 已比對 `LB-*` ÷ `LB-*` 總數（`CONFIRMED` 與 `UNKNOWN` 都算在分母，另列 `UNKNOWN` 數量）。
   - 高風險涵蓋率 = 已比對的高風險 `LB-*` ÷ 高風險 `LB-*` 總數。
   - 通過率 = 通過的 `LB-*` ÷ 已比對 `LB-*`。
   每個指標都寫出分子與分母（例如 `18／24（75%）`），分母為 0 時寫 `不適用`，不寫 100%。未涵蓋的高風險 `LB-*` 標 `REVIEW_REQUIRED`。涵蓋只代表該行為至少有一個案例驗證過，不代表所有分支與資料組合都測過。
6. **結果不穩定**：同一案例重跑結果不同時，記錄每次結果並標 `REVIEW_REQUIRED`，不得取其中一次當作結果。
7. **交付審查**：寫入 `verification/comparison.md`，送 Result Comparison Human Gate。Human 確認分類後才把 manifest `status.verification.comparison` 改為 `done`；`MIGRATION_DEFECT` 交 `adf-verification-fix`，RETROFIT_VERIFY 經 Human 決定後另開 `CHANGE`。

## 輸出
- `verification/comparison.md`：比對摘要、差異清單、分類統計、涵蓋率與未涵蓋 `LB-*`、比對指令。
- `verification/compare/`：比對腳本（只讀取結果，不修改任何 Raw Result）。
- manifest：`status.verification.comparison`；未解的差異寫入 `blockers`。

## 完成條件
- 每個 `TC-*` 都有分類，沒有未分類的差異。
- 每個 `PASS` 都有兩邊的 Raw Result 與比對紀錄，不是只看其中一邊。
- 每個 `APPROVED_BEHAVIOR_CHANGE` 都引用 `APPROVED` 的 `MIG-*`。
- 報告列出整體涵蓋率、高風險涵蓋率、通過率（含分子與分母）、`UNKNOWN` 數量與未涵蓋的 `LB-*`；高風險未涵蓋項目已交 Human 決定。
- Result Comparison Human Gate 已明確確認。

## 禁止事項
- 沒有 `APPROVED` 的 `MIG-*` 不得判為 `APPROVED_BEHAVIOR_CHANGE`，也不得以「只是格式不同」自行忽略差異。
- 不得修改 Legacy Baseline、Raw Result 或 Expected Result 來消除差異。
- 不得重跑到通過為止；不穩定結果照實記錄。
- 不得修改 Target 程式；修正由 `adf-verification-fix` 或另開的 `CHANGE` 處理。
- 不得只回報通過率而省略涵蓋率，也不得把 `TEST_DATA_PROBLEM`、`REVIEW_REQUIRED` 的案例算成已比對。

## 既有 Module 補填
v5.4.0 之前已完成比對、但沒有 `verification/comparison.md` 或涵蓋率的 Module：
1. 若沒有 `analysis/legacy-behavior.md`，先依 `adf-legacy-analysis` 的「既有 Module 補填」補行為清單。
2. 沿用既有的雙邊 Raw Result，不重新執行 Legacy；Raw Result 已遺失的案例標 `TEST_DATA_PROBLEM`，由 Human 決定是否重跑。
3. 依步驟 2 到 5 重新比對與分類，結果寫入 `verification/comparison.md`；與過去分類不同的差異標 `REVIEW_REQUIRED`，不自動推翻已核准的決定。
4. 已完成的 Module 開 `CHANGE` 只補文件；補出未涵蓋的高風險 `LB-*` 時，經 Human 確認後再補 `TC-*` 與比對。

## 範例
輸入：`TC-003` 查詢帳號，Legacy 回傳 3 筆、日期為民國年；`MIG-DATE-001` 已核准。

輸出（`verification/comparison.md` 節錄）：

| TC | LB | 欄位 | Legacy | Target | 分類 | 依據 |
|---|---|---|---|---|---|---|
| TC-003 | LB-005 | `createDate` | `113/01/05` | `2024-01-05` | PASS | 正規化套用 `MIG-DATE-001` |
| TC-003 | LB-002 | 第 2、3 筆順序 | `A002, A003` | `A003, A002` | MIGRATION_DEFECT | `LB-002` 預設依 `ACCT_ID` 遞增 |
| TC-007 | LB-003 | `status` 顯示 | `啟用` | 空白 | SPEC_GAP | `spec/rules.md` 未定義 Null 顯示 |

- 整體涵蓋率：18／24（75%），其中 `UNKNOWN` 2 項。
- 高風險涵蓋率：5／7（71%）；未涵蓋：`LB-011`（交易）、`LB-019`（權限），標 `REVIEW_REQUIRED`。
- 通過率：15／18（83%）；未通過：`LB-002`（`MIGRATION_DEFECT`）、`LB-003`（`SPEC_GAP`）、`LB-007`（`LEGACY_UNKNOWN`）。
- `TC-009` 判 `TEST_DATA_PROBLEM`，其連到的 `LB-014` 不計入已比對。

## 本 Skill 官方資源
- `template/verification/comparison.md` → `assets/comparison.md`。
