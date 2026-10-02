---
name: adf-development-complete
description: 只有所有適用 Gate、Test、Traceability 與 Blocker 都完成後才能結案。
---

# ADF Development Complete

## 目的
確認必要 Human Approval、測試、Traceability 與 Verification；MIGRATION 另需 Semantic Comparison 通過。

## ADF 共通不變條件
- Work Type 僅使用 `NEW`、`CHANGE`、`MIGRATION`。
- 每個 Module 同一時間只允許一個 Active Work Item；Module 是主要隔離邊界。
- 預設採 Compact Artifacts：`requirements.md`、`rules.md`、`standards.md`、`design.md`、`functional-scenarios.md`、`test-cases.md`、`traceability.md`。
- 檔案存在不代表 Stage 已完成。
- 穩定識別碼維持英文：`REQ-*`、`BR-*`、`VAL-*`、`Q-*`、`UI-*`、`FS-*`、`DEV-*`、`MIG-*`。
- 無法證明的行為必須標記 `UNKNOWN` 或 `REVIEW_REQUIRED`。
- 不得為了取得 `PASS` 而弱化 Expected Result。
- Project-wide Standards 放在 `standards/`。

## Functional Scenario Gate

- 若 Module 有使用者操作流程，Completion 前應確認主要流程已有 `FS-*`，且可追溯到 Test 與 Result。
- 純技術型 Module 或沒有 User Flow 的變更，可以標示 Functional Scenario 為 not applicable。
- 透過 CHANGE 補做 Scenario 時，只要 Scenario / Test / Traceability 完整且沒有發現需要修改 Business Behavior 的差異，即可完成此 Documentation Retrofit CHANGE。
- 若 Scenario 補建過程發現真正的 Behavior Gap，不得用文件掩蓋；應保留 `REVIEW_REQUIRED` 並另開行為修正 CHANGE。

## Evidence-Guided Q&A
解析單一官方來源 `adf-project-install/references/` 下的 interactive-review、question-schema、approval-gate 與 terminology，依其規則執行。來源缺少或版本不相容時停止需要 Review 的階段，不維護本地副本。

## Human-readable Specification Gate

- 有 Human-visible / Business Behavior 的 Module，Completion 前應確認 `specification.md` 已建立且與本次已核准 Artifact 同步。
- `specification.md` 僅是 Human-readable Read Model；Completion 不得以它取代 Requirement、Rule、Design、Verification 或 Traceability Gate。
- CHANGE 若影響 Requirement、Rule、UI、Design、Functional Scenario 或其他 Human 可理解行為，應同步規格書。
- 純技術重構且 Human-visible / Business Behavior 未改變時，可以不改寫規格內容。
- 若規格書與正式 Artifact 不一致，不得結案為已同步；應標記 `REVIEW_REQUIRED`。


## v5.1 資源與舊專案相容性
- 官方資源唯一位置以 `adf-project-install/references/resources.json` 為準；不複製到專案 `.adf/templates/`，不使用客製範本。
- 從本專案 `.agents/skills/` 或 `.claude/skills/` 解析來源；可使用安裝 Skill 的 `scripts/project.mjs resolve <project> <resource-key>`。兩處版本或內容衝突時停止，不回退到全域。
- 官方資源來源 Skill 未安裝或版本不相容時，提示透過 `npx skills` 在專案層級安裝適用正式版本。Review 不可跳過。
- 先讀取專案 `standards/` 與已核准 Evidence；官方規範範例不是專案核准規範，不自動套用。
- 保留 v5.0 的 Module 文件、完成狀態與核准紀錄；新版缺少欄位或文件列為補做建議，不自動撤銷核准。需要補做另走 CHANGE。
- 在尚未採用新版 Gate 的舊 Module，只列出 Functional Scenario / specification 差異；已明確採用的新工作才檢查新版要求。
