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
- 不新增 `FUNCTIONAL_SCENARIO` Work Type，不新增 Work Type。

## Evidence-Guided Q&A
解析單一官方來源 `adf-project-install/references/` 下的 interactive-review、question-schema、approval-gate 與 terminology，依其規則執行。來源缺少或版本不相容時停止需要 Review 的階段，不維護本地副本。

## Human-readable Specification

- Module 使用 `specification.md` 作為 Human 閱讀入口；它是由正式 ADF Artifacts / Evidence 彙整出的 Read Model，不是新的 Source of Truth。
- NEW / CHANGE / MIGRATION 在 Requirement、Rule、UI、Design、Functional Scenario 等 Human-readable 行為形成或變更後，建立或同步 `specification.md`。
- 規格書至少整理：功能概要、主要流程、畫面與輸入、Business Rules、Functional Scenarios、資料處理、驗證摘要、例外限制及 Traceability Summary。
- 產生規格書時必須保留 `REQ-*`、`BR-*`、`FS-*`、`TC-*` 等來源 ID，讓 Human 可回到正式 Artifact 查證。
- 不得直接修改 `specification.md` 取代 Requirement / Rule / Design / Verification 的正式變更流程。
- 若規格書與正式 Artifact 衝突，以 Approved Source Artifact / Evidence 為準並標記 `REVIEW_REQUIRED`。


## v5.1 資源與舊專案相容性
- 官方資源唯一位置以 `adf-project-install/references/resources.json` 為準；不複製到專案 `.adf/templates/`，不使用客製範本。
- 從本專案 `.agents/skills/` 或 `.claude/skills/` 解析來源；可使用安裝 Skill 的 `scripts/project.mjs resolve <project> <resource-key>`。兩處版本或內容衝突時停止，不回退到全域。
- 官方資源來源 Skill 未安裝或版本不相容時，提示透過 `npx skills` 在專案層級安裝適用正式版本。Review 不可跳過。
- 先讀取專案 `standards/` 與已核准 Evidence；官方規範範例不是專案核准規範，不自動套用。
- 保留 v5.0 的 Module 文件、完成狀態與核准紀錄；新版缺少欄位或文件列為補做建議，不自動撤銷核准。需要補做另走 CHANGE。
- 在尚未採用新版 Gate 的舊 Module，只列出 Functional Scenario / specification 差異；已明確採用的新工作才檢查新版要求。

## 本 Skill 官方資源
- `template/specification.md` → `assets/specification.md`。
