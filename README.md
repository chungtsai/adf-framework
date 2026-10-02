# ADF — AI Development Framework v5.1

> **語言政策：人看的內容使用繁體中文；機器識別碼與程式代碼維持英文。**

ADF 的目的不是讓 AI 單純寫得更快，而是把「相信 AI」轉成「相信可驗證的證據」。透過分析、規格、標準、設計、開發、測試、比對、Traceability 與 Human Gate，降低 AI 誤解需求與 Legacy 行為的風險。

## v5.1 重點
- 33 支 `SKILL.md` 的操作說明全面改為繁體中文。
- Skill ID、檔名、YAML/JSON Key、`NEW/CHANGE/MIGRATION`、Intent、Status、Rule ID、`DEV-*`、`MIG-*` 維持英文。
- 共用 Review Framework 全面繁體中文化。
- Evidence-Guided Q&A：依 Evidence 提供 2～3 個高可能答案、推薦理由、自訂回答與 `REVIEW_REQUIRED`。
- `HIGH` Risk 禁止批次接受；`LOW` Risk 可快速確認。
- 問題清除後，由 Human 決定是否確認 Stage 完成。
- `BASELINE_ADOPTION` 強制 Human Approval。

---


ADF 是一套讓 AI 輔助開發、Legacy Migration 與既有系統治理變得**可驗證、可追蹤、可審查**的工程工作流程。

核心不是「相信 AI 已完成」，而是透過 **Evidence → Rules → Standards → Design → Test → Result → Traceability** 建立可以檢查的證據。

## Evidence-Guided Q&A / Human Review Gate

ADF 卡住時不只回報 `BLOCKED`。遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，會進入一問一答：先顯示 Evidence，再提供 2～3 個合理高可能答案；可標示一個附理由的推薦答案，也永遠允許自訂回答或保留 `REVIEW_REQUIRED`。HIGH risk 問題逐題確認，LOW risk 才可批次接受建議。

每次回答後更新 Artifact 並重新檢查；所有問題解決後，ADF 會詢問「是否確認此階段完成？」。只有 Human confirmation 後才進入 `APPROVED`。AI 信心再高也不能自行核准。`BASELINE_ADOPTION` 強制 Human Gate。

共用規格位於：

`skills/adf-project-install/references/`；以專案來源解析，不回退全域，不保留副本。


## ADF 支援的專案情境

| 專案現況 | 建議入口 | 目的 |
|---|---|---|
| 全新功能 | `adf-develop` / NEW | 從需求建立規格、設計、開發與測試 |
| 修改既有功能 | `adf-develop` / CHANGE | 只修改受影響範圍並做 Regression |
| Legacy 正準備移轉 | `adf-migrate` / MIGRATION | 保留 Legacy Business Semantics |
| 已移轉完成，Legacy 還在 | `adf-retrofit-verification` | 事後做 Legacy vs Target 語意驗證 |
| 已完成開發，沒有 Legacy | `adf-baseline-adoption` | 反向建立核准 Baseline、Regression、Traceability |
| 不知道下一步 | `adf-ask` | 唯讀判斷 Stage、Blocker 與下一支 Skill |

## Work Model

ADF 保持三種主要 Work Type：`NEW`、`CHANGE`、`MIGRATION`。CHANGE 可搭配 `FEATURE`、`BUGFIX`、`SECURITY_FIX`、`REFACTOR`、`PERFORMANCE` 等 Intent。既有系統導入另外支援 `RETROFIT_VERIFY` 與 `BASELINE_ADOPTION` 情境。`STANDARD_CHANGE` 是 Framework-level trigger，不是一般功能 Work Type。

## 為什麼 Migration 可靠度較高

Migration 不以「新系統能跑」為完成條件。ADF 先從 Legacy 建立行為證據，再產生 BR/VAL/Q/UI 規則，套用核准的 DEV-* / MIG-* Standards，最後讓相同案例執行 Legacy 與 Target。核准的表示差異先 Normalization，再做 Semantic Comparison。重要規則若缺少 Test 或 Result Traceability，Completion Gate 應阻擋完成。

## 已完成系統的兩種導入方式

**有 Legacy：RETROFIT_VERIFY**

