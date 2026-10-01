---
name: adf-develop
description: ADF 統一開發 Orchestrator，依 NEW、CHANGE、MIGRATION 與 Intent 執行下一個合法 Stage。
---

# ADF Develop

## 目的
檢查真實 Artifact 與 Review 狀態，判斷下一個合法 Stage 並執行；不得因檔案存在就判定完成。

## ADF 共通不變條件
- Work Type 僅使用 `NEW`、`CHANGE`、`MIGRATION`。
- 每個 Module 同一時間只允許一個 Active Work Item；Module 是主要隔離邊界。
- 預設採 Compact Artifacts：`requirements.md`、`rules.md`、`standards.md`、`design.md`、`functional-scenarios.md`、`test-cases.md`、`traceability.md`。
- 檔案存在不代表 Stage 已完成。
- 穩定識別碼維持英文：`REQ-*`、`BR-*`、`VAL-*`、`Q-*`、`UI-*`、`FS-*`、`DEV-*`、`MIG-*`。
- 無法證明的行為必須標記 `UNKNOWN` 或 `REVIEW_REQUIRED`。
- 不得為了取得 `PASS` 而弱化 Expected Result。
- Project-wide Standards 放在 `standards/`。

## Intent Routing
- `SECURITY_FIX`：`adf-security-analysis` → Design/Implementation → `adf-security-verification` + Regression → Traceability。
- `REFACTOR`：`adf-refactor-analysis` → Characterization/Regression Baseline → Design/Implementation → Regression/Behavior Comparison → Traceability。
- Combined Intents 必須組合所有必要 Gate。
- `STANDARD_CHANGE` 是 Framework-level Trigger；進行中 Module 從最早受影響 Stage Revalidate，已完成 Module 依 policy 決定是否建立新的 `CHANGE`。

## Functional Scenario Routing

- NEW / CHANGE / MIGRATION 若有使用者操作流程，在 Verification 階段由 `adf-test-generation` 建立或更新 `functional-scenarios.md`。
- 已完成的既有 Module 若缺少 Functional Scenario，建立新的 `CHANGE` Work Item 補做。
- Retrofit CHANGE 僅補 Scenario、Test 關聯與 Traceability，不應重新走 Implementation；除非過程發現並經 Human 確認存在真正的 Behavior Change。
- 不新增 `FUNCTIONAL_SCENARIO` Work Type，也不建立 v5.1 專用流程。

## Evidence-Guided Q&A
遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或必要資料不足時，依 `framework/review/` 進入互動審查：
1. 一次只問一個需要 Human 判斷的問題。
2. 依 Evidence 提供 2～3 個合理候選答案；若有推薦答案，必須附上推薦理由與 Evidence，不得把推測描述成事實。
3. 永遠允許「其他／自行輸入」與「不確定，保留 REVIEW_REQUIRED」。
4. `HIGH` Risk（Security、Permission、金額、交易、刪除資料、關鍵 Business Rule、Migration Semantic Mismatch）不得批次接受。
5. `LOW` Risk 可提供批次快速確認，但仍需 Human 明確操作。
6. 問題清除後進入 `READY_FOR_REVIEW`；需要 Human Gate 的 Stage 必須詢問「目前沒有其他待確認問題，是否確認此階段完成？」。
7. 只有 Human 確認後才能標記 `APPROVED`。

## Human-readable Specification

- Module 使用 `specification.md` 作為 Human 閱讀入口；它是由正式 ADF Artifacts / Evidence 彙整出的 Read Model，不是新的 Source of Truth。
- NEW / CHANGE / MIGRATION 在 Requirement、Rule、UI、Design、Functional Scenario 等 Human-readable 行為形成或變更後，建立或同步 `specification.md`。
- 規格書至少整理：功能概要、主要流程、畫面與輸入、Business Rules、Functional Scenarios、資料處理、驗證摘要、例外限制及 Traceability Summary。
- 產生規格書時必須保留 `REQ-*`、`BR-*`、`FS-*`、`TC-*` 等來源 ID，讓 Human 可回到正式 Artifact 查證。
- 不得直接修改 `specification.md` 取代 Requirement / Rule / Design / Verification 的正式變更流程。
- 若規格書與正式 Artifact 衝突，以 Approved Source Artifact / Evidence 為準並標記 `REVIEW_REQUIRED`。
