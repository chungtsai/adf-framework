# ADF Module 機器可讀格式（草案）

> 狀態：草案，尚未納入任何 Skill 或 `resources.json`。採用後預計成為共用規範 `core/module-format.md`（owner：`adf-project-install`），由檢查工具（lint／ref-check／coverage／gate-report）與各 Skill 共同遵守。

## 0. 目的與範圍

閘門檢查目前靠 AI 閱讀 Markdown，同一個 Module 每次判讀結果可能不同。本草案只規範**程式需要讀的部分**：

- 識別碼的寫法，以及「定義」和「引用」的位置。
- 各 Artifact 表格的欄位、多值儲存格與狀態值。
- `manifest.yaml` 使用的 YAML 子集與欄位結構。

表格以外的說明文字、章節內容不受限制；工具不讀、也不檢查。

設計原則：

1. **向下相容**：現有範本的表格（`test-cases.md`、`functional-scenarios.md`、`legacy-behavior.md`、`comparison.md`、`acceptance.md`）原樣有效，不需要改寫既有 Module。
2. **只補缺口**：範本目前是空的部分（`requirements.md`、`rules.md`、`spec/standards.md`）才新定表格。
3. **工具只報告事實**：檢查結果不改寫 Artifact，也不把任何項目標成 `APPROVED`。
4. **單一解析器**：framework 的檢查工具和 alm-desktop 的 `adf_alm.py` 應依同一份規範解析，避免兩套規則漸行漸遠。

## 1. 通用規則

### 1.1 檔案
- UTF-8（允許 BOM），換行 LF 或 CRLF 都可以。
- 路徑相對於 Module 根目錄，以 `core/invariants.md` 的 Compact Artifacts 表為準。

### 1.2 表格
- 只辨識 GitHub 風格的 pipe table：標題列的下一行必須是分隔列（`|---|`，允許 `:` 對齊符號）。
- 表格結束於第一個不以 `|` 開頭的行。
- 儲存格正規化（與 `adf_alm.py` 現行行為一致）：
  - `\|` 視為儲存格內的 `|`，不切欄。
  - `<br>`、`<br/>` 視為換行。
  - 去掉 `**粗體**` 與 `` `行內程式碼` `` 標記，保留內容。
  - 去掉頭尾空白。
- **空白值**：空字串或 `—` 視為「沒有填」。要表示「不適用」時明確寫 `不適用`，不可留白。

### 1.3 欄位比對
- 用**標題名稱**比對，不看欄位順序；比對時忽略大小寫與空白。
- 每個欄位有一個正式名稱（範本上的寫法）和若干別名（第 5 節）。
- 必要欄位缺少 → `ERROR`；多出的欄位 → 忽略（允許專案自行加欄位）。
- 資料列欄數和標題列不同 → `ERROR`（通常是儲存格裡有未跳脫的 `|`）。

### 1.4 表格的辨識方式
一個 Artifact 可能有好幾張表格，工具依「所在章節標題 + 必要欄位」找出要讀的那一張（第 5 節逐一列出）。表格裡的每一列都當成真的資料，所以範本只保留標題列，不放範例列（已決定，見第 9 節 Q6）。

## 2. 識別碼

### 2.1 語法

```
<前綴>-<段>(-<段>)*
段 = [A-Z0-9]+
```

- 一律大寫英數，以 `-` 分段，不可有空白、底線或句點。
- Module 內編號建議 3 位數（`REQ-001`、`TC-012`）；規範 ID 依規範自己的寫法（`DEV-SEC-RATE-001`）。
- **邊界**：ID 前一個字元不可以是英數字或 `-`，後一個字元不可以是英數字。
  所以 `REV-Q-005` 只會被辨識成問題 ID，不會誤抓出 `Q-005`。這是現行 `adf_alm.py` 的 `ID_RE`（`\b(?:…|Q|…)-`）會出錯的地方：`-` 也是字詞邊界，會從 `REV-Q-005` 裡抓出 `Q-005`。
