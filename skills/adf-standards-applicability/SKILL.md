---
name: adf-standards-applicability
description: 判斷目前 Module 適用哪些 Development / Migration Standards。
---

# ADF Standards Applicability

## 目的
NEW/CHANGE/MIGRATION 讀取 APPROVED DEV-*；MIGRATION 額外判斷 MIG-*，並在 spec/standards.md 記錄適用理由。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 本 Skill 官方資源
- `template/spec/standards.md` → `assets/standards.md`。
