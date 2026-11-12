---
name: adf-frontend-development
description: 依核准 UI Rule、Prototype、Design 與 Standard 實作 Frontend。
---

# ADF Frontend Development

## 目的
只實作核准範圍並減少無關變更；保持 Permission、Validation、State 與互動語意。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## Code Review
- 實作完成、commit 前，若專案 `standards/` 有 `DEV-REVIEW-001`，依它審查尚未 commit 的前端差異（含新增檔案），並對照 UI Rule、Prototype 與適用的 `DEV-SEC-XSS-001` 等規範。
- 發現以 `CR-*` 記錄；`BLOCKER` 修正後重審，未解決的 `BLOCKER`／`MAJOR` 寫入 manifest `blockers`，前端狀態維持 `pending`。
