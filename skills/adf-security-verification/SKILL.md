---
name: adf-security-verification
description: 驗證 Security Fix 已移除 Root Cause 且沒有破壞正常行為。
---

# ADF Security Verification

## 目的
重跑相關 Functional/Regression、Authorization、Validation、Error 與可用安全檢查；Suppress Scanner 或只隱藏 UI 不算修復。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。