`Legacy Analysis + Target Analysis → Test Generation → Legacy Baseline + Target Test → Normalize → Semantic Compare → Traceability`。第一輪只驗證，不自動修 Target；確認的 MIGRATION_DEFECT 經 Human Review 後再建立 CHANGE。

**沒有 Legacy：BASELINE_ADOPTION**

`Target Analysis → Reverse Specification → Standards Applicability → Human Review → Approved Baseline → Regression Tests → Traceability`。這不能證明「Migration 正確」，但可以證明目前行為已被盤點、核准、測試，並成為後續 CHANGE 的可信基線。

# Skills — 33 支

## 導航與 Orchestration

- **`adf-ask`** — READ ONLY。查看 Module 現況、Blocker、Review Gate、Standard drift，以及唯一建議的下一支 Skill。
- **`adf-develop`** — 一般開發主 Orchestrator；依 NEW/CHANGE/MIGRATION、Intent 與目前 Stage 執行下一個合法階段。
- **`adf-migrate`** — Legacy → Target Migration 的快速入口與流程協調。
- **`adf-retrofit-verification`** — 已移轉完成且 Legacy 還存在時，事後做 Golden/Dual Verification；預設 Verify Only。
- **`adf-baseline-adoption`** — 已完成開發但沒有 Legacy 時，建立 Current Approved Baseline、Regression Tests 與 Traceability。

## 專案安裝

- **`adf-project-install`** — CHECK / PLAN / APPLY / VERIFY / RESTORE；安全導入與 v5.0 移轉。

## 初始化與分析

- **`adf-feature-init`** — 初始化 Module、manifest、spec/design/verification 基本結構與工作狀態。
- **`adf-requirement-analysis`** — 將 NEW/CHANGE Requirement 分析成可追蹤需求，CHANGE 聚焦 Requirement Delta。
- **`adf-legacy-analysis`** — 從 JSP/Servlet/Service/DAO/SQL 等 Legacy Source 萃取實際行為；不確定必須標 UNKNOWN / REVIEW_REQUIRED。
- **`adf-target-analysis`** — 從既有 Target 程式反向建立 Current-State Evidence；OBSERVED 不等於 APPROVED。
- **`adf-business-rule`** — 建立/更新 BR-* Business Rules 與 VAL-* Validation Rules。
- **`adf-query-analysis`** — 建立 Q-*，分析條件、Null/Empty、日期、Join、排序、分頁、權限範圍與組合測試策略。
- **`adf-screen-specification`** — 建立 UI-*，描述 Visible/Required/Readonly/Permission/Button/Dialog/Table 等有業務意義的 UI 行為。

## Standards

- **`adf-standards-applicability`** — 判斷目前 Module 適用哪些 APPROVED DEV-* / MIG-* Standards。
- **`adf-standard-authoring`** — 新增或修改 Development Standard（DEV-*），包含 version/status/change_policy。
- **`adf-migration-rule-authoring`** — 建立 Legacy → Target 的核准轉換規則（MIG-*），例如 ROC→Gregorian、Page→Dialog。
- **`adf-standard-impact-analysis`** — READ ONLY。Standard 新增/升版後找出受影響 Module，依 REQUIRED/RECOMMENDED/NEW_WORK_ONLY 提出處理建議。

## Prototype 與 Design

- **`adf-frontend-prototype`** — 有 UI Impact 時先以 Mock Data 建立 Prototype，降低 Coding 後才發現 Flow 錯誤的成本。
- **`adf-prototype-review`** — 獨立驗證 Prototype 是否符合 Requirement、Rules、Standards，避免錯誤假設一路傳遞。
- **`adf-development-design`** — 建立 Architecture、Frontend、API、Backend、DB、Security、Validation/Error、Transaction 與 Traceability Design。

## Implementation

- **`adf-backend-development`** — 依核准 Design 實作 Backend，不在 Coding 階段自行重新定義需求。
- **`adf-frontend-development`** — 依 UI Rules、Prototype、Design、Frontend Standards 實作 Target Frontend。

## Test 與 Migration Verification

