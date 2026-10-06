---
name: adf-result-normalization
description: 依核准 MIG-* 將不同表示轉成可比較的語意結果。
---

# ADF Result Normalization

## 目的
只允許 APPROVED Migration Rule 參與 Normalization；不得用 Normalization 隱藏真正 Business Difference。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。
