---
name: adf-retrofit-verification
description: 對已完成移轉且 Legacy 仍存在的 Target 補做事後語意驗證。
---

# ADF Retrofit Verification

## 目的
預設 VERIFY ONLY；分析 Legacy 與 Target，使用相同案例做 Golden/Dual Execution、Normalization、Comparison 與 Traceability，缺陷經 Human Review 後另開 CHANGE。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## Verify Only
第一階段禁止自動修改 Target。發現差異先保存 Evidence 與分類；確認為 `MIGRATION_DEFECT` 後，經 Human Gate 決定是否建立獨立 `CHANGE` 進行修復與 Re-Verify。