- ID 刪除後不可再給別的項目重複使用。

### 2.1.1 刪除（已決定，見第 9 節 Q1）
- 刪除項目時**不刪那一列**，把 `Status` 改成 `REMOVED`，並在備註或描述寫上刪除原因與 Work Item ID。
- `REMOVED` 的列仍算「已定義」，所以 ID 不會被重複使用，歷史 traceability 也不會斷鏈。
- 沒有 `Status` 欄的表格（`legacy-behavior.md` 行為清單）加一個選填的 `Status` 欄，只用來填 `REMOVED`，其他時候留白。
- 本次 Work Item 新增後又刪除的項目同樣改成 `REMOVED`，但依 `core/invariants.md` 從 `work_item.changes` 移除。

### 2.2 前綴與定義位置

每個前綴只有一個**定義位置**（owner Artifact）；出現在其他任何地方都只算**引用**。

| 前綴 | 意義 | 定義位置 | 定義形式 |
|---|---|---|---|
| `REQ` | Requirement | `spec/requirements.md` | 需求表格的 `ID` 欄（相容：`## REQ-001 標題`，見 5.1） |
| `LB` | Legacy 行為 | `analysis/legacy-behavior.md` | 「行為清單」表格的 `ID` 欄 |
| `BR` `VAL` `Q` `UI` | Rule | `spec/rules.md` | 各章節表格的 `ID` 欄，前綴必須和章節相符 |
| `FS` | Functional Scenario | `verification/functional-scenarios.md` | `Scenario Format` 表格的 `ID` 欄 |
| `TC` | Test Case | `verification/test-cases.md` | 主表格的 `ID` 欄 |
| `AC` | 驗收項目 | `verification/acceptance-<work_item.id>.md` | 「驗收項目」表格的 `AC ID` 欄；只在該檔內唯一 |
| `DEV` `MIG` | 規範 | 專案 `standards/**/*.md` | frontmatter 的 `id`；規則子項為 `<id>-R<n>`，寫在「規則」清單項目開頭的粗體 |
| `REV-Q` | Review 問題 | 依 `review/question-schema.md` | （本草案不另行規範） |

規則：

- 同一個 ID 在定義位置只能出現一次（`AC` 以檔案為範圍，其他以 Module 為範圍；`DEV`／`MIG` 以專案為範圍）。
- 引用 `DEV-X-001-R2` 時，`DEV-X-001` 必須存在，且該規範檔中要有 `R2` 這條規則。
- `legacy-behavior.md` 的 Finding 表格、`comparison.md`、`traceability.md`、`specification.md` 只能引用，不能定義新 ID。

## 3. 引用與多值儲存格

- 引用欄位（第 5 節標「引用」者）的值是**一組 ID**：工具用 2.1 的規則抓出儲存格裡所有的 ID。
- 建議用 `、` 分隔，也接受 `,`、`，`、`;`、空白與 `<br>`。
- 不可寫範圍（`TC-001~TC-005`）；工具不展開範圍，會回報 `ERROR`。
- 引用欄位裡出現不是 ID 的文字時，只允許以下兩種，其他文字回報 `WARN`：
  - `Approved Baseline`：`BASELINE_ADOPTION` 用。
  - `不適用`。
- 引用的前綴必須在該欄位允許的清單內，例如 `TC.Scenario` 只能引用 `FS`。

## 4. 狀態值

### 4.1 Artifact 列的 `Status`

| 值 | 意義 | 算入覆蓋率的分子 |
|---|---|---|
| `DRAFT` | 草稿，尚未核准 | 否 |
| `APPROVED` | Human 已核准 | 是 |
| `VERIFIED` | 已核准且驗證通過（`FS`、`TC`） | 是 |
| `REVIEW_REQUIRED` | 待 Human 判斷 | 否 |
| `UNKNOWN` | 無法由 Evidence 證明 | 否 |
| `CONFLICT` | 與其他來源衝突 | 否 |
| `REMOVED` | 已刪除，保留列以免 ID 重複使用（2.1.1） | 不算分子，也不算分母 |

