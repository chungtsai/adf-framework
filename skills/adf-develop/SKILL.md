---
name: adf-develop
description: ADF 統一開發 Orchestrator，依 NEW、CHANGE、MIGRATION 與 Intent 執行下一個合法 Stage。
---

# ADF Develop

## 目的
檢查真實 Artifact 與 Review 狀態，判斷下一個合法 Stage 並執行；不得因檔案存在就判定完成。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## Intent Routing
- `SECURITY_FIX`：`adf-security-analysis` → Design/Implementation → `adf-security-verification` + Regression → Traceability。
- `REFACTOR`：`adf-refactor-analysis` → Characterization/Regression Baseline → Design/Implementation → Regression/Behavior Comparison → Traceability。
- Combined Intents 必須組合所有必要 Gate。
- `STANDARD_CHANGE` 是 Framework-level Trigger；進行中 Module 從最早受影響 Stage Revalidate，已完成 Module 依 policy 決定是否建立新的 `CHANGE`。

## Functional Scenario Routing

- NEW / CHANGE / MIGRATION 若有使用者操作流程，在 Verification 階段由 `adf-test-generation` 建立或更新 `functional-scenarios.md`。
- 已完成的既有 Module 若缺少 Functional Scenario，建立新的 `CHANGE` Work Item 補做。
- Retrofit CHANGE 僅補 Scenario、Test 關聯與 Traceability，不應重新走 Implementation；除非過程發現並經 Human 確認存在真正的 Behavior Change。
- 不新增 `FUNCTIONAL_SCENARIO` Work Type，不新增 Work Type。

## Human-readable Specification

- Module 使用 `specification.md` 作為 Human 閱讀入口；它是由正式 ADF Artifacts / Evidence 彙整出的 Read Model，不是新的 Source of Truth。
- NEW / CHANGE / MIGRATION 在 Requirement、Rule、UI、Design、Functional Scenario 等 Human-readable 行為形成或變更後，建立或同步 `specification.md`。
- 規格書至少整理：功能概要、主要流程、畫面與輸入、Business Rules、Functional Scenarios、資料處理、驗證摘要、例外限制及 Traceability Summary。
- 產生規格書時必須保留 `REQ-*`、`BR-*`、`FS-*`、`TC-*` 等來源 ID，讓 Human 可回到正式 Artifact 查證。
- 不得直接修改 `specification.md` 取代 Requirement / Rule / Design / Verification 的正式變更流程。
- 若規格書與正式 Artifact 衝突，以 Approved Source Artifact / Evidence 為準並標記 `REVIEW_REQUIRED`。

## 本 Skill 官方資源
- `template/specification.md` → `assets/specification.md`。
