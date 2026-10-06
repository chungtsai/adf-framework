---
name: adf-requirement-analysis
description: 分析 NEW 或 CHANGE 的需求與需求差異。
---

# ADF Requirement Analysis

## 目的
將需求整理為可追蹤的 REQ-*；CHANGE 僅更新受影響範圍，缺少必要資訊時不得自行補假設。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 本 Skill 官方資源
- `template/spec/requirements.md` → `assets/requirements.md`。
