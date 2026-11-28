# ADF Module 格式與強制檢核規範

所有產生、檢查或結案 Module Artifact 的 ADF Skill 必須遵守本檔。本檔是唯一來源，各 Skill 只引用不複製。

## 0. 目的與原則

閘門檢查由程式化的 `adf-project-install/scripts/module-check.mjs` 執行，確保同一 Module 的格式、ID 連結、覆蓋率與結案預檢結果一致且可重現。本規範只規範**程式需要讀取的部分**；表格以外的說明文字與補充章節不受限制。

1. **向下相容**：既有 Module 範本表格原樣有效，不自動撤銷已核准狀態。
2. **工具只報告事實**：`module-check.mjs` 只讀檔案，不改寫任何 Artifact，也不將任何項目標記為 `APPROVED`。
3. **單一解析器**：框架檢查工具與外部整合工具應依本規範或 `module-check.mjs --json`（format 1）解析。

## 1. 通用規則

### 1.1 檔案
- UTF-8（允許 BOM），換行 LF 或 CRLF 皆可。
- 路徑相對於 Module 根目錄，以 `core/invariants.md` 的 Compact Artifacts 表為準。

### 1.2 表格
- 辨識 GitHub 風格 pipe table：標題列下一行必須是分隔列（`|---|`，允許 `:` 對齊符號），結束於第一個不以 `|` 開頭的行。
- 儲存格正規化：`\|` 視為儲存格內的 `|` 不切欄；`<br>`、`<br/>` 視為換行；去除 `**粗體**` 與 `` `行內程式碼` `` 標記與頭尾空白。
- **空白值**：空字串或 `—` 視為未填；表示「不適用」須明確寫 `不適用`。

### 1.3 欄位與表格辨識
- 以**標題名稱**比對（忽略大小寫與空白），不看欄位順序；必要欄位缺少回報 `ERROR`，多出欄位忽略，資料列欄數與標題列不同回報 `ERROR`。
- 工具依「所在章節標題 + 必要欄位」辨識目標表格。表格內每一列皆視為真實資料，官方範本只保留標題列、不放範例列。

## 2. 識別碼與刪除

### 2.1 語法
- 格式：`<前綴>-<段>(-<段>)*`，`<段> = [A-Z0-9]+`，一律大寫英數以 `-` 分段，不可有空白、底線或句點。
- 邊界：ID 前一個字元不可為英數字或 `-`，後一個字元不可為英數字（避免從 `REV-Q-005` 誤抓 `Q-005`）。
- 刪除後的 ID 不可重複指派給其他項目。

### 2.2 刪除規則（`REMOVED`）
- 刪除項目時**不刪該列**，將 `Status` 改為 `REMOVED`，並在備註或描述註明刪除原因與 Work Item ID。
- `REMOVED` 列仍算已定義（避免重複使用與歷史斷鏈），但不計入覆蓋率分子與分母。
- `analysis/legacy-behavior.md` 行為清單以選填 `Status` 欄標記 `REMOVED`（其餘留白）。
- 本次 Work Item 新增後又刪除的項目同樣標 `REMOVED`，並依 `core/invariants.md` 從 `work_item.changes` 移除。

### 2.3 前綴與唯一定義位置

| 前綴 | 意義 | 定義位置 | 定義形式 |
|---|---|---|---|
| `REQ` | Requirement | `spec/requirements.md` | 需求表格 `ID` 欄（相容：`## REQ-001 標題`） |
| `LB` | Legacy 行為 | `analysis/legacy-behavior.md` | 「行為清單」表格 `ID` 欄 |
| `BR` `VAL` `Q` `UI` | Rule | `spec/rules.md` | 各章節表格 `ID` 欄，前綴須與章節相符 |
| `FS` | Functional Scenario | `verification/functional-scenarios.md` | `Scenario Format` 表格 `ID` 欄 |
| `TC` | Test Case | `verification/test-cases.md` | 主表格 `ID` 欄 |
| `AC` | 驗收項目 | `verification/acceptance-<work_item.id>.md` | 「驗收項目」表格 `AC ID` 欄（該檔內唯一） |
| `DEV` `MIG` | 規範 | 專案 `standards/**/*.md` | frontmatter 的 `id`；子項為 `<id>-R<n>` |
| `REV-Q` | Review 問題 | 依 `review/question-schema.md` | — |

- 每個 ID 在定義位置只能出現一次；`legacy-behavior.md` 的 Finding、`comparison.md`、`traceability.md`、`specification.md` 只能引用，不可定義新 ID。

## 3. 引用與狀態值

### 3.1 引用儲存格
- 建議以 `、` 分隔，接受 `,`、`，`、`;`、空白與 `<br>`；**不可寫範圍**（如 `TC-001~TC-005`，回報 `ERROR`）。
- 非 ID 文字只允許 `Approved Baseline` 與 `不適用`，其餘回報 `WARN`；前綴須在欄位允許清單內。

