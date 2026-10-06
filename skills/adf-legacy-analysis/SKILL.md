---
name: adf-legacy-analysis
description: 分析 Legacy 程式實際行為並建立可追蹤 Evidence。
---

# ADF Legacy Analysis

## 目的
分析 JSP、Servlet、Service、DAO、SQL 等來源，整理輸入、輸出、分支、驗證、權限、交易、錯誤與 Side Effect；無法證明的行為標記 UNKNOWN 或 REVIEW_REQUIRED。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。
