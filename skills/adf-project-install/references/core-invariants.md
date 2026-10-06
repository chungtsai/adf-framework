# ADF 共通不變條件

所有 ADF Skill 執行前都必須遵守本檔。本檔是唯一來源；各 Skill 不得複製或改寫本檔內容，只能引用。

## Work Model
- Work Type 僅使用 `NEW`、`CHANGE`、`MIGRATION`。
- `CHANGE` 可搭配 Intent：`FEATURE`、`BUGFIX`、`SECURITY_FIX`、`REFACTOR`、`PERFORMANCE`。既有系統導入另支援 `RETROFIT_VERIFY` 與 `BASELINE_ADOPTION` 情境。
- `STANDARD_CHANGE` 是 Framework-level Trigger，不是 Work Type。
- 每個 Module 同一時間只允許一個 Active Work Item；Module 是主要隔離邊界。

## Compact Artifacts

Module 預設使用以下 Artifact（路徑相對於 Module 根目錄）：

| Artifact | 路徑 | 主要識別碼 |
|---|---|---|
| Requirement | `spec/requirements.md` | `REQ-*` |
| Rules | `spec/rules.md` | `BR-*`、`VAL-*`、`Q-*`、`UI-*` |
| Standards 適用性 | `spec/standards.md` | `DEV-*`、`MIG-*` |
| Design | `design/design.md` | — |
| Functional Scenario | `verification/functional-scenarios.md` | `FS-*` |
| Test Case | `verification/test-cases.md` | `TC-*` |
| Traceability | `verification/traceability.md` | — |
| 規格書（Read Model） | `specification.md` | 引用上列 ID |

- `specification.md` 是給 Human 閱讀的彙整，不是 Source of Truth；與正式 Artifact 衝突時以正式 Artifact 為準並標記 `REVIEW_REQUIRED`。
- 沒有使用者操作流程的 Module，`functional-scenarios.md` 可標示 not applicable。

## 證據與完成
- 檔案存在不代表 Stage 已完成；完成以 Review 狀態與 Evidence 為準。
- 無法由 Evidence 證明的行為必須標記 `UNKNOWN` 或 `REVIEW_REQUIRED`，不得把推測寫成事實。
- 不得為了取得 `PASS` 而弱化 Expected Result，也不得由 Target 現況反推 Expected Result。
- AI 不能自行核准；需要 Human Gate 的 Stage 只有 Human 明確確認後才能標記 `APPROVED`。

## 識別碼與語言
- 穩定識別碼維持英文：`REQ-*`、`BR-*`、`VAL-*`、`Q-*`、`UI-*`、`FS-*`、`TC-*`、`DEV-*`、`MIG-*`。
- 人看的內容使用繁體中文；Skill ID、檔名、YAML/JSON Key、Work Type、Intent、Status 與程式代碼維持英文。術語對照見 `review/terminology.md`。

## Standards
- Project-wide Standards 放在專案 `standards/`。
- 官方規範範例（authoring Skill 的 assets）不是專案核准規範，不自動套用。
