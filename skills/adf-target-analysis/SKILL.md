---
name: adf-target-analysis
description: 分析既有 Target 系統目前實作行為，供 Retrofit 或 Baseline Adoption 使用。
---

# ADF Target Analysis

## 目的
將 React、API、Service、Query、Validation、Permission、Transaction 等現況視為 TARGET_OBSERVED Evidence；現況不等於正確需求。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。
