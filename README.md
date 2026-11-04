# ADF — AI Development Framework v5.2

> **語言政策：人看的內容使用繁體中文；機器識別碼與程式代碼維持英文。**

ADF 的目的不是讓 AI 單純寫得更快，而是把「相信 AI」轉成「相信可驗證的證據」。透過分析、規格、標準、設計、開發、測試、比對、Traceability 與 Human Gate，降低 AI 誤解需求與 Legacy 行為的風險。

## v5.2 重點
- 共用規範集中為單一來源：`core/invariants.md`（共通不變條件）與 `core/runtime-compat.md`（資源解析與舊專案相容性），各 Skill 只保留固定的「共用規範」引用區塊，不再複製內容。
- 修正舊版各 Skill 之間 Compact Artifacts 清單不一致的問題（多數 Skill 缺少 `functional-scenarios.md` 與 `FS-*`）。
- 新增 `core/skill-contract.md`：Skill 操作契約格式（輸入、步驟、輸出、完成條件、禁止事項、範例）；`adf-backend-development` 為第一支完整範例。
- `npm run validate` 新增檢查：共用區塊必須與契約一致、禁止重新複製共用段落、同一條規則出現在 3 支以上 Skill 即失敗、引用的 resource key 必須存在。
- Skill 名稱、數量、Work Type、Gate 規則與 Module 文件格式都不變。由 v5.1 升級見 [v5.1 → v5.2 SOP](docs/upgrades/5.1-to-5.2.md)。

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

## 全新專案：一鍵安裝

專案**從未使用過 ADF**（沒有 `.adf/`、`modules/`、`standards/`、任何 `adf-*` Skill 或舊版引用）時，在專案根目錄執行一行即可。前置條件：Node.js 18 以上（含 npx）。

