---
name: adf-standard-authoring
description: 建立或修訂跨 Module 可重用的 Development Standard。
---

# ADF Standard Authoring

## 目的
先搜尋既有 standards/development 避免重複；建立穩定 DEV-*、版本、狀態、change_policy、適用範圍、例外與驗證方式。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 本 Skill 官方資源
- `standard/development/date-time.md` → `assets/standards/development/date-time.md`。
- `standard/development/error-handling.md` → `assets/standards/development/error-handling.md`。
- `standard/development/frontend/dialog.md` → `assets/standards/development/frontend/dialog.md`。
- `standard/development/frontend/master-detail.md` → `assets/standards/development/frontend/master-detail.md`。
- `standard/development/pagination.md` → `assets/standards/development/pagination.md`。
- `standard/development/security.md` → `assets/standards/development/security.md`。