- 一律大寫英文；不在表內的值回報 `ERROR`。
- 除了 `REMOVED` 之外，分母一律包含所有狀態（`REVIEW_REQUIRED`、`UNKNOWN`、`CONFLICT` 不可從分母剔除）。
- `LB` 的「確定度」（`CONFIRMED`／`UNKNOWN`）與「風險」（`HIGH`／`NORMAL`）是獨立欄位，不是 Status。

### 4.2 執行結果

| 位置 | 允許值 |
|---|---|
| `traceability.md` 的 `Result` | `PASS`、`FAIL`、`NOT_RUN`、`BLOCKED` |
| `comparison.md` 的 `分類` | `PASS`、`MIGRATION_DEFECT`、`APPROVED_BEHAVIOR_CHANGE`、`SPEC_GAP`、`LEGACY_UNKNOWN`、`TEST_DATA_PROBLEM`、`REVIEW_REQUIRED` |
| `acceptance-*.md` 的 `結果` | `待驗收`、`通過`、`不通過`、`不適用`（`不適用` 時「備註」不可空白） |

### 4.3 manifest 的 `status.*`

各 Skill 的寫法不一致：開發和分析階段寫 `done`（backend-development、legacy-analysis、result-comparison），驗收寫 `passed`。已決定兩種都算完成、不強制改寫（第 9 節 Q3）。

| 意義 | 允許值 | 適用欄位 |
|---|---|---|
| 未開始或進行中 | `pending` | 全部 |
| 完成 | `done`、`passed`（同義） | 全部 |
| 不適用 | `not_applicable` | 全部 |
| 等待 Human 簽核 | `in_review` | 只用於 `status.verification.acceptance` |
| 未通過 | `failed` | 只用於 `status.verification.acceptance` |

- 結案預檢只看「是否完成」，`done` 和 `passed` 不區分。
- `in_review`、`failed` 出現在 `acceptance` 以外的欄位時回報 `WARN`。

`review.status` 的允許值：`IN_PROGRESS`、`QUESTIONS_PENDING`、`READY_FOR_REVIEW`、`APPROVED`、`CHANGES_REQUESTED`。

## 5. 各 Artifact 的表格規格

欄位類型：**ID**（定義）、**引用**（多值 ID，括號內為允許前綴）、**列舉**（第 4 節）、**文字**。粗體欄位為必要欄位。

### 5.1 `spec/requirements.md`（新定）

章節不限；表格須含 `ID` 欄，且資料列的 ID 以 `REQ-` 開頭。

| 欄位 | 別名 | 類型 |
|---|---|---|
| **ID** | 編號 | ID（`REQ`） |
| **名稱** | Title、Name、需求、標題 | 文字 |
| 描述 | Description | 文字 |
| Source | 來源、Evidence | 文字（需求來源，例如會議、文件） |
| **Status** | 狀態 | 列舉 4.1 |

相容寫法（既有 Module，以及 `adf_alm.py` 已支援的格式）：

```markdown
## REQ-001 帳號查詢
可依帳號或名稱查詢使用者。
Status: APPROVED
```

標題層級 `##`～`######`，ID 後可接 `：`、`:`、`-` 或空白；底下的 `Status:` 或 `狀態：` 行為狀態，其餘為描述。同一個 Module 混用兩種寫法時回報 `WARN`。

### 5.2 `spec/rules.md`（新定）

範本現有的四個章節各放一張表格，章節決定前綴：

| 章節 | 前綴 |
|---|---|
| `## Business Rules` | `BR` |
| `## Validation Rules` | `VAL` |
| `## Query Rules` | `Q` |
| `## UI Rules` | `UI` |

