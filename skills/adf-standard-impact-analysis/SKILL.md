---
name: adf-standard-impact-analysis
description: 唯讀分析 Standard 新增或升版對各 Module 的影響。
---

# ADF Standard Impact Analysis

## 目的
不得自動修改 Module；依 REQUIRED、RECOMMENDED、NEW_WORK_ONLY 與目前 Stage 回報影響、嚴重度及下一步。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## Change Policy
- 進行中：回到最早受影響 Stage 重新驗證。
- Completed + `REQUIRED`：建議建立 `CHANGE`，trigger=`STANDARD_CHANGE`。
- Completed + `RECOMMENDED`：回報給 Human 決定。
- `NEW_WORK_ONLY`：不得強迫已完成 Module 回補。
