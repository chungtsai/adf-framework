---
name: adf-development-complete
description: 只有所有適用 Gate、Test、Traceability 與 Blocker 都完成後才能結案。
---

# ADF Development Complete

## 目的
確認必要 Human Approval、測試、Traceability 與 Verification；MIGRATION 另需 Semantic Comparison 通過。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## Functional Scenario Gate

- 若 Module 有使用者操作流程，Completion 前應確認主要流程已有 `FS-*`，且可追溯到 Test 與 Result。
- 純技術型 Module 或沒有 User Flow 的變更，可以標示 Functional Scenario 為 not applicable。
- 透過 CHANGE 補做 Scenario 時，只要 Scenario / Test / Traceability 完整且沒有發現需要修改 Business Behavior 的差異，即可完成此 Documentation Retrofit CHANGE。
- 若 Scenario 補建過程發現真正的 Behavior Gap，不得用文件掩蓋；應保留 `REVIEW_REQUIRED` 並另開行為修正 CHANGE。

## Human-readable Specification Gate

- 有 Human-visible / Business Behavior 的 Module，Completion 前應確認 `specification.md` 已建立且與本次已核准 Artifact 同步。
- `specification.md` 僅是 Human-readable Read Model；Completion 不得以它取代 Requirement、Rule、Design、Verification 或 Traceability Gate。
- CHANGE 若影響 Requirement、Rule、UI、Design、Functional Scenario 或其他 Human 可理解行為，應同步規格書。
- 純技術重構且 Human-visible / Business Behavior 未改變時，可以不改寫規格內容。
- 若規格書與正式 Artifact 不一致，不得結案為已同步；應標記 `REVIEW_REQUIRED`。
