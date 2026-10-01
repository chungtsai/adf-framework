# Functional Scenarios

> 使用者操作情境用來描述「使用者如何操作、系統如何回應、如何判定成功」。
> 它不是新的 Work Type，也不是獨立於 ADF 的平行流程；它屬於 Verification Artifact。

## Scenario Format

| ID | Source | Preconditions | User Flow | Expected Result | Related Test | Status |
|---|---|---|---|---|---|---|
| FS-001 | REQ-001 | 使用者已登入 | 1. 開啟功能 2. 輸入條件 3. 執行查詢 | 顯示符合條件的資料 | TC-001 | DRAFT |

## 規則

- ID 使用 `FS-*`。
- `Source` 必須可追溯到 `REQ-*`、`BR-*`、`VAL-*`、`Q-*`、`UI-*` 或已核准 Baseline。
- `User Flow` 描述使用者可實際執行的操作步驟，不只描述 API 或內部程式流程。
- `Expected Result` 必須來自 Requirement、Rule、Approved Baseline 或其他可驗證 Evidence，不得由 Target 現況反推。
- 一個 Functional Scenario 可以對應一個或多個 Test Case。
- 若 Scenario 只有文件但尚未驗證，Status 不得標記為 VERIFIED。
- 無法確認的操作或結果標記 `REVIEW_REQUIRED`。

## CHANGE 補做

既有 Module 已完成開發，但缺少 Functional Scenario 時：

1. 建立新的 `CHANGE` Work Item。
2. Intent 使用 `DOCUMENTATION`；若專案尚未使用此 Intent，可保留 `FEATURE` 並在 title/trigger 明確標記 `RETROFIT_FUNCTIONAL_SCENARIO`。
3. 先讀取目前已核准的 Requirement、Rules、Design、Tests、Traceability 與必要的 Target Evidence。
4. 僅補建 `functional-scenarios.md`、必要的 Test Case 關聯與 Traceability。
5. 不得因為補文件而自行修改既有 Business Behavior。
6. 若補 Scenario 時發現規格、測試或實作不一致，標記 `REVIEW_REQUIRED`；確認需要修改行為後，再另開真正的 CHANGE。