| 欄位 | 別名 | 類型 |
|---|---|---|
| **ID** | 編號 | ID |
| **規則** | Rule、名稱 | 文字 |
| 條件 | Condition | 文字 |
| **預期行為** | Expected、Expected Behavior | 文字 |
| Boundary | 邊界 | 文字 |
| Evidence | 證據 | 文字 |
| **Source** | 來源 | 引用（`REQ`、`LB`）或 `Approved Baseline` |
| **Status** | 狀態 | 列舉 4.1 |

前綴和章節不符（例如 `VAL-003` 寫在 Business Rules）回報 `ERROR`。

### 5.3 `spec/standards.md`（新定）

| 欄位 | 別名 | 類型 |
|---|---|---|
| **Standard** | ID、規範 | 引用（`DEV`、`MIG`；可寫到 `-R<n>`） |
| 版本 | Version | 文字（引用時規範的 `version`） |
| **適用** | Applicability | `適用`、`不適用`、`CONFLICT` |
| **理由** | Reason | 文字（`不適用` 與 `CONFLICT` 時必填） |

### 5.4 `analysis/legacy-behavior.md`（沿用範本）

辨識條件：章節「行為清單」，或表格含 `ID`、`確定度`、`風險` 三欄。

| 欄位 | 類型 |
|---|---|
| **ID** | ID（`LB`） |
| **入口** | 文字（必須是「入口」表格中有的入口） |
| **類別** | `輸入與驗證`、`分支`、`查詢`、`交易`、`副作用`、`錯誤處理`、`權限`、`隱含行為` |
| **行為** | 文字 |
| **證據位置** | 文字（確定度為 `CONFIRMED` 時必填） |
| **確定度** | `CONFIRMED`、`UNKNOWN` |
| **風險** | `HIGH`、`NORMAL` |
| 規則 | 引用（`BR`、`VAL`、`Q`、`UI`） |

「盤點」表格的 8 類每格只能填 `已檢查`、`不適用`、`無法取得`。

### 5.5 `verification/functional-scenarios.md`（沿用範本）

辨識條件：章節 `Scenario Format`，或表格含 `ID`、`User Flow` 兩欄。

| 欄位 | 類型 |
|---|---|
| **ID** | ID（`FS`） |
| **Source** | 引用（`REQ`、`BR`、`VAL`、`Q`、`UI`）或 `Approved Baseline` |
| Preconditions、Test Input、**User Flow**、**UI Expected**、Data Verification、Expected Data | 文字 |
| **Related Test** | 引用（`TC`） |
| **Status** | 列舉 4.1 |

### 5.6 `verification/test-cases.md`（沿用範本）

辨識條件：表格含 `ID`、`Expected Result` 兩欄，且資料列 ID 以 `TC-` 開頭。

| 欄位 | 別名 | 類型 |
|---|---|---|
| **ID** | 編號 | ID（`TC`） |
| **Source** | 來源 | 引用（`REQ`、`BR`、`VAL`、`Q`、`UI`、`LB`）或 `Approved Baseline` |
| Scenario | 情境 | 引用（`FS`）；純技術測試可空白 |
| Preconditions、Test Input、Steps | | 文字 |
| **Expected Result** | 預期結果 | 文字 |
| Verification | Verification SQL / Method | 文字；含 SQL 時只能是 `SELECT`（見第 6 節 L-08） |
| **Status** | 狀態 | 列舉 4.1 |

### 5.7 `verification/traceability.md`（沿用範本欄位，補規則）

| 欄位 | 類型 |
|---|---|
| **Source** | 引用，**單一** ID（`REQ`、`LB`）或 `Approved Baseline` |
| Rule | 引用（`BR`、`VAL`、`Q`、`UI`） |
| Standard | 引用（`DEV`、`MIG`） |
| Design | 文字（`design/design.md` 的章節名稱） |
| Functional Scenario | 引用（`FS`） |
| **Test** | 引用，**單一** ID（`TC`）；沒有測試時寫 `不適用` 並在 Result 寫 `NOT_RUN` |
| **Result** | 列舉 4.2 |
| Evidence | 文字，選填：結果的出處（測試報告路徑、測試管理系統的執行 ID、`comparison.md`）。依 9.2 轉換的列必填 |