### 3.2 Artifact 列的 `Status`
允許值（大寫英文）：`DRAFT`、`APPROVED`、`VERIFIED`（僅 `FS`/`TC`）、`REVIEW_REQUIRED`、`UNKNOWN`、`CONFLICT`、`REMOVED`。
- 僅 `APPROVED`、`VERIFIED` 計入覆蓋率分子；除 `REMOVED` 外一律計入分母。

### 3.3 執行結果與 manifest 狀態
- `traceability.md` 的 `Result`：`PASS`、`FAIL`、`NOT_RUN`、`BLOCKED`。
- `comparison.md` 的 `分類`：`PASS`、`MIGRATION_DEFECT`、`APPROVED_BEHAVIOR_CHANGE`、`SPEC_GAP`、`LEGACY_UNKNOWN`、`TEST_DATA_PROBLEM`、`REVIEW_REQUIRED`。
- `acceptance-*.md` 的 `結果`：`待驗收`、`通過`、`不通過`、`不適用`（`不適用` 時備註必填）。
- `manifest.yaml` 的 `status.*`：`pending`、`done`／`passed`（同義皆算完成）、`not_applicable`；`in_review` 與 `failed` 僅用於 `status.verification.acceptance`。
- `review.status`：`IN_PROGRESS`、`QUESTIONS_PENDING`、`READY_FOR_REVIEW`、`APPROVED`、`CHANGES_REQUESTED`。

## 4. 各 Artifact 表格規格（粗體為必要欄位）

- **`spec/requirements.md`**：**ID**（`REQ`）、**名稱**、描述、Source、**Status**（相容標題寫法，混用回報 `WARN`）。
- **`spec/rules.md`**：`## Business Rules`（`BR`）、`## Validation Rules`（`VAL`）、`## Query Rules`（`Q`）、`## UI Rules`（`UI`），欄位：**ID**、**規則**、條件、**預期行為**、Boundary、Evidence、**Source**（`REQ`/`LB`/`Approved Baseline`）、**Status**（相容標題寫法，混用回報 `WARN`）。
- **`spec/standards.md`**：**Standard**（`DEV`/`MIG`，可含 `-R<n>`）、版本、**適用**（`適用`/`不適用`/`CONFLICT`）、**理由**（`不適用`/`CONFLICT` 必填）。
- **`analysis/legacy-behavior.md`**：行為清單含 **ID**（`LB`）、**入口**、**類別**、**行為**、**證據位置**（`CONFIRMED` 必填）、**確定度**（`CONFIRMED`/`UNKNOWN`）、**風險**（`HIGH`/`NORMAL`）、規則、Status（選填，僅填 `REMOVED`）；盤點 8 類限填 `已檢查`/`不適用`/`無法取得`。
- **`verification/functional-scenarios.md`**：**ID**（`FS`）、**Source**、Preconditions、Test Input、**User Flow**、**UI Expected**、Data Verification、Expected Data、**Related Test**（`TC`）、**Status**。
- **`verification/test-cases.md`**：**ID**（`TC`）、**Source**、Scenario（`FS`）、Preconditions、Test Input、Steps、**Expected Result**、Verification（SQL 限 `SELECT`）、**Status**。
- **`verification/traceability.md`**：**Source**（單一 ID）、Rule、Standard、Design、Functional Scenario、**Test**（單一 `TC` 或 `不適用`）、**Result**、Evidence（選填；依拆列轉換規則填寫時必填）。每列只放一個 Source 與一個 Test；舊寫法一列多 Test 回報 `WARN`（`L-10`）。
- **`verification/comparison.md`**：差異清單含單一 `TC`、`LB`、`分類`；未涵蓋 Legacy 行為的 `LB` 須存在於 `legacy-behavior.md`。
- **`verification/acceptance-<work_item.id>.md`**：`AC ID`（功能 `AC-001` 起、回歸 `AC-101` 起）、`類型`（`功能`/`回歸`）、`來源 ID`、`對應測試與目前結果`、`結果`。
- **`specification.md`**：Read Model，不定義 ID；引用不存在或 `REMOVED` 的 ID 回報 `WARN`（`R-08`）。

## 5. `manifest.yaml` 規格

- YAML 子集：縮排固定 2 空白（不用 Tab），支援巢狀 mapping、單行 `{...}`、區塊與單行清單、純量與區塊多行字串（`|`/`>`/`|-`/`>-`）、`#` 註解；不支援 anchor/alias（`&`/`*`）與多文件（`---`）。
- 檢查項目：`M-01` 欄位完整性（比對 `template/manifest.yaml`，缺 5.5.0 欄位降為 `INFO`）、`M-02` `CHANGE_ME`、`M-03` Work Type／Intent／Origin、`M-04` `RETROFIT_VERIFY`/`BASELINE_ADOPTION` 組合、`M-05` 狀態值、`M-06` 問題數加總、`M-07` 核准狀態矛盾、`M-08` `changes` 重複 ID、`M-09` `base_ref` 建立後不得改寫（建立時為 `null` 導入 git 後補一次允許）。

## 6. 檢查代碼、覆蓋率與結案預檢

