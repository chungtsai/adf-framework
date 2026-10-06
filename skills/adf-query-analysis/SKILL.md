---
name: adf-query-analysis
description: 分析查詢條件、SQL 與資料語意並建立 Q-* 規則。
---

# ADF Query Analysis

## 目的
整理 Optional Filter、Null/Empty、Date Range、Join、Order、Pagination、Permission Scope，並設計高價值組合而非暴力排列。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。
