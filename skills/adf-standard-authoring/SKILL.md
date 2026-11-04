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
- `standard/development/message.md` → `assets/standards/development/message.md`。
- `standard/development/security/sql-injection.md` → `assets/standards/development/security/sql-injection.md`。
- `standard/development/security/data-scope.md` → `assets/standards/development/security/data-scope.md`。
- `standard/development/security/write-condition.md` → `assets/standards/development/security/write-condition.md`。
- `standard/development/security/file-path.md` → `assets/standards/development/security/file-path.md`。
- `standard/development/security/param-token.md` → `assets/standards/development/security/param-token.md`。
- `standard/development/frontend/dialog.md` → `assets/standards/development/frontend/dialog.md`。
- `standard/development/frontend/master-detail.md` → `assets/standards/development/frontend/master-detail.md`。
- `standard/development/pagination.md` → `assets/standards/development/pagination.md`。
- `standard/development/security.md` → `assets/standards/development/security.md`。

## 起始規範
專案可用一鍵規範安裝（`scripts/standards.sh`／`standards.ps1`，內部為 `project.mjs STANDARDS`）勾選上列部分範例寫入專案 `standards/`。以 `DRAFT` 寫入者，依本 Skill 審查後再改為 `APPROVED`；既有同路徑或同 ID 的規範不會被覆蓋。
