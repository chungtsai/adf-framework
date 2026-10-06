---
name: adf-business-rule
description: 建立或更新 Business Rule 與 Validation Rule。
---

# ADF Business Rule

## 目的
在 spec/rules.md 維護 BR-*、VAL-*，記錄 Evidence、條件、預期行為與 Boundary。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 本 Skill 官方資源
- `template/spec/rules.md` → `assets/rules.md`。
