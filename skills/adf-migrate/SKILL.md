---
name: adf-migrate
description: 啟動與協調 Legacy 到 Target 的 MIGRATION 工作流程。
---

# ADF Migrate

## 目的
以 Legacy Evidence 為行為基線，經分析、規格、標準、設計、開發、Golden Test、Normalization、Comparison 與 Traceability 完成移轉。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。
