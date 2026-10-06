---
name: adf-migration-rule-authoring
description: 建立或修訂 Legacy 到 Target 的 Migration Rule。
---

# ADF Migration Rule Authoring

## 目的
建立 MIG-* 描述允許的語意/表示轉換、適用條件、Normalization 與驗證方式；重大變更需 Human Approval。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 本 Skill 官方資源
- `standard/migration/frontend/page-to-dialog.md` → `assets/standards/migration/frontend/page-to-dialog.md`。
- `standard/migration/null-empty.md` → `assets/standards/migration/null-empty.md`。
- `standard/migration/roc-calendar.md` → `assets/standards/migration/roc-calendar.md`。
