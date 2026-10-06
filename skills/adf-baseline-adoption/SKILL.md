---
name: adf-baseline-adoption
description: 將沒有 Legacy 的既有已開發系統納入 ADF 並建立 Approved Baseline。
---

# ADF Baseline Adoption

## 目的
Target Reverse Analysis 只能建立 Candidate Specification；經 Evidence-Guided Q&A、Human Review、Regression Test 與 Traceability 後形成 Baseline，不能宣稱證明原實作本來就是正確需求。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## Mandatory Human Gate
`BASELINE_ADOPTION` 永遠要求 Human Approval。Target 現況只能標記 `OBSERVED`，不能直接升級為 `APPROVED`；重要 Candidate Rules 必須經人工確認後才能形成 Approved Baseline。後續功能修改改走 `CHANGE`。
