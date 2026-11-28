---
name: adf-traceability-check
description: 檢查 Requirement/Evidence 到 Result 的完整追溯關係。
---

# ADF Traceability Check

## 目的
確認 Requirement/Legacy Evidence → Rule → Standard → Design → Test → Result；重要鏈結缺失即 BLOCKED。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 步驟
1. **先跑工具基準**：執行 `node <skill-root>/scripts/module-check.mjs modules/<module-id> --json`，依 `core/module-format.md` 取得格式（`L-*`）、斷鏈（`R-01～R-09`）與覆蓋率（分子／分母），不靠肉眼估算。
2. **維護單列對應**：更新 `verification/traceability.md`，每列只填寫單一 `Source` 與單一 `Test`（沒有測試時 `Test` 填 `不適用`、`Result` 填 `NOT_RUN`），有明確執行出處時填入 `Evidence`。
3. **重跑驗證與交付**：確認無 `R-01`、`R-02`、`R-03`、`R-09` 阻擋後，將缺口與覆蓋率摘要交付 Traceability Human Gate。

## 既有 Module 拆列轉換
- 既有 Module 若仍有舊寫法「一列多個 Test」（`L-10` 警告），採「碰到才轉換」：於下次 `CHANGE` 修改到 `traceability.md` 時拆列，或另開 `Documentation Retrofit CHANGE`（`behavior.change_allowed: false`）主動轉換。
- 拆列時依序採信 `verification/comparison.md`、含 TC ID 的自動化測試報告、測試管理系統執行紀錄、Human 簽核紀錄，並將出處寫入 `Evidence` 欄；查無明確紀錄的 TC 一律填 `NOT_RUN`，嚴禁將舊列單一 Result 複製到每一列。

## 本 Skill 官方資源
- `template/verification/traceability.md` → `assets/traceability.md`。