**每列只有一個 Source 和一個 Test**：一個 Requirement 有三個測試就寫三列。這樣 Result 才不會有「三個測試共用一個結果」的歧義，也才能直接算出執行結果。現有一列多個 Test 的寫法回報 `WARN`，並以該列的 Result 套用到所有 Test。

### 5.8 `verification/comparison.md`（沿用範本）

「差異清單」表格的 `TC` 引用（`TC`，單一）、`LB` 引用（`LB`）、`分類` 列舉 4.2。「未涵蓋的 Legacy 行為」表格的 `LB` 必須存在於 `legacy-behavior.md`。

### 5.9 `verification/acceptance-<work_item.id>.md`（沿用範本）

「驗收項目」表格：`AC ID`（ID）、`類型`（`功能`、`回歸`）、`來源 ID`（引用，任何 Module 前綴）、`對應測試與目前結果`（引用 `TC`）、`結果`（列舉 4.2）。`功能` 編號從 `AC-001`、`回歸` 編號從 `AC-101` 開始。

### 5.10 `specification.md`（Read Model）

不定義任何 ID。工具只檢查文中出現的 ID 是否都存在，不存在時回報 `WARN`（規格書與正式 Artifact 不同步）。

## 6. `manifest.yaml`

### 6.1 YAML 子集
為了不增加相依套件，工具只支援以下寫法；超出範圍回報 `ERROR`，不猜測：

- 縮排固定 2 個空白，不可用 Tab。
- 巢狀 mapping（`key: value`、`key:` 換行縮排）。
- 區塊清單（`- item`），以及單行的 `[]`、`[A, B]`。
- 純量：字串（可加單引號或雙引號）、`true`／`false`、`null`／`~`、整數。
- `#` 註解（行首或值後面，前面要有空白）。
- 不支援：anchor／alias（`&`、`*`）、多行字串（`|`、`>`）、單行的 `{}` mapping、多文件（`---`）。

### 6.2 結構
以 `template/manifest.yaml` 的欄位為準。工具檢查：

| 編號 | 檢查 | 等級 |
|---|---|---|
| M-01 | 範本中的欄位都存在（5.5.0 之前的 Work Item 缺 `base_ref`、`changes`、`status.verification.acceptance` 時降為 `INFO`） | `ERROR` |
| M-02 | 欄位值仍是 `CHANGE_ME` | `ERROR` |
| M-03 | `work_item.type` 是 `NEW`／`CHANGE`／`MIGRATION`；`intents` 在允許值內 | `ERROR` |
| M-04 | `RETROFIT_VERIFY`、`BASELINE_ADOPTION` 的欄位組合符合 `core/invariants.md` 的 Work Model 表 | `ERROR` |
| M-05 | `status.*`、`review.status` 符合 4.3 | `ERROR` |
| M-06 | `review.questions.total = answered + unresolved` | `ERROR` |
| M-07 | `review.approval.approved: true` 時，`review.status` 必須是 `APPROVED` | `ERROR` |
| M-08 | `work_item.changes` 的三個清單沒有重複出現同一個 ID | `ERROR` |
| M-09 | `base_ref` 和這個 Work Item 第一次寫入的值相同（有版控時才檢查） | `ERROR` |

## 7. 檢查結果的輸出

所有檢查工具使用同一種格式，方便 Skill 引用，也方便 CI 與 alm-desktop 讀取：

```json
{
  "tool": "adf-module-check",
  "format": 1,
  "module": "modules/account",
  "work_item": "WI-2026-031",
  "summary": { "error": 2, "warn": 1, "info": 0 },
  "findings": [
    {
      "level": "ERROR",
      "code": "R-01",
      "file": "verification/test-cases.md",
      "line": 14,
      "id": "TC-007",
      "message": "Source 引用的 BR-009 不存在"
    }
  ],
  "coverage": {
    "requirement": { "covered": 9, "total": 12, "ratio": 0.75, "uncovered": ["REQ-004", "REQ-010", "REQ-011"] }
  }
}
```

