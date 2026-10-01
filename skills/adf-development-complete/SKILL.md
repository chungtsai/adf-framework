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
遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或必要資料不足時，依 `framework/review/` 進入互動審查：
1. 一次只問一個需要 Human 判斷的問題。
2. 依 Evidence 提供 2～3 個合理候選答案；若有推薦答案，必須附上推薦理由與 Evidence，不得把推測描述成事實。
3. 永遠允許「其他／自行輸入」與「不確定，保留 REVIEW_REQUIRED」。
4. `HIGH` Risk（Security、Permission、金額、交易、刪除資料、關鍵 Business Rule、Migration Semantic Mismatch）不得批次接受。
5. `LOW` Risk 可提供批次快速確認，但仍需 Human 明確操作。
6. 問題清除後進入 `READY_FOR_REVIEW`；需要 Human Gate 的 Stage 必須詢問「目前沒有其他待確認問題，是否確認此階段完成？」。
7. 只有 Human 確認後才能標記 `APPROVED`。

## Human-readable Specification Gate

- 有 Human-visible / Business Behavior 的 Module，Completion 前應確認 `specification.md` 已建立且與本次已核准 Artifact 同步。
- `specification.md` 僅是 Human-readable Read Model；Completion 不得以它取代 Requirement、Rule、Design、Verification 或 Traceability Gate。
- CHANGE 若影響 Requirement、Rule、UI、Design、Functional Scenario 或其他 Human 可理解行為，應同步規格書。
- 純技術重構且 Human-visible / Business Behavior 未改變時，可以不改寫規格內容。
- 若規格書與正式 Artifact 不一致，不得結案為已同步；應標記 `REVIEW_REQUIRED`。