- **`adf-test-generation`** — 依 NEW/CHANGE/MIGRATION/REFACTOR/Adoption 情境產生適當測試；避免無意義的暴力組合。
- **`adf-legacy-baseline`** — 執行/保存 Legacy Golden Baseline；Legacy 無法執行就 BLOCKED，不虛構 Expected Result。
- **`adf-new-test`** — 執行 Target Test 與必要 Regression，保存 Raw Result。
- **`adf-result-normalization`** — 只依核准 MIG-* Rule 正規化合法表示差異，例如民國年與西元年。
- **`adf-result-comparison`** — 比較 Legacy/Target Business Semantics，並分類 MIGRATION_DEFECT、SPEC_GAP、LEGACY_UNKNOWN、APPROVED_BEHAVIOR_CHANGE、TEST_DATA_PROBLEM、REVIEW_REQUIRED。

## Quality Gate

- **`adf-traceability-check`** — 檢查 Requirement/Legacy Evidence → Rule → Standard → Design → Test → Result 是否完整。
- **`adf-verification-fix`** — Verification Fail 時從 Test 反查 Rule/Standard/Requirement/Design/Code，修真正錯誤層；禁止為 PASS 弱化 Expected Result。
- **`adf-development-complete`** — 最終 Completion Gate；確認 Blocker、Review、Tests、Comparison、Traceability 都符合條件。

## Security

- **`adf-security-analysis`** — SECURITY_FIX 前分析 Finding、Attack Surface、Data Flow、Trust Boundary、Authorization、Validation 與必須保留的正常 Business Behavior。
- **`adf-security-verification`** — 驗證 Root Cause 已移除，並確認正常業務行為與 Regression 仍正確。

## Refactor

- **`adf-refactor-analysis`** — REFACTOR 前建立 Dependency、Call Path、Transaction、Side Effect、Exception、Session/Cache/Concurrency/Integration 行為基線；預設不允許 Behavior Change。

# 常見流程

### NEW
`feature-init → requirement-analysis → rules → standards → optional prototype/review → design → development → test-generation → new-test → traceability → complete`

### CHANGE
`approved baseline + requirement delta → impacted rules/standards/design → implementation → change tests + regression → traceability → complete`

### MIGRATION
`legacy-analysis → rules → standards → optional prototype/review → design → development → tests → legacy-baseline + new-test → normalization → comparison → traceability → complete`

### RETROFIT_VERIFY
`legacy-analysis + target-analysis → rules/mapping → tests → legacy-baseline + new-test → normalization → comparison → traceability → findings`

### BASELINE_ADOPTION
`target-analysis → candidate rules → standards → HUMAN REVIEW → approved baseline → tests → traceability → BASELINE READY`

### SECURITY_FIX
`security-analysis → design/fix → security-verification → regression → traceability`

### REFACTOR
`refactor-analysis → behavior baseline → design/refactor → regression → behavior comparison → traceability`

# Standards Structure

```text
standards/
├── development/
│   └── frontend/
└── migration/
    └── frontend/
```

Development Standards 定義 Target 應如何設計；Migration Standards 定義 Legacy → Target 哪些轉換被允許。Module 的 `spec/standards.md` 只記錄該 Module 實際適用的 Standards。

# 安裝與移轉

統一使用專案層級 `npx skills`。正式版本指令、手動來源轉接、前置備份與回復，見 [v5.0 → v5.1 SOP](docs/upgrades/5.0-to-5.1.md)。v5.1.0 tag 發佈前，此分支僅為候選版。

官方範本各自只有一個 owner，資源清單位於 `skills/adf-project-install/references/resources.json`；不建立專案 `.adf/templates/` 或客製範本。共用 Review 也採單一來源。規範範例歸位至 authoring Skills 的 assets，專案實際規範維持 `standards/`。

專案保留 `standards/`、`modules/`、CLAUDE.md、AGENTS.md；移轉記錄位於 `.adf/project.yaml` 與 `.adf/migration.json`。不新增 Issue Tracking。更新 Skill 不重產既有文件、不撤銷已核准狀態。

repository 維護檢查：`npm run validate`、`npm test`。舊 `scripts/init.js` 現在只讀取，不再初始化或複製檔案。

# 最重要的原則

**AI 不是 Source of Truth。** Source of Truth 來自 Requirement、Legacy/Target Evidence、Approved Standards、Approved Baseline/Design、Executable Tests 與 Verification Evidence。

ADF 的核心是：**從「相信 AI」轉成「相信證據」。**