- 比例欄位在分母為 0 時是 `null`，人看的輸出寫「不適用」，不寫 100%。
- exit code：`0` 沒有 `ERROR`；`1` 有 `ERROR`；`2` 工具本身無法執行（找不到 Module、YAML 超出子集等）。
- 人看的輸出（預設）依檔案、行號排序，用繁體中文。

### 檢查代碼總覽

| 代碼 | 類別 | 內容 |
|---|---|---|
| L-01～L-07 | 格式 | 表格欄數、必要欄位、ID 語法、ID 重複、狀態值、前綴與章節不符、範圍寫法 |
| L-08 | 格式 | Verification SQL 出現 `INSERT`／`UPDATE`／`DELETE`／`MERGE`／DDL（Cleanup SQL 區塊除外） |
| L-09 | 格式 | 疑似 Secret（`password=`、Token 樣式字串） |
| M-01～M-09 | manifest | 見 6.2 |
| R-01 | 連結 | 引用的 ID 不存在 |
| R-02 | 連結 | `TC.Scenario` 和 `FS.Related Test` 不一致 |
| R-03 | 連結 | 孤兒：沒有被任何 TC 引用的 REQ／Rule；沒有 Source 的 TC |
| R-04 | 連結 | `changes.added`／`modified` 的 ID 不存在或為 `REMOVED`；`changes.removed` 的 ID 不存在或不是 `REMOVED` |
| R-05 | 連結 | `changes` 和 `base_ref` 起的實際 ID 差異不一致 → 輸出 `REVIEW_REQUIRED`，不自動修正 |
| R-06 | 連結 | `spec/standards.md` 引用的規範不存在，或狀態不是 `APPROVED` |
| R-07 | 連結 | 狀態矛盾：TC 為 `VERIFIED`，但 Source 不是 `APPROVED`；manifest 為 `done`／`passed`，對應 Artifact 卻仍有 `REVIEW_REQUIRED`／`UNKNOWN`／`CONFLICT` |
| R-08 | 連結 | `specification.md` 提到的 ID 不存在，或提到的是 `REMOVED` 的項目 |
| R-09 | 連結 | 有效的列（不是 `REMOVED`）引用了 `REMOVED` 的 ID，例如 TC 的 Source 是已刪除的 REQ。`REMOVED` 的列本身與 traceability 中 Result 已定案的歷史列不檢查 |

## 8. 覆蓋率定義

| 指標 | 分子 | 分母 |
|---|---|---|
| Requirement | 至少被一個 `APPROVED`／`VERIFIED` 的 TC 引用（直接引用，或經 traceability 由 Rule 連回）的 `REQ` | 全部 `REQ` |
| Rule（`BR`、`VAL`、`Q`、`UI` 分開列） | 至少被一個 `APPROVED`／`VERIFIED` 的 TC 引用的 Rule | 該類全部 Rule |
| Scenario | `Related Test` 至少有一個存在的 TC 的 `FS` | 全部 `FS` |
| 本次變更 | `changes.added + modified` 中，符合上列條件的項目 | `changes.added + modified` 中的 `REQ`／Rule／`FS` |
| Legacy 行為 | 沿用 `adf-result-comparison` 步驟 5 的定義（整體、高風險、通過率） | 同左 |
| 驗收 | `changes.added + modified` 中，被 `功能` 類 AC 引用的項目 | `changes.added + modified` |
| 執行 | 各 Result 的筆數（每個 TC 取最後一次結果） | traceability 中的 TC |

- 每個指標都寫出分子與分母；分母為 0 時寫「不適用」。
- 「涵蓋」只代表至少有一個案例，不代表所有分支都測過；這句話會固定出現在工具的報告裡。
- `DRAFT` 的 TC 不算在分子，但工具另外列出「有 DRAFT 測試但尚無核准測試」的項目，方便判斷是缺測試還是缺核准。

## 9. 待決問題