**同一行指令會自動判斷**：全新專案 → 安裝；已安裝的專案 → 自動改執行[一鍵更新](#已安裝專案一鍵更新)；有舊版痕跡 → 停止並指向移轉 SOP。寫入任何檔案前都會列出摘要並詢問 `確定要繼續嗎？[y/N]`，回答 `y` 才執行。CI 等沒有終端機的環境請加 `--yes`（PowerShell：`-Yes`）或設定 `ADF_YES=1`。

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/install.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/install.ps1 | iex
```

也可以一次下載整包（所有 Skill、腳本、文件）再執行，不依賴單一檔案網址：

```bash
# macOS / Linux：下載到暫存目錄 → 執行 → 清除
ADF_REF=main; t=$(mktemp -d) && curl -fsSL "https://codeload.github.com/chungtsai/adf-framework/tar.gz/$ADF_REF" | tar -xz -C "$t" --strip-components=1 && bash "$t/scripts/install.sh"; rm -rf "$t"
```

```powershell
# Windows PowerShell
$r='main'; $t=Join-Path $env:TEMP "adf-$(New-Guid)"; Invoke-WebRequest -UseBasicParsing "https://codeload.github.com/chungtsai/adf-framework/zip/$r" -OutFile "$t.zip"; Expand-Archive "$t.zip" $t; & (Get-ChildItem "$t\*\scripts\install.ps1").FullName; Remove-Item -Recurse -Force $t, "$t.zip"
```

`ADF_REF` 只決定安裝腳本取自哪個分支／tag；Skill 本身一律由 `npx skills` 從正式 tag（預設 v5.2.0）安裝，才能留下 `skills-lock.json` 來源紀錄。

腳本會依序：檢查是否為全新專案 → 下載同版本原始檔 → 專案層級 `npx skills add`（v5.2.0 全部 33 支）→ **逐檔比對每支 Skill 的 `SKILL.md`、`scripts/`、`assets/`、`references/` 都已放在正確位置且內容一致** → `PLAN`（計畫檔存在專案外暫存目錄）→ `APPLY` → `VERIFY`。只新增 Skill、`skills-lock.json` 與 `.adf/`，不碰其他檔案。有缺檔會停止並列出，不會自行補檔（補檔會與 `skills-lock.json` 雜湊不符）。

安裝完成後的位置（Claude Code 預設）：

```text
<project>/
├── .claude/skills/adf-*/        # 33 支 Skill，含 SKILL.md、scripts/、assets/、references/
├── skills-lock.json            # npx skills 來源與雜湊紀錄
└── .adf/project.yaml、migration.json、backups/
```

Codex 等其他 Agent 會放在 `.agents/skills/`。repo 根目錄的 `scripts/`、`tests/`、`docs/` 是框架維護用，不需要放進專案。

- 其他 Agent：`bash install.sh --agent codex`（PowerShell：`-Agent codex`），或設定環境變數 `ADF_AGENT`。
- 指定版本：`--version v5.2.0` 或 `ADF_VERSION`。Windows 無法建立符號連結時加 `--copy` / `-Copy`。
- 想先看腳本內容：先下載 `install.sh` 檢查後再以 `bash install.sh` 執行。
- 略過確認提示：`--yes`（`-Yes`）或 `ADF_YES=1`。
- 偵測到任何舊版 ADF 痕跡會在安裝前停止、不寫入任何檔案，請改用下方移轉 SOP。

## 已安裝專案：一鍵更新

已用一鍵安裝或 `adf-project-install` 完成導入（有 `.adf/migration.json`）的專案，直接再執行上面的一鍵安裝指令就會自動更新；也可以直接呼叫更新腳本：

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/update.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/update.ps1 | iex
```

腳本會依序：確認專案已完成導入 → 以目前版本 `VERIFY`（Skill 被手動修改就停止，避免覆蓋客製內容）→ 已是最新版就直接結束 → 下載目標版原始檔並確認新版接受目前 `.adf/project.yaml` → **顯示 `v舊 → v新` 並詢問確認** → **備份目前 Skill 與 `skills-lock.json` 到專案外** → 沿用原本的 Agent 與 copy／symlink 模式執行 `npx skills add` → 逐檔比對 → 以新版工具 `VERIFY`。任何一步失敗都會**自動還原為更新前版本**並重新 VERIFY。

只更新 Skill 與 `skills-lock.json`；不碰 `standards/`、`modules/`、CLAUDE.md、AGENTS.md、`.adf/`，不撤銷核准狀態。

- 指定版本：`--version v5.2.0`（PowerShell：`-Version`）或 `ADF_VERSION`；預設為 main 分支腳本所記錄的最新正式版。
- 覆寫自動偵測：`--agent codex`、`--copy` / `--no-copy`（PowerShell：`-Agent`、`-Copy` / `-NoCopy`）。
- 確定要覆蓋手動修改過的 Skill，或同版本重新安裝：`--force`（`-Force`）。
- 略過確認提示：`--yes`（`-Yes`）或 `ADF_YES=1`。
- 新版不相容目前專案設定時會在寫入前停止，改依下方 SOP。

## 專案起始規範：一鍵勾選安裝

ADF 安裝完成後，可以勾選要採用的起始規範，寫入專案 `standards/`，作為新專案或移轉專案的初始基礎規則：

| 編號 | 規範 | 寫入 | 適用 |
|---|---|---|---|
| 1 | 年度：舊系統民國年 → 新系統西元年 | `DEV-DATE-001`、`MIG-DATE-001` | NEW／CHANGE／MIGRATION |
| 2 | 顯示規範（移轉）：新系統與舊系統一致即可 | `MIG-DISP-001` | MIGRATION |
| 3 | 顯示規範（新專案）：採用共用訊息 | `DEV-MSG-001` | NEW／CHANGE |
| 4 | 安全性檢查：禁止以串接方式撰寫 SQL（SQL Injection） | `DEV-SEC-SQL-001` | 全部 |
| 5 | 資料範圍保護：第一層與第二層範圍相同，第二層不得只用 PK | `DEV-SEC-SCOPE-001` | 全部 |

```bash
# macOS / Linux：列出規範 → 輸入編號勾選 → 選 DRAFT／APPROVED → 確認後寫入
curl -fsSL https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/standards.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/standards.ps1 | iex
```

- 非互動（CI）：`bash -s -- --select 1,4,5 --status DRAFT --yes`（也可用代號 `date,display-parity,shared-message,sql-injection,data-scope`）；PowerShell 用 `& ([scriptblock]::Create((irm …/standards.ps1))) -Select 1,4,5 -Yes`。只看清單：`--list`／`-List`。
- 寫入狀態：`DRAFT`（預設，之後由 `adf-standard-authoring`／`adf-migration-rule-authoring` 審查後核准）或 `APPROVED`（確認已審閱內容，檔案會記錄 `approved_at`）。每個檔案都會記錄 `source`。
- 只新增檔案：同路徑或同 ID（含舊範例 `# DEV-…` 標題）已存在就略過，不覆蓋；不修改 Skill、`modules/`、`.adf/`。必須先完成 ADF 安裝（有 `.adf/migration.json`）。
- 規範內容來源是 `adf-standard-authoring`／`adf-migration-rule-authoring` 的 `assets/standards/`，清單在 `adf-project-install/references/standard-packs.json`；預設取自 main，可用 `--ref`／`-Ref` 指定 tag。

## 既有專案：移轉與升級

統一使用專案層級 `npx skills`。正式版本指令、手動來源轉接、前置備份與回復，從 v5.0 導入見 [v5.0 → v5.1 SOP](docs/upgrades/5.0-to-5.1.md)，從 v5.1 升級見 [v5.1 → v5.2 SOP](docs/upgrades/5.1-to-5.2.md)。v5.2.0 tag 發佈前，此分支僅為候選版。

官方範本各自只有一個 owner，資源清單位於 `skills/adf-project-install/references/resources.json`；不建立專案 `.adf/templates/` 或客製範本。共用 Review 也採單一來源。規範範例歸位至 authoring Skills 的 assets，專案實際規範維持 `standards/`。

專案保留 `standards/`、`modules/`、CLAUDE.md、AGENTS.md；移轉記錄位於 `.adf/project.yaml` 與 `.adf/migration.json`。不新增 Issue Tracking。更新 Skill 不重產既有文件、不撤銷已核准狀態。

repository 維護檢查：`npm run validate`、`npm test`（含一鍵安裝與一鍵更新腳本的離線測試）。舊 `scripts/init.js` 現在只讀取，不再初始化或複製檔案。

# 最重要的原則

**AI 不是 Source of Truth。** Source of Truth 來自 Requirement、Legacy/Target Evidence、Approved Standards、Approved Baseline/Design、Executable Tests 與 Verification Evidence。

ADF 的核心是：**從「相信 AI」轉成「相信證據」。**

