---
name: adf-result-comparison
description: 比較 Legacy 與 Target 的 Semantic Result 並分類差異。
---

# ADF Result Comparison

## 目的
分類 PASS、MIGRATION_DEFECT、SPEC_GAP、LEGACY_UNKNOWN、APPROVED_BEHAVIOR_CHANGE、TEST_DATA_PROBLEM、REVIEW_REQUIRED；不得自動修 Target。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 差異分類
- `PASS`：語意一致。
- `MIGRATION_DEFECT`：Target 未保留應保留語意。
- `SPEC_GAP`：規格不足，無法可靠判定。
- `LEGACY_UNKNOWN`：Legacy 行為無法證明。
- `APPROVED_BEHAVIOR_CHANGE`：有核准 MIG-* 支持的預期差異。
- `TEST_DATA_PROBLEM`：測試資料不足或不可比。
- `REVIEW_REQUIRED`：需要 Human 判斷。