| 編號 | 問題 | 草案的預設做法 |
|---|---|---|
| Q1 | 刪除的項目要真的刪掉那一列，還是保留並改成 `REMOVED` 狀態？ | **已決定：保留並標成 `REMOVED`**（2.1.1、4.1、R-04、R-09） |
| Q2 | traceability 改成「每列一個 Test」後，既有 Module 是否需要轉換？ | **已決定：B 碰到才轉換**（9.1）；有明確執行紀錄時，可另開 `CHANGE` 依 9.2 主動轉換 |
| Q3 | manifest 的 `done` 和 `passed` 是否統一？ | **已決定：兩個都算完成**，不改寫既有 Skill（4.3） |
| Q4 | 是否在 manifest 加上格式版本（例如 `module.format: 1`），讓工具知道要用嚴格還是相容模式？ | 不加；依 5.5.0 欄位是否存在判斷，降低使用者負擔 |
| Q5 | `TC.Status` 是否也要表達執行結果？ | 不要；`Status` 只代表文件核准狀態，執行結果只寫在 traceability 的 `Result` |
| Q6 | 範本裡的範例列（`TC-001`、`FS-001`、`LB-001`）會被當成真資料 | **已決定：移除**。範本只留標題列，範例移到 SKILL.md 的「範例」章節（第 10 節） |
| Q7 | `AC` 只在單一驗收清單內唯一，跨 Work Item 會重複 | 接受；工具一次只檢查目前 Work Item 的那份清單 |

### 9.1 Q2 的選項

現有範本允許一列寫多個 Test，但只有一個 Result：

| Source | Rule | Functional Scenario | Test | Result |
|---|---|---|---|---|
| REQ-001 | BR-001、BR-002 | FS-001 | TC-001、TC-002、TC-003 | FAIL |

工具看到這一列，只知道「三個測試中至少一個失敗」，不知道是哪一個，所以「執行結果」統計算不準；寫 `PASS` 時則通常代表三個都通過。草案的新寫法是拆成三列，每列一個結果：

| Source | Rule | Functional Scenario | Test | Result |
|---|---|---|---|---|
| REQ-001 | BR-001 | FS-001 | TC-001 | PASS |
| REQ-001 | BR-002 | FS-001 | TC-002 | FAIL |
| REQ-001 | BR-002 | FS-001 | TC-003 | PASS |

既有 Module 的處理方式：

| 選項 | 做法 | 優點 | 缺點 |
|---|---|---|---|
| A. 不轉換 | 工具照樣讀舊寫法，回報 `WARN`。Result 為 `PASS` 時視為每個 TC 都 `PASS`；為其他值時每個 TC 都記為「結果不明」 | 使用者完全不用動 | 舊 Module 的執行結果一直是「結果不明」，結案預檢會卡住或要 Human 例外核准 |
| B. 碰到才轉換（建議） | 同 A；另外規定下一個 `CHANGE` 修改到該 Module 的 traceability 時，由 `adf-traceability-check` 把多 Test 的列拆開，每個 TC 的結果依實際執行紀錄填寫，查不到的填 `NOT_RUN` | 不用一次處理全部 Module；新寫法逐步普及 | 一段時間內新舊寫法並存 |
| C. 升版時一次轉換 | 升級 SOP 要求所有 Module 轉換 | 之後只有一種寫法，工具最單純 | 工作量大；拆列時每個 TC 的結果要重新查證，不能把原本的一個 Result 直接複製到每一列（那等於捏造結果） |
| D. 不拆列，改 Result 寫法 | 保留一列多 Test，Result 改寫成 `TC-001:PASS、TC-002:FAIL、TC-003:PASS` | 列數不變 | 格子變長、難讀；Rule 與 Test 的對應仍然不明確（看不出 TC-002 驗的是 BR-001 還是 BR-002） |

不論選哪一個，工具都**不會自動拆列**，避免替使用者編造每個 TC 的結果。

### 9.2 依執行紀錄轉換 traceability（Documentation Retrofit CHANGE）

