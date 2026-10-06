---
name: adf-ask
description: 唯讀查看 ADF 專案進度、Blocker、Review Gate 與下一個建議 Skill。
---

# ADF Ask

## 目的
讀取 manifest 與實際 Artifact，回報目前 Stage、完成/待辦、Blocker，並只推薦一個下一步；不得修改專案檔案。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 導航規則
支援 Module Summary、`next`、`blockers`、`all`。回覆目前 Work Type、Stage、Completed/Pending、Blockers，並只給一個建議的下一支 ADF Skill 或 Human Review。`adf-ask` 為 READ ONLY，不得執行建議 Skill 或直接修改 Artifact。
