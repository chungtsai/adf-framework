---
name: adf-refactor-analysis
description: 分析 CHANGE + REFACTOR 的行為基線與重構風險。
---

# ADF Refactor Analysis

## 目的
盤點 Public Behavior、Dependency、Call Path、Transaction、DB Side Effect、Exception、Session、Cache、Concurrency、Integration；預設 behavior change 不允許。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。