### 6.1 執行方式
```bash
node <skill-root>/scripts/module-check.mjs modules/<module-id>          # 產出階段自檢與覆蓋率
node <skill-root>/scripts/module-check.mjs modules/<module-id> --gate   # 結案預檢（G-01～G-12）
node <skill-root>/scripts/module-check.mjs modules/<module-id> --json   # 機器可讀 JSON（format 1）
```

- **格式（`L-01～L-14`）**：欄數、缺欄、ID 語法／重複、狀態值、前綴與章節、範圍寫法、`L-08` 非 `SELECT` 的 Verification SQL、`L-09` 疑似 Secret、`L-10` 單值欄多 ID、`L-11` 非 ID 文字、`L-12` 不允許前綴、`L-13` 混用寫法、`L-14` 必要欄空白。
- **連結（`R-01～R-09`）**：ID 不存在、TC↔FS 不一致、孤兒 REQ/Rule/TC、`changes` 定義矛盾、`changes` 與 `base_ref` 實際差異不一致（`REVIEW_REQUIRED`）、引用未核准規範、狀態矛盾、`specification.md` 失效引用、有效列引用 `REMOVED`。
- **覆蓋率**：計算 Requirement、Rule（BR/VAL/Q/UI）、Scenario、本次變更、Legacy 行為、驗收、執行結果；只計已核准（`APPROVED`/`VERIFIED`）TC；分母為 0 寫「不適用」，百分比無條件捨去。
- **結案預檢（`G-01～G-12`）**：依序檢查格式與連結、Review/Approval、Blockers、Stage 狀態、未定案項目、測試執行結果、Traceability、Legacy 比對、Functional Scenario、規格書、驗收、Standards 適用性。

### 6.2 強制檢核與 Exit Code 處置

| Exit Code | `--gate` 結論 | 強制處置 |
| :---: | --- | --- |
| `2` | 工具無法執行 | **立即 STOP**，不可宣告完成或進 Gate；修正路徑或 manifest YAML 語法後重跑。 |
| `1` | `BLOCKED` | **強制阻擋結案**，逐項輸出阻擋代碼、檔案行號、問題分類（A/B/C）與回退 Skill；AI 不得自行繞過。 |
| `3` | `HUMAN_REQUIRED` | 列出所有 `HUMAN` 項目進入 Human Gate 逐項確認並留紀錄。 |
| `0` | `READY` | 進入最終 Human Completion Gate 確認語意同步並簽核（**工具結論不等於核准**）。 |

## 7. 文件未達標準時的調整策略

當 `module-check.mjs` 回報錯誤或警告時，依問題性質分三類處理：

| 分類 | 典型代碼 | 調整作法 | 紅線（禁止事項） |
| --- | --- | --- | --- |
| **A 類：純格式／寫法問題** | `L-01～L-03`、`L-06`、`L-13`、`L-14`、`M-01`、殘留範本範例列 | 內容與行為未變時直接修正排版、補標題欄或刪範例列；依 `core/invariants.md` 不登記 `work_item.changes`，不撤銷核准。 | 不得藉格式修正偷改需求或預期行為。 |
| **B 類：追溯／紀錄未對齊** | `L-10`、`R-02`、`R-04`、`R-05`、`R-08`、`M-06`、`M-07` | 依可查證證據對齊並填寫 `Evidence` 欄；`R-05` 維持 `REVIEW_REQUIRED` 交 Human 確認。已完成 Module 走 Documentation Retrofit CHANGE。 | 嚴禁將舊列單一 Result 複製給拆開的多個 TC（查無證據填 `NOT_RUN`）；不得自動修正 `changes` 掩蓋 `R-05`。 |
| **C 類：實質缺漏／合規風險** | `L-08`、`L-09`、`R-01`、`R-03`、`R-06`、`R-09`、`G-02/G-05/G-06/G-11` | **強制阻擋**，退回對應 Skill 補測、移除 Secret、修正 SQL 或補齊 Q&A，重走對應 Human Gate。 | 嚴禁刪列洗綠報告（刪除須保留列並標 `REMOVED`）；嚴禁弱化 Expected Result。 |

### 既有 Module 的漸進轉換
- **新建 Module**：套用無範例列範本，各 Stage 自檢，結案前 `--gate` 不得為 `BLOCKED`。
- **升版前 Active Work Item**：缺 5.5.0 欄位維持 `INFO`/`HUMAN`；A 類格式債務可經 Human 以「有條件通過」記入 `blockers` 轉後續 `CHANGE`，但 **`L-08`、`L-09`、`G-02`、`G-05`、`G-06` 一律不得豁免**。
- **已完成歷史 Module**：採「碰到才轉換（Touch-to-Migrate）」，維持既有核准不動，下次 `CHANGE` 修改該檔時順手正規化；或另開 **Documentation Retrofit CHANGE**（`behavior.change_allowed: false`），依序採信 `comparison.md`、自動化測試報告（含 TC ID）、測試管理系統紀錄、Human 簽核紀錄拆列並填入 `Evidence`，查無紀錄填 `NOT_RUN`，經 Traceability Human Gate 確認完成。
