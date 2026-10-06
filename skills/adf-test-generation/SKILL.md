---
name: adf-test-generation
description: 依 NEW、CHANGE、MIGRATION 與 Intent 產生測試案例。
---

# ADF Test Generation

## 目的
NEW 依 Requirement/Rules；CHANGE 加 Change Test 與受影響 Regression；MIGRATION 建 Golden Cases；Expected Result 不得由 Target 現況反推。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## Functional Scenario

當功能包含使用者可操作流程時，先建立或更新 `verification/functional-scenarios.md`：

1. 以 `FS-*` 描述 Preconditions、Test Input、User Flow、UI Expected、Data Verification 與 Expected Data。
2. Source 必須來自 Requirement、Rule、Approved Baseline 或其他可驗證 Evidence。
3. Test Case 以 `Scenario` 欄位連結 `FS-*`。
4. Traceability 必須能由 Source → Functional Scenario → Test → Result。
5. 純 API、Backend、Security 等沒有使用者操作流程的技術測試，不強制建立 FS。

### 資料異動 Scenario

對新增、修改、刪除等資料異動：

- 提供測試人員可直接使用的具體 Test Input，不只寫「輸入有效資料」。
- 除 UI Expected 外，優先產生 read-only Verification SQL，以直接確認 DB 持久化結果。
- SQL 不適用時，改用 Read-only API、Audit/Event/Log Evidence；最後才要求使用者重新操作查詢畫面。
- Expected DB Result 必須列出預期筆數及重要欄位值。
- 新增可驗證「資料存在且值正確」；修改驗證「指定欄位已更新且非目標欄位符合保留規則」；刪除驗證「資料不存在」或符合專案定義的 Soft Delete 狀態。
- 若需要 Cleanup，可產生獨立 Cleanup SQL，但不得自動執行。
- Verification SQL 預設只允許 SELECT；不得自動執行 INSERT、UPDATE、DELETE、MERGE、DDL。
- SQL 無法安全限制到測試資料時，標記 `REVIEW_REQUIRED`，不得產生寬範圍異動指令。

### 既有完成 Module 補做

若功能已完成但過去沒有 Functional Scenario：
- 沿用既有 `CHANGE` 流程建立新的 Work Item，不新增 Work Type。
- 此 CHANGE 只補 Scenario、Test Input、Verification Method、Test 關聯及 Traceability；不得直接改變既有 Business Behavior。
- 若補文件時發現規格、測試與實作不一致，標記 `REVIEW_REQUIRED`。
- Human 確認需要修改行為後，另開真正的 CHANGE 處理行為差異。

## 本 Skill 官方資源
- `template/verification/functional-scenarios.md` → `assets/functional-scenarios.md`。
- `template/verification/test-cases.md` → `assets/test-cases.md`。
