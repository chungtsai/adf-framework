---
name: adf-feature-init
description: 初始化或重用 ADF Module 結構與 manifest。
---

# ADF Feature Init

## 目的
建立必要目錄與 manifest；CHANGE 必須重用既有 Module，並分開記錄 module.origin 與目前 work_item.type。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 本 Skill 官方資源
- `template/manifest.yaml` → `assets/manifest.yaml`。

先確認專案已導入；專案安裝由 adf-project-install 負責。從資源清單解析所有 Module 範本，來源缺少時提示安裝。只建立新的 Module；CHANGE 不覆寫既有文件或 manifest。
