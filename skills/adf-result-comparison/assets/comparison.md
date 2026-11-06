# Result Comparison

> 由 `adf-result-comparison` 建立。差異由比對腳本找出，依 SKILL.md 的固定順序分類；通過率必須和涵蓋率一起看。指標以 `LB-*` 為單位，定義見 SKILL.md 步驟 5。

## 摘要

| 項目 | 數值 |
|---|---|
| 比對案例（TC） | 0 |
| PASS | 0 |
| MIGRATION_DEFECT | 0 |
| APPROVED_BEHAVIOR_CHANGE | 0 |
| SPEC_GAP | 0 |
| LEGACY_UNKNOWN | 0 |
| TEST_DATA_PROBLEM | 0 |
| REVIEW_REQUIRED | 0 |

## 涵蓋率

| 指標 | 分子／分母 | 比例 |
|---|---|---|
| 整體涵蓋率（已比對 LB-* ÷ LB-* 總數） | 0／0 | 不適用 |
| 高風險涵蓋率（已比對的 HIGH ÷ HIGH 總數） | 0／0 | 不適用 |
| 通過率（通過 LB-* ÷ 已比對 LB-*） | 0／0 | 不適用 |
| LB-* 中確定度為 UNKNOWN | 0 | — |

- 已比對：至少一個連到的 `TC-*` 有最終分類，且不是 `TEST_DATA_PROBLEM`、`REVIEW_REQUIRED`。
- 通過：已比對的 `TC-*` 全部為 `PASS` 或 `APPROVED_BEHAVIOR_CHANGE`。
- 分母為 0 時寫「不適用」，不寫 100%。

## 比對方式

- 腳本：`verification/compare/<腳本>`
- 指令：`<實際執行的指令>`
- 正規化套用：`MIG-*`（版本）
- 人工比對的案例與原因：無

## 差異清單

| TC | LB | 面向 | 欄位 | Legacy | Target | 分類 | 依據 | 處理 |
|---|---|---|---|---|---|---|---|---|
| TC-001 | LB-001 | 畫面 | `name` | `王小明` | `王小明` | PASS | — | — |

- 面向：畫面、API、DB 寫入、錯誤路徑、副作用。
- 依據：引用的 `MIG-*`、規則 ID 或 `LB-*` 確定度。
- 處理：`MIGRATION_DEFECT` → `adf-verification-fix` 或另開 `CHANGE`；其他依 Human 決定。

## 未涵蓋的 Legacy 行為

| LB | 類別 | 風險 | 原因 | 處理 |
|---|---|---|---|---|
| LB-011 | 交易 | HIGH | 沒有部分失敗的測試案例 | REVIEW_REQUIRED |

## 不穩定結果

| TC | 各次結果 | 處理 |
|---|---|---|

## Human 決策

| 日期 | 決策者 | 項目 | 決定 |
|---|---|---|---|
