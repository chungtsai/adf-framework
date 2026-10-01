---
name: adf-test-generation
description: 依 NEW、CHANGE、MIGRATION 與 Intent 產生測試案例。
---

# ADF Test Generation

## 目的
NEW 依 Requirement/Rules；CHANGE 加 Change Test 與受影響 Regression；MIGRATION 建 Golden Cases；Expected Result 不得由 Target 現況反推。

## ADF 共通不變條件
- Work Type 僅使用 `NEW`、`CHANGE`、`MIGRATION`。
- 每個 Module 同一時間只允許一個 Active Work Item；Module 是主要隔離邊界。
- 預設採 Compact Artifacts：`requirements.md`、`rules.md`、`standards.md`、`design.md`、`functional-scenarios.md`、`test-cases.md`、`traceability.md`。
- 檔案存在不代表 Stage 已完成。
- 穩定識別碼維持英文：`REQ-*`、`BR-*`、`VAL-*`、`Q-*`、`UI-*`、`FS-*`、`DEV-*`、`MIG-*`。
- 無法證明的行為必須標記 `UNKNOWN` 或 `REVIEW_REQUIRED`。
- 不得為了取得 `PASS` 而弱化 Expected Result。
- Project-wide Standards 放在 `standards/`。

## Functional Scenario

當功能包含使用者可操作流程時，先建立或更新 `verification/functional-scenarios.md`：

1. 以 `FS-*` 描述 Preconditions、User Flow、Expected Result。
2. Source 必須來自 Requirement、Rule、Approved Baseline 或其他可驗證 Evidence。
3. Test Case 以 `Scenario` 欄位連結 `FS-*`。
4. Traceability 必須能由 Source → Functional Scenario → Test → Result。
5. 純 API、Backend、Security 等沒有使用者操作流程的技術測試，不強制建立 FS。

### 既有完成 Module 補做

若功能已完成但過去沒有 Functional Scenario：
- 沿用既有 `CHANGE` 流程建立新的 Work Item，不新增 Work Type。
- 此 CHANGE 只補 Scenario、Test 關聯及 Traceability；不得直接改變既有 Business Behavior。
- 若補文件時發現規格、測試與實作不一致，標記 `REVIEW_REQUIRED`。
- Human 確認需要修改行為後，另開真正的 CHANGE 處理行為差異。

## Evidence-Guided Q&A
遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或必要資料不足時，依 `framework/review/` 進入互動審查：
1. 一次只問一個需要 Human 判斷的問題。
2. 依 Evidence 提供 2～3 個合理候選答案；若有推薦答案，必須附上推薦理由與 Evidence，不得把推測描述成事實。
3. 永遠允許「其他／自行輸入」與「不確定，保留 REVIEW_REQUIRED」。
4. `HIGH` Risk（Security、Permission、金額、交易、刪除資料、關鍵 Business Rule、Migration Semantic Mismatch）不得批次接受。
5. `LOW` Risk 可提供批次快速確認，但仍需 Human 明確操作。
6. 問題清除後進入 `READY_FOR_REVIEW`；需要 Human Gate 的 Stage 必須詢問「目前沒有其他待確認問題，是否確認此階段完成？」。
7. 只有 Human 確認後才能標記 `APPROVED`。
