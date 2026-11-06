# Result Comparison

> 由 `adf-result-comparison` 建立。差異由比對腳本找出，依 SKILL.md 的固定順序分類；通過率必須和涵蓋率一起看。

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
| Legacy 行為涵蓋率 | 已比對 0 ／ LB-* 共 0 |

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