專案保存了每個 TC 的明確執行紀錄時，不必等到下次修改行為，可以另開一個只補文件的 `CHANGE`，把舊寫法拆成每列一個 Test。做法比照 `functional-scenarios.md` 的「CHANGE 補做」：

1. 建立 `CHANGE` Work Item，Intent 為 `DOCUMENTATION`（專案尚未使用此 Intent 時，用 `FEATURE` 並在 title 標記 `RETROFIT_TRACEABILITY`）；`behavior.change_allowed: false`。
2. 收集執行紀錄。可採用的紀錄（由上而下優先）：

   | 紀錄 | 每個 TC 的 Result |
   |---|---|
   | `verification/comparison.md` 差異清單（MIGRATION） | `PASS`、`APPROVED_BEHAVIOR_CHANGE` → `PASS`；`MIGRATION_DEFECT` → `FAIL`；其他分類 → `BLOCKED` 並標 `REVIEW_REQUIRED` |
   | 自動化測試報告（例如 JUnit XML、CI 產出），測試名稱或標記含 TC ID | 依報告 |
   | 測試管理系統的執行紀錄（例如 ALM Run），經 `verification/alm-mapping.md` 對回 TC | 依紀錄 |
   | Human 簽核過的人工測試紀錄（有日期、執行人） | 依紀錄 |

3. 一筆紀錄可以採用，必須同時符合：
   - 能明確對應到**單一** TC ID，不靠名稱相似度猜測。
   - 執行時間晚於該 TC 最後一次修改；有版控時由工具比對，沒有版控時由 Human 確認。
   - 紀錄本身可以重新查閱，出處寫進新增的 `Evidence` 欄。
4. 拆列規則：
   - 沒有可採用紀錄的 TC 填 `NOT_RUN`，**不可**沿用舊列的 Result。
   - 舊列的 Result 和紀錄矛盾時（例如舊列寫 `FAIL`，紀錄卻全部 `PASS`），兩者都保留在 Human 決策中，該列標 `REVIEW_REQUIRED`。
   - 每列的 Rule 依該 TC 的 `Source` 填寫；看不出 TC 驗證的是哪條 Rule 時標 `REVIEW_REQUIRED`，不自行分配。
5. 交 Traceability Human Gate 確認後才完成。轉換過程發現行為落差時，不得用文件掩蓋，應另開真正修正行為的 `CHANGE`。

這條規則屬於 ADF 流程，寫在 `adf-traceability-check` 的「既有 Module 轉換」章節，不放在專案 `standards/`（那裡是開發與移轉規範）。專案若想限定可採用的紀錄來源（例如只承認 CI 報告與 ALM），在這次 `CHANGE` 由 Human 指定，寫入 Human 決策。

## 10. 採用時要一起改的地方

- 新增 `core/module-format.md`，在 `resources.json` 登錄，並由 `validate.js` 確認各 Skill 的 `## 共用規範` 區塊有引用（或只在需要的 Skill 引用）。
- 範本：
  - `requirements.md`、`rules.md`、`spec/standards.md` 加上 5.1～5.3 的標題列。
  - `traceability.md` 補上「每列一個 Test」的說明。
  - Q6 決定後，移除範例列。
- Skill 步驟改為「先跑檢查工具，依結果回報」：
  - `adf-traceability-check`
  - `adf-development-complete`
  - `adf-acceptance-checklist`
  - `adf-result-comparison`
  - `adf-test-generation`
  - `adf-requirement-analysis`
  - `adf-business-rule`
- 檢查工具（`project.mjs` 新增模式或另開 `module-check.mjs`）與 `tests/module-check.test.mjs`。
- hp-alm-src 的 `adf_alm.py`：修正 `ID_RE` 會從 `REV-Q-*` 誤抓出 `Q-*` 的問題，之後改讀檢查工具的 JSON 輸出。
- 網站：「容易混淆的用途」、`terms`、`files` 說明，以及版本說明與升級 SOP。
